/**
 * AI Agent System Types
 *
 * Hierarchical AI Agent Architecture for SOS-Expat Platform
 * 20 Agents organized in 3 levels:
 * - Level 0: Supervisor (1 agent)
 * - Level 1: Domain Agents (6 agents)
 * - Level 2: Specialized Agents (13 agents)
 */

import { Timestamp } from 'firebase-admin/firestore';

// ============================================================================
// ENUMS
// ============================================================================

export enum AgentLevel {
  SUPERVISOR = 0,
  DOMAIN = 1,
  SPECIALIZED = 2
}

export enum AgentStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  WAITING = 'WAITING',
  ERROR = 'ERROR',
  DISABLED = 'DISABLED'
}

export enum AgentPriority {
  CRITICAL = 1,
  HIGH = 2,
  MEDIUM = 3,
  LOW = 4
}

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  DELEGATED = 'DELEGATED'
}

export type AgentId =
  // Level 0 - Supervisor
  | 'SUPERVISOR'
  // Level 1 - Domain Agents
  | 'FINANCE'
  | 'USER'
  | 'CALL'
  | 'NOTIFICATION'
  | 'COMPLIANCE'
  | 'MONITORING'
  // Level 2 - Specialized Agents
  | 'TAX'
  | 'THRESHOLD'
  | 'INVOICE'
  | 'PAYMENT'
  | 'DISPUTE'
  | 'REFUND'
  | 'KYC'
  | 'ONBOARDING'
  | 'SCHEDULING'
  | 'RECORDING'
  | 'EMAIL'
  | 'SMS'
  | 'PUSH'
  | 'COUNTRY_CONFIG';

// ============================================================================
// INTERFACES
// ============================================================================

export interface AgentConfig {
  id: AgentId;
  name: string;
  description: string;
  level: AgentLevel;
  parent: AgentId | null;
  children: AgentId[];
  capabilities: string[];
  triggers: AgentTrigger[];
  priority: AgentPriority;
  maxConcurrentTasks: number;
  timeoutMs: number;
  retryPolicy: RetryPolicy;
  enabled: boolean;
}

export interface AgentTrigger {
  type: 'SCHEDULED' | 'EVENT' | 'WEBHOOK' | 'MANUAL' | 'THRESHOLD';
  config: Record<string, unknown>;
  description: string;
}

