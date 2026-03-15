/**
 * Trustpilot Proactive Outreach
 *
 * Scheduled function that sends Trustpilot review invitations to targeted users:
 *   1. Chatters who have earned commissions (active affiliates)
 *   2. Providers (lawyers/expats) with ≥3 paid calls
 *
 * Note: Clients with ≥4 star reviews are ALREADY handled automatically
 * by handleReviewSubmitted() in transactions.ts — no duplication here.
 *
 * Anti-spam: Uses `trustpilot_outreach` collection with 90-day cooldown.
 * Templates: TR_CHAT_trustpilot-invite_{LANG}, TR_PRO_trustpilot-outreach_{LANG}
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { MailwizzAPI } from "../utils/mailwizz";
import { mapUserToMailWizzFields, mapChatterToMailWizzFields } from "../utils/fieldMapper";
import { logTrustpilotEvent, logGA4Event } from "../utils/analytics";
import { getLanguageCode } from "../config";

const db = admin.firestore();

const TRUSTPILOT_URL = "https://www.trustpilot.com/review/sos-expat.com";
const COOLDOWN_DAYS = 90;
const MIN_PROVIDER_CALLS = 3;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if a user has already been contacted within the cooldown window.
 * Returns true if we should SKIP this user (already contacted recently).
 */
async function wasRecentlyContacted(userId: string): Promise<boolean> {
  const cutoff = new Date(Date.now() - COOLDOWN_DAYS * 24 * 60 * 60 * 1000);

  const snap = await db
    .collection("trustpilot_outreach")
    .where("userId", "==", userId)
    .where("sentAt", ">=", admin.firestore.Timestamp.fromDate(cutoff))
    .limit(1)
    .get();

  return !snap.empty;
}

/**
 * Record that we sent an outreach to this user.
 */
