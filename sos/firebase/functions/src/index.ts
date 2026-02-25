/* eslint-disable @typescript-eslint/no-explicit-any */

// ====== FORCE REDEPLOY 2026-01-15 - AMD pending fix ======

// ====== DEPLOYMENT ANALYSIS FIX 2026-02-12 ======
// DISABLED: process.exit() is detected as error by Firebase CLI
// Relying on natural process termination after reducing services from 212 to 111
// const IS_DEPLOYMENT_ANALYSIS =
//   !process.env.K_REVISION &&
//   !process.env.K_SERVICE &&
//   !process.env.FUNCTION_TARGET &&
//   !process.env.FUNCTIONS_EMULATOR;
//
// if (IS_DEPLOYMENT_ANALYSIS) {
//   console.log('[DEPLOYMENT] Analysis mode - will exit after 9s');
//   setTimeout(() => {
//     console.log('[DEPLOYMENT] Forcing exit for Firebase CLI');
//     process.exit(0);
//   }, 9000);
// }

// ====== P1-4: SENTRY (lazy initialization - called in functions, not at module load) ======
import { initSentry } from "./config/sentry";
// Lazy init function - call once in index exports section
let sentryInitCalled = false;
function ensureSentryInit() {
  if (!sentryInitCalled) {
    initSentry();
    sentryInitCalled = true;
  }
}
// Note: captureError can be imported later when needed in specific functions

// ====== ULTRA DEBUG (lazy - avoid deployment timeout) ======
// TEMP DISABLED 2026-02-12: ultraLogger event handlers prevent deployment analysis from completing
// TODO: Refactor ultraDebugLogger to not install event handlers at module load time
// import {
//   ultraLogger,
//   traceFunction,
// } from "./utils/ultraDebugLogger";

// Stub ultraLogger to avoid compilation errors - COMPLETELY DISABLED for deployment (no-op functions)
const ultraLogger = {
  info: (..._args: any[]) => {},
  warn: (..._args: any[]) => {},
  error: (..._args: any[]) => {},
  debug: (..._args: any[]) => {},
  trace: (..._args: any[]) => {},
  traceImport: (..._args: any[]) => {},
};
const traceFunction = <T extends (...args: any[]) => any>(fn: T, _functionName?: string, _source?: string): T => fn;
// P1-13: Sync atomique payments <-> call_sessions
// TEMP DISABLED 2026-02-12: Avoid module-level initialization for deployment
// import { syncPaymentStatus, findCallSessionByPaymentId } from "./utils/paymentSync";
// 🔒 Phone number decryption for notifications
// import { decryptPhoneNumber } from "./utils/encryption";

// Stubs for temporarily disabled imports
const decryptPhoneNumber = (encrypted: string): string => encrypted;
const syncPaymentStatus = async (...args: any[]): Promise<void> => { console.log('[stub] syncPaymentStatus', ...args); };
const findCallSessionByPaymentId = async (database: any, paymentId: string): Promise<any> => { console.log('[stub] findCallSessionByPaymentId', database, paymentId); return null; };

// === CPU/MEM CONFIGS to control vCPU usage ===
const emergencyConfig = {
  region: "europe-west1",
  memory: "256MiB" as const,
  cpu: 0.083,
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
  getOutilIngestEndpoint,
} from "./lib/secrets";

// P0 FIX 2026-02-04: Import call region from centralized config - dedicated region for call functions
import { CALL_FUNCTIONS_REGION } from "./configs/callRegion";

// P1-4 FIX 2026-02-23: Removed parasitic re-exports of secrets (were polluting Firebase Functions namespace)

// Meta Conversions API (CAPI) - MOVED to Webhooks/stripeWebhookHandler.ts
// Subscription webhook handlers - MOVED to Webhooks/stripeWebhookHandler.ts
// Dead Letter Queue - MOVED to Webhooks/stripeWebhookHandler.ts

// MAILWIZZ_API_KEY and MAILWIZZ_WEBHOOK_SECRET are now static values from config.ts

// Multi-Dashboard authentication & AI generation
export { validateDashboardPassword } from "./multiDashboard/validateDashboardPassword";
export { onBookingRequestCreatedGenerateAi } from "./multiDashboard/onBookingRequestCreatedGenerateAi";
// FIXED 2026-02-12: Migrated to v2 API (onCall, HttpsError, logger)
export { ensureUserDocument } from "./multiDashboard/ensureUserDocument";

// kyc
export { createLawyerStripeAccount } from "./createLawyerAccount";
export { createStripeAccount } from "./createStripeAccount";
export { getStripeAccountSession } from "./getAccountSession";
export { checkStripeAccountStatus } from "./checkStripeAccountStatus";

// REMOVED: createManualBackup - file manualBackup.ts deleted
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

// Local backup registry - Track local PC backups in admin console
export {
  registerLocalBackup,
  listLocalBackups,
  deleteLocalBackupRecord,
} from "./admin/localBackupRegistry";

// P2-3 FIX: GDPR Recording Cleanup - SUPPRIME (recording desactive pour RGPD)
// Les fonctions rgpdRecordingCleanup et triggerRgpdCleanup ont ete supprimees
// car l'enregistrement des appels est desactive (commit 12a83a9)

// P2-1/3/13 FIX: Payment data cleanup (locks, expired orders, archiving)
export { paymentDataCleanup } from "./scheduled/paymentDataCleanup";

