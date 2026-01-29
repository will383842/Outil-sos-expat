/**
 * Chatter Callables - Main Export
 */

// User Callables
export { registerChatter } from "./registerChatter";
export { submitQuiz, getQuizQuestions } from "./submitQuiz";
export { getChatterDashboard } from "./getChatterDashboard";
export { requestWithdrawal } from "./requestWithdrawal";
export { updateChatterProfile } from "./updateChatterProfile";

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
} from "./admin";
