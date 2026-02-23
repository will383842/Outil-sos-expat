/**
 * stripeAutomaticKyc.ts
 *
 * Gestion des comptes Stripe Connect Express pour les prestataires.
 *
 * MIGRATION CUSTOM → EXPRESS:
 * - Les comptes Express utilisent l'onboarding hébergé par Stripe
 * - Pas besoin de collecter les données KYC manuellement
 * - Stripe gère la vérification d'identité et les coordonnées bancaires
 *
 * Fonctions actives:
 * - createExpressAccount: Crée un compte Express
 * - checkKycStatus: Vérifie le statut du compte
 * - getOnboardingLink: Génère un lien d'onboarding Stripe
 *
 * Fonctions dépréciées (conservées pour compatibilité):
 * - createCustomAccount: Remplacé par createExpressAccount
 * - submitKycData: Plus nécessaire avec Express
 * - addBankAccount: Géré par l'onboarding Stripe
 */

import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getStripe } from "./index";

// ====== NOUVELLES FONCTIONS EXPRESS ======

interface CreateExpressAccountData {
  email: string;
  country?: string;
  userType?: "lawyer" | "expat";
}

/**
 * Crée un compte Stripe Connect Express
 * Remplace createCustomAccount
 */
export const createExpressAccount = onCall<CreateExpressAccountData>(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const { email, country, userType } = request.data;
    const stripe = getStripe();

    if (!stripe) {
      throw new HttpsError("internal", "Stripe is not configured");
    }

    try {
      console.log("🚀 Creating Stripe Express account for:", request.auth.uid);

      // Créer un compte Express (KYC géré par Stripe)
      const account = await stripe.accounts.create({
        type: "express",
        country: country || "FR",
        email: email,
        business_type: "individual",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          platform: "sos-expat",
          userId: request.auth.uid,
          userType: userType || "provider",
        },
      });

      console.log("✅ Stripe Express account created:", account.id);

      // Déterminer la collection
      const collection = userType === "expat" ? "expats" : "lawyers";

      // Sauvegarder dans Firestore
      const stripeData = {
        stripeAccountId: account.id,
        stripeAccountType: "express",
        kycStatus: "not_started",
        stripeOnboardingComplete: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await Promise.all([
        admin.firestore().collection(collection).doc(request.auth.uid).set(stripeData, { merge: true }),
        admin.firestore().collection("users").doc(request.auth.uid).set(stripeData, { merge: true }),
        admin.firestore().collection("sos_profiles").doc(request.auth.uid).set(stripeData, { merge: true }),
      ]);

      return {
        success: true,
        accountId: account.id,
        accountType: "express",
      };
    } catch (error: any) {
      console.error("❌ Error creating Express account:", error);
      throw new HttpsError("internal", error.message);
    }
  }
);

/**
 * Génère un lien d'onboarding Stripe pour compléter la vérification
 */
export const getOnboardingLink = onCall<{ accountId?: string }>(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const stripe = getStripe();
    if (!stripe) {
      throw new HttpsError("internal", "Stripe is not configured");
    }

    try {
      // Récupérer l'accountId depuis les données ou Firestore
      let accountId = request.data?.accountId;

      if (!accountId) {
        // Chercher dans users
        const userDoc = await admin.firestore().collection("users").doc(request.auth.uid).get();
        accountId = userDoc.data()?.stripeAccountId;
      }

      if (!accountId) {
        throw new HttpsError("not-found", "No Stripe account found for this user");
      }

      // Créer le lien d'onboarding
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: "https://sos-expat.com/dashboard/kyc?refresh=true",
        return_url: "https://sos-expat.com/dashboard/kyc?success=true",
        type: "account_onboarding",
      });

      console.log("✅ Onboarding link created for:", accountId);

      // Mettre à jour le statut
      await admin.firestore().collection("users").doc(request.auth.uid).update({
        kycStatus: "in_progress",
        lastOnboardingLinkAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        url: accountLink.url,
        expiresAt: accountLink.expires_at,
      };
    } catch (error: any) {
      console.error("❌ Error creating onboarding link:", error);
      throw new HttpsError("internal", error.message);
    }
  }
);

/**
 * Vérifie le statut KYC d'un compte Stripe
 * Fonctionne pour Express et Custom
 */
interface KycStatusData {
  accountId?: string;
}

