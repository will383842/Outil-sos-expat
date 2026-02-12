import { vi } from "vitest";

export type InlineKeyboard = Array<
  Array<{ text: string; url?: string; callback_data?: string }>
>;

export interface SendMessageResult {
  ok: boolean;
  messageId?: number;
  error?: string;
  retryAfter?: number;
}

export const sendMessage = vi.fn<
  (
    chatId: string,
    text: string,
    parseMode?: string,
    replyMarkup?: InlineKeyboard
  ) => Promise<SendMessageResult>
>().mockResolvedValue({ ok: true, messageId: 1001 });

export const sendPhoto = vi.fn<
  (
    chatId: string,
    photoUrl: string,
    caption?: string,
    parseMode?: string,
    replyMarkup?: InlineKeyboard
  ) => Promise<SendMessageResult>
>().mockResolvedValue({ ok: true, messageId: 1002 });

export const sendDocument = vi.fn<
  (
    chatId: string,
    documentUrl: string,
    caption?: string,
    parseMode?: string,
    replyMarkup?: InlineKeyboard
  ) => Promise<SendMessageResult>
>().mockResolvedValue({ ok: true, messageId: 1003 });

export const sendVideo = vi.fn<
  (
    chatId: string,
    videoUrl: string,
    caption?: string,
    parseMode?: string,
    replyMarkup?: InlineKeyboard
  ) => Promise<SendMessageResult>
>().mockResolvedValue({ ok: true, messageId: 1004 });

export const validateBot = vi.fn().mockResolvedValue({
  ok: true,
  username: "test_bot",
});

export const getUpdates = vi.fn().mockResolvedValue({
  ok: true,
  updates: [],
});
