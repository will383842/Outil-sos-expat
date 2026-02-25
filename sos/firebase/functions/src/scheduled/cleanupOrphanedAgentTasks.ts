/**
 * Cleanup Orphaned Agent Tasks
 *
 * Cette fonction scheduled nettoie:
 * 1. Les tasks agents stuck en IN_PROGRESS depuis trop longtemps
 * 2. Les tasks schedulées jamais exécutées
 * 3. Les old error_logs pour réduire les coûts Firestore
 * 4. Les agent_states avec currentTasks orphelines
 *
 * Exécution: Toutes les heures
 */

import * as scheduler from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { logError } from '../utils/logs/logError';
import * as logger from 'firebase-functions/logger';
import { calculateExpireAt } from '../utils/firestoreTTL';

// Seuils de timeout (en millisecondes)
const THRESHOLDS = {
  // Tasks en "IN_PROGRESS" depuis plus de 30 minutes (probablement stuck)
  TASK_IN_PROGRESS_TIMEOUT: 30 * 60 * 1000,
  // Tasks schedulées non exécutées depuis plus de 2 heures
  SCHEDULED_TASK_TIMEOUT: 2 * 60 * 60 * 1000,
  // error_logs plus vieux que 30 jours
  ERROR_LOG_RETENTION_DAYS: 30,
  // agent_tasks completées plus vieilles que 7 jours
  COMPLETED_TASK_RETENTION_DAYS: 7,
  // Limite de documents à traiter par exécution (pour éviter timeout)
  BATCH_LIMIT: 100,
} as const;

