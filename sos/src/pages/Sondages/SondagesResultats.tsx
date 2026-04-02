/**
 * SondagesResultats — Tableau de bord public des résultats de sondages
 * Structure: insights globaux cross-sondages (1er plan) + détails par sondage (secondaire)
 */

import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3, ChevronDown, ChevronRight, Globe, ExternalLink,
  Users, TrendingUp, CheckCircle2, Clock, Download, MapPin,
  Languages, Activity, Award,
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

const INSIGHTS_URL  = "https://blog.life-expat.com/api/v1/public/sondages-insights";
const RESULTATS_URL = "https://blog.life-expat.com/api/v1/public/sondages-resultats";

const LOCALE_COUNTRY: Record<string, string> = {
  fr: "fr-fr", en: "en-us", es: "es-es", de: "de-de",
  pt: "pt-pt", ru: "ru-ru", ch: "zh-cn", hi: "hi-in", ar: "ar-sa",
};

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface CountryEntry  { country: string; count: number; pct: number }
interface LangEntry     { lang: string; count: number; pct: number }
interface MonthEntry    { month: string; count: number }
interface SurveyMini    { id: number; type: string; status: string; responses_count: number; title: string }

interface Insights {
  total_responses: number;
  total_surveys: number;
  active_surveys: number;
  countries_represented: number;
  avg_responses_per_survey: number;
  type_breakdown: Record<string, number>;
  top_countries: CountryEntry[];
  lang_breakdown: LangEntry[];
  monthly_trend: MonthEntry[];
  per_survey: SurveyMini[];
}

