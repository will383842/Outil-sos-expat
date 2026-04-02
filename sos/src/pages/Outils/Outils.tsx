/**
 * Outils Interactifs — SOS Expat 2026
 * Design: hero slate-950 + grille + framer-motion | contenu fond blanc
 * Listing des 26 outils depuis blog.life-expat.com/api/v1/public/tools
 */

import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { parseLocaleFromPath } from "@/multilingual-system";
import Layout from "@/components/layout/Layout";
import SEOHead from "@/components/layout/SEOHead";
import BreadcrumbSchema from "@/components/seo/BreadcrumbSchema";
import {
  Calculator, Scale, Globe, FileText, ClipboardCheck,
  CreditCard, Briefcase, AlertTriangle, Cross, Compass,
  ExternalLink, Loader2, ChevronRight, Sparkles,
  Wrench, BarChart3, Languages, LayoutGrid,
} from "lucide-react";

// ============================================================
// I18N
// ============================================================

const T: Record<string, Record<string, string>> = {
  pageTitle: {
    fr: "Outils Gratuits pour Expatriés | SOS-Expat",
    en: "Free Tools for Expats | SOS-Expat",
    es: "Herramientas Gratuitas para Expatriados | SOS-Expat",
    de: "Kostenlose Tools für Expats | SOS-Expat",
    pt: "Ferramentas Gratuitas para Expatriados | SOS-Expat",
    ru: "Бесплатные инструменты для экспатов | SOS-Expat",
    ch: "外籍人士免费工具 | SOS-Expat",
    hi: "प्रवासियों के लिए मुफ्त उपकरण | SOS-Expat",
    ar: "أدوات مجانية للمغتربين | SOS-Expat",
  },
  pageDesc: {
    fr: "26 outils interactifs gratuits pour préparer votre expatriation : calculateurs, comparateurs, générateurs de documents et guides d'urgence. Disponibles en 9 langues pour 197 pays.",
    en: "26 free interactive tools for your expat journey: calculators, comparators, document generators and emergency guides. Available in 9 languages for 197 countries.",
    es: "26 herramientas interactivas gratuitas para tu expatriación: calculadoras, comparadores, generadores de documentos y guías de emergencia. Disponibles en 9 idiomas para 197 países.",
    de: "26 kostenlose interaktive Tools für Expats: Rechner, Vergleicher, Dokumentengeneratoren und Notfallführer. In 9 Sprachen für 197 Länder verfügbar.",
    pt: "26 ferramentas interativas gratuitas para a sua expatriação: calculadoras, comparadores, geradores de documentos e guias de emergência. Disponíveis em 9 idiomas para 197 países.",
    ru: "26 бесплатных интерактивных инструментов для экспатов: калькуляторы, сравнители, генераторы документов и экстренные руководства. Доступны на 9 языках для 197 стран.",
    ch: "26个免费互动工具，助您准备海外移居：计算器、比较器、文件生成器和紧急指南。提供9种语言，覆盖197个国家。",
    hi: "26 मुफ्त इंटरैक्टिव उपकरण: कैलकुलेटर, तुलनाकर्ता, दस्तावेज़ जनरेटर और आपातकालीन गाइड। 9 भाषाओं में 197 देशों के लिए उपलब्ध।",
    ar: "26 أداة تفاعلية مجانية للمغتربين: حاسبات، مقارنات، مولدات وثائق وأدلة طوارئ. متاحة بـ9 لغات لـ197 دولة.",
  },
  badge:        { fr: "26 outils gratuits", en: "26 free tools", es: "26 herramientas gratuitas", de: "26 kostenlose Tools", pt: "26 ferramentas gratuitas", ru: "26 инструментов", ch: "26个免费工具", hi: "26 मुफ्त उपकरण", ar: "26 أداة مجانية" },
  heading:      { fr: "Outils pour expatriés", en: "Tools for expats", es: "Herramientas para expatriados", de: "Tools für Expats", pt: "Ferramentas para expatriados", ru: "Инструменты для экспатов", ch: "外籍人士工具", hi: "प्रवासियों के लिए उपकरण", ar: "أدوات للمغتربين" },
  subheading:   { fr: "Calculateurs, comparateurs, générateurs et guides d'urgence — tout ce dont vous avez besoin pour votre expatriation, gratuits et sans inscription.", en: "Calculators, comparators, generators and emergency guides — everything you need for your expat journey, free and without registration.", es: "Calculadoras, comparadores, generadores y guías de emergencia — todo lo que necesitas para tu expatriación, gratis y sin registro.", de: "Rechner, Vergleicher, Generatoren und Notfallführer — alles für Ihre Auswanderung, kostenlos und ohne Anmeldung.", pt: "Calculadoras, comparadores, geradores e guias de emergência — tudo o que precisa para a sua expatriação, gratuito e sem registo.", ru: "Калькуляторы, сравнители, генераторы и экстренные руководства — всё необходимое для эмиграции, бесплатно без регистрации.", ch: "计算器、比较器、生成器和紧急指南——您海外移居所需的一切，免费且无需注册。", hi: "कैलकुलेटर, तुलनाकर्ता, जनरेटर और आपातकालीन गाइड — प्रवास के लिए आवश्यक सब कुछ, मुफ्त और बिना पंजीकरण।", ar: "حاسبات، مقارنات، مولدات وأدلة طوارئ — كل ما تحتاجه لهجرتك، مجاني وبدون تسجيل." },
  statTools:    { fr: "outils gratuits", en: "free tools", es: "herramientas", de: "kostenlose Tools", pt: "ferramentas", ru: "инструментов", ch: "免费工具", hi: "मुफ्त उपकरण", ar: "أداة مجانية" },
  statCats:     { fr: "catégories", en: "categories", es: "categorías", de: "Kategorien", pt: "categorias", ru: "категорий", ch: "分类", hi: "श्रेणियां", ar: "فئات" },
  statLangs:    { fr: "langues", en: "languages", es: "idiomas", de: "Sprachen", pt: "idiomas", ru: "языков", ch: "种语言", hi: "भाषाएं", ar: "لغات" },
  catAll:       { fr: "Tous", en: "All", es: "Todos", de: "Alle", pt: "Todos", ru: "Все", ch: "全部", hi: "सभी", ar: "الكل" },
  catCalculate: { fr: "Calculateurs", en: "Calculators", es: "Calculadoras", de: "Rechner", pt: "Calculadoras", ru: "Калькуляторы", ch: "计算器", hi: "कैलकुलेटर", ar: "حاسبات" },
  catCompare:   { fr: "Comparateurs", en: "Comparators", es: "Comparadores", de: "Vergleicher", pt: "Comparadores", ru: "Сравнители", ch: "比较器", hi: "तुलनाकर्ता", ar: "مقارنات" },
  catGenerate:  { fr: "Générateurs", en: "Generators", es: "Generadores", de: "Generatoren", pt: "Geradores", ru: "Генераторы", ch: "生成器", hi: "जनरेटर", ar: "مولدات" },
  catEmergency: { fr: "Urgences & Sécurité", en: "Emergency & Safety", es: "Emergencias y Seguridad", de: "Notfall & Sicherheit", pt: "Emergências & Segurança", ru: "Экстренная помощь", ch: "紧急情况与安全", hi: "आपातकाल और सुरक्षा", ar: "الطوارئ والسلامة" },
  toolsCount:   { fr: "outils", en: "tools", es: "herramientas", de: "Tools", pt: "ferramentas", ru: "инструментов", ch: "工具", hi: "उपकरण", ar: "أدوات" },
  useNow:       { fr: "Utiliser maintenant", en: "Use now", es: "Usar ahora", de: "Jetzt nutzen", pt: "Usar agora", ru: "Использовать", ch: "立即使用", hi: "अभी उपयोग करें", ar: "استخدم الآن" },
  free:         { fr: "Gratuit", en: "Free", es: "Gratis", de: "Kostenlos", pt: "Grátis", ru: "Бесплатно", ch: "免费", hi: "मुफ्त", ar: "مجاني" },
  aiPowered:    { fr: "IA", en: "AI", es: "IA", de: "KI", pt: "IA", ru: "ИИ", ch: "AI", hi: "AI", ar: "ذكاء اصطناعي" },
  loading:      { fr: "Chargement des outils…", en: "Loading tools…", es: "Cargando herramientas…", de: "Tools werden geladen…", pt: "Carregando ferramentas…", ru: "Загрузка инструментов…", ch: "正在加载工具…", hi: "उपकरण लोड हो रहे हैं…", ar: "جاري تحميل الأدوات…" },
  error:        { fr: "Impossible de charger les outils. Réessayez.", en: "Unable to load tools. Please try again.", es: "No se pueden cargar las herramientas. Inténtalo de nuevo.", de: "Tools konnten nicht geladen werden. Bitte versuchen Sie es erneut.", pt: "Não foi possível carregar as ferramentas. Tente novamente.", ru: "Не удалось загрузить инструменты. Попробуйте ещё раз.", ch: "无法加载工具，请重试。", hi: "उपकरण लोड नहीं हो सके। कृपया पुनः प्रयास करें।", ar: "تعذّر تحميل الأدوات. حاول مرة أخرى." },
  home:         { fr: "Accueil", en: "Home", es: "Inicio", de: "Startseite", pt: "Início", ru: "Главная", ch: "首页", hi: "होम", ar: "الرئيسية" },
  breadTools:   { fr: "Outils", en: "Tools", es: "Herramientas", de: "Tools", pt: "Ferramentas", ru: "Инструменты", ch: "工具", hi: "टूल्स", ar: "الأدوات" },
};

