import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getStripe } from "./index";

interface CreateAccountData {
  email: string;
  currentCountry: string;
  firstName?: string;
  lastName?: string;
}

export const createLawyerStripeAccount = onCall<CreateAccountData>(
  {
    region: "europe-west1", // ✅ ADD THIS
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const data = request.data;
    const stripe = getStripe();

    if (!stripe) {
      throw new HttpsError("internal", "Stripe is not configured");
    }

    try {
      console.log("🚀 Creating Stripe account for user:", userId);

      // ==========================================
      // Create Stripe Express Account (no KYC yet)
      // ==========================================
      const account = await stripe.accounts.create({
        type: "express",
        country: data.currentCountry || "FR",
        email: data.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      console.log("✅ Stripe account created:", account.id);

      // ==========================================
      // Save to Firestore
      // ==========================================

      const stripeData = {
        stripeAccountId: account.id,
        kycStatus: "not_started",
        stripeOnboardingComplete: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // ✅ Save to BOTH collections
      await Promise.all([
        // Save to lawyers collection
        admin
          .firestore()
          .collection("lawyers")
          .doc(userId)
          .set(
            {
              ...stripeData,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          ),

        // ✅ ALSO save to users collection (so Dashboard can see it)
        admin
          .firestore()
          .collection("users")
          .doc(userId)
          .set(stripeData, { merge: true }),
      ]);

      console.log("✅ Saved to Firestore");

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
