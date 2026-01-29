/**
 * Chatter Triggers - Main Export
 */

export { chatterOnChatterCreated } from "./onChatterCreated";
export { chatterOnQuizPassed } from "./onChatterQuizPassed";
export { chatterOnCallCompleted } from "./onCallCompleted";
export {
  chatterOnProviderRegistered,
  chatterOnClientRegistered,
} from "./onProviderRegistered";

// Referral system trigger
export { chatterOnChatterEarningsUpdated } from "./onChatterEarningsUpdated";
