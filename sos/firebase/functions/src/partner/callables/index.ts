/**
 * Partner Callables - Export Index
 */

// Admin callables
export { createPartner } from "./createPartner";

// Partner self-access callables
export { getPartnerDashboard } from "./getPartnerDashboard";
export { updatePartnerProfile } from "./updatePartnerProfile";
export { getPartnerCommissions } from "./getPartnerCommissions";
export { getPartnerClicks } from "./getPartnerClicks";
export { getPartnerWidgets } from "./getPartnerWidgets";
export { getPartnerNotifications } from "./getPartnerNotifications";
export { markPartnerNotificationRead } from "./markPartnerNotificationRead";
export { partnerRequestWithdrawal } from "./partnerRequestWithdrawal";

// Public callables (no auth required)
export { trackPartnerClick } from "./trackPartnerClick";
export { submitPartnerApplication } from "./submitPartnerApplication";
