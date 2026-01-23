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
import Layout from "../components/layout/Layout";
import SEOHead from "../components/layout/SEOHead";
import { BreadcrumbSchema, generateBreadcrumbs } from "../components/seo";
import { useApp } from "../contexts/AppContext";
import { useIntl } from "react-intl";
import { getLocaleString, parseLocaleFromPath } from "../multilingual-system";
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
        const faqRef = collection(db, "faqs");
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
    const lowerSearch = searchTerm.toLowerCase();
    const matchesSearch =
      item.question.toLowerCase().includes(lowerSearch) ||
      item.answer.toLowerCase().includes(lowerSearch) ||
      item.tags.some((tag) => tag.toLowerCase().includes(lowerSearch));
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

  return (
    <Layout>
      <SEOHead
        title={intl.formatMessage({ id: "faq.heroTitle", defaultMessage: "Frequently Asked Questions" }) + " | SOS Expat & Travelers"}
        description={intl.formatMessage({ id: "faq.heroSubtitle", defaultMessage: "Find answers about SOS Expat & Travelers" })}
        canonicalUrl="/faq"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqData.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer,
            },
          })),
        }}
      />

      {/* BreadcrumbList JSON-LD */}
      <BreadcrumbSchema
        items={generateBreadcrumbs.faq(
          intl.formatMessage({ id: "breadcrumb.home", defaultMessage: "Accueil" }),
          intl.formatMessage({ id: "faq.title", defaultMessage: "FAQ" })
        )}
      />

      {/* HERO sombre, effet verre + dégradés */}
      <div className="min-h-screen bg-gray-950">
        <section className="relative py-20 md:py-28 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-transparent to-blue-500/10 pointer-events-none" />
          <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl" />

          <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
            <span className="inline-flex rounded-full p-[1px] bg-gradient-to-r from-red-500 to-orange-500 mb-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 border border-white/15 backdrop-blur text-white">
                <HelpCircle className="w-4 h-4" />
                <strong className="font-semibold">
                  {intl.formatMessage({ id: "faq.title" })}
                </strong>
              </span>
            </span>

            <h1 className="text-4xl md:text-6xl font-black leading-tight text-white">
              {intl.formatMessage({ id: "faq.heroTitle" })}
            </h1>
            <p className="mt-3 md:mt-4 text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
              {intl.formatMessage({ id: "faq.heroSubtitle" })}
            </p>

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
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/10 text-white placeholder-gray-300 border border-white/15 focus:outline-none focus:ring-2 focus:ring-white/40 backdrop-blur-sm shadow-xl"
                />
                <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/10 group-focus-within:ring-white/30" />
              </div>
            </div>
          </div>
        </section>

        {/* CONTENU */}
        <section className="relative bg-gradient-to-b from-white to-gray-50">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-gradient-to-r from-red-400/10 to-orange-400/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/3 left-1/4 w-72 h-72 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-7xl mx-auto px-6 py-12 md:py-16">
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
                                  to={`/${currentLocale}/faq/${item.slug?.[langCode] || item.slug?.['fr'] || item.slug?.['en'] || item.id}`}
                                  className="text-lg md:text-xl font-bold text-gray-900 flex-1 hover:text-red-600 transition-colors"
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
                                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
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
          <div className="absolute inset-0 bg-gradient-to-br from-black/10 via-transparent to-black/10" />
          <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-3">
              {intl.formatMessage({ id: "faq.supportTitle" })}
            </h2>
            <p className="text-lg md:text-xl text-white/95 mb-8">
              {intl.formatMessage({ id: "faq.supportSubtitle" })}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/contact"
                className="group relative overflow-hidden bg-white text-red-600 hover:text-red-700 px-8 py-4 rounded-2xl font-bold transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
              >
                <Mail size={20} />
                <span>
                  {intl.formatMessage({ id: "faq.contactForm" })}
                </span>
                <span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-black/5" />
              </a>

              <a
                href="/sos-appel"
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