function tr(key: string, lang: string): string {
  return T[key]?.[lang] || T[key]?.["fr"] || key;
}

// ============================================================
// ICON MAP
// ============================================================

const ICON_MAP: Record<string, React.ElementType> = {
  "visa-calculator": FileText, "cost-of-living": Calculator, "net-salary-expat": CreditCard,
  "retirement-simulator": Briefcase, "travel-budget": CreditCard, "double-taxation": Scale,
  "183-day-rule": Scale, "diploma-recognition": ClipboardCheck, "call-planner": Compass,
  "insurance-comparator": ClipboardCheck, "bank-comparator": CreditCard, "country-recommender": Globe,
  "legal-status-comparator": Scale, "nomad-country": Compass, "tax-resident-check": Scale,
  "departure-checklist": ClipboardCheck, "admin-checklist": ClipboardCheck, "packing-list": ClipboardCheck,
  "visa-letter-ai": FileText, "freelance-contract-ai": FileText, "embassy-finder": Globe,
  "passport-theft": AlertTriangle, "doctors-directory": Cross, "risk-map": AlertTriangle,
};

// Styles par catégorie (fond blanc)
const CATEGORY_STYLES: Record<string, {
  iconBg: string; iconColor: string;
  badgeBg: string; badgeText: string; badgeBorder: string; dot: string;
}> = {
  calculate: { iconBg: "bg-blue-50",    iconColor: "text-blue-600",    badgeBg: "bg-blue-50",    badgeText: "text-blue-700",    badgeBorder: "border-blue-100",    dot: "bg-blue-500" },
  compare:   { iconBg: "bg-violet-50",  iconColor: "text-violet-600",  badgeBg: "bg-violet-50",  badgeText: "text-violet-700",  badgeBorder: "border-violet-100",  dot: "bg-violet-500" },
  generate:  { iconBg: "bg-emerald-50", iconColor: "text-emerald-600", badgeBg: "bg-emerald-50", badgeText: "text-emerald-700", badgeBorder: "border-emerald-100", dot: "bg-emerald-500" },
  emergency: { iconBg: "bg-red-50",     iconColor: "text-red-600",     badgeBg: "bg-red-50",     badgeText: "text-red-700",     badgeBorder: "border-red-100",     dot: "bg-red-500" },
};

