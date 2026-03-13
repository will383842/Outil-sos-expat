/**
 * Unified Notification Dispatcher
 *
 * Dispatches commission notifications to the appropriate collection
 * based on referrerRole:
 *   - chatter/captainChatter → chatter_notifications
 *   - all others → affiliate_notifications
 *
 * Non-blocking: errors are logged but never thrown.
 */

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { UnifiedCommission } from "./types";

const TITLE_MAP: Record<string, Record<string, string>> = {
  client_call: {
    fr: "Commission appel reçue !",
    en: "Call commission received!",
    es: "¡Comisión de llamada recibida!",
    de: "Anruf-Provision erhalten!",
    pt: "Comissão de chamada recebida!",
    ru: "Комиссия за звонок получена!",
    hi: "कॉल कमीशन प्राप्त!",
    zh: "通话佣金已收到！",
    ar: "تم استلام عمولة المكالمة!",
  },
  recruitment_call: {
    fr: "Commission recrutement reçue !",
    en: "Recruitment commission received!",
    es: "¡Comisión de reclutamiento recibida!",
    de: "Rekrutierungs-Provision erhalten!",
    pt: "Comissão de recrutamento recebida!",
    ru: "Комиссия за рекрутинг получена!",
    hi: "भर्ती कमीशन प्राप्त!",
    zh: "招聘佣金已收到！",
    ar: "تم استلام عمولة التوظيف!",
  },
  activation_bonus: {
    fr: "Bonus d'activation reçu !",
    en: "Activation bonus received!",
    es: "¡Bono de activación recibido!",
    de: "Aktivierungsbonus erhalten!",
    pt: "Bônus de ativação recebido!",
    ru: "Бонус за активацию получен!",
    hi: "एक्टिवेशन बोनस प्राप्त!",
    zh: "激活奖金已收到！",
    ar: "تم استلام مكافأة التفعيل!",
  },
  signup_bonus: {
    fr: "Bonus d'inscription reçu !",
    en: "Signup bonus received!",
    es: "¡Bono de registro recibido!",
    de: "Anmeldebonus erhalten!",
    pt: "Bônus de inscrição recebido!",
    ru: "Бонус за регистрацию получен!",
    hi: "साइनअप बोनस प्राप्त!",
    zh: "注册奖金已收到！",
    ar: "تم استلام مكافأة التسجيل!",
  },
  provider_recruitment: {
    fr: "Commission prestataire recruté !",
    en: "Provider recruitment commission!",
    es: "¡Comisión por reclutamiento de proveedor!",
    de: "Provision für Anbieter-Rekrutierung!",
    pt: "Comissão por recrutamento de prestador!",
    ru: "Комиссия за рекрутинг провайдера!",
    hi: "प्रदाता भर्ती कमीशन!",
    zh: "服务商招募佣金！",
    ar: "عمولة تجنيد مقدم الخدمة!",
  },
  subscription_commission: {
    fr: "Commission abonnement reçue !",
    en: "Subscription commission received!",
    es: "¡Comisión de suscripción recibida!",
    de: "Abonnement-Provision erhalten!",
    pt: "Comissão de assinatura recebida!",
    ru: "Комиссия за подписку получена!",
    hi: "सदस्यता कमीशन प्राप्त!",
    zh: "订阅佣金已收到！",
    ar: "تم استلام عمولة الاشتراك!",
  },
};

const DEFAULT_TITLE: Record<string, string> = {
  fr: "Commission reçue !",
  en: "Commission received!",
  es: "¡Comisión recibida!",
  de: "Provision erhalten!",
  pt: "Comissão recebida!",
  ru: "Комиссия получена!",
  hi: "कमीशन प्राप्त!",
  zh: "佣金已收到！",
  ar: "تم استلام العمولة!",
};

/**
 * Dispatch a notification for a newly created commission.
 * Non-blocking — errors are logged, never thrown.
 */
export async function dispatchCommissionNotification(
  commission: UnifiedCommission
): Promise<void> {
  try {
    const db = getFirestore();
    const amountDollars = (commission.amount / 100).toFixed(2);

    // Determine target collection
    const isChatter = commission.referrerRole === "chatter" || commission.referrerRole === "captainChatter";
    const collection = isChatter ? "chatter_notifications" : "affiliate_notifications";

    // Get titles
    const titles = TITLE_MAP[commission.type] || DEFAULT_TITLE;

    // Build message translations
    const messageTranslations: Record<string, string> = {
      fr: `Vous avez gagné $${amountDollars} de commission.`,
      en: `You earned $${amountDollars} in commission.`,
      es: `Has ganado $${amountDollars} en comisión.`,
      de: `Sie haben $${amountDollars} Provision verdient.`,
      pt: `Você ganhou $${amountDollars} em comissão.`,
      ru: `Вы заработали $${amountDollars} комиссии.`,
      hi: `आपने $${amountDollars} कमीशन कमाया।`,
      zh: `您赚取了 $${amountDollars} 佣金。`,
      ar: `لقد ربحت $${amountDollars} كعمولة.`,
    };

    const notifRef = db.collection(collection).doc();
    const idField = isChatter ? "chatterId" : "affiliateId";

    await notifRef.set({
      id: notifRef.id,
      [idField]: commission.referrerId,
      type: "commission_earned",
      title: titles.fr || DEFAULT_TITLE.fr,
      titleTranslations: titles,
      message: messageTranslations.fr,
      messageTranslations,
      isRead: false,
      emailSent: false,
      data: {
        commissionId: commission.id,
        commissionType: commission.type,
        amount: commission.amount,
      },
      createdAt: Timestamp.now(),
    });

    logger.info(`[notificationDispatcher] ${collection} notification created for ${commission.referrerId}`);
  } catch (error) {
    logger.warn("[notificationDispatcher] Failed (non-blocking)", {
      commissionId: commission.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
