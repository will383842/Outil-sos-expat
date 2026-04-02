/**
 * Outils Listing — Category Page Premium 2026
 * Palette: Rouge #DC2626 / Noir #0F172A / Blanc
 * Outils gratuits et premium pour expatries
 */

import React, { useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { parseLocaleFromPath } from "@/multilingual-system";
import { useApp } from "@/contexts/AppContext";
import Layout from "@/components/layout/Layout";
import SEOHead from "@/components/layout/SEOHead";
import {
  Calculator,
  Globe,
  CheckSquare,
  ArrowLeftRight,
  FileText,
  Wrench,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Star,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ============================================================
// i18n
// ============================================================

const T: Record<string, Record<string, string>> = {
  home: { fr: "Accueil", en: "Home" },
  breadLabel: { fr: "Outils", en: "Tools" },
  badge: { fr: "Outils", en: "Tools" },
  title: { fr: "Outils pour expatries", en: "Tools for expats" },
  subtitle: {
    fr: "Des outils gratuits pour preparer et reussir votre expatriation.",
    en: "Free tools to prepare and succeed in your expatriation.",
  },
  statTools: { fr: "outils disponibles", en: "tools available" },
  filterAll: { fr: "Tous", en: "All" },
  filterCalculateurs: { fr: "Calculateurs", en: "Calculators" },
  filterGuides: { fr: "Guides interactifs", en: "Interactive guides" },
  filterChecklists: { fr: "Checklists", en: "Checklists" },
  filterComparateurs: { fr: "Comparateurs", en: "Comparators" },
  popular: { fr: "Les plus populaires", en: "Most popular" },
  free: { fr: "Gratuit", en: "Free" },
  premium: { fr: "Premium", en: "Premium" },
  newBadge: { fr: "Nouveau", en: "New" },
  cta: { fr: "Utiliser", en: "Use" },
  ctaTitle: { fr: "Un outil vous manque ?", en: "Missing a tool?" },
  ctaSubtitle: {
    fr: "Suggerez un outil et notre equipe le developpera pour vous aider dans votre expatriation.",
    en: "Suggest a tool and our team will develop it to help you with your expatriation.",
  },
  ctaButton: { fr: "Suggerer un outil", en: "Suggest a tool" },
  seoTitle: { fr: "Outils Expatriation Gratuits | SOS-Expat", en: "Free Expatriation Tools | SOS-Expat" },
  seoDescription: {
    fr: "Calculateurs, comparateurs, checklists et guides interactifs gratuits pour preparer votre expatriation. 8 outils disponibles.",
    en: "Free calculators, comparators, checklists and interactive guides to prepare your expatriation. 8 tools available.",
  },
};

// ============================================================
// TYPES & DATA
// ============================================================

type ToolCategory = "Calculateur" | "Guide interactif" | "Checklist" | "Comparateur";

const CATEGORY_FILTER_KEYS: Record<ToolCategory, string> = {
  Calculateur: "filterCalculateurs",
  "Guide interactif": "filterGuides",
  Checklist: "filterChecklists",
  Comparateur: "filterComparateurs",
};

const CATEGORY_KEYS: ToolCategory[] = [
  "Calculateur",
  "Guide interactif",
  "Checklist",
  "Comparateur",
];

interface Tool {
  id: string;
  name: Record<string, string>;
  description: Record<string, string>;
  category: ToolCategory;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  isPremium: boolean;
  isNew: boolean;
  isPopular: boolean;
  href: string;
}

const TOOLS: Tool[] = [
  {
    id: "cout-vie",
    name: { fr: "Calculateur cout de vie", en: "Cost of living calculator" },
    description: {
      fr: "Estimez votre budget mensuel dans votre pays de destination et comparez avec votre ville actuelle.",
      en: "Estimate your monthly budget in your destination country and compare with your current city.",
    },
    category: "Comparateur",
    icon: Calculator,
    iconColor: "text-red-600",
    iconBg: "bg-red-50",
    isPremium: false,
    isNew: false,
    isPopular: true,
    href: "/outils/cout-de-vie",
  },
  {
    id: "comparateur-pays",
    name: { fr: "Comparateur de pays", en: "Country comparator" },
    description: {
      fr: "Comparez jusqu'a 3 pays sur des criteres cles : climat, sante, education, securite et cout de la vie.",
      en: "Compare up to 3 countries on key criteria: climate, healthcare, education, safety and cost of living.",
    },
    category: "Comparateur",
    icon: Globe,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
    isPremium: false,
    isNew: false,
    isPopular: true,
    href: "/outils/comparateur-pays",
  },
  {
    id: "checklist-demenagement",
    name: { fr: "Checklist demenagement", en: "Moving checklist" },
    description: {
      fr: "Ne rien oublier avant, pendant et apres votre demenagement international. Etapes cles et rappels.",
      en: "Don't forget anything before, during and after your international move. Key steps and reminders.",
    },
    category: "Checklist",
    icon: CheckSquare,
    iconColor: "text-violet-600",
    iconBg: "bg-violet-50",
    isPremium: false,
    isNew: false,
    isPopular: true,
    href: "/outils/checklist-demenagement",
  },
  {
    id: "convertisseur-devises",
    name: { fr: "Convertisseur devises", en: "Currency converter" },
    description: {
      fr: "Convertissez instantanement entre plus de 150 devises avec les taux de change en temps reel.",
      en: "Instantly convert between 150+ currencies with real-time exchange rates.",
    },
    category: "Calculateur",
    icon: ArrowLeftRight,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50",
    isPremium: false,
    isNew: false,
    isPopular: false,
    href: "/outils/convertisseur-devises",
  },
  {
    id: "guide-visa",
    name: { fr: "Guide visa", en: "Visa guide" },
    description: {
      fr: "Identifiez le visa adapte a votre situation et decouvrez les demarches etape par etape.",
      en: "Identify the visa suited to your situation and discover the step-by-step process.",
    },
    category: "Guide interactif",
    icon: FileText,
    iconColor: "text-rose-600",
    iconBg: "bg-rose-50",
    isPremium: false,
    isNew: false,
    isPopular: false,
    href: "/outils/guide-visa",
  },
  {
    id: "simulateur-fiscalite",
    name: { fr: "Simulateur fiscalite", en: "Tax simulator" },
    description: {
      fr: "Simulez votre imposition dans votre pays d'accueil et optimisez votre situation fiscale.",
      en: "Simulate your taxation in your host country and optimize your tax situation.",
    },
    category: "Calculateur",
    icon: Calculator,
    iconColor: "text-teal-600",
    iconBg: "bg-teal-50",
    isPremium: false,
    isNew: false,
    isPopular: false,
    href: "/outils/simulateur-fiscalite",
  },
  {
    id: "checklist-administrative",
    name: { fr: "Checklist administrative", en: "Administrative checklist" },
    description: {
      fr: "Toutes les demarches administratives avant et apres votre arrivee : documents, inscriptions, comptes.",
      en: "All administrative procedures before and after your arrival: documents, registrations, accounts.",
    },
    category: "Checklist",
    icon: CheckSquare,
    iconColor: "text-red-600",
    iconBg: "bg-red-50",
    isPremium: false,
    isNew: true,
    isPopular: false,
    href: "/outils/checklist-administrative",
  },
  {
    id: "comparateur-assurances",
    name: { fr: "Comparateur assurances", en: "Insurance comparator" },
    description: {
      fr: "Comparez les offres d'assurance sante internationale et trouvez la couverture ideale pour votre profil.",
      en: "Compare international health insurance offers and find the ideal coverage for your profile.",
    },
    category: "Comparateur",
    icon: ArrowLeftRight,
    iconColor: "text-red-600",
    iconBg: "bg-red-50",
    isPremium: true,
    isNew: false,
    isPopular: false,
    href: "/outils/comparateur-assurances",
  },
];

// ============================================================
// ANIMATIONS
// ============================================================

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

// ============================================================
// HELPERS
// ============================================================

function t(key: string, lang: string): string {
  return T[key]?.[lang] ?? T[key]?.["fr"] ?? key;
}

// Popular tools gradient backgrounds
const POPULAR_GRADIENTS = [
  "from-gray-50 to-red-50/60",
  "from-gray-50 to-rose-50/60",
  "from-gray-50 to-emerald-50/60",
];

// ============================================================
// COMPONENT
// ============================================================

const OutilsListing: React.FC = () => {
  const location = useLocation();
  const { language } = useApp();
  const lang = (language || parseLocaleFromPath(location.pathname)?.lang || "fr") as string;
  const localeSlug = location.pathname.match(/^\/([a-z]{2}-[a-z]{2})/)?.[1] ?? "fr-fr";

  const [activeCategory, setActiveCategory] = useState<ToolCategory | null>(null);

  // ----- Filtered tools -----
  const filtered = useMemo(() => {
    if (!activeCategory) return TOOLS;
    return TOOLS.filter((tool) => tool.category === activeCategory);
  }, [activeCategory]);

  const popularTools = useMemo(() => TOOLS.filter((tool) => tool.isPopular), []);

  // ----- Filter pills -----
  const filters: { key: ToolCategory | null; label: string }[] = [
    { key: null, label: t("filterAll", lang) },
    ...CATEGORY_KEYS.map((c) => ({
      key: c as ToolCategory,
      label: t(CATEGORY_FILTER_KEYS[c], lang),
    })),
  ];

  return (
    <Layout>
      <SEOHead
        title={t("seoTitle", lang)}
        description={t("seoDescription", lang)}
      />

      {/* ====== BREADCRUMB ====== */}
      <nav aria-label="breadcrumb" className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
            <li><a href={`/${localeSlug}`} className="hover:text-red-600 transition-colors">{t("home", lang)}</a></li>
            <li><ChevronRight size={14} className="text-gray-300 shrink-0" /></li>
            <li className="text-gray-900 font-medium">{t("breadLabel", lang)}</li>
          </ol>
        </div>
      </nav>

      {/* ====== HERO ====== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pt-16 pb-12 sm:pt-28 sm:pb-20">
        {/* Grid décorative */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        {/* Halo rouge */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-red-600/5 rounded-full blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
          >
            {/* Badge */}
            <span className="inline-flex items-center gap-2 rounded-full border border-red-600/30 bg-red-600/10 px-5 py-1.5 text-sm font-semibold text-red-400 mb-6">
              <Wrench className="h-4 w-4" />
              {t("badge", lang)}
            </span>

            {/* H1 */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-5 leading-[1.1]">
              {t("title", lang)}
            </h1>

            {/* Subtitle */}
            <p className="mx-auto max-w-2xl text-base sm:text-lg text-slate-400 leading-relaxed mb-10">
              {t("subtitle", lang)}
            </p>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-6 sm:gap-10">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600/15">
                  <Wrench className="h-5 w-5 text-red-400" />
                </div>
                <div className="text-left">
                  <p className="text-2xl font-bold text-white">{TOOLS.length}</p>
                  <p className="text-sm text-slate-500">{t("statTools", lang)}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ====== CATEGORY FILTERS ====== */}
      <section className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4">
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => {
              const active = activeCategory === f.key;
              return (
                <button
                  key={f.label}
                  onClick={() => setActiveCategory(f.key)}
                  className={`
                    rounded-full px-4 py-2 text-sm font-medium transition-all duration-200
                    ${active
                      ? "bg-gray-900 text-white shadow-sm"
                      : "bg-white text-gray-600 border border-gray-200 hover:border-red-200 hover:text-gray-900"
                    }
                  `}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ====== POPULAR TOOLS HIGHLIGHT ====== */}
      {!activeCategory && (
        <section className="bg-white py-14 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={fadeInUp}
            >
              <div className="flex items-center gap-3 mb-8">
                <Star className="h-5 w-5 text-red-600" />
                <h2 className="text-xl font-bold text-gray-900">
                  {t("popular", lang)}
                </h2>
              </div>

              <motion.div
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                {popularTools.map((tool, idx) => (
                  <motion.a
                    key={tool.id}
                    href={tool.href}
                    variants={cardVariant}
                    whileHover={{ y: -6, scale: 1.01 }}
                    className={`group relative rounded-2xl bg-gradient-to-br ${POPULAR_GRADIENTS[idx % POPULAR_GRADIENTS.length]} border border-gray-100 p-7 hover:shadow-xl hover:border-red-100 transition-all duration-300 block`}
                  >
                    {/* Icon */}
                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${tool.iconBg} mb-5`}>
                      <tool.icon className={`h-7 w-7 ${tool.iconColor}`} />
                    </div>

                    {/* Name */}
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-red-600 transition-colors mb-2">
                      {tool.name[lang] || tool.name.fr}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-gray-500 leading-relaxed mb-5">
                      {tool.description[lang] || tool.description.fr}
                    </p>

                    {/* Bottom row */}
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 bg-white/80 rounded-full px-2.5 py-0.5">
                        {t(CATEGORY_FILTER_KEYS[tool.category], lang)}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 group-hover:gap-2.5 transition-all">
                        {t("cta", lang)}
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </motion.a>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ====== TOOLS GRID ====== */}
      <section className="bg-gray-50/50 py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {filtered.map((tool) => (
              <motion.article
                key={tool.id}
                variants={cardVariant}
                whileHover={{ y: -4, scale: 1.01 }}
                className="group relative bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-xl hover:border-red-100 transition-all duration-300"
              >
                {/* New badge */}
                {tool.isNew && (
                  <span className="absolute top-4 right-4 inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600">
                    <Sparkles className="h-3 w-3" />
                    {t("newBadge", lang)}
                  </span>
                )}

                {/* Icon */}
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${tool.iconBg} mb-4`}>
                  <tool.icon className={`h-6 w-6 ${tool.iconColor}`} />
                </div>

                {/* Name */}
                <h3 className="text-base font-bold text-gray-900 group-hover:text-red-600 transition-colors mb-2">
                  {tool.name[lang] || tool.name.fr}
                </h3>

                {/* Description */}
                <p className="text-sm text-gray-500 leading-relaxed mb-4">
                  {tool.description[lang] || tool.description.fr}
                </p>

                {/* Badges row */}
                <div className="flex items-center gap-2 mb-5">
                  {/* Category badge */}
                  <span className="inline-block text-xs font-medium text-gray-400 bg-gray-50 rounded-full px-2.5 py-0.5">
                    {t(CATEGORY_FILTER_KEYS[tool.category], lang)}
                  </span>

                  {/* Price badge */}
                  {tool.isPremium ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 rounded-full px-2.5 py-0.5">
                      <Star className="h-3 w-3" />
                      {t("premium", lang)}
                    </span>
                  ) : (
                    <span className="inline-block text-xs font-semibold text-emerald-600 bg-emerald-50 rounded-full px-2.5 py-0.5">
                      {t("free", lang)}
                    </span>
                  )}
                </div>

                {/* CTA */}
                <a
                  href={tool.href}
                  className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-red-600 transition-colors duration-200"
                >
                  {t("cta", lang)}
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ====== CTA BOTTOM ====== */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeInUp}
        className="bg-white py-16 sm:py-20"
      >
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <div className="rounded-3xl bg-gradient-to-br from-gray-900 to-gray-800 p-10 sm:p-14 shadow-2xl">
            <Wrench className="mx-auto h-10 w-10 text-red-500 mb-5" />
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              {t("ctaTitle", lang)}
            </h2>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto leading-relaxed">
              {t("ctaSubtitle", lang)}
            </p>
            <a
              href="/contact"
              className="inline-flex items-center gap-2 rounded-full bg-red-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-red-600/25 hover:bg-red-700 hover:shadow-red-600/30 transition-all duration-200"
            >
              {t("ctaButton", lang)}
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </motion.section>
    </Layout>
  );
};

export default OutilsListing;
