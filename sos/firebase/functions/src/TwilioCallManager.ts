import * as admin from "firebase-admin";
// 🔧 Twilio client & num + Circuit breaker
import { getTwilioClient, getTwilioPhoneNumber, isCircuitOpen, recordTwilioSuccess, recordTwilioFailure } from "./lib/twilio";
import { getTwilioCallWebhookUrl, getTwilioAmdTwimlUrl } from "./utils/urlBase";
import { logError } from "./utils/logs/logError";
import { logCallRecord } from "./utils/logs/logCallRecord";
import { stripeManager } from "./StripeManager";
// P1-1 FIX: setProviderBusy removed - now only called from twilioWebhooks.ts
// 🕐 COOLDOWN: Use Cloud Task for delayed provider availability (5 min after call ends)
import { scheduleProviderAvailableTask } from "./lib/tasks";
// P0 FIX: Import setProviderAvailable to reset provider when client_no_answer
import { setProviderAvailable } from "./callables/providerStatusManager";
// 🔒 Phone number encryption
import { encryptPhoneNumber, decryptPhoneNumber } from "./utils/encryption";
// P1-13: Sync atomique payments <-> call_sessions
import { syncPaymentStatus } from "./utils/paymentSync";
// Production logger
import { logger as prodLogger } from "./utils/productionLogger";

// =============================
// Typage fort du JSON de prompts
// =============================
type LangCode =
  | "fr"
  | "en"
  | "pt"
  | "es"
  | "de"
  | "ru"
  | "zh"
  | "ar"
  | "hi"
  | "bn"
  | "ur"
  | "id"
  | "ja"
  | "tr"
  | "it"
  | "ko"
  | "vi"
  | "fa"
  | "pl";

interface VoicePrompts {
  provider_intro: Record<LangCode, string>;
  client_intro: Record<LangCode, string>;
}

// 🔊 Textes d'intro multilingues (incluent S.O.S Expat)
import promptsJson from "./content/voicePrompts.json";
import { InvoiceRecord } from "./utils/types";
const prompts = promptsJson as VoicePrompts;

export interface CallSessionState {
  id: string;
  // P0 FIX: Ajouter clientId et providerId au niveau racine pour Firestore rules
  clientId?: string;
  providerId?: string;
  // P1-13 FIX: FK vers payments collection (source of truth unique)
  paymentId?: string;
  status:
    | "pending"
    | "provider_connecting"
    | "client_connecting"
    | "both_connecting"
    | "active"
    | "completed"
    | "failed"
    | "cancelled";
  participants: {
    provider: {
      phone: string;
      status:
        | "pending"
        | "calling" // P0 FIX: New call attempt started (resets old status)
        | "ringing"
        | "connected"
        | "disconnected"
        | "no_answer"
        | "amd_pending"; // P0 FIX: Waiting for AMD callback
      callSid?: string;
      connectedAt?: admin.firestore.Timestamp;
      disconnectedAt?: admin.firestore.Timestamp;
      attemptCount: number;
    };
    client: {
      phone: string;
      status:
        | "pending"
        | "calling" // P0 FIX: New call attempt started (resets old status)
        | "ringing"
        | "connected"
        | "disconnected"
        | "no_answer"
        | "amd_pending"; // P0 FIX: Waiting for AMD callback
      callSid?: string;
      connectedAt?: admin.firestore.Timestamp;
      disconnectedAt?: admin.firestore.Timestamp;
      attemptCount: number;
    };
  };
  conference: {
    sid?: string;
    name: string;
    startedAt?: admin.firestore.Timestamp;
    endedAt?: admin.firestore.Timestamp;
    duration?: number; // Total Twilio conference duration
    billingDuration?: number; // P0 FIX: Duration from when BOTH participants connected (for billing)
    recordingUrl?: string;
    recordingSid?: string;
  };
  payment: {
    intentId: string;
    // P0 FIX: Added "requires_action" for 3D Secure payments
    status: "pending" | "authorized" | "captured" | "refunded" | "cancelled" | "failed" | "requires_action";
    amount: number;
    capturedAt?: admin.firestore.Timestamp;
    refundedAt?: admin.firestore.Timestamp;
    refundReason?: string;
    refundId?: string;
    failureReason?: string;
    /** ID du transfert automatique cree par Stripe via Destination Charges */
    transferId?: string;
    /** Montant transfere au prestataire en centimes */
    transferAmount?: number;
    /** Stripe Account ID du prestataire (acct_xxx) */
    destinationAccountId?: string;
    transferredAt?: admin.firestore.Timestamp;
    transferStatus?: "automatic" | "pending" | "succeeded" | "failed";
    transferFailureReason?: string;
    /** Gateway de paiement utilisee: stripe ou paypal */
    gateway?: "stripe" | "paypal";
    /** ID de l'ordre PayPal (si gateway = paypal) */
    paypalOrderId?: string;
    /** ID de capture PayPal */
    paypalCaptureId?: string;
  };
  metadata: {
    providerId: string;
    clientId: string;
    serviceType: "lawyer_call" | "expat_call";
    providerType: "lawyer" | "expat";
    maxDuration: number;
    createdAt: admin.firestore.Timestamp;
    updatedAt: admin.firestore.Timestamp;
    requestId?: string;
    clientLanguages?: string[];
    providerLanguages?: string[];
    selectedLanguage?: string;
    ttsLocale?: string;
    invoicesCreated?: boolean;
    // P2-2 FIX: Idempotency flags for webhook processing
    earlyDisconnectProcessed?: boolean;
    earlyDisconnectBy?: string;
    earlyDisconnectDuration?: number;
    earlyDisconnectAt?: admin.firestore.Timestamp;
    providerSetOffline?: boolean;
    // P0-2 FIX: Provider country for gateway validation
    providerCountry?: string;
  };
}

// =============================
// Config appels
// =============================
const CALL_CONFIG = {
  MAX_RETRIES: 3,
  CALL_TIMEOUT: 60, // 60 s
  CONNECTION_WAIT_TIME: 90_000, // 90 s
  MIN_CALL_DURATION: 120, // 2 minutes (120 seconds)
  MAX_CONCURRENT_CALLS: 200, // P2-12 FIX: Increased from 50 to handle traffic spikes
  WEBHOOK_VALIDATION: true,
} as const;

// =============================
// Locales TTS Twilio (principales)
// =============================

const VOICE_LOCALES: Record<string, string> = {
  fr: "fr-FR",
  en: "en-US",
  pt: "pt-BR",
  es: "es-ES",
  de: "de-DE",
  ru: "ru-RU",
  zh: "zh-CN",
  ar: "ar-SA",
  hi: "hi-IN",
  bn: "bn-IN",
  ur: "ur-PK",
  id: "id-ID",
  ja: "ja-JP",
  tr: "tr-TR",
  it: "it-IT",
  ko: "ko-KR",
  vi: "vi-VN",
  fa: "fa-IR",
  pl: "pl-PL",
};

// Full language names for logging and display
const LANGUAGE_NAMES: Record<string, string> = {
  fr: "Français",
  en: "English",
  pt: "Português",
  es: "Español",
  de: "Deutsch",
  ru: "Русский",
  zh: "中文",
  ar: "العربية",
  hi: "हिन्दी",
  bn: "বাংলা",
  ur: "اردو",
  id: "Bahasa Indonesia",
  ja: "日本語",
  tr: "Türkçe",
  it: "Italiano",
  ko: "한국어",
  vi: "Tiếng Việt",
  fa: "فارسی",
  pl: "Polski",
};

function getLanguageName(langKey: string): string {
  return LANGUAGE_NAMES[langKey] || langKey.toUpperCase();
}

// =============================
// Helpers langue & prompts
// =============================

// P0 FIX: Language code normalization mapping
// Converts full language names and alternative codes to ISO-639-1 codes
// This handles cases where languages are stored as "French" instead of "fr"
const LANG_CODE_ALIASES: Record<string, string> = {
  // Chinese variants
  'ch': 'zh',
  'cn': 'zh',
  'chinese': 'zh',
  'mandarin': 'zh',
  // French variants
  'french': 'fr',
  'français': 'fr',
  'francais': 'fr',
  // English variants
  'english': 'en',
  'anglais': 'en',
  // Portuguese variants
  'portuguese': 'pt',
  'portugais': 'pt',
  'português': 'pt',
  'portugues': 'pt',
  // Spanish variants
  'spanish': 'es',
  'espagnol': 'es',
  'español': 'es',
  'espanol': 'es',
  // German variants
  'german': 'de',
  'allemand': 'de',
  'deutsch': 'de',
  // Russian variants
  'russian': 'ru',
  'russe': 'ru',
  'русский': 'ru',
  // Arabic variants
  'arabic': 'ar',
  'arabe': 'ar',
  'العربية': 'ar',
  // Hindi variants
  'hindi': 'hi',
  // Bengali variants
  'bengali': 'bn',
  // Urdu variants
  'urdu': 'ur',
  // Indonesian variants
  'indonesian': 'id',
  'indonésien': 'id',
  // Japanese variants
  'japanese': 'ja',
  'japonais': 'ja',
  // Turkish variants
  'turkish': 'tr',
  'turc': 'tr',
  // Italian variants
  'italian': 'it',
  'italien': 'it',
  'italiano': 'it',
  // Korean variants
  'korean': 'ko',
  'coréen': 'ko',
  'coreen': 'ko',
  // Vietnamese variants
  'vietnamese': 'vi',
  'vietnamien': 'vi',
  // Persian variants
  'persian': 'fa',
  'farsi': 'fa',
  'persan': 'fa',
  // Polish variants
  'polish': 'pl',
  'polonais': 'pl',
};

function normalizeLangList(langs?: string[]): string[] {
  if (!langs || !Array.isArray(langs)) {
    console.log(`🌍 [normalizeLangList] Input is empty/invalid: ${JSON.stringify(langs)}`);
    return [];
  }
  console.log(`🌍 [normalizeLangList] Input languages: ${JSON.stringify(langs)}`);
  const out: string[] = [];
  for (const raw of langs) {
    if (!raw) continue;
    let short = String(raw).toLowerCase().split(/[-_]/)[0];
    const alias = LANG_CODE_ALIASES[short];
    if (alias) {
      console.log(`🌍 [normalizeLangList] Alias found: "${raw}" -> "${short}" -> "${alias}"`);
      short = alias;
    }
    if (!out.includes(short)) out.push(short);
  }
  console.log(`🌍 [normalizeLangList] Output languages: ${JSON.stringify(out)}`);
  return out;
}

function availablePromptLangs(): LangCode[] {
  const providerLangs = Object.keys(prompts.provider_intro) as LangCode[];
  const clientLangs = Object.keys(prompts.client_intro) as LangCode[];
  return providerLangs.filter((l) => clientLangs.includes(l));
}

// pickSessionLanguage removed - now each participant gets their own language (P2 fix)

function localeFor(langKey: string): string {
  return VOICE_LOCALES[langKey] || VOICE_LOCALES["en"];
}

// =====================================
// Payloads + type-guard pour startOutboundCall
// =====================================
interface StartOutboundCallExistingPayload {
  sessionId: string;
  delayMinutes?: number;
  delaySeconds?: number;
}
interface StartOutboundCallCreatePayload
  extends StartOutboundCallExistingPayload {
  providerId: string;
  clientId: string;
  providerPhone: string;
  clientPhone: string;
  serviceType: "lawyer_call" | "expat_call";
  providerType: "lawyer" | "expat";
  paymentIntentId: string;
  amount: number;
  requestId?: string;
  clientLanguages?: string[];
  providerLanguages?: string[];
}
type StartOutboundCallInput =
  | StartOutboundCallExistingPayload
  | StartOutboundCallCreatePayload;

function isCreatePayload(
  i: StartOutboundCallInput
): i is StartOutboundCallCreatePayload {
  return (
    "providerId" in i &&
    "providerPhone" in i &&
    "clientPhone" in i &&
    "paymentIntentId" in i &&
    "amount" in i
  );
}

export class TwilioCallManager {
  // ===== Singleton interne =====
  private static _instance: TwilioCallManager | null = null;
  static getInstance(): TwilioCallManager {
    if (!this._instance) this._instance = new TwilioCallManager();
    return this._instance;
  }

  /** ⚡️ API utilisée par l’adapter */
  static async startOutboundCall(
    input: StartOutboundCallInput
  ): Promise<CallSessionState | void> {
    try {
      if (!input?.sessionId)
        throw new Error('startOutboundCall: "sessionId" requis');

      const mgr = TwilioCallManager.getInstance();
      const delayMinutes =
        typeof input.delayMinutes === "number"
          ? input.delayMinutes
          : typeof input.delaySeconds === "number"
            ? Math.ceil(input.delaySeconds / 60)
            : 0;

      // Existant ?
      const existing = await mgr.getCallSession(input.sessionId);
      if (existing) {
        await mgr.initiateCallSequence(input.sessionId, delayMinutes);
        return existing;
      }

      // Création + lancement
      if (!isCreatePayload(input)) {
        throw new Error(
          "startOutboundCall: la session n’existe pas, champs de création manquants"
        );
      }

      const created = await mgr.createCallSession({
        sessionId: input.sessionId,
        providerId: input.providerId,
        clientId: input.clientId,
        providerPhone: input.providerPhone,
        clientPhone: input.clientPhone,
        serviceType: input.serviceType,
        providerType: input.providerType,
        paymentIntentId: input.paymentIntentId,
        amount: input.amount,
        requestId: input.requestId,
        clientLanguages: input.clientLanguages,
        providerLanguages: input.providerLanguages,
        callSessionId: input.sessionId,
      });
      console.log("🛒 Call session created:", created);

      await mgr.initiateCallSequence(input.sessionId, delayMinutes);
      return created;
    } catch (error) {
      await logError("TwilioCallManager:startOutboundCall", error as unknown);
      throw error;
    }
  }

  // ===== Instance =====
  private db: admin.firestore.Firestore;
  private activeCalls = new Map<string, NodeJS.Timeout>();
  // CPU OPTIMIZATION: Removed unused callQueue and setInterval polling
  // The queue was never used (addToQueue never called) but setInterval ran every 2s
  // Saving ~40% CPU on TwilioCallManager instances

  constructor() {
    this.db = admin.firestore();
    // CPU OPTIMIZATION: Removed startQueueProcessor() - was polling every 2s for nothing
  }

  // CPU OPTIMIZATION: Removed startQueueProcessor() and processQueuedCall()
  // These used setInterval(2000) but callQueue was never populated
  // If queue functionality is needed in the future, use Cloud Tasks or Pub/Sub instead

  private validatePhoneNumber(phone: string): string {
    if (!phone || typeof phone !== "string")
      throw new Error("Numéro de téléphone requis");
    const cleaned = phone.trim().replace(/[^\d+]/g, "");
    if (!cleaned.startsWith("+"))
      throw new Error(`Numéro invalide: ${phone}. Format: +33XXXXXXXXX`);
    const digits = cleaned.substring(1);
    if (digits.length < 8 || digits.length > 15)
      throw new Error(
        `Numéro invalide: ${phone}. Longueur 8-15 chiffres après +`
      );
    return cleaned;
  }

  async createCallSession(params: {
    sessionId: string;
    callSessionId: string;
    providerId: string;
    clientId: string;
    providerPhone: string;
    clientPhone: string;
    serviceType: "lawyer_call" | "expat_call";
    providerType: "lawyer" | "expat";
    paymentIntentId: string;
    amount: number;
    requestId?: string;
    clientLanguages?: string[];
    providerLanguages?: string[];
  }): Promise<CallSessionState> {
    try {
      const BYPASS_VALIDATIONS = process.env.TEST_BYPASS_VALIDATIONS === "1";
      if (!params.sessionId || !params.providerId || !params.clientId) {
        throw new Error(
          "Paramètres requis manquants: sessionId, providerId, clientId"
        );
      }
      if (!BYPASS_VALIDATIONS) {
        if (!params.paymentIntentId || !params.amount || params.amount <= 0) {
          throw new Error("Informations de paiement invalides");
        }
      }

      const validProviderPhone = BYPASS_VALIDATIONS
        ? params.providerPhone
        : this.validatePhoneNumber(params.providerPhone);
      const validClientPhone = BYPASS_VALIDATIONS
        ? params.clientPhone
        : this.validatePhoneNumber(params.clientPhone);
      if (!BYPASS_VALIDATIONS) {
        if (validProviderPhone === validClientPhone) {
          throw new Error(
            "Les numéros du prestataire et du client doivent être différents"
          );
        }
      }

      const activeSessions = await this.getActiveSessionsCount();
      if (!BYPASS_VALIDATIONS) {
        if (activeSessions >= CALL_CONFIG.MAX_CONCURRENT_CALLS) {
          // Limite désactivée en mode test
          // this is to limit the number of sessions that can be created at the same time
          throw new Error(
            "Limite d'appels simultanés atteinte. Réessayer dans quelques minutes."
          );
        }
      }

      const maxDuration = params.providerType === "lawyer" ? 1320 : 1920; // 22/32 min
      const conferenceName = `conf_${params.sessionId}_${Date.now()}`;

      // Encrypt phone numbers for storage (GDPR/PII protection)
      const encryptedProviderPhone = encryptPhoneNumber(validProviderPhone);
      const encryptedClientPhone = encryptPhoneNumber(validClientPhone);

      const callSession: CallSessionState = {
        id: params.sessionId,
        status: "pending",
        // P0 FIX: Ajouter clientId et providerId au niveau racine pour compatibilité Firestore rules
        clientId: params.clientId,
        providerId: params.providerId,
        // P1-13 FIX: Ajouter paymentId comme FK vers payments collection (source of truth unique)
        paymentId: params.paymentIntentId,
        participants: {
          provider: {
            phone: encryptedProviderPhone,
            status: "pending",
            attemptCount: 0,
          },
          client: {
            phone: encryptedClientPhone,
            status: "pending",
            attemptCount: 0,
          },
        },
        conference: { name: conferenceName },
        payment: {
          intentId: params.paymentIntentId,
          status: "authorized",
          amount: params.amount,
        },
        metadata: {
          providerId: params.providerId,
          clientId: params.clientId,
          serviceType: params.serviceType,
          providerType: params.providerType,
          maxDuration,
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
          requestId: params.requestId,
          clientLanguages: params.clientLanguages || ["fr"],
          providerLanguages: params.providerLanguages || ["fr"],
        },
      };

      const existingSession = await this.getCallSession(params.sessionId);
      if (existingSession)
        throw new Error(`Session d'appel existe déjà: ${params.sessionId}`);

      await this.saveWithRetry(() =>
        this.db
          .collection("call_sessions")
          .doc(params.sessionId)
          .set(callSession)
      );

      await logCallRecord({
        callId: params.sessionId,
        status: "session_created",
        retryCount: 0,
        additionalData: {
          serviceType: params.serviceType,
          amount: params.amount,
          requestId: params.requestId,
        },
      });

      console.log(`✅ Session d'appel créée: ${params.sessionId}`);
      return callSession;
    } catch (error) {
      await logError("TwilioCallManager:createCallSession", error as unknown);
      throw error;
    }
  }

