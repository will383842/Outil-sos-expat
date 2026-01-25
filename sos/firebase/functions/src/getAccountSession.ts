import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import Stripe from "stripe";
import {
  STRIPE_SECRET_KEY_TEST,
  STRIPE_SECRET_KEY_LIVE,
  getStripeSecretKey,
} from "./lib/secrets";

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
    const stripeInstance = createStripeInstance();

    if (!stripeInstance) {
      throw new HttpsError("internal", "Stripe is not configured");
    }

    const { stripe, mode: stripeMode } = stripeInstance;
    console.log(`🔗 Creating Account Session for ${userType} (${stripeMode.toUpperCase()} mode):`, userId);

    // ✅ Validate userType
    if (!userType || !["lawyer", "expat"].includes(userType)) {
      throw new HttpsError("invalid-argument", "userType must be 'lawyer' or 'expat'");
    }

    try {
      // ✅ Get from correct collection based on userType
      const collectionName = userType === "lawyer" ? "lawyers" : "expats";
      let userDoc = await admin
        .firestore()
        .collection(collectionName)
        .doc(userId)
        .get();

      // P0 FIX: Si le document n'existe pas dans lawyers/expats, vérifier dans sos_profiles/users
      // et créer le document manquant si nécessaire
      if (!userDoc.exists) {
        console.log(`[getAccountSession] Document not found in ${collectionName}/${userId}, checking sos_profiles...`);

        const sosProfileDoc = await admin
          .firestore()
          .collection("sos_profiles")
          .doc(userId)
          .get();

        if (sosProfileDoc.exists) {
          const sosData = sosProfileDoc.data();

          // Créer le document manquant dans lawyers/expats
          console.log(`[getAccountSession] Creating missing document in ${collectionName}/${userId} from sos_profiles`);

          await admin.firestore().collection(collectionName).doc(userId).set({
            id: userId,
            uid: userId,
            type: userType,
            email: sosData?.email || null,
            firstName: sosData?.firstName || '',
            lastName: sosData?.lastName || '',
            fullName: sosData?.fullName || sosData?.name || '',
            country: sosData?.country || sosData?.currentCountry || '',
            stripeAccountId: sosData?.stripeAccountId || null,
            stripeAccountStatus: sosData?.stripeAccountStatus || null,
            kycStatus: sosData?.kycStatus || 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });

          // Relire le document créé
          userDoc = await admin
            .firestore()
            .collection(collectionName)
            .doc(userId)
            .get();
        } else {
          // Vérifier dans users
          const usersDoc = await admin
            .firestore()
            .collection("users")
            .doc(userId)
            .get();

          if (!usersDoc.exists) {
            throw new HttpsError("not-found", `Profil prestataire introuvable. Veuillez vous reconnecter ou contacter le support.`);
          }

          const usersData = usersDoc.data();

          // Créer le document manquant
          console.log(`[getAccountSession] Creating missing document in ${collectionName}/${userId} from users`);

          await admin.firestore().collection(collectionName).doc(userId).set({
            id: userId,
            uid: userId,
            type: userType,
            email: usersData?.email || null,
            firstName: usersData?.firstName || '',
            lastName: usersData?.lastName || '',
            fullName: usersData?.fullName || `${usersData?.firstName || ''} ${usersData?.lastName || ''}`.trim(),
            country: usersData?.country || usersData?.currentCountry || '',
            stripeAccountId: usersData?.stripeAccountId || null,
            stripeAccountStatus: usersData?.stripeAccountStatus || null,
            kycStatus: usersData?.kycStatus || 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });

          // Relire le document créé
          userDoc = await admin
            .firestore()
            .collection(collectionName)
            .doc(userId)
            .get();
        }
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

      // P0 FIX: Validate that client_secret exists before returning
      if (!accountSession || !accountSession.client_secret) {
        console.error("❌ Stripe session created but no client_secret returned");
        throw new HttpsError(
          "internal",
          "Failed to create Stripe session: no client secret returned"
        );
      }

      // P0 FIX: Also validate accountId format
      if (typeof accountId !== 'string' || !accountId.startsWith('acct_')) {
        console.error("❌ Invalid Stripe account ID format:", accountId);
        throw new HttpsError(
          "internal",
          "Invalid Stripe account ID format"
        );
      }

      console.log("✅ Account Session created with valid client_secret");

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
