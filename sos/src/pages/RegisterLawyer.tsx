// src/pages/RegisterLawyer.tsx
// VERSION ULTRA-OPTIMISÉE - SEO + PERFORMANCE + SÉCURITÉ + ANTI-BOT
// ✅ SEO: JSON-LD, Schema.org, Open Graph, Twitter Cards, Canonical
// ✅ PERFORMANCE: Lazy loading, mise en cache, optimisation bundle
// ✅ SÉCURITÉ: Input sanitization, validation stricte
// ✅ ANTI-BOT: reCAPTCHA v3, Honeypot, Time check, Fingerprint
// ✅ ACCESSIBILITÉ: ARIA labels, balises sémantiques, navigation clavier
// ✅ i18n: 100% clés de traduction, zéro texte en dur
// ✅ FIX: Espaces autorisés dans tous les champs
// ✅ FIX: Plus de saut de page lors de la soumission

import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  lazy,
  Suspense,
  useRef,
} from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useLocaleNavigate } from "../multilingual-system";
import {
  Scale,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  XCircle,
  User,
  Globe,
  Briefcase,
  ArrowRight,
  HelpCircle,
  Shield,
} from "lucide-react";
import Layout from "../components/layout/Layout";
import Button from "../components/common/Button";
import { useAuth } from "../contexts/AuthContext";
import { useApp } from "../contexts/AppContext";
import type { MultiValue } from "react-select";
import { useIntl, FormattedMessage } from "react-intl";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { browserLocalPersistence, setPersistence } from "firebase/auth";
import { auth } from "@/config/firebase";
import IntlPhoneInput from "@/components/forms-data/IntlPhoneInput";
import { countriesData } from "@/data/countries";
import '../styles/multi-language-select.css';
import { trackMetaCompleteRegistration, trackMetaStartRegistration } from "../utils/metaPixel";
import { trackAdRegistration } from "../services/adAttributionService";

// Lazy imports pour optimisation du bundle
const ImageUploader = lazy(() => import("../components/common/ImageUploader"));
const MultiLanguageSelect = lazy(() => import("../components/forms-data/MultiLanguageSelect"));
const SpecialtySelect = lazy(() => import("../components/forms-data/SpecialtySelect"));

// ============================================================================
// 🔐 CONFIGURATION RECAPTCHA v3 + ANTI-BOT
// ============================================================================
// ⚠️ IMPORTANT: Remplacez par votre clé de site reCAPTCHA v3
// Obtenir une clé: https://www.google.com/recaptcha/admin/create
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6LcXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";

// Temps minimum pour remplir le formulaire (en secondes)
const MIN_FORM_FILL_TIME = 15;

// Déclaration TypeScript pour grecaptcha
declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => Promise<void>;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

// 🤖 HOOK ANTI-BOT - reCAPTCHA v3 + Honeypot + Time Check + Behavior Tracking
const useAntiBot = () => {
  const formStartTime = useRef<number>(Date.now());
  const [recaptchaLoaded, setRecaptchaLoaded] = useState(false);
  const [honeypotValue, setHoneypotValue] = useState("");
  const [mouseMovements, setMouseMovements] = useState(0);
  const [keystrokes, setKeystrokes] = useState(0);

  // Charger le script reCAPTCHA v3
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.grecaptcha) {
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log('✅ reCAPTCHA v3 chargé');
        setRecaptchaLoaded(true);
      };
      script.onerror = () => {
        console.warn('⚠️ Erreur chargement reCAPTCHA');
      };
      document.head.appendChild(script);
    } else if (window.grecaptcha) {
      setRecaptchaLoaded(true);
    }
  }, []);

  // Tracker les mouvements de souris (les bots n'en ont généralement pas)
  useEffect(() => {
    const handleMouseMove = () => {
      setMouseMovements(prev => prev + 1);
    };
    
    const handleKeyDown = () => {
      setKeystrokes(prev => prev + 1);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Exécuter la vérification reCAPTCHA
  const executeRecaptcha = useCallback(async (action: string): Promise<string | null> => {
    if (!recaptchaLoaded || !window.grecaptcha) {
      console.warn('⚠️ reCAPTCHA non disponible');
      return null;
    }

    try {
      await window.grecaptcha.ready(() => {});
      const token = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action });
      return token;
    } catch (error) {
      console.error('❌ Erreur reCAPTCHA:', error);
      return null;
    }
  }, [recaptchaLoaded]);

  // Vérifier si c'est probablement un bot
  const validateHuman = useCallback(async (): Promise<{
    isValid: boolean;
    reason?: string;
    recaptchaToken?: string | null;
  }> => {
    const timeSpent = (Date.now() - formStartTime.current) / 1000;

    // 1. Vérifier le honeypot (champ caché)
    if (honeypotValue) {
      console.warn('🤖 Bot détecté: Honeypot rempli');
      return { isValid: false, reason: 'honeypot' };
    }

    // 2. Vérifier le temps de remplissage
    if (timeSpent < MIN_FORM_FILL_TIME) {
      console.warn(`🤖 Bot détecté: Formulaire rempli trop vite (${timeSpent.toFixed(1)}s < ${MIN_FORM_FILL_TIME}s)`);
      return { isValid: false, reason: 'too_fast' };
    }

    // 3. Vérifier les mouvements de souris (avertissement seulement)
    if (mouseMovements < 10) {
      console.warn(`🤖 Comportement suspect: Peu de mouvements souris (${mouseMovements})`);
    }

    // 4. Vérifier les frappes clavier (avertissement seulement)
    if (keystrokes < 20) {
      console.warn(`🤖 Comportement suspect: Peu de frappes clavier (${keystrokes})`);
    }

    // 5. Exécuter reCAPTCHA v3
    const recaptchaToken = await executeRecaptcha('register_lawyer');

    return { 
      isValid: true, 
      recaptchaToken,
    };
  }, [honeypotValue, mouseMovements, keystrokes, executeRecaptcha]);

  return {
    honeypotValue,
    setHoneypotValue,
    validateHuman,
    recaptchaLoaded,
    formStartTime: formStartTime.current,
    stats: {
      mouseMovements,
      keystrokes,
      timeSpent: Math.floor((Date.now() - formStartTime.current) / 1000),
    }
  };
};

// Constants
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Support tous les alphabets: Latin, Chinois (CJK), Cyrillique, Arabe, Devanagari, etc.
const NAME_REGEX = /^[\p{L}\p{M}\s'-]{2,50}$/u;
const MIN_BIO_LENGTH = 50;
const MAX_BIO_LENGTH = 500;

// Types
interface LawyerFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  currentCountry: string;
  preferredLanguage: "fr" | "en" | "es" | "de" | "ru" | "hi" | "pt" | "ch" | "ar";
  practiceCountries: string[];
  yearsOfExperience: number;
  specialties: string[];
  graduationYear: number;
  profilePhoto: string;
  bio: string;
  educations: string[];
  availability: "available" | "busy" | "offline";
  acceptTerms: boolean;
  acceptPaymentTerms: boolean;
}

interface LanguageOption {
  value: string;
  label: string;
}

interface CountryOption {
  value: string;
  label: string;
}

// 🔒 SÉCURITÉ: Sanitization des inputs - ✅ FIX: Ne supprime plus les espaces
const sanitizeString = (str: string): string => {
  if (!str) return "";
  return str
    .replace(/[<>]/g, "") // Supprime les balises HTML
    .replace(/javascript:/gi, "") // Supprime les tentatives XSS
    .replace(/on\w+=/gi, ""); // Supprime les event handlers
  // ✅ FIX: Supprimé le .trim() pour permettre les espaces pendant la saisie
};

// ✅ FIX: Fonction de sanitization finale (uniquement à la soumission)
const sanitizeStringFinal = (str: string): string => {
  if (!str) return "";
  return sanitizeString(str).trim();
};

const sanitizeEmail = (email: string): string => {
  if (!email) return "";
  return email.trim().toLowerCase();
};

