/**
 * Types pour le système d'alertes de sécurité SOS Expat
 * Détection de menaces, scoring et notifications multilingues
 */

import { Timestamp } from 'firebase-admin/firestore';

// ==========================================
// TYPES DE BASE
// ==========================================

export type AlertSeverity = 'info' | 'warning' | 'critical' | 'emergency';

export type AlertStatus = 'pending' | 'acknowledged' | 'investigating' | 'resolved' | 'escalated' | 'false_positive';

export type ThreatLevel = 'normal' | 'low' | 'moderate' | 'elevated' | 'critical';

export type EntityType = 'user' | 'ip' | 'ip_range' | 'device' | 'session';

export type ThreatCategory = 'intrusion' | 'fraud' | 'api_abuse' | 'system' | 'data_exfil';

// ==========================================
// TYPES D'ALERTES DE SÉCURITÉ
// ==========================================

export type SecurityAlertType =
  | 'security.brute_force_detected'
  | 'security.unusual_location'
  | 'security.suspicious_payment'
  | 'security.mass_account_creation'
  | 'security.api_abuse'
  | 'security.data_breach_attempt'
  | 'security.admin_action_required'
  | 'security.system_critical'
  | 'security.impossible_travel'
  | 'security.multiple_sessions'
  | 'security.card_testing'
  | 'security.promo_abuse'
  | 'security.sql_injection'
  | 'security.xss_attempt'
  | 'security.rate_limit_exceeded';

// ==========================================
// GÉOLOCALISATION
// ==========================================

export interface GeoLocation {
  country: string;           // Code ISO 3166-1 alpha-2
  countryName: string;       // Nom complet
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isp?: string;
  isVPN?: boolean;
  isTor?: boolean;
  isProxy?: boolean;
  isDatacenter?: boolean;
}

export interface DeviceFingerprint {
  userAgent: string;
  screenResolution?: string;
  language?: string;
  platform?: string;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  hash: string;
}

// ==========================================
// CONTEXTE DES ALERTES
// ==========================================

export interface SecurityAlertContext {
  timestamp: string;
  ip?: string;
  country?: string;
  countryName?: string;
  city?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  affectedResource?: string;
  attemptCount?: number;
  riskScore?: number;
  userAgent?: string;

  // Paiements
  amount?: number;
  currency?: string;
  paymentMethod?: string;
  paymentId?: string;
  riskFactors?: string[];

  // Géolocalisation
  previousCountry?: string;
  distanceKm?: number;
  geoLocation?: GeoLocation;

  // Création de comptes
  accountCount?: number;
  timeWindow?: string;

  // API abuse
  requestCount?: number;
  endpoint?: string;
  attackType?: string;

  // Système
  systemName?: string;
  issueType?: string;
  errorRate?: number;
  latencyMs?: number;

  // Métadonnées additionnelles
  [key: string]: unknown;
}

// ==========================================
// ALERTE DE SÉCURITÉ PRINCIPALE
// ==========================================

export interface SecurityAlert {
  id: string;
  type: SecurityAlertType;
  category: ThreatCategory;
  severity: AlertSeverity;
  status: AlertStatus;

  // Contexte de l'alerte
  context: SecurityAlertContext;

  // Source de la menace
  source: {
    ip?: string;
    userId?: string;
    userEmail?: string;
    userAgent?: string;
    country?: string;
    city?: string;
    isp?: string;
    deviceFingerprint?: string;
  };

  // Métadonnées de la requête
  rawRequest?: {
    method: string;
    path: string;
    headers?: Record<string, string>;
    bodySnippet?: string;  // Premiers 500 chars, sans PII
  };

  // Agrégation d'alertes similaires
  aggregation: {
    key: string;
    count: number;
    firstOccurrence: Timestamp;
    lastOccurrence: Timestamp;
    relatedAlertIds: string[];
  };

  // Escalade
  escalation: {
    level: number;
    escalatedAt?: Timestamp;
    nextEscalationAt?: Timestamp;
    notificationsSent: {
      email: boolean;
      sms: boolean;
      push: boolean;
      inapp: boolean;
      slack: boolean;
    };
  };

  // Actions automatiques exécutées
  automaticActions?: AutomaticAction[];

  // Traitement
  acknowledgedBy?: string;
  acknowledgedAt?: Timestamp;
  resolvedBy?: string;
  resolvedAt?: Timestamp;
  resolution?: string;
  notes?: string;
  assignedTo?: string;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  processed: boolean;
}

export interface AutomaticAction {
  type: 'block_ip' | 'suspend_user' | 'rate_limit' | 'captcha_required' | 'mfa_required' | 'session_terminated' | 'notify_admin';
  executed: boolean;
  executedAt?: Timestamp;
  result?: 'success' | 'failed';
  details?: string;
}

// ==========================================
// PAYLOAD DE CRÉATION D'ALERTE
// ==========================================

