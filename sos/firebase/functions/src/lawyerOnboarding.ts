import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getStripe } from "./index";
import { trackCAPILead, UserData } from "./metaConversionsApi";
import { STRIPE_API_SECRETS, META_CAPI_TOKEN } from "./lib/secrets";
import { notifyBacklinkEngineUserRegistered } from "./Webhooks/notifyBacklinkEngine";

void notifyBacklinkEngineUserRegistered; // Suppress TS unused warning - may be used in future

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
  {
    region: "europe-west1",
    secrets: [META_CAPI_TOKEN, ...STRIPE_API_SECRETS],
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
      console.log("🚀 Starting lawyer onboarding for user:", userId);

      // ==========================================
      // STEP 0: Check for existing Stripe account (idempotency)
      // ==========================================
      const existingProfile = await admin.firestore().collection("sos_profiles").doc(userId).get();
      const existingStripeId = existingProfile.data()?.stripeAccountId;

      if (existingStripeId) {
        console.log(`⚠️ Stripe account already exists: ${existingStripeId} — generating new onboarding link`);
        const accountLink = await stripe.accountLinks.create({
          account: existingStripeId,
          refresh_url: "https://sos-expat.com/register/lawyer",
          return_url: "https://sos-expat.com/dashboard",
          type: "account_onboarding",
        });
        return {
          success: true,
          accountId: existingStripeId,
          onboardingUrl: accountLink.url,
          message: {
            en: "Your Stripe account already exists. Please complete your verification.",
            fr: "Votre compte Stripe existe déjà. Veuillez compléter votre vérification.",
          },
        };
      }

      // ==========================================
      // STEP 1: Create Stripe Express Account
      // ==========================================
      console.log("📝 Creating Stripe Express Account...");

      // Parse date of birth if available (format: YYYY-MM-DD)
      let dob: { day: number; month: number; year: number } | undefined;
      if (data.dateOfBirth) {
        const [year, month, day] = data.dateOfBirth.split("-").map(Number);
        if (year && month && day) {
          dob = { day, month, year };
        }
      }

      // Normalize country code to uppercase for Stripe API
      const countryCode = (data.currentCountry || "FR").toUpperCase();

      const account = await stripe.accounts.create({
        type: "express",
        country: countryCode,
        email: data.email,
        business_type: "individual",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        // Pre-fill business profile to simplify onboarding
        business_profile: {
          url: "https://sos-expat.com",
          mcc: "8999", // Professional Services - covers lawyers and expat consultants
          product_description: "Services de conseil juridique et assistance aux expatriés via la plateforme SOS Expat",
        },
        // Pre-fill individual info from registration data (provider can still modify in Stripe form)
        individual: {
          email: data.email,
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone,
          ...(dob && { dob }),
          address: {
            country: countryCode,
            line1: data.address || undefined,
          },
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
      const sosProfileRef = admin.firestore().collection("sos_profiles").doc(userId);

      const onboardingData = {
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
        photoURL: data.profilePhoto || null,
        avatar: data.profilePhoto || null,
        bio: data.bio || null,
        specialties: data.specialties || [],
        practiceCountries: data.practiceCountries || [],
        yearsOfExperience: data.yearsOfExperience || 0,

        // Timestamps
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Write to BOTH lawyers (legacy) and sos_profiles (source of truth)
      await Promise.all([
        lawyerRef.set(onboardingData, { merge: true }),
        sosProfileRef.set(onboardingData, { merge: true }),
      ]);

      console.log("✅ Firestore updated (lawyers + sos_profiles)");

      // ==========================================
      // STEP 4: META CAPI TRACKING
      // ==========================================
      // Track Lead event for lawyer profile submission
      try {
        const userData: UserData = {
          external_id: userId,
          em: data.email?.toLowerCase().trim(),
          ph: data.phone?.replace(/[^0-9+]/g, ""),
          fn: data.firstName?.toLowerCase().trim(),
          ln: data.lastName?.toLowerCase().trim(),
          country: (data.currentCountry || data.currentPresenceCountry)?.toLowerCase().trim(),
        };

        const capiResult = await trackCAPILead({
          userData,
          contentName: "lawyer_onboarding",
          contentCategory: "lawyer",
          eventSourceUrl: "https://sos-expat.com/register/lawyer",
        });

        if (capiResult.success) {
          console.log(`✅ [CAPI Lawyer] Lead tracked for ${userId}`, {
            eventId: capiResult.eventId,
          });

          // Store CAPI tracking info in both collections
          const capiData = {
            "capiTracking.onboardingLeadEventId": capiResult.eventId,
            "capiTracking.onboardingTrackedAt": admin.firestore.FieldValue.serverTimestamp(),
          };
          await Promise.all([
            lawyerRef.update(capiData),
            sosProfileRef.update(capiData).catch(() => { /* sos_profiles may not exist yet */ }),
          ]);
        } else {
          console.warn(`⚠️ [CAPI Lawyer] Failed to track lead:`, capiResult.error);
        }
      } catch (capiError) {
        // Don't fail the onboarding if CAPI tracking fails
        console.error(`❌ [CAPI Lawyer] Error tracking lead:`, capiError);
      }

      // ==========================================
      // STEP 4.5: NOTIFY BACKLINK ENGINE
      // ==========================================
      // ✅ NOUVEAU : Stop prospecting campaigns for lawyers
      await notifyBacklinkEngineUserRegistered({
        email: data.email.toLowerCase(),
        userId,
        userType: "provider",
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        metadata: {
          country: data.currentCountry || data.currentPresenceCountry,
          role: "lawyer",
          source: "completeLawyerOnboarding",
        },
      }).catch((err) => {
        console.warn("Failed to notify Backlink Engine:", err);
      });

      // ==========================================
      // STEP 5: Return Onboarding URL
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
