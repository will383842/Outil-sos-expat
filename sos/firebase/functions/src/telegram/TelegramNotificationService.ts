/**
 * Telegram Notification Service
 *
 * Service principal pour l'envoi de notifications Telegram aux administrateurs.
 * Utilise une initialisation paresseuse (lazy) pour eviter les erreurs au deploiement.
 *
 * Fonctionnalites:
 * - Lecture de la configuration depuis Firestore (telegram_admin_config/settings)
 * - Templates personnalisables avec fallback sur les templates par defaut
 * - Filtres par evenement (duree minimum, montant minimum, roles autorises)
 * - Logging des notifications envoyees
 * - Gestion des erreurs avec logging detaille
 * - Timezone Paris pour les dates
 */

import * as admin from 'firebase-admin';
import {
  TelegramAdminConfig,
  TelegramAdminTemplate,
  TelegramAdminLog,
  TelegramEventType,
  TemplateVariablesMap,
} from './types';
import { DEFAULT_TEMPLATES, TEMPLATE_VARIABLES } from './templates';
import { enqueueTelegramMessage } from './queue/enqueue';

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = '[TelegramNotificationService]';

/** Firestore collection paths */
const FIRESTORE_PATHS = {
  CONFIG: 'telegram_admin_config',
  CONFIG_DOC: 'settings',
  TEMPLATES: 'telegram_admin_templates',
  LOGS: 'telegram_admin_logs',
} as const;

/** Paris timezone for date formatting */
const PARIS_TIMEZONE = 'Europe/Paris';

/** Check if running during deployment analysis (no actual Firebase context) */
const IS_DEPLOYMENT_ANALYSIS =
  !process.env.K_REVISION &&
  !process.env.K_SERVICE &&
  !process.env.FUNCTION_TARGET &&
  !process.env.FUNCTIONS_EMULATOR;

// ============================================================================
// LAZY INITIALIZATION
// ============================================================================

let _initialized = false;

/**
 * Ensure Firebase Admin is initialized before accessing Firestore
 */
function ensureInitialized(): void {
  if (!_initialized && !IS_DEPLOYMENT_ANALYSIS) {
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    _initialized = true;
  }
}

/**
 * Get Firestore instance with lazy initialization
 */
function getDb(): admin.firestore.Firestore {
  ensureInitialized();
  return admin.firestore();
}

// ============================================================================
// TELEGRAM NOTIFICATION SERVICE
// ============================================================================

/**
 * Main service class for sending Telegram notifications
 *
 * Uses singleton pattern with lazy initialization to avoid
 * initialization errors during Firebase deployment analysis.
 */
class TelegramNotificationService {
  private static instance: TelegramNotificationService | null = null;

  /**
   * Private constructor - use getInstance() instead
   */
  private constructor() {
    // Lazy initialization - nothing to do here
  }

  /**
   * Get the singleton instance of TelegramNotificationService
   */
  static getInstance(): TelegramNotificationService {
    if (!TelegramNotificationService.instance) {
      TelegramNotificationService.instance = new TelegramNotificationService();
    }
    return TelegramNotificationService.instance;
  }

  // ==========================================================================
  // CONFIGURATION
  // ==========================================================================

  /**
   * Read Telegram admin configuration from Firestore
   *
   * @returns Configuration object or null if not found/error
   */
  async getConfig(): Promise<TelegramAdminConfig | null> {
    try {
      const db = getDb();
      const configDoc = await db
        .collection(FIRESTORE_PATHS.CONFIG)
        .doc(FIRESTORE_PATHS.CONFIG_DOC)
        .get();

      if (!configDoc.exists) {
        console.warn(`${LOG_PREFIX} Config document not found at ${FIRESTORE_PATHS.CONFIG}/${FIRESTORE_PATHS.CONFIG_DOC}`);
        return null;
      }

      return configDoc.data() as TelegramAdminConfig;
    } catch (error) {
      console.error(`${LOG_PREFIX} Error reading config:`, error);
      return null;
    }
  }

  // ==========================================================================
  // TEMPLATES
  // ==========================================================================

  /**
   * Get template for a specific event type
   *
   * Reads from Firestore collection telegram_admin_templates/{eventId}
   * Falls back to DEFAULT_TEMPLATES if not found in Firestore
   *
   * @param eventId - The event type to get template for
   * @returns Template object or null if not found
   */
  async getTemplate(eventId: TelegramEventType): Promise<TelegramAdminTemplate | null> {
    try {
      const db = getDb();

      // Try to read from Firestore first
      const templateDoc = await db
        .collection(FIRESTORE_PATHS.TEMPLATES)
        .doc(eventId)
        .get();

      if (templateDoc.exists) {
        return templateDoc.data() as TelegramAdminTemplate;
      }

      // Fallback to default templates
      const defaultTemplate = DEFAULT_TEMPLATES[eventId];
      if (defaultTemplate) {
        console.log(`${LOG_PREFIX} Using default template for ${eventId}`);
        return {
          eventId,
          enabled: true,
          template: defaultTemplate.template,
          variables: TEMPLATE_VARIABLES[eventId] || [],
          updatedAt: admin.firestore.Timestamp.now(),
        };
      }

      console.warn(`${LOG_PREFIX} No template found for event: ${eventId}`);
      return null;
    } catch (error) {
      console.error(`${LOG_PREFIX} Error reading template for ${eventId}:`, error);

      // Fallback to default on error
      const defaultTemplate = DEFAULT_TEMPLATES[eventId];
      if (defaultTemplate) {
        return {
          eventId,
          enabled: true,
          template: defaultTemplate.template,
          variables: TEMPLATE_VARIABLES[eventId] || [],
          updatedAt: admin.firestore.Timestamp.now(),
        };
      }

      return null;
    }
  }

