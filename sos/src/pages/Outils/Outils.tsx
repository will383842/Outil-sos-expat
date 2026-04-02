/**
 * Outils Interactifs — SOS Expat 2026
 * Listing des 26 outils depuis blog.life-expat.com/api/v1/public/tools
 * Chaque outil renvoie vers sa page dédiée sur blog.life-expat.com
 */

import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { parseLocaleFromPath } from "@/multilingual-system";
import Layout from "@/components/layout/Layout";
import SEOHead from "@/components/layout/SEOHead";
import BreadcrumbSchema from "@/components/seo/BreadcrumbSchema";
import {
  Calculator,
  Scale,
  Globe,
  FileText,
  ClipboardCheck,
  CreditCard,
  Briefcase,
  AlertTriangle,
  Cross,
  Compass,
  ExternalLink,
  Loader2,
  Sparkles,
  ChevronRight,
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
  badge: {
    fr: "26 outils gratuits",
    en: "26 free tools",
    es: "26 herramientas gratuitas",
    de: "26 kostenlose Tools",
    pt: "26 ferramentas gratuitas",
    ru: "26 бесплатных инструментов",
    ch: "26个免费工具",
    hi: "26 मुफ्त उपकरण",
    ar: "26 أداة مجانية",
  },
  heading: {
    fr: "Outils pour expatriés",
    en: "Tools for expats",
    es: "Herramientas para expatriados",
    de: "Tools für Expats",
    pt: "Ferramentas para expatriados",
    ru: "Инструменты для экспатов",
    ch: "外籍人士工具",
    hi: "प्रवासियों के लिए उपकरण",
    ar: "أدوات للمغتربين",
  },
  subheading: {
    fr: "Calculateurs, comparateurs, générateurs et guides d'urgence — tout ce dont vous avez besoin pour votre expatriation, gratuits et sans inscription.",
    en: "Calculators, comparators, generators and emergency guides — everything you need for your expat journey, free and without registration.",
    es: "Calculadoras, comparadores, generadores y guías de emergencia — todo lo que necesitas para tu expatriación, gratis y sin registro.",
    de: "Rechner, Vergleicher, Generatoren und Notfallführer — alles für Ihre Auswanderung, kostenlos und ohne Anmeldung.",
    pt: "Calculadoras, comparadores, geradores e guias de emergência — tudo o que precisa para a sua expatriação, gratuito e sem registo.",
    ru: "Калькуляторы, сравнители, генераторы и экстренные руководства — всё необходимое для эмиграции, бесплатно без регистрации.",
    ch: "计算器、比较器、生成器和紧急指南——您海外移居所需的一切，免费且无需注册。",
    hi: "कैलकुलेटर, तुलनाकर्ता, जनरेटर और आपातकालीन गाइड — प्रवास के लिए आवश्यक सब कुछ, मुफ्त और बिना पंजीकरण।",
    ar: "حاسبات، مقارنات، مولدات وأدلة طوارئ — كل ما تحتاجه لهجرتك، مجاني وبدون تسجيل.",
  },
  catCalculate: {
    fr: "Calculateurs",
    en: "Calculators",
    es: "Calculadoras",
    de: "Rechner",
    pt: "Calculadoras",
    ru: "Калькуляторы",
    ch: "计算器",
    hi: "कैलकुलेटर",
    ar: "حاسبات",
  },
  catCompare: {
    fr: "Comparateurs",
    en: "Comparators",
    es: "Comparadores",
    de: "Vergleicher",
    pt: "Comparadores",
    ru: "Сравнители",
    ch: "比较器",
    hi: "तुलनाकर्ता",
    ar: "مقارنات",
  },
  catGenerate: {
    fr: "Générateurs",
    en: "Generators",
    es: "Generadores",
    de: "Generatoren",
    pt: "Geradores",
    ru: "Генераторы",
    ch: "生成器",
    hi: "जनरेटर",
    ar: "مولدات",
  },
  catEmergency: {
    fr: "Urgences & Sécurité",
    en: "Emergency & Safety",
    es: "Emergencias y Seguridad",
    de: "Notfall & Sicherheit",
    pt: "Emergências & Segurança",
    ru: "Экстренная помощь",
    ch: "紧急情况与安全",
    hi: "आपातकाल और सुरक्षा",
    ar: "الطوارئ والسلامة",
  },
  useNow: {
    fr: "Utiliser maintenant",
    en: "Use now",
    es: "Usar ahora",
    de: "Jetzt nutzen",
    pt: "Usar agora",
    ru: "Использовать",
    ch: "立即使用",
    hi: "अभी उपयोग करें",
    ar: "استخدم الآن",
  },
  free: { fr: "Gratuit", en: "Free", es: "Gratis", de: "Kostenlos", pt: "Grátis", ru: "Бесплатно", ch: "免费", hi: "मुफ्त", ar: "مجاني" },
  aiPowered: { fr: "IA", en: "AI", es: "IA", de: "KI", pt: "IA", ru: "ИИ", ch: "AI", hi: "AI", ar: "ذكاء اصطناعي" },
  loading: {
    fr: "Chargement des outils…",
    en: "Loading tools…",
    es: "Cargando herramientas…",
    de: "Tools werden geladen…",
    pt: "Carregando ferramentas…",
    ru: "Загрузка инструментов…",
    ch: "正在加载工具…",
    hi: "उपकरण लोड हो रहे हैं…",
    ar: "جاري تحميل الأدوات…",
  },
  error: {
    fr: "Impossible de charger les outils. Réessayez.",
    en: "Unable to load tools. Please try again.",
    es: "No se pueden cargar las herramientas. Inténtalo de nuevo.",
    de: "Tools konnten nicht geladen werden. Bitte versuchen Sie es erneut.",
    pt: "Não foi possível carregar as ferramentas. Tente novamente.",
    ru: "Не удалось загрузить инструменты. Попробуйте ещё раз.",
    ch: "无法加载工具，请重试。",
    hi: "उपकरण लोड नहीं हो सके। कृपया पुनः प्रयास करें।",
    ar: "تعذّر تحميل الأدوات. حاول مرة أخرى.",
  },
  home: { fr: "Accueil", en: "Home", es: "Inicio", de: "Startseite", pt: "Início", ru: "Главная", ch: "首页", hi: "होम", ar: "الرئيسية" },
  breadTools: { fr: "Outils", en: "Tools", es: "Herramientas", de: "Tools", pt: "Ferramentas", ru: "Инструменты", ch: "工具", hi: "टूल्स", ar: "الأدوات" },
};

