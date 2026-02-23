/**
 * Weekly Challenges System for Chatters
 *
 * Features:
 * - Create new weekly challenges every Monday at 00:00 UTC
 * - Update leaderboard when relevant actions happen
 * - End challenge and award prizes every Sunday at 23:59 UTC
 * - Get current active challenge
 *
 * Challenge Types:
 * - RECRUITER: Most active referrals recruited this week
 * - CALLER: Most client calls generated this week
 * - TEAM: Best team performance (N1+N2 calls)
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

// ============================================================================
// TYPES
// ============================================================================

export type WeeklyChallengeType = "recruiter" | "caller" | "team";

export interface WeeklyChallengeLeaderboardEntry {
  chatterId: string;
  name: string;
  score: number;
  photoUrl?: string;
}

export interface WeeklyChallenge {
  id: string;
  title: string;
  titleTranslations?: {
    fr?: string;
    en?: string;
    es?: string;
    pt?: string;
    ar?: string;
  };
  description: string;
  descriptionTranslations?: {
    fr?: string;
    en?: string;
    es?: string;
    pt?: string;
    ar?: string;
  };
  type: WeeklyChallengeType;
  startDate: Timestamp;
  endDate: Timestamp;
  prizes: {
    1: number; // 5000 cents = $50
    2: number; // 2500 cents = $25
    3: number; // 1000 cents = $10
  };
  leaderboard: WeeklyChallengeLeaderboardEntry[];
  status: "active" | "completed" | "cancelled";
  /** Week number of the year (1-52) */
  weekNumber: number;
  /** Year */
  year: number;
  /** Prizes awarded */
  prizesAwarded: boolean;
  /** Prize commission IDs */
  prizeCommissionIds: string[];
  /** Created timestamp */
  createdAt: Timestamp;
  /** Updated timestamp */
  updatedAt: Timestamp;
}

// Challenge type rotation and configuration
const CHALLENGE_TYPES: WeeklyChallengeType[] = ["recruiter", "caller", "team"];

const CHALLENGE_CONFIG: Record<
  WeeklyChallengeType,
  {
    titleEn: string;
    titleFr: string;
    descriptionEn: string;
    descriptionFr: string;
  }
> = {
  recruiter: {
    titleEn: "Top Recruiter Challenge",
    titleFr: "Defi Top Recruteur",
    descriptionEn: "Recruit the most active chatters this week to win!",
    descriptionFr: "Recrutez le plus de chatters actifs cette semaine pour gagner!",
  },
  caller: {
    titleEn: "Call Champion Challenge",
    titleFr: "Defi Champion des Appels",
    descriptionEn: "Generate the most client calls this week to win!",
    descriptionFr: "Generez le plus d'appels clients cette semaine pour gagner!",
  },
  team: {
    titleEn: "Team Power Challenge",
    titleFr: "Defi Puissance d'Equipe",
    descriptionEn: "Your team (N1+N2) generates the most calls to win!",
    descriptionFr: "Votre equipe (N1+N2) genere le plus d'appels pour gagner!",
  },
};

const DEFAULT_PRIZES = {
  1: 5000, // $50
  2: 2500, // $25
  3: 1000, // $10
};

// ============================================================================
// HELPERS
// ============================================================================

function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

/**
 * Get the ISO week number for a given date
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Get start of current week (Monday 00:00 UTC)
 */
