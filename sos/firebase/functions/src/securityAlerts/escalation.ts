/**
 * Système d'escalade pour alertes de sécurité SOS Expat
 * Escalade automatique des alertes non traitées
 */

import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { CloudTasksClient } from '@google-cloud/tasks';
import { db } from '../firebaseAdmin';
import { SecurityAlert, AlertSeverity } from './types';
import { sendSecurityAlertNotifications } from './notifier';

// ==========================================
// CONFIGURATION D'ESCALADE
// ==========================================

export interface EscalationConfig {
  intervals: number[];           // Délais en minutes entre chaque niveau
  maxLevel: number;              // Niveau max d'escalade
  channels: string[];            // Canaux à utiliser
  autoActions?: EscalationAction[];
}

export type EscalationAction =
  | 'block_ip'
  | 'suspend_user'
  | 'rate_limit_all'
  | 'maintenance_mode'
  | 'notify_external';

export const ESCALATION_CONFIGS: Record<AlertSeverity, EscalationConfig> = {
  info: {
    intervals: [], // Pas d'escalade pour info
    maxLevel: 0,
    channels: [],
  },
  warning: {
    intervals: [60, 120, 240], // 1h, 2h, 4h
    maxLevel: 3,
    channels: ['email', 'push'],
  },
  critical: {
    intervals: [15, 30, 60, 120], // 15min, 30min, 1h, 2h
    maxLevel: 4,
    channels: ['email', 'sms', 'push', 'slack'],
    autoActions: ['rate_limit_all'],
  },
  emergency: {
    intervals: [5, 10, 20, 30, 60], // 5min, 10min, 20min, 30min, 1h
    maxLevel: 5,
    channels: ['email', 'sms', 'push', 'slack'],
    autoActions: ['block_ip', 'rate_limit_all', 'notify_external'],
  },
};

// ==========================================
// CLOUD TASKS CLIENT
// ==========================================

const tasksClient = new CloudTasksClient();
const PROJECT_ID = process.env.GCLOUD_PROJECT || 'sos-expat-28430';
const LOCATION = 'europe-west1';
const QUEUE_NAME = 'security-escalation-queue';

// ==========================================
// PLANIFICATION D'ESCALADE
// ==========================================

/**
 * Planifie la prochaine escalade pour une alerte
 */
export async function scheduleEscalation(
  alertId: string,
  severity: AlertSeverity,
  currentLevel: number
): Promise<boolean> {
  const config = ESCALATION_CONFIGS[severity];

  if (!config || currentLevel >= config.maxLevel) {
    console.log(`[Escalation] No further escalation for ${alertId} (level ${currentLevel})`);
    return false;
  }

  const nextLevel = currentLevel + 1;
  const delayMinutes = config.intervals[currentLevel] || 60;
  const scheduleTime = Date.now() + delayMinutes * 60 * 1000;

  try {
    const parent = tasksClient.queuePath(PROJECT_ID, LOCATION, QUEUE_NAME);

    const task = {
      httpRequest: {
        httpMethod: 'POST' as const,
        url: `https://processescalation-5tfnuxa2hq-ew.a.run.app`,
        headers: {
          'Content-Type': 'application/json',
        },
        body: Buffer.from(JSON.stringify({
          alertId,
          level: nextLevel,
        })).toString('base64'),
        oidcToken: {
          serviceAccountEmail: `${PROJECT_ID}@appspot.gserviceaccount.com`,
        },
      },
      scheduleTime: {
        seconds: Math.floor(scheduleTime / 1000),
      },
    };

    const [response] = await tasksClient.createTask({ parent, task });
    const taskName = response.name || '';

    // Mettre à jour l'alerte avec la prochaine escalade
    await db.collection('security_alerts').doc(alertId).update({
      'escalation.nextEscalationAt': Timestamp.fromMillis(scheduleTime),
      'escalation.scheduledTaskId': taskName,
      updatedAt: Timestamp.now(),
    });

    console.log(`[Escalation] Scheduled level ${nextLevel} for ${alertId} in ${delayMinutes} minutes`);
    return true;
  } catch (error) {
    console.error('[Escalation] Error scheduling escalation:', error);

    // Fallback: stocker dans Firestore pour traitement par scheduled function
    await db.collection('pending_escalations').add({
      alertId,
      level: nextLevel,
      scheduledFor: Timestamp.fromMillis(scheduleTime),
      createdAt: Timestamp.now(),
    });

    return true;
  }
}

// ==========================================
// TRAITEMENT D'ESCALADE
// ==========================================

export interface EscalationResult {
  success: boolean;
  alertId: string;
  newLevel: number;
  notificationsSent: boolean;
  actionsExecuted: string[];
  nextEscalation?: Date;
}

/**
 * Traite l'escalade d'une alerte
 */
