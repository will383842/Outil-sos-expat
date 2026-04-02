/**
 * ProgrammeChatter - Landing Page "Programme Chatter" (Categories)
 *
 * Premium persuasive long-form page for the SOS-Expat Chatter program.
 * Chatters earn money by chatting on social networks and referring clients.
 *
 * Stack: React 18 + TypeScript + Tailwind CSS 3.4 + Framer Motion 11 + Lucide
 */

import React, { useState, useRef, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { motion, useInView, AnimatePresence } from "framer-motion";
import Layout from "@/components/layout/Layout";
import SEOHead from "@/components/layout/SEOHead";
import { parseLocaleFromPath } from "@/multilingual-system";
import { useApp } from "@/contexts/AppContext";
import {
  MessageCircle,
  DollarSign,
  Users,
  Smartphone,
  GraduationCap,
  Share2,
  TrendingUp,
  Gift,
  BarChart3,
  LinkIcon,
  QrCode,
  Send,
  ChevronDown,
  ArrowRight,
  Star,
  Clock,
  Globe,
  Zap,
  Shield,
  CheckCircle2,
} from "lucide-react";

// ============================================================================
// I18N — fr / en
// ============================================================================
const T: Record<string, Record<string, string>> = {
  // SEO
  "seo.title": {
    fr: "Programme Chatter SOS-Expat | Gagnez de l'argent en aidant les expatries",
    en: "SOS-Expat Chatter Program | Earn money helping expats",
  },
  "seo.description": {
    fr: "Devenez Chatter SOS-Expat : gagnez des commissions en referant des clients depuis votre telephone. Inscription gratuite, bonus $50.",
    en: "Become an SOS-Expat Chatter: earn commissions by referring clients from your phone. Free signup, $50 bonus.",
  },

  // Hero
  "hero.title": {
    fr: "Gagnez de l'argent en aidant les expatries",
    en: "Earn money helping expats",
  },
  "hero.subtitle": {
    fr: "Devenez Chatter SOS-Expat et gagnez des commissions depuis votre telephone",
    en: "Become an SOS-Expat Chatter and earn commissions from your phone",
  },
  "hero.cta": {
    fr: "Commencer maintenant",
    en: "Get started now",
  },
  "hero.stat1": { fr: "500+ chatters actifs", en: "500+ active chatters" },
  "hero.stat2": { fr: "$50 bonus inscription", en: "$50 signup bonus" },
  "hero.stat3": { fr: "100% flexible", en: "100% flexible" },

  // How it works
  "how.title": { fr: "Comment ca marche ?", en: "How does it work?" },
  "how.step1.title": { fr: "Inscrivez-vous gratuitement", en: "Sign up for free" },
  "how.step1.desc": {
    fr: "Creez votre compte en 2 minutes. Aucun frais, aucun engagement.",
    en: "Create your account in 2 minutes. No fees, no commitment.",
  },
  "how.step2.title": { fr: "Recevez votre formation", en: "Get your training" },
  "how.step2.desc": {
    fr: "Accedez a notre formation gratuite et rejoignez le groupe Telegram prive.",
    en: "Access our free training and join the private Telegram group.",
  },
  "how.step3.title": { fr: "Partagez sur vos reseaux", en: "Share on your networks" },
  "how.step3.desc": {
    fr: "Utilisez vos liens trackes pour partager SOS-Expat sur WhatsApp, Facebook, Instagram et plus.",
    en: "Use your tracked links to share SOS-Expat on WhatsApp, Facebook, Instagram and more.",
  },
  "how.step4.title": { fr: "Gagnez des commissions", en: "Earn commissions" },
  "how.step4.desc": {
    fr: "Chaque client refere qui effectue un appel vous rapporte une commission. Retirez vos gains a tout moment.",
    en: "Every referred client who makes a call earns you a commission. Withdraw your earnings anytime.",
  },

  // Benefits
  "benefits.title": { fr: "Pourquoi devenir Chatter ?", en: "Why become a Chatter?" },
  "benefit1.title": { fr: "Revenus illimites", en: "Unlimited income" },
  "benefit1.desc": {
    fr: "Pas de plafond. Plus vous partagez, plus vous gagnez. Certains chatters gagnent $5 000+/mois.",
    en: "No cap. The more you share, the more you earn. Some chatters earn $5,000+/month.",
  },
  "benefit2.title": { fr: "100% flexible", en: "100% flexible" },
  "benefit2.desc": {
    fr: "Travaillez quand vous voulez, ou vous voulez. Un telephone suffit.",
    en: "Work when you want, wherever you want. A phone is all you need.",
  },
  "benefit3.title": { fr: "Formation gratuite", en: "Free training" },
  "benefit3.desc": {
    fr: "Guides, scripts et strategies fournis. Vous n'avez pas besoin d'experience.",
    en: "Guides, scripts and strategies provided. No experience needed.",
  },
  "benefit4.title": { fr: "Dashboard personnel", en: "Personal dashboard" },
  "benefit4.desc": {
    fr: "Suivez vos commissions, clics, conversions et retraits en temps reel.",
    en: "Track your commissions, clicks, conversions and withdrawals in real time.",
  },
  "benefit5.title": { fr: "Communaute Telegram", en: "Telegram community" },
  "benefit5.desc": {
    fr: "Rejoignez un groupe prive avec des conseils exclusifs et du support.",
    en: "Join a private group with exclusive tips and support.",
  },
  "benefit6.title": { fr: "Bonus de bienvenue $50", en: "$50 welcome bonus" },
  "benefit6.desc": {
    fr: "Recevez $50 credites dans votre tirelire des votre inscription validee.",
    en: "Get $50 credited to your piggy bank upon validated registration.",
  },

  // Earnings
  "earnings.title": { fr: "Combien pouvez-vous gagner ?", en: "How much can you earn?" },
  "earnings.row1": { fr: "Client refere (appel payant)", en: "Referred client (paid call)" },
  "earnings.row1.amount": { fr: "$5", en: "$5" },
  "earnings.row2": { fr: "Recrutement d'un chatter", en: "Chatter recruitment" },
  "earnings.row2.amount": { fr: "$3", en: "$3" },
  "earnings.row3": { fr: "Top 3 mensuel bonus", en: "Monthly Top 3 bonus" },
  "earnings.row3.amount": { fr: "Jusqu'a $500", en: "Up to $500" },
  "earnings.perAction": { fr: "par action", en: "per action" },
  "earnings.perRecruit": { fr: "par recrue", en: "per recruit" },
  "earnings.monthly": { fr: "chaque mois", en: "every month" },
  "earnings.cta": {
    fr: "Calculez vos gains potentiels",
    en: "Calculate your potential earnings",
  },

  // Testimonials
  "testimonials.title": { fr: "Ils ont change leur quotidien", en: "They changed their daily life" },
  "testimonial1.name": { fr: "Aminata D.", en: "Aminata D." },
  "testimonial1.country": { fr: "Senegal", en: "Senegal" },
  "testimonial1.quote": {
    fr: "En 3 mois, j'ai atteint $1 200/mois. Je partage simplement des liens sur mes groupes WhatsApp.",
    en: "In 3 months, I reached $1,200/month. I simply share links on my WhatsApp groups.",
  },
  "testimonial1.earnings": { fr: "$1 200/mois", en: "$1,200/month" },
  "testimonial2.name": { fr: "Carlos M.", en: "Carlos M." },
  "testimonial2.country": { fr: "Bresil", en: "Brazil" },
  "testimonial2.quote": {
    fr: "Le programme Chatter m'a permis de travailler depuis chez moi tout en aidant ma communaute d'expatries.",
    en: "The Chatter program allowed me to work from home while helping my expat community.",
  },
  "testimonial2.earnings": { fr: "$800/mois", en: "$800/month" },
  "testimonial3.name": { fr: "Fatima K.", en: "Fatima K." },
  "testimonial3.country": { fr: "Maroc", en: "Morocco" },
  "testimonial3.quote": {
    fr: "Le bonus de $50 m'a motivee. Aujourd'hui je recrute aussi d'autres chatters et je gagne encore plus.",
    en: "The $50 bonus motivated me. Today I also recruit other chatters and earn even more.",
  },
  "testimonial3.earnings": { fr: "$2 000/mois", en: "$2,000/month" },

  // Tools
  "tools.title": { fr: "Les outils a votre disposition", en: "Tools at your disposal" },
  "tool1.title": { fr: "Dashboard analytics", en: "Analytics dashboard" },
  "tool1.desc": {
    fr: "Statistiques detaillees de vos performances en temps reel.",
    en: "Detailed real-time performance statistics.",
  },
  "tool2.title": { fr: "Liens trackes UTM", en: "UTM tracked links" },
  "tool2.desc": {
    fr: "Chaque clic est mesure. Vous savez exactement d'ou viennent vos conversions.",
    en: "Every click is measured. You know exactly where your conversions come from.",
  },
  "tool3.title": { fr: "QR Codes personnalises", en: "Custom QR Codes" },
  "tool3.desc": {
    fr: "Generez des QR codes uniques pour vos flyers, stories ou publications.",
    en: "Generate unique QR codes for your flyers, stories or posts.",
  },
  "tool4.title": { fr: "Groupe Telegram prive", en: "Private Telegram group" },
  "tool4.desc": {
    fr: "Support direct, astuces quotidiennes et echanges avec les top chatters.",
    en: "Direct support, daily tips and exchanges with top chatters.",
  },

  // FAQ
  "faq.title": { fr: "Questions frequentes", en: "Frequently asked questions" },
  "faq1.q": { fr: "Est-ce que c'est vraiment gratuit ?", en: "Is it really free?" },
  "faq1.a": {
    fr: "Oui, l'inscription et la formation sont 100% gratuites. Vous ne payez rien pour commencer.",
    en: "Yes, registration and training are 100% free. You pay nothing to start.",
  },
  "faq2.q": {
    fr: "Comment sont calculees les commissions ?",
    en: "How are commissions calculated?",
  },
  "faq2.a": {
    fr: "Vous gagnez $5 par client refere qui effectue un appel payant, et $3 par chatter que vous recrutez. Les bonus Top 3 sont calcules chaque mois.",
    en: "You earn $5 per referred client who makes a paid call, and $3 per chatter you recruit. Top 3 bonuses are calculated monthly.",
  },
  "faq3.q": {
    fr: "Quand puis-je retirer mes gains ?",
    en: "When can I withdraw my earnings?",
  },
  "faq3.a": {
    fr: "Des que votre solde atteint $30, vous pouvez demander un retrait via Stripe, PayPal ou Mobile Money selon votre pays.",
    en: "As soon as your balance reaches $30, you can request a withdrawal via Stripe, PayPal or Mobile Money depending on your country.",
  },
  "faq4.q": {
    fr: "Ai-je besoin d'experience ?",
    en: "Do I need experience?",
  },
  "faq4.a": {
    fr: "Non. Notre formation couvre tout ce dont vous avez besoin. Si vous savez utiliser WhatsApp ou Facebook, vous pouvez etre Chatter.",
    en: "No. Our training covers everything you need. If you know how to use WhatsApp or Facebook, you can be a Chatter.",
  },
  "faq5.q": {
    fr: "Le bonus de $50 est-il reel ?",
    en: "Is the $50 bonus real?",
  },
  "faq5.a": {
    fr: "Oui. Les $50 sont credites dans votre tirelire a l'inscription. Ils sont debloques une fois que vous atteignez $150 de commissions.",
    en: "Yes. The $50 is credited to your piggy bank on signup. It unlocks once you reach $150 in commissions.",
  },
  "faq6.q": {
    fr: "Puis-je cumuler avec un autre emploi ?",
    en: "Can I combine it with another job?",
  },
  "faq6.a": {
    fr: "Absolument. Le programme est 100% flexible. Partagez quand vous voulez, a votre rythme.",
    en: "Absolutely. The program is 100% flexible. Share whenever you want, at your own pace.",
  },

  // Final CTA
  "final.title": {
    fr: "Rejoignez 500+ Chatters actifs",
    en: "Join 500+ active Chatters",
  },
  "final.subtitle": {
    fr: "Commencez a gagner des commissions des aujourd'hui. Inscription en 2 minutes.",
    en: "Start earning commissions today. Sign up in 2 minutes.",
  },
  "final.cta": { fr: "S'inscrire gratuitement", en: "Sign up for free" },
  "final.noCard": {
    fr: "Aucune carte bancaire requise",
    en: "No credit card required",
  },
};

// ============================================================================
// HELPERS
// ============================================================================
function t(key: string, lang: string): string {
  return T[key]?.[lang] || T[key]?.["fr"] || key;
}

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

function SectionWrapper({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  return (
    <motion.section
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={fadeUp}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/** Animated counter from 0 to target */
function AnimatedCounter({ target, prefix = "", suffix = "" }: { target: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let frame: number;
    const duration = 1500;
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [isInView, target]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}{count}{suffix}
    </span>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================
export default function ProgrammeChatter() {
  const location = useLocation();
  const { language } = useApp();
  const lang = (language || parseLocaleFromPath(location.pathname)?.lang || "fr") as string;

  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Registration link (adjust if your route differs)
  const registerLink = lang === "en" ? "/en/chatter/register" : "/fr/chatter/inscription";

  return (
    <Layout>
      <SEOHead
        title={t("seo.title", lang)}
        description={t("seo.description", lang)}
      />

      <div className="programme-chatter overflow-hidden">
        {/* ================================================================
            1. HERO
        ================================================================ */}
        <section className="relative min-h-[90vh] flex items-center bg-gradient-to-br from-slate-900 via-slate-800 to-red-900/50 overflow-hidden">
          {/* Background decorative elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-red-600/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-red-700/10 blur-3xl" />
          </div>

          <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-20 md:py-28 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <span className="inline-block mb-6 px-4 py-1.5 rounded-full bg-red-600/20 border border-red-500/30 text-red-300 text-sm font-medium tracking-wide">
                <Zap className="inline w-4 h-4 mr-1.5 -mt-0.5" />
                {lang === "en" ? "Chatter Program 2026" : "Programme Chatter 2026"}
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6"
            >
              {t("hero.title", lang)}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto mb-10"
            >
              {t("hero.subtitle", lang)}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.4, type: "spring", stiffness: 200 }}
            >
              <Link
                to={registerLink}
                className="inline-flex items-center gap-2 px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold text-lg rounded-xl shadow-lg shadow-red-600/30 hover:shadow-red-600/50 transition-all duration-300 hover:-translate-y-0.5"
              >
                {t("hero.cta", lang)}
                <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>

            {/* Trust stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex flex-wrap justify-center gap-6 sm:gap-10 mt-14"
            >
              {[
                { icon: Users, text: t("hero.stat1", lang) },
                { icon: Gift, text: t("hero.stat2", lang) },
                { icon: Clock, text: t("hero.stat3", lang) },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-slate-300/90 text-sm sm:text-base">
                  <s.icon className="w-5 h-5 text-red-400" />
                  <span>{s.text}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ================================================================
            2. HOW IT WORKS — Vertical timeline
        ================================================================ */}
        <section className="py-20 md:py-28 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <SectionWrapper>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 text-center mb-16">
                {t("how.title", lang)}
              </h2>
            </SectionWrapper>

            <div className="relative">
              {/* Connecting line */}
              <div className="absolute left-6 md:left-8 top-0 bottom-0 w-0.5 bg-red-100" />

              {[
                { icon: Users, titleKey: "how.step1.title", descKey: "how.step1.desc" },
                { icon: GraduationCap, titleKey: "how.step2.title", descKey: "how.step2.desc" },
                { icon: Share2, titleKey: "how.step3.title", descKey: "how.step3.desc" },
                { icon: DollarSign, titleKey: "how.step4.title", descKey: "how.step4.desc" },
              ].map((step, i) => {
                const stepRef = useRef<HTMLDivElement>(null);
                const stepInView = useInView(stepRef, { once: true, margin: "-100px" });
                return (
                  <motion.div
                    ref={stepRef}
                    key={i}
                    initial="hidden"
                    animate={stepInView ? "visible" : "hidden"}
                    variants={{
                      hidden: { opacity: 0, x: -30 },
                      visible: {
                        opacity: 1,
                        x: 0,
                        transition: { duration: 0.5, delay: i * 0.15 },
                      },
                    }}
                    className="relative flex gap-5 md:gap-6 mb-12 last:mb-0"
                  >
                    {/* Number circle */}
                    <div className="relative z-10 flex-shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/30">
                      <step.icon className="w-5 h-5 md:w-6 md:h-6" />
                    </div>

                    <div className="pt-1 md:pt-2">
                      <span className="text-xs font-bold text-red-600 uppercase tracking-widest">
                        {lang === "en" ? `Step ${i + 1}` : `Etape ${i + 1}`}
                      </span>
                      <h3 className="text-xl md:text-2xl font-bold text-slate-900 mt-1">
                        {t(step.titleKey, lang)}
                      </h3>
                      <p className="text-slate-600 mt-2 max-w-lg leading-relaxed">
                        {t(step.descKey, lang)}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ================================================================
            3. BENEFITS GRID
        ================================================================ */}
        <section className="py-20 md:py-28 bg-slate-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <SectionWrapper>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 text-center mb-16">
                {t("benefits.title", lang)}
              </h2>
            </SectionWrapper>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {[
                { icon: TrendingUp, titleKey: "benefit1.title", descKey: "benefit1.desc" },
                { icon: Smartphone, titleKey: "benefit2.title", descKey: "benefit2.desc" },
                { icon: GraduationCap, titleKey: "benefit3.title", descKey: "benefit3.desc" },
                { icon: BarChart3, titleKey: "benefit4.title", descKey: "benefit4.desc" },
                { icon: Send, titleKey: "benefit5.title", descKey: "benefit5.desc" },
                { icon: Gift, titleKey: "benefit6.title", descKey: "benefit6.desc" },
              ].map((b, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  whileHover={{ y: -6, transition: { duration: 0.25 } }}
                  className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm hover:shadow-lg transition-shadow duration-300"
                >
                  <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-5">
                    <b.icon className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">
                    {t(b.titleKey, lang)}
                  </h3>
                  <p className="text-slate-600 leading-relaxed text-sm">
                    {t(b.descKey, lang)}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ================================================================
            4. EARNINGS SECTION
        ================================================================ */}
        <section className="py-20 md:py-28 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <SectionWrapper>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 text-center mb-16">
                {t("earnings.title", lang)}
              </h2>
            </SectionWrapper>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8"
            >
              {[
                {
                  amount: 5,
                  prefix: "$",
                  label: t("earnings.row1", lang),
                  sub: t("earnings.perAction", lang),
                  icon: MessageCircle,
                  color: "red",
                },
                {
                  amount: 3,
                  prefix: "$",
                  label: t("earnings.row2", lang),
                  sub: t("earnings.perRecruit", lang),
                  icon: Users,
                  color: "red",
                },
                {
                  amount: 500,
                  prefix: "$",
                  label: t("earnings.row3", lang),
                  sub: t("earnings.monthly", lang),
                  icon: Star,
                  color: "amber",
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  className="relative bg-slate-50 rounded-2xl border border-slate-200 p-8 text-center hover:border-red-200 transition-colors duration-300"
                >
                  <div className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-4 ${
                    item.color === "amber" ? "bg-amber-50" : "bg-red-50"
                  }`}>
                    <item.icon className={`w-7 h-7 ${
                      item.color === "amber" ? "text-amber-500" : "text-red-600"
                    }`} />
                  </div>
                  <div className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-2">
                    <AnimatedCounter
                      target={item.amount}
                      prefix={item.prefix}
                    />
                  </div>
                  <p className="text-sm font-medium text-red-600 uppercase tracking-wide mb-2">
                    {item.sub}
                  </p>
                  <p className="text-slate-600 text-sm">{item.label}</p>
                </motion.div>
              ))}
            </motion.div>

            <SectionWrapper className="mt-12 text-center">
              <Link
                to={registerLink}
                className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-colors duration-300"
              >
                {t("earnings.cta", lang)}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </SectionWrapper>
          </div>
        </section>

        {/* ================================================================
            5. TESTIMONIALS
        ================================================================ */}
        <section className="py-20 md:py-28 bg-slate-900">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <SectionWrapper>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white text-center mb-16">
                {t("testimonials.title", lang)}
              </h2>
            </SectionWrapper>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8"
            >
              {[1, 2, 3].map((n) => (
                <motion.div
                  key={n}
                  variants={fadeUp}
                  whileHover={{ y: -4, transition: { duration: 0.25 } }}
                  className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 md:p-8"
                >
                  <div className="flex items-center gap-3 mb-5">
                    {/* Avatar placeholder */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white font-bold text-lg">
                      {t(`testimonial${n}.name`, lang).charAt(0)}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">
                        {t(`testimonial${n}.name`, lang)}
                      </p>
                      <p className="text-slate-400 text-xs flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {t(`testimonial${n}.country`, lang)}
                      </p>
                    </div>
                  </div>

                  <p className="text-slate-300 text-sm leading-relaxed mb-5 italic">
                    "{t(`testimonial${n}.quote`, lang)}"
                  </p>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
                    <DollarSign className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-green-400 font-bold text-xs">
                      {t(`testimonial${n}.earnings`, lang)}
                    </span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ================================================================
            6. TOOLS PROVIDED
        ================================================================ */}
        <section className="py-20 md:py-28 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <SectionWrapper>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 text-center mb-16">
                {t("tools.title", lang)}
              </h2>
            </SectionWrapper>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="grid grid-cols-1 sm:grid-cols-2 gap-6"
            >
              {[
                { icon: BarChart3, titleKey: "tool1.title", descKey: "tool1.desc" },
                { icon: LinkIcon, titleKey: "tool2.title", descKey: "tool2.desc" },
                { icon: QrCode, titleKey: "tool3.title", descKey: "tool3.desc" },
                { icon: Send, titleKey: "tool4.title", descKey: "tool4.desc" },
              ].map((tool, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  whileHover={{ y: -4, transition: { duration: 0.25 } }}
                  className="flex gap-5 bg-slate-50 rounded-2xl border border-slate-200 p-6 hover:border-red-200 transition-colors duration-300"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
                    <tool.icon className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 mb-1">
                      {t(tool.titleKey, lang)}
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      {t(tool.descKey, lang)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ================================================================
            7. FAQ ACCORDION
        ================================================================ */}
        <section className="py-20 md:py-28 bg-slate-50">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <SectionWrapper>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 text-center mb-16">
                {t("faq.title", lang)}
              </h2>
            </SectionWrapper>

            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map((n) => {
                const isOpen = openFaq === n;
                return (
                  <motion.div
                    key={n}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.4, delay: n * 0.05 }}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden"
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : n)}
                      className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-slate-50 transition-colors duration-200"
                      aria-expanded={isOpen}
                    >
                      <span className="text-sm sm:text-base font-semibold text-slate-900 pr-4">
                        {t(`faq${n}.q`, lang)}
                      </span>
                      <ChevronDown
                        className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform duration-300 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                          <div className="px-6 pb-5 text-slate-600 text-sm leading-relaxed">
                            {t(`faq${n}.a`, lang)}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ================================================================
            8. FINAL CTA
        ================================================================ */}
        <section className="relative py-20 md:py-28 bg-gradient-to-br from-red-600 via-red-700 to-slate-900 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/5 blur-3xl" />
          </div>

          <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <SectionWrapper>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-6">
                {t("final.title", lang)}
              </h2>
              <p className="text-lg text-red-100/80 mb-10 max-w-xl mx-auto">
                {t("final.subtitle", lang)}
              </p>

              <motion.div
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Link
                  to={registerLink}
                  className="inline-flex items-center gap-2 px-10 py-5 bg-white text-red-700 font-bold text-lg rounded-xl shadow-2xl shadow-black/20 hover:bg-slate-50 transition-colors duration-300"
                >
                  {t("final.cta", lang)}
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </motion.div>

              <p className="mt-6 text-sm text-red-200/60 flex items-center justify-center gap-2">
                <Shield className="w-4 h-4" />
                {t("final.noCard", lang)}
              </p>
            </SectionWrapper>
          </div>
        </section>

        {/* ================================================================
            MOBILE STICKY CTA BAR
        ================================================================ */}
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 safe-area-bottom">
          <Link
            to={registerLink}
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg transition-colors duration-300"
          >
            {t("hero.cta", lang)}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </Layout>
  );
}
