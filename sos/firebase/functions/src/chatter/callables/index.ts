/**
 * Chatter Callables - Main Export
 */

// User Callables
export { registerChatter } from "./registerChatter";
export { submitQuiz, getQuizQuestions } from "./submitQuiz";
export { getChatterDashboard } from "./getChatterDashboard";
export { requestWithdrawal } from "./requestWithdrawal";
export { updateChatterProfile } from "./updateChatterProfile";

// Admin Callables
export {
  adminGetChattersList,
  adminGetChatterDetail,
  adminProcessWithdrawal,
  adminUpdateChatterStatus,
} from "./admin";