interface Option    { label: string; count: number; pct: number }
interface Question  {
  id: number; text: string; type: "single" | "multiple" | "scale" | "open";
  total: number; options?: Option[]; avg_score?: number;
}
interface GeoEntry  { country: string; count: number; pct: number }
interface Results   { total: number; questions: Question[]; geo: GeoEntry[] }
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
  page_title:        { fr:"Résultats des sondages", en:"Survey Results", es:"Resultados de encuestas", de:"Umfrageergebnisse", pt:"Resultados das sondagens", ru:"Результаты опросов", ch:"调查结果", hi:"सर्वेक्षण परिणाम", ar:"نتائج الاستطلاعات" },
  page_sub:          { fr:"Données anonymes de la communauté expatriée et des voyageurs. Accès libre pour la presse, chercheurs et curieux.", en:"Anonymous data from the expat community and travelers. Open access for press, researchers and curious minds.", es:"Datos anónimos de la comunidad expatriada y viajeros.", de:"Anonyme Daten der Expat-Community.", pt:"Dados anónimos da comunidade expatriada.", ru:"Анонимные данные сообщества экспатов.", ch:"来自海外侨民社区的匿名数据。", hi:"प्रवासी समुदाय का गुमनाम डेटा।", ar:"بيانات مجهولة من مجتمع المغتربين." },
  all:               { fr:"Tous", en:"All", es:"Todos", de:"Alle", pt:"Todos", ru:"Все", ch:"全部", hi:"सभी", ar:"الكل" },
  expat:             { fr:"Expatriés", en:"Expats", es:"Expatriados", de:"Expats", pt:"Expatriados", ru:"Экспаты", ch:"外籍人士", hi:"प्रवासी", ar:"المغتربون" },
  vacancier:         { fr:"Vacanciers", en:"Holidaymakers", es:"Turistas", de:"Urlauber", pt:"Turistas", ru:"Туристы", ch:"度假者", hi:"पर्यटक", ar:"المصطافون" },
  active:            { fr:"En cours", en:"Active", es:"En curso", de:"Aktiv", pt:"Em curso", ru:"Активен", ch:"进行中", hi:"सक्रिय", ar:"نشط" },
  closed:            { fr:"Terminé", en:"Closed", es:"Cerrado", de:"Finalizado", pt:"Encerrado", ru:"Завершён", ch:"已结束", hi:"बंद", ar:"منتهٍ" },
  responses:         { fr:"réponses", en:"responses", es:"respuestas", de:"Antworten", pt:"respostas", ru:"ответов", ch:"回复", hi:"उत्तर", ar:"إجابات" },
  total_resp:        { fr:"réponses collectées", en:"responses collected", es:"respuestas recogidas", de:"Antworten gesammelt", pt:"respostas recolhidas", ru:"ответов собрано", ch:"回复已收集", hi:"उत्तर एकत्र", ar:"إجابات مجمعة" },
  active_surveys:    { fr:"sondages actifs", en:"active surveys", es:"encuestas activas", de:"aktive Umfragen", pt:"sondagens ativas", ru:"активных опросов", ch:"活跃调查", hi:"सक्रिय सर्वेक्षण", ar:"استطلاعات نشطة" },
  countries_repr:    { fr:"pays représentés", en:"countries represented", es:"países representados", de:"Länder vertreten", pt:"países representados", ru:"стран представлено", ch:"国家参与", hi:"देश प्रतिनिधित्व", ar:"دولة ممثلة" },
  geo_title:         { fr:"Participation par pays", en:"Participation by country", es:"Participación por país", de:"Teilnahme nach Land", pt:"Participação por país", ru:"Участие по странам", ch:"按国家参与", hi:"देश अनुसार भागीदारी", ar:"المشاركة حسب الدولة" },
  type_title:        { fr:"Profil des participants", en:"Participant profile", es:"Perfil de participantes", de:"Teilnehmerprofil", pt:"Perfil dos participantes", ru:"Профиль участников", ch:"参与者画像", hi:"प्रतिभागी प्रोफ़ाइल", ar:"ملف المشاركين" },
  lang_title:        { fr:"Langues de participation", en:"Languages of participation", es:"Idiomas de participación", de:"Teilnahmesprachen", pt:"Línguas de participação", ru:"Языки участия", ch:"参与语言", hi:"भागीदारी की भाषाएं", ar:"لغات المشاركة" },
  trend_title:       { fr:"Tendance mensuelle", en:"Monthly trend", es:"Tendencia mensual", de:"Monatlicher Trend", pt:"Tendência mensal", ru:"Ежемесячный тренд", ch:"月度趋势", hi:"मासिक प्रवृत्ति", ar:"الاتجاه الشهري" },
  surveys_detail:    { fr:"Détail par sondage", en:"Per-survey details", es:"Detalle por encuesta", de:"Details nach Umfrage", pt:"Detalhe por sondagem", ru:"Детали по опросам", ch:"每个调查详情", hi:"सर्वेक्षण-वार विवरण", ar:"تفاصيل الاستطلاعات" },
  see_results:       { fr:"Résultats complets →", en:"Full results →", es:"Resultados completos →", de:"Vollständige Ergebnisse →", pt:"Resultados completos →", ru:"Полные результаты →", ch:"完整结果 →", hi:"पूर्ण परिणाम →", ar:"النتائج الكاملة →" },
  participate:       { fr:"Participer", en:"Take survey", es:"Participar", de:"Teilnehmen", pt:"Participar", ru:"Пройти", ch:"参与", hi:"भाग लें", ar:"شارك" },
  no_responses:      { fr:"Aucune réponse encore — soyez parmi les premiers !", en:"No responses yet — be among the first!", es:"Sin respuestas aún.", de:"Noch keine Antworten.", pt:"Sem respostas ainda.", ru:"Пока нет ответов.", ch:"暂无回复。", hi:"अभी तक कोई उत्तर नहीं।", ar:"لا إجابات بعد." },
  avg_resp:          { fr:"moy. réponses / sondage", en:"avg responses / survey", es:"promedio / encuesta", de:"ø Antworten / Umfrage", pt:"média / sondagem", ru:"ср. ответов / опрос", ch:"平均/调查", hi:"औसत/सर्वेक्षण", ar:"متوسط/استطلاع" },
  show_questions:    { fr:"Voir les questions →", en:"Show questions →", es:"Ver preguntas →", de:"Fragen anzeigen →", pt:"Ver perguntas →", ru:"Показать вопросы →", ch:"查看问题 →", hi:"प्रश्न देखें →", ar:"عرض الأسئلة →" },
  hide_questions:    { fr:"Masquer", en:"Hide", es:"Ocultar", de:"Verbergen", pt:"Ocultar", ru:"Скрыть", ch:"隐藏", hi:"छुपाएं", ar:"إخفاء" },
  avg_lbl:           { fr:"Moyenne :", en:"Average:", es:"Promedio:", de:"Durchschnitt:", pt:"Média:", ru:"Среднее:", ch:"平均：", hi:"औसत:", ar:"المتوسط:" },
  open_q:            { fr:"Question ouverte", en:"Open question", es:"Pregunta abierta", de:"Offene Frage", pt:"Pergunta aberta", ru:"Открытый вопрос", ch:"开放问题", hi:"खुला प्रश्न", ar:"سؤال مفتوح" },
  geo_survey:        { fr:"Géographie", en:"Geography", es:"Geografía", de:"Geografie", pt:"Geografia", ru:"География", ch:"地理", hi:"भूगोल", ar:"الجغرافيا" },
  home:              { fr:"Accueil", en:"Home", es:"Inicio", de:"Startseite", pt:"Início", ru:"Главная", ch:"首页", hi:"होम", ar:"الرئيسية" },
  loading:           { fr:"Chargement…", en:"Loading…", es:"Cargando…", de:"Laden…", pt:"A carregar…", ru:"Загрузка…", ch:"加载中…", hi:"लोड हो रहा है…", ar:"جارٍ التحميل…" },
  error_net:         { fr:"Erreur réseau. Réessayez.", en:"Network error. Please retry.", es:"Error de red.", de:"Netzwerkfehler.", pt:"Erro de rede.", ru:"Ошибка сети.", ch:"网络错误。", hi:"नेटवर्क त्रुटि।", ar:"خطأ في الشبكة." },
  license:           { fr:"Données sous licence CC BY 4.0 — Citation requise : SOS Expat (sos-expat.com)", en:"Data under CC BY 4.0 license — Required citation: SOS Expat (sos-expat.com)", es:"Datos bajo licencia CC BY 4.0 — Citar: SOS Expat", de:"Daten unter CC BY 4.0 — Pflichtangabe: SOS Expat", pt:"Dados sob licença CC BY 4.0 — Citação: SOS Expat", ru:"Данные CC BY 4.0 — Ссылка: SOS Expat", ch:"CC BY 4.0 — 引用：SOS Expat", hi:"CC BY 4.0 — उद्धरण: SOS Expat", ar:"CC BY 4.0 — الاستشهاد: SOS Expat" },
  closes:            { fr:"Ferme le", en:"Closes", es:"Cierra el", de:"Endet am", pt:"Fecha em", ru:"Закрыт", ch:"截止", hi:"बंद होता है", ar:"يغلق" },
  no_data_yet:       { fr:"Les données s'afficheront ici au fur et à mesure des réponses.", en:"Data will appear here as responses come in.", es:"Los datos aparecerán aquí a medida que lleguen respuestas.", de:"Daten werden hier angezeigt, wenn Antworten eintreffen.", pt:"Os dados aparecerão aqui à medida que chegarem respostas.", ru:"Данные появятся здесь по мере поступления ответов.", ch:"随着回复的增加，数据将在此显示。", hi:"उत्तर आने पर डेटा यहाँ दिखाई देगा।", ar:"ستظهر البيانات هنا مع وصول الإجابات." },
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
// HELPERS
// ─────────────────────────────────────────────