export const checkKycStatus = onCall<KycStatusData>(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const stripe = getStripe();
    if (!stripe) {
      throw new HttpsError("internal", "Stripe is not configured");
    }

    try {
      // Récupérer l'accountId
      let accountId = request.data?.accountId;

      if (!accountId) {
        const userDoc = await admin.firestore().collection("users").doc(request.auth.uid).get();
        accountId = userDoc.data()?.stripeAccountId;
      }

      if (!accountId) {
        return {
          hasAccount: false,
          status: "no_account",
        };
      }

      const account = await stripe.accounts.retrieve(accountId);

      const status = {
        hasAccount: true,
        accountId: account.id,
        accountType: account.type,
        detailsSubmitted: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        currentlyDue: account.requirements?.currently_due || [],
        eventuallyDue: account.requirements?.eventually_due || [],
        pendingVerification: account.requirements?.pending_verification || [],
        disabledReason: account.requirements?.disabled_reason || null,
        status: account.charges_enabled && account.payouts_enabled
          ? "complete"
          : account.details_submitted
            ? "pending_verification"
            : "incomplete",
      };

      // Mettre à jour Firestore
      const updateData = {
        verificationStatus: status,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        stripeOnboardingComplete: account.details_submitted && account.charges_enabled,
        kycStatus: status.status === "complete"
          ? "completed"
          : status.status === "pending_verification"
            ? "pending"
            : "in_progress",
        lastKycCheck: admin.firestore.FieldValue.serverTimestamp(),
      };

      await Promise.all([
        admin.firestore().collection("users").doc(request.auth.uid).update(updateData),
        admin.firestore().collection("sos_profiles").doc(request.auth.uid).set(updateData, { merge: true }),
      ]);

      // Aussi mettre à jour la collection spécifique (lawyers ou expats)
      try {
        await admin.firestore().collection("lawyers").doc(request.auth.uid).update(updateData);
      } catch {
        try {
          await admin.firestore().collection("expats").doc(request.auth.uid).update(updateData);
        } catch {
          // Ignorer si aucune collection n'existe
        }
      }

      return status;
    } catch (error: any) {
      console.error("❌ Error checking KYC status:", error);
      throw new HttpsError("internal", error.message);
    }
  }
);

// ====== FONCTIONS DÉPRÉCIÉES (conservées pour compatibilité) ======

/**
 * @deprecated Utilisez createExpressAccount à la place
 * Cette fonction crée des comptes Custom qui nécessitent plus de travail de KYC
 */
export const createCustomAccount = onCall(
  { region: "europe-west1", cpu: 0.25 },
  async (request) => {
    console.warn("⚠️ createCustomAccount is deprecated. Use createExpressAccount instead.");

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const { email, country } = request.data;
    const stripe = getStripe();

    if (!stripe) {
      throw new HttpsError("internal", "Stripe is not configured");
    }

    try {
      // Créer un compte Express au lieu de Custom
      const account = await stripe.accounts.create({
        type: "express", // Changé de "custom" à "express"
        country: country || "FR",
        email: email,
        business_type: "individual",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          platform: "sos-expat",
          userId: request.auth.uid,
          migratedFromCustom: "true",
        },
      });

      await admin.firestore().collection("lawyers").doc(request.auth.uid).update({
        stripeAccountId: account.id,
        stripeAccountType: "express",
        kycStatus: "not_started",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { accountId: account.id, success: true };
    } catch (error: any) {
      console.error("Error creating account:", error);
      throw new HttpsError("internal", error.message);
    }
  }
);

/**
 * @deprecated Plus nécessaire avec les comptes Express
 * L'onboarding Express gère la collecte des données KYC
 */
interface KycData {
  accountId: string;
  firstName: string;
  lastName: string;
  email: string;
  dobDay: number;
  dobMonth: number;
  dobYear: number;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  panNumber: string;
}

export const submitKycData = onCall<KycData>(
  { region: "europe-west1" },
  async (request) => {
    console.warn("⚠️ submitKycData is deprecated. Express accounts use Stripe's hosted onboarding.");

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    // Retourner une instruction pour utiliser l'onboarding Express
    throw new HttpsError(
      "failed-precondition",
      "This function is deprecated. Please use getOnboardingLink to complete KYC via Stripe's hosted onboarding."
    );
  }
);

/**
 * @deprecated Plus nécessaire avec les comptes Express
 * L'onboarding Express gère l'ajout des coordonnées bancaires
 */
interface BankAccountData {
  accountId: string;
  accountNumber: string;
  ifscCode: string;
}

export const addBankAccount = onCall<BankAccountData>(
  { region: "europe-west1" },
  async (request) => {
    console.warn("⚠️ addBankAccount is deprecated. Express accounts use Stripe's hosted onboarding.");

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    // Retourner une instruction pour utiliser l'onboarding Express
    throw new HttpsError(
      "failed-precondition",
      "This function is deprecated. Please use getOnboardingLink to add bank account via Stripe's hosted onboarding."
    );
  }
);
