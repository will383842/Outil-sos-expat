/**
 * Affiliation - Programme d'Affiliation SOS-Expat
 *
 * Presents the 4 affiliate roles (Chatter, Influencer, Blogger, Group Admin)
 * with commission comparison, steps, tools, leaderboard preview, and FAQ.
 */

import React, { useState, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useInView } from "framer-motion";
import Layout from "@/components/layout/Layout";
import SEOHead from "@/components/layout/SEOHead";
import { parseLocaleFromPath } from "@/multilingual-system";
import { useApp } from "@/contexts/AppContext";
import {
  MessageSquare,
  Megaphone,
  PenTool,
  Users,
  ArrowRight,
  ChevronDown,
  Link2,
  QrCode,
  LayoutGrid,
  Image,
  BarChart3,
  UsersRound,
  Trophy,
  Medal,
  Award,
  Sparkles,
  Check,
  Zap,
  Star,
  Rocket,
} from "lucide-react";

// ============================================================================
// I18N
// ============================================================================
const T: Record<string, Record<string, string>> = {
  // -- META --
  "meta.title": {
    fr: "Programme d'Affiliation SOS-Expat | Gagnez des commissions",
    en: "SOS-Expat Affiliate Program | Earn commissions",
  },
  "meta.description": {
    fr: "Rejoignez le programme d'affiliation SOS-Expat. 4 roles, commissions recurrentes. Chatter, Influencer, Blogger ou Group Admin.",
    en: "Join the SOS-Expat affiliate program. 4 roles, recurring commissions. Chatter, Influencer, Blogger or Group Admin.",
  },

  // -- HERO --
  "hero.badge": {
    fr: "Programme d'affiliation",
    en: "Affiliate program",
  },
  "hero.title": {
    fr: "Gagnez des commissions en referant des clients",
    en: "Earn commissions by referring clients",
  },
  "hero.subtitle": {
    fr: "Choisissez votre role parmi 4 profils et commencez a generer des revenus passifs des aujourd'hui. Aucun investissement requis.",
    en: "Choose your role among 4 profiles and start generating passive income today. No investment required.",
  },
  "hero.cta": {
    fr: "Choisir mon role",
    en: "Choose my role",
  },

  // -- ROLES --
  "roles.heading": {
    fr: "Choisissez votre role",
    en: "Choose your role",
  },
  "roles.subheading": {
    fr: "4 profils adaptes a votre audience et vos competences",
    en: "4 profiles tailored to your audience and skills",
  },
  "role.chatter.name": { fr: "Chatter", en: "Chatter" },
  "role.chatter.desc": {
    fr: "Partagez vos liens sur les reseaux sociaux, chats et messageries. Ideal pour les communicants actifs.",
    en: "Share your links on social media, chats and messaging apps. Ideal for active communicators.",
  },
  "role.chatter.popular": { fr: "Le plus populaire", en: "Most popular" },
  "role.influencer.name": { fr: "Influencer", en: "Influencer" },
  "role.influencer.desc": {
    fr: "Creez du contenu sur vos reseaux sociaux pour promouvoir SOS-Expat aupres de votre audience.",
    en: "Create social media content to promote SOS-Expat to your audience.",
  },
  "role.blogger.name": { fr: "Blogger", en: "Blogger" },
  "role.blogger.desc": {
    fr: "Integrez notre widget dans vos articles de blog et gagnez a chaque appel genere.",
    en: "Embed our widget in your blog posts and earn from every call generated.",
  },
  "role.groupadmin.name": { fr: "Group Admin", en: "Group Admin" },
  "role.groupadmin.desc": {
    fr: "Administrez des groupes WhatsApp ou Telegram et partagez votre lien avec vos membres.",
    en: "Manage WhatsApp or Telegram groups and share your link with members.",
  },
  "role.commission.client": { fr: "Par client refere", en: "Per referred client" },
  "role.commission.recruit": {
    fr: "Par recrutement",
    en: "Per recruitment",
  },
  "role.cta": { fr: "S'inscrire", en: "Sign up" },

  // -- TABLE --
  "table.heading": {
    fr: "Comparatif des commissions",
    en: "Commission comparison",
  },
  "table.action": { fr: "Action", en: "Action" },
  "table.client": { fr: "Client refere", en: "Referred client" },
  "table.recruit": {
    fr: "Recrutement prestataire",
    en: "Provider recruitment",
  },
  "table.perCall": { fr: "/appel", en: "/call" },

  // -- STEPS --
  "steps.heading": {
    fr: "Comment demarrer",
    en: "How to start",
  },
  "step.1.title": { fr: "Choisissez votre role", en: "Choose your role" },
  "step.1.desc": {
    fr: "Selectionnez le profil qui correspond a votre audience.",
    en: "Select the profile that matches your audience.",
  },
  "step.2.title": { fr: "Inscrivez-vous", en: "Sign up" },
  "step.2.desc": {
    fr: "Creez votre compte gratuit en moins de 2 minutes.",
    en: "Create your free account in less than 2 minutes.",
  },
  "step.3.title": { fr: "Recevez vos outils", en: "Get your tools" },
  "step.3.desc": {
    fr: "Liens traces, QR codes, widget et bannieres prets a l'emploi.",
    en: "Tracked links, QR codes, widget and banners ready to use.",
  },
  "step.4.title": {
    fr: "Commencez a gagner",
    en: "Start earning",
  },
  "step.4.desc": {
    fr: "Chaque appel genere vous rapporte des commissions. Retraits des 30$.",
    en: "Every generated call earns you commissions. Withdrawals from $30.",
  },

  // -- TOOLS --
  "tools.heading": {
    fr: "Les outils fournis",
    en: "Tools provided",
  },
  "tools.subheading": {
    fr: "Tout ce dont vous avez besoin pour reussir",
    en: "Everything you need to succeed",
  },
  "tool.links": { fr: "Liens traces", en: "Tracked links" },
  "tool.qr": { fr: "QR codes", en: "QR codes" },
  "tool.widget": { fr: "Widget integrable", en: "Embeddable widget" },
  "tool.banners": { fr: "Bannieres HD", en: "HD Banners" },
  "tool.dashboard": { fr: "Dashboard temps reel", en: "Real-time dashboard" },
  "tool.community": { fr: "Communaute d'affilies", en: "Affiliate community" },

  // -- TOP 3 --
  "top3.heading": {
    fr: "Classement Top 3",
    en: "Top 3 Leaderboard",
  },
  "top3.subheading": {
    fr: "Tous les roles en competition. Les meilleurs affilies sont recompenses chaque mois.",
    en: "All roles compete together. The best affiliates are rewarded each month.",
  },
  "top3.cross": {
    fr: "Classement cross-role",
    en: "Cross-role ranking",
  },
  "top3.desc": {
    fr: "Peu importe votre role, seule votre performance compte. Atteignez le Top 3 et debloquez des bonus exclusifs.",
    en: "No matter your role, only your performance matters. Reach the Top 3 and unlock exclusive bonuses.",
  },

  // -- FAQ --
  "faq.heading": { fr: "Questions frequentes", en: "FAQ" },
  "faq.q1": {
    fr: "Faut-il payer pour rejoindre le programme ?",
    en: "Do I have to pay to join the program?",
  },
  "faq.a1": {
    fr: "Non, l'inscription est 100% gratuite. Vous recevez immediatement vos outils et liens d'affiliation.",
    en: "No, registration is 100% free. You immediately receive your tools and affiliate links.",
  },
  "faq.q2": {
    fr: "Quand puis-je retirer mes gains ?",
    en: "When can I withdraw my earnings?",
  },
  "faq.a2": {
    fr: "Des que votre solde atteint 30$, vous pouvez demander un retrait via Stripe, PayPal ou Mobile Money selon votre pays.",
    en: "As soon as your balance reaches $30, you can request a withdrawal via Stripe, PayPal or Mobile Money depending on your country.",
  },
  "faq.q3": {
    fr: "Puis-je cumuler plusieurs roles ?",
    en: "Can I combine multiple roles?",
  },
  "faq.a3": {
    fr: "Non, vous choisissez un seul role. Mais vous pouvez changer de role en contactant le support.",
    en: "No, you choose one role. But you can switch roles by contacting support.",
  },
  "faq.q4": {
    fr: "Les commissions sont-elles recurrentes ?",
    en: "Are commissions recurring?",
  },
  "faq.a4": {
    fr: "Oui ! Pour les Bloggers et Influencers, vous gagnez sur chaque appel genere par les prestataires que vous recrutez, sans limite de temps.",
    en: "Yes! For Bloggers and Influencers, you earn on every call generated by providers you recruit, with no time limit.",
  },
  "faq.q5": {
    fr: "Quels types d'assistance sont concernes ?",
    en: "What types of assistance are covered?",
  },
  "faq.a5": {
    fr: "Tous les types : juridique, administrative, traduction, sante, immigration, et bien plus. Chaque appel payant declenche votre commission.",
    en: "All types: legal, administrative, translation, health, immigration, and more. Every paid call triggers your commission.",
  },

  // -- CTA FINAL --
  "cta.heading": {
    fr: "Pret a commencer ?",
    en: "Ready to start?",
  },
  "cta.subheading": {
    fr: "Selectionnez votre role et inscrivez-vous gratuitement.",
    en: "Select your role and sign up for free.",
  },
  "cta.button": { fr: "M'inscrire maintenant", en: "Sign up now" },
};