// Cloud Run Revisions Cleanup — chaque dimanche 3h, garde les 3 dernières révisions/service
export { cleanupCloudRunRevisions } from "./scheduled/cleanupCloudRunRevisions";

// P0-2 FIX: Stuck payments recovery (requires_capture > 10min)
export {
  stuckPaymentsRecovery,
  triggerStuckPaymentsRecovery,
  // P0 FIX 2026-02-01: Added manual PayPal capture function
  capturePayPalPaymentManually,
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

// ADMIN ALERTS DIGEST: Daily email summary to admins
// - Aggregates unread admin_alerts by priority (critical, high, medium, low)
// - Includes pending_transfers status summary
// - Sends at 9:00 AM Paris time daily
export {
  adminAlertsDigestDaily,
  triggerAdminAlertsDigest,
  getAdminAlertsDigestPreview,
} from "./scheduled/adminAlertsDigest";

// PENDING TRANSFERS MONITOR: Proactive monitoring every 6 hours
// - Creates alerts for high amounts, old transfers, failures
// - Sends KYC reminders at day 1, 3, 7, 14, 30, 60, 90
// - Recovers stuck "processing" transfers
// - Queues failed transfers for retry
export {
  pendingTransfersMonitorScheduled,
  getDetailedPendingTransfersStats,
  triggerPendingTransfersMonitor,
  forceRetryPendingTransfer,
} from "./scheduled/pendingTransfersMonitor";

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

// P2 FIX 2026-02-12: Automatic invoice email delivery (multilingual)
export { onInvoiceCreatedSendEmail } from "./triggers/onInvoiceCreatedSendEmail";

// P2 FIX 2026-02-12: Payment error alerts system
export {
  onPaymentRecordCreated,
  onPaymentRecordUpdated,
} from "./triggers/onPaymentError";

// Dispute handling - MOVED to Webhooks/stripeWebhookHandler.ts

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
} from "./scheduled/processUnclaimedFunds";

// PayPal Onboarding Reminders
export {
  scheduledPayPalReminders,
  triggerPayPalReminders,
  getPayPalReminderStatus,
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

// Early Disconnect Refund Templates Seed (9 langues)
// P0 FIX 2026-02-03: Templates for notifying client & provider when call ends early and is refunded
// SEEDED 2026-02-03 via scripts/seedEarlyDisconnectTemplates.js
// Template file removed after seeding to reduce bundle size

// Country Fiscal Configs Seed (200 countries + 64 USA/Canada subdivisions)
// NOTE: Data already seeded via local script (scripts/seedCountryData.js)
// Commented out to avoid Cloud Run CPU quota issues on deployment
// export { initCountryConfigs, seedCountryConfigsHttp } from "./seeds/initCountryConfigs";

// P1-4 FIX: RefundManager & REFUND_CONFIG removed from exports (not Cloud Functions)

// Provider Earnings Dashboard
export {
  getProviderEarningsSummary,
  getProviderTransactions,
  getProviderMonthlyStats,
  getProviderPayoutHistory,
  getProviderDashboard,
  adminGetProviderEarnings,
} from "./ProviderEarningsService";

// Pending Transfer Processor - MOVED to Webhooks/stripeWebhookHandler.ts

// PayPal Commerce Platform
import {
  PAYPAL_CLIENT_ID as _PAYPAL_CLIENT_ID,
  PAYPAL_CLIENT_SECRET as _PAYPAL_CLIENT_SECRET,
  PAYPAL_WEBHOOK_ID as _PAYPAL_WEBHOOK_ID,
  PAYPAL_PARTNER_ID as _PAYPAL_PARTNER_ID,
} from "./PayPalManager";

export {
  createPayPalOrderHttp,
  authorizePayPalOrderHttp,
  capturePayPalOrderHttp,
  paypalWebhook,
  getRecommendedPaymentGateway,
  createPayPalPayout,
  checkPayPalPayoutStatus,
} from "./PayPalManager";
// P1-4 FIX: Removed PAYPAL_CLIENT_ID/SECRET/WEBHOOK_ID/PARTNER_ID/MODE/PLATFORM_MERCHANT_ID exports (secrets, not Cloud Functions)

// Payout Retry Tasks (P0-2 FIX)
export { executePayoutRetryTask, retryFailedPayout } from "./lib/payoutRetryTasks";

// Stripe Transfer Retry Tasks (P1-2 FIX)
export { executeStripeTransferRetry } from "./lib/stripeTransferRetryTasks";

// ============================================================================
// TAX ENGINE - VAT/GST Calculation for B2B/B2C transactions
// Seller: SOS-Expat OU (Estonia, EE) - OSS registered
// ============================================================================
export {
  calculateTaxCallable,
  getTaxThresholdStatus,
  validateVAT,
} from "./tax/calculateTax";
// P1-4 FIX: Removed calculateTax, calculateTaxForTransaction, EU_COUNTRIES, EU_VAT_RATES, COUNTRY_THRESHOLDS, etc. (helpers/constants, not Cloud Functions)

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

// P1-4 FIX: Removed vatValidation helpers/constants/types (not Cloud Functions — used internally only)

// ============================================================================
// ACCOUNTING ENGINE - Automatic Journal Entry Generation
// SOS-Expat OU (Estonia) - EUR accounting
// ============================================================================
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
} from "./accounting";

// Alias pour usage local dans GLOBAL_SECRETS
const PAYPAL_CLIENT_ID = _PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = _PAYPAL_CLIENT_SECRET;
const PAYPAL_WEBHOOK_ID = _PAYPAL_WEBHOOK_ID;
const PAYPAL_PARTNER_ID = _PAYPAL_PARTNER_ID;

