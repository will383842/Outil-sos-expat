/**
 * Trigger: onWithdrawalStatusChanged
 *
 * Fires when a withdrawal document is updated in payment_withdrawals collection.
 * - Checks if status changed
 * - Sends appropriate notification based on new status
 * - Logs status change to audit log
 * - Handles specific status transitions (e.g., approved -> processing)
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import {
  WithdrawalRequest,
  WithdrawalStatus,
  PaymentConfig,
  PaymentUserType,
  DEFAULT_PAYMENT_CONFIG,
} from "../types";
import { sendZoho } from "../../notificationPipeline/providers/email/zohoSmtp";
import { enqueueTelegramMessage } from "../../telegram/queue/enqueue";
import { notifyMotivationEngine } from "../../Webhooks/notifyMotivationEngine";
import { forwardEventToEngine } from "../../telegram/forwardToEngine";
import { TELEGRAM_ENGINE_URL_SECRET, TELEGRAM_ENGINE_API_KEY_SECRET } from "../../lib/secrets";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

/**
 * Withdrawal document path in Firestore
 */
const WITHDRAWAL_COLLECTION = "payment_withdrawals";

/**
 * Payment config document path
 */
const CONFIG_DOC_PATH = "payment_config/payment_config";

/**
 * Multi-language status messages for user notifications
 * Languages: en, fr, es, de, pt, ru, ar, zh, hi
 */
interface StatusMessageTranslations {
  title: Record<string, string>;
  message: Record<string, string>;
}

