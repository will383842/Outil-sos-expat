/**
 * Chatter Callables - Main Export
 */

// User Callables
export { registerChatter } from "./registerChatter";
export { getChatterDashboard } from "./getChatterDashboard";
export { requestWithdrawal } from "./requestWithdrawal";
export { updateChatterProfile } from "./updateChatterProfile";
export { updateTelegramOnboarding } from "./updateTelegramOnboarding";
export { getChatterRecruitedProviders } from "./getRecruitedProviders";

// Training Callables
export {
  getChatterTrainingModules,
  getChatterTrainingModuleContent,
  updateChatterTrainingProgress,
  submitChatterTrainingQuiz,
  getChatterTrainingCertificate,
} from "./training";

// Admin Training Callables
export {
  adminGetTrainingModules,
  adminCreateTrainingModule,
  adminUpdateTrainingModule,
  adminDeleteTrainingModule,
  adminSeedTrainingModules,
  adminReorderTrainingModules,
} from "./adminTraining";

// Admin Callables
export {
  adminGetChattersList,
  adminGetChatterDetail,
  adminProcessWithdrawal,
  adminUpdateChatterStatus,
  adminUpdateChatterProfile,
  adminGetChatterHierarchy,
} from "./admin";

// Public directory
export { getChatterDirectory } from "./public";

// Admin visibility toggle
export { adminToggleChatterVisibility } from "./admin/toggleVisibility";

// Captain Chatter
export { getCaptainDashboard } from "./captain";

// Admin Captain Chatter
export {
  adminPromoteToCaptain,
  adminRevokeCaptain,
  adminToggleCaptainQualityBonus,
  adminGetCaptainsList,
  adminGetCaptainDetail,
  adminExportCaptainCSV,
  adminAssignCaptainCoverage,
  adminTransferChatters,
  adminGetCaptainCoverageMap,
  adminAssignChatterCaptain,
  adminBulkAssignChattersCaptain,
  adminGetAvailableCaptains,
  adminSearchChatters,
} from "./admin/captain";

// Resource Callables — MIGRATED TO LARAVEL (Phase 4, 2026-03-12)
