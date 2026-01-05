import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { useLocaleNavigate } from "../multilingual-system";
import { Helmet } from "react-helmet-async";
import {
  Phone,
  Star,
  MapPin,
  Search,
  ChevronDown,
  Wifi,
  WifiOff,
  ChevronLeft,
  ChevronRight,
  Eye,
  ArrowRight,
  Globe,
  Users,
  Zap,
  SlidersHorizontal,
  X,
  RotateCcw,
  Sparkles,
  Briefcase,
} from "lucide-react";
import {
  collection,
  query,
  limit,
  onSnapshot,
  where,
  DocumentData,
  getDoc,
  doc,
  getDocs,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { getCollectionRest } from "../utils/firestoreRestApi";
import Layout from "../components/layout/Layout";
import SEOHead from "../components/layout/SEOHead";
import { useApp } from "../contexts/AppContext";
import { useWizard } from "../contexts/WizardContext";
import GuidedFilterWizard from "../components/sos-call/GuidedFilterWizard";
import DesktopFilterBar from "../components/sos-call/DesktopFilterBar";
import { FormattedMessage, useIntl } from "react-intl";
import { getAllProviderTypeKeywords, getProviderTypeKeywords, type SupportedLanguage, detectSearchLanguage } from "../utils/multilingualSearch";

// ========================================
// 🌍 IMPORTS POUR INTERNATIONALISATION
// ========================================
import {
  countriesData,
  getSortedCountries,
  type LanguageKey,
  type CountryData
} from '../data/countries';

import {
  getCountryName,
  convertLanguageNamesToCodes
} from "../utils/formatters";

import {
  languagesData,
  getLanguageLabel,
  type SupportedLocale,
} from '../data/languages-spoken';

import { formatSpecialties, mapLanguageToLocale } from '../utils/specialtyMapper';


/* =========================
   Types
========================= */
interface Provider {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  type: "lawyer" | "expat";
  country: string;
  languages: string[];
  reviewCount: number;
  yearsOfExperience: number;
  rating: number;
  price: number;
  isOnline: boolean;
  avatar: string;
  specialties: string[];
  interventionCountries?: string[];
  description: string;
  duration?: number;
  isActive?: boolean;
  isVisible?: boolean;
  isApproved?: boolean;
  isBanned?: boolean;
  role?: string;
  isAdmin?: boolean;
  education?: string | string[];
  certifications?: string | string[];
  lawSchool?: string;
  translations?: {
    [lang: string]: {
      description?: string;
      bio?: string;
      summary?: string;
      specialties?: string[];
    };
  };
}

interface RawProfile extends DocumentData {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  type?: "lawyer" | "expat" | string;
  currentPresenceCountry?: string;
  country?: string;
  languages?: string[];
  specialties?: string[];
  rating?: number;
  reviewCount?: number;
  yearsOfExperience?: number;
  yearsAsExpat?: number;
  isOnline?: boolean;
  isActive?: boolean;
  isVisible?: boolean;
  isApproved?: boolean;
  isBanned?: boolean;
  role?: string;
  isAdmin?: boolean;
  bio?: string;
  price?: number;
  duration?: number;
  profilePhoto?: string;
  education?: any;
  certifications?: any;
  lawSchool?: string;
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
  tags?: string[];
  order?: number;
}

/* =========================
   Constants
========================= */
const PAGE_SIZE = 9;
const BASE_URL = "https://sos-expat.com";
const PAGE_PATH = "/sos-appel";

// ========================================
// 🔍 SEO CONSTANTS - URLS et LOCALES
// ========================================

const SOCIAL_URLS = {
  facebook: "https://www.facebook.com/sosexpat",
  linkedin: "https://www.linkedin.com/company/sosexpat",
  twitter: "https://twitter.com/sosexpat",
  instagram: "https://www.instagram.com/sosexpat",
} as const;

const OG_LOCALES: Record<string, string> = {
  fr: "fr_FR",
  en: "en_US",
  es: "es_ES",
  de: "de_DE",
  pt: "pt_BR",
  ru: "ru_RU",
  zh: "zh_CN",
  ar: "ar_SA",
  hi: "hi_IN",
  ch: "zh_CN",
};

const SUPPORTED_LANGUAGES = ['fr', 'en', 'es', 'de', 'pt', 'ru', 'ch', 'ar', 'hi'] as const;

const PROFESSION_ICONS: Record<string, { icon: string; bgColor: string; textColor: string }> = {
  lawyer: {
    icon: "⚖️",
    bgColor: "bg-slate-100",
    textColor: "text-slate-800",
  },
  expat: {
    icon: "🌍",
    bgColor: "bg-blue-100",
    textColor: "text-blue-800",
  },
};

// ========================================
// 🆘 FALLBACK PROVIDERS (quand Firestore est bloqué)
// ========================================
const FIRESTORE_TIMEOUT_MS = 8000; // 8 secondes max avant fallback

const FALLBACK_PROVIDERS: Provider[] = [
  {
    id: "demo-lawyer-1",
    name: "Marie D.",
    firstName: "Marie",
    lastName: "Dupont",
    type: "lawyer",
    country: "France",
    languages: ["fr", "en", "es"],
    specialties: ["Droit de l'immigration", "Droit du travail", "Droit de la famille"],
    rating: 4.9,
    reviewCount: 127,
    yearsOfExperience: 12,
    isOnline: true,
    price: 49,
    duration: 20,
    avatar: "/default-avatar.png",
    description: "Avocate spécialisée en droit de l'immigration avec plus de 12 ans d'expérience.",
  },
  {
    id: "demo-lawyer-2",
    name: "Jean-Pierre M.",
    firstName: "Jean-Pierre",
    lastName: "Martin",
    type: "lawyer",
    country: "Belgium",
    languages: ["fr", "nl", "en"],
    specialties: ["Droit des affaires", "Droit commercial", "Droit européen"],
    rating: 4.8,
    reviewCount: 89,
    yearsOfExperience: 15,
    isOnline: false,
    price: 49,
    duration: 20,
    avatar: "/default-avatar.png",
    description: "Avocat d'affaires expert en droit commercial européen.",
  },
  {
    id: "demo-expat-1",
    name: "Sophie L.",
    firstName: "Sophie",
    lastName: "Laurent",
    type: "expat",
    country: "Germany",
    languages: ["fr", "de", "en"],
    specialties: ["Installation", "Démarches administratives", "Vie quotidienne"],
    rating: 4.7,
    reviewCount: 203,
    yearsOfExperience: 8,
    isOnline: true,
    price: 19,
    duration: 30,
    avatar: "/default-avatar.png",
    description: "Expatriée en Allemagne depuis 8 ans, je vous aide dans vos démarches.",
  },
  {
    id: "demo-expat-2",
    name: "Thomas B.",
    firstName: "Thomas",
    lastName: "Bernard",
    type: "expat",
    country: "United States",
    languages: ["fr", "en"],
    specialties: ["Visa", "Logement", "Fiscalité américaine"],
    rating: 4.9,
    reviewCount: 156,
    yearsOfExperience: 10,
    isOnline: true,
    price: 19,
    duration: 30,
    avatar: "/default-avatar.png",
    description: "Installé aux USA depuis 10 ans, expert en visa et fiscalité américaine.",
  },
  {
    id: "demo-lawyer-3",
    name: "Elena R.",
    firstName: "Elena",
    lastName: "Rodriguez",
    type: "lawyer",
    country: "Spain",
    languages: ["es", "fr", "en", "pt"],
    specialties: ["Droit de l'immigration", "Nationalité", "Droit des étrangers"],
    rating: 4.8,
    reviewCount: 112,
    yearsOfExperience: 9,
    isOnline: true,
    price: 49,
    duration: 20,
    avatar: "/default-avatar.png",
    description: "Avocate hispanophone spécialisée en droit de l'immigration en Espagne.",
  },
  {
    id: "demo-expat-3",
    name: "Pierre C.",
    firstName: "Pierre",
    lastName: "Chen",
    type: "expat",
    country: "Canada",
    languages: ["fr", "en", "zh"],
    specialties: ["Immigration", "Travail", "Études"],
    rating: 4.6,
    reviewCount: 78,
    yearsOfExperience: 6,
    isOnline: false,
    price: 19,
    duration: 30,
    avatar: "/default-avatar.png",
    description: "Expert Canada : immigration, permis de travail et études.",
  },
];

/* =========================
   Utils
========================= */
const getBrowserLanguage = (): "fr" | "en" | "es" => {
  if (typeof window === "undefined") return "fr";
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith("fr")) return "fr";
  if (browserLang.startsWith("es")) return "es";
  return "en";
};

const getLanguage = (userLanguage?: string): "fr" | "en" | "es" => {
  if (userLanguage) return userLanguage as "fr" | "en" | "es";
  return getBrowserLanguage();
};

const getProfessionInfo = (type: string) => {
  return PROFESSION_ICONS[type] || PROFESSION_ICONS["expat"];
};

const useStatusColors = (isOnline: boolean) => {
  return useMemo(
    () =>
      isOnline
        ? {
          border: "border-green-300",
          shadow: "shadow-green-100",
          glow: "shadow-green-200/50",
          borderShadow: "drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]",
          badge: "bg-green-100 text-green-800 border-green-300",
          button:
            "bg-green-700 hover:bg-green-800 active:bg-green-900 border-green-700",
          accent: "text-green-700",
        }
        : {
          border: "border-red-300",
          shadow: "shadow-red-100",
          glow: "shadow-red-200/50",
          borderShadow: "drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]",
          badge: "bg-red-100 text-red-800 border-red-300",
          button:
            "bg-red-700 hover:bg-red-800 active:bg-red-900 border-red-700",
          accent: "text-red-700",
        },
    [isOnline]
  );
};