const STATUS_MESSAGES: Record<WithdrawalStatus, StatusMessageTranslations> = {
  pending: {
    title: {
      en: "Withdrawal Pending",
      fr: "Retrait en attente",
      es: "Retiro pendiente",
      de: "Auszahlung ausstehend",
      pt: "Saque pendente",
      ru: "Вывод ожидает",
      ar: "السحب معلق",
      zh: "提款待处理",
      hi: "निकासी लंबित",
    },
    message: {
      en: "Your withdrawal request is pending review.",
      fr: "Votre demande de retrait est en attente de vérification.",
      es: "Su solicitud de retiro está pendiente de revisión.",
      de: "Ihre Auszahlungsanfrage wird geprüft.",
      pt: "O seu pedido de saque está pendente de revisão.",
      ru: "Ваш запрос на вывод средств ожидает проверки.",
      ar: "طلب السحب الخاص بك قيد المراجعة.",
      zh: "您的提款请求正在等待审核。",
      hi: "आपका निकासी अनुरोध समीक्षा के लिए लंबित है।",
    },
  },
  validating: {
    title: {
      en: "Withdrawal Being Validated",
      fr: "Retrait en cours de validation",
      es: "Retiro en validación",
      de: "Auszahlung wird validiert",
      pt: "Saque em validação",
      ru: "Вывод проверяется",
      ar: "السحب قيد التحقق",
      zh: "提款验证中",
      hi: "निकासी सत्यापन में",
    },
    message: {
      en: "Your withdrawal request is being validated.",
      fr: "Votre demande de retrait est en cours de validation.",
      es: "Su solicitud de retiro está siendo validada.",
      de: "Ihre Auszahlungsanfrage wird validiert.",
      pt: "O seu pedido de saque está a ser validado.",
      ru: "Ваш запрос на вывод средств проверяется.",
      ar: "يتم التحقق من طلب السحب الخاص بك.",
      zh: "您的提款请求正在验证中。",
      hi: "आपका निकासी अनुरोध सत्यापित किया जा रहा है।",
    },
  },
  approved: {
    title: {
      en: "Withdrawal Approved",
      fr: "Retrait approuvé",
      es: "Retiro aprobado",
      de: "Auszahlung genehmigt",
      pt: "Saque aprovado",
      ru: "Вывод одобрен",
      ar: "تمت الموافقة على السحب",
      zh: "提款已批准",
      hi: "निकासी स्वीकृत",
    },
    message: {
      en: "Your withdrawal request has been approved and will be processed soon.",
      fr: "Votre demande de retrait a été approuvée et sera traitée prochainement.",
      es: "Su solicitud de retiro ha sido aprobada y será procesada pronto.",
      de: "Ihre Auszahlungsanfrage wurde genehmigt und wird bald bearbeitet.",
      pt: "O seu pedido de saque foi aprovado e será processado em breve.",
      ru: "Ваш запрос на вывод одобрен и скоро будет обработан.",
      ar: "تمت الموافقة على طلب السحب وسيتم معالجته قريبًا.",
      zh: "您的提款请求已获批准，将很快处理。",
      hi: "आपका निकासी अनुरोध स्वीकृत हो गया है और जल्द ही संसाधित किया जाएगा।",
    },
  },
  queued: {
    title: {
      en: "Withdrawal Queued",
      fr: "Retrait en file d'attente",
      es: "Retiro en cola",
      de: "Auszahlung in Warteschlange",
      pt: "Saque em fila de espera",
      ru: "Вывод в очереди",
      ar: "السحب في قائمة الانتظار",
      zh: "提款排队中",
      hi: "निकासी कतार में",
    },
    message: {
      en: "Your withdrawal is queued for automatic processing.",
      fr: "Votre retrait est en file d'attente pour traitement automatique.",
      es: "Su retiro está en cola para procesamiento automático.",
      de: "Ihre Auszahlung ist zur automatischen Verarbeitung eingereiht.",
      pt: "O seu saque está em fila para processamento automático.",
      ru: "Ваш вывод поставлен в очередь на автоматическую обработку.",
      ar: "سحبك في قائمة الانتظار للمعالجة التلقائية.",
      zh: "您的提款已排队等待自动处理。",
      hi: "आपकी निकासी स्वचालित प्रसंस्करण के लिए कतार में है।",
    },
  },
  processing: {
    title: {
      en: "Withdrawal Processing",
      fr: "Retrait en traitement",
      es: "Retiro en proceso",
      de: "Auszahlung wird verarbeitet",
      pt: "Saque em processamento",
      ru: "Вывод обрабатывается",
      ar: "السحب قيد المعالجة",
      zh: "提款处理中",
      hi: "निकासी प्रक्रिया में",
    },
    message: {
      en: "Your withdrawal is currently being processed by our payment provider.",
      fr: "Votre retrait est en cours de traitement par notre prestataire de paiement.",
      es: "Su retiro está siendo procesado por nuestro proveedor de pagos.",
      de: "Ihre Auszahlung wird von unserem Zahlungsanbieter verarbeitet.",
      pt: "O seu saque está a ser processado pelo nosso provedor de pagamento.",
      ru: "Ваш вывод обрабатывается нашим платёжным провайдером.",
      ar: "يتم معالجة سحبك حاليًا بواسطة مزود الدفع لدينا.",
      zh: "您的提款正在由我们的支付提供商处理。",
      hi: "आपकी निकासी हमारे भुगतान प्रदाता द्वारा संसाधित की जा रही है।",
    },
  },
  sent: {
    title: {
      en: "Withdrawal Sent",
      fr: "Retrait envoyé",
      es: "Retiro enviado",
      de: "Auszahlung gesendet",
      pt: "Saque enviado",
      ru: "Вывод отправлен",
      ar: "تم إرسال السحب",
      zh: "提款已发送",
      hi: "निकासी भेजी गई",
    },
    message: {
      en: "Your withdrawal has been sent! Funds should arrive within 1-3 business days.",
      fr: "Votre retrait a été envoyé ! Les fonds devraient arriver sous 1 à 3 jours ouvrés.",
      es: "¡Su retiro ha sido enviado! Los fondos deberían llegar en 1 a 3 días hábiles.",
      de: "Ihre Auszahlung wurde gesendet! Die Mittel sollten innerhalb von 1-3 Werktagen eintreffen.",
      pt: "O seu saque foi enviado! Os fundos devem chegar em 1 a 3 dias úteis.",
      ru: "Ваш вывод отправлен! Средства поступят в течение 1-3 рабочих дней.",
      ar: "تم إرسال سحبك! يجب أن تصل الأموال خلال 1-3 أيام عمل.",
      zh: "您的提款已发送！资金应在1-3个工作日内到账。",
      hi: "आपकी निकासी भेज दी गई है! धनराशि 1-3 कार्य दिवसों में पहुंच जानी चाहिए।",
    },
  },
  completed: {
    title: {
      en: "Withdrawal Completed",
      fr: "Retrait terminé",
      es: "Retiro completado",
      de: "Auszahlung abgeschlossen",
      pt: "Saque concluído",
      ru: "Вывод завершён",
      ar: "اكتمل السحب",
      zh: "提款已完成",
      hi: "निकासी पूर्ण",
    },
    message: {
      en: "Your withdrawal has been completed successfully. Funds should now be in your account.",
      fr: "Votre retrait a été effectué avec succès. Les fonds devraient être sur votre compte.",
      es: "Su retiro se ha completado con éxito. Los fondos deberían estar en su cuenta.",
      de: "Ihre Auszahlung wurde erfolgreich abgeschlossen. Die Mittel sollten jetzt auf Ihrem Konto sein.",
      pt: "O seu saque foi concluído com sucesso. Os fundos devem estar na sua conta.",
      ru: "Ваш вывод успешно завершён. Средства должны быть на вашем счёте.",
      ar: "اكتمل سحبك بنجاح. يجب أن تكون الأموال الآن في حسابك.",
      zh: "您的提款已成功完成。资金现在应该已到账。",
      hi: "आपकी निकासी सफलतापूर्वक पूर्ण हो गई है। धनराशि अब आपके खाते में होनी चाहिए।",
    },
  },
  failed: {
    title: {
      en: "Withdrawal Failed",
      fr: "Retrait échoué",
      es: "Retiro fallido",
      de: "Auszahlung fehlgeschlagen",
      pt: "Saque falhado",
      ru: "Вывод не удался",
      ar: "فشل السحب",
      zh: "提款失败",
      hi: "निकासी विफल",
    },
    message: {
      en: "Unfortunately, your withdrawal could not be processed. Your balance has been restored. Please contact support.",
      fr: "Malheureusement, votre retrait n'a pas pu être traité. Votre solde a été restauré. Veuillez contacter le support.",
      es: "Lamentablemente, su retiro no pudo ser procesado. Su saldo ha sido restaurado. Contacte con soporte.",
      de: "Leider konnte Ihre Auszahlung nicht verarbeitet werden. Ihr Guthaben wurde wiederhergestellt. Bitte kontaktieren Sie den Support.",
      pt: "Infelizmente, o seu saque não pôde ser processado. O seu saldo foi restaurado. Contacte o suporte.",
      ru: "К сожалению, ваш вывод не удался. Ваш баланс восстановлен. Обратитесь в поддержку.",
      ar: "للأسف، لم يتم معالجة سحبك. تم استعادة رصيدك. يرجى الاتصال بالدعم.",
      zh: "很遗憾，您的提款无法处理。余额已恢复。请联系客服。",
      hi: "दुर्भाग्य से, आपकी निकासी संसाधित नहीं हो सकी। आपका शेष बहाल कर दिया गया है। कृपया सहायता से संपर्क करें।",
    },
  },
  rejected: {
    title: {
      en: "Withdrawal Rejected",
      fr: "Retrait rejeté",
      es: "Retiro rechazado",
      de: "Auszahlung abgelehnt",
      pt: "Saque rejeitado",
      ru: "Вывод отклонён",
      ar: "تم رفض السحب",
      zh: "提款被拒绝",
      hi: "निकासी अस्वीकृत",
    },
    message: {
      en: "Your withdrawal request has been rejected. Your balance has been restored. Please check your payment details and try again.",
      fr: "Votre demande de retrait a été rejetée. Votre solde a été restauré. Veuillez vérifier vos coordonnées bancaires et réessayer.",
      es: "Su solicitud de retiro ha sido rechazada. Su saldo ha sido restaurado. Verifique sus datos de pago e intente de nuevo.",
      de: "Ihre Auszahlungsanfrage wurde abgelehnt. Ihr Guthaben wurde wiederhergestellt. Überprüfen Sie Ihre Zahlungsdaten und versuchen Sie es erneut.",
      pt: "O seu pedido de saque foi rejeitado. O seu saldo foi restaurado. Verifique os seus dados de pagamento e tente novamente.",
      ru: "Ваш запрос на вывод отклонён. Ваш баланс восстановлен. Проверьте платёжные реквизиты и попробуйте снова.",
      ar: "تم رفض طلب السحب الخاص بك. تم استعادة رصيدك. يرجى التحقق من تفاصيل الدفع والمحاولة مرة أخرى.",
      zh: "您的提款请求已被拒绝。余额已恢复。请检查您的付款信息后重试。",
      hi: "आपका निकासी अनुरोध अस्वीकार कर दिया गया है। आपका शेष बहाल कर दिया गया है। कृपया अपने भुगतान विवरण जांचें और पुनः प्रयास करें।",
    },
  },
  cancelled: {
    title: {
      en: "Withdrawal Cancelled",
      fr: "Retrait annulé",
      es: "Retiro cancelado",
      de: "Auszahlung storniert",
      pt: "Saque cancelado",
      ru: "Вывод отменён",
      ar: "تم إلغاء السحب",
      zh: "提款已取消",
      hi: "निकासी रद्द",
    },
    message: {
      en: "Your withdrawal request has been cancelled.",
      fr: "Votre demande de retrait a été annulée.",
      es: "Su solicitud de retiro ha sido cancelada.",
      de: "Ihre Auszahlungsanfrage wurde storniert.",
      pt: "O seu pedido de saque foi cancelado.",
      ru: "Ваш запрос на вывод отменён.",
      ar: "تم إلغاء طلب السحب الخاص بك.",
      zh: "您的提款请求已取消。",
      hi: "आपका निकासी अनुरोध रद्द कर दिया गया है।",
    },
  },
};

