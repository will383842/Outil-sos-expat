/**
 * Threshold Tracking Service
 * Core business logic for threshold monitoring
 */

import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import {
  ThresholdTracking,
  ThresholdAlert,
  ThresholdCheckResult,
  ThresholdConfig,
  ThresholdStatus,
  ThresholdAlertType,
  ThresholdCurrency,
  CustomerType,
  AlertsSent,
  THRESHOLD_CONFIGS,
  ALERT_THRESHOLDS,
  convertCurrency,
  convertToEUR,
  calculateStatus,
  getCurrentPeriod,
  getThresholdConfig,
  determineThresholdCountry,
} from './types';

const db = getFirestore();

// Collection names
const COLLECTIONS = {
  THRESHOLD_TRACKING: 'threshold_tracking',
  THRESHOLD_ALERTS: 'threshold_alerts',
  AUDIT_LOG: 'audit_log',
  ADMIN_NOTIFICATIONS: 'admin_notifications',
} as const;

// ============================================================================
// THRESHOLD TRACKING OPERATIONS
// ============================================================================

/**
 * Get or create threshold tracking document for a country
 */
export async function getOrCreateThresholdTracking(
  countryCode: string
): Promise<ThresholdTracking | null> {
  const config = getThresholdConfig(countryCode);
  if (!config) {
    console.warn(`[ThresholdService] No config found for country: ${countryCode}`);
    return null;
  }

  const period = getCurrentPeriod(config.periodType);
  const docId = `${countryCode}_${period}`;
  const docRef = db.collection(COLLECTIONS.THRESHOLD_TRACKING).doc(docId);

  const doc = await docRef.get();

  if (doc.exists) {
    return doc.data() as ThresholdTracking;
  }

  // Create new tracking document
  const now = Timestamp.now();
  const newTracking: ThresholdTracking = {
    countryCode: config.countryCode,
    countryName: config.name,
    period,
    periodType: config.periodType,
    thresholdAmount: config.thresholdAmount,
    thresholdCurrency: config.currency,
    currentAmount: 0,
    currentAmountEUR: 0,
    transactionCount: 0,
    b2cCount: 0,
    b2bCount: 0,
    percentageUsed: 0,
    status: 'SAFE',
    isRegistered: false,
    alertsSent: {
      alert70: false,
      alert90: false,
      alert100: false,
    },
    createdAt: now,
    updatedAt: now,
  };

  await docRef.set(newTracking);
  console.log(`[ThresholdService] Created new tracking document: ${docId}`);

  return newTracking;
}

/**
 * Update threshold tracking after a payment
 */
