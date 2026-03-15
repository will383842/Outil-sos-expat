/**
 * Chatter Transactional Emails via MailWizz
 *
 * Sends beautiful HTML emails to chatters for key lifecycle events.
 * Uses MailWizz templates from: templates/transactional/chatter/{lang}/
 *
 * Template code pattern: TR_CHAT_<slug>_<LANG>
 *   → converted by mailwizz.ts to: transactional-chatter-<slug> [LANG]
 *
 * Events covered (16 templates × 9 languages = 144 templates):
 *   welcome, first-commission, commission-earned, withdrawal-requested,
 *   withdrawal-sent, withdrawal-failed, recruit-signup, recruit-first-commission,
 *   milestone, monthly-stats, weekly-stats, telegram-linked, bonus-unlocked,
 *   account-warning, threshold-reached, inactivity-reminder
 */

import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { MailwizzAPI } from "../utils/mailwizz";
import { mapChatterToMailWizzFields } from "../utils/fieldMapper";
import { getLanguageCode } from "../config";

const db = admin.firestore();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get chatter doc + language code */
async function getChatterContext(chatterId: string) {
  const snap = await db.collection("chatters").doc(chatterId).get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  const lang = getLanguageCode(data.language || data.preferredLanguage || "en");
  const fields = mapChatterToMailWizzFields(data, chatterId);
  return { data, lang, fields, email: data.email as string };
}

