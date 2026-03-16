/**
 * Influencer Callables - Main Export
 */

// User Callables
export { registerInfluencer } from "./registerInfluencer";
export { getInfluencerDashboard } from "./getInfluencerDashboard";
export { updateInfluencerProfile } from "./updateInfluencerProfile";
export { requestWithdrawal as influencerRequestWithdrawal } from "./requestWithdrawal";
export { getInfluencerLeaderboard } from "./getInfluencerLeaderboard";
export { getInfluencerRecruits } from "./getInfluencerRecruits";
export { getInfluencerRecruitedProviders } from "./getRecruitedProviders";

// Training Callables
export {
  getInfluencerTrainingModules,
  getInfluencerTrainingModuleContent,
  updateInfluencerTrainingProgress,
  submitInfluencerTrainingQuiz,
  getInfluencerTrainingCertificate,
} from "./training";

// Admin Training Callables
export {
  adminGetInfluencerTrainingModules,
  adminCreateInfluencerTrainingModule,
  adminUpdateInfluencerTrainingModule,
  adminDeleteInfluencerTrainingModule,
  adminSeedInfluencerTrainingModules,
} from "./adminTraining";

// Resources Callables — MIGRATED TO LARAVEL (Phase 4, 2026-03-12)

// Admin Callables
export {
  adminGetInfluencersList,
  adminGetInfluencerDetail,
  adminProcessInfluencerWithdrawal,
  adminUpdateInfluencerStatus,
  adminGetPendingInfluencerWithdrawals,
  adminGetInfluencerConfig,
  adminUpdateInfluencerConfig,
  adminGetInfluencerLeaderboard,
  // V2 Admin Callables
  adminUpdateCommissionRules,
  adminGetRateHistory,
  adminUpdateAntiFraudConfig,
  adminExportInfluencers,
  adminBulkInfluencerAction,
} from "./admin";

// Admin - Visibility Toggle
export { adminToggleInfluencerVisibility } from "./admin/toggleVisibility";

// Public Callables
export { getInfluencerDirectory } from "./public";
