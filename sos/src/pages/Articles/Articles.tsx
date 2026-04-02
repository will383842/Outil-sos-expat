/**
 * Articles & Guides — SOS-Expat Blog Listing Page
 * Palette: Rouge #DC2626 / Noir #0F172A / Blanc / Gray scale
 * Framework: React 18 + TypeScript + Tailwind CSS 3.4 + Framer Motion 11
 * Route: /fr-fr/articles, /en-us/articles, etc.
 */

import React, { useState, useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { parseLocaleFromPath } from "@/multilingual-system";
import { useApp } from "@/contexts/AppContext";
import Layout from "@/components/layout/Layout";
import SEOHead from "@/components/layout/SEOHead";
import BreadcrumbSchema from "@/components/seo/BreadcrumbSchema";
import {
  Search,
  Clock,
  Calendar,
  BookOpen,
  Tag,
  TrendingUp,
  ArrowRight,
  Mail,
  FileText,
  ChevronRight,
  Loader2,
} from "lucide-react";

// ============================================================
// i18n
// ============================================================

const T: Record<string, Record<string, string>> = {
  "page.title": {
    fr: "Articles & Guides",
    en: "Articles & Guides",
  },
  "page.subtitle": {
    fr: "Conseils pratiques, fiches pays et guides pour expatries dans plus de 200 pays",
    en: "Practical advice, country guides and tips for expats in 200+ countries",
  },
  "search.placeholder": {
    fr: "Rechercher un article...",
    en: "Search articles...",
  },
  "cat.all": { fr: "Tous", en: "All" },
  "cat.country": { fr: "Fiches pays", en: "Country Guides" },
  "cat.thematic": { fr: "Fiches thematiques", en: "Thematic Guides" },
  "cat.practical": { fr: "Guides pratiques", en: "Practical Guides" },
  "cat.faq": { fr: "FAQ", en: "FAQ" },
  "cat.news": { fr: "Actualites", en: "News" },
  "featured.badge": { fr: "A la une", en: "Featured" },
  "read.time": { fr: "min de lecture", en: "min read" },
  "read.article": { fr: "Lire l'article", en: "Read article" },
  "sidebar.popular": { fr: "Articles populaires", en: "Popular Articles" },
  "sidebar.categories": { fr: "Categories", en: "Categories" },
  "sidebar.tags": { fr: "Tags populaires", en: "Popular Tags" },
  "newsletter.title": {
    fr: "Restez informe ou que vous soyez",
    en: "Stay informed wherever you are",
  },
  "newsletter.subtitle": {
    fr: "Recevez nos meilleurs articles et guides directement dans votre boite mail",
    en: "Get our best articles and guides delivered to your inbox",
  },
  "newsletter.placeholder": { fr: "Votre email", en: "Your email" },
  "newsletter.cta": { fr: "S'abonner", en: "Subscribe" },
  "empty.title": {
    fr: "Aucun article trouve",
    en: "No articles found",
  },
  "empty.subtitle": {
    fr: "Essayez une autre recherche ou une autre categorie",
    en: "Try a different search or category",
  },
};

const t = (key: string, lang: string): string =>
  T[key]?.[lang] || T[key]?.["fr"] || key;

// ============================================================
// TYPES & CONSTANTS
// ============================================================

type Category = "all" | "country" | "thematic" | "practical" | "faq" | "news";

interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: Category;
  categoryLabel: string;
  date: string;
  readTime: number;
  tags: string[];
  featured?: boolean;
  imageUrl?: string;
  imageGradient: string;
}

// Blog API public endpoint
const BLOG_API = "https://sos-expat.com/api/v1/public";

// Map blog category slugs → SPA Category type
const CATEGORY_MAP: Record<string, Category> = {
  "fiches-pays":        "country",
  "fiches-thematiques": "thematic",
  "fiches-pratiques":   "practical",
};

const CATEGORY_LABEL_MAP: Record<string, Record<string, string>> = {
  "fiches-pays":        { fr: "Fiches pays",        en: "Country Guides" },
  "fiches-thematiques": { fr: "Fiches thematiques", en: "Thematic Guides" },
  "fiches-pratiques":   { fr: "Guides pratiques",   en: "Practical Guides" },
};

