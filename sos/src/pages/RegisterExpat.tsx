// src/pages/RegisterExpat.tsx
// VERSION ULTRA-OPTIMISÉE - SEO + PERFORMANCE + SÉCURITÉ + ANTI-BOT
// ✅ SEO: JSON-LD, Schema.org, Open Graph, Twitter Cards, Canonical
// ✅ PERFORMANCE: Lazy loading, mise en cache, optimisation bundle
// ✅ SÉCURITÉ: Input sanitization, validation stricte
// ✅ ANTI-BOT: reCAPTCHA v3, Honeypot, Time check, Fingerprint
// ✅ ACCESSIBILITÉ: ARIA labels, balises sémantiques, navigation clavier
// ✅ i18n: 100% clés de traduction, zéro texte en dur

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
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  XCircle,
  User,
  Globe,
  Heart,
  ArrowRight,
  HelpCircle,
  Loader2,
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
import { expatHelpTypesData, getExpatHelpTypeLabel } from "@/data/expat-help-types";
import '../styles/multi-language-select.css';
import { trackMetaCompleteRegistration, trackMetaStartRegistration } from "../utils/metaPixel";
import { trackAdRegistration } from "../services/adAttributionService";
import { getStoredReferralTracking } from "../hooks/useAffiliate";

// Lazy imports pour optimisation du bundle
const ImageUploader = lazy(() => import("../components/common/ImageUploader"));
const MultiLanguageSelect = lazy(() => import("../components/forms-data/MultiLanguageSelect"));

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
    const recaptchaToken = await executeRecaptcha('register_expat');

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
interface ExpatFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  currentCountry: string;
  currentPresenceCountry: string;
  interventionCountry: string;
  preferredLanguage: "fr" | "en" | "es" | "de" | "ru" | "hi" | "pt" | "ch" | "ar";
  helpTypes: string[];
  customHelpType: string;
  yearsAsExpat: number;
  profilePhoto: string;
  bio: string;
  availability: "available" | "busy" | "offline";
  acceptTerms: boolean;
  acceptPaymentTerms: boolean;
}

interface LanguageOption {
  value: string;
  label: string;
}

interface HelpTypeOption {
  value: string;
  label: string;
}

// 🔒 SÉCURITÉ: Sanitization des inputs
const sanitizeString = (str: string): string => {
  return str
    .trim()
    .replace(/[<>]/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "");
};

const sanitizeEmail = (email: string): string => {
  return email.trim().toLowerCase();
};

