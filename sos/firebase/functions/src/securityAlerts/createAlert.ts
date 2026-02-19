/**
 * Service principal de création d'alertes de sécurité SOS Expat
 * Orchestre le rate limiting, l'agrégation et la notification
 */

import { Timestamp } from 'firebase-admin/firestore';
import { db } from '../firebaseAdmin';
import {
  SecurityAlertType,
  SecurityAlert,
  SecurityAlertPayload,
  AlertSeverity,
  ThreatCategory,
  SecurityAlertContext,
  CATEGORY_FROM_TYPE,
  SEVERITY_PRIORITY,
} from './types';
import {
  checkRateLimit,
  generateRateLimitKey,
  updateRateLimitAfterAlert,
  shouldBypassRateLimit,
} from './rateLimiter';
import {
  createOrAggregateAlert,
  shouldNotifyForAggregatedAlert,
} from './aggregator';

// ==========================================
// RÉSULTAT DE CRÉATION D'ALERTE
// ==========================================

export interface CreateAlertResult {
  success: boolean;
  alertId?: string;
  mode: 'created' | 'aggregated' | 'rate_limited' | 'suppressed';
  aggregationCount: number;
  shouldNotify: boolean;
  shouldEscalate: boolean;
  rateLimitInfo?: {
    currentCount: number;
    maxAllowed: number;
    retryAfterMs?: number;
  };
  error?: string;
}

// ==========================================
// VALIDATION DU PAYLOAD
// ==========================================

function validatePayload(payload: SecurityAlertPayload): string | null {
  if (!payload.type) {
    return 'Missing required field: type';
  }

  if (!payload.severity) {
    return 'Missing required field: severity';
  }

  const validSeverities: AlertSeverity[] = ['info', 'warning', 'critical', 'emergency'];
  if (!validSeverities.includes(payload.severity)) {
    return `Invalid severity: ${payload.severity}`;
  }

  if (!payload.context) {
    return 'Missing required field: context';
  }

  return null;
}

// ==========================================
// ENRICHISSEMENT DU CONTEXTE
// ==========================================

function enrichContext(context: SecurityAlertContext): SecurityAlertContext {
  return {
    ...context,
    timestamp: context.timestamp || new Date().toISOString(),
  };
}

// ==========================================
// DÉTERMINATION DE LA CATÉGORIE
// ==========================================

function getCategory(
  alertType: SecurityAlertType,
  explicitCategory?: ThreatCategory
): ThreatCategory {
  if (explicitCategory) {
    return explicitCategory;
  }

  return CATEGORY_FROM_TYPE[alertType] || 'system';
}

// ==========================================
// CALCUL AUTOMATIQUE DE LA SÉVÉRITÉ
// ==========================================

interface SeverityFactors {
  riskScore?: number;
  attemptCount?: number;
  isRecurring?: boolean;
  affectsMultipleUsers?: boolean;
  involvesMoney?: boolean;
}

function calculateSeverity(
  baseSeverity: AlertSeverity,
  factors: SeverityFactors
): AlertSeverity {
  let severityLevel = SEVERITY_PRIORITY[baseSeverity];

  // Augmenter basé sur le risk score
  if (factors.riskScore) {
    if (factors.riskScore >= 80) severityLevel = Math.max(severityLevel, 3);
    else if (factors.riskScore >= 60) severityLevel = Math.max(severityLevel, 2);
    else if (factors.riskScore >= 40) severityLevel = Math.max(severityLevel, 1);
  }

  // Augmenter basé sur le nombre de tentatives
  if (factors.attemptCount && factors.attemptCount > 10) {
    severityLevel = Math.min(3, severityLevel + 1);
  }

  // Augmenter si récurrent
  if (factors.isRecurring) {
    severityLevel = Math.min(3, severityLevel + 1);
  }

  // Augmenter si affecte plusieurs utilisateurs
  if (factors.affectsMultipleUsers) {
    severityLevel = Math.min(3, severityLevel + 1);
  }

  // Augmenter si implique de l'argent
  if (factors.involvesMoney) {
    severityLevel = Math.min(3, severityLevel + 1);
  }

  // Mapper vers la sévérité
  const severityMap: AlertSeverity[] = ['info', 'warning', 'critical', 'emergency'];
  return severityMap[Math.min(severityLevel, 3)];
}

