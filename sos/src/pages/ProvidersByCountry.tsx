// src/pages/ProvidersByCountry.tsx — Country-specific provider listings (SEO key page)
import React, { useState, useEffect, useMemo } from "react";
import { getSpecialtyLabel } from "../utils/specialtyMapper";
import { getExpatHelpTypeLabel } from "../data/expat-help-types";
import { useParams, Link, useLocation } from "react-router-dom";
import { useLocaleNavigate, parseLocaleFromPath, getLocaleString } from "../multilingual-system";
import { FormattedMessage, useIntl } from "react-intl";
import {
  Star,
  MapPin,
  Globe,
  Users,
  ChevronLeft,
  ChevronRight,
  Phone,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  collection,
  query,
  where,
  getDocs,
  limit as firestoreLimit,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { Helmet } from "react-helmet-async";
import Layout from "../components/layout/Layout";
import LoadingSpinner from "../components/common/LoadingSpinner";
import SEOHead from "../components/layout/SEOHead";
import BreadcrumbSchema from "../components/seo/BreadcrumbSchema";
import FAQPageSchema, { type FAQItem } from "../components/seo/FAQPageSchema";
import ReviewSchema from "../components/seo/ReviewSchema";
import { useApp } from "../contexts/AppContext";
import {
  countriesData,
  getCountryByCode,
  getCountriesByRegion,
  type CountryData,
} from "../data/countries";
import { getCountryName } from "../utils/formatters";
import { formatSpecialties, mapLanguageToLocale } from "../utils/specialtyMapper";
import { languagesData, getLanguageLabel, type SupportedLocale } from "../data/languages-spoken";

/* =========================
   Constants
========================= */
const PAGE_SIZE = 20;
const BASE_URL = "https://sos-expat.com";

/* =========================
   Types
========================= */
interface ProviderListing {
  id: string;
  firstName: string;
  lastName?: string;
  type: "lawyer" | "expat";
  country: string;
  languages: string[];
  specialties: string[];
  rating: number;
  reviewCount: number;
  isOnline: boolean;
  availability?: "available" | "busy" | "offline";
  profilePhoto?: string;
  photoURL?: string;
  avatar?: string;
  operatingCountries?: string[];
  interventionCountries?: string[];
  practiceCountries?: string[];
  slugs?: Record<string, string>;
  translations?: Record<string, { description?: string; specialties?: string[] }>;
}

/* =========================
   Helpers
========================= */
const slugify = (s: string) =>
  (s || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

/** Convert a country slug back to a CountryData entry */
const findCountryBySlug = (slug: string): CountryData | undefined => {
  if (!slug) return undefined;
  const normalized = slug.toLowerCase();

  // Try ISO code first (e.g. "th", "fr")
  const byCode = countriesData.find(
    (c) => c.code.toLowerCase() === normalized && !c.disabled
  );
  if (byCode) return byCode;

  // Try slugified names in all languages
  return countriesData.find((c) => {
    if (c.disabled) return false;
    const names = [
      c.nameFr, c.nameEn, c.nameEs, c.nameDe, c.namePt,
      c.nameRu, c.nameZh, c.nameAr, c.nameIt, c.nameNl,
    ];
    return names.some((n) => slugify(n) === normalized);
  });
};

/** Map app language code to SupportedLocale for getLanguageLabel */
const toLangLocale = (lang: string): SupportedLocale => {
  const map: Record<string, SupportedLocale> = {
    fr: "fr", en: "en", es: "es", de: "de", pt: "pt",
    ru: "ru", hi: "hi", ch: "ch", zh: "ch", ar: "ar",
  };
  return map[lang] || "fr";
};

/** Get provider photo URL with fallback */
const getPhoto = (p: ProviderListing): string =>
  p.profilePhoto || p.photoURL || p.avatar || "/default-avatar.webp";

/** Build the role label for the current language */
const getRoleLabel = (
  type: "lawyer" | "expat",
  intl: ReturnType<typeof useIntl>,
  plural = true
): string => {
  if (type === "lawyer") {
    return plural
      ? intl.formatMessage({ id: "providers.lawyers", defaultMessage: "Avocats" })
      : intl.formatMessage({ id: "providers.lawyer", defaultMessage: "Avocat" });
  }
  return plural
    ? intl.formatMessage({ id: "providers.expats", defaultMessage: "Expatriés expérimentés" })
    : intl.formatMessage({ id: "providers.expat", defaultMessage: "Expatrié expérimenté" });
};

/** Build translated role path slug */
const getRolePath = (type: "lawyer" | "expat", lang: string): string => {
  const lawyerPaths: Record<string, string> = {
    fr: "avocats", en: "lawyers", es: "abogados", de: "anwaelte",
    pt: "advogados", ru: "advokaty", ch: "lvshi", hi: "vakil", ar: "muhamin",
  };
  const expatPaths: Record<string, string> = {
    fr: "expatries", en: "expats", es: "expatriados", de: "expats",
    pt: "expatriados", ru: "expaty", ch: "waiguoren", hi: "pravasi", ar: "mughtaribin",
  };
  return type === "lawyer"
    ? lawyerPaths[lang] || "lawyers"
    : expatPaths[lang] || "expats";
};

/* =========================
   Component
========================= */
const ProvidersByCountry: React.FC = () => {
  const intl = useIntl();
  const { language } = useApp();
  const location = useLocation();
  const navigate = useLocaleNavigate();
  const params = useParams<{ countrySlug: string; providerType?: string }>();

  // Locale from URL
  const { locale: currentLocale, lang } = parseLocaleFromPath(location.pathname);
  const effectiveLang = lang || language || "fr";
  const localeString = currentLocale || getLocaleString(effectiveLang as any);
  const langLocale = toLangLocale(effectiveLang);

  // Determine provider type from URL param or default to lawyer
  const providerType: "lawyer" | "expat" = useMemo(() => {
    const typeParam = params.providerType?.toLowerCase();
    if (typeParam === "expat" || typeParam === "expatries" || typeParam === "expats" || typeParam === "expatriados") {
      return "expat";
    }
    return "lawyer";
  }, [params.providerType]);

  // Resolve country from slug
  const countryData = useMemo(
    () => findCountryBySlug(params.countrySlug || ""),
    [params.countrySlug]
  );
  const countryCode = countryData?.code || "";
  const countryName = countryData
    ? getCountryName(countryData.code, effectiveLang)
    : params.countrySlug || "";

  // Redirect to translated URL when language changes from header
  useEffect(() => {
    if (!countryData || !language) return;
    const urlLang = lang; // language detected from URL
    const appLang = language; // language selected in header
    if (urlLang && appLang && urlLang !== appLang) {
      const newLocale = getLocaleString(appLang as any);
      const newRolePath = getRolePath(providerType, appLang);
      const newCountrySlug = slugify(getCountryName(countryData.code, appLang));
      const newUrl = `/${newLocale}/${newRolePath}/${newCountrySlug}`;
      navigate(newUrl, { replace: true });
    }
  }, [language, lang, countryData, providerType, navigate]);

  // State
  const [providers, setProviders] = useState<ProviderListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Role labels
  const roleLabel = getRoleLabel(providerType, intl);
  const roleLabelSingular = getRoleLabel(providerType, intl, false);
  const rolePath = getRolePath(providerType, effectiveLang);

  // Fetch providers
  useEffect(() => {
    if (!countryCode) {
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    const fetchProviders = async () => {
      setIsLoading(true);

      try {
        // Build queries — some profiles have ISO code (TH), others have French name (Thaïlande)
        const countryVariants = [countryCode];
        if (countryData) {
          const names = [countryData.nameFr, countryData.nameEn].filter(Boolean);
          names.forEach(n => { if (n && !countryVariants.includes(n)) countryVariants.push(n); });
        }

        // Query 1: providers whose country matches (ISO code or name)
        const queries = countryVariants.map(cv => query(
          collection(db, "sos_profiles"),
          where("isApproved", "==", true),
          where("isVisible", "==", true),
          where("isActive", "==", true),
          where("type", "==", providerType),
          where("country", "==", cv),
          firestoreLimit(100)
        ));

        // Query 2: providers whose operatingCountries contain this country
        const q2 = query(
          collection(db, "sos_profiles"),
          where("isApproved", "==", true),
          where("isVisible", "==", true),
          where("isActive", "==", true),
          where("type", "==", providerType),
          where("operatingCountries", "array-contains", countryCode),
          firestoreLimit(100)
        );

        const allSnaps = await Promise.all([...queries.map(q => getDocs(q)), getDocs(q2)]);
        const snap1 = { docs: allSnaps.slice(0, -1).flatMap(s => s.docs) };
        const snap2 = allSnaps[allSnaps.length - 1];

        if (isCancelled) return;

        // Merge and deduplicate
        const providerMap = new Map<string, ProviderListing>();

        const processDoc = (docSnap: any) => {
          const data = docSnap.data();
          if (data.isBanned || data.isAdmin) return;

          providerMap.set(docSnap.id, {
            id: docSnap.id,
            firstName: data.firstName || data.fullName?.split(" ")[0] || "",
            lastName: data.lastName || "",
            type: data.type,
            country: data.currentPresenceCountry || data.country || "",
            languages: data.languages || [],
            specialties: data.specialties || [],
            rating: data.rating || 0,
            reviewCount: data.reviewCount || 0,
            isOnline: data.isOnline === true,
            availability: data.availability || (data.isOnline ? "available" : "offline"),
            profilePhoto: data.profilePhoto,
            photoURL: data.photoURL,
            avatar: data.avatar,
            operatingCountries: data.operatingCountries || data.interventionCountries || data.practiceCountries || [],
            slugs: data.slugs,
            translations: data.translations,
          });
        };

        snap1.docs.forEach(processDoc);
        snap2.docs.forEach(processDoc);

        const results = Array.from(providerMap.values());

        // Sort: online first, then by rating desc
        results.sort((a, b) => {
          const aOnline = a.availability === "available" ? 1 : 0;
          const bOnline = b.availability === "available" ? 1 : 0;
          if (aOnline !== bOnline) return bOnline - aOnline;
          return b.rating - a.rating;
        });

        setProviders(results);
      } catch (error) {
        console.error("[ProvidersByCountry] Error fetching providers:", error);
        setProviders([]);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    fetchProviders();
    return () => { isCancelled = true; };
  }, [countryCode, providerType]);

  // Reset page on country/type change
  useEffect(() => {
    setCurrentPage(1);
  }, [countryCode, providerType]);

  // Pagination
  const totalPages = Math.ceil(providers.length / PAGE_SIZE);
  const paginatedProviders = useMemo(
    () => providers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [providers, currentPage]
  );

  // Aggregate rating data for ReviewSchema
  const aggregateData = useMemo(() => {
    if (providers.length === 0) return null;
    const withRating = providers.filter(p => p.rating && p.rating > 0);
    if (withRating.length === 0) return null;
    const totalRating = withRating.reduce((sum, p) => sum + (p.rating || 0), 0);
    const avgRating = totalRating / withRating.length;
    const totalReviews = withRating.reduce((sum, p) => sum + (p.reviewCount || 0), 0);
    return { avgRating: Math.round(avgRating * 10) / 10, count: withRating.length, totalReviews };
  }, [providers]);

  // Related countries (same region)
  const relatedCountries = useMemo(() => {
    if (!countryData) return [];
    return getCountriesByRegion(countryData.region)
      .filter((c) => c.code !== countryData.code)
      .slice(0, 8);
  }, [countryData]);

  // SEO
  const canonicalUrl = `${BASE_URL}/${localeString}/${rolePath}/${slugify(countryName)}`;
  const isEmptyState = !isLoading && providers.length === 0;

  // Dynamic FAQs
  const dynamicFaqs: FAQItem[] = useMemo(() => {
    const faqConsult: FAQItem = {
      question: intl.formatMessage(
        { id: "providers.faq.howToConsult", defaultMessage: "Comment consulter un {role} en {country} ?" },
        { role: roleLabelSingular.toLowerCase(), country: countryName }
      ),
      answer: intl.formatMessage(
        {
          id: "providers.faq.howToConsultAnswer",
          defaultMessage: "Sur SOS Expat, choisissez un {role} disponible en {country}, puis lancez un appel en quelques clics. La consultation se fait par appel audio, sans rendez-vous, 24h/24 et 7j/7.",
        },
        { role: roleLabelSingular.toLowerCase(), country: countryName }
      ),
    };

    const faqCost: FAQItem = {
      question: intl.formatMessage(
        { id: "providers.faq.howMuch", defaultMessage: "Combien coûte une consultation ?" }
      ),
      answer: intl.formatMessage(
        {
          id: "providers.faq.howMuchAnswer",
          defaultMessage: "Les consultations commencent à partir de 19 EUR pour 20 minutes. Le tarif exact dépend du prestataire choisi. Aucun frais caché.",
        }
      ),
    };

    const faqLanguages: FAQItem = {
      question: intl.formatMessage(
        { id: "providers.faq.languages", defaultMessage: "Quelles langues sont disponibles ?" }
      ),
      answer: intl.formatMessage(
        {
          id: "providers.faq.languagesAnswer",
          defaultMessage: "Nos prestataires parlent de nombreuses langues : français, anglais, espagnol, allemand, portugais, russe, chinois, arabe, hindi et bien d'autres. Filtrez par langue sur la page de listing.",
        }
      ),
    };

    const faqAvailability: FAQItem = {
      question: intl.formatMessage(
        {
          id: "providers.faq.availability",
          defaultMessage: "Est-ce que les {role} en {country} sont disponibles le week-end ?",
        },
        { role: roleLabel.toLowerCase(), country: countryName }
      ),
      answer: intl.formatMessage(
        {
          id: "providers.faq.availabilityAnswer",
          defaultMessage: "Oui, SOS Expat fonctionne 24h/24 et 7j/7, y compris les week-ends et jours fériés. La disponibilité en temps réel de chaque prestataire est affichée sur son profil.",
        }
      ),
    };

    // FAQ 5: Target audiences (expats, digital nomads, students, travelers)
    const faqAudience: FAQItem = {
      question: intl.formatMessage(
        {
          id: "providers.faq.audiences",
          defaultMessage: "Pour qui sont destinés les {role} en {country} sur SOS Expat ?",
        },
        { role: roleLabel.toLowerCase(), country: countryName }
      ),
      answer: intl.formatMessage(
        {
          id: "providers.faq.audiencesAnswer",
          defaultMessage: "Nos {role} en {country} accompagnent les expatriés, les digital nomades, les voyageurs, les vacanciers, les étudiants internationaux (Erasmus, échanges), les travailleurs détachés à l'étranger et toute personne ayant besoin d'assistance à l'international.",
        },
        { role: roleLabel.toLowerCase(), country: countryName }
      ),
    };

    return [faqConsult, faqCost, faqLanguages, faqAvailability, faqAudience];
  }, [intl, roleLabelSingular, roleLabel, countryName]);

  // SEO title & description — uses effectiveLang (from URL) instead of intl (from context)
  // to ensure correct language in SSR where intl may default to French
  const SEO_IN_WORD: Record<string, string> = { fr: 'en', en: 'in', es: 'en', de: 'in', pt: 'em', ru: 'в', ch: '在', hi: 'में', ar: 'في' };
  const SEO_CONSULTATION: Record<string, string> = { fr: 'Consultation 24/7', en: '24/7 Consultation', es: 'Consulta 24/7', de: 'Beratung rund um die Uhr', pt: 'Consulta 24/7', ru: 'Консультация 24/7', ch: '全天候咨询', hi: '24/7 परामर्श', ar: 'استشارة على مدار الساعة' };
  const SEO_LAWYERS: Record<string, string> = { fr: 'Avocats', en: 'Lawyers', es: 'Abogados', de: 'Anwälte', pt: 'Advogados', ru: 'Адвокаты', ch: '律师', hi: 'वकील', ar: 'محامون' };
  const SEO_EXPATS: Record<string, string> = { fr: 'Expatriés expérimentés', en: 'Experienced Expats', es: 'Expatriados experimentados', de: 'Erfahrene Expats', pt: 'Expatriados experientes', ru: 'Опытные экспаты', ch: '资深外籍专家', hi: 'अनुभवी प्रवासी', ar: 'مغتربون ذوو خبرة' };
  const seoRoleLabel = providerType === 'lawyer' ? (SEO_LAWYERS[effectiveLang] || 'Lawyers') : (SEO_EXPATS[effectiveLang] || 'Experienced Expats');
  const seoTitle = `${seoRoleLabel} ${SEO_IN_WORD[effectiveLang] || 'in'} ${countryName} - ${SEO_CONSULTATION[effectiveLang] || '24/7 Consultation'} | SOS Expat`;
  const seoDescription = intl.formatMessage(
    {
      id: "providers.seoDescription",
      defaultMessage: "Trouvez un {role} en {country}. {count} experts disponibles pour expatries, voyageurs, digital nomades, etudiants internationaux et travailleurs a l'etranger. Consultation telephonique immediate 24/7 en {price}.",
    },
    {
      role: roleLabelSingular.toLowerCase(),
      country: countryName,
      count: String(providers.length),
      price: providerType === "lawyer" ? "49€/20min" : "19€/30min",
    }
  ).slice(0, 160);

  /* =========================
     Render
  ========================= */
  return (
    <Layout>
      {/* SEO Head */}
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        canonicalUrl={canonicalUrl}
        ogType="website"
        noindex={isEmptyState}
        locale={effectiveLang === "fr" ? "fr_FR" : effectiveLang === "en" ? "en_US" : effectiveLang === "es" ? "es_ES" : effectiveLang === "de" ? "de_DE" : effectiveLang === "pt" ? "pt_PT" : effectiveLang === "ru" ? "ru_RU" : effectiveLang === "ar" ? "ar_SA" : effectiveLang === "hi" ? "hi_IN" : "fr_FR"}
        keywords={`${roleLabelSingular}, ${countryName}, ${intl.formatMessage({ id: "providers.seo.keywords", defaultMessage: "consultation, expatrié, aide juridique, avocat en ligne" })}`}
      />

      {/* Breadcrumb Schema */}
      <BreadcrumbSchema
        items={[
          { name: intl.formatMessage({ id: "nav.home", defaultMessage: "Accueil" }), url: `/${localeString}` },
          { name: roleLabel, url: `/${localeString}/sos-appel?type=${providerType}` },
          { name: `${roleLabel} ${intl.formatMessage({ id: "providers.in", defaultMessage: "en" })} ${countryName}` },
        ]}
      />

      {/* FAQ Schema */}
      <FAQPageSchema faqs={dynamicFaqs} inLanguage={effectiveLang === "ch" ? "zh" : effectiveLang} />

      {/* Review Schema (AggregateRating + Reviews) */}
      {aggregateData && aggregateData.totalReviews > 0 && (
        <ReviewSchema
          reviews={providers
            .filter(p => p.rating && p.rating > 0)
            .slice(0, 10)
            .map(p => ({
              id: p.id,
              author: { name: p.firstName || 'Client' },
              rating: { ratingValue: p.rating || 5 },
              reviewBody: `${getRoleLabel(providerType, intl, false)} - ${p.firstName}`,
              datePublished: new Date().toISOString().split('T')[0],
            }))}
          itemReviewed={{
            type: 'ProfessionalService',
            name: `${roleLabel} ${intl.formatMessage({ id: 'providers.in', defaultMessage: 'en' })} ${countryName}`,
            url: canonicalUrl,
            description: `${roleLabel} ${intl.formatMessage({ id: 'providers.in', defaultMessage: 'en' })} ${countryName} - SOS Expat`,
          }}
          includeAggregateRating={true}
        />
      )}

      {/* Offer Schema (Service + Pricing) */}
      <Helmet>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          "name": `${roleLabel} ${intl.formatMessage({ id: 'providers.in', defaultMessage: 'en' })} ${countryName}`,
          "url": canonicalUrl,
          "provider": { "@type": "Organization", "name": "SOS Expat & Travelers", "url": "https://sos-expat.com" },
          "areaServed": { "@type": "Country", "name": countryCode },
          "offers": {
            "@type": "Offer",
            "price": providerType === "lawyer" ? "49.00" : "19.00",
            "priceCurrency": "EUR",
            "availability": "https://schema.org/InStock",
            "itemOffered": {
              "@type": "Service",
              "name": `${intl.formatMessage({ id: 'providers.consultation', defaultMessage: 'Consultation téléphonique' })} - ${countryName}`,
            }
          }
        })}</script>
      </Helmet>

      {/* Main Content */}
      <div
        className="min-h-screen bg-gray-950 text-white"
        data-page-loaded="true"
      >
        <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
          {/* H1 + Provider Count */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold mb-3 text-white">
              {countryData?.flag && <span className="mr-2">{countryData.flag}</span>}
              {roleLabel} {intl.formatMessage({ id: "providers.in", defaultMessage: "en" })} {countryName}
            </h1>
            {!isLoading && (
              <p className="text-gray-300 text-lg">
                {providers.length}{" "}
                {providers.length <= 1
                  ? roleLabelSingular.toLowerCase()
                  : roleLabel.toLowerCase()}{" "}
                {intl.formatMessage({ id: "providers.availableIn", defaultMessage: "disponible(s) en" })}{" "}
                {countryName}
              </p>
            )}
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex justify-center items-center min-h-[40vh]">
              <LoadingSpinner />
            </div>
          )}

          {/* Empty State */}
          {isEmptyState && (
            <div className="text-center py-16">
              <Globe className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold text-gray-300 mb-2">
                <FormattedMessage
                  id="providers.empty.title"
                  defaultMessage="Aucun prestataire disponible dans ce pays pour le moment"
                />
              </h2>
              <p className="text-gray-300 mb-8 max-w-md mx-auto">
                <FormattedMessage
                  id="providers.empty.subtitle"
                  defaultMessage="Nous ajoutons régulièrement de nouveaux prestataires. Consultez les pays voisins ci-dessous."
                />
              </p>

              {/* Link to SOS Call page */}
              <button
                onClick={() => navigate("/sos-appel")}
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-medium transition-colors"
              >
                <Phone className="w-4 h-4" />
                <FormattedMessage
                  id="providers.empty.cta"
                  defaultMessage="Voir tous les prestataires"
                />
              </button>

              {/* Related countries */}
              {relatedCountries.length > 0 && (
                <div className="mt-12">
                  <h3 className="text-lg font-semibold text-gray-300 mb-4">
                    <FormattedMessage
                      id="providers.seeAlso"
                      defaultMessage="Voir aussi"
                    />
                  </h3>
                  <div className="flex flex-wrap justify-center gap-3">
                    {relatedCountries.map((rc) => (
                      <Link
                        key={rc.code}
                        to={`/${localeString}/${rolePath}/${slugify(getCountryName(rc.code, effectiveLang))}`}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
                      >
                        {getCountryName(rc.code, effectiveLang)}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Provider Cards Grid */}
          {!isLoading && providers.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {paginatedProviders.map((provider) => (
                  <ProviderCard
                    key={provider.id}
                    provider={provider}
                    lang={effectiveLang}
                    langLocale={langLocale}
                    locale={localeString}
                    roleLabelSingular={roleLabelSingular}
                    intl={intl}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                        page === currentPage
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-800 hover:bg-gray-700 text-gray-300"
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </>
          )}

          {/* Dynamic FAQ Section */}
          {!isLoading && providers.length > 0 && (
            <section className="mt-16">
              <h2 className="text-2xl font-bold mb-6 text-white">
                <FormattedMessage
                  id="providers.faq.title"
                  defaultMessage="Questions fréquentes"
                />
              </h2>
              <div className="space-y-4">
                {dynamicFaqs.map((faq, idx) => (
                  <details
                    key={idx}
                    className="group bg-gray-900 rounded-xl border border-gray-800"
                  >
                    <summary className="flex items-center justify-between cursor-pointer p-5 text-left font-medium text-gray-200 hover:text-white transition-colors">
                      {faq.question}
                      <ChevronRight className="w-5 h-5 text-gray-300 group-open:rotate-90 transition-transform flex-shrink-0 ml-4" />
                    </summary>
                    <div className="px-5 pb-5 text-gray-200 leading-relaxed">
                      {faq.answer}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          )}

          {/* "See Also" — Related Countries */}
          {!isLoading && providers.length > 0 && relatedCountries.length > 0 && (
            <section className="mt-16 mb-8">
              <h2 className="text-xl font-semibold text-gray-300 mb-4">
                <FormattedMessage
                  id="providers.seeAlso"
                  defaultMessage="Voir aussi"
                />
              </h2>
              <div className="flex flex-wrap gap-3">
                {relatedCountries.map((rc) => (
                  <Link
                    key={rc.code}
                    to={`/${localeString}/${rolePath}/${slugify(getCountryName(rc.code, effectiveLang))}`}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
                  >
                    {getCountryName(rc.code, effectiveLang)}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </Layout>
  );
};

/* =========================
   Provider Card Sub-Component
========================= */
interface ProviderCardProps {
  provider: ProviderListing;
  lang: string;
  langLocale: SupportedLocale;
  locale: string;
  roleLabelSingular: string;
  intl: ReturnType<typeof useIntl>;
}

const ProviderCard: React.FC<ProviderCardProps> = ({
  provider,
  lang,
  langLocale,
  locale,
  roleLabelSingular,
  intl,
}) => {
  const isAvailable = provider.availability === "available";
  const photo = getPhoto(provider);

  // Translated specialties — map codes to localized labels
  const specialties = useMemo(() => {
    const translated = provider.translations?.[lang]?.specialties;
    if (translated && translated.length > 0) return translated;
    const raw = provider.specialties || [];
    const localeForTranslation = mapLanguageToLocale(lang || 'fr');
    return raw.map((code: string) => {
      const isLawyer = provider.type === 'lawyer';
      if (isLawyer) {
        const label = getSpecialtyLabel(code.trim(), localeForTranslation);
        return label !== code.trim() ? label : code;
      }
      const upper = code.trim().toUpperCase();
      const label = getExpatHelpTypeLabel(upper, localeForTranslation as any);
      return label !== upper ? label : code;
    });
  }, [provider, lang]);

  // Provider profile URL
  const profileUrl = useMemo(() => {
    // Use slug if available — slugs already contain locale prefix (e.g., "fr-fr/avocat-thailande/julien-penal-fsx3c9")
    if (provider.slugs?.[lang]) {
      return `/${provider.slugs[lang]}`;
    }
    // Fallback: use provider/:id route
    return `/${locale}/prestataire/${provider.id}`;
  }, [provider, lang, locale]);

  // Display languages
  const displayLanguages = useMemo(() => {
    return provider.languages
      .slice(0, 4)
      .map((code) => {
        const normalizedCode = code === "ch" ? "zh" : code.toLowerCase();
        const langObj = languagesData.find((l) => l.code.toLowerCase() === normalizedCode);
        return langObj ? getLanguageLabel(langObj, langLocale) : code;
      })
      .join(", ");
  }, [provider.languages, langLocale]);

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 sm:p-5 flex gap-4 hover:border-gray-700 transition-colors">
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <img
          src={photo}
          alt={`${provider.firstName} — ${roleLabelSingular}`}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover bg-gray-800"
          loading="lazy"
          width={80}
          height={80}
        />
        {/* Online indicator */}
        <span
          className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-gray-900 ${
            isAvailable ? "bg-green-500" : "bg-gray-600"
          }`}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-white truncate">
            {provider.firstName}
            {provider.lastName ? ` ${provider.lastName.charAt(0)}.` : ""}{" "}
            <span className="text-gray-300 font-normal text-sm">
              — {roleLabelSingular}
            </span>
          </h3>
          <span
            className={`flex-shrink-0 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
              isAvailable
                ? "bg-green-900/40 text-green-400 border border-green-800"
                : "bg-gray-800 text-gray-300 border border-gray-700"
            }`}
          >
            {isAvailable ? (
              <>
                <Wifi className="w-3 h-3" />
                <FormattedMessage id="providers.online" defaultMessage="En ligne" />
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3" />
                <FormattedMessage id="providers.offline" defaultMessage="Hors ligne" />
              </>
            )}
          </span>
        </div>

        {/* Specialties */}
        {specialties.length > 0 && (
          <p className="text-gray-300 text-sm truncate mb-1">
            {specialties.slice(0, 3).join(", ")}
          </p>
        )}

        {/* Rating + Languages */}
        <div className="flex items-center gap-3 text-sm text-gray-300 mb-3">
          {provider.reviewCount > 0 && (
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
              <span className="text-yellow-400 font-medium">{provider.rating.toFixed(1)}</span>
              <span className="text-gray-300">({provider.reviewCount})</span>
            </span>
          )}
          {provider.languages.length > 0 && (
            <span className="flex items-center gap-1 truncate">
              <Globe className="w-3.5 h-3.5 flex-shrink-0" />
              {displayLanguages}
            </span>
          )}
        </div>

        {/* CTA */}
        <Link
          to={profileUrl}
          className="inline-flex items-center gap-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          <FormattedMessage id="providers.viewProfile" defaultMessage="Voir le profil" />
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};

export default ProvidersByCountry;