// Category gradient by slug
const GRADIENT_MAP: Record<string, string> = {
  "fiches-pays":        "from-red-600 to-orange-500",
  "fiches-thematiques": "from-violet-600 to-purple-500",
  "fiches-pratiques":   "from-emerald-600 to-teal-500",
};

// Blog article URL: /{locale}/{articles-segment}/{slug}
const LANG_LOCALE: Record<string, string> = {
  fr: "fr-fr", en: "en-us", es: "es-es", de: "de-de",
  ru: "ru-ru", pt: "pt-pt", zh: "zh-cn", hi: "hi-in", ar: "ar-sa",
};
const ARTICLES_SEGMENT: Record<string, string> = {
  fr: "articles", en: "articles", es: "articulos", de: "artikel",
  pt: "artigos", ru: "stati", zh: "wenzhang", hi: "lekh", ar: "maqalat",
};
function articleUrl(lang: string, slug: string): string {
  const locale = LANG_LOCALE[lang] ?? "fr-fr";
  const segment = ARTICLES_SEGMENT[lang] ?? "articles";
  return `/${locale}/${segment}/${slug}`;
}

// Raw article from Blog API
interface RawArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string | null;
  content_type: string;
  featured_image_url: string | null;
  reading_time_minutes: number;
  published_at: string;
  tags: string[];
  is_featured: boolean;
}

function mapRawArticle(raw: RawArticle, lang: string): Article {
  const catSlug = raw.category ?? "";
  return {
    id:            raw.id,
    slug:          raw.slug,
    title:         raw.title,
    excerpt:       raw.excerpt,
    category:      CATEGORY_MAP[catSlug] ?? "practical",
    categoryLabel: CATEGORY_LABEL_MAP[catSlug]?.[lang] ?? CATEGORY_LABEL_MAP[catSlug]?.["fr"] ?? catSlug,
    date:          raw.published_at,
    readTime:      raw.reading_time_minutes,
    tags:          raw.tags,
    featured:      raw.is_featured,
    imageUrl:      raw.featured_image_url ?? undefined,
    imageGradient: GRADIENT_MAP[catSlug] ?? "from-red-600 to-rose-500",
  };
}

const CATEGORIES: { key: Category; labelKey: string }[] = [
  { key: "all", labelKey: "cat.all" },
  { key: "country", labelKey: "cat.country" },
  { key: "thematic", labelKey: "cat.thematic" },
  { key: "practical", labelKey: "cat.practical" },
];

const POPULAR_TAGS = [
  "Visa",
  "Logement",
  "Fiscalite",
  "Sante",
  "Emploi",
  "Assurance",
  "Demenagement",
  "Banque",
  "Education",
  "Retraite",
];

// ============================================================
// ANIMATION VARIANTS
// ============================================================

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

// ============================================================
// SUB-COMPONENTS
// ============================================================

function CategoryBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700">
      <Tag className="w-3 h-3" />
      {label}
    </span>
  );
}