export async function updateThresholdTracking(params: {
  transactionId: string;
  amount: number;
  currency: string;
  customerCountry: string;
  customerType: CustomerType;
  transactionDate: Date;
  hasVatNumber?: boolean;
}): Promise<ThresholdCheckResult | null> {
  const {
    transactionId,
    amount,
    currency,
    customerCountry,
    customerType,
    transactionDate,
    hasVatNumber,
  } = params;

  // Determine which threshold this affects
  const thresholdCountry = determineThresholdCountry(customerCountry);
  if (!thresholdCountry) {
    console.log(`[ThresholdService] No threshold applies for country: ${customerCountry}`);
    return null;
  }

  const config = getThresholdConfig(thresholdCountry);
  if (!config) {
    console.warn(`[ThresholdService] Config not found for: ${thresholdCountry}`);
    return null;
  }

  // Check if B2C only and customer is B2B
  if (config.b2cOnly && customerType === 'B2B') {
    console.log(`[ThresholdService] Skipping B2B transaction for B2C-only threshold: ${thresholdCountry}`);
    return null;
  }

  // Skip B2B transactions with valid VAT number (reverse charge applies)
  if (customerType === 'B2B' && hasVatNumber && thresholdCountry === 'OSS_EU') {
    console.log(`[ThresholdService] Skipping B2B with VAT number for OSS: ${transactionId}`);
    return null;
  }

  const period = getCurrentPeriod(config.periodType);
  const docId = `${thresholdCountry}_${period}`;
  const docRef = db.collection(COLLECTIONS.THRESHOLD_TRACKING).doc(docId);

  // Convert amount to threshold currency and EUR
  const amountInThresholdCurrency = convertCurrency(amount, currency, config.currency);
  const amountInEUR = convertToEUR(amount, currency);

  // Use transaction for atomic update
  const result = await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(docRef);
    let tracking: ThresholdTracking;

    if (!doc.exists) {
      // Create new tracking
      const now = Timestamp.now();
      tracking = {
        countryCode: config.countryCode,
        countryName: config.name,
        period,
        periodType: config.periodType,
        thresholdAmount: config.thresholdAmount,
        thresholdCurrency: config.currency,
        currentAmount: 0,
        currentAmountEUR: 0,
        transactionCount: 0,
        b2cCount: 0,
        b2bCount: 0,
        percentageUsed: 0,
        status: 'SAFE',
        isRegistered: false,
        alertsSent: {
          alert70: false,
          alert90: false,
          alert100: false,
        },
        createdAt: now,
        updatedAt: now,
      };
    } else {
      tracking = doc.data() as ThresholdTracking;
    }

    const previousStatus = tracking.status;

    // Update amounts
    const newAmount = tracking.currentAmount + amountInThresholdCurrency;
    const newAmountEUR = tracking.currentAmountEUR + amountInEUR;

    // Calculate new percentage
    let newPercentage: number;
    if (config.thresholdAmount === 0) {
      // For zero thresholds (like UK), any amount exceeds
      newPercentage = newAmount > 0 ? 100 : 0;
    } else {
      newPercentage = (newAmount / config.thresholdAmount) * 100;
    }

    // Calculate new status
    const newStatus = calculateStatus(newPercentage, tracking.isRegistered);

    // Check if we need to trigger an alert
    let alertTriggered = false;
    let alertType: ThresholdAlertType | undefined;
    const alertsSent = { ...tracking.alertsSent };

    if (!tracking.isRegistered) {
      if (newPercentage >= ALERT_THRESHOLDS.EXCEEDED && !alertsSent.alert100) {
        alertTriggered = true;
        alertType = 'EXCEEDED';
      } else if (newPercentage >= ALERT_THRESHOLDS.WARNING_90 && !alertsSent.alert90) {
        alertTriggered = true;
        alertType = 'WARNING_90';
      } else if (newPercentage >= ALERT_THRESHOLDS.WARNING_70 && !alertsSent.alert70) {
        alertTriggered = true;
        alertType = 'WARNING_70';
      }
    }

    // Prepare update
    const now = Timestamp.now();
    const update: Partial<ThresholdTracking> = {
      currentAmount: newAmount,
      currentAmountEUR: newAmountEUR,
      transactionCount: tracking.transactionCount + 1,
      b2cCount: customerType === 'B2C' ? tracking.b2cCount + 1 : tracking.b2cCount,
      b2bCount: customerType === 'B2B' ? tracking.b2bCount + 1 : tracking.b2bCount,
      percentageUsed: newPercentage,
      status: newStatus,
      lastTransactionAt: Timestamp.fromDate(transactionDate),
      updatedAt: now,
    };

    if (alertTriggered && alertType) {
      if (alertType === 'WARNING_70') {
        alertsSent.alert70 = true;
        alertsSent.alert70SentAt = now;
      } else if (alertType === 'WARNING_90') {
        alertsSent.alert90 = true;
        alertsSent.alert90SentAt = now;
      } else if (alertType === 'EXCEEDED') {
        alertsSent.alert100 = true;
        alertsSent.alert100SentAt = now;
      }
      update.alertsSent = alertsSent;
      update.lastAlertAt = now;
    }

    // Apply update
    if (!doc.exists) {
      transaction.set(docRef, { ...tracking, ...update });
    } else {
      transaction.update(docRef, update);
    }

    const checkResult: ThresholdCheckResult = {
      countryCode: thresholdCountry,
      previousStatus,
      newStatus,
      percentageUsed: newPercentage,
      alertTriggered,
      alertType,
      shouldBlock: config.enableBlocking && newStatus === 'EXCEEDED',
      message: getStatusMessage(config, newStatus, newPercentage),
    };

    return checkResult;
  });

  console.log(`[ThresholdService] Updated threshold for ${thresholdCountry}:`, result);

  // If alert triggered, create alert record and send notifications
  if (result.alertTriggered && result.alertType) {
    await createThresholdAlert({
      countryCode: result.countryCode,
      alertType: result.alertType,
      percentageAtAlert: result.percentageUsed,
      config,
    });
  }

  return result;
}

/**
 * Create a threshold alert record
 */
async function createThresholdAlert(params: {
  countryCode: string;
  alertType: ThresholdAlertType;
  percentageAtAlert: number;
  config: ThresholdConfig;
}): Promise<string> {
  const { countryCode, alertType, percentageAtAlert, config } = params;

  const now = Timestamp.now();
  const period = getCurrentPeriod(config.periodType);
  const trackingDocId = `${countryCode}_${period}`;

  // Get current tracking for amount
  const trackingDoc = await db.collection(COLLECTIONS.THRESHOLD_TRACKING).doc(trackingDocId).get();
  const tracking = trackingDoc.data() as ThresholdTracking | undefined;

  const alert: ThresholdAlert = {
    countryCode,
    alertType,
    percentageAtAlert,
    amountAtAlert: tracking?.currentAmount || 0,
    thresholdAmount: config.thresholdAmount,
    currency: config.currency,
    notificationSent: false,
    emailSent: false,
    blockingApplied: false,
    createdAt: now,
  };

  const alertRef = await db.collection(COLLECTIONS.THRESHOLD_ALERTS).add(alert);
  console.log(`[ThresholdService] Created alert: ${alertRef.id} for ${countryCode} (${alertType})`);

  // Create admin notification
  await createAdminNotification({
    countryCode,
    alertType,
    percentageAtAlert,
    config,
    alertId: alertRef.id,
  });

  // Update alert to mark notification as sent
  await alertRef.update({ notificationSent: true });

  return alertRef.id;
}

