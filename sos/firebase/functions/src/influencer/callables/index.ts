/**
 * Influencer Callables - Main Export
 */

// User Callables
export { registerInfluencer } from "./registerInfluencer";
export { getInfluencerDashboard } from "./getInfluencerDashboard";
export { updateInfluencerProfile } from "./updateInfluencerProfile";
export { requestWithdrawal as influencerRequestWithdrawal } from "./requestWithdrawal";
export { getInfluencerLeaderboard } from "./getInfluencerLeaderboard";

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

// Resources Callables
export {
  getInfluencerResources,
  downloadInfluencerResource,
  copyInfluencerResourceText,
} from "./resources";

// Admin Resources Callables
export {
  adminGetInfluencerResources,
  adminCreateInfluencerResource,
  adminUpdateInfluencerResource,
  adminDeleteInfluencerResource,
  adminCreateInfluencerResourceText,
  adminUpdateInfluencerResourceText,
  adminDeleteInfluencerResourceText,
} from "./admin/resources";

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
