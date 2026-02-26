/**
 * aggregateCostMetrics.ts
 *
 * Cloud Function scheduled (toutes les heures) qui:
 * 1. Lit les compteurs rate_limits (sms_global, voice_global)
 * 2. Calcule les couts estimes (SMS et Voice Twilio)
 * 3. Stocke dans cost_metrics/{date}
 * 4. Cree une alerte si un seuil est depasse (80% du budget)
 *
 * Execution: Toutes les heures
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions";

// CRITICAL: Lazy initialization to avoid deployment timeout
const IS_DEPLOYMENT_ANALYSIS =
  !process.env.K_REVISION &&
  !process.env.K_SERVICE &&
  !process.env.FUNCTION_TARGET &&
  !process.env.FUNCTIONS_EMULATOR;

let _initialized = false;
function ensureInitialized() {
  if (!_initialized && !IS_DEPLOYMENT_ANALYSIS) {
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    _initialized = true;
  }
}

// ============================================================================
// CONFIGURATION DES COUTS
// ============================================================================

/**
 * Couts unitaires Twilio (estimations moyennes en EUR)
 * Source: https://www.twilio.com/pricing
 * Note: Ces tarifs varient selon les pays, ce sont des moyennes EU
 */
const TWILIO_COSTS = {
  // SMS - cout moyen par SMS envoye (EU)
  SMS_COST_EUR: 0.0725, // ~0.08 USD

  // Voice - cout moyen par minute (EU)
  VOICE_COST_PER_MIN_EUR: 0.013, // ~0.014 USD

  // Duree moyenne d'un appel en minutes (pour estimation)
  AVG_CALL_DURATION_MIN: 5,
};

/**
 * Budgets mensuels par service (en EUR)
 */
const MONTHLY_BUDGETS = {
  SMS: 500, // 500 EUR/mois pour SMS
  VOICE: 300, // 300 EUR/mois pour Voice
  TOTAL_TWILIO: 800, // Budget total Twilio
};

/**
 * Seuil d'alerte (80% du budget)
 */
const ALERT_THRESHOLD_PERCENT = 80;

// ============================================================================
// TYPES
// ============================================================================

interface RateLimitData {
  count: number;
  windowStart: number;
}

interface CostMetricData {
  date: string;
  period: string; // YYYY-MM
  service: "twilio";
  category: "sms" | "voice" | "total";
  hourlyCount: number;
  dailyCount: number;
  monthlyCount: number;
  estimatedCostEur: number;
  monthlyEstimatedCostEur: number;
  budgetEur: number;
  budgetUsedPercent: number;
  windowStart: number | null;
  aggregatedAt: admin.firestore.Timestamp;
}

interface AlertData {
  type: "cost_threshold_warning" | "cost_budget_exceeded";
  severity: "warning" | "critical";
  service: "twilio";
  category: "sms" | "voice" | "total";
  title: string;
  message: string;
  currentValue: number;
  threshold: number;
  percentageOfThreshold: number;
  budget: number;
  currency: "EUR";
  triggeredAt: admin.firestore.Timestamp;
  acknowledged: boolean;
  acknowledgedAt: admin.firestore.Timestamp | null;
  acknowledgedBy: string | null;
}

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

/**
 * Genere la date au format YYYY-MM-DD
 */
function getDateString(date: Date = new Date()): string {
  return date.toISOString().split("T")[0];
}

/**
 * Genere la periode au format YYYY-MM
 */
