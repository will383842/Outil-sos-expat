/**
 * Blogger Module - Main Export Index
 *
 * Complete blogger partner system for SOS-Expat.
 *
 * Key features:
 * - FIXED commissions: $10 client, $5 provider recruitment per call (no bonuses)
 * - Blogger recruitment: $50 one-time when recruited blogger reaches $200 direct commissions
 * - Direct activation (no quiz)
 * - 0% client discount (vs 5% for influencers)
 * - Definitive role (cannot become Chatter/Influencer)
 * - 12 simplified badges
 * - Top 10 leaderboard (informational only)
 * - EXCLUSIVE: Resources section (SOS-Expat, Ulixai, Founder)
 * - EXCLUSIVE: Integration Guide (templates, copy texts, best practices)
 */

// ============================================================================
// TYPES
// ============================================================================

export * from "./types";

// ============================================================================
// SERVICES
// ============================================================================

export * from "./services";

// ============================================================================
// UTILITIES
// ============================================================================

export * from "./utils";

// ============================================================================
// CALLABLES
// ============================================================================

export {
  // User callables
  registerBlogger,
  getBloggerDashboard,
  updateBloggerProfile,
  bloggerRequestWithdrawal,
  getBloggerLeaderboard,
  getBloggerRecruits,
  getBloggerRecruitedProviders,

  // Resources, Guide, Articles — MIGRATED TO LARAVEL (Phase 4, 2026-03-12)

  // Admin callables
  adminGetBloggersList,
  adminGetBloggerDetail,
  adminProcessBloggerWithdrawal,
  adminUpdateBloggerStatus,
  adminGetBloggerConfig,
  adminUpdateBloggerConfig,
  adminGetBloggerConfigHistory,
  adminExportBloggers,
  adminBulkBloggerAction,
  adminGetBloggerLeaderboard,

  // Admin withdrawals
  adminGetBloggerWithdrawals,

  // Public directory
  getBloggerDirectory,

  // Admin visibility toggle
  adminToggleBloggerVisibility,

  // Admin delete
  adminDeleteBlogger,

  // Admin locked rates
  adminUpdateBloggerLockedRates,
} from "./callables";

export { adminUpdateBloggerProfile } from "./callables/admin/updateProfile";

// ============================================================================
// TRIGGERS
// ============================================================================

export {
  onBloggerCreated,
  handleBloggerProviderRegistered,
  checkBloggerClientReferral,
  // bloggerOnCallSessionCompleted → consolidatedOnCallCompleted
  checkBloggerProviderRecruitment,
  awardBloggerRecruitmentCommission,
  deactivateExpiredRecruitments,
} from "./triggers";

// ============================================================================
// SCHEDULED FUNCTIONS
// ============================================================================

export {
  // bloggerValidatePendingCommissions → consolidatedValidateCommissions
  // bloggerReleaseValidatedCommissions → consolidatedReleaseCommissions
  bloggerUpdateMonthlyRankings,
  bloggerDeactivateExpiredRecruitments,
  bloggerFinalizeMonthlyRankings,
} from "./scheduled";