/**
 * Get payment configuration from Firestore
 */
async function getPaymentConfig(): Promise<PaymentConfig> {
  const db = getFirestore();
  const configDoc = await db.doc(CONFIG_DOC_PATH).get();

  if (!configDoc.exists) {
    logger.warn("[onWithdrawalStatusChanged] Payment config not found, using defaults");
    return {
      ...DEFAULT_PAYMENT_CONFIG,
      updatedAt: new Date().toISOString(),
      updatedBy: "system",
    };
  }

  return configDoc.data() as PaymentConfig;
}

/**
 * Get the notification collection for a user type
 */
function getNotificationCollection(userType: PaymentUserType): string {
  switch (userType) {
    case 'chatter': return 'chatter_notifications';
    case 'influencer': return 'influencer_notifications';
    case 'blogger': return 'blogger_notifications';
    case 'group_admin': return 'group_admin_notifications';
    case 'affiliate': return 'affiliate_notifications';
    case 'partner': return 'partner_notifications';
    case 'client': return 'inapp_notifications';
    case 'lawyer': return 'inapp_notifications';
    case 'expat': return 'inapp_notifications';
    default: return `${userType}_notifications`;
  }
}

/**
 * Get the payments page URL for a user type
 */
function getPaymentsUrl(userType: PaymentUserType): string {
  switch (userType) {
    case 'group_admin': return '/group-admin/payments';
    case 'client': return '/account/payments';
    case 'lawyer': return '/provider/payments';
    case 'expat': return '/provider/payments';
    default: return `/${userType}/payments`;
  }
}

/**
 * Create a notification for the user
 */
async function createUserNotification(
  withdrawal: WithdrawalRequest,
  title: string,
  message: string,
  additionalData?: Record<string, unknown>,
  titleTranslations?: Record<string, string>,
  messageTranslations?: Record<string, string>
): Promise<void> {
  const db = getFirestore();
  const now = Timestamp.now();

  // Determine the correct notification collection based on user type
  const notificationCollection = getNotificationCollection(withdrawal.userType as PaymentUserType);

  const notification = {
    id: "",
    [`${withdrawal.userType}Id`]: withdrawal.userId,
    type: "payment",
    title,
    titleTranslations: titleTranslations || { en: title },
    message,
    messageTranslations: messageTranslations || { en: message },
    actionUrl: getPaymentsUrl(withdrawal.userType as PaymentUserType),
    isRead: false,
    emailSent: false,
    data: {
      withdrawalId: withdrawal.id,
      amount: withdrawal.amount,
      status: withdrawal.status,
      ...additionalData,
    },
    createdAt: now,
  };

  const notificationRef = db.collection(notificationCollection).doc();
  notification.id = notificationRef.id;
  await notificationRef.set(notification);

  // For affiliates, clients, lawyers, expats — also write to inapp_notifications
  const inappTypes: PaymentUserType[] = ['affiliate', 'client', 'lawyer', 'expat', 'partner'];
  if (inappTypes.includes(withdrawal.userType as PaymentUserType)) {
    try {
      const inappRef = db.collection('inapp_notifications').doc();
      await inappRef.set({
        ...notification,
        id: inappRef.id,
        userId: withdrawal.userId,
        type: 'payment',
      });
    } catch (inappErr) {
      logger.warn("[onWithdrawalStatusChanged] Failed to write inapp notification", {
        error: inappErr instanceof Error ? inappErr.message : "Unknown",
      });
    }
  }

  logger.info("[onWithdrawalStatusChanged] User notification created", {
    withdrawalId: withdrawal.id,
    notificationId: notification.id,
    status: withdrawal.status,
    collection: notificationCollection,
  });
}

/**
 * Send email + Telegram to user when their withdrawal fails
 */
