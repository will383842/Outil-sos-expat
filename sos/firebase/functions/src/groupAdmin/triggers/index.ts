/**
 * GroupAdmin Triggers - Main Export
 */

export { onCallCompletedGroupAdmin, handleProviderRecruitmentCommission } from "./onCallCompleted";
export { onGroupAdminCreated } from "./onGroupAdminCreated";
export {
  handleGroupAdminProviderRegistered,
  checkGroupAdminProviderRecruitment,
  awardGroupAdminProviderRecruitmentCommission,
} from "./onProviderRegistered";
