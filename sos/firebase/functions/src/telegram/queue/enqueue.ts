/**
 * Enqueue Telegram Messages
 *
 * Point d'entrée universel pour envoyer des messages Telegram via la queue.
 * Au lieu d'appeler directement l'API Telegram, on écrit un document dans
 * `telegram_message_queue` qui sera traité par le processor (maxInstances: 1).
 */

import * as admin from 'firebase-admin';
import {
  QUEUE_COLLECTION,
  QueuePriority,
  MAX_RETRIES,
} from './types';

const LOG_PREFIX = '[TelegramQueue]';

/** Telegram sendMessage API limit */
const TELEGRAM_MAX_LENGTH = 4096;

// ============================================================================
// ENQUEUE FUNCTIONS
// ============================================================================

/**
 * Enqueue un message Telegram dans la queue globale.
 *
 * @param chatId - Telegram chat ID du destinataire
 * @param text - Texte du message
 * @param options - Options d'envoi et métadonnées
 * @returns ID du document créé dans la queue
 */
export async function enqueueTelegramMessage(
  chatId: string | number,
  text: string,
  options?: {
    parseMode?: 'Markdown' | 'HTML';
    disableNotification?: boolean;
    disableWebPagePreview?: boolean;
    priority?: QueuePriority;
    sourceEventType?: string;
    campaignId?: string;
    campaignBatchNumber?: number;
  }
): Promise<string> {
  // Input validation (W3)
  if (!chatId) {
    throw new Error(`${LOG_PREFIX} chatId is required`);
  }
  if (!text || text.trim().length === 0) {
    throw new Error(`${LOG_PREFIX} text is required`);
  }

  // Truncate to Telegram limit (W4)
  let finalText = text;
  if (finalText.length > TELEGRAM_MAX_LENGTH) {
    finalText = finalText.substring(0, TELEGRAM_MAX_LENGTH - 20) + '\n\n[...truncated]';
    console.warn(
      `${LOG_PREFIX} Message truncated from ${text.length} to ${finalText.length} chars`
    );
  }

  const db = admin.firestore();

  // Build document without undefined fields (C3)
  const message: Record<string, unknown> = {
    chatId,
    text: finalText,
    priority: options?.priority || 'realtime',
    status: 'pending',
    retryCount: 0,
    maxRetries: MAX_RETRIES,
    createdAt: admin.firestore.Timestamp.now(),
  };

  if (options?.parseMode) message.parseMode = options.parseMode;
  if (options?.disableNotification != null) message.disableNotification = options.disableNotification;
  if (options?.disableWebPagePreview != null) message.disableWebPagePreview = options.disableWebPagePreview;
  if (options?.sourceEventType) message.sourceEventType = options.sourceEventType;
  if (options?.campaignId) message.campaignId = options.campaignId;
  if (options?.campaignBatchNumber != null) message.campaignBatchNumber = options.campaignBatchNumber;

  const docRef = await db.collection(QUEUE_COLLECTION).add(message);

  console.log(
    `${LOG_PREFIX} Enqueued message for chat ${chatId} (priority: ${message.priority}, id: ${docRef.id})`
  );

  return docRef.id;
}

/**
 * Raccourci pour enqueue une notification (triggers Firestore existants).
 * Force la priorité "realtime" et ajoute le type d'événement source.
 *
 * @param chatId - Telegram chat ID
 * @param text - Texte du message
 * @param eventType - Type d'événement source (ex: 'new_registration')
 */
export async function enqueueTelegramNotification(
  chatId: string | number,
  text: string,
  eventType: string
): Promise<string> {
  return enqueueTelegramMessage(chatId, text, {
    parseMode: 'Markdown',
    priority: 'realtime',
    sourceEventType: eventType,
  });
}
