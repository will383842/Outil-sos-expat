// src/pages/NotFound.tsx
import React, { useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useIntl, FormattedMessage } from "react-intl";
import { Home, Search, ArrowLeft, AlertCircle } from "lucide-react";
import Layout from "../components/layout/Layout";
import SEOHead from "../components/layout/SEOHead";
import { useApp } from "../contexts/AppContext";
import { parseLocaleFromPath, getLocaleString, getTranslatedRouteSlug, useLocaleNavigate } from "../multilingual-system";

const NotFound: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const location = useLocation();
  const { language } = useApp();

  const [searchQuery, setSearchQuery] = useState("");

  // Extract locale from current path
  const { locale, pathWithoutLocale } = parseLocaleFromPath(location.pathname);
  const currentLocale = locale || getLocaleString(language);

  // Popular routes to suggest with fallback labels
  const popularRoutes = useMemo(() => {
    const routeLabels: Record<string, Record<string, string>> = {
      home: {
        en: "Home",
        fr: "Accueil",
        es: "Inicio",
        de: "Startseite",
        pt: "Início",
        ru: "Главная",
        hi: "होम",
        ch: "首页",
        ar: "الرئيسية",
      },
      "sos-call": {
        en: "Emergency Call",
        fr: "Appel d'urgence",
        es: "Llamada de emergencia",
        de: "Notruf",
        pt: "Chamada de emergência",
        ru: "Экстренный звонок",
        hi: "आपात कॉल",
        ch: "紧急呼叫",
        ar: "مكالمة طوارئ",
      },
      pricing: {
        en: "Pricing",
        fr: "Tarifs",
        es: "Precios",
        de: "Preise",
        pt: "Preços",
        ru: "Цены",
        hi: "मूल्य निर्धारण",
        ch: "价格",
        ar: "الأسعار",
      },
      "how-it-works": {
        en: "How It Works",
        fr: "Comment ça marche",
        es: "Cómo funciona",
        de: "So funktioniert's",
        pt: "Como funciona",
        ru: "Как это работает",
        hi: "यह कैसे काम करता है",
        ch: "工作原理",
        ar: "كيف يعمل",
      },
      faq: {
        en: "FAQ",
        fr: "FAQ",
        es: "Preguntas frecuentes",
        de: "FAQ",
        pt: "Perguntas frequentes",
        ru: "Часто задаваемые вопросы",
        hi: "सामान्य प्रश्न",
        ch: "常见问题",
        ar: "الأسئلة الشائعة",
      },
      contact: {
        en: "Contact",
        fr: "Contact",
        es: "Contacto",
        de: "Kontakt",
        pt: "Contato",
        ru: "Контакты",
        hi: "संपर्क",
        ch: "联系",
        ar: "اتصل بنا",
      },
      testimonials: {
        en: "Testimonials",
        fr: "Témoignages",
        es: "Testimonios",
        de: "Testimonials",
        pt: "Depoimentos",
        ru: "Отзывы",
        hi: "प्रशंसापत्र",
        ch: "客户评价",
        ar: "الشهادات",
      },
    };

    const routes = [
      { key: "home" as const, icon: "🏠" },
      { key: "sos-call" as const, icon: "🚨" },
      { key: "pricing" as const, icon: "💰" },
      { key: "how-it-works" as const, icon: "❓" },
      { key: "faq" as const, icon: "💬" },
      { key: "contact" as const, icon: "📧" },
      { key: "testimonials" as const, icon: "⭐" },
    ];

    return routes.map((route) => {
      // For home, use root path
      if (route.key === "home") {
        return {
          ...route,
          slug: "",
          path: `/${currentLocale}`,
          label: routeLabels[route.key]?.[language] || route.key,
        };
      }
      
      const slug = getTranslatedRouteSlug(route.key, language);
      return {
        ...route,
        slug,
        path: `/${currentLocale}/${slug}`,
        label: routeLabels[route.key]?.[language] || route.key,
      };
    });
  }, [language, currentLocale]);

  // Filter suggestions based on search query
  const filteredSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return popularRoutes.slice(0, 6);

    const query = searchQuery.toLowerCase();
    return popularRoutes
      .filter((route) => {
        const label = route.label.toLowerCase();
        const slug = route.slug.toLowerCase();
        return label.includes(query) || slug.includes(query);
      })
      .slice(0, 6);
  }, [searchQuery, popularRoutes]);

  const handleGoHome = () => {
    navigate(`/${currentLocale}${location.search || ''}`, { replace: true });
  };

  const handleSuggestionClick = (path: string) => {
    navigate(`${path}${location.search || ''}`, { replace: true });
  };

  return (
    <Layout>
      <SEOHead
        title={intl.formatMessage({ id: "error.404.title" })}
        description={intl.formatMessage({ id: "error.404.description" })}
        canonicalUrl={`/${currentLocale}/404`}
        noindex={true}
      />

      <div data-page-not-found="true" className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-12">
        <div className="max-w-2xl w-full text-center">
          {/* 404 Icon/Number */}
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-red-50 dark:bg-red-900/20 mb-6">
              <AlertCircle className="w-16 h-16 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-4">404</h1>
            <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              <FormattedMessage id="error.404.title" defaultMessage="Page Not Found" />
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              <FormattedMessage
                id="error.404.description"
                defaultMessage="The page you're looking for doesn't exist or has been moved."
              />
            </p>
          </div>

          {/* Search Suggestions */}
          <div className="mb-8">
            <div className="mb-4">
              <label htmlFor="search-404" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FormattedMessage
                  id="error.404.suggestions"
                  defaultMessage="Search for a page:"
                />
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="search-404"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={intl.formatMessage(
                    { id: "error.404.searchPlaceholder" },
                    { defaultMessage: "Search pages..." }
                  )}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>

            {/* Suggested Routes */}
            {filteredSuggestions.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {filteredSuggestions.map((route) => (
                  <button
                    key={route.key}
                    onClick={() => handleSuggestionClick(route.path)}
                    className="flex items-center gap-2 p-3 text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group"
                  >
                    <span className="text-xl">{route.icon}</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-red-600 dark:group-hover:text-red-400">
                      {route.label}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {filteredSuggestions.length === 0 && searchQuery.trim() && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                <FormattedMessage
                  id="error.404.noResults"
                  defaultMessage="No pages found matching your search."
                />
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={handleGoHome}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors shadow-md hover:shadow-lg"
            >
              <Home className="w-5 h-5" />
              <FormattedMessage id="error.404.backHome" defaultMessage="Back to Home" />
            </button>

            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <FormattedMessage id="error.404.goBack" defaultMessage="Go Back" />
            </button>
          </div>

          {/* Additional Help */}
          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              <FormattedMessage
                id="error.404.helpText"
                defaultMessage="If you believe this is an error, please contact our support team."
              />
            </p>
            <a
              href={`/${currentLocale}/contact${location.search || ''}`}
              className="text-red-600 dark:text-red-400 hover:underline font-medium"
            >
              <FormattedMessage id="error.404.contactSupport" defaultMessage="Contact Support" />
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default NotFound;

