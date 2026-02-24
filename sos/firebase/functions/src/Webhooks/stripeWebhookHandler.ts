/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Stripe Webhook Handler
 *
 * Extracted from index.ts (lines ~1882-4074).
 * Contains the main stripeWebhook HTTP function and all Stripe event handlers:
 *   - payment_intent.* (created, processing, requires_action, succeeded, failed, canceled, amount_capturable_updated)
 *   - checkout.session.completed
 *   - charge.refunded, charge.captured
 *   - refund.updated
 *   - charge.dispute.* (created, updated, closed)
 *   - account.* (updated, application.authorized, application.deauthorized, external_account.*)
 *   - customer.subscription.* (created, updated, deleted, trial_will_end, paused, resumed)
 *   - invoice.* (created, paid, payment_failed, payment_action_required)
 *   - payment_method.* (attached, updated)
 *   - transfer.* (created, reversed, failed)
 */

import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import Stripe from "stripe";
import type { Response } from "express";

// Helpers from stripeWebhookHelpers
import {
  ultraLogger,
  traceFunction,
  decryptPhoneNumber,
  syncPaymentStatus,
  findCallSessionByPaymentId,
  isLive,
  getStripe,
  getStripeWebhookSecret,
  getStripeConnectWebhookSecret,
  initializeFirebase,
  wrapHttpFunction,
  type FirebaseRequest,
} from "./stripeWebhookHelpers";

// Secrets from centralized secrets.ts
import {
  STRIPE_SECRET_KEY_TEST,
  STRIPE_SECRET_KEY_LIVE,
  STRIPE_WEBHOOK_SECRET_TEST,
  STRIPE_WEBHOOK_SECRET_LIVE,
  STRIPE_CONNECT_WEBHOOK_SECRET_TEST,
  STRIPE_CONNECT_WEBHOOK_SECRET_LIVE,
  ENCRYPTION_KEY,
  OUTIL_SYNC_API_KEY,
  getOutilIngestEndpoint,
} from "../lib/secrets";

// Meta Conversions API (CAPI) - for Facebook Ads attribution
import { trackStripePurchase, META_CAPI_TOKEN } from "../metaConversionsApi";

// Subscription webhook handlers
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
} from "../subscription/webhooks";
import { addToDeadLetterQueue } from "../subscription/deadLetterQueue";

// Dispute handling
import {
  handleDisputeCreated,
  handleDisputeUpdated,
  handleDisputeClosed,
} from "../DisputeManager";

// Pending Transfer Processor
import {
  processPendingTransfersForProvider,
} from "../PendingTransferProcessor";

// ====== HELPER: SYNC CALL SESSION TO OUTIL AFTER PAYMENT ======

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

    // P0 FIX: Recuperer le statut d'acces IA du provider pour l'envoyer a Outil
    let providerAccessInfo: {
      forcedAIAccess?: boolean;
      freeTrialUntil?: string | null;
      subscriptionStatus?: string;
      hasActiveSubscription?: boolean;
      providerEmail?: string;
    } = {};

    if (providerId) {
      try {
        const userDoc = await admin.firestore().collection("users").doc(providerId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          const isAAA = providerId.startsWith("aaa_") || userData?.isAAA === true;

          providerAccessInfo = {
            forcedAIAccess: isAAA || userData?.forcedAIAccess === true,
            freeTrialUntil: userData?.freeTrialUntil?.toDate?.()?.toISOString() || null,
            subscriptionStatus: userData?.subscriptionStatus,
            hasActiveSubscription: userData?.hasActiveSubscription === true,
            providerEmail: userData?.email,
          };
          console.log(`[${debugId}] Provider access info retrieved:`, {
            providerId,
            isAAA,
            forcedAIAccess: providerAccessInfo.forcedAIAccess,
            subscriptionStatus: providerAccessInfo.subscriptionStatus,
          });
        } else {
          const isAAA = providerId.startsWith("aaa_");
          if (isAAA) {
            providerAccessInfo = { forcedAIAccess: true };
            console.log(`[${debugId}] AAA provider without user doc - forcing AI access`);
          } else {
            console.warn(`[${debugId}] Provider not found in users collection: ${providerId}`);
          }
        }
      } catch (accessError) {
        console.warn(`[${debugId}] Failed to get provider access info:`, accessError);
      }
    }

    // P1-1 FIX: Decrypt client phone before payload with try-catch
    let decryptedClientPhone = cs?.clientPhone;
    if (cs?.participants?.client?.phone) {
      try {
        decryptedClientPhone = decryptPhoneNumber(cs.participants.client.phone);
      } catch (decryptError) {
        console.error(`[${debugId}] Failed to decrypt client phone for Outil sync:`, decryptError);
      }
    }

    // Build payload from call_session data
    const payload = {
      clientFirstName: cs?.participants?.client?.firstName || cs?.clientFirstName,
      clientLastName: cs?.participants?.client?.lastName || cs?.clientLastName,
      clientName: cs?.participants?.client?.name || cs?.clientName,
      clientEmail: cs?.participants?.client?.email || cs?.clientEmail,
      clientPhone: decryptedClientPhone,
      clientWhatsapp: cs?.clientWhatsapp,
      clientCurrentCountry: cs?.clientCurrentCountry,
      clientNationality: cs?.clientNationality,
      clientLanguages: cs?.metadata?.clientLanguages || cs?.clientLanguages,

      title: cs?.metadata?.title || cs?.title || "Consultation",
      description: cs?.description,
      serviceType: cs?.metadata?.serviceType || cs?.serviceType,
      priority: "normal",

      providerId,
      providerType: cs?.metadata?.providerType || cs?.providerType,
      providerName: cs?.participants?.provider?.name || cs?.providerName,
      providerCountry: cs?.providerCountry,
      providerEmail: providerAccessInfo.providerEmail || cs?.participants?.provider?.email,
      forcedAIAccess: providerAccessInfo.forcedAIAccess,
      freeTrialUntil: providerAccessInfo.freeTrialUntil,
      subscriptionStatus: providerAccessInfo.subscriptionStatus,
      hasActiveSubscription: providerAccessInfo.hasActiveSubscription,

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

    console.log(`[${debugId}] Syncing to Outil after payment...`);
    console.log(`[${debugId}] Payload:`, JSON.stringify({
      externalId: payload.externalId,
      providerId: payload.providerId,
      clientName: payload.clientName,
      source: payload.source,
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
        console.error(`[${debugId}] Outil sync failed: HTTP ${response.status}: ${errorText}`);
        ultraLogger.error("OUTIL_SYNC", "Echec sync vers Outil apres paiement", {
          callSessionId,
          status: response.status,
          error: errorText,
        });
      } else {
        const result = await response.json() as { bookingId?: string };
        console.log(`[${debugId}] Outil sync success! OutilBookingId: ${result.bookingId}`);
        ultraLogger.info("OUTIL_SYNC", "Sync vers Outil reussi apres paiement", {
          callSessionId,
          outilBookingId: result.bookingId,
        });
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        console.error(`[${debugId}] Outil sync timeout after ${OUTIL_TIMEOUT_MS}ms`);
        ultraLogger.warn("OUTIL_SYNC", "Timeout sync vers Outil", {
          callSessionId,
          timeoutMs: OUTIL_TIMEOUT_MS,
        });
      } else {
        throw fetchError;
      }
    }
  } catch (error) {
    console.error(`[${debugId}] Outil sync exception:`, error);
    ultraLogger.error("OUTIL_SYNC", "Exception sync vers Outil", {
      callSessionId,
      error: error instanceof Error ? error.message : String(error),
    });
    // Non-blocking: don't throw, just log
  }
}