  async initiateCallSequence(
    sessionId: string,
    delayMinutes: number = 1
  ): Promise<void> {
    const callRequestId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    try {
      prodLogger.info('TWILIO_CALL_INIT', `[${callRequestId}] Initiating call sequence`, {
        callRequestId,
        sessionId,
        delayMinutes,
      });

      console.log(
        `🚀 Init séquence d'appel ${sessionId} dans ${delayMinutes} min`
      );

      const callSession = await this.getCallSession(sessionId);
      if (!callSession) {
        prodLogger.error('TWILIO_CALL_ERROR', `[${callRequestId}] Session not found`, {
          callRequestId,
          sessionId,
        });
        throw new Error(`Session ${sessionId} not found`);
      }

      prodLogger.debug('TWILIO_SESSION_LOADED', `[${callRequestId}] Call session loaded`, {
        callRequestId,
        sessionId,
        status: callSession.status,
        clientId: callSession.clientId,
        providerId: callSession.providerId,
        paymentIntentId: callSession.payment?.intentId,
      });

      // P2-7 FIX: Ensure metadata defaults are persisted to Firestore
      let metadataUpdated = false;
      if (!callSession.metadata) {
        console.warn(
          `No metadata found for session ${sessionId}, creating minimal metadata`
        );
        callSession.metadata = {
          clientLanguages: ["en"],
          providerLanguages: ["en"],
        } as typeof callSession.metadata;
        metadataUpdated = true;
      } else {
        // Just update the existing metadata with language defaults
        if (!callSession.metadata.clientLanguages) {
          callSession.metadata.clientLanguages = ["en"];
          metadataUpdated = true;
        }
        if (!callSession.metadata.providerLanguages) {
          callSession.metadata.providerLanguages = ["en"];
          metadataUpdated = true;
        }
      }
      // Persist metadata fallback to Firestore
      if (metadataUpdated) {
        await this.db.collection("call_sessions").doc(sessionId).update({
          "metadata.clientLanguages": callSession.metadata.clientLanguages,
          "metadata.providerLanguages": callSession.metadata.providerLanguages,
          "metadata.updatedAt": admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`📄 Persisted metadata fallback for session ${sessionId}`);
      }

      if (delayMinutes > 0) {
        const timeout = setTimeout(
          async () => {
            this.activeCalls.delete(sessionId);
            await this.executeCallSequence(sessionId);
          },
          Math.min(delayMinutes, 10) * 60 * 1000
        );
        this.activeCalls.set(sessionId, timeout);
        return;
      }
      await this.executeCallSequence(sessionId);
    } catch (error) {
      await logError(
        "TwilioCallManager:initiateCallSequence",
        error as unknown
      );
      await this.handleCallFailure(sessionId, "system_error");
    }
  }

  private async executeCallSequence(sessionId: string): Promise<void> {
    const execId = `exec_${Date.now().toString(36)}`;

    console.log(`\n${'='.repeat(80)}`);
    console.log(`📞 [${execId}] executeCallSequence START`);
    console.log(`${'='.repeat(80)}`);
    console.log(`📞 [${execId}]   sessionId: ${sessionId}`);
    console.log(`📞 [${execId}]   timestamp: ${new Date().toISOString()}`);

    prodLogger.info('TWILIO_EXEC_START', `[${execId}] Executing call sequence`, {
      execId,
      sessionId,
    });

    console.log(`📞 [${execId}] STEP 1: Fetching call session from Firestore`);
    const callSession = await this.getCallSession(sessionId);
    if (!callSession) {
      console.log(`📞 [${execId}] ❌ FATAL: Session NOT FOUND in Firestore`);
      prodLogger.error('TWILIO_EXEC_ERROR', `[${execId}] Session not found`, { execId, sessionId });
      throw new Error(`Session d'appel non trouvée: ${sessionId}`);
    }

    console.log(`📞 [${execId}] STEP 2: Session found, analyzing state:`);
    console.log(`📞 [${execId}]   session.status: "${callSession.status}"`);
    console.log(`📞 [${execId}]   payment.intentId: ${callSession.payment?.intentId || 'MISSING'}`);
    console.log(`📞 [${execId}]   payment.status: ${callSession.payment?.status || 'MISSING'}`);
    console.log(`📞 [${execId}]   client.phone exists: ${!!callSession.participants?.client?.phone}`);
    console.log(`📞 [${execId}]   provider.phone exists: ${!!callSession.participants?.provider?.phone}`);
    console.log(`📞 [${execId}]   client.attemptCount: ${callSession.participants?.client?.attemptCount || 0}`);
    console.log(`📞 [${execId}]   provider.attemptCount: ${callSession.participants?.provider?.attemptCount || 0}`);

    if (callSession.status === "cancelled" || callSession.status === "failed") {
      console.log(`📞 [${execId}] ⚠️ Session already in terminal state: ${callSession.status}`);
      console.log(`📞 [${execId}]   → SKIPPING call execution`);
      prodLogger.warn('TWILIO_EXEC_SKIP', `[${execId}] Session already ${callSession.status}`, {
        execId,
        sessionId,
        status: callSession.status,
      });
      return;
    }

    console.log(`📞 [${execId}] STEP 3: Session status OK, proceeding to payment validation`);
    const BYPASS_VALIDATIONS = process.env.TEST_BYPASS_VALIDATIONS === "1";
    console.log(`📞 [${execId}]   TEST_BYPASS_VALIDATIONS: ${BYPASS_VALIDATIONS}`);
    console.log(`📞 [${execId}]   call_sessions.payment.status: "${callSession.payment?.status}"`);

    // P0 FIX: Pass call_sessions.payment.status as fallback for validatePaymentStatus
    const paymentValid = BYPASS_VALIDATIONS
      ? true
      : await this.validatePaymentStatus(
          callSession.payment.intentId,
          callSession.payment.status // Fallback status from call_sessions
        );

    console.log(`📞 [${execId}] STEP 4: Payment validation result: ${paymentValid ? '✅ VALID' : '❌ INVALID'}`);

    prodLogger.debug('TWILIO_PAYMENT_CHECK', `[${execId}] Payment validation`, {
      execId,
      sessionId,
      paymentIntentId: callSession.payment?.intentId,
      sessionPaymentStatus: callSession.payment?.status,
      paymentValid,
      bypassed: BYPASS_VALIDATIONS,
    });

    if (!paymentValid) {
      console.log(`📞 [${execId}] ❌ PAYMENT INVALID - Aborting call sequence`);
      console.log(`📞 [${execId}]   → Calling handleCallFailure("payment_invalid")`);
      console.log(`📞 [${execId}]   → CLIENT PHONE WILL NOT RING`);
      console.log(`📞 [${execId}]   → PROVIDER PHONE WILL NOT RING`);
      prodLogger.error('TWILIO_PAYMENT_INVALID', `[${execId}] Payment invalid - failing call`, {
        execId,
        sessionId,
        paymentIntentId: callSession.payment?.intentId,
      });
      await this.handleCallFailure(sessionId, "payment_invalid");
      return;
    }

    console.log(`📞 [${execId}] STEP 5: Payment valid, preparing Twilio calls`);
    console.log(`📞 [${execId}]   → NEXT: Call CLIENT phone first`);

    // 🔧 Add null checks for language arrays
    if (!callSession.metadata.clientLanguages) {
      console.log(
        `🔧 [TwilioCallManager] Adding missing clientLanguages for ${sessionId}`
      );
      await this.db
        .collection("call_sessions")
        .doc(sessionId)
        .update({
          "metadata.clientLanguages": ["en"],
          "metadata.providerLanguages": callSession.metadata
            .providerLanguages || ["en"],
          "metadata.updatedAt": admin.firestore.Timestamp.now(),
        });
      // Update local session object
      callSession.metadata.clientLanguages = ["en"];
    }

    if (!callSession.metadata.providerLanguages) {
      console.log(
        `🔧 [TwilioCallManager] Adding missing providerLanguages for ${sessionId}`
      );
      await this.db
        .collection("call_sessions")
        .doc(sessionId)
        .update({
          "metadata.providerLanguages": ["en"],
          "metadata.updatedAt": admin.firestore.Timestamp.now(),
        });
      // Update local session object
      callSession.metadata.providerLanguages = ["en"];
    }

    // =========================================================================
    // P2 FIX: Each participant hears the message in THEIR OWN language
    // - Client hears in client's first language
    // - Provider hears in provider's first language
    // =========================================================================
    const supportedLangs = new Set(availablePromptLangs());

    // Get client's preferred language (first one that's supported, or "en")
    console.log(`🌍 [LANG] Raw metadata.clientLanguages: ${JSON.stringify(callSession.metadata.clientLanguages)}`);
    console.log(`🌍 [LANG] Raw metadata.providerLanguages: ${JSON.stringify(callSession.metadata.providerLanguages)}`);

    const clientLangs = normalizeLangList(callSession.metadata.clientLanguages || ["en"]);
    const clientLangKey = clientLangs.find(l => supportedLangs.has(l as LangCode)) || "en";
    const clientTtsLocale = localeFor(clientLangKey);

    // Get provider's preferred language (first one that's supported, or "en")
    const providerLangs = normalizeLangList(callSession.metadata.providerLanguages || ["en"]);
    const providerLangKey = providerLangs.find(l => supportedLangs.has(l as LangCode)) || "en";
    const providerTtsLocale = localeFor(providerLangKey);

    console.log(`🌍 [LANG] Supported languages: ${JSON.stringify(Array.from(supportedLangs))}`);
    console.log(`🌍 [LANG] Client language: ${getLanguageName(clientLangKey)} (${clientLangKey})`);
    console.log(`🌍 [LANG] Provider language: ${getLanguageName(providerLangKey)} (${providerLangKey})`);

    await this.saveWithRetry(() =>
      this.db.collection("call_sessions").doc(sessionId).update({
        "metadata.clientLanguage": clientLangKey,
        "metadata.clientTtsLocale": clientTtsLocale,
        "metadata.providerLanguage": providerLangKey,
        "metadata.providerTtsLocale": providerTtsLocale,
        "metadata.updatedAt": admin.firestore.Timestamp.now(),
      })
    );

    await this.updateCallSessionStatus(sessionId, "client_connecting");

    // Decrypt phone numbers for Twilio call
    // P1-1 FIX: Wrap decryption in try-catch to handle corrupted/invalid encrypted data
    let clientPhone: string;
    let providerPhone: string;
    try {
      clientPhone = decryptPhoneNumber(callSession.participants.client.phone);
    } catch (decryptError) {
      console.error(`🔐❌ [${sessionId}] Failed to decrypt client phone:`, decryptError);
      await logError('TwilioCallManager:startConference:decryptClientPhone', { sessionId, error: decryptError });
      throw new Error(`Cannot start call: client phone decryption failed`);
    }
    try {
      providerPhone = decryptPhoneNumber(callSession.participants.provider.phone);
    } catch (decryptError) {
      console.error(`🔐❌ [${sessionId}] Failed to decrypt provider phone:`, decryptError);
      await logError('TwilioCallManager:startConference:decryptProviderPhone', { sessionId, error: decryptError });
      throw new Error(`Cannot start call: provider phone decryption failed`);
    }

    console.log(`\n${'🔵'.repeat(40)}`);
    console.log(`📞 [WORKFLOW] ÉTAPE 1: APPEL CLIENT`);
    console.log(`📞   sessionId: ${sessionId}`);
    console.log(`📞   langue: ${getLanguageName(clientLangKey)}`);
    console.log(`📞   conferenceName: ${callSession.conference.name}`);
    console.log(`📞   maxDuration: ${callSession.metadata.maxDuration}s`);
    console.log(`${'🔵'.repeat(40)}`);

    const clientConnected = await this.callParticipantWithRetries(
      sessionId,
      "client",
      clientPhone,
      callSession.conference.name,
      callSession.metadata.maxDuration,
      clientTtsLocale,
      clientLangKey
    );

    console.log(`\n${'📱'.repeat(40)}`);
    console.log(`📞 [WORKFLOW] CLIENT RESULT: ${clientConnected ? '✅ CONNECTÉ' : '❌ NON CONNECTÉ'}`);
    console.log(`${'📱'.repeat(40)}`);

    if (!clientConnected) {
      console.log(`📞 [WORKFLOW] ❌ CLIENT NON CONNECTÉ - Appel handleCallFailure("client_no_answer")`);
      console.log(`📞 [WORKFLOW] ⚠️ LE PROVIDER NE SERA PAS APPELÉ`);
      await this.handleCallFailure(sessionId, "client_no_answer");
      return;
    }

    // Vérifier l'état après la connexion du client
    const sessionAfterClient = await this.getCallSession(sessionId);
    console.log(`\n${'🟢'.repeat(40)}`);
    console.log(`📞 [WORKFLOW] CLIENT CONNECTÉ - ÉTAT ACTUEL:`);
    console.log(`📞   session.status: ${sessionAfterClient?.status}`);
    console.log(`📞   client.status: ${sessionAfterClient?.participants.client.status}`);
    console.log(`📞   client.connectedAt: ${sessionAfterClient?.participants.client.connectedAt ? 'OUI' : 'NON'}`);
    console.log(`📞   provider.status: ${sessionAfterClient?.participants.provider.status}`);
    console.log(`${'🟢'.repeat(40)}`);

    await this.updateCallSessionStatus(sessionId, "provider_connecting");

    console.log(`\n${'🟠'.repeat(40)}`);
    console.log(`📞 [WORKFLOW] ÉTAPE 2: APPEL PROVIDER`);
    console.log(`📞   sessionId: ${sessionId}`);
    console.log(`📞   langue: ${getLanguageName(providerLangKey)}`);
    console.log(`📞   delayInitial: 15000ms (pour permettre au client d'entendre le message)`);
    console.log(`${'🟠'.repeat(40)}`);

    const providerConnected = await this.callParticipantWithRetries(
      sessionId,
      "provider",
      providerPhone,
      callSession.conference.name,
      callSession.metadata.maxDuration,
      providerTtsLocale,
      providerLangKey,
      15_000
    );

    console.log(`\n${'📱'.repeat(40)}`);
    console.log(`📞 [WORKFLOW] PROVIDER RESULT: ${providerConnected ? '✅ CONNECTÉ' : '❌ NON CONNECTÉ'}`);
    console.log(`${'📱'.repeat(40)}`);

    if (!providerConnected) {
      await this.handleCallFailure(sessionId, "provider_no_answer");
      return;
    }

    // P1-1 FIX: setProviderBusy supprimé ici - doublon avec twilioWebhooks.ts:239
    // Le webhook est le bon endroit car il confirme que le provider a réellement répondu.
    // Ici, providerConnected=true signifie juste que l'appel a été placé, pas répondu.

    await this.updateCallSessionStatus(sessionId, "both_connecting");

    await logCallRecord({
      callId: sessionId,
      status: "both_participants_called",
      retryCount: 0,
    });

    console.log(`✅ Séquence d'appel complétée pour ${sessionId}`);
  }

  private async validatePaymentStatus(
    paymentIntentId: string,
    fallbackSessionStatus?: string
  ): Promise<boolean> {
    const debugId = `pay_${Date.now().toString(36)}`;
    console.log(`💳 [${debugId}] validatePaymentStatus START`);
    console.log(`💳 [${debugId}]   paymentIntentId: ${paymentIntentId}`);
    console.log(`💳 [${debugId}]   fallbackSessionStatus: ${fallbackSessionStatus || 'none'}`);

    // P0 FIX: Valid statuses set - centralized definition
    const validStatuses = new Set<string>([
      "requires_payment_method",
      "requires_confirmation",
      "requires_action",
      "processing",
      "requires_capture",
      "succeeded",
      "authorized",
      "call_session_created",
      "pending", // PayPal equivalent
    ]);

    try {
      console.log(`💳 [${debugId}] STEP 1: Calling stripeManager.getPayment()`);
      const payment = await stripeManager.getPayment(paymentIntentId);

      console.log(`💳 [${debugId}] STEP 2: Payment lookup result:`);
      console.log(`💳 [${debugId}]   payment exists: ${!!payment}`);
      console.log(`💳 [${debugId}]   payment type: ${typeof payment}`);

      // P0 FIX: If payments document doesn't exist, use fallback from call_sessions.payment.status
      if (!payment || typeof payment !== "object") {
        console.log(`💳 [${debugId}] ⚠️ Payment document not found, trying fallback...`);
        console.log(`💳 [${debugId}]   fallbackSessionStatus: "${fallbackSessionStatus}"`);

        if (fallbackSessionStatus && validStatuses.has(fallbackSessionStatus)) {
          console.log(`💳 [${debugId}] ✅ FALLBACK SUCCESS: Using call_sessions.payment.status="${fallbackSessionStatus}"`);
          return true;
        }

        console.log(`💳 [${debugId}] ❌ FAIL: Payment is null and no valid fallback`);
        return false;
      }

      const paymentObj = payment as Record<string, unknown>;
      const status = paymentObj.status;

      console.log(`💳 [${debugId}] STEP 3: Payment status analysis:`);
      console.log(`💳 [${debugId}]   status value: "${status}"`);
      console.log(`💳 [${debugId}]   status type: ${typeof status}`);
      console.log(`💳 [${debugId}]   Full payment object keys: ${Object.keys(paymentObj).join(', ')}`);

      if (typeof status !== "string") {
        console.log(`💳 [${debugId}] ⚠️ Status not a string, trying fallback...`);

        if (fallbackSessionStatus && validStatuses.has(fallbackSessionStatus)) {
          console.log(`💳 [${debugId}] ✅ FALLBACK SUCCESS: Using call_sessions.payment.status="${fallbackSessionStatus}"`);
          return true;
        }

        console.log(`💳 [${debugId}] ❌ FAIL: Status is not a string and no valid fallback`);
        return false;
      }

      const isValid = validStatuses.has(status);

      console.log(`💳 [${debugId}] STEP 4: Validation result:`);
      console.log(`💳 [${debugId}]   Status "${status}" is valid: ${isValid}`);
      console.log(`💳 [${debugId}]   Valid statuses: ${Array.from(validStatuses).join(', ')}`);

      if (!isValid) {
        // P0 FIX: Try fallback before failing
        console.log(`💳 [${debugId}] ⚠️ Status invalid, trying fallback...`);

        if (fallbackSessionStatus && validStatuses.has(fallbackSessionStatus)) {
          console.log(`💳 [${debugId}] ✅ FALLBACK SUCCESS: Using call_sessions.payment.status="${fallbackSessionStatus}"`);
          return true;
        }

        console.log(`💳 [${debugId}] ❌ FAIL: Status "${status}" not in valid set and no valid fallback`);
      } else {
        console.log(`💳 [${debugId}] ✅ SUCCESS: Payment status valid`);
      }

      return isValid;
    } catch (error) {
      console.log(`💳 [${debugId}] ❌ EXCEPTION in validatePaymentStatus:`);
      console.log(`💳 [${debugId}]   Error: ${error instanceof Error ? error.message : String(error)}`);
      console.log(`💳 [${debugId}]   Stack: ${error instanceof Error ? error.stack : 'N/A'}`);

      // P0 FIX: Try fallback even on exception
      if (fallbackSessionStatus && validStatuses.has(fallbackSessionStatus)) {
        console.log(`💳 [${debugId}] ✅ FALLBACK SUCCESS after exception: Using call_sessions.payment.status="${fallbackSessionStatus}"`);
        return true;
      }

      await logError(
        "TwilioCallManager:validatePaymentStatus",
        error as unknown
      );
      return false;
    }
  }

  private async callParticipantWithRetries(
    sessionId: string,
    participantType: "provider" | "client",
    phoneNumber: string,
    conferenceName: string,
    timeLimit: number,
    ttsLocale: string,
    langKey: string,
    backoffOverrideMs?: number
  ): Promise<boolean> {
    // 3 tentatives pour le client ET le prestataire
    // Le remboursement ne se fait qu'après les 3 tentatives échouées
    const maxRetries = CALL_CONFIG.MAX_RETRIES;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // Define retryId BEFORE try block so it's accessible in catch block
      const retryId = `retry_${Date.now().toString(36)}_${attempt}`;

      try {
        // 🛑 STOP if session is already failed/cancelled (prevents unnecessary retries)
        console.log(`📞 [${retryId}] RETRY CHECK: Verifying session status before attempt ${attempt}...`);
        const sessionCheck = await this.getCallSession(sessionId);
        console.log(`📞 [${retryId}]   session.status: ${sessionCheck?.status || 'NOT_FOUND'}`);
        console.log(`📞 [${retryId}]   client.status: ${sessionCheck?.participants.client.status || 'N/A'}`);
        console.log(`📞 [${retryId}]   provider.status: ${sessionCheck?.participants.provider.status || 'N/A'}`);

        if (sessionCheck && (sessionCheck.status === "failed" || sessionCheck.status === "cancelled")) {
          console.log(`\n${'❌'.repeat(35)}`);
          console.log(`🛑 [${retryId}] RETRIES STOPPED!`);
          console.log(`🛑 [${retryId}]   Reason: session.status is "${sessionCheck.status}"`);
          console.log(`🛑 [${retryId}]   participantType: ${participantType}`);
          console.log(`🛑 [${retryId}]   attemptNumber: ${attempt}`);
          console.log(`🛑 [${retryId}]   ⚠️ This should NOT happen if the retry fix is working correctly!`);
          console.log(`🛑 [${retryId}]   ⚠️ handleEarlyDisconnection should NOT call handleCallFailure during retries`);
          console.log(`${'❌'.repeat(35)}\n`);
          await logCallRecord({
            callId: sessionId,
            status: `${participantType}_retries_stopped_session_${sessionCheck.status}`,
            retryCount: attempt - 1,
            additionalData: {
              stopReason: 'session_status_failed_or_cancelled',
              sessionStatus: sessionCheck.status,
              attemptWhenStopped: attempt,
            }
          });
          return false;
        }
        console.log(`📞 [${retryId}]   ✅ Session OK, proceeding with attempt ${attempt}`);


        // P0 FIX: 🛑 STOP if participant is already connected (prevents duplicate calls)
        const participant = participantType === "provider"
          ? sessionCheck?.participants.provider
          : sessionCheck?.participants.client;

        if (participant?.status === "connected") {
          console.log(`✅ [${retryId}] [IDEMPOTENT] ${participantType} already connected, no need to retry`);
          await logCallRecord({
            callId: sessionId,
            status: `${participantType}_already_connected_skip_retry`,
            retryCount: attempt - 1,
          });
          return true; // Already connected!
        }

        // P0 FIX: If there's an active call from previous attempt, check before creating new one
        if (attempt > 1 && participant?.callSid) {
          try {
            const twilioClient = getTwilioClient();
            const existingCall = await twilioClient.calls(participant.callSid).fetch();

            // P0 CRITICAL FIX: If call is "in-progress", the participant is likely connected
            // but status update may have failed (webhook issue).
            //
            // ⚠️ P0 FIX 2025-01: EXCEPT when AMD is still pending!
            // If AMD is pending, the call might be a voicemail that answered.
            // Voicemails ARE "in-progress" in Twilio because they answered the call.
            // We must wait for the AMD callback to confirm human vs machine.
            // DO NOT force "connected" if AMD is pending - this would call the provider for voicemail!
            if (existingCall.status === "in-progress") {
              // Check if AMD is still pending
              // NOTE: participant.status can't be "connected" here because we already
              // checked that at line 967 and returned early.
              if (participant.status === "amd_pending") {
                console.log(`⏳ [${retryId}] [AMD WAIT] Call ${participant.callSid} is IN-PROGRESS but AMD is PENDING`);
                console.log(`⏳ [${retryId}]   This could be a voicemail that answered - waiting for AMD callback`);
                console.log(`⏳ [${retryId}]   NOT forcing "connected" - let AMD callback determine human/machine`);
                // P0 FIX 2026-01-16: DO NOT CREATE A NEW CALL! The call is already in-progress!
                // Wait for the AMD callback by re-running waitForConnection
                // The AMD callback will set status to "connected" (human) or "no_answer" (machine)
                console.log(`⏳ [${retryId}]   🔄 Re-running waitForConnection to wait for AMD callback...`);
                const amdResult = await this.waitForConnection(sessionId, participantType, attempt);
                if (amdResult) {
                  console.log(`⏳ [${retryId}]   ✅ AMD callback confirmed HUMAN - returning success`);
                  return true;
                } else {
                  console.log(`⏳ [${retryId}]   ❌ AMD callback indicated MACHINE or timeout - will retry if attempts remain`);
                  // Continue to next iteration which will check if call is completed and maybe retry
                  continue;
                }
              } else {
                // Status is not "amd_pending" (and not "connected" - we checked that earlier)
                // but call is in-progress. This is a genuine recovery case where the webhook failed.
                console.log(`✅ [${retryId}] [RECOVERY] Call ${participant.callSid} is IN-PROGRESS!`);
                console.log(`✅ [${retryId}]   Current status: "${participant.status}" (not amd_pending)`);
                console.log(`✅ [${retryId}]   Participant is likely in conference but status wasn't updated correctly`);
                console.log(`✅ [${retryId}]   Forcing status to "connected" and returning success`);

                // Force update status to connected (recovery from missed webhook)
                await this.updateParticipantStatus(
                  sessionId,
                  participantType,
                  'connected',
                  admin.firestore.Timestamp.fromDate(new Date())
                );

                await logCallRecord({
                  callId: sessionId,
                  status: `${participantType}_recovered_from_in_progress`,
                  retryCount: attempt - 1,
                  additionalData: {
                    callSid: participant.callSid,
                    originalStatus: participant.status,
                    recoveryReason: 'call_was_in_progress_but_status_not_connected_or_amd_pending'
                  }
                });

                return true; // Participant is actually connected!
              }
            }

            // Only hangup if call is ringing or queued (not yet answered)
            if (existingCall.status === "ringing" || existingCall.status === "queued") {
              console.log(`📴 [${retryId}] [CLEANUP] Hanging up previous call ${participant.callSid} (status: ${existingCall.status})`);
              await twilioClient.calls(participant.callSid).update({ status: "completed" });
              await this.delay(1000); // Wait for Twilio to process
            }
          } catch (hangupError) {
            console.warn(`⚠️ [${retryId}] [CLEANUP] Could not check/hangup previous call:`, hangupError);
          }
        }
        console.log(`\n${'▓'.repeat(70)}`);
        console.log(`📞 [${retryId}] TWILIO CALL ATTEMPT ${attempt}/${maxRetries}`);
        console.log(`📞 [${retryId}]   sessionId: ${sessionId}`);
        console.log(`📞 [${retryId}]   participantType: ${participantType}`);
        console.log(`📞 [${retryId}]   phoneNumber: ${phoneNumber.substring(0, 6)}****`);
        console.log(`📞 [${retryId}]   conferenceName: ${conferenceName}`);
        console.log(`📞 [${retryId}]   timeLimit: ${timeLimit}s`);
        console.log(`📞 [${retryId}]   langKey: ${langKey}`);
        console.log(`📞 [${retryId}]   ttsLocale: ${ttsLocale}`);
        console.log(`${'▓'.repeat(70)}`);

        await this.incrementAttemptCount(sessionId, participantType);

        await logCallRecord({
          callId: sessionId,
          status: `${participantType}_attempt_${attempt}`,
          retryCount: attempt,
        });

        // P0 FIX: Instead of inline TwiML, use URL callback that checks AMD BEFORE playing audio
        // This prevents voicemail from recording our "vous allez être mis en relation" message
        console.log(`📞 [${retryId}] STEP A: Building AMD TwiML URL...`);
        const amdTwimlBaseUrl = getTwilioAmdTwimlUrl();
        const amdTwimlUrl = `${amdTwimlBaseUrl}?sessionId=${encodeURIComponent(sessionId)}&participantType=${participantType}&conferenceName=${encodeURIComponent(conferenceName)}&timeLimit=${timeLimit}&ttsLocale=${encodeURIComponent(ttsLocale)}&langKey=${encodeURIComponent(langKey)}`;
        console.log(`📞 [${retryId}]   amdTwimlUrl: ${amdTwimlUrl.substring(0, 100)}...`);

        console.log(`📞 [${retryId}] STEP B: Getting Twilio credentials...`);
        const twilioClient = getTwilioClient();
        const fromNumber = getTwilioPhoneNumber();
        // P0 CRITICAL FIX: Use dedicated Cloud Run URL instead of base + function name
        const twilioCallWebhookUrl = getTwilioCallWebhookUrl();
        console.log(`📞 [${retryId}]   fromNumber: ${fromNumber}`);
        console.log(`📞 [${retryId}]   statusCallback (Cloud Run): ${twilioCallWebhookUrl}`);

        console.log(`📞 [${retryId}] STEP C: Creating Twilio call via API...`);

        // P2-14 FIX: Circuit breaker check before calling Twilio
        if (isCircuitOpen()) {
          console.error(`📞 [${retryId}] ❌ CIRCUIT BREAKER OPEN - Twilio calls blocked temporarily`);
          throw new Error("Twilio service temporarily unavailable (circuit breaker open)");
        }

        console.log(`📞 [${retryId}]   twilioClient.calls.create({`);
        console.log(`📞 [${retryId}]     to: ${phoneNumber.substring(0, 6)}****,`);
        console.log(`📞 [${retryId}]     from: ${fromNumber},`);
        console.log(`📞 [${retryId}]     timeout: ${CALL_CONFIG.CALL_TIMEOUT},`);
        console.log(`📞 [${retryId}]     machineDetection: "Enable",`);
        console.log(`📞 [${retryId}]     url: ${amdTwimlUrl.substring(0, 50)}...`);
        console.log(`📞 [${retryId}]   })`);

        const twilioApiStartTime = Date.now();
        let call;
        try {
          call = await twilioClient.calls.create({
          to: phoneNumber,
          from: fromNumber,
          // P0 CRITICAL FIX: Use URL instead of inline TwiML
          // The URL endpoint (twilioAmdTwiml) will check AnsweredBy and return:
          // - Hangup TwiML if machine/voicemail (NO AUDIO played!)
          // - Conference TwiML if human
          url: amdTwimlUrl,
          method: "POST",
          // P0 CRITICAL FIX: Use Cloud Run URL directly (not base + function name)
          statusCallback: twilioCallWebhookUrl,
          statusCallbackMethod: "POST",
          // P0 FIX 2026-01-18: Only valid statusCallbackEvent values
          // "failed", "busy", "no-answer" are NOT events - they are STATUSES sent in "completed" callback
          // Valid events: initiated, ringing, answered, completed
          statusCallbackEvent: [
            "initiated",
            "ringing",
            "answered",
            "completed",
          ],
          timeout: CALL_CONFIG.CALL_TIMEOUT,
          // ENREGISTREMENT DÉSACTIVÉ - Illégal sans consentement explicite (RGPD)
          // record: true,
          // recordingStatusCallback: `${base}/twilioRecordingWebhook`,
          // recordingStatusCallbackMethod: "POST",
          // AMD DÉSACTIVÉ - La confirmation DTMF (appuyer sur 1) est suffisante et plus fiable
          // L'AMD causait un délai de 3-8 secondes de silence au début de chaque appel
          // Le DTMF détecte les répondeurs de façon fiable (un répondeur ne peut pas appuyer sur 1)
          });
          // P2-14 FIX: Record success for circuit breaker
          recordTwilioSuccess();
        } catch (twilioError: unknown) {
          // P2-14 FIX: Record failure for circuit breaker with detailed logging
          const err = twilioError instanceof Error ? twilioError : new Error(String(twilioError));

          // Extract Twilio-specific error details if available
          const twilioDetails = {
            code: (twilioError as any)?.code || 'N/A',
            status: (twilioError as any)?.status || 'N/A',
            moreInfo: (twilioError as any)?.moreInfo || 'N/A',
            details: (twilioError as any)?.details || 'N/A',
          };

          console.error(`📞 [${retryId}] ❌ TWILIO API CALL FAILED:`, {
            errorMessage: err.message,
            errorName: err.name,
            twilioCode: twilioDetails.code,
            twilioStatus: twilioDetails.status,
            twilioMoreInfo: twilioDetails.moreInfo,
            twilioDetails: JSON.stringify(twilioDetails.details),
            phoneNumber: phoneNumber?.substring(0, 6) + '****',
            participantType,
            attempt,
            timestamp: new Date().toISOString(),
          });

          recordTwilioFailure(err);
          throw twilioError; // Re-throw to let outer catch handle it
        }
        const twilioApiDuration = Date.now() - twilioApiStartTime;

        console.log(`📞 [${retryId}] STEP D: Twilio API response received in ${twilioApiDuration}ms`);
        console.log(`📞 [${retryId}]   call.sid: ${call.sid}`);
        console.log(`📞 [${retryId}]   call.status: ${call.status}`);
        console.log(`📞 [${retryId}]   call.to: ${call.to}`);
        console.log(`📞 [${retryId}]   call.from: ${call.from}`);
        console.log(`📞 [${retryId}]   call.direction: ${call.direction}`);
        console.log(`📞 [${retryId}]   call.dateCreated: ${call.dateCreated}`);

        console.log(`📞 [${retryId}] STEP E: Saving callSid to Firestore...`);
        await this.updateParticipantCallSid(
          sessionId,
          participantType,
          call.sid
        );
        console.log(`📞 [${retryId}]   ✅ CallSid saved`);

        console.log(`📞 [${retryId}] STEP F: Waiting for connection (waitForConnection)...`);
        console.log(`📞 [${retryId}]   This will poll Firestore for status="connected"`);
        console.log(`📞 [${retryId}]   Timeout: ${CALL_CONFIG.CONNECTION_WAIT_TIME}ms`);

        const waitStartTime = Date.now();
        const connected = await this.waitForConnection(
          sessionId,
          participantType,
          attempt
        );
        const waitDuration = Date.now() - waitStartTime;

        console.log(`📞 [${retryId}] STEP G: waitForConnection returned after ${waitDuration}ms`);
        console.log(`📞 [${retryId}]   connected: ${connected}`);

        if (connected) {
          console.log(`📞 [${retryId}] ✅✅✅ ${participantType.toUpperCase()} CONNECTED! ✅✅✅`);
          console.log(`${'▓'.repeat(70)}\n`);
          await logCallRecord({
            callId: sessionId,
            status: `${participantType}_connected_attempt_${attempt}`,
            retryCount: attempt,
          });
          return true;
        }

        // Connection failed - log why
        console.log(`📞 [${retryId}] ❌ ${participantType} NOT CONNECTED after attempt ${attempt}`);
        console.log(`📞 [${retryId}]   waitForConnection returned: ${connected}`);
        console.log(`📞 [${retryId}]   This means either timeout, disconnected, or no_answer`);

        if (attempt < maxRetries) {
          // 🛑 Check again before retrying - session might have been marked as failed
          console.log(`📞 [${retryId}] STEP H: Checking session status before retry...`);
          const sessionCheckBeforeRetry = await this.getCallSession(sessionId);
          const currentParticipant = participantType === "provider"
            ? sessionCheckBeforeRetry?.participants.provider
            : sessionCheckBeforeRetry?.participants.client;

          console.log(`📞 [${retryId}]   session.status: ${sessionCheckBeforeRetry?.status}`);
          console.log(`📞 [${retryId}]   participant.status: ${currentParticipant?.status}`);
          console.log(`📞 [${retryId}]   participant.callSid: ${currentParticipant?.callSid}`);

          if (sessionCheckBeforeRetry && (sessionCheckBeforeRetry.status === "failed" || sessionCheckBeforeRetry.status === "cancelled")) {
            console.log(`📞 [${retryId}] 🛑 STOPPING RETRIES: session is ${sessionCheckBeforeRetry.status}`);
            console.log(`${'▓'.repeat(70)}\n`);
            await logCallRecord({
              callId: sessionId,
              status: `${participantType}_retries_stopped_before_attempt_${attempt + 1}`,
              retryCount: attempt,
            });
            return false;
          }

          const backoffTime = typeof backoffOverrideMs === "number"
            ? backoffOverrideMs
            : 15_000 + attempt * 5_000;

          console.log(`📞 [${retryId}] STEP I: Waiting ${backoffTime}ms before retry ${attempt + 1}...`);
          await this.delay(backoffTime);
          console.log(`📞 [${retryId}]   Backoff complete, starting next attempt`);
        } else {
          console.log(`📞 [${retryId}] ❌ MAX RETRIES REACHED - No more attempts`);
        }
        console.log(`${'▓'.repeat(70)}\n`);
      } catch (error) {
        console.error(`📞 [${retryId}] ❌❌❌ EXCEPTION during Twilio call attempt ${attempt} ❌❌❌`);
        console.error(`📞 [${retryId}]   Error type: ${error?.constructor?.name}`);
        console.error(`📞 [${retryId}]   Error message: ${error instanceof Error ? error.message : String(error)}`);
        console.error(`📞 [${retryId}]   Error stack: ${error instanceof Error ? error.stack : 'N/A'}`);
        console.log(`${'▓'.repeat(70)}\n`);

        await logError(
          `TwilioCallManager:callParticipant:${participantType}:attempt_${attempt}`,
          error as unknown
        );

        await logCallRecord({
          callId: sessionId,
          status: `${participantType}_error_attempt_${attempt}`,
          retryCount: attempt,
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
        });

        if (attempt === maxRetries) break;
      }
    }

    console.log(`\n${'█'.repeat(70)}`);
    console.log(`❌ [callParticipantWithRetries] FINAL RESULT: ${participantType} FAILED ALL ${maxRetries} ATTEMPTS`);
    console.log(`❌ [callParticipantWithRetries]   sessionId: ${sessionId}`);
    console.log(`❌ [callParticipantWithRetries]   phoneNumber: ${phoneNumber.substring(0, 6)}****`);
    console.log(`${'█'.repeat(70)}\n`);

    await logCallRecord({
      callId: sessionId,
      status: `${participantType}_failed_all_attempts`,
      retryCount: maxRetries,
    });

    return false;
  }

