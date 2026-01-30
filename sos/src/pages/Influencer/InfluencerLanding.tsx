/**
 * InfluencerLanding - Elite Mobile-First Landing Page 2026
 *
 * OBJECTIFS:
 * - Comprendre en 3 secondes ce qu'on doit faire
 * - Savoir qu'on peut gagner de l'argent rapidement
 * - Voir que c'est SIMPLE : promouvoir SOS-Expat sur YouTube, Instagram, TikTok
 * - Avocat OU Expatrié Aidant (pas juste avocat)
 * - Mobile-first d'exception
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
} from 'lucide-react';

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
      answer: intl.formatMessage({ id: 'influencer.faq.a5', defaultMessage: "Withdraw anytime once you reach $50. We support Wise, PayPal, and bank transfers. Payments processed within 48 hours." }),
    },
    {
      question: intl.formatMessage({ id: 'influencer.faq.q6', defaultMessage: "What discount do my followers get?" }),
      answer: intl.formatMessage({ id: 'influencer.faq.a6', defaultMessage: "Your followers automatically get 5% off their first call when they use your link. It's an exclusive benefit for your community!" }),
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
    { name: intl.formatMessage({ id: 'influencer.tools.widgets', defaultMessage: 'Widgets' }), icon: '🔧' },
    { name: intl.formatMessage({ id: 'influencer.tools.qrcodes', defaultMessage: 'QR Codes' }), icon: '📱' },
    { name: intl.formatMessage({ id: 'influencer.tools.texts', defaultMessage: 'Promo Texts' }), icon: '📝' },
    { name: intl.formatMessage({ id: 'influencer.tools.logos', defaultMessage: 'HD Logos' }), icon: '✨' },
  ];

  // Payment methods
  const paymentMethods = [
    { name: 'Wise', icon: '🌐' },
    { name: 'PayPal', icon: '💳' },
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

      {/* Custom styles */}
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.4); }
          50% { box-shadow: 0 0 40px rgba(239, 68, 68, 0.6); }
        }
        .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .animate-float { animation: float 3s ease-in-out infinite; }
      `}</style>

      <div className="min-h-screen bg-white dark:bg-gray-950">

        {/* ============================================================== */}
        {/* HERO - Comprendre en 3 secondes */}
        {/* ============================================================== */}
        <section className="relative min-h-[85vh] flex items-center bg-gradient-to-br from-red-600 via-red-500 to-orange-500 overflow-hidden">
          {/* Background decorations */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-10 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-yellow-400/20 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 max-w-5xl mx-auto px-4 py-12 text-center text-white">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full mb-6">
              <Star className="w-5 h-5 text-yellow-300" />
              <span className="font-semibold text-sm">
                <FormattedMessage id="influencer.hero.badge" defaultMessage="Influencer Program • Promo Tools Included" />
              </span>
            </div>

            {/* Main headline - LE BÉNÉFICE */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight">
              <FormattedMessage
                id="influencer.hero.title"
                defaultMessage="Earn $10 Per Client + Promo Tools"
              />
            </h1>

            {/* Subtitle - CE QUE TU FAIS */}
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto mb-4 font-medium">
              <FormattedMessage
                id="influencer.hero.subtitle"
                defaultMessage="Promote SOS-Expat to your audience on YouTube, Instagram, or TikTok. Get banners, widgets, QR codes. Your followers get 5% off!"
              />
            </p>

            {/* Ultra simple explanation */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 md:p-6 max-w-2xl mx-auto mb-8 border border-white/20">
              <p className="text-lg md:text-xl font-semibold">
                <FormattedMessage
                  id="influencer.hero.simple"
                  defaultMessage="Your job: Create content → Share your link → Followers call → You earn $10"
                />
              </p>
            </div>

            {/* CTA */}
            <button
              onClick={() => navigate(registerRoute)}
              className="group bg-white text-red-600 font-bold px-8 py-5 rounded-2xl text-xl inline-flex items-center gap-3 hover:bg-gray-100 transition-all shadow-2xl animate-pulse-glow"
            >
              <Rocket className="w-7 h-7" />
              <FormattedMessage id="influencer.hero.cta" defaultMessage="Become an Influencer - It's Free" />
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Quick trust */}
            <div className="flex flex-wrap justify-center gap-4 mt-8 text-sm">
              <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
                <Zap className="w-4 h-4" />
                <FormattedMessage id="influencer.hero.trust.1" defaultMessage="Instant Activation" />
              </div>
              <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
                <Percent className="w-4 h-4" />
                <FormattedMessage id="influencer.hero.trust.2" defaultMessage="5% Off for Followers" />
              </div>
              <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
                <Image className="w-4 h-4" />
                <FormattedMessage id="influencer.hero.trust.3" defaultMessage="Promo Tools Included" />
              </div>
            </div>

            {/* Scroll indicator */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce">
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
                    <FormattedMessage id="influencer.step1.desc" defaultMessage="Make videos about expat life, travel tips, visa advice, living abroad. Use our banners and promo texts to promote SOS-Expat." />
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
                    <FormattedMessage id="influencer.step2.desc" defaultMessage="Add your unique affiliate link in video descriptions, bio, stories. Your followers get 5% off their first call!" />
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
                    <FormattedMessage id="influencer.step3.desc" defaultMessage="When followers make a call through your link, you earn $10. Withdraw anytime via Wise, PayPal, or bank transfer." />
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
                    <FormattedMessage id="influencer.tools.box.desc" defaultMessage="No need to create your own graphics. We provide everything." />
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {promoTools.map((tool, idx) => (
                  <div key={idx} className="bg-white/10 rounded-xl px-3 py-2 text-center text-sm">
                    <div className="text-2xl mb-1">{tool.icon}</div>
                    <div>{tool.name}</div>
                  </div>
                ))}
              </div>
            </div>

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

            {/* Example content ideas */}
            <div className="mt-10 grid md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-2xl p-5 border border-red-200 dark:border-red-700">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">🎬</div>
                  <div>
                    <p className="font-medium text-red-700 dark:text-red-300 mb-1">
                      <FormattedMessage id="influencer.example1.title" defaultMessage="YouTube Video Idea:" />
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                      "<FormattedMessage id="influencer.example1.text" defaultMessage="5 Things I Wish I Knew Before Moving Abroad - Legal Tips" />"
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400 mt-2 font-bold">
                      → <FormattedMessage id="influencer.example1.action" defaultMessage="Link SOS-Expat in description = $10 per call" />
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">📸</div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white mb-1">
                      <FormattedMessage id="influencer.example2.title" defaultMessage="Instagram Story:" />
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                      "<FormattedMessage id="influencer.example2.text" defaultMessage="Need legal help abroad? I use this service → Swipe up for 5% off!" />"
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400 mt-2 font-medium">
                      → <FormattedMessage id="influencer.example2.action" defaultMessage="Follower books a call = $10 for you" />
                    </p>
                  </div>
                </div>
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
            <div className="grid md:grid-cols-2 gap-6">
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
                  <FormattedMessage id="influencer.earnings.partner.desc" defaultMessage="Find a lawyer or expat helper to join SOS-Expat. Every time they receive a call, you earn $5 passively!" />
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
                  <FormattedMessage id="influencer.earnings.discount.desc" defaultMessage="Your followers automatically get 5% off their first call. It's an exclusive benefit that makes your link more valuable!" />
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* FIND LAWYER/HELPER PARTNERS - Passive income */}
        {/* ============================================================== */}
        <section className="py-16 md:py-24 px-4 bg-gradient-to-br from-purple-500 via-purple-600 to-pink-500 text-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold mb-4">
                <Network className="w-4 h-4" />
                <FormattedMessage id="influencer.passive.badge" defaultMessage="Passive Income" />
              </div>
              <h2 className="text-3xl md:text-5xl font-black mb-4">
                <FormattedMessage id="influencer.passive.title" defaultMessage="Find Lawyer & Helper Partners" />
              </h2>
              <p className="text-xl text-white/90 max-w-2xl mx-auto">
                <FormattedMessage id="influencer.passive.subtitle" defaultMessage="Know a lawyer or experienced expat? Help them join SOS-Expat and earn $5 every time they receive a call!" />
              </p>
            </div>

            {/* Visual representation */}
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 md:p-10 border border-white/20 max-w-3xl mx-auto">
              <div className="flex flex-col items-center">
                {/* You */}
                <div className="flex flex-col items-center mb-6">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl">
                    <Crown className="w-10 h-10 text-purple-500" />
                  </div>
                  <span className="mt-2 font-bold text-lg">
                    <FormattedMessage id="influencer.passive.you" defaultMessage="YOU" />
                  </span>
                  <span className="text-white/80 text-sm">
                    <FormattedMessage id="influencer.passive.you.earn" defaultMessage="$10/client + $5/call from partners" />
                  </span>
                </div>

                {/* Arrow */}
                <div className="text-3xl mb-4">↓</div>

                {/* Partner providers */}
                <div className="flex justify-center gap-4 md:gap-8 mb-6">
                  {[
                    { emoji: '⚖️', label: intl.formatMessage({ id: 'influencer.passive.lawyer', defaultMessage: 'Lawyer' }) },
                    { emoji: '🌍', label: intl.formatMessage({ id: 'influencer.passive.helper', defaultMessage: 'Helper' }) },
                    { emoji: '⚖️', label: intl.formatMessage({ id: 'influencer.passive.lawyer', defaultMessage: 'Lawyer' }) },
                  ].map((item, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-2xl">
                        {item.emoji}
                      </div>
                      <span className="mt-1 text-sm font-medium">{item.label}</span>
                      <span className="text-xs text-green-300">+$5/call</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Example calculation */}
              <div className="mt-8 bg-white/10 rounded-2xl p-4 text-center">
                <p className="font-semibold mb-2">
                  <FormattedMessage id="influencer.passive.example" defaultMessage="Example: 3 lawyer partners, 20 calls/month each" />
                </p>
                <p className="text-2xl font-black text-green-300">
                  = $300/month <FormattedMessage id="influencer.passive.passive" defaultMessage="passive income!" />
                </p>
              </div>
            </div>

            {/* CTA */}
            <div className="text-center mt-10">
              <button
                onClick={() => navigate(registerRoute)}
                className="group bg-white text-purple-600 font-bold px-8 py-4 rounded-2xl text-lg inline-flex items-center gap-3 hover:bg-gray-100 transition-all shadow-xl"
              >
                <Rocket className="w-6 h-6" />
                <FormattedMessage id="influencer.passive.cta" defaultMessage="Find Partners Today" />
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* PAYMENT METHODS */}
        {/* ============================================================== */}
        <section className="py-12 md:py-16 px-4 bg-white dark:bg-gray-950">
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
              <FormattedMessage id="influencer.payment.note" defaultMessage="Minimum $50 • Processed in 48h" />
            </p>
          </div>
        </section>

        {/* ============================================================== */}
        {/* FAQ */}
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
        {/* FINAL CTA */}
        {/* ============================================================== */}
        <section className="py-16 md:py-24 px-4 bg-gradient-to-br from-red-600 via-red-500 to-orange-500 text-white">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-black mb-6">
              <FormattedMessage id="influencer.final.title" defaultMessage="Ready to Become an Influencer?" />
            </h2>
            <p className="text-xl text-white/90 mb-8">
              <FormattedMessage id="influencer.final.subtitle" defaultMessage="It's free, instant activation, promo tools included." />
            </p>

            <button
              onClick={() => navigate(registerRoute)}
              className="group bg-white text-red-600 font-bold px-10 py-6 rounded-2xl text-xl inline-flex items-center gap-3 hover:bg-gray-100 transition-all shadow-2xl animate-pulse-glow"
            >
              <Rocket className="w-8 h-8" />
              <FormattedMessage id="influencer.final.cta" defaultMessage="Become an Influencer Now" />
              <ArrowRight className="w-7 h-7 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="flex flex-wrap justify-center gap-4 mt-8 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-300" />
                <FormattedMessage id="influencer.final.trust.1" defaultMessage="100% Free" />
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-300" />
                <FormattedMessage id="influencer.final.trust.2" defaultMessage="Instant Activation" />
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-300" />
                <FormattedMessage id="influencer.final.trust.3" defaultMessage="Promo Tools Included" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default InfluencerLanding;
