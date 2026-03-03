/**
 * Payment Notifications Module
 *
 * Extracted from index.ts to avoid circular dependencies.
 * Used by both Stripe (index.ts) and PayPal (PayPalManager.ts) payment flows.
 *
 * This module handles:
 * 1. Sending notifications to client and provider after payment
 * 2. Syncing call session data to Outil IA for AI response generation
 */

import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";
// import { ultraLogger, traceFunction } from "../utils/ultraDebugLogger";
import { decryptPhoneNumber } from "../utils/encryption";
import { OUTIL_SYNC_API_KEY, ENCRYPTION_KEY, getOutilIngestEndpoint } from "../lib/secrets";
import { getCountryName } from "../utils/countryUtils";

// Language code to name mapping for SMS notifications
const LANGUAGE_NAMES: Record<string, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
  de: 'Deutsch',
  pt: 'Português',
  ar: 'العربية',
  hi: 'हिन्दी',
  ru: 'Русский',
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
};

function formatLanguages(languages: string[] | undefined): string {
  if (!languages || languages.length === 0) return 'Non spécifié';
  return languages
    .map(code => LANGUAGE_NAMES[code.toLowerCase()] || code.toUpperCase())
    .join(', ');
}

// Outil ingest endpoint - loaded from environment/config via centralized secrets.ts

/**
 * Sync call_session to Outil-sos-expat AFTER payment is validated
 * This triggers the AI system to process the booking
 */
export async function syncCallSessionToOutil(
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

          // AAA profiles (test/demo accounts) always get AI access after payment
          const isAAA = providerId.startsWith("aaa_") || userData?.isAAA === true;

          providerAccessInfo = {
            forcedAIAccess: isAAA || userData?.forcedAIAccess === true,
            freeTrialUntil: userData?.freeTrialUntil?.toDate?.()?.toISOString() || null,
            subscriptionStatus: userData?.subscriptionStatus,
            hasActiveSubscription: userData?.hasActiveSubscription === true,
            providerEmail: userData?.email,
          };
          console.log(`🔑 [${debugId}] Provider access info retrieved:`, {
            providerId,
            isAAA,
            forcedAIAccess: providerAccessInfo.forcedAIAccess,
            subscriptionStatus: providerAccessInfo.subscriptionStatus,
          });
        } else {
          // AAA profiles without a user doc still get AI access
          const isAAA = providerId.startsWith("aaa_");
          if (isAAA) {
            providerAccessInfo = { forcedAIAccess: true };
            console.log(`🔑 [${debugId}] AAA provider without user doc — forcing AI access`);
          } else {
            console.warn(`⚠️ [${debugId}] Provider not found in users collection: ${providerId}`);
          }
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
      // P3 FIX: Convert ISO code to full country name for consistency with SMS
      clientCurrentCountry: getCountryName(cs?.clientCurrentCountry) || cs?.clientCurrentCountry,
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
      const outilEndpoint = getOutilIngestEndpoint();
      const response = await fetch(outilEndpoint, {
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
        logger.error("OUTIL_SYNC", "Échec sync vers Outil après paiement", {
          callSessionId,
          status: response.status,
          error: errorText,
        });
      } else {
        const result = await response.json() as { bookingId?: string };
        console.log(`✅ [${debugId}] Outil sync success! OutilBookingId: ${result.bookingId}`);
        logger.info("OUTIL_SYNC", "Sync vers Outil réussi après paiement", {
          callSessionId,
          outilBookingId: result.bookingId,
        });
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error(`⏱️ [${debugId}] Outil sync timeout after ${OUTIL_TIMEOUT_MS}ms`);
        logger.warn("OUTIL_SYNC", "Timeout sync vers Outil", {
          callSessionId,
          timeoutMs: OUTIL_TIMEOUT_MS,
        });
      } else {
        throw fetchError; // Re-throw to be caught by outer catch
      }
    }
  } catch (error) {
    console.error(`❌ [${debugId}] Outil sync exception:`, error);
    logger.error("OUTIL_SYNC", "Exception sync vers Outil", {
      callSessionId,
      error: error instanceof Error ? error.message : String(error),
    });
    // Non-blocking: don't throw, just log
  }
}

