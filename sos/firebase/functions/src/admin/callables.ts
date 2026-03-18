// firebase/functions/src/admin/callables.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";
import { ALLOWED_ORIGINS } from "../lib/functionConfigs";

// CRITICAL: Lazy initialization to avoid deployment timeout
const IS_DEPLOYMENT_ANALYSIS =
  !process.env.K_REVISION &&
  !process.env.K_SERVICE &&
  !process.env.FUNCTION_TARGET &&
  !process.env.FUNCTIONS_EMULATOR;

function ensureInitialized() {
  if (!IS_DEPLOYMENT_ANALYSIS && !getApps().length) {
    initializeApp();
  }
}

// Helper that ensures initialization before getting Firestore
function getDb() {
  ensureInitialized();
  return getFirestore();
}

/** Autorise UNIQUEMENT les comptes admin (claim admin:true OU role:'admin') */
function assertAdmin(ctx: any) {
  const uid = ctx?.auth?.uid;
  const claims = ctx?.auth?.token;
  if (!uid) throw new HttpsError("unauthenticated", "Auth requise.");
  const isAdmin = claims?.admin === true || claims?.role === 'admin';
  if (!isAdmin) throw new HttpsError("permission-denied", "Réservé aux admins.");
}

/** 1) LISTE les IDs d'événements pour un locale donné */
export const admin_templates_list = onCall({
    region: "europe-west1",
    cors: ALLOWED_ORIGINS,
    memory: "256MiB",
    cpu: 0.1,
    minInstances: 0,
    timeoutSeconds: 60
  }, async (req) => {
  assertAdmin(req);
  const { locale } = req.data || {};
  if (!locale || !["fr-FR", "en"].includes(locale)) {
    throw new HttpsError("invalid-argument", "locale doit être 'fr-FR' ou 'en'.");
  }
  const db = getDb();
  const snap = await db.collection(`message_templates/${locale}/items`).select().get();
  const eventIds = snap.docs.map((d) => d.id).sort();
  return { eventIds };
});

/** 2) GET: récupère un template pour (locale, eventId) */
export const admin_templates_get = onCall({
    region: "europe-west1",
    cors: ALLOWED_ORIGINS,
    memory: "256MiB",
    cpu: 0.1,
    minInstances: 0,
    timeoutSeconds: 60
  }, async (req) => {
  assertAdmin(req);
  const { locale, eventId } = req.data || {};
  if (!locale || !eventId) {
    throw new HttpsError("invalid-argument", "locale et eventId sont requis.");
  }
  const db = getDb();
  const ref = db.doc(`message_templates/${locale}/items/${eventId}`);
  const doc = await ref.get();
  if (!doc.exists) return { exists: false };
  return { exists: true, data: doc.data() };
});

/** Types simples pour valider grossièrement le payload */
type EmailTpl = { subject: string; html: string; text?: string };
type SmsTpl = { text: string };
type PushTpl = { title: string; body: string; deeplink?: string };
type TemplatePayload = { email?: EmailTpl; sms?: SmsTpl; push?: PushTpl };

/** 3) UPSERT: crée/merge un template (locale, eventId) */
export const admin_templates_upsert = onCall({
    region: "europe-west1",
    cors: ALLOWED_ORIGINS,
    memory: "256MiB",
    cpu: 0.1,
    minInstances: 0,
    timeoutSeconds: 60
  }, async (req) => {
  assertAdmin(req);
  const { locale, eventId, payload } = req.data || {};
  if (!locale || !eventId || !payload) {
    throw new HttpsError("invalid-argument", "locale, eventId, payload requis.");
  }
  if (payload.email && (!payload.email.subject || !payload.email.html)) {
    throw new HttpsError(
      "invalid-argument",
      "email.subject et email.html sont requis quand email est fourni."
    );
  }
  const db = getDb();
  const ref = db.doc(`message_templates/${locale}/items/${eventId}`);
  await ref.set(payload as TemplatePayload, { merge: true });
  return { ok: true };
});

/** 4) ROUTING GET: lit le doc unique message_routing/config */
export const admin_routing_get = onCall({
    region: "europe-west1",
    cors: ALLOWED_ORIGINS,
    memory: "256MiB",
    cpu: 0.1,
    minInstances: 0,
    timeoutSeconds: 60
  }, async (req) => {
  assertAdmin(req);
  const db = getDb();
  const ref = db.doc("message_routing/config");
  const doc = await ref.get();
  if (!doc.exists) return { exists: false, data: { events: {} } };
  return { exists: true, data: doc.data() };
});

