/**
 * SondagesResultats — Page publique des résultats de sondages
 * "Salle de données" pour visiteurs, presse, chercheurs
 * Design: slate-950 hero + cartes blanches avec barres horizontales
 */

import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3, ChevronDown, ChevronRight, Globe, ExternalLink,
  Users, TrendingUp, CheckCircle2, Clock, Download,
} from "lucide-react";
import { parseLocaleFromPath } from "@/multilingual-system";
import { useApp } from "@/contexts/AppContext";
import Layout from "@/components/layout/Layout";
import SEOHead from "@/components/layout/SEOHead";
import BreadcrumbSchema from "@/components/seo/BreadcrumbSchema";
import { getTranslatedRouteSlug } from "@/multilingual-system";

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────

const API_URL = "https://blog.life-expat.com/api/v1/public/sondages-resultats";

const LOCALE_COUNTRY: Record<string, string> = {
  fr: "fr-fr", en: "en-us", es: "es-es", de: "de-de",
  pt: "pt-pt", ru: "ru-ru", ch: "zh-cn", hi: "hi-in", ar: "ar-sa",
};

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface Option { label: string; count: number; pct: number }
interface Question {
  id: number; text: string; type: "single" | "multiple" | "scale" | "open";
  total: number; options?: Option[]; avg_score?: number;
}
interface GeoEntry { country: string; count: number; pct: number }
interface Results { total: number; questions: Question[]; geo: GeoEntry[] }
interface Sondage {
  id: number; external_id: string; type: "expat" | "vacancier";
  status: "active" | "closed"; responses_count: number;
  published_at: string; closes_at: string | null;
  blog_url: string; results_url: string;
  translation: { title: string; slug: string; description: string };
  results: Results;
}

type FilterTab = "all" | "expat" | "vacancier";

// ─────────────────────────────────────────────
// i18n
// ─────────────────────────────────────────────

