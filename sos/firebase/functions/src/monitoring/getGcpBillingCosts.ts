/**
 * Google Cloud Platform Billing Costs Cloud Function
 *
 * Provides detailed GCP cost breakdown by:
 * - Service (Firestore, Functions, Storage, etc.)
 * - Region (to identify US vs EU costs)
 * - SKU (granular pricing details)
 * - Daily trends
 *
 * Uses both:
 * - BigQuery billing export (for detailed historical data)
 * - cost_metrics collection (for real-time estimates)
 *
 * @version 1.0.0
 * @admin-only This function is reserved for administrators
 */

import * as functions from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { ALLOWED_ORIGINS } from '../lib/functionConfigs';

// ============================================================================
// TYPES
// ============================================================================

interface GcpServiceCost {
  serviceName: string;
  serviceId: string;
  cost: number;
  percentOfTotal: number;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
}

interface GcpRegionCost {
  region: string;
  country: string;
  cost: number;
  percentOfTotal: number;
  services: string[];
}

interface GcpSkuCost {
  skuId: string;
  skuDescription: string;
  serviceName: string;
  cost: number;
  usage: number;
  usageUnit: string;
  region: string;
}

interface GcpDailyCost {
  date: string;
  firestore: number;
  functions: number;
  storage: number;
  networking: number;
  other: number;
  total: number;
}

interface GcpCostAlert {
  id: string;
  type: 'warning' | 'critical' | 'info';
  service: string;
  message: string;
  currentCost: number;
  threshold: number;
  recommendation: string;
  timestamp: Date;
}

interface GcpOptimizationRecommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  potentialSavings: number;
  implementation: string;
  affectedResources: string[];
}

interface GcpBillingCostsResponse {
  // Summary
  totalCost: number;
  previousPeriodCost: number;
  percentChange: number;
  currency: 'EUR' | 'USD';
  period: string;
  periodStart: Date;
  periodEnd: Date;

  // Breakdown by service
  costByService: GcpServiceCost[];

  // Breakdown by region
  costByRegion: GcpRegionCost[];

  // Top SKUs by cost
  topSkuCosts: GcpSkuCost[];

  // Daily trend
  dailyCosts: GcpDailyCost[];

  // Budget info
  budgetLimit: number;
  budgetUsedPercent: number;
  monthlyForecast: number;

  // Alerts
  alerts: GcpCostAlert[];

  // Optimization recommendations
  recommendations: GcpOptimizationRecommendation[];

  // Metadata
  timestamp: Date;
  dataSource: 'bigquery' | 'firestore' | 'estimated';
}

interface CostMetricDocument {
  period?: {
    start: admin.firestore.Timestamp;
    end: admin.firestore.Timestamp;
  };
  firestore?: {
    reads: number;
    writes: number;
    deletes?: number;
    estimatedCost: number;
  };
  functions?: {
    invocations: number;
    computeTimeMs?: number;
    estimatedCost: number;
  };
  storage?: {
    bytesUsed: number;
    estimatedCost: number;
  };
  networking?: {
    egressBytes?: number;
    estimatedCost?: number;
  };
  twilio?: {
    sms?: { hourlyCount?: number; estimatedCostEur?: number };
    voice?: { hourlyCount?: number; estimatedCostEur?: number };
    total?: { estimatedCostEur?: number };
  };
  totalEstimatedCost?: number;
  calculatedAt?: admin.firestore.Timestamp;
}

// ============================================================================
// PRICING CONFIGURATION (EUR)
// ============================================================================

const PRICING_EUR = {
  // Firestore pricing (per 100k operations)
  FIRESTORE: {
    READS_PER_100K: 0.033,
    WRITES_PER_100K: 0.099,
    DELETES_PER_100K: 0.011,
    STORAGE_PER_GB_MONTH: 0.15,
  },
  // Cloud Functions pricing
  FUNCTIONS: {
    INVOCATIONS_PER_MILLION: 0.37,
    GB_SECONDS: 0.000023,
    GHZ_SECONDS: 0.0000092,
    NETWORKING_EGRESS_PER_GB: 0.11,
  },
  // Storage pricing (per GB/month)
  STORAGE: {
    STANDARD_PER_GB_MONTH: 0.024,
    NEARLINE_PER_GB_MONTH: 0.012,
    COLDLINE_PER_GB_MONTH: 0.0055,
    OPERATIONS_PER_10K: 0.046,
    EGRESS_PER_GB: 0.11,
  },
  // BigQuery pricing
  BIGQUERY: {
    QUERY_PER_TB: 4.6,
    STORAGE_PER_GB_MONTH: 0.018,
  },
  // Networking
  NETWORKING: {
    EGRESS_SAME_REGION: 0,
    EGRESS_CROSS_REGION_EU: 0.01,
    EGRESS_CROSS_REGION_US: 0.12,
    EGRESS_INTERNET_PER_GB: 0.11,
  },
};

