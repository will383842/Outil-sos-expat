/**
 * Trigger: onProviderRegistered
 *
 * Fires when a new provider (lawyer/expat) is created.
 * - Checks if they were recruited via chatter recruitment link
 * - Links the provider to the recruiting chatter
 * - Commission will be created when provider receives first call
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { findChatterByRecruitmentCode } from "../utils";
import { Chatter, ChatterNotification } from "../types";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

interface UserDocument {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  referredByChatter?: string;
  providerRecruitedByChatter?: string;
  providerRecruitedByChatterId?: string;
  createdAt: Timestamp;
}

export async function handleChatterProviderRegistered(event: any) {
    ensureInitialized();

    const snapshot = event.data;
    if (!snapshot) {
      return;
    }

    const userId = event.params.userId;
    const userData = snapshot.data() as UserDocument;

    // Only process lawyers and expats (providers)
    if (userData.role !== "lawyer" && userData.role !== "expat") {
      return;
    }

    // Check if there's a recruitment code associated
    if (!userData.providerRecruitedByChatter) {
      return;
    }

    const recruitmentCode = userData.providerRecruitedByChatter;

    logger.info("[chatterOnProviderRegistered] Processing recruited provider", {
      userId,
      email: userData.email,
      role: userData.role,
      recruitmentCode,
    });

    const db = getFirestore();

    try {
      // Find the recruiting chatter
      const chatterSnapshot = await findChatterByRecruitmentCode(recruitmentCode);

      if (!chatterSnapshot) {
        logger.warn("[chatterOnProviderRegistered] Chatter not found for code", {
          recruitmentCode,
        });
        return;
      }

      const chatterId = chatterSnapshot.id;
      const chatter = chatterSnapshot.data() as Chatter;

      // Update user document with chatter ID
      await db.collection("users").doc(userId).update({
        providerRecruitedByChatterId: chatterId,
        providerFirstCallReceived: false,
      });

      // Update or create recruitment link tracking
      const linkQuery = await db
        .collection("chatter_recruitment_links")
        .where("chatterId", "==", chatterId)
        .where("code", "==", recruitmentCode.toUpperCase())
        .where("usedByProviderId", "==", null)
        .limit(1)
        .get();

      if (!linkQuery.empty) {
        // Update existing link
        await linkQuery.docs[0].ref.update({
          usedByProviderId: userId,
          usedAt: Timestamp.now(),
        });
      } else {
        // Create new link record
        const linkRef = db.collection("chatter_recruitment_links").doc();
        const sixMonthsLater = new Date();
        sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

        await linkRef.set({
          id: linkRef.id,
          chatterId,
          chatterCode: chatter.affiliateCodeClient,
          code: recruitmentCode.toUpperCase(),
          trackingUrl: `https://sos-expat.com?ref=${recruitmentCode}`,
          usedByProviderId: userId,
          usedAt: Timestamp.now(),
          commissionPaid: false,
          commissionId: null,
          expiresAt: Timestamp.fromDate(sixMonthsLater),
          isActive: false, // Link is used now
          createdAt: Timestamp.now(),
        });
      }

      // Create notification for chatter
      const notificationRef = db.collection("chatter_notifications").doc();

      const notification: ChatterNotification = {
        id: notificationRef.id,
        chatterId,
        type: "system",
        title: "Nouveau prestataire recruté !",
        titleTranslations: {
          en: "New provider recruited!",
          es: "Nuevo proveedor reclutado!",
          pt: "Novo provedor recrutado!",
        },
        message: `${userData.firstName || "Un prestataire"} s'est inscrit avec votre lien de recrutement. Vous recevrez votre commission quand il/elle recevra son premier appel payant.`,
        messageTranslations: {
          en: `${userData.firstName || "A provider"} signed up with your recruitment link. You'll receive your commission when they get their first paid call.`,
        },
        actionUrl: "/chatter/dashboard",
        isRead: false,
        emailSent: false,
        data: {
          // No commission yet - will be added when provider receives first call
        },
        createdAt: Timestamp.now(),
      };

      await notificationRef.set(notification);

      logger.info("[chatterOnProviderRegistered] Provider linked to chatter", {
        userId,
        chatterId,
        recruitmentCode,
      });
    } catch (error) {
      logger.error("[chatterOnProviderRegistered] Error", {
        userId,
        recruitmentCode,
        error,
      });
    }
}

export const chatterOnProviderRegistered = onDocumentCreated(
  {
    document: "users/{userId}",
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
  },
  handleChatterProviderRegistered
);

/**
 * Also handle client registration with chatter referral code
 */
export async function handleChatterClientRegistered(event: any) {
    ensureInitialized();

    const snapshot = event.data;
    if (!snapshot) {
      return;
    }

    const userId = event.params.userId;
    const userData = snapshot.data() as UserDocument;

    // Only process clients
    if (userData.role !== "client") {
      return;
    }

    // Check if there's a chatter referral code
    if (!userData.referredByChatter) {
      return;
    }

    const referralCode = userData.referredByChatter;

    logger.info("[chatterOnClientRegistered] Processing referred client", {
      userId,
      email: userData.email,
      referralCode,
    });

    const db = getFirestore();

    try {
      // Find the referring chatter by client code
      const chatterQuery = await db
        .collection("chatters")
        .where("affiliateCodeClient", "==", referralCode.toUpperCase())
        .where("status", "==", "active")
        .limit(1)
        .get();

      if (chatterQuery.empty) {
        logger.warn("[chatterOnClientRegistered] Chatter not found for code", {
          referralCode,
        });
        return;
      }

      const chatterId = chatterQuery.docs[0].id;

      // Update user document with chatter ID
      await db.collection("users").doc(userId).update({
        referredByChatterId: chatterId,
      });

      // Track the click/conversion
      const clickRef = db.collection("chatter_affiliate_clicks").doc();
      await clickRef.set({
        id: clickRef.id,
        chatterCode: referralCode.toUpperCase(),
        chatterId,
        linkType: "client",
        landingPage: "/register",
        converted: true,
        conversionId: userId,
        conversionType: "client_signup",
        clickedAt: userData.createdAt || Timestamp.now(),
        convertedAt: Timestamp.now(),
      });

      // Create notification for chatter
      const notificationRef = db.collection("chatter_notifications").doc();

      const notification: ChatterNotification = {
        id: notificationRef.id,
        chatterId,
        type: "system",
        title: "Nouveau client référé !",
        titleTranslations: {
          en: "New client referred!",
        },
        message: `${userData.firstName || "Un client"} s'est inscrit avec votre code. Vous recevrez une commission quand il/elle effectuera un appel payant.`,
        messageTranslations: {
          en: `${userData.firstName || "A client"} signed up with your code. You'll receive a commission when they make a paid call.`,
        },
        isRead: false,
        emailSent: false,
        createdAt: Timestamp.now(),
      };

      await notificationRef.set(notification);

      logger.info("[chatterOnClientRegistered] Client linked to chatter", {
        userId,
        chatterId,
        referralCode,
      });
    } catch (error) {
      logger.error("[chatterOnClientRegistered] Error", {
        userId,
        referralCode,
        error,
      });
    }
}

export const chatterOnClientRegistered = onDocumentCreated(
  {
    document: "users/{userId}",
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
  },
  handleChatterClientRegistered
);
