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

export const getStripeAccountSession = onCall<{ userType: "lawyer" | "expat" }>(
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

    console.log(`🔗 Creating Account Session for ${userType}:`, userId);

    if (!stripe) {
      throw new HttpsError("internal", "Stripe is not configured");
    }

    // ✅ Validate userType
    if (!userType || !["lawyer", "expat"].includes(userType)) {
      throw new HttpsError("invalid-argument", "userType must be 'lawyer' or 'expat'");
    }

    try {
      // ✅ Get from correct collection based on userType
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
      const accountId = userData?.stripeAccountId;

      if (!accountId) {
        throw new HttpsError("failed-precondition", "No Stripe account found");
      }

      console.log(`🔗 Creating Account Session for ${userType}:`, accountId);

      const accountSession = await stripe.accountSessions.create({
        account: accountId,
        components: {
          account_onboarding: {
            enabled: true,
            features: {
              external_account_collection: true,
            },
          },
          payments: { enabled: true },
          payouts: { enabled: true },
        },
      });

      console.log("✅ Account Session created");

      return {
        success: true,
        accountId: accountId,
        clientSecret: accountSession.client_secret,
      };
    } catch (error: unknown) {
      console.error("❌ Failed to create account session:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // ✅ P0 FIX: Detect invalid/revoked Stripe accounts
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
          await admin.firestore().collection(collectionName).doc(userId).update({
            stripeAccountId: admin.firestore.FieldValue.delete(),
            kycStatus: "not_started",
            stripeOnboardingComplete: false,
            chargesEnabled: false,
            payoutsEnabled: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          await admin.firestore().collection("users").doc(userId).update({
            stripeAccountId: admin.firestore.FieldValue.delete(),
            kycStatus: "not_started",
            stripeOnboardingComplete: false,
            chargesEnabled: false,
            payoutsEnabled: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log(`✅ Cleaned up stale Stripe account data for ${userId}`);
        } catch (cleanupError) {
          console.error("Failed to cleanup stale data:", cleanupError);
        }

        throw new HttpsError(
          "failed-precondition",
          "Stripe account invalid or revoked. Please create a new account."
        );
      }

      throw new HttpsError(
        "internal",
        errorMessage || "Failed to get session"
      );
    }
  }
);