const L: Record<string, Record<string, string>> = {
  page_title:    { fr: "Résultats des sondages", en: "Survey Results", es: "Resultados de encuestas", de: "Umfrageergebnisse", pt: "Resultados das sondagens", ru: "Результаты опросов", ch: "调查结果", hi: "सर्वेक्षण परिणाम", ar: "نتائج الاستطلاعات" },
  page_sub:      { fr: "Données anonymes de la communauté expatriée et des voyageurs. Accès libre pour la presse, chercheurs et curieux.", en: "Anonymous data from the expat community and travelers. Open access for press, researchers and curious minds.", es: "Datos anónimos de la comunidad expatriada y viajeros. Acceso libre para prensa, investigadores y curiosos.", de: "Anonyme Daten der Expat-Community und Reisenden. Freier Zugang für Presse, Forscher und Neugierige.", pt: "Dados anónimos da comunidade expatriada e viajantes. Acesso livre para imprensa, investigadores e curiosos.", ru: "Анонимные данные сообщества экспатов и путешественников. Открытый доступ для прессы, исследователей и любознательных.", ch: "来自海外侨民社区和旅行者的匿名数据。对媒体、研究人员和好奇者开放。", hi: "प्रवासी समुदाय और यात्रियों का गुमनाम डेटा। प्रेस, शोधकर्ताओं और जिज्ञासुओं के लिए खुली पहुँच।", ar: "بيانات مجهولة من مجتمع المغتربين والمسافرين. وصول مفتوح للصحافة والباحثين والفضوليين." },
  all:           { fr: "Tous", en: "All", es: "Todos", de: "Alle", pt: "Todos", ru: "Все", ch: "全部", hi: "सभी", ar: "الكل" },
  expat:         { fr: "Expatriés", en: "Expats", es: "Expatriados", de: "Expats", pt: "Expatriados", ru: "Экспаты", ch: "外籍人士", hi: "प्रवासी", ar: "المغتربون" },
  vacancier:     { fr: "Vacanciers", en: "Holidaymakers", es: "Turistas", de: "Urlauber", pt: "Turistas", ru: "Туристы", ch: "度假者", hi: "पर्यटक", ar: "المصطافون" },
  active:        { fr: "En cours", en: "Active", es: "En curso", de: "Aktiv", pt: "Em curso", ru: "Активен", ch: "进行中", hi: "सक्रिय", ar: "نشط" },
  closed:        { fr: "Terminé", en: "Closed", es: "Cerrado", de: "Finalizado", pt: "Encerrado", ru: "Завершён", ch: "已结束", hi: "बंद", ar: "منتهٍ" },
  responses:     { fr: "réponses", en: "responses", es: "respuestas", de: "Antworten", pt: "respostas", ru: "ответов", ch: "回复", hi: "उत्तर", ar: "إجابات" },
  see_results:   { fr: "Résultats complets →", en: "Full results →", es: "Resultados completos →", de: "Vollständige Ergebnisse →", pt: "Resultados completos →", ru: "Полные результаты →", ch: "完整结果 →", hi: "पूर्ण परिणाम →", ar: "النتائج الكاملة →" },
  participate:   { fr: "Participer", en: "Take survey", es: "Participar", de: "Teilnehmen", pt: "Participar", ru: "Пройти", ch: "参与", hi: "भाग लें", ar: "شارك" },
  no_responses:  { fr: "Aucune réponse encore", en: "No responses yet", es: "Sin respuestas aún", de: "Noch keine Antworten", pt: "Sem respostas ainda", ru: "Пока нет ответов", ch: "暂无回复", hi: "अभी तक कोई उत्तर नहीं", ar: "لا إجابات بعد" },
  geo:           { fr: "Répartition géographique", en: "Geographic breakdown", es: "Distribución geográfica", de: "Geografische Verteilung", pt: "Distribuição geográfica", ru: "Географическое распределение", ch: "地理分布", hi: "भौगोलिक वितरण", ar: "التوزيع الجغرافي" },
  avg:           { fr: "Moyenne :", en: "Average:", es: "Promedio:", de: "Durchschnitt:", pt: "Média:", ru: "Среднее:", ch: "平均：", hi: "औसत:", ar: "المتوسط:" },
  open_q:        { fr: "Question ouverte", en: "Open question", es: "Pregunta abierta", de: "Offene Frage", pt: "Pergunta aberta", ru: "Открытый вопрос", ch: "开放问题", hi: "खुला प्रश्न", ar: "سؤال مفتوح" },
  total_resp:    { fr: "réponses totales collectées", en: "total responses collected", es: "respuestas totales recogidas", de: "Antworten insgesamt gesammelt", pt: "respostas totais recolhidas", ru: "всего ответов собрано", ch: "共收集回复", hi: "कुल उत्तर एकत्र", ar: "إجمالي الإجابات المجمعة" },
  active_surveys:{ fr: "sondages actifs", en: "active surveys", es: "encuestas activas", de: "aktive Umfragen", pt: "sondagens ativas", ru: "активных опросов", ch: "活跃调查", hi: "सक्रिय सर्वेक्षण", ar: "استطلاعات نشطة" },
  loading:       { fr: "Chargement…", en: "Loading…", es: "Cargando…", de: "Laden…", pt: "A carregar…", ru: "Загрузка…", ch: "加载中…", hi: "लोड हो रहा है…", ar: "جارٍ التحميل…" },
  error_net:     { fr: "Erreur réseau. Réessayez.", en: "Network error. Please retry.", es: "Error de red. Reintentar.", de: "Netzwerkfehler. Erneut versuchen.", pt: "Erro de rede. Tentar novamente.", ru: "Ошибка сети. Повторите.", ch: "网络错误，请重试。", hi: "नेटवर्क त्रुटि। पुनः प्रयास करें।", ar: "خطأ في الشبكة. أعد المحاولة." },
  empty:         { fr: "Aucun résultat disponible.", en: "No results available.", es: "No hay resultados disponibles.", de: "Keine Ergebnisse verfügbar.", pt: "Sem resultados disponíveis.", ru: "Нет доступных результатов.", ch: "暂无结果。", hi: "कोई परिणाम उपलब्ध नहीं।", ar: "لا نتائج متاحة." },
  home:          { fr: "Accueil", en: "Home", es: "Inicio", de: "Startseite", pt: "Início", ru: "Главная", ch: "首页", hi: "होम", ar: "الرئيسية" },
  show_results:  { fr: "Voir les résultats", en: "Show results", es: "Ver resultados", de: "Ergebnisse anzeigen", pt: "Ver resultados", ru: "Показать результаты", ch: "查看结果", hi: "परिणाम देखें", ar: "عرض النتائج" },
  hide_results:  { fr: "Masquer", en: "Hide", es: "Ocultar", de: "Verbergen", pt: "Ocultar", ru: "Скрыть", ch: "隐藏", hi: "छुपाएं", ar: "إخفاء" },
  source:        { fr: "Source :", en: "Source:", es: "Fuente:", de: "Quelle:", pt: "Fonte:", ru: "Источник:", ch: "来源：", hi: "स्रोत:", ar: "المصدر:" },
  license:       { fr: "Données sous licence CC BY 4.0 — Citation requise : SOS Expat (sos-expat.com)", en: "Data under CC BY 4.0 license — Required citation: SOS Expat (sos-expat.com)", es: "Datos bajo licencia CC BY 4.0 — Citación requerida: SOS Expat (sos-expat.com)", de: "Daten unter CC BY 4.0 Lizenz — Pflichtangabe: SOS Expat (sos-expat.com)", pt: "Dados sob licença CC BY 4.0 — Citação obrigatória: SOS Expat (sos-expat.com)", ru: "Данные под лицензией CC BY 4.0 — Обязательная ссылка: SOS Expat (sos-expat.com)", ch: "数据采用CC BY 4.0许可证 — 必须注明：SOS Expat (sos-expat.com)", hi: "CC BY 4.0 लाइसेंस के तहत डेटा — आवश्यक उद्धरण: SOS Expat (sos-expat.com)", ar: "البيانات تحت رخصة CC BY 4.0 — الاستشهاد المطلوب: SOS Expat (sos-expat.com)" },
  closes:        { fr: "Ferme le", en: "Closes", es: "Cierra el", de: "Endet am", pt: "Fecha em", ru: "Закрыт", ch: "截止", hi: "बंद होता है", ar: "يغلق" },
};