  private async incrementAttemptCount(
    sessionId: string,
    participantType: "provider" | "client"
  ): Promise<void> {
    try {
      await this.db
        .collection("call_sessions")
        .doc(sessionId)
        .update({
          [`participants.${participantType}.attemptCount`]:
            admin.firestore.FieldValue.increment(1),
          "metadata.updatedAt": admin.firestore.Timestamp.now(),
        });
    } catch (error) {
      await logError(
        "TwilioCallManager:incrementAttemptCount",
        error as unknown
      );
    }
  }

  /**
   * CPU OPTIMIZATION: Replaced polling (every 3s) with Firestore real-time listener
   * Benefits:
   * - Instant detection (0ms latency vs up to 3s before)
   * - 90% fewer Firestore reads (1 listener vs ~30 reads per wait)
   * - Same UX (actually faster response time)
   */
  private async waitForConnection(
    sessionId: string,
    participantType: "provider" | "client",
    attempt: number
  ): Promise<boolean> {
    const waitId = `wait_${Date.now().toString(36)}`;
    const maxWaitTime = CALL_CONFIG.CONNECTION_WAIT_TIME;
    const AMD_MAX_WAIT_SECONDS = 40;

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`⏳ [${waitId}] waitForConnection START (OPTIMIZED - real-time listener)`);
    console.log(`⏳ [${waitId}]   sessionId: ${sessionId}`);
    console.log(`⏳ [${waitId}]   participantType: ${participantType}`);
    console.log(`⏳ [${waitId}]   attempt: ${attempt}`);
    console.log(`⏳ [${waitId}]   maxWaitTime: ${maxWaitTime}ms (${maxWaitTime/1000}s)`);

