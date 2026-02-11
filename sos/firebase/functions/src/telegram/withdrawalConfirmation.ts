/**
 * Telegram Withdrawal Confirmation System
 *
 * Sends inline keyboard confirmations to Telegram for withdrawal requests.
 * Handles callback_query responses (Confirm/Cancel).
 * Provides a polling callable for frontend status checks.
 *
 * Collection: telegram_withdrawal_confirmations/{code}
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";
import * as crypto from "crypto";
import { getTelegramBotToken } from "../lib/secrets";

// ============================================================================
// TYPES
// ============================================================================

export type WithdrawalConfirmationRole = "chatter" | "influencer" | "blogger" | "groupAdmin";

export type WithdrawalConfirmationStatus = "pending" | "confirmed" | "cancelled" | "expired";

export interface TelegramWithdrawalConfirmation {
  code: string;
  withdrawalId: string;
  userId: string;
  role: WithdrawalConfirmationRole;
  collection: "payment_withdrawals" | "group_admin_withdrawals";
  amount: number;
  paymentMethod: string;
  telegramId: number;
  telegramMessageId?: number;
  status: WithdrawalConfirmationStatus;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  resolvedAt?: Timestamp;
}

export interface SendConfirmationParams {
  withdrawalId: string;
  userId: string;
  role: WithdrawalConfirmationRole;
  collection: "payment_withdrawals" | "group_admin_withdrawals";
  amount: number;
  paymentMethod: string;
  telegramId: number;
}

// ============================================================================
// LAZY INITIALIZATION
// ============================================================================

function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

function getDb() {
  ensureInitialized();
  return getFirestore();
}

// ============================================================================
// TELEGRAM API HELPERS
// ============================================================================

/**
 * Send a Telegram message with an inline keyboard
 */
export async function sendTelegramMessageWithKeyboard(
  chatId: number,
  text: string,
  keyboard: Array<Array<{ text: string; callback_data: string }>>,
  parseMode: "HTML" | "Markdown" = "HTML"
): Promise<{ ok: boolean; messageId?: number }> {
  const botToken = getTelegramBotToken();
  if (!botToken) {
    logger.warn("[sendTelegramMessageWithKeyboard] Bot token not configured");
    return { ok: false };
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: parseMode,
          reply_markup: { inline_keyboard: keyboard },
        }),
      }
    );

    const data = await response.json() as { ok: boolean; result?: { message_id: number } };

    if (!data.ok) {
      logger.error("[sendTelegramMessageWithKeyboard] Failed", { chatId, data });
      return { ok: false };
    }

    return { ok: true, messageId: data.result?.message_id };
  } catch (error) {
    logger.error("[sendTelegramMessageWithKeyboard] Error", { chatId, error });
    return { ok: false };
  }
}

/**
 * Answer a callback query (shows toast in Telegram)
 */
export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
  showAlert?: boolean
): Promise<boolean> {
  const botToken = getTelegramBotToken();
  if (!botToken) return false;

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/answerCallbackQuery`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text,
          show_alert: showAlert || false,
        }),
      }
    );
    const data = await response.json() as { ok: boolean };
    return data.ok;
  } catch (error) {
    logger.error("[answerCallbackQuery] Error", { error });
    return false;
  }
}

/**
 * Edit an existing Telegram message (replace text + remove keyboard)
 */
export async function editMessageText(
  chatId: number,
  messageId: number,
  text: string,
  parseMode: "HTML" | "Markdown" = "HTML",
  replyMarkup?: { inline_keyboard: Array<Array<{ text: string; callback_data: string }>> }
): Promise<boolean> {
  const botToken = getTelegramBotToken();
  if (!botToken) return false;

  try {
    const body: Record<string, unknown> = {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: parseMode,
    };
    if (replyMarkup) {
      body.reply_markup = replyMarkup;
    } else {
      body.reply_markup = { inline_keyboard: [] };
    }

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/editMessageText`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    const data = await response.json() as { ok: boolean };
    return data.ok;
  } catch (error) {
    logger.error("[editMessageText] Error", { error });
    return false;
  }
}

// ============================================================================
// BUSINESS LOGIC
// ============================================================================

/**
 * Send a withdrawal confirmation request via Telegram inline keyboard
 */