// ==========================================
// CRÉATION D'ALERTE PRINCIPALE
// ==========================================

/**
 * Crée une nouvelle alerte de sécurité avec rate limiting et agrégation
 */
export async function createSecurityAlert(
  payload: SecurityAlertPayload
): Promise<CreateAlertResult> {
  // Validation
  const validationError = validatePayload(payload);
  if (validationError) {
    return {
      success: false,
      mode: 'suppressed',
      aggregationCount: 0,
      shouldNotify: false,
      shouldEscalate: false,
      error: validationError,
    };
  }

  const { type, severity: baseSeverity, context, source, forceNotify, aggregationKey } = payload;

  // Enrichir le contexte
  const enrichedContext = enrichContext(context);

  // Déterminer la catégorie
  const category = getCategory(type, payload.category);

  // Calculer la sévérité finale
  const finalSeverity = calculateSeverity(baseSeverity, {
    riskScore: context.riskScore,
    attemptCount: context.attemptCount,
    involvesMoney: Boolean(context.amount),
  });

  // Vérifier le rate limiting (sauf bypass)
  if (!shouldBypassRateLimit(type, finalSeverity, forceNotify)) {
    const rateLimitKey = generateRateLimitKey({
      alertType: type,
      sourceIp: source?.ip || context.ip,
      userId: source?.userId || context.userId,
      endpoint: context.endpoint,
    });

    const rateLimitResult = await checkRateLimit(type, rateLimitKey);

    if (!rateLimitResult.allowed) {
      console.log(`[CreateAlert] Rate limited: ${type} for key ${rateLimitKey}`);
      return {
        success: false,
        mode: 'rate_limited',
        aggregationCount: 0,
        shouldNotify: false,
        shouldEscalate: false,
        rateLimitInfo: {
          currentCount: rateLimitResult.currentCount,
          maxAllowed: rateLimitResult.maxAllowed,
          retryAfterMs: rateLimitResult.retryAfterMs,
        },
      };
    }
  }

  // Préparer les données de base de l'alerte
  const alertSource: SecurityAlert['source'] = {
    ip: source?.ip || context.ip,
    userId: source?.userId || context.userId,
    userEmail: source?.userEmail || context.userEmail,
    userAgent: source?.userAgent || context.userAgent,
    country: source?.country || context.country,
    city: context.city,
    isp: context.geoLocation?.isp,
    deviceFingerprint: source?.deviceFingerprint,
  };

  const baseAlertData: Partial<SecurityAlert> = {
    type,
    category,
    severity: finalSeverity,
    status: 'pending',
    escalation: {
      level: 0,
      notificationsSent: {
        email: false,
        sms: false,
        push: false,
        inapp: false,
        slack: false,
      },
    },
    processed: false,
  };

  try {
    // Créer ou agréger l'alerte
    const result = await createOrAggregateAlert(
      type,
      enrichedContext,
      alertSource,
      baseAlertData,
      aggregationKey
    );

    // Mettre à jour le rate limit après création réussie
    if (result.mode === 'created') {
      const rateLimitKey = generateRateLimitKey({
        alertType: type,
        sourceIp: alertSource.ip,
        userId: alertSource.userId,
        endpoint: context.endpoint,
      });
      await updateRateLimitAfterAlert(rateLimitKey, result.alertId);
    }

    // Déterminer si on doit notifier
    const shouldNotify = forceNotify ||
      result.shouldNotify ||
      shouldNotifyForAggregatedAlert(type, result.aggregationCount, finalSeverity);

    console.log(`[CreateAlert] ${result.mode}: ${type} (${result.alertId}), ` +
      `count=${result.aggregationCount}, notify=${shouldNotify}`);

    return {
      success: true,
      alertId: result.alertId,
      mode: result.mode,
      aggregationCount: result.aggregationCount,
      shouldNotify,
      shouldEscalate: result.shouldEscalate,
    };
  } catch (error) {
    console.error('[CreateAlert] Error creating alert:', error);
    return {
      success: false,
      mode: 'suppressed',
      aggregationCount: 0,
      shouldNotify: false,
      shouldEscalate: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ==========================================
// CRÉATION D'ALERTES EN BATCH
// ==========================================

export interface BatchAlertResult {
  total: number;
  created: number;
  aggregated: number;
  rateLimited: number;
  failed: number;
  alerts: CreateAlertResult[];
}

/**
 * Crée plusieurs alertes en batch
 */
export async function createSecurityAlertsBatch(
  payloads: SecurityAlertPayload[]
): Promise<BatchAlertResult> {
  const results: CreateAlertResult[] = [];
  let created = 0, aggregated = 0, rateLimited = 0, failed = 0;

  for (const payload of payloads) {
    const result = await createSecurityAlert(payload);
    results.push(result);

    if (result.success) {
      if (result.mode === 'created') created++;
      else if (result.mode === 'aggregated') aggregated++;
    } else {
      if (result.mode === 'rate_limited') rateLimited++;
      else failed++;
    }
  }

  return {
    total: payloads.length,
    created,
    aggregated,
    rateLimited,
    failed,
    alerts: results,
  };
}

// ==========================================
// HELPERS POUR TYPES SPÉCIFIQUES
// ==========================================

/**
 * Crée une alerte de brute force
 */
export async function createBruteForceAlert(params: {
  ip: string;
  userId?: string;
  userEmail?: string;
  attemptCount: number;
  targetResource: string;
}): Promise<CreateAlertResult> {
  return createSecurityAlert({
    type: 'security.brute_force_detected',
    severity: params.attemptCount > 20 ? 'critical' : 'warning',
    context: {
      timestamp: new Date().toISOString(),
      ip: params.ip,
      userId: params.userId,
      userEmail: params.userEmail,
      attemptCount: params.attemptCount,
      affectedResource: params.targetResource,
    },
    source: {
      ip: params.ip,
      userId: params.userId,
      userEmail: params.userEmail,
    },
  });
}

/**
 * Crée une alerte de connexion inhabituelle
 */
export async function createUnusualLocationAlert(params: {
  userId: string;
  userEmail: string;
  ip: string;
  country: string;
  countryName: string;
  city?: string;
  previousCountry: string;
  distanceKm?: number;
  isVPN?: boolean;
  isTor?: boolean;
}): Promise<CreateAlertResult> {
  const severity: AlertSeverity = params.isTor ? 'critical' :
    params.isVPN ? 'warning' : 'info';

  return createSecurityAlert({
    type: 'security.unusual_location',
    severity,
    context: {
      timestamp: new Date().toISOString(),
      userId: params.userId,
      userEmail: params.userEmail,
      ip: params.ip,
      country: params.country,
      countryName: params.countryName,
      city: params.city,
      previousCountry: params.previousCountry,
      distanceKm: params.distanceKm,
      geoLocation: {
        country: params.country,
        countryName: params.countryName,
        city: params.city,
        isVPN: params.isVPN,
        isTor: params.isTor,
      },
    },
    source: {
      userId: params.userId,
      userEmail: params.userEmail,
      ip: params.ip,
      country: params.country,
    },
  });
}

/**
 * Crée une alerte de paiement suspect
 */
export async function createSuspiciousPaymentAlert(params: {
  userId: string;
  userEmail: string;
  ip: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentId: string;
  riskFactors: string[];
  riskScore: number;
}): Promise<CreateAlertResult> {
  const severity: AlertSeverity = params.riskScore >= 80 ? 'emergency' :
    params.riskScore >= 60 ? 'critical' : 'warning';

  return createSecurityAlert({
    type: 'security.suspicious_payment',
    severity,
    context: {
      timestamp: new Date().toISOString(),
      userId: params.userId,
      userEmail: params.userEmail,
      ip: params.ip,
      amount: params.amount,
      currency: params.currency,
      paymentMethod: params.paymentMethod,
      paymentId: params.paymentId,
      riskFactors: params.riskFactors,
      riskScore: params.riskScore,
    },
    source: {
      userId: params.userId,
      userEmail: params.userEmail,
      ip: params.ip,
    },
    forceNotify: params.riskScore >= 80,
  });
}

/**
 * Crée une alerte d'abus API
 */
export async function createApiAbuseAlert(params: {
  ip: string;
  userId?: string;
  endpoint: string;
  requestCount: number;
  timeWindow: string;
  attackType?: string;
  userAgent?: string;
}): Promise<CreateAlertResult> {
  const severity: AlertSeverity = params.attackType ? 'critical' : 'warning';

  return createSecurityAlert({
    type: params.attackType === 'sql_injection' ? 'security.sql_injection' :
      params.attackType === 'xss' ? 'security.xss_attempt' : 'security.api_abuse',
    severity,
    context: {
      timestamp: new Date().toISOString(),
      ip: params.ip,
      userId: params.userId,
      endpoint: params.endpoint,
      requestCount: params.requestCount,
      timeWindow: params.timeWindow,
      attackType: params.attackType,
      userAgent: params.userAgent,
    },
    source: {
      ip: params.ip,
      userId: params.userId,
      userAgent: params.userAgent,
    },
  });
}

/**
 * Crée une alerte système critique
 */
export async function createSystemCriticalAlert(params: {
  systemName: string;
  issueType: string;
  errorRate?: number;
  latencyMs?: number;
  affectedResource?: string;
  details?: string;
}): Promise<CreateAlertResult> {
  return createSecurityAlert({
    type: 'security.system_critical',
    severity: 'emergency',
    context: {
      timestamp: new Date().toISOString(),
      systemName: params.systemName,
      issueType: params.issueType,
      errorRate: params.errorRate,
      latencyMs: params.latencyMs,
      affectedResource: params.affectedResource,
    },
    forceNotify: true,
  });
}

/**
 * Crée une alerte de tentative de breach
 */
export async function createDataBreachAlert(params: {
  ip: string;
  userId?: string;
  userEmail?: string;
  affectedResource: string;
  attackType: string;
  payloadSnippet?: string;
}): Promise<CreateAlertResult> {
  return createSecurityAlert({
    type: 'security.data_breach_attempt',
    severity: 'emergency',
    context: {
      timestamp: new Date().toISOString(),
      ip: params.ip,
      userId: params.userId,
      userEmail: params.userEmail,
      affectedResource: params.affectedResource,
      attackType: params.attackType,
    },
    source: {
      ip: params.ip,
      userId: params.userId,
      userEmail: params.userEmail,
    },
    forceNotify: true,
  });
}

// ==========================================
// MISE À JOUR DU STATUT D'ALERTE
// ==========================================

export async function updateAlertStatus(
  alertId: string,
  status: SecurityAlert['status'],
  adminId: string,
  notes?: string
): Promise<void> {
  const updateData: Partial<SecurityAlert> = {
    status,
    updatedAt: Timestamp.now(),
  };

  if (status === 'acknowledged') {
    updateData.acknowledgedBy = adminId;
    updateData.acknowledgedAt = Timestamp.now();
  } else if (status === 'resolved' || status === 'false_positive') {
    updateData.resolvedBy = adminId;
    updateData.resolvedAt = Timestamp.now();
    if (notes) {
      updateData.resolution = notes;
    }
  }

  if (notes) {
    updateData.notes = notes;
  }

  await db.collection('security_alerts').doc(alertId).update(updateData);

  // Log l'action admin
  await db.collection('admin_security_actions').add({
    adminId,
    action: status === 'acknowledged' ? 'acknowledge' :
      status === 'resolved' ? 'resolve' :
        status === 'false_positive' ? 'mark_false_positive' : 'investigate',
    alertId,
    timestamp: Timestamp.now(),
    details: notes,
  });
}

// ==========================================
// RÉCUPÉRATION D'ALERTES
// ==========================================

export interface GetAlertsOptions {
  status?: SecurityAlert['status'][];
  severity?: AlertSeverity[];
  type?: SecurityAlertType[];
  limit?: number;
  startAfter?: Timestamp;
}

export async function getSecurityAlerts(
  options: GetAlertsOptions = {}
): Promise<SecurityAlert[]> {
  let query = db.collection('security_alerts')
    .orderBy('createdAt', 'desc')
    .limit(options.limit || 50);

  if (options.status && options.status.length > 0) {
    query = query.where('status', 'in', options.status);
  }

  if (options.severity && options.severity.length > 0) {
    query = query.where('severity', 'in', options.severity);
  }

  if (options.startAfter) {
    query = query.startAfter(options.startAfter);
  }

  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SecurityAlert));
}
