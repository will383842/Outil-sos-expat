/**
 * Threshold Tracking Cloud Functions
 * Exports all threshold-related functions
 */

import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

import {
  updateThresholdTracking,
  getAllThresholdTrackings,
  getThresholdTrackingByCountry,
  markThresholdAsRegistered,
  acknowledgeAlert,
  getRecentAlerts,
  recalculateRollingThresholds,
  getOrCreateThresholdTracking,
} from './thresholdService';

import {
  THRESHOLD_CONFIGS,
  determineThresholdCountry,
  CustomerType,
} from './types';

const db = getFirestore();

// ============================================================================
// CONFIGURATION
// ============================================================================

const REGION = 'europe-west3';

const standardConfig = {
  region: REGION,
  memory: '256MiB' as const,
  cpu: 0.25,
  maxInstances: 10,
};

const scheduledConfig = {
  region: REGION,
  memory: '512MiB' as const,
  cpu: 0.5,
  maxInstances: 1,
  timeoutSeconds: 300,
};

// ============================================================================
// TRIGGER: ON PAYMENT CREATED/UPDATED
// ============================================================================

/**
 * Trigger on payment creation to update threshold tracking
 */
export const thresholdOnPaymentCreate = onDocumentCreated(
  {
    document: 'payments/{paymentId}',
    ...standardConfig,
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      console.log('[ThresholdTrigger] No data in payment document');
      return;
    }

    const paymentData = snapshot.data();
    const paymentId = event.params.paymentId;

    // Only process successful payments
    const status = paymentData.status as string;
    if (!['succeeded', 'captured', 'paid'].includes(status)) {
      console.log(`[ThresholdTrigger] Skipping payment ${paymentId} with status: ${status}`);
      return;
    }

    await processPaymentForThreshold(paymentId, paymentData);
  }
);

/**
 * Trigger on payment update (for status changes)
 */
export const thresholdOnPaymentUpdate = onDocumentUpdated(
  {
    document: 'payments/{paymentId}',
    ...standardConfig,
  },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();

    if (!before || !after) {
      return;
    }

    const paymentId = event.params.paymentId;
    const statusBefore = before.status as string;
    const statusAfter = after.status as string;

    // Only process if status changed to a successful state
    const successStates = ['succeeded', 'captured', 'paid'];
    if (!successStates.includes(statusBefore) && successStates.includes(statusAfter)) {
      console.log(`[ThresholdTrigger] Payment ${paymentId} became successful`);
      await processPaymentForThreshold(paymentId, after);
    }
  }
);

/**
 * Process a payment for threshold tracking
 */
async function processPaymentForThreshold(
  paymentId: string,
  paymentData: FirebaseFirestore.DocumentData
): Promise<void> {
  try {
    // Extract payment details
    const amount = paymentData.amount || paymentData.totalAmount || 0;
    const currency = (paymentData.currency || 'EUR').toUpperCase();
    const clientId = paymentData.clientId;

    if (!clientId || amount <= 0) {
      console.log(`[ThresholdTrigger] Invalid payment data for ${paymentId}`);
      return;
    }

    // Get client country
    let customerCountry = paymentData.clientCountry || paymentData.country;

    if (!customerCountry && clientId) {
      // Fetch from users collection
      const userDoc = await db.collection('users').doc(clientId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        customerCountry = userData?.country || userData?.currentCountry;
      }
    }

    if (!customerCountry) {
      console.log(`[ThresholdTrigger] No country found for client ${clientId}`);
      return;
    }

    // Normalize country code
    customerCountry = normalizeCountryCode(customerCountry);

    // Determine customer type (B2C by default for SOS-Expat consumers)
    let customerType: CustomerType = 'B2C';
    let hasVatNumber = false;

    // Check if client has VAT number (B2B)
    if (clientId) {
      const userDoc = await db.collection('users').doc(clientId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData?.vatNumber || userData?.companyVatNumber) {
          customerType = 'B2B';
          hasVatNumber = true;
        }
      }
    }

    // Check if this payment affects any threshold
    const thresholdCountry = determineThresholdCountry(customerCountry);
    if (!thresholdCountry) {
      console.log(`[ThresholdTrigger] No threshold applies for ${customerCountry}`);
      return;
    }

    // Convert amount to cents if needed
    const amountValue = typeof amount === 'number' ? amount : parseFloat(amount);
    const normalizedAmount = amountValue > 1000 ? amountValue / 100 : amountValue;

    // Update threshold tracking
    const result = await updateThresholdTracking({
      transactionId: paymentId,
      amount: normalizedAmount,
      currency,
      customerCountry,
      customerType,
      transactionDate: paymentData.createdAt?.toDate?.() || new Date(),
      hasVatNumber,
    });

    if (result) {
      console.log(`[ThresholdTrigger] Threshold updated:`, {
        paymentId,
        country: result.countryCode,
        status: result.newStatus,
        percentage: result.percentageUsed.toFixed(1),
        alertTriggered: result.alertTriggered,
      });

      // If blocking is needed, update the payment
      if (result.shouldBlock) {
        await db.collection('payments').doc(paymentId).update({
          thresholdBlocked: true,
          thresholdBlockedReason: result.message,
          updatedAt: Timestamp.now(),
        });
      }
    }
  } catch (error) {
    console.error(`[ThresholdTrigger] Error processing payment ${paymentId}:`, error);
  }
}

