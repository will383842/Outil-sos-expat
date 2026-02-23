/**
 * Affiliate Trigger: onSubscriptionCreated
 *
 * Triggered when a new subscription document is created.
 * Handles:
 * - Check if the provider was referred by an affiliate
 * - Create subscription commission for the referrer
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
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
 * Trigger: onSubscriptionCreated
 *
 * Creates commission when a referred provider subscribes
 */
export const affiliateOnSubscriptionCreated = onDocumentCreated(
  {
    document: "subscriptions/{providerId}",
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.25,
    timeoutSeconds: 60,
  },
  async (event) => {
    ensureInitialized();

    const snapshot = event.data;
    if (!snapshot) {
      logger.warn("[affiliateOnSubscriptionCreated] No data in event");
      return;
    }

    const providerId = event.params.providerId;
    const subscriptionData = snapshot.data();

    // Only process active or trialing subscriptions
    const validStatuses = ["active", "trialing"];
    if (!validStatuses.includes(subscriptionData.status)) {
      logger.info("[affiliateOnSubscriptionCreated] Subscription not active", {
        providerId,
        status: subscriptionData.status,
      });
      return;
    }

    logger.info("[affiliateOnSubscriptionCreated] Processing new subscription", {
      providerId,
      planId: subscriptionData.planId,
      tier: subscriptionData.tier,
      status: subscriptionData.status,
      amount: subscriptionData.currentPeriodAmount,
    });

    const db = getFirestore();

    try {
      // 1. Check if affiliate system is active
      const systemActive = await isAffiliateSystemActive();
      if (!systemActive) {
        logger.info("[affiliateOnSubscriptionCreated] Affiliate system is inactive");
        return;
      }

      // 2. Get provider user to check if they were referred
      const providerDoc = await db.collection("users").doc(providerId).get();
      if (!providerDoc.exists) {
        logger.warn("[affiliateOnSubscriptionCreated] Provider not found", { providerId });
        return;
      }

      const providerData = providerDoc.data()!;
      const referredByUserId = providerData.referredByUserId;

      if (!referredByUserId) {
        logger.info("[affiliateOnSubscriptionCreated] Provider was not referred", {
          providerId,
        });
        return;
      }

      // 3. Get subscription amounts
      const subscriptionAmount = subscriptionData.currentPeriodAmount || 0;
      const billingPeriod = subscriptionData.billingPeriod || "monthly";
      const tier = subscriptionData.tier || "basic";
      const planId = subscriptionData.planId || "";

      // Skip if subscription has no amount
      if (!subscriptionAmount || subscriptionAmount <= 0) {
        logger.info("[affiliateOnSubscriptionCreated] Skipping - subscription has no amount", {
          providerId,
          amount: subscriptionAmount,
        });
        return;
      }

      // Calculate annual value for yearly subscriptions
      const annualValue = billingPeriod === "yearly"
        ? subscriptionAmount
        : subscriptionAmount * 12;

      // First month value for monthly subscriptions
      const firstMonth = billingPeriod === "monthly"
        ? subscriptionAmount
        : Math.round(subscriptionAmount / 12);

      // 4. Check if this is the provider's first subscription
      // Check both subscription_logs AND existing subscription commissions for robustness
      const [previousSubscriptionsQuery, existingSubCommissionQuery] = await Promise.all([
        db.collection("subscription_logs")
          .where("providerId", "==", providerId)
          .where("action", "==", "subscription_created")
          .limit(2)
          .get(),
        db.collection("affiliate_commissions")
          .where("refereeId", "==", providerId)
          .where("type", "==", "referral_subscription")
          .limit(1)
          .get(),
      ]);

      const isFirstSubscription = previousSubscriptionsQuery.empty && existingSubCommissionQuery.empty;

      // 5. Get provider type
      const sosProfileDoc = await db.collection("sos_profiles").doc(providerId).get();
      const providerType = sosProfileDoc.exists
        ? (sosProfileDoc.data()?.providerType as "lawyer" | "expat")
        : (providerData.role === "lawyer" ? "lawyer" : "expat");

      logger.info("[affiliateOnSubscriptionCreated] Subscription details", {
        providerId,
        referredByUserId,
        subscriptionAmount,
        annualValue,
        firstMonth,
        isFirstSubscription,
        billingPeriod,
        tier,
        providerType,
      });

      // 6. Create subscription commission
      const commissionResult = await createCommission({
        type: "referral_subscription",
        referrerId: referredByUserId,
        refereeId: providerId,
        source: {
          id: providerId,
          type: "subscription",
          details: {
            subscriptionId: providerId,
            planId,
            tier,
            billingPeriod,
            stripeSubscriptionId: subscriptionData.stripeSubscriptionId || null,
          },
        },
        amounts: {
          totalAmount: subscriptionAmount,
          firstMonth,
          annualValue,
        },
        context: {
          planType: tier,
          isFirstSubscription,
          providerType,
        },
        description: `Abonnement ${tier} de ${providerData.email} (${billingPeriod})`,
      });

      if (commissionResult.success) {
        logger.info("[affiliateOnSubscriptionCreated] Commission created", {
          commissionId: commissionResult.commissionId,
          amount: commissionResult.amount,
          providerId,
          referrerId: referredByUserId,
        });

        // 7. Update referral tracking
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
            updatedAt: Timestamp.now(),
          });
        }

        // 8. Update referrer stats
        await db.collection("users").doc(referredByUserId).update({
          "affiliateStats.byType.subscription.count": FieldValue.increment(1),
          "affiliateStats.byType.subscription.amount": FieldValue.increment(commissionResult.amount || 0),
          updatedAt: Timestamp.now(),
        });
      } else {
        logger.info("[affiliateOnSubscriptionCreated] Commission not created", {
          reason: commissionResult.reason || commissionResult.error,
          providerId,
        });
      }
    } catch (error) {
      logger.error("[affiliateOnSubscriptionCreated] Error processing subscription", {
        providerId,
        error,
      });
      throw error;
    }
  }
);
