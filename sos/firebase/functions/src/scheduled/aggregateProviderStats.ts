/**
 * aggregateProviderStats.ts
 *
 * Scheduled function to aggregate provider performance statistics.
 * Runs every hour to calculate:
 * - Hours online (from provider_status_logs sessions)
 * - Missed calls (from call_sessions with provider no_answer)
 * - Call statistics (received, answered, duration)
 *
 * Results are stored in the `provider_stats` collection.
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { logError } from "../utils/logs/logError";
import {
  ProviderMonthlyStats,
  PROVIDER_STATS_CONFIG,
  ProviderStatsType,
} from "../utils/providerStatsTypes";

// Lazy initialization
const IS_DEPLOYMENT_ANALYSIS =
  !process.env.K_REVISION &&
  !process.env.K_SERVICE &&
  !process.env.FUNCTION_TARGET &&
  !process.env.FUNCTIONS_EMULATOR;

let _initialized = false;
function ensureInitialized() {
  if (!_initialized && !IS_DEPLOYMENT_ANALYSIS) {
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    _initialized = true;
  }
}

function getDb() {
  ensureInitialized();
  return admin.firestore();
}

/**
 * Scheduled function - runs every hour
 * Aggregates provider stats for the current month
 */
export const aggregateProviderStats = onSchedule(
  {
    schedule: "0 * * * *", // Every hour at minute 0
    region: "europe-west3",
    timeZone: "Europe/Paris",
    timeoutSeconds: 540, // 9 minutes
    memory: "256MiB",
    cpu: 0.083,
  },
  async () => {
    console.log("📊 [ProviderStats] Starting hourly aggregation...");

    try {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      await aggregateStatsForMonth(month);

      console.log(`✅ [ProviderStats] Aggregation completed for ${month}`);
    } catch (error) {
      console.error("❌ [ProviderStats] Aggregation failed:", error);
      await logError("aggregateProviderStats", error);
    }
  }
);

/**
 * Manual trigger for testing or backfilling
 */
export const triggerProviderStatsAggregation = onCall(
  {
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 540,
  },
  async (req) => {
    // Admin only
    const uid = req.auth?.uid;
    const claims = req.auth?.token;
    if (!uid) throw new HttpsError("unauthenticated", "Auth required");
    const isAdmin = claims?.admin === true || claims?.role === "admin";
    if (!isAdmin) throw new HttpsError("permission-denied", "Admin only");

    const { month } = req.data || {};

    // Default to current month if not specified
    const targetMonth = month || (() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    })();

    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(targetMonth)) {
      throw new HttpsError("invalid-argument", "Month must be in YYYY-MM format");
    }

    console.log(`📊 [ProviderStats] Manual aggregation triggered for ${targetMonth}`);

    try {
      const result = await aggregateStatsForMonth(targetMonth);
      return {
        success: true,
        month: targetMonth,
        providersProcessed: result.providersProcessed,
        message: `Aggregation completed for ${targetMonth}`,
      };
    } catch (error) {
      console.error("❌ [ProviderStats] Manual aggregation failed:", error);
      throw new HttpsError(
        "internal",
        error instanceof Error ? error.message : "Aggregation failed"
      );
    }
  }
);

/**
 * Aggregate stats for a specific month
 */
async function aggregateStatsForMonth(month: string): Promise<{ providersProcessed: number }> {
  const db = getDb();

  // Parse month to get date range
  const [year, monthNum] = month.split("-").map(Number);
  const monthStart = new Date(year, monthNum - 1, 1, 0, 0, 0, 0);
  const monthEnd = new Date(year, monthNum, 0, 23, 59, 59, 999);

  console.log(`📊 [ProviderStats] Processing month ${month}`);
  console.log(`   Start: ${monthStart.toISOString()}`);
  console.log(`   End: ${monthEnd.toISOString()}`);

  // Get all providers (lawyers and expats)
  const providersSnapshot = await db
    .collection("users")
    .where("role", "in", ["lawyer", "expat"])
    .limit(5000)
    .get();

  console.log(`📊 [ProviderStats] Found ${providersSnapshot.size} providers`);

  let processedCount = 0;
  const batch = db.batch();
  const batchSize = 500;
  let batchCount = 0;

  for (const providerDoc of providersSnapshot.docs) {
    const providerId = providerDoc.id;
    const providerData = providerDoc.data();

    try {
      // Calculate stats for this provider
      const stats = await calculateProviderStats(
        db,
        providerId,
        providerData,
        month,
        monthStart,
        monthEnd
      );

      // Write to provider_stats collection
      const statsDocId = `${providerId}_${month}`;
      const statsRef = db.collection("provider_stats").doc(statsDocId);

      batch.set(statsRef, stats, { merge: true });
      batchCount++;
      processedCount++;

      // Commit batch if full
      if (batchCount >= batchSize) {
        await batch.commit();
        console.log(`📊 [ProviderStats] Committed batch of ${batchCount} stats`);
        batchCount = 0;
      }
    } catch (error) {
      console.error(`❌ [ProviderStats] Error processing provider ${providerId}:`, error);
    }
  }

  // Commit remaining
  if (batchCount > 0) {
    await batch.commit();
    console.log(`📊 [ProviderStats] Committed final batch of ${batchCount} stats`);
  }

  return { providersProcessed: processedCount };
}

