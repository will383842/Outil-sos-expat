/**
 * Fiches Pays — Category Page Premium 2026
 * Palette: Rouge #DC2626 / Noir #0F172A / Blanc
 * Guides complets par pays de destination pour expatries
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
  Globe,
  MapPin,
  BookOpen,
  ArrowRight,
  Clock,
  Layers,
  Map as MapIcon,
  Flag,
  Loader2,
  ChevronRight,
} from "lucide-react";

// ============================================================
// i18n
// ============================================================

const T: Record<string, Record<string, string>> = {
  badge: { fr: "Fiches Pays", en: "Country Sheets", es: "Fichas de Países", de: "Länderprofile", pt: "Fichas de Países", ru: "Страновые справки", ch: "国家资料", hi: "देश शीट्स", ar: "بطاقات الدول" },
  title: { fr: "Guides par pays de destination", en: "Guides by destination country", es: "Guías por país de destino", de: "Ratgeber nach Zielland", pt: "Guias por país de destino", ru: "Гиды по странам назначения", ch: "按目的地国家分类的指南", hi: "गंतव्य देश के अनुसार गाइड", ar: "أدلة حسب بلد المقصد" },
  subtitle: { fr: "Retrouvez toutes les informations essentielles pour votre expatriation : demarches administratives, cout de la vie, sante, logement, fiscalite et bien plus.", en: "Find all essential information for your expatriation: administrative procedures, cost of living, healthcare, housing, taxes and more.", es: "Encuentra toda la información esencial para tu expatriación: trámites administrativos, coste de la vida, salud, vivienda, fiscalidad y mucho más.", de: "Finden Sie alle wesentlichen Informationen für Ihre Auswanderung: Behördengänge, Lebenshaltungskosten, Gesundheitsversorgung, Wohnen, Steuern und vieles mehr.", pt: "Encontre todas as informações essenciais para a sua expatriação: procedimentos administrativos, custo de vida, saúde, habitação, fiscalidade e muito mais.", ru: "Найдите всю необходимую информацию для эмиграции: административные процедуры, стоимость жизни, здравоохранение, жильё, налоги и многое другое.", ch: "查找海外移居所需的全部关键信息：行政手续、生活成本、医疗、住房、税务等。", hi: "अपने प्रवास के लिए सभी आवश्यक जानकारी प्राप्त करें: प्रशासनिक प्रक्रियाएं, जीवन यापन लागत, स्वास्थ्य, आवास, कर और भी बहुत कुछ।", ar: "اعثر على جميع المعلومات الأساسية لهجرتك: الإجراءات الإدارية، تكلفة المعيشة، الرعاية الصحية، السكن، الضرائب والمزيد." },
  statSheets: { fr: "fiches pays", en: "country sheets", es: "fichas de países", de: "Länderprofile", pt: "fichas de países", ru: "страновых справок", ch: "个国家资料", hi: "देश शीट्स", ar: "بطاقة دول" },
  statContinents: { fr: "continents", en: "continents", es: "continentes", de: "Kontinente", pt: "continentes", ru: "континентов", ch: "大洲", hi: "महाद्वीप", ar: "قارات" },
  statCountries: { fr: "pays couverts", en: "countries covered", es: "países cubiertos", de: "Länder abgedeckt", pt: "países cobertos", ru: "стран охвачено", ch: "个国家", hi: "देश शामिल", ar: "دولة مغطاة" },
  filterAll: { fr: "Tous", en: "All", es: "Todos", de: "Alle", pt: "Todos", ru: "Все", ch: "全部", hi: "सभी", ar: "الكل" },
  filterEurope: { fr: "Europe", en: "Europe", es: "Europa", de: "Europa", pt: "Europa", ru: "Европа", ch: "欧洲", hi: "यूरोप", ar: "أوروبا" },
  filterAfrica: { fr: "Afrique", en: "Africa", es: "África", de: "Afrika", pt: "África", ru: "Африка", ch: "非洲", hi: "अफ्रीका", ar: "أفريقيا" },
  filterAsia: { fr: "Asie", en: "Asia", es: "Asia", de: "Asien", pt: "Ásia", ru: "Азия", ch: "亚洲", hi: "एशिया", ar: "آسيا" },
  filterAmericas: { fr: "Ameriques", en: "Americas", es: "Américas", de: "Amerika", pt: "Américas", ru: "Америка", ch: "美洲", hi: "अमेरिका", ar: "الأمريكتان" },
  filterMiddleEast: { fr: "Moyen-Orient", en: "Middle East", es: "Oriente Medio", de: "Naher Osten", pt: "Médio Oriente", ru: "Ближний Восток", ch: "中东", hi: "मध्य पूर्व", ar: "الشرق الأوسط" },
  filterOceania: { fr: "Oceanie", en: "Oceania", es: "Oceanía", de: "Ozeanien", pt: "Oceânia", ru: "Океания", ch: "大洋洲", hi: "ओशिनिया", ar: "أوقيانوسيا" },
  searchPlaceholder: { fr: "Rechercher un pays...", en: "Search a country...", es: "Buscar un país...", de: "Land suchen...", pt: "Pesquisar um país...", ru: "Поиск страны...", ch: "搜索国家...", hi: "देश खोजें...", ar: "ابحث عن دولة..." },
  rubriques: { fr: "rubriques disponibles", en: "sections available", es: "secciones disponibles", de: "Abschnitte verfügbar", pt: "secções disponíveis", ru: "разделов доступно", ch: "个可用章节", hi: "उपलब्ध अनुभाग", ar: "أقسام متاحة" },
  updatedOn: { fr: "Mis a jour le", en: "Updated on", es: "Actualizado el", de: "Aktualisiert am", pt: "Atualizado em", ru: "Обновлено", ch: "更新于", hi: "अपडेट किया गया", ar: "تم التحديث في" },
  comingSoon: { fr: "Bientot disponible", en: "Coming soon", es: "Próximamente", de: "Demnächst", pt: "Em breve", ru: "Скоро", ch: "即将推出", hi: "जल्द आ रहा है", ar: "قريباً" },
  ctaTitle: { fr: "Un pays manque a l'appel ?", en: "A country missing?", es: "¿Falta algún país?", de: "Fehlt ein Land?", pt: "Falta algum país?", ru: "Какой-то страны не хватает?", ch: "缺少某个国家？", hi: "कोई देश छूट गया?", ar: "هل دولة ما غائبة؟" },
  ctaSubtitle: { fr: "Suggerez un pays et notre equipe preparera une fiche complete pour vous.", en: "Suggest a country and our team will prepare a complete sheet for you.", es: "Sugiere un país y nuestro equipo preparará una ficha completa para ti.", de: "Schlagen Sie ein Land vor und unser Team erstellt ein vollständiges Profil für Sie.", pt: "Sugira um país e a nossa equipa preparará uma ficha completa para si.", ru: "Предложите страну, и наша команда подготовит для вас полный гид.", ch: "推荐一个国家，我们的团队将为您准备完整的资料。", hi: "एक देश सुझाएं और हमारी टीम आपके लिए एक पूर्ण शीट तैयार करेगी।", ar: "اقترح دولة وسيُعدّ فريقنا ملفاً كاملاً لك." },
  ctaButton: { fr: "Suggerer un pays", en: "Suggest a country", es: "Sugerir un país", de: "Land vorschlagen", pt: "Sugerir um país", ru: "Предложить страну", ch: "建议添加国家", hi: "देश सुझाएं", ar: "اقترح دولة" },
  noResults: { fr: "Aucun pays ne correspond a votre recherche.", en: "No country matches your search.", es: "Ningún país coincide con tu búsqueda.", de: "Kein Land entspricht Ihrer Suche.", pt: "Nenhum país corresponde à sua pesquisa.", ru: "Ни одна страна не соответствует вашему запросу.", ch: "没有与您搜索匹配的国家。", hi: "आपकी खोज से कोई देश मेल नहीं खाता।", ar: "لا توجد دولة تطابق بحثك." },
  seoTitle: { fr: "Fiches Pays Expatriation | SOS-Expat", en: "Country Expatriation Sheets | SOS-Expat", es: "Fichas de Países para Expatriados | SOS-Expat", de: "Länderprofile Auswanderung | SOS-Expat", pt: "Fichas de Países Expatriação | SOS-Expat", ru: "Страновые справки для эмигрантов | SOS-Expat", ch: "外籍人士国家资料 | SOS-Expat", hi: "देश प्रवास शीट्स | SOS-Expat", ar: "بطاقات الدول للمغتربين | SOS-Expat" },
  seoDescription: { fr: "Guides complets par pays de destination : demarches, cout de la vie, sante, logement, fiscalite. Plus de 200 pays couverts sur 7 continents.", en: "Complete guides by destination country: procedures, cost of living, healthcare, housing, taxes. Over 200 countries covered across 7 continents.", es: "Guías completas por país de destino: trámites, coste de la vida, salud, vivienda, fiscalidad. Más de 200 países cubiertos en los 7 continentes.", de: "Umfassende Ratgeber nach Zielland: Behördengänge, Lebenshaltungskosten, Gesundheit, Wohnen, Steuern. Über 200 Länder auf 7 Kontinenten abgedeckt.", pt: "Guias completos por país de destino: procedimentos, custo de vida, saúde, habitação, fiscalidade. Mais de 200 países cobertos nos 7 continentes.", ru: "Подробные гиды по странам назначения: процедуры, стоимость жизни, здоровье, жильё, налоги. Охвачено более 200 стран на 7 континентах.", ch: "按目的地国家分类的完整指南：手续、生活成本、医疗、住房、税务。覆盖全球7大洲200多个国家。", hi: "गंतव्य देश के अनुसार संपूर्ण गाइड: प्रक्रियाएं, जीवन यापन लागत, स्वास्थ्य, आवास, कर। 7 महाद्वीपों पर 200 से अधिक देश शामिल।", ar: "أدلة شاملة حسب بلد المقصد: إجراءات، تكلفة المعيشة، صحة، سكن، ضرائب. أكثر من 200 دولة مغطاة عبر 7 قارات." },
  home: { fr: "Accueil", en: "Home", es: "Inicio", de: "Startseite", pt: "Início", ru: "Главная", ch: "首页", hi: "होम", ar: "الرئيسية" },
  breadcrumbLabel: { fr: "Fiches Pays", en: "Country Guides", es: "Fichas de Países", de: "Länderprofile", pt: "Fichas de Países", ru: "Страновые справки", ch: "国家资料", hi: "देश गाइड", ar: "بطاقات الدول" },
};

// ============================================================
// CONTINENTS
// ============================================================

type Continent = "Europe" | "Afrique" | "Asie" | "Ameriques" | "Moyen-Orient" | "Oceanie";

const CONTINENT_KEYS: Continent[] = [
  "Europe",
  "Afrique",
  "Asie",
  "Ameriques",
  "Moyen-Orient",
  "Oceanie",
];

const CONTINENT_FILTER_KEYS: Record<Continent, string> = {
  Europe: "filterEurope",
  Afrique: "filterAfrica",
  Asie: "filterAsia",
  Ameriques: "filterAmericas",
  "Moyen-Orient": "filterMiddleEast",
  Oceanie: "filterOceania",
};

// ============================================================
// TYPES & API
// ============================================================

interface CountrySheet {
  code: string;
  name: string;  // title from blog article in requested lang
  slug: string;  // article slug for linking
  continent: Continent;
  readingTime: number;
  publishedAt?: string;
}

const BLOG_API = "https://sos-expat.com/api/v1/public";

// Blog article URL helpers (same as in Articles.tsx)
const LANG_LOCALE: Record<string, string> = {
  fr: "fr-fr", en: "en-us", es: "es-es", de: "de-de",
  ru: "ru-ru", pt: "pt-pt", zh: "zh-cn", hi: "hi-in", ar: "ar-sa",
};
const ARTICLES_SEGMENT: Record<string, string> = {
  fr: "articles", en: "articles", es: "articulos", de: "artikel",
  pt: "artigos", ru: "stati", zh: "wenzhang", hi: "lekh", ar: "maqalat",
};
function articleUrl(lang: string, slug: string): string {
  return `/${LANG_LOCALE[lang] ?? "fr-fr"}/${ARTICLES_SEGMENT[lang] ?? "articles"}/${slug}`;
}

// Continent lookup by country code (comprehensive for expat destinations)
const COUNTRY_CONTINENT: Record<string, Continent> = {
  // Europe
  FR: "Europe", DE: "Europe", ES: "Europe", IT: "Europe", PT: "Europe", BE: "Europe",
  NL: "Europe", CH: "Europe", AT: "Europe", SE: "Europe", NO: "Europe", DK: "Europe",
  FI: "Europe", PL: "Europe", CZ: "Europe", HU: "Europe", RO: "Europe", GR: "Europe",
  GB: "Europe", IE: "Europe", LU: "Europe", HR: "Europe", SK: "Europe", SI: "Europe",
  BG: "Europe", EE: "Europe", LV: "Europe", LT: "Europe", MT: "Europe", CY: "Europe",
  // Africa
  MA: "Afrique", TN: "Afrique", DZ: "Afrique", SN: "Afrique", CI: "Afrique",
  ZA: "Afrique", NG: "Afrique", KE: "Afrique", EG: "Afrique", GH: "Afrique",
  CM: "Afrique", MU: "Afrique", MG: "Afrique", ET: "Afrique", TZ: "Afrique",
  // Asia
  JP: "Asie", CN: "Asie", TH: "Asie", SG: "Asie", KR: "Asie", IN: "Asie",
  HK: "Asie", VN: "Asie", MY: "Asie", ID: "Asie", PH: "Asie", TW: "Asie",
  BD: "Asie", PK: "Asie", LK: "Asie", MM: "Asie", NP: "Asie", KH: "Asie",
  // Americas
  CA: "Ameriques", US: "Ameriques", BR: "Ameriques", MX: "Ameriques",
  CO: "Ameriques", AR: "Ameriques", CL: "Ameriques", PE: "Ameriques",
  EC: "Ameriques", BO: "Ameriques", PY: "Ameriques", UY: "Ameriques",
  CR: "Ameriques", PA: "Ameriques", CU: "Ameriques", DO: "Ameriques",
  // Middle East
  AE: "Moyen-Orient", SA: "Moyen-Orient", QA: "Moyen-Orient", KW: "Moyen-Orient",
  IL: "Moyen-Orient", TR: "Moyen-Orient", JO: "Moyen-Orient", LB: "Moyen-Orient",
  BH: "Moyen-Orient", OM: "Moyen-Orient", IQ: "Moyen-Orient", IR: "Moyen-Orient",
  // Oceania
  AU: "Oceanie", NZ: "Oceanie", FJ: "Oceanie", PG: "Oceanie",
};

// ============================================================
// ANIMATIONS
// ============================================================

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

// ============================================================
// HELPERS
// ============================================================

function formatDate(iso: string, lang: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function t(key: string, lang: string): string {
  return T[key]?.[lang] ?? T[key]?.["fr"] ?? key;
}

// ============================================================
// COMPONENT
// ============================================================

const FichesPays: React.FC = () => {
  const location = useLocation();
  const { language } = useApp();
  const lang = (language || parseLocaleFromPath(location.pathname)?.lang || "fr") as string;
  const localeSlug = location.pathname.match(/^\/([a-z]{2}-[a-z]{2})/)?.[1] ?? "fr-fr";

  const [activeContinent, setActiveContinent] = useState<Continent | null>(null);
  const [search, setSearch] = useState("");
  const [countries, setCountries] = useState<CountrySheet[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch from Blog API: fiches-pays category, 1 article per country
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    fetch(`${BLOG_API}/articles?category=fiches-pays&lang=${lang}&per_page=100`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((json) => {
        const raw: Array<{
          id: string;
          slug: string;
          title: string;
          reading_time_minutes: number;
          published_at: string;
          countries: string[];
        }> = json.data ?? [];

        // Map each article to a CountrySheet using its first country code
        const seen = new Set<string>();
        const sheets: CountrySheet[] = [];

        for (const article of raw) {
          const code = (article.countries?.[0] ?? "").toUpperCase();
          if (!code || seen.has(code)) continue;
          seen.add(code);
          sheets.push({
            code,
            name:       article.title,
            slug:       article.slug,
            continent:  COUNTRY_CONTINENT[code] ?? "Europe",
            readingTime: article.reading_time_minutes,
            publishedAt: article.published_at,
          });
        }
        setCountries(sheets);
      })
      .catch(() => {/* network error: show empty state */})
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [lang]);

  // Filtered & grouped
  const filtered = useMemo(() => {
    let list = countries;
    if (activeContinent) {
      list = list.filter((c) => c.continent === activeContinent);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeContinent, search, countries]);

  const grouped = useMemo(() => {
    const map = new Map<Continent, CountrySheet[]>();
    for (const c of filtered) {
      if (!map.has(c.continent)) map.set(c.continent, []);
      map.get(c.continent)!.push(c);
    }
    const sorted: [Continent, CountrySheet[]][] = [];
    for (const key of CONTINENT_KEYS) {
      const items = map.get(key);
      if (items && items.length > 0) sorted.push([key, items]);
    }
    return sorted;
  }, [filtered]);

  const continentCount = useMemo(
    () => new Set(countries.map((c) => c.continent)).size,
    [countries]
  );

  const stats = [
    { icon: BookOpen, value: loading ? "…" : countries.length, label: t("statSheets", lang) },
    { icon: MapIcon, value: loading ? "…" : continentCount, label: t("statContinents", lang) },
    { icon: Globe, value: "200+", label: t("statCountries", lang) },
  ];

  // ----- Filter pills -----
  const filters: { key: Continent | null; label: string }[] = [
    { key: null, label: t("filterAll", lang) },
    ...CONTINENT_KEYS.map((c) => ({
      key: c as Continent,
      label: t(CONTINENT_FILTER_KEYS[c], lang),
    })),
  ];

  return (
    <Layout>
      <SEOHead
        title={t("seoTitle", lang)}
        description={t("seoDescription", lang)}
      />
      <BreadcrumbSchema items={[
        { name: t("home", lang), url: `/${localeSlug}` },
        { name: t("breadcrumbLabel", lang) },
      ]} />

      {/* ── BREADCRUMB VISUEL ── */}
      <nav aria-label="breadcrumb" className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
            <li>
              <a href={`/${localeSlug}`} className="hover:text-red-600 transition-colors">
                {t("home", lang)}
              </a>
            </li>
            <li><ChevronRight size={14} className="text-gray-300 shrink-0" /></li>
            <li className="text-gray-900 font-medium">{t("breadcrumbLabel", lang)}</li>
          </ol>
        </div>
      </nav>

      {/* ====== HERO ====== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-red-50/40 pt-20 pb-16 sm:pt-28 sm:pb-20">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, #DC2626 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }} />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
          >
            {/* Badge */}
            <span className="inline-flex items-center gap-2 rounded-full bg-red-600/10 px-4 py-1.5 text-sm font-semibold text-red-600 mb-6">
              <Flag className="h-4 w-4" />
              {t("badge", lang)}
            </span>

            {/* H1 */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 mb-5 leading-[1.1]">
              {t("title", lang)}
            </h1>

            {/* Subtitle */}
            <p className="mx-auto max-w-2xl text-base sm:text-lg text-gray-500 leading-relaxed mb-10">
              {t("subtitle", lang)}
            </p>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-6 sm:gap-10">
              {stats.map((s) => (
                <div key={s.label} className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600/10">
                    <s.icon className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-xl font-bold text-gray-900">{s.value}</p>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ====== FILTERS + SEARCH ====== */}
      <section className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 space-y-4">
          {/* Continent pills */}
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => {
              const active = activeContinent === f.key;
              return (
                <button
                  key={f.label}
                  onClick={() => setActiveContinent(f.key)}
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

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder", lang)}
              aria-label={t("searchPlaceholder", lang)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50/60 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-red-300 focus:ring-2 focus:ring-red-600/10 focus:bg-white outline-none transition"
            />
          </div>
        </div>
      </section>

      {/* ====== COUNTRY CARDS ====== */}
      <section className="bg-gray-50/50 py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
            </div>
          ) : grouped.length === 0 ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-gray-400 py-20 text-lg"
            >
              {t("noResults", lang)}
            </motion.p>
          ) : (
            grouped.map(([continent, continentCountries]) => (
              <motion.div
                key={continent}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                variants={fadeInUp}
                className="mb-14 last:mb-0"
              >
                {/* Continent header */}
                <div className="flex items-center gap-3 mb-6">
                  <Layers className="h-5 w-5 text-red-600" />
                  <h2 className="text-xl font-bold text-gray-900">
                    {t(CONTINENT_FILTER_KEYS[continent], lang)}
                  </h2>
                  <span className="text-sm text-gray-400 font-medium">
                    ({continentCountries.length})
                  </span>
                </div>

                {/* Cards grid */}
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
                >
                  {continentCountries.map((country) => (
                    <motion.article
                      key={country.code}
                      variants={cardVariant}
                      whileHover={{ y: -4, scale: 1.01 }}
                      className="group relative bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-xl hover:border-red-100 transition-all duration-300"
                    >
                      <a href={articleUrl(lang, country.slug)} className="flex items-start gap-4" aria-label={country.name}>
                        {/* Flag */}
                        <div className="flex-shrink-0 h-10 w-10 rounded-lg overflow-hidden bg-gray-100">
                          <img
                            src={`https://flagcdn.com/w40/${country.code.toLowerCase()}.png`}
                            alt={country.code}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold text-gray-900 group-hover:text-red-600 transition-colors line-clamp-2">
                            {country.name}
                          </h3>

                          <span className="inline-block mt-1 text-xs font-medium text-gray-400 bg-gray-50 rounded-full px-2.5 py-0.5">
                            {t(CONTINENT_FILTER_KEYS[country.continent], lang)}
                          </span>

                          <p className="mt-2.5 text-sm text-gray-500 flex items-center gap-1.5">
                            <BookOpen className="h-3.5 w-3.5 text-gray-400" />
                            {country.readingTime} {t("rubriques", lang)}
                          </p>

                          {country.publishedAt && (
                            <span className="inline-flex items-center gap-1 mt-2 text-xs text-emerald-600 bg-emerald-50 rounded-full px-2.5 py-0.5 font-medium">
                              <Clock className="h-3 w-3" />
                              {t("updatedOn", lang)} {formatDate(country.publishedAt, lang)}
                            </span>
                          )}
                        </div>

                        <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-red-500 group-hover:translate-x-0.5 transition-all mt-1 flex-shrink-0" />
                      </a>
                    </motion.article>
                  ))}
                </motion.div>
              </motion.div>
            ))
          )}
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
          <div className="rounded-3xl bg-gradient-to-br from-gray-900 to-gray-800 p-4 sm:p-6 md:p-10 shadow-2xl">
            <Globe className="mx-auto h-10 w-10 text-red-500 mb-5" />
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

export default FichesPays;
