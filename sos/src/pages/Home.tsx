// src/pages/Home.tsx
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  ArrowRight,
  Play,
  Shield,
  Globe,
  Users,
  Zap,
  DollarSign,
  Check,
  Star,
  Phone,
  Award,
  Clock,
  MapPin,
  Sparkles,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Briefcase,
  User,
} from "lucide-react";
import Layout from "../components/layout/Layout";
import ProfilesCarousel from "../components/home/ProfileCarousel";
import {
  usePricingConfig,
  detectUserCurrency,
  getEffectivePrice,
} from "@/services/pricingService";
import { useAggregateRatingWithDefault } from "../hooks/useAggregateRating";
import { FormattedMessage, useIntl } from "react-intl";
import { useApp } from "../contexts/AppContext";
import { formatCurrency } from "../utils/localeFormatters";
import { getTranslatedRouteSlug } from "../multilingual-system/core/routing/localeRoutes";

/* ================================
   CONSTANTES SEO (NE PAS TRADUIRE)
   ================================ */
const SEO_CONSTANTS = {
  SITE_NAME: "SOS Expat",
  BASE_URL: "https://sos-expat.com",
  LOGO_URL: "https://sos-expat.com/sos-logo.webp",
  OG_IMAGE_URL: "https://sos-expat.com/og-image.jpg",
  TWITTER_HANDLE: "@sosexpat",
  SOCIAL: {
    facebook: "https://facebook.com/sosexpat",
    linkedin: "https://linkedin.com/company/sosexpat",
    twitter: "https://twitter.com/sosexpat",
  },
} as const;

const OG_LOCALES: Record<string, string> = {
  fr: "fr_FR",
  en: "en_US",
  es: "es_ES",
  de: "de_DE",
  pt: "pt_BR",
  ru: "ru_RU",
  zh: "zh_CN",
  ch: "zh_CN",
  ar: "ar_SA",
  hi: "hi_IN",
};

const SUPPORTED_LANGS = ["fr", "en", "es", "de", "pt", "ru", "ch", "ar", "hi"] as const;

/* ================================
   Types
   ================================ */
interface Stat {
  valueKey: string;
  labelKey: string;
  icon: React.ReactNode;
  color: string;
}

type EffectivePrice = {
  price: { totalAmount: number };
  standard: { totalAmount: number };
  override?: { label?: string } | null;
};

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
  }
}

/* ================================
   Données « Avis » avec clés de traduction
   ================================ */
type TypeEchange = "lawyer" | "expat";
interface Review {
  id: string;
  nameKey: string;
  cityKey: string;
  avatar: string;
  fallback: string;
  commentKey: string;
  typeEchange: TypeEchange;
}

const faceParams =
  "?auto=format&fit=crop&w=600&h=600&q=80&crop=faces&ixlib=rb-4.0.3";

const REVIEWS: Review[] = [
  {
    id: "fr-man",
    nameKey: "review.1.name",
    cityKey: "review.1.city",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e" +
      faceParams,
    fallback: "https://i.pravatar.cc/600?img=12",
    typeEchange: "lawyer",
    commentKey: "review.1.comment",
  },
  {
    id: "us-woman",
    nameKey: "review.2.name",
    cityKey: "review.2.city",
    avatar:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1" +
      faceParams,
    fallback: "https://i.pravatar.cc/600?img=47",
    typeEchange: "expat",
    commentKey: "review.2.comment",
  },
  {
    id: "cn-man",
    nameKey: "review.3.name",
    cityKey: "review.3.city",
    avatar:
      "https://images.unsplash.com/photo-1527980965255-d3b416303d12" +
      faceParams,
    fallback: "https://i.pravatar.cc/600?img=32",
    typeEchange: "lawyer",
    commentKey: "review.3.comment",
  },
  {
    id: "th-woman",
    nameKey: "review.4.name",
    cityKey: "review.4.city",
    avatar:
      "https://images.unsplash.com/photo-1554151228-14d9def656e4" + faceParams,
    fallback: "https://i.pravatar.cc/600?img=65",
    typeEchange: "expat",
    commentKey: "review.4.comment",
  },
  {
    id: "ru-man",
    nameKey: "review.5.name",
    cityKey: "review.5.city",
    avatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d" +
      faceParams,
    fallback: "https://i.pravatar.cc/600?img=10",
    typeEchange: "lawyer",
    commentKey: "review.5.comment",
  },
  {
    id: "sn-woman",
    nameKey: "review.6.name",
    cityKey: "review.6.city",
    avatar:
      "https://images.unsplash.com/photo-1544005316-00a74bdc7f77" + faceParams,
    fallback: "https://i.pravatar.cc/600?img=68",
    typeEchange: "expat",
    commentKey: "review.6.comment",
  },
];

/* ================================
   Slider d'avis
   ================================ */
