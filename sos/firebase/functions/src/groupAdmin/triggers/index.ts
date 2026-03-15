/**
 * GroupAdmin Triggers - Main Export
 */

// onCallCompletedGroupAdmin → consolidated into consolidatedOnCallCompleted
// handleProviderRecruitmentCommission is still used by consolidatedOnCallCompleted
export { handleProviderRecruitmentCommission } from "./onCallCompleted";
export { onGroupAdminCreated } from "./onGroupAdminCreated";
export {
  handleGroupAdminProviderRegistered,
  checkGroupAdminProviderRecruitment,
  awardGroupAdminProviderRecruitmentCommission,
} from "./onProviderRegistered";
