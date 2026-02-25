/**
 * Affiliate Trigger: onSubscriptionRenewed
 *
 * Triggered when a subscription document is updated.
 * Detects renewals by checking for period changes.
 * Handles:
 * - Detect subscription renewal (currentPeriodStart changed)
 * - Check if the provider was referred by an affiliate
 * - Create renewal commission for the referrer
 * - Track renewal month for maxMonths limit
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { isAffiliateSystemActive } from "../utils/configService";
import { createCommission } from "../services/commissionService";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

/**
 * Helper to convert Firestore Timestamp to Date
 */
function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "object" && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === "object" && "_seconds" in value) {
    const ts = value as { _seconds: number; _nanoseconds?: number };
    return new Date(ts._seconds * 1000);
  }
  return null;
}

/**
 * Calculate the renewal month number based on subscription creation
 * AUDIT-FIX M3: Use calendar month difference instead of dividing by 30 days
 * This correctly handles months of different lengths (28, 29, 30, 31 days)
 */
function calculateRenewalMonth(
  createdAt: Date | null,
  currentPeriodStart: Date | null
): number {
  if (!createdAt || !currentPeriodStart) return 1;

  // Calendar month difference: (year diff * 12) + month diff
  const yearDiff = currentPeriodStart.getFullYear() - createdAt.getFullYear();
  const monthDiff = currentPeriodStart.getMonth() - createdAt.getMonth();
  const calendarMonths = yearDiff * 12 + monthDiff;

  // If the day of the period start is before the creation day,
  // we haven't completed the full calendar month yet
  const adjustedMonths = currentPeriodStart.getDate() < createdAt.getDate()
    ? calendarMonths - 1
    : calendarMonths;

  return Math.max(1, adjustedMonths + 1);
}

/**
 * Trigger: onSubscriptionRenewed
 *
 * Creates commission when a referred provider's subscription renews
 */