async function notifyUserWithdrawalFailed(withdrawal: WithdrawalRequest): Promise<void> {
  const amountFormatted = `$${(withdrawal.amount / 100).toFixed(2)}`;
  const errorReason = withdrawal.errorMessage || "Erreur inconnue";
  let emailSent = false;
  let telegramSent = false;

  // 1. Email via Zoho SMTP
  try {
    const subject = `Votre retrait de ${amountFormatted} n'a pas pu être traité`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #e53e3e;">❌ Retrait échoué</h2>
        <p>Bonjour ${withdrawal.userName},</p>
        <p>Malheureusement, votre retrait de <strong>${amountFormatted}</strong> n'a pas pu être traité.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; color: #666;">Montant :</td><td style="padding: 8px;"><strong>${amountFormatted}</strong></td></tr>
          <tr><td style="padding: 8px; color: #666;">Méthode :</td><td style="padding: 8px;">${withdrawal.provider}</td></tr>
          <tr><td style="padding: 8px; color: #666;">Raison :</td><td style="padding: 8px; color: #e53e3e;">${errorReason}</td></tr>
        </table>
        <p style="color: #276749; font-weight: bold;">✅ Votre solde a été restauré automatiquement.</p>
        <p>
          <a href="https://sos-expat.com/${withdrawal.userType}/payments"
             style="display: inline-block; background: #e53e3e; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Réessayer le retrait
          </a>
        </p>
        <p>Si le problème persiste, contactez notre support.</p>
        <p style="color: #999; font-size: 12px;">— L'équipe SOS Expat</p>
      </div>
    `;
    await sendZoho(withdrawal.userEmail, subject, html, undefined, {
      skipUnsubscribeFooter: true, // Transactional payment notification
    });
    emailSent = true;
    logger.info("[onWithdrawalStatusChanged] Failure email sent", { withdrawalId: withdrawal.id, to: withdrawal.userEmail });
  } catch (emailErr) {
    logger.error("[onWithdrawalStatusChanged] Failed to send failure email", { error: emailErr instanceof Error ? emailErr.message : emailErr });
  }

  // 2. Telegram via global queue (rate-limited, with retries)
  try {
    const db = getFirestore();
    const userDoc = await db.collection("users").doc(withdrawal.userId).get();
    const telegramId = userDoc.data()?.telegramId as number | undefined;

    if (telegramId) {
      const text = `❌ Votre retrait de *${amountFormatted}* a échoué.\n✅ Votre solde a été restauré.\nContactez le support si besoin.`;
      await enqueueTelegramMessage(telegramId, text, {
        parseMode: "Markdown",
        priority: "realtime",
        sourceEventType: "withdrawal_failed_user",
      });
      telegramSent = true;
      logger.info("[onWithdrawalStatusChanged] Failure Telegram enqueued", { withdrawalId: withdrawal.id, telegramId });
    }
  } catch (tgErr) {
    logger.error("[onWithdrawalStatusChanged] Failed to enqueue Telegram failure notification", { error: tgErr instanceof Error ? tgErr.message : tgErr });
  }

  // AUDIT FIX 2026-02-28: If BOTH channels failed, write a fallback in-app notification
  // so the user sees the failure next time they open the dashboard
  if (!emailSent && !telegramSent) {
    logger.error("[onWithdrawalStatusChanged] CRITICAL: Both email and Telegram failed for withdrawal failure notification", {
      withdrawalId: withdrawal.id,
      userId: withdrawal.userId,
      amount: withdrawal.amount,
    });
    try {
      const db = getFirestore();
      const fallbackRef = db.collection("inapp_notifications").doc();
      await fallbackRef.set({
        id: fallbackRef.id,
        userId: withdrawal.userId,
        type: "payment_failure",
        title: `Retrait de ${amountFormatted} échoué`,
        titleTranslations: { en: `Withdrawal of ${amountFormatted} failed` },
        message: `Votre retrait a échoué (${errorReason}). Votre solde a été restauré. Réessayez depuis votre tableau de bord.`,
        messageTranslations: { en: `Your withdrawal failed (${errorReason}). Your balance has been restored. Please retry from your dashboard.` },
        actionUrl: `/${withdrawal.userType}/payments`,
        isRead: false,
        priority: "high",
        createdAt: Timestamp.now(),
      });
      logger.info("[onWithdrawalStatusChanged] Fallback in-app notification created", { withdrawalId: withdrawal.id });
    } catch (fallbackErr) {
      logger.error("[onWithdrawalStatusChanged] CRITICAL: All notification channels failed", {
        withdrawalId: withdrawal.id,
        error: fallbackErr instanceof Error ? fallbackErr.message : fallbackErr,
      });
    }
  }
}

/**
 * Send transactional email for withdrawal status changes.
 * Sends for: approved, sent, completed, rejected (failed is handled by notifyUserWithdrawalFailed)
 */
async function sendStatusChangeEmail(
  withdrawal: WithdrawalRequest,
  newStatus: WithdrawalStatus
): Promise<void> {
  // Only send emails for significant status changes
  const emailableStatuses: WithdrawalStatus[] = ['approved', 'sent', 'completed', 'rejected'];
  if (!emailableStatuses.includes(newStatus)) {
    return;
  }

  const amountFormatted = `$${(withdrawal.amount / 100).toFixed(2)}`;

  const statusConfig: Record<string, { emoji: string; color: string; ctaText: string; ctaUrl: string }> = {
    approved: {
      emoji: "\u2705",
      color: "#2b6cb0",
      ctaText: "Suivre mon retrait",
      ctaUrl: `https://sos-expat.com/${withdrawal.userType}/payments`,
    },
    sent: {
      emoji: "\uD83D\uDE80",
      color: "#5a67d8",
      ctaText: "Voir les d\u00e9tails",
      ctaUrl: `https://sos-expat.com/${withdrawal.userType}/payments`,
    },
    completed: {
      emoji: "\uD83C\uDF89",
      color: "#276749",
      ctaText: "Voir mon historique",
      ctaUrl: `https://sos-expat.com/${withdrawal.userType}/payments`,
    },
    rejected: {
      emoji: "\u274C",
      color: "#c53030",
      ctaText: "V\u00e9rifier mes coordonn\u00e9es",
      ctaUrl: `https://sos-expat.com/${withdrawal.userType}/payments`,
    },
  };

  const config = statusConfig[newStatus];
  if (!config) return;

  const statusMessages = STATUS_MESSAGES[newStatus];
  const titleFr = statusMessages.title.fr || statusMessages.title.en;
  const messageFr = statusMessages.message.fr || statusMessages.message.en;

  try {
    const subject = `${config.emoji} ${titleFr} \u2014 ${amountFormatted}`;
    const rejectionNote = newStatus === 'rejected' && withdrawal.errorMessage
      ? `<tr><td style="padding: 8px; color: #666;">Raison :</td><td style="padding: 8px; color: ${config.color};">${withdrawal.errorMessage}</td></tr>`
      : '';
    const balanceRestoredNote = newStatus === 'rejected'
      ? '<p style="color: #276749; font-weight: bold;">\u2705 Votre solde a \u00e9t\u00e9 restaur\u00e9 automatiquement.</p>'
      : '';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: ${config.color};">${config.emoji} ${titleFr}</h2>
        <p>Bonjour ${withdrawal.userName},</p>
        <p>${messageFr}</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; color: #666;">Montant :</td><td style="padding: 8px;"><strong>${amountFormatted}</strong></td></tr>
          <tr><td style="padding: 8px; color: #666;">M\u00e9thode :</td><td style="padding: 8px;">${withdrawal.provider}${withdrawal.methodType ? ` (${withdrawal.methodType})` : ""}</td></tr>
          ${rejectionNote}
        </table>
        ${balanceRestoredNote}
        <p>
          <a href="${config.ctaUrl}"
             style="display: inline-block; background: ${config.color}; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            ${config.ctaText}
          </a>
        </p>
        <p style="color: #999; font-size: 12px;">\u2014 L'\u00e9quipe SOS Expat</p>
      </div>
    `;
    await sendZoho(withdrawal.userEmail, subject, html, undefined, {
      skipUnsubscribeFooter: true,
    });
    logger.info("[onWithdrawalStatusChanged] Status email sent", {
      withdrawalId: withdrawal.id,
      newStatus,
      to: withdrawal.userEmail,
    });
  } catch (emailErr) {
    logger.error("[onWithdrawalStatusChanged] Failed to send status email", {
      withdrawalId: withdrawal.id,
      newStatus,
      error: emailErr instanceof Error ? emailErr.message : emailErr,
    });
  }
}

/**
 * Send Telegram DM to user for key status changes (approved, sent, completed, rejected)
 */
async function sendStatusChangeTelegram(
  withdrawal: WithdrawalRequest,
  newStatus: WithdrawalStatus
): Promise<void> {
  const telegramStatuses: WithdrawalStatus[] = ['approved', 'sent', 'completed', 'rejected'];
  if (!telegramStatuses.includes(newStatus)) {
    return;
  }

  try {
    const db = getFirestore();
    const userDoc = await db.collection("users").doc(withdrawal.userId).get();
    const telegramId = userDoc.data()?.telegramId as number | undefined;

    if (!telegramId) return;

    const amountFormatted = `$${(withdrawal.amount / 100).toFixed(2)}`;
    const statusMessages = STATUS_MESSAGES[newStatus];
    const titleFr = statusMessages.title.fr || statusMessages.title.en;

    const emojiMap: Record<string, string> = {
      approved: "\u2705",
      sent: "\uD83D\uDE80",
      completed: "\uD83C\uDF89",
      rejected: "\u274C",
    };

    const text = `${emojiMap[newStatus] || "\uD83D\uDCE2"} *${titleFr}*\n\uD83D\uDCB5 Montant : *${amountFormatted}*\n${statusMessages.message.fr || statusMessages.message.en}`;

    await enqueueTelegramMessage(telegramId, text, {
      parseMode: "Markdown",
      priority: "realtime",
      sourceEventType: `withdrawal_${newStatus}_user`,
    });

    logger.info("[onWithdrawalStatusChanged] Status Telegram sent", {
      withdrawalId: withdrawal.id,
      newStatus,
      telegramId,
    });
  } catch (tgErr) {
    logger.error("[onWithdrawalStatusChanged] Failed to send status Telegram", {
      withdrawalId: withdrawal.id,
      newStatus,
      error: tgErr instanceof Error ? tgErr.message : tgErr,
    });
  }
}

/**
 * Send admin notification for specific status changes
 */
async function sendAdminNotification(
  withdrawal: WithdrawalRequest,
  oldStatus: WithdrawalStatus,
  newStatus: WithdrawalStatus,
  config: PaymentConfig
): Promise<void> {
  // Only notify admins for certain transitions
  const notifiableStatuses: WithdrawalStatus[] = ["failed", "completed"];

  if (!notifiableStatuses.includes(newStatus)) {
    return;
  }

  // Check config for notification settings
  if (newStatus === "completed" && !config.notifyOnCompletion) {
    return;
  }
  if (newStatus === "failed" && !config.notifyOnFailure) {
    return;
  }

  if (config.adminEmails.length === 0) {
    return;
  }

  const db = getFirestore();
  const now = Timestamp.now();

  const adminNotification = {
    id: "",
    type: `withdrawal_${newStatus}`,
    title: `Withdrawal ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)} - ${withdrawal.userType}`,
    message: `${withdrawal.userName}'s withdrawal of $${(withdrawal.amount / 100).toFixed(2)} is now ${newStatus}`,
    data: {
      withdrawalId: withdrawal.id,
      userId: withdrawal.userId,
      userType: withdrawal.userType,
      amount: withdrawal.amount,
      provider: withdrawal.provider,
      oldStatus,
      newStatus,
      errorMessage: withdrawal.errorMessage,
      errorCode: withdrawal.errorCode,
    },
    isRead: false,
    priority: newStatus === "failed" ? "high" : "normal",
    adminEmails: config.adminEmails,
    createdAt: now,
  };

  const notificationRef = db.collection("admin_notifications").doc();
  adminNotification.id = notificationRef.id;
  await notificationRef.set(adminNotification);

  logger.info("[onWithdrawalStatusChanged] Admin notification created", {
    withdrawalId: withdrawal.id,
    notificationId: adminNotification.id,
    newStatus,
  });
}

