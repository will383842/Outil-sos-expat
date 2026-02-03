/**
 * Telegram Admin Callable Functions
 *
 * Admin-only callable functions for managing Telegram notifications configuration.
 * All functions require admin authentication (claim admin:true or role:'admin').
 *
 * Functions:
 * - telegram_updateConfig: Update Telegram notification configuration
 * - telegram_getConfig: Get current Telegram configuration
 * - telegram_getChatId: Get Chat ID from recent bot updates (finds /start messages)
 * - telegram_validateBot: Validate that the bot token is working
 * - telegram_updateTemplate: Update a specific notification template
 * - telegram_getTemplates: Get all notification templates
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";
import { TELEGRAM_BOT_TOKEN } from "../../lib/secrets";
import {
  getTelegramUpdates,
  validateBotToken,
} from "../providers/telegramBot";
import {
  TelegramAdminConfig,
  TelegramAdminTemplate,
  TelegramEventType,
  NotificationSettings,
} from "../types";
import { DEFAULT_TEMPLATES, TEMPLATE_VARIABLES } from "../templates";

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[TelegramCallables]";

/** Firestore collection paths */
const FIRESTORE_PATHS = {
  CONFIG: "telegram_admin_config",
  CONFIG_DOC: "settings",
  TEMPLATES: "telegram_admin_templates",
} as const;

// ============================================================================
// LAZY INITIALIZATION
// ============================================================================

/** Check if running during deployment analysis (no actual Firebase context) */
const IS_DEPLOYMENT_ANALYSIS =
  !process.env.K_REVISION &&
  !process.env.K_SERVICE &&
  !process.env.FUNCTION_TARGET &&
  !process.env.FUNCTIONS_EMULATOR;

/**
 * Ensure Firebase Admin is initialized before accessing Firestore
 */
function ensureInitialized(): void {
  if (!IS_DEPLOYMENT_ANALYSIS && !getApps().length) {
    initializeApp();
  }
}

/**
 * Get Firestore instance with lazy initialization
 */
function getDb() {
  ensureInitialized();
  return getFirestore();
}

// ============================================================================
// AUTH HELPER
// ============================================================================

/**
 * Assert that the request is from an authenticated admin user
 * Throws HttpsError if not authenticated or not admin
 */
function assertAdmin(ctx: { auth?: { uid?: string; token?: Record<string, unknown> } }): void {
  const uid = ctx?.auth?.uid;
  const claims = ctx?.auth?.token;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const isAdmin = claims?.admin === true || claims?.role === "admin";
  if (!isAdmin) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Notification settings update payload (all fields optional for merge)
 */
interface NotificationSettingsUpdate {
  newRegistration?: boolean;
  callCompleted?: boolean;
  paymentReceived?: boolean;
  dailyReport?: boolean;
}

/**
 * Update config request payload
 */
interface UpdateConfigRequest {
  recipientChatId?: string;
  notifications?: NotificationSettingsUpdate;
}

/**
 * Update template request payload
 */
interface UpdateTemplateRequest {
  eventId: TelegramEventType;
  template?: string;
  enabled?: boolean;
}

// ============================================================================
// CALLABLE FUNCTIONS
// ============================================================================

/**
 * Update Telegram notification configuration
 *
 * Merges the provided configuration with existing config.
 * All parameters are optional - only provided fields are updated.
 *
 * @param recipientChatId - Telegram chat ID to send notifications to
 * @param notifications - Notification settings per event type
 * @returns { ok: true } on success
 */
export const telegram_updateConfig = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 60,
    secrets: [TELEGRAM_BOT_TOKEN],
  },
  async (req) => {
    assertAdmin(req);

    const { recipientChatId, notifications } = (req.data || {}) as UpdateConfigRequest;

    console.log(`${LOG_PREFIX} telegram_updateConfig called by ${req.auth?.uid}`);

    // Validate input
    if (recipientChatId !== undefined && typeof recipientChatId !== "string") {
      throw new HttpsError("invalid-argument", "recipientChatId must be a string.");
    }

    if (notifications !== undefined && typeof notifications !== "object") {
      throw new HttpsError("invalid-argument", "notifications must be an object.");
    }

    // Build update payload
    const updatePayload: Record<string, unknown> = {
      updatedAt: Timestamp.now(),
      updatedBy: req.auth?.uid || "unknown",
    };

    if (recipientChatId !== undefined) {
      updatePayload.recipientChatId = recipientChatId;
    }

    if (notifications !== undefined) {
      // Merge notification settings using dot notation for nested updates
      const validKeys: (keyof NotificationSettings)[] = [
        "newRegistration",
        "callCompleted",
        "paymentReceived",
        "dailyReport",
      ];

      for (const key of validKeys) {
        if (notifications[key] !== undefined) {
          if (typeof notifications[key] !== "boolean") {
            throw new HttpsError(
              "invalid-argument",
              `notifications.${key} must be a boolean.`
            );
          }
          updatePayload[`notifications.${key}`] = notifications[key];
        }
      }
    }

    // Update Firestore
    const db = getDb();
    const configRef = db.collection(FIRESTORE_PATHS.CONFIG).doc(FIRESTORE_PATHS.CONFIG_DOC);

    // Check if document exists
    const configDoc = await configRef.get();
    if (!configDoc.exists) {
      // Create with defaults if not exists
      const defaultConfig: TelegramAdminConfig = {
        recipientPhoneNumber: "",
        recipientChatId: recipientChatId || null,
        notifications: {
          newRegistration: true,
          callCompleted: true,
          paymentReceived: true,
          dailyReport: true,
          ...notifications,
        },
        updatedAt: Timestamp.now(),
        updatedBy: req.auth?.uid || "unknown",
      };
      await configRef.set(defaultConfig);
      console.log(`${LOG_PREFIX} Created new config document`);
    } else {
      // Merge update
      await configRef.update(updatePayload);
      console.log(`${LOG_PREFIX} Updated config document`);
    }

    return { ok: true };
  }
);

