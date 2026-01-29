/**
 * Blogger Triggers - Export Index
 */

export { onBloggerCreated } from "./onBloggerCreated";

// Export utility functions for use in other parts of the app
export {
  checkBloggerClientReferral,
} from "./onCallCompleted";

export {
  checkBloggerProviderRecruitment,
  awardBloggerRecruitmentCommission,
  deactivateExpiredRecruitments,
} from "./onProviderRegistered";