function ReviewsSlider({ theme = "dark" }: { theme?: "dark" | "light" }) {
  const [current, setCurrent] = useState(0);
  const intl = useIntl();
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const isDark = theme === "dark";

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setCurrent((p) => (p + 1) % REVIEWS.length);
    }, 4500);
    return () => window.clearInterval(id);
  }, [paused]);

  const goTo = (i: number) => setCurrent((i + REVIEWS.length) % REVIEWS.length);
  const prev = () => goTo(current - 1);
  const next = () => goTo(current + 1);

  const onTouchStart: React.TouchEventHandler<HTMLDivElement> = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd: React.TouchEventHandler<HTMLDivElement> = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) {
      if (dx > 0) {
        prev();
      } else {
        next();
      }
    }
    touchStartX.current = null;
  };

  const labelType = (t: TypeEchange): string => {
    return t === "lawyer"
      ? intl.formatMessage({ id: "call.type.lawyer" })
      : intl.formatMessage({ id: "call.type.expat" });
  };

  const onImgError = (
    e: React.SyntheticEvent<HTMLImageElement>,
    fallback: string
  ) => {
    const img = e.currentTarget;
    if (img.src !== fallback) {
      img.src = fallback;
    }
  };

  return (
    <div
      className="relative max-w-[980px] mx-auto select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      role="region"
      aria-label={intl.formatMessage({ id: "aria.reviewsCarousel" })}
    >
      <div className="overflow-hidden rounded-[28px]">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {REVIEWS.map((r, idx) => {
            const reviewerName = intl.formatMessage({ id: r.nameKey });
            const reviewerCity = intl.formatMessage({ id: r.cityKey });
            const reviewComment = intl.formatMessage({ id: r.commentKey });
            
            return (
              <article 
                key={r.id} 
                className="w-full shrink-0 px-2 sm:px-4"
                aria-hidden={idx !== current}
              >
                <Link
                  to="/testimonials"
                  className={
                    isDark
                      ? "block rounded-[28px] border border-white/15 bg-gradient-to-br from-white/8 to-white/5 backdrop-blur-xl p-6 sm:p-10 md:p-12 hover:border-white/25 hover:shadow-2xl transition-all duration-300"
                      : "block rounded-[28px] border border-gray-200 bg-white p-6 sm:p-10 md:p-12 hover:shadow-2xl transition-all duration-300"
                  }
                  aria-label={intl.formatMessage({ id: "aria.viewReviewFrom" }, { name: reviewerName })}
                >
                  <div
                    className={
                      isDark
                        ? "mb-5 sm:mb-6 inline-flex items-center gap-2 bg-white/15 border border-white/25 text-white rounded-full px-3.5 py-2 text-xs sm:text-sm font-semibold backdrop-blur"
                        : "mb-5 sm:mb-6 inline-flex items-center gap-2 bg-gray-100 border border-gray-200 text-gray-700 rounded-full px-3.5 py-2 text-xs sm:text-sm font-semibold"
                    }
                  >
                    {r.typeEchange === "lawyer" ? (
                      <Briefcase size={14} aria-hidden="true" />
                    ) : (
                      <User size={14} aria-hidden="true" />
                    )}
                    {labelType(r.typeEchange)}
                  </div>

                  <div className="flex flex-col md:flex-row md:items-start items-center gap-5 sm:gap-7 md:gap-8 text-center md:text-left">
                    <div className="flex flex-col items-center md:items-start">
                      <div
                        className={`relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full p-[3px] ${isDark ? "bg-gradient-to-br from-white/40 to-white/10" : "bg-gradient-to-br from-gray-200 to-gray-100"} shadow`}
                      >
                        <img
                          src={r.avatar}
                          alt={intl.formatMessage({ id: "aria.portraitOf" }, { name: reviewerName })}
                          className="w-full h-full rounded-full object-cover"
                          loading={idx === current ? "eager" : "lazy"}
                          decoding="async"
                          referrerPolicy="no-referrer"
                          onError={(e) => onImgError(e, r.fallback)}
                          width={112}
                          height={112}
                        />
                      </div>
                      <div className="mt-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div
                            className={`font-extrabold ${isDark ? "text-white" : "text-gray-900"} text-lg sm:text-xl leading-tight`}
                          >
                            {reviewerName}
                          </div>
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-sm whitespace-nowrap">
                            <FormattedMessage id="badge.earlyBetaUser" />
                          </span>
                        </div>
                        <div
                          className={`mt-0.5 inline-flex items-center gap-1 ${isDark ? "text-gray-300/90" : "text-gray-500"} text-xs sm:text-sm`}
                        >
                          <MapPin size={16} aria-hidden="true" />
                          <span>{reviewerCity}</span>
                        </div>
                        <div
                          className="mt-2 inline-flex gap-1"
                          aria-label={intl.formatMessage({ id: "aria.rating5Stars" })}
                        >
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={18}
                              className="text-yellow-400 fill-yellow-400"
                              aria-hidden="true"
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <blockquote
                      className={`${isDark ? "text-white/95" : "text-gray-700"} text-base sm:text-lg md:text-xl leading-7 sm:leading-8 md:leading-9 max-w-[58ch]`}
                    >
                      "{reviewComment}"
                    </blockquote>
                  </div>
                </Link>
              </article>
            );
          })}
        </div>
      </div>

      <button
        onClick={prev}
        className={
          isDark
            ? "absolute left-1 sm:left-0 top-1/2 -translate-y-1/2 -translate-x-2 sm:-translate-x-4 w-10 h-10 sm:w-12 sm:h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full border border-white/20 hover:border-white/30 transition-all duration-300 flex items-center justify-center text-white active:scale-95"
            : "absolute left-1 sm:left-0 top-1/2 -translate-y-1/2 -translate-x-2 sm:-translate-x-4 w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 hover:bg-gray-200 rounded-full border border-gray-200 transition-all duration-300 flex items-center justify-center text-gray-700 active:scale-95"
        }
        aria-label={intl.formatMessage({ id: "aria.previousReview" })}
      >
        <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
      </button>
      <button
        onClick={next}
        className={
          isDark
            ? "absolute right-1 sm:right-0 top-1/2 -translate-y-1/2 translate-x-2 sm:translate-x-4 w-10 h-10 sm:w-12 sm:h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full border border-white/20 hover:border-white/30 transition-all duration-300 flex items-center justify-center text-white active:scale-95"
            : "absolute right-1 sm:right-0 top-1/2 -translate-y-1/2 translate-x-2 sm:translate-x-4 w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 hover:bg-gray-200 rounded-full border border-gray-200 transition-all duration-300 flex items-center justify-center text-gray-700 active:scale-95"
        }
        aria-label={intl.formatMessage({ id: "aria.nextReview" })}
      >
        <ChevronRightIcon className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
      </button>

      <div 
        className="flex items-center justify-center gap-2 mt-6"
        role="tablist"
        aria-label={intl.formatMessage({ id: "aria.reviewsPagination" })}
      >
        {REVIEWS.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            role="tab"
            aria-selected={current === i}
            className={`h-2 rounded-full transition-all duration-300 ${current === i ? "w-8 bg-gradient-to-r from-red-500 to-orange-500" : isDark ? "w-2 bg-white/40 hover:bg-white/60" : "w-2 bg-gray-300 hover:bg-gray-400"}`}
            aria-label={intl.formatMessage({ id: "aria.goToReview" }, { number: i + 1 })}
          />
        ))}
      </div>

      <div className="text-center mt-7 sm:mt-8">
        <Link
          to="/testimonials"
          className={`inline-flex items-center gap-2 ${isDark ? "text-blue-300 hover:text-blue-200" : "text-blue-600 hover:text-blue-700"} font-semibold transition-colors`}
        >
          <span>
            <FormattedMessage id="reviews.viewAll" />
          </span>
          <ChevronRightIcon className="w-5 h-5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

/* ================================
   Page principale optimisée SEO
   ================================ */
