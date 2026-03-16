/**
 * Shared Milestone Service
 *
 * Checks and pays recruitment milestone bonuses for ALL affiliate roles.
 * Milestones: 5=$15, 10=$35, 20=$75, 50=$250, 100=$600, 500=$4,000
 *
 * Used by: chatter, influencer, blogger, groupAdmin, generic affiliate
 */

import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";

// ============================================================================
// TYPES
// ============================================================================

export interface MilestoneConfig {
  recruits: number;
  bonus: number; // cents
}

export interface MilestoneContext {
  /** The affiliate's UID */
  affiliateId: string;
  /** The affiliate role (for logging and collection routing) */
  role: "chatter" | "influencer" | "blogger" | "groupAdmin" | "affiliate";
  /** Firestore collection where the affiliate doc lives */
  collection: string;
  /** Firestore collection where commissions are stored */
  commissionCollection: string;
  /** Current number of active recruits */
  totalRecruits: number;
  /** Array of milestone indices already paid */
  tierBonusesPaid: number[];
  /** Milestone config (from role config or defaults) */
  milestones: MilestoneConfig[];
  /** Commission type name for the bonus */
  commissionType: string;
}

// ============================================================================
// DEFAULT MILESTONES (same for all roles)
// ============================================================================

export const DEFAULT_MILESTONES: MilestoneConfig[] = [
  { recruits: 5, bonus: 1500 },     // $15
  { recruits: 10, bonus: 3500 },    // $35
  { recruits: 20, bonus: 7500 },    // $75
  { recruits: 50, bonus: 25000 },   // $250
  { recruits: 100, bonus: 60000 },  // $600
  { recruits: 500, bonus: 400000 }, // $4,000
];

// ============================================================================
// CHECK AND PAY MILESTONES
// ============================================================================

/**
 * Check if the affiliate has reached any new recruitment milestones
 * and pay the corresponding bonuses.
 *
 * @returns Array of milestones that were newly paid
 */
export async function checkAndPayRecruitmentMilestones(
  ctx: MilestoneContext
): Promise<Array<{ recruits: number; bonus: number; commissionId: string }>> {
  const db = getFirestore();
  const paidMilestones: Array<{ recruits: number; bonus: number; commissionId: string }> = [];

  for (let i = 0; i < ctx.milestones.length; i++) {
    const milestone = ctx.milestones[i];

    // Skip if already paid or not yet reached
    if (ctx.tierBonusesPaid.includes(i)) continue;
    if (ctx.totalRecruits < milestone.recruits) continue;

    // Pay this milestone
    try {
      const commissionRef = db.collection(ctx.commissionCollection).doc();
      const now = Timestamp.now();

      await commissionRef.set({
        id: commissionRef.id,
        [`${ctx.role}Id`]: ctx.affiliateId,
        type: ctx.commissionType,
        amount: milestone.bonus,
        status: "pending",
        source: {
          id: null,
          type: "milestone",
          details: {
            milestoneIndex: i,
            recruitsRequired: milestone.recruits,
            totalRecruits: ctx.totalRecruits,
          },
        },
        description: `Milestone bonus: ${milestone.recruits} recrues → $${milestone.bonus / 100}`,
        createdAt: now,
      });

      // Update affiliate doc: add to tierBonusesPaid + increment pending balance
      // Commission will be validated then released by scheduled functions
      await db.collection(ctx.collection).doc(ctx.affiliateId).update({
        tierBonusesPaid: FieldValue.arrayUnion(i),
        pendingBalance: FieldValue.increment(milestone.bonus),
        totalCommissions: FieldValue.increment(1),
      });

      paidMilestones.push({
        recruits: milestone.recruits,
        bonus: milestone.bonus,
        commissionId: commissionRef.id,
      });

      logger.info(`[milestoneService] Milestone paid`, {
        role: ctx.role,
        affiliateId: ctx.affiliateId,
        recruits: milestone.recruits,
        bonus: milestone.bonus,
        commissionId: commissionRef.id,
      });
    } catch (error) {
      logger.error(`[milestoneService] Failed to pay milestone`, {
        role: ctx.role,
        affiliateId: ctx.affiliateId,
        milestoneIndex: i,
        error,
      });
    }
  }

  return paidMilestones;
}

/**
 * Get the next unpaid milestone for display in dashboards
 */
export function getNextMilestone(
  totalRecruits: number,
  tierBonusesPaid: number[],
  milestones: MilestoneConfig[]
): { recruits: number; bonus: number; progress: number } | null {
  for (let i = 0; i < milestones.length; i++) {
    if (tierBonusesPaid.includes(i)) continue;
    return {
      recruits: milestones[i].recruits,
      bonus: milestones[i].bonus,
      progress: Math.min(1, totalRecruits / milestones[i].recruits),
    };
  }
  return null; // All milestones completed
}
