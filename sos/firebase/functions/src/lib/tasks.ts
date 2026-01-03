// firebase/functions/src/lib/tasks.ts
import { CloudTasksClient } from "@google-cloud/tasks";
import { defineSecret, defineString } from "firebase-functions/params";
import { logError } from "../utils/logs/logError";
import { logger as prodLogger } from "../utils/productionLogger";

// Types pour améliorer la sécurité du code
interface TaskPayload {
  callSessionId: string;
  scheduledAt: string;
  taskId: string;
}

interface PendingTask {
  taskId: string;
  callSessionId: string;
  scheduleTime: Date;
  name: string;
}

interface QueueStats {
  pendingTasks: number;
  queueName: string;
  location: string;
  oldestTaskAge?: number; // minutes
}

// ------------------------------------------------------
// Configuration via params + fallback ENV (sûr et flexible)
// ------------------------------------------------------
const CLOUD_TASKS_LOCATION = defineString("CLOUD_TASKS_LOCATION", { default: "europe-west1" });
const CLOUD_TASKS_QUEUE = defineString("CLOUD_TASKS_QUEUE", { default: "call-scheduler-queue" });
const FUNCTIONS_BASE_URL_PARAM = defineString("FUNCTIONS_BASE_URL"); // optionnel
const TASKS_AUTH_SECRET = defineSecret("TASKS_AUTH_SECRET");

// Récupère le projectId depuis l'environnement Functions (standard)
function getProjectId(): string {
  return (
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    "unknown-project"
  );
}

// Construit la base URL : param > env > valeur par défaut
function getFunctionsBaseUrl(): string {
  const fromParam = (FUNCTIONS_BASE_URL_PARAM.value() || "").trim();
  if (fromParam) return fromParam.replace(/\/$/, "");

  const region = CLOUD_TASKS_LOCATION.value() || "europe-west1";
  console.log("region in the getFunctionsBaseUrl function:", region);
  const projectId = getProjectId();
  console.log("projectId in the getFunctionsBaseUrl function:", projectId);
  return `https://${region}-${projectId}.cloudfunctions.net`;
}

// Objet de config résolu à l'usage (pas gelé car dépend de .value())
function getTasksConfig() {
  return {
    projectId: getProjectId(),
    location: CLOUD_TASKS_LOCATION.value() || "europe-west1",
    queueName: CLOUD_TASKS_QUEUE.value() || "call-scheduler-queue",
    callbackBaseUrl: getFunctionsBaseUrl(), // sans slash final
    functionName: "executeCallTask"};
}

// ------------------------------------------------------
// Client Cloud Tasks (lazy)
// ------------------------------------------------------
let tasksClient: CloudTasksClient | null = null;

function getTasksClient(): CloudTasksClient {
  if (!tasksClient) {
    tasksClient = new CloudTasksClient();
  }
  return tasksClient;
}

// ------------------------------------------------------
// API
// ------------------------------------------------------

/**
 * Programme une tâche Cloud Tasks pour exécuter un appel plus tard.
 * @param callSessionId ID de la session d'appel
 * @param delaySeconds Délai avant exécution (en secondes)
 * @returns taskId créé
 *
 * IMPORTANT :
 *   afin que TASKS_AUTH_SECRET.value() soit accessible à l'exécution.
 */