export async function sendWithdrawalConfirmation(
  params: SendConfirmationParams
): Promise<{ success: boolean; confirmationCode?: string }> {
  const db = getDb();
  const code = crypto.randomBytes(8).toString("hex"); // 16 chars
  const now = Timestamp.now();
  const expiresAt = Timestamp.fromMillis(now.toMillis() + 15 * 60 * 1000); // 15 min

  const amountFormatted = (params.amount / 100).toFixed(2);

  // 1. Create confirmation document
  const confirmationData: TelegramWithdrawalConfirmation = {
    code,
    withdrawalId: params.withdrawalId,
    userId: params.userId,
    role: params.role,
    collection: params.collection,
    amount: params.amount,
    paymentMethod: params.paymentMethod,
    telegramId: params.telegramId,
    status: "pending",
    createdAt: now,
    expiresAt,
  };

  await db.collection("telegram_withdrawal_confirmations").doc(code).set(confirmationData);

  // 2. Build inline keyboard
  const keyboard = [
    [
      { text: `Confirmer $${amountFormatted}`, callback_data: `wc_confirm_${code}` },
      { text: "Annuler", callback_data: `wc_cancel_${code}` },
    ],
  ];

  // 3. Send message
  const roleLabels: Record<WithdrawalConfirmationRole, string> = {
    chatter: "Chatter",
    influencer: "Influenceur",
    blogger: "Blogueur",
    groupAdmin: "Admin Groupe",
  };

  const message =
    `<b>Confirmation de retrait</b>\n\n` +
    `Montant : <b>$${amountFormatted}</b>\n` +
    `Méthode : <b>${params.paymentMethod}</b>\n` +
    `Rôle : ${roleLabels[params.role]}\n\n` +
    `Ce lien expire dans <b>15 minutes</b>.\n\n` +
    `Appuyez sur <b>Confirmer</b> pour valider ou <b>Annuler</b> pour annuler.`;

  const result = await sendTelegramMessageWithKeyboard(
    params.telegramId,
    message,
    keyboard
  );

  if (result.ok && result.messageId) {
    // Store the message ID for later editing
    await db.collection("telegram_withdrawal_confirmations").doc(code).update({
      telegramMessageId: result.messageId,
    });
  }

  // 4. Flag the withdrawal doc
  await db.collection(params.collection).doc(params.withdrawalId).update({
    telegramConfirmationPending: true,
    telegramConfirmationCode: code,
  });

  logger.info("[sendWithdrawalConfirmation] Confirmation sent", {
    code,
    withdrawalId: params.withdrawalId,
    userId: params.userId,
    telegramId: params.telegramId,
  });

  return { success: result.ok, confirmationCode: code };
}

/**
 * Handle a callback_query from Telegram (Confirm or Cancel)
 */
