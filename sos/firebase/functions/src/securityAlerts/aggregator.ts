/**
 * Agrégateur d'alertes de sécurité SOS Expat
 * Regroupe les alertes similaires pour éviter les notifications en double
 */

import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { db } from '../firebaseAdmin';
import {
  SecurityAlertType,
  SecurityAlert,
  SecurityAlertContext,
  AlertSeverity,
} from './types';

// ==========================================
// CONFIGURATION D'AGRÉGATION PAR TYPE
// ==========================================

export interface AggregationConfig {
  windowMs: number;           // Fenêtre temporelle pour regrouper
  maxAlertsBeforeEscalate: number;  // Nombre max avant escalade
  groupByFields: (keyof SecurityAlertContext | 'source.ip' | 'source.userId')[];
}

export const AGGREGATION_CONFIGS: Record<SecurityAlertType, AggregationConfig> = {
  'security.brute_force_detected': {
    windowMs: 15 * 60 * 1000,    // 15 minutes
    maxAlertsBeforeEscalate: 5,
    groupByFields: ['source.ip', 'source.userId'],
  },
  'security.unusual_location': {
    windowMs: 60 * 60 * 1000,    // 1 heure
    maxAlertsBeforeEscalate: 3,
    groupByFields: ['source.userId', 'country'],
  },
  'security.suspicious_payment': {
    windowMs: 30 * 60 * 1000,    // 30 minutes
    maxAlertsBeforeEscalate: 3,
    groupByFields: ['source.userId', 'paymentMethod'],
  },
  'security.mass_account_creation': {
    windowMs: 60 * 60 * 1000,    // 1 heure
    maxAlertsBeforeEscalate: 2,
    groupByFields: ['source.ip'],
  },
  'security.api_abuse': {
    windowMs: 10 * 60 * 1000,    // 10 minutes
    maxAlertsBeforeEscalate: 10,
    groupByFields: ['source.ip', 'endpoint'],
  },
  'security.data_breach_attempt': {
    windowMs: 5 * 60 * 1000,     // 5 minutes
    maxAlertsBeforeEscalate: 1,   // Escalade immédiate
    groupByFields: ['source.ip', 'source.userId'],
  },
  'security.admin_action_required': {
    windowMs: 60 * 60 * 1000,    // 1 heure
    maxAlertsBeforeEscalate: 10,
    groupByFields: ['affectedResource'],
  },
  'security.system_critical': {
    windowMs: 15 * 60 * 1000,    // 15 minutes
    maxAlertsBeforeEscalate: 3,
    groupByFields: ['systemName'],
  },
  'security.impossible_travel': {
    windowMs: 60 * 60 * 1000,    // 1 heure
    maxAlertsBeforeEscalate: 2,
    groupByFields: ['source.userId'],
  },
  'security.multiple_sessions': {
    windowMs: 30 * 60 * 1000,    // 30 minutes
    maxAlertsBeforeEscalate: 5,
    groupByFields: ['source.userId'],
  },
  'security.card_testing': {
    windowMs: 15 * 60 * 1000,    // 15 minutes
    maxAlertsBeforeEscalate: 3,
    groupByFields: ['source.ip'],
  },
  'security.promo_abuse': {
    windowMs: 60 * 60 * 1000,    // 1 heure
    maxAlertsBeforeEscalate: 5,
    groupByFields: ['source.ip', 'source.userId'],
  },
  'security.sql_injection': {
    windowMs: 10 * 60 * 1000,    // 10 minutes
    maxAlertsBeforeEscalate: 2,
    groupByFields: ['source.ip', 'endpoint'],
  },
  'security.xss_attempt': {
    windowMs: 10 * 60 * 1000,    // 10 minutes
    maxAlertsBeforeEscalate: 2,
    groupByFields: ['source.ip', 'endpoint'],
  },
  'security.rate_limit_exceeded': {
    windowMs: 15 * 60 * 1000,    // 15 minutes
    maxAlertsBeforeEscalate: 10,
    groupByFields: ['source.ip', 'endpoint'],
  },
};

