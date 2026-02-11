/**
 * Types et constantes pour la queue Telegram globale
 *
 * Architecture: Tous les messages Telegram passent par une queue Firestore
 * traitée par un processeur unique (maxInstances: 1) chaque minute.
 * Élimine le problème de rate limiting distribué multi-instances.
 */

import { Timestamp } from 'firebase-admin/firestore';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Nombre de messages traités par cycle du processor */
export const BATCH_SIZE = 25;

/** Délai entre chaque envoi dans un batch (ms) — ~20 msg/sec, safe pour Telegram */
export const SEND_DELAY_MS = 50;

/** Nombre max de retries avant dead letter */
export const MAX_RETRIES = 3;

/** Backoff base en secondes (5s, 10s, 20s avec exponentiel) */
export const RETRY_BACKOFF_BASE_S = 5;

/** Seuil d'alerte si la queue dépasse cette profondeur */
export const QUEUE_DEPTH_ALERT_THRESHOLD = 100;

/** Jours de rétention des messages sent/dead avant cleanup */
export const CLEANUP_RETENTION_DAYS = 7;

/** Seuils d'alerte subscribers */
export const SUBSCRIBER_THRESHOLDS = {
  WARNING: 500,
  CRITICAL: 800,
  EMERGENCY: 1000,
} as const;

// ============================================================================
// FIRESTORE PATHS
// ============================================================================

export const QUEUE_COLLECTION = 'telegram_message_queue';
export const RATE_MONITOR_COLLECTION = 'telegram_rate_monitor';
export const SUBSCRIBER_STATS_DOC = 'telegram_subscriber_stats/current';

// ============================================================================
// QUEUE MESSAGE TYPES
// ============================================================================

export type QueuePriority = 'realtime' | 'campaign';

export type QueueStatus = 'pending' | 'sending' | 'sent' | 'failed' | 'dead';

export interface QueuedTelegramMessage {
  chatId: string | number;
  text: string;
  parseMode?: 'Markdown' | 'HTML';
  disableNotification?: boolean;
  disableWebPagePreview?: boolean;

  priority: QueuePriority;
  status: QueueStatus;

  retryCount: number;
  maxRetries: number;
  error?: string;
  nextRetryAt?: Timestamp;

  /** Type d'événement source (ex: 'new_registration', 'call_completed') */
  sourceEventType?: string;
  /** ID de campagne (futur Campaign Engine) */
  campaignId?: string;
  /** Numéro de batch dans une campagne */
  campaignBatchNumber?: number;

  createdAt: Timestamp;
  processedAt?: Timestamp;
}

// ============================================================================
// RATE MONITOR TYPES
// ============================================================================

export interface TelegramRateMonitorDay {
  totalSent: number;
  totalFailed: number;
  totalQueued: number;
  peakMinuteRate: number;
  hourlyCounts: Record<string, number>; // { "08": 12, "09": 45 }
  lastUpdatedAt: Timestamp;
}

// ============================================================================
// SUBSCRIBER STATS TYPES
// ============================================================================

export type AlertLevel = 'none' | 'warning' | 'critical' | 'emergency';

export interface TelegramSubscriberStats {
  totalActiveSubscribers: number;
  alertLevel: AlertLevel;
  lastCountedAt: Timestamp;
  breakdown?: {
    chatters: number;
    influencers: number;
    bloggers: number;
    groupAdmins: number;
    admin: number;
  };
}
