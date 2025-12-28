/**
 * =============================================================================
 * FUNCTION MONITOR - Wrapper pour monitoring Cloud Functions
 * =============================================================================
 *
 * Wrapper HOC pour Cloud Functions qui ajoute automatiquement:
 * - Request ID tracking
 * - Latency measurement
 * - Error tracking
 * - Cold start detection
 * - Structured logging
 *
 * =============================================================================
 */

import { Request, Response } from "express";
import { metrics } from "./MetricsService";

// =============================================================================
// TYPES
// =============================================================================

export interface MonitoredFunctionOptions {
  name: string;
  sloLatencyMs?: number;
  critical?: boolean;
  logRequest?: boolean;
  logResponse?: boolean;
}

export interface FunctionContext {
  requestId: string;
  functionName: string;
  startTime: number;
  isColdStart: boolean;
}

export interface CallableContextLike {
  auth?: {
    uid: string;
    token?: Record<string, unknown>;
  };
  rawRequest?: Request;
}

export interface EventContextLike {
  eventId: string;
  eventType?: string;
  timestamp?: string;
  params?: Record<string, string>;
}

export interface DocumentSnapshotLike {
  id: string;
  ref: { path: string };
  data: () => Record<string, unknown> | undefined;
  exists: boolean;
}

type HttpHandler = (
  req: Request,
  res: Response,
  context: FunctionContext
) => Promise<void>;

type CallableHandler<T, R> = (
  data: T,
  context: CallableContextLike & { requestContext: FunctionContext }
) => Promise<R>;

// =============================================================================
// UTILITIES
// =============================================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// =============================================================================
// COLD START DETECTION
// =============================================================================

const functionStartTimes = new Map<string, number>();

function detectColdStart(functionName: string): boolean {
  const now = Date.now();
  const lastStart = functionStartTimes.get(functionName);
  functionStartTimes.set(functionName, now);

  // First invocation is always a cold start
  if (!lastStart) {
    metrics.incrementCounter("cold_starts", { function: functionName });
    return true;
  }

  return false;
}

// =============================================================================
// HTTP FUNCTION WRAPPER
// =============================================================================

/**
 * Wrap an HTTP Cloud Function with monitoring
 */