/**
 * Calculate stats for a single provider
 */
async function calculateProviderStats(
  db: admin.firestore.Firestore,
  providerId: string,
  providerData: admin.firestore.DocumentData,
  month: string,
  monthStart: Date,
  monthEnd: Date
): Promise<ProviderMonthlyStats> {
  const now = admin.firestore.Timestamp.now();

  // Get provider info
  const providerType: ProviderStatsType =
    providerData.role === "lawyer" ? "lawyer" : "expat";
  const providerName =
    `${providerData.firstName || ""} ${providerData.lastName || ""}`.trim() ||
    providerData.fullName ||
    providerData.name ||
    "Unknown";
  const providerEmail = providerData.email || "";

  // Calculate hours online from provider_status_logs
  const hoursOnline = await calculateHoursOnline(
    db,
    providerId,
    monthStart,
    monthEnd
  );

  // Calculate call stats from call_sessions
  const callStats = await calculateCallStats(
    db,
    providerId,
    monthStart,
    monthEnd
  );

  // Determine compliance
  const hoursCompliant = hoursOnline >= PROVIDER_STATS_CONFIG.HOURS_ONLINE_TARGET;
  const missedCallsCompliant =
    callStats.callsMissed <= PROVIDER_STATS_CONFIG.MISSED_CALLS_TARGET;
  const isCompliant = hoursCompliant && missedCallsCompliant;

  const stats: ProviderMonthlyStats = {
    id: `${providerId}_${month}`,
    providerId,
    providerType,
    month,

    // Hours online
    hoursOnline: Math.round(hoursOnline * 100) / 100, // Round to 2 decimals
    hoursOnlineTarget: PROVIDER_STATS_CONFIG.HOURS_ONLINE_TARGET,
    hoursCompliant,

    // Calls
    callsReceived: callStats.callsReceived,
    callsAnswered: callStats.callsAnswered,
    callsMissed: callStats.callsMissed,
    missedCallsTarget: PROVIDER_STATS_CONFIG.MISSED_CALLS_TARGET,
    missedCallsCompliant,

    // Duration
    totalCallDuration: callStats.totalDuration,
    avgCallDuration: callStats.avgDuration,

    // Compliance
    isCompliant,

    // Provider info (denormalized)
    providerName,
    providerEmail,

    // Timestamps
    createdAt: now,
    updatedAt: now,
  };

  return stats;
}

/**
 * Calculate hours online from provider_status_logs
 *
 * Logic:
 * - Find pairs of SET_AVAILABLE → (SET_BUSY | RESTORE_OFFLINE | SET_OFFLINE)
 * - Sum the duration of these sessions
 */
