/**
 * Sondages Listing — SOS-Expat
 * Connected to Blog Laravel API (no mock data).
 */
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart3,
  Clock,
  Users,
  CheckCircle2,
  ArrowRight,
  Vote,
  Loader2,
  MessageSquarePlus,
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import SEOHead from "@/components/layout/SEOHead";
import { parseLocaleFromPath } from "@/multilingual-system";
import { useApp } from "@/contexts/AppContext";

/* ------------------------------------------------------------------ */
/*  i18n                                                               */
/* ------------------------------------------------------------------ */

const T: Record<string, Record<string, string>> = {
  badge:               { fr: "Sondages",           en: "Surveys" },
  heroTitle:           { fr: "Votre voix compte",  en: "Your voice matters" },
  heroSubtitle: {
    fr: "Participez a nos sondages et contribuez a ameliorer l'experience des expatries.",
    en: "Take part in our surveys and help improve the expat experience.",
  },
  statActive:      { fr: "sondages actifs",   en: "active surveys" },
  statParticipants:{ fr: "participants",       en: "participants" },
  statCompleted:   { fr: "sondages termines", en: "completed surveys" },
  activeSectionTitle: { fr: "Sondages en cours",             en: "Active surveys" },
  activeSectionSub: {
    fr: "Votre avis facon\u0327ne le futur de SOS-Expat",
    en: "Your opinion shapes the future of SOS-Expat",
  },
  participate:  { fr: "Participer",       en: "Participate" },
  daysLeft:     { fr: "jours restants",   en: "days left" },
  votes:        { fr: "participants",     en: "participants" },
  completedSectionTitle: { fr: "Resultats des sondages passes", en: "Past survey results" },
  completedSectionSub: {
    fr: "Decouvrez ce que la communaute a repondu",
    en: "Discover what the community answered",
  },
  seeResults:   { fr: "Voir les resultats", en: "See results" },
  totalVotes:   { fr: "reponses",           en: "responses" },
  completedOn:  { fr: "Termine le",         en: "Completed" },
  emptyActive:  { fr: "Aucun sondage actif pour le moment.", en: "No active surveys at the moment." },
  emptyCompleted: { fr: "Aucun sondage termine.",            en: "No completed surveys yet." },
  ctaTitle:  { fr: "Vous avez une idee de sondage ?", en: "Have a survey idea?" },
  ctaSub: {
    fr: "Proposez un sujet qui vous tient a coeur et contribuez a notre communaute.",
    en: "Suggest a topic you care about and contribute to our community.",
  },
  ctaButton: { fr: "Proposer un sondage", en: "Suggest a survey" },
  seoTitle: { fr: "Sondages Expatries | SOS-Expat",       en: "Expat Surveys | SOS-Expat" },
  seoDesc: {
    fr: "Participez aux sondages SOS-Expat et aidez-nous a ameliorer l'experience des expatries dans le monde entier.",
    en: "Take part in SOS-Expat surveys and help us improve the expat experience worldwide.",
  },
};

const t = (key: string, lang: string) => T[key]?.[lang] || T[key]?.fr || key;

/* ------------------------------------------------------------------ */
/*  Types & API                                                        */
/* ------------------------------------------------------------------ */

const BLOG_API = "https://sos-expat.com/api/v1/public";

const SONDAGE_SEGMENT: Record<string, string> = {
  fr: "sondages", en: "surveys", es: "encuestas", de: "umfragen",
  pt: "pesquisas", ru: "oprosy", zh: "diaocha", hi: "sarvekshan", ar: "istitalaat",
};
const LANG_LOCALE: Record<string, string> = {
  fr: "fr-fr", en: "en-us", es: "es-es", de: "de-de",
  ru: "ru-ru", pt: "pt-pt", zh: "zh-cn", hi: "hi-in", ar: "ar-sa",
};

function sondageUrl(lang: string, slug: string): string {
  return `/sondages/${slug}`;  // SPA route (Cloudflare Pages)
}

interface Sondage {
  id: number;
  external_id: string;
  slug: string;
  title: string;
  description: string;
  status: "active" | "closed";
  closes_at: string | null;
  published_at: string | null;
  responses_count: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers & Animations                                               */
/* ------------------------------------------------------------------ */

function daysUntil(dateStr: string | null): number {
  if (!dateStr) return 0;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: "easeOut" },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const SondagesListing: React.FC = () => {
  const location = useLocation();
  const { language } = useApp();
  const lang = (language || parseLocaleFromPath(location.pathname)?.lang || "fr") as string;

  const [activeSurveys, setActiveSurveys]       = useState<Sondage[]>([]);
  const [completedSurveys, setCompletedSurveys] = useState<Sondage[]>([]);
  const [loading, setLoading]                   = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();

    Promise.all([
      fetch(`${BLOG_API}/sondages?lang=${lang}&status=active`,  { signal: ctrl.signal }).then(r => r.json()),
      fetch(`${BLOG_API}/sondages?lang=${lang}&status=closed`,  { signal: ctrl.signal }).then(r => r.json()),
    ])
      .then(([activeRes, closedRes]) => {
        setActiveSurveys(activeRes.data ?? []);
        setCompletedSurveys(closedRes.data ?? []);
      })
      .catch(() => {/* network error → empty state */})
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [lang]);

  const totalParticipants = [...activeSurveys, ...completedSurveys]
    .reduce((sum, s) => sum + (s.responses_count ?? 0), 0);

