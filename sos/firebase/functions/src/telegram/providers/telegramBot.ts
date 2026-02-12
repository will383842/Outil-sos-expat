/**
 * Telegram Bot API Provider
 *
 * Native fetch-based implementation for Telegram Bot API.
 * No external npm packages required.
 *
 * Features:
 * - Send messages with Markdown/HTML parsing
 * - Get updates (for chat ID retrieval from /start command)
 * - Validate bot token
 * - Get chat info
 * - Built-in rate limiting (30 msg/sec for groups, we use conservative in-memory limiter)
 * - sendTelegramMessageDirect() for queue processor (bypasses in-memory rate limiter)
 * - Comprehensive error handling
 */

import { getTelegramBotToken } from "../../lib/secrets";

// ============================================================================
// CONSTANTS
// ============================================================================

const TELEGRAM_API_BASE = "https://api.telegram.org/bot";
const LOG_PREFIX = "\u{1F4F1} [Telegram]";

/** Timeout for Telegram API requests (30 seconds) */
const API_REQUEST_TIMEOUT_MS = 30_000;

// Rate limiting: Telegram's actual limit is ~30 msg/sec for bots, ~20 msg/min to same chat.
// This in-memory limiter is a per-instance safety net. The global queue processor
// (maxInstances: 1) is the real rate control mechanism.
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_MESSAGES_PER_WINDOW = 30;

// ============================================================================
// TYPES
// ============================================================================

/**
 * Telegram Update object from getUpdates API
 */
export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
    chat: {
      id: number;
      type: "private" | "group" | "supergroup" | "channel";
      title?: string;
      username?: string;
      first_name?: string;
      last_name?: string;
    };
    date: number;
    text?: string;
    entities?: Array<{
      type: string;
      offset: number;
      length: number;
    }>;
  };
  edited_message?: TelegramUpdate["message"];
  channel_post?: TelegramUpdate["message"];
  edited_channel_post?: TelegramUpdate["message"];
  callback_query?: {
    id: string;
    from: NonNullable<TelegramUpdate["message"]>["from"];
    message?: TelegramUpdate["message"];
    chat_instance: string;
    data?: string;
  };
}

/**
 * Telegram Chat object
 */
export interface TelegramChat {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  description?: string;
  invite_link?: string;
  pinned_message?: TelegramUpdate["message"];
}

/**
 * Telegram Bot User object
 */
export interface TelegramBotUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
}

/**
 * Send message options
 */
export interface SendMessageOptions {
  parseMode?: "Markdown" | "HTML";
  disableNotification?: boolean;
  disableWebPagePreview?: boolean;
  replyToMessageId?: number;
}

/**
 * Send message result
 */
export interface SendMessageResult {
  ok: boolean;
  messageId?: number;
  error?: string;
}

/**
 * Get updates result
 */
export interface GetUpdatesResult {
  ok: boolean;
  updates?: TelegramUpdate[];
  error?: string;
}

/**
 * Validate token result
 */
export interface ValidateTokenResult {
  ok: boolean;
  botUsername?: string;
  error?: string;
}

/**
 * Get chat info result
 */
export interface GetChatResult {
  ok: boolean;
  chat?: TelegramChat;
  error?: string;
}

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * Simple in-memory rate limiter for Telegram API calls
 */
class RateLimiter {
  private timestamps: number[] = [];
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  /**
   * Check if we can make a request, and if so, record it
   */
  tryAcquire(): boolean {
    const now = Date.now();
    // Remove timestamps outside the window
    this.timestamps = this.timestamps.filter((ts) => now - ts < this.windowMs);

    if (this.timestamps.length >= this.maxRequests) {
      return false;
    }

    this.timestamps.push(now);
    return true;
  }

  /**
   * Get remaining requests in current window
   */
  getRemaining(): number {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((ts) => now - ts < this.windowMs);
    return Math.max(0, this.maxRequests - this.timestamps.length);
  }