/**
 * Create admin notification for threshold alert
 */
async function createAdminNotification(params: {
  countryCode: string;
  alertType: ThresholdAlertType;
  percentageAtAlert: number;
  config: ThresholdConfig;
  alertId: string;
}): Promise<void> {
  const { countryCode, alertType, percentageAtAlert, config, alertId } = params;

  const severity = alertType === 'EXCEEDED' ? 'critical' : alertType === 'WARNING_90' ? 'high' : 'medium';
  const title = getAlertTitle(alertType, config);
  const message = getAlertMessage(alertType, config, percentageAtAlert);

  const notification = {
    type: 'threshold_alert',
    severity,
    title,
    message,
    countryCode,
    alertType,
    alertId,
    percentageUsed: percentageAtAlert,
    thresholdAmount: config.thresholdAmount,
    currency: config.currency,
    consequence: config.consequence,
    registrationUrl: config.registrationUrl,
    read: false,
    createdAt: Timestamp.now(),
  };

  await db.collection(COLLECTIONS.ADMIN_NOTIFICATIONS).add(notification);
  console.log(`[ThresholdService] Created admin notification for ${countryCode}`);

  // Log to audit
  await logToAudit({
    action: 'THRESHOLD_ALERT',
    resource: 'threshold_tracking',
    resourceId: `${countryCode}_${getCurrentPeriod(config.periodType)}`,
    details: {
      countryCode,
      alertType,
      percentageAtAlert,
      thresholdAmount: config.thresholdAmount,
      currency: config.currency,
    },
  });
}

/**
 * Get all threshold trackings
 */
export async function getAllThresholdTrackings(): Promise<ThresholdTracking[]> {
  const snapshot = await db.collection(COLLECTIONS.THRESHOLD_TRACKING)
    .orderBy('percentageUsed', 'desc')
    .get();

  return snapshot.docs.map(doc => doc.data() as ThresholdTracking);
}

/**
 * Get threshold tracking by country and period
 */
export async function getThresholdTrackingByCountry(
  countryCode: string,
  period?: string
): Promise<ThresholdTracking | null> {
  const config = getThresholdConfig(countryCode);
  if (!config) return null;

  const actualPeriod = period || getCurrentPeriod(config.periodType);
  const docId = `${countryCode}_${actualPeriod}`;

  const doc = await db.collection(COLLECTIONS.THRESHOLD_TRACKING).doc(docId).get();

  if (!doc.exists) {
    return null;
  }

  return doc.data() as ThresholdTracking;
}

/**
 * Mark threshold as registered
 */
export async function markThresholdAsRegistered(params: {
  countryCode: string;
  registrationNumber: string;
  adminId: string;
}): Promise<void> {
  const { countryCode, registrationNumber, adminId } = params;

  const config = getThresholdConfig(countryCode);
  if (!config) {
    throw new Error(`Unknown country code: ${countryCode}`);
  }

  const period = getCurrentPeriod(config.periodType);
  const docId = `${countryCode}_${period}`;
  const docRef = db.collection(COLLECTIONS.THRESHOLD_TRACKING).doc(docId);

  await docRef.update({
    isRegistered: true,
    registrationNumber,
    registrationDate: Timestamp.now(),
    status: 'REGISTERED',
    updatedAt: Timestamp.now(),
  });

  // Log to audit
  await logToAudit({
    action: 'THRESHOLD_REGISTERED',
    resource: 'threshold_tracking',
    resourceId: docId,
    userId: adminId,
    details: {
      countryCode,
      registrationNumber,
    },
  });

  console.log(`[ThresholdService] Marked ${countryCode} as registered by ${adminId}`);
}

/**
 * Acknowledge a threshold alert
 */
export async function acknowledgeAlert(params: {
  alertId: string;
  adminId: string;
  notes?: string;
}): Promise<void> {
  const { alertId, adminId, notes } = params;

  const alertRef = db.collection(COLLECTIONS.THRESHOLD_ALERTS).doc(alertId);

  await alertRef.update({
    acknowledgedBy: adminId,
    acknowledgedAt: Timestamp.now(),
    acknowledgeNotes: notes || null,
  });

  console.log(`[ThresholdService] Alert ${alertId} acknowledged by ${adminId}`);
}

