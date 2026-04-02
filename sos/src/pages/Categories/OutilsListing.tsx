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
import BreadcrumbSchema from "@/components/seo/BreadcrumbSchema";
import { getTranslatedRouteSlug } from "@/multilingual-system";
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
  home: { fr: "Accueil", en: "Home", es: "Inicio", de: "Startseite", pt: "Início", ru: "Главная", ch: "首页", hi: "होम", ar: "الرئيسية" },
  breadLabel: { fr: "Outils", en: "Tools", es: "Herramientas", de: "Werkzeuge", pt: "Ferramentas", ru: "Инструменты", ch: "工具", hi: "उपकरण", ar: "أدوات" },
  badge: { fr: "Outils", en: "Tools", es: "Herramientas", de: "Werkzeuge", pt: "Ferramentas", ru: "Инструменты", ch: "工具", hi: "उपकरण", ar: "أدوات" },
  title: { fr: "Outils pour expatries", en: "Tools for expats", es: "Herramientas para expatriados", de: "Werkzeuge für Expats", pt: "Ferramentas para expatriados", ru: "Инструменты для экспатов", ch: "外籍人士工具", hi: "प्रवासियों के लिए उपकरण", ar: "أدوات للمغتربين" },
  subtitle: {
    fr: "Des outils gratuits pour preparer et reussir votre expatriation.",
    en: "Free tools to prepare and succeed in your expatriation.",
    es: "Herramientas gratuitas para preparar y tener éxito en tu expatriación.",
    de: "Kostenlose Werkzeuge für eine erfolgreiche Auswanderung.",
    pt: "Ferramentas gratuitas para preparar e ter sucesso na sua expatriação.",
    ru: "Бесплатные инструменты для подготовки и успеха в эмиграции.",
    ch: "免费工具，助您为移居海外做好准备。",
    hi: "अपने प्रवास की तैयारी और सफलता के लिए मुफ्त उपकरण।",
    ar: "أدوات مجانية للتحضير والنجاح في هجرتك.",
  },
  statTools: { fr: "outils disponibles", en: "tools available", es: "herramientas disponibles", de: "verfügbare Werkzeuge", pt: "ferramentas disponíveis", ru: "доступных инструментов", ch: "可用工具", hi: "उपलब्ध उपकरण", ar: "أدوات متاحة" },
  filterAll: { fr: "Tous", en: "All", es: "Todos", de: "Alle", pt: "Todos", ru: "Все", ch: "全部", hi: "सभी", ar: "الكل" },
  filterCalculateurs: { fr: "Calculateurs", en: "Calculators", es: "Calculadoras", de: "Rechner", pt: "Calculadoras", ru: "Калькуляторы", ch: "计算器", hi: "कैलकुलेटर", ar: "الآلات الحاسبة" },
  filterGuides: { fr: "Guides interactifs", en: "Interactive guides", es: "Guías interactivas", de: "Interaktive Guides", pt: "Guias interativos", ru: "Интерактивные гиды", ch: "互动指南", hi: "इंटरएक्टिव गाइड", ar: "الأدلة التفاعلية" },
  filterChecklists: { fr: "Checklists", en: "Checklists", es: "Listas de verificación", de: "Checklisten", pt: "Checklists", ru: "Чеклисты", ch: "清单", hi: "चेकलिस्ट", ar: "قوائم التحقق" },
  filterComparateurs: { fr: "Comparateurs", en: "Comparators", es: "Comparadores", de: "Vergleicher", pt: "Comparadores", ru: "Сравнители", ch: "比较器", hi: "तुलनित्र", ar: "أدوات المقارنة" },
  popular: { fr: "Les plus populaires", en: "Most popular", es: "Los más populares", de: "Am beliebtesten", pt: "Mais populares", ru: "Самые популярные", ch: "最受欢迎", hi: "सबसे लोकप्रिय", ar: "الأكثر شعبية" },
  free: { fr: "Gratuit", en: "Free", es: "Gratis", de: "Kostenlos", pt: "Grátis", ru: "Бесплатно", ch: "免费", hi: "मुफ्त", ar: "مجاني" },
  premium: { fr: "Premium", en: "Premium", es: "Premium", de: "Premium", pt: "Premium", ru: "Премиум", ch: "高级", hi: "प्रीमियम", ar: "مميز" },
  newBadge: { fr: "Nouveau", en: "New", es: "Nuevo", de: "Neu", pt: "Novo", ru: "Новое", ch: "新", hi: "नया", ar: "جديد" },
  cta: { fr: "Utiliser", en: "Use", es: "Usar", de: "Verwenden", pt: "Usar", ru: "Использовать", ch: "使用", hi: "उपयोग करें", ar: "استخدم" },
  ctaTitle: { fr: "Un outil vous manque ?", en: "Missing a tool?", es: "¿Falta una herramienta?", de: "Fehlt ein Werkzeug?", pt: "Falta uma ferramenta?", ru: "Не хватает инструмента?", ch: "缺少某个工具？", hi: "कोई उपकरण नहीं मिला?", ar: "هل تفتقد أداة ما؟" },
  ctaSubtitle: {
    fr: "Suggerez un outil et notre equipe le developpera pour vous aider dans votre expatriation.",
    en: "Suggest a tool and our team will develop it to help you with your expatriation.",
    es: "Sugiera una herramienta y nuestro equipo la desarrollará para ayudarle en su expatriación.",
    de: "Schlagen Sie ein Werkzeug vor und unser Team wird es entwickeln, um Ihnen bei Ihrer Auswanderung zu helfen.",
    pt: "Sugira uma ferramenta e a nossa equipa irá desenvolvê-la para o ajudar na sua expatriação.",
    ru: "Предложите инструмент, и наша команда разработает его, чтобы помочь вам в эмиграции.",
    ch: "建议添加一个工具，我们的团队将为您开发，帮助您移居海外。",
    hi: "एक उपकरण सुझाएं और हमारी टीम इसे आपके प्रवास में मदद के लिए विकसित करेगी।",
    ar: "اقترح أداة وسيقوم فريقنا بتطويرها لمساعدتك في هجرتك.",
  },
  ctaButton: { fr: "Suggerer un outil", en: "Suggest a tool", es: "Sugerir una herramienta", de: "Tool vorschlagen", pt: "Sugerir uma ferramenta", ru: "Предложить инструмент", ch: "建议添加工具", hi: "उपकरण सुझाएं", ar: "اقترح أداة" },
  seoTitle: { fr: "Outils Expatriation Gratuits | SOS-Expat", en: "Free Expatriation Tools | SOS-Expat", es: "Herramientas Gratuitas Expatriación | SOS-Expat", de: "Kostenlose Auswanderungstools | SOS-Expat", pt: "Ferramentas Gratuitas Expatriação | SOS-Expat", ru: "Бесплатные инструменты для экспатов | SOS-Expat", ch: "免费移居工具 | SOS-Expat", hi: "मुफ्त प्रवास उपकरण | SOS-Expat", ar: "أدوات هجرة مجانية | SOS-Expat" },
  seoDescription: {
    fr: "Calculateurs, comparateurs, checklists et guides interactifs gratuits pour preparer votre expatriation. 8 outils disponibles.",
    en: "Free calculators, comparators, checklists and interactive guides to prepare your expatriation. 8 tools available.",
    es: "Calculadoras, comparadores, listas de verificación y guías interactivas gratuitas para preparar su expatriación. 8 herramientas disponibles.",
    de: "Kostenlose Rechner, Vergleicher, Checklisten und interaktive Guides zur Vorbereitung Ihrer Auswanderung. 8 Werkzeuge verfügbar.",
    pt: "Calculadoras, comparadores, checklists e guias interativos gratuitos para preparar a sua expatriação. 8 ferramentas disponíveis.",
    ru: "Бесплатные калькуляторы, сравнители, чеклисты и интерактивные гиды для подготовки к эмиграции. 8 инструментов доступно.",
    ch: "免费的计算器、比较器、清单和互动指南，帮助您为移居海外做好准备。8个工具可用。",
    hi: "अपने प्रवास की तैयारी के लिए मुफ्त कैलकुलेटर, तुलनित्र, चेकलिस्ट और इंटरएक्टिव गाइड। 8 उपकरण उपलब्ध।",
    ar: "آلات حاسبة وأدوات مقارنة وقوائم تحقق وأدلة تفاعلية مجانية للتحضير لهجرتك. 8 أدوات متاحة.",
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
  const _urlLangOL = lang === "ch" ? "zh" : lang;
  const _regionOL: Record<string, string> = { fr:"fr", en:"us", es:"es", de:"de", ru:"ru", pt:"pt", ch:"cn", hi:"in", ar:"sa" };
  const canonicalOutils = `https://sos-expat.com/${_urlLangOL}-${_regionOL[lang] ?? lang}/${getTranslatedRouteSlug("outils-listing" as any, lang as any) || "nos-outils"}`;

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
        canonicalUrl={canonicalOutils}
        ogType="website"
      />
      <BreadcrumbSchema items={[
        { name: t("home", lang), url: `/${localeSlug}` },
        { name: t("breadLabel", lang) },
      ]} />

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