// ==========================================
// GÉNÉRATION DE CLÉ D'AGRÉGATION
// ==========================================

export interface AggregationKeyParams {
  alertType: SecurityAlertType;
  context: SecurityAlertContext;
  source?: Partial<SecurityAlert['source']>;
}

/**
 * Génère une clé d'agrégation basée sur le type d'alerte et les champs configurés
 */
export function generateAggregationKey(params: AggregationKeyParams): string {
  const { alertType, context, source } = params;
  const config = AGGREGATION_CONFIGS[alertType];

  if (!config) {
    // Pas de config, utiliser le type + timestamp arrondi
    const roundedTime = Math.floor(Date.now() / (5 * 60 * 1000)); // 5 min buckets
    return `${alertType}|${roundedTime}`;
  }

  const parts: string[] = [alertType];

  for (const field of config.groupByFields) {
    let value: string | undefined;

    if (field.startsWith('source.')) {
      const sourceField = field.replace('source.', '') as keyof SecurityAlert['source'];
      value = source?.[sourceField] as string | undefined;
    } else {
      value = context[field as keyof SecurityAlertContext] as string | undefined;
    }

    if (value) {
      parts.push(`${field}:${value}`);
    }
  }

  // Ajouter un bucket temporel basé sur la fenêtre
  const bucketMs = Math.min(config.windowMs, 30 * 60 * 1000); // Max 30 min buckets
  const timeBucket = Math.floor(Date.now() / bucketMs);
  parts.push(`t:${timeBucket}`);

  return parts.join('|');
}

// ==========================================
// RECHERCHE D'ALERTE EXISTANTE POUR AGRÉGATION
// ==========================================

export interface ExistingAlertInfo {
  alertId: string;
  aggregationCount: number;
  firstOccurrence: Timestamp;
  lastOccurrence: Timestamp;
  shouldEscalate: boolean;
  severity: AlertSeverity;
  relatedAlertIds: string[];
}

/**
 * Recherche une alerte existante avec la même clé d'agrégation
 */
export async function findExistingAlert(
  aggregationKey: string,
  alertType: SecurityAlertType
): Promise<ExistingAlertInfo | null> {
  const config = AGGREGATION_CONFIGS[alertType];
  if (!config) {
    return null;
  }

  const windowStart = Timestamp.fromMillis(Date.now() - config.windowMs);

  try {
    const snapshot = await db
      .collection('security_alerts')
      .where('aggregation.key', '==', aggregationKey)
      .where('createdAt', '>=', windowStart)
      .where('status', 'in', ['pending', 'acknowledged', 'investigating'])
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data() as SecurityAlert;

    const aggregationCount = data.aggregation?.count || 1;
    const shouldEscalate = aggregationCount >= config.maxAlertsBeforeEscalate;

    return {
      alertId: doc.id,
      aggregationCount,
      firstOccurrence: data.aggregation?.firstOccurrence || data.createdAt,
      lastOccurrence: data.aggregation?.lastOccurrence || data.createdAt,
      shouldEscalate,
      severity: data.severity,
      relatedAlertIds: data.aggregation?.relatedAlertIds || [],
    };
  } catch (error) {
    console.error('[Aggregator] Error finding existing alert:', error);
    return null;
  }
}

// ==========================================
// MISE À JOUR D'ALERTE AGRÉGÉE
// ==========================================

export interface UpdateAggregationParams {
  alertId: string;
  newAlertId: string;
  newContext: SecurityAlertContext;
  escalateSeverity?: boolean;
}

/**
 * Met à jour une alerte existante avec les nouvelles occurrences
 */