export async function handleWithdrawalCallback(
  callbackQuery: {
    id: string;
    from: { id: number };
    data?: string;
    message?: { chat: { id: number }; message_id: number };
  }
): Promise<void> {
  const callbackData = callbackQuery.data || "";
  const chatId = callbackQuery.message?.chat?.id;
  const messageId = callbackQuery.message?.message_id;

  // Parse action + code
  const match = callbackData.match(/^wc_(confirm|cancel)_(.+)$/);
  if (!match) {
    await answerCallbackQuery(callbackQuery.id, "Action invalide", true);
    return;
  }

  const action = match[1] as "confirm" | "cancel";
  const code = match[2];

  const db = getDb();
  const confirmRef = db.collection("telegram_withdrawal_confirmations").doc(code);
  const confirmDoc = await confirmRef.get();

  if (!confirmDoc.exists) {
    await answerCallbackQuery(callbackQuery.id, "Demande introuvable ou expirée", true);
    return;
  }

  const confirmation = confirmDoc.data() as TelegramWithdrawalConfirmation;

  // Security: verify the Telegram user matches
  if (callbackQuery.from.id !== confirmation.telegramId) {
    logger.warn("[handleWithdrawalCallback] Telegram ID mismatch", {
      expected: confirmation.telegramId,
      got: callbackQuery.from.id,
    });
    await answerCallbackQuery(callbackQuery.id, "Non autorisé", true);
    return;
  }

  // Check not already resolved
  if (confirmation.status !== "pending") {
    await answerCallbackQuery(callbackQuery.id, `Déjà ${confirmation.status}`, true);
    return;
  }

  // Check expiry
  if (confirmation.expiresAt.toMillis() < Date.now()) {
    await confirmRef.update({ status: "expired" });
    await answerCallbackQuery(callbackQuery.id, "Demande expirée", true);
    if (chatId && messageId) {
      await editMessageText(chatId, messageId, "⏰ <b>Demande expirée</b>\n\nCette demande de retrait a expiré.");
    }
    return;
  }

  const now = Timestamp.now();
  const amountFormatted = (confirmation.amount / 100).toFixed(2);

  if (action === "confirm") {
    // Update confirmation doc
    await confirmRef.update({
      status: "confirmed",
      resolvedAt: now,
    });

    // Update withdrawal doc - clear pending flag
    await db.collection(confirmation.collection).doc(confirmation.withdrawalId).update({
      telegramConfirmationPending: false,
      telegramConfirmedAt: now,
    });

    await answerCallbackQuery(callbackQuery.id, "Retrait confirmé !");

    if (chatId && messageId) {
      await editMessageText(
        chatId,
        messageId,
        `✅ <b>Retrait confirmé !</b>\n\nVotre retrait de <b>$${amountFormatted}</b> via <b>${confirmation.paymentMethod}</b> a été confirmé.\n\nIl sera traité dans les plus brefs délais.`
      );
    }

    logger.info("[handleWithdrawalCallback] Withdrawal confirmed", {
      code,
      withdrawalId: confirmation.withdrawalId,
    });
  } else {
    // Cancel: update confirmation + cancel withdrawal + refund balance
    await db.runTransaction(async (transaction) => {
      // Update confirmation
      transaction.update(confirmRef, {
        status: "cancelled",
        resolvedAt: now,
      });

      // Update withdrawal status to cancelled
      const withdrawalRef = db.collection(confirmation.collection).doc(confirmation.withdrawalId);
      transaction.update(withdrawalRef, {
        status: "cancelled",
        cancelledAt: now.toDate().toISOString(),
        telegramConfirmationPending: false,
        statusHistory: FieldValue.arrayUnion({
          status: "cancelled",
          timestamp: now.toDate().toISOString(),
          actorType: "user",
          note: "Cancelled via Telegram",
        }),
      });

      // Refund balance based on role
      if (confirmation.role === "groupAdmin") {
        const gaRef = db.collection("group_admins").doc(confirmation.userId);
        transaction.update(gaRef, {
          availableBalance: FieldValue.increment(confirmation.amount),
          pendingWithdrawalId: null,
          updatedAt: now,
        });
      } else {
        // Chatter/Influencer/Blogger: refund to their collection
        const roleCollections: Record<string, string> = {
          chatter: "chatters",
          influencer: "influencers",
          blogger: "bloggers",
        };
        const col = roleCollections[confirmation.role];
        if (col) {
          const roleRef = db.collection(col).doc(confirmation.userId);
          transaction.update(roleRef, {
            availableBalance: FieldValue.increment(confirmation.amount),
            updatedAt: now,
          });
        }
      }
    });

    await answerCallbackQuery(callbackQuery.id, "Retrait annulé");

    if (chatId && messageId) {
      await editMessageText(
        chatId,
        messageId,
        `❌ <b>Retrait annulé</b>\n\nVotre demande de retrait de <b>$${amountFormatted}</b> a été annulée.\nLe montant a été recrédité à votre solde.`
      );
    }

    logger.info("[handleWithdrawalCallback] Withdrawal cancelled via Telegram", {
      code,
      withdrawalId: confirmation.withdrawalId,
    });
  }
}

// ============================================================================
// CALLABLE: Get Withdrawal Confirmation Status (polling)
// ============================================================================

export const getWithdrawalConfirmationStatus = onCall(
  {
    region: "europe-west3",
    memory: "256MiB",
    timeoutSeconds: 15,
    cors: [
      "https://sos-expat.com",
      "https://www.sos-expat.com",
      "https://ia.sos-expat.com",
      "https://outil-sos-expat.pages.dev",
      "http://localhost:5173",
      "http://localhost:3000",
    ],
  },
  async (request): Promise<{
    success: boolean;
    status: string;
    telegramConfirmationPending: boolean;
    telegramConfirmedAt?: string;
  }> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const { withdrawalId } = request.data as { withdrawalId: string };

    if (!withdrawalId) {
      throw new HttpsError("invalid-argument", "withdrawalId is required");
    }

    const db = getDb();

    // Try payment_withdrawals first, then group_admin_withdrawals
    let withdrawalDoc = await db.collection("payment_withdrawals").doc(withdrawalId).get();

    if (!withdrawalDoc.exists) {
      withdrawalDoc = await db.collection("group_admin_withdrawals").doc(withdrawalId).get();
    }

    if (!withdrawalDoc.exists) {
      throw new HttpsError("not-found", "Withdrawal not found");
    }

    const data = withdrawalDoc.data()!;

    // Security: verify ownership
    if (data.userId !== userId) {
      throw new HttpsError("permission-denied", "Not your withdrawal");
    }

    return {
      success: true,
      status: data.status || "pending",
      telegramConfirmationPending: data.telegramConfirmationPending || false,
      telegramConfirmedAt: data.telegramConfirmedAt
        ? (data.telegramConfirmedAt.toDate ? data.telegramConfirmedAt.toDate().toISOString() : data.telegramConfirmedAt)
        : undefined,
    };
  }
);
