// src/pages/Login.tsx - VERSION SIMPLIFIÉE UX OPTIMALE
// ✅ Formulaire toujours visible (pas de logique conditionnelle complexe)
// ✅ Vérification email non-bloquante en arrière-plan
// ✅ Hint discret si email inconnu
// ✅ Structure HTML sémantique parfaite (H1-H6)
// ✅ Schema.org complet + FAQ optimisée Google Snippet
// ✅ SEO complet (Meta, OpenGraph, Twitter, Hreflang)

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  Component,
} from "react";
import {
  Link,
  useSearchParams,
  useLocation,
} from "react-router-dom";
import { useLocaleNavigate } from "../multilingual-system";
import { useIntl } from "react-intl";
import {
  Eye,
  EyeOff,
  AlertCircle,
  LogIn,
  Mail,
  Lock,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Info,
} from "lucide-react";
import LoadingSpinner from "../components/common/LoadingSpinner";
import Layout from "../components/layout/Layout";
import Button from "../components/common/Button";
import ExtensionBlockedAlert from "../components/common/ExtensionBlockedAlert";
import { useAuth } from "../contexts/AuthContext";
import { isExtensionBlockedError } from "../utils/networkResilience";
import { useApp } from "../contexts/AppContext";
import type { Provider } from "../contexts/types";
import {
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  getRedirectResult,
  fetchSignInMethodsForEmail,
} from "firebase/auth";
import { auth } from "../config/firebase";
import {
  getLocaleString,
  getTranslatedRouteSlug,
  parseLocaleFromPath,
  hasLocalePrefix,
  getRouteKeyFromSlug,
  getAllTranslatedSlugs,
} from "../multilingual-system/core/routing/localeRoutes";

// ==================== SECURITY: REDIRECT WHITELIST ====================
/**
 * Validates that a redirect URL is safe (prevents Open Redirect attacks)
 * Only allows:
 * - Relative paths starting with / (but not //)
 * - Same-origin absolute URLs
 */
const isAllowedRedirect = (url: string): boolean => {
  // Empty or null → not allowed (will use default)
  if (!url) return false;

  // Relative paths starting with / are allowed, but not // (protocol-relative)
  if (url.startsWith('/')) {
    return !url.startsWith('//');
  }

  // For absolute URLs, verify same origin
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin === window.location.origin;
  } catch {
    return false;
  }
};

// ==================== TYPES ====================
interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

type EmailCheckStatus = "idle" | "checking" | "exists" | "not-exists" | "error";

type GtagFunction = (...args: unknown[]) => void;
interface GtagWindow {
  gtag?: GtagFunction;
}
const getGtag = (): GtagFunction | undefined =>
  typeof window !== "undefined"
    ? (window as unknown as GtagWindow).gtag
    : undefined;

// ==================== FAQ DATA ====================
const FAQ_DATA = [
  { questionKey: "faq.login.q1", answerKey: "faq.login.a1" },
  { questionKey: "faq.login.q2", answerKey: "faq.login.a2" },
  { questionKey: "faq.login.q3", answerKey: "faq.login.a3" },
  { questionKey: "faq.login.q4", answerKey: "faq.login.a4" },
  { questionKey: "faq.login.q5", answerKey: "faq.login.a5" },
  { questionKey: "faq.login.q6", answerKey: "faq.login.a6" },
  { questionKey: "faq.login.q7", answerKey: "faq.login.a7" },
  { questionKey: "faq.login.q8", answerKey: "faq.login.a8" },
] as const;

