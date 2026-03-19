// src/pages/CallCheckout.tsx
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useContext,
  useRef,
} from "react";
import {
  ArrowLeft,
  Clock,
  Shield,
  AlertCircle,
  CreditCard,
  Lock,
  Calendar,
  Info,
} from "lucide-react";
import { useLocaleNavigate } from "../multilingual-system";
import { useAuth } from "../contexts/AuthContext";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  CardElement,
  PaymentRequestButtonElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import type { PaymentRequest } from "@stripe/stripe-js";
import { functions, functionsPayment, db } from "../config/firebase";
import { httpsCallable, HttpsCallable } from "firebase/functions";
import { doc, setDoc, serverTimestamp, getDoc, onSnapshot } from "firebase/firestore";
import { Provider, normalizeProvider } from "../types/provider";
import Layout from "../components/layout/Layout";
import {
  detectUserCurrency,
  usePricingConfig,
  getEffectivePrice,
  type PricingConfig,
} from "../services/pricingService";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { useForm } from "react-hook-form";
import { useApp } from "@/contexts/AppContext";
import { FormattedMessage, useIntl } from "react-intl";
import { formatCurrency } from "../utils/localeFormatters";
import { getDateLocale } from "../utils/formatters";
import { normalizeCountryToCode } from "../utils/countryUtils";
import { usePaymentGateway } from "../hooks/usePaymentGateway";
import { PayPalPaymentForm, GatewayIndicator } from "../components/payment";
import { PaymentFeedback } from "../components/payment/PaymentFeedback";
import { ConfirmModal } from "../components/ui/ConfirmModal";
// PayPalScriptProvider est fourni par PayPalContext au niveau CallCheckoutWrapper.tsx
import { paymentLogger, navigationLogger, callLogger } from "../utils/debugLogger";
import { getLocaleString, getTranslatedRouteSlug } from "../multilingual-system/core/routing/localeRoutes";
import { getStoredMetaIdentifiers } from "../utils/fbpCookie";
import { trackMetaAddPaymentInfo, trackMetaInitiateCheckout } from "../utils/metaPixel";
import { getOrCreateEventId } from "../utils/sharedEventId";
import { getCurrentTrafficSource } from "../utils/trafficSource";
import { getAffiliateRef } from "../hooks/useAffiliateTracking";
import { getStoredReferralCode } from "../hooks/useAffiliate";

