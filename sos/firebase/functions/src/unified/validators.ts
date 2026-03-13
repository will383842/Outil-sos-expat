/**
 * Unified Affiliate System — Plan Validators
 *
 * Validates CommissionPlan data before creation or update.
 * Used by admin callables and seed scripts.
 */

import { UnifiedCommissionPlan, CommissionPlanRules, CommissionPlanBonuses, CommissionPlanDiscount } from "./types";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a complete or partial CommissionPlan.
 * Returns { valid: true, errors: [] } or { valid: false, errors: [...] }.
 */
export function validateCommissionPlan(plan: Partial<UnifiedCommissionPlan>): ValidationResult {
  const errors: string[] = [];

  // Required fields
  if (!plan.name?.trim()) {
    errors.push("name is required");
  }
  if (!plan.targetRoles?.length) {
    errors.push("targetRoles must contain at least 1 role");
  }

  // Rules validation
  if (plan.rules) {
    errors.push(...validateRules(plan.rules));
  }

  // Bonuses validation
  if (plan.bonuses) {
    errors.push(...validateBonuses(plan.bonuses));
  }

  // Discount validation
  if (plan.discount) {
    errors.push(...validateDiscount(plan.discount));
  }

  // Withdrawal validation
  if (plan.withdrawal) {
    if (plan.withdrawal.minimumAmount < 0) {
      errors.push("withdrawal.minimumAmount must be >= 0");
    }
    if (plan.withdrawal.fee < 0) {
      errors.push("withdrawal.fee must be >= 0");
    }
    if (plan.withdrawal.holdPeriodHours < 0 || plan.withdrawal.holdPeriodHours > 720) {
      errors.push("withdrawal.holdPeriodHours must be between 0 and 720");
    }
  }

  // Version must be positive if provided
  if (plan.version !== undefined && plan.version < 0) {
    errors.push("version must be >= 0");
  }

  return { valid: errors.length === 0, errors };
}

function validateRules(r: Partial<CommissionPlanRules>): string[] {
  const errors: string[] = [];

  // signup_bonus
  if (r.signup_bonus) {
    if (r.signup_bonus.amount < 0) {
      errors.push("rules.signup_bonus.amount must be >= 0");
    }
  }

  // client_call
  if (r.client_call) {
    if (r.client_call.type === "fixed") {
      if ((r.client_call.amounts?.lawyer ?? 0) < 0) {
        errors.push("rules.client_call.amounts.lawyer must be >= 0");
      }
      if ((r.client_call.amounts?.expat ?? 0) < 0) {
        errors.push("rules.client_call.amounts.expat must be >= 0");
      }
    }
    if (r.client_call.type === "percentage") {
      const rate = r.client_call.rate ?? 0;
      if (rate < 0 || rate > 1) {
        errors.push("rules.client_call.rate must be between 0 and 1");
      }
    }
  }

  // recruitment_call
  if (r.recruitment_call) {
    if (r.recruitment_call.depth < 0 || r.recruitment_call.depth > 5) {
      errors.push("rules.recruitment_call.depth must be between 0 and 5");
    }
    if (r.recruitment_call.enabled && r.recruitment_call.depth > 0) {
      if (!r.recruitment_call.depthAmounts || r.recruitment_call.depthAmounts.length !== r.recruitment_call.depth) {
        errors.push(`rules.recruitment_call.depthAmounts must have exactly ${r.recruitment_call.depth} entries (matching depth)`);
      } else {
        for (let i = 0; i < r.recruitment_call.depthAmounts.length; i++) {
          if (r.recruitment_call.depthAmounts[i] < 0) {
            errors.push(`rules.recruitment_call.depthAmounts[${i}] must be >= 0`);
          }
        }
      }
    }
  }

  // activation_bonus
  if (r.activation_bonus) {
    if (r.activation_bonus.amount < 0) {
      errors.push("rules.activation_bonus.amount must be >= 0");
    }
    if (r.activation_bonus.enabled && r.activation_bonus.afterNthCall < 1) {
      errors.push("rules.activation_bonus.afterNthCall must be >= 1");
    }
  }

  // provider_recruitment
  if (r.provider_recruitment) {
    if ((r.provider_recruitment.amounts?.lawyer ?? 0) < 0) {
      errors.push("rules.provider_recruitment.amounts.lawyer must be >= 0");
    }
    if ((r.provider_recruitment.amounts?.expat ?? 0) < 0) {
      errors.push("rules.provider_recruitment.amounts.expat must be >= 0");
    }
    if (r.provider_recruitment.windowMonths < 1 || r.provider_recruitment.windowMonths > 24) {
      errors.push("rules.provider_recruitment.windowMonths must be between 1 and 24");
    }
  }

  // recruit_bonus
  if (r.recruit_bonus && r.recruit_bonus.amount < 0) {
    errors.push("rules.recruit_bonus.amount must be >= 0");
  }

  // n1_recruit_bonus
  if (r.n1_recruit_bonus && r.n1_recruit_bonus.amount < 0) {
    errors.push("rules.n1_recruit_bonus.amount must be >= 0");
  }

  // subscription_commission
  if (r.subscription_commission) {
    if (r.subscription_commission.type === "percentage") {
      const rate = r.subscription_commission.rate ?? 0;
      if (rate < 0 || rate > 1) {
        errors.push("rules.subscription_commission.rate must be between 0 and 1");
      }
    }
    if (r.subscription_commission.type === "fixed") {
      if ((r.subscription_commission.firstMonthAmount ?? 0) < 0) {
        errors.push("rules.subscription_commission.firstMonthAmount must be >= 0");
      }
      if ((r.subscription_commission.renewalAmount ?? 0) < 0) {
        errors.push("rules.subscription_commission.renewalAmount must be >= 0");
      }
    }
    if ((r.subscription_commission.maxMonths ?? 0) < 0) {
      errors.push("rules.subscription_commission.maxMonths must be >= 0");
    }
  }

  // referral_milestones
  if (r.referral_milestones) {
    if (r.referral_milestones.enabled && r.referral_milestones.qualificationThreshold < 0) {
      errors.push("rules.referral_milestones.qualificationThreshold must be >= 0");
    }
    if (r.referral_milestones.milestones) {
      for (let i = 0; i < r.referral_milestones.milestones.length; i++) {
        const m = r.referral_milestones.milestones[i];
        if (m.minQualifiedReferrals < 1) {
          errors.push(`rules.referral_milestones.milestones[${i}].minQualifiedReferrals must be >= 1`);
        }
        if (m.bonusAmount < 0) {
          errors.push(`rules.referral_milestones.milestones[${i}].bonusAmount must be >= 0`);
        }
      }
      // Check milestones are sorted by minQualifiedReferrals ascending
      for (let i = 1; i < r.referral_milestones.milestones.length; i++) {
        if (r.referral_milestones.milestones[i].minQualifiedReferrals <= r.referral_milestones.milestones[i - 1].minQualifiedReferrals) {
          errors.push("rules.referral_milestones.milestones must be sorted by minQualifiedReferrals ascending");
          break;
        }
      }
    }
  }

  // captain_bonus
  if (r.captain_bonus) {
    if (r.captain_bonus.enabled) {
      if (r.captain_bonus.callAmount < 0) {
        errors.push("rules.captain_bonus.callAmount must be >= 0");
      }
      if (r.captain_bonus.tiers) {
        for (const tier of r.captain_bonus.tiers) {
          if (tier.minTeamCalls < 0) {
            errors.push(`rules.captain_bonus.tier "${tier.name}": minTeamCalls must be >= 0`);
          }
          if (tier.bonusAmount < 0) {
            errors.push(`rules.captain_bonus.tier "${tier.name}": bonusAmount must be >= 0`);
          }
        }
        // Check tiers are sorted by minTeamCalls ascending
        for (let i = 1; i < r.captain_bonus.tiers.length; i++) {
          if (r.captain_bonus.tiers[i].minTeamCalls <= r.captain_bonus.tiers[i - 1].minTeamCalls) {
            errors.push("rules.captain_bonus.tiers must be sorted by minTeamCalls ascending");
            break;
          }
        }
      }
    }
    if (r.captain_bonus.qualityBonus?.enabled) {
      if (r.captain_bonus.qualityBonus.amount < 0) {
        errors.push("rules.captain_bonus.qualityBonus.amount must be >= 0");
      }
      if (r.captain_bonus.qualityBonus.minActiveRecruits < 0) {
        errors.push("rules.captain_bonus.qualityBonus.minActiveRecruits must be >= 0");
      }
      if (r.captain_bonus.qualityBonus.minTeamCommissions < 0) {
        errors.push("rules.captain_bonus.qualityBonus.minTeamCommissions must be >= 0");
      }
    }
  }

  return errors;
}

