/**
 * Security Alerts Module - SOS Expat
 * Point d'entrée principal pour le système d'alertes de sécurité
 */

// Types
export * from './types';

// Rate Limiter
export {
  checkRateLimit,
  generateRateLimitKey,
  shouldBypassRateLimit,
  cleanupExpiredRateLimits,
  getRateLimitStats,
} from './rateLimiter';

// Aggregator
export {
  generateAggregationKey,
  findExistingAlert,
  createOrAggregateAlert,
  shouldNotifyForAggregatedAlert,
  getAggregationStats,
  archiveOldResolvedAlerts,
} from './aggregator';

// Create Alert
export {
  createSecurityAlert,
  createSecurityAlertsBatch,
  createBruteForceAlert,
  createUnusualLocationAlert,
  createSuspiciousPaymentAlert,
  createApiAbuseAlert,
  createSystemCriticalAlert,
  createDataBreachAlert,
  updateAlertStatus,
  getSecurityAlerts,
} from './createAlert';

// Notifier
export {
  sendSecurityAlertNotifications,
  getAlertRecipients,
  SEVERITY_CHANNELS,
} from './notifier';

// Escalation
export {
  scheduleEscalation,
  processEscalation,
  processPendingEscalations,
  cancelEscalation,
  getEscalationStats,
  ESCALATION_CONFIGS,
} from './escalation';

// Triggers (Cloud Functions)
export {
  onSecurityAlertCreated,
  onSecurityAlertUpdated,
  createSecurityAlertHttp,
  processEscalationHttp,
  securityAlertAdminAction,
  getSecurityStats,
  securityDailyCleanup,
  processSecurityEscalations,
  securityDailyReport,
  checkBlockedEntity,
} from './triggers';

// Detectors
export {
  detectBruteForce,
  detectUnusualLocation,
  detectPaymentFraud,
  detectCardTesting,
  detectMassAccountCreation,
  detectApiAbuse,
  detectInjectionAttempt,
  detectMultipleSessions,
  detectors,
  DETECTION_THRESHOLDS,
} from './detectors';

// Threat Score Service
export {
  ThreatScoreService,
  threatScoreService,
  FACTOR_WEIGHTS,
  ACTION_THRESHOLDS,
} from './ThreatScoreService';
