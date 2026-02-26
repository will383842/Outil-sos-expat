/**
 * stripeReconciliation.ts
 *
 * P2-7: Cron de reconciliation Stripe <-> Firestore
 *
 * Compare les PaymentIntents Stripe (dernières 24h) avec les documents Firestore `payments`.
 * Détecte:
 * - Paiements capturés dans Stripe mais non enregistrés dans Firestore
 * - Paiements marqués "succeeded" dans Firestore mais non capturés dans Stripe
 * - Montants divergents entre Stripe et Firestore
 *
 * Exécution: Tous les jours à 04:00 UTC (heure creuse)
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {
  STRIPE_SECRET_KEY_LIVE,
  STRIPE_SECRET_KEY_TEST,
  getStripeSecretKey,
} from "../lib/secrets";

const LOG_PREFIX = "[stripeReconciliation]";

interface ReconciliationMismatch {
  type: "missing_in_firestore" | "missing_in_stripe" | "amount_mismatch" | "status_mismatch";
  paymentIntentId: string;
  stripeAmount?: number;
  firestoreAmount?: number;
  stripeStatus?: string;
  firestoreStatus?: string;
  details?: string;
}

/**
 * Daily Stripe <-> Firestore reconciliation
 * Runs at 04:00 UTC every day
 */
export const stripeReconciliation = onSchedule(
  {
    schedule: "0 4 * * *",
    timeZone: "UTC",
    region: "europe-west3",
    memory: "256MiB",
    timeoutSeconds: 300,
    secrets: [STRIPE_SECRET_KEY_LIVE, STRIPE_SECRET_KEY_TEST],
  },
  async () => {
    const db = admin.firestore();
    const mismatches: ReconciliationMismatch[] = [];

    try {
      // Initialize Stripe
      const stripeKey = getStripeSecretKey();
      if (!stripeKey || !stripeKey.startsWith("sk_")) {
        logger.error(`${LOG_PREFIX} Stripe key not configured, skipping reconciliation`);
        return;
      }

      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" as any });

      // Get PaymentIntents from last 24h from Stripe
      const oneDayAgo = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);

      const stripePayments = new Map<string, { amount: number; status: string }>();
      let hasMore = true;
      let startingAfter: string | undefined;

      while (hasMore) {
        const params: any = {
          created: { gte: oneDayAgo },
          limit: 100,
        };
        if (startingAfter) params.starting_after = startingAfter;

        const list = await stripe.paymentIntents.list(params);

        for (const pi of list.data) {
          stripePayments.set(pi.id, {
            amount: pi.amount,
            status: pi.status,
          });
        }

        hasMore = list.has_more;
        if (list.data.length > 0) {
          startingAfter = list.data[list.data.length - 1].id;
        }
      }

      logger.info(`${LOG_PREFIX} Found ${stripePayments.size} Stripe PaymentIntents in last 24h`);

      // Get payments from Firestore for the same period
      const oneDayAgoDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const firestoreSnapshot = await db
        .collection("payments")
        .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(oneDayAgoDate))
        .get();

      const firestorePayments = new Map<string, { amount: number; status: string }>();
      for (const doc of firestoreSnapshot.docs) {
        const data = doc.data();
        const piId = data.paymentIntentId || data.stripePaymentIntentId || doc.id;
        firestorePayments.set(piId, {
          amount: data.amountInCents || data.amount || 0,
          status: data.status || "unknown",
        });
      }

      logger.info(`${LOG_PREFIX} Found ${firestorePayments.size} Firestore payments in last 24h`);

      // Compare: Stripe PaymentIntents that succeeded but not in Firestore
      for (const [piId, stripeData] of stripePayments) {
        if (stripeData.status !== "succeeded" && stripeData.status !== "requires_capture") {
          continue; // Only check completed/authorized payments
        }

        const fsData = firestorePayments.get(piId);
        if (!fsData) {
          mismatches.push({
            type: "missing_in_firestore",
            paymentIntentId: piId,
            stripeAmount: stripeData.amount,
            stripeStatus: stripeData.status,
            details: `PaymentIntent ${piId} (${stripeData.amount} cents, ${stripeData.status}) exists in Stripe but not in Firestore`,
          });
          continue;
        }

        // Check amount mismatch
        if (Math.abs(stripeData.amount - fsData.amount) > 1) {
          mismatches.push({
            type: "amount_mismatch",
            paymentIntentId: piId,
            stripeAmount: stripeData.amount,
            firestoreAmount: fsData.amount,
            details: `Amount mismatch: Stripe=${stripeData.amount}, Firestore=${fsData.amount}`,
          });
        }
      }

      // Compare: Firestore payments with succeeded status but not found in Stripe
      for (const [piId, fsData] of firestorePayments) {
        if (!piId.startsWith("pi_")) continue; // Skip non-Stripe payment IDs

        const stripeData = stripePayments.get(piId);
        if (!stripeData && ["succeeded", "captured", "completed"].includes(fsData.status)) {
          mismatches.push({
            type: "missing_in_stripe",
            paymentIntentId: piId,
            firestoreAmount: fsData.amount,
            firestoreStatus: fsData.status,
            details: `Payment ${piId} marked as ${fsData.status} in Firestore but not found in Stripe last 24h`,
          });
        }
      }

      // Log results
      logger.info(`${LOG_PREFIX} Reconciliation complete: ${mismatches.length} mismatches found`);

      // Store reconciliation report
      const report = {
        runAt: admin.firestore.FieldValue.serverTimestamp(),
        period: {
          from: oneDayAgoDate.toISOString(),
          to: new Date().toISOString(),
        },
        stripeCount: stripePayments.size,
        firestoreCount: firestorePayments.size,
        mismatchCount: mismatches.length,
        mismatches: mismatches.slice(0, 50), // Limit to 50 to avoid large docs
        status: mismatches.length === 0 ? "clean" : "mismatches_found",
      };

      await db.collection("reconciliation_reports").add(report);

      // Alert admin if mismatches found
      if (mismatches.length > 0) {
        await db.collection("admin_alerts").add({
          type: "stripe_reconciliation_mismatch",
          priority: mismatches.length > 5 ? "high" : "medium",
          title: `Reconciliation: ${mismatches.length} divergence(s) Stripe/Firestore`,
          message: `${mismatches.length} divergence(s) détectée(s) sur les dernières 24h. Vérifiez le rapport de reconciliation.`,
          data: {
            mismatchCount: mismatches.length,
            types: {
              missingInFirestore: mismatches.filter(m => m.type === "missing_in_firestore").length,
              missingInStripe: mismatches.filter(m => m.type === "missing_in_stripe").length,
              amountMismatch: mismatches.filter(m => m.type === "amount_mismatch").length,
            },
          },
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        logger.warn(`${LOG_PREFIX} ALERT: ${mismatches.length} mismatches found, admin notified`);
      }

    } catch (error) {
      logger.error(`${LOG_PREFIX} Reconciliation failed:`, error);

      // Store failure report
      await db.collection("reconciliation_reports").add({
        runAt: admin.firestore.FieldValue.serverTimestamp(),
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);
