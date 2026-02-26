/**
 * payoutRetryTasks.ts
 *
 * Gestion des tâches de retry pour les payouts PayPal échoués.
 * Utilise Cloud Tasks pour programmer des retries automatiques.
 *
 * P0-2 FIX: Les payouts échoués sont maintenant:
 * - Loggés dans failed_payouts_alerts
 * - Alertés aux admins
 * - Retryés automatiquement après 5 minutes (max 3 tentatives)
 */

// LAZY IMPORT: @google-cloud/tasks takes ~400ms to load — use type-only import + require() in getter
import type { CloudTasksClient } from "@google-cloud/tasks";
import { defineString } from "firebase-functions/params";
import { onRequest, onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { logError } from "../utils/logs/logError";
// P1-13: Sync atomique payments <-> call_sessions
import { syncPaymentStatus } from "../utils/paymentSync";

// P0 FIX: Import secrets from centralized secrets.ts - NEVER call defineSecret() here!
import {
  PAYPAL_CLIENT_ID,
  PAYPAL_CLIENT_SECRET,
  PAYPAL_PARTNER_ID, // P1-2 AUDIT FIX: Required by PayPalManager.apiRequest() for Partner-Attribution-Id header
  TASKS_AUTH_SECRET,
  getTasksAuthSecret,
  isValidTaskAuth,
} from "./secrets";

// Configuration Cloud Tasks
const CLOUD_TASKS_LOCATION = defineString("CLOUD_TASKS_LOCATION", { default: "europe-west1" });
const CLOUD_TASKS_PAYOUT_QUEUE = defineString("CLOUD_TASKS_PAYOUT_QUEUE", { default: "payout-retry-queue" });
const FUNCTIONS_BASE_URL_PARAM = defineString("FUNCTIONS_BASE_URL");
// P0 AUDIT FIX: Cloud Run v2 URL configurable (NOT v1 cloudfunctions.net)
const EXECUTE_PAYOUT_RETRY_TASK_URL = defineString("EXECUTE_PAYOUT_RETRY_TASK_URL", {
  default: "" // Will be set via Firebase params after deployment
});

// Configuration des retries
// P0-5 FIX: Augmenté MAX_RETRIES de 3 à 8 pour plus de robustesse
// Timeline: 5min → 7.5min → 11min → 17min → 25min → 38min → 57min → 85min (~3h total)
const PAYOUT_RETRY_CONFIG = {
  MAX_RETRIES: 8,                     // P0-5 FIX: Augmenté de 3 à 8
  INITIAL_DELAY_SECONDS: 5 * 60,      // 5 minutes
  BACKOFF_MULTIPLIER: 1.5,            // P0-5 FIX: Réduit de 2 à 1.5 pour étaler les retries
};

// Types
interface PayoutRetryPayload {
  failedPayoutAlertId: string;
  orderId: string;
  callSessionId: string;
  providerId: string;
  providerPayPalEmail: string;
  amount: number;
  currency: string;
  retryCount: number;
  taskId?: string;
  scheduledAt?: string;
}

// Client Cloud Tasks (lazy)
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
    "unknown-project"
  );
}

function getFunctionsBaseUrl(): string {
  const fromParam = (FUNCTIONS_BASE_URL_PARAM.value() || "").trim();
  if (fromParam) return fromParam.replace(/\/$/, "");

  // P0 AUDIT FIX: v1 cloudfunctions.net URLs do NOT work with v2 functions
  // Log error clearly so operators know to configure FUNCTIONS_BASE_URL or EXECUTE_PAYOUT_RETRY_TASK_URL
  const region = CLOUD_TASKS_LOCATION.value() || "europe-west1";
  const projectId = getProjectId();
  console.error(`[PayoutRetry] CRITICAL: FUNCTIONS_BASE_URL not configured. Using v1 fallback which may NOT work with v2 functions. Set EXECUTE_PAYOUT_RETRY_TASK_URL env var.`);
  return `https://${region}-${projectId}.cloudfunctions.net`;
}

function getPayoutTasksConfig() {
  return {
    projectId: getProjectId(),
    location: CLOUD_TASKS_LOCATION.value() || "europe-west1",
    queueName: CLOUD_TASKS_PAYOUT_QUEUE.value() || "payout-retry-queue",
    callbackBaseUrl: getFunctionsBaseUrl(),
    functionName: "executePayoutRetryTask",
  };
}

/**
 * CPU OPTIMIZATION: Check if a retry task is already scheduled for this payout
 * Prevents cascade of duplicate retry tasks during payment failures
 */