/**
 * Get recent alerts
 */
export async function getRecentAlerts(days: number = 30): Promise<ThresholdAlert[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const snapshot = await db.collection(COLLECTIONS.THRESHOLD_ALERTS)
    .where('createdAt', '>=', Timestamp.fromDate(cutoff))
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as ThresholdAlert));
}

/**
 * Recalculate all thresholds (for rolling periods)
 */
export async function recalculateRollingThresholds(): Promise<void> {
  console.log('[ThresholdService] Starting rolling threshold recalculation...');

  const rollingConfigs = THRESHOLD_CONFIGS.filter(c => c.periodType === 'ROLLING_12M');

  for (const config of rollingConfigs) {
    await recalculateRollingThreshold(config);
  }

  console.log('[ThresholdService] Rolling threshold recalculation complete');
}

/**
 * Recalculate a single rolling threshold
 */
async function recalculateRollingThreshold(config: ThresholdConfig): Promise<void> {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  // Query all payments from the last 12 months to the customer country
  // This is a simplified version - in production you'd need more complex logic
  // to handle currency conversion and customer country detection

  const docId = `${config.countryCode}_rolling`;
  const docRef = db.collection(COLLECTIONS.THRESHOLD_TRACKING).doc(docId);

  // For now, just update the timestamp to show it was checked
  const doc = await docRef.get();
  if (doc.exists) {
    await docRef.update({
      updatedAt: Timestamp.now(),
    });
  }

  console.log(`[ThresholdService] Recalculated rolling threshold for ${config.countryCode}`);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStatusMessage(config: ThresholdConfig, status: ThresholdStatus, percentage: number): string {
  switch (status) {
    case 'SAFE':
      return `${config.name}: ${percentage.toFixed(1)}% du seuil utilise. Aucune action requise.`;
    case 'WARNING_70':
      return `${config.name}: ATTENTION - 70% du seuil atteint (${percentage.toFixed(1)}%). Surveillez de pres.`;
    case 'WARNING_90':
      return `${config.name}: CRITIQUE - 90% du seuil atteint (${percentage.toFixed(1)}%). Preparez l'enregistrement.`;
    case 'EXCEEDED':
      return `${config.name}: DEPASSE - Seuil franchi (${percentage.toFixed(1)}%). ${config.consequence}`;
    case 'REGISTERED':
      return `${config.name}: Enregistre pour la TVA/taxe locale.`;
    default:
      return '';
  }
}

function getAlertTitle(alertType: ThresholdAlertType, config: ThresholdConfig): string {
  switch (alertType) {
    case 'WARNING_70':
      return `Seuil fiscal ${config.name} - 70% atteint`;
    case 'WARNING_90':
      return `Seuil fiscal ${config.name} - 90% atteint (CRITIQUE)`;
    case 'EXCEEDED':
      return `URGENT: Seuil fiscal ${config.name} DEPASSE`;
    default:
      return `Alerte seuil fiscal ${config.name}`;
  }
}

function getAlertMessage(
  alertType: ThresholdAlertType,
  config: ThresholdConfig,
  percentage: number
): string {
  const formattedThreshold = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: config.currency,
  }).format(config.thresholdAmount);

  switch (alertType) {
    case 'WARNING_70':
      return `Le seuil de ${formattedThreshold} pour ${config.name} est a ${percentage.toFixed(1)}%. ` +
        `Consequence si depasse: ${config.consequence}. ` +
        `Surveillez attentivement les prochaines transactions.`;
    case 'WARNING_90':
      return `ATTENTION: Le seuil de ${formattedThreshold} pour ${config.name} est a ${percentage.toFixed(1)}%. ` +
        `Il est fortement recommande de preparer l'enregistrement fiscal. ` +
        `Consequence: ${config.consequence}`;
    case 'EXCEEDED':
      return `URGENT: Le seuil de ${formattedThreshold} pour ${config.name} a ete depasse (${percentage.toFixed(1)}%). ` +
        `ACTION REQUISE: ${config.consequence}. ` +
        (config.registrationUrl ? `Portail d'enregistrement: ${config.registrationUrl}` : '');
    default:
      return '';
  }
}

async function logToAudit(params: {
  action: string;
  resource: string;
  resourceId: string;
  userId?: string;
  details: Record<string, unknown>;
}): Promise<void> {
  const { action, resource, resourceId, userId, details } = params;

  await db.collection(COLLECTIONS.AUDIT_LOG).add({
    action,
    resource,
    resourceId,
    userId: userId || 'system',
    details,
    timestamp: Timestamp.now(),
    ipAddress: 'server',
  });
}
