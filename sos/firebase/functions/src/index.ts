/* eslint-disable @typescript-eslint/no-explicit-any */

// ====== FORCE REDEPLOY 2026-01-15 - AMD pending fix ======

// ====== P1-4: SENTRY (lazy initialization - called in functions, not at module load) ======
// Usage: import { initSentry, captureError } from "./config/sentry"; initSentry();

// ====== ULTRA DEBUG (lazy - avoid deployment timeout) ======
import {
  ultraLogger,
  traceFunction,
} from "./utils/ultraDebugLogger";
// P1-13: Sync atomique payments <-> call_sessions
import { syncPaymentStatus, findCallSessionByPaymentId } from "./utils/paymentSync";
// 🔒 Phone number decryption for notifications
import { decryptPhoneNumber } from "./utils/encryption";

// === CPU/MEM CONFIGS to control vCPU usage ===
const emergencyConfig = {
  region: "europe-west1",
  memory: "256MiB" as const,
  cpu: 0.25,
  maxInstances: 3,
  minInstances: 0,
  concurrency: 1,
};

// ====== CONFIGURATION GLOBALE CENTRALISÉE ======
import { setGlobalOptions } from "firebase-functions/v2";

// P0 FIX: Import ALL secrets from centralized secrets.ts
// NEVER call defineSecret() in this file - it causes credential conflicts!
import {
  EMAIL_USER,
  EMAIL_PASS,
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER,
  STRIPE_SECRET_KEY_TEST,
  STRIPE_SECRET_KEY_LIVE,
  ENCRYPTION_KEY,
  TASKS_AUTH_SECRET,
  OUTIL_API_KEY,
  OUTIL_SYNC_API_KEY,
} from "./lib/secrets";

// Re-export for backwards compatibility
export {
  EMAIL_USER,
  EMAIL_PASS,
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER,
  STRIPE_SECRET_KEY_TEST,
  STRIPE_SECRET_KEY_LIVE,
  ENCRYPTION_KEY,
};

// Meta Conversions API (CAPI) - for Facebook Ads attribution
import { trackStripePurchase, META_CAPI_TOKEN } from "./metaConversionsApi";

// SUBSCRIPTION WEBHOOK HANDLERS - Option A: Single webhook endpoint for all Stripe events
import {
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleSubscriptionPaused,
  handleSubscriptionResumed,
  handleTrialWillEnd,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
  handleInvoicePaymentActionRequired,
  handleInvoiceCreated,
  handlePaymentMethodUpdated,
} from "./subscription/webhooks";
import { addToDeadLetterQueue } from "./subscription/deadLetterQueue";

// MAILWIZZ_API_KEY and MAILWIZZ_WEBHOOK_SECRET are now static values from config.ts

// Multi-Dashboard authentication & AI generation
export { validateDashboardPassword } from "./multiDashboard/validateDashboardPassword";
export { onBookingRequestCreatedGenerateAi } from "./multiDashboard/onBookingRequestCreatedGenerateAi";

// kyc
export { createLawyerStripeAccount } from "./createLawyerAccount";
export { createStripeAccount } from "./createStripeAccount";
export { getStripeAccountSession } from "./getAccountSession";
export { checkStripeAccountStatus } from "./checkStripeAccountStatus";

// backup - Manual backup (admin-triggered)
export { createManualBackup } from "./manualBackup";
// REMOVED: scheduledBackup - replaced by morningBackup (multi-frequency system)

// backup - Multi-frequency (daily for better RPO)
export {
  morningBackup,
  cleanupOldBackups,
} from "./scheduled/multiFrequencyBackup";

// backup - Cross-region DR
export {
  dailyCrossRegionBackup,
  cleanupDRBackups,
} from "./scheduled/crossRegionBackup";

// backup - Quarterly restore test
export {
  quarterlyRestoreTest,
  runRestoreTestManual,
  listRestoreTestReports,
} from "./scheduled/quarterlyRestoreTest";

// backup - Storage to DR (photos, documents, invoices)
export { backupStorageToDR } from "./scheduled/backupStorageToDR";

// backup - Admin restore functions (callable from admin console)
export {
  adminListBackups,
  adminPreviewRestore,
  adminRestoreFirestore,
  adminRestoreAuth,
  adminCheckRestoreStatus,
  adminCreateManualBackup,
  adminDeleteBackup,
  adminListGcpBackups,
} from "./admin/backupRestoreAdmin";

// backup - Isolated Gen2 function for faster cold start
export { adminGetRestoreConfirmationCode } from "./admin/restoreConfirmationCode";

// P2-3 FIX: GDPR Recording Cleanup - SUPPRIME (recording desactive pour RGPD)
// Les fonctions rgpdRecordingCleanup et triggerRgpdCleanup ont ete supprimees
// car l'enregistrement des appels est desactive (commit 12a83a9)

// P2-1/3/13 FIX: Payment data cleanup (locks, expired orders, archiving)
export { paymentDataCleanup } from "./scheduled/paymentDataCleanup";

// P0-2 FIX: Stuck payments recovery (requires_capture > 10min)
export {
  stuckPaymentsRecovery,
  triggerStuckPaymentsRecovery,
} from "./scheduled/stuckPaymentsRecovery";

// P1-6 FIX: Notification retry mechanism
export {
  notificationRetry,
  triggerNotificationRetry,
  retrySpecificDelivery,
  getDLQStats,
} from "./scheduled/notificationRetry";

// ESCROW SAFEGUARDS: Daily monitoring of pending_transfers & failed_payouts
// - Alerts if escrow > 1000€
// - KYC reminders (D+1, D+7, D+30, D+90)
// - Auto-refund after 6 months without KYC
// - Stripe balance check
export { escrowMonitoringDaily } from "./scheduled/escrowMonitoring";

// Budget Alert Notifications - Email alerts when costs exceed thresholds
// - Warning email at 80% of budget
// - Urgent email at 100% of budget
export {
  checkBudgetAlertsScheduled,
  triggerBudgetAlertCheck,
  checkSingleServiceBudget,
} from "./scheduled/budgetAlertNotifications";

// P0-3 FIX: Invoice creation trigger and distributed lock
export {
  onInvoiceRecordCreated,
  acquireInvoiceLock,
  releaseInvoiceLock,
  checkInvoicesExist,
} from "./triggers/onInvoiceCreated";

// Dispute handling
import {
  handleDisputeCreated,
  handleDisputeUpdated,
  handleDisputeClosed,
} from "./DisputeManager";

// P0 FIX: Export admin dispute functions
export {
  adminAddDisputeNote,
  adminAcknowledgeDispute,
  adminAssignDispute,
  adminGetDisputeDetails,
} from "./DisputeManager";

// KYC Reminders (Stripe)
export {
  scheduledKYCReminders,
  triggerKYCReminders,
  getKYCReminderStatus,
} from "./KYCReminderManager";

// SEO Domain Authority (SEO Review Tools API)
export {
  getDomainAuthority,
  addManualDomainAuthority,
} from "./seo/domainAuthority";

// Unclaimed Funds Processing (180 days forfeiture - CGV Article 8.6-8.9)
export {
  scheduledProcessUnclaimedFunds,
  UNCLAIMED_FUNDS_CONFIG,
} from "./scheduled/processUnclaimedFunds";

// PayPal Onboarding Reminders
export {
  scheduledPayPalReminders,
  triggerPayPalReminders,
  getPayPalReminderStatus,
  PayPalReminderManager,
  PAYPAL_REMINDER_CONFIG,
  onPayPalConnected,
} from "./PayPalReminderManager";

// PayPal Email Verification (code-based verification)
export {
  sendPayPalVerificationCode,
  verifyPayPalCode,
  resendPayPalVerificationCode,
} from "./paypal/emailVerification";

// KYC Templates Seed
// DISABLED 2026-01-30: One-time seed functions - removed to free Cloud Run quota
// export { initKYCReminderTemplates } from "./seeds/kycReminderTemplates";

// Unclaimed Funds Templates Seed
// DISABLED 2026-01-30: One-time seed functions - removed to free Cloud Run quota
// export { initUnclaimedFundsTemplates } from "./seeds/unclaimedFundsTemplates";

// PayPal Welcome Templates Seed (9 langues)
// DISABLED 2026-01-30: One-time seed functions - removed to free Cloud Run quota
// export { initPayPalWelcomeTemplates } from "./seeds/paypalWelcomeTemplates";

// Country Fiscal Configs Seed (200 countries + 64 USA/Canada subdivisions)
// NOTE: Data already seeded via local script (scripts/seedCountryData.js)
// Commented out to avoid Cloud Run CPU quota issues on deployment
// export { initCountryConfigs, seedCountryConfigsHttp } from "./seeds/initCountryConfigs";

// Refund Management (simplified for Direct Charges)
// Note: With Direct Charges, funds go directly to provider.
// Only RefundManager is kept for refunds of calls not completed.
export {
  RefundManager,
  // REMOVED: UnclaimedFundsManager deprecated alias - use RefundManager directly
  REFUND_CONFIG,
} from "./UnclaimedFundsManager";

// Provider Earnings Dashboard
export {
  getProviderEarningsSummary,
  getProviderTransactions,
  getProviderMonthlyStats,
  getProviderPayoutHistory,
  getProviderDashboard,
  adminGetProviderEarnings,
} from "./ProviderEarningsService";

// Pending Transfer Processor (for deferred transfers after KYC)
import {
  processPendingTransfersForProvider,
  getPendingTransfersStats,
  retryFailedTransfersForProvider,
} from "./PendingTransferProcessor";

export {
  processPendingTransfersForProvider,
  getPendingTransfersStats,
  retryFailedTransfersForProvider,
};

// PayPal Commerce Platform
import {
  PAYPAL_CLIENT_ID as _PAYPAL_CLIENT_ID,
  PAYPAL_CLIENT_SECRET as _PAYPAL_CLIENT_SECRET,
  PAYPAL_WEBHOOK_ID as _PAYPAL_WEBHOOK_ID,
  PAYPAL_PARTNER_ID as _PAYPAL_PARTNER_ID,
  PAYPAL_MODE as _PAYPAL_MODE,
} from "./PayPalManager";

export {
  createPayPalOnboardingLink,
  checkPayPalMerchantStatus,
  // REMOVED: createPayPalOrder, capturePayPalOrder (onCall versions)
  // Use HTTP versions below instead - they have CORS support
  createPayPalOrderHttp,
  authorizePayPalOrderHttp, // AUTHORIZE flow: comme Stripe capture_method: 'manual'
  capturePayPalOrderHttp,
  paypalWebhook,
  getRecommendedPaymentGateway,
  createPayPalPayout,
  checkPayPalPayoutStatus,
  PAYPAL_CLIENT_ID,
  PAYPAL_CLIENT_SECRET,
  PAYPAL_WEBHOOK_ID,
  PAYPAL_PARTNER_ID,
  PAYPAL_MODE,
  PAYPAL_PLATFORM_MERCHANT_ID,
} from "./PayPalManager";

// Payout Retry Tasks (P0-2 FIX)
export { executePayoutRetryTask, retryFailedPayout } from "./lib/payoutRetryTasks";

// Stripe Transfer Retry Tasks (P1-2 FIX)
export { executeStripeTransferRetry } from "./lib/stripeTransferRetryTasks";

// ============================================================================
// TAX ENGINE - VAT/GST Calculation for B2B/B2C transactions
// Seller: SOS-Expat OU (Estonia, EE) - OSS registered
// ============================================================================
export {
  calculateTax,
  calculateTaxCallable,
  getTaxThresholdStatus,
  validateVAT,
  calculateTaxForTransaction,
  // Constants
  EU_COUNTRIES,
  EU_VAT_RATES,
  COUNTRY_THRESHOLDS,
  OSS_THRESHOLD_EUR,
  INVOICE_MENTIONS,
  SELLER_COUNTRY,
  SELLER_VAT_RATE,
  // Types
  type TaxCalculationInput,
  type TaxCalculationResult,
} from "./tax/calculateTax";

// ============================================================================
// VAT VALIDATION - VIES (EU) & HMRC (UK) Integration
// For B2B reverse charge eligibility verification
// ============================================================================
export {
  // Cloud Functions (Callables)
  validateVat,
  checkReverseCharge,
  cleanupVatCache,
} from "./tax/vatCallables";

export {
  // Validation service
  validateVatNumber,
  validateFullVatNumber,
  validateMultipleVatNumbers,
  isEligibleForReverseCharge,
  // Cache management
  invalidateCache as invalidateVatCache,
  cleanupExpiredCache as cleanupExpiredVatCache,
  // Helpers
  isEUCountry,
  isUkCountry,
  // Constants
  VAT_CACHE_COLLECTION,
  CACHE_TTL_DAYS,
  // Types
  type VatValidationResult,
  type VatValidationOptions,
} from "./tax/vatValidation";

// ============================================================================
// ACCOUNTING ENGINE - Automatic Journal Entry Generation
// SOS-Expat OU (Estonia) - EUR accounting
// ============================================================================
// TODO: Fix TypeScript v2 migration errors in accounting module
/*
export {
  // Triggers - Automatic journal entry generation
  onPaymentCompleted,
  onRefundCreated,
  onRefundCompleted,
  onPayoutCompleted,
  onSubscriptionPaymentReceived,

  // Admin Callable Functions
  postJournalEntry,
  reverseJournalEntry,
  regenerateJournalEntry,
  getAccountingStats,
  generateOssVatDeclaration,
  getAccountBalances,

  // Types (re-exported for client use)
  type JournalEntry,
  type JournalLine,
  type JournalEntryStatus,
  type SourceDocumentType,
  type PaymentData,
  type RefundData,
  type PayoutData,
  type SubscriptionData,
  type AccountBalance,
  type OssVatDeclaration,
} from "./accounting";
*/

// Alias pour usage local dans GLOBAL_SECRETS
const PAYPAL_CLIENT_ID = _PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = _PAYPAL_CLIENT_SECRET;
const PAYPAL_WEBHOOK_ID = _PAYPAL_WEBHOOK_ID;
const PAYPAL_PARTNER_ID = _PAYPAL_PARTNER_ID;

// Cloud Tasks auth - imported from ./lib/secrets
export { TASKS_AUTH_SECRET };

// Outil-sos-expat API Keys - imported from ./lib/secrets
export { OUTIL_API_KEY, OUTIL_SYNC_API_KEY };

// MailWizz Email Marketing
// import { MAILWIZZ_API_KEY, MAILWIZZ_WEBHOOK_SECRET } from "./emailMarketing/config";

// ✅ Centralise la liste globale
const GLOBAL_SECRETS = [
  EMAIL_USER,
  EMAIL_PASS,
  // EMAIL_FROM,
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER,
  STRIPE_SECRET_KEY_TEST,
  STRIPE_SECRET_KEY_LIVE,
  TASKS_AUTH_SECRET,
  // PayPal Commerce Platform secrets
  PAYPAL_CLIENT_ID,
  PAYPAL_CLIENT_SECRET,
  PAYPAL_WEBHOOK_ID,
  PAYPAL_PARTNER_ID,
  // MAILWIZZ_API_KEY and MAILWIZZ_WEBHOOK_SECRET removed - now using static values from environment
].filter(Boolean) as any[];


// ⚠️ cast 'as any' pour accepter eventarc si les types ne sont pas à jour
setGlobalOptions({
  region: "europe-west1",
  eventarc: { location: "europe-west1" },
  secrets: GLOBAL_SECRETS,
} as any);

// ✅ STRIPE CONNECT FUNCTIONS (Express Accounts)
export {
  // Express accounts (recommended)
  createExpressAccount,
  getOnboardingLink,
  checkKycStatus,
  // REMOVED: Deprecated legacy functions (createCustomAccount, submitKycData, addBankAccount)
  // These were replaced by Express accounts in 2024 - no longer needed
} from "./stripeAutomaticKyc";

export { completeLawyerOnboarding } from "./lawyerOnboarding";

// Scheduled transfer processing
export { processScheduledTransfers } from "./processScheduledTransfers";

// ====== IMPORTS PRINCIPAUX ======
import {
  onRequest,
  onCall,
  HttpsError,
  CallableRequest,
} from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import Stripe from "stripe";
import type { Request as ExpressRequest, Response } from "express";

// 🦾 Cloud Tasks helper
// P0 FIX: scheduleCallTask n'est plus utilisé ici - scheduling géré dans createAndScheduleCallHTTPS
// import { scheduleCallTask } from "./lib/tasks";

// ====== IMPORTS DES MODULES PRINCIPAUX ======
import { createAndScheduleCallHTTPS } from "./createAndScheduleCallFunction";

import { runExecuteCallTask } from "./runtime/executeCallTask";
import { runSetProviderAvailableTask } from "./runtime/setProviderAvailableTask";
export { forceEndCallTask } from "./runtime/forceEndCallTask";

ultraLogger.debug("IMPORTS", "Imports principaux chargés avec succès");

// ====== PARAMS & SECRETS ADDITIONNELS ======
// P0 FIX: Import from centralized secrets.ts
import {
  STRIPE_MODE,
  STRIPE_WEBHOOK_SECRET_TEST,
  STRIPE_WEBHOOK_SECRET_LIVE,
  STRIPE_CONNECT_WEBHOOK_SECRET_TEST,
  STRIPE_CONNECT_WEBHOOK_SECRET_LIVE,
} from "./lib/secrets";

export {
  STRIPE_MODE,
  STRIPE_WEBHOOK_SECRET_TEST,
  STRIPE_WEBHOOK_SECRET_LIVE,
  STRIPE_CONNECT_WEBHOOK_SECRET_TEST,
  STRIPE_CONNECT_WEBHOOK_SECRET_LIVE,
};

// Helpers de sélection de secrets selon le mode
function isLive(): boolean {
  return (STRIPE_MODE.value() || "test").toLowerCase() === "live";
}
// P0 FIX: Use .value() instead of process.env for Firebase v2 secrets
function getStripeSecretKey(): string {
  return isLive()
    ? STRIPE_SECRET_KEY_LIVE.value() || ""
    : STRIPE_SECRET_KEY_TEST.value() || "";
}
function getStripeWebhookSecret(): string {
  // P0 FIX: trim() to handle Windows CRLF in secrets
  return isLive()
    ? (STRIPE_WEBHOOK_SECRET_LIVE.value() || "").trim()
    : (STRIPE_WEBHOOK_SECRET_TEST.value() || "").trim();
}

// Helper pour le webhook Connect (Direct Charges) - reserve pour utilisation future
export function getStripeConnectWebhookSecret(): string {
  // P0 FIX: trim() to handle Windows CRLF in secrets
  return isLive()
    ? (STRIPE_CONNECT_WEBHOOK_SECRET_LIVE.value() || "").trim()
    : (STRIPE_CONNECT_WEBHOOK_SECRET_TEST.value() || "").trim();
}

// ====== INTERFACES DE DEBUGGING ======
interface UltraDebugMetadata {
  sessionId: string;
  requestId: string;
  userId?: string;
  functionName: string;
  startTime: number;
  environment: string;
}

interface DebuggedRequest extends ExpressRequest {
  debugMetadata?: UltraDebugMetadata;
}

interface FirebaseRequest extends DebuggedRequest {
  rawBody: Buffer;
}

// ====== TYPES POUR LES FONCTIONS ADMIN ======
interface AdminUpdateStatusData {
  userId: string;
  status: "active" | "pending" | "blocked" | "suspended";
  reason?: string;
}

interface AdminSoftDeleteData {
  userId: string;
  reason?: string;
}

interface AdminBulkUpdateData {
  ids: string[];
  status: "active" | "pending" | "blocked" | "suspended";
  reason?: string;
}

interface CustomClaims {
  role?: string;
  [key: string]: unknown;
}

ultraLogger.debug("TYPES", "Interfaces et types définis");

// ====== TYPES TWILIO ======
type TwilioCallParticipant = { callSid?: string; isMuted?: boolean };
type TwilioCallSession = {
  status: "active" | "scheduled" | "ended" | string;
  conference: { sid: string; name: string };
  participants: {
    provider: TwilioCallParticipant;
    client: TwilioCallParticipant;
  };
};
type CleanupResult = { deleted: number; errors: number };

export interface TwilioCallManager {
  cancelCallSession(
    sessionId: string,
    reason: string,
    performedBy: string
  ): Promise<boolean>;
  getCallSession(sessionId: string): Promise<TwilioCallSession | null>;
  cleanupOldSessions(opts: {
    olderThanDays: number;
    keepCompletedDays: number;
    batchSize: number;
  }): Promise<CleanupResult>;
}

// ====== INITIALISATION FIREBASE ULTRA-DÉBUGGÉE ======
let isFirebaseInitialized = false;
let db: admin.firestore.Firestore;
let initializationError: Error | null = null;

const initializeFirebase = traceFunction(
  () => {
    if (!isFirebaseInitialized && !initializationError) {
      try {
        ultraLogger.info("FIREBASE_INIT", "Début d'initialisation Firebase");

        const startTime = Date.now();

        if (!admin.apps.length) {
          ultraLogger.debug(
            "FIREBASE_INIT",
            "Aucune app Firebase détectée, initialisation..."
          );
          admin.initializeApp();
          ultraLogger.info("FIREBASE_INIT", "Firebase Admin SDK initialisé");
        } else {
          ultraLogger.debug(
            "FIREBASE_INIT",
            "Firebase déjà initialisé, utilisation de l'instance existante"
          );
        }

        db = admin.firestore();
        ultraLogger.debug("FIREBASE_INIT", "Instance Firestore récupérée");

        // Configuration Firestore
        try {
          db.settings({ ignoreUndefinedProperties: true });
          ultraLogger.info(
            "FIREBASE_INIT",
            "Firestore configuré avec ignoreUndefinedProperties: true"
          );
        } catch (settingsError) {
          ultraLogger.warn(
            "FIREBASE_INIT",
            "Firestore déjà configuré (normal)",
            {
              error:
                settingsError instanceof Error
                  ? settingsError.message
                  : String(settingsError),
            }
          );
        }

        const initTime = Date.now() - startTime;
        isFirebaseInitialized = true;

        ultraLogger.info("FIREBASE_INIT", "Firebase initialisé avec succès", {
          initializationTime: `${initTime}ms`,
          projectId: admin.app().options.projectId,
          databaseURL: admin.app().options.databaseURL,
          storageBucket: admin.app().options.storageBucket,
        });
      } catch (error) {
        initializationError =
          error instanceof Error ? error : new Error(String(error));
        ultraLogger.error(
          "FIREBASE_INIT",
          "Erreur critique lors de l'initialisation Firebase",
          {
            error: initializationError.message,
            stack: initializationError.stack,
          },
          initializationError
        );
        throw initializationError;
      }
    } else if (initializationError) {
      ultraLogger.error(
        "FIREBASE_INIT",
        "Tentative d'utilisation après erreur d'initialisation",
        {
          previousError: initializationError.message,
        }
      );
      throw initializationError;
    }

    return db;
  },
  "initializeFirebase",
  "INDEX"
);

// ====== ADMIN ACCESS HELPER ======
// Vérifie les custom claims ET Firestore pour l'accès admin
const ADMIN_EMAILS = ['williamsjullin@gmail.com', 'williamjullin@gmail.com', 'julienvalentine1@gmail.com'];

async function checkAdminAccess(request: { auth?: { uid: string; token: { email?: string; role?: string } } }): Promise<boolean> {
  if (!request.auth) return false;

  // 1. Vérifier custom claims (rapide)
  if ((request.auth.token as CustomClaims)?.role === 'admin') {
    return true;
  }

  // 2. Vérifier email whitelist
  const email = request.auth.token.email?.toLowerCase();
  if (email && ADMIN_EMAILS.includes(email)) {
    return true;
  }

  // 3. Vérifier Firestore (fallback)
  try {
    const database = initializeFirebase();
    const userDoc = await database.collection('users').doc(request.auth.uid).get();
    if (userDoc.exists && userDoc.data()?.role === 'admin') {
      return true;
    }
  } catch (e) {
    ultraLogger.warn('ADMIN_CHECK', 'Erreur vérification Firestore', { error: String(e) });
  }

  return false;
}

// ====== LAZY LOADING DES MANAGERS ======
// Note: stripeManagerInstance and messageManagerInstance were used by debug functions
// which have been disabled to reduce Cloud Run services. Commented out to fix TS6133.
// const stripeManagerInstance: unknown = null; // placeholder - used by generateSystemDebugReport
let twilioCallManagerInstance: TwilioCallManager | null = null; // réassigné après import
// const messageManagerInstance: unknown = null; // placeholder - used by generateSystemDebugReport