/**
 * Get current Telegram notification configuration
 *
 * @returns Current config or default config if not found
 */
export const telegram_getConfig = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 60,
    secrets: [TELEGRAM_BOT_TOKEN],
  },
  async (req) => {
    assertAdmin(req);

    console.log(`${LOG_PREFIX} telegram_getConfig called by ${req.auth?.uid}`);

    const db = getDb();
    const configRef = db.collection(FIRESTORE_PATHS.CONFIG).doc(FIRESTORE_PATHS.CONFIG_DOC);
    const configDoc = await configRef.get();

    if (!configDoc.exists) {
      // Return default config
      return {
        exists: false,
        data: {
          recipientPhoneNumber: "",
          recipientChatId: null,
          notifications: {
            newRegistration: true,
            callCompleted: true,
            paymentReceived: true,
            dailyReport: true,
          },
        },
      };
    }

    const data = configDoc.data() as TelegramAdminConfig;

    return {
      exists: true,
      data: {
        recipientPhoneNumber: data.recipientPhoneNumber || "",
        recipientChatId: data.recipientChatId || null,
        notifications: data.notifications || {
          newRegistration: true,
          callCompleted: true,
          paymentReceived: true,
          dailyReport: true,
        },
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
        updatedBy: data.updatedBy || null,
      },
    };
  }
);

/**
 * Get Chat ID from recent bot updates
 *
 * Fetches recent updates from the Telegram Bot API and looks for /start commands.
 * Returns the chat ID from the most recent /start message.
 *
 * This is useful for initial setup when the admin needs to find their chat ID
 * after sending /start to the bot.
 *
 * @returns { ok: true, chatId: string, username?: string } if found
 * @returns { ok: false, error: string } if not found or error
 */
export const telegram_getChatId = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 60,
    secrets: [TELEGRAM_BOT_TOKEN],
  },
  async (req) => {
    assertAdmin(req);

    console.log(`${LOG_PREFIX} telegram_getChatId called by ${req.auth?.uid}`);

    try {
      const result = await getTelegramUpdates();

      if (!result.ok) {
        console.error(`${LOG_PREFIX} Failed to get updates:`, result.error);
        throw new HttpsError("internal", `Failed to get Telegram updates: ${result.error}`);
      }

      const updates = result.updates || [];
      console.log(`${LOG_PREFIX} Received ${updates.length} updates`);

      // Find the most recent /start message
      // Sort by update_id descending to get most recent first
      const sortedUpdates = [...updates].sort((a, b) => b.update_id - a.update_id);

      for (const update of sortedUpdates) {
        const message = update.message;
        if (message?.text === "/start") {
          const chatId = message.chat.id.toString();
          const username = message.from?.username || message.chat.username;
          const firstName = message.from?.first_name || message.chat.first_name;

          console.log(
            `${LOG_PREFIX} Found /start from chat ${chatId} (${username || firstName || "unknown"})`
          );

          return {
            ok: true,
            chatId,
            username: username || undefined,
            firstName: firstName || undefined,
            chatType: message.chat.type,
          };
        }
      }

      // No /start message found
      console.log(`${LOG_PREFIX} No /start message found in recent updates`);
      return {
        ok: false,
        error: "No /start message found. Please send /start to the bot first.",
        updatesCount: updates.length,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`${LOG_PREFIX} Error getting chat ID:`, error);
      throw new HttpsError("internal", `Failed to get chat ID: ${errorMessage}`);
    }
  }
);

/**
 * Validate that the bot token is working
 *
 * Calls the Telegram getMe API to verify the token is valid
 * and returns bot information.
 *
 * @returns { ok: true, botUsername: string } if valid
 * @returns { ok: false, error: string } if invalid
 */
export const telegram_validateBot = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 60,
    secrets: [TELEGRAM_BOT_TOKEN],
  },
  async (req) => {
    assertAdmin(req);

    console.log(`${LOG_PREFIX} telegram_validateBot called by ${req.auth?.uid}`);

    try {
      const result = await validateBotToken();

      if (result.ok) {
        console.log(`${LOG_PREFIX} Bot token valid: @${result.botUsername}`);
        return {
          ok: true,
          botUsername: result.botUsername,
        };
      } else {
        console.error(`${LOG_PREFIX} Bot token invalid:`, result.error);
        return {
          ok: false,
          error: result.error || "Bot token validation failed",
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`${LOG_PREFIX} Error validating bot:`, error);
      throw new HttpsError("internal", `Failed to validate bot: ${errorMessage}`);
    }
  }
);

