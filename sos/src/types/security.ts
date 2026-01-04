/**
 * Types de sécurité pour le frontend SOS Expat
 * Utilisés dans le dashboard admin des alertes de sécurité
 */

import { Timestamp } from 'firebase/firestore';

// ==========================================
// TYPES DE BASE
// ==========================================

export type AlertSeverity = 'info' | 'warning' | 'critical' | 'emergency';

export type AlertStatus = 'pending' | 'acknowledged' | 'investigating' | 'resolved' | 'escalated' | 'false_positive';

export type ThreatLevel = 'normal' | 'low' | 'moderate' | 'elevated' | 'critical';

export type ThreatCategory = 'intrusion' | 'fraud' | 'api_abuse' | 'system' | 'data_exfil';

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
// ALERTE DE SÉCURITÉ
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
  amount?: number;
  currency?: string;
  paymentMethod?: string;
  paymentId?: string;
  riskFactors?: string[];
  previousCountry?: string;
  distanceKm?: number;
  accountCount?: number;
  timeWindow?: string;
  requestCount?: number;
  endpoint?: string;
  attackType?: string;
  systemName?: string;
  issueType?: string;
  errorRate?: number;
  latencyMs?: number;
  [key: string]: unknown;
}

export interface SecurityAlertSource {
  ip?: string;
  userId?: string;
  userEmail?: string;
  userAgent?: string;
  country?: string;
  city?: string;
  isp?: string;
  deviceFingerprint?: string;
}