function validateBonuses(b: Partial<CommissionPlanBonuses>): string[] {
  const errors: string[] = [];

  if (b.top3?.enabled) {
    if (b.top3.type === "cash") {
      if (!b.top3.cashAmounts || b.top3.cashAmounts.length !== 3) {
        errors.push("bonuses.top3.cashAmounts must have exactly 3 values");
      } else {
        for (let i = 0; i < 3; i++) {
          if (b.top3.cashAmounts[i] < 0) {
            errors.push(`bonuses.top3.cashAmounts[${i}] must be >= 0`);
          }
        }
      }
    }
    if (b.top3.type === "multiplier") {
      if (!b.top3.multipliers || b.top3.multipliers.length !== 3) {
        errors.push("bonuses.top3.multipliers must have exactly 3 values");
      } else {
        for (let i = 0; i < 3; i++) {
          if (b.top3.multipliers[i] < 1) {
            errors.push(`bonuses.top3.multipliers[${i}] must be >= 1`);
          }
        }
      }
    }
    if ((b.top3.minTotalEarned ?? 0) < 0) {
      errors.push("bonuses.top3.minTotalEarned must be >= 0");
    }
  }

  if (b.telegramBonus?.enabled) {
    if (b.telegramBonus.amount < 0) {
      errors.push("bonuses.telegramBonus.amount must be >= 0");
    }
    if (b.telegramBonus.unlockThreshold < 0) {
      errors.push("bonuses.telegramBonus.unlockThreshold must be >= 0");
    }
  }

  return errors;
}

function validateDiscount(d: Partial<CommissionPlanDiscount>): string[] {
  const errors: string[] = [];

  if (d.enabled) {
    if (d.type === "percentage") {
      if ((d.value ?? 0) < 0 || (d.value ?? 0) > 100) {
        errors.push("discount.value must be between 0 and 100 for percentage type");
      }
    }
    if (d.type === "fixed") {
      if ((d.value ?? 0) < 0) {
        errors.push("discount.value must be >= 0 for fixed type");
      }
    }
    if (d.maxDiscountCents !== undefined && d.maxDiscountCents < 0) {
      errors.push("discount.maxDiscountCents must be >= 0");
    }
    if (d.expiresAfterDays !== undefined && d.expiresAfterDays < 0) {
      errors.push("discount.expiresAfterDays must be >= 0");
    }
  }

  return errors;
}