/**
 * Update a specific notification template
 *
 * @param eventId - The event type to update template for
 * @param template - The new template string (optional)
 * @param enabled - Whether the template is enabled (optional)
 * @returns { ok: true } on success
 */
export const telegram_updateTemplate = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 60,
    secrets: [TELEGRAM_BOT_TOKEN],
  },
  async (req) => {
    assertAdmin(req);

    const { eventId, template, enabled } = (req.data || {}) as UpdateTemplateRequest;

    console.log(`${LOG_PREFIX} telegram_updateTemplate called for ${eventId} by ${req.auth?.uid}`);

    // Validate eventId
    const validEventIds: TelegramEventType[] = [
      "new_registration",
      "call_completed",
      "payment_received",
      "daily_report",
    ];

    if (!eventId || !validEventIds.includes(eventId)) {
      throw new HttpsError(
        "invalid-argument",
        `eventId must be one of: ${validEventIds.join(", ")}`
      );
    }

    // Validate template if provided
    if (template !== undefined && typeof template !== "string") {
      throw new HttpsError("invalid-argument", "template must be a string.");
    }

    if (template !== undefined && template.trim().length === 0) {
      throw new HttpsError("invalid-argument", "template cannot be empty.");
    }

    // Validate enabled if provided
    if (enabled !== undefined && typeof enabled !== "boolean") {
      throw new HttpsError("invalid-argument", "enabled must be a boolean.");
    }

    // At least one field must be provided
    if (template === undefined && enabled === undefined) {
      throw new HttpsError(
        "invalid-argument",
        "At least one of template or enabled must be provided."
      );
    }

    const db = getDb();
    const templateRef = db.collection(FIRESTORE_PATHS.TEMPLATES).doc(eventId);

    // Check if template exists
    const templateDoc = await templateRef.get();

    if (!templateDoc.exists) {
      // Create new template with defaults
      const defaultTemplate = DEFAULT_TEMPLATES[eventId];
      const newTemplate: TelegramAdminTemplate = {
        eventId,
        enabled: enabled ?? true,
        template: template ?? defaultTemplate?.template ?? "",
        variables: TEMPLATE_VARIABLES[eventId] || [],
        updatedAt: Timestamp.now(),
      };
      await templateRef.set(newTemplate);
      console.log(`${LOG_PREFIX} Created new template for ${eventId}`);
    } else {
      // Update existing template
      const updatePayload: Record<string, unknown> = {
        updatedAt: Timestamp.now(),
      };

      if (template !== undefined) {
        updatePayload.template = template;
      }

      if (enabled !== undefined) {
        updatePayload.enabled = enabled;
      }

      await templateRef.update(updatePayload);
      console.log(`${LOG_PREFIX} Updated template for ${eventId}`);
    }

    return { ok: true };
  }
);

/**
 * Get all notification templates
 *
 * Returns all templates from Firestore, with fallback to default templates
 * for any event types that don't have a custom template.
 *
 * @returns { templates: Record<TelegramEventType, TelegramAdminTemplate> }
 */
export const telegram_getTemplates = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 60,
    secrets: [TELEGRAM_BOT_TOKEN],
  },
  async (req) => {
    assertAdmin(req);

    console.log(`${LOG_PREFIX} telegram_getTemplates called by ${req.auth?.uid}`);

    const db = getDb();
    const templatesRef = db.collection(FIRESTORE_PATHS.TEMPLATES);
    const snapshot = await templatesRef.get();

    // Build templates map with Firestore data
    const templates: Record<string, {
      eventId: TelegramEventType;
      enabled: boolean;
      template: string;
      variables: string[];
      updatedAt: string | null;
      isDefault: boolean;
    }> = {};

    // First, add all Firestore templates
    for (const doc of snapshot.docs) {
      const data = doc.data() as TelegramAdminTemplate;
      templates[doc.id] = {
        eventId: data.eventId,
        enabled: data.enabled,
        template: data.template,
        variables: data.variables || TEMPLATE_VARIABLES[data.eventId as TelegramEventType] || [],
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
        isDefault: false,
      };
    }

    // Then, fill in defaults for any missing event types
    const allEventIds: TelegramEventType[] = [
      "new_registration",
      "call_completed",
      "payment_received",
      "daily_report",
    ];

    for (const eventId of allEventIds) {
      if (!templates[eventId]) {
        const defaultTemplate = DEFAULT_TEMPLATES[eventId];
        templates[eventId] = {
          eventId,
          enabled: true,
          template: defaultTemplate?.template || "",
          variables: TEMPLATE_VARIABLES[eventId] || [],
          updatedAt: null,
          isDefault: true,
        };
      }
    }

    return { templates };
  }
);