// ============================================================================
// SCHEDULED: DAILY THRESHOLD CHECK
// ============================================================================

/**
 * Daily scheduled function to check all thresholds
 * Runs at 6:00 AM Europe/Paris
 */
export const checkThresholdsDaily = onSchedule(
  {
    schedule: '0 6 * * *',
    timeZone: 'Europe/Paris',
    ...scheduledConfig,
  },
  async () => {
    console.log('[ThresholdScheduled] Starting daily threshold check...');

    try {
      // Recalculate rolling thresholds
      await recalculateRollingThresholds();

      // Get all current trackings
      const trackings = await getAllThresholdTrackings();

      // Log summary
      const summary = {
        total: trackings.length,
        safe: trackings.filter(t => t.status === 'SAFE').length,
        warning70: trackings.filter(t => t.status === 'WARNING_70').length,
        warning90: trackings.filter(t => t.status === 'WARNING_90').length,
        exceeded: trackings.filter(t => t.status === 'EXCEEDED').length,
        registered: trackings.filter(t => t.status === 'REGISTERED').length,
      };

      console.log('[ThresholdScheduled] Daily check complete:', summary);

      // Store summary for dashboard
      await db.collection('threshold_daily_summaries').add({
        ...summary,
        timestamp: Timestamp.now(),
        trackings: trackings.map(t => ({
          countryCode: t.countryCode,
          status: t.status,
          percentageUsed: t.percentageUsed,
          currentAmount: t.currentAmount,
          thresholdAmount: t.thresholdAmount,
          currency: t.thresholdCurrency,
        })),
      });
    } catch (error) {
      console.error('[ThresholdScheduled] Error in daily check:', error);
      throw error;
    }
  }
);

/**
 * Weekly scheduled function to send summary email to FINANCE_ADMIN
 * Runs every Monday at 9:00 AM Europe/Paris
 */
export const sendWeeklyThresholdReport = onSchedule(
  {
    schedule: '0 9 * * 1',
    timeZone: 'Europe/Paris',
    ...scheduledConfig,
  },
  async () => {
    console.log('[ThresholdScheduled] Generating weekly threshold report...');

    try {
      const trackings = await getAllThresholdTrackings();
      const alerts = await getRecentAlerts(7);

      // Get finance admins
      const adminsSnapshot = await db.collection('users')
        .where('role', '==', 'FINANCE_ADMIN')
        .get();

      const adminEmails = adminsSnapshot.docs
        .map(doc => doc.data().email)
        .filter(Boolean);

      if (adminEmails.length === 0) {
        console.log('[ThresholdScheduled] No FINANCE_ADMIN found, skipping email');
        return;
      }

      // Generate email content
      const criticalThresholds = trackings.filter(
        t => t.status === 'WARNING_90' || t.status === 'EXCEEDED'
      );

      const emailData = {
        template: 'threshold_weekly_report',
        to: adminEmails,
        data: {
          totalTracked: trackings.length,
          criticalCount: criticalThresholds.length,
          alertsThisWeek: alerts.length,
          thresholds: trackings.map(t => ({
            country: t.countryName,
            flag: getCountryFlag(t.countryCode),
            status: t.status,
            percentage: t.percentageUsed.toFixed(1),
            current: formatCurrency(t.currentAmount, t.thresholdCurrency),
            threshold: formatCurrency(t.thresholdAmount, t.thresholdCurrency),
          })),
          criticalThresholds: criticalThresholds.map(t => ({
            country: t.countryName,
            flag: getCountryFlag(t.countryCode),
            percentage: t.percentageUsed.toFixed(1),
            action: THRESHOLD_CONFIGS.find(c => c.countryCode === t.countryCode)?.consequence || '',
          })),
        },
      };

      // Store email request for the notification pipeline
      await db.collection('email_queue').add({
        ...emailData,
        createdAt: Timestamp.now(),
        status: 'pending',
      });

      console.log('[ThresholdScheduled] Weekly report queued for', adminEmails.length, 'admins');
    } catch (error) {
      console.error('[ThresholdScheduled] Error generating weekly report:', error);
      throw error;
    }
  }
);