const LANG_NAMES: Record<string, string> = {
  fr:"Français", en:"English", es:"Español", de:"Deutsch",
  pt:"Português", ru:"Русский", zh:"中文", hi:"हिंदी", ar:"العربية",
};

const QUESTION_COLORS = [
  "bg-red-500","bg-blue-500","bg-emerald-500","bg-violet-500",
  "bg-amber-500","bg-cyan-500","bg-rose-500","bg-indigo-500",
];

// ─────────────────────────────────────────────
// MICRO COMPONENTS
// ─────────────────────────────────────────────

const HBar: React.FC<{ pct: number; color?: string; thin?: boolean }> = ({
  pct, color = "bg-red-500", thin = false,
}) => (
  <div className={`relative ${thin ? "h-1.5" : "h-2"} rounded-full bg-gray-100 overflow-hidden`}>
    <motion.div
      className={`absolute inset-y-0 left-0 rounded-full ${color}`}
      initial={{ width: 0 }}
      animate={{ width: `${pct}%` }}
      transition={{ duration: 0.7, ease: "easeOut" }}
    />
  </div>
);

const StatCard: React.FC<{
  icon: React.ReactNode; value: string | number; label: string; sub?: string; accent?: string;
}> = ({ icon, value, label, sub, accent = "text-red-600" }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-2">
    <div className={`${accent} opacity-70`}>{icon}</div>
    <div className="text-3xl font-extrabold text-gray-900 tracking-tight">{value}</div>
    <div className="text-sm font-medium text-gray-600">{label}</div>
    {sub && <div className="text-xs text-gray-400">{sub}</div>}
  </div>
);