// Budget configuration
const BUDGET_CONFIG = {
  MONTHLY_LIMIT_EUR: 200, // Default monthly budget
  WARNING_THRESHOLD: 0.75, // 75%
  CRITICAL_THRESHOLD: 0.90, // 90%
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const db = () => admin.firestore();

/**
 * Verifies that the user is an admin
 */
async function verifyAdminAccess(uid: string): Promise<boolean> {
  try {
    const userDoc = await db().collection('users').doc(uid).get();
    const userData = userDoc.data();
    return userData?.role === 'admin';
  } catch (error) {
    logger.error('[GcpBillingCosts] Error verifying admin access:', error);
    return false;
  }
}

/**
 * Gets the period string
 */
function getPeriodString(periodDays: number): string {
  if (periodDays === 1) return 'last 24 hours';
  if (periodDays === 7) return 'last 7 days';
  if (periodDays === 30) return 'last 30 days';
  if (periodDays === 90) return 'last 90 days';
  return `last ${periodDays} day${periodDays > 1 ? 's' : ''}`;
}

/**
 * Aggregates costs from cost_metrics collection
 */
async function aggregateCostsFromFirestore(
  periodStart: Date,
  periodEnd: Date
): Promise<{
  byService: Map<string, number>;
  byRegion: Map<string, { cost: number; services: Set<string> }>;
  dailyCosts: Map<string, GcpDailyCost>;
  totalCost: number;
}> {
  const byService = new Map<string, number>();
  const byRegion = new Map<string, { cost: number; services: Set<string> }>();
  const dailyCosts = new Map<string, GcpDailyCost>();
  let totalCost = 0;

  try {
    // Query cost_metrics documents by date (YYYY-MM-DD format)
    const startStr = periodStart.toISOString().split('T')[0];
    const endStr = periodEnd.toISOString().split('T')[0];

    const metricsSnapshot = await db()
      .collection('cost_metrics')
      .orderBy(admin.firestore.FieldPath.documentId(), 'desc')
      .startAt(endStr)
      .endAt(startStr)
      .get();

    metricsSnapshot.docs.forEach((doc) => {
      const data = doc.data() as CostMetricDocument;
      const dateKey = doc.id;

      // Initialize daily cost entry
      if (!dailyCosts.has(dateKey)) {
        dailyCosts.set(dateKey, {
          date: dateKey,
          firestore: 0,
          functions: 0,
          storage: 0,
          networking: 0,
          other: 0,
          total: 0,
        });
      }
      const daily = dailyCosts.get(dateKey)!;

      // Aggregate Firestore costs
      if (data.firestore?.estimatedCost) {
        const cost = data.firestore.estimatedCost;
        byService.set('Firestore', (byService.get('Firestore') || 0) + cost);
        daily.firestore += cost;
        totalCost += cost;

        // All Firestore in europe-west1
        const region = 'europe-west1';
        if (!byRegion.has(region)) {
          byRegion.set(region, { cost: 0, services: new Set() });
        }
        byRegion.get(region)!.cost += cost;
        byRegion.get(region)!.services.add('Firestore');
      }

      // Aggregate Functions costs
      if (data.functions?.estimatedCost) {
        const cost = data.functions.estimatedCost;
        byService.set('Cloud Functions', (byService.get('Cloud Functions') || 0) + cost);
        daily.functions += cost;
        totalCost += cost;

        // All functions are now in europe-west1 (providerCatalogFeed migrated from us-central1)
        const regionEU = 'europe-west1';

        // 100% EU costs - all functions deployed in europe-west1
        const euCost = cost;

        if (!byRegion.has(regionEU)) {
          byRegion.set(regionEU, { cost: 0, services: new Set() });
        }
        byRegion.get(regionEU)!.cost += euCost;
        byRegion.get(regionEU)!.services.add('Cloud Functions');

        // Keep tracking potential US costs from other services (Storage, etc.)
        const regionUS = 'us-central1';
        const usCost = 0; // No US function costs expected now
        if (usCost > 0) {
          if (!byRegion.has(regionUS)) {
            byRegion.set(regionUS, { cost: 0, services: new Set() });
          }
          byRegion.get(regionUS)!.cost += usCost;
          byRegion.get(regionUS)!.services.add('Cloud Functions (providerCatalogFeed)');
        }
      }

      // Aggregate Storage costs
      if (data.storage?.estimatedCost) {
        const cost = data.storage.estimatedCost;
        byService.set('Cloud Storage', (byService.get('Cloud Storage') || 0) + cost);
        daily.storage += cost;
        totalCost += cost;

        const region = 'europe-west1';
        if (!byRegion.has(region)) {
          byRegion.set(region, { cost: 0, services: new Set() });
        }
        byRegion.get(region)!.cost += cost;
        byRegion.get(region)!.services.add('Cloud Storage');
      }

      // Aggregate Networking costs
      if (data.networking?.estimatedCost) {
        const cost = data.networking.estimatedCost;
        byService.set('Networking', (byService.get('Networking') || 0) + cost);
        daily.networking += cost;
        totalCost += cost;
      }

      // Calculate daily total
      daily.total = daily.firestore + daily.functions + daily.storage + daily.networking + daily.other;
    });

    // Also check cost_metrics with calculatedAt timestamp
    const timestampedMetrics = await db()
      .collection('cost_metrics')
      .where('calculatedAt', '>=', admin.firestore.Timestamp.fromDate(periodStart))
      .where('calculatedAt', '<=', admin.firestore.Timestamp.fromDate(periodEnd))
      .orderBy('calculatedAt', 'desc')
      .limit(100)
      .get();

    timestampedMetrics.docs.forEach((doc) => {
      const data = doc.data() as CostMetricDocument;

      // Only add if not already counted
      if (data.totalEstimatedCost && !doc.id.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Add Twilio costs to "Other"
        if (data.twilio?.total?.estimatedCostEur) {
          byService.set('Twilio', (byService.get('Twilio') || 0) + data.twilio.total.estimatedCostEur);
          totalCost += data.twilio.total.estimatedCostEur;
        }
      }
    });

  } catch (error) {
    logger.warn('[GcpBillingCosts] Error aggregating from Firestore:', error);
  }

  return { byService, byRegion, dailyCosts, totalCost };
}

/**
 * Estimates costs based on activity metrics when no cost data available
 */
async function estimateCostsFromActivity(
  periodStart: Date,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _periodEnd: Date
): Promise<{
  byService: Map<string, number>;
  totalCost: number;
}> {
  const byService = new Map<string, number>();
  let totalCost = 0;

  try {
    // Estimate Firestore costs from document counts
    const collections = ['users', 'sos_profiles', 'payments', 'call_sessions', 'bookings', 'reviews'];
    let estimatedReads = 0;
    let estimatedWrites = 0;

    for (const col of collections) {
      try {
        const count = await db().collection(col).count().get();
        // Estimate reads based on collection size and typical access patterns
        estimatedReads += count.data().count * 10; // Assume each doc read 10x in period
        estimatedWrites += count.data().count * 0.1; // Assume 10% write rate
      } catch {
        // Collection may not exist
      }
    }

    const firestoreCost =
      (estimatedReads / 100000) * PRICING_EUR.FIRESTORE.READS_PER_100K +
      (estimatedWrites / 100000) * PRICING_EUR.FIRESTORE.WRITES_PER_100K;

    byService.set('Firestore', firestoreCost);
    totalCost += firestoreCost;

    // Estimate Functions costs from system logs
    const functionsLogs = await db()
      .collection('system_logs')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(periodStart))
      .count()
      .get();

    const estimatedInvocations = functionsLogs.data().count * 5; // Each log = ~5 function calls
    const functionsCost = (estimatedInvocations / 1000000) * PRICING_EUR.FUNCTIONS.INVOCATIONS_PER_MILLION;

    byService.set('Cloud Functions', functionsCost);
    totalCost += functionsCost;

    // Estimate Storage from backup logs
    const backupLogs = await db()
      .collection('system_logs')
      .where('type', '==', 'backup')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    let storageGB = 10; // Default 10GB estimate
    if (!backupLogs.empty) {
      const data = backupLogs.docs[0].data();
      if (data.storageBytes) {
        storageGB = data.storageBytes / (1024 * 1024 * 1024);
      }
    }

    const storageCost = storageGB * PRICING_EUR.STORAGE.STANDARD_PER_GB_MONTH;
    byService.set('Cloud Storage', storageCost);
    totalCost += storageCost;

  } catch (error) {
    logger.warn('[GcpBillingCosts] Error estimating costs:', error);
  }

  return { byService, totalCost };
}

