/**
 * Service Balance Alerts System
 *
 * Monitors external service balances (Twilio, Stripe, OpenAI, Anthropic, Perplexity)
 * and sends alerts when balances fall below configured thresholds.
 *
 * Features:
 * - Configurable thresholds per service with warning/critical levels
 * - Scheduled hourly balance checks
 * - Email notifications to configured admins
 * - Dashboard notifications for admin visibility
 * - Alert acknowledgment and resolution tracking
 *
 * @version 1.0.0
 * @admin-only All functions require admin authentication
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { defineSecret } from 'firebase-functions/params';
import Stripe from 'stripe';

// Import credentials from existing lib modules
import {
  TWILIO_ACCOUNT_SID_SECRET,
  TWILIO_AUTH_TOKEN_SECRET,
  getTwilioAccountSid,
  getTwilioAuthToken,
} from '../lib/twilio';
import {
  STRIPE_SECRET_KEY_LIVE,
  STRIPE_SECRET_KEY_TEST,
  getStripeSecretKey,
} from '../lib/stripe';
import { ALLOWED_ORIGINS } from '../lib/functionConfigs';

// AI Service API Keys
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

// ============================================================================
// TYPES
// ============================================================================

/** Supported external services for balance monitoring */
export type ServiceType = 'twilio' | 'openai' | 'anthropic' | 'perplexity' | 'stripe';

/** Alert severity levels */
export type AlertLevel = 'warning' | 'critical';

/**
 * Threshold configuration for a service
 * Stored in Firestore: service_balance_thresholds/{service}
 */