/**
 * Log status change to audit log
 */
async function logStatusChange(
  withdrawal: WithdrawalRequest,
  oldStatus: WithdrawalStatus,
  newStatus: WithdrawalStatus
): Promise<void> {
  const db = getFirestore();
  const now = Timestamp.now();

  const auditLog = {
    id: "",
    action: "withdrawal_status_changed",
    entityType: "withdrawal",
    entityId: withdrawal.id,
    userId: withdrawal.userId,
    userType: withdrawal.userType,
    data: {
      oldStatus,
      newStatus,
      amount: withdrawal.amount,
      provider: withdrawal.provider,
      providerTransactionId: withdrawal.providerTransactionId,
      processedBy: withdrawal.processedBy,
      errorCode: withdrawal.errorCode,
      errorMessage: withdrawal.errorMessage,
    },
    timestamp: now,
    ipAddress: null,
    userAgent: null,
  };

  const auditRef = db.collection("payment_audit_logs").doc();
  auditLog.id = auditRef.id;
  await auditRef.set(auditLog);

  logger.info("[onWithdrawalStatusChanged] Audit log created", {
    withdrawalId: withdrawal.id,
    auditLogId: auditLog.id,
    oldStatus,
    newStatus,
  });
}

/**
 * Update user statistics on withdrawal completion
 */