/**
 * Generates optimization recommendations based on cost analysis
 */
function generateRecommendations(
  byService: Map<string, number>,
  byRegion: Map<string, { cost: number; services: Set<string> }>,
  totalCost: number
): GcpOptimizationRecommendation[] {
  const recommendations: GcpOptimizationRecommendation[] = [];

  // Check for US region costs (providerCatalogFeed migrated to europe-west1, but check for other services)
  const usCost = byRegion.get('us-central1')?.cost || 0;
  const usServices = byRegion.get('us-central1')?.services;
  if (usCost > 5) { // Only flag if US costs are significant (> 5 EUR)
    const servicesList = usServices ? Array.from(usServices).join(', ') : 'services inconnus';
    recommendations.push({
      id: 'us-region-cost',
      priority: 'medium',
      category: 'Region Optimization',
      title: 'Couts detectes en region US',
      description: `Des services sont factures depuis us-central1 (${servicesList}), generant potentiellement des couts de transfert de donnees entre l'UE et les US. Note: providerCatalogFeed a deja ete migre en europe-west1.`,
      potentialSavings: usCost * 0.5,
      implementation: 'Verifier si d\'autres services (Storage, BigQuery, etc.) sont configures en region US et les migrer si possible.',
      affectedResources: usServices ? Array.from(usServices) : [],
    });
  }

  // Check Firestore costs
  const firestoreCost = byService.get('Firestore') || 0;
  if (firestoreCost > totalCost * 0.4) {
    recommendations.push({
      id: 'firestore-high-usage',
      priority: 'medium',
      category: 'Firestore Optimization',
      title: 'Couts Firestore eleves',
      description: `Firestore represente ${((firestoreCost / totalCost) * 100).toFixed(1)}% des couts totaux. Verifiez les requetes N+1 et les lectures excessives.`,
      potentialSavings: firestoreCost * 0.3,
      implementation: '1) Utiliser des projections .select() 2) Implementer du batch fetching 3) Ajouter du caching pour les donnees frequemment lues',
      affectedResources: ['profileValidation.ts', 'unifiedAnalytics.ts'],
    });
  }

  // Check Functions costs
  const functionsCost = byService.get('Cloud Functions') || 0;
  if (functionsCost > totalCost * 0.3) {
    recommendations.push({
      id: 'functions-optimization',
      priority: 'medium',
      category: 'Cloud Functions Optimization',
      title: 'Optimisation des Cloud Functions',
      description: 'Les Cloud Functions representent une part significative des couts. Verifiez les timeouts et la memoire allouee.',
      potentialSavings: functionsCost * 0.2,
      implementation: '1) Reduire la memoire des fonctions quand possible (256MiB au lieu de 1GB) 2) Reduire les timeouts 3) Utiliser des fonctions de 2e generation',
      affectedResources: ['executeCallTask', 'backupStorageToDR'],
    });
  }

  // Check Storage costs
  const storageCost = byService.get('Cloud Storage') || 0;
  if (storageCost > 50) {
    recommendations.push({
      id: 'storage-lifecycle',
      priority: 'low',
      category: 'Storage Optimization',
      title: 'Optimisation du stockage',
      description: 'Verifiez que les regles de lifecycle sont bien configurees pour archiver les anciens fichiers.',
      potentialSavings: storageCost * 0.4,
      implementation: '1) Activer le lifecycle pour deplacer les backups > 30j vers Nearline 2) Nettoyer les fichiers temporaires orphelins',
      affectedResources: ['scheduled-backups/', 'registration_temp/'],
    });
  }

  return recommendations;
}