const OptimizedHomePage: React.FC = () => {
  const intl = useIntl();
  const { language } = useApp();

  // ======= Aggregate Rating for Google Stars =======
  const aggregateRating = useAggregateRatingWithDefault();

  // ======= URL Construction =======
  const currentPath = "/";
  const canonicalUrl = `${SEO_CONSTANTS.BASE_URL}/${language}${currentPath === "/" ? "" : currentPath}`;

  const stats: Stat[] = useMemo(() => [
    {
      valueKey: "stats.value.expatriates",
      labelKey: "stats.label.expatriates",
      icon: <Users className="w-8 h-8" aria-hidden="true" />,
      color: "from-blue-500 to-cyan-500",
    },
    {
      valueKey: "stats.value.countries",
      labelKey: "stats.label.countries",
      icon: <Shield className="w-8 h-8" aria-hidden="true" />,
      color: "from-green-500 to-emerald-500",
    },
    {
      valueKey: "stats.value.support",
      labelKey: "stats.label.support",
      icon: <Clock className="w-8 h-8" aria-hidden="true" />,
      color: "from-orange-500 to-red-500",
    },
  ], []);

  // ======= SEO Meta Data - Clés de traduction UNIQUEMENT pour le contenu =======
  const seoData = useMemo(() => ({
    title: intl.formatMessage({ id: "seo.home.title" }),
    description: intl.formatMessage({ id: "seo.home.description" }),
    keywords: intl.formatMessage({ id: "seo.home.keywords" }),
    ogTitle: intl.formatMessage({ id: "seo.home.ogTitle" }),
    ogDescription: intl.formatMessage({ id: "seo.home.ogDescription" }),
    twitterTitle: intl.formatMessage({ id: "seo.home.twitterTitle" }),
    twitterDescription: intl.formatMessage({ id: "seo.home.twitterDescription" }),
  }), [intl]);

  // ======= JSON-LD Schema.org - URLs CONSTANTES =======
  const jsonLdOrganization = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SEO_CONSTANTS.BASE_URL}/#organization`,
    "name": SEO_CONSTANTS.SITE_NAME,
    "url": SEO_CONSTANTS.BASE_URL,
    "logo": {
      "@type": "ImageObject",
      "url": SEO_CONSTANTS.LOGO_URL,
      "width": 512,
      "height": 512,
    },
    "description": intl.formatMessage({ id: "seo.home.description" }),
    "sameAs": Object.values(SEO_CONSTANTS.SOCIAL),
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": intl.formatMessage({ id: "schema.contactType" }),
      "availableLanguage": ["French", "English", "Spanish", "German", "Portuguese", "Russian", "Chinese", "Arabic", "Hindi"],
      "areaServed": "Worldwide",
    },
    "knowsAbout": [
      "Expatriation",
      "Legal assistance",
      "Immigration",
      "Relocation",
      "International law",
    ],
    // CRITICAL: AggregateRating for Google Rich Snippets (Stars)
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": aggregateRating.ratingValue.toFixed(1),
      "ratingCount": aggregateRating.ratingCount,
      "reviewCount": aggregateRating.reviewCount,
      "bestRating": "5",
      "worstRating": "1"
    },
  }), [intl, aggregateRating]);

  const jsonLdWebSite = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SEO_CONSTANTS.BASE_URL}/#website`,
    "name": SEO_CONSTANTS.SITE_NAME,
    "url": SEO_CONSTANTS.BASE_URL,
    "inLanguage": language,
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${SEO_CONSTANTS.BASE_URL}/recherche?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  }), [language]);

  const jsonLdService = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${SEO_CONSTANTS.BASE_URL}/#service`,
    "name": intl.formatMessage({ id: "schema.serviceType" }),
    "provider": {
      "@type": "Organization",
      "@id": `${SEO_CONSTANTS.BASE_URL}/#organization`,
    },
    "areaServed": {
      "@type": "Place",
      "name": "Worldwide",
    },
    "serviceType": "Expatriate Assistance",
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": intl.formatMessage({ id: "schema.offerCatalogName" }),
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": intl.formatMessage({ id: "schema.lawyerService" }),
          },
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": intl.formatMessage({ id: "schema.expatService" }),
          },
        },
      ],
    },
    // CRITICAL: AggregateRating for Google Rich Snippets (Stars) on Service
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": aggregateRating.ratingValue.toFixed(1),
      "ratingCount": aggregateRating.ratingCount,
      "reviewCount": aggregateRating.reviewCount,
      "bestRating": "5",
      "worstRating": "1"
    },
    // Include recent reviews for better SEO
    "review": aggregateRating.recentReviews.slice(0, 5).map((review) => ({
      "@type": "Review",
      "author": {
        "@type": "Person",
        "name": review.clientName
      },
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": review.rating,
        "bestRating": "5",
        "worstRating": "1"
      },
      "reviewBody": review.comment,
      "datePublished": review.createdAt instanceof Date
        ? review.createdAt.toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]
    }))
  }), [intl, aggregateRating]);

  const jsonLdFAQ = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": intl.formatMessage({ id: "faq.question1" }),
        "acceptedAnswer": {
          "@type": "Answer",
          "text": intl.formatMessage({ id: "faq.answer1" }),
        },
      },
      {
        "@type": "Question",
        "name": intl.formatMessage({ id: "faq.question2" }),
        "acceptedAnswer": {
          "@type": "Answer",
          "text": intl.formatMessage({ id: "faq.answer2" }),
        },
      },
      {
        "@type": "Question",
        "name": intl.formatMessage({ id: "faq.question3" }),
        "acceptedAnswer": {
          "@type": "Answer",
          "text": intl.formatMessage({ id: "faq.answer3" }),
        },
      },
    ],
  }), [intl]);

  const jsonLdBreadcrumb = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": intl.formatMessage({ id: "breadcrumb.home" }),
        "item": canonicalUrl,
      },
    ],
  }), [intl, canonicalUrl]);

  // ======= JSON-LD pour IA (Speakable, HowTo) =======
  const jsonLdSpeakable = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${canonicalUrl}#webpage`,
    "url": canonicalUrl,
    "name": seoData.title,
    "description": seoData.description,
    "isPartOf": {
      "@id": `${SEO_CONSTANTS.BASE_URL}/#website`,
    },
    "about": {
      "@id": `${SEO_CONSTANTS.BASE_URL}/#organization`,
    },
    "speakable": {
      "@type": "SpeakableSpecification",
      "cssSelector": ["#main-heading", "#experts-heading", "#pricing-heading"],
    },
  }), [canonicalUrl, seoData]);

  const jsonLdHowTo = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": intl.formatMessage({ id: "howto.name" }),
    "description": intl.formatMessage({ id: "howto.description" }),
    "totalTime": "PT5M",
    "step": [
      {
        "@type": "HowToStep",
        "position": 1,
        "name": intl.formatMessage({ id: "howto.step1.name" }),
        "text": intl.formatMessage({ id: "howto.step1.text" }),
      },
      {
        "@type": "HowToStep",
        "position": 2,
        "name": intl.formatMessage({ id: "howto.step2.name" }),
        "text": intl.formatMessage({ id: "howto.step2.text" }),
      },
      {
        "@type": "HowToStep",
        "position": 3,
        "name": intl.formatMessage({ id: "howto.step3.name" }),
        "text": intl.formatMessage({ id: "howto.step3.text" }),
      },
    ],
  }), [intl]);

  // ======= Pricing dynamique =======
  const {
    pricing,
    loading: pricingLoading,
    error: pricingError,
  } = usePricingConfig();

  const [selectedCurrency, setSelectedCurrency] = useState<"eur" | "usd">(
    () => {
      try {
        const saved = localStorage.getItem("preferredCurrency") as
          | "eur"
          | "usd"
          | null;
        return saved && ["eur", "usd"].includes(saved)
          ? saved
          : detectUserCurrency();
      } catch {
        return detectUserCurrency();
      }
    }
  );

  useEffect(() => {
    try {
      localStorage.setItem("preferredCurrency", selectedCurrency);
    } catch {
      /* ignore */
    }
  }, [selectedCurrency]);

  // ======= Bénéfices traduits =======
  const expatBenefits = useMemo(() => [
    intl.formatMessage({ id: "benefits.expat.experience" }),
    intl.formatMessage({ id: "benefits.expat.housing" }),
    intl.formatMessage({ id: "benefits.expat.procedures" }),
    intl.formatMessage({ id: "benefits.expat.cultural" }),
    intl.formatMessage({ id: "benefits.expat.network" }),
    intl.formatMessage({ id: "benefits.expat.support" }),
  ], [intl]);

  const lawyerBenefits = useMemo(() => [
    intl.formatMessage({ id: "benefits.lawyer.analysis" }),
    intl.formatMessage({ id: "benefits.lawyer.advice" }),
    intl.formatMessage({ id: "benefits.lawyer.confidentiality" }),
    intl.formatMessage({ id: "benefits.lawyer.response" }),
    intl.formatMessage({ id: "benefits.lawyer.expertise" }),
    intl.formatMessage({ id: "benefits.lawyer.guidance" }),
  ], [intl]);

  const expatExamples = useMemo(() => [
    intl.formatMessage({ id: "examples.expat.housing" }),
    intl.formatMessage({ id: "examples.expat.schooling" }),
    intl.formatMessage({ id: "examples.expat.immigration" }),
  ], [intl]);

  const lawyerExamples = useMemo(() => [
    intl.formatMessage({ id: "examples.lawyer.contract" }),
    intl.formatMessage({ id: "examples.lawyer.dispute" }),
    intl.formatMessage({ id: "examples.lawyer.accident" }),
  ], [intl]);

  const additionalExamples = useMemo(() => [
    intl.formatMessage({ id: "examples.additional.justice" }),
    intl.formatMessage({ id: "examples.additional.job" }),
    intl.formatMessage({ id: "examples.additional.network" }),
  ], [intl]);

  const combinedExamples = useMemo(() => 
    Array.from(new Set([...expatExamples, ...lawyerExamples, ...additionalExamples])),
    [expatExamples, lawyerExamples, additionalExamples]
  );

  // ======= Avantages traduits =======
  const advantages = useMemo(() => [
    {
      id: "speed-worldwide",
      title: intl.formatMessage({ id: "advantage.speed.title" }),
      tagline: intl.formatMessage({ id: "advantage.speed.tagline" }),
      caption: intl.formatMessage({ id: "advantage.speed.caption" }),
      icon: <Zap className="w-6 h-6" aria-hidden="true" />,
      gradient: "from-red-500 to-orange-500",
    },
    {
      id: "coffee-fast",
      title: intl.formatMessage({ id: "advantage.coffee.title" }),
      tagline: intl.formatMessage({ id: "advantage.coffee.tagline" }),
      caption: intl.formatMessage({ id: "advantage.coffee.caption" }),
      icon: <Clock className="w-6 h-6" aria-hidden="true" />,
      gradient: "from-yellow-500 to-red-500",
    },
    {
      id: "multi",
      title: intl.formatMessage({ id: "advantage.multi.title" }),
      tagline: intl.formatMessage({ id: "advantage.multi.tagline" }),
      caption: intl.formatMessage({ id: "advantage.multi.caption" }),
      icon: <Globe className="w-6 h-6" aria-hidden="true" />,
      gradient: "from-blue-500 to-purple-500",
    },
  ], [intl]);

  // ======= Cards rejoindre =======
  const lawyerCard = useMemo(() => ({
    label: intl.formatMessage({ id: "join.lawyer.label" }),
    title: intl.formatMessage({ id: "join.lawyer.title" }),
    benefits: [
      intl.formatMessage({ id: "join.lawyer.benefit1" }),
      intl.formatMessage({ id: "join.lawyer.benefit2" }),
      intl.formatMessage({ id: "join.lawyer.benefit3" }),
      intl.formatMessage({ id: "join.lawyer.benefit4" }),
      intl.formatMessage({ id: "join.lawyer.benefit5" }),
      intl.formatMessage({ id: "join.lawyer.benefit6" }),
    ],
    ctaLabel: intl.formatMessage({ id: "join.lawyer.cta" }),
    ctaHref: `/${getTranslatedRouteSlug("register-lawyer", language)}`,
    icon: <Briefcase className="w-3.5 h-3.5" aria-hidden="true" />,
    gradient: "from-red-600 to-orange-600",
  }), [intl, language]);

  const expatCard = useMemo(() => ({
    label: intl.formatMessage({ id: "join.expat.label" }),
    title: intl.formatMessage({ id: "join.expat.title" }),
    benefits: [
      intl.formatMessage({ id: "join.expat.benefit1" }),
      intl.formatMessage({ id: "join.expat.benefit2" }),
      intl.formatMessage({ id: "join.expat.benefit3" }),
      intl.formatMessage({ id: "join.expat.benefit4" }),
      intl.formatMessage({ id: "join.expat.benefit5" }),
      intl.formatMessage({ id: "join.expat.benefit6" }),
      intl.formatMessage({ id: "join.expat.benefit7" }),
      intl.formatMessage({ id: "join.expat.benefit8" }),
    ],
    ctaLabel: intl.formatMessage({ id: "join.expat.cta" }),
    ctaHref: `/${getTranslatedRouteSlug("register-expat", language)}`,
    icon: <User className="w-3.5 h-3.5" aria-hidden="true" />,
    gradient: "from-blue-600 to-indigo-600",
  }), [intl, language]);

  // ======= Helpers pour le pricing =======
  const DEFAULT_USD_RATE = 1.08;

  const formatCurrency = useCallback((value: number, currency: "eur" | "usd"): string => {
    const locale = currency === "eur" ? "fr-FR" : "en-US";
    const currencyCode = currency.toUpperCase();
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(value);
  }, []);

  // ======= Composants internes =======
  interface OfferCardProps {
    badgeKey: string;
    titleKey: string;
    minutes: number;
    euroPrice: number;
    usdOverride?: number;
    descriptionKey: string;
    features: string[];
    usdRate?: number;
    accentGradient: string;
    icon: React.ReactNode;
    lightColor: string;
    borderColor: string;
    currency?: "eur" | "usd";
    renderPrice?: React.ReactNode;
  }

  const PriceBlock: React.FC<{
    euro: number;
    usdRate?: number;
    usdOverride?: number;
    minutes: number;
    currency?: "eur" | "usd";
  }> = ({ euro, usdRate, usdOverride, minutes, currency }) => {
    if (currency) {
      const formatted = formatCurrency(euro, currency);
      return (
        <div
          className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"
          aria-label={intl.formatMessage({ id: "aria.priceAndDuration" })}
        >
          <div className="flex items-end gap-3">
            <span className="text-5xl font-black text-gray-900 leading-none">
              {formatted}
            </span>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900 text-white font-semibold">
            <Clock className="w-4 h-4" aria-hidden="true" />
            <span>{minutes} <FormattedMessage id="unit.minutes" /></span>
          </div>
        </div>
      );
    }

    const effectiveRate = typeof usdRate === "number" ? usdRate : DEFAULT_USD_RATE;
    const usdValue = typeof usdOverride === "number" ? usdOverride : Math.round(euro * effectiveRate);

    return (
      <div
        className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"
        aria-label={intl.formatMessage({ id: "aria.priceAndDuration" })}
      >
        <div className="flex items-end gap-3">
          <span className="text-5xl font-black text-gray-900 leading-none">
            {formatCurrency(euro, "eur")}
          </span>
          <span className="text-2xl font-extrabold text-gray-700 leading-none">
            ({formatCurrency(usdValue, "usd")})
          </span>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900 text-white font-semibold">
          <Clock className="w-4 h-4" aria-hidden="true" />
          <span>{minutes} <FormattedMessage id="unit.minutes" /></span>
        </div>
      </div>
    );
  };

  const OfferCard: React.FC<OfferCardProps> = ({
    badgeKey,
    titleKey,
    minutes,
    euroPrice,
    usdOverride,
    descriptionKey,
    features,
    usdRate,
    accentGradient,
    icon,
    lightColor,
    borderColor,
    currency,
    renderPrice,
  }) => {
    return (
      <article
        className={`group relative h-full flex flex-col p-8 rounded-3xl border ${borderColor} ${lightColor} transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] focus-within:scale-[1.02] overflow-hidden`}
        aria-labelledby={`offer-${badgeKey}`}
      >
        <div
          className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accentGradient} opacity-0 group-hover:opacity-[0.06] transition-opacity duration-300`}
          aria-hidden="true"
        />
        <div className="relative z-10 flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm border border-white/80 rounded-full px-4 py-2 text-gray-900 text-sm font-semibold">
              {icon}
              <FormattedMessage id={badgeKey} />
            </div>
            <div className="text-sm text-gray-600">
              <FormattedMessage id="pricing.callIn5Min" />
            </div>
          </div>

          <h4 id={`offer-${badgeKey}`} className="text-2xl font-extrabold text-gray-900 mb-2">
            <FormattedMessage id={titleKey} />
          </h4>
          <p className="text-gray-700 mb-6 leading-relaxed">
            <FormattedMessage id={descriptionKey} />
          </p>

          {renderPrice ?? (
            <PriceBlock
              euro={euroPrice}
              usdRate={usdRate}
              usdOverride={usdOverride}
              minutes={minutes}
              currency={currency}
            />
          )}

          <ul
            className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3"
            role="list"
            aria-label={intl.formatMessage({ id: "aria.includedBenefits" })}
          >
            {features.map((f, i) => (
              <li key={i} role="listitem" className="flex items-start gap-3">
                <span
                  className={`mt-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-r ${accentGradient}`}
                  aria-hidden="true"
                >
                  <Check className="w-3 h-3 text-white" />
                </span>
                <span className="text-gray-800">{f}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8 md:mt-auto">
            <Link
              to="/sos-appel"
              className={`inline-flex items-center justify-center w-full px-6 py-4 rounded-2xl font-bold text-lg text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white ${`bg-gradient-to-r ${accentGradient}`} hover:scale-105`}
              aria-label={intl.formatMessage({ id: "aria.bookConsultation" })}
            >
              <FormattedMessage id="cta.bookConsultation" />
            </Link>
          </div>
        </div>
      </article>
    );
  };

  interface JoinCardProps {
    label: string;
    title: string;
    benefits: string[];
    ctaLabel: string;
    ctaHref: string;
    icon: React.ReactNode;
    gradient: string;
  }

  const JoinCard: React.FC<JoinCardProps> = ({
    label,
    title,
    benefits,
    ctaLabel,
    ctaHref,
    icon,
    gradient,
  }) => {
    return (
      <article 
        className="group relative h-full flex flex-col rounded-3xl border border-gray-200 bg-white p-8 sm:p-10 shadow-sm transition-all duration-300 hover:shadow-2xl"
        aria-labelledby={`join-${label.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <div
          className={`pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br ${gradient} opacity-[0.06] group-hover:opacity-[0.12] transition-opacity duration-300`}
          aria-hidden="true"
        />
        <div className="relative z-10 flex-1 flex flex-col">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 border text-gray-700 border-gray-200">
              <span
                className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-white bg-gradient-to-r ${gradient}`}
                aria-hidden="true"
              >
                {icon}
              </span>
              <span className="text-sm font-semibold">{label}</span>
            </div>
          </div>

          <h4 id={`join-${label.toLowerCase().replace(/\s+/g, '-')}`} className="mt-6 text-2xl sm:text-3xl font-black text-gray-900">
            {title}
          </h4>

          <ul
            className="mt-6 space-y-3 mb-3"
            role="list"
            aria-label={intl.formatMessage({ id: "aria.joinBenefits" })}
          >
            {benefits.map((b, i) => (
              <li key={i} className="flex items-start gap-3">
                <span
                  className={`mt-1 inline-flex items-center justify-center w-5 h-5 rounded-full text-white bg-gradient-to-r ${gradient}`}
                  aria-hidden="true"
                >
                  <Check className="w-3 h-3" />
                </span>
                <span className="text-gray-700">{b}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8 md:mt-auto">
            <Link
              to={ctaHref}
              className={`group/cta inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 font-bold text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white bg-gradient-to-r ${gradient} hover:scale-105 hover:text-white`}
              aria-label={ctaLabel}
            >
              {ctaLabel}
              <ArrowRight className="w-5 h-5" aria-hidden="true" />
            </Link>
            <p className="mt-3 text-sm text-gray-500">
              <FormattedMessage
                id="join.appTip"
                values={{
                  strong: (chunks) => <strong>{chunks}</strong>,
                }}
              />
            </p>
          </div>
        </div>
      </article>
    );
  };

  interface AdvantageItem {
    id: string;
    title: string;
    tagline: string;
    caption: string;
    icon: React.ReactNode;
    gradient: string;
  }

  const AdvantageCard: React.FC<{ item: AdvantageItem }> = ({ item }) => {
    return (
      <article
        className="group relative rounded-3xl border border-gray-200 bg-white p-8 sm:p-10 shadow-sm transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] focus-within:scale-[1.02] text-center"
        aria-labelledby={`adv-title-${item.id}`}
        tabIndex={0}
      >
        <div
          className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-[0.06] transition-opacity duration-300 rounded-3xl`}
          aria-hidden="true"
        />
        <div className="relative z-10 flex flex-col items-center">
          <div className="relative mb-6">
            <div
              className={`mx-auto flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-r ${item.gradient} text-white shadow-md`}
              aria-hidden="true"
            >
              {item.icon}
            </div>
          </div>

          <h4
            id={`adv-title-${item.id}`}
            className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-snug"
          >
            {item.title}
          </h4>

          <p className="mt-3 text-gray-600 max-w-[36ch]">
            {item.tagline}
          </p>

          <div className="mt-6 flex items-center justify-center">
            <span
              className={`inline-flex rounded-full p-[1px] bg-gradient-to-r ${item.gradient}`}
            >
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm text-gray-600">
                <span
                  className={`inline-block w-2.5 h-2.5 rounded-full bg-gradient-to-r ${item.gradient}`}
                  aria-hidden="true"
                />
                {item.caption}
              </span>
            </span>
          </div>
        </div>
      </article>
    );
  };

  return (
    <Layout>
      {/* ================= SEO HEAD - CORRIGÉ ================= */}
      <Helmet>
        {/* Base */}
        <html lang={language} />
        <title>{seoData.title}</title>
        <meta name="title" content={seoData.title} />
        <meta name="description" content={seoData.description} />
        <meta name="keywords" content={seoData.keywords} />
        <meta name="author" content={SEO_CONSTANTS.SITE_NAME} />
        
        {/* Robots */}
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <meta name="googlebot" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        
        {/* Viewport & charset */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
        
        {/* Autres meta */}
        <meta name="language" content={language} />
        <meta name="revisit-after" content="7 days" />
        <meta name="rating" content="general" />
        <meta name="distribution" content="global" />
        
        {/* Canonical - CONSTRUIT DYNAMIQUEMENT */}
        <link rel="canonical" href={canonicalUrl} />
        
        {/* Hreflang - URLs CONSTANTES */}
        {SUPPORTED_LANGS.map((lang) => (
          <link
            key={lang}
            rel="alternate"
            hrefLang={lang}
            href={`${SEO_CONSTANTS.BASE_URL}/${lang}`}
          />
        ))}
        <link rel="alternate" hrefLang="x-default" href={SEO_CONSTANTS.BASE_URL} />

        {/* Open Graph - URLs CONSTANTES */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content={SEO_CONSTANTS.SITE_NAME} />
        <meta property="og:title" content={seoData.ogTitle} />
        <meta property="og:description" content={seoData.ogDescription} />
        <meta property="og:image" content={SEO_CONSTANTS.OG_IMAGE_URL} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={seoData.ogTitle} />
        <meta property="og:locale" content={OG_LOCALES[language] || "en_US"} />
        {/* OG Locale alternates */}
        {SUPPORTED_LANGS.filter(l => l !== language).map((lang) => (
          <meta key={lang} property="og:locale:alternate" content={OG_LOCALES[lang]} />
        ))}

        {/* Twitter Cards - URLs CONSTANTES */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={canonicalUrl} />
        <meta name="twitter:title" content={seoData.twitterTitle} />
        <meta name="twitter:description" content={seoData.twitterDescription} />
        <meta name="twitter:image" content={SEO_CONSTANTS.OG_IMAGE_URL} />
        <meta name="twitter:site" content={SEO_CONSTANTS.TWITTER_HANDLE} />
        <meta name="twitter:creator" content={SEO_CONSTANTS.TWITTER_HANDLE} />

        {/* Security */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="SAMEORIGIN" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />

        {/* Preconnect */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />

        {/* JSON-LD Schema.org */}
        <script type="application/ld+json">
          {JSON.stringify(jsonLdOrganization)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(jsonLdWebSite)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(jsonLdService)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(jsonLdFAQ)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(jsonLdBreadcrumb)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(jsonLdSpeakable)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(jsonLdHowTo)}
        </script>
      </Helmet>

      <div className="min-h-screen bg-gray-950">
        {/* ================= HERO ================= */}
        <header 
          className="relative pt-20 pb-32 overflow-hidden"
          role="banner"
          aria-labelledby="main-heading"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" aria-hidden="true" />
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-transparent to-blue-500/10" aria-hidden="true" />
          <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-6">
            <div className="text-center mb-20">
              <h1 
                id="main-heading"
                className="text-6xl md:text-8xl font-black mb-8 leading-tight"
              >
                <span className="bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent">
                  <FormattedMessage id="hero.title.line1" />
                </span>
                <br />
                <span className="bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent">
                  <FormattedMessage id="hero.title.line2" />
                </span>
              </h1>

              <h2 className="text-2xl md:text-3xl text-white font-semibold max-w-4xl mx-auto mb-3 leading-relaxed">
                <FormattedMessage id="hero.subtitle" />
              </h2>
              
              <p className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto mb-12 leading-relaxed">
                <FormattedMessage id="hero.description" />
              </p>

              <nav 
                className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6"
                aria-label={intl.formatMessage({ id: "aria.mainActions" })}
              >
                {/* Bouton principal d'appel - "Appeler maintenant" avec icône téléphone */}
                <Link
                  to="/sos-appel"
                  className="group relative overflow-hidden bg-gradient-to-r from-red-600 via-red-500 to-orange-500 hover:from-red-700 hover:via-red-600 hover:to-orange-600 text-white px-10 sm:px-12 py-5 sm:py-6 rounded-3xl font-black text-lg sm:text-xl transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:shadow-red-500/50 flex items-center justify-center space-x-3 sm:space-x-4 border-2 border-red-400/50 touch-manipulation"
                  aria-label={intl.formatMessage({ id: "aria.urgentCall" })}
                >
                  <Phone className="w-7 h-7 sm:w-8 sm:h-8 animate-pulse" aria-hidden="true" />
                  <span>
                    <FormattedMessage id="cta.callNow" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/30 via-orange-500/30 to-red-600/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-hidden="true" />
                </Link>

                {/* Bouton "Voir les experts" - masqué sur mobile, visible sur desktop */}
                <Link
                  to="/sos-appel"
                  className="group hidden md:flex items-center space-x-3 px-10 py-6 rounded-3xl bg-white/10 hover:bg-white/20 text-white border-2 border-white/30 hover:border-white/50 transition-all duration-300 hover:scale-105 backdrop-blur-sm font-bold text-lg touch-manipulation"
                  aria-label={intl.formatMessage({ id: "aria.viewExperts" })}
                >
                  <Play className="w-6 h-6" aria-hidden="true" />
                  <span>
                    <FormattedMessage id="cta.seeExperts" />
                  </span>
                </Link>
              </nav>
            </div>

            {/* Stats */}
            <section 
              className="grid grid-cols-2 md:grid-cols-3 gap-8"
              aria-label={intl.formatMessage({ id: "aria.keyStats" })}
            >
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="group text-center p-8 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105 touch-manipulation"
                >
                  <div
                    className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r ${stat.color} mb-4 group-hover:scale-110 transition-transform duration-300`}
                    aria-hidden="true"
                  >
                    <div className="text-white">{stat.icon}</div>
                  </div>
                  <div className="text-4xl font-black text-white mb-2">
                    <FormattedMessage id={stat.valueKey} />
                  </div>
                  <div className="text-gray-400 font-medium">
                    <FormattedMessage id={stat.labelKey} />
                  </div>
                </div>
              ))}
            </section>
          </div>
        </header>

        {/* ================= EXPERTS ================= */}
        <section 
          className="py-28 bg-gradient-to-b from-white via-rose-50 to-white relative overflow-hidden touch-manipulation"
          aria-labelledby="experts-heading"
        >
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-red-400/10 to-orange-400/10 rounded-full blur-2xl" />
            <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-full blur-2xl" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-6">
            <div className="text-center mb-14">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-red-100 to-orange-100 backdrop-blur-sm rounded-full px-6 py-3 border border-red-200 mb-6">
                <Shield className="w-5 h-5 text-red-600" aria-hidden="true" />
                <span className="text-red-700 font-bold">
                  <FormattedMessage id="badge.transparency" />
                </span>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" aria-hidden="true" />
              </div>

              <h2 id="experts-heading" className="text-5xl font-black text-gray-900 mb-4">
                <FormattedMessage id="experts.title.prefix" />
                <span className="bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent">
                  {" "}<FormattedMessage id="experts.title.highlight" />{" "}
                </span>
                <FormattedMessage id="experts.title.suffix" />
              </h2>
              
              <p className="text-lg text-gray-700 max-w-3xl mx-auto">
                <FormattedMessage id="experts.description" />
              </p>
            </div>

            <ProfilesCarousel />
          </div>
        </section>

        {/* ================= PRICING ================= */}
        <section
          className="py-32 bg-gradient-to-b from-gray-950 to-gray-900 relative overflow-hidden"
          aria-labelledby="pricing-heading"
        >
          <div className="absolute inset-0" aria-hidden="true">
            <div className="absolute top-0 left-1/3 w-64 h-64 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/3 w-64 h-64 bg-gradient-to-r from-green-500/10 to-teal-500/10 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-500/20 to-blue-500/20 backdrop-blur-sm rounded-full px-6 py-3 border border-green-500/30 mb-6">
                <DollarSign className="w-5 h-5 text-green-400" aria-hidden="true" />
                <span className="text-green-300 font-bold">
                  <FormattedMessage id="badge.transparencyPricing" />
                </span>
                <Check className="w-5 h-5 text-green-400" aria-hidden="true" />
              </div>

              <h2 id="pricing-heading" className="text-5xl font-black text-white mb-4">
                <FormattedMessage id="pricing.title.prefix" />{" "}
                <span className="bg-gradient-to-r from-green-500 to-blue-500 bg-clip-text text-transparent">
                  <FormattedMessage id="pricing.title.highlight" />
                </span>{" "}
                <FormattedMessage id="pricing.title.suffix" />
              </h2>
              
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                <FormattedMessage
                  id="pricing.subtitle"
                  values={{
                    strong: (chunks) => <strong>{chunks}</strong>,
                  }}
                />
              </p>
            </div>

            {pricingLoading ? (
              <div className="text-center py-16" role="status" aria-live="polite">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4" aria-hidden="true" />
                <p className="text-white">
                  <FormattedMessage id="pricing.loading" />
                </p>
              </div>
            ) : pricingError || !pricing ? (
              <div className="grid gap-8 md:grid-cols-2 items-stretch">
                <OfferCard
                  badgeKey="offer.expat.badge"
                  titleKey="offer.expat.title"
                  minutes={30}
                  euroPrice={19}
                  usdOverride={25}
                  descriptionKey="offer.expat.description"
                  features={expatBenefits}
                  accentGradient="from-blue-600 to-indigo-600"
                  icon={<User className="w-4 h-4" aria-hidden="true" />}
                  lightColor="bg-blue-50"
                  borderColor="border-blue-200"
                />
                <OfferCard
                  badgeKey="offer.lawyer.badge"
                  titleKey="offer.lawyer.title"
                  minutes={20}
                  euroPrice={49}
                  usdOverride={55}
                  descriptionKey="offer.lawyer.description"
                  features={lawyerBenefits}
                  accentGradient="from-red-600 to-red-700"
                  icon={<Briefcase className="w-4 h-4" aria-hidden="true" />}
                  lightColor="bg-red-50"
                  borderColor="border-red-200"
                />
              </div>
            ) : (
              <>
                <div className="text-center mb-8" role="radiogroup" aria-label={intl.formatMessage({ id: "aria.currencySelector" })}>
                  <div className="inline-flex bg-white/10 rounded-full p-1 backdrop-blur-sm border border-white/20">
                    <button
                      onClick={() => setSelectedCurrency("eur")}
                      className={`px-6 py-2 rounded-full transition-all font-semibold ${
                        selectedCurrency === "eur"
                          ? "bg-white text-gray-900"
                          : "text-white hover:bg-white/10"
                      }`}
                      role="radio"
                      aria-checked={selectedCurrency === "eur"}
                      aria-label={intl.formatMessage({ id: "aria.selectEuro" })}
                    >
                      <FormattedMessage id="currency.eur.flag" /> <FormattedMessage id="currency.eur.code" />
                    </button>
                    <button
                      onClick={() => setSelectedCurrency("usd")}
                      className={`px-6 py-2 rounded-full transition-all font-semibold ${
                        selectedCurrency === "usd"
                          ? "bg-white text-gray-900"
                          : "text-white hover:bg-white/10"
                      }`}
                      role="radio"
                      aria-checked={selectedCurrency === "usd"}
                      aria-label={intl.formatMessage({ id: "aria.selectDollar" })}
                    >
                      <FormattedMessage id="currency.usd.flag" /> <FormattedMessage id="currency.usd.code" />
                    </button>
                  </div>
                </div>

                {(() => {
                  const currency = selectedCurrency;
                  const currencySymbol = currency === "eur" ? "€" : "$";

                  const effLawyer = getEffectivePrice(pricing, "lawyer", currency) as EffectivePrice;
                  const effExpat = getEffectivePrice(pricing, "expat", currency) as EffectivePrice;

                  const minutesLawyer = pricing.lawyer[currency].duration;
                  const minutesExpat = pricing.expat[currency].duration;

                  const renderEffPrice = (eff: EffectivePrice, minutes: number) => (
                    <div
                      className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"
                      aria-label={intl.formatMessage({ id: "aria.priceAndDuration" })}
                    >
                      <div className="flex items-end gap-2">
                        {eff.override ? (
                          <div className="flex items-end gap-2">
                            <span className="line-through text-gray-500" aria-label={intl.formatMessage({ id: "aria.originalPrice" })}>
                              {currencySymbol}{eff.standard.totalAmount.toFixed(2)}
                            </span>
                            <span className="text-2xl sm:text-5xl font-bold">
                              {currencySymbol}{eff.price.totalAmount.toFixed(2)}
                            </span>
                            {eff.override?.label && (
                              <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">
                                {eff.override.label}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-2xl sm:text-5xl font-bold">
                            {currencySymbol}{eff.price.totalAmount.toFixed(0)}
                          </span>
                        )}
                      </div>
                      <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900 text-white font-semibold">
                        <Clock className="w-4 h-4" aria-hidden="true" />
                        <span>{minutes} <FormattedMessage id="unit.minutes" /></span>
                      </div>
                    </div>
                  );

                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
                      <OfferCard
                        badgeKey="offer.expat.badge"
                        titleKey="offer.expat.title"
                        minutes={minutesExpat}
                        euroPrice={effExpat.price.totalAmount}
                        descriptionKey="offer.expat.description"
                        features={expatBenefits}
                        accentGradient="from-blue-600 to-indigo-600"
                        icon={<User className="w-4 h-4" aria-hidden="true" />}
                        lightColor="bg-blue-50"
                        borderColor="border-blue-200"
                        renderPrice={renderEffPrice(effExpat, minutesExpat)}
                      />

                      <OfferCard
                        badgeKey="offer.lawyer.badge"
                        titleKey="offer.lawyer.title"
                        minutes={minutesLawyer}
                        euroPrice={effLawyer.price.totalAmount}
                        descriptionKey="offer.lawyer.description"
                        features={lawyerBenefits}
                        accentGradient="from-red-600 to-red-700"
                        icon={<Briefcase className="w-4 h-4" aria-hidden="true" />}
                        lightColor="bg-red-50"
                        borderColor="border-red-200"
                        renderPrice={renderEffPrice(effLawyer, minutesLawyer)}
                      />
                    </div>
                  );
                })()}

                <div className="text-center mt-6">
                  <span className="text-xs text-white/60 bg-white/10 px-3 py-1 rounded-full">
                    <FormattedMessage id="pricing.syncNote" />
                  </span>
                </div>
              </>
            )}

            {/* Examples Section */}
            <div
              className="mt-10 rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm p-6 md:p-8"
              role="region"
              aria-labelledby="examples-heading"
            >
              <div className="flex flex-col items-center gap-3 mb-6">
                <div 
                  className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-r from-green-500 to-blue-500"
                  aria-hidden="true"
                >
                  <Sparkles className="text-white w-5 h-5" />
                </div>
                <h3 id="examples-heading" className="text-xl md:text-2xl font-extrabold text-white">
                  <FormattedMessage id="examples.title" />
                </h3>
                <p className="text-gray-300 text-sm md:text-base">
                  <FormattedMessage id="examples.subtitle" />
                </p>
              </div>

              <ul className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" role="list">
                {combinedExamples.map((ex, i) => (
                  <li
                    key={i}
                    className="group flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <span 
                      className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-r from-green-500 to-blue-500"
                      aria-hidden="true"
                    >
                      <Check className="w-3.5 h-3.5 text-white" />
                    </span>
                    <span className="text-white/90">{ex}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Guarantees */}
            <div className="mt-14 text-center">
              <div 
                className="inline-flex flex-wrap items-center justify-center gap-4 sm:gap-6 bg-white/5 backdrop-blur-sm rounded-2xl px-4 sm:px-8 py-4 border border-white/10"
                role="list"
                aria-label={intl.formatMessage({ id: "aria.guarantees" })}
              >
                <div className="flex items-center space-x-2 text-green-400" role="listitem">
                  <Shield className="w-5 h-5" aria-hidden="true" />
                  <span className="font-medium">
                    <FormattedMessage id="guarantee.confidentiality" />
                  </span>
                </div>
                <div className="hidden sm:block w-px h-6 bg-white/20" aria-hidden="true" />
                <div className="flex items-center space-x-2 text-blue-400" role="listitem">
                  <Globe className="w-5 h-5" aria-hidden="true" />
                  <span className="font-medium">
                    <FormattedMessage id="guarantee.countries" />
                  </span>
                </div>
                <div className="hidden sm:block w-px h-6 bg-white/20" aria-hidden="true" />
                <div className="flex items-center space-x-2 text-purple-400" role="listitem">
                  <Zap className="w-5 h-5" aria-hidden="true" />
                  <span className="font-medium">
                    <FormattedMessage id="guarantee.instant" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= WHY CHOOSE US ================= */}
        <section
          className="py-32 bg-gradient-to-b from-white to-gray-50"
          aria-labelledby="why-heading"
        >
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12 sm:mb-16">
              <h2 id="why-heading" className="text-5xl font-black text-gray-900 mb-6">
                <FormattedMessage id="why.title.prefix" />{" "}
                <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                  <FormattedMessage id="why.title.highlight" />
                </span>
                <FormattedMessage id="why.title.suffix" />
              </h2>
              <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
                <FormattedMessage id="why.subtitle" />
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {advantages.map((adv) => (
                <AdvantageCard key={adv.id} item={adv} />
              ))}
            </div>
          </div>
        </section>

        {/* ================= JOIN US ================= */}
        <section
          className="py-28 bg-gradient-to-b from-gray-900 to-gray-950 relative overflow-hidden"
          aria-labelledby="join-heading"
        >
          <div className="relative z-10 max-w-7xl mx-auto px-6">
            <div className="text-center mb-12 sm:mb-16">
              <h2 id="join-heading" className="text-4xl sm:text-5xl font-black text-white mb-4">
                <FormattedMessage id="join.title" />
              </h2>
              <p className="text-lg sm:text-xl text-gray-300 max-w-3xl mx-auto">
                <FormattedMessage id="join.subtitle" />
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-stretch">
              <JoinCard {...expatCard} />
              <JoinCard {...lawyerCard} />
            </div>
          </div>
        </section>

        {/* ================= REVIEWS ================= */}
        <section 
          className="py-28 sm:py-32 bg-gradient-to-b from-white to-gray-50 relative overflow-hidden"
          aria-labelledby="reviews-heading"
        >
          <div className="absolute inset-0" aria-hidden="true">
            <div className="absolute -top-10 left-1/4 w-80 h-80 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 right-1/4 w-96 h-96 bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-10 sm:mb-14">
              <span className="inline-flex rounded-full p-[1px] bg-gradient-to-r from-yellow-400 to-orange-400 shadow-md mb-5 sm:mb-6">
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-5 sm:px-6 py-2.5 sm:py-3 border border-yellow-200/70 text-yellow-700">
                  <Star className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
                  <span className="font-semibold">
                    <FormattedMessage id="reviews.rating" />
                  </span>
                  <Award className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
                </span>
              </span>
              
              <h2 id="reviews-heading" className="text-3xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
                <FormattedMessage id="reviews.title.prefix" />{" "}
                <span className="bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                  <FormattedMessage id="reviews.title.highlight" />
                </span>
              </h2>
              
              <p className="mt-3 sm:mt-4 text-base sm:text-xl text-gray-600 max-w-3xl mx-auto">
                <FormattedMessage id="reviews.subtitle" />
              </p>
            </div>

            <ReviewsSlider theme="light" />
          </div>
        </section>

        {/* ================= FINAL CTA ================= */}
        <section 
          className="py-32 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 relative overflow-hidden"
          aria-labelledby="cta-heading"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/20" aria-hidden="true" />
          <div className="relative z-10 max-w-5xl mx-auto text-center px-6">
            <h2 id="cta-heading" className="text-5xl md:text-6xl font-black text-white mb-6 md:mb-8">
              <FormattedMessage id="cta.title" />
            </h2>
            
            <p className="text-2xl text-white/90 mb-12 leading-relaxed">
              <FormattedMessage
                id="cta.subtitle"
                values={{
                  strong: (chunks) => <strong>{chunks}</strong>,
                }}
              />
            </p>

            {/* Trust badges */}
            <div 
              className="mb-10 flex flex-wrap items-center justify-center gap-3 text-white/90"
              role="list"
              aria-label={intl.formatMessage({ id: "aria.trustBadges" })}
            >
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 border border-white/20 backdrop-blur-sm" role="listitem">
                <Shield className="w-4 h-4" aria-hidden="true" />
                <FormattedMessage id="badge.secured" />
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 border border-white/20 backdrop-blur-sm" role="listitem">
                <Clock className="w-4 h-4" aria-hidden="true" />
                <FormattedMessage id="badge.lessThan5Min" />
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 border border-white/20 backdrop-blur-sm" role="listitem">
                <Globe className="w-4 h-4" aria-hidden="true" />
                <FormattedMessage id="badge.worldwide" />
              </span>
            </div>

            <nav 
              className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6"
              aria-label={intl.formatMessage({ id: "aria.ctaActions" })}
            >
              <Link
                to="/register"
                className="group relative overflow-hidden bg-white text-red-600 hover:text-red-700 px-12 py-6 rounded-3xl font-black text-xl transition-all duration-300 hover:scale-110 hover:shadow-2xl flex items-center gap-4 touch-manipulation"
                aria-label={intl.formatMessage({ id: "aria.startFreeNow" })}
              >
                <span>
                  <FormattedMessage id="cta.startFree" />
                </span>
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1.5 transition-transform duration-300" aria-hidden="true" />
                <span className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-black/5" aria-hidden="true" />
              </Link>

              <Link
                to="/sos-appel"
                className="group relative overflow-hidden border-2 border-white bg-transparent text-white px-12 py-6 rounded-3xl font-bold text-xl transition-all duration-300 hover:scale-105 hover:bg-white/10 flex items-center gap-4 touch-manipulation"
                aria-label={intl.formatMessage({ id: "aria.urgentCallNow" })}
              >
                <Phone className="w-6 h-6" aria-hidden="true" />
                <span>
                  <FormattedMessage id="cta.urgentNow" />
                </span>
                <span className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-white/30" aria-hidden="true" />
              </Link>
            </nav>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default OptimizedHomePage;