async function isRetryAlreadyScheduled(orderId: string, currentRetryCount: number): Promise<boolean> {
  try {
    const db = admin.firestore();
    const alertsSnapshot = await db
      .collection("failed_payouts_alerts")
      .where("orderId", "==", orderId)
      .where("retryScheduled", "==", true)
      .limit(1)
      .get();

    if (!alertsSnapshot.empty) {
      const alert = alertsSnapshot.docs[0].data();
      // If there's already a scheduled retry with same or higher count, skip
      if (alert.retryCount >= currentRetryCount) {
        console.log(`⚠️ [PayoutRetry] Dedup: Retry already scheduled for order ${orderId} (count: ${alert.retryCount})`);
        return true;
      }
    }
    return false;
  } catch (error) {
    // On error, allow scheduling (fail-open for payment retries)
    console.warn(`⚠️ [PayoutRetry] Dedup check failed, allowing schedule: ${error}`);
    return false;
  }
}

/**
 * Programme une tâche de retry pour un payout échoué.
 * Utilise un backoff exponentiel pour les retries successifs.
 */
export async function schedulePayoutRetryTask(
  payload: Omit<PayoutRetryPayload, "taskId" | "scheduledAt">
): Promise<{ scheduled: boolean; taskId?: string; error?: string }> {
  try {
    // Vérifier si on n'a pas dépassé le max de retries
    if (payload.retryCount >= PAYOUT_RETRY_CONFIG.MAX_RETRIES) {
      console.warn(`⚠️ [PayoutRetry] Max retries (${PAYOUT_RETRY_CONFIG.MAX_RETRIES}) reached for ${payload.failedPayoutAlertId}`);
      return { scheduled: false, error: "Max retries reached" };
    }

    // CPU OPTIMIZATION: Deduplication check to prevent cascade of retry tasks
    const alreadyScheduled = await isRetryAlreadyScheduled(payload.orderId, payload.retryCount);
    if (alreadyScheduled) {
      return { scheduled: false, error: "Retry already scheduled (dedup)" };
    }

    const client = getTasksClient();
    const cfg = getPayoutTasksConfig();

    const queuePath = client.queuePath(cfg.projectId, cfg.location, cfg.queueName);

    // ID unique pour la tâche
    const taskId = `payout-retry-${payload.orderId}-${payload.retryCount + 1}-${Date.now()}`;

    // P0 AUDIT FIX: Use Cloud Run v2 URL if configured, fallback to computed URL
    const callbackUrl = EXECUTE_PAYOUT_RETRY_TASK_URL.value()
      || `${cfg.callbackBaseUrl}/${cfg.functionName}`;

    if (!EXECUTE_PAYOUT_RETRY_TASK_URL.value()) {
      console.warn(`[PayoutRetry] EXECUTE_PAYOUT_RETRY_TASK_URL not configured, using computed URL: ${callbackUrl}`);
    }

    // Calculer le délai avec backoff exponentiel
    const delaySeconds = PAYOUT_RETRY_CONFIG.INITIAL_DELAY_SECONDS *
      Math.pow(PAYOUT_RETRY_CONFIG.BACKOFF_MULTIPLIER, payload.retryCount);

    const scheduleTime = new Date();
    scheduleTime.setSeconds(scheduleTime.getSeconds() + delaySeconds);

    // Payload avec métadonnées
    const taskPayload: PayoutRetryPayload = {
      ...payload,
      retryCount: payload.retryCount + 1, // Incrémenter pour le prochain retry
      taskId,
      scheduledAt: new Date().toISOString(),
    };

    const task = {
      name: `${queuePath}/tasks/${taskId}`,
      scheduleTime: {
        seconds: Math.floor(scheduleTime.getTime() / 1000),
      },
      httpRequest: {
        httpMethod: "POST" as const,
        url: callbackUrl,
        headers: {
          "Content-Type": "application/json",
          "X-Task-Auth": getTasksAuthSecret(),
        },
        body: Buffer.from(JSON.stringify(taskPayload)),
      },
    };

    console.log(
      `📋 [PayoutRetry] Scheduling retry #${payload.retryCount + 1} for ${payload.failedPayoutAlertId} in ${delaySeconds}s`
    );

    const [response] = await client.createTask({ parent: queuePath, task });

    console.log(`✅ [PayoutRetry] Task created: ${response.name}`);
    return { scheduled: true, taskId };

  } catch (error) {
    await logError("schedulePayoutRetryTask", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`❌ [PayoutRetry] Failed to schedule retry: ${errorMessage}`);
    return { scheduled: false, error: errorMessage };
  }
}

