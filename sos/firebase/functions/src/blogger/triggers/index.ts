/**
 * Blogger Triggers - Export Index
 */

export { onBloggerCreated } from "./onBloggerCreated";

// bloggerOnCallSessionCompleted → consolidated into consolidatedOnCallCompleted
// checkBloggerClientReferral is a helper, not a Cloud Function
export {
  checkBloggerClientReferral,
} from "./onCallCompleted";

export {
  handleBloggerProviderRegistered,
  checkBloggerProviderRecruitment,
  awardBloggerRecruitmentCommission,
  deactivateExpiredRecruitments,
} from "./onProviderRegistered";
