/**
 * Base Agent Class
 *
 * Abstract base class for all AI Agents in the SOS-Expat platform.
 * Provides common functionality for task processing, error handling,
 * metrics collection, and inter-agent communication.
 */

import * as logger from 'firebase-functions/logger';
import { db, FieldValue } from '../utils/firebase';
import { Timestamp } from 'firebase-admin/firestore';
import {
  AgentId,
  AgentConfig,
  AgentTask,
  AgentState,
  AgentStatus,
  AgentError,
  AgentMessage,
  AgentDecision,
  TaskStatus,
  AgentPriority,
  TaskMetadata,
  AGENT_HIERARCHY,
  getAgentConfig,
  getParentAgent
} from './types';

// ============================================================================
// ABSTRACT BASE AGENT
// ============================================================================

export abstract class BaseAgent {
  protected readonly config: AgentConfig;
  protected state: AgentState;
  protected isInitialized: boolean = false;

  constructor(agentId: AgentId) {
    this.config = getAgentConfig(agentId);
    this.state = {
      agentId: this.config.id,
      status: AgentStatus.IDLE,
      currentTasks: [],
      completedTasksCount: 0,
      failedTasksCount: 0,
      lastActivityAt: Timestamp.now(),
      metrics: {
        avgProcessingTimeMs: 0,
        successRate: 100,
        tasksLast24h: 0,
        tasksLastHour: 0,
        errorRate: 0
      }
    };
  }

  // =========================================================================
  // ABSTRACT METHODS (must be implemented by each agent)
  // =========================================================================

  /**
   * Process a task specific to this agent
   */
  protected abstract processTask(task: AgentTask): Promise<Record<string, unknown>>;

  /**
   * Determine if this agent can handle a specific task type
   */
  protected abstract canHandle(taskType: string): boolean;

  /**
   * Get the list of task types this agent can process
   */
  abstract getSupportedTaskTypes(): string[];

  // =========================================================================
  // PUBLIC METHODS
  // =========================================================================

  /**
   * Initialize the agent
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    logger.info(`Initializing agent: ${this.config.name}`, {
      agentId: this.config.id,
      level: this.config.level
    });

    // Load state from Firestore
    await this.loadState();

    // Update status
    this.state.status = AgentStatus.IDLE;
    await this.saveState();

    this.isInitialized = true;
    logger.info(`Agent initialized: ${this.config.name}`);
  }

  /**
   * Submit a task to this agent
   */
  async submitTask(
    taskType: string,
    input: Record<string, unknown>,
    priority: AgentPriority = AgentPriority.MEDIUM,
    metadata?: Partial<TaskMetadata>
  ): Promise<AgentTask> {
    // Ensure initialized
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Check if agent can handle this task
    if (!this.canHandle(taskType)) {
      throw new Error(`Agent ${this.config.id} cannot handle task type: ${taskType}`);
    }

    // Check capacity
    if (this.state.currentTasks.length >= this.config.maxConcurrentTasks) {
      throw new Error(`Agent ${this.config.id} at maximum capacity`);
    }

    // Create task
    const task: AgentTask = {
      id: this.generateTaskId(),
      agentId: this.config.id,
      type: taskType,
      priority,
      status: TaskStatus.PENDING,
      input,
      childTaskIds: [],
      createdAt: Timestamp.now(),
      metadata: {
        source: metadata?.source || 'direct',
        userId: metadata?.userId,
        sessionId: metadata?.sessionId,
        correlationId: metadata?.correlationId || this.generateCorrelationId(),
        retryCount: 0,
        tags: metadata?.tags || []
      }
    };

    // Save task to Firestore
    await this.saveTask(task);

    // Add to current tasks
    this.state.currentTasks.push(task.id);
    await this.saveState();

    logger.info(`Task submitted to agent ${this.config.id}`, {
      taskId: task.id,
      taskType,
      priority
    });

    return task;
  }

