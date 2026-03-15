/**
 * Chatter Triggers - Main Export
 */

export { chatterOnChatterCreated } from "./onChatterCreated";
// chatterOnCallCompleted → consolidated into consolidatedOnCallCompleted
export {
  chatterOnProviderRegistered,
  chatterOnClientRegistered,
} from "./onProviderRegistered";

// Referral system trigger
export { chatterOnChatterEarningsUpdated } from "./onChatterEarningsUpdated";

// Activity feed trigger
export { chatterOnCommissionCreated } from "./onCommissionCreated";