export interface SecurityAlert {
  id: string;
  type: SecurityAlertType;
  category: ThreatCategory;
  severity: AlertSeverity;
  status: AlertStatus;
  context: SecurityAlertContext;
  source: SecurityAlertSource;
  aggregation: {
    key: string;
    count: number;
    firstOccurrence: Timestamp;
    lastOccurrence: Timestamp;
    relatedAlertIds: string[];
  };
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
  automaticActions?: AutomaticAction[];
  acknowledgedBy?: string;
  acknowledgedAt?: Timestamp;
  resolvedBy?: string;
  resolvedAt?: Timestamp;
  resolution?: string;
  notes?: string;
  assignedTo?: string;
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
// ENTITÉS BLOQUÉES
// ==========================================

export interface BlockedEntity {
  id: string;
  entityType: 'user' | 'ip' | 'ip_range' | 'device' | 'session';
  entityId: string;
  reason: string;
  blockedAt: Timestamp;
  expiresAt?: Timestamp | null;
  blockedBy: 'system' | string;
  metadata?: Record<string, unknown>;
  hitCount?: number;
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
// ACTIONS ADMIN
// ==========================================

export interface AdminSecurityAction {
  id: string;
  adminId: string;
  adminName: string;
  adminEmail: string;
  action: 'acknowledge' | 'resolve' | 'block_ip' | 'unblock_ip' | 'suspend_user' | 'unsuspend_user' | 'force_logout' | 'maintenance_mode' | 'investigate' | 'mark_false_positive';
  target?: string;
  targetType?: 'user' | 'ip' | 'ip_range' | 'device' | 'session';
  alertId?: string;
  timestamp: Timestamp;
  details?: string;
  metadata?: Record<string, unknown>;
}

// ==========================================
// FILTRES
// ==========================================

export interface AlertFilters {
  severity?: AlertSeverity[];
  status?: AlertStatus[];
  type?: SecurityAlertType[];
  category?: ThreatCategory[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  search?: string;
}

// ==========================================
// HELPERS
// ==========================================

export const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  info: 'bg-blue-100 text-blue-800 border-blue-200',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  critical: 'bg-orange-100 text-orange-800 border-orange-200',
  emergency: 'bg-red-100 text-red-800 border-red-200',
};

export const SEVERITY_ICONS: Record<AlertSeverity, string> = {
  info: 'info-circle',
  warning: 'exclamation-triangle',
  critical: 'exclamation-circle',
  emergency: 'radiation',
};

export const STATUS_COLORS: Record<AlertStatus, string> = {
  pending: 'bg-gray-100 text-gray-800',
  acknowledged: 'bg-blue-100 text-blue-800',
  investigating: 'bg-purple-100 text-purple-800',
  resolved: 'bg-green-100 text-green-800',
  escalated: 'bg-red-100 text-red-800',
  false_positive: 'bg-gray-100 text-gray-500',
};

export const THREAT_LEVEL_COLORS: Record<ThreatLevel, string> = {
  normal: 'text-green-600',
  low: 'text-blue-600',
  moderate: 'text-yellow-600',
  elevated: 'text-orange-600',
  critical: 'text-red-600',
};

export const CATEGORY_LABELS: Record<ThreatCategory, Record<string, string>> = {
  intrusion: {
    fr: 'Intrusion',
    en: 'Intrusion',
    es: 'Intrusión',
    de: 'Eindringen',
    pt: 'Intrusão',
    ru: 'Вторжение',
    ar: 'اختراق',
    hi: 'घुसपैठ',
    zh: '入侵',
  },
  fraud: {
    fr: 'Fraude',
    en: 'Fraud',
    es: 'Fraude',
    de: 'Betrug',
    pt: 'Fraude',
    ru: 'Мошенничество',
    ar: 'احتيال',
    hi: 'धोखाधड़ी',
    zh: '欺诈',
  },
  api_abuse: {
    fr: 'Abus API',
    en: 'API Abuse',
    es: 'Abuso de API',
    de: 'API-Missbrauch',
    pt: 'Abuso de API',
    ru: 'Злоупотребление API',
    ar: 'إساءة استخدام API',
    hi: 'API दुरुपयोग',
    zh: 'API滥用',
  },
  system: {
    fr: 'Système',
    en: 'System',
    es: 'Sistema',
    de: 'System',
    pt: 'Sistema',
    ru: 'Система',
    ar: 'النظام',
    hi: 'सिस्टम',
    zh: '系统',
  },
  data_exfil: {
    fr: 'Exfiltration',
    en: 'Data Exfiltration',
    es: 'Exfiltración',
    de: 'Datenexfiltration',
    pt: 'Exfiltração',
    ru: 'Утечка данных',
    ar: 'تسريب البيانات',
    hi: 'डेटा चोरी',
    zh: '数据泄露',
  },
};

export function getAlertTypeLabel(type: SecurityAlertType, locale: string = 'fr'): string {
  const labels: Record<SecurityAlertType, Record<string, string>> = {
    'security.brute_force_detected': {
      fr: 'Attaque brute force',
      en: 'Brute force attack',
    },
    'security.unusual_location': {
      fr: 'Connexion inhabituelle',
      en: 'Unusual login location',
    },
    'security.suspicious_payment': {
      fr: 'Paiement suspect',
      en: 'Suspicious payment',
    },
    'security.mass_account_creation': {
      fr: 'Création massive de comptes',
      en: 'Mass account creation',
    },
    'security.api_abuse': {
      fr: 'Abus API',
      en: 'API abuse',
    },
    'security.data_breach_attempt': {
      fr: 'Tentative de violation',
      en: 'Data breach attempt',
    },
    'security.admin_action_required': {
      fr: 'Action admin requise',
      en: 'Admin action required',
    },
    'security.system_critical': {
      fr: 'Problème système critique',
      en: 'Critical system issue',
    },
    'security.impossible_travel': {
      fr: 'Voyage impossible',
      en: 'Impossible travel',
    },
    'security.multiple_sessions': {
      fr: 'Sessions multiples',
      en: 'Multiple sessions',
    },
    'security.card_testing': {
      fr: 'Test de carte',
      en: 'Card testing',
    },
    'security.promo_abuse': {
      fr: 'Abus code promo',
      en: 'Promo code abuse',
    },
    'security.sql_injection': {
      fr: 'Injection SQL',
      en: 'SQL injection',
    },
    'security.xss_attempt': {
      fr: 'Tentative XSS',
      en: 'XSS attempt',
    },
    'security.rate_limit_exceeded': {
      fr: 'Limite de requêtes dépassée',
      en: 'Rate limit exceeded',
    },
  };

  return labels[type]?.[locale] || labels[type]?.['en'] || type;
}

export function formatTimeAgo(timestamp: Timestamp | Date, locale: string = 'fr'): string {
  const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return locale === 'fr' ? "À l'instant" : 'Just now';
  }
  if (diffMins < 60) {
    return locale === 'fr' ? `Il y a ${diffMins} min` : `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return locale === 'fr' ? `Il y a ${diffHours}h` : `${diffHours}h ago`;
  }
  return locale === 'fr' ? `Il y a ${diffDays}j` : `${diffDays}d ago`;
}