    return new Promise<boolean>((resolve) => {
      let resolved = false;
      let unsubscribe: (() => void) | null = null;
      let timeoutId: NodeJS.Timeout | null = null;
      let amdTimeoutId: NodeJS.Timeout | null = null;
      const startTime = Date.now();

      // Cleanup function to prevent memory leaks
      const cleanup = () => {
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (amdTimeoutId) {
          clearTimeout(amdTimeoutId);
          amdTimeoutId = null;
        }
      };

      // Resolve only once
      const resolveOnce = (result: boolean, reason: string) => {
        if (resolved) return;
        resolved = true;
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.log(`⏳ [${waitId}] ${result ? '✅' : '❌'} ${reason} after ${elapsed}s`);
        console.log(`${'─'.repeat(60)}\n`);
        cleanup();
        resolve(result);
      };

      // Global timeout
      timeoutId = setTimeout(() => {
        resolveOnce(false, `TIMEOUT: ${participantType} did not connect within ${maxWaitTime/1000}s`);
      }, maxWaitTime);

      // Set up real-time listener
      const docRef = this.db.collection("call_sessions").doc(sessionId);

      unsubscribe = docRef.onSnapshot(
        (snapshot) => {
          if (resolved) return;

          const session = snapshot.data() as CallSessionState | undefined;

          if (!session) {
            resolveOnce(false, `Session NOT FOUND`);
            return;
          }

          // Check session-level terminal states
          if (session.status === "failed" || session.status === "cancelled") {
            resolveOnce(false, `Session is ${session.status} - stopping wait`);
            return;
          }

          const participant = participantType === "provider"
            ? session.participants?.provider
            : session.participants?.client;

          const currentStatus = participant?.status || 'undefined';
          const elapsed = Math.round((Date.now() - startTime) / 1000);

          console.log(`⏳ [${waitId}] Status update: "${currentStatus}" (${elapsed}s elapsed)`);

          // Check for terminal statuses
          if (currentStatus === "connected") {
            resolveOnce(true, `SUCCESS: ${participantType} is CONNECTED`);
            return;
          }

          if (currentStatus === "disconnected") {
            resolveOnce(false, `FAIL: ${participantType} DISCONNECTED`);
            return;
          }

          if (currentStatus === "no_answer") {
            resolveOnce(false, `FAIL: ${participantType} NO_ANSWER`);
            return;
          }

          // Handle AMD pending with specific timeout
          if (currentStatus === "amd_pending" && !amdTimeoutId) {
            console.log(`⏳ [${waitId}] 🔍 AMD PENDING: Starting ${AMD_MAX_WAIT_SECONDS}s AMD timeout`);
            amdTimeoutId = setTimeout(() => {
              if (!resolved) {
                resolveOnce(false, `AMD pending for >${AMD_MAX_WAIT_SECONDS}s - callback likely failed`);
              }
            }, AMD_MAX_WAIT_SECONDS * 1000);
          }

          // Clear AMD timeout if status changed from amd_pending
          if (currentStatus !== "amd_pending" && amdTimeoutId) {
            clearTimeout(amdTimeoutId);
            amdTimeoutId = null;
          }
        },
        (error) => {
          console.error(`⏳ [${waitId}] ⚠️ Listener ERROR: ${String(error)}`);
          // Don't resolve on transient errors - let timeout handle it
        }
      );
    });
  }

  async handleEarlyDisconnection(
    sessionId: string,
    participantType: string,
    duration: number
  ): Promise<void> {
    try {
      const session = await this.getCallSession(sessionId);
      if (!session) return;

      // P1-2 FIX: Idempotency check - prevent double processing of early disconnection
      // This can happen when both participants disconnect and both webhooks arrive
      const finalStatuses = ['completed', 'failed', 'cancelled', 'refunded'];
      if (finalStatuses.includes(session.status)) {
        console.log(`📄 [IDEMPOTENCY] Session ${sessionId} already in final state: ${session.status}, skipping handleEarlyDisconnection`);
        return;
      }

      // Check if early_disconnect was already processed for this session
      if (session.metadata?.earlyDisconnectProcessed) {
        console.log(`📄 [IDEMPOTENCY] Early disconnect already processed for session: ${sessionId}`);
        return;
      }

      // Mark as being processed (atomic update)
      await this.db.collection("call_sessions").doc(sessionId).update({
        "metadata.earlyDisconnectProcessed": true,
        "metadata.earlyDisconnectBy": participantType,
        "metadata.earlyDisconnectDuration": duration,
        "metadata.earlyDisconnectAt": admin.firestore.FieldValue.serverTimestamp()
      });

      if (duration < CALL_CONFIG.MIN_CALL_DURATION) {
        console.log(`\n${'═'.repeat(70)}`);
        console.log(`📄 [handleEarlyDisconnection] EARLY DISCONNECT DETECTED`);
        console.log(`📄   sessionId: ${sessionId}`);
        console.log(`📄   participantType: ${participantType}`);
        console.log(`📄   duration: ${duration}s (< MIN_CALL_DURATION: ${CALL_CONFIG.MIN_CALL_DURATION}s)`);
        console.log(`${'═'.repeat(70)}`);

        // P0 FIX 2026-01-16: CRITICAL BUG FIX - Use connectedAt timestamps instead of current status!
        //
        // PROBLEM: The old code checked `anyParticipantConnected = client.status === 'connected' || provider.status === 'connected'`
        // BUT by the time handleEarlyDisconnection runs, the disconnecting participant is ALREADY set to "disconnected"!
        // This means:
        // - If client disconnects, client.status = 'disconnected' (not 'connected')
        // - The check was always FALSE for the disconnecting participant
        //
        // SOLUTION: Check if BOTH participants WERE connected at some point (connectedAt timestamps exist)
        // - connectedAt is set ONCE when participant becomes connected
        // - connectedAt is NOT cleared when participant disconnects
        // - If BOTH connectedAt exist, a real call happened and we should fail
        // - If only ONE connectedAt exists, the call never fully connected - allow retries
        //
        const disconnectedParticipant = participantType === 'provider'
          ? session.participants.provider
          : session.participants.client;
        const otherParticipant = participantType === 'provider'
          ? session.participants.client
          : session.participants.provider;
        const maxRetries = CALL_CONFIG.MAX_RETRIES;

        // P0 FIX: Check if BOTH participants WERE connected (actual call happened)
        // Use connectedAt timestamps which persist even after disconnect
        const clientWasConnected = session.participants.client.connectedAt !== undefined;
        const providerWasConnected = session.participants.provider.connectedAt !== undefined;
        const bothWereConnected = clientWasConnected && providerWasConnected;

        // P0 FIX v2 2026-01-18: Check BOTH participants' retry status!
        // BUG FIXED: When client disconnects while provider is still retrying,
        // we were checking client.attemptCount (3) which marked retriesExhausted=true
        // even though provider only had 1 attempt. This stopped provider retries!
        //
        // CORRECT LOGIC: Only mark retriesExhausted if BOTH participants have exhausted retries
        // OR if the OTHER participant (the one still trying) has exhausted retries.
        const disconnectedAttempts = disconnectedParticipant?.attemptCount || 0;
        const otherAttempts = otherParticipant?.attemptCount || 0;
        const otherParticipantType = participantType === 'provider' ? 'client' : 'provider';

        // Retries are only truly exhausted if:
        // 1. The disconnected participant exhausted their retries AND
        // 2. The other participant is either connected OR has also exhausted retries
        const otherIsConnected = otherParticipant?.connectedAt !== undefined;
        const otherRetriesExhausted = otherAttempts >= maxRetries;
        const retriesExhausted = disconnectedAttempts >= maxRetries && (otherIsConnected || otherRetriesExhausted);

        console.log(`📄 [handleEarlyDisconnection] 🔍 RETRY DECISION ANALYSIS (P0 FIX v2 2026-01-18):`);
        console.log(`📄   ┌─────────────────────────────────────────────────────────────┐`);
        console.log(`📄   │ participantType (disconnected): ${participantType.padEnd(26)}│`);
        console.log(`📄   │ otherParticipantType (still trying): ${otherParticipantType.padEnd(21)}│`);
        console.log(`📄   │ ${participantType}.attemptCount: ${String(disconnectedAttempts).padEnd(36)}│`);
        console.log(`📄   │ ${otherParticipantType}.attemptCount: ${String(otherAttempts).padEnd(33)}│`);
        console.log(`📄   │ maxRetries: ${String(maxRetries).padEnd(49)}│`);
        console.log(`📄   │ client.status: ${(session.participants.client.status || 'undefined').padEnd(45)}│`);
        console.log(`📄   │ provider.status: ${(session.participants.provider.status || 'undefined').padEnd(43)}│`);
        console.log(`📄   │ client.connectedAt: ${(clientWasConnected ? 'YES' : 'NO').padEnd(40)}│`);
        console.log(`📄   │ provider.connectedAt: ${(providerWasConnected ? 'YES' : 'NO').padEnd(38)}│`);
        console.log(`📄   │ bothWereConnected (ACTUAL CALL): ${String(bothWereConnected).padEnd(26)}│`);
        console.log(`📄   │ otherIsConnected: ${String(otherIsConnected).padEnd(42)}│`);
        console.log(`📄   │ otherRetriesExhausted: ${String(otherRetriesExhausted).padEnd(37)}│`);
        console.log(`📄   │ retriesExhausted (FINAL): ${String(retriesExhausted).padEnd(34)}│`);
        console.log(`📄   └─────────────────────────────────────────────────────────────┘`);

        // P0 FIX v2: Only mark as failed if:
        // 1. BOTH participants were connected at some point (actual call happened, not just waiting)
        // 2. OR all retry attempts have been exhausted for BOTH participants
        if (bothWereConnected || retriesExhausted) {
          console.log(`📄   🔴 DECISION: CALL handleCallFailure`);
          if (bothWereConnected) {
            console.log(`📄      Reason: BOTH participants were connected (actual call happened)`);
          } else {
            console.log(`📄      Reason: ${participantType} exhausted (${disconnectedAttempts}/${maxRetries}) AND ${otherParticipantType} ${otherIsConnected ? 'is connected' : `also exhausted (${otherAttempts}/${maxRetries})`}`);
          }
          await this.handleCallFailure(
            sessionId,
            `early_disconnect_${participantType}`
          );
        } else {
          console.log(`📄   🟢 DECISION: SKIP handleCallFailure - LET OTHER PARTICIPANT RETRY`);
          console.log(`📄      Reason: ${otherParticipantType} has retries remaining (${otherAttempts}/${maxRetries})`);
          console.log(`📄      The ${otherParticipantType}'s call attempts will continue`);
        }
        console.log(`${'═'.repeat(70)}\n`);

        await logCallRecord({
          callId: sessionId,
          status: `early_disconnect_${participantType}`,
          retryCount: disconnectedAttempts,
          additionalData: {
            participantType,
            otherParticipantType,
            duration,
            reason: "below_min_duration",
            handledByRetryLoop: !bothWereConnected && !retriesExhausted,
            clientWasConnected,
            providerWasConnected,
            bothWereConnected,
            disconnectedAttempts,
            otherAttempts,
            otherIsConnected,
            otherRetriesExhausted,
            retriesExhausted,
          },
        });
      } else {
        console.log(`📄 Handling call completion for session: ${sessionId}`);
        await this.handleCallCompletion(sessionId, duration);
      }

      // === EARLY DISCONNECTION FINAL SUMMARY ===
      const finalEarlySession = await this.getCallSession(sessionId);
      console.log(`\n${'📄'.repeat(30)}`);
      console.log(`📄 [handleEarlyDisconnection] === FINAL SUMMARY ===`);
      console.log(`📄   sessionId: ${sessionId}`);
      console.log(`📄   participantType: ${participantType}`);
      console.log(`📄   duration: ${duration}s`);
      if (finalEarlySession) {
        console.log(`📄   FINAL STATE:`);
        console.log(`📄     session.status: ${finalEarlySession.status}`);
        console.log(`📄     payment.status: ${finalEarlySession.payment?.status}`);
        console.log(`📄     client.status: ${finalEarlySession.participants.client.status}`);
        console.log(`📄     provider.status: ${finalEarlySession.participants.provider.status}`);
      }
      console.log(`${'📄'.repeat(30)}\n`);

    } catch (error) {
      await logError(
        "TwilioCallManager:handleEarlyDisconnection",
        error as unknown
      );
    }
  }

  // async handleCallFailure(sessionId: string, reason: string): Promise<void> {
  //   try {
  //     const callSession = await this.getCallSession(sessionId);
  //     if (!callSession) return;

  //     await this.updateCallSessionStatus(sessionId, 'failed');

  //     const clientLanguage = callSession.metadata.clientLanguages?.[0] || 'fr';
  //     const providerLanguage = callSession.metadata.providerLanguages?.[0] || 'fr';

  //     try {
  //       const notificationPromises: Array<Promise<unknown>> = [];

  //       if (reason === 'client_no_answer' || reason === 'system_error') {
  //         notificationPromises.push(
  //           messageManager.sendSmartMessage({
  //             to: callSession.participants.provider.phone,
  //             templateId: `call_failure_${reason}_provider`,
  //             variables: { clientName: 'le client', serviceType: callSession.metadata.serviceType, language: providerLanguage }
  //           })
  //         );
  //       }

  //       if (reason === 'provider_no_answer' || reason === 'system_error') {
  //         notificationPromises.push(
  //           messageManager.sendSmartMessage({
  //             to: callSession.participants.client.phone,
  //             templateId: `call_failure_${reason}_client`,
  //             variables: { providerName: 'votre expert', serviceType: callSession.metadata.serviceType, language: clientLanguage }
  //           })
  //         );
  //       }

  //       await Promise.allSettled(notificationPromises);
  //     } catch (notificationError) {
  //       await logError('TwilioCallManager:handleCallFailure:notification', notificationError as unknown);
  //     }

  //     await this.processRefund(sessionId, `failed_${reason}`);

  //     await logCallRecord({
  //       callId: sessionId,
  //       status: `call_failed_${reason}`,
  //       retryCount: 0,
  //       additionalData: { reason, paymentIntentId: callSession.payment.intentId }
  //     });
  //   } catch (error) {
  //     await logError('TwilioCallManager:handleCallFailure', error as unknown);
  //   }
  // }

  async handleCallFailure(sessionId: string, reason: string): Promise<void> {
    const failureId = `failure_${Date.now().toString(36)}`;
    // 🔍 DEBUG P0: Stack trace pour identifier l'origine de l'appel
    const stackTrace = new Error().stack?.split('\n').slice(1, 10).join('\n') || 'No stack';

    console.log(`\n${'🔥'.repeat(35)}`);
    console.log(`🔥 [${failureId}] ========== handleCallFailure CALLED ==========`);
    console.log(`🔥 [${failureId}]   sessionId: ${sessionId}`);
    console.log(`🔥 [${failureId}]   reason: ${reason}`);
    console.log(`🔥 [${failureId}]   timestamp: ${new Date().toISOString()}`);
    console.log(`🔥 [${failureId}]   ⚠️ This will set session.status = "failed"`);
    console.log(`🔥 [${failureId}]   ⚠️ This will TRIGGER processRefund() and CANCEL payment!`);
    console.log(`🔥 [${failureId}] STACK TRACE (qui a appelé handleCallFailure?):`);
    console.log(stackTrace);
    console.log(`${'🔥'.repeat(35)}`);

    try {
      const callSession = await this.getCallSession(sessionId);
      if (!callSession) {
        console.log(`🔥 [${failureId}] Session not found, returning early`);
        return;
      }

      // 🔍 DEBUG P0: Log complet de l'état de la session
      console.log(`🔥 [${failureId}] === COMPLETE SESSION STATE ===`);
      console.log(`🔥 [${failureId}]   session.status: ${callSession.status}`);
      console.log(`🔥 [${failureId}]   payment.status: ${callSession.payment?.status || 'N/A'}`);
      console.log(`🔥 [${failureId}]   payment.intentId: ${callSession.payment?.intentId || 'N/A'}`);
      console.log(`🔥 [${failureId}]   client.status: ${callSession.participants.client.status}`);
      console.log(`🔥 [${failureId}]   client.attemptCount: ${callSession.participants.client.attemptCount || 0}`);
      console.log(`🔥 [${failureId}]   client.connectedAt: ${callSession.participants.client.connectedAt?.toDate?.() || 'N/A'}`);
      console.log(`🔥 [${failureId}]   client.disconnectedAt: ${callSession.participants.client.disconnectedAt?.toDate?.() || 'N/A'}`);
      console.log(`🔥 [${failureId}]   provider.status: ${callSession.participants.provider.status}`);
      console.log(`🔥 [${failureId}]   provider.attemptCount: ${callSession.participants.provider.attemptCount || 0}`);
      console.log(`🔥 [${failureId}]   provider.connectedAt: ${callSession.participants.provider.connectedAt?.toDate?.() || 'N/A'}`);
      console.log(`🔥 [${failureId}]   provider.disconnectedAt: ${callSession.participants.provider.disconnectedAt?.toDate?.() || 'N/A'}`);
      console.log(`🔥 [${failureId}]   conference.duration: ${callSession.conference?.duration || 'N/A'}`);
      console.log(`🔥 [${failureId}]   conference.startedAt: ${callSession.conference?.startedAt?.toDate?.() || 'N/A'}`);
      console.log(`🔥 [${failureId}]   conference.endedAt: ${callSession.conference?.endedAt?.toDate?.() || 'N/A'}`);
      console.log(`🔥 [${failureId}] === END SESSION STATE ===`);

      console.log(`🔥 [${failureId}] Setting session.status = "failed"...`);
      await this.updateCallSessionStatus(sessionId, "failed");
      console.log(`🔥 [${failureId}] ✅ Session marked as failed`);

      // 🛠️ FIX: Always fallback to 'en' if missing
      const clientLanguage = callSession.metadata?.clientLanguages?.[0] || "en";

      // 🆕 NEW: If provider doesn't answer and client is already connected, redirect their call to play voice message
      if (reason === "provider_no_answer" &&
          callSession.participants.client.status === "connected" &&
          callSession.participants.client.callSid) {
        try {
          // P0 FIX: Use Cloud Run URL instead of cloudfunctions.net
          const { getProviderNoAnswerTwiMLUrl } = await import("./utils/urlBase");
          const baseUrl = getProviderNoAnswerTwiMLUrl();
          const redirectUrl = `${baseUrl}?sessionId=${sessionId}&lang=${clientLanguage}`;
          
          const twilioClient = getTwilioClient();
          await twilioClient.calls(callSession.participants.client.callSid).update({
            url: redirectUrl,
            method: "GET"
          });
          
          console.log(`📞 Redirected client call ${callSession.participants.client.callSid} to provider no-answer message`);
          
          await logCallRecord({
            callId: sessionId,
            status: "client_call_redirected_to_no_answer_message",
            retryCount: 0,
            additionalData: {
              clientCallSid: callSession.participants.client.callSid,
              redirectUrl
            }
          });
        } catch (redirectError) {
          console.error(`❌ Failed to redirect client call:`, redirectError);
          await logError(
            "TwilioCallManager:handleCallFailure:redirect",
            redirectError as unknown
          );
          // Continue with normal flow even if redirect fails
        }

        // P0 FIX: Set provider OFFLINE when they don't answer (moved from webhook to avoid race condition)
        // The webhook timing may cause the check to happen BEFORE session.status is set to "failed"
        // By doing it here, we guarantee the provider is set offline regardless of webhook timing
        // P2-2 FIX: Use transaction instead of batch to prevent race condition with webhook
        try {
          const providerId = callSession.metadata?.providerId;
          if (providerId) {
            console.log(`📴 [handleCallFailure] Attempting to set provider ${providerId} OFFLINE (provider_no_answer)`);

            // Use transaction for atomic read-then-write to prevent race condition
            const sessionRef = this.db.collection('call_sessions').doc(sessionId);
            const wasSetOffline = await this.db.runTransaction(async (transaction) => {
              const sessionDoc = await transaction.get(sessionRef);
              const sessionData = sessionDoc.data();

              // Check if already processed (atomic read within transaction)
              if (sessionData?.metadata?.providerSetOffline) {
                console.log(`📴 [handleCallFailure] Provider already set offline by another process, skipping`);
                return false;
              }

              // ✅ BUG FIX: Nettoyer TOUS les champs busy-related en plus de mettre offline
              // Sans ce nettoyage, les champs restent orphelins et peuvent causer des problèmes
              // quand le prestataire se remet en ligne
              const offlineUpdateData = {
                isOnline: false,
                availability: 'offline',
                // Nettoyer les champs busy-related
                currentCallSessionId: admin.firestore.FieldValue.delete(),
                busySince: admin.firestore.FieldValue.delete(),
                busyReason: admin.firestore.FieldValue.delete(),
                busyBySibling: admin.firestore.FieldValue.delete(),
                busySiblingProviderId: admin.firestore.FieldValue.delete(),
                busySiblingCallSessionId: admin.firestore.FieldValue.delete(),
                wasOfflineBeforeCall: admin.firestore.FieldValue.delete(),
                lastStatusChange: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              };

              // Update sos_profiles
              transaction.update(this.db.collection('sos_profiles').doc(providerId), offlineUpdateData);

              // Update users collection
              transaction.update(this.db.collection('users').doc(providerId), offlineUpdateData);

              // Mark as processed (idempotency) - within same transaction
              transaction.update(sessionRef, {
                'metadata.providerSetOffline': true,
                'metadata.providerSetOfflineReason': 'provider_no_answer_handleCallFailure',
                'metadata.providerSetOfflineAt': admin.firestore.FieldValue.serverTimestamp(),
                'metadata.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
              });

              return true;
            });

            if (wasSetOffline) {
              console.log(`📴 [handleCallFailure] Provider ${providerId} is now OFFLINE`);
            }

            // Create notification for provider
            const providerLanguage = callSession.metadata?.providerLanguages?.[0] || "en";
            const offlineNotification = {
              eventId: 'provider.set.offline.no_answer',
              locale: providerLanguage,
              to: {
                uid: providerId,
              },
              context: {
                sessionId,
                reason: 'provider_no_answer',
              },
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              status: 'pending',
            };
            await this.db.collection('message_events').add(offlineNotification);
            console.log(`📴 [handleCallFailure] Notification sent to provider about being set offline`);
          }
        } catch (offlineError) {
          console.error(`⚠️ Failed to set provider offline (non-blocking):`, offlineError);
          await logError('TwilioCallManager:handleCallFailure:setProviderOffline', offlineError as unknown);
        }
      }

      // 🆕 NEW: Notify provider when CLIENT doesn't answer (after 3 attempts)
      if (reason === "client_no_answer") {
        try {
          const providerLanguage = callSession.metadata?.providerLanguages?.[0] || "en";
          // clientName n'existe pas sur metadata - utiliser un placeholder ou récupérer de users
          const clientName = "Client";

          // Create message_event to notify provider via SMS
          const providerNotificationData = {
            eventId: 'call.cancelled.client_no_answer',
            locale: providerLanguage,
            to: {
              uid: callSession.metadata?.providerId || null,
              // Fix: utiliser 'phone' pas 'phoneNumber'
              phone: callSession.participants?.provider?.phone
                ? decryptPhoneNumber(callSession.participants.provider.phone)
                : null,
            },
            context: {
              clientName,
              sessionId,
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'pending',
          };

          const notifRef = await this.db.collection('message_events').add(providerNotificationData);
          console.log(`📨 [handleCallFailure] Provider notification created for client_no_answer: ${notifRef.id}`);
          console.log(`📨   → Provider will receive SMS: "Client ${clientName} did not answer"`);
        } catch (notifError) {
          console.error(`⚠️ Failed to send provider notification (non-blocking):`, notifError);
          await logError('TwilioCallManager:handleCallFailure:providerNotification', notifError as unknown);
        }

        // P0 FIX: Remettre le provider AVAILABLE immédiatement (pas sa faute si client ne répond pas)
        try {
          const providerId = callSession.metadata?.providerId;
          if (providerId) {
            console.log(`🟢 [handleCallFailure] Setting provider ${providerId} back to AVAILABLE (client_no_answer)`);
            const availableResult = await setProviderAvailable(providerId, 'client_no_answer');
            if (availableResult.success) {
              console.log(`✅ [handleCallFailure] Provider ${providerId} is now AVAILABLE`);
            } else {
              console.warn(`⚠️ [handleCallFailure] Failed to set provider available: ${availableResult.error}`);
            }
          }
        } catch (availableError) {
          console.error(`⚠️ [handleCallFailure] Error setting provider available:`, availableError);
          await logError('TwilioCallManager:handleCallFailure:setProviderAvailable', availableError as unknown);
        }
      }

      await this.processRefund(sessionId, `failed_${reason}`);

      // Create invoices even for failed/refunded calls (marked as refunded)
      const updatedSession = await this.getCallSession(sessionId);
      if (updatedSession && !updatedSession.metadata?.invoicesCreated) {
        console.log(`📄 Creating refunded invoices for failed call session: ${sessionId}`);
        await this.createInvoices(sessionId, updatedSession);
        await this.db.collection("call_sessions").doc(sessionId).update({
          "metadata.invoicesCreated": true,
          "metadata.updatedAt": admin.firestore.Timestamp.now(),
        });
      }

      // ===== COOLDOWN: Schedule provider to become available in 5 minutes =====
      // P0 FIX: Skip cooldown pour client_no_answer (provider déjà remis available ci-dessus)
      if (reason !== "client_no_answer") {
        try {
          const taskId = await scheduleProviderAvailableTask(
            callSession.metadata.providerId,
            `call_failed_${reason}`
          );
          console.log(`🕐 Provider ${callSession.metadata.providerId} will be AVAILABLE in 5 min (task: ${taskId})`);
        } catch (availableError) {
          console.error(`⚠️ Failed to schedule provider available task after failure (non-blocking):`, availableError);
          await logError('TwilioCallManager:handleCallFailure:scheduleAvailable', availableError as unknown);
        }
      } else {
        console.log(`🟢 [handleCallFailure] Skipping 5-min cooldown for client_no_answer (provider already available)`);
      }

      await logCallRecord({
        callId: sessionId,
        status: `call_failed_${reason}`,
        retryCount: 0,
        additionalData: {
          reason,
          paymentIntentId: callSession.payment.intentId,
        },
      });

      // === FAILURE FINAL SUMMARY ===
      const finalFailureSession = await this.getCallSession(sessionId);
      console.log(`\n${'🔥'.repeat(35)}`);
      console.log(`🔥 [${failureId}] === CALL FAILURE SUMMARY ===`);
      console.log(`🔥 [${failureId}]   sessionId: ${sessionId}`);
      console.log(`🔥 [${failureId}]   reason: ${reason}`);
      if (finalFailureSession) {
        console.log(`🔥 [${failureId}]   FINAL STATE:`);
        console.log(`🔥 [${failureId}]     session.status: ${finalFailureSession.status}`);
        console.log(`🔥 [${failureId}]     payment.status: ${finalFailureSession.payment?.status}`);
        console.log(`🔥 [${failureId}]     client.status: ${finalFailureSession.participants.client.status}`);
        console.log(`🔥 [${failureId}]     provider.status: ${finalFailureSession.participants.provider.status}`);
      }
      console.log(`🔥 [${failureId}] === CALL FAILURE HANDLING COMPLETE ===`);
      console.log(`${'🔥'.repeat(35)}\n`);

    } catch (error) {
      console.error(`🔥 [${failureId}] ❌ ERROR in handleCallFailure:`, error);
      await logError("TwilioCallManager:handleCallFailure", error as unknown);
    }
  }

  private async processRefund(
    sessionId: string,
    reason: string
  ): Promise<void> {
    // 🔍 DEBUG P0: Log détaillé avec stack trace pour identifier l'origine du refund
    const refundDebugId = `refund_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const stackTrace = new Error().stack?.split('\n').slice(1, 10).join('\n') || 'No stack';

    console.log(`\n${'💸'.repeat(40)}`);
    console.log(`💸 [${refundDebugId}] ========== PROCESS REFUND CALLED ==========`);
    console.log(`💸 [${refundDebugId}] SessionId: ${sessionId}`);
    console.log(`💸 [${refundDebugId}] Reason: ${reason}`);
    console.log(`💸 [${refundDebugId}] Timestamp: ${new Date().toISOString()}`);
    console.log(`💸 [${refundDebugId}] STACK TRACE (qui a appelé processRefund?):`);
    console.log(stackTrace);
    console.log(`${'💸'.repeat(40)}\n`);

    try {
      const callSession = await this.getCallSession(sessionId);

      // 🔍 DEBUG: Log complet de l'état de la session
      console.log(`💸 [${refundDebugId}] SESSION STATE:`);
      console.log(`💸 [${refundDebugId}]   session.status: ${callSession?.status || 'N/A'}`);
      console.log(`💸 [${refundDebugId}]   payment.status: ${callSession?.payment?.status || 'N/A'}`);
      console.log(`💸 [${refundDebugId}]   payment.intentId: ${callSession?.payment?.intentId || 'N/A'}`);
      console.log(`💸 [${refundDebugId}]   client.status: ${callSession?.participants?.client?.status || 'N/A'}`);
      console.log(`💸 [${refundDebugId}]   client.connectedAt: ${callSession?.participants?.client?.connectedAt?.toDate?.() || 'N/A'}`);
      console.log(`💸 [${refundDebugId}]   client.disconnectedAt: ${callSession?.participants?.client?.disconnectedAt?.toDate?.() || 'N/A'}`);
      console.log(`💸 [${refundDebugId}]   provider.status: ${callSession?.participants?.provider?.status || 'N/A'}`);
      console.log(`💸 [${refundDebugId}]   provider.connectedAt: ${callSession?.participants?.provider?.connectedAt?.toDate?.() || 'N/A'}`);
      console.log(`💸 [${refundDebugId}]   provider.disconnectedAt: ${callSession?.participants?.provider?.disconnectedAt?.toDate?.() || 'N/A'}`);
      console.log(`💸 [${refundDebugId}]   conference.duration: ${callSession?.conference?.duration || 'N/A'}`);
      console.log(`💸 [${refundDebugId}]   conference.startedAt: ${callSession?.conference?.startedAt?.toDate?.() || 'N/A'}`);
      console.log(`💸 [${refundDebugId}]   conference.endedAt: ${callSession?.conference?.endedAt?.toDate?.() || 'N/A'}`);

      if (!callSession?.payment.intentId && !callSession?.payment.paypalOrderId) {
        console.log(`💸 [${refundDebugId}] ⚠️ No payment intent/order found - skipping`);
        return;
      }

      // CRITIQUE: Distinction entre cancel (non capturé) et refund (capturé)
      // - Si payment.status === "authorized" → PaymentIntent en état requires_capture → CANCEL
      // - Si payment.status === "captured" → PaymentIntent capturé → REFUND
      const paymentStatus = callSession.payment.status;
      let result: { success: boolean; error?: string };

      console.log(`💸 [${refundDebugId}] Payment status: ${paymentStatus}`);
      console.log(`💸 [${refundDebugId}] Action: ${paymentStatus === 'authorized' ? 'CANCEL (non capturé)' : 'REFUND (capturé)'}`);

      // Détection gateway: PayPal ou Stripe
      const isPayPal = callSession.payment.gateway === "paypal" || !!callSession.payment.paypalOrderId;

      if (isPayPal) {
        // ===== PAYPAL REFUND/CANCEL =====
        console.log(`💳 [PAYPAL] Traitement remboursement/annulation ${sessionId} - raison: ${reason}`);

        if (paymentStatus === "authorized" || paymentStatus === "pending") {
          // P0 FIX: PayPal ordre non capturé → VOID l'autorisation pour libérer les fonds client
          const paypalOrderId = callSession.payment.paypalOrderId;
          if (!paypalOrderId) {
            console.warn(`⚠️ [PAYPAL] No paypalOrderId found for session ${sessionId} - cannot void`);
            result = { success: true };
          } else {
            console.log(`💳 [PAYPAL] Ordre non capturé - void de l'autorisation`);
            const { PayPalManager } = await import("./PayPalManager");
            const paypalManager = new PayPalManager();

            try {
              const voidResult = await paypalManager.voidAuthorization(
                paypalOrderId,
                `Appel échoué: ${reason}`
              );
              result = { success: voidResult.success, error: voidResult.success ? undefined : voidResult.message };
              console.log(`✅ [PAYPAL] Void result:`, voidResult);
            } catch (voidError) {
              console.error(`❌ [PAYPAL] Void error:`, voidError);
              // Ne pas bloquer - l'ordre expirera automatiquement
              result = { success: true, error: "Void failed but order will expire automatically" };
            }
          }
        } else if (paymentStatus === "captured" && callSession.payment.paypalCaptureId) {
          // PayPal: paiement capturé → rembourser via captureId
          const { PayPalManager } = await import("./PayPalManager");
          const paypalManager = new PayPalManager();

          try {
            const refundResult = await paypalManager.refundPayment(
              callSession.payment.paypalCaptureId,
              callSession.payment.amount,
              "EUR",
              `Appel échoué: ${reason}`
            );
            result = { success: refundResult.success, error: refundResult.success ? undefined : refundResult.status };
            console.log(`✅ [PAYPAL] Refund result:`, refundResult);
          } catch (paypalError) {
            console.error(`❌ [PAYPAL] Refund error:`, paypalError);
            result = { success: false, error: paypalError instanceof Error ? paypalError.message : "PayPal refund failed" };
          }
        } else {
          console.log(`⚠️ [PAYPAL] Paiement ${sessionId} déjà traité ou statut inconnu: ${paymentStatus}`);
          return;
        }
      } else {
        // ===== STRIPE REFUND/CANCEL =====
        if (paymentStatus === "authorized") {
          // Paiement NON capturé → Annuler (pas rembourser)
          console.log(`💳 [STRIPE] Annulation paiement non-capturé ${sessionId} - raison: ${reason}`);
          result = await stripeManager.cancelPayment(
            callSession.payment.intentId,
            "requested_by_customer",
            sessionId
          );
        } else if (paymentStatus === "captured") {
          // Paiement CAPTURÉ → Rembourser
          console.log(`💳 [STRIPE] Remboursement paiement capturé ${sessionId} - raison: ${reason}`);
          result = await stripeManager.refundPayment(
            callSession.payment.intentId,
            `Appel échoué: ${reason}`,
            sessionId
          );
        } else {
          // Statut inconnu ou déjà traité
          console.log(`⚠️ [STRIPE] Paiement ${sessionId} déjà traité ou statut inconnu: ${paymentStatus}`);
          return;
        }
      }

      if (result.success) {
        const newStatus = paymentStatus === "authorized" ? "cancelled" : "refunded";
        // P1-13 FIX: Sync atomique payments <-> call_sessions
        const paymentId = callSession.paymentId || callSession.payment.intentId || callSession.payment.paypalOrderId;
        if (paymentId) {
          await syncPaymentStatus(this.db, paymentId, sessionId, {
            status: newStatus,
            refundedAt: admin.firestore.FieldValue.serverTimestamp(),
            refundReason: reason,
          });
        }
        // Mise à jour metadata séparément (pas dans payments collection)
        await this.db.collection("call_sessions").doc(sessionId).update({
          "metadata.updatedAt": admin.firestore.Timestamp.now(),
        });
        console.log(`✅ Paiement ${sessionId} traité avec succès: ${newStatus}`);
      } else {
        console.error(`❌ Échec traitement paiement ${sessionId}:`, result.error);
      }
    } catch (error) {
      await logError("TwilioCallManager:processRefund", error as unknown);
    }
  }

  async handleCallCompletion(
    sessionId: string,
    duration: number
  ): Promise<void> {
    const completionId = `completion_${Date.now().toString(36)}`;

    try {
      console.log(`\n${'✅'.repeat(35)}`);
      console.log(`✅ [${completionId}] handleCallCompletion CALLED`);
      console.log(`✅ [${completionId}]   sessionId: ${sessionId}`);
      console.log(`✅ [${completionId}]   billingDuration: ${duration}s (${Math.floor(duration / 60)}m${duration % 60}s)`);
      console.log(`✅ [${completionId}]   MIN_CALL_DURATION: ${CALL_CONFIG.MIN_CALL_DURATION}s`);
      console.log(`✅ [${completionId}]   willCapture: ${duration >= CALL_CONFIG.MIN_CALL_DURATION ? 'YES' : 'NO - will refund'}`);
      console.log(`${'✅'.repeat(35)}`);

      const callSession = await this.getCallSession(sessionId);
      if (!callSession) {
        console.log(`✅ [${completionId}] ❌ Session not found - returning early`);
        return;
      }

      console.log(`✅ [${completionId}] Session state BEFORE completion:`);
      console.log(`✅ [${completionId}]   session.status: ${callSession.status}`);
      console.log(`✅ [${completionId}]   payment.status: ${callSession.payment?.status}`);
      console.log(`✅ [${completionId}]   payment.intentId: ${callSession.payment?.intentId?.slice(0, 20) || 'N/A'}...`);
      console.log(`✅ [${completionId}]   client.status: ${callSession.participants.client.status}`);
      console.log(`✅ [${completionId}]   provider.status: ${callSession.participants.provider.status}`);

      console.log(`✅ [${completionId}] Setting session.status = "completed"...`);
      await this.updateCallSessionStatus(sessionId, "completed");
      console.log(`✅ [${completionId}] ✅ Session marked as completed`);

      // SMS/WhatsApp notifications removed - call completion logged
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;
      console.log(`[TwilioCallManager] Call completed notification skipped (SMS/WhatsApp disabled), duration: ${minutes}m${seconds}s`);

      console.log(`📄 Should capture payment: ${this.shouldCapturePayment(callSession, duration)}`);

      if (this.shouldCapturePayment(callSession, duration)) {
        console.log(`📄 Capturing payment for session: ${sessionId}`);
        await this.capturePaymentForSession(sessionId);
      } else {
        // Call duration < 120 seconds or payment not authorized - refund the payment
        console.log(`📄 Call duration too short or payment not authorized - processing refund for session: ${sessionId}`);
        const refundReason = duration < CALL_CONFIG.MIN_CALL_DURATION 
          ? `Call duration too short: ${duration}s < ${CALL_CONFIG.MIN_CALL_DURATION}s`
          : 'Payment not authorized';
        await this.processRefund(sessionId, refundReason);
        
        // Create invoices even for refunded calls (marked as refunded)
        const updatedSession = await this.getCallSession(sessionId);
        if (updatedSession && !updatedSession.metadata?.invoicesCreated) {
          console.log(`📄 Creating refunded invoices for session: ${sessionId}`);
          await this.createInvoices(sessionId, updatedSession);
          await this.db.collection("call_sessions").doc(sessionId).update({
            "metadata.invoicesCreated": true,
            "metadata.updatedAt": admin.firestore.Timestamp.now(),
          });
        }
      }
      
      console.log(`📄 Just logging the record : ${sessionId}`);

      // ===== COOLDOWN: Schedule provider to become available in 5 minutes =====
      try {
        const taskId = await scheduleProviderAvailableTask(
          callSession.metadata.providerId,
          'call_completed'
        );
        console.log(`🕐 Provider ${callSession.metadata.providerId} will be AVAILABLE in 5 min (task: ${taskId})`);
      } catch (availableError) {
        console.error(`⚠️ Failed to schedule provider available task (non-blocking):`, availableError);
        await logError('TwilioCallManager:handleCallCompletion:scheduleAvailable', availableError as unknown);
      }

      await logCallRecord({
        callId: sessionId,
        status: "call_completed_success",
        retryCount: 0,
        additionalData: { duration },
      });

      // ===== FETCH AND STORE REAL TWILIO COSTS =====
      // Delay slightly to ensure Twilio has updated the call record with pricing
      setTimeout(async () => {
        try {
          await this.fetchAndStoreRealCosts(sessionId);
        } catch (costError) {
          console.error(`[handleCallCompletion] Failed to fetch costs (non-blocking):`, costError);
        }
      }, 5000); // 5 second delay to allow Twilio to calculate costs

      // === FINAL STATE SUMMARY ===
      const finalSession = await this.getCallSession(sessionId);
      console.log(`\n${'✅'.repeat(35)}`);
      console.log(`✅ [${completionId}] === CALL COMPLETION SUMMARY ===`);
      console.log(`✅ [${completionId}]   sessionId: ${sessionId}`);
      console.log(`✅ [${completionId}]   billingDuration: ${duration}s`);
      if (finalSession) {
        console.log(`✅ [${completionId}]   FINAL STATE:`);
        console.log(`✅ [${completionId}]     session.status: ${finalSession.status}`);
        console.log(`✅ [${completionId}]     payment.status: ${finalSession.payment?.status}`);
        console.log(`✅ [${completionId}]     client.status: ${finalSession.participants.client.status}`);
        console.log(`✅ [${completionId}]     provider.status: ${finalSession.participants.provider.status}`);
        console.log(`✅ [${completionId}]     invoicesCreated: ${finalSession.metadata?.invoicesCreated || false}`);
      }
      console.log(`✅ [${completionId}] === CALL IS NOW FULLY TERMINATED ===`);
      console.log(`${'✅'.repeat(35)}\n`);

    } catch (error) {
      console.error(`✅ [${completionId}] ❌ ERROR in handleCallCompletion:`, error);
      await logError(
        "TwilioCallManager:handleCallCompletion",
        error as unknown
      );
    }
  }

  // shouldCapturePayment(session: CallSessionState, duration?: number): boolean {
  //   console.log("session in shouldCapturePayment :", session);
  //   console.log("session in shouldCapturePayment :", JSON.stringify(session, null, 2));
  //   const { provider, client } = session.participants;
  //   console.log("Provider status in shouldCapturePayment :", provider);
  //   console.log("Client status in shouldCapturePayment :", client);
  //   // const { startedAt, duration: sessionDuration } = session.conference;
  //   const {  duration: sessionDuration } = session.conference;

    
  //   console.log(`📄 Session duration: ${sessionDuration}`);
  //   console.log(`📄 Duration: ${duration}`);

  //   const actualDuration = duration || sessionDuration || 0;


 

  //   // if (provider.status !== "connected" || client.status !== "connected")
  //   //   return false;
  //   // if (!startedAt) return false;

    
  //   console.log(`📄 Minimum call duration: ${CALL_CONFIG.MIN_CALL_DURATION}`);
  //   console.log(`📄 Actual duration: ${actualDuration}`);
  //   console.log(`📄 Comparison: ${actualDuration} < ${CALL_CONFIG.MIN_CALL_DURATION} = ${actualDuration < CALL_CONFIG.MIN_CALL_DURATION}`);
    
  //   if (actualDuration < CALL_CONFIG.MIN_CALL_DURATION) {
  //     console.log(`📄 ❌ Duration check failed: ${actualDuration}s < ${CALL_CONFIG.MIN_CALL_DURATION}s - returning false`);
  //     return false;
  //   }

  //   // console.log(`📄 ✅ Duration check passed: ${actualDuration}s >= ${CALL_CONFIG.MIN_CALL_DURATION}s`);
    
  //   if (session.payment.status !== "authorized") {
  //     console.log(`📄 ❌ Payment status check failed: ${session.payment.status} !== "authorized" - returning false`);
  //     return false;
  //   }
  //   console.log(`📄 ✅ Payment status check passed: ${session.payment.status} === "authorized"`);
  //   console.log(`📄 ✅ All checks passed - returning true`);
  //   return true;
  // }




  shouldCapturePayment(session: CallSessionState, duration?: number): boolean {
    console.log("session in shouldCapturePayment :", session);
    console.log("session in shouldCapturePayment :", JSON.stringify(session, null, 2));
    const { provider, client } = session.participants;
    console.log("Provider status in shouldCapturePayment :", provider);
    console.log("Client status in shouldCapturePayment :", client);
    
    const { duration: sessionDuration } = session.conference;
  
    console.log(`📄 Session duration: ${sessionDuration}`);
    console.log(`📄 Duration parameter: ${duration}`);
  
    // Calculate actual duration with multiple fallbacks
    let actualDuration = duration || sessionDuration || 0;
    
    // 🆕 FALLBACK 1: Calculate from conference timestamps
    if (actualDuration === 0 && session.conference.startedAt && session.conference.endedAt) {
      const startTime = session.conference.startedAt.toDate().getTime();
      const endTime = session.conference.endedAt.toDate().getTime();
      actualDuration = Math.floor((endTime - startTime) / 1000);
      console.log(`📄 Duration calculated from conference timestamps: ${actualDuration}s`);
    }
    
    // 🆕 FALLBACK 2: Calculate from participant timestamps (MOST RELIABLE)
    if (actualDuration === 0) {
      // Use the earlier connected timestamp
      const clientConnected = client.connectedAt?.toDate().getTime();
      const providerConnected = provider.connectedAt?.toDate().getTime();
      const startTime = Math.min(
        clientConnected || Infinity, 
        providerConnected || Infinity
      );
      
      // Use the later disconnected timestamp
      const clientDisconnected = client.disconnectedAt?.toDate().getTime();
      const providerDisconnected = provider.disconnectedAt?.toDate().getTime();
      const endTime = Math.max(
        clientDisconnected || 0, 
        providerDisconnected || 0
      );
      
      if (startTime !== Infinity && endTime > 0) {
        actualDuration = Math.floor((endTime - startTime) / 1000);
        console.log(`📄 Duration calculated from participant timestamps: ${actualDuration}s`);
        console.log(`📄   Client: connected=${clientConnected}, disconnected=${clientDisconnected}`);
        console.log(`📄   Provider: connected=${providerConnected}, disconnected=${providerDisconnected}`);
      }
    }
  
    console.log(`📄 Actual duration (final): ${actualDuration}`);
    console.log(`📄 Minimum call duration: ${CALL_CONFIG.MIN_CALL_DURATION}`);
    console.log(`📄 Comparison: ${actualDuration} < ${CALL_CONFIG.MIN_CALL_DURATION} = ${actualDuration < CALL_CONFIG.MIN_CALL_DURATION}`);
    
    if (actualDuration < CALL_CONFIG.MIN_CALL_DURATION) {
      console.log(`📄 ❌ Duration check failed: ${actualDuration}s < ${CALL_CONFIG.MIN_CALL_DURATION}s - returning false`);
      return false;
    }
    
    // P0 FIX: Accept both "authorized" and "requires_action" (3D Secure)
    // When 3D Secure is used, the webhook payment_intent.amount_capturable_updated
    // should have set status to "authorized". But if the webhook is delayed,
    // we also accept "requires_action" and let Stripe reject if not ready.
    const validPaymentStatuses = ["authorized", "requires_action"];

    if (!validPaymentStatuses.includes(session.payment.status)) {
      console.log(`📄 ❌ Payment status check failed: ${session.payment.status} not in ${validPaymentStatuses.join(", ")} - returning false`);
      return false;
    }

    if (session.payment.status === "requires_action") {
      console.log(`📄 ⚠️ Payment status is "requires_action" (3D Secure) - attempting capture anyway`);
      console.log(`📄    If 3D Secure wasn't completed, Stripe will reject the capture`);
    } else {
      console.log(`📄 ✅ Payment status check passed: ${session.payment.status} === "authorized"`);
    }

    console.log(`📄 ✅ All checks passed - returning true`);
    return true;
  }

  async capturePaymentForSession(sessionId: string): Promise<boolean> {
    const captureId = `capture_${Date.now().toString(36)}`;

    try {
      prodLogger.info('TWILIO_CAPTURE_START', `[${captureId}] Starting payment capture for call session`, {
        captureId,
        sessionId,
      });

      console.log(`📄 Capturing payment for session: ${sessionId}`);

      // P2-4 FIX: Atomic lock to prevent race conditions on concurrent capture attempts
      const sessionRef = this.db.collection("call_sessions").doc(sessionId);
      let lockAcquired = false;

      try {
        await this.db.runTransaction(async (transaction) => {
          const sessionDoc = await transaction.get(sessionRef);
          if (!sessionDoc.exists) {
            throw new Error("Session not found");
          }
          const data = sessionDoc.data();

          // Already captured
          if (data?.payment?.status === "captured") {
            console.log(`📄 Payment already captured for session: ${sessionId}`);
            return; // Exit transaction without changes
          }

          // Check if another process is capturing (using captureLock field)
          const captureLock = data?.captureLock as admin.firestore.Timestamp | undefined;
          if (captureLock) {
            const lockTime = captureLock.toDate();
            const lockAge = Date.now() - lockTime.getTime();
            // P2-11 FIX: Lock expires after 30 minutes (was 10 min - too short for long calls)
            // Calls can exceed 10 minutes, causing duplicate task execution
            if (lockAge < 30 * 60 * 1000) {
              console.log(`📄 Capture already in progress for session: ${sessionId} (lock age: ${lockAge}ms)`);
              return;
            }
          }

          // Set atomic lock
          transaction.update(sessionRef, {
            captureLock: admin.firestore.FieldValue.serverTimestamp(),
          });
          lockAcquired = true;
        });
      } catch (lockError) {
        console.error(`❌ Failed to acquire capture lock: ${lockError}`);
        return false;
      }

      if (!lockAcquired) {
        console.log(`📄 Could not acquire lock or already captured for session: ${sessionId}`);
        return true; // Either already captured or in progress - not a failure
      }

      // Re-fetch session after acquiring lock
      const session = await this.getCallSession(sessionId);
      if (!session) return false;

      console.log(`📄 Session payment status: ${session.payment.status}`);

      // Already captured (double-check after lock) - ensure invoices exist once
      if (session.payment.status === "captured") {
        console.log(`📄 Payment already captured for session: ${sessionId}`);
        if (!session.metadata?.invoicesCreated) {
          console.log(`📄 Creating invoices for already-captured session: ${sessionId}`);
          await this.createInvoices(sessionId, session);
          await this.db.collection("call_sessions").doc(sessionId).update({
            "metadata.invoicesCreated": true,
            "metadata.updatedAt": admin.firestore.Timestamp.now(),
          });
        }
        return true;
      }

      console.log(`📄 Should capture payment: ${this.shouldCapturePayment(session)}`);

      // Get provider amount from admin pricing config
      const { getPricingConfig } = await import("./services/pricingService");
      const pricingConfig = await getPricingConfig();

      const serviceType = session.metadata.providerType; // 'lawyer' or 'expat'
      const currency = 'eur'; // Default to EUR

      const providerAmount = pricingConfig[serviceType][currency].providerAmount;
      const platformFee = pricingConfig[serviceType][currency].connectionFeeAmount;
      const providerAmountCents = Math.round(providerAmount * 100);

      console.log(`💸 Pricing config - Platform: ${platformFee} EUR, Provider: ${providerAmount} EUR (${providerAmountCents} cents)`);

      // ===== P0 FIX: VALIDATE GATEWAY MATCHES PROVIDER COUNTRY =====
      // If there's a mismatch between the session gateway and what the provider's country requires,
      // we need to use the correct gateway to prevent stuck payments
      const { getRecommendedPaymentGateway } = await import("./lib/paymentCountries");

      // Get provider's country from session metadata or provider document
      let providerCountry = session.metadata?.providerCountry;
      if (!providerCountry && session.metadata?.providerId) {
        try {
          const providerDoc = await this.db.collection("providers").doc(session.metadata.providerId).get();
          providerCountry = providerDoc.data()?.country || providerDoc.data()?.countryCode;
        } catch (providerError) {
          console.warn(`[${captureId}] Could not fetch provider country:`, providerError);
        }
      }

      const sessionGateway = session.payment.gateway || (session.payment.paypalOrderId ? "paypal" : "stripe");
      const requiredGateway = providerCountry ? getRecommendedPaymentGateway(providerCountry) : sessionGateway;

      if (providerCountry && sessionGateway !== requiredGateway) {
        console.warn(`⚠️ [${captureId}] GATEWAY MISMATCH DETECTED!`);
        console.warn(`⚠️ [${captureId}]   Session gateway: ${sessionGateway}`);
        console.warn(`⚠️ [${captureId}]   Required for country ${providerCountry}: ${requiredGateway}`);
        console.warn(`⚠️ [${captureId}]   Using required gateway: ${requiredGateway}`);

        // Log this critical issue for monitoring
        await logError('GATEWAY_MISMATCH', {
          sessionId,
          captureId,
          sessionGateway,
          requiredGateway,
          providerCountry,
          providerId: session.metadata?.providerId,
        });
      }

      // ===== DETECTION GATEWAY: PayPal ou Stripe =====
      // P0 FIX: Use required gateway based on provider country, not just session.payment.gateway
      const isPayPal = requiredGateway === "paypal" || !!session.payment.paypalOrderId;

      let captureResult: { success: boolean; error?: string; transferId?: string; captureId?: string };

      if (isPayPal && session.payment.paypalOrderId) {
        // ===== PAYPAL CAPTURE =====
        console.log(`💳 [PAYPAL] Capturing PayPal order: ${session.payment.paypalOrderId}`);
        const { PayPalManager } = await import("./PayPalManager");
        const paypalManager = new PayPalManager();

        try {
          const paypalResult = await paypalManager.captureOrder(session.payment.paypalOrderId);
          captureResult = {
            success: paypalResult.success,
            captureId: paypalResult.captureId,
            error: paypalResult.success ? undefined : `PayPal capture failed: ${paypalResult.status}`,
          };
          console.log(`✅ [PAYPAL] Capture result:`, JSON.stringify(paypalResult, null, 2));
        } catch (paypalError) {
          console.error(`❌ [PAYPAL] Capture error:`, paypalError);
          captureResult = {
            success: false,
            error: paypalError instanceof Error ? paypalError.message : "PayPal capture failed",
          };
        }
      } else {
        // ===== STRIPE CAPTURE (DESTINATION CHARGES) =====
        // capturePayment retourne maintenant transferId si Destination Charges est configure
        console.log(`💳 [STRIPE] Capturing Stripe payment: ${session.payment.intentId}`);
        captureResult = await stripeManager.capturePayment(
          session.payment.intentId,
          sessionId
        );
      }

      console.log("📄 Capture result:", JSON.stringify(captureResult, null, 2));

      // P1-13 FIX: Obtenir le paymentId pour sync atomique
      const paymentId = session.paymentId || session.payment.intentId || session.payment.paypalOrderId;

      if (!captureResult.success) {
        console.error(`❌ Payment capture failed: ${captureResult.error}`);
        // P1-13 FIX: Sync atomique payments <-> call_sessions
        if (paymentId) {
          await syncPaymentStatus(this.db, paymentId, sessionId, {
            status: "failed",
            failureReason: captureResult.error || "Capture failed",
          });
        }
        await this.db.collection("call_sessions").doc(sessionId).update({
          "metadata.updatedAt": admin.firestore.Timestamp.now(),
        });

        await logCallRecord({
          callId: sessionId,
          status: "payment_capture_failed",
          retryCount: 0,
          additionalData: {
            error: captureResult.error,
            paymentIntentId: session.payment.intentId,
          },
        });
        return false;
      }

      // P1-13 FIX: Préparer les données de capture pour sync atomique
      const captureData: Record<string, unknown> = {
        status: "captured",
        capturedAt: admin.firestore.FieldValue.serverTimestamp(),
        serviceDelivered: true,
        refundBlocked: true,
      };

      // Si Destination Charges est utilise, le transfert est automatique
      if (captureResult.transferId) {
        console.log(`✅ Automatic transfer via Destination Charges: ${captureResult.transferId}`);
        captureData.transferId = captureResult.transferId;
        captureData.transferAmount = providerAmountCents;
        captureData.transferCreatedAt = admin.firestore.FieldValue.serverTimestamp();
        captureData.transferStatus = "automatic";

        // Recuperer le destinationAccountId depuis le payment record
        try {
          const paymentDoc = await this.db.collection('payments').doc(session.payment.intentId).get();
          if (paymentDoc.exists) {
            const paymentData = paymentDoc.data();
            if (paymentData?.destinationAccountId) {
              captureData.destinationAccountId = paymentData.destinationAccountId;
            }
          }
        } catch (err) {
          console.warn(`⚠️ Could not fetch destinationAccountId:`, err);
        }
      } else {
        // Pas de Destination Charges configure - le transfert devra etre fait manuellement
        console.log(`⚠️ No automatic transfer - Destination Charges not configured for this payment`);
        captureData.transferStatus = "pending";
      }

      // P1-13 FIX: Sync atomique payments <-> call_sessions
      if (paymentId) {
        await syncPaymentStatus(this.db, paymentId, sessionId, captureData);
      }
      // Mise à jour metadata séparément
      await this.db.collection("call_sessions").doc(sessionId).update({
        "metadata.updatedAt": admin.firestore.Timestamp.now(),
      });
      console.log(`📄 Updated call session with capture info: ${sessionId}`);

      // Create review request
      await this.createReviewRequest(session);

      // Create invoices
      await this.createInvoices(sessionId, session);
      await this.db.collection("call_sessions").doc(sessionId).update({
        "metadata.invoicesCreated": true,
      });
      console.log(`📄 Invoices created for session: ${sessionId}`);

      await logCallRecord({
        callId: sessionId,
        status: "payment_captured",
        retryCount: 0,
        additionalData: {
          amount: session.payment.amount,
          duration: session.conference.duration,
          transferId: captureResult.transferId || null,
          transferAmount: providerAmountCents,
          automaticTransfer: !!captureResult.transferId,
        },
      });

      // Log de succès
      prodLogger.info('TWILIO_CAPTURE_SUCCESS', `[${captureId}] Payment captured successfully`, {
        captureId,
        sessionId,
        amount: session.payment.amount,
        duration: session.conference.duration,
        transferId: captureResult.transferId || null,
        gateway: isPayPal ? 'paypal' : 'stripe',
      });

      return true;

    } catch (error) {
      prodLogger.error('TWILIO_CAPTURE_ERROR', `[${captureId}] Payment capture failed`, {
        captureId,
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
      await logError(
        "TwilioCallManager:capturePaymentForSession",
        error as unknown
      );
      return false;
    }
  }

  private async createInvoices(
    sessionId: string,
    session: CallSessionState
  ): Promise<void> {
    try {
      console.log(`📄 Creating invoices for session in createInvoices: ${sessionId}`);

      // Check if payment is refunded OR cancelled - if so, mark invoices as refunded
      // P0 FIX: "cancelled" status happens when authorization is cancelled (not captured)
      // Both "refunded" and "cancelled" mean the client got their money back
      const isRefundedOrCancelled = session.payment.status === "refunded" || session.payment.status === "cancelled";
      const invoiceStatus = isRefundedOrCancelled ? "refunded" : "issued";

      // Get payment currency from payments collection
      let paymentCurrency: 'eur' | 'usd' = 'eur'; // Default to EUR
      let clientEmail = '';
      let providerEmail = '';
      try {
        const paymentDoc = await this.db.collection('payments').doc(session.payment.intentId).get();
        if (paymentDoc.exists) {
          const paymentData = paymentDoc.data();
          if (paymentData?.currency) {
            paymentCurrency = paymentData.currency.toLowerCase() as 'eur' | 'usd';
            console.log(`📄 Found payment currency: ${paymentCurrency.toUpperCase()}`);
          }
          // Récupérer les emails depuis le paiement si disponibles
          clientEmail = paymentData?.clientEmail || '';
          providerEmail = paymentData?.providerEmail || '';
        }
      } catch (paymentError) {
        console.warn(`⚠️ Could not fetch payment currency, defaulting to EUR:`, paymentError);
      }

      // P0 FIX: Récupérer les noms du client et du prestataire depuis la collection users
      const { formatProviderDisplayName } = await import("./utils/types");

      let clientName = '';
      let providerDisplayName = '';

      try {
        // Récupérer les données du client
        const clientDoc = await this.db.collection('users').doc(session.metadata.clientId).get();
        if (clientDoc.exists) {
          const clientData = clientDoc.data();
          clientName = clientData?.displayName ||
                       `${clientData?.firstName || ''} ${clientData?.lastName || ''}`.trim() ||
                       clientData?.name || '';
          if (!clientEmail) {
            clientEmail = clientData?.email || '';
          }
        }
        console.log(`📄 Client name retrieved: ${clientName || '(not found)'}`);
      } catch (clientError) {
        console.warn(`⚠️ Could not fetch client data:`, clientError);
      }

      try {
        // Récupérer les données du prestataire et formater en "Prénom L."
        const providerDoc = await this.db.collection('users').doc(session.metadata.providerId).get();
        if (providerDoc.exists) {
          const providerData = providerDoc.data();
          const firstName = providerData?.firstName || '';
          const lastName = providerData?.lastName || '';
          providerDisplayName = formatProviderDisplayName(firstName, lastName);
          if (!providerEmail) {
            providerEmail = providerData?.email || '';
          }
        }
        console.log(`📄 Provider display name: ${providerDisplayName || '(not found)'}`);
      } catch (providerError) {
        console.warn(`⚠️ Could not fetch provider data:`, providerError);
      }

      // Import your invoice function - adjust path as needed
      const { generateInvoice } = await import("./utils/generateInvoice");

      // Get amounts from admin pricing config instead of hardcoded percentages
      const { getPricingConfig } = await import("./services/pricingService");
      const pricingConfig = await getPricingConfig();

      const serviceType = session.metadata.providerType; // 'lawyer' or 'expat'
      const currency = paymentCurrency; // Use actual payment currency

      const platformFee = pricingConfig[serviceType][currency].connectionFeeAmount;
      const providerAmount = pricingConfig[serviceType][currency].providerAmount;

      console.log(`📄 Creating invoices with admin pricing - Platform: ${platformFee} ${currency.toUpperCase()}, Provider: ${providerAmount} ${currency.toUpperCase()}`);
      console.log(`📄 Invoice status: ${invoiceStatus} (payment status: ${session.payment.status})`);

      // Create platform invoice
      const platformInvoice: InvoiceRecord = {
        invoiceNumber: `PLT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        type: "platform",
        callId: sessionId,
        clientId: session.metadata.clientId,
        providerId: session.metadata.providerId,
        amount: platformFee,
        currency: currency.toUpperCase(),
        downloadUrl: "",
        status: invoiceStatus,
        sentToAdmin: true,
        locale: session.metadata.selectedLanguage || "fr",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: new Date(),
        environment: process.env.NODE_ENV || "development",
        // P0 FIX: Ajout des noms pour les factures
        clientName: clientName || undefined,
        clientEmail: clientEmail || undefined,
        providerName: providerDisplayName || undefined,
        providerEmail: providerEmail || undefined,
      };

      // Add refund info if refunded or cancelled
      if (isRefundedOrCancelled) {
        platformInvoice.refundedAt = admin.firestore.FieldValue.serverTimestamp();
        platformInvoice.refundReason = session.payment.refundReason || "Payment refunded/cancelled";
      }

      // Create provider invoice
      const providerInvoice: InvoiceRecord = {
        invoiceNumber: `PRV-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        type: "provider",
        callId: sessionId,
        clientId: session.metadata.clientId,
        providerId: session.metadata.providerId,
        amount: providerAmount,
        currency: currency.toUpperCase(),
        downloadUrl: "",
        status: invoiceStatus,
        sentToAdmin: true,
        locale: session.metadata.selectedLanguage || "fr",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: new Date(),
        environment: process.env.NODE_ENV || "development",
        // P0 FIX: Ajout des noms pour les factures
        clientName: clientName || undefined,
        clientEmail: clientEmail || undefined,
        providerName: providerDisplayName || undefined,
        providerEmail: providerEmail || undefined,
      };

      // Add refund info if refunded or cancelled
      if (isRefundedOrCancelled) {
        providerInvoice.refundedAt = admin.firestore.FieldValue.serverTimestamp();
        providerInvoice.refundReason = session.payment.refundReason || "Payment refunded/cancelled";
      }

      // Generate both invoices
      await Promise.all([
        generateInvoice(platformInvoice),
        generateInvoice(providerInvoice),
      ]);

      console.log(`✅ Invoices created successfully for ${sessionId} with status: ${invoiceStatus}`);
    } catch (error) {
      console.error("❌ Error creating invoices:", error);
      await logError("TwilioCallManager:createInvoices", error as unknown);
    }
  }

  private async createReviewRequest(session: CallSessionState): Promise<void> {
    try {
      const reviewRequest = {
        clientId: session.metadata.clientId,
        providerId: session.metadata.providerId,
        callSessionId: session.id,
        callDuration: session.conference.duration || 0,
        serviceType: session.metadata.serviceType,
        providerType: session.metadata.providerType,
        callAmount: session.payment.amount,
        createdAt: admin.firestore.Timestamp.now(),
        status: "pending",
        callStartedAt: session.conference.startedAt,
        callEndedAt: session.conference.endedAt,
        bothConnected:
          session.participants.provider.status === "connected" &&
          session.participants.client.status === "connected",
        requestId: session.metadata.requestId,
      };

      await this.saveWithRetry(() =>
        this.db.collection("reviews_requests").add(reviewRequest)
      );
    } catch (error) {
      await logError("TwilioCallManager:createReviewRequest", error as unknown);
    }
  }

  async cancelCallSession(
    sessionId: string,
    reason: string,
    cancelledBy?: string
  ): Promise<boolean> {
    try {
      const session = await this.getCallSession(sessionId);
      if (!session) return false;

      const timeout = this.activeCalls.get(sessionId);
      if (timeout) {
        clearTimeout(timeout);
        this.activeCalls.delete(sessionId);
      }

      await this.cancelActiveCallsForSession(session);

      await this.saveWithRetry(() =>
        this.db
          .collection("call_sessions")
          .doc(sessionId)
          .update({
            status: "cancelled",
            "metadata.updatedAt": admin.firestore.Timestamp.now(),
            cancelledAt: admin.firestore.Timestamp.now(),
            cancelledBy: cancelledBy || "system",
            cancellationReason: reason,
          })
      );

      await this.processRefund(sessionId, `cancelled_${reason}`);

      await logCallRecord({
        callId: sessionId,
        status: `cancelled_${reason}`,
        retryCount: 0,
        additionalData: { cancelledBy: cancelledBy || "system" },
      });

      return true;
    } catch (error) {
      await logError("TwilioCallManager:cancelCallSession", error as unknown);
      return false;
    }
  }

  private async cancelActiveCallsForSession(
    session: CallSessionState
  ): Promise<void> {
    try {
      const twilioClient = getTwilioClient();
      const promises: Promise<void>[] = [];
      if (session.participants.provider.callSid) {
        promises.push(
          this.cancelTwilioCall(
            session.participants.provider.callSid,
            twilioClient
          )
        );
      }
      if (session.participants.client.callSid) {
        promises.push(
          this.cancelTwilioCall(
            session.participants.client.callSid,
            twilioClient
          )
        );
      }
      await Promise.allSettled(promises);
    } catch (error) {
      await logError(
        "TwilioCallManager:cancelActiveCallsForSession",
        error as unknown
      );
    }
  }

  private async cancelTwilioCall(
    callSid: string,
    twilioClient: ReturnType<typeof getTwilioClient>
  ): Promise<void> {
    try {
      await twilioClient.calls(callSid).update({ status: "completed" });
    } catch (error) {
      console.warn(`Impossible d'annuler l'appel Twilio ${callSid}:`, error);
    }
  }

  /**
   * Fetch REAL Twilio costs from the API after call completion
   * Twilio provides actual costs in the call resource after completion
   */
  async fetchAndStoreRealCosts(sessionId: string): Promise<void> {
    try {
      const callSession = await this.getCallSession(sessionId);
      if (!callSession) {
        console.warn(`[fetchAndStoreRealCosts] Session ${sessionId} not found`);
        return;
      }

      const twilioClient = getTwilioClient();
      let totalTwilioCost = 0;
      const callDetails: { client?: any; provider?: any } = {};

      // Fetch client call details and cost
      if (callSession.participants.client.callSid) {
        try {
          const clientCall = await twilioClient.calls(callSession.participants.client.callSid).fetch();
          const clientPrice = parseFloat(clientCall.price || '0');
          totalTwilioCost += Math.abs(clientPrice); // Twilio returns negative prices
          callDetails.client = {
            callSid: clientCall.sid,
            duration: clientCall.duration,
            price: Math.abs(clientPrice),
            priceUnit: clientCall.priceUnit || 'USD',
            status: clientCall.status,
          };
          console.log(`[fetchAndStoreRealCosts] Client call cost: ${clientPrice} ${clientCall.priceUnit}`);
        } catch (error) {
          console.warn(`[fetchAndStoreRealCosts] Failed to fetch client call:`, error);
        }
      }

      // Fetch provider call details and cost
      if (callSession.participants.provider.callSid) {
        try {
          const providerCall = await twilioClient.calls(callSession.participants.provider.callSid).fetch();
          const providerPrice = parseFloat(providerCall.price || '0');
          totalTwilioCost += Math.abs(providerPrice);
          callDetails.provider = {
            callSid: providerCall.sid,
            duration: providerCall.duration,
            price: Math.abs(providerPrice),
            priceUnit: providerCall.priceUnit || 'USD',
            status: providerCall.status,
          };
          console.log(`[fetchAndStoreRealCosts] Provider call cost: ${providerPrice} ${providerCall.priceUnit}`);
        } catch (error) {
          console.warn(`[fetchAndStoreRealCosts] Failed to fetch provider call:`, error);
        }
      }

      // Estimate GCP costs (Cloud Functions + Firestore + Cloud Tasks)
      // These are rough estimates - for exact costs, use Cloud Billing API
      const gcpCostEstimate = 0.0035; // ~$0.0035 per call (2 function invocations + 20 Firestore ops + 1 task)

      // Store the real costs in Firestore
      await this.db.collection("call_sessions").doc(sessionId).update({
        "costs.twilio": Math.round(totalTwilioCost * 100) / 100,
        "costs.twilioCurrency": callDetails.client?.priceUnit || callDetails.provider?.priceUnit || 'USD',
        "costs.gcp": gcpCostEstimate,
        "costs.twilioDetails": callDetails,
        "costs.fetchedAt": admin.firestore.Timestamp.now(),
        "metadata.updatedAt": admin.firestore.Timestamp.now(),
      });

      console.log(`[fetchAndStoreRealCosts] Stored costs for session ${sessionId}: Twilio=${totalTwilioCost}, GCP=${gcpCostEstimate}`);
    } catch (error) {
      console.error(`[fetchAndStoreRealCosts] Error:`, error);
      await logError("TwilioCallManager:fetchAndStoreRealCosts", error as unknown);
    }
  }

  private async getActiveSessionsCount(): Promise<number> {
    try {
      const snapshot = await this.db
        .collection("call_sessions")
        .where("status", "in", [
          "pending",
          "provider_connecting",
          "client_connecting",
          "both_connecting",
          "active",
        ])
        .get();
      return snapshot.size;
    } catch (error) {
      await logError(
        "TwilioCallManager:getActiveSessionsCount",
        error as unknown
      );
      return 0;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async saveWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) throw error;
        await this.delay(baseDelay * attempt);
      }
    }
    throw new Error("Unreachable");
  }

  // =============================
  // CRUD sessions
  // =============================
  async updateCallSessionStatus(
    sessionId: string,
    status: CallSessionState["status"]
  ): Promise<void> {
    try {
      await this.saveWithRetry(() =>
        this.db.collection("call_sessions").doc(sessionId).update({
          status,
          "metadata.updatedAt": admin.firestore.Timestamp.now(),
        })
      );
    } catch (error) {
      await logError(
        "TwilioCallManager:updateCallSessionStatus",
        error as unknown
      );
      throw error;
    }
  }

  async updateParticipantCallSid(
    sessionId: string,
    participantType: "provider" | "client",
    callSid: string
  ): Promise<void> {
    try {
      // P0 CRITICAL FIX: Reset status to "calling" when assigning new callSid
      // This fixes the bug where old status (no_answer/amd_pending) from previous attempt
      // would cause waitForConnection() to return false immediately on retry attempts.
      // The status MUST be reset before the new call starts, so webhooks from the new call
      // can properly update it to ringing -> amd_pending -> connected
      console.log(
        `[TwilioCallManager] updateParticipantCallSid(${sessionId}, ${participantType}, ${callSid.slice(0, 15)}...) - RESETTING status to "calling"`
      );
      await this.saveWithRetry(() =>
        this.db
          .collection("call_sessions")
          .doc(sessionId)
          .update({
            [`participants.${participantType}.callSid`]: callSid,
            [`participants.${participantType}.status`]: "calling", // P0 FIX: Reset status for new call attempt
            "metadata.updatedAt": admin.firestore.Timestamp.now(),
          })
      );
    } catch (error) {
      await logError(
        "TwilioCallManager:updateParticipantCallSid",
        error as unknown
      );
      throw error;
    }
  }

  async updateParticipantStatus(
    sessionId: string,
    participantType: "provider" | "client",
    status: CallSessionState["participants"]["provider"]["status"],
    timestamp?: admin.firestore.Timestamp
  ): Promise<void> {
    try {
      console.log(
        `[TwilioCallManager] updateParticipantStatus(${sessionId}, ${participantType}, ${status})`
      );
      const updateData: Record<string, unknown> = {
        [`participants.${participantType}.status`]: status,
        "metadata.updatedAt": admin.firestore.Timestamp.now(),
      };

      if (status === "connected" && timestamp) {
        updateData[`participants.${participantType}.connectedAt`] = timestamp;
      } else if (status === "disconnected" && timestamp) {
        updateData[`participants.${participantType}.disconnectedAt`] =
          timestamp;
      }

      await this.saveWithRetry(() =>
        this.db.collection("call_sessions").doc(sessionId).update(updateData)
      );
    } catch (error) {
      await logError(
        "TwilioCallManager:updateParticipantStatus",
        error as unknown
      );
      throw error;
    }
  }

  async updateConferenceInfo(
    sessionId: string,
    updates: Partial<CallSessionState["conference"]>
  ): Promise<void> {
    try {
      const updateData: Record<string, unknown> = {
        "metadata.updatedAt": admin.firestore.Timestamp.now(),
      };
      Object.entries(updates).forEach(([key, value]) => {
        updateData[`conference.${key}`] = value;
      });
      await this.saveWithRetry(() =>
        this.db.collection("call_sessions").doc(sessionId).update(updateData)
      );
    } catch (error) {
      await logError(
        "TwilioCallManager:updateConferenceInfo",
        error as unknown
      );
      throw error;
    }
  }

  async getCallSession(sessionId: string): Promise<CallSessionState | null> {
    try {
      console.log(
        "[getCallSession] this is the sessionId i am searching for : ",
        sessionId
      );
      const doc = await this.db
        .collection("call_sessions")
        .doc(sessionId)
        .get();
      return doc.exists ? (doc.data() as CallSessionState) : null;
    } catch (error) {
      await logError("TwilioCallManager:getCallSession", error as unknown);
      return null;
    }
  }

  async findSessionByConferenceSid(
    conferenceSid: string
  ): Promise<CallSessionState | null> {
    try {
      const snapshot = await this.db
        .collection("call_sessions")
        .where("conference.sid", "==", conferenceSid)
        .limit(1)
        .get();
      return snapshot.empty
        ? null
        : (snapshot.docs[0].data() as CallSessionState);
    } catch (error) {
      await logError(
        "TwilioCallManager:findSessionByConferenceSid",
        error as unknown
      );
      return null;
    }
  }

  /**
   * P0 CRITICAL FIX: Find session by conference NAME (FriendlyName from Twilio)
   *
   * This is needed because:
   * 1. When a session is created, conference.name is set
   * 2. When conference-start webhook arrives, conference.sid doesn't exist yet
   * 3. We need to find the session by name to set the sid
   *
   * The FriendlyName in Twilio webhook matches conference.name in Firestore.
   */
  async findSessionByConferenceName(
    conferenceName: string
  ): Promise<CallSessionState | null> {
    const debugId = `findByName_${Date.now().toString(36)}`;
    console.log(`🔍 [${debugId}] findSessionByConferenceName: "${conferenceName}"`);

    try {
      const snapshot = await this.db
        .collection("call_sessions")
        .where("conference.name", "==", conferenceName)
        .limit(1)
        .get();

      if (snapshot.empty) {
        console.log(`🔍 [${debugId}]   ❌ No session found with conference.name: ${conferenceName}`);
        return null;
      }

      const session = snapshot.docs[0].data() as CallSessionState;
      console.log(`🔍 [${debugId}]   ✅ Found session: ${session.id}`);
      return session;
    } catch (error) {
      await logError(
        "TwilioCallManager:findSessionByConferenceName",
        error as unknown
      );
      return null;
    }
  }

  /**
   * P0 CRITICAL FIX: Update conference.sid in session
   *
   * This is called when we find a session by conference.name but conference.sid is not set.
   * This happens on the first conference event (conference-start or participant-join).
   */
  async updateConferenceSid(sessionId: string, conferenceSid: string): Promise<void> {
    console.log(`📝 [updateConferenceSid] sessionId: ${sessionId}, conferenceSid: ${conferenceSid}`);

    await this.db.collection("call_sessions").doc(sessionId).update({
      "conference.sid": conferenceSid,
      "metadata.updatedAt": admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`📝 [updateConferenceSid]   ✅ Updated conference.sid in session`);
  }

  async findSessionByCallSid(callSid: string): Promise<{
    session: CallSessionState;
    participantType: "provider" | "client";
  } | null> {
    try {
      let snapshot = await this.db
        .collection("call_sessions")
        .where("participants.provider.callSid", "==", callSid)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        return {
          session: snapshot.docs[0].data() as CallSessionState,
          participantType: "provider",
        };
      }

      snapshot = await this.db
        .collection("call_sessions")
        .where("participants.client.callSid", "==", callSid)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        return {
          session: snapshot.docs[0].data() as CallSessionState,
          participantType: "client",
        };
      }

      return null;
    } catch (error) {
      await logError(
        "TwilioCallManager:findSessionByCallSid",
        error as unknown
      );
      return null;
    }
  }

  // CPU OPTIMIZATION: addToQueue removed - was never called and used setInterval polling
  // If you need queue functionality, use Cloud Tasks instead:
  // import { scheduleCallTask } from "./lib/tasks";
  // await scheduleCallTask(sessionId, delaySeconds);

  async getCallStatistics(
    options: {
      startDate?: admin.firestore.Timestamp;
      endDate?: admin.firestore.Timestamp;
      providerType?: "lawyer" | "expat";
      serviceType?: "lawyer_call" | "expat_call";
    } = {}
  ): Promise<{
    total: number;
    pending: number;
    completed: number;
    failed: number;
    cancelled: number;
    averageDuration: number;
    successRate: number;
    totalRevenue: number;
    averageRevenue: number;
  }> {
    try {
      let query = this.db.collection("call_sessions") as admin.firestore.Query;

      if (options.startDate)
        query = query.where("metadata.createdAt", ">=", options.startDate);
      if (options.endDate)
        query = query.where("metadata.createdAt", "<=", options.endDate);
      if (options.providerType)
        query = query.where(
          "metadata.providerType",
          "==",
          options.providerType
        );
      if (options.serviceType)
        query = query.where("metadata.serviceType", "==", options.serviceType);

      const snapshot = await query.get();

      const stats = {
        total: snapshot.size,
        pending: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
        averageDuration: 0,
        successRate: 0,
        totalRevenue: 0,
        averageRevenue: 0,
      };

      let totalDuration = 0;
      let completedWithDuration = 0;
      let totalCapturedAmount = 0;
      let capturedPayments = 0;

      snapshot.docs.forEach((doc) => {
        const session = doc.data() as CallSessionState;
        switch (session.status) {
          case "pending":
          case "provider_connecting":
          case "client_connecting":
          case "both_connecting":
          case "active":
            stats.pending++;
            break;
          case "completed":
            stats.completed++;
            if (session.conference.duration) {
              totalDuration += session.conference.duration;
              completedWithDuration++;
            }
            break;
          case "failed":
            stats.failed++;
            break;
          case "cancelled":
            stats.cancelled++;
            break;
        }
        if (session.payment.status === "captured") {
          totalCapturedAmount += session.payment.amount;
          capturedPayments++;
        }
      });

      stats.averageDuration =
        completedWithDuration > 0 ? totalDuration / completedWithDuration : 0;
      stats.successRate =
        stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
      stats.totalRevenue = totalCapturedAmount;
      stats.averageRevenue =
        capturedPayments > 0 ? totalCapturedAmount / capturedPayments : 0;

      return stats;
    } catch (error) {
      await logError("TwilioCallManager:getCallStatistics", error as unknown);
      throw error;
    }
  }

  async cleanupOldSessions(
    options: {
      olderThanDays?: number;
      keepCompletedDays?: number;
      batchSize?: number;
    } = {}
  ): Promise<{ deleted: number; errors: number }> {
    const {
      olderThanDays = 90,
      keepCompletedDays = 30,
      batchSize = 50,
    } = options;

    try {
      const now = admin.firestore.Timestamp.now();
      const generalCutoff = admin.firestore.Timestamp.fromMillis(
        now.toMillis() - olderThanDays * 86_400_000
      );
      const completedCutoff = admin.firestore.Timestamp.fromMillis(
        now.toMillis() - keepCompletedDays * 86_400_000
      );

      let deleted = 0;
      let errors = 0;

      const failedSnapshot = await this.db
        .collection("call_sessions")
        .where("metadata.createdAt", "<=", generalCutoff)
        .where("status", "in", ["failed", "cancelled"])
        .limit(batchSize)
        .get();

      if (!failedSnapshot.empty) {
        const batch = this.db.batch();
        failedSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
        try {
          await batch.commit();
          deleted += failedSnapshot.size;
        } catch (error) {
          errors += failedSnapshot.size;
          await logError(
            "TwilioCallManager:cleanupOldSessions:failed",
            error as unknown
          );
        }
      }

      const completedSnapshot = await this.db
        .collection("call_sessions")
        .where("metadata.createdAt", "<=", completedCutoff)
        .where("status", "==", "completed")
        .limit(batchSize)
        .get();

      if (!completedSnapshot.empty) {
        const batch = this.db.batch();
        completedSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
        try {
          await batch.commit();
          deleted += completedSnapshot.size;
        } catch (error) {
          errors += completedSnapshot.size;
          await logError(
            "TwilioCallManager:cleanupOldSessions:completed",
            error as unknown
          );
        }
      }

      return { deleted, errors };
    } catch (error) {
      await logError("TwilioCallManager:cleanupOldSessions", error as unknown);
      return { deleted: 0, errors: 1 };
    }
  }
}

// 🔧 Singleton export
export const twilioCallManager = TwilioCallManager.getInstance();