async function calculateHoursOnline(
  db: admin.firestore.Firestore,
  providerId: string,
  monthStart: Date,
  monthEnd: Date
): Promise<number> {
  const logsSnapshot = await db
    .collection("provider_status_logs")
    .where("providerId", "==", providerId)
    .where("timestamp", ">=", admin.firestore.Timestamp.fromDate(monthStart))
    .where("timestamp", "<=", admin.firestore.Timestamp.fromDate(monthEnd))
    .orderBy("timestamp", "asc")
    .get();

  if (logsSnapshot.empty) {
    return 0;
  }

  let totalSeconds = 0;
  let sessionStartTime: Date | null = null;

  for (const logDoc of logsSnapshot.docs) {
    const log = logDoc.data();
    const action = log.action as string;
    const timestamp = (log.timestamp as admin.firestore.Timestamp).toDate();

    // Start of online session
    if (action === "SET_AVAILABLE" || action === "RELEASE_FROM_SIBLING_BUSY") {
      if (!sessionStartTime) {
        sessionStartTime = timestamp;
      }
    }

    // End of online session
    if (
      action === "SET_BUSY" ||
      action === "SET_BUSY_BY_SIBLING" ||
      action === "SET_OFFLINE" ||
      action === "RESTORE_OFFLINE"
    ) {
      if (sessionStartTime) {
        const sessionDuration = (timestamp.getTime() - sessionStartTime.getTime()) / 1000;
        // Only count reasonable sessions (less than 24 hours)
        if (sessionDuration > 0 && sessionDuration < 86400) {
          totalSeconds += sessionDuration;
        }
        sessionStartTime = null;
      }
    }
  }

  // If there's an open session, count up to now (or end of month)
  if (sessionStartTime) {
    const endTime = new Date(Math.min(Date.now(), monthEnd.getTime()));
    const sessionDuration = (endTime.getTime() - sessionStartTime.getTime()) / 1000;
    if (sessionDuration > 0 && sessionDuration < 86400) {
      totalSeconds += sessionDuration;
    }
  }

  // Convert to hours
  return totalSeconds / 3600;
}

/**
 * Calculate call statistics from call_sessions
 */
async function calculateCallStats(
  db: admin.firestore.Firestore,
  providerId: string,
  monthStart: Date,
  monthEnd: Date
): Promise<{
  callsReceived: number;
  callsAnswered: number;
  callsMissed: number;
  totalDuration: number;
  avgDuration: number;
}> {
  // Query call_sessions for this provider in the date range
  const sessionsSnapshot = await db
    .collection("call_sessions")
    .where("providerId", "==", providerId)
    .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(monthStart))
    .where("createdAt", "<=", admin.firestore.Timestamp.fromDate(monthEnd))
    .get();

  let callsReceived = 0;
  let callsAnswered = 0;
  let callsMissed = 0;
  let totalDuration = 0;

  for (const sessionDoc of sessionsSnapshot.docs) {
    const session = sessionDoc.data();

    callsReceived++;

    // Check if provider answered (call was completed or in-progress)
    const status = session.status;
    const providerStatus = session.participants?.provider?.status;

    // Missed call: provider didn't answer
    if (
      providerStatus === "no_answer" ||
      status === "provider_no_answer" ||
      status === "cancelled_provider_no_answer"
    ) {
      callsMissed++;
    } else if (
      status === "completed" ||
      status === "in_progress" ||
      status === "disconnected"
    ) {
      // Answered call
      callsAnswered++;

      // Add duration if available
      const duration = session.duration || session.callDuration || 0;
      if (typeof duration === "number" && duration > 0) {
        totalDuration += duration;
      }
    }
  }

  const avgDuration = callsAnswered > 0 ? Math.round(totalDuration / callsAnswered) : 0;

  return {
    callsReceived,
    callsAnswered,
    callsMissed,
    totalDuration,
    avgDuration,
  };
}

/**
 * Backfill stats for previous months
 * Useful for initializing historical data
 */
export const backfillProviderStats = onCall(
  {
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 540,
  },
  async (req) => {
    // Admin only
    const uid = req.auth?.uid;
    const claims = req.auth?.token;
    if (!uid) throw new HttpsError("unauthenticated", "Auth required");
    const isAdmin = claims?.admin === true || claims?.role === "admin";
    if (!isAdmin) throw new HttpsError("permission-denied", "Admin only");

    const { monthsBack = 3 } = req.data || {};

    if (monthsBack < 1 || monthsBack > 12) {
      throw new HttpsError("invalid-argument", "monthsBack must be between 1 and 12");
    }

    console.log(`📊 [ProviderStats] Backfilling ${monthsBack} months...`);

    const results: { month: string; providersProcessed: number }[] = [];

    for (let i = 0; i < monthsBack; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      try {
        const result = await aggregateStatsForMonth(month);
        results.push({ month, providersProcessed: result.providersProcessed });
        console.log(`✅ [ProviderStats] Backfilled ${month}: ${result.providersProcessed} providers`);
      } catch (error) {
        console.error(`❌ [ProviderStats] Failed to backfill ${month}:`, error);
        results.push({ month, providersProcessed: 0 });
      }
    }

    return {
      success: true,
      results,
    };
  }
);