// ============================================================
// TYPES
// ============================================================

interface ToolItem {
  id: string; slug_key: string; category: string; icon: string;
  is_ai: boolean; sort_order: number; blog_url: string;
  translation: { title: string; slug: string; description: string; meta_description: string | null };
}

// ============================================================
// ANIMATIONS
// ============================================================

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};
const cardV = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

// ============================================================
// COMPONENT
// ============================================================

export default function Outils() {
  const location = useLocation();
  const lang = parseLocaleFromPath(location.pathname)?.lang || "fr";
  const localeSlug = location.pathname.match(/^\/([a-z]{2}-[a-z]{2})/)?.[1] ?? "fr-fr";

  const [tools, setTools] = useState<ToolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    fetch(`https://blog.life-expat.com/api/v1/public/tools?lang=${lang === "ch" ? "zh" : lang}`, { signal: controller.signal })
      .then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then((data: ToolItem[]) => { setTools(Array.isArray(data) ? data : []); setLoading(false); })
      .catch((err) => { if (err.name !== "AbortError") { setError(true); setLoading(false); } });
    return () => controller.abort();
  }, [lang]);

  const categories: Record<string, ToolItem[]> = {};
  for (const tool of tools) {
    if (!categories[tool.category]) categories[tool.category] = [];
    categories[tool.category].push(tool);
  }

  const catOrder = ["calculate", "compare", "generate", "emergency"];
  const catLabelKeys: Record<string, string> = {
    calculate: "catCalculate", compare: "catCompare", generate: "catGenerate", emergency: "catEmergency",
  };
  const visibleCats = activeTab === "all" ? catOrder : [activeTab];

  const urlLang   = lang === "ch" ? "zh" : lang;
  const urlRegion = lang === "en" ? "us" : lang === "pt" ? "pt" : lang === "ch" ? "cn" : lang === "hi" ? "in" : lang === "ar" ? "sa" : lang;
  const canonical = `https://sos-expat.com/${urlLang}-${urlRegion}/outils`;
  const isRtl = lang === "ar";

  return (
    <Layout>
      <SEOHead title={tr("pageTitle", lang)} description={tr("pageDesc", lang)} canonicalUrl={canonical} />
      <BreadcrumbSchema items={[
        { name: tr("home", lang), url: "https://sos-expat.com" },
        { name: tr("breadTools", lang), url: canonical },
      ]} />

      {/* Breadcrumb visuel */}
      <nav aria-label="breadcrumb" className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500" dir={isRtl ? "rtl" : "ltr"}>
            <li>
              <a href={`/${localeSlug}`} className="hover:text-red-600 transition-colors">
                {tr("home", lang)}
              </a>
            </li>
            <li><ChevronRight size={14} className="text-gray-300 shrink-0" /></li>
            <li className="text-gray-900 font-medium">{tr("breadTools", lang)}</li>
          </ol>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section
        className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pt-16 pb-12 sm:pt-28 sm:pb-20"
        dir={isRtl ? "rtl" : "ltr"}
      >
        {/* Grille décorative */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        {/* Halo rouge */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-red-600/5 rounded-full blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-600/30 bg-red-600/10 px-5 py-1.5 text-sm font-semibold text-red-400"
          >
            <Sparkles className="h-4 w-4" />
            {tr("badge", lang)}
          </motion.div>

          {/* Titre */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl"
          >
            {tr("heading", lang)}
          </motion.h1>

          {/* Sous-titre */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mx-auto mt-5 max-w-2xl text-base sm:text-lg text-slate-400"
          >
            {tr("subheading", lang)}
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-8 sm:gap-14"
          >
            {([
              { value: "26", label: tr("statTools", lang), Icon: Wrench },
              { value: "4",  label: tr("statCats", lang),  Icon: LayoutGrid },
              { value: "9",  label: tr("statLangs", lang), Icon: Languages },
            ] as { value: string; label: string; Icon: React.ElementType }[]).map((s, i) => (
              <div key={i} className="flex items-center gap-3 text-left">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600/15">
                  <s.Icon className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-sm text-slate-500">{s.label}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===== CONTENU ===== */}
      <section className="bg-white py-12 sm:py-20" dir={isRtl ? "rtl" : "ltr"}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">

          {/* Onglets catégories */}
          {!loading && !error && tools.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-10 flex flex-wrap gap-2"
            >
              <button
                onClick={() => setActiveTab("all")}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                  activeTab === "all"
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-900"
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                {tr("catAll", lang)}
                <span className={`ml-0.5 text-xs font-bold rounded-full px-1.5 py-0.5 ${
                  activeTab === "all" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                }`}>
                  {tools.length}
                </span>
              </button>

              {catOrder.map((cat) => {
                const count = categories[cat]?.length ?? 0;
                if (!count) return null;
                const s = CATEGORY_STYLES[cat] ?? CATEGORY_STYLES.calculate;
                const isActive = activeTab === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveTab(cat)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                      isActive
                        ? `${s.badgeBg} ${s.badgeText} ${s.badgeBorder} shadow-sm`
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-900"
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                    {tr(catLabelKeys[cat], lang)}
                    <span className={`ml-0.5 text-xs font-bold rounded-full px-1.5 py-0.5 ${
                      isActive ? "bg-white/60" : "bg-slate-100 text-slate-500"
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </motion.div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-red-500" />
              <span className="text-base font-medium">{tr("loading", lang)}</span>
            </div>
          )}

          {/* Erreur */}
          {error && !loading && (
            <div className="text-center py-20">
              <AlertTriangle className="w-10 h-10 mx-auto mb-4 text-red-400" />
              <p className="text-base text-slate-500">{tr("error", lang)}</p>
            </div>
          )}

          {/* Sections par catégorie */}
          {!loading && !error && (
            <div className="space-y-16">
              {visibleCats.map((cat) => {
                const catTools = categories[cat];
                if (!catTools?.length) return null;
                const s = CATEGORY_STYLES[cat] ?? CATEGORY_STYLES.calculate;

                return (
                  <motion.section
                    key={cat}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.1 }}
                    variants={fadeInUp}
                  >
                    {/* En-tête section */}
                    <div className="flex items-center gap-3 mb-8">
                      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest border ${s.badgeBg} ${s.badgeText} ${s.badgeBorder}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                        {tr(catLabelKeys[cat] || "catCalculate", lang)}
                      </span>
                      <span className="text-sm text-slate-400">
                        {catTools.length} {tr("toolsCount", lang)}
                      </span>
                      <div className="flex-1 h-px bg-slate-100" />
                    </div>

                    {/* Grille cartes */}
                    <motion.div
                      variants={stagger}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true, amount: 0.05 }}
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
                    >
                      {catTools.map((tool) => {
                        const Icon = ICON_MAP[tool.slug_key] || Calculator;
                        const desc = tool.translation.meta_description || tool.translation.description;
                        const shortDesc = desc ? desc.slice(0, 110) + (desc.length > 110 ? "\u2026" : "") : "";

                        return (
                          <motion.a
                            key={tool.id}
                            variants={cardV}
                            href={tool.blog_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex flex-col rounded-2xl border border-slate-100 bg-white p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-200"
                          >
                            {/* Icône + badges */}
                            <div className="flex items-start justify-between mb-4">
                              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${s.iconBg}`}>
                                <Icon className={`w-5 h-5 ${s.iconColor}`} />
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {tool.is_ai && (
                                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100">
                                    {tr("aiPowered", lang)}
                                  </span>
                                )}
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100">
                                  {tr("free", lang)}
                                </span>
                              </div>
                            </div>

                            {/* Titre */}
                            <h2 className="font-bold text-base leading-snug mb-2 text-slate-900 group-hover:text-red-600 transition-colors">
                              {tool.translation.title}
                            </h2>

                            {/* Description */}
                            {shortDesc && (
                              <p className="text-sm leading-relaxed flex-1 mb-4 text-slate-500">
                                {shortDesc}
                              </p>
                            )}

                            {/* CTA */}
                            <div className="flex items-center gap-1.5 text-sm font-semibold text-red-600 mt-auto group-hover:gap-2.5 transition-all">
                              {tr("useNow", lang)}
                              <ExternalLink className="w-3.5 h-3.5" />
                            </div>
                          </motion.a>
                        );
                      })}
                    </motion.div>
                  </motion.section>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