export async function scheduleCallTask(
  callSessionId: string,
  delaySeconds: number
): Promise<string> {
  prodLogger.info('CLOUD_TASKS_SCHEDULE_START', `Scheduling call task for session ${callSessionId}`, {
    callSessionId,
    delaySeconds
  });

  try {
    const client = getTasksClient();
    const cfg = getTasksConfig();

    const queuePath = client.queuePath(cfg.projectId, cfg.location, cfg.queueName);

    // ID unique et stable
    const taskId = `call-${callSessionId}-${Date.now()}`;

    // URL complète de callback
    const callbackUrl = `${cfg.callbackBaseUrl}/${cfg.functionName}`;
    console.log(`📋 [CloudTasks] URL de callback: ${callbackUrl}`);

    // Horodatage d'exécution
    const scheduleTime = new Date();
    scheduleTime.setSeconds(scheduleTime.getSeconds() + delaySeconds);

    // Corps de requête
    const payload: TaskPayload = {
      callSessionId,
      scheduledAt: new Date().toISOString(),
      taskId};

    const task = {
      name: `${queuePath}/tasks/${taskId}`,
      scheduleTime: {
        seconds: Math.floor(scheduleTime.getTime() / 1000)},
      httpRequest: {
        httpMethod: "POST" as const,
        url: callbackUrl || 'https://europe-west1-sos-urgently-ac307.net/executeCallTask',
        headers: {
          "Content-Type": "application/json", 
          // ⚠️ Utilise le secret paramétré (Firebase v2)
          "X-Task-Auth": TASKS_AUTH_SECRET.value()},
        body: Buffer.from(JSON.stringify(payload))
      }
    };
    console.log("task created : ", task)


    console.log(
      `📋 [CloudTasks] Création tâche ${taskId} (queue=${cfg.queueName}, region=${cfg.location}) → ${delaySeconds}s`
    );

    const [response] = await client.createTask({ parent: queuePath, task });

    console.log(`✅ [CloudTasks] Tâche créée: ${response.name}`);
    prodLogger.info('CLOUD_TASKS_SCHEDULE_SUCCESS', `Task created successfully`, {
      callSessionId,
      taskId,
      delaySeconds,
      scheduledAt: scheduleTime.toISOString(),
      queueName: cfg.queueName
    });
    return taskId;
  } catch (error) {
    prodLogger.error('CLOUD_TASKS_SCHEDULE_ERROR', `Failed to create task`, {
      callSessionId,
      delaySeconds,
      error: error instanceof Error ? error.message : String(error)
    });
    await logError("scheduleCallTask", error);
    throw new Error(
      `Erreur création tâche Cloud Tasks: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Annule une tâche Cloud Tasks si elle existe encore.
 */
export async function cancelCallTask(taskId: string): Promise<void> {
  prodLogger.info('CLOUD_TASKS_CANCEL_START', `Cancelling task ${taskId}`, { taskId });

  try {
    const client = getTasksClient();
    const cfg = getTasksConfig();

    const taskPath = client.taskPath(cfg.projectId, cfg.location, cfg.queueName, taskId);

    console.log(`🚫 [CloudTasks] Annulation tâche: ${taskId}`);
    await client.deleteTask({ name: taskPath });
    console.log(`✅ [CloudTasks] Tâche annulée: ${taskId}`);
    prodLogger.info('CLOUD_TASKS_CANCEL_SUCCESS', `Task cancelled successfully`, { taskId });
  } catch (error) {
    // Ignorer si déjà exécutée/supprimée
    if (
      error instanceof Error &&
      (error.message.includes("NOT_FOUND") || error.message.includes("already completed"))
    ) {
      console.log(`ℹ️ [CloudTasks] Tâche ${taskId} déjà exécutée ou inexistante`);
      prodLogger.debug('CLOUD_TASKS_CANCEL_ALREADY_DONE', `Task already executed or not found`, { taskId });
      return;
    }
    prodLogger.error('CLOUD_TASKS_CANCEL_ERROR', `Failed to cancel task`, {
      taskId,
      error: error instanceof Error ? error.message : String(error)
    });
    await logError("cancelCallTask", error);
    throw new Error(
      `Erreur annulation tâche Cloud Tasks: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Liste les tâches en attente dans la queue.
 */
export async function listPendingTasks(
  maxResults: number = 100
): Promise<PendingTask[]> {
  try {
    const client = getTasksClient();
    const cfg = getTasksConfig();

    const queuePath = client.queuePath(cfg.projectId, cfg.location, cfg.queueName);

    console.log(`📋 [CloudTasks] Liste des tâches en attente (queue=${cfg.queueName})`);

    const [tasks] = await client.listTasks({
      parent: queuePath,
      pageSize: maxResults});

    const pending = tasks
      .filter((task) => task.scheduleTime && task.httpRequest?.body)
      .map((task) => {
        try {
          const payload = JSON.parse((task.httpRequest!.body as Buffer).toString()) as TaskPayload;
          const scheduleTime = new Date((task.scheduleTime!.seconds as number) * 1000);

          return {
            taskId: payload.taskId || "unknown",
            callSessionId: payload.callSessionId || "unknown",
            scheduleTime,
            name: task.name || "unknown"};
        } catch (e) {
          console.warn("⚠️ [CloudTasks] Erreur parsing payload:", e);
          return null;
        }
      })
      .filter((item): item is PendingTask => item !== null);

    console.log(`📊 [CloudTasks] ${pending.length} tâches en attente`);
    return pending;
  } catch (error) {
    await logError("listPendingTasks", error);
    return [];
  }
}

/**
 * Purge toutes les tâches de la queue (⚠️ attention en prod).
 */
export async function purgeQueue(): Promise<number> {
  try {
    const client = getTasksClient();
    const cfg = getTasksConfig();

    const queuePath = client.queuePath(cfg.projectId, cfg.location, cfg.queueName);

    console.log(`🧹 [CloudTasks] Purge de la queue: ${cfg.queueName}`);
    await client.purgeQueue({ name: queuePath });
    console.log(`✅ [CloudTasks] Queue purgée: ${cfg.queueName}`);

    // Cloud Tasks ne renvoie pas le nombre d'items purgés
    return 1;
  } catch (error) {
    await logError("purgeQueue", error);
    throw new Error(
      `Erreur purge queue: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Statistiques basiques sur la queue.
 */
export async function getQueueStats(): Promise<QueueStats> {
  try {
    const cfg = getTasksConfig();
    const pending = await listPendingTasks(1000);

    let oldestTaskAge: number | undefined;
    if (pending.length > 0) {
      const oldest = pending.sort(
        (a, b) => a.scheduleTime.getTime() - b.scheduleTime.getTime()
      )[0];
      oldestTaskAge = Math.round(
        (Date.now() - oldest.scheduleTime.getTime()) / (1000 * 60)
      );
    }

    return {
      pendingTasks: pending.length,
      queueName: cfg.queueName,
      location: cfg.location,
      oldestTaskAge};
  } catch (error) {
    await logError("getQueueStats", error);
    const cfg = getTasksConfig();
    return {
      pendingTasks: 0,
      queueName: cfg.queueName,
      location: cfg.location};
  }
}

/**
 * Vérifie l'existence d'une tâche.
 */
export async function taskExists(taskId: string): Promise<boolean> {
  try {
    const client = getTasksClient();
    const cfg = getTasksConfig();

    const taskPath = client.taskPath(cfg.projectId, cfg.location, cfg.queueName, taskId);
    await client.getTask({ name: taskPath });
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes("NOT_FOUND")) return false;
    await logError("taskExists", error);
    return false;
  }
}

/**
 * Planifie un appel avec vérification d'idempotence via transaction atomique.
 * Utilise une transaction Firestore pour éviter les race conditions et doublons.
 *
 * @param callSessionId ID de la session d'appel
 * @param delaySeconds Délai avant exécution (en secondes)
 * @param db Instance Firestore (optionnel, sera importée si non fournie)
 * @returns Object avec taskId et skipped (true si déjà planifié)
 */
export async function scheduleCallTaskWithIdempotence(
  callSessionId: string,
  delaySeconds: number,
  db?: FirebaseFirestore.Firestore
): Promise<{ taskId: string | null; skipped: boolean; reason?: string }> {
  prodLogger.info('CLOUD_TASKS_IDEMPOTENT_START', `Idempotent scheduling for session ${callSessionId}`, {
    callSessionId,
    delaySeconds
  });

  if (!db) {
    const admin = await import("firebase-admin");
    db = admin.firestore();
  }

  // UTILISER TRANSACTION ATOMIQUE pour éviter les race conditions
  return await db.runTransaction(async (transaction) => {
    const sessionRef = db!.collection("call_sessions").doc(callSessionId);
    const sessionDoc = await transaction.get(sessionRef);

    if (!sessionDoc.exists) {
      // Créer quand même si session n'existe pas
      console.warn(`⚠️ [CloudTasks] Session ${callSessionId} n'existe pas`);
      prodLogger.warn('CLOUD_TASKS_IDEMPOTENT_NO_SESSION', `Session not found`, { callSessionId });
    }

    const data = sessionDoc.data() || {};
    const status = data.status;
    const existingTaskId = data.taskId || data.scheduledTaskId;

    const nonSchedulableStatuses = [
      "scheduled", "provider_connecting", "client_connecting",
      "both_connecting", "active", "completed", "failed", "cancelled", "refunded"
    ];

    if (nonSchedulableStatuses.includes(status)) {
      prodLogger.info('CLOUD_TASKS_IDEMPOTENT_SKIPPED', `Skipped - non-schedulable status: ${status}`, {
        callSessionId,
        status,
        existingTaskId
      });
      return { taskId: existingTaskId || null, skipped: true, reason: `Status: ${status}` };
    }

    if (existingTaskId) {
      const taskStillExists = await taskExists(existingTaskId);
      if (taskStillExists) {
        prodLogger.info('CLOUD_TASKS_IDEMPOTENT_TASK_EXISTS', `Skipped - task already exists`, {
          callSessionId,
          existingTaskId
        });
        return { taskId: existingTaskId, skipped: true, reason: 'Task exists' };
      }
    }

    // Créer la tâche AVANT la mise à jour transactionnelle
    const taskId = await scheduleCallTask(callSessionId, delaySeconds);

    // Mise à jour atomique dans la transaction
    transaction.update(sessionRef, {
      status: "scheduled",
      taskId: taskId,
      scheduledTaskId: taskId,
      scheduledAt: new Date(),
      updatedAt: new Date()
    });

    prodLogger.info('CLOUD_TASKS_IDEMPOTENT_SUCCESS', `Task scheduled successfully via idempotent call`, {
      callSessionId,
      taskId,
      delaySeconds
    });

    return { taskId, skipped: false };
  });
}

/**
 * Crée une tâche de test vers /test-webhook (utilitaire).
 */
export async function createTestTask(
  payload: Record<string, unknown>,
  delaySeconds: number = 5
): Promise<string> {
  try {
    const client = getTasksClient();
    const cfg = getTasksConfig();

    const queuePath = client.queuePath(cfg.projectId, cfg.location, cfg.queueName);

    const taskId = `test-${Date.now()}`;
    const callbackUrl = `${cfg.callbackBaseUrl}/test-webhook`;

    const scheduleTime = new Date();
    scheduleTime.setSeconds(scheduleTime.getSeconds() + delaySeconds);

    const task = {
      name: `${queuePath}/tasks/${taskId}`,
      scheduleTime: {
        seconds: Math.floor(scheduleTime.getTime() / 1000)},
      httpRequest: {
        httpMethod: "POST" as const,
        url: callbackUrl,
        headers: {
          "Content-Type": "application/json",
          "X-Task-Auth": TASKS_AUTH_SECRET.value()},
        body: Buffer.from(JSON.stringify({ ...payload, taskId }))}};

    const [response] = await client.createTask({ parent: queuePath, task });
    console.log(`✅ [CloudTasks] Tâche de test créée: ${response.name}`);
    return taskId;
  } catch (error) {
    await logError("createTestTask", error);
    throw error;
  }
}