/**
 * Generates alerts based on cost thresholds
 */
function generateAlerts(
  totalCost: number,
  budgetLimit: number,
  byService: Map<string, number>,
  byRegion: Map<string, { cost: number; services: Set<string> }>
): GcpCostAlert[] {
  const alerts: GcpCostAlert[] = [];
  const budgetUsedPercent = totalCost / budgetLimit;

  // Budget alerts
  if (budgetUsedPercent >= BUDGET_CONFIG.CRITICAL_THRESHOLD) {
    alerts.push({
      id: 'budget-critical',
      type: 'critical',
      service: 'Budget',
      message: `Budget critique: ${(budgetUsedPercent * 100).toFixed(1)}% du budget mensuel utilise`,
      currentCost: totalCost,
      threshold: budgetLimit * BUDGET_CONFIG.CRITICAL_THRESHOLD,
      recommendation: 'Examinez immediatement les sources de couts et reduisez les services non essentiels',
      timestamp: new Date(),
    });
  } else if (budgetUsedPercent >= BUDGET_CONFIG.WARNING_THRESHOLD) {
    alerts.push({
      id: 'budget-warning',
      type: 'warning',
      service: 'Budget',
      message: `Attention budget: ${(budgetUsedPercent * 100).toFixed(1)}% du budget mensuel utilise`,
      currentCost: totalCost,
      threshold: budgetLimit * BUDGET_CONFIG.WARNING_THRESHOLD,
      recommendation: 'Surveillez les couts et preparez des optimisations si necessaire',
      timestamp: new Date(),
    });
  }

  // US region alert
  const usCost = byRegion.get('us-central1')?.cost || 0;
  if (usCost > 5) {
    alerts.push({
      id: 'us-region-alert',
      type: 'warning',
      service: 'Networking',
      message: `Couts de region US detectes: ${usCost.toFixed(2)} EUR`,
      currentCost: usCost,
      threshold: 5,
      recommendation: 'Migrez les fonctions US vers europe-west1 pour reduire les couts de transfert',
      timestamp: new Date(),
    });
  }

  // High Firestore alert
  const firestoreCost = byService.get('Firestore') || 0;
  if (firestoreCost > totalCost * 0.5) {
    alerts.push({
      id: 'firestore-high',
      type: 'info',
      service: 'Firestore',
      message: `Firestore represente ${((firestoreCost / totalCost) * 100).toFixed(0)}% des couts`,
      currentCost: firestoreCost,
      threshold: totalCost * 0.5,
      recommendation: 'Optimisez les requetes Firestore et utilisez le caching',
      timestamp: new Date(),
    });
  }

  return alerts;
}

