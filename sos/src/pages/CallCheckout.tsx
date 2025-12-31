// src/pages/CallCheckout.tsx
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useContext,
} from "react";
import {
  ArrowLeft,
  Clock,
  Shield,
  AlertCircle,
  CreditCard,
  Lock,
  Calendar,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLocaleNavigate } from "../multilingual-system";
import { useAuth } from "../contexts/AuthContext";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { functions, db } from "../config/firebase";
import { httpsCallable, HttpsCallable } from "firebase/functions";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { Provider, normalizeProvider } from "../types/provider";
import Layout from "../components/layout/Layout";
import {
  detectUserCurrency,
  usePricingConfig,
} from "../services/pricingService";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { useForm } from "react-hook-form";
import { saveProviderMessage } from "@/firebase/saveProviderMessage";
import { useApp } from "@/contexts/AppContext";
import { FormattedMessage, useIntl } from "react-intl";
import { formatCurrency } from "../utils/localeFormatters";
import { getDateLocale } from "../utils/formatters";
import { usePaymentGateway } from "../hooks/usePaymentGateway";
import { PayPalPaymentForm, GatewayIndicator } from "../components/payment";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";

/* -------------------------- Stripe singleton (HMR-safe) ------------------ */
// Conserve la même Promise Stripe à travers les rechargements HMR.
// → Empêche: "Unsupported prop change on Elements: you cannot change the `stripe` prop after setting it."
declare global {
   
  var __STRIPE_PROMISE__: Promise<Stripe | null> | undefined;
}
const getStripePromise = (): Promise<Stripe | null> => {
  if (!globalThis.__STRIPE_PROMISE__) {
    const pk = import.meta.env.VITE_STRIPE_PUBLIC_KEY as string;
    globalThis.__STRIPE_PROMISE__ = loadStripe(pk);
  }
  return globalThis.__STRIPE_PROMISE__;
};
const stripePromise = getStripePromise();

/* --------------------------------- Types --------------------------------- */
type Currency = "eur" | "usd";
type ServiceKind = "lawyer" | "expat";
type Lang = "fr" | "en" | "es" | "de" | "ru" | "pt" | "ch" | "hi" | "ar";

interface ServiceData {
  providerId: string;
  serviceType: "lawyer_call" | "expat_call";
  providerRole: ServiceKind;
  amount: number;
  duration: number;
  clientPhone: string;
  commissionAmount: number;
  providerAmount: number;
  currency?: Currency;
}

interface User {
  uid?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  fullName?: string;
}

interface PaymentIntentData {
  amount: number;
  currency?: string;
  serviceType: "lawyer_call" | "expat_call";
  providerId: string;
  clientId: string;
  clientEmail?: string;
  providerName?: string;
  description?: string;
  commissionAmount: number;
  providerAmount: number;
  callSessionId?: string;
  metadata?: Record<string, string>;
  coupon?: {
    code: string;
    type: "fixed" | "percentage";
    amount: number;
    maxDiscount?: number;
  };
}

interface PaymentIntentResponse {
  success: boolean;
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  serviceType: string;
  status: string;
  expiresAt: string;
}

interface CreateAndScheduleCallData {
  providerId: string;
  clientId: string;
  providerPhone: string;
  clientPhone: string;
  serviceType: "lawyer_call" | "expat_call";
  providerType: ServiceKind;
  paymentIntentId: string;
  amount: number;
  currency: "EUR" | "USD";
  delayMinutes?: number;
  clientLanguages?: string[];
  providerLanguages?: string[];
  clientWhatsapp?: string;
  callSessionId?: string;
}

type StepType = "payment" | "calling" | "completed";

interface CallCheckoutProps {
  selectedProvider?: Provider;
  serviceData?: Partial<ServiceData>;
  onGoBack?: () => void;
}

/* --------- Provider extras (pour éviter les "any" dans le fichier) ------- */
type ProviderExtras = {
  profilePhoto?: string;
  phoneNumber?: string;
  phone?: string;
  languagesSpoken?: string[];
  languages?: string[];
  country?: string;
  countryCode?: string;
  avatar?: string;
  email?: string;
  name?: string;
  fullName?: string;
  role?: ServiceKind;
  type?: ServiceKind;
};
type ProviderWithExtras = Provider & ProviderExtras;

/* ------------------------- Callable error logger ------------------------- */
type CallableErrShape = { code?: string; message?: string; details?: unknown };
const logCallableError = (label: string, e: unknown): void => {
  const r = (e as CallableErrShape) || {};
  console.error(label, r.code, r.message, r.details);
};

/* --------------------------------- gtag ---------------------------------- */
type GtagFunction = (...args: unknown[]) => void;
interface GtagWindow {
  gtag?: GtagFunction;
}
const getGtag = (): GtagFunction | undefined =>
  typeof window !== "undefined"
    ? (window as unknown as GtagWindow).gtag
    : undefined;