function ArticleCard({
  article,
  lang,
  index,
}: {
  article: Article;
  lang: string;
  index: number;
}) {
  return (
    <motion.article
      custom={index}
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      whileHover={{ y: -4 }}
      className="group bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-red-100 cursor-pointer"
    >
      <a href={articleUrl(lang, article.slug)} aria-label={article.title}>
        {/* Image */}
        <div className="relative h-48 overflow-hidden">
          {article.imageUrl ? (
            <img
              src={article.imageUrl}
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${article.imageGradient} flex items-center justify-center`}>
              <BookOpen className="w-12 h-12 text-white/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors" />
        </div>

        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <CategoryBadge label={article.categoryLabel} />
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              {article.readTime} {t("read.time", lang)}
            </span>
          </div>

          <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-red-600 transition-colors">
            {article.title}
          </h3>

          <p className="text-sm text-gray-500 line-clamp-2 mb-4">
            {article.excerpt}
          </p>

          <div className="flex items-center justify-between pt-3 border-t border-gray-50">
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Calendar className="w-3 h-3" />
              {new Date(article.date).toLocaleDateString(
                lang === "fr" ? "fr-FR" : "en-US",
                { day: "numeric", month: "short", year: "numeric" }
              )}
            </span>
            <span className="text-xs font-medium text-red-600 group-hover:underline">
              {t("read.article", lang)} →
            </span>
          </div>
        </div>
      </a>
    </motion.article>
  );
}

function FeaturedCard({
  article,
  lang,
}: {
  article: Article;
  lang: string;
}) {
  return (
    <motion.article
      variants={fadeInUp}
      custom={0}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="group relative bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 cursor-pointer"
    >
      <a href={articleUrl(lang, article.slug)} aria-label={article.title}>
        <div className="grid md:grid-cols-2 gap-0">
          {/* Image */}
          <div className="relative h-64 md:h-full min-h-[280px] overflow-hidden">
            {article.imageUrl ? (
              <img
                src={article.imageUrl}
                alt={article.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${article.imageGradient} flex items-center justify-center`}>
                <BookOpen className="w-16 h-16 text-white/20" />
              </div>
            )}
            <div className="absolute top-4 left-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/90 text-gray-900 backdrop-blur-sm shadow-sm">
                <TrendingUp className="w-3.5 h-3.5 text-red-600" />
                {t("featured.badge", lang)}
              </span>
            </div>
          </div>

          <div className="p-6 md:p-8 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-4">
              <CategoryBadge label={article.categoryLabel} />
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Clock className="w-3.5 h-3.5" />
                {article.readTime} {t("read.time", lang)}
              </span>
            </div>

            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3 group-hover:text-red-600 transition-colors leading-tight">
              {article.title}
            </h2>

            <p className="text-base text-gray-500 mb-6 leading-relaxed">
              {article.excerpt}
            </p>

            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">
                {new Date(article.date).toLocaleDateString(
                  lang === "fr" ? "fr-FR" : "en-US",
                  { day: "numeric", month: "long", year: "numeric" }
                )}
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 group-hover:gap-2.5 transition-all">
                {t("read.article", lang)}
                <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </div>
        </div>
      </a>
    </motion.article>
  );
}