async function recordOutreach(
  userId: string,
  role: string,
  channel: "email"
): Promise<void> {
  await db.collection("trustpilot_outreach").add({
    userId,
    role,
    channel,
    sentAt: admin.firestore.FieldValue.serverTimestamp(),
    status: "sent",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Target 1: Chatters with commissions
// ─────────────────────────────────────────────────────────────────────────────

async function sendToActiveChatters(mailwizz: MailwizzAPI): Promise<{ sent: number; skipped: number; errors: number }> {
  let sent = 0;
  let skipped = 0;
  let errors = 0;

  // Find chatters who have earned at least something
  const chattersSnap = await db
    .collection("chatters")
    .where("status", "==", "active")
    .where("totalEarned", ">", 0)
    .get();

  console.log(`[TrustpilotOutreach] Found ${chattersSnap.size} active chatters with earnings`);

  for (const doc of chattersSnap.docs) {
    const chatter = doc.data();
    const chatterId = doc.id;

    if (!chatter.email) {
      skipped++;
      continue;
    }

    // Cooldown check
    if (await wasRecentlyContacted(chatterId)) {
      skipped++;
      continue;
    }

    try {
      const lang = getLanguageCode(chatter.language || chatter.preferredLanguage || "en");
      const fields = mapChatterToMailWizzFields(chatter, chatterId);

      await mailwizz.sendTransactional({
        to: chatter.email,
        template: `TR_CHAT_trustpilot-invite_${lang}`,
        customFields: {
          ...fields,
          TRUSTPILOT_URL,
        },
      });

      await recordOutreach(chatterId, "chatter", "email");
      await logTrustpilotEvent("invite_sent", chatterId);
      sent++;
    } catch (err) {
      errors++;
      console.error(`[TrustpilotOutreach] Error sending to chatter ${chatterId}:`, err);
    }
  }

  return { sent, skipped, errors };
}

// ─────────────────────────────────────────────────────────────────────────────
// Target 2: Providers with ≥3 paid calls
// ─────────────────────────────────────────────────────────────────────────────

async function sendToActiveProviders(mailwizz: MailwizzAPI): Promise<{ sent: number; skipped: number; errors: number }> {
  let sent = 0;
  let skipped = 0;
  let errors = 0;

  // Call counts are stored in ai_usage/{providerId}.totalCallsAllTime (not on users docs)
  const usageSnap = await db
    .collection("ai_usage")
    .where("totalCallsAllTime", ">=", MIN_PROVIDER_CALLS)
    .get();

  console.log(`[TrustpilotOutreach] Found ${usageSnap.size} providers with ≥${MIN_PROVIDER_CALLS} calls (ai_usage)`);

  for (const usageDoc of usageSnap.docs) {
    const providerId = usageDoc.id; // ai_usage doc ID = providerId

    // Cooldown check (early, avoids fetching user doc)
    if (await wasRecentlyContacted(providerId)) {
      skipped++;
      continue;
    }

    // Fetch actual user doc for email + role + language
    const userDoc = await db.collection("users").doc(providerId).get();
    if (!userDoc.exists) {
      skipped++;
      continue;
    }

    const user = userDoc.data()!;

    // Filter: only providers/lawyers
    if (user.role !== "provider" && user.role !== "lawyer" && user.role !== "expat") {
      skipped++;
      continue;
    }
    if (!user.email) {
      skipped++;
      continue;
    }

    try {
      const lang = getLanguageCode(user.language || user.preferredLanguage || user.lang || "en");
      const fields = mapUserToMailWizzFields(user, providerId);
      const totalCalls = usageDoc.data().totalCallsAllTime || 0;

      await mailwizz.sendTransactional({
        to: user.email,
        template: `TR_PRO_trustpilot-outreach_${lang}`,
        customFields: {
          ...fields,
          TRUSTPILOT_URL,
          TOTAL_CALLS: totalCalls.toString(),
        },
      });

      await recordOutreach(providerId, user.role, "email");
      await logTrustpilotEvent("invite_sent", providerId);
      sent++;
    } catch (err) {
      errors++;
      console.error(`[TrustpilotOutreach] Error sending to provider ${providerId}:`, err);
    }
  }

  return { sent, skipped, errors };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main scheduled function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Trustpilot Proactive Outreach
 * Schedule: Every Wednesday at 10:00 (Paris) — mid-week for best open rates
 */
// ─────────────────────────────────────────────────────────────────────────────
// Admin test callable — send test emails to verify templates
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Admin callable to test Trustpilot outreach emails.
 * Sends test emails to a specified address for each scenario.
 *
 * Usage: call with { email: "williamsjullin@gmail.com" }
 *
 * Scenarios tested:
 *   1. Chatter trustpilot invite (TR_CHAT_trustpilot-invite)
 *   2. Provider trustpilot outreach (TR_PRO_trustpilot-outreach)
 *   3. Client trustpilot invite — existing (TR_CLI_trustpilot-invite)
 */
export const testTrustpilotOutreach = onCall(
  {
    region: "europe-west3",
    cpu: 0.083,
  },
  async (request) => {
    // Admin check
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be authenticated");
    }

    const adminDoc = await db.collection("users").doc(request.auth.uid).get();
    const adminData = adminDoc.data();
    if (!adminData || adminData.role !== "admin") {
      throw new HttpsError("permission-denied", "Admin only");
    }

    const email = request.data?.email;
    if (!email || typeof email !== "string" || !email.includes("@")) {
      throw new HttpsError("invalid-argument", "Valid email required");
    }

    const mailwizz = new MailwizzAPI();
    const results: Array<{ scenario: string; status: string; error?: string }> = [];

    // Fake data for test emails
    const testChatterFields: Record<string, string> = {
      EMAIL: email,
      FNAME: "Williams",
      LNAME: "Test",
      LINK: "https://sos-expat.com/ref/test123",
      DASHBOARD_URL: "https://sos-expat.com/chatter/tableau-de-bord",
      AVAILABLE_BALANCE: "$125",
      TOTAL_EARNED: "$450",
      MONTHLY_EARNINGS: "$75",
      TEAM_SIZE: "8",
      RANK: "12",
      LEVEL_NAME: "Silver",
      COMMISSION_CLIENT_LAWYER: "$10",
      COMMISSION_CLIENT_EXPAT: "$3",
      TRUSTPILOT_URL,
    };

    const testProviderFields: Record<string, string> = {
      EMAIL: email,
      FNAME: "Williams",
      LNAME: "Test Provider",
      ROLE: "lawyer",
      TOTAL_CALLS: "15",
      NB_CALLS: "15",
      TOTAL_EARNINGS: "1200",
      AVG_RATING: "4.8",
      RATING_STARS: "5",
      STARS: "5",
      COUNTRY: "France",
      LANGUAGE: "fr",
      DASHBOARD_URL: "https://sos-expat.com/dashboard",
      PROFILE_URL: "https://sos-expat.com/profile/edit",
      TRUSTPILOT_URL,
    };

    const testClientFields: Record<string, string> = {
      EMAIL: email,
      FNAME: "Williams",
      LNAME: "Test Client",
      ROLE: "client",
      COUNTRY: "France",
      LANGUAGE: "fr",
      TRUSTPILOT_URL,
      RATING_STARS: "5",
    };

    // Scenario 1: Chatter invite (FR)
    try {
      await mailwizz.sendTransactional({
        to: email,
        template: "TR_CHAT_trustpilot-invite_FR",
        customFields: testChatterFields,
      });
      results.push({ scenario: "chatter_trustpilot_invite_FR", status: "sent" });
    } catch (err: any) {
      results.push({ scenario: "chatter_trustpilot_invite_FR", status: "error", error: err.message });
    }

    // Scenario 2: Chatter invite (EN)
    try {
      await mailwizz.sendTransactional({
        to: email,
        template: "TR_CHAT_trustpilot-invite_EN",
        customFields: { ...testChatterFields, LANGUAGE: "en" },
      });
      results.push({ scenario: "chatter_trustpilot_invite_EN", status: "sent" });
    } catch (err: any) {
      results.push({ scenario: "chatter_trustpilot_invite_EN", status: "error", error: err.message });
    }

    // Scenario 3: Provider outreach (FR)
    try {
      await mailwizz.sendTransactional({
        to: email,
        template: "TR_PRO_trustpilot-outreach_FR",
        customFields: testProviderFields,
      });
      results.push({ scenario: "provider_trustpilot_outreach_FR", status: "sent" });
    } catch (err: any) {
      results.push({ scenario: "provider_trustpilot_outreach_FR", status: "error", error: err.message });
    }

    // Scenario 4: Provider outreach (EN)
    try {
      await mailwizz.sendTransactional({
        to: email,
        template: "TR_PRO_trustpilot-outreach_EN",
        customFields: { ...testProviderFields, LANGUAGE: "en" },
      });
      results.push({ scenario: "provider_trustpilot_outreach_EN", status: "sent" });
    } catch (err: any) {
      results.push({ scenario: "provider_trustpilot_outreach_EN", status: "error", error: err.message });
    }

    // Scenario 5: Client invite (FR) — EXISTING template, should always work
    try {
      await mailwizz.sendTransactional({
        to: email,
        template: "TR_CLI_trustpilot-invite_FR",
        customFields: testClientFields,
      });
      results.push({ scenario: "client_trustpilot_invite_FR", status: "sent" });
    } catch (err: any) {
      results.push({ scenario: "client_trustpilot_invite_FR", status: "error", error: err.message });
    }

    // Scenario 6: Client invite (EN) — EXISTING template
    try {
      await mailwizz.sendTransactional({
        to: email,
        template: "TR_CLI_trustpilot-invite_EN",
        customFields: { ...testClientFields, LANGUAGE: "en" },
      });
      results.push({ scenario: "client_trustpilot_invite_EN", status: "sent" });
    } catch (err: any) {
      results.push({ scenario: "client_trustpilot_invite_EN", status: "error", error: err.message });
    }

    const sentCount = results.filter((r) => r.status === "sent").length;
    const errorCount = results.filter((r) => r.status === "error").length;

    console.log(`[TestTrustpilotOutreach] ${sentCount} sent, ${errorCount} errors`, results);

    return {
      email,
      totalScenarios: results.length,
      sent: sentCount,
      errors: errorCount,
      details: results,
    };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Main scheduled function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Trustpilot Proactive Outreach
 * Schedule: Every Wednesday at 10:00 (Paris) — mid-week for best open rates
 */
export const sendTrustpilotOutreach = onSchedule(
  {
    schedule: "0 10 * * 3", // Every Wednesday at 10:00
    timeZone: "Europe/Paris",
    region: "europe-west3",
    cpu: 0.083,
  },
  async () => {
    console.log("⭐ [TrustpilotOutreach] Starting proactive outreach...");

    const mailwizz = new MailwizzAPI();

    // Target 1: Active chatters with commissions
    const chatterResults = await sendToActiveChatters(mailwizz);
    console.log(
      `⭐ [TrustpilotOutreach] Chatters: ${chatterResults.sent} sent, ${chatterResults.skipped} skipped, ${chatterResults.errors} errors`
    );

    // Target 2: Providers with ≥3 calls
    const providerResults = await sendToActiveProviders(mailwizz);
    console.log(
      `⭐ [TrustpilotOutreach] Providers: ${providerResults.sent} sent, ${providerResults.skipped} skipped, ${providerResults.errors} errors`
    );

    // Log aggregate stats
    const totalSent = chatterResults.sent + providerResults.sent;
    const totalSkipped = chatterResults.skipped + providerResults.skipped;
    const totalErrors = chatterResults.errors + providerResults.errors;

    await logGA4Event("trustpilot_outreach_completed", {
      chatters_sent: chatterResults.sent,
      chatters_skipped: chatterResults.skipped,
      chatters_errors: chatterResults.errors,
      providers_sent: providerResults.sent,
      providers_skipped: providerResults.skipped,
      providers_errors: providerResults.errors,
      total_sent: totalSent,
      total_skipped: totalSkipped,
      total_errors: totalErrors,
    });

    console.log(
      `✅ [TrustpilotOutreach] Done: ${totalSent} sent, ${totalSkipped} skipped, ${totalErrors} errors`
    );
  }
);