function tr(key: string, lang: string): string {
  return T[key]?.[lang] || T[key]?.["fr"] || key;
}

// ============================================================
// ICON MAP — slug_key → Lucide icon
// ============================================================
const ICON_MAP: Record<string, React.ElementType> = {
  "visa-calculator": FileText,
  "cost-of-living": Calculator,
  "net-salary-expat": CreditCard,
  "retirement-simulator": Briefcase,
  "travel-budget": CreditCard,
  "double-taxation": Scale,
  "183-day-rule": Scale,
  "diploma-recognition": ClipboardCheck,
  "call-planner": Compass,
  "insurance-comparator": ClipboardCheck,
  "bank-comparator": CreditCard,
  "country-recommender": Globe,
  "legal-status-comparator": Scale,
  "nomad-country": Compass,
  "tax-resident-check": Scale,
  "departure-checklist": ClipboardCheck,
  "admin-checklist": ClipboardCheck,
  "packing-list": ClipboardCheck,
  "visa-letter-ai": FileText,
  "freelance-contract-ai": FileText,
  "embassy-finder": Globe,
  "passport-theft": AlertTriangle,
  "doctors-directory": Cross,
  "risk-map": AlertTriangle,
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  calculate: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
  compare:   { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" },
  generate:  { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
  emergency: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20" },
};

// ============================================================
// TYPES
// ============================================================

interface ToolItem {
  id: string;
  slug_key: string;
  category: string;
  icon: string;
  is_ai: boolean;
  sort_order: number;
  blog_url: string;
  translation: {
    title: string;
    slug: string;
    description: string;
    meta_description: string | null;
  };
}

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

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);

    fetch(`https://blog.life-expat.com/api/v1/public/tools?lang=${lang === "ch" ? "zh" : lang}`, {
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then((data: ToolItem[]) => {
        setTools(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError(true);
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [lang]);

  // Group by category
  const categories: Record<string, ToolItem[]> = {};
  for (const tool of tools) {
    if (!categories[tool.category]) categories[tool.category] = [];
    categories[tool.category].push(tool);
  }

  const catOrder = ["calculate", "compare", "generate", "emergency"];
  const catLabelKeys: Record<string, string> = {
    calculate: "catCalculate",
    compare: "catCompare",
    generate: "catGenerate",
    emergency: "catEmergency",
  };

  // SEO
  const seoTitle = tr("pageTitle", lang);
  const seoDescription = tr("pageDesc", lang);
  const urlLang = lang === "ch" ? "zh" : lang;
  const urlRegion = lang === "en" ? "us" : lang === "pt" ? "pt" : lang === "ch" ? "cn" : lang === "hi" ? "in" : lang === "ar" ? "sa" : lang;
  const canonical = `https://sos-expat.com/${urlLang}-${urlRegion}/outils`;

  const breadcrumbs = [
    { name: tr("home", lang), url: `https://sos-expat.com` },
    { name: tr("breadTools", lang), url: canonical },
  ];

  return (
    <Layout>
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        canonicalUrl={canonical}
      />
      <BreadcrumbSchema items={breadcrumbs} />

      {/* ── BREADCRUMB VISUEL ── */}
      <nav aria-label="breadcrumb" className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-2">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500" dir={lang === "ar" ? "rtl" : "ltr"}>
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

      <div
        className="min-h-screen bg-slate-950"
        dir={lang === "ar" ? "rtl" : "ltr"}
      >
        {/* Header */}
        <header className="border-b border-slate-800 bg-slate-900">
          <div className="max-w-6xl mx-auto px-4 lg:px-6 pt-8 pb-10 lg:pt-12 lg:pb-14">
            <div
              className="inline-flex items-center gap-2 px-3 py-1 text-[11px] font-bold uppercase tracking-[1.2px]
                         bg-red-500/10 text-red-400 border border-red-500/20 rounded mb-5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {tr("badge", lang)}
            </div>

            <h1
              className="text-slate-100 font-light leading-[1.1] tracking-[-0.5px] mb-4"
              style={{ fontSize: "clamp(26px, 4.5vw, 44px)" }}
            >
              {tr("heading", lang)}
            </h1>

            <p className="text-slate-400 text-base max-w-2xl">
              {tr("subheading", lang)}
            </p>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-6xl mx-auto px-4 lg:px-6 py-10">
          {loading && (
            <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-base">{tr("loading", lang)}</span>
            </div>
          )}

          {error && !loading && (
            <div className="text-center py-20 text-slate-400">
              <AlertTriangle className="w-10 h-10 mx-auto mb-4 text-red-400" />
              <p className="text-base">{tr("error", lang)}</p>
            </div>
          )}

          {!loading && !error && (
            <div className="space-y-14">
              {catOrder.map((cat) => {
                const catTools = categories[cat];
                if (!catTools?.length) return null;
                const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS.calculate;

                return (
                  <section key={cat}>
                    {/* Category heading */}
                    <div className="flex items-center gap-3 mb-6">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-[1.2px] border ${colors.bg} ${colors.text} ${colors.border}`}
                      >
                        {tr(catLabelKeys[cat] || "catCalculate", lang)}
                      </span>
                      <span className="text-sm text-slate-400">
                        {catTools.length} {lang === "fr" ? "outils" : lang === "ar" ? "أدوات" : "tools"}
                      </span>
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {catTools.map((tool) => {
                        const Icon = ICON_MAP[tool.slug_key] || Calculator;
                        const desc = tool.translation.meta_description || tool.translation.description;
                        const shortDesc = desc ? desc.slice(0, 110) + (desc.length > 110 ? "…" : "") : "";

                        return (
                          <a
                            key={tool.id}
                            href={tool.blog_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex flex-col rounded-xl border border-slate-700/60 bg-slate-900 p-5 transition-all hover:shadow-lg hover:border-slate-500/70"
                          >
                            {/* Icon + badges */}
                            <div className="flex items-start justify-between mb-3">
                              <div
                                className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors.bg}`}
                              >
                                <Icon className={`w-5 h-5 ${colors.text}`} />
                              </div>
                              <div className="flex items-center gap-1.5">
                                {tool.is_ai && (
                                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">
                                    {tr("aiPowered", lang)}
                                  </span>
                                )}
                                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">
                                  {tr("free", lang)}
                                </span>
                              </div>
                            </div>

                            {/* Title */}
                            <h2 className="font-semibold text-base leading-snug mb-2 text-slate-100 group-hover:opacity-80 transition-opacity">
                              {tool.translation.title}
                            </h2>

                            {/* Description */}
                            {shortDesc && (
                              <p className="text-sm leading-relaxed flex-1 mb-4 text-slate-400">
                                {shortDesc}
                              </p>
                            )}

                            {/* CTA */}
                            <div className={`flex items-center gap-1 text-sm font-semibold mt-auto ${colors.text}`}>
                              {tr("useNow", lang)}
                              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </Layout>
  );
}