/* -------------------------------- i18n ----------------------------------- */
const useTranslation = () => {
  // const { language: ctxLang } = { language: "fr" as Lang };
  const { language: ctxLang } = useApp();
  // const language: Lang = ctxLang === "en" ? "en" : "fr";
  const language: Lang = (
    ["es", "de", "ru", "en", "fr", "hi", "ch", "pt", "ar"].includes(ctxLang) ? ctxLang : "fr"
  ) as Lang;

 const dict: Record<string, Record<Lang, string>> = {
    "meta.title": {
      fr: "Paiement & Mise en relation - SOS Expats",
      en: "Checkout & Connection - SOS Expats",
      es: "Pago y Conexión - SOS Expats",
      de: "Zahlung und Verbindung - SOS Expats",
      ru: "Оплата и подключение - SOS Expats",
      hi: "भुगतान और कनेक्शन - SOS Expats",
      ch: "结帐和连接 - 求救 外籍人士",
      pt: "Pagamento e Conexão - SOS Expats",
      ar: "الدفع والاتصال - SOS المغتربين"
    },
    "meta.description": {
      fr: "Réglez en toute sécurité et lancez votre consultation avec l'expert sélectionné.",
      en: "Pay securely and start your consultation with the selected expert.",
      es: "Pague con seguridad e inicie su consulta con el experto seleccionado.",
      de: "Zahlen Sie sicher und starten Sie Ihre Beratung mit dem ausgewählten Experten.",
      ru: "Платите безопасно и начните консультацию с выбранным экспертом.",
      hi: "सुरक्षित रूप से भुगतान करें और चयनित विशेषज्ञ के साथ अपना परामर्श शुरू करें।",
      ch: "安全支付后，即可开始与您选择的专家进行咨询。",
      pt: "Pague com segurança e inicie sua consulta com o especialista selecionado.",
      ar: "ادفع بشكل آمن وابدأ استشارتك مع الخبير المختار."
    },
    "meta.keywords": {
      fr: "paiement, consultation, avocat, expatriés, SOS Expats, appel",
      en: "payment, consultation, lawyer, expats, call",
      es: "pago, consulta, abogado, expatriados, SOS Expats, llamada",
      de: "zahlung, beratung, anwalt, expats, anruf",
      ru: "платеж, консультация, адвокат, экспаты, звонок",
      hi: "भुगतान, परामर्श, वकील, प्रवासी, कॉल",
      ch: "付款、咨询、律师、外籍人士、电话",
      pt: "pagamento, consulta, advogado, expatriados, SOS Expats, chamada",
      ar: "الدفع، الاستشارة، المحامي، المغتربين، الاتصال"
    },
    "meta.og_title": {
      fr: "Paiement sécurisé - SOS Expats",
      en: "Secure Checkout - SOS Expats",
      es: "Pago seguro - SOS Expats",
      de: "Sichere Zahlung - SOS Expats",
      ru: "Безопасная оплата - SOS Expats",
      hi: "सुरक्षित भुगतान - SOS Expats",
      ch: "安全结账 - 求救 外籍人士",
      pt: "Pagamento Seguro - SOS Expats",
      ar: 'الدفع الآمن - SOS المغتربين'
    },
    "meta.og_description": {
      fr: "Paiement SSL, mise en relation automatique avec votre expert.",
      en: "SSL payment, automatic connection with your expert.",
      es: "Pago SSL, conexión automática con su experto.",
      de: "SSL-Zahlung, automatische Verbindung mit Ihrem Experten.",
      ru: "SSL-платеж, автоматическое подключение к вашему эксперту.",
      hi: "SSL भुगतान, आपके विशेषज्ञ के साथ स्वचालित कनेक्शन।",
      ch: "SSL支付，自动连接您的专家。",
      pt: "Pagamento SSL, conexão automática com seu especialista.",
      ar: "الدفع عبر SSL، اتصال تلقائي مع خبيرك."
    },
    "meta.og_image_alt": {
      fr: "Paiement SOS Expats",
      en: "SOS Expats Checkout",
      es: "Pago SOS Expats",
      de: "SOS Expats Zahlung",
      ru: "Платеж SOS Expats",
      hi: "SOS Expats भुगतान",
      ch: "SOS 外籍人士结账",
      pt: "Pagamento SOS Expats",
      ar: "تسجيل الخروج من خدمة SOS للمغتربين"
    },
    "meta.twitter_image_alt": {
      fr: "Interface de paiement SOS Expats",
      en: "SOS Expats checkout interface",
      es: "Interfaz de pago SOS Expats",
      de: "SOS Expats-Zahlungsschnittstelle",
      ru: "Интерфейс оплаты SOS Expats",
      hi: "SOS Expats भुगतान इंटरफ़ेस",
      ch: "SOS 外籍人士 结账界面",
      pt: "Interface de pagamento SOS Expats",
      ar: "واجهة الدفع SOS Expats"
    },
    "ui.back": {
      fr: "Retour",
      en: "Back",
      es: "Atrás",
      de: "Zurück",
      ru: "Назад",
      hi: "वापस",
      ch: "后退",
      pt: "Voltar",
      ar: "خلف"
    },
    "ui.securePayment": {
      fr: "Paiement sécurisé",
      en: "Secure payment",
      es: "Pago seguro",
      de: "Sichere Zahlung",
      ru: "Безопасный платеж",
      hi: "सुरक्षित भुगतान",
      ch: "安全支付",
      pt: "Pagamento seguro",
      ar: "الدفع الآمن"
    },
    "ui.connecting": {
      fr: "Mise en relation",
      en: "Connecting",
      es: "Conectando",
      de: "Verbindung wird hergestellt",
      ru: "Подключение",
      hi: "कनेक्ट हो रहा है",
      ch: "正在连接",
      pt: "Conectando",
      ar: "الاتصال"
    },
    "ui.completed": {
      fr: "Consultation terminée",
      en: "Consultation completed",
      es: "Consulta completada",
      de: "Beratung abgeschlossen",
      ru: "Консультация завершена",
      hi: "परामर्श पूर्ण हुआ",
      ch: "咨询完成",
      pt: "Consulta concluída",
      ar: "اكتملت الاستشارة"
    },
    "ui.payToStart": {
      fr: "Validez pour lancer la consultation",
      en: "Confirm to start the consultation",
      es: "Confirmar para iniciar la consulta",
      de: "Bestätigen Sie, um die Beratung zu starten",
      ru: "Подтвердите для начала консультации",
      hi: "परामर्श शुरू करने के लिए पुष्टि करें",
      ch: "确认开始咨询",
      pt: "Confirme para iniciar a consulta",
      ar: "تأكيد لبدء الاستشارة"
    },
    "ui.connectingExpert": {
      fr: "Connexion avec votre expert",
      en: "Connecting to your expert",
      es: "Conectando con tu experto",
      de: "Verbindung mit Ihrem Experten",
      ru: "Подключение к вашему эксперту",
      hi: "आपके विशेषज्ञ से कनेक्ट हो रहे हैं",
      ch: "联系您的专家",
      pt: "Conectando ao seu especialista",
      ar: "التواصل مع خبيرك"
    },
    "ui.thanks": {
      fr: "Merci d'avoir utilisé nos services",
      en: "Thank you for using our services",
      es: "Gracias por usar nuestros servicios",
      de: "Danke, dass Sie unsere Dienste nutzen",
      ru: "Спасибо за использование наших услуг",
      hi: "हमारी सेवाओं का उपयोग करने के लिए धन्यवाद",
      ch: "感谢您使用我们的服务",
      pt: "Obrigado por usar nossos serviços",
      ar: "شكرا لك على استخدام خدماتنا"
    },
    "card.title": {
      fr: "Paiement",
      en: "Payment",
      es: "Pago",
      de: "Zahlung",
      ru: "Платеж",
      hi: "भुगतान",
      ch: "支付",
      pt: "Pagamento",
      ar: "قسط"
    },
    "card.number": {
      fr: "Numéro de carte",
      en: "Card number",
      es: "Número de tarjeta",
      de: "Kartennummer",
      ru: "Номер карты",
      hi: "कार्ड नंबर",
      ch: "卡号",
      pt: "Número do cartão",
      ar: "رقم البطاقة"
    },
    "card.expiry": {
      fr: "Expiration",
      en: "Expiry",
      es: "Vencimiento",
      de: "Ablaufdatum",
      ru: "Срок действия",
      hi: "समाप्ति तिथि",
      ch: "到期日",
      pt: "Validade",
      ar: "انتهاء الصلاحية"
    },
    "card.cvc": {
      fr: "CVC",
      en: "CVC",
      es: "CVC",
      de: "CVC",
      ru: "CVC",
      hi: "CVC",
      ch: "中央VC",
      pt: "CVC",
      ar: "رمز التحقق من البطاقة"
    },
    "summary.title": {
      fr: "Récapitulatif",
      en: "Summary",
      es: "Resumen",
      de: "Zusammenfassung",
      ru: "Сводка",
      hi: "सारांश",
      ch: "概括",
      pt: "Resumo",
      ar: "ملخص"
    },
    "summary.expert": {
      fr: "Expert",
      en: "Expert",
      es: "Experto",
      de: "Experte",
      ru: "Эксперт",
      hi: "विशेषज्ञ",
      ch: "专家",
      pt: "Especialista",
      ar: "خبير"
    },
    "summary.service": {
      fr: "Service",
      en: "Service",
      es: "Servicio",
      de: "Dienstleistung",
      ru: "Услуга",
      hi: "सेवा",
      ch: "服务",
      pt: "Serviço",
      ar: "خدمة"
    },
    "summary.duration": {
      fr: "Durée",
      en: "Duration",
      es: "Duración",
      de: "Dauer",
      ru: "Продолжительность",
      hi: "अवधि",
      ch: "期间",
      pt: "Duração",
      ar: "مدة"
    },
    "summary.total": {
      fr: "Total",
      en: "Total",
      es: "Total",
      de: "Gesamt",
      ru: "Всего",
      hi: "कुल",
      ch: "全部的",
      pt: "Total",
      ar: "المجموع"
    },
    "btn.pay": {
      fr: "Payer",
      en: "Pay",
      es: "Pagar",
      de: "Zahlen",
      ru: "Оплатить",
      hi: "भुगतान करें",
      ch: "支付",
      pt: "Pagar",
      ar: "يدفع"
    },
    "btn.evaluate": {
      fr: "Évaluer",
      en: "Review",
      es: "Reseña",
      de: "Bewertung",
      ru: "Отзыв",
      hi: "समीक्षा करें",
      ch: "审查",
      pt: "Avaliar",
      ar: "مراجعة"
    },
    "btn.receipt": {
      fr: "Télécharger le reçu",
      en: "Download receipt",
      es: "Descargar recibo",
      de: "Quittung herunterladen",
      ru: "Загрузить квитанцию",
      hi: "रसीद डाउनलोड करें",
      ch: "下载收据",
      pt: "Baixar recibo",
      ar: "تنزيل الإيصال"
    },
    "btn.home": {
      fr: "Retour à l'accueil",
      en: "Back to home",
      es: "Volver a inicio",
      de: "Zurück zur Startseite",
      ru: "Вернуться на главную",
      hi: "होम पर वापस जाएं",
      ch: "回到家",
      pt: "Voltar ao início",
      ar: "العودة إلى المنزل"
    },
    "status.paid": {
      fr: "Paiement confirmé",
      en: "Payment confirmed",
      es: "Pago confirmado",
      de: "Zahlung bestätigt",
      ru: "Платеж подтвержден",
      hi: "भुगतान की पुष्टि हुई",
      ch: "付款已确认",
      pt: "Pagamento confirmado",
      ar: "تم تأكيد الدفع"
    },
    "status.expertContacted": {
      fr: "Expert contacté(e)",
      en: "Expert contacted",
      es: "Experto contactado",
      de: "Experte kontaktiert",
      ru: "Эксперт связан",
      hi: "विशेषज्ञ से संपर्क किया गया",
      ch: "已联系专家",
      pt: "Especialista contatado",
      ar: "تم الاتصال بالخبير"
    },
    "status.callStarted": {
      fr: "Consultation démarrée",
      en: "Consultation started",
      es: "Consulta iniciada",
      de: "Beratung gestartet",
      ru: "Консультация начата",
      hi: "परामर्श शुरू हुआ",
      ch: "咨询开始",
      pt: "Consulta iniciada",
      ar: "بدأت التشاور"
    },
    "alert.missingDataTitle": {
      fr: "Données manquantes",
      en: "Missing data",
      es: "Datos faltantes",
      de: "Fehlende Daten",
      ru: "Отсутствующие данные",
      hi: "डेटा गायब है",
      ch: "缺失数据",
      pt: "Dados ausentes",
      ar: "بيانات مفقودة"
    },
    "alert.missingDataText": {
      fr: "Veuillez sélectionner à nouveau un expert.",
      en: "Please select an expert again.",
      es: "Por favor, selecciona un experto nuevamente.",
      de: "Bitte wählen Sie einen Experten erneut aus.",
      ru: "Пожалуйста, выберите эксперта снова.",
      hi: "कृपया फिर से एक विशेषज्ञ चुनें।",
      ch: "请再次选择专家。",
      pt: "Por favor, selecione um especialista novamente.",
      ar: "يرجى اختيار الخبير مرة أخرى."
    },
    "alert.loginRequiredTitle": {
      fr: "Connexion requise",
      en: "Login required",
      es: "Inicio de sesión requerido",
      de: "Anmeldung erforderlich",
      ru: "Требуется вход",
      hi: "लॉगिन आवश्यक है",
      ch: "需要登录",
      pt: "Login necessário",
      ar: "تسجيل الدخول مطلوب"
    },
    "alert.loginRequiredText": {
      fr: "Connectez-vous pour lancer une consultation.",
      en: "Sign in to start a consultation.",
      es: "Inicia sesión para comenzar una consulta.",
      de: "Melden Sie sich an, um eine Beratung zu starten.",
      ru: "Войдите для начала консультации.",
      hi: "परामर्श शुरू करने के लिए साइन इन करें।",
      ch: "登录即可开始咨询。",
      pt: "Faça login para iniciar uma consulta.",
      ar: 'قم بتسجيل الدخول لبدء الاستشارة.'
    },
    "banner.secure": {
      fr: "Paiement sécurisé",
      en: "Secure payment",
      es: "Pago seguro",
      de: "Sichere Zahlung",
      ru: "Безопасный платеж",
      hi: "सुरक्षित भुगतान",
      ch: "安全支付",
      pt: "Pagamento seguro",
      ar: "الدفع الآمن"
    },
    "banner.ssl": {
      fr: "Données protégées par SSL. Appel lancé automatiquement après paiement.",
      en: "Data protected by SSL. Call launched automatically after payment.",
      es: "Datos protegidos por SSL. Llamada iniciada automáticamente después del pago.",
      de: "Daten durch SSL geschützt. Anruf startet automatisch nach Zahlung.",
      ru: "Данные защищены SSL. Звонок начинается автоматически после оплаты.",
      hi: "SSL द्वारा सुरक्षित डेटा। भुगतान के बाद स्वचालित रूप से कॉल शुरू होती है।",
      ch: "数据受 SSL 加密保护。付款后自动发起通话。",
      pt: "Dados protegidos por SSL. Chamada iniciada automaticamente após o pagamento.",
      ar: 'البيانات محمية بـ SSL. يتم تشغيل المكالمة تلقائيًا بعد الدفع.'
    },
    "err.invalidConfig": {
      fr: "Configuration de paiement invalide",
      en: "Invalid payment configuration",
      es: "Configuración de pago inválida",
      de: "Ungültige Zahlungskonfiguration",
      ru: "Неверная конфигурация платежа",
      hi: "अमान्य भुगतान कॉन्फ़िगरेशन",
      ch: "支付配置无效",
      pt: "Configuração de pagamento inválida",
      ar: "تكوين الدفع غير صالح"
    },
    "err.unauth": {
      fr: "Utilisateur non authentifié",
      en: "Unauthenticated user",
      es: "Usuario no autenticado",
      de: "Nicht authentifizierter Benutzer",
      ru: "Неаутентифицированный пользователь",
      hi: "अप्रमाणित उपयोगकर्ता",
      ch: "未经身份验证的用户",
      pt: "Usuário não autenticado",
      ar: "مستخدم غير مُصادق عليه"
    },
    "err.sameUser": {
      fr: "Vous ne pouvez pas réserver avec vous-même",
      en: "You can't book yourself",
      es: "No puedes reservar contigo mismo",
      de: "Du kannst dich nicht selbst buchen",
      ru: "Вы не можете забронировать себя",
      hi: "आप स्वयं को बुक नहीं कर सकते",
      ch: "你不能自己预订。",
      pt: "Você não pode reservar a si mesmo",
      ar: "لا يمكنك حجز نفسك"
    },
    "err.minAmount": {
      fr: "Montant minimum 5€",
      en: "Minimum amount €5",
      es: "Monto mínimo 5€",
      de: "Mindestbetrag 5€",
      ru: "Минимальная сумма 5€",
      hi: "न्यूनतम राशि €5",
      ch: "最低金额 €5",
      pt: "Valor mínimo €5",
      ar: "الحد الأدنى للمبلغ 5 يورو"
    },
    "err.maxAmount": {
      fr: "Montant maximum 500€",
      en: "Maximum amount €500",
      es: "Monto máximo 500€",
      de: "Höchstbetrag 500€",
      ru: "Максимальная сумма 500€",
      hi: "अधिकतम राशि €500",
      ch: "最高金额 500 欧元",
      pt: "Valor máximo €500",
      ar: "الحد الأقصى للمبلغ 500 يورو"
    },
    "err.amountMismatch": {
      fr: "Montant invalide. Merci de réessayer.",
      en: "Invalid amount. Please try again.",
      es: "Monto inválido. Por favor, intenta de nuevo.",
      de: "Ungültiger Betrag. Bitte versuchen Sie es erneut.",
      ru: "Неверная сумма. Пожалуйста, попробуйте снова.",
      hi: "अमान्य राशि। कृपया पुनः प्रयास करें।",
      ch: "金额无效，请重试。",
      pt: "Valor inválido. Por favor, tente novamente.",
      ar: "المبلغ غير صحيح. يُرجى المحاولة مرة أخرى."
    },
    "err.noClientSecret": {
      fr: "ClientSecret manquant",
      en: "Missing ClientSecret",
      es: "ClientSecret faltante",
      de: "ClientSecret fehlt",
      ru: "ClientSecret отсутствует",
      hi: "ClientSecret गायब है",
      ch: "缺少客户端密钥",
      pt: "ClientSecret ausente",
      ar: "سر العميل مفقود"
    },
    "err.noCardElement": {
      fr: "Champ carte introuvable",
      en: "Card field not found",
      es: "Campo de tarjeta no encontrado",
      de: "Kartenfeld nicht gefunden",
      ru: "Поле карты не найдено",
      hi: "कार्ड फ़ील्ड नहीं मिला",
      ch: "未找到卡字段",
      pt: "Campo de cartão não encontrado",
      ar: "لم يتم العثور على حقل البطاقة"
    },
    "err.stripe": {
      fr: "Erreur de paiement Stripe",
      en: "Stripe payment error",
      es: "Error de pago en Stripe",
      de: "Stripe-Zahlungsfehler",
      ru: "Ошибка платежа Stripe",
      hi: "Stripe भुगतान त्रुटि",
      ch: "条纹支付错误",
      pt: "Erro de pagamento Stripe",
      ar: "خطأ في الدفع الشريطي"
    },
    "err.paymentFailed": {
      fr: "Le paiement a échoué",
      en: "Payment failed",
      es: "El pago falló",
      de: "Zahlung fehlgeschlagen",
      ru: "Платеж не прошел",
      hi: "भुगतान विफल रहा",
      ch: "付款失败",
      pt: "Pagamento falhou",
      ar: "فشل الدفع"
    },
    "err.actionRequired": {
      fr: "Authentification supplémentaire requise",
      en: "Additional authentication required",
      es: "Se requiere autenticación adicional",
      de: "Zusätzliche Authentifizierung erforderlich",
      ru: "Требуется дополнительная аутентификация",
      hi: "अतिरिक्त प्रमाणीकरण आवश्यक है",
      ch: "需要额外的身份验证",
      pt: "Autenticação adicional necessária",
      ar: "مطلوب مصادقة إضافية"
    },
    "err.invalidMethod": {
      fr: "Méthode de paiement invalide",
      en: "Invalid payment method",
      es: "Método de pago inválido",
      de: "Ungültige Zahlungsmethode",
      ru: "Неверный способ оплаты",
      hi: "अमान्य भुगतान विधि",
      ch: "付款方式无效",
      pt: "Método de pagamento inválido",
      ar: "طريقة الدفع غير صالحة"
    },
    "err.canceled": {
      fr: "Le paiement a été annulé",
      en: "Payment was canceled",
      es: "El pago fue cancelado",
      de: "Zahlung wurde storniert",
      ru: "Платеж отменен",
      hi: "भुगतान रद्द किया गया",
      ch: "付款已取消",
      pt: "O pagamento foi cancelado",
      ar: "تم إلغاء الدفع"
    },
    "err.unexpectedStatus": {
      fr: "Statut de paiement inattendu",
      en: "Unexpected payment status",
      es: "Estado de pago inesperado",
      de: "Unerwarteter Zahlungsstatus",
      ru: "Неожиданный статус платежа",
      hi: "अप्रत्याशित भुगतान स्थिति",
      ch: "意外的付款状态",
      pt: "Status de pagamento inesperado",
      ar: "حالة الدفع غير المتوقعة"
    },
    "err.genericPayment": {
      fr: "Une erreur est survenue lors du paiement",
      en: "An error occurred during payment",
      es: "Ocurrió un error durante el pago",
      de: "Während der Zahlung ist ein Fehler aufgetreten",
      ru: "При оплате произошла ошибка",
      hi: "भुगतान के दौरान एक त्रुटि हुई",
      ch: "付款过程中发生错误",
      pt: "Ocorreu um erro durante o pagamento",
      ar: "حدث خطأ أثناء الدفع"
    },
    "err.invalidPhone": {
      fr: "Numéro de téléphone invalide",
      en: "Invalid phone number",
      es: "Número de teléfono inválido",
      de: "Ungültige Telefonnummer",
      ru: "Неверный номер телефона",
      hi: "अमान्य फ़ोन नंबर",
      ch: "电话号码无效",
      pt: "Número de telefone inválido",
      ar: "رقم الهاتف غير صالح"
    },
  };


  const t = (key: keyof typeof dict, fallback?: string) =>
    dict[key]?.[language] ?? fallback ?? String(key);

  return { t, language };
};

