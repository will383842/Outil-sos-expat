/**
 * Articles & Guides — SOS-Expat Blog Listing Page
 * Palette: Rouge #DC2626 / Noir #0F172A / Blanc / Gray scale
 * Framework: React 18 + TypeScript + Tailwind CSS 3.4 + Framer Motion 11
 * Route: /fr-fr/articles, /en-us/articles, etc.
 */

import React, { useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { parseLocaleFromPath } from "@/multilingual-system";
import { useApp } from "@/contexts/AppContext";
import Layout from "@/components/layout/Layout";
import SEOHead from "@/components/layout/SEOHead";
import {
  Search,
  Clock,
  Calendar,
  User,
  BookOpen,
  Tag,
  TrendingUp,
  ArrowRight,
  Mail,
  FileText,
  ChevronRight,
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
// TYPES
// ============================================================

type Category = "all" | "country" | "thematic" | "practical" | "faq" | "news";

interface Article {
  id: string;
  title: string;
  excerpt: string;
  category: Category;
  categoryLabel: string;
  author: string;
  date: string;
  readTime: number;
  tags: string[];
  featured?: boolean;
  imageGradient: string;
}

// ============================================================
// MOCK DATA
// ============================================================

const MOCK_ARTICLES: Article[] = [
  {
    id: "1",
    title: "S'expatrier en Espagne en 2026 : le guide complet",
    excerpt:
      "Visa, logement, sante, fiscalite... Tout ce que vous devez savoir avant de vous installer en Espagne. Un guide pas-a-pas pour reussir votre expatriation.",
    category: "country",
    categoryLabel: "Fiches pays",
    author: "Equipe SOS-Expat",
    date: "2026-03-28",
    readTime: 12,
    tags: ["Espagne", "Visa", "Logement"],
    featured: true,
    imageGradient: "from-red-600 to-orange-500",
  },
  {
    id: "2",
    title: "Les 10 erreurs a eviter lors de votre premiere expatriation",
    excerpt:
      "Decouvrez les pieges les plus courants et comment les eviter pour une expatriation reussie des le premier jour.",
    category: "practical",
    categoryLabel: "Guides pratiques",
    author: "Marie Dupont",
    date: "2026-03-25",
    readTime: 8,
    tags: ["Conseils", "Debutant"],
    imageGradient: "from-red-600 to-rose-500",
  },
  {
    id: "3",
    title: "Fiscalite des expatries : double imposition et conventions",
    excerpt:
      "Comprendre les conventions fiscales bilaterales et eviter la double imposition quand vous vivez a l'etranger.",
    category: "thematic",
    categoryLabel: "Fiches thematiques",
    author: "Pierre Martin",
    date: "2026-03-20",
    readTime: 15,
    tags: ["Fiscalite", "Impots"],
    imageGradient: "from-emerald-600 to-teal-500",
  },
  {
    id: "4",
    title: "Comment obtenir un visa de travail au Canada ?",
    excerpt:
      "Le processus complet pour obtenir votre permis de travail canadien, du PVT au LMIA en passant par Entree Express.",
    category: "country",
    categoryLabel: "Fiches pays",
    author: "Sophie Leclerc",
    date: "2026-03-18",
    readTime: 10,
    tags: ["Canada", "Visa", "Travail"],
    imageGradient: "from-rose-600 to-pink-500",
  },
  {
    id: "5",
    title: "Assurance sante a l'etranger : quelle couverture choisir ?",
    excerpt:
      "CFE, assurance locale, assurance internationale... Comparatif et conseils pour bien vous couvrir selon votre situation.",
    category: "faq",
    categoryLabel: "FAQ",
    author: "Equipe SOS-Expat",
    date: "2026-03-15",
    readTime: 7,
    tags: ["Sante", "Assurance"],
    imageGradient: "from-violet-600 to-purple-500",
  },
  {
    id: "6",
    title: "Nouveautes 2026 : visas numeriques et teletravail international",
    excerpt:
      "Tour d'horizon des nouveaux visas digital nomad et des pays qui facilitent le teletravail depuis l'etranger en 2026.",
    category: "news",
    categoryLabel: "Actualites",
    author: "Lucas Bernard",
    date: "2026-03-10",
    readTime: 6,
    tags: ["Digital Nomad", "Teletravail", "2026"],
    imageGradient: "from-amber-600 to-yellow-500",
  },
];

const CATEGORIES: { key: Category; labelKey: string }[] = [
  { key: "all", labelKey: "cat.all" },
  { key: "country", labelKey: "cat.country" },
  { key: "thematic", labelKey: "cat.thematic" },
  { key: "practical", labelKey: "cat.practical" },
  { key: "faq", labelKey: "cat.faq" },
  { key: "news", labelKey: "cat.news" },
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
      {/* Image placeholder */}
      <div
        className={`relative h-48 bg-gradient-to-br ${article.imageGradient} flex items-center justify-center`}
      >
        <BookOpen className="w-12 h-12 text-white/30" />
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
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-gray-500" />
            </div>
            <span className="text-xs text-gray-500">{article.author}</span>
          </div>
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Calendar className="w-3 h-3" />
            {new Date(article.date).toLocaleDateString(
              lang === "fr" ? "fr-FR" : "en-US",
              { day: "numeric", month: "short", year: "numeric" }
            )}
          </span>
        </div>
      </div>
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
      <div className="grid md:grid-cols-2 gap-0">
        {/* Image placeholder */}
        <div
          className={`relative h-64 md:h-full min-h-[280px] bg-gradient-to-br ${article.imageGradient} flex items-center justify-center`}
        >
          <BookOpen className="w-16 h-16 text-white/20" />
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
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="w-4 h-4 text-gray-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {article.author}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(article.date).toLocaleDateString(
                    lang === "fr" ? "fr-FR" : "en-US",
                    { day: "numeric", month: "long", year: "numeric" }
                  )}
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 group-hover:gap-2.5 transition-all">
              {t("read.article", lang)}
              <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function Sidebar({ lang }: { lang: string }) {
  const popular = MOCK_ARTICLES.slice(0, 4);

  return (
    <aside className="space-y-8">
      {/* Popular articles */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-red-600" />
          {t("sidebar.popular", lang)}
        </h3>
        <ul className="space-y-4">
          {popular.map((a, i) => (
            <li
              key={a.id}
              className="group flex items-start gap-3 cursor-pointer"
            >
              <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400 group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 line-clamp-2 group-hover:text-red-600 transition-colors">
                  {a.title}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {a.readTime} {t("read.time", lang)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Categories */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-red-600" />
          {t("sidebar.categories", lang)}
        </h3>
        <ul className="space-y-2">
          {CATEGORIES.filter((c) => c.key !== "all").map((cat) => {
            const count = MOCK_ARTICLES.filter(
              (a) => a.category === cat.key
            ).length;
            return (
              <li
                key={cat.key}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group"
              >
                <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                  {t(cat.labelKey, lang)}
                </span>
                <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {count}
                </span>
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

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category>("all");

  // --- Filter articles ---
  const filteredArticles = useMemo(() => {
    let list = MOCK_ARTICLES;

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
  }, [search, activeCategory]);

  const featured = filteredArticles.find((a) => a.featured);
  const gridArticles = filteredArticles.filter((a) => a !== featured);

  return (
    <Layout>
      <SEOHead
        title={`${t("page.title", lang)} | SOS-Expat`}
        description={t("page.subtitle", lang)}
      />

      {/* ===================== HERO ===================== */}
      <section className="relative bg-gradient-to-b from-gray-50 to-white pt-16 pb-12 overflow-hidden">
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

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tight mb-4">
              {t("page.title", lang)}
            </h1>

            <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-8 leading-relaxed">
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
        {filteredArticles.length === 0 ? (
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
            </div>

            {/* Sidebar (desktop) */}
            <div className="hidden lg:block">
              <div className="sticky top-20">
                <Sidebar lang={lang} />
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
