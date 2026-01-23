import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Search,
  Phone,
  Mail,
  Book,
  Users,
  CreditCard,
  HelpCircle,
  LucideIcon,
  Clock,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import Layout from "../components/layout/Layout";
import { useApp } from "../contexts/AppContext";
import { useIntl } from "react-intl";
import { parseLocaleFromPath, getLocaleString } from "../multilingual-system";
import {
  listHelpCategories,
  listHelpArticles,
  HelpCategory as FirestoreCategory,
  HelpArticle as FirestoreArticle,
} from "../services/helpCenter";

interface Article {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  readTime: number;
  content: string;
  slug: string;
}

// Icon mapping from string to component
const iconMap: Record<string, LucideIcon> = {
  phone: Phone,
  book: Book,
  users: Users,
  creditcard: CreditCard,
  helpcircle: HelpCircle,
  mail: Mail,
  search: Search,
};

const getIcon = (iconName?: string): LucideIcon => {
  if (!iconName) return Book;
  const key = iconName.toLowerCase().replace(/[^a-z0-9]/g, "");
  return iconMap[key] || Book;
};

// Helper to get translated value from string or Record<string, string>
const getTranslatedValue = (
  value: string | Record<string, string> | undefined,
  locale: string,
  fallback: string = ""
): string => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value[locale] || value["en"] || value["fr"] || Object.values(value)[0] || fallback;
  }
  return fallback;
};

// Helper to get translated tags from array or Record<string, string[]>
const getTranslatedTags = (
  value: string[] | Record<string, string[]> | undefined,
  locale: string
): string[] => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    return value[locale] || value["en"] || value["fr"] || Object.values(value)[0] || [];
  }
  return [];
};

// Helper to get "All categories" text in the selected language
const getAllCategoriesText = (locale: string): string => {
  const translations: Record<string, string> = {
    en: "All categories",
    fr: "Toutes les catégories",
    es: "Todas las categorías",
    de: "Alle Kategorien",
    hi: "सभी श्रेणियां",
    ar: "جميع الفئات",
    ch: "所有类别",
    pt: "Todas as categorias",
    ru: "Все категории",
  };
  return translations[locale] || translations["en"];
};

// Interface for hierarchical category structure
interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  icon: LucideIcon;
  count: number;
  parentSlug?: string;
  children?: CategoryNode[];
}

