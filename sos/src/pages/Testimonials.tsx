import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Star,
  MapPin,
  Calendar,
  ArrowRight,
  Search,
  Sparkles,
  ChevronRight,
  Briefcase,
  User,
  Award,
  Shield,
  Clock,
  Globe,
} from "lucide-react";
import Layout from "../components/layout/Layout";
import { useApp } from "../contexts/AppContext";
import { logAnalyticsEvent, getAllReviews } from "../utils/firestore";
import { getDateLocale } from "../utils/formatters";
import { FormattedMessage, useIntl } from "react-intl";
import { createMockReviewsData } from "@/constants/testimonials";

// =================== TYPES ===================
export interface Review {
  id: string;
  callId: string;
  clientId: string;
  providerId: string;
  rating: number;
  comment: string;
  isPublic: boolean;
  createdAt: Date;
  clientName: string;
  clientCountry: string;
  serviceType: "lawyer_call" | "expat_call";
  status: "published" | "pending" | "rejected" | "hidden";
  helpfulVotes: number;
  clientAvatar?: string;
  verified: boolean;
}

type ReviewType = Review;
type FilterType = "all" | "avocat" | "expatrie";

interface TestimonialsStats {
  count: number;
  averageRating: number;
  countries: number;
}

// =================== CONSTANTS ===================
const STATS_AVERAGE_RATING = 4.9;
const STATS_COUNTRIES = 150;
const STATS_TOTAL_TESTIMONIALS = 2347;
const TESTIMONIALS_PER_PAGE = 9;

// =================== HELPER FUNCTIONS ===================
const detectBrowserLanguage = (): string => {
  if (typeof navigator === "undefined") return "fr";
  const browserLang = navigator.language || navigator.languages?.[0] || "fr";
  return browserLang.startsWith("en") ? "en" : "fr";
};

const smoothScrollToTop = () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
};

