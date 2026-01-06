import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { getStripe } from "./index";

// ✅ Declare secrets for Firebase v2 functions
const STRIPE_SECRET_KEY_TEST = defineSecret("STRIPE_SECRET_KEY_TEST");
const STRIPE_SECRET_KEY_LIVE = defineSecret("STRIPE_SECRET_KEY_LIVE");

export const getStripeAccountSession = onCall<{ userType: "lawyer" | "expat" }>(
  {
    region: "europe-west1",
    // ✅ Secrets must be declared in function config
    secrets: [STRIPE_SECRET_KEY_TEST, STRIPE_SECRET_KEY_LIVE]
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const { userType } = request.data;
    const stripe = getStripe();

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
    } catch (error: any) {
      console.error("❌ Failed to create account session:", error);
      throw new HttpsError(
        "internal",
        error.message || "Failed to get session"
      );
    }
  }
);
