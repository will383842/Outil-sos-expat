/**
 * Sondages (Surveys) — Premium 2026
 * Palette: Rouge #DC2626 / Noir #0F172A / Blanc
 * Vote interface with animated results bars
 */

import React, { useState, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3, CheckCircle2, Clock, Copy, Share2,
  ChevronRight, Vote, ListChecks, History,
} from "lucide-react";
import { parseLocaleFromPath } from "@/multilingual-system";
import { useApp } from "@/contexts/AppContext";
import Layout from "@/components/layout/Layout";
import SEOHead from "@/components/layout/SEOHead";

// ============================================================
// i18n
// ============================================================

const T: Record<string, Record<string, string>> = {
  title:            { fr: "Sondages",               en: "Surveys" },
  subtitle:         { fr: "Votre avis compte. Votez et influencez l\u2019avenir de SOS-Expat.", en: "Your voice matters. Vote and shape the future of SOS-Expat." },
  tabActive:        { fr: "Actifs",                 en: "Active" },
  tabCompleted:     { fr: "Termin\u00e9s",          en: "Completed" },
  tabAll:           { fr: "Tous",                   en: "All" },
  voteBtn:          { fr: "Voter",                  en: "Vote" },
  votes:            { fr: "votes",                  en: "votes" },
  deadline:         { fr: "Se termine le",          en: "Ends on" },
  ended:            { fr: "Termin\u00e9 le",        en: "Ended on" },
  thanks:           { fr: "Merci pour votre vote !", en: "Thanks for your vote!" },
  copied:           { fr: "Lien copi\u00e9 !",      en: "Link copied!" },
  share:            { fr: "Partager",               en: "Share" },
  copyLink:         { fr: "Copier le lien",         en: "Copy link" },
  myVotes:          { fr: "Mes votes",              en: "My votes" },
  noSurveys:        { fr: "Aucun sondage pour l\u2019instant.", en: "No surveys at the moment." },
  selectOption:     { fr: "S\u00e9lectionnez une option", en: "Select an option" },
  totalVotes:       { fr: "Total des votes",        en: "Total votes" },
};

const t = (key: string, lang: string): string =>
  T[key]?.[lang] ?? T[key]?.["fr"] ?? key;

// ============================================================
// TYPES
// ============================================================

interface SurveyOption {
  id: string;
  label: Record<string, string>;
  votes: number;
}

interface Survey {
  id: string;
  question: Record<string, string>;
  description: Record<string, string>;
  options: SurveyOption[];
  deadline: string; // ISO date
  active: boolean;
}

// ============================================================
// MOCK DATA
// ============================================================

