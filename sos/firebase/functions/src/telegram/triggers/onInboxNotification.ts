/**
 * Admin Inbox Telegram Notifications
 *
 * Sends real-time notifications to a SEPARATE Telegram bot for all inbox events:
 * - contact_messages (new contact form submissions)
 * - user_feedback (bug reports, suggestions)
 * - captain_applications (new captain candidates)
 * - partner_applications (new partner requests)
 * - payment_withdrawals (withdrawal requests)
 *
 * Uses its own bot token (TELEGRAM_INBOX_BOT_TOKEN) — completely isolated
 * from the main chatter/affiliate bot.
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { TELEGRAM_INBOX_BOT_TOKEN, TELEGRAM_INBOX_CHAT_ID, TELEGRAM_INBOX_SECRETS } from "../../lib/secrets";

// ============================================================================
// HELPER: Send message via Telegram Bot API
// ============================================================================

async function sendTelegramInbox(text: string): Promise<boolean> {
  const botToken = TELEGRAM_INBOX_BOT_TOKEN.value()?.trim();
  const chatId = TELEGRAM_INBOX_CHAT_ID.value()?.trim();

  if (!botToken || !chatId) {
    logger.error("[InboxTelegram] Missing TELEGRAM_INBOX_BOT_TOKEN or TELEGRAM_INBOX_CHAT_ID");
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      logger.error("[InboxTelegram] Telegram API error", { status: res.status, body: errBody });
      return false;
    }

    return true;
  } catch (err) {
    logger.error("[InboxTelegram] fetch error", { error: err instanceof Error ? err.message : err });
    return false;
  }
}

// Paris timezone helpers
function getParisDateTime(): { date: string; time: string } {
  const now = new Date();
  return {
    date: new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric" }).format(now),
    time: new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hour12: false }).format(now),
  };
}

function truncate(s: string, max = 150): string {
  return s.length <= max ? s : s.substring(0, max) + "...";
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ============================================================================
// TRIGGER CONFIG (all in europe-west3 like other Firestore triggers)
// ============================================================================

const TRIGGER_CONFIG = {
  region: "europe-west3" as const,
  memory: "256MiB" as const,
  cpu: 0.083,
  timeoutSeconds: 30,
  secrets: TELEGRAM_INBOX_SECRETS,
};

// ============================================================================
// 1. CONTACT MESSAGES
// ============================================================================

export const inboxNotifyContact = onDocumentCreated(
  { ...TRIGGER_CONFIG, document: "contact_messages/{docId}" },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const { date, time } = getParisDateTime();
    const name = escapeHtml((data.name as string) || (data.email as string) || "N/A");
    const email = escapeHtml((data.email as string) || "N/A");
    const subject = escapeHtml((data.subject as string) || "Sans objet");
    const message = escapeHtml(truncate((data.message as string) || ""));

    const text = [
      `<b>📩 Nouveau message contact</b>`,
      ``,
      `<b>De:</b> ${name}`,
      `<b>Email:</b> ${email}`,
      `<b>Sujet:</b> ${subject}`,
      `<b>Message:</b> ${message}`,
      ``,
      `🕐 ${date} ${time}`,
    ].join("\n");

    await sendTelegramInbox(text);
    logger.info("[InboxTelegram] Contact notification sent", { docId: event.params.docId });
  }
);

// ============================================================================
// 2. USER FEEDBACK
// ============================================================================

export const inboxNotifyFeedback = onDocumentCreated(
  { ...TRIGGER_CONFIG, document: "user_feedback/{docId}" },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const { date, time } = getParisDateTime();
    const typeLabel = data.type === "bug" ? "Bug" : data.type === "ux_friction" ? "UX" : data.type === "suggestion" ? "Suggestion" : "Autre";
    const email = escapeHtml((data.email as string) || "N/A");
    const page = escapeHtml((data.pageName as string) || (data.pageUrl as string) || "N/A");
    const description = escapeHtml(truncate((data.description as string) || ""));

    const text = [
      `<b>💬 Nouveau feedback [${typeLabel}]</b>`,
      ``,
      `<b>De:</b> ${email}`,
      `<b>Page:</b> ${page}`,
      `<b>Description:</b> ${description}`,
      ``,
      `🕐 ${date} ${time}`,
    ].join("\n");

    await sendTelegramInbox(text);
    logger.info("[InboxTelegram] Feedback notification sent", { docId: event.params.docId });
  }
);

// ============================================================================
// 3. CAPTAIN APPLICATIONS
// ============================================================================

export const inboxNotifyCaptain = onDocumentCreated(
  { ...TRIGGER_CONFIG, document: "captain_applications/{docId}" },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const { date, time } = getParisDateTime();
    const name = escapeHtml((data.name as string) || "N/A");
    const country = escapeHtml((data.country as string) || "?");
    const whatsapp = escapeHtml((data.whatsapp as string) || "N/A");
    const motivation = escapeHtml(truncate((data.motivation as string) || ""));

    const text = [
      `<b>👑 Nouvelle candidature Captain</b>`,
      ``,
      `<b>Nom:</b> ${name}`,
      `<b>Pays:</b> ${country}`,
      `<b>WhatsApp:</b> ${whatsapp}`,
      `<b>Motivation:</b> ${motivation}`,
      ``,
      `🕐 ${date} ${time}`,
    ].join("\n");

    await sendTelegramInbox(text);
    logger.info("[InboxTelegram] Captain notification sent", { docId: event.params.docId });
  }
);

// ============================================================================
// 4. PARTNER APPLICATIONS
// ============================================================================

export const inboxNotifyPartner = onDocumentCreated(
  { ...TRIGGER_CONFIG, document: "partner_applications/{docId}" },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const { date, time } = getParisDateTime();
    const name = escapeHtml(`${(data.firstName as string) || ""} ${(data.lastName as string) || ""}`.trim() || "N/A");
    const email = escapeHtml((data.email as string) || "N/A");
    const website = escapeHtml((data.websiteName as string) || (data.websiteUrl as string) || "N/A");
    const country = escapeHtml((data.country as string) || "?");
    const message = data.message ? escapeHtml(truncate(data.message as string)) : "";

    const lines = [
      `<b>🤝 Nouvelle candidature partenaire</b>`,
      ``,
      `<b>Nom:</b> ${name}`,
      `<b>Email:</b> ${email}`,
      `<b>Site:</b> ${website}`,
      `<b>Pays:</b> ${country}`,
    ];
    if (message) lines.push(`<b>Message:</b> ${message}`);
    lines.push(``, `🕐 ${date} ${time}`);

    await sendTelegramInbox(lines.join("\n"));
    logger.info("[InboxTelegram] Partner notification sent", { docId: event.params.docId });
  }
);

// ============================================================================
// 5. WITHDRAWAL REQUESTS
// ============================================================================

export const inboxNotifyWithdrawal = onDocumentCreated(
  { ...TRIGGER_CONFIG, document: "payment_withdrawals/{docId}" },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const { date, time } = getParisDateTime();
    const userName = escapeHtml((data.userName as string) || (data.userEmail as string) || "N/A");
    const userType = escapeHtml((data.userType as string) || "affiliate");
    const amount = ((data.amount as number) || 0) / 100;
    const fee = ((data.withdrawalFee as number) || 0) / 100;
    const total = amount + fee;
    const method = data.provider === "wise" ? "Wise" : data.provider === "flutterwave" ? "Mobile Money" : "Virement";

    const text = [
      `<b>💰 Nouvelle demande de retrait</b>`,
      ``,
      `<b>De:</b> ${userName} (${userType})`,
      `<b>Montant:</b> $${amount.toFixed(2)}`,
      `<b>Frais:</b> $${fee.toFixed(2)}`,
      `<b>Total debite:</b> $${total.toFixed(2)}`,
      `<b>Methode:</b> ${method}`,
      ``,
      `🕐 ${date} ${time}`,
    ].join("\n");

    await sendTelegramInbox(text);
    logger.info("[InboxTelegram] Withdrawal notification sent", { docId: event.params.docId });
  }
);
