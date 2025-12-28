import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getStripe } from "./index";

interface LawyerOnboardingData {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  phone: string;
  whatsapp: string;
  address: string;
  currentCountry: string;
  currentPresenceCountry: string;
  panNumber: string;
  panDocument?: string;
  bankAccountNumber: string;
  ifscCode: string;
  profilePhoto?: string;
  bio?: string;
  specialties?: string[];
  practiceCountries?: string[];
  yearsOfExperience?: number;
}

export const completeLawyerOnboarding = onCall<LawyerOnboardingData>(
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
      console.log("🚀 Starting lawyer onboarding for user:", userId);

      // ==========================================
      // STEP 1: Create Stripe Express Account
      // ==========================================
      console.log("📝 Creating Stripe Express Account...");

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
      // STEP 2: Create Account Onboarding Link
      // ==========================================
      console.log("🔗 Creating Stripe onboarding link...");

      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: "https://sos-expat.com/register/lawyer",
        return_url: "https://sos-expat.com/dashboard",
        type: "account_onboarding",
      });

      console.log("✅ Onboarding link created:", accountLink.url);

      // ==========================================
      // STEP 3: Save Data to Firestore
      // ==========================================
      console.log("💾 Updating Firestore...");

      const lawyerRef = admin.firestore().collection("lawyers").doc(userId);

      await lawyerRef.set(
        {
          // Stripe info
          stripeAccountId: account.id,
          stripeOnboardingLink: accountLink.url,
          stripeOnboardingComplete: false,
          kycStatus: "incomplete",

          // Personal info (from your form)
          firstName: data.firstName,
          lastName: data.lastName,
          fullName: `${data.firstName} ${data.lastName}`,
          email: data.email,
          dateOfBirth: data.dateOfBirth,
          phone: data.phone,
          whatsapp: data.whatsapp,

          // Address
          address: data.address,
          currentCountry: data.currentCountry,
          currentPresenceCountry: data.currentPresenceCountry,

          // Professional info
          profilePhoto: data.profilePhoto || null,
          bio: data.bio || null,
          specialties: data.specialties || [],
          practiceCountries: data.practiceCountries || [],
          yearsOfExperience: data.yearsOfExperience || 0,

          // Timestamps
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      console.log("✅ Firestore updated");

      // ==========================================
      // STEP 4: Return Onboarding URL
      // ==========================================
      return {
        success: true,
        accountId: account.id,
        onboardingUrl: accountLink.url,
        message: {
          en: "Almost there! Please complete your verification with Stripe to receive payments.",
          fr: "Presque terminé ! Veuillez compléter votre vérification avec Stripe pour recevoir des paiements.",
        },
      };
    } catch (error: any) {
      console.error("❌ Lawyer onboarding failed:", error);
      throw new HttpsError(
        "internal",
        error.message || "Onboarding failed. Please try again."
      );
    }
  }
);