// ============================================================================
// CALLABLE FUNCTIONS FOR ADMIN DASHBOARD
// ============================================================================

/**
 * Get all threshold trackings for dashboard
 */
export const getThresholdDashboard = onCall(
  {
    ...standardConfig,
  },
  async (request) => {
    // Verify admin access
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    // Check for admin role
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const userData = userDoc.data();
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'];

    if (!userData?.role || !allowedRoles.includes(userData.role)) {
      throw new HttpsError('permission-denied', 'Finance admin access required');
    }

    try {
      const trackings = await getAllThresholdTrackings();
      const alerts = await getRecentAlerts(30);

      // Calculate summary
      const summary = {
        totalTracked: trackings.length,
        safeCount: trackings.filter(t => t.status === 'SAFE').length,
        warningCount: trackings.filter(t => t.status === 'WARNING_70' || t.status === 'WARNING_90').length,
        exceededCount: trackings.filter(t => t.status === 'EXCEEDED').length,
        registeredCount: trackings.filter(t => t.status === 'REGISTERED').length,
        criticalThresholds: trackings.filter(t => t.status === 'WARNING_90' || t.status === 'EXCEEDED'),
        recentAlerts: alerts,
        totalRevenueEUR: trackings.reduce((sum, t) => sum + t.currentAmountEUR, 0),
      };

      return {
        success: true,
        data: {
          trackings,
          summary,
          configs: THRESHOLD_CONFIGS,
        },
      };
    } catch (error) {
      console.error('[getThresholdDashboard] Error:', error);
      throw new HttpsError('internal', 'Failed to fetch threshold data');
    }
  }
);

/**
 * Get threshold tracking for a specific country
 */
export const getCountryThreshold = onCall(
  {
    ...standardConfig,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const { countryCode } = request.data;

    if (!countryCode) {
      throw new HttpsError('invalid-argument', 'Country code required');
    }

    try {
      const tracking = await getThresholdTrackingByCountry(countryCode);
      const config = THRESHOLD_CONFIGS.find(c => c.countryCode === countryCode);

      return {
        success: true,
        data: {
          tracking,
          config,
        },
      };
    } catch (error) {
      console.error('[getCountryThreshold] Error:', error);
      throw new HttpsError('internal', 'Failed to fetch country threshold');
    }
  }
);

/**
 * Mark a country as registered for tax
 */
export const markCountryAsRegistered = onCall(
  {
    ...standardConfig,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    // Verify FINANCE_ADMIN role
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const userData = userDoc.data();

    if (!userData?.role || !['SUPER_ADMIN', 'FINANCE_ADMIN'].includes(userData.role)) {
      throw new HttpsError('permission-denied', 'Finance admin access required');
    }

    const { countryCode, registrationNumber } = request.data;

    if (!countryCode || !registrationNumber) {
      throw new HttpsError('invalid-argument', 'Country code and registration number required');
    }

    try {
      await markThresholdAsRegistered({
        countryCode,
        registrationNumber,
        adminId: request.auth.uid,
      });

      return {
        success: true,
        message: `${countryCode} marked as registered`,
      };
    } catch (error) {
      console.error('[markCountryAsRegistered] Error:', error);
      throw new HttpsError('internal', 'Failed to mark country as registered');
    }
  }
);