// P1-4 FIX: Removed TASKS_AUTH_SECRET, OUTIL_API_KEY, OUTIL_SYNC_API_KEY exports (secrets, not Cloud Functions)

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
  // Encryption & Outil integration
  ENCRYPTION_KEY,
  OUTIL_API_KEY,
  OUTIL_SYNC_API_KEY,
].filter(Boolean) as any[];


// ⚠️ cast 'as any' pour accepter eventarc si les types ne sont pas à jour
setGlobalOptions({
  region: "europe-west1",
  memory: "256MiB",
  eventarc: { location: "europe-west1" },
  secrets: GLOBAL_SECRETS,
} as any);

// ✅ Initialize Sentry for error monitoring
ensureSentryInit();

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

// ====== FIREBASE ADMIN INITIALIZATION (GLOBAL) ======
// Initialize Firebase Admin once at module level
// This prevents "default Firebase app does not exist" errors in Cloud Functions v2
if (!admin.apps.length) {
  admin.initializeApp();
  console.log('[INIT] Firebase Admin SDK initialized globally');
}

// 🦾 Cloud Tasks helper
// P0 FIX: scheduleCallTask n'est plus utilisé ici - scheduling géré dans createAndScheduleCallHTTPS
// import { scheduleCallTask } from "./lib/tasks";

// ====== IMPORTS DES MODULES PRINCIPAUX ======
import { createAndScheduleCallHTTPS } from "./createAndScheduleCallFunction";

import { runExecuteCallTask } from "./runtime/executeCallTask";
import { runSetProviderAvailableTask } from "./runtime/setProviderAvailableTask";
import { runBusySafetyTimeoutTask } from "./runtime/busySafetyTimeoutTask";
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

// P1-4 FIX: Removed Stripe secrets exports (not Cloud Functions)

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

