/**
 * User-facing Callable — getMyCommissionPlan
 *
 * Returns the authenticated user's resolved commission plan info.
 * Called by the useUnifiedAffiliate hook on the frontend.
 *
 * Region: us-central1 (affiliate region, optimal Firestore latency)
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { getApps, initializeApp } from "firebase-admin/app";
import { affiliateAdminConfig } from "../../lib/functionConfigs";
import { resolvePlanForUser } from "../planService";

function ensureInitialized() {
  if (!getApps().length) initializeApp();
}

export const getMyCommissionPlan = onCall(
  { ...affiliateAdminConfig, timeoutSeconds: 15 },
  async (request) => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const uid = request.auth.uid;
    const db = getFirestore();

    // Read user doc to get role, commissionPlanId, lockedRates
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User not found");
    }

    const userData = userDoc.data()!;
    const role = userData.role || userData.affiliateRole || "affiliate";
    const commissionPlanId = userData.commissionPlanId || null;
    const lockedRates = userData.lockedRates || null;

    // Resolve plan
    const plan = await resolvePlanForUser(role, commissionPlanId);
    if (!plan) {
      return {
        success: true,
        planId: null,
        planName: null,
        role,
        rates: [],
        discount: null,
        lockedRates: lockedRates || null,
      };
    }

    // Build rates array from plan rules
    const rates: Array<{
      type: string;
      fixedAmount?: number;
      percentage?: number;
      enabled: boolean;
    }> = [];

    const r = plan.rules;

    if (r.signup_bonus) {
      rates.push({
        type: "signup_bonus",
        fixedAmount: lockedRates?.signup_bonus ?? r.signup_bonus.amount,
        enabled: r.signup_bonus.enabled,
      });
    }

    if (r.client_call) {
      if (r.client_call.type === "fixed" && r.client_call.amounts) {
        rates.push({
          type: "client_call_lawyer",
          fixedAmount: lockedRates?.client_call_lawyer ?? r.client_call.amounts.lawyer,
          enabled: r.client_call.enabled,
        });
        rates.push({
          type: "client_call_expat",
          fixedAmount: lockedRates?.client_call_expat ?? r.client_call.amounts.expat,
          enabled: r.client_call.enabled,
        });
      } else if (r.client_call.type === "percentage" && r.client_call.rate) {
        rates.push({
          type: "client_call",
          percentage: lockedRates?.client_call ?? r.client_call.rate,
          enabled: r.client_call.enabled,
        });
      }
    }

    if (r.recruitment_call && r.recruitment_call.enabled) {
      for (let i = 0; i < r.recruitment_call.depth; i++) {
        const key = `recruitment_call_n${i + 1}`;
        rates.push({
          type: key,
          fixedAmount: lockedRates?.[key] ?? r.recruitment_call.depthAmounts[i],
          enabled: true,
        });
      }
    }

    if (r.activation_bonus) {
      rates.push({
        type: "activation_bonus",
        fixedAmount: lockedRates?.activation_bonus ?? r.activation_bonus.amount,
        enabled: r.activation_bonus.enabled,
      });
    }

    if (r.provider_recruitment && r.provider_recruitment.amounts) {
      rates.push({
        type: "provider_recruitment_lawyer",
        fixedAmount: lockedRates?.provider_recruitment_lawyer ?? r.provider_recruitment.amounts.lawyer,
        enabled: r.provider_recruitment.enabled,
      });
      rates.push({
        type: "provider_recruitment_expat",
        fixedAmount: lockedRates?.provider_recruitment_expat ?? r.provider_recruitment.amounts.expat,
        enabled: r.provider_recruitment.enabled,
      });
    }

    if (r.recruit_bonus) {
      rates.push({
        type: "recruit_bonus",
        fixedAmount: lockedRates?.recruit_bonus ?? r.recruit_bonus.amount,
        enabled: r.recruit_bonus.enabled,
      });
    }

    if (r.n1_recruit_bonus) {
      rates.push({
        type: "n1_recruit_bonus",
        fixedAmount: lockedRates?.n1_recruit_bonus ?? r.n1_recruit_bonus.amount,
        enabled: r.n1_recruit_bonus.enabled,
      });
    }

    if (r.subscription_commission) {
      rates.push({
        type: "subscription_commission",
        ...(r.subscription_commission.type === "fixed"
          ? { fixedAmount: lockedRates?.subscription_commission ?? r.subscription_commission.firstMonthAmount }
          : { percentage: lockedRates?.subscription_commission ?? r.subscription_commission.rate }),
        enabled: r.subscription_commission.enabled,
      });
    }

    // Build discount info
    const discountConfig = userData.discountConfig || null;
    const discount = discountConfig
      ? {
          type: discountConfig.type as "fixed" | "percentage",
          value: discountConfig.value as number,
          label: discountConfig.label as string | undefined,
          enabled: discountConfig.enabled as boolean,
        }
      : plan.discount?.enabled
        ? {
            type: plan.discount.type,
            value: plan.discount.value,
            label: plan.discount.label,
            enabled: true,
          }
        : null;

    return {
      success: true,
      planId: plan.id,
      planName: plan.name,
      role,
      rates,
      discount,
      lockedRates: lockedRates || null,
    };
  }
);