  /**
   * Get ms until next request slot is available
   */
  getMsUntilAvailable(): number {
    if (this.timestamps.length < this.maxRequests) {
      return 0;
    }

    const now = Date.now();
    const oldestTimestamp = Math.min(...this.timestamps);
    return Math.max(0, this.windowMs - (now - oldestTimestamp));
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter(RATE_LIMIT_WINDOW_MS, MAX_MESSAGES_PER_WINDOW);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Make a request to the Telegram Bot API
 */
async function telegramApiRequest<T>(
  method: string,
  params?: Record<string, unknown>
): Promise<{ ok: boolean; result?: T; description?: string; error_code?: number }> {
  const token = getTelegramBotToken();

  if (!token) {
    console.error(`${LOG_PREFIX} Bot token not configured`);
    return { ok: false, description: "Bot token not configured" };
  }

  const url = `${TELEGRAM_API_BASE}${token}/${method}`;

  // AbortController with timeout to prevent hanging requests (C1 fix)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: params ? JSON.stringify(params) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json() as { ok: boolean; result?: unknown; error_code?: number; description?: string };

    if (!response.ok || !data.ok) {
      console.error(`${LOG_PREFIX} API error for ${method}:`, {
        status: response.status,
        error_code: data.error_code,
        description: data.description,
      });
      return {
        ok: false,
        description: data.description || `HTTP ${response.status}`,
        error_code: data.error_code,
      };
    }

    return { ok: true, result: data.result as T };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      console.error(`${LOG_PREFIX} Request timeout for ${method} after ${API_REQUEST_TIMEOUT_MS}ms`);
      return { ok: false, description: `Request timeout after ${API_REQUEST_TIMEOUT_MS / 1000}s` };
    }
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`${LOG_PREFIX} Network error for ${method}:`, errorMessage);
    return { ok: false, description: errorMessage };
  }
}

// ============================================================================
// PUBLIC FUNCTIONS
// ============================================================================

/**
 * Send a message to a Telegram chat
 *
 * @param chatId - The chat ID to send the message to (can be numeric ID or @username for public chats)
 * @param text - The message text (supports Markdown or HTML based on parseMode)
 * @param options - Optional settings for parse mode, notifications, etc.
 * @returns Result with success status and message ID if successful
 *
 * @example
 * // Send a simple message
 * const result = await sendTelegramMessage(123456789, "Hello!");
 *
 * @example
 * // Send a Markdown message silently
 * const result = await sendTelegramMessage(
 *   123456789,
 *   "*Bold* and _italic_ text",
 *   { parseMode: "Markdown", disableNotification: true }
 * );
 */
export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  options?: SendMessageOptions
): Promise<SendMessageResult> {
  // Check rate limit
  if (!rateLimiter.tryAcquire()) {
    const waitMs = rateLimiter.getMsUntilAvailable();
    console.warn(`${LOG_PREFIX} Rate limited. Wait ${waitMs}ms before next message.`);
    return {
      ok: false,
      error: `Rate limited. Try again in ${Math.ceil(waitMs / 1000)} seconds.`,
    };
  }

  console.log(`${LOG_PREFIX} Sending message to chat ${chatId} (${rateLimiter.getRemaining()} requests remaining)`);

  const params: Record<string, unknown> = {
    chat_id: chatId,
    text,
  };

  if (options?.parseMode) {
    params.parse_mode = options.parseMode;
  }

  if (options?.disableNotification) {
    params.disable_notification = true;
  }

  if (options?.disableWebPagePreview) {
    params.disable_web_page_preview = true;
  }

  if (options?.replyToMessageId) {
    params.reply_to_message_id = options.replyToMessageId;
  }

  const response = await telegramApiRequest<{ message_id: number }>("sendMessage", params);

  if (response.ok && response.result) {
    console.log(`${LOG_PREFIX} Message sent successfully. ID: ${response.result.message_id}`);
    return { ok: true, messageId: response.result.message_id };
  }

  return { ok: false, error: response.description };
}

/**
 * Send a message directly to Telegram WITHOUT the in-memory rate limiter.
 *
 * Used exclusively by the queue processor (maxInstances: 1) which handles
 * its own rate control via batch size + delay. Do NOT use this from triggers
 * or callables — use enqueueTelegramMessage() instead.
 */
export async function sendTelegramMessageDirect(
  chatId: string | number,
  text: string,
  options?: SendMessageOptions
): Promise<SendMessageResult> {
  console.log(`${LOG_PREFIX} [Direct] Sending message to chat ${chatId}`);

  const params: Record<string, unknown> = {
    chat_id: chatId,
    text,
  };

  if (options?.parseMode) {
    params.parse_mode = options.parseMode;
  }

  if (options?.disableNotification) {
    params.disable_notification = true;
  }

  if (options?.disableWebPagePreview) {
    params.disable_web_page_preview = true;
  }

  if (options?.replyToMessageId) {
    params.reply_to_message_id = options.replyToMessageId;
  }

  const response = await telegramApiRequest<{ message_id: number }>("sendMessage", params);

  if (response.ok && response.result) {
    console.log(`${LOG_PREFIX} [Direct] Message sent successfully. ID: ${response.result.message_id}`);
    return { ok: true, messageId: response.result.message_id };
  }

  return { ok: false, error: response.description };
}