  /**
   * Execute a task
   */
  async executeTask(taskId: string): Promise<AgentTask> {
    // Load task
    const task = await this.loadTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Update status
    task.status = TaskStatus.IN_PROGRESS;
    task.startedAt = Timestamp.now();
    this.state.status = AgentStatus.PROCESSING;
    await Promise.all([this.saveTask(task), this.saveState()]);

    const startTime = Date.now();

    try {
      // Process the task
      const output = await this.executeWithTimeout(
        () => this.processTask(task),
        this.config.timeoutMs
      );

      // Update task with result
      task.status = TaskStatus.COMPLETED;
      task.completedAt = Timestamp.now();
      task.output = output;

      // Update metrics
      this.updateMetrics(startTime, true);

      logger.info(`Task completed: ${taskId}`, {
        agentId: this.config.id,
        duration: Date.now() - startTime
      });

    } catch (error) {
      // Handle error
      const agentError = this.createAgentError(error);
      task.status = TaskStatus.FAILED;
      task.completedAt = Timestamp.now();
      task.error = agentError;

      // Update metrics
      this.updateMetrics(startTime, false);

      // Check if should retry
      if (agentError.recoverable && task.metadata.retryCount < this.config.retryPolicy.maxRetries) {
        await this.scheduleRetry(task);
      } else {
        // Escalate to parent if critical
        if (task.priority === AgentPriority.CRITICAL && this.config.parent) {
          await this.escalateToParent(task, agentError);
        }
      }

      logger.error(`Task failed: ${taskId}`, {
        agentId: this.config.id,
        error: agentError.message
      });
    }

    // Remove from current tasks
    this.state.currentTasks = this.state.currentTasks.filter(id => id !== taskId);
    this.state.status = this.state.currentTasks.length > 0 ? AgentStatus.PROCESSING : AgentStatus.IDLE;
    this.state.lastActivityAt = Timestamp.now();

    await Promise.all([this.saveTask(task), this.saveState()]);

    return task;
  }

  /**
   * Delegate a task to a child agent
   */
  async delegateToChild(
    task: AgentTask,
    childAgentId: AgentId,
    transformInput?: (input: Record<string, unknown>) => Record<string, unknown>
  ): Promise<AgentTask> {
    // Verify child relationship
    if (!this.config.children.includes(childAgentId)) {
      throw new Error(`${childAgentId} is not a child of ${this.config.id}`);
    }

    // Create delegated task
    const delegatedTask: AgentTask = {
      ...task,
      id: this.generateTaskId(),
      agentId: childAgentId,
      status: TaskStatus.PENDING,
      input: transformInput ? transformInput(task.input) : task.input,
      parentTaskId: task.id,
      delegatedFrom: this.config.id,
      createdAt: Timestamp.now(),
      startedAt: undefined,
      completedAt: undefined,
      output: undefined,
      error: undefined
    };

    // Update original task
    task.status = TaskStatus.DELEGATED;
    task.delegatedTo = childAgentId;
    task.childTaskIds.push(delegatedTask.id);

    // Save both tasks
    await Promise.all([
      this.saveTask(task),
      this.saveTask(delegatedTask)
    ]);

    // Send message to child agent
    await this.sendMessage(childAgentId, 'TASK', {
      taskId: delegatedTask.id,
      taskType: delegatedTask.type
    });

    logger.info(`Task delegated to child agent`, {
      from: this.config.id,
      to: childAgentId,
      taskId: task.id,
      delegatedTaskId: delegatedTask.id
    });

    return delegatedTask;
  }

  /**
   * Escalate a task to parent agent
   */
  protected async escalateToParent(task: AgentTask, error: AgentError): Promise<void> {
    const parentConfig = getParentAgent(this.config.id);
    if (!parentConfig) {
      logger.warn(`No parent agent to escalate to`, { agentId: this.config.id });
      return;
    }

    await this.sendMessage(parentConfig.id, 'ERROR', {
      taskId: task.id,
      taskType: task.type,
      error,
      escalatedFrom: this.config.id
    }, AgentPriority.HIGH);

    logger.info(`Task escalated to parent agent`, {
      from: this.config.id,
      to: parentConfig.id,
      taskId: task.id
    });
  }

  /**
   * Send a message to another agent
   */
  async sendMessage(
    toAgentId: AgentId,
    type: AgentMessage['type'],
    payload: Record<string, unknown>,
    priority: AgentPriority = AgentPriority.MEDIUM
  ): Promise<AgentMessage> {
    const message: AgentMessage = {
      id: this.generateMessageId(),
      fromAgent: this.config.id,
      toAgent: toAgentId,
      type,
      payload,
      priority,
      createdAt: Timestamp.now(),
      acknowledged: false
    };

    // Save message to Firestore
    await db.collection('agent_messages').doc(message.id).set(message);

    logger.debug(`Message sent`, {
      from: this.config.id,
      to: toAgentId,
      type,
      messageId: message.id
    });

    return message;
  }

  /**
   * Get agent status
   */
  getStatus(): AgentState {
    return { ...this.state };
  }

  /**
   * Get agent configuration
   */
  getConfig(): AgentConfig {
    return { ...this.config };
  }

  // =========================================================================
  // PROTECTED METHODS
  // =========================================================================