/**
 * Cloud Function HTTP qui exécute le retry du payout.
 * Appelée par Cloud Tasks après le délai programmé.
 */
export const executePayoutRetryTask = onRequest(
  {
    region: "europe-west1",
    invoker: "public", // P0 FIX: Required for Cloud Tasks to invoke this function
    cpu: 0.083,
    secrets: [TASKS_AUTH_SECRET, PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_PARTNER_ID],
  },
  async (req, res) => {
    console.log("🔄 [PayoutRetry] Executing payout retry task");

    // Vérifier la méthode HTTP
    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }

    // Vérifier l'authentification
    const authHeader = req.headers["x-task-auth"];
    const expectedAuth = getTasksAuthSecret();

    if (!isValidTaskAuth(String(authHeader || ""), expectedAuth)) {
      console.error("❌ [PayoutRetry] Invalid or missing X-Task-Auth header");
      res.status(401).send("Unauthorized");
      return;
    }

    try {
      const payload = req.body as PayoutRetryPayload;

      if (!payload.failedPayoutAlertId || !payload.orderId || !payload.providerPayPalEmail) {
        console.error("❌ [PayoutRetry] Missing required payload fields");
        res.status(400).send("Missing required fields");
        return;
      }

      console.log(`🔄 [PayoutRetry] Retry #${payload.retryCount} for order ${payload.orderId}`);

      const db = admin.firestore();

      // Vérifier que le payout n'a pas déjà été effectué manuellement
      const alertDoc = await db.collection("failed_payouts_alerts").doc(payload.failedPayoutAlertId).get();
      const alertData = alertDoc.data();

      if (!alertDoc.exists) {
        console.warn(`⚠️ [PayoutRetry] Alert ${payload.failedPayoutAlertId} not found, skipping`);
        res.status(200).json({ skipped: true, reason: "Alert not found" });
        return;
      }

      if (alertData?.status === "resolved" || alertData?.status === "success") {
        console.log(`✅ [PayoutRetry] Payout already resolved for ${payload.orderId}, skipping`);
        res.status(200).json({ skipped: true, reason: "Already resolved" });
        return;
      }

      // Importer PayPalManager dynamiquement pour éviter les imports circulaires
      const { PayPalManager } = await import("../PayPalManager");
      const manager = new PayPalManager(db);

      // Tenter le payout
      const payoutResult = await manager.createPayout({
        providerId: payload.providerId,
        providerPayPalEmail: payload.providerPayPalEmail,
        amount: payload.amount,
        currency: payload.currency as "EUR" | "USD",
        sessionId: payload.callSessionId,
        note: `Paiement SOS-Expat (retry #${payload.retryCount}) - Session ${payload.callSessionId}`,
      });

      if (payoutResult.success) {
        console.log(`✅ [PayoutRetry] Payout succeeded on retry #${payload.retryCount}: ${payoutResult.payoutBatchId}`);

        // Mettre à jour l'alerte comme résolue
        await alertDoc.ref.update({
          status: "success",
          resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
          successfulRetryCount: payload.retryCount,
          payoutBatchId: payoutResult.payoutBatchId,
          payoutItemId: payoutResult.payoutItemId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Mettre à jour la commande PayPal
        await db.collection("paypal_orders").doc(payload.orderId).update({
          payoutTriggered: true,
          payoutId: payoutResult.payoutBatchId,
          payoutStatus: "pending",
          payoutRetrySuccessCount: payload.retryCount,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // P1-13 FIX: Sync atomique paypal_orders <-> call_sessions
        await syncPaymentStatus(db, payload.orderId, payload.callSessionId, {
          payoutTriggered: true,
          payoutId: payoutResult.payoutBatchId,
          payoutRetryCount: payload.retryCount,
        });

        // Notifier l'admin du succès
        await db.collection("admin_alerts").add({
          type: "paypal_payout_retry_success",
          priority: "medium",
          title: "Payout PayPal reussi apres retry",
          message: `Le payout de ${payload.amount} ${payload.currency} vers ${payload.providerPayPalEmail} ` +
            `a reussi apres ${payload.retryCount} tentative(s). Batch ID: ${payoutResult.payoutBatchId}`,
          orderId: payload.orderId,
          callSessionId: payload.callSessionId,
          providerId: payload.providerId,
          retryCount: payload.retryCount,
          payoutBatchId: payoutResult.payoutBatchId,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.status(200).json({
          success: true,
          payoutBatchId: payoutResult.payoutBatchId,
          retryCount: payload.retryCount,
        });

      } else {
        // Le payout a encore échoué
        console.error(`❌ [PayoutRetry] Payout failed on retry #${payload.retryCount}: ${payoutResult.error}`);

        // Mettre à jour l'alerte
        await alertDoc.ref.update({
          retryCount: payload.retryCount,
          lastRetryError: payoutResult.error || "Unknown error",
          lastRetryAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Programmer un nouveau retry si on n'a pas atteint le max
        if (payload.retryCount < PAYOUT_RETRY_CONFIG.MAX_RETRIES) {
          const nextRetryResult = await schedulePayoutRetryTask({
            failedPayoutAlertId: payload.failedPayoutAlertId,
            orderId: payload.orderId,
            callSessionId: payload.callSessionId,
            providerId: payload.providerId,
            providerPayPalEmail: payload.providerPayPalEmail,
            amount: payload.amount,
            currency: payload.currency,
            retryCount: payload.retryCount,
          });

          if (nextRetryResult.scheduled) {
            const nextDelaySeconds = PAYOUT_RETRY_CONFIG.INITIAL_DELAY_SECONDS *
              Math.pow(PAYOUT_RETRY_CONFIG.BACKOFF_MULTIPLIER, payload.retryCount);

            await alertDoc.ref.update({
              retryScheduled: true,
              retryTaskId: nextRetryResult.taskId,
              nextRetryAt: new Date(Date.now() + nextDelaySeconds * 1000),
            });
          }

          res.status(200).json({
            success: false,
            retryScheduled: nextRetryResult.scheduled,
            nextRetryTaskId: nextRetryResult.taskId,
            retryCount: payload.retryCount,
          });

        } else {
          // Max retries atteint - alerter l'admin pour intervention manuelle
          console.error(`🚨 [PayoutRetry] Max retries (${PAYOUT_RETRY_CONFIG.MAX_RETRIES}) reached for ${payload.orderId}`);

          await alertDoc.ref.update({
            status: "max_retries_reached",
            requiresManualIntervention: true,
            maxRetriesReachedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Créer une alerte critique pour intervention manuelle
          await db.collection("admin_alerts").add({
            type: "paypal_payout_max_retries",
            priority: "critical",
            title: "URGENT: Payout PayPal echoue apres max retries",
            message: `Le payout de ${payload.amount} ${payload.currency} vers ${payload.providerPayPalEmail} ` +
              `a echoue apres ${PAYOUT_RETRY_CONFIG.MAX_RETRIES} tentatives. ` +
              `Intervention manuelle requise. Session: ${payload.callSessionId}`,
            orderId: payload.orderId,
            callSessionId: payload.callSessionId,
            providerId: payload.providerId,
            providerEmail: payload.providerPayPalEmail,
            amount: payload.amount,
            currency: payload.currency,
            failedPayoutAlertId: payload.failedPayoutAlertId,
            retryCount: payload.retryCount,
            lastError: payoutResult.error,
            requiresManualIntervention: true,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          res.status(200).json({
            success: false,
            maxRetriesReached: true,
            retryCount: payload.retryCount,
            requiresManualIntervention: true,
          });
        }
      }

    } catch (error) {
      await logError("executePayoutRetryTask", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`❌ [PayoutRetry] Task execution failed: ${errorMessage}`);

      // Retourner 200 pour éviter que Cloud Tasks ne retry automatiquement
      // (on gère les retries nous-mêmes)
      res.status(200).json({ error: errorMessage, taskFailed: true });
    }
  }
);

/**
 * Annule une tâche de retry programmée.
 */
export async function cancelPayoutRetryTask(taskId: string): Promise<void> {
  try {
    const client = getTasksClient();
    const cfg = getPayoutTasksConfig();

    const taskPath = client.taskPath(cfg.projectId, cfg.location, cfg.queueName, taskId);

    console.log(`🚫 [PayoutRetry] Cancelling task: ${taskId}`);
    await client.deleteTask({ name: taskPath });
    console.log(`✅ [PayoutRetry] Task cancelled: ${taskId}`);
  } catch (error) {
    // Ignorer si la tâche n'existe plus
    if (
      error instanceof Error &&
      (error.message.includes("NOT_FOUND") || error.message.includes("already completed"))
    ) {
      console.log(`ℹ️ [PayoutRetry] Task ${taskId} already executed or not found`);
      return;
    }
    await logError("cancelPayoutRetryTask", error);
    throw error;
  }
}

/**
 * Callable function pour permettre à l'admin de retrier manuellement un payout échoué.
 * Appelée depuis la page Escrow de l'admin.
 */
export const retryFailedPayout = onCall(
  {
    region: "europe-west1",
    cpu: 0.083,
    secrets: [PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_PARTNER_ID],
  },
  async (request) => {
    // Vérifier l'authentification
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    // Vérifier le rôle admin
    const db = admin.firestore();
    const userDoc = await db.collection("users").doc(request.auth.uid).get();
    const userData = userDoc.data();

    if (!userData?.role || userData.role !== "admin") {
      throw new HttpsError("permission-denied", "Only admins can retry payouts");
    }

    const { failedPayoutAlertId } = request.data;

    if (!failedPayoutAlertId) {
      throw new HttpsError("invalid-argument", "failedPayoutAlertId is required");
    }

    console.log(`🔄 [retryFailedPayout] Admin ${request.auth.uid} triggering retry for alert ${failedPayoutAlertId}`);

    // Récupérer les données de l'alerte
    const alertDoc = await db.collection("failed_payouts_alerts").doc(failedPayoutAlertId).get();

    if (!alertDoc.exists) {
      throw new HttpsError("not-found", "Failed payout alert not found");
    }

    const alertData = alertDoc.data();

    if (!alertData) {
      throw new HttpsError("not-found", "Alert data is empty");
    }

    // Vérifier que le payout n'est pas déjà résolu
    if (alertData.status === "success" || alertData.status === "resolved") {
      throw new HttpsError("failed-precondition", "This payout has already been resolved");
    }

    // Importer PayPalManager
    const { PayPalManager } = await import("../PayPalManager");
    const manager = new PayPalManager(db);

    const currentRetryCount = (alertData.retryCount || 0) + 1;

    try {
      // Tenter le payout
      const payoutResult = await manager.createPayout({
        providerId: alertData.providerId,
        providerPayPalEmail: alertData.providerPayPalEmail,
        amount: alertData.amount,
        currency: (alertData.currency as "EUR" | "USD") || "EUR",
        sessionId: alertData.callSessionId,
        note: `Paiement SOS-Expat (retry manuel #${currentRetryCount}) - Session ${alertData.callSessionId}`,
      });

      if (payoutResult.success) {
        console.log(`✅ [retryFailedPayout] Manual retry succeeded: ${payoutResult.payoutBatchId}`);

        // Mettre à jour l'alerte comme résolue
        await alertDoc.ref.update({
          status: "success",
          resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
          resolvedBy: request.auth.uid,
          resolvedMethod: "manual_admin_retry",
          successfulRetryCount: currentRetryCount,
          payoutBatchId: payoutResult.payoutBatchId,
          payoutItemId: payoutResult.payoutItemId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Mettre à jour la commande PayPal
        if (alertData.orderId) {
          await db.collection("paypal_orders").doc(alertData.orderId).update({
            payoutTriggered: true,
            payoutId: payoutResult.payoutBatchId,
            payoutStatus: "pending",
            manualRetryBy: request.auth.uid,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Sync avec call_sessions
          if (alertData.callSessionId) {
            await syncPaymentStatus(db, alertData.orderId, alertData.callSessionId, {
              payoutTriggered: true,
              payoutId: payoutResult.payoutBatchId,
              manualRetryCount: currentRetryCount,
            });
          }
        }

        return {
          success: true,
          payoutBatchId: payoutResult.payoutBatchId,
          message: "Payout retry successful",
        };

      } else {
        // Le payout a échoué
        console.error(`❌ [retryFailedPayout] Manual retry failed: ${payoutResult.error}`);

        await alertDoc.ref.update({
          retryCount: currentRetryCount,
          lastRetryError: payoutResult.error || "Unknown error",
          lastRetryAt: admin.firestore.FieldValue.serverTimestamp(),
          lastRetryBy: request.auth.uid,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        throw new HttpsError("internal", `Payout failed: ${payoutResult.error}`);
      }

    } catch (error) {
      console.error(`❌ [retryFailedPayout] Error:`, error);

      if (error instanceof HttpsError) {
        throw error;
      }

      await logError("retryFailedPayout", error);
      throw new HttpsError("internal", `Failed to retry payout: ${(error as Error).message}`);
    }
  }
);