const SectionTitle: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <h2 className="flex items-center gap-2 text-base font-bold text-gray-800 mb-4">
    <span className="text-gray-400">{icon}</span>
    {title}
  </h2>
);

const NoDataPill: React.FC<{ label: string }> = ({ label }) => (
  <div className="text-center py-8 text-gray-300 text-sm italic">{label}</div>
);

// ─────────────────────────────────────────────
// INSIGHTS SECTIONS
// ─────────────────────────────────────────────

/** Répartition géographique globale */
const GeoSection: React.FC<{ data: CountryEntry[]; lang: string }> = ({ data, lang }) => {
  if (data.length === 0) return <NoDataPill label={t("no_data_yet", lang)} />;
  return (
    <div className="space-y-2">
      {data.map((c) => (
        <div key={c.country} className="flex items-center gap-2 text-sm">
          <img
            src={`https://flagcdn.com/16x12/${c.country.toLowerCase()}.png`}
            width={16} height={12} alt={c.country}
            className="shrink-0 rounded-sm"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <span className="w-8 text-gray-500 font-mono text-xs shrink-0">{c.country}</span>
          <div className="flex-1">
            <HBar pct={c.pct} color="bg-blue-500" thin />
          </div>
          <span className="text-gray-500 font-medium w-8 text-right text-xs shrink-0">{c.count}</span>
          <span className="text-gray-300 w-9 text-right text-xs shrink-0">{c.pct}%</span>
        </div>
      ))}
    </div>
  );
};

