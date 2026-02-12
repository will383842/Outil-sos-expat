/**
 * MINIMAL INDEX.TS FOR EMERGENCY DEPLOYMENT
 * Only exports critical chatter registration functions
 * Full index.ts backed up in index.ts.full.bak
 */

import Stripe from "stripe";
import { defineString } from "firebase-functions/params";

// Stripe configuration (needed by other modules)
const STRIPE_MODE = defineString("STRIPE_MODE", { default: "test" });
const STRIPE_SECRET_KEY_LIVE = "sk_live_XXX"; // Stub for compilation
const STRIPE_SECRET_KEY_TEST = "sk_test_XXX"; // Stub for compilation

export function getStripe(): Stripe {
  const isLiveMode = STRIPE_MODE.value() === "live";
  const apiKey = isLiveMode ? STRIPE_SECRET_KEY_LIVE : STRIPE_SECRET_KEY_TEST;
  return new Stripe(apiKey, {
    apiVersion: "2023-10-16",
    typescript: true,
  });
}

// Critical chatter registration functions
export { registerChatter } from "./chatter/callables/registerChatter";
export { getMyAffiliateData } from "./affiliate/callables/getMyAffiliateData";
export { ensureUserDocument } from "./multiDashboard/ensureUserDocument";

console.log('[MINIMAL INDEX] Critical functions exported successfully');