/**
 * Send payment notifications to client and provider
 * Also syncs the call session to Outil IA for AI response generation
 *
 * Used by:
 * - Stripe webhook (checkout.session.completed, payment_intent.succeeded)
 * - PayPal authorizePayPalOrderHttp (after successful authorization)
 */
export const sendPaymentNotifications = async (callSessionId: string, database: admin.firestore.Firestore) => {
    const debugId = `notif_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

    console.log(`\n`);
    console.log(`=======================================================================`);
    console.log(`📨 [sendPaymentNotifications][${debugId}] ========== START ==========`);
    console.log(`=======================================================================`);
    console.log(`📨 [${debugId}] CallSessionId: ${callSessionId}`);
    console.log(`📨 [${debugId}] Timestamp: ${new Date().toISOString()}`);

    try {
      logger.info(
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
        logger.warn("PAYMENT_NOTIFICATIONS", "Session introuvable", {
          callSessionId,
          debugId,
        });
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // FIX: Isolated try-catch — client notification failure must NOT block provider SMS
      try {
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
          logger.info("PAYMENT_NOTIFICATIONS", "Notification client créée", { callSessionId, clientId, eventDocId: clientEventRef.id, debugId });
        } else {
          console.log(`⚠️ [${debugId}] SKIPPED client notification - no clientId or clientEmail`);
        }
      } catch (clientNotifError) {
        console.error(`⚠️ [${debugId}] CLIENT notification failed (non-blocking - provider SMS will still be sent):`, clientNotifError);
      }

      // Notification au provider: Appel entrant programmé avec détails booking
      // P0 FIX: Use booking_paid_provider template which has SMS enabled
      if (providerId || providerEmail) {
        console.log(`📨 [${debugId}] Creating PROVIDER notification (booking_paid_provider - SMS ENABLED)...`);

        const clientName = cs?.participants?.client?.name ?? cs?.participants?.client?.firstName ?? cs?.clientName ?? "Client";
        // P2 FIX: Use clientCurrentCountry as intervention country (selected by client in wizard)
        // clientCurrentCountry = where the client needs help (intervention country from wizard/booking form)
        // P3 FIX: Convert ISO code to full country name for SMS readability
        const rawInterventionCountry = cs?.clientCurrentCountry ?? cs?.metadata?.clientCountry ?? "N/A";
        const interventionCountry = getCountryName(rawInterventionCountry) || rawInterventionCountry;
        const amount = cs?.payment?.amount ?? cs?.metadata?.amount ?? 0;
        const currency = cs?.payment?.currency ?? cs?.currency ?? "EUR";
        const serviceType = cs?.metadata?.serviceType ?? cs?.serviceType ?? "consultation";
        const description = cs?.description ?? cs?.metadata?.description ?? `${title} - ${serviceType}`;
        // P1 FIX: Get client languages for SMS template
        const clientLanguages = cs?.metadata?.clientLanguages ?? cs?.clientLanguages ?? [language];
        const clientLanguagesFormatted = formatLanguages(clientLanguages);

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
              country: interventionCountry,  // P2 FIX: Use intervention country (provider's country)
              title: title,
              description: description,
            },
            booking: {
              amount: amount,
              currency: currency,
            },
            // P1 FIX: Add clientLanguagesFormatted for SMS template
            clientLanguagesFormatted,
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
        console.log(`✅ [${debugId}]   → SMS will be sent: "Client: ${clientName} (${interventionCountry}) - Langue: ${clientLanguagesFormatted}"`);
        logger.info("PAYMENT_NOTIFICATIONS", "Notification provider créée (SMS enabled)", { callSessionId, providerId, eventDocId: providerEventRef.id, debugId });
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

      logger.info("PAYMENT_NOTIFICATIONS", "Notifications envoyées avec succès", {
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

      logger.error(
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
};

// Re-export secrets for convenience
export { ENCRYPTION_KEY, OUTIL_SYNC_API_KEY };
