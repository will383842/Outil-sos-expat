import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { MailwizzAPI } from "../utils/mailwizz";
import { getLanguageCode } from "../config";
import { logGA4Event } from "../utils/analytics";

/** Minimum calls in period to receive the stats email */
const MIN_CALLS_FOR_EMAIL = 1;

/**
 * FUNCTION: Send Weekly Stats
 * Schedule: Every Monday at 08:00 UTC
 * Sends a weekly performance recap to providers with at least 1 call in the past week
 */
export const sendWeeklyStats = onSchedule(
  {
    schedule: "0 8 * * 1", // Every Monday at 08:00 UTC
    timeZone: "Europe/Paris",
    region: "europe-west3",
  },
  async () => {
    console.log("📊 Starting weekly stats email job...");

    const mailwizz = new MailwizzAPI();
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    try {
      // Fetch providers (single-field query to avoid composite index requirement)
      // Filter weeklyCalls and role in-memory after fetch
      const providersSnap = await admin
        .firestore()
        .collection("users")
        .where("weeklyCalls", ">=", MIN_CALLS_FOR_EMAIL)
        .get();

      console.log(`📊 Found ${providersSnap.size} providers with weekly calls`);

      let sent = 0;
      let errors = 0;

      for (const doc of providersSnap.docs) {
        const user = doc.data();
        const userId = doc.id;

        // Filter: only providers/lawyers (done in-memory to avoid composite index)
        if (user.role !== "provider" && user.role !== "lawyer") continue;
        if (!user.email) continue;

        try {
          const lang = getLanguageCode(
            user.language || user.preferredLanguage || user.lang || "en"
          );

          const weeklyCalls = user.weeklyCalls || 0;
          const weeklyEarnings = user.weeklyEarnings || 0;
          const avgRating = user.averageRating || user.rating || 0;
          const avgDuration = user.avgCallDuration || user.averageCallDuration || 0;

          await mailwizz.sendTransactional({
            to: user.email || userId,
            template: `TR_PRO_weekly-stats_${lang}`,
            customFields: {
              FNAME: user.firstName || "",
              WEEKLY_CALLS: weeklyCalls.toString(),
              WEEKLY_EARNINGS: weeklyEarnings.toString(),
              AVG_RATING: avgRating.toString(),
              AVG_DURATION: avgDuration.toString(),
              DASHBOARD_URL: "https://sos-expat.com/dashboard",
            },
          });

          sent++;
        } catch (emailError) {
          errors++;
          console.error(`❌ Error sending weekly stats to ${userId}:`, emailError);
        }
      }

      await logGA4Event("weekly_stats_emails_sent", {
        sent,
        errors,
        total_providers: providersSnap.size,
        week_start: oneWeekAgo.toISOString(),
      });

      console.log(`✅ Weekly stats emails sent: ${sent} success, ${errors} errors`);
    } catch (error: any) {
      console.error("❌ Error in sendWeeklyStats:", error);
    }
  }
);

/**
 * FUNCTION: Send Monthly Stats
 * Schedule: 1st of every month at 08:00 UTC
 * Sends a monthly performance recap to providers with at least 1 call in the past month
 */
