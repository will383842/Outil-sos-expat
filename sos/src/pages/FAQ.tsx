import React, { useState, useEffect, useMemo } from "react";
import {
  ChevronDown,
  ChevronUp,
  Search,
  Phone,
  Mail,
  HelpCircle,
  CreditCard,
  Shield,
  Users,
  Globe,
  Briefcase,
  LucideIcon,
} from "lucide-react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";
import { Helmet } from "react-helmet-async";
import Layout from "../components/layout/Layout";
import SEOHead from "../components/layout/SEOHead";
import HreflangLinks from "../multilingual-system/components/HrefLang/HreflangLinks";
import { BreadcrumbSchema, generateBreadcrumbs, FAQPageSchema } from "../components/seo";
import { useApp } from "../contexts/AppContext";
import { useIntl } from "react-intl";
import { getLocaleString, parseLocaleFromPath, getTranslatedRouteSlug } from "../multilingual-system";
import { Link, useLocation } from "react-router-dom";
import { FAQ_CATEGORIES, getTranslatedValue } from "../services/faq";

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  tags: string[];
  slug?: Record<string, string>;
}

const FAQ: React.FC = () => {
  const intl = useIntl();
  const { language } = useApp();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [faqData, setFaqData] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const langCode = language?.split('-')[0] || 'fr';

  // Get current locale from URL (preserves language + country, e.g., "fr-ar", "en-de")
  const { locale: urlLocale } = parseLocaleFromPath(location.pathname);
  const currentLocale = urlLocale || getLocaleString(language as any);

  // Load FAQs from Firestore
  useEffect(() => {
    const loadFAQs = async () => {
      try {
        setLoading(true);
        const faqRef = collection(db, "app_faq");
        const q = query(faqRef, where("isActive", "==", true));
        const snapshot = await getDocs(q);

        const faqs: FAQItem[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Get translations for current language with fallback
          const questionObj = data.question || {};
          const answerObj = data.answer || {};
          const slugObj = data.slug || {};

          const question = questionObj[langCode] || questionObj['fr'] || questionObj['en'] || '';
          const answer = answerObj[langCode] || answerObj['fr'] || answerObj['en'] || '';

          if (question && answer) {
            faqs.push({
              id: doc.id,
              category: data.category || 'general',
              question,
              answer,
              tags: data.tags || [],
              slug: slugObj,
            });
          }
        });

        // Sort by order
        faqs.sort((a, b) => {
          const dataA = snapshot.docs.find(d => d.id === a.id)?.data();
          const dataB = snapshot.docs.find(d => d.id === b.id)?.data();
          return (dataA?.order || 0) - (dataB?.order || 0);
        });

        setFaqData(faqs);
      } catch (error) {
        console.error("Error loading FAQs:", error);
        setFaqData([]);
      } finally {
        setLoading(false);
      }
    };
    loadFAQs();
  }, [langCode]);

  // Map icon names to Lucide components
  const iconMap: Record<string, LucideIcon> = {
    globe: Globe,
    user: Users,
    briefcase: Briefcase,
    "credit-card": CreditCard,
    users: Users,
    shield: Shield,
  };

  // Build categories dynamically from FAQ_CATEGORIES
  const categories = useMemo(() => {
    const allCategory = {
      id: "all",
      name: intl.formatMessage({ id: "faq.categories.all", defaultMessage: langCode === "fr" ? "Toutes" : "All" }),
      icon: HelpCircle,
      count: faqData.length,
    };

    const dynamicCategories = FAQ_CATEGORIES.map((cat) => ({
      id: cat.id,
      name: getTranslatedValue(cat.name, langCode, cat.name.en),
      icon: iconMap[cat.icon] || HelpCircle,
      count: faqData.filter((item) => item.category === cat.id).length,
    }));

    return [allCategory, ...dynamicCategories];
  }, [faqData, langCode, intl]);

  const filteredFAQ = faqData.filter((item) => {
    const matchesCategory =
      selectedCategory === "all" || item.category === selectedCategory;
    const normalize = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const normalizedSearch = normalize(searchTerm);
    const matchesSearch =
      normalize(item.question).includes(normalizedSearch) ||
      normalize(item.answer).includes(normalizedSearch) ||
      item.tags.some((tag) => normalize(tag).includes(normalizedSearch));
    return matchesCategory && matchesSearch;
  });

  const toggleItem = (id: string) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(id)) {
      newOpenItems.delete(id);
    } else {
      newOpenItems.add(id);
    }
    setOpenItems(newOpenItems);
  };

  // Signal to Puppeteer that FAQ data is loaded
  useEffect(() => {
    if (!loading && faqData.length > 0) {
      document.documentElement.setAttribute('data-article-loaded', 'true');
    }
    return () => { document.documentElement.removeAttribute('data-article-loaded'); };
  }, [loading, faqData.length]);

  // noindex if no FAQs loaded (thin content) and not loading
  const noIndexEmpty = !loading && faqData.length === 0;

  // noindex for non-canonical locale variants (e.g. /fr-ma/faq, /fr-be/faq)
  // Only the canonical locale per language (fr-fr, en-us, es-es…) should be indexed
  // This prevents 17 000+ duplicate URLs from being crawled/indexed by Google
  const canonicalLocale = getLocaleString(langCode as any) || 'fr-fr';
  const isNonCanonicalLocale = currentLocale.toLowerCase() !== canonicalLocale.toLowerCase();

  // ItemList JSON-LD for rich results (top 10 FAQ links)
  const faqRouteSlug = getTranslatedRouteSlug("faq" as any, language as any) || 'faq';
  // CANONICAL: always use the default locale for this language (fr-fr, NOT fr-ma)
  const faqPageUrl = `https://sos-expat.com/${canonicalLocale}/${faqRouteSlug}`;
  const itemListSchema = faqData.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": intl.formatMessage({ id: "faq.heroTitle", defaultMessage: "Frequently Asked Questions" }),
    "url": faqPageUrl,
    "numberOfItems": faqData.length,
    "itemListElement": faqData.slice(0, 10).map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.question,
      "url": `${faqPageUrl}/${item.slug?.[langCode] || item.slug?.['fr'] || item.slug?.['en'] || item.id}`,
    })),
  } : null;

  return (
    <Layout>
      {/* Speakable schema + ItemList JSON-LD + noindex if empty */}
      <Helmet>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "speakable": {
            "@type": "SpeakableSpecification",
            "cssSelector": [".faq-answer", "h1", "h2"]
          },
          "url": faqPageUrl,
        })}</script>
        {itemListSchema && (
          <script type="application/ld+json">{JSON.stringify(itemListSchema)}</script>
        )}
        {/* noindex: vide OU variante pays non-canonique (ex: /fr-ma/faq → noindex, /fr-fr/faq → index) */}
        {(noIndexEmpty || isNonCanonicalLocale) && <meta name="robots" content="noindex,follow" />}
      </Helmet>
      <SEOHead
        title={intl.formatMessage({ id: "faq.heroTitle", defaultMessage: "Frequently Asked Questions" }) + " | SOS Expat & Travelers"}
        description={
          !loading && faqData.length > 0
            ? intl.formatMessage({ id: "faq.heroSubtitle", defaultMessage: "Find answers about SOS Expat & Travelers" }) +
              ` (${faqData.length} ${intl.formatMessage({ id: "faq.title", defaultMessage: "FAQ" })})`
            : intl.formatMessage({ id: "faq.heroSubtitle", defaultMessage: "Find answers about SOS Expat & Travelers" })
        }
        canonicalUrl={faqPageUrl}
        author="Manon"
        contentType="FAQPage"
        noindex={noIndexEmpty || isNonCanonicalLocale}
        locale={({ fr: 'fr_FR', en: 'en_US', es: 'es_ES', de: 'de_DE', pt: 'pt_PT', ru: 'ru_RU', ch: 'zh_CN', hi: 'hi_IN', ar: 'ar_SA' } as Record<string, string>)[language] || 'fr_FR'}
        expertise="Legal Services, Expat Assistance, International Law"
        trustworthiness="verified_lawyers, gdpr_compliant, 197_countries"
        contentQuality="high"
        lastReviewed={new Date().toISOString().split('T')[0]}
        aiSummary={
          !loading && faqData.length > 0
            ? `${faqData.length} frequently asked questions about expat assistance, legal services and international travel across 197 countries. Topics: ${[...new Set(faqData.slice(0, 5).map(f => f.category))].join(', ')}.`
            : undefined
        }
      />
      {/* HreflangLinks removed: handled globally in App.tsx L1086 */}

      {/* FAQPage JSON-LD (dedicated, clean schema for Google Rich Results) */}
      {faqData.length > 0 && (
        <FAQPageSchema
          faqs={filteredFAQ.slice(0, 10).map((item) => ({
            question: item.question,
            answer: item.answer,
          }))}
          pageUrl={faqPageUrl}
          inLanguage={langCode === 'ch' ? 'zh' : langCode}
        />
      )}

      {/* BreadcrumbList JSON-LD */}
      <BreadcrumbSchema
        items={generateBreadcrumbs.faq(
          intl.formatMessage({ id: "breadcrumb.home", defaultMessage: "Accueil" }),
          intl.formatMessage({ id: "faq.title", defaultMessage: "FAQ" })
        )}
      />

      {/* ── BREADCRUMB VISUEL ── */}
      <nav aria-label="breadcrumb" className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
            <li>
              <a href={`/${language}`} className="hover:text-red-600 transition-colors">
                {intl.formatMessage({ id: "breadcrumb.home", defaultMessage: "Accueil" })}
              </a>
            </li>
            <li><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 shrink-0"><polyline points="9 18 15 12 9 6"/></svg></li>
            <li className="text-gray-900 font-medium">{intl.formatMessage({ id: "faq.title", defaultMessage: "FAQ" })}</li>
          </ol>
        </div>
      </nav>

      {/* HERO dark slate standard SOS Expat */}
      <div className="min-h-screen bg-white">
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pt-16 pb-12 sm:pt-28 sm:pb-20">
          <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
          <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-red-600/5 rounded-full blur-3xl" />

          <div className="relative mx-auto max-w-6xl px-4 text-center">
            <span className="inline-flex items-center gap-2 border border-red-600/30 bg-red-600/10 text-red-400 rounded-full px-4 py-1.5 text-sm font-semibold mb-6">
              <HelpCircle className="w-4 h-4" />
              {intl.formatMessage({ id: "faq.title" })}
            </span>

            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              {intl.formatMessage({ id: "faq.heroTitle" })}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg text-slate-400">
              {intl.formatMessage({ id: "faq.heroSubtitle" })}
            </p>

            {/* Stats visibles = signal E-E-A-T + contenu de valeur pour Google */}
            {!loading && faqData.length > 0 && (
              <div className="mt-6 flex flex-wrap justify-center gap-6 text-sm text-slate-400">
                <span className="flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-red-400" />
                  <strong className="text-white">{faqData.length}</strong>
                  {' '}{intl.formatMessage({ id: "faq.title", defaultMessage: "FAQ" })}
                </span>
                <span className="flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-red-400" />
                  <strong className="text-white">197</strong>
                  {' '}countries
                </span>
                <span className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-red-400" />
                  <strong className="text-white">9</strong>
                  {' '}languages
                </span>
              </div>
            )}

            {/* Barre de recherche */}
            <div className="mt-8 max-w-2xl mx-auto">
              <div className="relative group">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"
                  size={20}
                />
                <input
                  type="text"
                  placeholder={intl.formatMessage({
                    id: "faq.searchPlaceholder",
                  })}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-800/60 text-white placeholder-slate-400 border border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-red-500/40 backdrop-blur-sm shadow-xl"
                />
                <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-slate-700/30 group-focus-within:ring-red-500/30" />
              </div>
            </div>
          </div>
        </section>

        {/* CONTENU */}
        <section className="bg-white">
          <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* SIDEBAR catégories */}
              <aside className="lg:col-span-1">
                <div className="sticky top-6">
                  <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      {intl.formatMessage({ id: "faq.categories" })}
                    </h3>
                    <div className="space-y-2">
                      {categories.map((category) => {
                        const Icon = category.icon;
                        const isActive = selectedCategory === category.id;
                        return (
                          <button
                            key={category.id}
                            onClick={() => setSelectedCategory(category.id)}
                            className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all border ${
                              isActive
                                ? "bg-gradient-to-r from-red-50 to-orange-50 border-red-200 text-red-700 shadow-sm"
                                : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                            }`}
                            aria-pressed={isActive}
                          >
                            <span className="flex items-center gap-3">
                              <span
                                className={`inline-flex items-center justify-center w-8 h-8 rounded-xl ${
                                  isActive
                                    ? "bg-gradient-to-r from-red-500 to-orange-500 text-white"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                <Icon size={16} />
                              </span>
                              <span className="font-medium">
                                {category.name}
                              </span>
                            </span>
                            <span
                              className={`text-sm px-2 py-1 rounded-full ${
                                isActive
                                  ? "bg-red-100 text-red-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {category.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {(searchTerm.trim().length > 0 ||
                      selectedCategory !== "all") && (
                      <div className="mt-4">
                        <button
                          onClick={() => {
                            setSearchTerm("");
                            setSelectedCategory("all");
                          }}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 bg-gray-900 text-white font-semibold hover:opacity-90 transition"
                        >
                          {intl.formatMessage({ id: "faq.resetFilters" })}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </aside>

              {/* LISTE FAQ */}
              <main className="lg:col-span-3">
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="rounded-3xl border border-gray-200 bg-white p-6 animate-pulse">
                        <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                        <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {filteredFAQ.map((item) => {
                        const isOpen = openItems.has(item.id);
                        const panelId = `faq-panel-${item.id}`;
                        const buttonId = `faq-button-${item.id}`;
                        return (
                          <div
                            key={item.id}
                            className={`rounded-3xl border overflow-hidden transition-all ${
                              isOpen
                                ? "border-red-200 bg-gradient-to-br from-red-50 to-orange-50"
                                : "border-gray-200 bg-white"
                            }`}
                          >
                            <div className="w-full px-6 py-5 flex items-center justify-between hover:bg-white/60">
                              <div className="flex items-center gap-3 pr-4 flex-1">
                                <span
                                  className={`inline-flex items-center justify-center w-8 h-8 rounded-xl ${
                                    isOpen
                                      ? "bg-gradient-to-r from-red-500 to-orange-500 text-white"
                                      : "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  <HelpCircle size={18} />
                                </span>
                                <Link
                                  to={`/${currentLocale}/${faqRouteSlug}/${item.slug?.[langCode] || item.slug?.['fr'] || item.slug?.['en'] || item.id}`}
                                  className="faq-question text-lg md:text-xl font-bold text-gray-900 flex-1 hover:text-red-600 transition-colors"
                                >
                                  {item.question}
                                </Link>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  id={buttonId}
                                  aria-controls={panelId}
                                  aria-expanded={isOpen}
                                  onClick={() => toggleItem(item.id)}
                                  className={`shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-xl border transition-all ${
                                    isOpen
                                      ? "border-red-300 bg-white text-red-600 rotate-180"
                                      : "border-gray-200 bg-gray-50 text-gray-600"
                                  }`}
                                >
                                  {isOpen ? (
                                    <ChevronUp size={18} />
                                  ) : (
                                    <ChevronDown size={18} />
                                  )}
                                </button>
                              </div>
                            </div>

                            {isOpen && (
                              <div
                                id={panelId}
                                role="region"
                                aria-labelledby={buttonId}
                                className="px-6 pb-5"
                              >
                                <div className="border-t border-white/60 md:border-white/60 pt-4">
                                  <p className="faq-answer text-gray-700 leading-relaxed whitespace-pre-line">
                                    {item.answer}
                                  </p>

                                  {/* Tags */}
                                  {item.tags && item.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-4">
                                      {item.tags.map((tag, index) => (
                                        <span
                                          key={index}
                                          className="inline-flex rounded-full p-[1px] bg-gradient-to-r from-red-500 to-orange-500"
                                        >
                                          <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-red-700 border border-red-200">
                                            {tag}
                                          </span>
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {filteredFAQ.length === 0 && (
                      <div className="text-center py-16 rounded-3xl border border-dashed border-gray-300 bg-white">
                        <div className="text-gray-600 text-lg mb-4">
                          {intl.formatMessage({ id: "faq.noResults" })}
                        </div>
                        <button
                          onClick={() => {
                            setSearchTerm("");
                            setSelectedCategory("all");
                          }}
                          className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 bg-gradient-to-r from-red-600 to-orange-500 text-white font-semibold hover:opacity-95 transition"
                        >
                          {intl.formatMessage({ id: "faq.resetFilters" })}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </main>
            </div>
          </div>
        </section>

        {/* CTA SUPPORT */}
        <section className="relative py-20 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-black/10 via-transparent to-black/10 pointer-events-none" />
          <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-3">
              {intl.formatMessage({ id: "faq.supportTitle" })}
            </h2>
            <p className="text-lg md:text-xl text-white/95 mb-8">
              {intl.formatMessage({ id: "faq.supportSubtitle" })}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href={`/${currentLocale}/contact`}
                className="group relative overflow-hidden bg-white text-red-600 hover:text-red-700 px-8 py-4 rounded-2xl font-bold transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
              >
                <Mail size={20} />
                <span>
                  {intl.formatMessage({ id: "faq.contactForm" })}
                </span>
                <span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-black/5" />
              </a>

              <a
                href={`/${currentLocale}/sos-appel`}
                className="group relative overflow-hidden border-2 border-white bg-transparent text-white px-8 py-4 rounded-2xl font-bold transition-all duration-300 hover:scale-105 hover:bg-white/10 flex items-center justify-center gap-2"
              >
                <Phone size={20} />
                <span>
                  {intl.formatMessage({ id: "faq.emergencyCall" })}
                </span>
                <span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/30" />
              </a>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default FAQ;
