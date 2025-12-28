import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { MailwizzAPI } from "../utils/mailwizz";
import { logGA4Event } from "../utils/analytics";
import { mapUserToMailWizzFields } from "../utils/fieldMapper";
import { getLanguageCode } from "../config";

/**
 * FUNCTION 1: Handle User Registration
 * Trigger: onCreate on users/{userId}
 * Creates subscriber in MailWizz and sends welcome email
 */
export const handleUserRegistration = onDocumentCreated(
  {
    document: "users/{userId}",
    region: "europe-west1",
  },
  async (event) => {
    const user = event.data?.data();
    const userId = event.params.userId;

    if (!user || !event.data) {
      console.warn(`⚠️ No user data for ${userId}`);
      return;
    }

    try {
      const mailwizz = new MailwizzAPI();

      // Map Firebase user to MailWizz fields
      const subscriberDataRaw = mapUserToMailWizzFields(user, userId);

      // Ensure all required fields are present (EMAIL is required by SubscriberData interface)
      if (!subscriberDataRaw.EMAIL) {
        console.warn(`⚠️ No email for user ${userId}, skipping MailWizz registration`);
        return;
      }

      // Ensure EMAIL field is present for SubscriberData type
      const subscriberData: { EMAIL: string; [key: string]: any } = {
        EMAIL: subscriberDataRaw.EMAIL,
        ...subscriberDataRaw,
      };

      // Create subscriber in MailWizz
      await mailwizz.createSubscriber(subscriberData);

      // Send welcome email based on role and language
      const lang = getLanguageCode(user.language || user.preferredLanguage || user.lang || "en");
      const welcomeTemplate =
        user.role === "client"
          ? `TR_CLI_welcome_${lang}`
          : `TR_PRO_welcome_${lang}`;

      try {
        await mailwizz.sendTransactional({
          to: subscriberData.EMAIL, // Use email for transactional
          template: welcomeTemplate,
          customFields: {
            FNAME: subscriberData.FNAME || "",
          },
        });
      } catch (emailError) {
        console.error(`❌ Error sending welcome email:`, emailError);
        // Don't fail the whole function if email fails
      }

      // Log GA4 event
      await logGA4Event("user_registered", {
        user_id: userId,
        role: user.role || "client",
        language: lang.toLowerCase(),
        country: subscriberData.COUNTRY || "",
      });

      console.log(`✅ User registered and synced to MailWizz: ${userId}`);
    } catch (error: any) {
      console.error(`❌ Error in handleUserRegistration for ${userId}:`, error);
      // Log error but don't throw - we don't want to break user registration
      await logGA4Event("user_registration_error", {
        user_id: userId,
        error: error.message || "Unknown error",
      });
    }
  }
);

