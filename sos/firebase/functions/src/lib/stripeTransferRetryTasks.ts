/**
 * stripeTransferRetryTasks.ts
 *
 * P1-2 FIX: Gestion des tâches de retry pour les Stripe Transfers échoués.
 * Utilise Cloud Tasks pour programmer des retries automatiques (comme PayPal).
 *
 * Timeline: 5min → 10min → 20min → 40min → 80min (~2h30 total)
 */

// P1-2 FIX: Lazy imports to avoid deployment timeout
import { onRequest } from "firebase-functions/v2/https";
import { defineString } from "firebase-functions/params";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

// P0 FIX: Import secrets from centralized secrets.ts
import {
  getStripeSecretKey,
  STRIPE_SECRET_KEY,
  TASKS_AUTH_SECRET,
  getTasksAuthSecret,
} from "./secrets";

// P0 AUDIT FIX: Cloud Run URL configurable (v2 format, NOT v1 cloudfunctions.net)
const EXECUTE_STRIPE_TRANSFER_RETRY_URL = defineString("EXECUTE_STRIPE_TRANSFER_RETRY_URL", {
  default: "" // Will be set via Firebase params after deployment
});

// Configuration des retries
const TRANSFER_RETRY_CONFIG = {
  MAX_RETRIES: 5,
  INITIAL_DELAY_SECONDS: 5 * 60,      // 5 minutes
  BACKOFF_MULTIPLIER: 2,              // Double le délai à chaque retry
};

// Types
interface TransferRetryPayload {
  pendingTransferId: string;
  providerId: string;
  stripeAccountId: string;
  amount: number;
  currency: string;
  sourceTransaction?: string;
  retryCount: number;
}

// Client Cloud Tasks (lazy loading to avoid init timeout)
import type { CloudTasksClient } from "@google-cloud/tasks";
let tasksClient: CloudTasksClient | null = null;

function getTasksClient(): CloudTasksClient {
  if (!tasksClient) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { CloudTasksClient: CloudTasksClientClass } = require("@google-cloud/tasks");
    tasksClient = new CloudTasksClientClass();
  }
  return tasksClient!;
}

function getProjectId(): string {
  return (
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    "sos-urgently-ac307"
  );
}

/**
 * Programme un retry pour un transfer échoué
 */
export async function scheduleTransferRetryTask(payload: TransferRetryPayload): Promise<void> {
  const projectId = getProjectId();
  const location = "europe-west1";
  const queueName = "stripe-transfer-retry-queue";

  const client = getTasksClient();
  const queuePath = client.queuePath(projectId, location, queueName);

  // Calculer le délai avec backoff exponentiel
  const delaySeconds = TRANSFER_RETRY_CONFIG.INITIAL_DELAY_SECONDS *
    Math.pow(TRANSFER_RETRY_CONFIG.BACKOFF_MULTIPLIER, payload.retryCount);

  const scheduleTime = new Date(Date.now() + delaySeconds * 1000);

  // P0 AUDIT FIX: Use Cloud Run v2 URL (NOT v1 cloudfunctions.net which doesn't work with v2 functions)
  const callbackUrl = EXECUTE_STRIPE_TRANSFER_RETRY_URL.value()
    || `https://${location}-${projectId}.cloudfunctions.net/executeStripeTransferRetry`;

  if (!EXECUTE_STRIPE_TRANSFER_RETRY_URL.value()) {
    logger.warn(`[scheduleTransferRetryTask] EXECUTE_STRIPE_TRANSFER_RETRY_URL not configured, using v1 fallback URL`);
  }

  const task = {
    scheduleTime: { seconds: Math.floor(scheduleTime.getTime() / 1000) },
    httpRequest: {
      httpMethod: "POST" as const,
      url: callbackUrl,
      headers: {
        "Content-Type": "application/json",
        // P0 AUDIT FIX: Add auth header to prevent unauthorized access
        "X-Task-Auth": getTasksAuthSecret(),
      },
      body: Buffer.from(JSON.stringify(payload)),
    },
  };

  await client.createTask({ parent: queuePath, task });

  logger.info(`[scheduleTransferRetryTask] Scheduled retry #${payload.retryCount + 1} for ${payload.pendingTransferId} in ${delaySeconds}s (url: ${callbackUrl})`);
}

/**
 * Fonction Cloud appelée par Cloud Tasks pour exécuter le retry
 */