/** Définition d'une entrée de routing */
type RoutingEntry = {
  channels: ("email" | "sms" | "push" | "whatsapp" | "inapp")[];
  rate_limit_h?: number;
  delays?: Record<string, number>; // ex: { email: 0, sms: 15 }
};

/** 5) ROUTING UPSERT: merge une entrée de routing pour un eventId */
export const admin_routing_upsert = onCall({
    region: "europe-west1",
    memory: "256MiB",
    cpu: 0.1,
    minInstances: 0,
    timeoutSeconds: 60
  }, async (req) => {
  assertAdmin(req);
  const { eventId, channels, rate_limit_h, delays } = req.data || {};
  if (!eventId || !Array.isArray(channels) || channels.length === 0) {
    throw new HttpsError("invalid-argument", "eventId et channels (non vide) requis.");
  }
  const entry: RoutingEntry = {
    channels,
    rate_limit_h: Number(rate_limit_h) || 0,
    delays: delays || {}};
  const db = getDb();
  await db.doc("message_routing/config").set({ events: { [eventId]: entry } }, { merge: true });
  return { ok: true };
});

/** 6) TEST SEND: crée un doc message_events de test que le worker va traiter */
export const admin_testSend = onCall({
    region: "europe-west1",
    memory: "256MiB",
    cpu: 0.1,
    minInstances: 0,
    timeoutSeconds: 60
  }, async (req) => {
  assertAdmin(req);
  const { locale, eventId, to, context } = req.data || {};
  if (!eventId) throw new HttpsError("invalid-argument", "eventId requis.");
  const loc = (locale && String(locale).toLowerCase().startsWith("fr")) ? "fr-FR" : "en";

  // Construit un contexte minimal avec l'email destination attendu par le provider email
  const ctx = {
    ...context,
    user: {
      email: to || context?.user?.email || "test@example.com",
      preferredLanguage: loc,
      ...context?.user}};

  const db = getDb();
  await db.collection("message_events").add({
    eventId,
    uid: context?.uid || "ADMIN_TEST",
    locale: loc,
    context: ctx,
    createdAt: new Date().toISOString(),
    source: "admin_testSend"});
  return { ok: true };
});

// ---- SEED DES TEMPLATES & ROUTING ----
import * as fs from "node:fs";
import * as path from "node:path";

export const admin_templates_seed = onCall({
    region: "europe-west1",
    memory: "256MiB",
    cpu: 0.083,
    minInstances: 0,
    timeoutSeconds: 120
  }, async (req) => {
  assertAdmin(req);

  const db = getDb();

  // All supported locales with their file names and Firestore collection names
  // IMPORTANT: Collection names MUST match what resolveLang() returns in i18n.ts
  // resolveLang() returns: fr, en, es, de, pt, ru, ar, hi, ch
  const locales = [
    { file: "sos-expat-message-templates-fr.json", collection: "fr" },  // P0 FIX: was fr-FR, resolveLang returns "fr"
    { file: "sos-expat-message-templates-en.json", collection: "en" },
    { file: "sos-expat-message-templates-de.json", collection: "de" },
    { file: "sos-expat-message-templates-es.json", collection: "es" },
    { file: "sos-expat-message-templates-ar.json", collection: "ar" },
    { file: "sos-expat-message-templates-ch.json", collection: "ch" },  // P0 FIX: was zh, resolveLang returns "ch"
    { file: "sos-expat-message-templates-hi.json", collection: "hi" },
    { file: "sos-expat-message-templates-pt.json", collection: "pt" },
    { file: "sos-expat-message-templates-ru.json", collection: "ru" },
  ];

  const assetsDir = path.join(__dirname, "..", "assets");
  const results: Record<string, number> = {};

  // Load and upsert routing
  const routing = JSON.parse(fs.readFileSync(path.join(assetsDir, "sos-expat-message-routing.json"), "utf8"));
  await db.doc("message_routing/config").set(routing, { merge: true });
  console.log("[admin_templates_seed] Routing config updated");

  // Process each locale
  for (const locale of locales) {
    try {
      const filePath = path.join(assetsDir, locale.file);
      const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

      // JSON uses "templates" array, convert to items object by id
      const templates = data.templates || [];
      let count = 0;

      for (const template of templates) {
        if (!template.id) continue;

        // Store template with its full content (channels, email, sms, inapp, etc.)
        await db.doc(`message_templates/${locale.collection}/items/${template.id}`).set(template, { merge: true });
        count++;
      }

      results[locale.collection] = count;
      console.log(`[admin_templates_seed] ${locale.collection}: ${count} templates synced`);
    } catch (err) {
      console.error(`[admin_templates_seed] Error processing ${locale.file}:`, err);
      results[locale.collection] = -1;
    }
  }

  return { ok: true, counts: results, totalLocales: locales.length };
});