/**
 * Get updates (incoming messages) from the Telegram Bot API
 *
 * This is useful for:
 * - Retrieving the chat ID when a user sends /start to your bot
 * - Processing incoming messages in a polling-based bot
 *
 * @param offset - Offset to start fetching from (use update_id + 1 to acknowledge previous updates)
 * @returns Result with list of updates if successful
 *
 * @example
 * // Get all pending updates
 * const result = await getTelegramUpdates();
 * if (result.ok && result.updates) {
 *   for (const update of result.updates) {
 *     if (update.message?.text === "/start") {
 *       console.log("Chat ID:", update.message.chat.id);
 *     }
 *   }
 * }
 */
export async function getTelegramUpdates(offset?: number): Promise<GetUpdatesResult> {
  console.log(`${LOG_PREFIX} Fetching updates${offset ? ` from offset ${offset}` : ""}`);

  const params: Record<string, unknown> = {
    timeout: 0, // Don't long-poll, return immediately
    allowed_updates: ["message", "channel_post"], // Only get message-related updates
  };

  if (offset !== undefined) {
    params.offset = offset;
  }

  const response = await telegramApiRequest<TelegramUpdate[]>("getUpdates", params);

  if (response.ok && response.result) {
    console.log(`${LOG_PREFIX} Received ${response.result.length} updates`);
    return { ok: true, updates: response.result };
  }

  return { ok: false, error: response.description };
}

/**
 * Validate the bot token by calling getMe
 *
 * @returns Result with bot username if valid
 *
 * @example
 * const result = await validateBotToken();
 * if (result.ok) {
 *   console.log("Bot is valid:", result.botUsername);
 * } else {
 *   console.error("Invalid token:", result.error);
 * }
 */
export async function validateBotToken(): Promise<ValidateTokenResult> {
  console.log(`${LOG_PREFIX} Validating bot token...`);

  const response = await telegramApiRequest<TelegramBotUser>("getMe");

  if (response.ok && response.result) {
    const username = response.result.username || response.result.first_name;
    console.log(`${LOG_PREFIX} Token valid. Bot: @${username}`);
    return { ok: true, botUsername: username };
  }

  console.error(`${LOG_PREFIX} Token validation failed:`, response.description);
  return { ok: false, error: response.description };
}

/**
 * Get information about a chat
 *
 * @param chatId - The chat ID to get info for
 * @returns Result with chat information if successful
 *
 * @example
 * const result = await getChatInfo(123456789);
 * if (result.ok && result.chat) {
 *   console.log("Chat type:", result.chat.type);
 *   console.log("Chat title:", result.chat.title);
 * }
 */
export async function getChatInfo(chatId: string | number): Promise<GetChatResult> {
  console.log(`${LOG_PREFIX} Getting chat info for ${chatId}`);

  const response = await telegramApiRequest<TelegramChat>("getChat", { chat_id: chatId });

  if (response.ok && response.result) {
    console.log(`${LOG_PREFIX} Chat info retrieved: ${response.result.type} - ${response.result.title || response.result.username || response.result.first_name}`);
    return { ok: true, chat: response.result };
  }

  return { ok: false, error: response.description };
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Escape special characters for Telegram MarkdownV2
 * Note: This is for MarkdownV2 mode. For simple Markdown mode, only escape * _ ` [
 */
export function escapeMarkdown(text: string): string {
  // Characters that need escaping in MarkdownV2
  const specialChars = ["_", "*", "[", "]", "(", ")", "~", "`", ">", "#", "+", "-", "=", "|", "{", "}", ".", "!"];
  let escaped = text;
  for (const char of specialChars) {
    escaped = escaped.replace(new RegExp(`\\${char}`, "g"), `\\${char}`);
  }
  return escaped;
}

/**
 * Get current rate limit status
 */
export function getRateLimitStatus(): { remaining: number; msUntilAvailable: number } {
  return {
    remaining: rateLimiter.getRemaining(),
    msUntilAvailable: rateLimiter.getMsUntilAvailable(),
  };
}