// Helper pour le webhook Connect (Direct Charges) - internal use only
function getStripeConnectWebhookSecret(): string {
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
export { validateCouponCallable } from "./callables/validateCoupon";
export { api } from "./adminApi";
// REMOVED: testTwilioCall.ts deleted (P0 security risk - unauthenticated Twilio cost endpoint)
export { twilioCallWebhook, twilioAmdTwiml, twilioGatherResponse } from "./Webhooks/twilioWebhooks";
export { twilioConferenceWebhook } from "./Webhooks/TwilioConferenceWebhook";
export { providerNoAnswerTwiML } from "./Webhooks/providerNoAnswerTwiML";
export { enqueueMessageEvent } from "./messaging/enqueueMessageEvent";

// REMOVED: unifiedWebhook deleted (P0 security - no signature validation, dead code duplicate of individual webhooks)

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

// ========================================
// 🔒 SECURITY ALERTS MODULE
// ========================================
// Détection de menaces, scoring, notifications multilingues
// IMPORTANT: Détection basée sur les COMPORTEMENTS, pas la géographie
// Aucun pays n'est blacklisté - tous les utilisateurs peuvent utiliser la plateforme
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
// AUDIT 2026-02-20: Disabled — these detectors are never called from any other module.
// They are utility functions, not Cloud Functions, but their export forces loading the entire securityAlerts/detectors module.
// Re-enable individual detectors when actually integrated into call flows.
// export {
//   detectBruteForce,
//   detectUnusualLocation,
//   detectPaymentFraud,
//   detectCardTesting,
//   detectMassAccountCreation,
//   detectApiAbuse,
//   detectInjectionAttempt,
//   detectMultipleSessions,
// } from "./securityAlerts/detectors";

// Threat Score Service
// AUDIT 2026-02-20: Disabled — never imported externally
// export { threatScoreService } from "./securityAlerts/ThreatScoreService";

// AI Chat - DEPRECATED: Now handled directly by Outil-sos-expat
// The AI chat functionality is in Outil-sos-expat, not SOS
// export { aiChatForProvider, getAiSuggestions } from "./ai/aiChatForProvider";

ultraLogger.info("EXPORTS", "Exports directs configurés");

// ========================================
// 🦾 ENDPOINT CLOUD TASKS : exécuter l'appel
// ========================================
export const executeCallTask = onRequest(
  {
    // P0 FIX 2026-02-04: Migrated to dedicated region for call functions to avoid quota issues
    region: CALL_FUNCTIONS_REGION,
    // P0 FIX: Timeout increased from 120s to 540s (9 minutes)
    // Each provider retry: ~150s (60s call + 90s wait) + 15s backoff
    // 3 retries: 3*150 + 2*15 = 480s minimum
    // 120s was causing premature function timeout → only 2 retries executed
    timeoutSeconds: 540,
    memory: "256MiB",
    // P0 FIX: Use fractional CPU to reduce quota consumption (like twilioCallWebhook)
    // With concurrency: 1, we can use cpu < 1 which uses less quota per instance
    // 0.25 CPU is sufficient since function mostly waits for Twilio API responses
    cpu: 0.083,
    maxInstances: 10,
    minInstances: 0,  // P0 FIX 2026-02-12: Reduced to 0 due to CPU quota exhaustion (208 services in europe-west3)
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
    // P0 FIX 2026-02-04: Migrated to dedicated region for call functions to avoid quota issues
    region: CALL_FUNCTIONS_REGION,
    timeoutSeconds: 30,
    memory: "256MiB" as const,
    cpu: 0.083,
    maxInstances: 10,
    minInstances: 0,
    concurrency: 1,
    // Only needs TASKS_AUTH_SECRET for Cloud Tasks auth
    secrets: [TASKS_AUTH_SECRET],
  },
  (req, res) => runSetProviderAvailableTask(req as any, res as any)
);

// ========================================
// 🛡️ ENDPOINT CLOUD TASKS : busy safety timeout (releases stuck busy providers)
// ========================================
export const busySafetyTimeoutTask = onRequest(
  {
    region: CALL_FUNCTIONS_REGION,
    timeoutSeconds: 30,
    memory: "256MiB" as const,
    cpu: 0.083,
    maxInstances: 10,
    minInstances: 0,
    concurrency: 1,
    secrets: [TASKS_AUTH_SECRET],
  },
  (req, res) => runBusySafetyTimeoutTask(req as any, res as any)
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

// ====== STRIPE WEBHOOK (EXTRACTED to Webhooks/stripeWebhookHandler.ts) ======
// The stripeWebhook function and all its helpers (syncCallSessionToOutil, sendPaymentNotifications,
// handlePaymentIntentSucceeded, handleTransferFailed, etc.) have been extracted to:
//   - src/Webhooks/stripeWebhookHelpers.ts (shared helpers)
//   - src/Webhooks/stripeWebhookHandler.ts (webhook function + handlers)
// This reduces index.ts by ~2700 lines and improves maintainability.
export { stripeWebhook } from "./Webhooks/stripeWebhookHandler";

// ========================================
// FONCTIONS CRON POUR MAINTENANCE
// ========================================
// NOTE: scheduledFirestoreExport a été supprimé - utiliser scheduledBackup de ./scheduledBackup
// qui inclut checksums, counts de collections et meilleur monitoring

export const scheduledCleanup = onSchedule(
  {
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.083,
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

// ========== NOTIFICATION EXPIRATION PROMOTIONS ==========
// m2 FIX: Notifie les admins quand des coupons ou prix promos expirent dans 3 jours
export { notifyExpiringPromotions } from './scheduled/notifyExpiringPromotions';

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
// AUDIT 2026-02-20: Disabled — one-shot migration already completed + generateEncryptionKey is a security risk as public endpoint
// export {
//   migratePhoneEncryption,
//   getEncryptionStatus,
//   generateEncryptionKey
// } from './scheduled/migrateEncryption';

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

// ========== SECRETS & CONFIG BACKUP ==========
export {
  monthlySecretsConfigBackup,
  triggerSecretsAudit,
  listSecretsAudits,
  getSecretsRestoreGuide
} from './scheduled/backupSecretsAndConfig';

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
export { providerCatalogFeed } from './providerCatalogFeed';

// ========== TRANSLATION FUNCTIONS ==========
// DISABLED 2026-01-31: Provider translation system temporarily disabled
// To re-enable: uncomment these exports AND set PROVIDER_TRANSLATION: true in featureFlags.ts
// export * from './translation/translateProvider';
// export * from './translation/initializeProviderTranslation';
// export * from './translation/updateProviderTranslation';

// ========== EMAIL MARKETING AUTOMATION (MailWizz) ==========
// handleUserRegistration,  // → consolidatedOnUserCreated
export {
  handleReviewSubmitted,
  handleCallCompleted,
  handlePaymentReceived,
  handlePaymentFailed,
  handlePayoutRequested,
  handlePayoutSent,
  // New transactional triggers
  handleCallMissed,
  handlePayoutFailed,
  handlePayoutThresholdReached,
  handleFirstEarning,
  handleEarningCredited,
  handleReferralBonus,
} from './emailMarketing/functions/transactions';
// profileLifecycle handlers → consolidated into consolidatedOnUserUpdated (handlers 1-9)
// handleProfileCompleted, handleUserLogin, handleProviderOnlineStatus,
// handleKYCVerification, handlePayPalConfiguration, handleAccountStatus
export {
  stopAutoresponders,
  stopAutorespondersForUser,
} from './emailMarketing/functions/stopAutoresponders';
export { detectInactiveUsers } from './emailMarketing/functions/inactiveUsers';
// Gamification triggers
export { handleMilestoneReached, handleBadgeUnlocked } from './emailMarketing/functions/gamification';
// Scheduled stats emails
export { sendWeeklyStats, sendMonthlyStats, sendAnniversaryEmails } from './emailMarketing/functions/statsEmails';

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

// P1-4 FIX: Removed subscription constants/types/validators exports (not Cloud Functions — used internally only)

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

// P1-4 FIX: Removed webhook handler exports (internal helpers, not Cloud Functions — already imported at line 102)

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
  // AUDIT 2026-02-20: Disabled — one-shot seed/migration functions already executed
  // initializeSubscriptionPlans as subscriptionInitializePlans,
  // P1 FIX: resetMonthlyAiQuotas REMOVED - duplicate of resetMonthlyQuotas in scheduledTasks.ts
  setFreeAiAccess as subscriptionSetFreeAccess,
  // AUDIT 2026-02-20: Disabled — one-shot seed functions already executed
  // createAnnualStripePrices,
  // createMonthlyStripePrices,
  // migrateSubscriptionPlansTo9Languages as subscriptionMigrateTo9Languages
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
// AUDIT 2026-02-20: Disabled — one-shot init already done. clearHelpArticles is a security risk (HTTP without auth, can wipe FAQs collection)
// export {
//   initSingleHelpArticle,
//   initHelpArticlesBatch,
//   checkHelpCategories,
//   clearHelpArticles,
// } from './helpCenter/initHelpArticles';

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
// export { onUserEmailUpdated } from './triggers/syncUserEmailToSosProfiles';  // → consolidatedOnUserUpdated

// ========== P0 FIX: SYNC ACCESS TO OUTIL-SOS-EXPAT ==========
// Synchronise forcedAIAccess et freeTrialUntil vers Outil pour l'acces IA
// export { onUserAccessUpdated } from './triggers/syncAccessToOutil';  // → consolidatedOnUserUpdated

// ========== AUTOMATIC STRIPE EXPRESS ACCOUNT CREATION ==========
export { onProviderCreated } from './triggers/onProviderCreated';

// ========== SYNC ROLE TO CUSTOM CLAIMS (CRITICAL FOR AUTH) ==========
// Ces triggers synchronisent le rôle Firestore avec les Custom Claims Firebase
// Sans cela, les Firestore Rules qui vérifient request.auth.token.role ne fonctionnent pas
// syncRoleClaims exports → consolidatedOnUserCreated + consolidatedOnUserUpdated
// onUserCreatedSyncClaims, onUserUpdatedSyncClaims

// ========== META CAPI TRACKING TRIGGERS ==========
// These triggers send server-side conversion events to Meta CAPI
// for accurate attribution even when browser tracking is blocked
export {
  onBookingRequestCreatedTrackLead,
  // onUserCreatedTrackRegistration,  // → consolidatedOnUserCreated
  onCallSessionPaymentAuthorized,
  onCallSessionPaymentCaptured,
  onContactSubmittedTrackLead,
} from './triggers/capiTracking';

// ========== GOOGLE ADS CONVERSION TRACKING ==========
// These triggers send server-side conversion events to Google Ads API
// for accurate attribution with Enhanced Conversions
export {
  onBookingRequestCreatedTrackGoogleAdsLead,
  // onUserCreatedTrackGoogleAdsSignUp,  // → consolidatedOnUserCreated
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
// AUDIT 2026-02-20: Disabled — one-shot storage config already applied (v1 functions)
// export {
//   enableStorageVersioning,
//   configureStorageLifecycle,
//   getStorageConfig
// } from './admin/enableStorageVersioning';

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
  checkServiceBalances,
  getServiceBalanceAlerts,
  acknowledgeServiceBalanceAlert,
  updateServiceBalanceThreshold,
  getServiceBalanceThresholds,
  triggerServiceBalanceCheck,
} from "./monitoring/serviceAlerts";
// P1-4 FIX: Removed type exports (ServiceType, AlertLevel, etc.) — not Cloud Functions

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
} from "./monitoring/connectionLogs";
// P1-4 FIX: Removed helper functions (logAdminAction, logServiceConnection, createApiAccessLogger) and types — not Cloud Functions

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
  setProviderBadge,
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

        // Auto-approve ALL client accounts (Google AND email/password)
        // Lawyers/expats still require manual approval
        const isClientRole = role === 'client';
        const shouldAutoApprove = isClientRole;

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
          // Phone and country for Telegram notifications
          phone: request.data.phone || null,
          phoneNumber: request.data.phone || null,
          phoneCountryCode: request.data.phoneCountryCode || null,
          country: request.data.country || request.data.currentCountry || null,
          currentCountry: request.data.currentCountry || request.data.country || null,
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
  // affiliateOnUserCreated,  // → consolidatedOnUserCreated
  // affiliateOnCallCompleted,  // → consolidatedOnCallCompleted
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
  // DISABLED 2026-02-08: Quiz feature removed from chatter flow
  // chatterOnQuizPassed,
  // chatterOnCallCompleted,  // → consolidatedOnCallCompleted
  // chatterOnProviderRegistered,  // → consolidatedOnUserCreated
  // chatterOnClientRegistered,  // → consolidatedOnUserCreated
  chatterOnChatterEarningsUpdated,
  chatterOnCommissionCreated,
  // User callables
  registerChatter,
  // DISABLED 2026-02-08: Quiz feature removed from chatter flow
  // submitQuiz,
  // getQuizQuestions,
  getChatterDashboard,
  getChatterLeaderboard,
  chatterRequestWithdrawal,
  updateChatterProfile,
  updateTelegramOnboarding,
  // Telegram Deep Link + Webhook (new system)
  generateTelegramLink,
  checkTelegramLinkStatus,
  skipTelegramOnboarding,
  telegramChatterBotWebhook,
  getReferralDashboard,
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
  adminGetChatterConfigHistory,
  adminGetChatterLeaderboard,
  adminExportChatters,
  adminBulkChatterAction,
  // Admin Country Rotation
  adminAdvanceCycleV2, // Renamed from adminAdvanceCycle (old Cloud Run service stuck in deletion)
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
  adminGetReferralFraudAlerts,
  adminReviewFraudAlert,
  adminGetReferralCommissions,
  // Admin Commissions Tracker
  adminGetCommissionsDetailed,
  adminGetCommissionStats,
  adminExportCommissionsCSV,
  // Admin Promotions
  adminGetPromotions,
  adminCreatePromotion,
  adminUpdatePromotion,
  adminDeletePromotion,
  adminGetPromotionStats,
  adminDuplicatePromotion,
  // Public directory
  getChatterDirectory,
  // Admin visibility toggle
  adminToggleChatterVisibility,
  // Scheduled (individual validate/release REMOVED - consolidated in consolidatedCommissions.ts)
  // chatterValidatePendingCommissions,  // → consolidatedValidateCommissions
  // chatterReleaseValidatedCommissions,  // → consolidatedReleaseCommissions
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
  // Drip Messages (62 automated motivation messages over 90 days)
  sendChatterDripMessages,
  chatter_sendDripMessage,
  chatter_getDripStats,
  chatter_previewDripMessage,
} from './chatter';

// ========== INFLUENCER SYSTEM ==========
// Influencer program with client referrals (5% discount) and provider recruitment
// NOTE: Unlike Chatters, Influencers have NO quiz, NO levels, fixed commissions
export {
  // Triggers
  influencerOnInfluencerCreated,
  // influencerOnCallCompleted,  // → consolidatedOnCallCompleted
  // influencerOnProviderRegistered,  // → consolidatedOnUserCreated
  influencerOnProviderCallCompleted,
  // User callables
  registerInfluencer,
  getInfluencerDashboard,
  updateInfluencerProfile,
  influencerRequestWithdrawal,
  getInfluencerLeaderboard,
  // Public callables
  getInfluencerDirectory,
  // Admin callables
  adminGetInfluencersList,
  adminGetInfluencerDetail,
  adminProcessInfluencerWithdrawal,
  adminUpdateInfluencerStatus,
  adminGetPendingInfluencerWithdrawals,
  adminGetInfluencerConfig,
  adminUpdateInfluencerConfig,
  adminGetInfluencerLeaderboard,
  // Scheduled (individual validate/release REMOVED - consolidated in consolidatedCommissions.ts)
  // influencerValidatePendingCommissions,  // → consolidatedValidateCommissions
  // influencerReleaseValidatedCommissions,  // → consolidatedReleaseCommissions
  influencerMonthlyTop3Rewards,
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
  // Resources callables
  getInfluencerResources,
  downloadInfluencerResource,
  copyInfluencerResourceText,
  // Admin Resources callables
  adminGetInfluencerResources,
  adminCreateInfluencerResource,
  adminUpdateInfluencerResource,
  adminDeleteInfluencerResource,
  adminCreateInfluencerResourceText,
  adminUpdateInfluencerResourceText,
  adminDeleteInfluencerResourceText,
  // Admin Promotions callables
  adminGetInfluencerPromotions,
  adminCreateInfluencerPromotion,
  adminUpdateInfluencerPromotion,
  adminDeleteInfluencerPromotion,
  adminGetInfluencerPromotionStats,
  adminDuplicateInfluencerPromotion,
  // Admin - Visibility Toggle
  adminToggleInfluencerVisibility,
} from './influencer';

// ========== BLOGGER SYSTEM ==========
// Blogger partner program with FIXED commissions ($10 client, $5 recruitment)
// KEY DIFFERENCES: No quiz, no levels, no bonuses, 0% client discount, definitive role
// EXCLUSIVE FEATURES: Resources section, Integration Guide
export {
  // Triggers
  onBloggerCreated,
  // bloggerOnProviderCreated → replaced by handleBloggerProviderRegistered in consolidatedOnUserCreated
  // bloggerOnCallSessionCompleted,  // → consolidatedOnCallCompleted
  // REMOVED: checkBloggerClientReferral, checkBloggerProviderRecruitment — helpers, not Cloud Functions
  // REMOVED: awardBloggerRecruitmentCommission, deactivateExpiredRecruitments — helpers, not Cloud Functions
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
  adminGetBloggerConfigHistory,
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
  adminBulkBloggerAction,
  adminGetBloggerLeaderboard,
  // Articles
  getBloggerArticles,
  copyBloggerArticle,
  adminGetBloggerArticles,
  adminCreateBloggerArticle,
  adminUpdateBloggerArticle,
  adminDeleteBloggerArticle,

  // Public directory
  getBloggerDirectory,

  // Admin visibility toggle
  adminToggleBloggerVisibility,
  // Scheduled (individual validate/release REMOVED - consolidated in consolidatedCommissions.ts)
  // bloggerValidatePendingCommissions,  // → consolidatedValidateCommissions
  // bloggerReleaseValidatedCommissions,  // → consolidatedReleaseCommissions
  bloggerUpdateMonthlyRankings,
  bloggerDeactivateExpiredRecruitments,
  bloggerFinalizeMonthlyRankings,
} from './blogger';

// ========== CENTRALIZED PAYMENT SYSTEM ==========
// Unified payment system for Chatter, Influencer, Blogger, and GroupAdmin
// Supports: Wise (bank transfers), Flutterwave (Mobile Money)
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

// ========== GROUPADMIN SYSTEM ==========
// Group/Community Administrator affiliate program with client referrals and admin recruitment
// Supports: $10 per client, $50 per recruited admin (after $200 threshold), ready-to-use posts/resources
export {
  // User callables
  registerGroupAdmin,
  getGroupAdminDashboard,
  getGroupAdminRecruits,
  getGroupAdminCommissions,
  getGroupAdminNotifications,
  getGroupAdminLeaderboard,
  updateGroupAdminProfile,
  requestGroupAdminWithdrawal,
  // Resource callables
  getGroupAdminResources,
  getGroupAdminResourceContent,
  getGroupAdminProcessedResourceContent,
  trackGroupAdminResourceUsage,
  // Post callables
  getGroupAdminPosts,
  getGroupAdminPostContent,
  getGroupAdminProcessedPost,
  trackGroupAdminPostUsage,
  // Admin callables
  adminGetGroupAdminsList,
  adminGetGroupAdminDetail,
  adminUpdateGroupAdminStatus,
  adminVerifyGroup,
  adminProcessWithdrawal as adminProcessGroupAdminWithdrawal,
  adminGetWithdrawalsList as adminGetGroupAdminWithdrawalsList,
  adminExportGroupAdmins,
  adminBulkGroupAdminAction,
  adminCreateResource as adminCreateGroupAdminResource,
  adminUpdateResource as adminUpdateGroupAdminResource,
  adminDeleteResource as adminDeleteGroupAdminResource,
  adminGetResourcesList as adminGetGroupAdminResourcesList,
  adminCreatePost as adminCreateGroupAdminPost,
  adminUpdatePost as adminUpdateGroupAdminPost,
  adminDeletePost as adminDeleteGroupAdminPost,
  adminGetPostsList as adminGetGroupAdminPostsList,
  adminUpdateGroupAdminConfig,
  adminGetGroupAdminConfig,
  adminGetGroupAdminConfigHistory,
  adminGetRecruitmentsList,
  adminGetGroupAdminRecruits,
  // Admin Promotions callables
  adminGetGroupAdminPromotions,
  adminCreateGroupAdminPromotion,
  adminUpdateGroupAdminPromotion,
  adminDeleteGroupAdminPromotion,
  adminGetGroupAdminPromotionStats,
  adminDuplicateGroupAdminPromotion,
  // Visibility
  adminToggleGroupAdminVisibility,
  // Public directory
  getGroupAdminDirectory,
  // Triggers
  // onCallCompletedGroupAdmin,  // → consolidatedOnCallCompleted
  onGroupAdminCreated,
  // Scheduled (individual validate/release REMOVED - consolidated in consolidatedCommissions.ts)
  // validatePendingGroupAdminCommissions,  // → consolidatedValidateCommissions
  // releaseValidatedGroupAdminCommissions,  // → consolidatedReleaseCommissions
} from './groupAdmin';

// ========== TELEGRAM NOTIFICATIONS ==========
// export { telegramOnUserRegistration } from './telegram/triggers/onUserRegistration';  // → consolidatedOnUserCreated
export { telegramOnCallCompleted } from './telegram/triggers/onCallCompleted';
export { telegramOnPaymentReceived } from './telegram/triggers/onPaymentReceived';
export { telegramOnPayPalPaymentReceived } from './telegram/triggers/onPayPalPaymentReceived';
export { telegramOnNewProvider } from './telegram/triggers/onNewProvider';
export { telegramOnNewContactMessage } from './telegram/triggers/onNewContactMessage';
export { telegramOnSecurityAlert } from './telegram/triggers/onSecurityAlert';
export { telegramOnNegativeReview } from './telegram/triggers/onNegativeReview';
export { telegramOnWithdrawalRequest } from './telegram/triggers/onWithdrawalRequest';
export { telegramDailyReport } from './telegram/scheduled/dailyReport';
export { telegram_sendTestNotification } from './telegram/callables/sendTestNotification';
export {
  telegram_updateConfig,
  telegram_getConfig,
  telegram_getChatId,
  telegram_validateBot,
  telegram_updateTemplate,
  telegram_getTemplates,
} from './telegram/callables/updateTelegramConfig';
export {
  telegram_getNotificationLogs,
  telegram_getQueueStats,
  telegram_getSubscriberStats,
} from './telegram/callables/adminQueries';
export {
  telegram_createCampaign,
  telegram_getCampaigns,
  telegram_cancelCampaign,
  telegram_getCampaignDetail,
} from './telegram/callables/campaigns';

// ========== TELEGRAM ADMIN ACTIONS (dead letter reprocessing + one-off messaging) ==========
export {
  telegram_reprocessDeadLetters,
  telegram_sendOneOff,
} from './telegram/callables/adminActions';

// ========== TELEGRAM QUEUE (global rate-limited queue + monitoring) ==========
export { processTelegramQueue } from './telegram/queue/processor';
export { monitorTelegramUsage } from './telegram/queue/monitor';
export { processTelegramCampaigns } from './telegram/queue/campaignProcessor';

// ========== TELEGRAM WITHDRAWAL CONFIRMATION ==========
export { getWithdrawalConfirmationStatus } from './telegram/withdrawalConfirmation';
export { cleanupExpiredWithdrawalConfirmations } from './telegram/cleanupExpiredConfirmations';

// ========== CONSOLIDATED COMMISSION PROCESSING ==========
// Replaces 8 individual scheduled functions (4 validate + 4 release) with 2.
// Each module (chatter, blogger, influencer, groupAdmin) runs independently.
// Saves 6 Cloud Run services.
export {
  consolidatedValidateCommissions,
  consolidatedReleaseCommissions,
} from './scheduled/consolidatedCommissions';

// ========== CONSOLIDATED onCallCompleted TRIGGER ==========
// Replaces 5 individual onDocumentUpdated triggers on call_sessions/{sessionId}
// (chatter, influencer, blogger, groupAdmin, affiliate) with 1 single dispatcher.
// Each module runs independently with try/catch isolation.
// Saves 4 Cloud Run services.
export {
  consolidatedOnCallCompleted,
} from './triggers/consolidatedOnCallCompleted';

// ========== CONSOLIDATED onUserCreated TRIGGER ==========
// Replaces 9 individual onDocumentCreated triggers on users/{userId}
// (affiliate, chatter x2, influencer, emailMktg, syncClaims, googleAds, metaCAPI, telegram)
// with 1 single dispatcher. Each module runs independently with try/catch isolation.
// Saves 8 Cloud Run services.
export {
  consolidatedOnUserCreated,
} from './triggers/consolidatedOnUserCreated';

// ========== CONSOLIDATED onUserUpdated TRIGGER ==========
// Replaces 8 individual onDocumentUpdated triggers on users/{userId}
// (profileCompleted, userLogin, onlineStatus, kycVerification, paypalConfig,
// syncClaims, syncEmail, syncAccess) with 1 single dispatcher.
// Saves 7 Cloud Run services.
export {
  consolidatedOnUserUpdated,
} from './triggers/consolidatedOnUserUpdated';

// ========== PROVIDER STATS - PERFORMANCE TRACKING ==========
// Tracks provider availability and missed calls for compliance monitoring
// - Scheduled aggregation (hourly) of online sessions and call stats
// - Admin callable to retrieve stats with filtering, sorting, pagination
// - CSV export for reporting
export {
  aggregateProviderStats,
  triggerProviderStatsAggregation,
  backfillProviderStats,
} from './scheduled/aggregateProviderStats';

export {
  getProviderStats,
  getProviderStatsSummary,
  getProviderStatsMonths,
  exportProviderStatsCsv,
} from './callables/getProviderStats';

// ========== USER ACCOUNT REPAIR ==========
// Repairs orphaned user accounts where Firebase Auth exists but users/{uid} document doesn't
// Called automatically from AuthContext when document is not found after retries
export { repairOrphanedUser } from './callables/repairOrphanedUser';

// ========== EXPORTS MANQUANTS — AUDIT 2026-02-23 ==========

// --- CHATTER : fonctions absentes du bloc principal ---
export {
  // Country Rotation
  assignCountriesToCurrentChatter,
  adminGetCountryRotationStatus,
  adminInitializeCountryRotation,
  // Chatter Config Settings
  adminGetChatterConfigSettings,
  adminInitializeChatterConfigSettings,
  adminToggleFlashBonus,
  adminUpdateChatterConfigSettings,
  // Message Templates
  getChatterMessageTemplates,
  adminSeedMessageTemplates,
  adminCreateMessageTemplate,
  adminUpdateMessageTemplate,
  adminDeleteMessageTemplate,
  adminResetMessageTemplatesToDefaults,
  initializeMessageTemplates,
  // Push Notifications (FCM)
  chatterNotifyCommissionEarned,
  chatterNotifyTeamMemberActivated,
  chatterNotifyInactiveMembers,
  chatterNotifyTierBonusUnlocked,
  chatterNotifyNearTop3,
  chatterNotifyFlashBonusStart,
  chatterRegisterFcmToken,
  chatterUnregisterFcmToken,
  // Scheduled
  chatterCreateWeeklyChallenge,
  chatterUpdateChallengeLeaderboard,
  chatterEndWeeklyChallenge,
  chatterTierBonusCheck,
  chatterMonthlyTop3Rewards,
  chatterAggregateActivityFeed,
  getCurrentChallenge,
  getChallengeHistory,
} from './chatter';

// getAvailableCountriesForChatter (absent de chatter/index.ts — export direct)
export { getAvailableCountriesForChatter } from './chatter/callables/countryRotation';

// --- BLOGGER : getBloggerRecruits manquant ---
export { getBloggerRecruits } from './blogger';

// --- SUBSCRIPTION : scheduled tasks manquants ---
export {
  resetBillingCycleQuotas,
  cleanupExpiredDocuments,
} from './subscription/scheduledTasks';

// --- SCHEDULED : aggregateCostMetrics manquant ---
export { aggregateCostMetrics } from './scheduled/aggregateCostMetrics';

// --- TWILIO : twilioRecordingWebhook manquant ---
export { twilioRecordingWebhook } from './Webhooks/twilioWebhooks';

// --- PAYMENT : fonctions sous noms originaux ---
// (également déployées sous alias paymentXxx via le bloc payment ci-dessus)
export { savePaymentMethod } from './payment/callables/savePaymentMethod';
export { getPaymentMethods } from './payment/callables/getPaymentMethods';
export { deletePaymentMethod } from './payment/callables/deletePaymentMethod';
export { setDefaultPaymentMethod } from './payment/callables/setDefaultPaymentMethod';
export { cancelWithdrawal } from './payment/callables/cancelWithdrawal';
export { getWithdrawalStatus } from './payment/callables/getWithdrawalStatus';
export { getWithdrawalHistory } from './payment/callables/getWithdrawalHistory';
export { adminApproveWithdrawal } from './payment/callables/admin/approveWithdrawal';
export { adminRejectWithdrawal } from './payment/callables/admin/rejectWithdrawal';
export { adminGetPaymentConfig } from './payment/callables/admin/getPaymentConfig';
export { adminUpdatePaymentConfig } from './payment/callables/admin/updatePaymentConfig';
export { adminGetPendingWithdrawals } from './payment/callables/admin/getPendingWithdrawals';
export { adminGetPaymentStats } from './payment/callables/admin/getPaymentStats';
export {
  adminGetAuditLogs,
  adminGetAuditLogActions,
} from './payment/callables/admin/getAuditLogs';
export { adminExportWithdrawals } from './payment/callables/admin/exportWithdrawals';