function Sidebar({ lang, articles }: { lang: string; articles: Article[] }) {
  const popular = articles.slice(0, 4);

  return (
    <aside className="space-y-8">
      {/* Popular articles */}
      {popular.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-red-600" />
            {t("sidebar.popular", lang)}
          </h3>
          <ul className="space-y-4">
            {popular.map((a, i) => (
              <li key={a.id} className="group flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400 group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <a
                    href={articleUrl(lang, a.slug)}
                    className="text-sm font-medium text-gray-800 line-clamp-2 group-hover:text-red-600 transition-colors"
                  >
                    {a.title}
                  </a>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {a.readTime} {t("read.time", lang)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Categories */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-red-600" />
          {t("sidebar.categories", lang)}
        </h3>
        <ul className="space-y-2">
          {CATEGORIES.filter((c) => c.key !== "all").map((cat) => {
            const count = articles.filter((a) => a.category === cat.key).length;
            return (
              <li
                key={cat.key}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group"
              >
                <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                  {t(cat.labelKey, lang)}
                </span>
                {count > 0 && (
                  <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {count}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Tags cloud */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Tag className="w-4 h-4 text-red-600" />
          {t("sidebar.tags", lang)}
        </h3>
        <div className="flex flex-wrap gap-2">
          {POPULAR_TAGS.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-50 rounded-full border border-gray-100 hover:bg-red-50 hover:text-red-700 hover:border-red-100 cursor-pointer transition-colors"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}

function EmptyState({ lang }: { lang: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="col-span-full flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
        <Search className="w-7 h-7 text-gray-300" />
      </div>
      <h3 className="text-lg font-semibold text-gray-700 mb-1">
        {t("empty.title", lang)}
      </h3>
      <p className="text-sm text-gray-400">{t("empty.subtitle", lang)}</p>
    </motion.div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function Articles() {
  const location = useLocation();
  const { language } = useApp();
  const lang = (language ||
    parseLocaleFromPath(location.pathname)?.lang ||
    "fr") as string;
  const localeSlug = LANG_LOCALE[lang] ?? "fr-fr";

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [allArticles, setAllArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch from Blog API
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    fetch(`${BLOG_API}/articles?lang=${lang}&per_page=50`, { signal: controller.signal })
      .then((r) => r.json())
      .then((json) => {
        const raw: RawArticle[] = json.data ?? [];
        setAllArticles(raw.map((r) => mapRawArticle(r, lang)));
      })
      .catch(() => {/* network error: show empty state */})
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [lang]);

  // Filter articles
  const filteredArticles = useMemo(() => {
    let list = allArticles;

    if (activeCategory !== "all") {
      list = list.filter((a) => a.category === activeCategory);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.excerpt.toLowerCase().includes(q) ||
          a.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }

    return list;
  }, [search, activeCategory, allArticles]);

  const featured = filteredArticles.find((a) => a.featured);
  const gridArticles = filteredArticles.filter((a) => a !== featured);

  return (
    <Layout>
      <SEOHead
        title={`${t("page.title", lang)} | SOS-Expat`}
        description={t("page.subtitle", lang)}
      />
      <BreadcrumbSchema items={[
        { name: lang === "en" ? "Home" : "Accueil", url: `/${localeSlug}` },
        { name: t("page.title", lang) },
      ]} />

      {/* ── BREADCRUMB VISUEL ── */}
      <nav aria-label="breadcrumb" className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
            <li>
              <a href={`/${localeSlug}`} className="hover:text-red-600 transition-colors">
                {lang === "en" ? "Home" : "Accueil"}
              </a>
            </li>
            <li><ChevronRight size={14} className="text-gray-300 shrink-0" /></li>
            <li className="text-gray-900 font-medium">{t("page.title", lang)}</li>
          </ol>
        </div>
      </nav>

      {/* ===================== HERO ===================== */}
      <section className="relative bg-gradient-to-b from-gray-50 to-white pt-12 pb-8 sm:pt-16 sm:pb-12 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-red-50 rounded-full blur-3xl opacity-40 -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-gray-100 rounded-full blur-3xl opacity-50 translate-y-1/2 -translate-x-1/4" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 mb-6">
              <BookOpen className="w-3.5 h-3.5" />
              Blog SOS-Expat
            </span>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
              {t("page.title", lang)}
            </h1>

            <p className="text-base sm:text-lg text-gray-500 max-w-2xl mx-auto mb-8 leading-relaxed">
              {t("page.subtitle", lang)}
            </p>
          </motion.div>

          {/* Search bar */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="max-w-xl mx-auto"
          >
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-red-500 transition-colors" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("search.placeholder", lang)}
                aria-label={t("search.placeholder", lang)}
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white border border-gray-200 text-sm text-gray-800 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* =============== CATEGORY PILLS =============== */}
      <section className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-2 py-3 overflow-x-auto scrollbar-hide">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
                    isActive
                      ? "bg-gray-900 text-white border-gray-900 shadow-sm"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                  }`}
                >
                  {t(cat.labelKey, lang)}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* =============== CONTENT =============== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
          </div>
        ) : filteredArticles.length === 0 ? (
          <EmptyState lang={lang} />
        ) : (
          <div className="grid lg:grid-cols-[1fr_320px] gap-10">
            {/* Main column */}
            <div className="space-y-10">
              {/* Featured article */}
              {featured && <FeaturedCard article={featured} lang={lang} />}

              {/* Articles grid */}
              {gridArticles.length > 0 && (
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6"
                >
                  {gridArticles.map((article, i) => (
                    <ArticleCard
                      key={article.id}
                      article={article}
                      lang={lang}
                      index={i}
                    />
                  ))}
                </motion.div>
              )}

              {/* Sidebar mobile: displayed below articles on small screens */}
              {!loading && allArticles.length > 0 && (
                <div className="lg:hidden">
                  <Sidebar lang={lang} articles={allArticles} />
                </div>
              )}
            </div>

            {/* Sidebar (desktop only) */}
            <div className="hidden lg:block">
              <div className="sticky top-20">
                <Sidebar lang={lang} articles={allArticles} />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ============= NEWSLETTER CTA ============= */}
      <section className="relative overflow-hidden">
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-red-900 py-16 sm:py-20">
          {/* Decorative */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-2xl mx-auto px-4 sm:px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-red-600/20 mb-6">
                <Mail className="w-6 h-6 text-red-400" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
                {t("newsletter.title", lang)}
              </h2>
              <p className="text-base text-gray-400 mb-8 max-w-md mx-auto">
                {t("newsletter.subtitle", lang)}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder={t("newsletter.placeholder", lang)}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500/40 backdrop-blur transition-all"
                />
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-sm font-semibold text-white shadow-lg shadow-red-600/25 transition-colors flex items-center justify-center gap-2"
                >
                  {t("newsletter.cta", lang)}
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