async function updateUserStats(withdrawal: WithdrawalRequest): Promise<void> {
  const db = getFirestore();

  // Collection for user withdrawal stats
  const userStatsRef = db.collection("payment_user_stats").doc(withdrawal.userId);
  const userStatsDoc = await userStatsRef.get();

  const now = new Date().toISOString();
  const amountInCents = withdrawal.amount;

  if (!userStatsDoc.exists) {
    // Create new stats document
    await userStatsRef.set({
      userId: withdrawal.userId,
      userType: withdrawal.userType,
      totalWithdrawn: amountInCents,
      withdrawalCount: 1,
      pendingAmount: 0,
      lastWithdrawalAt: now,
      isAutoPaymentEligible: true,
      createdAt: now,
      updatedAt: now,
    });
  } else {
    // Update existing stats
    const currentStats = userStatsDoc.data()!;
    await userStatsRef.update({
      totalWithdrawn: (currentStats.totalWithdrawn || 0) + amountInCents,
      withdrawalCount: (currentStats.withdrawalCount || 0) + 1,
      lastWithdrawalAt: now,
      updatedAt: now,
    });
  }

  logger.info("[onWithdrawalStatusChanged] User stats updated", {
    userId: withdrawal.userId,
    amount: amountInCents,
  });
}

/**
 * Map userType to Firestore collection name
 */
function getUserCollection(userType: PaymentUserType): string {
  switch (userType) {
    case 'chatter': return 'chatters';
    case 'influencer': return 'influencers';
    case 'blogger': return 'bloggers';
    case 'group_admin': return 'group_admins';
    case 'affiliate': return 'users';
    case 'partner': return 'partners';
    case 'client': return 'users';
    case 'lawyer': return 'users';
    case 'expat': return 'users';
    default: return `${userType}s`;
  }
}

/**
 * Terminal statuses where pendingWithdrawalId should be cleared
 */
const TERMINAL_STATUSES: WithdrawalStatus[] = [
  "completed", "sent", "rejected", "cancelled",
];

/**
 * Clear pendingWithdrawalId on the user doc when withdrawal reaches a terminal state.
 * For "failed", only clear if no more retries are possible.
 */
async function clearPendingWithdrawalId(
  withdrawal: WithdrawalRequest,
  newStatus: WithdrawalStatus
): Promise<void> {
  const isTerminal = TERMINAL_STATUSES.includes(newStatus);
  const isFailedNoRetry = newStatus === "failed" &&
    withdrawal.retryCount >= withdrawal.maxRetries;

  if (!isTerminal && !isFailedNoRetry) {
    return;
  }

  const db = getFirestore();
  const userCollection = getUserCollection(withdrawal.userType as PaymentUserType);
  const userRef = db.collection(userCollection).doc(withdrawal.userId);

  try {
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      logger.warn("[onWithdrawalStatusChanged] User doc not found for pendingWithdrawalId cleanup", {
        userId: withdrawal.userId,
        userType: withdrawal.userType,
        collection: userCollection,
      });
      return;
    }

    const userData = userDoc.data()!;
    const pendingField = (withdrawal.userType === 'affiliate' || withdrawal.userType === 'client' || withdrawal.userType === 'lawyer' || withdrawal.userType === 'expat')
      ? 'pendingPayoutId'
      : 'pendingWithdrawalId';

    // Only clear if the pending field matches this withdrawal
    if (userData[pendingField] === withdrawal.id) {
      await userRef.update({
        [pendingField]: null,
        updatedAt: Timestamp.now(),
      });

      logger.info("[onWithdrawalStatusChanged] Cleared pending withdrawal field", {
        userId: withdrawal.userId,
        withdrawalId: withdrawal.id,
        field: pendingField,
        newStatus,
        collection: userCollection,
      });
    }
  } catch (error) {
    logger.error("[onWithdrawalStatusChanged] Failed to clear pendingWithdrawalId", {
      userId: withdrawal.userId,
      withdrawalId: withdrawal.id,
      error: error instanceof Error ? error.message : "Unknown",
    });
  }
}

/**
 * Rollback GroupAdmin commissions when a withdrawal permanently fails.
 * Reverts commissions from "paid" back to "available" so the GroupAdmin can
 * include them in a future withdrawal.
 */