  // ==========================================================================
  // VARIABLE REPLACEMENT
  // ==========================================================================

  /**
   * Replace {{VARIABLE}} placeholders in template with actual values
   *
   * @param template - Template string with {{PLACEHOLDERS}}
   * @param vars - Object with variable values
   * @returns Processed template with variables replaced
   */
  replaceVariables(template: string, vars: Record<string, string>): string {
    let result = template;

    for (const [key, value] of Object.entries(vars)) {
      // Replace both {{KEY}} and {{ KEY }} (with spaces)
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      result = result.replace(regex, value ?? '');
    }

    return result;
  }

  // ==========================================================================
  // DATE HELPERS
  // ==========================================================================

  /**
   * Format date in Paris timezone (DD/MM/YYYY)
   *
   * @param date - Date to format (defaults to now)
   * @returns Formatted date string
   */
  formatDateParis(date?: Date): string {
    const d = date || new Date();
    return d.toLocaleDateString('fr-FR', {
      timeZone: PARIS_TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  /**
   * Format time in Paris timezone (HH:MM)
   *
   * @param date - Date to format (defaults to now)
   * @returns Formatted time string
   */
  formatTimeParis(date?: Date): string {
    const d = date || new Date();
    return d.toLocaleTimeString('fr-FR', {
      timeZone: PARIS_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // ==========================================================================
  // LOGGING
  // ==========================================================================

  /**
   * Log notification attempt to Firestore
   *
   * @param eventId - Event type that triggered the notification
   * @param success - Whether the notification was sent successfully
   * @param error - Error message if failed
   * @param messageId - Telegram message ID if successful
   * @param chatId - Chat ID the message was sent to
   */
  async logNotification(
    eventId: TelegramEventType,
    success: boolean,
    error?: string,
    messageId?: number,
    chatId?: string
  ): Promise<void> {
    try {
      const db = getDb();
      const logEntry: Omit<TelegramAdminLog, 'id'> = {
        eventType: eventId,
        recipientChatId: chatId || '',
        message: '',
        status: success ? 'sent' : 'failed',
        sentAt: admin.firestore.Timestamp.now(),
      };

      if (error) {
        logEntry.errorMessage = error;
      }

      if (messageId) {
        logEntry.telegramMessageId = messageId;
      }

      await db.collection(FIRESTORE_PATHS.LOGS).add(logEntry);

      console.log(`${LOG_PREFIX} Notification logged: ${eventId} - ${success ? 'SUCCESS' : 'FAILED'}`);
    } catch (logError) {
      // Don't throw on log errors - just warn
      console.warn(`${LOG_PREFIX} Failed to log notification:`, logError);
    }
  }

  // ==========================================================================
  // MAIN NOTIFICATION METHOD
  // ==========================================================================

  /**
   * Send a notification for a specific event
   *
   * This is the main method to send notifications. It:
   * 1. Checks if notifications are enabled in config
   * 2. Applies event-specific filters (min duration, min amount, allowed roles)
   * 3. Gets the template (from Firestore or default)
   * 4. Replaces variables in the template
   * 5. Sends the message via Telegram
   * 6. Logs the result
   *
   * @param eventId - Event type to send notification for
   * @param variables - Variables to inject into the template
   * @param filters - Optional event-specific filters
   * @returns true if notification was sent successfully
   *
   * @example
   * // Send a new registration notification
   * await telegramService.sendNotification('new_registration', {
   *   ROLE_FR: 'Avocat',
   *   EMAIL: 'avocat@example.com',
   *   PHONE: '+33612345678',
   *   COUNTRY: 'France',
   *   DATE: '03/02/2026',
   *   TIME: '14:30'
   * });
   */
  async sendNotification<T extends TelegramEventType>(
    eventId: T,
    variables: TemplateVariablesMap[T],
    filters?: {
      minDuration?: number; // Minimum call duration in minutes
      minAmount?: number; // Minimum payment amount in euros
      allowedRoles?: string[]; // Only notify for these roles
      role?: string; // Current event's role (for filtering)
    }
  ): Promise<boolean> {
    const logId = `notif_${Date.now().toString(36)}`;
    console.log(`\n${LOG_PREFIX} [${logId}] Sending notification: ${eventId}`);

    try {
      // 1. Read config
      const config = await this.getConfig();
      if (!config) {
        console.warn(`${LOG_PREFIX} [${logId}] No config found, skipping notification`);
        await this.logNotification(eventId, false, 'No config found');
        return false;
      }

      // 2. Check if notifications are globally enabled
      if (!config.notifications) {
        console.warn(`${LOG_PREFIX} [${logId}] Notifications settings not found in config`);
        await this.logNotification(eventId, false, 'Notifications settings not found');
        return false;
      }

      // 3. Check if this specific event type is enabled (default to enabled if not explicitly set to false)
      const eventEnabledKey = this.getEventEnabledKey(eventId);
      if (eventEnabledKey && config.notifications[eventEnabledKey] === false) {
        console.log(`${LOG_PREFIX} [${logId}] Event ${eventId} is disabled in config`);
        return false; // Don't log as error - this is expected behavior
      }

      // 4. Check if chat ID is configured
      if (!config.recipientChatId) {
        console.warn(`${LOG_PREFIX} [${logId}] No recipient chat ID configured`);
        await this.logNotification(eventId, false, 'No recipient chat ID');
        return false;
      }

      // 5. Apply event-specific filters
      if (filters) {
        // Cast variables to generic record for filter access
        const varsRecord = variables as unknown as Record<string, string>;

        // Check minimum duration filter (for call_completed)
        if (filters.minDuration !== undefined && eventId === 'call_completed') {
          const durationStr = varsRecord.DURATION_MINUTES || '0';
          const duration = parseFloat(durationStr);
          if (duration < filters.minDuration) {
            console.log(`${LOG_PREFIX} [${logId}] Call duration ${duration} < min ${filters.minDuration}, skipping`);
            return false;
          }
        }

        // Check minimum amount filter (for payment_received)
        if (filters.minAmount !== undefined && eventId === 'payment_received') {
          const amountStr = varsRecord.TOTAL_AMOUNT || '0';
          const amount = parseFloat(amountStr);
          if (amount < filters.minAmount) {
            console.log(`${LOG_PREFIX} [${logId}] Payment amount ${amount} < min ${filters.minAmount}, skipping`);
            return false;
          }
        }

        // Check allowed roles filter (for new_registration)
        if (filters.allowedRoles && filters.allowedRoles.length > 0 && filters.role) {
          if (!filters.allowedRoles.includes(filters.role)) {
            console.log(`${LOG_PREFIX} [${logId}] Role ${filters.role} not in allowed list, skipping`);
            return false;
          }
        }
      }

      // 6. Get template
      const template = await this.getTemplate(eventId);
      if (!template) {
        console.error(`${LOG_PREFIX} [${logId}] No template found for ${eventId}`);
        await this.logNotification(eventId, false, 'No template found');
        return false;
      }

      // Check if template is enabled
      if (!template.enabled) {
        console.log(`${LOG_PREFIX} [${logId}] Template for ${eventId} is disabled`);
        return false;
      }

      // 7. Replace variables in template
      const message = this.replaceVariables(
        template.template,
        variables as unknown as Record<string, string>
      );

      // 8. Enqueue via global Telegram queue (processed by single-instance processor)
      console.log(`${LOG_PREFIX} [${logId}] Enqueueing to chat ${config.recipientChatId}`);
      try {
        const queueId = await enqueueTelegramMessage(
          config.recipientChatId,
          message,
          {
            parseMode: 'Markdown',
            priority: 'realtime',
            sourceEventType: eventId,
          }
        );

        console.log(`${LOG_PREFIX} [${logId}] Notification enqueued successfully (queueId: ${queueId})`);
        await this.logNotification(eventId, true, undefined, undefined, config.recipientChatId);
        return true;
      } catch (enqueueError) {
        const errMsg = enqueueError instanceof Error ? enqueueError.message : 'Enqueue failed';
        console.error(`${LOG_PREFIX} [${logId}] Failed to enqueue notification:`, errMsg);
        await this.logNotification(eventId, false, errMsg, undefined, config.recipientChatId);
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`${LOG_PREFIX} [${logId}] Error sending notification:`, error);
      await this.logNotification(eventId, false, errorMessage);
      return false;
    }
  }

  /**
   * Get the config key for checking if an event type is enabled
   * Returns null for event types that don't have a config toggle (always enabled)
   */
  private getEventEnabledKey(eventId: TelegramEventType): keyof TelegramAdminConfig['notifications'] | null {
    const mapping: Partial<Record<TelegramEventType, keyof TelegramAdminConfig['notifications']>> = {
      new_registration: 'newRegistration',
      call_completed: 'callCompleted',
      payment_received: 'paymentReceived',
      daily_report: 'dailyReport',
      // Note: new_provider, new_contact_message, negative_review, security_alert,
      // and withdrawal_request don't have config toggles yet - they are always enabled
    };
    return mapping[eventId] || null;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Singleton instance of TelegramNotificationService
 * Use this for all notification operations
 */
export const telegramNotificationService = TelegramNotificationService.getInstance();

/**
 * Export the class for testing purposes
 */
export { TelegramNotificationService };