// ============================================================================
// TYPES & DATA
// ============================================================================
interface RoleData {
  key: string;
  icon: React.ElementType;
  nameKey: string;
  descKey: string;
  clientRate: string;
  recruitRate: string;
  popular?: boolean;
  path: string;
}

const ROLES: RoleData[] = [
  {
    key: "chatter",
    icon: MessageSquare,
    nameKey: "role.chatter.name",
    descKey: "role.chatter.desc",
    clientRate: "$5",
    recruitRate: "$3",
    popular: true,
    path: "/chatter/register",
  },
  {
    key: "influencer",
    icon: Megaphone,
    nameKey: "role.influencer.name",
    descKey: "role.influencer.desc",
    clientRate: "$10",
    recruitRate: "$5",
    path: "/influencer/register",
  },
  {
    key: "blogger",
    icon: PenTool,
    nameKey: "role.blogger.name",
    descKey: "role.blogger.desc",
    clientRate: "$10",
    recruitRate: "$5",
    path: "/blogger/register",
  },
  {
    key: "groupadmin",
    icon: Users,
    nameKey: "role.groupadmin.name",
    descKey: "role.groupadmin.desc",
    clientRate: "$5",
    recruitRate: "$3",
    path: "/group-admin/register",
  },
];

const TOOLS_DATA = [
  { icon: Link2, key: "tool.links" },
  { icon: QrCode, key: "tool.qr" },
  { icon: LayoutGrid, key: "tool.widget" },
  { icon: Image, key: "tool.banners" },
  { icon: BarChart3, key: "tool.dashboard" },
  { icon: UsersRound, key: "tool.community" },
];

