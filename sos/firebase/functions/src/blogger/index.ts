/**
 * Blogger Module - Main Export Index
 *
 * Complete blogger partner system for SOS-Expat.
 *
 * Key features:
 * - FIXED commissions: $10 client, $5 recruitment (no bonuses)
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

  // Resources (EXCLUSIVE)
  getBloggerResources,
  downloadBloggerResource,
  copyBloggerResourceText,

  // Guide (EXCLUSIVE)
  getBloggerGuide,
  copyBloggerGuideText,
  trackBloggerGuideUsage,

  // Admin callables
  adminGetBloggersList,
  adminGetBloggerDetail,
  adminProcessBloggerWithdrawal,
  adminUpdateBloggerStatus,
  adminGetBloggerConfig,
  adminUpdateBloggerConfig,
  adminCreateBloggerResource,
  adminUpdateBloggerResource,
  adminDeleteBloggerResource,
  adminCreateBloggerResourceText,
  adminCreateBloggerGuideTemplate,
  adminUpdateBloggerGuideTemplate,
  adminCreateBloggerGuideCopyText,
  adminUpdateBloggerGuideCopyText,
  adminCreateBloggerGuideBestPractice,
  adminUpdateBloggerGuideBestPractice,
  adminExportBloggers,
  adminGetBloggerLeaderboard,
} from "./callables";

// ============================================================================
// TRIGGERS
// ============================================================================

export {
  onBloggerCreated,
  checkBloggerClientReferral,
  checkBloggerProviderRecruitment,
  awardBloggerRecruitmentCommission,
  deactivateExpiredRecruitments,
} from "./triggers";

// ============================================================================
// SCHEDULED FUNCTIONS
// ============================================================================

export {
  bloggerValidatePendingCommissions,
  bloggerReleaseValidatedCommissions,
  bloggerUpdateMonthlyRankings,
  bloggerDeactivateExpiredRecruitments,
  bloggerFinalizeMonthlyRankings,
} from "./scheduled";
