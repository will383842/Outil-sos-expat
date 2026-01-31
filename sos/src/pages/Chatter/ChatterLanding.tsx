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
    defaultMessage: 'Join the Chatter program: Earn $10 per client, build an unlimited team, get 5% of their earnings forever. Paid via Mobile Money, Wise worldwide.'
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
      answer: intl.formatMessage({ id: 'chatter.faq.a7', defaultMessage: "Recruit other chatters with your special link. You earn 5% of ALL their client earnings, forever. Your team size is unlimited!" }),
      icon: <Users className="w-5 h-5" />,
    },
    {
      question: intl.formatMessage({ id: 'chatter.faq.q4', defaultMessage: "Is this really free?" }),
      answer: intl.formatMessage({ id: 'chatter.faq.a4', defaultMessage: "100% free. No fees, no investment. Just pass a quick quiz to prove you understand how SOS-Expat works." }),
      icon: <Gift className="w-5 h-5" />,
    },
    {
      question: intl.formatMessage({ id: 'chatter.faq.q5', defaultMessage: "How and when do I get paid?" }),
      answer: intl.formatMessage({ id: 'chatter.faq.a5', defaultMessage: "Withdraw at $25 minimum. We support Wise, Orange Money, Wave, MTN MoMo, M-Pesa, Airtel Money, bank transfers. Processed in 48h." }),
      icon: <Wallet className="w-5 h-5" />,
    },
  ];

  // Calculate team earnings
  const teamEarnings = teamSize * 200 * 0.05;

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
          0%, 100% { box-shadow: 0 0 20px rgba(34, 197, 94, 0.4), 0 0 40px rgba(34, 197, 94, 0.2); }
          50% { box-shadow: 0 0 40px rgba(34, 197, 94, 0.6), 0 0 80px rgba(34, 197, 94, 0.3); }
        }
        @keyframes pulse-glow-orange {
          0%, 100% { box-shadow: 0 0 20px rgba(249, 115, 22, 0.4), 0 0 40px rgba(249, 115, 22, 0.2); }
          50% { box-shadow: 0 0 40px rgba(249, 115, 22, 0.6), 0 0 80px rgba(249, 115, 22, 0.3); }
        }
        .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
        .animate-pulse-glow-orange { animation: pulse-glow-orange 2s ease-in-out infinite; }

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
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-green-500 to-teal-400 animate-gradient" />

          {/* Floating money decorations */}
          <FloatingMoney />

          {/* Glassmorphism overlays */}
          <div className="absolute top-10 -left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 -right-20 w-96 h-96 bg-yellow-400/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl" />

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
                  <span className="text-orange-300">+ 5%</span>
                  <FormattedMessage id="chatter.hero.team.teaser" defaultMessage=" of your team's earnings. Forever. Unlimited team size!" />
                </p>
              </div>
            </div>

            {/* MEGA CTA */}
            <button
              onClick={() => navigate(registerRoute)}
              className="group relative bg-white text-green-600 font-black px-10 py-6 rounded-2xl text-xl md:text-2xl inline-flex items-center gap-4 hover:bg-gray-100 transition-all shadow-2xl animate-pulse-glow overflow-hidden"
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

            {/* Scroll indicator */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce-slow">
              <ArrowDown className="w-8 h-8 text-white/60" />
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* INCOME CALCULATOR - VISUAL PROOF */}
        {/* ============================================================== */}
        <section className="py-16 md:py-24 px-4 bg-gradient-to-b from-gray-900 to-black text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-500 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500 rounded-full blur-3xl" />
          </div>

          <div className="max-w-5xl mx-auto relative z-10">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-full text-sm font-bold mb-4">
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
              <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 backdrop-blur-xl rounded-3xl p-8 border border-green-500/30">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center">
                    <DollarSign className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-green-400">
                      <FormattedMessage id="chatter.calc.direct" defaultMessage="Your Direct Earnings" />
                    </h3>
                    <p className="text-gray-400 text-sm">
                      <FormattedMessage id="chatter.calc.direct.sub" defaultMessage="$10 per client you refer" />
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    { clients: 5, emoji: '🌱' },
                    { clients: 20, emoji: '🌿' },
                    { clients: 50, emoji: '🌳' },
                    { clients: 100, emoji: '🏆' },
                  ].map((tier) => (
                    <div key={tier.clients} className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{tier.emoji}</span>
                        <span className="font-medium">{tier.clients} <FormattedMessage id="chatter.calc.clients" defaultMessage="clients" /></span>
                      </div>
                      <div className="text-2xl font-black text-green-400">
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
                      <FormattedMessage id="chatter.calc.team.sub" defaultMessage="5% of their earnings forever" />
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
                    <FormattedMessage id="chatter.calc.if" defaultMessage="If each earns $200/month" />
                  </p>
                  <div className="text-4xl md:text-5xl font-black text-orange-400 mb-2">
                    ${teamEarnings.toFixed(0)}<span className="text-2xl text-gray-500">/mo</span>
                  </div>
                  <p className="text-green-400 font-bold">
                    <FormattedMessage id="chatter.calc.passive" defaultMessage="Passive income for you!" />
                  </p>
                </div>

                <div className="mt-4 text-center text-sm text-gray-500">
                  <FormattedMessage id="chatter.calc.nolimit" defaultMessage="No limit on team size!" />
                </div>
              </div>
            </div>

            {/* Total potential */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-3xl p-8 text-center">
              <h3 className="text-xl font-bold mb-2">
                <FormattedMessage id="chatter.calc.total" defaultMessage="Your Total Monthly Potential" />
              </h3>
              <div className="text-5xl md:text-7xl font-black mb-2">
                $<AnimatedCounter end={500 + teamEarnings} />+
              </div>
              <p className="text-white/80">
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
                <FormattedMessage id="chatter.team.subtitle" defaultMessage="Recruit other chatters. Get 5% of ALL their earnings. Forever. No limits." />
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
                      <span className="text-green-300 font-bold">+5%</span>
                    </div>
                  ))}
                </div>

                {/* Arrow */}
                <div className="text-3xl mb-4">⬇️</div>

                {/* More chatters indication */}
                <div className="flex justify-center gap-3 flex-wrap">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 opacity-60" />
                    </div>
                  ))}
                  <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center font-bold">
                    +∞
                  </div>
                </div>
              </div>

              {/* Example calculation */}
              <div className="mt-10 bg-white/10 rounded-2xl p-6 text-center">
                <p className="font-semibold mb-3">
                  <FormattedMessage id="chatter.team.example" defaultMessage="Example: 20 chatters earning $300/month each" />
                </p>
                <div className="text-4xl md:text-5xl font-black text-green-300 mb-2">
                  = $300<span className="text-2xl text-white/80">/mo</span>
                </div>
                <p className="text-white/80">
                  <FormattedMessage id="chatter.team.passive" defaultMessage="Passive income for doing nothing!" />
                </p>
              </div>
            </div>

            {/* Key benefits */}
            <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-10">
              {[
                { icon: '♾️', title: intl.formatMessage({ id: 'chatter.team.benefit1.title', defaultMessage: 'Unlimited Team' }), desc: intl.formatMessage({ id: 'chatter.team.benefit1.desc', defaultMessage: 'No cap on how many you recruit' }) },
                { icon: '🔄', title: intl.formatMessage({ id: 'chatter.team.benefit2.title', defaultMessage: 'Forever Earnings' }), desc: intl.formatMessage({ id: 'chatter.team.benefit2.desc', defaultMessage: '5% as long as they earn' }) },
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

            {/* Testimonials */}
            <div className="grid md:grid-cols-3 gap-6 mb-10">
              {[
                {
                  name: 'Amadou S.',
                  location: '🇸🇳 Sénégal',
                  amount: '$430',
                  period: intl.formatMessage({ id: 'chatter.testimonial.period', defaultMessage: 'this month' }),
                  quote: intl.formatMessage({ id: 'chatter.testimonial.1', defaultMessage: "I share links in Facebook groups for African expats. Easy money!" }),
                  avatar: '👨🏿‍💼',
                },
                {
                  name: 'Marie L.',
                  location: '🇫🇷 France',
                  amount: '$1,200',
                  period: intl.formatMessage({ id: 'chatter.testimonial.period', defaultMessage: 'this month' }),
                  quote: intl.formatMessage({ id: 'chatter.testimonial.2', defaultMessage: "I built a team of 15 chatters. Passive income is real!" }),
                  avatar: '👩🏼‍💻',
                  highlight: true,
                },
                {
                  name: 'John K.',
                  location: '🇰🇪 Kenya',
                  amount: '$280',
                  period: intl.formatMessage({ id: 'chatter.testimonial.period', defaultMessage: 'this month' }),
                  quote: intl.formatMessage({ id: 'chatter.testimonial.3', defaultMessage: "Orange Money payout in 24h. This is legit!" }),
                  avatar: '👨🏾‍🦱',
                },
              ].map((testimonial, i) => (
                <div
                  key={i}
                  className={`relative rounded-2xl p-6 ${
                    testimonial.highlight
                      ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white'
                      : 'bg-gray-50 dark:bg-gray-800'
                  }`}
                >
                  {testimonial.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-yellow-400 text-yellow-900 rounded-full text-xs font-bold">
                      TOP EARNER
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className={`font-bold ${testimonial.highlight ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                        {testimonial.name}
                      </div>
                      <div className={`text-sm ${testimonial.highlight ? 'text-white/80' : 'text-gray-500'}`}>
                        {testimonial.location}
                      </div>
                    </div>
                  </div>
                  <p className={`mb-4 ${testimonial.highlight ? 'text-white/90' : 'text-gray-600 dark:text-gray-300'}`}>
                    "{testimonial.quote}"
                  </p>
                  <div className={`text-2xl font-black ${testimonial.highlight ? 'text-yellow-300' : 'text-green-600 dark:text-green-400'}`}>
                    {testimonial.amount} <span className={`text-sm font-normal ${testimonial.highlight ? 'text-white/70' : 'text-gray-500'}`}>{testimonial.period}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Live activity feed */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-4 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-bold text-green-700 dark:text-green-400">
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
                    <span className="font-bold text-green-600 dark:text-green-400">{activity.amount}</span>
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
                <CheckCircle className="w-4 h-4 text-green-500" />
                <FormattedMessage id="chatter.payment.min" defaultMessage="$25 minimum" />
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-green-500" />
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
                    <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl flex items-center justify-center text-green-600 dark:text-green-400 flex-shrink-0">
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
        {/* FINAL CTA - MASSIVE */}
        {/* ============================================================== */}
        <section className="py-20 md:py-32 px-4 bg-gradient-to-br from-emerald-600 via-green-500 to-teal-400 text-white relative overflow-hidden">
          <FloatingMoney />

          <div className="absolute inset-0">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/10 to-transparent" />
          </div>

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full mb-6">
              <Sparkles className="w-5 h-5 text-yellow-300" />
              <span className="font-bold">
                <FormattedMessage id="chatter.final.badge" defaultMessage="Join 2,800+ Chatters Worldwide" />
              </span>
            </div>

            <h2 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
              <FormattedMessage id="chatter.final.title" defaultMessage="Ready to Change Your Life?" />
            </h2>

            <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto">
              <FormattedMessage id="chatter.final.subtitle" defaultMessage="Start earning today. Build your team. Create passive income." />
            </p>

            {/* Benefits checklist */}
            <div className="flex flex-wrap justify-center gap-4 mb-10">
              {[
                intl.formatMessage({ id: 'chatter.final.check1', defaultMessage: '$10 per client' }),
                intl.formatMessage({ id: 'chatter.final.check2', defaultMessage: '5% team earnings' }),
                intl.formatMessage({ id: 'chatter.final.check3', defaultMessage: 'Unlimited team' }),
                intl.formatMessage({ id: 'chatter.final.check4', defaultMessage: '100% free' }),
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                  <CheckCircle className="w-5 h-5 text-green-300" />
                  <span className="font-medium">{item}</span>
                </div>
              ))}
            </div>

            {/* MEGA CTA */}
            <button
              onClick={() => navigate(registerRoute)}
              className="group relative bg-white text-green-600 font-black px-12 py-7 rounded-2xl text-2xl md:text-3xl inline-flex items-center gap-4 hover:bg-gray-100 transition-all shadow-2xl animate-pulse-glow overflow-hidden"
            >
              <div className="absolute inset-0 animate-shimmer" />
              <Rocket className="w-10 h-10 relative z-10" />
              <span className="relative z-10">
                <FormattedMessage id="chatter.final.cta" defaultMessage="Become a Chatter Now" />
              </span>
              <ArrowRight className="w-8 h-8 group-hover:translate-x-2 transition-transform relative z-10" />
            </button>

            <p className="mt-6 text-white/70">
              <FormattedMessage id="chatter.final.subtext" defaultMessage="Free to join • Start in 5 minutes • Get paid worldwide" />
            </p>
          </div>
        </section>

        {/* ============================================================== */}
        {/* STICKY MOBILE CTA */}
        {/* ============================================================== */}
        {showStickyBar && (
          <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden animate-slide-up">
            <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 py-3 shadow-2xl">
              <button
                onClick={() => navigate(registerRoute)}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 text-lg shadow-lg"
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
