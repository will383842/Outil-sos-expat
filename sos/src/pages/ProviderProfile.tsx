// src/pages/ProviderProfile.tsx - VERSION FUSIONNÉE COMPLÈTE
import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from "react";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import { useParams, useLocation } from "react-router-dom";
import { useLocaleNavigate } from "../multilingual-system";
import { parseLocaleFromPath, getLocaleString } from "../utils/localeRoutes";
import {
  Star,
  MapPin,
  Phone,
  Shield,
  Award,
  Globe,
  Users,
  GraduationCap,
  Briefcase,
  Languages as LanguagesIcon,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Sparkles,
  ArrowLeft,
  TrendingUp,
  User,
  UserX,
  HelpCircle,
  X,
  ExternalLink,
} from "lucide-react";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
  onSnapshot,
  Timestamp as FsTimestamp,
} from "firebase/firestore";
import { db, getCloudFunctionUrl } from "../config/firebase";
import { getDocumentRest } from "../utils/firestoreRestApi";
import Layout from "../components/layout/Layout";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { useAuth } from "../contexts/AuthContext";
import { useApp } from "../contexts/AppContext";
import {
  logAnalyticsEvent,
  getProviderReviews,
  incrementReviewHelpfulCount,
  reportReview,
  normalizeUserData,
} from "../utils/firestore";
import SEOHead from "../components/layout/SEOHead";
import HreflangLinks from "../multilingual-system/components/HrefLang/HreflangLinks";
import ReviewSchema, { firestoreToReviewItem } from "../components/seo/ReviewSchema";
import { Review } from "../types";

// 👉 Lazy load du composant Reviews (non critique au premier rendu)
const Reviews = lazy(() => import("../components/review/Reviews"));

// 👉 Pricing admin
import { usePricingConfig, getEffectivePrice } from "../services/pricingService";
import { trackMetaViewContent } from "../utils/metaPixel";
import { trackEvent } from "../utils/ga4";
import { useMetaTracking } from "../hooks/useMetaTracking";

// Imports des traductions AAA
import aaaTranslationsFr from '../helper/aaaprofiles/admin_aaa_fr.json';
import aaaTranslationsEn from '../helper/aaaprofiles/admin_aaa_en.json';
import aaaTranslationsEs from '../helper/aaaprofiles/admin_aaa_es.json';
import aaaTranslationsDe from '../helper/aaaprofiles/admin_aaa_de.json';
import aaaTranslationsPt from '../helper/aaaprofiles/admin_aaa_pt.json';
import aaaTranslationsRu from '../helper/aaaprofiles/admin_aaa_ru.json';
import aaaTranslationsZh from '../helper/aaaprofiles/admin_aaa_zh.json';
import aaaTranslationsAr from '../helper/aaaprofiles/admin_aaa_ar.json';
import aaaTranslationsHi from '../helper/aaaprofiles/admin_aaa_hi.json';
import {
  getCountryName,
  formatLanguages,
  convertLanguageNamesToCodes,
  getLanguageName
} from "../utils/formatters";

// ✅ Import du système de slugs
import {
  generateSlug,
  formatPublicName,
  slugify,
  extractShortIdFromSlug,
  generateShortId
} from "../utils/slugGenerator";
import { useSnippetGenerator } from '../hooks/useSnippetGenerator';
import { useSEOOptimized } from '../hooks/useSEOOptimized';

// 👉 Translation system
import { useProviderTranslation } from "../hooks/useProviderTranslation";
import { TranslationBanner } from "../components/provider/TranslationBanner";
import { type SupportedLanguage } from "../services/providerTranslationService";
import { getTranslatedRouteSlug } from "../multilingual-system";
import FeaturedBadge from "../components/common/FeaturedBadge";

const aaaTranslationsMap: Record<string, any> = {
  fr: aaaTranslationsFr,
  en: aaaTranslationsEn,
  es: aaaTranslationsEs,
  de: aaaTranslationsDe,
  pt: aaaTranslationsPt,
  ru: aaaTranslationsRu,
  zh: aaaTranslationsZh,
  ar: aaaTranslationsAr,
  hi: aaaTranslationsHi,
};

import { FormattedMessage, useIntl } from "react-intl";
import QuickAuthWizard from "../components/auth/QuickAuthWizard";
import { ProviderSocialShare } from "../components/share";
import { getLawyerSpecialityLabel } from "../data/lawyer-specialties";
import { getExpatHelpTypeLabel } from "../data/expat-help-types";
import { getSpecialtyLabel, mapLanguageToLocale } from "../utils/specialtyMapper";
import { getCountrySlug } from "../data/country-slug-translations";

/* ===================================================================== */
/* CONSTANTES OPTIMISÉES                                                */
/* ===================================================================== */

const IMAGE_SIZES = {
  AVATAR_MOBILE: 96,
  AVATAR_DESKTOP: 128,
  MODAL_MAX_WIDTH: 1200,
  MODAL_MAX_HEIGHT: 800,
  THUMBNAIL_WIDTH: 400,
  THUMBNAIL_HEIGHT: 400,
} as const;

const ANIMATION_DURATIONS = {
  STATUS_TRANSITION: 500,
  LOADING_DELAY: 2500,
} as const;

const STORAGE_KEYS = {
  SELECTED_PROVIDER: "selectedProvider",
} as const;

const SUCCESSFUL_CALL_THRESHOLD_SECONDS = 120; // 2 minutes

// ✅ Cache configuration
const CACHE_CONFIG = {
  PROFILE_TTL: 5 * 60 * 1000, // 5 minutes
  STATS_TTL: 2 * 60 * 1000, // 2 minutes
  REVIEWS_TTL: 3 * 60 * 1000, // 3 minutes
} as const;

type TSLike = FsTimestamp | Date | null | undefined;

/* ===================================================================== */
/* TYPES                                                                */
/* ===================================================================== */

interface LocalizedText {
  fr?: string;
  en?: string;
  [key: string]: string | undefined;
}

interface Education {
  institution?: string | LocalizedText;
  degree?: string | LocalizedText;
  year?: number;
  [key: string]: unknown;
}

interface Certification {
  name?: string | LocalizedText;
  issuer?: string | LocalizedText;
  year?: number;
  [key: string]: unknown;
}

type AuthUser = {
  uid?: string;
  id?: string;
} & Partial<import("../contexts/types").User>;

interface LocationState {
  selectedProvider?: Partial<SosProfile>;
  providerData?: Partial<SosProfile>;
  navigationSource?: string;
}

interface SosProfile {
  uid: string;
  id?: string;
  type: "lawyer" | "expat";
  fullName: string;
  firstName: string;
  lastName: string;
  slug?: string;
  shortId?: string;
  country: string;
  city?: string;
  residenceCountry?: string;
  operatingCountries?: string[];
  languages: string[];
  mainLanguage?: string;
  specialties: string[];
  helpTypes?: string[];
  description?: string | LocalizedText;
  professionalDescription?: string | LocalizedText;
  experienceDescription?: string | LocalizedText;
  motivation?: string | LocalizedText;
  bio?: string | LocalizedText;
  profilePhoto?: string;
  photoURL?: string;
  avatar?: string;
  rating: number;
  reviewCount: number;
  yearsOfExperience: number;
  yearsAsExpat?: number;
  isOnline?: boolean;
  availability?: 'available' | 'busy' | 'offline';
  busyReason?: 'in_call' | 'break' | 'offline' | 'manually_disabled' | null;
  isActive: boolean;
  isApproved: boolean;
  isVerified: boolean;
  isVisibleOnMap?: boolean;
  isFeatured?: boolean;
  education?: Education | Education[] | LocalizedText;
  certifications?: Certification | Certification[] | LocalizedText;
  lawSchool?: string | LocalizedText;
  graduationYear?: number;
  responseTime?: string;
  successRate?: number;
  totalCalls?: number;
  successfulCalls?: number;
  totalResponses?: number;
  totalResponseTime?: number;
  avgResponseTimeMs?: number;
  createdAt?: TSLike;
  updatedAt?: TSLike;
  lastSeen?: TSLike;
}

interface RatingDistribution {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
}

interface OnlineStatus {
  isOnline: boolean;
  lastUpdate: Date | null;
  listenerActive: boolean;
  connectionAttempts: number;
}

interface ProviderStats {
  totalCallsReceived: number;
  successfulCalls: number;
  successRate: number;
  averageRating: number;
  totalReviews: number;
  completedCalls: number;
  realReviewsCount: number;
}

interface RouteParams extends Record<string, string | undefined> {
  id?: string;
  country?: string;
  language?: string;
  type?: string;
  slug?: string;
  profileId?: string;
  name?: string;
  nameSlug?: string;
  typeCountry?: string;
  locale?: string;
  localeRegion?: string;
  lang?: string;
  nameSlugWithUid?: string;
  langLocale?: string; // Format: fr-fr, en-us, fr-de, etc.
  roleCountry?: string; // Format: avocat-thailande, lawyer-thailand, etc.
}

/* ===================================================================== */
/* UTILS FUNCTIONS                                                      */
/* ===================================================================== */

const detectLanguage = (): "fr" | "en" =>
  typeof navigator !== "undefined" && navigator.language
    ? navigator.language.toLowerCase().startsWith("fr")
      ? "fr"
      : "en"
    : "en";