/** Send a chatter transactional email (non-blocking, never throws) */
async function sendChatterEmail(
  email: string,
  slug: string,
  lang: string,
  fields: Record<string, string>
): Promise<boolean> {
  try {
    const api = new MailwizzAPI();
    await api.sendTransactional({
      to: email,
      template: `TR_CHAT_${slug}_${lang}`,
      customFields: fields,
    });
    return true;
  } catch (err) {
    console.error(`[ChatterEmail] Failed to send ${slug} to ${email.slice(0, 4)}***:`, err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// 1. WELCOME — on chatter registration
// ---------------------------------------------------------------------------
export const chatterEmailWelcome = functions.firestore.onDocumentCreated(
  {
    document: "chatters/{chatterId}",
    region: "europe-west3",
  },
  async (event) => {
    const data = event.data?.data();
    if (!data?.email) return;

    const chatterId = event.params.chatterId;
    const lang = getLanguageCode(data.language || data.preferredLanguage || "en");
    const fields = mapChatterToMailWizzFields(data, chatterId);

    await sendChatterEmail(data.email, "welcome", lang, fields);
  }
);

// ---------------------------------------------------------------------------
// 2. COMMISSION EARNED — on commission creation in chatter_notifications
// ---------------------------------------------------------------------------
export const chatterEmailCommission = functions.firestore.onDocumentCreated(
  {
    document: "chatter_notifications/{notifId}",
    region: "europe-west3",
  },
  async (event) => {
    const notif = event.data?.data();
    if (!notif || notif.type !== "commission_earned" || notif.emailSent === true) return;

    const chatterId = notif.chatterId;
    if (!chatterId) return;

    const ctx = await getChatterContext(chatterId);
    if (!ctx) return;

    // Determine if first commission
    const commCount = await db
      .collection("affiliate_commissions")
      .where("chatterId", "==", chatterId)
      .where("status", "in", ["available", "validated", "pending"])
      .limit(2)
      .get();

    const isFirst = commCount.size <= 1;
    const slug = isFirst ? "first-commission" : "commission-earned";

    // Populate per-event fields
    ctx.fields.LAST_COMMISSION_AMOUNT = notif.data?.amount
      ? `$${(notif.data.amount / 100).toFixed(2)}`
      : "$0";
    ctx.fields.LAST_COMMISSION_TYPE = notif.data?.commissionType || "";

    const sent = await sendChatterEmail(ctx.email, slug, ctx.lang, ctx.fields);

    // Mark notification as email sent
    if (sent) {
      await event.data?.ref.update({ emailSent: true });
    }
  }
);

// ---------------------------------------------------------------------------
// 3. RECRUIT SIGNUP — when new team member registers
// ---------------------------------------------------------------------------
export const chatterEmailRecruitSignup = functions.firestore.onDocumentCreated(
  {
    document: "chatter_notifications/{notifId}",
    region: "europe-west3",
  },
  async (event) => {
    const notif = event.data?.data();
    if (!notif || notif.type !== "new_recruit" || notif.emailSent === true) return;

    const chatterId = notif.chatterId;
    if (!chatterId) return;

    const ctx = await getChatterContext(chatterId);
    if (!ctx) return;

    ctx.fields.NEW_RECRUIT_NAME = notif.data?.recruitName || notif.data?.recruitFirstName || "";

    const sent = await sendChatterEmail(ctx.email, "recruit-signup", ctx.lang, ctx.fields);
    if (sent) await event.data?.ref.update({ emailSent: true });
  }
);

// ---------------------------------------------------------------------------
// 4. WITHDRAWAL STATUS EMAILS — on withdrawal status change
// ---------------------------------------------------------------------------
export const chatterEmailWithdrawal = functions.firestore.onDocumentUpdated(
  {
    document: "payment_withdrawals/{withdrawalId}",
    region: "europe-west3",
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    // Only process status transitions
    if (before.status === after.status) return;

    // Only handle chatter withdrawals
    const role = after.role || after.userRole;
    if (role !== "chatter" && role !== "captainChatter") return;

    // Map status → template slug
    const statusToSlug: Record<string, string> = {
      approved: "withdrawal-requested",
      sent: "withdrawal-sent",
      completed: "withdrawal-sent",
      failed: "withdrawal-failed",
    };

    const slug = statusToSlug[after.status];
    if (!slug) return; // No email for other statuses

    const userId = after.userId || after.chatterId;
    if (!userId) return;

    const ctx = await getChatterContext(userId);
    if (!ctx) return;

    ctx.fields.WITHDRAWAL_AMOUNT = after.amount
      ? `$${(after.amount / 100).toFixed(2)}`
      : "$0";
    ctx.fields.WITHDRAWAL_FEE = after.withdrawalFee
      ? `$${(after.withdrawalFee / 100).toFixed(2)}`
      : "$3";

    await sendChatterEmail(ctx.email, slug, ctx.lang, ctx.fields);
  }
);

// ---------------------------------------------------------------------------
// 5. MILESTONE REACHED — on badge/tier achievement
// ---------------------------------------------------------------------------
export const chatterEmailMilestone = functions.firestore.onDocumentCreated(
  {
    document: "chatter_notifications/{notifId}",
    region: "europe-west3",
  },
  async (event) => {
    const notif = event.data?.data();
    if (!notif || notif.emailSent === true) return;

    // Handle milestone and tier bonus types
    const isMilestone = notif.type === "milestone" || notif.type === "badge_earned";
    const isTierBonus = notif.type === "tier_bonus_unlocked";
    if (!isMilestone && !isTierBonus) return;

    const chatterId = notif.chatterId;
    if (!chatterId) return;

    const ctx = await getChatterContext(chatterId);
    if (!ctx) return;

    const slug = isTierBonus ? "bonus-unlocked" : "milestone";
    const sent = await sendChatterEmail(ctx.email, slug, ctx.lang, ctx.fields);
    if (sent) await event.data?.ref.update({ emailSent: true });
  }
);

// ---------------------------------------------------------------------------
// 6. THRESHOLD REACHED — when available balance reaches withdrawal threshold
// ---------------------------------------------------------------------------
export const chatterEmailThreshold = functions.firestore.onDocumentCreated(
  {
    document: "chatter_notifications/{notifId}",
    region: "europe-west3",
  },
  async (event) => {
    const notif = event.data?.data();
    if (!notif || notif.type !== "threshold_reached" || notif.emailSent === true) return;

    const chatterId = notif.chatterId;
    if (!chatterId) return;

    const ctx = await getChatterContext(chatterId);
    if (!ctx) return;

    const sent = await sendChatterEmail(ctx.email, "threshold-reached", ctx.lang, ctx.fields);
    if (sent) await event.data?.ref.update({ emailSent: true });
  }
);

// ---------------------------------------------------------------------------
// 7. TELEGRAM LINKED — when chatter links Telegram account
// ---------------------------------------------------------------------------
export const chatterEmailTelegramLinked = functions.firestore.onDocumentUpdated(
  {
    document: "chatters/{chatterId}",
    region: "europe-west3",
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    // Detect telegram_id being set for the first time
    if (before.telegram_id || !after.telegram_id) return;
    if (!after.email) return;

    const chatterId = event.params.chatterId;
    const lang = getLanguageCode(after.language || after.preferredLanguage || "en");
    const fields = mapChatterToMailWizzFields(after, chatterId);

    await sendChatterEmail(after.email, "telegram-linked", lang, fields);
  }
);

// ---------------------------------------------------------------------------
// 8. INACTIVITY REMINDER — scheduled daily for inactive chatters
// ---------------------------------------------------------------------------
export const chatterEmailInactivityReminder = functions.scheduler.onSchedule(
  {
    schedule: "every 24 hours",
    timeZone: "UTC",
    region: "europe-west3",
  },
  async () => {
    const thirtyDaysAgo = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    // Find chatters inactive for 30+ days, not already reminded
    const snap = await db
      .collection("chatters")
      .where("createdAt", "<=", thirtyDaysAgo)
      .where("totalCalls", "==", 0)
      .where("inactivityEmailSent", "!=", true)
      .limit(100)
      .get();

    if (snap.empty) {
      console.log("[ChatterEmail] No inactive chatters to remind");
      return;
    }

    console.log(`[ChatterEmail] Sending inactivity reminders to ${snap.size} chatters`);

    for (const doc of snap.docs) {
      const data = doc.data();
      if (!data.email) continue;

      const lang = getLanguageCode(data.language || data.preferredLanguage || "en");
      const fields = mapChatterToMailWizzFields(data, doc.id);

      const sent = await sendChatterEmail(data.email, "inactivity-reminder", lang, fields);
      if (sent) {
        await doc.ref.update({ inactivityEmailSent: true });
      }
    }
  }
);

// ---------------------------------------------------------------------------
// 9. ACCOUNT WARNING — on admin warning action
// ---------------------------------------------------------------------------
export const chatterEmailAccountWarning = functions.firestore.onDocumentCreated(
  {
    document: "chatter_notifications/{notifId}",
    region: "europe-west3",
  },
  async (event) => {
    const notif = event.data?.data();
    if (!notif || notif.type !== "account_warning" || notif.emailSent === true) return;

    const chatterId = notif.chatterId;
    if (!chatterId) return;

    const ctx = await getChatterContext(chatterId);
    if (!ctx) return;

    const sent = await sendChatterEmail(ctx.email, "account-warning", ctx.lang, ctx.fields);
    if (sent) await event.data?.ref.update({ emailSent: true });
  }
);