const t = (k: string, lang: string) => L[k]?.[lang] ?? L[k]?.["fr"] ?? k;

function detectLang(appLang: string | undefined, pathname: string): string {
  if (appLang && L.all[appLang]) return appLang;
  const p = parseLocaleFromPath(pathname)?.lang;
  if (p && L.all[p]) return p;
  const nav = (navigator.language || "fr").split("-")[0].toLowerCase();
  return L.all[nav] ? nav : "fr";
}

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────

/** Barre de progression horizontale */
const Bar: React.FC<{ pct: number; color?: string }> = ({ pct, color = "bg-red-500" }) => (
  <div className="relative h-2 rounded-full bg-gray-100 overflow-hidden">
    <motion.div
      className={`absolute inset-y-0 left-0 rounded-full ${color}`}
      initial={{ width: 0 }}
      animate={{ width: `${pct}%` }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    />
  </div>
);

/** Bloc résultats d'une question */
const QuestionBlock: React.FC<{ q: Question; lang: string; idx: number }> = ({ q, idx, lang }) => {
  const colors = [
    "bg-red-500", "bg-blue-500", "bg-emerald-500", "bg-violet-500",
    "bg-amber-500", "bg-cyan-500", "bg-rose-500", "bg-indigo-500",
  ];

  return (
    <div className="py-4 border-b border-gray-50 last:border-0">
      <p className="text-sm font-medium text-gray-800 mb-3 leading-snug">
        <span className="inline-block w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold mr-2 text-center leading-5">
          {idx}
        </span>
        {q.text}
      </p>

      {q.type === "scale" && q.avg_score != null && (
        <div className="flex items-center gap-3">
          <span className="text-3xl font-bold text-gray-900">{q.avg_score}</span>
          <div className="flex-1">
            <p className="text-xs text-gray-400 mb-1">{t("avg", lang)} {q.avg_score}/10</p>
            <Bar pct={(q.avg_score / 10) * 100} color="bg-amber-400" />
          </div>
          <span className="text-xs text-gray-400">{q.total} {t("responses", lang)}</span>
        </div>
      )}

      {q.type === "open" && (
        <p className="text-xs text-gray-400 italic">
          {t("open_q", lang)} — {q.total} {t("responses", lang)}
        </p>
      )}

      {(q.type === "single" || q.type === "multiple") && q.options && (
        <div className="space-y-2">
          {q.options.map((opt, i) => (
            <div key={i}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-700 truncate pr-2 max-w-[75%]">{opt.label}</span>
                <span className="text-gray-400 shrink-0 font-mono">
                  {opt.count} <span className="text-gray-300">({opt.pct}%)</span>
                </span>
              </div>
              <Bar pct={opt.pct} color={colors[i % colors.length]} />
            </div>
          ))}
          <p className="text-[11px] text-gray-300 mt-1">{q.total} {t("responses", lang)}</p>
        </div>
      )}
    </div>
  );
};

/** Card pays */
const GeoBar: React.FC<{ entry: GeoEntry }> = ({ entry }) => (
  <div className="flex items-center gap-2 text-xs">
    <img
      src={`https://flagcdn.com/16x12/${entry.country.toLowerCase()}.png`}
      width={16} height={12}
      alt={entry.country}
      className="shrink-0 rounded-sm"
      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
    />
    <span className="text-gray-500 w-8 font-mono shrink-0">{entry.country}</span>
    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full bg-blue-400 rounded-full" style={{ width: `${entry.pct}%` }} />
    </div>
    <span className="text-gray-400 w-8 text-right shrink-0">{entry.count}</span>
  </div>
);

/** Skeleton card */
const Skeleton: React.FC = () => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-pulse">
    <div className="flex gap-2 mb-4">
      <div className="h-5 w-16 bg-gray-100 rounded" />
      <div className="h-5 w-20 bg-gray-100 rounded" />
    </div>
    <div className="h-5 w-3/4 bg-gray-100 rounded mb-2" />
    <div className="h-3 w-full bg-gray-100 rounded mb-1" />
    <div className="h-3 w-5/6 bg-gray-100 rounded mb-6" />
    {[1, 2, 3].map((n) => (
      <div key={n} className="mb-4">
        <div className="h-3 w-2/3 bg-gray-100 rounded mb-2" />
        <div className="h-2 w-full bg-gray-100 rounded" />
      </div>
    ))}
  </div>
);

