// BookingRequestRHF.tsx
/* eslint-disable react-hooks/exhaustive-deps */
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  Suspense,
  lazy,
} from "react";
import { useParams, Link } from "react-router-dom";
import { useLocaleNavigate, getTranslatedRouteSlug } from "../multilingual-system";
import {
  ArrowLeft,
  Euro,
  CheckCircle,
  AlertCircle,
  Phone,
  MessageCircle,
  Info,
  Globe,
  MapPin,
  Languages as LanguagesIcon,
  Sparkles,
  Shield,
  Clock,
  Lock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Check,
  User,
  FileText,
  Mail,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";

import { useForm, Controller, SubmitHandler, useWatch } from "react-hook-form";

import Layout from "../components/layout/Layout";
import Button from "../components/common/Button";
import { useAuth } from "../contexts/AuthContext";
import { useApp } from "../contexts/AppContext";

import { logLanguageMismatch } from "../services/analytics";
import languages, { getLanguageLabel, languagesData, type Language as AppLanguage } from "../data/languages-spoken";
import { LanguageUtils } from "../locales/languageMap";
import { countriesData } from "../data/countries";

import { db, auth } from "../config/firebase";
import { doc, onSnapshot, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { fetchSignInMethodsForEmail } from "firebase/auth";

import type { Provider } from "../types/provider";
import { normalizeProvider } from "../types/provider";

import {
  usePricingConfig,
  calculateServiceAmounts,
  detectUserCurrency,
  type ServiceType,
  type Currency,
} from "../services/pricingService";

import { parsePhoneNumberFromString } from "libphonenumber-js";
import { createBookingRequest } from "../services/booking";
// ✅ composant RHF pour le téléphone
import PhoneField from "@/components/PhoneField";
import { smartNormalizePhone } from "@/utils/phone";
import { FormattedMessage, useIntl } from "react-intl";
import IntlPhoneInput from "@/components/forms-data/IntlPhoneInput";
import { trackMetaLead, trackMetaInitiateCheckout, getMetaIdentifiers } from "@/utils/metaPixel";
import { trackGoogleAdsLead, trackGoogleAdsBeginCheckout } from "@/utils/googleAds";
import { trackAdLead, trackAdInitiateCheckout } from "@/services/adAttributionService";
import { generateEventIdForType } from "@/utils/sharedEventId";

// Mobile Booking Wizard (2026 UX refonte)
import {
  MobileBookingProvider,
  MobileBookingWizard,
  useMobileBooking,
  type BookingFormData as MobileBookingFormData,
} from "@/components/booking-mobile";

/** ===== Types complémentaires ===== */
type LangKey = keyof typeof I18N;
type BookingLanguage = AppLanguage;

/** Props attendues par le composant MultiLanguageSelect */
type MultiLanguageOption = { value: string; label: string };
type MultiLanguageSelectProps = {
  value: MultiLanguageOption[];
  onChange: (selected: MultiLanguageOption[]) => void;
  providerLanguages: string[];
  highlightShared?: boolean;
  locale: LangKey;
};

const MultiLanguageSelect = lazy(
  () => import("../components/forms-data/MultiLanguageSelect")
) as unknown as React.LazyExoticComponent<
  React.ComponentType<MultiLanguageSelectProps>
>;

/** ===== Theme ===== */
const THEME = {
  gradFrom: "from-red-600",
  gradVia: "via-orange-600",
  gradTo: "to-rose-600",
  ring: "focus:border-red-600",
  border: "border-red-200",
  icon: "text-red-600",
  chip: "border-red-200",
  subtle: "bg-rose-50",
  button: "from-red-600 via-orange-600 to-rose-600",
} as const;

/** ===== Fallbacks (si admin indisponible) ===== */
const FALLBACK_TOTALS = {
  lawyer: { eur: 49, usd: 55, duration: 20 },
  expat: { eur: 19, usd: 25, duration: 30 },
} as const;

const DEFAULT_SERVICE_FEES = {
  lawyer: { eur: 19, usd: 25 },
  expat: { eur: 9, usd: 15 },
} as const;

/** ===== i18n (FR/EN) ===== */
const I18N = {
  fr: {
    metaTitle: "Demande de consultation • SOS Expats",
    metaDesc:
      "Un formulaire fun, fluide et ultra clair pour booker votre appel 🚀",
    heroTitle: "Décrivez votre demande",
    heroSubtitle:
      "Quelques infos et on s’occupe du reste — simple, friendly, cool ✨",
    progress: "Progression",
    personal: "On fait connaissance",
    request: "Votre demande",
    languages: "Langues",
    contact: "Contact",
    cgu: "CGU Clients",
    checklistTitle: "À compléter :",
    callTiming: "Appel dans les 5 minutes après paiement",
    securePay: "Paiement 100% sécurisé",
    satisfied:
      "💯 Expert indisponible = remboursement automatique.",
    continuePay: "Continuer vers le paiement",
    errorsTitle: "Oups, quelques retouches et c’est parfait ✨",
    hints: {
      title: "Plus votre titre est précis, mieux c'est !",
      desc: "Plus vous détaillez votre situation, meilleure sera la réponse de l'expert ! Contexte, objectifs, délais… 🎯",
      phone:
        "Aucun spam — jamais. Seulement pour vous connecter à l’expert. 📵",
      whatsapp:
        "Optionnel mais pratique pour les mises à jour en temps réel. 💬",
    },
    fields: {
      firstName: "Prénom",
      lastName: "Nom",
      nationality: "Nationalité",
      currentCountry: "Pays d'intervention",
      otherCountry: "Précisez votre pays",
      title: "Titre de votre demande",
      description: "Description détaillée",
      phone: "Téléphone",
      whatsapp: "Numéro WhatsApp (optionnel)",
      accept: "J’accepte les ",
      andConfirm: " et confirme que les informations fournies sont exactes.",
    },
    placeholders: {
      firstName: "Votre prénom",
      lastName: "Votre nom",
      nationality: "Ex : Française, Américaine…",
      title: "Ex : Visa de travail au Canada — quels documents ?",
      description:
        "Expliquez votre situation : contexte, questions précises, objectifs, délais… (50 caractères min.)",
      phone: "612 345 678",
      otherCountry: "Ex : Paraguay",
    },
    validators: {
      firstName: "Prénom requis",
      lastName: "Nom requis",
      title: "Le titre doit contenir au moins 10 caractères",
      description: "La description doit contenir au moins 50 caractères",
      nationality: "Nationalité requise",
      currentCountry: "Pays d'intervention requis",
      otherCountry: "Veuillez préciser votre pays",
      languages: "Sélectionnez au moins une langue",
      phone: "Numéro de téléphone invalide",
      accept: "Vous devez accepter les conditions",
      langMismatch: "Aucune langue en commun avec le prestataire",
    },
    preview: {
      title: "Aperçu rapide",
      hint: "C’est ce que verra votre expert pour vous aider au mieux.",
    },
    labels: {
      compatible: "Langues compatibles",
      incompatible: "Langues non compatibles",
      communicationImpossible: "Communication impossible",
      needShared: "Sélectionnez au moins une langue commune pour continuer.",
    },
  },
  ar: {
    "metaTitle": "طلب استشارة • SOS Expats",
    "metaDesc": "نموذج حجز ممتع، سلس، وواضح للغاية 🚀",
    "heroTitle": "صف طلبك",
    "heroSubtitle": "بعض التفاصيل وسنتولى الباقي — بسيط، ودي، ورائع ✨",
    "progress": "التقدم",
    "personal": "لنتعرف عليك",
    "request": "طلبك",
    "languages": "اللغات",
    "contact": "الاتصال",
    "cgu": "شروط وأحكام العملاء",
    "checklistTitle": "لإكمال العملية:",
    "callTiming": "سنتصل بك خلال 5 دقائق بعد الدفع",
    "securePay": "دفع آمن بنسبة 100%",
    "satisfied": "💯 ضمان الرضا: إذا كان الخبير غير متاح، سيتم رد المبلغ تلقائيًا.",
    "continuePay": "المتابعة إلى الدفع",
    "errorsTitle": "بعض التعديلات الصغيرة وسنكون جاهزين ✨",
    "hints": {
      "title": "كلما كان العنوان أوضح، كان أفضل!",
      "desc": "كلما قدمت تفاصيل أكثر، كانت إجابة الخبير أفضل! السياق، الأهداف، المواعيد… 🎯",
      "phone": "لن نرسل أي رسائل مزعجة — فقط للاتصال بالخبير. 📵",
      "whatsapp": "اختياري ولكنه مفيد لتحديثات فورية. 💬"
    },
    "fields": {
      "firstName": "الاسم الأول",
      "lastName": "اسم العائلة",
      "nationality": "الجنسية",
      "currentCountry": "بلد التدخل",
      "otherCountry": "حدد بلدك",
      "title": "عنوان الطلب",
      "description": "الوصف التفصيلي",
      "phone": "رقم الهاتف",
      "whatsapp": "رقم واتساب (اختياري)",
      "accept": "أوافق على ",
      "andConfirm": " وأؤكد أن المعلومات صحيحة."
    },
    "placeholders": {
      "firstName": "اسمك الأول",
      "lastName": "اسم العائلة",
      "nationality": "مثلاً: فرنسي، أمريكي…",
      "title": "مثلاً: تأشيرة عمل كندا — ما هي الوثائق المطلوبة؟",
      "description": "اشرح وضعك: السياق، الأسئلة المحددة، الأهداف، الجدول الزمني… (50 حرفًا على الأقل)",
      "phone": "612 345 678",
      "otherCountry": "مثلاً: باراغواي"
    },
    "validators": {
      "firstName": "الاسم الأول مطلوب",
      "lastName": "اسم العائلة مطلوب",
      "title": "يجب أن يكون العنوان مكونًا من 10 أحرف على الأقل",
      "description": "يجب أن يحتوي الوصف على 50 حرفًا على الأقل",
      "nationality": "الجنسية مطلوبة",
      "currentCountry": "بلد التدخل مطلوب",
      "otherCountry": "يرجى تحديد بلدك",
      "languages": "اختر لغة واحدة على الأقل",
      "phone": "رقم الهاتف غير صالح",
      "accept": "يجب أن توافق على الشروط",
      "langMismatch": "لا توجد لغة مشتركة مع مقدم الخدمة"
    },
    "preview": {
      "title": "معاينة سريعة",
      "hint": "هذا ما سيراه الخبير لمساعدتك بشكل أفضل."
    },
    "labels": {
      "compatible": "اللغات المتوافقة",
      "incompatible": "اللغات غير المتوافقة",
      "communicationImpossible": "الاتصال غير ممكن",
      "needShared": "اختر لغة مشتركة واحدة على الأقل للمتابعة."
    }
  },
  ch: {
    "metaTitle": "咨询请求 • SOS Expats",
    "metaDesc": "一个有趣、流畅、超清晰的预约表单 🚀",
    "heroTitle": "描述您的请求",
    "heroSubtitle": "提供一些细节，我们会处理剩下的一切 — 简单、友好、酷 ✨",
    "progress": "进度",
    "personal": "让我们了解您",
    "request": "您的请求",
    "languages": "语言",
    "contact": "联系方式",
    "cgu": "客户条款与条件",
    "checklistTitle": "待完成事项：",
    "callTiming": "付款后 5 分钟内来电",
    "securePay": "100% 安全支付",
    "satisfied": "💯 满意保证：如果专家无法提供服务，系统将自动退款。",
    "continuePay": "继续付款",
    "errorsTitle": "只需一点小调整，我们就准备好了 ✨",
    "hints": {
      "title": "标题越清晰越好！",
      "desc": "您提供的细节越多，专家的回答就越好！背景、目标、时间线… 🎯",
      "phone": "绝不会发送垃圾信息 — 仅用于联系专家。📵",
      "whatsapp": "可选，但有助于实时更新。💬"
    },
    "fields": {
      "firstName": "名字",
      "lastName": "姓氏",
      "nationality": "国籍",
      "currentCountry": "服务国家",
      "otherCountry": "请注明您的国家",
      "title": "请求标题",
      "description": "详细描述",
      "phone": "电话",
      "whatsapp": "WhatsApp 号码（可选）",
      "accept": "我接受 ",
      "andConfirm": " 并确认所填写的信息准确无误。"
    },
    "placeholders": {
      "firstName": "您的名字",
      "lastName": "您的姓氏",
      "nationality": "例如：法国人、美国人…",
      "title": "例如：加拿大工作签证 — 需要哪些文件？",
      "description": "请说明您的情况：背景、具体问题、目标、时间线…（至少 50 个字符）",
      "phone": "612 345 678",
      "otherCountry": "例如：巴拉圭"
    },
    "validators": {
      "firstName": "名字为必填项",
      "lastName": "姓氏为必填项",
      "title": "标题至少需要 10 个字符",
      "description": "描述至少需要 50 个字符",
      "nationality": "国籍为必填项",
      "currentCountry": "服务国家为必填项",
      "otherCountry": "请注明您的国家",
      "languages": "请至少选择一种语言",
      "phone": "电话号码无效",
      "accept": "您必须同意条款",
      "langMismatch": "与服务提供者没有共同语言"
    },
    "preview": {
      "title": "快速预览",
      "hint": "专家将看到这些信息，以便更好地为您提供帮助。"
    },
    "labels": {
      "compatible": "兼容语言",
      "incompatible": "不兼容语言",
      "communicationImpossible": "无法沟通",
      "needShared": "请至少选择一种共同语言以继续。"
    }
  },
  en: {
    metaTitle: "Consultation Request • SOS Expats",
    metaDesc: "A fun, fluid, ultra-clear booking form 🚀",
    heroTitle: "Describe your request",
    heroSubtitle:
      "A few details and we’ll handle the rest — simple, friendly, cool ✨",
    progress: "Progress",
    personal: "Let’s get to know you",
    request: "Your request",
    languages: "Languages",
    contact: "Contact",
    cgu: "Clients T&Cs",
    checklistTitle: "To complete:",
    callTiming: "Call within 5 minutes after payment",
    securePay: "100% secure payment",
    satisfied:
      "💯 If the expert is unavailable, you are automatically refunded.",
    continuePay: "Continue to payment",
    errorsTitle: "Tiny tweaks and we’re there ✨",
    hints: {
      title: "The clearer your title, the better!",
      desc: "The more details you provide, the better the expert's response! Context, goals, timeline… 🎯",
      phone: "No spam — ever. Only to connect you to the expert. 📵",
      whatsapp: "Optional but handy for real-time updates. 💬",
    },
    fields: {
      firstName: "First name",
      lastName: "Last name",
      nationality: "Nationality",
      currentCountry: "Intervention country",
      otherCountry: "Specify your country",
      title: "Request title",
      description: "Detailed description",
      phone: "Phone",
      whatsapp: "WhatsApp number (optional)",
      accept: "I accept the ",
      andConfirm: " and confirm the information is accurate.",
    },
    placeholders: {
      firstName: "Your first name",
      lastName: "Your last name",
      nationality: "e.g., French, American…",
      title: "e.g., Canada work visa — which documents?",
      description:
        "Explain your situation: context, specific questions, goals, timeline… (min. 50 chars)",
      phone: "612 345 678",
      otherCountry: "e.g., Paraguay",
    },
    validators: {
      firstName: "First name required",
      lastName: "Last name required",
      title: "Title must be at least 10 characters",
      description: "Description must be at least 50 characters",
      nationality: "Nationality required",
      currentCountry: "Intervention country required",
      otherCountry: "Please specify your country",
      languages: "Select at least one language",
      phone: "Invalid phone number",
      accept: "You must accept the terms",
      langMismatch: "No shared language with the provider",
    },
    preview: {
      title: "Quick preview",
      hint: "This is what your expert will see to help you better.",
    },
    labels: {
      compatible: "Compatible languages",
      incompatible: "Non-compatible languages",
      communicationImpossible: "Communication impossible",
      needShared: "Pick at least one shared language to continue.",
    },
  },
  es: {
    metaTitle: "Solicitud de consulta • SOS Expats",
    metaDesc:
      "Un formulario divertido, fluido y ultra claro para reservar tu llamada 🚀",
    heroTitle: "Describe tu solicitud",
    heroSubtitle:
      "Algunos datos y nosotros nos encargamos del resto — simple, amigable, genial ✨",
    progress: "Progreso",
    personal: "Conozcámonos",
    request: "Tu solicitud",
    languages: "Idiomas",
    contact: "Contacto",
    cgu: "T&C Clientes",
    checklistTitle: "Para completar:",
    callTiming: "Llamada dentro de 5 minutos después del pago",
    securePay: "Pago 100% seguro",
    satisfied:
      "💯 Garantía de satisfacción: si el experto no está disponible, reembolso automático.",
    continuePay: "Continuar al pago",
    errorsTitle: "Pequeños ajustes y listo ✨",
    hints: {
      title: "¡Cuanto más preciso sea tu título, mejor!",
      desc: "¡Cuantos más detalles proporciones, mejor será la respuesta del experto! Contexto, objetivos, plazos… 🎯",
      phone: "Sin spam — nunca. Solo para conectarte con el experto. 📵",
      whatsapp:
        "Opcional pero práctico para actualizaciones en tiempo real. 💬",
    },
    fields: {
      firstName: "Nombre",
      lastName: "Apellido",
      nationality: "Nacionalidad",
      currentCountry: "País de intervención",
      otherCountry: "Especifica tu país",
      title: "Título de tu solicitud",
      description: "Descripción detallada",
      phone: "Teléfono",
      whatsapp: "Número de WhatsApp (opcional)",
      accept: "Acepto los ",
      andConfirm: " y confirmo que la información proporcionada es correcta.",
    },
    placeholders: {
      firstName: "Tu nombre",
      lastName: "Tu apellido",
      nationality: "Ej: Francesa, Americana…",
      title: "Ej: Visa de trabajo en Canadá — ¿qué documentos?",
      description:
        "Explica tu situación: contexto, preguntas específicas, objetivos, plazos… (mín. 50 caracteres)",
      phone: "612 345 678",
      otherCountry: "Ej: Paraguay",
    },
    validators: {
      firstName: "Nombre requerido",
      lastName: "Apellido requerido",
      title: "El título debe tener al menos 10 caracteres",
      description: "La descripción debe tener al menos 50 caracteres",
      nationality: "Nacionalidad requerida",
      currentCountry: "País de intervención requerido",
      otherCountry: "Por favor especifica tu país",
      languages: "Selecciona al menos un idioma",
      phone: "Número de teléfono inválido",
      accept: "Debes aceptar las condiciones",
      langMismatch: "Ningún idioma en común con el proveedor",
    },
    preview: {
      title: "Vista previa rápida",
      hint: "Esto es lo que verá tu experto para ayudarte mejor.",
    },
    labels: {
      compatible: "Idiomas compatibles",
      incompatible: "Idiomas no compatibles",
      communicationImpossible: "Comunicación imposible",
      needShared: "Selecciona al menos un idioma compartido para continuar.",
    },
  },
  de: {
    metaTitle: "Beratungsanfrage • SOS Expats",
    metaDesc: "Ein unterhaltsames, flussiges und superklar Buchungsformular 🚀",
    heroTitle: "Beschreiben Sie Ihre Anfrage",
    heroSubtitle:
      "Ein paar Details und wir kummern uns um den Rest — einfach, freundlich, cool ✨",
    progress: "Fortschritt",
    personal: "Lernen wir uns kennen",
    request: "Ihre Anfrage",
    languages: "Sprachen",
    contact: "Kontakt",
    cgu: "AGB Kunden",
    checklistTitle: "Zu erledigen:",
    callTiming: "Anruf innerhalb von 5 Minuten nach Zahlung",
    securePay: "100% sichere Zahlung",
    satisfied:
      "💯 Zufriedenheitsgarantie: Wenn der Experte nicht verfugbar ist, erhalten Sie automatisch eine Ruckerstattung.",
    continuePay: "Weiter zur Zahlung",
    errorsTitle: "Kleine Anpassungen und wir sind fertig ✨",
    hints: {
      title: "Je klarer Ihr Titel, desto besser!",
      desc: "Je mehr Details Sie angeben, desto besser die Antwort des Experten! Kontext, Ziele, Fristen… 🎯",
      phone: "Kein Spam — niemals. Nur um Sie mit dem Experten zu verbinden. 📵",
      whatsapp: "Optional, aber praktisch fur Echtzeit-Updates. 💬",
    },
    fields: {
      firstName: "Vorname",
      lastName: "Nachname",
      nationality: "Staatsangehorigkeit",
      currentCountry: "Einsatzland",
      otherCountry: "Geben Sie Ihr Land an",
      title: "Titel Ihrer Anfrage",
      description: "Detaillierte Beschreibung",
      phone: "Telefon",
      whatsapp: "WhatsApp-Nummer (optional)",
      accept: "Ich akzeptiere die ",
      andConfirm: " und bestatige, dass die Angaben korrekt sind.",
    },
    placeholders: {
      firstName: "Ihr Vorname",
      lastName: "Ihr Nachname",
      nationality: "z.B.: Franzosisch, Amerikanisch…",
      title: "z.B.: Arbeitsvisum Kanada — welche Dokumente?",
      description:
        "Erklaren Sie Ihre Situation: Kontext, spezifische Fragen, Ziele, Fristen… (min. 50 Zeichen)",
      phone: "612 345 678",
      otherCountry: "z.B.: Paraguay",
    },
    validators: {
      firstName: "Vorname erforderlich",
      lastName: "Nachname erforderlich",
      title: "Der Titel muss mindestens 10 Zeichen haben",
      description: "Die Beschreibung muss mindestens 50 Zeichen haben",
      nationality: "Staatsangehorigkeit erforderlich",
      currentCountry: "Einsatzland erforderlich",
      otherCountry: "Bitte geben Sie Ihr Land an",
      languages: "Wahlen Sie mindestens eine Sprache",
      phone: "Ungultige Telefonnummer",
      accept: "Sie mussen die Bedingungen akzeptieren",
      langMismatch: "Keine gemeinsame Sprache mit dem Anbieter",
    },
    preview: {
      title: "Schnellvorschau",
      hint: "Das sieht Ihr Experte, um Ihnen besser helfen zu konnen.",
    },
    labels: {
      compatible: "Kompatible Sprachen",
      incompatible: "Nicht kompatible Sprachen",
      communicationImpossible: "Kommunikation unmoglich",
      needShared: "Wahlen Sie mindestens eine gemeinsame Sprache, um fortzufahren.",
    },
  },
  pt: {
    metaTitle: "Pedido de consulta • SOS Expats",
    metaDesc: "Um formulario divertido, fluido e super claro para agendar sua chamada 🚀",
    heroTitle: "Descreva seu pedido",
    heroSubtitle:
      "Alguns detalhes e cuidamos do resto — simples, amigavel, legal ✨",
    progress: "Progresso",
    personal: "Vamos nos conhecer",
    request: "Seu pedido",
    languages: "Idiomas",
    contact: "Contato",
    cgu: "T&C Clientes",
    checklistTitle: "Para completar:",
    callTiming: "Ligacao em ate 5 minutos apos o pagamento",
    securePay: "Pagamento 100% seguro",
    satisfied:
      "💯 Garantia de satisfacao: se o especialista nao estiver disponivel, reembolso automatico.",
    continuePay: "Continuar para o pagamento",
    errorsTitle: "Pequenos ajustes e pronto ✨",
    hints: {
      title: "Quanto mais claro seu titulo, melhor!",
      desc: "Quanto mais detalhes voce fornecer, melhor sera a resposta do especialista! Contexto, objetivos, prazos… 🎯",
      phone: "Sem spam — nunca. Apenas para conecta-lo ao especialista. 📵",
      whatsapp: "Opcional, mas pratico para atualizacoes em tempo real. 💬",
    },
    fields: {
      firstName: "Nome",
      lastName: "Sobrenome",
      nationality: "Nacionalidade",
      currentCountry: "Pais de intervencao",
      otherCountry: "Especifique seu pais",
      title: "Titulo do seu pedido",
      description: "Descricao detalhada",
      phone: "Telefone",
      whatsapp: "Numero do WhatsApp (opcional)",
      accept: "Aceito os ",
      andConfirm: " e confirmo que as informacoes sao corretas.",
    },
    placeholders: {
      firstName: "Seu nome",
      lastName: "Seu sobrenome",
      nationality: "Ex.: Francesa, Americana…",
      title: "Ex.: Visto de trabalho Canada — quais documentos?",
      description:
        "Explique sua situacao: contexto, perguntas especificas, objetivos, prazos… (min. 50 caracteres)",
      phone: "612 345 678",
      otherCountry: "Ex.: Paraguai",
    },
    validators: {
      firstName: "Nome obrigatorio",
      lastName: "Sobrenome obrigatorio",
      title: "O titulo deve ter pelo menos 10 caracteres",
      description: "A descricao deve ter pelo menos 50 caracteres",
      nationality: "Nacionalidade obrigatoria",
      currentCountry: "Pais de intervencao obrigatorio",
      otherCountry: "Por favor, especifique seu pais",
      languages: "Selecione pelo menos um idioma",
      phone: "Numero de telefone invalido",
      accept: "Voce deve aceitar os termos",
      langMismatch: "Nenhum idioma em comum com o provedor",
    },
    preview: {
      title: "Pre-visualizacao rapida",
      hint: "Isso e o que seu especialista vera para ajuda-lo melhor.",
    },
    labels: {
      compatible: "Idiomas compativeis",
      incompatible: "Idiomas nao compativeis",
      communicationImpossible: "Comunicacao impossivel",
      needShared: "Selecione pelo menos um idioma compartilhado para continuar.",
    },
  },
  ru: {
    metaTitle: "Запрос на консультацию • SOS Expats",
    metaDesc: "Веселая, плавная и сверхпонятная форма бронирования 🚀",
    heroTitle: "Опишите ваш запрос",
    heroSubtitle:
      "Несколько деталей, и мы позаботимся об остальном — просто, дружелюбно, круто ✨",
    progress: "Прогресс",
    personal: "Давайте познакомимся",
    request: "Ваш запрос",
    languages: "Языки",
    contact: "Контакт",
    cgu: "Условия для клиентов",
    checklistTitle: "Для завершения:",
    callTiming: "Звонок в течение 5 минут после оплаты",
    securePay: "100% безопасная оплата",
    satisfied:
      "💯 Гарантия удовлетворенности: если эксперт недоступен, автоматический возврат средств.",
    continuePay: "Перейти к оплате",
    errorsTitle: "Небольшие корректировки, и готово ✨",
    hints: {
      title: "Чем точнее заголовок, тем лучше!",
      desc: "Чем больше деталей вы укажете, тем лучше будет ответ эксперта! Контекст, цели, сроки… 🎯",
      phone: "Никакого спама — никогда. Только для связи с экспертом. 📵",
      whatsapp: "Необязательно, но удобно для обновлений в реальном времени. 💬",
    },
    fields: {
      firstName: "Имя",
      lastName: "Фамилия",
      nationality: "Гражданство",
      currentCountry: "Страна вмешательства",
      otherCountry: "Укажите вашу страну",
      title: "Заголовок вашего запроса",
      description: "Подробное описание",
      phone: "Телефон",
      whatsapp: "Номер WhatsApp (необязательно)",
      accept: "Я принимаю ",
      andConfirm: " и подтверждаю, что информация верна.",
    },
    placeholders: {
      firstName: "Ваше имя",
      lastName: "Ваша фамилия",
      nationality: "Напр.: Французское, Американское…",
      title: "Напр.: Рабочая виза в Канаду — какие документы?",
      description:
        "Объясните вашу ситуацию: контекст, конкретные вопросы, цели, сроки… (мин. 50 символов)",
      phone: "612 345 678",
      otherCountry: "Напр.: Парагвай",
    },
    validators: {
      firstName: "Имя обязательно",
      lastName: "Фамилия обязательна",
      title: "Заголовок должен содержать не менее 10 символов",
      description: "Описание должно содержать не менее 50 символов",
      nationality: "Гражданство обязательно",
      currentCountry: "Страна вмешательства обязательна",
      otherCountry: "Пожалуйста, укажите вашу страну",
      languages: "Выберите хотя бы один язык",
      phone: "Неверный номер телефона",
      accept: "Вы должны принять условия",
      langMismatch: "Нет общего языка с поставщиком",
    },
    preview: {
      title: "Быстрый просмотр",
      hint: "Это то, что увидит ваш эксперт, чтобы лучше вам помочь.",
    },
    labels: {
      compatible: "Совместимые языки",
      incompatible: "Несовместимые языки",
      communicationImpossible: "Общение невозможно",
      needShared: "Выберите хотя бы один общий язык, чтобы продолжить.",
    },
  },
  hi: {
    metaTitle: "परामर्श अनुरोध • SOS Expats",
    metaDesc: "एक मजेदार, सहज और अत्यंत स्पष्ट बुकिंग फॉर्म 🚀",
    heroTitle: "अपना अनुरोध बताएं",
    heroSubtitle:
      "कुछ विवरण और बाकी हम संभाल लेंगे — सरल, मैत्रीपूर्ण, शानदार ✨",
    progress: "प्रगति",
    personal: "आइए एक-दूसरे को जानें",
    request: "आपका अनुरोध",
    languages: "भाषाएं",
    contact: "संपर्क",
    cgu: "ग्राहक नियम और शर्तें",
    checklistTitle: "पूरा करने के लिए:",
    callTiming: "भुगतान के 5 मिनट के भीतर कॉल",
    securePay: "100% सुरक्षित भुगतान",
    satisfied:
      "💯 संतुष्टि गारंटी: यदि विशेषज्ञ उपलब्ध नहीं है, तो स्वचालित रिफंड।",
    continuePay: "भुगतान के लिए आगे बढ़ें",
    errorsTitle: "छोटे समायोजन और हम तैयार हैं ✨",
    hints: {
      title: "आपका शीर्षक जितना स्पष्ट होगा, उतना बेहतर!",
      desc: "आप जितना अधिक विवरण देंगे, विशेषज्ञ की प्रतिक्रिया उतनी बेहतर होगी! संदर्भ, लक्ष्य, समय-सीमा… 🎯",
      phone: "कोई स्पैम नहीं — कभी नहीं। केवल विशेषज्ञ से जोड़ने के लिए। 📵",
      whatsapp: "वैकल्पिक लेकिन रीयल-टाइम अपडेट के लिए उपयोगी। 💬",
    },
    fields: {
      firstName: "पहला नाम",
      lastName: "अंतिम नाम",
      nationality: "राष्ट्रीयता",
      currentCountry: "हस्तक्षेप देश",
      otherCountry: "अपना देश निर्दिष्ट करें",
      title: "अनुरोध का शीर्षक",
      description: "विस्तृत विवरण",
      phone: "फोन",
      whatsapp: "व्हाट्सएप नंबर (वैकल्पिक)",
      accept: "मैं स्वीकार करता/करती हूं ",
      andConfirm: " और पुष्टि करता/करती हूं कि जानकारी सही है।",
    },
    placeholders: {
      firstName: "आपका पहला नाम",
      lastName: "आपका अंतिम नाम",
      nationality: "उदा.: फ्रेंच, अमेरिकी…",
      title: "उदा.: कनाडा वर्क वीजा — कौन से दस्तावेज?",
      description:
        "अपनी स्थिति बताएं: संदर्भ, विशिष्ट प्रश्न, लक्ष्य, समय-सीमा… (न्यूनतम 50 अक्षर)",
      phone: "612 345 678",
      otherCountry: "उदा.: पैराग्वे",
    },
    validators: {
      firstName: "पहला नाम आवश्यक है",
      lastName: "अंतिम नाम आवश्यक है",
      title: "शीर्षक में कम से कम 10 अक्षर होने चाहिए",
      description: "विवरण में कम से कम 50 अक्षर होने चाहिए",
      nationality: "राष्ट्रीयता आवश्यक है",
      currentCountry: "हस्तक्षेप देश आवश्यक है",
      otherCountry: "कृपया अपना देश निर्दिष्ट करें",
      languages: "कम से कम एक भाषा चुनें",
      phone: "अमान्य फोन नंबर",
      accept: "आपको शर्तें स्वीकार करनी होंगी",
      langMismatch: "प्रदाता के साथ कोई साझा भाषा नहीं",
    },
    preview: {
      title: "त्वरित पूर्वावलोकन",
      hint: "यही वह है जो आपका विशेषज्ञ आपकी बेहतर सहायता के लिए देखेगा।",
    },
    labels: {
      compatible: "संगत भाषाएं",
      incompatible: "असंगत भाषाएं",
      communicationImpossible: "संवाद असंभव",
      needShared: "जारी रखने के लिए कम से कम एक साझा भाषा चुनें।",
    },
  },
} as const;

// const countries = [
//   "Afghanistan",
//   "Afrique du Sud",
//   "Albanie",
//   "Algérie",
//   "Allemagne",
//   "Andorre",
//   "Angola",
//   "Antigua-et-Barbuda",
//   "Arabie saoudite",
//   "Argentine",
//   "Arménie",
//   "Australie",
//   "Autriche",
//   "Azerbaïdjan",
//   "Bahamas",
//   "Bahreïn",
//   "Bangladesh",
//   "Barbade",
//   "Belgique",
//   "Belize",
//   "Bénin",
//   "Bhoutan",
//   "Biélorussie",
//   "Birmanie",
//   "Bolivie",
//   "Bosnie-Herzégovine",
//   "Botswana",
//   "Brésil",
//   "Brunei",
//   "Bulgarie",
//   "Burkina Faso",
//   "Burundi",
//   "Cambodge",
//   "Cameroun",
//   "Canada",
//   "Cap-Vert",
//   "Chili",
//   "Chine",
//   "Chypre",
//   "Colombie",
//   "Comores",
//   "Congo",
//   "Congo (RDC)",
//   "Corée du Nord",
//   "Corée du Sud",
//   "Costa Rica",
//   "Côte d'Ivoire",
//   "Croatie",
//   "Cuba",
//   "Danemark",
//   "Djibouti",
//   "Dominique",
//   "Égypte",
//   "Émirats arabes unis",
//   "Équateur",
//   "Érythrée",
//   "Espagne",
//   "Estonie",
//   "États-Unis",
//   "Éthiopie",
//   "Fidji",
//   "Finlande",
//   "France",
//   "Gabon",
//   "Gambie",
//   "Géorgie",
//   "Ghana",
//   "Grèce",
//   "Grenade",
//   "Guatemala",
//   "Guinée",
//   "Guinée-Bissau",
//   "Guinée équatoriale",
//   "Guyana",
//   "Haïti",
//   "Honduras",
//   "Hongrie",
//   "Îles Cook",
//   "Îles Marshall",
//   "Îles Salomon",
//   "Inde",
//   "Indonésie",
//   "Irak",
//   "Iran",
//   "Irlande",
//   "Islande",
//   "Israël",
//   "Italie",
//   "Jamaïque",
//   "Japon",
//   "Jordanie",
//   "Kazakhstan",
//   "Kenya",
//   "Kirghizistan",
//   "Kiribati",
//   "Koweït",
//   "Laos",
//   "Lesotho",
//   "Lettonie",
//   "Liban",
//   "Liberia",
//   "Libye",
//   "Liechtenstein",
//   "Lituanie",
//   "Luxembourg",
//   "Macédoine du Nord",
//   "Madagascar",
//   "Malaisie",
//   "Malawi",
//   "Maldives",
//   "Mali",
//   "Malte",
//   "Maroc",
//   "Maurice",
//   "Mauritanie",
//   "Mexique",
//   "Micronésie",
//   "Moldavie",
//   "Monaco",
//   "Mongolie",
//   "Monténégro",
//   "Mozambique",
//   "Namibie",
//   "Nauru",
//   "Népal",
//   "Nicaragua",
//   "Niger",
//   "Nigeria",
//   "Norvège",
//   "Nouvelle-Zélande",
//   "Oman",
//   "Ouganda",
//   "Ouzbékistan",
//   "Pakistan",
//   "Palaos",
//   "Palestine",
//   "Panama",
//   "Papouasie-Nouvelle-Guinée",
//   "Paraguay",
//   "Pays-Bas",
//   "Pérou",
//   "Philippines",
//   "Pologne",
//   "Portugal",
//   "Qatar",
//   "République centrafricaine",
//   "République dominicaine",
//   "République tchèque",
//   "Roumanie",
//   "Royaume-Uni",
//   "Russie",
//   "Rwanda",
//   "Saint-Christophe-et-Niévès",
//   "Saint-Marin",
//   "Saint-Vincent-et-les-Grenadines",
//   "Sainte-Lucie",
//   "Salvador",
//   "Samoa",
//   "São Tomé-et-Principe",
//   "Sénégal",
//   "Serbie",
//   "Seychelles",
//   "Sierra Leone",
//   "Singapour",
//   "Slovaquie",
//   "Slovénie",
//   "Somalie",
//   "Soudan",
//   "Soudan du Sud",
//   "Sri Lanka",
//   "Suède",
//   "Suisse",
//   "Suriname",
//   "Syrie",
//   "Tadjikistan",
//   "Tanzanie",
//   "Tchad",
//   "Thaïlande",
//   "Timor oriental",
//   "Togo",
//   "Tonga",
//   "Trinité-et-Tobago",
//   "Tunisie",
//   "Turkménistan",
//   "Turquie",
//   "Tuvalu",
//   "Ukraine",
//   "Uruguay",
//   "Vanuatu",
//   "Vatican",
//   "Venezuela",
//   "Vietnam",
//   "Yémen",
//   "Zambie",
//   "Zimbabwe",
// ];

// Generate countries list from countriesData to ensure synchronization
// This avoids the previous bug where manual list had different names (e.g., "Ivory Coast" vs "Côte d'Ivoire")
const countries = countriesData
  .filter((c) => c.code !== "SEPARATOR")
  .map((c) => c.nameEn)
  .sort((a, b) => a.localeCompare(b));

type MinimalUser = { uid?: string; firstName?: string } | null;
const ALL_LANGS = languages as BookingLanguage[];

interface BookingRequestData {
  clientPhone: string;
  clientId?: string;
  clientName: string;
  clientFirstName: string;
  clientLastName: string;
  clientNationality: string;
  clientCurrentCountry: string;
  providerId: string;
  providerName: string;
  providerType: "lawyer" | "expat";
  providerCountry: string;
  providerAvatar: string;
  providerRating?: number;
  providerReviewCount?: number;
  providerLanguages?: string[];
  providerSpecialties?: string[];
  title: string;
  description: string;
  clientLanguages: string[];
  clientLanguagesDetails: Array<{ code: string; name: string }>;
  price: number;
  duration: number;
  serviceType: string;
  status: string;
  ip: string;
  userAgent: string;
  providerEmail?: string;
  providerPhone?: string;
}

/** --- Types RHF --- */
type BookingFormData = {
  firstName: string;
  lastName: string;
  nationality: string;
  currentCountry: string;
  autrePays?: string;
  title: string;
  description: string;
  clientPhone: string; // géré via PhoneField (E.164)
  acceptTerms: boolean;
  clientLanguages: string[]; // codes (["fr","en"])
};

type FirestoreProviderDoc = Partial<Provider> & { id: string };

/** ====== Petits composants UI ====== */
const FieldSuccess = ({
  show,
  children,
}: {
  show: boolean;
  children: React.ReactNode;
}) =>
  show ? (
    <div className="mt-1 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-2 py-1 inline-flex items-center">
      <CheckCircle className="w-4 h-4 mr-1" /> {children}
    </div>
  ) : null;

const SectionHeader = ({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) => (
  <div className="flex items-center space-x-3 mb-5">
    <div
      className={`bg-gradient-to-br ${THEME.gradFrom} ${THEME.gradVia} ${THEME.gradTo} rounded-2xl p-3 shadow-md text-white`}
    >
      {icon}
    </div>
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h2>
      {subtitle && (
        <p className="text-gray-600 text-sm sm:text-base mt-0.5">{subtitle}</p>
      )}
    </div>
  </div>
);

const PreviewCard = ({
  title,
  country,
  langs,
  phone,
  priceLabel,
  duration,
  langPack,
}: {
  title: string;
  country?: string;
  langs: string[];
  phone?: string;
  priceLabel?: string;
  duration?: number;
  langPack: (typeof I18N)[LangKey];
}) => (
  <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-5">
    <div className="flex items-center gap-2 text-gray-700">
      <Sparkles className={`w-5 h-5 ${THEME.icon}`} />
      <div className="font-semibold">{langPack.preview.title}</div>
    </div>
    <p className="text-xs text-gray-500 mt-1">{langPack.preview.hint}</p>
    <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
      <div className="flex items-center gap-2 text-gray-700">
        <Globe className={`w-4 h-4 ${THEME.icon}`} />
        <span className="font-medium truncate">{title || "—"}</span>
      </div>
      {Boolean(country) && (
        <div className="flex items-center gap-2 text-gray-700">
          <MapPin className={`w-4 h-4 ${THEME.icon}`} />
          <span className="truncate">{country}</span>
        </div>
      )}
      {langs.length > 0 && (
        <div className="flex items-center gap-2 text-gray-700">
          <LanguagesIcon className={`w-4 h-4 ${THEME.icon}`} />
          <div className="flex flex-wrap gap-1">
            {langs.map((l) => (
              <span
                key={l}
                className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800 text-xs border border-rose-200"
              >
                {l.toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      )}
      {Boolean(phone) && (
        <div className="flex items-center gap-2 text-gray-700">
          <Phone className={`w-4 h-4 ${THEME.icon}`} />
          <span className="truncate">{phone}</span>
        </div>
      )}
    </div>

    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
      <div className="rounded-lg bg-rose-50 border border-rose-200 p-2">
        ⏱️ <span className="font-semibold">{duration ?? "—"} min</span>
      </div>
      <div className="rounded-lg bg-rose-50 border border-rose-200 p-2 text-right">
        💰 <span className="font-semibold">{priceLabel || "—"}</span>
      </div>
    </div>

    <div className="mt-3 text-xs text-gray-600">{langPack.satisfied}</div>
  </div>
);

/** ===== useMediaQuery Hook for Responsive Design ===== */
const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener("change", handler);
    setMatches(mq.matches);
    return () => mq.removeEventListener("change", handler);
  }, [query]);
  return matches;
};

/** ===== Step Indicator Component (Mobile Wizard) - Aligned with GuidedFilterWizard ===== */
const StepIndicator = ({
  currentStep,
  totalSteps,
  stepLabels,
}: {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}) => (
  <div className="py-4">
    <div className="flex items-center justify-center gap-3">
      {Array.from({ length: totalSteps }).map((_, i) => {
        const stepNum = i + 1;
        const isCompleted = stepNum < currentStep;
        const isCurrent = stepNum === currentStep;
        const isPending = stepNum > currentStep;

        return (
          <React.Fragment key={stepNum}>
            <div
              className={`
                w-11 h-11 rounded-full flex items-center justify-center font-bold text-lg
                transition-all duration-300 shadow-lg
                ${isCompleted ? "bg-green-500 text-white" : ""}
                ${isCurrent ? "bg-red-500 text-white ring-4 ring-red-500/30" : ""}
                ${isPending ? "bg-gray-200 text-gray-500" : ""}
              `}
              aria-label={`Step ${stepNum}: ${stepLabels[i] || ""}`}
              aria-current={isCurrent ? "step" : undefined}
            >
              {isCompleted ? (
                <Check className="w-5 h-5" />
              ) : (
                stepNum
              )}
            </div>
            {i < totalSteps - 1 && (
              <div
                className={`w-10 h-1 rounded-full transition-all duration-300 ${
                  stepNum < currentStep ? "bg-green-500" : "bg-gray-200"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
    <p className="text-center text-sm text-gray-600 mt-3 font-medium">
      {stepLabels[currentStep - 1] || `Étape ${currentStep}`}
    </p>
  </div>
);

/** ===== Provider Card Compact (Mobile) ===== */
const ProviderCardCompact = ({
  provider,
  isExpanded,
  onToggle,
  isLawyer,
  displayEUR,
  displayDuration,
  lang,
  intl,
}: {
  provider: Provider;
  isExpanded: boolean;
  onToggle: () => void;
  isLawyer: boolean;
  displayEUR: number;
  displayDuration: number;
  lang: LangKey;
  intl: ReturnType<typeof useIntl>;
}) => (
  <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-4">
    {/* Always visible header */}
    <button
      type="button"
      onClick={onToggle}
      className="w-full p-3 flex items-center gap-3 touch-manipulation"
      aria-expanded={isExpanded}
    >
      <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-red-200 bg-white flex-shrink-0">
        {provider.avatar ? (
          <img
            src={provider.avatar}
            alt={`Photo de ${provider.name}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/default-avatar.png";
            }}
          />
        ) : (
          <img
            src="/default-avatar.png"
            alt="Avatar par défaut"
            className="w-full h-full object-cover"
          />
        )}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-gray-900 truncate">
            {provider.name || "—"}
          </h3>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
              isLawyer
                ? "bg-blue-100 text-blue-800"
                : "bg-green-100 text-green-800"
            }`}
          >
            {isLawyer ? "Avocat" : "Expat"}
          </span>
        </div>
        <div className="text-xs text-gray-500 truncate">📍 {provider.country}</div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-lg font-extrabold text-red-600">
          {displayEUR.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
        </div>
        <div className="text-xs text-gray-500">{displayDuration} min</div>
      </div>
      <div className="ml-1 text-gray-400">
        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </div>
    </button>

    {/* Expandable details */}
    {isExpanded && (
      <div className="px-3 pb-3 pt-0 border-t border-gray-100 card-expand">
        <div className="pt-3 space-y-2">
          {/* Languages */}
          {!!provider.languages?.length && (
            <div className="flex flex-wrap gap-1">
              {(provider.languages || []).map((code, idx) => {
                // Normaliser le code pour gérer les anciennes données ("Français" -> "fr")
                const normalizedCode = LanguageUtils.normalizeToCode(code);
                const l = ALL_LANGS.find((x) => x.code === normalizedCode);
                const label = l ? getLanguageLabel(l, lang) : code;
                return (
                  <span
                    key={`compact-${code}-${idx}`}
                    className="px-2 py-0.5 bg-blue-50 text-blue-800 text-xs rounded-full border border-blue-200"
                  >
                    {label}
                  </span>
                );
              })}
            </div>
          )}
          {/* Trust badges */}
          <div className="flex items-center gap-4 text-xs text-gray-500 pt-1">
            <div className="flex items-center gap-1">
              <Shield size={12} className="text-green-500" />
              <span>{intl.formatMessage({ id: "bookingRequest.securePay" })}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={12} className="text-blue-500" />
              <span>{displayDuration} min</span>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
);

/** ===== Sticky CTA Component (Mobile) ===== */
const StickyCTA = ({
  currentStep,
  totalSteps,
  onNext,
  onBack,
  onSubmit,
  canProceed,
  isSubmitting,
  price,
  intl,
}: {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
  canProceed: boolean;
  isSubmitting: boolean;
  price: number;
  intl: ReturnType<typeof useIntl>;
}) => {
  const isLastStep = currentStep === totalSteps;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 sticky-cta-container pb-safe-area">
      <div className="p-4 flex gap-3">
        {/* Back button */}
        {currentStep > 1 && (
          <button
            type="button"
            onClick={onBack}
            onTouchEnd={(e) => {
              e.preventDefault();
              onBack();
            }}
            className="px-4 py-4 rounded-2xl border-2 border-gray-200 text-gray-700 font-semibold text-lg
              flex items-center justify-center gap-1 touch-manipulation
              hover:bg-gray-50 active:scale-[0.98] transition-all min-h-[60px]"
            aria-label={intl.formatMessage({ id: "common.back", defaultMessage: "Retour" })}
          >
            <ChevronLeft size={24} />
            <span className="sr-only sm:not-sr-only">
              {intl.formatMessage({ id: "common.back", defaultMessage: "Retour" })}
            </span>
          </button>
        )}

        {/* Next/Submit button */}
        <button
          type="button"
          onClick={isLastStep ? onSubmit : onNext}
          onTouchEnd={(e) => {
            if (!canProceed || isSubmitting) {
              e.preventDefault();
              return;
            }
            e.preventDefault();
            if (isLastStep) {
              onSubmit();
            } else {
              onNext();
            }
          }}
          disabled={!canProceed || isSubmitting}
          className={`flex-1 py-4 px-4 rounded-2xl font-bold text-lg text-white
            flex items-center justify-center gap-2 touch-manipulation
            transition-all min-h-[60px]
            ${
              canProceed && !isSubmitting
                ? "bg-gradient-to-r from-red-500 to-orange-500 shadow-lg shadow-red-500/30 active:scale-[0.98]"
                : "bg-gray-400 cursor-not-allowed"
            }
          `}
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              <span>{intl.formatMessage({ id: "bookingRequest.processing", defaultMessage: "Traitement..." })}</span>
            </>
          ) : isLastStep ? (
            <>
              <Euro size={20} />
              <span>{intl.formatMessage({ id: "bookingRequest.continuePay" })}</span>
              <span className="font-extrabold">
                {price.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
              </span>
            </>
          ) : (
            <>
              <span>{intl.formatMessage({ id: "common.next", defaultMessage: "Suivant" })}</span>
              <ChevronRight size={20} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

/** ===== Mobile Wizard Inner Component (uses context) ===== */
interface MobileWizardInnerProps {
  provider: Provider;
  isLawyer: boolean;
  displayEUR: number;
  displayDuration: number;
  onSubmit: (data: MobileBookingFormData) => Promise<void>;
  onBack: () => void;
}

const MobileWizardInner: React.FC<MobileWizardInnerProps> = ({
  provider,
  isLawyer,
  displayEUR,
  displayDuration,
  onSubmit,
  onBack,
}) => {
  const {
    setProvider,
    setDisplayEUR,
    setDisplayDuration,
  } = useMobileBooking();

  // Sync props to context
  useEffect(() => {
    setProvider(provider);
  }, [provider, setProvider]);

  useEffect(() => {
    setDisplayEUR(displayEUR);
  }, [displayEUR, setDisplayEUR]);

  useEffect(() => {
    setDisplayDuration(displayDuration);
  }, [displayDuration, setDisplayDuration]);

  return (
    <MobileBookingWizard
      onSubmit={onSubmit}
      onBack={onBack}
    />
  );
};

/** ===== Email-First Auth Component (Mobile-First 2026) ===== */
type AuthFlowStep = "email" | "password-login" | "password-register" | "google-login";

interface EmailFirstAuthProps {
  onAuthSuccess: () => void;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  loginWithGoogle: (rememberMe?: boolean) => Promise<void>;
  register: (userData: { email: string; role: "client" | "lawyer" | "expat" | "admin"; firstName?: string; lastName?: string }, password: string) => Promise<void>;
  intl: ReturnType<typeof useIntl>;
  isMobile: boolean;
}

const EmailFirstAuth: React.FC<EmailFirstAuthProps> = ({
  onAuthSuccess,
  login,
  loginWithGoogle,
  register,
  intl,
  isMobile,
}) => {
  const [authStep, setAuthStep] = useState<AuthFlowStep>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signInMethods, setSignInMethods] = useState<string[]>([]);

  const isValidEmail = (e: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  // FIX: Firebase "Email Enumeration Protection" fait que fetchSignInMethodsForEmail
  // retourne TOUJOURS un tableau vide. On ne peut plus détecter si un email existe côté client.
  // Solution: On envoie toujours vers "password-register". Si l'email existe déjà,
  // handleRegister détectera auth/email-already-in-use et basculera vers "password-login".
  const handleEmailSubmit = async () => {
    if (!email || !isValidEmail(email)) {
      setError(intl.formatMessage({ id: "auth.invalidEmail", defaultMessage: "Adresse email invalide" }));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const methods = await fetchSignInMethodsForEmail(auth, email.trim().toLowerCase());
      console.log("[EmailFirstAuth] Sign-in methods for email:", methods);
      setSignInMethods(methods);

      // Note: Avec Email Enumeration Protection activé, methods sera toujours []
      // Le fallback vers password-register gère ce cas (voir handleRegister)
      if (methods.length === 0) {
        // Email inconnu OU Email Enumeration Protection → proposer inscription
        // Si l'utilisateur existe déjà, handleRegister basculera vers password-login
        setAuthStep("password-register");
      } else if (methods.includes("google.com") && !methods.includes("password")) {
        setAuthStep("google-login");
      } else if (methods.includes("password")) {
        setAuthStep("password-login");
      } else {
        setAuthStep(methods.includes("google.com") ? "google-login" : "password-register");
      }
    } catch (err) {
      console.error("[EmailFirstAuth] fetchSignInMethodsForEmail error:", err);
      setAuthStep("password-register");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await loginWithGoogle(true);
      onAuthSuccess();
    } catch (err: any) {
      console.error("[EmailFirstAuth] Google login error:", err);
      setError(err.message || intl.formatMessage({ id: "auth.googleError", defaultMessage: "Erreur de connexion Google" }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!password || password.length < 8) {
      setError(intl.formatMessage({ id: "auth.wizard.passwordTooShort" }));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await login(email.trim().toLowerCase(), password, true);
      onAuthSuccess();
    } catch (err: any) {
      console.error("[EmailFirstAuth] login error:", err);
      const errorCode = err?.code;
      if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/wrong-password') {
        setError(intl.formatMessage({ id: "auth.wizard.wrongPassword", defaultMessage: "Mot de passe incorrect" }));
      } else if (errorCode === 'auth/too-many-requests') {
        setError(intl.formatMessage({ id: "auth.wizard.tooManyAttempts", defaultMessage: "Trop de tentatives. Réessayez plus tard." }));
      } else {
        setError(err.message || intl.formatMessage({ id: "auth.loginError", defaultMessage: "Erreur de connexion" }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!password || password.length < 8) {
      setError(intl.formatMessage({ id: "auth.wizard.passwordTooShort" }));
      return;
    }
    if (password !== confirmPassword) {
      setError(intl.formatMessage({ id: "auth.passwordMismatch" }));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await register(
        {
          email: email.trim().toLowerCase(),
          role: "client",
        },
        password
      );
      onAuthSuccess();
    } catch (err: any) {
      console.error("[EmailFirstAuth] register error:", err);
      const errorCode = err?.code;
      if (errorCode === 'auth/email-already-in-use') {
        // FIX: L'email existe déjà (non détecté par fetchSignInMethodsForEmail
        // à cause de l'Email Enumeration Protection). Basculer vers login.
        console.log("[EmailFirstAuth] Email already exists, switching to login step");
        setAuthStep("password-login");
        setPassword(""); // Reset le mot de passe pour que l'utilisateur saisisse son vrai mot de passe
        setConfirmPassword("");
        setError(intl.formatMessage({
          id: "auth.emailAlreadyExists",
          defaultMessage: "Ce compte existe déjà. Entrez votre mot de passe pour vous connecter."
        }));
      } else if (errorCode === 'auth/weak-password') {
        setError(intl.formatMessage({ id: "auth.wizard.weakPassword", defaultMessage: "Mot de passe trop faible" }));
      } else {
        setError(err.message || intl.formatMessage({ id: "auth.registerError", defaultMessage: "Erreur lors de l'inscription" }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter") {
      e.preventDefault();
      action();
    }
  };

  const inputBaseClass = `w-full px-4 py-4 min-h-[56px] border-2 rounded-2xl bg-white text-gray-900 placeholder-gray-400
    focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/20 transition-all duration-200 text-[16px] touch-manipulation`;

  return (
    <div className={`bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden ${isMobile ? 'mx-3' : ''}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur">
            {authStep === "email" ? (
              <Mail className="w-6 h-6 text-white" />
            ) : (
              <Lock className="w-6 h-6 text-white" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold">
              {authStep === "email" && intl.formatMessage({ id: "auth.emailFirst.title", defaultMessage: "Identifiez-vous" })}
              {authStep === "password-login" && intl.formatMessage({ id: "auth.login.title", defaultMessage: "Bon retour !" })}
              {authStep === "password-register" && intl.formatMessage({ id: "auth.register.title", defaultMessage: "Créez votre compte" })}
              {authStep === "google-login" && intl.formatMessage({ id: "auth.googleLogin.title", defaultMessage: "Compte Google détecté" })}
            </h2>
            <p className="text-white/80 text-sm">
              {authStep === "email" && intl.formatMessage({ id: "auth.emailFirst.subtitle", defaultMessage: "Entrez votre email pour continuer" })}
              {authStep === "password-login" && intl.formatMessage({ id: "auth.login.subtitle", defaultMessage: "Entrez votre mot de passe" })}
              {authStep === "password-register" && intl.formatMessage({ id: "auth.register.subtitle", defaultMessage: "Choisissez un mot de passe sécurisé" })}
              {authStep === "google-login" && intl.formatMessage({ id: "auth.googleLogin.subtitle", defaultMessage: "Connectez-vous avec Google" })}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Step: Email */}
        {authStep === "email" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {intl.formatMessage({ id: "auth.email", defaultMessage: "Adresse email" })}
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, handleEmailSubmit)}
                  placeholder="votre@email.com"
                  className={`${inputBaseClass} pl-12`}
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleEmailSubmit}
              disabled={isLoading || !email}
              className={`w-full py-4 px-6 rounded-2xl font-bold text-lg text-white
                flex items-center justify-center gap-2 touch-manipulation transition-all min-h-[60px]
                ${!isLoading && email
                  ? "bg-gradient-to-r from-red-500 to-orange-500 shadow-lg shadow-red-500/30 active:scale-[0.98]"
                  : "bg-gray-300 cursor-not-allowed"
                }
              `}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>{intl.formatMessage({ id: "common.continue", defaultMessage: "Continuer" })}</span>
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Step: Password Login */}
        {authStep === "password-login" && (
          <div className="space-y-4">
            {/* Email display */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Mail className="w-5 h-5 text-gray-500" />
              <span className="text-gray-700 flex-1">{email}</span>
              <button
                type="button"
                onClick={() => {
                  setAuthStep("email");
                  setPassword("");
                  setError(null);
                }}
                className="text-red-500 text-sm font-medium hover:underline"
              >
                {intl.formatMessage({ id: "common.change", defaultMessage: "Modifier" })}
              </button>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {intl.formatMessage({ id: "auth.password", defaultMessage: "Mot de passe" })}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, handleLogin)}
                  placeholder="••••••••"
                  className={`${inputBaseClass} pl-12 pr-12`}
                  autoComplete="current-password"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogin}
              disabled={isLoading || !password}
              className={`w-full py-4 px-6 rounded-2xl font-bold text-lg text-white
                flex items-center justify-center gap-2 touch-manipulation transition-all min-h-[60px]
                ${!isLoading && password
                  ? "bg-gradient-to-r from-red-500 to-orange-500 shadow-lg shadow-red-500/30 active:scale-[0.98]"
                  : "bg-gray-300 cursor-not-allowed"
                }
              `}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>{intl.formatMessage({ id: "auth.login", defaultMessage: "Se connecter" })}</span>
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>

            {/* Forgot password link */}
            <div className="text-center">
              <Link
                to="/forgot-password"
                className="text-sm text-red-500 hover:underline font-medium"
              >
                {intl.formatMessage({ id: "auth.forgotPassword", defaultMessage: "Mot de passe oublié ?" })}
              </Link>
            </div>
          </div>
        )}

        {/* Step: Password Register */}
        {authStep === "password-register" && (
          <div className="space-y-4">
            {/* Email display */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Mail className="w-5 h-5 text-gray-500" />
              <span className="text-gray-700 flex-1">{email}</span>
              <button
                type="button"
                onClick={() => {
                  setAuthStep("email");
                  setPassword("");
                  setConfirmPassword("");
                  setError(null);
                }}
                className="text-red-500 text-sm font-medium hover:underline"
              >
                {intl.formatMessage({ id: "common.change", defaultMessage: "Modifier" })}
              </button>
            </div>

            {/* Info message for new users */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-2xl flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">
                {intl.formatMessage({ id: "auth.newAccount.info", defaultMessage: "Bienvenue ! Créez un mot de passe pour votre nouveau compte." })}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {intl.formatMessage({ id: "auth.createPassword", defaultMessage: "Créer un mot de passe" })}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`${inputBaseClass} pl-12 pr-12`}
                  autoComplete="new-password"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {intl.formatMessage({ id: "auth.passwordHint", defaultMessage: "Minimum 6 caractères" })}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {intl.formatMessage({ id: "auth.confirmPassword", defaultMessage: "Confirmer le mot de passe" })}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, handleRegister)}
                  placeholder="••••••••"
                  className={`${inputBaseClass} pl-12`}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleRegister}
              disabled={isLoading || !password || !confirmPassword}
              className={`w-full py-4 px-6 rounded-2xl font-bold text-lg text-white
                flex items-center justify-center gap-2 touch-manipulation transition-all min-h-[60px]
                ${!isLoading && password && confirmPassword
                  ? "bg-gradient-to-r from-red-500 to-orange-500 shadow-lg shadow-red-500/30 active:scale-[0.98]"
                  : "bg-gray-300 cursor-not-allowed"
                }
              `}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>{intl.formatMessage({ id: "auth.createAccount", defaultMessage: "Créer mon compte" })}</span>
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Step: Google Login */}
        {authStep === "google-login" && (
          <div className="space-y-4">
            {/* Email display */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Mail className="w-5 h-5 text-gray-500" />
              <span className="text-gray-700 flex-1">{email}</span>
              <button
                type="button"
                onClick={() => {
                  setAuthStep("email");
                  setError(null);
                }}
                className="text-red-500 text-sm font-medium hover:underline"
              >
                {intl.formatMessage({ id: "common.change", defaultMessage: "Modifier" })}
              </button>
            </div>

            {/* Info message for Google users */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700">
                {intl.formatMessage({
                  id: "auth.googleAccount.info",
                  defaultMessage: "Vous vous êtes inscrit avec Google. Cliquez ci-dessous pour vous connecter."
                })}
              </p>
            </div>

            {/* Google login button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className={`w-full py-4 px-6 rounded-2xl font-bold text-lg
                flex items-center justify-center gap-3 touch-manipulation transition-all min-h-[60px]
                ${!isLoading
                  ? "bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-50 active:scale-[0.98] shadow-sm"
                  : "bg-gray-100 cursor-not-allowed"
                }
              `}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {/* Google Icon */}
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>{intl.formatMessage({ id: "auth.continueWithGoogle", defaultMessage: "Continuer avec Google" })}</span>
                </>
              )}
            </button>

            {/* Separator */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  {intl.formatMessage({ id: "auth.or", defaultMessage: "ou" })}
                </span>
              </div>
            </div>

            {/* Option to create password instead */}
            <p className="text-center text-sm text-gray-600">
              {intl.formatMessage({
                id: "auth.googleAccount.addPassword",
                defaultMessage: "Vous pouvez aussi"
              })}{" "}
              <button
                type="button"
                onClick={() => setAuthStep("password-register")}
                className="text-red-500 font-medium hover:underline"
              >
                {intl.formatMessage({
                  id: "auth.addPasswordToAccount",
                  defaultMessage: "ajouter un mot de passe à votre compte"
                })}
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

/** ===== Step Label Icons (3 étapes optimisées) ===== */
const STEP_ICONS = [
  <User key="user" className="w-5 h-5" />,        // Step 1: Personal info
  <FileText key="filetext" className="w-5 h-5" />, // Step 2: Request details
  <Phone key="phone" className="w-5 h-5" />,       // Step 3: Contact + Confirmation
];

/** 🔧 utils */
const sanitizeText = (input: string, opts: { trim?: boolean } = {}): string => {
  const out = input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
  return opts.trim ? out.trim() : out;
};
const sanitizeInput = (input: string): string =>
  sanitizeText(input, { trim: true });

/** ===== Page (RHF) ===== */
const BookingRequest: React.FC = () => {
  const intl = useIntl();
  const { providerId } = useParams<{ providerId: string }>();
  const navigate = useLocaleNavigate();
  const { user, isLoading: authLoading, login, loginWithGoogle, register } = useAuth();
  const { language } = useApp();
  const lang = (language as LangKey) || "fr";
  const t = I18N[lang];

  const [provider, setProvider] = useState<Provider | null>(null);
  const [providerLoading, setProviderLoading] = useState<boolean>(true);

  // Track when auth just succeeded but user not yet loaded from Firestore
  const [authPending, setAuthPending] = useState<boolean>(false);

  const { pricing } = usePricingConfig();

  // Load active promo from sessionStorage
  const [activePromo, setActivePromo] = useState<{
    code: string;
    discountType: "percentage" | "fixed";
    discountValue: number;
    services: string[];
  } | null>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("activePromoCode");
      if (saved) {
        const promoData = JSON.parse(saved);
        setActivePromo(promoData);
      }
    } catch {
      // Ignore promo loading errors
    }
  }, []);

  // RHF
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
    trigger,
  } = useForm<BookingFormData>({
    mode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      nationality: "",
      currentCountry: "",
      autrePays: "",
      title: "",
      description: "",
      clientPhone: "",
      acceptTerms: false,
      clientLanguages: [],
    },
  });

  // P0 FIX: Use useWatch with specific fields to avoid re-renders from watch()
  const watched = useWatch({ control });
  const watchedCountry = watch('currentCountry');

  const [languagesSpoken, setLanguagesSpoken] = useState<BookingLanguage[]>([]);
  const [hasLanguageMatchRealTime, setHasLanguageMatchRealTime] =
    useState(true);
  const [formError, setFormError] = useState("");
  const [showLangMismatchWarning, setShowLangMismatchWarning] = useState(false);
  const [langMismatchAcknowledged, setLangMismatchAcknowledged] = useState(false);

  // ===== MOBILE WIZARD STATE =====
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [currentStep, setCurrentStep] = useState(1);
  const [animationDirection, setAnimationDirection] = useState<"forward" | "backward">("forward");
  const [providerExpanded, setProviderExpanded] = useState(false);
  const TOTAL_STEPS = 3;

  // Step labels for accessibility and display (3 étapes optimisées)
  const stepLabels = useMemo(() => [
    intl.formatMessage({ id: "bookingRequest.personal", defaultMessage: "Informations" }),
    intl.formatMessage({ id: "bookingRequest.request", defaultMessage: "Votre demande" }),
    intl.formatMessage({ id: "bookingRequest.contact", defaultMessage: "Contact & Confirmation" }),
  ], [intl]);

  // Refs pour scroll ciblé (en cas d'erreur globale)
  const refFirstName = useRef<HTMLDivElement | null>(null);
  const refLastName = useRef<HTMLDivElement | null>(null);
  const refCountry = useRef<HTMLDivElement | null>(null);
  const refTitle = useRef<HTMLDivElement | null>(null);
  const refDesc = useRef<HTMLDivElement | null>(null);
  const refLangs = useRef<HTMLDivElement | null>(null);
  const refPhone = useRef<HTMLDivElement | null>(null);
  const refCGU = useRef<HTMLDivElement | null>(null);

  // DEBUG: Focus and Scroll Tracking - removed for production (was causing unnecessary event listeners)

  // Flag pour éviter le traitement multiple des données wizard
  const wizardDataProcessedRef = useRef(false);

  // Mobile-first 2026 input classes with 48px minimum touch target (Apple HIG + Google Material 3)
  const inputClass = (hasErr?: boolean) =>
    `w-full max-w-full box-border px-3 sm:px-4 py-3 sm:py-3.5 min-h-[48px] border-2 rounded-xl bg-white text-gray-900 placeholder-gray-400
    focus:outline-none transition-all duration-200 text-[16px] touch-manipulation
    [&_input]:border-0 [&_input]:outline-none [&_input]:shadow-none [&_input]:bg-transparent [&_input]:w-full [&_input]:max-w-full
    [&_input:focus]:border-0 [&_input:focus]:outline-none [&_input:focus]:shadow-none
    [&_select]:outline-none [&_select:focus]:outline-none [&_select]:bg-transparent [&_select]:w-full
    [-webkit-appearance:none] [appearance:none]
  ${
    hasErr
      ? "border-red-500 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-red-50/50"
      : "border-gray-200 hover:border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/10"
  }`;

  // Rediriger vers login si non connecté
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('⚡ [BookingRequest] useEffect: AUTH CHECK', {
        authLoading,
        user: user ? user.uid : null,
        providerId,
      });
    }
    // Email-first auth: NO REDIRECT - show inline auth form instead
  }, [user, authLoading, providerId]);

  // Reset authPending when user is loaded after registration/login
  useEffect(() => {
    if (user && authPending) {
      console.log('[BookingRequest] User loaded, resetting authPending');
      setAuthPending(false);
    }
  }, [user, authPending]);

  // Lecture provider depuis sessionStorage
  // P0 FIX: Use a ref-based approach to avoid useCallback dependency issues
  // This ensures the function reference stays stable across renders
  const providerIdRef = useRef(providerId);
  providerIdRef.current = providerId;

  const readProviderFromSession = useCallback((): Provider | null => {
    try {
      const saved = sessionStorage.getItem("selectedProvider");
      if (!saved) return null;
      const parsed = JSON.parse(saved) as Partial<Provider> & { id?: string };
      // Use ref to get current providerId without adding it as dependency
      if (parsed && parsed.id && parsed.id === providerIdRef.current) {
        return normalizeProvider(parsed as Partial<Provider> & { id: string });
      }
    } catch (error) {
      console.warn("Failed to read provider from sessionStorage", error);
    }
    return null;
  }, []); // P0 FIX: Empty deps = stable function reference

  // P0 FIX: Track if provider has been loaded to prevent re-loading
  const providerLoadedRef = useRef(false);

  // Chargement live du provider
  useEffect(() => {
    // P0 FIX: Skip if already loaded (prevents re-mount issues)
    if (providerLoadedRef.current && provider) {
      return;
    }

    if (import.meta.env.DEV) {
      console.log('⚡ [BookingRequest] PROVIDER LOAD START', { providerId });
    }
    let unsub: (() => void) | undefined;
    const boot = async () => {
      setProviderLoading(true);
      const fromSession = readProviderFromSession();
      if (fromSession) {
        setProvider(fromSession);
        setProviderLoading(false);
        providerLoadedRef.current = true; // P0 FIX: Mark as loaded
      }
      try {
        if (!providerId) {
          setProvider(null);
          setProviderLoading(false);
          return;
        }

        // Support shortId (6 chars) ou ID Firebase long (28 chars)
        const isShortId = providerId.length <= 8;
        let docId = providerId;

        // Si c'est un shortId, chercher le vrai ID Firebase
        if (isShortId) {
          const q = query(
            collection(db, "sos_profiles"),
            where("shortId", "==", providerId)
          );
          const querySnap = await getDocs(q);
          if (!querySnap.empty) {
            docId = querySnap.docs[0].id;
          } else {
            // Pas trouvé par shortId, essayer comme ID Firebase
            docId = providerId;
          }
        }

        const ref = doc(db, "sos_profiles", docId);
        unsub = onSnapshot(
          ref,
          (snap) => {
            if (snap.exists()) {
              const data = snap.data() as Record<string, unknown>;
              const normalized = normalizeProvider({
                id: snap.id,
                ...(data as Partial<Provider>),
              } as FirestoreProviderDoc);
              setProvider(normalized);
              providerLoadedRef.current = true; // P0 FIX: Mark as loaded
              try {
                sessionStorage.setItem(
                  "selectedProvider",
                  JSON.stringify(normalized)
                );
              } catch {
                // ignore
              }
            } else {
              setProvider(null);
            }
            setProviderLoading(false);
          },
          (e) => {
            console.error("onSnapshot error", e);
            setProviderLoading(false);
          }
        );

        if (!fromSession) {
          try {
            const snap = await getDoc(ref);
            if (snap.exists()) {
              const data = snap.data() as Record<string, unknown>;
              const normalized = normalizeProvider({
                id: snap.id,
                ...(data as Partial<Provider>),
              } as FirestoreProviderDoc);
              setProvider(normalized);
              providerLoadedRef.current = true; // P0 FIX: Mark as loaded
              try {
                sessionStorage.setItem(
                  "selectedProvider",
                  JSON.stringify(normalized)
                );
              } catch {
                // ignore
              }
            } else {
              setProvider(null);
            }
          } finally {
            setProviderLoading(false);
          }
        }
      } catch (e) {
        console.error("Provider loading error", e);
        setProviderLoading(false);
      }
    };
    void boot();
    return () => {
      if (unsub) unsub();
    };
    // P0 FIX: Only depend on providerId - readProviderFromSession is now stable
  }, [providerId, readProviderFromSession]);

  // Pre-fill form with wizard data from sessionStorage
  // Le pays d'intervention est UNIQUEMENT celui choisi par le client dans le wizard
  // ✅ FIX: Utilisation d'un ref pour éviter les exécutions multiples
  useEffect(() => {
    console.log('%c⚡ [BookingRequest] useEffect: WIZARD DATA PREFILL', 'background: #FF5722; color: white; padding: 2px 6px; border-radius: 3px;', {
      alreadyProcessed: wizardDataProcessedRef.current,
      timestamp: new Date().toISOString(),
    });

    // Skip si déjà traité (évite les re-exécutions dues aux changements de setValue)
    if (wizardDataProcessedRef.current) {
      console.log('🔵 [BookingRequest] Wizard data already processed, skipping');
      return;
    }

    try {
      const wizardData = sessionStorage.getItem('wizardFilters');
      console.log('🔵 [BookingRequest] wizardData from sessionStorage:', wizardData);
      if (!wizardData) {
        console.log('🔵 [BookingRequest] No wizardData found, skipping prefill');
        return;
      }

      // Marquer comme traité AVANT le traitement pour éviter les race conditions
      wizardDataProcessedRef.current = true;

      const { country, languages: wizardLanguages } = JSON.parse(wizardData) as {
        country: string;
        languages: string[];
        type: string;
      };
      console.log('%c📥 [BookingRequest] DONNÉES RÉCUPÉRÉES DU WIZARD/FILTRES', 'background: #2196F3; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
      console.log('📍 Code pays reçu:', country || '(vide)');
      console.log('🗣️ Codes langues reçus:', wizardLanguages?.length ? wizardLanguages : '(aucune)');

      // Pré-remplir le pays d'intervention depuis le wizard
      // FIX: Le pays est maintenant requis au step 1 mobile, donc on le pré-remplit
      // Convertir le code pays (ex: "FR") en nom anglais (ex: "France") car le select utilise nameEn
      if (country) {
        const countryData = countriesData.find((c) => c.code === country);
        const countryName = countryData?.nameEn || country;
        setValue('currentCountry', countryName);
        console.log('✅ [BookingRequest] Pays pré-rempli depuis le wizard:', country, '->', countryName);
      }

      // Préremplir les langues choisies par le client dans le wizard
      if (wizardLanguages && wizardLanguages.length > 0) {
        const selectedLangs: BookingLanguage[] = wizardLanguages
          .map((code) => {
            const langData = languagesData.find(
              (l) => l.code.toLowerCase() === code.toLowerCase()
            );
            if (langData) {
              return {
                code: langData.code,
                name: langData.name,
                nativeName: langData.nativeName,
              } as BookingLanguage;
            }
            return null;
          })
          .filter((v): v is BookingLanguage => Boolean(v));

        if (selectedLangs.length > 0) {
          setLanguagesSpoken(selectedLangs);
          setValue('clientLanguages', selectedLangs.map((l) => l.code));
          console.log('✅ Langues appliquées au formulaire:', selectedLangs.map(l => l.name).join(', '));
        }
      }

      console.log('%c✅ [BookingRequest] PRÉ-REMPLISSAGE TERMINÉ', 'background: #4CAF50; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');

    } catch (e) {
      console.warn('Failed to read wizard filters from sessionStorage', e);
    }
  }, [setValue]);

  // Matching live des langues (normalisé vers codes ISO pour comparaison fiable)
  // Gère les deux formats : noms complets ("Français") et codes ISO ("fr")
  useEffect(() => {
    console.log('%c⚡ [BookingRequest] useEffect: LANGUAGE MATCHING', 'background: #FF5722; color: white; padding: 2px 6px; border-radius: 3px;', {
      hasProvider: !!provider,
      languagesSpokenCount: languagesSpoken.length,
    });

    if (!provider || (!provider.languages && !provider.languagesSpoken)) {
      console.log('🗣️ [BookingRequest] No provider languages, setting match = true');
      setHasLanguageMatchRealTime(true);
      return;
    }
    const providerLanguages =
      provider.languages || provider.languagesSpoken || [];
    // Normaliser les langues du provider vers des codes ISO (gère "Français" -> "fr" et "fr" -> "fr")
    const providerCodesNormalized = providerLanguages.map((pl) =>
      LanguageUtils.normalizeToCode(pl).toLowerCase().trim()
    );
    // Normaliser les langues du client (déjà en codes ISO normalement)
    const clientCodesNormalized = languagesSpoken.map((l) =>
      LanguageUtils.normalizeToCode(l.code).toLowerCase().trim()
    );
    const hasMatch = providerCodesNormalized.some((pl) => clientCodesNormalized.includes(pl));
    console.log('%c🗣️ [BookingRequest] Language matching result', 'background: #673AB7; color: white; padding: 2px 6px; border-radius: 3px;', {
      providerLanguagesRaw: providerLanguages,
      providerCodes: providerCodesNormalized,
      clientCodes: clientCodesNormalized,
      hasMatch,
      willSetState: hasMatch !== hasLanguageMatchRealTime,
    });
    setHasLanguageMatchRealTime(hasMatch);
  }, [languagesSpoken, provider]);

  // PRICING (ADMIN + fallback)
  const isLawyer = provider?.type === "lawyer" || provider?.role === "lawyer";
  const role: ServiceType = isLawyer ? "lawyer" : "expat";

  const eurAdmin = pricing?.[role]?.eur;
  const usdAdmin = pricing?.[role]?.usd;

  // const displayEUR = eurAdmin?.totalAmount ?? FALLBACK_TOTALS[role].eur;
  // const displayUSD = usdAdmin?.totalAmount ?? FALLBACK_TOTALS[role].usd;
  // const displayDuration =
  //   eurAdmin?.duration ??
  //   usdAdmin?.duration ??
  //   provider?.duration ??
  //   FALLBACK_TOTALS[role].duration;

  const baseEUR = eurAdmin?.totalAmount ?? FALLBACK_TOTALS[role].eur;
  const baseUSD = usdAdmin?.totalAmount ?? FALLBACK_TOTALS[role].usd;
  const displayDuration =
    eurAdmin?.duration ??
    usdAdmin?.duration ??
    provider?.duration ??
    FALLBACK_TOTALS[role].duration;

  // Check if promo applies to this service
  const serviceKey = role === "lawyer" ? "lawyer_call" : "expat_call";
  const promoApplies = activePromo && activePromo.services.includes(serviceKey);

  let displayEUR = baseEUR;
  let displayUSD = baseUSD;
  let discountEUR = 0;
  let discountUSD = 0;

  if (promoApplies) {
    if (activePromo.discountType === "percentage") {
      discountEUR = baseEUR * (activePromo.discountValue / 100);
      discountUSD = baseUSD * (activePromo.discountValue / 100);
    } else {
      // Fixed discount
      discountEUR = Math.min(activePromo.discountValue, baseEUR);
      discountUSD = Math.min(
        activePromo.discountValue * (baseUSD / baseEUR),
        baseUSD
      );
    }

    displayEUR = Math.max(0, Math.round(baseEUR - discountEUR));
    displayUSD = Math.max(0, Math.round(baseUSD - discountUSD));
  }

  // Progression (RHF) - P0 FIX: validFlags now depends on watched from useWatch
  const validFlags: Record<string, boolean> = useMemo(() => {
    const values = getValues();
    const hasTitle = values.title.trim().length >= 10;
    const hasDesc = values.description.trim().length >= 50;
    const hasFirst = values.firstName.trim().length > 0;
    const hasLast = values.lastName.trim().length > 0;
    const hasCountry = values.currentCountry.trim().length > 0;
    const otherOk =
      values.currentCountry !== "Autre" ? true : !!values.autrePays?.trim();
    const langsOk = (values.clientLanguages?.length ?? 0) > 0;
    const accept = Boolean(values.acceptTerms);

    const phoneValid = (() => {
      if (!values.clientPhone) return false;
      try {
        const p = parsePhoneNumberFromString(values.clientPhone);
        return !!(p && p.isValid());
      } catch {
        return false;
      }
    })();

    const sharedLang = hasLanguageMatchRealTime;

    return {
      firstName: hasFirst,
      lastName: hasLast,
      title: hasTitle,
      description: hasDesc,
      currentCountry: hasCountry,
      autrePays: otherOk,
      langs: langsOk,
      phone: phoneValid,
      accept: accept,
      sharedLang,
    };
  }, [watched, hasLanguageMatchRealTime]);

  const formProgress = useMemo(() => {
    const flags = Object.values(validFlags);
    const done = flags.filter(Boolean).length;
    return Math.round((done / flags.length) * 100);
  }, [validFlags]);

  // ===== WIZARD STEP VALIDATION (3 étapes optimisées) =====
  // Pays + Langues déjà connus du wizard initial Facebook
  const getStepValidationFlags = useCallback((step: number): boolean => {
    const v = validFlags;
    switch (step) {
      case 1: // Personal Info: firstName, lastName (pays auto-rempli du wizard)
        return v.firstName && v.lastName;
      case 2: // Request Details: title, description
        return v.title && v.description;
      case 3: // Contact + Terms: phone, accept (langues auto-remplies du wizard)
        return v.phone && v.accept;
      default:
        return false;
    }
  }, [validFlags]);

  // Check if current step is valid to proceed
  const canProceedToNext = useMemo(() => {
    return getStepValidationFlags(currentStep);
  }, [currentStep, getStepValidationFlags]);

  // Navigation functions
  const goNextStep = useCallback(() => {
    if (canProceedToNext && currentStep < TOTAL_STEPS) {
      setAnimationDirection("forward");
      setCurrentStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [canProceedToNext, currentStep]);

  const goBackStep = useCallback(() => {
    if (currentStep > 1) {
      setAnimationDirection("backward");
      setCurrentStep((s) => s - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentStep]);

  // Redirection si provider introuvable
  useEffect(() => {
    console.log('%c⚡ [BookingRequest] useEffect: REDIRECT CHECK', 'background: #FF5722; color: white; padding: 2px 6px; border-radius: 3px;', {
      authLoading,
      providerLoading,
      hasProvider: !!provider,
      willRedirect: !authLoading && !providerLoading && !provider,
    });
    if (!authLoading && !providerLoading && !provider) {
      console.log('🔀 [BookingRequest] REDIRECTING TO / (no provider found)');
      navigate("/");
    }
  }, [provider, providerLoading, authLoading, navigate]);

  const prepareStandardizedData = (
    state: BookingFormData,
    p: Provider,
    currentUser: MinimalUser,
    eurTotalForDisplay: number,
    durationForDisplay: number
  ): {
    selectedProvider: Partial<Provider> & {
      id: string;
      type: "lawyer" | "expat";
    };
    bookingRequest: BookingRequestData;
  } => {
    const providerType: "lawyer" | "expat" =
      p.type === "lawyer" || p.role === "lawyer" ? "lawyer" : "expat";

    const selectedProvider: Partial<Provider> & {
      id: string;
      type: "lawyer" | "expat";
    } = {
      id: p.id,
      name: p.name,
      firstName: p.firstName,
      lastName: p.lastName,
      type: providerType,
      country: p.country,
      avatar: p.avatar,
      price: p.price,
      duration: p.duration,
      rating: p.rating,
      reviewCount: p.reviewCount,
      languages: p.languages,
      languagesSpoken: p.languagesSpoken,
      specialties: p.specialties,
      currentCountry: p.currentCountry,
      email: p.email,
      phone: p.phone,
    };

    const normalizedCountry =
      (state.currentCountry === "Autre"
        ? state.autrePays
        : state.currentCountry) ?? "N/A";

    // ✅ P0 FIX: Normaliser le téléphone en E.164 avant soumission
    // Gère tous les formats: 070000000, +33700000000, 0033700000000, etc.
    // Détecte automatiquement le pays depuis le numéro ou utilise FR par défaut
    let defaultCountry = 'FR';
    try {
      // Si le numéro a déjà un indicatif, extraire le pays pour la normalisation
      const parsed = parsePhoneNumberFromString(state.clientPhone);
      if (parsed?.country) {
        defaultCountry = parsed.country;
      }
    } catch {
      // Ignorer les erreurs, utiliser FR par défaut
    }

    const phoneResult = smartNormalizePhone(state.clientPhone, defaultCountry as any);

    // ⚠️ Si la normalisation échoue, utiliser le numéro tel quel (fallback)
    // L'utilisateur peut avoir un cas edge case ou vouloir forcer un format spécifique
    let finalPhone = state.clientPhone;

    if (phoneResult.ok && phoneResult.e164) {
      // ✅ Normalisation réussie, utiliser le E.164
      finalPhone = phoneResult.e164;
      console.log('[BookingRequest] ✅ Téléphone normalisé:', {
        input: state.clientPhone,
        output: phoneResult.e164,
      });
    } else {
      // ⚠️ Normalisation échouée, utiliser le numéro tel quel
      console.warn('[BookingRequest] ⚠️ Normalisation échouée, utilisation du numéro brut:', {
        input: state.clientPhone,
        reason: phoneResult.reason,
      });
      // Note: Le numéro sera quand même validé par RHF avant d'arriver ici
      // donc il devrait être au moins parseable
    }

    const bookingRequest: BookingRequestData = {
      clientPhone: finalPhone,
      clientId: currentUser?.uid || "",
      clientName:
        `${sanitizeInput(state.firstName)} ${sanitizeInput(state.lastName)}`.trim(),
      clientFirstName: sanitizeInput(state.firstName),
      clientLastName: sanitizeInput(state.lastName),
      clientNationality: sanitizeInput(state.nationality),
      clientCurrentCountry: sanitizeInput(normalizedCountry),
      providerId: selectedProvider.id,
      providerName: selectedProvider.name ?? "",
      providerType: selectedProvider.type,
      providerCountry: selectedProvider.country || "",
      providerAvatar: selectedProvider.avatar || "",
      providerRating: selectedProvider.rating,
      providerReviewCount: selectedProvider.reviewCount,
      providerLanguages: (selectedProvider.languages ||
        selectedProvider.languagesSpoken) as string[] | undefined,
      providerSpecialties: selectedProvider.specialties as string[] | undefined,
      title: sanitizeText(state.title, { trim: true }),
      description: sanitizeText(state.description, { trim: true }),
      clientLanguages: state.clientLanguages,
      clientLanguagesDetails: state.clientLanguages.map((code) => {
        const found = ALL_LANGS.find((l) => l.code === code);
        return { code, name: found?.name || code.toUpperCase() };
      }),
      price: eurTotalForDisplay,
      duration: durationForDisplay,
      status: "pending",
      serviceType: providerType === "lawyer" ? "lawyer_call" : "expat_call",
      ip: window.location.hostname,
      userAgent: navigator.userAgent,
      providerEmail: selectedProvider.email,
      providerPhone: selectedProvider.phone,
    };
    return { selectedProvider, bookingRequest };
  };

  const scrollToFirstIncomplete = () => {
    console.log('%c📜 [BookingRequest] scrollToFirstIncomplete() CALLED', 'background: #FF5722; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;');
    const v = validFlags;
    const pairs: Array<
      [boolean, React.MutableRefObject<HTMLDivElement | null>, string]
    > = [
      [!v.firstName, refFirstName, 'firstName'],
      [!v.lastName, refLastName, 'lastName'],
      [!v.currentCountry || !v.autrePays, refCountry, 'country'],
      [!v.title, refTitle, 'title'],
      [!v.description, refDesc, 'description'],
      [!v.langs || !v.sharedLang, refLangs, 'langs'],
      [!v.phone, refPhone, 'phone'],
      [!v.accept, refCGU, 'accept'],
    ];
    const found = pairs.find(([need]) => need);
    const target = found?.[1]?.current;
    console.log('📜 [BookingRequest] Scroll target:', {
      fieldName: found?.[2] || 'none',
      targetElement: target ? 'found' : 'null',
      validFlags: v,
    });
    if (target) {
      console.log('📜 [BookingRequest] SCROLLING TO:', found?.[2]);
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const onSubmit: SubmitHandler<BookingFormData> = async (data) => {
    console.log('%c🚀 [BookingRequest] FORM SUBMIT CALLED', 'background: #4CAF50; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold; font-size: 14px;');
    console.log('📋 [BookingRequest] Submit data:', data);
    console.log('📋 [BookingRequest] validFlags at submit:', validFlags);
    console.log('📋 [BookingRequest] hasLanguageMatchRealTime:', hasLanguageMatchRealTime);
    setFormError("");

    // BLOCAGE COMPLET: Pas de langue partagée = impossible de continuer
    // Le client doit modifier ses langues ou changer de prestataire
    if (!hasLanguageMatchRealTime) {
      try {
        await logLanguageMismatch({
          clientLanguages: data.clientLanguages,
          customLanguage: undefined,
          providerId: provider?.id || "",
          providerLanguages:
            provider?.languages || provider?.languagesSpoken || [],
          formData: {
            title: data.title,
            description: data.description,
            nationality: data.nationality,
            currentCountry:
              (data.currentCountry === "Autre"
                ? data.autrePays
                : data.currentCountry) ?? "N/A",
          },
          source: "booking_request_form",
        });
      } catch (error) {
        console.warn("logLanguageMismatch failed", error);
      }
      // Afficher le modal de blocage avec options
      setShowLangMismatchWarning(true);
      return;
    }

    // validation RHF complète
    const ok = await trigger();
    if (!ok || Object.values(validFlags).some((v) => !v)) {
      scrollToFirstIncomplete();
      return;
    }

    try {
      const eurTotalForDisplay = displayEUR;
      const durationForDisplay = displayDuration;

      const { selectedProvider, bookingRequest } = prepareStandardizedData(
        data,
        provider!,
        (user as MinimalUser) ?? null,
        eurTotalForDisplay,
        durationForDisplay
      );

      // 🔐 UID de l'utilisateur (juste pour contrôle local, plus envoyé au service)
      const uid = (user as MinimalUser)?.uid;
      if (!uid) {
        setFormError("Session expirée. Reconnectez-vous.");
        return;
      }

      // 👇 littéral 20 | 30 garanti (pas un number)
      const svcDuration: 20 | 30 = isLawyer ? 20 : 30;

      // Generate shared event_id for Pixel/CAPI deduplication
      const leadEventId = generateEventIdForType('lead');
      const metaIds = getMetaIdentifiers();

      // Track Meta Pixel Lead - demande de reservation soumise
      // Uses same eventID as will be stored in booking_request for CAPI deduplication
      trackMetaLead({
        content_name: 'booking_request_submitted',
        content_category: isLawyer ? 'lawyer' : 'expat',
        value: eurTotalForDisplay,
        currency: 'EUR',
        eventID: leadEventId,
      });

      // Track InitiateCheckout - debut du processus de paiement
      trackMetaInitiateCheckout({
        value: eurTotalForDisplay,
        currency: 'EUR',
        content_name: isLawyer ? 'lawyer_call' : 'expat_call',
        content_category: isLawyer ? 'lawyer' : 'expat',
        num_items: 1,
      });

      // Track Google Ads Lead
      trackGoogleAdsLead({
        value: eurTotalForDisplay,
        currency: 'EUR',
        content_name: 'booking_request_submitted',
        content_category: isLawyer ? 'lawyer' : 'expat',
      });

      // Track Google Ads BeginCheckout
      trackGoogleAdsBeginCheckout({
        value: eurTotalForDisplay,
        currency: 'EUR',
        content_name: isLawyer ? 'lawyer_call' : 'expat_call',
        content_category: isLawyer ? 'lawyer' : 'expat',
      });

      // Track Ad Attribution Lead (Firestore - pour dashboard admin)
      trackAdLead({
        contentName: 'booking_request_submitted',
        contentCategory: isLawyer ? 'lawyer' : 'expat',
        value: eurTotalForDisplay,
        providerId: selectedProvider.id,
        providerType: isLawyer ? 'lawyer' : 'expat',
      });

      // Track Ad Attribution InitiateCheckout (Firestore)
      trackAdInitiateCheckout({
        value: eurTotalForDisplay,
        currency: 'EUR',
        contentName: isLawyer ? 'lawyer_call' : 'expat_call',
        providerId: selectedProvider.id,
        providerType: isLawyer ? 'lawyer' : 'expat',
      });

      // Création du booking centralisée (sans clientId, avec svcDuration)
      // Include Meta identifiers for CAPI deduplication
      await createBookingRequest({
        // clientId retiré : dérivé côté service
        providerId: selectedProvider.id,
        serviceType: isLawyer ? "lawyer_call" : "expat_call",
        status: "pending",

        title: bookingRequest.title,
        description: bookingRequest.description,
        clientPhone: bookingRequest.clientPhone,
        price: bookingRequest.price,
        // ✅ on envoie le littéral `20 | 30`
        duration: svcDuration,
        clientLanguages: bookingRequest.clientLanguages,
        clientLanguagesDetails: bookingRequest.clientLanguagesDetails,
        providerName: bookingRequest.providerName,
        providerType: bookingRequest.providerType,
        providerCountry: bookingRequest.providerCountry,
        providerAvatar: bookingRequest.providerAvatar,
        providerRating: bookingRequest.providerRating,
        providerReviewCount: bookingRequest.providerReviewCount,
        providerLanguages: bookingRequest.providerLanguages,
        providerSpecialties: bookingRequest.providerSpecialties,
        clientName: bookingRequest.clientName,
        clientFirstName: bookingRequest.clientFirstName,
        clientLastName: bookingRequest.clientLastName,
        clientNationality: bookingRequest.clientNationality,
        clientCurrentCountry: bookingRequest.clientCurrentCountry,
        ip: bookingRequest.ip,
        userAgent: bookingRequest.userAgent,
        providerEmail: bookingRequest.providerEmail,
        providerPhone: bookingRequest.providerPhone,
        // Meta tracking identifiers for CAPI deduplication
        metaEventId: leadEventId,
        fbp: metaIds.fbp,
        fbc: metaIds.fbc,
        clientEmail: user?.email || undefined,
      });

      // Calcul serviceData pour checkout
      const selectedCurrency: Currency = detectUserCurrency();
      const roleForPricing: ServiceType = role;

      let svcAmount = 0;
      let svcDurationNumber: number = FALLBACK_TOTALS[roleForPricing].duration;
      let svcCommission = 0;
      let svcProviderAmount = 0;

      try {
        const p = await calculateServiceAmounts(
          roleForPricing,
          selectedCurrency
        );
        svcAmount = p.totalAmount;
        svcDurationNumber = p.duration;
        svcCommission = p.connectionFeeAmount;
        svcProviderAmount = p.providerAmount;
      } catch {
        const total =
          selectedCurrency === "usd"
            ? FALLBACK_TOTALS[roleForPricing].usd
            : FALLBACK_TOTALS[roleForPricing].eur;
        const fee =
          selectedCurrency === "usd"
            ? DEFAULT_SERVICE_FEES[roleForPricing].usd
            : DEFAULT_SERVICE_FEES[roleForPricing].eur;
        svcAmount = total;
        svcCommission = fee;
        svcProviderAmount = Math.max(0, Math.round((total - fee) * 100) / 100);
      }

      // ✅ P0 UX FIX: Ensure sessionStorage writes complete successfully before navigation
      // Stockage session pour CallCheckout (provider, phone, serviceData + bookingMeta)
      try {
        sessionStorage.setItem(
          "selectedProvider",
          JSON.stringify(selectedProvider)
        );
        sessionStorage.setItem("clientPhone", bookingRequest.clientPhone);

        // Sauvegarde complète du bookingRequest pour récupération en cas de retour arrière
        sessionStorage.setItem("bookingRequest", JSON.stringify(bookingRequest));

        const serviceData = {
          providerId: selectedProvider.id,
          serviceType:
            roleForPricing === "lawyer" ? "lawyer_call" : "expat_call",
          providerRole: roleForPricing,
          amount: svcAmount,
          duration: svcDurationNumber, // number pour l'UI de checkout
          clientPhone: bookingRequest.clientPhone,
          commissionAmount: svcCommission,
          providerAmount: svcProviderAmount,
          currency: selectedCurrency,
        };
        sessionStorage.setItem("serviceData", JSON.stringify(serviceData));

        // Résumé de la demande pour CallCheckout (utilisé pour notifier le prestataire)
        // P0 FIX: Include all booking form data for SMS notifications
        sessionStorage.setItem(
          "bookingMeta",
          JSON.stringify({
            title: (bookingRequest.title || "").toString().trim(),
            description: (bookingRequest.description || "").toString().trim(),
            country: bookingRequest.clientCurrentCountry || "",
            clientFirstName: bookingRequest.clientFirstName,
            clientNationality: bookingRequest.clientNationality || "",
            clientLanguages: bookingRequest.clientLanguages || [],
          })
        );

        // ✅ Verify critical data was saved before navigation
        const savedProvider = sessionStorage.getItem("selectedProvider");
        const savedServiceData = sessionStorage.getItem("serviceData");
        if (!savedProvider || !savedServiceData) {
          throw new Error("SESSION_STORAGE_WRITE_FAILED");
        }

        // ✅ Nettoyer les données wizard après soumission réussie
        sessionStorage.removeItem('wizardFilters');
        console.log('🔵 [BookingRequest] wizardFilters cleaned after successful submit');

        // Navigate only after successful write and verification
        navigate(`/call-checkout/${providerId}`);
      } catch (error) {
        console.error("Failed to save booking/session data", error);
        setFormError(intl.formatMessage({
          id: "bookingRequest.errors.sessionStorageFailed",
          defaultMessage: "Erreur de sauvegarde des données. Veuillez réessayer."
        }));
        // Note: isSubmitting from formState will auto-reset when onSubmit returns
        return;
      }
    } catch (err) {
      console.error("Submit error", err);

      // Gestion des erreurs spécifiques pour de meilleurs messages utilisateur
      const errorMessage = err instanceof Error ? err.message : "UNKNOWN";

      if (errorMessage === "SESSION_EXPIRED") {
        setFormError(intl.formatMessage({ id: "bookingRequest.errors.sessionExpired", defaultMessage: "Session expirée. Veuillez vous reconnecter." }));
      } else if (errorMessage === "NETWORK_TIMEOUT") {
        setFormError(intl.formatMessage({ id: "bookingRequest.errors.networkTimeout", defaultMessage: "La connexion a expiré. Vérifiez votre réseau et réessayez." }));
      } else if (errorMessage === "INVALID_DATA") {
        setFormError(intl.formatMessage({ id: "bookingRequest.errors.invalidData", defaultMessage: "Données invalides. Veuillez vérifier le formulaire." }));
      } else if (errorMessage.includes("permission-denied")) {
        setFormError(intl.formatMessage({ id: "bookingRequest.errors.permissionDenied", defaultMessage: "Accès refusé. Veuillez vous reconnecter." }));
      } else {
        setFormError(intl.formatMessage({ id: "bookingRequest.errors.generic", defaultMessage: "Une erreur est survenue. Veuillez réessayer." }));
      }
    }
  };

  // ===== RENDER =====
  if (providerLoading) {
    return (
      <Layout showFooter={false}>
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="flex items-center space-x-3 text-gray-700">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-700"></div>
            <span>{intl.formatMessage({ id: 'bookingRequest.loadingProvider' })}</span>
          </div>
        </div>
      </Layout>
    );
  }
  if (!provider) {
    return null;
  }

  // ===== AUTH PENDING: Show loader while user is being loaded after registration/login =====
  if (authPending && !user) {
    return (
      <Layout showFooter={false}>
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="flex flex-col items-center space-y-4 text-gray-700">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
            <span>{intl.formatMessage({ id: 'auth.loadingProfile', defaultMessage: 'Chargement de votre profil...' })}</span>
          </div>
        </div>
      </Layout>
    );
  }

  // ===== EMAIL-FIRST AUTH: Show auth form if not logged in =====
  if (!authLoading && !user && !authPending) {
    return (
      <Layout showFooter={false}>
        <div className={`min-h-screen bg-[linear-gradient(180deg,#fff7f7_0%,#ffffff_35%,#fff5f8_100%)] py-6 md:py-12 overflow-x-hidden w-full max-w-full box-border`}>
          {/* Header */}
          <header className="px-3 md:px-4 max-w-xl mx-auto mb-6">
            <div className="flex items-center gap-3 text-gray-700 mb-4">
              <button
                onClick={() => navigate(`/provider/${provider.id}`)}
                className="p-2.5 -ml-1 rounded-xl bg-gray-50 hover:bg-gray-100 active:scale-95 transition-all duration-200 touch-manipulation shadow-sm"
                aria-label="Retour"
              >
                <ArrowLeft size={22} className="text-gray-700" />
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg md:text-2xl font-bold text-gray-900">
                  {intl.formatMessage({ id: "bookingRequest.heroTitle", defaultMessage: "Réserver" })}
                </h1>
              </div>
            </div>

            {/* Provider card mini */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-red-200 bg-white flex-shrink-0">
                {provider.avatar ? (
                  <img src={provider.avatar} alt={provider.name || ""} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <User className="w-6 h-6 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{provider.name}</p>
                <p className="text-sm text-gray-500">{isLawyer ? "Avocat" : "Expatrié"} • {displayDuration} min</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-red-600">{displayEUR.toFixed(2)}€</p>
              </div>
            </div>
          </header>

          {/* Auth form */}
          <div className="max-w-xl mx-auto">
            <EmailFirstAuth
              onAuthSuccess={() => {
                // Signal that auth succeeded - prevents form from flashing while user loads from Firestore
                console.log('[BookingRequest] onAuthSuccess called, setting authPending=true');
                setAuthPending(true);
              }}
              login={login}
              loginWithGoogle={loginWithGoogle}
              register={register}
              intl={intl}
              isMobile={isMobile}
            />
          </div>
        </div>
      </Layout>
    );
  }

  const inputHas = <K extends keyof BookingFormData>(name: K) =>
    Boolean(errors[name]);

  // ===== MOBILE: New 2026 Wizard UX (one-field-per-screen) =====
  // Activated for mobile devices - desktop keeps existing multi-field layout
  if (isMobile && provider) {
    // Handler to submit from mobile wizard - bypasses desktop language validation
    const handleMobileSubmit = async (mobileData: MobileBookingFormData): Promise<void> => {
      console.log('%c📱 [BookingRequest] MOBILE SUBMIT CALLED', 'background: #9C27B0; color: white; padding: 4px 8px; border-radius: 3px;');
      console.log('📋 [BookingRequest] Mobile data:', mobileData);

      // Map mobile form data to existing BookingFormData format
      // Use pre-filled languages from wizard or provider's languages as fallback
      const clientLangs = mobileData.clientLanguages?.length > 0
        ? mobileData.clientLanguages
        : languagesSpoken.length > 0
        ? languagesSpoken.map(l => l.code)
        : provider?.languages || ['fr']; // Fallback to French if nothing else

      const data: BookingFormData = {
        firstName: mobileData.firstName,
        lastName: mobileData.lastName,
        nationality: mobileData.nationality || '',
        currentCountry: mobileData.currentCountry,
        autrePays: mobileData.autrePays,
        title: mobileData.title,
        description: mobileData.description,
        clientPhone: mobileData.clientPhone,
        acceptTerms: mobileData.acceptTerms,
        clientLanguages: clientLangs,
      };

      // Prepare booking data (same as desktop)
      const eurTotalForDisplay = displayEUR;
      const durationForDisplay = displayDuration;

      const { selectedProvider, bookingRequest } = prepareStandardizedData(
        data,
        provider,
        (user as MinimalUser) ?? null,
        eurTotalForDisplay,
        durationForDisplay
      );

      const uid = (user as MinimalUser)?.uid;
      if (!uid) {
        setFormError("Session expirée. Reconnectez-vous.");
        return;
      }

      const svcDuration: 20 | 30 = isLawyer ? 20 : 30;

      try {
        // Generate shared event_id for Pixel/CAPI deduplication
        const leadEventId = generateEventIdForType('lead');
        const metaIds = getMetaIdentifiers();

        // Track Meta Pixel Lead
        trackMetaLead({
          content_name: 'booking_request_submitted',
          content_category: isLawyer ? 'lawyer' : 'expat',
          value: eurTotalForDisplay,
          currency: 'EUR',
          eventID: leadEventId,
        });

        // Track InitiateCheckout
        trackMetaInitiateCheckout({
          value: eurTotalForDisplay,
          currency: 'EUR',
          content_name: isLawyer ? 'lawyer_call' : 'expat_call',
          content_category: isLawyer ? 'lawyer' : 'expat',
          num_items: 1,
        });

        // Track Google Ads
        trackGoogleAdsLead({
          value: eurTotalForDisplay,
          currency: 'EUR',
          content_name: 'booking_request_submitted',
          content_category: isLawyer ? 'lawyer' : 'expat',
        });
        trackGoogleAdsBeginCheckout({
          value: eurTotalForDisplay,
          currency: 'EUR',
          content_name: isLawyer ? 'lawyer_call' : 'expat_call',
          content_category: isLawyer ? 'lawyer' : 'expat',
        });

        // Track Ad Attribution
        trackAdLead({
          contentName: 'booking_request_submitted',
          contentCategory: isLawyer ? 'lawyer' : 'expat',
          value: eurTotalForDisplay,
          providerId: selectedProvider.id,
          providerType: isLawyer ? 'lawyer' : 'expat',
        });
        trackAdInitiateCheckout({
          value: eurTotalForDisplay,
          currency: 'EUR',
          contentName: isLawyer ? 'lawyer_call' : 'expat_call',
          providerId: selectedProvider.id,
          providerType: isLawyer ? 'lawyer' : 'expat',
        });

        // Create booking in Firestore
        await createBookingRequest({
          providerId: selectedProvider.id,
          serviceType: isLawyer ? "lawyer_call" : "expat_call",
          status: "pending",
          title: bookingRequest.title,
          description: bookingRequest.description,
          clientPhone: bookingRequest.clientPhone,
          price: bookingRequest.price,
          duration: svcDuration,
          clientLanguages: bookingRequest.clientLanguages,
          clientLanguagesDetails: bookingRequest.clientLanguagesDetails,
          providerName: bookingRequest.providerName,
          providerType: bookingRequest.providerType,
          providerCountry: bookingRequest.providerCountry,
          providerAvatar: bookingRequest.providerAvatar,
          providerRating: bookingRequest.providerRating,
          providerReviewCount: bookingRequest.providerReviewCount,
          providerLanguages: bookingRequest.providerLanguages,
          providerSpecialties: bookingRequest.providerSpecialties,
          clientName: bookingRequest.clientName,
          clientFirstName: bookingRequest.clientFirstName,
          clientLastName: bookingRequest.clientLastName,
          clientNationality: bookingRequest.clientNationality,
          clientCurrentCountry: bookingRequest.clientCurrentCountry,
          ip: bookingRequest.ip,
          userAgent: bookingRequest.userAgent,
          providerEmail: bookingRequest.providerEmail,
          providerPhone: bookingRequest.providerPhone,
          metaEventId: leadEventId,
          fbp: metaIds.fbp,
          fbc: metaIds.fbc,
          clientEmail: user?.email || undefined,
        });

        // Calculate service data for checkout
        const selectedCurrency: Currency = detectUserCurrency();
        const roleForPricing: ServiceType = role;

        let svcAmount = 0;
        let svcDurationNumber: number = FALLBACK_TOTALS[roleForPricing].duration;
        let svcCommission = 0;
        let svcProviderAmount = 0;

        try {
          const p = await calculateServiceAmounts(roleForPricing, selectedCurrency);
          svcAmount = p.totalAmount;
          svcDurationNumber = p.duration;
          svcCommission = p.connectionFeeAmount;
          svcProviderAmount = p.providerAmount;
        } catch {
          const total = selectedCurrency === "usd" ? FALLBACK_TOTALS[roleForPricing].usd : FALLBACK_TOTALS[roleForPricing].eur;
          const fee = selectedCurrency === "usd" ? DEFAULT_SERVICE_FEES[roleForPricing].usd : DEFAULT_SERVICE_FEES[roleForPricing].eur;
          svcAmount = total;
          svcCommission = fee;
          svcProviderAmount = Math.max(0, Math.round((total - fee) * 100) / 100);
        }

        // Save to sessionStorage
        sessionStorage.setItem("selectedProvider", JSON.stringify(selectedProvider));
        sessionStorage.setItem("clientPhone", bookingRequest.clientPhone);
        sessionStorage.setItem("bookingRequest", JSON.stringify(bookingRequest));

        const serviceData = {
          providerId: selectedProvider.id,
          serviceType: roleForPricing === "lawyer" ? "lawyer_call" : "expat_call",
          providerRole: roleForPricing,
          amount: svcAmount,
          duration: svcDurationNumber,
          clientPhone: bookingRequest.clientPhone,
          commissionAmount: svcCommission,
          providerAmount: svcProviderAmount,
          currency: selectedCurrency,
        };
        sessionStorage.setItem("serviceData", JSON.stringify(serviceData));

        sessionStorage.setItem("bookingMeta", JSON.stringify({
          title: (bookingRequest.title || "").toString().trim(),
          description: (bookingRequest.description || "").toString().trim(),
          country: bookingRequest.clientCurrentCountry || "",
          clientFirstName: bookingRequest.clientFirstName,
          clientLastName: bookingRequest.clientLastName,
          clientNationality: bookingRequest.clientNationality || "",
          clientLanguages: bookingRequest.clientLanguages || [],
        }));

        // Verify and clean up
        const savedProvider = sessionStorage.getItem("selectedProvider");
        const savedServiceData = sessionStorage.getItem("serviceData");
        if (!savedProvider || !savedServiceData) {
          throw new Error("SESSION_STORAGE_WRITE_FAILED");
        }

        sessionStorage.removeItem('wizardFilters');
        console.log('✅ [BookingRequest] Mobile submit success, navigating to checkout');

        // Navigate to checkout
        navigate(`/call-checkout/${providerId}`);

      } catch (err) {
        console.error("Mobile submit error", err);
        setFormError(intl.formatMessage({ id: "bookingRequest.errors.generic" }));
      }
    };

    return (
      <Layout showFooter={false}>
        {/* SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": ["WebPage", "Action"],
              name: intl.formatMessage({ id: "bookingRequest.metaTitle" }),
              description: intl.formatMessage({ id: "bookingRequest.metaDesc" }),
            }),
          }}
        />
        <MobileBookingProvider
          defaultValues={{
            firstName: getValues('firstName'),
            lastName: getValues('lastName'),
            nationality: getValues('nationality'),
            currentCountry: getValues('currentCountry'),
            autrePays: getValues('autrePays'),
            title: getValues('title'),
            description: getValues('description'),
            clientPhone: getValues('clientPhone'),
            acceptTerms: getValues('acceptTerms'),
            clientLanguages: languagesSpoken.map(l => l.code),
          }}
        >
          <MobileWizardInner
            provider={provider}
            isLawyer={isLawyer}
            displayEUR={displayEUR}
            displayDuration={displayDuration}
            onSubmit={handleMobileSubmit}
            onBack={() => navigate(`/provider/${provider.id}`)}
          />
        </MobileBookingProvider>
      </Layout>
    );
  }

  return (
    <Layout showFooter={false}>
      {/* SEO minimal */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": ["WebPage", "Action"],
            name: intl.formatMessage({ id: "bookingRequest.metaTitle" }),
            description: intl.formatMessage({ id: "bookingRequest.metaDesc" }),
          }),
        }}
      />

      <div className={`min-h-screen bg-[linear-gradient(180deg,#fff7f7_0%,#ffffff_35%,#fff5f8_100%)] py-3 md:py-8 overflow-x-hidden w-full max-w-full box-border ${isMobile ? 'pb-32' : 'pb-safe'}`}>
        {/* Hero / Title - Mobile optimized with glass-morphism 2026 */}
        <header className="px-3 md:px-4 max-w-5xl mx-auto mb-3 md:mb-6">
          {/* Mobile: Glass card header / Desktop: Standard */}
          <div className="md:bg-transparent bg-white/80 backdrop-blur-xl md:backdrop-blur-none rounded-2xl md:rounded-none p-3 md:p-0 shadow-sm md:shadow-none border border-white/50 md:border-0 mb-3 md:mb-0">
            <div className="flex items-center gap-3 text-gray-700">
              <button
                onClick={() => isMobile && currentStep > 1 ? goBackStep() : navigate(`/provider/${provider!.id}`)}
                className="p-2.5 -ml-1 rounded-xl bg-gray-50 md:bg-transparent hover:bg-gray-100 active:scale-95 transition-all duration-200 touch-manipulation shadow-sm md:shadow-none"
                aria-label="Retour"
              >
                <ArrowLeft size={22} className="text-gray-700" />
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg md:text-3xl font-black tracking-tight text-gray-900 truncate">
                  <span
                    className={`bg-gradient-to-r ${THEME.gradFrom} ${THEME.gradVia} ${THEME.gradTo} bg-clip-text text-transparent`}
                  >
                    <FormattedMessage id="bookingRequest.heroTitle" />
                  </span>
                </h1>
                <p className="hidden md:block text-sm text-gray-600 mt-1">
                  <FormattedMessage id="bookingRequest.heroSubtitle" />
                </p>
              </div>
            </div>
          </div>

          {/* Mobile: Step Indicator / Desktop: Progress bar */}
          {isMobile ? (
            <StepIndicator
              currentStep={currentStep}
              totalSteps={TOTAL_STEPS}
              stepLabels={stepLabels}
            />
          ) : (
            <div className="mb-2 md:mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs md:text-sm font-bold text-gray-700">
                  {intl.formatMessage({ id: "bookingRequest.progress" })}
                </span>
                <span className="text-xs md:text-sm font-bold text-red-600 tabular-nums bg-red-50 px-2 py-0.5 rounded-full md:bg-transparent md:px-0 md:py-0 md:rounded-none">
                  {formProgress}%
                </span>
              </div>
              <div className="w-full bg-gray-100 md:bg-gray-200 rounded-full h-2.5 overflow-hidden shadow-inner">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-red-500 via-orange-500 to-rose-500 transition-all duration-500 ease-out shadow-sm"
                  style={{ width: `${formProgress}%` }}
                />
              </div>
            </div>
          )}
        </header>

        {/* ===== MOBILE: Provider Card Compact ===== */}
        {isMobile && (
          <div className="px-3 max-w-5xl mx-auto">
            <ProviderCardCompact
              provider={provider}
              isExpanded={providerExpanded}
              onToggle={() => setProviderExpanded(!providerExpanded)}
              isLawyer={isLawyer}
              displayEUR={displayEUR}
              displayDuration={displayDuration}
              lang={lang}
              intl={intl}
            />
          </div>
        )}

        {/* ===== DESKTOP: Provider card (shown in sidebar on desktop) ===== */}
        {!isMobile && (
          <div className="hidden md:block max-w-5xl mx-auto px-4 mb-4">
            <div className="p-3 md:p-5 bg-white rounded-2xl shadow-lg border border-gray-100">
              {/* Desktop: Row layout */}
              <div className="flex md:flex-row md:items-start gap-3 md:gap-4">
                {/* Provider info row */}
                <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                  <div className="w-14 h-14 md:w-20 md:h-20 rounded-xl md:rounded-2xl overflow-hidden border-2 border-red-200 bg-white shadow-md flex-shrink-0 grid place-items-center">
                    {provider?.avatar ? (
                      <img
                        src={provider.avatar}
                        alt={`Photo de ${provider.name}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/default-avatar.png";
                        }}
                      />
                    ) : (
                      <img
                        src="/default-avatar.png"
                        alt="Avatar par défaut"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base md:text-xl font-extrabold text-gray-900 truncate max-w-[150px] md:max-w-none">
                        {provider?.name || "—"}
                      </h3>
                      <span
                        className={`inline-flex items-center px-1.5 md:px-2 py-0.5 rounded-full text-[10px] md:text-xs font-semibold whitespace-nowrap ${
                          isLawyer
                            ? "bg-blue-100 text-blue-800 border border-blue-200"
                            : "bg-green-100 text-green-800 border border-green-200"
                        }`}
                      >
                        {isLawyer ? "⚖️ Avocat" : "🌍 Expatrié"}
                      </span>
                    </div>
                    <div className="mt-0.5 md:mt-1 text-xs md:text-sm text-gray-700 flex items-center gap-1.5">
                      <span className="font-medium">📍</span>
                      <span className="truncate">{provider.country}</span>
                    </div>
                    {/* Languages */}
                    {!!provider?.languages?.length && (
                      <div className="flex mt-2 flex-wrap gap-1">
                        {(provider.languages || []).slice(0, 3).map((code, idx) => {
                          // Normaliser pour gérer les anciennes données
                          const normalizedCode = LanguageUtils.normalizeToCode(code);
                          const l = ALL_LANGS.find((x) => x.code === normalizedCode);
                          const label = l ? getLanguageLabel(l, lang) : code;
                          return (
                            <span
                              key={`${code}-${idx}`}
                              className="inline-block px-2 py-0.5 bg-blue-50 text-blue-800 text-xs rounded border border-blue-200"
                            >
                              {label}
                            </span>
                          );
                        })}
                        {(provider.languages || []).length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{(provider.languages || []).length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

              {/* Price card - Desktop version */}
              <div className="flex items-center justify-center flex-col bg-white rounded-xl p-4 border border-gray-200 min-w-[130px]">
                <div className="text-center">
                  <div className="text-3xl font-extrabold text-red-600">{displayEUR.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€</div>
                  <div className="text-sm text-gray-500">/ ${displayUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                <div className="flex flex-col gap-1 mt-1">
                  <div className="text-sm font-semibold text-gray-700">
                    ⏱️ {displayDuration} min
                  </div>
                  <div className="text-xs text-gray-500">
                    💳 {intl.formatMessage({ id: "bookingRequest.securePay" })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Form - Responsive: Mobile Wizard / Desktop Scroll */}
        <div className="max-w-5xl mx-auto px-3 md:px-4 w-full box-border">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-visible w-full max-w-full">
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="touch-manipulation w-full max-w-full overflow-visible">
              {/* ===== STEP 1: Personal Info (Mobile: Step 1 / Desktop: Always visible) ===== */}
              {(!isMobile || currentStep === 1) && (
              <section className={`p-4 md:p-6 ${isMobile ? 'step-enter' : ''}`}>
                <SectionHeader
                  icon={<MapPin className="w-5 h-5" />}
                  // title={t.personal}
                  title={intl.formatMessage({ id: "bookingRequest.personal" })}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Prénom */}
                  <div ref={refFirstName}>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                      {/* {t.fields.firstName}{" "} */}
                      {intl.formatMessage({
                        id: "bookingRequest.fields.firstName",
                      })}
                      <span className="text-red-500">*</span>
                    </label>
                    <Controller
                      control={control}
                      name="firstName"
                      rules={{
                        required: intl.formatMessage({
                          id: "bookingRequest.validators.firstName",
                        }),
                      }}
                      render={({ field }) => (
                        <input
                          {...field}
                          className={inputClass(inputHas("firstName"))}
                          placeholder={intl.formatMessage({
                            id: "bookingRequest.placeholders.firstName",
                          })}
                          maxLength={50}
                        />
                      )}
                    />
                    <FieldSuccess
                      show={!errors.firstName && Boolean(watch("firstName"))}
                    >
                      Parfait ! ✨
                    </FieldSuccess>
                    {errors.firstName && (
                      <p className="mt-1 text-sm text-red-600">
                        {String(errors.firstName.message)}
                      </p>
                    )}
                  </div>

                  {/* Nom */}
                  <div ref={refLastName}>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                      {/* {t.fields.lastName}{" "} */}
                      {intl.formatMessage({
                        id: "bookingRequest.fields.lastName",
                      })}
                      <span className="text-red-500">*</span>
                    </label>
                    <Controller
                      control={control}
                      name="lastName"
                      // rules={{ required: t.validators.lastName }}
                      rules={{
                        required: intl.formatMessage({
                          id: "bookingRequest.validators.lastName",
                        }),
                      }}
                      render={({ field }) => (
                        <input
                          {...field}
                          className={inputClass(inputHas("lastName"))}
                          placeholder={intl.formatMessage({
                            id: "bookingRequest.placeholders.lastName",
                          })}
                          maxLength={50}
                        />
                      )}
                    />
                    <FieldSuccess
                      show={!errors.lastName && Boolean(watch("lastName"))}
                    >
                      Parfait ! ✨
                    </FieldSuccess>
                    {errors.lastName && (
                      <p className="mt-1 text-sm text-red-600">
                        {String(errors.lastName.message)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Nationalité - Supprimée pour simplifier le parcours mobile */}
                {/* Le champ reste dans le formulaire mais n'est plus affiché ni requis */}

                {/* Pays d'intervention */}
                <div className="mt-4" ref={refCountry}>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">
                    {intl.formatMessage({
                      id: "bookingRequest.fields.currentCountry",
                    })}
                    <span className="text-red-500">*</span>
                  </label>
                  <Controller
                    control={control}
                    name="currentCountry"
                    rules={{
                      required: intl.formatMessage({
                        id: "bookingRequest.validators.currentCountry",
                      }),
                    }}
                    render={({ field }) => (
                      <select
                        {...field}
                        autoComplete="off"
                        className={inputClass(inputHas("currentCountry"))}
                        onChange={(e) => {
                          console.log('%c📝 [BookingRequest] COUNTRY SELECT CHANGED', 'background: #FF9800; color: black; padding: 2px 6px; border-radius: 3px;', {
                            previousValue: field.value,
                            newValue: e.target.value,
                            eventType: 'user-select',
                          });
                          field.onChange(e.target.value);
                          if (e.target.value !== "Autre")
                            setValue("autrePays", "");
                        }}
                      >
                        {/* <option value="">-- Sélectionnez un pays --</option> */}
                        <option value="">
                          {intl.formatMessage({
                            id: "bookingRequest.validators.selectCountry",
                          })}
                        </option>
                        {countries.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                        <option value="Autre">Autre</option>
                      </select>
                    )}
                  />
                  {errors.currentCountry && (
                    <p className="mt-1 text-sm text-red-600">
                      {String(errors.currentCountry.message)}
                    </p>
                  )}

                  {watch("currentCountry") === "Autre" && (
                    <div className="mt-3">
                      <Controller
                        control={control}
                        name="autrePays"
                        rules={{
                          validate: (v) =>
                            v?.trim()
                              ? true
                              : intl.formatMessage({
                                  id: "bookingRequest.validators.autrePays",
                                }),
                        }}
                        render={({ field }) => (
                          <input
                            {...field}
                            className={inputClass(Boolean(errors.autrePays))}
                            // placeholder={t.placeholders.otherCountry}
                            placeholder={intl.formatMessage({
                              id: "bookingRequest.placeholders.otherCountry",
                            })}
                          />
                        )}
                      />
                      {errors.autrePays && (
                        <p className="mt-1 text-sm text-red-600">
                          {String(errors.autrePays.message)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </section>
              )}

              {/* ===== STEP 2: Request Details (Mobile: Step 2 / Desktop: Always visible) ===== */}
              {(!isMobile || currentStep === 2) && (
              <section className={`p-4 md:p-6 border-t border-gray-100 ${isMobile ? 'step-enter' : ''}`}>
                <SectionHeader
                  icon={<Globe className="w-5 h-5" />}
                  title={intl.formatMessage({ id: "bookingRequest.request" })}
                />

                {/* Titre */}
                <div ref={refTitle}>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">
                    {/* {t.fields.title} */}
                    {intl.formatMessage({ id: "bookingRequest.fields.title" })}
                    <span className="text-red-500">*</span>
                  </label>
                  <Controller
                    control={control}
                    name="title"
                    rules={{
                      required: intl.formatMessage({
                        id: "bookingRequest.validators.title",
                      }),
                      validate: (v) =>
                        v.trim().length >= 10
                          ? true
                          : intl.formatMessage({
                              id: "bookingRequest.validators.title",
                            }),
                    }}
                    render={({ field }) => (
                      <input
                        {...field}
                        className={inputClass(Boolean(errors.title))}
                        placeholder={intl.formatMessage({
                          id: "bookingRequest.placeholders.title",
                        })}
                        maxLength={150}
                      />
                    )}
                  />
                  <div className="mt-1 text-xs text-gray-500">
                    💡
                    {intl.formatMessage({ id: "bookingRequest.hints.title" })}
                  </div>
                  <FieldSuccess
                    show={!errors.title && watch("title").trim().length >= 10}
                  >
                    C’est clair 👍
                  </FieldSuccess>
                  {errors.title && (
                    <p className="mt-1 text-sm text-red-600">
                      {String(errors.title.message)}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div className="mt-4" ref={refDesc}>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">
                    {/* {t.fields.description}{" "} */}
                    {intl.formatMessage({
                      id: "bookingRequest.fields.description",
                    })}
                    <span className="text-red-500">*</span>
                  </label>
                  <Controller
                    control={control}
                    name="description"
                    rules={{
                      required: intl.formatMessage({
                        id: "bookingRequest.validators.description",
                      }),
                      validate: (v) =>
                        v.trim().length >= 50
                          ? true
                          : intl.formatMessage({
                              id: "bookingRequest.validators.description",
                            }),
                    }}
                    render={({ field }) => (
                      <textarea
                        {...field}
                        rows={5}
                        onChange={(e) => {
                          console.log('%c📝 [BookingRequest] DESCRIPTION CHANGED', 'background: #9E9E9E; color: white; padding: 2px 6px; border-radius: 3px;', {
                            length: e.target.value.length,
                          });
                          field.onChange(e.target.value);
                        }}
                        className={`resize-none ${inputClass(Boolean(errors.description))}`}
                        placeholder={intl.formatMessage({
                          id: "bookingRequest.placeholders.description",
                        })}
                        maxLength={2000}
                      />
                    )}
                  />
                  <div className="mt-1 text-xs text-gray-500">
                    🔎
                    {intl.formatMessage({ id: "bookingRequest.hints.desc" })}
                  </div>
                  <FieldSuccess
                    show={
                      !errors.description &&
                      watch("description").trim().length >= 50
                    }
                  >
                    On y voit clair 👀
                  </FieldSuccess>
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600">
                      {String(errors.description.message)}
                    </p>
                  )}
                </div>
              </section>
              )}

              {/* ===== Languages Section ===== */}
              {/* Desktop: Always visible / Mobile: Visible si pas de match de langues (pour permettre modification) */}
              {(!isMobile || !hasLanguageMatchRealTime) && (
              <section
                className="p-4 md:p-6 border-t border-gray-100"
                ref={refLangs}
              >
                <SectionHeader
                  icon={<LanguagesIcon className="w-5 h-5" />}
                  title={intl.formatMessage({ id: "bookingRequest.languages" })}
                />

                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  🗣️
                  {/* {lang === "en" ? "Spoken languages" : "Langues parlées"}{" "} */}
                  {intl.formatMessage({ id: "bookingRequest.languagesSpoken" })}
                  <span className="text-red-500">*</span>
                </label>

                <Suspense
                  fallback={
                    <div className="h-10 rounded-lg bg-gray-100 animate-pulse" />
                  }
                >
                  <MultiLanguageSelect
                    value={languagesSpoken.map((l) => ({
                      value: l.code,
                      label: getLanguageLabel(l, lang),
                    }))}
                    onChange={(selected: MultiLanguageOption[]) => {
                      console.log('%c🗣️ [BookingRequest] LANGUAGES CHANGED', 'background: #FF9800; color: black; padding: 2px 6px; border-radius: 3px;', {
                        previousCount: languagesSpoken.length,
                        newSelection: selected,
                      });
                      const options = selected || [];
                      const selectedLangs = options
                        .map((opt) =>
                          ALL_LANGS.find(
                            (langItem) => langItem.code === opt.value
                          )
                        )
                        .filter((v): v is BookingLanguage => Boolean(v));
                      console.log('🗣️ [BookingRequest] Setting languages:', selectedLangs.map(l => l.code));
                      setLanguagesSpoken(selectedLangs);
                      setValue(
                        "clientLanguages",
                        selectedLangs.map((s) => s.code),
                        { shouldValidate: true }
                      );
                    }}
                    providerLanguages={
                      provider?.languages || provider?.languagesSpoken || []
                    }
                    highlightShared
                    locale={lang}
                  />
                </Suspense>

                {/* Erreur RHF pour le tableau des langues */}
                {(!watch("clientLanguages") ||
                  watch("clientLanguages").length === 0) && (
                  <p className="mt-2 text-sm text-red-600">
                    {/* {t.validators.languages} */}
                    {intl.formatMessage({
                      id: "bookingRequest.validators.languages",
                    })}
                  </p>
                )}

                {/* Compatibilité (normalisé vers codes ISO pour matching fiable) */}
                {languagesSpoken.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {(() => {
                      const providerLanguages =
                        provider?.languages || provider?.languagesSpoken || [];
                      // Normaliser vers codes ISO pour comparaison fiable (gère "Français" -> "fr")
                      const providerCodesNormalized = providerLanguages.map((pl) =>
                        LanguageUtils.normalizeToCode(pl).toLowerCase().trim()
                      );
                      const compatible = languagesSpoken.filter((l) =>
                        providerCodesNormalized.includes(
                          LanguageUtils.normalizeToCode(l.code).toLowerCase().trim()
                        )
                      );
                      const incompatible = languagesSpoken.filter(
                        (l) => !providerCodesNormalized.includes(
                          LanguageUtils.normalizeToCode(l.code).toLowerCase().trim()
                        )
                      );
                      return (
                        <>
                          {!!compatible.length && (
                            <div className="p-4 bg-green-50 border-l-4 border-green-400 rounded-xl">
                              <div className="flex">
                                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                                <div className="ml-3">
                                  <p className="text-green-900 font-semibold mb-2">
                                    ✅{" "}
                                    {intl.formatMessage({
                                      id: "bookingRequest.labels.compatible",
                                    })}{" "}
                                    :
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {compatible.map((l) => (
                                      <span
                                        key={l.code}
                                        className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full border border-green-200"
                                      >
                                        🌐 {getLanguageLabel(l, lang)}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          {!!incompatible.length && (
                            <div className="p-4 bg-red-50 border-l-4 border-red-400 rounded-xl">
                              <div className="flex">
                                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                                <div className="ml-3">
                                  <p className="text-red-700 font-semibold mb-2">
                                    ⚠️
                                    {intl.formatMessage({
                                      id: "bookingRequest.labels.incompatible",
                                    })}{" "}
                                    :
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {incompatible.map((l) => (
                                      <span
                                        key={l.code}
                                        className="inline-flex items-center px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full border border-red-200"
                                      >
                                        🌐 {getLanguageLabel(l, lang)}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}

                {languagesSpoken.length > 0 && !hasLanguageMatchRealTime && (
                  <div className="mt-3 p-4 bg-red-50 border-l-4 border-red-400 rounded-xl">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                      <div className="ml-3">
                        <p className="text-red-700 font-semibold">
                          🚫
                          {/* {t.labels.communicationImpossible} */}
                          {intl.formatMessage({
                            id: "bookingRequest.labels.communicationImpossible",
                          })}
                        </p>
                        <p className="text-red-600 text-sm mt-1">
                          {/* {t.labels.needShared} */}
                          {intl.formatMessage({
                            id: "bookingRequest.labels.needShared",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </section>
              )}

              {/* ===== STEP 3: Contact + Confirmation (Mobile: Step 3 / Desktop: Always visible) ===== */}
              {(!isMobile || currentStep === 3) && (
              <section
                className={`p-4 md:p-6 border-t border-gray-100 overflow-visible relative ${isMobile ? 'step-enter' : ''}`}
                ref={refPhone}
                style={{ zIndex: 50 }}
              >
                <SectionHeader
                  icon={<Phone className="w-5 h-5" />}
                  title={intl.formatMessage({ id: "bookingRequest.contact" })}
                />

                {/* Téléphone client via PhoneField (RHF) */}
                {/* <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone size={16} className="inline mr-1" /> {t.fields.phone}{" "}
                    <span className="text-red-500">*</span>
                  </label>

                  <Controller
                    control={control}
                    name="clientPhone"
                    rules={{
                      required: t.validators.phone,
                      validate: (v) => {
                        try {
                          const p = parsePhoneNumberFromString(v || "");
                          return p && p.isValid() ? true : t.validators.phone;
                        } catch {
                          return t.validators.phone;
                        }
                      },
                    }}
                    render={({ field }) => (
                      <PhoneField
                        name={field.name}
                        control={control}
                        label=""
                        required
                        defaultCountry="FR"
                      />
                    )}
                  />

                  <div className="mt-2 text-xs text-gray-600 flex items-center gap-1">
                    <Info className={`w-4 h-4 ${THEME.icon}`} /> {t.hints.phone}
                  </div>
                  {errors.clientPhone && (
                    <p className="mt-1 text-sm text-red-600">
                      {String(errors.clientPhone.message)}
                    </p>
                  )}
                  {Boolean(watch("clientPhone")) && (
                    <div className="mt-1 text-xs text-gray-500">
                      ➜ International:{" "}
                      <span className="font-mono">{watch("clientPhone")}</span>
                    </div>
                  )}
                  <div className="mt-2 text-sm text-gray-700">
                    ⏱️ <strong>{t.callTiming}</strong>
                  </div>
                </div> */}

                {/* Téléphone client avec sélecteur de pays */}
                <div className="relative overflow-visible" style={{ zIndex: 100 }}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone size={16} className="inline mr-1" />
                    {/* {t.fields.phone} */}
                    {intl.formatMessage({ id: "bookingRequest.fields.phone" })}
                    <span className="text-red-500">*</span>
                  </label>
                  <Controller
                    control={control}
                    name="clientPhone"
                    rules={{
                      required: intl.formatMessage({
                        id: "bookingRequest.validators.phone",
                      }),
                      validate: (v) => {
                        if (!v)
                          return intl.formatMessage({
                            id: "bookingRequest.validators.phone",
                          });
                        try {
                          const p = parsePhoneNumberFromString(v);
                          return p && p.isValid()
                            ? true
                            : intl.formatMessage({
                                id: "bookingRequest.validators.phone",
                              });
                        } catch {
                          return intl.formatMessage({
                            id: "bookingRequest.validators.phone",
                          });
                        }
                      },
                    }}
                    render={({ field }) => (
                      <IntlPhoneInput
                        value={field.value || ""}
                        onChange={(val: string) => {
                          console.log('%c📞 [BookingRequest] PHONE CHANGED', 'background: #FF9800; color: black; padding: 2px 6px; border-radius: 3px;', {
                            previousValue: field.value,
                            newValue: val,
                          });
                          field.onChange(val);
                        }}
                        defaultCountry="fr"
                        placeholder="+33 6 12 34 56 78"
                        className={errors.clientPhone ? "error" : ""}
                        name="clientPhone"
                      />
                    )}
                  />
                  <div className="mt-2 text-xs text-gray-600 flex items-center gap-1">
                    <Info className={`w-4 h-4 ${THEME.icon}`} />
                    {/* {t.hints.phone} */}
                    {intl.formatMessage({ id: "bookingRequest.hints.phone" })}
                  </div>
                  {errors.clientPhone && (
                    <p className="mt-1 text-sm text-red-600">
                      {String(errors.clientPhone.message)}
                    </p>
                  )}
                  {Boolean(watch("clientPhone")) && (
                    <div className="mt-1 text-xs text-gray-500">
                      International:{" "}
                      <span className="font-mono">{watch("clientPhone")}</span>
                    </div>
                  )}
                </div>

                {/* Reassurance message about payment authorization */}
                <div className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Shield className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-green-800 text-sm mb-1">
                        <FormattedMessage id="bookingRequest.paymentReassurance.title" defaultMessage="Paiement sécurisé" />
                      </h4>
                      <p className="text-sm text-green-700 leading-relaxed">
                        <FormattedMessage
                          id="bookingRequest.paymentReassurance"
                          defaultMessage="Il s'agit uniquement d'une demande d'autorisation. Votre carte ne sera débitée qu'après la mise en relation avec votre expert."
                        />
                      </p>
                    </div>
                  </div>
                </div>

              </section>
              )}

              {/* ===== Terms (Mobile: Part of Step 3 / Desktop: Always visible) ===== */}
              {(!isMobile || currentStep === 3) && (
              <section
                className={`p-4 md:p-6 border-t border-gray-100`}
                ref={refCGU}
              >
                <div className="bg-gray-50 rounded-xl p-3 md:p-5 border border-gray-200">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <Controller
                      control={control}
                      name="acceptTerms"
                      rules={{
                        validate: (v) =>
                          v
                            ? true
                            : intl.formatMessage({
                                id: "bookingRequest.validators.accept",
                              }),
                      }}
                      render={({ field }) => (
                        <input
                          id="acceptTerms"
                          type="checkbox"
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          className="h-6 w-6 min-w-[24px] mt-0.5 rounded border-gray-300 text-red-600 focus:ring-red-500 flex-shrink-0 cursor-pointer"
                          required
                        />
                      )}
                    />
                    <label
                      htmlFor="acceptTerms"
                      className="text-sm text-gray-700 leading-relaxed"
                    >
                      {/* {t.fields.accept} */}
                      {intl.formatMessage({
                        id: "bookingRequest.fields.accept",
                      })}
                      <Link
                        target="_blank"
                        to="/cgu-clients"
                        className="text-red-600 hover:text-red-700 underline font-medium"
                      >
                        {/* {t.cgu} */}
                        {intl.formatMessage({ id: "bookingRequest.cgu" })}
                      </Link>
                      {/* {t.fields.andConfirm} */}
                      {intl.formatMessage({
                        id: "bookingRequest.fields.andConfirm",
                      })}
                    </label>
                  </div>
                  {errors.acceptTerms && (
                    <p className="mt-2 text-sm text-red-600">
                      {String(errors.acceptTerms.message)}
                    </p>
                  )}
                </div>
              </section>
              )}

              {/* Erreurs globales - Shown on both mobile and desktop */}
              {formError && (
                <div className="px-4 md:px-6 pb-0">
                  <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-3 md:p-4">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="ml-3">
                        <p className="font-semibold text-red-800">
                          {intl.formatMessage({
                            id: "bookingRequest.errorsTitle",
                          })}
                        </p>
                        <p className="text-sm text-red-700 mt-1">{formError}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ===== DESKTOP CTA (hidden on mobile) ===== */}
              {!isMobile && (
              <div className="p-4 md:p-6 pb-6">
                {/* Trust badges */}
                <div className="flex items-center justify-center gap-4 mb-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <Shield size={14} className="text-green-500" />
                    <span>{intl.formatMessage({ id: "common.secure", defaultMessage: "Sécurisé" })}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-blue-500" />
                    <span>{intl.formatMessage({ id: "common.immediate", defaultMessage: "Immédiat" })}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Lock size={14} className="text-purple-500" />
                    <span>{intl.formatMessage({ id: "common.confidential", defaultMessage: "Confidentiel" })}</span>
                  </div>
                </div>

                <Button
                  type="submit"
                  loading={isSubmitting}
                  fullWidth
                  size="large"
                  className={`${
                    Object.values(validFlags).every(Boolean)
                      ? `bg-gradient-to-r ${THEME.button} hover:opacity-95 transform hover:scale-[1.01] active:scale-[0.98] shadow-lg shadow-red-500/25`
                      : "bg-gray-400 cursor-not-allowed"
                  } text-white font-bold py-4 sm:py-4 px-4 sm:px-8 rounded-2xl sm:rounded-xl transition-all duration-200 ease-out text-base sm:text-lg touch-manipulation min-h-[58px] sm:min-h-[56px]`}
                  disabled={
                    isSubmitting || !Object.values(validFlags).every(Boolean)
                  }
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-2 border-white border-t-transparent" />
                      <span className="text-sm sm:text-base">{intl.formatMessage({ id: 'bookingRequest.processing' })}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Euro size={20} className="flex-shrink-0" />
                      <span className="truncate">
                        {intl.formatMessage({ id: "bookingRequest.continuePay" })}
                      </span>
                      <span className="font-extrabold whitespace-nowrap">
                        {displayEUR.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
                      </span>
                    </div>
                  )}
                </Button>

                {!Object.values(validFlags).every(Boolean) && (
                  <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                    <p className="text-yellow-800 text-sm font-medium mb-2">
                      🔍{" "}
                      {/* {lang === "en"
                        ? "Missing to enable the button:"
                        : "Éléments manquants pour activer le bouton :"} */}
                      {intl.formatMessage({
                        id: "bookingRequest.missingElements",
                      })}
                    </p>
                    <div className="grid grid-cols-1 gap-1 text-xs text-yellow-700">
                      {/* {!validFlags.firstName && (
                        <div>• {t.validators.firstName}</div>
                      )}
                      {!validFlags.lastName && (
                        <div>• {t.validators.lastName}</div>
                      )}
                      {!validFlags.title && <div>• {t.validators.title}</div>}
                      {!validFlags.description && (
                        <div>• {t.validators.description}</div>
                      )}
                      {!validFlags.phone && <div>• {t.validators.phone}</div>}
                      {!validFlags.currentCountry && (
                        <div>• {t.validators.currentCountry}</div>
                      )}
                      {watch("currentCountry") === "Autre" &&
                        !validFlags.autrePays && (
                          <div>• {t.validators.otherCountry}</div>
                        )}
                      {!validFlags.langs && (
                        <div>• {t.validators.languages}</div>
                      )}
                      {!validFlags.sharedLang && (
                        <div>• {t.validators.langMismatch}</div>
                      )}
                      {!validFlags.accept && <div>• {t.validators.accept}</div>} */}

                      {!validFlags.firstName && (
                        <div>
                          • {intl.formatMessage({ id: "validators.firstName" })}
                        </div>
                      )}
                      {!validFlags.lastName && (
                        <div>
                          • {intl.formatMessage({ id: "validators.lastName" })}
                        </div>
                      )}
                      {!validFlags.title && (
                        <div>
                          • {intl.formatMessage({ id: "validators.title" })}
                        </div>
                      )}
                      {!validFlags.description && (
                        <div>
                          •{" "}
                          {intl.formatMessage({ id: "validators.description" })}
                        </div>
                      )}
                      {!validFlags.phone && (
                        <div>
                          • {intl.formatMessage({ id: "validators.phone" })}
                        </div>
                      )}
                      {!validFlags.currentCountry && (
                        <div>
                          •{" "}
                          {intl.formatMessage({
                            id: "validators.currentCountry",
                          })}
                        </div>
                      )}
                      {watch("currentCountry") === "Autre" &&
                        !validFlags.autrePays && (
                          <div>
                            •{" "}
                            {intl.formatMessage({
                              id: "validators.otherCountry",
                            })}
                          </div>
                        )}
                      {!validFlags.langs && (
                        <div>
                          • {intl.formatMessage({ id: "validators.languages" })}
                        </div>
                      )}
                      {!validFlags.sharedLang && (
                        <div>
                          •{" "}
                          {intl.formatMessage({
                            id: "validators.langMismatch",
                          })}
                        </div>
                      )}
                      {!validFlags.accept && (
                        <div>
                          • {intl.formatMessage({ id: "validators.accept" })}
                        </div>
                      )}
                    </div>
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={scrollToFirstIncomplete}
                        className="text-xs font-semibold underline text-gray-800"
                      >
                        {/* {lang === "en"
                          ? "Jump to first missing field"
                          : "Aller au premier champ manquant"} */}
                        {intl.formatMessage({
                          id: "bookingRequest.jumpToFirst",
                        })}
                      </button>
                    </div>
                  </div>
                )}

                <div className="text-center pt-4">
                  <p className="text-xs text-gray-500">
                    🔒
                    {intl.formatMessage({ id: "bookingRequest.securePay" })}
                    {" • "}
                    {intl.formatMessage({ id: "bookingRequest.callTiming" })}
                  </p>
                </div>
              </div>
              )}
            </form>
          </div>
        </div>

        {/* ===== MOBILE: Sticky CTA at bottom ===== */}
        {isMobile && (
          <StickyCTA
            currentStep={currentStep}
            totalSteps={TOTAL_STEPS}
            onNext={goNextStep}
            onBack={goBackStep}
            onSubmit={handleSubmit(onSubmit)}
            canProceed={canProceedToNext}
            isSubmitting={isSubmitting}
            price={displayEUR}
            intl={intl}
          />
        )}
      </div>

      {/* BLOCAGE - Modal pour langue non partagée (impossible de continuer) */}
      {showLangMismatchWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {intl.formatMessage({ id: "bookingRequest.langWarning.title", defaultMessage: "Communication impossible" })}
              </h3>
            </div>
            <p className="text-gray-600 mb-4">
              {intl.formatMessage({
                id: "bookingRequest.langWarning.blocked",
                defaultMessage: "Vous n'avez aucune langue en commun avec ce prestataire. Pour garantir une bonne communication, veuillez :"
              })}
            </p>
            <ul className="text-gray-600 mb-6 space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-blue-500">1.</span>
                {intl.formatMessage({
                  id: "bookingRequest.langWarning.option1",
                  defaultMessage: "Modifier vos langues parlées pour inclure une langue du prestataire"
                })}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">2.</span>
                {intl.formatMessage({
                  id: "bookingRequest.langWarning.option2",
                  defaultMessage: "Choisir un autre prestataire qui parle votre langue"
                })}
              </li>
            </ul>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  console.log('%c🔴 [BookingRequest] MODIFY LANGUAGES CLICKED (from mismatch modal)', 'background: #f44336; color: white; padding: 2px 6px; border-radius: 3px;');
                  setShowLangMismatchWarning(false);
                  // Scroll vers la section langues et forcer affichage mobile
                  if (refLangs.current) {
                    console.log('📜 [BookingRequest] Scrolling to languages section');
                    refLangs.current.scrollIntoView({ behavior: "smooth", block: "center" });
                  }
                }}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-medium hover:from-blue-600 hover:to-indigo-600 transition-colors flex items-center justify-center gap-2"
              >
                <LanguagesIcon className="w-5 h-5" />
                {intl.formatMessage({ id: "bookingRequest.langWarning.modifyLanguages", defaultMessage: "Modifier mes langues" })}
              </button>
              <button
                type="button"
                onClick={() => {
                  // Retour vers la page SOSCall pour changer de prestataire
                  navigate(getTranslatedRouteSlug("sos-call", lang));
                }}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                {intl.formatMessage({ id: "bookingRequest.langWarning.changeProvider", defaultMessage: "Changer de prestataire" })}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default BookingRequest;
