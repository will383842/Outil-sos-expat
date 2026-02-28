/**
 * Trigger: onProviderRegistered
 *
 * Fires when a new provider (lawyer/expat) is created.
 * - Checks if they were recruited via chatter recruitment link
 * - Creates a record in chatter_recruited_providers (harmonized structure)
 * - Commission will be created on EVERY call the provider receives (6-month window)
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { findChatterByRecruitmentCode } from "../utils";
import { Chatter, ChatterRecruitedProvider, ChatterNotification } from "../types";

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

      // Check chatter is active
      if (chatter.status !== "active") {
        logger.info("[chatterOnProviderRegistered] Chatter not active, skipping", {
          chatterId,
          status: chatter.status,
        });
        return;
      }

      // Check if this provider was already recruited by this chatter
      const existingRecruitment = await db
        .collection("chatter_recruited_providers")
        .where("chatterId", "==", chatterId)
        .where("providerId", "==", userId)
        .limit(1)
        .get();

      if (!existingRecruitment.empty) {
        logger.info("[chatterOnProviderRegistered] Provider already recruited by this chatter", {
          userId,
          chatterId,
        });
        return;
      }

      // Update user document with chatter ID
      await db.collection("users").doc(userId).update({
        providerRecruitedByChatterId: chatterId,
        providerFirstCallReceived: false,
      });

      // Create recruitment record in chatter_recruited_providers (harmonized structure)
      const now = Timestamp.now();
      const sixMonthsLater = new Date();
      sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

      const providerName =
        `${userData.firstName || ""} ${userData.lastName || ""}`.trim() ||
        userData.email ||
        userId;

      const recruitmentRef = db.collection("chatter_recruited_providers").doc();

      const recruitment: ChatterRecruitedProvider = {
        id: recruitmentRef.id,
        chatterId,
        chatterCode: chatter.affiliateCodeRecruitment || chatter.affiliateCodeClient,
        chatterEmail: chatter.email,
        providerId: userId,
        providerEmail: userData.email,
        providerType: userData.role as "lawyer" | "expat",
        providerName,
        recruitedAt: now,
        commissionWindowEndsAt: Timestamp.fromDate(sixMonthsLater),
        isActive: true,
        callsWithCommission: 0,
        totalCommissions: 0,
        lastCommissionAt: null,
        createdAt: now,
        updatedAt: now,
      };

      await recruitmentRef.set(recruitment);

      // Also update legacy chatter_recruitment_links for backward compat
      const linkQuery = await db
        .collection("chatter_recruitment_links")
        .where("chatterId", "==", chatterId)
        .where("code", "==", recruitmentCode.toUpperCase())
        .where("usedByProviderId", "==", null)
        .limit(1)
        .get();

      if (!linkQuery.empty) {
        await linkQuery.docs[0].ref.update({
          usedByProviderId: userId,
          usedAt: now,
        });
      }

      // Update chatter's recruit count (atomic)
      await db.collection("chatters").doc(chatterId).update({
        totalRecruits: FieldValue.increment(1),
        updatedAt: now,
      });

      // Create notification for chatter
      const notificationRef = db.collection("chatter_notifications").doc();

      const notification: ChatterNotification = {
        id: notificationRef.id,
        chatterId,
        type: "system",
        title: "Nouveau prestataire recruté !",
        titleTranslations: {
          fr: "Nouveau prestataire recruté !",
          en: "New provider recruited!",
          es: "¡Nuevo proveedor reclutado!",
          de: "Neuer Anbieter rekrutiert!",
          pt: "Novo prestador recrutado!",
          ru: "Новый поставщик привлечён!",
          hi: "नया प्रदाता भर्ती हुआ!",
          zh: "新服务商已招募！",
          ar: "تم تجنيد مزوّد جديد!",
        },
        message: `${providerName} s'est inscrit avec votre lien de recrutement. Vous gagnerez $5 sur chaque appel pendant 6 mois.`,
        messageTranslations: {
          fr: `${providerName} s'est inscrit avec votre lien de recrutement. Vous gagnerez $5 sur chaque appel pendant 6 mois.`,
          en: `${providerName} registered via your link. You'll earn $5 on each call for 6 months.`,
          es: `${providerName} se registró a través de tu enlace. Ganarás $5 por cada llamada durante 6 meses.`,
          de: `${providerName} hat sich über Ihren Link registriert. Sie verdienen $5 pro Anruf für 6 Monate.`,
          pt: `${providerName} registrou-se pelo seu link. Você ganhará $5 por cada chamada durante 6 meses.`,
          ru: `${providerName} зарегистрировался по вашей ссылке. Вы будете получать $5 за каждый звонок в течение 6 месяцев.`,
          hi: `${providerName} आपके लिंक से पंजीकृत हुआ। आप 6 महीने तक हर कॉल पर $5 कमाएंगे।`,
          zh: `${providerName} 通过您的链接注册。您将在6个月内每次通话赚取 $5。`,
          ar: `${providerName} سجّل عبر رابطك. ستحصل على $5 عن كل مكالمة لمدة 6 أشهر.`,
        },
        actionUrl: "/chatter/dashboard",
        isRead: false,
        emailSent: false,
        data: {
          referralId: recruitmentRef.id,
        },
        createdAt: Timestamp.now(),
      };

      await notificationRef.set(notification);

      logger.info("[chatterOnProviderRegistered] Provider linked to chatter (harmonized)", {
        userId,
        chatterId,
        recruitmentCode,
        recruitmentId: recruitmentRef.id,
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
          fr: "Nouveau client référé !",
          en: "New client referred!",
          es: "¡Nuevo cliente referido!",
          de: "Neuer Kunde empfohlen!",
          pt: "Novo cliente indicado!",
          ru: "Новый клиент привлечён!",
          hi: "नया क्लाइंट रेफ़र किया!",
          zh: "新客户已推荐！",
          ar: "تمت إحالة عميل جديد!",
        },
        message: `${userData.firstName || "Un client"} s'est inscrit avec votre code. Vous recevrez une commission quand il/elle effectuera un appel payant.`,
        messageTranslations: {
          fr: `${userData.firstName || "Un client"} s'est inscrit avec votre code. Vous recevrez une commission quand il/elle effectuera un appel payant.`,
          en: `${userData.firstName || "A client"} signed up with your code. You'll receive a commission when they make a paid call.`,
          es: `${userData.firstName || "Un cliente"} se registró con tu código. Recibirás una comisión cuando haga una llamada de pago.`,
          de: `${userData.firstName || "Ein Kunde"} hat sich mit Ihrem Code angemeldet. Sie erhalten eine Provision bei einem kostenpflichtigen Anruf.`,
          pt: `${userData.firstName || "Um cliente"} inscreveu-se com o seu código. Você receberá uma comissão quando fizer uma chamada paga.`,
          ru: `${userData.firstName || "Клиент"} зарегистрировался по вашему коду. Вы получите комиссию, когда он сделает платный звонок.`,
          hi: `${userData.firstName || "एक क्लाइंट"} आपके कोड से साइन अप किया। भुगतान कॉल पर आपको कमीशन मिलेगा।`,
          zh: `${userData.firstName || "一位客户"} 使用您的代码注册。他们进行付费通话时您将获得佣金。`,
          ar: `${userData.firstName || "عميل"} سجّل بكودك. ستحصل على عمولة عند إجراء مكالمة مدفوعة.`,
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