/* ------------------------------ SEO helpers ------------------------------ */
const useSEO = (meta: {
  title: string;
  description: string;
  keywords: string;
  ogTitle: string;
  ogDescription: string;
  canonicalUrl: string;
  alternateUrls: Record<"fr" | "en", string>;
  structuredData: Record<string, unknown>;
  locale: Lang;
  ogImagePath: string;
  twitterImagePath: string;
  ogImageAlt: string;
  twitterImageAlt: string;
}) => {
  useEffect(() => {
    document.title = meta.title;
    const updateMeta = (name: string, content: string, property = false) => {
      const attr = property ? "property" : "name";
      let el = document.querySelector(
        `meta[${attr}="${name}"]`
      ) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.content = content;
    };

    updateMeta("description", meta.description);
    updateMeta("keywords", meta.keywords);
    updateMeta(
      "robots",
      "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
    );
    updateMeta("og:type", "website", true);
    updateMeta("og:title", meta.ogTitle, true);
    updateMeta("og:description", meta.ogDescription, true);
    updateMeta("og:url", meta.canonicalUrl, true);
    updateMeta("og:site_name", "SOS Expats", true);

    const ogLocale =
      meta.locale === "fr"
        ? "fr_FR"
        : meta.locale === "en"
          ? "en_US"
          : `${String(meta.locale)}_${String(meta.locale).toUpperCase()}`;
    updateMeta("og:locale", ogLocale, true);

    updateMeta("og:image", meta.ogImagePath, true);
    updateMeta("og:image:alt", meta.ogImageAlt, true);
    updateMeta("og:image:width", "1200", true);
    updateMeta("og:image:height", "630", true);

    updateMeta("twitter:card", "summary_large_image");
    updateMeta("twitter:site", "@sos-expat");
    updateMeta("twitter:creator", "@sos-expat");
    updateMeta("twitter:title", meta.ogTitle);
    updateMeta("twitter:description", meta.ogDescription);
    updateMeta("twitter:image", meta.twitterImagePath);
    updateMeta("twitter:image:alt", meta.twitterImageAlt);

    let canonical = document.querySelector(
      'link[rel="canonical"]'
    ) as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = meta.canonicalUrl;

    document
      .querySelectorAll('link[rel="alternate"][hreflang]')
      .forEach((l) => l.parentElement?.removeChild(l));
    Object.entries(meta.alternateUrls).forEach(([lang, url]) => {
      const el = document.createElement("link");
      el.rel = "alternate";
      el.hreflang = lang;
      el.href = url;
      document.head.appendChild(el);
    });
    const xDef = document.createElement("link");
    xDef.rel = "alternate";
    xDef.hreflang = "x-default";
    xDef.href = meta.alternateUrls.fr;
    document.head.appendChild(xDef);

    let ld = document.querySelector(
      "#structured-data"
    ) as HTMLScriptElement | null;
    if (!ld) {
      ld = document.createElement("script");
      ld.id = "structured-data";
      ld.type = "application/ld+json";
      document.head.appendChild(ld);
    }
    ld.textContent = JSON.stringify(meta.structuredData);
  }, [meta]);
};

/* ------------------------ Helpers: device & phone utils ------------------ */
const toE164 = (raw?: string) => {
  if (!raw) return "";
  const p = parsePhoneNumberFromString(raw);
  return p?.isValid() ? p.number : "";
};

/* ------------------- Hook mobile (corrige la règle des hooks) ------------ */
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 640px), (pointer: coarse)");
    const update = () => setIsMobile(!!mq.matches);
    update();

    if ("addEventListener" in mq) {
      mq.addEventListener("change", update);
      return () => mq.removeEventListener("change", update);
    } else {
      // @ts-expect-error legacy Safari
      mq.addListener(update);
      // @ts-expect-error legacy Safari
      return () => mq.removeListener(update);
    }
  }, []);

  return isMobile;
}

/* --------------------- Price tracing: hook & helpers --------------------- */
interface PricingEntryTrace {
  totalAmount: number;
  connectionFeeAmount: number;
  providerAmount: number;
  duration: number;
}
interface PricingConfigShape {
  lawyer: Record<Currency, PricingEntryTrace>;
  expat: Record<Currency, PricingEntryTrace>;
}
type TraceAttributes = {
  [K in `data-${string}`]?: string | number;
} & { title?: string };