const FAQ_KEYS = ["faq.q1", "faq.q2", "faq.q3", "faq.q4", "faq.q5"];

const STEPS_ICONS = [Star, Rocket, Zap, Sparkles];

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

// ============================================================================
// REUSABLE COMPONENTS
// ============================================================================
function SectionReveal({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={staggerContainer}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function FAQItem({
  question,
  answer,
  isOpen,
  toggle,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  toggle: () => void;
}) {
  return (
    <div className="border-b border-gray-200 last:border-0">
      <button
        onClick={toggle}
        className="flex w-full items-center justify-between py-5 text-left text-base font-medium text-gray-900 transition hover:text-red-600 md:text-lg"
        aria-expanded={isOpen}
      >
        {question}
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="ml-3 shrink-0"
        >
          <ChevronDown className="h-5 w-5" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1, transition: { duration: 0.3 } }}
            exit={{ height: 0, opacity: 0, transition: { duration: 0.2 } }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-gray-600 leading-relaxed">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const Affiliation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { language } = useApp();
  const lang = (language || parseLocaleFromPath(location.pathname)?.lang || "fr") as string;
  const t = useCallback((key: string) => T[key]?.[lang] || T[key]?.["fr"] || key, [lang]);

  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("chatter");
  const rolesRef = useRef<HTMLDivElement>(null);

  const scrollToRoles = () => {
    rolesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const goToRegister = (path: string) => {
    navigate(path);
  };

  return (
    <Layout>
      <SEOHead title={t("meta.title")} description={t("meta.description")} />

      {/* ================================================================ */}
      {/* HERO */}
      {/* ================================================================ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] py-24 md:py-32">
        {/* Decorative grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        {/* Glow */}
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-red-600/20 blur-[120px]" />

        <div className="relative mx-auto max-w-4xl px-4 text-center">
          <motion.span
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 inline-block rounded-full border border-red-500/30 bg-red-600/10 px-4 py-1.5 text-sm font-medium text-red-400"
          >
            {t("hero.badge")}
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="mb-6 text-4xl font-extrabold leading-tight tracking-tight text-white md:text-5xl lg:text-6xl"
          >
            {t("hero.title")}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mx-auto mb-10 max-w-2xl text-lg text-gray-400 md:text-xl"
          >
            {t("hero.subtitle")}
          </motion.p>

          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={scrollToRoles}
            className="inline-flex items-center gap-2 rounded-full bg-red-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-red-600/25 transition hover:bg-red-700"
          >
            {t("hero.cta")}
            <ArrowRight className="h-5 w-5" />
          </motion.button>
        </div>
      </section>

      {/* ================================================================ */}
      {/* ROLES CARDS */}
      {/* ================================================================ */}
      <section ref={rolesRef} className="bg-gray-50 py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4">
          <SectionReveal className="mb-14 text-center">
            <motion.h2
              variants={fadeUp}
              custom={0}
              className="mb-3 text-3xl font-bold text-gray-900 md:text-4xl"
            >
              {t("roles.heading")}
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-gray-500 text-lg">
              {t("roles.subheading")}
            </motion.p>
          </SectionReveal>

          <SectionReveal className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {ROLES.map((role, i) => {
              const Icon = role.icon;
              return (
                <motion.div
                  key={role.key}
                  variants={fadeUp}
                  custom={i}
                  whileHover={{ y: -6, transition: { duration: 0.25 } }}
                  className={`relative flex flex-col rounded-2xl bg-white p-6 shadow-md transition-shadow hover:shadow-xl ${
                    role.popular
                      ? "ring-2 ring-red-600"
                      : "ring-1 ring-gray-200"
                  }`}
                >
                  {role.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-red-600 px-3 py-0.5 text-xs font-semibold text-white shadow">
                      {t("role.chatter.popular")}
                    </span>
                  )}

                  <div
                    className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl ${
                      role.popular ? "bg-red-600 text-white" : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>

                  <h3 className="mb-2 text-xl font-bold text-gray-900">
                    {t(role.nameKey)}
                  </h3>
                  <p className="mb-6 flex-1 text-sm leading-relaxed text-gray-500">
                    {t(role.descKey)}
                  </p>

                  <ul className="mb-6 space-y-3">
                    <li className="flex items-center gap-2 text-sm text-gray-700">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <span className="font-semibold text-green-700">{role.clientRate}</span>{" "}
                      {t("role.commission.client")}
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-700">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <span className="font-semibold text-green-700">{role.recruitRate}</span>{" "}
                      {t("role.commission.recruit")}
                    </li>
                  </ul>

                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => goToRegister(role.path)}
                    className={`w-full rounded-xl py-3 text-sm font-semibold transition ${
                      role.popular
                        ? "bg-red-600 text-white shadow-md shadow-red-600/20 hover:bg-red-700"
                        : "bg-gray-900 text-white hover:bg-gray-800"
                    }`}
                  >
                    {t("role.cta")} <ArrowRight className="ml-1 inline h-4 w-4" />
                  </motion.button>
                </motion.div>
              );
            })}
          </SectionReveal>
        </div>
      </section>

      {/* ================================================================ */}
      {/* COMMISSION TABLE */}
      {/* ================================================================ */}
      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-4xl px-4">
          <SectionReveal className="text-center">
            <motion.h2
              variants={fadeUp}
              custom={0}
              className="mb-10 text-3xl font-bold text-gray-900 md:text-4xl"
            >
              {t("table.heading")}
            </motion.h2>
          </SectionReveal>

          <SectionReveal>
            <motion.div
              variants={fadeUp}
              custom={1}
              className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm"
            >
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <th className="px-6 py-4">{t("table.action")}</th>
                    {ROLES.map((r) => (
                      <th key={r.key} className="px-4 py-4 text-center">
                        {t(r.nameKey)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-medium text-gray-700">
                      {t("table.client")}
                    </td>
                    {ROLES.map((r) => (
                      <td key={r.key} className="px-4 py-4 text-center font-semibold text-green-700">
                        {r.clientRate}
                        <span className="text-xs font-normal text-gray-400">
                          {t("table.perCall")}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-medium text-gray-700">
                      {t("table.recruit")}
                    </td>
                    {ROLES.map((r) => (
                      <td key={r.key} className="px-4 py-4 text-center font-semibold text-green-700">
                        {r.recruitRate}
                        <span className="text-xs font-normal text-gray-400">
                          {t("table.perCall")}
                        </span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </motion.div>
          </SectionReveal>
        </div>
      </section>

      {/* ================================================================ */}
      {/* HOW TO START (4 STEPS) */}
      {/* ================================================================ */}
      <section className="bg-gray-50 py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-4">
          <SectionReveal className="mb-14 text-center">
            <motion.h2
              variants={fadeUp}
              custom={0}
              className="text-3xl font-bold text-gray-900 md:text-4xl"
            >
              {t("steps.heading")}
            </motion.h2>
          </SectionReveal>

          <SectionReveal className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((n, i) => {
              const StepIcon = STEPS_ICONS[i];
              return (
                <motion.div
                  key={n}
                  variants={fadeUp}
                  custom={i}
                  className="relative rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-red-600 text-white">
                    <StepIcon className="h-5 w-5" />
                  </div>
                  <span className="absolute right-4 top-4 text-5xl font-black text-gray-100">
                    {n}
                  </span>
                  <h3 className="mb-2 text-lg font-bold text-gray-900">
                    {t(`step.${n}.title`)}
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-500">
                    {t(`step.${n}.desc`)}
                  </p>
                </motion.div>
              );
            })}
          </SectionReveal>
        </div>
      </section>

      {/* ================================================================ */}
      {/* TOOLS PROVIDED */}
      {/* ================================================================ */}
      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-4">
          <SectionReveal className="mb-14 text-center">
            <motion.h2
              variants={fadeUp}
              custom={0}
              className="mb-3 text-3xl font-bold text-gray-900 md:text-4xl"
            >
              {t("tools.heading")}
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-lg text-gray-500">
              {t("tools.subheading")}
            </motion.p>
          </SectionReveal>

          <SectionReveal className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {TOOLS_DATA.map((tool, i) => {
              const Icon = tool.icon;
              return (
                <motion.div
                  key={tool.key}
                  variants={fadeUp}
                  custom={i}
                  whileHover={{ y: -4 }}
                  className="flex items-start gap-4 rounded-2xl bg-gray-50 p-5 ring-1 ring-gray-200 transition hover:shadow-md"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-600/10 text-red-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-semibold text-gray-800">
                    {t(tool.key)}
                  </span>
                </motion.div>
              );
            })}
          </SectionReveal>
        </div>
      </section>

      {/* ================================================================ */}
      {/* TOP 3 LEADERBOARD PREVIEW */}
      {/* ================================================================ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0F172A] to-[#1E293B] py-20 md:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(220,38,38,0.12),transparent_60%)]" />
        <div className="relative mx-auto max-w-4xl px-4 text-center">
          <SectionReveal>
            <motion.h2
              variants={fadeUp}
              custom={0}
              className="mb-3 text-3xl font-bold text-white md:text-4xl"
            >
              {t("top3.heading")}
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mb-12 text-lg text-gray-400">
              {t("top3.subheading")}
            </motion.p>
          </SectionReveal>

          <SectionReveal className="flex flex-col items-center justify-center gap-6 md:flex-row md:gap-10">
            {[
              { rank: 2, icon: Medal, size: "h-20 w-20", color: "bg-gray-400" },
              { rank: 1, icon: Trophy, size: "h-28 w-28", color: "bg-yellow-500" },
              { rank: 3, icon: Award, size: "h-20 w-20", color: "bg-amber-700" },
            ].map((p, i) => (
              <motion.div
                key={p.rank}
                variants={fadeUp}
                custom={i}
                className="flex flex-col items-center"
              >
                <div
                  className={`${p.size} mb-3 flex items-center justify-center rounded-full ${p.color} text-white shadow-lg`}
                >
                  <p.icon className="h-8 w-8" />
                </div>
                <span className="text-2xl font-extrabold text-white">#{p.rank}</span>
              </motion.div>
            ))}
          </SectionReveal>

          <SectionReveal>
            <motion.div
              variants={fadeUp}
              custom={0}
              className="mx-auto mt-12 max-w-xl rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
            >
              <h3 className="mb-2 text-lg font-bold text-white">
                {t("top3.cross")}
              </h3>
              <p className="text-sm leading-relaxed text-gray-400">
                {t("top3.desc")}
              </p>
            </motion.div>
          </SectionReveal>
        </div>
      </section>

      {/* ================================================================ */}
      {/* FAQ */}
      {/* ================================================================ */}
      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-4">
          <SectionReveal className="mb-10 text-center">
            <motion.h2
              variants={fadeUp}
              custom={0}
              className="text-3xl font-bold text-gray-900 md:text-4xl"
            >
              {t("faq.heading")}
            </motion.h2>
          </SectionReveal>

          <SectionReveal>
            <motion.div
              variants={fadeUp}
              custom={0}
              className="rounded-2xl border border-gray-200 bg-white px-6 shadow-sm"
            >
              {FAQ_KEYS.map((qKey, i) => {
                const num = qKey.replace("faq.q", "");
                return (
                  <FAQItem
                    key={qKey}
                    question={t(qKey)}
                    answer={t(`faq.a${num}`)}
                    isOpen={openFaq === i}
                    toggle={() => setOpenFaq(openFaq === i ? null : i)}
                  />
                );
              })}
            </motion.div>
          </SectionReveal>
        </div>
      </section>

      {/* ================================================================ */}
      {/* FINAL CTA */}
      {/* ================================================================ */}
      <section className="bg-gray-50 py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <SectionReveal>
            <motion.h2
              variants={fadeUp}
              custom={0}
              className="mb-3 text-3xl font-bold text-gray-900 md:text-4xl"
            >
              {t("cta.heading")}
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mb-10 text-lg text-gray-500">
              {t("cta.subheading")}
            </motion.p>
          </SectionReveal>

          {/* Role selector tabs */}
          <SectionReveal className="mb-8 flex flex-wrap justify-center gap-3">
            {ROLES.map((role, i) => {
              const Icon = role.icon;
              const isActive = selectedRole === role.key;
              return (
                <motion.button
                  key={role.key}
                  variants={fadeUp}
                  custom={i}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setSelectedRole(role.key)}
                  className={`relative flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                    isActive
                      ? "bg-red-600 text-white shadow-md shadow-red-600/20"
                      : "bg-white text-gray-700 ring-1 ring-gray-200 hover:ring-gray-300"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t(role.nameKey)}
                  {isActive && (
                    <motion.span
                      layoutId="active-role-pill"
                      className="absolute inset-0 rounded-full bg-red-600"
                      style={{ zIndex: -1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </SectionReveal>

          <SectionReveal>
            <motion.button
              variants={fadeUp}
              custom={0}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                const role = ROLES.find((r) => r.key === selectedRole);
                if (role) goToRegister(role.path);
              }}
              className="inline-flex items-center gap-2 rounded-full bg-red-600 px-10 py-4 text-base font-bold text-white shadow-lg shadow-red-600/25 transition hover:bg-red-700"
            >
              {t("cta.button")}
              <ArrowRight className="h-5 w-5" />
            </motion.button>
          </SectionReveal>
        </div>
      </section>
    </Layout>
  );
};

export default Affiliation;