export const affiliateOnSubscriptionRenewed = onDocumentUpdated(
  {
    document: "subscriptions/{providerId}",
    region: "europe-west3",
    memory: "128MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
  },
  async (event) => {
    ensureInitialized();

    const before = event.data?.before?.data();
    const after = event.data?.after?.data();

    if (!before || !after) {
      logger.warn("[affiliateOnSubscriptionRenewed] Missing data in event");
      return;
    }

    const providerId = event.params.providerId;

    // 1. Detect renewal: currentPeriodStart changed AND subscription is active
    const beforePeriodStart = toDate(before.currentPeriodStart);
    const afterPeriodStart = toDate(after.currentPeriodStart);

    // No period change = not a renewal
    if (!beforePeriodStart || !afterPeriodStart) {
      return;
    }

    // Check if period actually changed
    const periodChanged = beforePeriodStart.getTime() !== afterPeriodStart.getTime();
    if (!periodChanged) {
      return;
    }

    // Only process if subscription is active (renewal = successful payment)
    if (after.status !== "active") {
      logger.info("[affiliateOnSubscriptionRenewed] Subscription not active after update", {
        providerId,
        status: after.status,
      });
      return;
    }

    // Make sure the new period is after the old period (forward renewal, not correction)
    if (afterPeriodStart.getTime() <= beforePeriodStart.getTime()) {
      logger.info("[affiliateOnSubscriptionRenewed] Period not advancing", {
        providerId,
        beforePeriodStart: beforePeriodStart.toISOString(),
        afterPeriodStart: afterPeriodStart.toISOString(),
      });
      return;
    }

    logger.info("[affiliateOnSubscriptionRenewed] Processing subscription renewal", {
      providerId,
      planId: after.planId,
      tier: after.tier,
      beforePeriodStart: beforePeriodStart.toISOString(),
      afterPeriodStart: afterPeriodStart.toISOString(),
      amount: after.currentPeriodAmount,
    });

    const db = getFirestore();

    try {
      // 2. Check if affiliate system is active
      const systemActive = await isAffiliateSystemActive();
      if (!systemActive) {
        logger.info("[affiliateOnSubscriptionRenewed] Affiliate system is inactive");
        return;
      }

      // 3. Get provider user to check if they were referred
      const providerDoc = await db.collection("users").doc(providerId).get();
      if (!providerDoc.exists) {
        logger.warn("[affiliateOnSubscriptionRenewed] Provider not found", { providerId });
        return;
      }

      const providerData = providerDoc.data()!;
      const referredByUserId = providerData.referredByUserId;

      if (!referredByUserId) {
        logger.info("[affiliateOnSubscriptionRenewed] Provider was not referred", {
          providerId,
        });
        return;
      }

      // 4. Get subscription amounts
      const subscriptionAmount = after.currentPeriodAmount || 0;
      const billingPeriod = after.billingPeriod || "monthly";
      const tier = after.tier || "basic";
      const planId = after.planId || "";

      // Calculate values
      const annualValue = billingPeriod === "yearly"
        ? subscriptionAmount
        : subscriptionAmount * 12;

      const firstMonth = billingPeriod === "monthly"
        ? subscriptionAmount
        : Math.round(subscriptionAmount / 12);

      // 5. Calculate renewal month
      const createdAt = toDate(after.createdAt);
      const renewalMonth = calculateRenewalMonth(createdAt, afterPeriodStart);

      // 6. Get provider type
      const sosProfileDoc = await db.collection("sos_profiles").doc(providerId).get();
      const providerType = sosProfileDoc.exists
        ? (sosProfileDoc.data()?.providerType as "lawyer" | "expat")
        : (providerData.role === "lawyer" ? "lawyer" : "expat");

      // 7. Count previous renewal commissions for this subscription
      const previousRenewalsQuery = await db
        .collection("affiliate_commissions")
        .where("referrerId", "==", referredByUserId)
        .where("refereeId", "==", providerId)
        .where("type", "==", "referral_subscription_renewal")
        .get();

      const previousRenewals = previousRenewalsQuery.size;

      // 8. Check for duplicate: don't create commission for same period
      const duplicateQuery = await db
        .collection("affiliate_commissions")
        .where("referrerId", "==", referredByUserId)
        .where("refereeId", "==", providerId)
        .where("type", "==", "referral_subscription_renewal")
        .where("sourceId", "==", `${providerId}_${afterPeriodStart.getTime()}`)
        .limit(1)
        .get();

      if (!duplicateQuery.empty) {
        logger.info("[affiliateOnSubscriptionRenewed] Duplicate renewal commission prevented", {
          providerId,
          periodStart: afterPeriodStart.toISOString(),
        });
        return;
      }

      logger.info("[affiliateOnSubscriptionRenewed] Renewal details", {
        providerId,
        referredByUserId,
        subscriptionAmount,
        renewalMonth,
        previousRenewals,
        billingPeriod,
        tier,
        providerType,
      });

      // 9. Create renewal commission
      const commissionResult = await createCommission({
        type: "referral_subscription_renewal",
        referrerId: referredByUserId,
        refereeId: providerId,
        source: {
          id: `${providerId}_${afterPeriodStart.getTime()}`, // Unique per period
          type: "subscription",
          details: {
            subscriptionId: providerId,
            planId,
            tier,
            billingPeriod,
            renewalMonth,
            periodStart: afterPeriodStart.toISOString(),
            stripeSubscriptionId: after.stripeSubscriptionId || null,
          },
        },
        amounts: {
          totalAmount: subscriptionAmount,
          firstMonth,
          annualValue,
        },
        context: {
          planType: tier,
          isFirstSubscription: false,
          renewalMonth,
          providerType,
          lifetimeCommissions: previousRenewals,
        },
        description: `Renouvellement ${tier} de ${providerData.email} (mois ${renewalMonth})`,
      });

      if (commissionResult.success) {
        logger.info("[affiliateOnSubscriptionRenewed] Commission created", {
          commissionId: commissionResult.commissionId,
          amount: commissionResult.amount,
          providerId,
          referrerId: referredByUserId,
          renewalMonth,
        });

        // 10. Update referral tracking
        const referralQuery = await db
          .collection("referrals")
          .where("referrerId", "==", referredByUserId)
          .where("refereeId", "==", providerId)
          .limit(1)
          .get();

        if (!referralQuery.empty) {
          await referralQuery.docs[0].ref.update({
            totalCommissions: FieldValue.increment(commissionResult.amount || 0),
            lastCommissionAt: Timestamp.now(),
            renewalCount: FieldValue.increment(1),
            updatedAt: Timestamp.now(),
          });
        }

        // 11. Update referrer stats
        await db.collection("users").doc(referredByUserId).update({
          "affiliateStats.byType.renewal.count": FieldValue.increment(1),
          "affiliateStats.byType.renewal.amount": FieldValue.increment(commissionResult.amount || 0),
          updatedAt: Timestamp.now(),
        });
      } else {
        logger.info("[affiliateOnSubscriptionRenewed] Commission not created", {
          reason: commissionResult.reason || commissionResult.error,
          providerId,
          renewalMonth,
        });
      }
    } catch (error) {
      logger.error("[affiliateOnSubscriptionRenewed] Error processing renewal", {
        providerId,
        error,
      });
      throw error;
    }
  }
);
