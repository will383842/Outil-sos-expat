/**
 * BloggerLanding - Elite Mobile-First Landing Page 2026
 *
 * OBJECTIFS:
 * - Comprendre en 3 secondes ce qu'on doit faire
 * - Savoir qu'on peut gagner de l'argent rapidement
 * - Voir que c'est SIMPLE : écrire des articles et intégrer des liens
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
  CheckCircle,
  ArrowRight,
  ChevronDown,
  DollarSign,
  Target,
  UserPlus,
  Rocket,
  ArrowDown,
  Phone,
  Network,
  MessageSquare,
  PenTool,
  FileText,
  Crown,
  Link,
  Search,
  Image,
  Copy,
  Code,
  Calculator,
  Clock,
  Zap,
} from 'lucide-react';

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const BloggerLanding: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const location = useLocation();
  const { language } = useApp();
  const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Calculator state for existing blog section
  const [calcArticles, setCalcArticles] = useState(20);
  const [calcVisitsPerArticle, setCalcVisitsPerArticle] = useState(5);
  const [calcConversionRate, setCalcConversionRate] = useState(1);

  // Realistic calculation (conservative estimates)
  const monthlyVisits = calcArticles * calcVisitsPerArticle * 30;
  const monthlyClients = Math.floor((monthlyVisits * calcConversionRate) / 100);
  const monthlyEarnings = monthlyClients * 10;

  const registerRoute = `/${getTranslatedRouteSlug('blogger-register' as RouteKey, langCode)}`;

  // SEO
  const seoTitle = intl.formatMessage({
    id: 'blogger.landing.seo.title',
    defaultMessage: 'Become a SOS-Expat Blogger Partner | Earn $10/client with your blog'
  });
  const seoDescription = intl.formatMessage({
    id: 'blogger.landing.seo.description',
    defaultMessage: 'Write articles about expat life. Earn $10 per client, $5 per lawyer/helper partner. Templates, logos, and resources included. Withdraw via Wise or PayPal.'
  });

  // FAQ
  const faqs = [
    {
      question: intl.formatMessage({ id: 'blogger.faq.q1', defaultMessage: "What exactly do I have to do as a Blogger Partner?" }),
      answer: intl.formatMessage({ id: 'blogger.faq.a1', defaultMessage: "Write blog articles about expat life, travel, immigration, visas, or living abroad. Include your unique affiliate link in articles. When readers call a lawyer or expat helper, you earn $10. That's it!" }),
    },
    {
      question: intl.formatMessage({ id: 'blogger.faq.q2', defaultMessage: "How much can I realistically earn?" }),
      answer: intl.formatMessage({ id: 'blogger.faq.a2', defaultMessage: "It depends on your blog traffic. 10 clients = $100. 50 clients = $500. Some bloggers earn $1000-3000/month by writing SEO-optimized articles that rank well on Google." }),
    },
    {
      question: intl.formatMessage({ id: 'blogger.faq.q3', defaultMessage: "What is an 'expat helper'?" }),
      answer: intl.formatMessage({ id: 'blogger.faq.a3', defaultMessage: "Expat helpers are experienced expats who provide practical advice and guidance. They're not lawyers, but they know the local system well and can help with everyday questions about visas, administration, housing, etc." }),
    },
    {
      question: intl.formatMessage({ id: 'blogger.faq.q4', defaultMessage: "What resources do I get?" }),
      answer: intl.formatMessage({ id: 'blogger.faq.a4', defaultMessage: "You get article templates, ready-to-copy texts in 9 languages, HD logos, banners, and a complete integration guide with SEO best practices." }),
    },
    {
      question: intl.formatMessage({ id: 'blogger.faq.q5', defaultMessage: "How and when do I get paid?" }),
      answer: intl.formatMessage({ id: 'blogger.faq.a5', defaultMessage: "Withdraw anytime once you reach $50. We support Wise, PayPal, Mobile Money, and bank transfers. Payments processed within 48 hours." }),
    },
    {
      question: intl.formatMessage({ id: 'blogger.faq.q6', defaultMessage: "Do I need a specific blog topic?" }),
      answer: intl.formatMessage({ id: 'blogger.faq.a6', defaultMessage: "Your blog should relate to expat life, travel, immigration, or similar topics. We provide article templates if you need inspiration!" }),
    },
  ];

  // Article topics bloggers can write about - EXPANDED for travel, photographers, influencers, etc.
  const articleTopics: { name: string; icon: string; desc: string; highlight?: boolean }[] = [
    { name: intl.formatMessage({ id: 'blogger.topic.visa', defaultMessage: 'Visa Guides' }), icon: '📋', desc: intl.formatMessage({ id: 'blogger.topic.visa.desc', defaultMessage: 'Country-specific visa info' }), highlight: true },
    { name: intl.formatMessage({ id: 'blogger.topic.travel', defaultMessage: 'Travel Stories' }), icon: '✈️', desc: intl.formatMessage({ id: 'blogger.topic.travel.desc', defaultMessage: 'Destinations & tips' }), highlight: true },
    { name: intl.formatMessage({ id: 'blogger.topic.photo', defaultMessage: 'Travel Photos' }), icon: '📸', desc: intl.formatMessage({ id: 'blogger.topic.photo.desc', defaultMessage: 'Photo journals' }) },
    { name: intl.formatMessage({ id: 'blogger.topic.nomad', defaultMessage: 'Digital Nomad' }), icon: '💻', desc: intl.formatMessage({ id: 'blogger.topic.nomad.desc', defaultMessage: 'Work remotely' }) },
    { name: intl.formatMessage({ id: 'blogger.topic.vacation', defaultMessage: 'Vacation Tips' }), icon: '🏖️', desc: intl.formatMessage({ id: 'blogger.topic.vacation.desc', defaultMessage: 'Vacation planning' }) },
    { name: intl.formatMessage({ id: 'blogger.topic.moving', defaultMessage: 'Moving Abroad' }), icon: '🚚', desc: intl.formatMessage({ id: 'blogger.topic.moving.desc', defaultMessage: 'Relocation tips' }) },
    { name: intl.formatMessage({ id: 'blogger.topic.legal', defaultMessage: 'Legal Tips' }), icon: '⚖️', desc: intl.formatMessage({ id: 'blogger.topic.legal.desc', defaultMessage: 'Expat legal issues' }) },
    { name: intl.formatMessage({ id: 'blogger.topic.cost', defaultMessage: 'Cost of Living' }), icon: '💰', desc: intl.formatMessage({ id: 'blogger.topic.cost.desc', defaultMessage: 'City comparisons' }) },
    { name: intl.formatMessage({ id: 'blogger.topic.housing', defaultMessage: 'Housing' }), icon: '🏠', desc: intl.formatMessage({ id: 'blogger.topic.housing.desc', defaultMessage: 'Finding a home abroad' }) },
    { name: intl.formatMessage({ id: 'blogger.topic.life', defaultMessage: 'Expat Life' }), icon: '🌍', desc: intl.formatMessage({ id: 'blogger.topic.life.desc', defaultMessage: 'Daily life stories' }) },
    { name: intl.formatMessage({ id: 'blogger.topic.food', defaultMessage: 'Food & Culture' }), icon: '🍜', desc: intl.formatMessage({ id: 'blogger.topic.food.desc', defaultMessage: 'Local cuisine' }) },
    { name: intl.formatMessage({ id: 'blogger.topic.adventure', defaultMessage: 'Adventure' }), icon: '🏔️', desc: intl.formatMessage({ id: 'blogger.topic.adventure.desc', defaultMessage: 'Hiking, diving...' }) },
  ];

  // Resources provided
  const resources = [
    { name: intl.formatMessage({ id: 'blogger.resource.templates', defaultMessage: 'Article Templates' }), icon: '📝' },
    { name: intl.formatMessage({ id: 'blogger.resource.texts', defaultMessage: 'Ready Texts' }), icon: '📋' },
    { name: intl.formatMessage({ id: 'blogger.resource.widgets', defaultMessage: 'Smart Widgets' }), icon: '🧩', highlight: true },
    { name: intl.formatMessage({ id: 'blogger.resource.logos', defaultMessage: 'HD Logos' }), icon: '✨' },
    { name: intl.formatMessage({ id: 'blogger.resource.banners', defaultMessage: 'Banners' }), icon: '🖼️' },
    { name: intl.formatMessage({ id: 'blogger.resource.seo', defaultMessage: 'SEO Guide' }), icon: '🔍' },
  ];

  // Payment methods
  const paymentMethods = [
    { name: 'Wise', icon: '🌐' },
    { name: 'PayPal', icon: '💳' },
    { name: 'Mobile Money', icon: '📱' },
    { name: 'Bank', icon: '🏦' },
  ];

  return (
    <Layout>
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        ogImage="/og-blogger-2026.jpg"
        ogType="website"
        contentType="LandingPage"
      />
      <HreflangLinks pathname={location.pathname} />
      <FAQPageSchema faqs={faqs} pageTitle={seoTitle} />

      {/* Custom styles */}
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(147, 51, 234, 0.4); }
          50% { box-shadow: 0 0 40px rgba(147, 51, 234, 0.6); }
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
        <section className="relative min-h-[85vh] flex items-center bg-gradient-to-br from-purple-600 via-purple-500 to-indigo-500 overflow-hidden">
          {/* Background decorations */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-10 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-pink-400/20 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 max-w-5xl mx-auto px-4 py-12 text-center text-white">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full mb-6">
              <PenTool className="w-5 h-5 text-yellow-300" />
              <span className="font-semibold text-sm">
                <FormattedMessage id="blogger.hero.badge" defaultMessage="Blogger Partner Program • Resources Included" />
              </span>
            </div>

            {/* Main headline - LE BÉNÉFICE */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight">
              <FormattedMessage
                id="blogger.hero.title"
                defaultMessage="Monetize Your Blog: $10 Per Client"
              />
            </h1>

            {/* Subtitle - CE QUE TU FAIS */}
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto mb-4 font-medium">
              <FormattedMessage
                id="blogger.hero.subtitle"
                defaultMessage="Write articles about expat life. Include your link. Readers call a lawyer or expat helper. You earn $10."
              />
            </p>

            {/* Ultra simple explanation */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 md:p-6 max-w-2xl mx-auto mb-8 border border-white/20">
              <p className="text-lg md:text-xl font-semibold">
                <FormattedMessage
                  id="blogger.hero.simple"
                  defaultMessage="Your job: Write articles → Add your link → Readers call → You earn $10"
                />
              </p>
            </div>

            {/* CTA */}
            <button
              onClick={() => navigate(registerRoute)}
              className="group bg-white text-purple-600 font-bold px-8 py-5 rounded-2xl text-xl inline-flex items-center gap-3 hover:bg-gray-100 transition-all shadow-2xl animate-pulse-glow"
            >
              <Rocket className="w-7 h-7" />
              <FormattedMessage id="blogger.hero.cta" defaultMessage="Become a Blogger Partner - It's Free" />
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Quick trust */}
            <div className="flex flex-wrap justify-center gap-4 mt-8 text-sm">
              <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
                <FileText className="w-4 h-4" />
                <FormattedMessage id="blogger.hero.trust.1" defaultMessage="Article Templates" />
              </div>
              <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
                <Search className="w-4 h-4" />
                <FormattedMessage id="blogger.hero.trust.2" defaultMessage="SEO Guide" />
              </div>
              <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
                <Image className="w-4 h-4" />
                <FormattedMessage id="blogger.hero.trust.3" defaultMessage="HD Logos & Banners" />
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
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-sm font-semibold mb-4">
                <Target className="w-4 h-4" />
                <FormattedMessage id="blogger.role.badge" defaultMessage="Your Mission" />
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white mb-4">
                <FormattedMessage id="blogger.role.title" defaultMessage="It's Super Simple" />
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                <FormattedMessage id="blogger.role.subtitle" defaultMessage="Use your existing blog. We give you all the resources." />
              </p>
            </div>

            {/* 3 Steps - MOBILE FIRST */}
            <div className="space-y-6 md:space-y-0 md:grid md:grid-cols-3 md:gap-8">
              {/* Step 1 */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-3xl p-6 md:p-8 border border-purple-100 dark:border-purple-800 relative">
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg">
                  1
                </div>
                <div className="pt-4">
                  <div className="w-16 h-16 bg-purple-100 dark:bg-purple-800 rounded-2xl flex items-center justify-center mb-4">
                    <PenTool className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    <FormattedMessage id="blogger.step1.title" defaultMessage="Write Articles" />
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    <FormattedMessage id="blogger.step1.desc" defaultMessage="Write about expat life, visas, moving abroad, legal tips. Use our templates if you need inspiration. Focus on SEO for long-term traffic." />
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-full text-xs font-bold">
                      <FormattedMessage id="blogger.step1.tag.visa" defaultMessage="Visa Guides" />
                    </span>
                    <span className="px-3 py-1 bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium">
                      <FormattedMessage id="blogger.step1.tag.tips" defaultMessage="Living Abroad" />
                    </span>
                    <span className="px-3 py-1 bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium">
                      <FormattedMessage id="blogger.step1.tag.legal" defaultMessage="Legal Tips" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-3xl p-6 md:p-8 border border-blue-100 dark:border-blue-800 relative">
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg">
                  2
                </div>
                <div className="pt-4">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-800 rounded-2xl flex items-center justify-center mb-4">
                    <Link className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    <FormattedMessage id="blogger.step2.title" defaultMessage="Add Your Link" />
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    <FormattedMessage id="blogger.step2.desc" defaultMessage="Include your unique affiliate link in articles. Use our banners, widgets, or simple text links. We track everything automatically." />
                  </p>
                  {/* Widget highlight */}
                  <div className="bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-xl p-3 border border-purple-200 dark:border-purple-700 mb-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-purple-700 dark:text-purple-400">
                      <Code className="w-4 h-4" />
                      <FormattedMessage id="blogger.step2.widgets" defaultMessage="Ready-to-use widgets with your link already embedded!" />
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-blue-200 dark:border-blue-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                      "<FormattedMessage id="blogger.step2.example" defaultMessage="Need help with your visa? Talk to a lawyer or expat helper in minutes →" />"
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
                    <FormattedMessage id="blogger.step3.title" defaultMessage="Get Paid $10" />
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    <FormattedMessage id="blogger.step3.desc" defaultMessage="When readers make a call through your link, you earn $10. Withdraw anytime via Wise, PayPal, or Mobile Money." />
                  </p>
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-bold text-lg">
                    <CheckCircle className="w-5 h-5" />
                    <FormattedMessage id="blogger.step3.note" defaultMessage="No limit on earnings!" />
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
                    <FormattedMessage id="blogger.note.title" defaultMessage="Lawyers AND Expat Helpers" />
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    <FormattedMessage id="blogger.note.desc" defaultMessage="SOS-Expat connects people with professional lawyers AND experienced expat helpers. Lawyers for legal matters, expat helpers for practical advice. Both available instantly by phone, worldwide." />
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* WHO CAN BECOME A BLOGGER PARTNER? - Target profiles */}
        {/* ============================================================== */}
        <section className="py-16 md:py-24 px-4 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full text-sm font-semibold mb-4">
                <Network className="w-4 h-4" />
                <FormattedMessage id="blogger.profiles.badge" defaultMessage="For Content Creators" />
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white mb-4">
                <FormattedMessage id="blogger.profiles.title" defaultMessage="Who Can Join?" />
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                <FormattedMessage id="blogger.profiles.subtitle" defaultMessage="Bloggers, photographers, influencers... If your audience travels or lives abroad, SOS-Expat is perfect for you!" />
              </p>
            </div>

            {/* Profile cards grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {/* Travel Blogger */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center text-white mb-4 text-2xl">
                  ✈️
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                  <FormattedMessage id="blogger.profiles.travel.title" defaultMessage="Travel Bloggers" />
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <FormattedMessage id="blogger.profiles.travel.desc" defaultMessage="Your readers plan trips. They need visa info, legal help abroad. $10 per referral!" />
                </p>
              </div>

              {/* Vacation / Holiday Blogger */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-yellow-400 rounded-xl flex items-center justify-center text-white mb-4 text-2xl">
                  🏖️
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                  <FormattedMessage id="blogger.profiles.vacation.title" defaultMessage="Vacation Bloggers" />
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <FormattedMessage id="blogger.profiles.vacation.desc" defaultMessage="Beach lovers, resort experts. Tourists abroad sometimes need urgent legal help." />
                </p>
              </div>

              {/* Travel Photographer */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-400 rounded-xl flex items-center justify-center text-white mb-4 text-2xl">
                  📸
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                  <FormattedMessage id="blogger.profiles.photo.title" defaultMessage="Travel Photographers" />
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <FormattedMessage id="blogger.profiles.photo.desc" defaultMessage="Photo essays, destination guides. Your visual content + our link = passive income." />
                </p>
              </div>

              {/* Digital Nomad */}
              <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all ring-2 ring-purple-400/50">
                <div className="absolute -top-2 -right-2 px-2 py-1 bg-purple-500 text-white rounded-full text-xs font-bold">
                  TOP
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-400 rounded-xl flex items-center justify-center text-white mb-4 text-2xl">
                  💻
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                  <FormattedMessage id="blogger.profiles.nomad.title" defaultMessage="Digital Nomads" />
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <FormattedMessage id="blogger.profiles.nomad.desc" defaultMessage="Your audience NEEDS visa info! Digital nomad visa guides = high conversion." />
                </p>
              </div>

              {/* Travel Influencer */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all">
                <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-rose-400 rounded-xl flex items-center justify-center text-white mb-4 text-2xl">
                  🎬
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                  <FormattedMessage id="blogger.profiles.influencer.title" defaultMessage="Travel Influencers" />
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <FormattedMessage id="blogger.profiles.influencer.desc" defaultMessage="YouTube, Instagram, TikTok. Link in bio + affiliate links in descriptions." />
                </p>
              </div>

              {/* Expat Blogger */}
              <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all ring-2 ring-green-400/50">
                <div className="absolute -top-2 -right-2 px-2 py-1 bg-green-500 text-white rounded-full text-xs font-bold">
                  BEST
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-400 rounded-xl flex items-center justify-center text-white mb-4 text-2xl">
                  🌍
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                  <FormattedMessage id="blogger.profiles.expat.title" defaultMessage="Expat Bloggers" />
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <FormattedMessage id="blogger.profiles.expat.desc" defaultMessage="You live abroad. Perfect fit! Your readers face the same challenges you did." />
                </p>
              </div>

              {/* Relocation Expert */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-400 rounded-xl flex items-center justify-center text-white mb-4 text-2xl">
                  🚚
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                  <FormattedMessage id="blogger.profiles.relocation.title" defaultMessage="Relocation Experts" />
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <FormattedMessage id="blogger.profiles.relocation.desc" defaultMessage="Moving abroad guides, country comparisons. High intent audience!" />
                </p>
              </div>

              {/* Adventure / Outdoor */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all">
                <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-cyan-400 rounded-xl flex items-center justify-center text-white mb-4 text-2xl">
                  🏔️
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                  <FormattedMessage id="blogger.profiles.adventure.title" defaultMessage="Adventure Bloggers" />
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <FormattedMessage id="blogger.profiles.adventure.desc" defaultMessage="Hiking, diving, extreme sports abroad. Adventurers need legal protection too!" />
                </p>
              </div>
            </div>

            {/* WHY IT WORKS - value proposition */}
            <div className="mt-12 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-3xl p-6 md:p-8 text-white">
              <div className="text-center mb-6">
                <h3 className="text-xl md:text-2xl font-bold mb-2">
                  <FormattedMessage id="blogger.profiles.why.title" defaultMessage="Why Your Audience Needs SOS-Expat" />
                </h3>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl mb-2">📋</div>
                  <h4 className="font-semibold mb-1">
                    <FormattedMessage id="blogger.profiles.why1.title" defaultMessage="Visa Problems" />
                  </h4>
                  <p className="text-sm text-white/80">
                    <FormattedMessage id="blogger.profiles.why1.desc" defaultMessage="Expired visa, wrong documents, need extension. Travelers need help FAST." />
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-3xl mb-2">⚖️</div>
                  <h4 className="font-semibold mb-1">
                    <FormattedMessage id="blogger.profiles.why2.title" defaultMessage="Legal Issues Abroad" />
                  </h4>
                  <p className="text-sm text-white/80">
                    <FormattedMessage id="blogger.profiles.why2.desc" defaultMessage="Traffic accidents, contracts, scams. Legal help in a foreign country = urgent." />
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-3xl mb-2">🆘</div>
                  <h4 className="font-semibold mb-1">
                    <FormattedMessage id="blogger.profiles.why3.title" defaultMessage="Practical Questions" />
                  </h4>
                  <p className="text-sm text-white/80">
                    <FormattedMessage id="blogger.profiles.why3.desc" defaultMessage="Bank account, housing, local admin. Expat helpers share real experience." />
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* ALREADY HAVE A BLOG? - Monetize existing articles */}
        {/* ============================================================== */}
        <section className="py-16 md:py-24 px-4 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 text-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold mb-4">
                <Zap className="w-4 h-4" />
                <FormattedMessage id="blogger.existing.badge" defaultMessage="Already a blogger?" />
              </div>
              <h2 className="text-3xl md:text-5xl font-black mb-4">
                <FormattedMessage id="blogger.existing.title" defaultMessage="Monetize Your Existing Articles" />
              </h2>
              <p className="text-xl text-white/90 max-w-2xl mx-auto">
                <FormattedMessage id="blogger.existing.subtitle" defaultMessage="You already have articles? Add our widgets to them and start earning immediately. It takes 30 seconds per article." />
              </p>
            </div>

            {/* 2 integration methods */}
            <div className="grid md:grid-cols-2 gap-6 mb-10">
              {/* Method 1: Theme/Sidebar - ONE TIME */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-yellow-400 text-yellow-900 rounded-full flex items-center justify-center font-black">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">
                      <FormattedMessage id="blogger.existing.method1.title" defaultMessage="Sidebar / Theme" />
                    </h3>
                    <p className="text-sm text-yellow-300 font-semibold">
                      <FormattedMessage id="blogger.existing.method1.badge" defaultMessage="Recommended for large blogs" />
                    </p>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-white/90">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-300 mt-0.5 flex-shrink-0" />
                    <FormattedMessage id="blogger.existing.method1.point1" defaultMessage="Add widget ONCE in your sidebar or theme" />
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-300 mt-0.5 flex-shrink-0" />
                    <FormattedMessage id="blogger.existing.method1.point2" defaultMessage="Appears on ALL pages automatically" />
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-300 mt-0.5 flex-shrink-0" />
                    <FormattedMessage id="blogger.existing.method1.point3" defaultMessage="Works with WordPress, Blogger, Wix, etc." />
                  </li>
                </ul>
                <div className="mt-4 bg-white/10 rounded-xl p-3 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-300" />
                  <span className="font-semibold">
                    <FormattedMessage id="blogger.existing.method1.time" defaultMessage="5 minutes, one time only" />
                  </span>
                </div>
              </div>

              {/* Method 2: Per article */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center font-black">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">
                      <FormattedMessage id="blogger.existing.method2.title" defaultMessage="In specific articles" />
                    </h3>
                    <p className="text-sm text-white/60">
                      <FormattedMessage id="blogger.existing.method2.badge" defaultMessage="For targeted placement" />
                    </p>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-white/90">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-300 mt-0.5 flex-shrink-0" />
                    <FormattedMessage id="blogger.existing.method2.point1" defaultMessage="Copy-paste widget in article content" />
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-300 mt-0.5 flex-shrink-0" />
                    <FormattedMessage id="blogger.existing.method2.point2" defaultMessage="Place at the best spot for conversion" />
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-300 mt-0.5 flex-shrink-0" />
                    <FormattedMessage id="blogger.existing.method2.point3" defaultMessage="Ideal for your top-performing articles" />
                  </li>
                </ul>
                <div className="mt-4 bg-white/10 rounded-xl p-3 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <span className="font-semibold">
                    <FormattedMessage id="blogger.existing.method2.time" defaultMessage="30 seconds per article" />
                  </span>
                </div>
              </div>
            </div>

            {/* Pro tip */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 mb-10 max-w-2xl mx-auto">
              <p className="text-center text-sm">
                <span className="font-bold text-yellow-300">💡 <FormattedMessage id="blogger.existing.tip.label" defaultMessage="Pro tip:" /></span>{' '}
                <FormattedMessage id="blogger.existing.tip.text" defaultMessage="Add the widget in your sidebar for all pages, PLUS inside your 10 best articles for maximum visibility." />
              </p>
            </div>

            {/* Calculator */}
            <div className="bg-white rounded-3xl p-6 md:p-8 text-gray-900 max-w-2xl mx-auto">
              <h3 className="text-xl font-bold text-center mb-6 flex items-center justify-center gap-2">
                <Calculator className="w-6 h-6 text-green-600" />
                <FormattedMessage id="blogger.existing.calculator.title" defaultMessage="Calculate Your Potential Earnings" />
              </h3>

              <div className="space-y-6">
                {/* Articles slider */}
                <div>
                  <label className="flex items-center justify-between text-sm font-medium mb-2">
                    <span>
                      <FormattedMessage id="blogger.existing.calculator.articles" defaultMessage="How many articles do you have?" />
                    </span>
                    <span className="text-green-600 font-bold text-lg">{calcArticles}</span>
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={calcArticles}
                    onChange={(e) => setCalcArticles(parseInt(e.target.value))}
                    className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>5</span>
                    <span>50</span>
                    <span>100</span>
                  </div>
                </div>

                {/* Visits per article per day */}
                <div>
                  <label className="flex items-center justify-between text-sm font-medium mb-2">
                    <span>
                      <FormattedMessage id="blogger.existing.calculator.visits" defaultMessage="Average visits per article/day" />
                    </span>
                    <span className="text-green-600 font-bold text-lg">{calcVisitsPerArticle}</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={calcVisitsPerArticle}
                    onChange={(e) => setCalcVisitsPerArticle(parseInt(e.target.value))}
                    className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1</span>
                    <span>25</span>
                    <span>50</span>
                  </div>
                </div>

                {/* Conversion rate - REALISTIC 0.5% to 3% */}
                <div>
                  <label className="flex items-center justify-between text-sm font-medium mb-2">
                    <span>
                      <FormattedMessage id="blogger.existing.calculator.conversion" defaultMessage="Conversion rate" />
                    </span>
                    <span className="text-green-600 font-bold text-lg">{calcConversionRate}%</span>
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.5"
                    value={calcConversionRate}
                    onChange={(e) => setCalcConversionRate(parseFloat(e.target.value))}
                    className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0.5%</span>
                    <span>1.5%</span>
                    <span>3%</span>
                  </div>
                </div>

                {/* Results */}
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-6 text-white text-center">
                  <p className="text-sm opacity-90 mb-1">
                    <FormattedMessage id="blogger.existing.calculator.result" defaultMessage="Estimated monthly earnings" />
                  </p>
                  <p className="text-5xl font-black">${monthlyEarnings}</p>
                  <p className="text-sm opacity-90 mt-2">
                    {monthlyVisits.toLocaleString()} <FormattedMessage id="blogger.existing.calculator.visits.label" defaultMessage="visits" /> × {calcConversionRate}% = {monthlyClients} <FormattedMessage id="blogger.existing.calculator.clients" defaultMessage="clients" /> × $10
                  </p>
                </div>

                {/* Disclaimer - HONEST */}
                <p className="text-xs text-gray-500 text-center">
                  <FormattedMessage
                    id="blogger.existing.calculator.disclaimer"
                    defaultMessage="Results vary depending on your niche, traffic quality, and content relevance. These are estimates, not guarantees."
                  />
                </p>
              </div>
            </div>

            {/* CTA */}
            <div className="text-center mt-10">
              <button
                onClick={() => navigate(registerRoute)}
                className="group bg-white text-green-600 font-bold px-8 py-4 rounded-2xl text-lg inline-flex items-center gap-3 hover:bg-gray-100 transition-all shadow-xl"
              >
                <Rocket className="w-6 h-6" />
                <FormattedMessage id="blogger.existing.cta" defaultMessage="Start Monetizing My Articles" />
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* WHAT TO WRITE ABOUT */}
        {/* ============================================================== */}
        <section className="py-16 md:py-20 px-4 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white mb-4">
                <FormattedMessage id="blogger.topics.title" defaultMessage="What to Write About?" />
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                <FormattedMessage id="blogger.topics.subtitle" defaultMessage="Topics that work well for SOS-Expat referrals" />
              </p>
            </div>

            {/* Visa guides highlight box */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-3xl p-6 md:p-8 text-white mb-8">
              <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <span className="text-3xl">📋</span>
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl font-bold mb-1">
                    <FormattedMessage id="blogger.topics.visa.title" defaultMessage="Visa Guides = Best Performers" />
                  </h3>
                  <p className="text-white/80">
                    <FormattedMessage id="blogger.topics.visa.desc" defaultMessage="Articles about visa requirements rank well on Google and convert best." />
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white/10 rounded-xl px-3 py-2 text-center text-sm">
                  <FormattedMessage id="blogger.topics.ex1" defaultMessage="'Spain Digital Nomad Visa'" />
                </div>
                <div className="bg-white/10 rounded-xl px-3 py-2 text-center text-sm">
                  <FormattedMessage id="blogger.topics.ex2" defaultMessage="'UK Work Permit Guide'" />
                </div>
                <div className="bg-white/10 rounded-xl px-3 py-2 text-center text-sm">
                  <FormattedMessage id="blogger.topics.ex3" defaultMessage="'How to Get a French Visa'" />
                </div>
                <div className="bg-white/10 rounded-xl px-3 py-2 text-center text-sm">
                  <FormattedMessage id="blogger.topics.ex4" defaultMessage="'Dubai Residence Permit'" />
                </div>
              </div>
              <p className="mt-4 text-sm text-white/70 text-center">
                <FormattedMessage id="blogger.topics.tip" defaultMessage="Focus on long-tail keywords for better SEO rankings" />
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {articleTopics.map((topic, idx) => (
                <div
                  key={idx}
                  className={`rounded-2xl p-4 text-center border hover:shadow-lg hover:-translate-y-1 transition-all ${
                    topic.highlight
                      ? 'bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 border-purple-300 dark:border-purple-700 ring-2 ring-purple-400/50'
                      : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
                  }`}
                >
                  <div className="text-4xl mb-2">{topic.icon}</div>
                  <div className={`font-bold ${topic.highlight ? 'text-purple-700 dark:text-purple-300' : 'text-gray-900 dark:text-white'}`}>
                    {topic.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{topic.desc}</div>
                  {topic.highlight && (
                    <div className="mt-2 text-xs font-semibold text-purple-600 dark:text-purple-400">
                      <FormattedMessage id="blogger.topic.recommended" defaultMessage="Top performer!" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Example article ideas - 4 columns for variety */}
            <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Digital Nomad example */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-2xl p-4 border border-purple-200 dark:border-purple-700">
                <div className="text-2xl mb-2">💻</div>
                <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1">
                  <FormattedMessage id="blogger.example.nomad.type" defaultMessage="Digital Nomad:" />
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 italic mb-2">
                  "<FormattedMessage id="blogger.example.nomad.text" defaultMessage="Spain Digital Nomad Visa 2026 Guide" />"
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 font-bold">→ $10/visa help call</p>
              </div>

              {/* Travel blogger example */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl p-4 border border-blue-200 dark:border-blue-700">
                <div className="text-2xl mb-2">✈️</div>
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
                  <FormattedMessage id="blogger.example.travel.type" defaultMessage="Travel Blog:" />
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 italic mb-2">
                  "<FormattedMessage id="blogger.example.travel.text" defaultMessage="What to Do if You Lose Your Passport in Thailand" />"
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 font-bold">→ $10/emergency help</p>
              </div>

              {/* Photographer example */}
              <div className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 rounded-2xl p-4 border border-pink-200 dark:border-pink-700">
                <div className="text-2xl mb-2">📸</div>
                <p className="text-xs font-semibold text-pink-600 dark:text-pink-400 mb-1">
                  <FormattedMessage id="blogger.example.photo.type" defaultMessage="Photo Blog:" />
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 italic mb-2">
                  "<FormattedMessage id="blogger.example.photo.text" defaultMessage="Photography Permits in Morocco: What You Need" />"
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 font-bold">→ $10/legal help</p>
              </div>

              {/* Vacation/Holiday example */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-2xl p-4 border border-orange-200 dark:border-orange-700">
                <div className="text-2xl mb-2">🏖️</div>
                <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-1">
                  <FormattedMessage id="blogger.example.vacation.type" defaultMessage="Vacation Blog:" />
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 italic mb-2">
                  "<FormattedMessage id="blogger.example.vacation.text" defaultMessage="Bali Tourist Visa: How to Extend Your Stay" />"
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 font-bold">→ $10/visa help</p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* RESOURCES PROVIDED */}
        {/* ============================================================== */}
        <section className="py-16 md:py-20 px-4 bg-white dark:bg-gray-950">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white mb-4">
                <FormattedMessage id="blogger.resources.title" defaultMessage="Resources Included Free" />
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                <FormattedMessage id="blogger.resources.subtitle" defaultMessage="Everything you need to promote professionally" />
              </p>
            </div>

            {/* Resources highlight box */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-6 md:p-8 text-white mb-8">
              <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <span className="text-3xl">🎁</span>
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl font-bold mb-1">
                    <FormattedMessage id="blogger.resources.box.title" defaultMessage="All Resources Included" />
                  </h3>
                  <p className="text-white/80">
                    <FormattedMessage id="blogger.resources.box.desc" defaultMessage="No need to create your own graphics. We provide everything." />
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {resources.map((resource, idx) => (
                  <div key={idx} className="bg-white/10 rounded-xl px-3 py-2 text-center text-sm">
                    <div className="text-2xl mb-1">{resource.icon}</div>
                    <div>{resource.name}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Widget highlight - NEW feature */}
            <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 rounded-3xl p-6 md:p-8 text-white mb-8 relative overflow-hidden">
              <div className="absolute top-2 right-4 px-3 py-1 bg-yellow-400 text-yellow-900 rounded-full text-xs font-black animate-pulse">
                NEW
              </div>
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Code className="w-10 h-10" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-black mb-2">
                    <FormattedMessage id="blogger.resources.widgets.highlight.title" defaultMessage="Smart Widgets = Copy & Paste" />
                  </h3>
                  <p className="text-white/90 mb-4">
                    <FormattedMessage id="blogger.resources.widgets.highlight.desc" defaultMessage="Pre-built buttons and banners with your affiliate link already integrated. Just copy the HTML code and paste it into your articles. Multiple sizes and styles available. Perfect tracking included!" />
                  </p>
                  <div className="flex flex-wrap gap-2 text-sm">
                    <span className="px-3 py-1 bg-white/20 rounded-full">
                      <FormattedMessage id="blogger.resources.widgets.tag1" defaultMessage="CTA Buttons" />
                    </span>
                    <span className="px-3 py-1 bg-white/20 rounded-full">
                      <FormattedMessage id="blogger.resources.widgets.tag2" defaultMessage="Banners 728x90" />
                    </span>
                    <span className="px-3 py-1 bg-white/20 rounded-full">
                      <FormattedMessage id="blogger.resources.widgets.tag3" defaultMessage="Sidebar 300x250" />
                    </span>
                    <span className="px-3 py-1 bg-white/20 rounded-full">
                      <FormattedMessage id="blogger.resources.widgets.tag4" defaultMessage="Mobile Optimized" />
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3 resource cards */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-purple-200 dark:border-purple-700">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-800 rounded-xl flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  <FormattedMessage id="blogger.resources.templates.title" defaultMessage="Article Templates" />
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <FormattedMessage id="blogger.resources.templates.desc" defaultMessage="Pre-written article structures you can customize. Just add your personal touch and publish." />
                </p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-700">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-xl flex items-center justify-center mb-4">
                  <Copy className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  <FormattedMessage id="blogger.resources.texts.title" defaultMessage="Ready-to-Copy Texts" />
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <FormattedMessage id="blogger.resources.texts.desc" defaultMessage="Promotional texts in 9 languages. Copy, paste, and you're done." />
                </p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-6 border border-green-200 dark:border-green-700">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-800 rounded-xl flex items-center justify-center mb-4">
                  <Search className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  <FormattedMessage id="blogger.resources.seo.title" defaultMessage="SEO Guide" />
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <FormattedMessage id="blogger.resources.seo.desc" defaultMessage="Best practices to rank your articles on Google and drive organic traffic." />
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* EARNINGS - Simple and clear */}
        {/* ============================================================== */}
        <section className="py-16 md:py-24 px-4 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-semibold mb-4">
                <DollarSign className="w-4 h-4" />
                <FormattedMessage id="blogger.earnings.badge" defaultMessage="Your Earnings" />
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white mb-4">
                <FormattedMessage id="blogger.earnings.title" defaultMessage="How Much Can You Earn?" />
              </h2>
            </div>

            {/* Main earning */}
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-3xl p-8 md:p-12 text-white text-center mb-8">
              <Phone className="w-16 h-16 mx-auto mb-4 opacity-80" />
              <div className="text-6xl md:text-8xl font-black mb-2">$10</div>
              <p className="text-xl md:text-2xl font-medium opacity-90">
                <FormattedMessage id="blogger.earnings.perCall" defaultMessage="Per client call to a lawyer or expat helper" />
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
                      <FormattedMessage id="blogger.earnings.partner" defaultMessage="Per call to your lawyer/helper partners" />
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <FormattedMessage id="blogger.earnings.partner.desc" defaultMessage="Find a lawyer or expat helper to join SOS-Expat. Every time they receive a call, you earn $5 passively!" />
                </p>
              </div>

              {/* SEO advantage */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-3xl p-6 border border-green-100 dark:border-green-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-800 rounded-xl flex items-center justify-center">
                    <Search className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="text-3xl font-black text-green-600 dark:text-green-400">SEO</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <FormattedMessage id="blogger.earnings.seo" defaultMessage="Long-term passive traffic" />
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <FormattedMessage id="blogger.earnings.seo.desc" defaultMessage="Your articles rank on Google and generate traffic for months or years. Write once, earn forever!" />
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* RECRUIT LAWYERS/HELPERS - Passive income */}
        {/* ============================================================== */}
        <section className="py-16 md:py-24 px-4 bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 text-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold mb-4">
                <Network className="w-4 h-4" />
                <FormattedMessage id="blogger.passive.badge" defaultMessage="Passive Income" />
              </div>
              <h2 className="text-3xl md:text-5xl font-black mb-4">
                <FormattedMessage id="blogger.passive.title" defaultMessage="Find Lawyer & Helper Partners" />
              </h2>
              <p className="text-xl text-white/90 max-w-2xl mx-auto">
                <FormattedMessage id="blogger.passive.subtitle" defaultMessage="Know a lawyer or experienced expat? Help them join SOS-Expat and earn $5 every time they receive a call!" />
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
                    <FormattedMessage id="blogger.passive.you" defaultMessage="YOU" />
                  </span>
                  <span className="text-white/80 text-sm">
                    <FormattedMessage id="blogger.passive.you.earn" defaultMessage="$10/client + $5/call from partners" />
                  </span>
                </div>

                {/* Arrow */}
                <div className="text-3xl mb-4">↓</div>

                {/* Partner providers */}
                <div className="flex justify-center gap-4 md:gap-8 mb-6">
                  {[
                    { emoji: '⚖️', label: intl.formatMessage({ id: 'blogger.passive.lawyer', defaultMessage: 'Lawyer' }) },
                    { emoji: '🌍', label: intl.formatMessage({ id: 'blogger.passive.helper', defaultMessage: 'Helper' }) },
                    { emoji: '⚖️', label: intl.formatMessage({ id: 'blogger.passive.lawyer', defaultMessage: 'Lawyer' }) },
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
                  <FormattedMessage id="blogger.passive.example" defaultMessage="Example: 3 lawyer partners, 20 calls/month each" />
                </p>
                <p className="text-2xl font-black text-green-300">
                  = $300/month <FormattedMessage id="blogger.passive.passive" defaultMessage="passive income!" />
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
                <FormattedMessage id="blogger.passive.cta" defaultMessage="Find Partners Today" />
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
              <FormattedMessage id="blogger.payment.title" defaultMessage="Get Paid Your Way" />
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
              <FormattedMessage id="blogger.payment.note" defaultMessage="Minimum $50 • Processed in 48h" />
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
                <FormattedMessage id="blogger.faq.title" defaultMessage="Questions?" />
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
        <section className="py-16 md:py-24 px-4 bg-gradient-to-br from-purple-600 via-purple-500 to-indigo-500 text-white">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-black mb-6">
              <FormattedMessage id="blogger.final.title" defaultMessage="Ready to Monetize Your Blog?" />
            </h2>
            <p className="text-xl text-white/90 mb-8">
              <FormattedMessage id="blogger.final.subtitle" defaultMessage="It's free, resources included, start earning today." />
            </p>

            <button
              onClick={() => navigate(registerRoute)}
              className="group bg-white text-purple-600 font-bold px-10 py-6 rounded-2xl text-xl inline-flex items-center gap-3 hover:bg-gray-100 transition-all shadow-2xl animate-pulse-glow"
            >
              <Rocket className="w-8 h-8" />
              <FormattedMessage id="blogger.final.cta" defaultMessage="Become a Blogger Partner Now" />
              <ArrowRight className="w-7 h-7 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="flex flex-wrap justify-center gap-4 mt-8 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-300" />
                <FormattedMessage id="blogger.final.trust.1" defaultMessage="100% Free" />
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-300" />
                <FormattedMessage id="blogger.final.trust.2" defaultMessage="Resources Included" />
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-300" />
                <FormattedMessage id="blogger.final.trust.3" defaultMessage="SEO Guide" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default BloggerLanding;