// ====== HELPER POUR ENVOI AUTOMATIQUE DES MESSAGES ======
const sendPaymentNotifications = traceFunction(
  async (callSessionId: string, database: admin.firestore.Firestore) => {
    const debugId = `notif_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

    console.log(`\n`);
    console.log(`=======================================================================`);
    console.log(`[sendPaymentNotifications][${debugId}] ========== START ==========`);
    console.log(`=======================================================================`);
    console.log(`[${debugId}] CallSessionId: ${callSessionId}`);
    console.log(`[${debugId}] Timestamp: ${new Date().toISOString()}`);

    try {
      ultraLogger.info(
        "PAYMENT_NOTIFICATIONS",
        "Envoi des notifications post-paiement",
        { callSessionId, debugId }
      );

      // STEP 1: Fetch call session
      console.log(`\n[${debugId}] STEP 1: Fetching call_sessions document...`);
      const snap = await database
        .collection("call_sessions")
        .doc(callSessionId)
        .get();

      console.log(`[${debugId}] Document exists: ${snap.exists}`);

      if (!snap.exists) {
        console.error(`[${debugId}] CRITICAL: Session ${callSessionId} NOT FOUND!`);
        ultraLogger.warn("PAYMENT_NOTIFICATIONS", "Session introuvable", {
          callSessionId,
          debugId,
        });
        return;
      }

      const cs: any = snap.data();

      // STEP 2: Extract all data for debugging
      console.log(`\n[${debugId}] STEP 2: Extracting session data...`);
      console.log(`[${debugId}] Session status: ${cs?.status}`);
      console.log(`[${debugId}] Session createdAt: ${cs?.createdAt?.toDate?.() || cs?.createdAt}`);

      // P0 FIX: Decrypt phone numbers before sending to notification pipeline
      const providerPhoneRaw =
        cs?.participants?.provider?.phone ?? cs?.providerPhone ?? "";
      const clientPhoneRaw =
        cs?.participants?.client?.phone ?? cs?.clientPhone ?? "";

      // P1-1 FIX: Wrap decryption in try-catch to handle corrupted/invalid encrypted data
      let providerPhone = "";
      let clientPhone = "";
      try {
        providerPhone = providerPhoneRaw ? decryptPhoneNumber(providerPhoneRaw) : "";
      } catch (decryptError) {
        console.error(`[${debugId}] Failed to decrypt provider phone:`, decryptError);
      }
      try {
        clientPhone = clientPhoneRaw ? decryptPhoneNumber(clientPhoneRaw) : "";
      } catch (decryptError) {
        console.error(`[${debugId}] Failed to decrypt client phone:`, decryptError);
      }

      const language = cs?.metadata?.clientLanguages?.[0] ?? "fr";
      const title = cs?.metadata?.title ?? cs?.title ?? "Consultation";

      console.log(`\n[${debugId}] STEP 3: Phone numbers analysis (decrypted):`);
      console.log(`[${debugId}]   providerPhoneRaw encrypted: ${providerPhoneRaw?.startsWith("enc:") || false}`);
      console.log(`[${debugId}]   providerPhone exists: ${!!providerPhone}`);
      console.log(`[${debugId}]   providerPhone preview: ${providerPhone ? providerPhone.slice(0, 5) + "***" : "MISSING"}`);
      console.log(`[${debugId}]   clientPhoneRaw encrypted: ${clientPhoneRaw?.startsWith("enc:") || false}`);
      console.log(`[${debugId}]   clientPhone exists: ${!!clientPhone}`);
      console.log(`[${debugId}]   clientPhone preview: ${clientPhone ? clientPhone.slice(0, 5) + "***" : "MISSING"}`);
      console.log(`[${debugId}]   language: ${language}`);
      console.log(`[${debugId}]   title: ${title}`);

      // P0 FIX: Envoyer des notifications via le pipeline message_events
      const clientId = cs?.participants?.client?.id ?? cs?.clientId ?? "";
      const providerId = cs?.participants?.provider?.id ?? cs?.providerId ?? "";
      const clientEmail = cs?.participants?.client?.email ?? cs?.clientEmail ?? "";
      const providerEmail = cs?.participants?.provider?.email ?? cs?.providerEmail ?? "";
      const scheduledTime = cs?.scheduledAt?.toDate?.() ?? cs?.scheduledAt ?? new Date();

      console.log(`\n[${debugId}] STEP 4: User IDs analysis:`);
      console.log(`[${debugId}]   clientId: ${clientId || "MISSING"}`);
      console.log(`[${debugId}]   providerId: ${providerId || "MISSING"}`);
      console.log(`[${debugId}]   clientEmail: ${clientEmail || "MISSING"}`);
      console.log(`[${debugId}]   providerEmail: ${providerEmail || "MISSING"}`);
      console.log(`[${debugId}]   scheduledTime: ${scheduledTime instanceof Date ? scheduledTime.toISOString() : scheduledTime}`);

      // STEP 5: Create message_events
      console.log(`\n[${debugId}] STEP 5: Creating message_events...`);

      // Notification au client: Appel programme
      if (clientId || clientEmail) {
        console.log(`[${debugId}] Creating CLIENT notification (call.scheduled.client)...`);

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

        console.log(`[${debugId}] Client event data:`, JSON.stringify({
          ...clientEventData,
          createdAt: "serverTimestamp()",
        }, null, 2));

        const clientEventRef = await database.collection("message_events").add(clientEventData);
        console.log(`[${debugId}] Client notification created: ${clientEventRef.id}`);
        ultraLogger.info("PAYMENT_NOTIFICATIONS", "Notification client creee", { callSessionId, clientId, eventDocId: clientEventRef.id, debugId });
      } else {
        console.log(`[${debugId}] SKIPPED client notification - no clientId or clientEmail`);
      }

      // Notification au provider: Appel entrant programme avec details booking
      if (providerId || providerEmail) {
        console.log(`[${debugId}] Creating PROVIDER notification (booking_paid_provider - SMS ENABLED)...`);

        const clientName = cs?.participants?.client?.name ?? cs?.clientName ?? "Client";
        const clientCountry = cs?.clientCurrentCountry ?? cs?.metadata?.clientCountry ?? "N/A";
        const amount = cs?.payment?.amount ?? cs?.metadata?.amount ?? 0;
        const currency = cs?.payment?.currency ?? cs?.currency ?? "EUR";
        const serviceType = cs?.metadata?.serviceType ?? cs?.serviceType ?? "consultation";
        const description = cs?.description ?? `${title} - ${serviceType}`;

        const providerEventData = {
          eventId: "booking_paid_provider",
          locale: language,
          to: {
            uid: providerId || null,
            email: providerEmail || null,
            phone: providerPhone || null,
          },
          context: {
            callSessionId,
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
            title,
            scheduledTime: scheduledTime instanceof Date ? scheduledTime.toISOString() : scheduledTime,
            clientName,
          },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        console.log(`[${debugId}] Provider event data:`, JSON.stringify({
          ...providerEventData,
          createdAt: "serverTimestamp()",
        }, null, 2));

        const providerEventRef = await database.collection("message_events").add(providerEventData);
        console.log(`[${debugId}] Provider notification created: ${providerEventRef.id}`);
        console.log(`[${debugId}]   -> SMS will be sent: "Client: ${clientName} (${clientCountry}) - ${amount}${currency}"`);
        ultraLogger.info("PAYMENT_NOTIFICATIONS", "Notification provider creee (SMS enabled)", { callSessionId, providerId, eventDocId: providerEventRef.id, debugId });
      } else {
        console.log(`[${debugId}] SKIPPED provider notification - no providerId or providerEmail`);
      }

      // STEP 6: Sync to Outil after payment (non-blocking)
      console.log(`\n[${debugId}] STEP 6: Syncing to Outil IA...`);
      await syncCallSessionToOutil(callSessionId, cs, debugId);

      console.log(`\n=======================================================================`);
      console.log(`[sendPaymentNotifications][${debugId}] ========== SUCCESS ==========`);
      console.log(`[${debugId}] Client notified: ${!!(clientId || clientEmail)}`);
      console.log(`[${debugId}] Provider notified: ${!!(providerId || providerEmail)}`);
      console.log(`=======================================================================\n`);

      ultraLogger.info("PAYMENT_NOTIFICATIONS", "Notifications envoyees avec succes", {
        callSessionId,
        debugId,
        clientNotified: !!(clientId || clientEmail),
        providerNotified: !!(providerId || providerEmail),
      });
    } catch (error) {
      console.error(`\n=======================================================================`);
      console.error(`[sendPaymentNotifications][${debugId}] ========== ERROR ==========`);
      console.error(`=======================================================================`);
      console.error(`[${debugId}] CallSessionId: ${callSessionId}`);
      console.error(`[${debugId}] Error type: ${error instanceof Error ? error.constructor.name : typeof error}`);
      console.error(`[${debugId}] Error message: ${error instanceof Error ? error.message : String(error)}`);
      console.error(`[${debugId}] Error stack:`, error instanceof Error ? error.stack : "No stack");
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

// ========================================
// STRIPE EVENT HANDLERS
// ========================================

const handlePaymentIntentSucceeded = traceFunction(
  async (
    paymentIntent: Stripe.PaymentIntent,
    database: admin.firestore.Firestore
  ) => {
    try {
      ultraLogger.info("STRIPE_PAYMENT_SUCCEEDED", "Paiement reussi", {
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
          console.log("Updating payment document");
          const paymentDoc = paymentsSnapshot.docs[0];
          await paymentDoc.ref.update({
            status: "captured",
            currency: paymentIntent.currency ?? "eur",
            capturedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          ultraLogger.info(
            "STRIPE_PAYMENT_SUCCEEDED",
            "Base de donnees mise a jour"
          );
        }
      } catch (paymentUpdateError) {
        console.log(
          "Payment update error (non-critical):",
          paymentUpdateError
        );
      }

      // Find callSessionId with multiple fallbacks
      let callSessionId = paymentIntent.metadata?.callSessionId || "";
      console.log("Call session ID from metadata:", callSessionId);

      // Fallback 1: Search in payments collection
      if (!callSessionId) {
        try {
          console.log("Searching for callSessionId in payments...");
          const snap = await database
            .collection("payments")
            .where("stripePaymentIntentId", "==", paymentIntent.id)
            .limit(1)
            .get();

          if (!snap.empty) {
            const docData = snap.docs[0].data();
            console.log(
              "Full document data:",
              JSON.stringify(docData, null, 2)
            );
            console.log("Available fields:", Object.keys(docData));

            callSessionId = docData?.callSessionId || "";
            console.log("Extracted callSessionId:", callSessionId);
            console.log("Type of callSessionId:", typeof callSessionId);
            console.log("Length of callSessionId:", callSessionId?.length);
          } else {
            console.log(
              "No payment document found for paymentIntentId:",
              paymentIntent.id
            );
          }
        } catch (searchError) {
          console.log("Error searching payments:", searchError);
        }
      }

      if (callSessionId) {
        try {
          console.log("Updating call session:", callSessionId);
          console.log("Call session found, processing...");

          // P0 FIX: Ne plus planifier ici - createAndScheduleCallHTTPS le fait deja
          console.log("[payment_intent.succeeded] Scheduling skipped - handled by createAndScheduleCallHTTPS");

          ultraLogger.info(
            "STRIPE_PAYMENT_SUCCEEDED",
            "Paiement confirme - scheduling deja effectue par createAndScheduleCallHTTPS",
            {
              callSessionId,
              note: "Scheduling moved to createAndScheduleCallHTTPS to avoid duplicates",
            }
          );

          // P0 FIX 2026-01-30: Ne plus envoyer de notifications ici
          console.log("[payment_intent.succeeded] Notifications skipped - handled by createAndScheduleCallHTTPS");
        } catch (notificationError) {
          console.log("Notification processing error:", notificationError);
        }
      } else {
        console.log("No callSessionId available after all fallbacks");
        return false;
      }

      console.log(
        "Payment intent succeeded handling completed successfully"
      );
      return true;
    } catch (succeededError: unknown) {
      console.log(
        "FATAL ERROR in handlePaymentIntentSucceeded:",
        succeededError
      );

      ultraLogger.error(
        "STRIPE_PAYMENT_SUCCEEDED",
        "Erreur traitement paiement reussi",
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
      ultraLogger.warn("STRIPE_PAYMENT_FAILED", "Paiement echoue", {
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
            "Annulation appel programme",
            {
              callSessionId: paymentIntent.metadata.callSessionId,
            }
          );
          const { cancelScheduledCall } = await import("../callScheduler");
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
        "Erreur traitement echec paiement",
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
      ultraLogger.info("STRIPE_PAYMENT_CANCELED", "Paiement annule", {
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
          status: "cancelled",
          currency: paymentIntent.currency ?? "eur",
          cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      if (paymentIntent.metadata?.callSessionId) {
        try {
          ultraLogger.info(
            "STRIPE_PAYMENT_CANCELED",
            "Annulation appel programme",
            {
              callSessionId: paymentIntent.metadata.callSessionId,
            }
          );
          const { cancelScheduledCall } = await import("../callScheduler");
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
 * P1-1 FIX: Gestion complete du 3D Secure (SCA - Strong Customer Authentication)
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
        "Paiement necessite une action (3D Secure)",
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

        await paymentDoc.ref.update({
          status: "requires_action",
          requires3DSecure: true,
          nextActionType: nextActionType || null,
          currency: paymentIntent.currency ?? "eur",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        const callSessionId = paymentData?.callSessionId;
        if (callSessionId) {
          try {
            const sessionRef = database.collection("call_sessions").doc(callSessionId);
            const sessionDoc = await sessionRef.get();

            if (sessionDoc.exists) {
              const sessionData = sessionDoc.data();
              const currentStatus = sessionData?.status;
              const canBlockCall = currentStatus === "pending" || currentStatus === "scheduled";

              if (canBlockCall) {
                await sessionRef.update({
                  status: "awaiting_payment_confirmation",
                  "payment.requires3DSecure": true,
                  "payment.status": "requires_action",
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                console.log(`[3D Secure] Call session ${callSessionId} set to awaiting_payment_confirmation`);
              } else {
                await sessionRef.update({
                  "payment.requires3DSecure": true,
                  "payment.status": "requires_action",
                  "payment.adaptiveAcceptance3DS": true,
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                console.log(`[3D Secure] Call session ${callSessionId} - Adaptive Acceptance 3DS required (call already ${currentStatus})`);
                console.log(`[3D Secure]   Payment status set to requires_action without changing session status`);
              }
            }
          } catch (sessionError) {
            console.error(`[3D Secure] Error updating call session:`, sessionError);
          }
        }

        // P1-1 FIX: Creer une notification pour informer le client
        const clientId = paymentData?.clientId;
        if (clientId) {
          try {
            await database.collection("inapp_notifications").add({
              uid: clientId,
              type: "payment_requires_action",
              title: "Verification de paiement requise",
              body: "Votre banque demande une verification supplementaire. Veuillez completer l'authentification 3D Secure pour finaliser votre paiement.",
              data: {
                paymentIntentId: paymentIntent.id,
                callSessionId: callSessionId || null,
                nextActionType: nextActionType,
              },
              read: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`[3D Secure] Notification sent to client ${clientId}`);
          } catch (notifError) {
            console.error(`[3D Secure] Error sending notification:`, notifError);
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
 * 3D Secure completed - payment ready to be captured
 */
const handlePaymentIntentAmountCapturableUpdated = traceFunction(
  async (
    paymentIntent: Stripe.PaymentIntent,
    database: admin.firestore.Firestore
  ) => {
    const webhookDebugId = `3ds_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    try {
      console.log(`\n${"=".repeat(80)}`);
      console.log(`[${webhookDebugId}] === payment_intent.amount_capturable_updated ===`);
      console.log(`[${webhookDebugId}] PaymentIntent ID: ${paymentIntent.id}`);
      console.log(`[${webhookDebugId}] Status: ${paymentIntent.status}`);
      console.log(`[${webhookDebugId}] Amount: ${paymentIntent.amount} ${paymentIntent.currency}`);
      console.log(`[${webhookDebugId}] Amount capturable: ${paymentIntent.amount_capturable}`);
      console.log(`[${webhookDebugId}] Capture method: ${paymentIntent.capture_method}`);
      console.log(`[${webhookDebugId}] Created: ${new Date(paymentIntent.created * 1000).toISOString()}`);
      console.log(`[${webhookDebugId}] Metadata: ${JSON.stringify(paymentIntent.metadata)}`);
      console.log(`${"=".repeat(80)}\n`);

      ultraLogger.info(
        "STRIPE_AMOUNT_CAPTURABLE_UPDATED",
        "3D Secure complete - Paiement pret a etre capture",
        {
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
          amountCapturable: paymentIntent.amount_capturable,
        }
      );

      // 1. Mettre a jour la collection payments
      const paymentsQuery = database
        .collection("payments")
        .where("stripePaymentIntentId", "==", paymentIntent.id);
      const paymentsSnapshot = await paymentsQuery.get();

      let callSessionId: string | null = null;

      if (!paymentsSnapshot.empty) {
        const paymentDoc = paymentsSnapshot.docs[0];
        const paymentData = paymentDoc.data();
        callSessionId = paymentData?.callSessionId || null;

        await paymentDoc.ref.update({
          status: "authorized",
          requires3DSecure: true,
          threeDSecureCompleted: true,
          amountCapturable: paymentIntent.amount_capturable,
          currency: paymentIntent.currency ?? "eur",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`[3DS_COMPLETE] payments document updated to "authorized"`);
      }

      // 2. Fallback: chercher callSessionId dans les metadata
      if (!callSessionId) {
        callSessionId = paymentIntent.metadata?.callSessionId || null;
        console.log(`[3DS_COMPLETE] callSessionId from metadata: ${callSessionId}`);
      }

      // 3. CRITIQUE: Mettre a jour call_sessions.payment.status = "authorized"
      if (callSessionId) {
        try {
          const sessionRef = database.collection("call_sessions").doc(callSessionId);
          const sessionDoc = await sessionRef.get();

          if (sessionDoc.exists) {
            const sessionData = sessionDoc.data();
            const currentPaymentStatus = sessionData?.payment?.status;
            const currentSessionStatus = sessionData?.status;

            console.log(`[3DS_COMPLETE] Current session status: ${currentSessionStatus}`);
            console.log(`[3DS_COMPLETE] Current payment.status: ${currentPaymentStatus}`);

            const shouldUpdate =
              currentPaymentStatus === "requires_action" ||
              currentSessionStatus === "awaiting_payment_confirmation" ||
              (currentPaymentStatus === "authorized" && !sessionData?.payment?.threeDSecureCompleted);

            if (shouldUpdate) {
              const statusUpdateRequired = currentSessionStatus === "awaiting_payment_confirmation";

              await sessionRef.update({
                ...(statusUpdateRequired ? { status: "scheduled" } : {}),
                "payment.status": "authorized",
                "payment.threeDSecureCompleted": true,
                "payment.authorizedAt": admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });

              console.log(`[3DS_COMPLETE] call_session ${callSessionId} updated:`);
              console.log(`   - status: ${statusUpdateRequired ? "scheduled" : currentSessionStatus} (${statusUpdateRequired ? "changed" : "unchanged"})`);
              console.log(`   - payment.status: authorized`);
              console.log(`   - payment.threeDSecureCompleted: true`);

              ultraLogger.info(
                "STRIPE_AMOUNT_CAPTURABLE_UPDATED",
                "Call session mis a jour apres 3D Secure",
                {
                  callSessionId,
                  previousPaymentStatus: currentPaymentStatus,
                  newPaymentStatus: "authorized",
                  statusChanged: statusUpdateRequired,
                }
              );
            } else {
              console.log(`[3DS_COMPLETE] Session already in correct state - no update needed`);
              console.log(`   - currentPaymentStatus: ${currentPaymentStatus}`);
              console.log(`   - currentSessionStatus: ${currentSessionStatus}`);
              console.log(`   - threeDSecureCompleted: ${sessionData?.payment?.threeDSecureCompleted || false}`);
            }
          } else {
            console.log(`[3DS_COMPLETE] Call session ${callSessionId} not found`);
          }
        } catch (sessionError) {
          console.error(`[3DS_COMPLETE] Error updating call session:`, sessionError);
        }
      } else {
        console.log(`[3DS_COMPLETE] No callSessionId found - cannot update session`);
      }

      return true;
    } catch (error: unknown) {
      console.error(`[3DS_COMPLETE] Error:`, error);
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

      console.log("Transfer details:", {
        id: transfer.id,
        amount: transfer.amount / 100,
        currency: transfer.currency,
        destination: transfer.destination,
        metadata: transfer.metadata,
      });

      let callSessionId = transfer.metadata?.callSessionId || transfer.metadata?.sessionId || "";
      const paymentId = transfer.source_transaction as string || null;

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

      // P1 FIX: Notification au provider pour le paiement recu
      const destinationAccountId = typeof transfer.destination === "string"
        ? transfer.destination
        : transfer.destination?.id;

      if (destinationAccountId) {
        const providerQuery = await database.collection("users")
          .where("stripeAccountId", "==", destinationAccountId)
          .limit(1)
          .get();

        if (!providerQuery.empty) {
          const providerId = providerQuery.docs[0].id;
          const providerData = providerQuery.docs[0].data();
          const amountFormatted = (transfer.amount / 100).toFixed(2);
          const currencySymbol = transfer.currency === "eur" ? "\u20ac" : "$";

          await database.collection("inapp_notifications").add({
            uid: providerId,
            type: "payout_received",
            title: "Paiement recu",
            message: `Vous avez recu ${amountFormatted}${currencySymbol} pour votre consultation.`,
            amount: transfer.amount / 100,
            currency: transfer.currency,
            transferId: transfer.id,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

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

      console.log("Transfer reversed:", {
        id: transfer.id,
        amountOriginal: transfer.amount / 100,
        amountReversed: transfer.amount_reversed / 100,
        fullyReversed: transfer.reversed,
      });

      const transferDoc = await database.collection("transfers").doc(transfer.id).get();

      let callSessionId = "";
      if (transferDoc.exists) {
        const transferData = transferDoc.data();
        callSessionId = transferData?.callSessionId || transferData?.metadata?.callSessionId || "";
      }

      if (!callSessionId) {
        callSessionId = transfer.metadata?.callSessionId || transfer.metadata?.sessionId || "";
      }

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

      console.log("Transfer failed:", {
        id: transfer.id,
        amount: transfer.amount / 100,
        destination: transfer.destination,
      });

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
          const { UnclaimedFundsManager, UNCLAIMED_FUNDS_CONFIG } = await import("../UnclaimedFundsManager");
          const manager = new UnclaimedFundsManager(database);

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
            console.log("Unclaimed fund registered for failed transfer:", transfer.id);
          }
        } catch (unclaimedError) {
          console.error("Failed to register unclaimed fund:", unclaimedError);
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
// MAIN STRIPE WEBHOOK EXPORT
// ========================================

// @ts-ignore - Type compatibility issue between firebase-functions and express types
export const stripeWebhook = onRequest(
  {
    region: "europe-west3", // Coherence avec createPaymentIntent (payments en west3)
    invoker: "public", // P0 CRITICAL FIX: Allow unauthenticated access for Stripe webhooks
    memory: "512MiB",
    cpu: 0.083,
    secrets: [
      STRIPE_SECRET_KEY_TEST,
      STRIPE_SECRET_KEY_LIVE,
      STRIPE_WEBHOOK_SECRET_TEST,
      STRIPE_WEBHOOK_SECRET_LIVE,
      STRIPE_CONNECT_WEBHOOK_SECRET_TEST,
      STRIPE_CONNECT_WEBHOOK_SECRET_LIVE,
      ENCRYPTION_KEY,
      OUTIL_SYNC_API_KEY,
      META_CAPI_TOKEN,
    ],
    concurrency: 1,
    timeoutSeconds: 120, // P1-2 FIX 2026-02-23: 60->120s
    minInstances: 1, // P0 FIX 2026-02-23: Restored to 1
    maxInstances: 5,
  },
  // @ts-ignore - Type compatibility issue between firebase-functions and express types
  wrapHttpFunction(
    "stripeWebhook",
    async (req: FirebaseRequest, res: Response) => {
      // STEP 1: Log webhook start
      console.log("STRIPE WEBHOOK START");
      console.log("Request method:", req.method);
      console.log("Content-Type:", req.headers["content-type"]);
      console.log("Stripe mode:", isLive() ? "live" : "test");

      const signature = req.headers["stripe-signature"];
      console.log("Stripe signature present:", !!signature);

      if (!signature) {
        console.log("STRIPE WEBHOOK ERROR: Missing signature");
        res.status(400).send("Missing signature");
        return;
      }

      const stripeInstance = getStripe();
      if (!stripeInstance) {
        console.log("STRIPE WEBHOOK ERROR: Stripe not configured");
        res.status(500).send("Stripe not configured");
        return;
      }

      try {
        console.log("Initializing Firebase...");
        const database = initializeFirebase();
        console.log("Firebase initialized successfully");

        // STEP 2: Raw body processing
        let rawBodyBuffer: Buffer;
        if ((req as any).rawBody && Buffer.isBuffer((req as any).rawBody)) {
          rawBodyBuffer = (req as any).rawBody;
          console.log("Using direct rawBody buffer");
        } else {
          console.log("No usable raw body");
          res.status(400).send("No raw body");
          return;
        }

        console.log("Raw body length:", rawBodyBuffer.length);
        console.log(
          "Raw body preview:",
          rawBodyBuffer.slice(0, 100).toString("utf8")
        );

        // STEP 3: Validate webhook secret
        let webhookSecret: string;
        try {
          webhookSecret = getStripeWebhookSecret();

          if (!webhookSecret || !webhookSecret.startsWith("whsec_")) {
            console.error("Invalid webhook secret format");
            res.status(500).send("Invalid webhook secret configuration");
            return;
          }
          console.log("Webhook secret format validated");
        } catch (secretError) {
          console.log("Secret retrieval error");
          res.status(500).send("Secret configuration error");
          return;
        }

        if (webhookSecret.length === 0) {
          console.log("Secret is empty!");
          res.status(500).send("Webhook secret not set");
          return;
        }

        // STEP 4: Construct Stripe event (try both secrets: regular + Connect)
        console.log("Constructing Stripe event...");

        const bodyString = rawBodyBuffer.toString("utf8");
        console.log("Body string length:", bodyString.length);
        console.log("Verifying webhook signature...");

        let event: Stripe.Event | null = null;
        let lastError: Error | null = null;

        // Attempt 1: Regular webhook secret
        try {
          event = stripeInstance.webhooks.constructEvent(
            bodyString,
            signature,
            webhookSecret
          );
          console.log("SUCCESS with regular webhook secret");
        } catch (error1) {
          console.log("Regular webhook secret failed, trying Connect secret...");
          lastError = error1 as Error;

          // Attempt 2: Connect webhook secret
          const connectWebhookSecret = getStripeConnectWebhookSecret();
          if (connectWebhookSecret && connectWebhookSecret.startsWith("whsec_")) {
            try {
              event = stripeInstance.webhooks.constructEvent(
                bodyString,
                signature,
                connectWebhookSecret
              );
              console.log("SUCCESS with Connect webhook secret");
            } catch (error2) {
              console.log("Connect webhook secret also failed");
              lastError = error2 as Error;
            }
          }
        }

        if (!event) {
          console.log("CONSTRUCT ERROR: Both secrets failed");
          console.log(
            "Error message:",
            lastError?.message || "Unknown error"
          );
          res
            .status(400)
            .send(
              `Webhook Error: ${lastError?.message || "Signature verification failed"}`
            );
          return;
        }

        console.log("Event constructed:", event.type);
        console.log("Event ID:", event.id);

        // STEP 5: Process the event
        const objectId = (() => {
          try {
            return (event.data.object as any)?.id || "unknown";
          } catch (e) {
            return "extraction_failed";
          }
        })();

        console.log("Processing event type:", event.type);
        console.log("Object ID:", objectId);

        ultraLogger.info("STRIPE_WEBHOOK_EVENT", "Evenement Stripe valide", {
          eventType: event.type,
          eventId: event.id,
          objectId,
        });

        // P0 SECURITY FIX: Idempotency check
        const webhookEventRef = database.collection("processed_webhook_events").doc(event.id);
        const existingEvent = await webhookEventRef.get();

        if (existingEvent.exists) {
          const existingStatus = existingEvent.data()?.status;
          if (existingStatus === "completed") {
            console.log(`IDEMPOTENCY: Event ${event.id} already completed, skipping`);
            res.status(200).json({ received: true, duplicate: true, eventId: event.id });
            return;
          }
          console.log(`IDEMPOTENCY: Event ${event.id} status="${existingStatus}" - allowing re-processing`);
        }

        // Mark event as being processed
        await webhookEventRef.set({
          eventId: event.id,
          eventType: event.type,
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
          status: "processing",
          objectId,
          expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });

        // STEP 6: Event processing
        try {
          switch (event.type) {
            case "payment_intent.created":
              console.log("Processing payment_intent.created");
              {
                const piCreated = event.data.object as Stripe.PaymentIntent;
                console.log("Amount:", piCreated.amount);
                console.log("Currency:", piCreated.currency);
                console.log("Status:", piCreated.status);
              }
              break;

            case "payment_intent.processing":
              console.log("Processing payment_intent.processing");
              break;

            case "payment_intent.requires_action":
              console.log("Processing payment_intent.requires_action");
              await handlePaymentIntentRequiresAction(
                event.data.object as Stripe.PaymentIntent,
                database
              );
              console.log("Handled payment_intent.requires_action");
              break;

            case "payment_intent.amount_capturable_updated":
              console.log("Processing payment_intent.amount_capturable_updated (3D Secure completed)");
              await handlePaymentIntentAmountCapturableUpdated(
                event.data.object as Stripe.PaymentIntent,
                database
              );
              console.log("Handled payment_intent.amount_capturable_updated");
              break;

            case "checkout.session.completed":
              console.log("Processing checkout.session.completed");
              {
                const cs = event.data.object as Stripe.Checkout.Session;
                console.log("Session ID:", cs.id);
                console.log("Payment status:", cs.payment_status);
                console.log("Metadata:", cs.metadata);

                const callSessionId =
                  cs.metadata?.callSessionId || cs.metadata?.sessionId;
                console.log("Call session ID:", callSessionId);

                if (callSessionId) {
                  console.log("Updating database...");
                  // P0 FIX: Ne plus planifier ici - createAndScheduleCallHTTPS le fait deja
                  console.log("[checkout.session.completed] Scheduling skipped - handled by createAndScheduleCallHTTPS");
                  // P0 FIX 2026-01-30: Ne plus envoyer de notifications ici
                  console.log("[checkout.session.completed] Notifications skipped - handled by createAndScheduleCallHTTPS");
                  console.log("Checkout processing complete");
                }
              }
              break;

            case "payment_intent.succeeded":
              console.log("Processing payment_intent.succeeded");
              {
                const paymentIntentData = event.data.object as Stripe.PaymentIntent;

                // Track via Meta Conversions API (CAPI) for Facebook Ads attribution
                try {
                  const capiResult = await trackStripePurchase(paymentIntentData, {
                    serviceType: paymentIntentData.metadata?.serviceType,
                    providerType: paymentIntentData.metadata?.providerType,
                    contentName: `SOS-Expat ${paymentIntentData.metadata?.serviceType || "Service"}`,
                    eventSourceUrl: "https://sos-expat.com",
                    eventId: paymentIntentData.metadata?.pixelEventId,
                  });

                  if (capiResult.success) {
                    console.log("[CAPI] Purchase tracked successfully", {
                      event_id: capiResult.eventId,
                      events_received: capiResult.eventsReceived,
                    });
                  } else {
                    console.warn("[CAPI] Failed to track purchase", {
                      error: capiResult.error,
                      event_id: capiResult.eventId,
                    });
                  }
                } catch (capiError) {
                  console.error("[CAPI] Exception tracking purchase:", capiError);
                }

                await handlePaymentIntentSucceeded(paymentIntentData, database);
              }
              break;

            case "payment_intent.payment_failed":
              console.log("Processing payment_intent.payment_failed");
              await handlePaymentIntentFailed(
                event.data.object as Stripe.PaymentIntent,
                database
              );
              break;

            case "payment_intent.canceled":
              console.log("Processing payment_intent.canceled");
              await handlePaymentIntentCanceled(
                event.data.object as Stripe.PaymentIntent,
                database
              );
              break;

            case "charge.refunded":
              console.log("Processing charge.refunded");
              {
                const charge = event.data.object as Stripe.Charge;
                const refunds = charge.refunds?.data || [];

                for (const refund of refunds) {
                  const existingRefund = await database.collection("refunds").doc(refund.id).get();

                  if (!existingRefund.exists) {
                    const paymentQuery = await database.collection("payments")
                      .where("stripeChargeId", "==", charge.id)
                      .limit(1)
                      .get();

                    let paymentData: any = null;
                    if (!paymentQuery.empty) {
                      paymentData = paymentQuery.docs[0].data();
                    }

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

                    console.log(`Refund ${refund.id} recorded from webhook`);
                  }
                }

                // Creer une notification pour le client
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
                        title: "Remboursement effectue",
                        message: `Votre remboursement de ${(charge.amount_refunded / 100).toFixed(2)} ${charge.currency.toUpperCase()} a ete traite.`,
                        read: false,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                      });
                    }
                  }
                }

                // Cancel ALL affiliate commissions for this refund (5 systems)
                if (charge.payment_intent) {
                  const refundPaymentDoc = await database.collection("payments")
                    .doc(charge.payment_intent as string)
                    .get();
                  const sessionId = refundPaymentDoc.data()?.callSessionId;
                  if (sessionId) {
                    try {
                      const { cancelCommissionsForCallSession: cancelChatter } = await import("../chatter/services/chatterCommissionService");
                      const { cancelCommissionsForCallSession: cancelInfluencer } = await import("../influencer/services/influencerCommissionService");
                      const { cancelBloggerCommissionsForCallSession: cancelBlogger } = await import("../blogger/services/bloggerCommissionService");
                      const { cancelCommissionsForCallSession: cancelGroupAdmin } = await import("../groupAdmin/services/groupAdminCommissionService");
                      const { cancelCommissionsForCallSession: cancelAffiliate } = await import("../affiliate/services/commissionService");

                      const cancelReason = `Stripe Dashboard refund: ${charge.id}`;
                      const results = await Promise.allSettled([
                        cancelChatter(sessionId, cancelReason, "system_refund"),
                        cancelInfluencer(sessionId, cancelReason, "system_refund"),
                        cancelBlogger(sessionId, cancelReason, "system_refund"),
                        cancelGroupAdmin(sessionId, cancelReason),
                        cancelAffiliate(sessionId, cancelReason, "system_refund"),
                      ]);

                      const labels = ["chatter", "influencer", "blogger", "groupAdmin", "affiliate"] as const;
                      let totalCancelled = 0;
                      for (let i = 0; i < results.length; i++) {
                        const r = results[i];
                        if (r.status === "fulfilled") {
                          totalCancelled += r.value.cancelledCount;
                        } else {
                          console.error(`[charge.refunded] Failed to cancel ${labels[i]} commissions:`, r.reason);
                        }
                      }
                      console.log(`[charge.refunded] Cancelled ${totalCancelled} commissions for session ${sessionId}`);
                    } catch (commissionError) {
                      console.error("[charge.refunded] Failed to cancel commissions:", commissionError);
                    }
                  }
                }
              }
              console.log("Handled charge.refunded");
              break;

            // P0 FIX: Handle charge.captured for syncing captures made via Stripe Dashboard
            case "charge.captured":
              console.log("Processing charge.captured");
              {
                const charge = event.data.object as Stripe.Charge;
                const paymentIntentId = charge.payment_intent as string;

                if (paymentIntentId) {
                  const paymentRef = database.collection("payments").doc(paymentIntentId);
                  const paymentDoc = await paymentRef.get();

                  if (paymentDoc.exists) {
                    const paymentData = paymentDoc.data();

                    if (paymentData?.status !== "captured" && paymentData?.status !== "succeeded") {
                      await paymentRef.update({
                        status: "captured",
                        stripeChargeId: charge.id,
                        capturedAmount: charge.amount_captured,
                        capturedAt: admin.firestore.FieldValue.serverTimestamp(),
                        capturedVia: "stripe_webhook",
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                      });

                      console.log(`Payment ${paymentIntentId} marked as captured via webhook`);

                      if (paymentData?.callSessionId) {
                        await database.collection("call_sessions").doc(paymentData.callSessionId).update({
                          "payment.status": "captured",
                          "payment.capturedAt": admin.firestore.FieldValue.serverTimestamp(),
                          "isPaid": true,
                          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        });
                      }
                    }
                  } else {
                    console.log(`No payment doc found for ${paymentIntentId}, creating from webhook`);
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
              console.log("Handled charge.captured");
              break;

            case "refund.updated":
              console.log("Processing refund.updated");
              {
                const refund = event.data.object as Stripe.Refund;

                await database.collection("refunds").doc(refund.id).set({
                  status: refund.status,
                  failureReason: refund.failure_reason || null,
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });

                if (refund.status === "failed") {
                  await database.collection("admin_alerts").add({
                    type: "refund_failed",
                    priority: "high",
                    title: "Remboursement echoue",
                    message: `Le remboursement ${refund.id} a echoue. Raison: ${refund.failure_reason || "inconnue"}`,
                    refundId: refund.id,
                    read: false,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                  });
                }
              }
              console.log("Handled refund.updated");
              break;

            // ====== DISPUTE EVENTS (Chargebacks) ======
            case "charge.dispute.created":
              console.log("Processing charge.dispute.created");
              await handleDisputeCreated(
                event.data.object as Stripe.Dispute,
                database,
                stripeInstance
              );
              console.log("Handled charge.dispute.created");
              break;

            case "charge.dispute.updated":
              console.log("Processing charge.dispute.updated");
              await handleDisputeUpdated(
                event.data.object as Stripe.Dispute,
                database,
                stripeInstance
              );
              console.log("Handled charge.dispute.updated");
              break;

            case "charge.dispute.closed":
              console.log("Processing charge.dispute.closed");
              await handleDisputeClosed(
                event.data.object as Stripe.Dispute,
                database,
                stripeInstance
              );
              console.log("Handled charge.dispute.closed");
              break;

            case "account.updated": {
              console.log("Processing account.updated (Stripe Connect)");
              const account = event.data.object as Stripe.Account;

              const providersSnapshot = await database
                .collection("users")
                .where("stripeAccountId", "==", account.id)
                .limit(1)
                .get();

              if (!providersSnapshot.empty) {
                const providerDoc = providersSnapshot.docs[0];
                const providerData = providerDoc.data();

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

                if (newKycStatus !== providerData.kycStatus) {
                  updateData.kycStatus = newKycStatus;

                  if (newKycStatus === "completed") {
                    await database.collection("inapp_notifications").add({
                      uid: providerDoc.id,
                      type: "kyc_completed",
                      title: "Verification complete",
                      message: "Votre compte est entierement verifie. Vous pouvez maintenant recevoir des virements.",
                      read: false,
                      createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                  }
                }

                await providerDoc.ref.update(updateData);
                console.log(`Updated provider ${providerDoc.id} KYC status: ${newKycStatus}`);

                // DEFERRED TRANSFER PROCESSING
                const wasChargesEnabled = providerData.stripeAccountStatus?.chargesEnabled || providerData.chargesEnabled;

                if (chargesEnabled && !wasChargesEnabled) {
                  console.log(`Provider ${providerDoc.id} just enabled charges - processing pending transfers`);

                  try {
                    const transferResult = await processPendingTransfersForProvider(
                      providerDoc.id,
                      account.id,
                      database
                    );

                    console.log(`Pending transfers processed for ${providerDoc.id}:`, {
                      processed: transferResult.processed,
                      succeeded: transferResult.succeeded,
                      failed: transferResult.failed,
                    });

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
                    console.error(`Error processing pending transfers for ${providerDoc.id}:`, transferError);

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
                console.log(`No provider found for Stripe account: ${account.id}`);
              }
              break;
            }

            case "account.application.authorized": {
              console.log(
                "[ACCOUNT.APPLICATION.AUTHORIZED] User authorized your platform"
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
                "[ACCOUNT.APPLICATION.DEAUTHORIZED] User disconnected account"
              );
              const deauthorizedApp = event.data.object as { account?: string; id?: string };
              const deauthorizedAccountId = deauthorizedApp.account || deauthorizedApp.id;

              if (!deauthorizedAccountId) {
                console.log("No account ID found in deauthorized event");
                break;
              }

              const deauthProvidersSnapshot = await database
                .collection("users")
                .where("stripeAccountId", "==", deauthorizedAccountId)
                .limit(1)
                .get();

              if (!deauthProvidersSnapshot.empty) {
                const providerDoc = deauthProvidersSnapshot.docs[0];

                await providerDoc.ref.update({
                  "stripeAccountStatus.deauthorized": true,
                  "stripeAccountStatus.deauthorizedAt": admin.firestore.FieldValue.serverTimestamp(),
                  "stripeAccountStatus.chargesEnabled": false,
                  "stripeAccountStatus.payoutsEnabled": false,
                  kycStatus: "disconnected",
                  isOnline: false,
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                await database.collection("inapp_notifications").add({
                  uid: providerDoc.id,
                  type: "account_disconnected",
                  title: "Compte Stripe deconnecte",
                  message: "Votre compte Stripe a ete deconnecte. Veuillez le reconfigurer pour recevoir des paiements.",
                  read: false,
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                await database.collection("admin_alerts").add({
                  type: "stripe_account_deauthorized",
                  severity: "medium",
                  providerId: providerDoc.id,
                  stripeAccountId: deauthorizedAccountId,
                  message: `Le provider ${providerDoc.id} a deconnecte son compte Stripe`,
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                  resolved: false,
                });

                console.log(`Disabled provider ${providerDoc.id} after Stripe deauthorization`);
              } else {
                console.log(`No provider found for deauthorized Stripe account: ${deauthorizedAccountId}`);
              }
              break;
            }

            case "account.external_account.created":
              console.log(
                "[ACCOUNT.EXTERNAL_ACCOUNT.CREATED] Bank account added"
              );
              {
                const externalAccount = event.data.object as any;
                console.log("External account details:", {
                  accountId: externalAccount.account,
                  type: externalAccount.object,
                  last4: externalAccount.last4,
                  bankName: externalAccount.bank_name,
                  country: externalAccount.country,
                });
              }
              break;

            case "account.external_account.updated": {
              console.log(
                "[ACCOUNT.EXTERNAL_ACCOUNT.UPDATED] Bank account updated"
              );
              const updatedExternalAccount = event.data.object as any;
              console.log("Updated external account:", {
                accountId: updatedExternalAccount.account,
                last4: updatedExternalAccount.last4,
              });
              break;
            }

            // ====== SUBSCRIPTION EVENTS (IA Tool Subscriptions) ======
            case "customer.subscription.created":
              console.log("Processing customer.subscription.created (IA Subscription)");
              try {
                await handleSubscriptionCreated(
                  event.data.object as Stripe.Subscription,
                  { eventId: event.id, eventType: event.type }
                );
                console.log("Handled customer.subscription.created");
              } catch (subError) {
                console.error("Error in handleSubscriptionCreated:", subError);
                await addToDeadLetterQueue(event, subError as Error, { handler: "handleSubscriptionCreated" });
                throw subError;
              }
              break;

            case "customer.subscription.updated":
              console.log("Processing customer.subscription.updated (IA Subscription)");
              try {
                await handleSubscriptionUpdated(
                  event.data.object as Stripe.Subscription,
                  { eventId: event.id, eventType: event.type }
                );
                console.log("Handled customer.subscription.updated");
              } catch (subError) {
                console.error("Error in handleSubscriptionUpdated:", subError);
                await addToDeadLetterQueue(event, subError as Error, { handler: "handleSubscriptionUpdated" });
                throw subError;
              }
              break;

            case "customer.subscription.deleted":
              console.log("Processing customer.subscription.deleted (IA Subscription)");
              try {
                await handleSubscriptionDeleted(
                  event.data.object as Stripe.Subscription,
                  { eventId: event.id, eventType: event.type }
                );
                console.log("Handled customer.subscription.deleted");
              } catch (subError) {
                console.error("Error in handleSubscriptionDeleted:", subError);
                await addToDeadLetterQueue(event, subError as Error, { handler: "handleSubscriptionDeleted" });
                throw subError;
              }
              break;

            case "customer.subscription.trial_will_end":
              console.log("Processing customer.subscription.trial_will_end");
              try {
                await handleTrialWillEnd(
                  event.data.object as Stripe.Subscription,
                  { eventId: event.id, eventType: event.type }
                );
                console.log("Handled customer.subscription.trial_will_end");
              } catch (subError) {
                console.error("Error in handleTrialWillEnd:", subError);
                await addToDeadLetterQueue(event, subError as Error, { handler: "handleTrialWillEnd" });
                throw subError;
              }
              break;

            case "customer.subscription.paused":
              console.log("Processing customer.subscription.paused");
              try {
                await handleSubscriptionPaused(
                  event.data.object as Stripe.Subscription,
                  { eventId: event.id, eventType: event.type }
                );
                console.log("Handled customer.subscription.paused");
              } catch (subError) {
                console.error("Error in handleSubscriptionPaused:", subError);
                await addToDeadLetterQueue(event, subError as Error, { handler: "handleSubscriptionPaused" });
                throw subError;
              }
              break;

            case "customer.subscription.resumed":
              console.log("Processing customer.subscription.resumed");
              try {
                await handleSubscriptionResumed(
                  event.data.object as Stripe.Subscription,
                  { eventId: event.id, eventType: event.type }
                );
                console.log("Handled customer.subscription.resumed");
              } catch (subError) {
                console.error("Error in handleSubscriptionResumed:", subError);
                await addToDeadLetterQueue(event, subError as Error, { handler: "handleSubscriptionResumed" });
                throw subError;
              }
              break;

            case "invoice.created":
              console.log("Processing invoice.created (Subscription)");
              try {
                await handleInvoiceCreated(
                  event.data.object as Stripe.Invoice,
                  { eventId: event.id, eventType: event.type }
                );
                console.log("Handled invoice.created");
              } catch (subError) {
                console.error("Error in handleInvoiceCreated:", subError);
                await addToDeadLetterQueue(event, subError as Error, { handler: "handleInvoiceCreated" });
                throw subError;
              }
              break;

            case "invoice.paid":
              console.log("Processing invoice.paid (Subscription)");
              try {
                await handleInvoicePaid(
                  event.data.object as Stripe.Invoice,
                  { eventId: event.id, eventType: event.type }
                );
                console.log("Handled invoice.paid");
              } catch (subError) {
                console.error("Error in handleInvoicePaid:", subError);
                await addToDeadLetterQueue(event, subError as Error, { handler: "handleInvoicePaid" });
                throw subError;
              }
              break;

            case "invoice.payment_failed":
              console.log("Processing invoice.payment_failed (Subscription)");
              try {
                await handleInvoicePaymentFailed(
                  event.data.object as Stripe.Invoice,
                  { eventId: event.id, eventType: event.type }
                );
                console.log("Handled invoice.payment_failed");
              } catch (subError) {
                console.error("Error in handleInvoicePaymentFailed:", subError);
                await addToDeadLetterQueue(event, subError as Error, { handler: "handleInvoicePaymentFailed" });
                throw subError;
              }
              break;

            case "invoice.payment_action_required":
              console.log("Processing invoice.payment_action_required (3D Secure)");
              try {
                await handleInvoicePaymentActionRequired(
                  event.data.object as Stripe.Invoice,
                  { eventId: event.id, eventType: event.type }
                );
                console.log("Handled invoice.payment_action_required");
              } catch (subError) {
                console.error("Error in handleInvoicePaymentActionRequired:", subError);
                await addToDeadLetterQueue(event, subError as Error, { handler: "handleInvoicePaymentActionRequired" });
                throw subError;
              }
              break;

            case "payment_method.attached":
            case "payment_method.updated":
              console.log(`Processing ${event.type}`);
              try {
                await handlePaymentMethodUpdated(
                  event.data.object as Stripe.PaymentMethod,
                  { eventId: event.id, eventType: event.type }
                );
                console.log(`Handled ${event.type}`);
              } catch (subError) {
                console.error(`Error in handlePaymentMethodUpdated:`, subError);
                await addToDeadLetterQueue(event, subError as Error, { handler: "handlePaymentMethodUpdated" });
                throw subError;
              }
              break;

            default:
              // TRANSFER EVENTS (Destination Charges)
              if (event.type === "transfer.created") {
                console.log("Processing transfer.created (Destination Charges)");
                await handleTransferCreated(
                  event.data.object as Stripe.Transfer,
                  database
                );
              } else if (event.type === "transfer.reversed") {
                console.log("Processing transfer.reversed");
                await handleTransferReversed(
                  event.data.object as Stripe.Transfer,
                  database
                );
              } else if ((event.type as string) === "transfer.failed") {
                console.log("Processing transfer.failed");
                await handleTransferFailed(
                  (event.data as { object: Stripe.Transfer }).object,
                  database
                );
              } else if ((event.type as string).startsWith("transfer.")) {
                console.log("Unhandled transfer event:", event.type);
              } else {
                console.log("Unhandled event type:", event.type);
              }
          }

          console.log("WEBHOOK SUCCESS");

          // Mark event as successfully processed
          await webhookEventRef.update({
            status: "completed",
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          ultraLogger.info(
            "STRIPE_WEBHOOK_SUCCESS",
            "Webhook traite avec succes",
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
          console.log("EVENT HANDLER ERROR:", eventHandlerError);

          // Mark event as failed but processed
          await webhookEventRef.update({
            status: "failed",
            failedAt: admin.firestore.FieldValue.serverTimestamp(),
            error: eventHandlerError instanceof Error
              ? eventHandlerError.message
              : String(eventHandlerError),
          });

          ultraLogger.error(
            "STRIPE_WEBHOOK_HANDLER",
            "Erreur dans le gestionnaire d'evenements",
            {
              eventType: event.type,
              eventId: event.id,
              error:
                eventHandlerError instanceof Error
                  ? eventHandlerError.message
                  : String(eventHandlerError),
            }
          );

          // P0 FIX: Return 500 so Stripe retries transient failures
          res.status(500).json({
            received: true,
            eventId: event.id,
            handlerError:
              eventHandlerError instanceof Error
                ? eventHandlerError.message
                : "Unknown handler error",
          });
        }
      } catch (error) {
        console.log("FATAL ERROR:", error);

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