export const sendMonthlyStats = onSchedule(
  {
    schedule: "0 8 1 * *", // 1st of every month at 08:00 UTC
    timeZone: "Europe/Paris",
    region: "europe-west3",
  },
  async () => {
    console.log("📊 Starting monthly stats email job...");

    const mailwizz = new MailwizzAPI();
    const now = new Date();
    // Get previous month name for the report
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthName = prevMonth.toLocaleString("en", { month: "long" });

    try {
      // Fetch providers (single-field query to avoid composite index requirement)
      // Filter role in-memory after fetch
      const providersSnap = await admin
        .firestore()
        .collection("users")
        .where("monthlyCalls", ">=", MIN_CALLS_FOR_EMAIL)
        .get();

      console.log(`📊 Found ${providersSnap.size} providers with monthly calls`);

      let sent = 0;
      let errors = 0;

      for (const doc of providersSnap.docs) {
        const user = doc.data();
        const userId = doc.id;

        // Filter: only providers/lawyers (done in-memory to avoid composite index)
        if (user.role !== "provider" && user.role !== "lawyer") continue;
        if (!user.email) continue;

        try {
          const lang = getLanguageCode(
            user.language || user.preferredLanguage || user.lang || "en"
          );

          const monthlyCalls = user.monthlyCalls || 0;
          const monthlyEarnings = user.monthlyEarnings || 0;
          const avgRating = user.averageRating || user.rating || 0;
          const onlineHours = user.onlineHours || user.monthlyOnlineHours || 0;
          const callsTrend = user.callsTrend || user.callsTrendPercent || "0%";
          const earningsTrend = user.earningsTrend || user.earningsTrendPercent || "0%";

          await mailwizz.sendTransactional({
            to: user.email || userId,
            template: `TR_PRO_monthly-stats_${lang}`,
            customFields: {
              FNAME: user.firstName || "",
              MONTH: prevMonthName,
              MONTHLY_CALLS: monthlyCalls.toString(),
              MONTHLY_EARNINGS: monthlyEarnings.toString(),
              AVG_RATING: avgRating.toString(),
              ONLINE_HOURS: onlineHours.toString(),
              CALLS_TREND: callsTrend,
              EARNINGS_TREND: earningsTrend,
              DASHBOARD_URL: "https://sos-expat.com/dashboard",
            },
          });

          sent++;
        } catch (emailError) {
          errors++;
          console.error(`❌ Error sending monthly stats to ${userId}:`, emailError);
        }
      }

      await logGA4Event("monthly_stats_emails_sent", {
        sent,
        errors,
        total_providers: providersSnap.size,
        month: prevMonthName,
      });

      console.log(`✅ Monthly stats emails sent: ${sent} success, ${errors} errors`);
    } catch (error: any) {
      console.error("❌ Error in sendMonthlyStats:", error);
    }
  }
);

/**
 * FUNCTION: Send Anniversary Emails
 * Schedule: Every day at 09:00 UTC
 * Sends a 1-year anniversary email to users who registered exactly 1 year ago (±12h)
 */
export const sendAnniversaryEmails = onSchedule(
  {
    schedule: "0 9 * * *", // Every day at 09:00 UTC
    timeZone: "Europe/Paris",
    region: "europe-west3",
  },
  async () => {
    console.log("🎂 Starting anniversary emails job...");

    const mailwizz = new MailwizzAPI();
    const now = new Date();

    // Target: users who created their account exactly 1 year ago (±12h window)
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const windowStart = new Date(oneYearAgo.getTime() - 12 * 60 * 60 * 1000);
    const windowEnd = new Date(oneYearAgo.getTime() + 12 * 60 * 60 * 1000);

    try {
      const usersSnap = await admin
        .firestore()
        .collection("users")
        .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(windowStart))
        .where("createdAt", "<=", admin.firestore.Timestamp.fromDate(windowEnd))
        .get();

      console.log(`🎂 Found ${usersSnap.size} users with anniversary today`);

      let sent = 0;
      let errors = 0;

      for (const doc of usersSnap.docs) {
        const user = doc.data();
        const userId = doc.id;

        if (!user.email) continue;

        try {
          const lang = getLanguageCode(
            user.language || user.preferredLanguage || user.lang || "en"
          );

          const isProvider = user.role === "provider" || user.role === "lawyer";
          const rolePrefix = isProvider ? "PRO" : "CLI";

          await mailwizz.sendTransactional({
            to: user.email || userId,
            template: `TR_${rolePrefix}_anniversary_${lang}`,
            customFields: {
              FNAME: user.firstName || "",
              YEARS: "1",
              TOTAL_CALLS: (user.totalCalls || 0).toString(),
              TOTAL_CLIENTS: (user.totalClients || 0).toString(),
              TOTAL_EARNINGS: isProvider ? (user.totalEarnings || 0).toString() : "0",
              DASHBOARD_URL: "https://sos-expat.com/dashboard",
            },
          });

          sent++;
        } catch (emailError) {
          errors++;
          console.error(`❌ Error sending anniversary email to ${userId}:`, emailError);
        }
      }

      await logGA4Event("anniversary_emails_sent", {
        sent,
        errors,
        total_users: usersSnap.size,
        anniversary_date: oneYearAgo.toISOString().split("T")[0],
      });

      console.log(`✅ Anniversary emails sent: ${sent} success, ${errors} errors`);
    } catch (error: any) {
      console.error("❌ Error in sendAnniversaryEmails:", error);
    }
  }
);