const getTwilioCallManager = traceFunction(
  async (): Promise<TwilioCallManager> => {
    if (!twilioCallManagerInstance) {
      const mod = (await import("./TwilioCallManager")) as {
        twilioCallManager?: TwilioCallManager;
        default?: TwilioCallManager;
      };

      const resolved = mod.twilioCallManager ?? mod.default;
      if (!resolved) {
        throw new Error(
          "TwilioCallManager introuvable dans ./TwilioCallManager (ni export nommé, ni export par défaut)."
        );
      }
      twilioCallManagerInstance = resolved;
    }
    return twilioCallManagerInstance;
  },
  "getTwilioCallManager",
  "INDEX"
);

// ====== MIDDLEWARE DE DEBUG POUR TOUTES LES FONCTIONS ======
function createDebugMetadata(
  functionName: string,
  userId?: string
): UltraDebugMetadata {
  return {
    // sessionId: `${functionName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    sessionId: `${functionName}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    // requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId,
    functionName,
    startTime: Date.now(),
    environment: process.env.NODE_ENV || "development",
  };
}

function logFunctionStart(metadata: UltraDebugMetadata, data?: unknown) {
  ultraLogger.info(
    `FUNCTION_${metadata.functionName.toUpperCase()}_START`,
    `Début d'exécution de ${metadata.functionName}`,
    {
      sessionId: metadata.sessionId,
      requestId: metadata.requestId,
      userId: metadata.userId,
      data: data ? JSON.stringify(data, null, 2) : undefined,
      memoryUsage: process.memoryUsage(),
    }
  );
}

function logFunctionEnd(
  metadata: UltraDebugMetadata,
  result?: unknown,
  error?: Error
) {
  const executionTime = Date.now() - metadata.startTime;

  if (error) {
    ultraLogger.error(
      `FUNCTION_${metadata.functionName.toUpperCase()}_ERROR`,
      `Erreur dans ${metadata.functionName}`,
      {
        sessionId: metadata.sessionId,
        requestId: metadata.requestId,
        userId: metadata.userId,
        executionTime: `${executionTime}ms`,
        error: error.message,
        stack: error.stack,
        memoryUsage: process.memoryUsage(),
      },
      error
    );
  } else {
    ultraLogger.info(
      `FUNCTION_${metadata.functionName.toUpperCase()}_END`,
      `Fin d'exécution de ${metadata.functionName}`,
      {
        sessionId: metadata.sessionId,
        requestId: metadata.requestId,
        userId: metadata.userId,
        executionTime: `${executionTime}ms`,
        result: result ? JSON.stringify(result, null, 2) : undefined,
        memoryUsage: process.memoryUsage(),
      }
    );
  }
}

// ====== WRAPPER POUR FONCTIONS CALLABLE ======
function wrapCallableFunction<T>(
  functionName: string,
  originalFunction: (request: CallableRequest<T>) => Promise<unknown>
) {
  return async (request: CallableRequest<T>) => {
    const metadata = createDebugMetadata(functionName, request.auth?.uid);

    logFunctionStart(metadata, {
      hasAuth: !!request.auth,
      authUid: request.auth?.uid,
      requestData: request.data,
    });

    try {
      const result = await originalFunction(request);
      logFunctionEnd(metadata, result);
      return result;
    } catch (error) {
      logFunctionEnd(metadata, undefined, error as Error);
      throw error;
    }
  };
}

// ====== WRAPPER POUR FONCTIONS HTTP ======
 
function wrapHttpFunction(
  functionName: string,
  originalFunction: (req: FirebaseRequest, res: Response) => Promise<void>
): any {
   
  return async (req: any, res: any) => {
    const metadata = createDebugMetadata(functionName);
    // Cast to FirebaseRequest for internal use
    const firebaseReq = req as unknown as FirebaseRequest;
    (firebaseReq as DebuggedRequest).debugMetadata = metadata;

    logFunctionStart(metadata, {
      method: req.method,
      url: req.url,
      headers: req.headers,
      query: req.query,
      body: req.body,
    });

    try {
      await originalFunction(firebaseReq, res);
      logFunctionEnd(metadata, { statusCode: res.statusCode });
    } catch (error) {
      logFunctionEnd(metadata, undefined, error as Error);
      throw error;
    }
  };
}

// ====== EXPORTS DIRECTS ======
ultraLogger.info("EXPORTS", "Début du chargement des exports directs");

export { createAndScheduleCallHTTPS };
export { createAndScheduleCallHTTPS as createAndScheduleCall };
export { createPaymentIntent } from "./createPaymentIntent";
export { api } from "./adminApi";
// P0 SECURITY: testTwilioCall DISABLED - Public endpoint that could generate unlimited Twilio costs
// export { testTwilioCall } from "./testTwilioCall";
// TODO: If needed for testing, add admin authentication before re-enabling
export { twilioCallWebhook, twilioAmdTwiml, twilioGatherResponse } from "./Webhooks/twilioWebhooks";
export { twilioConferenceWebhook } from "./Webhooks/TwilioConferenceWebhook";
export { providerNoAnswerTwiML } from "./Webhooks/providerNoAnswerTwiML";
export { enqueueMessageEvent } from "./messaging/enqueueMessageEvent";

// Webhooks
export { unifiedWebhook } from "./Webhooks/unifiedWebhook";

// P0 SECURITY: Contact form with rate limiting (replaces direct Firestore writes)
export { createContactMessage } from "./contact/createContactMessage";

// Meta CAPI Event Tracking (Search, ViewContent, AddToCart)
export { trackCAPIEvent } from "./tracking/capiEvents";

// Meta CAPI Connection Test
// DISABLED: Dev/test function - not needed in production
// export { testCAPIConnection } from "./monitoring/testCAPIConnection";

// Utilitaires complémentaires
// DISABLED 2026-01-30: One-time init function - removed to free Cloud Run quota
// export { initializeMessageTemplates } from "./initializeMessageTemplates";
export { notifyAfterPayment } from "./notifications/notifyAfterPayment";

// Contact reply (admin responds to contact form messages)
export { sendContactReply } from "./sendContactReplyFunction";

// Exports additionnels
export * from "./notificationPipeline/worker";
export * from "./admin/callables";
export { adminResetFAQs } from "./admin/resetFAQsCallable";
// Provider bulk management actions (hide, block, suspend, delete)
export * from "./admin/providerActions";

// Triggers de nettoyage automatique (suppression cascade users -> sos_profiles)
export { onUserDeleted, cleanupOrphanedProfiles } from "./triggers/userCleanupTrigger";

// User Feedback Module - Collecte des retours utilisateurs (clients & prestataires)
export {
  submitFeedback,
  onFeedbackCreated,
  updateFeedbackStatus,
  getFeedbackStats,
  deleteFeedback,
} from "./feedback";

// Tax Filings Module - Declaration fiscales automatiques
// TODO: Fix TypeScript v2 migration errors in taxFilings module
/*
export {
  generateTaxFiling,
  generateAllTaxFilings,
  sendFilingReminders,
  triggerFilingReminders,
  exportFilingToFormat,
  exportFilingAllFormats,
  updateFilingStatus,
  deleteFilingDraft,
  updateFilingAmounts,
} from "./taxFilings";
*/

// ========================================
// 🔒 SECURITY ALERTS MODULE - TEMPORARILY DISABLED
// ========================================
// TODO: Fix TypeScript errors in securityAlerts module
// Détection de menaces, scoring, notifications multilingues
// IMPORTANT: Détection basée sur les COMPORTEMENTS, pas la géographie
// Aucun pays n'est blacklisté - tous les utilisateurs peuvent utiliser la plateforme
/*
export {
  // Cloud Functions Triggers
  onSecurityAlertCreated,
  onSecurityAlertUpdated,
  createSecurityAlertHttp,
  processEscalationHttp,
  securityAlertAdminAction,
  getSecurityStats,
  checkBlockedEntity,
  // Scheduled Functions
  securityDailyCleanup,
  processSecurityEscalations,
  securityDailyReport,
} from "./securityAlerts/triggers";

// Detectors (pour utilisation dans d'autres fonctions)
export {
  detectBruteForce,
  detectUnusualLocation,
  detectPaymentFraud,
  detectCardTesting,
  detectMassAccountCreation,
  detectApiAbuse,
  detectInjectionAttempt,
  detectMultipleSessions,
} from "./securityAlerts/detectors";

// Threat Score Service
export { threatScoreService } from "./securityAlerts/ThreatScoreService";
*/

// AI Chat - DEPRECATED: Now handled directly by Outil-sos-expat
// The AI chat functionality is in Outil-sos-expat, not SOS
// export { aiChatForProvider, getAiSuggestions } from "./ai/aiChatForProvider";

ultraLogger.info("EXPORTS", "Exports directs configurés");

// ========================================
// 🦾 ENDPOINT CLOUD TASKS : exécuter l'appel
// ========================================
export const executeCallTask = onRequest(
  {
    region: "europe-west1",
    // P0 FIX: Timeout increased from 120s to 540s (9 minutes)
    // Each provider retry: ~150s (60s call + 90s wait) + 15s backoff
    // 3 retries: 3*150 + 2*15 = 480s minimum
    // 120s was causing premature function timeout → only 2 retries executed
    timeoutSeconds: 540,
    memory: "512MiB",
    // P0 FIX: Use fractional CPU to reduce quota consumption (like twilioCallWebhook)
    // With concurrency: 1, we can use cpu < 1 which uses less quota per instance
    // 0.25 CPU is sufficient since function mostly waits for Twilio API responses
    cpu: 0.25,
    maxInstances: 10,
    minInstances: 0,  // Temporarily set to 0 to free quota - TODO: restore to 1 after quota increase
    concurrency: 1,   // P0 FIX: Set to 1 to allow fractional CPU (concurrency > 1 requires cpu >= 1)
    // Secrets: TASKS_AUTH_SECRET for Cloud Tasks auth + Twilio + ENCRYPTION_KEY + Stripe/PayPal (for refunds/voids)
    secrets: [TASKS_AUTH_SECRET, ENCRYPTION_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, STRIPE_SECRET_KEY_LIVE, STRIPE_SECRET_KEY_TEST, PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET],
  },
  (req, res) => runExecuteCallTask(req as any, res as any)
);

// ========================================
// 🕐 ENDPOINT CLOUD TASKS : set provider available after cooldown
// ========================================
export const setProviderAvailableTask = onRequest(
  {
    region: "europe-west1",
    timeoutSeconds: 30,
    memory: "256MiB" as const,
    maxInstances: 10,
    minInstances: 0,
    concurrency: 1,
    // Only needs TASKS_AUTH_SECRET for Cloud Tasks auth
    secrets: [TASKS_AUTH_SECRET],
  },
  (req, res) => runSetProviderAvailableTask(req as any, res as any)
);