export async function processEscalation(
  alertId: string,
  targetLevel: number
): Promise<EscalationResult> {
  const result: EscalationResult = {
    success: false,
    alertId,
    newLevel: targetLevel,
    notificationsSent: false,
    actionsExecuted: [],
  };

  try {
    // Récupérer l'alerte
    const alertDoc = await db.collection('security_alerts').doc(alertId).get();

    if (!alertDoc.exists) {
      console.log(`[Escalation] Alert ${alertId} not found`);
      return result;
    }

    const alert = alertDoc.data() as SecurityAlert;

    // Vérifier si l'alerte a déjà été traitée
    if (alert.status !== 'pending' && alert.status !== 'escalated') {
      console.log(`[Escalation] Alert ${alertId} already ${alert.status}, skipping`);
      result.success = true;
      return result;
    }

    const config = ESCALATION_CONFIGS[alert.severity];

    // Vérifier le niveau d'escalade
    if (targetLevel <= (alert.escalation?.level || 0)) {
      console.log(`[Escalation] Alert ${alertId} already at level ${alert.escalation?.level}`);
      result.success = true;
      return result;
    }

    // Mettre à jour le niveau d'escalade
    await db.collection('security_alerts').doc(alertId).update({
      status: 'escalated',
      'escalation.level': targetLevel,
      'escalation.escalatedAt': Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // Envoyer les notifications
    const updatedAlert = { ...alert, escalation: { ...alert.escalation, level: targetLevel } };
    const notifResult = await sendSecurityAlertNotifications(updatedAlert as SecurityAlert);
    result.notificationsSent = notifResult.email.sent > 0 || notifResult.sms.sent > 0;

    // Exécuter les actions automatiques si configurées
    if (config.autoActions && targetLevel >= config.maxLevel - 1) {
      for (const action of config.autoActions) {
        const actionResult = await executeEscalationAction(action, alert);
        if (actionResult) {
          result.actionsExecuted.push(action);
        }
      }
    }

    // Planifier la prochaine escalade
    if (targetLevel < config.maxLevel) {
      const scheduled = await scheduleEscalation(alertId, alert.severity, targetLevel);
      if (scheduled) {
        const nextDelay = config.intervals[targetLevel] || 60;
        result.nextEscalation = new Date(Date.now() + nextDelay * 60 * 1000);
      }
    }

    // Logger l'escalade
    await db.collection('admin_security_actions').add({
      adminId: 'system',
      adminName: 'System',
      adminEmail: 'contact@sos-expat.com',
      action: 'escalate',
      alertId,
      details: `Escalated to level ${targetLevel}`,
      timestamp: Timestamp.now(),
      metadata: {
        fromLevel: alert.escalation?.level || 0,
        toLevel: targetLevel,
        actionsExecuted: result.actionsExecuted,
      },
    });

    result.success = true;
    console.log(`[Escalation] Processed ${alertId} to level ${targetLevel}`);

  } catch (error) {
    console.error('[Escalation] Error processing:', error);
    result.success = false;
  }

  return result;
}

// ==========================================
// ACTIONS AUTOMATIQUES D'ESCALADE
// ==========================================

/**
 * Exécute une action automatique d'escalade
 */
async function executeEscalationAction(
  action: EscalationAction,
  alert: SecurityAlert
): Promise<boolean> {
  console.log(`[Escalation] Executing action ${action} for alert ${alert.id}`);

  try {
    switch (action) {
      case 'block_ip':
        if (alert.source?.ip) {
          await blockIP(alert.source.ip, alert.id);
          return true;
        }
        break;

      case 'suspend_user':
        if (alert.source?.userId) {
          await suspendUser(alert.source.userId, alert.id);
          return true;
        }
        break;

      case 'rate_limit_all':
        if (alert.source?.ip) {
          await applyGlobalRateLimit(alert.source.ip);
          return true;
        }
        break;

      case 'notify_external':
        await notifyExternalServices(alert);
        return true;

      case 'maintenance_mode':
        // Réservé pour les urgences absolues
        console.log('[Escalation] Maintenance mode not auto-enabled, requires manual action');
        return false;
    }
  } catch (error) {
    console.error(`[Escalation] Action ${action} failed:`, error);
  }

  return false;
}

/**
 * Bloque une IP
 */
async function blockIP(ip: string, alertId: string): Promise<void> {
  await db.collection('blocked_entities').doc(`ip_${ip.replace(/\./g, '_')}`).set({
    entityType: 'ip',
    entityId: ip,
    reason: `Auto-blocked due to escalated alert ${alertId}`,
    blockedAt: Timestamp.now(),
    expiresAt: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000), // 24h
    blockedBy: 'system',
    metadata: { alertId },
  });

  console.log(`[Escalation] Blocked IP ${ip}`);
}

/**
 * Suspend un utilisateur
 */
async function suspendUser(userId: string, alertId: string): Promise<void> {
  await db.collection('users').doc(userId).update({
    suspended: true,
    suspendedAt: Timestamp.now(),
    suspendedReason: `Auto-suspended due to escalated alert ${alertId}`,
    suspendedBy: 'system',
  });

  await db.collection('blocked_entities').doc(`user_${userId}`).set({
    entityType: 'user',
    entityId: userId,
    reason: `Auto-suspended due to escalated alert ${alertId}`,
    blockedAt: Timestamp.now(),
    expiresAt: null, // Permanent until manual review
    blockedBy: 'system',
    metadata: { alertId },
  });

  console.log(`[Escalation] Suspended user ${userId}`);
}

/**
 * Applique un rate limit global à une IP
 */
async function applyGlobalRateLimit(ip: string): Promise<void> {
  await db.collection('global_rate_limits').doc(`ip_${ip.replace(/\./g, '_')}`).set({
    ip,
    maxRequestsPerMinute: 10, // Très restrictif
    appliedAt: Timestamp.now(),
    expiresAt: Timestamp.fromMillis(Date.now() + 6 * 60 * 60 * 1000), // 6h
  });

  console.log(`[Escalation] Applied global rate limit to IP ${ip}`);
}

/**
 * Notifie les services externes (PagerDuty, etc.)
 */
async function notifyExternalServices(alert: SecurityAlert): Promise<void> {
  // TODO: Intégrer PagerDuty si configuré
  console.log(`[Escalation] External notification for alert ${alert.id}`);
}

// ==========================================
// VÉRIFICATION DES ESCALADES EN ATTENTE
// ==========================================

/**
 * Traite les escalades en attente (fallback si Cloud Tasks échoue)
 * À appeler via une scheduled function toutes les 5 minutes
 */
export async function processPendingEscalations(): Promise<number> {
  const now = Timestamp.now();
  let processedCount = 0;

  try {
    const pending = await db
      .collection('pending_escalations')
      .where('scheduledFor', '<=', now)
      .limit(50)
      .get();

    for (const doc of pending.docs) {
      const data = doc.data();

      await processEscalation(data.alertId, data.level);
      await doc.ref.delete();

      processedCount++;
    }

    if (processedCount > 0) {
      console.log(`[Escalation] Processed ${processedCount} pending escalations`);
    }
  } catch (error) {
    console.error('[Escalation] Error processing pending escalations:', error);
  }

  return processedCount;
}

// ==========================================
// ANNULATION D'ESCALADE
// ==========================================

/**
 * Annule les escalades programmées pour une alerte (quand elle est résolue)
 */
export async function cancelEscalation(alertId: string): Promise<void> {
  try {
    // Récupérer l'alerte pour obtenir l'ID de la tâche
    const alertDoc = await db.collection('security_alerts').doc(alertId).get();

    if (alertDoc.exists) {
      const alert = alertDoc.data() as SecurityAlert & { escalation?: { scheduledTaskId?: string } };

      if (alert.escalation?.scheduledTaskId) {
        try {
          await tasksClient.deleteTask({ name: alert.escalation.scheduledTaskId });
          console.log(`[Escalation] Cancelled scheduled task for ${alertId}`);
        } catch {
          // Task may have already been executed or doesn't exist
        }
      }
    }

    // Supprimer aussi de pending_escalations
    const pending = await db
      .collection('pending_escalations')
      .where('alertId', '==', alertId)
      .get();

    const batch = db.batch();
    pending.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

  } catch (error) {
    console.error('[Escalation] Error cancelling escalation:', error);
  }
}

// ==========================================
// STATISTIQUES D'ESCALADE
// ==========================================

export interface EscalationStats {
  totalEscalated: number;
  byLevel: Record<number, number>;
  averageTimeToAcknowledge: number; // en minutes
  autoActionsExecuted: number;
}

/**
 * Récupère les statistiques d'escalade
 */
export async function getEscalationStats(
  periodHours: number = 24
): Promise<EscalationStats> {
  const cutoff = Timestamp.fromMillis(Date.now() - periodHours * 60 * 60 * 1000);

  try {
    const escalated = await db
      .collection('security_alerts')
      .where('status', '==', 'escalated')
      .where('createdAt', '>=', cutoff)
      .get();

    const stats: EscalationStats = {
      totalEscalated: escalated.size,
      byLevel: {},
      averageTimeToAcknowledge: 0,
      autoActionsExecuted: 0,
    };

    let totalAckTime = 0;
    let ackCount = 0;

    escalated.docs.forEach((doc) => {
      const data = doc.data() as SecurityAlert;
      const level = data.escalation?.level || 0;

      stats.byLevel[level] = (stats.byLevel[level] || 0) + 1;

      if (data.acknowledgedAt && data.createdAt) {
        const ackTime = data.acknowledgedAt.toMillis() - data.createdAt.toMillis();
        totalAckTime += ackTime;
        ackCount++;
      }

      if (data.automaticActions) {
        stats.autoActionsExecuted += data.automaticActions.filter(a => a.executed).length;
      }
    });

    if (ackCount > 0) {
      stats.averageTimeToAcknowledge = Math.round(totalAckTime / ackCount / 60000); // en minutes
    }

    return stats;
  } catch (error) {
    console.error('[Escalation] Error getting stats:', error);
    throw error;
  }
}