export interface RetryPolicy {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface AgentTask {
  id: string;
  agentId: AgentId;
  type: string;
  priority: AgentPriority;
  status: TaskStatus;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: AgentError;
  parentTaskId?: string;
  childTaskIds: string[];
  delegatedTo?: AgentId;
  delegatedFrom?: AgentId;
  createdAt: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  metadata: TaskMetadata;
}

export interface TaskMetadata {
  source: string;
  userId?: string;
  sessionId?: string;
  correlationId: string;
  retryCount: number;
  tags: string[];
}

export interface AgentError {
  code: string;
  message: string;
  stack?: string;
  recoverable: boolean;
  timestamp: Timestamp;
}

export interface AgentState {
  agentId: AgentId;
  status: AgentStatus;
  currentTasks: string[];
  completedTasksCount: number;
  failedTasksCount: number;
  lastActivityAt: Timestamp;
  metrics: AgentMetrics;
}

export interface AgentMetrics {
  avgProcessingTimeMs: number;
  successRate: number;
  tasksLast24h: number;
  tasksLastHour: number;
  errorRate: number;
}

export interface AgentMessage {
  id: string;
  fromAgent: AgentId;
  toAgent: AgentId;
  type: 'TASK' | 'RESULT' | 'ERROR' | 'STATUS' | 'COMMAND';
  payload: Record<string, unknown>;
  priority: AgentPriority;
  createdAt: Timestamp;
  expiresAt?: Timestamp;
  acknowledged: boolean;
  acknowledgedAt?: Timestamp;
}

export interface AgentDecision {
  taskId: string;
  agentId: AgentId;
  decision: 'PROCESS' | 'DELEGATE' | 'ESCALATE' | 'REJECT';
  reason: string;
  delegateTo?: AgentId;
  escalateTo?: AgentId;
  confidence: number; // 0-1
  timestamp: Timestamp;
}

// ============================================================================
// AGENT HIERARCHY DEFINITION
// ============================================================================

export const AGENT_HIERARCHY: Record<AgentId, AgentConfig> = {
  // =========================================================================
  // LEVEL 0 - SUPERVISOR
  // =========================================================================
  SUPERVISOR: {
    id: 'SUPERVISOR',
    name: 'Supervisor Agent',
    description: 'Orchestrateur principal - Coordonne tous les agents du système',
    level: AgentLevel.SUPERVISOR,
    parent: null,
    children: ['FINANCE', 'USER', 'CALL', 'NOTIFICATION', 'COMPLIANCE', 'MONITORING'],
    capabilities: [
      'task_routing',
      'load_balancing',
      'priority_management',
      'escalation_handling',
      'system_health_monitoring',
      'agent_coordination',
      'emergency_response'
    ],
    triggers: [
      { type: 'EVENT', config: { events: ['*'] }, description: 'Tous les événements système' },
      { type: 'SCHEDULED', config: { cron: '*/5 * * * *' }, description: 'Health check toutes les 5 min' }
    ],
    priority: AgentPriority.CRITICAL,
    maxConcurrentTasks: 100,
    timeoutMs: 30000,
    retryPolicy: { maxRetries: 3, initialDelayMs: 1000, maxDelayMs: 10000, backoffMultiplier: 2 },
    enabled: true
  },

  // =========================================================================
  // LEVEL 1 - DOMAIN AGENTS
  // =========================================================================
  FINANCE: {
    id: 'FINANCE',
    name: 'Finance Agent',
    description: 'Gestion finances, comptabilité, paiements et facturation',
    level: AgentLevel.DOMAIN,
    parent: 'SUPERVISOR',
    children: ['TAX', 'THRESHOLD', 'INVOICE', 'PAYMENT', 'DISPUTE', 'REFUND'],
    capabilities: [
      'payment_processing',
      'invoice_generation',
      'tax_calculation',
      'threshold_monitoring',
      'dispute_handling',
      'refund_processing',
      'financial_reporting',
      'reconciliation'
    ],
    triggers: [
      { type: 'EVENT', config: { events: ['payment.*', 'invoice.*', 'refund.*'] }, description: 'Événements financiers' },
      { type: 'SCHEDULED', config: { cron: '0 * * * *' }, description: 'Réconciliation horaire' }
    ],
    priority: AgentPriority.CRITICAL,
    maxConcurrentTasks: 50,
    timeoutMs: 60000,
    retryPolicy: { maxRetries: 5, initialDelayMs: 2000, maxDelayMs: 30000, backoffMultiplier: 2 },
    enabled: true
  },

  USER: {
    id: 'USER',
    name: 'User Agent',
    description: 'Gestion utilisateurs, providers, clients et profils',
    level: AgentLevel.DOMAIN,
    parent: 'SUPERVISOR',
    children: ['KYC', 'ONBOARDING'],
    capabilities: [
      'user_management',
      'provider_management',
      'profile_updates',
      'account_verification',
      'kyc_processing',
      'onboarding_flow',
      'user_analytics'
    ],
    triggers: [
      { type: 'EVENT', config: { events: ['user.*', 'provider.*', 'profile.*'] }, description: 'Événements utilisateurs' }
    ],
    priority: AgentPriority.HIGH,
    maxConcurrentTasks: 30,
    timeoutMs: 45000,
    retryPolicy: { maxRetries: 3, initialDelayMs: 1000, maxDelayMs: 15000, backoffMultiplier: 2 },
    enabled: true
  },

  CALL: {
    id: 'CALL',
    name: 'Call Agent',
    description: 'Gestion appels téléphoniques, sessions et enregistrements',
    level: AgentLevel.DOMAIN,
    parent: 'SUPERVISOR',
    children: ['SCHEDULING', 'RECORDING'],
    capabilities: [
      'call_scheduling',
      'call_management',
      'session_tracking',
      'recording_management',
      'quality_monitoring',
      'call_analytics'
    ],
    triggers: [
      { type: 'EVENT', config: { events: ['call.*', 'session.*', 'twilio.*'] }, description: 'Événements appels' },
      { type: 'WEBHOOK', config: { path: '/webhooks/twilio' }, description: 'Webhooks Twilio' }
    ],
    priority: AgentPriority.CRITICAL,
    maxConcurrentTasks: 40,
    timeoutMs: 120000,
    retryPolicy: { maxRetries: 3, initialDelayMs: 500, maxDelayMs: 5000, backoffMultiplier: 1.5 },
    enabled: true
  },

  NOTIFICATION: {
    id: 'NOTIFICATION',
    name: 'Notification Agent',
    description: 'Gestion notifications, emails, SMS et push',
    level: AgentLevel.DOMAIN,
    parent: 'SUPERVISOR',
    children: ['EMAIL', 'SMS', 'PUSH'],
    capabilities: [
      'notification_routing',
      'template_management',
      'delivery_tracking',
      'channel_optimization',
      'rate_limiting',
      'preference_management'
    ],
    triggers: [
      { type: 'EVENT', config: { events: ['notification.*', 'message.*'] }, description: 'Événements notifications' }
    ],
    priority: AgentPriority.HIGH,
    maxConcurrentTasks: 100,
    timeoutMs: 30000,
    retryPolicy: { maxRetries: 5, initialDelayMs: 1000, maxDelayMs: 60000, backoffMultiplier: 2 },
    enabled: true
  },

  COMPLIANCE: {
    id: 'COMPLIANCE',
    name: 'Compliance Agent',
    description: 'Conformité RGPD, légale et réglementaire',
    level: AgentLevel.DOMAIN,
    parent: 'SUPERVISOR',
    children: ['COUNTRY_CONFIG'],
    capabilities: [
      'gdpr_compliance',
      'data_retention',
      'consent_management',
      'audit_logging',
      'regulatory_reporting',
      'country_regulations',
      'privacy_management'
    ],
    triggers: [
      { type: 'EVENT', config: { events: ['compliance.*', 'gdpr.*', 'audit.*'] }, description: 'Événements conformité' },
      { type: 'SCHEDULED', config: { cron: '0 3 * * *' }, description: 'Nettoyage RGPD quotidien' }
    ],
    priority: AgentPriority.HIGH,
    maxConcurrentTasks: 20,
    timeoutMs: 300000,
    retryPolicy: { maxRetries: 3, initialDelayMs: 5000, maxDelayMs: 60000, backoffMultiplier: 2 },
    enabled: true
  },

  MONITORING: {
    id: 'MONITORING',
    name: 'Monitoring Agent',
    description: 'Surveillance système, alertes et métriques',
    level: AgentLevel.DOMAIN,
    parent: 'SUPERVISOR',
    children: [],
    capabilities: [
      'system_monitoring',
      'alert_management',
      'performance_tracking',
      'anomaly_detection',
      'health_checks',
      'metric_collection',
      'incident_response'
    ],
    triggers: [
      { type: 'SCHEDULED', config: { cron: '* * * * *' }, description: 'Monitoring continu' },
      { type: 'THRESHOLD', config: { metrics: ['error_rate', 'latency', 'cpu', 'memory'] }, description: 'Alertes seuils' }
    ],
    priority: AgentPriority.CRITICAL,
    maxConcurrentTasks: 50,
    timeoutMs: 10000,
    retryPolicy: { maxRetries: 1, initialDelayMs: 100, maxDelayMs: 1000, backoffMultiplier: 1 },
    enabled: true
  },

  // =========================================================================
  // LEVEL 2 - SPECIALIZED AGENTS (FINANCE)
  // =========================================================================
  TAX: {
    id: 'TAX',
    name: 'Tax Agent',
    description: 'Calcul taxes, TVA, OSS et déclarations fiscales',
    level: AgentLevel.SPECIALIZED,
    parent: 'FINANCE',
    children: [],
    capabilities: [
      'vat_calculation',
      'oss_management',
      'tax_filing_generation',
      'vies_validation',
      'hmrc_validation',
      'tax_reporting',
      'country_tax_rules'
    ],
    triggers: [
      { type: 'EVENT', config: { events: ['payment.completed', 'invoice.created'] }, description: 'Calcul taxe sur paiement' },
      { type: 'SCHEDULED', config: { cron: '0 0 1 * *' }, description: 'Déclarations mensuelles' }
    ],
    priority: AgentPriority.HIGH,
    maxConcurrentTasks: 20,
    timeoutMs: 30000,
    retryPolicy: { maxRetries: 3, initialDelayMs: 1000, maxDelayMs: 10000, backoffMultiplier: 2 },
    enabled: true
  },

  THRESHOLD: {
    id: 'THRESHOLD',
    name: 'Threshold Agent',
    description: 'Suivi seuils TVA internationaux et alertes',
    level: AgentLevel.SPECIALIZED,
    parent: 'FINANCE',
    children: [],
    capabilities: [
      'threshold_tracking',
      'alert_generation',
      'registration_reminders',
      'country_monitoring',
      'trend_analysis'
    ],
    triggers: [
      { type: 'EVENT', config: { events: ['payment.completed'] }, description: 'Mise à jour seuils' },
      { type: 'THRESHOLD', config: { levels: [70, 90, 100] }, description: 'Alertes niveaux' }
    ],
    priority: AgentPriority.HIGH,
    maxConcurrentTasks: 10,
    timeoutMs: 15000,
    retryPolicy: { maxRetries: 3, initialDelayMs: 1000, maxDelayMs: 10000, backoffMultiplier: 2 },
    enabled: true
  },

  INVOICE: {
    id: 'INVOICE',
    name: 'Invoice Agent',
    description: 'Génération et gestion des factures',
    level: AgentLevel.SPECIALIZED,
    parent: 'FINANCE',
    children: [],
    capabilities: [
      'invoice_generation',
      'pdf_creation',
      'numbering_sequence',
      'legal_compliance',
      'multi_currency',
      'credit_notes'
    ],
    triggers: [
      { type: 'EVENT', config: { events: ['payment.completed', 'refund.completed'] }, description: 'Génération facture' }
    ],
    priority: AgentPriority.HIGH,
    maxConcurrentTasks: 30,
    timeoutMs: 45000,
    retryPolicy: { maxRetries: 3, initialDelayMs: 2000, maxDelayMs: 20000, backoffMultiplier: 2 },
    enabled: true
  },

  PAYMENT: {
    id: 'PAYMENT',
    name: 'Payment Agent',
    description: 'Traitement paiements Stripe et PayPal',
    level: AgentLevel.SPECIALIZED,
    parent: 'FINANCE',
    children: [],
    capabilities: [
      'stripe_processing',
      'paypal_processing',
      'payment_intent_creation',
      'capture_management',
      'payout_processing',
      'reconciliation'
    ],
    triggers: [
      { type: 'EVENT', config: { events: ['checkout.*', 'payment.*'] }, description: 'Traitement paiement' },
      { type: 'WEBHOOK', config: { paths: ['/webhooks/stripe', '/webhooks/paypal'] }, description: 'Webhooks paiement' }
    ],
    priority: AgentPriority.CRITICAL,
    maxConcurrentTasks: 50,
    timeoutMs: 60000,
    retryPolicy: { maxRetries: 5, initialDelayMs: 1000, maxDelayMs: 30000, backoffMultiplier: 2 },
    enabled: true
  },

  DISPUTE: {
    id: 'DISPUTE',
    name: 'Dispute Agent',
    description: 'Gestion des litiges et chargebacks',
    level: AgentLevel.SPECIALIZED,
    parent: 'FINANCE',
    children: [],
    capabilities: [
      'dispute_creation',
      'evidence_collection',
      'status_tracking',
      'resolution_management',
      'chargeback_handling',
      'win_rate_optimization'
    ],
    triggers: [
      { type: 'EVENT', config: { events: ['dispute.*', 'chargeback.*'] }, description: 'Gestion litige' },
      { type: 'WEBHOOK', config: { path: '/webhooks/stripe/disputes' }, description: 'Webhooks litiges' }
    ],
    priority: AgentPriority.HIGH,
    maxConcurrentTasks: 20,
    timeoutMs: 60000,
    retryPolicy: { maxRetries: 3, initialDelayMs: 2000, maxDelayMs: 20000, backoffMultiplier: 2 },
    enabled: true
  },

  REFUND: {
    id: 'REFUND',
    name: 'Refund Agent',
    description: 'Traitement des remboursements',
    level: AgentLevel.SPECIALIZED,
    parent: 'FINANCE',
    children: [],
    capabilities: [
      'refund_processing',
      'partial_refunds',
      'reason_tracking',
      'approval_workflow',
      'bulk_refunds',
      'refund_reporting'
    ],
    triggers: [
      { type: 'EVENT', config: { events: ['refund.*'] }, description: 'Traitement remboursement' }
    ],
    priority: AgentPriority.HIGH,
    maxConcurrentTasks: 20,
    timeoutMs: 45000,
    retryPolicy: { maxRetries: 3, initialDelayMs: 2000, maxDelayMs: 20000, backoffMultiplier: 2 },
    enabled: true
  },

  // =========================================================================
  // LEVEL 2 - SPECIALIZED AGENTS (USER)
  // =========================================================================
  KYC: {
    id: 'KYC',
    name: 'KYC Agent',
    description: 'Vérification identité et documents',
    level: AgentLevel.SPECIALIZED,
    parent: 'USER',
    children: [],
    capabilities: [
      'identity_verification',
      'document_validation',
      'stripe_kyc_sync',
      'risk_assessment',
      'status_tracking',
      'reminder_sending'
    ],
    triggers: [
      { type: 'EVENT', config: { events: ['kyc.*', 'document.*', 'stripe.account.*'] }, description: 'Vérification KYC' },
      { type: 'SCHEDULED', config: { cron: '0 9 * * *' }, description: 'Rappels KYC quotidiens' }
    ],
    priority: AgentPriority.HIGH,
    maxConcurrentTasks: 20,
    timeoutMs: 60000,
    retryPolicy: { maxRetries: 3, initialDelayMs: 2000, maxDelayMs: 20000, backoffMultiplier: 2 },
    enabled: true
  },

  ONBOARDING: {
    id: 'ONBOARDING',
    name: 'Onboarding Agent',
    description: 'Processus d\'inscription providers',
    level: AgentLevel.SPECIALIZED,
    parent: 'USER',
    children: [],
    capabilities: [
      'registration_flow',
      'profile_completion',
      'document_collection',
      'approval_workflow',
      'welcome_sequence',
      'progress_tracking'
    ],
    triggers: [
      { type: 'EVENT', config: { events: ['provider.created', 'onboarding.*'] }, description: 'Flux onboarding' }
    ],
    priority: AgentPriority.MEDIUM,
    maxConcurrentTasks: 30,
    timeoutMs: 30000,
    retryPolicy: { maxRetries: 3, initialDelayMs: 1000, maxDelayMs: 10000, backoffMultiplier: 2 },
    enabled: true
  },

  // =========================================================================
  // LEVEL 2 - SPECIALIZED AGENTS (CALL)
  // =========================================================================
  SCHEDULING: {
    id: 'SCHEDULING',
    name: 'Scheduling Agent',
    description: 'Planification et gestion des créneaux d\'appels',
    level: AgentLevel.SPECIALIZED,
    parent: 'CALL',
    children: [],
    capabilities: [
      'slot_management',
      'availability_tracking',
      'conflict_detection',
      'reminder_scheduling',
      'reschedule_handling',
      'timezone_management'
    ],
    triggers: [
      { type: 'EVENT', config: { events: ['booking.*', 'availability.*'] }, description: 'Gestion créneaux' },
      { type: 'SCHEDULED', config: { cron: '*/15 * * * *' }, description: 'Rappels appels' }
    ],
    priority: AgentPriority.HIGH,
    maxConcurrentTasks: 30,
    timeoutMs: 30000,
    retryPolicy: { maxRetries: 3, initialDelayMs: 1000, maxDelayMs: 10000, backoffMultiplier: 2 },
    enabled: true
  },

  RECORDING: {
    id: 'RECORDING',
    name: 'Recording Agent',
    description: 'Gestion des enregistrements d\'appels (RGPD)',
    level: AgentLevel.SPECIALIZED,
    parent: 'CALL',
    children: [],
    capabilities: [
      'recording_management',
      'transcription',
      'storage_management',
      'retention_policy',
      'gdpr_cleanup',
      'access_control'
    ],
    triggers: [
      { type: 'EVENT', config: { events: ['call.completed', 'recording.*'] }, description: 'Gestion enregistrement' },
      { type: 'SCHEDULED', config: { cron: '0 3 * * *' }, description: 'Nettoyage RGPD' }
    ],
    priority: AgentPriority.MEDIUM,
    maxConcurrentTasks: 20,
    timeoutMs: 120000,
    retryPolicy: { maxRetries: 3, initialDelayMs: 5000, maxDelayMs: 60000, backoffMultiplier: 2 },
    enabled: true
  },

  // =========================================================================
  // LEVEL 2 - SPECIALIZED AGENTS (NOTIFICATION)
  // =========================================================================
  EMAIL: {
    id: 'EMAIL',
    name: 'Email Agent',
    description: 'Envoi et gestion des emails',
    level: AgentLevel.SPECIALIZED,
    parent: 'NOTIFICATION',
    children: [],
    capabilities: [
      'email_sending',
      'template_rendering',
      'personalization',
      'deliverability_tracking',
      'bounce_handling',
      'unsubscribe_management'
    ],
    triggers: [
      { type: 'EVENT', config: { events: ['email.*', 'notification.email'] }, description: 'Envoi email' }
    ],
    priority: AgentPriority.MEDIUM,
    maxConcurrentTasks: 100,
    timeoutMs: 30000,
    retryPolicy: { maxRetries: 5, initialDelayMs: 1000, maxDelayMs: 60000, backoffMultiplier: 2 },
    enabled: true
  },

  SMS: {
    id: 'SMS',
    name: 'SMS Agent',
    description: 'Envoi et gestion des SMS',
    level: AgentLevel.SPECIALIZED,
    parent: 'NOTIFICATION',
    children: [],
    capabilities: [
      'sms_sending',
      'twilio_integration',
      'delivery_tracking',
      'rate_limiting',
      'opt_out_management',
      'international_routing'
    ],
    triggers: [
      { type: 'EVENT', config: { events: ['sms.*', 'notification.sms'] }, description: 'Envoi SMS' }
    ],
    priority: AgentPriority.HIGH,
    maxConcurrentTasks: 50,
    timeoutMs: 15000,
    retryPolicy: { maxRetries: 3, initialDelayMs: 500, maxDelayMs: 5000, backoffMultiplier: 1.5 },
    enabled: true
  },

  PUSH: {
    id: 'PUSH',
    name: 'Push Agent',
    description: 'Notifications push mobile et web',
    level: AgentLevel.SPECIALIZED,
    parent: 'NOTIFICATION',
    children: [],
    capabilities: [
      'push_sending',
      'fcm_integration',
      'token_management',
      'topic_messaging',
      'delivery_tracking',
      'deep_linking'
    ],
    triggers: [
      { type: 'EVENT', config: { events: ['push.*', 'notification.push'] }, description: 'Envoi push' }
    ],
    priority: AgentPriority.MEDIUM,
    maxConcurrentTasks: 100,
    timeoutMs: 10000,
    retryPolicy: { maxRetries: 3, initialDelayMs: 500, maxDelayMs: 5000, backoffMultiplier: 1.5 },
    enabled: true
  },

  // =========================================================================
  // LEVEL 2 - SPECIALIZED AGENTS (COMPLIANCE)
  // =========================================================================
  COUNTRY_CONFIG: {
    id: 'COUNTRY_CONFIG',
    name: 'Country Config Agent',
    description: 'Configuration et règles par pays (197 pays)',
    level: AgentLevel.SPECIALIZED,
    parent: 'COMPLIANCE',
    children: [],
    capabilities: [
      'country_rules_management',
      'fiscal_config',
      'payment_gateway_routing',
      'currency_management',
      'legal_requirements',
      'threshold_tracking'
    ],
    triggers: [
      { type: 'EVENT', config: { events: ['country.*', 'config.*'] }, description: 'Config pays' },
      { type: 'SCHEDULED', config: { cron: '0 0 * * 0' }, description: 'Sync hebdomadaire' }
    ],
    priority: AgentPriority.MEDIUM,
    maxConcurrentTasks: 10,
    timeoutMs: 60000,
    retryPolicy: { maxRetries: 3, initialDelayMs: 2000, maxDelayMs: 20000, backoffMultiplier: 2 },
    enabled: true
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getAgentConfig(agentId: AgentId): AgentConfig {
  return AGENT_HIERARCHY[agentId];
}

export function getChildAgents(agentId: AgentId): AgentConfig[] {
  const config = AGENT_HIERARCHY[agentId];
  return config.children.map(childId => AGENT_HIERARCHY[childId]);
}

export function getParentAgent(agentId: AgentId): AgentConfig | null {
  const config = AGENT_HIERARCHY[agentId];
  return config.parent ? AGENT_HIERARCHY[config.parent] : null;
}

export function getAgentsByLevel(level: AgentLevel): AgentConfig[] {
  return Object.values(AGENT_HIERARCHY).filter(agent => agent.level === level);
}

export function getAllAgents(): AgentConfig[] {
  return Object.values(AGENT_HIERARCHY);
}

export function getAgentHierarchyTree(): Record<string, unknown> {
  const supervisor = AGENT_HIERARCHY.SUPERVISOR;

  const buildTree = (agentId: AgentId): Record<string, unknown> => {
    const agent = AGENT_HIERARCHY[agentId];
    return {
      id: agent.id,
      name: agent.name,
      level: agent.level,
      children: agent.children.map(childId => buildTree(childId))
    };
  };

  return buildTree(supervisor.id);
}