export interface SecurityAlertPayload {
  type: SecurityAlertType;
  severity: AlertSeverity;
  context: SecurityAlertContext;
  category?: ThreatCategory;
  aggregationKey?: string;
  forceNotify?: boolean;
  source?: Partial<SecurityAlert['source']>;
}

// ==========================================
// SCORE DE MENACE
// ==========================================

export interface ThreatScore {
  entityId: string;
  entityType: EntityType;
  currentScore: number;  // 0-100

  factors: ThreatFactor[];

  history: Array<{
    score: number;
    timestamp: Timestamp;
    reason: string;
  }>;

  actionsTaken: Array<{
    action: ThreatAction;
    timestamp: Timestamp;
    triggeredBy: string;
    expiresAt?: Timestamp;
  }>;

  lastUpdated: Timestamp;
  createdAt: Timestamp;
}

export interface ThreatFactor {
  category: ThreatCategory;
  name: string;
  weight: number;         // Impact sur le score (0-40)
  value: number;          // Valeur actuelle
  threshold: number;      // Seuil d'alerte
  lastOccurrence: Timestamp;
  occurrenceCount: number;
}

export type ThreatAction =
  | 'none'
  | 'log_only'
  | 'rate_limit_reduced'
  | 'captcha_required'
  | 'mfa_required'
  | 'session_terminated'
  | 'account_locked_temp'
  | 'account_locked_perm'
  | 'ip_blocked_temp'
  | 'ip_blocked_perm'
  | 'notify_admin'
  | 'notify_user';

// ==========================================
// ENTITÉS BLOQUÉES
// ==========================================

export interface BlockedEntity {
  id: string;
  entityType: EntityType;
  entityId: string;
  reason: string;
  blockedAt: Timestamp;
  expiresAt?: Timestamp | null;
  blockedBy: 'system' | string;
  metadata?: Record<string, unknown>;
  hitCount?: number;
}

// ==========================================
// PROFIL GÉOGRAPHIQUE UTILISATEUR
// ==========================================

export interface UserGeoProfile {
  userId: string;
  knownCountries: string[];
  knownIPs: string[];
  lastLocations: Array<{
    ip: string;
    country: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    timestamp: Timestamp;
  }>;
  averageTravelVelocity: number;  // km/h
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ==========================================
// RATE LIMITING DES ALERTES
// ==========================================

export interface AlertRateLimit {
  key: string;
  alertType: SecurityAlertType;
  count: number;
  windowStart: Timestamp;
  windowEnd: Timestamp;
  lastAlertId: string;
  suppressed: number;
}

// ==========================================
// PRÉFÉRENCES ADMIN
// ==========================================

export interface AdminAlertPreferences {
  uid: string;
  email: string;
  phone?: string;
  fcmToken?: string;

  preferences: {
    [alertType: string]: {
      enabled: boolean;
      channels: ('email' | 'sms' | 'push' | 'inapp')[];
      minSeverity: AlertSeverity;
      quietHours?: {
        enabled: boolean;
        start: string;  // "22:00"
        end: string;    // "08:00"
        timezone: string;
        exceptEmergency: boolean;
      };
    };
  };

  globalSettings: {
    receiveDigest: boolean;
    digestFrequency: 'daily' | 'weekly';
    escalationContact: boolean;
  };

  updatedAt: Timestamp;
}

// ==========================================
// RECIPIENT POUR NOTIFICATIONS
// ==========================================

export interface AlertRecipient {
  uid: string;
  email: string;
  phone?: string;
  fcmToken?: string;
  locale: string;
}

// ==========================================
// DÉTECTION DE FRAUDE
// ==========================================

export type PaymentAnomalyType =
  | 'velocity_spike'
  | 'amount_outlier'
  | 'card_testing'
  | 'new_card_high_amount'
  | 'country_mismatch'
  | 'after_hours'
  | 'rapid_provider_switching';

export interface PaymentAnomaly {
  type: PaymentAnomalyType;
  severity: 'low' | 'medium' | 'high';
  details: Record<string, unknown>;
  timestamp: Timestamp;
}

export interface PromoCodeAbusePattern {
  code: string;
  suspectedUsers: string[];
  suspectedIPs: string[];
  usageCount: number;
  totalDiscount: number;
  patternType: 'same_ip' | 'same_device' | 'similar_emails' | 'velocity';
  firstSeen: Timestamp;
  lastSeen: Timestamp;
}

// ==========================================
// DÉTECTION D'ABUS API
// ==========================================

export type RequestPatternAnomalyType =
  | 'scraping'
  | 'enumeration'
  | 'fuzzing'
  | 'sql_injection'
  | 'xss'
  | 'path_traversal'
  | 'command_injection'
  | 'automated';

export interface InjectionAttempt {
  id: string;
  type: 'sql' | 'xss' | 'path_traversal' | 'command' | 'ldap' | 'nosql';
  ip: string;
  userId?: string;
  endpoint: string;
  method: string;
  payload: string;
  matchedPattern: string;
  blocked: boolean;
  timestamp: Timestamp;
}

// ==========================================
// CONFIGURATION
// ==========================================

export interface SecurityAlertConfig {
  // Seuils de scoring
  thresholds: {
    low: number;       // 0-30
    medium: number;    // 31-60
    high: number;      // 61-80
    critical: number;  // 81-100
  };