// ========================================
// FONCTIONS ADMIN (V2)
// ========================================
export const adminUpdateStatus = onCall(
  {
    ...emergencyConfig,
    timeoutSeconds: 30,
  },
  wrapCallableFunction(
    "adminUpdateStatus",
    async (request: CallableRequest<AdminUpdateStatusData>) => {
      const database = initializeFirebase();

      ultraLogger.debug(
        "ADMIN_UPDATE_STATUS",
        "Vérification des permissions admin",
        {
          hasAuth: !!request.auth,
          userRole: (request.auth?.token as CustomClaims)?.role,
        }
      );

      if (!(await checkAdminAccess(request)) || !request.auth) {
        ultraLogger.warn(
          "ADMIN_UPDATE_STATUS",
          "Accès refusé - permissions admin requises",
          {
            userId: request.auth?.uid,
            userRole: (request.auth?.token as CustomClaims)?.role,
          }
        );
        throw new HttpsError("permission-denied", "Admin access required");
      }

      const { userId, status, reason } = request.data;

      ultraLogger.info(
        "ADMIN_UPDATE_STATUS",
        "Mise à jour du statut utilisateur",
        {
          targetUserId: userId,
          newStatus: status,
          reason,
          adminId: request.auth.uid,
        }
      );

      await database.collection("users").doc(userId).update({
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await database.collection("adminLogs").add({
        action: "updateStatus",
        userId,
        status,
        reason: reason || null,
        adminId: request.auth.uid,
        ts: admin.firestore.FieldValue.serverTimestamp(),
      });

      ultraLogger.info(
        "ADMIN_UPDATE_STATUS",
        "Statut utilisateur mis à jour avec succès",
        {
          targetUserId: userId,
          newStatus: status,
        }
      );

      return { ok: true };
    }
  )
);

export const adminSoftDeleteUser = onCall(
  {
    ...emergencyConfig,
    timeoutSeconds: 30,
  },
  wrapCallableFunction(
    "adminSoftDeleteUser",
    async (request: CallableRequest<AdminSoftDeleteData>) => {
      const database = initializeFirebase();

      if (!(await checkAdminAccess(request)) || !request.auth) {
        ultraLogger.warn("ADMIN_SOFT_DELETE", "Accès refusé", {
          userId: request.auth?.uid,
        });
        throw new HttpsError("permission-denied", "Admin access required");
      }

      const { userId, reason } = request.data;

      ultraLogger.info(
        "ADMIN_SOFT_DELETE",
        "Suppression soft de l'utilisateur",
        {
          targetUserId: userId,
          reason,
          adminId: request.auth.uid,
        }
      );

      await database
        .collection("users")
        .doc(userId)
        .update({
          isDeleted: true,
          deletedAt: admin.firestore.FieldValue.serverTimestamp(),
          deletedBy: request.auth.uid,
          deletedReason: reason || null,
        });

      await database.collection("adminLogs").add({
        action: "softDelete",
        userId,
        reason: reason || null,
        adminId: request.auth.uid,
        ts: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { ok: true };
    }
  )
);

export const adminBulkUpdateStatus = onCall(
  {
    ...emergencyConfig,
    timeoutSeconds: 30,
  },
  wrapCallableFunction(
    "adminBulkUpdateStatus",
    async (request: CallableRequest<AdminBulkUpdateData>) => {
      const database = initializeFirebase();

      if (!(await checkAdminAccess(request)) || !request.auth) {
        throw new HttpsError("permission-denied", "Admin access required");
      }

      const { ids, status, reason } = request.data;

      ultraLogger.info("ADMIN_BULK_UPDATE", "Mise à jour en lot", {
        targetUserIds: ids,
        newStatus: status,
        reason,
        adminId: request.auth.uid,
        batchSize: ids.length,
      });

      const batch = database.batch();
      ids.forEach((id) =>
        batch.update(database.collection("users").doc(id), {
          status,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
      );
      await batch.commit();

      await database.collection("adminLogs").add({
        action: "bulkUpdateStatus",
        ids,
        status,
        reason: reason || null,
        adminId: request.auth.uid,
        ts: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { ok: true };
    }
  )
);

// ========================================
// CONFIGURATION SÉCURISÉE DES SERVICES (Stripe)
// ========================================
let stripe: Stripe | null = null;

export const getStripe = traceFunction(
  (): Stripe | null => {
    if (!stripe) {
      ultraLogger.info("STRIPE_INIT", "Initialisation de Stripe", {
        mode: isLive() ? "live" : "test",
      });

      let stripeSecretKey = "";
      try {
        stripeSecretKey = getStripeSecretKey();
        ultraLogger.debug(
          "STRIPE_INIT",
          "Clé Stripe récupérée via Secret Manager",
          {
            mode: isLive() ? "live" : "test",
            keyPrefix: stripeSecretKey?.slice(0, 7) + "...",
          }
        );
      } catch (secretError) {
        ultraLogger.error("STRIPE_INIT", "Secret Stripe non configuré", {
          error:
            secretError instanceof Error
              ? secretError.message
              : String(secretError),
        });
        return null;
      }

      if (stripeSecretKey && stripeSecretKey.startsWith("sk_")) {
        try {
          stripe = new Stripe(stripeSecretKey, {
            apiVersion: "2023-10-16" as Stripe.LatestApiVersion,
          });
          ultraLogger.info("STRIPE_INIT", "Stripe configuré avec succès", {
            mode: isLive() ? "live" : "test",
          });
        } catch (stripeError) {
          ultraLogger.error(
            "STRIPE_INIT",
            "Erreur configuration Stripe",
            {
              error:
                stripeError instanceof Error
                  ? stripeError.message
                  : String(stripeError),
            },
            stripeError instanceof Error ? stripeError : undefined
          );
          stripe = null;
        }
      } else {
        ultraLogger.warn(
          "STRIPE_INIT",
          "Stripe non configuré - Secret Key manquante ou invalide",
          { mode: isLive() ? "live" : "test" }
        );
      }
    }

    return stripe;
  },
  "getStripe",
  "INDEX"
);

// ====== HELPER: SYNC CALL SESSION TO OUTIL AFTER PAYMENT ======
const OUTIL_INGEST_ENDPOINT = "https://europe-west1-outils-sos-expat.cloudfunctions.net/ingestBooking";

/**
 * Sync call_session to Outil-sos-expat AFTER payment is validated
 * This triggers the AI system to process the booking
 */
async function syncCallSessionToOutil(
  callSessionId: string,
  cs: FirebaseFirestore.DocumentData,
  debugId: string
): Promise<void> {
  try {
    // P0 FIX: Trim secret value to remove trailing CRLF
    const apiKey = OUTIL_SYNC_API_KEY.value().trim();
    if (!apiKey) {
      console.warn(`[${debugId}] OUTIL_SYNC_API_KEY not configured - skipping sync`);
      return;
    }

    const providerId = cs?.metadata?.providerId || cs?.providerId || "";

    // P0 FIX: Récupérer le statut d'accès IA du provider pour l'envoyer à Outil
    // Cela permet à Outil de créer/mettre à jour le provider avec le bon statut
    let providerAccessInfo: {
      forcedAIAccess?: boolean;
      freeTrialUntil?: string | null;
      subscriptionStatus?: string;
      hasActiveSubscription?: boolean;
      providerEmail?: string;
    } = {};

    if (providerId) {
      try {
        // Récupérer depuis users/{providerId} car c'est là que forcedAIAccess est stocké
        const userDoc = await admin.firestore().collection("users").doc(providerId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          providerAccessInfo = {
            forcedAIAccess: userData?.forcedAIAccess === true,
            freeTrialUntil: userData?.freeTrialUntil?.toDate?.()?.toISOString() || null,
            subscriptionStatus: userData?.subscriptionStatus,
            hasActiveSubscription: userData?.hasActiveSubscription === true,
            providerEmail: userData?.email,
          };
          console.log(`🔑 [${debugId}] Provider access info retrieved:`, {
            providerId,
            forcedAIAccess: providerAccessInfo.forcedAIAccess,
            subscriptionStatus: providerAccessInfo.subscriptionStatus,
          });
        } else {
          console.warn(`⚠️ [${debugId}] Provider not found in users collection: ${providerId}`);
        }
      } catch (accessError) {
        console.warn(`⚠️ [${debugId}] Failed to get provider access info:`, accessError);
      }
    }

    // P1-1 FIX: Decrypt client phone before payload with try-catch
    let decryptedClientPhone = cs?.clientPhone;
    if (cs?.participants?.client?.phone) {
      try {
        decryptedClientPhone = decryptPhoneNumber(cs.participants.client.phone);
      } catch (decryptError) {
        console.error(`🔐❌ [${debugId}] Failed to decrypt client phone for Outil sync:`, decryptError);
        // Fall back to raw clientPhone value
      }
    }

    // Build payload from call_session data
    const payload = {
      // Client info
      clientFirstName: cs?.participants?.client?.firstName || cs?.clientFirstName,
      clientLastName: cs?.participants?.client?.lastName || cs?.clientLastName,
      clientName: cs?.participants?.client?.name || cs?.clientName,
      clientEmail: cs?.participants?.client?.email || cs?.clientEmail,
      clientPhone: decryptedClientPhone,
      clientWhatsapp: cs?.clientWhatsapp,
      clientCurrentCountry: cs?.clientCurrentCountry,
      clientNationality: cs?.clientNationality,
      clientLanguages: cs?.metadata?.clientLanguages || cs?.clientLanguages,

      // Request details
      title: cs?.metadata?.title || cs?.title || "Consultation",
      description: cs?.description,
      serviceType: cs?.metadata?.serviceType || cs?.serviceType,
      priority: "normal",

      // Provider info
      providerId,
      providerType: cs?.metadata?.providerType || cs?.providerType,
      providerName: cs?.participants?.provider?.name || cs?.providerName,
      providerCountry: cs?.providerCountry,
      // P0 FIX: Inclure les infos d'accès IA pour que Outil puisse créer/mettre à jour le provider
      providerEmail: providerAccessInfo.providerEmail || cs?.participants?.provider?.email,
      forcedAIAccess: providerAccessInfo.forcedAIAccess,
      freeTrialUntil: providerAccessInfo.freeTrialUntil,
      subscriptionStatus: providerAccessInfo.subscriptionStatus,
      hasActiveSubscription: providerAccessInfo.hasActiveSubscription,

      // Source tracking
      source: "sos-expat-payment-validated",
      externalId: callSessionId,
      metadata: {
        callSessionId,
        paymentIntentId: cs?.payment?.intentId || cs?.paymentIntentId,
        amount: cs?.payment?.amount,
        scheduledAt: cs?.scheduledAt?.toDate?.()?.toISOString(),
        syncedAfterPayment: true,
      },
    };

    console.log(`🔄 [${debugId}] Syncing to Outil after payment...`);
    console.log(`🔄 [${debugId}] Payload:`, JSON.stringify({
      externalId: payload.externalId,
      providerId: payload.providerId,
      clientName: payload.clientName,
      source: payload.source,
      // P0 FIX: Log des infos d'accès IA
      forcedAIAccess: payload.forcedAIAccess,
      subscriptionStatus: payload.subscriptionStatus,
      hasActiveSubscription: payload.hasActiveSubscription,
    }));

    // P0 PRODUCTION FIX: Add timeout to prevent hanging if Outil is unresponsive
    const OUTIL_TIMEOUT_MS = 10000; // 10 seconds
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OUTIL_TIMEOUT_MS);

    try {
      const response = await fetch(OUTIL_INGEST_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [${debugId}] Outil sync failed: HTTP ${response.status}: ${errorText}`);
        ultraLogger.error("OUTIL_SYNC", "Échec sync vers Outil après paiement", {
          callSessionId,
          status: response.status,
          error: errorText,
        });
      } else {
        const result = await response.json() as { bookingId?: string };
        console.log(`✅ [${debugId}] Outil sync success! OutilBookingId: ${result.bookingId}`);
        ultraLogger.info("OUTIL_SYNC", "Sync vers Outil réussi après paiement", {
          callSessionId,
          outilBookingId: result.bookingId,
        });
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error(`⏱️ [${debugId}] Outil sync timeout after ${OUTIL_TIMEOUT_MS}ms`);
        ultraLogger.warn("OUTIL_SYNC", "Timeout sync vers Outil", {
          callSessionId,
          timeoutMs: OUTIL_TIMEOUT_MS,
        });
      } else {
        throw fetchError; // Re-throw to be caught by outer catch
      }
    }
  } catch (error) {
    console.error(`❌ [${debugId}] Outil sync exception:`, error);
    ultraLogger.error("OUTIL_SYNC", "Exception sync vers Outil", {
      callSessionId,
      error: error instanceof Error ? error.message : String(error),
    });
    // Non-blocking: don't throw, just log
  }
}

// ====== HELPER POUR ENVOI AUTOMATIQUE DES MESSAGES ======
// DEBUG VERSION: Exhaustive logging to trace booking request SMS flow
export const sendPaymentNotifications = traceFunction(
  async (callSessionId: string, database: admin.firestore.Firestore) => {
    const debugId = `notif_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

    console.log(`\n`);
    console.log(`=======================================================================`);
    console.log(`📨 [sendPaymentNotifications][${debugId}] ========== START ==========`);
    console.log(`=======================================================================`);
    console.log(`📨 [${debugId}] CallSessionId: ${callSessionId}`);
    console.log(`📨 [${debugId}] Timestamp: ${new Date().toISOString()}`);

    try {
      ultraLogger.info(
        "PAYMENT_NOTIFICATIONS",
        "Envoi des notifications post-paiement",
        { callSessionId, debugId }
      );

      // STEP 1: Fetch call session
      console.log(`\n📨 [${debugId}] STEP 1: Fetching call_sessions document...`);
      const snap = await database
        .collection("call_sessions")
        .doc(callSessionId)
        .get();

      console.log(`📨 [${debugId}] Document exists: ${snap.exists}`);

      if (!snap.exists) {
        console.error(`❌ [${debugId}] CRITICAL: Session ${callSessionId} NOT FOUND!`);
        ultraLogger.warn("PAYMENT_NOTIFICATIONS", "Session introuvable", {
          callSessionId,
          debugId,
        });
        return;
      }

      const cs: any = snap.data();

      // STEP 2: Extract all data for debugging
      console.log(`\n📨 [${debugId}] STEP 2: Extracting session data...`);
      console.log(`📨 [${debugId}] Session status: ${cs?.status}`);
      console.log(`📨 [${debugId}] Session createdAt: ${cs?.createdAt?.toDate?.() || cs?.createdAt}`);

      // P0 FIX: Decrypt phone numbers before sending to notification pipeline
      const providerPhoneRaw =
        cs?.participants?.provider?.phone ?? cs?.providerPhone ?? "";
      const clientPhoneRaw =
        cs?.participants?.client?.phone ?? cs?.clientPhone ?? "";

      // Decrypt phone numbers (they are stored encrypted for GDPR compliance)
      // P1-1 FIX: Wrap decryption in try-catch to handle corrupted/invalid encrypted data
      let providerPhone = "";
      let clientPhone = "";
      try {
        providerPhone = providerPhoneRaw ? decryptPhoneNumber(providerPhoneRaw) : "";
      } catch (decryptError) {
        console.error(`🔐❌ [${debugId}] Failed to decrypt provider phone:`, decryptError);
        // Continue without provider phone - notifications can still be sent via email/push
      }
      try {
        clientPhone = clientPhoneRaw ? decryptPhoneNumber(clientPhoneRaw) : "";
      } catch (decryptError) {
        console.error(`🔐❌ [${debugId}] Failed to decrypt client phone:`, decryptError);
        // Continue without client phone - notifications can still be sent via email/push
      }

      const language = cs?.metadata?.clientLanguages?.[0] ?? "fr";
      const title = cs?.metadata?.title ?? cs?.title ?? "Consultation";

      console.log(`\n📨 [${debugId}] STEP 3: Phone numbers analysis (decrypted):`);
      console.log(`📨 [${debugId}]   providerPhoneRaw encrypted: ${providerPhoneRaw?.startsWith('enc:') || false}`);
      console.log(`📨 [${debugId}]   providerPhone exists: ${!!providerPhone}`);
      console.log(`📨 [${debugId}]   providerPhone preview: ${providerPhone ? providerPhone.slice(0, 5) + '***' : 'MISSING'}`);
      console.log(`📨 [${debugId}]   clientPhoneRaw encrypted: ${clientPhoneRaw?.startsWith('enc:') || false}`);
      console.log(`📨 [${debugId}]   clientPhone exists: ${!!clientPhone}`);
      console.log(`📨 [${debugId}]   clientPhone preview: ${clientPhone ? clientPhone.slice(0, 5) + '***' : 'MISSING'}`);
      console.log(`📨 [${debugId}]   language: ${language}`);
      console.log(`📨 [${debugId}]   title: ${title}`);

      // P0 FIX: Envoyer des notifications via le pipeline message_events
      const clientId = cs?.participants?.client?.id ?? cs?.clientId ?? "";
      const providerId = cs?.participants?.provider?.id ?? cs?.providerId ?? "";
      const clientEmail = cs?.participants?.client?.email ?? cs?.clientEmail ?? "";
      const providerEmail = cs?.participants?.provider?.email ?? cs?.providerEmail ?? "";
      const scheduledTime = cs?.scheduledAt?.toDate?.() ?? cs?.scheduledAt ?? new Date();

      console.log(`\n📨 [${debugId}] STEP 4: User IDs analysis:`);
      console.log(`📨 [${debugId}]   clientId: ${clientId || 'MISSING'}`);
      console.log(`📨 [${debugId}]   providerId: ${providerId || 'MISSING'}`);
      console.log(`📨 [${debugId}]   clientEmail: ${clientEmail || 'MISSING'}`);
      console.log(`📨 [${debugId}]   providerEmail: ${providerEmail || 'MISSING'}`);
      console.log(`📨 [${debugId}]   scheduledTime: ${scheduledTime instanceof Date ? scheduledTime.toISOString() : scheduledTime}`);

      // STEP 5: Create message_events
      console.log(`\n📨 [${debugId}] STEP 5: Creating message_events...`);

      // Notification au client: Appel programmé
      if (clientId || clientEmail) {
        console.log(`📨 [${debugId}] Creating CLIENT notification (call.scheduled.client)...`);

        const clientEventData = {
          eventId: "call.scheduled.client",
          locale: language,
          to: {
            uid: clientId || null,
            email: clientEmail || null,
            phone: clientPhone || null,
          },
          context: {
            callSessionId,
            title,
            scheduledTime: scheduledTime instanceof Date ? scheduledTime.toISOString() : scheduledTime,
            providerName: cs?.participants?.provider?.name ?? cs?.providerName ?? "Expert",
          },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        console.log(`📨 [${debugId}] Client event data:`, JSON.stringify({
          ...clientEventData,
          createdAt: 'serverTimestamp()'
        }, null, 2));

        const clientEventRef = await database.collection("message_events").add(clientEventData);
        console.log(`✅ [${debugId}] Client notification created: ${clientEventRef.id}`);
        ultraLogger.info("PAYMENT_NOTIFICATIONS", "Notification client créée", { callSessionId, clientId, eventDocId: clientEventRef.id, debugId });
      } else {
        console.log(`⚠️ [${debugId}] SKIPPED client notification - no clientId or clientEmail`);
      }

      // Notification au provider: Appel entrant programmé avec détails booking
      // P0 FIX: Use booking_paid_provider template which has SMS enabled
      if (providerId || providerEmail) {
        console.log(`📨 [${debugId}] Creating PROVIDER notification (booking_paid_provider - SMS ENABLED)...`);

        const clientName = cs?.participants?.client?.name ?? cs?.clientName ?? "Client";
        const clientCountry = cs?.clientCurrentCountry ?? cs?.metadata?.clientCountry ?? "N/A";
        const amount = cs?.payment?.amount ?? cs?.metadata?.amount ?? 0;
        const currency = cs?.payment?.currency ?? cs?.currency ?? "EUR";
        const serviceType = cs?.metadata?.serviceType ?? cs?.serviceType ?? "consultation";
        const description = cs?.description ?? `${title} - ${serviceType}`;

        const providerEventData = {
          eventId: "booking_paid_provider",  // P0 FIX: Changed from call.scheduled.provider (sms:false) to booking_paid_provider (sms:true)
          locale: language,
          to: {
            uid: providerId || null,
            email: providerEmail || null,
            phone: providerPhone || null,
          },
          context: {
            callSessionId,
            // Structured context to match SMS template variables
            client: {
              firstName: clientName,
              name: clientName,
            },
            request: {
              country: clientCountry,
              title: title,
              description: description,
            },
            booking: {
              amount: amount,
              currency: currency,
            },
            // Legacy flat fields for inapp compatibility
            title,
            scheduledTime: scheduledTime instanceof Date ? scheduledTime.toISOString() : scheduledTime,
            clientName,
          },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        console.log(`📨 [${debugId}] Provider event data:`, JSON.stringify({
          ...providerEventData,
          createdAt: 'serverTimestamp()'
        }, null, 2));

        const providerEventRef = await database.collection("message_events").add(providerEventData);
        console.log(`✅ [${debugId}] Provider notification created: ${providerEventRef.id}`);
        console.log(`✅ [${debugId}]   → SMS will be sent: "Client: ${clientName} (${clientCountry}) - ${amount}${currency}"`);
        ultraLogger.info("PAYMENT_NOTIFICATIONS", "Notification provider créée (SMS enabled)", { callSessionId, providerId, eventDocId: providerEventRef.id, debugId });
      } else {
        console.log(`⚠️ [${debugId}] SKIPPED provider notification - no providerId or providerEmail`);
      }

      // STEP 6: Sync to Outil after payment (non-blocking)
      console.log(`\n📨 [${debugId}] STEP 6: Syncing to Outil IA...`);
      await syncCallSessionToOutil(callSessionId, cs, debugId);

      console.log(`\n=======================================================================`);
      console.log(`✅ [sendPaymentNotifications][${debugId}] ========== SUCCESS ==========`);
      console.log(`✅ [${debugId}] Client notified: ${!!(clientId || clientEmail)}`);
      console.log(`✅ [${debugId}] Provider notified: ${!!(providerId || providerEmail)}`);
      console.log(`=======================================================================\n`);

      ultraLogger.info("PAYMENT_NOTIFICATIONS", "Notifications envoyées avec succès", {
        callSessionId,
        debugId,
        clientNotified: !!(clientId || clientEmail),
        providerNotified: !!(providerId || providerEmail),
      });
    } catch (error) {
      console.error(`\n=======================================================================`);
      console.error(`❌ [sendPaymentNotifications][${debugId}] ========== ERROR ==========`);
      console.error(`=======================================================================`);
      console.error(`❌ [${debugId}] CallSessionId: ${callSessionId}`);
      console.error(`❌ [${debugId}] Error type: ${error instanceof Error ? error.constructor.name : typeof error}`);
      console.error(`❌ [${debugId}] Error message: ${error instanceof Error ? error.message : String(error)}`);
      console.error(`❌ [${debugId}] Error stack:`, error instanceof Error ? error.stack : 'No stack');
      console.error(`=======================================================================\n`);

      ultraLogger.error(
        "PAYMENT_NOTIFICATIONS",
        "Erreur envoi notifications",
        {
          callSessionId,
          debugId,
          error: error instanceof Error ? error.message : String(error),
        },
        error instanceof Error ? error : undefined
      );
    }
  },
  "sendPaymentNotifications",
  "STRIPE_WEBHOOKS"
);

// ====== WEBHOOK STRIPE ======
// export const stripeWebhook = onRequest(
//   {
//     region: "europe-west1",
//     memory: "512MiB",
//     concurrency: 1,
//     timeoutSeconds: 30,
//     minInstances: 0,
//     maxInstances: 5
//   },
//   wrapHttpFunction('stripeWebhook', async (req: FirebaseRequest, res: Response) => {
//     const signature = req.headers['stripe-signature'];

//     ultraLogger.debug('STRIPE_WEBHOOK', 'Webhook Stripe reçu', {
//       hasSignature: !!signature,
//       method: req.method,
//       contentType: req.headers['content-type'],
//       mode: isLive() ? 'live' : 'test'
//     });

//     if (!signature) {
//       ultraLogger.warn('STRIPE_WEBHOOK', 'Signature Stripe manquante');
//       res.status(400).send('Signature Stripe manquante');
//       return;
//     }

//     const stripeInstance = getStripe();
//     if (!stripeInstance) {
//       ultraLogger.error('STRIPE_WEBHOOK', 'Service Stripe non configuré');
//       res.status(500).send('Service Stripe non configuré');
//       return;
//     }

//     try {
//       const database = initializeFirebase();
//       const rawBody = req.rawBody;
//       if (!rawBody) {
//         ultraLogger.warn('STRIPE_WEBHOOK', 'Raw body manquant');
//         res.status(400).send('Raw body manquant');
//         return;
//       }

//       const event = stripeInstance.webhooks.constructEvent(
//         rawBody.toString(),
//         signature as string,
//         getStripeWebhookSecret()
//       );

//       const objectId = (() => {
//         const o = event.data.object as unknown;
//         return o && typeof o === 'object' && 'id' in (o as Record<string, unknown>) ? (o as { id: string }).id : undefined;
//       })();

//       ultraLogger.info('STRIPE_WEBHOOK', 'Événement Stripe validé', {
//         eventType: event.type,
//         eventId: event.id,
//         objectId
//       });

//       switch (event.type) {
//         case 'payment_intent.created':
//           ultraLogger.debug('STRIPE_WEBHOOK', 'payment_intent.created', { id: objectId });
//           break;

//         case 'payment_intent.processing':
//           ultraLogger.debug('STRIPE_WEBHOOK', 'payment_intent.processing', { id: objectId });
//           break;

//         case 'payment_intent.requires_action':
//           await handlePaymentIntentRequiresAction(event.data.object as Stripe.PaymentIntent, database);
//           break;

//         case 'checkout.session.completed': {
//           ultraLogger.info('STRIPE_WEBHOOK', 'checkout.session.completed', { id: objectId });
//           const cs = event.data.object as Stripe.Checkout.Session;
//           const callSessionId = cs.metadata?.callSessionId || cs.metadata?.sessionId;
//           if (callSessionId) {
//             await database
//               .collection('call_sessions')
//               .doc(callSessionId)
//               .set(
//                 {
//                   status: 'scheduled',
//                   scheduledAt: admin.firestore.FieldValue.serverTimestamp(),
//                   delaySeconds: 300,
//                   updatedAt: admin.firestore.FieldValue.serverTimestamp(),
//                   checkoutSessionId: cs.id,
//                   paymentIntentId: typeof cs.payment_intent === 'string' ? cs.payment_intent : undefined
//                 },
//                 { merge: true }
//               );

//             await scheduleCallTask(callSessionId, 300);

//             ultraLogger.info('CHECKOUT_COMPLETED', 'Task planifiée à +300s', {
//               callSessionId,
//               delaySeconds: 300
//             });

//             // 🔔 ENVOI AUTOMATIQUE DES NOTIFICATIONS
//             await sendPaymentNotifications(callSessionId, database);
//           }
//           break;
//         }

//         case 'payment_intent.succeeded':
//           await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent, database);
//           break;

//         case 'payment_intent.payment_failed':
//           await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent, database);
//           break;

//         case 'payment_intent.canceled':
//           await handlePaymentIntentCanceled(event.data.object as Stripe.PaymentIntent, database);
//           break;

//         case 'charge.refunded':
//           ultraLogger.warn('STRIPE_WEBHOOK', 'charge.refunded', { id: objectId });
//           break;

//         case 'refund.updated':
//           ultraLogger.warn('STRIPE_WEBHOOK', 'refund.updated', { id: objectId });
//           break;

//         default:
//           ultraLogger.debug('STRIPE_WEBHOOK', "Type d'événement non géré", {
//             eventType: event.type
//           });
//       }

//       res.json({ received: true });
//     } catch (webhookError: unknown) {
//       ultraLogger.error(
//         'STRIPE_WEBHOOK',
//         'Erreur traitement webhook',
//         {
//           error: webhookError instanceof Error ? webhookError.message : String(webhookError),
//           stack: webhookError instanceof Error ? webhookError.stack : undefined
//         },
//         webhookError instanceof Error ? webhookError : undefined
//       );

//       const errorMessage = webhookError instanceof Error ? webhookError.message : 'Unknown error';
//       res.status(400).send(`Webhook Error: ${errorMessage}`);
//     }
//   })
// );

// @ts-ignore - Type compatibility issue between firebase-functions and express types
export const stripeWebhook = onRequest(
  {
    region: "europe-west1",
    memory: "512MiB",
    // P0 FIX: Add Stripe API secrets + webhook secrets + ENCRYPTION_KEY + OUTIL_SYNC_API_KEY
    secrets: [
      STRIPE_SECRET_KEY_TEST,
      STRIPE_SECRET_KEY_LIVE,
      STRIPE_WEBHOOK_SECRET_TEST,
      STRIPE_WEBHOOK_SECRET_LIVE,
      STRIPE_CONNECT_WEBHOOK_SECRET_TEST, // Connect webhook for provider KYC events
      STRIPE_CONNECT_WEBHOOK_SECRET_LIVE, // Connect webhook for provider KYC events
      ENCRYPTION_KEY, // P0 FIX: Required for decryptPhoneNumber in sendPaymentNotifications
      OUTIL_SYNC_API_KEY, // P0 FIX: Required for syncCallSessionToOutil after payment
      META_CAPI_TOKEN, // Meta Conversions API for Facebook Ads attribution
    ],
    concurrency: 1,
    timeoutSeconds: 60, // P2-4 FIX: Augmenté de 30s à 60s pour éviter les timeouts
    minInstances: 1, // P0 FIX: Garder une instance chaude pour éviter cold starts et timeouts webhook
    maxInstances: 5,
  },
  // @ts-ignore - Type compatibility issue between firebase-functions and express types
  wrapHttpFunction(
    "stripeWebhook",
    async (req: FirebaseRequest, res: Response) => {
      // ✅ STEP 1: Log webhook start
      console.log("🚀 STRIPE WEBHOOK START");
      console.log("📋 Request method:", req.method);
      console.log("📋 Content-Type:", req.headers["content-type"]);
      console.log("📋 Stripe mode:", isLive() ? "live" : "test");

      const signature = req.headers["stripe-signature"];
      console.log("🔑 Stripe signature present:", !!signature);

      if (!signature) {
        console.log("❌ STRIPE WEBHOOK ERROR: Missing signature");
        res.status(400).send("Missing signature");
        return;
      }

      const stripeInstance = getStripe();
      if (!stripeInstance) {
        console.log("❌ STRIPE WEBHOOK ERROR: Stripe not configured");
        res.status(500).send("Stripe not configured");
        return;
      }

      try {
        console.log("🔍 Initializing Firebase...");
        const database = initializeFirebase();
        console.log("✅ Firebase initialized successfully");

        // ✅ STEP 2: Raw body processing
        let rawBodyBuffer: Buffer;
        if ((req as any).rawBody && Buffer.isBuffer((req as any).rawBody)) {
          rawBodyBuffer = (req as any).rawBody;
          console.log("✅ Using direct rawBody buffer");
        } else {
          console.log("❌ No usable raw body");
          res.status(400).send("No raw body");
          return;
        }

        console.log("📦 Raw body length:", rawBodyBuffer.length);
        console.log(
          "📦 Raw body preview:",
          rawBodyBuffer.slice(0, 100).toString("utf8")
        );

        // // ✅ STEP 3: CRITICAL FIX - Use defineSecret values directly
        let webhookSecret: string;
        try {
          //   webhookSecret = isLive()
          //     ? STRIPE_WEBHOOK_SECRET_LIVE.value()  // ✅ CORRECT
          //     : STRIPE_WEBHOOK_SECRET_TEST.value(); // ✅ CORRECT

          webhookSecret = getStripeWebhookSecret();

          // P0 SECURITY FIX: Ne JAMAIS logger le secret webhook
          // Vérification silencieuse de la validité
          if (!webhookSecret || !webhookSecret.startsWith("whsec_")) {
            console.error("❌ Invalid webhook secret format");
            res.status(500).send("Invalid webhook secret configuration");
            return;
          }
          console.log("🔐 Webhook secret format validated");
        } catch (secretError) {
          console.log("❌ Secret retrieval error");
          res.status(500).send("Secret configuration error");
          return;
        }

        if (webhookSecret.length === 0) {
          console.log("❌ Secret is empty!");
          res.status(500).send("Webhook secret not set");
          return;
        }

        // ✅ STEP 4: Construct Stripe event (try both secrets: regular + Connect)
        console.log("🏗️ Constructing Stripe event...");

        const bodyString = rawBodyBuffer.toString("utf8");
        console.log("🔄 Body string length:", bodyString.length);
        console.log("🔄 Verifying webhook signature...");

        // Try regular webhook secret first, then Connect secret as fallback
        let event: Stripe.Event | null = null;
        let lastError: Error | null = null;

        // Attempt 1: Regular webhook secret
        try {
          event = stripeInstance.webhooks.constructEvent(
            bodyString,
            signature,
            webhookSecret
          );
          console.log("✅ SUCCESS with regular webhook secret");
        } catch (error1) {
          console.log("⚠️ Regular webhook secret failed, trying Connect secret...");
          lastError = error1 as Error;

          // Attempt 2: Connect webhook secret (for events from connected accounts)
          const connectWebhookSecret = getStripeConnectWebhookSecret();
          if (connectWebhookSecret && connectWebhookSecret.startsWith("whsec_")) {
            try {
              event = stripeInstance.webhooks.constructEvent(
                bodyString,
                signature,
                connectWebhookSecret
              );
              console.log("✅ SUCCESS with Connect webhook secret");
            } catch (error2) {
              console.log("❌ Connect webhook secret also failed");
              lastError = error2 as Error;
            }
          }
        }

        if (!event) {
          console.log("💥 CONSTRUCT ERROR: Both secrets failed");
          console.log(
            "💥 Error message:",
            lastError?.message || "Unknown error"
          );
          res
            .status(400)
            .send(
              `Webhook Error: ${lastError?.message || "Signature verification failed"}`
            );
          return;
        }

        console.log("✅ Event constructed:", event.type);
        console.log("✅ Event ID:", event.id);

        // ✅ STEP 5: Process the event
        const objectId = (() => {
          try {
            return (event.data.object as any)?.id || "unknown";
          } catch (e) {
            return "extraction_failed";
          }
        })();

        console.log("🎯 Processing event type:", event.type);
        console.log("🆔 Object ID:", objectId);

        ultraLogger.info("STRIPE_WEBHOOK_EVENT", "Événement Stripe validé", {
          eventType: event.type,
          eventId: event.id,
          objectId,
        });

        // ✅ P0 SECURITY FIX: Idempotency check - prevent duplicate webhook processing
        const webhookEventRef = database.collection("processed_webhook_events").doc(event.id);
        const existingEvent = await webhookEventRef.get();

        if (existingEvent.exists) {
          console.log(`⚠️ IDEMPOTENCY: Event ${event.id} already processed, skipping`);
          res.status(200).json({ received: true, duplicate: true, eventId: event.id });
          return;
        }

        // Mark event as being processed (before processing to prevent race conditions)
        await webhookEventRef.set({
          eventId: event.id,
          eventType: event.type,
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
          status: "processing",
          objectId,
        });

        // ✅ STEP 6: Event processing with comprehensive handling
        try {
          switch (event.type) {
            case "payment_intent.created":
              console.log("💳 Processing payment_intent.created");
              const piCreated = event.data.object as Stripe.PaymentIntent;
              console.log("💳 Amount:", piCreated.amount);
              console.log("💳 Currency:", piCreated.currency);
              console.log("💳 Status:", piCreated.status);
              break;

            case "payment_intent.processing":
              console.log("⏳ Processing payment_intent.processing");
              break;

            case "payment_intent.requires_action":
              console.log("❗ Processing payment_intent.requires_action");
              await handlePaymentIntentRequiresAction(
                event.data.object as Stripe.PaymentIntent,
                database
              );
              console.log("✅ Handled payment_intent.requires_action");
              break;

            // P0 FIX: Handle 3D Secure completion - reset payment status to "authorized"
            case "payment_intent.amount_capturable_updated":
              console.log("💳 Processing payment_intent.amount_capturable_updated (3D Secure completed)");
              await handlePaymentIntentAmountCapturableUpdated(
                event.data.object as Stripe.PaymentIntent,
                database
              );
              console.log("✅ Handled payment_intent.amount_capturable_updated");
              break;

            case "checkout.session.completed":
              console.log("🛒 Processing checkout.session.completed");
              const cs = event.data.object as Stripe.Checkout.Session;
              console.log("🛒 Session ID:", cs.id);
              console.log("🛒 Payment status:", cs.payment_status);
              console.log("🛒 Metadata:", cs.metadata);

              const callSessionId =
                cs.metadata?.callSessionId || cs.metadata?.sessionId;
              console.log("📞 Call session ID:", callSessionId);

              if (callSessionId) {
                console.log("📞 Updating database...");

                // todo: this is to update the status as scheduled in the call_sessions collection
                // await database
                //   .collection('call_sessions')
                //   .doc(callSessionId)
                //   .set({
                //     status: 'scheduled',
                //     scheduledAt: admin.firestore.FieldValue.serverTimestamp(),
                //     delaySeconds: 300,
                //     updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                //     checkoutSessionId: cs.id,
                //     paymentIntentId: typeof cs.payment_intent === 'string' ? cs.payment_intent : undefined
                //   }, { merge: true });

                // try {
                //   await database
                //     .collection("call_sessions")
                //     .doc(callSessionId)
                //     .update({
                //       status: "scheduled",
                //       updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                //       scheduledAt: admin.firestore.FieldValue.serverTimestamp(),
                //     });
                // } catch (error) {
                //   console.log("💥 Error updating call session:", error);
                // }

                // P0 FIX: Ne plus planifier ici - createAndScheduleCallHTTPS le fait déjà
                // Le double scheduling causait des appels en double
                // await scheduleCallTask(callSessionId, 240);
                console.log("⚠️ [checkout.session.completed] Scheduling skipped - handled by createAndScheduleCallHTTPS");

                // P0 FIX 2026-01-30: Ne plus envoyer de notifications ici - createAndScheduleCallHTTPS le fait déjà
                // L'envoi double causait des SMS en double au prestataire
                // await sendPaymentNotifications(callSessionId, database);
                console.log("⚠️ [checkout.session.completed] Notifications skipped - handled by createAndScheduleCallHTTPS");

                console.log("✅ Checkout processing complete");
              }
              break;

            case "payment_intent.succeeded":
              console.log("✅ Processing payment_intent.succeeded");
              {
                const paymentIntentData = event.data.object as Stripe.PaymentIntent;

                // Track via Meta Conversions API (CAPI) for Facebook Ads attribution
                // Use pixelEventId from metadata for deduplication with frontend Pixel
                try {
                  const capiResult = await trackStripePurchase(paymentIntentData, {
                    serviceType: paymentIntentData.metadata?.serviceType,
                    providerType: paymentIntentData.metadata?.providerType,
                    contentName: `SOS-Expat ${paymentIntentData.metadata?.serviceType || "Service"}`,
                    eventSourceUrl: "https://sos-expat.com",
                    // IMPORTANT: Use same eventId as frontend Pixel for deduplication
                    eventId: paymentIntentData.metadata?.pixelEventId,
                  });

                  if (capiResult.success) {
                    console.log("✅ [CAPI] Purchase tracked successfully", {
                      event_id: capiResult.eventId,
                      events_received: capiResult.eventsReceived,
                    });
                  } else {
                    console.warn("⚠️ [CAPI] Failed to track purchase", {
                      error: capiResult.error,
                      event_id: capiResult.eventId,
                    });
                  }
                } catch (capiError) {
                  // Log but don't fail the webhook - CAPI is non-critical
                  console.error("❌ [CAPI] Exception tracking purchase:", capiError);
                }

                await handlePaymentIntentSucceeded(paymentIntentData, database);
              }
              break;

            case "payment_intent.payment_failed":
              console.log("❌ Processing payment_intent.payment_failed");
              await handlePaymentIntentFailed(
                event.data.object as Stripe.PaymentIntent,
                database
              );
              break;

            case "payment_intent.canceled":
              console.log("🚫 Processing payment_intent.canceled");
              await handlePaymentIntentCanceled(
                event.data.object as Stripe.PaymentIntent,
                database
              );
              break;

            case "charge.refunded":
              console.log("💸 Processing charge.refunded");
              {
                const charge = event.data.object as Stripe.Charge;
                const refunds = charge.refunds?.data || [];

                // Traiter chaque remboursement de la charge
                for (const refund of refunds) {
                  // Vérifier si ce refund existe déjà dans notre collection
                  const existingRefund = await database.collection("refunds").doc(refund.id).get();

                  if (!existingRefund.exists) {
                    // Trouver le paiement associé
                    const paymentQuery = await database.collection("payments")
                      .where("stripeChargeId", "==", charge.id)
                      .limit(1)
                      .get();

                    let paymentData: any = null;
                    if (!paymentQuery.empty) {
                      paymentData = paymentQuery.docs[0].data();
                    }

                    // Créer le record de remboursement si pas déjà créé par notre API
                    await database.collection("refunds").doc(refund.id).set({
                      refundId: refund.id,
                      stripeRefundId: refund.id,
                      chargeId: charge.id,
                      paymentIntentId: charge.payment_intent as string || null,
                      amount: refund.amount,
                      amountInMainUnit: refund.amount / 100,
                      currency: refund.currency,
                      status: refund.status,
                      reason: refund.reason || "webhook_created",
                      clientId: paymentData?.clientId || null,
                      providerId: paymentData?.providerId || null,
                      sessionId: paymentData?.callSessionId || null,
                      source: "stripe_webhook",
                      createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    }, { merge: true });

                    console.log(`💸 Refund ${refund.id} recorded from webhook`);
                  }
                }

                // Créer une notification pour le client si on trouve le paiement
                if (charge.payment_intent) {
                  const paymentDoc = await database.collection("payments")
                    .doc(charge.payment_intent as string)
                    .get();

                  if (paymentDoc.exists) {
                    const payment = paymentDoc.data();
                    if (payment?.clientId) {
                      await database.collection("inapp_notifications").add({
                        uid: payment.clientId,
                        type: "refund_processed",
                        title: "Remboursement effectué",
                        message: `Votre remboursement de ${(charge.amount_refunded / 100).toFixed(2)} ${charge.currency.toUpperCase()} a été traité.`,
                        read: false,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                      });
                    }
                  }
                }
              }
              console.log("✅ Handled charge.refunded");
              break;

            // P0 FIX: Handle charge.captured for syncing captures made via Stripe Dashboard
            case "charge.captured":
              console.log("💳 Processing charge.captured");
              {
                const charge = event.data.object as Stripe.Charge;
                const paymentIntentId = charge.payment_intent as string;

                if (paymentIntentId) {
                  // Update payment document if exists
                  const paymentRef = database.collection("payments").doc(paymentIntentId);
                  const paymentDoc = await paymentRef.get();

                  if (paymentDoc.exists) {
                    const paymentData = paymentDoc.data();

                    // Only update if not already captured (avoid duplicate updates)
                    if (paymentData?.status !== "captured" && paymentData?.status !== "succeeded") {
                      await paymentRef.update({
                        status: "captured",
                        stripeChargeId: charge.id,
                        capturedAmount: charge.amount_captured,
                        capturedAt: admin.firestore.FieldValue.serverTimestamp(),
                        capturedVia: "stripe_webhook",
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                      });

                      console.log(`💳 Payment ${paymentIntentId} marked as captured via webhook`);

                      // Update call_session if exists
                      if (paymentData?.callSessionId) {
                        await database.collection("call_sessions").doc(paymentData.callSessionId).update({
                          "payment.status": "captured",
                          "payment.capturedAt": admin.firestore.FieldValue.serverTimestamp(),
                          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        });
                      }
                    }
                  } else {
                    // Payment doc doesn't exist, create a basic record
                    console.log(`⚠️ No payment doc found for ${paymentIntentId}, creating from webhook`);
                    await paymentRef.set({
                      paymentIntentId: paymentIntentId,
                      stripeChargeId: charge.id,
                      status: "captured",
                      amount: charge.amount,
                      amountCaptured: charge.amount_captured,
                      currency: charge.currency,
                      capturedAt: admin.firestore.FieldValue.serverTimestamp(),
                      capturedVia: "stripe_webhook",
                      source: "stripe_webhook",
                      createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    }, { merge: true });
                  }
                }
              }
              console.log("✅ Handled charge.captured");
              break;

            case "refund.updated":
              console.log("🔄 Processing refund.updated");
              {
                const refund = event.data.object as Stripe.Refund;

                // Mettre à jour le statut du remboursement
                await database.collection("refunds").doc(refund.id).set({
                  status: refund.status,
                  failureReason: refund.failure_reason || null,
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });

                // Si le remboursement a échoué, alerter l'admin
                if (refund.status === "failed") {
                  await database.collection("admin_alerts").add({
                    type: "refund_failed",
                    priority: "high",
                    title: "Remboursement échoué",
                    message: `Le remboursement ${refund.id} a échoué. Raison: ${refund.failure_reason || "inconnue"}`,
                    refundId: refund.id,
                    read: false,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                  });
                }
              }
              console.log("✅ Handled refund.updated");
              break;

            // ====== DISPUTE EVENTS (Chargebacks) ======
            case "charge.dispute.created":
              console.log("🚨 Processing charge.dispute.created");
              await handleDisputeCreated(
                event.data.object as Stripe.Dispute,
                database,
                stripeInstance
              );
              console.log("✅ Handled charge.dispute.created");
              break;

            case "charge.dispute.updated":
              console.log("📝 Processing charge.dispute.updated");
              await handleDisputeUpdated(
                event.data.object as Stripe.Dispute,
                database,
                stripeInstance
              );
              console.log("✅ Handled charge.dispute.updated");
              break;

            case "charge.dispute.closed":
              console.log("🏁 Processing charge.dispute.closed");
              await handleDisputeClosed(
                event.data.object as Stripe.Dispute,
                database,
                stripeInstance
              );
              console.log("✅ Handled charge.dispute.closed");
              break;

            case "account.updated": {
              console.log("🏦 Processing account.updated (Stripe Connect)");
              const account = event.data.object as Stripe.Account;

              // Trouver le provider par stripeAccountId
              const providersSnapshot = await database
                .collection("users")
                .where("stripeAccountId", "==", account.id)
                .limit(1)
                .get();

              if (!providersSnapshot.empty) {
                const providerDoc = providersSnapshot.docs[0];
                const providerData = providerDoc.data();

                // Déterminer le nouveau statut KYC
                const chargesEnabled = account.charges_enabled;
                const payoutsEnabled = account.payouts_enabled;
                const detailsSubmitted = account.details_submitted;

                let newKycStatus = providerData.kycStatus || "not_started";

                if (chargesEnabled && payoutsEnabled && detailsSubmitted) {
                  newKycStatus = "completed";
                } else if (detailsSubmitted) {
                  newKycStatus = "in_progress";
                } else if (account.requirements?.currently_due?.length) {
                  newKycStatus = "incomplete";
                }

                const updateData: Record<string, any> = {
                  "stripeAccountStatus.chargesEnabled": chargesEnabled,
                  "stripeAccountStatus.payoutsEnabled": payoutsEnabled,
                  "stripeAccountStatus.detailsSubmitted": detailsSubmitted,
                  "stripeAccountStatus.requirements": account.requirements || null,
                  "stripeAccountStatus.updatedAt": admin.firestore.FieldValue.serverTimestamp(),
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                };

                // Mettre à jour le kycStatus si changé
                if (newKycStatus !== providerData.kycStatus) {
                  updateData.kycStatus = newKycStatus;

                  // Notifier le provider si KYC complété
                  if (newKycStatus === "completed") {
                    await database.collection("inapp_notifications").add({
                      uid: providerDoc.id,
                      type: "kyc_completed",
                      title: "Vérification complète",
                      message: "Votre compte est entièrement vérifié. Vous pouvez maintenant recevoir des virements.",
                      read: false,
                      createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                  }
                }

                await providerDoc.ref.update(updateData);
                console.log(`✅ Updated provider ${providerDoc.id} KYC status: ${newKycStatus}`);

                // ===== DEFERRED TRANSFER PROCESSING =====
                // Si chargesEnabled vient de passer a true, traiter les transferts en attente
                const wasChargesEnabled = providerData.stripeAccountStatus?.chargesEnabled || providerData.chargesEnabled;

                if (chargesEnabled && !wasChargesEnabled) {
                  console.log(`💰 Provider ${providerDoc.id} just enabled charges - processing pending transfers`);

                  try {
                    const transferResult = await processPendingTransfersForProvider(
                      providerDoc.id,
                      account.id,
                      database
                    );

                    console.log(`💰 Pending transfers processed for ${providerDoc.id}:`, {
                      processed: transferResult.processed,
                      succeeded: transferResult.succeeded,
                      failed: transferResult.failed,
                    });

                    // Si des transferts ont ete traites, notifier le provider
                    if (transferResult.succeeded > 0) {
                      await database.collection("inapp_notifications").add({
                        uid: providerDoc.id,
                        type: "pending_payments_processed",
                        title: "Paiements en attente traites",
                        message: `${transferResult.succeeded} paiement(s) en attente ont ete transferes sur votre compte.`,
                        read: false,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                      });
                    }

                    // Si des transferts ont echoue, alerter l'admin
                    if (transferResult.failed > 0) {
                      await database.collection("admin_alerts").add({
                        type: "pending_transfers_partial_failure",
                        priority: "high",
                        title: "Echec partiel des transferts differes",
                        message: `${transferResult.failed} transfert(s) ont echoue pour le provider ${providerDoc.id} apres KYC complete.`,
                        providerId: providerDoc.id,
                        stripeAccountId: account.id,
                        details: transferResult,
                        read: false,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                      });
                    }
                  } catch (transferError) {
                    console.error(`❌ Error processing pending transfers for ${providerDoc.id}:`, transferError);

                    // Creer une alerte admin pour investigation
                    await database.collection("admin_alerts").add({
                      type: "pending_transfers_error",
                      priority: "critical",
                      title: "Erreur traitement transferts differes",
                      message: `Erreur lors du traitement des transferts differes pour le provider ${providerDoc.id}`,
                      providerId: providerDoc.id,
                      stripeAccountId: account.id,
                      error: transferError instanceof Error ? transferError.message : String(transferError),
                      read: false,
                      createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                  }
                }
              } else {
                console.log(`⚠️ No provider found for Stripe account: ${account.id}`);
              }
              break;
            }
            case "account.application.authorized": {
              console.log(
                "✅ [ACCOUNT.APPLICATION.AUTHORIZED] User authorized your platform"
              );
              const application = event.data.object as any;
              console.log("Application details:", {
                accountId: application.account,
                name: application.name,
              });
              break;
            }

            case "account.application.deauthorized": {
              console.log(
                "❌ [ACCOUNT.APPLICATION.DEAUTHORIZED] User disconnected account"
              );
              // L'objet est de type Application, pas Account
              const deauthorizedApp = event.data.object as { account?: string; id?: string };
              const deauthorizedAccountId = deauthorizedApp.account || deauthorizedApp.id;

              if (!deauthorizedAccountId) {
                console.log("⚠️ No account ID found in deauthorized event");
                break;
              }

              // Trouver le provider par stripeAccountId
              const deauthProvidersSnapshot = await database
                .collection("users")
                .where("stripeAccountId", "==", deauthorizedAccountId)
                .limit(1)
                .get();

              if (!deauthProvidersSnapshot.empty) {
                const providerDoc = deauthProvidersSnapshot.docs[0];

                // Désactiver le compte du provider
                await providerDoc.ref.update({
                  "stripeAccountStatus.deauthorized": true,
                  "stripeAccountStatus.deauthorizedAt": admin.firestore.FieldValue.serverTimestamp(),
                  "stripeAccountStatus.chargesEnabled": false,
                  "stripeAccountStatus.payoutsEnabled": false,
                  kycStatus: "disconnected",
                  isOnline: false, // Mettre hors ligne automatiquement
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                // Notifier le provider
                await database.collection("inapp_notifications").add({
                  uid: providerDoc.id,
                  type: "account_disconnected",
                  title: "Compte Stripe déconnecté",
                  message: "Votre compte Stripe a été déconnecté. Veuillez le reconfigurer pour recevoir des paiements.",
                  read: false,
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                // Alerte admin
                await database.collection("admin_alerts").add({
                  type: "stripe_account_deauthorized",
                  severity: "medium",
                  providerId: providerDoc.id,
                  stripeAccountId: deauthorizedAccountId,
                  message: `Le provider ${providerDoc.id} a déconnecté son compte Stripe`,
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                  resolved: false,
                });

                console.log(`✅ Disabled provider ${providerDoc.id} after Stripe deauthorization`);
              } else {
                console.log(`⚠️ No provider found for deauthorized Stripe account: ${deauthorizedAccountId}`);
              }
              break;
            }

            case "account.external_account.created":
              console.log(
                "🏦 [ACCOUNT.EXTERNAL_ACCOUNT.CREATED] Bank account added"
              );
              const externalAccount = event.data.object as any;
              console.log("External account details:", {
                accountId: externalAccount.account,
                type: externalAccount.object, // 'bank_account' or 'card'
                last4: externalAccount.last4,
                bankName: externalAccount.bank_name,
                country: externalAccount.country,
              });
              break;

            case "account.external_account.updated":
              console.log(
                "📝 [ACCOUNT.EXTERNAL_ACCOUNT.UPDATED] Bank account updated"
              );

              console.log("Updated external account:", {
                accountId: externalAccount.account,
                last4: externalAccount.last4,
              });
              break;

            // ====== SUBSCRIPTION EVENTS (IA Tool Subscriptions) ======
            // Option A: Single webhook - all subscription events handled here
            case "customer.subscription.created":
              console.log("📦 Processing customer.subscription.created (IA Subscription)");
              try {
                await handleSubscriptionCreated(
                  event.data.object as Stripe.Subscription,
                  { eventId: event.id, eventType: event.type }
                );
                console.log("✅ Handled customer.subscription.created");
              } catch (subError) {
                console.error("❌ Error in handleSubscriptionCreated:", subError);
                await addToDeadLetterQueue(event, subError as Error, { handler: "handleSubscriptionCreated" });
                throw subError;
              }
              break;

            case "customer.subscription.updated":
              console.log("🔄 Processing customer.subscription.updated (IA Subscription)");
              try {
                await handleSubscriptionUpdated(
                  event.data.object as Stripe.Subscription,
                  { eventId: event.id, eventType: event.type }
                );
                console.log("✅ Handled customer.subscription.updated");
              } catch (subError) {
                console.error("❌ Error in handleSubscriptionUpdated:", subError);
                await addToDeadLetterQueue(event, subError as Error, { handler: "handleSubscriptionUpdated" });
                throw subError;
              }
              break;

            case "customer.subscription.deleted":
              console.log("🗑️ Processing customer.subscription.deleted (IA Subscription)");
              try {
                await handleSubscriptionDeleted(
                  event.data.object as Stripe.Subscription,
                  { eventId: event.id, eventType: event.type }
                );
                console.log("✅ Handled customer.subscription.deleted");
              } catch (subError) {
                console.error("❌ Error in handleSubscriptionDeleted:", subError);
                await addToDeadLetterQueue(event, subError as Error, { handler: "handleSubscriptionDeleted" });
                throw subError;
              }
              break;

            case "customer.subscription.trial_will_end":
              console.log("⏰ Processing customer.subscription.trial_will_end");
              try {
                await handleTrialWillEnd(
                  event.data.object as Stripe.Subscription,
                  { eventId: event.id, eventType: event.type }
                );
                console.log("✅ Handled customer.subscription.trial_will_end");
              } catch (subError) {
                console.error("❌ Error in handleTrialWillEnd:", subError);
                await addToDeadLetterQueue(event, subError as Error, { handler: "handleTrialWillEnd" });
                throw subError;
              }
              break;

            case "customer.subscription.paused":
              console.log("⏸️ Processing customer.subscription.paused");
              try {
                await handleSubscriptionPaused(
                  event.data.object as Stripe.Subscription,
                  { eventId: event.id, eventType: event.type }
                );
                console.log("✅ Handled customer.subscription.paused");
              } catch (subError) {
                console.error("❌ Error in handleSubscriptionPaused:", subError);
                await addToDeadLetterQueue(event, subError as Error, { handler: "handleSubscriptionPaused" });
                throw subError;
              }
              break;

            case "customer.subscription.resumed":
              console.log("▶️ Processing customer.subscription.resumed");
              try {
                await handleSubscriptionResumed(
                  event.data.object as Stripe.Subscription,
                  { eventId: event.id, eventType: event.type }
                );
                console.log("✅ Handled customer.subscription.resumed");
              } catch (subError) {
                console.error("❌ Error in handleSubscriptionResumed:", subError);
                await addToDeadLetterQueue(event, subError as Error, { handler: "handleSubscriptionResumed" });
                throw subError;
              }
              break;

            case "invoice.created":
              console.log("📄 Processing invoice.created (Subscription)");
              try {
                await handleInvoiceCreated(
                  event.data.object as Stripe.Invoice,
                  { eventId: event.id, eventType: event.type }
                );
                console.log("✅ Handled invoice.created");
              } catch (subError) {
                console.error("❌ Error in handleInvoiceCreated:", subError);
                await addToDeadLetterQueue(event, subError as Error, { handler: "handleInvoiceCreated" });
                throw subError;
              }
              break;

            case "invoice.paid":
              console.log("💰 Processing invoice.paid (Subscription)");
              try {
                await handleInvoicePaid(
                  event.data.object as Stripe.Invoice,
                  { eventId: event.id, eventType: event.type }
                );
                console.log("✅ Handled invoice.paid");
              } catch (subError) {
                console.error("❌ Error in handleInvoicePaid:", subError);
                await addToDeadLetterQueue(event, subError as Error, { handler: "handleInvoicePaid" });
                throw subError;
              }
              break;

            case "invoice.payment_failed":
              console.log("❌ Processing invoice.payment_failed (Subscription)");
              try {
                await handleInvoicePaymentFailed(
                  event.data.object as Stripe.Invoice,
                  { eventId: event.id, eventType: event.type }
                );
                console.log("✅ Handled invoice.payment_failed");
              } catch (subError) {
                console.error("❌ Error in handleInvoicePaymentFailed:", subError);
                await addToDeadLetterQueue(event, subError as Error, { handler: "handleInvoicePaymentFailed" });
                throw subError;
              }
              break;

            case "invoice.payment_action_required":
              console.log("🔐 Processing invoice.payment_action_required (3D Secure)");
              try {
                await handleInvoicePaymentActionRequired(
                  event.data.object as Stripe.Invoice,
                  { eventId: event.id, eventType: event.type }
                );
                console.log("✅ Handled invoice.payment_action_required");
              } catch (subError) {
                console.error("❌ Error in handleInvoicePaymentActionRequired:", subError);
                await addToDeadLetterQueue(event, subError as Error, { handler: "handleInvoicePaymentActionRequired" });
                throw subError;
              }
              break;

            case "payment_method.attached":
            case "payment_method.updated":
              console.log(`💳 Processing ${event.type}`);
              try {
                await handlePaymentMethodUpdated(
                  event.data.object as Stripe.PaymentMethod,
                  { eventId: event.id, eventType: event.type }
                );
                console.log(`✅ Handled ${event.type}`);
              } catch (subError) {
                console.error(`❌ Error in handlePaymentMethodUpdated:`, subError);
                await addToDeadLetterQueue(event, subError as Error, { handler: "handlePaymentMethodUpdated" });
                throw subError;
              }
              break;

            default:
              // ===== TRANSFER EVENTS (Destination Charges) =====
              // Handle transfer events in default case for type compatibility
              if (event.type === "transfer.created") {
                console.log("💸 Processing transfer.created (Destination Charges)");
                await handleTransferCreated(
                  event.data.object as Stripe.Transfer,
                  database
                );
              } else if (event.type === "transfer.reversed") {
                console.log("🔄 Processing transfer.reversed");
                await handleTransferReversed(
                  event.data.object as Stripe.Transfer,
                  database
                );
              } else if ((event.type as string) === "transfer.failed") {
                console.log("❌ Processing transfer.failed");
                await handleTransferFailed(
                  (event.data as { object: Stripe.Transfer }).object,
                  database
                );
              } else if ((event.type as string).startsWith("transfer.")) {
                // Log any other transfer events for debugging
                console.log("📋 Unhandled transfer event:", event.type);
              } else {
                console.log("❓ Unhandled event type:", event.type);
              }
          }

          console.log("🎉 WEBHOOK SUCCESS");

          // ✅ P0 SECURITY FIX: Mark event as successfully processed
          await webhookEventRef.update({
            status: "completed",
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          ultraLogger.info(
            "STRIPE_WEBHOOK_SUCCESS",
            "Webhook traité avec succès",
            {
              eventType: event.type,
              eventId: event.id,
              objectId,
            }
          );

          res.status(200).json({
            received: true,
            eventId: event.id,
            eventType: event.type,
            objectId,
            timestamp: new Date().toISOString(),
          });
        } catch (eventHandlerError) {
          console.log("💥 EVENT HANDLER ERROR:", eventHandlerError);

          // ✅ P0 SECURITY FIX: Mark event as failed but processed
          await webhookEventRef.update({
            status: "failed",
            failedAt: admin.firestore.FieldValue.serverTimestamp(),
            error: eventHandlerError instanceof Error
              ? eventHandlerError.message
              : String(eventHandlerError),
          });

          ultraLogger.error(
            "STRIPE_WEBHOOK_HANDLER",
            "Erreur dans le gestionnaire d'événements",
            {
              eventType: event.type,
              eventId: event.id,
              error:
                eventHandlerError instanceof Error
                  ? eventHandlerError.message
                  : String(eventHandlerError),
            }
          );

          // Still return 200 to acknowledge receipt
          res.status(200).json({
            received: true,
            eventId: event.id,
            handlerError:
              eventHandlerError instanceof Error
                ? eventHandlerError.message
                : "Unknown handler error",
          });
        }
      } catch (error) {
        console.log("💥 FATAL ERROR:", error);

        ultraLogger.error(
          "STRIPE_WEBHOOK_FATAL",
          "Erreur fatale dans le webhook",
          {
            error: error instanceof Error ? error.message : String(error),
            requestInfo: {
              method: req.method,
              contentType: req.headers["content-type"],
              hasSignature: !!signature,
            },
          }
        );

        res.status(400).send(`Fatal Error: ${error}`);
      }
    }
  )
);

// Handlers Stripe
// const handlePaymentIntentSucceeded = traceFunction(async (paymentIntent: Stripe.PaymentIntent, database: admin.firestore.Firestore) => {
//   try {
//     ultraLogger.info('STRIPE_PAYMENT_SUCCEEDED', 'Paiement réussi', {
//       paymentIntentId: paymentIntent.id,
//       amount: paymentIntent.amount,
//       currency: paymentIntent.currency
//     });

//     const paymentsQuery = database.collection('payments').where('stripePaymentIntentId', '==', paymentIntent.id);
//     console.log('💳 Payments query:', paymentsQuery);
//     const paymentsSnapshot = await paymentsQuery.get();
// console.log('💳 Payments snapshot:', paymentsSnapshot);
//     if (!paymentsSnapshot.empty) {
//       console.log("i am inside not empty")
//       const paymentDoc = paymentsSnapshot.docs[0];
//       await paymentDoc.ref.update({
//         status: 'captured',
//         currency: paymentIntent.currency ?? 'eur',
//         capturedAt: admin.firestore.FieldValue.serverTimestamp(),
//         updatedAt: admin.firestore.FieldValue.serverTimestamp()
//       });

//       ultraLogger.info('STRIPE_PAYMENT_SUCCEEDED', 'Base de données mise à jour');
//     }

//     // ✅ Fallback pour retrouver callSessionId
//     let callSessionId = paymentIntent.metadata?.callSessionId || '';

//     console.log('📞 Call session ID in payment succedded: ', callSessionId);
//     if (!callSessionId) {
//       const snap = await database.collection('payments')
//         .where('stripePaymentIntentId', '==', paymentIntent.id)
//         .limit(1)
//         .get();
//       if (!snap.empty) callSessionId = (snap.docs[0].data() as any)?.callSessionId || '';
//     }

//     if (callSessionId) {
//       ultraLogger.info('STRIPE_PAYMENT_SUCCEEDED', 'Déclenchement des opérations post-paiement', {
//         callSessionId
//       });

//       await database
//         .collection('call_sessions')
//         .doc(callSessionId)
//         .set(
//           {
//             status: 'scheduled',
//             scheduledAt: admin.firestore.FieldValue.serverTimestamp(),
//             // delaySeconds: 300,
//             delaySeconds: 10,
//             updatedAt: admin.firestore.FieldValue.serverTimestamp(),
//             paymentIntentId: paymentIntent.id
//           },
//           { merge: true }
//         );

//       // await scheduleCallTask(callSessionId, 300);
//       await scheduleCallTask(callSessionId, 10);

//       ultraLogger.info('STRIPE_PAYMENT_SUCCEEDED', 'Cloud Task créée pour appel à +300s', {
//         callSessionId,
//         // delaySeconds: 300
//         delaySeconds: 10
//       });

//       // 🔔 ENVOI AUTOMATIQUE DES NOTIFICATIONS
//       await sendPaymentNotifications(callSessionId, database);
//     }

//     return true;
//   } catch (succeededError: unknown) {
//     ultraLogger.error(
//       'STRIPE_PAYMENT_SUCCEEDED',
//       'Erreur traitement paiement réussi',
//       {
//         paymentIntentId: paymentIntent.id,
//         error: succeededError instanceof Error ? succeededError.message : String(succeededError)
//       },
//       succeededError instanceof Error ? succeededError : undefined
//     );
//     return false;
//   }
// }, 'handlePaymentIntentSucceeded', 'STRIPE_WEBHOOKS');

const handlePaymentIntentSucceeded = traceFunction(
  async (
    paymentIntent: Stripe.PaymentIntent,
    database: admin.firestore.Firestore
  ) => {
    try {
      ultraLogger.info("STRIPE_PAYMENT_SUCCEEDED", "Paiement réussi", {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      });

      // Update payments collection
      try {
        const paymentsQuery = database
          .collection("payments")
          .where("stripePaymentIntentId", "==", paymentIntent.id);
        const paymentsSnapshot = await paymentsQuery.get();

        if (!paymentsSnapshot.empty) {
          console.log("✅ Updating payment document");
          const paymentDoc = paymentsSnapshot.docs[0];
          await paymentDoc.ref.update({
            status: "captured",
            currency: paymentIntent.currency ?? "eur",
            capturedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          ultraLogger.info(
            "STRIPE_PAYMENT_SUCCEEDED",
            "Base de données mise à jour"
          );
        }
      } catch (paymentUpdateError) {
        console.log(
          "⚠️ Payment update error (non-critical):",
          paymentUpdateError
        );
      }

      // Find callSessionId with multiple fallbacks
      let callSessionId = paymentIntent.metadata?.callSessionId || "";
      console.log("📞 Call session ID from metadata:", callSessionId);

      // Fallback 1: Search in payments collection
      if (!callSessionId) {
        try {
          console.log("🔍 Searching for callSessionId in payments...");
          const snap = await database
            .collection("payments")
            .where("stripePaymentIntentId", "==", paymentIntent.id)
            .limit(1)
            .get();

          if (!snap.empty) {
            const docData = snap.docs[0].data();
            console.log(
              "📄 Full document data:",
              JSON.stringify(docData, null, 2)
            );
            console.log("🔑 Available fields:", Object.keys(docData));

            callSessionId = docData?.callSessionId || "";
            console.log("✅ Extracted callSessionId:", callSessionId);
            console.log("🔍 Type of callSessionId:", typeof callSessionId);
            console.log("🔍 Length of callSessionId:", callSessionId?.length);
          } else {
            console.log(
              "❌ No payment document found for paymentIntentId:",
              paymentIntent.id
            );
          }
        } catch (searchError) {
          console.log("⚠️ Error searching payments:", searchError);
        }
      }

      if (callSessionId) {
        try {
          console.log("📞 Updating call session:", callSessionId);

          // todo: this is to update the status as scheduled in the call_sessions collection
          //  Update call session
          //  await database
          // .collection('call_sessions')
          // .doc(callSessionId)
          // .update({
          //   status: 'scheduled',
          //   scheduledAt: admin.firestore.FieldValue.serverTimestamp(),
          //   updatedAt: admin.firestore.FieldValue.serverTimestamp()
          // });

          // try {
          //   await database
          //     .collection("call_sessions")
          //     .doc(callSessionId)
          //     .update({
          //       status: "scheduled",
          //       updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          //       scheduledAt: admin.firestore.FieldValue.serverTimestamp(),
          //     });
          // } catch (error) {
          //   console.log("💥 Error updating call session:", error);
          // }

          console.log("✅ Call session found, processing...");

          // P0 FIX: Ne plus planifier ici - createAndScheduleCallHTTPS le fait déjà
          // Le double scheduling causait des appels en double
          // await scheduleCallTask(callSessionId, 240);
          console.log("⚠️ [payment_intent.succeeded] Scheduling skipped - handled by createAndScheduleCallHTTPS");

          ultraLogger.info(
            "STRIPE_PAYMENT_SUCCEEDED",
            "Paiement confirmé - scheduling déjà effectué par createAndScheduleCallHTTPS",
            {
              callSessionId,
              note: "Scheduling moved to createAndScheduleCallHTTPS to avoid duplicates"
            }
          );

          // P0 FIX 2026-01-30: Ne plus envoyer de notifications ici - createAndScheduleCallHTTPS le fait déjà
          // L'envoi double causait des SMS en double au prestataire
          // await sendPaymentNotifications(callSessionId, database);
          console.log("⚠️ [payment_intent.succeeded] Notifications skipped - handled by createAndScheduleCallHTTPS");
        } catch (notificationError) {
          console.log("⚠️ Notification processing error:", notificationError);
          // Ne pas throw ici - les notifications ne sont pas critiques
        }
      } else {
        console.log("❌ No callSessionId available after all fallbacks");
        return false;
      }

      console.log(
        "✅ Payment intent succeeded handling completed successfully"
      );
      return true;
    } catch (succeededError: unknown) {
      console.log(
        "💥 FATAL ERROR in handlePaymentIntentSucceeded:",
        succeededError
      );

      ultraLogger.error(
        "STRIPE_PAYMENT_SUCCEEDED",
        "Erreur traitement paiement réussi",
        {
          paymentIntentId: paymentIntent.id,
          error:
            succeededError instanceof Error
              ? succeededError.message
              : String(succeededError),
        },
        succeededError instanceof Error ? succeededError : undefined
      );
      return false;
    }
  },
  "handlePaymentIntentSucceeded",
  "STRIPE_WEBHOOKS"
);

const handlePaymentIntentFailed = traceFunction(
  async (
    paymentIntent: Stripe.PaymentIntent,
    database: admin.firestore.Firestore
  ) => {
    try {
      ultraLogger.warn("STRIPE_PAYMENT_FAILED", "Paiement échoué", {
        paymentIntentId: paymentIntent.id,
        errorMessage: paymentIntent.last_payment_error?.message,
      });

      const paymentsQuery = database
        .collection("payments")
        .where("stripePaymentIntentId", "==", paymentIntent.id);
      const paymentsSnapshot = await paymentsQuery.get();

      if (!paymentsSnapshot.empty) {
        const paymentDoc = paymentsSnapshot.docs[0];
        await paymentDoc.ref.update({
          status: "failed",
          currency: paymentIntent.currency ?? "eur",
          failureReason:
            paymentIntent.last_payment_error?.message || "Unknown error",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      if (paymentIntent.metadata?.callSessionId) {
        try {
          ultraLogger.info(
            "STRIPE_PAYMENT_FAILED",
            "Annulation appel programmé",
            {
              callSessionId: paymentIntent.metadata.callSessionId,
            }
          );
          const { cancelScheduledCall } = await import("./callScheduler");
          await cancelScheduledCall(
            paymentIntent.metadata.callSessionId,
            "payment_failed"
          );
        } catch (importError) {
          ultraLogger.warn(
            "STRIPE_PAYMENT_FAILED",
            "Impossible d'importer cancelScheduledCall",
            {
              error:
                importError instanceof Error
                  ? importError.message
                  : String(importError),
            }
          );
        }
      }

      return true;
    } catch (failedError: unknown) {
      ultraLogger.error(
        "STRIPE_PAYMENT_FAILED",
        "Erreur traitement échec paiement",
        {
          error:
            failedError instanceof Error
              ? failedError.message
              : String(failedError),
        },
        failedError instanceof Error ? failedError : undefined
      );
      return false;
    }
  },
  "handlePaymentIntentFailed",
  "STRIPE_WEBHOOKS"
);

const handlePaymentIntentCanceled = traceFunction(
  async (
    paymentIntent: Stripe.PaymentIntent,
    database: admin.firestore.Firestore
  ) => {
    try {
      ultraLogger.info("STRIPE_PAYMENT_CANCELED", "Paiement annulé", {
        paymentIntentId: paymentIntent.id,
        cancellationReason: paymentIntent.cancellation_reason,
      });

      const paymentsQuery = database
        .collection("payments")
        .where("stripePaymentIntentId", "==", paymentIntent.id);
      const paymentsSnapshot = await paymentsQuery.get();

      if (!paymentsSnapshot.empty) {
        const paymentDoc = paymentsSnapshot.docs[0];
        await paymentDoc.ref.update({
          status: "canceled",
          currency: paymentIntent.currency ?? "eur",
          canceledAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      if (paymentIntent.metadata?.callSessionId) {
        try {
          ultraLogger.info(
            "STRIPE_PAYMENT_CANCELED",
            "Annulation appel programmé",
            {
              callSessionId: paymentIntent.metadata.callSessionId,
            }
          );
          const { cancelScheduledCall } = await import("./callScheduler");
          await cancelScheduledCall(
            paymentIntent.metadata.callSessionId,
            "payment_canceled"
          );
        } catch (importError) {
          ultraLogger.warn(
            "STRIPE_PAYMENT_CANCELED",
            "Impossible d'importer cancelScheduledCall",
            {
              error:
                importError instanceof Error
                  ? importError.message
                  : String(importError),
            }
          );
        }
      }

      return true;
    } catch (canceledError: unknown) {
      ultraLogger.error(
        "STRIPE_PAYMENT_CANCELED",
        "Erreur traitement annulation paiement",
        {
          error:
            canceledError instanceof Error
              ? canceledError.message
              : String(canceledError),
        },
        canceledError instanceof Error ? canceledError : undefined
      );
      return false;
    }
  },
  "handlePaymentIntentCanceled",
  "STRIPE_WEBHOOKS"
);

/**
 * P1-1 FIX: Gestion complète du 3D Secure (SCA - Strong Customer Authentication)
 *
 * Ce handler est appelé quand Stripe requiert une action utilisateur (typiquement 3D Secure).
 * IMPORTANT: L'appel NE DOIT PAS être lancé tant que le paiement n'est pas confirmé.
 */
const handlePaymentIntentRequiresAction = traceFunction(
  async (
    paymentIntent: Stripe.PaymentIntent,
    database: admin.firestore.Firestore
  ) => {
    try {
      const nextActionType = paymentIntent.next_action?.type;

      ultraLogger.info(
        "STRIPE_PAYMENT_REQUIRES_ACTION",
        "Paiement nécessite une action (3D Secure)",
        {
          paymentIntentId: paymentIntent.id,
          nextAction: nextActionType,
          nextActionUrl: paymentIntent.next_action?.redirect_to_url?.url,
        }
      );

      const paymentsQuery = database
        .collection("payments")
        .where("stripePaymentIntentId", "==", paymentIntent.id);
      const paymentsSnapshot = await paymentsQuery.get();

      if (!paymentsSnapshot.empty) {
        const paymentDoc = paymentsSnapshot.docs[0];
        const paymentData = paymentDoc.data();

        // P1-1 FIX: Mettre à jour le statut ET marquer que 3D Secure est requis
        await paymentDoc.ref.update({
          status: "requires_action",
          requires3DSecure: true,
          nextActionType: nextActionType || null,
          currency: paymentIntent.currency ?? "eur",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // P1-1 FIX: Si une session d'appel existe, mettre son statut en "awaiting_payment_confirmation"
        // Cela empêche le scheduling de l'appel tant que le 3D Secure n'est pas complété
        //
        // P0 FIX 2026-01-25: Même si l'appel a déjà commencé (Adaptive Acceptance peut déclencher
        // le 3D Secure APRÈS le début de l'appel), on doit quand même marquer que le 3D Secure
        // est requis pour que le webhook amount_capturable_updated puisse mettre à jour correctement.
        const callSessionId = paymentData?.callSessionId;
        if (callSessionId) {
          try {
            const sessionRef = database.collection("call_sessions").doc(callSessionId);
            const sessionDoc = await sessionRef.get();

            if (sessionDoc.exists) {
              const sessionData = sessionDoc.data();
              const currentStatus = sessionData?.status;

              // Si le status est encore "pending" ou "scheduled", on peut bloquer l'appel
              const canBlockCall = currentStatus === "pending" || currentStatus === "scheduled";

              if (canBlockCall) {
                // Cas normal: l'appel n'a pas encore commencé - on bloque
                await sessionRef.update({
                  status: "awaiting_payment_confirmation",
                  "payment.requires3DSecure": true,
                  "payment.status": "requires_action",
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                console.log(`🔐 [3D Secure] Call session ${callSessionId} set to awaiting_payment_confirmation`);
              } else {
                // P0 FIX: Cas Adaptive Acceptance - l'appel a déjà commencé mais Stripe demande 3D Secure
                // On marque que le 3D Secure est requis SANS changer le status de session
                // Cela permet au webhook amount_capturable_updated de savoir qu'on attend une confirmation
                await sessionRef.update({
                  "payment.requires3DSecure": true,
                  "payment.status": "requires_action",
                  "payment.adaptiveAcceptance3DS": true, // Marquer que c'est via Adaptive Acceptance
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                console.log(`🔐 [3D Secure] Call session ${callSessionId} - Adaptive Acceptance 3DS required (call already ${currentStatus})`);
                console.log(`🔐 [3D Secure]   Payment status set to requires_action without changing session status`);
              }
            }
          } catch (sessionError) {
            console.error(`⚠️ [3D Secure] Error updating call session:`, sessionError);
            // Non bloquant - on continue
          }
        }

        // P1-1 FIX: Créer une notification pour informer le client
        const clientId = paymentData?.clientId;
        if (clientId) {
          try {
            await database.collection("inapp_notifications").add({
              uid: clientId,
              type: "payment_requires_action",
              title: "Vérification de paiement requise",
              body: "Votre banque demande une vérification supplémentaire. Veuillez compléter l'authentification 3D Secure pour finaliser votre paiement.",
              data: {
                paymentIntentId: paymentIntent.id,
                callSessionId: callSessionId || null,
                nextActionType: nextActionType,
              },
              read: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`📱 [3D Secure] Notification sent to client ${clientId}`);
          } catch (notifError) {
            console.error(`⚠️ [3D Secure] Error sending notification:`, notifError);
          }
        }
      }

      return true;
    } catch (actionError: unknown) {
      ultraLogger.error(
        "STRIPE_PAYMENT_REQUIRES_ACTION",
        "Erreur traitement action requise",
        {
          error:
            actionError instanceof Error
              ? actionError.message
              : String(actionError),
        },
        actionError instanceof Error ? actionError : undefined
      );
      return false;
    }
  },
  "handlePaymentIntentRequiresAction",
  "STRIPE_WEBHOOKS"
);

/**
 * P0 FIX: Handler pour payment_intent.amount_capturable_updated
 *
 * Cet événement est envoyé par Stripe quand:
 * - Le paiement avec capture_method=manual passe de "requires_action" à "requires_capture"
 * - C'est-à-dire: 3D Secure est complété avec succès
 *
 * CRITIQUE: On doit remettre call_sessions.payment.status à "authorized"
 * sinon shouldCapturePayment() retournera false et le paiement ne sera jamais capturé!
 */
const handlePaymentIntentAmountCapturableUpdated = traceFunction(
  async (
    paymentIntent: Stripe.PaymentIntent,
    database: admin.firestore.Firestore
  ) => {
    // 🔍 DEBUG P0: Log détaillé pour diagnostic
    const webhookDebugId = `3ds_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    try {
      console.log(`\n${'🔐'.repeat(40)}`);
      console.log(`🔐 [${webhookDebugId}] === payment_intent.amount_capturable_updated ===`);
      console.log(`🔐 [${webhookDebugId}] PaymentIntent ID: ${paymentIntent.id}`);
      console.log(`🔐 [${webhookDebugId}] Status: ${paymentIntent.status}`);
      console.log(`🔐 [${webhookDebugId}] Amount: ${paymentIntent.amount} ${paymentIntent.currency}`);
      console.log(`🔐 [${webhookDebugId}] Amount capturable: ${paymentIntent.amount_capturable}`);
      console.log(`🔐 [${webhookDebugId}] Capture method: ${paymentIntent.capture_method}`);
      console.log(`🔐 [${webhookDebugId}] Created: ${new Date(paymentIntent.created * 1000).toISOString()}`);
      console.log(`🔐 [${webhookDebugId}] Metadata: ${JSON.stringify(paymentIntent.metadata)}`);
      console.log(`${'🔐'.repeat(40)}\n`);

      ultraLogger.info(
        "STRIPE_AMOUNT_CAPTURABLE_UPDATED",
        "3D Secure complété - Paiement prêt à être capturé",
        {
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
          amountCapturable: paymentIntent.amount_capturable,
        }
      );

      // 1. Mettre à jour la collection payments
      const paymentsQuery = database
        .collection("payments")
        .where("stripePaymentIntentId", "==", paymentIntent.id);
      const paymentsSnapshot = await paymentsQuery.get();

      let callSessionId: string | null = null;

      if (!paymentsSnapshot.empty) {
        const paymentDoc = paymentsSnapshot.docs[0];
        const paymentData = paymentDoc.data();
        callSessionId = paymentData?.callSessionId || null;

        // Mettre à jour payments avec status = authorized (prêt pour capture)
        await paymentDoc.ref.update({
          status: "authorized",
          requires3DSecure: true, // Marquer que 3D Secure a été utilisé
          threeDSecureCompleted: true,
          amountCapturable: paymentIntent.amount_capturable,
          currency: paymentIntent.currency ?? "eur",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`✅ [3DS_COMPLETE] payments document updated to "authorized"`);
      }

      // 2. Fallback: chercher callSessionId dans les metadata
      if (!callSessionId) {
        callSessionId = paymentIntent.metadata?.callSessionId || null;
        console.log(`🔍 [3DS_COMPLETE] callSessionId from metadata: ${callSessionId}`);
      }

      // 3. CRITIQUE: Mettre à jour call_sessions.payment.status = "authorized"
      if (callSessionId) {
        try {
          const sessionRef = database.collection("call_sessions").doc(callSessionId);
          const sessionDoc = await sessionRef.get();

          if (sessionDoc.exists) {
            const sessionData = sessionDoc.data();
            const currentPaymentStatus = sessionData?.payment?.status;
            const currentSessionStatus = sessionData?.status;

            console.log(`📋 [3DS_COMPLETE] Current session status: ${currentSessionStatus}`);
            console.log(`📋 [3DS_COMPLETE] Current payment.status: ${currentPaymentStatus}`);

            // P0 FIX 2026-01-25: Élargir la condition pour couvrir le cas Adaptive Acceptance
            // Quand Stripe Radar bloque un paiement et réessaie avec 3D Secure via Adaptive Acceptance,
            // le webhook payment_intent.requires_action peut arriver APRÈS que l'appel a commencé
            // (session.status n'est plus "pending" ou "scheduled"), donc payment.status reste "authorized"
            // et n'est jamais mis à "requires_action". Dans ce cas, quand amount_capturable_updated arrive,
            // les conditions précédentes échouent et on ne met jamais à jour.
            //
            // SOLUTION: Si le PaymentIntent Stripe est en requires_capture (ce que signifie ce webhook),
            // on doit TOUJOURS s'assurer que payment.status est "authorized" pour permettre la capture.
            const shouldUpdate =
              currentPaymentStatus === "requires_action" ||
              currentSessionStatus === "awaiting_payment_confirmation" ||
              // P0 FIX: Même si payment.status est déjà "authorized", s'assurer que threeDSecureCompleted est true
              // Cela permet de savoir que le 3D Secure a été utilisé (pour analytics et debug)
              (currentPaymentStatus === "authorized" && !sessionData?.payment?.threeDSecureCompleted);

            if (shouldUpdate) {
              // Ne pas changer le status de session si l'appel est déjà en cours
              const statusUpdateRequired = currentSessionStatus === "awaiting_payment_confirmation";

              await sessionRef.update({
                // Remettre en scheduled SEULEMENT si on était en awaiting_payment_confirmation
                // Sinon, laisser le status actuel (peut être "active", "calling", etc.)
                ...(statusUpdateRequired ? { status: "scheduled" } : {}),
                "payment.status": "authorized", // CRITIQUE: permet shouldCapturePayment() de retourner true
                "payment.threeDSecureCompleted": true,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });

              console.log(`✅ [3DS_COMPLETE] call_session ${callSessionId} updated:`);
              console.log(`   - status: ${statusUpdateRequired ? 'scheduled' : currentSessionStatus} (${statusUpdateRequired ? 'changed' : 'unchanged'})`);
              console.log(`   - payment.status: authorized`);
              console.log(`   - payment.threeDSecureCompleted: true`);

              ultraLogger.info(
                "STRIPE_AMOUNT_CAPTURABLE_UPDATED",
                "Call session mis à jour après 3D Secure",
                {
                  callSessionId,
                  previousPaymentStatus: currentPaymentStatus,
                  newPaymentStatus: "authorized",
                  statusChanged: statusUpdateRequired,
                }
              );
            } else {
              console.log(`ℹ️ [3DS_COMPLETE] Session already in correct state - no update needed`);
              console.log(`   - currentPaymentStatus: ${currentPaymentStatus}`);
              console.log(`   - currentSessionStatus: ${currentSessionStatus}`);
              console.log(`   - threeDSecureCompleted: ${sessionData?.payment?.threeDSecureCompleted || false}`);
            }
          } else {
            console.log(`⚠️ [3DS_COMPLETE] Call session ${callSessionId} not found`);
          }
        } catch (sessionError) {
          console.error(`❌ [3DS_COMPLETE] Error updating call session:`, sessionError);
          // Non bloquant - on continue
        }
      } else {
        console.log(`⚠️ [3DS_COMPLETE] No callSessionId found - cannot update session`);
      }

      return true;
    } catch (error: unknown) {
      console.error(`💥 [3DS_COMPLETE] Error:`, error);
      ultraLogger.error(
        "STRIPE_AMOUNT_CAPTURABLE_UPDATED",
        "Erreur traitement amount_capturable_updated",
        {
          error: error instanceof Error ? error.message : String(error),
        },
        error instanceof Error ? error : undefined
      );
      return false;
    }
  },
  "handlePaymentIntentAmountCapturableUpdated",
  "STRIPE_WEBHOOKS"
);

// ========================================
// TRANSFER EVENT HANDLERS (Destination Charges)
// ========================================

/**
 * Handler pour transfer.created
 * Appelé quand Stripe crée automatiquement un transfert lors de la capture
 * d'un PaymentIntent avec transfer_data (Destination Charges)
 */
const handleTransferCreated = traceFunction(
  async (
    transfer: Stripe.Transfer,
    database: admin.firestore.Firestore
  ) => {
    try {
      ultraLogger.info("STRIPE_TRANSFER_CREATED", "Transfert automatique cree", {
        transferId: transfer.id,
        amount: transfer.amount,
        currency: transfer.currency,
        destination: transfer.destination,
        sourceTransaction: transfer.source_transaction,
      });

      console.log("💸 Transfer details:", {
        id: transfer.id,
        amount: transfer.amount / 100, // Convert cents to euros
        currency: transfer.currency,
        destination: transfer.destination,
        metadata: transfer.metadata,
      });

      // Extraire le callSessionId depuis les metadata du transfert ou du PaymentIntent source
      let callSessionId = transfer.metadata?.callSessionId || transfer.metadata?.sessionId || "";
      const paymentId = transfer.source_transaction as string || null;

      // Si pas de callSessionId dans metadata, chercher via paymentId
      if (!callSessionId && paymentId) {
        callSessionId = await findCallSessionByPaymentId(database, paymentId) || "";
      }

      // P1-13 FIX: Sync atomique payments <-> call_sessions
      const transferData = {
        transferId: transfer.id,
        transferStatus: "succeeded",
        transferAmount: transfer.amount,
        transferCurrency: transfer.currency,
        transferDestination: typeof transfer.destination === "string"
          ? transfer.destination
          : transfer.destination?.id || "",
        transferCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (paymentId) {
        await syncPaymentStatus(database, paymentId, callSessionId || null, transferData);
        ultraLogger.info("STRIPE_TRANSFER_CREATED", "Sync atomique payments + call_sessions", {
          paymentId,
          callSessionId: callSessionId || "unknown",
          transferId: transfer.id,
          transferStatus: "succeeded",
        });
      } else if (callSessionId) {
        // Fallback: mise à jour call_sessions uniquement si pas de paymentId
        await database.collection("call_sessions").doc(callSessionId).update({
          "payment.transferId": transfer.id,
          "payment.transferStatus": "succeeded",
          "payment.transferAmount": transfer.amount,
          "payment.transferCurrency": transfer.currency,
          "payment.transferDestination": transferData.transferDestination,
          "payment.transferCreatedAt": admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        ultraLogger.info("STRIPE_TRANSFER_CREATED", "call_sessions mis a jour (fallback)", {
          callSessionId,
          transferId: transfer.id,
        });
      }

      // Enregistrer le transfert dans la collection transfers
      await database.collection("transfers").doc(transfer.id).set({
        transferId: transfer.id,
        amount: transfer.amount,
        amountEuros: transfer.amount / 100,
        currency: transfer.currency,
        destination: transfer.destination,
        sourceTransaction: transfer.source_transaction,
        status: "succeeded",
        reversed: transfer.reversed || false,
        metadata: transfer.metadata || {},
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        stripeCreated: transfer.created,
      }, { merge: true });

      // ===== P1 FIX: Notification au provider pour le paiement reçu =====
      // Trouver le provider via le Stripe Connect account ID
      const destinationAccountId = typeof transfer.destination === "string"
        ? transfer.destination
        : transfer.destination?.id;

      if (destinationAccountId) {
        // Chercher le provider par son stripeAccountId
        const providerQuery = await database.collection("users")
          .where("stripeAccountId", "==", destinationAccountId)
          .limit(1)
          .get();

        if (!providerQuery.empty) {
          const providerId = providerQuery.docs[0].id;
          const providerData = providerQuery.docs[0].data();
          const amountFormatted = (transfer.amount / 100).toFixed(2);
          const currencySymbol = transfer.currency === "eur" ? "€" : "$";

          // Créer notification in-app
          await database.collection("inapp_notifications").add({
            uid: providerId,
            type: "payout_received",
            title: "Paiement reçu",
            message: `Vous avez reçu ${amountFormatted}${currencySymbol} pour votre consultation.`,
            amount: transfer.amount / 100,
            currency: transfer.currency,
            transferId: transfer.id,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Créer un événement message pour notification email/SMS
          await database.collection("message_events").add({
            eventId: "provider.payout.received",
            locale: providerData.preferredLanguage || providerData.language || "en",
            to: { email: providerData.email },
            context: {
              user: {
                uid: providerId,
                email: providerData.email,
                preferredLanguage: providerData.preferredLanguage || "en",
              },
            },
            vars: {
              PROVIDER_NAME: providerData.displayName || providerData.firstName || "Provider",
              AMOUNT: amountFormatted,
              CURRENCY: transfer.currency.toUpperCase(),
              CURRENCY_SYMBOL: currencySymbol,
            },
            uid: providerId,
            dedupeKey: `payout_${transfer.id}`,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          ultraLogger.info("STRIPE_TRANSFER_CREATED", "Notification payout envoyee au provider", {
            providerId,
            amount: amountFormatted,
            currency: transfer.currency,
          });
        }
      }

      return true;
    } catch (transferError: unknown) {
      ultraLogger.error(
        "STRIPE_TRANSFER_CREATED",
        "Erreur traitement transfer.created",
        {
          transferId: transfer.id,
          error:
            transferError instanceof Error
              ? transferError.message
              : String(transferError),
        },
        transferError instanceof Error ? transferError : undefined
      );
      return false;
    }
  },
  "handleTransferCreated",
  "STRIPE_WEBHOOKS"
);

/**
 * Handler pour transfer.reversed
 * Appelé quand un transfert est reverse (lors d'un remboursement avec reverse_transfer=true)
 */
const handleTransferReversed = traceFunction(
  async (
    transfer: Stripe.Transfer,
    database: admin.firestore.Firestore
  ) => {
    try {
      ultraLogger.info("STRIPE_TRANSFER_REVERSED", "Transfert reverse", {
        transferId: transfer.id,
        amount: transfer.amount,
        amountReversed: transfer.amount_reversed,
        destination: transfer.destination,
        reversed: transfer.reversed,
      });

      console.log("🔄 Transfer reversed:", {
        id: transfer.id,
        amountOriginal: transfer.amount / 100,
        amountReversed: transfer.amount_reversed / 100,
        fullyReversed: transfer.reversed,
      });

      // Chercher la session liee a ce transfert
      const transferDoc = await database.collection("transfers").doc(transfer.id).get();

      let callSessionId = "";
      if (transferDoc.exists) {
        const transferData = transferDoc.data();
        callSessionId = transferData?.callSessionId || transferData?.metadata?.callSessionId || "";
      }

      // Fallback: chercher via les metadata du transfert
      if (!callSessionId) {
        callSessionId = transfer.metadata?.callSessionId || transfer.metadata?.sessionId || "";
      }

      // Fallback: chercher via source_transaction dans payments
      if (!callSessionId && transfer.source_transaction) {
        const paymentQuery = await database
          .collection("payments")
          .where("stripePaymentIntentId", "==", transfer.source_transaction)
          .limit(1)
          .get();

        if (!paymentQuery.empty) {
          callSessionId = paymentQuery.docs[0].data().callSessionId || "";
        }
      }

      if (callSessionId) {
        // Determiner si le transfert est completement reverse ou partiellement
        const isFullyReversed = transfer.reversed;
        const newStatus = isFullyReversed ? "reversed" : "partially_reversed";

        await database.collection("call_sessions").doc(callSessionId).update({
          "payment.transferStatus": newStatus,
          "payment.transferAmountReversed": transfer.amount_reversed,
          "payment.transferReversedAt": admin.firestore.FieldValue.serverTimestamp(),
          "payment.transferFullyReversed": isFullyReversed,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        ultraLogger.info("STRIPE_TRANSFER_REVERSED", "call_sessions mis a jour avec transferStatus reversed", {
          callSessionId,
          transferId: transfer.id,
          transferStatus: newStatus,
          amountReversed: transfer.amount_reversed,
        });
      }

      // Mettre a jour la collection transfers
      await database.collection("transfers").doc(transfer.id).update({
        status: transfer.reversed ? "reversed" : "partially_reversed",
        reversed: transfer.reversed,
        amountReversed: transfer.amount_reversed,
        reversedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return true;
    } catch (reverseError: unknown) {
      ultraLogger.error(
        "STRIPE_TRANSFER_REVERSED",
        "Erreur traitement transfer.reversed",
        {
          transferId: transfer.id,
          error:
            reverseError instanceof Error
              ? reverseError.message
              : String(reverseError),
        },
        reverseError instanceof Error ? reverseError : undefined
      );
      return false;
    }
  },
  "handleTransferReversed",
  "STRIPE_WEBHOOKS"
);

/**
 * Handler pour transfer.failed
 * Appelé quand un transfert echoue (compte prestataire invalide, etc.)
 */
const handleTransferFailed = traceFunction(
  async (
    transfer: Stripe.Transfer,
    database: admin.firestore.Firestore
  ) => {
    try {
      ultraLogger.error("STRIPE_TRANSFER_FAILED", "Transfert echoue", {
        transferId: transfer.id,
        amount: transfer.amount,
        destination: transfer.destination,
        metadata: transfer.metadata,
      });

      console.log("❌ Transfer failed:", {
        id: transfer.id,
        amount: transfer.amount / 100,
        destination: transfer.destination,
      });

      // Chercher la session liee
      let callSessionId = transfer.metadata?.callSessionId || transfer.metadata?.sessionId || "";

      if (!callSessionId && transfer.source_transaction) {
        const paymentQuery = await database
          .collection("payments")
          .where("stripePaymentIntentId", "==", transfer.source_transaction)
          .limit(1)
          .get();

        if (!paymentQuery.empty) {
          callSessionId = paymentQuery.docs[0].data().callSessionId || "";
        }
      }

      if (callSessionId) {
        await database.collection("call_sessions").doc(callSessionId).update({
          "payment.transferStatus": "failed",
          "payment.transferFailedAt": admin.firestore.FieldValue.serverTimestamp(),
          "payment.transferError": "Transfer failed - provider account may be invalid",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        ultraLogger.info("STRIPE_TRANSFER_FAILED", "call_sessions mis a jour avec transferStatus failed", {
          callSessionId,
          transferId: transfer.id,
        });

        // Alerter pour action manuelle requise
        ultraLogger.error(
          "STRIPE_TRANSFER_FAILED",
          "ACTION REQUISE: Transfert echoue, verifier le compte prestataire",
          {
            callSessionId,
            transferId: transfer.id,
            destination: transfer.destination,
          }
        );
      }

      // Enregistrer l'echec dans la collection transfers
      await database.collection("transfers").doc(transfer.id).set({
        transferId: transfer.id,
        amount: transfer.amount,
        amountEuros: transfer.amount / 100,
        currency: transfer.currency,
        destination: transfer.destination,
        sourceTransaction: transfer.source_transaction,
        status: "failed",
        failedAt: admin.firestore.FieldValue.serverTimestamp(),
        metadata: transfer.metadata || {},
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        stripeCreated: transfer.created,
        requiresManualReview: true,
      }, { merge: true });

      // Enregistrer comme fond non reclame
      if (callSessionId) {
        try {
          const { UnclaimedFundsManager, UNCLAIMED_FUNDS_CONFIG } = await import("./UnclaimedFundsManager");
          const manager = new UnclaimedFundsManager(database);

          // Recuperer les infos de la session
          const sessionDoc = await database.collection("call_sessions").doc(callSessionId).get();
          const sessionData = sessionDoc.data();

          if (sessionData) {
            await manager.registerUnclaimedFund({
              paymentIntentId: sessionData.payment?.paymentIntentId || transfer.source_transaction as string,
              chargeId: transfer.source_transaction as string,
              callSessionId,
              totalAmount: sessionData.payment?.amount || transfer.amount,
              providerAmount: transfer.amount,
              platformAmount: (sessionData.payment?.amount || transfer.amount) - transfer.amount,
              currency: transfer.currency,
              clientId: sessionData.clientId,
              providerId: sessionData.providerId,
              reason: UNCLAIMED_FUNDS_CONFIG.REASONS.TRANSFER_FAILED,
              reasonDetails: `Transfer ${transfer.id} failed to destination ${transfer.destination}`,
            });
            console.log("✅ Unclaimed fund registered for failed transfer:", transfer.id);
          }
        } catch (unclaimedError) {
          console.error("⚠️ Failed to register unclaimed fund:", unclaimedError);
          // Ne pas bloquer le flux principal
        }
      }

      return true;
    } catch (failError: unknown) {
      ultraLogger.error(
        "STRIPE_TRANSFER_FAILED",
        "Erreur traitement transfer.failed",
        {
          transferId: transfer.id,
          error:
            failError instanceof Error
              ? failError.message
              : String(failError),
        },
        failError instanceof Error ? failError : undefined
      );
      return false;
    }
  },
  "handleTransferFailed",
  "STRIPE_WEBHOOKS"
);

// ========================================
// FONCTIONS CRON POUR MAINTENANCE
// ========================================
// NOTE: scheduledFirestoreExport a été supprimé - utiliser scheduledBackup de ./scheduledBackup
// qui inclut checksums, counts de collections et meilleur monitoring

export const scheduledCleanup = onSchedule(
  {
    region: "europe-west1",
    memory: "256MiB",
    cpu: 0.25,
    maxInstances: 1,
    minInstances: 0,
    concurrency: 1,
    schedule: "0 3 * * 0",
    timeZone: "Europe/Paris",
  },
  async () => {
    const metadata = createDebugMetadata("scheduledCleanup");
    logFunctionStart(metadata);

    try {
      ultraLogger.info("SCHEDULED_CLEANUP", "Démarrage nettoyage périodique");

      const twilioCallManager = await getTwilioCallManager();

      ultraLogger.debug("SCHEDULED_CLEANUP", "Configuration nettoyage", {
        olderThanDays: 90,
        keepCompletedDays: 30,
        batchSize: 100,
      });

      const cleanupResult = await twilioCallManager.cleanupOldSessions({
        olderThanDays: 90,
        keepCompletedDays: 30,
        batchSize: 100,
      });

      ultraLogger.info("SCHEDULED_CLEANUP", "Nettoyage terminé", {
        deleted: cleanupResult.deleted,
        errors: cleanupResult.errors,
      });

      const database = initializeFirebase();
      await database
        .collection("logs")
        .doc("cleanup")
        .collection("entries")
        .add({
          type: "scheduled_cleanup",
          result: cleanupResult,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

      logFunctionEnd(metadata, cleanupResult);
    } catch (cleanupError: unknown) {
      ultraLogger.error(
        "SCHEDULED_CLEANUP",
        "Erreur nettoyage périodique",
        {
          error:
            cleanupError instanceof Error
              ? cleanupError.message
              : String(cleanupError),
          stack: cleanupError instanceof Error ? cleanupError.stack : undefined,
        },
        cleanupError instanceof Error ? cleanupError : undefined
      );

      const errorMessage =
        cleanupError instanceof Error ? cleanupError.message : "Unknown error";
      const database = initializeFirebase();

      await database
        .collection("logs")
        .doc("cleanup")
        .collection("entries")
        .add({
          type: "scheduled_cleanup",
          status: "failed",
          error: errorMessage,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

      logFunctionEnd(
        metadata,
        undefined,
        cleanupError instanceof Error
          ? cleanupError
          : new Error(String(cleanupError))
      );
    }
  }
);

// ========================================
// FONCTION DE DEBUG SYSTÈME - DISABLED FOR PRODUCTION
// ========================================
// DISABLED: Dev/test function - not needed in production, reduces Cloud Run services
/*
export const generateSystemDebugReport = onCall(
  {
    ...emergencyConfig,
    timeoutSeconds: 120,
  },
  wrapCallableFunction(
    "generateSystemDebugReport",
    async (request: CallableRequest<Record<string, never>>) => {
      if (!(await checkAdminAccess(request)) || !request.auth) {
        throw new HttpsError("permission-denied", "Admin access required");
      }

      ultraLogger.info(
        "SYSTEM_DEBUG_REPORT",
        "Génération rapport de debug système"
      );

      try {
        const database = initializeFirebase();

        const ultraDebugReport = await ultraLogger.generateDebugReport();

        const systemInfo = {
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || "development",
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          cpuUsage: process.cpuUsage(),
          env: {
            FUNCTION_NAME: process.env.FUNCTION_NAME,
            FUNCTION_REGION: process.env.FUNCTION_REGION,
            GCLOUD_PROJECT: process.env.GCLOUD_PROJECT,
            NODE_ENV: process.env.NODE_ENV,
          },
        };

        const managersState = {
          stripeManagerInstance: !!stripeManagerInstance,
          twilioCallManagerInstance: !!twilioCallManagerInstance,
          messageManagerInstance: !!messageManagerInstance,
          firebaseInitialized: isFirebaseInitialized,
        };

        const recentErrorsQuery = await database
          .collection("ultra_debug_logs")
          .where("level", "==", "ERROR")
          .where(
            "timestamp",
            ">=",
            new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
          )
          .orderBy("timestamp", "desc")
          .limit(50)
          .get();

        const recentErrors = recentErrorsQuery.docs.map((doc) => doc.data());

        const fullReport = {
          systemInfo,
          managersState,
          recentErrors: recentErrors.length,
          recentErrorDetails: recentErrors.slice(0, 10),
          ultraDebugReport: JSON.parse(ultraDebugReport),
        };

        // const reportId = `debug_report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const reportId = `debug_report_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        await database
          .collection("debug_reports")
          .doc(reportId)
          .set({
            ...fullReport,
            generatedBy: request.auth.uid,
            generatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

        ultraLogger.info(
          "SYSTEM_DEBUG_REPORT",
          "Rapport de debug généré et sauvegardé",
          {
            reportId,
            errorsCount: recentErrors.length,
          }
        );

        return {
          success: true,
          reportId,
          summary: {
            systemUptime: systemInfo.uptime,
            recentErrorsCount: recentErrors.length,
            managersLoaded: Object.values(managersState).filter(Boolean).length,
            memoryUsage: (systemInfo as any).memoryUsage.heapUsed,
          },
          downloadUrl: `/admin/debug-reports/${reportId}`,
        };
      } catch (error) {
        ultraLogger.error(
          "SYSTEM_DEBUG_REPORT",
          "Erreur génération rapport debug",
          { error: error instanceof Error ? error.message : String(error) },
          error instanceof Error ? error : undefined
        );

        throw new HttpsError("internal", "Failed to generate debug report");
      }
    }
  )
);
*/

// ========================================
// FONCTION DE MONITORING EN TEMPS RÉEL - DISABLED FOR PRODUCTION
// ========================================
// DISABLED: Dev/test function - not needed in production, reduces Cloud Run services
/*
export const getSystemHealthStatus = onCall(
  {
    ...emergencyConfig,
    timeoutSeconds: 30,
  },
  wrapCallableFunction(
    "getSystemHealthStatus",
    async (request: CallableRequest<Record<string, never>>) => {
      if (!(await checkAdminAccess(request))) {
        throw new HttpsError("permission-denied", "Admin access required");
      }

      ultraLogger.debug("SYSTEM_HEALTH_CHECK", "Vérification état système");

      try {
        const database = initializeFirebase();
        const startTime = Date.now();

        const firestoreTest = Date.now();
        await database.collection("_health_check").limit(1).get();
        const firestoreLatency = Date.now() - firestoreTest;

        let stripeStatus: "not_configured" | "healthy" | "error" =
          "not_configured";
        let stripeLatency = 0;
        try {
          const stripeInstance = getStripe();
          if (stripeInstance) {
            const stripeTest = Date.now();
            await stripeInstance.paymentIntents.list({ limit: 1 });
            stripeLatency = Date.now() - stripeTest;
            stripeStatus = "healthy";
          }
        } catch (stripeError) {
          stripeStatus = "error";
          ultraLogger.warn("SYSTEM_HEALTH_CHECK", "Erreur test Stripe", {
            error:
              stripeError instanceof Error
                ? stripeError.message
                : String(stripeError),
          });
        }

        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentLogsQuery = await database
          .collection("ultra_debug_logs")
          .where("timestamp", ">=", last24h.toISOString())
          .get();

        const logsByLevel = {
          ERROR: 0,
          WARN: 0,
          INFO: 0,
          DEBUG: 0,
          TRACE: 0,
        };

        recentLogsQuery.docs.forEach((doc) => {
          const data = doc.data() as any;
          if (Object.prototype.hasOwnProperty.call(logsByLevel, data.level)) {
            (logsByLevel as any)[data.level]++;
          }
        });

        const totalResponseTime = Date.now() - startTime;

        const healthStatus = {
          timestamp: new Date().toISOString(),
          status: "healthy" as "healthy" | "degraded" | "unhealthy" | "error",
          services: {
            firebase: {
              status: "healthy",
              latency: firestoreLatency,
              initialized: isFirebaseInitialized,
            },
            stripe: {
              status: stripeStatus,
              latency: stripeLatency,
            },
          },
          managers: {
            stripeManager: !!stripeManagerInstance,
            twilioCallManager: !!twilioCallManagerInstance,
            messageManager: !!messageManagerInstance,
          },
          system: {
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            nodeVersion: process.version,
            environment: process.env.NODE_ENV || "development",
          },
          metrics: {
            last24h: logsByLevel,
            responseTime: totalResponseTime,
          },
        };

        if (firestoreLatency > 1000 || stripeStatus === "error") {
          (healthStatus as any).status = "degraded";
        }
        if ((logsByLevel as any).ERROR > 100) {
          (healthStatus as any).status = "unhealthy";
        }

        ultraLogger.debug("SYSTEM_HEALTH_CHECK", "État système vérifié", {
          status: (healthStatus as any).status,
          responseTime: totalResponseTime,
          errorsLast24h: (logsByLevel as any).ERROR,
        });

        return healthStatus;
      } catch (error) {
        ultraLogger.error(
          "SYSTEM_HEALTH_CHECK",
          "Erreur vérification état système",
          { error: error instanceof Error ? error.message : String(error) },
          error instanceof Error ? error : undefined
        );

        return {
          timestamp: new Date().toISOString(),
          status: "error" as const,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }
  )
);
*/

// ========================================
// LOGS DEBUG ULTRA - DISABLED FOR PRODUCTION
// ========================================
// DISABLED: Dev/test function - excessive Cloud Run services
/*
export const getUltraDebugLogs = onCall(
  {
    ...emergencyConfig,
    timeoutSeconds: 30,
  },
  wrapCallableFunction(
    "getUltraDebugLogs",
    async (request: CallableRequest<{ limit?: number; level?: string }>) => {
      if (!(await checkAdminAccess(request))) {
        throw new HttpsError("permission-denied", "Admin access required");
      }

      const { limit = 100, level } = request.data || {};

      try {
        const database = initializeFirebase();
        let query: FirebaseFirestore.Query = database
          .collection("ultra_debug_logs")
          .orderBy("timestamp", "desc")
          .limit(Math.min(limit, 500));

        if (
          level &&
          ["ERROR", "WARN", "INFO", "DEBUG", "TRACE"].includes(level)
        ) {
          query = query.where("level", "==", level);
        }

        const snapshot = await query.get();
        const logs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        return {
          success: true,
          logs,
          count: logs.length,
          filtered: !!level,
        };
      } catch (error) {
        ultraLogger.error(
          "GET_ULTRA_DEBUG_LOGS",
          "Erreur récupération logs",
          { error: error instanceof Error ? error.message : String(error) },
          error instanceof Error ? error : undefined
        );

        throw new HttpsError("internal", "Failed to retrieve logs");
      }
    }
  )
);
*/

// ========================================
// FONCTIONS DE TEST ET UTILITAIRES - DISABLED FOR PRODUCTION
// ========================================
// DISABLED: Dev/test functions - not needed in production, reduces Cloud Run services
/*
export const testCloudTasksConnection = onCall(
  {
    ...emergencyConfig,
    timeoutSeconds: 60,
  },
  wrapCallableFunction(
    "testCloudTasksConnection",
    async (
      request: CallableRequest<{ testPayload?: Record<string, unknown> }>
    ) => {
      if (!(await checkAdminAccess(request))) {
        throw new HttpsError("permission-denied", "Admin access required");
      }

      try {
        ultraLogger.info("TEST_CLOUD_TASKS", "Test de connexion Cloud Tasks");

        const { createTestTask } = await import("./lib/tasks");
        const testPayload = request.data?.testPayload || {
          test: "cloud_tasks_connection",
        };

        const taskId = await createTestTask(testPayload, 10);

        ultraLogger.info(
          "TEST_CLOUD_TASKS",
          "Tâche de test créée avec succès",
          {
            taskId,
            delaySeconds: 10,
          }
        );

        return {
          success: true,
          taskId,
          message: "Tâche de test créée, elle s'exécutera dans 10 secondes",
          testPayload,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        ultraLogger.error(
          "TEST_CLOUD_TASKS",
          "Erreur test Cloud Tasks",
          { error: error instanceof Error ? error.message : String(error) },
          error instanceof Error ? error : undefined
        );

        throw new HttpsError(
          "internal",
          `Test Cloud Tasks échoué: ${error instanceof Error ? error.message : error}`
        );
      }
    }
  )
);

export const getCloudTasksQueueStats = onCall(
  {
    ...emergencyConfig,
    timeoutSeconds: 30,
  },
  wrapCallableFunction(
    "getCloudTasksQueueStats",
    async (request: CallableRequest<Record<string, never>>) => {
      if (!(await checkAdminAccess(request))) {
        throw new HttpsError("permission-denied", "Admin access required");
      }

      try {
        ultraLogger.info(
          "QUEUE_STATS",
          "Récupération statistiques queue Cloud Tasks"
        );

        const { getQueueStats, listPendingTasks } = await import("./lib/tasks");

        const [stats, pendingTasks] = await Promise.all([
          getQueueStats(),
          listPendingTasks(20),
        ]);

        ultraLogger.info("QUEUE_STATS", "Statistiques récupérées", {
          pendingTasksCount: (stats as any).pendingTasks,
          queueName: (stats as any).queueName,
          location: (stats as any).location,
        });

        return {
          success: true,
          stats,
          pendingTasksSample: pendingTasks,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        ultraLogger.error(
          "QUEUE_STATS",
          "Erreur récupération statistiques queue",
          { error: error instanceof Error ? error.message : String(error) },
          error instanceof Error ? error : undefined
        );

        throw new HttpsError(
          "internal",
          `Erreur récupération stats: ${error instanceof Error ? error.message : error}`
        );
      }
    }
  )
);

export const manuallyTriggerCallExecution = onCall(
  {
    ...emergencyConfig,
    timeoutSeconds: 60,
  },
  wrapCallableFunction(
    "manuallyTriggerCallExecution",
    async (request: CallableRequest<{ callSessionId: string }>) => {
      if (!(await checkAdminAccess(request)) || !request.auth) {
        throw new HttpsError("permission-denied", "Admin access required");
      }

      const { callSessionId } = request.data;

      if (!callSessionId) {
        throw new HttpsError("invalid-argument", "callSessionId requis");
      }

      try {
        ultraLogger.info(
          "MANUAL_CALL_TRIGGER",
          "Déclenchement manuel d'appel",
          {
            callSessionId,
            triggeredBy: request.auth.uid,
          }
        );

        const database = initializeFirebase();
        const sessionDoc = await database
          .collection("call_sessions")
          .doc(callSessionId)
          .get();

        if (!sessionDoc.exists) {
          throw new HttpsError(
            "not-found",
            `Session ${callSessionId} introuvable`
          );
        }

        const sessionData = sessionDoc.data();

        ultraLogger.info("MANUAL_CALL_TRIGGER", "Session trouvée", {
          callSessionId,
          currentStatus: sessionData?.status,
          paymentStatus: (sessionData as any)?.payment?.status,
        });

        const { TwilioCallManager } = await import("./TwilioCallManager");

        const result = await (TwilioCallManager as any).startOutboundCall({
          sessionId: callSessionId,
          delayMinutes: 0,
        });

        ultraLogger.info("MANUAL_CALL_TRIGGER", "Appel déclenché avec succès", {
          callSessionId,
          resultStatus: (result as any)?.status,
        });

        return {
          success: true,
          callSessionId,
          result,
          triggeredBy: request.auth.uid,
          timestamp: new Date().toISOString(),
          message: "Appel déclenché manuellement avec succès",
        };
      } catch (error) {
        ultraLogger.error(
          "MANUAL_CALL_TRIGGER",
          "Erreur déclenchement manuel d'appel",
          {
            callSessionId,
            error: error instanceof Error ? error.message : String(error),
            triggeredBy: request.auth.uid,
          },
          error instanceof Error ? error : undefined
        );

        throw new HttpsError(
          "internal",
          `Erreur déclenchement appel: ${error instanceof Error ? error.message : error}`
        );
      }
    }
  )
);

// ========================================
// WEBHOOK DE TEST POUR CLOUD TASKS
// ========================================
export const testWebhook = onRequest(
  {
    region: "europe-west1",
    memory: "256MiB",
    cpu: 0.1,
    minInstances: 0,
    concurrency: 1,
    timeoutSeconds: 60,
  },
  // @ts-ignore - Type compatibility issue between firebase-functions and express types

  wrapHttpFunction(
    "testWebhook",
    async (_req: FirebaseRequest, res: Response) => {
      try {
        res.status(200).json({ ok: true, now: new Date().toISOString() });
      } catch (e: any) {
        res.status(500).json({ ok: false, error: String(e?.message ?? e) });
      }
    }
  )
);
*/

// ========== SYSTEME EN LIGNE/HORS LIGNE ==========
export { checkProviderInactivity } from './scheduled/checkProviderInactivity';
export { updateProviderActivity } from './callables/updateProviderActivity';
export { setProviderOffline } from './callables/setProviderOffline';

// ========== NETTOYAGE SESSIONS ORPHELINES ==========
// ✅ CRITICAL: Cette fonction nettoie les sessions d'appel bloquées
// Elle s'exécute toutes les heures et nettoie:
// - Sessions "pending" depuis plus de 60 minutes
// - Sessions "connecting" depuis plus de 45 minutes
// - Prestataires "busy" depuis plus de 2 heures sans session active
export { cleanupOrphanedSessions } from './scheduled/cleanupOrphanedSessions';

// ========== CLEANUP AGENT TASKS ORPHELINES ==========
// Nettoie les tasks agents orphelines pour éviter memory exhaustion
// Elle s'exécute toutes les heures et nettoie:
// - Tasks en "IN_PROGRESS" depuis plus de 30 minutes (stuck)
// - Tasks schedulées non exécutées depuis plus de 2 heures
// - error_logs plus vieux que 30 jours (TTL)
// - agent_tasks completées plus vieilles que 7 jours
// - agent_states avec currentTasks orphelines
export { cleanupOrphanedAgentTasks } from './scheduled/cleanupOrphanedAgentTasks';

// ========== NETTOYAGE FICHIERS TEMPORAIRES STORAGE ==========
// ÉCONOMIE: ~300€/mois - Supprime les fichiers temp (registration_temp/, temp_profiles/)
// qui ne sont jamais nettoyés automatiquement après 24h
export { cleanupTempStorageFiles } from './scheduled/cleanupTempStorageFiles';

// Fonctions admin pour nettoyage manuel
export {
  adminCleanupOrphanedSessions,
  adminGetOrphanedSessionsStats,
} from './callables/adminCleanupOrphanedSessions';

// Fonctions admin pour nettoyage des prestataires orphelins (multi-provider system)
export {
  adminCleanupOrphanedProviders,
  adminGetOrphanedProvidersStats,
} from './callables/adminCleanupOrphanedProviders';

// ========== ALERTES DISPONIBILITE PRESTATAIRES ==========
export {
  checkLowProviderAvailability,
  getProviderAvailabilityStats
} from './scheduled/checkLowProviderAvailability';

// ========== DEAD LETTER QUEUE - WEBHOOK RETRY SYSTEM ==========
export {
  processWebhookDLQ,
  cleanupWebhookDLQ,
  adminForceRetryDLQEvent,
  adminGetDLQStats
} from './scheduled/processDLQ';

// ========== TWILIO RECORDINGS BACKUP - SUPPRIME ==========
// Les fonctions de backup recording ont ete supprimees car l'enregistrement
// des appels est desactive pour conformite RGPD (commit 12a83a9)
// Fonctions supprimees: backupTwilioRecordings, retryFailedTwilioBackups,
//                       triggerTwilioBackup, getTwilioBackupStats

// ========== PHONE NUMBER ENCRYPTION MIGRATION ==========
export {
  migratePhoneEncryption,
  getEncryptionStatus,
  generateEncryptionKey
} from './scheduled/migrateEncryption';

// ========== FIREBASE AUTH BACKUP ==========
export {
  backupFirebaseAuth,
  cleanupOldAuthBackups,
  triggerAuthBackup,
  listAuthBackups
} from './scheduled/backupAuth';

// ========== FIREBASE AUTH RESTORE ==========
export {
  restoreFirebaseAuth,
  listRestorableAuthBackups,
  validateAuthBackup,
  restoreSingleUser
} from './admin/restoreFirebaseAuth';

// ========== FIRESTORE COLLECTION RESTORE ==========
export {
  importCollectionFromBackup,
  listAvailableBackups,
  restoreCollectionDocuments,
  verifyCollectionIntegrity,
  exportCollectionToJson,
  importCollectionFromJson
} from './admin/restoreCollection';

// ========== SYSTEM MONITORING & ALERTS ==========
export {
  runSystemHealthCheck,
  cleanupOldAlerts,
  getActiveAlerts,
  acknowledgeAlert,
  getSystemHealthSummary
} from './monitoring/criticalAlerts';

// ========== DISASTER RECOVERY TESTS ==========
export {
  runMonthlyDRTest,
  runDRTestManual,
  listDRReports
} from './scheduled/disasterRecoveryTest';

// ========== GDPR AUDIT TRAIL ==========
export {
  requestDataExport,
  requestAccountDeletion,
  getMyDataAccessHistory,
  updateConsentPreferences,
  listGDPRRequests,
  processGDPRRequest,
  getUserAuditTrail
} from './gdpr/auditTrail';

// ========== SEO - AUTO-INDEXATION ==========
export * from './seo';

// ========== SITEMAP GENERATOR (Advanced 3-level system) ==========
export { generateSitemaps, onProviderChange, scheduledSitemapGeneration } from './sitemap';

// ========== META DYNAMIC ADS - PROVIDER CATALOG FEED ==========
// HTTP endpoint: https://europe-west1-sos-expat.cloudfunctions.net/providerCatalogFeed
// Generates CSV feed of active providers for Facebook Product Catalog
export { providerCatalogFeed, generateProviderFeed } from './providerCatalogFeed';

// ========== TRANSLATION FUNCTIONS ==========
// DISABLED 2026-01-31: Provider translation system temporarily disabled
// To re-enable: uncomment these exports AND set PROVIDER_TRANSLATION: true in featureFlags.ts
// export * from './translation/translateProvider';
// export * from './translation/initializeProviderTranslation';
// export * from './translation/updateProviderTranslation';

// ========== EMAIL MARKETING AUTOMATION (MailWizz) ==========
export { handleUserRegistration } from './emailMarketing/functions/userLifecycle';
export {
  handleReviewSubmitted,
  handleCallCompleted,
  handlePaymentReceived,
  handlePaymentFailed,
  handlePayoutRequested,
  handlePayoutSent,
} from './emailMarketing/functions/transactions';
export {
  handleProfileCompleted,
  handleUserLogin,
  handleProviderOnlineStatus,
  handleKYCVerification,
  handlePayPalConfiguration,
} from './emailMarketing/functions/profileLifecycle';
export {
  stopAutoresponders,
  stopAutorespondersForUser,
} from './emailMarketing/functions/stopAutoresponders';
export { detectInactiveUsers } from './emailMarketing/functions/inactiveUsers';

// ============================================
// SUBSCRIPTION FUNCTIONS
// ============================================

// Checkout
export { createSubscriptionCheckout } from './subscription/checkout';

// Gestion abonnement provider
export { cancelSubscription, reactivateSubscription } from './subscription/cancelSubscription';
export { getBillingPortalUrl } from './subscription/billingPortal';

// Acces et usage IA
// P0 FIX: checkAndIncrementAiUsage est la nouvelle fonction atomique recommandée
export {
  checkAiAccess,
  incrementAiUsage,
  checkAndIncrementAiUsage,  // P0 FIX: Fonction atomique pour éviter race conditions
  getSubscriptionDetails
} from './subscription/accessControl';

// Subscription constants (P0 FIX: Constantes centralisées)
export {
  SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_TIERS,
  DEFAULT_TRIAL_CONFIG,
  DEFAULT_GRACE_PERIOD_DAYS,
  FAIR_USE_LIMIT,
  isValidSubscriptionStatus,
  isValidSubscriptionTier
} from './subscription/constants';
export type { SubscriptionStatus, SubscriptionTier } from './subscription/constants';

// Admin functions
export {
  adminForceAiAccess,
  adminResetQuota,
  adminChangePlan,
  adminCancelSubscription,
  adminGetSubscriptionStats,
  adminSyncStripePrices,
  adminGetProviderSubscriptionHistory
} from './subscription/adminFunctions';

// Scheduled tasks
export {
  resetMonthlyQuotas,
  checkPastDueSubscriptions,
  sendQuotaAlerts,
  cleanupExpiredTrials
} from './subscription/scheduledTasks';

// Stripe sync
export {
  syncSubscriptionPlansToStripe,
  onSubscriptionPlanPricingUpdate, // Trigger automatique: sync prix vers Stripe
} from './subscription/stripeSync';

// Webhook handlers (exported for testing and direct use)
export {
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleTrialWillEnd,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
  webhookHandlers,
} from './subscription/webhooks';

// AI Subscription System - Legacy aliases for backward compatibility
// P0 FIX: Removed stripeWebhook as subscriptionStripeWebhook - causes conflict with main stripeWebhook in index.ts
// The main stripeWebhook (line 1814) handles ALL Stripe events including subscriptions
export {
  createSubscription as subscriptionCreate,
  updateSubscription as subscriptionUpdate,
  cancelSubscription as subscriptionCancel,
  reactivateSubscription as subscriptionReactivate,
  createStripePortalSession as subscriptionPortal,
  checkAiQuota as subscriptionCheckQuota,
  recordAiCall as subscriptionRecordCall,
  // stripeWebhook as subscriptionStripeWebhook, // P0 FIX: REMOVED - conflict with main webhook
  updateTrialConfig as subscriptionUpdateTrialConfig,
  updatePlanPricing as subscriptionUpdatePlanPricing,
  // V2 functions with proper CORS support (for admin IA tab)
  updateTrialConfigV2 as subscriptionUpdateTrialConfigV2,
  updatePlanPricingV2 as subscriptionUpdatePlanPricingV2,
  initializeSubscriptionPlans as subscriptionInitializePlans,
  // P1 FIX: resetMonthlyAiQuotas REMOVED - duplicate of resetMonthlyQuotas in scheduledTasks.ts
  setFreeAiAccess as subscriptionSetFreeAccess,
  createAnnualStripePrices,
  createMonthlyStripePrices,
  migrateSubscriptionPlansTo9Languages as subscriptionMigrateTo9Languages
} from './subscription';

// Dunning System - Automatic Payment Retry
export { processDunningQueue } from './subscriptions/dunning';

export {
  handleEmailOpen,
  handleEmailClick,
  handleEmailBounce,
  handleEmailComplaint,
  handleUnsubscribe,
} from './emailMarketing/functions/webhooks';

// ========== HELP CENTER FAQ GENERATION ==========
export {
  onHelpArticleCreated,
  onHelpArticleUpdated,
} from './helpCenter/generateFAQ';

// ========== HELP CENTER ARTICLES INITIALIZATION ==========
export {
  initSingleHelpArticle,
  initHelpArticlesBatch,
  checkHelpCategories,
  clearHelpArticles,
} from './helpCenter/initHelpArticles';

// ========== INVOICE DOWNLOAD URL GENERATION ==========
export const generateInvoiceDownloadUrl = onCall(
  {
    ...emergencyConfig,
    timeoutSeconds: 30,
  },
  wrapCallableFunction(
    "generateInvoiceDownloadUrl",
    async (request: CallableRequest<{ invoiceId: string }>) => {
      const database = initializeFirebase();
      const storageInstance = admin.storage();

      ultraLogger.info(
        "GENERATE_INVOICE_DOWNLOAD_URL",
        "Génération d'une nouvelle URL de téléchargement",
        {
          invoiceId: request.data.invoiceId,
          userId: request.auth?.uid,
        }
      );

      if (!request.data.invoiceId) {
        throw new HttpsError("invalid-argument", "invoiceId is required");
      }

      try {
        // Get invoice record
        const invoiceDoc = await database
          .collection("invoice_records")
          .doc(request.data.invoiceId)
          .get();

        if (!invoiceDoc.exists) {
          ultraLogger.warn(
            "GENERATE_INVOICE_DOWNLOAD_URL",
            "Invoice not found",
            { invoiceId: request.data.invoiceId }
          );
          throw new HttpsError("not-found", "Invoice not found");
        }

        const invoiceData = invoiceDoc.data();
        if (!invoiceData) {
          throw new HttpsError("not-found", "Invoice data not found");
        }

        // Extract file path from existing URL or construct it
        let filePath: string;
        const existingUrl = invoiceData.downloadUrl as string;
        const invoiceNumber = invoiceData.invoiceNumber as string;
        const invoiceType = invoiceData.type as string | undefined;

        if (existingUrl) {
          // Try to extract path from URL
          // URL format: https://storage.googleapis.com/BUCKET_NAME/invoices/FILENAME?...
          // or: https://storage.googleapis.com/BUCKET_NAME/invoices/TYPE/YEAR/MONTH/FILENAME?...
          const urlMatch = existingUrl.match(/\/invoices\/([^?]+)/);
          if (urlMatch && urlMatch[1]) {
            filePath = `invoices/${urlMatch[1]}`;
          } else if (invoiceNumber) {
            // Fallback: try common patterns
            filePath = `invoices/${invoiceNumber}.txt`;
          } else {
            throw new HttpsError(
              "invalid-argument",
              "Cannot determine file path from URL or invoice number"
            );
          }
        } else if (invoiceNumber) {
          // Construct from invoice number - try multiple patterns
          // Pattern 1: invoices/INVOICE_NUMBER.txt
          // Pattern 2: invoices/TYPE/YEAR/MONTH/INVOICE_NUMBER.pdf
          const now = new Date();
          const year = now.getFullYear();
          const month = now.getMonth() + 1;
          
          if (invoiceType) {
            // Try the structured path first
            filePath = `invoices/${invoiceType}/${year}/${month}/${invoiceNumber}.pdf`;
          } else {
            // Fallback to simple path
            filePath = `invoices/${invoiceNumber}.txt`;
          }
        } else {
          throw new HttpsError(
            "invalid-argument",
            "Cannot determine file path: missing URL and invoice number"
          );
        }

        ultraLogger.debug(
          "GENERATE_INVOICE_DOWNLOAD_URL",
          "File path determined",
          { filePath, invoiceId: request.data.invoiceId }
        );

        // Get file from storage
        const bucket = storageInstance.bucket();
        let file = bucket.file(filePath);

        // Check if file exists, try alternative paths if needed
        let [exists] = await file.exists();
        if (!exists && invoiceNumber) {
          // Try alternative paths
          const alternativePaths = [
            `invoices/${invoiceNumber}.txt`,
            `invoices/${invoiceNumber}.pdf`,
          ];
          
          if (invoiceType) {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth() + 1;
            alternativePaths.push(
              `invoices/${invoiceType}/${year}/${month}/${invoiceNumber}.pdf`,
              `invoices/${invoiceType}/${year}/${month}/${invoiceNumber}.txt`
            );
            // Also try previous months (in case invoice was created last month)
            const prevMonth = month === 1 ? 12 : month - 1;
            const prevYear = month === 1 ? year - 1 : year;
            alternativePaths.push(
              `invoices/${invoiceType}/${prevYear}/${prevMonth}/${invoiceNumber}.pdf`,
              `invoices/${invoiceType}/${prevYear}/${prevMonth}/${invoiceNumber}.txt`
            );
          }
          
          // Try each alternative path
          for (const altPath of alternativePaths) {
            if (altPath === filePath) continue; // Skip the one we already tried
            const altFile = bucket.file(altPath);
            const [altExists] = await altFile.exists();
            if (altExists) {
              filePath = altPath;
              file = altFile;
              exists = true;
              ultraLogger.info(
                "GENERATE_INVOICE_DOWNLOAD_URL",
                "Found file at alternative path",
                { originalPath: filePath, foundPath: altPath }
              );
              break;
            }
          }
        }
        
        if (!exists) {
          ultraLogger.warn(
            "GENERATE_INVOICE_DOWNLOAD_URL",
            "File not found in storage",
            { filePath, invoiceId: request.data.invoiceId, invoiceNumber }
          );
          throw new HttpsError("not-found", "Invoice file not found in storage");
        }

        // Generate new signed URL (valid for 7 days)
        const [newUrl] = await file.getSignedUrl({
          action: "read",
          expires: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
        });

        // Update invoice record with new URL
        await database
          .collection("invoice_records")
          .doc(request.data.invoiceId)
          .update({
            downloadUrl: newUrl,
            urlGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

        ultraLogger.info(
          "GENERATE_INVOICE_DOWNLOAD_URL",
          "New download URL generated successfully",
          {
            invoiceId: request.data.invoiceId,
            filePath,
          }
        );

        return { downloadUrl: newUrl };
      } catch (error) {
        ultraLogger.error(
          "GENERATE_INVOICE_DOWNLOAD_URL",
          "Error generating download URL",
          {
            invoiceId: request.data.invoiceId,
            error: error instanceof Error ? error.message : String(error),
          },
          error instanceof Error ? error : undefined
        );

        if (error instanceof HttpsError) {
          throw error;
        }

        throw new HttpsError(
          "internal",
          `Failed to generate download URL: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  )
);

// ========== SYNC SOS_PROFILES TO OUTIL-SOS-EXPAT ==========
export {
  onSosProfileCreated,
  onSosProfileUpdated,
} from './triggers/syncSosProfilesToOutil';

// ========== P0 FIX: SYNC USER EMAIL TO SOS_PROFILES ==========
// Synchronise automatiquement les changements d'email de users vers sos_profiles
// Résout le problème où l'email modifié dans ProfileEdit n'était pas synchronisé
export { onUserEmailUpdated } from './triggers/syncUserEmailToSosProfiles';

// ========== P0 FIX: SYNC ACCESS TO OUTIL-SOS-EXPAT ==========
// Synchronise forcedAIAccess et freeTrialUntil vers Outil pour l'acces IA
export { onUserAccessUpdated } from './triggers/syncAccessToOutil';

// ========== AUTOMATIC STRIPE EXPRESS ACCOUNT CREATION ==========
export { onProviderCreated } from './triggers/onProviderCreated';

// ========== SYNC ROLE TO CUSTOM CLAIMS (CRITICAL FOR AUTH) ==========
// Ces triggers synchronisent le rôle Firestore avec les Custom Claims Firebase
// Sans cela, les Firestore Rules qui vérifient request.auth.token.role ne fonctionnent pas
export { onUserCreatedSyncClaims, onUserUpdatedSyncClaims } from './triggers/syncRoleClaims';

// ========== META CAPI TRACKING TRIGGERS ==========
// These triggers send server-side conversion events to Meta CAPI
// for accurate attribution even when browser tracking is blocked
export {
  onBookingRequestCreatedTrackLead,
  onUserCreatedTrackRegistration,
  onCallSessionPaymentAuthorized,
  onContactSubmittedTrackLead,
} from './triggers/capiTracking';

// ========== GOOGLE ADS CONVERSION TRACKING ==========
// These triggers send server-side conversion events to Google Ads API
// for accurate attribution with Enhanced Conversions
export {
  onBookingRequestCreatedTrackGoogleAdsLead,
  onUserCreatedTrackGoogleAdsSignUp,
  onCallSessionPaymentAuthorizedTrackGoogleAdsCheckout,
} from './triggers/googleAdsTracking';

// ========== SYNC BOOKINGS TO OUTIL-SOS-EXPAT (AI TRIGGER) ==========
export { onBookingRequestCreated, retryOutilSync } from './triggers/syncBookingsToOutil';

// ========== REVERSE SYNC: RECEIVE UPDATES FROM OUTIL-SOS-EXPAT ==========
export { syncFromOutil } from './triggers/syncFromOutil';

// ========== MIGRATIONS ==========
// DISABLED 2026-01-30: One-time migration - removed to free Cloud Run quota
// export { migrateProvidersToUid } from './migrations/migrateProvidersToUid';

// ========== SSO - AUTHENTICATION CROSS-PROJECT ==========
export { generateOutilToken } from './auth/generateOutilToken';

// ========== ADMIN CLAIMS ==========
export { setAdminClaims, initializeAdminClaims, bootstrapFirstAdmin } from './auth/setAdminClaims';

// ========== RESTORE USER ROLES (BUG FIX 30/12/2025) ==========
// Scripts de restauration pour corriger les rôles perdus suite aux bugs
// des commits a756c14 et 06efdb3 (defaultAuthContext + cold starts)
export { restoreUserRoles, syncAllCustomClaims, checkUserRole } from './admin/restoreUserRoles';

// ========== PASSWORD RESET (CUSTOM BRANDED EMAIL) ==========
export { sendCustomPasswordResetEmail } from './auth/passwordReset';

// ========== STORAGE CONFIGURATION (ADMIN) ==========
export {
  enableStorageVersioning,
  configureStorageLifecycle,
  getStorageConfig
} from './admin/enableStorageVersioning';

// ========== PAYMENT MONITORING (PHASE 4) ==========
// Surveillance spécifique des flux de paiement Stripe/PayPal/Twilio
export {
  runPaymentHealthCheck,
  collectDailyPaymentMetrics,
  cleanupOldPaymentAlerts,
  getPaymentAlerts,
  resolvePaymentAlert,
  getPaymentMetrics
} from './monitoring/paymentMonitoring';

// ========== FUNCTIONAL MONITORING (Synthetics) ==========
// Monitoring des parcours critiques: inscription, réservation, paiement, tracking
export {
  runFunctionalHealthCheck,
  runCriticalFunctionalCheck,
  cleanupFunctionalData,
  getFunctionalAlerts,
  resolveFunctionalAlert,
  getFunctionalHealthSummary,
  triggerFunctionalCheck
} from './monitoring/functionalMonitoring';

// Cost monitoring
export { getCostMetrics } from "./monitoring/getCostMetrics";

// Firebase/GCP usage monitoring
export { getFirebaseUsage } from "./monitoring/getFirebaseUsage";

// GCP Billing Costs (detailed breakdown by service, region, SKU)
export { getGcpBillingCosts } from "./monitoring/getGcpBillingCosts";

// Agent monitoring dashboard
export { getAgentMetrics, saveAgentMetricsHistory } from "./monitoring/getAgentMetrics";

// OpenAI usage monitoring
export { getOpenAIUsage } from "./monitoring/getOpenAIUsage";

// Perplexity usage monitoring
export { getPerplexityUsage } from "./monitoring/getPerplexityUsage";

// Anthropic usage monitoring
export { getAnthropicUsage } from "./monitoring/getAnthropicUsage";

// Twilio balance monitoring
export { getTwilioBalance } from "./monitoring/getTwilioBalance";

// Stripe balance monitoring
export { getStripeBalance } from "./monitoring/getStripeBalance";

// Service Balance Alerts - Low balance monitoring for external services
export {
  // Scheduled function (runs hourly)
  checkServiceBalances,
  // Callable functions
  getServiceBalanceAlerts,
  acknowledgeServiceBalanceAlert,
  updateServiceBalanceThreshold,
  getServiceBalanceThresholds,
  triggerServiceBalanceCheck,
  // Types
  type ServiceType as ServiceBalanceServiceType,
  type AlertLevel as ServiceBalanceAlertLevel,
  type ServiceBalanceThreshold,
  type ServiceBalanceAlert,
} from "./monitoring/serviceAlerts";

// Unified Analytics - Centralized analytics aggregation
export {
  getUnifiedAnalytics,
  getHistoricalAnalytics,
  aggregateDailyAnalytics,
  cleanupOldAnalytics,
} from "./analytics";

// Connection logging system - tracks logins, logouts, API access, admin actions
export {
  logConnection,
  getConnectionLogs,
  getConnectionStats,
  onUserSignIn,
  onUserDeletedConnectionLog,
  logConnectionV1,
  // Helper functions for server-side logging
  logAdminAction,
  logServiceConnection,
  createApiAccessLogger,
  // Types
  type ConnectionEventType,
  type ConnectionService,
  type ConnectionLog,
  type ConnectionLogsFilter,
  type ConnectionStats,
  type GeoLocation,
  type DeviceInfo,
} from "./monitoring/connectionLogs";

// ========== TAX THRESHOLD TRACKING SYSTEM ==========
// Surveillance des seuils fiscaux internationaux (OSS EU, UK VAT, CH TVA, etc.)
export {
  // Triggers on payments (renamed to avoid conflict with previously deployed HTTPS functions)
  thresholdOnPaymentCreate,
  thresholdOnPaymentUpdate,
  // Scheduled functions
  checkThresholdsDaily,
  sendWeeklyThresholdReport,
  // Callable functions for admin dashboard
  getThresholdDashboard,
  getCountryThreshold,
  // DISABLED 2026-01-30: Country rotation removed to free quota
  // markCountryAsRegistered,
  acknowledgeThresholdAlert,
  // DISABLED 2026-01-30: One-time init - removed to free quota
  // initializeThresholdTracking,
  triggerThresholdRecalculation,
} from './thresholds';

// ========== MIGRATIONS ==========
// DISABLED 2026-01-30: One-time migrations - removed to free Cloud Run quota
// export { migrateProviderSlugs } from './migrations/migrateProviderSlugs';

// ========== PROVIDER PROFILE VALIDATION WORKFLOW ==========
// Complete validation workflow for provider profiles (lawyers/expats)
// Includes: submission, assignment, approval, rejection, change requests
export {
  submitForValidation,
  assignValidation,
  approveProfile,
  rejectProfile,
  requestChanges,
  getValidationQueue,
  getValidationHistory,
  resubmitForValidation,
  onValidationCreated,
  onValidationDecision,
} from './admin/profileValidation';

// ========== PROVIDER ACTIONS (ADMIN) ==========
// Actions to manage providers: hide, block, suspend, delete (soft & GDPR hard delete)
export {
  hideProvider,
  unhideProvider,
  blockProvider,
  unblockProvider,
  suspendProvider,
  unsuspendProvider,
  softDeleteProvider,
  hardDeleteProvider,
  bulkHideProviders,
  // DISABLED: bulkUnhideProviders - use unhideProvider for individual ops
  bulkBlockProviders,
  // DISABLED: bulkUnblockProviders - use unblockProvider for individual ops
  bulkSuspendProviders,
  // DISABLED: bulkUnsuspendProviders - use unsuspendProvider for individual ops
  bulkDeleteProviders,
  getProviderActionLogs,
  getAllProviderActionLogs,
} from './admin/providerActions';

// ========== USER DOCUMENT CREATION (GOOGLE AUTH FIX) ==========
// Cloud Function to create user documents using Admin SDK (bypasses security rules)
// This fixes the "Missing or insufficient permissions" error when creating user documents
// after Google OAuth authentication where token propagation to Firestore may be delayed.
interface CreateUserDocumentData {
  uid: string;
  email: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  photoURL?: string;
  role: 'client' | 'lawyer' | 'expat';
  provider: string;
  isVerified?: boolean;
  preferredLanguage?: string;
  phone?: string;
  phoneCountryCode?: string;
  country?: string;
  currentCountry?: string;
  practiceCountries?: string[];
  interventionCountries?: string[];
  bio?: string;
  specialties?: string[];
  languages?: string[];
  barNumber?: string;
  barAssociation?: string;
  yearsOfExperience?: number;
  hourlyRate?: number;
  profilePhoto?: string;
}

export const createUserDocument = onCall(
  {
    ...emergencyConfig,
    timeoutSeconds: 30,
  },
  wrapCallableFunction(
    "createUserDocument",
    async (request: CallableRequest<CreateUserDocumentData>) => {
      const database = initializeFirebase();

      // Verify authentication
      if (!request.auth) {
        ultraLogger.warn("CREATE_USER_DOC", "Unauthenticated request rejected");
        throw new HttpsError("unauthenticated", "Authentication required");
      }

      const { uid, email, role, provider } = request.data;

      // Verify the authenticated user is creating their OWN document (no impersonation)
      if (request.auth.uid !== uid) {
        ultraLogger.warn("CREATE_USER_DOC", "UID mismatch - possible impersonation attempt", {
          authUid: request.auth.uid,
          requestedUid: uid,
        });
        throw new HttpsError("permission-denied", "Cannot create document for another user");
      }

      // Validate required fields
      if (!uid || !email || !role) {
        throw new HttpsError("invalid-argument", "uid, email, and role are required");
      }

      // Validate role
      if (!['client', 'lawyer', 'expat'].includes(role)) {
        throw new HttpsError("invalid-argument", "Invalid role. Must be client, lawyer, or expat");
      }

      ultraLogger.info("CREATE_USER_DOC", "Creating user document via Cloud Function", {
        uid,
        email,
        role,
        provider,
      });

      try {
        const now = admin.firestore.FieldValue.serverTimestamp();

        // Determine names
        const firstName = request.data.firstName || (request.data.displayName?.split(' ')[0]) || '';
        const lastName = request.data.lastName || (request.data.displayName?.split(' ').slice(1).join(' ')) || '';
        const fullName = request.data.fullName || `${firstName} ${lastName}`.trim() || request.data.displayName || '';

        // Auto-approve Google client accounts
        const isGoogleProvider = provider === 'google.com';
        const isClientRole = role === 'client';
        const shouldAutoApprove = isClientRole && isGoogleProvider;

        const approvalFields = shouldAutoApprove
          ? {
              isApproved: true,
              approvalStatus: 'approved',
              isVisible: true,
              verificationStatus: 'verified',
            }
          : {
              isApproved: false,
              approvalStatus: 'pending',
              isVisible: false,
              verificationStatus: 'pending',
            };

        // Base user data
        const userData = {
          uid,
          email,
          emailLower: email.toLowerCase(),
          displayName: request.data.displayName || fullName || null,
          firstName,
          lastName,
          fullName,
          photoURL: request.data.photoURL || null,
          profilePhoto: request.data.profilePhoto || request.data.photoURL || '/default-avatar.png',
          avatar: request.data.photoURL || '/default-avatar.png',
          role,
          provider,
          isVerified: request.data.isVerified ?? false,
          isVerifiedEmail: request.data.isVerified ?? false,
          isActive: true,
          preferredLanguage: request.data.preferredLanguage || 'fr',
          createdAt: now,
          updatedAt: now,
          lastLoginAt: now,
          ...approvalFields,
        };

        // Create user document
        const userRef = database.collection('users').doc(uid);
        const existingUserDoc = await userRef.get();

        if (existingUserDoc.exists) {
          // User already exists - just update lastLoginAt
          await userRef.update({
            lastLoginAt: now,
            updatedAt: now,
            isActive: true,
          });

          ultraLogger.info("CREATE_USER_DOC", "User document already exists, updated lastLoginAt", { uid });

          return {
            success: true,
            action: 'updated',
            uid,
          };
        }

        // Create new user document
        await userRef.set(userData);

        ultraLogger.info("CREATE_USER_DOC", "User document created successfully", { uid, role });

        // For lawyers/expats, also create sos_profiles document
        if (role === 'lawyer' || role === 'expat') {
          const sosRef = database.collection('sos_profiles').doc(uid);
          const existingSosDoc = await sosRef.get();

          if (!existingSosDoc.exists) {
            const sosData = {
              id: uid,
              uid,
              type: role,
              role,
              email,
              emailLower: email.toLowerCase(),
              firstName,
              lastName,
              fullName,
              name: fullName,
              displayName: fullName,
              profilePhoto: request.data.profilePhoto || request.data.photoURL || '/default-avatar.png',
              photoURL: request.data.photoURL || '/default-avatar.png',
              avatar: request.data.photoURL || '/default-avatar.png',
              phone: request.data.phone || null,
              phoneNumber: request.data.phone || null,
              phoneCountryCode: request.data.phoneCountryCode || null,
              country: request.data.country || request.data.currentCountry || '',
              currentCountry: request.data.currentCountry || request.data.country || '',
              currentPresenceCountry: request.data.currentCountry || request.data.country || '',
              practiceCountries: request.data.practiceCountries || [],
              interventionCountries: request.data.interventionCountries || [],
              bio: request.data.bio || '',
              specialties: request.data.specialties || [],
              languages: request.data.languages || ['fr'],
              barNumber: request.data.barNumber || '',
              barAssociation: request.data.barAssociation || '',
              yearsOfExperience: request.data.yearsOfExperience || 0,
              hourlyRate: request.data.hourlyRate || 0,
              isAvailable: false,
              isOnline: false,
              ...approvalFields,
              createdAt: now,
              updatedAt: now,
            };

            await sosRef.set(sosData);
            ultraLogger.info("CREATE_USER_DOC", "sos_profiles document created for provider", { uid, role });
          }
        }

        return {
          success: true,
          action: 'created',
          uid,
          role,
        };

      } catch (error: any) {
        ultraLogger.error("CREATE_USER_DOC", "Failed to create user document", {
          uid,
          error: error.message,
          code: error.code,
        });
        throw new HttpsError("internal", `Failed to create user document: ${error.message}`);
      }
    }
  )
);

// ========== P1-4 & P1-5: PAYPAL MAINTENANCE ==========
// - cleanupUncapturedPayPalOrders: Nettoie les orders > 24h non capturés (toutes les 6h)
// - sendPayoutSuccessEmail: Trigger email quand payout passe à SUCCESS
export {
  cleanupUncapturedPayPalOrders,
  sendPayoutSuccessEmail,
} from './scheduled/paypalMaintenance';

// ========== AFFILIATE SYSTEM ==========
// Complete affiliate/referral program with commissions and payouts
export {
  // Triggers
  affiliateOnUserCreated,
  affiliateOnCallCompleted,
  affiliateOnSubscriptionCreated,
  affiliateOnSubscriptionRenewed,
  // User callables
  getMyAffiliateData,
  updateBankDetails,
  requestWithdrawal,
  // Admin callables
  adminUpdateAffiliateConfig,
  getAffiliateGlobalStats,
  // Admin payout processing
  adminProcessPayoutWise,
  adminProcessPayoutManual,
  adminRejectPayout,
  adminApprovePayout,
  adminGetPendingPayouts,
  // Scheduled
  affiliateReleaseHeldCommissions,
  // Webhooks
  wiseWebhook,
  // Initialization
  // DISABLED 2026-01-30: One-time init - removed to free quota
  // initializeAffiliateConfig,
  resetAffiliateConfigToDefaults,
} from './affiliate';

// ========== CHATTER SYSTEM ==========
// Chatter ambassador program with client referrals and provider recruitment
export {
  // Triggers
  chatterOnChatterCreated,
  chatterOnQuizPassed,
  chatterOnCallCompleted,
  chatterOnProviderRegistered,
  chatterOnClientRegistered,
  chatterOnChatterEarningsUpdated,
  // User callables
  registerChatter,
  submitQuiz,
  getQuizQuestions,
  getChatterDashboard,
  getChatterLeaderboard,
  chatterRequestWithdrawal,
  updateChatterProfile,
  getReferralDashboard,
  // Country Rotation callables
  // DISABLED 2026-01-30: Country rotation system removed to free quota
  // getAvailableCountriesForChatter,
  // assignCountriesToCurrentChatter,
  // Posts callables
  submitPost,
  getMyPosts,
  // Groups callables
  submitGroup,
  getAvailableGroups,
  getMyGroups,
  joinGroupAsChatter,
  // Zoom callables
  // DISABLED 2026-01-30: Zoom integration removed to free quota
  // getZoomMeetings,
  // recordZoomAttendance,
  // getMyZoomAttendances,
  // Admin callables
  adminGetChattersList,
  adminGetChatterDetail,
  adminProcessChatterWithdrawal,
  adminUpdateChatterStatus,
  adminGetPendingChatterWithdrawals,
  adminGetChatterConfig,
  adminUpdateChatterConfig,
  adminGetChatterLeaderboard,
  adminExportChatters,
  adminBulkChatterAction,
  // Admin Country Rotation
  // DISABLED 2026-01-30: Country rotation system removed to free quota
  // adminInitializeCountryRotation,
  // adminGetCountryRotationStatus,
  adminAdvanceCycle,
  adminUpdateCycleThreshold,
  // Admin Posts
  adminGetPendingPosts,
  adminModeratePost,
  // Admin Groups
  adminGetGroups,
  adminUpdateGroupStatus,
  // Admin Zoom
  // DISABLED 2026-01-30: Zoom integration removed to free quota
  // adminCreateZoomMeeting,
  // adminUpdateZoomMeeting,
  // adminGetZoomMeetings,
  // adminGetMeetingAttendees,
  adminUpdateMeetingStatus,
  // Admin Referral System
  adminGetReferralStats,
  adminGetReferralTree,
  adminGetEarlyAdopters,
  adminUpdateEarlyAdopterQuota,
  // DISABLED 2026-01-30: One-time init - removed to free quota
  // adminInitializeAllEarlyAdopterCounters,
  adminGetReferralFraudAlerts,
  adminReviewFraudAlert,
  adminGetReferralCommissions,
  // Admin Promotions
  adminGetPromotions,
  adminCreatePromotion,
  adminUpdatePromotion,
  adminDeletePromotion,
  adminGetPromotionStats,
  adminDuplicatePromotion,
  // Scheduled
  chatterValidatePendingCommissions,
  chatterReleaseValidatedCommissions,
  chatterMonthlyRecurringCommissions,
  chatterValidatePendingReferralCommissions,
  // Initialization
  // DISABLED 2026-01-30: One-time init functions - removed to free quota
  // initializeChatterConfig,
  resetChatterConfigToDefaults,
  // initializeChatterSystem,
  // Training callables
  getChatterTrainingModules,
  getChatterTrainingModuleContent,
  updateChatterTrainingProgress,
  submitChatterTrainingQuiz,
  getChatterTrainingCertificate,
  // Admin Training callables
  adminGetChatterTrainingModules,
  adminCreateChatterTrainingModule,
  adminUpdateChatterTrainingModule,
  adminDeleteChatterTrainingModule,
  // DISABLED 2026-01-30: One-time seed - removed to free quota
  // adminSeedChatterTrainingModules,
  adminReorderChatterTrainingModules,
} from './chatter';

// ========== INFLUENCER SYSTEM ==========
// Influencer program with client referrals (5% discount) and provider recruitment
// NOTE: Unlike Chatters, Influencers have NO quiz, NO levels, fixed commissions
export {
  // Triggers
  influencerOnInfluencerCreated,
  influencerOnCallCompleted,
  influencerOnProviderRegistered,
  influencerOnProviderCallCompleted,
  // User callables
  registerInfluencer,
  getInfluencerDashboard,
  updateInfluencerProfile,
  influencerRequestWithdrawal,
  getInfluencerLeaderboard,
  // Admin callables
  adminGetInfluencersList,
  adminGetInfluencerDetail,
  adminProcessInfluencerWithdrawal,
  adminUpdateInfluencerStatus,
  adminGetPendingInfluencerWithdrawals,
  adminGetInfluencerConfig,
  adminUpdateInfluencerConfig,
  adminGetInfluencerLeaderboard,
  // Scheduled
  influencerValidatePendingCommissions,
  influencerReleaseValidatedCommissions,
  // Initialization
  initializeInfluencerConfig,
  // Training callables
  getInfluencerTrainingModules,
  getInfluencerTrainingModuleContent,
  updateInfluencerTrainingProgress,
  submitInfluencerTrainingQuiz,
  getInfluencerTrainingCertificate,
  // Admin Training callables
  adminGetInfluencerTrainingModules,
  adminCreateInfluencerTrainingModule,
  adminUpdateInfluencerTrainingModule,
  adminDeleteInfluencerTrainingModule,
  // DISABLED 2026-01-30: One-time seed - removed to free quota
  // adminSeedInfluencerTrainingModules,
} from './influencer';

// ========== BLOGGER SYSTEM ==========
// Blogger partner program with FIXED commissions ($10 client, $5 recruitment)
// KEY DIFFERENCES: No quiz, no levels, no bonuses, 0% client discount, definitive role
// EXCLUSIVE FEATURES: Resources section, Integration Guide
export {
  // Triggers
  onBloggerCreated,
  // User callables
  registerBlogger,
  getBloggerDashboard,
  updateBloggerProfile,
  bloggerRequestWithdrawal,
  getBloggerLeaderboard,
  // Resources (EXCLUSIVE)
  getBloggerResources,
  downloadBloggerResource,
  copyBloggerResourceText,
  // Guide (EXCLUSIVE)
  getBloggerGuide,
  copyBloggerGuideText,
  trackBloggerGuideUsage,
  // Admin callables
  adminGetBloggersList,
  adminGetBloggerDetail,
  adminProcessBloggerWithdrawal,
  adminUpdateBloggerStatus,
  adminGetBloggerConfig,
  adminUpdateBloggerConfig,
  adminCreateBloggerResource,
  adminUpdateBloggerResource,
  adminDeleteBloggerResource,
  adminCreateBloggerResourceText,
  adminCreateBloggerGuideTemplate,
  adminUpdateBloggerGuideTemplate,
  adminCreateBloggerGuideCopyText,
  adminUpdateBloggerGuideCopyText,
  adminCreateBloggerGuideBestPractice,
  adminUpdateBloggerGuideBestPractice,
  adminExportBloggers,
  adminGetBloggerLeaderboard,
  // Scheduled
  bloggerValidatePendingCommissions,
  bloggerReleaseValidatedCommissions,
  bloggerUpdateMonthlyRankings,
  bloggerDeactivateExpiredRecruitments,
  bloggerFinalizeMonthlyRankings,
} from './blogger';

// ========== CENTRALIZED PAYMENT SYSTEM ==========
// Unified payment system for Chatter, Influencer, and Blogger
// Supports: Wise (bank transfers) and Flutterwave (Mobile Money)
export {
  // User callables
  paymentSaveMethod,
  paymentGetMethods,
  paymentDeleteMethod,
  paymentSetDefault,
  paymentRequestWithdrawal,
  paymentCancelWithdrawal,
  paymentGetStatus,
  paymentGetHistory,
  // Admin callables
  paymentAdminGetConfig,
  paymentAdminUpdateConfig,
  paymentAdminGetPending,
  paymentAdminApprove,
  paymentAdminReject,
  paymentAdminProcess,
  paymentAdminGetStats,
  paymentAdminGetLogs,
  paymentAdminGetLogActions,
  paymentAdminExport,
  // Triggers
  paymentOnWithdrawalCreated,
  paymentOnWithdrawalStatusChanged,
  paymentProcessAutomaticPayments,
  paymentWebhookWise,
  paymentWebhookFlutterwave,
} from './payment';