// ─────────────────────────────────────────────
// SURVEY RESULT CARD
// ─────────────────────────────────────────────

const SondageCard: React.FC<{ s: Sondage; lang: string; defaultOpen: boolean }> = ({
  s, lang, defaultOpen,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const hasResults = s.results.total > 0;
  const locale = LOCALE_COUNTRY[lang] ?? "fr-fr";

  const closesDate = s.closes_at
    ? new Date(s.closes_at).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })
    : null;

  const pubDate = s.published_at
    ? new Date(s.published_at).toLocaleDateString(locale, { month: "long", year: "numeric" })
    : null;

  return (
    <motion.div
      layout
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
    >
      {/* Card header */}
      <div className="p-6">
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded
            ${s.status === "active"
              ? "text-green-600 bg-green-50 border border-green-200"
              : "text-gray-400 bg-gray-50 border border-gray-200"
            }`}>
            {s.status === "active" && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
            {t(s.status, lang)}
          </span>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded
            ${s.type === "expat"
              ? "text-red-600 bg-red-50 border border-red-200"
              : "text-blue-600 bg-blue-50 border border-blue-200"
            }`}>
            {s.type === "expat" ? "✈️" : "🏖️"} {t(s.type === "expat" ? "expat" : "vacancier", lang)}
          </span>
          {pubDate && <span className="text-[10px] text-gray-400">{pubDate}</span>}
        </div>

        {/* Title */}
        <h2 className="text-gray-900 font-semibold leading-snug mb-2">{s.translation.title}</h2>

        {s.translation.description && (
          <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 mb-3">
            {s.translation.description}
          </p>
        )}

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
          <span className="flex items-center gap-1.5">
            <Users size={14} className="text-gray-300" />
            <strong className="text-gray-700">{s.results.total.toLocaleString()}</strong>
            {t("responses", lang)}
          </span>
          {closesDate && s.status === "active" && (
            <span className="flex items-center gap-1.5">
              <Clock size={14} className="text-gray-300" />
              {t("closes", lang)} {closesDate}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {hasResults && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700
                         bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3 py-1.5
                         rounded-lg transition-colors"
            >
              <BarChart3 size={14} />
              {open ? t("hide_results", lang) : t("show_results", lang)}
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
              />
            </button>
          )}
          <a
            href={s.results_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
          >
            <ExternalLink size={13} />
            {t("see_results", lang)}
          </a>
          {s.status === "active" && (
            <a
              href={s.blog_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              {t("participate", lang)} →
            </a>
          )}
        </div>
      </div>

      {/* Résultats dépliables */}
      <AnimatePresence initial={false}>
        {open && hasResults && (
          <motion.div
            key="results"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-gray-100 bg-gray-50/50">
              <div className="px-6 pt-4 pb-2">
                {/* Questions */}
                <div className="mb-4">
                  {s.results.questions.map((q, i) => (
                    <QuestionBlock key={q.id} q={q} idx={i + 1} lang={lang} />
                  ))}
                </div>

                {/* Geo */}
                {s.results.geo.length > 0 && (
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <Globe size={12} />
                      {t("geo", lang)}
                    </p>
                    <div className="space-y-1.5">
                      {s.results.geo.map((g) => (
                        <GeoBar key={g.country} entry={g} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Source / Licence */}
                <div className="mt-4 border-t border-gray-100 pt-3 pb-2">
                  <p className="text-[11px] text-gray-400">
                    <span className="font-medium">{t("source", lang)}</span>{" "}
                    {t("license", lang)}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        {open && !hasResults && (
          <motion.div
            key="empty"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-gray-100 px-6 py-4 text-sm text-gray-400 italic">
              {t("no_responses", lang)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────

const SondagesResultats: React.FC = () => {
  const location = useLocation();
  const { language } = useApp();
  const lang = detectLang(language, location.pathname);
  const localeSlug = location.pathname.match(/^\/([a-z]{2}-[a-z]{2})/)?.[1] ?? "fr-fr";
  const _urlLangR = lang === "ch" ? "zh" : lang;
  const _regionR: Record<string, string> = { fr:"fr", en:"us", es:"es", de:"de", ru:"ru", pt:"pt", ch:"cn", hi:"in", ar:"sa" };
  const canonicalResultats = `https://sos-expat.com/${_urlLangR}-${_regionR[lang] ?? lang}/${getTranslatedRouteSlug("resultats-sondages" as any, lang as any) || "resultats-sondages"}`;

  const [filter, setFilter] = useState<FilterTab>("all");
  const [sondages, setSondages] = useState<Sondage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    setLoading(true);
    setError(null);

    const apiLang = lang === "ch" ? "zh" : lang;
    fetch(`${API_URL}?lang=${apiLang}`, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))))
      .then((data: Sondage[]) => {
        clearTimeout(timer);
        setSondages(Array.isArray(data) ? data : []);
      })
      .catch((e: Error) => {
        if (e.name !== "AbortError") setError(t("error_net", lang));
      })
      .finally(() => setLoading(false));

    return () => { ctrl.abort(); clearTimeout(timer); };
  }, [lang]);

  useEffect(() => { return fetchData(); }, [fetchData]);

  const filtered = sondages.filter((s) => filter === "all" || s.type === filter);
  const totalResponses = sondages.reduce((acc, s) => acc + s.results.total, 0);
  const activeCount = sondages.filter((s) => s.status === "active").length;

  return (
    <Layout>
      <SEOHead
        title={`${t("page_title", lang)} | SOS-Expat`}
        description={t("page_sub", lang)}
        canonicalUrl={canonicalResultats}
        ogType="website"
      />
      <BreadcrumbSchema items={[
        { name: t("home", lang), url: `/${localeSlug}` },
        { name: t("page_title", lang) },
      ]} />

      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
            <li><a href={`/${localeSlug}`} className="hover:text-red-600 transition-colors">{t("home", lang)}</a></li>
            <li><ChevronRight size={14} className="text-gray-300 shrink-0" /></li>
            <li className="text-gray-900 font-medium">{t("page_title", lang)}</li>
          </ol>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pt-16 pb-12 sm:pt-24 sm:pb-16">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-red-600/5 rounded-full blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-white/10
                       border border-white/20 text-white/70 text-xs font-medium tracking-wide"
          >
            <BarChart3 size={12} />
            Open Data · CC BY 4.0
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl"
          >
            {t("page_title", lang)}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-4 text-white/50 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed"
          >
            {t("page_sub", lang)}
          </motion.p>

          {/* Stats globales */}
          {!loading && sondages.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-10 flex flex-wrap justify-center gap-6"
            >
              {[
                { icon: <Users size={18} />, value: totalResponses.toLocaleString(), label: t("total_resp", lang) },
                { icon: <TrendingUp size={18} />, value: sondages.length, label: "sondages" },
                { icon: <CheckCircle2 size={18} />, value: activeCount, label: t("active_surveys", lang) },
              ].map(({ icon, value, label }) => (
                <div key={label} className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5">
                  <span className="text-white/50">{icon}</span>
                  <span className="text-white font-bold text-lg">{value}</span>
                  <span className="text-white/50 text-sm">{label}</span>
                </div>
              ))}
            </motion.div>
          )}

          {/* Filtres */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex gap-2 flex-wrap justify-center mt-6"
          >
            {(["all", "expat", "vacancier"] as FilterTab[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filter === f ? "bg-[#DC2626] text-white" : "bg-white/10 text-white/70 hover:bg-white/20"
                }`}
              >
                {f === "expat" ? "✈️ " : f === "vacancier" ? "🏖️ " : ""}
                {t(f, lang)}
                {!loading && (
                  <span className="ml-1.5 opacity-60 text-xs">
                    ({f === "all" ? sondages.length : sondages.filter((s) => s.type === f).length})
                  </span>
                )}
              </button>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          {loading ? (
            <div className="space-y-6">
              {[1, 2, 3].map((n) => <Skeleton key={n} />)}
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-red-500 mb-4">{error}</p>
              <button
                type="button"
                onClick={fetchData}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Réessayer
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-400">{t("empty", lang)}</div>
          ) : (
            <motion.div layout className="space-y-6">
              {filtered.map((s, i) => (
                <SondageCard
                  key={s.id}
                  s={s}
                  lang={lang}
                  defaultOpen={i === 0 && s.results.total > 0}
                />
              ))}
            </motion.div>
          )}

          {/* Licence / presse */}
          {!loading && sondages.length > 0 && (
            <div className="mt-12 border-t border-gray-200 pt-8">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col sm:flex-row gap-4 items-start">
                <Download size={20} className="text-gray-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-gray-800 mb-1">Presse &amp; recherche</p>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {t("license", lang)}
                  </p>
                  <a
                    href="mailto:contact@sos-expat.com"
                    className="mt-2 inline-flex items-center gap-1 text-sm text-red-600 hover:underline font-medium"
                  >
                    contact@sos-expat.com →
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default SondagesResultats;