// ========== UNCLAIMED FUNDS MANAGEMENT ==========

import { UnclaimedFundsProcessor } from "../scheduled/processUnclaimedFunds";

/**
 * Get unclaimed funds statistics
 */
export const admin_unclaimed_funds_stats = onCall({
  region: "europe-west1",
  memory: "256MiB",
  cpu: 0.083,
  timeoutSeconds: 60
}, async (req) => {
  assertAdmin(req);

  const processor = new UnclaimedFundsProcessor();
  const stats = await processor.getStats();

  return { success: true, stats };
});

/**
 * Get list of pending transfers awaiting KYC
 */
export const admin_unclaimed_funds_list = onCall({
  region: "europe-west1",
  memory: "256MiB",
  cpu: 0.083,
  timeoutSeconds: 60
}, async (req) => {
  assertAdmin(req);

  const { status = "pending_kyc", limit: queryLimit = 50 } = req.data || {};
  const db = getDb();

  const snapshot = await db
    .collection("pending_transfers")
    .where("status", "==", status)
    .orderBy("createdAt", "desc")
    .limit(queryLimit)
    .get();

  const transfers = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
  }));

  return { success: true, transfers, count: transfers.length };
});

/**
 * Get list of forfeited funds
 */
export const admin_forfeited_funds_list = onCall({
  region: "europe-west1",
  memory: "256MiB",
  cpu: 0.083,
  timeoutSeconds: 60
}, async (req) => {
  assertAdmin(req);

  const { limit: queryLimit = 50 } = req.data || {};
  const db = getDb();

  const snapshot = await db
    .collection("forfeited_funds")
    .orderBy("forfeitedAt", "desc")
    .limit(queryLimit)
    .get();

  const funds = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    forfeitedAt: doc.data().forfeitedAt?.toDate?.()?.toISOString() || null,
    originalCreatedAt: doc.data().originalCreatedAt?.toDate?.()?.toISOString() || null,
    exceptionalClaimDeadline: doc.data().exceptionalClaimDeadline?.toDate?.()?.toISOString() || null,
  }));

  return { success: true, funds, count: funds.length };
});

/**
 * Process exceptional claim for forfeited funds
 */
export const admin_process_exceptional_claim = onCall({
  region: "europe-west1",
  memory: "256MiB",
  cpu: 0.083,
  timeoutSeconds: 120
}, async (req) => {
  assertAdmin(req);

  const { forfeitedFundsId, claimReason, supportingDocuments = [], approved } = req.data || {};

  if (!forfeitedFundsId) {
    throw new HttpsError("invalid-argument", "forfeitedFundsId is required");
  }

  if (!claimReason || !["medical_incapacity", "force_majeure", "platform_error"].includes(claimReason)) {
    throw new HttpsError("invalid-argument", "Valid claimReason required: medical_incapacity, force_majeure, platform_error");
  }

  if (approved !== true) {
    // Just reject the claim
    const db = getDb();
    await db.collection("forfeited_funds").doc(forfeitedFundsId).update({
      exceptionalClaimStatus: "rejected",
      claimReason,
      claimRejectedAt: new Date(),
      claimRejectedBy: req.auth?.uid,
      updatedAt: new Date(),
    });

    return { success: true, action: "rejected" };
  }

  // Process approval
  const processor = new UnclaimedFundsProcessor();
  const result = await processor.processExceptionalClaim(
    forfeitedFundsId,
    claimReason,
    supportingDocuments,
    req.auth?.uid || "admin"
  );

  if (!result.success) {
    throw new HttpsError("internal", result.error || "Failed to process claim");
  }

  return {
    success: true,
    action: "approved",
    refundAmount: result.refundAmount ? result.refundAmount / 100 : 0,
    processingFee: result.processingFee ? result.processingFee / 100 : 0,
  };
});