export const executeStripeTransferRetry = onRequest(
  {
    region: "europe-west1",
    // P0 AUDIT FIX: Add TASKS_AUTH_SECRET to verify Cloud Tasks auth header
    secrets: [STRIPE_SECRET_KEY, TASKS_AUTH_SECRET],
    timeoutSeconds: 60,
    // P0 AUDIT FIX: Allow unauthenticated access (Cloud Tasks sends X-Task-Auth header instead)
    invoker: "public",
  },
  async (request, response) => {
    const db = admin.firestore();

    try {
      // P0 AUDIT FIX: Verify X-Task-Auth header (was missing — endpoint was open)
      if (request.method !== "POST") {
        response.status(405).send("Method not allowed");
        return;
      }

      const authHeader = request.headers["x-task-auth"];
      const expectedAuth = getTasksAuthSecret();

      if (!authHeader || authHeader !== expectedAuth) {
        logger.error("[executeStripeTransferRetry] Invalid or missing X-Task-Auth header");
        response.status(401).send("Unauthorized");
        return;
      }

      // Décoder le payload
      const payloadStr = request.body
        ? (typeof request.body === "string" ? request.body : JSON.stringify(request.body))
        : "";

      let payload: TransferRetryPayload;
      try {
        payload = JSON.parse(payloadStr);
      } catch {
        // Si le body est déjà un objet
        payload = request.body as TransferRetryPayload;
      }

      const { pendingTransferId, providerId, stripeAccountId, amount, currency, retryCount } = payload;

      logger.info(`[executeStripeTransferRetry] Retry #${retryCount + 1} for ${pendingTransferId}`);

      // Vérifier que le pending_transfer existe et n'est pas déjà complété
      const pendingTransferRef = db.collection("pending_transfers").doc(pendingTransferId);
      const pendingTransferDoc = await pendingTransferRef.get();

      if (!pendingTransferDoc.exists) {
        logger.warn(`[executeStripeTransferRetry] pending_transfer ${pendingTransferId} not found`);
        response.status(200).send({ success: false, reason: "not_found" });
        return;
      }

      const pendingTransfer = pendingTransferDoc.data()!;

      if (pendingTransfer.status === "completed") {
        logger.info(`[executeStripeTransferRetry] Transfer already completed, skipping`);
        response.status(200).send({ success: true, reason: "already_completed" });
        return;
      }

      // Créer le client Stripe (lazy import)
      const stripeKey = getStripeSecretKey();
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" as any });

      // Retenter le transfer
      try {
        const amountCents = Math.round(amount * 100);

        // P0 FIX: Add idempotency key to prevent duplicate transfers on retry
        const transferIdempotencyKey = `retry_transfer_${pendingTransferId}_${retryCount + 1}`;
        const transfer = await stripe.transfers.create(
          {
            amount: amountCents,
            currency: currency.toLowerCase(),
            destination: stripeAccountId,
            metadata: {
              retryOf: pendingTransferId,
              retryCount: (retryCount + 1).toString(),
              originalFailure: "true",
            },
          },
          { idempotencyKey: transferIdempotencyKey }
        );

        // Succès ! Mettre à jour le pending_transfer
        await pendingTransferRef.update({
          status: "completed",
          newTransferId: transfer.id,
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
          retryCount: retryCount + 1,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Logger le succès
        await db.collection("transfer_retry_logs").add({
          pendingTransferId,
          providerId,
          stripeAccountId,
          amount,
          currency,
          retryCount: retryCount + 1,
          success: true,
          newTransferId: transfer.id,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Notification admin
        await db.collection("admin_alerts").add({
          type: "transfer_retry_success",
          priority: "low",
          title: "Retry transfert réussi",
          message: `Le transfert vers ${providerId} a réussi après ${retryCount + 1} tentative(s)`,
          data: {
            pendingTransferId,
            providerId,
            amount,
            currency,
            newTransferId: transfer.id,
          },
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        logger.info(`[executeStripeTransferRetry] SUCCESS! Transfer ${transfer.id} created`);
        response.status(200).send({ success: true, transferId: transfer.id });

      } catch (stripeError: any) {
        // Échec du retry
        logger.error(`[executeStripeTransferRetry] Stripe error:`, stripeError);

        const newRetryCount = retryCount + 1;

        // Vérifier si on a atteint le max de retries
        if (newRetryCount >= TRANSFER_RETRY_CONFIG.MAX_RETRIES) {
          // Max retries atteint - alerter l'admin
          await pendingTransferRef.update({
            status: "max_retries_reached",
            lastError: stripeError.message || "Unknown error",
            retryCount: newRetryCount,
            requiresManualIntervention: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          await db.collection("admin_alerts").add({
            type: "transfer_max_retries_reached",
            priority: "critical",
            title: "⚠️ Transfert échoué - Intervention requise",
            message: `Le transfert vers ${providerId} a échoué après ${newRetryCount} tentatives. Intervention manuelle requise.`,
            data: {
              pendingTransferId,
              providerId,
              stripeAccountId,
              amount,
              currency,
              lastError: stripeError.message,
            },
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          logger.error(`[executeStripeTransferRetry] MAX RETRIES REACHED for ${pendingTransferId}`);
          response.status(200).send({ success: false, reason: "max_retries_reached" });
          return;
        }

        // Programmer un nouveau retry
        await pendingTransferRef.update({
          status: "pending_retry",
          lastError: stripeError.message || "Unknown error",
          retryCount: newRetryCount,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        await scheduleTransferRetryTask({
          ...payload,
          retryCount: newRetryCount,
        });

        logger.info(`[executeStripeTransferRetry] Scheduled retry #${newRetryCount + 1}`);
        response.status(200).send({ success: false, reason: "retry_scheduled", nextRetry: newRetryCount + 1 });
      }

    } catch (error: any) {
      logger.error(`[executeStripeTransferRetry] Error:`, error);
      response.status(500).send({ error: error.message || "Internal error" });
    }
  }
);
