/**
 * Blogger Triggers - Export Index
 */

export { onBloggerCreated } from "./onBloggerCreated";

// Export utility functions and triggers for use in other parts of the app
export {
  checkBloggerClientReferral,
  bloggerOnCallSessionCompleted,
} from "./onCallCompleted";

export {
  handleBloggerProviderRegistered,
  checkBloggerProviderRecruitment,
  awardBloggerRecruitmentCommission,
  deactivateExpiredRecruitments,
} from "./onProviderRegistered";