async function rollbackGroupAdminCommissions(
  withdrawal: WithdrawalRequest
): Promise<void> {
  if (withdrawal.userType !== "group_admin") {
    return;
  }

  const db = getFirestore();

  try {
    // Find commissions tied to this withdrawal that were marked "paid"
    const commissionsSnapshot = await db
      .collection("group_admin_commissions")
      .where("withdrawalId", "==", withdrawal.id)
      .where("status", "==", "paid")
      .get();

    if (commissionsSnapshot.empty) {
      logger.info("[onWithdrawalStatusChanged] No commissions to rollback", {
        withdrawalId: withdrawal.id,
      });
      return;
    }

    // Batch update all commissions back to "available"
    const batch = db.batch();
    const now = Timestamp.now();

    for (const doc of commissionsSnapshot.docs) {
      batch.update(doc.ref, {
        status: "available",
        withdrawalId: null,
        paidAt: null,
        rolledBackAt: now,
        rolledBackReason: `Withdrawal ${withdrawal.id} permanently failed`,
        updatedAt: now,
      });
    }

    await batch.commit();

    logger.info("[onWithdrawalStatusChanged] GroupAdmin commissions rolled back", {
      withdrawalId: withdrawal.id,
      groupAdminId: withdrawal.userId,
      commissionsRolledBack: commissionsSnapshot.size,
    });
  } catch (error) {
    logger.error("[onWithdrawalStatusChanged] Failed to rollback commissions", {
      withdrawalId: withdrawal.id,
      groupAdminId: withdrawal.userId,
      error: error instanceof Error ? error.message : "Unknown",
    });
  }
}

/**
 * P1-2 FIX: Rollback Affiliate commissions when a withdrawal permanently fails.
 * Reverts commissions from "paid" back to "available" so the Affiliate can
 * include them in a future withdrawal.
 */
async function rollbackAffiliateCommissions(
  withdrawal: WithdrawalRequest
): Promise<void> {
  if (withdrawal.userType !== "affiliate") {
    return;
  }

  const db = getFirestore();

  try {
    // Find commissions tied to this withdrawal that were marked "paid"
    // P1-2 FIX: Try both "payoutId" and "withdrawalId" fields for robustness
    let commissionsSnapshot = await db
      .collection("affiliate_commissions")
      .where("payoutId", "==", withdrawal.id)
      .where("status", "==", "paid")
      .get();

    // Fallback: some commissions may use "withdrawalId" instead of "payoutId"
    if (commissionsSnapshot.empty) {
      commissionsSnapshot = await db
        .collection("affiliate_commissions")
        .where("withdrawalId", "==", withdrawal.id)
        .where("status", "==", "paid")
        .get();
    }

    if (commissionsSnapshot.empty) {
      logger.info("[onWithdrawalStatusChanged] No affiliate commissions to rollback", {
        withdrawalId: withdrawal.id,
      });
      return;
    }

    // Batch update all commissions back to "available"
    const batch = db.batch();
    const now = Timestamp.now();

    for (const doc of commissionsSnapshot.docs) {
      batch.update(doc.ref, {
        status: "available",
        payoutId: null,
        paidAt: null,
        rolledBackAt: now,
        rolledBackReason: `Withdrawal ${withdrawal.id} permanently failed`,
        updatedAt: now,
      });
    }

    await batch.commit();

    logger.info("[onWithdrawalStatusChanged] Affiliate commissions rolled back", {
      withdrawalId: withdrawal.id,
      affiliateId: withdrawal.userId,
      commissionsRolledBack: commissionsSnapshot.size,
    });
  } catch (error) {
    logger.error("[onWithdrawalStatusChanged] Failed to rollback affiliate commissions", {
      withdrawalId: withdrawal.id,
      affiliateId: withdrawal.userId,
      error: error instanceof Error ? error.message : "Unknown",
    });
  }
}

/**
 * Rollback Unified commissions when a withdrawal permanently fails.
 * Reverts commissions from "paid" back to "available" and restores availableBalance.
 */
async function rollbackUnifiedCommissions(
  withdrawal: WithdrawalRequest
): Promise<void> {
  const db = getFirestore();

  try {
    // Find unified commissions tied to this withdrawal that were marked "paid"
    let commissionsSnapshot = await db
      .collection("commissions")
      .where("payoutId", "==", withdrawal.id)
      .where("status", "==", "paid")
      .get();

    if (commissionsSnapshot.empty) {
      return;
    }

    // Batch update all commissions back to "available" + restore balance
    const batch = db.batch();
    const now = Timestamp.now();
    let totalRolledBack = 0;

    for (const doc of commissionsSnapshot.docs) {
      const data = doc.data();
      batch.update(doc.ref, {
        status: "available",
        payoutId: null,
        paidAt: null,
        rolledBackAt: now,
        rolledBackReason: `Withdrawal ${withdrawal.id} permanently failed`,
      });
      totalRolledBack += data.amount || 0;
    }

    // Restore user's available balance
    if (totalRolledBack > 0) {
      const userRef = db.collection("users").doc(withdrawal.userId);
      batch.update(userRef, {
        availableBalance: FieldValue.increment(totalRolledBack),
      });
    }

    await batch.commit();

    logger.info("[onWithdrawalStatusChanged] Unified commissions rolled back", {
      withdrawalId: withdrawal.id,
      userId: withdrawal.userId,
      commissionsRolledBack: commissionsSnapshot.size,
      totalRolledBack,
    });
  } catch (error) {
    logger.error("[onWithdrawalStatusChanged] Failed to rollback unified commissions", {
      withdrawalId: withdrawal.id,
      userId: withdrawal.userId,
      error: error instanceof Error ? error.message : "Unknown",
    });
  }
}

/**
 * Handle specific status transitions
 */
