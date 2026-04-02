/**
 * Sondages (Surveys) — API-connected 2026
 * Palette: Rouge #DC2626 / Noir #0F172A / Blanc
 * Listing uniquement — votes sur blog.sos-expat.com
 */

import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { parseLocaleFromPath } from "@/multilingual-system";
import { useApp } from "@/contexts/AppContext";
import Layout from "@/components/layout/Layout";
import SEOHead from "@/components/layout/SEOHead";

// ============================================================
// CONFIG
// ============================================================

const API_BASE = "https://sos-expat.com/api/v1/public/sondages";

const SURVEY_SEGMENTS: Record<string, { surveys: string; vacanciers: string }> = {
  fr: { surveys: "sondages-expatries", vacanciers: "sondages-vacanciers" },
  en: { surveys: "expat-surveys", vacanciers: "holiday-surveys" },
  es: { surveys: "encuestas-expatriados", vacanciers: "encuestas-vacaciones" },
  de: { surveys: "expat-umfragen", vacanciers: "urlaubsumfragen" },
  pt: { surveys: "pesquisas-expatriados", vacanciers: "pesquisas-ferias" },
  ru: { surveys: "oprosy-expatov", vacanciers: "oprosy-otpusk" },
  zh: { surveys: "expat-diaocha", vacanciers: "jiaqi-diaocha" },
  hi: { surveys: "pravasi-sarvekshan", vacanciers: "chhutti-sarvekshan" },
  ar: { surveys: "istitalaat-mughtaribeen", vacanciers: "istitalaat-ijaza" },
};

const LOCALE_COUNTRY: Record<string, string> = {
  fr: "fr-fr",
  en: "en-gb",
  es: "es-es",
  de: "de-de",
  pt: "pt-br",
  ru: "ru-ru",
  zh: "zh-cn",
  hi: "hi-in",
  ar: "ar-sa",
};

// ============================================================
// TYPES
// ============================================================

interface SondageTranslation {
  title: string;
  slug: string;
  description: string;
  meta_title?: string;
  meta_description?: string;
}

interface Sondage {
  id: number;
  external_id: string;
  type: "expat" | "vacancier";
  status: "active" | "closed";
  responses_count: number;
  closes_at: string | null;
  published_at: string;
  translation: SondageTranslation;
}

type FilterTab = "all" | "expat" | "vacancier";

// ============================================================
// HELPERS
// ============================================================

function getSurveyUrl(sondage: Sondage, lang: string): string {
  const locale = LOCALE_COUNTRY[lang] ?? "fr-fr";
  const segs = SURVEY_SEGMENTS[lang] ?? SURVEY_SEGMENTS.fr;
  const seg = sondage.type === "vacancier" ? segs.vacanciers : segs.surveys;
  return `https://sos-expat.com/${locale}/${seg}/${sondage.translation.slug}`;
}

function detectLang(
  appLanguage: string | undefined,
  pathname: string,
): string {
  // 1. From AppContext
  if (appLanguage && Object.keys(SURVEY_SEGMENTS).includes(appLanguage)) {
    return appLanguage;
  }
  // 2. From URL path locale
  const pathLang = parseLocaleFromPath(pathname)?.lang;
  if (pathLang && Object.keys(SURVEY_SEGMENTS).includes(pathLang)) {
    return pathLang;
  }
  // 3. From window.__toolConfig (used by embedded widgets)
  const toolLang = (window as unknown as Record<string, unknown>).__toolConfig as Record<string, string> | undefined;
  if (toolLang?.lang && Object.keys(SURVEY_SEGMENTS).includes(toolLang.lang)) {
    return toolLang.lang;
  }
  // 4. From browser navigator
  const nav = (navigator.language || "fr").split("-")[0].toLowerCase();
  return Object.keys(SURVEY_SEGMENTS).includes(nav) ? nav : "fr";
}

// ============================================================
// i18n
// ============================================================