// ✅ FONCTION DE MAPPING DES PAYS POUR URL SEO
const createCountrySlug = (country: string): string => {

  const slugMap: Record<string, string> = {
    // French country names
    Thaïlande: "thailand",
    "Royaume-Uni": "united-kingdom",
    "États-Unis": "united-states",
    "Émirats Arabes Unis": "united-arab-emirates",
    "Corée du Sud": "south-korea",
    "Nouvelle-Zélande": "new-zealand",
    "Afrique du Sud": "south-africa",
    "Côte d'Ivoire": "ivory-coast",
    "République Tchèque": "czech-republic",
    "Arabie Saoudite": "saudi-arabia",
    Norvège: "norway",
    Suède: "sweden",
    Pérou: "peru",
    Sénégal: "senegal",
    Indonésie: "indonesia",
    Grèce: "greece",
    Danemark: "denmark",
    Finlande: "finland",
    Islande: "iceland",
    Irlande: "ireland",
    Turquie: "turkey",
    Canada: "canada",
    Espagne: "spain",
    Allemagne: "germany",
    Italie: "italy",
    Portugal: "portugal",
    Belgique: "belgium",
    Suisse: "switzerland",
    Australie: "australia",
    Japon: "japan",
    Brésil: "brazil",
    Mexique: "mexico",
    Argentine: "argentina",
    Chili: "chile",
    Colombie: "colombia",
    Maroc: "morocco",
    Tunisie: "tunisia",
    Vietnam: "vietnam",
    Cambodge: "cambodia",
    Inde: "india",
    Chine: "china",
    Singapour: "singapore",
    Malaisie: "malaysia",
    Philippines: "philippines",
    Qatar: "qatar",
    Croatie: "croatia",
    Pologne: "poland",
    Hongrie: "hungary",
    Roumanie: "romania",
    Bulgarie: "bulgaria",
    Russie: "russia",
    Ukraine: "ukraine",
    Luxembourg: "luxembourg",
    Autriche: "austria",
    
    // English country names
    Thailand: "thailand",
    "United Kingdom": "united-kingdom",
    "United States": "united-states",
    "United Arab Emirates": "united-arab-emirates",
    "South Korea": "south-korea",
    "New Zealand": "new-zealand",
    "South Africa": "south-africa",
    "Czech Republic": "czech-republic",
    "Saudi Arabia": "saudi-arabia",
    Norway: "norway",
    Sweden: "sweden",
    Peru: "peru",
    Senegal: "senegal",
    Indonesia: "indonesia",
    Greece: "greece",
    Denmark: "denmark",
    Finland: "finland",
    Iceland: "iceland",
    Ireland: "ireland",
    Turkey: "turkey",
    Spain: "spain",
    Germany: "germany",
    Italy: "italy",
    Brazil: "brazil",
    Mexico: "mexico",
    Argentina: "argentina",
    Chile: "chile",
    Colombia: "colombia",
    Morocco: "morocco",
    Tunisia: "tunisia",
    France: "france",
    Switzerland: "switzerland",
    India: "india",
    China: "china",
    Singapore: "singapore",
    Malaysia: "malaysia",
    
    // German country names (Deutsch)
    "Vereinigte Arabische Emirate": "united-arab-emirates",
    "Südkorea": "south-korea",
    Norwegen: "norway",
    Schweden: "sweden",
    Brasilien: "brazil",
    Singapur: "singapore",
    "Vereinigtes Königreich": "united-kingdom",
    Deutschland: "germany",
    Italien: "italy",
    "Vereinigte Staaten": "united-states",
    Spanien: "spain",
    Mexiko: "mexico",
    Schweiz: "switzerland",
    Australien: "australia",
    Kanada: "canada",
    
    // Spanish country names (Español)
    Tailandia: "thailand",
    Canadá: "canada",
    "Reino Unido": "united-kingdom",
    "Estados Unidos": "united-states",
    Alemania: "germany",
    Francia: "france",
    España: "spain",
    Suiza: "switzerland",
    México: "mexico",
    Brasil: "brazil",
    
    // Russian country names (Русский)
    Таиланд: "thailand",
    Канада: "canada",
    "Великобритания": "united-kingdom",
    "США": "united-states",
    Германия: "germany",
    Франция: "france",
    Испания: "spain",
    Италия: "italy",
    Швейцария: "switzerland",
    Австралия: "australia",
    Япония: "japan",
    
    // Portuguese country names (Português)
    Tailândia: "thailand",
    Alemanha: "germany",
    França: "france",
    Espanha: "spain",
    Itália: "italy",
    Suíça: "switzerland",
    Austrália: "australia",
    Japão: "japan",
    
    // Hindi country names (हिन्दी)
    "थाईलैंड": "thailand",
    "कनाडा": "canada",
    "यूनाइटेड किंगडम": "united-kingdom",
    "संयुक्त राज्य अमेरिका": "united-states",
    "जर्मनी": "germany",
    "फ्रांस": "france",
    "स्पेन": "spain",
    "इटली": "italy",
    "स्विट्जरलैंड": "switzerland",
    "ऑस्ट्रेलिया": "australia",
    "जापान": "japan",
    
    // Chinese country names (中文)
    "泰国": "thailand",
    "加拿大": "canada",
    "英国": "united-kingdom",
    "美国": "united-states",
    "德国": "germany",
    "法国": "france",
    "西班牙": "spain",
    "意大利": "italy",
    "瑞士": "switzerland",
    "澳大利亚": "australia",
    "日本": "japan",
    
    // Arabic country names (العربية)
    "تايلاند": "thailand",
    "كندا": "canada",
    "المملكة المتحدة": "united-kingdom",
    "الولايات المتحدة": "united-states",
    "ألمانيا": "germany",
    "فرنسا": "france",
    "إسبانيا": "spain",
    "إيطاليا": "italy",
    "سويسرا": "switzerland",
    "أستراليا": "australia",
    "اليابان": "japan",
    "المغرب": "morocco",
    "تونس": "tunisia",
    "مصر": "egypt",
    "الإمارات العربية المتحدة": "united-arab-emirates",
    "السعودية": "saudi-arabia",
    "قطر": "qatar",
  };

  // Return mapped slug or fallback to lowercase ASCII
  return (
    slugMap[country] ||
    country
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
      .replace(/\s+/g, "-")
      .replace(/[^\w-]/g, "") // Remove non-ASCII
      .replace(/^-+|-+$/g, "") // Trim dashes
      || "unknown" // Final fallback
  );
};



