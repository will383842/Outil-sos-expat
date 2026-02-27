/**
 * Chatter Scheduled Functions - Main Export
 */

export { chatterValidatePendingCommissions } from "./validatePendingCommissions";
export { chatterReleaseValidatedCommissions } from "./releaseValidatedCommissions";

// Referral system scheduled functions
export {
  chatterMonthlyRecurringCommissions,
  chatterValidatePendingReferralCommissions,
} from "./monthlyRecurringCommissions";

// Weekly Challenges
export {
  chatterCreateWeeklyChallenge,
  chatterUpdateChallengeLeaderboard,
  chatterEndWeeklyChallenge,
  updateChatterChallengeScore,
} from "./weeklyChallenges";

// Tier Bonus Check (daily check for milestone bonuses: 5, 10, 25, 50, 100 filleuls)
export { chatterTierBonusCheck, processTierBonusCheck } from "./tierBonusCheck";

// Monthly Top 3 Rewards (1st of month at 00:30 UTC)
export {
  chatterMonthlyTop3Rewards,
  processMonthlyTop3Rewards,
  calculateMonthlyRankings,
} from "./monthlyTop3Rewards";

// Captain Monthly Reset (1st of month at 00:05 UTC)
export { chatterResetCaptainMonthly } from "./resetCaptainMonthly";

// Activity Feed Aggregation (every 5 minutes)
export {
  chatterAggregateActivityFeed,
  addActivityToFeed,
  ActivityFeedItem,
} from "./aggregateActivityFeed";