  return (
    <Layout>
      <SEOHead title={t("seoTitle", lang)} description={t("seoDesc", lang)} />

      {/* ========== HERO ========== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pt-16 pb-12 sm:pt-28 sm:pb-20">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative mx-auto max-w-6xl px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-600/30 bg-red-600/10 px-5 py-1.5 text-sm font-semibold text-red-400"
          >
            <Vote className="h-4 w-4" />
            {t("badge", lang)}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl"
          >
            {t("heroTitle", lang)}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mx-auto mt-5 max-w-2xl text-lg text-slate-400"
          >
            {t("heroSubtitle", lang)}
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-8 sm:gap-14"
          >
            {[
              { value: loading ? "…" : activeSurveys.length,    label: t("statActive", lang),       icon: BarChart3 },
              { value: loading ? "…" : totalParticipants || "—", label: t("statParticipants", lang), icon: Users },
              { value: loading ? "…" : completedSurveys.length, label: t("statCompleted", lang),     icon: CheckCircle2 },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-3 text-left">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600/15">
                  <s.icon className="h-5 w-5 text-red-500" />
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

      {/* ========== ACTIVE SURVEYS ========== */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-4">
          <motion.div
            initial="hidden" whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeUp} custom={0}
            className="mb-12 text-center"
          >
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
              {t("activeSectionTitle", lang)}
            </h2>
            <p className="mt-3 text-slate-500">{t("activeSectionSub", lang)}</p>
          </motion.div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-red-500" />
            </div>
          ) : activeSurveys.length === 0 ? (
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="py-12 text-center text-slate-400"
            >
              {t("emptyActive", lang)}
            </motion.p>
          ) : (
            <motion.div
              initial="hidden" whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
              variants={stagger}
              className="flex flex-col gap-6"
            >
              {activeSurveys.map((survey, idx) => {
                const days   = daysUntil(survey.closes_at);
                const urgent = days > 0 && days <= 3;
                return (
                  <motion.div
                    key={survey.id}
                    variants={fadeUp} custom={idx}
                    className={`group relative rounded-2xl border bg-white shadow-md transition-shadow hover:shadow-xl ${
                      urgent ? "animate-pulse-border border-red-400" : "border-slate-200"
                    }`}
                    style={{ borderLeftWidth: "4px", borderLeftColor: "#DC2626" }}
                  >
                    <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1 space-y-2">
                        <h3 className="text-xl font-bold text-slate-900">{survey.title}</h3>
                        {survey.description && (
                          <p className="text-sm leading-relaxed text-slate-500 line-clamp-2">
                            {survey.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-5 pt-1 text-sm text-slate-400">
                          {survey.closes_at && (
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-4 w-4" />
                              <span className={urgent ? "font-semibold text-red-600" : ""}>
                                {days} {t("daysLeft", lang)}
                              </span>
                            </span>
                          )}
                          {survey.responses_count > 0 && (
                            <span className="flex items-center gap-1.5">
                              <Users className="h-4 w-4" />
                              {survey.responses_count} {t("votes", lang)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0">
                        <a
                          href={sondageUrl(lang, survey.slug)}
                          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-red-600/20 transition-all hover:bg-red-700 hover:shadow-red-600/30 active:scale-[0.97]"
                        >
                          {t("participate", lang)}
                          <ArrowRight className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </section>

      {/* ========== COMPLETED SURVEYS ========== */}
      {(loading || completedSurveys.length > 0) && (
        <section className="bg-slate-50 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <motion.div
              initial="hidden" whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeUp} custom={0}
              className="mb-12 text-center"
            >
              <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
                {t("completedSectionTitle", lang)}
              </h2>
              <p className="mt-3 text-slate-500">{t("completedSectionSub", lang)}</p>
            </motion.div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
              </div>
            ) : (
              <motion.div
                initial="hidden" whileInView="visible"
                viewport={{ once: true, amount: 0.1 }}
                variants={stagger}
                className="grid gap-6 sm:grid-cols-2"
              >
                {completedSurveys.map((survey, idx) => (
                  <motion.div
                    key={survey.id}
                    variants={fadeUp} custom={idx}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-lg"
                  >
                    <h3 className="text-lg font-bold text-slate-900">{survey.title}</h3>
                    {survey.description && (
                      <p className="mt-2 text-sm text-slate-500 line-clamp-3">{survey.description}</p>
                    )}
                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-400">
                      {survey.responses_count > 0 && (
                        <span>{survey.responses_count.toLocaleString()} {t("totalVotes", lang)}</span>
                      )}
                      {survey.closes_at && (
                        <span>
                          {t("completedOn", lang)}{" "}
                          {new Date(survey.closes_at).toLocaleDateString(
                            lang === "fr" ? "fr-FR" : "en-US"
                          )}
                        </span>
                      )}
                    </div>
                    <a
                      href={sondageUrl(lang, survey.slug)}
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 transition-colors hover:text-red-700"
                    >
                      {t("seeResults", lang)}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </section>
      )}

      {/* ========== CTA ========== */}
      <section className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-20">
        <motion.div
          initial="hidden" whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp} custom={0}
          className="mx-auto max-w-3xl px-4 text-center"
        >
          <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600/15">
            <MessageSquarePlus className="h-7 w-7 text-red-500" />
          </div>
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            {t("ctaTitle", lang)}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-400">{t("ctaSub", lang)}</p>
          <a
            href="/contact"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-red-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-red-600/25 transition-all hover:bg-red-700 hover:shadow-red-600/35 active:scale-[0.97]"
          >
            {t("ctaButton", lang)}
            <ArrowRight className="h-4 w-4" />
          </a>
        </motion.div>
      </section>

      <style>{`
        @keyframes pulseBorder {
          0%, 100% { border-color: #f87171; box-shadow: 0 0 0 0 rgba(220,38,38,0.15); }
          50% { border-color: #dc2626; box-shadow: 0 0 12px 2px rgba(220,38,38,0.2); }
        }
        .animate-pulse-border { animation: pulseBorder 2s ease-in-out infinite; }
      `}</style>
    </Layout>
  );
};

export default SondagesListing;
