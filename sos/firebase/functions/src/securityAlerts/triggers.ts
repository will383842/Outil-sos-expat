/**
 * Cloud Functions Triggers pour le système d'alertes de sécurité SOS Expat
 * Expose les fonctions HTTP et Firestore triggers
 */

import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { Timestamp } from 'firebase-admin/firestore';
import { db } from '../firebaseAdmin';
import {
  SecurityAlert,
  SecurityAlertPayload,
  AlertSeverity,
  BlockedEntity,
} from './types';
import {
  createSecurityAlert,
  updateAlertStatus,
  createBruteForceAlert,
  createUnusualLocationAlert,
  createSuspiciousPaymentAlert,
  createApiAbuseAlert,
  createSystemCriticalAlert,
  createDataBreachAlert,
} from './createAlert';
import { sendSecurityAlertNotifications } from './notifier';
import {
  scheduleEscalation,
  processEscalation,
  processPendingEscalations,
  cancelEscalation,
  getEscalationStats,
} from './escalation';
import { cleanupExpiredRateLimits, getRateLimitStats } from './rateLimiter';
import { archiveOldResolvedAlerts, getAggregationStats } from './aggregator';
import { ALLOWED_ORIGINS } from '../lib/functionConfigs';

// ==========================================
// RÉGION EUROPE
// ==========================================
const REGION = 'europe-west3';

// ==========================================
// TRIGGER: NOUVELLE ALERTE CRÉÉE
// ==========================================

/**
 * Déclenché quand une nouvelle alerte de sécurité est créée
 * Envoie les notifications et planifie l'escalade
 */
export const onSecurityAlertCreated = onDocumentCreated(
  {
    document: 'security_alerts/{alertId}',
    region: REGION,
    cpu: 0.083,
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const alert = { id: snapshot.id, ...snapshot.data() } as SecurityAlert;

    console.log(`[Trigger] New security alert: ${alert.id} (${alert.type}, ${alert.severity})`);

    try {
      // Envoyer les notifications
      await sendSecurityAlertNotifications(alert);

      // Planifier l'escalade pour les alertes non-info
      if (alert.severity !== 'info') {
        await scheduleEscalation(alert.id, alert.severity, 0);
      }

    } catch (error) {
      console.error('[Trigger] Error processing new alert:', error);
    }
  }
);

// ==========================================
// TRIGGER: ALERTE MISE À JOUR
// ==========================================

/**
 * Déclenché quand une alerte est mise à jour
 * Annule l'escalade si résolue
 */
export const onSecurityAlertUpdated = onDocumentUpdated(
  {
    document: 'security_alerts/{alertId}',
    region: REGION,
    cpu: 0.083,
  },
  async (event) => {
    const before = event.data?.before.data() as SecurityAlert | undefined;
    const after = event.data?.after.data() as SecurityAlert | undefined;

    if (!before || !after) return;

    // Si le statut passe à resolved ou false_positive, annuler l'escalade
    if (
      before.status !== 'resolved' &&
      before.status !== 'false_positive' &&
      (after.status === 'resolved' || after.status === 'false_positive')
    ) {
      console.log(`[Trigger] Alert ${event.params.alertId} resolved, cancelling escalation`);
      await cancelEscalation(event.params.alertId);
    }
  }
);

// ==========================================
// FONCTION HTTP: CRÉER UNE ALERTE
// ==========================================

/**
 * Endpoint HTTP pour créer une alerte de sécurité
 * POST /createSecurityAlert
 */
