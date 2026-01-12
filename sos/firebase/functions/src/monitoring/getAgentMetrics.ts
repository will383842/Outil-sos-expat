/**
 * Agent Monitoring Metrics
 *
 * Cloud Function pour calculer les métriques de performance des agents IA:
 * - Error rate par agent
 * - Temps de réponse P50/P95/P99
 * - Tasks traitées par heure/jour
 * - Taux de succès
 * - Statut des agents (IDLE, PROCESSING, ERROR)
 */

import * as functions from 'firebase-functions/v2/https';
import * as scheduler from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

// Types pour les métriques
interface AgentPerformanceMetrics {
  agentId: string;
  agentName: string;
  agentType: 'SUPERVISOR' | 'DOMAIN' | 'SPECIALIZED';
  status: 'IDLE' | 'PROCESSING' | 'ERROR' | 'OFFLINE';

  // Métriques de performance
  responseTime: {
    p50: number;  // milliseconds
    p95: number;
    p99: number;
    avg: number;
  };

  // Métriques de tâches
  tasks: {
    total24h: number;
    totalHour: number;
    completed: number;
    failed: number;
    inProgress: number;
    pending: number;
  };

  // Taux
  successRate: number;  // percentage
  errorRate: number;    // percentage

  // Dernière activité
  lastTaskAt: string | null;
  lastErrorAt: string | null;
  lastError: string | null;

  // Tendance (comparaison avec période précédente)
  trend: {
    errorRateChange: number;      // +/- percentage points
    responseTimeChange: number;   // +/- percentage
    volumeChange: number;         // +/- percentage
  };
}

interface AgentMetricsSummary {
  timestamp: string;
  period: '1h' | '24h' | '7d';

  // Métriques globales
  global: {
    totalAgents: number;
    activeAgents: number;
    healthyAgents: number;
    degradedAgents: number;
    errorAgents: number;

    totalTasks24h: number;
    globalSuccessRate: number;
    globalErrorRate: number;
    avgResponseTime: number;
  };

  // Métriques par agent
  agents: AgentPerformanceMetrics[];

  // Top problèmes
  topErrors: Array<{
    agentId: string;
    errorCode: string;
    message: string;
    count: number;
    lastOccurrence: string;
  }>;

  // Alertes actives
  alerts: Array<{
    level: 'warning' | 'critical';
    agentId: string;
    message: string;
    metric: string;
    value: number;
    threshold: number;
  }>;
}

// Configuration des seuils d'alerte
const ALERT_THRESHOLDS = {
  errorRate: {
    warning: 5,    // 5% error rate
    critical: 15   // 15% error rate
  },
  responseTime: {
    warning: 30000,   // 30 seconds
    critical: 60000   // 60 seconds
  },
  taskBacklog: {
    warning: 10,
    critical: 25
  }
};

// Liste des agents connus
const KNOWN_AGENTS = [
  { id: 'supervisor', name: 'Supervisor Agent', type: 'SUPERVISOR' as const },
  { id: 'orchestrator', name: 'Orchestrator Agent', type: 'SUPERVISOR' as const },
  { id: 'legal', name: 'Legal Domain Agent', type: 'DOMAIN' as const },
  { id: 'financial', name: 'Financial Domain Agent', type: 'DOMAIN' as const },
  { id: 'administrative', name: 'Administrative Domain Agent', type: 'DOMAIN' as const },
  { id: 'relocation', name: 'Relocation Domain Agent', type: 'DOMAIN' as const },
  { id: 'compliance', name: 'Compliance Agent', type: 'SPECIALIZED' as const },
  { id: 'research', name: 'Research Agent', type: 'SPECIALIZED' as const },
  { id: 'document', name: 'Document Agent', type: 'SPECIALIZED' as const },
  { id: 'communication', name: 'Communication Agent', type: 'SPECIALIZED' as const },
  { id: 'notification', name: 'Notification Agent', type: 'SPECIALIZED' as const },
  { id: 'quality', name: 'Quality Assurance Agent', type: 'SPECIALIZED' as const },
  { id: 'visa', name: 'Visa Specialist', type: 'SPECIALIZED' as const },
  { id: 'tax', name: 'Tax Specialist', type: 'SPECIALIZED' as const },
  { id: 'insurance', name: 'Insurance Specialist', type: 'SPECIALIZED' as const },
  { id: 'banking', name: 'Banking Specialist', type: 'SPECIALIZED' as const },
  { id: 'housing', name: 'Housing Specialist', type: 'SPECIALIZED' as const },
  { id: 'education', name: 'Education Specialist', type: 'SPECIALIZED' as const },
  { id: 'healthcare', name: 'Healthcare Specialist', type: 'SPECIALIZED' as const },
  { id: 'employment', name: 'Employment Specialist', type: 'SPECIALIZED' as const },
];