/**
 * Acknowledge a threshold alert
 */
export const acknowledgeThresholdAlert = onCall(
  {
    ...standardConfig,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const { alertId, notes } = request.data;

    if (!alertId) {
      throw new HttpsError('invalid-argument', 'Alert ID required');
    }

    try {
      await acknowledgeAlert({
        alertId,
        adminId: request.auth.uid,
        notes,
      });

      return {
        success: true,
        message: 'Alert acknowledged',
      };
    } catch (error) {
      console.error('[acknowledgeThresholdAlert] Error:', error);
      throw new HttpsError('internal', 'Failed to acknowledge alert');
    }
  }
);

/**
 * Initialize threshold tracking for all configured countries
 */
export const initializeThresholdTracking = onCall(
  {
    ...standardConfig,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    // Verify SUPER_ADMIN role
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const userData = userDoc.data();

    if (userData?.role !== 'SUPER_ADMIN') {
      throw new HttpsError('permission-denied', 'Super admin access required');
    }

    try {
      const results = [];

      for (const config of THRESHOLD_CONFIGS) {
        const tracking = await getOrCreateThresholdTracking(config.countryCode);
        results.push({
          countryCode: config.countryCode,
          created: tracking !== null,
        });
      }

      return {
        success: true,
        data: results,
      };
    } catch (error) {
      console.error('[initializeThresholdTracking] Error:', error);
      throw new HttpsError('internal', 'Failed to initialize threshold tracking');
    }
  }
);

/**
 * Manually trigger threshold recalculation
 */
export const triggerThresholdRecalculation = onCall(
  {
    ...standardConfig,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    // Verify admin role
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const userData = userDoc.data();
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'];

    if (!userData?.role || !allowedRoles.includes(userData.role)) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    try {
      await recalculateRollingThresholds();

      return {
        success: true,
        message: 'Threshold recalculation triggered',
      };
    } catch (error) {
      console.error('[triggerThresholdRecalculation] Error:', error);
      throw new HttpsError('internal', 'Failed to trigger recalculation');
    }
  }
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function normalizeCountryCode(country: string): string {
  // Map common country names to ISO codes
  const countryMap: Record<string, string> = {
    'france': 'FR',
    'germany': 'DE',
    'allemagne': 'DE',
    'united kingdom': 'GB',
    'royaume-uni': 'GB',
    'uk': 'GB',
    'switzerland': 'CH',
    'suisse': 'CH',
    'australia': 'AU',
    'australie': 'AU',
    'japan': 'JP',
    'japon': 'JP',
    'singapore': 'SG',
    'singapour': 'SG',
    'india': 'IN',
    'inde': 'IN',
    'canada': 'CA',
    'south korea': 'KR',
    'coree du sud': 'KR',
    'mexico': 'MX',
    'mexique': 'MX',
    'united states': 'US',
    'etats-unis': 'US',
    'usa': 'US',
    'spain': 'ES',
    'espagne': 'ES',
    'italy': 'IT',
    'italie': 'IT',
    'netherlands': 'NL',
    'pays-bas': 'NL',
    'belgium': 'BE',
    'belgique': 'BE',
    'austria': 'AT',
    'autriche': 'AT',
    'portugal': 'PT',
    'ireland': 'IE',
    'irlande': 'IE',
    'poland': 'PL',
    'pologne': 'PL',
    'sweden': 'SE',
    'suede': 'SE',
    'denmark': 'DK',
    'danemark': 'DK',
    'finland': 'FI',
    'finlande': 'FI',
    'norway': 'NO',
    'norvege': 'NO',
  };

  const normalized = country.toLowerCase().trim();
  return countryMap[normalized] || country.toUpperCase().substring(0, 2);
}

function getCountryFlag(countryCode: string): string {
  const flags: Record<string, string> = {
    OSS_EU: '🇪🇺',
    GB: '🇬🇧',
    CH: '🇨🇭',
    AU: '🇦🇺',
    JP: '🇯🇵',
    SG: '🇸🇬',
    IN: '🇮🇳',
    CA: '🇨🇦',
    KR: '🇰🇷',
    MX: '🇲🇽',
    US: '🇺🇸',
  };
  return flags[countryCode] || '🏳️';
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