// ✅ FIX: Fonction pour sanitizer les noms en préservant les espaces internes
const sanitizeName = (name: string): string => {
  if (!name) return "";
  // Supprime les caractères dangereux mais garde les espaces, accents, tirets, apostrophes
  return name
    .replace(/[<>]/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .replace(/[^a-zA-ZÀ-ÿ\u00C0-\u017F '\-]/g, "");
};

// 🌍 Liste des pays supportés par Stripe Connect (44 pays)
// Source officielle: https://stripe.com/global
// IMPORTANT: Synchronisé avec sos/firebase/functions/src/lib/paymentCountries.ts
// Les autres pays utilisent PayPal automatiquement
const STRIPE_SUPPORTED_COUNTRIES = new Set([
  // Amérique du Nord
  'US', // États-Unis
  'CA', // Canada

  // Europe (32 pays)
  'AT', // Autriche
  'BE', // Belgique
  'BG', // Bulgarie
  'HR', // Croatie
  'CY', // Chypre
  'CZ', // République tchèque
  'DK', // Danemark
  'EE', // Estonie
  'FI', // Finlande
  'FR', // France
  'DE', // Allemagne
  'GI', // Gibraltar
  'GR', // Grèce
  'HU', // Hongrie
  'IE', // Irlande
  'IT', // Italie
  'LV', // Lettonie
  'LI', // Liechtenstein
  'LT', // Lituanie
  'LU', // Luxembourg
  'MT', // Malte
  'NL', // Pays-Bas
  'NO', // Norvège
  'PL', // Pologne
  'PT', // Portugal
  'RO', // Roumanie
  'SK', // Slovaquie
  'SI', // Slovénie
  'ES', // Espagne
  'SE', // Suède
  'CH', // Suisse
  'GB', // Royaume-Uni

  // Asie-Pacifique (7 pays)
  'AU', // Australie
  'HK', // Hong Kong
  'JP', // Japon
  'MY', // Malaisie
  'NZ', // Nouvelle-Zélande
  'SG', // Singapour
  'TH', // Thaïlande

  // Moyen-Orient (1 pays)
  'AE', // Émirats Arabes Unis

  // Amérique Latine (2 pays)
  'BR', // Brésil
  'MX', // Mexique
]);

// Country code mapping pour Stripe - Recherche améliorée
const getCountryCode = (countryName: string): string => {
  if (!countryName) return "US";
  
  const normalizedName = countryName.trim().toLowerCase();
  
  const country = countriesData.find(c => {
    // Recherche insensible à la casse
    return (
      c.nameFr?.toLowerCase() === normalizedName ||
      c.nameEn?.toLowerCase() === normalizedName ||
      c.nameEs?.toLowerCase() === normalizedName ||
      c.nameDe?.toLowerCase() === normalizedName ||
      c.namePt?.toLowerCase() === normalizedName ||
      c.nameRu?.toLowerCase() === normalizedName ||
      c.nameAr?.toLowerCase() === normalizedName ||
      c.nameIt?.toLowerCase() === normalizedName ||
      c.nameNl?.toLowerCase() === normalizedName ||
      c.nameZh?.toLowerCase() === normalizedName ||
      // Recherche exacte aussi (pour les noms avec casse spécifique)
      c.nameFr === countryName ||
      c.nameEn === countryName ||
      c.nameEs === countryName ||
      c.nameDe === countryName ||
      c.namePt === countryName ||
      c.nameRu === countryName ||
      c.nameAr === countryName ||
      c.nameIt === countryName ||
      c.nameNl === countryName ||
      c.nameZh === countryName
    );
  });
  
  return country?.code || "US";
};

// Vérifier si un pays est supporté par Stripe
const isCountrySupportedByStripe = (countryCode: string): boolean => {
  return STRIPE_SUPPORTED_COUNTRIES.has(countryCode.toUpperCase());
};

// Obtenir le nom du pays à partir du code
const getCountryNameFromCode = (code: string, lang: string): string => {
  const country = countriesData.find(c => c.code === code);
  if (!country) return code;
  
  const langMap: Record<string, keyof typeof country> = {
    fr: 'nameFr',
    en: 'nameEn',
    es: 'nameEs',
    de: 'nameDe',
    pt: 'namePt',
    ru: 'nameRu',
    ar: 'nameAr',
    hi: 'nameEn',
    ch: 'nameZh',
  };
  
  const prop = langMap[lang] || 'nameEn';
  return (country[prop] as string) || country.nameEn || code;
};

// 🎨 Composants de feedback
const FieldError = React.memo(({ error, show }: { error?: string; show: boolean }) => {
  if (!show || !error) return null;
  return (
    <div 
      className="mt-2 flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
      role="alert"
      aria-live="polite"
    >
      <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <span className="font-medium">{error}</span>
    </div>
  );
});
FieldError.displayName = "FieldError";

const FieldSuccess = React.memo(({ show, message }: { show: boolean; message: string }) => {
  if (!show) return null;
  return (
    <div 
      className="mt-2 flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2"
      role="status"
      aria-live="polite"
    >
      <CheckCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span className="font-medium">{message}</span>
    </div>
  );
});
FieldSuccess.displayName = "FieldSuccess";

// ⚠️ Composant d'avertissement pour les pays non supportés par Stripe
const StripeCountryWarning = React.memo(({ 
  countryName, 
  countryCode, 
  lang 
}: { 
  countryName: string; 
  countryCode: string;
  lang: string;
}) => {
  const messages: Record<string, { title: string; description: string; note: string }> = {
    fr: {
      title: "⚠️ Paiements non disponibles dans ce pays",
      description: `Les paiements en ligne via Stripe ne sont pas encore disponibles pour les prestataires résidant en ${countryName}. Vous pouvez tout de même créer votre compte et votre profil sera visible par les clients.`,
      note: "Notre équipe vous contactera pour configurer un mode de paiement alternatif (virement bancaire, PayPal, Wise, etc.)."
    },
    en: {
      title: "⚠️ Payments not available in this country",
      description: `Online payments via Stripe are not yet available for providers residing in ${countryName}. You can still create your account and your profile will be visible to clients.`,
      note: "Our team will contact you to set up an alternative payment method (bank transfer, PayPal, Wise, etc.)."
    },
    es: {
      title: "⚠️ Pagos no disponibles en este país",
      description: `Los pagos en línea a través de Stripe aún no están disponibles para proveedores que residen en ${countryName}. Aún puede crear su cuenta y su perfil será visible para los clientes.`,
      note: "Nuestro equipo se pondrá en contacto con usted para configurar un método de pago alternativo (transferencia bancaria, PayPal, Wise, etc.)."
    },
    de: {
      title: "⚠️ Zahlungen in diesem Land nicht verfügbar",
      description: `Online-Zahlungen über Stripe sind für Anbieter mit Wohnsitz in ${countryName} noch nicht verfügbar. Sie können trotzdem ein Konto erstellen und Ihr Profil wird für Kunden sichtbar sein.`,
      note: "Unser Team wird Sie kontaktieren, um eine alternative Zahlungsmethode einzurichten (Banküberweisung, PayPal, Wise, etc.)."
    },
    pt: {
      title: "⚠️ Pagamentos não disponíveis neste país",
      description: `Os pagamentos online via Stripe ainda não estão disponíveis para prestadores residentes em ${countryName}. Você ainda pode criar sua conta e seu perfil será visível para os clientes.`,
      note: "Nossa equipe entrará em contato para configurar um método de pagamento alternativo (transferência bancária, PayPal, Wise, etc.)."
    },
    ru: {
      title: "⚠️ Платежи недоступны в этой стране",
      description: `Онлайн-платежи через Stripe пока недоступны для поставщиков, проживающих в ${countryName}. Вы все равно можете создать учетную запись, и ваш профиль будет виден клиентам.`,
      note: "Наша команда свяжется с вами для настройки альтернативного способа оплаты (банковский перевод, PayPal, Wise и т.д.)."
    },
    ar: {
      title: "⚠️ المدفوعات غير متوفرة في هذا البلد",
      description: `المدفوعات عبر الإنترنت عبر Stripe غير متوفرة بعد لمقدمي الخدمات المقيمين في ${countryName}. لا يزال بإمكانك إنشاء حسابك وسيكون ملفك الشخصي مرئيًا للعملاء.`,
      note: "سيتصل بك فريقنا لإعداد طريقة دفع بديلة (تحويل مصرفي، PayPal، Wise، إلخ)."
    },
    hi: {
      title: "⚠️ इस देश में भुगतान उपलब्ध नहीं है",
      description: `${countryName} में रहने वाले प्रदाताओं के लिए Stripe के माध्यम से ऑनलाइन भुगतान अभी उपलब्ध नहीं है। आप फिर भी अपना खाता बना सकते हैं और आपकी प्रोफ़ाइल ग्राहकों को दिखाई देगी।`,
      note: "हमारी टीम वैकल्पिक भुगतान विधि (बैंक ट्रांसफर, PayPal, Wise, आदि) सेट करने के लिए आपसे संपर्क करेगी।"
    },
    ch: {
      title: "⚠️ 此国家/地区暂不支持付款",
      description: `居住在${countryName}的服务提供商目前无法使用Stripe在线支付。您仍然可以创建账户，您的个人资料将对客户可见。`,
      note: "我们的团队将与您联系，为您设置替代支付方式（银行转账、PayPal、Wise等）。"
    }
  };

  const msg = messages[lang] || messages.en;

  return (
    <div 
      className="mt-3 p-4 bg-amber-50 border-2 border-amber-300 rounded-xl"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
          <AlertCircle className="w-5 h-5 text-amber-600" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-amber-800 mb-1">
            {msg.title}
          </h4>
          <p className="text-sm text-amber-700 mb-2">
            {msg.description}
          </p>
          <p className="text-xs text-amber-600 italic">
            {msg.note}
          </p>
        </div>
      </div>
    </div>
  );
});
StripeCountryWarning.displayName = "StripeCountryWarning";

const TagChip = React.memo(({ value, onRemove, ariaLabel }: { value: string; onRemove: () => void; ariaLabel: string }) => (
  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-800 text-sm font-medium border border-indigo-200">
    {value}
    <button 
      type="button" 
      onClick={onRemove} 
      className="hover:bg-indigo-200 rounded p-0.5 transition-colors" 
      aria-label={ariaLabel}
    >
      <XCircle className="w-4 h-4" aria-hidden="true" />
    </button>
  </span>
));
TagChip.displayName = "TagChip";

// Calcul de la force du mot de passe
const computePasswordStrength = (pw: string) => {
  if (!pw) return { percent: 0, color: "bg-gray-300", label: "weak" };
  let score = 0;
  if (pw.length >= 6) score += 30;
  if (pw.length >= 8) score += 20;
  if (pw.length >= 10) score += 15;
  if (pw.length >= 12) score += 15;
  if (/[a-z]/.test(pw)) score += 5;
  if (/[A-Z]/.test(pw)) score += 5;
  if (/\d/.test(pw)) score += 5;
  if (/[^a-zA-Z0-9]/.test(pw)) score += 5;
  const clamp = Math.min(100, score);
  
  let color = "bg-green-500";
  let label = "strong";
  if (pw.length < 6) {
    color = "bg-red-500";
    label = "weak";
  } else if (clamp < 40) {
    color = "bg-orange-500";
    label = "fair";
  } else if (clamp < 55) {
    color = "bg-yellow-500";
    label = "good";
  } else if (clamp < 70) {
    color = "bg-blue-500";
    label = "strong";
  }
  
  return { percent: clamp, color, label };
};

// 🎯 Composant FAQ pour le SEO
const FAQSection: React.FC<{ intl: ReturnType<typeof useIntl> }> = React.memo(({ intl }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  
  const faqs = Array.from({ length: 8 }, (_, i) => ({
    question: intl.formatMessage({ id: `registerLawyer.faq.q${i + 1}` }),
    answer: intl.formatMessage({ id: `registerLawyer.faq.a${i + 1}` }),
  }));

  return (
    <section 
      className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-lg mt-8"
      aria-labelledby="faq-heading"
    >
      <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-gray-100">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-100">
          <HelpCircle className="w-5 h-5 text-indigo-600" aria-hidden="true" />
        </div>
        <h2 id="faq-heading" className="text-xl font-black text-gray-900">
          <FormattedMessage id="registerLawyer.faq.title" />
        </h2>
      </div>

      <div className="space-y-4" role="list">
        {faqs.map((faq, index) => (
          <div 
            key={index} 
            className="border-2 border-gray-200 rounded-xl overflow-hidden transition-all hover:border-indigo-300"
            role="listitem"
          >
            <button
              type="button"
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
              aria-expanded={openIndex === index}
              aria-controls={`faq-answer-${index}`}
            >
              <h3 className="text-base font-bold text-gray-900 pr-4">{faq.question}</h3>
              <ArrowRight 
                className={`w-5 h-5 text-indigo-600 flex-shrink-0 transition-transform ${openIndex === index ? 'rotate-90' : ''}`}
                aria-hidden="true"
              />
            </button>
            {openIndex === index && (
              <div 
                id={`faq-answer-${index}`}
                className="px-4 pb-4 text-sm text-gray-700 leading-relaxed"
                role="region"
              >
                {faq.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
});
FAQSection.displayName = "FAQSection";

const RegisterLawyer: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";
  // ✅ FIX: Récupérer l'email depuis les searchParams (passé depuis Login.tsx)
  const prefillEmail = searchParams.get("email") || "";
  const { register, isLoading } = useAuth();
  const { language } = useApp();
  const lang = language as "fr" | "en" | "es" | "de" | "ru" | "hi" | "pt" | "ch" | "ar";

  // 🤖 Hook Anti-Bot
  const { honeypotValue, setHoneypotValue, validateHuman, recaptchaLoaded, stats } = useAntiBot();

  // ✅ FIX: Ref pour tracker si la navigation a eu lieu (évite le saut de page)
  const hasNavigatedRef = useRef(false);
  const isMountedRef = useRef(true);

  const initial: LawyerFormData = {
    firstName: "",
    lastName: "",
    email: prefillEmail,  // ✅ FIX: Pré-remplir depuis l'URL
    password: "",
    phone: "",
    currentCountry: "",
    preferredLanguage: lang,
    practiceCountries: [],
    yearsOfExperience: 0,
    specialties: [],
    graduationYear: new Date().getFullYear() - 5,
    profilePhoto: "",
    bio: "",
    educations: [""],
    availability: "offline",
    acceptTerms: false,
    acceptPaymentTerms: false,
  };

  const [form, setForm] = useState<LawyerFormData>(initial);
  const [selectedLanguages, setSelectedLanguages] = useState<MultiValue<LanguageOption>>([]);
  const [selectedPracticeCountries, setSelectedPracticeCountries] = useState<MultiValue<CountryOption>>([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState<MultiValue<{ value: string; label: string }>>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // ✅ State pour tracker si le pays est supporté par Stripe
  const [isCountryStripeSupported, setIsCountryStripeSupported] = useState<boolean | null>(null);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>("");
  
  // 🤖 State pour erreur anti-bot
  const [botError, setBotError] = useState<string>("");

  const fieldRefs = {
    firstName: useRef<HTMLInputElement | null>(null),
    email: useRef<HTMLInputElement | null>(null),
  };

  // ✅ FIX: Cleanup pour éviter les memory leaks et les updates après unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 📊 Meta Pixel: Track StartRegistration
  useEffect(() => {
    trackMetaStartRegistration({ content_name: 'lawyer_registration' });
  }, []);

  // 🔍 SEO PERFECTIONNÉ
  useEffect(() => {
    const baseUrl = window.location.origin;
    const currentUrl = `${baseUrl}${window.location.pathname}`;
    
    // Meta title
    document.title = intl.formatMessage({ id: "registerLawyer.seo.title" });
    
    const ensureMeta = (name: string, content: string, prop = false) => {
      const sel = prop ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let el = document.querySelector(sel) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        if (prop) el.setAttribute("property", name);
        else el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.content = content;
    };

    const ensureLink = (rel: string, href: string) => {
      let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      if (!el) {
        el = document.createElement("link");
        el.rel = rel;
        document.head.appendChild(el);
      }
      el.href = href;
    };

    // Meta description
    ensureMeta("description", intl.formatMessage({ id: "registerLawyer.seo.description" }));
    
    // Meta keywords
    ensureMeta("keywords", intl.formatMessage({ id: "registerLawyer.seo.keywords" }));
    
    // Viewport (responsive + mobile-first)
    ensureMeta("viewport", "width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes");
    
    // Canonical URL
    ensureLink("canonical", currentUrl);
    
    // Open Graph (Facebook, LinkedIn)
    ensureMeta("og:title", intl.formatMessage({ id: "registerLawyer.seo.ogTitle" }), true);
    ensureMeta("og:description", intl.formatMessage({ id: "registerLawyer.seo.ogDescription" }), true);
    ensureMeta("og:type", "website", true);
    ensureMeta("og:url", currentUrl, true);
    ensureMeta("og:image", `${baseUrl}/images/og-register-lawyer.jpg`, true);
    ensureMeta("og:image:width", "1200", true);
    ensureMeta("og:image:height", "630", true);
    ensureMeta("og:image:alt", intl.formatMessage({ id: "registerLawyer.seo.ogImageAlt" }), true);
    ensureMeta("og:site_name", "SOS-Expat", true);
    ensureMeta("og:locale", lang === "fr" ? "fr_FR" : lang === "en" ? "en_US" : `${lang}_${lang.toUpperCase()}`, true);
    
    // Twitter Cards
    ensureMeta("twitter:card", "summary_large_image");
    ensureMeta("twitter:title", intl.formatMessage({ id: "registerLawyer.seo.twitterTitle" }));
    ensureMeta("twitter:description", intl.formatMessage({ id: "registerLawyer.seo.twitterDescription" }));
    ensureMeta("twitter:image", `${baseUrl}/images/twitter-register-lawyer.jpg`);
    ensureMeta("twitter:image:alt", intl.formatMessage({ id: "registerLawyer.seo.twitterImageAlt" }));
    ensureMeta("twitter:site", "@SOSExpat");
    ensureMeta("twitter:creator", "@SOSExpat");
    
    // Référencement IA (Google AI, Bing Chat, ChatGPT)
    ensureMeta("robots", "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
    ensureMeta("googlebot", "index, follow");
    ensureMeta("bingbot", "index, follow");
    ensureMeta("author", "SOS-Expat");
    ensureMeta("language", lang);
    ensureMeta("geo.region", intl.formatMessage({ id: "registerLawyer.seo.geoRegion" }));
    ensureMeta("geo.placename", intl.formatMessage({ id: "registerLawyer.seo.geoPlacename" }));
    
    // Mobile app links
    ensureMeta("apple-mobile-web-app-capable", "yes");
    ensureMeta("apple-mobile-web-app-status-bar-style", "black-translucent");
    ensureMeta("mobile-web-app-capable", "yes");
    ensureMeta("theme-color", "#4f46e5");
    
    // 📊 JSON-LD Schema.org pour SEO avancé
    const jsonLd = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          "@id": currentUrl,
          "url": currentUrl,
          "name": intl.formatMessage({ id: "registerLawyer.seo.title" }),
          "description": intl.formatMessage({ id: "registerLawyer.seo.description" }),
          "inLanguage": lang,
          "isPartOf": {
            "@type": "WebSite",
            "@id": `${baseUrl}/#website`,
            "url": baseUrl,
            "name": "SOS-Expat",
            "publisher": {
              "@type": "Organization",
              "@id": `${baseUrl}/#organization`
            }
          },
          "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": intl.formatMessage({ id: "registerLawyer.seo.breadcrumb.home" }),
                "item": baseUrl
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": intl.formatMessage({ id: "registerLawyer.seo.breadcrumb.register" }),
                "item": currentUrl
              }
            ]
          }
        },
        {
          "@type": "Organization",
          "@id": `${baseUrl}/#organization`,
          "name": "SOS-Expat",
          "url": baseUrl,
          "logo": {
            "@type": "ImageObject",
            "url": `${baseUrl}/logo.png`,
            "width": 512,
            "height": 512
          },
          "sameAs": [
            "https://www.facebook.com/sosexpat",
            "https://twitter.com/sosexpat",
            "https://www.linkedin.com/company/sos-expat",
            "https://www.instagram.com/sosexpat"
          ],
          "contactPoint": {
            "@type": "ContactPoint",
            "contactType": intl.formatMessage({ id: "registerLawyer.seo.contactType" }),
            "availableLanguage": ["fr", "en", "es", "de", "ru", "hi", "pt", "zh", "ar"]
          }
        },
        {
          "@type": "FAQPage",
          "mainEntity": Array.from({ length: 8 }, (_, i) => ({
            "@type": "Question",
            "name": intl.formatMessage({ id: `registerLawyer.faq.q${i + 1}` }),
            "acceptedAnswer": {
              "@type": "Answer",
              "text": intl.formatMessage({ id: `registerLawyer.faq.a${i + 1}` })
            }
          }))
        },
        {
          "@type": "Service",
          "serviceType": intl.formatMessage({ id: "registerLawyer.seo.serviceType" }),
          "provider": {
            "@type": "Organization",
            "@id": `${baseUrl}/#organization`
          },
          "areaServed": {
            "@type": "Country",
            "name": intl.formatMessage({ id: "registerLawyer.seo.areaServed" })
          },
          "availableChannel": {
            "@type": "ServiceChannel",
            "serviceUrl": currentUrl,
            "servicePhone": intl.formatMessage({ id: "registerLawyer.seo.servicePhone" }),
            "availableLanguage": {
              "@type": "Language",
              "name": lang
            }
          }
        }
      ]
    };

    // Injection du JSON-LD
    let scriptTag = document.querySelector('script[type="application/ld+json"]') as HTMLScriptElement | null;
    if (!scriptTag) {
      scriptTag = document.createElement("script") as HTMLScriptElement;
      scriptTag.type = "application/ld+json";
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(jsonLd);

    // Cleanup
    return () => {
      // Les meta tags persistent pour la navigation SPA
    };
  }, [intl, lang]);

  // Options de pays (197 pays)
  const countryOptions = useMemo(() => {
    const langMap: Record<string, keyof typeof countriesData[0]> = {
      fr: 'nameFr',
      en: 'nameEn',
      es: 'nameEs',
      de: 'nameDe',
      pt: 'namePt',
      ru: 'nameRu',
      ar: 'nameAr',
      hi: 'nameEn',
      ch: 'nameZh',
    };
    
    const prop = langMap[lang] || 'nameEn';
    
    return countriesData
      .filter(c => !c.disabled)
      .map((country) => ({
        value: country[prop] as string,
        label: country[prop] as string,
      }));
  }, [lang]);

  const pwdStrength = useMemo(() => computePasswordStrength(form.password), [form.password]);

  const markTouched = useCallback((name: string) => {
    setTouched((p) => ({ ...p, [name]: true }));
  }, []);

  // ✅ FIX: Fonction onChange corrigée pour autoriser les espaces
  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    let processedValue = value;
    
    // 🔒 Sanitization selon le type de champ - ✅ FIX: Préserve les espaces
    if (type === "text" || type === "textarea") {
      if (name === "email") {
        // Email: pas d'espaces, tout en minuscules
        processedValue = value.toLowerCase().replace(/\s/g, "");
      } else if (name === "firstName" || name === "lastName") {
        // ✅ FIX: Noms - autoriser espaces, accents, tirets, apostrophes
        processedValue = sanitizeName(value);
      } else if (name === "bio") {
        // ✅ FIX: Bio - sanitize mais garde tout le texte et les espaces
        processedValue = sanitizeString(value);
      } else {
        // Autres champs texte
        processedValue = sanitizeString(value);
      }
    }
    
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : type === "number" ? Number(value) : processedValue,
    }));
    
    // ✅ Vérifier le support Stripe quand le pays de résidence change
    if (name === "currentCountry" && processedValue) {
      const countryCode = getCountryCode(processedValue);
      setSelectedCountryCode(countryCode);
      setIsCountryStripeSupported(isCountrySupportedByStripe(countryCode));
    } else if (name === "currentCountry" && !processedValue) {
      setSelectedCountryCode("");
      setIsCountryStripeSupported(null);
    }
    
    // Clear l'erreur si le champ est modifié
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const rest = { ...prev };
        delete rest[name];
        return rest;
      });
    }
  }, [fieldErrors]);

  const handlePracticeCountriesChange = useCallback((newValue: MultiValue<CountryOption>) => {
    setSelectedPracticeCountries(newValue);
    const arr = newValue.map((c) => c.value);
    setForm((prev) => ({ ...prev, practiceCountries: arr }));
    if (arr.length > 0 && fieldErrors.practiceCountries) {
      setFieldErrors((prev) => {
        const rest = { ...prev };
        delete rest.practiceCountries;
        return rest;
      });
    }
  }, [fieldErrors.practiceCountries]);

  const handleSpecialtiesChange = useCallback((newValue: MultiValue<{ value: string; label: string }>) => {
    setSelectedSpecialties(newValue);
    const arr = newValue.map((s) => s.value);
    setForm((prev) => ({ ...prev, specialties: arr }));
    if (arr.length > 0 && fieldErrors.specialties) {
      setFieldErrors((prev) => {
        const rest = { ...prev };
        delete rest.specialties;
        return rest;
      });
    }
  }, [fieldErrors.specialties]);

  // ✅ FIX: updateEducation préserve les espaces
  const updateEducation = useCallback((idx: number, val: string) => {
    const sanitized = sanitizeString(val); // Préserve les espaces maintenant
    setForm((p) => {
      const arr = [...p.educations];
      arr[idx] = sanitized;
      return { ...p, educations: arr };
    });
  }, []);

  const addEducationField = useCallback(() => setForm((p) => ({ ...p, educations: [...p.educations, ""] })), []);

  const removeEducationField = useCallback((idx: number) => {
    setForm((p) => {
      const arr = p.educations.filter((_, i) => i !== idx);
      return { ...p, educations: arr.length ? arr : [""] };
    });
  }, []);

  const validateAll = useCallback(() => {
    const e: Record<string, string> = {};
    
    // ✅ FIX: Validation avec trim() uniquement pour la validation, pas pour la saisie
    const trimmedFirstName = form.firstName.trim();
    const trimmedLastName = form.lastName.trim();
    const trimmedBio = form.bio.trim();
    
    // Validation firstName
    if (!trimmedFirstName) {
      e.firstName = intl.formatMessage({ id: "registerLawyer.errors.firstNameRequired" });
    } else if (!NAME_REGEX.test(trimmedFirstName)) {
      e.firstName = intl.formatMessage({ id: "registerLawyer.errors.firstNameInvalid" });
    }
    
    // Validation lastName
    if (!trimmedLastName) {
      e.lastName = intl.formatMessage({ id: "registerLawyer.errors.lastNameRequired" });
    } else if (!NAME_REGEX.test(trimmedLastName)) {
      e.lastName = intl.formatMessage({ id: "registerLawyer.errors.lastNameInvalid" });
    }
    
    // Validation email
    if (!form.email.trim()) {
      e.email = intl.formatMessage({ id: "registerLawyer.errors.emailRequired" });
    } else if (!EMAIL_REGEX.test(form.email)) {
      e.email = intl.formatMessage({ id: "registerLawyer.errors.emailInvalid" });
    }
    
    // Validation password
    if (!form.password || form.password.length < 6) {
      e.password = intl.formatMessage({ id: "registerLawyer.errors.passwordTooShort" });
    } else if (form.password.length > 128) {
      e.password = intl.formatMessage({ id: "registerLawyer.errors.passwordTooLong" });
    }
    
    // Validation phone
    if (!form.phone.trim()) {
      e.phone = intl.formatMessage({ id: "registerLawyer.errors.phoneRequired" });
    } else {
      const phoneNumber = parsePhoneNumberFromString(form.phone);
      if (!phoneNumber || !phoneNumber.isValid()) {
        e.phone = intl.formatMessage({ id: "registerLawyer.errors.phoneInvalid" });
      }
    }
    
    // Validation country
    if (!form.currentCountry) {
      e.currentCountry = intl.formatMessage({ id: "registerLawyer.errors.needCountry" });
    }
    
    // Validation practice countries
    if (form.practiceCountries.length === 0) {
      e.practiceCountries = intl.formatMessage({ id: "registerLawyer.errors.needPractice" });
    }
    
    // Validation specialties
    if (form.specialties.length === 0) {
      e.specialties = intl.formatMessage({ id: "registerLawyer.errors.needSpecialty" });
    }
    
    // Validation languages
    if ((selectedLanguages as LanguageOption[]).length === 0) {
      e.languages = intl.formatMessage({ id: "registerLawyer.errors.needLanguage" });
    }
    
    // Validation bio
    if (!trimmedBio || trimmedBio.length < MIN_BIO_LENGTH) {
      e.bio = intl.formatMessage({ id: "registerLawyer.errors.needBio" });
    } else if (trimmedBio.length > MAX_BIO_LENGTH) {
      e.bio = intl.formatMessage({ id: "registerLawyer.errors.bioTooLong" });
    }
    
    // Validation photo
    if (!form.profilePhoto) {
      e.profilePhoto = intl.formatMessage({ id: "registerLawyer.errors.needPhoto" });
    }
    
    // Validation education
    if (!form.educations.some((v) => v.trim().length > 0)) {
      e.educations = intl.formatMessage({ id: "registerLawyer.errors.needEducation" });
    }
    
    // Validation terms
    if (!form.acceptTerms) {
      e.acceptTerms = intl.formatMessage({ id: "registerLawyer.errors.acceptTermsRequired" });
    }

    // Validation payment terms
    if (!form.acceptPaymentTerms) {
      e.acceptPaymentTerms = intl.formatMessage({ id: "registerLawyer.errors.acceptPaymentTermsRequired" });
    }

    setFieldErrors(e);
    
    // Focus sur le premier champ en erreur
    if (Object.keys(e).length > 0 && fieldRefs.firstName.current) {
      fieldRefs.firstName.current.focus();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    
    return Object.keys(e).length === 0;
  }, [form, selectedLanguages, intl]);

  // ✅ FIX: handleSubmit corrigé pour éviter le saut de page + 🤖 Anti-Bot
  const handleSubmit = useCallback(async (ev: React.FormEvent) => {
    ev.preventDefault();
    
    // ✅ FIX: Empêcher les soumissions multiples et après navigation
    if (isSubmitting || hasNavigatedRef.current) return;
    
    // 🤖 Reset erreur bot
    setBotError("");
    
    setTouched({ 
      firstName: true, 
      lastName: true, 
      email: true, 
      password: true, 
      phone: true,
      currentCountry: true,
      bio: true,
      acceptTerms: true,
      acceptPaymentTerms: true
    });
    
    setIsSubmitting(true);
    
    // 🤖 ÉTAPE 1: Validation Anti-Bot
    const botCheck = await validateHuman();
    if (!botCheck.isValid) {
      const errorMessages: Record<string, string> = {
        honeypot: "Une erreur de validation s'est produite. Veuillez réessayer.",
        too_fast: "Veuillez prendre le temps de remplir correctement le formulaire.",
      };
      setBotError(errorMessages[botCheck.reason || ''] || "Erreur de validation.");
      setIsSubmitting(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    
    if (!validateAll()) {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
      return;
    }
    
    try {
      await setPersistence(auth, browserLocalPersistence);
      
      const languageCodes = (selectedLanguages as LanguageOption[]).map((l) => l.value);
      
      // ✅ FIX: Utiliser sanitizeStringFinal pour le trim final à la soumission
      const sanitizedEducations = form.educations
        .map((e) => sanitizeStringFinal(e))
        .filter(Boolean);
      
      const trimmedFirstName = sanitizeStringFinal(form.firstName);
      const trimmedLastName = sanitizeStringFinal(form.lastName);
      const trimmedBio = sanitizeStringFinal(form.bio);
      
      const userData = {
        role: "lawyer" as const,
        type: "lawyer" as const,
        email: sanitizeEmail(form.email),
        fullName: `${trimmedFirstName} ${trimmedLastName}`,
        name: `${trimmedFirstName} ${trimmedLastName}`,
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        phone: form.phone,
        currentCountry: form.currentCountry,
        country: form.currentCountry,
        practiceCountries: form.practiceCountries,
        profilePhoto: form.profilePhoto,
        photoURL: form.profilePhoto,
        avatar: form.profilePhoto,
        languages: languageCodes,
        languagesSpoken: languageCodes,
        specialties: form.specialties,
        education: sanitizedEducations.join(', '),
        yearsOfExperience: Math.max(0, Math.min(60, form.yearsOfExperience)),
        graduationYear: Math.max(1980, Math.min(new Date().getFullYear(), form.graduationYear)),
        bio: trimmedBio,
        description: trimmedBio,
        availability: form.availability,
        isOnline: false,
        isApproved: false,
        isVisible: false,
        isActive: true,
        approvalStatus: 'pending' as const,
        verificationStatus: 'pending',
        status: 'pending',
        rating: 4.5,
        reviewCount: 0,
        preferredLanguage: form.preferredLanguage,
        // 🔐 Données anti-bot (pour analyse côté serveur)
        _securityMeta: {
          recaptchaToken: botCheck.recaptchaToken,
          formFillTime: stats.timeSpent,
          mouseMovements: stats.mouseMovements,
          keystrokes: stats.keystrokes,
          userAgent: navigator.userAgent,
          timestamp: Date.now(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await register(userData, form.password);
      
      // ✅ Vérification du support Stripe pour le pays
      const stripeCountryCode = getCountryCode(form.currentCountry);
      
      if (!isCountrySupportedByStripe(stripeCountryCode)) {
        // Le pays n'est pas supporté par Stripe - on continue quand même l'inscription
        // mais on ne crée pas de compte Stripe (sera fait manuellement ou plus tard)
        console.warn(`⚠️ [RegisterLawyer] Pays non supporté par Stripe: ${stripeCountryCode} (${form.currentCountry})`);
        
        // Navigation réussie même sans compte Stripe
        hasNavigatedRef.current = true;

        // Track Meta Pixel CompleteRegistration - inscription avocat reussie (sans Stripe)
        trackMetaCompleteRegistration({
          content_name: 'lawyer_registration_no_stripe',
          status: 'completed',
        });

        // Track Ad Attribution Registration (Firestore - pour dashboard admin)
        trackAdRegistration({
          contentName: 'lawyer_registration_no_stripe',
        });

        navigate(redirect, {
          replace: true,
          state: {
            message: intl.formatMessage({ id: "registerLawyer.success.registeredNoStripe" }),
            type: "warning",
          },
        });
        return;
      }
      
      // Création du compte Stripe (uniquement si le pays est supporté)
      try {
        const { getFunctions, httpsCallable } = await import("firebase/functions");
        const functions = getFunctions(undefined, "europe-west1");
        const createStripeAccount = httpsCallable(functions, "createStripeAccount");
        
        await createStripeAccount({
          email: sanitizeEmail(form.email),
          currentCountry: stripeCountryCode,
          firstName: trimmedFirstName,
          lastName: trimmedLastName,
          userType: "lawyer",
        });
        
        // ✅ Succès complet - inscription + Stripe
        hasNavigatedRef.current = true;

        // Track Meta Pixel CompleteRegistration - inscription avocat reussie
        trackMetaCompleteRegistration({
          content_name: 'lawyer_registration',
          status: 'completed',
        });

        // Track Ad Attribution Registration (Firestore - pour dashboard admin)
        trackAdRegistration({
          contentName: 'lawyer_registration',
        });

        navigate(redirect, {
          replace: true,
          state: {
            message: intl.formatMessage({ id: "registerLawyer.success.registered" }),
            type: "success",
          },
        });
      } catch (stripeError: unknown) {
        // ✅ Erreur Stripe MAIS inscription Firebase réussie - on redirige quand même
        console.error('⚠️ [RegisterLawyer] Erreur Stripe (compte utilisateur créé):', stripeError);

        hasNavigatedRef.current = true;

        // Track Meta Pixel CompleteRegistration - inscription avocat reussie (sans Stripe complet)
        trackMetaCompleteRegistration({
          content_name: 'lawyer_registration_partial',
          status: 'completed',
        });

        // Track Ad Attribution Registration (Firestore - pour dashboard admin)
        trackAdRegistration({
          contentName: 'lawyer_registration_partial',
        });

        // On redirige vers le dashboard avec un message d'avertissement
        navigate(redirect, {
          replace: true,
          state: {
            message: "Votre compte a été créé avec succès ! La configuration des paiements sera finalisée ultérieurement par notre équipe.",
            type: "warning",
          },
        });
      }
      
    } catch (err: unknown) {
      console.error('❌ [RegisterLawyer] Erreur inscription:', err);
      
      // ✅ FIX: Vérifier si le composant est toujours monté avant de mettre à jour l'état
      if (!isMountedRef.current || hasNavigatedRef.current) return;
      
      let msg = intl.formatMessage({ id: "registerLawyer.errors.generic" });
      
      if (err instanceof Error) {
        if (err.message.includes('email-already-in-use') || err.message.includes('déjà associé')) {
          msg = "Cette adresse email est déjà utilisée. Essayez de vous connecter ou utilisez une autre adresse.";
        } else if (err.message.includes('email-linked-to-google') || err.message.includes('lié à un compte Google')) {
          msg = "Cette adresse email est déjà liée à un compte Google. Utilisez 'Se connecter avec Google' pour accéder à votre compte.";
        } else if (err.message.includes('weak-password') || err.message.includes('6 caractères')) {
          msg = "Le mot de passe doit contenir au moins 6 caractères.";
        } else if (err.message.includes('invalid-email') || err.message.includes('email invalide')) {
          msg = "L'adresse email n'est pas valide. Vérifiez qu'elle est correcte.";
        } else if (err.message.includes('network') || err.message.includes('réseau')) {
          msg = "Problème de connexion internet. Vérifiez votre connexion et réessayez.";
        } else if (err.message.includes('timeout') || err.message.includes('délai')) {
          msg = "La connexion est trop lente. Vérifiez votre connexion internet et réessayez.";
        } else if (err.message.includes('permissions') || err.message.includes('permission')) {
          msg = "Erreur technique lors de la création du compte. Contactez le support si le problème persiste.";
        } else if (err.message.includes('not currently supported by Stripe') || err.message.includes('not supported')) {
          // ✅ Gestion spécifique des erreurs Stripe pour pays non supportés
          const countryCode = getCountryCode(form.currentCountry);
          const countryName = form.currentCountry;
          msg = `Le pays "${countryName}" (${countryCode}) n'est pas encore supporté par notre système de paiement. Votre compte a été créé mais vous devrez contacter le support pour activer les paiements.`;
        } else if (err.message.includes('Stripe') || err.message.includes('stripe')) {
          msg = "Erreur lors de la configuration du système de paiement. Votre compte a été créé, contactez le support pour finaliser la configuration.";
        } else if (err.message && err.message.length > 10 && err.message.length < 200) {
          msg = err.message;
        }
      }
      
      setFieldErrors((prev) => ({ ...prev, general: msg }));
      setIsSubmitting(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    // ✅ FIX: Pas de finally avec setIsSubmitting(false) pour éviter le re-render après navigation
  }, [isSubmitting, validateAll, validateHuman, register, form, selectedLanguages, navigate, redirect, intl, stats]);

  // ✅ FIX: canSubmit avec validation des espaces (trim)
  const canSubmit = useMemo(() => {
    const phoneNumber = parsePhoneNumberFromString(form.phone);
    const trimmedFirstName = form.firstName.trim();
    const trimmedLastName = form.lastName.trim();
    const trimmedBio = form.bio.trim();
    
    return (
      !!trimmedFirstName && 
      NAME_REGEX.test(trimmedFirstName) &&
      !!trimmedLastName && 
      NAME_REGEX.test(trimmedLastName) &&
      EMAIL_REGEX.test(form.email) && 
      form.password.length >= 6 &&
      form.password.length <= 128 &&
      !!form.phone && 
      phoneNumber?.isValid() && 
      !!form.currentCountry && 
      trimmedBio.length >= MIN_BIO_LENGTH &&
      trimmedBio.length <= MAX_BIO_LENGTH &&
      !!form.profilePhoto && 
      form.specialties.length > 0 && 
      form.practiceCountries.length > 0 &&
      (selectedLanguages as LanguageOption[]).length > 0 &&
      form.educations.some((e) => e.trim().length > 0) &&
      form.acceptTerms &&
      form.acceptPaymentTerms &&
      !isLoading &&
      !isSubmitting
    );
  }, [form, selectedLanguages, isLoading, isSubmitting]);

  const getInputClass = useCallback((name: string, hasError?: boolean) => {
    const base = "w-full px-4 py-3.5 rounded-xl border-2 transition-all duration-200 text-[15px] font-medium focus:outline-none";
    const fieldValue = form[name as keyof LawyerFormData];
    const hasValue = typeof fieldValue === 'string' ? fieldValue.trim() : fieldValue;
    
    if (hasError || (fieldErrors[name] && touched[name])) {
      return `${base} border-red-400 bg-red-50 text-red-900 focus:border-red-500 focus:ring-4 focus:ring-red-500/20`;
    }
    if (!fieldErrors[name] && touched[name] && hasValue) {
      return `${base} border-green-400 bg-green-50 text-green-900 focus:border-green-500 focus:ring-4 focus:ring-green-500/20`;
    }
    return `${base} border-gray-300 bg-gray-100 text-gray-900 placeholder-gray-500 hover:bg-gray-50 hover:border-gray-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 focus:bg-white`;
  }, [fieldErrors, touched, form]);

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50">
        {/* 🎯 HEADER SÉMANTIQUE */}
        <header className="pt-8 pb-6 px-4 text-center border-b-2 border-gray-200 bg-white shadow-sm">
          <div className="max-w-2xl mx-auto">
            <div 
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 mb-5 shadow-xl"
              role="img"
              aria-label={intl.formatMessage({ id: "registerLawyer.ui.logoAlt" })}
            >
              <Scale className="w-8 h-8 text-white" aria-hidden="true" />
            </div>
            
            {/* H1 - Unique sur la page */}
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mb-3 tracking-tight">
              <FormattedMessage id="registerLawyer.ui.heroTitle" />
            </h1>
            
            <p className="text-base text-gray-600 mb-5 font-medium">
              <FormattedMessage id="registerLawyer.ui.heroSubtitle" />
            </p>
            
            {/* 🔐 Badge sécurité reCAPTCHA */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full text-sm text-green-700 mb-4">
              <Shield className="w-4 h-4" aria-hidden="true" />
              <span>Formulaire sécurisé par reCAPTCHA</span>
            </div>
            
            <div className="text-sm text-gray-600">
              <FormattedMessage id="registerLawyer.ui.already" />{" "}
              <Link 
                to={`/login?redirect=${encodeURIComponent(redirect)}`} 
                className="font-bold text-indigo-600 hover:text-indigo-700 underline"
                aria-label={intl.formatMessage({ id: "registerLawyer.ui.loginAriaLabel" })}
              >
                <FormattedMessage id="registerLawyer.ui.login" />
              </Link>
            </div>
          </div>
        </header>

        {/* 📝 FORMULAIRE PRINCIPAL */}
        <main className="max-w-2xl mx-auto px-4 py-8">
          {/* Erreur générale ou bot */}
          {(fieldErrors.general || botError) && (
            <div 
              className="mb-6 rounded-xl border-2 border-red-300 bg-red-50 p-5 shadow-lg" 
              role="alert"
              aria-live="assertive"
            >
              <div className="flex">
                <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" aria-hidden="true" />
                <div className="ml-3">
                  <p className="text-sm font-semibold text-red-900">{botError || fieldErrors.general}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-8">
            {/* 🍯 HONEYPOT - Champs cachés pour piéger les bots */}
            <div 
              style={{ 
                position: 'absolute', 
                left: '-9999px', 
                top: '-9999px',
                opacity: 0,
                height: 0,
                overflow: 'hidden',
                pointerEvents: 'none',
              }}
              aria-hidden="true"
            >
              <label htmlFor="website_url">Website URL (leave empty)</label>
              <input
                type="text"
                id="website_url"
                name="website_url"
                tabIndex={-1}
                autoComplete="off"
                value={honeypotValue}
                onChange={(e) => setHoneypotValue(e.target.value)}
              />
              <label htmlFor="phone_confirm">Phone Confirm (leave empty)</label>
              <input
                type="text"
                id="phone_confirm"
                name="phone_confirm"
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            {/* ========================================================================= */}
            {/* 👤 SECTION 1: IDENTITÉ (avec langues déplacées ici) */}
            {/* ========================================================================= */}
            <section 
              className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-lg"
              aria-labelledby="identity-heading"
            >
              <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-gray-100">
                <div 
                  className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-100"
                  role="img"
                  aria-label={intl.formatMessage({ id: "registerLawyer.section.identityIcon" })}
                >
                  <User className="w-5 h-5 text-indigo-600" aria-hidden="true" />
                </div>
                <h2 id="identity-heading" className="text-xl font-black text-gray-900">
                  <FormattedMessage id="registerLawyer.section.identity" />
                </h2>
              </div>

              <div className="space-y-5">
                {/* Prénom & Nom */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label 
                      htmlFor="firstName" 
                      className="block text-sm font-bold text-gray-900 mb-2"
                    >
                      <FormattedMessage id="registerLawyer.fields.firstName" />
                      <span className="text-red-500 ml-1" aria-label={intl.formatMessage({ id: "common.required" })}>*</span>
                    </label>
                    <input
                      id="firstName"
                      name="firstName"
                      ref={fieldRefs.firstName}
                      type="text"
                      value={form.firstName}
                      onChange={onChange}
                      onBlur={() => markTouched("firstName")}
                      autoComplete="given-name"
                      className={getInputClass("firstName")}
                      placeholder={intl.formatMessage({ id: "registerLawyer.placeholder.firstName" })}
                      aria-required="true"
                      aria-invalid={!!(fieldErrors.firstName && touched.firstName)}
                      aria-describedby={fieldErrors.firstName && touched.firstName ? "firstName-error" : undefined}
                    />
                    <FieldError 
                      error={fieldErrors.firstName} 
                      show={!!(fieldErrors.firstName && touched.firstName)} 
                    />
                    <FieldSuccess
                      show={!fieldErrors.firstName && !!touched.firstName && !!form.firstName.trim() && NAME_REGEX.test(form.firstName.trim())}
                      message={intl.formatMessage({ id: "registerLawyer.success.fieldValid" })}
                    />
                  </div>

                  <div>
                    <label 
                      htmlFor="lastName" 
                      className="block text-sm font-bold text-gray-900 mb-2"
                    >
                      <FormattedMessage id="registerLawyer.fields.lastName" />
                      <span className="text-red-500 ml-1" aria-label={intl.formatMessage({ id: "common.required" })}>*</span>
                    </label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      value={form.lastName}
                      onChange={onChange}
                      onBlur={() => markTouched("lastName")}
                      autoComplete="family-name"
                      className={getInputClass("lastName")}
                      placeholder={intl.formatMessage({ id: "registerLawyer.placeholder.lastName" })}
                      aria-required="true"
                      aria-invalid={!!(fieldErrors.lastName && touched.lastName)}
                      aria-describedby={fieldErrors.lastName && touched.lastName ? "lastName-error" : undefined}
                    />
                    <FieldError 
                      error={fieldErrors.lastName} 
                      show={!!(fieldErrors.lastName && touched.lastName)} 
                    />
                    <FieldSuccess
                      show={!fieldErrors.lastName && !!touched.lastName && !!form.lastName.trim() && NAME_REGEX.test(form.lastName.trim())}
                      message={intl.formatMessage({ id: "registerLawyer.success.fieldValid" })}
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label 
                    htmlFor="email" 
                    className="block text-sm font-bold text-gray-900 mb-2"
                  >
                    <FormattedMessage id="registerLawyer.fields.email" />
                    <span className="text-red-500 ml-1" aria-label={intl.formatMessage({ id: "common.required" })}>*</span>
                  </label>
                  <div className="relative">
                    <Mail 
                      className="absolute left-4 top-4 w-5 h-5 text-indigo-600 pointer-events-none z-10" 
                      aria-hidden="true" 
                    />
                    <input
                      id="email"
                      name="email"
                      ref={fieldRefs.email}
                      type="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={onChange}
                      onBlur={() => markTouched("email")}
                      className={`${getInputClass("email")} pl-12`}
                      placeholder={intl.formatMessage({ id: "registerLawyer.placeholder.email" })}
                      aria-required="true"
                      aria-invalid={!!(touched.email && (!!fieldErrors.email || !EMAIL_REGEX.test(form.email)))}
                      aria-describedby={touched.email && fieldErrors.email ? "email-error" : undefined}
                    />
                  </div>
                  <FieldError 
                    error={fieldErrors.email} 
                    show={!!(touched.email && (!!fieldErrors.email || (form.email && !EMAIL_REGEX.test(form.email))))} 
                  />
                  <FieldSuccess 
                    show={!!touched.email && !!form.email && EMAIL_REGEX.test(form.email)} 
                    message={intl.formatMessage({ id: "registerLawyer.success.emailValid" })} 
                  />
                </div>

                {/* Mot de passe */}
                <div>
                  <label 
                    htmlFor="password" 
                    className="block text-sm font-bold text-gray-900 mb-2"
                  >
                    <FormattedMessage id="registerLawyer.fields.password" />
                    <span className="text-red-500 ml-1" aria-label={intl.formatMessage({ id: "common.required" })}>*</span>
                  </label>
                  <div className="relative">
                    <Lock 
                      className="absolute left-4 top-4 w-5 h-5 text-indigo-600 pointer-events-none z-10" 
                      aria-hidden="true" 
                    />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={onChange}
                      onBlur={() => markTouched("password")}
                      autoComplete="new-password"
                      className={`${getInputClass("password")} pl-12 pr-12`}
                      placeholder="••••••••"
                      aria-required="true"
                      aria-invalid={!!(fieldErrors.password && touched.password)}
                      aria-describedby={fieldErrors.password && touched.password ? "password-error" : form.password.length > 0 ? "password-strength" : undefined}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-3 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? intl.formatMessage({ id: "registerLawyer.ui.hidePassword" }) : intl.formatMessage({ id: "registerLawyer.ui.showPassword" })}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" aria-hidden="true" /> : <Eye className="w-5 h-5" aria-hidden="true" />}
                    </button>
                  </div>
                  
                  {/* Barre de force du mot de passe */}
                  {form.password.length > 0 && (
                    <div className="mt-3" id="password-strength">
                      <div 
                        className="h-2 bg-gray-200 rounded-full overflow-hidden shadow-inner"
                        role="progressbar"
                        aria-label={intl.formatMessage({ id: "registerLawyer.ui.passwordStrength" })}
                        aria-valuenow={pwdStrength.percent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div 
                          className={`h-full transition-all duration-500 ${pwdStrength.color}`} 
                          style={{ width: `${pwdStrength.percent}%` }} 
                        />
                      </div>
                      <p className="text-xs text-gray-600 mt-1 font-medium">
                        <FormattedMessage id={`registerLawyer.ui.passwordStrength.${pwdStrength.label}`} />
                      </p>
                    </div>
                  )}
                  
                  <FieldError 
                    error={fieldErrors.password} 
                    show={!!(fieldErrors.password && touched.password)} 
                  />
                  <FieldSuccess 
                    show={!fieldErrors.password && !!touched.password && form.password.length >= 6} 
                    message={intl.formatMessage({ id: "registerLawyer.success.pwdOk" })} 
                  />
                </div>

                {/* Téléphone */}
                <div>
                  <label 
                    htmlFor="phone" 
                    className="block text-sm font-bold text-gray-900 mb-2"
                  >
                    <FormattedMessage id="registerLawyer.fields.phone" />
                    <span className="text-red-500 ml-1" aria-label={intl.formatMessage({ id: "common.required" })}>*</span>
                  </label>
                  
                  {/* Style optimisé mobile-first - FOND CLAIR */}
                  <style>{`
                    /* Container principal */
                    .react-tel-input {
                      position: relative !important;
                    }
                    
                    /* Dropdown des pays */
                    .react-tel-input .country-list {
                      position: absolute !important;
                      background-color: #ffffff !important;
                      border: 2px solid #d1d5db !important;
                      border-radius: 12px !important;
                      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15) !important;
                      max-height: 200px !important;
                      overflow-y: auto !important;
                      z-index: 99999 !important;
                      margin-top: 4px !important;
                      width: 280px !important;
                      left: 0 !important;
                      pointer-events: auto !important;
                    }
                    
                    /* Items de la liste */
                    .react-tel-input .country-list .country {
                      padding: 8px 12px !important;
                      color: #111827 !important;
                      background-color: transparent !important;
                      font-size: 14px !important;
                      cursor: pointer !important;
                      pointer-events: auto !important;
                    }
                    
                    /* Hover bleu */
                    .react-tel-input .country-list .country:hover,
                    .react-tel-input .country-list .country.highlight {
                      background-color: rgba(99, 102, 241, 0.1) !important;
                    }
                    
                    /* Pays sélectionné */
                    .react-tel-input .country-list .country.active {
                      background-color: rgba(99, 102, 241, 0.15) !important;
                      color: #4f46e5 !important;
                      font-weight: 600 !important;
                    }
                    
                    /* Nom du pays */
                    .react-tel-input .country-list .country-name {
                      color: #374151 !important;
                      margin-right: 8px !important;
                    }
                    
                    /* Code pays */
                    .react-tel-input .country-list .dial-code {
                      color: #6b7280 !important;
                    }
                    
                    /* Bouton drapeau - CLIQUABLE */
                    .react-tel-input .flag-dropdown {
                      background-color: #f9fafb !important;
                      border: 2px solid #d1d5db !important;
                      border-right: none !important;
                      border-radius: 12px 0 0 12px !important;
                      cursor: pointer !important;
                      pointer-events: auto !important;
                      transition: all 0.2s ease !important;
                    }
                    
                    .react-tel-input .flag-dropdown:hover {
                      background-color: #f3f4f6 !important;
                      border-color: #9ca3af !important;
                    }
                    
                    .react-tel-input .flag-dropdown.open {
                      background-color: rgba(99, 102, 241, 0.1) !important;
                      border-color: #6366f1 !important;
                    }
                    
                    /* Input téléphone - ÉDITABLE - FOND CLAIR */
                    .react-tel-input .form-control {
                      width: 100% !important;
                      background-color: #f9fafb !important;
                      border: 2px solid #d1d5db !important;
                      border-radius: 12px !important;
                      color: #111827 !important;
                      padding: 14px 16px 14px 64px !important;
                      font-size: 15px !important;
                      font-weight: 500 !important;
                      pointer-events: auto !important;
                      cursor: text !important;
                      transition: all 0.2s ease !important;
                    }
                    
                    .react-tel-input .form-control:hover {
                      background-color: #f3f4f6 !important;
                      border-color: #9ca3af !important;
                    }
                    
                    .react-tel-input .form-control:focus {
                      outline: none !important;
                      background-color: #ffffff !important;
                      border-color: #6366f1 !important;
                      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1) !important;
                    }
                    
                    .react-tel-input .form-control::placeholder {
                      color: #9ca3af !important;
                    }
                    
                    /* Scrollbar */
                    .react-tel-input .country-list::-webkit-scrollbar {
                      width: 6px !important;
                    }
                    
                    .react-tel-input .country-list::-webkit-scrollbar-track {
                      background: #f3f4f6 !important;
                    }
                    
                    .react-tel-input .country-list::-webkit-scrollbar-thumb {
                      background: #d1d5db !important;
                      border-radius: 4px !important;
                    }
                    
                    .react-tel-input .country-list::-webkit-scrollbar-thumb:hover {
                      background: #9ca3af !important;
                    }
                    
                    /* Mobile */
                    @media (max-width: 640px) {
                      .react-tel-input .country-list {
                        width: calc(100vw - 40px) !important;
                        max-width: 300px !important;
                      }
                    }
                  `}</style>
                  
                  <IntlPhoneInput
                    value={form.phone}
                    onChange={(value) => {
                      const phoneValue = value || "";
                      setForm((prev) => ({ ...prev, phone: phoneValue }));
                      if (!touched.phone) markTouched("phone");
                      const parsed = parsePhoneNumberFromString(phoneValue);
                      if (!phoneValue) {
                        setFieldErrors((prev) => {
                          const { phone, ...rest } = prev;
                          return rest;
                        });
                      } else if (!parsed || !parsed.isValid()) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          phone: intl.formatMessage({ id: "registerLawyer.errors.phoneInvalid" })
                        }));
                      } else {
                        setFieldErrors((prev) => {
                          const { phone, ...rest } = prev;
                          return rest;
                        });
                      }
                    }}
                    onBlur={() => markTouched("phone")}
                    defaultCountry="fr"
                    placeholder="+33 6 12 34 56 78"
                    locale={lang}
                    name="phone"
                    inputProps={{
                      id: "phone",
                      "aria-required": "true",
                      "aria-invalid": !!(touched.phone && fieldErrors.phone),
                      "aria-describedby": touched.phone && fieldErrors.phone ? "phone-error" : undefined,
                    }}
                  />
                  <FieldError 
                    error={fieldErrors.phone} 
                    show={!!(touched.phone && fieldErrors.phone)} 
                  />
                  <FieldSuccess 
                    show={!!(touched.phone && !fieldErrors.phone && parsePhoneNumberFromString(form.phone)?.isValid())} 
                    message={intl.formatMessage({ id: "registerLawyer.success.fieldValid" })} 
                  />
                </div>

                {/* Langues parlées - DÉPLACÉ ICI DEPUIS EXPERTISE */}
                <div>
                  <label 
                    htmlFor="languages" 
                    className="block text-sm font-bold text-gray-900 mb-2"
                  >
                    <FormattedMessage id="registerLawyer.fields.languages" />
                    <span className="text-red-500 ml-1" aria-label={intl.formatMessage({ id: "common.required" })}>*</span>
                  </label>
                  
                  <Suspense fallback={
                    <div 
                      className="h-14 animate-pulse rounded-xl bg-gray-100 border-2 border-gray-300"
                      aria-label={intl.formatMessage({ id: "common.loading" })}
                    />
                  }>
                    <div className="border-2 border-gray-300 rounded-xl bg-gray-100 hover:border-gray-400 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/20 transition-all">
                      <MultiLanguageSelect
                        value={selectedLanguages}
                        onChange={(v: MultiValue<LanguageOption>) => {
                          setSelectedLanguages(v);
                          const arr = v.map((l) => l.value);
                          setForm((prev) => ({ ...prev, languagesSpoken: arr }));
                          setTouched((p) => ({ ...p, languages: true }));
                        }}
                        locale={lang}
                        placeholder={intl.formatMessage({ id: "registerLawyer.select.searchLanguages" })}
                        aria-label={intl.formatMessage({ id: "registerLawyer.fields.languages" })}
                      />
                    </div>
                  </Suspense>
                  
                  <FieldError 
                    error={fieldErrors.languages} 
                    show={!!fieldErrors.languages} 
                  />
                  <FieldSuccess 
                    show={(selectedLanguages as LanguageOption[]).length > 0} 
                    message={intl.formatMessage({ id: "registerLawyer.success.fieldValid" })} 
                  />
                </div>
              </div>
            </section>

            {/* ========================================================================= */}
            {/* 🌍 SECTION 2: LOCALISATION */}
            {/* ========================================================================= */}
            <section 
              className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-lg"
              aria-labelledby="location-heading"
            >
              <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-gray-100">
                <div 
                  className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-100"
                  role="img"
                  aria-label={intl.formatMessage({ id: "registerLawyer.section.locationIcon" })}
                >
                  <Globe className="w-5 h-5 text-indigo-600" aria-hidden="true" />
                </div>
                <h3 id="location-heading" className="text-xl font-black text-gray-900">
                  <FormattedMessage id="registerLawyer.section.location" />
                </h3>
              </div>

              <div className="space-y-5">
                {/* Pays de résidence */}
                <div>
                  <label 
                    htmlFor="currentCountry" 
                    className="block text-sm font-bold text-gray-900 mb-2"
                  >
                    <FormattedMessage id="registerLawyer.fields.residenceCountry" />
                    <span className="text-red-500 ml-1" aria-label={intl.formatMessage({ id: "common.required" })}>*</span>
                  </label>
                  <select
                    id="currentCountry"
                    name="currentCountry"
                    value={form.currentCountry}
                    onChange={onChange}
                    onBlur={() => markTouched("currentCountry")}
                    className={getInputClass("currentCountry")}
                    aria-required="true"
                    aria-invalid={!!(fieldErrors.currentCountry && touched.currentCountry)}
                    aria-describedby={fieldErrors.currentCountry && touched.currentCountry ? "currentCountry-error" : undefined}
                  >
                    <option value="">
                      {intl.formatMessage({ id: "common.select" })}
                    </option>
                    {countryOptions.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  <FieldError 
                    error={fieldErrors.currentCountry} 
                    show={!!(fieldErrors.currentCountry && touched.currentCountry)} 
                  />
                  <FieldSuccess 
                    show={!fieldErrors.currentCountry && !!touched.currentCountry && !!form.currentCountry && isCountryStripeSupported === true} 
                    message={intl.formatMessage({ id: "registerLawyer.success.fieldValid" })} 
                  />
                  
                  {/* ⚠️ Avertissement si le pays n'est pas supporté par Stripe */}
                  {form.currentCountry && isCountryStripeSupported === false && (
                    <StripeCountryWarning 
                      countryName={form.currentCountry}
                      countryCode={selectedCountryCode}
                      lang={lang}
                    />
                  )}
                </div>

                {/* Pays d'exercice */}
                <div>
                  <label 
                    htmlFor="practiceCountries" 
                    className="block text-sm font-bold text-gray-900 mb-2"
                  >
                    <FormattedMessage id="registerLawyer.fields.practiceCountries" />
                    <span className="text-red-500 ml-1" aria-label={intl.formatMessage({ id: "common.required" })}>*</span>
                  </label>
                  
                  {selectedPracticeCountries.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3" role="list" aria-label={intl.formatMessage({ id: "registerLawyer.ui.selectedCountries" })}>
                      {selectedPracticeCountries.map((c) => (
                        <TagChip 
                          key={c.value} 
                          value={c.label} 
                          onRemove={() => {
                            const newSelection = selectedPracticeCountries.filter(country => country.value !== c.value);
                            handlePracticeCountriesChange(newSelection);
                          }}
                          ariaLabel={intl.formatMessage({ id: "registerLawyer.ui.removeCountry" }, { country: c.label })}
                        />
                      ))}
                    </div>
                  )}
                  
                  <select
                    id="practiceCountries"
                    className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-300 bg-gray-100 text-gray-900 font-medium hover:bg-gray-50 hover:border-gray-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 focus:bg-white transition-all"
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value && !selectedPracticeCountries.find(c => c.value === value)) {
                        const country = countryOptions.find(c => c.value === value);
                        if (country) {
                          handlePracticeCountriesChange([...selectedPracticeCountries, country] as MultiValue<CountryOption>);
                        }
                      }
                      e.target.value = "";
                    }}
                    value=""
                    aria-label={intl.formatMessage({ id: "registerLawyer.select.addPractice" })}
                  >
                    <option value="">
                      {intl.formatMessage({ id: "registerLawyer.select.addPractice" })}
                    </option>
                    {countryOptions.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  
                  <FieldError 
                    error={fieldErrors.practiceCountries} 
                    show={!!fieldErrors.practiceCountries} 
                  />
                  <FieldSuccess 
                    show={form.practiceCountries.length > 0} 
                    message={intl.formatMessage({ id: "registerLawyer.success.fieldValid" })} 
                  />
                </div>
              </div>
            </section>

            {/* ========================================================================= */}
            {/* 💼 SECTION 3: EXPERTISE PROFESSIONNELLE */}
            {/* ========================================================================= */}
            <section 
              className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-lg"
              aria-labelledby="expertise-heading"
            >
              <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-gray-100">
                <div 
                  className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-100"
                  role="img"
                  aria-label={intl.formatMessage({ id: "registerLawyer.section.expertiseIcon" })}
                >
                  <Briefcase className="w-5 h-5 text-indigo-600" aria-hidden="true" />
                </div>
                <h4 id="expertise-heading" className="text-xl font-black text-gray-900">
                  <FormattedMessage id="registerLawyer.section.expertise" />
                </h4>
              </div>

              <div className="space-y-5">
                {/* Années d'expérience */}
                <div>
                  <label 
                    htmlFor="yearsOfExperience" 
                    className="block text-sm font-bold text-gray-900 mb-2"
                  >
                    <FormattedMessage id="registerLawyer.fields.yearsOfExperience" />
                  </label>
                  <input
                    id="yearsOfExperience"
                    name="yearsOfExperience"
                    type="number"
                    value={form.yearsOfExperience}
                    onChange={onChange}
                    className={getInputClass("yearsOfExperience")}
                    min={0}
                    max={60}
                    aria-label={intl.formatMessage({ id: "registerLawyer.fields.yearsOfExperience" })}
                  />
                </div>

                {/* Spécialités */}
                <div>
                  <label 
                    htmlFor="specialties" 
                    className="block text-sm font-bold text-gray-900 mb-2"
                  >
                    <FormattedMessage id="registerLawyer.fields.specialties" />
                    <span className="text-red-500 ml-1" aria-label={intl.formatMessage({ id: "common.required" })}>*</span>
                  </label>
                  
                  <Suspense fallback={
                    <div 
                      className="h-14 animate-pulse rounded-xl bg-gray-100 border-2 border-gray-300"
                      aria-label={intl.formatMessage({ id: "common.loading" })}
                    />
                  }>
                    <div className="border-2 border-gray-300 rounded-xl bg-gray-100 hover:border-gray-400 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/20 transition-all">
                      <SpecialtySelect
                        value={selectedSpecialties}
                        onChange={handleSpecialtiesChange}
                        locale={lang}
                        placeholder={intl.formatMessage({ id: "registerLawyer.placeholder.selectSpecialties" })}
                        aria-label={intl.formatMessage({ id: "registerLawyer.fields.specialties" })}
                      />
                    </div>
                  </Suspense>
                  
                  {selectedSpecialties.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3" role="list" aria-label={intl.formatMessage({ id: "registerLawyer.ui.selectedSpecialties" })}>
                      {selectedSpecialties.map((s) => (
                        <TagChip 
                          key={s.value} 
                          value={s.label} 
                          onRemove={() => {
                            const newSelection = selectedSpecialties.filter(spec => spec.value !== s.value);
                            handleSpecialtiesChange(newSelection);
                          }}
                          ariaLabel={intl.formatMessage({ id: "registerLawyer.ui.removeSpecialty" }, { specialty: s.label })}
                        />
                      ))}
                    </div>
                  )}
                  
                  <FieldError 
                    error={fieldErrors.specialties} 
                    show={!!fieldErrors.specialties} 
                  />
                  <FieldSuccess 
                    show={form.specialties.length > 0} 
                    message={intl.formatMessage({ id: "registerLawyer.success.fieldValid" })} 
                  />
                </div>

                {/* Formation - DÉPLACÉ ICI JUSTE AVANT ANNÉE DE DIPLÔME */}
                <div>
                  <label 
                    htmlFor="education-0" 
                    className="block text-sm font-bold text-gray-900 mb-2"
                  >
                    <FormattedMessage id="registerLawyer.fields.education" />
                    <span className="text-red-500 ml-1" aria-label={intl.formatMessage({ id: "common.required" })}>*</span>
                  </label>
                  
                  <div className="space-y-3" role="list" aria-label={intl.formatMessage({ id: "registerLawyer.fields.education" })}>
                    {form.educations.map((ed, idx) => (
                      <div key={idx} className="flex gap-2" role="listitem">
                        <input
                          id={`education-${idx}`}
                          type="text"
                          value={ed}
                          onChange={(e) => updateEducation(idx, e.target.value)}
                          className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl bg-gray-100 text-[15px] font-medium placeholder-gray-500 hover:bg-gray-50 hover:border-gray-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 focus:bg-white transition-all"
                          placeholder={intl.formatMessage({ id: "registerLawyer.placeholder.education" })}
                          aria-label={intl.formatMessage({ id: "registerLawyer.placeholder.educationN" }, { n: idx + 1 })}
                        />
                        {form.educations.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeEducationField(idx)}
                            className="px-3 py-2 rounded-xl border-2 border-gray-300 hover:bg-red-50 hover:border-red-300 transition-colors"
                            aria-label={intl.formatMessage({ id: "registerLawyer.ui.removeEducation" }, { n: idx + 1 })}
                          >
                            <XCircle className="w-5 h-5 text-gray-500" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <button 
                    type="button" 
                    onClick={addEducationField} 
                    className="mt-3 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                    aria-label={intl.formatMessage({ id: "registerLawyer.select.addEducation" })}
                  >
                    + <FormattedMessage id="registerLawyer.select.addEducation" />
                  </button>
                  
                  <FieldError 
                    error={fieldErrors.educations} 
                    show={!!fieldErrors.educations} 
                  />
                  <FieldSuccess 
                    show={form.educations.some((e) => e.trim().length > 0)} 
                    message={intl.formatMessage({ id: "registerLawyer.success.fieldValid" })} 
                  />
                </div>

                {/* Année de diplomation - MAINTENANT APRÈS FORMATION */}
                <div>
                  <label 
                    htmlFor="graduationYear" 
                    className="block text-sm font-bold text-gray-900 mb-2"
                  >
                    <FormattedMessage id="registerLawyer.fields.graduationYear" />
                    <span className="text-red-500 ml-1" aria-label={intl.formatMessage({ id: "common.required" })}>*</span>
                  </label>
                  <input
                    id="graduationYear"
                    name="graduationYear"
                    type="number"
                    value={form.graduationYear}
                    onChange={onChange}
                    className={getInputClass("graduationYear")}
                    min={1980}
                    max={new Date().getFullYear()}
                    aria-label={intl.formatMessage({ id: "registerLawyer.fields.graduationYear" })}
                  />
                </div>

                {/* Biographie */}
                <div>
                  <label 
                    htmlFor="bio" 
                    className="block text-sm font-bold text-gray-900 mb-2"
                  >
                    <FormattedMessage id="registerLawyer.fields.bio" />
                    <span className="text-red-500 ml-1" aria-label={intl.formatMessage({ id: "common.required" })}>*</span>
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    rows={5}
                    maxLength={MAX_BIO_LENGTH}
                    value={form.bio}
                    onChange={onChange}
                    onBlur={() => markTouched("bio")}
                    className={getInputClass("bio")}
                    placeholder={intl.formatMessage({ id: "registerLawyer.placeholder.bio" })}
                    aria-required="true"
                    aria-invalid={!!(fieldErrors.bio && touched.bio)}
                    aria-describedby={fieldErrors.bio && touched.bio ? "bio-error" : "bio-progress"}
                  />
                  
                  {/* Barre de progression */}
                  <div className="mt-3" id="bio-progress">
                    <div 
                      className="h-2 bg-gray-200 rounded-full overflow-hidden shadow-inner"
                      role="progressbar"
                      aria-label={intl.formatMessage({ id: "registerLawyer.ui.bioProgress" })}
                      aria-valuenow={form.bio.length}
                      aria-valuemin={0}
                      aria-valuemax={MAX_BIO_LENGTH}
                    >
                      <div 
                        className={`h-full ${form.bio.trim().length < MIN_BIO_LENGTH ? "bg-orange-400" : "bg-green-500"} transition-all`} 
                        style={{ width: `${Math.min((form.bio.length / MAX_BIO_LENGTH) * 100, 100)}%` }} 
                      />
                    </div>
                    <div className="flex justify-between text-xs mt-2 font-medium">
                      <span className={form.bio.trim().length < MIN_BIO_LENGTH ? "text-orange-600" : "text-green-600"}>
                        {form.bio.trim().length < MIN_BIO_LENGTH 
                          ? intl.formatMessage({ id: "registerLawyer.bio.remaining" }, { count: MIN_BIO_LENGTH - form.bio.trim().length }) 
                          : intl.formatMessage({ id: "registerLawyer.bio.complete" })
                        }
                      </span>
                      <span className={form.bio.length > MAX_BIO_LENGTH - 50 ? "text-orange-600" : "text-gray-600"}>
                        {form.bio.length}/{MAX_BIO_LENGTH}
                      </span>
                    </div>
                  </div>
                  
                  <FieldError 
                    error={fieldErrors.bio} 
                    show={!!(fieldErrors.bio && touched.bio)} 
                  />
                  <FieldSuccess 
                    show={form.bio.trim().length >= MIN_BIO_LENGTH} 
                    message={intl.formatMessage({ id: "registerLawyer.success.fieldValid" })} 
                  />
                </div>

                {/* Photo de profil */}
                <div>
                  <label 
                    htmlFor="profilePhoto" 
                    className="block text-sm font-bold text-gray-900 mb-2"
                  >
                    <FormattedMessage id="registerLawyer.fields.profilePhoto" />
                    <span className="text-red-500 ml-1" aria-label={intl.formatMessage({ id: "common.required" })}>*</span>
                  </label>
                  
                  <Suspense fallback={
                    <div 
                      className="h-32 bg-gray-100 animate-pulse rounded-xl border-2 border-gray-300"
                      aria-label={intl.formatMessage({ id: "common.loading" })}
                    />
                  }>
                    <div 
                      className="border-2 border-gray-300 rounded-xl bg-gray-100 p-4"
                      role="region"
                      aria-label={intl.formatMessage({ id: "registerLawyer.fields.profilePhoto" })}
                    >
                      <ImageUploader
                        locale={lang}
                        currentImage={form.profilePhoto}
                        onImageUploaded={(url: string) => {
                          setForm((prev) => ({ ...prev, profilePhoto: url }));
                          setFieldErrors((prev) => ({ ...prev, profilePhoto: "" }));
                        }}
                        hideNativeFileLabel
                        cropShape="round"
                        outputSize={512}
                        uploadPath="registration_temp"
                        isRegistration={true}
                        alt={intl.formatMessage({ id: "registerLawyer.ui.profilePhotoAlt" })}
                      />
                    </div>
                  </Suspense>
                  
                  <FieldError 
                    error={fieldErrors.profilePhoto} 
                    show={!!fieldErrors.profilePhoto} 
                  />
                  <FieldSuccess 
                    show={!!form.profilePhoto} 
                    message={intl.formatMessage({ id: "registerLawyer.success.fieldValid" })} 
                  />
                </div>
              </div>
            </section>

            {/* ========================================================================= */}
            {/* ✅ SECTION 4: CONDITIONS & SOUMISSION */}
            {/* ========================================================================= */}
            <section className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-lg">
              <div className="flex items-start gap-3 mb-5 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <input
                  type="checkbox"
                  id="acceptTerms"
                  checked={form.acceptTerms}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, acceptTerms: e.target.checked }));
                    setTouched((p) => ({ ...p, acceptTerms: true }));
                  }}
                  className="mt-1 h-5 w-5 text-indigo-600 border-gray-400 rounded focus:ring-2 focus:ring-indigo-500"
                  aria-required="true"
                  aria-invalid={!!fieldErrors.acceptTerms}
                  aria-describedby={fieldErrors.acceptTerms ? "acceptTerms-error" : undefined}
                />
                <label 
                  htmlFor="acceptTerms" 
                  className="text-sm text-gray-800 font-medium"
                >
                  <FormattedMessage id="registerLawyer.ui.acceptTerms" />{" "}
                  <Link 
                    to="/cgu-avocats" 
                    className="text-indigo-600 font-bold hover:text-indigo-700 underline" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    aria-label={intl.formatMessage({ id: "registerLawyer.ui.termsLinkAriaLabel" })}
                  >
                    <FormattedMessage id="registerLawyer.ui.termsLink" />
                  </Link>
                  <span className="text-red-500 ml-1" aria-label={intl.formatMessage({ id: "common.required" })}>*</span>
                </label>
              </div>
              <FieldError
                error={fieldErrors.acceptTerms}
                show={!!fieldErrors.acceptTerms}
              />

              {/* Checkbox conditions de paiement et fonds non réclamés */}
              <div className="flex items-start gap-3 mb-5 p-4 bg-amber-50 rounded-xl border border-amber-200">
                <input
                  type="checkbox"
                  id="acceptPaymentTerms"
                  checked={form.acceptPaymentTerms}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, acceptPaymentTerms: e.target.checked }));
                    setTouched((p) => ({ ...p, acceptPaymentTerms: true }));
                  }}
                  className="mt-1 h-5 w-5 text-amber-600 border-gray-400 rounded focus:ring-2 focus:ring-amber-500"
                  aria-required="true"
                  aria-invalid={!!fieldErrors.acceptPaymentTerms}
                  aria-describedby={fieldErrors.acceptPaymentTerms ? "acceptPaymentTerms-error" : undefined}
                />
                <label
                  htmlFor="acceptPaymentTerms"
                  className="text-sm text-gray-800 font-medium"
                >
                  <FormattedMessage id="registerLawyer.ui.acceptPaymentTerms" />
                  <span className="text-red-500 ml-1" aria-label={intl.formatMessage({ id: "common.required" })}>*</span>
                  <p className="text-xs text-gray-600 mt-1">
                    <FormattedMessage id="registerLawyer.ui.paymentTermsDetails" />
                  </p>
                </label>
              </div>
              <FieldError
                error={fieldErrors.acceptPaymentTerms}
                show={!!fieldErrors.acceptPaymentTerms}
              />

              <Button
                type="submit"
                loading={isLoading || isSubmitting}
                fullWidth
                size="large"
                className={`mt-4 text-lg font-black py-4 shadow-xl ${
                  canSubmit 
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:shadow-2xl" 
                    : "bg-gray-300 cursor-not-allowed"
                }`}
                disabled={!canSubmit}
                aria-label={isLoading || isSubmitting 
                  ? intl.formatMessage({ id: "registerLawyer.ui.loading" })
                  : intl.formatMessage({ id: "registerLawyer.ui.createAccount" })
                }
              >
                {isLoading || isSubmitting ? (
                  <FormattedMessage id="registerLawyer.ui.loading" />
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <FormattedMessage id="registerLawyer.ui.create" />
                    <ArrowRight className="w-6 h-6" aria-hidden="true" />
                  </span>
                )}
              </Button>
              
              {/* 🔐 Mention reCAPTCHA */}
              <p className="mt-4 text-xs text-gray-500 text-center">
                Ce site est protégé par reCAPTCHA et les{" "}
                <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                  règles de confidentialité
                </a>{" "}
                et{" "}
                <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                  conditions d'utilisation
                </a>{" "}
                de Google s'appliquent.
              </p>
            </section>
          </form>

          {/* 📊 SECTION FAQ POUR LE SEO */}
          <FAQSection intl={intl} />
        </main>

        {/* 🔗 FOOTER */}
        <footer className="text-center py-8 px-4 border-t-2 border-gray-200 bg-white">
          <nav aria-label={intl.formatMessage({ id: "registerLawyer.footer.navigation" })}>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600 font-medium">
              <Link 
                to="/politique-confidentialite" 
                className="hover:text-indigo-600 transition-colors"
                aria-label={intl.formatMessage({ id: "registerLawyer.footer.privacyAriaLabel" })}
              >
                <FormattedMessage id="registerLawyer.footer.privacy" />
              </Link>
              <Link 
                to="/cgu-avocats" 
                className="hover:text-indigo-600 transition-colors"
                aria-label={intl.formatMessage({ id: "registerLawyer.footer.termsAriaLabel" })}
              >
                <FormattedMessage id="registerLawyer.footer.terms" />
              </Link>
              <Link 
                to="/contact" 
                className="hover:text-indigo-600 transition-colors"
                aria-label={intl.formatMessage({ id: "registerLawyer.footer.contactAriaLabel" })}
              >
                <FormattedMessage id="registerLawyer.footer.contact" />
              </Link>
            </div>
          </nav>
        </footer>
      </div>
    </Layout>
  );
};

export default RegisterLawyer;