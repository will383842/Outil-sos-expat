/**
 * Callable: submitPartnerApplication
 *
 * PUBLIC callable (no auth required) for submitting a partner application.
 * Rate limited: 3 submissions per hour per IP hash.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import {
  type PartnerApplication,
  type SubmitPartnerApplicationInput,
} from "../types";
import {
  validateEmail,
  validateWebsiteUrl,
  validateLanguage,
  validateCategory,
  validateTrafficTier,
  sanitizeText,
} from "../utils/partnerValidation";
import { partnerConfig } from "../../lib/functionConfigs";

function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

export const submitPartnerApplication = onCall(
  {
    ...partnerConfig,
    timeoutSeconds: 30,
  },
  async (request): Promise<{ success: boolean; applicationId: string }> => {
    ensureInitialized();

    // No auth required — public endpoint
    const db = getFirestore();
    const input = request.data as SubmitPartnerApplicationInput;

    // 1. Rate limiting by IP hash (3 submissions/hour)
    const ipHash = request.rawRequest?.ip
      ? Buffer.from(request.rawRequest.ip).toString("base64").substring(0, 32)
      : null;

    if (ipHash) {
      const rateLimitRef = db.collection("rate_limits").doc(`partner_app_${ipHash}`);
      const rateLimitDoc = await rateLimitRef.get();

      if (rateLimitDoc.exists) {
        const data = rateLimitDoc.data();
        const lastReset = data?.lastReset?.toDate?.() || new Date(0);
        const now = new Date();
        const elapsed = now.getTime() - lastReset.getTime();

        if (elapsed < 3600000) {
          // Within 1-hour window
          if ((data?.count || 0) >= 3) {
            throw new HttpsError(
              "resource-exhausted",
              "Too many applications. Please try again later."
            );
          }
          await rateLimitRef.update({ count: FieldValue.increment(1) });
        } else {
          await rateLimitRef.set({ count: 1, lastReset: Timestamp.now() });
        }
      } else {
        await rateLimitRef.set({ count: 1, lastReset: Timestamp.now() });
      }
    }

    // 2. Validate input
    if (!input?.firstName?.trim() || input.firstName.trim().length < 2) {
      throw new HttpsError("invalid-argument", "First name is required (min 2 chars)");
    }
    if (!input?.lastName?.trim() || input.lastName.trim().length < 2) {
      throw new HttpsError("invalid-argument", "Last name is required (min 2 chars)");
    }
    if (!input?.email || !validateEmail(input.email)) {
      throw new HttpsError("invalid-argument", "Valid email is required");
    }
    if (!input?.websiteUrl || !validateWebsiteUrl(input.websiteUrl)) {
      throw new HttpsError("invalid-argument", "Valid website URL (https://) is required");
    }
    if (!input?.websiteName?.trim()) {
      throw new HttpsError("invalid-argument", "Website name is required");
    }
    if (!input?.websiteCategory || !validateCategory(input.websiteCategory)) {
      throw new HttpsError("invalid-argument", "Valid website category is required");
    }
    if (!input?.country || input.country.length !== 2) {
      throw new HttpsError("invalid-argument", "Valid 2-letter country code is required");
    }
    if (!input?.language || !validateLanguage(input.language)) {
      throw new HttpsError("invalid-argument", "Valid language is required");
    }
    if (input.websiteTraffic && !validateTrafficTier(input.websiteTraffic)) {
      throw new HttpsError("invalid-argument", "Invalid traffic tier");
    }
    if (input.phone) {
      const phoneDigits = input.phone.replace(/\D/g, "").length;
      if (phoneDigits < 8 || phoneDigits > 15) {
        throw new HttpsError("invalid-argument", "Phone number must be 8-15 digits");
      }
    }
    if (input.firstName.trim().length > 50 || input.lastName.trim().length > 50) {
      throw new HttpsError("invalid-argument", "Name must be less than 50 characters");
    }
    if (input.websiteName.trim().length > 100) {
      throw new HttpsError("invalid-argument", "Website name must be less than 100 characters");
    }
    if (input.websiteDescription && input.websiteDescription.length > 2000) {
      throw new HttpsError("invalid-argument", "Website description must be less than 2000 characters");
    }
    if (input.message && input.message.length > 2000) {
      throw new HttpsError("invalid-argument", "Message must be less than 2000 characters");
    }

    try {
      const normalizedEmail = input.email.toLowerCase().trim();
      const normalizedUrl = input.websiteUrl.toLowerCase().trim().replace(/\/+$/, "");

      // 3. Check for duplicate pending/contacted application
      const duplicateEmailSnap = await db
        .collection("partner_applications")
        .where("email", "==", normalizedEmail)
        .where("status", "in", ["pending", "contacted"])
        .limit(1)
        .get();

      if (!duplicateEmailSnap.empty) {
        throw new HttpsError(
          "already-exists",
          "An application with this email is already being reviewed"
        );
      }

      const duplicateUrlSnap = await db
        .collection("partner_applications")
        .where("websiteUrl", "==", normalizedUrl)
        .where("status", "in", ["pending", "contacted"])
        .limit(1)
        .get();

      if (!duplicateUrlSnap.empty) {
        throw new HttpsError(
          "already-exists",
          "An application with this website is already being reviewed"
        );
      }

      // 4. Create application
      const now = Timestamp.now();
      const appRef = db.collection("partner_applications").doc();
      const application: PartnerApplication = {
        id: appRef.id,
        status: "pending",

        firstName: sanitizeText(input.firstName.trim()),
        lastName: sanitizeText(input.lastName.trim()),
        email: normalizedEmail,
        phone: input.phone?.trim(),
        country: input.country.toUpperCase(),
        language: input.language,

        websiteUrl: normalizedUrl,
        websiteName: sanitizeText(input.websiteName.trim()),
        websiteCategory: input.websiteCategory,
        websiteTraffic: input.websiteTraffic,
        websiteDescription: input.websiteDescription
          ? sanitizeText(input.websiteDescription)
          : undefined,

        message: input.message ? sanitizeText(input.message) : undefined,

        ipHash: ipHash || undefined,
        userAgent: request.rawRequest?.headers?.["user-agent"]?.substring(0, 500),

        createdAt: now,
        updatedAt: now,
      };

      await appRef.set(application);

      // 5. Create admin notification
      const adminNotifRef = db.collection("admin_notifications").doc();
      await adminNotifRef.set({
        id: adminNotifRef.id,
        type: "partner_application",
        title: "New Partner Application",
        message: `${input.firstName} ${input.lastName} (${input.websiteName}) has applied to become a partner.`,
        data: {
          applicationId: appRef.id,
          email: normalizedEmail,
          websiteUrl: normalizedUrl,
          websiteName: input.websiteName.trim(),
          category: input.websiteCategory,
        },
        isRead: false,
        createdAt: now,
      });

      // 6. Also create in contact_messages for admin inbox visibility
      const contactRef = db.collection("contact_messages").doc();
      await contactRef.set({
        id: contactRef.id,
        name: `${input.firstName.trim()} ${input.lastName.trim()}`,
        firstName: sanitizeText(input.firstName.trim()),
        lastName: sanitizeText(input.lastName.trim()),
        email: normalizedEmail,
        phone: input.phone?.trim() || null,
        subject: `Candidature partenaire — ${input.websiteName.trim()}`,
        message: [
          `Entreprise/Site : ${input.websiteName.trim()}`,
          `URL : ${normalizedUrl}`,
          `Catégorie : ${input.websiteCategory}`,
          input.websiteTraffic ? `Trafic : ${input.websiteTraffic}` : null,
          input.websiteDescription ? `Description : ${input.websiteDescription}` : null,
          input.message ? `\nMessage :\n${input.message}` : null,
        ].filter(Boolean).join("\n"),
        category: "partner",
        type: "contact_message",
        source: "partner_application_form",
        status: "new",
        isRead: false,
        responded: false,
        priority: "high",
        adminNotified: false,
        adminTags: ["partner", "application"],
        createdAt: now,
        metadata: {
          partnerApplicationId: appRef.id,
          websiteName: input.websiteName.trim(),
          websiteUrl: normalizedUrl,
          websiteCategory: input.websiteCategory,
          country: input.country.toUpperCase(),
          language: input.language,
        },
      });

      logger.info("[submitPartnerApplication] Application submitted", {
        applicationId: appRef.id,
        email: normalizedEmail,
        websiteUrl: normalizedUrl,
      });

      return {
        success: true,
        applicationId: appRef.id,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;

      logger.error("[submitPartnerApplication] Error", { error });
      throw new HttpsError("internal", "Failed to submit application");
    }
  }
);
