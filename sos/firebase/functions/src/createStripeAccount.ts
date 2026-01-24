/**
 * createStripeAccount.ts
 *
 * Creates a Stripe Connect Express account for providers (lawyers/expats).
 * This is the primary function used by StripeKyc.tsx on the frontend.
 *
 * Related files:
 * - checkStripeAccountStatus.ts: Checks KYC completion status
 * - stripeAutomaticKyc.ts: Additional KYC functions (onboarding links, etc.)
 * - getAccountSession.ts: Gets client secret for Stripe Connect embedded component
 *
 * Flow:
 * 1. Frontend calls createStripeAccount() to create the Stripe account
 * 2. Frontend uses getStripeAccountSession() to get the client secret
 * 3. Stripe Connect Onboarding component handles KYC collection
 * 4. checkStripeAccountStatus() verifies completion status
 *
 * @module createStripeAccount
 */
import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import Stripe from "stripe";
import { STRIPE_SUPPORTED_COUNTRIES, PAYPAL_ONLY_COUNTRIES } from "./lib/paymentCountries";
import {
  STRIPE_SECRET_KEY_TEST,
  STRIPE_SECRET_KEY_LIVE,
  getStripeSecretKey,
} from "./lib/secrets";

interface CreateAccountData {
  email: string;
  currentCountry: string;
  firstName?: string;
  lastName?: string;
  userType: "lawyer" | "expat";
}

/**
 * Vérifie si un pays supporte Stripe Connect
 */
function isStripeSupported(countryCode: string): boolean {
  return STRIPE_SUPPORTED_COUNTRIES.has(countryCode.toUpperCase());
}

/**
 * Vérifie si un pays est PayPal-only
 */
function isPayPalOnly(countryCode: string): boolean {
  return PAYPAL_ONLY_COUNTRIES.has(countryCode.toUpperCase());
}

// Helper to create Stripe instance using centralized secrets
function createStripeInstance(): { stripe: Stripe; mode: 'live' | 'test' } | null {
  const secretKey = getStripeSecretKey();
  const mode = secretKey?.startsWith('sk_live_') ? 'live' : 'test';

  if (!secretKey || !secretKey.startsWith("sk_")) {
    console.error("❌ Stripe secret key not configured or invalid");
    return null;
  }

  // P0 FIX: Log which mode is being used for debugging
  console.log(`🔑 Stripe initialized in ${mode.toUpperCase()} mode`);

  return {
    stripe: new Stripe(secretKey, {
      apiVersion: "2023-10-16" as Stripe.LatestApiVersion,
    }),
    mode,
  };
}

export const createStripeAccount = onCall<CreateAccountData>(
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
    const { email, currentCountry, userType } = request.data;
    const stripeInstance = createStripeInstance();

    if (!stripeInstance) {
      throw new HttpsError("internal", "Stripe is not configured - secret key missing or invalid");
    }

    const { stripe, mode: stripeMode } = stripeInstance;

    // ✅ Validate userType
    if (!userType || !["lawyer", "expat"].includes(userType)) {
      throw new HttpsError("invalid-argument", "userType must be 'lawyer' or 'expat'");
    }

    // ✅ P0 FIX: Block Stripe account creation for PayPal-only countries
    const countryCode = (currentCountry || "FR").toUpperCase();
    if (isPayPalOnly(countryCode) && !isStripeSupported(countryCode)) {
      console.warn(`⚠️ [createStripeAccount] Blocked: ${countryCode} is PayPal-only for user ${userId}`);
      throw new HttpsError(
        "failed-precondition",
        `Stripe is not available in ${countryCode}. Please use PayPal instead.`
      );
    }

    try {
      console.log(`🚀 Creating Stripe account for ${userType}:`, userId, `(country: ${countryCode})`);

      // Create Stripe Express Account
      // P0 FIX: Set business_type to "individual" since SOS Expat providers are individual professionals
      // This ensures the onboarding form shows the correct options and not enterprise/association only
      const account = await stripe.accounts.create({
        type: "express",
        country: currentCountry || "FR",
        email: email,
        business_type: "individual", // Individual/Particulier for lawyers and expat helpers
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      console.log(`✅ Stripe account created in ${stripeMode.toUpperCase()} mode:`, account.id);

      const stripeData = {
        stripeAccountId: account.id,
        stripeMode: stripeMode, // P0 FIX: Track if account is test or live
        kycStatus: "not_started",
        stripeOnboardingComplete: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        // ✅ P0 FIX: Set paymentGateway to stripe
        paymentGateway: "stripe" as const,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // ✅ Save to correct collection based on userType
      const collectionName = userType === "lawyer" ? "lawyers" : "expats";

      // ✅ P0 FIX: Use atomic batch write instead of Promise.all
      // This ensures all 3 collections are updated together (all or nothing)
      // Prevents data inconsistency if one write fails
      const batch = admin.firestore().batch();

      // Save to type-specific collection (lawyers/expats)
      const typeSpecificRef = admin.firestore().collection(collectionName).doc(userId);
      batch.set(typeSpecificRef, {
        ...stripeData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      // Save to users collection
      const usersRef = admin.firestore().collection("users").doc(userId);
      batch.set(usersRef, stripeData, { merge: true });

      // Save to sos_profiles collection
      const sosProfilesRef = admin.firestore().collection("sos_profiles").doc(userId);
      batch.set(sosProfilesRef, stripeData, { merge: true });

      // Commit all writes atomically
      await batch.commit();

      console.log(`✅ [ATOMIC] Saved stripeAccountId to ${collectionName}, users, and sos_profiles collections`);

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