const labels: Record<string, Record<string, string>> = {
  title: {
    fr: "Sondages", en: "Surveys", es: "Encuestas", de: "Umfragen",
    pt: "Pesquisas", ru: "Опросы", zh: "调查", hi: "सर्वेक्षण", ar: "الاستطلاعات",
  },
  subtitle: {
    fr: "Découvrez les sondages de la communauté expatriée.",
    en: "Discover surveys from the expat community.",
    es: "Descubre las encuestas de la comunidad expatriada.",
    de: "Entdecken Sie Umfragen der Expat-Community.",
    pt: "Descubra as pesquisas da comunidade expatriada.",
    ru: "Откройте для себя опросы сообщества экспатов.",
    zh: "发现海外侨民社区的调查。",
    hi: "प्रवासी समुदाय के सर्वेक्षण खोजें।",
    ar: "اكتشف استطلاعات مجتمع المغتربين.",
  },
  all: {
    fr: "Tous", en: "All", es: "Todos", de: "Alle", pt: "Todos",
    ru: "Все", zh: "全部", hi: "सभी", ar: "الكل",
  },
  expat: {
    fr: "Expatriés", en: "Expats", es: "Expatriados", de: "Expats",
    pt: "Expatriados", ru: "Экспаты", zh: "外籍人士", hi: "प्रवासी", ar: "المغتربون",
  },
  vacancier: {
    fr: "Vacanciers", en: "Holidaymakers", es: "Vacacionistas", de: "Urlauber",
    pt: "Férias", ru: "Отдыхающие", zh: "度假者", hi: "अवकाश", ar: "المصطافون",
  },
  active: {
    fr: "En cours", en: "Active", es: "En curso", de: "Aktiv",
    pt: "Em curso", ru: "Активен", zh: "进行中", hi: "सक्रिय", ar: "نشط",
  },
  closed: {
    fr: "Terminé", en: "Closed", es: "Cerrado", de: "Beendet",
    pt: "Encerrado", ru: "Завершён", zh: "已结束", hi: "बंद", ar: "مغلق",
  },
  responses: {
    fr: "réponses", en: "responses", es: "respuestas", de: "Antworten",
    pt: "respostas", ru: "ответов", zh: "回复", hi: "उत्तर", ar: "إجابات",
  },
  participate: {
    fr: "Participer", en: "Take survey", es: "Participar", de: "Teilnehmen",
    pt: "Participar", ru: "Пройти", zh: "参与", hi: "भाग लें", ar: "شارك",
  },
  closes: {
    fr: "Ferme le", en: "Closes", es: "Cierra el", de: "Endet am",
    pt: "Fecha em", ru: "Закрыт", zh: "截止", hi: "बंद होता है", ar: "يغلق",
  },
  loading_text: {
    fr: "Chargement…", en: "Loading…", es: "Cargando…", de: "Laden…",
    pt: "A carregar…", ru: "Загрузка…", zh: "加载中…", hi: "लोड हो रहा है…", ar: "جارٍ التحميل…",
  },
  empty: {
    fr: "Aucun sondage disponible.", en: "No surveys available.",
    es: "No hay encuestas disponibles.", de: "Keine Umfragen verfügbar.",
    pt: "Nenhuma pesquisa disponível.", ru: "Нет доступных опросов.",
    zh: "暂无调查。", hi: "कोई सर्वेक्षण उपलब्ध नहीं।", ar: "لا توجد استطلاعات متاحة.",
  },
  network_error: {
    fr: "Erreur réseau. Veuillez réessayer.", en: "Network error. Please try again.",
    es: "Error de red. Por favor, inténtelo de nuevo.", de: "Netzwerkfehler. Bitte versuchen Sie es erneut.",
    pt: "Erro de rede. Por favor, tente novamente.", ru: "Ошибка сети. Пожалуйста, попробуйте снова.",
    zh: "网络错误，请重试。", hi: "नेटवर्क त्रुटि। कृपया पुनः प्रयास करें।", ar: "خطأ في الشبكة. يرجى المحاولة مرة أخرى.",
  },
};

const t = (key: string, lang: string): string =>
  labels[key]?.[lang] ?? labels[key]?.["fr"] ?? key;

// ============================================================
// SKELETON
// ============================================================

const SkeletonCard: React.FC = () => (
  <div className="bg-white/5 border border-white/10 rounded-2xl p-5 animate-pulse">
    <div className="flex gap-2 mb-3">
      <div className="h-5 w-16 bg-white/10 rounded" />
      <div className="h-5 w-20 bg-white/10 rounded" />
    </div>
    <div className="h-4 w-3/4 bg-white/10 rounded mb-2" />
    <div className="h-3 w-full bg-white/10 rounded mb-1" />
    <div className="h-3 w-5/6 bg-white/10 rounded mb-1" />
    <div className="h-3 w-2/3 bg-white/10 rounded mb-4" />
    <div className="border-t border-white/5 pt-2 flex justify-between">
      <div className="h-3 w-24 bg-white/10 rounded" />
      <div className="h-3 w-24 bg-white/10 rounded" />
    </div>
    <div className="mt-3 h-3 w-20 bg-white/10 rounded" />
  </div>
);