function getStartOfWeek(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  d.setUTCDate(diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of current week (Sunday 23:59:59 UTC)
 */
function getEndOfWeek(date: Date = new Date()): Date {
  const startOfWeek = getStartOfWeek(date);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setUTCDate(endOfWeek.getUTCDate() + 6);
  endOfWeek.setUTCHours(23, 59, 59, 999);
  return endOfWeek;
}

/**
 * Generate a unique challenge ID based on week and year
 */
function generateChallengeId(weekNumber: number, year: number): string {
  return `challenge-${year}-W${String(weekNumber).padStart(2, "0")}`;
}

/**
 * Determine challenge type for a given week (rotates through types)
 */
function getChallengeTypeForWeek(weekNumber: number): WeeklyChallengeType {
  const index = (weekNumber - 1) % CHALLENGE_TYPES.length;
  return CHALLENGE_TYPES[index];
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Create a new weekly challenge
 */
async function createWeeklyChallengeInternal(): Promise<WeeklyChallenge | null> {
  const db = getFirestore();
  const now = new Date();
  const weekNumber = getWeekNumber(now);
  const year = now.getFullYear();
  const challengeId = generateChallengeId(weekNumber, year);

  // Check if challenge already exists
  const existingDoc = await db.collection("chatter_weekly_challenges").doc(challengeId).get();
  if (existingDoc.exists) {
    logger.info("[createWeeklyChallenge] Challenge already exists", { challengeId });
    return existingDoc.data() as WeeklyChallenge;
  }

  const challengeType = getChallengeTypeForWeek(weekNumber);
  const config = CHALLENGE_CONFIG[challengeType];

  const startDate = getStartOfWeek(now);
  const endDate = getEndOfWeek(now);

  const challenge: WeeklyChallenge = {
    id: challengeId,
    title: config.titleEn,
    titleTranslations: {
      en: config.titleEn,
      fr: config.titleFr,
    },
    description: config.descriptionEn,
    descriptionTranslations: {
      en: config.descriptionEn,
      fr: config.descriptionFr,
    },
    type: challengeType,
    startDate: Timestamp.fromDate(startDate),
    endDate: Timestamp.fromDate(endDate),
    prizes: DEFAULT_PRIZES,
    leaderboard: [],
    status: "active",
    weekNumber,
    year,
    prizesAwarded: false,
    prizeCommissionIds: [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  await db.collection("chatter_weekly_challenges").doc(challengeId).set(challenge);

  logger.info("[createWeeklyChallenge] Created new challenge", {
    challengeId,
    type: challengeType,
    weekNumber,
    year,
  });

  return challenge;
}

/**
 * Update the leaderboard for the current active challenge
 */
async function updateChallengeLeaderboardInternal(
  challengeId?: string
): Promise<WeeklyChallengeLeaderboardEntry[]> {
  const db = getFirestore();

  // Get the active challenge
  let challenge: WeeklyChallenge | null = null;
  if (challengeId) {
    const doc = await db.collection("chatter_weekly_challenges").doc(challengeId).get();
    if (doc.exists) {
      challenge = doc.data() as WeeklyChallenge;
    }
  } else {
    const activeQuery = await db
      .collection("chatter_weekly_challenges")
      .where("status", "==", "active")
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (!activeQuery.empty) {
      challenge = activeQuery.docs[0].data() as WeeklyChallenge;
    }
  }

  if (!challenge) {
    logger.warn("[updateChallengeLeaderboard] No active challenge found");
    return [];
  }

  const startDate = challenge.startDate.toDate();
  const endDate = challenge.endDate.toDate();

  // Get all active chatters
  const chattersSnapshot = await db
    .collection("chatters")
    .where("status", "==", "active")
    .get();

  const leaderboardData: WeeklyChallengeLeaderboardEntry[] = [];

  // Calculate scores based on challenge type
  for (const chatterDoc of chattersSnapshot.docs) {
    const chatter = chatterDoc.data();
    let score = 0;

    switch (challenge.type) {
      case "recruiter": {
        // Count active referrals recruited this week
        const recruitsQuery = await db
          .collection("chatters")
          .where("recruitedBy", "==", chatterDoc.id)
          .where("recruitedAt", ">=", Timestamp.fromDate(startDate))
          .where("recruitedAt", "<=", Timestamp.fromDate(endDate))
          .where("isActivated", "==", true)
          .get();
        score = recruitsQuery.size;
        break;
      }

      case "caller": {
        // Count client calls generated this week
        const callsQuery = await db
          .collection("chatter_commissions")
          .where("chatterId", "==", chatterDoc.id)
          .where("type", "in", ["client_call", "client_referral"])
          .where("createdAt", ">=", Timestamp.fromDate(startDate))
          .where("createdAt", "<=", Timestamp.fromDate(endDate))
          .where("status", "!=", "cancelled")
          .get();
        score = callsQuery.size;
        break;
      }

      case "team": {
        // Count N1 + N2 calls this week
        // N1 calls
        const n1CallsQuery = await db
          .collection("chatter_commissions")
          .where("chatterId", "==", chatterDoc.id)
          .where("type", "==", "n1_call")
          .where("createdAt", ">=", Timestamp.fromDate(startDate))
          .where("createdAt", "<=", Timestamp.fromDate(endDate))
          .where("status", "!=", "cancelled")
          .get();

        // N2 calls
        const n2CallsQuery = await db
          .collection("chatter_commissions")
          .where("chatterId", "==", chatterDoc.id)
          .where("type", "==", "n2_call")
          .where("createdAt", ">=", Timestamp.fromDate(startDate))
          .where("createdAt", "<=", Timestamp.fromDate(endDate))
          .where("status", "!=", "cancelled")
          .get();

        score = n1CallsQuery.size + n2CallsQuery.size;
        break;
      }
    }

    if (score > 0) {
      leaderboardData.push({
        chatterId: chatterDoc.id,
        name: `${chatter.firstName} ${chatter.lastName.charAt(0)}.`,
        score,
        photoUrl: chatter.photoUrl,
      });
    }
  }

  // Sort by score descending
  leaderboardData.sort((a, b) => b.score - a.score);

  // Keep top 50
  const topLeaderboard = leaderboardData.slice(0, 50);

  // Update the challenge document
  await db.collection("chatter_weekly_challenges").doc(challenge.id).update({
    leaderboard: topLeaderboard,
    updatedAt: Timestamp.now(),
  });

  logger.info("[updateChallengeLeaderboard] Updated leaderboard", {
    challengeId: challenge.id,
    participants: topLeaderboard.length,
  });

  return topLeaderboard;
}

/**
 * End the current challenge and award prizes
 */
async function endWeeklyChallengeInternal(): Promise<{
  challengeId: string;
  winnersCount: number;
  totalPrizesAwarded: number;
}> {
  const db = getFirestore();

  // Get the active challenge
  const activeQuery = await db
    .collection("chatter_weekly_challenges")
    .where("status", "==", "active")
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if (activeQuery.empty) {
    logger.warn("[endWeeklyChallenge] No active challenge to end");
    throw new Error("No active challenge to end");
  }

  const challenge = activeQuery.docs[0].data() as WeeklyChallenge;

  // Update leaderboard one final time
  await updateChallengeLeaderboardInternal(challenge.id);

  // Reload challenge to get updated leaderboard
  const updatedDoc = await db
    .collection("chatter_weekly_challenges")
    .doc(challenge.id)
    .get();
  const updatedChallenge = updatedDoc.data() as WeeklyChallenge;

  // Award prizes to top 3
  const prizeCommissionIds: string[] = [];
  let totalPrizesAwarded = 0;

  const batch = db.batch();

  for (let rank = 1; rank <= 3; rank++) {
    const winner = updatedChallenge.leaderboard[rank - 1];
    if (!winner) continue;

    const prizeAmount = updatedChallenge.prizes[rank as 1 | 2 | 3];
    if (!prizeAmount) continue;

    // Create a commission for the winner
    const commissionRef = db.collection("chatter_commissions").doc();
    const commissionId = commissionRef.id;

    const commission = {
      id: commissionId,
      chatterId: winner.chatterId,
      chatterEmail: "", // Will be fetched
      chatterCode: "",
      type: "bonus_top3" as const,
      sourceId: challenge.id,
      sourceType: "bonus" as const,
      sourceDetails: {
        bonusType: "weekly_challenge",
        bonusReason: `Weekly Challenge ${challenge.title} - Rank #${rank}`,
        rank,
        challengeType: challenge.type,
        weekNumber: challenge.weekNumber,
      },
      baseAmount: prizeAmount,
      levelBonus: 1.0,
      top3Bonus: 1.0,
      zoomBonus: 1.0,
      amount: prizeAmount,
      currency: "USD" as const,
      calculationDetails: `Weekly Challenge Prize: Rank #${rank} = $${(prizeAmount / 100).toFixed(2)}`,
      status: "available" as const,
      validatedAt: Timestamp.now(),
      availableAt: Timestamp.now(),
      withdrawalId: null,
      paidAt: null,
      description: `Weekly Challenge Prize - Rank #${rank}`,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    batch.set(commissionRef, commission);
    prizeCommissionIds.push(commissionId);
    totalPrizesAwarded += prizeAmount;

    // Update chatter balance
    const chatterRef = db.collection("chatters").doc(winner.chatterId);
    batch.update(chatterRef, {
      totalEarned: FieldValue.increment(prizeAmount),
      availableBalance: FieldValue.increment(prizeAmount),
      updatedAt: Timestamp.now(),
    });

    logger.info("[endWeeklyChallenge] Awarding prize", {
      rank,
      chatterId: winner.chatterId,
      amount: prizeAmount,
    });
  }

  // Update challenge status
  batch.update(db.collection("chatter_weekly_challenges").doc(challenge.id), {
    status: "completed",
    prizesAwarded: true,
    prizeCommissionIds,
    updatedAt: Timestamp.now(),
  });

  await batch.commit();

  logger.info("[endWeeklyChallenge] Challenge ended", {
    challengeId: challenge.id,
    winnersCount: prizeCommissionIds.length,
    totalPrizesAwarded,
  });

  return {
    challengeId: challenge.id,
    winnersCount: prizeCommissionIds.length,
    totalPrizesAwarded,
  };
}

/**
 * Get the current active challenge
 */
async function getCurrentChallengeInternal(): Promise<WeeklyChallenge | null> {
  const db = getFirestore();

  const activeQuery = await db
    .collection("chatter_weekly_challenges")
    .where("status", "==", "active")
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if (activeQuery.empty) {
    return null;
  }

  return activeQuery.docs[0].data() as WeeklyChallenge;
}

// ============================================================================
// SCHEDULED FUNCTIONS
// ============================================================================

/**
 * Create a new weekly challenge every Monday at 00:05 UTC
 * (5 minutes after midnight to ensure clean start)
 */
export const chatterCreateWeeklyChallenge = onSchedule(
  {
    schedule: "5 0 * * 1", // Every Monday at 00:05 UTC
    region: "europe-west3",
    memory: "512MiB",
    cpu: 0.5,
    timeoutSeconds: 300,
    retryCount: 3,
  },
  async () => {
    ensureInitialized();
    logger.info("[chatterCreateWeeklyChallenge] Starting...");

    try {
      const challenge = await createWeeklyChallengeInternal();
      logger.info("[chatterCreateWeeklyChallenge] Challenge created", {
        challengeId: challenge?.id,
      });
    } catch (error) {
      logger.error("[chatterCreateWeeklyChallenge] Error", { error });
      throw error;
    }
  }
);

/**
 * Update leaderboard every hour
 */
export const chatterUpdateChallengeLeaderboard = onSchedule(
  {
    schedule: "0 * * * *", // Every hour at minute 0
    region: "europe-west3",
    memory: "1GiB",
    cpu: 1,
    timeoutSeconds: 540,
    retryCount: 2,
  },
  async () => {
    ensureInitialized();
    logger.info("[chatterUpdateChallengeLeaderboard] Starting...");

    try {
      const leaderboard = await updateChallengeLeaderboardInternal();
      logger.info("[chatterUpdateChallengeLeaderboard] Leaderboard updated", {
        participants: leaderboard.length,
      });
    } catch (error) {
      logger.error("[chatterUpdateChallengeLeaderboard] Error", { error });
      throw error;
    }
  }
);

/**
 * End weekly challenge every Sunday at 23:55 UTC
 * (5 minutes before midnight to finalize before new week)
 */
export const chatterEndWeeklyChallenge = onSchedule(
  {
    schedule: "55 23 * * 0", // Every Sunday at 23:55 UTC
    region: "europe-west3",
    memory: "1GiB",
    cpu: 1,
    timeoutSeconds: 540,
    retryCount: 3,
  },
  async () => {
    ensureInitialized();
    logger.info("[chatterEndWeeklyChallenge] Starting...");

    try {
      const result = await endWeeklyChallengeInternal();
      logger.info("[chatterEndWeeklyChallenge] Challenge ended", result);
    } catch (error) {
      logger.error("[chatterEndWeeklyChallenge] Error", { error });
      throw error;
    }
  }
);

// ============================================================================
// CALLABLE FUNCTIONS
// ============================================================================

/**
 * Get the current active challenge (callable by chatters)
 */
export const getCurrentChallenge = onCall(
  {
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.25,
    timeoutSeconds: 30,
  },
  async (request: CallableRequest): Promise<{
    challenge: WeeklyChallenge | null;
    myRank: number | null;
    myScore: number | null;
  }> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const uid = request.auth.uid;

    try {
      const challenge = await getCurrentChallengeInternal();

      if (!challenge) {
        return { challenge: null, myRank: null, myScore: null };
      }

      // Find user's rank and score
      const myEntry = challenge.leaderboard.findIndex(
        (entry) => entry.chatterId === uid
      );
      const myRank = myEntry >= 0 ? myEntry + 1 : null;
      const myScore = myEntry >= 0 ? challenge.leaderboard[myEntry].score : null;

      return { challenge, myRank, myScore };
    } catch (error) {
      logger.error("[getCurrentChallenge] Error", { error, uid });
      throw new HttpsError("internal", "Failed to get current challenge");
    }
  }
);

/**
 * Get challenge history (callable by chatters)
 */
export const getChallengeHistory = onCall(
  {
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.25,
    timeoutSeconds: 30,
  },
  async (
    request: CallableRequest<{ limit?: number }>
  ): Promise<{
    challenges: WeeklyChallenge[];
  }> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const limit = request.data?.limit || 10;

    try {
      const db = getFirestore();
      const snapshot = await db
        .collection("chatter_weekly_challenges")
        .where("status", "==", "completed")
        .orderBy("endDate", "desc")
        .limit(limit)
        .get();

      const challenges = snapshot.docs.map((doc) => doc.data() as WeeklyChallenge);

      return { challenges };
    } catch (error) {
      logger.error("[getChallengeHistory] Error", { error });
      throw new HttpsError("internal", "Failed to get challenge history");
    }
  }
);

// ============================================================================
// TRIGGER HELPER (to be called from other triggers)
// ============================================================================

/**
 * Update challenge score when a relevant action happens
 * Call this from onCallCompleted, onChatterCreated triggers, etc.
 */
export async function updateChatterChallengeScore(
  chatterId: string,
  actionType: "client_call" | "n1_call" | "n2_call" | "recruit" | "provider_call"
): Promise<void> {
  ensureInitialized();
  const db = getFirestore();

  try {
    // Get current active challenge
    const activeQuery = await db
      .collection("chatter_weekly_challenges")
      .where("status", "==", "active")
      .limit(1)
      .get();

    if (activeQuery.empty) {
      return; // No active challenge
    }

    const challenge = activeQuery.docs[0].data() as WeeklyChallenge;

    // Check if action is relevant for this challenge type
    let isRelevant = false;
    switch (challenge.type) {
      case "recruiter":
        isRelevant = actionType === "recruit";
        break;
      case "caller":
        isRelevant = actionType === "client_call";
        break;
      case "team":
        isRelevant = actionType === "n1_call" || actionType === "n2_call";
        break;
    }

    if (!isRelevant) {
      return;
    }

    // Get chatter info
    const chatterDoc = await db.collection("chatters").doc(chatterId).get();
    if (!chatterDoc.exists) {
      return;
    }

    const chatter = chatterDoc.data()!;

    // Update leaderboard
    const leaderboard = [...challenge.leaderboard];
    const existingIndex = leaderboard.findIndex((e) => e.chatterId === chatterId);

    if (existingIndex >= 0) {
      leaderboard[existingIndex].score += 1;
    } else {
      leaderboard.push({
        chatterId,
        name: `${chatter.firstName} ${chatter.lastName.charAt(0)}.`,
        score: 1,
        photoUrl: chatter.photoUrl,
      });
    }

    // Sort and update
    leaderboard.sort((a, b) => b.score - a.score);

    await db.collection("chatter_weekly_challenges").doc(challenge.id).update({
      leaderboard: leaderboard.slice(0, 50),
      updatedAt: Timestamp.now(),
    });

    logger.info("[updateChatterChallengeScore] Score updated", {
      chatterId,
      actionType,
      challengeId: challenge.id,
    });
  } catch (error) {
    logger.error("[updateChatterChallengeScore] Error", { error, chatterId });
    // Don't throw - this is a non-critical operation
  }
}
