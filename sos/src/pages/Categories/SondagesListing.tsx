import React, { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart3,
  Clock,
  Users,
  CheckCircle2,
  ArrowRight,
  Vote,
  TrendingUp,
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import SEOHead from "@/components/layout/SEOHead";
import { parseLocaleFromPath } from "@/multilingual-system";
import { useApp } from "@/contexts/AppContext";

/* ------------------------------------------------------------------ */
/*  i18n                                                               */
/* ------------------------------------------------------------------ */

const T: Record<string, Record<string, string>> = {
  badge: { fr: "Sondages", en: "Surveys" },
  heroTitle: { fr: "Votre voix compte", en: "Your voice matters" },
  heroSubtitle: {
    fr: "Participez a nos sondages et contribuez a ameliorer l'experience des expatries.",
    en: "Take part in our surveys and help improve the expat experience.",
  },
  statActive: { fr: "sondages actifs", en: "active surveys" },
  statParticipants: { fr: "participants", en: "participants" },
  statCompleted: { fr: "sondages termines", en: "completed surveys" },
  activeSectionTitle: { fr: "Sondages en cours", en: "Active surveys" },
  activeSectionSub: {
    fr: "Votre avis facon\u0327ne le futur de SOS-Expat",
    en: "Your opinion shapes the future of SOS-Expat",
  },
  participate: { fr: "Participer", en: "Participate" },
  daysLeft: { fr: "jours restants", en: "days left" },
  votes: { fr: "votes", en: "votes" },
  target: { fr: "objectif", en: "target" },
  completedSectionTitle: { fr: "Resultats des sondages passes", en: "Past survey results" },
  completedSectionSub: {
    fr: "Decouvrez ce que la communaute a repondu",
    en: "Discover what the community answered",
  },
  seeResults: { fr: "Voir les resultats", en: "See results" },
  totalVotes: { fr: "votes au total", en: "total votes" },
  completedOn: { fr: "Termine le", en: "Completed on" },
  impactTitle: { fr: "Ce que vos reponses ont change", en: "What your answers changed" },
  impactSub: {
    fr: "Chaque sondage a un impact reel sur nos services",
    en: "Every survey has a real impact on our services",
  },
  ctaTitle: { fr: "Vous avez une idee de sondage ?", en: "Have a survey idea?" },
  ctaSub: {
    fr: "Proposez un sujet qui vous tient a coeur et contribuez a notre communaute.",
    en: "Suggest a topic you care about and contribute to our community.",
  },
  ctaButton: { fr: "Proposer un sondage", en: "Suggest a survey" },
  seoTitle: { fr: "Sondages Expatries | SOS-Expat", en: "Expat Surveys | SOS-Expat" },
  seoDesc: {
    fr: "Participez aux sondages SOS-Expat et aidez-nous a ameliorer l'experience des expatries dans le monde entier.",
    en: "Take part in SOS-Expat surveys and help us improve the expat experience worldwide.",
  },
};

const t = (key: string, lang: string) => T[key]?.[lang] || T[key]?.fr || key;

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

interface ActiveSurvey {
  id: string;
  title: Record<string, string>;
  description: Record<string, string>;
  category: Record<string, string>;
  deadline: string;
  votes: number;
  target: number;
}

interface CompletedSurvey {
  id: string;
  title: Record<string, string>;
  summary: Record<string, string>;
  totalVotes: number;
  completedDate: string;
  results: { label: Record<string, string>; pct: number; color: string }[];
}

const ACTIVE_SURVEYS: ActiveSurvey[] = [
  {
    id: "s1",
    title: {
      fr: "Satisfaction generale SOS-Expat 2026",
      en: "Overall SOS-Expat satisfaction 2026",
    },
    description: {
      fr: "Evaluez votre experience globale avec nos services d'assistance aux expatries et aidez-nous a mieux vous servir.",
      en: "Rate your overall experience with our expat assistance services and help us serve you better.",
    },
    category: { fr: "Satisfaction", en: "Satisfaction" },
    deadline: "2026-04-12",
    votes: 347,
    target: 500,
  },
  {
    id: "s2",
    title: {
      fr: "Quelles fonctionnalites souhaitez-vous en priorite ?",
      en: "Which features do you want first?",
    },
    description: {
      fr: "Votez pour les prochaines fonctionnalites a developper : chat video, traduction en temps reel, guide pays interactif...",
      en: "Vote for the next features to develop: video chat, real-time translation, interactive country guide...",
    },
    category: { fr: "Fonctionnalites", en: "Features" },
    deadline: "2026-04-04",
    votes: 218,
    target: 300,
  },
  {
    id: "s3",
    title: {
      fr: "Profil demographique de notre communaute",
      en: "Demographic profile of our community",
    },
    description: {
      fr: "Aidez-nous a mieux comprendre qui sont les expatries SOS-Expat pour adapter nos services a vos besoins.",
      en: "Help us understand who SOS-Expat users are so we can adapt our services to your needs.",
    },
    category: { fr: "Demographique", en: "Demographic" },
    deadline: "2026-04-20",
    votes: 129,
    target: 400,
  },
];

const COMPLETED_SURVEYS: CompletedSurvey[] = [
  {
    id: "c1",
    title: { fr: "Langue preferee pour l'assistance", en: "Preferred assistance language" },
    summary: {
      fr: "Le francais et l'anglais dominent, mais 23 % demandent l'arabe.",
      en: "French and English dominate, but 23% request Arabic.",
    },
    totalVotes: 892,
    completedDate: "2026-03-15",
    results: [
      { label: { fr: "Francais", en: "French" }, pct: 42, color: "#DC2626" },
      { label: { fr: "Anglais", en: "English" }, pct: 35, color: "#0F172A" },
      { label: { fr: "Arabe", en: "Arabic" }, pct: 23, color: "#6B7280" },
    ],
  },
  {
    id: "c2",
    title: { fr: "Mode de paiement favori", en: "Preferred payment method" },
    summary: {
      fr: "La carte bancaire reste le choix n1, Mobile Money progresse.",
      en: "Credit card remains #1, Mobile Money is growing.",
    },
    totalVotes: 654,
    completedDate: "2026-02-28",
    results: [
      { label: { fr: "Carte bancaire", en: "Credit card" }, pct: 51, color: "#DC2626" },
      { label: { fr: "Mobile Money", en: "Mobile Money" }, pct: 30, color: "#0F172A" },
      { label: { fr: "PayPal", en: "PayPal" }, pct: 19, color: "#6B7280" },
    ],
  },
  {
    id: "c3",
    title: { fr: "Horaires d'assistance ideaux", en: "Ideal assistance hours" },
    summary: {
      fr: "68 % preferent un service 24/7, 22 % les heures de bureau.",
      en: "68% prefer 24/7 service, 22% prefer office hours.",
    },
    totalVotes: 731,
    completedDate: "2026-02-10",
    results: [
      { label: { fr: "24h/24", en: "24/7" }, pct: 68, color: "#DC2626" },
      { label: { fr: "Heures bureau", en: "Office hours" }, pct: 22, color: "#0F172A" },
      { label: { fr: "Soiree/weekend", en: "Evening/weekend" }, pct: 10, color: "#6B7280" },
    ],
  },
  {
    id: "c4",
    title: { fr: "Qualite du service juridique", en: "Legal service quality" },
    summary: {
      fr: "87 % jugent le service bon ou excellent.",
      en: "87% rate the service as good or excellent.",
    },
    totalVotes: 512,
    completedDate: "2026-01-20",
    results: [
      { label: { fr: "Excellent", en: "Excellent" }, pct: 52, color: "#DC2626" },
      { label: { fr: "Bon", en: "Good" }, pct: 35, color: "#0F172A" },
      { label: { fr: "A ameliorer", en: "Needs improvement" }, pct: 13, color: "#6B7280" },
    ],
  },
];

const IMPACT_DATA = [
  {
    icon: TrendingUp,
    title: { fr: "Support arabe lance", en: "Arabic support launched" },
    desc: {
      fr: "Grace au sondage sur les langues, nous avons ajoute le support en arabe en mars 2026.",
      en: "Thanks to the language survey, we added Arabic support in March 2026.",
    },
  },
  {
    icon: CheckCircle2,
    title: { fr: "Mobile Money active", en: "Mobile Money activated" },
    desc: {
      fr: "30 % des votes ont demande Mobile Money : c'est desormais disponible dans 15 pays.",
      en: "30% of votes requested Mobile Money: it's now available in 15 countries.",
    },
  },
  {
    icon: Users,
    title: { fr: "Assistance 24/7", en: "24/7 assistance" },
    desc: {
      fr: "Le sondage sur les horaires a confirme le besoin : nos prestataires couvrent maintenant tous les fuseaux.",
      en: "The hours survey confirmed the need: our providers now cover every timezone.",
    },
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.12, ease: "easeOut" },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const SondagesListing: React.FC = () => {
  const location = useLocation();
  const { language } = useApp();
  const lang = (language || parseLocaleFromPath(location.pathname)?.lang || "fr") as string;

  const totalParticipants = useMemo(
    () =>
      ACTIVE_SURVEYS.reduce((a, s) => a + s.votes, 0) +
      COMPLETED_SURVEYS.reduce((a, s) => a + s.totalVotes, 0),
    [],
  );

  return (
    <Layout>
      <SEOHead title={t("seoTitle", lang)} description={t("seoDesc", lang)} />

      {/* ========== HERO ========== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pt-28 pb-20">
        {/* subtle grid background */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative mx-auto max-w-6xl px-4 text-center">
          {/* badge */}
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
            className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl"
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

          {/* stats row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-8 sm:gap-14"
          >
            {[
              { value: ACTIVE_SURVEYS.length, label: t("statActive", lang), icon: BarChart3 },
              {
                value: totalParticipants.toLocaleString(),
                label: t("statParticipants", lang),
                icon: Users,
              },
              {
                value: COMPLETED_SURVEYS.length,
                label: t("statCompleted", lang),
                icon: CheckCircle2,
              },
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
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeUp}
            custom={0}
            className="mb-12 text-center"
          >
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
              {t("activeSectionTitle", lang)}
            </h2>
            <p className="mt-3 text-slate-500">{t("activeSectionSub", lang)}</p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={stagger}
            className="flex flex-col gap-6"
          >
            {ACTIVE_SURVEYS.map((survey, idx) => {
              const days = daysUntil(survey.deadline);
              const pct = Math.round((survey.votes / survey.target) * 100);
              const urgent = days <= 3;
              return (
                <motion.div
                  key={survey.id}
                  variants={fadeUp}
                  custom={idx}
                  className={`group relative rounded-2xl border bg-white shadow-md transition-shadow hover:shadow-xl ${
                    urgent
                      ? "animate-pulse-border border-red-400"
                      : "border-slate-200"
                  }`}
                  style={{ borderLeftWidth: "4px", borderLeftColor: "#DC2626" }}
                >
                  <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
                    {/* left */}
                    <div className="flex-1 space-y-3">
                      <span className="inline-block rounded-full bg-red-50 px-3 py-0.5 text-xs font-semibold text-red-600">
                        {survey.category[lang] || survey.category.fr}
                      </span>
                      <h3 className="text-xl font-bold text-slate-900">
                        {survey.title[lang] || survey.title.fr}
                      </h3>
                      <p className="text-sm leading-relaxed text-slate-500">
                        {survey.description[lang] || survey.description.fr}
                      </p>
                      {/* meta */}
                      <div className="flex flex-wrap items-center gap-5 text-sm text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4" />
                          <span className={urgent ? "font-semibold text-red-600" : ""}>
                            {days} {t("daysLeft", lang)}
                          </span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Users className="h-4 w-4" />
                          {survey.votes} {t("votes", lang)}
                        </span>
                      </div>
                      {/* progress */}
                      <div className="pt-1">
                        <div className="mb-1 flex justify-between text-xs text-slate-400">
                          <span>{pct}%</span>
                          <span>
                            {survey.target} {t("target", lang)}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                          <motion.div
                            className="h-full rounded-full bg-red-600"
                            initial={{ width: 0 }}
                            whileInView={{ width: `${pct}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, delay: 0.2 + idx * 0.1 }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* CTA */}
                    <div className="shrink-0">
                      <button className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-red-600/20 transition-all hover:bg-red-700 hover:shadow-red-600/30 active:scale-[0.97]">
                        {t("participate", lang)}
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ========== COMPLETED SURVEYS ========== */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeUp}
            custom={0}
            className="mb-12 text-center"
          >
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
              {t("completedSectionTitle", lang)}
            </h2>
            <p className="mt-3 text-slate-500">{t("completedSectionSub", lang)}</p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={stagger}
            className="grid gap-6 sm:grid-cols-2"
          >
            {COMPLETED_SURVEYS.map((survey, idx) => (
              <motion.div
                key={survey.id}
                variants={fadeUp}
                custom={idx}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-lg"
              >
                <h3 className="text-lg font-bold text-slate-900">
                  {survey.title[lang] || survey.title.fr}
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  {survey.summary[lang] || survey.summary.fr}
                </p>

                {/* mini bar chart */}
                <div className="mt-5 space-y-2.5">
                  {survey.results.map((r, ri) => (
                    <div key={ri}>
                      <div className="mb-0.5 flex justify-between text-xs text-slate-500">
                        <span>{r.label[lang] || r.label.fr}</span>
                        <span className="font-semibold">{r.pct}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: r.color }}
                          initial={{ width: 0 }}
                          whileInView={{ width: `${r.pct}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.7, delay: 0.15 * ri }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* footer */}
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-400">
                  <span>
                    {survey.totalVotes.toLocaleString()} {t("totalVotes", lang)}
                  </span>
                  <span>
                    {t("completedOn", lang)}{" "}
                    {new Date(survey.completedDate).toLocaleDateString(
                      lang === "fr" ? "fr-FR" : "en-US",
                    )}
                  </span>
                </div>

                <button className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 transition-colors hover:text-red-700">
                  {t("seeResults", lang)}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ========== IMPACT SECTION ========== */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeUp}
            custom={0}
            className="mb-12 text-center"
          >
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
              {t("impactTitle", lang)}
            </h2>
            <p className="mt-3 text-slate-500">{t("impactSub", lang)}</p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={stagger}
            className="grid gap-6 sm:grid-cols-3"
          >
            {IMPACT_DATA.map((item, idx) => (
              <motion.div
                key={idx}
                variants={fadeUp}
                custom={idx}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center transition-shadow hover:shadow-lg"
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600/10">
                  <item.icon className="h-7 w-7 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  {(item.title as Record<string, string>)[lang] || item.title.fr}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {(item.desc as Record<string, string>)[lang] || item.desc.fr}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ========== CTA — PROPOSE A SURVEY ========== */}
      <section className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
          custom={0}
          className="mx-auto max-w-3xl px-4 text-center"
        >
          <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600/15">
            <BarChart3 className="h-7 w-7 text-red-500" />
          </div>
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            {t("ctaTitle", lang)}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-400">{t("ctaSub", lang)}</p>
          <button className="mt-8 inline-flex items-center gap-2 rounded-xl bg-red-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-red-600/25 transition-all hover:bg-red-700 hover:shadow-red-600/35 active:scale-[0.97]">
            {t("ctaButton", lang)}
            <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>
      </section>

      {/* Pulse border animation for urgent surveys */}
      <style>{`
        @keyframes pulseBorder {
          0%, 100% { border-color: #f87171; box-shadow: 0 0 0 0 rgba(220,38,38,0.15); }
          50% { border-color: #dc2626; box-shadow: 0 0 12px 2px rgba(220,38,38,0.2); }
        }
        .animate-pulse-border {
          animation: pulseBorder 2s ease-in-out infinite;
        }
      `}</style>
    </Layout>
  );
};

export default SondagesListing;
