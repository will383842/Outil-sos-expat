/**
 * Circuit Breaker Pattern for External API Calls
 *
 * P0 FIX 2026-01-30: Prevents cascading failures when Stripe or other APIs are down
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Circuit is open, requests fail fast without calling the API
 * - HALF_OPEN: Testing if the service has recovered
 */

import { logger } from 'firebase-functions';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  /** Name of the circuit for logging */
  name: string;
  /** Number of failures before opening the circuit */
  failureThreshold?: number;
  /** Time in ms before attempting to close the circuit (test request) */
  resetTimeout?: number;
  /** Time in ms before a request is considered timed out */
  requestTimeout?: number;
  /** Callback when circuit opens */
  onOpen?: () => void;
  /** Callback when circuit closes */
  onClose?: () => void;
  /** Callback when circuit is half-open */
  onHalfOpen?: () => void;
}

export interface CircuitBreakerStats {
  name: string;
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure: Date | null;
  lastSuccess: Date | null;
  totalRequests: number;
  failedRequests: number;
}

const DEFAULT_OPTIONS = {
  failureThreshold: 5,
  resetTimeout: 30000, // 30 seconds
  requestTimeout: 10000, // 10 seconds
};

class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures: number = 0;
  private successes: number = 0;
  private lastFailure: Date | null = null;
  private lastSuccess: Date | null = null;
  private nextAttempt: number = 0;
  private totalRequests: number = 0;
  private failedRequests: number = 0;
  private options: Required<Omit<CircuitBreakerOptions, 'onOpen' | 'onClose' | 'onHalfOpen'>> &
    Pick<CircuitBreakerOptions, 'onOpen' | 'onClose' | 'onHalfOpen'>;

  constructor(options: CircuitBreakerOptions) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // Check if circuit is open
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        // Circuit is open and timeout hasn't elapsed
        this.failedRequests++;
        throw new CircuitBreakerError(
          `Circuit breaker [${this.options.name}] is OPEN. Requests are blocked until ${new Date(this.nextAttempt).toISOString()}`,
          this.state
        );
      }

      // Timeout has elapsed, try half-open
      this.toHalfOpen();
    }

    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(fn);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Circuit breaker [${this.options.name}] request timeout after ${this.options.requestTimeout}ms`));
      }, this.options.requestTimeout);

      fn()
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Handle successful request
   */
  private onSuccess(): void {
    this.lastSuccess = new Date();
    this.successes++;

    if (this.state === 'HALF_OPEN') {
      this.toClose();
    }

    // Reset failure count on success
    this.failures = 0;
  }

  /**
   * Handle failed request
   */
  private onFailure(error: unknown): void {
    this.lastFailure = new Date();
    this.failures++;
    this.failedRequests++;

    logger.warn(`[CircuitBreaker:${this.options.name}] Request failed (${this.failures}/${this.options.failureThreshold})`, {
      error: error instanceof Error ? error.message : String(error),
      state: this.state,
    });

    if (this.state === 'HALF_OPEN') {
      // Failed in half-open state, back to open
      this.toOpen();
    } else if (this.failures >= this.options.failureThreshold) {
      // Threshold reached, open the circuit
      this.toOpen();
    }
  }

  /**
   * Transition to OPEN state
   */
  private toOpen(): void {
    this.state = 'OPEN';
    this.nextAttempt = Date.now() + this.options.resetTimeout;

    logger.error(`[CircuitBreaker:${this.options.name}] Circuit OPENED after ${this.failures} failures. Next attempt at ${new Date(this.nextAttempt).toISOString()}`);

    this.options.onOpen?.();
  }

  /**
   * Transition to HALF_OPEN state
   */
  private toHalfOpen(): void {
    this.state = 'HALF_OPEN';

    logger.info(`[CircuitBreaker:${this.options.name}] Circuit HALF_OPEN - testing recovery`);

    this.options.onHalfOpen?.();
  }

  /**
   * Transition to CLOSED state
   */
  private toClose(): void {
    this.state = 'CLOSED';
    this.failures = 0;

    logger.info(`[CircuitBreaker:${this.options.name}] Circuit CLOSED - service recovered`);

    this.options.onClose?.();
  }

  /**
   * Get current circuit breaker stats
   */
  getStats(): CircuitBreakerStats {
    return {
      name: this.options.name,
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
      totalRequests: this.totalRequests,
      failedRequests: this.failedRequests,
    };
  }

  /**
   * Force reset the circuit breaker (admin use only)
   */
  forceReset(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.nextAttempt = 0;
    logger.info(`[CircuitBreaker:${this.options.name}] Force reset - circuit now CLOSED`);
  }

  /**
   * Check if circuit allows requests
   */
  isAvailable(): boolean {
    if (this.state === 'CLOSED') return true;
    if (this.state === 'OPEN' && Date.now() >= this.nextAttempt) return true;
    return this.state === 'HALF_OPEN';
  }
}

/**
 * Custom error for circuit breaker failures
 */
export class CircuitBreakerError extends Error {
  public readonly state: CircuitState;
  public readonly isCircuitBreakerError = true;

  constructor(message: string, state: CircuitState) {
    super(message);
    this.name = 'CircuitBreakerError';
    this.state = state;
  }
}

// ============================================================================
// CIRCUIT BREAKER INSTANCES
// ============================================================================

// Stripe API circuit breaker
export const stripeCircuitBreaker = new CircuitBreaker({
  name: 'Stripe',
  failureThreshold: 5,
  resetTimeout: 30000, // 30 seconds
  requestTimeout: 15000, // 15 seconds
  onOpen: () => {
    logger.error('[Stripe Circuit Breaker] OPEN - Stripe API may be experiencing issues');
  },
  onClose: () => {
    logger.info('[Stripe Circuit Breaker] CLOSED - Stripe API recovered');
  },
});

// PayPal API circuit breaker
export const paypalCircuitBreaker = new CircuitBreaker({
  name: 'PayPal',
  failureThreshold: 5,
  resetTimeout: 30000,
  requestTimeout: 20000, // PayPal can be slower
  onOpen: () => {
    logger.error('[PayPal Circuit Breaker] OPEN - PayPal API may be experiencing issues');
  },
});

// Wise API circuit breaker
export const wiseCircuitBreaker = new CircuitBreaker({
  name: 'Wise',
  failureThreshold: 3,
  resetTimeout: 60000, // 1 minute
  requestTimeout: 30000,
  onOpen: () => {
    logger.error('[Wise Circuit Breaker] OPEN - Wise API may be experiencing issues');
  },
});

// Flutterwave API circuit breaker
export const flutterwaveCircuitBreaker = new CircuitBreaker({
  name: 'Flutterwave',
  failureThreshold: 3,
  resetTimeout: 60000,
  requestTimeout: 30000,
  onOpen: () => {
    logger.error('[Flutterwave Circuit Breaker] OPEN - Flutterwave API may be experiencing issues');
  },
});

/**
 * Get all circuit breaker stats for monitoring
 */
export function getAllCircuitBreakerStats(): CircuitBreakerStats[] {
  return [
    stripeCircuitBreaker.getStats(),
    paypalCircuitBreaker.getStats(),
    wiseCircuitBreaker.getStats(),
    flutterwaveCircuitBreaker.getStats(),
  ];
}

/**
 * Reset all circuit breakers (admin use only)
 */
export function resetAllCircuitBreakers(): void {
  stripeCircuitBreaker.forceReset();
  paypalCircuitBreaker.forceReset();
  wiseCircuitBreaker.forceReset();
  flutterwaveCircuitBreaker.forceReset();
  logger.info('[CircuitBreaker] All circuit breakers reset');
}

export { CircuitBreaker };