async function handleStatusTransition(
  withdrawal: WithdrawalRequest,
  oldStatus: WithdrawalStatus,
  newStatus: WithdrawalStatus
): Promise<void> {
  // Handle approved -> processing transition
  if (oldStatus === "approved" && newStatus === "processing") {
    logger.info("[onWithdrawalStatusChanged] Withdrawal approved and processing", {
      withdrawalId: withdrawal.id,
      isAutomatic: withdrawal.isAutomatic,
    });
  }

  // Handle completed/sent withdrawal - update user stats
  if (newStatus === "completed" || newStatus === "sent") {
    await updateUserStats(withdrawal);
  }

  // Handle failed withdrawal - check if retry is possible
  if (newStatus === "failed" && withdrawal.retryCount < withdrawal.maxRetries) {
    const db = getFirestore();
    const retryDelay = 60 * 60 * 1000; // 1 hour in milliseconds
    const nextRetryAt = new Date(Date.now() + retryDelay).toISOString();

    await db.collection(WITHDRAWAL_COLLECTION).doc(withdrawal.id).update({
      canRetry: true,
      nextRetryAt,
    });

    logger.info("[onWithdrawalStatusChanged] Withdrawal marked for retry", {
      withdrawalId: withdrawal.id,
      retryCount: withdrawal.retryCount,
      maxRetries: withdrawal.maxRetries,
      nextRetryAt,
    });
  }

  // Handle permanent failure — rollback commissions (GroupAdmin + Affiliate + Unified)
  if (newStatus === "failed" && withdrawal.retryCount >= withdrawal.maxRetries) {
    await rollbackGroupAdminCommissions(withdrawal);
    await rollbackAffiliateCommissions(withdrawal);
    await rollbackUnifiedCommissions(withdrawal);
  }
  if (newStatus === "rejected" || newStatus === "cancelled") {
    await rollbackGroupAdminCommissions(withdrawal);
    await rollbackAffiliateCommissions(withdrawal);
    await rollbackUnifiedCommissions(withdrawal);
  }

  // Clear pendingWithdrawalId on terminal states
  await clearPendingWithdrawalId(withdrawal, newStatus);
}

/**
 * Main trigger function
 */
export const paymentOnWithdrawalStatusChanged = onDocumentUpdated(
  {
    document: `${WITHDRAWAL_COLLECTION}/{withdrawalId}`,
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
    secrets: [TELEGRAM_ENGINE_URL_SECRET, TELEGRAM_ENGINE_API_KEY_SECRET],
  },
  async (event) => {
    ensureInitialized();

    const beforeData = event.data?.before?.data();
    const afterData = event.data?.after?.data();

    if (!beforeData || !afterData) {
      logger.warn("[onWithdrawalStatusChanged] Missing before or after data");
      return;
    }

    const withdrawalId = event.params.withdrawalId;
    const oldStatus = beforeData.status as WithdrawalStatus;
    const newStatus = afterData.status as WithdrawalStatus;

    // Only proceed if status actually changed
    if (oldStatus === newStatus) {
      logger.debug("[onWithdrawalStatusChanged] Status unchanged, skipping", {
        withdrawalId,
        status: oldStatus,
      });
      return;
    }

    const withdrawal = {
      ...afterData,
      id: withdrawalId,
    } as WithdrawalRequest;

    logger.info("[onWithdrawalStatusChanged] Processing status change", {
      withdrawalId,
      oldStatus,
      newStatus,
      userId: withdrawal.userId,
      userType: withdrawal.userType,
    });

    try {
      // 1. Log status change to audit log
      await logStatusChange(withdrawal, oldStatus, newStatus);

      // 2. Get payment configuration
      const config = await getPaymentConfig();

      // 3. Send user notification for the new status (multi-language)
      const statusMessage = STATUS_MESSAGES[newStatus];
      if (statusMessage) {
        const formattedAmount = `$${(withdrawal.amount / 100).toFixed(2)}`;

        // Build translated messages with amount
        const titleTranslations = { ...statusMessage.title };
        const messageTranslations: Record<string, string> = {};
        for (const [lang, msg] of Object.entries(statusMessage.message)) {
          messageTranslations[lang] = msg.replace(
            /Your withdrawal|Votre retrait|Su retiro|Ihre Auszahlung|O seu saque|Ваш вывод|سحبك|您的提款|आपकी निकासी/,
            (match: string) => `${match} (${formattedAmount})`
          );
        }

        await createUserNotification(
          withdrawal,
          titleTranslations.en || statusMessage.title.en,
          messageTranslations.en || statusMessage.message.en,
          {
            oldStatus,
            newStatus,
            providerTransactionId: withdrawal.providerTransactionId,
          },
          titleTranslations,
          messageTranslations
        );
      }

      // 4. Send admin notification if applicable
      await sendAdminNotification(withdrawal, oldStatus, newStatus, config);

      // 4b. Notify user via email + Telegram on failure
      if (newStatus === "failed") {
        await notifyUserWithdrawalFailed(withdrawal);
      }

      // 4c. Send transactional email for other key status changes
      if (newStatus !== "failed") {
        await sendStatusChangeEmail(withdrawal, newStatus);
      }

      // 4d. Send Telegram DM for key status changes
      if (newStatus !== "failed") {
        await sendStatusChangeTelegram(withdrawal, newStatus);
      }

      // 5. Handle specific status transitions
      await handleStatusTransition(withdrawal, oldStatus, newStatus);

      // 6. Notify Motivation Engine (non-blocking)
      notifyMotivationEngine("chatter.withdrawal_status_changed", withdrawal.userId, {
        withdrawalId,
        amountCents: withdrawal.amount,
        oldStatus,
        newStatus,
      }).catch((err) => {
        logger.warn("[onWithdrawalStatusChanged] Failed to notify Motivation Engine", { error: err });
      });

      // 7. Forward to Telegram Engine (fire-and-forget)
      forwardEventToEngine("withdrawal.status", withdrawal.userId, {
        withdrawalId,
        amount: withdrawal.amount,
        oldStatus,
        newStatus,
        userType: withdrawal.userType,
        userName: withdrawal.userName,
        method: withdrawal.provider,
      });

      logger.info("[onWithdrawalStatusChanged] Status change processing complete", {
        withdrawalId,
        oldStatus,
        newStatus,
      });
    } catch (error) {
      logger.error("[onWithdrawalStatusChanged] Error processing status change", {
        withdrawalId,
        oldStatus,
        newStatus,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Don't throw - we don't want to retry the trigger
    }
  }
);
