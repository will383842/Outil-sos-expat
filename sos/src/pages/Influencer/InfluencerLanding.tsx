/**
 * InfluencerLanding - Elite Mobile-First Landing Page 2026
 *
 * OBJECTIFS:
 * - Comprendre en 3 secondes ce qu'on doit faire
 * - Savoir qu'on peut gagner de l'argent rapidement
 * - Voir que c'est SIMPLE : promouvoir SOS-Expat sur YouTube, Instagram, TikTok
 * - Avocat OU Expatrié Aidant (pas juste avocat)
 * - Mobile-first d'exception
 * - CIBLER tous les influenceurs du monde (toutes nationalités, toutes langues)
 *
 * AMÉLIORATIONS v2:
 * - Section "Who Can Join?" avec 8 profils d'influenceurs détaillés
 * - YouTube Highlight Box (comme Facebook Groups pour Chatter)
 * - Calculateur de gains interactif
 * - 8 exemples de contenu (2 par plateforme)
 * - Section "Why Your Followers Need SOS-Expat"
 * - Section "Content Types That Convert Best"
 * - Build a Network Section
 * - Plus de méthodes de paiement (Mobile Money)
 * - Statistics/Social Proof Section
 * - Section "Exclusive Benefits for Your Community"
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
  Globe,
  ChevronDown,
  DollarSign,
  Clock,
  Smartphone,
  Zap,
  Target,
  UserPlus,
  Rocket,
  Sparkles,
  ArrowDown,
  Phone,
  Network,
  MessageSquare,
  Wallet,
  Star,
  Video,
  Image,
  Share2,
  Youtube,
  Instagram,
  Percent,
  Crown,
  QrCode,
  TrendingUp,
  Calculator,
  Play,
  Camera,
  Mic,
  Heart,
  Eye,
  MousePointer,
  BadgeCheck,
  Flame,
  Timer,
  ShieldCheck,
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
const InfluencerLanding: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const location = useLocation();
  const { language } = useApp();
  const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);

  // Scroll detection for sticky CTA
  useEffect(() => {
    const handleScroll = () => {
      setShowStickyBar(window.scrollY > 600);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Calculator state
  const [calcVideos, setCalcVideos] = useState(4);
  const [calcViewsPerVideo, setCalcViewsPerVideo] = useState(5000);
  const [calcClickRate, setCalcClickRate] = useState(2);
  const [calcConversionRate, setCalcConversionRate] = useState(5);

  // Realistic calculation
  const monthlyViews = calcVideos * calcViewsPerVideo;
  const monthlyClicks = Math.floor((monthlyViews * calcClickRate) / 100);
  const monthlyClients = Math.floor((monthlyClicks * calcConversionRate) / 100);
  const monthlyEarnings = monthlyClients * 10;

  const registerRoute = `/${getTranslatedRouteSlug('influencer-register' as RouteKey, langCode)}`;

  // SEO
  const seoTitle = intl.formatMessage({
    id: 'influencer.landing.seo.title',
    defaultMessage: 'Become a SOS-Expat Influencer | Earn $10/client helping people find legal help'
  });
  const seoDescription = intl.formatMessage({
    id: 'influencer.landing.seo.description',
    defaultMessage: 'Promote SOS-Expat on YouTube, Instagram, TikTok. Earn $10 per client, $5 per lawyer/helper partner. Promo tools included. Withdraw via Wise or PayPal.'
  });

  // FAQ
  const faqs = [
    {
      question: intl.formatMessage({ id: 'influencer.faq.q1', defaultMessage: "What exactly do I have to do as an Influencer?" }),
      answer: intl.formatMessage({ id: 'influencer.faq.a1', defaultMessage: "Create content about expat life, travel, or immigration on YouTube, Instagram, TikTok or your blog. Include your unique affiliate link. When your followers call a lawyer or expat helper, you earn $10. That's it!" }),
    },
    {
      question: intl.formatMessage({ id: 'influencer.faq.q2', defaultMessage: "How much can I realistically earn?" }),
      answer: intl.formatMessage({ id: 'influencer.faq.a2', defaultMessage: "It depends on your audience size. 10 clients = $100. 50 clients = $500. Some influencers earn $1000-5000/month by finding lawyer/helper partners and earning $5 per call they receive." }),
    },
    {
      question: intl.formatMessage({ id: 'influencer.faq.q3', defaultMessage: "What is an 'expat helper'?" }),
      answer: intl.formatMessage({ id: 'influencer.faq.a3', defaultMessage: "Expat helpers are experienced expats who provide practical advice and guidance. They're not lawyers, but they know the local system well and can help with everyday questions about visas, administration, housing, etc." }),
    },
    {
      question: intl.formatMessage({ id: 'influencer.faq.q4', defaultMessage: "What promo tools do I get?" }),
      answer: intl.formatMessage({ id: 'influencer.faq.a4', defaultMessage: "You get ready-made banners, interactive widgets for your website, personalized QR codes, promo texts in 9 languages, and high-quality logos. Everything you need to promote professionally." }),
    },
    {
      question: intl.formatMessage({ id: 'influencer.faq.q5', defaultMessage: "How and when do I get paid?" }),
      answer: intl.formatMessage({ id: 'influencer.faq.a5', defaultMessage: "Withdraw anytime once you reach $50. We support Wise, PayPal, Mobile Money, and bank transfers. Payments processed within 48 hours." }),
    },
    {
      question: intl.formatMessage({ id: 'influencer.faq.q6', defaultMessage: "What discount do my followers get?" }),
      answer: intl.formatMessage({ id: 'influencer.faq.a6', defaultMessage: "Your followers automatically get 5% off their first call when they use your link. It's an exclusive benefit for your community!" }),
    },
    {
      question: intl.formatMessage({ id: 'influencer.faq.q7', defaultMessage: "What audience size do I need?" }),
      answer: intl.formatMessage({ id: 'influencer.faq.a7', defaultMessage: "There's no minimum! Micro-influencers with 1,000 engaged followers often convert better than mega-influencers. It's about engagement, not size. Quality over quantity!" }),
    },
    {
      question: intl.formatMessage({ id: 'influencer.faq.q8', defaultMessage: "Can I recruit lawyers or helpers?" }),
      answer: intl.formatMessage({ id: 'influencer.faq.a8', defaultMessage: "Yes! Find lawyers or expat helpers to join the platform. You earn $5 for every call they receive during their first 6 months. It's passive income from their success!" }),
    },
  ];

  // Platforms where influencers can promote
  const platforms = [
    { name: 'YouTube', icon: '🎬', desc: intl.formatMessage({ id: 'influencer.platform.youtube', defaultMessage: 'Video content & tutorials' }), highlight: true },
    { name: 'Instagram', icon: '📸', desc: intl.formatMessage({ id: 'influencer.platform.instagram', defaultMessage: 'Stories & Reels' }) },
    { name: 'TikTok', icon: '🎵', desc: intl.formatMessage({ id: 'influencer.platform.tiktok', defaultMessage: 'Short-form videos' }) },
    { name: intl.formatMessage({ id: 'influencer.platform.blog.name', defaultMessage: 'Your Blog' }), icon: '📝', desc: intl.formatMessage({ id: 'influencer.platform.blog', defaultMessage: 'SEO articles' }) },
    { name: 'Twitter/X', icon: '🐦', desc: intl.formatMessage({ id: 'influencer.platform.twitter', defaultMessage: 'Quick tips & threads' }) },
    { name: 'Facebook', icon: '👤', desc: intl.formatMessage({ id: 'influencer.platform.facebook', defaultMessage: 'Page & Groups' }) },
  ];

  // Promo tools
  const promoTools = [
    { name: intl.formatMessage({ id: 'influencer.tools.banners', defaultMessage: 'Banners' }), icon: '🖼️' },
    { name: intl.formatMessage({ id: 'influencer.tools.widgets', defaultMessage: 'Widgets' }), icon: '🔧', highlight: true },
    { name: intl.formatMessage({ id: 'influencer.tools.qrcodes', defaultMessage: 'QR Codes' }), icon: '📱' },
    { name: intl.formatMessage({ id: 'influencer.tools.texts', defaultMessage: 'Promo Texts' }), icon: '📝' },
    { name: intl.formatMessage({ id: 'influencer.tools.logos', defaultMessage: 'HD Logos' }), icon: '✨' },
  ];

  // Content types that convert best
  const contentTypes = [
    { name: intl.formatMessage({ id: 'influencer.content.visaguide', defaultMessage: 'Visa Guides' }), icon: '📋', desc: intl.formatMessage({ id: 'influencer.content.visaguide.desc', defaultMessage: 'Country-specific visa tutorials' }), highlight: true },
    { name: intl.formatMessage({ id: 'influencer.content.qa', defaultMessage: 'Q&A Sessions' }), icon: '❓', desc: intl.formatMessage({ id: 'influencer.content.qa.desc', defaultMessage: 'Answer expat questions live' }), highlight: true },
    { name: intl.formatMessage({ id: 'influencer.content.dayinlife', defaultMessage: 'Day in the Life' }), icon: '🌅', desc: intl.formatMessage({ id: 'influencer.content.dayinlife.desc', defaultMessage: 'Expat daily life vlogs' }) },
    { name: intl.formatMessage({ id: 'influencer.content.tips', defaultMessage: 'Quick Tips' }), icon: '💡', desc: intl.formatMessage({ id: 'influencer.content.tips.desc', defaultMessage: 'Short travel/legal tips' }) },
    { name: intl.formatMessage({ id: 'influencer.content.moving', defaultMessage: 'Moving Abroad' }), icon: '🚚', desc: intl.formatMessage({ id: 'influencer.content.moving.desc', defaultMessage: 'Relocation guides' }) },
    { name: intl.formatMessage({ id: 'influencer.content.costliving', defaultMessage: 'Cost of Living' }), icon: '💰', desc: intl.formatMessage({ id: 'influencer.content.costliving.desc', defaultMessage: 'City comparisons' }) },
    { name: intl.formatMessage({ id: 'influencer.content.emergency', defaultMessage: 'Emergency Tips' }), icon: '🆘', desc: intl.formatMessage({ id: 'influencer.content.emergency.desc', defaultMessage: 'What to do when...' }) },
    { name: intl.formatMessage({ id: 'influencer.content.storytime', defaultMessage: 'Story Time' }), icon: '📖', desc: intl.formatMessage({ id: 'influencer.content.storytime.desc', defaultMessage: 'Personal expat stories' }) },
  ];

  // Payment methods - EXPANDED like Chatter
  const paymentMethods = [
    { name: 'Wise', icon: '🌐' },
    { name: 'PayPal', icon: '💳' },
    { name: 'Orange Money', icon: '🟠' },
    { name: 'Wave', icon: '🌊' },
    { name: 'MTN MoMo', icon: '💛' },
    { name: 'M-Pesa', icon: '💚' },
    { name: 'Bank', icon: '🏦' },
  ];

  return (
    <Layout>
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        ogImage="/og-influencer-2026.jpg"
        ogType="website"
        contentType="LandingPage"
      />
      <HreflangLinks pathname={location.pathname} />
      <FAQPageSchema faqs={faqs} pageTitle={seoTitle} />

      {/* Custom styles - 11 Premium Animations */}
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.4), 0 0 40px rgba(239, 68, 68, 0.2); }
          50% { box-shadow: 0 0 40px rgba(239, 68, 68, 0.6), 0 0 80px rgba(239, 68, 68, 0.3); }
        }
        @keyframes pulse-glow-orange {
          0%, 100% { box-shadow: 0 0 20px rgba(249, 115, 22, 0.4), 0 0 40px rgba(249, 115, 22, 0.2); }
          50% { box-shadow: 0 0 40px rgba(249, 115, 22, 0.6), 0 0 80px rgba(249, 115, 22, 0.3); }
        }
        @keyframes pulse-glow-red {
          0%, 100% { box-shadow: 0 0 30px rgba(239, 68, 68, 0.5), 0 0 60px rgba(220, 38, 38, 0.3); }
          50% { box-shadow: 0 0 50px rgba(239, 68, 68, 0.7), 0 0 100px rgba(220, 38, 38, 0.4); }
        }
        .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
        .animate-pulse-glow-orange { animation: pulse-glow-orange 2s ease-in-out infinite; }
        .animate-pulse-glow-red { animation: pulse-glow-red 2s ease-in-out infinite; }

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

        /* Mobile-first optimizations */
        @media (max-width: 768px) {
          .hero-title { font-size: 2.5rem !important; line-height: 1.1 !important; }
        }
      `}</style>

      <div className="min-h-screen bg-white dark:bg-gray-950">

        {/* ============================================================== */}
        {/* HERO - Premium Mobile-First with Animations */}
        {/* ============================================================== */}
        <section className="relative min-h-[100svh] flex items-center justify-center overflow-hidden">
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-red-900 via-red-600 to-orange-500 animate-gradient" />

          {/* Floating money decorations */}
          <FloatingMoney />

          {/* Glassmorphism overlays */}
          <div className="absolute top-10 -left-20 w-72 h-72 bg-yellow-400/20 rounded-full blur-3xl" />
          <div className="absolute bottom-10 -right-20 w-96 h-96 bg-orange-400/30 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500/10 rounded-full blur-3xl" />

          {/* Platform icons floating */}
          <div className="absolute top-20 right-20 text-5xl opacity-20 animate-float">🎬</div>
          <div className="absolute top-40 left-20 text-4xl opacity-20 animate-float" style={{ animationDelay: '0.5s' }}>📸</div>
          <div className="absolute bottom-40 right-40 text-4xl opacity-20 animate-float" style={{ animationDelay: '1s' }}>🎵</div>

          <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 text-center text-white">
            {/* Badge - Social proof with flags */}
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/20 backdrop-blur-md rounded-full mb-6 border border-white/30 animate-scale-in">
              <div className="flex -space-x-2">
                {['🇺🇸', '🇬🇧', '🇪🇸', '🇩🇪'].map((flag, i) => (
                  <span key={i} className="text-lg">{flag}</span>
                ))}
              </div>
              <span className="font-bold text-sm">
                <AnimatedCounter end={847} suffix="+" className="font-black" />
                <FormattedMessage id="influencer.hero.badge" defaultMessage=" Influencers worldwide" />
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
                  <FormattedMessage id="influencer.hero.earn" defaultMessage="Earn" /> $10
                </span>
                <span className="block text-white text-3xl md:text-5xl lg:text-6xl mt-2 font-bold">
                  <FormattedMessage id="influencer.hero.perClient" defaultMessage="Per Client Referred" />
                </span>
              </h1>
            </div>

            {/* Subtitle - CE QUE TU FAIS */}
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto mb-4 font-medium">
              <FormattedMessage
                id="influencer.hero.subtitle"
                defaultMessage="YouTube, Instagram, TikTok, Blog... Promote SOS-Expat to your followers. Get banners, widgets, QR codes. Your followers get 5% off!"
              />
            </p>

            {/* Ultra simple explanation */}
            <div className="bg-white/15 backdrop-blur-xl rounded-3xl p-5 md:p-8 max-w-2xl mx-auto mb-8 border border-white/30">
              <p className="text-lg md:text-xl font-semibold">
                <FormattedMessage
                  id="influencer.hero.simple"
                  defaultMessage="Your job: Create content → Share your link → Followers call → You earn $10"
                />
              </p>
            </div>

            {/* MEGA CTA */}
            <button
              onClick={() => navigate(registerRoute)}
              className="group relative bg-gradient-to-r from-white to-gray-100 text-red-600 font-black px-10 py-6 rounded-2xl text-xl md:text-2xl inline-flex items-center gap-4 hover:from-gray-50 hover:to-white transition-all shadow-2xl animate-pulse-glow overflow-hidden"
            >
              <div className="absolute inset-0 animate-shimmer" />
              <Rocket className="w-8 h-8 relative z-10" />
              <span className="relative z-10">
                <FormattedMessage id="influencer.hero.cta" defaultMessage="Become an Influencer - It's Free" />
              </span>
              <ArrowRight className="w-7 h-7 group-hover:translate-x-2 transition-transform relative z-10" />
            </button>

            {/* Quick trust */}
            <div className="flex flex-wrap justify-center gap-3 mt-8 text-sm">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                <Globe className="w-4 h-4" />
                <FormattedMessage id="influencer.hero.trust.1" defaultMessage="All Countries" />
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                <Percent className="w-4 h-4" />
                <FormattedMessage id="influencer.hero.trust.2" defaultMessage="5% Off for Followers" />
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                <Image className="w-4 h-4" />
                <FormattedMessage id="influencer.hero.trust.3" defaultMessage="Promo Tools Included" />
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                <Users className="w-4 h-4" />
                <FormattedMessage id="influencer.hero.trust.4" defaultMessage="No Min Followers" />
              </div>
            </div>

            {/* Scroll indicator */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce-slow">
              <ArrowDown className="w-8 h-8 text-white/60" />
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* TON RÔLE - Ultra simple, 3 étapes */}
        {/* ============================================================== */}
        <section className="py-16 md:py-24 px-4 bg-white dark:bg-gray-950">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-sm font-semibold mb-4">
                <Target className="w-4 h-4" />
                <FormattedMessage id="influencer.role.badge" defaultMessage="Your Mission" />
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white mb-4">
                <FormattedMessage id="influencer.role.title" defaultMessage="It's Super Simple" />
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                <FormattedMessage id="influencer.role.subtitle" defaultMessage="Use your existing audience. We give you all the tools." />
              </p>
            </div>

            {/* 3 Steps - MOBILE FIRST */}
            <div className="space-y-6 md:space-y-0 md:grid md:grid-cols-3 md:gap-8">
              {/* Step 1 */}
              <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-3xl p-6 md:p-8 border border-red-100 dark:border-red-800 relative">
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg">
                  1
                </div>
                <div className="pt-4">
                  <div className="w-16 h-16 bg-red-100 dark:bg-red-800 rounded-2xl flex items-center justify-center mb-4">
                    <Video className="w-8 h-8 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    <FormattedMessage id="influencer.step1.title" defaultMessage="Create Content" />
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    <FormattedMessage id="influencer.step1.desc" defaultMessage="Make videos about expat life, travel tips, visa advice, living abroad. Use our banners and promo texts to promote SOS-Expat naturally." />
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-full text-xs font-bold">
                      YouTube
                    </span>
                    <span className="px-3 py-1 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300 rounded-full text-xs font-medium">
                      Instagram
                    </span>
                    <span className="px-3 py-1 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300 rounded-full text-xs font-medium">TikTok</span>
                    <span className="px-3 py-1 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300 rounded-full text-xs font-medium">Blog</span>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-3xl p-6 md:p-8 border border-purple-100 dark:border-purple-800 relative">
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg">
                  2
                </div>
                <div className="pt-4">
                  <div className="w-16 h-16 bg-purple-100 dark:bg-purple-800 rounded-2xl flex items-center justify-center mb-4">
                    <Share2 className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    <FormattedMessage id="influencer.step2.title" defaultMessage="Share Your Link" />
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    <FormattedMessage id="influencer.step2.desc" defaultMessage="Add your unique affiliate link in video descriptions, bio, stories. Your followers get 5% off their first call - exclusive benefit!" />
                  </p>
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-purple-200 dark:border-purple-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                      "<FormattedMessage id="influencer.step2.example" defaultMessage="Link in bio for 5% off your first call with a lawyer or expat helper!" />"
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-3xl p-6 md:p-8 border border-green-100 dark:border-green-800 relative">
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg">
                  3
                </div>
                <div className="pt-4">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-800 rounded-2xl flex items-center justify-center mb-4">
                    <DollarSign className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    <FormattedMessage id="influencer.step3.title" defaultMessage="Get Paid $10" />
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    <FormattedMessage id="influencer.step3.desc" defaultMessage="When followers make a call through your link, you earn $10. Withdraw anytime via Wise, PayPal, Mobile Money, or bank transfer." />
                  </p>
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-bold text-lg">
                    <CheckCircle className="w-5 h-5" />
                    <FormattedMessage id="influencer.step3.note" defaultMessage="No limit on earnings!" />
                  </div>
                </div>
              </div>
            </div>

            {/* Important note: Lawyer OR Expat Helper */}
            <div className="mt-12 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-3xl p-6 md:p-8 border border-amber-200 dark:border-amber-800">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="w-14 h-14 bg-amber-100 dark:bg-amber-800 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-7 h-7 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    <FormattedMessage id="influencer.note.title" defaultMessage="Lawyers AND Expat Helpers" />
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    <FormattedMessage id="influencer.note.desc" defaultMessage="SOS-Expat connects people with professional lawyers AND experienced expat helpers. Lawyers for legal matters, expat helpers for practical advice. Both available instantly by phone, worldwide." />
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* WHO CAN JOIN? - Target profiles (NEW SECTION) */}
        {/* ============================================================== */}
        <section className="py-16 md:py-24 px-4 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full text-sm font-semibold mb-4">
                <Network className="w-4 h-4" />
                <FormattedMessage id="influencer.profiles.badge" defaultMessage="For All Content Creators" />
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white mb-4">
                <FormattedMessage id="influencer.profiles.title" defaultMessage="Who Can Join?" />
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                <FormattedMessage id="influencer.profiles.subtitle" defaultMessage="YouTubers, Instagrammers, TikTokers, Bloggers... If your audience travels or lives abroad, SOS-Expat is perfect for you!" />
              </p>
            </div>

            {/* Profile cards grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {/* Travel YouTuber */}
              <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all ring-2 ring-red-400/50">
                <div className="absolute -top-2 -right-2 px-2 py-1 bg-red-500 text-white rounded-full text-xs font-bold">
                  TOP
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-orange-400 rounded-xl flex items-center justify-center text-white mb-4 text-2xl">
                  🎬
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                  <FormattedMessage id="influencer.profiles.youtuber.title" defaultMessage="Travel YouTubers" />
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <FormattedMessage id="influencer.profiles.youtuber.desc" defaultMessage="Video descriptions are perfect for affiliate links. Your viewers trust your recommendations!" />
                </p>
              </div>

              {/* Expat Vlogger */}
              <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all ring-2 ring-green-400/50">
                <div className="absolute -top-2 -right-2 px-2 py-1 bg-green-500 text-white rounded-full text-xs font-bold">
                  BEST
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-400 rounded-xl flex items-center justify-center text-white mb-4 text-2xl">
                  🌍
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                  <FormattedMessage id="influencer.profiles.expatvlogger.title" defaultMessage="Expat Vloggers" />
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <FormattedMessage id="influencer.profiles.expatvlogger.desc" defaultMessage="You live abroad. Your audience faces the same challenges. Perfect fit = high conversion!" />
                </p>
              </div>

              {/* Digital Nomad Creator */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-400 rounded-xl flex items-center justify-center text-white mb-4 text-2xl">
                  💻
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                  <FormattedMessage id="influencer.profiles.nomad.title" defaultMessage="Digital Nomad Creators" />
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <FormattedMessage id="influencer.profiles.nomad.desc" defaultMessage="Your audience NEEDS visa info! Digital nomad visa content = high conversion rates." />
                </p>
              </div>

              {/* Travel Photographers */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all">
                <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-rose-400 rounded-xl flex items-center justify-center text-white mb-4 text-2xl">
                  📸
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                  <FormattedMessage id="influencer.profiles.photographer.title" defaultMessage="Travel Photographers" />
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <FormattedMessage id="influencer.profiles.photographer.desc" defaultMessage="Instagram, Pinterest... Your visual content + our link = passive income." />
                </p>
              </div>

              {/* Immigration Advisors */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center text-white mb-4 text-2xl">
                  ⚖️
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                  <FormattedMessage id="influencer.profiles.advisor.title" defaultMessage="Immigration Advisors" />
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <FormattedMessage id="influencer.profiles.advisor.desc" defaultMessage="Share your expertise and help your audience find professional legal help when needed." />
                </p>
              </div>

              {/* Lifestyle Influencers */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-400 rounded-xl flex items-center justify-center text-white mb-4 text-2xl">
                  ✨
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                  <FormattedMessage id="influencer.profiles.lifestyle.title" defaultMessage="Lifestyle Influencers" />
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <FormattedMessage id="influencer.profiles.lifestyle.desc" defaultMessage="Your audience dreams of traveling or moving abroad. Help them take the leap!" />
                </p>
              </div>

              {/* Country-specific Creators */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all">
                <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-cyan-400 rounded-xl flex items-center justify-center text-white mb-4 text-2xl">
                  🇪🇸
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                  <FormattedMessage id="influencer.profiles.country.title" defaultMessage="Country-specific Creators" />
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <FormattedMessage id="influencer.profiles.country.desc" defaultMessage="'Life in Dubai', 'Living in Portugal'... Niche audiences with high intent!" />
                </p>
              </div>

              {/* Micro-influencers */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all">
                <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-400 rounded-xl flex items-center justify-center text-white mb-4 text-2xl">
                  📱
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                  <FormattedMessage id="influencer.profiles.micro.title" defaultMessage="Micro-influencers" />
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <FormattedMessage id="influencer.profiles.micro.desc" defaultMessage="1K-50K followers? Perfect! High engagement = high conversion. Quality beats quantity." />
                </p>
              </div>
            </div>

            {/* WHY IT WORKS - value proposition */}
            <div className="mt-12 bg-gradient-to-r from-red-600 to-orange-600 rounded-3xl p-6 md:p-8 text-white">
              <div className="text-center mb-6">
                <h3 className="text-xl md:text-2xl font-bold mb-2">
                  <FormattedMessage id="influencer.profiles.why.title" defaultMessage="Why Your Followers Need SOS-Expat" />
                </h3>
              </div>
              <div className="grid md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl mb-2">📋</div>
                  <h4 className="font-semibold mb-1">
                    <FormattedMessage id="influencer.profiles.why1.title" defaultMessage="Visa Problems" />
                  </h4>
                  <p className="text-sm text-white/80">
                    <FormattedMessage id="influencer.profiles.why1.desc" defaultMessage="Expired visa, wrong documents, extension needed. Urgent help required." />
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-3xl mb-2">⚖️</div>
                  <h4 className="font-semibold mb-1">
                    <FormattedMessage id="influencer.profiles.why2.title" defaultMessage="Legal Issues" />
                  </h4>
                  <p className="text-sm text-white/80">
                    <FormattedMessage id="influencer.profiles.why2.desc" defaultMessage="Accidents, contracts, scams. Legal help abroad = urgent." />
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-3xl mb-2">🆘</div>
                  <h4 className="font-semibold mb-1">
                    <FormattedMessage id="influencer.profiles.why3.title" defaultMessage="Emergency" />
                  </h4>
                  <p className="text-sm text-white/80">
                    <FormattedMessage id="influencer.profiles.why3.desc" defaultMessage="Lost passport, arrest, hospital. Immediate assistance needed." />
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-3xl mb-2">🌍</div>
                  <h4 className="font-semibold mb-1">
                    <FormattedMessage id="influencer.profiles.why4.title" defaultMessage="Practical Help" />
                  </h4>
                  <p className="text-sm text-white/80">
                    <FormattedMessage id="influencer.profiles.why4.desc" defaultMessage="Bank account, housing, admin. Expat helpers share real experience." />
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* YOUTUBE HIGHLIGHT - Like Facebook Groups for Chatter */}
        {/* ============================================================== */}
        <section className="py-16 md:py-20 px-4 bg-gradient-to-br from-red-600 via-red-500 to-orange-500 text-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold mb-4">
                <Play className="w-4 h-4" />
                <FormattedMessage id="influencer.youtube.badge" defaultMessage="Best Platform" />
              </div>
              <h2 className="text-3xl md:text-5xl font-black mb-4">
                <FormattedMessage id="influencer.youtube.title" defaultMessage="YouTube = Your Best Friend" />
              </h2>
              <p className="text-xl text-white/90 max-w-2xl mx-auto">
                <FormattedMessage id="influencer.youtube.subtitle" defaultMessage="Long-form content builds trust. Video descriptions are perfect for affiliate links. SEO brings traffic for years." />
              </p>
            </div>

            {/* YouTube advantages */}
            <div className="grid md:grid-cols-3 gap-6 mb-10">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                  <Eye className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg mb-2">
                  <FormattedMessage id="influencer.youtube.adv1.title" defaultMessage="Long Watch Time = Trust" />
                </h3>
                <p className="text-sm text-white/80">
                  <FormattedMessage id="influencer.youtube.adv1.desc" defaultMessage="Viewers watch 10-30 minutes. They trust your recommendations more than any other platform." />
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg mb-2">
                  <FormattedMessage id="influencer.youtube.adv2.title" defaultMessage="Evergreen Traffic" />
                </h3>
                <p className="text-sm text-white/80">
                  <FormattedMessage id="influencer.youtube.adv2.desc" defaultMessage="Videos rank on YouTube and Google for years. One video = years of passive income." />
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                  <MousePointer className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg mb-2">
                  <FormattedMessage id="influencer.youtube.adv3.title" defaultMessage="Description Links" />
                </h3>
                <p className="text-sm text-white/80">
                  <FormattedMessage id="influencer.youtube.adv3.desc" defaultMessage="Clickable links in every description. 'Link in description' is natural and expected." />
                </p>
              </div>
            </div>

            {/* Video ideas that work */}
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-white/20">
              <h3 className="font-bold text-xl mb-4 text-center">
                <FormattedMessage id="influencer.youtube.ideas.title" defaultMessage="Video Ideas That Convert" />
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white/10 rounded-xl px-3 py-2 text-center text-sm">
                  <FormattedMessage id="influencer.youtube.idea1" defaultMessage="'Spain Digital Nomad Visa Guide'" />
                </div>
                <div className="bg-white/10 rounded-xl px-3 py-2 text-center text-sm">
                  <FormattedMessage id="influencer.youtube.idea2" defaultMessage="'What to Do If You're Arrested Abroad'" />
                </div>
                <div className="bg-white/10 rounded-xl px-3 py-2 text-center text-sm">
                  <FormattedMessage id="influencer.youtube.idea3" defaultMessage="'5 Legal Mistakes Expats Make'" />
                </div>
                <div className="bg-white/10 rounded-xl px-3 py-2 text-center text-sm">
                  <FormattedMessage id="influencer.youtube.idea4" defaultMessage="'Q&A: Your Visa Questions Answered'" />
                </div>
              </div>
              <p className="mt-4 text-sm text-white/70 text-center">
                <FormattedMessage id="influencer.youtube.tip" defaultMessage="Focus on problems your audience faces. Position SOS-Expat as the solution." />
              </p>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* CONTENT TYPES THAT CONVERT */}
        {/* ============================================================== */}
        <section className="py-16 md:py-20 px-4 bg-white dark:bg-gray-950">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white mb-4">
                <FormattedMessage id="influencer.content.title" defaultMessage="Content That Converts Best" />
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                <FormattedMessage id="influencer.content.subtitle" defaultMessage="Topics that work well for SOS-Expat referrals" />
              </p>
            </div>

            {/* Visa guides highlight box */}
            <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-3xl p-6 md:p-8 text-white mb-8">
              <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <span className="text-3xl">📋</span>
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl font-bold mb-1">
                    <FormattedMessage id="influencer.content.visa.title" defaultMessage="Visa & Legal Content = Best Performers" />
                  </h3>
                  <p className="text-white/80">
                    <FormattedMessage id="influencer.content.visa.desc" defaultMessage="Content about visa requirements, legal tips, and emergency situations converts best." />
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {contentTypes.map((content, idx) => (
                <div
                  key={idx}
                  className={`rounded-2xl p-4 text-center border hover:shadow-lg hover:-translate-y-1 transition-all ${
                    content.highlight
                      ? 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/30 dark:to-orange-900/30 border-red-300 dark:border-red-700 ring-2 ring-red-400/50'
                      : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
                  }`}
                >
                  <div className="text-3xl mb-2">{content.icon}</div>
                  <div className={`font-bold ${content.highlight ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-white'}`}>
                    {content.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{content.desc}</div>
                  {content.highlight && (
                    <div className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">
                      <FormattedMessage id="influencer.content.recommended" defaultMessage="High conversion!" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Example content by platform - 8 examples */}
            <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* YouTube example 1 */}
              <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-2xl p-4 border border-red-200 dark:border-red-700">
                <div className="text-2xl mb-2">🎬</div>
                <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">YouTube:</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 italic mb-2">
                  "<FormattedMessage id="influencer.example.yt1.text" defaultMessage="How I Got My Spanish Visa in 2 Weeks" />"
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 font-bold">→ $10/referral</p>
              </div>

              {/* YouTube example 2 */}
              <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-2xl p-4 border border-red-200 dark:border-red-700">
                <div className="text-2xl mb-2">🎬</div>
                <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">YouTube:</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 italic mb-2">
                  "<FormattedMessage id="influencer.example.yt2.text" defaultMessage="Q&A: Answering Your Expat Questions Live" />"
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 font-bold">→ $10/referral</p>
              </div>

              {/* Instagram example 1 */}
              <div className="bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 rounded-2xl p-4 border border-pink-200 dark:border-pink-700">
                <div className="text-2xl mb-2">📸</div>
                <p className="text-xs font-semibold text-pink-600 dark:text-pink-400 mb-1">Instagram Story:</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 italic mb-2">
                  "<FormattedMessage id="influencer.example.ig1.text" defaultMessage="Swipe up for 5% off legal help abroad!" />"
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 font-bold">→ $10/referral</p>
              </div>

              {/* Instagram example 2 */}
              <div className="bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 rounded-2xl p-4 border border-pink-200 dark:border-pink-700">
                <div className="text-2xl mb-2">📸</div>
                <p className="text-xs font-semibold text-pink-600 dark:text-pink-400 mb-1">Instagram Reel:</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 italic mb-2">
                  "<FormattedMessage id="influencer.example.ig2.text" defaultMessage="3 things I wish I knew before moving abroad" />"
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 font-bold">→ $10/referral</p>
              </div>

              {/* TikTok example 1 */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl p-4 border border-blue-200 dark:border-blue-700">
                <div className="text-2xl mb-2">🎵</div>
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">TikTok:</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 italic mb-2">
                  "<FormattedMessage id="influencer.example.tt1.text" defaultMessage="POV: You need a lawyer but you're in Thailand" />"
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 font-bold">→ $10/referral</p>
              </div>

              {/* TikTok example 2 */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl p-4 border border-blue-200 dark:border-blue-700">
                <div className="text-2xl mb-2">🎵</div>
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">TikTok:</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 italic mb-2">
                  "<FormattedMessage id="influencer.example.tt2.text" defaultMessage="Expat hack: Get legal help in 5 minutes 🤯" />"
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 font-bold">→ $10/referral</p>
              </div>

              {/* Blog example 1 */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-4 border border-green-200 dark:border-green-700">
                <div className="text-2xl mb-2">📝</div>
                <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">Blog:</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 italic mb-2">
                  "<FormattedMessage id="influencer.example.blog1.text" defaultMessage="Complete Guide: Portugal Digital Nomad Visa 2026" />"
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 font-bold">→ $10/referral</p>
              </div>

              {/* Blog example 2 */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-4 border border-green-200 dark:border-green-700">
                <div className="text-2xl mb-2">📝</div>
                <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">Blog:</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 italic mb-2">
                  "<FormattedMessage id="influencer.example.blog2.text" defaultMessage="What To Do If You Lose Your Passport Abroad" />"
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 font-bold">→ $10/referral</p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* EARNINGS CALCULATOR (NEW) */}
        {/* ============================================================== */}
        <section className="py-16 md:py-24 px-4 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 text-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold mb-4">
                <Calculator className="w-4 h-4" />
                <FormattedMessage id="influencer.calculator.badge" defaultMessage="Earnings Calculator" />
              </div>
              <h2 className="text-3xl md:text-5xl font-black mb-4">
                <FormattedMessage id="influencer.calculator.title" defaultMessage="Calculate Your Potential" />
              </h2>
              <p className="text-xl text-white/90 max-w-2xl mx-auto">
                <FormattedMessage id="influencer.calculator.subtitle" defaultMessage="Adjust the sliders based on your content frequency and audience engagement" />
              </p>
            </div>

            {/* Calculator */}
            <div className="bg-white rounded-3xl p-6 md:p-8 text-gray-900 max-w-2xl mx-auto">
              <div className="space-y-6">
                {/* Videos/posts per month */}
                <div>
                  <label className="flex items-center justify-between text-sm font-medium mb-2">
                    <span>
                      <FormattedMessage id="influencer.calculator.videos" defaultMessage="Videos/posts per month" />
                    </span>
                    <span className="text-green-600 font-bold text-lg">{calcVideos}</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={calcVideos}
                    onChange={(e) => setCalcVideos(parseInt(e.target.value))}
                    className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1</span>
                    <span>15</span>
                    <span>30</span>
                  </div>
                </div>

                {/* Average views per video */}
                <div>
                  <label className="flex items-center justify-between text-sm font-medium mb-2">
                    <span>
                      <FormattedMessage id="influencer.calculator.views" defaultMessage="Average views per content" />
                    </span>
                    <span className="text-green-600 font-bold text-lg">{calcViewsPerVideo.toLocaleString()}</span>
                  </label>
                  <input
                    type="range"
                    min="500"
                    max="100000"
                    step="500"
                    value={calcViewsPerVideo}
                    onChange={(e) => setCalcViewsPerVideo(parseInt(e.target.value))}
                    className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>500</span>
                    <span>50K</span>
                    <span>100K</span>
                  </div>
                </div>

                {/* Click-through rate */}
                <div>
                  <label className="flex items-center justify-between text-sm font-medium mb-2">
                    <span>
                      <FormattedMessage id="influencer.calculator.clickrate" defaultMessage="Link click rate" />
                    </span>
                    <span className="text-green-600 font-bold text-lg">{calcClickRate}%</span>
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="10"
                    step="0.5"
                    value={calcClickRate}
                    onChange={(e) => setCalcClickRate(parseFloat(e.target.value))}
                    className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0.5%</span>
                    <span>5%</span>
                    <span>10%</span>
                  </div>
                </div>

                {/* Conversion rate */}
                <div>
                  <label className="flex items-center justify-between text-sm font-medium mb-2">
                    <span>
                      <FormattedMessage id="influencer.calculator.conversion" defaultMessage="Conversion rate (clicks → calls)" />
                    </span>
                    <span className="text-green-600 font-bold text-lg">{calcConversionRate}%</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="15"
                    step="1"
                    value={calcConversionRate}
                    onChange={(e) => setCalcConversionRate(parseFloat(e.target.value))}
                    className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1%</span>
                    <span>8%</span>
                    <span>15%</span>
                  </div>
                </div>

                {/* Results */}
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-6 text-white text-center">
                  <p className="text-sm opacity-90 mb-1">
                    <FormattedMessage id="influencer.calculator.result" defaultMessage="Estimated monthly earnings" />
                  </p>
                  <p className="text-5xl font-black">${monthlyEarnings}</p>
                  <p className="text-sm opacity-90 mt-2">
                    {monthlyViews.toLocaleString()} <FormattedMessage id="influencer.calculator.views.label" defaultMessage="views" /> × {calcClickRate}% = {monthlyClicks.toLocaleString()} <FormattedMessage id="influencer.calculator.clicks" defaultMessage="clicks" /> × {calcConversionRate}% = {monthlyClients} <FormattedMessage id="influencer.calculator.clients" defaultMessage="clients" /> × $10
                  </p>
                </div>

                {/* Disclaimer */}
                <p className="text-xs text-gray-500 text-center">
                  <FormattedMessage
                    id="influencer.calculator.disclaimer"
                    defaultMessage="Results vary depending on your niche, audience engagement, and content quality. These are estimates, not guarantees."
                  />
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* PROMO TOOLS INCLUDED */}
        {/* ============================================================== */}
        <section className="py-16 md:py-20 px-4 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white mb-4">
                <FormattedMessage id="influencer.tools.title" defaultMessage="Promo Tools Included" />
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                <FormattedMessage id="influencer.tools.subtitle" defaultMessage="Everything you need to promote professionally" />
              </p>
            </div>

            {/* Tools highlight box */}
            <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-3xl p-6 md:p-8 text-white mb-8">
              <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <span className="text-3xl">🎁</span>
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl font-bold mb-1">
                    <FormattedMessage id="influencer.tools.box.title" defaultMessage="All Tools Included Free" />
                  </h3>
                  <p className="text-white/80">
                    <FormattedMessage id="influencer.tools.box.desc" defaultMessage="No need to create your own graphics. We provide everything in 9 languages." />
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {promoTools.map((tool, idx) => (
                  <div key={idx} className={`rounded-xl px-3 py-2 text-center text-sm ${(tool as any).highlight ? 'bg-yellow-400 text-yellow-900' : 'bg-white/10'}`}>
                    <div className="text-2xl mb-1">{tool.icon}</div>
                    <div className="font-medium">{tool.name}</div>
                    {(tool as any).highlight && <div className="text-xs font-bold">NEW</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Platform cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {platforms.map((platform, idx) => (
                <div
                  key={idx}
                  className={`rounded-2xl p-4 text-center border hover:shadow-lg hover:-translate-y-1 transition-all ${
                    (platform as any).highlight
                      ? 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/30 dark:to-orange-900/30 border-red-300 dark:border-red-700 ring-2 ring-red-400/50'
                      : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
                  }`}
                >
                  <div className="text-4xl mb-2">{platform.icon}</div>
                  <div className={`font-bold ${(platform as any).highlight ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-white'}`}>
                    {platform.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{platform.desc}</div>
                  {(platform as any).highlight && (
                    <div className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">
                      <FormattedMessage id="influencer.platform.recommended" defaultMessage="Most popular!" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* FOLLOWER DISCOUNT - Exclusive benefit */}
        {/* ============================================================== */}
        <section className="py-12 md:py-16 px-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0 mx-auto md:mx-0">
                <Gift className="w-10 h-10" />
              </div>
              <div className="text-center md:text-left">
                <h3 className="text-2xl md:text-3xl font-black mb-2">
                  <FormattedMessage id="influencer.discount.title" defaultMessage="Your Followers Get 5% Off" />
                </h3>
                <p className="text-white/90 text-lg">
                  <FormattedMessage id="influencer.discount.desc" defaultMessage="Exclusive benefit! When your followers use your link, they automatically get 5% off their first call. It's a real value proposition for your community." />
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* EARNINGS - Simple and clear */}
        {/* ============================================================== */}
        <section className="py-16 md:py-24 px-4 bg-white dark:bg-gray-950">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-semibold mb-4">
                <DollarSign className="w-4 h-4" />
                <FormattedMessage id="influencer.earnings.badge" defaultMessage="Your Earnings" />
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white mb-4">
                <FormattedMessage id="influencer.earnings.title" defaultMessage="How Much Can You Earn?" />
              </h2>
            </div>

            {/* Main earning */}
            <div className="bg-gradient-to-br from-red-500 to-orange-600 rounded-3xl p-8 md:p-12 text-white text-center mb-8">
              <Phone className="w-16 h-16 mx-auto mb-4 opacity-80" />
              <div className="text-6xl md:text-8xl font-black mb-2">$10</div>
              <p className="text-xl md:text-2xl font-medium opacity-90">
                <FormattedMessage id="influencer.earnings.perCall" defaultMessage="Per client call to a lawyer or expat helper" />
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
                <div className="bg-white/20 rounded-full px-4 py-2">10 clients = $100</div>
                <div className="bg-white/20 rounded-full px-4 py-2">50 clients = $500</div>
                <div className="bg-white/20 rounded-full px-4 py-2">100 clients = $1000</div>
              </div>
            </div>

            {/* Bonus earnings */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Find lawyer/helper partners */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-3xl p-6 border border-purple-100 dark:border-purple-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-800 rounded-xl flex items-center justify-center">
                    <UserPlus className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <div className="text-3xl font-black text-purple-600 dark:text-purple-400">$5</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <FormattedMessage id="influencer.earnings.partner" defaultMessage="Per call to your lawyer/helper partners" />
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <FormattedMessage id="influencer.earnings.partner.desc" defaultMessage="Find a lawyer or expat helper to join. Earn $5 passively every time they receive a call!" />
                </p>
              </div>

              {/* Follower discount */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-3xl p-6 border border-green-100 dark:border-green-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-800 rounded-xl flex items-center justify-center">
                    <Percent className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="text-3xl font-black text-green-600 dark:text-green-400">5%</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <FormattedMessage id="influencer.earnings.discount" defaultMessage="Discount for your followers" />
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <FormattedMessage id="influencer.earnings.discount.desc" defaultMessage="Your followers get 5% off. Exclusive benefit that makes your link more valuable!" />
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* BUILD A NETWORK - Like Chatter team section */}
        {/* ============================================================== */}
        <section className="py-16 md:py-24 px-4 bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 text-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold mb-4">
                <Network className="w-4 h-4" />
                <FormattedMessage id="influencer.network.badge" defaultMessage="Multiply Your Income" />
              </div>
              <h2 className="text-3xl md:text-5xl font-black mb-4">
                <FormattedMessage id="influencer.network.title" defaultMessage="Build Your Network, Earn More" />
              </h2>
              <p className="text-xl text-white/90 max-w-2xl mx-auto">
                <FormattedMessage id="influencer.network.subtitle" defaultMessage="Recruit lawyers and expat helpers. Earn $5 per call they receive for 6 months!" />
              </p>
            </div>

            {/* Visual representation */}
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 md:p-10 border border-white/20 max-w-3xl mx-auto">
              <div className="flex flex-col items-center">
                {/* You */}
                <div className="flex flex-col items-center mb-6">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl">
                    <Crown className="w-10 h-10 text-orange-500" />
                  </div>
                  <span className="mt-2 font-bold text-lg">
                    <FormattedMessage id="influencer.network.you" defaultMessage="YOU" />
                  </span>
                  <span className="text-white/80 text-sm">
                    <FormattedMessage id="influencer.network.you.earn" defaultMessage="$10/client + $5/call from partners" />
                  </span>
                </div>

                {/* Arrow */}
                <div className="text-3xl mb-4">↓</div>

                {/* Network */}
                <div className="flex justify-center gap-4 md:gap-8 mb-6">
                  {[
                    { emoji: '⚖️', label: intl.formatMessage({ id: 'influencer.network.lawyer', defaultMessage: 'Lawyer' }), earn: '+$5/call' },
                    { emoji: '🌍', label: intl.formatMessage({ id: 'influencer.network.helper', defaultMessage: 'Helper' }), earn: '+$5/call' },
                  ].map((item, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-2xl">
                        {item.emoji}
                      </div>
                      <span className="mt-1 text-sm font-medium">{item.label}</span>
                      <span className="text-xs text-green-300">{item.earn}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Example calculation */}
              <div className="mt-8 bg-white/10 rounded-2xl p-4 text-center">
                <p className="font-semibold mb-2">
                  <FormattedMessage id="influencer.network.example" defaultMessage="Example: 3 lawyers/helpers receiving 20 calls/month each" />
                </p>
                <p className="text-2xl font-black text-green-300">
                  = $300/month <FormattedMessage id="influencer.network.passive" defaultMessage="passive income for 6 months!" />
                </p>
              </div>
            </div>

            {/* CTA */}
            <div className="text-center mt-10">
              <button
                onClick={() => navigate(registerRoute)}
                className="group bg-white text-red-600 font-bold px-8 py-4 rounded-2xl text-lg inline-flex items-center gap-3 hover:bg-gray-100 transition-all shadow-xl"
              >
                <Rocket className="w-6 h-6" />
                <FormattedMessage id="influencer.network.cta" defaultMessage="Build Your Network Today" />
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* SOCIAL PROOF - STATS & TESTIMONIALS */}
        {/* ============================================================== */}
        <section className="py-16 md:py-20 px-4 bg-white dark:bg-gray-950">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-sm font-bold mb-4">
                <Sparkles className="w-4 h-4" />
                <FormattedMessage id="influencer.social.badge" defaultMessage="Real Success Stories" />
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white">
                <FormattedMessage id="influencer.social.title" defaultMessage="Influencers Are Earning Every Day" />
              </h2>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-4 mb-10">
              {[
                { value: <AnimatedCounter end={847} />, label: intl.formatMessage({ id: 'influencer.stats.influencers', defaultMessage: 'Active Influencers' }), icon: '🎬' },
                { value: <><AnimatedCounter end={89} prefix="$" />K</>, label: intl.formatMessage({ id: 'influencer.stats.paid', defaultMessage: 'Paid This Month' }), icon: '💰' },
                { value: <AnimatedCounter end={52} />, label: intl.formatMessage({ id: 'influencer.stats.countries', defaultMessage: 'Countries' }), icon: '🌍' },
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
                  name: 'Carlos Rodriguez',
                  location: '🇪🇸 Madrid, Spain',
                  amount: '$620',
                  period: intl.formatMessage({ id: 'influencer.testimonial.period', defaultMessage: 'this month' }),
                  quote: intl.formatMessage({ id: 'influencer.testimonial.1', defaultMessage: "My YouTube channel about Spanish visas gets me 5-10 referrals per video. One video = passive income for months!" }),
                  avatar: '👨🏽‍💻',
                  stats: intl.formatMessage({ id: 'influencer.testimonial.1.stats', defaultMessage: '62 clients • 15K subscribers' }),
                  verified: true,
                },
                {
                  name: 'Priya Sharma',
                  location: '🇮🇳 Mumbai, India',
                  amount: '$1,450',
                  period: intl.formatMessage({ id: 'influencer.testimonial.period', defaultMessage: 'this month' }),
                  quote: intl.formatMessage({ id: 'influencer.testimonial.2', defaultMessage: "I create content about studying abroad. My TikTok + Instagram combo brings 100+ clients monthly. Best decision ever!" }),
                  avatar: '👩🏽‍🎤',
                  stats: intl.formatMessage({ id: 'influencer.testimonial.2.stats', defaultMessage: '145 clients • 3 months' }),
                  highlight: true,
                  verified: true,
                },
                {
                  name: 'Thomas Mueller',
                  location: '🇩🇪 Berlin, Germany',
                  amount: '$380',
                  period: intl.formatMessage({ id: 'influencer.testimonial.period', defaultMessage: 'this month' }),
                  quote: intl.formatMessage({ id: 'influencer.testimonial.3', defaultMessage: "Blog posts about German bureaucracy rank on Google. I barely do anything now - just collect passive income from old posts!" }),
                  avatar: '👨🏼‍💼',
                  stats: intl.formatMessage({ id: 'influencer.testimonial.3.stats', defaultMessage: '38 clients • SEO traffic' }),
                  verified: true,
                },
              ].map((testimonial, i) => (
                <div
                  key={i}
                  className={`relative rounded-2xl p-6 ${
                    testimonial.highlight
                      ? 'bg-gradient-to-br from-red-600 to-orange-600 text-white'
                      : 'bg-gray-50 dark:bg-gray-800'
                  }`}
                >
                  {testimonial.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-yellow-400 text-gray-900 rounded-full text-xs font-bold">
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
                  <div className={`text-2xl font-black ${testimonial.highlight ? 'text-yellow-300' : 'text-red-600 dark:text-red-400'}`}>
                    {testimonial.amount} <span className={`text-sm font-normal ${testimonial.highlight ? 'text-white/70' : 'text-gray-500'}`}>{testimonial.period}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Live activity feed */}
            <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-2xl p-4 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-bold text-red-700 dark:text-red-400">
                  <FormattedMessage id="influencer.live.title" defaultMessage="Live Activity" />
                </span>
              </div>
              <div className="space-y-2 text-sm">
                {[
                  { name: 'Emma L.', action: intl.formatMessage({ id: 'influencer.live.earned', defaultMessage: 'just earned' }), amount: '$10', flag: '🇬🇧' },
                  { name: 'Chen W.', action: intl.formatMessage({ id: 'influencer.live.earned', defaultMessage: 'just earned' }), amount: '$10', flag: '🇨🇳' },
                  { name: 'Sofia R.', action: intl.formatMessage({ id: 'influencer.live.partnerbonus', defaultMessage: 'partner commission' }), amount: '$5', flag: '🇧🇷' },
                ].map((activity, i) => (
                  <div key={i} className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <span>{activity.flag}</span>
                    <span className="font-medium">{activity.name}</span>
                    <span className="text-gray-400">{activity.action}</span>
                    <span className="font-bold text-red-600 dark:text-red-400">{activity.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* PAYMENT METHODS - EXPANDED like Chatter */}
        {/* ============================================================== */}
        <section className="py-12 md:py-16 px-4 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-6">
              <FormattedMessage id="influencer.payment.title" defaultMessage="Get Paid Your Way" />
            </h3>
            <div className="flex flex-wrap justify-center gap-4">
              {paymentMethods.map((method, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2"
                >
                  <span className="text-xl">{method.icon}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{method.name}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              <FormattedMessage id="influencer.payment.note" defaultMessage="Minimum $50 • Processed in 48h • Worldwide" />
            </p>
          </div>
        </section>

        {/* ============================================================== */}
        {/* FAQ - EXPANDED */}
        {/* ============================================================== */}
        <section className="py-16 md:py-24 px-4 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white mb-2">
                <FormattedMessage id="influencer.faq.title" defaultMessage="Questions?" />
              </h2>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full flex items-center justify-between p-5 text-left"
                  >
                    <h3 className="font-semibold text-gray-900 dark:text-white pr-4">
                      {faq.question}
                    </h3>
                    <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform flex-shrink-0 ${openFaq === idx ? 'rotate-180' : ''}`} />
                  </button>
                  {openFaq === idx && (
                    <div className="px-5 pb-5 text-gray-600 dark:text-gray-300">
                      <p>{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* ZERO RISK GUARANTEE */}
        {/* ============================================================== */}
        <section className="py-16 md:py-20 px-4 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-900/20 dark:via-emerald-900/20 dark:to-teal-900/20">
          <div className="max-w-4xl mx-auto text-center">
            {/* Shield Icon */}
            <div className="inline-flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 mb-6 animate-pulse-glow shadow-xl">
              <ShieldCheck className="w-10 h-10 md:w-12 md:h-12 text-white" />
            </div>

            <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-4">
              <FormattedMessage id="influencer.guarantee.title" defaultMessage="Zero Risk Guarantee" />
            </h2>

            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
              <FormattedMessage id="influencer.guarantee.subtitle" defaultMessage="We believe in our program. That's why we offer a complete peace of mind guarantee." />
            </p>

            {/* Guarantee Points */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
              {[
                {
                  icon: '💰',
                  title: intl.formatMessage({ id: 'influencer.guarantee.free.title', defaultMessage: '100% Free Forever' }),
                  desc: intl.formatMessage({ id: 'influencer.guarantee.free.desc', defaultMessage: 'No fees, no hidden costs, no catch' })
                },
                {
                  icon: '⚡',
                  title: intl.formatMessage({ id: 'influencer.guarantee.instant.title', defaultMessage: 'Instant Activation' }),
                  desc: intl.formatMessage({ id: 'influencer.guarantee.instant.desc', defaultMessage: 'Start earning within 5 minutes of signup' })
                },
                {
                  icon: '🔒',
                  title: intl.formatMessage({ id: 'influencer.guarantee.tracking.title', defaultMessage: 'Verified Tracking' }),
                  desc: intl.formatMessage({ id: 'influencer.guarantee.tracking.desc', defaultMessage: 'Every click, signup and sale tracked in real-time' })
                }
              ].map((point, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-green-100 dark:border-green-800 transform hover:scale-105 transition-transform">
                  <div className="text-4xl mb-3">{point.icon}</div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">{point.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{point.desc}</p>
                </div>
              ))}
            </div>

            {/* Trust Badge */}
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 rounded-full px-6 py-3 border border-green-200 dark:border-green-700">
              <BadgeCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="font-medium text-green-800 dark:text-green-300">
                <FormattedMessage id="influencer.guarantee.trusted" defaultMessage="Trusted by 2,000+ influencers worldwide" />
              </span>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* FINAL CTA - PREMIUM */}
        {/* ============================================================== */}
        <section className="relative py-20 md:py-32 px-4 bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white overflow-hidden">
          {/* Floating Money Background */}
          <FloatingMoney />

          {/* Animated gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 via-orange-500/10 to-yellow-500/10 animate-gradient-shift" />

          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />

          <div className="relative max-w-4xl mx-auto text-center z-10">
            {/* Urgency badge */}
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-orange-500 rounded-full px-4 py-2 mb-6 animate-bounce-slow">
              <Timer className="w-4 h-4" />
              <span className="text-sm font-bold">
                <FormattedMessage id="influencer.final.urgency" defaultMessage="Limited Time: Early Adopter Bonuses Active" />
              </span>
            </div>

            <h2 className="text-4xl md:text-6xl font-black mb-6 bg-gradient-to-r from-white via-yellow-200 to-white bg-clip-text text-transparent animate-gradient-shift">
              <FormattedMessage id="influencer.final.title" defaultMessage="Ready to Monetize Your Audience?" />
            </h2>

            <p className="text-xl md:text-2xl text-white/80 mb-4 max-w-2xl mx-auto">
              <FormattedMessage id="influencer.final.subtitle" defaultMessage="It's free, instant activation, promo tools included, works worldwide." />
            </p>

            {/* Earnings highlight */}
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full px-6 py-3 mb-10 border border-yellow-500/30">
              <span className="text-3xl">💰</span>
              <span className="text-lg font-bold text-yellow-300">
                <FormattedMessage id="influencer.final.earnings" defaultMessage="$10/client + $5/call partner bonus" />
              </span>
            </div>

            {/* CTA Button - Premium */}
            <button
              onClick={() => navigate(registerRoute)}
              className="group relative bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white font-black px-12 py-7 rounded-2xl text-xl md:text-2xl inline-flex items-center gap-4 hover:scale-105 transition-all shadow-2xl animate-pulse-glow-red overflow-hidden"
            >
              {/* Button shimmer */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
              <Rocket className="w-8 h-8 relative z-10" />
              <span className="relative z-10">
                <FormattedMessage id="influencer.final.cta" defaultMessage="Become an Influencer Now" />
              </span>
              <ArrowRight className="w-8 h-8 group-hover:translate-x-2 transition-transform relative z-10" />
            </button>

            {/* Trust badges */}
            <div className="flex flex-wrap justify-center gap-4 md:gap-6 mt-10">
              {[
                { icon: <CheckCircle className="w-5 h-5 text-green-400" />, text: intl.formatMessage({ id: 'influencer.final.trust.1', defaultMessage: '100% Free' }) },
                { icon: <CheckCircle className="w-5 h-5 text-green-400" />, text: intl.formatMessage({ id: 'influencer.final.trust.2', defaultMessage: 'No Min Followers' }) },
                { icon: <CheckCircle className="w-5 h-5 text-green-400" />, text: intl.formatMessage({ id: 'influencer.final.trust.3', defaultMessage: 'All Countries' }) },
                { icon: <CheckCircle className="w-5 h-5 text-green-400" />, text: intl.formatMessage({ id: 'influencer.final.trust.4', defaultMessage: 'Promo Tools Included' }) },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm md:text-base text-white/80">
                  {item.icon}
                  <span>{item.text}</span>
                </div>
              ))}
            </div>

            {/* Social proof */}
            <div className="mt-10 pt-8 border-t border-white/10">
              <div className="flex flex-wrap justify-center items-center gap-6 text-sm text-white/60">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {['🇺🇸', '🇫🇷', '🇧🇷', '🇯🇵', '🇳🇬'].map((flag, i) => (
                      <span key={i} className="text-lg">{flag}</span>
                    ))}
                  </div>
                  <span><FormattedMessage id="influencer.final.countries" defaultMessage="190+ countries" /></span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span><FormattedMessage id="influencer.final.rating" defaultMessage="4.9/5 influencer rating" /></span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-orange-400" />
                  <span><FormattedMessage id="influencer.final.payouts" defaultMessage="$500K+ paid out" /></span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* STICKY MOBILE CTA */}
        {/* ============================================================== */}
        {showStickyBar && (
          <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-gradient-to-r from-gray-900 via-black to-gray-900 border-t border-red-500/30 p-3 safe-area-inset-bottom">
            <button
              onClick={() => navigate(registerRoute)}
              className="w-full bg-gradient-to-r from-red-600 to-orange-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 shadow-lg animate-pulse-glow-red"
            >
              <Rocket className="w-5 h-5" />
              <span><FormattedMessage id="influencer.sticky.cta" defaultMessage="Start Earning Now" /></span>
              <span className="bg-white/20 px-2 py-0.5 rounded text-xs">$10/client</span>
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default InfluencerLanding;