const HelpCenter: React.FC = () => {
  const intl = useIntl();
  const { language } = useApp();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [rawCategories, setRawCategories] = useState<FirestoreCategory[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);

  // Get current locale from URL (preserves language + country, e.g., "fr-ar", "en-de")
  const { locale: urlLocale, lang: urlLang, country: urlCountry } = parseLocaleFromPath(location.pathname);
  const currentLocale = urlLocale || getLocaleString(language as any);
  const langCode = urlLang || language || 'fr';

  // Load categories and articles from Firestore
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Use the selected language as locale (matches Firestore locale keys: en, hi, ar, ch, de, es, fr, pt, ru)
        const locale = language;
        // Load all categories and articles (they contain translations)
        const [firestoreCategories, firestoreArticles] = await Promise.all([
          listHelpCategories(), // Load all categories
          listHelpArticles({ onlyPublished: true }), // Load all published articles
        ]);

        // Filter only published categories
        const publishedCategories = firestoreCategories.filter(
          (cat) => cat.isPublished
        );

        // Transform Firestore articles to component format
        // First, deduplicate articles - if there are multiple documents per article (one per locale),
        // we'll group them by categoryId and English slug/title to get unique articles
        const articleMap = new Map<string, FirestoreArticle>();

        for (const art of firestoreArticles) {
          // Use categoryId + English slug as unique key (or English title if slug is not available)
          const englishSlug = getTranslatedValue(art.slug, "en");
          const englishTitle = getTranslatedValue(art.title, "en");
          const uniqueKey = `${art.categoryId}-${englishSlug || englishTitle}`;

          // Keep the first occurrence (or prefer the one matching current locale)
          if (!articleMap.has(uniqueKey)) {
            articleMap.set(uniqueKey, art);
          } else if (art.locale === locale) {
            // Prefer the document that matches the current locale
            articleMap.set(uniqueKey, art);
          }
        }

        // Transform deduplicated articles
        const transformedArticles: Article[] = Array.from(articleMap.values()).map(
          (art: FirestoreArticle) => ({
            id: art.id,
            title: getTranslatedValue(art.title, locale),
            excerpt: getTranslatedValue(art.excerpt, locale),
            category: art.categoryId,
            tags: getTranslatedTags(art.tags, locale),
            readTime: art.readTime,
            content: getTranslatedValue(art.content, locale),
            slug: getTranslatedValue(art.slug, locale),
          })
        );

        setArticles(transformedArticles);
        setRawCategories(publishedCategories);
      } catch (error) {
        console.error("Error loading help center data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, [language]);

  // Build hierarchical category structure
  const { mainCategories } = useMemo(() => {
    const locale = language;

    // Create a map of parentSlug -> subcategories
    const subcatMap = new Map<string, CategoryNode[]>();

    for (const cat of rawCategories) {
      const slugFr = typeof cat.slug === 'string' ? cat.slug : (cat.slug?.fr || '');

      if (cat.parentSlug) {
        const existing = subcatMap.get(cat.parentSlug) || [];
        existing.push({
          id: cat.id,
          name: getTranslatedValue(cat.name, locale),
          slug: slugFr,
          icon: getIcon(cat.icon),
          count: articles.filter(a => a.category === cat.id).length,
          parentSlug: cat.parentSlug,
        });
        subcatMap.set(cat.parentSlug, existing);
      }
    }

    // Get main categories (no parentSlug) and attach children
    const mainCats: CategoryNode[] = rawCategories
      .filter(cat => !cat.parentSlug)
      .map(cat => {
        const slugFr = typeof cat.slug === 'string' ? cat.slug : (cat.slug?.fr || '');
        const children = subcatMap.get(slugFr) || [];
        // Count articles in all subcategories
        const totalArticles = children.reduce((sum, child) => sum + child.count, 0);
        return {
          id: cat.id,
          name: getTranslatedValue(cat.name, locale),
          slug: slugFr,
          icon: getIcon(cat.icon),
          count: totalArticles,
          children: children.sort((a, b) => a.name.localeCompare(b.name)),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return { mainCategories: mainCats };
  }, [rawCategories, articles, language]);

  // --- Articles (loaded from Firestore) ---
  // Static articles removed - now loaded dynamically

  // --- Filtrage ---
  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      let matchesCategory = false;
      if (selectedCategory === "all") {
        matchesCategory = true;
      } else {
        // Check if selected is a main category (has children)
        const mainCat = mainCategories.find(c => c.id === selectedCategory);
        if (mainCat && mainCat.children && mainCat.children.length > 0) {
          // Include articles from all subcategories
          const subcatIds = mainCat.children.map(c => c.id);
          matchesCategory = subcatIds.includes(article.category);
        } else {
          // It's a subcategory, match directly
          matchesCategory = article.category === selectedCategory;
        }
      }

      const q = searchTerm.toLowerCase();
      const matchesSearch =
        article.title.toLowerCase().includes(q) ||
        article.excerpt.toLowerCase().includes(q) ||
        article.tags.some((tag) => tag.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [articles, selectedCategory, searchTerm, mainCategories]);

  // --- Handlers ---
  const handleMainCategoryClick = (category: CategoryNode) => {
    // Toggle expansion
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category.id)) {
      newExpanded.delete(category.id);
    } else {
      newExpanded.add(category.id);
    }
    setExpandedCategories(newExpanded);
    // Select the main category (shows all articles from subcategories)
    setSelectedCategory(category.id);
    setSearchTerm("");
  };

  const handleSubcategoryClick = (subcategoryId: string) => {
    setSelectedCategory(subcategoryId);
    setSearchTerm("");
  };

  const handleAllClick = () => {
    setSelectedCategory("all");
    setExpandedCategories(new Set());
    setSearchTerm("");
  };

  // --- Helper rendu markdown léger (présentation uniquement) ---
  const mdToHtml = (md: string): string => {
    // Échapper le HTML brut
    let html = md
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Titres
    html = html
      .replace(
        /^### (.*)$/gm,
        '<h3 class="mt-6 mb-2 text-xl font-white text-white font-extrabold">$1</h3>'
      )
      .replace(
        /^## (.*)$/gm,
        '<h2 class="mt-8 mb-3 text-2xl font-white text-white">$1</h2>'
      )
      .replace(
        /^# (.*)$/gm,
        '<h1 class="mt-10 mb-4 text-3xl md:text-4xl font-white text-white">$1</h1>'
      );

    // Gras
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // Listes
    html = html
      .replace(/^\d+\.\s+(.*)$/gm, "<li>$1</li>")
      .replace(/^-\s+(.*)$/gm, "<li>$1</li>");
    html = html.replace(
      /(?:^|\n)((?:<li>.*<\/li>\n?)+)/g,
      (_m, list: string) =>
        `<ul class="list-disc pl-6 my-4 space-y-1">${list}</ul>`
    );

    // Paragraphes
    html = html.replace(
      /^(?!<h\d|<ul|<\/ul>|<li>|<\/li>|\s*$)(.+)$/gm,
      '<p class="leading-relaxed text-gray-300">$1</p>'
    );

    return html;
  };

  // ======================= Vue liste =======================
  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* HERO */}
        <header className="relative bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-transparent to-blue-500/10 pointer-events-none" />
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <h1 className="text-4xl md:text-6xl text-white font-bold mb-4">
              {/* {language === 'fr' ? "Centre d'aide" : 'Help Center'} */}
              {intl.formatMessage({ id: "helpCenter.title" })}
            </h1>
            <p className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto mb-8">
              {/* {language === 'fr'
                ? 'Trouvez rapidement des réponses et des guides internationaux.'
                : 'Quickly find international answers and guides.'} */}
              {intl.formatMessage({ id: "helpCenter.subtitle" })}
            </p>

            {/* Barre de recherche */}
            <div className="max-w-2xl mx-auto">
              <div className="relative group">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60"
                  size={20}
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={
                    // language === "fr"
                    //   ? "Rechercher dans l'aide..."
                    //   : "Search help..."
                    intl.formatMessage({ id: "helpCenter.searchPlaceholder" })
                  }
                  aria-label={
                    // language === "fr"
                    //   ? "Champ de recherche du centre d'aide"
                    //   : "Help center search field"
                    intl.formatMessage({
                      id: "helpCenter.searchLabel",
                    })
                  }
                  className="w-full pl-12 pr-4 py-4 rounded-2xl text-base md:text-lg bg-white/10 border border-white/20 placeholder-white/60 text-white focus:outline-none focus:ring-2 focus:ring-white/40 backdrop-blur-md transition-shadow shadow-[0_0_0_0_rgba(0,0,0,0)] focus:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)]"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Contenu */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar catégories */}
            <aside className="lg:col-span-1">
              <div className="sticky top-6 rounded-3xl bg-white border border-gray-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {intl.formatMessage({ id: "helpCenter.categories" })}
                </h3>
                <div className="space-y-2">
                  {/* "All" button */}
                  <button
                    onClick={handleAllClick}
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all border ${
                      selectedCategory === "all"
                        ? "bg-blue-50 text-blue-700 border-blue-200 shadow-sm"
                        : "text-gray-700 hover:bg-blue-50 hover:text-blue-700 border-transparent"
                    }`}
                    aria-pressed={selectedCategory === "all"}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${
                          selectedCategory === "all"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        <Book size={18} />
                      </span>
                      <span className="font-medium">{getAllCategoriesText(language)}</span>
                    </span>
                    <span
                      className={`text-sm px-2 py-1 rounded-full ${
                        selectedCategory === "all"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {articles.length}
                    </span>
                  </button>

                  {/* Hierarchical categories */}
                  {mainCategories.map((category) => {
                    const Icon = category.icon;
                    const isExpanded = expandedCategories.has(category.id);
                    const isActive = selectedCategory === category.id;
                    const hasChildren = category.children && category.children.length > 0;

                    return (
                      <div key={category.id}>
                        {/* Main category */}
                        <button
                          onClick={() => handleMainCategoryClick(category)}
                          className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all border ${
                            isActive
                              ? "bg-blue-50 text-blue-700 border-blue-200 shadow-sm"
                              : "text-gray-700 hover:bg-blue-50 hover:text-blue-700 border-transparent"
                          }`}
                          aria-pressed={isActive}
                          aria-expanded={isExpanded}
                        >
                          <span className="flex items-center gap-3">
                            {hasChildren && (
                              <span className="text-gray-400">
                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              </span>
                            )}
                            <span
                              className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${
                                isActive
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              <Icon size={18} />
                            </span>
                            <span className="font-medium text-sm">{category.name}</span>
                          </span>
                          <span
                            className={`text-sm px-2 py-1 rounded-full ${
                              isActive
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {category.count}
                          </span>
                        </button>

                        {/* Subcategories (shown when expanded) */}
                        {hasChildren && isExpanded && (
                          <div className="ml-6 mt-1 space-y-1 border-l-2 border-gray-100 pl-3">
                            {category.children!.map((subcat) => {
                              const SubIcon = subcat.icon;
                              const isSubActive = selectedCategory === subcat.id;
                              return (
                                <button
                                  key={subcat.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSubcategoryClick(subcat.id);
                                  }}
                                  className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all ${
                                    isSubActive
                                      ? "bg-blue-50 text-blue-700"
                                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                  }`}
                                  aria-pressed={isSubActive}
                                >
                                  <span className="flex items-center gap-2">
                                    <SubIcon size={14} className="text-gray-400" />
                                    <span className="text-sm">{subcat.name}</span>
                                  </span>
                                  <span
                                    className={`text-xs px-1.5 py-0.5 rounded-full ${
                                      isSubActive
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-gray-100 text-gray-500"
                                    }`}
                                  >
                                    {subcat.count}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </aside>

            {/* Liste d’articles */}
            <section className="lg:col-span-3">
              {isLoading ? (
                <div className="text-center py-16">
                  <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-b-0 border-red-600" />
                  <p className="mt-4 text-gray-500">
                    {/* {language === "fr"
                      ? "Chargement des articles..."
                      : "Loading articles..."} */}
                    {intl.formatMessage({ id: "helpCenter.loadingArticles" })}
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                      {selectedCategory === "all"
                        ? intl.formatMessage({ id: "helpCenter.allArticles" })
                        : (() => {
                            // Find in main categories
                            const mainCat = mainCategories.find(c => c.id === selectedCategory);
                            if (mainCat) return mainCat.name;
                            // Find in subcategories
                            for (const main of mainCategories) {
                              const subcat = main.children?.find(c => c.id === selectedCategory);
                              if (subcat) return subcat.name;
                            }
                            return intl.formatMessage({ id: "helpCenter.allArticles" });
                          })()}
                    </h2>
                    <p className="text-gray-600">
                      {filteredArticles.length}{" "}
                      {/* {language === "fr"
                        ? "article(s) trouvé(s)"
                        : "article(s) found"} */}
                      {intl.formatMessage({ id: "helpCenter.articlesFound" })}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredArticles.map((article) => (
                      <Link
                        key={article.id}
                        to={`/${currentLocale}/centre-aide/${article.slug}`}
                        className="group block rounded-3xl border border-gray-200 bg-white p-6 hover:shadow-xl transition-all hover:scale-[1.01]"
                        aria-label={article.title}
                      >
                        <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-700 transition-colors">
                          {article.title}
                        </h3>
                        <p className="text-gray-600 mb-4 line-clamp-3">
                          {article.excerpt}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap gap-2">
                            {article.tags.slice(0, 3).map((tag, index) => (
                              <span
                                key={index}
                                className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                          <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                            <Clock size={14} />
                            {article.readTime}{" "}
                            {intl.formatMessage({ id: "helpCenter.minRead" })}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>

                  {filteredArticles.length === 0 && (
                    <div className="text-center py-16">
                      <div className="text-gray-600 text-lg mb-4">
                        {/* {language === "fr"
                          ? "Aucun article trouvé pour ces critères"
                          : "No articles found for these criteria"} */}
                        {intl.formatMessage({
                          id: "helpCenter.noArticlesFound",
                        })}
                      </div>
                      <button
                        onClick={() => {
                          setSearchTerm("");
                          setSelectedCategory("all");
                        }}
                        className="inline-flex items-center gap-2 font-semibold text-blue-700 hover:text-blue-800"
                      >
                        ↻{" "}
                        {/* {language === "fr"
                          ? "Réinitialiser la recherche"
                          : "Reset search"} */}
                        {intl.formatMessage({ id: "helpCenter.resetSearch" })}
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        </main>

        {/* Contact Support */}
        <section className="relative bg-gradient-to-r from-red-600 via-red-500 to-orange-500 py-16">
          <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/20 pointer-events-none" />
          <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
              {/* {language === "fr"
                ? "Vous ne trouvez pas votre réponse ?"
                : "Can't find your answer?"} */}
              {intl.formatMessage({ id: "helpCenter.supportTitle" })}
            </h2>
            <p className="text-lg md:text-xl text-white/95 mb-8">
              {/* {language === "fr"
                ? "Notre équipe support est disponible 24/7 pour vous aider"
                : "Our support team is available 24/7 to help you"} */}
              {intl.formatMessage({ id: "helpCenter.supportSubtitle" })}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/contact"
                className="group relative overflow-hidden bg-white text-red-600 hover:text-red-700 px-8 py-3 rounded-2xl font-semibold transition-all hover:scale-105 border-2 border-white"
              >
                <span className="relative z-10 inline-flex items-center gap-2">
                  <Mail size={20} />
                  <span>
                    {/* {language === "fr" ? "Nous contacter" : "Contact us"} */}
                    {intl.formatMessage({ id: "helpCenter.contactUs" })}
                  </span>
                </span>
                <span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-black/5" />
              </a>

              <a
                href="/sos-appel"
                className="group relative overflow-hidden border-2 border-white bg-transparent text-white px-8 py-3 rounded-2xl font-semibold transition-all hover:scale-105 hover:bg-white/10"
              >
                <span className="relative z-10 inline-flex items-center gap-2">
                  <Phone size={20} />
                  <span>
                    {/* {language === "fr" ? "Appel d'urgence" : "Emergency call"} */}
                    {intl.formatMessage({ id: "helpCenter.emergencyCall" })}
                  </span>
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

export default HelpCenter;
