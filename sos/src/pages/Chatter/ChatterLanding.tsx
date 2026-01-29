/**
 * ChatterLanding - Mobile-first landing page for the Chatter program
 * Comprehensive page explaining the role, earnings, and benefits
 *
 * SEO 2026 Optimized:
 * - FAQPageSchema for featured snippets (Position 0)
 * - HreflangLinks for 9 languages
 * - AI meta tags for LLM referencing
 * - Mobile-first responsive design for Facebook sales funnels
 */

import React, { useState } from 'react';
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
} from 'lucide-react';

// Design tokens - Mobile-first with SOS-Expat red brand colors
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "w-full md:w-auto bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl",
  },
} as const;

const ChatterLanding: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const location = useLocation();
  const { language } = useApp();
  const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const registerRoute = `/${getTranslatedRouteSlug('chatter-register' as RouteKey, langCode)}`;

  // SEO 2026 - Meta tags optimized for AI/LLM and featured snippets
  const seoTitle = intl.formatMessage({
    id: 'chatter.landing.seo.title',
    defaultMessage: 'Become a SOS-Expat Chatter | Earn commissions by recommending'
  });
  const seoDescription = intl.formatMessage({
    id: 'chatter.landing.seo.description',
    defaultMessage: 'Join the SOS-Expat Chatter program and earn $10 per referred client. Recruitment commission, Top 3 bonus, 5 levels. Free registration, withdraw via Wise or Mobile Money.'
  });
  const seoKeywords = intl.formatMessage({
    id: 'chatter.landing.seo.keywords',
    defaultMessage: 'chatter, ambassador, affiliate, commission, referral, SOS-Expat, earn money, mobile money, wise'
  });
  const aiSummary = intl.formatMessage({
    id: 'chatter.landing.seo.aiSummary',
    defaultMessage: 'SOS-Expat ambassador program to earn commissions ($10/client, $5/recruitment) by recommending the platform. Gamified system with 5 levels and monthly Top 3 bonus.'
  });

  // FAQ for Position 0 featured snippets
  const faqs = [
    {
      question: intl.formatMessage({ id: 'chatter.landing.faq.q1', defaultMessage: "What is a SOS-Expat Chatter?" }),
      answer: intl.formatMessage({ id: 'chatter.landing.faq.a1', defaultMessage: "A Chatter is a SOS-Expat ambassador who naturally recommends the platform and earns commissions on each referred client or recruited provider. It's not spam - it's authentic recommendations!" }),
    },
    {
      question: intl.formatMessage({ id: 'chatter.landing.faq.q2', defaultMessage: 'How much can I earn as a Chatter?' }),
      answer: intl.formatMessage({ id: 'chatter.landing.faq.a2', defaultMessage: "You earn $10 per paid call from a referred client and $5 per call received by a recruited provider (for 6 months). Bonuses up to +100% are possible for the monthly Top 3." }),
    },
    {
      question: intl.formatMessage({ id: 'chatter.landing.faq.q3', defaultMessage: "Is registration free?" }),
      answer: intl.formatMessage({ id: 'chatter.landing.faq.a3', defaultMessage: "Yes, joining the Chatter program is 100% free. You just need to pass a qualification quiz (85% success required)." }),
    },
    {
      question: intl.formatMessage({ id: 'chatter.landing.faq.q4', defaultMessage: 'How do I withdraw my earnings?' }),
      answer: intl.formatMessage({ id: 'chatter.landing.faq.a4', defaultMessage: "You can withdraw via Wise, Mobile Money (Orange Money, Wave, MTN) or bank transfer once you reach the minimum threshold of $25." }),
    },
    {
      question: intl.formatMessage({ id: 'chatter.landing.faq.q5', defaultMessage: 'How do Chatter levels work?' }),
      answer: intl.formatMessage({ id: 'chatter.landing.faq.a5', defaultMessage: "There are 5 levels (Bronze, Silver, Gold, Platinum, Diamond) with increasing bonuses from +5% to +20% on your commissions. You level up by reaching conversion goals." }),
    },
    {
      question: intl.formatMessage({ id: 'chatter.landing.faq.q6', defaultMessage: 'Do I need to spam to succeed?' }),
      answer: intl.formatMessage({ id: 'chatter.landing.faq.a6', defaultMessage: "Absolutely not! The best Chatters interact naturally and share their link at the right moment. Quality always beats quantity. Authentic recommendations convert much better." }),
    },
    {
      question: intl.formatMessage({ id: 'chatter.landing.faq.q7', defaultMessage: 'How long do I earn from my recruits?' }),
      answer: intl.formatMessage({ id: 'chatter.landing.faq.a7', defaultMessage: "You earn $5 per call received by providers you recruit for 6 months. If they become active providers, that's passive income for you!" }),
    },
  ];

  // Quick stats for social proof
  const quickStats = [
    { value: '$10', label: intl.formatMessage({ id: 'chatter.landing.stat.perClient', defaultMessage: 'per client' }) },
    { value: '$5', label: intl.formatMessage({ id: 'chatter.landing.stat.perRecruit', defaultMessage: 'per recruit' }) },
    { value: '5', label: intl.formatMessage({ id: 'chatter.landing.stat.levels', defaultMessage: 'levels' }) },
    { value: '$25', label: intl.formatMessage({ id: 'chatter.landing.stat.minWithdraw', defaultMessage: 'min. withdraw' }) },
  ];

  // What chatters do - explain the role
  const chatterRole = [
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: intl.formatMessage({ id: 'chatter.landing.role1.title', defaultMessage: 'Chat naturally' }),
      desc: intl.formatMessage({ id: 'chatter.landing.role1.desc', defaultMessage: 'Engage in genuine conversations on social media, WhatsApp groups, and forums' }),
    },
    {
      icon: <Heart className="w-6 h-6" />,
      title: intl.formatMessage({ id: 'chatter.landing.role2.title', defaultMessage: 'Help people' }),
      desc: intl.formatMessage({ id: 'chatter.landing.role2.desc', defaultMessage: 'When someone needs help with expat services, share your link at the right moment' }),
    },
    {
      icon: <Share2 className="w-6 h-6" />,
      title: intl.formatMessage({ id: 'chatter.landing.role3.title', defaultMessage: 'Share authentically' }),
      desc: intl.formatMessage({ id: 'chatter.landing.role3.desc', defaultMessage: 'No spam, no pressure. Just genuine recommendations when they make sense' }),
    },
    {
      icon: <DollarSign className="w-6 h-6" />,
      title: intl.formatMessage({ id: 'chatter.landing.role4.title', defaultMessage: 'Earn commissions' }),
      desc: intl.formatMessage({ id: 'chatter.landing.role4.desc', defaultMessage: 'Get paid when your referrals make calls or when you recruit new providers' }),
    },
  ];

  // Real earnings examples
  const earningsExamples = [
    {
      name: 'Sarah M.',
      location: intl.formatMessage({ id: 'chatter.landing.example1.location', defaultMessage: 'Senegal' }),
      monthly: '$340',
      desc: intl.formatMessage({ id: 'chatter.landing.example1.desc', defaultMessage: '34 clients referred through WhatsApp groups' }),
      level: 'Gold',
    },
    {
      name: 'Amadou K.',
      location: intl.formatMessage({ id: 'chatter.landing.example2.location', defaultMessage: 'France' }),
      monthly: '$520',
      desc: intl.formatMessage({ id: 'chatter.landing.example2.desc', defaultMessage: '40 clients + 8 provider recruits' }),
      level: 'Platinum',
    },
    {
      name: 'Marie L.',
      location: intl.formatMessage({ id: 'chatter.landing.example3.location', defaultMessage: 'Canada' }),
      monthly: '$180',
      desc: intl.formatMessage({ id: 'chatter.landing.example3.desc', defaultMessage: 'Part-time, 18 clients via Facebook' }),
      level: 'Silver',
    },
  ];

  // Level system
  const levels = [
    { name: 'Bronze', bonus: '+5%', requirement: '0-9', color: 'from-amber-600 to-amber-700' },
    { name: 'Silver', bonus: '+8%', requirement: '10-29', color: 'from-gray-400 to-gray-500' },
    { name: 'Gold', bonus: '+12%', requirement: '30-59', color: 'from-yellow-400 to-yellow-500' },
    { name: 'Platinum', bonus: '+15%', requirement: '60-99', color: 'from-cyan-400 to-cyan-500' },
    { name: 'Diamond', bonus: '+20%', requirement: '100+', color: 'from-purple-400 to-pink-400' },
  ];

  // Payment methods
  const paymentMethods = [
    { name: 'Wise', icon: '🌐' },
    { name: 'Orange Money', icon: '📱' },
    { name: 'Wave', icon: '💳' },
    { name: 'MTN Mobile Money', icon: '📲' },
    { name: intl.formatMessage({ id: 'chatter.landing.payment.bank', defaultMessage: 'Bank Transfer' }), icon: '🏦' },
  ];

  // Steps to get started
  const steps = [
    {
      num: 1,
      title: intl.formatMessage({ id: 'chatter.landing.step1.title', defaultMessage: 'Sign up' }),
      desc: intl.formatMessage({ id: 'chatter.landing.step1.desc', defaultMessage: 'Create your Chatter account in 2 minutes' }),
      icon: <Smartphone className="w-5 h-5" />,
    },
    {
      num: 2,
      title: intl.formatMessage({ id: 'chatter.landing.step2.title', defaultMessage: 'Pass the quiz' }),
      desc: intl.formatMessage({ id: 'chatter.landing.step2.desc', defaultMessage: 'Validate your knowledge about SOS-Expat' }),
      icon: <CheckCircle className="w-5 h-5" />,
    },
    {
      num: 3,
      title: intl.formatMessage({ id: 'chatter.landing.step3.title', defaultMessage: 'Get your links' }),
      desc: intl.formatMessage({ id: 'chatter.landing.step3.desc', defaultMessage: 'Receive your unique referral and recruitment codes' }),
      icon: <Share2 className="w-5 h-5" />,
    },
    {
      num: 4,
      title: intl.formatMessage({ id: 'chatter.landing.step4.title', defaultMessage: 'Start earning' }),
      desc: intl.formatMessage({ id: 'chatter.landing.step4.desc', defaultMessage: 'Share naturally and watch your earnings grow' }),
      icon: <DollarSign className="w-5 h-5" />,
    },
  ];

  return (
    <Layout>
      {/* SEO 2026 - Complete meta tags for AI/LLM and search engines */}
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        ogImage="/og-chatter.jpg"
        ogType="website"
        aiSummary={aiSummary}
        expertise="affiliate-marketing"
        trustworthiness="high"
        contentQuality="high"
        contentType="LandingPage"
        lastReviewed="2026-01-29"
      />
      <HreflangLinks pathname={location.pathname} />
      <FAQPageSchema faqs={faqs} pageTitle={seoTitle} />

      <div className="min-h-screen">
        {/* Hero Section - Mobile-first */}
        <section className="relative overflow-hidden bg-gradient-to-br from-red-500 via-orange-500 to-red-600 text-white py-12 md:py-20 px-4">
          <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10" />
          <div className="max-w-5xl mx-auto relative">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-white/20 rounded-full mb-4 md:mb-6">
                <Star className="w-4 h-4 md:w-5 md:h-5" />
                <span className="text-sm md:text-base font-medium">
                  <FormattedMessage id="chatter.landing.badge" defaultMessage="Ambassador Program" />
                </span>
              </div>

              <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold mb-4 md:mb-6 leading-tight">
                <FormattedMessage id="chatter.landing.hero.title" defaultMessage="Become a SOS-Expat Chatter" />
              </h1>

              <p className="text-lg md:text-xl lg:text-2xl text-white/90 max-w-2xl mx-auto mb-6 md:mb-8 px-2">
                <FormattedMessage id="chatter.landing.hero.subtitle" defaultMessage="Earn money by naturally recommending SOS-Expat to people around you" />
              </p>

              {/* Quick Stats - Mobile grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8 max-w-md md:max-w-2xl mx-auto">
                {quickStats.map((stat, idx) => (
                  <div key={idx} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 md:p-4">
                    <div className="text-2xl md:text-3xl font-bold">{stat.value}</div>
                    <div className="text-xs md:text-sm text-white/80">{stat.label}</div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => navigate(registerRoute)}
                className={`${UI.button.primary} px-6 py-3 md:px-8 md:py-4 text-base md:text-lg inline-flex items-center justify-center gap-2 md:gap-3`}
              >
                <FormattedMessage id="chatter.landing.hero.cta" defaultMessage="Become a Chatter" />
                <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
              </button>

              <p className="mt-3 md:mt-4 text-white/70 text-xs md:text-sm">
                <FormattedMessage id="chatter.landing.hero.free" defaultMessage="100% free registration" />
              </p>
            </div>
          </div>
        </section>

        {/* What Chatters Do - Explain the role */}
        <section className="py-12 md:py-16 px-4 bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-black">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 dark:text-white mb-3 md:mb-4">
              <FormattedMessage id="chatter.landing.role.title" defaultMessage="What does a Chatter do?" />
            </h2>
            <p className="text-center text-gray-500 dark:text-gray-400 mb-8 md:mb-12 max-w-2xl mx-auto text-sm md:text-base px-2">
              <FormattedMessage id="chatter.landing.role.subtitle" defaultMessage="No spam, no pressure. Just authentic conversations and natural recommendations." />
            </p>

            <div className="space-y-4 md:grid md:grid-cols-2 md:gap-6 md:space-y-0">
              {chatterRole.map((item, idx) => (
                <div key={idx} className={`${UI.card} p-4 md:p-6 flex items-start gap-3 md:gap-4`}>
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0 text-red-600 dark:text-red-400">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1 text-sm md:text-base">
                      {item.title}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Real Earnings Examples */}
        <section className="py-12 md:py-16 px-4 bg-white dark:bg-gray-900">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 dark:text-white mb-3 md:mb-4">
              <FormattedMessage id="chatter.landing.earnings.title" defaultMessage="Real earnings from real Chatters" />
            </h2>
            <p className="text-center text-gray-500 dark:text-gray-400 mb-8 md:mb-12 max-w-2xl mx-auto text-sm md:text-base px-2">
              <FormattedMessage id="chatter.landing.earnings.subtitle" defaultMessage="These are actual monthly earnings from active Chatters" />
            </p>

            <div className="space-y-4 md:grid md:grid-cols-3 md:gap-6 md:space-y-0">
              {earningsExamples.map((example, idx) => (
                <div key={idx} className={`${UI.card} p-4 md:p-6`}>
                  <div className="flex items-center justify-between mb-3 md:mb-4">
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">{example.name}</div>
                      <div className="text-xs md:text-sm text-gray-500">{example.location}</div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${
                      example.level === 'Diamond' ? 'from-purple-400 to-pink-400' :
                      example.level === 'Platinum' ? 'from-cyan-400 to-cyan-500' :
                      example.level === 'Gold' ? 'from-yellow-400 to-yellow-500' :
                      example.level === 'Silver' ? 'from-gray-400 to-gray-500' :
                      'from-amber-600 to-amber-700'
                    } text-white`}>
                      {example.level}
                    </span>
                  </div>
                  <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent mb-2">
                    {example.monthly}
                    <span className="text-sm md:text-base font-normal text-gray-500 dark:text-gray-400">
                      <FormattedMessage id="chatter.landing.earnings.perMonth" defaultMessage="/month" />
                    </span>
                  </div>
                  <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">{example.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Commission Details */}
        <section className="py-12 md:py-16 px-4 bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-black">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 dark:text-white mb-8 md:mb-12">
              <FormattedMessage id="chatter.landing.commissions.title" defaultMessage="Your commissions" />
            </h2>

            <div className="space-y-4 md:grid md:grid-cols-2 md:gap-6 md:space-y-0">
              {/* Client Commission */}
              <div className={`${UI.card} p-4 md:p-6`}>
                <div className="flex items-center gap-3 mb-3 md:mb-4">
                  <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <Gift className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">
                    <FormattedMessage id="chatter.landing.commissions.client.title" defaultMessage="Client Commission" />
                  </h3>
                </div>
                <p className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent mb-2">
                  $10
                </p>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                  <FormattedMessage id="chatter.landing.commissions.client.desc" defaultMessage="Per paid call from a referred client" />
                </p>
              </div>

              {/* Recruitment Commission */}
              <div className={`${UI.card} p-4 md:p-6`}>
                <div className="flex items-center gap-3 mb-3 md:mb-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">
                    <FormattedMessage id="chatter.landing.commissions.recruitment.title" defaultMessage="Recruitment Commission" />
                  </h3>
                </div>
                <p className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent mb-2">
                  $5
                </p>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                  <FormattedMessage id="chatter.landing.commissions.recruitment.desc" defaultMessage="Per call received by a recruited provider (6 months)" />
                </p>
              </div>
            </div>

            {/* Top 3 Bonus */}
            <div className={`${UI.card} p-4 md:p-6 mt-4 md:mt-6`}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">
                      <FormattedMessage id="chatter.landing.commissions.top3.title" defaultMessage="Monthly Top 3 Bonus" />
                    </h3>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                      <FormattedMessage id="chatter.landing.commissions.top3.desc" defaultMessage="Best performers get extra rewards" />
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 md:gap-4">
                  <div className="text-center px-3 md:px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
                    <div className="text-lg md:text-xl font-bold text-yellow-600">🥇 +100%</div>
                  </div>
                  <div className="text-center px-3 md:px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl">
                    <div className="text-lg md:text-xl font-bold text-gray-600 dark:text-gray-300">🥈 +50%</div>
                  </div>
                  <div className="text-center px-3 md:px-4 py-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                    <div className="text-lg md:text-xl font-bold text-amber-700">🥉 +25%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Level System */}
        <section className="py-12 md:py-16 px-4 bg-white dark:bg-gray-900">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 dark:text-white mb-3 md:mb-4">
              <FormattedMessage id="chatter.landing.levels.title" defaultMessage="Level up and earn more" />
            </h2>
            <p className="text-center text-gray-500 dark:text-gray-400 mb-8 md:mb-12 max-w-2xl mx-auto text-sm md:text-base px-2">
              <FormattedMessage id="chatter.landing.levels.subtitle" defaultMessage="The more clients you refer, the higher your bonus" />
            </p>

            <div className="space-y-3 md:flex md:gap-4 md:space-y-0 overflow-x-auto pb-4">
              {levels.map((level, idx) => (
                <div key={idx} className={`${UI.card} p-4 md:p-5 flex-1 min-w-[140px]`}>
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-r ${level.color} flex items-center justify-center mb-3`}>
                    <Award className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base mb-1">{level.name}</h3>
                  <p className="text-xl md:text-2xl font-bold text-green-600 mb-1">{level.bonus}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {level.requirement} <FormattedMessage id="chatter.landing.levels.conversions" defaultMessage="conversions" />
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How to Get Paid */}
        <section className="py-12 md:py-16 px-4 bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-black">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 dark:text-white mb-3 md:mb-4">
              <FormattedMessage id="chatter.landing.payment.title" defaultMessage="How to get paid" />
            </h2>
            <p className="text-center text-gray-500 dark:text-gray-400 mb-8 md:mb-12 max-w-2xl mx-auto text-sm md:text-base px-2">
              <FormattedMessage id="chatter.landing.payment.subtitle" defaultMessage="Multiple withdrawal options available worldwide" />
            </p>

            <div className={`${UI.card} p-4 md:p-6`}>
              <div className="flex items-center gap-3 mb-4 md:mb-6">
                <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">
                    <FormattedMessage id="chatter.landing.payment.minimum" defaultMessage="Minimum withdrawal: $25" />
                  </h3>
                  <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                    <FormattedMessage id="chatter.landing.payment.processing" defaultMessage="Processed within 48 hours" />
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {paymentMethods.map((method, idx) => (
                  <div key={idx} className="flex flex-col items-center p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                    <span className="text-2xl mb-1">{method.icon}</span>
                    <span className="text-xs md:text-sm text-gray-700 dark:text-gray-300 text-center">{method.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Mid-page CTA */}
        <section className="py-10 md:py-12 px-4 bg-gradient-to-r from-red-500 via-orange-500 to-red-600 text-white">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-xl md:text-2xl font-bold mb-4">
              <FormattedMessage id="chatter.landing.midCta.title" defaultMessage="Ready to start earning?" />
            </h2>
            <button
              onClick={() => navigate(registerRoute)}
              className="w-full md:w-auto bg-white text-red-600 font-bold px-6 py-3 md:px-8 md:py-4 rounded-xl text-base md:text-lg inline-flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
            >
              <FormattedMessage id="chatter.landing.midCta.button" defaultMessage="Join now - It's free" />
              <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </section>

        {/* How it Works - Steps */}
        <section className="py-12 md:py-16 px-4 bg-white dark:bg-gray-900">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 dark:text-white mb-3 md:mb-4">
              <FormattedMessage id="chatter.landing.howItWorks.title" defaultMessage="How to get started" />
            </h2>
            <p className="text-center text-gray-500 dark:text-gray-400 mb-8 md:mb-12 max-w-2xl mx-auto text-sm md:text-base px-2">
              <FormattedMessage id="chatter.landing.howItWorks.subtitle" defaultMessage="4 simple steps to start earning" />
            </p>

            <div className="space-y-4 md:grid md:grid-cols-4 md:gap-6 md:space-y-0">
              {steps.map((step, idx) => (
                <div key={idx} className="text-center">
                  <div className="w-12 h-12 md:w-14 md:h-14 mx-auto mb-3 md:mb-4 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center text-white text-lg md:text-xl font-bold">
                    {step.num}
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1 md:mb-2 text-sm md:text-base">
                    {step.title}
                  </h3>
                  <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section - SEO Position 0 */}
        <section className="py-12 md:py-16 px-4 bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-black" itemScope itemType="https://schema.org/FAQPage">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-2 md:gap-3 mb-3 md:mb-4">
              <HelpCircle className="w-6 h-6 md:w-8 md:h-8 text-red-500" aria-hidden="true" />
              <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 dark:text-white">
                <FormattedMessage id="chatter.landing.faq.title" defaultMessage="Frequently asked questions" />
              </h2>
            </div>
            <p className="text-center text-gray-500 dark:text-gray-400 mb-8 md:mb-12 max-w-2xl mx-auto text-sm md:text-base px-2">
              <FormattedMessage id="chatter.landing.faq.subtitle" defaultMessage="Everything you need to know about the Chatter program" />
            </p>

            <div className="space-y-3 md:space-y-4">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className={`${UI.card} overflow-hidden`}
                  itemScope
                  itemProp="mainEntity"
                  itemType="https://schema.org/Question"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full flex items-center justify-between p-4 md:p-5 text-left"
                  >
                    <h3 className="font-semibold text-gray-900 dark:text-white pr-4 text-sm md:text-base" itemProp="name">
                      {faq.question}
                    </h3>
                    <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform flex-shrink-0 ${openFaq === idx ? 'rotate-180' : ''}`} aria-hidden="true" />
                  </button>
                  {openFaq === idx && (
                    <div
                      className="px-4 md:px-5 pb-4 md:pb-5 text-gray-600 dark:text-gray-300 text-sm md:text-base"
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

        {/* Final CTA Section */}
        <section className="py-12 md:py-20 px-4 bg-gradient-to-r from-red-500 via-orange-500 to-red-600 text-white">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 md:mb-6">
              <FormattedMessage id="chatter.landing.cta.title" defaultMessage="Ready to become a Chatter?" />
            </h2>
            <p className="text-base md:text-xl text-white/90 mb-6 md:mb-8 px-2">
              <FormattedMessage id="chatter.landing.cta.subtitle" defaultMessage="Join hundreds of Chatters already earning" />
            </p>
            <button
              onClick={() => navigate(registerRoute)}
              className="w-full md:w-auto bg-white text-red-600 font-bold px-6 py-3 md:px-8 md:py-4 rounded-xl text-base md:text-lg inline-flex items-center justify-center gap-2 md:gap-3 hover:bg-gray-50 transition-colors"
            >
              <FormattedMessage id="chatter.landing.cta.button" defaultMessage="Sign up now" />
              <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <p className="mt-3 md:mt-4 text-white/70 text-xs md:text-sm">
              <FormattedMessage id="chatter.landing.cta.note" defaultMessage="Free registration • No hidden fees • Start earning today" />
            </p>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default ChatterLanding;