const safeNormalize = (v?: string): string =>
  (v || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const getFirstString = (
  val: unknown,
  preferred?: string
): string | undefined => {
  if (!val) return undefined;
  if (typeof val === "string") return val.trim() || undefined;
  if (Array.isArray(val)) {
    const arr = val
      .map((x) => getFirstString(x, preferred))
      .filter((x): x is string => Boolean(x));
    return arr.length ? arr.join(", ") : undefined;
  }
  if (typeof val === "object" && val !== null) {
    const obj = val as Record<string, unknown>;
    if (preferred && typeof obj[preferred] === "string") {
      const s = (obj[preferred] as string).trim();
      if (s) return s;
    }
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
  }
  return undefined;
};

const toArrayFromAny = (val: unknown, preferred?: string): string[] => {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val
      .map((x) =>
        typeof x === "string" ? x : getFirstString(x, preferred) || ""
      )
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (typeof val === "string")
    return val
      .split(/[;,]/)
      .map((s) => s.trim())
      .filter(Boolean);
  if (typeof val === "object" && val !== null) {
    const obj = val as Record<string, unknown>;
    return Object.values(obj)
      .map((v) =>
        typeof v === "string" ? v : getFirstString(v, preferred) || ""
      )
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

/**
 * Replace raw specialty codes (SCREAMING_SNAKE_CASE like FAM_SCOLARITE_INTERNATIONALE)
 * and ISO country codes (2-letter like "en TN") in description text with translated labels.
 * These codes end up in Firestore descriptions from AAA profile generation templates.
 */
const cleanDescriptionCodes = (text: string, lang?: string): string => {
  const locale = mapLanguageToLocale(lang || 'fr');
  // 1. Replace SCREAMING_SNAKE_CASE specialty codes
  let cleaned = text.replace(/\b([A-Z]{2,}(?:_[A-Z0-9]+){1,})\b/g, (match) => {
    const label = getSpecialtyLabel(match, locale);
    return label !== match ? label : match;
  });
  // 2. Replace ISO 2-letter country codes preceded by a preposition (en/in/à/au/de/di/em/в/في)
  // Pattern: preposition + space + exactly 2 uppercase letters (not part of a longer word)
  cleaned = cleaned.replace(/((?:en|in|à|au|de|di|em|в|في)\s+)([A-Z]{2})(?=[\s.,;:!?)»\]"]|$)/g, (_match, prep, code) => {
    const countryName = getCountryName(code.toLowerCase(), lang || 'fr');
    // Only replace if we got a real name (not the code back)
    return countryName && countryName.toLowerCase() !== code.toLowerCase() ? `${prep}${countryName}` : _match;
  });
  return cleaned;
};

const pickDescription = (
  p: Partial<SosProfile>,
  preferredLang?: string,
  intl?: any
): string => {
  // Try preferred language first, then 'en' fallback, then 'fr' fallback, then any available
  const langs = [preferredLang, 'en', 'fr'].filter(Boolean) as string[];
  for (const lang of langs) {
    const chain = [
      getFirstString(p.description, lang),
      getFirstString(p.bio, lang),
      getFirstString(p.professionalDescription, lang),
      getFirstString(p.experienceDescription, lang),
    ];
    const found = chain.find(Boolean);
    if (found) return cleanDescriptionCodes(found, preferredLang);
  }
  // Last resort: try without language preference (picks first available key)
  const anyChain = [
    getFirstString(p.description, undefined),
    getFirstString(p.bio, undefined),
    getFirstString(p.professionalDescription, undefined),
    getFirstString(p.experienceDescription, undefined),
  ];
  const fallback = anyChain.find(Boolean);
  if (fallback) return cleanDescriptionCodes(fallback, preferredLang);
  return intl ? intl.formatMessage({ id: "providerProfile.noDescriptionAvailable" }) : "";
};

const toStringFromAny = (
  val: unknown,
  preferred?: string
): string | undefined => getFirstString(val, preferred);

const isFsTimestamp = (v: unknown): v is FsTimestamp =>
  typeof (v as FsTimestamp | null)?.toDate === "function";

// Format avec tiret pour HTML lang attribute
const LOCALE_MAPPING: Record<string, string> = {
  'fr': 'fr-FR',
  'en': 'en-US',
  'es': 'es-ES',
  'de': 'de-DE',
  'pt': 'pt-PT',
  'ru': 'ru-RU',
  'zh': 'zh-CN',
  'ar': 'ar-SA',
  'hi': 'hi-IN'
};

// OG_LOCALE_MAPPING removed — handled by SEOHead component

const formatJoinDate = (val: TSLike, langCode: string): string | undefined => {
  if (!val) return undefined;
  const d = isFsTimestamp(val)
    ? val.toDate()
    : val instanceof Date 
      ? val
      : undefined;
  if (!d) return undefined;
  
  const locale = LOCALE_MAPPING[langCode] || 'fr-FR';
  const fmt = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  return fmt.format(d);
};

const formatEUR = (value?: number) => {
  if (typeof value !== "number") return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatUSD = (value?: number) => {
  if (typeof value !== "number") return "$—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const getAuthUserId = (u: unknown): string | undefined => {
  if (!u || (typeof u !== "object" && typeof u !== "function"))
    return undefined;
  const maybe = u as { uid?: unknown; id?: unknown };
  const uid =
    typeof maybe.uid === "string" && maybe.uid.trim() ? maybe.uid : undefined;
  const id =
    typeof maybe.id === "string" && maybe.id.trim() ? maybe.id : undefined;
  return uid ?? id;
};

const formatShortName = (provider: SosProfile): string => {
  const firstName = provider.firstName || "";
  const lastName = provider.lastName || "";
  const lastInitial = lastName.charAt(0).toUpperCase();
  return lastInitial ? `${firstName} ${lastInitial}.` : firstName;
};

// ✅ Fonction de sanitization pour sécurité
const sanitizeHTML = (html: string): string => {
  const tempDiv = document.createElement('div');
  tempDiv.textContent = html;
  return tempDiv.innerHTML;
};

// ✅ Cache simple en mémoire
class SimpleCache {
  private cache = new Map<string, { data: any; timestamp: number }>();

  set(key: string, data: any, ttl: number): void {
    this.cache.set(key, { data, timestamp: Date.now() + ttl });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.timestamp) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  clear(): void {
    this.cache.clear();
  }
}

const cache = new SimpleCache();

/* ===================================================================== */
/* CALCUL DES STATISTIQUES                                              */
/* ===================================================================== */

// Stats par défaut pour affichage immédiat
const DEFAULT_STATS: ProviderStats = {
  totalCallsReceived: 0,
  successfulCalls: 0,
  successRate: 0,
  averageRating: 0,
  totalReviews: 0,
  completedCalls: 0,
  realReviewsCount: 0,
};

const calculateProviderStats = async (providerId: string): Promise<ProviderStats> => {
  // ✅ Vérifier le cache d'abord
  const cacheKey = `stats_${providerId}`;
  const cached = cache.get<ProviderStats>(cacheKey);
  if (cached) return cached;

  try {
    // ✅ Timeout de 12 secondes pour éviter le blocage (augmenté pour réseaux lents)
    const timeoutPromise = new Promise<ProviderStats>((_, reject) =>
      setTimeout(() => reject(new Error('Stats calculation timeout')), 12000)
    );

    const statsPromise = (async (): Promise<ProviderStats> => {
      let totalCallsReceived = 0;
      let successfulCalls = 0;
      let completedCalls = 0;

      // FIX: Séparer les requêtes - call_sessions nécessite auth, reviews est public
      // Si call_sessions échoue (visiteurs non auth), on continue quand même avec reviews
      try {
        const callSessionsQuery = query(
          collection(db, "call_sessions"),
          where("metadata.providerId", "==", providerId)
        );
        const callSessionsSnapshot = await getDocs(callSessionsQuery);

        callSessionsSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          totalCallsReceived++;

          if (data.status === "completed" || data.endedAt) {
            completedCalls++;

            const startedAt = data.startedAt?.toDate?.() || data.createdAt?.toDate?.();
            const endedAt = data.endedAt?.toDate?.();

            if (startedAt && endedAt) {
              const durationSeconds = (endedAt.getTime() - startedAt.getTime()) / 1000;

              if (durationSeconds >= SUCCESSFUL_CALL_THRESHOLD_SECONDS) {
                successfulCalls++;
              }
            }
          }
        });
      } catch {
        // Silencieux - call_sessions nécessite auth, les visiteurs non auth n'y ont pas accès
        // On continue avec les reviews qui sont publiques
      }

      // Reviews sont accessibles publiquement (status='published' && isPublic=true)
      const reviewsQuery = query(
        collection(db, "reviews"),
        where("providerId", "==", providerId),
        where("status", "==", "published"),
        where("isPublic", "==", true)
      );
      const reviewsSnapshot = await getDocs(reviewsQuery);

      let totalRating = 0;
      let totalReviews = 0;
      let realReviewsCount = 0;

      reviewsSnapshot.forEach((docSnap) => {
        const data = docSnap.data();

        if (typeof data.rating === "number") {
          totalRating += data.rating;
          realReviewsCount++;
          totalReviews++;
        }
      });

      const averageRating = realReviewsCount > 0 ? totalRating / realReviewsCount : 0;
      // +1 virtuel : tout prestataire démarre à 100%, puis moyenne avec les vrais appels
      const successRate = Math.round(((successfulCalls + 1) / (totalCallsReceived + 1)) * 100);

      const stats: ProviderStats = {
        totalCallsReceived,
        successfulCalls,
        successRate,
        averageRating,
        totalReviews,
        completedCalls, // ✅ P1 FIX: Utiliser la vraie valeur calculée, pas realReviewsCount
        realReviewsCount,
      };

      // ✅ Mettre en cache
      cache.set(cacheKey, stats, CACHE_CONFIG.STATS_TTL);

      return stats;
    })();

    // ✅ Race entre le calcul des stats et le timeout
    const result = await Promise.race([statsPromise, timeoutPromise]);
    return result;
  } catch (error: unknown) {
    // P0 FIX: Ne pas logger les erreurs de permission (normales pour visiteurs)
    const isPermissionError = error instanceof Error &&
      error.message?.includes('permission');
    if (!isPermissionError) {
      console.warn("Stats calculation failed or timeout:", error);
    }
    return DEFAULT_STATS;
  }
};



/* ===================================================================== */
/* RESSOURCES EXTERNES — Autorités officielles par pays (E-E-A-T)       */
/* Sources: portails gouvernementaux officiels + ordres d'avocats        */
/* ===================================================================== */

/** Official immigration/visa portals per country (ISO 2-letter code) */
const COUNTRY_IMMIGRATION_PORTALS: Record<string, string> = {
  AE: 'https://u.ae/en/information-and-services/visa-and-emirates-id',
  AR: 'https://cancilleria.gob.ar/en/services/foreigners',
  AT: 'https://www.bmi.gv.at/204/start.aspx',
  AU: 'https://immi.homeaffairs.gov.au',
  BE: 'https://dofi.ibz.be/en',
  BR: 'https://www.gov.br/mre/en',
  CA: 'https://www.canada.ca/en/immigration-refugees-citizenship.html',
  CH: 'https://www.sem.admin.ch/sem/en/',
  CI: 'https://www.interieur.gouv.ci',
  CM: 'https://www.dgsn.cm',
  CN: 'https://www.nia.gov.cn',
  DE: 'https://www.bamf.de/EN/',
  DK: 'https://nyidanmark.dk/en-GB',
  EG: 'https://www.interior.gov.eg',
  ES: 'https://extranjeros.inclusion.gob.es',
  FR: 'https://www.service-public.fr/particuliers/vosdroits/N110',
  GB: 'https://www.gov.uk/browse/visas-immigration',
  GH: 'https://www.ghanaimmigration.org',
  HK: 'https://www.immd.gov.hk/eng/',
  ID: 'https://www.imigrasi.go.id/en/',
  IN: 'https://boi.gov.in',
  IT: 'https://www.interno.gov.it/en/immigration',
  JP: 'https://www.moj.go.jp/isa/index.html',
  KE: 'https://immigration.ecitizen.go.ke',
  LU: 'https://guichet.public.lu/en/citoyens/immigration.html',
  MA: 'https://www.mtcas.gov.ma',
  MX: 'https://www.gob.mx/inm',
  MY: 'https://www.imi.gov.my',
  NG: 'https://immigration.gov.ng',
  NL: 'https://ind.nl/en',
  NO: 'https://www.udi.no/en/',
  PH: 'https://immigration.gov.ph',
  PL: 'https://www.gov.pl/web/udsc-en',
  PT: 'https://aima.gov.pt/en',
  SA: 'https://www.moi.gov.sa/en',
  SE: 'https://www.migrationsverket.se/English/',
  SG: 'https://www.ica.gov.sg',
  SN: 'https://www.interieur.gouv.sn',
  TH: 'https://www.immigration.go.th/en/',
  TN: 'https://www.mdr.gov.tn',
  TR: 'https://www.goc.gov.tr/en',
  TW: 'https://www.immigration.gov.tw',
  US: 'https://travel.state.gov/content/travel/en/us-visas.html',
  ZA: 'https://www.dha.gov.za',
};

/** Official bar associations / legal regulators per country */
const COUNTRY_BAR_ASSOCIATIONS: Record<string, { url: string; name: string }> = {
  AE: { url: 'https://www.adjd.gov.ae', name: 'Abu Dhabi Judicial Department' },
  AU: { url: 'https://www.lawcouncil.asn.au', name: 'Law Council of Australia' },
  BE: { url: 'https://www.avocat.be', name: 'Ordre des barreaux' },
  CA: { url: 'https://www.cba.org', name: 'Canadian Bar Association' },
  CH: { url: 'https://www.sav-fsa.ch', name: 'Swiss Bar Association' },
  DE: { url: 'https://www.brak.de', name: 'Bundesrechtsanwaltskammer' },
  ES: { url: 'https://www.abogacia.es', name: 'Consejo General de la Abogacía' },
  FR: { url: 'https://www.cnb.avocat.fr', name: 'Conseil National des Barreaux' },
  GB: { url: 'https://www.sra.org.uk', name: 'Solicitors Regulation Authority' },
  GH: { url: 'https://www.ghanabar.org', name: 'Ghana Bar Association' },
  ID: { url: 'https://peradi.or.id', name: 'PERADI Indonesia' },
  IN: { url: 'https://www.barcouncilofindia.org', name: 'Bar Council of India' },
  IT: { url: 'https://www.consiglionazionaleforense.it', name: 'Consiglio Nazionale Forense' },
  JP: { url: 'https://www.nichibenren.or.jp/en/', name: 'Japan Federation of Bar Associations' },
  KE: { url: 'https://www.lsk.or.ke', name: 'Law Society of Kenya' },
  MA: { url: 'https://barreau.ma', name: 'Barreau du Maroc' },
  NG: { url: 'https://www.nbarnigeria.org', name: 'Nigerian Bar Association' },
  NL: { url: 'https://www.advocatenorde.nl', name: 'Nederlandse orde van advocaten' },
  PT: { url: 'https://www.oa.pt', name: 'Ordem dos Advogados' },
  SG: { url: 'https://www.lawsociety.org.sg', name: 'Law Society of Singapore' },
  SN: { url: 'https://www.barreau-dakar.com', name: 'Barreau du Sénégal' },
  TH: { url: 'https://www.thaibar.or.th', name: 'Lawyers Council of Thailand' },
  US: { url: 'https://www.americanbar.org', name: 'American Bar Association' },
  ZA: { url: 'https://www.lssa.org.za', name: 'Law Society of South Africa' },
};

/* ===================================================================== */
/* COMPOSANT PRINCIPAL                                                   */
/* ===================================================================== */

const ProviderProfile: React.FC = () => {
  const intl = useIntl();
  const params = useParams<RouteParams>();
  const {
    id,
    country: countryParam,
    language: langParam,
    type: typeParam,
    nameSlug,
    typeCountry,
    langLocale, // Format: fr-fr, en-us, fr-de, etc.
    roleCountry, // Format: avocat-thailande, lawyer-thailand, etc.
  } = params;

  // Extraire la langue depuis langLocale (ex: "fr-fr" → "fr")
  const langFromLocale = langLocale?.split('-')[0];
  const location = useLocation();
  const navigate = useLocaleNavigate();
  const { user, isLoading: authLoading, authInitialized } = useAuth();
  const { language } = useApp();
  const { trackLead } = useMetaTracking();

  const detectedLang = useMemo(
    () =>
      language === "fr" || language === "en"
        ? (language as "fr" | "en")
        : detectLanguage(),
    [language]
  );

  const preferredLangKey = useMemo(() => {
    const validLocales = ['fr', 'en', 'es', 'de', 'pt', 'ru', 'ch', 'ar', 'hi'] as const;
    type ValidLocale = typeof validLocales[number];
    
    if (validLocales.includes(language as ValidLocale)) {
      return language as ValidLocale;
    }
    if (validLocales.includes(detectedLang as ValidLocale)) {
      return detectedLang as ValidLocale;
    }
    return 'en' as ValidLocale;
  }, [language, detectedLang]);

  const translateAAA = useCallback((key: string): string => {
    if (!key) return '';
    
    try {
      const keys = key.split('.');
      const translations = aaaTranslationsMap[preferredLangKey] || aaaTranslationsMap['fr'];
      let value: any = translations;
      
      for (const k of keys) {
        value = value?.[k];
      }
      
      return typeof value === 'string' ? value : '';
    } catch {
      return '';
    }
  }, [preferredLangKey]);

  const [provider, setProvider] = useState<SosProfile | null>(null);
  const [realProviderId, setRealProviderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isAAAProfile = provider?.uid?.startsWith('aaa_') || (provider as any)?.isAAA === true;
  const [notFound, setNotFound] = useState(false);
  // Stocke la raison et le type pour afficher des alternatives pertinentes
  const [notFoundReason, setNotFoundReason] = useState<'not_found' | 'unavailable'>('not_found');
  const [unavailableProviderType, setUnavailableProviderType] = useState<'lawyer' | 'expat' | null>(null);
  const [suggestedProviders, setSuggestedProviders] = useState<SosProfile[]>([]);
  const [relatedProviders, setRelatedProviders] = useState<SosProfile[]>([]);

  // Translation system
  const { locale: currentLocale, lang: currentLang } = parseLocaleFromPath(location.pathname);
  const targetLanguage: SupportedLanguage = (currentLang?.toLowerCase() as SupportedLanguage) || 'en';
  // Always show original first, then switch to translated when user selects a language
  const [showOriginal, setShowOriginal] = useState(true);
  // Track which language translation we're currently viewing
  const [viewingLanguage, setViewingLanguage] = useState<SupportedLanguage | null>(null);
  
  // Use ref to track if we're actively viewing a translation (prevents state resets)
  const viewingLanguageRef = useRef<SupportedLanguage | null>(null);
  
  // Sync ref with state
  useEffect(() => {
    viewingLanguageRef.current = viewingLanguage;
  }, [viewingLanguage]);
  
  // Only load translation if user explicitly selected a language to view
  // On initial load, don't load any translation - always show original
  const translationLanguage = viewingLanguage || null; // Don't use targetLanguage on initial load
  const {
    translation,
    original: originalTranslation,
    availableLanguages,
    isLoading: isTranslationLoading,
    translate,
    reloadForLanguage,
    error: translationError,
  } = useProviderTranslation(realProviderId, viewingLanguage || null); // Never use targetLanguage here to prevent unwanted reloads

  // Preserve translation view state when translation data changes
  useEffect(() => {
    // If we're viewing a translation and translation data exists, ensure state is preserved
    if (viewingLanguageRef.current && translation && !showOriginal) {
      // State is already correct, but ensure it stays that way
      // This prevents reverting to original when translation data reloads
      // Force state to remain if it somehow got reset
      if (viewingLanguage !== viewingLanguageRef.current) {
        setViewingLanguage(viewingLanguageRef.current);
        setShowOriginal(false);
      }
    }
  }, [translation, viewingLanguage, showOriginal]);

  // HARMONIZATION: Sync viewingLanguage with header language when translation is available
  // This ensures the profile content matches the UI language when possible
  useEffect(() => {
    const headerLang = language?.toLowerCase() as SupportedLanguage;
    // Only auto-sync if:
    // 1. Header language is set
    // 2. Translation for that language exists
    // 3. User hasn't manually selected a different language
    if (headerLang && availableLanguages.includes(headerLang) && !viewingLanguageRef.current) {
      setViewingLanguage(headerLang);
      viewingLanguageRef.current = headerLang;
      setShowOriginal(false);
    }
  }, [language, availableLanguages]);

  const [providerStats, setProviderStats] = useState<ProviderStats>({
    totalCallsReceived: 0,
    successfulCalls: 0,
    successRate: 0,
    averageRating: 0,
    totalReviews: 0,
    completedCalls: 0,
    realReviewsCount: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const { pricing } = usePricingConfig();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [ratingDistribution, setRatingDistribution] =
    useState<RatingDistribution>({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
  const [showImageModal, setShowImageModal] = useState(false);

  const [onlineStatus, setOnlineStatus] = useState<OnlineStatus>({
    isOnline: false,
    lastUpdate: null,
    listenerActive: false,
    connectionAttempts: 0,
  });

  const [isOnCall, setIsOnCall] = useState(false);

  // P0-4 FIX: Vérifier que le provider a un numéro de téléphone valide pour la réservation
  const hasValidPhone = useMemo(() => {
    if (!provider) return false;
    const phone = (provider as any)?.phone || (provider as any)?.phoneNumber || (provider as any)?.telephone || '';
    return /^\+[1-9]\d{6,14}$/.test(phone);
  }, [provider]);

  const [activePromo, setActivePromo] = useState<{
    code: string;
    discountType: "percentage" | "fixed";
    discountValue: number;
    services: string[];
  } | null>(null);

  // État pour le wizard d'authentification rapide
  const [showAuthWizard, setShowAuthWizard] = useState(false);

  // Ref + state pour IntersectionObserver du sticky CTA mobile
  const heroCTARef = useRef<HTMLDivElement>(null);
  const [isHeroCTAVisible, setIsHeroCTAVisible] = useState(false);

  // État expand/collapse de la description (mobile, > 300 chars)
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const providerLoadedRef = useRef(false);

  useEffect(() => {
    providerLoadedRef.current = false;
    setProvider(null);
    setReviews([]);
    setNotFound(false);
    setIsLoading(true);
  }, [id, params.slug, params.profileId, params.nameSlug, params.nameId]);

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

  // IntersectionObserver: masquer le sticky CTA mobile quand le CTA hero est visible
  useEffect(() => {
    const el = heroCTARef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsHeroCTAVisible(entry.isIntersecting),
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Signal to Puppeteer dynamic rendering that provider data is loaded
  useEffect(() => {
    if (provider && !isLoading) {
      document.documentElement.setAttribute('data-provider-loaded', 'true');
    }
    return () => {
      document.documentElement.removeAttribute('data-provider-loaded');
    };
  }, [provider, isLoading]);

  // Signal to Puppeteer that provider was not found (proper 404)
  useEffect(() => {
    if (notFound) {
      document.documentElement.setAttribute('data-provider-not-found', 'true');
    }
    return () => {
      document.documentElement.removeAttribute('data-provider-not-found');
    };
  }, [notFound]);

  // Track Meta Pixel ViewContent - profil provider consulte
  useEffect(() => {
    if (provider?.id && provider?.type) {
      trackMetaViewContent({
        content_name: `provider_profile_${provider.type}`,
        content_category: provider.type,
        content_type: 'service',
        content_ids: [provider.id],
      });
    }
  }, [provider?.id, provider?.type]);

  const serviceTypeForPricing: "lawyer" | "expat" | undefined = provider?.type;

  const bookingPrice = useMemo(() => {
    if (!pricing || !serviceTypeForPricing) return null;

    // Utilise getEffectivePrice pour prendre en compte les overrides promo
    const { price: cfgEur, standard: standardEur, override: activeOverrideEur } = getEffectivePrice(pricing, serviceTypeForPricing, 'eur');
    const { price: cfgUsd, standard: standardUsd } = getEffectivePrice(pricing, serviceTypeForPricing, 'usd');

    const baseEur = cfgEur.totalAmount;  // prix effectif (override si actif, sinon standard)
    const baseUsd = cfgUsd.totalAmount;

    const serviceKey =
      serviceTypeForPricing === "lawyer" ? "lawyer_call" : "expat_call";
    const promoApplies =
      activePromo && activePromo.services.includes(serviceKey);

    // Vérifier si le coupon est cumulable avec l'override actif
    const stackableDefault = pricing.overrides?.settings?.stackableDefault;
    const couponStackable = activeOverrideEur
      ? (typeof activeOverrideEur.stackableWithCoupons === 'boolean'
          ? activeOverrideEur.stackableWithCoupons
          : (stackableDefault ?? false))
      : true;

    const couponApplies = promoApplies && couponStackable;

    let finalEur = baseEur;
    let finalUsd = baseUsd;
    let couponDiscountEur = 0;
    let couponDiscountUsd = 0;

    if (couponApplies) {
      if (activePromo.discountType === "percentage") {
        couponDiscountEur = baseEur * (activePromo.discountValue / 100);
        couponDiscountUsd = baseUsd * (activePromo.discountValue / 100);
      } else {
        couponDiscountEur = Math.min(activePromo.discountValue, baseEur);
        couponDiscountUsd = Math.min(
          activePromo.discountValue * (baseUsd / baseEur),
          baseUsd
        );
      }

      finalEur = Math.max(0, baseEur - couponDiscountEur);
      finalUsd = Math.max(0, baseUsd - couponDiscountUsd);
    }

    const hasOverride = activeOverrideEur !== null;
    const overrideDiscountEur = hasOverride ? standardEur.totalAmount - baseEur : 0;
    const totalDiscountEur = overrideDiscountEur + couponDiscountEur;
    const hasDiscount = hasOverride || (couponApplies && couponDiscountEur > 0);

    return {
      eur: finalEur,
      usd: finalUsd,
      originalEur: hasDiscount ? standardEur.totalAmount : baseEur,
      originalUsd: hasDiscount ? standardUsd.totalAmount : baseUsd,
      discountEur: totalDiscountEur,
      discountUsd: couponDiscountUsd,
      hasDiscount,
      duration: cfgEur.duration,
      promoCode: couponApplies ? activePromo.code : null,
    };
  }, [pricing, serviceTypeForPricing, activePromo]);

  const realLoadReviews = useCallback(
    async (providerId: string): Promise<Review[]> => {
      const cacheKey = `reviews_${providerId}`;
      const cached = cache.get<Review[]>(cacheKey);
      if (cached) return cached;

      try {
        const arr = await getProviderReviews(providerId);
        const reviews = Array.isArray(arr) ? arr : [];
        
        cache.set(cacheKey, reviews, CACHE_CONFIG.REVIEWS_TTL);
        
        return reviews;
      } catch {
        return [];
      }
    },
    []
  );

  const loadReviews = useCallback(
    async (docId: string, uid?: string): Promise<void> => {
      try {
        setIsLoadingReviews(true);
        const candidates = [docId, uid].filter((x): x is string => Boolean(x));
        let providerReviews: Review[] = [];
        
        for (const pid of candidates) {
          providerReviews = await realLoadReviews(pid);
          if (providerReviews.length) break;
        }
        
        const translatedReviews = providerReviews.map(review => {
          const reviewWithKey = review as any;
          
          const translatedComment = reviewWithKey.commentKey
            ? (translateAAA(reviewWithKey.commentKey) || review.comment)
            : review.comment;
          
          return { 
            ...review, 
            comment: translatedComment 
          };
        });
        
        setReviews(translatedReviews);
        
        const distribution: RatingDistribution = {
          5: 0,
          4: 0,
          3: 0,
          2: 0,
          1: 0,
        };
        
        translatedReviews.forEach((r) => {
          const rr = Math.max(
            1,
            Math.min(5, Math.round(r.rating))
          ) as keyof RatingDistribution;
          distribution[rr] += 1;
        });
        
        setRatingDistribution(distribution);
      } catch (e) {
        console.error("Error loading reviews:", e);
      } finally {
        setIsLoadingReviews(false);
      }
    },
    [realLoadReviews, translateAAA]
  );

  useEffect(() => {
    const loadProviderData = async (): Promise<void> => {
      if (providerLoadedRef.current) return;

      setIsLoading(true);
      setNotFound(false);

      try {
        let providerData: SosProfile | null = null;
        let foundProviderId: string | null = null;

        // ✅ PRIORITÉ 1: Vérifier location.state pour éviter le flash 404
        // Quand on navigue depuis SOSCall, le provider est passé directement
        if (location.state) {
          const state = location.state as LocationState;
          const navData = state.selectedProvider || state.providerData;
          if (navData && navData.id) {
            const navIsOnline = !!(navData as any).isOnline;
            providerData = {
              uid: navData.id || "",
              id: navData.id || "",
              fullName: navData.fullName || `${navData.firstName || ""} ${navData.lastName || ""}`.trim(),
              firstName: navData.firstName || "",
              lastName: navData.lastName || "",
              type: navData.type === "lawyer" ? "lawyer" : "expat",
              country: navData.country || "",
              languages: navData.languages || [],
              specialties: toArrayFromAny(navData.specialties, preferredLangKey),
              helpTypes: toArrayFromAny(navData.helpTypes, preferredLangKey),
              // ✅ FIX: Utiliser getFirstString pour gérer les objets LocalizedText
              description: getFirstString(navData.description, preferredLangKey)
                || getFirstString(navData.bio, preferredLangKey)
                || getFirstString((navData as any).professionalDescription, preferredLangKey)
                || getFirstString((navData as any).experienceDescription, preferredLangKey)
                || "",
              bio: (navData as any).bio,
              motivation: (navData as any).motivation,
              profilePhoto: navData.profilePhoto || navData.avatar,
              rating: Number(navData.rating) || 0,
              reviewCount: Number(navData.reviewCount) || 0,
              yearsOfExperience: Number(navData.yearsOfExperience) || 0,
              yearsAsExpat: Number(navData.yearsAsExpat) || Number(navData.yearsOfExperience) || 0,
              totalCalls: Number(navData.totalCalls) || 0,
              createdAt: navData.createdAt,
              isActive: true,
              isApproved: true,
              isVerified: !!navData.isVerified,
              // Pays d'intervention: prendre operatingCountries, practiceCountries OU interventionCountries
              operatingCountries: (() => {
                const opCountries = toArrayFromAny(navData.operatingCountries, preferredLangKey);
                if (opCountries.length > 0) return opCountries;
                const practiceCountries = toArrayFromAny((navData as any).practiceCountries, preferredLangKey);
                if (practiceCountries.length > 0) return practiceCountries;
                return toArrayFromAny((navData as any).interventionCountries, preferredLangKey);
              })(),
              residenceCountry: navData.residenceCountry || navData.country,
              isOnline: navIsOnline, // ✅ Statut en ligne depuis navigation state
              // ✅ P0 FIX: Ajouter availability et busyReason pour cohérence avec le listener
              availability: (navData as any).availability || (navIsOnline ? 'available' : 'offline'),
              busyReason: (navData as any).busyReason || null,
            } as SosProfile;
            foundProviderId = navData.id || "";

            // Afficher immédiatement les données du state, puis enrichir en arrière-plan
            setProvider(providerData);
            setRealProviderId(foundProviderId);
            providerLoadedRef.current = true;

            // ✅ Initialiser le statut en ligne depuis les données de navigation
            setOnlineStatus(prev => ({
              ...prev,
              isOnline: navIsOnline,
              lastUpdate: new Date(),
            }));

            setIsLoading(false);

            // Charger les stats et reviews en arrière-plan (non-bloquant)
            setIsLoadingStats(true);
            calculateProviderStats(foundProviderId)
              .then(stats => {
                setProviderStats(stats);
                setIsLoadingStats(false);
              })
              .catch(err => {
                console.warn("Stats loading failed:", err);
                setIsLoadingStats(false);
              });

            loadReviews(foundProviderId, navData.id).catch(err => {
              console.warn("Reviews loading failed:", err);
            });

            // Enrichir en arrière-plan avec les données complètes de Firestore (bio, motivation, etc.)
            try {
              const fullDoc = await getDoc(doc(db, 'sos_profiles', foundProviderId));
              if (fullDoc.exists()) {
                const fullData = fullDoc.data();
                setProvider(prev => prev ? {
                  ...prev,
                  bio: fullData.bio || prev.bio,
                  motivation: fullData.motivation || prev.motivation,
                  description: prev.description || getFirstString(fullData.bio, preferredLangKey) || '',
                  successRate: fullData.successRate || prev.successRate,
                  totalCalls: fullData.totalCalls || prev.totalCalls,
                  certifications: fullData.certifications || prev.certifications,
                  lawSchool: fullData.lawSchool || prev.lawSchool,
                  graduationYear: fullData.graduationYear || prev.graduationYear,
                  education: fullData.education || prev.education,
                } as SosProfile : prev);
              }
            } catch (enrichErr) {
              console.warn('Background enrichment failed:', enrichErr);
            }

            return; // Sortir ici - données déjà affichées + enrichies
          }
        }

        const possibleIds = [
          id,
          params.slug,
          params.profileId,
          params.name,
          params.nameSlug,
          params.nameId,
          params.nameSlugWithUid,
          location.pathname.split("/").pop(),
        ].filter((x): x is string => Boolean(x));

        // Collecter les IDs possibles - les IDs extraits EN PREMIER (plus probables)
        const extractedIds: string[] = [];
        const rawIds: string[] = [];

        for (const rawId of possibleIds) {
          rawIds.push(rawId);

          // Pattern 1: ID après le dernier tiret (format: nameSlug-providerId)
          // Ex: "julien-v-DfDbWASBaeaVEZrqg6Wlcd3zpYX2" → "DfDbWASBaeaVEZrqg6Wlcd3zpYX2"
          const lastHyphenIndex = rawId.lastIndexOf('-');
          if (lastHyphenIndex !== -1) {
            const afterLastHyphen = rawId.slice(lastHyphenIndex + 1);
            if (afterLastHyphen && afterLastHyphen.length >= 8 && !extractedIds.includes(afterLastHyphen)) {
              extractedIds.push(afterLastHyphen);
            }
          }

          // Pattern 2: IDs AAA - chercher "aaa_" dans le slug
          // Ex: "manuel-m-aaa_lawyer_ni_1767139088290_nkq1" → "aaa_lawyer_ni_1767139088290_nkq1"
          const aaaIndex = rawId.indexOf('aaa_');
          if (aaaIndex !== -1) {
            const aaaId = rawId.slice(aaaIndex);
            if (!extractedIds.includes(aaaId)) {
              extractedIds.push(aaaId);
            }
          }

          // Pattern 3: UID Firebase classique (20+ caractères alphanumériques à la fin)
          const uidMatch = rawId.match(/[a-zA-Z0-9]{20,}$/);
          if (uidMatch && !extractedIds.includes(uidMatch[0])) {
            extractedIds.push(uidMatch[0]);
          }
        }

        // ✅ Pattern 4: NOUVEAU FORMAT SEO - ShortId (6 caractères à la fin)
        // Ex: "julien-visa-k7m2p9" → shortId = "k7m2p9"
        let detectedShortId: string | null = null;
        const nameSlugValue = nameSlug || params.slug || location.pathname.split("/").pop();
        if (nameSlugValue) {
          detectedShortId = extractShortIdFromSlug(`/${nameSlugValue}`);
          if (detectedShortId) {
          }
        }

        // Mettre les IDs extraits en premier (plus probables), puis les IDs bruts
        const potentialUids = [...new Set([...extractedIds, ...rawIds])];

        // ✅ PHASE 0: Recherche par ShortId (NOUVEAU FORMAT SEO)
        // Si on a détecté un shortId, chercher le provider par ce shortId
        if (detectedShortId && !providerData) {
          try {
            // Chercher dans sos_profiles un document dont le shortId correspond
            // isVisible is REQUIRED in the query to satisfy Firestore Security Rules
            // (rule: allow read if resource.data.isVisible == true)
            const shortIdQuery = query(
              collection(db, 'sos_profiles'),
              where('shortId', '==', detectedShortId),
              where('isActive', '==', true),
              where('isVisible', '==', true),
              limit(1)
            );
            const shortIdSnapshot = await getDocs(shortIdQuery);

            if (!shortIdSnapshot.empty) {
              const docSnap = shortIdSnapshot.docs[0];
              const data = docSnap.data();
              const normalized = normalizeUserData(data, docSnap.id);
              const { type: _type, education: _education, ...restNormalized } = normalized as any;
              const safeType: "lawyer" | "expat" = (data?.type === "lawyer" || data?.type === "expat") ? data.type : "expat";
              const safeProvider = { ...restNormalized, type: safeType, ...data };

              providerData = {
                ...restNormalized,
                id: docSnap.id,
                uid: normalized.uid || docSnap.id,
                type: safeType,
                description: pickDescription(safeProvider as any, preferredLangKey, intl),
                bio: data?.bio,
                specialties: toArrayFromAny(data?.specialties, preferredLangKey),
                helpTypes: toArrayFromAny(data?.helpTypes, preferredLangKey),
                operatingCountries: (() => {
                  const opCountries = toArrayFromAny(data?.operatingCountries, preferredLangKey);
                  if (opCountries.length > 0) return opCountries;
                  const practiceCountries = toArrayFromAny(data?.practiceCountries, preferredLangKey);
                  if (practiceCountries.length > 0) return practiceCountries;
                  return toArrayFromAny(data?.interventionCountries, preferredLangKey);
                })(),
                residenceCountry: data?.residenceCountry || data?.country,
                education: data?.education,
                yearsOfExperience: data?.yearsOfExperience || 0,
                yearsAsExpat: data?.yearsAsExpat || data?.yearsOfExperience || 0,
                rating: data?.rating || data?.averageRating || 0,
                reviewCount: data?.reviewCount || 0,
                totalCalls: data?.totalCalls || 0,
                createdAt: data?.createdAt,
                isOnline: !!data?.isOnline,
                // ✅ P0 FIX: Ajouter availability et busyReason pour cohérence
                availability: data?.availability || (data?.isOnline ? 'available' : 'offline'),
                busyReason: data?.busyReason || null,
              } as SosProfile;
              foundProviderId = docSnap.id;
            }
          } catch (shortIdErr) {
            console.warn('ShortId search error:', shortIdErr);
          }
        }

        // PHASE 1: Essayer TOUS les IDs via REST API (rapide, pas de timeout)
        for (const testId of potentialUids) {
          if (providerData) break;

          try {
            const restResult = await getDocumentRest<Record<string, any>>('sos_profiles', testId, 3000);
            if (restResult.exists && restResult.data) {
              const data = restResult.data;
              const normalized = normalizeUserData(data, restResult.id);
              const { type: _type, education: _education, ...restNormalized } = normalized as any;
              const safeType: "lawyer" | "expat" = (data?.type === "lawyer" || data?.type === "expat") ? data.type : "expat";
              const safeProvider = { ...restNormalized, type: safeType, ...data };
              providerData = {
                ...restNormalized,
                id: restResult.id,
                uid: normalized.uid || restResult.id,
                type: safeType,
                description: pickDescription(safeProvider as any, preferredLangKey, intl),
                bio: data?.bio,
                specialties: toArrayFromAny(data?.specialties, preferredLangKey),
                helpTypes: toArrayFromAny(data?.helpTypes, preferredLangKey),
                // Pays d'intervention: prendre operatingCountries, practiceCountries OU interventionCountries
                operatingCountries: (() => {
                  const opCountries = toArrayFromAny(data?.operatingCountries, preferredLangKey);
                  if (opCountries.length > 0) return opCountries;
                  const practiceCountries = toArrayFromAny(data?.practiceCountries, preferredLangKey);
                  if (practiceCountries.length > 0) return practiceCountries;
                  return toArrayFromAny(data?.interventionCountries, preferredLangKey);
                })(),
                residenceCountry: data?.residenceCountry || data?.country,
                education: data?.education,
                yearsOfExperience: data?.yearsOfExperience || 0,
                yearsAsExpat: data?.yearsAsExpat || data?.yearsOfExperience || 0,
                rating: data?.rating || data?.averageRating || 0,
                reviewCount: data?.reviewCount || 0,
                totalCalls: data?.totalCalls || 0,
                createdAt: data?.createdAt,
                isOnline: !!data?.isOnline, // ✅ Statut en ligne depuis REST API
                // ✅ P0 FIX: Ajouter availability et busyReason pour cohérence
                availability: data?.availability || (data?.isOnline ? 'available' : 'offline'),
                busyReason: data?.busyReason || null,
              } as SosProfile;
              foundProviderId = restResult.id;
              break;
            }
            // 404 = document non trouvé, continuer avec l'ID suivant
          } catch (restErr) {
            // Erreur réseau, continuer avec l'ID suivant
            console.warn('REST API error for', testId, ':', restErr);
          }
        }

        // PHASE 2: Si REST n'a rien trouvé, essayer le SDK (UNE SEULE FOIS avec le premier ID)
        if (!providerData && potentialUids.length > 0) {
          const firstId = potentialUids[0];
          try {
            const ref = doc(db, "sos_profiles", firstId);
            const sdkPromise = getDoc(ref);
            const timeoutPromise = new Promise<null>((_, reject) =>
              setTimeout(() => reject(new Error('SDK timeout')), 5000)
            );
            const snap = await Promise.race([sdkPromise, timeoutPromise]);
            if (snap && snap.exists()) {
              const data = snap.data();
              const normalized = normalizeUserData(data, snap.id);
              const { type: _type, education: _education, ...restNormalized } = normalized as any;
              const safeType: "lawyer" | "expat" = (data?.type === "lawyer" || data?.type === "expat") ? data.type : "expat";
              const safeProvider = { ...restNormalized, type: safeType, ...data };
              providerData = {
              ...restNormalized,
              id: snap.id,
              uid: normalized.uid || snap.id,
              type: safeType,
              description: pickDescription(safeProvider as any, preferredLangKey, intl),
              bio: data?.bio,
              specialties: toArrayFromAny(data?.specialties, preferredLangKey),
              helpTypes: toArrayFromAny(data?.helpTypes, preferredLangKey),
              // Pays d'intervention: prendre operatingCountries, practiceCountries OU interventionCountries
              operatingCountries: (() => {
                const opCountries = toArrayFromAny(data?.operatingCountries, preferredLangKey);
                if (opCountries.length > 0) return opCountries;
                const practiceCountries = toArrayFromAny(data?.practiceCountries, preferredLangKey);
                if (practiceCountries.length > 0) return practiceCountries;
                return toArrayFromAny(data?.interventionCountries, preferredLangKey);
              })(),
              residenceCountry: data?.residenceCountry || data?.country,
              education: data?.education,
              yearsOfExperience: data?.yearsOfExperience || 0,
              yearsAsExpat: data?.yearsAsExpat || data?.yearsOfExperience || 0,
              rating: data?.rating || data?.averageRating || 0,
              reviewCount: data?.reviewCount || 0,
              totalCalls: data?.totalCalls || 0,
              createdAt: data?.createdAt,
              isOnline: !!data?.isOnline, // ✅ Statut en ligne depuis SDK
              // ✅ P0 FIX: Ajouter availability et busyReason pour cohérence
              availability: data?.availability || (data?.isOnline ? 'available' : 'offline'),
              busyReason: data?.busyReason || null,
            } as SosProfile;
            foundProviderId = snap.id;
            }
          } catch (e) {
            console.warn('SDK error:', e);
          }
        }

        if (!providerData && possibleIds.length > 0) {
          const slugNoUid = possibleIds[0].replace(/-[a-zA-Z0-9]{8,}$/, "");
          
          try {
            // isVisible required by Firestore Security Rules
            const qSlug = query(
              collection(db, "sos_profiles"),
              where("slug", "==", slugNoUid),
              where("isVisible", "==", true),
              limit(1)
            );
            const qsSlug = await getDocs(qSlug);
            if (!qsSlug.empty) {
              const m = qsSlug.docs[0];
              const data = m.data();
              const normalized = normalizeUserData(data, m.id);
              const { type: _type, education: _education, ...restNormalized } = normalized as any;
              const safeType: "lawyer" | "expat" = (data?.type === "lawyer" || data?.type === "expat") ? data.type : "expat";
              const safeProvider = { ...restNormalized, type: safeType, ...data };
              providerData = {
              ...restNormalized,
              id: m.id,
              uid: normalized.uid || m.id,
              type: safeType,
              description: pickDescription(safeProvider as any, preferredLangKey, intl),
              bio: data?.bio,
              specialties: toArrayFromAny(data?.specialties, preferredLangKey),
              helpTypes: toArrayFromAny(data?.helpTypes, preferredLangKey),
              // Pays d'intervention: prendre operatingCountries, practiceCountries OU interventionCountries
              operatingCountries: (() => {
                const opCountries = toArrayFromAny(data?.operatingCountries, preferredLangKey);
                if (opCountries.length > 0) return opCountries;
                const practiceCountries = toArrayFromAny(data?.practiceCountries, preferredLangKey);
                if (practiceCountries.length > 0) return practiceCountries;
                return toArrayFromAny(data?.interventionCountries, preferredLangKey);
              })(),
              residenceCountry: data?.residenceCountry || data?.country,
              education: data?.education,
              yearsOfExperience: data?.yearsOfExperience || 0,
              yearsAsExpat: data?.yearsAsExpat || data?.yearsOfExperience || 0,
              rating: data?.rating || data?.averageRating || 0,
              reviewCount: data?.reviewCount || 0,
              totalCalls: data?.totalCalls || 0,
              createdAt: data?.createdAt,
              isOnline: !!data?.isOnline, // ✅ Statut en ligne depuis slug search
              // ✅ P0 FIX: Ajouter availability et busyReason pour cohérence
              availability: data?.availability || (data?.isOnline ? 'available' : 'offline'),
              busyReason: data?.busyReason || null,
            } as SosProfile;
            foundProviderId = m.id;
            }
          } catch (e) {
            console.warn('Error searching by slug:', e);
          }
        }

        // Note: location.state est déjà vérifié en priorité au début de cette fonction

        if (providerData && foundProviderId) {
          // ✅ Vérifications de sécurité harmonisées avec SOSCall.tsx
          const isInactive = providerData.isActive === false;
          const isNotApproved = providerData.isApproved === false;
          const isBanned = (providerData as any).isBanned === true;
          const isHidden = (providerData as any).isVisible === false;
          const isAdmin = (providerData as any).isAdmin === true || (providerData as any).role === 'admin';

          if (isInactive || isNotApproved || isBanned || isHidden || isAdmin) {
            // Prestataire trouvé mais indisponible - stocker le type pour suggérer des alternatives
            setNotFoundReason('unavailable');
            setUnavailableProviderType(providerData.type === 'lawyer' ? 'lawyer' : 'expat');

            // Charger des prestataires similaires : même type + même pays + actifs
            // Puis filtrer par langues côté client
            try {
              const unavailableType = providerData.type || 'expat';
              const unavailableCountry = providerData.country || providerData.residenceCountry || '';
              const unavailableLanguages = Array.isArray(providerData.languages)
                ? providerData.languages.map((l: string) => l.toLowerCase())
                : [];

              // Requête Firestore : même type + même pays + actif + visible
              const suggestionsQuery = query(
                collection(db, "sos_profiles"),
                where("type", "==", unavailableType),
                where("country", "==", unavailableCountry),
                where("isVisible", "==", true),
                where("isActive", "==", true),
                limit(20) // Prendre plus pour filtrer ensuite par langue
              );

              const suggestionsSnap = await getDocs(suggestionsQuery);

              let suggestions = suggestionsSnap.docs
                .map(doc => {
                  const data = doc.data();
                  return {
                    id: doc.id,
                    uid: data.uid || doc.id,
                    fullName: data.fullName || data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
                    type: data.type || 'expat',
                    country: data.country || '',
                    languages: Array.isArray(data.languages) ? data.languages : [],
                    profilePhoto: data.profilePhoto || data.avatar,
                    rating: data.rating || data.averageRating || 0,
                    reviewCount: data.reviewCount || 0,
                    isOnline: data.isOnline || false,
                    slug: data.slug,
                  } as SosProfile;
                })
                .filter(p => p.id !== foundProviderId) // Exclure le prestataire actuel
                .filter(p => {
                  // Filtrer par langue : au moins une langue en commun
                  if (unavailableLanguages.length === 0) return true;
                  const providerLangs = (p.languages || []).map((l: string) => l.toLowerCase());
                  return providerLangs.some((lang: string) => unavailableLanguages.includes(lang));
                })
                // Trier : en ligne d'abord, puis par note décroissante
                .sort((a, b) => {
                  if (a.isOnline !== b.isOnline) return b.isOnline ? 1 : -1;
                  return (b.rating || 0) - (a.rating || 0);
                })
                .slice(0, 3); // Garder les 3 meilleurs

              // Si pas assez de résultats avec même pays, élargir la recherche
              if (suggestions.length < 3) {
                const fallbackQuery = query(
                  collection(db, "sos_profiles"),
                  where("type", "==", unavailableType),
                  where("isVisible", "==", true),
                  where("isActive", "==", true),
                  limit(20)
                );
                const fallbackSnap = await getDocs(fallbackQuery);
                const existingIds = new Set(suggestions.map(s => s.id));

                const moreSuggestions = fallbackSnap.docs
                  .map(doc => {
                    const data = doc.data();
                    return {
                      id: doc.id,
                      uid: data.uid || doc.id,
                      fullName: data.fullName || data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
                      type: data.type || 'expat',
                      country: data.country || '',
                      languages: Array.isArray(data.languages) ? data.languages : [],
                      profilePhoto: data.profilePhoto || data.avatar,
                      rating: data.rating || data.averageRating || 0,
                      reviewCount: data.reviewCount || 0,
                      isOnline: data.isOnline || false,
                      slug: data.slug,
                    } as SosProfile;
                  })
                  .filter(p => p.id !== foundProviderId && !existingIds.has(p.id))
                  .filter(p => {
                    // Priorité aux mêmes langues
                    if (unavailableLanguages.length === 0) return true;
                    const providerLangs = (p.languages || []).map((l: string) => l.toLowerCase());
                    return providerLangs.some((lang: string) => unavailableLanguages.includes(lang));
                  })
                  .sort((a, b) => {
                    if (a.isOnline !== b.isOnline) return b.isOnline ? 1 : -1;
                    return (b.rating || 0) - (a.rating || 0);
                  })
                  .slice(0, 3 - suggestions.length);

                suggestions = [...suggestions, ...moreSuggestions];
              }

              setSuggestedProviders(suggestions);
            } catch (e) {
              console.warn('Could not load suggestions:', e);
            }

            setNotFound(true);
            setIsLoading(false);
            return;
          }
          
          if (!providerData.fullName?.trim()) {
            providerData.fullName = `${providerData.firstName || ""} ${providerData.lastName || ""}`.trim() ||
              intl.formatMessage({ id: "providerProfile.defaultProfileName" });
          }

          // ✅ SEO 2026: Redirection 301 des anciennes URLs (Firebase UID 28 chars) vers nouvelles (ShortId 6 chars)
          // Exemple: /fr-fr/avocat-thai/pierre-visa-DfDbWASBaeaVEZrqg6Wlcd3zpYX2 → /fr-fr/avocat-thai/pierre-visa-k7m2p9
          const currentNameSlug = params.nameSlug || params.name || params.slug || '';
          const urlContainsOldUID = currentNameSlug && /[a-zA-Z0-9]{20,}$/.test(currentNameSlug);
          const providerShortId = (providerData as any).shortId;

          if (urlContainsOldUID && providerShortId && providerShortId.length === 6) {
            // Générer le nouveau slug avec le shortId
            const newSlug = generateSlug({
              firstName: providerData.firstName || '',
              lastName: providerData.lastName || '',
              role: providerData.type || 'expat',
              country: providerData.country || providerData.residenceCountry || '',
              specialties: providerData.specialties || [],
              languages: providerData.languages || [],
              uid: providerData.uid || foundProviderId,
              locale: language,
            });

            // Construire la nouvelle URL
            const currentPath = location.pathname;
            const localeMatch = currentPath.match(/^\/([a-z]{2}-[a-z]{2})\//);
            const currentLocale = localeMatch ? localeMatch[1] : getLocaleString(language as any);
            const newUrl = `/${currentLocale}/${newSlug}`;

            // Vérifier que la nouvelle URL est différente de l'actuelle
            if (newUrl !== currentPath && !currentPath.endsWith(providerShortId)) {
              // Utiliser navigate avec replace pour une redirection côté client (équivalent 301 pour SPA)
              navigate(newUrl, { replace: true });
              return; // Sortir pour éviter de continuer le rendu
            }
          }

          setProvider(providerData);
          setRealProviderId(foundProviderId);
          providerLoadedRef.current = true;

          // ✅ IMPORTANT: Initialiser le statut en ligne depuis les données REST API
          setOnlineStatus(prev => ({
            ...prev,
            isOnline: !!(providerData as any).isOnline,
            lastUpdate: new Date(),
          }));

          // ✅ IMPORTANT: Afficher le provider IMMÉDIATEMENT sans attendre les stats
          setIsLoading(false);

          // ✅ Charger les stats en arrière-plan (non-bloquant)
          setIsLoadingStats(true);
          calculateProviderStats(foundProviderId)
            .then(stats => {
              setProviderStats(stats);
              setIsLoadingStats(false);
            })
            .catch(err => {
              console.warn("Stats loading failed:", err);
              setIsLoadingStats(false);
            });

          // ✅ Charger les reviews en arrière-plan (non-bloquant)
          loadReviews(foundProviderId, providerData.uid).catch(err => {
            console.warn("Reviews loading failed:", err);
          });

          return; // ✅ Sortir immédiatement - page affichée
        } else {
          setNotFound(true);
          setIsLoading(false);
        }
      } catch (e) {
        console.error("Error loading provider:", e);
        setNotFound(true);
        setIsLoading(false);
      }
    };

    loadProviderData();
  }, [id, typeParam, countryParam, langParam, preferredLangKey, params.slug, params.profileId, params.name, params.nameSlug, params.nameId]);

  // GA4: Track view_provider with enriched international data
  useEffect(() => {
    if (!provider || !realProviderId) return;

    const { locale: currentLocale } = parseLocaleFromPath(location.pathname);
    trackEvent('view_provider', {
      provider_id: realProviderId,
      provider_type: provider.type,
      provider_country: provider.country,
      provider_languages: provider.languages?.join(','),
      provider_rating: provider.rating,
      provider_review_count: provider.reviewCount,
      page_locale: currentLocale,
    });
  }, [realProviderId]); // Only fire once per provider load

  // Fetch related providers: same country (primary + operatingCountries) and same type
  useEffect(() => {
    if (!provider?.country || !realProviderId) return;
    const fetchRelated = async () => {
      try {
        const providerType = provider.type || "lawyer";
        const baseFilters = [
          where("isApproved", "==", true),
          where("isVisible", "==", true),
          where("isActive", "==", true),
          where("type", "==", providerType),
        ];

        // Query 1: Same primary country
        const q1 = query(
          collection(db, "sos_profiles"),
          ...baseFilters,
          where("country", "==", provider.country),
          limit(7)
        );

        // Query 2: Operating in this country (operatingCountries array-contains)
        const q2 = query(
          collection(db, "sos_profiles"),
          ...baseFilters,
          where("operatingCountries", "array-contains", provider.country),
          limit(7)
        );

        // Run both queries — q2 may fail if composite index is missing, so use allSettled
        const [res1, res2] = await Promise.allSettled([getDocs(q1), getDocs(q2)]);

        // Merge & deduplicate results
        const seen = new Set<string>();
        const merged: SosProfile[] = [];
        for (const res of [res1, res2]) {
          if (res.status !== 'fulfilled') continue;
          for (const d of res.value.docs) {
            if (seen.has(d.id)) continue;
            seen.add(d.id);
            merged.push({ ...d.data(), id: d.id } as SosProfile);
          }
        }

        const results = merged
          .filter(p => p.id !== realProviderId && p.uid !== realProviderId)
          .slice(0, 6);
        setRelatedProviders(results);
      } catch { /* non-blocking */ }
    };
    fetchRelated();
  }, [provider?.country, provider?.type, realProviderId]);

  useEffect(() => {
    if (!realProviderId) return;

    setOnlineStatus((s) => ({
      ...s,
      listenerActive: true,
      connectionAttempts: s.connectionAttempts + 1,
    }));
    
    const unsub = onSnapshot(
      doc(db, "sos_profiles", realProviderId),
      { includeMetadataChanges: true },
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() || {};
          const newIsOnline = !!data.isOnline;

          // ✅ Vérifications de sécurité harmonisées avec SOSCall.tsx
          const isActive = data.isActive !== false;
          const isApproved = data.isApproved !== false;
          const notBanned = data.isBanned !== true;
          const isVisible = data.isVisible !== false;
          const notAdmin = data.isAdmin !== true && data.role !== 'admin';

          if (!isActive || !isApproved || !notBanned || !isVisible || !notAdmin) {
            setNotFound(true);
            setProvider(null);
            return;
          }
          
          setOnlineStatus((prev) => ({
            ...prev,
            isOnline: newIsOnline,
            lastUpdate: new Date(),
            listenerActive: true,
          }));

          // P0 FIX: Mettre à jour busyReason et availability pour bloquer les réservations si en appel
          setProvider((prev) =>
            prev
              ? {
                  ...prev,
                  isOnline: newIsOnline,
                  busyReason: data.busyReason || null,
                  availability: data.availability,
                  updatedAt: new Date()
                }
              : prev
          );
        }
      },
      (err) => {
        console.error("Realtime listener error:", err);
        setOnlineStatus((s) => ({
          ...s,
          listenerActive: false,
          lastUpdate: new Date(),
        }));
      }
    );
    
    return () => {
      setOnlineStatus((s) => ({ ...s, listenerActive: false }));
      unsub();
    };
  }, [realProviderId]);

  // FIX: Cohérence avec ProfileCards - utiliser SEULEMENT availability === 'busy'
  // ProfileCards affiche orange quand availability === 'busy', sans vérifier busyReason
  // ProviderProfile doit faire pareil pour éviter les incohérences d'affichage
  useEffect(() => {
    if (!provider) {
      setIsOnCall(false);
      return;
    }
    // Le prestataire est considéré occupé si availability === 'busy'
    // Cela correspond exactement à la logique de ProfileCards (ligne 445-446)
    const isBusy = provider.availability === 'busy';
    setIsOnCall(isBusy);
  }, [provider?.availability]);

  useEffect(() => {
    if (realProviderId && provider) {
      loadReviews(realProviderId, provider.uid);
    }
  }, [preferredLangKey, realProviderId, provider?.uid, loadReviews]);
  
  useEffect(() => {
    if (!isLoading && !provider && notFound) {
      const tmo = setTimeout(
        () => navigate("/sos-appel"),
        ANIMATION_DURATIONS.LOADING_DELAY
      );
      return () => clearTimeout(tmo);
    }
  }, [isLoading, provider, notFound, navigate]);

  // SEO metadata handled entirely by <SEOHead> + <HreflangLinks> components below

  const handleBookCall = useCallback(() => {
    if (!provider) {
      return;
    }

    // FIX: On attend seulement que authInitialized soit true (Firebase a vérifié l'état d'auth)
    // Une fois initialisé, on peut continuer : soit naviguer (si user), soit montrer le wizard
    if (!authInitialized) {
      return;
    }

    // P0-4 FIX: Bloquer si le provider n'a pas de numéro de téléphone valide
    if (!hasValidPhone) {
      return;
    }

    const gtag = (window as Window & { gtag?: (...args: unknown[]) => void })
      .gtag;
    if (typeof window !== "undefined" && typeof gtag === "function") {
      gtag("event", "book_call_click", {
        provider_id: provider.id,
        provider_uid: provider.uid,
        provider_type: provider.type,
        provider_country: provider.country,
        is_online: onlineStatus.isOnline,
      });
    }

    // Track Meta Pixel + CAPI Lead event for ad attribution
    trackLead({
      contentName: `${provider.type}_consultation`,
      contentCategory: provider.type || "provider",
      providerType: provider.type as 'lawyer' | 'expat',
      providerId: provider.id,
    });

    const authUserId = getAuthUserId(user);
    if (authUserId) {
      logAnalyticsEvent({
        eventType: "book_call_click",
        userId: authUserId,
        eventData: {
          providerId: provider.id,
          providerUid: provider.uid,
          providerType: provider.type,
          providerName: provider.fullName,
          providerOnlineStatus: onlineStatus.isOnline,
        },
      });
    }
    try {
      sessionStorage.setItem(
        STORAGE_KEYS.SELECTED_PROVIDER,
        JSON.stringify(provider)
      );
    } catch {
      // Ignore storage errors
    }
    // Utiliser shortId (6 chars) si disponible, sinon fallback sur id
    const providerIdentifier = provider.shortId || provider.id;
    const target = `/booking-request/${providerIdentifier}`;

    // Validation: s'assurer que l'identifiant est défini
    if (!providerIdentifier) {
      return;
    }

    if (user) {
      navigate(target, {
        state: {
          selectedProvider: provider,
          navigationSource: "provider_profile",
        },
      });
    } else {
      // P3-5 FIX: Clear stale redirect avant d'écrire le nouveau (évite redirection vers un ancien provider)
      sessionStorage.removeItem('loginRedirect');
      sessionStorage.setItem('loginRedirect', `/booking-request/${providerIdentifier}`);
      setShowAuthWizard(true);
    }
  }, [provider, user, authInitialized, navigate, onlineStatus, hasValidPhone]);

  // Callback quand l'authentification réussit via le wizard
  const handleAuthSuccess = useCallback(() => {
    if (!provider || (!provider.shortId && !provider.id)) {
      return;
    }

    setShowAuthWizard(false);

    // Utiliser shortId (6 chars) si disponible
    const providerIdentifier = provider.shortId || provider.id;
    // Use translated slug to avoid LocaleRouter double-redirect
    const bookingSlug = getTranslatedRouteSlug("booking-request" as any, language as any);
    const target = `/${bookingSlug}/${providerIdentifier}`;

    navigate(target, {
      state: {
        selectedProvider: provider,
        navigationSource: "provider_profile",
      },
    });
  }, [provider, navigate, language]);

  const handleHelpfulClick = useCallback(
    async (reviewId: string) => {
      if (!user) {
        navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
        return;
      }
      try {
        await incrementReviewHelpfulCount(reviewId);
        setReviews((prev) =>
          prev.map((r) =>
            r.id === reviewId
              ? { ...r, helpfulVotes: (r.helpfulVotes || 0) + 1 }
              : r
          )
        );
      } catch (e) {
        console.error("Error marking review helpful:", e);
      }
    },
    [user, navigate]
  );

  const handleReportClick = useCallback(
    async (reviewId: string) => {
      if (!user) {
        navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
        return;
      }
      const reason = window.prompt(intl.formatMessage({ id: "providerProfile.reportReason" }));
      if (reason) {
        try {
          await reportReview(reviewId, reason);
          toast.success(intl.formatMessage({ id: "providerProfile.reportThanks" }));
        } catch (e) {
          console.error("Error reporting review:", e);
        }
      }
    },
    [user, navigate, intl]
  );

  const renderStars = useCallback((rating?: number) => {
    const safe =
      typeof rating === "number" && !Number.isNaN(rating) ? rating : 0;
    const full = Math.floor(safe);
    const hasHalf = safe - full >= 0.5;
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={18}
        className={
          i < full
            ? "text-yellow-400 fill-yellow-400"
            : i === full && hasHalf
              ? "text-yellow-400"
              : "text-gray-400"
        }
        aria-hidden="true"
      />
    ));
  }, []);

  const handleImageError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.target as HTMLImageElement;
      img.onerror = null;
      img.src = "/default-avatar.webp";
    },
    []
  );

  const isLawyer = provider?.type === "lawyer";
  const isExpat = provider?.type === "expat";
  
  const languagesList = useMemo<string[]>(
    () => (provider?.languages?.length ? provider.languages : []),
    [provider?.languages]
  );

  const languageCodes = useMemo(() => {
  // Si déjà des codes ISO (fr, en, es...), les garder tels quels
  const isAlreadyCodes = languagesList.every(
    (lang) => lang.length === 2 || lang.length === 3
  );
  if (isAlreadyCodes) {
    return languagesList;
  }
  // Sinon convertir les noms en codes
  return convertLanguageNamesToCodes(languagesList);
}, [languagesList]);
  
  // Photo de profil pour l'affichage
  const profilePhoto: string =
    provider?.profilePhoto ||
    provider?.photoURL ||
    provider?.avatar ||
    "/default-avatar.webp";

  // Image OG dynamique avec overlay pour les réseaux sociaux
  const mainPhoto: string = (provider?.id || provider?.uid)
    ? `${getCloudFunctionUrl('generateOgImage', 'europe-west1')}/${provider?.id || provider?.uid}?lang=${language}`
    : profilePhoto;
  
  const descriptionText = useMemo(() => {
    if (!provider) return "";
    // ALWAYS show original from sos_profiles when showOriginal is true
    if (showOriginal) {
      return pickDescription(provider, preferredLangKey, intl);
    }
    // Only use translation if user explicitly selected a language and showOriginal is false
    if (translation && !showOriginal && viewingLanguage) {
      // Check translation fields in priority order:
      // 1. description (what's saved in Dashboard)
      // 2. bio (fallback for older translations)
      // 3. summary (motivation field, also saved in Dashboard)
      const trans = translation as any;
      if (trans.description) {
        return typeof trans.description === 'string' ? trans.description : String(trans.description);
      }
      if (trans.bio) {
        return typeof trans.bio === 'string' ? trans.bio : String(trans.bio);
      }
      if (trans.summary) {
        return typeof trans.summary === 'string' ? trans.summary : String(trans.summary);
      }
    }
    // Fallback to provider's description (original)
    return pickDescription(provider, preferredLangKey, intl);
  }, [provider, preferredLangKey, intl, translation, showOriginal, viewingLanguage]);

  const isNewProvider = useMemo(() => {
    const calls = providerStats.completedCalls || provider?.totalCalls || 0;
    const reviews = providerStats.realReviewsCount || provider?.reviewCount || 0;
    return calls === 0 && reviews === 0;
  }, [providerStats]);

  // AI-generated SEO data (from seo_optimized collection)
  // MUST be called before any conditional returns to respect React Rules of Hooks
  const { data: seoAI } = useSEOOptimized(realProviderId, currentLang || 'fr');

  // Use viewingLanguage for FAQ if user selected a translation, otherwise use header language
  const snippetLanguage = viewingLanguage || language;

  const snippetData = useSnippetGenerator(
    provider ? {
      firstName: provider.firstName,
      lastName: provider.lastName,
      type: provider.type,
      country: provider.country,
      city: provider.city,
      languages: provider.languages,
      specialties: provider.specialties || [],
      helpTypes: provider.helpTypes || [],
      yearsOfExperience: provider.yearsOfExperience,
      yearsAsExpat: provider.yearsAsExpat,
      rating: providerStats.averageRating || provider.rating,
      reviewCount: providerStats.realReviewsCount || provider.reviewCount,
      successRate: providerStats.successRate || provider.successRate,
      totalCalls: providerStats.completedCalls || provider.totalCalls,
      description: descriptionText
    } : null,
    snippetLanguage
  );
  
  const educationText = useMemo(() => {
    if (!provider || !isLawyer) return undefined;
    return (
      toStringFromAny(provider.lawSchool, preferredLangKey) ||
      toStringFromAny(provider.education, preferredLangKey)
    );
  }, [provider, isLawyer, preferredLangKey]);
  
  const certificationsArray = useMemo(() => {
    if (!provider || !isLawyer) return [];
    const s = toStringFromAny(provider.certifications, preferredLangKey);
    if (!s) return [];
    return s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }, [provider, isLawyer, preferredLangKey]);
  
  const derivedSpecialties = useMemo(() => {
    if (!provider) return [];

    // Determine which locale to use for translation - use mapLanguageToLocale for proper mapping
    const localeForTranslation = mapLanguageToLocale(detectedLang || preferredLangKey || 'fr');

    // Only use translation if user explicitly selected a language and showOriginal is false
    if (translation && !showOriginal && viewingLanguage && translation.specialties) {
      return translation.specialties;
    }

    // Get specialties array
    const arr = isLawyer
      ? toArrayFromAny(provider.specialties, preferredLangKey)
      : toArrayFromAny(
          provider.helpTypes || provider.specialties,
          preferredLangKey
        );

    // Translate specialty codes to localized labels using the specialtyMapper
    return arr
      .map((s) => {
        try {
          const cleanCode = s.trim();
          if (isLawyer) {
            // Use getSpecialtyLabel from specialtyMapper which handles camelCase to SCREAMING_SNAKE_CASE mapping
            return getSpecialtyLabel(cleanCode, localeForTranslation);
          } else {
            // For expat help types, try the original method first
            const upperCode = cleanCode.toUpperCase();
            const label = getExpatHelpTypeLabel(upperCode, localeForTranslation as any);
            return label !== upperCode ? label : cleanCode;
          }
        } catch (e) {
          return s;
        }
      })
      .map((s) => s.replace(/\s+/g, " ").trim())
      .filter(Boolean);
  }, [provider, isLawyer, preferredLangKey, translation, showOriginal, viewingLanguage, detectedLang]);
  
  const joinDateText = useMemo(() => {
    if (!provider) return undefined;
    const formatted = formatJoinDate(
      provider.createdAt || provider.updatedAt || null,
      preferredLangKey
    );
    if (!formatted) return undefined;
    return `${intl.formatMessage({ id: "providerProfile.memberSince" })} ${formatted}`;
  }, [provider, preferredLangKey, intl]);

  const yearsLabel = intl.formatMessage({ id: "providerProfile.years" });
  const minutesLabel = intl.formatMessage({ id: "providerProfile.minutes" });

  // ✅ Structured Data enrichi
  const structuredData = useMemo<Record<string, unknown> | undefined>(() => {
    if (!provider) return undefined;
    const displayName = formatPublicName(provider);
    
    const roleLabel = isLawyer
      ? intl.formatMessage({ id: "providerProfile.attorney" })
      : intl.formatMessage({ id: "providerProfile.consultant" });
    
    // Use LegalService/ProfessionalService as primary type to support aggregateRating
    // Google only allows aggregateRating on: Organization, LocalBusiness, Product, Service, etc.
    // Person/Attorney types do NOT support aggregateRating
    const photoUrl = profilePhoto.startsWith('http') ? profilePhoto : `https://sos-expat.com${profilePhoto}`;
    const data: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": isLawyer ? "LegalService" : "ProfessionalService",
      "@id": `https://sos-expat.com${window.location.pathname}#service`,
      url: `https://sos-expat.com${window.location.pathname}`,
      name: displayName,
      image: photoUrl,
      description: descriptionText,
      inLanguage: preferredLangKey || 'fr',
      address: {
        "@type": "PostalAddress",
        addressCountry: provider.country?.toUpperCase() || '',
        ...(provider.city && { addressLocality: provider.city })
      },
      // Provider information as Person nested inside the Service
      provider: {
        "@type": "Person",
        name: displayName,
        jobTitle: roleLabel,
        image: photoUrl,
        worksFor: {
          "@type": "Organization",
          name: "SOS Expat & Travelers",
          url: "https://sos-expat.com",
          logo: "https://sos-expat.com/logo.png",
        },
        knowsLanguage: languagesList.map((code) => ({
          "@type": "Language",
          name: getLanguageName(code, preferredLangKey) || code,
        })),
        ...(provider.yearsOfExperience && {
          hasOccupation: {
            "@type": "Occupation",
            name: roleLabel,
            experienceRequirements: `${provider.yearsOfExperience} ${yearsLabel}`,
          }
        }),
      },
      // Broker: SOS Expat connects clients with providers
      broker: {
        "@type": "Organization",
        name: "SOS Expat & Travelers",
        url: "https://sos-expat.com",
      },
      availableLanguage: languagesList.map((code) => getLanguageName(code, preferredLangKey) || code),
      // aggregateRating is valid on LegalService/ProfessionalService
      ...(providerStats.realReviewsCount > 0 && {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: Number((providerStats.averageRating || 0).toFixed(1)),
          reviewCount: providerStats.realReviewsCount || 0,
          bestRating: 5,
          worstRating: 1,
        }
      }),
      priceRange: isLawyer ? "€49" : "€19",
      priceCurrency: "EUR",
      areaServed: (() => {
        const countries = [provider.country, ...(provider.operatingCountries || [])]
          .filter((c): c is string => !!c)
          .map(c => c.toUpperCase())
          .filter((c, i, arr) => arr.indexOf(c) === i); // deduplicate
        if (countries.length === 1) {
          return { "@type": "Country", name: countries[0] };
        }
        return countries.map(c => ({ "@type": "Country", name: c }));
      })(),
      ...(provider.specialties && provider.specialties.length > 0 && {
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: isLawyer
            ? intl.formatMessage({ id: "providerProfile.legalServices", defaultMessage: "Services juridiques" })
            : intl.formatMessage({ id: "providerProfile.consultingServices", defaultMessage: "Services de conseil" }),
          itemListElement: provider.specialties.slice(0, 5).map((specialty, index) => {
            const cleanCode = specialty.trim();
            const locale = mapLanguageToLocale(preferredLangKey || 'fr');
            const translatedName = isLawyer
              ? getSpecialtyLabel(cleanCode, locale)
              : getExpatHelpTypeLabel(cleanCode.toUpperCase(), locale as any);
            return {
              "@type": "Offer",
              "@id": `https://sos-expat.com${window.location.pathname}#service-${index}`,
              price: isLawyer ? "49.00" : "19.00",
              priceCurrency: "EUR",
              availability: "https://schema.org/InStock",
              itemOffered: {
                "@type": "Service",
                name: translatedName,
                description: `${translatedName} - ${intl.formatMessage({ id: "providerProfile.phoneConsultation", defaultMessage: "Phone consultation" })}`,
              }
            };
          })
        }
      }),
    };
    return data;
  }, [
    provider,
    isLawyer,
    profilePhoto,
    descriptionText,
    intl,
    languagesList,
    providerStats,
    yearsLabel,
    preferredLangKey,
  ]);

  // BreadcrumbList + FAQPage schemas are already included in snippetData.jsonLD
  // via generateJSONLD() in snippetGenerator.ts — no separate rendering needed

  // ✅ Loading state
  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gray-950">
          <LoadingSpinner 
            size="large" 
            color="red" 
            text={intl.formatMessage({ id: "providerProfile.loading" })} 
          />
        </div>
      </Layout>
    );
  }

  // ✅ Not found / Unavailable state - avec suggestions d'alternatives
  if (notFound || !provider) {
    const isUnavailable = notFoundReason === 'unavailable';
    const providerTypeLabel = unavailableProviderType === 'lawyer'
      ? intl.formatMessage({ id: "providerProfile.lawyer" })
      : intl.formatMessage({ id: "providerProfile.expat" });

    return (
      <Layout>
        {/* Noindex: not-found/unavailable pages must not be indexed */}
        <Helmet>
          <meta name="robots" content="noindex, nofollow" />
          <title>
            {isUnavailable
              ? `${intl.formatMessage({ id: 'providerProfile.unavailable', defaultMessage: 'Expert temporairement indisponible' })} | SOS Expat`
              : `${intl.formatMessage({ id: 'providerProfile.notFound', defaultMessage: 'Expert introuvable' })} | SOS Expat`}
          </title>
        </Helmet>
        <div className="min-h-screen bg-gray-950 px-4 py-12" data-provider-not-found="true">
          <div className="max-w-2xl mx-auto">
            {/* Message principal */}
            <div className="text-center mb-10">
              <div className="mb-6">
                <div className="mx-auto w-24 h-24 bg-gradient-to-br from-amber-500/20 to-orange-600/20 rounded-full flex items-center justify-center border border-amber-500/30">
                  {isUnavailable ? (
                    <UserX className="w-12 h-12 text-amber-500" aria-hidden="true" />
                  ) : (
                    <AlertTriangle className="w-12 h-12 text-red-500" aria-hidden="true" />
                  )}
                </div>
              </div>

              <h1 className="text-2xl font-bold text-white mb-3">
                {isUnavailable ? (
                  <FormattedMessage id="providerProfile.unavailable" defaultMessage="Expert temporairement indisponible" />
                ) : (
                  <FormattedMessage id="providerProfile.notFound" />
                )}
              </h1>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                {isUnavailable ? (
                  <FormattedMessage
                    id="providerProfile.unavailableDescription"
                    defaultMessage="Ce prestataire n'est plus disponible sur notre plateforme. Découvrez d'autres experts qualifiés ci-dessous."
                  />
                ) : (
                  <FormattedMessage id="providerProfile.notFoundDescription" />
                )}
              </p>
            </div>

            {/* Suggestions de prestataires similaires */}
            {isUnavailable && suggestedProviders.length > 0 && (
              <div className="mb-10">
                <h2 className="text-lg font-semibold text-white mb-4 text-center">
                  <FormattedMessage
                    id="providerProfile.suggestedExperts"
                    defaultMessage="Experts similaires disponibles"
                  />
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {suggestedProviders.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      onClick={() => {
                        const slug = suggestion.slug || suggestion.id;
                        const role = suggestion.type === 'lawyer' ? 'avocat' : 'expatrie';
                        navigate(`/${role}/${slug}`);
                      }}
                      className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/60 rounded-xl p-4 text-left hover:border-red-500/40 hover:from-slate-700 hover:to-slate-800 hover:shadow-md hover:shadow-red-500/10 transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <img
                          src={suggestion.profilePhoto || '/default-avatar.webp'}
                          alt={suggestion.fullName || 'Expert'}
                          className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-600 group-hover:ring-red-500/50 transition-colors"
                          width={48}
                          height={48}
                          loading="lazy"
                          decoding="async"
                          onError={(e) => { e.currentTarget.src = '/default-avatar.webp'; }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate">{suggestion.fullName}</p>
                          <p className="text-sm text-gray-400">{suggestion.country}</p>
                        </div>
                        {suggestion.isOnline && (
                          <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse" title={intl.formatMessage({ id: 'status.online' })} />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-white">{(suggestion.rating || 0).toFixed(1)}</span>
                        <span className="text-gray-500">({suggestion.reviewCount || 0} {intl.formatMessage({ id: 'card.labels.reviews' })})</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Boutons d'action */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate("/sos-appel")}
                onTouchEnd={(e) => { e.preventDefault(); navigate("/sos-appel"); }}
                className="inline-flex items-center justify-center px-6 py-3 min-h-[48px] bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl hover:from-red-500 hover:to-red-400 active:scale-[0.98] transition-colors shadow-lg font-semibold focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-950 touch-manipulation"
                style={{ WebkitTapHighlightColor: 'transparent' }}
                aria-label={intl.formatMessage({ id: "providerProfile.backToExperts" })}
              >
                <Users className="w-5 h-5 mr-2" aria-hidden="true" />
                <FormattedMessage id="providerProfile.seeAllExperts" defaultMessage="Voir tous les experts" />
              </button>
              <button
                onClick={() => navigate(-1)}
                onTouchEnd={(e) => { e.preventDefault(); navigate(-1); }}
                className="inline-flex items-center justify-center px-6 py-3 min-h-[48px] bg-gray-800 text-white rounded-xl hover:bg-gray-700 active:scale-[0.98] transition-colors font-semibold focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-950 touch-manipulation"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <ArrowLeft className="w-5 h-5 mr-2" aria-hidden="true" />
                <FormattedMessage id="providerProfile.goBack" defaultMessage="Retour" />
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const roleLabel = isLawyer
    ? intl.formatMessage({ id: "providerProfile.lawyer" })
    : intl.formatMessage({ id: "providerProfile.expat" });
  
  // SEO Title: Name - Role specialty, languages in Country | Brand
  // Priority: AI SEO > Translation SEO > Template
  const topSpecialty = derivedSpecialties.length > 0 ? derivedSpecialties[0] : '';
  // Full language names (not ISO codes) for SEO, AEO, and JSON-LD
  const languageFullNames = languagesList.map(code => getLanguageName(code, preferredLangKey)).filter(Boolean);
  const spokenLangs = languageFullNames.length > 0 ? languageFullNames.join(', ') : '';
  const countryName = getCountryName(provider.country, preferredLangKey);
  const operatingCountryNames = (provider.operatingCountries || [])
    .slice(0, 3)
    .map(c => getCountryName(c, preferredLangKey))
    .filter(c => c && c !== countryName);

  const seoTitle = (() => {
    if (seoAI?.metaTitle) return seoAI.metaTitle;
    if (translation && !showOriginal && translation.seo?.metaTitle) return translation.seo.metaTitle;
    const brand = ' | SOS Expat';
    const core = `${formatShortName(provider)} — ${roleLabel}${topSpecialty ? ` · ${topSpecialty}` : ''} ${intl.formatMessage({ id: "providerProfile.in" })} ${countryName}`;
    const maxCoreLength = 60 - brand.length;
    if (core.length <= maxCoreLength) return core + brand;
    const truncated = core.slice(0, maxCoreLength);
    const lastSpace = truncated.lastIndexOf(' ');
    return (lastSpace > 20 ? truncated.slice(0, lastSpace) : truncated) + brand;
  })();

  // SEO Description: Priority: AI SEO > Translation SEO > Template
  const seoDescription = (() => {
    if (seoAI?.metaDescription) return seoAI.metaDescription;
    if (translation && !showOriginal && translation.seo?.metaDescription) return translation.seo.metaDescription;
    const raw = [
      `${intl.formatMessage({ id: "providerProfile.consult" })} ${formatPublicName(provider)}, ${roleLabel.toLowerCase()}${topSpecialty ? ` ${topSpecialty}` : ''} ${intl.formatMessage({ id: "providerProfile.in" })} ${countryName}.`,
      spokenLangs ? `${intl.formatMessage({ id: "providerProfile.speaks", defaultMessage: "Langues" })}: ${spokenLangs}.` : '',
      operatingCountryNames.length > 0 ? `${intl.formatMessage({ id: "providerProfile.alsoCovering", defaultMessage: "Intervient aussi en" })}: ${operatingCountryNames.join(', ')}.` : '',
      provider.yearsOfExperience ? `${provider.yearsOfExperience} ${yearsLabel}.` : '',
    ].filter(Boolean).join(' ');
    if (raw.length <= 160) return raw;
    const truncated = raw.slice(0, 160);
    const lastSpace = truncated.lastIndexOf(' ');
    return (lastSpace > 80 ? truncated.slice(0, lastSpace) : truncated) + '…';
  })();

  const canonicalUrl = (() => {
    // BEST: Use multilingual slugs from Firestore (already contain full path with locale)
    const providerSlugs = (provider as any).slugs as Record<string, string> | undefined;
    if (providerSlugs && typeof providerSlugs === 'object') {
      // Use current language slug, fallback to French (canonical default)
      const langSlug = providerSlugs[currentLang || 'fr'] || providerSlugs['fr'];
      if (langSlug) {
        return `https://sos-expat.com/${langSlug}`;
      }
    }

    // FALLBACK: Use current URL path as canonical (preserves full slug including UID)
    // This is safer than constructing a URL that may not match any route
    const CANONICAL_LOCALES: Record<string, string> = {
      fr: 'fr-fr', en: 'en-us', es: 'es-es', de: 'de-de', ru: 'ru-ru',
      pt: 'pt-pt', ch: 'zh-cn', hi: 'hi-in', ar: 'ar-sa',
    };
    const defaultLocale = CANONICAL_LOCALES[currentLang || 'fr'] || 'fr-fr';
    // Use the actual pathname from the URL — it already has the correct full slug
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    if (currentPath) {
      // Replace the current locale in the path with the default locale for canonical consistency
      const { pathWithoutLocale } = parseLocaleFromPath(currentPath);
      return `https://sos-expat.com/${defaultLocale}${pathWithoutLocale}`;
    }
    // Ultimate fallback: build from provider data (no truncation)
    // roleCountry already has "avocat-thailande" format from route params
    const lang = currentLang || 'fr';
    const roleSlug = getTranslatedRouteSlug(isLawyer ? "lawyer" : "expat", lang);
    const countrySlug = provider.country ? getCountrySlug(provider.country, lang) : '';
    const displayType = roleCountry || (countrySlug ? `${roleSlug}-${countrySlug}` : roleSlug);
    const nameSlug = safeNormalize(provider.fullName || `${provider.firstName}-${provider.lastName}`);
    const fullId = (provider as any).shortId || provider.id || provider.uid || '';
    return `https://sos-expat.com/${defaultLocale}/${displayType}/${nameSlug}-${fullId}`;
  })();

  // Pre-compute noindex outside JSX to avoid TS inference issues
  // Only noindex profiles that are completely broken (not approved or not visible)
  const shouldNoindex: boolean = !provider?.isApproved || !provider?.isVisible;

  const OG_LOCALE_MAP: Record<string, string> = {
    fr: 'fr_FR', en: 'en_US', es: 'es_ES', de: 'de_DE', pt: 'pt_PT',
    ru: 'ru_RU', ch: 'zh_CN', hi: 'hi_IN', ar: 'ar_SA',
  };

  return (
    <Layout>
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        canonicalUrl={canonicalUrl}
        ogImage={mainPhoto}
        ogType="profile"
        locale={OG_LOCALE_MAP[currentLang || 'fr'] || 'fr_FR'}
        noindex={shouldNoindex}
        structuredData={
          translation && !showOriginal && translation.seo?.jsonLd
            ? translation.seo.jsonLd
            : structuredData
        }
        aiSummary={seoAI?.aiSummary || intl.formatMessage(
          { id: 'providerProfile.aiSummary', defaultMessage: '{name} is a verified {role} in {country} with {years} years of experience. Available on SOS Expat for phone consultations in {languages}.' },
          { name: provider.firstName, role: roleLabel.toLowerCase(), country: getCountryName(provider.country, preferredLangKey), years: String(provider.yearsOfExperience || 0), languages: languageFullNames.join(', ') }
        )}
        expertise={seoAI?.structuredData?.knowsAbout?.join(', ') || (isLawyer ? 'legal-professional' : 'expat-advisor')}
        trustworthiness={`verified-provider${providerStats.realReviewsCount > 0 ? `, ${providerStats.realReviewsCount}_reviews, ${Number((providerStats.averageRating || 0).toFixed(1))}_rating` : ''}`}
        contentQuality="high"
        lastReviewed={new Date().toISOString().split('T')[0]}
        twitterSite="@sosexpat"
      />

      {/* Hreflang links — use provider.slugs from Firestore for accurate per-language URLs */}
      {(() => {
        const providerSlugs = (provider as any).slugs as Record<string, string> | undefined;
        if (providerSlugs && typeof providerSlugs === 'object') {
          const HREFLANG_CODES: Record<string, string> = {
            fr: 'fr', en: 'en', es: 'es', de: 'de', ru: 'ru',
            pt: 'pt', ch: 'zh-Hans', hi: 'hi', ar: 'ar',
          };
          const entries = Object.entries(providerSlugs)
            .filter(([, slug]) => slug && typeof slug === 'string')
            .map(([lang, slug]) => ({
              hreflang: HREFLANG_CODES[lang] || lang,
              url: `https://sos-expat.com/${slug}`,
            }));
          const frSlug = providerSlugs['fr'];
          return (
            <Helmet>
              {entries.map(({ hreflang, url }) => (
                <link key={hreflang} rel="alternate" hrefLang={hreflang} href={url} />
              ))}
              {frSlug && <link rel="alternate" hrefLang="x-default" href={`https://sos-expat.com/${frSlug}`} />}
            </Helmet>
          );
        }
        // Fallback: generic HreflangLinks (less accurate but better than nothing)
        return <HreflangLinks pathname={location.pathname} />;
      })()}

      {/* Product/Offer schema — shows prices in Google SERPs */}
      <Helmet>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          "name": isLawyer
            ? intl.formatMessage({ id: 'providerProfile.offer.lawyerName', defaultMessage: 'Legal Consultation with {name}' }, { name: provider.firstName })
            : intl.formatMessage({ id: 'providerProfile.offer.expatName', defaultMessage: 'Expat Consultation with {name}' }, { name: provider.firstName }),
          "description": seoDescription,
          "provider": {
            "@type": isLawyer ? "LegalService" : "ProfessionalService",
            "name": provider.firstName,
            "image": mainPhoto || undefined,
          },
          "areaServed": provider.country,
          "offers": {
            "@type": "Offer",
            "price": isLawyer ? "49" : "19",
            "priceCurrency": "EUR",
            "availability": "https://schema.org/OnlineOnly",
            "validFrom": new Date().toISOString().split('T')[0],
            "priceSpecification": {
              "@type": "UnitPriceSpecification",
              "price": isLawyer ? "49" : "19",
              "priceCurrency": "EUR",
              "unitText": isLawyer ? "20 min" : "30 min",
            },
          },
          "url": canonicalUrl,
        })}</script>
      </Helmet>

      {/* ✅ Snippets JSON-LD (includes BreadcrumbList + FAQPage) — dans <head> via Helmet */}
      {/* If AI-generated FAQs exist, use them instead of templated snippetGenerator FAQs */}
      {seoAI?.faqs && seoAI.faqs.length > 0 ? (
        <Helmet>
          <script type="application/ld+json">{JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": seoAI.faqs.map(faq => ({
              "@type": "Question",
              "name": faq.question,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.answer.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim(),
              },
            })),
          })}</script>
          {/* Keep breadcrumb from snippetGenerator even when AI FAQs are used */}
          {snippetData && <script type="application/ld+json">{JSON.stringify(
            JSON.parse(snippetData.jsonLD).find((s: any) => s['@type'] === 'BreadcrumbList') || {}
          )}</script>}
        </Helmet>
      ) : snippetData ? (
        <Helmet>
          <script type="application/ld+json">{snippetData.jsonLD}</script>
        </Helmet>
      ) : null}

      {/* Review Schema JSON-LD — enables Google Rich Snippets with stars on provider profiles */}
      {reviews.length > 0 && (
        <ReviewSchema
          reviews={reviews
            .filter(r => r.comment && r.comment.length > 0)
            .slice(0, 10)
            .map(r => firestoreToReviewItem({
              id: r.id,
              clientName: (r as any).clientName || (r as any).authorName,
              rating: r.rating,
              comment: r.comment,
              createdAt: r.createdAt,
            }))}
          baseUrl={canonicalUrl}
          includeAggregateRating={false}
        />
      )}

      {/* HowTo Schema — "How to consult this provider in 3 steps" */}
      <Helmet>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HowTo",
          "name": intl.formatMessage(
            { id: "providerProfile.howTo.name", defaultMessage: "Comment consulter {name} sur SOS Expat" },
            { name: formatPublicName(provider) }
          ),
          "description": intl.formatMessage(
            { id: "providerProfile.howTo.description", defaultMessage: "Consultez {name}, {role} en {country}, en 3 étapes simples via SOS Expat." },
            { name: formatPublicName(provider), role: roleLabel.toLowerCase(), country: countryName }
          ),
          "totalTime": "PT5M",
          "estimatedCost": {
            "@type": "MonetaryAmount",
            "currency": "EUR",
            "value": isLawyer ? "49" : "19"
          },
          "step": [
            {
              "@type": "HowToStep",
              "position": 1,
              "name": intl.formatMessage({ id: "providerProfile.howTo.step1.name", defaultMessage: "Choisissez votre prestataire" }),
              "text": intl.formatMessage(
                { id: "providerProfile.howTo.step1.text", defaultMessage: "Sélectionnez {name} en fonction de son pays d'intervention, ses langues parlées, ses avis clients et ses spécialités." },
                { name: formatPublicName(provider) }
              ),
              "url": canonicalUrl
            },
            {
              "@type": "HowToStep",
              "position": 2,
              "name": intl.formatMessage(
                { id: "providerProfile.howTo.step2.name", defaultMessage: "Payez la mise en relation ({price})" },
                { price: isLawyer ? "49€" : "19€" }
              ),
              "text": intl.formatMessage(
                { id: "providerProfile.howTo.step2.text", defaultMessage: "Une empreinte bancaire de {price} est effectuée. Le paiement n'est capturé qu'après un appel réussi." },
                { price: isLawyer ? "49€" : "19€" }
              )
            },
            {
              "@type": "HowToStep",
              "position": 3,
              "name": intl.formatMessage({ id: "providerProfile.howTo.step3.name", defaultMessage: "Recevez l'appel en moins de 5 minutes" }),
              "text": intl.formatMessage(
                { id: "providerProfile.howTo.step3.text", defaultMessage: "Vous êtes mis en relation par téléphone avec {name} en moins de 5 minutes. Si l'appel n'aboutit pas, vous êtes remboursé instantanément." },
                { name: formatPublicName(provider) }
              )
            }
          ]
        })}</script>
      </Helmet>

      {/* Speakable Schema — voice search optimization targeting key sections */}
      <Helmet>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": seoTitle,
          "url": canonicalUrl,
          "speakable": {
            "@type": "SpeakableSpecification",
            "cssSelector": [
              "h1",
              "[data-speakable='specialty']",
              "[data-speakable='availability']",
              "[data-speakable='description']"
            ]
          }
        })}</script>
      </Helmet>

      {/* ImageObject JSON-LD — enables Google Images rich results */}
      {profilePhoto && profilePhoto !== '/default-avatar.webp' && (
        <Helmet>
          <script type="application/ld+json">{JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ImageObject",
            "@id": `${canonicalUrl}#primaryImage`,
            "contentUrl": profilePhoto.startsWith('http') ? profilePhoto : `https://sos-expat.com${profilePhoto}`,
            "url": profilePhoto.startsWith('http') ? profilePhoto : `https://sos-expat.com${profilePhoto}`,
            "thumbnailUrl": profilePhoto.startsWith('http') ? profilePhoto : `https://sos-expat.com${profilePhoto}`,
            "description": intl.formatMessage(
              { id: "providerProfile.profilePhotoAlt", defaultMessage: "{name} — {role} {country} — SOS Expat" },
              { name: formatPublicName(provider), role: roleLabel, country: countryName }
            ),
            "name": `${formatPublicName(provider)} — SOS Expat`,
            "width": IMAGE_SIZES.THUMBNAIL_WIDTH,
            "height": IMAGE_SIZES.THUMBNAIL_HEIGHT,
            "encodingFormat": "image/jpeg",
            "representativeOfPage": true,
            "inLanguage": preferredLangKey || 'fr',
            "author": {
              "@type": "Organization",
              "name": "SOS Expat & Travelers",
              "url": "https://sos-expat.com"
            },
            "creator": {
              "@type": "Organization",
              "name": "SOS Expat & Travelers",
              "url": "https://sos-expat.com"
            },
            "license": "https://sos-expat.com/terms",
            "acquireLicensePage": "https://sos-expat.com/terms",
            "creditText": "SOS Expat & Travelers",
            "copyrightNotice": `© ${new Date().getFullYear()} SOS Expat & Travelers. All rights reserved — sos-expat.com`,
            "copyrightHolder": {
              "@type": "Organization",
              "name": "SOS Expat & Travelers",
              "url": "https://sos-expat.com"
            },
            "copyrightYear": new Date().getFullYear(),
          })}</script>
          {/* Preload LCP image — critical for Core Web Vitals */}
          <link
            rel="preload"
            as="image"
            href={profilePhoto.startsWith('http') ? profilePhoto : `https://sos-expat.com${profilePhoto}`}
            // @ts-ignore — fetchpriority is valid HTML but not yet in React typedefs
            fetchpriority="high"
          />
        </Helmet>
      )}

      {/* Standalone Person JSON-LD — AEO: entity recognition by ChatGPT / Perplexity / Gemini */}
      {provider && (
        <Helmet>
          <script type="application/ld+json">{JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Person",
            "@id": `https://sos-expat.com${window.location.pathname}#person`,
            "name": formatPublicName(provider),
            "jobTitle": roleLabel,
            "image": profilePhoto.startsWith('http') ? profilePhoto : `https://sos-expat.com${profilePhoto}`,
            "url": canonicalUrl,
            "worksFor": {
              "@type": "Organization",
              "name": "SOS Expat & Travelers",
              "url": "https://sos-expat.com",
            },
            "knowsLanguage": languagesList.map((code) => ({
              "@type": "Language",
              "name": getLanguageName(code, preferredLangKey) || code,
            })),
            "address": {
              "@type": "PostalAddress",
              "addressCountry": (provider.country || '').toUpperCase(),
            },
            ...(provider.yearsOfExperience ? {
              "hasOccupation": {
                "@type": "Occupation",
                "name": roleLabel,
                "experienceRequirements": `${provider.yearsOfExperience} ${yearsLabel}`,
              }
            } : {}),
          })}</script>
        </Helmet>
      )}

      {/* SVG defs pour dégradé étoiles */}
      <svg width="0" height="0" className="hidden" aria-hidden="true">
        <defs>
          <linearGradient id="half-star" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="50%" stopColor="#FACC15" />
            <stop offset="50%" stopColor="#6B7280" />
          </linearGradient>
        </defs>
      </svg>

      {/* Preconnect optimisés */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://firestore.googleapis.com" />

      <div className="min-h-screen bg-gray-950 pb-24 lg:pb-8" data-provider-loaded={provider ? "true" : undefined}>

        {/* ========================================== */}
        {/* HERO SECTION - DARK DESIGN                */}
        {/* ========================================== */}
        <header className="relative overflow-hidden">
          {/* Background gradients */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-900 to-black pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-transparent to-blue-500/10 pointer-events-none" />
          <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-gradient-to-r from-red-500/15 to-orange-500/15 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-gradient-to-r from-blue-500/15 to-purple-500/15 rounded-full blur-3xl" />

          <div className="relative z-10 max-w-7xl mx-auto px-4 py-6 lg:py-10">
            {/* Navigation */}
            <nav className="mb-6">
              <button
                onClick={() => navigate("/sos-appel")}
                className="inline-flex items-center rounded-full bg-white/10 border border-white/20 text-white/90 hover:text-white hover:bg-white/15 backdrop-blur-sm px-4 py-2 transition-all min-h-[44px] text-sm font-medium"
                aria-label={intl.formatMessage({ id: "providerProfile.backToExperts" })}
              >
                <ArrowLeft size={18} className="mr-2" aria-hidden="true" />
                <FormattedMessage id="providerProfile.backToExperts" />
              </button>
            </nav>

            {/* Breadcrumb visible HTML — cohérent avec BreadcrumbList JSON-LD */}
            <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1.5 text-xs text-white/50">
              <a href="/" className="hover:text-white/80 transition-colors">SOS Expat</a>
              <span aria-hidden="true">/</span>
              <a
                href={`/${currentLocale || 'fr-fr'}/${getTranslatedRouteSlug(isLawyer ? 'lawyers-country' : 'expats-country', currentLang || 'fr')}/${getCountrySlug(provider.country, currentLang || 'fr')}`}
                className="hover:text-white/80 transition-colors"
              >
                {isLawyer
                  ? intl.formatMessage({ id: "providerProfile.lawyers", defaultMessage: "Avocats" })
                  : intl.formatMessage({ id: "providerProfile.expats", defaultMessage: "Expatriés" })}{' '}
                {getCountryName(provider.country, currentLang || 'fr')}
              </a>
              <span aria-hidden="true">/</span>
              <span className="text-white/70" aria-current="page">{formatPublicName(provider)}</span>
            </nav>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              {/* ===== COLONNE GAUCHE: Infos principales ===== */}
              <div className="lg:col-span-2">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                  {/* Photo de profil — figure for Google Images semantic context */}
                  <figure className="relative flex-shrink-0 m-0">
                    <div className="p-[3px] rounded-full bg-gradient-to-br from-red-400 via-orange-400 to-yellow-300">
                      <img
                        src={profilePhoto}
                        alt={intl.formatMessage(
                          { id: "providerProfile.profilePhotoAlt", defaultMessage: "{name} — {role} {country} — SOS Expat" },
                          {
                            name: formatPublicName(provider),
                            role: roleLabel,
                            country: getCountryName(provider.country, preferredLangKey)
                          }
                        )}
                        className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-full object-cover border-4 border-black/30 cursor-pointer hover:scale-105 transition-transform"
                        width={IMAGE_SIZES.AVATAR_MOBILE}
                        height={IMAGE_SIZES.AVATAR_MOBILE}
                        onClick={() => setShowImageModal(true)}
                        onError={handleImageError}
                        loading="eager"
                        decoding="async"
                        fetchPriority="high"
                      />
                    </div>
                    {/* Badge Recommandé */}
                    {provider.isFeatured && (
                      <div className="absolute -top-3 -right-3">
                        <FeaturedBadge isFeatured size="md" />
                      </div>
                    )}
                    {/* Online status indicator - cohérent avec ProfileCards */}
                    <div
                      className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full border-4 border-gray-900 transition-all duration-500 ${
                        isOnCall ? "bg-orange-500" : onlineStatus.isOnline ? "bg-green-500" : "bg-red-500"
                      }`}
                      role="status"
                      aria-label={isOnCall
                        ? intl.formatMessage({ id: "providerProfile.alreadyOnCall" })
                        : onlineStatus.isOnline
                          ? intl.formatMessage({ id: "providerProfile.online" })
                          : intl.formatMessage({ id: "providerProfile.offline" })
                      }
                      title={isOnCall
                        ? intl.formatMessage({ id: "providerProfile.alreadyOnCall" })
                        : onlineStatus.isOnline
                          ? intl.formatMessage({ id: "providerProfile.online" })
                          : intl.formatMessage({ id: "providerProfile.offline" })
                      }
                    >
                      {onlineStatus.isOnline && !isOnCall && (
                        <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75" aria-hidden="true"></span>
                      )}
                    </div>
                    <figcaption className="sr-only">
                      {intl.formatMessage(
                        { id: "providerProfile.profilePhotoAlt", defaultMessage: "{name} — {role} {country} — SOS Expat" },
                        { name: formatPublicName(provider), role: roleLabel, country: countryName }
                      )}
                    </figcaption>
                  </figure>

                  {/* Informations textuelles */}
                  <div className="flex-1 min-w-0">
                    {/* Nom + Badges — H1 visible (unique H1 de la page, SEO-first) */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black leading-tight bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent">
                        {translation && !showOriginal && translation.title
                          ? translation.title
                          : translation && !showOriginal && translation.seo?.h1
                          ? translation.seo.h1
                          : `${formatShortName(provider)} — ${roleLabel}${topSpecialty ? ` · ${topSpecialty}` : ''} ${intl.formatMessage({ id: 'providerProfile.in' })} ${countryName}`}
                      </h1>

                      {/* Badge type */}
                      <span
                        className={`px-3 py-1 rounded-full text-xs sm:text-sm font-semibold border backdrop-blur-sm ${
                          isLawyer
                            ? "bg-blue-500/20 border-blue-400/30 text-blue-200"
                            : "bg-green-500/20 border-green-400/30 text-green-200"
                        }`}
                      >
                        {isLawyer ? (
                          <FormattedMessage id="providerProfile.certifiedLawyer" />
                        ) : (
                          <FormattedMessage id="providerProfile.expertExpat" />
                        )}
                      </span>

                      {/* Badge vérifié */}
                      {provider.isVerified && (
                        <span className="inline-flex items-center gap-1 bg-white text-gray-900 text-xs px-2.5 py-1 rounded-full border border-gray-200 font-medium">
                          <Shield size={14} className="text-green-600" aria-hidden="true" />
                          <FormattedMessage id="providerProfile.verified" />
                        </span>
                      )}

                      {/* Badge nouveau */}
                      {isNewProvider && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 border border-yellow-400/30 rounded-full text-xs font-bold text-yellow-300">
                          <Sparkles size={12} aria-hidden="true" />
                          <FormattedMessage id="providerProfile.new" />
                        </span>
                      )}

                      {/* Badge statut en ligne - cohérent avec ProfileCards */}
                      <span
                        className={`px-3 py-1 rounded-full text-xs sm:text-sm font-bold transition-all duration-500 border ${
                          isOnCall
                            ? "bg-orange-500/20 text-orange-300 border-orange-400/30 shadow-lg shadow-orange-500/20"
                            : onlineStatus.isOnline
                              ? "bg-green-500/20 text-green-300 border-green-400/30 shadow-lg shadow-green-500/20"
                              : "bg-red-500/20 text-red-300 border-red-400/30"
                        }`}
                        role="status"
                        data-speakable="availability"
                        aria-label={isOnCall
                          ? intl.formatMessage({ id: "providerProfile.alreadyOnCall" })
                          : onlineStatus.isOnline
                            ? intl.formatMessage({ id: "providerProfile.online" })
                            : intl.formatMessage({ id: "providerProfile.offline" })}
                      >
                        <span aria-hidden="true">
                          {isOnCall ? "📞 " : onlineStatus.isOnline ? "🟢 " : "🔴 "}
                        </span>
                        {isOnCall
                          ? intl.formatMessage({ id: "providerProfile.alreadyOnCall" })
                          : onlineStatus.isOnline
                            ? intl.formatMessage({ id: "providerProfile.online" })
                            : intl.formatMessage({ id: "providerProfile.offline" })}
                      </span>
                    </div>

                    {/* Localisation et expérience */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-gray-300 mb-4 text-sm">
                      <div className="inline-flex items-center gap-1.5">
                        <MapPin size={16} className="text-red-400 flex-shrink-0" aria-hidden="true" />
                        <span>{getCountryName(provider.country, preferredLangKey)}</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5">
                        {isLawyer ? (
                          <Briefcase size={16} className="text-blue-400 flex-shrink-0" aria-hidden="true" />
                        ) : (
                          <Users size={16} className="text-green-400 flex-shrink-0" aria-hidden="true" />
                        )}
                        <span>
                          {isLawyer
                            ? `${provider.yearsOfExperience || 0} ${intl.formatMessage({ id: "providerProfile.yearsExperience" })}`
                            : `${provider.yearsAsExpat || provider.yearsOfExperience || 0} ${intl.formatMessage({ id: "providerProfile.yearsAsExpat" })}`}
                        </span>
                      </div>
                    </div>

                    {/* Rating — cliquable vers section avis */}
                    {!isNewProvider && (
                      <a
                        href="#reviews"
                        onClick={(e) => {
                          e.preventDefault();
                          document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="inline-flex items-center gap-2 mb-4 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm px-3 py-1.5 hover:bg-white/20 transition-colors cursor-pointer"
                        aria-label={intl.formatMessage({ id: "providerProfile.seeReviews", defaultMessage: "Voir les avis clients" })}
                      >
                        <div className="flex" aria-label={`Rating: ${providerStats.averageRating || 0} out of 5 stars`}>
                          {renderStars(providerStats.averageRating || provider.rating)}
                        </div>
                        <span className="text-white font-semibold">
                          {providerStats.averageRating
                            ? providerStats.averageRating.toFixed(1)
                            : (typeof provider.rating === "number" ? provider.rating.toFixed(1) : "--")}
                        </span>
                        <span className="text-gray-400">
                          ({providerStats.realReviewsCount || provider?.reviewCount || 0} <FormattedMessage id="providerProfile.reviews" />)
                        </span>
                      </a>
                    )}

                    {/* Description courte */}
                    <p className="text-gray-200 leading-relaxed text-sm sm:text-base line-clamp-3 lg:line-clamp-4" data-speakable="description">
                      {descriptionText}
                    </p>

                    {/* CTA mobile dans le hero — pleine largeur, toujours visible — ref pour IntersectionObserver */}
                    <div ref={heroCTARef} className="mt-5 lg:hidden" data-speakable="availability">
                      <button
                        onClick={handleBookCall}
                        disabled={!authInitialized || !hasValidPhone}
                        className={`w-full py-4 px-6 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 min-h-[56px] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 touch-manipulation ${
                          onlineStatus.isOnline && !isOnCall && authInitialized && hasValidPhone
                            ? "bg-gradient-to-r from-green-600 to-green-500 text-white shadow-lg shadow-green-500/40 hover:from-green-500 hover:to-green-400 active:scale-[0.98] focus:ring-green-500"
                            : isOnCall
                            ? "bg-amber-500/80 text-white border border-amber-400 focus:ring-amber-500"
                            : "bg-white/10 text-white border border-white/30 backdrop-blur-sm focus:ring-white/30"
                        }`}
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                        aria-label={
                          !authInitialized
                            ? intl.formatMessage({ id: "providerProfile.loading", defaultMessage: "Chargement..." })
                            : isOnCall
                              ? intl.formatMessage({ id: "providerProfile.alreadyOnCall" })
                              : onlineStatus.isOnline
                                ? intl.formatMessage({ id: "providerProfile.bookNow" })
                                : intl.formatMessage({ id: "providerProfile.callButton", defaultMessage: "Appeler maintenant" })
                        }
                      >
                        {!authInitialized ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/40 border-t-transparent" aria-hidden="true" />
                            <span><FormattedMessage id="providerProfile.loading" defaultMessage="Chargement..." /></span>
                          </>
                        ) : (
                          <>
                            <Phone size={22} aria-hidden="true" />
                            <span>
                              {isOnCall
                                ? intl.formatMessage({ id: "providerProfile.alreadyOnCall" })
                                : onlineStatus.isOnline
                                  ? intl.formatMessage({ id: "providerProfile.bookNow" })
                                  : intl.formatMessage({ id: "providerProfile.callButton", defaultMessage: "Appeler maintenant" })}
                            </span>
                            {onlineStatus.isOnline && !isOnCall && authInitialized && hasValidPhone && (
                              <span className="flex gap-1" aria-hidden="true">
                                <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-white/80" />
                                <span className="w-1.5 h-1.5 rounded-full animate-pulse delay-75 bg-white/80" />
                                <span className="w-1.5 h-1.5 rounded-full animate-pulse delay-150 bg-white/80" />
                              </span>
                            )}
                          </>
                        )}
                      </button>
                      {/* Prix sous le CTA mobile */}
                      <p className="mt-2 text-center text-sm text-white/60">
                        {bookingPrice ? formatEUR(bookingPrice.eur) : "—"}
                        {bookingPrice?.duration ? ` / ${bookingPrice.duration} ${minutesLabel}` : ""}
                        {isOnCall && (
                          <span className="ml-2 text-amber-300 font-medium">
                            · <FormattedMessage id="providerProfile.onCallMessage" />
                          </span>
                        )}
                        {!onlineStatus.isOnline && !isOnCall && (
                          <span className="ml-2 text-white/40">
                            · <FormattedMessage id="providerProfile.offline" />
                          </span>
                        )}
                      </p>

                      {/* Prestataires alternatifs sous le CTA quand offline — mobile uniquement */}
                      {!onlineStatus.isOnline && !isOnCall && relatedProviders.filter(rp => rp.isOnline).length > 0 && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                          <p className="text-xs text-white/60 mb-3 font-medium uppercase tracking-wide">
                            <FormattedMessage id="providerProfile.availableNow" defaultMessage="Disponibles maintenant" />
                          </p>
                          <div className="space-y-2">
                            {relatedProviders.filter(rp => rp.isOnline).slice(0, 3).map(rp => {
                              const rpSlugs = (rp as any).slugs as Record<string, string> | undefined;
                              const rpSlug = rpSlugs?.[currentLang || 'fr'] || rpSlugs?.['fr'];
                              if (!rpSlug) return null;
                              const rpPhoto = rp.profilePhoto || rp.photoURL || rp.avatar || '/default-avatar.webp';
                              const rpName = rp.firstName ? `${rp.firstName} ${(rp.lastName || '').charAt(0)}.` : 'Expert';
                              return (
                                <a
                                  key={rp.id}
                                  href={`/${rpSlug}`}
                                  className="flex items-center gap-3 bg-white/10 rounded-xl px-3 py-2.5 hover:bg-white/15 transition-colors"
                                >
                                  <div className="relative flex-shrink-0">
                                    <img
                                      src={rpPhoto}
                                      alt={rpName}
                                      className="w-9 h-9 rounded-full object-cover ring-2 ring-green-400/50"
                                      loading="lazy"
                                      decoding="async"
                                      width={36}
                                      height={36}
                                      onError={(e) => { (e.target as HTMLImageElement).src = '/default-avatar.webp'; }}
                                    />
                                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900" aria-hidden="true" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-white text-sm font-medium truncate">{rpName}</p>
                                    {typeof rp.rating === 'number' && rp.rating > 0 && (
                                      <p className="text-amber-400 text-xs">★ {rp.rating.toFixed(1)}</p>
                                    )}
                                  </div>
                                  <span className="text-xs text-green-400 font-semibold flex-shrink-0">
                                    <FormattedMessage id="providerProfile.bookNow" defaultMessage="Appeler" />
                                  </span>
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Social sharing - Nouveau composant 2025 */}
                    <div className="mt-5">
                      <ProviderSocialShare
                        provider={{
                          id: provider.id || '',
                          firstName: provider.firstName || '',
                          lastName: provider.lastName,
                          fullName: formatPublicName(provider),
                          type: provider.type as 'lawyer' | 'expat',
                          country: provider.country || '',
                          specialties: provider.type === 'lawyer'
                            ? (provider.specialties || [])
                            : (provider.helpTypes || provider.specialties || []),
                          rating: providerStats.averageRating || provider.rating,
                        }}
                        shareUrl={window.location.href}
                        onShare={(platform, success) => {
                          logAnalyticsEvent({
                            eventType: 'share_provider_profile',
                            eventData: {
                              provider_id: provider.id,
                              provider_type: provider.type,
                              platform,
                              success,
                            },
                          });
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ===== COLONNE DROITE: Booking card ===== */}
              <aside className="lg:col-span-1">
                <div className="group relative bg-white rounded-3xl shadow-2xl p-5 sm:p-6 border border-gray-200 transition-all hover:scale-[1.01] hover:shadow-red-500/10">
                  {/* Overlay gradient */}
                  <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-red-500/5 to-orange-500/5 group-hover:from-red-500/10 group-hover:to-orange-500/10 transition-opacity" />
                  
                  <div className="relative z-10">
                    {/* Badge délai d'appel */}
                    <div className="text-center mb-5">
                      <div className="inline-flex items-center gap-2 bg-gray-900 text-white rounded-full px-3 py-1.5 text-xs font-semibold">
                        <Phone size={14} aria-hidden="true" />
                        <span><FormattedMessage id="callIn5Min" /></span>
                      </div>

                      {/* Prix */}
                      <div className="mt-4">
                        {bookingPrice?.hasDiscount ? (
                          <>
                            <div className="text-gray-400 line-through text-lg">
                              {formatEUR(bookingPrice.originalEur)}
                            </div>
                            <div className="text-3xl sm:text-4xl font-black text-red-600">
                              {formatEUR(bookingPrice.eur)}
                            </div>
                            {bookingPrice.promoCode && (
                              <div className="text-xs text-green-600 font-semibold mt-1">
                                Code {bookingPrice.promoCode} (-{formatEUR(bookingPrice.discountEur)})
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-3xl sm:text-4xl font-black text-gray-900">
                            {bookingPrice ? formatEUR(bookingPrice.eur) : "—"}
                          </div>
                        )}
                        <div className="text-gray-500 text-sm mt-1">
                          {bookingPrice ? `(${formatUSD(bookingPrice.usd)})` : ""}
                        </div>
                      </div>

                      <div className="text-gray-600 text-sm mt-1 flex items-center justify-center gap-1">
                        <Clock size={14} aria-hidden="true" />
                        {bookingPrice?.duration
                          ? `${bookingPrice.duration} ${intl.formatMessage({ id: "providerProfile.minutes" })}`
                          : "—"}
                      </div>
                    </div>

                    {/* Stats rapides */}
                    <div className="space-y-3 mb-5">
                      <div className="flex items-center justify-between text-sm bg-gray-50 p-3 rounded-xl border border-gray-200">
                        <span className="text-gray-700 font-medium">
                          <FormattedMessage id="providerProfile.availability" />
                        </span>
                        <span
                          className={`font-bold text-xs px-2.5 py-1 rounded-full transition-all ${
                            isOnCall
                              ? "bg-orange-100 text-orange-800 border border-orange-300"
                              : onlineStatus.isOnline
                                ? "bg-green-100 text-green-800 border border-green-300"
                                : "bg-red-100 text-red-800 border border-red-300"
                          }`}
                        >
                          {isOnCall
                            ? `📞 ${intl.formatMessage({ id: "providerProfile.alreadyOnCall" })}`
                            : onlineStatus.isOnline
                              ? `🟢 ${intl.formatMessage({ id: "providerProfile.online" })}`
                              : `🔴 ${intl.formatMessage({ id: "providerProfile.offline" })}`}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          <FormattedMessage id="providerProfile.completedCalls" />
                        </span>
                        <span className="font-semibold">
                          {isLoadingStats ? "..." : (providerStats.completedCalls || provider?.totalCalls || 0)}
                        </span>
                      </div>
                    </div>

                    {/* CTA Button - Desktop only (mobile has fixed bottom) */}
                    <button
                      onClick={handleBookCall}
                      disabled={!onlineStatus.isOnline || isOnCall || !authInitialized || !hasValidPhone}
                      className={`hidden lg:flex w-full py-4 px-4 rounded-2xl font-bold text-lg transition-all duration-300 items-center justify-center gap-3 min-h-[56px] focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        onlineStatus.isOnline && !isOnCall && authInitialized && hasValidPhone
                          ? "bg-gradient-to-r from-green-600 to-green-500 text-white hover:from-green-500 hover:to-green-400 hover:scale-[1.02] shadow-lg shadow-green-500/30 focus:ring-green-500"
                          : "bg-gray-200 text-gray-500 cursor-not-allowed"
                      }`}
                      aria-label={
                        !authInitialized
                          ? intl.formatMessage({ id: "providerProfile.loading", defaultMessage: "Chargement..." })
                          : isOnCall
                            ? intl.formatMessage({ id: "providerProfile.alreadyOnCall" })
                            : onlineStatus.isOnline
                              ? intl.formatMessage({ id: "providerProfile.bookNow" })
                              : intl.formatMessage({ id: "providerProfile.unavailable" })
                      }
                    >
                      {!authInitialized ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-400 border-t-transparent" />
                          <span><FormattedMessage id="providerProfile.loading" defaultMessage="Chargement..." /></span>
                        </>
                      ) : (
                        <>
                          <Phone size={22} aria-hidden="true" />
                          <span>
                            {isOnCall
                              ? intl.formatMessage({ id: "providerProfile.alreadyOnCall" })
                              : onlineStatus.isOnline
                                ? intl.formatMessage({ id: "providerProfile.bookNow" })
                                : intl.formatMessage({ id: "providerProfile.unavailable" })}
                          </span>
                        </>
                      )}
                      {onlineStatus.isOnline && !isOnCall && authInitialized && hasValidPhone && (
                        <div className="flex gap-1" aria-hidden="true">
                          <div className="w-2 h-2 rounded-full animate-pulse bg-white/80"></div>
                          <div className="w-2 h-2 rounded-full animate-pulse delay-75 bg-white/80"></div>
                          <div className="w-2 h-2 rounded-full animate-pulse delay-150 bg-white/80"></div>
                        </div>
                      )}
                    </button>

                    {/* Message de statut */}
                    <div className="mt-3 text-center text-sm hidden lg:block">
                      {isOnCall ? (
                        <div className="text-orange-600 font-medium">
                          📞 <FormattedMessage id="providerProfile.onCallMessage" />
                        </div>
                      ) : onlineStatus.isOnline ? (
                        <div className="text-green-600 font-medium">
                          ✅ <FormattedMessage id="providerProfile.availableNow" />
                        </div>
                      ) : (
                        <div className="text-red-600">
                          ❌ <FormattedMessage id="providerProfile.currentlyOffline" />
                        </div>
                      )}
                    </div>

                    {/* Badge sécurité */}
                    <div className="mt-4 text-center">
                      <div className="inline-flex items-center justify-center gap-2 text-xs text-gray-600 rounded-full border border-gray-200 px-3 py-1.5">
                        <Shield size={14} aria-hidden="true" />
                        <FormattedMessage id="providerProfile.securePayment" />
                      </div>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </header>

        {/* ========================================== */}
        {/* STATS SHOWCASE — Grille chiffres clés    */}
        {/* ========================================== */}
        <div className="relative z-10 bg-black/40 backdrop-blur-sm border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4" role="list" aria-label="Statistiques du prestataire">
              {/* Note */}
              <div className="flex flex-col items-center justify-center bg-white/5 rounded-2xl p-4 border border-white/10 text-center" role="listitem">
                <div className="flex items-center gap-1 mb-1">
                  <Star size={16} className="text-amber-400 fill-amber-400" aria-hidden="true" />
                  <span className="text-3xl font-black text-white">
                    {providerStats.averageRating ? providerStats.averageRating.toFixed(1) : (provider.rating ? (provider.rating as number).toFixed(1) : "—")}
                  </span>
                </div>
                <span className="text-xs text-white/50 uppercase tracking-wide"><FormattedMessage id="providerProfile.averageRating" defaultMessage="Note" /></span>
              </div>
              {/* Avis */}
              <div className="flex flex-col items-center justify-center bg-white/5 rounded-2xl p-4 border border-white/10 text-center" role="listitem">
                <span className="text-3xl font-black text-white mb-1">{providerStats.realReviewsCount || provider.reviewCount || 0}</span>
                <span className="text-xs text-white/50 uppercase tracking-wide"><FormattedMessage id="providerProfile.reviews" defaultMessage="Avis" /></span>
              </div>
              {/* Expérience */}
              <div className="flex flex-col items-center justify-center bg-white/5 rounded-2xl p-4 border border-white/10 text-center" role="listitem">
                <span className="text-3xl font-black text-white mb-1">
                  {isLawyer ? (provider.yearsOfExperience || 0) : (provider.yearsAsExpat || provider.yearsOfExperience || 0)}
                </span>
                <span className="text-xs text-white/50 uppercase tracking-wide">{yearsLabel}</span>
              </div>
              {/* Appels */}
              <div className="flex flex-col items-center justify-center bg-white/5 rounded-2xl p-4 border border-white/10 text-center" role="listitem">
                <span className="text-3xl font-black text-white mb-1">
                  {(providerStats.completedCalls || provider.totalCalls || 0) > 0
                    ? `${providerStats.completedCalls || provider.totalCalls || 0}+`
                    : `${providerStats.successRate || provider.successRate || 0}%`}
                </span>
                <span className="text-xs text-white/50 uppercase tracking-wide">
                  {(providerStats.completedCalls || provider.totalCalls || 0) > 0
                    ? <FormattedMessage id="providerProfile.completedCalls" defaultMessage="Appels" />
                    : <FormattedMessage id="providerProfile.successRate" defaultMessage="Réussite" />}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================== */}
        {/* MAIN CONTENT - WHITE/LIGHT SECTION        */}
        {/* ========================================== */}
        <main className="relative bg-white rounded-t-3xl -mt-2">
          <div className="max-w-7xl mx-auto px-4 pt-8 pb-12 lg:pt-10 lg:pb-16">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">

              {/* ===== COLONNE PRINCIPALE ===== */}
              <div className="lg:col-span-2 space-y-0">
                
                {/* Translation Banner */}
                {realProviderId && !isLoading && (
                  <TranslationBanner
                    providerId={realProviderId}
                    currentLanguage={targetLanguage}
                    availableLanguages={availableLanguages}
                    onTranslationComplete={async (lang, trans) => {
                      // Switch to viewing the translated language
                      setViewingLanguage(lang);
                      viewingLanguageRef.current = lang; // Update ref immediately
                      setShowOriginal(false); // Switch to translated view after translation completes
                      
                      // Reload translation state for the language we just translated
                      if (reloadForLanguage) {
                        setTimeout(async () => {
                          try {
                            await reloadForLanguage(lang);
                            // Force state to remain after reload - prevent reverting to original
                            // Use ref to ensure we maintain the correct language
                            const currentLang = viewingLanguageRef.current || lang;
                            setViewingLanguage(currentLang);
                            viewingLanguageRef.current = currentLang;
                            setShowOriginal(false);
                          } catch (error) {
                            console.error('[ProviderProfile] Error reloading translation:', error);
                            // Even on error, maintain the viewing state
                            setViewingLanguage(lang);
                            viewingLanguageRef.current = lang;
                            setShowOriginal(false);
                          }
                        }, 1000); // Wait for Firestore to update
                      }
                    }}
                    onViewTranslation={(lang) => {
                      // Handle viewing an already-translated language
                      setViewingLanguage(lang);
                      viewingLanguageRef.current = lang; // Update ref immediately
                      setShowOriginal(false);
                      
                      if (reloadForLanguage) {
                        reloadForLanguage(lang).then(() => {
                          // Force state to remain after reload - prevent reverting to original
                          // Use ref to ensure we maintain the correct language
                          const currentLang = viewingLanguageRef.current || lang;
                          setViewingLanguage(currentLang);
                          viewingLanguageRef.current = currentLang;
                          setShowOriginal(false);
                        }).catch((error) => {
                          console.error('[ProviderProfile] Error reloading translation:', error);
                          // Even on error, maintain the viewing state
                          setViewingLanguage(lang);
                          viewingLanguageRef.current = lang;
                          setShowOriginal(false);
                        });
                      }
                    }}
                    onTranslate={async (lang) => {
                      const result = await translate(lang);  // Pass the language parameter
                      return result;
                    }}
                  />
                )}
                
                {/* View Original Button - Show if translation exists */}
                {translation && originalTranslation && (
                  <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-4 border border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => {
                        setShowOriginal(!showOriginal);
                        // If switching to original, reset viewing language
                        if (!showOriginal) {
                          setViewingLanguage(null);
                        }
                      }}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md text-sm font-medium transition-colors flex items-center gap-2 border-2 border-gray-300 text-gray-500"
                    >
                      {showOriginal ? (
                        <>
                          <FormattedMessage
                            id="providerTranslation.viewTranslated"
                            defaultMessage={`View translated `}
                          />
                        </>
                      ) : (
                        <>
                          <FormattedMessage
                            id="providerTranslation.viewOriginal"
                            defaultMessage={`View original`}
                          />
                        </>
                      )}
                    </button>
                  </div>
                )}
                
                {/* Section Description complète */}
                <section className="bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 rounded-3xl p-6 sm:p-8 mb-6" aria-labelledby="about-heading" data-speakable="description">
                  <h2 id="about-heading" className="text-2xl sm:text-3xl font-black text-gray-900 mb-5 flex items-center gap-3">
                    <span className="w-1 h-8 bg-gradient-to-b from-red-500 to-orange-400 rounded-full flex-shrink-0" aria-hidden="true" />
                    <FormattedMessage id="providerProfile.about" values={{ name: provider.firstName }} defaultMessage={`À propos de ${provider.firstName}`} />
                  </h2>
                  {/* AEO: Paragraph synthétique pour LLM indexing (ChatGPT, Perplexity, Google SGE) */}
                  {(() => {
                    const aeoCountries = [countryName, ...operatingCountryNames].filter(Boolean);
                    const aeoLangs = languagesList.slice(0, 3).map(code => getLanguageName(code, preferredLangKey));
                    const aeoSpecialties = derivedSpecialties.slice(0, 2);
                    return (
                      <p className="text-sm text-orange-700/70 italic mb-5 leading-relaxed bg-white/60 rounded-xl px-4 py-3 border border-orange-200/50" aria-label="Résumé automatique">
                        {formatShortName(provider)} {intl.formatMessage({ id: 'providerProfile.is', defaultMessage: 'est' })} {roleLabel.toLowerCase()}
                        {aeoSpecialties.length > 0 && <> {intl.formatMessage({ id: 'providerProfile.specializedIn', defaultMessage: 'spécialisé·e en' })} {aeoSpecialties.join(', ')}</>}
                        {aeoCountries.length > 0 && <>, {intl.formatMessage({ id: 'providerProfile.basedIn', defaultMessage: 'basé·e en' })} {aeoCountries.join(', ')}</>}.
                        {aeoLangs.length > 0 && <> {intl.formatMessage({ id: 'providerProfile.availableIn', defaultMessage: 'Disponible en' })} {aeoLangs.join(', ')} {intl.formatMessage({ id: 'providerProfile.viaSosExpat', defaultMessage: 'via SOS Expat' })}.</>}
                      </p>
                    );
                  })()}
                  {(() => {
                    const PREVIEW_LENGTH = 300;
                    const isLong = descriptionText.length > PREVIEW_LENGTH;
                    const displayed = isLong && !isDescriptionExpanded
                      ? descriptionText.slice(0, PREVIEW_LENGTH).trimEnd() + '…'
                      : descriptionText;
                    return (
                      <>
                        <p className="text-gray-800 leading-relaxed text-base sm:text-lg whitespace-pre-line">
                          {displayed}
                        </p>
                        {isLong && (
                          <button
                            onClick={() => setIsDescriptionExpanded(v => !v)}
                            className="mt-3 text-sm font-semibold text-red-600 hover:text-red-500 transition-colors flex items-center gap-1"
                            aria-expanded={isDescriptionExpanded}
                          >
                            {isDescriptionExpanded
                              ? <FormattedMessage id="providerProfile.seeLess" defaultMessage="Voir moins" />
                              : <FormattedMessage id="providerProfile.seeMore" defaultMessage="Voir plus" />}
                            <span className={`transition-transform ${isDescriptionExpanded ? 'rotate-180' : ''}`} aria-hidden="true">▾</span>
                          </button>
                        )}
                      </>
                    );
                  })()}
                  
                  {/* Motivation si présente */}
                  {(() => {
                    // ALWAYS show original from sos_profiles when showOriginal is true
                    let motivationText: string | null | undefined = null;
                    if (showOriginal) {
                      motivationText = getFirstString(provider.motivation, preferredLangKey);
                    } else if (translation && viewingLanguage) {
                      // Only use translation if user explicitly selected a language
                      // Check both 'summary' (what Dashboard saves) and 'motivation' (what backend generates)
                      const trans = translation as any;
                      if (trans.summary) {
                        motivationText = typeof trans.summary === 'string' ? trans.summary : String(trans.summary);
                      } else if (trans.motivation) {
                        motivationText = typeof trans.motivation === 'string' ? trans.motivation : String(trans.motivation);
                      }
                    } else {
                      // Fallback to original
                      motivationText = getFirstString(provider.motivation, preferredLangKey);
                    }
                    return motivationText && (
                      <div className="mt-5 pt-5 border-t border-orange-200/50">
                        <p className="text-gray-700 whitespace-pre-line italic text-base leading-relaxed border-l-4 border-orange-400 pl-4">
                          {motivationText}
                        </p>
                      </div>
                    );
                  })()}
                </section>

                {/* Section Spécialités */}
                <section className="py-6 mb-6 border-b border-gray-100" aria-labelledby="specialties-heading" data-speakable="specialty">
                  <h3 id="specialties-heading" className="text-xl sm:text-2xl font-black text-gray-900 mb-5 flex items-center gap-3">
                    <span className={`w-1 h-7 rounded-full flex-shrink-0 ${isLawyer ? 'bg-blue-500' : 'bg-green-500'}`} aria-hidden="true" />
                    <FormattedMessage id="providerProfile.specialties" defaultMessage="Domaines d'expertise" />
                  </h3>
                  {derivedSpecialties.length > 0 ? (
                    <div className="flex flex-wrap gap-2.5">
                      {derivedSpecialties.map((s, i) => (
                        <span
                          key={`${s}-${i}`}
                          className={`px-4 py-2 rounded-xl text-sm font-semibold shadow-sm ${
                            isLawyer
                              ? "bg-blue-600 text-white"
                              : "bg-green-600 text-white"
                          } ${i === 0 ? 'text-base px-5 py-2.5' : ''}`}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">
                      <FormattedMessage id="providerProfile.noSpecialties" />
                    </p>
                  )}
                </section>

                {/* Section Pays + Langues — bloc combiné sombre */}
                {((provider.operatingCountries && provider.operatingCountries.length > 0) || languageCodes.length > 0) && (
                  <section className="bg-gray-900 rounded-3xl p-6 sm:p-8 mb-6" aria-label="Zones et langues">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {/* Pays couverts */}
                      {provider.operatingCountries && provider.operatingCountries.length > 0 && (
                        <div aria-labelledby="countries-heading">
                          <h3 id="countries-heading" className="text-sm font-bold text-white/50 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <MapPin size={14} aria-hidden="true" />
                            <FormattedMessage id="providerProfile.operatingCountries" defaultMessage="Pays couverts" />
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {provider.operatingCountries.map((countryCode, index) => {
                              const roleSlug = getTranslatedRouteSlug(isLawyer ? 'lawyer' : 'expat', currentLang || 'fr');
                              const cSlug = getCountrySlug(countryCode, currentLang || 'fr');
                              const listingUrl = `/${currentLocale || 'fr-fr'}/${roleSlug}-${cSlug}`;
                              return (
                                <a
                                  key={`${countryCode}-${index}`}
                                  href={listingUrl}
                                  className="px-3 py-1.5 bg-white/10 text-white border border-white/20 rounded-full text-sm font-medium hover:bg-white/20 transition-colors"
                                >
                                  {getCountryName(countryCode, preferredLangKey)}
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {/* Langues */}
                      {languageCodes.length > 0 && (
                        <div aria-labelledby="languages-heading">
                          <h3 id="languages-heading" className="text-sm font-bold text-white/50 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Globe size={14} aria-hidden="true" />
                            <FormattedMessage id="providerProfile.languages" defaultMessage="Langues" />
                          </h3>
                          <div className="flex flex-wrap gap-2" role="list" aria-label="Languages spoken">
                            {languageCodes.map((code, i) => (
                              <span
                                key={`${code}-${i}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/30 text-purple-200 border border-purple-400/30 rounded-full text-sm font-semibold"
                                role="listitem"
                              >
                                <LanguagesIcon size={13} aria-hidden="true" />
                                {formatLanguages([code], preferredLangKey)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* Section Formation (avocats uniquement) */}
                {isLawyer && (educationText || certificationsArray.length > 0) && (
                  <section className="py-6 mb-6 border-b border-gray-100" aria-labelledby="education-heading">
                    <h2 id="education-heading" className="text-xl sm:text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
                      <span className="w-1 h-7 bg-indigo-500 rounded-full flex-shrink-0" aria-hidden="true" />
                      <FormattedMessage id="providerProfile.educationCertifications" defaultMessage="Formation & Parcours" />
                    </h2>
                    <div className="relative pl-6 border-l-2 border-indigo-100 space-y-6">
                      {educationText && (
                        <div className="relative">
                          <div className="absolute -left-10 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shadow-md ring-4 ring-white">
                            <GraduationCap size={16} className="text-white" aria-hidden="true" />
                          </div>
                          <p className="text-gray-900 font-semibold text-base">{educationText}</p>
                          {provider.graduationYear && (
                            <p className="text-gray-500 text-sm mt-1">
                              <FormattedMessage id="providerProfile.graduated" /> {provider.graduationYear}
                            </p>
                          )}
                        </div>
                      )}
                      {certificationsArray.map((cert, i) => (
                        <div key={i} className="relative">
                          <div className="absolute -left-10 w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center shadow-md ring-4 ring-white">
                            <Award size={16} className="text-white" aria-hidden="true" />
                          </div>
                          <p className="text-gray-800 font-medium">{cert}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Section Expérience expatrié */}
                {isExpat && (
                  <section className="py-6 mb-6 border-b border-gray-100" aria-labelledby="experience-heading">
                    <h3 id="experience-heading" className="text-xl sm:text-2xl font-black text-gray-900 mb-5 flex items-center gap-3">
                      <span className="w-1 h-7 bg-green-500 rounded-full flex-shrink-0" aria-hidden="true" />
                      <FormattedMessage id="providerProfile.expatExperience" />
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <MapPin size={18} className="text-green-600" aria-hidden="true" />
                        </div>
                        <p className="text-gray-700">
                          {provider.yearsAsExpat || provider.yearsOfExperience || 0}{" "}
                          {intl.formatMessage({ id: "providerProfile.yearsAbroad" })}{" "}
                          {intl.formatMessage({ id: "providerProfile.in" })}{" "}
                          {getCountryName(provider.country, preferredLangKey)}
                        </p>
                      </div>
                      
                      {getFirstString(provider.experienceDescription, preferredLangKey) && (
                        <p className="text-gray-600 pl-14">
                          {getFirstString(provider.experienceDescription, preferredLangKey)}
                        </p>
                      )}

                      {(() => {
                        // ALWAYS show original from sos_profiles when showOriginal is true
                        let motivationText: string | null | undefined = null;
                        if (showOriginal) {
                          motivationText = getFirstString(provider.motivation, preferredLangKey);
                        } else if (translation && viewingLanguage) {
                          // Only use translation if user explicitly selected a language
                          // Check both 'summary' (what Dashboard saves) and 'motivation' (what backend generates)
                          const trans = translation as any;
                          if (trans.summary) {
                            motivationText = typeof trans.summary === 'string' ? trans.summary : String(trans.summary);
                          } else if (trans.motivation) {
                            motivationText = typeof trans.motivation === 'string' ? trans.motivation : String(trans.motivation);
                          }
                        } else {
                          // Fallback to original
                          motivationText = getFirstString(provider.motivation, preferredLangKey);
                        }
                        return motivationText && (
                          <p className="text-gray-700 whitespace-pre-line">
                            {motivationText}
                          </p>
                        );
                      })()}
                    </div>
                  </section>
                )}

                {/* Section Avis clients — id="reviews" pour lien depuis le hero */}
                <section className="py-6 mb-6" id="reviews" aria-labelledby="reviews-heading">
                  <div className="flex items-start justify-between mb-6 gap-4">
                    <h2 id="reviews-heading" className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-3">
                      <span className="w-1 h-7 bg-yellow-500 rounded-full flex-shrink-0" aria-hidden="true" />
                      <span>
                        <FormattedMessage id="providerProfile.customerReviews" defaultMessage="Avis clients" />
                        {(providerStats.realReviewsCount || provider?.reviewCount || 0) > 0 && (
                          <span className="block text-sm font-normal text-gray-500 mt-0.5">
                            {providerStats.realReviewsCount || provider?.reviewCount || 0} <FormattedMessage id="providerProfile.verifiedReviews" defaultMessage="avis vérifiés" />
                          </span>
                        )}
                      </span>
                    </h2>
                    {!isNewProvider && (providerStats.averageRating || provider?.rating) && (
                      <div className="flex-shrink-0 flex flex-col items-center bg-gradient-to-br from-yellow-400 to-orange-400 rounded-2xl px-4 py-2 shadow-md">
                        <span className="text-2xl font-black text-white leading-none">
                          {providerStats.averageRating ? providerStats.averageRating.toFixed(1) : "—"}
                        </span>
                        <div className="flex mt-0.5" aria-hidden="true">
                          {[1,2,3,4,5].map(i => (
                            <Star key={i} size={10} className={`fill-white ${i <= Math.round(providerStats.averageRating || 0) ? 'text-white' : 'text-white/40'}`} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Citation mise en vedette — 1er avis 5 étoiles */}
                  {!isNewProvider && reviews && reviews.length > 0 && (() => {
                    const featured = reviews.find(r => r.rating >= 4) || reviews[0];
                    if (!featured?.comment) return null;
                    return (
                      <blockquote className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-3xl p-6 mb-6 border border-yellow-200/60">
                        <div className="text-4xl text-yellow-400 font-serif leading-none mb-3" aria-hidden="true">"</div>
                        <p className="text-gray-800 text-base sm:text-lg leading-relaxed font-medium italic">
                          {featured.comment.length > 200 ? featured.comment.slice(0, 200) + '…' : featured.comment}
                        </p>
                        <footer className="mt-4 flex items-center gap-3">
                          <div className="flex">
                            {[1,2,3,4,5].map(i => (
                              <Star key={i} size={14} className={`${i <= featured.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
                            ))}
                          </div>
                          <span className="text-sm text-gray-600 font-semibold">
                            {featured.clientName || featured.authorName || intl.formatMessage({ id: 'providerProfile.verifiedClient', defaultMessage: 'Client vérifié' })}
                          </span>
                        </footer>
                      </blockquote>
                    );
                  })()}

                  {isLoadingReviews ? (
                    <div className="text-center py-8" role="status" aria-live="polite">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto" aria-hidden="true" />
                      <p className="mt-2 text-gray-600 text-sm">
                        <FormattedMessage id="providerProfile.loadingReviews" />
                      </p>
                    </div>
                  ) : isNewProvider ? (
                    <div className="text-center py-8">
                      <Sparkles className="w-12 h-12 mx-auto mb-3 text-yellow-500" aria-hidden="true" />
                      <p className="font-semibold text-gray-800 mb-1">
                        <FormattedMessage id="providerProfile.newProviderNoReviews" />
                      </p>
                      <p className="text-gray-500 text-sm">
                        <FormattedMessage id="providerProfile.beTheFirst" />
                      </p>
                    </div>
                  ) : (
                    <Suspense fallback={
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto" />
                      </div>
                    }>
                      <Reviews
                        mode="summary"
                        averageRating={providerStats.averageRating || provider?.rating || 0}
                        totalReviews={providerStats.realReviewsCount || provider?.reviewCount || 0}
                        ratingDistribution={ratingDistribution}
                      />
                      <div className="mt-6">
                        <Reviews
                          mode="list"
                          reviews={reviews}
                          showControls={!!user}
                          onHelpfulClick={handleHelpfulClick}
                          onReportClick={handleReportClick}
                        />
                      </div>
                    </Suspense>
                  )}
                </section>

                {/* Section FAQ */}
                {snippetData?.snippets?.faqContent && snippetData.snippets.faqContent.length > 0 && (
                  <section className="bg-gray-50 rounded-3xl p-6 sm:p-8 mb-6" aria-labelledby="faq-heading">
                    <h3 id="faq-heading" className="text-xl sm:text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
                      <span className="w-1 h-7 bg-cyan-500 rounded-full flex-shrink-0" aria-hidden="true" />
                      <FormattedMessage id="providerProfile.frequentlyAskedQuestions" />
                    </h3>
                    <div className="space-y-3">
                      {snippetData.snippets.faqContent.map((faq, index) => (
                        <details
                          key={`faq-${index}`}
                          className="group bg-white rounded-2xl overflow-hidden shadow-sm"
                        >
                          <summary className="flex justify-between items-center cursor-pointer list-none px-5 py-4 hover:bg-gray-50 transition-colors">
                            <span className="text-sm sm:text-base font-semibold text-gray-900 pr-4">
                              {faq.question}
                            </span>
                            <svg
                              className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180 flex-shrink-0"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                              aria-hidden="true"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </summary>
                          <div className="px-5 pb-4 text-sm sm:text-base text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
                            {faq.answer}
                          </div>
                        </details>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              {/* ===== SIDEBAR DROITE ===== */}
              <aside className="lg:col-span-1">
                <div className="sticky top-6 space-y-6">

                  {/* CTA Card sticky desktop — toujours visible au scroll */}
                  <div className="hidden lg:block bg-white rounded-2xl shadow-lg p-5 border border-gray-200">
                    {/* Prix */}
                    <div className="text-center mb-4">
                      {bookingPrice?.hasDiscount ? (
                        <>
                          <div className="text-gray-400 line-through text-sm">{formatEUR(bookingPrice.originalEur)}</div>
                          <div className="text-3xl font-black text-red-600">{formatEUR(bookingPrice.eur)}</div>
                        </>
                      ) : (
                        <div className="text-3xl font-black text-gray-900">{bookingPrice ? formatEUR(bookingPrice.eur) : "—"}</div>
                      )}
                      <div className="text-gray-500 text-sm mt-0.5 flex items-center justify-center gap-1">
                        <Clock size={13} aria-hidden="true" />
                        {bookingPrice?.duration ? `${bookingPrice.duration} ${minutesLabel}` : "—"}
                      </div>
                    </div>

                    {/* Bouton appeler */}
                    <button
                      onClick={handleBookCall}
                      disabled={!onlineStatus.isOnline || isOnCall || !authInitialized || !hasValidPhone}
                      className={`w-full py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 min-h-[52px] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        onlineStatus.isOnline && !isOnCall && authInitialized && hasValidPhone
                          ? "bg-gradient-to-r from-green-600 to-green-500 text-white hover:from-green-500 hover:to-green-400 shadow-md shadow-green-500/25 focus:ring-green-500"
                          : isOnCall
                          ? "bg-amber-100 text-amber-800 cursor-not-allowed border border-amber-300"
                          : "bg-gray-100 text-gray-500 cursor-not-allowed border border-gray-200"
                      }`}
                      aria-label={
                        isOnCall ? intl.formatMessage({ id: "providerProfile.alreadyOnCall" })
                        : onlineStatus.isOnline ? intl.formatMessage({ id: "providerProfile.bookNow" })
                        : intl.formatMessage({ id: "providerProfile.unavailable" })
                      }
                    >
                      <Phone size={18} aria-hidden="true" />
                      <span>
                        {isOnCall
                          ? intl.formatMessage({ id: "providerProfile.alreadyOnCall" })
                          : onlineStatus.isOnline
                            ? intl.formatMessage({ id: "providerProfile.bookNow" })
                            : intl.formatMessage({ id: "providerProfile.unavailable" })}
                      </span>
                      {onlineStatus.isOnline && !isOnCall && authInitialized && hasValidPhone && (
                        <span className="flex gap-0.5" aria-hidden="true">
                          <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-white/80" />
                          <span className="w-1.5 h-1.5 rounded-full animate-pulse delay-75 bg-white/80" />
                          <span className="w-1.5 h-1.5 rounded-full animate-pulse delay-150 bg-white/80" />
                        </span>
                      )}
                    </button>

                    {/* Statut */}
                    <div className="mt-3 text-center text-xs">
                      {!hasValidPhone ? (
                        <span className="text-red-500 font-medium"><FormattedMessage id="providerProfile.noPhone" defaultMessage="Réservation indisponible" /></span>
                      ) : isOnCall ? (
                        <span className="text-amber-600 font-medium">📞 <FormattedMessage id="providerProfile.onCallMessage" /></span>
                      ) : onlineStatus.isOnline ? (
                        <span className="text-green-600 font-medium">✅ <FormattedMessage id="providerProfile.availableNow" /></span>
                      ) : (
                        <span className="text-gray-500">⏸ <FormattedMessage id="providerProfile.currentlyOffline" /></span>
                      )}
                    </div>

                    {/* Sécurité */}
                    <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-gray-500">
                      <Shield size={12} aria-hidden="true" />
                      <FormattedMessage id="providerProfile.securePayment" />
                    </div>
                  </div>

                  {/* Statistiques — mini-grid 2×2 */}
                  <div className="bg-gray-900 rounded-2xl p-4" role="region" aria-labelledby="stats-heading">
                    <h4 id="stats-heading" className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3">
                      <FormattedMessage id="providerProfile.stats" defaultMessage="Statistiques" />
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white/5 rounded-xl p-3 text-center">
                        <div className="text-xl font-black text-white">
                          {providerStats.averageRating ? providerStats.averageRating.toFixed(1) : "—"}
                        </div>
                        <div className="text-xs text-white/50 mt-0.5"><FormattedMessage id="providerProfile.averageRating" defaultMessage="Note" /></div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3 text-center">
                        <div className="text-xl font-black text-white">
                          {providerStats.realReviewsCount || provider?.reviewCount || 0}
                        </div>
                        <div className="text-xs text-white/50 mt-0.5"><FormattedMessage id="providerProfile.reviews" defaultMessage="Avis" /></div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3 text-center">
                        <div className="text-xl font-black text-white">
                          {isLoadingStats ? "…" : `${providerStats.successRate || provider?.successRate || 0}%`}
                        </div>
                        <div className="text-xs text-white/50 mt-0.5"><FormattedMessage id="providerProfile.successRate" defaultMessage="Réussite" /></div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3 text-center">
                        <div className="text-xl font-black text-white">
                          {isLawyer
                            ? `${provider.yearsOfExperience || 0}ans`
                            : `${provider.yearsAsExpat || provider.yearsOfExperience || 0}ans`}
                        </div>
                        <div className="text-xs text-white/50 mt-0.5">{yearsLabel}</div>
                      </div>
                    </div>
                  </div>

                  {/* Informations */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm" role="region" aria-labelledby="info-heading">
                    <h4 id="info-heading" className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                      <FormattedMessage id="providerProfile.information" defaultMessage="Infos" />
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-700">
                        <MapPin size={16} className="text-gray-500 flex-shrink-0" aria-hidden="true" />
                        <span>
                          <FormattedMessage id="providerProfile.basedIn" />{" "}
                          {getCountryName(provider.country, preferredLangKey)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <LanguagesIcon size={16} className="text-gray-500 flex-shrink-0" aria-hidden="true" />
                        <span>
                          <FormattedMessage id="providerProfile.speaks" />{" "}
                          {formatLanguages(languageCodes, preferredLangKey)}
                        </span>
                      </div>
                      {joinDateText && (
                        <div className="flex items-center gap-2 text-gray-600 text-xs">
                          <Clock size={14} className="text-gray-500 flex-shrink-0" aria-hidden="true" />
                          <span>{joinDateText}</span>
                        </div>
                      )}
                      
                      {/* Statut en ligne avec animation - cohérent avec ProfileCards */}
                      <div
                        className={`flex items-center gap-2 p-3 rounded-xl mt-2 transition-all ${
                          isOnCall
                            ? "bg-orange-50 border border-orange-200"
                            : onlineStatus.isOnline
                              ? "bg-green-50 border border-green-200"
                              : "bg-gray-50 border border-gray-200"
                        }`}
                        role="status"
                        aria-label={isOnCall
                          ? intl.formatMessage({ id: "providerProfile.alreadyOnCall" })
                          : onlineStatus.isOnline
                            ? intl.formatMessage({ id: "providerProfile.onlineNow" })
                            : intl.formatMessage({ id: "providerProfile.offline" })
                        }
                      >
                        <div
                          className={`relative w-5 h-5 rounded-full flex items-center justify-center ${
                            isOnCall ? "bg-orange-500" : onlineStatus.isOnline ? "bg-green-500" : "bg-gray-400"
                          }`}
                          aria-hidden="true"
                        >
                          {onlineStatus.isOnline && !isOnCall && (
                            <div className="absolute w-5 h-5 rounded-full bg-green-500 animate-ping opacity-75" />
                          )}
                          <div className="w-2 h-2 bg-white rounded-full relative z-10" />
                        </div>
                        <span className={`font-semibold text-sm ${
                          isOnCall ? "text-orange-700" : onlineStatus.isOnline ? "text-green-700" : "text-gray-600"
                        }`}>
                          {isOnCall ? (
                            <FormattedMessage id="providerProfile.alreadyOnCall" />
                          ) : onlineStatus.isOnline ? (
                            <FormattedMessage id="providerProfile.onlineNow" />
                          ) : (
                            <FormattedMessage id="providerProfile.offline" />
                          )}
                        </span>
                      </div>

                      {/* Badge vérifié */}
                      {provider.isVerified && (
                        <div className="flex items-center gap-2 text-gray-700 pt-2">
                          <Shield size={16} className="text-green-500 flex-shrink-0" aria-hidden="true" />
                          <span className="font-medium">
                            <FormattedMessage id="providerProfile.verifiedExpert" />
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </main>
      </div>

      {/* ========================================== */}
      {/* CTA FLOTTANT MOBILE - masqué si CTA hero visible */}
      {/* ========================================== */}
      <div className={`fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] transition-transform duration-300 ${isHeroCTAVisible ? 'translate-y-full' : 'translate-y-0'}`}>
        <div className="px-4 py-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          {/* Info prix + statut */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-gray-900">
                {bookingPrice ? formatEUR(bookingPrice.eur) : "—"}
              </span>
              <span className="text-gray-500 text-sm">
                / {bookingPrice?.duration || 20}{minutesLabel.charAt(0)}
              </span>
            </div>
            <div
              className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                isOnCall
                  ? "bg-orange-100 text-orange-700"
                  : onlineStatus.isOnline
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"
              }`}
            >
              {isOnCall
                ? intl.formatMessage({ id: "providerProfile.onCall" })
                : onlineStatus.isOnline
                  ? intl.formatMessage({ id: "providerProfile.available" })
                  : intl.formatMessage({ id: "providerProfile.offline" })}
            </div>
          </div>

          {/* Bouton CTA */}
          <button
            onClick={handleBookCall}
            disabled={!onlineStatus.isOnline || isOnCall || !authInitialized || !hasValidPhone}
            className={`w-full py-3.5 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 ${
              onlineStatus.isOnline && !isOnCall && authInitialized && hasValidPhone
                ? "bg-gradient-to-r from-green-600 to-green-500 text-white shadow-lg shadow-green-500/30 active:scale-[0.98]"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
            aria-label={
              !authInitialized
                ? intl.formatMessage({ id: "providerProfile.loading", defaultMessage: "Chargement..." })
                : onlineStatus.isOnline && !isOnCall
                  ? intl.formatMessage(
                      { id: "providerProfile.callAriaLabel", defaultMessage: "Appeler {name} pour {price}" },
                      { name: formatShortName(provider), price: bookingPrice ? `${formatEUR(bookingPrice.eur)} (${formatUSD(bookingPrice.usd)})` : "—" }
                    )
                  : isOnCall
                    ? intl.formatMessage({ id: "providerProfile.alreadyOnCall" })
                    : intl.formatMessage({ id: "providerProfile.unavailable" })
            }
          >
            {!authInitialized ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-400 border-t-transparent" />
                <span><FormattedMessage id="providerProfile.loading" defaultMessage="Chargement..." /></span>
              </>
            ) : onlineStatus.isOnline && !isOnCall ? (
              <>
                <Phone size={20} />
                <span><FormattedMessage id="providerProfile.callButton" defaultMessage="Appeler maintenant" /></span>
              </>
            ) : isOnCall ? (
              <>
                <XCircle size={20} />
                <FormattedMessage id="providerProfile.alreadyOnCall" />
              </>
            ) : (
              <>
                <XCircle size={20} />
                <FormattedMessage id="providerProfile.unavailable" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* MODAL IMAGE                               */}
      {/* ========================================== */}
      {showImageModal && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setShowImageModal(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setShowImageModal(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-label={intl.formatMessage({ id: "providerProfile.imageModalAria", defaultMessage: "Agrandissement de l'image de profil" })}
          tabIndex={-1}
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img
              src={profilePhoto}
              alt={intl.formatMessage({ id: "providerProfile.fullPhotoAlt", defaultMessage: "Photo complète de {name}" }, { name: formatPublicName(provider) })}
              className="max-w-full max-h-[90vh] object-contain rounded-2xl"
              onError={handleImageError}
              loading="lazy"
              decoding="async"
              width={IMAGE_SIZES.MODAL_MAX_WIDTH}
              height={IMAGE_SIZES.MODAL_MAX_HEIGHT}
            />
            <button
              className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full p-2.5 text-gray-800 hover:bg-white transition-colors shadow-lg focus:outline-none focus:ring-2 focus:ring-white"
              onClick={(e) => {
                e.stopPropagation();
                setShowImageModal(false);
              }}
              aria-label={intl.formatMessage({ id: "providerProfile.close" })}
            >
              <X size={24} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* RELATED PROVIDERS IN SAME COUNTRY          */}
      {/* ========================================== */}
      {relatedProviders.length > 0 && provider && (
        <section className="mt-2 mb-0 px-4 py-10 bg-gray-900 border-t border-white/5" aria-labelledby="related-heading">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h2 id="related-heading" className="text-xl font-bold text-white">
                <FormattedMessage
                  id="providerProfile.otherProviders"
                  defaultMessage="Autres {role} en {country}"
                  values={{
                    role: isLawyer
                      ? intl.formatMessage({ id: "providerProfile.lawyers", defaultMessage: "avocats" })
                      : intl.formatMessage({ id: "providerProfile.expats", defaultMessage: "expatriés" }),
                    country: getCountryName(provider.country, preferredLangKey),
                  }}
                />
              </h2>
              {/* Lien maillage interne vers page listing pays */}
              <a
                href={`/${currentLocale || 'fr-fr'}/${getTranslatedRouteSlug(isLawyer ? 'lawyers-country' : 'expats-country', currentLang || 'fr')}/${getCountrySlug(provider.country, currentLang || 'fr')}`}
                className="inline-flex items-center gap-2 text-sm font-semibold text-red-400 hover:text-red-300 transition-colors border border-red-400/30 rounded-full px-4 py-2 hover:border-red-400/60 flex-shrink-0"
              >
                <Globe size={15} aria-hidden="true" />
                <FormattedMessage
                  id="providerProfile.seeAllInCountry"
                  defaultMessage="Voir tous les {role} en {country}"
                  values={{
                    role: isLawyer
                      ? intl.formatMessage({ id: "providerProfile.lawyers", defaultMessage: "avocats" })
                      : intl.formatMessage({ id: "providerProfile.expats", defaultMessage: "expatriés" }),
                    country: getCountryName(provider.country, preferredLangKey),
                  }}
                />
              </a>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedProviders.map((rp) => {
                const rpName = rp.firstName ? `${rp.firstName} ${(rp.lastName || '').charAt(0)}.` : 'Expert';
                const rpPhoto = rp.profilePhoto || rp.photoURL || rp.avatar || '/icons/default-avatar.png';
                // Use SEO slugs when available, fallback to /provider/{id}
                const rpSlugs = (rp as any).slugs as Record<string, string> | undefined;
                const rpSlug = rpSlugs?.[currentLang || 'fr'] || rpSlugs?.['fr'];
                const rpUrl = rpSlug
                  ? `/${rpSlug}`
                  : null; // Skip providers without proper SEO slugs
                const rpRating = typeof rp.rating === 'number' ? rp.rating.toFixed(1) : null;
                // Translate specialties using locale-aware labels
                const specLocale = (currentLang === 'ch' ? 'zh' : currentLang || 'fr') as any;
                const translatedSpecs = (rp.specialties || [])
                  .slice(0, 2)
                  .map(s => getSpecialtyLabel(s, specLocale));
                if (!rpUrl) return null; // Skip providers without proper slugs
                return (
                  <a
                    key={rp.id}
                    href={rpUrl}
                    className="group flex items-center gap-4 rounded-xl p-4 border transition-all duration-200 bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700/60 hover:border-red-500/50 hover:from-slate-700 hover:to-slate-800 hover:shadow-lg hover:shadow-red-500/10"
                  >
                    <img
                      src={rpPhoto}
                      alt={`${rpName} — ${isLawyer ? intl.formatMessage({ id: "providerProfile.lawyer" }) : intl.formatMessage({ id: "providerProfile.expat" })} ${getCountryName(rp.country, preferredLangKey)}`}
                      className="w-14 h-14 rounded-full object-cover flex-shrink-0 ring-2 ring-slate-600 group-hover:ring-red-500/50 transition-colors"
                      loading="lazy"
                      decoding="async"
                      width={56}
                      height={56}
                      onError={(e) => { (e.target as HTMLImageElement).src = '/default-avatar.webp'; }}
                    />
                    <div className="min-w-0">
                      <h3 className="font-semibold text-white truncate">{rpName}</h3>
                      {rpRating && (
                        <p className="text-sm text-yellow-400 font-medium">★ {rpRating}</p>
                      )}
                      <p className="text-sm text-gray-300 truncate">
                        {translatedSpecs.join(' · ')}
                      </p>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ========================================== */}
      {/* OFFICIAL EXTERNAL RESOURCES (E-E-A-T)     */}
      {/* Links to government portals + bar assoc.  */}
      {/* ========================================== */}
      {(() => {
        const cc = (provider?.country || '').toUpperCase();
        const immigrationUrl = COUNTRY_IMMIGRATION_PORTALS[cc];
        const barAssoc = isLawyer ? COUNTRY_BAR_ASSOCIATIONS[cc] : undefined;
        // Universal fallback: UN Migration Data Portal (works for all 197 countries)
        const iomUrl = cc ? `https://migrationdataportal.org/?destination=${cc.toLowerCase()}&theme=main` : null;
        const hasResources = immigrationUrl || barAssoc || iomUrl;
        if (!hasResources || !provider) return null;
        return (
          <section className="mt-4 mb-10 px-4" aria-labelledby="official-resources-heading">
            <div className="max-w-6xl mx-auto">
              <div className="bg-gray-900/40 border border-gray-800/60 rounded-2xl p-5">
                <h2 id="official-resources-heading" className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Globe size={13} aria-hidden="true" />
                  <FormattedMessage
                    id="providerProfile.resources.title"
                    defaultMessage="Official resources — {country}"
                    values={{ country: countryName }}
                  />
                </h2>
                <div className="flex flex-wrap gap-2">
                  {immigrationUrl && (
                    <a
                      href={immigrationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 border border-blue-500/20 hover:border-blue-400/40 rounded-full px-3 py-1.5 transition-colors"
                    >
                      <ExternalLink size={11} aria-hidden="true" />
                      <FormattedMessage id="providerProfile.resources.immigration" defaultMessage="Official immigration portal" />
                    </a>
                  )}
                  {barAssoc && (
                    <a
                      href={barAssoc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 hover:text-amber-300 border border-amber-500/20 hover:border-amber-400/40 rounded-full px-3 py-1.5 transition-colors"
                    >
                      <ExternalLink size={11} aria-hidden="true" />
                      {barAssoc.name}
                    </a>
                  )}
                  {iomUrl && (
                    <a
                      href={iomUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-300 border border-gray-700/60 hover:border-gray-600 rounded-full px-3 py-1.5 transition-colors"
                    >
                      <ExternalLink size={11} aria-hidden="true" />
                      <FormattedMessage id="providerProfile.resources.iom" defaultMessage="UN Migration data" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </section>
        );
      })()}

      {/* ========================================== */}
      {/* WIZARD D'AUTHENTIFICATION RAPIDE          */}
      {/* ========================================== */}
      <QuickAuthWizard
        isOpen={showAuthWizard}
        onClose={() => { setShowAuthWizard(false); sessionStorage.removeItem('loginRedirect'); }}
        onSuccess={handleAuthSuccess}
        providerName={provider ? formatPublicName(provider) : undefined}
        bookingRedirectUrl={provider ? `/booking-request/${provider.shortId || provider.id}` : undefined}
      />
    </Layout>
  );
};

export default ProviderProfile;