export async function updateAggregatedAlert(
  params: UpdateAggregationParams
): Promise<void> {
  const { alertId, newAlertId, newContext, escalateSeverity } = params;

  const updateData: Record<string, unknown> = {
    'aggregation.count': FieldValue.increment(1),
    'aggregation.lastOccurrence': Timestamp.now(),
    'aggregation.relatedAlertIds': FieldValue.arrayUnion(newAlertId),
    updatedAt: Timestamp.now(),
  };

  // Mettre à jour le contexte avec les dernières infos
  if (newContext.attemptCount) {
    updateData['context.attemptCount'] = FieldValue.increment(1);
  }
  if (newContext.requestCount) {
    updateData['context.requestCount'] = FieldValue.increment(newContext.requestCount);
  }
  if (newContext.riskScore && typeof newContext.riskScore === 'number') {
    updateData['context.riskScore'] = newContext.riskScore;
  }

  // Escalader la sévérité si nécessaire
  if (escalateSeverity) {
    updateData.severity = 'critical';
    updateData['escalation.level'] = FieldValue.increment(1);
  }

  try {
    await db.collection('security_alerts').doc(alertId).update(updateData);
    console.log(`[Aggregator] Updated aggregated alert ${alertId} with new occurrence ${newAlertId}`);
  } catch (error) {
    console.error('[Aggregator] Error updating aggregated alert:', error);
    throw error;
  }
}

// ==========================================
// CRÉATION D'ALERTE AVEC AGRÉGATION
// ==========================================

export interface CreateAggregatedAlertResult {
  mode: 'created' | 'aggregated';
  alertId: string;
  aggregationCount: number;
  shouldNotify: boolean;
  shouldEscalate: boolean;
}

/**
 * Crée une nouvelle alerte ou l'agrège à une existante
 */
export async function createOrAggregateAlert(
  alertType: SecurityAlertType,
  context: SecurityAlertContext,
  source: Partial<SecurityAlert['source']>,
  baseAlertData: Partial<SecurityAlert>,
  aggregationKey?: string
): Promise<CreateAggregatedAlertResult> {
  // Générer la clé d'agrégation
  const key = aggregationKey || generateAggregationKey({
    alertType,
    context,
    source,
  });

  // Rechercher une alerte existante
  const existing = await findExistingAlert(key, alertType);

  if (existing) {
    // Créer un ID pour la nouvelle occurrence (pour traçabilité)
    const newOccurrenceId = db.collection('security_events').doc().id;

    // Enregistrer l'événement dans security_events pour audit
    await db.collection('security_events').doc(newOccurrenceId).set({
      parentAlertId: existing.alertId,
      type: alertType,
      context,
      source,
      createdAt: Timestamp.now(),
    });

    // Déterminer si on doit escalader
    const config = AGGREGATION_CONFIGS[alertType];
    const newCount = existing.aggregationCount + 1;
    const shouldEscalate = config
      ? newCount >= config.maxAlertsBeforeEscalate
      : false;

    // Mettre à jour l'alerte existante
    await updateAggregatedAlert({
      alertId: existing.alertId,
      newAlertId: newOccurrenceId,
      newContext: context,
      escalateSeverity: shouldEscalate && existing.severity !== 'emergency',
    });

    return {
      mode: 'aggregated',
      alertId: existing.alertId,
      aggregationCount: newCount,
      // Ne notifier que si on atteint des seuils clés
      shouldNotify: shouldEscalate || newCount % 5 === 0,
      shouldEscalate,
    };
  }

  // Créer une nouvelle alerte
  const alertId = db.collection('security_alerts').doc().id;

  const alertData: SecurityAlert = {
    ...baseAlertData,
    id: alertId,
    type: alertType,
    context,
    source: source as SecurityAlert['source'],
    aggregation: {
      key,
      count: 1,
      firstOccurrence: Timestamp.now(),
      lastOccurrence: Timestamp.now(),
      relatedAlertIds: [],
    },
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    processed: false,
  } as SecurityAlert;

  await db.collection('security_alerts').doc(alertId).set(alertData);

  return {
    mode: 'created',
    alertId,
    aggregationCount: 1,
    shouldNotify: true,
    shouldEscalate: false,
  };
}

// ==========================================
// STATISTIQUES D'AGRÉGATION
// ==========================================

