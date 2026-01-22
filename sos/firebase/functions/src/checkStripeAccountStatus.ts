/**
 * checkStripeAccountStatus.ts
 *
 * Checks the KYC completion status of a provider's Stripe Connect account.
 * Called by StripeKyc.tsx to verify if onboarding is complete.
 *
 * Related files:
 * - createStripeAccount.ts: Creates the Stripe account
 * - stripeAutomaticKyc.ts: Additional KYC functions (onboarding links, etc.)
 * - getAccountSession.ts: Gets client secret for Stripe Connect embedded component
 *
 * Features:
 * - Retrieves account status from Stripe API
 * - Updates Firestore with KYC status (atomic batch writes)
 * - Detects and cleans up invalid/revoked accounts
 * - Returns requirements currently/eventually due
 *
 * @module checkStripeAccountStatus
 */
import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import Stripe from "stripe";
import {
  STRIPE_SECRET_KEY_TEST,
  STRIPE_SECRET_KEY_LIVE,
  getStripeSecretKey,
} from "./lib/secrets";

// Helper to create Stripe instance using centralized secrets
function createStripeInstance(): Stripe | null {
  const secretKey = getStripeSecretKey();

  if (!secretKey || !secretKey.startsWith("sk_")) {
    console.error("❌ Stripe secret key not configured or invalid");
    return null;
  }

  return new Stripe(secretKey, {
    apiVersion: "2023-10-16" as Stripe.LatestApiVersion,
  });
}