const slugify = (s: string) =>
  (s || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

// ========================================
// 🔀 Fonction de mélange aléatoire (Fisher-Yates)
// ========================================
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/* =========================
   🌍 Fonctions de traduction dynamique
========================= */
const getCountryLanguageKey = (locale: string): LanguageKey => {
  const mapping: Record<string, LanguageKey> = {
    'fr': 'nameFr',
    'en': 'nameEn',
    'es': 'nameEs',
    'de': 'nameDe',
    'pt': 'namePt',
    'ru': 'nameRu',
    'hi': 'nameFr',
    'ch': 'nameZh',
    'zh': 'nameZh',
    'ar': 'nameAr',
    'it': 'nameIt',
    'nl': 'nameNl',
  };
  return mapping[locale.toLowerCase()] || 'nameEn';
};

const getLanguagesLocale = (locale: string): SupportedLocale => {
  const mapping: Record<string, SupportedLocale> = {
    'fr': 'fr',
    'en': 'en',
    'es': 'es',
    'de': 'de',
    'pt': 'pt',
    'ru': 'ru',
    'hi': 'hi',
    'ch': 'ch',
    'zh': 'ch',
    'ar': 'ar',
  };
  return mapping[locale.toLowerCase()] || 'fr';
};
const countryOptions = [
  "Afghanistan",
  "South Africa",
  "Albania",
  "Algeria",
  "Germany",
  "Andorra",
  "Angola",
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
  "Cabo Verde",
  "Chile",
  "China",
  "Cyprus",
  "Colombia",
  "Comoros",
  "Congo",
  "North Korea",
  "South Korea",
  "Costa Rica",
  "Côte d'Ivoire",
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
  "Netherlands",
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
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Central African Republic",
  "Democratic Republic of the Congo",
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
  "Timor-Leste",
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
  "Vatican City",
  "Venezuela",
  "Vietnam",
  "Yemen",
  "Zambia",
  "Zimbabwe",
];


// Retourne les options pays avec code et label traduit
const getCountryOptions = (locale: string): { code: string; label: string }[] => {
  const langKey = getCountryLanguageKey(locale);
  return getSortedCountries(langKey)
    .filter(country => country.code !== 'SEPARATOR')
    .map(country => ({
      code: country.code,
      label: country[langKey]
    }));
};

// Retourne les options langues avec code et label traduit
const getLanguageOptions = (locale: string): { code: string; label: string }[] => {
  const supportedLocale = getLanguagesLocale(locale);
  return languagesData
    .map(lang => ({
      code: lang.code,
      label: getLanguageLabel(lang, supportedLocale)
    }))
    .sort((a, b) => {
      const sortLocale = supportedLocale === 'ch' ? 'zh' : supportedLocale;
      return a.label.localeCompare(b.label, sortLocale);
    });
};

// Trouve un pays par son code ou par n'importe quel nom traduit
const findCountryByCodeOrName = (value: string): CountryData | undefined => {
  if (!value) return undefined;
  
  const normalizedValue = value.toLowerCase().trim();
  
  // D'abord chercher par code exact
  const byCode = countriesData.find(country => 
    country.code.toLowerCase() === normalizedValue
  );
  if (byCode) return byCode;
  
  // Ensuite chercher par nom exact dans toutes les langues
  const byExactName = countriesData.find(country => {
    const allNames = [
      country.nameFr,
      country.nameEn,
      country.nameEs,
      country.nameDe,
      country.namePt,
      country.nameRu,
      country.nameZh,
      country.nameAr,
      country.nameIt,
      country.nameNl,
    ].filter(Boolean).map(n => n?.toLowerCase().trim());
    
    return allNames.includes(normalizedValue);
  });
  if (byExactName) return byExactName;
  
  // Enfin, chercher par correspondance partielle (pour gérer les variantes)
  const byPartialMatch = countriesData.find(country => {
    const allNames = [
      country.code,
      country.nameFr,
      country.nameEn,
      country.nameEs,
      country.nameDe,
      country.namePt,
      country.nameRu,
      country.nameZh,
      country.nameAr,
      country.nameIt,
      country.nameNl,
    ].filter(Boolean).map(n => n?.toLowerCase().trim());
    
    // Vérifier si la valeur contient un des noms ou vice-versa
    return allNames.some(name => 
      name === normalizedValue || 
      name?.includes(normalizedValue) || 
      normalizedValue.includes(name || '')
    );
  });
  
  return byPartialMatch;
};

// Vérifie si un pays du provider correspond au filtre sélectionné
const matchCountry = (
  providerCountry: string,
  selectedCountryCode: string,
  customCountry: string
): boolean => {
  if (selectedCountryCode === "all") return true;
  if (!providerCountry) return false;
  
  const providerCountryLower = providerCountry.toLowerCase().trim();
  const selectedCodeLower = selectedCountryCode.toLowerCase().trim();
  
  // Cas "Autre" avec recherche personnalisée
  if (selectedCountryCode === "Autre") {
    if (!customCountry) return true;
    const needle = customCountry.toLowerCase().trim();
    return providerCountryLower.includes(needle) || needle.includes(providerCountryLower);
  }
  
  // Comparaison directe (si le provider stocke le code ISO)
  if (providerCountryLower === selectedCodeLower) {
    return true;
  }
  
  // Générer tous les noms possibles du pays sélectionné dans toutes les langues
  // 'ch' est le code interne pour le chinois (converti en 'zh' pour les APIs)
  const allLanguages = ['fr', 'en', 'es', 'de', 'pt', 'ru', 'ch', 'ar', 'hi'];
  const allPossibleNames: string[] = [selectedCodeLower];
  
  for (const lang of allLanguages) {
    const name = getCountryName(selectedCountryCode, lang);
    if (name && name.toLowerCase().trim() !== selectedCodeLower) {
      allPossibleNames.push(name.toLowerCase().trim());
    }
  }
  
  // Vérifier si le pays du provider correspond à l'un des noms
  return allPossibleNames.includes(providerCountryLower);
};

// Vérifie si les langues du provider correspondent au filtre (supporte multi-sélection)
const matchLanguage = (
  providerLangs: string[],
  selectedCodes: string[], // Changé: array de codes au lieu d'un seul
  custom: string
): boolean => {
  // Si aucune langue sélectionnée ou "all", on montre tout
  if (!selectedCodes || selectedCodes.length === 0 || selectedCodes.includes("all")) return true;
  if (!providerLangs || providerLangs.length === 0) return false;

  // Convertir les langues du provider en codes normalisés
  const providerLangCodes = convertLanguageNamesToCodes(providerLangs).map(c => c.toLowerCase());

  // Si "Autre" est sélectionné, chercher avec le texte custom
  if (selectedCodes.includes("Autre")) {
    if (!custom) return true;
    const needle = custom.toLowerCase().trim();

    // Chercher dans les codes et les labels traduits
    const matchesCustom = providerLangCodes.some(code => {
      // Vérifier le code directement
      if (code.includes(needle)) return true;

      // Convertir 'ch' en 'zh' car languagesData utilise 'zh' pour le chinois
      const normalizedCode = code === 'ch' ? 'zh' : code;
      const lang = languagesData.find(l => l.code.toLowerCase() === normalizedCode);
      if (!lang) return false;

      // Vérifier tous les labels dans toutes les langues via l'objet labels
      if (lang.labels) {
        const allLabels = Object.values(lang.labels).filter(Boolean).map(l => l?.toLowerCase());
        return allLabels.some(l => l?.includes(needle));
      }

      return false;
    });
    if (matchesCustom) return true;
  }

  // Recherche par codes de langues sélectionnés - le provider doit parler AU MOINS UNE des langues
  const targetCodes = selectedCodes.filter(c => c !== "Autre").map(c => c.toLowerCase());
  if (targetCodes.length === 0) return true;

  return targetCodes.some(targetCode => providerLangCodes.includes(targetCode));
};

/* =========================
   🔍 JSON-LD Schema Generator (SEO)
========================= */
const generateAllSchemas = (
  intl: ReturnType<typeof useIntl>,
  providers: Provider[],
  selectedType: string,
  onlineCount: number,
  currentLang: string,
  faqData: FAQItem[]
) => {
  const localizedPageUrl = `${BASE_URL}/${currentLang}${PAGE_PATH}`;
  
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${BASE_URL}/#organization`,
    name: "SOS Expat",
    url: BASE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${BASE_URL}/logo.png`,
      width: 512,
      height: 512,
    },
    description: intl.formatMessage({ id: "sosCall.seo.organizationDescription" }),
    contactPoint: {
      "@type": "ContactPoint",
      contactType: intl.formatMessage({ id: "sosCall.seo.contactType" }),
      availableLanguage: ["French", "English", "Spanish", "German", "Portuguese", "Russian", "Chinese", "Arabic", "Hindi"],
    },
    sameAs: Object.values(SOCIAL_URLS),
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${BASE_URL}/#website`,
    url: BASE_URL,
    name: "SOS Expat",
    description: intl.formatMessage({ id: "sosCall.seo.websiteDescription" }),
    publisher: { "@id": `${BASE_URL}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    inLanguage: intl.locale,
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${BASE_URL}${PAGE_PATH}/#service`,
    name: intl.formatMessage({ id: "sosCall.seo.serviceName" }),
    description: intl.formatMessage({ id: "sosCall.seo.serviceDescription" }),
    provider: { "@id": `${BASE_URL}/#organization` },
    serviceType: intl.formatMessage({ id: "sosCall.seo.serviceType" }),
    areaServed: {
      "@type": "Place",
      name: intl.formatMessage({ id: "sosCall.seo.areaServed" }),
    },
    audience: {
      "@type": "Audience",
      audienceType: intl.formatMessage({ id: "sosCall.seo.audienceType" }),
    },
    availableChannel: {
      "@type": "ServiceChannel",
      serviceUrl: `${BASE_URL}${PAGE_PATH}`,
      servicePhone: "+33 1 XX XX XX XX",
      availableLanguage: ["French", "English", "Spanish", "German", "Portuguese", "Russian", "Chinese", "Arabic", "Hindi"],
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: intl.formatMessage({ id: "sosCall.seo.offerCatalogName" }),
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: intl.formatMessage({ id: "sosCall.seo.lawyerServiceName" }),
            description: intl.formatMessage({ id: "sosCall.seo.lawyerServiceDescription" }),
          },
          priceSpecification: {
            "@type": "PriceSpecification",
            price: "49",
            priceCurrency: "EUR",
            unitText: intl.formatMessage({ id: "sosCall.seo.priceUnit" }),
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: intl.formatMessage({ id: "sosCall.seo.expatServiceName" }),
            description: intl.formatMessage({ id: "sosCall.seo.expatServiceDescription" }),
          },
          priceSpecification: {
            "@type": "PriceSpecification",
            price: "19",
            priceCurrency: "EUR",
            unitText: intl.formatMessage({ id: "sosCall.seo.priceUnit" }),
          },
        },
      ],
    },
    aggregateRating: providers.length > 0 ? {
      "@type": "AggregateRating",
      ratingValue: (providers.reduce((sum, p) => sum + p.rating, 0) / providers.length).toFixed(1),
      reviewCount: providers.reduce((sum, p) => sum + p.reviewCount, 0),
      bestRating: 5,
      worstRating: 1,
    } : undefined,
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${BASE_URL}${PAGE_PATH}/#webpage`,
    url: localizedPageUrl,
    name: intl.formatMessage({ id: "sosCall.seo.pageTitle" }),
    description: intl.formatMessage({ id: "sosCall.seo.pageDescription" }),
    isPartOf: { "@id": `${BASE_URL}/#website` },
    about: { "@id": `${BASE_URL}${PAGE_PATH}/#service` },
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: `${BASE_URL}/og-image-sos-call.jpg`,
      width: 1200,
      height: 630,
    },
    breadcrumb: { "@id": `${BASE_URL}${PAGE_PATH}/#breadcrumb` },
    inLanguage: intl.locale,
    datePublished: "2024-01-01T00:00:00+00:00",
    dateModified: new Date().toISOString(),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `${BASE_URL}${PAGE_PATH}/#breadcrumb`,
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: intl.formatMessage({ id: "sosCall.seo.breadcrumb.home" }),
        item: `${BASE_URL}/${currentLang}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: intl.formatMessage({ id: "sosCall.seo.breadcrumb.sosCall" }),
        item: localizedPageUrl,
      },
    ],
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${BASE_URL}${PAGE_PATH}/#faq`,
    mainEntity: faqData.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  const itemListSchema = providers.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${BASE_URL}${PAGE_PATH}/#providers`,
    name: intl.formatMessage({ id: "sosCall.seo.providerListName" }),
    description: intl.formatMessage({ id: "sosCall.seo.providerListDescription" }),
    numberOfItems: providers.length,
    itemListElement: providers.slice(0, 10).map((provider, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Person",
        "@id": `${BASE_URL}/prestataire/${provider.id}`,
        name: provider.name,
        jobTitle: provider.type === "lawyer" 
          ? intl.formatMessage({ id: "sosCall.profession.lawyer" })
          : intl.formatMessage({ id: "sosCall.profession.expat" }),
        image: provider.avatar || `${BASE_URL}/default-avatar.png`,
        worksFor: { "@id": `${BASE_URL}/#organization` },
        knowsLanguage: provider.languages,
        workLocation: {
          "@type": "Place",
          name: provider.country,
        },
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: provider.rating.toFixed(1),
          reviewCount: provider.reviewCount,
          bestRating: 5,
          worstRating: 1,
        },
      },
    })),
  } : null;

  const professionalServiceSchema = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `${BASE_URL}${PAGE_PATH}/#professional-service`,
    name: intl.formatMessage({ id: "sosCall.seo.professionalServiceName" }),
    description: intl.formatMessage({ id: "sosCall.seo.professionalServiceDescription" }),
    url: `${BASE_URL}${PAGE_PATH}`,
    telephone: "+33 1 XX XX XX XX",
    priceRange: "€€",
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "00:00",
      closes: "23:59",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 48.8566,
      longitude: 2.3522,
    },
    address: {
      "@type": "PostalAddress",
      addressCountry: "FR",
    },
  };

  // HowTo Schema (pour Featured Snippets / Position 0)
  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "@id": `${BASE_URL}${PAGE_PATH}/#howto`,
    name: intl.formatMessage({ id: "sosCall.seo.howTo.name" }),
    description: intl.formatMessage({ id: "sosCall.seo.howTo.description" }),
    image: `${BASE_URL}/og-image-sos-call.jpg`,
    totalTime: "PT5M",
    estimatedCost: {
      "@type": "MonetaryAmount",
      currency: "EUR",
      value: "19",
    },
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: intl.formatMessage({ id: "sosCall.seo.howTo.step1.name" }),
        text: intl.formatMessage({ id: "sosCall.seo.howTo.step1.text" }),
        url: `${BASE_URL}${PAGE_PATH}#experts`,
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: intl.formatMessage({ id: "sosCall.seo.howTo.step2.name" }),
        text: intl.formatMessage({ id: "sosCall.seo.howTo.step2.text" }),
        url: `${BASE_URL}${PAGE_PATH}#experts`,
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: intl.formatMessage({ id: "sosCall.seo.howTo.step3.name" }),
        text: intl.formatMessage({ id: "sosCall.seo.howTo.step3.text" }),
        url: `${BASE_URL}${PAGE_PATH}#experts`,
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: intl.formatMessage({ id: "sosCall.seo.howTo.step4.name" }),
        text: intl.formatMessage({ id: "sosCall.seo.howTo.step4.text" }),
        url: `${BASE_URL}${PAGE_PATH}#experts`,
      },
    ],
  };

  // Speakable Schema (pour Google Assistant / Siri / Alexa)
  const speakableSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${BASE_URL}${PAGE_PATH}/#speakable`,
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["h1", ".featured-snippet", ".expert-count", ".faq-answer"],
    },
    url: localizedPageUrl,
  };

  // Event Schema (pour les consultations en ligne)
  const eventSchema = {
    "@context": "https://schema.org",
    "@type": "Event",
    "@id": `${BASE_URL}${PAGE_PATH}/#event`,
    name: intl.formatMessage({ id: "sosCall.seo.event.name" }),
    description: intl.formatMessage({ id: "sosCall.seo.event.description" }),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    location: {
      "@type": "VirtualLocation",
      url: `${BASE_URL}${PAGE_PATH}`,
    },
    organizer: { "@id": `${BASE_URL}/#organization` },
    offers: {
      "@type": "Offer",
      price: "19",
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      url: `${BASE_URL}${PAGE_PATH}`,
      validFrom: new Date().toISOString(),
    },
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    image: `${BASE_URL}/og-image-sos-call.jpg`,
  };

  // Product Schema (pour Google Shopping / Rich Results)
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${BASE_URL}${PAGE_PATH}/#product`,
    name: intl.formatMessage({ id: "sosCall.seo.product.name" }),
    description: intl.formatMessage({ id: "sosCall.seo.product.description" }),
    image: `${BASE_URL}/og-image-sos-call.jpg`,
    brand: {
      "@type": "Brand",
      name: "SOS Expat",
    },
    offers: {
      "@type": "AggregateOffer",
      lowPrice: "19",
      highPrice: "49",
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      offerCount: providers.length || 50,
    },
    aggregateRating: providers.length > 0 ? {
      "@type": "AggregateRating",
      ratingValue: (providers.reduce((sum, p) => sum + p.rating, 0) / providers.length).toFixed(1),
      reviewCount: providers.reduce((sum, p) => sum + p.reviewCount, 0),
      bestRating: 5,
      worstRating: 1,
    } : {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      reviewCount: 1250,
      bestRating: 5,
      worstRating: 1,
    },
    category: intl.formatMessage({ id: "sosCall.seo.product.category" }),
  };

  // SoftwareApplication Schema (pour PWA)
  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${BASE_URL}/#app`,
    name: "SOS Expat",
    operatingSystem: "Web, iOS, Android",
    applicationCategory: "BusinessApplication",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: 1250,
    },
  };

  return [
    organizationSchema,
    websiteSchema,
    serviceSchema,
    webPageSchema,
    breadcrumbSchema,
    faqSchema,
    itemListSchema,
    professionalServiceSchema,
    howToSchema,
    speakableSchema,
    eventSchema,
    productSchema,
    softwareAppSchema,
  ].filter(Boolean);
};