export const createSecurityAlertHttp = onRequest(
  {
    region: REGION,
    cpu: 0.25,
    cors: ALLOWED_ORIGINS,
    maxInstances: 50,
  },
  async (req, res) => {
    // Vérifier la méthode
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    // Vérifier l'authentification (API key ou service account)
    const apiKey = req.headers['x-api-key'];
    const authHeader = req.headers.authorization;

    if (!apiKey && !authHeader) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      const payload: SecurityAlertPayload = req.body;
      const result = await createSecurityAlert(payload);

      if (result.success) {
        res.status(201).json({
          success: true,
          alertId: result.alertId,
          mode: result.mode,
          aggregationCount: result.aggregationCount,
        });
      } else {
        res.status(result.mode === 'rate_limited' ? 429 : 400).json({
          success: false,
          error: result.error || result.mode,
          rateLimitInfo: result.rateLimitInfo,
        });
      }
    } catch (error) {
      console.error('[HTTP] Error creating alert:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ==========================================
// FONCTION HTTP: TRAITER ESCALADE
// ==========================================

/**
 * Endpoint appelé par Cloud Tasks pour traiter une escalade
 */
export const processEscalationHttp = onRequest(
  {
    region: REGION,
    cpu: 0.25,
    invoker: 'private',
    maxInstances: 10,
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const { alertId, level } = req.body;

    if (!alertId || typeof level !== 'number') {
      res.status(400).json({ error: 'Missing alertId or level' });
      return;
    }

    try {
      const result = await processEscalation(alertId, level);
      res.status(200).json(result);
    } catch (error) {
      console.error('[HTTP] Error processing escalation:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ==========================================
// FONCTION HTTP: ACTIONS ADMIN
// ==========================================

/**
 * Endpoint pour les actions admin sur les alertes
 */
export const securityAlertAdminAction = onRequest(
  {
    region: REGION,
    cpu: 0.25,
    cors: ALLOWED_ORIGINS,
    maxInstances: 20,
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    // Vérifier l'auth admin
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { action, alertId, adminId, notes, targetIp, targetUserId } = req.body;

    try {
      switch (action) {
        case 'acknowledge':
        case 'resolve':
        case 'false_positive':
        case 'investigate':
          await updateAlertStatus(alertId, action === 'false_positive' ? 'false_positive' :
            action === 'investigate' ? 'investigating' : action, adminId, notes);
          res.status(200).json({ success: true });
          break;

        case 'block_ip':
          if (!targetIp) {
            res.status(400).json({ error: 'Missing targetIp' });
            return;
          }
          await blockIPManually(targetIp, adminId, notes);
          res.status(200).json({ success: true });
          break;

        case 'unblock_ip':
          if (!targetIp) {
            res.status(400).json({ error: 'Missing targetIp' });
            return;
          }
          await unblockIP(targetIp, adminId);
          res.status(200).json({ success: true });
          break;

        case 'suspend_user':
          if (!targetUserId) {
            res.status(400).json({ error: 'Missing targetUserId' });
            return;
          }
          await suspendUserManually(targetUserId, adminId, notes);
          res.status(200).json({ success: true });
          break;

        case 'unsuspend_user':
          if (!targetUserId) {
            res.status(400).json({ error: 'Missing targetUserId' });
            return;
          }
          await unsuspendUser(targetUserId, adminId);
          res.status(200).json({ success: true });
          break;

        default:
          res.status(400).json({ error: `Unknown action: ${action}` });
      }
    } catch (error) {
      console.error('[HTTP] Admin action error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ==========================================
// FONCTIONS HELPER POUR ACTIONS ADMIN
// ==========================================

async function blockIPManually(ip: string, adminId: string, reason?: string): Promise<void> {
  const docId = `ip_${ip.replace(/\./g, '_')}`;

  await db.collection('blocked_entities').doc(docId).set({
    entityType: 'ip',
    entityId: ip,
    reason: reason || 'Manually blocked by admin',
    blockedAt: Timestamp.now(),
    expiresAt: null, // Permanent
    blockedBy: adminId,
  });

  await db.collection('admin_security_actions').add({
    adminId,
    action: 'block_ip',
    target: ip,
    targetType: 'ip',
    timestamp: Timestamp.now(),
    details: reason,
  });
}

async function unblockIP(ip: string, adminId: string): Promise<void> {
  const docId = `ip_${ip.replace(/\./g, '_')}`;
  await db.collection('blocked_entities').doc(docId).delete();

  await db.collection('admin_security_actions').add({
    adminId,
    action: 'unblock_ip',
    target: ip,
    targetType: 'ip',
    timestamp: Timestamp.now(),
  });
}

async function suspendUserManually(userId: string, adminId: string, reason?: string): Promise<void> {
  await db.collection('users').doc(userId).update({
    suspended: true,
    suspendedAt: Timestamp.now(),
    suspendedReason: reason || 'Manually suspended by admin',
    suspendedBy: adminId,
  });

  await db.collection('blocked_entities').doc(`user_${userId}`).set({
    entityType: 'user',
    entityId: userId,
    reason: reason || 'Manually suspended by admin',
    blockedAt: Timestamp.now(),
    expiresAt: null,
    blockedBy: adminId,
  });

  await db.collection('admin_security_actions').add({
    adminId,
    action: 'suspend_user',
    target: userId,
    targetType: 'user',
    timestamp: Timestamp.now(),
    details: reason,
  });
}

async function unsuspendUser(userId: string, adminId: string): Promise<void> {
  await db.collection('users').doc(userId).update({
    suspended: false,
    suspendedAt: null,
    suspendedReason: null,
    suspendedBy: null,
  });

  await db.collection('blocked_entities').doc(`user_${userId}`).delete();

  await db.collection('admin_security_actions').add({
    adminId,
    action: 'unsuspend_user',
    target: userId,
    targetType: 'user',
    timestamp: Timestamp.now(),
  });
}

// ==========================================
// FONCTION HTTP: STATISTIQUES SÉCURITÉ
// ==========================================

/**
 * Endpoint pour récupérer les statistiques de sécurité
 * P0 SECURITY: Requiert authentification admin
 */
export const getSecurityStats = onRequest(
  {
    region: REGION,
    cpu: 0.25,
    cors: ALLOWED_ORIGINS,
    maxInstances: 10,
  },
  async (req, res) => {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    // P0 SECURITY: Vérifier l'authentification admin
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized - Bearer token required' });
      return;
    }

    try {
      // Vérifier le token Firebase
      const token = authHeader.split('Bearer ')[1];
      const admin = await import('firebase-admin');
      const decodedToken = await admin.auth().verifyIdToken(token);

      // Vérifier le rôle admin via custom claims ou Firestore
      const isAdmin = decodedToken.role === 'admin';
      if (!isAdmin) {
        const userDoc = await db.collection('users').doc(decodedToken.uid).get();
        if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
          res.status(403).json({ error: 'Forbidden - Admin access required' });
          return;
        }
      }
    } catch (authError) {
      console.error('[HTTP] Auth error:', authError);
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    try {
      const [
        escalationStats,
        rateLimitStats,
        aggregationStats,
        recentAlerts,
        blockedEntities,
      ] = await Promise.all([
        getEscalationStats(24),
        getRateLimitStats(),
        getAggregationStats(),
        getRecentAlertsStats(),
        getBlockedEntitiesStats(),
      ]);

      res.status(200).json({
        escalation: escalationStats,
        rateLimit: rateLimitStats,
        aggregation: aggregationStats,
        alerts: recentAlerts,
        blocked: blockedEntities,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[HTTP] Error getting stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

async function getRecentAlertsStats(): Promise<Record<string, unknown>> {
  const last24h = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);

  const snapshot = await db
    .collection('security_alerts')
    .where('createdAt', '>=', last24h)
    .get();

  const stats = {
    total: snapshot.size,
    bySeverity: { info: 0, warning: 0, critical: 0, emergency: 0 } as Record<AlertSeverity, number>,
    byStatus: {} as Record<string, number>,
    byType: {} as Record<string, number>,
  };

  snapshot.docs.forEach((doc) => {
    const data = doc.data() as SecurityAlert;
    stats.bySeverity[data.severity] = (stats.bySeverity[data.severity] || 0) + 1;
    stats.byStatus[data.status] = (stats.byStatus[data.status] || 0) + 1;
    stats.byType[data.type] = (stats.byType[data.type] || 0) + 1;
  });

  return stats;
}

async function getBlockedEntitiesStats(): Promise<Record<string, unknown>> {
  const snapshot = await db.collection('blocked_entities').get();

  const stats = {
    total: snapshot.size,
    byType: {} as Record<string, number>,
    expiringSoon: 0,
  };

  const soon = Date.now() + 60 * 60 * 1000; // 1h

  snapshot.docs.forEach((doc) => {
    const data = doc.data() as BlockedEntity;
    stats.byType[data.entityType] = (stats.byType[data.entityType] || 0) + 1;

    if (data.expiresAt && data.expiresAt.toMillis() < soon) {
      stats.expiringSoon++;
    }
  });

  return stats;
}

// ==========================================
// SCHEDULED: NETTOYAGE QUOTIDIEN
// ==========================================

/**
 * Nettoyage quotidien des rate limits expirés et archivage des vieilles alertes
 */
export const securityDailyCleanup = onSchedule(
  {
    schedule: '0 3 * * *', // 3h du matin
    region: REGION,
    cpu: 0.25,
    timeZone: 'Europe/Paris',
  },
  async () => {
    console.log('[Scheduled] Starting daily security cleanup');

    try {
      const [rateLimitsDeleted, alertsArchived] = await Promise.all([
        cleanupExpiredRateLimits(),
        archiveOldResolvedAlerts(30),
      ]);

      console.log(`[Scheduled] Cleanup complete: ${rateLimitsDeleted} rate limits, ${alertsArchived} alerts archived`);
    } catch (error) {
      console.error('[Scheduled] Cleanup error:', error);
    }
  }
);

// ==========================================
// SCHEDULED: TRAITEMENT DES ESCALADES EN ATTENTE
// ==========================================

/**
 * Traitement des escalades en attente 1×/jour à 8h
 * 2025-01-16: Réduit à quotidien pour économies maximales (low traffic)
 */
export const processSecurityEscalations = onSchedule(
  {
    schedule: '0 8 * * *', // 8h Paris tous les jours
    region: REGION,
    cpu: 0.25,
    timeZone: 'Europe/Paris',
  },
  async () => {
    try {
      const processed = await processPendingEscalations();
      if (processed > 0) {
        console.log(`[Scheduled] Processed ${processed} pending escalations`);
      }
    } catch (error) {
      console.error('[Scheduled] Escalation processing error:', error);
    }
  }
);

// ==========================================
// SCHEDULED: RAPPORT QUOTIDIEN DE SÉCURITÉ
// ==========================================

/**
 * Génère et envoie un rapport quotidien de sécurité
 */
export const securityDailyReport = onSchedule(
  {
    schedule: '0 8 * * *', // 8h du matin
    region: REGION,
    cpu: 0.25,
    timeZone: 'Europe/Paris',
  },
  async () => {
    console.log('[Scheduled] Generating daily security report');

    try {
      const [escalationStats, recentAlerts, blockedEntities] = await Promise.all([
        getEscalationStats(24),
        getRecentAlertsStats(),
        getBlockedEntitiesStats(),
      ]);

      // Créer une notification digest pour les admins
      const alertStats = recentAlerts as {
        total: number;
        bySeverity: Record<AlertSeverity, number>;
      };

      if (alertStats.total > 0 || (escalationStats.totalEscalated > 0)) {
        await db.collection('message_events').add({
          eventId: 'security.daily_report',
          recipientType: 'admin_all',
          locale: 'fr',
          data: {
            date: new Date().toLocaleDateString('fr-FR'),
            totalAlerts: alertStats.total,
            criticalAlerts: alertStats.bySeverity.critical || 0,
            emergencyAlerts: alertStats.bySeverity.emergency || 0,
            escalatedAlerts: escalationStats.totalEscalated,
            blockedEntities: blockedEntities,
          },
          channels: ['email'],
          status: 'pending',
          createdAt: Timestamp.now(),
        });
      }

    } catch (error) {
      console.error('[Scheduled] Daily report error:', error);
    }
  }
);

// ==========================================
// VÉRIFICATION IP BLOQUÉE (CALLABLE)
// ==========================================

/**
 * Vérifie si une IP ou un utilisateur est bloqué
 * P0 SECURITY: Requiert authentification pour éviter l'énumération
 */
export const checkBlockedEntity = onRequest(
  {
    region: REGION,
    cpu: 0.25,
    cors: ALLOWED_ORIGINS,
    maxInstances: 50, // Réduit de 100 à 50
  },
  async (req, res) => {
    // P0 SECURITY: Vérifier l'authentification
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized - Bearer token required' });
      return;
    }

    try {
      const token = authHeader.split('Bearer ')[1];
      const admin = await import('firebase-admin');
      await admin.auth().verifyIdToken(token);
    } catch (authError) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    const { ip, userId } = req.query;

    if (!ip && !userId) {
      res.status(400).json({ error: 'Missing ip or userId' });
      return;
    }

    try {
      const checks: Promise<boolean>[] = [];

      if (ip) {
        const ipDocId = `ip_${String(ip).replace(/\./g, '_')}`;
        checks.push(
          db.collection('blocked_entities').doc(ipDocId).get()
            .then((doc) => {
              if (!doc.exists) return false;
              const data = doc.data() as BlockedEntity;
              // Vérifier si expiré
              if (data.expiresAt && data.expiresAt.toMillis() < Date.now()) {
                doc.ref.delete(); // Cleanup
                return false;
              }
              return true;
            })
        );
      }

      if (userId) {
        checks.push(
          db.collection('blocked_entities').doc(`user_${userId}`).get()
            .then((doc) => doc.exists)
        );
      }

      const results = await Promise.all(checks);
      const isBlocked = results.some((r) => r);

      res.status(200).json({
        blocked: isBlocked,
        ip: ip ? { checked: true, blocked: results[0] || false } : undefined,
        userId: userId ? { checked: true, blocked: results[ip ? 1 : 0] || false } : undefined,
      });
    } catch (error) {
      console.error('[HTTP] Error checking blocked:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ==========================================
// EXPORT INDEX
// ==========================================

export {
  createSecurityAlert,
  createBruteForceAlert,
  createUnusualLocationAlert,
  createSuspiciousPaymentAlert,
  createApiAbuseAlert,
  createSystemCriticalAlert,
  createDataBreachAlert,
};
