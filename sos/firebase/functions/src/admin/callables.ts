// firebase/functions/src/admin/callables.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";

if (!getApps().length) initializeApp();

/** Autorise UNIQUEMENT les comptes avec claim { admin: true } */
function assertAdmin(ctx: any) {
  const uid = ctx?.auth?.uid;
  const claims = ctx?.auth?.token;
  if (!uid) throw new HttpsError("unauthenticated", "Auth requise.");
  if (!claims?.admin) throw new HttpsError("permission-denied", "Réservé aux admins.");
}

/** 1) LISTE les IDs d'événements pour un locale donné */
export const admin_templates_list = onCall({
    region: "europe-west1",
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
  const db = getFirestore();
  const snap = await db.collection(`message_templates/${locale}/items`).select().get();
  const eventIds = snap.docs.map((d) => d.id).sort();
  return { eventIds };
});

/** 2) GET: récupère un template pour (locale, eventId) */
export const admin_templates_get = onCall({
    region: "europe-west1",
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
  const db = getFirestore();
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
  const db = getFirestore();
  const ref = db.doc(`message_templates/${locale}/items/${eventId}`);
  await ref.set(payload as TemplatePayload, { merge: true });
  return { ok: true };
});

/** 4) ROUTING GET: lit le doc unique message_routing/config */
export const admin_routing_get = onCall({
    region: "europe-west1",
    memory: "256MiB",
    cpu: 0.1,
    minInstances: 0,
    timeoutSeconds: 60
  }, async (req) => {
  assertAdmin(req);
  const db = getFirestore();
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
  const db = getFirestore();
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

  const db = getFirestore();
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
    cpu: 0.1,
    minInstances: 0,
    timeoutSeconds: 60
  }, async (req) => {
  assertAdmin(req); // réutilise la même fonction assertAdmin de ce fichier

  const db = getFirestore();

  // charge les JSON depuis src/assets
  const assetsDir = path.join(__dirname, "..", "assets");
  const fr = JSON.parse(fs.readFileSync(path.join(assetsDir, "sos-expat-message-templates-fr.json"), "utf8"));
  const en = JSON.parse(fs.readFileSync(path.join(assetsDir, "sos-expat-message-templates-en.json"), "utf8"));
  const routing = JSON.parse(fs.readFileSync(path.join(assetsDir, "sos-expat-message-routing.json"), "utf8"));

  // upsert routing
  await db.doc("message_routing/config").set(routing, { merge: true });

  // upsert templates FR
  for (const [eventId, payload] of Object.entries<any>(fr.items || {})) {
    await db.doc(`message_templates/fr-FR/items/${eventId}`).set(payload, { merge: true });
  }
  // upsert templates EN
  for (const [eventId, payload] of Object.entries<any>(en.items || {})) {
    await db.doc(`message_templates/en/items/${eventId}`).set(payload, { merge: true });
  }

  return { ok: true, frCount: Object.keys(fr.items || {}).length, enCount: Object.keys(en.items || {}).length };
});

// ========== UNCLAIMED FUNDS MANAGEMENT ==========

import { UnclaimedFundsProcessor } from "../scheduled/processUnclaimedFunds";

/**
 * Get unclaimed funds statistics
 */
export const admin_unclaimed_funds_stats = onCall({
  region: "europe-west1",
  memory: "256MiB",
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
  timeoutSeconds: 60
}, async (req) => {
  assertAdmin(req);

  const { status = "pending_kyc", limit: queryLimit = 50 } = req.data || {};
  const db = getFirestore();

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
  timeoutSeconds: 60
}, async (req) => {
  assertAdmin(req);

  const { limit: queryLimit = 50 } = req.data || {};
  const db = getFirestore();

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
    const db = getFirestore();
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
  memory: "512MiB",
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
  memory: "512MiB",
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
  memory: "512MiB",
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