export const checkStripeAccountStatus = onCall<{
  userType: "lawyer" | "expat";
}>(
  {
    region: "europe-west1",
    // ✅ P0 FIX: Use centralized secrets from lib/secrets.ts
    secrets: [STRIPE_SECRET_KEY_TEST, STRIPE_SECRET_KEY_LIVE],
  },
  async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const userId = request.auth.uid;
  const { userType } = request.data;
  const stripe = createStripeInstance();

  if (!stripe) {
    throw new HttpsError("internal", "Stripe not configured");
  }

  // ✅ Validate userType
  if (!userType || !["lawyer", "expat"].includes(userType)) {
    throw new HttpsError(
      "invalid-argument",
      "userType must be 'lawyer' or 'expat'"
    );
  }

  try {
    // ✅ Get from correct collection
    const collectionName = userType === "lawyer" ? "lawyers" : "expats";
    const userDoc = await admin
      .firestore()
      .collection(collectionName)
      .doc(userId)
      .get();

    if (!userDoc.exists) {
      throw new HttpsError("not-found", `${userType} profile not found`);
    }

    const userData = userDoc.data();
    const accountId = userData?.stripeAccountId as string | undefined;

    if (!accountId) {
      throw new HttpsError("failed-precondition", "No Stripe account found");
    }

    console.log(`🔍 Checking Stripe account for ${userType}:`, accountId);

    const account = await stripe.accounts.retrieve(accountId);

    const currentlyDue = account.requirements?.currently_due || [];
    const eventuallyDue = account.requirements?.eventually_due || [];
    const pastDue = account.requirements?.past_due || [];

    const isComplete =
      account.details_submitted === true &&
      account.charges_enabled === true &&
      currentlyDue.length === 0;

    console.log("📊 Account Status:", {
      userType,
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      isComplete,
    });

    // ✅ Update both collections
    const updateData = {
      stripeAccountStatus: {
        detailsSubmitted: account.details_submitted || false,
        chargesEnabled: account.charges_enabled || false,
        payoutsEnabled: account.payouts_enabled || false,
        requirementsCurrentlyDue: currentlyDue,
        requirementsEventuallyDue: eventuallyDue,
        requirementsPastDue: pastDue,
        disabledReason: account.requirements?.disabled_reason || null,
        lastChecked: admin.firestore.FieldValue.serverTimestamp(),
      },
      kycCompleted: isComplete,
      kycCompletedAt: isComplete
        ? admin.firestore.FieldValue.serverTimestamp()
        : null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // P0 FIX: ALWAYS update users collection (for Dashboard) - not just when complete
    // This ensures the Dashboard always has the latest KYC status
    const kycStatus = isComplete ? "completed" :
                      account.details_submitted ? "in_progress" : "not_started";

    // ✅ P0 FIX: Use atomic batch write for all updates
    // This ensures data consistency across all 3 collections
    const batch = admin.firestore().batch();

    // Update type-specific collection (lawyers/expats)
    const typeSpecificRef = admin.firestore().collection(collectionName).doc(userId);
    batch.update(typeSpecificRef, updateData);

    // Update users collection
    const usersRef = admin.firestore().collection("users").doc(userId);
    batch.update(usersRef, {
      kycCompleted: isComplete,
      kycStatus: kycStatus,
      stripeOnboardingComplete: isComplete,
      chargesEnabled: account.charges_enabled || false,
      payoutsEnabled: account.payouts_enabled || false,
      // P0 FIX: Also store intermediate status for Dashboard visibility
      stripeAccountStatus: {
        detailsSubmitted: account.details_submitted || false,
        chargesEnabled: account.charges_enabled || false,
        payoutsEnabled: account.payouts_enabled || false,
        requirementsCurrentlyDue: currentlyDue,
        lastChecked: admin.firestore.FieldValue.serverTimestamp(),
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update sos_profiles collection when KYC is complete
    if (isComplete) {
      const sosProfileRef = admin.firestore().collection("sos_profiles").doc(userId);
      // Use set with merge to handle both existing and non-existing docs
      batch.set(sosProfileRef, {
        stripeAccountId: accountId,
        isApproved: true,
        isVisible: true,
        kycCompleted: true,
        kycCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
        chargesEnabled: account.charges_enabled || false,
        payoutsEnabled: account.payouts_enabled || false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    // Commit all updates atomically
    await batch.commit();
    console.log(`✅ [ATOMIC] Updated KYC status for ${userType} (${isComplete ? "complete" : "incomplete"})`);

    console.log(isComplete ? "✅ KYC Complete" : "⏳ KYC Incomplete");

    return {
      accountId: account.id,
      detailsSubmitted: account.details_submitted || false,
      chargesEnabled: account.charges_enabled || false,
      payoutsEnabled: account.payouts_enabled || false,
      requirementsCurrentlyDue: currentlyDue,
      requirementsEventuallyDue: eventuallyDue,
      kycCompleted: isComplete,
    };
  } catch (error: unknown) {
    console.error("❌ Error checking account status:", error);

    if (error instanceof HttpsError) {
      throw error;
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // ✅ P0 FIX: Detect invalid/revoked Stripe accounts and return specific error
    // This allows the frontend to show the "Create new account" button
    if (
      errorMessage.includes("does not have access to account") ||
      errorMessage.includes("No such account") ||
      errorMessage.includes("account has been deleted") ||
      errorMessage.includes("account_invalid") ||
      (error as { code?: string })?.code === "account_invalid"
    ) {
      console.warn(`⚠️ Stripe account invalid/revoked for user ${userId}. Cleaning up stale data.`);

      // Clean up the stale stripeAccountId from Firestore
      const collectionName = userType === "lawyer" ? "lawyers" : "expats";
      try {
        // ✅ P0 FIX: Use atomic batch for cleanup to ensure consistency
        const cleanupBatch = admin.firestore().batch();
        const cleanupData = {
          stripeAccountId: admin.firestore.FieldValue.delete(),
          kycStatus: "not_started",
          stripeOnboardingComplete: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const typeSpecificRef = admin.firestore().collection(collectionName).doc(userId);
        cleanupBatch.update(typeSpecificRef, cleanupData);

        const usersRef = admin.firestore().collection("users").doc(userId);
        cleanupBatch.update(usersRef, cleanupData);

        await cleanupBatch.commit();
        console.log(`✅ [ATOMIC] Cleaned up stale Stripe account data for ${userId}`);
      } catch (cleanupError) {
        console.error("Failed to cleanup stale data:", cleanupError);
      }

      // Return specific error that frontend can detect
      throw new HttpsError(
        "failed-precondition",
        "Stripe account invalid or revoked. Please create a new account."
      );
    }

    throw new HttpsError("internal", `Failed to check status: ${errorMessage}`);
  }
});