/**
 * Manually trigger unclaimed funds processing (for testing)
 */
export const admin_trigger_unclaimed_funds_processing = onCall({
  region: "europe-west1",
  memory: "256MiB",
  cpu: 0.083,
  timeoutSeconds: 300
}, async (req) => {
  assertAdmin(req);

  const processor = new UnclaimedFundsProcessor();
  const result = await processor.process();

  return { success: true, result };
});

// ========== ADMIN REFUND PAYMENT ==========

import { StripeManager } from "../StripeManager";

/**
 * Admin callable to refund a payment
 * Requires admin claim
 */
export const adminRefundPayment = onCall({
  region: "europe-west1",
  memory: "256MiB",
  cpu: 0.083,
  timeoutSeconds: 120,
}, async (req) => {
  assertAdmin(req);

  const { paymentId, reason, amount } = req.data || {};

  if (!paymentId) {
    throw new HttpsError("invalid-argument", "paymentId is required");
  }

  if (!reason) {
    throw new HttpsError("invalid-argument", "reason is required");
  }

  const stripeManager = new StripeManager();
  const result = await stripeManager.refundPayment(
    paymentId,
    reason,
    undefined, // sessionId
    amount || undefined // partial refund amount in EUR
  );

  if (!result.success) {
    throw new HttpsError("internal", result.error || "Refund failed");
  }

  return {
    success: true,
    refundId: result.refundId,
    message: `Payment ${paymentId} refunded successfully`,
  };
});

/**
 * Admin callable for bulk refunds
 * Processes multiple refunds in sequence with error handling
 */
