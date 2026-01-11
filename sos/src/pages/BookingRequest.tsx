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
import { useLocaleNavigate } from "../multilingual-system";
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
} from "lucide-react";

import { useForm, Controller, SubmitHandler } from "react-hook-form";

import Layout from "../components/layout/Layout";
import Button from "../components/common/Button";
import { useAuth } from "../contexts/AuthContext";
import { useApp } from "../contexts/AppContext";

import { logLanguageMismatch } from "../services/analytics";
import languages, { getLanguageLabel, languagesData, type Language as AppLanguage } from "../data/languages-spoken";
import { countriesData } from "../data/countries";

import { db } from "../config/firebase";
import { doc, onSnapshot, getDoc } from "firebase/firestore";

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
import { FormattedMessage, useIntl } from "react-intl";
import IntlPhoneInput from "@/components/forms-data/IntlPhoneInput";
import { trackMetaLead, trackMetaInitiateCheckout } from "@/utils/metaPixel";
import { trackAdLead, trackAdInitiateCheckout } from "@/services/adAttributionService";

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

const countries = [
  "Afghanistan",
  "South Africa",
  "Albania",
  "Algeria",
  "Germany",
  "Andorra",
  "Angola",
  "Antigua and Barbuda",
  "Saudi Arabia",
  "Argentina",
  "Armenia",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Bahamas",
  "Bahrain",
  "Bangladesh",
  "Barbados",
  "Belgium",
  "Belize",
  "Benin",
  "Bhutan",
  "Belarus",
  "Myanmar",
  "Bolivia",
  "Bosnia and Herzegovina",
  "Botswana",
  "Brazil",
  "Brunei",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Cape Verde",
  "Chile",
  "China",
  "Cyprus",
  "Colombia",
  "Comoros",
  "Congo",
  "Congo (DRC)",
  "North Korea",
  "South Korea",
  "Costa Rica",
  "Ivory Coast",
  "Croatia",
  "Cuba",
  "Denmark",
  "Djibouti",
  "Dominica",
  "Egypt",
  "United Arab Emirates",
  "Ecuador",
  "Eritrea",
  "Spain",
  "Estonia",
  "United States",
  "Ethiopia",
  "Fiji",
  "Finland",
  "France",
  "Gabon",
  "Gambia",
  "Georgia",
  "Ghana",
  "Greece",
  "Grenada",
  "Guatemala",
  "Guinea",
  "Guinea-Bissau",
  "Equatorial Guinea",
  "Guyana",
  "Haiti",
  "Honduras",
  "Hungary",
  "Cook Islands",
  "Marshall Islands",
  "Solomon Islands",
  "India",
  "Indonesia",
  "Iraq",
  "Iran",
  "Ireland",
  "Iceland",
  "Israel",
  "Italy",
  "Jamaica",
  "Japan",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kyrgyzstan",
  "Kiribati",
  "Kuwait",
  "Laos",
  "Lesotho",
  "Latvia",
  "Lebanon",
  "Liberia",
  "Libya",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "North Macedonia",
  "Madagascar",
  "Malaysia",
  "Malawi",
  "Maldives",
  "Mali",
  "Malta",
  "Morocco",
  "Mauritius",
  "Mauritania",
  "Mexico",
  "Micronesia",
  "Moldova",
  "Monaco",
  "Mongolia",
  "Montenegro",
  "Mozambique",
  "Namibia",
  "Nauru",
  "Nepal",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "Norway",
  "New Zealand",
  "Oman",
  "Uganda",
  "Uzbekistan",
  "Pakistan",
  "Palau",
  "Palestine",
  "Panama",
  "Papua New Guinea",
  "Paraguay",
  "Netherlands",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Central African Republic",
  "Dominican Republic",
  "Czech Republic",
  "Romania",
  "United Kingdom",
  "Russia",
  "Rwanda",
  "Saint Kitts and Nevis",
  "San Marino",
  "Saint Vincent and the Grenadines",
  "Saint Lucia",
  "El Salvador",
  "Samoa",
  "São Tomé and Príncipe",
  "Senegal",
  "Serbia",
  "Seychelles",
  "Sierra Leone",
  "Singapore",
  "Slovakia",
  "Slovenia",
  "Somalia",
  "Sudan",
  "South Sudan",
  "Sri Lanka",
  "Sweden",
  "Switzerland",
  "Suriname",
  "Syria",
  "Tajikistan",
  "Tanzania",
  "Chad",
  "Thailand",
  "East Timor",
  "Togo",
  "Tonga",
  "Trinidad and Tobago",
  "Tunisia",
  "Turkmenistan",
  "Turkey",
  "Tuvalu",
  "Ukraine",
  "Uruguay",
  "Vanuatu",
  "Vatican",
  "Venezuela",
  "Vietnam",
  "Yemen",
  "Zambia",
  "Zimbabwe",
];

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
  const navigate = useLocaleNavigate(); // ✅ P0 UX FIX: Use locale-aware navigation
  const { user, isLoading: authLoading } = useAuth();
  const { language } = useApp();
  const lang = (language as LangKey) || "fr";
  const t = I18N[lang];

  const [provider, setProvider] = useState<Provider | null>(null);
  const [providerLoading, setProviderLoading] = useState<boolean>(true);

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
    } catch (error) {
      console.error("Error loading active promo:", error);
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

  const watched = watch();
  const [languagesSpoken, setLanguagesSpoken] = useState<BookingLanguage[]>([]);
  const [hasLanguageMatchRealTime, setHasLanguageMatchRealTime] =
    useState(true);
  const [formError, setFormError] = useState("");
  // P1-3 FIX: État pour le warning de langue au lieu du blocage
  const [showLangMismatchWarning, setShowLangMismatchWarning] = useState(false);
  const [langMismatchAcknowledged, setLangMismatchAcknowledged] = useState(false);

  // Refs pour scroll ciblé (en cas d'erreur globale)
  const refFirstName = useRef<HTMLDivElement | null>(null);
  const refLastName = useRef<HTMLDivElement | null>(null);
  const refNationality = useRef<HTMLDivElement | null>(null);
  const refCountry = useRef<HTMLDivElement | null>(null);
  const refTitle = useRef<HTMLDivElement | null>(null);
  const refDesc = useRef<HTMLDivElement | null>(null);
  const refLangs = useRef<HTMLDivElement | null>(null);
  const refPhone = useRef<HTMLDivElement | null>(null);
  const refCGU = useRef<HTMLDivElement | null>(null);

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
    if (!authLoading && !user) {
      const currentUrl = `/booking-request/${providerId}`;
      navigate(`/login?redirect=${encodeURIComponent(currentUrl)}`, {
        replace: true,
      });
    }
  }, [user, authLoading, providerId, navigate]);

  // Lecture provider depuis sessionStorage
  const readProviderFromSession = useCallback((): Provider | null => {
    try {
      const saved = sessionStorage.getItem("selectedProvider");
      if (!saved) return null;
      const parsed = JSON.parse(saved) as Partial<Provider> & { id?: string };
      if (parsed && parsed.id && parsed.id === providerId) {
        return normalizeProvider(parsed as Partial<Provider> & { id: string });
      }
    } catch (error) {
      console.warn("Failed to read provider from sessionStorage", error);
    }
    return null;
  }, [providerId]);

  // Chargement live du provider
  useEffect(() => {
    let unsub: (() => void) | undefined;
    const boot = async () => {
      setProviderLoading(true);
      const fromSession = readProviderFromSession();
      if (fromSession) {
        setProvider(fromSession);
        setProviderLoading(false);
      }
      try {
        if (!providerId) {
          setProvider(null);
          setProviderLoading(false);
          return;
        }
        const ref = doc(db, "sos_profiles", providerId);
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
  }, [providerId, readProviderFromSession]);

  // Pre-fill form with wizard data from sessionStorage
  useEffect(() => {
    try {
      const wizardData = sessionStorage.getItem('wizardFilters');
      if (!wizardData) return;

      const { country, languages: wizardLanguages } = JSON.parse(wizardData) as {
        country: string;
        languages: string[];
        type: string;
      };

      // Map country code to country name in English
      if (country) {
        const countryData = countriesData.find(
          (c) => c.code.toLowerCase() === country.toLowerCase()
        );
        if (countryData) {
          // Check if the country name exists in the countries array
          const countryName = countryData.nameEn;
          if (countries.includes(countryName)) {
            setValue('currentCountry', countryName);
          }
        }
      }

      // Map language codes to BookingLanguage objects
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
        }
      }

      // Clear wizard data after use (optional - comment out to keep it)
      // sessionStorage.removeItem('wizardFilters');
    } catch (e) {
      console.warn('Failed to read wizard filters from sessionStorage', e);
    }
  }, [setValue]);

  // Matching live des langues
  useEffect(() => {
    if (!provider || (!provider.languages && !provider.languagesSpoken)) {
      setHasLanguageMatchRealTime(true);
      return;
    }
    const providerLanguages =
      provider.languages || provider.languagesSpoken || [];
    const clientCodes = languagesSpoken.map((l) => l.code);
    const hasMatch = providerLanguages.some((pl) => clientCodes.includes(pl));
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

  // Progression (RHF)
  const validFlags: Record<string, boolean> = useMemo(() => {
    const values = getValues();
    const hasTitle = values.title.trim().length >= 10;
    const hasDesc = values.description.trim().length >= 50;
    const hasFirst = values.firstName.trim().length > 0;
    const hasLast = values.lastName.trim().length > 0;
    const hasNat = values.nationality.trim().length > 0;
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
      nationality: hasNat,
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

  // Redirection si provider introuvable
  useEffect(() => {
    if (!authLoading && !providerLoading && !provider) navigate("/");
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

    const bookingRequest: BookingRequestData = {
      clientPhone: state.clientPhone,
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
    const v = validFlags;
    const pairs: Array<
      [boolean, React.MutableRefObject<HTMLDivElement | null>]
    > = [
      [!v.firstName, refFirstName],
      [!v.lastName, refLastName],
      [!v.nationality, refNationality],
      [!v.currentCountry || !v.autrePays, refCountry],
      [!v.title, refTitle],
      [!v.description, refDesc],
      [!v.langs || !v.sharedLang, refLangs],
      [!v.phone, refPhone],
      [!v.accept, refCGU],
    ];
    const target = pairs.find(([need]) => need)?.[1]?.current;
    if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const onSubmit: SubmitHandler<BookingFormData> = async (data) => {
    setFormError("");
    console.log(data, "data === in onSubmit");
    // return;

    // P1-3 FIX: Warning au lieu de blocage si pas de langue partagée
    // On log dans tous les cas, mais on laisse l'utilisateur continuer s'il confirme
    if (!hasLanguageMatchRealTime && !langMismatchAcknowledged) {
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
      // Afficher le warning au lieu de bloquer
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

      // Track Meta Pixel Lead - demande de reservation soumise
      trackMetaLead({
        content_name: 'booking_request_submitted',
        content_category: isLawyer ? 'lawyer' : 'expat',
        value: eurTotalForDisplay,
        currency: 'EUR',
      });

      // Track InitiateCheckout - debut du processus de paiement
      trackMetaInitiateCheckout({
        value: eurTotalForDisplay,
        currency: 'EUR',
        content_name: isLawyer ? 'lawyer_call' : 'expat_call',
        content_category: isLawyer ? 'lawyer' : 'expat',
        num_items: 1,
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
  if (!provider) return null;

  const inputHas = <K extends keyof BookingFormData>(name: K) =>
    Boolean(errors[name]);

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

      <div className="min-h-screen bg-[linear-gradient(180deg,#fff7f7_0%,#ffffff_35%,#fff5f8_100%)] py-3 sm:py-8 pb-safe overflow-x-hidden w-full max-w-[100vw] box-border">
        {/* Hero / Title - Mobile optimized with glass-morphism 2026 */}
        <header className="px-3 sm:px-4 max-w-3xl mx-auto mb-3 sm:mb-6">
          {/* Mobile: Glass card header / Desktop: Standard */}
          <div className="sm:bg-transparent bg-white/80 backdrop-blur-xl sm:backdrop-blur-none rounded-2xl sm:rounded-none p-3 sm:p-0 shadow-sm sm:shadow-none border border-white/50 sm:border-0 mb-3 sm:mb-0">
            <div className="flex items-center gap-3 text-gray-700">
              <button
                onClick={() => navigate(`/provider/${provider!.id}`)}
                className="p-2.5 -ml-1 rounded-xl bg-gray-50 sm:bg-transparent hover:bg-gray-100 active:scale-95 transition-all duration-200 touch-manipulation shadow-sm sm:shadow-none"
                aria-label="Retour"
              >
                <ArrowLeft size={22} className="text-gray-700" />
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-3xl font-black tracking-tight text-gray-900 truncate">
                  <span
                    className={`bg-gradient-to-r ${THEME.gradFrom} ${THEME.gradVia} ${THEME.gradTo} bg-clip-text text-transparent`}
                  >
                    <FormattedMessage id="bookingRequest.heroTitle" />
                  </span>
                </h1>
                <p className="hidden sm:block text-sm text-gray-600 mt-1">
                  <FormattedMessage id="bookingRequest.heroSubtitle" />
                </p>
              </div>
            </div>
          </div>

          {/* Progress bar - Mobile optimized with enhanced visual */}
          <div className="mb-2 sm:mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs sm:text-sm font-bold text-gray-700">
                {intl.formatMessage({ id: "bookingRequest.progress" })}
              </span>
              <span className="text-xs sm:text-sm font-bold text-red-600 tabular-nums bg-red-50 px-2 py-0.5 rounded-full sm:bg-transparent sm:px-0 sm:py-0 sm:rounded-none">
                {formProgress}%
              </span>
            </div>
            <div className="w-full bg-gray-100 sm:bg-gray-200 rounded-full h-2.5 overflow-hidden shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-500 via-orange-500 to-rose-500 transition-all duration-500 ease-out shadow-sm"
                style={{ width: `${formProgress}%` }}
              />
            </div>
          </div>
        </header>

        {/* Provider card - Mobile-first optimized */}
        <div className="max-w-3xl mx-auto px-3 sm:px-4 mb-4">
          <div className="p-3 sm:p-5 bg-white rounded-2xl shadow-lg border border-gray-100">
            {/* Mobile: Stack layout / Desktop: Row layout */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
              {/* Provider info row */}
              <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl overflow-hidden border-2 border-red-200 bg-white shadow-md flex-shrink-0 grid place-items-center">
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
                    <h3 className="text-base sm:text-xl font-extrabold text-gray-900 truncate max-w-[150px] sm:max-w-none">
                      {provider?.name || "—"}
                    </h3>
                    <span
                      className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold whitespace-nowrap ${
                        isLawyer
                          ? "bg-blue-100 text-blue-800 border border-blue-200"
                          : "bg-green-100 text-green-800 border border-green-200"
                      }`}
                    >
                      {isLawyer ? "⚖️ Avocat" : "🌍 Expatrié"}
                    </span>
                  </div>
                  <div className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-700 flex items-center gap-1.5">
                    <span className="font-medium">📍</span>
                    <span className="truncate">{provider.country}</span>
                  </div>
                  {/* Languages - Hidden on mobile, shown on desktop */}
                  {!!provider?.languages?.length && (
                    <div className="hidden sm:flex mt-2 flex-wrap gap-1">
                      {(provider.languages || []).slice(0, 3).map((code, idx) => {
                        const l = ALL_LANGS.find((x) => x.code === code);
                        const label = l ? getLanguageLabel(l, lang) : code.toUpperCase();
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

              {/* Price card - Full width on mobile */}
              <div className="flex items-center justify-between sm:justify-center sm:flex-col bg-gradient-to-r sm:bg-none from-red-50 to-orange-50 sm:bg-white rounded-xl p-3 sm:p-4 border border-red-100 sm:border-gray-200 sm:min-w-[130px]">
                <div className="flex items-baseline gap-1 sm:block sm:text-center">
                  <div className="text-xl sm:text-3xl font-extrabold text-red-600">{displayEUR.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€</div>
                  <div className="text-sm sm:text-base text-gray-500 sm:hidden">/ ${displayUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div className="hidden sm:block text-sm text-gray-500">/ ${displayUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                <div className="flex items-center gap-2 sm:flex-col sm:gap-1 sm:mt-1">
                  <div className="text-sm font-semibold text-gray-700 bg-white sm:bg-transparent px-2 py-0.5 rounded-full sm:rounded-none">
                    ⏱️ {displayDuration} min
                  </div>
                  <div className="text-xs text-gray-500 hidden sm:block">
                    💳 {intl.formatMessage({ id: "bookingRequest.securePay" })}
                  </div>
                </div>
              </div>
            </div>

            {/* Languages on mobile - Compact horizontal scroll */}
            {!!provider?.languages?.length && (
              <div className="sm:hidden mt-3 -mx-1 px-1 overflow-x-auto scrollbar-hide">
                <div className="flex gap-1.5 pb-1">
                  {(provider.languages || []).map((code, idx) => {
                    const l = ALL_LANGS.find((x) => x.code === code);
                    const label = l ? getLanguageLabel(l, lang) : code.toUpperCase();
                    return (
                      <span
                        key={`mobile-${code}-${idx}`}
                        className="inline-block px-2 py-1 bg-blue-50 text-blue-800 text-xs rounded-full border border-blue-200 whitespace-nowrap"
                      >
                        {label}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Form - Mobile optimized with overflow-visible for phone dropdown */}
        <div className="max-w-3xl mx-auto px-3 sm:px-4 w-full box-border">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-visible w-full max-w-full">
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="touch-manipulation w-full max-w-full overflow-visible">
              {/* Section Perso */}
              <section className="p-4 sm:p-6">
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
                          onChange={(e) =>
                            field.onChange(sanitizeText(e.target.value))
                          }
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
                          onChange={(e) =>
                            field.onChange(sanitizeText(e.target.value))
                          }
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

                {/* Nationalité */}
                <div className="mt-4" ref={refNationality}>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">
                    {/* {t.fields.nationality}{" "} */}
                    {intl.formatMessage({
                      id: "bookingRequest.fields.nationality",
                    })}
                    <span className="text-red-500">*</span>
                  </label>
                  <Controller
                    control={control}
                    name="nationality"
                    // rules={{ required: t.validators.nationality }}
                    rules={{
                      required: intl.formatMessage({
                        id: "bookingRequest.validators.nationality ",
                      }),
                    }}
                    render={({ field }) => (
                      <input
                        {...field}
                        onChange={(e) =>
                          field.onChange(sanitizeText(e.target.value))
                        }
                        className={inputClass(inputHas("nationality"))}
                        // placeholder={t.placeholders.nationality}
                        placeholder={intl.formatMessage({
                          id: "bookingRequest.placeholders.nationality",
                        })}
                      />
                    )}
                  />
                  {errors.nationality && (
                    <p className="mt-1 text-sm text-red-600">
                      {String(errors.nationality.message)}
                    </p>
                  )}
                </div>

                {/* Pays d'intervention */}
                <div className="mt-4" ref={refCountry}>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">
                    {/* {t.fields.currentCountry}{" "} */}
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
                        className={inputClass(inputHas("currentCountry"))}
                        onChange={(e) => {
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
                            onChange={(e) =>
                              field.onChange(sanitizeText(e.target.value))
                            }
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

              {/* Section Demande */}
              <section className="p-4 sm:p-6 border-t border-gray-100">
                <SectionHeader
                  icon={<Globe className="w-5 h-5" />}
                  // title={t.request}
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
                        onChange={(e) =>
                          field.onChange(sanitizeText(e.target.value))
                        }
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
                        onChange={(e) => field.onChange(e.target.value)}
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

              {/* Section Langues */}
              <section
                className="p-4 sm:p-6 border-t border-gray-100"
                ref={refLangs}
              >
                <SectionHeader
                  icon={<LanguagesIcon className="w-5 h-5" />}
                  // title={t.languages}
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
                      const options = selected || [];
                      const selectedLangs = options
                        .map((opt) =>
                          ALL_LANGS.find(
                            (langItem) => langItem.code === opt.value
                          )
                        )
                        .filter((v): v is BookingLanguage => Boolean(v));
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

                {/* Compatibilité */}
                {languagesSpoken.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {(() => {
                      const providerLanguages =
                        provider?.languages || provider?.languagesSpoken || [];
                      const compatible = languagesSpoken.filter((l) =>
                        providerLanguages.includes(l.code)
                      );
                      const incompatible = languagesSpoken.filter(
                        (l) => !providerLanguages.includes(l.code)
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

              {/* Section Contact (RHF + PhoneField) */}
              <section
                className="p-4 sm:p-6 border-t border-gray-100 overflow-visible relative"
                ref={refPhone}
                style={{ zIndex: 50 }}
              >
                <SectionHeader
                  icon={<Phone className="w-5 h-5" />}
                  // title={t.contact}
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
                        onChange={field.onChange}
                        defaultCountry="fr"
                        placeholder="+33 6 12 34 56 78"
                        className={inputClass(Boolean(errors.clientPhone))}
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

              </section>

              {/* CGU */}
              <section
                className="p-4 sm:p-6 border-t border-gray-100"
                ref={refCGU}
              >
                <div className="bg-gray-50 rounded-xl p-3 sm:p-5 border border-gray-200">
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

              {/* Erreurs globales */}
              {formError && (
                <div className="px-4 sm:px-6 pb-0">
                  <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-3 sm:p-4">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="ml-3">
                        <p className="font-semibold text-red-800">
                          {/* {t.errorsTitle} */}
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

              {/* CTA - Mobile optimized 2026 with trust badges */}
              <div className="p-4 sm:p-6 pb-6 sm:pb-6">
                {/* Trust badges - Mobile only */}
                <div className="flex sm:hidden items-center justify-center gap-4 mb-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <Shield size={14} className="text-green-500" />
                    <span>Sécurisé</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-blue-500" />
                    <span>Immédiat</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Lock size={14} className="text-purple-500" />
                    <span>Confidentiel</span>
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
                      {!validFlags.nationality && (
                        <div>• {t.validators.nationality}</div>
                      )}
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
                      {!validFlags.nationality && (
                        <div>
                          •{" "}
                          {intl.formatMessage({ id: "validators.nationality" })}
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
                    {/* 🔒 {t.securePay} • {t.callTiming} */}
                    🔒
                    {intl.formatMessage({ id: "bookingRequest.securePay" })}•
                    {intl.formatMessage({ id: "bookingRequest.callTiming" })}
                  </p>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* P1-3 FIX: Modal de warning pour langue non partagée */}
      {showLangMismatchWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {intl.formatMessage({ id: "bookingRequest.langWarning.title", defaultMessage: "Attention - Langues différentes" })}
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              {intl.formatMessage({
                id: "bookingRequest.langWarning.message",
                defaultMessage: "Vous n'avez pas de langue en commun avec ce prestataire. La communication pourrait être difficile. Voulez-vous continuer ?"
              })}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowLangMismatchWarning(false)}
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                {intl.formatMessage({ id: "common.cancel", defaultMessage: "Annuler" })}
              </button>
              <button
                type="button"
                onClick={() => {
                  setLangMismatchAcknowledged(true);
                  setShowLangMismatchWarning(false);
                  // Re-soumettre le formulaire
                  handleSubmit(onSubmit)();
                }}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-medium hover:from-red-600 hover:to-orange-600 transition-colors"
              >
                {intl.formatMessage({ id: "bookingRequest.langWarning.continue", defaultMessage: "Continuer quand même" })}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default BookingRequest;
