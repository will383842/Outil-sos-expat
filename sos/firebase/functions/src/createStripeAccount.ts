import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { getStripe } from "./index";

// ✅ P0 FIX: Declare secrets for Firebase v2 functions
const STRIPE_SECRET_KEY_TEST = defineSecret("STRIPE_SECRET_KEY_TEST");
const STRIPE_SECRET_KEY_LIVE = defineSecret("STRIPE_SECRET_KEY_LIVE");

interface CreateAccountData {
  email: string;
  currentCountry: string;
  firstName?: string;
  lastName?: string;
  userType: "lawyer" | "expat";
}

export const createStripeAccount = onCall<CreateAccountData>(
  {
    region: "europe-west1",
    // ✅ P0 FIX: Secrets must be declared in function config
    secrets: [STRIPE_SECRET_KEY_TEST, STRIPE_SECRET_KEY_LIVE],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const { email, currentCountry, userType } = request.data;
    const stripe = getStripe();

    if (!stripe) {
      throw new HttpsError("internal", "Stripe is not configured");
    }

    // ✅ Validate userType
    if (!userType || !["lawyer", "expat"].includes(userType)) {
      throw new HttpsError("invalid-argument", "userType must be 'lawyer' or 'expat'");
    }

    try {
      console.log(`🚀 Creating Stripe account for ${userType}:`, userId);

      // Create Stripe Express Account
      const account = await stripe.accounts.create({
        type: "express",
        country: currentCountry || "FR",
        email: email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      console.log("✅ Stripe account created:", account.id);

      const stripeData = {
        stripeAccountId: account.id,
        kycStatus: "not_started",
        stripeOnboardingComplete: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // ✅ Save to correct collection based on userType
      const collectionName = userType === "lawyer" ? "lawyers" : "expats";

      await Promise.all([
        // Save to type-specific collection
        admin
          .firestore()
          .collection(collectionName)
          .doc(userId)
          .set(
            {
              ...stripeData,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          ),

        // Also save to users collection
        admin
          .firestore()
          .collection("users")
          .doc(userId)
          .set(stripeData, { merge: true }),

        // ✅ Also save to sos_profiles collection
        admin
          .firestore()
          .collection("sos_profiles")
          .doc(userId)
          .set(stripeData, { merge: true }),
      ]);

      console.log(`✅ Saved stripeAccountId to ${collectionName}, users, and sos_profiles collections`);

      return {
        success: true,
        accountId: account.id,
        message: "Stripe account created successfully",
      };
    } catch (error: any) {
      console.error("❌ Failed to create Stripe account:", error);
      throw new HttpsError(
        "internal",
        error.message || "Failed to create account"
      );
    }
  }
);