export interface AggregationStats {
  totalAggregatedAlerts: number;
  totalOccurrences: number;
  averageOccurrencesPerAlert: number;
  topAggregatedAlerts: Array<{
    alertId: string;
    type: SecurityAlertType;
    count: number;
    key: string;
  }>;
}

/**
 * Récupère les statistiques d'agrégation
 */
export async function getAggregationStats(): Promise<AggregationStats> {
  try {
    const snapshot = await db
      .collection('security_alerts')
      .where('aggregation.count', '>', 1)
      .orderBy('aggregation.count', 'desc')
      .limit(100)
      .get();

    let totalOccurrences = 0;
    const topAlerts: AggregationStats['topAggregatedAlerts'] = [];

    snapshot.docs.forEach((doc) => {
      const data = doc.data() as SecurityAlert;
      const count = data.aggregation?.count || 1;
      totalOccurrences += count;

      if (topAlerts.length < 10) {
        topAlerts.push({
          alertId: doc.id,
          type: data.type,
          count,
          key: data.aggregation?.key || '',
        });
      }
    });

    return {
      totalAggregatedAlerts: snapshot.size,
      totalOccurrences,
      averageOccurrencesPerAlert: snapshot.size > 0
        ? Math.round(totalOccurrences / snapshot.size)
        : 0,
      topAggregatedAlerts: topAlerts,
    };
  } catch (error) {
    console.error('[Aggregator] Error getting stats:', error);
    throw error;
  }
}

// ==========================================
// NETTOYAGE DES ALERTES ANCIENNES
// ==========================================

/**
 * Archive les alertes résolues de plus de 30 jours
 */
export async function archiveOldResolvedAlerts(daysOld: number = 30): Promise<number> {
  const cutoff = Timestamp.fromMillis(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  const batchSize = 100;
  let archivedCount = 0;

  try {
    const snapshot = await db
      .collection('security_alerts')
      .where('status', '==', 'resolved')
      .where('resolvedAt', '<', cutoff)
      .limit(batchSize)
      .get();

    if (snapshot.empty) {
      return 0;
    }

    const batch = db.batch();
    const archiveBatch = db.batch();

    snapshot.docs.forEach((doc) => {
      // Copier vers collection archive
      const archiveRef = db.collection('security_alerts_archive').doc(doc.id);
      archiveBatch.set(archiveRef, {
        ...doc.data(),
        archivedAt: Timestamp.now(),
      });

      // Supprimer de la collection principale
      batch.delete(doc.ref);
      archivedCount++;
    });

    await archiveBatch.commit();
    await batch.commit();

    console.log(`[Aggregator] Archived ${archivedCount} old resolved alerts`);
    return archivedCount;
  } catch (error) {
    console.error('[Aggregator] Error archiving old alerts:', error);
    throw error;
  }
}

// ==========================================
// HELPER: DÉTERMINER SI NOTIFICATION REQUISE
// ==========================================

/**
 * Détermine si une alerte agrégée doit déclencher une notification
 * Basé sur des seuils progressifs pour éviter le spam
 */
export function shouldNotifyForAggregatedAlert(
  alertType: SecurityAlertType,
  aggregationCount: number,
  severity: AlertSeverity
): boolean {
  // Toujours notifier les emergency
  if (severity === 'emergency') {
    return true;
  }

  // Première occurrence
  if (aggregationCount === 1) {
    return true;
  }

  const config = AGGREGATION_CONFIGS[alertType];
  if (!config) {
    return aggregationCount === 1;
  }

  // Notifier au seuil d'escalade
  if (aggregationCount === config.maxAlertsBeforeEscalate) {
    return true;
  }

  // Notifier à chaque multiple de 10 après escalade
  if (aggregationCount > config.maxAlertsBeforeEscalate) {
    return aggregationCount % 10 === 0;
  }

  // Notifier aux seuils intermédiaires (50% et 75% du max)
  const halfMax = Math.floor(config.maxAlertsBeforeEscalate / 2);
  const threeQuarterMax = Math.floor(config.maxAlertsBeforeEscalate * 0.75);

  return aggregationCount === halfMax || aggregationCount === threeQuarterMax;
}