/* =========================
   ModernProfileCard Component
========================= */
const ModernProfileCard: React.FC<{
  provider: Provider;
  onProfileClick: (provider: Provider) => void;
  index?: number;
  language?: string;
  intl: ReturnType<typeof useIntl>;
}> = React.memo(({ provider, onProfileClick, index = 0, language, intl }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const statusColors = useStatusColors(provider.isOnline);
  const professionInfo = useMemo(
    () => getProfessionInfo(provider.type),
    [provider.type]
  );

  const handleImageError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const target = e.currentTarget;
      if (target.src !== "/default-avatar.png" && !imageError) {
        setImageError(true);
        target.src = "/default-avatar.png";
      }
    },
    [imageError]
  );

  const handleClick = useCallback(() => {
    onProfileClick(provider);
  }, [provider, onProfileClick]);

  const handleMouseEnter = useCallback(() => {
    if (window.matchMedia("(hover: hover)").matches) {
      setIsHovered(true);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const formattedLanguages = useMemo(() => {
    if (!provider.languages || provider.languages.length === 0) {
      return '';
    }
    
    const translatedLanguages = provider.languages
      .slice(0, 3)
      .map(langCode => {
        // Convertir 'ch' en 'zh' car languagesData utilise 'zh' pour le chinois
        const normalizedCode = langCode.toLowerCase() === 'ch' ? 'zh' : langCode.toLowerCase();
        const lang = languagesData.find(l => l.code.toLowerCase() === normalizedCode);
        return lang ? getLanguageLabel(lang, language as SupportedLocale) : langCode;
      })
      .filter(name => name !== '');
    
    let result = translatedLanguages.join(' • ');
    if (provider.languages.length > 3) {
      result += ` +${provider.languages.length - 3}`;
    }
    return result;
  }, [provider.languages, language]);

  const formattedCountries = useMemo(() => {
    const countries = provider.interventionCountries && provider.interventionCountries.length > 0
      ? provider.interventionCountries
      : provider.country ? [provider.country] : [];
    
    if (countries.length === 0) return '';
    
    const translatedCountries = countries
      .slice(0, 2)
      .map(countryCode => getCountryName(countryCode, language))
      .filter(name => name !== '');
    
    let result = translatedCountries.join(' • ');
    if (countries.length > 2) {
      result += ` +${countries.length - 2}`;
    }
    return result;
  }, [provider.interventionCountries, provider.country, language]);

  const formattedSpecialties = useMemo(() => {
    return formatSpecialties(provider.specialties, mapLanguageToLocale(language || 'fr'), 2);
  }, [provider.specialties, language]);

  const ariaLabels = useMemo(
    () => ({
      card: intl.formatMessage(
        { id: "sosCall.card.ariaProfileCard" },
        { name: provider.name }
      ),
      status: intl.formatMessage(
        { id: "sosCall.card.ariaOnlineStatus" },
        {
          status: provider.isOnline
            ? intl.formatMessage({ id: "sosCall.status.online" })
            : intl.formatMessage({ id: "sosCall.status.offline" }),
        }
      ),
      rating: intl.formatMessage(
        { id: "sosCall.card.ariaRating" },
        { rating: provider.rating.toFixed(1) }
      ),
      viewProfile: intl.formatMessage(
        { id: "sosCall.card.ariaViewProfileAction" },
        { name: provider.name }
      ),
    }),
    [intl, provider.name, provider.isOnline, provider.rating]
  );

  return (
    <div className="flex-shrink-0 p-2 sm:p-3">
      <article
        className={`
          relative bg-white rounded-2xl overflow-hidden cursor-pointer
          transition-all duration-300 ease-out border-2 shadow-lg
          w-[320px] h-[520px]
          sm:w-[340px] sm:h-[540px]
          md:w-[360px] md:h-[560px]
          ${statusColors.border} ${statusColors.shadow} ${statusColors.borderShadow}
          ${isHovered ? `scale-[1.02] ${statusColors.glow} shadow-xl` : ""}
          focus:outline-none focus:ring-4 focus:ring-blue-500/50
          hover:shadow-xl
          touch-manipulation
        `}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        tabIndex={0}
        role="article"
        aria-label={ariaLabels.card}
        itemScope
        itemType="https://schema.org/Person"
        style={{
          animationDelay: `${index * 80}ms`,
        }}
      >
        {/* Header avec photo et statut */}
        <div
          className="relative overflow-hidden bg-slate-100"
          style={{ height: "55%" }}
        >
          <img
            src={provider.avatar || "/default-avatar.png"}
            alt={intl.formatMessage(
              { id: "sosCall.card.imageAlt" },
              { name: provider.name }
            )}
            className={`
              w-full h-full object-cover transition-all duration-300
              ${imageLoaded ? "opacity-100" : "opacity-0"}
              ${isHovered ? "scale-105" : ""}
            `}
            onLoad={() => setImageLoaded(true)}
            onError={handleImageError}
            loading="lazy"
            decoding="async"
            itemProp="image"
          />

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" aria-hidden="true" />

          {/* Statut en ligne */}
          <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3">
            <div
              className={`
                inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium
                backdrop-blur-sm border shadow-sm transition-colors
                ${statusColors.badge}
                min-h-[36px] sm:min-h-[44px]
              `}
              role="status"
              aria-live="polite"
              aria-label={ariaLabels.status}
            >
              {provider.isOnline ? (
                <Wifi className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
              )}
              <span>
                {provider.isOnline
                  ? intl.formatMessage({ id: "sosCall.status.online" })
                  : intl.formatMessage({ id: "sosCall.status.offline" })}
              </span>
            </div>
          </div>

          {/* Badge métier */}
          <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3">
            <div
              className={`
              inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full 
              backdrop-blur-sm border shadow-sm border-white/30
              ${professionInfo.bgColor} ${professionInfo.textColor}
              min-h-[36px] sm:min-h-[44px]
            `}
            >
              <span className="text-xs sm:text-sm font-medium" itemProp="jobTitle">
                <span aria-hidden="true">{professionInfo.icon}</span>{" "}
                <FormattedMessage
                  id={
                    provider.type === "lawyer"
                      ? "sosCall.profession.lawyer"
                      : "sosCall.profession.expat"
                  }
                />
              </span>
            </div>
          </div>

          {/* Note */}
          <div className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3">
            <div
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-white/95 backdrop-blur-sm border border-slate-200 shadow-sm"
              aria-label={ariaLabels.rating}
              itemProp="aggregateRating"
              itemScope
              itemType="https://schema.org/AggregateRating"
            >
              <Star
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 fill-current"
                aria-hidden="true"
              />
              <span className="text-slate-800 text-xs sm:text-sm font-medium" itemProp="ratingValue">
                {provider.rating.toFixed(1)}
              </span>
              <meta itemProp="bestRating" content="5" />
              <meta itemProp="worstRating" content="1" />
              <meta itemProp="reviewCount" content={String(provider.reviewCount)} />
            </div>
          </div>
        </div>

        {/* Contenu principal */}
        <div
          className="p-2.5 sm:p-3 flex flex-col"
          style={{ height: "45%" }}
        >
          {/* Nom et expérience */}
          <div className="space-y-1.5 sm:space-y-2 mb-2 sm:mb-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg sm:text-xl font-bold text-slate-800 truncate flex-1" itemProp="name">
                {provider.name}
              </h3>
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-teal-50 border border-teal-200 flex-shrink-0">
                <Zap className="w-3 h-3 text-teal-600" aria-hidden="true" />
                <span className="text-teal-600 text-[10px] sm:text-xs font-medium">
                  {provider.yearsOfExperience}{" "}
                  <FormattedMessage id="sosCall.card.years" />
                </span>
              </div>
            </div>
          </div>

          {/* Informations */}
          <div className="space-y-1.5 sm:space-y-2 flex-1 overflow-hidden">
            {/* Pays d'intervention */}
            {formattedCountries && (
              <div className="flex items-start gap-1.5 sm:gap-2">
                <MapPin className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span className="text-blue-600 text-xs sm:text-sm leading-tight line-clamp-2" itemProp="workLocation">
                  {formattedCountries}
                </span>
              </div>
            )}

            {/* Langues parlées */}
            {formattedLanguages && (
              <div className="flex items-start gap-1.5 sm:gap-2">
                <Globe className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span className="text-indigo-600 text-xs sm:text-sm leading-tight line-clamp-2" itemProp="knowsLanguage">
                  {formattedLanguages}
                </span>
              </div>
            )}

            {/* Spécialités */}
            {formattedSpecialties && (
              <div className="flex items-start gap-1.5 sm:gap-2">
                <Briefcase className="w-3.5 h-3.5 text-purple-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span className="text-purple-600 text-xs sm:text-sm leading-tight line-clamp-2" itemProp="hasOccupation">
                  {formattedSpecialties}
                </span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 mt-auto">
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3 text-amber-600" aria-hidden="true" />
              <span className="text-amber-600 text-[10px] sm:text-xs font-medium">
                {provider.reviewCount}{" "}
                <FormattedMessage id="sosCall.card.reviews" />
              </span>
            </div>
            <div className="text-slate-500 text-[10px] sm:text-xs">
              <FormattedMessage
                id={
                  provider.type === "lawyer"
                    ? "sosCall.profession.lawyer"
                    : "sosCall.profession.expat"
                }
              />
            </div>
          </div>

          {/* Bouton CTA */}
          <div className="mt-2 sm:mt-3">
            <button
              className={`
                w-full rounded-lg font-bold text-xs sm:text-sm text-white
                transition-all duration-300 flex items-center justify-center gap-1.5 sm:gap-2
                border-2 shadow-lg relative overflow-hidden
                ${statusColors.button}
                hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]
                focus:outline-none focus:ring-4 focus:ring-blue-500/50
                disabled:opacity-50 disabled:cursor-not-allowed
                touch-manipulation
              `}
              style={{
                minHeight: "44px",
                padding: "10px 14px",
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
              type="button"
              aria-label={ariaLabels.viewProfile}
            >
              <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
              <span className="font-bold">
                <FormattedMessage id="sosCall.card.viewProfile" />
              </span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </article>

      <style>{`
        article {
          animation: slideInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
          transform: translateY(20px);
        }
        
        @keyframes slideInUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @media (prefers-reduced-motion: reduce) {
          article {
            animation: none;
            opacity: 1;
            transform: none;
          }
        }
        
        article:focus-visible {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
});

ModernProfileCard.displayName = "ModernProfileCard";

/* =========================
   FAQ Section Component
========================= */
const FAQSection: React.FC<{ 
  intl: ReturnType<typeof useIntl>;
  faqs: FAQItem[];
  isLoading: boolean;
}> = React.memo(({ intl, faqs, isLoading }) => {
  const [openIndex, setOpenIndex] = useState<string | null>(null);

  return (
    <section 
      className="py-10 sm:py-12 lg:py-16 bg-gray-900"
      aria-labelledby="faq-heading"
      itemScope
      itemType="https://schema.org/FAQPage"
      id="faq"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* ===== H2 - Titre FAQ ===== */}
        <div className="text-center mb-6 sm:mb-10">
          <h2 
            id="faq-heading"
            className="text-xl sm:text-2xl lg:text-3xl font-black text-white mb-3"
            itemProp="headline"
          >
            <FormattedMessage id="sosCall.faq.title" />
          </h2>
          <p 
            className="text-gray-300 text-sm sm:text-base max-w-2xl mx-auto"
            itemProp="description"
          >
            <FormattedMessage id="sosCall.faq.subtitle" />
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-2 sm:space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden animate-pulse">
                <div className="w-full px-4 sm:px-5 py-3.5 sm:py-4 min-h-[52px]">
                  <div className="h-4 bg-white/10 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-white/5 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : faqs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm sm:text-base">
              {intl.formatMessage({ id: "sosCall.faq.noResults" }, { defaultMessage: "No FAQs available at the moment." })}
            </p>
          </div>
        ) : (
          <div 
            className="space-y-2 sm:space-y-3" 
            role="list" 
            aria-label={intl.formatMessage({ id: "sosCall.faq.listAriaLabel" })}
          >
            {faqs.map((faq, index) => {
              const isOpen = openIndex === faq.id;
              return (
                <article
                  key={faq.id}
                  className="rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden faq-item"
                  itemScope
                  itemProp="mainEntity"
                  itemType="https://schema.org/Question"
                  role="listitem"
                  data-faq-index={index}
                >
                  <button
                    className="w-full px-4 sm:px-5 py-3.5 sm:py-4 flex items-center justify-between text-left min-h-[52px] touch-manipulation"
                    onClick={() => setOpenIndex(isOpen ? null : faq.id)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${faq.id}`}
                    id={`faq-question-${faq.id}`}
                  >
                    {/* ===== H3 - Questions FAQ ===== */}
                    <h3 
                      className="font-semibold text-white text-sm sm:text-base pr-3 m-0"
                      itemProp="name"
                    >
                      {faq.question}
                    </h3>
                    <ChevronDown 
                      className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-red-400' : ''}`}
                      aria-hidden="true"
                    />
                  </button>
                  <div
                    id={`faq-answer-${faq.id}`}
                    className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96' : 'max-h-0'}`}
                    itemScope
                    itemProp="acceptedAnswer"
                    itemType="https://schema.org/Answer"
                    role="region"
                    aria-labelledby={`faq-question-${faq.id}`}
                    aria-hidden={!isOpen}
                  >
                    <div className="px-4 sm:px-5 pb-3.5 sm:pb-4">
                      <p 
                        className="text-gray-300 text-sm sm:text-base leading-relaxed faq-answer whitespace-pre-line"
                        itemProp="text"
                      >
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* ===== Structured Data Helper pour Speakable ===== */}
        <div className="sr-only" aria-hidden="true">
          <span itemProp="author" itemScope itemType="https://schema.org/Organization">
            <meta itemProp="name" content="SOS Expat" />
          </span>
        </div>
      </div>
    </section>
  );
});

FAQSection.displayName = "FAQSection";

/* =========================
   Pagination component
========================= */
const Pagination: React.FC<{
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
  intl: ReturnType<typeof useIntl>;
}> = React.memo(({ page, totalPages, onChange, intl }) => {
  if (totalPages <= 1) return null;

  const go = useCallback((p: number) => {
    const np = Math.min(totalPages, Math.max(1, p));
    if (np !== page) {
      onChange(np);
    }
  }, [page, totalPages, onChange]);

  const makePages = useMemo((): Array<number | "ellipsis"> => {
    const pages: Array<number | "ellipsis"> = [];
    const add = (n: number) => pages.push(n);

    const windowSize = 1;
    add(1);
    for (let i = page - windowSize; i <= page + windowSize; i++) {
      if (i > 1 && i < totalPages) add(i);
    }
    if (totalPages > 1) add(totalPages);

    const sorted = Array.from(new Set(pages)).sort((a, b) =>
      typeof a === "number" && typeof b === "number" ? a - b : 0
    );

    const withEllipses: Array<number | "ellipsis"> = [];
    for (let i = 0; i < sorted.length; i++) {
      const cur = sorted[i] as number;
      const prev = sorted[i - 1] as number | undefined;
      if (
        i > 0 &&
        prev !== undefined &&
        typeof prev === "number" &&
        cur - prev > 1
      ) {
        withEllipses.push("ellipsis");
      }
      withEllipses.push(cur);
    }
    return withEllipses;
  }, [page, totalPages]);

  return (
    <nav 
      className="inline-flex items-center gap-1" 
      aria-label={intl.formatMessage({ id: "sosCall.pagination.ariaLabel" })}
      role="navigation"
    >
      <button
        onClick={() => go(page - 1)}
        className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 rounded-xl border border-white/15 bg-white/10 text-white hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] touch-manipulation"
        disabled={page <= 1}
        aria-label={intl.formatMessage({ id: "sosCall.pagination.previousAriaLabel" })}
      >
        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
        <span className="hidden sm:inline text-sm">
          <FormattedMessage id="sosCall.pagination.previous" />
        </span>
      </button>

      {makePages.map((it, idx) =>
        it === "ellipsis" ? (
          <span key={`el-${idx}`} className="px-1.5 sm:px-2 text-gray-300 text-sm" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={`p-${it}`}
            onClick={() => go(it)}
            aria-current={it === page ? "page" : undefined}
            aria-label={intl.formatMessage(
              { id: "sosCall.pagination.pageAriaLabel" },
              { page: it }
            )}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border text-sm font-semibold transition min-h-[44px] touch-manipulation ${
              it === page
                ? "bg-white/20 text-white border-white/30"
                : "bg-white/10 text-gray-200 border-white/20 hover:bg-white/15"
            }`}
          >
            {it}
          </button>
        )
      )}

      <button
        onClick={() => go(page + 1)}
        className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 rounded-xl border border-white/15 bg-white/10 text-white hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] touch-manipulation"
        disabled={page >= totalPages}
        aria-label={intl.formatMessage({ id: "sosCall.pagination.nextAriaLabel" })}
      >
        <span className="hidden sm:inline text-sm">
          <FormattedMessage id="sosCall.pagination.next" />
        </span>
        <ChevronRight className="w-4 h-4" aria-hidden="true" />
      </button>
    </nav>
  );
});

Pagination.displayName = "Pagination";

/* =========================
   🎚️ Bottom Sheet Filter (Mobile)
========================= */
const FilterBottomSheet: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  selectedType: string;
  setSelectedType: (v: "all" | "lawyer" | "expat") => void;
  selectedCountryCode: string;
  handleCountryChange: (v: string) => void;
  selectedLanguageCodes: string[]; // Multi-langue support
  handleLanguageChange: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: "all" | "online" | "offline") => void;
  resetFilters: () => void;
  countryOptions: { code: string; label: string }[];
  languageOptions: { code: string; label: string }[];
  customCountry: string;
  setCustomCountry: (v: string) => void;
  customLanguage: string;
  setCustomLanguage: (v: string) => void;
  showCustomCountry: boolean;
  showCustomLanguage: boolean;
  activeFiltersCount: number;
  intl: ReturnType<typeof useIntl>;
}> = ({
  isOpen, onClose, selectedType, setSelectedType,
  selectedCountryCode, handleCountryChange, selectedLanguageCodes,
  handleLanguageChange, statusFilter, setStatusFilter, resetFilters,
  countryOptions, languageOptions, customCountry, setCustomCountry,
  customLanguage, setCustomLanguage, showCustomCountry, showCustomLanguage,
  activeFiltersCount, intl
}) => {
  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 bg-black/60 backdrop-blur-sm z-50
          transition-opacity duration-300
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={handleBackdropClick}
      />

      {/* Sheet */}
      <div
        className={`
          fixed bottom-0 left-0 right-0 z-50
          bg-gray-900 rounded-t-[32px] border-t border-white/10
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-y-0' : 'translate-y-full'}
          max-h-[85vh] overflow-hidden flex flex-col
        `}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-white/30 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {intl.formatMessage({ id: "sosCall.filters.advanced.title", defaultMessage: "Pays & Langue" })}
              </h3>
              <p className="text-xs text-gray-400">
                {intl.formatMessage({ id: "sosCall.filters.advanced.subtitle", defaultMessage: "Filtres avancés" })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20 transition-colors"
            aria-label={intl.formatMessage({ id: "sosCall.filters.close" }, { defaultMessage: "Fermer" })}
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          
          {/* Country */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <FormattedMessage id="sosCall.filters.country.label" />
            </label>
            <div className="relative">
              <select
                value={selectedCountryCode}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="w-full px-4 py-3.5 bg-white/5 text-white border-2 border-white/10 rounded-2xl focus:outline-none focus:border-red-400/50 transition-all appearance-none text-sm min-h-[48px]"
              >
                <option value="all">🌍 {intl.formatMessage({ id: "sosCall.filters.country.all" })}</option>
                {countryOptions.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
                <option value="Autre">🔍 {intl.formatMessage({ id: "sosCall.filters.country.other" })}</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
            {showCustomCountry && (
              <input
                type="text"
                placeholder={intl.formatMessage({ id: "sosCall.filters.country.placeholder" })}
                value={customCountry}
                onChange={(e) => setCustomCountry(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border-2 border-white/10 rounded-2xl text-white placeholder:text-gray-500 focus:outline-none focus:border-red-400/50 min-h-[48px]"
              />
            )}
          </div>

          {/* Language (multi-select from wizard) */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <FormattedMessage id="sosCall.filters.language.label" />
              {selectedLanguageCodes.length > 1 && (
                <span className="ml-1 text-red-400">({selectedLanguageCodes.length})</span>
              )}
            </label>
            <div className="relative">
              <select
                value={selectedLanguageCodes.length === 0 ? "all" : selectedLanguageCodes[0]}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="w-full px-4 py-3.5 bg-white/5 text-white border-2 border-white/10 rounded-2xl focus:outline-none focus:border-red-400/50 transition-all appearance-none text-sm min-h-[48px]"
              >
                <option value="all">💬 {intl.formatMessage({ id: "sosCall.filters.language.all" })}</option>
                {languageOptions.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
                <option value="Autre">🔍 {intl.formatMessage({ id: "sosCall.filters.language.other" })}</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
            {/* Show selected languages as chips if multi-select */}
            {selectedLanguageCodes.length > 1 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {selectedLanguageCodes.map(code => {
                  const langLabel = languageOptions.find(l => l.code === code)?.label || code;
                  return (
                    <span
                      key={code}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs font-medium"
                    >
                      {langLabel}
                    </span>
                  );
                })}
              </div>
            )}
            {showCustomLanguage && (
              <input
                type="text"
                placeholder={intl.formatMessage({ id: "sosCall.filters.language.placeholder" })}
                value={customLanguage}
                onChange={(e) => setCustomLanguage(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border-2 border-white/10 rounded-2xl text-white placeholder:text-gray-500 focus:outline-none focus:border-red-400/50 min-h-[48px]"
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10 flex gap-3">
          <button
            onClick={resetFilters}
            className="flex-1 py-3.5 px-4 rounded-2xl font-semibold text-gray-300 bg-white/5 border-2 border-white/10 flex items-center justify-center gap-2 active:bg-white/10 min-h-[52px]"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{intl.formatMessage({ id: "sosCall.filters.reset" }, { defaultMessage: "Réinitialiser" })}</span>
          </button>
          <button
            onClick={onClose}
            className="flex-[2] py-3.5 px-4 rounded-2xl font-bold text-white bg-gradient-to-r from-red-600 to-orange-600 flex items-center justify-center gap-2 active:opacity-90 shadow-lg shadow-red-500/20 min-h-[52px]"
          >
            <Sparkles className="w-4 h-4" />
            <span>{intl.formatMessage({ id: "sosCall.filters.showResults" }, { defaultMessage: "Voir les résultats" })}</span>
          </button>
        </div>
      </div>
    </>
  );
};

/* =========================
   Composant principal
========================= */
const SOSCall: React.FC = () => {
  const intl = useIntl();
  const { language, enabledCountries } = useApp();
  const { setWizardOpen } = useWizard();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useLocaleNavigate();
  const location = useLocation();

  // Protection contre le double-clic sur navigation
  const isNavigatingRef = useRef(false);

  // États filtres
  const [selectedType, setSelectedType] = useState<"all" | "lawyer" | "expat">(
    searchParams.get("type") === "lawyer"
      ? "lawyer"
      : searchParams.get("type") === "expat"
        ? "expat"
        : "all"
  );
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>("all");
  const [selectedLanguageCodes, setSelectedLanguageCodes] = useState<string[]>([]); // Multi-langue support
  const [customCountry, setCustomCountry] = useState<string>("");
  const [customLanguage, setCustomLanguage] = useState<string>("");
  const [showCustomCountry, setShowCustomCountry] = useState<boolean>(false);
  const [showCustomLanguage, setShowCustomLanguage] = useState<boolean>(false);

  // Statut
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">("all");

  // Mobile filter bottom sheet
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);

  // Guided filter wizard (mobile-first)
  // Skip wizard if accessing via /providers route (direct profile display)
  const isProvidersRoute = location.pathname.includes('/providers') ||
                           location.pathname.includes('/prestataires') ||
                           location.pathname.includes('/expertos') ||
                           location.pathname.includes('/anbieter');
  const [showWizard, setShowWizard] = useState<boolean>(false);
  const [wizardCompleted, setWizardCompleted] = useState<boolean>(isProvidersRoute);

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  
  // Données
  const [isLoadingProviders, setIsLoadingProviders] = useState<boolean>(true);
  const [realProviders, setRealProviders] = useState<Provider[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<Provider[]>([]);

  // FAQ Data
  const [faqData, setFaqData] = useState<FAQItem[]>([]);
  const [isLoadingFAQs, setIsLoadingFAQs] = useState<boolean>(true);

  // Pagination
  const [page, setPage] = useState<number>(1);

  const lang = (language as "fr" | "en" | "es" | "de" | "pt" | "ch" | "ar" | "hi" | "ru") || "fr";
  const langCode = language?.split('-')[0] || 'fr';

  // Listes traduites dynamiquement - filtrées par pays activés dans l'admin
  const countryOptions = useMemo(() => {
    const allCountries = getCountryOptions(language || 'fr');
    // Si aucun pays activé, retourner tous les pays (fallback)
    if (!enabledCountries || enabledCountries.length === 0) {
      return allCountries;
    }
    // Filtrer pour ne garder que les pays activés
    return allCountries.filter(country =>
      enabledCountries.includes(country.code.toUpperCase())
    );
  }, [language, enabledCountries]);
  
  const languageOptions = useMemo(() => {
    return getLanguageOptions(language || 'fr');
  }, [language]);

  // Auto-show wizard on ALL devices (obligatory on every visit)
  useEffect(() => {
    if (!wizardCompleted) {
      setShowWizard(true);
    }
  }, [wizardCompleted]);

  // Sync wizard state with global context (to hide cookie banner & PWA popup)
  useEffect(() => {
    setWizardOpen(showWizard);
    // Cleanup: reset wizard state when leaving the page
    return () => {
      setWizardOpen(false);
    };
  }, [showWizard, setWizardOpen]);

  // Handle wizard completion (supports multi-language selection)
  const handleWizardComplete = useCallback((filters: {
    country: string;
    languages: string[];
    type: "all" | "lawyer" | "expat";
  }) => {
    setSelectedCountryCode(filters.country);
    // Utiliser TOUTES les langues sélectionnées pour le filtrage
    setSelectedLanguageCodes(filters.languages.length > 0 ? filters.languages : []);
    setSelectedType(filters.type);
    setShowWizard(false);
    setWizardCompleted(true);

    // Store wizard data in sessionStorage for pre-filling booking form
    try {
      sessionStorage.setItem('wizardFilters', JSON.stringify({
        country: filters.country,
        languages: filters.languages,
        type: filters.type
      }));
    } catch (e) {
      console.warn('Failed to store wizard filters in sessionStorage', e);
    }
  }, []);

  // Load FAQs from Firestore
  useEffect(() => {
    const loadFAQs = async () => {
      try {
        setIsLoadingFAQs(true);
        if (!db) {
          console.warn('Firebase not initialized');
          setFaqData([]);
          setIsLoadingFAQs(false);
          return;
        }

        const faqsRef = collection(db, 'faqs');
        
        // Load active FAQs (we filter by language in JavaScript since Firestore can't query nested fields)
        const q = query(
          faqsRef,
          where('isActive', '==', true)
        );
        const snapshot = await getDocs(q);

        const loadedFAQs = snapshot.docs
          .map(doc => {
            const data = doc.data() as {
              category?: string;
              question?: Record<string, string>;
              answer?: Record<string, string>;
              tags?: string[];
              order?: number;
              isActive?: boolean;
            };
            
            // Check if FAQ has content in the current language
            const hasQuestionInLang = data.question?.[langCode] && data.question[langCode].trim().length > 0;
            const hasAnswerInLang = data.answer?.[langCode] && data.answer[langCode].trim().length > 0;
            
            // Only include FAQs that have both question and answer in the current language
            if (!hasQuestionInLang || !hasAnswerInLang) {
              return null; // Filter out FAQs without content in current language
            }
            
            return {
              id: doc.id,
              category: data.category || 'general',
              question: data.question?.[langCode] || '', // Use current language only
              answer: data.answer?.[langCode] || '', // Use current language only
              tags: data.tags || [],
              order: data.order || 999
            };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null) // Remove null items
          .sort((a, b) => {
            // Sort by order field
            return (a.order || 999) - (b.order || 999);
          });
        
        console.log(`Loaded ${loadedFAQs.length} FAQs from Firestore (filtered for language: ${langCode})`);
        setFaqData(loadedFAQs);
      } catch (error) {
        console.error('Error loading FAQs:', error);
        // Show error but don't break the page
        setFaqData([]);
      } finally {
        setIsLoadingFAQs(false);
      }
    };
    loadFAQs();
  }, [langCode]);

  // Lire le type depuis l'URL (une seule fois au mount)
  useEffect(() => {
    const typeParam = searchParams.get("type");
    if (typeParam === "lawyer" || typeParam === "expat") {
      setSelectedType(typeParam);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Charger providers via REST API (plus fiable) avec fallback SDK
  useEffect(() => {
    console.log("🔍 [SOSCall] useEffect - Chargement des providers...");
    let isCancelled = false;

    // Fonction pour transformer les données en Provider
    const transformToProvider = (id: string, data: RawProfile): Provider => {
      const fullName =
        data.fullName ||
        `${data.firstName || ""} ${data.lastName || ""}`.trim() ||
        "Expert";

      const firstName = data.firstName || "";
      const lastName = data.lastName || "";
      const publicDisplayName = firstName && lastName
        ? `${firstName} ${lastName.charAt(0)}.`
        : fullName;

      const type: "lawyer" | "expat" =
        data.type === "lawyer" ? "lawyer" : "expat";

      const country =
        data.currentPresenceCountry || data.country || "Monde";

      return {
        id,
        name: publicDisplayName,
        firstName: data.firstName,
        lastName: data.lastName,
        type,
        country,
        languages:
          Array.isArray(data.languages) && data.languages.length > 0
            ? data.languages
            : ["fr"],
        specialties: Array.isArray(data.specialties)
          ? data.specialties
          : [],
        rating: typeof data.rating === "number" ? data.rating : 4.5,
        reviewCount:
          typeof data.reviewCount === "number" ? data.reviewCount : 0,
        yearsOfExperience:
          (typeof data.yearsOfExperience === "number"
            ? data.yearsOfExperience
            : undefined) ??
          (typeof data.yearsAsExpat === "number" ? data.yearsAsExpat : 0),
        isOnline: data.isOnline === true,
        isActive: data.isActive !== false,
        isVisible: data.isVisible !== false,
        isApproved: data.isApproved !== false,
        isBanned: data.isBanned === true,
        role:
          typeof data.role === "string"
            ? String(data.role).toLowerCase()
            : undefined,
        isAdmin: data.isAdmin === true,
        description: typeof data.bio === "string" ? data.bio : "",
        price:
          typeof data.price === "number"
            ? data.price
            : type === "lawyer"
              ? 49
              : 19,
        duration: data.duration,
        avatar:
          typeof data.profilePhoto === "string" &&
            data.profilePhoto.trim() !== ""
            ? data.profilePhoto
            : "/default-avatar.png",
        education: data.education || data.lawSchool || undefined,
        certifications: data.certifications || undefined,
        lawSchool: typeof data.lawSchool === "string" ? data.lawSchool : undefined,
      };
    };

    // Fonction pour filtrer les providers valides
    const filterValidProviders = (providers: Provider[]): Provider[] => {
      return providers.filter(provider => {
        const notAdmin =
          (provider.role ?? "") !== "admin" && provider.isAdmin !== true;
        const notBanned = provider.isBanned !== true;
        const hasBasicInfo = provider.name.trim() !== "";
        const hasCountry = provider.country.trim() !== "";
        const visible = provider.isVisible !== false;
        const validType = provider.type === "lawyer" || provider.type === "expat";

        return notAdmin && notBanned && hasBasicInfo && hasCountry && visible && validType;
      });
    };

    // STRATÉGIE: Essayer REST API d'abord, puis SDK, puis fallback
    const loadProviders = async () => {
      console.log("🚀 [SOSCall] Tentative 1: API REST Firestore...");

      try {
        // Tentative 1: REST API (plus fiable)
        const docs = await getCollectionRest<RawProfile>("sos_profiles", {
          pageSize: 100,
          timeoutMs: FIRESTORE_TIMEOUT_MS,
        });

        if (isCancelled) return;

        console.log(`✅ [SOSCall] REST API: ${docs.length} documents reçus`);

        const allProviders = docs
          .filter(doc => doc.data.type === "lawyer" || doc.data.type === "expat")
          .map(doc => transformToProvider(doc.id, doc.data));

        const validProviders = filterValidProviders(allProviders);
        console.log(`✅ [SOSCall] ${validProviders.length} providers valides après filtrage`);

        if (validProviders.length > 0) {
          setRealProviders(validProviders);
          setFilteredProviders(validProviders);
          setIsLoadingProviders(false);
          return;
        }

        // Si aucun provider valide, utiliser le fallback
        console.warn("⚠️ [SOSCall] Aucun provider valide, utilisation du fallback");
        setRealProviders(FALLBACK_PROVIDERS);
        setFilteredProviders(FALLBACK_PROVIDERS);
        setIsLoadingProviders(false);

      } catch (restError) {
        console.error("❌ [SOSCall] REST API échoué:", restError);

        if (isCancelled) return;

        // Tentative 2: SDK Firestore avec timeout court
        console.log("🚀 [SOSCall] Tentative 2: SDK Firestore...");

        try {
          const sosProfilesQuery = query(
            collection(db, "sos_profiles"),
            where("type", "in", ["lawyer", "expat"]),
            limit(100)
          );

          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("SDK timeout")), FIRESTORE_TIMEOUT_MS);
          });

          const snapshot = await Promise.race([
            getDocs(sosProfilesQuery),
            timeoutPromise
          ]);

          if (isCancelled) return;

          console.log(`✅ [SOSCall] SDK: ${snapshot.size} documents reçus`);

          const allProviders = snapshot.docs.map(docSnap =>
            transformToProvider(docSnap.id, docSnap.data() as RawProfile)
          );
          const validProviders = filterValidProviders(allProviders);

          if (validProviders.length > 0) {
            setRealProviders(validProviders);
            setFilteredProviders(validProviders);
            setIsLoadingProviders(false);
            return;
          }

          throw new Error("No valid providers from SDK");

        } catch (sdkError) {
          console.error("❌ [SOSCall] SDK aussi échoué:", sdkError);

          // Tentative 3: Fallback providers de démonstration
          console.log("🆘 [SOSCall] Utilisation des providers de démonstration");
          setRealProviders(FALLBACK_PROVIDERS);
          setFilteredProviders(FALLBACK_PROVIDERS);
          setIsLoadingProviders(false);
        }
      }
    };

    loadProviders();

    return () => {
      isCancelled = true;
    };
  }, []); // Charger une seule fois au mount

  // Generate search suggestions 
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchSuggestions([]);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const suggestions: string[] = [];
    
    // Add provider type keywords in user's active language
    const userLang = (language as SupportedLanguage) || "fr";
    if (selectedType === "all" || selectedType === "lawyer") {
      const lawyerKeywords = getProviderTypeKeywords("lawyer", userLang);
      lawyerKeywords.forEach(keyword => {
        if (keyword.toLowerCase().includes(query) && keyword.length > 2) {
          suggestions.push(keyword);
        }
      });
    }
    
    if (selectedType === "all" || selectedType === "expat") {
      const expatKeywords = getProviderTypeKeywords("expat", userLang);
      expatKeywords.forEach(keyword => {
        if (keyword.toLowerCase().includes(query) && keyword.length > 2) {
          suggestions.push(keyword);
        }
      });
    }
    
    // Add country suggestions from providers
    const countrySuggestions = Array.from(
      new Set(realProviders.map(p => p.country).filter(Boolean))
    ).filter(country => 
      country.toLowerCase().includes(query)
    ).slice(0, 5);
    
    suggestions.push(...countrySuggestions);
    
    // Add language suggestions
    const languageSuggestions = Array.from(
      new Set(realProviders.flatMap(p => p.languages || []).filter(Boolean))
    ).filter(lang => 
      lang.toLowerCase().includes(query)
    ).slice(0, 5);
    
    suggestions.push(...languageSuggestions);
    
    // Add specialty suggestions
    const specialtySuggestions = Array.from(
      new Set(realProviders.flatMap(p => p.specialties || []).filter(Boolean))
    ).filter(specialty => 
      specialty.toLowerCase().includes(query)
    ).slice(0, 5);
    
    suggestions.push(...specialtySuggestions);
    
    // Add education suggestions
    const educationSuggestions = realProviders
      .map(p => {
        if (Array.isArray(p.education)) return p.education.join(" ");
        if (typeof p.education === "string") return p.education;
        return p.lawSchool || "";
      })
      .filter(Boolean)
      .filter(edu => edu.toLowerCase().includes(query))
      .slice(0, 5);
    
    suggestions.push(...educationSuggestions);
    
    // Add certification suggestions
    const certificationSuggestions = realProviders
      .map(p => {
        if (Array.isArray(p.certifications)) return p.certifications.join(" ");
        if (typeof p.certifications === "string") return p.certifications;
        return "";
      })
      .filter(Boolean)
      .filter(cert => cert.toLowerCase().includes(query))
      .slice(0, 5);
    
    suggestions.push(...certificationSuggestions);
    
    setSearchSuggestions(Array.from(new Set(suggestions)).slice(0, 12));
  }, [searchQuery, selectedType, realProviders, language]);

  // Filtrage + tri
  useEffect(() => {
    if (realProviders.length === 0) {
      setFilteredProviders([]);
      return;
    }

    const next = realProviders.filter((provider) => {
      const matchesType =
        selectedType === "all" || provider.type === selectedType;
      
      // Filtre pays avec la nouvelle fonction
      const matchesCountryFilter = matchCountry(
        provider.country,
        selectedCountryCode,
        customCountry
      );
      
      // Filtre langue avec la nouvelle fonction (multi-langues)
      const matchesLanguageFilter = matchLanguage(
        provider.languages,
        selectedLanguageCodes,
        customLanguage
      );

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "online"
            ? provider.isOnline
            : !provider.isOnline;

      // Search filter - multilingual search
      const matchesSearch = !searchQuery.trim() || (() => {
        const query = searchQuery.toLowerCase().trim();
        const searchTerms = query.split(" ").filter(Boolean);
        
        // Build searchable content - use user's active language for keywords
        const userLang = (language as SupportedLanguage) || "fr";
        const multilingualKeywords = provider.type === "lawyer" 
          ? getProviderTypeKeywords("lawyer", userLang).join(" ")
          : getProviderTypeKeywords("expat", userLang).join(" ");
        
        // Extract education and certifications as strings
        const educationText = Array.isArray(provider.education)
          ? provider.education.join(" ")
          : typeof provider.education === "string"
            ? provider.education
            : provider.lawSchool || "";
        
        const certificationsText = Array.isArray(provider.certifications)
          ? provider.certifications.join(" ")
          : typeof provider.certifications === "string"
            ? provider.certifications
            : "";
        
        // Detect search language to prioritize relevant translations
        const searchLang = detectSearchLanguage(searchQuery);
        
        // Get translated content for search - include ALL translations
        let translatedDescription = "";
        let translatedSpecialties: string[] = [];
        
        if (provider.translations && Object.keys(provider.translations).length > 0) {
          // Include ALL available translations for comprehensive search
          Object.entries(provider.translations).forEach(([lang, trans]) => {
            if (trans && typeof trans === 'object') {
              const t = trans as { description?: string; bio?: string; summary?: string; specialties?: string[] };
              // Add all text fields
              const desc = t.description || "";
              const bio = t.bio || "";
              const summary = t.summary || "";
              if (desc) translatedDescription += " " + desc;
              if (bio) translatedDescription += " " + bio;
              if (summary) translatedDescription += " " + summary;
              
              // Add specialties
              if (Array.isArray(t.specialties) && t.specialties.length > 0) {
                translatedSpecialties = [...translatedSpecialties, ...t.specialties];
              }
            }
          });
          
          // Trim and clean up
          translatedDescription = translatedDescription.trim();
          translatedSpecialties = Array.from(new Set(translatedSpecialties)); // Remove duplicates
        }
        
        // Build comprehensive searchable content
        const searchableContent = [
          provider.name,
          provider.firstName,
          provider.lastName,
          provider.country,
          provider.description || "", // Original description
          translatedDescription, // All translated descriptions (bio, description, summary from all languages)
          ...(provider.languages || []),
          ...(provider.specialties || []), // Original specialties
          ...translatedSpecialties, // Translated specialties from all languages
          educationText,
          certificationsText,
          provider.lawSchool || "",
          multilingualKeywords,
        ]
          .filter(Boolean)
          .filter((item) => typeof item === "string" && item.trim().length > 0)
          .join(" ")
          .toLowerCase();
        
        // Debug logging for search (always log when searching)
        if (searchQuery.trim().length > 0) {
          const queryLower = searchQuery.toLowerCase();
          const hasMatch = searchableContent.includes(queryLower);
          
          // Always log for debugging
          console.log(`[SOSCall Search] Provider: ${provider.name}`, {
            searchQuery: searchQuery.substring(0, 50),
            queryLength: searchQuery.length,
            hasTranslations: !!provider.translations,
            translationKeys: provider.translations ? Object.keys(provider.translations) : [],
            translatedDescLength: translatedDescription.length,
            translatedDescPreview: translatedDescription.substring(0, 100),
            translatedSpecsCount: translatedSpecialties.length,
            translatedSpecs: translatedSpecialties.slice(0, 3),
            searchableLength: searchableContent.length,
            searchablePreview: searchableContent.substring(0, 300),
            matches: hasMatch,
            searchTerms: queryLower.split(" ").filter(Boolean),
          });
        }
        
        // Multi-term search - all terms must match
        // For name searches, prioritize exact matches in name fields
        const nameFields = [
          provider.name,
          provider.firstName,
          provider.lastName,
        ].filter(Boolean).join(" ").toLowerCase();
        
        // Check if all search terms match in name fields (exact name match)
        const exactNameMatch = searchTerms.every(term => nameFields.includes(term));
        
        // If it's a potential name search (2+ words), prioritize name matching
        if (searchTerms.length >= 2) {
          if (exactNameMatch) return true;
          // If name doesn't match, check if it's a partial match in other fields
          // but be more strict - require at least one term to match in name
          const atLeastOneNameMatch = searchTerms.some(term => nameFields.includes(term));
          if (!atLeastOneNameMatch) {
            // For multi-word searches that don't match names, check other fields more strictly
            // IMPORTANT: Include translated content here!
            const otherFieldsContent = [
              provider.country,
              provider.description, // Original
              translatedDescription, // ALL translations
              ...(provider.languages || []),
              ...(provider.specialties || []), // Original
              ...translatedSpecialties, // ALL translated specialties
              educationText,
              certificationsText,
            ].filter(Boolean).join(" ").toLowerCase();
            
            // All terms must match in other fields (including translations)
            const allMatch = searchTerms.every(term => {
              const termLower = term.toLowerCase();
              return otherFieldsContent.includes(termLower);
            });
            
            if (!allMatch) {
              console.log(`[SOSCall Search] Multi-word search didn't match for ${provider.name}`, {
                searchTerms,
                otherFieldsLength: otherFieldsContent.length,
                translatedDescLength: translatedDescription.length,
              });
            }
            
            return allMatch;
          }
        }
        
        // Single word or partial matches - use original logic with translated content
        const allTermsMatch = searchTerms.every(term => {
          const termLower = term.toLowerCase();
          const exactMatch = searchableContent.includes(termLower);
          const pluralMatch = searchableContent.includes(termLower.slice(0, -1));
          const singularMatch = searchableContent.includes(termLower + "s");
          
          if (!exactMatch && !pluralMatch && !singularMatch) {
            // Debug: log which term didn't match
            console.log(`[SOSCall Search] Term "${term}" not found in searchable content for ${provider.name}`, {
              term,
              searchablePreview: searchableContent.substring(0, 500),
              hasTranslations: !!provider.translations,
            });
          }
          
          return exactMatch || pluralMatch || singularMatch;
        });
        
        return allTermsMatch;
      })();

      return matchesType && matchesCountryFilter && matchesLanguageFilter && matchesStatus && matchesSearch;
    });

    // Séparer les profils online et offline
    const onlineProviders = next.filter(p => p.isOnline);
    const offlineProviders = next.filter(p => !p.isOnline);

    // Fonction pour vérifier si un profil a une vraie photo (pas un avatar par défaut)
    const hasRealPhoto = (p: Provider) => {
      return p.avatar && p.avatar !== "/default-avatar.png" && p.avatar.trim() !== "";
    };

    // Trier: d'abord ceux avec photo, puis par rating
    const sortByPhotoThenRating = (a: Provider, b: Provider) => {
      const aHasPhoto = hasRealPhoto(a);
      const bHasPhoto = hasRealPhoto(b);
      if (aHasPhoto !== bHasPhoto) {
        return aHasPhoto ? -1 : 1; // Avec photo en premier
      }
      return b.rating - a.rating; // Puis par rating
    };

    const sortedOnline = [...onlineProviders].sort(sortByPhotoThenRating);
    const sortedOffline = [...offlineProviders].sort(sortByPhotoThenRating);

    // Combiner: online d'abord, puis offline
    const sorted = [...sortedOnline, ...sortedOffline];

    setFilteredProviders(sorted);
    setPage(1);
  }, [
    realProviders,
    selectedType,
    selectedCountryCode,
    selectedLanguageCodes,
    customCountry,
    customLanguage,
    statusFilter,
    searchQuery,
  ]);

  // Pagination
  const totalPages = Math.max(
    1,
    Math.ceil(filteredProviders.length / PAGE_SIZE)
  );
  const paginatedProviders = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredProviders.slice(start, start + PAGE_SIZE);
  }, [filteredProviders, page]);

  // Handlers filtres
  const handleCountryChange = useCallback((value: string) => {
    setSelectedCountryCode(value);
    setShowCustomCountry(value === "Autre");
    if (value !== "Autre") setCustomCountry("");
  }, []);

  // Handler pour ajout/suppression de langue (multi-select)
  const handleLanguageToggle = useCallback((code: string) => {
    setSelectedLanguageCodes(prev => {
      if (prev.includes(code)) {
        return prev.filter(c => c !== code);
      } else {
        return [...prev, code];
      }
    });
    if (code === "Autre") {
      setShowCustomLanguage(prev => !prev);
    }
  }, []);

  // Handler pour sélection unique (compatibilité UI existante)
  const handleLanguageChange = useCallback((value: string) => {
    if (value === "all") {
      setSelectedLanguageCodes([]);
    } else {
      setSelectedLanguageCodes([value]);
    }
    setShowCustomLanguage(value === "Autre");
    if (value !== "Autre") setCustomLanguage("");
  }, []);

  const resetFilters = useCallback(() => {
    setSelectedType("all");
    setSelectedCountryCode("all");
    setSelectedLanguageCodes([]);
    setCustomCountry("");
    setCustomLanguage("");
    setShowCustomCountry(false);
    setShowCustomLanguage(false);
    setStatusFilter("all");
  }, []);

  // Navigation
  const handleProviderClick = useCallback((provider: Provider) => {
    // Protection contre le double-clic
    if (isNavigatingRef.current) return;

    const typeSlug = provider.type === "lawyer" ? "avocat" : "expatrie";
    const countrySlug = slugify(provider.country);
    const nameSlug = slugify(provider.name);
    const seoUrl = `/${typeSlug}/${countrySlug}/francais/${nameSlug}-${provider.id}`;

    if (location.pathname !== seoUrl) {
      isNavigatingRef.current = true;
      try {
        sessionStorage.setItem("selectedProvider", JSON.stringify(provider));
      } catch {
        // noop
      }
      navigate(seoUrl, {
        state: { selectedProvider: provider, navigationSource: "sos_call" },
      });
      // Reset après un court délai pour permettre de nouvelles navigations si l'utilisateur revient
      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 500);
    }
  }, [location.pathname, navigate]);

  // Handler pour changement de page avec scroll en haut
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    // Scroll vers le haut de la page de manière fluide
    window.scrollTo({ 
      top: 0, 
      behavior: 'smooth' 
    });
  }, []);

  // Compteur de filtres actifs (pour badge FAB mobile)
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedType !== "all") count++;
    if (selectedCountryCode !== "all") count++;
    if (selectedLanguageCodes.length > 0) count += selectedLanguageCodes.length; // Compte chaque langue
    if (statusFilter !== "all") count++;
    return count;
  }, [selectedType, selectedCountryCode, selectedLanguageCodes, statusFilter]);

  // Compteur de filtres avancés (Pays + Langue seulement, pour le bouton Filtres)
  const advancedFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCountryCode !== "all") count++;
    if (selectedLanguageCodes.length > 0) count++;
    return count;
  }, [selectedCountryCode, selectedLanguageCodes]);

  // ========================================
  // 🔍 SEO - Génération des données structurées
  // ========================================
  
  const canonicalUrl = `${BASE_URL}/${lang}${PAGE_PATH}`;
  const onlineCount = filteredProviders.filter((p) => p.isOnline).length;
  
  const jsonLdSchemas = useMemo(() => 
    generateAllSchemas(intl, filteredProviders, selectedType, onlineCount, lang, faqData),
    [intl, filteredProviders, selectedType, onlineCount, lang, faqData]
  );

  const seoTitle = intl.formatMessage({ 
    id: selectedType === "lawyer" 
      ? "sosCall.seo.title.lawyer" 
      : selectedType === "expat" 
        ? "sosCall.seo.title.expat" 
        : "sosCall.seo.title.all" 
  });
  
  const seoDescription = intl.formatMessage({ 
    id: selectedType === "lawyer" 
      ? "sosCall.seo.description.lawyer" 
      : selectedType === "expat" 
        ? "sosCall.seo.description.expat" 
        : "sosCall.seo.description.all" 
  });

  const seoKeywords = intl.formatMessage({ id: "sosCall.seo.keywords" });

  const hreflangLinks = SUPPORTED_LANGUAGES.map(langCode => ({
    // Convertir 'ch' en 'zh-Hans' pour le standard hreflang SEO
    hreflang: langCode === 'ch' ? 'zh-Hans' : langCode,
    href: `${BASE_URL}/${langCode}${PAGE_PATH}`,
  }));

  return (
    <Layout>
      {/* ========================================
          🔍 SEO HEAD
      ======================================== */}
      <Helmet>
        {/* ===== BASE HTML ===== */}
        <html lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'} />
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        
        {/* ===== VIEWPORT & MOBILE ===== */}
        <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=5, viewport-fit=cover, user-scalable=yes" />
        <meta name="HandheldFriendly" content="true" />
        <meta name="MobileOptimized" content="width" />
        
        {/* ===== SEARCH ENGINE CRAWLERS ===== */}
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1, notranslate" />
        <meta name="googlebot" content="index, follow, max-image-preview:large, max-snippet:-1, noimageindex" />
        <meta name="bingbot" content="index, follow, max-snippet:-1" />
        <meta name="yandex" content="index, follow" />
        <meta name="baidu-site-verification" content="sosexpat" />
        
        {/* ===== AI CRAWLERS (GPT, Claude, Perplexity, etc.) ===== */}
        <meta name="ai-robots" content="index, follow" />
        <meta name="GPTBot" content="index, follow" />
        <meta name="Claude-Web" content="index, follow" />
        <meta name="PerplexityBot" content="index, follow" />
        <meta name="Amazonbot" content="index, follow" />
        <meta name="anthropic-ai" content="index, follow" />
        <meta name="cohere-ai" content="index, follow" />
        <meta name="CCBot" content="index, follow" />
        <meta name="Google-Extended" content="index, follow" />
        
        {/* ===== FEATURED SNIPPET OPTIMIZATION (Position 0) ===== */}
        <meta name="snippet" content={intl.formatMessage({ id: "sosCall.seo.featuredSnippet" })} />
        <meta name="abstract" content={intl.formatMessage({ id: "sosCall.seo.abstract" })} />
        <meta name="summary" content={intl.formatMessage({ id: "sosCall.seo.summary" })} />
        <meta name="topic" content={intl.formatMessage({ id: "sosCall.seo.topic" })} />
        <meta name="subject" content={intl.formatMessage({ id: "sosCall.seo.subject" })} />
        <meta name="classification" content={intl.formatMessage({ id: "sosCall.seo.classification" })} />
        <meta name="pagetype" content="service" />
        <meta name="coverage" content="Worldwide" />
        <meta name="distribution" content="global" />
        <meta name="rating" content="general" />
        <meta name="target" content="all" />
        <meta name="audience" content={intl.formatMessage({ id: "sosCall.seo.audience" })} />
        <meta name="doc-type" content="web page" />
        <meta name="doc-class" content="published" />
        
        {/* ===== SEMANTIC KEYWORDS ===== */}
        <meta name="keywords" content={seoKeywords} />
        <meta name="news_keywords" content={intl.formatMessage({ id: "sosCall.seo.newsKeywords" })} />
        
        {/* ===== AUTHORSHIP ===== */}
        <meta name="author" content="SOS Expat" />
        <meta name="publisher" content="SOS Expat" />
        <meta name="creator" content="SOS Expat" />
        <meta name="copyright" content={`© ${new Date().getFullYear()} SOS Expat`} />
        <meta name="owner" content="SOS Expat" />
        <meta name="designer" content="SOS Expat" />
        <meta name="reply-to" content="" />
        
        {/* ===== CANONICAL & ALTERNATE ===== */}
        <link rel="canonical" href={canonicalUrl} />
        {hreflangLinks.map((link) => (
          <link
            key={link.hreflang}
            rel="alternate"
            hrefLang={link.hreflang}
            href={link.href}
          />
        ))}
        <link rel="alternate" hrefLang="x-default" href={`${BASE_URL}/en${PAGE_PATH}`} />
        
        {/* ===== OPEN GRAPH (Facebook, LinkedIn) ===== */}
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="SOS Expat" />
        <meta property="og:locale" content={OG_LOCALES[lang] || "en_US"} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={`${BASE_URL}/og-image-sos-call.jpg`} />
        <meta property="og:image:secure_url" content={`${BASE_URL}/og-image-sos-call.jpg`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={intl.formatMessage({ id: "sosCall.seo.ogImageAlt" })} />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:updated_time" content={new Date().toISOString()} />
        <meta property="article:publisher" content={SOCIAL_URLS.facebook} />
        <meta property="article:modified_time" content={new Date().toISOString()} />
        
        {/* ===== TWITTER CARDS ===== */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@sosexpat" />
        <meta name="twitter:creator" content="@sosexpat" />
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={seoDescription} />
        <meta name="twitter:image" content={`${BASE_URL}/twitter-image-sos-call.png`} />
        <meta name="twitter:image:alt" content={intl.formatMessage({ id: "sosCall.seo.ogImageAlt" })} />
        <meta name="twitter:domain" content="sos-expat.com" />
        
        {/* ===== SECURITY (Non-restrictive) ===== */}
        <meta httpEquiv="Content-Security-Policy" content="upgrade-insecure-requests" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        
        {/* ===== CACHE & PERFORMANCE ===== */}
        <meta httpEquiv="Cache-Control" content="public, max-age=3600, stale-while-revalidate=86400" />
        <meta httpEquiv="Pragma" content="cache" />
        <meta httpEquiv="Expires" content={new Date(Date.now() + 3600000).toUTCString()} />
        <meta name="revisit-after" content="1 days" />
        
        {/* ===== PRECONNECT & PREFETCH (Performance) ===== */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://firestore.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://firestore.googleapis.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        
        {/* ===== PWA & MOBILE APP ===== */}
        <meta name="theme-color" content="#DC2626" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#1F2937" media="(prefers-color-scheme: dark)" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SOS Expat" />
        <meta name="application-name" content="SOS Expat" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no, date=no, email=no, address=no" />
        <meta name="msapplication-TileColor" content="#DC2626" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        
        {/* ===== FAVICONS ===== */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#DC2626" />
        <link rel="manifest" href="/manifest.json" />
        
        {/* ===== STRUCTURED DATA (JSON-LD) ===== */}
        <script type="application/ld+json">
          {JSON.stringify(jsonLdSchemas)}
        </script>
      </Helmet>
      <SEOHead
        title={`${selectedType === "lawyer"
            ? "Avocats"
            : selectedType === "expat"
              ? "Expatriés"
              : "Experts"
          } disponibles | SOS Expat & Travelers`}
        description={`Trouvez un ${selectedType === "lawyer"
            ? "avocat"
            : selectedType === "expat"
              ? "expatrié"
              : "expert"
          } vérifié disponible immédiatement. Consultation en ligne 24h/24, 7j/7 dans plus de 150 pays.`}
        canonicalUrl="/sos-appel"
      />

      <div className="min-h-screen bg-gray-950 overflow-x-hidden max-w-full">
        {/* ========================================
            HERO SECTION
        ======================================== */}
        <header className="relative pt-8 pb-8 sm:pt-16 sm:pb-20 overflow-hidden" role="banner">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" aria-hidden="true" />
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-transparent to-blue-500/10" aria-hidden="true" />
          <div className="absolute top-1/4 left-1/4 w-48 sm:w-64 lg:w-96 h-48 sm:h-64 lg:h-96 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-full blur-3xl" aria-hidden="true" />
          <div className="absolute bottom-1/4 right-1/4 w-48 sm:w-64 lg:w-96 h-48 sm:h-64 lg:h-96 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl" aria-hidden="true" />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center">
            <div
              className="hidden sm:inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full pl-3 sm:pl-5 pr-2 sm:pr-3 py-1.5 sm:py-2 border border-white/20 mb-4 sm:mb-6"
              role="status"
              aria-label={intl.formatMessage({ id: "sosCall.hero.badge.ariaLabel" })}
            >
              <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-red-300" aria-hidden="true" />
              <span className="text-white font-semibold text-xs sm:text-sm">
                <FormattedMessage id="sosCall.hero.badge" />
              </span>
              <div
                className="w-2 h-2 bg-green-400 rounded-full animate-pulse"
                aria-hidden="true"
                role="presentation"
              />
            </div>

            {/* ===== H1 UNIQUE - SEO OPTIMISÉ ===== */}
            <h1
              className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-3 sm:mb-4 px-2"
              id="page-title"
              itemProp="headline"
            >
              <FormattedMessage id="sosCall.hero.title.new" />
            </h1>

            {/* ===== FEATURED SNIPPET (Position 0 Google) ===== */}
            <p
              className="text-sm md:text-lg lg:text-xl text-gray-200 max-w-3xl mx-auto px-4 featured-snippet"
              itemProp="description"
              data-featured-snippet="true"
            >
              <FormattedMessage id="sosCall.hero.subtitle.new" />
            </p>

            {/* ===== EXPERT COUNT SNIPPET (pour Google) ===== */}
            <div 
              className="expert-count mt-4 text-gray-300 text-sm"
              aria-live="polite"
              role="status"
              data-snippet-count="true"
            >
              <span className="inline-flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" aria-hidden="true" />
                <span itemProp="numberOfItems">
                  <FormattedMessage 
                    id="sosCall.hero.expertCount" 
                    values={{ 
                      online: onlineCount,
                      total: filteredProviders.length 
                    }} 
                  />
                </span>
              </span>
            </div>
          </div>
        </header>

        {/* ========================================
            MAIN CONTENT
        ======================================== */}
        <main 
          className="py-6 sm:py-10 lg:py-14" 
          id="experts" 
          role="main"
          aria-labelledby="section-title"
          itemScope 
          itemType="https://schema.org/ItemList"
        >
          <meta itemProp="numberOfItems" content={filteredProviders.length.toString()} />
          <meta itemProp="itemListOrder" content="https://schema.org/ItemListOrderDescending" />
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            {/* ===== H2 - Titre de section (Desktop uniquement) ===== */}
            <div className="text-center mb-5 sm:mb-8">
              <h2
                className="hidden lg:block text-lg sm:text-xl lg:text-2xl xl:text-3xl font-black text-white mb-4"
                id="section-title"
                itemProp="name"
              >
                {selectedType === "lawyer" && (
                  <FormattedMessage id="sosCall.experts.title.lawyer" />
                )}
                {selectedType === "expat" && (
                  <FormattedMessage id="sosCall.experts.title.expat" />
                )}
                {selectedType !== "lawyer" && selectedType !== "expat" && (
                  <FormattedMessage id="sosCall.experts.title.all" />
                )}
              </h2>

              {/* ========================================
                  🖥️ DESKTOP FILTER BAR (Nouvelle version compacte)
              ======================================== */}
              <DesktopFilterBar
                onlineCount={onlineCount}
                totalExperts={realProviders.length}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchSuggestions={searchSuggestions}
                showSuggestions={showSuggestions}
                onShowSuggestionsChange={setShowSuggestions}
                selectedType={selectedType}
                onTypeChange={setSelectedType}
                selectedCountryCode={selectedCountryCode}
                onCountryChange={handleCountryChange}
                countryOptions={countryOptions}
                selectedLanguageCodes={selectedLanguageCodes}
                onLanguageToggle={handleLanguageToggle}
                languageOptions={languageOptions}
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
                onResetFilters={resetFilters}
                activeFiltersCount={activeFiltersCount}
              />

              {/* ========================================
                  📱 FILTRES SECTION - MASQUÉ sur mobile
                  Le FAB flottant + FilterBottomSheet remplace cette section
              ======================================== */}
              <div className="hidden">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                  {/* Type */}
                  <div className="space-y-1">
                    <label
                      htmlFor="expert-type"
                      className="block text-xs font-semibold text-gray-300 uppercase tracking-wide"
                    >
                      <FormattedMessage id="type" />
                      {/* Type */}
                    </label>
                    <div className="relative">
                      <select
                        id="expert-type"
                        value={selectedType}
                        onChange={(e) =>
                          setSelectedType(
                            e.target.value as "all" | "lawyer" | "expat"
                          )
                        }
                        className="
                          w-full px-3 py-2
                          bg-white text-gray-900
                          border border-gray-300 rounded-xl
                          dark:bg-white/10 dark:text-white dark:border-white/20
                          focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-transparent
                          transition-all appearance-none text-sm
                        "
                      >
                        {/* <option value="all">Tous</option>
                        <option value="lawyer">Avocats</option>
                        <option value="expat">Expatriés</option> */}
                        <option value="all">
                          <FormattedMessage id="filter.all" />
                        </option>
                        <option value="lawyer">
                          <FormattedMessage id="filter.lawyer" />
                        </option>
                        <option value="expat">
                          <FormattedMessage id="filter.expat" />
                        </option>
                      </select>
                      <ChevronDown
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-300 pointer-events-none"
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  {/* Pays */}
                  <div className="space-y-1">
                    <label
                      htmlFor="country-filter"
                      className="block text-xs font-semibold text-gray-300 uppercase tracking-wide"
                    >
                      <FormattedMessage id="country.label" />
                      {/* Pays */}
                    </label>
                    <div className="relative">
                      <select
                        id="country-filter"
                        value={selectedCountryCode}
                        onChange={(e) => handleCountryChange(e.target.value)}
                        className="
                          w-full px-3 py-2
                          bg-white text-gray-900
                          border border-gray-300 rounded-xl
                          dark:bg-white/10 dark:text-white dark:border-white/20
                          focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-transparent
                          transition-all appearance-none text-sm
                        "
                      >
                        {/* <option value="all">Tous les pays</option> */}
                        <option value="all">
                          <FormattedMessage id="country.allCountries" />
                        </option>
                        {countryOptions.map((country) => (
                          <option key={country.code} value={country.code}>
                            {country.label}
                          </option>
                        ))}
                        {/* <option value="Autre">Autre</option> */}
                        <option value="Autre">
                          <FormattedMessage id="country.other" />
                        </option>
                      </select>
                      <ChevronDown
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-300 pointer-events-none"
                        aria-hidden="true"
                      />
                    </div>
                    {showCustomCountry && (
                      <input
                        type="text"
                        placeholder="Nom du pays"
                        value={customCountry}
                        onChange={(e) => setCustomCountry(e.target.value)}
                        className="w-full px-3 py-2 bg-white/10 border border-white/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/60 focus:border-transparent transition-all text-sm text-white placeholder:text-gray-400 mt-2"
                      />
                    )}
                  </div>

                  {/* Langue (affiche multi-sélection du wizard ou permet sélection unique) */}
                  <div className="space-y-1">
                    <label
                      htmlFor="language-filter"
                      className="block text-xs font-semibold text-gray-300 uppercase tracking-wide"
                    >
                      <FormattedMessage id="language.label" />
                      {selectedLanguageCodes.length > 1 && (
                        <span className="ml-1 text-red-400">({selectedLanguageCodes.length})</span>
                      )}
                    </label>
                    <div className="relative">
                      <select
                        id="language-filter"
                        value={selectedLanguageCodes.length === 0 ? "all" : selectedLanguageCodes[0]}
                        onChange={(e) => handleLanguageChange(e.target.value)}
                        className="
                          w-full px-3 py-2
                          bg-white text-gray-900
                          border border-gray-300 rounded-xl
                          dark:bg-white/10 dark:text-white dark:border-white/20
                          focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-transparent
                          transition-all appearance-none text-sm
                        "
                      >
                        <option value="all">
                          <FormattedMessage id="language.all" />
                        </option>
                        {languageOptions.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.label}
                          </option>
                        ))}
                        <option value="Autre">
                          <FormattedMessage id="language.other" />
                        </option>
                      </select>
                      <ChevronDown
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-300 pointer-events-none"
                        aria-hidden="true"
                      />
                    </div>
                    {/* Afficher les langues sélectionnées comme chips si multi-select */}
                    {selectedLanguageCodes.length > 1 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {selectedLanguageCodes.map(code => {
                          const langLabel = languageOptions.find(l => l.code === code)?.label || code;
                          return (
                            <span
                              key={code}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/20 text-red-300 rounded-full text-xs cursor-pointer hover:bg-red-500/30"
                              onClick={() => handleLanguageToggle(code)}
                            >
                              {langLabel}
                              <X className="w-3 h-3" />
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {showCustomLanguage && (
                      <input
                        type="text"
                        placeholder="Langue"
                        value={customLanguage}
                        onChange={(e) => setCustomLanguage(e.target.value)}
                        className="w-full px-3 py-2 bg-white/10 border border-white/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/60 focus:border-transparent transition-all text-sm text-white placeholder:text-gray-400 mt-2"
                      />
                    )}
                  </div>

                  {/* Statut */}
                  <div className="space-y-1 lg:col-span-2">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wide">
                      {/* Statut */}
                      <FormattedMessage id="status.label" />
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setStatusFilter("all")}
                        className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border transition ${statusFilter === "all"
                            ? "bg-white/20 text-white border-white/30"
                            : "bg-white/10 text-gray-200 border-white/20 hover:bg-white/15"
                          }`}
                        aria-pressed={statusFilter === "all"}
                      >
                        <span className="w-2 h-2 rounded-full bg-gray-300" />
                        {/* Tous */}
                        <FormattedMessage id="status.all" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusFilter("online")}
                        className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border transition ${statusFilter === "online"
                            ? "bg-white/20 text-white border-white/30"
                            : "bg-white/10 text-gray-200 border-white/20 hover:bg-white/15"
                          }`}
                        aria-pressed={statusFilter === "online"}
                        title="En ligne"
                      >
                        <Wifi className="w-4 h-4" />
                        {/* En ligne */}
                        <FormattedMessage id="status.online" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusFilter("offline")}
                        className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border transition ${statusFilter === "offline"
                            ? "bg-white/20 text-white border-white/30"
                            : "bg-white/10 text-gray-200 border-white/20 hover:bg-white/15"
                          }`}
                        aria-pressed={statusFilter === "offline"}
                        title="Hors ligne"
                      >
                        <WifiOff className="w-4 h-4" />
                        {/* Hors ligne */}
                        <FormattedMessage id="status.offline" />
                      </button>
                    </div>
                    <span className="text-white/20">•</span>
                    <span className="text-gray-300 text-sm">
                      {filteredProviders.length} <FormattedMessage id="sosCall.stats.experts" defaultMessage="experts" />
                    </span>
                  </div>
                  
                  {/* Bouton Filtres Mobile */}
                  <button
                    onClick={() => setIsFilterOpen(true)}
                    className={`
                      flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm
                      transition-all duration-200 min-h-[44px] flex-shrink-0
                      ${activeFiltersCount > 0 
                        ? 'bg-red-500/20 text-red-300 border border-red-400/30' 
                        : 'bg-white/10 text-white border border-white/20 hover:bg-white/15'
                      }
                    `}
                    aria-label={intl.formatMessage({ id: "sosCall.filters.open", defaultMessage: "Ouvrir les filtres" })}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span><FormattedMessage id="sosCall.filters.button" defaultMessage="Filtres" /></span>
                    {activeFiltersCount > 0 && (
                      <span className="w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {activeFiltersCount}
                      </span>
                    )}
                  </button>
                </div>

                {/* Quick Filter Chips - SCROLL HORIZONTAL */}
                <div 
                  className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide lg:overflow-visible lg:flex-wrap lg:mx-0 lg:px-0 lg:pb-0 lg:justify-center lg:gap-3"
                  style={{ 
                    WebkitOverflowScrolling: 'touch',
                  }}
                >
                  {/* Type Chips */}
                  <button
                    onClick={() => setSelectedType("all")}
                    className={`
                      flex-shrink-0 px-4 py-2.5 rounded-full text-sm font-semibold
                      transition-all duration-200 whitespace-nowrap min-h-[44px]
                      active:scale-95
                      ${selectedType === "all"
                        ? 'bg-white text-gray-900 shadow-lg'
                        : 'bg-white/10 text-white border border-white/20'
                      }
                    `}
                  >
                    👥 <FormattedMessage id="sosCall.filters.type.all" defaultMessage="Tous" />
                  </button>
                  <button
                    onClick={() => setSelectedType("lawyer")}
                    className={`
                      flex-shrink-0 px-4 py-2.5 rounded-full text-sm font-semibold
                      transition-all duration-200 whitespace-nowrap min-h-[44px]
                      active:scale-95
                      ${selectedType === "lawyer"
                        ? 'bg-white text-gray-900 shadow-lg'
                        : 'bg-white/10 text-white border border-white/20'
                      }
                    `}
                  >
                    ⚖️ <FormattedMessage id="sosCall.filters.type.lawyer" defaultMessage="Avocats" />
                  </button>
                  <button
                    onClick={() => setSelectedType("expat")}
                    className={`
                      flex-shrink-0 px-4 py-2.5 rounded-full text-sm font-semibold
                      transition-all duration-200 whitespace-nowrap min-h-[44px]
                      active:scale-95
                      ${selectedType === "expat"
                        ? 'bg-white text-gray-900 shadow-lg'
                        : 'bg-white/10 text-white border border-white/20'
                      }
                    `}
                  >
                    🌍 <FormattedMessage id="sosCall.filters.type.expat" defaultMessage="Expatriés" />
                  </button>

                  {/* Separator */}
                  <div className="flex-shrink-0 w-px h-8 bg-white/20 self-center mx-1" aria-hidden="true" />

                  {/* Status Chips */}
                  <button
                    onClick={() => setStatusFilter(statusFilter === "online" ? "all" : "online")}
                    className={`
                      flex-shrink-0 px-4 py-2.5 rounded-full text-sm font-semibold
                      transition-all duration-200 whitespace-nowrap min-h-[44px] flex items-center gap-2
                      active:scale-95
                      ${statusFilter === "online"
                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                        : 'bg-white/10 text-white border border-white/20'
                      }
                    `}
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
                    </span>
                    <FormattedMessage id="sosCall.filters.status.online" defaultMessage="En ligne" />
                  </button>
                  <button
                    onClick={() => setStatusFilter(statusFilter === "offline" ? "all" : "offline")}
                    className={`
                      flex-shrink-0 px-4 py-2.5 rounded-full text-sm font-semibold
                      transition-all duration-200 whitespace-nowrap min-h-[44px] flex items-center gap-2
                      active:scale-95
                      ${statusFilter === "offline"
                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                        : 'bg-white/10 text-white border border-white/20'
                      }
                    `}
                  >
                    <WifiOff className="w-3.5 h-3.5" />
                    <FormattedMessage id="sosCall.filters.status.offline" defaultMessage="Hors ligne" />
                  </button>

                  {/* Filtres actifs (Pays/Langue) */}
                  {selectedCountryCode !== "all" && (
                    <button
                      onClick={() => setSelectedCountryCode("all")}
                      className="flex-shrink-0 px-3 py-2.5 rounded-full text-sm font-medium bg-blue-500/20 text-blue-300 border border-blue-400/30 min-h-[44px] flex items-center gap-2 active:scale-95"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="max-w-[100px] truncate">
                        {countryOptions.find(c => c.code === selectedCountryCode)?.label || selectedCountryCode}
                      </span>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {/* Chips pour chaque langue sélectionnée */}
                  {selectedLanguageCodes.map(code => (
                    <button
                      key={code}
                      onClick={() => handleLanguageToggle(code)}
                      className="flex-shrink-0 px-3 py-2.5 rounded-full text-sm font-medium bg-purple-500/20 text-purple-300 border border-purple-400/30 min-h-[44px] flex items-center gap-2 active:scale-95"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span className="max-w-[100px] truncate">
                        {languageOptions.find(l => l.code === code)?.label || code}
                      </span>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ))}
                  
                  {/* Spacer pour padding droit */}
                  <div className="flex-shrink-0 w-4" aria-hidden="true" />
                </div>

                {/* Pagination info mobile */}
                {!isLoadingProviders && filteredProviders.length > 0 && totalPages > 1 && (
                  <div className="text-center text-xs text-gray-500">
                    <FormattedMessage 
                      id="sosCall.pagination.mobileInfo" 
                      defaultMessage="Page {current} sur {total}"
                      values={{ current: page, total: totalPages }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* PAGINATION (haut) - Desktop only */}
            {!isLoadingProviders && filteredProviders.length > 0 && (
              <div className="hidden lg:flex items-center justify-end mb-4">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onChange={handlePageChange}
                  intl={intl}
                />
              </div>
            )}

            {/* Skeletons */}
            {isLoadingProviders ? (
              <>
                {/* Skeleton Mobile */}
                <div 
                  className="lg:hidden flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4"
                  aria-label={intl.formatMessage({ id: "sosCall.loading.ariaLabel", defaultMessage: "Chargement des experts" })}
                  aria-busy="true"
                  style={{ WebkitOverflowScrolling: 'touch' }}
                >
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={`sk-mobile-${index}`}
                      className="flex-shrink-0 bg-white/5 rounded-2xl border border-white/10 overflow-hidden animate-pulse w-[280px]"
                      role="article"
                    >
                      <div className="w-full h-48 bg-white/10" />
                      <div className="p-4 space-y-3">
                        <div className="h-4 bg-white/10 rounded w-3/4" />
                        <div className="h-3 bg-white/10 rounded w-1/2" />
                        <div className="h-10 bg-white/10 rounded-xl" />
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Skeleton Desktop */}
                <div 
                  className="hidden lg:grid lg:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6 justify-items-center"
                  aria-label={intl.formatMessage({ id: "sosCall.loading.ariaLabel", defaultMessage: "Chargement des experts" })}
                  aria-busy="true"
                >
                  {Array.from({ length: PAGE_SIZE }).map((_, index) => (
                    <div
                      key={`sk-desktop-${index}`}
                      className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden animate-pulse w-[320px]"
                      role="article"
                    >
                      <div className="w-full h-64 bg-white/10" />
                      <div className="p-4 space-y-3">
                        <div className="h-5 bg-white/10 rounded w-3/4" />
                        <div className="h-4 bg-white/10 rounded w-1/2" />
                        <div className="h-10 bg-white/10 rounded-xl" />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : filteredProviders.length > 0 ? (
              <>
                {/* Version Mobile - Scroll horizontal centré */}
                <div className="lg:hidden relative z-10">
                  {/* Container de scroll centré */}
                  <div
                    className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
                    role="list"
                    aria-label={intl.formatMessage({ id: "sosCall.providerList.mobileAriaLabel" })}
                    style={{
                      WebkitOverflowScrolling: 'touch',
                      paddingLeft: 'calc((100vw - 320px) / 2)',
                      paddingRight: 'calc((100vw - 320px) / 2)',
                    }}
                  >
                    {paginatedProviders.map((provider, index) => (
                      <div
                        key={provider.id}
                        className="snap-center flex-shrink-0"
                        role="listitem"
                      >
                        <ModernProfileCard
                          provider={provider}
                          onProfileClick={handleProviderClick}
                          index={index}
                          language={language}
                          intl={intl}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Indicateur de scroll - En bas, sous les cards */}
                  <div className="flex items-center justify-center gap-3 mt-4 py-3 px-4 mx-4 rounded-2xl bg-gradient-to-r from-red-500/20 via-orange-500/20 to-red-500/20 border border-white/10">
                    <ChevronLeft className="w-5 h-5 text-white/80 animate-bounce-x" aria-hidden="true" />
                    <span className="text-white font-medium text-sm">
                      <FormattedMessage id="sosCall.scroll.hint" />
                    </span>
                    <ChevronRight className="w-5 h-5 text-white/80 animate-bounce-x-reverse" aria-hidden="true" />
                  </div>
                </div>

                {/* Version Desktop - Grille */}
                <div
                  className="hidden lg:grid lg:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6 justify-items-center relative z-10"
                  role="list"
                  aria-label={intl.formatMessage({ id: "sosCall.providerList.desktopAriaLabel" })}
                >
                  {paginatedProviders.map((provider, index) => (
                    <div key={provider.id} role="listitem">
                      <ModernProfileCard
                        provider={provider}
                        onProfileClick={handleProviderClick}
                        index={index}
                        language={language}
                        intl={intl}
                      />
                    </div>
                  ))}
                </div>

                {/* Pagination (bas) */}
                <div className="flex flex-col sm:flex-row items-center justify-between mt-6 sm:mt-8 gap-3 sm:gap-4">
                  <div className="text-xs sm:text-sm text-gray-300" role="status">
                    <FormattedMessage id="sosCall.pagination.page" />{" "}
                    <strong>{page}</strong> / {totalPages} —{" "}
                    {filteredProviders.length}
                    <span className="ml-1">
                      <FormattedMessage id="sosCall.pagination.results" />
                    </span>
                  </div>
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    onChange={handlePageChange}
                    intl={intl}
                  />
                </div>
              </>
            ) : (
              <div className="text-center py-10 sm:py-14" role="status" aria-live="polite">
                <div className="rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 sm:p-10 max-w-md mx-auto">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <Search className="w-6 h-6 sm:w-7 sm:h-7 text-gray-200" aria-hidden="true" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-2">
                    <FormattedMessage id="sosCall.noResults.title" />
                  </h3>
                  <p className="text-gray-300 mb-5 sm:mb-6 text-xs sm:text-sm">
                    <FormattedMessage id="sosCall.noResults.description" />
                  </p>
                  <button
                    onClick={resetFilters}
                    className="px-5 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold rounded-lg sm:rounded-xl transition-colors min-h-[44px] text-sm touch-manipulation"
                  >
                    <FormattedMessage id="sosCall.noResults.resetButton" />
                  </button>
                </div>
              </div>
            )}

            {/* CTA Section - Desktop uniquement */}
            <section className="hidden lg:block text-center mt-10 sm:mt-14" aria-labelledby="cta-heading">
              <div className="rounded-xl sm:rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-md p-5 sm:p-10">
                <h3 id="cta-heading" className="text-lg sm:text-xl lg:text-2xl font-black text-white mb-2 sm:mb-3">
                  <FormattedMessage id="sosCall.cta.title" />
                </h3>
                <p className="text-sm sm:text-base text-gray-300 mb-5 sm:mb-6 max-w-2xl mx-auto">
                  <FormattedMessage 
                    id="sosCall.cta.description"
                    values={{
                      strong: (chunks) => <strong className="text-white">{chunks}</strong>,
                    }}
                  />
                </p>
                <button
                  onClick={() => navigate("/sos-appel")}
                  className="inline-flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white px-5 sm:px-7 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl font-bold text-sm sm:text-base transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 min-h-[48px] touch-manipulation"
                  aria-label={intl.formatMessage({ id: "sosCall.cta.buttonAriaLabel" })}
                >
                  <Phone className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
                  <FormattedMessage id="sosCall.cta.button" />
                </button>
              </div>
            </section>
          </div>
        </main>

        {/* FAQ Section */}
        <FAQSection intl={intl} faqs={faqData} isLoading={isLoadingFAQs} />
      </div>

      {/* Global Styles */}
      <style>{`
        .scrollbar-hide {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        select option {
          background-color: #1f2937;
          color: white;
        }
        
        /* Smooth scroll pour iOS */
        .snap-x {
          -webkit-overflow-scrolling: touch;
        }
        
        /* Amélioration touch */
        .touch-manipulation {
          touch-action: manipulation;
        }
        
        /* Line clamp pour texte tronqué */
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        /* Scrollbar hide pour mobile chips */
        .scrollbar-hide {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        /* Animation bounce horizontal pour indicateur scroll */
        @keyframes bounce-x {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(-4px); }
        }
        @keyframes bounce-x-reverse {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(4px); }
        }
        .animate-bounce-x {
          animation: bounce-x 1s ease-in-out infinite;
        }
        .animate-bounce-x-reverse {
          animation: bounce-x-reverse 1s ease-in-out infinite;
        }
      `}</style>

      {/* ========================================
          📱 FAB - Floating Action Button (Mobile)
          Caché quand le wizard est ouvert
      ======================================== */}
      {!showWizard && (
        <button
          onClick={() => setIsFilterOpen(true)}
          className="lg:hidden fixed bottom-6 right-4 z-40 w-14 h-14 rounded-2xl bg-gradient-to-r from-red-600 to-orange-600 flex items-center justify-center shadow-lg shadow-red-500/30 active:scale-95 transition-transform"
          style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
          aria-label={intl.formatMessage({ id: "sosCall.filters.open" }, { defaultMessage: "Ouvrir les filtres" })}
        >
          <SlidersHorizontal className="w-6 h-6 text-white" />
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-white text-red-600 text-xs font-bold rounded-full flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </button>
      )}

      {/* ========================================
          🧙 Guided Filter Wizard (Mobile-First)
      ======================================== */}
      <GuidedFilterWizard
        isOpen={showWizard}
        onComplete={handleWizardComplete}
        countryOptions={countryOptions}
        languageOptions={languageOptions}
      />

      {/* ========================================
          📱 Bottom Sheet Filtres (Mobile)
      ======================================== */}
      <FilterBottomSheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        selectedType={selectedType}
        setSelectedType={setSelectedType}
        selectedCountryCode={selectedCountryCode}
        handleCountryChange={handleCountryChange}
        selectedLanguageCodes={selectedLanguageCodes}
        handleLanguageChange={handleLanguageChange}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        resetFilters={resetFilters}
        countryOptions={countryOptions}
        languageOptions={languageOptions}
        customCountry={customCountry}
        setCustomCountry={setCustomCountry}
        customLanguage={customLanguage}
        setCustomLanguage={setCustomLanguage}
        showCustomCountry={showCustomCountry}
        showCustomLanguage={showCustomLanguage}
        activeFiltersCount={activeFiltersCount}
        intl={intl}
      />
    </Layout>
  );
};

export default SOSCall;