// ============================================================
// SURVEY CARD
// ============================================================

const SurveyCard: React.FC<{ sondage: Sondage; lang: string }> = ({
  sondage,
  lang,
}) => {
  const url = getSurveyUrl(sondage, lang);
  const localeTag = LOCALE_COUNTRY[lang] ?? "fr-fr";
  const closesDate = sondage.closes_at
    ? new Date(sondage.closes_at).toLocaleDateString(localeTag, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-[#DC2626]/40 hover:bg-white/[0.08] transition-all"
    >
      {/* Badges */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span
          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
            sondage.status === "active"
              ? "text-green-400 bg-green-400/10 border border-green-400/20"
              : "text-white/40 bg-white/5 border border-white/10"
          }`}
        >
          {sondage.status === "active" && "● "}
          {t(sondage.status, lang)}
        </span>
        <span
          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
            sondage.type === "expat"
              ? "text-[#DC2626] bg-[#DC2626]/10 border border-[#DC2626]/20"
              : "text-blue-400 bg-blue-400/10 border border-blue-400/20"
          }`}
        >
          {sondage.type === "expat" ? "✈️ " : "🏖️ "}
          {t(sondage.type === "expat" ? "expat" : "vacancier", lang)}
        </span>
      </div>

      {/* Title */}
      <h2 className="text-white font-semibold leading-snug mb-2 line-clamp-2 group-hover:text-[#DC2626] transition-colors text-sm">
        {sondage.translation.title}
      </h2>

      {/* Description */}
      {sondage.translation.description && (
        <p className="text-white/50 text-xs leading-relaxed line-clamp-3 mb-3">
          {sondage.translation.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-white/40 mt-auto pt-2 border-t border-white/5">
        <span>
          📊 {sondage.responses_count} {t("responses", lang)}
        </span>
        {closesDate && sondage.status === "active" && (
          <span>
            ⏳ {t("closes", lang)} {closesDate}
          </span>
        )}
      </div>

      <div className="mt-3 text-[#DC2626] text-xs font-semibold group-hover:underline">
        {t("participate", lang)} →
      </div>
    </a>
  );
};

// ============================================================
// MAIN PAGE
// ============================================================

const Sondages: React.FC = () => {
  const location = useLocation();
  const { language } = useApp();
  const lang = detectLang(language, location.pathname);

  const [filter, setFilter] = useState<FilterTab>("all");
  const [surveys, setSurveys] = useState<Sondage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);

    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`${API_BASE}?lang=${lang}&status=active`, { signal: ctrl.signal }).then(
        (r) => (r.ok ? r.json() : []),
      ),
      fetch(`${API_BASE}?lang=${lang}&status=closed`, { signal: ctrl.signal }).then(
        (r) => (r.ok ? r.json() : []),
      ),
    ])
      .then(([active, closed]) => {
        clearTimeout(timer);
        setSurveys([
          ...(Array.isArray(active) ? active : []),
          ...(Array.isArray(closed) ? closed : []),
        ]);
      })
      .catch((e: Error) => {
        if (e.name !== "AbortError") {
          setError(t("network_error", lang));
        }
      })
      .finally(() => setLoading(false));

    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [lang]);

  const filtered = surveys.filter(
    (s) => filter === "all" || s.type === filter,
  );

  return (
    <Layout>
      <SEOHead
        title={`${t("title", lang)} | SOS-Expat`}
        description={t("subtitle", lang)}
      />

      <div className="min-h-screen bg-[#0F172A] text-white">
        {/* Header */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-6">
          <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-white mb-1">
            {t("title", lang)}
          </h1>
          <p className="text-white/40 text-sm mb-5">{t("subtitle", lang)}</p>

          {/* Filter tabs */}
          <div className="flex gap-2 flex-wrap">
            {(["all", "expat", "vacancier"] as FilterTab[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filter === f
                    ? "bg-[#DC2626] text-white"
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                }`}
              >
                {f === "expat" ? "✈️ " : f === "vacancier" ? "🏖️ " : ""}
                {t(f, lang)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((n) => (
                <SkeletonCard key={n} />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-20 text-red-400">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-white/50">
              {t("empty", lang)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((s) => (
                <SurveyCard key={s.id} sondage={s} lang={lang} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Sondages;