// =================== MAIN COMPONENT ===================
const Testimonials: React.FC = () => {
  const intl = useIntl();
  const { language } = useApp();
  const navigate = useNavigate();
  
  // ✅ Check if current language is RTL
  const isRTL = language === 'ar';

  // Use detected language or app language
  const [currentLanguage, setCurrentLanguage] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return (
        // localStorage.getItem("testimonials_language") ||
        // localStorage.getItem("sos_language") ||
        language
        // detectBrowserLanguage()
      );
    }
    return language || "fr";
  });

  // 🔥 CORRECTION: Utiliser useMemo pour recalculer t quand la langue change
  // const t = useMemo(() => {
  //   const selectedTranslations =
  //     translations[currentLanguage as keyof typeof translations] ||
  //     translations.fr;
  //   console.log(
  //     "🌍 Traductions actives:",
  //     currentLanguage,
  //     selectedTranslations.hero.title
  //   ); // Debug
  //   return selectedTranslations;
  // }, [currentLanguage]);

  // State
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [testimonials, setTestimonials] = useState<ReviewType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Memoized values
  const stats = useMemo<TestimonialsStats>(
    () => ({
      count: STATS_TOTAL_TESTIMONIALS,
      averageRating: STATS_AVERAGE_RATING,
      countries: STATS_COUNTRIES,
    }),
    []
  );

  const filteredTestimonials = useMemo(() => {
    return testimonials.filter((review) => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        review.comment?.toLowerCase().includes(searchLower) ||
        review.clientName?.toLowerCase().includes(searchLower) ||
        review.clientCountry?.toLowerCase().includes(searchLower)
      );
    });
  }, [testimonials, searchTerm]);

  const currentPageTestimonials = useMemo(() => {
    const startIndex = (page - 1) * TESTIMONIALS_PER_PAGE;
    const endIndex = startIndex + TESTIMONIALS_PER_PAGE;
    return filteredTestimonials.slice(startIndex, endIndex);
  }, [filteredTestimonials, page]);

  const totalPages = Math.ceil(
    filteredTestimonials.length / TESTIMONIALS_PER_PAGE
  );

  // Load testimonials from Firestore with mock fallback
  const loadTestimonials = useCallback(async () => {
    try {
      setIsLoading(true);

      // Try to fetch real reviews from Firestore
      let realReviews: ReviewType[] = [];
      try {
        const firestoreReviews = await getAllReviews({
          status: "published",
          limit: 100,
        });

        // Map Firestore reviews to ReviewType with all required fields
        realReviews = firestoreReviews
          .filter((r) => r.isPublic === true)
          .map((r) => ({
            id: r.id,
            callId: r.callId || "",
            clientId: r.clientId || "",
            providerId: r.providerId || "",
            rating: r.rating || 5,
            comment: r.comment || "",
            isPublic: r.isPublic ?? true,
            createdAt: r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt),
            clientName: r.clientName || "Client",
            clientCountry: r.clientCountry || "",
            serviceType: r.serviceType || "expat_call",
            status: r.status || "published",
            helpfulVotes: r.helpfulVotes || 0,
            clientAvatar: r.clientAvatar,
            verified: r.verified ?? true,
          })) as ReviewType[];
      } catch (firestoreError) {
        console.warn("Could not fetch reviews from Firestore:", firestoreError);
      }

      // If no real reviews, fallback to mock data
      let reviews: ReviewType[];
      if (realReviews.length > 0) {
        reviews = realReviews;
      } else {
        // Use mock data as fallback
        reviews = createMockReviewsData(currentLanguage);
      }

      // Apply filter
      let filteredReviews = reviews;
      if (filter === "avocat") {
        filteredReviews = reviews.filter(
          (review) => review.serviceType === "lawyer_call"
        );
      } else if (filter === "expatrie") {
        filteredReviews = reviews.filter(
          (review) => review.serviceType === "expat_call"
        );
      }

      filteredReviews.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
      setTestimonials(filteredReviews);

      logAnalyticsEvent({
        eventType: "testimonials_loaded",
        eventData: {
          filter,
          total_count: filteredReviews.length,
          real_reviews_count: realReviews.length,
          language: currentLanguage,
        },
      });
    } catch (error) {
      console.error("Error loading testimonials:", error);
      setTestimonials(createMockReviewsData(currentLanguage));
    } finally {
      setIsLoading(false);
    }
  }, [filter, currentLanguage]);

  useEffect(() => {
    setCurrentLanguage(language);
  }, [language]);

  // Charger les témoignages au montage et quand le filtre ou la langue change
  useEffect(() => {
    loadTestimonials();
  }, [loadTestimonials]);

  // Effect séparé pour forcer le rechargement quand la langue change
  useEffect(() => {
    // Réinitialiser la page à 1 quand la langue change
    setPage(1);
    // Effacer le terme de recherche pour éviter des résultats incohérents
    setSearchTerm("");
    // Recharger immédiatement
    loadTestimonials();
  }, [currentLanguage]);

  // Persist language choice
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("testimonials_language", currentLanguage);
      document.documentElement.lang = currentLanguage;
      // Update page title and meta description
      // document.title = t.meta.title;
      document.title = intl.formatMessage({ id: "testy.meta.title" });
      const metaDescription = document.querySelector(
        'meta[name="description"]'
      );
      if (metaDescription) {
        metaDescription.setAttribute(
          "content",
          intl.formatMessage({ id: "testy.meta.description" })
        );
      }
    }
  }, [currentLanguage, intl]);

  // Event handlers
  const handleFilterChange = useCallback((newFilter: FilterType) => {
    setFilter(newFilter);
    setPage(1);
  }, []);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
      setPage(1);
    },
    []
  );

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    smoothScrollToTop();
  }, []);

  // ✅ FONCTION DE REDIRECTION - NEW SEO URL FORMAT
  const handleTestimonialClick = useCallback(
    (testimonial: ReviewType) => {
      // Déterminer le type de service pour l'URL (lawyer ou expat)
      const serviceType =
        testimonial.serviceType === "lawyer_call" ? "lawyer" : "expat";
      
      console.log("client country : ", testimonial.clientCountry);

      // Créer le slug du pays pour l'URL SEO
      const countrySlug = createCountrySlug(testimonial.clientCountry);

      // Créer le slug de la langue
      const languageSlug = currentLanguage === 'en' ? 'english' :
                           currentLanguage === 'fr' ? 'french' :
                           currentLanguage === 'es' ? 'spanish' :
                           currentLanguage === 'de' ? 'german' :
                           currentLanguage === 'ru' ? 'russian' :
                           currentLanguage === 'hi' ? 'hindi' :
                           currentLanguage === 'ch' ? 'chinese' :
                           currentLanguage === 'pt' ? 'portuguese' :
                           currentLanguage === 'ar' ? 'arabic' : 'english';

      // Construire l'URL SEO-friendly selon le nouveau format
      // Format: /testimonials/country/language/review-lawyer-urgently
      // Exemple: /testimonials/thailand/english/review-lawyer-urgently
      const reviewType = serviceType === "lawyer" ? "review-lawyer" : "review-expat";
      const path = `/testimonials/${countrySlug}/${languageSlug}/${reviewType}-urgently`;

      console.log("🚀 Navigation vers:", path); // Pour débugger
      console.log("🔗 SEO URL:", path, `(${path.length} chars)`);
      
      // Store testimonial data in sessionStorage for detail page
      sessionStorage.setItem('testimonialId', testimonial.id);
      sessionStorage.setItem('testimonialCountry', countrySlug);
      sessionStorage.setItem('testimonialLanguage', languageSlug);
      sessionStorage.setItem('testimonialServiceType', serviceType);
      
      navigate(path);

      // Analytics pour tracking
      logAnalyticsEvent({
        eventType: "testimonial_clicked",
        eventData: {
          testimonial_id: testimonial.id,
          service_type: serviceType,
          country: countrySlug,
          language: languageSlug,
          url_path: path,
        },
      });
    },
    [navigate, currentLanguage]
  );

  const handleLanguageChange = useCallback(
    (newLanguage: string) => {
      console.log(
        "🌍 Changement de langue:",
        currentLanguage,
        "->",
        newLanguage
      ); // Debug
      setCurrentLanguage(newLanguage);
      // Force un re-render immédiat
      setIsLoading(true);
    },
    [currentLanguage]
  );

  const formatDate = (date: Date): string => {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return intl.formatMessage({ id: "testy.aria.unknownDate" });
    }
    return date.toLocaleDateString(
      getDateLocale(currentLanguage),
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    );
  };

  const getServiceTypeLabel = (serviceType: string): string => {
    return serviceType === "lawyer_call"
      ? intl.formatMessage({ id: "testy.card.lawyer" })
      : intl.formatMessage({ id: "testy.card.expat" });
  };

  const getServiceTypeClass = (serviceType: string): string => {
    return serviceType === "lawyer_call"
      ? "bg-gradient-to-r from-red-500 to-orange-500 text-white"
      : "bg-gradient-to-r from-blue-500 to-indigo-500 text-white";
  };

  return (
    <Layout>
      <div
        className="min-h-screen bg-gray-50"
        key={`testimonials-${currentLanguage}`}
      >
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-20 sm:py-28 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-transparent to-blue-500/10" />
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center">


            {/* Badge */}
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 sm:px-6 py-2 sm:py-3 border border-white/20 mb-6 sm:mb-8">
              <Star className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 fill-current" />
              <span className="font-semibold text-sm sm:text-base">
                {/* {t.hero.badge} */}
                <FormattedMessage id="testy.hero.badge" />
              </span>
              <Award className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl font-black mb-4 sm:mb-6 leading-tight">
              <span className="bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent">
                {/* {t.hero.title.split(" ")[0]} */}
                {intl.formatMessage({ id: "testy.hero.titleFirst" })}
              </span>
              <br />
              <span className="bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent">
                {/* {t.hero.title.split(" ")[1]} */}
                {intl.formatMessage({ id: "testy.hero.titleSecond" })}
              </span>
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/90 max-w-4xl mx-auto mb-8 sm:mb-12 leading-relaxed px-4">
              {/* {t.hero.subtitle} */}
              <FormattedMessage id="testy.hero.subtitle" />
            </p>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* <div className="text-center group">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Award className="w-8 h-8 text-white" />
                </div>
                <div className="text-4xl font-black text-white mb-2">
                  {stats.count}
                </div>
                <div className="text-white/80 font-medium">
                  <FormattedMessage id="testimonials.hero.stats.testimonials" />
                </div>
              </div> */}
              <div className="text-center group">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-500 mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Star className="w-8 h-8 text-white" />
                </div>
                <div className="text-4xl font-black text-white mb-2">
                  {stats.averageRating}
                </div>
                <div className="text-white/80 font-medium">
                  {/* {t.hero.stats.averageRating} */}
                  <FormattedMessage id="testimonials.hero.stats.averageRating" />
                </div>
              </div>
              <div className="text-center group">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-green-500 to-teal-500 mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Globe className="w-8 h-8 text-white" />
                </div>
                <div className="text-4xl font-black text-white mb-2">
                  {stats.countries}+
                  {/* <FormattedMessage id="testimonials.hero.stats.countries" />+ */}
                </div>
                <div className="text-white/80 font-medium">
                  {/* {t.hero.stats.countries} */}
                  <FormattedMessage id="testimonials.hero.stats.countries" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Filters Section */}
        <section className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 py-6 sm:py-8 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 items-center justify-between">
              {/* Filter buttons */}
              <div className="flex flex-wrap gap-2 sm:gap-3 justify-center lg:justify-start">
                <button
                  onClick={() => handleFilterChange("all")}
                  className={`group inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold transition-all duration-300 touch-manipulation min-h-[48px] ${
                    filter === "all"
                      ? "bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg scale-105"
                      : "bg-white/80 backdrop-blur-sm text-gray-700 hover:bg-white hover:shadow-md hover:scale-105 border border-gray-200/50"
                  }`}
                  aria-label={`${intl.formatMessage({ id: "testy.aria.filterButton" })}: ${intl.formatMessage({ id: "testy.filters.all" })}`}
                >
                  <Sparkles className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
                  {/* {t.filters.all} */}
                  <FormattedMessage id="testy.filters.all" />
                </button>
                <button
                  onClick={() => handleFilterChange("avocat")}
                  className={`group inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold transition-all duration-300 touch-manipulation min-h-[48px] ${
                    filter === "avocat"
                      ? "bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg scale-105"
                      : "bg-white/80 backdrop-blur-sm text-gray-700 hover:bg-white hover:shadow-md hover:scale-105 border border-gray-200/50"
                  }`}
                  aria-label={`${intl.formatMessage({ id: "testy.aria.filterButton" })}: ${intl.formatMessage({ id: "testy.filters.lawyers" })}`}
                >
                  <Briefcase className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
                  {/* {t.filters.lawyers} */}
                  <FormattedMessage id="testy.filters.lawyers" />
                </button>
                <button
                  onClick={() => handleFilterChange("expatrie")}
                  className={`group inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold transition-all duration-300 touch-manipulation min-h-[48px] ${
                    filter === "expatrie"
                      ? "bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg scale-105"
                      : "bg-white/80 backdrop-blur-sm text-gray-700 hover:bg-white hover:shadow-md hover:scale-105 border border-gray-200/50"
                  }`}
                  aria-label={`${intl.formatMessage({ id: "testy.aria.filterButton" })}: ${intl.formatMessage({ id: "testy.filters.expats" })}`}
                >
                  <User className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
                  {/* {t.filters.expats} */}
                  <FormattedMessage id="testy.filters.expats" />
                </button>
              </div>

              {/* Search bar */}
              <div className="relative w-full max-w-sm">
                <Search
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder={intl.formatMessage({
                    id: "testy.filters.searchPlaceholder",
                  })}
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="pl-12 pr-6 py-3 w-full border border-gray-200 rounded-2xl bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300 placeholder-gray-500 text-sm sm:text-base min-h-[48px] touch-manipulation"
                  aria-label={intl.formatMessage({
                    id: "testy.aria.searchInput",
                  })}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Quick Stats */}
        <div className="py-12 sm:py-16 relative">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 right-1/4 w-64 h-64 bg-gradient-to-r from-red-500/5 to-orange-500/5 rounded-full blur-3xl" />
            <div className="absolute bottom-20 left-1/4 w-64 h-64 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
            <div className="mb-8 p-4 rounded-2xl bg-white/50 backdrop-blur-sm border border-gray-200/50">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-black text-gray-900">
                    {filteredTestimonials.length}
                  </div>
                  <div className="text-gray-600">
                    {filter === "all" ? (
                      <FormattedMessage id="testy.filters.all" />
                    ) : 
                    filter === "avocat" ? (
                      <FormattedMessage id="testy.filters.lawyers" />
                    ) : (
                      <FormattedMessage id="testy.filters.expats" />

                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>
                  
                    <FormattedMessage id="testy.stats.showing" />
                    {STATS_TOTAL_TESTIMONIALS}
                
                    <FormattedMessage id="testy.stats.total" />
                  </span>
                  <div className="w-1 h-1 bg-gray-400 rounded-full" />
                  <span>4,9/5 ⭐</span>
                </div>
              </div>

              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${Math.min((filteredTestimonials.length / STATS_TOTAL_TESTIMONIALS) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {isLoading && currentPageTestimonials.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8">
                {Array.from({ length: TESTIMONIALS_PER_PAGE }, (_, i) => (
                  <div
                    key={i}
                    className="animate-pulse bg-white rounded-3xl shadow-lg border border-gray-100 p-6 sm:p-8"
                  >
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gray-200" />
                        <div>
                          <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                          <div className="h-3 bg-gray-200 rounded w-16" />
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        {Array.from({ length: 5 }, (_, j) => (
                          <div
                            key={j}
                            className="w-3 h-3 bg-gray-200 rounded"
                          />
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2 mb-6">
                      <div className="h-4 bg-gray-200 rounded w-full" />
                      <div className="h-4 bg-gray-200 rounded w-5/6" />
                      <div className="h-4 bg-gray-200 rounded w-4/6" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredTestimonials.length === 0 ? (
              <div className="text-center py-12 sm:py-16">
                <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gray-100 mb-4 sm:mb-6">
                  <Search className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                </div>
                <p className="text-lg sm:text-xl text-gray-600 font-medium">
                  {/* {t.loading.noResults} */}
                  <FormattedMessage id="testy.loading.noResults" />
                </p>
                <p className="text-gray-500 mt-2">
                  {/* {t.loading.adjustCriteria} */}
                  <FormattedMessage id="testy.loading.adjustCriteria" />
                </p>
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setPage(1);
                    }}
                    className="mt-4 text-red-600 hover:text-red-700 font-medium"
                  >
                    {/* {t.loading.clearSearch} */}
                    {/* {t.loading.clearSearch} */}
                    <FormattedMessage id="testy.loading.clearSearch" />
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8">
                  {currentPageTestimonials.map((testimonial, index) => (
                    <article
                      key={testimonial.id}
                      className="group relative bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 touch-manipulation active:scale-[0.98] opacity-0 animate-[fadeInUp_0.6s_ease-out_forwards]"
                      style={{ animationDelay: `${index * 0.1}s` }}
                      onClick={() => handleTestimonialClick(testimonial)}
                      aria-label={`${intl.formatMessage({ id: "testy.aria.testimonialCard" })} ${testimonial.clientName}`}
                      dir={isRTL ? 'rtl' : 'ltr'}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-orange-500/5 to-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      <div className="relative z-10 p-6 sm:p-8">
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center space-x-4">
                            <div className="relative">
                              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden ring-2 ring-gray-100 group-hover:ring-red-200 transition-all duration-300">
                                <img
                                  src={
                                    testimonial.clientAvatar ||
                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(testimonial.clientName)}&background=random`
                                  }
                                  alt={testimonial.clientName}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              </div>
                              {testimonial.verified && (
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                                  <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-bold text-gray-900 text-base sm:text-lg mb-2">
                                {testimonial.clientName}
                              </h3>
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* Early Beta User Badge */}
                                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-sm whitespace-nowrap">
                                  Early Beta User
                                </span>
                                {/* Service Type Badge */}
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold ${getServiceTypeClass(testimonial.serviceType)}`}
                                >
                                  {testimonial.serviceType === "lawyer_call" ? (
                                    <Briefcase className="w-3 h-3" />
                                  ) : (
                                    <User className="w-3 h-3" />
                                  )}
                                  {getServiceTypeLabel(testimonial.serviceType)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1">
                            {Array.from({ length: 5 }, (_, i) => (
                              <Star
                                key={i}
                                size={14}
                                className={
                                  i < Math.floor(testimonial.rating)
                                    ? "text-yellow-400 fill-current"
                                    : "text-gray-300"
                                }
                              />
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center space-x-4 text-sm text-gray-500 mb-6">
                          <div className="flex items-center space-x-1.5">
                            <MapPin size={14} />
                            <span className="capitalize font-medium">
                              {testimonial.clientCountry}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <Calendar size={14} />
                            <span>{formatDate(testimonial.createdAt)}</span>
                          </div>
                        </div>

                        <blockquote 
                          className="text-gray-700 mb-6 leading-relaxed text-sm sm:text-base line-clamp-4"
                          style={{ 
                            fontFamily: language === 'ar' ? 'Arial, sans-serif' : 
                                       language === 'hi' ? 'Noto Sans Devanagari, sans-serif' : 
                                       language === 'ch' ? 'Noto Sans SC, sans-serif' : 
                                       'inherit'
                          }}
                        >
                          "{testimonial.comment}"
                        </blockquote>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <span>{testimonial.helpfulVotes}</span>
                            <span>
                              {/* {t.card.foundHelpful} */}
                              <FormattedMessage id="testy.card.foundHelpful" />
                            </span>
                          </div>
                          <button className="group/btn inline-flex items-center text-red-600 hover:text-red-700 text-sm font-semibold transition-colors min-h-[44px] px-2 touch-manipulation">
                            <span>
                          
                              <FormattedMessage id="testy.card.readMore" />
                            </span>
                            <ArrowRight
                              size={14}
                              className="ml-1 transition-transform duration-200 group-hover/btn:translate-x-0.5"
                            />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-col items-center gap-6 mt-12">
                    <div className="flex items-center gap-2">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (pageNum) => (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            disabled={isLoading}
                            className={`min-h-[44px] min-w-[44px] rounded-xl font-semibold transition-all duration-300 touch-manipulation ${
                              pageNum === page
                                ? "bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg scale-110"
                                : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 hover:border-gray-300 hover:scale-105"
                            }`}
                            aria-label={`${intl.formatMessage({ id: "testy.aria.pageButton" })} ${pageNum}`}
                          >
                            {pageNum}
                          </button>
                        )
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      <FormattedMessage id="testy.pagination.page" />
                      {page}
                      <FormattedMessage id="testy.pagination.of" />
                      {totalPages}
                      {/* {t.pagination.page} {page} {t.pagination.of} {totalPages} */}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <style
            dangerouslySetInnerHTML={{
              __html: `
              @keyframes fadeInUp {
                from {
                  opacity: 0;
                  transform: translateY(20px);
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                }
              }
            `,
            }}
          />
        </div>

        {/* CTA Section */}
        <section className="relative bg-gradient-to-r from-red-600 via-red-500 to-orange-500 py-16 sm:py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/20" />
          <div className="absolute inset-0 overflow-hidden">                                                  
            <div className="absolute -top-10 left-1/3 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 right-1/3 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
          </div>                                                                                                            

          <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
            <div className="inline-flex flex-wrap items-center justify-center gap-3 sm:gap-6 bg-white/10 backdrop-blur-sm rounded-2xl px-4 sm:px-8 py-3 sm:py-4 border border-white/20 mb-6 sm:mb-8">
              <div className="flex items-center space-x-2 text-white/90">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="font-medium text-sm sm:text-base">
                  <FormattedMessage id="testy.cta.secured" />
                </span>
              </div>
              <div className="w-px h-4 sm:h-6 bg-white/20 hidden sm:block" />
              <div className="flex items-center space-x-2 text-white/90">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="font-medium text-sm sm:text-base">
                  {/* {t.cta.response5min} */}
                  <FormattedMessage id="testy.cta.response5min" />
                </span>
              </div>
              <div className="w-px h-4 sm:h-6 bg-white/20 hidden sm:block" />
              <div className="flex items-center space-x-2 text-white/90">
                <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="font-medium text-sm sm:text-base">
                  <FormattedMessage id="testy.cta.countries150" />
                </span>
              </div>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-6xl font-black text-white mb-4 sm:mb-6">

              <FormattedMessage id="testy.cta.title" />
            </h2>
            <p className="text-lg sm:text-xl md:text-2xl text-white/95 mb-8 sm:mb-12 leading-relaxed max-w-4xl mx-auto px-4">
              <FormattedMessage id="testy.cta.subtitle" />
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
              <button
                onClick={() => (window.location.href = "/sos-appel")}
                className="group relative overflow-hidden bg-white text-red-600 hover:text-red-700 px-8 sm:px-12 py-4 sm:py-6 rounded-3xl font-black text-lg sm:text-xl transition-all duration-300 hover:scale-110 hover:shadow-2xl flex items-center gap-3 sm:gap-4 min-h-[56px] active:scale-95 touch-manipulation"
              >
                <span>
                  <FormattedMessage id="testy.cta.findExpert" />
                </span>
                <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-2 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-r from-red-50 to-orange-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl" />
              </button>

              <a
                href="/register"
                className="group relative overflow-hidden border-2 border-white bg-transparent text-white px-8 sm:px-12 py-4 sm:py-6 rounded-3xl font-bold text-lg sm:text-xl transition-all duration-300 hover:scale-105 hover:bg-white/10 flex items-center gap-3 sm:gap-4 min-h-[56px] active:scale-95 touch-manipulation"
              >
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
                <span>
                  <FormattedMessage id="testy.cta.becomeExpert" />
                </span>
              </a>
            </div>

            <div className="mt-8 sm:mt-12 text-white/80">
              <p className="text-base sm:text-lg px-4">
                <FormattedMessage id="testy.cta.joinExperts" />
              </p>
            </div>
          </div>
        </section>

      </div>
    </Layout>
  );
};

export default Testimonials;