export interface ServiceBalanceThreshold {
  service: ServiceType;
  threshold: number;           // Minimum balance before alert
  currency: string;            // Currency code (USD, EUR)
  alertLevel: AlertLevel;      // warning or critical
  notifyEmails: string[];      // Email addresses to notify
  isActive: boolean;           // Whether monitoring is enabled
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

/**
 * Alert record for a low balance event
 * Stored in Firestore: service_balance_alerts/{alertId}
 */
export interface ServiceBalanceAlert {
  id?: string;
  service: ServiceType;
  currentBalance: number;
  threshold: number;
  currency: string;
  alertLevel: AlertLevel;
  createdAt: admin.firestore.Timestamp;
  acknowledgedAt?: admin.firestore.Timestamp;
  acknowledgedBy?: string;
  isResolved: boolean;
  resolvedAt?: admin.firestore.Timestamp;
}

/** Balance response from service API */
interface BalanceResult {
  service: ServiceType;
  balance: number;
  currency: string;
  success: boolean;
  error?: string;
}

/** Result of checking all services */
interface CheckResult {
  service: ServiceType;
  balance: number | null;
  threshold: number;
  currency: string;
  alertTriggered: boolean;
  alertLevel: AlertLevel | null;
  error?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const COLLECTIONS = {
  THRESHOLDS: 'service_balance_thresholds',
  ALERTS: 'service_balance_alerts',
  ADMIN_NOTIFICATIONS: 'admin_notifications',
  MESSAGE_EVENTS: 'message_events',
  SYSTEM_LOGS: 'system_logs',
  USERS: 'users',
};

/** Default thresholds for each service (used when no config exists) */
const DEFAULT_THRESHOLDS: Record<ServiceType, { threshold: number; currency: string }> = {
  twilio: { threshold: 50, currency: 'USD' },
  stripe: { threshold: 500, currency: 'EUR' },
  openai: { threshold: 20, currency: 'USD' },
  anthropic: { threshold: 20, currency: 'USD' },
  perplexity: { threshold: 10, currency: 'USD' },
};

/** Pricing for AI services (per 1M tokens for estimation) */
const AI_PRICING = {
  anthropic: {
    inputPer1M: 3.00,   // Claude 3.5 Sonnet
    outputPer1M: 15.00,
  },
  perplexity: {
    inputPer1M: 3.00,   // Sonar Pro
    outputPer1M: 15.00,
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const db = () => admin.firestore();

/**
 * Verifies that the user has admin access
 */
async function verifyAdminAccess(uid: string): Promise<boolean> {
  try {
    const userDoc = await db().collection(COLLECTIONS.USERS).doc(uid).get();
    const userData = userDoc.data();
    return userData?.role === 'admin' || userData?.role === 'dev' || userData?.role === 'super_admin';
  } catch (error) {
    logger.error('[ServiceAlerts] Error verifying admin access:', error);
    return false;
  }
}

/**
 * Gets admin emails for notifications
 */
async function getAdminEmails(): Promise<string[]> {
  try {
    const adminsSnapshot = await db()
      .collection(COLLECTIONS.USERS)
      .where('role', 'in', ['admin', 'super_admin', 'dev'])
      .get();

    const emails: string[] = [];
    adminsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.email) {
        emails.push(data.email);
      }
    });

    return emails;
  } catch (error) {
    logger.error('[ServiceAlerts] Error fetching admin emails:', error);
    return [];
  }
}

// ============================================================================
// BALANCE FETCHING FUNCTIONS
// ============================================================================

/**
 * Fetches Twilio account balance
 */
async function fetchTwilioBalance(): Promise<BalanceResult> {
  try {
    const accountSid = getTwilioAccountSid();
    const authToken = getTwilioAuthToken();

    if (!accountSid || !authToken) {
      return {
        service: 'twilio',
        balance: 0,
        currency: 'USD',
        success: false,
        error: 'Twilio credentials not configured',
      };
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Balance.json`;
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Twilio API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as { balance: string; currency: string };

    return {
      service: 'twilio',
      balance: parseFloat(data.balance),
      currency: data.currency,
      success: true,
    };
  } catch (error) {
    logger.error('[ServiceAlerts] Error fetching Twilio balance:', error);
    return {
      service: 'twilio',
      balance: 0,
      currency: 'USD',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Fetches Stripe platform balance
 */
async function fetchStripeBalance(): Promise<BalanceResult> {
  try {
    const stripeSecretKey = getStripeSecretKey();

    if (!stripeSecretKey) {
      return {
        service: 'stripe',
        balance: 0,
        currency: 'EUR',
        success: false,
        error: 'Stripe credentials not configured',
      };
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
    });

    const balance = await stripe.balance.retrieve();

    // Get EUR available balance (primary currency)
    const eurBalance = balance.available.find((b) => b.currency === 'eur');
    const availableBalance = eurBalance ? eurBalance.amount / 100 : 0;

    return {
      service: 'stripe',
      balance: availableBalance,
      currency: 'EUR',
      success: true,
    };
  } catch (error) {
    logger.error('[ServiceAlerts] Error fetching Stripe balance:', error);
    return {
      service: 'stripe',
      balance: 0,
      currency: 'EUR',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Fetches OpenAI credit balance
 */
async function fetchOpenAIBalance(): Promise<BalanceResult> {
  try {
    const apiKey = OPENAI_API_KEY.value()?.trim();

    if (!apiKey || !apiKey.startsWith('sk-')) {
      return {
        service: 'openai',
        balance: 0,
        currency: 'USD',
        success: false,
        error: 'OpenAI API key not configured',
      };
    }

    // Fetch credit grants (remaining credits)
    const response = await fetch('https://api.openai.com/v1/dashboard/billing/credit_grants', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Some accounts may not have access to this endpoint
      // Fall back to subscription endpoint
      const subResponse = await fetch('https://api.openai.com/v1/dashboard/billing/subscription', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!subResponse.ok) {
        throw new Error('Unable to fetch OpenAI billing information');
      }

      const subData = await subResponse.json() as { hard_limit_usd: number; soft_limit_usd: number };
      // Return soft limit as a proxy for available balance
      return {
        service: 'openai',
        balance: subData.soft_limit_usd || 0,
        currency: 'USD',
        success: true,
      };
    }

    const data = await response.json() as { total_available: number };
    return {
      service: 'openai',
      balance: (data.total_available || 0) / 100, // Convert cents to dollars
      currency: 'USD',
      success: true,
    };
  } catch (error) {
    logger.error('[ServiceAlerts] Error fetching OpenAI balance:', error);
    return {
      service: 'openai',
      balance: 0,
      currency: 'USD',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Estimates Anthropic balance based on logged usage
 * Anthropic doesn't have a public billing API, so we track from ai_call_logs
 * and estimate remaining budget based on configured threshold
 */
async function fetchAnthropicBalance(): Promise<BalanceResult> {
  try {
    // Get current month's usage from ai_call_logs
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const logsSnapshot = await db()
      .collection('ai_call_logs')
      .where('provider', '==', 'claude')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(startOfMonth))
      .get();

    let inputTokens = 0;
    let outputTokens = 0;

    logsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      inputTokens += data.inputTokens || 0;
      outputTokens += data.outputTokens || 0;
    });

    // Calculate estimated cost
    const inputCost = (inputTokens / 1_000_000) * AI_PRICING.anthropic.inputPer1M;
    const outputCost = (outputTokens / 1_000_000) * AI_PRICING.anthropic.outputPer1M;
    const usedCost = inputCost + outputCost;

    // Get configured monthly budget (threshold represents monthly budget for AI services)
    const thresholdDoc = await db()
      .collection(COLLECTIONS.THRESHOLDS)
      .doc('anthropic')
      .get();

    const monthlyBudget = thresholdDoc.exists
      ? (thresholdDoc.data()?.threshold || DEFAULT_THRESHOLDS.anthropic.threshold)
      : DEFAULT_THRESHOLDS.anthropic.threshold;

    const remainingBalance = Math.max(0, monthlyBudget - usedCost);

    return {
      service: 'anthropic',
      balance: Math.round(remainingBalance * 100) / 100,
      currency: 'USD',
      success: true,
    };
  } catch (error) {
    logger.error('[ServiceAlerts] Error calculating Anthropic balance:', error);
    return {
      service: 'anthropic',
      balance: 0,
      currency: 'USD',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Estimates Perplexity balance based on logged usage
 * Perplexity doesn't have a public billing API
 */
async function fetchPerplexityBalance(): Promise<BalanceResult> {
  try {
    // Get current month's usage from ai_call_logs
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const logsSnapshot = await db()
      .collection('ai_call_logs')
      .where('provider', '==', 'perplexity')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(startOfMonth))
      .get();

    let inputTokens = 0;
    let outputTokens = 0;

    logsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.inputTokens !== undefined && data.outputTokens !== undefined) {
        inputTokens += data.inputTokens;
        outputTokens += data.outputTokens;
      } else if (data.totalTokens !== undefined) {
        // Estimate 30% input, 70% output for search queries
        inputTokens += Math.round(data.totalTokens * 0.3);
        outputTokens += Math.round(data.totalTokens * 0.7);
      }
    });

    // Calculate estimated cost
    const inputCost = (inputTokens / 1_000_000) * AI_PRICING.perplexity.inputPer1M;
    const outputCost = (outputTokens / 1_000_000) * AI_PRICING.perplexity.outputPer1M;
    const usedCost = inputCost + outputCost;

    // Get configured monthly budget
    const thresholdDoc = await db()
      .collection(COLLECTIONS.THRESHOLDS)
      .doc('perplexity')
      .get();

    const monthlyBudget = thresholdDoc.exists
      ? (thresholdDoc.data()?.threshold || DEFAULT_THRESHOLDS.perplexity.threshold)
      : DEFAULT_THRESHOLDS.perplexity.threshold;

    const remainingBalance = Math.max(0, monthlyBudget - usedCost);

    return {
      service: 'perplexity',
      balance: Math.round(remainingBalance * 100) / 100,
      currency: 'USD',
      success: true,
    };
  } catch (error) {
    logger.error('[ServiceAlerts] Error calculating Perplexity balance:', error);
    return {
      service: 'perplexity',
      balance: 0,
      currency: 'USD',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Fetches balance for a specific service
 */
async function fetchServiceBalance(service: ServiceType): Promise<BalanceResult> {
  switch (service) {
    case 'twilio':
      return fetchTwilioBalance();
    case 'stripe':
      return fetchStripeBalance();
    case 'openai':
      return fetchOpenAIBalance();
    case 'anthropic':
      return fetchAnthropicBalance();
    case 'perplexity':
      return fetchPerplexityBalance();
    default:
      return {
        service,
        balance: 0,
        currency: 'USD',
        success: false,
        error: `Unknown service: ${service}`,
      };
  }
}

// ============================================================================
// NOTIFICATION FUNCTIONS
// ============================================================================

/**
 * Sends email notification for a balance alert
 */
async function sendAlertEmail(
  alert: ServiceBalanceAlert,
  emails: string[]
): Promise<void> {
  const serviceNames: Record<ServiceType, string> = {
    twilio: 'Twilio',
    stripe: 'Stripe',
    openai: 'OpenAI',
    anthropic: 'Anthropic (Claude)',
    perplexity: 'Perplexity',
  };

  const serviceName = serviceNames[alert.service];
  const isUrgent = alert.alertLevel === 'critical';

  for (const email of emails) {
    try {
      await db().collection(COLLECTIONS.MESSAGE_EVENTS).add({
        eventId: `service.balance.${alert.alertLevel}`,
        locale: 'fr',
        to: { email },
        context: { user: { email } },
        vars: {
          subject: isUrgent
            ? `[URGENT] SOS Expat - Solde bas: ${serviceName}`
            : `[Alerte] SOS Expat - Solde ${serviceName} a surveiller`,
          serviceName,
          currentBalance: alert.currentBalance.toFixed(2),
          threshold: alert.threshold.toFixed(2),
          currency: alert.currency,
          alertLevel: alert.alertLevel,
          dashboardUrl: 'https://sos-expat.com/admin/finance',
        },
        channels: ['email'],
        dedupeKey: `service_balance_${alert.service}_${new Date().toISOString().slice(0, 10)}`,
        createdAt: admin.firestore.Timestamp.now(),
      });

      logger.info(`[ServiceAlerts] Alert email queued for ${email}`, {
        service: alert.service,
        alertLevel: alert.alertLevel,
      });
    } catch (error) {
      logger.error(`[ServiceAlerts] Failed to queue email for ${email}:`, error);
    }
  }
}

/**
 * Creates an admin notification for the dashboard
 */
async function createAdminNotification(alert: ServiceBalanceAlert): Promise<void> {
  const serviceNames: Record<ServiceType, string> = {
    twilio: 'Twilio',
    stripe: 'Stripe',
    openai: 'OpenAI',
    anthropic: 'Anthropic (Claude)',
    perplexity: 'Perplexity',
  };

  const serviceName = serviceNames[alert.service];

  try {
    await db().collection(COLLECTIONS.ADMIN_NOTIFICATIONS).add({
      type: 'service_balance_alert',
      severity: alert.alertLevel,
      title: alert.alertLevel === 'critical'
        ? `Solde critique: ${serviceName}`
        : `Solde bas: ${serviceName}`,
      message: `Le solde ${serviceName} est de ${alert.currentBalance.toFixed(2)} ${alert.currency} ` +
        `(seuil: ${alert.threshold.toFixed(2)} ${alert.currency})`,
      service: alert.service,
      currentBalance: alert.currentBalance,
      threshold: alert.threshold,
      currency: alert.currency,
      alertLevel: alert.alertLevel,
      alertId: alert.id,
      read: false,
      createdAt: admin.firestore.Timestamp.now(),
    });

    logger.info('[ServiceAlerts] Admin notification created', {
      service: alert.service,
      alertLevel: alert.alertLevel,
    });
  } catch (error) {
    logger.error('[ServiceAlerts] Failed to create admin notification:', error);
  }
}

// ============================================================================
// CORE ALERT LOGIC
// ============================================================================

/**
 * Checks if an alert already exists for this service (unresolved)
 */
async function hasActiveAlert(service: ServiceType): Promise<boolean> {
  const existingAlerts = await db()
    .collection(COLLECTIONS.ALERTS)
    .where('service', '==', service)
    .where('isResolved', '==', false)
    .limit(1)
    .get();

  return !existingAlerts.empty;
}

/**
 * Creates a new balance alert
 */
async function createAlert(
  service: ServiceType,
  currentBalance: number,
  threshold: number,
  currency: string,
  alertLevel: AlertLevel
): Promise<ServiceBalanceAlert> {
  const alertData: Omit<ServiceBalanceAlert, 'id'> = {
    service,
    currentBalance,
    threshold,
    currency,
    alertLevel,
    createdAt: admin.firestore.Timestamp.now(),
    isResolved: false,
  };

  const docRef = await db().collection(COLLECTIONS.ALERTS).add(alertData);

  return {
    ...alertData,
    id: docRef.id,
  };
}

/**
 * Checks a single service and triggers alert if needed
 */
async function checkServiceAndAlert(service: ServiceType): Promise<CheckResult> {
  const result: CheckResult = {
    service,
    balance: null,
    threshold: DEFAULT_THRESHOLDS[service].threshold,
    currency: DEFAULT_THRESHOLDS[service].currency,
    alertTriggered: false,
    alertLevel: null,
  };

  try {
    // Get threshold config
    const thresholdDoc = await db()
      .collection(COLLECTIONS.THRESHOLDS)
      .doc(service)
      .get();

    const thresholdConfig = thresholdDoc.exists
      ? (thresholdDoc.data() as ServiceBalanceThreshold)
      : null;

    // Skip if monitoring is disabled
    if (thresholdConfig && !thresholdConfig.isActive) {
      logger.info(`[ServiceAlerts] Monitoring disabled for ${service}`);
      return result;
    }

    if (thresholdConfig) {
      result.threshold = thresholdConfig.threshold;
      result.currency = thresholdConfig.currency;
    }

    // Fetch current balance
    const balanceResult = await fetchServiceBalance(service);

    if (!balanceResult.success) {
      result.error = balanceResult.error;
      logger.warn(`[ServiceAlerts] Failed to fetch balance for ${service}:`, balanceResult.error);
      return result;
    }

    result.balance = balanceResult.balance;

    // Check if balance is below threshold
    if (balanceResult.balance < result.threshold) {
      // Check if there's already an active alert
      const hasExisting = await hasActiveAlert(service);

      if (!hasExisting) {
        // Determine alert level
        const alertLevel: AlertLevel =
          thresholdConfig?.alertLevel ||
          (balanceResult.balance < result.threshold * 0.5 ? 'critical' : 'warning');

        // Create alert
        const alert = await createAlert(
          service,
          balanceResult.balance,
          result.threshold,
          result.currency,
          alertLevel
        );

        result.alertTriggered = true;
        result.alertLevel = alertLevel;

        // Get notification emails
        const emails = thresholdConfig?.notifyEmails?.length
          ? thresholdConfig.notifyEmails
          : await getAdminEmails();

        // Send notifications
        await sendAlertEmail(alert, emails);
        await createAdminNotification(alert);

        logger.info(`[ServiceAlerts] Alert created for ${service}`, {
          balance: balanceResult.balance,
          threshold: result.threshold,
          alertLevel,
        });
      } else {
        logger.info(`[ServiceAlerts] Active alert already exists for ${service}`);
      }
    } else {
      // Check if we need to resolve existing alerts
      const existingAlerts = await db()
        .collection(COLLECTIONS.ALERTS)
        .where('service', '==', service)
        .where('isResolved', '==', false)
        .get();

      for (const doc of existingAlerts.docs) {
        await doc.ref.update({
          isResolved: true,
          resolvedAt: admin.firestore.Timestamp.now(),
        });
        logger.info(`[ServiceAlerts] Alert resolved for ${service}`, {
          alertId: doc.id,
        });
      }
    }

    return result;
  } catch (error) {
    logger.error(`[ServiceAlerts] Error checking ${service}:`, error);
    result.error = error instanceof Error ? error.message : 'Unknown error';
    return result;
  }
}

// ============================================================================
// SCHEDULED FUNCTION - Check All Service Balances
// ============================================================================

/**
 * Scheduled function that checks all service balances 1×/jour à 8h
 * 2025-01-16: Réduit à quotidien pour économies maximales (low traffic)
 */
export const checkServiceBalances = onSchedule(
  {
    schedule: '0 8 * * *', // 8h Paris tous les jours
    timeZone: 'Europe/Paris',
    region: 'europe-west3',
    memory: '512MiB',
    cpu: 0.083,
    timeoutSeconds: 120,
    secrets: [
      TWILIO_ACCOUNT_SID_SECRET,
      TWILIO_AUTH_TOKEN_SECRET,
      STRIPE_SECRET_KEY_LIVE,
      STRIPE_SECRET_KEY_TEST,
      OPENAI_API_KEY,
    ],
  },
  async () => {
    const startTime = Date.now();
    logger.info('[ServiceAlerts] Starting hourly service balance check...');

    const services: ServiceType[] = ['twilio', 'stripe', 'openai', 'anthropic', 'perplexity'];
    const results: CheckResult[] = [];

    for (const service of services) {
      const result = await checkServiceAndAlert(service);
      results.push(result);
    }

    // Log summary
    const alertsTriggered = results.filter((r) => r.alertTriggered).length;
    const errors = results.filter((r) => r.error).length;

    // Save execution log
    await db().collection(COLLECTIONS.SYSTEM_LOGS).add({
      type: 'service_balance_check',
      success: errors === 0,
      alertsTriggered,
      errors,
      results: results.map((r) => ({
        service: r.service,
        balance: r.balance,
        threshold: r.threshold,
        alertTriggered: r.alertTriggered,
        alertLevel: r.alertLevel,
        error: r.error,
      })),
      executionTimeMs: Date.now() - startTime,
      createdAt: admin.firestore.Timestamp.now(),
    });

    logger.info(
      `[ServiceAlerts] Completed in ${Date.now() - startTime}ms. ` +
      `Alerts: ${alertsTriggered}, Errors: ${errors}`
    );
  }
);

// ============================================================================
// CALLABLE FUNCTIONS
// ============================================================================

/**
 * Get all current balance alerts (unacknowledged and unresolved)
 */
export const getServiceBalanceAlerts = onCall(
  {
    region: 'europe-west3',
    cpu: 0.083,
    memory: '256MiB',
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ alerts: ServiceBalanceAlert[] }> => {
    // Authentication check
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    // Admin verification
    const isAdmin = await verifyAdminAccess(request.auth.uid);
    if (!isAdmin) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    logger.info('[ServiceAlerts] Fetching balance alerts', {
      uid: request.auth.uid,
    });

    try {
      const { includeResolved = false, limit: queryLimit = 50 } = request.data || {};

      let query = db().collection(COLLECTIONS.ALERTS) as admin.firestore.Query;

      if (!includeResolved) {
        query = query.where('isResolved', '==', false);
      }

      const snapshot = await query
        .orderBy('createdAt', 'desc')
        .limit(queryLimit)
        .get();

      const alerts: ServiceBalanceAlert[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as ServiceBalanceAlert));

      return { alerts };
    } catch (error) {
      logger.error('[ServiceAlerts] Error fetching alerts:', error);
      throw new HttpsError('internal', 'Failed to fetch alerts');
    }
  }
);

/**
 * Acknowledge a balance alert
 */
export const acknowledgeServiceBalanceAlert = onCall(
  {
    region: 'europe-west3',
    cpu: 0.083,
    memory: '256MiB',
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean }> => {
    // Authentication check
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    // Admin verification
    const isAdmin = await verifyAdminAccess(request.auth.uid);
    if (!isAdmin) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const { alertId } = request.data as { alertId: string };

    if (!alertId) {
      throw new HttpsError('invalid-argument', 'Alert ID is required');
    }

    logger.info('[ServiceAlerts] Acknowledging alert', {
      alertId,
      uid: request.auth.uid,
    });

    try {
      const alertRef = db().collection(COLLECTIONS.ALERTS).doc(alertId);
      const alertDoc = await alertRef.get();

      if (!alertDoc.exists) {
        throw new HttpsError('not-found', 'Alert not found');
      }

      await alertRef.update({
        acknowledgedAt: admin.firestore.Timestamp.now(),
        acknowledgedBy: request.auth.uid,
      });

      return { success: true };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      logger.error('[ServiceAlerts] Error acknowledging alert:', error);
      throw new HttpsError('internal', 'Failed to acknowledge alert');
    }
  }
);

/**
 * Update threshold configuration for a service
 */
export const updateServiceBalanceThreshold = onCall(
  {
    region: 'europe-west3',
    cpu: 0.083,
    memory: '256MiB',
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean; threshold: ServiceBalanceThreshold }> => {
    // Authentication check
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    // Admin verification
    const isAdmin = await verifyAdminAccess(request.auth.uid);
    if (!isAdmin) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const {
      service,
      threshold,
      currency,
      alertLevel,
      notifyEmails,
      isActive,
    } = request.data as Partial<ServiceBalanceThreshold> & { service: ServiceType };

    if (!service) {
      throw new HttpsError('invalid-argument', 'Service is required');
    }

    const validServices: ServiceType[] = ['twilio', 'stripe', 'openai', 'anthropic', 'perplexity'];
    if (!validServices.includes(service)) {
      throw new HttpsError('invalid-argument', `Invalid service. Must be one of: ${validServices.join(', ')}`);
    }

    logger.info('[ServiceAlerts] Updating threshold', {
      service,
      threshold,
      uid: request.auth.uid,
    });

    try {
      const thresholdRef = db().collection(COLLECTIONS.THRESHOLDS).doc(service);
      const existingDoc = await thresholdRef.get();

      const now = admin.firestore.Timestamp.now();
      const defaults = DEFAULT_THRESHOLDS[service];

      const thresholdData: ServiceBalanceThreshold = {
        service,
        threshold: threshold ?? existingDoc.data()?.threshold ?? defaults.threshold,
        currency: currency ?? existingDoc.data()?.currency ?? defaults.currency,
        alertLevel: alertLevel ?? existingDoc.data()?.alertLevel ?? 'warning',
        notifyEmails: notifyEmails ?? existingDoc.data()?.notifyEmails ?? [],
        isActive: isActive ?? existingDoc.data()?.isActive ?? true,
        createdAt: existingDoc.exists ? existingDoc.data()?.createdAt : now,
        updatedAt: now,
      };

      await thresholdRef.set(thresholdData);

      // Log the change
      await db().collection('admin_actions_log').add({
        action: 'update_service_threshold',
        adminId: request.auth.uid,
        service,
        oldValue: existingDoc.exists ? existingDoc.data() : null,
        newValue: thresholdData,
        timestamp: now,
      });

      return { success: true, threshold: thresholdData };
    } catch (error) {
      logger.error('[ServiceAlerts] Error updating threshold:', error);
      throw new HttpsError('internal', 'Failed to update threshold');
    }
  }
);

/**
 * Get all threshold configurations
 */
export const getServiceBalanceThresholds = onCall(
  {
    region: 'europe-west3',
    cpu: 0.083,
    memory: '256MiB',
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ thresholds: ServiceBalanceThreshold[] }> => {
    // Authentication check
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    // Admin verification
    const isAdmin = await verifyAdminAccess(request.auth.uid);
    if (!isAdmin) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    logger.info('[ServiceAlerts] Fetching thresholds', {
      uid: request.auth.uid,
    });

    try {
      const snapshot = await db().collection(COLLECTIONS.THRESHOLDS).get();

      const services: ServiceType[] = ['twilio', 'stripe', 'openai', 'anthropic', 'perplexity'];
      const thresholds: ServiceBalanceThreshold[] = [];

      // Build response with defaults for missing services
      for (const service of services) {
        const doc = snapshot.docs.find((d) => d.id === service);

        if (doc) {
          thresholds.push(doc.data() as ServiceBalanceThreshold);
        } else {
          // Return default config for services without explicit config
          const defaults = DEFAULT_THRESHOLDS[service];
          thresholds.push({
            service,
            threshold: defaults.threshold,
            currency: defaults.currency,
            alertLevel: 'warning',
            notifyEmails: [],
            isActive: true,
            createdAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now(),
          });
        }
      }

      return { thresholds };
    } catch (error) {
      logger.error('[ServiceAlerts] Error fetching thresholds:', error);
      throw new HttpsError('internal', 'Failed to fetch thresholds');
    }
  }
);

/**
 * Manually trigger a balance check (for testing or immediate checks)
 */
export const triggerServiceBalanceCheck = onCall(
  {
    region: 'europe-west3',
    cpu: 0.083,
    memory: '512MiB',
    timeoutSeconds: 120,
    cors: ALLOWED_ORIGINS,
    secrets: [
      TWILIO_ACCOUNT_SID_SECRET,
      TWILIO_AUTH_TOKEN_SECRET,
      STRIPE_SECRET_KEY_LIVE,
      STRIPE_SECRET_KEY_TEST,
      OPENAI_API_KEY,
    ],
  },
  async (request): Promise<{ results: CheckResult[] }> => {
    // Authentication check
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    // Admin verification
    const isAdmin = await verifyAdminAccess(request.auth.uid);
    if (!isAdmin) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    logger.info('[ServiceAlerts] Manual balance check triggered', {
      uid: request.auth.uid,
    });

    const services: ServiceType[] = ['twilio', 'stripe', 'openai', 'anthropic', 'perplexity'];
    const results: CheckResult[] = [];

    for (const service of services) {
      const result = await checkServiceAndAlert(service);
      results.push(result);
    }

    // Log the manual trigger
    await db().collection('admin_actions_log').add({
      action: 'manual_balance_check',
      adminId: request.auth.uid,
      results: results.map((r) => ({
        service: r.service,
        balance: r.balance,
        threshold: r.threshold,
        alertTriggered: r.alertTriggered,
      })),
      timestamp: admin.firestore.Timestamp.now(),
    });

    return { results };
  }
);