// ==================== FAQ COMPONENT ====================
const FAQSection: React.FC = React.memo(() => {
  const intl = useIntl();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = useCallback((index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  }, []);

  return (
    <section 
      className="w-full max-w-2xl mx-auto mt-16 mb-8 px-4" 
      aria-labelledby="faq-section-title"
      itemScope 
      itemType="https://schema.org/FAQPage"
    >
      <article className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6 sm:p-8">
        <h2 
          id="faq-section-title" 
          className="text-2xl sm:text-3xl font-bold text-white mb-2 text-center"
        >
          {intl.formatMessage({ id: "faq.login.section_title" })}
        </h2>
        
        <h3 className="text-sm sm:text-base text-gray-300 mb-6 text-center font-normal">
          {intl.formatMessage({ id: "faq.login.section_description" })}
        </h3>

        <div className="space-y-3" role="list">
          {FAQ_DATA.map((faq, index) => {
            const questionText = intl.formatMessage({ id: faq.questionKey });
            const answerText = intl.formatMessage({ id: faq.answerKey });
            
            return (
              <div 
                key={index} 
                className="bg-white/5 rounded-xl border border-white/10 overflow-hidden transition-all hover:bg-white/10" 
                role="listitem"
                itemScope 
                itemProp="mainEntity" 
                itemType="https://schema.org/Question"
              >
                <h4 itemProp="name">
                  <button
                    onClick={() => toggleFAQ(index)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left transition-colors"
                    aria-expanded={openIndex === index}
                    aria-controls={`faq-answer-${index}`}
                    id={`faq-question-${index}`}
                  >
                    <span className="text-white font-semibold text-sm sm:text-base pr-4">
                      {questionText}
                    </span>
                    {openIndex === index ? (
                      <ChevronUp className="w-5 h-5 text-red-400 flex-shrink-0" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" aria-hidden="true" />
                    )}
                  </button>
                </h4>
                
                {openIndex === index && (
                  <div 
                    className="px-5 pb-4" 
                    id={`faq-answer-${index}`} 
                    role="region" 
                    aria-labelledby={`faq-question-${index}`}
                    itemScope 
                    itemProp="acceptedAnswer" 
                    itemType="https://schema.org/Answer"
                  >
                    <h5 className="sr-only">{intl.formatMessage({ id: "faq.login.answer_label" })}</h5>
                    <p 
                      className="text-gray-300 text-sm sm:text-base leading-relaxed"
                      itemProp="text"
                    >
                      {answerText}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </article>
    </section>
  );
});

FAQSection.displayName = "FAQSection";

// ==================== ERROR BOUNDARY ====================
interface ErrorBoundaryProps {
  children: React.ReactNode;
  FallbackComponent: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorFallbackProps {
  error: Error | null;
  resetErrorBoundary: () => void;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <this.props.FallbackComponent
          error={this.state.error}
          resetErrorBoundary={() => this.setState({ hasError: false, error: null })}
        />
      );
    }
    return this.props.children;
  }
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ resetErrorBoundary }) => {
  const intl = useIntl();
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center px-4">
      <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl max-w-md w-full text-center border border-red-500/30">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-white" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">{intl.formatMessage({ id: "error.title" })}</h2>
        <p className="text-gray-300 mb-6 text-sm">{intl.formatMessage({ id: "error.description" })}</p>
        <Button 
          onClick={resetErrorBoundary} 
          className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold py-3 px-6 rounded-xl"
        >
          {intl.formatMessage({ id: "error.retry" })}
        </Button>
      </div>
    </div>
  );
};

// ==================== MAIN COMPONENT ====================
const Login: React.FC = () => {
  const intl = useIntl();
  const { language } = useApp();
  const navigate = useLocaleNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { login, loginWithGoogle, isLoading, error, user, authInitialized, isFullyReady } = useAuth();

  // Helper function to translate auth error codes
  const translateAuthError = (errorCode: string | null): string | null => {
    if (!errorCode) return null;
    const errorKeys: Record<string, string> = {
      'GOOGLE_ROLE_RESTRICTION': 'auth.error.googleRoleRestriction',
    };
    const translationKey = errorKeys[errorCode];
    if (translationKey) {
      return intl.formatMessage({ id: translationKey });
    }
    return errorCode;
  };

  // ==================== STATE ====================
  const [formData, setFormData] = useState<LoginFormData>({ 
    email: "", 
    password: "", 
    rememberMe: false 
  });
  
  const emailDebounceRef = useRef<number | null>(null);
  const passwordDebounceRef = useRef<number | null>(null);
  const googleLoginTimeoutRef = useRef<number | null>(null);
  const emailCheckTimeoutRef = useRef<number | null>(null);
  
  const [localLoading, setLocalLoading] = useState<boolean>(false);
  const [emailCheckStatus, setEmailCheckStatus] = useState<EmailCheckStatus>("idle");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitAttempts, setSubmitAttempts] = useState<number>(0);
  const [showExtensionBlockedAlert, setShowExtensionBlockedAlert] = useState<boolean>(false);
  const [isRetryingConnection, setIsRetryingConnection] = useState<boolean>(false);

  // Get redirect URL from sessionStorage first (most reliable), then query params, then default to dashboard
  // sessionStorage is set BEFORE navigation, so it's more reliable than query params which might get lost
  // If user came from translation on provider profile, redirect back to that profile
  // Otherwise, redirect to dashboard
  const redirectFromStorage = sessionStorage.getItem("loginRedirect");
  const redirectFromParams = searchParams.get("redirect");

  // Priority: sessionStorage > query params > default dashboard
  // sessionStorage is set by TranslationBanner before navigation, so it's most reliable
  // SECURITY: Validate redirect URL to prevent Open Redirect attacks
  const rawRedirect = redirectFromStorage || redirectFromParams || "/dashboard";
  const redirectUrl = isAllowedRedirect(rawRedirect) ? rawRedirect : "/dashboard";
  
  // If we have redirect from params but not in storage, store the VALIDATED URL as backup
  // SECURITY: Always store the validated redirect, never the raw params
  useEffect(() => {
    if (redirectFromParams && !redirectFromStorage) {
      // Only store if the redirect is valid, otherwise don't store anything
      if (isAllowedRedirect(redirectFromParams)) {
        sessionStorage.setItem("loginRedirect", redirectFromParams);
      }
    }
  }, [redirectFromParams, redirectFromStorage]);
  
  const encodedRedirectUrl = encodeURIComponent(redirectUrl);
  const currentLang = language || "fr";

  // ==================== CLEANUP ====================
  useEffect(() => {
    return () => {
      if (emailDebounceRef.current) window.clearTimeout(emailDebounceRef.current);
      if (passwordDebounceRef.current) window.clearTimeout(passwordDebounceRef.current);
      if (googleLoginTimeoutRef.current) window.clearTimeout(googleLoginTimeoutRef.current);
      if (emailCheckTimeoutRef.current) window.clearTimeout(emailCheckTimeoutRef.current);
    };
  }, []);

  // ==================== SEO METADATA ====================
  const metaData = useMemo(() => {
    // IMPORTANT: Use production URL directly for canonical to ensure consistency
    const baseUrl = import.meta.env.PROD ? 'https://sos-expat.com' : window.location.origin;
    const localePrefix = getLocaleString(currentLang as any);
    const loginSlug = getTranslatedRouteSlug('login', currentLang as any);
    const canonicalUrl = `${baseUrl}/${localePrefix}/${loginSlug}`;

    return {
      title: intl.formatMessage({ id: "seo.login.meta_title" }),
      description: intl.formatMessage({ id: "seo.login.meta_description" }),
      keywords: intl.formatMessage({ id: "seo.login.meta_keywords" }),
      ogTitle: intl.formatMessage({ id: "seo.login.og_title" }),
      ogDescription: intl.formatMessage({ id: "seo.login.og_description" }),
      ogImage: `${baseUrl}/og-image.png`,
      ogImageAlt: intl.formatMessage({ id: "seo.login.og_image_alt" }),
      twitterTitle: intl.formatMessage({ id: "seo.login.twitter_title" }),
      twitterDescription: intl.formatMessage({ id: "seo.login.twitter_description" }),
      canonicalUrl,
      alternateUrls: {
        'x-default': `${baseUrl}/en-us/${getTranslatedRouteSlug('login', 'en')}`,
        fr: `${baseUrl}/fr-fr/${getTranslatedRouteSlug('login', 'fr')}`,
        en: `${baseUrl}/en-us/${getTranslatedRouteSlug('login', 'en')}`,
        es: `${baseUrl}/es-es/${getTranslatedRouteSlug('login', 'es')}`,
        de: `${baseUrl}/de-de/${getTranslatedRouteSlug('login', 'de')}`,
        ru: `${baseUrl}/ru-ru/${getTranslatedRouteSlug('login', 'ru')}`,
        'zh-Hans': `${baseUrl}/zh-cn/${getTranslatedRouteSlug('login', 'ch')}`,
        pt: `${baseUrl}/pt-pt/${getTranslatedRouteSlug('login', 'pt')}`,
        ar: `${baseUrl}/ar-sa/${getTranslatedRouteSlug('login', 'ar')}`,
        hi: `${baseUrl}/hi-in/${getTranslatedRouteSlug('login', 'hi')}`,
      },
      structuredData: {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebSite",
            "@id": `${baseUrl}/#website`,
            name: "SOS Expats",
            url: baseUrl,
            potentialAction: {
              "@type": "SearchAction",
              target: `${baseUrl}/search?q={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
            inLanguage: ["fr", "en", "es", "de", "ru", "zh", "pt", "ar", "hi"],
          },
          {
            "@type": "Organization",
            "@id": `${baseUrl}/#organization`,
            name: "SOS Expats",
            url: baseUrl,
            logo: {
              "@type": "ImageObject",
              url: `${baseUrl}/logo.png`,
              width: 512,
              height: 512,
            },
            sameAs: [
              "https://www.facebook.com/sos-expat",
              "https://www.twitter.com/sos-expat",
              "https://www.linkedin.com/company/sos-expat",
            ],
            contactPoint: {
              "@type": "ContactPoint",
              contactType: "Customer Support",
              url: "https://sos-expat.com/contact",
              availableLanguage: ["French", "English", "Spanish", "German", "Russian", "Chinese", "Portuguese", "Arabic", "Hindi"],
            },
          },
          {
            "@type": "WebPage",
            "@id": `${canonicalUrl}#webpage`,
            name: intl.formatMessage({ id: "seo.login.meta_title" }),
            description: intl.formatMessage({ id: "seo.login.meta_description" }),
            url: canonicalUrl,
            inLanguage: currentLang,
            isPartOf: {
              "@id": `${baseUrl}/#website`,
            },
            about: {
              "@id": `${baseUrl}/#organization`,
            },
            datePublished: "2024-01-01T00:00:00+00:00",
            dateModified: new Date().toISOString(),
          },
          {
            "@type": "FAQPage",
            "@id": `${canonicalUrl}#faqpage`,
            name: intl.formatMessage({ id: "faq.login.section_title" }),
            description: intl.formatMessage({ id: "faq.login.section_description" }),
            mainEntity: FAQ_DATA.map((faq) => ({
              "@type": "Question",
              name: intl.formatMessage({ id: faq.questionKey }),
              acceptedAnswer: {
                "@type": "Answer",
                text: intl.formatMessage({ id: faq.answerKey }),
              },
            })),
          },
        ],
      },
    };
  }, [currentLang, intl]);

  // ==================== META TAGS UPDATE ====================
  useEffect(() => {
    document.title = metaData.title;

    const updateMetaTag = (selector: string, content: string, attribute = 'name') => {
      let meta = document.querySelector(`meta[${attribute}="${selector}"]`) as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(attribute, selector);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    // Basic SEO
    updateMetaTag("description", metaData.description);
    updateMetaTag("keywords", metaData.keywords);
    updateMetaTag("robots", "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1");
    updateMetaTag("author", "SOS Expats");
    
    // Mobile
    updateMetaTag("viewport", "width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes");
    updateMetaTag("mobile-web-app-capable", "yes");
    updateMetaTag("apple-mobile-web-app-capable", "yes");
    updateMetaTag("apple-mobile-web-app-status-bar-style", "black-translucent");
    updateMetaTag("theme-color", "#1f2937");
    
    // OpenGraph
    updateMetaTag("og:type", "website", "property");
    updateMetaTag("og:site_name", "SOS Expats", "property");
    updateMetaTag("og:title", metaData.ogTitle, "property");
    updateMetaTag("og:description", metaData.ogDescription, "property");
    updateMetaTag("og:url", metaData.canonicalUrl, "property");
    updateMetaTag("og:image", metaData.ogImage, "property");
    updateMetaTag("og:image:secure_url", metaData.ogImage, "property");
    updateMetaTag("og:image:width", "1200", "property");
    updateMetaTag("og:image:height", "630", "property");
    updateMetaTag("og:image:alt", metaData.ogImageAlt, "property");
    updateMetaTag("og:locale", currentLang === 'fr' ? 'fr_FR' : currentLang === 'en' ? 'en_US' : `${currentLang}_${currentLang.toUpperCase()}`, "property");

    // Twitter Cards
    updateMetaTag("twitter:card", "summary_large_image");
    updateMetaTag("twitter:site", "@sos-expat");
    updateMetaTag("twitter:creator", "@sos-expat");
    updateMetaTag("twitter:title", metaData.twitterTitle);
    updateMetaTag("twitter:description", metaData.twitterDescription);
    updateMetaTag("twitter:image", metaData.ogImage);
    updateMetaTag("twitter:image:alt", metaData.ogImageAlt);

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = metaData.canonicalUrl;

    // Hreflang
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((link) => link.remove());
    Object.entries(metaData.alternateUrls).forEach(([lang, url]) => {
      const alternate = document.createElement("link");
      alternate.rel = "alternate";
      alternate.hreflang = lang;
      alternate.href = url;
      document.head.appendChild(alternate);
    });

    // Structured Data
    let structuredDataScript = document.querySelector("#structured-data") as HTMLScriptElement | null;
    if (!structuredDataScript) {
      structuredDataScript = document.createElement("script");
      structuredDataScript.id = "structured-data";
      structuredDataScript.type = "application/ld+json";
      document.head.appendChild(structuredDataScript);
    }
    structuredDataScript.textContent = JSON.stringify(metaData.structuredData);

    // Preconnect
    const addPreconnect = (href: string) => {
      if (!document.querySelector(`link[rel="preconnect"][href="${href}"]`)) {
        const link = document.createElement("link");
        link.rel = "preconnect";
        link.href = href;
        link.crossOrigin = "anonymous";
        document.head.appendChild(link);
      }
    };
    
    addPreconnect("https://accounts.google.com");
    addPreconnect("https://www.googleapis.com");
    addPreconnect("https://firebaseapp.com");
  }, [metaData, currentLang]);

  // ==================== NAVIGATION ====================
  const navigateToRegister = useCallback(() => {
    const registerUrl = `/register?redirect=${encodedRedirectUrl}&email=${encodeURIComponent(formData.email)}`;
    navigate(registerUrl, { state: { ...location.state, email: formData.email } });
  }, [encodedRedirectUrl, navigate, location.state, formData.email]);

  type NavState = Readonly<{ selectedProvider?: Provider }>;
  function isProviderLike(v: unknown): v is Provider {
    if (typeof v !== "object" || v === null) return false;
    const o = v as Record<string, unknown>;
    return typeof o.id === "string" && typeof o.name === "string" && (o.type === "lawyer" || o.type === "expat");
  }

  // ==================== REMEMBER ME ====================
  useEffect(() => {
    const savedRememberMe = localStorage.getItem("rememberMe") === "1";
    const savedEmail = localStorage.getItem("savedEmail") || "";
    if (savedRememberMe && savedEmail) {
      setFormData((prev) => ({ ...prev, email: savedEmail, rememberMe: true }));
    }
  }, []);

  // ==================== STORE PROVIDER ====================
  useEffect(() => {
    const rawState: unknown = location.state;
    const state = (rawState ?? null) as NavState | null;
    const sp = state?.selectedProvider;

    if (isProviderLike(sp)) {
      try {
        sessionStorage.setItem("selectedProvider", JSON.stringify(sp));
      } catch {
        // Ignore storage errors
      }
    }
  }, [location.state]);

  // ==================== EMAIL CHECK (NON-BLOQUANT) ====================
  // ⚠️ IMPORTANT: Firebase a activé "Email Enumeration Protection" par défaut
  // fetchSignInMethodsForEmail retourne TOUJOURS un tableau vide pour des raisons de sécurité
  // On ne peut donc plus vérifier si un email existe ou non côté client
  // Voir: https://cloud.google.com/identity-platform/docs/admin/email-enumeration-protection
  const checkEmailExists = useCallback(async (email: string): Promise<boolean> => {
    try {
      setEmailCheckStatus("checking");
      const signInMethods = await fetchSignInMethodsForEmail(auth, email);

      console.log('🔍 Email check:', email, 'Methods:', signInMethods);

      // ✅ FIX: Avec Email Enumeration Protection activée, signInMethods est toujours vide
      // On ne peut pas savoir si l'email existe, donc on reste en état "idle"
      // pour ne pas induire l'utilisateur en erreur avec "email non enregistré"
      const exists = signInMethods.length > 0;

      // Si la protection est activée (tableau vide), on reste en "idle" au lieu de "not-exists"
      // Cela évite d'afficher le message trompeur "email non enregistré"
      if (signInMethods.length === 0) {
        // Protection activée OU email vraiment inconnu - on ne peut pas savoir
        // Donc on ne montre aucun indicateur pour ne pas induire en erreur
        setEmailCheckStatus("idle");
      } else {
        // Si on a des méthodes, l'email existe vraiment (protection désactivée)
        setEmailCheckStatus("exists");
      }

      const gtag = getGtag();
      if (gtag) {
        const emailParts = email.split("@");
        gtag("event", "email_check", {
          email_exists: exists,
          email_domain: emailParts[1] || 'unknown',
          auth_methods: signInMethods
        });
      }
      return exists;
    } catch (error) {
      console.error("Error checking email:", error);
      setEmailCheckStatus("idle"); // "idle" au lieu de "error" pour UX plus propre
      return false;
    }
  }, []);

  // ==================== AUTO-CHECK EMAIL ====================
  useEffect(() => {
    if (emailCheckTimeoutRef.current) window.clearTimeout(emailCheckTimeoutRef.current);
    
    const email = formData.email.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailCheckStatus("idle");
      return;
    }

    emailCheckTimeoutRef.current = window.setTimeout(() => {
      checkEmailExists(email);
    }, 800);
  }, [formData.email, checkEmailExists]);

  // ==================== VALIDATION ====================
  const emailRegex = useMemo(
    () => /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    []
  );

  const validateField = useMemo(
    () => (field: keyof LoginFormData, value: string | boolean): string | null => {
      switch (field) {
        case "email":
          if (!value) return intl.formatMessage({ id: "validation.email.required" });
          if (typeof value === "string" && !emailRegex.test(value)) 
            return intl.formatMessage({ id: "validation.email.invalid" });
          return null;
        case "password":
          if (!value) return intl.formatMessage({ id: "validation.password.required" });
          if (typeof value === "string" && value.length < 6) 
            return intl.formatMessage({ id: "validation.password.min_length" });
          return null;
        default:
          return null;
      }
    },
    [emailRegex, intl]
  );

  const validateForm = useCallback((): boolean => {
    const errors: FormErrors = {};
    const emailError = validateField("email", formData.email);
    const passwordError = validateField("password", formData.password);
    if (emailError) errors.email = emailError;
    if (passwordError) errors.password = passwordError;
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, validateField]);

  const handleFieldChange = useCallback(
    (field: keyof LoginFormData, value: string | boolean) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      
      if (formErrors[field as keyof FormErrors]) {
        setFormErrors((prev) => ({ ...prev, [field]: undefined }));
      }

      if (typeof value === "string") {
        const ref = 
          field === "email" 
            ? emailDebounceRef 
            : field === "password" 
            ? passwordDebounceRef 
            : null;
            
        if (ref) {
          if (ref.current) window.clearTimeout(ref.current);
          ref.current = window.setTimeout(() => {
            const err = validateField(field as keyof LoginFormData, value);
            if (err) setFormErrors((prev) => ({ ...prev, [field]: err }));
          }, 300);
        }
      }
    },
    [formErrors, validateField]
  );

  const isFormValid = useMemo(
    () => !formErrors.email && 
          !formErrors.password && 
          formData.email.length > 0 && 
          formData.password.length > 0,
    [formErrors, formData]
  );

  // ==================== REDIRECT ====================
  useEffect(() => {
    // ✅ FIX FLASH P0: Utiliser isFullyReady qui garantit que TOUT est chargé
    // isFullyReady = authInitialized AND !isLoading (défini dans AuthContext)
    // Cela évite les race conditions entre les différents états
    if (isFullyReady && user) {
      // Get redirect URL - prioritize sessionStorage (set before navigation) over query params
      // sessionStorage is more reliable because it's set BEFORE navigation happens
      const redirectFromStorage = sessionStorage.getItem("loginRedirect");
      const redirectFromParams = searchParams.get("redirect");

      // ✅ ROLE-BASED REDIRECT: Rediriger vers le dashboard approprié selon le rôle
      // Les rôles sont mutuellement exclusifs : chatter, influencer, blogger ne sont ni client, ni avocat, ni expat
      let defaultDashboard = "/dashboard";
      if (user.role === "chatter") {
        defaultDashboard = "/chatter/dashboard";
      } else if (user.role === "influencer") {
        defaultDashboard = "/influencer/tableau-de-bord";
      } else if (user.role === "blogger") {
        defaultDashboard = "/blogger/tableau-de-bord";
      }

      // FIX: If a provider was selected (user clicked "Réserver" before login),
      // redirect to booking form even if no explicit loginRedirect was set
      let bookingRedirectFromProvider: string | null = null;
      if (!redirectFromStorage && !redirectFromParams) {
        try {
          const selectedProviderRaw = sessionStorage.getItem('selectedProvider');
          if (selectedProviderRaw) {
            const selectedProvider = JSON.parse(selectedProviderRaw);
            const providerIdentifier = selectedProvider.shortId || selectedProvider.id;
            if (providerIdentifier) {
              bookingRedirectFromProvider = `/booking-request/${providerIdentifier}`;
            }
          }
        } catch {
          // Ignore parse errors
        }
      }

      const rawRedirectToUse = redirectFromStorage || redirectFromParams || bookingRedirectFromProvider || defaultDashboard;

      // Decode the redirect URL (it was encoded when passed to login page)
      const decodedRedirect = decodeURIComponent(rawRedirectToUse);

      // SECURITY: Validate redirect URL to prevent Open Redirect attacks
      let finalUrl = isAllowedRedirect(decodedRedirect) ? decodedRedirect : defaultDashboard;

      // ✅ FIX MULTILINGUE: Construire l'URL correcte avec locale et slug traduit
      // pour éviter les redirections multiples par LocaleRouter
      if (!finalUrl.startsWith('/admin') && !finalUrl.startsWith('/marketing')) {
        // Obtenir la locale correcte (format "fr-fr", "en-us", etc.)
        const localePrefix = getLocaleString(currentLang as any);

        // Vérifier si l'URL a déjà un préfixe de locale
        if (!hasLocalePrefix(finalUrl)) {
          // Extraire le chemin sans le / initial
          const pathWithoutSlash = finalUrl.startsWith('/') ? finalUrl.slice(1) : finalUrl;

          // Trouver le slug traduit pour ce chemin
          // Ex: "dashboard" → "tableau-de-bord" pour le français
          const pathSegments = pathWithoutSlash.split('/').filter(Boolean);
          if (pathSegments.length > 0) {
            // Essayer de trouver une route correspondante
            // Track how many segments matched so we can preserve the rest (e.g. /:providerId)
            let routeKey = getRouteKeyFromSlug(pathWithoutSlash);
            let matchedSegmentCount = pathSegments.length;
            if (!routeKey && pathSegments.length >= 2) {
              routeKey = getRouteKeyFromSlug(`${pathSegments[0]}/${pathSegments[1]}`);
              matchedSegmentCount = 2;
            }
            if (!routeKey) {
              routeKey = getRouteKeyFromSlug(pathSegments[0]);
              matchedSegmentCount = 1;
            }

            if (routeKey) {
              // On a trouvé une route, utiliser le slug traduit
              // Preserve remaining path segments (e.g. /booking-request/abc123 → /demande-reservation/abc123)
              const translatedSlug = getTranslatedRouteSlug(routeKey, currentLang as any);
              const remainingPath = pathSegments.slice(matchedSegmentCount).join('/');
              finalUrl = `/${localePrefix}/${translatedSlug}${remainingPath ? '/' + remainingPath : ''}`;
            } else {
              // Pas de route trouvée, juste ajouter le préfixe de locale
              finalUrl = `/${localePrefix}${finalUrl.startsWith('/') ? finalUrl : '/' + finalUrl}`;
              console.log("[Login] Added locale prefix:", finalUrl);
            }
          } else {
            // Chemin vide, aller à la home localisée
            finalUrl = `/${localePrefix}`;
          }
        } else {
          // L'URL a déjà une locale, vérifier si le slug doit être traduit
          const { lang, pathWithoutLocale } = parseLocaleFromPath(finalUrl);
          if (lang && pathWithoutLocale) {
            const pathSegments = pathWithoutLocale.split('/').filter(Boolean);
            if (pathSegments.length > 0) {
              const routeKey = getRouteKeyFromSlug(pathSegments[0]);
              if (routeKey) {
                const translatedSlug = getTranslatedRouteSlug(routeKey, lang as any);
                if (pathSegments[0] !== translatedSlug) {
                  const remainingPath = pathSegments.slice(1).join('/');
                  finalUrl = `/${getLocaleString(lang as any)}/${translatedSlug}${remainingPath ? '/' + remainingPath : ''}`;
                }
              }
            }
          }
        }
      }

      // Clear the stored redirect after using it (important to prevent reusing old redirects)
      sessionStorage.removeItem("loginRedirect");

      const getUserId = (u: unknown): string | undefined => {
        const obj = u as { uid?: string; id?: string };
        return obj?.uid || obj?.id;
      };

      const gtag = getGtag();
      if (gtag) {
        gtag("event", "login_success", {
          method: "email",
          user_id: getUserId(user),
          redirect_url: finalUrl,
        });
      }

      // Only clear selectedProvider if not going to booking or provider profile
      // This preserves provider data when user returns to profile after login (e.g., from translation)
      // Check all translated booking slugs (e.g. "demande-reservation", "booking-request", etc.)
      const bookingSlugs = getAllTranslatedSlugs("booking-request" as any);
      const goingToBooking = bookingSlugs.some(slug => finalUrl.includes(`/${slug}/`) || finalUrl.endsWith(`/${slug}`));
      const goingToProviderProfile = finalUrl.includes("/avocat/") ||
                                     finalUrl.includes("/expatrie/") ||
                                     finalUrl.includes("/expats/") ||
                                     finalUrl.includes("/lawyers/") ||
                                     finalUrl.includes("/provider/");

      if (!goingToBooking && !goingToProviderProfile) {
        sessionStorage.removeItem("selectedProvider");
      }
      sessionStorage.removeItem("loginAttempts");

      navigate(finalUrl, { replace: true });
    }
  }, [isFullyReady, user, navigate, searchParams, currentLang]);

  // ==================== FORM SUBMIT ====================
  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      // Protection contre le double-clic
      if (localLoading) return;

      if (!validateForm()) {
        setSubmitAttempts((prev) => prev + 1);
        return;
      }

      setLocalLoading(true);
      try {
        const persistenceType = formData.rememberMe
          ? browserLocalPersistence
          : browserSessionPersistence;
        await setPersistence(auth, persistenceType);

        if (formData.rememberMe) {
          localStorage.setItem("rememberMe", "1");
          localStorage.setItem("savedEmail", formData.email.trim().toLowerCase());
        } else {
          localStorage.removeItem("rememberMe");
          localStorage.removeItem("savedEmail");
        }

        await login(formData.email.trim().toLowerCase(), formData.password);
      } catch (loginError) {
        setSubmitAttempts((prev) => prev + 1);
        setLocalLoading(false);

        // Détecter si l'erreur est causée par une extension bloquante
        if (isExtensionBlockedError(loginError)) {
          setShowExtensionBlockedAlert(true);
        }
      }
    },
    [formData, validateForm, login, localLoading]
  );

  // Fonction de retry après alerte extension
  const handleRetryAfterExtensionBlock = useCallback(async () => {
    setIsRetryingConnection(true);
    try {
      await login(formData.email.trim().toLowerCase(), formData.password);
      setShowExtensionBlockedAlert(false);
    } catch (retryError) {
      console.error("Retry failed:", retryError);
      // L'alerte reste visible pour que l'utilisateur puisse essayer les solutions
    } finally {
      setIsRetryingConnection(false);
    }
  }, [formData, login]);

  // ==================== GOOGLE LOGIN ====================
  const handleGoogleLogin = useCallback(async () => {
    try {
      setLocalLoading(true);

      const persistenceType = formData.rememberMe
        ? browserLocalPersistence
        : browserSessionPersistence;
      await setPersistence(auth, persistenceType);

      googleLoginTimeoutRef.current = window.setTimeout(() => {
        console.log("Google login timeout");
        setLocalLoading(false);
      }, 15000);

      // Save the actual redirect URL (from params or storage) before Google redirect
      // This overrides AuthContext's default (which saves the login page URL)
      // SECURITY: Validate the redirect URL before storing
      const rawSavedRedirect = sessionStorage.getItem("loginRedirect") || searchParams.get("redirect");
      if (rawSavedRedirect && isAllowedRedirect(rawSavedRedirect)) {
        sessionStorage.setItem('googleAuthRedirect', rawSavedRedirect);
        console.log('[Login] Saved validated redirect URL for Google login:', rawSavedRedirect);
      }

      await loginWithGoogle();

      if (googleLoginTimeoutRef.current) {
        window.clearTimeout(googleLoginTimeoutRef.current);
        googleLoginTimeoutRef.current = null;
      }
      setLocalLoading(false);
    } catch (googleError) {
      console.error("Google login error:", googleError);
      
      if (googleLoginTimeoutRef.current) {
        window.clearTimeout(googleLoginTimeoutRef.current);
        googleLoginTimeoutRef.current = null;
      }
      setLocalLoading(false);

      const errorMessage = googleError instanceof Error ? googleError.message : "";
      const isCancelled =
        errorMessage.includes("popup-closed") ||
        errorMessage.includes("cancelled");

      // Détecter si l'erreur est causée par une extension bloquante
      if (isExtensionBlockedError(googleError)) {
        setShowExtensionBlockedAlert(true);
      } else if (!isCancelled) {
        setFormErrors({ general: intl.formatMessage({ id: "error.googleLogin" }) });
      }
    }
  }, [loginWithGoogle, formData.rememberMe, intl, searchParams]);

  // ==================== PASSWORD VISIBILITY ====================
  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  // ==================== REDIRECT RESULT ====================
  // ✅ FIX: Handler supprimé - géré uniquement dans AuthContext.tsx
  // Le double handler causait des race conditions où le premier tirait le résultat
  // et le second recevait null, bloquant la connexion Google.

  const effectiveLoading = isLoading || localLoading;

  // Déterminer s'il y a une erreur à afficher (priorité sur le spinner)
  const hasError = error || formErrors.general || formErrors.email || formErrors.password;

  // ==================== LOADING STATE ====================
  // ✅ FIX FLASH P0: Garder le spinner pendant TOUTE la transition post-login
  // localLoading = true après submit, JAMAIS remis à false après succès
  // → Le spinner reste affiché jusqu'à la redirection (navigate dans useEffect)
  // → Évite le flash du formulaire entre "user chargé" et "redirection effectuée"
  // isLoading = chargement initial auth/Firestore (seulement si pas encore d'user)
  const shouldShowSpinner = (localLoading || (isLoading && !user)) && !hasError;

  if (shouldShowSpinner) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 px-4"
        role="status"
        aria-live="polite"
      >
        <div className="text-center">
          <LoadingSpinner size="large" color="red" />
          <p className="mt-4 text-gray-400">
            {intl.formatMessage({ id: "loading.message" })}
          </p>
        </div>
      </div>
    );
  }

  // ==================== RENDER ====================
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      {/* Alerte élégante pour les extensions bloquantes */}
      {showExtensionBlockedAlert && (
        <ExtensionBlockedAlert
          onDismiss={() => setShowExtensionBlockedAlert(false)}
          onRetry={handleRetryAfterExtensionBlock}
          isRetrying={isRetryingConnection}
        />
      )}

      <Layout>
        <main 
          className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col items-center justify-center px-4 py-4" 
          role="main"
        >
          <article className="w-full max-w-md mb-8">
            {/* HEADER */}
            <header className="text-center mb-4">
              <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                <LogIn className="w-6 h-6 text-white" aria-hidden="true" />
              </div>
              
              <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">
                {intl.formatMessage({ id: "seo.login.page_heading" })}
              </h1>
              
              <h2 className="text-gray-400 text-xs sm:text-sm font-normal">
                {intl.formatMessage({ id: "seo.login.page_subheading" })}
              </h2>
            </header>

            {/* FORMULAIRE */}
            <section 
              className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-4 sm:p-5"
              aria-labelledby="login-form-title"
            >
              <h3 id="login-form-title" className="sr-only">
                {intl.formatMessage({ id: "login.main_title" })}
              </h3>

              {/* Messages d'erreur globaux */}
              {(error || formErrors.general) && (
                <div 
                  className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-3" 
                  role="alert"
                  aria-live="assertive"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="flex-1">
                      <p className="text-xs sm:text-sm text-red-200">
                        {translateAuthError(error) || formErrors.general}
                      </p>
                      {submitAttempts >= 3 && (
                        <Link 
                          to="/password-reset" 
                          className="text-xs text-red-400 hover:text-red-300 underline mt-1 inline-block"
                        >
                          {intl.formatMessage({ id: "login.forgot_password_help" })}
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 🎯 HINT DISCRET - Email inconnu */}
              {emailCheckStatus === "not-exists" && formData.email.length > 0 && (
                <div 
                  className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-3 flex items-start gap-2"
                  role="status"
                  aria-live="polite"
                >
                  <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="flex-1 text-xs text-blue-200">
                    {intl.formatMessage({ id: "login.email_not_found_hint" })}
                    {" "}
                    <button 
                      onClick={navigateToRegister} 
                      className="text-blue-400 hover:text-blue-300 font-bold underline"
                    >
                      {intl.formatMessage({ id: "login.create_account_short" })}
                    </button>
                  </div>
                </div>
              )}

              {/* Bouton Google */}
              <Button 
                type="button" 
                onClick={handleGoogleLogin} 
                loading={effectiveLoading} 
                fullWidth 
                size="large" 
                className="py-3.5 text-sm sm:text-base font-bold bg-white hover:bg-gray-50 text-gray-900 rounded-xl transition-all duration-200 shadow-lg mb-4 min-h-[52px]" 
                disabled={effectiveLoading}
              >
                <div className="flex items-center justify-center gap-2.5">
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span className="font-bold text-gray-900">
                    {intl.formatMessage({ id: "login.google_login" })}
                  </span>
                </div>
              </Button>

              {/* Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/20" />
                </div>
                <div className="relative flex justify-center text-xs sm:text-sm">
                  <span className="px-3 bg-gray-900 text-gray-400 font-medium">
                    {intl.formatMessage({ id: "login.or_divider" })}
                  </span>
                </div>
              </div>

              {/* ✅ FORMULAIRE - TOUJOURS VISIBLE */}
              <form 
                onSubmit={handleSubmit} 
                noValidate 
                className="space-y-3" 
                id="login-form"
              >
                {/* Email Field */}
                <div>
                  <label 
                    htmlFor="email" 
                    className="block text-xs sm:text-sm font-medium text-gray-300 mb-1.5"
                  >
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                      {intl.formatMessage({ id: "login.email_label" })}
                    </div>
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required 
                      value={formData.email} 
                      onChange={(e) => handleFieldChange("email", e.target.value)} 
                      className="appearance-none block w-full px-3.5 py-3 pr-11 text-sm sm:text-base bg-white/10 border border-white/20 rounded-xl placeholder-gray-500 text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all min-h-[48px]"
                      placeholder={intl.formatMessage({ id: "login.email_placeholder" })} 
                      aria-invalid={!!formErrors.email}
                      aria-describedby={formErrors.email ? "email-error" : undefined}
                    />
                    {/* Indicateur visuel subtil */}
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center" aria-live="polite">
                      {emailCheckStatus === "checking" && (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-white" />
                      )}
                      {emailCheckStatus === "exists" && (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      )}
                      {emailCheckStatus === "not-exists" && (
                        <Info className="h-4 w-4 text-blue-400" />
                      )}
                    </div>
                  </div>
                  {formErrors.email && (
                    <p id="email-error" className="mt-1.5 text-xs text-red-400" role="alert">
                      {formErrors.email}
                    </p>
                  )}
                </div>

                {/* Password Field - TOUJOURS VISIBLE */}
                <div>
                  <label 
                    htmlFor="password" 
                    className="block text-xs sm:text-sm font-medium text-gray-300 mb-1.5"
                  >
                    <div className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                      {intl.formatMessage({ id: "login.password_label" })}
                    </div>
                  </label>
                  <div className="relative">
                    <input 
                      id="password" 
                      name="password" 
                      type={showPassword ? "text" : "password"} 
                      autoComplete="current-password" 
                      required 
                      value={formData.password} 
                      onChange={(e) => handleFieldChange("password", e.target.value)} 
                      className="appearance-none block w-full px-3.5 py-3 pr-11 text-sm sm:text-base bg-white/10 border border-white/20 rounded-xl placeholder-gray-500 text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all min-h-[48px]"
                      placeholder={intl.formatMessage({ id: "login.password_placeholder" })} 
                      aria-invalid={!!formErrors.password}
                      aria-describedby={formErrors.password ? "password-error" : undefined}
                    />
                    <button 
                      type="button" 
                      onClick={togglePasswordVisibility} 
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-white transition-colors"
                      aria-label={showPassword 
                        ? intl.formatMessage({ id: "aria.login.hide_password" }) 
                        : intl.formatMessage({ id: "aria.login.show_password" })
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  {formErrors.password && (
                    <p id="password-error" className="mt-1.5 text-xs text-red-400" role="alert">
                      {formErrors.password}
                    </p>
                  )}
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <label className="flex items-center cursor-pointer select-none">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      checked={formData.rememberMe}
                      onChange={(e) => handleFieldChange("rememberMe", e.target.checked)}
                      className="h-5 w-5 text-red-600 bg-white/10 border-white/20 rounded focus:ring-red-500"
                    />
                    <span className="ml-2 text-gray-300">
                      {intl.formatMessage({ id: "login.remember_me" })}
                    </span>
                  </label>
                  <Link 
                    to="/password-reset" 
                    className="text-red-400 hover:text-red-300 font-medium"
                  >
                    {intl.formatMessage({ id: "login.forgot_password" })}
                  </Link>
                </div>

                {/* Submit Button - TOUJOURS VISIBLE */}
                <Button 
                  type="submit" 
                  loading={effectiveLoading} 
                  fullWidth 
                  size="large" 
                  className={`py-3.5 text-sm sm:text-base font-bold rounded-xl transition-all duration-200 min-h-[52px] ${
                    isFormValid && !effectiveLoading 
                      ? "bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white shadow-lg" 
                      : "bg-white/10 text-gray-500 cursor-not-allowed border border-white/20"
                  }`} 
                  disabled={!isFormValid || effectiveLoading}
                >
                  {effectiveLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white mr-2" />
                      {intl.formatMessage({ id: "login.logging_in" })}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      {intl.formatMessage({ id: "login.submit_button" })}
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </div>
                  )}
                </Button>
              </form>
            </section>

            {/* FOOTER */}
            <footer className="mt-3 text-center">
              <h6 className="text-gray-400 text-xs sm:text-sm font-normal">
                {intl.formatMessage({ id: "login.new_user" })}{" "}
                <button 
                  onClick={navigateToRegister} 
                  className="text-red-400 hover:text-red-300 font-bold underline"
                >
                  {intl.formatMessage({ id: "login.create_account" })}
                </button>
              </h6>
            </footer>
          </article>

          {/* FAQ Section */}
          <FAQSection />
        </main>
      </Layout>
    </ErrorBoundary>
  );
};

export default React.memo(Login);