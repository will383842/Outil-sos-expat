/**
 * MINIMAL INDEX - CHATTER REGISTRATION ONLY
 * Simplified fraud check - no ultraDebugLogger
 * Full index backed up in index.ts.full2.bak
 */

import Stripe from "stripe";
import { defineString } from "firebase-functions/params";

// Stripe configuration
const STRIPE_MODE = defineString("STRIPE_MODE", { default: "test" });
const STRIPE_SECRET_KEY_LIVE = "sk_live_XXX";
const STRIPE_SECRET_KEY_TEST = "sk_test_XXX";

export function getStripe(): Stripe {
  const isLiveMode = STRIPE_MODE.value() === "live";
  const apiKey = isLiveMode ? STRIPE_SECRET_KEY_LIVE : STRIPE_SECRET_KEY_TEST;
  return new Stripe(apiKey, {
    apiVersion: "2023-10-16",
    typescript: true,
  });
}

// CHATTER REGISTRATION (SIMPLIFIED FRAUD CHECK - ALIGNED WITH OTHER ROLES)
export { registerChatter } from "./chatter/callables/registerChatter";
export { getMyAffiliateData } from "./affiliate/callables/getMyAffiliateData";

// OTHER REGISTRATIONS
export { registerInfluencer } from "./influencer/callables/registerInfluencer";
export { registerBlogger } from "./blogger/callables/registerBlogger";
export { registerGroupAdmin } from "./groupAdmin/callables/registerGroupAdmin";

// MULTI-DASHBOARD
export { ensureUserDocument } from "./multiDashboard/ensureUserDocument";

console.log('[INDEX-SIMPLIFIED] All registration functions loaded successfully');
