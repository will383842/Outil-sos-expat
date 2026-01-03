import * as admin from "firebase-admin";
// 🔧 Twilio client & num
import { getTwilioClient, getTwilioPhoneNumber } from "./lib/twilio";
import { getFunctionsBaseUrl } from "./utils/urlBase";
import { logError } from "./utils/logs/logError";
import { logCallRecord } from "./utils/logs/logCallRecord";
import { stripeManager } from "./StripeManager";
import { setProviderBusy, setProviderAvailable } from "./callables/providerStatusManager";
// 🔒 Phone number encryption
import { encryptPhoneNumber, decryptPhoneNumber } from "./utils/encryption";

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
        | "ringing"
        | "connected"
        | "disconnected"
        | "no_answer";
      callSid?: string;
      connectedAt?: admin.firestore.Timestamp;
      disconnectedAt?: admin.firestore.Timestamp;
      attemptCount: number;
    };
    client: {
      phone: string;
      status:
        | "pending"
        | "ringing"
        | "connected"
        | "disconnected"
        | "no_answer";
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
    duration?: number;
    recordingUrl?: string;
    recordingSid?: string;
  };
  payment: {
    intentId: string;
    status: "pending" | "authorized" | "captured" | "refunded" | "cancelled" | "failed";
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
  MAX_CONCURRENT_CALLS: 50,
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

// =============================
// Helpers langue & prompts
// =============================

function normalizeLangList(langs?: string[]): string[] {
  if (!langs || !Array.isArray(langs)) return [];
  const out: string[] = [];
  for (const raw of langs) {
    if (!raw) continue;
    const short = String(raw).toLowerCase().split(/[-_]/)[0];
    if (!out.includes(short)) out.push(short);
  }
  return out;
}

function availablePromptLangs(): LangCode[] {
  const providerLangs = Object.keys(prompts.provider_intro) as LangCode[];
  const clientLangs = Object.keys(prompts.client_intro) as LangCode[];
  return providerLangs.filter((l) => clientLangs.includes(l));
}

function pickSessionLanguage(
  clientLangs: string[],
  providerLangs: string[]
): string {
  const supported = new Set(availablePromptLangs());
  const c = normalizeLangList(clientLangs).filter((l) =>
    supported.has(l as LangCode)
  );
  const p = normalizeLangList(providerLangs).filter((l) =>
    supported.has(l as LangCode)
  );
  for (const lang of c) if (p.includes(lang)) return lang;
  if (c.length) return c[0];
  return "en";
}

function localeFor(langKey: string): string {
  return VOICE_LOCALES[langKey] || VOICE_LOCALES["en"];
}

function getIntroText(
  participant: "provider" | "client",
  langKey: string
): string {
  const langs = availablePromptLangs();
  const safeLang = (
    langs.includes(langKey as LangCode) ? langKey : "en"
  ) as LangCode;
  const table =
    participant === "provider" ? prompts.provider_intro : prompts.client_intro;
  return table[safeLang] ?? table.en ?? "Please hold.";
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
  private callQueue: string[] = [];
  private isProcessingQueue = false;

  constructor() {
    this.db = admin.firestore();
    this.startQueueProcessor();
  }

  /** Démarrer le processeur de queue */
  private startQueueProcessor(): void {
    setInterval(async () => {
      if (!this.isProcessingQueue && this.callQueue.length > 0) {
        this.isProcessingQueue = true;
        try {
          const sessionId = this.callQueue.shift();
          if (sessionId) await this.processQueuedCall(sessionId);
        } catch (error) {
          await logError("TwilioCallManager:queueProcessor", error as unknown);
        } finally {
          this.isProcessingQueue = false;
        }
      }
    }, 2000);
  }

  private async processQueuedCall(sessionId: string): Promise<void> {
    try {
      const session = await this.getCallSession(sessionId);
      if (session && session.status === "pending") {
        await this.initiateCallSequence(sessionId, 0);
      }
    } catch (error) {
      await logError("TwilioCallManager:processQueuedCall", error as unknown);
    }
  }

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
    delayMinutes: number = 4
  ): Promise<void> {
    try {
      console.log(
        `🚀 Init séquence d'appel ${sessionId} dans ${delayMinutes} min`
      );

      const callSession = await this.getCallSession(sessionId);
      if (!callSession) {
        throw new Error(`Session ${sessionId} not found`);
      }

      if (!callSession.metadata) {
        console.warn(
          `No metadata found for session ${sessionId}, creating minimal metadata`
        );
      } else {
        // Just update the existing metadata with language defaults
        if (!callSession.metadata.clientLanguages) {
          callSession.metadata.clientLanguages = ["en"];
        }
        if (!callSession.metadata.providerLanguages) {
          callSession.metadata.providerLanguages = ["en"];
        }
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
    console.log("i am in executeCallSequence with the session id", sessionId);
    const callSession = await this.getCallSession(sessionId);
    if (!callSession)
      throw new Error(`Session d'appel non trouvée: ${sessionId}`);
    console.log("[executeCallSequence] callSession:", callSession);

    if (callSession.status === "cancelled" || callSession.status === "failed") {
      console.log(`Session ${sessionId} déjà ${callSession.status}, stop`);
      return;
    }

    const BYPASS_VALIDATIONS = process.env.TEST_BYPASS_VALIDATIONS === "1";
    const paymentValid = BYPASS_VALIDATIONS
      ? true
      : await this.validatePaymentStatus(callSession.payment.intentId);
    if (!paymentValid) {
      await this.handleCallFailure(sessionId, "payment_invalid");
      return;
    }

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

    const langKey = pickSessionLanguage(
      callSession.metadata.clientLanguages || ["en"],
      callSession.metadata.providerLanguages || ["en"]
    );

    const ttsLocale = localeFor(langKey);

    await this.saveWithRetry(() =>
      this.db.collection("call_sessions").doc(sessionId).update({
        "metadata.selectedLanguage": langKey,
        "metadata.ttsLocale": ttsLocale,
        "metadata.updatedAt": admin.firestore.Timestamp.now(),
      })
    );

    await this.updateCallSessionStatus(sessionId, "client_connecting");

    // Decrypt phone numbers for Twilio call
    const clientPhone = decryptPhoneNumber(callSession.participants.client.phone);
    const providerPhone = decryptPhoneNumber(callSession.participants.provider.phone);

    console.log(`📞 Étape 1: Appel client ${sessionId}`);
    const clientConnected = await this.callParticipantWithRetries(
      sessionId,
      "client",
      clientPhone,
      callSession.conference.name,
      callSession.metadata.maxDuration,
      ttsLocale,
      langKey
    );
    console.log("client connected :", clientConnected);

    if (!clientConnected) {
      await this.handleCallFailure(sessionId, "client_no_answer");
      return;
    }

    await this.updateCallSessionStatus(sessionId, "provider_connecting");

    console.log(`📞 Étape 2: Appel prestataire (avocat) ${sessionId}`);
    const providerConnected = await this.callParticipantWithRetries(
      sessionId,
      "provider",
      providerPhone,
      callSession.conference.name,
      callSession.metadata.maxDuration,
      ttsLocale,
      langKey,
      15_000
    );
    console.log("provider connected : ", providerConnected);

    if (!providerConnected) {
      await this.handleCallFailure(sessionId, "provider_no_answer");
      return;
    }

    // ===== NOUVEAU: Mettre le prestataire en statut "busy" =====
    try {
      await setProviderBusy(
        callSession.metadata.providerId,
        sessionId,
        'in_call'
      );
      console.log(`📞 Provider ${callSession.metadata.providerId} marked as BUSY`);
    } catch (busyError) {
      console.error(`⚠️ Failed to set provider busy (non-blocking):`, busyError);
      // Continue - ne pas bloquer l'appel si la mise à jour échoue
    }

    await this.updateCallSessionStatus(sessionId, "both_connecting");

    await logCallRecord({
      callId: sessionId,
      status: "both_participants_called",
      retryCount: 0,
    });

    console.log(`✅ Séquence d'appel complétée pour ${sessionId}`);
  }

  private async validatePaymentStatus(
    paymentIntentId: string
  ): Promise<boolean> {
    try {
      const payment = await stripeManager.getPayment(paymentIntentId);
      if (!payment || typeof payment !== "object") return false;
      const status = (payment as Record<string, unknown>).status;
      if (typeof status !== "string") return false;

      const validStatuses = new Set<string>([
        "requires_payment_method",
        "requires_confirmation",
        "requires_action",
        "processing",
        "requires_capture",
        "succeeded",
      ]);
      return validStatuses.has(status);
    } catch (error) {
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
      try {
        // 🛑 STOP if session is already failed/cancelled (prevents unnecessary retries)
        const sessionCheck = await this.getCallSession(sessionId);
        if (sessionCheck && (sessionCheck.status === "failed" || sessionCheck.status === "cancelled")) {
          console.log(`🛑 Stopping retries for ${participantType}: session is ${sessionCheck.status}`);
          await logCallRecord({
            callId: sessionId,
            status: `${participantType}_retries_stopped_session_${sessionCheck.status}`,
            retryCount: attempt - 1,
          });
          return false;
        }

        console.log(
          `📞 Tentative ${attempt}/${maxRetries} → ${participantType} (${sessionId})`
        );

        await this.incrementAttemptCount(sessionId, participantType);

        await logCallRecord({
          callId: sessionId,
          status: `${participantType}_attempt_${attempt}`,
          retryCount: attempt,
        });

        const welcomeMessage = getIntroText(participantType, langKey);
        const twiml = this.generateConferenceTwiML(
          conferenceName,
          participantType,
          timeLimit,
          sessionId,
          ttsLocale,
          welcomeMessage
        );

        const twilioClient = getTwilioClient();
        const fromNumber = getTwilioPhoneNumber();
        const base = getFunctionsBaseUrl();

        const call = await twilioClient.calls.create({
          to: phoneNumber,
          from: fromNumber,
          twiml,
          statusCallback: `${base}/twilioCallWebhook`,
          statusCallbackMethod: "POST",
          statusCallbackEvent: [
            "ringing",
            "answered",
            "completed",
            "failed",
            "busy",
            "no-answer",
            "initiated",
          ],
          timeout: CALL_CONFIG.CALL_TIMEOUT,
          record: true,
          recordingStatusCallback: `${base}/twilioRecordingWebhook`,
          recordingStatusCallbackMethod: "POST",
          // AMD désactivé - non utilisé et coûteux (~0.007€/appel)
          // machineDetection: "Enable",
          // machineDetectionTimeout: 10,
        });
        console.log("call : ", call);

        console.log(`📞 Appel créé: ${call.sid} (${participantType})`);
        await this.updateParticipantCallSid(
          sessionId,
          participantType,
          call.sid
        );

        const connected = await this.waitForConnection(
          sessionId,
          participantType,
          attempt
        );
        if (connected) {
          await logCallRecord({
            callId: sessionId,
            status: `${participantType}_connected_attempt_${attempt}`,
            retryCount: attempt,
          });
          return true;
        }

        if (attempt < maxRetries) {
          // 🛑 Check again before retrying - session might have been marked as failed
          const sessionCheckBeforeRetry = await this.getCallSession(sessionId);
          if (sessionCheckBeforeRetry && (sessionCheckBeforeRetry.status === "failed" || sessionCheckBeforeRetry.status === "cancelled")) {
            console.log(`🛑 Stopping retries before attempt ${attempt + 1}: session is ${sessionCheckBeforeRetry.status}`);
            await logCallRecord({
              callId: sessionId,
              status: `${participantType}_retries_stopped_before_attempt_${attempt + 1}`,
              retryCount: attempt,
            });
            return false;
          }

          if (typeof backoffOverrideMs === "number") {
            await this.delay(backoffOverrideMs);
          } else {
            const progressive = 15_000 + attempt * 5_000;
            await this.delay(progressive);
          }
        }
      } catch (error) {
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

  private async waitForConnection(
    sessionId: string,
    participantType: "provider" | "client",
    _attempt: number // ← renommé pour lever TS6133
  ): Promise<boolean> {
    const maxWaitTime = CALL_CONFIG.CONNECTION_WAIT_TIME;
    const checkInterval = 3000;
    const maxChecks = Math.floor(maxWaitTime / checkInterval);

    for (let check = 0; check < maxChecks; check++) {
      await this.delay(checkInterval);
      try {
        const session = await this.getCallSession(sessionId);
        if (!session) return false;

        const participant =
          participantType === "provider"
            ? session.participants.provider
            : session.participants.client;

        if (participant.status === "connected") return true;
        if (
          participant.status === "disconnected" ||
          participant.status === "no_answer"
        )
          return false;
      } catch (error) {
        console.warn(`Erreur waitForConnection: ${String(error)}`);
      }
    }
    return false;
  }

  private generateConferenceTwiML(
    conferenceName: string,
    participantType: "provider" | "client",
    timeLimit: number,
    sessionId: string,
    ttsLocale: string,
    welcomeMessage: string
  ): string {
    const participantLabel =
      participantType === "provider" ? "provider" : "client";
    const waitUrl =
      "http://twimlets.com/holdmusic?Bucket=com.twilio.music.ambient";
    const base = getFunctionsBaseUrl();

    return `
<Response>
  <Say voice="alice" language="${ttsLocale}">${escapeXml(welcomeMessage)}</Say>
  <Dial timeout="${CALL_CONFIG.CALL_TIMEOUT}" timeLimit="${timeLimit}">
    <Conference
      statusCallback="${base}/twilioConferenceWebhook"
      statusCallbackMethod="POST"
      statusCallbackEvent="start end join leave mute hold"
      record="record-from-start"
      recordingStatusCallback="${base}/twilioRecordingWebhook"
      recordingStatusCallbackMethod="POST"
      participantLabel="${participantLabel}"
      sessionId="${sessionId}"
      waitUrl="${waitUrl}"
      maxParticipants="2"
      beep="false"
      startConferenceOnEnter="${participantType === "provider"}"
      trim="trim-silence"
      recordingChannels="mono"
      endConferenceOnExit="true"
    >${conferenceName}</Conference>
  </Dial>
</Response>
    `.trim();
  }

  async handleEarlyDisconnection(
    sessionId: string,
    participantType: string,
    duration: number
  ): Promise<void> {
    try {
      const session = await this.getCallSession(sessionId);
      if (!session) return;

      if (duration < CALL_CONFIG.MIN_CALL_DURATION) {
        console.log(`📄 Early disconnect: ${sessionId}`);
        await this.handleCallFailure(
          sessionId,
          `early_disconnect_${participantType}`
        );
        await logCallRecord({
          callId: sessionId,
          status: `early_disconnect_${participantType}`,
          retryCount: 0,
          additionalData: {
            participantType,
            duration,
            reason: "below_min_duration",
          },
        });
      } else {
        console.log(`📄 Handling call completion for session: ${sessionId}`);
        await this.handleCallCompletion(sessionId, duration);
      }
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
    try {
      const callSession = await this.getCallSession(sessionId);
      if (!callSession) return;

      await this.updateCallSessionStatus(sessionId, "failed");

      // 🛠️ FIX: Always fallback to 'en' if missing
      const clientLanguage = callSession.metadata?.clientLanguages?.[0] || "en";

      // 🆕 NEW: If provider doesn't answer and client is already connected, redirect their call to play voice message
      if (reason === "provider_no_answer" && 
          callSession.participants.client.status === "connected" && 
          callSession.participants.client.callSid) {
        try {
          const base = getFunctionsBaseUrl();
          const redirectUrl = `${base}/providerNoAnswerTwiML?sessionId=${sessionId}&lang=${clientLanguage}`;
          
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
      }                                                                                                                                                                                                                                                                                                                              

      // SMS/WhatsApp notifications removed - only voice calls are used for notifications
      console.log(`[TwilioCallManager] Call failure notification skipped (SMS/WhatsApp disabled), reason: ${reason}`);

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

      // ===== NOUVEAU: Remettre le prestataire en statut "available" =====
      try {
        await setProviderAvailable(
          callSession.metadata.providerId,
          `call_failed_${reason}`
        );
        console.log(`✅ Provider ${callSession.metadata.providerId} marked as AVAILABLE after failure`);
      } catch (availableError) {
        console.error(`⚠️ Failed to set provider available after failure (non-blocking):`, availableError);
        await logError('TwilioCallManager:handleCallFailure:setAvailable', availableError as unknown);
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
    } catch (error) {
      await logError("TwilioCallManager:handleCallFailure", error as unknown);
    }
  }

  private async processRefund(
    sessionId: string,
    reason: string
  ): Promise<void> {
    try {
      const callSession = await this.getCallSession(sessionId);
      if (!callSession?.payment.intentId && !callSession?.payment.paypalOrderId) return;

      // CRITIQUE: Distinction entre cancel (non capturé) et refund (capturé)
      // - Si payment.status === "authorized" → PaymentIntent en état requires_capture → CANCEL
      // - Si payment.status === "captured" → PaymentIntent capturé → REFUND
      const paymentStatus = callSession.payment.status;
      let result: { success: boolean; error?: string };

      // Détection gateway: PayPal ou Stripe
      const isPayPal = callSession.payment.gateway === "paypal" || !!callSession.payment.paypalOrderId;

      if (isPayPal) {
        // ===== PAYPAL REFUND/CANCEL =====
        console.log(`💳 [PAYPAL] Traitement remboursement/annulation ${sessionId} - raison: ${reason}`);

        if (paymentStatus === "authorized" || paymentStatus === "pending") {
          // PayPal: ordre non capturé → pas d'action nécessaire (expire automatiquement)
          console.log(`💳 [PAYPAL] Ordre non capturé - expiration automatique`);
          result = { success: true };
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
        await this.db.collection("call_sessions").doc(sessionId).update({
          "payment.status": newStatus,
          "payment.refundedAt": admin.firestore.Timestamp.now(),
          "payment.refundReason": reason,
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
    try {
      const callSession = await this.getCallSession(sessionId);
      if (!callSession) return;

      await this.updateCallSessionStatus(sessionId, "completed");

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

      // ===== NOUVEAU: Remettre le prestataire en statut "available" =====
      try {
        await setProviderAvailable(
          callSession.metadata.providerId,
          'call_completed'
        );
        console.log(`✅ Provider ${callSession.metadata.providerId} marked as AVAILABLE`);
      } catch (availableError) {
        console.error(`⚠️ Failed to set provider available (non-blocking):`, availableError);
        await logError('TwilioCallManager:handleCallCompletion:setAvailable', availableError as unknown);
      }

      await logCallRecord({
        callId: sessionId,
        status: "call_completed_success",
        retryCount: 0,
        additionalData: { duration },
      });
    } catch (error) {
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
    
    if (session.payment.status !== "authorized") {
      console.log(`📄 ❌ Payment status check failed: ${session.payment.status} !== "authorized" - returning false`);
      return false;
    }
    
    console.log(`📄 ✅ Payment status check passed: ${session.payment.status} === "authorized"`);
    console.log(`📄 ✅ All checks passed - returning true`);
    return true;
  }

  async capturePaymentForSession(sessionId: string): Promise<boolean> {
    try {
      console.log(`📄 Capturing payment for session: ${sessionId}`);
      const session = await this.getCallSession(sessionId);
      if (!session) return false;

      console.log(`📄 Session payment status: ${session.payment.status}`);

      // Already captured (e.g., Stripe automatic capture) - ensure invoices exist once
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

      // ===== DETECTION GATEWAY: PayPal ou Stripe =====
      const isPayPal = session.payment.gateway === "paypal" || !!session.payment.paypalOrderId;

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

      if (!captureResult.success) {
        console.error(`❌ Payment capture failed: ${captureResult.error}`);
        await this.db.collection("call_sessions").doc(sessionId).update({
          "payment.status": "failed",
          "payment.failureReason": captureResult.error || "Capture failed",
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

      // Mise a jour avec les informations de paiement et transfert automatique
      const paymentUpdate: Record<string, unknown> = {
        "payment.status": "captured",
        "payment.capturedAt": admin.firestore.Timestamp.now(),
        "metadata.updatedAt": admin.firestore.Timestamp.now(),
      };

      // Si Destination Charges est utilise, le transfert est automatique
      if (captureResult.transferId) {
        console.log(`✅ Automatic transfer via Destination Charges: ${captureResult.transferId}`);
        paymentUpdate["payment.transferId"] = captureResult.transferId;
        paymentUpdate["payment.transferAmount"] = providerAmountCents;
        paymentUpdate["payment.transferredAt"] = admin.firestore.Timestamp.now();
        paymentUpdate["payment.transferStatus"] = "automatic";

        // Recuperer le destinationAccountId depuis le payment record
        try {
          const paymentDoc = await this.db.collection('payments').doc(session.payment.intentId).get();
          if (paymentDoc.exists) {
            const paymentData = paymentDoc.data();
            if (paymentData?.destinationAccountId) {
              paymentUpdate["payment.destinationAccountId"] = paymentData.destinationAccountId;
            }
          }
        } catch (err) {
          console.warn(`⚠️ Could not fetch destinationAccountId:`, err);
        }
      } else {
        // Pas de Destination Charges configure - le transfert devra etre fait manuellement
        console.log(`⚠️ No automatic transfer - Destination Charges not configured for this payment`);
        paymentUpdate["payment.transferStatus"] = "pending";
      }

      await this.db.collection("call_sessions").doc(sessionId).update(paymentUpdate);
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

      return true;

    } catch (error) {
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

      // Check if payment is refunded - if so, mark invoices as refunded
      const isRefunded = session.payment.status === "refunded";
      const invoiceStatus = isRefunded ? "refunded" : "issued";

      // Get payment currency from payments collection
      let paymentCurrency: 'eur' | 'usd' = 'eur'; // Default to EUR
      try {
        const paymentDoc = await this.db.collection('payments').doc(session.payment.intentId).get();
        if (paymentDoc.exists) {
          const paymentData = paymentDoc.data();
          if (paymentData?.currency) {
            paymentCurrency = paymentData.currency.toLowerCase() as 'eur' | 'usd';
            console.log(`📄 Found payment currency: ${paymentCurrency.toUpperCase()}`);
          }
        }
      } catch (paymentError) {
        console.warn(`⚠️ Could not fetch payment currency, defaulting to EUR:`, paymentError);
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
      };

      // Add refund info if refunded
      if (isRefunded) {
        platformInvoice.refundedAt = admin.firestore.FieldValue.serverTimestamp();
        platformInvoice.refundReason = session.payment.refundReason || "Payment refunded";
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
      };

      // Add refund info if refunded
      if (isRefunded) {
        providerInvoice.refundedAt = admin.firestore.FieldValue.serverTimestamp();
        providerInvoice.refundReason = session.payment.refundReason || "Payment refunded";
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
      await this.saveWithRetry(() =>
        this.db
          .collection("call_sessions")
          .doc(sessionId)
          .update({
            [`participants.${participantType}.callSid`]: callSid,
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

  addToQueue(sessionId: string): void {
    if (!this.callQueue.includes(sessionId)) {
      this.callQueue.push(sessionId);
      console.log(
        `📞 Session ${sessionId} ajoutée à la queue (${this.callQueue.length} en attente)`
      );
    }
  }

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

// 🔒 petite aide XML
function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// 🔧 Singleton export
export const twilioCallManager = TwilioCallManager.getInstance();