function getPeriodString(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Calcule le nombre de jours ecoules dans le mois
 */
function getDaysElapsedInMonth(): number {
  return new Date().getDate();
}

/**
 * Calcule le nombre total de jours dans le mois courant
 */
function getDaysInCurrentMonth(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

// ============================================================================
// LECTURE DES RATE LIMITS
// ============================================================================

/**
 * Lit les compteurs de rate limiting depuis Firestore
 */
async function getRateLimitCounters(
  db: admin.firestore.Firestore
): Promise<{ sms: RateLimitData | null; voice: RateLimitData | null }> {
  const [smsDoc, voiceDoc] = await Promise.all([
    db.collection("rate_limits").doc("sms_global").get(),
    db.collection("rate_limits").doc("voice_global").get(),
  ]);

  return {
    sms: smsDoc.exists ? (smsDoc.data() as RateLimitData) : null,
    voice: voiceDoc.exists ? (voiceDoc.data() as RateLimitData) : null,
  };
}

/**
 * Recupere les metriques de cout cumulees du mois en cours
 */
async function getMonthlyAccumulatedCounts(
  db: admin.firestore.Firestore,
  period: string
): Promise<{ smsCount: number; voiceCount: number }> {
  try {
    // Lire le document de cumul mensuel
    const monthlyDoc = await db
      .collection("cost_metrics_monthly")
      .doc(period)
      .get();

    if (monthlyDoc.exists) {
      const data = monthlyDoc.data();
      return {
        smsCount: data?.smsCount || 0,
        voiceCount: data?.voiceCount || 0,
      };
    }

    return { smsCount: 0, voiceCount: 0 };
  } catch (error) {
    logger.warn("[CostMetrics] Error reading monthly accumulated counts:", error);
    return { smsCount: 0, voiceCount: 0 };
  }
}

// ============================================================================
// CALCUL DES COUTS
// ============================================================================

/**
 * Calcule les couts estimes pour les SMS
 */
function calculateSmsCost(count: number): number {
  return count * TWILIO_COSTS.SMS_COST_EUR;
}

/**
 * Calcule les couts estimes pour les appels vocaux
 * Utilise une duree moyenne d'appel pour l'estimation
 */
function calculateVoiceCost(count: number): number {
  return count * TWILIO_COSTS.AVG_CALL_DURATION_MIN * TWILIO_COSTS.VOICE_COST_PER_MIN_EUR;
}

/**
 * Projette le cout mensuel basé sur les donnees actuelles
 */
function projectMonthlyCost(currentCost: number): number {
  const daysElapsed = getDaysElapsedInMonth();
  const daysInMonth = getDaysInCurrentMonth();

  if (daysElapsed === 0) return currentCost;

  return (currentCost / daysElapsed) * daysInMonth;
}

// ============================================================================
// STOCKAGE DES METRIQUES
// ============================================================================

/**
 * Stocke les metriques de cout dans Firestore
 */
async function storeCostMetrics(
  db: admin.firestore.Firestore,
  smsData: RateLimitData | null,
  voiceData: RateLimitData | null,
  monthlyAccumulated: { smsCount: number; voiceCount: number }
): Promise<void> {
  const now = new Date();
  const dateStr = getDateString(now);
  const period = getPeriodString(now);
  const timestamp = admin.firestore.Timestamp.now();

  const batch = db.batch();

  // Calcul des couts SMS
  const smsHourlyCount = smsData?.count || 0;
  const smsDailyCount = monthlyAccumulated.smsCount + smsHourlyCount;
  const smsHourlyCost = calculateSmsCost(smsHourlyCount);
  const smsMonthlyCost = calculateSmsCost(smsDailyCount);
  const smsProjectedMonthlyCost = projectMonthlyCost(smsMonthlyCost);

  // Calcul des couts Voice
  const voiceHourlyCount = voiceData?.count || 0;
  const voiceDailyCount = monthlyAccumulated.voiceCount + voiceHourlyCount;
  const voiceHourlyCost = calculateVoiceCost(voiceHourlyCount);
  const voiceMonthlyCost = calculateVoiceCost(voiceDailyCount);
  const voiceProjectedMonthlyCost = projectMonthlyCost(voiceMonthlyCost);

  // Totaux
  const totalHourlyCost = smsHourlyCost + voiceHourlyCost;
  const totalMonthlyCost = smsMonthlyCost + voiceMonthlyCost;
  const totalProjectedMonthlyCost = smsProjectedMonthlyCost + voiceProjectedMonthlyCost;

  // Document SMS
  const smsMetric: CostMetricData = {
    date: dateStr,
    period,
    service: "twilio",
    category: "sms",
    hourlyCount: smsHourlyCount,
    dailyCount: smsDailyCount,
    monthlyCount: smsDailyCount,
    estimatedCostEur: smsHourlyCost,
    monthlyEstimatedCostEur: smsProjectedMonthlyCost,
    budgetEur: MONTHLY_BUDGETS.SMS,
    budgetUsedPercent: (smsProjectedMonthlyCost / MONTHLY_BUDGETS.SMS) * 100,
    windowStart: smsData?.windowStart || null,
    aggregatedAt: timestamp,
  };

  // Document Voice
  const voiceMetric: CostMetricData = {
    date: dateStr,
    period,
    service: "twilio",
    category: "voice",
    hourlyCount: voiceHourlyCount,
    dailyCount: voiceDailyCount,
    monthlyCount: voiceDailyCount,
    estimatedCostEur: voiceHourlyCost,
    monthlyEstimatedCostEur: voiceProjectedMonthlyCost,
    budgetEur: MONTHLY_BUDGETS.VOICE,
    budgetUsedPercent: (voiceProjectedMonthlyCost / MONTHLY_BUDGETS.VOICE) * 100,
    windowStart: voiceData?.windowStart || null,
    aggregatedAt: timestamp,
  };

  // Document Total
  const totalMetric: CostMetricData = {
    date: dateStr,
    period,
    service: "twilio",
    category: "total",
    hourlyCount: smsHourlyCount + voiceHourlyCount,
    dailyCount: smsDailyCount + voiceDailyCount,
    monthlyCount: smsDailyCount + voiceDailyCount,
    estimatedCostEur: totalHourlyCost,
    monthlyEstimatedCostEur: totalProjectedMonthlyCost,
    budgetEur: MONTHLY_BUDGETS.TOTAL_TWILIO,
    budgetUsedPercent: (totalProjectedMonthlyCost / MONTHLY_BUDGETS.TOTAL_TWILIO) * 100,
    windowStart: null,
    aggregatedAt: timestamp,
  };

  // Stocker dans cost_metrics/{date}
  const dateRef = db.collection("cost_metrics").doc(dateStr);
  batch.set(
    dateRef,
    {
      date: dateStr,
      period,
      updatedAt: timestamp,
      twilio: {
        sms: smsMetric,
        voice: voiceMetric,
        total: totalMetric,
      },
    },
    { merge: true }
  );

  // Mettre a jour les cumuls mensuels
  const monthlyRef = db.collection("cost_metrics_monthly").doc(period);
  batch.set(
    monthlyRef,
    {
      period,
      smsCount: admin.firestore.FieldValue.increment(smsHourlyCount),
      voiceCount: admin.firestore.FieldValue.increment(voiceHourlyCount),
      smsEstimatedCostEur: smsMonthlyCost,
      voiceEstimatedCostEur: voiceMonthlyCost,
      totalEstimatedCostEur: totalMonthlyCost,
      projectedSmsEur: smsProjectedMonthlyCost,
      projectedVoiceEur: voiceProjectedMonthlyCost,
      projectedTotalEur: totalProjectedMonthlyCost,
      budgets: MONTHLY_BUDGETS,
      lastUpdatedAt: timestamp,
    },
    { merge: true }
  );

  // Stocker aussi dans la collection rate_limits pour compatibilite frontend
  const rateLimitsMetricRef = db.collection("rate_limits").doc("cost_summary");
  batch.set(
    rateLimitsMetricRef,
    {
      sms: smsMetric,
      voice: voiceMetric,
      total: totalMetric,
      updatedAt: timestamp,
    },
    { merge: true }
  );

  await batch.commit();

  logger.info(
    `[CostMetrics] Stored metrics for ${dateStr}: ` +
      `SMS: ${smsHourlyCount} (${smsHourlyCost.toFixed(2)} EUR), ` +
      `Voice: ${voiceHourlyCount} (${voiceHourlyCost.toFixed(2)} EUR), ` +
      `Monthly projected: ${totalProjectedMonthlyCost.toFixed(2)} EUR`
  );

  // Retourner les donnees pour verification des seuils
  return;
}

// ============================================================================
// GESTION DES ALERTES
// ============================================================================

/**
 * Verifie si une alerte similaire existe deja (non acknowledged) dans les dernieres 24h
 */
async function alertAlreadyExists(
  db: admin.firestore.Firestore,
  category: "sms" | "voice" | "total"
): Promise<boolean> {
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const existingAlerts = await db
    .collection("cost_alerts")
    .where("category", "==", category)
    .where("acknowledged", "==", false)
    .where("triggeredAt", ">=", admin.firestore.Timestamp.fromDate(oneDayAgo))
    .limit(1)
    .get();

  return !existingAlerts.empty;
}

/**
 * Cree une alerte de depassement de seuil
 */
async function createBudgetAlert(
  db: admin.firestore.Firestore,
  category: "sms" | "voice" | "total",
  currentValue: number,
  budget: number,
  percentUsed: number
): Promise<void> {
  // Verifier si une alerte similaire existe deja
  const alertExists = await alertAlreadyExists(db, category);
  if (alertExists) {
    logger.info(`[CostMetrics] Alert already exists for ${category}, skipping`);
    return;
  }

  const severity: "warning" | "critical" = percentUsed >= 100 ? "critical" : "warning";
  const alertType: "cost_threshold_warning" | "cost_budget_exceeded" =
    percentUsed >= 100 ? "cost_budget_exceeded" : "cost_threshold_warning";

  const categoryLabels = {
    sms: "SMS Twilio",
    voice: "Appels vocaux Twilio",
    total: "Services Twilio (total)",
  };

  const alert: AlertData = {
    type: alertType,
    severity,
    service: "twilio",
    category,
    title:
      percentUsed >= 100
        ? `BUDGET DEPASSE: ${categoryLabels[category]}`
        : `Alerte budget: ${categoryLabels[category]}`,
    message:
      percentUsed >= 100
        ? `Le budget mensuel de ${budget.toFixed(2)} EUR pour ${categoryLabels[category]} est depasse! ` +
          `Cout estime actuel: ${currentValue.toFixed(2)} EUR (${percentUsed.toFixed(1)}% du budget).`
        : `Le cout projete de ${categoryLabels[category]} atteint ${percentUsed.toFixed(1)}% du budget mensuel. ` +
          `Cout estime: ${currentValue.toFixed(2)} EUR / Budget: ${budget.toFixed(2)} EUR.`,
    currentValue,
    threshold: budget * (ALERT_THRESHOLD_PERCENT / 100),
    percentageOfThreshold: percentUsed,
    budget,
    currency: "EUR",
    triggeredAt: admin.firestore.Timestamp.now(),
    acknowledged: false,
    acknowledgedAt: null,
    acknowledgedBy: null,
  };

  await db.collection("cost_alerts").add(alert);

  // Creer aussi une alerte admin pour visibilite dans le dashboard
  await db.collection("admin_alerts").add({
    type: alertType,
    priority: severity === "critical" ? "critical" : "high",
    title: alert.title,
    message: alert.message,
    category: "cost",
    service: "twilio",
    costCategory: category,
    currentValue,
    budget,
    percentUsed,
    read: false,
    requiresAction: true,
    createdAt: admin.firestore.Timestamp.now(),
  });

  logger.warn(
    `[CostMetrics] ${severity.toUpperCase()} ALERT created: ${category} at ${percentUsed.toFixed(1)}% of budget`
  );
}

/**
 * Verifie les seuils et cree des alertes si necessaire
 */
async function checkThresholdsAndAlert(
  db: admin.firestore.Firestore,
  smsProjectedCost: number,
  voiceProjectedCost: number,
  totalProjectedCost: number
): Promise<void> {
  // Calculer les pourcentages
  const smsPercent = (smsProjectedCost / MONTHLY_BUDGETS.SMS) * 100;
  const voicePercent = (voiceProjectedCost / MONTHLY_BUDGETS.VOICE) * 100;
  const totalPercent = (totalProjectedCost / MONTHLY_BUDGETS.TOTAL_TWILIO) * 100;

  // Verifier SMS
  if (smsPercent >= ALERT_THRESHOLD_PERCENT) {
    await createBudgetAlert(db, "sms", smsProjectedCost, MONTHLY_BUDGETS.SMS, smsPercent);
  }

  // Verifier Voice
  if (voicePercent >= ALERT_THRESHOLD_PERCENT) {
    await createBudgetAlert(db, "voice", voiceProjectedCost, MONTHLY_BUDGETS.VOICE, voicePercent);
  }

  // Verifier Total
  if (totalPercent >= ALERT_THRESHOLD_PERCENT) {
    await createBudgetAlert(
      db,
      "total",
      totalProjectedCost,
      MONTHLY_BUDGETS.TOTAL_TWILIO,
      totalPercent
    );
  }
}

// ============================================================================
// FONCTION PRINCIPALE SCHEDULED
// ============================================================================

/**
 * Agregation des metriques de cout - Execute 1×/jour à 8h
 * 2025-01-16: Réduit à quotidien pour économies maximales
 */
/** Exported handler for consolidation */
export async function aggregateCostMetricsHandler(): Promise<void> {
  ensureInitialized();
  const startTime = Date.now();
  const db = admin.firestore();

  logger.info("[CostMetrics] Starting hourly cost metrics aggregation...");

  try {
    const rateLimits = await getRateLimitCounters(db);
    logger.info("[CostMetrics] Rate limits retrieved:", { sms: rateLimits.sms, voice: rateLimits.voice });
    const period = getPeriodString();
    const monthlyAccumulated = await getMonthlyAccumulatedCounts(db, period);
    const smsHourlyCount = rateLimits.sms?.count || 0;
    const voiceHourlyCount = rateLimits.voice?.count || 0;
    const smsMonthlyCost = calculateSmsCost(monthlyAccumulated.smsCount + smsHourlyCount);
    const voiceMonthlyCost = calculateVoiceCost(monthlyAccumulated.voiceCount + voiceHourlyCount);
    const smsProjectedCost = projectMonthlyCost(smsMonthlyCost);
    const voiceProjectedCost = projectMonthlyCost(voiceMonthlyCost);
    const totalProjectedCost = smsProjectedCost + voiceProjectedCost;
    await storeCostMetrics(db, rateLimits.sms, rateLimits.voice, monthlyAccumulated);
    await checkThresholdsAndAlert(db, smsProjectedCost, voiceProjectedCost, totalProjectedCost);
    await db.collection("system_logs").add({
      type: "cost_metrics_aggregation",
      success: true,
      smsCount: smsHourlyCount,
      voiceCount: voiceHourlyCount,
      smsProjectedCost, voiceProjectedCost, totalProjectedCost,
      executionTimeMs: Date.now() - startTime,
      createdAt: admin.firestore.Timestamp.now(),
    });
    logger.info(
      `[CostMetrics] Aggregation completed successfully in ${Date.now() - startTime}ms. ` +
        `Projected monthly cost: ${totalProjectedCost.toFixed(2)} EUR`
    );
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("[CostMetrics] Aggregation failed:", err);
    await db.collection("system_logs").add({
      type: "cost_metrics_aggregation",
      success: false,
      error: err.message,
      executionTimeMs: Date.now() - startTime,
      createdAt: admin.firestore.Timestamp.now(),
    });
    await db.collection("system_alerts").add({
      type: "cost_aggregation_failure",
      severity: "warning",
      message: `Cost metrics aggregation failed: ${err.message}`,
      acknowledged: false,
      createdAt: admin.firestore.Timestamp.now(),
    });
    throw error;
  }
}

export const aggregateCostMetrics = onSchedule(
  {
    schedule: "0 8 * * *", // 8h Paris tous les jours
    timeZone: "Europe/Paris",
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 120,
  },
  aggregateCostMetricsHandler
);

/**
 * Fonction callable pour declencher manuellement l'agregation (admin)
 */
export const triggerCostMetricsAggregation = async (): Promise<{
  success: boolean;
  message: string;
  data?: {
    smsProjectedCost: number;
    voiceProjectedCost: number;
    totalProjectedCost: number;
  };
}> => {
  ensureInitialized();
  const db = admin.firestore();

  try {
    const rateLimits = await getRateLimitCounters(db);
    const period = getPeriodString();
    const monthlyAccumulated = await getMonthlyAccumulatedCounts(db, period);

    const smsHourlyCount = rateLimits.sms?.count || 0;
    const voiceHourlyCount = rateLimits.voice?.count || 0;

    const smsMonthlyCost = calculateSmsCost(monthlyAccumulated.smsCount + smsHourlyCount);
    const voiceMonthlyCost = calculateVoiceCost(monthlyAccumulated.voiceCount + voiceHourlyCount);

    const smsProjectedCost = projectMonthlyCost(smsMonthlyCost);
    const voiceProjectedCost = projectMonthlyCost(voiceMonthlyCost);
    const totalProjectedCost = smsProjectedCost + voiceProjectedCost;

    await storeCostMetrics(db, rateLimits.sms, rateLimits.voice, monthlyAccumulated);
    await checkThresholdsAndAlert(db, smsProjectedCost, voiceProjectedCost, totalProjectedCost);

    return {
      success: true,
      message: "Cost metrics aggregated successfully",
      data: {
        smsProjectedCost,
        voiceProjectedCost,
        totalProjectedCost,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