export const cleanupOrphanedAgentTasks = scheduler.onSchedule(
  {
    // 2025-01-16: Réduit à 1×/jour à 8h pour économies maximales
    schedule: '0 8 * * *', // 8h Paris tous les jours
    timeZone: 'Europe/Paris',
    region: 'europe-west3',
    memory: '256MiB',
    cpu: 0.083,
    timeoutSeconds: 300, // 5 minutes max
  },
  async () => {
    logger.info('🧹 [AGENT_CLEANUP] Starting orphaned agent tasks cleanup...');

    const db = admin.firestore();
    const now = Date.now();

    let tasksCleanedCount = 0;
    let scheduledTasksCleanedCount = 0;
    let oldLogsCleanedCount = 0;
    let agentStatesFixedCount = 0;
    let errorCount = 0;

    // ===================================================================
    // PARTIE 1: Nettoyer les tasks stuck en IN_PROGRESS
    // ===================================================================

    try {
      const inProgressCutoff = admin.firestore.Timestamp.fromMillis(
        now - THRESHOLDS.TASK_IN_PROGRESS_TIMEOUT
      );

      const stuckTasks = await db
        .collection('agent_tasks')
        .where('status', '==', 'IN_PROGRESS')
        .where('startedAt', '<', inProgressCutoff)
        .limit(THRESHOLDS.BATCH_LIMIT)
        .get();

      for (const doc of stuckTasks.docs) {
        try {
          const task = doc.data();
          const taskId = doc.id;
          const ageMinutes = task.startedAt
            ? Math.round((now - task.startedAt.toMillis()) / 60000)
            : 0;

          logger.warn(`[AGENT_CLEANUP] Stuck task found: ${taskId} - age: ${ageMinutes}min`, {
            taskId,
            agentId: task.agentId,
            taskType: task.type,
            ageMinutes
          });

          // Marquer comme FAILED avec raison et TTL
          await doc.ref.update({
            status: 'FAILED',
            completedAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            // TTL: auto-delete après 7 jours (task terminée)
            expireAt: calculateExpireAt('agent_tasks'),
            error: {
              code: 'TASK_TIMEOUT',
              message: `Task stuck in IN_PROGRESS for ${ageMinutes} minutes - cleaned up by scheduled job`,
              recoverable: false,
              timestamp: admin.firestore.Timestamp.now()
            },
            'metadata.cleanedUpAt': admin.firestore.Timestamp.now(),
            'metadata.cleanedUpReason': 'orphaned_task_timeout'
          });

          tasksCleanedCount++;
        } catch (taskError) {
          errorCount++;
          await logError(`cleanupOrphanedAgentTasks:inProgress:${doc.id}`, taskError);
        }
      }

      logger.info(`[AGENT_CLEANUP] Stuck IN_PROGRESS tasks cleaned: ${tasksCleanedCount}`);

    } catch (inProgressError) {
      logger.error('[AGENT_CLEANUP] Error cleaning IN_PROGRESS tasks:', inProgressError);
      await logError('cleanupOrphanedAgentTasks:inProgress', inProgressError);
    }

    // ===================================================================
    // PARTIE 2: Nettoyer les tasks schedulées jamais exécutées
    // ===================================================================

    try {
      const scheduledCutoff = admin.firestore.Timestamp.fromMillis(
        now - THRESHOLDS.SCHEDULED_TASK_TIMEOUT
      );

      const staleScheduledTasks = await db
        .collection('agent_scheduled_tasks')
        .where('executeAt', '<', scheduledCutoff)
        .limit(THRESHOLDS.BATCH_LIMIT)
        .get();

      const batch = db.batch();
      let batchCount = 0;

      for (const doc of staleScheduledTasks.docs) {
        try {
          const scheduledTask = doc.data();
          const ageMinutes = scheduledTask.executeAt
            ? Math.round((now - scheduledTask.executeAt.toMillis()) / 60000)
            : 0;

          logger.warn(`[AGENT_CLEANUP] Stale scheduled task: ${doc.id} - scheduled ${ageMinutes}min ago`, {
            taskId: scheduledTask.task?.id,
            agentId: scheduledTask.agentId,
            ageMinutes
          });

          // Supprimer la task schedulée (elle n'a pas été exécutée)
          batch.delete(doc.ref);
          batchCount++;

          // Log pour audit avec TTL
          await db.collection('agent_cleanup_logs').add({
            type: 'stale_scheduled_task_deleted',
            scheduledTaskId: doc.id,
            originalTaskId: scheduledTask.task?.id,
            agentId: scheduledTask.agentId,
            scheduledAt: scheduledTask.executeAt,
            ageMinutes,
            deletedAt: admin.firestore.Timestamp.now(),
            // TTL: auto-delete après 7 jours
            expireAt: calculateExpireAt('agent_cleanup_logs')
          });

          scheduledTasksCleanedCount++;
        } catch (scheduledError) {
          errorCount++;
          await logError(`cleanupOrphanedAgentTasks:scheduled:${doc.id}`, scheduledError);
        }
      }

      if (batchCount > 0) {
        await batch.commit();
      }

      logger.info(`[AGENT_CLEANUP] Stale scheduled tasks cleaned: ${scheduledTasksCleanedCount}`);

    } catch (scheduledError) {
      logger.error('[AGENT_CLEANUP] Error cleaning scheduled tasks:', scheduledError);
      await logError('cleanupOrphanedAgentTasks:scheduled', scheduledError);
    }

    // ===================================================================
    // PARTIE 3: Nettoyer les old error_logs (TTL)
    // ===================================================================

    try {
      const errorLogCutoff = admin.firestore.Timestamp.fromMillis(
        now - THRESHOLDS.ERROR_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000
      );

      const oldErrorLogs = await db
        .collection('error_logs')
        .where('timestamp', '<', errorLogCutoff)
        .limit(THRESHOLDS.BATCH_LIMIT)
        .get();

      if (!oldErrorLogs.empty) {
        const batch = db.batch();

        for (const doc of oldErrorLogs.docs) {
          batch.delete(doc.ref);
          oldLogsCleanedCount++;
        }

        await batch.commit();
        logger.info(`[AGENT_CLEANUP] Old error_logs cleaned: ${oldLogsCleanedCount}`);
      }

    } catch (logsError) {
      logger.error('[AGENT_CLEANUP] Error cleaning old error_logs:', logsError);
      await logError('cleanupOrphanedAgentTasks:errorLogs', logsError);
    }

    // ===================================================================
    // PARTIE 4: Nettoyer les old agent_tasks completées (TTL)
    // ===================================================================

    try {
      const completedTaskCutoff = admin.firestore.Timestamp.fromMillis(
        now - THRESHOLDS.COMPLETED_TASK_RETENTION_DAYS * 24 * 60 * 60 * 1000
      );

      const oldCompletedTasks = await db
        .collection('agent_tasks')
        .where('status', 'in', ['COMPLETED', 'FAILED', 'CANCELLED'])
        .where('completedAt', '<', completedTaskCutoff)
        .limit(THRESHOLDS.BATCH_LIMIT)
        .get();

      if (!oldCompletedTasks.empty) {
        const batch = db.batch();
        let deletedCount = 0;

        for (const doc of oldCompletedTasks.docs) {
          batch.delete(doc.ref);
          deletedCount++;
        }

        await batch.commit();
        logger.info(`[AGENT_CLEANUP] Old completed tasks cleaned: ${deletedCount}`);
      }

    } catch (oldTasksError) {
      logger.error('[AGENT_CLEANUP] Error cleaning old completed tasks:', oldTasksError);
      await logError('cleanupOrphanedAgentTasks:oldTasks', oldTasksError);
    }

    // ===================================================================
    // PARTIE 5: Réparer les agent_states avec currentTasks orphelines
    // ===================================================================

    try {
      const agentStates = await db
        .collection('agent_states')
        .where('status', '==', 'PROCESSING')
        .get();

      for (const doc of agentStates.docs) {
        try {
          const state = doc.data();
          const agentId = doc.id;
          const currentTasks = state.currentTasks || [];

          if (currentTasks.length === 0) {
            // Agent en PROCESSING mais pas de tasks - corriger
            logger.warn(`[AGENT_CLEANUP] Agent ${agentId} in PROCESSING but no tasks - fixing`);

            await doc.ref.update({
              status: 'IDLE',
              currentTasks: [],
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            agentStatesFixedCount++;
            continue;
          }

          // Vérifier si les tasks existent vraiment
          let orphanedTaskIds: string[] = [];

          for (const taskId of currentTasks) {
            const taskDoc = await db.collection('agent_tasks').doc(taskId).get();

            if (!taskDoc.exists) {
              orphanedTaskIds.push(taskId);
            } else {
              const taskData = taskDoc.data();
              // Si la task est terminée mais toujours dans currentTasks
              if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(taskData?.status)) {
                orphanedTaskIds.push(taskId);
              }
            }
          }

          if (orphanedTaskIds.length > 0) {
            logger.warn(`[AGENT_CLEANUP] Agent ${agentId} has ${orphanedTaskIds.length} orphaned task refs`, {
              agentId,
              orphanedTaskIds
            });

            const validTasks = currentTasks.filter((id: string) => !orphanedTaskIds.includes(id));

            await doc.ref.update({
              currentTasks: validTasks,
              status: validTasks.length > 0 ? 'PROCESSING' : 'IDLE',
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            agentStatesFixedCount++;
          }

        } catch (stateError) {
          errorCount++;
          await logError(`cleanupOrphanedAgentTasks:agentState:${doc.id}`, stateError);
        }
      }

      logger.info(`[AGENT_CLEANUP] Agent states fixed: ${agentStatesFixedCount}`);

    } catch (statesError) {
      logger.error('[AGENT_CLEANUP] Error fixing agent states:', statesError);
      await logError('cleanupOrphanedAgentTasks:agentStates', statesError);
    }

    // ===================================================================
    // RAPPORT FINAL
    // ===================================================================

    const summary = {
      tasksCleanedCount,
      scheduledTasksCleanedCount,
      oldLogsCleanedCount,
      agentStatesFixedCount,
      errorCount,
      timestamp: admin.firestore.Timestamp.now()
    };

    logger.info('🧹 [AGENT_CLEANUP] Completed', summary);

    // Log pour monitoring si des actions ont été effectuées
    const totalActions = tasksCleanedCount + scheduledTasksCleanedCount +
                        oldLogsCleanedCount + agentStatesFixedCount;

    if (totalActions > 0 || errorCount > 0) {
      await db.collection('system_logs').add({
        type: 'cleanup_orphaned_agent_tasks',
        ...summary,
        // TTL: auto-delete après 14 jours
        expireAt: calculateExpireAt('system_logs')
      });
    }
  }
);