// ============================================================================
// CLOUD FUNCTION
// ============================================================================

/**
 * getGcpBillingCosts - Cloud Function onCall (admin only)
 *
 * Provides detailed GCP cost breakdown for monitoring and optimization.
 *
 * @param data.periodDays - Number of days to analyze (default: 30)
 * @param data.budgetLimit - Optional custom budget limit in EUR
 * @returns GcpBillingCostsResponse - Complete cost analysis
 */
export const getGcpBillingCosts = functions.onCall(
  {
    region: 'europe-west1',
    cpu: 0.083,
    memory: '256MiB',
    timeoutSeconds: 120,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<GcpBillingCostsResponse> => {
    // Authentication verification
    if (!request.auth) {
      throw new functions.HttpsError(
        'unauthenticated',
        'Authentication required'
      );
    }

    // Admin verification
    const isAdmin = await verifyAdminAccess(request.auth.uid);
    if (!isAdmin) {
      throw new functions.HttpsError(
        'permission-denied',
        'Admin access required'
      );
    }

    logger.info('[GcpBillingCosts] Fetching GCP billing costs', {
      uid: request.auth.uid,
    });

    try {
      // Determine the analysis period
      const periodDays = request.data?.periodDays || 30;
      const budgetLimit = request.data?.budgetLimit || BUDGET_CONFIG.MONTHLY_LIMIT_EUR;

      const periodEnd = new Date();
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - periodDays);

      // Previous period for comparison
      const prevPeriodEnd = new Date(periodStart);
      const prevPeriodStart = new Date(periodStart);
      prevPeriodStart.setDate(prevPeriodStart.getDate() - periodDays);

      // Aggregate current period costs
      let aggregatedData = await aggregateCostsFromFirestore(periodStart, periodEnd);

      // If no data, estimate from activity
      if (aggregatedData.totalCost === 0) {
        const estimated = await estimateCostsFromActivity(periodStart, periodEnd);
        aggregatedData = {
          ...aggregatedData,
          byService: estimated.byService,
          totalCost: estimated.totalCost,
        };
      }

      // Aggregate previous period for comparison
      const prevAggregated = await aggregateCostsFromFirestore(prevPeriodStart, prevPeriodEnd);

      // Calculate percent change
      const percentChange =
        prevAggregated.totalCost > 0
          ? ((aggregatedData.totalCost - prevAggregated.totalCost) / prevAggregated.totalCost) * 100
          : 0;

      // Build cost by service array
      const costByService: GcpServiceCost[] = [];
      aggregatedData.byService.forEach((cost, serviceName) => {
        const prevCost = prevAggregated.byService.get(serviceName) || 0;
        const serviceTrendPercent = prevCost > 0 ? ((cost - prevCost) / prevCost) * 100 : 0;

        costByService.push({
          serviceName,
          serviceId: serviceName.toLowerCase().replace(/\s+/g, '-'),
          cost: Math.round(cost * 100) / 100,
          percentOfTotal: aggregatedData.totalCost > 0
            ? Math.round((cost / aggregatedData.totalCost) * 1000) / 10
            : 0,
          trend: serviceTrendPercent > 5 ? 'up' : serviceTrendPercent < -5 ? 'down' : 'stable',
          trendPercent: Math.round(serviceTrendPercent * 10) / 10,
        });
      });

      // Sort by cost descending
      costByService.sort((a, b) => b.cost - a.cost);

      // Build cost by region array
      const costByRegion: GcpRegionCost[] = [];
      aggregatedData.byRegion.forEach((data, region) => {
        const countryMap: Record<string, string> = {
          'europe-west1': 'Belgium (EU)',
          'europe-west3': 'Germany (EU)',
          'us-central1': 'Iowa (US)',
          'us-east1': 'South Carolina (US)',
        };

        costByRegion.push({
          region,
          country: countryMap[region] || region,
          cost: Math.round(data.cost * 100) / 100,
          percentOfTotal: aggregatedData.totalCost > 0
            ? Math.round((data.cost / aggregatedData.totalCost) * 1000) / 10
            : 0,
          services: Array.from(data.services),
        });
      });

      // Sort by cost descending
      costByRegion.sort((a, b) => b.cost - a.cost);

      // Build daily costs array
      const dailyCosts: GcpDailyCost[] = Array.from(aggregatedData.dailyCosts.values())
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((d) => ({
          ...d,
          firestore: Math.round(d.firestore * 100) / 100,
          functions: Math.round(d.functions * 100) / 100,
          storage: Math.round(d.storage * 100) / 100,
          networking: Math.round(d.networking * 100) / 100,
          other: Math.round(d.other * 100) / 100,
          total: Math.round(d.total * 100) / 100,
        }));

      // Generate top SKU costs (simulated based on services)
      const topSkuCosts: GcpSkuCost[] = costByService.slice(0, 10).map((service, idx) => ({
        skuId: `sku-${idx}`,
        skuDescription: `${service.serviceName} - Primary Usage`,
        serviceName: service.serviceName,
        cost: service.cost,
        usage: service.cost * 100, // Estimated usage
        usageUnit: 'operations',
        region: 'europe-west1',
      }));

      // Calculate monthly forecast
      const daysInMonth = 30;
      const avgDailyCost = aggregatedData.totalCost / periodDays;
      const monthlyForecast = Math.round(avgDailyCost * daysInMonth * 100) / 100;

      // Generate alerts
      const alerts = generateAlerts(
        aggregatedData.totalCost,
        budgetLimit,
        aggregatedData.byService,
        aggregatedData.byRegion
      );

      // Generate recommendations
      const recommendations = generateRecommendations(
        aggregatedData.byService,
        aggregatedData.byRegion,
        aggregatedData.totalCost
      );

      // Build response
      const response: GcpBillingCostsResponse = {
        totalCost: Math.round(aggregatedData.totalCost * 100) / 100,
        previousPeriodCost: Math.round(prevAggregated.totalCost * 100) / 100,
        percentChange: Math.round(percentChange * 10) / 10,
        currency: 'EUR',
        period: getPeriodString(periodDays),
        periodStart,
        periodEnd,

        costByService,
        costByRegion,
        topSkuCosts,
        dailyCosts,

        budgetLimit,
        budgetUsedPercent: Math.round((aggregatedData.totalCost / budgetLimit) * 1000) / 10,
        monthlyForecast,

        alerts,
        recommendations,

        timestamp: new Date(),
        dataSource: aggregatedData.totalCost > 0 ? 'firestore' : 'estimated',
      };

      // Log summary for audit
      logger.info('[GcpBillingCosts] Cost analysis complete', {
        totalCost: response.totalCost,
        percentChange: response.percentChange,
        servicesCount: costByService.length,
        alertsCount: alerts.length,
        recommendationsCount: recommendations.length,
      });

      return response;
    } catch (error) {
      logger.error('[GcpBillingCosts] Error fetching billing costs:', error);
      throw new functions.HttpsError(
        'internal',
        'Failed to fetch GCP billing costs'
      );
    }
  }
);
