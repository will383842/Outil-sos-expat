/**
 * ChatterLanding - REVOLUTIONARY Mobile-First Landing Page 2026
 *
 * ULTRA IMPACTANTE - CONVERSION MAXIMALE
 *
 * OBJECTIFS:
 * - Comprendre en 3 secondes qu'on peut gagner de l'argent
 * - Visualiser le potentiel de revenus ($10/client + équipe illimitée)
 * - Montrer que c'est SIMPLE et RAPIDE
 * - Mettre en avant le programme de recrutement
 * - Mobile-first d'exception avec animations fluides
 */

import React, { useState, useEffect, useRef } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';
import { useLocaleNavigate } from '@/multilingual-system';
import { getTranslatedRouteSlug, type RouteKey } from '@/multilingual-system/core/routing/localeRoutes';
import { useApp } from '@/contexts/AppContext';
import Layout from '@/components/layout/Layout';
import SEOHead from '@/components/layout/SEOHead';
import HreflangLinks from '@/multilingual-system/components/HrefLang/HreflangLinks';
import FAQPageSchema from '@/components/seo/FAQPageSchema';
import {
  Users,
  CheckCircle,
  ArrowRight,
  Gift,
  TrendingUp,
  Globe,
  ChevronDown,
  DollarSign,
  Clock,
  Smartphone,
  Zap,
  Rocket,
  Sparkles,
  Crown,
  ArrowDown,
  Search,
  Send,
  Wallet,
  Target,
  Coins,
  Star,
  Shield,
  Award,
  Phone,
  Scale,
  HelpCircle,
  GraduationCap,
  Home,
  Briefcase,
  MessageCircle,
  Timer,
  Share2,
  ShieldCheck,
  BadgeCheck,
} from 'lucide-react';

// ============================================================================
// ANIMATED COUNTER COMPONENT
// ============================================================================
const AnimatedCounter: React.FC<{
  end: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}> = ({ end, prefix = '', suffix = '', duration = 2000, className = '' }) => {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * end));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [isVisible, end, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
};