export const adminBulkRefund = onCall({
  region: "europe-west1",
  memory: "256MiB",
  cpu: 0.083,
  timeoutSeconds: 300,
}, async (req) => {
  assertAdmin(req);

  const { paymentIds, reason } = req.data || {};

  if (!Array.isArray(paymentIds) || paymentIds.length === 0) {
    throw new HttpsError("invalid-argument", "paymentIds array is required and must not be empty");
  }

  if (!reason) {
    throw new HttpsError("invalid-argument", "reason is required");
  }

  if (paymentIds.length > 50) {
    throw new HttpsError("invalid-argument", "Maximum 50 refunds per batch");
  }

  const stripeManager = new StripeManager();
  const results: Array<{ paymentId: string; success: boolean; error?: string; refundId?: string }> = [];

  for (const paymentId of paymentIds) {
    try {
      const result = await stripeManager.refundPayment(
        paymentId,
        reason,
        undefined,
        undefined
      );

      results.push({
        paymentId,
        success: result.success,
        refundId: result.refundId,
        error: result.error,
      });
    } catch (error) {
      results.push({
        paymentId,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return {
    success: failed === 0,
    total: paymentIds.length,
    successful,
    failed,
    results,
  };
});

// ========== ADMIN CHECK PROVIDER STRIPE STATUS ==========

import Stripe from "stripe";
import {
  STRIPE_SECRET_KEY_TEST,
  STRIPE_SECRET_KEY_LIVE,
  getStripeSecretKey,
} from "../lib/secrets";
import { processPendingTransfersForProvider } from "../PendingTransferProcessor";

/**
 * Admin callable to check a provider's Stripe KYC status
 * Unlike checkStripeAccountStatus (user-facing), this uses providerId param
 * and can trigger pending transfer release if KYC is now complete.
 */
export const admin_check_provider_stripe_status = onCall({
  region: "europe-west1",
  memory: "256MiB",
  cpu: 0.083,
  timeoutSeconds: 120,
  secrets: [STRIPE_SECRET_KEY_TEST, STRIPE_SECRET_KEY_LIVE],
}, async (req) => {
  assertAdmin(req);

  const { providerId } = req.data || {};
  if (!providerId || typeof providerId !== "string") {
    throw new HttpsError("invalid-argument", "providerId is required");
  }

  const db = getDb();

  // Get provider's Stripe account from sos_profiles
  const profileDoc = await db.collection("sos_profiles").doc(providerId).get();
  if (!profileDoc.exists) {
    throw new HttpsError("not-found", `Provider ${providerId} not found in sos_profiles`);
  }

  const profileData = profileDoc.data()!;
  const stripeAccountId = profileData.stripeAccountId as string | undefined;

  if (!stripeAccountId) {
    // Check if PayPal provider
    if (profileData.paypalEmail) {
      return {
        success: true,
        gateway: "paypal",
        paypalEmail: profileData.paypalEmail,
        paypalEmailVerified: profileData.paypalEmailVerified || false,
        message: "Ce prestataire utilise PayPal, pas Stripe.",
      };
    }
    throw new HttpsError("failed-precondition", "Ce prestataire n'a pas de compte Stripe configuré");
  }

  // Initialize Stripe
  const secretKey = getStripeSecretKey();
  if (!secretKey || !secretKey.startsWith("sk_")) {
    throw new HttpsError("internal", "Stripe secret key not configured");
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: "2023-10-16" as Stripe.LatestApiVersion,
  });

  try {
    const account = await stripe.accounts.retrieve(stripeAccountId);

    const chargesEnabled = account.charges_enabled || false;
    const payoutsEnabled = account.payouts_enabled || false;
    const detailsSubmitted = account.details_submitted || false;
    const currentlyDue = account.requirements?.currently_due || [];
    const isComplete = detailsSubmitted && chargesEnabled && payoutsEnabled && currentlyDue.length === 0;

    // Update sos_profiles
    await db.collection("sos_profiles").doc(providerId).update({
      chargesEnabled,
      payoutsEnabled,
      kycCompleted: isComplete,
      ...(isComplete ? { kycCompletedAt: FieldValue.serverTimestamp() } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Update users collection
    const usersRef = db.collection("users").doc(providerId);
    const usersDoc = await usersRef.get();
    if (usersDoc.exists) {
      await usersRef.update({
        chargesEnabled,
        payoutsEnabled,
        kycCompleted: isComplete,
        kycStatus: isComplete ? "completed" : detailsSubmitted ? "in_progress" : "not_started",
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    // If KYC is now complete, process pending transfers
    let pendingTransfersResult = null;
    if (isComplete) {
      try {
        pendingTransfersResult = await processPendingTransfersForProvider(providerId, stripeAccountId);
      } catch (transferError) {
        console.error(`[admin_check_provider_stripe_status] Error processing pending transfers for ${providerId}:`, transferError);
      }
    }

    return {
      success: true,
      gateway: "stripe",
      stripeAccountId,
      chargesEnabled,
      payoutsEnabled,
      detailsSubmitted,
      kycCompleted: isComplete,
      currentlyDue,
      disabledReason: account.requirements?.disabled_reason || null,
      pendingTransfersProcessed: pendingTransfersResult ? pendingTransfersResult.succeeded : 0,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Detect invalid/revoked accounts
    if (
      errorMessage.includes("does not have access to account") ||
      errorMessage.includes("No such account") ||
      errorMessage.includes("account has been deleted")
    ) {
      return {
        success: true,
        gateway: "stripe",
        stripeAccountId,
        chargesEnabled: false,
        payoutsEnabled: false,
        kycCompleted: false,
        accountInvalid: true,
        message: `Compte Stripe invalide ou révoqué: ${stripeAccountId}`,
      };
    }

    throw new HttpsError("internal", `Erreur Stripe: ${errorMessage}`);
  }
});

// ========== ADMIN FORCE VERIFY PAYPAL PROVIDER ==========

/**
 * Admin callable to force-verify a provider's PayPal email
 * and release all blocked payouts (payoutPendingVerification=true).
 *
 * Use case: provider can't verify email themselves (email issues, etc.)
 * Admin confirms their PayPal email is correct and forces verification.
 */
export const admin_verify_paypal_provider = onCall({
  region: "europe-west1",
  memory: "256MiB",
  cpu: 0.083,
  timeoutSeconds: 120,
}, async (req) => {
  assertAdmin(req);

  const { providerId } = req.data || {};
  if (!providerId || typeof providerId !== "string") {
    throw new HttpsError("invalid-argument", "providerId is required");
  }

  const db = getDb();

  // Get provider profile
  const profileDoc = await db.collection("sos_profiles").doc(providerId).get();
  if (!profileDoc.exists) {
    throw new HttpsError("not-found", `Provider ${providerId} not found`);
  }

  const profileData = profileDoc.data()!;
  const paypalEmail = profileData.paypalEmail as string | undefined;

  if (!paypalEmail) {
    throw new HttpsError("failed-precondition", "Ce prestataire n'a pas d'email PayPal configuré");
  }

  if (profileData.paypalEmailVerified === true) {
    // Already verified — just check for stuck blocked payouts
    const blockedSnap = await db
      .collection("paypal_orders")
      .where("providerId", "==", providerId)
      .where("payoutPendingVerification", "==", true)
      .limit(50)
      .get();

    if (blockedSnap.empty) {
      return {
        success: true,
        alreadyVerified: true,
        paypalEmail,
        blockedPayoutsReleased: 0,
        message: "Email déjà vérifié, aucun payout bloqué.",
      };
    }

    // Release stuck payouts even though email is already verified
    const retryBatch = db.batch();
    for (const doc of blockedSnap.docs) {
      const orderData = doc.data();
      const retryRef = db.collection("payout_retry_queue").doc();
      retryBatch.set(retryRef, {
        orderId: doc.id,
        providerId,
        providerEmail: paypalEmail,
        amount: orderData.providerAmount || orderData.amount,
        currency: orderData.currency || "EUR",
        callSessionId: orderData.callSessionId || null,
        reason: "admin_force_release",
        status: "pending",
        createdAt: FieldValue.serverTimestamp(),
      });
      retryBatch.update(doc.ref, {
        payoutPendingVerification: false,
        payoutRetryQueued: true,
        payoutRetryReason: "admin_force_release",
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await retryBatch.commit();

    return {
      success: true,
      alreadyVerified: true,
      paypalEmail,
      blockedPayoutsReleased: blockedSnap.size,
      message: `Email déjà vérifié. ${blockedSnap.size} payout(s) bloqué(s) relancé(s).`,
    };
  }

  // Force verify the PayPal email
  const now = FieldValue.serverTimestamp();
  const updateData = {
    paypalEmailVerified: true,
    paypalEmailVerifiedAt: now,
    paypalEmailVerifiedBy: "admin",
    paypalAccountStatus: "active",
    paypalOnboardingComplete: true,
    paypalPaymentsReceivable: true,
    updatedAt: now,
  };

  const batch = db.batch();
  batch.update(db.collection("sos_profiles").doc(providerId), updateData);
  batch.update(db.collection("users").doc(providerId), {
    paypalEmail,
    paypalEmailVerified: true,
    paypalAccountStatus: "active",
    paypalOnboardingComplete: true,
    updatedAt: now,
  });

  // Also update lawyers/expats collection
  const providerType = profileData.type as string;
  if (providerType === "lawyer" || providerType === "expat") {
    const collectionName = providerType === "lawyer" ? "lawyers" : "expats";
    batch.update(db.collection(collectionName).doc(providerId), updateData);
  }

  await batch.commit();

  // Release blocked payouts
  const blockedSnap = await db
    .collection("paypal_orders")
    .where("providerId", "==", providerId)
    .where("payoutPendingVerification", "==", true)
    .limit(50)
    .get();

  let blockedPayoutsReleased = 0;
  if (!blockedSnap.empty) {
    const retryBatch = db.batch();
    for (const doc of blockedSnap.docs) {
      const orderData = doc.data();
      const retryRef = db.collection("payout_retry_queue").doc();
      retryBatch.set(retryRef, {
        orderId: doc.id,
        providerId,
        providerEmail: paypalEmail,
        amount: orderData.providerAmount || orderData.amount,
        currency: orderData.currency || "EUR",
        callSessionId: orderData.callSessionId || null,
        reason: "admin_force_verify",
        status: "pending",
        createdAt: FieldValue.serverTimestamp(),
      });
      retryBatch.update(doc.ref, {
        payoutPendingVerification: false,
        payoutRetryQueued: true,
        payoutRetryReason: "admin_force_verify",
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await retryBatch.commit();
    blockedPayoutsReleased = blockedSnap.size;
  }

  // Audit log
  await db.collection("admin_action_logs").add({
    action: "force_verify_paypal",
    adminUid: req.auth!.uid,
    targetProviderId: providerId,
    paypalEmail,
    blockedPayoutsReleased,
    createdAt: FieldValue.serverTimestamp(),
  });

  return {
    success: true,
    alreadyVerified: false,
    paypalEmail,
    blockedPayoutsReleased,
    message: `Email PayPal vérifié manuellement. ${blockedPayoutsReleased} payout(s) relancé(s).`,
  };
});
