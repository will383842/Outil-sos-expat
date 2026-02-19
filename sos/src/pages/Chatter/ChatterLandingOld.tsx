/**
 * ChatterLanding - REVOLUTIONARY Mobile-First Landing Page 2026
 *
 * ULTRA IMPACTANTE - CONVERSION MAXIMALE
 *
 * OBJECTIFS:
 * - Comprendre en 3 secondes qu'on peut gagner de l'argent
 * - Visualiser le potentiel de revenus ($10/call + équipe illimitée)
 * - Montrer que c'est SIMPLE et RAPIDE
 * - Mettre en avant le programme de recrutement
 * - Mobile-first d'exception avec animations fluides
 */

import React, { useState, useEffect, useRef } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Helmet } from 'react-helmet-async';
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
  Phone,
  Scale,
  HelpCircle,
  GraduationCap,
  Home,
  Briefcase,
  MessageCircle,
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

  // SEO - Comprehensive optimization for Google, Bing, and AI (ChatGPT, Perplexity, Claude)
  const seoTitle = intl.formatMessage({
    id: 'chatter.landing.seo.title',
    defaultMessage: 'Become a SOS-Expat Chatter | Earn $10/call + Unlimited Team Income'
  });
  const seoDescription = intl.formatMessage({
    id: 'chatter.landing.seo.description',
    defaultMessage: 'Join the Chatter program: Earn $10 per call, build an unlimited team, get $1 per call from your recruits. Paid via Mobile Money, Wise worldwide.'
  });
  const seoKeywords = intl.formatMessage({
    id: 'chatter.landing.seo.keywords',
    defaultMessage: 'earn money online, affiliate program, work from home, expat assistance, legal help abroad, mobile money, passive income, remote work, chatter program, SOS-Expat, international job, MLM alternative, team building income, worldwide payment'
  });
  const seoAiSummary = intl.formatMessage({
    id: 'chatter.landing.seo.aiSummary',
    defaultMessage: 'SOS-Expat Chatter Program: A legitimate affiliate opportunity where participants earn $10 for each client they refer who calls for legal assistance abroad. Additional income through team building: $1 per call from direct recruits (N1), $0.50 from indirect recruits (N2). No investment required, 100% free to join. Payments via Mobile Money (Orange Money, Wave, MTN MoMo, M-Pesa, Airtel Money), Wise, or bank transfer. Minimum withdrawal: $25. Available worldwide to all nationalities. Simple process: find expats needing legal help, share your unique link, earn when they call.'
  });
  const seoOgTitle = intl.formatMessage({
    id: 'chatter.landing.seo.ogTitle',
    defaultMessage: 'Become a Chatter | Earn $10/Call Helping Expats Find Legal Assistance'
  });
  const seoOgDescription = intl.formatMessage({
    id: 'chatter.landing.seo.ogDescription',
    defaultMessage: 'Join 2,800+ Chatters worldwide earning money from home. $10/call + unlimited team passive income. Payments via Mobile Money & Wise. 100% free to start!'
  });

  // Build canonical URL
  const getCanonicalUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${location.pathname}`;
    }
    return `https://sos-expat.com${location.pathname}`;
  };

  // Structured Data: HowTo Schema (How to become a Chatter)
  const howToSchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: intl.formatMessage({ id: 'chatter.schema.howto.name', defaultMessage: 'How to Become a SOS-Expat Chatter and Earn Money' }),
    description: intl.formatMessage({ id: 'chatter.schema.howto.description', defaultMessage: 'Step-by-step guide to joining the Chatter affiliate program and earning $10 per referred call.' }),
    totalTime: 'PT5M',
    estimatedCost: {
      '@type': 'MonetaryAmount',
      currency: 'USD',
      value: '0'
    },
    supply: [],
    tool: [
      {
        '@type': 'HowToTool',
        name: intl.formatMessage({ id: 'chatter.schema.tool.smartphone', defaultMessage: 'Smartphone or Computer' })
      },
      {
        '@type': 'HowToTool',
        name: intl.formatMessage({ id: 'chatter.schema.tool.internet', defaultMessage: 'Internet Connection' })
      }
    ],
    step: [
      {
        '@type': 'HowToStep',
        position: 1,
        name: intl.formatMessage({ id: 'chatter.schema.step1.name', defaultMessage: 'Register for Free' }),
        text: intl.formatMessage({ id: 'chatter.schema.step1.text', defaultMessage: 'Sign up on SOS-Expat, pass a quick 5-question quiz (2 minutes), and get your unique affiliate link.' }),
        url: `https://sos-expat.com${registerRoute}`
      },
      {
        '@type': 'HowToStep',
        position: 2,
        name: intl.formatMessage({ id: 'chatter.schema.step2.name', defaultMessage: 'Find People Who Need Help' }),
        text: intl.formatMessage({ id: 'chatter.schema.step2.text', defaultMessage: 'Search for expats, travelers, or immigrants who need legal assistance abroad. Look in Facebook groups, WhatsApp groups, Reddit communities, or your personal network.' })
      },
      {
        '@type': 'HowToStep',
        position: 3,
        name: intl.formatMessage({ id: 'chatter.schema.step3.name', defaultMessage: 'Share Your Link' }),
        text: intl.formatMessage({ id: 'chatter.schema.step3.text', defaultMessage: 'Share your unique affiliate link with people who need help. When they call a lawyer or expat helper through your link, you earn $10.' })
      },
      {
        '@type': 'HowToStep',
        position: 4,
        name: intl.formatMessage({ id: 'chatter.schema.step4.name', defaultMessage: 'Get Paid' }),
        text: intl.formatMessage({ id: 'chatter.schema.step4.text', defaultMessage: 'Withdraw your earnings when you reach $25 minimum. Payments via Mobile Money (Orange Money, Wave, MTN MoMo, M-Pesa), Wise, or bank transfer within 48 hours.' })
      }
    ]
  };

  // Structured Data: JobPosting Schema
  const jobPostingSchema = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: intl.formatMessage({ id: 'chatter.schema.job.title', defaultMessage: 'SOS-Expat Chatter - Affiliate Partner' }),
    description: intl.formatMessage({ id: 'chatter.schema.job.description', defaultMessage: 'Earn money by helping expats and travelers find legal assistance. Earn $10 per referred call plus passive income from your team. Work from anywhere, anytime. No experience required, 100% free to join.' }),
    datePosted: '2024-01-01',
    validThrough: '2026-12-31',
    employmentType: 'CONTRACTOR',
    hiringOrganization: {
      '@type': 'Organization',
      name: 'SOS-Expat',
      sameAs: 'https://sos-expat.com',
      logo: 'https://sos-expat.com/logo.png'
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'Worldwide'
      }
    },
    jobLocationType: 'TELECOMMUTE',
    applicantLocationRequirements: {
      '@type': 'Country',
      name: 'Worldwide'
    },
    baseSalary: {
      '@type': 'MonetaryAmount',
      currency: 'USD',
      value: {
        '@type': 'QuantitativeValue',
        value: 10,
        unitText: 'PER_REFERRAL'
      }
    },
    responsibilities: intl.formatMessage({ id: 'chatter.schema.job.responsibilities', defaultMessage: 'Find people who need legal help abroad and share your affiliate link. Build a team of chatters for passive income.' }),
    qualifications: intl.formatMessage({ id: 'chatter.schema.job.qualifications', defaultMessage: 'No experience required. Must pass a simple 5-question quiz about SOS-Expat.' }),
    skills: intl.formatMessage({ id: 'chatter.schema.job.skills', defaultMessage: 'Social media skills, communication, networking' }),
    incentiveCompensation: intl.formatMessage({ id: 'chatter.schema.job.incentive', defaultMessage: '$10 per referred call, $1 per call from direct recruits (N1), $0.50 per call from indirect recruits (N2)' })
  };

  // Structured Data: Service Schema
  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: intl.formatMessage({ id: 'chatter.schema.service.name', defaultMessage: 'SOS-Expat Chatter Affiliate Program' }),
    description: intl.formatMessage({ id: 'chatter.schema.service.description', defaultMessage: 'Affiliate program for earning money by referring expatriates to legal assistance services. Earn $10 per client plus team-based passive income.' }),
    provider: {
      '@type': 'Organization',
      name: 'SOS-Expat',
      url: 'https://sos-expat.com'
    },
    serviceType: 'Affiliate Marketing Program',
    areaServed: {
      '@type': 'Place',
      name: 'Worldwide'
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Chatter Earning Opportunities',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: intl.formatMessage({ id: 'chatter.schema.offer.direct', defaultMessage: 'Direct Client Referral' }),
            description: intl.formatMessage({ id: 'chatter.schema.offer.direct.desc', defaultMessage: 'Earn $10 for each client you refer who calls a lawyer or expat helper' })
          }
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: intl.formatMessage({ id: 'chatter.schema.offer.team', defaultMessage: 'Team Building Income' }),
            description: intl.formatMessage({ id: 'chatter.schema.offer.team.desc', defaultMessage: 'Earn $1 per call from direct recruits (N1) and $0.50 from indirect recruits (N2), unlimited team size' })
          }
        }
      ]
    }
  };

  // Structured Data: WebPage with Speakable
  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: seoTitle,
    description: seoDescription,
    url: getCanonicalUrl(),
    inLanguage: langCode === 'ch' ? 'zh' : langCode,
    isPartOf: {
      '@type': 'WebSite',
      name: 'SOS-Expat',
      url: 'https://sos-expat.com'
    },
    about: {
      '@type': 'Thing',
      name: 'Chatter Affiliate Program',
      description: 'Earn money by helping expats find legal assistance worldwide'
    },
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['h1', '.hero-title', '.seo-speakable']
    },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: '$10 per referred call' },
        { '@type': 'ListItem', position: 2, name: 'Unlimited team building' },
        { '@type': 'ListItem', position: 3, name: 'Worldwide payments' },
        { '@type': 'ListItem', position: 4, name: '100% free to join' }
      ]
    }
  };

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

  // Get locale for SEO
  const getLocaleForSEO = () => {
    const localeMap: Record<string, string> = {
      'fr': 'fr_FR', 'en': 'en_US', 'es': 'es_ES', 'de': 'de_DE',
      'pt': 'pt_PT', 'ru': 'ru_RU', 'ch': 'zh_CN', 'hi': 'hi_IN', 'ar': 'ar_SA'
    };
    return localeMap[langCode] || 'en_US';
  };

  return (
    <Layout>
      {/* Comprehensive SEO Head with AI optimization */}
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        ogImage="/og-image.png"
        ogType="website"
        contentType="LandingPage"
        keywords={seoKeywords}
        aiSummary={seoAiSummary}
        expertise="professional"
        trustworthiness="established"
        contentQuality="high"
        locale={getLocaleForSEO()}
        siteName="SOS-Expat"
        twitterSite="@sosexpat"
        lastReviewed={new Date().toISOString().split('T')[0]}
      />
      <HreflangLinks pathname={location.pathname} />

      {/* FAQ Schema for rich snippets / Position 0 */}
      <FAQPageSchema faqs={faqs.map(f => ({ question: f.question, answer: f.answer }))} pageTitle={seoTitle} />

      {/* Additional JSON-LD Schemas for comprehensive SEO - wrapped in Helmet for head placement */}
      {/* Note: Organization schema removed - handled at site level, not page level */}
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(webPageSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(howToSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(jobPostingSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(serviceSchema)}</script>
      </Helmet>

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
          {/* Animated gradient background - CHATTER RED THEME */}
          <div className="absolute inset-0 bg-gradient-to-br from-red-900 via-red-700 to-rose-600 animate-gradient" />

          {/* Floating money decorations */}
          <FloatingMoney />

          {/* Glassmorphism overlays - Gold/Red accents */}
          <div className="absolute top-10 -left-20 w-72 h-72 bg-amber-400/20 rounded-full blur-3xl" />
          <div className="absolute bottom-10 -right-20 w-96 h-96 bg-yellow-400/30 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-red-500/10 rounded-full blur-3xl" />

          <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 text-center">
            {/* Badge - Social proof */}
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/20 backdrop-blur-md rounded-full mb-6 border animate-scale-in">
              <div className="flex -space-x-2">
                {['🇫🇷', '🇺🇸', '🇬🇧', '🇪🇸'].map((flag, i) => (
                  <span key={i} className="text-lg">{flag}</span>
                ))}
              </div>
              <span className="font-bold text-sm">
                <AnimatedCounter end={1247} suffix="+" className="font-black" />
                <FormattedMessage id="chatter.hero.badge" defaultMessage=" Chatters worldwide" />
              </span>
            </div>

            {/* BECOME A CHATTER SOS - Clear message */}
            <div className="mb-4">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-black mb-2 drop-shadow-lg">
                <FormattedMessage id="chatter.hero.become" defaultMessage="Become a Chatter SOS" />
              </h1>
              <p className="text-lg md:text-xl font-medium">
                <FormattedMessage id="chatter.hero.become.sub" defaultMessage="Join our affiliate program and earn money from home" />
              </p>
            </div>

            {/* MAIN VALUE PROP - THE MONEY */}
            <div className="mb-6">
              <div className="inline-flex items-center justify-center gap-3 mb-4">
                <div className="w-20 h-20 md:w-28 md:h-28 bg-white rounded-3xl flex items-center justify-center shadow-2xl animate-float">
                  <span className="text-5xl md:text-7xl">💰</span>
                </div>
              </div>

              <div className="hero-title font-black mb-4 leading-none tracking-tight">
                <span className="block text-yellow-300 drop-shadow-lg md:text-7xl lg:text-8xl">
                  <FormattedMessage id="chatter.hero.earn" defaultMessage="Earn" /> $10
                </span>
                <span className="block text-white md:text-5xl lg:text-6xl mt-3 font-bold">
                  <FormattedMessage id="chatter.hero.perClient" defaultMessage="Per Call" />
                </span>
              </div>
            </div>

            {/* ULTRA SIMPLE explanation */}
            <div className="bg-white/15 backdrop-blur-xl rounded-3xl p-5 md:p-8 max-w-2xl mx-auto mb-8 border">
              <div className="flex md:flex-row items-center justify-center gap-4 md:gap-6 text-lg md:text-xl font-bold">
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
            <div className="bg-gradient-to-r from-orange-500/30 to-red-500/30 backdrop-blur-md rounded-2xl p-4 max-w-xl mx-auto mb-8 border">
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
              aria-label={intl.formatMessage({ id: 'chatter.aria.cta.main', defaultMessage: 'Start earning money now - Register as a Chatter for free' })}
              className="group relative bg-gradient-to-r from-amber-400 to-yellow-500 text-gray-900 font-black px-10 py-6 rounded-2xl md:text-2xl inline-flex items-center gap-4 hover:from-amber-300 hover:to-yellow-400 transition-all shadow-2xl animate-pulse-glow-gold overflow-hidden"
            >
              <div className="absolute inset-0 animate-shimmer" />
              <Rocket className="w-8 h-8 relative z-10" />
              <span className="relative z-10">
                <FormattedMessage id="chatter.hero.cta" defaultMessage="Start Earning Now" />
              </span>
              <ArrowRight className="w-7 h-7 group-hover:translate-x-2 transition-transform relative z-10" />
            </button>

            {/* Trust badges */}
            <div className="flex justify-center gap-3 mt-8">
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
              <ArrowDown className="w-8 h-8 text-white/85" />
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* WHAT IS SOS-EXPAT - EXPLAIN THE PRODUCT */}
        {/* ============================================================== */}
        <section className="py-12 md:py-16 px-4 bg-white dark:bg-gray-950 border-b dark:border-gray-800">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full font-bold mb-4">
                <HelpCircle className="w-4 h-4" />
                <FormattedMessage id="chatter.what.badge" defaultMessage="What You'll Promote" />
              </div>
              <h2 className="text-2xl dark:text-white md:text-4xl font-black mb-3">
                <FormattedMessage id="chatter.what.title" defaultMessage="What is SOS-Expat?" />
              </h2>
              <p className="text-lg dark:text-gray-400 max-w-2xl mx-auto">
                <FormattedMessage id="chatter.what.subtitle" defaultMessage="A premium legal helpline for expatriates worldwide. They call, speak with lawyers or experienced expatriate helpers. Available in all languages, for all nationalities, in every country." />
              </p>
            </div>

            {/* Visual explanation */}
            <div className="bg-gradient-to-br from-blue-50 dark:from-blue-900/20 to-indigo-50 dark:to-indigo-900/20 rounded-3xl p-6 md:p-8 border dark:border-blue-800">
              <div className="grid md:grid-cols-3 gap-6 text-center">
                {/* Who needs it */}
                <div className="space-y-3">
                  <div className="w-16 h-16 mx-auto bg-blue-500 rounded-2xl flex items-center justify-center">
                    <Globe className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    <FormattedMessage id="chatter.what.who.title" defaultMessage="Who Needs It?" />
                  </h3>
                  <p className="text-sm dark:text-gray-400">
                    <FormattedMessage id="chatter.what.who.desc" defaultMessage="Expats, immigrants, students abroad, digital nomads - anyone living in a foreign country" />
                  </p>
                </div>

                {/* What problems */}
                <div className="space-y-3">
                  <div className="w-16 h-16 mx-auto bg-red-500 rounded-2xl flex items-center justify-center">
                    <Scale className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    <FormattedMessage id="chatter.what.problems.title" defaultMessage="Their Problems" />
                  </h3>
                  <p className="text-sm dark:text-gray-400">
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
                  <p className="text-sm dark:text-gray-400">
                    <FormattedMessage id="chatter.what.solution.desc" defaultMessage="Quick call with lawyers or experienced expatriate helpers. Instant booking, no waiting." />
                  </p>
                </div>
              </div>

              {/* Key stat */}
              <div className="mt-8 text-center">
                <div className="inline-flex items-center gap-3 bg-white dark:bg-gray-800 rounded-2xl px-6 py-4 shadow-lg">
                  <div className="text-4xl">🌍</div>
                  <div className="text-left">
                    <div className="text-2xl dark:text-white font-black">304 million</div>
                    <div className="text-sm">
                      <FormattedMessage id="chatter.what.stat" defaultMessage="people live outside their home country" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Why it's easy to sell */}
            <div className="mt-6 grid md:grid-cols-4 gap-3">
              {[
                { icon: '✅', text: intl.formatMessage({ id: 'chatter.what.easy1', defaultMessage: 'Real need, real solution' }) },
                { icon: '💰', text: intl.formatMessage({ id: 'chatter.what.easy2', defaultMessage: '$10 per referred call' }) },
                { icon: '⚡', text: intl.formatMessage({ id: 'chatter.what.easy3', defaultMessage: 'Instant booking' }) },
                { icon: '🌐', text: intl.formatMessage({ id: 'chatter.what.easy4', defaultMessage: 'All languages & countries' }) },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3">
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-sm dark:text-gray-300 font-medium">{item.text}</span>
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
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 text-amber-400 rounded-full font-bold mb-4">
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
              <div className="bg-gradient-to-br from-amber-600/20 to-yellow-600/20 backdrop-blur-xl rounded-3xl p-8 border">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-2xl flex items-center justify-center">
                    <DollarSign className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">
                      <FormattedMessage id="chatter.calc.direct" defaultMessage="Your Direct Earnings" />
                    </h3>
                    <p className="text-amber-200">
                      <FormattedMessage id="chatter.calc.direct.sub" defaultMessage="$10 per referred call - your link works unlimited times!" />
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
                    <div key={tier.clients} className="flex items-center justify-between p-4 bg-white/10 rounded-xl hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{tier.emoji}</span>
                        <span className="font-medium">{tier.clients} <FormattedMessage id="chatter.calc.clients" defaultMessage="clients" /></span>
                      </div>
                      <div className="text-2xl font-black">
                        ${tier.clients * 10}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Team earnings */}
              <div className="bg-gradient-to-br from-orange-600/20 to-red-600/20 backdrop-blur-xl rounded-3xl p-8 border">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">
                      <FormattedMessage id="chatter.calc.team" defaultMessage="+ Team Passive Income" />
                    </h3>
                    <p className="text-orange-200">
                      <FormattedMessage id="chatter.calc.team.sub" defaultMessage="$1/call N1, $0.50/call N2" />
                    </p>
                  </div>
                </div>

                {/* Interactive slider */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">
                    <FormattedMessage id="chatter.calc.team.size" defaultMessage="Your team size" />
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={teamSize}
                    onChange={(e) => setTeamSize(Number(e.target.value))}
                    className="w-full h-3 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none"
                  />
                  <div className="flex justify-between text-sm mt-1">
                    <span>1</span>
                    <span className="text-orange-400 font-bold">{teamSize} <FormattedMessage id="chatter.calc.chatters" defaultMessage="chatters" /></span>
                    <span>50+</span>
                  </div>
                </div>

                {/* Calculation display */}
                <div className="bg-white/10 rounded-2xl p-6 text-center">
                  <p className="text-amber-300 mb-2 font-medium">
                    <FormattedMessage id="chatter.calc.if" defaultMessage="If each brings 10 calls/month" />
                  </p>
                  <div className="text-4xl md:text-5xl font-black mb-2">
                    ${teamEarnings.toFixed(0)}<span className="text-2xl">/mo</span>
                  </div>
                  <p className="text-amber-400 font-bold">
                    <FormattedMessage id="chatter.calc.passive" defaultMessage="Passive income for you!" />
                  </p>
                </div>

                <div className="mt-4 text-center font-medium">
                  <FormattedMessage id="chatter.calc.nolimit" defaultMessage="No limit on team size!" />
                </div>
              </div>
            </div>

            {/* Total potential */}
            <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 rounded-3xl p-8 text-center relative overflow-hidden">
              <div className="absolute inset-0 animate-shimmer" />
              <h3 className="text-xl font-bold mb-2 relative z-10">
                <FormattedMessage id="chatter.calc.total" defaultMessage="Your Total Monthly Potential" />
              </h3>
              <div className="text-5xl md:text-7xl font-black mb-2 relative z-10">
                $<AnimatedCounter end={500 + teamEarnings} />+
              </div>
              <p className="text-gray-800 relative z-10">
                <FormattedMessage id="chatter.calc.combining" defaultMessage="Combining direct clients + team earnings" />
              </p>
            </div>

            {/* CONCRETE EXAMPLE - Average Chatter with Team */}
            <div className="mt-10 bg-white/10 backdrop-blur-xl rounded-3xl p-6 md:p-8 border">
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-400/20 rounded-full mb-3">
                  <Star className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-bold">
                    <FormattedMessage id="chatter.calc.example.badge" defaultMessage="Real Example" />
                  </span>
                </div>
                <h3 className="text-xl md:text-2xl font-bold">
                  <FormattedMessage id="chatter.calc.example.title" defaultMessage="Marie, active Chatter for 6 months" />
                </h3>
              </div>

              <div className="grid md:grid-cols-3 gap-4 mb-6">
                {/* Direct clients */}
                <div className="bg-amber-500/20 rounded-2xl p-4 text-center border">
                  <div className="text-amber-300 mb-1">
                    <FormattedMessage id="chatter.calc.example.direct" defaultMessage="Direct clients" />
                  </div>
                  <div className="text-white font-medium mb-1">25 <FormattedMessage id="chatter.calc.clients" defaultMessage="clients" />/mo</div>
                  <div className="text-2xl font-black">$250</div>
                </div>

                {/* Team N1+N2 */}
                <div className="bg-orange-500/20 rounded-2xl p-4 text-center border">
                  <div className="text-orange-300 mb-1">
                    <FormattedMessage id="chatter.calc.example.team" defaultMessage="Team N1 (15) + N2 (30)" />
                  </div>
                  <div className="text-white font-medium mb-1">200 <FormattedMessage id="chatter.calc.calls" defaultMessage="calls" />/mo</div>
                  <div className="text-2xl font-black">$225</div>
                </div>

                {/* Recruitment bonus */}
                <div className="bg-purple-500/20 rounded-2xl p-4 text-center border">
                  <div className="text-purple-300 mb-1">
                    <FormattedMessage id="chatter.calc.example.bonus" defaultMessage="Milestone bonus (20 recruits)" />
                  </div>
                  <div className="text-white font-medium mb-1"><FormattedMessage id="chatter.calc.example.onetime" defaultMessage="One-time bonus" /></div>
                  <div className="text-2xl font-black">$75</div>
                </div>
              </div>

              {/* Total example */}
              <div className="bg-gradient-to-r from-green-500/30 to-emerald-500/30 rounded-2xl p-5 text-center border">
                <div className="text-green-300 mb-1">
                  <FormattedMessage id="chatter.calc.example.total" defaultMessage="Marie's monthly earnings" />
                </div>
                <div className="text-4xl md:text-5xl font-black">
                  $475 - $550<span className="text-xl">/mo</span>
                </div>
                <p className="text-white/85 mt-2">
                  <FormattedMessage id="chatter.calc.example.note" defaultMessage="Working part-time from home, with bonuses when reaching new milestones!" />
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 3 STEPS - ULTRA VISUAL */}
        {/* ============================================================== */}
        <section className="py-16 md:py-24 px-4 bg-white dark:bg-gray-950">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full font-bold mb-4">
                <Zap className="w-4 h-4" />
                <FormattedMessage id="chatter.steps.badge" defaultMessage="It's Super Easy" />
              </div>
              <h2 className="text-3xl dark:text-white md:text-5xl font-black mb-4">
                <FormattedMessage id="chatter.steps.title" defaultMessage="3 Simple Steps" />
              </h2>
              <p className="text-lg dark:text-gray-400">
                <FormattedMessage id="chatter.steps.subtitle" defaultMessage="No expertise needed. Anyone can do this." />
              </p>
            </div>

            {/* Steps - Horizontal on desktop, vertical on mobile */}
            <div className="relative">
              {/* Connection line */}
              <div className="hidden md:block absolute top-24 left-[16%] right-[16%] h-1 bg-gradient-to-r from-blue-500 via-red-500 to-green-500 rounded-full" />

              <div className="grid md:grid-cols-3 gap-8">
                {/* Step 1 */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-3xl blur opacity-25 group-hover:opacity-50 transition-opacity" />
                  <div className="relative bg-white dark:bg-gray-900 rounded-3xl p-8 border dark:border-gray-800 h-full">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-black mb-6 mx-auto shadow-lg">
                      1
                    </div>
                    <div className="text-6xl mb-4">🔍</div>
                    <h3 className="text-xl dark:text-white font-bold mb-3">
                      <FormattedMessage id="chatter.step1.title" defaultMessage="FIND" />
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      <FormattedMessage id="chatter.step1.desc" defaultMessage="Find people online who need help abroad" />
                    </p>
                    <div className="flex justify-center gap-2 mt-4">
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full font-bold">Facebook</span>
                      <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full font-bold">WhatsApp</span>
                      <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full font-bold">Reddit</span>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-red-500 to-rose-500 rounded-3xl blur opacity-25 group-hover:opacity-50 transition-opacity" />
                  <div className="relative bg-white dark:bg-gray-900 rounded-3xl p-8 border dark:border-gray-800 h-full">
                    <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl flex items-center justify-center text-white font-black mb-6 mx-auto shadow-lg">
                      2
                    </div>
                    <div className="text-6xl mb-4">📤</div>
                    <h3 className="text-xl dark:text-white font-bold mb-3">
                      <FormattedMessage id="chatter.step2.title" defaultMessage="SHARE" />
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      <FormattedMessage id="chatter.step2.desc" defaultMessage="Share your unique affiliate link" />
                    </p>
                    <div className="mt-4 bg-gray-100 dark:bg-gray-800 rounded-xl p-3 text-center">
                      <code className="text-sm dark:text-red-400">sos-expat.com/r/YOU</code>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-3xl blur opacity-25 group-hover:opacity-50 transition-opacity" />
                  <div className="relative bg-white dark:bg-gray-900 rounded-3xl p-8 border dark:border-gray-800 h-full">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center text-white font-black mb-6 mx-auto shadow-lg">
                      3
                    </div>
                    <div className="text-6xl mb-4">💵</div>
                    <h3 className="text-xl dark:text-white font-bold mb-3">
                      <FormattedMessage id="chatter.step3.title" defaultMessage="EARN $10" />
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
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
        <section className="py-12 md:py-16 px-4 bg-gradient-to-b from-gray-50 dark:from-gray-900 to-white dark:to-gray-950">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full font-bold mb-4">
                <Users className="w-4 h-4" />
                <FormattedMessage id="chatter.who.badge" defaultMessage="Is This For You?" />
              </div>
              <h2 className="text-2xl dark:text-white md:text-4xl font-black mb-3">
                <FormattedMessage id="chatter.who.title" defaultMessage="Who Can Become a Chatter?" />
              </h2>
              <p className="text-lg dark:text-gray-400">
                <FormattedMessage id="chatter.who.subtitle" defaultMessage="If you have a phone and social media, you're qualified!" />
              </p>
            </div>

            {/* Target profiles */}
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              {[
                { icon: <GraduationCap className="w-7 h-7" />, title: intl.formatMessage({ id: 'chatter.who.student', defaultMessage: 'Students' }), desc: intl.formatMessage({ id: 'chatter.who.student.desc', defaultMessage: 'Earn between classes' }), color: 'from-blue-500 to-indigo-500' },
                { icon: <Home className="w-7 h-7" />, title: intl.formatMessage({ id: 'chatter.who.parent', defaultMessage: 'Stay-at-home Parents' }), desc: intl.formatMessage({ id: 'chatter.who.parent.desc', defaultMessage: 'Work from home' }), color: 'from-pink-500 to-rose-500' },
                { icon: <Briefcase className="w-7 h-7" />, title: intl.formatMessage({ id: 'chatter.who.sidehustle', defaultMessage: 'Side Hustlers' }), desc: intl.formatMessage({ id: 'chatter.who.sidehustle.desc', defaultMessage: 'Extra income stream' }), color: 'from-green-500 to-emerald-500' },
                { icon: <MessageCircle className="w-7 h-7" />, title: intl.formatMessage({ id: 'chatter.who.influencer', defaultMessage: 'Social Media Users' }), desc: intl.formatMessage({ id: 'chatter.who.influencer.desc', defaultMessage: 'Monetize your network' }), color: 'from-red-500 to-rose-500' },
              ].map((profile, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-5 border dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all">
                  <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${profile.color} flex items-center justify-center text-white`}>
                    {profile.icon}
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-1">{profile.title}</h3>
                  <p className="text-sm dark:text-gray-400">{profile.desc}</p>
                </div>
              ))}
            </div>

            {/* Requirements - Super simple */}
            <div className="bg-gradient-to-r from-green-50 dark:from-green-900/20 to-emerald-50 dark:to-emerald-900/20 rounded-2xl p-6 border dark:border-green-800">
              <h3 className="font-bold text-center dark:text-white mb-4">
                <FormattedMessage id="chatter.who.requirements" defaultMessage="All You Need:" />
              </h3>
              <div className="flex justify-center gap-4">
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
              <p className="text-center dark:text-green-400 font-medium mt-4">
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
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full font-bold mb-4">
                <Gift className="w-4 h-4" />
                <FormattedMessage id="chatter.tools.badge" defaultMessage="Everything Included" />
              </div>
              <h2 className="text-2xl dark:text-white md:text-4xl font-black mb-3">
                <FormattedMessage id="chatter.tools.title" defaultMessage="What You Get (100% Free)" />
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Tool 1: Personal Links */}
              <div className="bg-gradient-to-br from-blue-50 dark:from-blue-900/20 to-indigo-50 dark:to-indigo-900/20 rounded-2xl p-6 border dark:border-blue-800">
                <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center mb-4">
                  <Share2 className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                  <FormattedMessage id="chatter.tools.links.title" defaultMessage="2 Personal Links" />
                </h3>
                <p className="text-sm dark:text-gray-400 mb-3">
                  <FormattedMessage id="chatter.tools.links.desc" defaultMessage="One for finding clients, one for recruiting chatters. Track every conversion." />
                </p>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-2 text-xs dark:text-blue-400 font-mono">
                  sos-expat.com/r/<span className="text-amber-500">YOUR_CODE</span>
                </div>
              </div>

              {/* Tool 2: Dashboard */}
              <div className="bg-gradient-to-br from-red-50 dark:from-red-900/20 to-rose-50 dark:to-rose-900/20 rounded-2xl p-6 border dark:border-red-800">
                <div className="w-14 h-14 bg-red-500 rounded-2xl flex items-center justify-center mb-4">
                  <TrendingUp className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                  <FormattedMessage id="chatter.tools.dashboard.title" defaultMessage="Pro Dashboard" />
                </h3>
                <p className="text-sm dark:text-gray-400 mb-3">
                  <FormattedMessage id="chatter.tools.dashboard.desc" defaultMessage="Real-time earnings, team stats, leaderboard, withdrawal requests. All on mobile." />
                </p>
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-red-100 dark:bg-red-800 text-red-600 dark:text-red-300 rounded">Live stats</span>
                  <span className="px-2 py-1 bg-red-100 dark:bg-red-800 text-red-600 dark:text-red-300 rounded">Mobile-first</span>
                </div>
              </div>

              {/* Tool 3: Training */}
              <div className="bg-gradient-to-br from-green-50 dark:from-green-900/20 to-emerald-50 dark:to-emerald-900/20 rounded-2xl p-6 border dark:border-green-800">
                <div className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center mb-4">
                  <GraduationCap className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                  <FormattedMessage id="chatter.tools.training.title" defaultMessage="Free Training" />
                </h3>
                <p className="text-sm dark:text-gray-400 mb-3">
                  <FormattedMessage id="chatter.tools.training.desc" defaultMessage="Video tutorials, best practices, message templates. Learn the winning strategies." />
                </p>
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-300 rounded">Videos</span>
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-300 rounded">Templates</span>
                </div>
              </div>

              {/* Tool 4: Support */}
              <div className="bg-gradient-to-br from-amber-50 dark:from-amber-900/20 to-yellow-50 dark:to-yellow-900/20 rounded-2xl p-6 border dark:border-amber-800">
                <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center mb-4">
                  <MessageCircle className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                  <FormattedMessage id="chatter.tools.support.title" defaultMessage="WhatsApp Support" />
                </h3>
                <p className="text-sm dark:text-gray-400">
                  <FormattedMessage id="chatter.tools.support.desc" defaultMessage="Direct access to our team. Questions answered within hours, not days." />
                </p>
              </div>

              {/* Tool 5: Community */}
              <div className="bg-gradient-to-br from-red-50 dark:from-red-900/20 to-orange-50 dark:to-orange-900/20 rounded-2xl p-6 border dark:border-red-800">
                <div className="w-14 h-14 bg-red-500 rounded-2xl flex items-center justify-center mb-4">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                  <FormattedMessage id="chatter.tools.community.title" defaultMessage="Chatter Community" />
                </h3>
                <p className="text-sm dark:text-gray-400">
                  <FormattedMessage id="chatter.tools.community.desc" defaultMessage="Private group to share tips, celebrate wins, and learn from top earners." />
                </p>
              </div>

              {/* Tool 6: Marketing Materials */}
              <div className="bg-gradient-to-br from-cyan-50 dark:from-cyan-900/20 to-blue-50 dark:to-blue-900/20 rounded-2xl p-6 border dark:border-cyan-800">
                <div className="w-14 h-14 bg-cyan-500 rounded-2xl flex items-center justify-center mb-4">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                  <FormattedMessage id="chatter.tools.materials.title" defaultMessage="Ready-to-Use Content" />
                </h3>
                <p className="text-sm dark:text-gray-400">
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
              <p className="text-xl max-w-2xl mx-auto">
                <FormattedMessage id="chatter.team.subtitle" defaultMessage="Recruit other chatters. Get $1 per call from N1, $0.50 from N2. Forever. No limits." />
              </p>
            </div>

            {/* Visual network */}
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 md:p-12 border max-w-3xl mx-auto mb-10">
              {/* You at the top */}
              <div className="flex items-center">
                <div className="relative">
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl">
                    <Crown className="w-12 h-12 text-orange-500" />
                  </div>
                  <div className="absolute -bottom-2 left-1/2 px-3 py-1 bg-orange-500 rounded-full text-xs font-bold whitespace-nowrap">
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
                    <div key={i} className="flex items-center">
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
                  <span className="px-3 py-1 bg-green-500/30 rounded-full text-xs font-bold">
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
                <div className="flex justify-center gap-4 md:gap-8 mb-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex items-center">
                      <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 opacity-60" />
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center font-bold">
                      +∞
                    </div>
                  </div>
                </div>

                {/* N2 Label */}
                <div className="flex items-center justify-center gap-2">
                  <div className="h-px w-12 bg-white/30" />
                  <span className="px-3 py-1 bg-cyan-500/30 rounded-full text-xs font-bold">
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
                    <div className="text-sm mb-1">N1: 20 chatters × 15 calls</div>
                    <div className="text-2xl font-black">= $300</div>
                  </div>
                  <div className="bg-cyan-500/20 rounded-xl p-4 text-center">
                    <div className="text-sm mb-1">N2: 40 chatters × 10 calls</div>
                    <div className="text-2xl font-black">= $200</div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-yellow-500/30 to-amber-500/30 rounded-xl p-4 text-center border">
                  <div className="text-sm mb-1">
                    <FormattedMessage id="chatter.team.total" defaultMessage="Your Total Passive Income" />
                  </div>
                  <div className="text-4xl md:text-5xl font-black">
                    $500<span className="text-xl">/mo</span>
                  </div>
                </div>
              </div>
            </div>

            {/* TIER BONUSES - Show the escalation */}
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 md:p-8 max-w-3xl mx-auto mb-10 border">
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-400/20 rounded-full mb-3">
                  <Crown className="w-4 h-4 text-yellow-300" />
                  <span className="text-sm font-bold">
                    <FormattedMessage id="chatter.tiers.badge" defaultMessage="Recruitment Bonuses" />
                  </span>
                </div>
                <h3 className="text-xl md:text-2xl font-bold">
                  <FormattedMessage id="chatter.tiers.title" defaultMessage="Earn Bonus for Every Milestone!" />
                </h3>
              </div>

              <div className="grid md:grid-cols-5 gap-2 md:gap-3">
                {[
                  { recruits: 5, bonus: 15 },
                  { recruits: 10, bonus: 35 },
                  { recruits: 20, bonus: 75 },
                  { recruits: 50, bonus: 250 },
                  { recruits: 100, bonus: 600 },
                ].map((tier, i) => (
                  <div
                    key={i}
                    className={`text-center p-3 rounded-xl ${
                      tier.bonus >= 250
                        ? 'bg-gradient-to-br from-yellow-400/30 to-amber-500/30 border border-yellow-400/40'
                        : 'bg-white/10'
                    }`}
                  >
                    <div className="text-2xl mb-1">{tier.bonus >= 600 ? '🏆' : tier.bonus >= 250 ? '⭐' : '🎯'}</div>
                    <div className="font-bold text-yellow-300">${tier.bonus.toLocaleString()}</div>
                    <div className="text-xs">{tier.recruits} <FormattedMessage id="chatter.tiers.recruits" defaultMessage="filleuls qualifiés" /></div>
                  </div>
                ))}
              </div>

              <p className="text-center mt-4">
                <FormattedMessage id="chatter.tiers.note" defaultMessage="Primes uniques versées quand ton filleul atteint $20 de gains directs" />
              </p>
            </div>

            {/* Key benefits */}
            <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-10">
              {[
                { icon: '♾️', title: intl.formatMessage({ id: 'chatter.team.benefit1.title', defaultMessage: 'Unlimited Team' }), desc: intl.formatMessage({ id: 'chatter.team.benefit1.desc', defaultMessage: 'No cap on how many you recruit' }) },
                { icon: '🔄', title: intl.formatMessage({ id: 'chatter.team.benefit2.title', defaultMessage: 'Forever Earnings' }), desc: intl.formatMessage({ id: 'chatter.team.benefit2.desc', defaultMessage: '$1/call N1, $0.50/call N2' }) },
                { icon: '🚀', title: intl.formatMessage({ id: 'chatter.team.benefit3.title', defaultMessage: 'Stack Income' }), desc: intl.formatMessage({ id: 'chatter.team.benefit3.desc', defaultMessage: 'Your clients + their clients' }) },
              ].map((benefit, i) => (
                <div key={i} className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 text-center border">
                  <div className="text-4xl mb-3">{benefit.icon}</div>
                  <h4 className="font-bold mb-1">{benefit.title}</h4>
                  <p className="text-sm">{benefit.desc}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="text-center">
              <button
                onClick={() => navigate(registerRoute)}
                aria-label={intl.formatMessage({ id: 'chatter.aria.cta.team', defaultMessage: 'Start building your team and earn passive income' })}
                className="group bg-white text-orange-600 font-black px-10 py-5 rounded-2xl inline-flex items-center gap-4 hover:bg-gray-100 transition-all shadow-2xl animate-pulse-glow-orange"
              >
                <Rocket className="w-7 h-7" />
                <FormattedMessage id="chatter.team.cta" defaultMessage="Start Building Your Empire" />
                <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
              </button>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* PROVIDER RECRUITMENT - SECOND INCOME STREAM */}
        {/* ============================================================== */}
        <section className="py-16 md:py-24 px-4 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white relative overflow-hidden">
          {/* Background decorations */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-20 -left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-20 -right-20 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl" />
          </div>

          <div className="max-w-5xl mx-auto relative z-10">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-bold mb-4">
                <Scale className="w-4 h-4" />
                <FormattedMessage id="chatter.provider.badge" defaultMessage="Your 2nd Affiliate Link" />
              </div>
              <h2 className="text-3xl md:text-5xl font-black mb-4">
                <FormattedMessage id="chatter.provider.title" defaultMessage="Recruit Lawyers & Helpers" />
              </h2>
              <p className="text-xl max-w-2xl mx-auto">
                <FormattedMessage id="chatter.provider.subtitle" defaultMessage="Earn $5 for EVERY call your recruited provider receives. For 6 months!" />
              </p>
            </div>

            {/* Visual explanation */}
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 md:p-12 border max-w-3xl mx-auto mb-10">
              {/* You at the top */}
              <div className="flex items-center">
                <div className="relative">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl">
                    <Crown className="w-10 h-10 text-emerald-500" />
                  </div>
                  <div className="absolute -bottom-2 left-1/2 px-3 py-1 bg-emerald-500 rounded-full text-xs font-bold whitespace-nowrap">
                    <FormattedMessage id="chatter.provider.you" defaultMessage="YOU" />
                  </div>
                </div>

                {/* Connection lines */}
                <div className="w-0.5 h-8 bg-white/30 mt-4" />
                <div className="w-48 h-0.5 bg-white/30" />
                <div className="flex justify-between w-48">
                  <div className="w-0.5 h-8 bg-white/30" />
                  <div className="w-0.5 h-8 bg-white/30" />
                </div>

                {/* Recruited Providers */}
                <div className="flex justify-center gap-12 md:gap-20 mb-6">
                  <div className="flex items-center">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                      <Scale className="w-8 h-8" />
                    </div>
                    <span className="mt-2 text-sm font-medium opacity-80">
                      <FormattedMessage id="chatter.provider.lawyer" defaultMessage="Lawyer" />
                    </span>
                    <span className="text-emerald-300 font-bold">~22 calls/mo</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                      <Users className="w-8 h-8" />
                    </div>
                    <span className="mt-2 text-sm font-medium opacity-80">
                      <FormattedMessage id="chatter.provider.helper" defaultMessage="Helper" />
                    </span>
                    <span className="text-emerald-300 font-bold">~22 calls/mo</span>
                  </div>
                </div>

                {/* Commission label */}
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div className="h-px w-12 bg-white/30" />
                  <span className="px-4 py-2 bg-emerald-400/30 rounded-full text-sm font-bold">
                    $5/call × 6 months
                  </span>
                  <div className="h-px w-12 bg-white/30" />
                </div>
              </div>

              {/* Example calculation */}
              <div className="mt-8 bg-white/10 rounded-2xl p-6">
                <p className="font-semibold mb-4 text-center">
                  <FormattedMessage id="chatter.provider.example.title" defaultMessage="Example: 1 Recruited Provider" />
                </p>
                <div className="grid gap-4 text-center">
                  <div className="bg-emerald-500/20 rounded-xl p-4">
                    <div className="text-sm mb-1">
                      <FormattedMessage id="chatter.provider.monthly" defaultMessage="Per Month" />
                    </div>
                    <div className="text-2xl font-black">$110</div>
                    <div className="text-xs">22 × $5</div>
                  </div>
                  <div className="bg-emerald-500/20 rounded-xl p-4">
                    <div className="text-sm mb-1">
                      <FormattedMessage id="chatter.provider.duration" defaultMessage="Duration" />
                    </div>
                    <div className="text-2xl font-black">6</div>
                    <div className="text-xs"><FormattedMessage id="chatter.provider.months" defaultMessage="months" /></div>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-400/30 to-teal-400/30 rounded-xl p-4 border">
                    <div className="text-sm mb-1">
                      <FormattedMessage id="chatter.provider.total" defaultMessage="Total" />
                    </div>
                    <div className="text-2xl font-black">$660</div>
                    <div className="text-xs"><FormattedMessage id="chatter.provider.perProvider" defaultMessage="per provider!" /></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Key benefits */}
            <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-10">
              {[
                { icon: '⚖️', title: intl.formatMessage({ id: 'chatter.provider.benefit1.title', defaultMessage: 'Recruit Lawyers' }), desc: intl.formatMessage({ id: 'chatter.provider.benefit1.desc', defaultMessage: 'Attorneys needing clients' }) },
                { icon: '🤝', title: intl.formatMessage({ id: 'chatter.provider.benefit2.title', defaultMessage: 'Recruit Helpers' }), desc: intl.formatMessage({ id: 'chatter.provider.benefit2.desc', defaultMessage: 'Expat experts & consultants' }) },
                { icon: '💵', title: intl.formatMessage({ id: 'chatter.provider.benefit3.title', defaultMessage: '$5 × Every Call' }), desc: intl.formatMessage({ id: 'chatter.provider.benefit3.desc', defaultMessage: '6 months of passive income' }) },
              ].map((benefit, i) => (
                <div key={i} className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 text-center border">
                  <div className="text-4xl mb-3">{benefit.icon}</div>
                  <h4 className="font-bold mb-1">{benefit.title}</h4>
                  <p className="text-sm">{benefit.desc}</p>
                </div>
              ))}
            </div>

            {/* Your 2 links */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 max-w-2xl mx-auto text-center">
              <h4 className="font-bold mb-4">
                <FormattedMessage id="chatter.provider.links.title" defaultMessage="You Get 2 Affiliate Links" />
              </h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-amber-500/20 rounded-xl p-4 border">
                  <div className="text-xs mb-1">
                    <FormattedMessage id="chatter.provider.link1.label" defaultMessage="Link 1: For Clients" />
                  </div>
                  <code className="text-sm">sos-expat.com/r/<span className="text-amber-300">CODE</span></code>
                  <div className="text-xs mt-2">$10/call</div>
                </div>
                <div className="bg-emerald-500/20 rounded-xl p-4 border">
                  <div className="text-xs mb-1">
                    <FormattedMessage id="chatter.provider.link2.label" defaultMessage="Link 2: For Providers" />
                  </div>
                  <code className="text-sm">sos-expat.com/become-provider?ref=<span className="text-emerald-300">CODE</span></code>
                  <div className="text-xs mt-2">$5/call × 6 mo</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* WHERE TO FIND CLIENTS - VISUAL */}
        {/* ============================================================== */}
        <section className="py-16 md:py-20 px-4 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl dark:text-white md:text-4xl font-black mb-4">
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
                <div className="flex md:flex-row md:items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                    <span className="text-4xl">👥</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-2xl md:text-3xl font-black">
                        <FormattedMessage id="chatter.fbgroups.title" defaultMessage="Facebook Groups" />
                      </h3>
                      <span className="px-3 py-1 bg-yellow-400 text-yellow-900 rounded-full font-bold">
                        #1
                      </span>
                    </div>
                    <p className="text-white/80">
                      <FormattedMessage id="chatter.fbgroups.desc" defaultMessage="Millions of expats looking for help every day" />
                    </p>
                  </div>
                </div>
                <div className="grid md:grid-cols-4 gap-3">
                  {[
                    intl.formatMessage({ id: 'chatter.fbgroups.ex1', defaultMessage: '"Expats in Dubai"' }),
                    intl.formatMessage({ id: 'chatter.fbgroups.ex2', defaultMessage: '"French in London"' }),
                    intl.formatMessage({ id: 'chatter.fbgroups.ex3', defaultMessage: '"Americans Abroad"' }),
                    intl.formatMessage({ id: 'chatter.fbgroups.ex4', defaultMessage: '"Digital Nomads"' }),
                  ].map((group, i) => (
                    <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 text-center font-medium">
                      {group}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Other platforms grid */}
            <div className="grid md:grid-cols-5 gap-4">
              {[
                { name: 'WhatsApp', icon: '💬', color: 'from-green-500 to-emerald-500' },
                { name: 'Reddit', icon: '🔴', color: 'from-orange-500 to-red-500' },
                { name: 'Telegram', icon: '✈️', color: 'from-blue-400 to-cyan-500' },
                { name: 'Quora', icon: '❓', color: 'from-red-500 to-rose-500' },
                { name: intl.formatMessage({ id: 'chatter.platform.forums.name', defaultMessage: 'Forums' }), icon: '🌐', color: 'from-red-500 to-rose-500' },
              ].map((platform, i) => (
                <div
                  key={i}
                  className="group bg-white dark:bg-gray-800 rounded-2xl p-5 text-center border dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer"
                >
                  <div className={`w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br ${platform.color} flex items-center justify-center`}>
                    <span className="text-2xl">{platform.icon}</span>
                  </div>
                  <div className="font-bold text-gray-900 dark:text-white">{platform.name}</div>
                </div>
              ))}
            </div>

            {/* Content Creation Section */}
            <div className="mt-8 bg-gradient-to-r from-rose-50 dark:from-rose-900/20 to-red-50 dark:to-red-900/20 rounded-3xl p-6 md:p-8 border dark:border-pink-800">
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded-full font-bold mb-3">
                  <Sparkles className="w-4 h-4" />
                  <FormattedMessage id="chatter.content.badge" defaultMessage="Create Content!" />
                </div>
                <h3 className="text-xl dark:text-white md:text-2xl font-bold">
                  <FormattedMessage id="chatter.content.title" defaultMessage="Share Everywhere, Earn Forever" />
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  <FormattedMessage id="chatter.content.subtitle" defaultMessage="Your link works unlimited times - create once, earn forever!" />
                </p>
              </div>
              <div className="grid md:grid-cols-4 gap-4">
                {[
                  { name: 'TikTok', icon: '🎵', desc: intl.formatMessage({ id: 'chatter.content.tiktok', defaultMessage: 'Short videos' }) },
                  { name: 'Instagram', icon: '📸', desc: intl.formatMessage({ id: 'chatter.content.instagram', defaultMessage: 'Reels & Stories' }) },
                  { name: 'YouTube', icon: '🎬', desc: intl.formatMessage({ id: 'chatter.content.youtube', defaultMessage: 'Tutorials & vlogs' }) },
                  { name: intl.formatMessage({ id: 'chatter.content.blog.name', defaultMessage: 'Blog/Articles' }), icon: '✍️', desc: intl.formatMessage({ id: 'chatter.content.blog', defaultMessage: 'SEO content' }) },
                ].map((platform, i) => (
                  <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-4 text-center border dark:border-gray-700">
                    <span className="text-3xl block mb-2">{platform.icon}</span>
                    <div className="font-bold text-gray-900 dark:text-white">{platform.name}</div>
                    <div className="text-xs dark:text-gray-400 mt-1">{platform.desc}</div>
                  </div>
                ))}
              </div>
              <p className="text-center dark:text-pink-400 font-medium mt-4">
                <FormattedMessage id="chatter.content.note" defaultMessage="Create tutorials, share tips, make videos - your link = unlimited earning potential!" />
              </p>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* SOCIAL PROOF - TESTIMONIALS & LIVE ACTIVITY */}
        {/* ============================================================== */}
        <section className="py-16 md:py-20 px-4 bg-white dark:bg-gray-950">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full font-bold mb-4">
                <Sparkles className="w-4 h-4" />
                <FormattedMessage id="chatter.social.badge" defaultMessage="Real Success Stories" />
              </div>
              <h2 className="text-2xl dark:text-white md:text-4xl font-black">
                <FormattedMessage id="chatter.social.title" defaultMessage="Chatters Are Earning Every Day" />
              </h2>
            </div>

            {/* Stats bar */}
            <div className="grid gap-4 mb-10">
              {[
                { value: <AnimatedCounter end={1247} />, label: intl.formatMessage({ id: 'chatter.stats.chatters', defaultMessage: 'Active Chatters' }), icon: '👥' },
                { value: <AnimatedCounter end={9} />, label: intl.formatMessage({ id: 'chatter.stats.languages', defaultMessage: 'Languages Supported' }), icon: '🌐' },
                { value: <AnimatedCounter end={47} />, label: intl.formatMessage({ id: 'chatter.stats.countries', defaultMessage: 'Countries' }), icon: '🌍' },
              ].map((stat, i) => (
                <div key={i} className="bg-gradient-to-br from-gray-50 dark:from-gray-800 to-gray-100 dark:to-gray-900 rounded-2xl p-4 md:p-6 text-center">
                  <div className="text-2xl mb-2">{stat.icon}</div>
                  <div className="text-2xl dark:text-white md:text-3xl font-black">
                    {stat.value}
                  </div>
                  <div className="text-xs dark:text-gray-400 md:text-sm">
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
                      ? 'bg-gradient-to-br from-red-600 to-red-700 text-white'
                      : 'bg-gray-50 dark:bg-gray-800'
                  }`}
                >
                  {testimonial.highlight && (
                    <div className="absolute -top-3 left-1/2 px-3 py-1 bg-amber-400 text-gray-900 rounded-full font-bold">
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
                    {testimonial.amount} <span className={`text-sm font-normal ${testimonial.highlight ? 'text-white/85' : 'text-gray-500'}`}>{testimonial.period}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Live activity feed */}
            <div className="bg-gradient-to-r from-amber-50 dark:from-amber-900/20 to-yellow-50 dark:to-yellow-900/20 rounded-2xl p-4 border dark:border-amber-800">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse" />
                <span className="text-sm dark:text-amber-400 font-bold">
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
              <h3 className="text-2xl dark:text-white md:text-3xl font-black mb-2">
                <FormattedMessage id="chatter.payment.title" defaultMessage="Get Paid Your Way" />
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                <FormattedMessage id="chatter.payment.subtitle" defaultMessage="Withdraw anywhere in the world" />
              </p>
            </div>

            <div className="flex justify-center gap-4 mb-6">
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
                    <div className="text-xs">{method.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center gap-6 text-sm dark:text-gray-400">
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
              <h2 className="text-2xl dark:text-white md:text-4xl font-black mb-2">
                <FormattedMessage id="chatter.faq.title" defaultMessage="Questions?" />
              </h2>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    aria-expanded={openFaq === idx}
                    aria-controls={`faq-answer-${idx}`}
                    aria-label={`${faq.question} - ${intl.formatMessage({ id: 'chatter.aria.faq.toggle', defaultMessage: 'Click to expand or collapse this FAQ' })}`}
                    className="w-full flex items-center gap-4 p-5 text-left"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-red-100 dark:from-red-900/30 to-rose-100 dark:to-rose-900/30 rounded-xl flex items-center justify-center text-red-600 dark:text-red-400">
                      {faq.icon}
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white flex-1 pr-4">
                      {faq.question}
                    </h3>
                    <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform flex-shrink-0 ${openFaq === idx ? 'rotate-180' : ''}`} />
                  </button>
                  {openFaq === idx && (
                    <div id={`faq-answer-${idx}`} className="px-5 pb-5 pl-[4.5rem] text-gray-600 dark:text-gray-300 animate-slide-up">
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
        <section className="py-12 md:py-16 px-4 bg-gradient-to-r from-green-50 dark:from-green-900/20 via-emerald-50 dark:via-emerald-900/20 to-teal-50 dark:to-teal-900/20">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 md:p-12 shadow-xl border dark:border-green-800">
              <div className="text-center mb-8">
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mb-4">
                  <ShieldCheck className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl dark:text-white md:text-4xl font-black mb-3">
                  <FormattedMessage id="chatter.risk.title" defaultMessage="Zero Risk. Nothing to Lose." />
                </h2>
                <p className="text-lg dark:text-gray-400">
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
                      <p className="text-sm dark:text-gray-400">{item.desc}</p>
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
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 backdrop-blur-sm rounded-full mb-6 border">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span className="font-bold text-amber-400">
                <FormattedMessage id="chatter.final.badge" defaultMessage="Join 2,800+ Chatters Worldwide" />
              </span>
            </div>

            <h2 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
              <FormattedMessage id="chatter.final.title" defaultMessage="Ready to Change Your Life?" />
            </h2>

            <p className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto">
              <FormattedMessage id="chatter.final.subtitle" defaultMessage="Start earning today. Build your team. Create passive income." />
            </p>

            {/* Benefits checklist */}
            <div className="flex justify-center gap-4 mb-10">
              {[
                intl.formatMessage({ id: 'chatter.final.check1', defaultMessage: '$10 per client' }),
                intl.formatMessage({ id: 'chatter.final.check2', defaultMessage: '$1/call from team' }),
                intl.formatMessage({ id: 'chatter.final.check3', defaultMessage: 'Unlimited team' }),
                intl.formatMessage({ id: 'chatter.final.check4', defaultMessage: '100% free' }),
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 bg-amber-500/10 backdrop-blur-sm rounded-full px-4 py-2 border">
                  <CheckCircle className="w-5 h-5 text-amber-400" />
                  <span className="font-medium">{item}</span>
                </div>
              ))}
            </div>

            {/* MEGA CTA - GOLD */}
            <button
              onClick={() => navigate(registerRoute)}
              aria-label={intl.formatMessage({ id: 'chatter.aria.cta.final', defaultMessage: 'Become a Chatter now - Join our affiliate program and start earning today' })}
              className="group relative bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 text-gray-900 font-black px-12 py-7 rounded-2xl md:text-3xl inline-flex items-center gap-4 hover:from-amber-300 hover:via-yellow-400 hover:to-amber-300 transition-all shadow-2xl animate-pulse-glow-gold overflow-hidden"
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
            <div className="bg-gray-900 border-t px-4 py-3 shadow-2xl">
              <button
                onClick={() => navigate(registerRoute)}
                aria-label={intl.formatMessage({ id: 'chatter.aria.cta.sticky', defaultMessage: 'Earn $10 per call - Register free as a Chatter' })}
                className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-gray-900 font-bold py-5 rounded-xl flex items-center justify-center gap-2 sm:gap-3 shadow-lg min-h-[56px] touch-manipulation"
              >
                <DollarSign className="w-5 h-5" />
                <span className="text-base sm:text-lg"><FormattedMessage id="chatter.sticky.cta" defaultMessage="Earn $10/call - Start Free" /></span>
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