/** Profil expatriés vs vacanciers */
const TypeSection: React.FC<{ data: Record<string, number>; lang: string }> = ({ data, lang }) => {
  const total = Math.max(Object.values(data).reduce((a, b) => a + b, 0), 1);
  const expat = data["expat"] ?? 0;
  const vac   = data["vacancier"] ?? 0;
  if (total <= 1) return <NoDataPill label={t("no_data_yet", lang)} />;

  const items = [
    { key: "expat",     emoji: "✈️", count: expat, pct: Math.round((expat / total) * 100), color: "bg-red-500" },
    { key: "vacancier", emoji: "🏖️", count: vac,   pct: Math.round((vac   / total) * 100), color: "bg-blue-500" },
  ];

  return (
    <div className="space-y-4">
      {/* Donut visuel simplifié */}
      <div className="flex h-3 w-full rounded-full overflow-hidden">
        {items.map((it) => (
          <motion.div
            key={it.key}
            className={`h-full ${it.color}`}
            initial={{ flex: 0 }}
            animate={{ flex: it.pct }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        ))}
      </div>
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.key} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${it.color}`} />
              <span className="text-gray-600">{it.emoji} {t(it.key === "expat" ? "expat" : "vacancier", lang)}</span>
            </span>
            <span className="text-gray-800 font-semibold">{it.count.toLocaleString()} <span className="text-gray-400 font-normal text-xs">({it.pct}%)</span></span>
          </div>
        ))}
      </div>
    </div>
  );
};

/** Langues de participation */
const LangSection: React.FC<{ data: LangEntry[]; lang: string }> = ({ data, lang }) => {
  if (data.length === 0) return <NoDataPill label={t("no_data_yet", lang)} />;
  return (
    <div className="space-y-2">
      {data.map((l) => (
        <div key={l.lang} className="flex items-center gap-2 text-sm">
          <span className="w-20 text-gray-600 shrink-0 truncate">{LANG_NAMES[l.lang] ?? l.lang}</span>
          <div className="flex-1">
            <HBar pct={l.pct} color="bg-violet-500" thin />
          </div>
          <span className="text-gray-500 font-medium w-8 text-right text-xs shrink-0">{l.count}</span>
          <span className="text-gray-300 w-9 text-right text-xs shrink-0">{l.pct}%</span>
        </div>
      ))}
    </div>
  );
};

/** Tendance mensuelle */
const TrendSection: React.FC<{ data: MonthEntry[]; lang: string }> = ({ data, lang }) => {
  if (data.length === 0) return <NoDataPill label={t("no_data_yet", lang)} />;
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex items-end gap-1.5 h-24 w-full">
      {data.map((m) => {
        const pct = Math.round((m.count / max) * 100);
        const monthLabel = m.month.slice(5); // MM
        return (
          <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] text-gray-400 font-medium">{m.count}</span>
            <motion.div
              className="w-full rounded-t bg-red-500/80"
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(pct, 4)}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              style={{ minHeight: 3, maxHeight: 64 }}
            />
            <span className="text-[9px] text-gray-300">{monthLabel}</span>
          </div>
        );
      })}
    </div>
  );
};

/** Top sondages par réponses */
const PerSurveyMini: React.FC<{ data: SurveyMini[]; lang: string }> = ({ data, lang }) => {
  if (data.length === 0) return <NoDataPill label={t("no_data_yet", lang)} />;
  const max = Math.max(...data.map((s) => s.responses_count), 1);

  return (
    <div className="space-y-3">
      {data.map((s, i) => (
        <div key={s.id} className="flex items-center gap-3 text-sm">
          <span className="text-[11px] font-bold text-gray-300 w-4 shrink-0">{i + 1}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1 gap-2">
              <span className="text-gray-700 truncate text-xs font-medium">{s.title}</span>
              <span className="text-gray-400 text-xs shrink-0">{s.responses_count}</span>
            </div>
            <HBar
              pct={Math.round((s.responses_count / max) * 100)}
              color={s.type === "expat" ? "bg-red-400" : "bg-blue-400"}
              thin
            />
          </div>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────
// SURVEY DETAIL CARD (secondaire / collapsé)
// ─────────────────────────────────────────────

const QuestionBlock: React.FC<{ q: Question; lang: string; idx: number }> = ({ q, idx, lang }) => (
  <div className="py-3 border-b border-gray-50 last:border-0">
    <p className="text-xs font-medium text-gray-700 mb-2 flex gap-1.5">
      <span className="shrink-0 w-4 h-4 rounded-full bg-gray-100 text-gray-400 text-[9px] font-bold text-center leading-4">{idx}</span>
      {q.text}
    </p>
    {q.type === "scale" && q.avg_score != null && (
      <div className="flex items-center gap-2">
        <span className="text-xl font-bold text-gray-800">{q.avg_score}</span>
        <div className="flex-1"><HBar pct={(q.avg_score / 10) * 100} color="bg-amber-400" thin /></div>
        <span className="text-xs text-gray-400">{t("avg_lbl", lang)} {q.avg_score}/10</span>
      </div>
    )}
    {q.type === "open" && (
      <p className="text-xs text-gray-400 italic">{t("open_q", lang)} — {q.total} {t("responses", lang)}</p>
    )}
    {(q.type === "single" || q.type === "multiple") && q.options && (
      <div className="space-y-1.5">
        {q.options.map((opt, i) => (
          <div key={i}>
            <div className="flex items-center justify-between text-xs mb-0.5">
              <span className="text-gray-600 truncate pr-2 max-w-[75%]">{opt.label}</span>
              <span className="text-gray-400 shrink-0 font-mono">{opt.count} ({opt.pct}%)</span>
            </div>
            <HBar pct={opt.pct} color={QUESTION_COLORS[i % QUESTION_COLORS.length]} thin />
          </div>
        ))}
        <p className="text-[10px] text-gray-300 mt-1">{q.total} {t("responses", lang)}</p>
      </div>
    )}
  </div>
);

const SondageCard: React.FC<{ s: Sondage; lang: string }> = ({ s, lang }) => {
  const [open, setOpen] = useState(false);
  const hasResults  = s.results.total > 0;
  const locale      = LOCALE_COUNTRY[lang] ?? "fr-fr";
  const closesDate  = s.closes_at
    ? new Date(s.closes_at).toLocaleDateString(locale, { day: "numeric", month: "short" })
    : null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4 flex items-start gap-3">
        {/* Type badge */}
        <span className="shrink-0 text-base mt-0.5">{s.type === "expat" ? "✈️" : "🏖️"}</span>

        <div className="flex-1 min-w-0">
          {/* Title + status */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-sm font-semibold text-gray-800 leading-snug">{s.translation.title}</h3>
            <span className={`shrink-0 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded
              ${s.status === "active"
                ? "text-green-600 bg-green-50 border border-green-200"
                : "text-gray-400 bg-gray-50 border border-gray-200"}`}>
              {t(s.status, lang)}
            </span>
          </div>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mb-3">
            <span className="flex items-center gap-1">
              <Users size={11} />
              <strong className="text-gray-600">{s.results.total.toLocaleString()}</strong>
              {" "}{t("responses", lang)}
            </span>
            {closesDate && s.status === "active" && (
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {t("closes", lang)} {closesDate}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {hasResults && (
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-medium text-gray-600
                           bg-gray-50 hover:bg-gray-100 border border-gray-200 px-2.5 py-1
                           rounded-lg transition-colors"
              >
                <BarChart3 size={11} />
                {open ? t("hide_questions", lang) : t("show_questions", lang)}
                <ChevronDown size={11} className={`transition-transform ${open ? "rotate-180" : ""}`} />
              </button>
            )}
            <a href={s.results_url} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium">
              <ExternalLink size={11} />{t("see_results", lang)}
            </a>
            {s.status === "active" && (
              <a href={s.blog_url} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
                {t("participate", lang)} →
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Questions dépliables */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-gray-100 bg-gray-50/40 px-4 pt-3 pb-2">
              {s.results.questions.map((q, i) => (
                <QuestionBlock key={q.id} q={q} idx={i + 1} lang={lang} />
              ))}
              {s.results.geo.length > 0 && (
                <div className="mt-3 border-t border-gray-100 pt-3">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Globe size={10} />{t("geo_survey", lang)}
                  </p>
                  <div className="space-y-1">
                    {s.results.geo.slice(0, 5).map((g) => (
                      <div key={g.country} className="flex items-center gap-2 text-xs">
                        <img
                          src={`https://flagcdn.com/16x12/${g.country.toLowerCase()}.png`}
                          width={14} height={10} alt={g.country}
                          className="shrink-0 rounded-sm"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                        <span className="text-gray-500 w-7 font-mono shrink-0">{g.country}</span>
                        <div className="flex-1"><HBar pct={g.pct} color="bg-blue-400" thin /></div>
                        <span className="text-gray-400 w-6 text-right shrink-0">{g.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
        {open && !hasResults && (
          <motion.div key="empty" initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}>
            <div className="border-t border-gray-100 px-4 py-3 text-xs text-gray-400 italic">
              {t("no_responses", lang)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─────────────────────────────────────────────
// SKELETON
// ─────────────────────────────────────────────

const SkeletonCard: React.FC = () => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse space-y-3">
    <div className="h-4 w-1/3 bg-gray-100 rounded" />
    <div className="h-6 w-2/3 bg-gray-100 rounded" />
    <div className="h-2 w-full bg-gray-100 rounded" />
    <div className="h-2 w-4/5 bg-gray-100 rounded" />
  </div>
);

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────

const SondagesResultats: React.FC = () => {
  const location   = useLocation();
  const { language } = useApp();
  const lang       = detectLang(language, location.pathname);
  const localeSlug = location.pathname.match(/^\/([a-z]{2}-[a-z]{2})/)?.[1] ?? "fr-fr";

  const _urlLang  = lang === "ch" ? "zh" : lang;
  const _regions: Record<string, string> = { fr:"fr", en:"us", es:"es", de:"de", ru:"ru", pt:"pt", ch:"cn", hi:"in", ar:"sa" };
  const canonical = `https://sos-expat.com/${_urlLang}-${_regions[lang] ?? lang}/${getTranslatedRouteSlug("resultats-sondages" as any, lang as any) || "resultats-sondages"}`;

  // State
  const [insights,  setInsights]  = useState<Insights | null>(null);
  const [sondages,  setSondages]  = useState<Sondage[]>([]);
  const [filter,    setFilter]    = useState<FilterTab>("all");
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  // Two parallel fetches
  const fetchAll = useCallback(() => {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    setLoading(true);
    setError(null);

    const apiLang = lang === "ch" ? "zh" : lang;
    const headers = { Accept: "application/json" };

    Promise.all([
      fetch(`${INSIGHTS_URL}`, { signal: ctrl.signal, headers })
        .then((r) => r.ok ? r.json() : null),
      fetch(`${RESULTATS_URL}?lang=${apiLang}`, { signal: ctrl.signal, headers })
        .then((r) => r.ok ? r.json() : []),
    ])
      .then(([ins, res]) => {
        clearTimeout(timer);
        if (ins) setInsights(ins as Insights);
        setSondages(Array.isArray(res) ? res as Sondage[] : []);
      })
      .catch((e: Error) => {
        if (e.name !== "AbortError") setError(t("error_net", lang));
      })
      .finally(() => setLoading(false));

    return () => { ctrl.abort(); clearTimeout(timer); };
  }, [lang]);

  useEffect(() => { return fetchAll(); }, [fetchAll]);

  const filtered     = sondages.filter((s) => filter === "all" || s.type === filter);
  const totalResGlobal = insights?.total_responses ?? sondages.reduce((a, s) => a + s.results.total, 0);

  return (
    <Layout>
      <SEOHead
        title={`${t("page_title", lang)} | SOS-Expat`}
        description={t("page_sub", lang)}
        canonicalUrl={canonical}
        ogType="website"
      />
      <BreadcrumbSchema items={[
        { name: t("home", lang), url: `/${localeSlug}` },
        { name: t("page_title", lang) },
      ]} />

      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
            <li><a href={`/${localeSlug}`} className="hover:text-red-600 transition-colors">{t("home", lang)}</a></li>
            <li><ChevronRight size={14} className="text-gray-300 shrink-0" /></li>
            <li className="text-gray-900 font-medium">{t("page_title", lang)}</li>
          </ol>
        </div>
      </nav>

      {/* ══════════════════════════════════════
          HERO — sombre + KPIs globaux
      ══════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pt-14 pb-12 sm:pt-20 sm:pb-16">
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage:"linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize:"48px 48px" }} />
        <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-red-600/5 rounded-full blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          {/* Badge */}
          <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
            className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white/60 text-xs font-medium tracking-wide">
            <BarChart3 size={12} />Open Data · CC BY 4.0
          </motion.div>

          <motion.h1 initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}
            className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl mb-3">
            {t("page_title", lang)}
          </motion.h1>
          <motion.p initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }}
            className="text-white/50 text-sm sm:text-base max-w-2xl leading-relaxed mb-8">
            {t("page_sub", lang)}
          </motion.p>

          {/* KPI row */}
          {!loading && (
            <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon:<Users size={16}/>,         value: totalResGlobal.toLocaleString(),  label: t("total_resp", lang) },
                { icon:<Activity size={16}/>,       value: insights?.total_surveys ?? sondages.length, label: "sondages" },
                { icon:<CheckCircle2 size={16}/>,   value: insights?.active_surveys ?? sondages.filter(s=>s.status==="active").length, label: t("active_surveys", lang) },
                { icon:<MapPin size={16}/>,         value: insights?.countries_represented ?? "—", label: t("countries_repr", lang) },
              ].map(({ icon, value, label }) => (
                <div key={label} className="bg-white/8 border border-white/10 rounded-xl px-4 py-3 flex flex-col gap-1">
                  <span className="text-white/40">{icon}</span>
                  <span className="text-white font-extrabold text-2xl">{value}</span>
                  <span className="text-white/40 text-xs leading-tight">{label}</span>
                </div>
              ))}
            </motion.div>
          )}
          {loading && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[1,2,3,4].map(n => (
                <div key={n} className="bg-white/8 border border-white/10 rounded-xl px-4 py-4 animate-pulse">
                  <div className="h-3 w-1/2 bg-white/10 rounded mb-2" />
                  <div className="h-7 w-2/3 bg-white/10 rounded" />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════
          INSIGHTS CROSS-SONDAGES
      ══════════════════════════════════════ */}
      <div className="bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">

          {/* Ligne 1 : Géo + Profil */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Géographie globale */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <SectionTitle icon={<Globe size={16}/>} title={t("geo_title", lang)} />
              {loading
                ? <div className="space-y-2">{[1,2,3,4,5].map(n=><div key={n} className="h-3 w-full bg-gray-100 rounded animate-pulse" />)}</div>
                : <GeoSection data={insights?.top_countries ?? []} lang={lang} />
              }
            </div>

            {/* Profil expatriés / vacanciers */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <SectionTitle icon={<Users size={16}/>} title={t("type_title", lang)} />
              {loading
                ? <div className="space-y-3">{[1,2].map(n=><div key={n} className="h-8 w-full bg-gray-100 rounded animate-pulse" />)}</div>
                : <TypeSection data={insights?.type_breakdown ?? {}} lang={lang} />
              }
              {!loading && insights && (
                <div className="mt-4 pt-4 border-t border-gray-50">
                  <p className="text-xs text-gray-400">
                    <span className="font-medium text-gray-600">
                      {insights.avg_responses_per_survey}
                    </span>{" "}{t("avg_resp", lang)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Ligne 2 : Tendance mensuelle + Langues */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tendance */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <SectionTitle icon={<TrendingUp size={16}/>} title={t("trend_title", lang)} />
              {loading
                ? <div className="h-24 w-full bg-gray-100 rounded animate-pulse" />
                : <TrendSection data={insights?.monthly_trend ?? []} lang={lang} />
              }
            </div>

            {/* Langues */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <SectionTitle icon={<Languages size={16}/>} title={t("lang_title", lang)} />
              {loading
                ? <div className="space-y-2">{[1,2,3].map(n=><div key={n} className="h-3 w-full bg-gray-100 rounded animate-pulse" />)}</div>
                : <LangSection data={insights?.lang_breakdown ?? []} lang={lang} />
              }
            </div>
          </div>

          {/* Top sondages */}
          {(insights?.per_survey?.length ?? 0) > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <SectionTitle icon={<Award size={16}/>} title="Top sondages" />
              <PerSurveyMini data={insights!.per_survey} lang={lang} />
            </div>
          )}

          {/* ══════════════════════════════════════
              DÉTAIL PAR SONDAGE (secondaire)
          ══════════════════════════════════════ */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-700 flex items-center gap-2">
                <BarChart3 size={16} className="text-gray-400" />
                {t("surveys_detail", lang)}
              </h2>
              {/* Filtres */}
              <div className="flex gap-1.5">
                {(["all", "expat", "vacancier"] as FilterTab[]).map((f) => (
                  <button key={f} type="button" onClick={() => setFilter(f)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      filter === f ? "bg-gray-800 text-white" : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
                    }`}>
                    {f === "expat" ? "✈️ " : f === "vacancier" ? "🏖️ " : ""}
                    {t(f, lang)}
                    {!loading && <span className="ml-1 opacity-50">({f === "all" ? sondages.length : sondages.filter(s=>s.type===f).length})</span>}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">{[1,2,3].map(n=><SkeletonCard key={n} />)}</div>
            ) : error ? (
              <div className="text-center py-10">
                <p className="text-red-500 text-sm mb-3">{error}</p>
                <button type="button" onClick={fetchAll}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
                  Réessayer
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">{t("no_responses", lang)}</div>
            ) : (
              <div className="space-y-3">
                {filtered.map((s) => (
                  <SondageCard key={s.id} s={s} lang={lang} />
                ))}
              </div>
            )}
          </div>

          {/* Presse / Licence */}
          {!loading && (
            <div className="border-t border-gray-200 pt-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex gap-4 items-start">
                <Download size={18} className="text-gray-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-gray-800 mb-1">Presse &amp; recherche</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{t("license", lang)}</p>
                  <a href="mailto:contact@sos-expat.com"
                     className="mt-2 inline-flex items-center gap-1 text-sm text-red-600 hover:underline font-medium">
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
