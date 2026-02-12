/**
 * =============================================================================
 * MULTI DASHBOARD - Module Exports
 * =============================================================================
 *
 * Exports all Cloud Functions for the multi-provider dashboard.
 */

export { validateDashboardPassword } from "./validateDashboardPassword";
export { getMultiDashboardData } from "./getMultiDashboardData";
export { triggerAiFromBookingRequest } from "./onBookingCreatedGenerateAi";
export { generateMultiDashboardOutilToken } from "./generateMultiDashboardOutilToken";
export { getProviderConversations, sendMultiDashboardMessage } from "./getProviderConversations";
export { generateMultiDashboardAiResponse } from "./generateAiResponseCallable";
export { migrateOldPendingBookings } from "./migrateOldBookings";
export { createBookingFromRequest } from "./createBookingFromRequest";
