/**
 * ChatterLanding - Elite Mobile-First Landing Page 2026
 *
 * Features:
 * - Viral snowball effect emphasis
 * - Correct commission structure
 * - Multi-level referral system (N1/N2)
 * - Early Adopter Pioneer program
 * - International/Global appeal (Africa-friendly)
 * - Animated, engaging, mobile-first design
 * - SEO 2026 optimized for AI/LLM
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
  Star,
  Wallet,
  Users,
  Trophy,
  CheckCircle,
  ArrowRight,
  Gift,
  TrendingUp,
  Globe,
  HelpCircle,
  ChevronDown,
  MessageCircle,
  Heart,
  DollarSign,
  Clock,
  Shield,
  Smartphone,
  CreditCard,
  Award,
  Zap,
  Target,
  Share2,
  UserPlus,
  Rocket,
  Sparkles,
  Crown,
  Flame,
  ArrowDown,
  Play,
  Phone,
  BadgeCheck,
  Percent,
  Timer,
  Network,
  ChevronRight,
  Ban,
  Volume2,
} from 'lucide-react';

// ============================================================================
// ANIMATED COUNTER HOOK
// ============================================================================
const useCountUp = (end: number, duration: number = 2000, start: number = 0) => {
  const [count, setCount] = useState(start);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    let startTime: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(start + (end - start) * easeOut));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isVisible, end, duration, start]);

  return { count, ref };
};

// ============================================================================
// FLOATING ANIMATION COMPONENT
// ============================================================================
const FloatingEmoji: React.FC<{ emoji: string; delay: number; position: string }> = ({ emoji, delay, position }) => (
  <div
    className={`absolute ${position} text-2xl md:text-3xl animate-bounce opacity-80`}
    style={{ animationDelay: `${delay}s`, animationDuration: '3s' }}
  >
    {emoji}
  </div>
);

// ============================================================================
// EARNINGS CALCULATOR COMPONENT
// ============================================================================
const EarningsCalculator: React.FC = () => {
  const intl = useIntl();
  const [clients, setClients] = useState(20);
  const [lawyers, setLawyers] = useState(3);
  const [callsPerLawyer, setCallsPerLawyer] = useState(15);
  const [filleuls, setFilleuls] = useState(5);

  const clientEarnings = clients * 10;
  const lawyerEarnings = lawyers * callsPerLawyer * 5;
  const referralEarnings = filleuls >= 5 ? 25 : 0; // Tier bonus
  const filleulRecurring = filleuls * 50 * 0.05; // 5% of $50 avg
  const total = clientEarnings + lawyerEarnings + referralEarnings + filleulRecurring;

  return (
    <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl p-6 md:p-8 text-white">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center">
          <DollarSign className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold">
            <FormattedMessage id="chatter.calc.title" defaultMessage="Earnings Calculator" />
          </h3>
          <p className="text-gray-400 text-sm">
            <FormattedMessage id="chatter.calc.subtitle" defaultMessage="See your potential income" />
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Clients slider */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-300">
              <FormattedMessage id="chatter.calc.clients" defaultMessage="Clients referred/month" />
            </span>
            <span className="font-bold text-green-400">{clients} × $10 = ${clientEarnings}</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={clients}
            onChange={(e) => setClients(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-full appearance-none cursor-pointer slider-green"
          />
        </div>

        {/* Lawyers recruited slider */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-300">
              <FormattedMessage id="chatter.calc.lawyers" defaultMessage="Lawyers recruited" />
            </span>
            <span className="font-bold text-purple-400">{lawyers}</span>
          </div>
          <input
            type="range"
            min="0"
            max="20"
            value={lawyers}
            onChange={(e) => setLawyers(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-full appearance-none cursor-pointer slider-purple"
          />
        </div>

        {/* Calls per lawyer slider */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-300">
              <FormattedMessage id="chatter.calc.callsPerLawyer" defaultMessage="Calls/lawyer/month" />
            </span>
            <span className="font-bold text-purple-400">{lawyers} × {callsPerLawyer} × $5 = ${lawyerEarnings}</span>
          </div>
          <input
            type="range"
            min="0"
            max="50"
            value={callsPerLawyer}
            onChange={(e) => setCallsPerLawyer(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-full appearance-none cursor-pointer slider-purple"
          />
        </div>

        {/* Filleuls slider */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-300">
              <FormattedMessage id="chatter.calc.filleuls" defaultMessage="Chatters you sponsor" />
            </span>
            <span className="font-bold text-orange-400">{filleuls}</span>
          </div>
          <input
            type="range"
            min="0"
            max="50"
            value={filleuls}
            onChange={(e) => setFilleuls(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-full appearance-none cursor-pointer slider-orange"
          />
        </div>

        {/* Total */}
        <div className="pt-4 border-t border-gray-700">
          <div className="flex justify-between items-center">
            <span className="text-lg text-gray-300">
              <FormattedMessage id="chatter.calc.total" defaultMessage="Estimated monthly income" />
            </span>
            <div className="text-right">
              <span className="text-4xl md:text-5xl font-black bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
                ${total.toLocaleString()}
              </span>
              <span className="text-gray-400 text-sm block">/month</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SNOWBALL ANIMATION COMPONENT
// ============================================================================
const SnowballEffect: React.FC = () => {
  const intl = useIntl();

  return (
    <div className="relative">
      {/* Animated network lines */}
      <div className="absolute inset-0 overflow-hidden">
        <svg className="w-full h-full" viewBox="0 0 400 300">
          <defs>
            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          {/* Animated connection lines */}
          <path d="M200,50 Q100,100 120,180" stroke="url(#lineGrad)" strokeWidth="2" fill="none" className="animate-pulse" />
          <path d="M200,50 Q300,100 280,180" stroke="url(#lineGrad)" strokeWidth="2" fill="none" className="animate-pulse" style={{animationDelay: '0.5s'}} />
          <path d="M120,180 Q80,220 60,280" stroke="url(#lineGrad)" strokeWidth="1.5" fill="none" className="animate-pulse" style={{animationDelay: '1s'}} />
          <path d="M120,180 Q160,220 180,280" stroke="url(#lineGrad)" strokeWidth="1.5" fill="none" className="animate-pulse" style={{animationDelay: '1.2s'}} />
          <path d="M280,180 Q240,220 220,280" stroke="url(#lineGrad)" strokeWidth="1.5" fill="none" className="animate-pulse" style={{animationDelay: '0.8s'}} />
          <path d="M280,180 Q320,220 340,280" stroke="url(#lineGrad)" strokeWidth="1.5" fill="none" className="animate-pulse" style={{animationDelay: '1.5s'}} />
        </svg>
      </div>

      {/* Nodes */}
      <div className="relative z-10 flex flex-col items-center py-8">
        {/* You - top */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center text-white shadow-xl shadow-red-500/30 animate-pulse">
            <Crown className="w-10 h-10" />
          </div>
          <span className="mt-2 font-bold text-gray-900 dark:text-white">
            <FormattedMessage id="chatter.snowball.you" defaultMessage="YOU" />
          </span>
          <span className="text-xs text-green-600 font-semibold">100%</span>
        </div>

        {/* Level 1 - N1 */}
        <div className="flex justify-center gap-8 md:gap-16 mb-8">
          {[1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                <UserPlus className="w-7 h-7" />
              </div>
              <span className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">N1</span>
              <span className="text-xs text-purple-600 font-semibold">$4 + 5%</span>
            </div>
          ))}
        </div>

        {/* Level 2 - N2 */}
        <div className="flex justify-center gap-4 md:gap-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <Users className="w-5 h-5" />
              </div>
              <span className="mt-1 text-xs font-medium text-gray-600 dark:text-gray-400">N2</span>
              <span className="text-[10px] text-blue-600 font-semibold">$2</span>
            </div>
          ))}
        </div>
      </div>
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

  const registerRoute = `/${getTranslatedRouteSlug('chatter-register' as RouteKey, langCode)}`;

  // Animated counters
  const chattersCount = useCountUp(2847, 2500);
  const earningsCount = useCountUp(127350, 3000);
  const countriesCount = useCountUp(89, 2000);

  // SEO 2026
  const seoTitle = intl.formatMessage({
    id: 'chatter.landing.seo.title',
    defaultMessage: 'Become a SOS-Expat Chatter | Earn $10/client + Unlimited Referral Bonuses'
  });
  const seoDescription = intl.formatMessage({
    id: 'chatter.landing.seo.description',
    defaultMessage: 'Join SOS-Expat Chatters: $10/client call, $5/lawyer call, 2-level referral system with 5% recurring. Pioneer bonus +50% for early adopters. Free, worldwide, mobile money.'
  });
  const seoKeywords = intl.formatMessage({
    id: 'chatter.landing.seo.keywords',
    defaultMessage: 'chatter, ambassador, affiliate, commission, referral, mlm, network, SOS-Expat, earn money, mobile money, wise, passive income, africa, global'
  });
  const aiSummary = intl.formatMessage({
    id: 'chatter.landing.seo.aiSummary',
    defaultMessage: 'SOS-Expat Chatter program: $10/client, $5/lawyer call, 2-level referral (N1: $4+5%, N2: $2), tier bonuses up to $500, Pioneer +50% lifetime bonus for first 100 per country.'
  });

  // FAQ
  const faqs = [
    {
      question: intl.formatMessage({ id: 'chatter.faq.q1', defaultMessage: "What exactly is a SOS-Expat Chatter?" }),
      answer: intl.formatMessage({ id: 'chatter.faq.a1', defaultMessage: "A Chatter is a brand ambassador who earns money by naturally recommending SOS-Expat. You chat on WhatsApp, Facebook, Instagram, TikTok - wherever you already are - and share your unique link when someone needs legal help abroad. No spam, just authentic recommendations." }),
    },
    {
      question: intl.formatMessage({ id: 'chatter.faq.q2', defaultMessage: "How much can I realistically earn?" }),
      answer: intl.formatMessage({ id: 'chatter.faq.a2', defaultMessage: "Earnings vary by activity: $10 per client call, $5 per call to lawyers you recruit. Active chatters earn $200-$800/month. Top performers with strong referral networks exceed $2,000/month through the snowball effect of sponsoring other chatters." }),
    },
    {
      question: intl.formatMessage({ id: 'chatter.faq.q3', defaultMessage: "How does the 2-level referral system work?" }),
      answer: intl.formatMessage({ id: 'chatter.faq.a3', defaultMessage: "When you sponsor a chatter (N1), you earn: $1 when they reach $10, $4 when they reach $50, plus 5% of their monthly client earnings forever. For their recruits (N2), you earn $2 when they reach $50. Plus tier bonuses: $25 for 5 active recruits, $75 for 10, $200 for 25, $500 for 50!" }),
    },
    {
      question: intl.formatMessage({ id: 'chatter.faq.q4', defaultMessage: "What is the Pioneer Early Adopter bonus?" }),
      answer: intl.formatMessage({ id: 'chatter.faq.a4', defaultMessage: "The first 100 chatters in each country who reach $50 in client earnings become Pioneers and get +50% LIFETIME bonus on ALL referral commissions. This is permanent and extremely valuable - don't miss your spot!" }),
    },
    {
      question: intl.formatMessage({ id: 'chatter.faq.q5', defaultMessage: "How and when do I get paid?" }),
      answer: intl.formatMessage({ id: 'chatter.faq.a5', defaultMessage: "Withdraw anytime once you have $25+. We support Wise (international), Orange Money, Wave, MTN Mobile Money, Airtel Money, M-Pesa, and bank transfers. Payments processed within 48 hours." }),
    },
    {
      question: intl.formatMessage({ id: 'chatter.faq.q6', defaultMessage: "Is this available in my country?" }),
      answer: intl.formatMessage({ id: 'chatter.faq.a6', defaultMessage: "Yes! SOS-Expat Chatters work from 89+ countries across Africa, Europe, Americas, and Asia. All you need is internet access and people to help. The platform supports 9 languages." }),
    },
    {
      question: intl.formatMessage({ id: 'chatter.faq.q7', defaultMessage: "Do I need to invest money to start?" }),
      answer: intl.formatMessage({ id: 'chatter.faq.a7', defaultMessage: "Absolutely not. Registration is 100% free. You just need to pass a quick quiz (85% to pass) to prove you understand how SOS-Expat works. No fees, no purchases, no hidden costs ever." }),
    },
  ];

  // Success stories - diverse and international
  const successStories = [
    {
      name: 'Fatou D.',
      country: '🇸🇳 Sénégal',
      avatar: '👩🏾',
      monthly: '$890',
      story: intl.formatMessage({ id: 'chatter.story.1', defaultMessage: '52 clients + 12 chatters sponsored. Pioneer badge holder!' }),
      badge: 'Pioneer',
      highlight: '+50%',
    },
    {
      name: 'Emmanuel O.',
      country: '🇳🇬 Nigeria',
      avatar: '👨🏿',
      monthly: '$1,240',
      story: intl.formatMessage({ id: 'chatter.story.2', defaultMessage: 'Recruited 8 lawyers, 67 clients. Diamond level in 4 months.' }),
      badge: 'Diamond',
      highlight: 'Top 3',
    },
    {
      name: 'Aminata K.',
      country: '🇨🇮 Côte d\'Ivoire',
      avatar: '👩🏾‍🦱',
      monthly: '$520',
      story: intl.formatMessage({ id: 'chatter.story.3', defaultMessage: 'Part-time while studying. WhatsApp groups are gold!' }),
      badge: 'Gold',
      highlight: '',
    },
    {
      name: 'Mohamed B.',
      country: '🇲🇦 Morocco',
      avatar: '👨🏽',
      monthly: '$680',
      story: intl.formatMessage({ id: 'chatter.story.4', defaultMessage: '23 chatters in my network earning passive income monthly.' }),
      badge: 'Platinum',
      highlight: '5%',
    },
    {
      name: 'Grace N.',
      country: '🇰🇪 Kenya',
      avatar: '👩🏿',
      monthly: '$445',
      story: intl.formatMessage({ id: 'chatter.story.5', defaultMessage: 'M-Pesa withdrawal in 24h. Love this system!' }),
      badge: 'Silver',
      highlight: '',
    },
    {
      name: 'Yves T.',
      country: '🇨🇲 Cameroon',
      avatar: '👨🏿',
      monthly: '$760',
      story: intl.formatMessage({ id: 'chatter.story.6', defaultMessage: 'Facebook groups + TikTok = unstoppable combo.' }),
      badge: 'Platinum',
      highlight: 'Top 3',
    },
  ];

  // Payment methods with icons
  const paymentMethods = [
    { name: 'Wise', icon: '🌐', desc: intl.formatMessage({ id: 'chatter.pay.wise', defaultMessage: 'International' }) },
    { name: 'Orange Money', icon: '🟠', desc: intl.formatMessage({ id: 'chatter.pay.orange', defaultMessage: 'Africa' }) },
    { name: 'Wave', icon: '🌊', desc: intl.formatMessage({ id: 'chatter.pay.wave', defaultMessage: 'West Africa' }) },
    { name: 'MTN MoMo', icon: '💛', desc: intl.formatMessage({ id: 'chatter.pay.mtn', defaultMessage: 'Africa' }) },
    { name: 'M-Pesa', icon: '💚', desc: intl.formatMessage({ id: 'chatter.pay.mpesa', defaultMessage: 'East Africa' }) },
    { name: 'Airtel Money', icon: '❤️', desc: intl.formatMessage({ id: 'chatter.pay.airtel', defaultMessage: 'Africa/Asia' }) },
    { name: intl.formatMessage({ id: 'chatter.pay.bank', defaultMessage: 'Bank' }), icon: '🏦', desc: intl.formatMessage({ id: 'chatter.pay.bankdesc', defaultMessage: 'Worldwide' }) },
  ];

  // Level system with correct bonuses
  const levels = [
    { name: 'Bronze', bonus: '+0%', earnings: '$0-99', color: 'from-amber-600 to-amber-700', icon: '🥉' },
    { name: 'Silver', bonus: '+10%', earnings: '$100-499', color: 'from-slate-400 to-slate-500', icon: '🥈' },
    { name: 'Gold', bonus: '+20%', earnings: '$500-1,999', color: 'from-yellow-400 to-amber-500', icon: '🥇' },
    { name: 'Platinum', bonus: '+35%', earnings: '$2,000-4,999', color: 'from-cyan-400 to-blue-500', icon: '💎' },
    { name: 'Diamond', bonus: '+50%', earnings: '$5,000+', color: 'from-purple-400 to-pink-500', icon: '👑' },
  ];

  return (
    <Layout>
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        ogImage="/og-chatter-2026.jpg"
        ogType="website"
        aiSummary={aiSummary}
        expertise="affiliate-marketing"
        trustworthiness="high"
        contentQuality="high"
        contentType="LandingPage"
        lastReviewed="2026-01-30"
      />
      <HreflangLinks pathname={location.pathname} />
      <FAQPageSchema faqs={faqs} pageTitle={seoTitle} />

      {/* Custom styles for sliders */}
      <style>{`
        input[type="range"].slider-green::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          background: linear-gradient(to right, #22c55e, #10b981);
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(34, 197, 94, 0.4);
        }
        input[type="range"].slider-purple::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          background: linear-gradient(to right, #a855f7, #ec4899);
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(168, 85, 247, 0.4);
        }
        input[type="range"].slider-orange::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          background: linear-gradient(to right, #f97316, #ef4444);
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(249, 115, 22, 0.4);
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float { animation: float 3s ease-in-out infinite; }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.4); }
          50% { box-shadow: 0 0 40px rgba(239, 68, 68, 0.6); }
        }
        .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
      `}</style>

      <div className="min-h-screen bg-white dark:bg-gray-950">

        {/* ============================================================== */}
        {/* HERO SECTION - Full Impact */}
        {/* ============================================================== */}
        <section className="relative min-h-[90vh] md:min-h-screen flex items-center overflow-hidden">
          {/* Animated background */}
          <div className="absolute inset-0 bg-gradient-to-br from-red-600 via-orange-500 to-red-500">
            <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
            <div className="absolute top-0 left-0 w-96 h-96 bg-yellow-400/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-red-600/30 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}} />
          </div>

          {/* Floating emojis */}
          <FloatingEmoji emoji="💰" delay={0} position="top-20 left-[10%]" />
          <FloatingEmoji emoji="🚀" delay={0.5} position="top-32 right-[15%]" />
          <FloatingEmoji emoji="🌍" delay={1} position="bottom-32 left-[20%]" />
          <FloatingEmoji emoji="📱" delay={1.5} position="bottom-20 right-[10%]" />

          <div className="relative z-10 max-w-6xl mx-auto px-4 py-12 md:py-20 text-center text-white">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full mb-6 animate-float">
              <Sparkles className="w-5 h-5 text-yellow-300" />
              <span className="font-semibold">
                <FormattedMessage id="chatter.hero.badge" defaultMessage="Global Ambassador Program 2026" />
              </span>
              <span className="px-2 py-0.5 bg-green-500 rounded-full text-xs font-bold">
                <FormattedMessage id="chatter.hero.badge.free" defaultMessage="FREE" />
              </span>
            </div>

            {/* Main headline */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black mb-6 leading-[1.1]">
              <FormattedMessage
                id="chatter.hero.title"
                defaultMessage="Turn Your {br}Conversations{br}Into Cash"
                values={{ br: <br className="hidden md:block" /> }}
              />
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto mb-8 px-4">
              <FormattedMessage
                id="chatter.hero.subtitle"
                defaultMessage="Earn $10 per client, $5 per lawyer call, + unlimited referral bonuses. Build your network, create passive income."
              />
            </p>

            {/* Hero stats - animated */}
            <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mb-10">
              <div ref={chattersCount.ref} className="bg-white/10 backdrop-blur-md rounded-2xl p-4">
                <div className="text-3xl md:text-4xl font-black">{chattersCount.count.toLocaleString()}+</div>
                <div className="text-sm text-white/80">
                  <FormattedMessage id="chatter.hero.stat.chatters" defaultMessage="Active Chatters" />
                </div>
              </div>
              <div ref={earningsCount.ref} className="bg-white/10 backdrop-blur-md rounded-2xl p-4">
                <div className="text-3xl md:text-4xl font-black">${earningsCount.count.toLocaleString()}</div>
                <div className="text-sm text-white/80">
                  <FormattedMessage id="chatter.hero.stat.paid" defaultMessage="Paid This Month" />
                </div>
              </div>
              <div ref={countriesCount.ref} className="bg-white/10 backdrop-blur-md rounded-2xl p-4">
                <div className="text-3xl md:text-4xl font-black">{countriesCount.count}+</div>
                <div className="text-sm text-white/80">
                  <FormattedMessage id="chatter.hero.stat.countries" defaultMessage="Countries" />
                </div>
              </div>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <button
                onClick={() => navigate(registerRoute)}
                className="w-full sm:w-auto group bg-white text-red-600 font-bold px-8 py-4 rounded-2xl text-lg flex items-center justify-center gap-3 hover:bg-gray-100 transition-all shadow-2xl animate-pulse-glow"
              >
                <Rocket className="w-6 h-6" />
                <FormattedMessage id="chatter.hero.cta.primary" defaultMessage="Start Earning Now" />
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full sm:w-auto bg-white/10 backdrop-blur-sm text-white font-semibold px-8 py-4 rounded-2xl text-lg flex items-center justify-center gap-3 hover:bg-white/20 transition-all border border-white/30"
              >
                <Play className="w-5 h-5" />
                <FormattedMessage id="chatter.hero.cta.secondary" defaultMessage="See How It Works" />
              </button>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap justify-center gap-6 text-sm text-white/80">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <FormattedMessage id="chatter.hero.trust.1" defaultMessage="100% Free to Join" />
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <FormattedMessage id="chatter.hero.trust.2" defaultMessage="No Spam Required" />
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <FormattedMessage id="chatter.hero.trust.3" defaultMessage="Instant Dashboard" />
              </div>
            </div>

            {/* Scroll indicator */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
              <ArrowDown className="w-8 h-8 text-white/60" />
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* COMMISSION STRUCTURE - Clear and Correct */}
        {/* ============================================================== */}
        <section className="py-16 md:py-24 px-4 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-semibold mb-4">
                <DollarSign className="w-4 h-4" />
                <FormattedMessage id="chatter.commissions.badge" defaultMessage="Your Earnings" />
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white mb-4">
                <FormattedMessage id="chatter.commissions.title" defaultMessage="3 Ways to Earn" />
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                <FormattedMessage id="chatter.commissions.subtitle" defaultMessage="Direct commissions, lawyer recruitment, and sponsor other chatters" />
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              {/* Commission 1: Client Referral */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-3xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                <div className="relative bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-8 border border-gray-100 dark:border-gray-700 h-full">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center mb-6">
                    <Phone className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-5xl md:text-6xl font-black bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent mb-2">
                    $10
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    <FormattedMessage id="chatter.commission.client.title" defaultMessage="Per Client Call" />
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    <FormattedMessage id="chatter.commission.client.desc" defaultMessage="Every time someone uses your link to call a lawyer, you earn $10. Unlimited calls = unlimited earnings." />
                  </p>
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-semibold">
                    <TrendingUp className="w-4 h-4" />
                    <FormattedMessage id="chatter.commission.client.note" defaultMessage="No limit on earnings" />
                  </div>
                </div>
              </div>

              {/* Commission 2: Lawyer Recruitment */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                <div className="relative bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-8 border border-gray-100 dark:border-gray-700 h-full">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center mb-6">
                    <UserPlus className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-5xl md:text-6xl font-black bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent mb-2">
                    $5
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    <FormattedMessage id="chatter.commission.lawyer.title" defaultMessage="Per Lawyer Call" />
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    <FormattedMessage id="chatter.commission.lawyer.desc" defaultMessage="Recruit a lawyer and earn $5 for EVERY call they receive. More calls = more passive income for you." />
                  </p>
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-sm font-semibold">
                    <Zap className="w-4 h-4" />
                    <FormattedMessage id="chatter.commission.lawyer.note" defaultMessage="Passive income stream" />
                  </div>
                </div>
              </div>

              {/* Commission 3: Sponsor Chatters */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-500 rounded-3xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                <div className="relative bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-8 border border-gray-100 dark:border-gray-700 h-full">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center mb-6">
                    <Network className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-5xl md:text-6xl font-black bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent mb-2">
                    5%
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    <FormattedMessage id="chatter.commission.sponsor.title" defaultMessage="Monthly Recurring" />
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    <FormattedMessage id="chatter.commission.sponsor.desc" defaultMessage="Sponsor other chatters and earn 5% of their client earnings every month. Forever." />
                  </p>
                  <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 text-sm font-semibold">
                    <Flame className="w-4 h-4" />
                    <FormattedMessage id="chatter.commission.sponsor.note" defaultMessage="Snowball effect" />
                  </div>
                </div>
              </div>
            </div>

            {/* Top 3 Monthly Bonus */}
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-3xl p-6 md:p-8 border border-yellow-200 dark:border-yellow-800">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-yellow-400 to-amber-500 flex items-center justify-center">
                    <Trophy className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      <FormattedMessage id="chatter.bonus.top3.title" defaultMessage="Monthly Top 3 Bonus" />
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      <FormattedMessage id="chatter.bonus.top3.desc" defaultMessage="Top performers get massive bonus multipliers" />
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 md:gap-4">
                  <div className="flex-1 md:flex-initial text-center px-6 py-4 bg-gradient-to-b from-yellow-400 to-amber-500 rounded-2xl shadow-lg">
                    <div className="text-3xl mb-1">🥇</div>
                    <div className="text-2xl font-black text-white">+100%</div>
                  </div>
                  <div className="flex-1 md:flex-initial text-center px-6 py-4 bg-gradient-to-b from-gray-300 to-gray-400 rounded-2xl shadow-lg">
                    <div className="text-3xl mb-1">🥈</div>
                    <div className="text-2xl font-black text-white">+50%</div>
                  </div>
                  <div className="flex-1 md:flex-initial text-center px-6 py-4 bg-gradient-to-b from-amber-600 to-amber-700 rounded-2xl shadow-lg">
                    <div className="text-3xl mb-1">🥉</div>
                    <div className="text-2xl font-black text-white">+15%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* REFERRAL SYSTEM - The Snowball Effect */}
        {/* ============================================================== */}
        <section className="py-16 md:py-24 px-4 bg-white dark:bg-gray-950">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full text-sm font-semibold mb-4">
                <Network className="w-4 h-4" />
                <FormattedMessage id="chatter.referral.badge" defaultMessage="2-Level Referral System" />
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white mb-4">
                <FormattedMessage id="chatter.referral.title" defaultMessage="The Snowball Effect" />
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                <FormattedMessage id="chatter.referral.subtitle" defaultMessage="Sponsor chatters who sponsor chatters. Your network grows, your income grows. Forever." />
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 items-center">
              {/* Snowball visualization */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-3xl p-6">
                <SnowballEffect />
              </div>

              {/* Referral details */}
              <div className="space-y-4">
                {/* N1 - Direct sponsors */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-5 border border-purple-200 dark:border-purple-800">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold">N1</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 dark:text-white mb-2">
                        <FormattedMessage id="chatter.referral.n1.title" defaultMessage="Direct Sponsors (Level 1)" />
                      </h4>
                      <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-purple-500 flex-shrink-0" />
                          <FormattedMessage id="chatter.referral.n1.bonus1" defaultMessage="$1 when they reach $10 in client earnings" />
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-purple-500 flex-shrink-0" />
                          <FormattedMessage id="chatter.referral.n1.bonus2" defaultMessage="$4 when they reach $50 in client earnings" />
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-purple-500 flex-shrink-0" />
                          <FormattedMessage id="chatter.referral.n1.bonus3" defaultMessage="5% of their monthly client earnings (forever)" />
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* N2 - Second level */}
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl p-5 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold">N2</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 dark:text-white mb-2">
                        <FormattedMessage id="chatter.referral.n2.title" defaultMessage="Their Sponsors (Level 2)" />
                      </h4>
                      <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          <FormattedMessage id="chatter.referral.n2.bonus1" defaultMessage="$2 when they reach $50 in client earnings" />
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          <FormattedMessage id="chatter.referral.n2.bonus2" defaultMessage="Automatic tracking - no extra work needed" />
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Tier bonuses */}
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-2xl p-5 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 flex items-center justify-center flex-shrink-0">
                      <Gift className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 dark:text-white mb-2">
                        <FormattedMessage id="chatter.referral.tier.title" defaultMessage="Tier Bonuses" />
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                        <div className="bg-white/50 dark:bg-white/10 rounded-xl p-3">
                          <div className="text-lg font-bold text-amber-600">$25</div>
                          <div className="text-xs text-gray-500">5 <FormattedMessage id="chatter.referral.tier.active" defaultMessage="active" /></div>
                        </div>
                        <div className="bg-white/50 dark:bg-white/10 rounded-xl p-3">
                          <div className="text-lg font-bold text-amber-600">$75</div>
                          <div className="text-xs text-gray-500">10 <FormattedMessage id="chatter.referral.tier.active" defaultMessage="active" /></div>
                        </div>
                        <div className="bg-white/50 dark:bg-white/10 rounded-xl p-3">
                          <div className="text-lg font-bold text-amber-600">$200</div>
                          <div className="text-xs text-gray-500">25 <FormattedMessage id="chatter.referral.tier.active" defaultMessage="active" /></div>
                        </div>
                        <div className="bg-white/50 dark:bg-white/10 rounded-xl p-3">
                          <div className="text-lg font-bold text-amber-600">$500</div>
                          <div className="text-xs text-gray-500">50 <FormattedMessage id="chatter.referral.tier.active" defaultMessage="active" /></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* PIONEER EARLY ADOPTER - FOMO Section */}
        {/* ============================================================== */}
        <section className="py-16 md:py-24 px-4 bg-gradient-to-br from-red-600 via-orange-500 to-yellow-500 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/pattern-dots.svg')] opacity-10" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-yellow-400/20 rounded-full blur-3xl" />

          <div className="max-w-5xl mx-auto relative z-10">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold mb-6 animate-pulse">
                <Timer className="w-4 h-4" />
                <FormattedMessage id="chatter.pioneer.badge" defaultMessage="Limited Spots Available" />
              </div>
              <h2 className="text-3xl md:text-5xl font-black mb-4">
                <FormattedMessage id="chatter.pioneer.title" defaultMessage="Become a Pioneer" />
              </h2>
              <p className="text-xl text-white/90 max-w-2xl mx-auto">
                <FormattedMessage id="chatter.pioneer.subtitle" defaultMessage="First 100 chatters per country to reach $50 get +50% LIFETIME bonus on all referral earnings" />
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-10">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 text-center border border-white/20">
                <Crown className="w-12 h-12 mx-auto mb-4 text-yellow-300" />
                <div className="text-4xl font-black mb-2">+50%</div>
                <div className="text-sm text-white/80">
                  <FormattedMessage id="chatter.pioneer.bonus.1" defaultMessage="On ALL referral commissions" />
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 text-center border border-white/20">
                <BadgeCheck className="w-12 h-12 mx-auto mb-4 text-yellow-300" />
                <div className="text-4xl font-black mb-2">
                  <FormattedMessage id="chatter.pioneer.bonus.2.value" defaultMessage="Forever" />
                </div>
                <div className="text-sm text-white/80">
                  <FormattedMessage id="chatter.pioneer.bonus.2" defaultMessage="Lifetime benefit - never expires" />
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 text-center border border-white/20">
                <Globe className="w-12 h-12 mx-auto mb-4 text-yellow-300" />
                <div className="text-4xl font-black mb-2">100</div>
                <div className="text-sm text-white/80">
                  <FormattedMessage id="chatter.pioneer.bonus.3" defaultMessage="Spots per country only" />
                </div>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={() => navigate(registerRoute)}
                className="group bg-white text-red-600 font-bold px-10 py-5 rounded-2xl text-xl inline-flex items-center justify-center gap-3 hover:bg-gray-100 transition-all shadow-2xl"
              >
                <Rocket className="w-6 h-6" />
                <FormattedMessage id="chatter.pioneer.cta" defaultMessage="Claim Your Pioneer Spot" />
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>
              <p className="mt-4 text-white/70 text-sm">
                <FormattedMessage id="chatter.pioneer.note" defaultMessage="Spots are filling fast. Don't miss this opportunity!" />
              </p>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* EARNINGS CALCULATOR */}
        {/* ============================================================== */}
        <section className="py-16 md:py-24 px-4 bg-gradient-to-b from-gray-100 to-white dark:from-gray-900 dark:to-gray-950">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-sm font-semibold mb-4">
                <DollarSign className="w-4 h-4" />
                <FormattedMessage id="chatter.calc.badge" defaultMessage="Interactive Tool" />
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white mb-4">
                <FormattedMessage id="chatter.calc.section.title" defaultMessage="Calculate Your Earnings" />
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                <FormattedMessage id="chatter.calc.section.subtitle" defaultMessage="See how much you could earn based on your activity" />
              </p>
            </div>

            <EarningsCalculator />
          </div>
        </section>

        {/* ============================================================== */}
        {/* SUCCESS STORIES - Social Proof */}
        {/* ============================================================== */}
        <section className="py-16 md:py-24 px-4 bg-white dark:bg-gray-950">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-sm font-semibold mb-4">
                <Users className="w-4 h-4" />
                <FormattedMessage id="chatter.stories.badge" defaultMessage="Real Chatters, Real Results" />
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white mb-4">
                <FormattedMessage id="chatter.stories.title" defaultMessage="Success Stories" />
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                <FormattedMessage id="chatter.stories.subtitle" defaultMessage="Join thousands earning worldwide" />
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {successStories.map((story, idx) => (
                <div
                  key={idx}
                  className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center text-2xl">
                      {story.avatar}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-gray-900 dark:text-white">{story.name}</div>
                      <div className="text-sm text-gray-500">{story.country}</div>
                    </div>
                    {story.highlight && (
                      <span className="px-3 py-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-xs font-bold rounded-full">
                        {story.highlight}
                      </span>
                    )}
                  </div>

                  <div className="flex items-end justify-between mb-3">
                    <div>
                      <div className="text-3xl font-black bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
                        {story.monthly}
                      </div>
                      <div className="text-xs text-gray-500">
                        <FormattedMessage id="chatter.stories.perMonth" defaultMessage="/month" />
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      story.badge === 'Diamond' ? 'bg-purple-100 text-purple-700' :
                      story.badge === 'Platinum' ? 'bg-cyan-100 text-cyan-700' :
                      story.badge === 'Gold' ? 'bg-yellow-100 text-yellow-700' :
                      story.badge === 'Silver' ? 'bg-gray-200 text-gray-700' :
                      story.badge === 'Pioneer' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {story.badge}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400 italic">"{story.story}"</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* HOW IT WORKS - Simple Steps */}
        {/* ============================================================== */}
        <section id="how-it-works" className="py-16 md:py-24 px-4 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm font-semibold mb-4">
                <Zap className="w-4 h-4" />
                <FormattedMessage id="chatter.steps.badge" defaultMessage="Quick Start" />
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white mb-4">
                <FormattedMessage id="chatter.steps.title" defaultMessage="Start in 3 Steps" />
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-red-500/30">
                  1
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  <FormattedMessage id="chatter.step.1.title" defaultMessage="Sign Up Free" />
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  <FormattedMessage id="chatter.step.1.desc" defaultMessage="Create your account and pass a quick quiz (85% to pass). Takes 5 minutes." />
                </p>
              </div>

              {/* Step 2 */}
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-orange-500/30">
                  2
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  <FormattedMessage id="chatter.step.2.title" defaultMessage="Get Your Links" />
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  <FormattedMessage id="chatter.step.2.desc" defaultMessage="Receive your unique client link, lawyer recruitment link, and chatter sponsor link." />
                </p>
              </div>

              {/* Step 3 */}
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-amber-500/30">
                  3
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  <FormattedMessage id="chatter.step.3.title" defaultMessage="Share & Earn" />
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  <FormattedMessage id="chatter.step.3.desc" defaultMessage="Chat naturally, share when relevant, watch your earnings grow. Withdraw anytime." />
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* LEVEL SYSTEM */}
        {/* ============================================================== */}
        <section className="py-16 md:py-24 px-4 bg-white dark:bg-gray-950">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-sm font-semibold mb-4">
                <Award className="w-4 h-4" />
                <FormattedMessage id="chatter.levels.badge" defaultMessage="Gamification" />
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white mb-4">
                <FormattedMessage id="chatter.levels.title" defaultMessage="Level Up, Earn More" />
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                <FormattedMessage id="chatter.levels.subtitle" defaultMessage="Your bonus increases as you grow" />
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {levels.map((level, idx) => (
                <div
                  key={idx}
                  className="relative group"
                >
                  <div className={`absolute inset-0 bg-gradient-to-r ${level.color} rounded-2xl blur-lg opacity-20 group-hover:opacity-40 transition-opacity`} />
                  <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-4 md:p-6 text-center border border-gray-100 dark:border-gray-700">
                    <div className="text-3xl md:text-4xl mb-2">{level.icon}</div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm md:text-base">{level.name}</h4>
                    <div className={`text-2xl md:text-3xl font-black bg-gradient-to-r ${level.color} bg-clip-text text-transparent`}>
                      {level.bonus}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{level.earnings}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* PAYMENT METHODS */}
        {/* ============================================================== */}
        <section className="py-16 md:py-24 px-4 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-semibold mb-4">
                <Wallet className="w-4 h-4" />
                <FormattedMessage id="chatter.payment.badge" defaultMessage="Get Paid Your Way" />
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white mb-4">
                <FormattedMessage id="chatter.payment.title" defaultMessage="Withdraw Worldwide" />
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                <FormattedMessage id="chatter.payment.subtitle" defaultMessage="$25 minimum • Processed in 48 hours" />
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {paymentMethods.map((method, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-gray-800 rounded-2xl p-4 text-center border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow"
                >
                  <div className="text-3xl mb-2">{method.icon}</div>
                  <div className="font-semibold text-gray-900 dark:text-white text-sm">{method.name}</div>
                  <div className="text-xs text-gray-500">{method.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* NO SPAM GUARANTEE */}
        {/* ============================================================== */}
        <section className="py-12 md:py-16 px-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Ban className="w-8 h-8" />
              <h3 className="text-2xl md:text-3xl font-bold">
                <FormattedMessage id="chatter.nospam.title" defaultMessage="No Spam Required. Ever." />
              </h3>
            </div>
            <p className="text-lg text-white/90 max-w-2xl mx-auto">
              <FormattedMessage id="chatter.nospam.desc" defaultMessage="We don't want spammers. The best chatters have authentic conversations and share their link naturally when it makes sense. Quality beats quantity every time." />
            </p>
          </div>
        </section>

        {/* ============================================================== */}
        {/* FAQ SECTION */}
        {/* ============================================================== */}
        <section className="py-16 md:py-24 px-4 bg-white dark:bg-gray-950" itemScope itemType="https://schema.org/FAQPage">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm font-semibold mb-4">
                <HelpCircle className="w-4 h-4" />
                <FormattedMessage id="chatter.faq.badge" defaultMessage="Got Questions?" />
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white mb-4">
                <FormattedMessage id="chatter.faq.title" defaultMessage="FAQ" />
              </h2>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden"
                  itemScope
                  itemProp="mainEntity"
                  itemType="https://schema.org/Question"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full flex items-center justify-between p-5 text-left"
                  >
                    <h3 className="font-semibold text-gray-900 dark:text-white pr-4" itemProp="name">
                      {faq.question}
                    </h3>
                    <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform flex-shrink-0 ${openFaq === idx ? 'rotate-180' : ''}`} />
                  </button>
                  {openFaq === idx && (
                    <div
                      className="px-5 pb-5 text-gray-600 dark:text-gray-300"
                      itemScope
                      itemProp="acceptedAnswer"
                      itemType="https://schema.org/Answer"
                    >
                      <p itemProp="text">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* FINAL CTA - Maximum Impact */}
        {/* ============================================================== */}
        <section className="py-20 md:py-32 px-4 bg-gradient-to-br from-red-600 via-orange-500 to-yellow-500 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute bottom-10 right-10 w-48 h-48 bg-yellow-400/20 rounded-full blur-3xl" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full mb-6">
              <Sparkles className="w-5 h-5 text-yellow-300" />
              <span className="font-semibold">
                <FormattedMessage id="chatter.finalcta.badge" defaultMessage="Start Today, Earn Tomorrow" />
              </span>
            </div>

            <h2 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
              <FormattedMessage id="chatter.finalcta.title" defaultMessage="Your Network Is Your Net Worth" />
            </h2>

            <p className="text-xl md:text-2xl text-white/90 mb-10 max-w-2xl mx-auto">
              <FormattedMessage id="chatter.finalcta.subtitle" defaultMessage="Join 2,847+ chatters already earning. $10/client, $5/lawyer call, unlimited referral bonuses. What are you waiting for?" />
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <button
                onClick={() => navigate(registerRoute)}
                className="w-full sm:w-auto group bg-white text-red-600 font-bold px-10 py-5 rounded-2xl text-xl flex items-center justify-center gap-3 hover:bg-gray-100 transition-all shadow-2xl animate-pulse-glow"
              >
                <Rocket className="w-7 h-7" />
                <FormattedMessage id="chatter.finalcta.button" defaultMessage="Become a Chatter Now" />
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-sm text-white/80">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-300" />
                <FormattedMessage id="chatter.finalcta.trust.1" defaultMessage="100% Free" />
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-300" />
                <FormattedMessage id="chatter.finalcta.trust.2" defaultMessage="No Experience Needed" />
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-300" />
                <FormattedMessage id="chatter.finalcta.trust.3" defaultMessage="Worldwide" />
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-300" />
                <FormattedMessage id="chatter.finalcta.trust.4" defaultMessage="Mobile Money Ready" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default ChatterLanding;
