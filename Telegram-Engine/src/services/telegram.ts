import { logger } from "../utils/logger.js";

const BOT_TOKEN = process.env["TELEGRAM_BOT_TOKEN"];
if (!BOT_TOKEN || BOT_TOKEN.trim().length === 0) {
  logger.fatal("TELEGRAM_BOT_TOKEN environment variable is required and must not be empty");
  process.exit(1);
}
const BASE_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Telegram rate limits: 30 msg/sec globally, 1 msg/sec per chat
const GLOBAL_RATE_LIMIT = 30;
const PER_CHAT_COOLDOWN_MS = 1100; // slightly over 1s

let globalSendCount = 0;
let globalResetAt = Date.now() + 1000;
const chatLastSent = new Map<string, number>();

function resetGlobalIfNeeded() {
  const now = Date.now();
  if (now >= globalResetAt) {
    globalSendCount = 0;
    globalResetAt = now + 1000;
  }
}

async function waitForSlot(chatId: string): Promise<void> {
  // Global rate limit
  resetGlobalIfNeeded();
  while (globalSendCount >= GLOBAL_RATE_LIMIT) {
    const waitMs = globalResetAt - Date.now();
    if (waitMs > 0) await sleep(waitMs);
    resetGlobalIfNeeded();
  }

  // Per-chat cooldown
  const lastSent = chatLastSent.get(chatId) ?? 0;
  const elapsed = Date.now() - lastSent;
  if (elapsed < PER_CHAT_COOLDOWN_MS) {
    await sleep(PER_CHAT_COOLDOWN_MS - elapsed);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface SendMessageResult {
  ok: boolean;
  messageId?: number;
  error?: string;
  retryAfter?: number;
}

export type InlineKeyboard = Array<Array<{ text: string; url?: string; callback_data?: string }>>;

export async function sendMessage(
  chatId: string,
  text: string,
  parseMode: string = "HTML",
  replyMarkup?: InlineKeyboard
): Promise<SendMessageResult> {
  try {
    await waitForSlot(chatId);

    const body: Record<string, unknown> = {
      chat_id: chatId,
      text,
      parse_mode: parseMode,
    };
    if (replyMarkup?.length) {
      body["reply_markup"] = { inline_keyboard: replyMarkup };
    }

    const res = await fetch(`${BASE_URL}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    globalSendCount++;
    chatLastSent.set(chatId, Date.now());

    return parseResponse(res, chatId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    logger.error({ err, chatId }, "Telegram sendMessage failed");
    return { ok: false, error: message };
  }
}

/**
 * Send a photo with optional caption.
 * Supports URL or file_id.
 */
export async function sendPhoto(
  chatId: string,
  photoUrl: string,
  caption?: string,
  parseMode: string = "HTML",
  replyMarkup?: InlineKeyboard
): Promise<SendMessageResult> {
  try {
    await waitForSlot(chatId);

    const body: Record<string, unknown> = {
      chat_id: chatId,
      photo: photoUrl,
    };
    if (caption) body["caption"] = caption;
    if (parseMode) body["parse_mode"] = parseMode;
    if (replyMarkup?.length) {
      body["reply_markup"] = { inline_keyboard: replyMarkup };
    }

    const res = await fetch(`${BASE_URL}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    globalSendCount++;
    chatLastSent.set(chatId, Date.now());

    return parseResponse(res, chatId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    logger.error({ err, chatId }, "Telegram sendPhoto failed");
    return { ok: false, error: message };
  }
}

/**
 * Send a document with optional caption.
 */
export async function sendDocument(
  chatId: string,
  documentUrl: string,
  caption?: string,
  parseMode: string = "HTML",
  replyMarkup?: InlineKeyboard
): Promise<SendMessageResult> {
  try {
    await waitForSlot(chatId);

    const body: Record<string, unknown> = {
      chat_id: chatId,
      document: documentUrl,
    };
    if (caption) body["caption"] = caption;
    if (parseMode) body["parse_mode"] = parseMode;
    if (replyMarkup?.length) {
      body["reply_markup"] = { inline_keyboard: replyMarkup };
    }

    const res = await fetch(`${BASE_URL}/sendDocument`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    globalSendCount++;
    chatLastSent.set(chatId, Date.now());

    return parseResponse(res, chatId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    logger.error({ err, chatId }, "Telegram sendDocument failed");
    return { ok: false, error: message };
  }
}

/**
 * Send a video with optional caption.
 */
export async function sendVideo(
  chatId: string,
  videoUrl: string,
  caption?: string,
  parseMode: string = "HTML",
  replyMarkup?: InlineKeyboard
): Promise<SendMessageResult> {
  try {
    await waitForSlot(chatId);

    const body: Record<string, unknown> = {
      chat_id: chatId,
      video: videoUrl,
    };
    if (caption) body["caption"] = caption;
    if (parseMode) body["parse_mode"] = parseMode;
    if (replyMarkup?.length) {
      body["reply_markup"] = { inline_keyboard: replyMarkup };
    }

    const res = await fetch(`${BASE_URL}/sendVideo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    globalSendCount++;
    chatLastSent.set(chatId, Date.now());

    return parseResponse(res, chatId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    logger.error({ err, chatId }, "Telegram sendVideo failed");
    return { ok: false, error: message };
  }
}

/** Parse Telegram API response (shared across send methods) */
async function parseResponse(res: Response, chatId: string): Promise<SendMessageResult> {
  const data = await res.json() as Record<string, unknown>;

  if (data["ok"]) {
    const result = data["result"] as Record<string, unknown>;
    return { ok: true, messageId: result["message_id"] as number };
  }

  // Handle rate limiting (429)
  if (res.status === 429) {
    const params = data["parameters"] as Record<string, unknown> | undefined;
    const retryAfter = (params?.["retry_after"] as number) ?? 30;
    logger.warn({ chatId, retryAfter }, "Telegram rate limited");
    return { ok: false, error: "Rate limited", retryAfter };
  }

  return { ok: false, error: (data["description"] as string) ?? "Unknown error" };
}

export async function validateBot(): Promise<{
  ok: boolean;
  username?: string;
  error?: string;
}> {
  try {
    const res = await fetch(`${BASE_URL}/getMe`);
    const data = await res.json() as Record<string, unknown>;
    if (data["ok"]) {
      const result = data["result"] as Record<string, unknown>;
      return { ok: true, username: result["username"] as string };
    }
    return { ok: false, error: (data["description"] as string) ?? "Invalid token" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

export async function getUpdates(offset?: number): Promise<{
  ok: boolean;
  updates?: Array<Record<string, unknown>>;
  error?: string;
}> {
  try {
    const params = new URLSearchParams({ limit: "10", timeout: "0" });
    if (offset !== undefined) params.set("offset", String(offset));

    const res = await fetch(`${BASE_URL}/getUpdates?${params}`);
    const data = await res.json() as Record<string, unknown>;

    if (data["ok"]) {
      return { ok: true, updates: data["result"] as Array<Record<string, unknown>> };
    }
    return { ok: false, error: (data["description"] as string) ?? "Unknown error" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Network error" };
  }
}
