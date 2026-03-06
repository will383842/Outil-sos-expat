/**
 * Callable: getActiveCommissionPlan
 *
 * Public callable for landing pages and registration forms.
 * Returns the currently active commission plan (rates + name + dates).
 * No authentication required — this is promotional information.
 */

import { onCall } from "firebase-functions/v2/https";
import { resolveActivePlan } from "./planResolver";
import { ALLOWED_ORIGINS } from "./functionConfigs";

export const getActiveCommissionPlan = onCall(
  {
    region: "europe-west1",
    memory: "128MiB",
    cors: ALLOWED_ORIGINS,
  },
  async () => {
    const plan = await resolveActivePlan();

    if (!plan) {
      return { success: true, plan: null };
    }

    return {
      success: true,
      plan: {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        startDate: plan.startDate.toDate().toISOString(),
        endDate: plan.endDate.toDate().toISOString(),
        chatterRates: plan.chatterRates,
        influencerRates: plan.influencerRates,
        bloggerRates: plan.bloggerRates,
        groupAdminRates: plan.groupAdminRates,
      },
    };
  }
);