/**
 * Calcule les percentiles d'un tableau de valeurs
 */
function calculatePercentiles(values: number[]): { p50: number; p95: number; p99: number; avg: number } {
  if (values.length === 0) {
    return { p50: 0, p95: 0, p99: 0, avg: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const len = sorted.length;

  const p50Index = Math.floor(len * 0.5);
  const p95Index = Math.floor(len * 0.95);
  const p99Index = Math.floor(len * 0.99);

  const avg = values.reduce((sum, v) => sum + v, 0) / len;

  return {
    p50: sorted[p50Index] || 0,
    p95: sorted[Math.min(p95Index, len - 1)] || 0,
    p99: sorted[Math.min(p99Index, len - 1)] || 0,
    avg: Math.round(avg)
  };
}

/**
 * Cloud Function HTTP pour récupérer les métriques des agents
 */
export const getAgentMetrics = functions.onCall(
  {
    region: 'europe-west1',
    memory: '512MiB',
    timeoutSeconds: 60,
  },
  async (request): Promise<AgentMetricsSummary> => {
    const db = admin.firestore();
    const now = Date.now();

    // Paramètre de période (défaut: 24h)
    const period = (request.data?.period as '1h' | '24h' | '7d') || '24h';

    // Calculer les timestamps de début selon la période
    const periodMs = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    };
    const startTime = now - periodMs[period];
    const previousPeriodStart = startTime - periodMs[period];

    logger.info('[AGENT_METRICS] Fetching metrics', { period, startTime: new Date(startTime).toISOString() });

    try {
      // 1. Récupérer les états actuels des agents
      const agentStatesSnapshot = await db.collection('agent_states').get();
      const agentStates = new Map<string, admin.firestore.DocumentData>();
      agentStatesSnapshot.docs.forEach(doc => {
        agentStates.set(doc.id, doc.data());
      });

      // 2. Récupérer les tâches de la période
      const tasksSnapshot = await db.collection('agent_tasks')
        .where('createdAt', '>=', admin.firestore.Timestamp.fromMillis(previousPeriodStart))
        .get();

      // Séparer les tâches par période (courante vs précédente)
      const currentPeriodTasks: admin.firestore.DocumentData[] = [];
      const previousPeriodTasks: admin.firestore.DocumentData[] = [];

      tasksSnapshot.docs.forEach(doc => {
        const task = doc.data();
        const taskTime = task.createdAt?.toMillis() || 0;
        if (taskTime >= startTime) {
          currentPeriodTasks.push(task);
        } else {
          previousPeriodTasks.push(task);
        }
      });

      // 3. Récupérer les erreurs récentes
      const errorsSnapshot = await db.collection('agent_tasks')
        .where('status', '==', 'FAILED')
        .where('createdAt', '>=', admin.firestore.Timestamp.fromMillis(startTime))
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get();

      // 4. Calculer les métriques par agent
      const agentMetrics: AgentPerformanceMetrics[] = [];
      const alerts: AgentMetricsSummary['alerts'] = [];
      const errorCounts = new Map<string, { count: number; message: string; lastOccurrence: string }>();

      for (const agentInfo of KNOWN_AGENTS) {
        const state = agentStates.get(agentInfo.id);

        // Filtrer les tâches de cet agent
        const agentTasks = currentPeriodTasks.filter(t => t.agentId === agentInfo.id);
        const agentPrevTasks = previousPeriodTasks.filter(t => t.agentId === agentInfo.id);

        // Calculer les compteurs
        const completed = agentTasks.filter(t => t.status === 'COMPLETED').length;
        const failed = agentTasks.filter(t => t.status === 'FAILED').length;
        const inProgress = agentTasks.filter(t => t.status === 'IN_PROGRESS').length;
        const pending = agentTasks.filter(t => t.status === 'PENDING').length;
        const total = agentTasks.length;

        // Calculer les temps de réponse (durée des tâches complétées)
        const responseTimes = agentTasks
          .filter(t => t.status === 'COMPLETED' && t.completedAt && t.startedAt)
          .map(t => {
            const start = t.startedAt?.toMillis() || 0;
            const end = t.completedAt?.toMillis() || 0;
            return end - start;
          })
          .filter(t => t > 0);

        const responseTimeMetrics = calculatePercentiles(responseTimes);

        // Calculer les taux
        const successRate = total > 0 ? Math.round((completed / total) * 100) : 100;
        const errorRate = total > 0 ? Math.round((failed / total) * 100) : 0;

        // Calculer les tendances
        const prevFailed = agentPrevTasks.filter(t => t.status === 'FAILED').length;
        const prevTotal = agentPrevTasks.length;
        const prevErrorRate = prevTotal > 0 ? (prevFailed / prevTotal) * 100 : 0;

        const prevResponseTimes = agentPrevTasks
          .filter(t => t.status === 'COMPLETED' && t.completedAt && t.startedAt)
          .map(t => (t.completedAt?.toMillis() || 0) - (t.startedAt?.toMillis() || 0))
          .filter(t => t > 0);
        const prevAvgResponseTime = prevResponseTimes.length > 0
          ? prevResponseTimes.reduce((a, b) => a + b, 0) / prevResponseTimes.length
          : 0;

        // Trouver la dernière erreur
        const lastError = agentTasks
          .filter(t => t.status === 'FAILED')
          .sort((a, b) => (b.completedAt?.toMillis() || 0) - (a.completedAt?.toMillis() || 0))[0];

        // Déterminer le statut
        let status: AgentPerformanceMetrics['status'] = 'OFFLINE';
        if (state) {
          if (state.status === 'ERROR' || errorRate > ALERT_THRESHOLDS.errorRate.critical) {
            status = 'ERROR';
          } else if (state.status === 'PROCESSING' || inProgress > 0) {
            status = 'PROCESSING';
          } else {
            status = 'IDLE';
          }
        }

        // Dernière activité
        const lastTask = agentTasks
          .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))[0];

        const metrics: AgentPerformanceMetrics = {
          agentId: agentInfo.id,
          agentName: agentInfo.name,
          agentType: agentInfo.type,
          status,
          responseTime: responseTimeMetrics,
          tasks: {
            total24h: total,
            totalHour: agentTasks.filter(t => {
              const taskTime = t.createdAt?.toMillis() || 0;
              return taskTime >= now - 60 * 60 * 1000;
            }).length,
            completed,
            failed,
            inProgress,
            pending
          },
          successRate,
          errorRate,
          lastTaskAt: lastTask?.createdAt?.toDate().toISOString() || null,
          lastErrorAt: lastError?.completedAt?.toDate().toISOString() || null,
          lastError: lastError?.error?.message || null,
          trend: {
            errorRateChange: Math.round((errorRate - prevErrorRate) * 10) / 10,
            responseTimeChange: prevAvgResponseTime > 0
              ? Math.round(((responseTimeMetrics.avg - prevAvgResponseTime) / prevAvgResponseTime) * 100)
              : 0,
            volumeChange: prevTotal > 0
              ? Math.round(((total - prevTotal) / prevTotal) * 100)
              : 0
          }
        };

        agentMetrics.push(metrics);

        // Générer des alertes si nécessaire
        if (errorRate >= ALERT_THRESHOLDS.errorRate.critical) {
          alerts.push({
            level: 'critical',
            agentId: agentInfo.id,
            message: `Taux d'erreur critique: ${errorRate}%`,
            metric: 'errorRate',
            value: errorRate,
            threshold: ALERT_THRESHOLDS.errorRate.critical
          });
        } else if (errorRate >= ALERT_THRESHOLDS.errorRate.warning) {
          alerts.push({
            level: 'warning',
            agentId: agentInfo.id,
            message: `Taux d'erreur élevé: ${errorRate}%`,
            metric: 'errorRate',
            value: errorRate,
            threshold: ALERT_THRESHOLDS.errorRate.warning
          });
        }

        if (responseTimeMetrics.p95 >= ALERT_THRESHOLDS.responseTime.critical) {
          alerts.push({
            level: 'critical',
            agentId: agentInfo.id,
            message: `Temps de réponse P95 critique: ${Math.round(responseTimeMetrics.p95 / 1000)}s`,
            metric: 'responseTime',
            value: responseTimeMetrics.p95,
            threshold: ALERT_THRESHOLDS.responseTime.critical
          });
        } else if (responseTimeMetrics.p95 >= ALERT_THRESHOLDS.responseTime.warning) {
          alerts.push({
            level: 'warning',
            agentId: agentInfo.id,
            message: `Temps de réponse P95 élevé: ${Math.round(responseTimeMetrics.p95 / 1000)}s`,
            metric: 'responseTime',
            value: responseTimeMetrics.p95,
            threshold: ALERT_THRESHOLDS.responseTime.warning
          });
        }

        if (pending >= ALERT_THRESHOLDS.taskBacklog.critical) {
          alerts.push({
            level: 'critical',
            agentId: agentInfo.id,
            message: `Backlog critique: ${pending} tâches en attente`,
            metric: 'taskBacklog',
            value: pending,
            threshold: ALERT_THRESHOLDS.taskBacklog.critical
          });
        }
      }

      // 5. Agréger les erreurs par type
      errorsSnapshot.docs.forEach(doc => {
        const task = doc.data();
        const errorCode = task.error?.code || 'UNKNOWN';
        const key = `${task.agentId}:${errorCode}`;

        if (!errorCounts.has(key)) {
          errorCounts.set(key, {
            count: 0,
            message: task.error?.message || 'Unknown error',
            lastOccurrence: task.completedAt?.toDate().toISOString() || ''
          });
        }
        const entry = errorCounts.get(key)!;
        entry.count++;
      });

      const topErrors = Array.from(errorCounts.entries())
        .map(([key, value]) => ({
          agentId: key.split(':')[0],
          errorCode: key.split(':')[1],
          ...value
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // 6. Calculer les métriques globales
      const totalTasks = currentPeriodTasks.length;
      const totalCompleted = currentPeriodTasks.filter(t => t.status === 'COMPLETED').length;
      const totalFailed = currentPeriodTasks.filter(t => t.status === 'FAILED').length;

      const activeAgents = agentMetrics.filter(a => a.status !== 'OFFLINE').length;
      const healthyAgents = agentMetrics.filter(a =>
        a.status !== 'ERROR' && a.errorRate < ALERT_THRESHOLDS.errorRate.warning
      ).length;
      const degradedAgents = agentMetrics.filter(a =>
        a.errorRate >= ALERT_THRESHOLDS.errorRate.warning &&
        a.errorRate < ALERT_THRESHOLDS.errorRate.critical
      ).length;
      const errorAgents = agentMetrics.filter(a =>
        a.status === 'ERROR' || a.errorRate >= ALERT_THRESHOLDS.errorRate.critical
      ).length;

      const allResponseTimes = agentMetrics
        .filter(a => a.responseTime.avg > 0)
        .map(a => a.responseTime.avg);
      const avgResponseTime = allResponseTimes.length > 0
        ? Math.round(allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length)
        : 0;

      const summary: AgentMetricsSummary = {
        timestamp: new Date().toISOString(),
        period,
        global: {
          totalAgents: KNOWN_AGENTS.length,
          activeAgents,
          healthyAgents,
          degradedAgents,
          errorAgents,
          totalTasks24h: totalTasks,
          globalSuccessRate: totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 100,
          globalErrorRate: totalTasks > 0 ? Math.round((totalFailed / totalTasks) * 100) : 0,
          avgResponseTime
        },
        agents: agentMetrics.sort((a, b) => b.errorRate - a.errorRate), // Trier par error rate décroissant
        topErrors,
        alerts: alerts.sort((a, b) => {
          // Trier par niveau (critical first) puis par valeur
          if (a.level !== b.level) return a.level === 'critical' ? -1 : 1;
          return b.value - a.value;
        })
      };

      logger.info('[AGENT_METRICS] Metrics calculated', {
        period,
        totalAgents: summary.global.totalAgents,
        activeAgents: summary.global.activeAgents,
        alertCount: alerts.length
      });

      return summary;

    } catch (error) {
      logger.error('[AGENT_METRICS] Error calculating metrics', error);
      throw new functions.HttpsError('internal', 'Failed to calculate agent metrics');
    }
  }
);

/**
 * Scheduled function pour sauvegarder les métriques historiques
 * Exécutée toutes les heures pour garder un historique
 */
export const saveAgentMetricsHistory = scheduler.onSchedule(
  {
    schedule: 'every 1 hours',
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
  },
  async () => {
    const db = admin.firestore();

    try {
      // Appeler la fonction de métriques
      const metricsRef = db.collection('agent_metrics_history');

      // Calculer les métriques (version simplifiée inline)
      const now = Date.now();
      const startTime = now - 60 * 60 * 1000; // 1 heure

      const tasksSnapshot = await db.collection('agent_tasks')
        .where('createdAt', '>=', admin.firestore.Timestamp.fromMillis(startTime))
        .get();

      const total = tasksSnapshot.size;
      const completed = tasksSnapshot.docs.filter(d => d.data().status === 'COMPLETED').length;
      const failed = tasksSnapshot.docs.filter(d => d.data().status === 'FAILED').length;

      // Sauvegarder un snapshot horaire
      await metricsRef.add({
        timestamp: admin.firestore.Timestamp.now(),
        period: '1h',
        totalTasks: total,
        completedTasks: completed,
        failedTasks: failed,
        successRate: total > 0 ? Math.round((completed / total) * 100) : 100,
        errorRate: total > 0 ? Math.round((failed / total) * 100) : 0,
        // TTL: garder 30 jours d'historique
        expireAt: admin.firestore.Timestamp.fromMillis(now + 30 * 24 * 60 * 60 * 1000)
      });

      logger.info('[AGENT_METRICS_HISTORY] Saved hourly snapshot', { total, completed, failed });

    } catch (error) {
      logger.error('[AGENT_METRICS_HISTORY] Error saving snapshot', error);
    }
  }
);