const MOCK_SURVEYS: Survey[] = [
  {
    id: "s1",
    question: {
      fr: "Quelle fonctionnalit\u00e9 souhaitez-vous en priorit\u00e9 ?",
      en: "Which feature do you want most?",
    },
    description: {
      fr: "Aidez-nous \u00e0 prioriser notre roadmap produit pour les prochains mois.",
      en: "Help us prioritize our product roadmap for the coming months.",
    },
    options: [
      { id: "s1o1", label: { fr: "Chat en direct avec un expert", en: "Live chat with an expert" }, votes: 127 },
      { id: "s1o2", label: { fr: "Application mobile native", en: "Native mobile app" }, votes: 89 },
      { id: "s1o3", label: { fr: "Traduction automatique des appels", en: "Automatic call translation" }, votes: 203 },
      { id: "s1o4", label: { fr: "Tableau de bord avanc\u00e9", en: "Advanced dashboard" }, votes: 64 },
    ],
    deadline: "2026-05-15",
    active: true,
  },
  {
    id: "s2",
    question: {
      fr: "Comment avez-vous d\u00e9couvert SOS-Expat ?",
      en: "How did you discover SOS-Expat?",
    },
    description: {
      fr: "Nous souhaitons mieux comprendre nos canaux d\u2019acquisition.",
      en: "We want to better understand our acquisition channels.",
    },
    options: [
      { id: "s2o1", label: { fr: "R\u00e9seaux sociaux", en: "Social media" }, votes: 312 },
      { id: "s2o2", label: { fr: "Recherche Google", en: "Google search" }, votes: 478 },
      { id: "s2o3", label: { fr: "Bouche \u00e0 oreille", en: "Word of mouth" }, votes: 156 },
    ],
    deadline: "2026-04-30",
    active: true,
  },
  {
    id: "s3",
    question: {
      fr: "Quel type d\u2019assistance utilisez-vous le plus ?",
      en: "Which type of assistance do you use the most?",
    },
    description: {
      fr: "Vos r\u00e9ponses nous aident \u00e0 renforcer les services les plus demand\u00e9s.",
      en: "Your answers help us strengthen the most requested services.",
    },
    options: [
      { id: "s3o1", label: { fr: "Juridique / Immigration", en: "Legal / Immigration" }, votes: 541 },
      { id: "s3o2", label: { fr: "Sant\u00e9 / Urgences", en: "Health / Emergencies" }, votes: 287 },
      { id: "s3o3", label: { fr: "Logement / D\u00e9m\u00e9nagement", en: "Housing / Moving" }, votes: 198 },
      { id: "s3o4", label: { fr: "Emploi / Carri\u00e8re", en: "Employment / Career" }, votes: 345 },
    ],
    deadline: "2026-03-01",
    active: false,
  },
  {
    id: "s4",
    question: {
      fr: "\u00c0 quelle fr\u00e9quence utilisez-vous SOS-Expat ?",
      en: "How often do you use SOS-Expat?",
    },
    description: {
      fr: "Comprendre vos habitudes nous aide \u00e0 am\u00e9liorer l\u2019exp\u00e9rience.",
      en: "Understanding your habits helps us improve the experience.",
    },
    options: [
      { id: "s4o1", label: { fr: "Tous les jours", en: "Every day" }, votes: 89 },
      { id: "s4o2", label: { fr: "Plusieurs fois par semaine", en: "Several times a week" }, votes: 234 },
      { id: "s4o3", label: { fr: "Une fois par mois", en: "Once a month" }, votes: 412 },
      { id: "s4o4", label: { fr: "Rarement", en: "Rarely" }, votes: 167 },
    ],
    deadline: "2026-02-15",
    active: false,
  },
];

// ============================================================
// HELPERS
// ============================================================

type FilterTab = "active" | "completed" | "all";

const formatDate = (iso: string, lang: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

// ============================================================
// SUB-COMPONENTS
// ============================================================

/* ---------- Results bar ---------- */
const ResultBar: React.FC<{
  label: string;
  pct: number;
  votes: number;
  isWinner: boolean;
  index: number;
}> = ({ label, pct, votes, isWinner, index }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.1, duration: 0.4 }}
    className="mb-3"
  >
    <div className="flex justify-between text-sm mb-1">
      <span className={`font-medium ${isWinner ? "text-red-600" : "text-slate-700"}`}>
        {label}
      </span>
      <span className="text-slate-500">
        {pct.toFixed(1)}% ({votes})
      </span>
    </div>
    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
      <motion.div
        className={`h-full rounded-full ${isWinner ? "bg-red-500" : "bg-slate-300"}`}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ delay: index * 0.1 + 0.2, duration: 0.8, ease: "easeOut" }}
      />
    </div>
  </motion.div>
);