// ============================================================================
// FLOATING MONEY ANIMATION
// ============================================================================
const FloatingMoney: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-float-money text-4xl opacity-20"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${i * 0.5}s`,
            animationDuration: `${3 + Math.random() * 2}s`,
          }}
        >
          💰
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const ChatterLanding: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const location = useLocation();
  const { language } = useApp();
  const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [teamSize, setTeamSize] = useState(10);

  const registerRoute = `/${getTranslatedRouteSlug('chatter-register' as RouteKey, langCode)}`;

  // Scroll detection for sticky CTA
  useEffect(() => {
    const handleScroll = () => {
      setShowStickyBar(window.scrollY > 600);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // SEO
  const seoTitle = intl.formatMessage({
    id: 'chatter.landing.seo.title',
    defaultMessage: 'Become a SOS-Expat Chatter | Earn $10/client + Unlimited Team Income'
  });
  const seoDescription = intl.formatMessage({
    id: 'chatter.landing.seo.description',
    defaultMessage: 'Join the Chatter program: Earn $10 per client, build an unlimited team, get $1 per call from your recruits. Paid via Mobile Money, Wise worldwide.'
  });

  // FAQ
  const faqs = [
    {
      question: intl.formatMessage({ id: 'chatter.faq.q1', defaultMessage: "What exactly do I have to do?" }),
      answer: intl.formatMessage({ id: 'chatter.faq.a1', defaultMessage: "It's simple: find people online who need legal help abroad (Facebook groups, WhatsApp, Reddit), share your link, and earn $10 when they call. That's it!" }),
      icon: <Target className="w-5 h-5" />,
    },
    {
      question: intl.formatMessage({ id: 'chatter.faq.q2', defaultMessage: "How much can I realistically earn?" }),
      answer: intl.formatMessage({ id: 'chatter.faq.a2', defaultMessage: "5 clients = $50. 20 clients = $200. Build a team of 10 chatters earning $200/month each = $100/month passive income for you. No limits!" }),
      icon: <DollarSign className="w-5 h-5" />,
    },
    {
      question: intl.formatMessage({ id: 'chatter.faq.q7', defaultMessage: "How does team building work?" }),
      answer: intl.formatMessage({ id: 'chatter.faq.a7', defaultMessage: "Recruit other chatters with your special link. You earn $1 per call from your direct recruits (N1), and $0.50 per call from their recruits (N2). Your team size is unlimited!" }),
      icon: <Users className="w-5 h-5" />,
    },
    {
      question: intl.formatMessage({ id: 'chatter.faq.quiz', defaultMessage: "Is the quiz hard? Will I fail?" }),
      answer: intl.formatMessage({ id: 'chatter.faq.quiz.answer', defaultMessage: "The quiz is super easy! Just 5 simple questions to make sure you understand how SOS-Expat works. 95% of people pass on the first try. And if you don't, you can retake it immediately. We even give you a short training video to help!" }),
      icon: <GraduationCap className="w-5 h-5" />,
    },
    {
      question: intl.formatMessage({ id: 'chatter.faq.q4', defaultMessage: "Is this really free?" }),
      answer: intl.formatMessage({ id: 'chatter.faq.a4', defaultMessage: "100% free. No fees, no investment. No hidden costs, ever. You just need to pass a quick 5-question quiz (takes 2 minutes) to prove you understand how SOS-Expat works." }),
      icon: <Gift className="w-5 h-5" />,
    },
    {
      question: intl.formatMessage({ id: 'chatter.faq.q5', defaultMessage: "How and when do I get paid?" }),
      answer: intl.formatMessage({ id: 'chatter.faq.a5', defaultMessage: "Withdraw at $25 minimum. We support Wise, Orange Money, Wave, MTN MoMo, M-Pesa, Airtel Money, bank transfers. Processed in 48h." }),
      icon: <Wallet className="w-5 h-5" />,
    },
  ];

  // Calculate team earnings ($1 per call, assume 10 calls/month per chatter)
  const teamEarnings = teamSize * 10;

  return (
    <Layout>
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        ogImage="/og-chatter-2026.jpg"
        ogType="website"
        contentType="LandingPage"
      />
      <HreflangLinks pathname={location.pathname} />
      <FAQPageSchema faqs={faqs.map(f => ({ question: f.question, answer: f.answer }))} pageTitle={seoTitle} />

      {/* Custom Animations */}
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(251, 191, 36, 0.4), 0 0 40px rgba(251, 191, 36, 0.2); }
          50% { box-shadow: 0 0 40px rgba(251, 191, 36, 0.6), 0 0 80px rgba(251, 191, 36, 0.3); }
        }
        @keyframes pulse-glow-orange {
          0%, 100% { box-shadow: 0 0 20px rgba(249, 115, 22, 0.4), 0 0 40px rgba(249, 115, 22, 0.2); }
          50% { box-shadow: 0 0 40px rgba(249, 115, 22, 0.6), 0 0 80px rgba(249, 115, 22, 0.3); }
        }
        @keyframes pulse-glow-gold {
          0%, 100% { box-shadow: 0 0 30px rgba(251, 191, 36, 0.5), 0 0 60px rgba(234, 179, 8, 0.3); }
          50% { box-shadow: 0 0 50px rgba(251, 191, 36, 0.7), 0 0 100px rgba(234, 179, 8, 0.4); }
        }
        .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
        .animate-pulse-glow-orange { animation: pulse-glow-orange 2s ease-in-out infinite; }
        .animate-pulse-glow-gold { animation: pulse-glow-gold 2s ease-in-out infinite; }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(5deg); }
        }
        .animate-float { animation: float 4s ease-in-out infinite; }

        @keyframes float-money {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.2; }
          50% { transform: translateY(-30px) scale(1.1); opacity: 0.4; }
        }
        .animate-float-money { animation: float-money 3s ease-in-out infinite; }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-shimmer {
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }

        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.3s ease-out forwards; }

        @keyframes scale-in {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scale-in { animation: scale-in 0.5s ease-out forwards; }

        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient-shift 3s ease infinite;
        }

        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow { animation: bounce-slow 2s ease-in-out infinite; }

        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
        .animate-pulse-ring::before {
          content: '';
          position: absolute;
          inset: -8px;
          border: 3px solid currentColor;
          border-radius: inherit;
          animation: pulse-ring 1.5s ease-out infinite;
        }

        /* Mobile optimizations */
        @media (max-width: 768px) {
          .hero-title { font-size: 2.5rem !important; line-height: 1.1 !important; }
        }
      `}</style>

      <div className="min-h-screen bg-white dark:bg-gray-950">

        {/* ============================================================== */}
        {/* HERO - ULTRA IMPACTANT - 3 SECONDS TO UNDERSTAND */}
        {/* ============================================================== */}
        <section className="relative min-h-[100svh] flex items-center justify-center overflow-hidden">
          {/* Animated gradient background - PREMIUM PURPLE/GOLD */}
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900 via-purple-800 to-fuchsia-700 animate-gradient" />

          {/* Floating money decorations */}
          <FloatingMoney />

          {/* Glassmorphism overlays - Gold accents */}
          <div className="absolute top-10 -left-20 w-72 h-72 bg-amber-400/20 rounded-full blur-3xl" />
          <div className="absolute bottom-10 -right-20 w-96 h-96 bg-yellow-400/30 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-fuchsia-500/10 rounded-full blur-3xl" />

          <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 text-center text-white">
            {/* Badge - Social proof */}
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/20 backdrop-blur-md rounded-full mb-6 border border-white/30 animate-scale-in">
              <div className="flex -space-x-2">
                {['🇫🇷', '🇺🇸', '🇬🇧', '🇪🇸'].map((flag, i) => (
                  <span key={i} className="text-lg">{flag}</span>
                ))}
              </div>
              <span className="font-bold text-sm">
                <AnimatedCounter end={2847} suffix="+" className="font-black" />
                <FormattedMessage id="chatter.hero.badge" defaultMessage=" Chatters worldwide" />
              </span>
            </div>

            {/* MAIN VALUE PROP - THE MONEY */}
            <div className="mb-6">
              <div className="inline-flex items-center justify-center gap-3 mb-4">
                <div className="w-20 h-20 md:w-28 md:h-28 bg-white rounded-3xl flex items-center justify-center shadow-2xl animate-float">
                  <span className="text-5xl md:text-7xl">💰</span>
                </div>
              </div>

              <h1 className="hero-title text-5xl md:text-7xl lg:text-8xl font-black mb-4 leading-none tracking-tight">
                <span className="block text-yellow-300 drop-shadow-lg">
                  <FormattedMessage id="chatter.hero.earn" defaultMessage="Earn" /> $10
                </span>
                <span className="block text-white text-3xl md:text-5xl lg:text-6xl mt-2 font-bold">
                  <FormattedMessage id="chatter.hero.perClient" defaultMessage="Per Client You Refer" />
                </span>
              </h1>
            </div>

            {/* ULTRA SIMPLE explanation */}
            <div className="bg-white/15 backdrop-blur-xl rounded-3xl p-5 md:p-8 max-w-2xl mx-auto mb-8 border border-white/30">
              <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 text-lg md:text-xl font-bold">
                <div className="flex items-center gap-2">
                  <Search className="w-6 h-6 text-yellow-300" />
                  <span><FormattedMessage id="chatter.hero.step1" defaultMessage="Find" /></span>
                </div>
                <ArrowRight className="w-5 h-5 hidden md:block opacity-60" />
                <ChevronDown className="w-5 h-5 md:hidden opacity-60" />
                <div className="flex items-center gap-2">
                  <Send className="w-6 h-6 text-yellow-300" />
                  <span><FormattedMessage id="chatter.hero.step2" defaultMessage="Share Link" /></span>
                </div>
                <ArrowRight className="w-5 h-5 hidden md:block opacity-60" />
                <ChevronDown className="w-5 h-5 md:hidden opacity-60" />
                <div className="flex items-center gap-2 text-yellow-300">
                  <Coins className="w-6 h-6" />
                  <span><FormattedMessage id="chatter.hero.step3" defaultMessage="Get Paid!" /></span>
                </div>
              </div>
            </div>

            {/* TEAM BUILDING TEASER */}
            <div className="bg-gradient-to-r from-orange-500/30 to-red-500/30 backdrop-blur-md rounded-2xl p-4 max-w-xl mx-auto mb-8 border border-orange-300/30">
              <div className="flex items-center justify-center gap-3">
                <Users className="w-6 h-6 text-orange-300" />
                <p className="text-lg font-bold">
                  <span className="text-orange-300">+ $1</span>
                  <FormattedMessage id="chatter.hero.team.teaser" defaultMessage=" per call from your recruits. Forever. Unlimited team size!" />
                </p>
              </div>
            </div>

            {/* MEGA CTA */}
            <button
              onClick={() => navigate(registerRoute)}
              className="group relative bg-gradient-to-r from-amber-400 to-yellow-500 text-gray-900 font-black px-10 py-6 rounded-2xl text-xl md:text-2xl inline-flex items-center gap-4 hover:from-amber-300 hover:to-yellow-400 transition-all shadow-2xl animate-pulse-glow-gold overflow-hidden"
            >
              <div className="absolute inset-0 animate-shimmer" />
              <Rocket className="w-8 h-8 relative z-10" />
              <span className="relative z-10">
                <FormattedMessage id="chatter.hero.cta" defaultMessage="Start Earning Now" />
              </span>
              <ArrowRight className="w-7 h-7 group-hover:translate-x-2 transition-transform relative z-10" />
            </button>

            {/* Trust badges */}
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              {[
                { icon: <Gift className="w-4 h-4" />, text: intl.formatMessage({ id: 'chatter.hero.trust.free', defaultMessage: '100% Free' }) },
                { icon: <Clock className="w-4 h-4" />, text: intl.formatMessage({ id: 'chatter.hero.trust.time', defaultMessage: 'Start in 5 min' }) },
                { icon: <Globe className="w-4 h-4" />, text: intl.formatMessage({ id: 'chatter.hero.trust.global', defaultMessage: 'Worldwide' }) },
                { icon: <Smartphone className="w-4 h-4" />, text: intl.formatMessage({ id: 'chatter.hero.trust.mobile', defaultMessage: 'Mobile Money' }) },
              ].map((badge, i) => (
                <div key={i} className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-sm font-medium">
                  {badge.icon}
                  <span>{badge.text}</span>
                </div>
              ))}
            </div>

            {/* 🔥 EARLY ADOPTER URGENCY BANNER */}
            <div className="mt-6 bg-gradient-to-r from-red-500/20 via-orange-500/20 to-red-500/20 backdrop-blur-md rounded-2xl p-4 border border-red-400/30 max-w-lg mx-auto animate-pulse">
              <div className="flex items-center justify-center gap-3">
                <Award className="w-6 h-6 text-red-400" />
                <div className="text-center">
                  <p className="font-bold text-red-300">
                    <FormattedMessage id="chatter.hero.earlyAdopter" defaultMessage="🚨 Early Adopter Bonus: +50% lifetime!" />
                  </p>
                  <p className="text-sm text-white/70">
                    <FormattedMessage id="chatter.hero.earlyAdopter.sub" defaultMessage="Only for the first 50 chatters. Limited spots!" />
                  </p>
                </div>
                <Timer className="w-6 h-6 text-red-400" />
              </div>
            </div>

            {/* Scroll indicator */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce-slow">
              <ArrowDown className="w-8 h-8 text-white/60" />
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* WHAT IS SOS-EXPAT - EXPLAIN THE PRODUCT */}
        {/* ============================================================== */}
        <section className="py-12 md:py-16 px-4 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-sm font-bold mb-4">
                <HelpCircle className="w-4 h-4" />
                <FormattedMessage id="chatter.what.badge" defaultMessage="What You'll Promote" />
              </div>
              <h2 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white mb-3">
                <FormattedMessage id="chatter.what.title" defaultMessage="What is SOS-Expat?" />
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                <FormattedMessage id="chatter.what.subtitle" defaultMessage="A premium legal helpline for people living abroad. They call, pay $29, talk to a lawyer. Simple." />
              </p>
            </div>

            {/* Visual explanation */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-3xl p-6 md:p-8 border border-blue-100 dark:border-blue-800">
              <div className="grid md:grid-cols-3 gap-6 text-center">
                {/* Who needs it */}
                <div className="space-y-3">
                  <div className="w-16 h-16 mx-auto bg-blue-500 rounded-2xl flex items-center justify-center">
                    <Globe className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    <FormattedMessage id="chatter.what.who.title" defaultMessage="Who Needs It?" />
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <FormattedMessage id="chatter.what.who.desc" defaultMessage="Expats, immigrants, students abroad, digital nomads - anyone living in a foreign country" />
                  </p>
                </div>

                {/* What problems */}
                <div className="space-y-3">
                  <div className="w-16 h-16 mx-auto bg-purple-500 rounded-2xl flex items-center justify-center">
                    <Scale className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    <FormattedMessage id="chatter.what.problems.title" defaultMessage="Their Problems" />
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <FormattedMessage id="chatter.what.problems.desc" defaultMessage="Visa issues, work permits, rental disputes, taxes, family law, business setup abroad" />
                  </p>
                </div>

                {/* The solution */}
                <div className="space-y-3">
                  <div className="w-16 h-16 mx-auto bg-green-500 rounded-2xl flex items-center justify-center">
                    <Phone className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    <FormattedMessage id="chatter.what.solution.title" defaultMessage="Our Solution" />
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <FormattedMessage id="chatter.what.solution.desc" defaultMessage="30-min call with a specialized lawyer for just $29. Instant booking, no waiting." />
                  </p>
                </div>
              </div>

              {/* Key stat */}
              <div className="mt-8 text-center">
                <div className="inline-flex items-center gap-3 bg-white dark:bg-gray-800 rounded-2xl px-6 py-4 shadow-lg">
                  <div className="text-4xl">🌍</div>
                  <div className="text-left">
                    <div className="text-2xl font-black text-gray-900 dark:text-white">281 million</div>
                    <div className="text-sm text-gray-500">
                      <FormattedMessage id="chatter.what.stat" defaultMessage="people live outside their home country" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Why it's easy to sell */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: '✅', text: intl.formatMessage({ id: 'chatter.what.easy1', defaultMessage: 'Real need, real solution' }) },
                { icon: '💰', text: intl.formatMessage({ id: 'chatter.what.easy2', defaultMessage: 'Affordable $29 price' }) },
                { icon: '⚡', text: intl.formatMessage({ id: 'chatter.what.easy3', defaultMessage: 'Instant booking' }) },
                { icon: '🌐', text: intl.formatMessage({ id: 'chatter.what.easy4', defaultMessage: '15+ languages' }) },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3">
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* INCOME CALCULATOR - VISUAL PROOF */}
        {/* ============================================================== */}
        <section className="py-16 md:py-24 px-4 bg-gradient-to-b from-gray-900 to-black text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-yellow-500 rounded-full blur-3xl" />
          </div>

          <div className="max-w-5xl mx-auto relative z-10">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 text-amber-400 rounded-full text-sm font-bold mb-4">
                <TrendingUp className="w-4 h-4" />
                <FormattedMessage id="chatter.calc.badge" defaultMessage="Your Earning Potential" />
              </div>
              <h2 className="text-3xl md:text-5xl font-black mb-4">
                <FormattedMessage id="chatter.calc.title" defaultMessage="See How Much You Can Make" />
              </h2>
            </div>

            {/* Visual earnings display */}
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              {/* Direct earnings */}
              <div className="bg-gradient-to-br from-amber-600/20 to-yellow-600/20 backdrop-blur-xl rounded-3xl p-8 border border-amber-500/30">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-2xl flex items-center justify-center">
                    <DollarSign className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-amber-400">
                      <FormattedMessage id="chatter.calc.direct" defaultMessage="Your Direct Earnings" />
                    </h3>
                    <p className="text-gray-400 text-sm">
                      <FormattedMessage id="chatter.calc.direct.sub" defaultMessage="$10 per client you refer" />
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    { clients: 5, emoji: '🔥' },
                    { clients: 20, emoji: '💪' },
                    { clients: 50, emoji: '⭐' },
                    { clients: 100, emoji: '🏆' },
                  ].map((tier) => (
                    <div key={tier.clients} className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{tier.emoji}</span>
                        <span className="font-medium">{tier.clients} <FormattedMessage id="chatter.calc.clients" defaultMessage="clients" /></span>
                      </div>
                      <div className="text-2xl font-black text-amber-400">
                        ${tier.clients * 10}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Team earnings */}
              <div className="bg-gradient-to-br from-orange-600/20 to-red-600/20 backdrop-blur-xl rounded-3xl p-8 border border-orange-500/30">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-orange-400">
                      <FormattedMessage id="chatter.calc.team" defaultMessage="+ Team Passive Income" />
                    </h3>
                    <p className="text-gray-400 text-sm">
                      <FormattedMessage id="chatter.calc.team.sub" defaultMessage="$1/call N1, $0.50/call N2" />
                    </p>
                  </div>
                </div>

                {/* Interactive slider */}
                <div className="mb-6">
                  <label className="block text-sm text-gray-400 mb-2">
                    <FormattedMessage id="chatter.calc.team.size" defaultMessage="Your team size" />
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={teamSize}
                    onChange={(e) => setTeamSize(Number(e.target.value))}
                    className="w-full h-3 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-orange-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                  />
                  <div className="flex justify-between text-sm text-gray-500 mt-1">
                    <span>1</span>
                    <span className="text-orange-400 font-bold">{teamSize} <FormattedMessage id="chatter.calc.chatters" defaultMessage="chatters" /></span>
                    <span>50+</span>
                  </div>
                </div>

                {/* Calculation display */}
                <div className="bg-white/5 rounded-2xl p-6 text-center">
                  <p className="text-gray-400 mb-2">
                    <FormattedMessage id="chatter.calc.if" defaultMessage="If each brings 10 calls/month" />
                  </p>
                  <div className="text-4xl md:text-5xl font-black text-orange-400 mb-2">
                    ${teamEarnings.toFixed(0)}<span className="text-2xl text-gray-500">/mo</span>
                  </div>
                  <p className="text-amber-400 font-bold">
                    <FormattedMessage id="chatter.calc.passive" defaultMessage="Passive income for you!" />
                  </p>
                </div>

                <div className="mt-4 text-center text-sm text-gray-500">
                  <FormattedMessage id="chatter.calc.nolimit" defaultMessage="No limit on team size!" />
                </div>
              </div>
            </div>

            {/* Total potential */}
            <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 rounded-3xl p-8 text-center relative overflow-hidden">
              <div className="absolute inset-0 animate-shimmer" />
              <h3 className="text-xl font-bold mb-2 relative z-10 text-gray-900">
                <FormattedMessage id="chatter.calc.total" defaultMessage="Your Total Monthly Potential" />
              </h3>
              <div className="text-5xl md:text-7xl font-black mb-2 relative z-10 text-gray-900">
                $<AnimatedCounter end={500 + teamEarnings} />+
              </div>
              <p className="text-gray-800 relative z-10">
                <FormattedMessage id="chatter.calc.combining" defaultMessage="Combining direct clients + team earnings" />
              </p>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 3 STEPS - ULTRA VISUAL */}
        {/* ============================================================== */}
        <section className="py-16 md:py-24 px-4 bg-white dark:bg-gray-950">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-sm font-bold mb-4">
                <Zap className="w-4 h-4" />
                <FormattedMessage id="chatter.steps.badge" defaultMessage="It's Super Easy" />
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white mb-4">
                <FormattedMessage id="chatter.steps.title" defaultMessage="3 Simple Steps" />
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                <FormattedMessage id="chatter.steps.subtitle" defaultMessage="No expertise needed. Anyone can do this." />
              </p>
            </div>

            {/* Steps - Horizontal on desktop, vertical on mobile */}
            <div className="relative">
              {/* Connection line */}
              <div className="hidden md:block absolute top-24 left-[16%] right-[16%] h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 rounded-full" />

              <div className="grid md:grid-cols-3 gap-8">
                {/* Step 1 */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-3xl blur opacity-25 group-hover:opacity-50 transition-opacity" />
                  <div className="relative bg-white dark:bg-gray-900 rounded-3xl p-8 border border-gray-100 dark:border-gray-800 h-full">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl mb-6 mx-auto shadow-lg">
                      1
                    </div>
                    <div className="text-6xl text-center mb-4">🔍</div>
                    <h3 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-3">
                      <FormattedMessage id="chatter.step1.title" defaultMessage="FIND" />
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-center">
                      <FormattedMessage id="chatter.step1.desc" defaultMessage="Find people online who need help abroad" />
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 mt-4">
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold">Facebook</span>
                      <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full text-xs font-bold">WhatsApp</span>
                      <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full text-xs font-bold">Reddit</span>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl blur opacity-25 group-hover:opacity-50 transition-opacity" />
                  <div className="relative bg-white dark:bg-gray-900 rounded-3xl p-8 border border-gray-100 dark:border-gray-800 h-full">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl mb-6 mx-auto shadow-lg">
                      2
                    </div>
                    <div className="text-6xl text-center mb-4">📤</div>
                    <h3 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-3">
                      <FormattedMessage id="chatter.step2.title" defaultMessage="SHARE" />
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-center">
                      <FormattedMessage id="chatter.step2.desc" defaultMessage="Share your unique affiliate link" />
                    </p>
                    <div className="mt-4 bg-gray-100 dark:bg-gray-800 rounded-xl p-3 text-center">
                      <code className="text-sm text-purple-600 dark:text-purple-400">sos-expat.com/r/YOU</code>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-3xl blur opacity-25 group-hover:opacity-50 transition-opacity" />
                  <div className="relative bg-white dark:bg-gray-900 rounded-3xl p-8 border border-gray-100 dark:border-gray-800 h-full">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl mb-6 mx-auto shadow-lg">
                      3
                    </div>
                    <div className="text-6xl text-center mb-4">💵</div>
                    <h3 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-3">
                      <FormattedMessage id="chatter.step3.title" defaultMessage="EARN $10" />
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-center">
                      <FormattedMessage id="chatter.step3.desc" defaultMessage="They call, you get paid instantly" />
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-2 text-green-600 dark:text-green-400 font-bold">
                      <CheckCircle className="w-5 h-5" />
                      <FormattedMessage id="chatter.step3.note" defaultMessage="No limit!" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* WHO CAN BECOME A CHATTER - TARGET AUDIENCE */}
        {/* ============================================================== */}
        <section className="py-12 md:py-16 px-4 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full text-sm font-bold mb-4">
                <Users className="w-4 h-4" />
                <FormattedMessage id="chatter.who.badge" defaultMessage="Is This For You?" />
              </div>
              <h2 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white mb-3">
                <FormattedMessage id="chatter.who.title" defaultMessage="Who Can Become a Chatter?" />
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                <FormattedMessage id="chatter.who.subtitle" defaultMessage="If you have a phone and social media, you're qualified!" />
              </p>
            </div>

            {/* Target profiles */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { icon: <GraduationCap className="w-7 h-7" />, title: intl.formatMessage({ id: 'chatter.who.student', defaultMessage: 'Students' }), desc: intl.formatMessage({ id: 'chatter.who.student.desc', defaultMessage: 'Earn between classes' }), color: 'from-blue-500 to-indigo-500' },
                { icon: <Home className="w-7 h-7" />, title: intl.formatMessage({ id: 'chatter.who.parent', defaultMessage: 'Stay-at-home Parents' }), desc: intl.formatMessage({ id: 'chatter.who.parent.desc', defaultMessage: 'Work from home' }), color: 'from-pink-500 to-rose-500' },
                { icon: <Briefcase className="w-7 h-7" />, title: intl.formatMessage({ id: 'chatter.who.sidehustle', defaultMessage: 'Side Hustlers' }), desc: intl.formatMessage({ id: 'chatter.who.sidehustle.desc', defaultMessage: 'Extra income stream' }), color: 'from-green-500 to-emerald-500' },
                { icon: <MessageCircle className="w-7 h-7" />, title: intl.formatMessage({ id: 'chatter.who.influencer', defaultMessage: 'Social Media Users' }), desc: intl.formatMessage({ id: 'chatter.who.influencer.desc', defaultMessage: 'Monetize your network' }), color: 'from-purple-500 to-violet-500' },
              ].map((profile, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all">
                  <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${profile.color} flex items-center justify-center text-white`}>
                    {profile.icon}
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-center mb-1">{profile.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center">{profile.desc}</p>
                </div>
              ))}
            </div>

            {/* Requirements - Super simple */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-6 border border-green-200 dark:border-green-800">
              <h3 className="font-bold text-center text-gray-900 dark:text-white mb-4">
                <FormattedMessage id="chatter.who.requirements" defaultMessage="All You Need:" />
              </h3>
              <div className="flex flex-wrap justify-center gap-4">
                {[
                  { icon: '📱', text: intl.formatMessage({ id: 'chatter.who.req1', defaultMessage: 'A smartphone' }) },
                  { icon: '🌐', text: intl.formatMessage({ id: 'chatter.who.req2', defaultMessage: 'Internet access' }) },
                  { icon: '👥', text: intl.formatMessage({ id: 'chatter.who.req3', defaultMessage: 'Social media accounts' }) },
                  { icon: '⏰', text: intl.formatMessage({ id: 'chatter.who.req4', defaultMessage: '30 min/day' }) },
                ].map((req, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-full px-5 py-2 shadow-sm">
                    <span className="text-xl">{req.icon}</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">{req.text}</span>
                  </div>
                ))}
              </div>
              <p className="text-center text-sm text-green-700 dark:text-green-400 font-medium mt-4">
                <FormattedMessage id="chatter.who.noexp" defaultMessage="No experience needed. No investment required. We train you!" />
              </p>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* WHAT YOU GET - TOOLS & RESOURCES */}
        {/* ============================================================== */}
        <section className="py-12 md:py-16 px-4 bg-white dark:bg-gray-950">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full text-sm font-bold mb-4">
                <Gift className="w-4 h-4" />
                <FormattedMessage id="chatter.tools.badge" defaultMessage="Everything Included" />
              </div>
              <h2 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white mb-3">
                <FormattedMessage id="chatter.tools.title" defaultMessage="What You Get (100% Free)" />
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Tool 1: Personal Links */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
                <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center mb-4">
                  <Share2 className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                  <FormattedMessage id="chatter.tools.links.title" defaultMessage="2 Personal Links" />
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  <FormattedMessage id="chatter.tools.links.desc" defaultMessage="One for finding clients, one for recruiting chatters. Track every conversion." />
                </p>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-2 text-xs font-mono text-blue-600 dark:text-blue-400">
                  sos-expat.com/r/<span className="text-amber-500">YOUR_CODE</span>
                </div>
              </div>

              {/* Tool 2: Dashboard */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-6 border border-purple-200 dark:border-purple-800">
                <div className="w-14 h-14 bg-purple-500 rounded-2xl flex items-center justify-center mb-4">
                  <TrendingUp className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                  <FormattedMessage id="chatter.tools.dashboard.title" defaultMessage="Pro Dashboard" />
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  <FormattedMessage id="chatter.tools.dashboard.desc" defaultMessage="Real-time earnings, team stats, leaderboard, withdrawal requests. All on mobile." />
                </p>
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-purple-100 dark:bg-purple-800 text-purple-600 dark:text-purple-300 rounded text-xs">Live stats</span>
                  <span className="px-2 py-1 bg-purple-100 dark:bg-purple-800 text-purple-600 dark:text-purple-300 rounded text-xs">Mobile-first</span>
                </div>
              </div>

              {/* Tool 3: Training */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-6 border border-green-200 dark:border-green-800">
                <div className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center mb-4">
                  <GraduationCap className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                  <FormattedMessage id="chatter.tools.training.title" defaultMessage="Free Training" />
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  <FormattedMessage id="chatter.tools.training.desc" defaultMessage="Video tutorials, best practices, message templates. Learn the winning strategies." />
                </p>
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-300 rounded text-xs">Videos</span>
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-300 rounded text-xs">Templates</span>
                </div>
              </div>

              {/* Tool 4: Support */}
              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-2xl p-6 border border-amber-200 dark:border-amber-800">
                <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center mb-4">
                  <MessageCircle className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                  <FormattedMessage id="chatter.tools.support.title" defaultMessage="WhatsApp Support" />
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <FormattedMessage id="chatter.tools.support.desc" defaultMessage="Direct access to our team. Questions answered within hours, not days." />
                </p>
              </div>

              {/* Tool 5: Community */}
              <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-2xl p-6 border border-red-200 dark:border-red-800">
                <div className="w-14 h-14 bg-red-500 rounded-2xl flex items-center justify-center mb-4">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                  <FormattedMessage id="chatter.tools.community.title" defaultMessage="Chatter Community" />
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <FormattedMessage id="chatter.tools.community.desc" defaultMessage="Private group to share tips, celebrate wins, and learn from top earners." />
                </p>
              </div>

              {/* Tool 6: Marketing Materials */}
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-2xl p-6 border border-cyan-200 dark:border-cyan-800">
                <div className="w-14 h-14 bg-cyan-500 rounded-2xl flex items-center justify-center mb-4">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                  <FormattedMessage id="chatter.tools.materials.title" defaultMessage="Ready-to-Use Content" />
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <FormattedMessage id="chatter.tools.materials.desc" defaultMessage="Copy-paste messages, images, and posts optimized for conversion." />
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* TEAM BUILDING - THE MULTIPLIER */}
        {/* ============================================================== */}
        <section className="py-16 md:py-24 px-4 bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 text-white relative overflow-hidden">
          {/* Background decorations */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-20 -left-20 w-72 h-72 bg-yellow-400/20 rounded-full blur-3xl" />
            <div className="absolute bottom-20 -right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          </div>

          <div className="max-w-5xl mx-auto relative z-10">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-bold mb-4">
                <Crown className="w-4 h-4" />
                <FormattedMessage id="chatter.team.badge" defaultMessage="10X Your Income" />
              </div>
              <h2 className="text-3xl md:text-5xl font-black mb-4">
                <FormattedMessage id="chatter.team.title" defaultMessage="Build a Team, Earn Forever" />
              </h2>
              <p className="text-xl text-white/90 max-w-2xl mx-auto">
                <FormattedMessage id="chatter.team.subtitle" defaultMessage="Recruit other chatters. Get $1 per call from N1, $0.50 from N2. Forever. No limits." />
              </p>
            </div>

            {/* Visual network */}
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 md:p-12 border border-white/20 max-w-3xl mx-auto mb-10">
              {/* You at the top */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl">
                    <Crown className="w-12 h-12 text-orange-500" />
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-orange-500 rounded-full text-xs font-bold whitespace-nowrap">
                    <FormattedMessage id="chatter.team.you" defaultMessage="YOU" />
                  </div>
                </div>

                {/* Connection lines */}
                <div className="w-0.5 h-8 bg-white/30 mt-4" />
                <div className="w-48 h-0.5 bg-white/30" />
                <div className="flex justify-between w-48">
                  <div className="w-0.5 h-8 bg-white/30" />
                  <div className="w-0.5 h-8 bg-white/30" />
                  <div className="w-0.5 h-8 bg-white/30" />
                </div>

                {/* Team Level 1 */}
                <div className="flex justify-center gap-8 md:gap-16 mb-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                        <Users className="w-8 h-8" />
                      </div>
                      <span className="mt-2 text-sm font-medium opacity-80">
                        <FormattedMessage id="chatter.team.chatter" defaultMessage="Chatter" />
                      </span>
                      <span className="text-green-300 font-bold">+$1/call</span>
                    </div>
                  ))}
                </div>

                {/* N1 Label */}
                <div className="flex items-center justify-center gap-2 mb-4 -mt-2">
                  <div className="h-px w-12 bg-white/30" />
                  <span className="px-3 py-1 bg-green-500/30 rounded-full text-xs font-bold text-green-300">
                    N1 = $1/call
                  </span>
                  <div className="h-px w-12 bg-white/30" />
                </div>

                {/* Connection to N2 */}
                <div className="flex justify-center gap-8 md:gap-16 mb-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-0.5 h-6 bg-white/20" />
                  ))}
                </div>

                {/* Team Level 2 (N2) */}
                <div className="flex justify-center gap-4 md:gap-8 flex-wrap mb-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 opacity-60" />
                      </div>
                    </div>
                  ))}
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center font-bold">
                      +∞
                    </div>
                  </div>
                </div>

                {/* N2 Label */}
                <div className="flex items-center justify-center gap-2">
                  <div className="h-px w-12 bg-white/30" />
                  <span className="px-3 py-1 bg-cyan-500/30 rounded-full text-xs font-bold text-cyan-300">
                    N2 = $0.50/call
                  </span>
                  <div className="h-px w-12 bg-white/30" />
                </div>
              </div>

              {/* Example calculation */}
              <div className="mt-10 bg-white/10 rounded-2xl p-6">
                <p className="font-semibold mb-4 text-center">
                  <FormattedMessage id="chatter.team.example.title" defaultMessage="Example Monthly Earnings:" />
                </p>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-green-500/20 rounded-xl p-4 text-center">
                    <div className="text-sm text-green-300 mb-1">N1: 20 chatters × 15 calls</div>
                    <div className="text-2xl font-black text-green-300">= $300</div>
                  </div>
                  <div className="bg-cyan-500/20 rounded-xl p-4 text-center">
                    <div className="text-sm text-cyan-300 mb-1">N2: 40 chatters × 10 calls</div>
                    <div className="text-2xl font-black text-cyan-300">= $200</div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-yellow-500/30 to-amber-500/30 rounded-xl p-4 text-center border border-yellow-400/30">
                  <div className="text-sm text-yellow-300 mb-1">
                    <FormattedMessage id="chatter.team.total" defaultMessage="Your Total Passive Income" />
                  </div>
                  <div className="text-4xl md:text-5xl font-black text-yellow-300">
                    $500<span className="text-xl text-white/60">/mo</span>
                  </div>
                </div>
              </div>
            </div>

            {/* TIER BONUSES - Show the escalation */}
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 md:p-8 max-w-3xl mx-auto mb-10 border border-white/20">
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-400/20 rounded-full mb-3">
                  <Crown className="w-4 h-4 text-yellow-300" />
                  <span className="text-sm font-bold text-yellow-300">
                    <FormattedMessage id="chatter.tiers.badge" defaultMessage="Recruitment Bonuses" />
                  </span>
                </div>
                <h3 className="text-xl md:text-2xl font-bold">
                  <FormattedMessage id="chatter.tiers.title" defaultMessage="Earn Bonus for Every Milestone!" />
                </h3>
              </div>

              <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
                {[
                  { recruits: 5, bonus: 15 },
                  { recruits: 10, bonus: 35 },
                  { recruits: 20, bonus: 75 },
                  { recruits: 50, bonus: 250 },
                  { recruits: 100, bonus: 600 },
                  { recruits: 500, bonus: 4000 },
                ].map((tier, i) => (
                  <div
                    key={i}
                    className={`text-center p-3 rounded-xl ${
                      tier.bonus >= 250
                        ? 'bg-gradient-to-br from-yellow-400/30 to-amber-500/30 border border-yellow-400/40'
                        : 'bg-white/5'
                    }`}
                  >
                    <div className="text-2xl mb-1">{tier.bonus >= 600 ? '🏆' : tier.bonus >= 250 ? '⭐' : '🎯'}</div>
                    <div className="font-bold text-yellow-300">${tier.bonus.toLocaleString()}</div>
                    <div className="text-xs text-white/60">{tier.recruits} <FormattedMessage id="chatter.tiers.recruits" defaultMessage="recruits" /></div>
                  </div>
                ))}
              </div>

              <p className="text-center text-sm text-white/60 mt-4">
                <FormattedMessage id="chatter.tiers.note" defaultMessage="One-time bonuses paid when you hit each milestone" />
              </p>
            </div>

            {/* Key benefits */}
            <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-10">
              {[
                { icon: '♾️', title: intl.formatMessage({ id: 'chatter.team.benefit1.title', defaultMessage: 'Unlimited Team' }), desc: intl.formatMessage({ id: 'chatter.team.benefit1.desc', defaultMessage: 'No cap on how many you recruit' }) },
                { icon: '🔄', title: intl.formatMessage({ id: 'chatter.team.benefit2.title', defaultMessage: 'Forever Earnings' }), desc: intl.formatMessage({ id: 'chatter.team.benefit2.desc', defaultMessage: '$1/call N1, $0.50/call N2' }) },
                { icon: '🚀', title: intl.formatMessage({ id: 'chatter.team.benefit3.title', defaultMessage: 'Stack Income' }), desc: intl.formatMessage({ id: 'chatter.team.benefit3.desc', defaultMessage: 'Your clients + their clients' }) },
              ].map((benefit, i) => (
                <div key={i} className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 text-center border border-white/10">
                  <div className="text-4xl mb-3">{benefit.icon}</div>
                  <h4 className="font-bold mb-1">{benefit.title}</h4>
                  <p className="text-sm text-white/70">{benefit.desc}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="text-center">
              <button
                onClick={() => navigate(registerRoute)}
                className="group bg-white text-orange-600 font-black px-10 py-5 rounded-2xl text-xl inline-flex items-center gap-4 hover:bg-gray-100 transition-all shadow-2xl animate-pulse-glow-orange"
              >
                <Rocket className="w-7 h-7" />
                <FormattedMessage id="chatter.team.cta" defaultMessage="Start Building Your Empire" />
                <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
              </button>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* WHERE TO FIND CLIENTS - VISUAL */}
        {/* ============================================================== */}
        <section className="py-16 md:py-20 px-4 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white mb-4">
                <FormattedMessage id="chatter.where.title" defaultMessage="Where to Find People?" />
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                <FormattedMessage id="chatter.where.subtitle" defaultMessage="You're already on these platforms!" />
              </p>
            </div>

            {/* Facebook Groups - Hero platform */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-6 md:p-8 text-white mb-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative z-10">
                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                    <span className="text-4xl">👥</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-2xl md:text-3xl font-black">
                        <FormattedMessage id="chatter.fbgroups.title" defaultMessage="Facebook Groups" />
                      </h3>
                      <span className="px-3 py-1 bg-yellow-400 text-yellow-900 rounded-full text-xs font-bold">
                        #1
                      </span>
                    </div>
                    <p className="text-white/80">
                      <FormattedMessage id="chatter.fbgroups.desc" defaultMessage="Millions of expats looking for help every day" />
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    intl.formatMessage({ id: 'chatter.fbgroups.ex1', defaultMessage: '"Expats in Dubai"' }),
                    intl.formatMessage({ id: 'chatter.fbgroups.ex2', defaultMessage: '"French in London"' }),
                    intl.formatMessage({ id: 'chatter.fbgroups.ex3', defaultMessage: '"Americans Abroad"' }),
                    intl.formatMessage({ id: 'chatter.fbgroups.ex4', defaultMessage: '"Digital Nomads"' }),
                  ].map((group, i) => (
                    <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 text-center text-sm font-medium">
                      {group}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Other platforms grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { name: 'WhatsApp', icon: '💬', color: 'from-green-500 to-emerald-500' },
                { name: 'Reddit', icon: '🔴', color: 'from-orange-500 to-red-500' },
                { name: 'Telegram', icon: '✈️', color: 'from-blue-400 to-cyan-500' },
                { name: 'Quora', icon: '❓', color: 'from-red-500 to-rose-500' },
                { name: intl.formatMessage({ id: 'chatter.platform.forums.name', defaultMessage: 'Forums' }), icon: '🌐', color: 'from-purple-500 to-pink-500' },
              ].map((platform, i) => (
                <div
                  key={i}
                  className="group bg-white dark:bg-gray-800 rounded-2xl p-5 text-center border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer"
                >
                  <div className={`w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br ${platform.color} flex items-center justify-center`}>
                    <span className="text-2xl">{platform.icon}</span>
                  </div>
                  <div className="font-bold text-gray-900 dark:text-white">{platform.name}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* SOCIAL PROOF - TESTIMONIALS & LIVE ACTIVITY */}
        {/* ============================================================== */}
        <section className="py-16 md:py-20 px-4 bg-white dark:bg-gray-950">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full text-sm font-bold mb-4">
                <Sparkles className="w-4 h-4" />
                <FormattedMessage id="chatter.social.badge" defaultMessage="Real Success Stories" />
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white">
                <FormattedMessage id="chatter.social.title" defaultMessage="Chatters Are Earning Every Day" />
              </h2>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-4 mb-10">
              {[
                { value: <AnimatedCounter end={2847} />, label: intl.formatMessage({ id: 'chatter.stats.chatters', defaultMessage: 'Active Chatters' }), icon: '👥' },
                { value: <><AnimatedCounter end={156} prefix="$" />K</>, label: intl.formatMessage({ id: 'chatter.stats.paid', defaultMessage: 'Paid This Month' }), icon: '💰' },
                { value: <AnimatedCounter end={47} />, label: intl.formatMessage({ id: 'chatter.stats.countries', defaultMessage: 'Countries' }), icon: '🌍' },
              ].map((stat, i) => (
                <div key={i} className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-4 md:p-6 text-center">
                  <div className="text-2xl mb-2">{stat.icon}</div>
                  <div className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">
                    {stat.value}
                  </div>
                  <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Testimonials - More credible with specific details */}
            <div className="grid md:grid-cols-3 gap-6 mb-10">
              {[
                {
                  name: 'Amadou Diallo',
                  location: '🇸🇳 Dakar, Sénégal',
                  amount: '$430',
                  period: intl.formatMessage({ id: 'chatter.testimonial.period', defaultMessage: 'this month' }),
                  quote: intl.formatMessage({ id: 'chatter.testimonial.1', defaultMessage: "I post in 3 Facebook groups every morning before work. 45 min/day, 43 clients this month. The visa questions are endless!" }),
                  avatar: '👨🏿‍💼',
                  stats: intl.formatMessage({ id: 'chatter.testimonial.1.stats', defaultMessage: '43 clients • 45min/day' }),
                  verified: true,
                },
                {
                  name: 'Marie Lefebvre',
                  location: '🇫🇷 Lyon, France',
                  amount: '$1,200',
                  period: intl.formatMessage({ id: 'chatter.testimonial.period', defaultMessage: 'this month' }),
                  quote: intl.formatMessage({ id: 'chatter.testimonial.2', defaultMessage: "Started 4 months ago. Now I have 18 chatters in my team. $320 from my clients + $880 from team commissions. This changed my life!" }),
                  avatar: '👩🏼‍💻',
                  stats: intl.formatMessage({ id: 'chatter.testimonial.2.stats', defaultMessage: '18 team members • 4 months' }),
                  highlight: true,
                  verified: true,
                },
                {
                  name: 'John Kamau',
                  location: '🇰🇪 Nairobi, Kenya',
                  amount: '$280',
                  period: intl.formatMessage({ id: 'chatter.testimonial.period', defaultMessage: 'this month' }),
                  quote: intl.formatMessage({ id: 'chatter.testimonial.3', defaultMessage: "Withdrew $250 via M-Pesa last Tuesday, received in 18 hours. Now I target Kenyans in UAE and Saudi Arabia. Huge demand!" }),
                  avatar: '👨🏾‍🦱',
                  stats: intl.formatMessage({ id: 'chatter.testimonial.3.stats', defaultMessage: '28 clients • M-Pesa verified' }),
                  verified: true,
                },
              ].map((testimonial, i) => (
                <div
                  key={i}
                  className={`relative rounded-2xl p-6 ${
                    testimonial.highlight
                      ? 'bg-gradient-to-br from-violet-600 to-purple-700 text-white'
                      : 'bg-gray-50 dark:bg-gray-800'
                  }`}
                >
                  {testimonial.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-400 text-gray-900 rounded-full text-xs font-bold">
                      TOP EARNER
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className={`font-bold flex items-center gap-1 ${testimonial.highlight ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                        {testimonial.name}
                        {testimonial.verified && <CheckCircle className="w-4 h-4 text-blue-400" />}
                      </div>
                      <div className={`text-sm ${testimonial.highlight ? 'text-white/80' : 'text-gray-500'}`}>
                        {testimonial.location}
                      </div>
                    </div>
                  </div>
                  <p className={`mb-3 text-sm ${testimonial.highlight ? 'text-white/90' : 'text-gray-600 dark:text-gray-300'}`}>
                    "{testimonial.quote}"
                  </p>
                  <div className={`text-xs mb-3 px-2 py-1 rounded-full inline-block ${testimonial.highlight ? 'bg-white/20 text-white/80' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                    {testimonial.stats}
                  </div>
                  <div className={`text-2xl font-black ${testimonial.highlight ? 'text-amber-300' : 'text-amber-600 dark:text-amber-400'}`}>
                    {testimonial.amount} <span className={`text-sm font-normal ${testimonial.highlight ? 'text-white/70' : 'text-gray-500'}`}>{testimonial.period}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Live activity feed */}
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-2xl p-4 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse" />
                <span className="text-sm font-bold text-amber-700 dark:text-amber-400">
                  <FormattedMessage id="chatter.live.title" defaultMessage="Live Activity" />
                </span>
              </div>
              <div className="space-y-2 text-sm">
                {[
                  { name: 'Sarah M.', action: intl.formatMessage({ id: 'chatter.live.earned', defaultMessage: 'just earned' }), amount: '$10', flag: '🇬🇧' },
                  { name: 'Kofi A.', action: intl.formatMessage({ id: 'chatter.live.earned', defaultMessage: 'just earned' }), amount: '$10', flag: '🇬🇭' },
                  { name: 'Pierre D.', action: intl.formatMessage({ id: 'chatter.live.teambonus', defaultMessage: 'received team bonus' }), amount: '$25', flag: '🇫🇷' },
                ].map((activity, i) => (
                  <div key={i} className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <span>{activity.flag}</span>
                    <span className="font-medium">{activity.name}</span>
                    <span className="text-gray-400">{activity.action}</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">{activity.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* PAYMENT METHODS */}
        {/* ============================================================== */}
        <section className="py-12 md:py-16 px-4 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h3 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white mb-2">
                <FormattedMessage id="chatter.payment.title" defaultMessage="Get Paid Your Way" />
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                <FormattedMessage id="chatter.payment.subtitle" defaultMessage="Withdraw anywhere in the world" />
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-4 mb-6">
              {[
                { name: 'Wise', icon: '🌐', desc: 'Global' },
                { name: 'Orange Money', icon: '🟠', desc: 'Africa' },
                { name: 'Wave', icon: '🌊', desc: 'Africa' },
                { name: 'MTN MoMo', icon: '💛', desc: 'Africa' },
                { name: 'M-Pesa', icon: '💚', desc: 'Africa' },
                { name: 'Bank', icon: '🏦', desc: 'Global' },
              ].map((method, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 bg-gray-100 dark:bg-gray-800 rounded-2xl px-5 py-3 hover:shadow-lg transition-shadow"
                >
                  <span className="text-2xl">{method.icon}</span>
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white">{method.name}</div>
                    <div className="text-xs text-gray-500">{method.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-amber-500" />
                <FormattedMessage id="chatter.payment.min" defaultMessage="$25 minimum" />
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <FormattedMessage id="chatter.payment.time" defaultMessage="48h processing" />
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* FAQ - MODERN ACCORDION */}
        {/* ============================================================== */}
        <section className="py-16 md:py-24 px-4 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white mb-2">
                <FormattedMessage id="chatter.faq.title" defaultMessage="Questions?" />
              </h2>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full flex items-center gap-4 p-5 text-left"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 rounded-xl flex items-center justify-center text-violet-600 dark:text-violet-400 flex-shrink-0">
                      {faq.icon}
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white flex-1 pr-4">
                      {faq.question}
                    </h3>
                    <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform flex-shrink-0 ${openFaq === idx ? 'rotate-180' : ''}`} />
                  </button>
                  {openFaq === idx && (
                    <div className="px-5 pb-5 pl-[4.5rem] text-gray-600 dark:text-gray-300 animate-slide-up">
                      <p>{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* ZERO RISK - NOTHING TO LOSE */}
        {/* ============================================================== */}
        <section className="py-12 md:py-16 px-4 bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 dark:from-green-900/20 dark:via-emerald-900/20 dark:to-teal-900/20">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 md:p-12 shadow-xl border border-green-200 dark:border-green-800">
              <div className="text-center mb-8">
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mb-4">
                  <ShieldCheck className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white mb-3">
                  <FormattedMessage id="chatter.risk.title" defaultMessage="Zero Risk. Nothing to Lose." />
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-400">
                  <FormattedMessage id="chatter.risk.subtitle" defaultMessage="We take all the risk. You keep all the rewards." />
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {[
                  { icon: '💸', title: intl.formatMessage({ id: 'chatter.risk.free', defaultMessage: '100% Free Forever' }), desc: intl.formatMessage({ id: 'chatter.risk.free.desc', defaultMessage: 'No subscription, no hidden fees, no credit card needed. Ever.' }) },
                  { icon: '🚫', title: intl.formatMessage({ id: 'chatter.risk.noquota', defaultMessage: 'No Quotas' }), desc: intl.formatMessage({ id: 'chatter.risk.noquota.desc', defaultMessage: 'No minimum to earn. Get 1 client = get $10. Simple.' }) },
                  { icon: '⏰', title: intl.formatMessage({ id: 'chatter.risk.nocommit', defaultMessage: 'No Time Commitment' }), desc: intl.formatMessage({ id: 'chatter.risk.nocommit.desc', defaultMessage: 'Work when you want, from where you want. No schedules.' }) },
                  { icon: '🔓', title: intl.formatMessage({ id: 'chatter.risk.quit', defaultMessage: 'Leave Anytime' }), desc: intl.formatMessage({ id: 'chatter.risk.quit.desc', defaultMessage: "Don't like it? Just stop. No penalties, no questions asked." }) },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="text-3xl">{item.icon}</div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white mb-1">{item.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 text-center">
                <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full px-6 py-3 font-bold">
                  <BadgeCheck className="w-5 h-5" />
                  <FormattedMessage id="chatter.risk.guarantee" defaultMessage="The only thing you invest is your time. The rewards are unlimited." />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* FINAL CTA - PREMIUM BLACK & GOLD */}
        {/* ============================================================== */}
        <section className="py-20 md:py-32 px-4 bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white relative overflow-hidden">
          {/* Gold accents */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl" />
          <FloatingMoney />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 backdrop-blur-sm rounded-full mb-6 border border-amber-500/30">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span className="font-bold text-amber-400">
                <FormattedMessage id="chatter.final.badge" defaultMessage="Join 2,800+ Chatters Worldwide" />
              </span>
            </div>

            <h2 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
              <FormattedMessage id="chatter.final.title" defaultMessage="Ready to Change Your Life?" />
            </h2>

            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-2xl mx-auto">
              <FormattedMessage id="chatter.final.subtitle" defaultMessage="Start earning today. Build your team. Create passive income." />
            </p>

            {/* Benefits checklist */}
            <div className="flex flex-wrap justify-center gap-4 mb-10">
              {[
                intl.formatMessage({ id: 'chatter.final.check1', defaultMessage: '$10 per client' }),
                intl.formatMessage({ id: 'chatter.final.check2', defaultMessage: '$1/call from team' }),
                intl.formatMessage({ id: 'chatter.final.check3', defaultMessage: 'Unlimited team' }),
                intl.formatMessage({ id: 'chatter.final.check4', defaultMessage: '100% free' }),
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 bg-amber-500/10 backdrop-blur-sm rounded-full px-4 py-2 border border-amber-500/20">
                  <CheckCircle className="w-5 h-5 text-amber-400" />
                  <span className="font-medium">{item}</span>
                </div>
              ))}
            </div>

            {/* MEGA CTA - GOLD */}
            <button
              onClick={() => navigate(registerRoute)}
              className="group relative bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 text-gray-900 font-black px-12 py-7 rounded-2xl text-2xl md:text-3xl inline-flex items-center gap-4 hover:from-amber-300 hover:via-yellow-400 hover:to-amber-300 transition-all shadow-2xl animate-pulse-glow-gold overflow-hidden"
            >
              <div className="absolute inset-0 animate-shimmer" />
              <Rocket className="w-10 h-10 relative z-10" />
              <span className="relative z-10">
                <FormattedMessage id="chatter.final.cta" defaultMessage="Become a Chatter Now" />
              </span>
              <ArrowRight className="w-8 h-8 group-hover:translate-x-2 transition-transform relative z-10" />
            </button>

            <p className="mt-6 text-gray-500">
              <FormattedMessage id="chatter.final.subtext" defaultMessage="Free to join • Start in 5 minutes • Get paid worldwide" />
            </p>
          </div>
        </section>

        {/* ============================================================== */}
        {/* STICKY MOBILE CTA */}
        {/* ============================================================== */}
        {showStickyBar && (
          <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden animate-slide-up">
            <div className="bg-gray-900 border-t border-amber-500/30 px-4 py-3 shadow-2xl">
              <button
                onClick={() => navigate(registerRoute)}
                className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-gray-900 font-bold py-4 rounded-xl flex items-center justify-center gap-3 text-lg shadow-lg"
              >
                <DollarSign className="w-6 h-6" />
                <FormattedMessage id="chatter.sticky.cta" defaultMessage="Earn $10/client - Start Free" />
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ChatterLanding;