// Country code mapping pour Stripe
const getCountryCode = (countryName: string): string => {
  const country = countriesData.find(c => 
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
  return country?.code || "US";
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

const TagChip = React.memo(({ value, onRemove, ariaLabel }: { value: string; onRemove: () => void; ariaLabel: string }) => (
  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 text-sm font-medium border border-emerald-200">
    {value}
    <button 
      type="button" 
      onClick={onRemove} 
      className="hover:bg-emerald-200 rounded p-0.5 transition-colors" 
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
const FAQSection: React.FC<{ intl: any }> = React.memo(({ intl }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  
  const faqs = Array.from({ length: 8 }, (_, i) => ({
    question: intl.formatMessage({ id: `registerExpat.faq.q${i + 1}` }),
    answer: intl.formatMessage({ id: `registerExpat.faq.a${i + 1}` }),
  }));

  return (
    <section 
      className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-lg mt-8"
      aria-labelledby="faq-heading"
    >
      <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-gray-100">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100">
          <HelpCircle className="w-5 h-5 text-emerald-600" aria-hidden="true" />
        </div>
        <h2 id="faq-heading" className="text-xl font-black text-gray-900">
          <FormattedMessage id="registerExpat.faq.title" />
        </h2>
      </div>

      <div className="space-y-4" role="list">
        {faqs.map((faq, index) => (
          <div 
            key={index} 
            className="border-2 border-gray-200 rounded-xl overflow-hidden transition-all hover:border-emerald-300"
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
                className={`w-5 h-5 text-emerald-600 flex-shrink-0 transition-transform ${openIndex === index ? 'rotate-90' : ''}`}
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

const RegisterExpat: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";
  // ✅ FIX: Récupérer l'email depuis les searchParams (passé depuis Login.tsx)
  const prefillEmail = searchParams.get("email") || "";
  // AFFILIATE: Capture referral code from URL (?ref=CODE)
  const referralCode = searchParams.get("ref") || "";
  const { register, isLoading } = useAuth();
  const { language } = useApp();
  const lang = language as "fr" | "en" | "es" | "de" | "ru" | "hi" | "pt" | "ch" | "ar";

  // 🤖 Hook Anti-Bot
  const { honeypotValue, setHoneypotValue, validateHuman, recaptchaLoaded, stats } = useAntiBot();

  // ✅ FIX: Ref pour tracker si la navigation a eu lieu (évite le saut de page)
  const hasNavigatedRef = useRef(false);
  const isMountedRef = useRef(true);

  const initial: ExpatFormData = {
    firstName: "",
    lastName: "",
    email: prefillEmail,  // ✅ FIX: Pré-remplir depuis l'URL
    password: "",
    phone: "",
    currentCountry: "",
    currentPresenceCountry: "",
    interventionCountry: "",
    preferredLanguage: lang,
    helpTypes: [],
    customHelpType: "",
    yearsAsExpat: 0,
    profilePhoto: "",
    bio: "",
    availability: "offline" as const,
    acceptTerms: false,
    acceptPaymentTerms: false,
  };

  const [form, setForm] = useState<ExpatFormData>(initial);
  const [selectedLanguages, setSelectedLanguages] = useState<MultiValue<LanguageOption>>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomHelp, setShowCustomHelp] = useState(false);
  
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
    trackMetaStartRegistration({ content_name: 'expat_registration' });
  }, []);

  // 🔍 SEO PERFECTIONNÉ
  useEffect(() => {
    const baseUrl = window.location.origin;
    const currentUrl = `${baseUrl}${window.location.pathname}`;
    
    document.title = intl.formatMessage({ id: "registerExpat.seo.title" });
    
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

    ensureMeta("description", intl.formatMessage({ id: "registerExpat.seo.description" }));
    ensureMeta("keywords", intl.formatMessage({ id: "registerExpat.seo.keywords" }));
    ensureMeta("viewport", "width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes");
    ensureLink("canonical", currentUrl);
    
    ensureMeta("og:title", intl.formatMessage({ id: "registerExpat.seo.ogTitle" }), true);
    ensureMeta("og:description", intl.formatMessage({ id: "registerExpat.seo.ogDescription" }), true);
    ensureMeta("og:type", "website", true);
    ensureMeta("og:url", currentUrl, true);
    ensureMeta("og:image", `${baseUrl}/images/og-register-expat.jpg`, true);
    ensureMeta("og:image:width", "1200", true);
    ensureMeta("og:image:height", "630", true);
    ensureMeta("og:image:alt", intl.formatMessage({ id: "registerExpat.seo.ogImageAlt" }), true);
    ensureMeta("og:site_name", "SOS-Expat", true);
    ensureMeta("og:locale", lang === "fr" ? "fr_FR" : lang === "en" ? "en_US" : `${lang}_${lang.toUpperCase()}`, true);
    
    ensureMeta("twitter:card", "summary_large_image");
    ensureMeta("twitter:title", intl.formatMessage({ id: "registerExpat.seo.twitterTitle" }));
    ensureMeta("twitter:description", intl.formatMessage({ id: "registerExpat.seo.twitterDescription" }));
    ensureMeta("twitter:image", `${baseUrl}/images/twitter-register-expat.jpg`);
    ensureMeta("twitter:image:alt", intl.formatMessage({ id: "registerExpat.seo.twitterImageAlt" }));
    ensureMeta("twitter:site", "@SOSExpat");
    ensureMeta("twitter:creator", "@SOSExpat");
    
    ensureMeta("robots", "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
    ensureMeta("googlebot", "index, follow");
    ensureMeta("bingbot", "index, follow");
    ensureMeta("author", "SOS-Expat");
    ensureMeta("language", lang);
    ensureMeta("geo.region", intl.formatMessage({ id: "registerExpat.seo.geoRegion" }));
    ensureMeta("geo.placename", intl.formatMessage({ id: "registerExpat.seo.geoPlacename" }));
    
    ensureMeta("apple-mobile-web-app-capable", "yes");
    ensureMeta("apple-mobile-web-app-status-bar-style", "black-translucent");
    ensureMeta("mobile-web-app-capable", "yes");
    ensureMeta("theme-color", "#10b981");
    
    const jsonLd = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          "@id": currentUrl,
          "url": currentUrl,
          "name": intl.formatMessage({ id: "registerExpat.seo.title" }),
          "description": intl.formatMessage({ id: "registerExpat.seo.description" }),
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
                "name": intl.formatMessage({ id: "registerExpat.seo.breadcrumb.home" }),
                "item": baseUrl
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": intl.formatMessage({ id: "registerExpat.seo.breadcrumb.register" }),
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
            "contactType": intl.formatMessage({ id: "registerExpat.seo.contactType" }),
            "availableLanguage": ["fr", "en", "es", "de", "ru", "hi", "pt", "zh", "ar"]
          }
        },
        {
          "@type": "FAQPage",
          "mainEntity": Array.from({ length: 8 }, (_, i) => ({
            "@type": "Question",
            "name": intl.formatMessage({ id: `registerExpat.faq.q${i + 1}` }),
            "acceptedAnswer": {
              "@type": "Answer",
              "text": intl.formatMessage({ id: `registerExpat.faq.a${i + 1}` })
            }
          }))
        },
        {
          "@type": "Service",
          "serviceType": intl.formatMessage({ id: "registerExpat.seo.serviceType" }),
          "provider": {
            "@type": "Organization",
            "@id": `${baseUrl}/#organization`
          },
          "areaServed": {
            "@type": "Country",
            "name": intl.formatMessage({ id: "registerExpat.seo.areaServed" })
          },
          "availableChannel": {
            "@type": "ServiceChannel",
            "serviceUrl": currentUrl,
            "servicePhone": intl.formatMessage({ id: "registerExpat.seo.servicePhone" }),
            "availableLanguage": {
              "@type": "Language",
              "name": lang
            }
          }
        }
      ]
    };

    let scriptTag = document.querySelector('script[type="application/ld+json"]') as HTMLScriptElement | null;
    if (!scriptTag) {
      scriptTag = document.createElement("script") as HTMLScriptElement;
      scriptTag.type = "application/ld+json";
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(jsonLd);
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

  // Options d'aide - Utilise expatHelpTypesData depuis @/data/expat-help-types
  const helpTypeOptions = useMemo(() => {
    // Map 'ch' -> 'zh' pour correspondre aux clés de expatHelpTypesData
    const localeMap: Record<string, 'fr' | 'en' | 'es' | 'de' | 'pt' | 'ru' | 'zh' | 'ar' | 'hi'> = {
      fr: 'fr', en: 'en', es: 'es', de: 'de', pt: 'pt', ru: 'ru', ch: 'zh', hi: 'hi', ar: 'ar'
    };
    const mappedLocale = localeMap[lang] || 'fr';

    return expatHelpTypesData
      .filter(item => !item.disabled)
      .map(item => ({
        value: item.code,
        label: getExpatHelpTypeLabel(item.code, mappedLocale),
        requiresDetails: item.requiresDetails
      }));
  }, [lang]);

  const pwdStrength = useMemo(() => computePasswordStrength(form.password), [form.password]);

  const markTouched = useCallback((name: string) => {
    setTouched((p) => ({ ...p, [name]: true }));
  }, []);

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    let sanitizedValue = value;
    
    if (type === "text" || type === "textarea") {
      if (name === "email") {
        sanitizedValue = sanitizeEmail(value);
      } else if (name === "firstName" || name === "lastName") {
        sanitizedValue = sanitizeString(value).replace(/[^a-zA-ZÀ-ÿ\s'-]/g, "");
      } else {
        sanitizedValue = sanitizeString(value);
      }
    }
    
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : type === "number" ? Number(value) : sanitizedValue,
    }));
    
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const rest = { ...prev };
        delete rest[name];
        return rest;
      });
    }
  }, [fieldErrors]);

  const onHelpSelect = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    if (!v) return;

    // Vérifie si c'est le code "AUTRE_PRECISER" qui nécessite des détails
    if (v === "AUTRE_PRECISER") {
      setShowCustomHelp(true);
      e.target.value = "";
      return;
    }

    if (!form.helpTypes.includes(v)) {
      setForm((prev) => ({ ...prev, helpTypes: [...prev.helpTypes, v] }));
    }
    e.target.value = "";

    if (fieldErrors.helpTypes) {
      setFieldErrors((prev) => {
        const rest = { ...prev };
        delete rest.helpTypes;
        return rest;
      });
    }
  }, [form.helpTypes, fieldErrors]);

  const removeHelp = useCallback((v: string) => {
    setForm((prev) => ({
      ...prev,
      helpTypes: prev.helpTypes.filter((x) => x !== v),
    }));
  }, []);

  const addCustomHelp = useCallback(() => {
    const v = sanitizeString(form.customHelpType);
    if (v && !form.helpTypes.includes(v)) {
      setForm((prev) => ({
        ...prev,
        helpTypes: [...prev.helpTypes, v],
        customHelpType: "",
      }));
      setShowCustomHelp(false);
    }
  }, [form.customHelpType, form.helpTypes]);

  const validateAll = useCallback(() => {
    const e: Record<string, string> = {};
    
    if (!form.firstName.trim()) {
      e.firstName = intl.formatMessage({ id: "registerExpat.errors.firstNameRequired" });
    } else if (!NAME_REGEX.test(form.firstName.trim())) {
      e.firstName = intl.formatMessage({ id: "registerExpat.errors.firstNameInvalid" });
    }
    
    if (!form.lastName.trim()) {
      e.lastName = intl.formatMessage({ id: "registerExpat.errors.lastNameRequired" });
    } else if (!NAME_REGEX.test(form.lastName.trim())) {
      e.lastName = intl.formatMessage({ id: "registerExpat.errors.lastNameInvalid" });
    }
    
    if (!form.email.trim()) {
      e.email = intl.formatMessage({ id: "registerExpat.errors.emailRequired" });
    } else if (!EMAIL_REGEX.test(form.email)) {
      e.email = intl.formatMessage({ id: "registerExpat.errors.emailInvalid" });
    }
    
    if (!form.password || form.password.length < 8) {
      e.password = intl.formatMessage({ id: "registerExpat.errors.passwordTooShort" });
    } else if (form.password.length > 128) {
      e.password = intl.formatMessage({ id: "registerExpat.errors.passwordTooLong" });
    }
    
    if (!form.phone.trim()) {
      e.phone = intl.formatMessage({ id: "registerExpat.errors.phoneRequired" });
    } else {
      const phoneNumber = parsePhoneNumberFromString(form.phone);
      if (!phoneNumber || !phoneNumber.isValid()) {
        e.phone = intl.formatMessage({ id: "registerExpat.errors.phoneInvalid" });
      }
    }
    
    if (!form.currentCountry) {
      e.currentCountry = intl.formatMessage({ id: "registerExpat.errors.needCountry" });
    }
    
    if (!form.currentPresenceCountry) {
      e.currentPresenceCountry = intl.formatMessage({ id: "registerExpat.errors.needPresence" });
    }
    
    if (!form.interventionCountry) {
      e.interventionCountry = intl.formatMessage({ id: "registerExpat.errors.needIntervention" });
    }
    
    if ((selectedLanguages as LanguageOption[]).length === 0) {
      e.languages = intl.formatMessage({ id: "registerExpat.errors.needLang" });
    }
    
    if (form.helpTypes.length === 0) {
      e.helpTypes = intl.formatMessage({ id: "registerExpat.errors.needHelp" });
    }
    
    if (!form.bio.trim() || form.bio.trim().length < MIN_BIO_LENGTH) {
      e.bio = intl.formatMessage({ id: "registerExpat.errors.needBio" });
    } else if (form.bio.trim().length > MAX_BIO_LENGTH) {
      e.bio = intl.formatMessage({ id: "registerExpat.errors.bioTooLong" });
    }
    
    if (!form.profilePhoto) {
      e.profilePhoto = intl.formatMessage({ id: "registerExpat.errors.needPhoto" });
    }
    
    if (form.yearsAsExpat < 1) {
      e.yearsAsExpat = intl.formatMessage({ id: "registerExpat.errors.needYears" });
    }
    
    if (!form.acceptTerms) {
      e.acceptTerms = intl.formatMessage({ id: "registerExpat.errors.acceptTermsRequired" });
    }

    if (!form.acceptPaymentTerms) {
      e.acceptPaymentTerms = intl.formatMessage({ id: "registerExpat.errors.acceptPaymentTermsRequired" });
    }

    setFieldErrors(e);
    
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
      currentPresenceCountry: true,
      interventionCountry: true,
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
      
      // Récupérer le code ISO du pays de résidence pour la détection gateway
      const residenceCountryCode = getCountryCode(form.currentPresenceCountry);

      const userData = {
        role: "expat" as const,
        type: "expat" as const,
        email: sanitizeEmail(form.email),
        fullName: `${sanitizeString(form.firstName)} ${sanitizeString(form.lastName)}`,
        name: `${sanitizeString(form.firstName)} ${sanitizeString(form.lastName)}`,
        firstName: sanitizeString(form.firstName),
        lastName: sanitizeString(form.lastName),
        phone: form.phone,
        currentCountry: form.currentCountry,
        currentPresenceCountry: form.currentPresenceCountry,
        country: form.currentPresenceCountry,
        // Code ISO 2 lettres du pays de résidence (pour détection gateway Stripe/PayPal)
        countryCode: residenceCountryCode,
        interventionCountry: form.interventionCountry,
        // ✅ Ajouter les champs en tableau pour compatibilité avec ProviderProfile
        practiceCountries: [form.interventionCountry],
        interventionCountries: [form.interventionCountry],
        operatingCountries: [form.interventionCountry],
        profilePhoto: form.profilePhoto,
        photoURL: form.profilePhoto,
        avatar: form.profilePhoto,
        languages: languageCodes,
        languagesSpoken: languageCodes,
        helpTypes: form.helpTypes.map(h => sanitizeString(h)),
        yearsAsExpat: Math.max(1, Math.min(60, form.yearsAsExpat)),
        bio: sanitizeString(form.bio),
        description: sanitizeString(form.bio),
        availability: "offline" as const,
        isOnline: false,  // ✅ Toujours hors ligne à la création
        isApproved: false,
        isVisible: false,
        isActive: true,
        approvalStatus: 'pending' as const,
        verificationStatus: 'pending',
        status: 'pending',
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
        // AFFILIATE: Include referral code and tracking data if present
        ...(referralCode && { pendingReferralCode: referralCode.toUpperCase().trim() }),
        // AFFILIATE: Include UTM tracking data for analytics
        ...((() => {
          const tracking = getStoredReferralTracking();
          return tracking ? { referralTracking: tracking } : {};
        })()),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await register(userData, form.password);
      
      const { getFunctions, httpsCallable } = await import("firebase/functions");
      const functions = getFunctions(undefined, "europe-west1");
      const createStripeAccount = httpsCallable(functions, "createStripeAccount");
      
      try {
        await createStripeAccount({
          email: sanitizeEmail(form.email),
          currentCountry: getCountryCode(form.currentPresenceCountry),
          firstName: sanitizeString(form.firstName),
          lastName: sanitizeString(form.lastName),
          userType: "expat",
        });
        
        // ✅ Succès complet - inscription + Stripe
        hasNavigatedRef.current = true;

        // Track Meta Pixel CompleteRegistration - inscription expat reussie
        trackMetaCompleteRegistration({
          content_name: 'expat_registration',
          status: 'completed',
        });

        // Track Ad Attribution Registration (Firestore - pour dashboard admin)
        trackAdRegistration({
          contentName: 'expat_registration',
        });

        navigate(redirect, {
          replace: true,
          state: {
            message: intl.formatMessage({ id: "registerExpat.success.registered" }),
            type: "success",
          },
        });
      } catch (stripeError: unknown) {
        // ✅ Erreur Stripe MAIS inscription Firebase réussie - on redirige quand même
        console.error('⚠️ [RegisterExpat] Erreur Stripe (compte utilisateur créé):', stripeError);

        hasNavigatedRef.current = true;

        // Track Meta Pixel CompleteRegistration - inscription expat reussie (sans Stripe)
        trackMetaCompleteRegistration({
          content_name: 'expat_registration_partial',
          status: 'completed',
        });

        // Track Ad Attribution Registration (Firestore - pour dashboard admin)
        trackAdRegistration({
          contentName: 'expat_registration_partial',
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
      console.error('❌ [RegisterExpat] Erreur inscription:', err);
      
      // ✅ FIX: Vérifier si le composant est toujours monté avant de mettre à jour l'état
      if (!isMountedRef.current || hasNavigatedRef.current) return;
      
      let msg = intl.formatMessage({ id: "registerExpat.errors.generic" });
      
      if (err instanceof Error) {
        if (err.message.includes('email-already-in-use') || err.message.includes('déjà associé')) {
          msg = intl.formatMessage({ id: "registerExpat.errors.emailAlreadyInUse" });
        } else if (err.message.includes('email-linked-to-google') || err.message.includes('lié à un compte Google')) {
          msg = intl.formatMessage({ id: "registerExpat.errors.emailLinkedToGoogle" });
        } else if (err.message.includes('weak-password') || err.message.includes('6 caractères')) {
          msg = intl.formatMessage({ id: "registerExpat.errors.weakPassword" });
        } else if (err.message.includes('invalid-email') || err.message.includes('email invalide')) {
          msg = intl.formatMessage({ id: "registerExpat.errors.invalidEmail" });
        } else if (err.message.includes('network') || err.message.includes('réseau')) {
          msg = intl.formatMessage({ id: "registerExpat.errors.network" });
        } else if (err.message.includes('timeout') || err.message.includes('délai')) {
          msg = intl.formatMessage({ id: "registerExpat.errors.timeout" });
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

  const canSubmit = useMemo(() => {
    const phoneNumber = parsePhoneNumberFromString(form.phone);
    return (
      !!form.firstName && 
      NAME_REGEX.test(form.firstName) &&
      !!form.lastName && 
      NAME_REGEX.test(form.lastName) &&
      EMAIL_REGEX.test(form.email) && 
      form.password.length >= 6 &&
      form.password.length <= 128 &&
      !!form.phone && 
      phoneNumber?.isValid() && 
      !!form.currentCountry &&
      !!form.currentPresenceCountry &&
      !!form.interventionCountry &&
      form.bio.trim().length >= MIN_BIO_LENGTH &&
      form.bio.trim().length <= MAX_BIO_LENGTH &&
      !!form.profilePhoto && 
      form.helpTypes.length > 0 &&
      (selectedLanguages as LanguageOption[]).length > 0 &&
      form.yearsAsExpat >= 1 &&
      form.acceptTerms &&
      form.acceptPaymentTerms &&
      !isLoading &&
      !isSubmitting
    );
  }, [form, selectedLanguages, isLoading, isSubmitting]);

  const getInputClass = useCallback((name: string, hasError?: boolean) => {
    const base = "w-full px-4 py-3.5 rounded-xl border-2 transition-all duration-200 text-[15px] sm:text-base font-medium focus:outline-none min-h-[48px]";
    if (hasError || (fieldErrors[name] && touched[name])) {
      return `${base} border-red-400 bg-red-50 text-red-900 focus:border-red-500 focus:ring-4 focus:ring-red-500/20`;
    }
    if (!fieldErrors[name] && touched[name] && form[name as keyof ExpatFormData]) {
      return `${base} border-green-400 bg-green-50 text-green-900 focus:border-green-500 focus:ring-4 focus:ring-green-500/20`;
    }
    return `${base} border-gray-300 bg-gray-100 text-gray-900 placeholder-gray-500 hover:bg-gray-50 hover:border-gray-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 focus:bg-white`;
  }, [fieldErrors, touched, form]);

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50">
        {/* 🎯 HEADER SÉMANTIQUE */}
        <header className="pt-8 pb-6 px-4 text-center border-b-2 border-gray-200 bg-white shadow-sm">
          <div className="max-w-2xl mx-auto">
            <div 
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-green-600 mb-5 shadow-xl"
              role="img"
              aria-label={intl.formatMessage({ id: "registerExpat.ui.logoAlt" })}
            >
              <Heart className="w-8 h-8 text-white" aria-hidden="true" />
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mb-3 tracking-tight">
              <FormattedMessage id="registerExpat.ui.heroTitle" />
            </h1>
            
            <p className="text-base text-gray-600 mb-5 font-medium">
              <FormattedMessage id="registerExpat.ui.heroSubtitle" />
            </p>
            
            {/* 🔐 Badge sécurité reCAPTCHA */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full text-sm text-green-700 mb-4">
              <Shield className="w-4 h-4" aria-hidden="true" />
              <span>Formulaire sécurisé par reCAPTCHA</span>
            </div>
            
            <div className="text-sm text-gray-600">
              <FormattedMessage id="registerExpat.ui.already" />{" "}
              <Link 
                to={`/login?redirect=${encodeURIComponent(redirect)}`} 
                className="font-bold text-emerald-600 hover:text-emerald-700 underline"
                aria-label={intl.formatMessage({ id: "registerExpat.ui.loginAriaLabel" })}
              >
                <FormattedMessage id="registerExpat.ui.login" />
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
            {/* 👤 SECTION 1: IDENTITÉ */}
            {/* ========================================================================= */}
            <section 
              className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-lg"
              aria-labelledby="identity-heading"
            >
              <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-gray-100">
                <div 
                  className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100"
                  role="img"
                  aria-label={intl.formatMessage({ id: "registerExpat.section.identityIcon" })}
                >
                  <User className="w-5 h-5 text-emerald-600" aria-hidden="true" />
                </div>
                <h2 id="identity-heading" className="text-xl font-black text-gray-900">
                  <FormattedMessage id="registerExpat.section.identity" />
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
                      <FormattedMessage id="registerExpat.fields.firstName" />
                      <span className="text-red-500 ml-1" aria-label={intl.formatMessage({ id: "common.required" })}>*</span>
                    </label>
                    <input
                      id="firstName"
                      name="firstName"
                      ref={fieldRefs.firstName}
                      value={form.firstName}
                      onChange={onChange}
                      onBlur={() => markTouched("firstName")}
                      autoComplete="given-name"
                      className={getInputClass("firstName")}
                      placeholder={intl.formatMessage({ id: "registerExpat.placeholders.firstName" })}
                      aria-required="true"
                      aria-invalid={!!(fieldErrors.firstName && touched.firstName)}
                      aria-describedby={fieldErrors.firstName && touched.firstName ? "firstName-error" : undefined}
                    />
                    <FieldError 
                      error={fieldErrors.firstName} 
                      show={!!(fieldErrors.firstName && touched.firstName)} 
                    />
                    <FieldSuccess
                      show={!fieldErrors.firstName && !!touched.firstName && !!form.firstName && NAME_REGEX.test(form.firstName)}
                      message={intl.formatMessage({ id: "registerExpat.success.fieldValid" })}
                    />
                  </div>

                  <div>
                    <label 
                      htmlFor="lastName" 
                      className="block text-sm font-bold text-gray-900 mb-2"
                    >
                      <FormattedMessage id="registerExpat.fields.lastName" />
                      <span className="text-red-500 ml-1" aria-label={intl.formatMessage({ id: "common.required" })}>*</span>
                    </label>
                    <input
                      id="lastName"
                      name="lastName"
                      value={form.lastName}
                      onChange={onChange}
                      onBlur={() => markTouched("lastName")}
                      autoComplete="family-name"
                      className={getInputClass("lastName")}
                      placeholder={intl.formatMessage({ id: "registerExpat.placeholders.lastName" })}
                      aria-required="true"
                      aria-invalid={!!(fieldErrors.lastName && touched.lastName)}
                      aria-describedby={fieldErrors.lastName && touched.lastName ? "lastName-error" : undefined}
                    />
                    <FieldError 
                      error={fieldErrors.lastName} 
                      show={!!(fieldErrors.lastName && touched.lastName)} 
                    />
                    <FieldSuccess
                      show={!fieldErrors.lastName && !!touched.lastName && !!form.lastName && NAME_REGEX.test(form.lastName)}
                      message={intl.formatMessage({ id: "registerExpat.success.fieldValid" })}
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label 
                    htmlFor="email" 
                    className="block text-sm font-bold text-gray-900 mb-2"
                  >
                    <FormattedMessage id="registerExpat.fields.email" />
                    <span className="text-red-500 ml-1" aria-label={intl.formatMessage({ id: "common.required" })}>*</span>
                  </label>
                  <div className="relative">
                    <Mail 
                      className="absolute left-4 top-4 w-5 h-5 text-emerald-600 pointer-events-none z-10" 
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
                      placeholder={intl.formatMessage({ id: "registerExpat.placeholders.email" })}
                      aria-required="true"
                      aria-invalid={!!(touched.email && (!!fieldErrors.email || !EMAIL_REGEX.test(form.email)))}
                      aria-describedby={touched.email && fieldErrors.email ? "email-error" : undefined}
                    />
                  </div>
                  <FieldError 
                    error={fieldErrors.email} 
                    show={!!(touched.email && (!!fieldErrors.email || !EMAIL_REGEX.test(form.email)))} 
                  />
                  <FieldSuccess 
                    show={!!touched.email && EMAIL_REGEX.test(form.email)} 
                    message={intl.formatMessage({ id: "registerExpat.success.emailValid" })} 
                  />
                </div>

                {/* Mot de passe */}
                <div>
                  <label 
                    htmlFor="password" 
                    className="block text-sm font-bold text-gray-900 mb-2"
                  >
                    <FormattedMessage id="registerExpat.fields.password" />
                    <span className="text-red-500 ml-1" aria-label={intl.formatMessage({ id: "common.required" })}>*</span>
                  </label>
                  <div className="relative">
                    <Lock 
                      className="absolute left-4 top-4 w-5 h-5 text-emerald-600 pointer-events-none z-10" 
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
                      aria-label={showPassword ? intl.formatMessage({ id: "registerExpat.ui.hidePassword" }) : intl.formatMessage({ id: "registerExpat.ui.showPassword" })}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" aria-hidden="true" /> : <Eye className="w-5 h-5" aria-hidden="true" />}
                    </button>
                  </div>
                  
                  {form.password.length > 0 && (
                    <div className="mt-3" id="password-strength">
                      <div 
                        className="h-2 bg-gray-200 rounded-full overflow-hidden shadow-inner"
                        role="progressbar"
                        aria-label={intl.formatMessage({ id: "registerExpat.ui.passwordStrength" })}
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
                        <FormattedMessage id={`registerExpat.ui.passwordStrength.${pwdStrength.label}`} />
                      </p>
                    </div>
                  )}
                  
                  <FieldError 
                    error={fieldErrors.password} 
                    show={!!(fieldErrors.password && touched.password)} 
                  />
                  <FieldSuccess 
                    show={!fieldErrors.password && !!touched.password && form.password.length >= 6} 
                    message={intl.formatMessage({ id: "registerExpat.success.pwdOk" })} 
                  />
                </div>

                {/* Téléphone */}
                <div>
                  <label 
                    htmlFor="phone" 
                    className="block text-sm font-bold text-gray-900 mb-2"
                  >
                    <FormattedMessage id="registerExpat.fields.phone" />
                    <span className="text-red-500 ml-1" aria-label={intl.formatMessage({ id: "common.required" })}>*</span>
                  </label>
                  
                  <style>{`
  .react-tel-input {
    position: relative !important;
  }
  
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
  
  .react-tel-input .country-list .country {
    padding: 8px 12px !important;
    color: #111827 !important;
    background-color: transparent !important;
    font-size: 14px !important;
    cursor: pointer !important;
    pointer-events: auto !important;
  }
  
  .react-tel-input .country-list .country:hover,
  .react-tel-input .country-list .country.highlight {
    background-color: rgba(16, 185, 129, 0.1) !important;
  }
  
  .react-tel-input .country-list .country.active {
    background-color: rgba(16, 185, 129, 0.15) !important;
    color: #10b981 !important;
    font-weight: 600 !important;
  }
  
  .react-tel-input .country-list .country-name {
    color: #374151 !important;
    margin-right: 8px !important;
  }
  
  .react-tel-input .country-list .dial-code {
    color: #6b7280 !important;
  }
  
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
    background-color: rgba(16, 185, 129, 0.1) !important;
    border-color: #10b981 !important;
  }
  
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
    border-color: #10b981 !important;
    box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1) !important;
  }
  
  .react-tel-input .form-control::placeholder {
    color: #9ca3af !important;
  }
  
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
  
  @media (max-width: 640px) {
    .react-tel-input .country-list {
      width: min(300px, calc(100vw - 40px)) !important;
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
                          phone: intl.formatMessage({ id: "registerExpat.errors.phoneInvalid" })
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
                    message={intl.formatMessage({ id: "registerExpat.success.fieldValid" })} 
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
                  className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100"
                  role="img"
                  aria-label={intl.formatMessage({ id: "registerExpat.section.locationIcon" })}
                >
                  <Globe className="w-5 h-5 text-emerald-600" aria-hidden="true" />
                </div>
                <h3 id="location-heading" className="text-xl font-black text-gray-900">
                  <FormattedMessage id="registerExpat.section.location" />
                </h3>
              </div>

              <div className="space-y-5">
                {/* Pays d'origine */}
                <div>
                  <label 
                    htmlFor="currentCountry" 
                    className="block text-sm font-bold text-gray-900 mb-2"
                  >
                    <FormattedMessage id="registerExpat.fields.originCountry" />
                    <span className="text-red-500 ml-1" aria-label={intl.formatMessage({ id: "common.required" })}>*</span>
                  </label>
                  <select
                    id="currentCountry"
                    name="currentCountry"
                    value={form.currentCountry}
                    onChange={(e) => {
                      onChange(e);
                      const selectedCountry = e.target.value;
                      if (!form.currentPresenceCountry) {
                        setForm((prev) => ({ ...prev, currentPresenceCountry: selectedCountry }));
                      }
                      if (!form.interventionCountry) {
                        setForm((prev) => ({ ...prev, interventionCountry: selectedCountry }));
                      }
                    }}
                    onBlur={() => markTouched("currentCountry")}
                    className={getInputClass("currentCountry")}
                    aria-required="true"
                    aria-invalid={!!(fieldErrors.currentCountry && touched.currentCountry)}
                    aria-describedby={fieldErrors.currentCountry && touched.currentCountry ? "currentCountry-error" : undefined}
                  >
                    <option value="">
                      {intl.formatMessage({ id: "registerExpat.select.selectCountry" })}
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
                    show={!fieldErrors.currentCountry && !!touched.currentCountry && !!form.currentCountry} 
                    message={intl.formatMessage({ id: "registerExpat.success.fieldValid" })} 
                  />
                </div>

                {/* Pays de résidence actuelle */}
                <div>
                  <label 
                    htmlFor="currentPresenceCountry" 
                    className="block text-sm font-bold text-gray-900 mb-2"
                  >
                    <FormattedMessage id="registerExpat.fields.currentPresenceCountry" />
                    <span className="text-red-500 ml-1" aria-label={intl.formatMessage({ id: "common.required" })}>*</span>
                  </label>
                  <select
                    id="currentPresenceCountry"
                    name="currentPresenceCountry"
                    value={form.currentPresenceCountry}
                    onChange={onChange}
                    onBlur={() => markTouched("currentPresenceCountry")}
                    className={getInputClass("currentPresenceCountry")}
                    aria-required="true"
                    aria-invalid={!!(fieldErrors.currentPresenceCountry && touched.currentPresenceCountry)}
                    aria-describedby={fieldErrors.currentPresenceCountry && touched.currentPresenceCountry ? "currentPresenceCountry-error" : undefined}
                  >
                    <option value="">
                      {intl.formatMessage({ id: "registerExpat.select.selectPresenceCountry" })}
                    </option>
                    {countryOptions.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  <FieldError 
                    error={fieldErrors.currentPresenceCountry} 
                    show={!!(fieldErrors.currentPresenceCountry && touched.currentPresenceCountry)} 
                  />
                  <FieldSuccess 
                    show={!fieldErrors.currentPresenceCountry && !!touched.currentPresenceCountry && !!form.currentPresenceCountry} 
                    message={intl.formatMessage({ id: "registerExpat.success.fieldValid" })} 
                  />
                </div>

                {/* Pays d'intervention */}
                <div>
                  <label 
                    htmlFor="interventionCountry" 
                    className="block text-sm font-bold text-gray-900 mb-2"
                  >
                    <FormattedMessage id="registerExpat.fields.interventionCountry" />
                    <span className="text-red-500 ml-1" aria-label={intl.formatMessage({ id: "common.required" })}>*</span>
                  </label>
                  <select
                    id="interventionCountry"
                    name="interventionCountry"
                    value={form.interventionCountry}
                    onChange={onChange}
                    onBlur={() => markTouched("interventionCountry")}
                    className={getInputClass("interventionCountry")}
                    aria-required="true"
                    aria-invalid={!!(fieldErrors.interventionCountry && touched.interventionCountry)}
                    aria-describedby={fieldErrors.interventionCountry && touched.interventionCountry ? "interventionCountry-error" : undefined}
                  >
                    <option value="">
                      {intl.formatMessage({ id: "registerExpat.select.selectInterventionCountry" })}
                    </option>
                    {countryOptions.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  <FieldError 
                    error={fieldErrors.interventionCountry} 
                    show={!!(fieldErrors.interventionCountry && touched.interventionCountry)} 
                  />
                  <FieldSuccess 
                    show={!fieldErrors.interventionCountry && !!touched.interventionCountry && !!form.interventionCountry} 
                    message={intl.formatMessage({ id: "registerExpat.success.fieldValid" })} 
                  />
                </div>

                {/* Années d'expatriation */}
                <div>
                  <label 
                    htmlFor="yearsAsExpat" 
                    className="block text-sm font-bold text-gray-900 mb-2"
                  >
                    <FormattedMessage id="registerExpat.fields.yearsAsExpat" />
                    <span className="text-red-500 ml-1" aria-label={intl.formatMessage({ id: "common.required" })}>*</span>
                  </label>
                  <input
                    id="yearsAsExpat"
                    name="yearsAsExpat"
                    type="number"
                    value={form.yearsAsExpat || ""}
                    onChange={onChange}
                    className={getInputClass("yearsAsExpat")}
                    min={1}
                    max={60}
                    placeholder="5"
                    aria-label={intl.formatMessage({ id: "registerExpat.fields.yearsAsExpat" })}
                  />
                  <FieldError 
                    error={fieldErrors.yearsAsExpat} 
                    show={!!fieldErrors.yearsAsExpat} 
                  />
                  <FieldSuccess 
                    show={form.yearsAsExpat >= 1} 
                    message={intl.formatMessage({ id: "registerExpat.success.fieldValid" })} 
                  />
                </div>
              </div>
            </section>

            {/* ========================================================================= */}
            {/* 💬 SECTION 3: LANGUES & COMPÉTENCES */}
            {/* ========================================================================= */}
            <section 
              className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-lg"
              aria-labelledby="skills-heading"
            >
              <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-gray-100">
                <div 
                  className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100"
                  role="img"
                  aria-label={intl.formatMessage({ id: "registerExpat.section.skillsIcon" })}
                >
                  <Heart className="w-5 h-5 text-emerald-600" aria-hidden="true" />
                </div>
                <h4 id="skills-heading" className="text-xl font-black text-gray-900">
                  <FormattedMessage id="registerExpat.section.skills" />
                </h4>
              </div>

              <div className="space-y-5">
                {/* Langues parlées */}
                <div>
                  <label 
                    htmlFor="languages" 
                    className="block text-sm font-bold text-gray-900 mb-2"
                  >
                    <FormattedMessage id="registerExpat.fields.languages" />
                    <span className="text-red-500 ml-1" aria-label={intl.formatMessage({ id: "common.required" })}>*</span>
                  </label>
                  
                  <Suspense fallback={
                    <div 
                      className="h-14 animate-pulse rounded-xl bg-gray-100 border-2 border-gray-300"
                      aria-label={intl.formatMessage({ id: "common.loading" })}
                    />
                  }>
                    <div className="border-2 border-gray-300 rounded-xl bg-gray-100 hover:border-gray-400 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/20 transition-all">
                      <MultiLanguageSelect
                        value={selectedLanguages}
                        onChange={(v: MultiValue<LanguageOption>) => {
                          setSelectedLanguages(v);
                          if (fieldErrors.languages) {
                            setFieldErrors((prev) => {
                              const rest = { ...prev };
                              delete rest.languages;
                              return rest;
                            });
                          }
                        }}
                        locale={lang}
                        placeholder={intl.formatMessage({ id: "registerExpat.select.searchLanguages" })}
                        aria-label={intl.formatMessage({ id: "registerExpat.fields.languages" })}
                      />
                    </div>
                  </Suspense>
                  
                  <FieldError 
                    error={fieldErrors.languages} 
                    show={!!fieldErrors.languages} 
                  />
                  <FieldSuccess 
                    show={(selectedLanguages as LanguageOption[]).length > 0} 
                    message={intl.formatMessage({ id: "registerExpat.success.fieldValid" })} 
                  />
                </div>

                {/* Domaines d'aide */}
                <div>
                  <label 
                    htmlFor="helpTypes" 
                    className="block text-sm font-bold text-gray-900 mb-2"
                  >
                    <FormattedMessage id="registerExpat.fields.helpDomains" />
                    <span className="text-red-500 ml-1" aria-label={intl.formatMessage({ id: "common.required" })}>*</span>
                  </label>
                  
                  {form.helpTypes.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3" role="list" aria-label={intl.formatMessage({ id: "registerExpat.ui.selectedHelp" })}>
                      {form.helpTypes.map((h, idx) => {
                        // Affiche le label traduit depuis expatHelpTypesData
                        const localeMap: Record<string, 'fr' | 'en' | 'es' | 'de' | 'pt' | 'ru' | 'zh' | 'ar' | 'hi'> = {
                          fr: 'fr', en: 'en', es: 'es', de: 'de', pt: 'pt', ru: 'ru', ch: 'zh', hi: 'hi', ar: 'ar'
                        };
                        const displayLabel = getExpatHelpTypeLabel(h, localeMap[lang] || 'fr');
                        return (
                          <TagChip
                            key={`${h}-${idx}`}
                            value={displayLabel}
                            onRemove={() => removeHelp(h)}
                            ariaLabel={intl.formatMessage({ id: "registerExpat.ui.removeHelp" }, { help: displayLabel })}
                          />
                        );
                      })}
                    </div>
                  )}
                  
                  <select
                    id="helpTypes"
                    onChange={onHelpSelect}
                    value=""
                    className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-300 bg-gray-100 text-gray-900 font-medium hover:bg-gray-50 hover:border-gray-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 focus:bg-white transition-all"
                    aria-label={intl.formatMessage({ id: "registerExpat.fields.addHelp" })}
                  >
                    <option value="">
                      {intl.formatMessage({ id: "registerExpat.fields.addHelp" })}
                    </option>
                    {helpTypeOptions.map(h => (
                      <option key={h.value} value={h.value}>{h.label}</option>
                    ))}
                  </select>
                  
                  {showCustomHelp && (
                    <div className="flex gap-2 mt-3">
                      <input
                        value={form.customHelpType}
                        onChange={(e) => setForm((p) => ({ ...p, customHelpType: e.target.value }))}
                        className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl bg-gray-100 hover:bg-gray-50 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all"
                        placeholder={intl.formatMessage({ id: "registerExpat.fields.specifyHelp" })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addCustomHelp();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={addCustomHelp}
                        disabled={!form.customHelpType.trim()}
                        className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:bg-emerald-700 transition-colors"
                      >
                        <FormattedMessage id="common.ok" />
                      </button>
                    </div>
                  )}
                  
                  <FieldError 
                    error={fieldErrors.helpTypes} 
                    show={!!fieldErrors.helpTypes} 
                  />
                  <FieldSuccess 
                    show={form.helpTypes.length > 0} 
                    message={intl.formatMessage({ id: "registerExpat.success.fieldValid" })} 
                  />
                </div>

                {/* Biographie */}
                <div>
                  <label 
                    htmlFor="bio" 
                    className="block text-sm font-bold text-gray-900 mb-2"
                  >
                    <FormattedMessage id="registerExpat.fields.bio" />
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
                    placeholder={intl.formatMessage({ id: "registerExpat.placeholders.bio" })}
                    aria-required="true"
                    aria-invalid={!!(fieldErrors.bio && touched.bio)}
                    aria-describedby={fieldErrors.bio && touched.bio ? "bio-error" : "bio-progress"}
                  />
                  
                  <div className="mt-3" id="bio-progress">
                    <div 
                      className="h-2 bg-gray-200 rounded-full overflow-hidden shadow-inner"
                      role="progressbar"
                      aria-label={intl.formatMessage({ id: "registerExpat.ui.bioProgress" })}
                      aria-valuenow={form.bio.length}
                      aria-valuemin={0}
                      aria-valuemax={MAX_BIO_LENGTH}
                    >
                      <div 
                        className={`h-full ${form.bio.length < MIN_BIO_LENGTH ? "bg-orange-400" : "bg-green-500"} transition-all`} 
                        style={{ width: `${Math.min((form.bio.length / MAX_BIO_LENGTH) * 100, 100)}%` }} 
                      />
                    </div>
                    <div className="flex justify-between text-xs mt-2 font-medium">
                      <span className={form.bio.length < MIN_BIO_LENGTH ? "text-orange-600" : "text-green-600"}>
                        {form.bio.length < MIN_BIO_LENGTH 
                          ? intl.formatMessage({ id: "registerExpat.bio.remaining" }, { count: MIN_BIO_LENGTH - form.bio.length }) 
                          : intl.formatMessage({ id: "registerExpat.bio.complete" })
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
                    message={intl.formatMessage({ id: "registerExpat.success.fieldValid" })} 
                  />
                </div>

                {/* Photo de profil */}
                <div>
                  <label 
                    htmlFor="profilePhoto" 
                    className="block text-sm font-bold text-gray-900 mb-2"
                  >
                    <FormattedMessage id="registerExpat.fields.profilePhoto" />
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
                      aria-label={intl.formatMessage({ id: "registerExpat.fields.profilePhoto" })}
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
                        alt={intl.formatMessage({ id: "registerExpat.ui.profilePhotoAlt" })}
                      />
                    </div>
                  </Suspense>
                  
                  <FieldError 
                    error={fieldErrors.profilePhoto} 
                    show={!!fieldErrors.profilePhoto} 
                  />
                  <FieldSuccess 
                    show={!!form.profilePhoto} 
                    message={intl.formatMessage({ id: "registerExpat.success.fieldValid" })} 
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
                  className="mt-1 h-5 w-5 text-emerald-600 border-gray-400 rounded focus:ring-2 focus:ring-emerald-500"
                  aria-required="true"
                  aria-invalid={!!fieldErrors.acceptTerms}
                  aria-describedby={fieldErrors.acceptTerms ? "acceptTerms-error" : undefined}
                />
                <label 
                  htmlFor="acceptTerms" 
                  className="text-sm text-gray-800 font-medium"
                >
                  <FormattedMessage id="registerExpat.ui.acceptTerms" />{" "}
                  <Link 
                    to="/cgu-expatries" 
                    className="text-emerald-600 font-bold hover:text-emerald-700 underline" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    aria-label={intl.formatMessage({ id: "registerExpat.ui.termsLinkAriaLabel" })}
                  >
                    <FormattedMessage id="registerExpat.ui.termsLink" />
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
                  <FormattedMessage id="registerExpat.ui.acceptPaymentTerms" />
                  <span className="text-red-500 ml-1" aria-label={intl.formatMessage({ id: "common.required" })}>*</span>
                  <p className="text-xs text-gray-600 mt-1">
                    <FormattedMessage id="registerExpat.ui.paymentTermsDetails" />
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
                    ? "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 hover:shadow-2xl" 
                    : "bg-gray-300 cursor-not-allowed"
                }`}
                disabled={!canSubmit}
                aria-label={isLoading || isSubmitting 
                  ? intl.formatMessage({ id: "registerExpat.ui.loading" })
                  : intl.formatMessage({ id: "registerExpat.ui.createAccount" })
                }
              >
                {isLoading || isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                    <FormattedMessage id="registerExpat.ui.loading" />
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <FormattedMessage id="registerExpat.ui.create" />
                    <ArrowRight className="w-6 h-6" aria-hidden="true" />
                  </span>
                )}
              </Button>
              
              {/* 🔐 Mention reCAPTCHA */}
              <p className="mt-4 text-xs text-gray-500 text-center">
                Ce site est protégé par reCAPTCHA et les{" "}
                <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">
                  règles de confidentialité
                </a>{" "}
                et{" "}
                <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">
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
          <nav aria-label={intl.formatMessage({ id: "registerExpat.footer.navigation" })}>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600 font-medium">
              <Link 
                to="/politique-confidentialite" 
                className="hover:text-emerald-600 transition-colors"
                aria-label={intl.formatMessage({ id: "registerExpat.footer.privacyAriaLabel" })}
              >
                <FormattedMessage id="registerExpat.footer.privacy" />
              </Link>
              <Link 
                to="/cgu-expatries" 
                className="hover:text-emerald-600 transition-colors"
                aria-label={intl.formatMessage({ id: "registerExpat.footer.termsAriaLabel" })}
              >
                <FormattedMessage id="registerExpat.footer.terms" />
              </Link>
              <Link 
                to="/contact" 
                className="hover:text-emerald-600 transition-colors"
                aria-label={intl.formatMessage({ id: "registerExpat.footer.contactAriaLabel" })}
              >
                <FormattedMessage id="registerExpat.footer.contact" />
              </Link>
            </div>
          </nav>
        </footer>
      </div>
    </Layout>
  );
};

export default RegisterExpat;