  // Poids des facteurs
  factorWeights: Record<string, number>;

  // Decay rate
  decayRatePerHour: number;

  // Actions par seuil de score
  actionTriggers: Record<number, ThreatAction[]>;

  // Rate limiting par type
  rateLimits: Record<SecurityAlertType, {
    windowMs: number;
    maxAlerts: number;
  }>;

  // Fenêtres d'agrégation
  aggregationWindows: Record<SecurityAlertType, number>;

  // Escalade
  escalationIntervals: {
    critical: number[];
    emergency: number[];
  };
}

// ==========================================
// ROUTING DES NOTIFICATIONS
// ==========================================

export interface SecurityRoutingConfig {
  severityRouting: Record<AlertSeverity, {
    strategy: 'parallel' | 'fallback';
    channels: string[];
    delay: number;
    escalation?: {
      enabled: boolean;
      intervals: number[];
      maxLevel: number;
    };
  }>;

  alertTypeOverrides: Record<SecurityAlertType, {
    minSeverity: AlertSeverity;
    channels: string[];
    aggregation?: {
      enabled: boolean;
      window: number;
      maxPerWindow: number;
    };
    requireAcknowledgement?: boolean;
    escalation?: {
      enabled: boolean;
      intervals: number[];
    };
  }>;

  globalRateLimits: {
    sms: { maxPerHour: number; maxPerDay: number };
    email: { maxPerHour: number; maxPerDay: number };
    push: { maxPerHour: number; maxPerDay: number };
  };
}

// ==========================================
// ACTIONS ADMIN
// ==========================================

export interface AdminSecurityAction {
  id: string;
  adminId: string;
  adminName: string;
  adminEmail: string;
  action: 'acknowledge' | 'resolve' | 'block_ip' | 'unblock_ip' | 'suspend_user' | 'unsuspend_user' | 'force_logout' | 'maintenance_mode' | 'investigate' | 'mark_false_positive';
  target?: string;
  targetType?: EntityType;
  alertId?: string;
  timestamp: Timestamp;
  details?: string;
  metadata?: Record<string, unknown>;
}

// ==========================================
// STATISTIQUES
// ==========================================

export interface SecurityStats {
  alertsBySeverity: Record<AlertSeverity, number>;
  alertsByType: Record<string, number>;
  alertsByStatus: Record<AlertStatus, number>;
  alertsByCountry: Record<string, number>;

  trends: {
    period: '24h' | '7d' | '30d';
    data: Array<{
      timestamp: string;
      critical: number;
      high: number;
      medium: number;
      low: number;
    }>;
  };

  threatLevel: ThreatLevel;
  blockedIPs: number;
  suspendedUsers: number;
  resolvedToday: number;
  averageResolutionTimeMinutes: number;
}

export interface GeoThreatData {
  country: string;
  countryCode: string;
  countryName: string;
  threatCount: number;
  severity: AlertSeverity;
  coordinates: { lat: number; lng: number };
  topAlertTypes: string[];
}

// ==========================================
// EXPORTS HELPER FUNCTIONS
// ==========================================

export const SEVERITY_PRIORITY: Record<AlertSeverity, number> = {
  info: 0,
  warning: 1,
  critical: 2,
  emergency: 3,
};

export const CATEGORY_FROM_TYPE: Record<SecurityAlertType, ThreatCategory> = {
  'security.brute_force_detected': 'intrusion',
  'security.unusual_location': 'intrusion',
  'security.impossible_travel': 'intrusion',
  'security.multiple_sessions': 'intrusion',
  'security.suspicious_payment': 'fraud',
  'security.mass_account_creation': 'fraud',
  'security.card_testing': 'fraud',
  'security.promo_abuse': 'fraud',
  'security.api_abuse': 'api_abuse',
  'security.sql_injection': 'api_abuse',
  'security.xss_attempt': 'api_abuse',
  'security.rate_limit_exceeded': 'api_abuse',
  'security.data_breach_attempt': 'data_exfil',
  'security.admin_action_required': 'system',
  'security.system_critical': 'system',
};

export function getSeverityFromScore(score: number): AlertSeverity {
  if (score >= 80) return 'emergency';
  if (score >= 60) return 'critical';
  if (score >= 30) return 'warning';
  return 'info';
}

export function determineThreatLevel(alertsBySeverity: Record<AlertSeverity, number>): ThreatLevel {
  if ((alertsBySeverity.emergency || 0) > 0) return 'critical';
  if ((alertsBySeverity.critical || 0) > 0) return 'elevated';
  if ((alertsBySeverity.warning || 0) > 5) return 'moderate';
  if ((alertsBySeverity.warning || 0) > 0) return 'low';
  return 'normal';
}