  /**
   * Make a decision about how to handle a task
   */
  protected async makeDecision(task: AgentTask): Promise<AgentDecision> {
    const decision: AgentDecision = {
      taskId: task.id,
      agentId: this.config.id,
      decision: 'PROCESS',
      reason: '',
      confidence: 1.0,
      timestamp: Timestamp.now()
    };

    // Check if we can handle this task type
    if (!this.canHandle(task.type)) {
      // Try to delegate to a child
      for (const childId of this.config.children) {
        const childConfig = AGENT_HIERARCHY[childId];
        if (childConfig.capabilities.some(cap => task.type.toLowerCase().includes(cap.toLowerCase()))) {
          decision.decision = 'DELEGATE';
          decision.delegateTo = childId;
          decision.reason = `Task type ${task.type} matches child agent ${childId} capabilities`;
          decision.confidence = 0.9;
          break;
        }
      }

      if (decision.decision === 'PROCESS') {
        decision.decision = 'REJECT';
        decision.reason = `Cannot handle task type: ${task.type}`;
        decision.confidence = 1.0;
      }
    }

    // Log decision
    await db.collection('agent_decisions').add(decision);

    return decision;
  }

  /**
   * Schedule a task retry
   */
  protected async scheduleRetry(task: AgentTask): Promise<void> {
    const retryCount = task.metadata.retryCount + 1;
    const delay = Math.min(
      this.config.retryPolicy.initialDelayMs * Math.pow(this.config.retryPolicy.backoffMultiplier, retryCount),
      this.config.retryPolicy.maxDelayMs
    );

    // Create retry task
    const retryTask: AgentTask = {
      ...task,
      id: this.generateTaskId(),
      status: TaskStatus.PENDING,
      error: undefined,
      startedAt: undefined,
      completedAt: undefined,
      createdAt: Timestamp.now(),
      metadata: {
        ...task.metadata,
        retryCount
      }
    };

    // Schedule for later execution
    await db.collection('agent_scheduled_tasks').add({
      task: retryTask,
      executeAt: Timestamp.fromMillis(Date.now() + delay),
      agentId: this.config.id
    });

    logger.info(`Task scheduled for retry`, {
      taskId: task.id,
      retryTaskId: retryTask.id,
      retryCount,
      delayMs: delay
    });
  }

  /**
   * Update agent metrics
   */
  protected updateMetrics(startTime: number, success: boolean): void {
    const duration = Date.now() - startTime;

    if (success) {
      this.state.completedTasksCount++;
    } else {
      this.state.failedTasksCount++;
    }

    // Update averages
    const totalTasks = this.state.completedTasksCount + this.state.failedTasksCount;
    this.state.metrics.avgProcessingTimeMs =
      (this.state.metrics.avgProcessingTimeMs * (totalTasks - 1) + duration) / totalTasks;
    this.state.metrics.successRate = (this.state.completedTasksCount / totalTasks) * 100;
    this.state.metrics.errorRate = (this.state.failedTasksCount / totalTasks) * 100;
    this.state.metrics.tasksLastHour++;
    this.state.metrics.tasksLast24h++;
  }

  // =========================================================================
  // PRIVATE METHODS
  // =========================================================================

  private async loadState(): Promise<void> {
    const doc = await db.collection('agent_states').doc(this.config.id).get();
    if (doc.exists) {
      this.state = doc.data() as AgentState;
    }
  }

  private async saveState(): Promise<void> {
    await db.collection('agent_states').doc(this.config.id).set({
      ...this.state,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  }

  private async loadTask(taskId: string): Promise<AgentTask | null> {
    const doc = await db.collection('agent_tasks').doc(taskId).get();
    return doc.exists ? (doc.data() as AgentTask) : null;
  }

  private async saveTask(task: AgentTask): Promise<void> {
    await db.collection('agent_tasks').doc(task.id).set({
      ...task,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  }

  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Task timeout after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  private createAgentError(error: unknown): AgentError {
    const err = error as Error;
    return {
      code: err.name || 'UNKNOWN_ERROR',
      message: err.message || 'An unknown error occurred',
      stack: err.stack,
      recoverable: !['FATAL', 'CRITICAL', 'UNRECOVERABLE'].some(
        keyword => err.message?.toUpperCase().includes(keyword)
      ),
      timestamp: Timestamp.now()
    };
  }

  private generateTaskId(): string {
    return `task_${this.config.id.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
  }
}

// ============================================================================
// AGENT REGISTRY
// ============================================================================

export class AgentRegistry {
  private static instance: AgentRegistry;
  private agents: Map<AgentId, BaseAgent> = new Map();

  private constructor() {}

  static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  register(agent: BaseAgent): void {
    const config = agent.getConfig();
    this.agents.set(config.id, agent);
    logger.info(`Agent registered: ${config.name}`);
  }

  get(agentId: AgentId): BaseAgent | undefined {
    return this.agents.get(agentId);
  }

  getAll(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  async initializeAll(): Promise<void> {
    for (const agent of this.agents.values()) {
      await agent.initialize();
    }
  }
}