function usePriceTracing() {
  const { pricing, loading } = usePricingConfig() as {
    pricing?: PricingConfigShape;
    loading: boolean;
  };

  const getTraceAttributes = (
    serviceType: ServiceKind,
    currency: Currency,
    providerOverride?: number
  ): TraceAttributes => {
    if (loading) {
      return {
        "data-price-source": "loading",
        "data-currency": currency,
        title: "Prix en cours de chargement...",
      };
    }

    if (typeof providerOverride === "number") {
      return {
        "data-price-source": "provider",
        "data-currency": currency,
        "data-service-type": serviceType,
        title: `Prix personnalisé prestataire (${providerOverride}${currency === "eur" ? "€" : "$"})`,
      };
    }

    if (pricing) {
      const cfg = pricing[serviceType][currency];
      return {
        "data-price-source": "admin",
        "data-currency": currency,
        "data-service-type": serviceType,
        "data-total-amount": cfg.totalAmount,
        "data-connection-fee": cfg.connectionFeeAmount,
        "data-provider-amount": cfg.providerAmount,
        "data-duration": cfg.duration,
        title: `Prix admin: ${cfg.totalAmount}${currency === "eur" ? "€" : "$"} • Frais: ${cfg.connectionFeeAmount}${currency === "eur" ? "€" : "$"} • Provider: ${cfg.providerAmount}${currency === "eur" ? "€" : "$"} • ${cfg.duration}min`,
      };
    }

    return {
      "data-price-source": "fallback",
      "data-currency": currency,
      title: "Prix de secours (admin indisponible)",
    };
  };

  return { getTraceAttributes };
}

/* -------------------------- Stripe card element opts --------------------- */
const cardElementOptions = {
  style: {
    base: {
      fontSize: "16px",
      color: "#1f2937",
      letterSpacing: "0.025em",
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontWeight: "500",
      "::placeholder": { color: "#9ca3af", fontWeight: "400" },
    },
    invalid: { color: "#ef4444", iconColor: "#ef4444" },
    complete: { color: "#10b981", iconColor: "#10b981" },
  },
} as const;

const singleCardElementOptions = {
  style: cardElementOptions.style,
  hidePostalCode: true,
} as const;