/* -------------------------- Stripe singleton (HMR-safe) ------------------ */
// Conserve la même Promise Stripe à travers les rechargements HMR.
// → Empêche: "Unsupported prop change on Elements: you cannot change the `stripe` prop after setting it."
declare global {
  var __STRIPE_PROMISE__: Promise<Stripe | null> | undefined;
  var __PAYMENT_FORM_MOUNTED__: boolean | undefined;
}
const getStripePromise = (): Promise<Stripe | null> => {
  if (!globalThis.__STRIPE_PROMISE__) {
    const pk = import.meta.env.VITE_STRIPE_PUBLIC_KEY as string;
    console.log("[Stripe] Initializing with public key:", pk ? `${pk.substring(0, 20)}...` : "MISSING!");
    if (!pk) {
      console.error("[Stripe] CRITICAL: VITE_STRIPE_PUBLIC_KEY is not defined!");
    }
    globalThis.__STRIPE_PROMISE__ = loadStripe(pk);
    globalThis.__STRIPE_PROMISE__.then((stripe) => {
      console.log("[Stripe] Loaded successfully:", !!stripe);
    }).catch((err) => {
      console.error("[Stripe] Failed to load:", err);
    });
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
  referredByUserId?: string;
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
    discountType: "fixed" | "percentage";
    discountAmount: number;
    discountValue: number;
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
  useDirectCharges?: boolean;
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
  // P0 FIX: Add booking form data for SMS notifications
  bookingTitle?: string;
  bookingDescription?: string;
  clientCurrentCountry?: string;
  clientFirstName?: string;
  clientNationality?: string;
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
    "summary.feeBreakdown": {
      fr: "Détail des frais",
      en: "Fee breakdown",
      es: "Desglose de tarifas",
      de: "Gebührenaufschlüsselung",
      ru: "Разбивка сборов",
      hi: "शुल्क विवरण",
      ch: "费用明细",
      pt: "Detalhamento das taxas",
      ar: "تفاصيل الرسوم"
    },
    "summary.platformFees": {
      fr: "Frais de plateforme",
      en: "Platform fees",
      es: "Tarifas de plataforma",
      de: "Plattformgebühren",
      ru: "Сборы платформы",
      hi: "प्लेटफ़ॉर्म शुल्क",
      ch: "平台费用",
      pt: "Taxas de plataforma",
      ar: "رسوم المنصة"
    },
    "summary.platformFeesDetail": {
      fr: "(communication Twilio, plateforme SOS Expat, frais devise)",
      en: "(Twilio communication, SOS Expat platform, currency fees)",
      es: "(comunicación Twilio, plataforma SOS Expat, tarifas de divisa)",
      de: "(Twilio-Kommunikation, SOS Expat-Plattform, Währungsgebühren)",
      ru: "(связь Twilio, платформа SOS Expat, валютные сборы)",
      hi: "(ट्विलियो संचार, SOS एक्सपैट प्लेटफ़ॉर्म, मुद्रा शुल्क)",
      ch: "(Twilio通讯、SOS Expat平台、货币费用)",
      pt: "(comunicação Twilio, plataforma SOS Expat, taxas de câmbio)",
      ar: "(اتصالات Twilio، منصة SOS Expat، رسوم العملة)"
    },
    "summary.expertFee": {
      fr: "Rémunération expert",
      en: "Expert fee",
      es: "Honorarios del experto",
      de: "Expertenhonorar",
      ru: "Гонорар эксперта",
      hi: "विशेषज्ञ शुल्क",
      ch: "专家费用",
      pt: "Honorário do especialista",
      ar: "أتعاب الخبير"
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
      fr: "Montant minimum 0.50€",
      en: "Minimum amount €0.50",
      es: "Monto mínimo 0.50€",
      de: "Mindestbetrag 0.50€",
      ru: "Минимальная сумма 0.50€",
      hi: "न्यूनतम राशि €0.50",
      ch: "最低金额 €0.50",
      pt: "Valor mínimo €0.50",
      ar: "الحد الأدنى للمبلغ 0.50 يورو"
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
    // ✨ Friendly error messages - Fun & Non-aggressive
    "err.duplicate.title": {
      fr: "Oups, déjà en cours ! 🔄",
      en: "Oops, already in progress! 🔄",
      es: "¡Ups, ya está en curso! 🔄",
      de: "Hoppla, bereits in Bearbeitung! 🔄",
      ru: "Упс, уже в процессе! 🔄",
      hi: "उफ़, पहले से प्रगति पर है! 🔄",
      ch: "哎呀，已经在进行中了！🔄",
      pt: "Ops, já está em andamento! 🔄",
      ar: "عفوًا، قيد التنفيذ بالفعل! 🔄"
    },
    "err.duplicate.message": {
      fr: "Un paiement similaire est déjà en cours. Patientez quelques instants ou vérifiez votre historique.",
      en: "A similar payment is already being processed. Please wait a moment or check your history.",
      es: "Ya se está procesando un pago similar. Espera un momento o revisa tu historial.",
      de: "Eine ähnliche Zahlung wird bereits bearbeitet. Bitte warten Sie oder prüfen Sie Ihren Verlauf.",
      ru: "Аналогичный платеж уже обрабатывается. Подождите или проверьте историю.",
      hi: "एक समान भुगतान पहले से संसाधित हो रहा है। कृपया प्रतीक्षा करें।",
      ch: "类似的付款已在处理中。请稍候或查看您的历史记录。",
      pt: "Um pagamento similar já está sendo processado. Aguarde ou verifique seu histórico.",
      ar: "يتم بالفعل معالجة دفعة مماثلة. يرجى الانتظار أو التحقق من السجل."
    },
    "err.rateLimit.title": {
      fr: "Tout doux ! ☕",
      en: "Easy there! ☕",
      es: "¡Con calma! ☕",
      de: "Immer mit der Ruhe! ☕",
      ru: "Не торопитесь! ☕",
      hi: "धीरे धीरे! ☕",
      ch: "慢慢来！☕",
      pt: "Calma aí! ☕",
      ar: "بالتأني! ☕"
    },
    "err.rateLimit.message": {
      fr: "Trop de tentatives. Prenez un café et réessayez dans quelques minutes.",
      en: "Too many attempts. Take a coffee break and try again in a few minutes.",
      es: "Demasiados intentos. Tómate un café y vuelve a intentarlo en unos minutos.",
      de: "Zu viele Versuche. Machen Sie eine Kaffeepause und versuchen Sie es in ein paar Minuten erneut.",
      ru: "Слишком много попыток. Выпейте кофе и попробуйте через несколько минут.",
      hi: "बहुत सारे प्रयास। कॉफी ब्रेक लें और कुछ मिनटों में फिर से प्रयास करें।",
      ch: "尝试次数太多。休息一下，几分钟后再试。",
      pt: "Muitas tentativas. Tome um café e tente novamente em alguns minutos.",
      ar: "محاولات كثيرة جدًا. خذ استراحة وحاول مرة أخرى بعد بضع دقائق."
    },
    "err.cardDeclined.title": {
      fr: "Carte non acceptée 💳",
      en: "Card not accepted 💳",
      es: "Tarjeta no aceptada 💳",
      de: "Karte nicht akzeptiert 💳",
      ru: "Карта не принята 💳",
      hi: "कार्ड स्वीकार नहीं किया गया 💳",
      ch: "卡未被接受 💳",
      pt: "Cartão não aceito 💳",
      ar: "البطاقة غير مقبولة 💳"
    },
    "err.cardDeclined.message": {
      fr: "Votre banque a refusé le paiement. Essayez une autre carte ou contactez votre banque.",
      en: "Your bank declined the payment. Try another card or contact your bank.",
      es: "Tu banco rechazó el pago. Prueba otra tarjeta o contacta a tu banco.",
      de: "Ihre Bank hat die Zahlung abgelehnt. Versuchen Sie eine andere Karte oder kontaktieren Sie Ihre Bank.",
      ru: "Ваш банк отклонил платеж. Попробуйте другую карту или свяжитесь с банком.",
      hi: "आपके बैंक ने भुगतान अस्वीकार कर दिया। दूसरा कार्ड आज़माएं या अपने बैंक से संपर्क करें।",
      ch: "您的银行拒绝了付款。尝试另一张卡或联系您的银行。",
      pt: "Seu banco recusou o pagamento. Tente outro cartão ou entre em contato com seu banco.",
      ar: "رفض البنك الدفع. جرب بطاقة أخرى أو اتصل بالبنك."
    },
    "err.insufficientFunds.title": {
      fr: "Solde insuffisant 💰",
      en: "Insufficient funds 💰",
      es: "Fondos insuficientes 💰",
      de: "Unzureichendes Guthaben 💰",
      ru: "Недостаточно средств 💰",
      hi: "अपर्याप्त शेष 💰",
      ch: "余额不足 💰",
      pt: "Saldo insuficiente 💰",
      ar: "رصيد غير كافٍ 💰"
    },
    "err.insufficientFunds.message": {
      fr: "Vérifiez votre solde ou essayez avec une autre carte.",
      en: "Check your balance or try with another card.",
      es: "Verifica tu saldo o intenta con otra tarjeta.",
      de: "Überprüfen Sie Ihr Guthaben oder versuchen Sie es mit einer anderen Karte.",
      ru: "Проверьте баланс или попробуйте другую карту.",
      hi: "अपना बैलेंस जांचें या दूसरे कार्ड से प्रयास करें।",
      ch: "检查您的余额或尝试使用另一张卡。",
      pt: "Verifique seu saldo ou tente com outro cartão.",
      ar: "تحقق من رصيدك أو جرب بطاقة أخرى."
    },
    "err.network.title": {
      fr: "Connexion instable 📶",
      en: "Unstable connection 📶",
      es: "Conexión inestable 📶",
      de: "Instabile Verbindung 📶",
      ru: "Нестабильное соединение 📶",
      hi: "अस्थिर कनेक्शन 📶",
      ch: "连接不稳定 📶",
      pt: "Conexão instável 📶",
      ar: "اتصال غير مستقر 📶"
    },
    "err.network.message": {
      fr: "Vérifiez votre connexion internet et réessayez.",
      en: "Check your internet connection and try again.",
      es: "Verifica tu conexión a internet e inténtalo de nuevo.",
      de: "Überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.",
      ru: "Проверьте подключение к интернету и попробуйте снова.",
      hi: "अपना इंटरनेट कनेक्शन जांचें और पुनः प्रयास करें।",
      ch: "检查您的网络连接并重试。",
      pt: "Verifique sua conexão com a internet e tente novamente.",
      ar: "تحقق من اتصالك بالإنترنت وحاول مرة أخرى."
    },
    "err.tryAgain": {
      fr: "Réessayer",
      en: "Try again",
      es: "Reintentar",
      de: "Erneut versuchen",
      ru: "Попробовать снова",
      hi: "पुनः प्रयास करें",
      ch: "重试",
      pt: "Tentar novamente",
      ar: "حاول مرة أخرى"
    },
    "err.contactSupport": {
      fr: "Contacter le support",
      en: "Contact support",
      es: "Contactar soporte",
      de: "Support kontaktieren",
      ru: "Связаться с поддержкой",
      hi: "सहायता से संपर्क करें",
      ch: "联系支持",
      pt: "Contatar suporte",
      ar: "اتصل بالدعم"
    },
    "err.cvc.title": {
      fr: "Code de sécurité incorrect 🔐",
      en: "Incorrect security code 🔐",
      es: "Código de seguridad incorrecto 🔐",
      de: "Sicherheitscode falsch 🔐",
      ru: "Неверный код безопасности 🔐",
      hi: "गलत सुरक्षा कोड 🔐",
      ch: "安全码不正确 🔐",
      pt: "Código de segurança incorreto 🔐",
      ar: "رمز الأمان غير صحيح 🔐"
    },
    "err.cvc.message": {
      fr: "Le code CVC/CVV de votre carte est incorrect. Vérifiez les 3 chiffres au dos de votre carte.",
      en: "The CVC/CVV code on your card is incorrect. Check the 3 digits on the back of your card.",
      es: "El código CVC/CVV de su tarjeta es incorrecto. Verifique los 3 dígitos en el reverso de su tarjeta.",
      de: "Der CVC/CVV-Code Ihrer Karte ist falsch. Prüfen Sie die 3 Ziffern auf der Rückseite Ihrer Karte.",
      ru: "Код CVC/CVV вашей карты неверен. Проверьте 3 цифры на обороте карты.",
      hi: "आपके कार्ड का CVC/CVV कोड गलत है। अपने कार्ड के पीछे 3 अंक जांचें।",
      ch: "您卡片的CVC/CVV码不正确。请检查卡片背面的3位数字。",
      pt: "O código CVC/CVV do seu cartão está incorreto. Verifique os 3 dígitos no verso do cartão.",
      ar: "رمز CVC/CVV لبطاقتك غير صحيح. تحقق من الأرقام الثلاثة على ظهر البطاقة."
    },
    "err.expired.title": {
      fr: "Carte expirée 📅",
      en: "Card expired 📅",
      es: "Tarjeta vencida 📅",
      de: "Karte abgelaufen 📅",
      ru: "Карта просрочена 📅",
      hi: "कार्ड की अवधि समाप्त 📅",
      ch: "卡片已过期 📅",
      pt: "Cartão expirado 📅",
      ar: "انتهت صلاحية البطاقة 📅"
    },
    "err.expired.message": {
      fr: "Votre carte a expiré. Veuillez utiliser une autre carte de paiement.",
      en: "Your card has expired. Please use a different payment card.",
      es: "Su tarjeta ha vencido. Por favor, use otra tarjeta de pago.",
      de: "Ihre Karte ist abgelaufen. Bitte verwenden Sie eine andere Zahlungskarte.",
      ru: "Срок действия вашей карты истёк. Пожалуйста, используйте другую карту.",
      hi: "आपके कार्ड की अवधि समाप्त हो गई है। कृपया दूसरे कार्ड का उपयोग करें।",
      ch: "您的卡片已过期。请使用其他支付卡。",
      pt: "Seu cartão expirou. Por favor, use outro cartão de pagamento.",
      ar: "انتهت صلاحية بطاقتك. يرجى استخدام بطاقة دفع أخرى."
    },
    "err.generic.message": {
      fr: "Une erreur est survenue lors du paiement. Veuillez réessayer ou utiliser un autre moyen de paiement.",
      en: "A payment error occurred. Please try again or use a different payment method.",
      es: "Ocurrió un error en el pago. Intente de nuevo o use otro medio de pago.",
      de: "Ein Zahlungsfehler ist aufgetreten. Bitte versuchen Sie es erneut oder nutzen Sie eine andere Zahlungsmethode.",
      ru: "Произошла ошибка при оплате. Попробуйте снова или используйте другой способ оплаты.",
      hi: "भुगतान में त्रुटि हुई। कृपया पुनः प्रयास करें या दूसरी भुगतान विधि उपयोग करें।",
      ch: "支付出现错误。请重试或使用其他支付方式。",
      pt: "Ocorreu um erro no pagamento. Tente novamente ou use outro meio de pagamento.",
      ar: "حدث خطأ في الدفع. يرجى المحاولة مرة أخرى أو استخدام طريقة دفع أخرى."
    },
    "err.3dsTimeout": {
      fr: "L'authentification 3D Secure a expiré. Veuillez réessayer.",
      en: "3D Secure authentication has expired. Please try again.",
      es: "La autenticación 3D Secure ha expirado. Intente de nuevo.",
      de: "Die 3D-Secure-Authentifizierung ist abgelaufen. Bitte versuchen Sie es erneut.",
      ru: "Аутентификация 3D Secure истекла. Попробуйте снова.",
      hi: "3D Secure प्रमाणीकरण की समय सीमा समाप्त हो गई। कृपया पुनः प्रयास करें।",
      ch: "3D Secure验证已超时。请重试。",
      pt: "A autenticação 3D Secure expirou. Tente novamente.",
      ar: "انتهت مهلة مصادقة 3D Secure. يرجى المحاولة مرة أخرى."
    },
    "err.paypalCanceled.title": {
      fr: "Paiement annulé",
      en: "Payment cancelled",
      es: "Pago cancelado",
      de: "Zahlung abgebrochen",
      ru: "Платёж отменён",
      hi: "भुगतान रद्द किया गया",
      ch: "付款已取消",
      pt: "Pagamento cancelado",
      ar: "تم إلغاء الدفع"
    },
    "err.paypalCanceled.message": {
      fr: "Vous avez annulé le paiement. Vous pouvez réessayer quand vous le souhaitez.",
      en: "You cancelled the payment. You can try again whenever you're ready.",
      es: "Ha cancelado el pago. Puede intentarlo de nuevo cuando lo desee.",
      de: "Sie haben die Zahlung abgebrochen. Sie können es jederzeit erneut versuchen.",
      ru: "Вы отменили платёж. Вы можете попробовать снова в любое время.",
      hi: "आपने भुगतान रद्द कर दिया। आप जब चाहें फिर से प्रयास कर सकते हैं।",
      ch: "您已取消付款。您可以随时重试。",
      pt: "Você cancelou o pagamento. Pode tentar novamente quando quiser.",
      ar: "لقد ألغيت الدفع. يمكنك المحاولة مرة أخرى في أي وقت."
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

/* ConfirmModal extracted to ../components/ui/ConfirmModal.tsx */

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
  providerOffline?: boolean;
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
  clientNationality?: string;
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
    providerOffline,
    activePromo,
  }) => {
    const stripe = useStripe();
    const elements = useElements();
    const { t, language } = useTranslation();
    const intl = useIntl();
    const { getTraceAttributes } = usePriceTracing();

    // VERSION 7 - Debug avec alerte obligatoire
    useEffect(() => {
      // Alerte au montage pour confirmer que le code est déployé
      console.log("[DEBUG] " + "🔵 VERSION 7 chargée!\n\nStripe: " + (stripe ? "✅ Prêt" : "⏳ En chargement...") + "\nElements: " + (elements ? "✅ Prêt" : "⏳ En chargement..."));
    }, []); // Seulement au montage

    // Surveiller quand Stripe devient prêt
    useEffect(() => {
      if (stripe && elements) {
        console.log("[DEBUG] " + "✅ Stripe est maintenant PRÊT!\n\nVous pouvez cliquer sur Payer.");
      }
    }, [stripe, elements]);

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
    const [showFeeBreakdown, setShowFeeBreakdown] = useState(false);

    // Payment Request (Apple Pay / Google Pay)
    const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
    const [canMakePaymentRequest, setCanMakePaymentRequest] = useState(false);
    // Ref pour tracker si le PaymentRequest a déjà été initialisé (évite les re-créations)
    const paymentRequestInitializedRef = useRef(false);
    // Ref pour stocker le montant actuel et le mettre à jour sans recréer le PaymentRequest
    const currentAmountRef = useRef<number>(0);
    // Ref pour tracker isProcessing dans le handler Apple Pay (évite double paiement)
    const isProcessingRef = useRef(false);
    // État pour afficher le message 3D Secure
    const [show3DSMessage, setShow3DSMessage] = useState(false);

    // P0-1 FIX: callSessionId stable généré UNE SEULE FOIS pour garantir l'idempotence
    // NE PAS utiliser Date.now() dans actuallySubmitPayment car cela crée une nouvelle clé à chaque retry
    const [stableCallSessionId] = useState(() =>
      `call_session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    );

    // Ref pour accéder aux valeurs actuelles dans le handler sans re-attacher le listener
    // Initialisé avec une valeur vide, sera mis à jour par le useEffect ci-dessous
    const paymentDataRef = useRef<{
      user: typeof user;
      provider: typeof provider;
      service: typeof service;
      adminPricing: typeof adminPricing;
      serviceCurrency: typeof serviceCurrency;
      stripeCurrency: typeof stripeCurrency;
      stableCallSessionId: string;
      intl: typeof intl;
      t: typeof t;
      onSuccess: typeof onSuccess;
      onError: typeof onError;
      persistPaymentDocs: (paymentIntentId: string) => Promise<string>;
      // P0 FIX 2026-02-04: Add bookingMeta and language for Apple Pay call scheduling
      bookingMeta: typeof bookingMeta;
      language: typeof language;
    } | null>(null);

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
      if (adminPricing.totalAmount < 0.50) throw new Error(t("err.minAmount"));
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
          referralBy: (user as any).referredByUserId || getAffiliateRef() || getStoredReferralCode() || null,
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
            affiliateRef: getAffiliateRef() || "",
            referredByUserId: (user as any).referredByUserId || "",
            // Meta CAPI identifiers for purchase attribution
            ...(() => {
              const metaIds = getStoredMetaIdentifiers();
              return {
                ...(metaIds.fbp && { fbp: metaIds.fbp }),
                ...(metaIds.fbc && { fbc: metaIds.fbc }),
              };
            })(),
          },

          // ✅ Add coupon support (null for now, but ready for discounts)
          coupon: null, // Will be: { code: "SAVE10", discountAmount: 5.00 }

          // ✅ Add additional fields that might be useful
          totalSaved: 0, // Will calculate: original_standard_amount - amount
          appliedDiscounts: [], // Array of applied discounts
          referralBy: (user as any).referredByUserId || getAffiliateRef() || getStoredReferralCode() || null,
        };

        // AUDIT-FIX C4: Removed 3 dead Firestore writes that always fail silently:
        // - setDoc("payments/{id}") → rules: allow create: if false
        // - setDoc("users/{uid}/payments/{id}") → subcollection not in rules
        // - setDoc("providers/{id}/payments/{id}") → "providers" collection not in rules
        // The backend createPaymentIntent already creates canonical payment records.
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

    // Mettre à jour paymentDataRef avec les valeurs actuelles
    // Cela permet au handler Apple Pay d'accéder aux données à jour sans re-attacher le listener
    useEffect(() => {
      paymentDataRef.current = {
        user,
        provider,
        service,
        adminPricing,
        serviceCurrency,
        stripeCurrency,
        stableCallSessionId,
        intl,
        t,
        onSuccess,
        onError,
        persistPaymentDocs,
        // P0 FIX 2026-02-04: Add bookingMeta and language for Apple Pay call scheduling
        bookingMeta,
        language,
      };
    }, [
      user,
      provider,
      service,
      adminPricing,
      serviceCurrency,
      stripeCurrency,
      stableCallSessionId,
      intl,
      t,
      onSuccess,
      onError,
      persistPaymentDocs,
      bookingMeta,
      language,
    ]);

    // Initialiser Payment Request (Apple Pay / Google Pay) - UNE SEULE FOIS
    // Puis utiliser .update() pour changer le montant si nécessaire
    useEffect(() => {
      if (!stripe || !adminPricing.totalAmount) return;

      const amountInCents = Math.round(adminPricing.totalAmount * 100);
      const label = `SOS Expats - ${service.serviceType === "lawyer_call" ? "Avocat" : "Expert"}`;

      // Si le PaymentRequest existe déjà, mettre à jour le montant au lieu de recréer
      if (paymentRequestInitializedRef.current && paymentRequest) {
        // Seulement mettre à jour si le montant a changé
        if (currentAmountRef.current !== amountInCents) {
          console.log("[PaymentRequest] 🔄 Mise à jour du montant:", currentAmountRef.current, "→", amountInCents);
          currentAmountRef.current = amountInCents;
          // Note: PaymentRequest.update() n'est appelé qu'au moment du clic sur le bouton
          // Le bouton utilisera automatiquement le dernier état du PaymentRequest
          paymentRequest.update({
            total: {
              label,
              amount: amountInCents,
            },
          });
        }
        return;
      }

      // Première initialisation seulement
      console.log("[PaymentRequest] 🆕 Initialisation du PaymentRequest...");

      // Détecter le pays de l'utilisateur (FR par défaut pour zone euro)
      const detectUserCountry = (): string => {
        // Utiliser la locale du navigateur pour détecter le pays
        const locale = navigator.language || "fr-FR";
        const countryCode = locale.split("-")[1]?.toUpperCase();
        // Liste des pays supportés par Stripe Payment Request API
        const supportedCountries = ["AT", "AU", "BE", "BR", "CA", "CH", "DE", "DK", "EE", "ES", "FI", "FR", "GB", "GR", "HK", "IE", "IN", "IT", "JP", "LT", "LU", "LV", "MX", "MY", "NL", "NO", "NZ", "PH", "PL", "PT", "RO", "SE", "SG", "SI", "SK", "US"];
        return supportedCountries.includes(countryCode) ? countryCode : "FR";
      };

      const pr = stripe.paymentRequest({
        country: detectUserCountry(),
        currency: serviceCurrency,
        total: {
          label,
          amount: amountInCents,
        },
        requestPayerName: true,
        requestPayerEmail: true,
        requestPayerPhone: true, // Récupérer le téléphone si disponible
      });

      currentAmountRef.current = amountInCents;

      // Gérer l'événement cancel (utilisateur ferme Apple Pay sans payer)
      // UX: Pas de message d'erreur pour une annulation simple - l'utilisateur peut:
      // 1. Recliquer sur Apple Pay pour changer de carte
      // 2. Saisir une carte dans les champs CB affichés en dessous
      pr.on("cancel", () => {
        console.log("[PaymentRequest] 🔄 Utilisateur a fermé Apple Pay (peut réessayer ou saisir carte)");
        // CRITICAL: Réinitialiser le ref AVANT l'état React (évite race condition)
        isProcessingRef.current = false;
        setShow3DSMessage(false);
        setIsProcessing(false);
        // PAS de message d'erreur - juste prêt pour réessayer
      });

      // Vérifier si Apple Pay / Google Pay est disponible
      pr.canMakePayment().then((result) => {
        if (result) {
          console.log("[PaymentRequest] ✅ Apple Pay / Google Pay disponible:", result);
          paymentRequestInitializedRef.current = true;
          setPaymentRequest(pr);
          setCanMakePaymentRequest(true);
        } else {
          console.log("[PaymentRequest] ❌ Apple Pay / Google Pay non disponible");
          setCanMakePaymentRequest(false);
        }
      }).catch((err) => {
        console.error("[PaymentRequest] Erreur canMakePayment:", err);
        setCanMakePaymentRequest(false);
      });

      // Cleanup: reset les refs et l'état lors du démontage complet du composant
      return () => {
        paymentRequestInitializedRef.current = false;
        currentAmountRef.current = 0;
        setPaymentRequest(null);
        setCanMakePaymentRequest(false);
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stripe, serviceCurrency, service.serviceType]);

    // Mettre à jour le montant du PaymentRequest quand le prix change
    useEffect(() => {
      if (!paymentRequest || !adminPricing.totalAmount) return;

      const amountInCents = Math.round(adminPricing.totalAmount * 100);
      const label = `SOS Expats - ${service.serviceType === "lawyer_call" ? "Avocat" : "Expert"}`;

      if (currentAmountRef.current !== amountInCents) {
        console.log("[PaymentRequest] 💰 Mise à jour du montant:", currentAmountRef.current / 100, "€ →", amountInCents / 100, "€");
        currentAmountRef.current = amountInCents;
        paymentRequest.update({
          total: {
            label,
            amount: amountInCents,
          },
        });
      }
    }, [paymentRequest, adminPricing.totalAmount, service.serviceType]);

    // Gestionnaire du paiement via Apple Pay / Google Pay
    // IMPORTANT: Utilise paymentDataRef pour éviter de détacher/rattacher le handler
    // à chaque changement de données (ce qui causait des paiements perdus)
    useEffect(() => {
      if (!paymentRequest || !stripe) return;

      const handlePaymentMethod = async (ev: {
        paymentMethod: { id: string };
        complete: (status: "success" | "fail") => void;
      }) => {
        // P0 FIX: Protection anti-double-clic (synchrone, avant tout état React)
        if (isProcessingRef.current) {
          console.warn("[PaymentRequest] ⚠️ Paiement déjà en cours, ignoré");
          ev.complete("fail");
          return;
        }

        // IMPORTANT: Verrouiller IMMÉDIATEMENT avant toute opération async
        isProcessingRef.current = true;

        console.log("[PaymentRequest] 🍎 Paiement Apple Pay / Google Pay reçu");
        console.log("[PaymentRequest] 💳 Carte utilisée:", ev.paymentMethod.id.substring(0, 10) + "...");
        setIsProcessing(true);

        // Timeout de sécurité: 2 minutes max pour éviter tout blocage permanent
        const PAYMENT_TIMEOUT_MS = 2 * 60 * 1000;
        const timeoutId = setTimeout(() => {
          if (isProcessingRef.current) {
            console.error("[PaymentRequest] ⏱️ Timeout atteint, réinitialisation forcée");
            isProcessingRef.current = false;
            setShow3DSMessage(false);
            setIsProcessing(false);
          }
        }, PAYMENT_TIMEOUT_MS);

        // Vérifier que le ref est initialisé
        if (!paymentDataRef.current) {
          console.error("[PaymentRequest] ❌ paymentDataRef non initialisé");
          clearTimeout(timeoutId);
          ev.complete("fail");
          isProcessingRef.current = false;
          setIsProcessing(false);
          return;
        }

        // Récupérer les valeurs actuelles depuis le ref (toujours à jour)
        const {
          user: currentUser,
          provider: currentProvider,
          service: currentService,
          adminPricing: currentPricing,
          serviceCurrency: currentServiceCurrency,
          stripeCurrency: currentStripeCurrency,
          stableCallSessionId: currentCallSessionId,
          intl: currentIntl,
          t: currentT,
          onSuccess: currentOnSuccess,
          onError: currentOnError,
          persistPaymentDocs: currentPersistPaymentDocs,
          // P0 FIX 2026-02-04: Get bookingMeta and language for call scheduling
          bookingMeta: currentBookingMeta,
          language: currentLanguage,
        } = paymentDataRef.current;

        try {
          // Valider les données de base
          if (!currentUser?.uid) throw new Error(currentT("err.unauth"));
          if (currentPricing.totalAmount < 0.5) throw new Error(currentT("err.minAmount"));

          // Créer le PaymentIntent
          const createPaymentIntent: HttpsCallable<
            PaymentIntentData,
            PaymentIntentResponse
          > = httpsCallable(functionsPayment, "createPaymentIntent");

          const paymentData: PaymentIntentData = {
            amount: currentPricing.totalAmount,
            commissionAmount: currentPricing.connectionFeeAmount,
            providerAmount: currentPricing.providerAmount,
            currency: currentStripeCurrency,
            serviceType: currentService.serviceType,
            providerId: currentProvider.id,
            clientId: currentUser.uid,
            clientEmail: currentUser.email || "",
            providerName: currentProvider.fullName || currentProvider.name || "",
            callSessionId: currentCallSessionId,
            description:
              currentService.serviceType === "lawyer_call"
                ? currentIntl.formatMessage({ id: "checkout.consultation.lawyer" })
                : currentIntl.formatMessage({ id: "checkout.consultation.expat" }),
            metadata: {
              providerType: currentProvider.role || currentProvider.type || "expat",
              duration: String(currentPricing.duration),
              clientName: `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim(),
              clientPhone: currentService.clientPhone || "",
              clientWhatsapp: "",
              currency: currentServiceCurrency,
              timestamp: new Date().toISOString(),
              callSessionId: currentCallSessionId,
              paymentMethod: "apple_pay_google_pay",
              affiliateRef: getAffiliateRef() || getStoredReferralCode() || "",
              referredByUserId: (currentUser as any).referredByUserId || "",
            },
          };

          const res = await createPaymentIntent(paymentData);
          const resData = res.data as PaymentIntentResponse;

          if (!resData?.clientSecret) {
            throw new Error(currentT("err.noClientSecret"));
          }

          // Confirmer le paiement avec le payment method de Apple Pay / Google Pay
          const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
            resData.clientSecret,
            { payment_method: ev.paymentMethod.id },
            { handleActions: false }
          );

          if (confirmError) {
            console.error("[PaymentRequest] ❌ Erreur confirmation:", confirmError);
            ev.complete("fail");
            currentOnError(confirmError.message || currentT("err.stripe"));
            return;
          }

          if (!paymentIntent) {
            ev.complete("fail");
            currentOnError(currentT("err.paymentFailed"));
            return;
          }

          // Gérer 3D Secure si nécessaire
          if (paymentIntent.status === "requires_action") {
            console.log("[PaymentRequest] 🔐 3D Secure requis...");
            // P0 FIX: Afficher un message visible à l'utilisateur pendant 3D Secure
            setShow3DSMessage(true);
            const { error: actionError } = await stripe.confirmCardPayment(resData.clientSecret);
            setShow3DSMessage(false);
            if (actionError) {
              ev.complete("fail");
              isProcessingRef.current = false;
              currentOnError(actionError.message || currentT("err.actionRequired"));
              return;
            }
          }

          // Succès !
          ev.complete("success");
          console.log("[PaymentRequest] ✅ Paiement Apple Pay / Google Pay réussi!");

          // P0 FIX 2026-02-04: Schedule the call for Apple Pay (was missing!)
          const clientPhoneE164 = toE164(currentService.clientPhone || "");
          const providerPhoneE164 = toE164(
            currentProvider.phoneNumber || currentProvider.phone || ""
          );

          let callStatus: "scheduled" | "skipped" = "skipped";
          let callId: string | undefined;

          // Planifier l'appel si les numéros sont valides
          if (
            /^\+[1-9]\d{8,14}$/.test(clientPhoneE164) &&
            /^\+[1-9]\d{8,14}$/.test(providerPhoneE164)
          ) {
            const createAndScheduleCall: HttpsCallable<
              CreateAndScheduleCallData,
              { success: boolean; callId?: string }
            > = httpsCallable(functions, "createAndScheduleCall");

            const callData: CreateAndScheduleCallData = {
              providerId: currentProvider.id,
              clientId: currentUser.uid!,
              providerPhone: providerPhoneE164,
              clientPhone: clientPhoneE164,
              clientWhatsapp: "",
              serviceType: currentService.serviceType,
              providerType: (currentProvider.role ||
                currentProvider.type ||
                "expat") as ServiceKind,
              paymentIntentId: paymentIntent.id,
              amount: currentPricing.totalAmount,
              currency: currentServiceCurrency.toUpperCase() as "EUR" | "USD",
              delayMinutes: 5,
              clientLanguages: [currentLanguage],
              providerLanguages: currentProvider.languagesSpoken ||
                currentProvider.languages || ["fr"],
              callSessionId: currentCallSessionId,
              // P0 FIX: Pass booking form data for SMS notifications to provider
              bookingTitle: currentBookingMeta?.title || "",
              bookingDescription: currentBookingMeta?.description || "",
              clientCurrentCountry: currentBookingMeta?.country || "",
              clientFirstName: currentBookingMeta?.clientFirstName || currentUser?.firstName || currentUser?.fullName?.split(" ")[0] || "",
              clientNationality: currentBookingMeta?.clientNationality || "",
            };

            console.log("[PaymentRequest] [createAndScheduleCall] data", callData);

            try {
              const callResult = await createAndScheduleCall(callData);
              console.log("[PaymentRequest] callResult:", callResult);
              if (callResult && callResult.data && callResult.data.success) {
                console.log("[PaymentRequest] [createAndScheduleCall] success");
                callStatus = "scheduled";
                callId = callResult.data.callId || currentCallSessionId;
              }
            } catch (cfErr: unknown) {
              console.error("[PaymentRequest] createAndScheduleCall error:", cfErr);
              // P1-2 FIX: Informer le client — le paiement est en manual capture,
              // pas de débit tant que l'appel n'a pas eu lieu
              currentOnError(
                t("checkout.err.callSchedulingFailed") ||
                "Une erreur est survenue lors de la planification de l'appel. Votre carte n'a pas été débitée. Veuillez réessayer."
              );
              return; // Stop le flow — pas de navigation vers payment-success
            }
          } else {
            console.warn("[PaymentRequest] Missing/invalid phone(s). Skipping call scheduling.", {
              clientPhoneE164,
              providerPhoneE164,
            });
          }

          // Persister les documents et appeler onSuccess
          const orderId = await currentPersistPaymentDocs(paymentIntent.id);

          currentOnSuccess({
            paymentIntentId: paymentIntent.id,
            call: callStatus,
            orderId: orderId,
            callId: callId,
          });
        } catch (err) {
          console.error("[PaymentRequest] ❌ Erreur:", err);
          ev.complete("fail");
          currentOnError(err instanceof Error ? err.message : String(err));
        } finally {
          // CRITICAL: Nettoyer le timeout et réinitialiser TOUS les états
          clearTimeout(timeoutId);
          isProcessingRef.current = false;
          setShow3DSMessage(false);
          setIsProcessing(false);
          console.log("[PaymentRequest] 🔄 États réinitialisés, prêt pour nouveau paiement");
        }
      };

      // Attacher le handler UNE SEULE FOIS (pas de détachement/rattachement)
      paymentRequest.on("paymentmethod", handlePaymentMethod);

      return () => {
        paymentRequest.off("paymentmethod", handlePaymentMethod);
      };
    // Dépendances minimales: seulement paymentRequest et stripe
    // Les autres valeurs sont lues depuis paymentDataRef.current
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paymentRequest, stripe]);

    const actuallySubmitPayment = useCallback(async () => {
      // VERSION 8 - LOGS COMPLETS
      console.log("[DEBUG] " + "🔵 actuallySubmitPayment: DÉBUT\n\nstripe: " + !!stripe + "\nelements: " + !!elements);

      try {
        setIsProcessing(true);
        console.log("[DEBUG] " + "🔵 actuallySubmitPayment: isProcessing=true, validation...");

        validatePaymentData();
        console.log("[DEBUG] " + "🔵 actuallySubmitPayment: Données validées ✅");

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

        // P0-2 FIX: Valider le téléphone du PRESTATAIRE avant le paiement
        // Si le prestataire n'a pas de numéro valide, l'appel Twilio échouera
        const providerPhoneForValidation = toE164(
          provider.phoneNumber || provider.phone || ""
        );
        if (!/^\+[1-9]\d{8,14}$/.test(providerPhoneForValidation)) {
          console.error("[P0-2] Provider phone invalid:", providerPhoneForValidation);
          onError(t("checkout.err.providerPhoneInvalid") || "Le prestataire n'a pas de numéro de téléphone valide. Veuillez contacter le support.");
          throw new Error("Provider phone invalid");
        }

        const createPaymentIntent: HttpsCallable<
          PaymentIntentData,
          PaymentIntentResponse
        > = httpsCallable(functionsPayment, "createPaymentIntent");

        // Prepare coupon data
        // AUDIT-FIX C2: Match backend createPaymentIntent coupon structure
        const couponData = activePromo
          ? {
              code: activePromo.code,
              discountType: activePromo.discountType,
              discountAmount: activePromo.discountValue,
              discountValue: activePromo.discountValue,
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
          callSessionId: callSessionId, // Important: needed for idempotency key
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
            affiliateRef: getAffiliateRef() || getStoredReferralCode() || "",
            referredByUserId: (user as any).referredByUserId || "",
            // Meta CAPI identifiers for purchase attribution and deduplication
            ...(() => {
              const metaIds = getStoredMetaIdentifiers();
              // Generate/retrieve the same eventId used for Pixel tracking
              const pixelEventId = getOrCreateEventId(`purchase_${callSessionId}`, 'purchase');
              // Get UTM params for attribution
              const trafficSource = getCurrentTrafficSource();
              return {
                ...(metaIds.fbp && { fbp: metaIds.fbp }),
                ...(metaIds.fbc && { fbc: metaIds.fbc }),
                // IMPORTANT: Pass eventId to backend for CAPI deduplication
                pixelEventId: pixelEventId,
                // UTM params for campaign attribution
                ...(trafficSource?.utm_source && { utm_source: trafficSource.utm_source }),
                ...(trafficSource?.utm_medium && { utm_medium: trafficSource.utm_medium }),
                ...(trafficSource?.utm_campaign && { utm_campaign: trafficSource.utm_campaign }),
                ...(trafficSource?.utm_content && { utm_content: trafficSource.utm_content }),
                ...(trafficSource?.utm_term && { utm_term: trafficSource.utm_term }),
                // Additional click IDs for multi-platform attribution
                ...(trafficSource?.gclid && { gclid: trafficSource.gclid }),
                ...(trafficSource?.ttclid && { ttclid: trafficSource.ttclid }),
              };
            })(),
          },
          // Include coupon information if active
          ...(couponData && { coupon: couponData }),
        };

        console.log("[DEBUG] " + "🔵 actuallySubmitPayment: Appel createPaymentIntent...\n\nMontant: " + paymentData.amount + "€\nProvider: " + paymentData.providerId);

        let resData: PaymentIntentResponse | null = null;
        try {
          const res = await createPaymentIntent(paymentData);
          resData = res.data as PaymentIntentResponse;
          console.log("[DEBUG] " + "🔵 actuallySubmitPayment: createPaymentIntent OK!\n\nclientSecret: " + (resData?.clientSecret ? "✅ reçu" : "❌ manquant"));
        } catch (e: unknown) {
          logCallableError("[createPaymentIntent:error]", e);
          console.log("[DEBUG] " + "❌ ERREUR createPaymentIntent:\n\n" + (e instanceof Error ? e.message : String(e)));
          throw e;
        }

        const clientSecret = resData?.clientSecret;
        if (!clientSecret) {
          console.log("[DEBUG] " + "❌ Pas de clientSecret!");
          throw new Error(t("err.noClientSecret"));
        }

        // Pour Destination Charges, le PaymentIntent est créé sur la plateforme
        // Le transfert vers le provider est automatique après capture
        if (resData?.useDirectCharges) {
          console.log("[DEBUG] Provider has completed KYC - using Destination Charges");
        }

        const chosenCardElement = isMobile
          ? elements!.getElement(CardElement)
          : elements!.getElement(CardNumberElement);

        if (!chosenCardElement) {
          console.log("[DEBUG] " + "❌ CardElement non trouvé! isMobile=" + isMobile);
          throw new Error(t("err.noCardElement"));
        }

        // ========== META PIXEL TRACKING: AddPaymentInfo ==========
        // Track quand l'utilisateur soumet ses informations de paiement
        // Cet événement est envoyé AVANT la confirmation du paiement
        try {
          const eventId = getOrCreateEventId(`checkout_${callSessionId}`, 'checkout');
          trackMetaAddPaymentInfo({
            value: adminPricing.totalAmount,
            currency: serviceCurrency.toUpperCase(),
            content_category: provider.role || provider.type || 'service',
            content_ids: [provider.id],
            eventID: eventId,
          });
          console.log("[MetaPixel] AddPaymentInfo tracked", { amount: adminPricing.totalAmount, eventId });
        } catch (trackingError) {
          // Ne pas bloquer le paiement si le tracking échoue
          console.warn("[MetaPixel] AddPaymentInfo tracking failed:", trackingError);
        }
        // ========== END META PIXEL TRACKING ==========

        console.log("[DEBUG] " + "🔵 actuallySubmitPayment: Appel confirmCardPayment...");

        // Timeout 60s to prevent UI from freezing indefinitely on network issues
        const confirmPromise = stripe!.confirmCardPayment(
          clientSecret,
          {
            payment_method: {
              card: chosenCardElement,
              billing_details: {
                name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
                email: user.email || "",
              },
            },
          }
        );
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Payment confirmation timed out. Please check your connection and try again.")), 60000)
        );
        const result = await Promise.race([confirmPromise, timeoutPromise]);

        if (result.error) {
          console.log("[DEBUG] " + "❌ Erreur Stripe: " + result.error.message);
          throw new Error(result.error.message || t("err.stripe"));
        }

        const paymentIntent = result.paymentIntent;
        if (!paymentIntent) {
          console.log("[DEBUG] " + "❌ Pas de paymentIntent!");
          throw new Error(t("err.paymentFailed"));
        }

        console.log("[DEBUG] " + "✅ Paiement réussi!\n\nID: " + paymentIntent.id + "\nStatus: " + paymentIntent.status);

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
            // P0 FIX: Pass booking form data for SMS notifications to provider
            bookingTitle: bookingMeta?.title || "",
            bookingDescription: bookingMeta?.description || "",
            clientCurrentCountry: bookingMeta?.country || "",
            clientFirstName: bookingMeta?.clientFirstName || user?.firstName || user?.fullName?.split(" ")[0] || "",
            clientNationality: bookingMeta?.clientNationality || "",
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
            // P1-2 FIX: Ne pas continuer silencieusement — informer le client
            // Le paiement est en mode manual capture, il ne sera PAS débité
            // tant que l'appel n'a pas lieu (capture après 2 min de conversation)
            // NOTE: `return` (pas `throw`) pour éviter que le catch externe n'appelle onError une 2e fois
            onError(
              t("checkout.err.callSchedulingFailed") ||
              "Une erreur est survenue lors de la planification de l'appel. Votre carte n'a pas été débitée. Veuillez réessayer."
            );
            return;
          }
        } else {
          console.warn("Missing/invalid phone(s). Skipping call scheduling.");
        }

        console.log("🔵 [STRIPE_DEBUG] Persisting payment documents...");
        const orderId = await persistPaymentDocs(paymentIntent.id);
        console.log("🔵 [STRIPE_DEBUG] persistPaymentDocs result:", { orderId });

        // P2-3 FIX: Supprimé sendProviderNotifications() ici — les notifications
        // sont déjà envoyées par createAndScheduleCallHTTPS côté backend
        // (message_events créés dans la Cloud Function). L'appel ici causait un double SMS.

        const gtag = getGtag();
        gtag?.("event", "checkout_success", {
          service_type: service.serviceType,
          provider_id: provider.id,
          payment_intent: paymentIntent.id,
          currency: serviceCurrency,
          amount: adminPricing.totalAmount,
          call_status: callStatus,
        });

        // DEBUG: Log avant le setTimeout pour la redirection
        console.log("🔵 [STRIPE_DEBUG] Payment complete, scheduling navigation in 3s...", {
          paymentIntentId: paymentIntent.id,
          callStatus,
          callId,
          orderId,
          currentPath: window.location.pathname,
          timestamp: new Date().toISOString()
        });

        // Log pour la call session si créée
        if (callId) {
          callLogger.sessionCreated({
            callSessionId: callId,
            providerId: provider.id,
            clientId: user.uid!
          });
        }

        // All async operations complete — call onSuccess immediately (no artificial delay)
        try {
          const finalCallId = callId || callSessionId;
          console.log("🔵 [STRIPE_DEBUG] callId resolution:", { callId, callSessionId, finalCallId });

          onSuccess({
            paymentIntentId: paymentIntent.id,
            call: callStatus,
            callId: finalCallId,
            orderId: orderId,
          });
          console.log("✅ [STRIPE_DEBUG] onSuccess called successfully");
        } catch (successError) {
          console.error("❌ [STRIPE_DEBUG] onSuccess threw error:", successError);
          paymentLogger.paymentError(successError instanceof Error ? successError : String(successError), {
            step: 'onSuccess callback',
            paymentIntentId: paymentIntent.id
          });
        }
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
      setError,
      watch,
      bookingMeta,
      t,
      activePromo,
    ]);

    const handlePaymentSubmit = useCallback(
      async (e: React.FormEvent) => {
        // VERSION 8 - LOGS COMPLETS
        console.log("[DEBUG] " + "📍 ÉTAPE 1: handlePaymentSubmit appelée");

        e.preventDefault();

        console.log("[DEBUG] " + "📍 ÉTAPE 2: État actuel\n\nstripe: " + !!stripe + "\nelements: " + !!elements + "\nisProcessing: " + isProcessing + "\nmontant: " + adminPricing.totalAmount + "€");

        if (!stripe) {
          console.log("[DEBUG] " + "❌ ÉTAPE 2a: Stripe pas prêt!");
          onError("Stripe n'est pas encore prêt. Veuillez patienter.");
          return;
        }

        if (!elements) {
          console.log("[DEBUG] " + "❌ ÉTAPE 2b: Elements pas prêt!");
          onError("Le formulaire de paiement n'est pas encore chargé.");
          return;
        }

        if (isProcessing) {
          console.log("[DEBUG] " + "⚠️ ÉTAPE 2c: Déjà en cours de traitement, ignoré");
          return;
        }

        if (adminPricing.totalAmount > 100) {
          console.log("[DEBUG] " + "📍 ÉTAPE 3a: Montant > 100€, affichage confirmation");
          setPendingSubmit(() => actuallySubmitPayment);
          setShowConfirm(true);
          return;
        }

        console.log("[DEBUG] " + "📍 ÉTAPE 3b: Appel actuallySubmitPayment...");

        try {
          await actuallySubmitPayment();
          console.log("[DEBUG] " + "✅ ÉTAPE FINALE: actuallySubmitPayment terminée");
        } catch (err) {
          console.log("[DEBUG] " + "❌ ERREUR dans actuallySubmitPayment: " + (err instanceof Error ? err.message : String(err)));
        }
      },
      [isProcessing, adminPricing.totalAmount, actuallySubmitPayment, stripe, elements, onError]
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
        <form onSubmit={(e) => { e.preventDefault(); console.log("[Form] onSubmit intercepted"); handlePaymentSubmit(e); }} className="space-y-4" noValidate>
          <div className="space-y-4">
            {/* Message 3D Secure - Overlay semi-bloquant pour clarté */}
            {show3DSMessage && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center space-x-3 shadow-sm">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
                <span className="text-blue-700 font-medium">
                  {language === "fr" ? "Vérification bancaire en cours..." :
                   language === "es" ? "Verificación bancaria en curso..." :
                   language === "de" ? "Bankverifizierung läuft..." :
                   "Bank verification in progress..."}
                </span>
              </div>
            )}

            {/* ========== PROGRESSIVE DISCLOSURE: UX SIMPLIFIÉE ========== */}

            {/* OPTION 1: Apple Pay / Google Pay (si disponible) */}
            {canMakePaymentRequest && paymentRequest && !isProcessing && (
              <div className="space-y-4">
                {/* Bouton Apple Pay / Google Pay - PRINCIPAL */}
                <div>
                  <p className="text-sm text-gray-600 mb-2 text-center">
                    {language === "fr" ? "Paiement rapide et sécurisé" :
                     language === "es" ? "Pago rápido y seguro" :
                     language === "de" ? "Schnelle und sichere Zahlung" :
                     "Fast and secure payment"}
                  </p>
                  <PaymentRequestButtonElement
                    options={{
                      paymentRequest,
                      style: {
                        paymentRequestButton: {
                          type: "default",
                          theme: "dark",
                          height: "52px",
                        },
                      },
                    }}
                  />
                </div>

                {/* Séparateur "ou" entre Apple Pay et carte */}
                <div className="flex items-center my-2">
                  <div className="flex-1 border-t border-gray-200"></div>
                  <span className="px-3 text-sm text-gray-400">
                    {language === "fr" ? "ou" :
                     language === "es" ? "o" :
                     language === "de" ? "oder" :
                     "or"}
                  </span>
                  <div className="flex-1 border-t border-gray-200"></div>
                </div>
              </div>
            )}

            {/* OPTION 2: Champs de carte (toujours visible) */}
                {/* Label simple et clair */}
                <div className="flex items-center space-x-2 mb-3">
                  <CreditCard className="w-5 h-5 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    {language === "fr" ? "Informations de carte" :
                     language === "es" ? "Información de tarjeta" :
                     language === "de" ? "Karteninformationen" :
                     "Card information"}
                  </span>
                </div>

            {isMobile ? (
              /* Mobile: Un seul champ unifié (numéro + date + CVC) */
              <div className="space-y-2" aria-live="polite">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CreditCard
                      className="h-4 w-4 text-gray-400"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="pl-10 pr-3 py-3.5 border-2 border-gray-200 rounded-lg bg-white focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/20 transition-all duration-200 hover:border-gray-300">
                    <CardElement options={singleCardElementOptions} />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-600">
                    {t("card.number")}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <CreditCard
                        className="h-4 w-4 text-gray-400"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="pl-10 pr-3 py-3.5 border-2 border-gray-200 rounded-lg bg-white focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/20 transition-all duration-200 hover:border-gray-300">
                      <CardNumberElement options={cardElementOptions} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-600">
                      {t("card.expiry")}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Calendar
                          className="h-4 w-4 text-gray-400"
                          aria-hidden="true"
                        />
                      </div>
                      <div className="pl-10 pr-3 py-3.5 border-2 border-gray-200 rounded-lg bg-white focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/20 transition-all duration-200 hover:border-gray-300">
                        <CardExpiryElement options={cardElementOptions} />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-600">
                      {t("card.cvc")}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Shield
                          className="h-4 w-4 text-gray-400"
                          aria-hidden="true"
                        />
                      </div>
                      <div className="pl-10 pr-3 py-3.5 border-2 border-gray-200 rounded-lg bg-white focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/20 transition-all duration-200 hover:border-gray-300">
                        <CardCvcElement options={cardElementOptions} />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
            {/* ========== FIN PROGRESSIVE DISCLOSURE ========== */}
          </div>

          {/* Compact fee breakdown link */}
          <div className="mt-3 mb-3">
            <button
              type="button"
              onClick={() => setShowFeeBreakdown(!showFeeBreakdown)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
              aria-expanded={showFeeBreakdown}
            >
              <Info className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="underline underline-offset-2">
                {intl.formatMessage({ id: "checkout.feeBreakdown", defaultMessage: "Détail des frais" })}
              </span>
            </button>
            {showFeeBreakdown && (
              <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {intl.formatMessage({ id: "checkout.platformFees", defaultMessage: "Frais de plateforme" })}
                  </span>
                  <span className="font-medium text-gray-800">
                    {adminPricing.connectionFeeAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {intl.formatMessage({ id: "checkout.expertFee", defaultMessage: "Rémunération expert" })}
                  </span>
                  <span className="font-medium text-gray-800">
                    {adminPricing.providerAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* m2 AUDIT FIX: Show warning when provider went offline during checkout */}
          {providerOffline && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>
                {language === "fr"
                  ? "Ce prestataire n'est plus disponible actuellement. Veuillez réessayer plus tard."
                  : "This provider is currently unavailable. Please try again later."}
              </span>
            </div>
          )}

          {/* Reassurance message */}
          <p className="text-center text-xs text-gray-500 mt-3 mb-1 px-2">
            <Shield className="w-3 h-3 inline-block mr-1 -mt-0.5 text-green-600" aria-hidden="true" />
            {intl.formatMessage({ id: "checkout.reassurance", defaultMessage: "Vous ne serez débité qu'après la mise en relation avec votre expert" })}
          </p>

          {/* Pay button - sticky on mobile */}
          <div
            className="sticky bottom-0 -mx-4 px-4 py-3 bg-white/95 backdrop-blur-sm border-t border-gray-100 mt-1 z-10 md:relative md:mx-0 md:px-0 md:py-0 md:bg-transparent md:backdrop-blur-none md:border-0 md:mt-1 md:z-auto"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <button
              type="button"
              disabled={!stripe || !elements || isProcessing || providerOffline}
              onClick={(e) => {
                // VERSION 7 - Alerte à CHAQUE clic
                console.log("[DEBUG] " + "🟡 BOUTON CLIQUÉ!\n\nStripe: " + (stripe ? "✅" : "❌") + "\nElements: " + (elements ? "✅" : "❌") + "\nisProcessing: " + isProcessing);

                e.preventDefault();
                e.stopPropagation();

                if (!stripe || !elements) {
                  console.log("[DEBUG] " + "⚠️ Stripe pas prêt. Attendez...");
                  return;
                }

                console.log("[DEBUG] " + "🚀 Lancement du paiement...");

                try {
                  handlePaymentSubmit(e as unknown as React.FormEvent);
                } catch (err) {
                  console.log("[DEBUG] " + "❌ ERREUR: " + (err instanceof Error ? err.message : String(err)));
                }
              }}
              className={
                "w-full py-4 rounded-2xl font-bold text-lg text-white transition-all " +
                "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 " +
                "active:scale-[0.98] touch-manipulation relative overflow-hidden min-h-[60px] " +
                (!stripe || !elements || isProcessing || providerOffline
                  ? "bg-gray-400 cursor-not-allowed opacity-60"
                  : "bg-gradient-to-r from-red-500 to-orange-500 shadow-lg shadow-red-500/30")
              }
              aria-label={`${intl.formatMessage({ id: "checkout.btn.pay" })} ${formatCurrency(adminPricing.totalAmount, serviceCurrency.toUpperCase(), {
                language,
                minimumFractionDigits: 2,
              })}`}
            >
              {!stripe || !elements ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full border-2 border-white border-t-transparent w-5 h-5" />
                  <span>
                    {language === "fr" ? "Chargement..." : "Loading..."}
                  </span>
                </div>
              ) : isProcessing ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full border-2 border-white border-t-transparent w-5 h-5" />
                  <span>
                    {language === "fr" ? "Traitement..." : "Processing..."}
                  </span>
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

            <div className="flex items-center justify-center mt-2">
              <div className="flex items-center space-x-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
                <Shield className="w-3 h-3 text-green-600" aria-hidden={true} />
                <span className="text-xs font-medium text-gray-700">Stripe</span>
                <div
                  className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"
                  aria-hidden={true}
                />
              </div>
            </div>
          </div>
        </form>

        {/* Modale de confirmation */}
        <ConfirmModal
          open={showConfirm}
          title={intl.formatMessage({ id: "checkout.confirmPayment" })}
          message={intl.formatMessage(
            { id: "checkout.confirmPaymentMessage" },
            { amount: adminPricing.totalAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), symbol: currencySymbol, currency: serviceCurrency.toUpperCase() }
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
    pricing?: PricingConfig;
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

  // Réduction affiliée : GroupAdmin ($5 fixe), Influencer (5%), ou Partner (configurable)
  const [affiliateDiscount, setAffiliateDiscount] = useState<{
    type: 'groupAdmin' | 'influencer' | 'partner';
    discountType: 'fixed' | 'percentage';
    discountValue: number; // en unité monétaire pour fixed, en % pour percentage
    maxDiscountCents?: number; // cap max pour percentage partner
    affiliateCode: string;
    label?: string;
  } | null>(null);

  // m4 FIX: Load promo code from sessionStorage and revalidate server-side
  useEffect(() => {
    const revalidatePromo = async () => {
      try {
        const saved = sessionStorage.getItem("activePromoCode");
        if (!saved) return;

        const promoData = JSON.parse(saved);
        if (!promoData?.code) return;

        // Show optimistically while revalidating
        setActivePromo(promoData);

        // Revalidate via Cloud Function callable
        const svcType = serviceData?.serviceType || "expat_call";
        const validateCoupon = httpsCallable<
          { code: string; serviceType: string; totalAmount: number },
          { isValid: boolean; discountType: string; discountValue: number }
        >(functions, "validateCouponCallable");

        const result = await validateCoupon({
          code: promoData.code,
          serviceType: svcType,
          totalAmount: 0, // totalAmount not needed for validity check
        });

        if (!result.data.isValid) {
          console.warn("[CallCheckout] Promo revalidation failed, clearing:", promoData.code);
          setActivePromo(null);
          sessionStorage.removeItem("activePromoCode");
        }
      } catch (error) {
        console.error("Error revalidating promo:", error);
        // On error, keep the promo — backend will revalidate in createPaymentIntent
      }
    };
    revalidatePromo();
  }, [serviceData?.serviceType]);

  // Charger le discount affilié via le callable unifié (Phase 7.4)
  // Remplace 3 lectures Firestore directes par 1 appel backend
  useEffect(() => {
    if (!user?.uid) return;
    const fetchAffiliateDiscount = async () => {
      try {
        const resolveFn = httpsCallable<
          { clientId: string; originalPrice: number; serviceType?: string },
          {
            hasDiscount: boolean;
            discountAmount: number;
            originalPrice: number;
            finalPrice: number;
            label?: string;
            referrerCode?: string;
            discountType?: 'fixed' | 'percentage';
            discountValue?: number;
          }
        >(functionsPayment, 'resolveAffiliateDiscountCallable');

        // Use a representative price for preview (the actual discount is recalculated server-side in createPaymentIntent)
        const result = await resolveFn({
          clientId: user.uid!,
          originalPrice: 5500, // $55 default preview price in cents
          serviceType: serviceData?.serviceType,
        });

        const data = result.data;
        if (data.hasDiscount && data.discountType && data.discountValue !== undefined) {
          setAffiliateDiscount({
            type: 'partner', // unified system uses plan-based type
            discountType: data.discountType,
            discountValue: data.discountType === 'fixed' ? data.discountValue / 100 : data.discountValue,
            affiliateCode: data.referrerCode || '',
            label: data.label || undefined,
          });
        }
      } catch (err) {
        console.error('[CallCheckout] Unified affiliate discount lookup failed (non-blocking):', err);
        // Fallback: try legacy direct Firestore reads
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid!));
          const userData = userDoc.data();
          if (userData?.groupAdminReferredBy) {
            setAffiliateDiscount({
              type: 'groupAdmin',
              discountType: 'fixed',
              discountValue: 5,
              affiliateCode: String(userData.groupAdminReferredBy),
            });
          } else if (userData?.influencerReferredBy) {
            setAffiliateDiscount({
              type: 'influencer',
              discountType: 'percentage',
              discountValue: 5,
              affiliateCode: String(userData.influencerReferredBy),
            });
          }
        } catch {
          // Silently fail — discount is not critical for checkout
        }
      }
    };
    fetchAffiliateDiscount();
  }, [user?.uid, serviceData?.serviceType]);

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

  // m2 AUDIT FIX: Real-time provider online status listener
  const [providerOffline, setProviderOffline] = useState(false);
  useEffect(() => {
    if (!provider?.id) return;
    const unsub = onSnapshot(
      doc(db, "sos_profiles", provider.id),
      (snap) => {
        const d = snap.data();
        if (!d) return;
        // Only treat truly offline providers as unavailable
        // "busy" means reserved for a call (possibly THIS client's call) — not offline
        const isOff = d.isOnline === false || d.availability === "offline";
        setProviderOffline(isOff);
      },
      (err) => console.warn("[CallCheckout] Provider status listener error:", err)
    );
    return unsub;
  }, [provider?.id]);

  // Déterminer le gateway de paiement (Stripe ou PayPal) selon le pays du provider
  const providerCountryCode = useMemo(() => {
    if (!provider) return undefined;
    // Convertir le nom ou code pays en code ISO-2 normalisé
    // Ex: "Algeria" → "DZ", "France" → "FR", "FR" → "FR"
    const code = normalizeCountryToCode(provider.country);
    return code;
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

  // Récupérer les données de réservation pour validation PayPal
  const bookingDataForValidation = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("bookingMeta");
      if (!raw) return undefined;
      const parsed = JSON.parse(raw);
      return {
        firstName: parsed.clientFirstName || user?.firstName || "",
        lastName: parsed.clientLastName || user?.lastName || "",
        title: parsed.title || "",
        description: parsed.description || "",
        clientPhone: storedClientPhone || user?.phone || "",
        currentCountry: parsed.country || "",
        // P2 FIX: Include clientLanguages for SMS notifications
        clientLanguages: parsed.clientLanguages || [],
      };
    } catch {
      return undefined;
    }
  }, [storedClientPhone, user?.firstName, user?.lastName, user?.phone]);

  const adminPricing: PricingEntryTrace | null = useMemo(() => {
    if (!pricing || !providerRole) return null;

    // Utilise getEffectivePrice pour prendre en compte les overrides promo
    const { price: effectivePricing, override: activeOverride } = getEffectivePrice(
      pricing,
      providerRole as 'lawyer' | 'expat',
      selectedCurrency
    );
    if (!effectivePricing) return null;

    const serviceKey = providerRole === "lawyer" ? "lawyer_call" : "expat_call";
    const promoApplies = activePromo && activePromo.services.includes(serviceKey);

    // Vérifier si le coupon est cumulable avec l'override actif
    const stackableDefault = pricing.overrides?.settings?.stackableDefault;
    const couponStackable = activeOverride
      ? (typeof activeOverride.stackableWithCoupons === 'boolean'
          ? activeOverride.stackableWithCoupons
          : (stackableDefault ?? false))
      : true;

    const couponApplies = promoApplies && couponStackable;

    let currentTotal = effectivePricing.totalAmount;
    let totalDiscountApplied = 0;

    // 1. Appliquer le coupon promo (seulement si pas d'override actif OU stackable)
    if (couponApplies) {
      let promoDiscount = 0;
      if (activePromo.discountType === "percentage") {
        promoDiscount = effectivePricing.totalAmount * (activePromo.discountValue / 100);
      } else {
        promoDiscount = Math.min(activePromo.discountValue, effectivePricing.totalAmount);
      }
      promoDiscount = Math.max(0, promoDiscount);
      currentTotal = Math.max(0, Math.round((currentTotal - promoDiscount) * 100) / 100);
      totalDiscountApplied += promoDiscount;
    }

    // 2. Appliquer le discount affilié (GroupAdmin $5 fixe, Influencer 5%, Partner configurable)
    // DOIT correspondre exactement au calcul backend dans createPaymentIntent.ts
    if (affiliateDiscount) {
      let afDiscount = 0;
      if (affiliateDiscount.discountType === 'fixed') {
        afDiscount = Math.min(affiliateDiscount.discountValue, currentTotal);
      } else {
        afDiscount = Math.round((currentTotal * affiliateDiscount.discountValue / 100) * 100) / 100;
        // Partner percentage discount: apply max cap if set
        if (affiliateDiscount.maxDiscountCents && affiliateDiscount.maxDiscountCents > 0) {
          afDiscount = Math.min(afDiscount, affiliateDiscount.maxDiscountCents / 100);
        }
        afDiscount = Math.min(afDiscount, currentTotal);
      }
      afDiscount = Math.max(0, afDiscount);
      currentTotal = Math.max(0, Math.round((currentTotal - afDiscount) * 100) / 100);
      totalDiscountApplied += afDiscount;
    }

    if (totalDiscountApplied === 0) return effectivePricing;

    console.log("🎉 [Pricing] Discounts applied:", {
      activePromo: activePromo?.code,
      affiliateDiscount: affiliateDiscount?.type,
      baseAmount: effectivePricing.totalAmount,
      totalDiscountApplied,
      finalTotal: currentTotal,
    });

    return {
      ...effectivePricing,
      totalAmount: currentTotal,
      providerAmount: Math.max(0, effectivePricing.providerAmount - totalDiscountApplied),
    };
  }, [pricing, providerRole, selectedCurrency, activePromo, affiliateDiscount]);

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

  // ========== META PIXEL TRACKING: InitiateCheckout ==========
  // Track quand l'utilisateur arrive sur la page de checkout avec un provider
  useEffect(() => {
    if (!provider?.id || !adminPricing?.totalAmount) return;

    // Ne tracker qu'une seule fois par session de checkout
    const checkoutKey = `meta_checkout_${provider.id}_tracked`;
    if (sessionStorage.getItem(checkoutKey)) return;

    try {
      const eventId = getOrCreateEventId(`checkout_${provider.id}`, 'checkout');
      trackMetaInitiateCheckout({
        value: adminPricing.totalAmount,
        currency: selectedCurrency.toUpperCase(),
        content_name: providerRole === 'lawyer' ? 'lawyer_call' : 'expat_call',
        content_category: providerRole || 'service',
        num_items: 1,
        eventID: eventId,
      });
      sessionStorage.setItem(checkoutKey, 'true');
      console.log("[MetaPixel] InitiateCheckout tracked", {
        amount: adminPricing.totalAmount,
        providerId: provider.id,
        eventId
      });
    } catch (trackingError) {
      console.warn("[MetaPixel] InitiateCheckout tracking failed:", trackingError);
    }
  }, [provider?.id, adminPricing?.totalAmount, selectedCurrency, providerRole]);
  // ========== END META PIXEL TRACKING ==========

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
        fr: `${window.location.origin}/fr-fr/checkout`,
        en: `${window.location.origin}/en-us/checkout`,
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
  const errorRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to error message when it appears
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [error]);

  // ========================================
  // P0 FIX: callSessionId stable pour PayPal (généré une seule fois)
  // ========================================
  const [paypalCallSessionId] = useState<string>(() =>
    `call_session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  );

  // ========================================
  // P0 FIX: Fonction pour persister les données PayPal (comme Stripe)
  // ========================================
  const persistPayPalDocs = useCallback(
    async (paypalOrderId: string, callSessionId: string) => {
      if (!provider || !user?.uid || !adminPricing || !service) {
        console.warn("❌ [PAYPAL] Missing data for persistPayPalDocs");
        return null;
      }

      const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const baseDoc = {
        paymentIntentId: paypalOrderId, // ID PayPal
        paymentMethod: "paypal",
        providerId: provider.id,
        providerName: provider.fullName || provider.name || "",
        providerRole: provider.role || provider.type || "expat",
        clientId: user.uid,
        clientEmail: user.email || "",
        clientName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        serviceType: service.serviceType,
        duration: adminPricing.duration,
        amount: adminPricing.totalAmount,
        commissionAmount: adminPricing.connectionFeeAmount,
        providerAmount: adminPricing.providerAmount,
        currency: selectedCurrency,
        status: "pending",
        createdAt: serverTimestamp(),
        callSessionId,
        referralBy: (user as any).referredByUserId || getAffiliateRef() || getStoredReferralCode() || null,
      };

      const orderDoc = {
        id: orderId,
        amount: adminPricing.totalAmount,
        currency: selectedCurrency as "eur" | "usd",
        paymentIntentId: paypalOrderId,
        paymentMethod: "paypal",
        providerId: provider.id,
        providerName: provider.fullName || provider.name,
        clientId: user.uid,
        clientEmail: user.email,
        serviceType: service.serviceType,
        status: "pending",
        createdAt: serverTimestamp(),
        callSessionId,
        metadata: {
          price_origin: "standard",
          override_label: null,
          original_standard_amount: adminPricing.totalAmount,
          effective_base_amount: adminPricing.totalAmount,
          affiliateRef: getAffiliateRef() || "",
          referredByUserId: (user as any).referredByUserId || "",
          // Meta CAPI identifiers for purchase attribution
          ...(() => {
            const metaIds = getStoredMetaIdentifiers();
            return {
              ...(metaIds.fbp && { fbp: metaIds.fbp }),
              ...(metaIds.fbc && { fbc: metaIds.fbc }),
            };
          })(),
        },
        coupon: activePromo ? {
          code: activePromo.code,
          discountAmount: activePromo.discountType === "percentage"
            ? adminPricing.totalAmount * (activePromo.discountValue / 100)
            : activePromo.discountValue,
        } : null,
        totalSaved: 0,
        appliedDiscounts: [],
        referralBy: (user as any).referredByUserId || getAffiliateRef() || getStoredReferralCode() || null,
      };

      try {
        await setDoc(doc(db, "payments", paypalOrderId), baseDoc, { merge: true });
        console.log("✅ [PAYPAL] Payment doc created");
      } catch (e) {
        console.warn("⚠️ [PAYPAL] Error creating payment doc:", e);
      }

      try {
        await setDoc(doc(db, "users", user.uid, "payments", paypalOrderId), baseDoc, { merge: true });
      } catch { /* no-op */ }

      try {
        await setDoc(doc(db, "providers", provider.id, "payments", paypalOrderId), baseDoc, { merge: true });
      } catch { /* no-op */ }

      try {
        await setDoc(doc(db, "orders", orderId), orderDoc, { merge: true });
        console.log("✅ [PAYPAL] Order created:", orderId);
      } catch (e) {
        console.warn("⚠️ [PAYPAL] Error creating order:", e);
      }

      return orderId;
    },
    [provider, user, adminPricing, service, selectedCurrency, activePromo]
  );

  const handlePaymentSuccess = useCallback(
    (payload: {
      paymentIntentId: string;
      call: "scheduled" | "skipped";
      callId?: string;
      orderId?: string;
    }) => {
      // DEBUG: Log détaillé avant la navigation
      paymentLogger.paymentSuccess({
        paymentIntentId: payload.paymentIntentId,
        status: payload.call
      });

      console.log("🔵 [NAVIGATION_DEBUG] handlePaymentSuccess called with:", {
        paymentIntentId: payload.paymentIntentId.substring(0, 15) + '...',
        call: payload.call,
        callId: payload.callId,
        orderId: payload.orderId,
        currentPath: window.location.pathname,
        timestamp: new Date().toISOString()
      });

      setCurrentStep("calling");
      setCallProgress(1);

      // P0 FIX 2026-02-02: URL PROPRE - Ne plus exposer les paramètres sensibles dans l'URL
      // Toutes les données sont stockées dans sessionStorage et récupérées par PaymentSuccess.tsx
      const locale = getLocaleString(language as "fr" | "en" | "es" | "de" | "ru" | "pt" | "ch" | "hi" | "ar");
      const translatedSlug = getTranslatedRouteSlug("payment-success", language as "fr" | "en" | "es" | "de" | "ru" | "pt" | "ch" | "hi" | "ar");
      const targetUrl = `/${locale}/${translatedSlug}`;

      // DEBUG: Log la navigation
      navigationLogger.beforeNavigate({
        from: window.location.pathname,
        to: targetUrl,
        params: { stored: 'sessionStorage' }
      });

      console.log("🚀 [NAVIGATION_DEBUG] About to navigate:", {
        targetUrl,
        currentUrl: window.location.href,
        navigateFunction: typeof navigate,
        historyLength: window.history.length
      });

      // P0 FIX: Sauvegarder TOUTES les données critiques dans sessionStorage AVANT navigation
      // La page PaymentSuccess.tsx récupérera ces données depuis sessionStorage
      try {
        const paymentSuccessData = {
          paymentIntentId: payload.paymentIntentId,
          call: payload.call,
          callId: payload.callId,
          orderId: payload.orderId,
          providerId: provider?.id,
          // P0 FIX 2026-02-02: Ajouter les données de service pour initialisation rapide
          serviceType: service?.serviceType,
          amount: adminPricing?.totalAmount,
          duration: adminPricing?.duration,
          providerRole: provider?.role || provider?.type,
          savedAt: Date.now()
        };
        sessionStorage.setItem('lastPaymentSuccess', JSON.stringify(paymentSuccessData));
        console.log("💾 [NAVIGATION_DEBUG] Payment data saved to sessionStorage:", paymentSuccessData);
      } catch (storageErr) {
        console.warn("⚠️ [NAVIGATION_DEBUG] Failed to save to sessionStorage:", storageErr);
      }

      // Navigate with React Router (no full page reload — setTimeout removed so navigate works)
      // Fallback to window.location.href if navigate() fails
      console.log("🚀 [NAVIGATION] Navigating to:", targetUrl);
      try {
        navigate(targetUrl, { replace: true });
      } catch (navErr) {
        console.warn("⚠️ [NAVIGATION] navigate() failed, falling back to window.location.href:", navErr);
        window.location.href = targetUrl;
      }
    },
    [navigate, provider?.id, provider?.role, provider?.type, language, service?.serviceType, adminPricing?.totalAmount, adminPricing?.duration]
  );

  // ========================================
  // P0 FIX: Handler spécifique pour PayPal success
  // ========================================
  const handlePayPalPaymentSuccess = useCallback(
    async (details: { orderId: string; payerId: string; status: string; captureId?: string }) => {
      console.log('[CallCheckout DEBUG] 🎉 handlePayPalPaymentSuccess CALLED', {
        orderId: details.orderId,
        payerId: details.payerId,
        status: details.status,
        captureId: details.captureId,
        paypalCallSessionId,
        timestamp: new Date().toISOString()
      });

      // DEBUG: Log détaillé pour PayPal
      paymentLogger.paypalSuccess({
        orderId: details.orderId,
        payerId: details.payerId,
        callSessionId: paypalCallSessionId
      });

      console.log("🎉 [PAYPAL_DEBUG] Payment success details:", {
        orderId: details.orderId,
        payerId: details.payerId,
        status: details.status,
        captureId: details.captureId,
        callSessionId: paypalCallSessionId,
        timestamp: new Date().toISOString()
      });

      setIsProcessing(true);

      try {
        console.log("🔵 [PAYPAL_DEBUG] Calling persistPayPalDocs...");
        // Utiliser le même callSessionId que celui passé au backend PayPal
        const internalOrderId = await persistPayPalDocs(details.orderId, paypalCallSessionId);
        console.log("🔵 [PAYPAL_DEBUG] persistPayPalDocs result:", { internalOrderId });

        if (!internalOrderId) {
          console.error("❌ [PAYPAL_DEBUG] Failed to create order - internalOrderId is null/undefined");
          paymentLogger.paypalError("Failed to create internal order", { orderId: details.orderId });
        }

        // Naviguer vers la page de succès avec l'orderId interne
        console.log("🔵 [PAYPAL_DEBUG] About to call handlePaymentSuccess with:", {
          paymentIntentId: details.orderId,
          call: "scheduled",
          callId: paypalCallSessionId,
          orderId: internalOrderId
        });

        handlePaymentSuccess({
          paymentIntentId: details.orderId,
          call: "scheduled",
          callId: paypalCallSessionId, // Utiliser le même callSessionId
          orderId: internalOrderId || undefined,
        });
      } catch (error) {
        console.error("❌ [PAYPAL_DEBUG] Error in handlePayPalPaymentSuccess:", error);
        paymentLogger.paypalError(error instanceof Error ? error : String(error), {
          orderId: details.orderId,
          step: 'handlePayPalPaymentSuccess'
        });

        // Fallback: naviguer quand même vers success sans orderId
        console.log("🔄 [PAYPAL_DEBUG] Fallback navigation without orderId");
        handlePaymentSuccess({
          paymentIntentId: details.orderId,
          call: "scheduled",
          callId: paypalCallSessionId,
        });
      } finally {
        setIsProcessing(false);
        console.log("🔵 [PAYPAL_DEBUG] handlePayPalPaymentSuccess completed");
      }
    },
    [persistPayPalDocs, handlePaymentSuccess, paypalCallSessionId]
  );

  const handlePaymentError = useCallback((msg: string) => {
    console.error("[Payment] Error received:", msg);
    setError(msg);
  }, []);

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
                onClick={() => navigate("/sos-appel")}
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
                onClick={() => navigate(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)}
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
      <main className="bg-gradient-to-br from-red-50 to-red-100 min-h-screen overflow-x-hidden pb-safe-area">
        <div className="max-w-lg mx-auto px-4 py-4 md:py-6">
          {!!pricingError && (
            <div className="mb-3 rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
              {intl.formatMessage({ id: "checkout.pricingFallback" })}
            </div>
          )}

          <div className="mb-4">
            <button
              onClick={goBack}
              className="flex items-center gap-2 text-red-600 hover:text-red-700 mb-3 transition-colors text-base font-medium focus:outline-none focus:ring-2 focus:ring-red-500 rounded-xl p-3 -ml-3 touch-manipulation active:scale-[0.98] min-h-[48px]"
              aria-label={t("ui.back")}
            >
              <ArrowLeft size={20} aria-hidden={true} />
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
                    "/default-avatar.webp"
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
                    {intl.formatMessage({ id: "checkout.available", defaultMessage: "Disponible" })}
                  </span>
                </div>
              </div>

              <div className="text-right flex-shrink-0" {...cardTraceAttrs}>
                {/* Prix original barré + lignes de réduction (coupon et/ou affilié) */}
                {(activePromo || affiliateDiscount) && pricing && providerRole && (
                  <div className="mb-2 text-sm">
                    {/* Prix original */}
                    <div className="text-gray-500 line-through">
                      {formatCurrency(
                        pricing[providerRole]?.[selectedCurrency]?.totalAmount || 0,
                        selectedCurrency.toUpperCase(),
                        { language, minimumFractionDigits: 2 }
                      )}
                    </div>
                    {/* Réduction coupon */}
                    {activePromo && (
                      <div className="text-green-600 font-medium">
                        -{formatCurrency(
                          (() => {
                            const base = pricing[providerRole]?.[selectedCurrency]?.totalAmount || 0;
                            if (activePromo.discountType === "percentage")
                              return base * (activePromo.discountValue / 100);
                            return Math.min(activePromo.discountValue, base);
                          })(),
                          selectedCurrency.toUpperCase(),
                          { language, minimumFractionDigits: 2 }
                        )}{" "}({activePromo.code})
                      </div>
                    )}
                    {/* Réduction affiliée GroupAdmin / Influencer / Partner */}
                    {affiliateDiscount && (
                      <div className="text-green-600 font-medium">
                        -{affiliateDiscount.discountType === 'fixed'
                          ? formatCurrency(affiliateDiscount.discountValue, selectedCurrency.toUpperCase(), { language, minimumFractionDigits: 2 })
                          : `${affiliateDiscount.discountValue}%`
                        }{" "}
                        ({affiliateDiscount.type === 'groupAdmin' ? '👥 Admin'
                          : affiliateDiscount.type === 'partner'
                            ? (affiliateDiscount.label || '🤝 Partner')
                            : '📣 Influencer'})
                      </div>
                    )}
                  </div>
                )}
                <div className="text-2xl font-black bg-gradient-to-r from-red-500 to-pink-600 bg-clip-text text-transparent">
                  {formatCurrency(adminPricing.totalAmount, selectedCurrency.toUpperCase(), {
                    language,
                    minimumFractionDigits: 2,
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* Social proof + availability indicator */}
          <div className="flex items-center justify-between px-1 mb-3 text-xs">
            <div className="flex items-center gap-1.5 text-gray-500">
              <span className="text-yellow-500">⭐</span>
              <span className="font-medium">4.8</span>
              <span>— 1 200+ {intl.formatMessage({ id: "checkout.successfulCalls", defaultMessage: "appels réussis" })}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
              </span>
              <span className="text-green-600 font-medium">
                {intl.formatMessage({ id: "checkout.availableNow", defaultMessage: "Disponible maintenant" })}
              </span>
            </div>
          </div>

          {/* Currency toggle - compact */}
          <div className="flex items-center justify-center gap-2 mb-4 text-sm">
            <button
              onClick={() => setSelectedCurrency("eur")}
              className={`px-3 py-1.5 rounded-full font-medium transition-all ${
                selectedCurrency === "eur"
                  ? "bg-red-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              EUR €
            </button>
            <button
              onClick={() => setSelectedCurrency("usd")}
              className={`px-3 py-1.5 rounded-full font-medium transition-all ${
                selectedCurrency === "usd"
                  ? "bg-red-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              USD $
            </button>
          </div>

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
                <div ref={errorRef}>
                  <PaymentFeedback
                    error={error}
                    onDismiss={() => setError("")}
                    onRetry={() => setError("")}
                    t={t as (key: string, fallback?: string) => string}
                  />
                </div>
              )}

              {/*
                P0 FIX: Le système de paiement s'adapte au pays du provider
                - Pays Stripe (46): Le client paie via Stripe (CB/Apple Pay/Google Pay)
                - Pays PayPal (151): Le client paie via PayPal (Guest Checkout = CB aussi)
                Le provider reçoit automatiquement sur son compte (Stripe ou PayPal)
              */}
              <div className="mb-4">
                <GatewayIndicator gateway={isPayPalOnly ? "paypal" : "stripe"} />
              </div>

              {/* Affichage du formulaire de paiement selon le gateway */}
              {gatewayLoading ? (
                <div className="flex items-center justify-center p-6 bg-gray-50 rounded-lg">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                  <span className="text-gray-600">
                    <FormattedMessage id="payment.loading" defaultMessage="Chargement..." />
                  </span>
                </div>
              ) : isPayPalOnly ? (
                /* Formulaire PayPal pour les 151 pays non-Stripe */
                <PayPalPaymentForm
                  amount={adminPricing?.totalAmount || 0}
                  currency={selectedCurrency.toUpperCase()}
                  providerId={provider?.id || ""}
                  callSessionId={paypalCallSessionId}
                  clientId={user?.uid || ""}
                  description={`Appel SOS-Expat - ${provider?.fullName || provider?.name || "Expert"}`}
                  serviceType={providerRole === "lawyer" ? "lawyer" : "expat"}
                  clientPhone={service?.clientPhone || ""}
                  providerPhone={provider?.phone || ""}
                  // P2 FIX: Use client languages from booking form, fallback to interface language
                  clientLanguages={bookingDataForValidation?.clientLanguages?.length ? bookingDataForValidation.clientLanguages : [language]}
                  providerLanguages={provider?.languagesSpoken || provider?.languages || ["fr"]}
                  bookingData={bookingDataForValidation}
                  onSuccess={handlePayPalPaymentSuccess}
                  onError={(err) => {
                    // P0 FIX: Ignore errors if payment already succeeded and navigation is in progress
                    // PayPal SDK can fire onError after onApprove (race condition)
                    if (currentStep === "calling") {
                      console.warn("[PayPal] Ignoring late error - payment already succeeded, navigation in progress");
                      return;
                    }
                    // PayPalPaymentForm handles error display internally,
                    // but we also set parent error as fallback for edge cases
                    console.error("[PayPal] Payment error:", err);
                    handlePaymentError(err instanceof Error ? err.message : String(err));
                  }}
                  onCancel={() => {
                    console.log("PayPal cancelled by user");
                    handlePaymentError(t("err.paypalCanceled.message"));
                  }}
                  disabled={isProcessing}
                />
              ) : (
                /* Formulaire Stripe pour les 46 pays Stripe */
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
                    providerOffline={providerOffline}
                    activePromo={activePromo}
                  />
                </Elements>
              )}
            </div>
          </section>

        </div>
      </main>
    </Layout>
  );
};

CallCheckout.displayName = "CallCheckout";
export default React.memo(CallCheckout);