/* ---------- Survey Card ---------- */
const SurveyCard: React.FC<{
  survey: Survey;
  lang: string;
  userVote: string | null;
  onVote: (surveyId: string, optionId: string) => void;
}> = ({ survey, lang, userVote, onVote }) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [justVoted, setJustVoted] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const hasVoted = userVote !== null || justVoted;
  const showResults = hasVoted || !survey.active;

  const totalVotes = useMemo(
    () => survey.options.reduce((sum, o) => sum + o.votes + (userVote === o.id || (justVoted && selectedOption === o.id) ? 1 : 0), 0),
    [survey.options, userVote, justVoted, selectedOption],
  );

  const maxVotes = useMemo(
    () => Math.max(...survey.options.map((o) => o.votes + (userVote === o.id || (justVoted && selectedOption === o.id) ? 1 : 0))),
    [survey.options, userVote, justVoted, selectedOption],
  );

  const handleVote = useCallback(() => {
    if (!selectedOption || hasVoted) return;
    onVote(survey.id, selectedOption);
    setJustVoted(true);
  }, [selectedOption, hasVoted, onVote, survey.id]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(`${window.location.origin}/sondages#${survey.id}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }, [survey.id]);

  const handleShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({
        title: survey.question[lang] || survey.question.fr,
        url: `${window.location.origin}/sondages#${survey.id}`,
      });
    }
  }, [survey, lang]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 md:p-8"
      id={survey.id}
    >
      {/* Status badge */}
      <div className="flex items-center justify-between mb-4">
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${
            survey.active
              ? "bg-green-50 text-green-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${survey.active ? "bg-green-500" : "bg-slate-400"}`} />
          {survey.active ? t("tabActive", lang) : t("tabCompleted", lang)}
        </span>

        <div className="flex items-center gap-1 text-xs text-slate-400">
          <Clock className="w-3.5 h-3.5" />
          {survey.active ? t("deadline", lang) : t("ended", lang)}{" "}
          {formatDate(survey.deadline, lang)}
        </div>
      </div>

      {/* Question */}
      <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">
        {survey.question[lang] || survey.question.fr}
      </h2>
      <p className="text-slate-500 text-sm mb-6">
        {survey.description[lang] || survey.description.fr}
      </p>

      {/* Vote UI / Results */}
      <AnimatePresence mode="wait">
        {!showResults ? (
          /* ---------- VOTING ---------- */
          <motion.div
            key="vote"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <div className="space-y-3 mb-6">
              {survey.options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedOption(opt.id)}
                  className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all duration-200 ${
                    selectedOption === opt.id
                      ? "border-red-500 bg-red-50 shadow-sm"
                      : "border-slate-200 hover:border-red-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        selectedOption === opt.id
                          ? "border-red-500"
                          : "border-slate-300"
                      }`}
                    >
                      {selectedOption === opt.id && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-2.5 h-2.5 rounded-full bg-red-500"
                        />
                      )}
                    </span>
                    <span className="font-medium text-slate-800">
                      {opt.label[lang] || opt.label.fr}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleVote}
              disabled={!selectedOption}
              className={`w-full sm:w-auto px-8 py-3 rounded-xl font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 ${
                selectedOption
                  ? "bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20 cursor-pointer"
                  : "bg-slate-300 cursor-not-allowed"
              }`}
            >
              <Vote className="w-5 h-5" />
              {t("voteBtn", lang)}
            </button>
          </motion.div>
        ) : (
          /* ---------- RESULTS ---------- */
          <motion.div
            key="results"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {/* Success message */}
            {justVoted && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 mb-5 px-4 py-3 rounded-xl bg-green-50 border border-green-200"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 12, delay: 0.2 }}
                >
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </motion.div>
                <span className="text-green-700 font-medium text-sm">
                  {t("thanks", lang)}
                </span>
              </motion.div>
            )}

            {/* Bars */}
            <div className="mb-4">
              {survey.options.map((opt, i) => {
                const optVotes = opt.votes + (userVote === opt.id || (justVoted && selectedOption === opt.id) ? 1 : 0);
                const pct = totalVotes > 0 ? (optVotes / totalVotes) * 100 : 0;
                return (
                  <ResultBar
                    key={opt.id}
                    label={opt.label[lang] || opt.label.fr}
                    pct={pct}
                    votes={optVotes}
                    isWinner={optVotes === maxVotes}
                    index={i}
                  />
                );
              })}
            </div>

            <div className="flex items-center gap-1 text-xs text-slate-400 mb-2">
              <BarChart3 className="w-3.5 h-3.5" />
              {t("totalVotes", lang)} : {totalVotes}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer actions */}
      <div className="flex items-center gap-3 mt-6 pt-5 border-t border-slate-100">
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 transition-colors"
        >
          <Copy className="w-4 h-4" />
          {copiedLink ? t("copied", lang) : t("copyLink", lang)}
        </button>
        {typeof navigator.share === "function" && (
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            {t("share", lang)}
          </button>
        )}
      </div>
    </motion.div>
  );
};

// ============================================================
// MAIN PAGE
// ============================================================

const Sondages: React.FC = () => {
  const location = useLocation();
  const { language } = useApp();
  const lang = (language || parseLocaleFromPath(location.pathname)?.lang || "fr") as string;

  const [filter, setFilter] = useState<FilterTab>("active");
  const [userVotes, setUserVotes] = useState<Record<string, string>>({});

  const handleVote = useCallback((surveyId: string, optionId: string) => {
    setUserVotes((prev) => ({ ...prev, [surveyId]: optionId }));
  }, []);

  const filteredSurveys = useMemo(() => {
    switch (filter) {
      case "active":
        return MOCK_SURVEYS.filter((s) => s.active);
      case "completed":
        return MOCK_SURVEYS.filter((s) => !s.active);
      default:
        return MOCK_SURVEYS;
    }
  }, [filter]);

  const votedSurveys = useMemo(
    () => MOCK_SURVEYS.filter((s) => userVotes[s.id]),
    [userVotes],
  );

  const tabs: { key: FilterTab; label: string; icon: React.ReactNode }[] = [
    { key: "active", label: t("tabActive", lang), icon: <Vote className="w-4 h-4" /> },
    { key: "completed", label: t("tabCompleted", lang), icon: <ListChecks className="w-4 h-4" /> },
    { key: "all", label: t("tabAll", lang), icon: <BarChart3 className="w-4 h-4" /> },
  ];

  return (
    <Layout>
      <SEOHead
        title={`${t("title", lang)} | SOS-Expat`}
        description={t("subtitle", lang)}
      />

      {/* ---- Hero compact ---- */}
      <section className="bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 pt-16 pb-8 md:pt-20 md:pb-10 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3"
          >
            {t("title", lang)}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-slate-500 max-w-xl mx-auto mb-8"
          >
            {t("subtitle", lang)}
          </motion.p>

          {/* Filter tabs */}
          <div className="inline-flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className={`relative flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  filter === tab.key
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.icon}
                {tab.label}
                {filter === tab.key && (
                  <motion.div
                    layoutId="tab-underline"
                    className="absolute bottom-0 left-3 right-3 h-0.5 bg-red-500 rounded-full"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Survey cards ---- */}
      <section className="max-w-3xl mx-auto px-4 py-10 md:py-14">
        <AnimatePresence mode="popLayout">
          {filteredSurveys.length === 0 ? (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center text-slate-400 py-20"
            >
              {t("noSurveys", lang)}
            </motion.p>
          ) : (
            <div className="space-y-8">
              {filteredSurveys.map((survey) => (
                <SurveyCard
                  key={survey.id}
                  survey={survey}
                  lang={lang}
                  userVote={userVotes[survey.id] ?? null}
                  onVote={handleVote}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </section>

      {/* ---- My votes section ---- */}
      <AnimatePresence>
        {votedSurveys.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="max-w-3xl mx-auto px-4 pb-16"
          >
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 md:p-8">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-5">
                <History className="w-5 h-5 text-red-500" />
                {t("myVotes", lang)}
              </h2>
              <div className="space-y-3">
                {votedSurveys.map((survey) => {
                  const votedOption = survey.options.find((o) => o.id === userVotes[survey.id]);
                  return (
                    <motion.a
                      key={survey.id}
                      href={`#${survey.id}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between gap-4 px-4 py-3 bg-white rounded-xl border border-slate-100 hover:border-red-200 transition-colors group"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 text-sm truncate">
                          {survey.question[lang] || survey.question.fr}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {votedOption
                            ? votedOption.label[lang] || votedOption.label.fr
                            : ""}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-red-500 transition-colors flex-shrink-0" />
                    </motion.a>
                  );
                })}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </Layout>
  );
};

export default Sondages;