/* --------------------------- Confirm Modal UI ---------------------------- */
const ConfirmModal: React.FC<{
  open: boolean;
  title: string;
  message: string;
  cancelLabel?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({ open, title, message, cancelLabel = "Annuler", confirmLabel = "Confirmer", onCancel, onConfirm }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-xl bg-white p-4 shadow-xl border">
        <div className="flex items-start gap-2">
          <div className="p-2 rounded-md bg-blue-100 text-blue-700">
            <Shield className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
            <p className="text-sm text-gray-700">{message}</p>
          </div>
          <button onClick={onCancel} className="p-1 rounded hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-2 rounded-lg border bg-white text-gray-700 hover:bg-gray-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------ Payment Form ----------------------------- */
interface PaymentFormSuccessPayload {
  paymentIntentId: string;
  call: "scheduled" | "skipped";
  callId?: string;
  orderId: string;
}
interface PaymentFormProps {
  user: User;
  provider: ProviderWithExtras;
  service: ServiceData;
  adminPricing: PricingEntryTrace;
  onSuccess: (payload: PaymentFormSuccessPayload) => void;
  onError: (error: string) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  isMobile: boolean;
  activePromo?: {
    code: string;
    discountType: "percentage" | "fixed";
    discountValue: number;
    services: string[];
  } | null;
}

type PhoneFormValues = {
  clientPhone: string;
  currentCountry?: string;
};

type BookingMeta = {
  title?: string;
  description?: string;
  country?: string;
  clientFirstName?: string;
};

/* ---------------------- HttpsError type guard (front) -------------------- */
type HttpsErrorCode =
  | "cancelled"
  | "unknown"
  | "invalid-argument"
  | "deadline-exceeded"
  | "not-found"
  | "already-exists"
  | "permission-denied"
  | "resource-exhausted"
  | "failed-precondition"
  | "aborted"
  | "out-of-range"
  | "unimplemented"
  | "internal"
  | "unavailable"
  | "data-loss"
  | "unauthenticated";

interface FirebaseHttpsError extends Error {
  code: HttpsErrorCode;
  details?: unknown;
}
const isHttpsError = (e: unknown): e is FirebaseHttpsError => {
  if (!e || typeof e !== "object") return false;
  const r = e as Record<string, unknown>;
  return typeof r.code === "string" && typeof r.message === "string";
};

const PaymentForm: React.FC<PaymentFormProps> = React.memo(
  ({
    user,
    provider,
    service,
    adminPricing,
    onSuccess,
    onError,
    isProcessing,
    setIsProcessing,
    isMobile,
    activePromo,
  }) => {
    const stripe = useStripe();
    const elements = useElements();
    const { t, language } = useTranslation();
    const intl = useIntl();
    const { getTraceAttributes } = usePriceTracing();

    // const bookingMeta: BookingMeta = useMemo(() => {
    //   try {
    //     const raw = sessionStorage.getItem("bookingMeta");
    //     const printingRawData = JSON.parse(raw);
    //     console.log("📋 Booking meta:", printingRawData);
    //     return raw ? (JSON.parse(raw) as BookingMeta) : {};
    //   } catch {
    //     return {};
    //   }
    // }, []);

    const bookingMeta: BookingMeta = useMemo(() => {
      // console.log("🔍 Loading bookingMeta from sessionStorage...");

      try {
        const raw = sessionStorage.getItem("bookingMeta");
        // console.log("📋 Raw value:", raw); // ✅ Log BEFORE parsing

        if (!raw) {
          console.warn("⚠️ bookingMeta not found in sessionStorage");
          return {};
        }

        const parsed = JSON.parse(raw) as BookingMeta;
        // console.log("✅ Parsed bookingMeta:", parsed);

        return parsed;
      } catch (error) {
        console.error("❌ Error parsing bookingMeta:", error); // ✅ Log errors
        return {};
      }
    }, []);

    const serviceCurrency = (
      service.currency || "eur"
    ).toLowerCase() as Currency;
    const currencySymbol = serviceCurrency === "usd" ? "$" : "€";
    const stripeCurrency = serviceCurrency;

    const priceInfo = useMemo(
      () =>
        getTraceAttributes(
          service.serviceType === "lawyer_call" ? "lawyer" : "expat",
          serviceCurrency
        ),
      [getTraceAttributes, service.serviceType, serviceCurrency]
    );

    const [showConfirm, setShowConfirm] = useState(false);
    const [pendingSubmit, setPendingSubmit] = useState<
      (() => Promise<void>) | null
    >(null);

    // P0-1 FIX: callSessionId stable généré UNE SEULE FOIS pour garantir l'idempotence
    // NE PAS utiliser Date.now() dans actuallySubmitPayment car cela crée une nouvelle clé à chaque retry
    const [stableCallSessionId] = useState(() =>
      `call_session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    );

    const { watch, setError } = useForm<PhoneFormValues>({
      defaultValues: {
        clientPhone: service?.clientPhone || "",
        currentCountry: "",
      },
    });

    const validatePaymentData = useCallback(() => {
      if (!stripe || !elements) throw new Error(t("err.invalidConfig"));
      if (!user?.uid) throw new Error(t("err.unauth"));
      if (provider.id === user.uid) throw new Error(t("err.sameUser"));
      if (adminPricing.totalAmount < 5) throw new Error(t("err.minAmount"));
      if (adminPricing.totalAmount > 500) throw new Error(t("err.maxAmount"));
      const eq = Math.abs(service.amount - adminPricing.totalAmount) < 0.01;
      if (!eq) throw new Error(t("err.amountMismatch"));
    }, [
      stripe,
      elements,
      user,
      provider.id,
      service.amount,
      adminPricing.totalAmount,
      t,
    ]);

    const persistPaymentDocs = useCallback(
      async (paymentIntentId: string) => {
        const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        const baseDoc = {
          paymentIntentId,
          providerId: provider.id,
          providerName: provider.fullName || provider.name || "",
          providerRole: provider.role || provider.type || "expat",
          clientId: user.uid!,
          clientEmail: user.email || "",
          clientName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
          clientPhone: watch("clientPhone"),
          clientWhatsapp: "",
          serviceType: service.serviceType,
          duration: adminPricing.duration,
          amount: adminPricing.totalAmount,
          commissionAmount: adminPricing.connectionFeeAmount,
          providerAmount: adminPricing.providerAmount,
          currency: serviceCurrency,
          status: "pending",
          createdAt: serverTimestamp(),
          notifiedAt: null,
        };

        const orderDoc = {
          id: orderId,
          amount: adminPricing.totalAmount,
          currency: serviceCurrency as "eur" | "usd",
          paymentIntentId: paymentIntentId,
          providerId: provider.id,
          providerName: provider.fullName || provider.name,
          clientId: user.uid!,
          clientEmail: user.email,
          serviceType: service.serviceType,
          status: "pending",
          createdAt: serverTimestamp(),

          // ✅ Fixed metadata with correct field names
          metadata: {
            price_origin: "standard", // or "override" if custom pricing
            override_label: null, // Set to string if you have custom pricing labels
            original_standard_amount: adminPricing.totalAmount, // ✅ With underscores
            effective_base_amount: adminPricing.totalAmount, // ✅ With underscores
          },

          // ✅ Add coupon support (null for now, but ready for discounts)
          coupon: null, // Will be: { code: "SAVE10", discountAmount: 5.00 }

          // ✅ Add additional fields that might be useful
          totalSaved: 0, // Will calculate: original_standard_amount - amount
          appliedDiscounts: [], // Array of applied discounts
        };

        try {
          await setDoc(doc(db, "payments", paymentIntentId), baseDoc, {
            merge: true,
          });
        } catch {
          /* no-op */
        }
        try {
          await setDoc(
            doc(db, "users", user.uid!, "payments", paymentIntentId),
            baseDoc,
            { merge: true }
          );
        } catch {
          /* no-op */
        }
        try {
          await setDoc(
            doc(db, "providers", provider.id, "payments", paymentIntentId),
            baseDoc,
            { merge: true }
          );
        } catch {
          /* no-op */
        }
        try {
          await setDoc(doc(db, "orders", orderId), orderDoc, { merge: true });
        } catch (error) {
          // no-op
          console.warn("Error creating order:", error);
        }

        console.log("✅ [CALL CHECKOUT] Order created:", orderId);

        return orderId;
      },
      [
        provider,
        user,
        adminPricing,
        serviceCurrency,
        service.serviceType,
        watch,
      ]
    );

    const sendProviderNotifications = useCallback(
      async (
        paymentIntentId: string,
        clientPhoneE164: string,
        providerPhoneE164: string
      ) => {
        try {
          // Anti-doublon
          const paymentDocRef = doc(db, "payments", paymentIntentId);
          const paymentSnap = await getDoc(paymentDocRef);
          if (paymentSnap.exists() && paymentSnap.data()?.notifiedAt) {
            console.log(
              "Notifications already sent for payment:",
              paymentIntentId
            );
            return;
          }

          // ---- Données de la demande
          const title = (
            bookingMeta?.title ||
            intl.formatMessage({ id: "checkout.request.untitled" })
          ).toString();
          const desc = (bookingMeta?.description || "").toString();
          const country = (
            bookingMeta?.country ||
            provider.country ||
            ""
          ).toString();
          const clientFirstName = (
            user.firstName ||
            bookingMeta?.clientFirstName ||
            ""
          ).toString();

          // 1) In-app message
          try {
            await saveProviderMessage(
              provider.id,
              `🔔 ${intl.formatMessage({ id: "checkout.request.paid" })} — ${title}\n\n${desc.slice(0, 600)}${
                country
                  ? `\n\n${intl.formatMessage({ id: "checkout.request.country" })}: ${country}`
                  : ""
              }`,
              {
                clientFirstName,
                requestTitle: title,
                requestDescription: desc,
                requestCountry: country,
                paymentIntentId,
                providerPhone: providerPhoneE164 || null,
              }
            );
          } catch (e) {
            console.warn("saveProviderMessage failed:", e);
          }

          console.log("admin pricing : ", adminPricing.totalAmount);
          // return;
          // 2) SMS + Email via pipeline
          try {
            const enqueueMessageEvent = httpsCallable(
              functions,
              "enqueueMessageEvent"
            );
            await enqueueMessageEvent({
              eventId: "booking_paid_provider",
              // eventId: "handoff.to.provider", -> to check the whatsapp messaging
              locale: getDateLocale(language),
              to: {
                email: provider.email || null,
                phone: providerPhoneE164 || null,
                uid: provider.id,
              },
              context: {
                provider: {
                  id: provider.id,
                  name: provider.fullName || provider.name,
                },
                client: {
                  id: user.uid,
                  firstName: clientFirstName,
                  name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
                  country,
                  phone: clientPhoneE164 || null,
                },
                request: { title, description: desc, country },
                booking: {
                  paymentIntentId,
                  amount: adminPricing.totalAmount,
                  currency: serviceCurrency.toUpperCase(),
                  serviceType: service.serviceType,
                  createdAt: new Date().toISOString(),
                },
              },
            });
            console.log(
              "Provider notifications enqueued successfully for payment:",
              paymentIntentId
            );
          } catch (e) {
            console.warn("enqueueMessageEvent failed");
            console.warn("enqueueMessageEvent failed:", e);
          }

          // Marque comme notifié
          await setDoc(
            paymentDocRef,
            { notifiedAt: serverTimestamp() },
            { merge: true }
          );
          console.log(
            "Provider notifications sent successfully for payment:",
            paymentIntentId
          );
        } catch (notificationError) {
          console.warn(
            "Failed to send provider notifications:",
            notificationError
          );
        }
      },
      [
        provider,
        user,
        service,
        adminPricing,
        serviceCurrency,
        language,
        bookingMeta,
        intl,
      ]
    );

    const actuallySubmitPayment = useCallback(async () => {
      try {
        setIsProcessing(true);
        validatePaymentData();

        // P0-1 FIX: Utiliser le callSessionId STABLE (généré une seule fois)
        // pour garantir l'idempotence en cas de retry
        const callSessionId = stableCallSessionId;

        // P0-3 FIX: Valider le téléphone AVANT le paiement (pas après)
        const clientPhoneForValidation = toE164(watch("clientPhone"));
        if (!/^\+[1-9]\d{8,14}$/.test(clientPhoneForValidation)) {
          setError("clientPhone", {
            type: "validate",
            message: t("err.invalidPhone"),
          });
          throw new Error(t("err.invalidPhone"));
        }

        const createPaymentIntent: HttpsCallable<
          PaymentIntentData,
          PaymentIntentResponse
        > = httpsCallable(functions, "createPaymentIntent");

        // Prepare coupon data
        const couponData = activePromo
          ? {
              code: activePromo.code,
              type: activePromo.discountType,
              amount: activePromo.discountValue,
            }
          : undefined;

        const paymentData: PaymentIntentData = {
          amount: adminPricing.totalAmount,
          commissionAmount: adminPricing.connectionFeeAmount,
          providerAmount: adminPricing.providerAmount,
          currency: stripeCurrency,
          serviceType: service.serviceType,
          providerId: provider.id,
          clientId: user.uid!,
          clientEmail: user.email || "",
          providerName: provider.fullName || provider.name || "",
          description:
            service.serviceType === "lawyer_call"
              ? intl.formatMessage({ id: "checkout.consultation.lawyer" })
              : intl.formatMessage({ id: "checkout.consultation.expat" }),
          metadata: {
            providerType: provider.role || provider.type || "expat",
            duration: String(adminPricing.duration),
            clientName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
            clientPhone: watch("clientPhone"),
            clientWhatsapp: "",
            currency: serviceCurrency,
            requestTitle: bookingMeta?.title || "",
            timestamp: new Date().toISOString(),
            callSessionId: callSessionId,
          },
          // Include coupon information if active
          ...(couponData && { coupon: couponData }),
        };

        console.log("[createPaymentIntent] data", paymentData);

        // -------- LOG ciblé sur la callable (sans `any`)
        let resData: PaymentIntentResponse | null = null;
        try {
          const res = await createPaymentIntent(paymentData);
          resData = res.data as PaymentIntentResponse;
          console.log("[createPaymentIntent] response", resData);
        } catch (e: unknown) {
          logCallableError("[createPaymentIntent:error]", e);
          throw e; // on laisse la gestion d'erreur globale s'occuper de l'affichage
        }

        if (import.meta.env.DEV) {
          console.log("[createPaymentIntent] response", resData);
        }

        const clientSecret = resData?.clientSecret;
        if (!clientSecret) throw new Error(t("err.noClientSecret"));

        const chosenCardElement = isMobile
          ? elements!.getElement(CardElement)
          : elements!.getElement(CardNumberElement);

        if (!chosenCardElement) throw new Error(t("err.noCardElement"));

        const result = await stripe!.confirmCardPayment(clientSecret, {
          payment_method: {
            card: chosenCardElement,
            billing_details: {
              name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
              email: user.email || "",
            },
          },
        });

        if (result.error)
          throw new Error(result.error.message || t("err.stripe"));
        const paymentIntent = result.paymentIntent;
        if (!paymentIntent) throw new Error(t("err.paymentFailed"));

        let status = paymentIntent.status;
        console.log("Status in stripe : ", status);

        // P0 FIX: Gérer correctement 3D Secure (requires_action)
        // P1-1 FIX: Timeout de 10 minutes pour éviter le blocage UI
        if (status === "requires_action" && paymentIntent.client_secret && stripe) {
          console.log("🔐 3D Secure authentication required, handling...");

          const THREE_DS_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

          const handleCardActionWithTimeout = async () => {
            const timeoutPromise = new Promise<never>((_, reject) => {
              setTimeout(() => {
                reject(new Error(t("err.3dsTimeout") || "L'authentification 3D Secure a expiré. Veuillez réessayer."));
              }, THREE_DS_TIMEOUT_MS);
            });

            const actionPromise = stripe.handleCardAction(paymentIntent.client_secret!);

            return Promise.race([actionPromise, timeoutPromise]);
          };

          const { error: confirmError, paymentIntent: confirmedIntent } =
            await handleCardActionWithTimeout();

          if (confirmError) {
            console.error("3D Secure failed:", confirmError);
            throw new Error(confirmError.message || t("err.actionRequired"));
          }

          if (confirmedIntent) {
            status = confirmedIntent.status;
            console.log("3D Secure completed, new status:", status);
          }
        }

        if (!["succeeded", "requires_capture", "processing"].includes(status)) {
          if (status === "requires_action")
            throw new Error(t("err.actionRequired"));
          if (status === "requires_payment_method")
            throw new Error(t("err.invalidMethod"));
          if (status === "canceled") throw new Error(t("err.canceled"));
          throw new Error(`${t("err.unexpectedStatus")}: ${status}`);
        }

        // P0-3 FIX: clientPhone déjà validé avant le paiement
        const clientPhoneE164 = clientPhoneForValidation;
        const providerPhoneE164 = toE164(
          provider.phoneNumber || provider.phone || ""
        );

        // Debug
        console.log("Debug phones:", {
          clientPhoneE164,
          providerPhoneE164,
          userPhone: user?.phone,
          serviceClientPhone: service.clientPhone,
          providerPhone: provider.phone,
          providerPhoneNumber: provider.phoneNumber,
        });

        // Provider phone warning (on ne peut pas bloquer car c'est hors de notre contrôle)
        if (!/^\+[1-9]\d{8,14}$/.test(providerPhoneE164)) {
          console.warn("⚠️ Invalid provider phone - call scheduling may fail:", providerPhoneE164);
        }

        let callStatus: "scheduled" | "skipped" = "skipped";
        let callId: string | undefined;

        // Planifier l'appel si les numéros sont valides
        // Note: clientPhoneE164 est TOUJOURS valide ici grâce à la validation P0-3
        if (
          /^\+[1-9]\d{8,14}$/.test(clientPhoneE164) &&
          /^\+[1-9]\d{8,14}$/.test(providerPhoneE164)
        ) {
          const createAndScheduleCall: HttpsCallable<
            CreateAndScheduleCallData,
            { success: boolean; callId?: string }
          > = httpsCallable(functions, "createAndScheduleCall");

          const callData: CreateAndScheduleCallData = {
            providerId: provider.id,
            clientId: user.uid!,
            providerPhone: providerPhoneE164,
            clientPhone: clientPhoneE164,
            clientWhatsapp: "",
            serviceType: service.serviceType,
            providerType: (provider.role ||
              provider.type ||
              "expat") as ServiceKind,
            paymentIntentId: paymentIntent.id,
            amount: adminPricing.totalAmount,
            currency: serviceCurrency.toUpperCase() as "EUR" | "USD",
            delayMinutes: 5,
            clientLanguages: [language],
            providerLanguages: provider.languagesSpoken ||
              provider.languages || ["fr"],
            callSessionId: callSessionId,
          };

          console.log("[createAndScheduleCall] data", callData);

          try {
            const callResult = await createAndScheduleCall(callData);
            console.log(callResult, " == this is the call result");
            if (callResult && callResult.data && callResult.data.success) {
              console.log("[createAndScheduleCall] success");
              callStatus = "scheduled";
              callId = callResult.data.callId || callSessionId;
            }
          } catch (cfErr: unknown) {
            logCallableError("createAndScheduleCall:error", cfErr);
            // Continue even if call scheduling fails - payment is still successful
          }
        } else {
          console.warn("Missing/invalid phone(s). Skipping call scheduling.");
        }

        const orderId = await persistPaymentDocs(paymentIntent.id);
        void sendProviderNotifications(
          paymentIntent.id,
          clientPhoneE164,
          providerPhoneE164
        );

        const gtag = getGtag();
        gtag?.("event", "checkout_success", {
          service_type: service.serviceType,
          provider_id: provider.id,
          payment_intent: paymentIntent.id,
          currency: serviceCurrency,
          amount: adminPricing.totalAmount,
          call_status: callStatus,
        });
        setTimeout(() => {
          onSuccess({
            paymentIntentId: paymentIntent.id,
            call: callStatus,
            callId: callId,
            orderId: orderId,
          });
        }, 3000);
      } catch (err: unknown) {
        console.error("Payment error:", err);

        let msg = t("err.genericPayment");

        if (isHttpsError(err)) {
          if (
            err.code === "failed-precondition" ||
            err.code === "invalid-argument" ||
            err.code === "unauthenticated"
          ) {
            msg = err.message || msg;
          } else {
            msg = err.message || msg;
          }
        } else if (err instanceof Error) {
          msg = err.message || msg;
        } else if (typeof err === "string") {
          msg = err;
        }

        onError(msg);
      } finally {
        setIsProcessing(false);
      }
    }, [
      setIsProcessing,
      validatePaymentData,
      stableCallSessionId, // P0-1 FIX: callSessionId stable
      adminPricing.totalAmount,
      adminPricing.connectionFeeAmount,
      adminPricing.providerAmount,
      stripeCurrency,
      service.serviceType,
      service.clientPhone,
      provider,
      user.uid,
      user.email,
      user.firstName,
      user.lastName,
      user?.phone,
      language,
      adminPricing.duration,
      serviceCurrency,
      isMobile,
      elements,
      stripe,
      onSuccess,
      onError,
      persistPaymentDocs,
      sendProviderNotifications,
      setError,
      watch,
      bookingMeta,
      t,
      activePromo,
    ]);

    const handlePaymentSubmit = useCallback(
      async (e: React.FormEvent) => {
        e.preventDefault();
        if (isProcessing) return;

        if (adminPricing.totalAmount > 100) {
          setPendingSubmit(() => actuallySubmitPayment);
          setShowConfirm(true);
          return;
        }

        await actuallySubmitPayment();
      },
      [isProcessing, adminPricing.totalAmount, actuallySubmitPayment]
    );

    // Use name (public format "Prénom N.") for display, fallback to build from first/last
    const providerDisplayName = useMemo(
      () => {
        // Prefer formatted public name
        if (provider?.name) return provider.name;
        // Build from first/last names with initial format
        const first = provider?.firstName || "";
        const last = provider?.lastName || "";
        if (first && last) return `${first} ${last.charAt(0).toUpperCase()}.`;
        if (first) return first;
        // Fallback
        return provider?.fullName || "Expert";
      },
      [provider]
    );

    const serviceTypeDisplay = useMemo(
      () =>
        service.serviceType === "lawyer_call"
          ? intl.formatMessage({ id: "checkout.consultation.lawyer" })
          : intl.formatMessage({ id: "checkout.consultation.expat" }),
      [service.serviceType, intl]
    );

    return (
      <>
        <form onSubmit={handlePaymentSubmit} className="space-y-4" noValidate>
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-gray-700">
              <div className="flex items-center space-x-2">
                <CreditCard
                  className="w-4 h-4 text-blue-600"
                  aria-hidden="true"
                />
                <span className="sr-only">{t("card.title")}</span>
              </div>
            </label>

            {isMobile ? (
              <div className="space-y-2" aria-live="polite">
                <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                  {t("card.number")}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CreditCard
                      className="h-4 w-4 text-gray-400"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="pl-10 pr-3 py-3.5 border-2 border-gray-200 rounded-lg bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all duration-200 hover:border-gray-300">
                    <CardElement options={singleCardElementOptions} />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    {t("callCheckout.mobileNote")}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                    {t("card.number")}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <CreditCard
                        className="h-4 w-4 text-gray-400"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="pl-10 pr-3 py-3.5 border-2 border-gray-200 rounded-lg bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all duration-200 hover:border-gray-300">
                      <CardNumberElement options={cardElementOptions} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                      {t("card.expiry")}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Calendar
                          className="h-4 w-4 text-gray-400"
                          aria-hidden="true"
                        />
                      </div>
                      <div className="pl-10 pr-3 py-3.5 border-2 border-gray-200 rounded-lg bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all duration-200 hover:border-gray-300">
                        <CardExpiryElement options={cardElementOptions} />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                      {t("card.cvc")}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Shield
                          className="h-4 w-4 text-gray-400"
                          aria-hidden="true"
                        />
                      </div>
                      <div className="pl-10 pr-3 py-3.5 border-2 border-gray-200 rounded-lg bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all duration-200 hover:border-gray-300">
                        <CardCvcElement options={cardElementOptions} />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-3 text-sm">
              {(() => {
                switch (language) {
                  case "es":
                    return "Resumen";
                  case "de":
                    return "Zusammenfassung";
                  case "ru":
                    return "Сводка";
                  case "en":
                    return "Summary";
                  case "hi":
                    return "सारांश";
                  case "ch":
                    return "概括";
                  case "ar":
                    return "ملخص";
                  case "fr":
                  default:
                    return "Récapitulatif";
                }
              })()}
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">
                  {(() => {
                    switch (language) {
                      case "es":
                        return "Experto";
                      case "de":
                        return "Experte";
                      case "ru":
                        return "Эксперт";
                      case "en":
                        return "Expert";
                      case "hi":
                        return "विशेषज्ञ";
                      case "ch":
                        return "专家";
                      case "ar":
                        return "خبير";
                      case "fr":
                      default:
                        return "Expert";
                    }
                  })()}
                </span>
                <div className="flex items-center space-x-2">
                  <img
                    src={
                      provider.avatar ||
                      provider.profilePhoto ||
                      "/default-avatar.png"
                    }
                    className="w-5 h-5 rounded-full object-cover"
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      const name = providerDisplayName;
                      target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=40`;
                    }}
                    alt={`Photo de profil de ${providerDisplayName}`}
                    loading="lazy"
                  />
                  <span className="font-medium text-gray-900 text-xs">
                    {providerDisplayName}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">
                {(() => {
                  switch (language) {
                    case "es":
                      return "Servicio";
                    case "de":
                      return "Dienstleistung";
                    case "ru":
                      return "Услуга";
                    case "en":
                      return "Service";
                    case "hi":
                      return "सेवा";
                    case "ch":
                      return "服务";
                    case "pt":
                      return "Serviço";
                    case "ar":
                      return "خدمة";
                    case "fr":
                    default:
                      return "Service";
                  }
                })()}

                </span>
                <span className="font-medium text-gray-800 text-xs">
                  {serviceTypeDisplay}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">
                {(() => {
                  switch (language) {
                    case "es":
                      return "Duración";
                    case "de":
                      return "Dauer";
                    case "ru":
                      return "Продолжительность";
                    case "en":
                      return "Duration";
                    case "hi":
                      return "अवधि";
                    case "ch":
                      return "期间";
                    case "pt":
                      return "Duração";
                    case "ar": 
                      return "مدة";
                    case "fr":
                    default:
                      return "Durée";
                  }
                })()}
                </span>
                <span className="font-medium text-gray-800 text-xs">
                  {adminPricing.duration} min
                </span>
              </div>

              <div className="border-t-2 border-gray-400 pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900">
                 {(() => {
                    switch (language) {
                      case "es":
                        return "Total";
                      case "de":
                        return "Gesamt";
                      case "ru":
                        return "Итого";
                      case "hi":
                        return "कुल";
                      case "en":
                        return "Total";
                      case "ch":
                        return "全部的";
                      case "pt":
                        return "Total";
                      case "ar":
                        return "المجموع";
                      case "fr":
                      default:
                        return "Total";
                    }
                  })()}
                  </span>
                  <span
                    className="text-lg font-black bg-gradient-to-r from-red-500 to-pink-600 bg-clip-text text-transparent"
                    {...priceInfo}
                  >
                    {adminPricing.totalAmount.toFixed(2)} {currencySymbol}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={!stripe || isProcessing}
            className={
              "w-full py-4 rounded-xl font-bold text-white transition-all duration-300 " +
              "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 " +
              "active:scale-[0.98] touch-manipulation relative overflow-hidden " +
              (!stripe || isProcessing
                ? "bg-gray-400 cursor-not-allowed opacity-60"
                : "bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 shadow-lg hover:shadow-xl")
            }
            aria-label={`${intl.formatMessage({ id: "checkout.btn.pay" })} ${formatCurrency(adminPricing.totalAmount, serviceCurrency.toUpperCase(), {
              language,
              minimumFractionDigits: 2,
            })}`}
          >
            {isProcessing ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full border-2 border-white border-t-transparent w-5 h-5" />
                <span>...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <Lock className="w-5 h-5" aria-hidden="true" />
                <span>
                  {intl.formatMessage({ id: "checkout.btn.pay" })}{" "}
                  {formatCurrency(adminPricing.totalAmount, serviceCurrency.toUpperCase(), {
                    language,
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}
          </button>

          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
              <Shield className="w-3 h-3 text-green-600" aria-hidden={true} />
              <span className="text-xs font-medium text-gray-700">Stripe</span>
              <div
                className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"
                aria-hidden={true}
              />
            </div>
          </div>
        </form>

        {/* Modale de confirmation */}
        <ConfirmModal
          open={showConfirm}
          title={intl.formatMessage({ id: "checkout.confirmPayment" })}
          message={intl.formatMessage(
            { id: "checkout.confirmPaymentMessage" },
            { amount: adminPricing.totalAmount.toFixed(2), symbol: currencySymbol, currency: serviceCurrency.toUpperCase() }
          )}
          cancelLabel={t("callCheckout.modal.cancel")}
          confirmLabel={t("callCheckout.modal.confirm")}
          onCancel={() => {
            setShowConfirm(false);
            setPendingSubmit(null);
          }}
          onConfirm={async () => {
            setShowConfirm(false);
            const fn = pendingSubmit;
            setPendingSubmit(null);
            if (fn) await fn();
          }}
        />
      </>
    );
  }
);
PaymentForm.displayName = "PaymentForm";

interface DebugPriceEntry {
  element: Element;
  source: string;
  currency: string;
  serviceType?: string;
  text: string;
}
interface DebugPricingAPI {
  showAllPrices: () => DebugPriceEntry[];
  highlightBySource: (
    source: "admin" | "provider" | "fallback" | "loading"
  ) => void;
  clearHighlights: () => void;
}
declare global {
  interface Window {
    debugPricing?: DebugPricingAPI;
  }
}

const CallCheckout: React.FC<CallCheckoutProps> = ({
  selectedProvider,
  serviceData,
  onGoBack,
}) => {
  const { t, language } = useTranslation();
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const { user } = useAuth();

  const isMobile = useIsMobile();

  const { getTraceAttributes } = usePriceTracing();
  const {
    pricing,
    error: pricingError,
    loading: pricingLoading,
  } = usePricingConfig() as {
    pricing?: {
      lawyer: Record<Currency, PricingEntryTrace>;
      expat: Record<Currency, PricingEntryTrace>;
    };
    error?: string | Error | null;
    loading: boolean;
  };

  const [selectedCurrency, setSelectedCurrency] = useState<Currency>("eur");
  const [activePromo, setActivePromo] = useState<{
    code: string;
    discountType: "percentage" | "fixed";
    discountValue: number;
    services: string[];
  } | null>(null);

  // Load promo code from sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("activePromoCode");
      if (saved) {
        const promoData = JSON.parse(saved);
        setActivePromo(promoData);
      }
    } catch (error) {
      console.error("Error loading active promo:", error);
    }
  }, []);

  useEffect(() => {
    const initializeCurrency = () => {
      if (
        serviceData?.currency &&
        ["eur", "usd"].includes(serviceData.currency)
      ) {
        setSelectedCurrency(serviceData.currency as Currency);
        return;
      }
      try {
        const saved = sessionStorage.getItem(
          "selectedCurrency"
        ) as Currency | null;
        if (saved && ["eur", "usd"].includes(saved)) {
          setSelectedCurrency(saved);
          return;
        }
      } catch {
        /* no-op */
      }
      try {
        const preferred = localStorage.getItem(
          "preferredCurrency"
        ) as Currency | null;
        if (preferred && ["eur", "usd"].includes(preferred)) {
          setSelectedCurrency(preferred);
          return;
        }
      } catch {
        /* no-op */
      }
      const detected = detectUserCurrency();
      setSelectedCurrency(detected);
    };
    initializeCurrency();
  }, [serviceData?.currency]);

  useEffect(() => {
    try {
      sessionStorage.setItem("selectedCurrency", selectedCurrency);
      localStorage.setItem("preferredCurrency", selectedCurrency);
    } catch {
      /* no-op */
    }
  }, [selectedCurrency]);

  const provider = useMemo<ProviderWithExtras | null>(() => {
    if (selectedProvider?.id)
      return normalizeProvider(selectedProvider) as ProviderWithExtras;
    try {
      const saved = sessionStorage.getItem("selectedProvider");
      if (saved) {
        const p = JSON.parse(saved) as ProviderWithExtras;
        if (p?.id)
          return normalizeProvider(p as Provider) as ProviderWithExtras;
      }
    } catch {
      /* no-op */
    }
    return null;
  }, [selectedProvider]);

  const providerRole: ServiceKind | null = useMemo(() => {
    if (!provider) return null;
    // Priorité à 'type' (champ canonique) sur 'role' (alias optionnel)
    return (provider.type || provider.role || "expat") as ServiceKind;
  }, [provider]);

  // Déterminer le gateway de paiement (Stripe ou PayPal) selon le pays du provider
  const providerCountryCode = useMemo(() => {
    if (!provider) return undefined;
    // Extraire le code pays du provider (peut être "FR", "DZ", etc.)
    return provider.countryCode || provider.country?.toUpperCase()?.substring(0, 2);
  }, [provider]);

  const {
    gateway: paymentGateway,
    isLoading: gatewayLoading,
    isPayPalOnly,
  } = usePaymentGateway(providerCountryCode);

  const storedClientPhone = useMemo(() => {
    try {
      return sessionStorage.getItem("clientPhone") || "";
    } catch {
      return "";
    }
  }, []);

  const adminPricing: PricingEntryTrace | null = useMemo(() => {
    if (!pricing || !providerRole) return null;

    const basePricing = pricing[providerRole]?.[selectedCurrency];
    if (!basePricing) return null;

    // Check if promo applies to this service
    const serviceKey = providerRole === "lawyer" ? "lawyer_call" : "expat_call";
    const promoApplies =
      activePromo && activePromo.services.includes(serviceKey);

    if (!promoApplies) {
      return basePricing;
    }

    // Apply discount
    let discount = 0;
    if (activePromo.discountType === "percentage") {
      discount = basePricing.totalAmount * (activePromo.discountValue / 100);
    } else {
      // Fixed discount
      discount = Math.min(activePromo.discountValue, basePricing.totalAmount);
    }

    const discountedTotal = Math.max(
      0,
      Math.round(basePricing.totalAmount - discount)
    );
    const discountAmount = basePricing.totalAmount - discountedTotal;

    return {
      ...basePricing,
      totalAmount: discountedTotal,
      // Adjust provider amount proportionally
      providerAmount: Math.max(0, basePricing.providerAmount - discountAmount),
    };
  }, [pricing, providerRole, selectedCurrency, activePromo]);

  const service: ServiceData | null = useMemo(() => {
    if (!provider || !adminPricing || !providerRole) return null;
    return {
      providerId: provider.id,
      serviceType: providerRole === "lawyer" ? "lawyer_call" : "expat_call",
      providerRole,
      amount: adminPricing.totalAmount,
      duration: adminPricing.duration,
      clientPhone: toE164(storedClientPhone || user?.phone || ""),
      commissionAmount: adminPricing.connectionFeeAmount,
      providerAmount: adminPricing.providerAmount,
      currency: selectedCurrency,
    };
  }, [
    provider,
    adminPricing,
    providerRole,
    user?.phone,
    selectedCurrency,
    storedClientPhone,
  ]);

  const cardTraceAttrs = useMemo(
    () =>
      getTraceAttributes(
        (providerRole || "expat") as ServiceKind,
        selectedCurrency
      ),
    [getTraceAttributes, providerRole, selectedCurrency]
  );

  // Expose debug helpers (DEV only)
  if (import.meta.env.DEV && typeof window !== "undefined") {
    if (!window.debugPricing) {
      window.debugPricing = {
        showAllPrices: () => {
          const elements = document.querySelectorAll("[data-price-source]");
          const prices: DebugPriceEntry[] = [];
          elements.forEach((el) => {
            prices.push({
              element: el,
              source: el.getAttribute("data-price-source") || "unknown",
              currency: el.getAttribute("data-currency") || "unknown",
              serviceType: el.getAttribute("data-service-type") || undefined,
              text: (el.textContent || "").trim(),
            });
          });
          console.table(prices);
          return prices;
        },
        highlightBySource: (source) => {
          document.querySelectorAll(".debug-price-highlight").forEach((el) => {
            el.classList.remove("debug-price-highlight");
            (el as HTMLElement).style.outline = "";
            (el as HTMLElement).style.backgroundColor = "";
          });
          document
            .querySelectorAll(`[data-price-source="${source}"]`)
            .forEach((el) => {
              (el as HTMLElement).classList.add("debug-price-highlight");
              (el as HTMLElement).style.outline = "3px solid red";
              (el as HTMLElement).style.backgroundColor =
                "rgba(255, 0, 0, 0.1)";
            });
        },
        clearHighlights: () => {
          document.querySelectorAll(".debug-price-highlight").forEach((el) => {
            el.classList.remove("debug-price-highlight");
            (el as HTMLElement).style.outline = "";
            (el as HTMLElement).style.backgroundColor = "";
          });
        },
      };
      console.log("Debug pricing disponible: window.debugPricing");
    }
  }

  const seoMeta = useMemo(
    () => ({
      title: t("meta.title"),
      description: t("meta.description"),
      keywords: t("meta.keywords"),
      ogTitle: t("meta.og_title"),
      ogDescription: t("meta.og_description"),
      ogImagePath: `${window.location.origin}/images/og-checkout-${language}.jpg`,
      twitterImagePath: `${window.location.origin}/images/twitter-checkout-${language}.jpg`,
      ogImageAlt: t("meta.og_image_alt"),
      twitterImageAlt: t("meta.twitter_image_alt"),
      canonicalUrl: `${window.location.origin}/${language}/checkout`,
      alternateUrls: {
        fr: `${window.location.origin}/fr/checkout`,
        en: `${window.location.origin}/en/checkout`,
      } as Record<"fr" | "en", string>,
      locale: language as Lang,
      structuredData: {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": `${window.location.origin}/${language}/checkout#webpage`,
        name: t("meta.title"),
        description: t("meta.description"),
        url: `${window.location.origin}/${language}/checkout`,
        inLanguage: language,
        mainEntity: {
          "@type": "Action",
          "@id": `${window.location.origin}/${language}/checkout#action`,
          name: t("meta.title"),
          target: `${window.location.origin}/${language}/checkout`,
          object: { "@type": "Service", name: "Call consultation" },
        },
        breadcrumb: {
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Home",
              item: window.location.origin,
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Checkout",
              item: `${window.location.origin}/${language}/checkout`,
            },
          ],
        },
        author: {
          "@type": "Organization",
          "@id": `${window.location.origin}#organization`,
          name: "SOS Expats",
          url: window.location.origin,
          logo: `${window.location.origin}/sos-logo.webp`,
        },
        publisher: { "@id": `${window.location.origin}#organization` },
      } as Record<string, unknown>,
    }),
    [language, t]
  );

  useSEO(seoMeta);

  const goBack = useCallback(() => {
    if (onGoBack) return onGoBack();
    if (window.history.length > 1) navigate(-1 as unknown as string);
    else navigate("/", { replace: true });
  }, [onGoBack, navigate]);

  const [currentStep, setCurrentStep] = useState<StepType>("payment");
  const [callProgress, setCallProgress] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>("");

  const handlePaymentSuccess = useCallback(
    (payload: {
      paymentIntentId: string;
      call: "scheduled" | "skipped";
      callId?: string;
      orderId?: string;
    }) => {
      setCurrentStep("calling");
      setCallProgress(1);

      const params = new URLSearchParams({
        paymentIntentId: payload.paymentIntentId,
        providerId: provider?.id || "",
        call: payload.call,
        orderId: payload.orderId || "",
      });
      if (payload.callId) params.set("callId", payload.callId);
      if (payload.orderId) params.set("orderId", payload.orderId);

      navigate(`/payment-success?${params.toString()}`, { replace: false });
    },
    [navigate, provider?.id]
  );

  const handlePaymentError = useCallback((msg: string) => setError(msg), []);

  useEffect(() => {
    if (currentStep === "calling" && callProgress < 5) {
      const timer = setTimeout(() => {
        setCallProgress((prev) => {
          const next = prev + 1;
          if (next === 5) setTimeout(() => setCurrentStep("completed"), 2500);
          return next;
        });
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [currentStep, callProgress]);

  if (pricingLoading || !providerRole) {
    return (
      <Layout showFooter={false}>
        <div className="min-h-screen flex items-center justify-center text-gray-600">
          ...
        </div>
      </Layout>
    );
  }

  if (!provider) {
    return (
      <Layout showFooter={false}>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 text-center max-w-sm mx-auto">
            <AlertCircle
              className="w-12 h-12 text-red-500 mx-auto mb-4"
              aria-hidden="true"
            />
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              {t("alert.missingDataTitle")}
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              {t("alert.missingDataText")}
            </p>
            <div className="space-y-2">
              <button
                onClick={() => navigate("/experts")}
                className="w-full px-4 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-red-500 to-red-600 text-white"
              >
                {intl.formatMessage({ id: "checkout.selectExpert" })}
              </button>
              <button
                onClick={goBack}
                className="w-full px-4 py-3 rounded-xl font-semibold text-sm bg-gray-500 text-white"
              >
                {t("ui.back")}
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user || !user.uid || !adminPricing || !service) {
    return (
      <Layout showFooter={false}>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 text-center max-w-sm mx-auto">
            <AlertCircle
              className="w-12 h-12 text-red-500 mx-auto mb-4"
              aria-hidden="true"
            />
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              {t("alert.loginRequiredTitle")}
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              {t("alert.loginRequiredText")}
            </p>
            <div className="space-y-2">
              <button
                onClick={() => navigate("/login")}
                className="w-full px-4 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-red-500 to-red-600 text-white"
              >
                {intl.formatMessage({ id: "checkout.signIn" })}
              </button>
              <button
                onClick={goBack}
                className="w-full px-4 py-3 rounded-xl font-semibold text-sm bg-gray-500 text-white"
              >
                {t("ui.back")}
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showFooter={false}>
      <main className="bg-gradient-to-br from-red-50 to-red-100 min-h-screen overflow-x-hidden">
        <div className="max-w-lg mx-auto px-4 py-4">
          {!!pricingError && (
            <div className="mb-3 rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
              {intl.formatMessage({ id: "checkout.pricingFallback" })}
            </div>
          )}

          <div className="mb-4">
            <button
              onClick={goBack}
              className="flex items-center gap-2 text-red-600 hover:text-red-700 mb-3 transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 rounded p-1 touch-manipulation"
              aria-label={t("ui.back")}
            >
              <ArrowLeft size={16} aria-hidden={true} />
              <span>{t("ui.back")}</span>
            </button>

            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900 mb-1">
                {t("ui.securePayment")}
              </h1>
              <p className="text-gray-600 text-sm">{t("ui.payToStart")}</p>
            </div>
          </div>

          <section className="bg-white rounded-xl shadow-md border p-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <img
                  src={
                    provider.avatar ||
                    provider.profilePhoto ||
                    "/default-avatar.png"
                  }
                  alt={provider.name || "Expert"}
                  className="w-12 h-12 rounded-lg object-cover ring-2 ring-white shadow-sm"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    const name = provider.name || "Expert";
                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=100&background=4F46E5&color=fff`;
                  }}
                  loading="lazy"
                />
                <div
                  className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"
                  aria-label="online"
                />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 truncate text-sm">
                  {provider.name || "Expert"}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={
                      "px-2 py-0.5 rounded-md text-xs font-medium " +
                      ((provider.role || provider.type) === "lawyer"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-green-100 text-green-800")
                    }
                  >
                    {(provider.role || provider.type) === "lawyer"
                      ? intl.formatMessage({ id: "checkout.lawyer" })
                      : intl.formatMessage({ id: "checkout.expert" })}
                  </span>
                  <span className="text-gray-600 text-xs">
                    {provider.country || "FR"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                  <Clock size={12} aria-hidden={true} />
                  <span>{adminPricing.duration} min</span>
                  <span>•</span>
                  <span className="text-green-600 font-medium">
                  {(() => {
                    switch (language) {
                      case "es":
                        return "Disponible";
                      case "de":
                        return "Verfügbar";
                      case "ru":
                        return "Доступно";
                      case "en":
                        return "Available";
                      case "hi":
                        return "उपलब्ध";
                      case "ch":
                        return "可用";
                      case "pt":
                        return "Disponível";
                      case "ar":
                        return "متاح";
                      case "fr":
                      default:
                        return "Disponible";
                    }
                  })()}
                  </span>
                </div>
              </div>

              <div className="text-right flex-shrink-0" {...cardTraceAttrs}>
                {/* Show original price and discount if promo is active */}
                {activePromo && pricing && providerRole && (
                  <div className="mb-2 text-sm">
                    <div className="text-gray-500 line-through">
                      {formatCurrency(
                        pricing[providerRole]?.[selectedCurrency]
                          ?.totalAmount || 0,
                        selectedCurrency.toUpperCase(),
                        {
                          language,
                          minimumFractionDigits: 2,
                        }
                      )}
                    </div>
                    <div className="text-green-600 font-medium">
                      -
                      {formatCurrency(
                        (pricing[providerRole]?.[selectedCurrency]
                          ?.totalAmount || 0) - adminPricing.totalAmount,
                        selectedCurrency.toUpperCase(),
                        {
                          language,
                          minimumFractionDigits: 2,
                        }
                      )}{" "}
                      ({activePromo.code})
                    </div>
                  </div>
                )}
                <div className="text-2xl font-black bg-gradient-to-r from-red-500 to-pink-600 bg-clip-text text-transparent">
                  {formatCurrency(adminPricing.totalAmount, selectedCurrency.toUpperCase(), {
                    language,
                    minimumFractionDigits: 2,
                  })}
                </div>
                <div className="text-xs text-gray-500">
                  {adminPricing.duration} min
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl shadow-md border p-4 mb-4">
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={() => setSelectedCurrency("eur")}
                className={
                  "px-4 py-2 rounded-lg font-medium transition-all " +
                  (selectedCurrency === "eur"
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200")
                }
              >
                EUR (€)
              </button>
              <button
                onClick={() => setSelectedCurrency("usd")}
                className={
                  "px-4 py-2 rounded-lg font-medium transition-all " +
                  (selectedCurrency === "usd"
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200")
                }
              >
                USD ($)
              </button>
            </div>
          </section>

          <section className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                  <CreditCard
                    className="w-4 h-4 text-white"
                    aria-hidden={true}
                  />
                </div>
                <h4 className="text-lg font-bold text-gray-900">Paiement</h4>
              </div>

              {error && (
                <div
                  className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"
                  role="alert"
                  aria-live="assertive"
                >
                  <div className="flex items-center">
                    <AlertCircle
                      className="w-4 h-4 text-red-500 mr-2 flex-shrink-0"
                      aria-hidden={true}
                    />
                    <span className="text-sm text-red-700">{error}</span>
                  </div>
                </div>
              )}

              {/* Indicateur du gateway de paiement */}
              <div className="mb-4">
                <GatewayIndicator gateway={paymentGateway} />
                {isPayPalOnly && (
                  <p className="text-xs text-amber-600 mt-2">
                    <FormattedMessage
                      id="payment.paypalOnly.notice"
                      defaultMessage="Ce prestataire accepte uniquement les paiements PayPal"
                    />
                  </p>
                )}
              </div>

              {/* Formulaire de paiement - Stripe ou PayPal selon le gateway */}
              {gatewayLoading ? (
                <div className="flex items-center justify-center p-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : paymentGateway === "paypal" ? (
                <PayPalScriptProvider
                  options={{
                    clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID as string || "test",
                    currency: selectedCurrency.toUpperCase(),
                    intent: "capture",
                  }}
                >
                  <PayPalPaymentForm
                    amount={adminPricing?.totalAmount || 0}
                    currency={selectedCurrency.toUpperCase()}
                    providerId={provider?.id || ""}
                    providerPayPalMerchantId={provider?.paypalMerchantId}
                    callSessionId={`session_${Date.now()}`}
                    clientId={user?.uid || ""}
                    description={`Appel ${providerRole === "lawyer" ? "avocat" : "expat"} - ${provider?.name || "Expert"}`}
                    onSuccess={(details) => {
                      console.log("PayPal payment success:", details);
                      handlePaymentSuccess({
                        paymentIntentId: details.orderId,
                        call: "scheduled",
                        orderId: details.orderId,
                      });
                    }}
                    onError={(error) => {
                      console.error("PayPal payment error:", error);
                      handlePaymentError(error.message);
                    }}
                    onCancel={() => {
                      setError("Paiement annulé");
                    }}
                    disabled={isProcessing}
                  />
                </PayPalScriptProvider>
              ) : (
                <Elements stripe={stripePromise}>
                  <PaymentForm
                    user={user}
                    provider={provider}
                    service={service}
                    adminPricing={adminPricing}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                    isProcessing={isProcessing}
                    setIsProcessing={(p) => {
                      setError("");
                      setIsProcessing(p);
                    }}
                    isMobile={isMobile}
                    activePromo={activePromo}
                  />
                </Elements>
              )}
            </div>
          </section>

          <aside className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Shield
                className="w-4 h-4 text-blue-600 mt-0.5"
                aria-hidden={true}
              />
              <div>
                <h4 className="font-semibold text-blue-900 text-sm">
                  {/* Paiement sécurisé */}
                  <FormattedMessage id="payment.secure.title" />
                </h4>
                <p className="text-xs text-blue-800 mt-1">
                  <FormattedMessage id="payment.secure.description" />
                  {/* Données protégées par SSL. Appel lancé automatiquement après
                  paiement. */}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </Layout>
  );
};

CallCheckout.displayName = "CallCheckout";
export default React.memo(CallCheckout);