export function monitorHttpFunction(
  options: MonitoredFunctionOptions,
  handler: HttpHandler
): (req: Request, res: Response) => Promise<void> {
  return async (req: Request, res: Response): Promise<void> => {
    const requestId = (req.headers["x-request-id"] as string) || generateId();
    const isColdStart = detectColdStart(options.name);
    const startTime = Date.now();

    // Set request context for correlation
    metrics.setRequestContext(requestId);

    const context: FunctionContext = {
      requestId,
      functionName: options.name,
      startTime,
      isColdStart,
    };

    // Add request ID to response headers
    res.setHeader("X-Request-ID", requestId);

    // Log request
    if (options.logRequest) {
      metrics.info(`[${options.name}] Request received`, {
        functionName: options.name,
        requestId,
        method: req.method,
        path: req.path,
        isColdStart,
      });
    }

    // Track invocation
    metrics.incrementCounter("function_invocations", {
      function: options.name,
      cold_start: isColdStart.toString(),
    });

    try {
      await handler(req, res, context);

      const duration = Date.now() - startTime;

      // Record latency
      metrics.recordLatency(options.name, duration, {
        cold_start: isColdStart.toString(),
      });

      // Log completion
      if (options.logResponse) {
        metrics.info(`[${options.name}] Request completed`, {
          functionName: options.name,
          requestId,
          duration,
          statusCode: res.statusCode,
        });
      }

      // Check SLO
      if (options.sloLatencyMs && duration > options.sloLatencyMs) {
        metrics.warn(`[${options.name}] SLO latency exceeded`, {
          functionName: options.name,
          requestId,
          duration,
          slo: options.sloLatencyMs,
          exceeded_by: duration - options.sloLatencyMs,
        });
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const err = error as Error;

      // Record error
      metrics.recordError(options.name, err.name, {
        cold_start: isColdStart.toString(),
      });

      // Record latency even for errors
      metrics.recordLatency(options.name, duration, {
        cold_start: isColdStart.toString(),
        error: "true",
      });

      // Log error
      metrics.error(`[${options.name}] Error`, {
        functionName: options.name,
        requestId,
        duration,
        error: err.message,
        stack: err.stack,
        critical: options.critical,
      });

      // Re-throw for upstream handling
      throw error;
    } finally {
      metrics.clearRequestContext();
    }
  };
}

// =============================================================================
// CALLABLE FUNCTION WRAPPER
// =============================================================================

/**
 * Wrap a callable Cloud Function with monitoring
 */
export function monitorCallableFunction<T, R>(
  options: MonitoredFunctionOptions,
  handler: CallableHandler<T, R>
): (data: T, context: CallableContextLike) => Promise<R> {
  return async (
    data: T,
    callableContext: CallableContextLike
  ): Promise<R> => {
    const requestId = generateId();
    const isColdStart = detectColdStart(options.name);
    const startTime = Date.now();

    // Set request context for correlation
    metrics.setRequestContext(requestId);

    const functionContext: FunctionContext = {
      requestId,
      functionName: options.name,
      startTime,
      isColdStart,
    };

    // Log request
    if (options.logRequest) {
      metrics.info(`[${options.name}] Callable invoked`, {
        functionName: options.name,
        requestId,
        userId: callableContext.auth?.uid,
        isColdStart,
      });
    }

    // Track invocation
    metrics.incrementCounter("function_invocations", {
      function: options.name,
      cold_start: isColdStart.toString(),
      type: "callable",
    });

    try {
      const result = await handler(data, {
        ...callableContext,
        requestContext: functionContext,
      });

      const duration = Date.now() - startTime;

      // Record latency
      metrics.recordLatency(options.name, duration, {
        cold_start: isColdStart.toString(),
      });

      // Log completion
      if (options.logResponse) {
        metrics.info(`[${options.name}] Callable completed`, {
          functionName: options.name,
          requestId,
          duration,
        });
      }

      // Check SLO
      if (options.sloLatencyMs && duration > options.sloLatencyMs) {
        metrics.warn(`[${options.name}] SLO latency exceeded`, {
          functionName: options.name,
          requestId,
          duration,
          slo: options.sloLatencyMs,
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const err = error as Error;

      // Record error
      metrics.recordError(options.name, err.name, {
        cold_start: isColdStart.toString(),
      });

      // Record latency
      metrics.recordLatency(options.name, duration, {
        cold_start: isColdStart.toString(),
        error: "true",
      });

      // Log error
      metrics.error(`[${options.name}] Error`, {
        functionName: options.name,
        requestId,
        duration,
        error: err.message,
        stack: err.stack,
      });

      throw error;
    } finally {
      metrics.clearRequestContext();
    }
  };
}

// =============================================================================
// TRIGGER FUNCTION WRAPPER
// =============================================================================

/**
 * Wrap a Firestore trigger function with monitoring
 */
export function monitorTriggerFunction<T>(
  options: MonitoredFunctionOptions,
  handler: (
    snapshot: DocumentSnapshotLike,
    context: EventContextLike & { requestContext: FunctionContext }
  ) => Promise<T>
): (
  snapshot: DocumentSnapshotLike,
  context: EventContextLike
) => Promise<T> {
  return async (
    snapshot: DocumentSnapshotLike,
    eventContext: EventContextLike
  ): Promise<T> => {
    const requestId = eventContext.eventId || generateId();
    const isColdStart = detectColdStart(options.name);
    const startTime = Date.now();

    metrics.setRequestContext(requestId);

    const functionContext: FunctionContext = {
      requestId,
      functionName: options.name,
      startTime,
      isColdStart,
    };

    // Log trigger
    metrics.debug(`[${options.name}] Trigger fired`, {
      functionName: options.name,
      requestId,
      documentId: snapshot.id,
      isColdStart,
    });

    // Track invocation
    metrics.incrementCounter("function_invocations", {
      function: options.name,
      cold_start: isColdStart.toString(),
      type: "trigger",
    });

    try {
      const result = await handler(snapshot, {
        ...eventContext,
        requestContext: functionContext,
      });

      const duration = Date.now() - startTime;

      metrics.recordLatency(options.name, duration, {
        cold_start: isColdStart.toString(),
      });

      metrics.debug(`[${options.name}] Trigger completed`, {
        functionName: options.name,
        requestId,
        duration,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const err = error as Error;

      metrics.recordError(options.name, err.name);
      metrics.recordLatency(options.name, duration, { error: "true" });

      metrics.error(`[${options.name}] Trigger error`, {
        functionName: options.name,
        requestId,
        duration,
        error: err.message,
        stack: err.stack,
      });

      throw error;
    } finally {
      metrics.clearRequestContext();
    }
  };
}

// =============================================================================
// SCHEDULED FUNCTION WRAPPER
// =============================================================================

/**
 * Wrap a scheduled function with monitoring
 */
export function monitorScheduledFunction(
  options: MonitoredFunctionOptions,
  handler: (context: EventContextLike & { requestContext: FunctionContext }) => Promise<void>
): (context: EventContextLike) => Promise<void> {
  return async (eventContext: EventContextLike): Promise<void> => {
    const requestId = eventContext.eventId || generateId();
    const isColdStart = detectColdStart(options.name);
    const startTime = Date.now();

    metrics.setRequestContext(requestId);

    const functionContext: FunctionContext = {
      requestId,
      functionName: options.name,
      startTime,
      isColdStart,
    };

    metrics.info(`[${options.name}] Scheduled job started`, {
      functionName: options.name,
      requestId,
      isColdStart,
    });

    metrics.incrementCounter("scheduled_job_runs", {
      job: options.name,
    });

    try {
      await handler({
        ...eventContext,
        requestContext: functionContext,
      });

      const duration = Date.now() - startTime;

      metrics.recordLatency(options.name, duration);

      metrics.info(`[${options.name}] Scheduled job completed`, {
        functionName: options.name,
        requestId,
        duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const err = error as Error;

      metrics.recordError(options.name, err.name);
      metrics.recordLatency(options.name, duration, { error: "true" });

      metrics.error(`[${options.name}] Scheduled job failed`, {
        functionName: options.name,
        requestId,
        duration,
        error: err.message,
        stack: err.stack,
        critical: options.critical,
      });

      metrics.incrementCounter("scheduled_job_failures", {
        job: options.name,
      });

      throw error;
    } finally {
      metrics.clearRequestContext();
    }
  };
}

export default {
  monitorHttpFunction,
  monitorCallableFunction,
  monitorTriggerFunction,
  monitorScheduledFunction,
};
