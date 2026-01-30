/**
 * ChatterLanding - Elite Mobile-First Landing Page 2026
 *
 * OBJECTIFS:
 * - Comprendre en 3 secondes ce qu'on doit faire
 * - Savoir qu'on peut gagner de l'argent rapidement
 * - Voir que c'est SIMPLE : trouver des gens qui ont besoin d'aide
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
  Trophy,
  CheckCircle,
  ArrowRight,
  Gift,
  TrendingUp,
  Globe,
  HelpCircle,
  ChevronDown,
  MessageCircle,
  DollarSign,
  Clock,
  Smartphone,
  Award,
  Zap,
  Target,
  UserPlus,
  Rocket,
  Sparkles,
  Crown,
  Flame,
  ArrowDown,
  Phone,
  BadgeCheck,
  Timer,
  Network,
  Search,
  MessageSquare,
  Send,
  Wallet,
  Ban,
} from 'lucide-react';

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

  // SEO
  const seoTitle = intl.formatMessage({
    id: 'chatter.landing.seo.title',
    defaultMessage: 'Become a SOS-Expat Chatter | Earn $10/client helping people find legal help'
  });
  const seoDescription = intl.formatMessage({
    id: 'chatter.landing.seo.description',
    defaultMessage: 'Help expats and travelers find instant phone assistance with lawyers or expat helpers. Earn $10 per client, build a team, get paid worldwide via Mobile Money or Wise.'
  });

  // FAQ
  const faqs = [
    {
      question: intl.formatMessage({ id: 'chatter.faq.q1', defaultMessage: "What exactly do I have to do?" }),
      answer: intl.formatMessage({ id: 'chatter.faq.a1', defaultMessage: "It's simple: join Facebook groups for expats (like 'Expats in Spain', 'French in London'...), WhatsApp groups, Reddit, forums. When you see someone with a problem (visa, legal, emergency), share your unique link. When they call a lawyer or expat helper, you earn $10. That's it!" }),
    },
    {
      question: intl.formatMessage({ id: 'chatter.faq.q2', defaultMessage: "How much can I realistically earn?" }),
      answer: intl.formatMessage({ id: 'chatter.faq.a2', defaultMessage: "It depends on your activity. 5 clients = $50. 20 clients = $200. Some chatters earn $500-2000/month by building a team of other chatters and earning 5% of their earnings forever." }),
    },
    {
      question: intl.formatMessage({ id: 'chatter.faq.q3', defaultMessage: "What is an 'expat helper'?" }),
      answer: intl.formatMessage({ id: 'chatter.faq.a3', defaultMessage: "Expat helpers are experienced expats who provide practical advice and guidance. They're not lawyers, but they know the local system well and can help with everyday questions about visas, administration, housing, etc." }),
    },
    {
      question: intl.formatMessage({ id: 'chatter.faq.q4', defaultMessage: "Is this really free?" }),
      answer: intl.formatMessage({ id: 'chatter.faq.a4', defaultMessage: "100% free. No fees, no investment needed. You just need to pass a quick quiz to prove you understand how SOS-Expat works, then you get your affiliate links immediately." }),
    },
    {
      question: intl.formatMessage({ id: 'chatter.faq.q5', defaultMessage: "How and when do I get paid?" }),
      answer: intl.formatMessage({ id: 'chatter.faq.a5', defaultMessage: "Withdraw anytime once you reach $25. We support Wise (worldwide), Orange Money, Wave, MTN MoMo, M-Pesa, Airtel Money, and bank transfers. Payments processed within 48 hours." }),
    },
    {
      question: intl.formatMessage({ id: 'chatter.faq.q6', defaultMessage: "Do I need to be an expert?" }),
      answer: intl.formatMessage({ id: 'chatter.faq.a6', defaultMessage: "No! You don't give advice. You just connect people who need help with our lawyers and expat helpers. You're a connector, not an expert." }),
    },
  ];

  // Platforms where chatters can find clients
  const platforms = [
    { name: intl.formatMessage({ id: 'chatter.platform.fbgroups.name', defaultMessage: 'Facebook Groups' }), icon: '👥', desc: intl.formatMessage({ id: 'chatter.platform.fbgroups', defaultMessage: 'Expats, travelers, immigrants' }), highlight: true },
    { name: intl.formatMessage({ id: 'chatter.platform.whatsapp.name', defaultMessage: 'WhatsApp Groups' }), icon: '💬', desc: intl.formatMessage({ id: 'chatter.platform.whatsapp', defaultMessage: 'Community groups' }) },
    { name: 'Reddit', icon: '🔴', desc: intl.formatMessage({ id: 'chatter.platform.reddit', defaultMessage: 'r/expats, r/travel, etc.' }) },
    { name: 'Quora', icon: '❓', desc: intl.formatMessage({ id: 'chatter.platform.quora', defaultMessage: 'Answer questions' }) },
    { name: intl.formatMessage({ id: 'chatter.platform.forums.name', defaultMessage: 'Expat Forums' }), icon: '🌐', desc: intl.formatMessage({ id: 'chatter.platform.forums', defaultMessage: 'InterNations, Expat.com...' }) },
    { name: intl.formatMessage({ id: 'chatter.platform.telegram.name', defaultMessage: 'Telegram Groups' }), icon: '✈️', desc: intl.formatMessage({ id: 'chatter.platform.telegram', defaultMessage: 'Travel communities' }) },
  ];

  // Payment methods
  const paymentMethods = [
    { name: 'Wise', icon: '🌐' },
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
        ogImage="/og-chatter-2026.jpg"
        ogType="website"
        contentType="LandingPage"
      />
      <HreflangLinks pathname={location.pathname} />
      <FAQPageSchema faqs={faqs} pageTitle={seoTitle} />

      {/* Custom styles */}
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(34, 197, 94, 0.4); }
          50% { box-shadow: 0 0 40px rgba(34, 197, 94, 0.6); }
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
        <section className="relative min-h-[85vh] flex items-center bg-gradient-to-br from-emerald-600 via-green-500 to-teal-500 overflow-hidden">
          {/* Background decorations */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-10 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-yellow-400/20 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 max-w-5xl mx-auto px-4 py-12 text-center text-white">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full mb-6">
              <Sparkles className="w-5 h-5 text-yellow-300" />
              <span className="font-semibold text-sm">
                <FormattedMessage id="chatter.hero.badge" defaultMessage="100% Free • No Experience Needed" />
              </span>
            </div>

            {/* Main headline - LE BÉNÉFICE */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight">
              <FormattedMessage
                id="chatter.hero.title"
                defaultMessage="Earn $10 Every Time You Help Someone"
              />
            </h1>

            {/* Subtitle - CE QUE TU FAIS */}
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto mb-4 font-medium">
              <FormattedMessage
                id="chatter.hero.subtitle"
                defaultMessage="Find people who need legal help abroad. Connect them with a lawyer or expat helper in under 5 minutes. Get paid."
              />
            </p>

            {/* Ultra simple explanation */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 md:p-6 max-w-2xl mx-auto mb-8 border border-white/20">
              <p className="text-lg md:text-xl font-semibold">
                <FormattedMessage
                  id="chatter.hero.simple"
                  defaultMessage="Your job: Find people with problems → Share your link → They call → You earn $10"
                />
              </p>
            </div>

            {/* CTA */}
            <button
              onClick={() => navigate(registerRoute)}
              className="group bg-white text-green-600 font-bold px-8 py-5 rounded-2xl text-xl inline-flex items-center gap-3 hover:bg-gray-100 transition-all shadow-2xl animate-pulse-glow"
            >
              <Rocket className="w-7 h-7" />
              <FormattedMessage id="chatter.hero.cta" defaultMessage="Start Earning Now - It's Free" />
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Quick trust */}
            <div className="flex flex-wrap justify-center gap-4 mt-8 text-sm">
              <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
                <Globe className="w-4 h-4" />
                <FormattedMessage id="chatter.hero.trust.1" defaultMessage="Works Worldwide" />
              </div>
              <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
                <Clock className="w-4 h-4" />
                <FormattedMessage id="chatter.hero.trust.2" defaultMessage="Start in 5 min" />
              </div>
              <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
                <Smartphone className="w-4 h-4" />
                <FormattedMessage id="chatter.hero.trust.3" defaultMessage="Mobile Money Ready" />
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
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm font-semibold mb-4">
                <Target className="w-4 h-4" />
                <FormattedMessage id="chatter.role.badge" defaultMessage="Your Mission" />
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white mb-4">
                <FormattedMessage id="chatter.role.title" defaultMessage="It's Super Simple" />
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                <FormattedMessage id="chatter.role.subtitle" defaultMessage="No expertise needed. You're a connector, not an expert." />
              </p>
            </div>

            {/* 3 Steps - MOBILE FIRST */}
            <div className="space-y-6 md:space-y-0 md:grid md:grid-cols-3 md:gap-8">
              {/* Step 1 */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-3xl p-6 md:p-8 border border-blue-100 dark:border-blue-800 relative">
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg">
                  1
                </div>
                <div className="pt-4">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-800 rounded-2xl flex items-center justify-center mb-4">
                    <Search className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    <FormattedMessage id="chatter.step1.title" defaultMessage="Find People Who Need Help" />
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    <FormattedMessage id="chatter.step1.desc" defaultMessage="Browse Facebook groups for expats, WhatsApp groups, Reddit, forums... Look for people with problems: visa issues, legal questions, emergencies abroad." />
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full text-xs font-bold">
                      <FormattedMessage id="chatter.step1.tag.fbgroups" defaultMessage="Facebook Groups" />
                    </span>
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                      <FormattedMessage id="chatter.step1.tag.whatsapp" defaultMessage="WhatsApp Groups" />
                    </span>
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">Reddit</span>
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                      <FormattedMessage id="chatter.step1.tag.forums" defaultMessage="Expat Forums" />
                    </span>
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
                    <Send className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    <FormattedMessage id="chatter.step2.title" defaultMessage="Share Your Link" />
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    <FormattedMessage id="chatter.step2.desc" defaultMessage="Tell them they can speak with a lawyer or expat helper by phone in under 5 minutes. Works worldwide, all languages. Share your unique affiliate link." />
                  </p>
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-purple-200 dark:border-purple-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                      "<FormattedMessage id="chatter.step2.example" defaultMessage="You can get help from a lawyer or an experienced expat right now, by phone! Check this out:" />"
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
                    <FormattedMessage id="chatter.step3.title" defaultMessage="Get Paid $10" />
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    <FormattedMessage id="chatter.step3.desc" defaultMessage="When they make a call through your link, you earn $10. Instant tracking. Withdraw anytime via Mobile Money, Wise, or bank transfer." />
                  </p>
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-bold text-lg">
                    <CheckCircle className="w-5 h-5" />
                    <FormattedMessage id="chatter.step3.note" defaultMessage="No limit on earnings!" />
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
                    <FormattedMessage id="chatter.note.title" defaultMessage="Lawyers AND Expat Helpers" />
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    <FormattedMessage id="chatter.note.desc" defaultMessage="SOS-Expat connects people with professional lawyers AND experienced expat helpers. Lawyers for legal matters, expat helpers for practical advice. Both available instantly by phone, worldwide." />
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* WHERE TO FIND CLIENTS */}
        {/* ============================================================== */}
        <section className="py-16 md:py-20 px-4 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white mb-4">
                <FormattedMessage id="chatter.where.title" defaultMessage="Where to Find People Who Need Help?" />
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                <FormattedMessage id="chatter.where.subtitle" defaultMessage="You're already on these platforms. Just look for people with problems!" />
              </p>
            </div>

            {/* Facebook Groups highlight box */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-6 md:p-8 text-white mb-8">
              <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <span className="text-3xl">👥</span>
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl font-bold mb-1">
                    <FormattedMessage id="chatter.fbgroups.title" defaultMessage="Facebook Groups = Your Best Friend" />
                  </h3>
                  <p className="text-white/80">
                    <FormattedMessage id="chatter.fbgroups.desc" defaultMessage="Thousands of expat and travel groups exist. Join them, help people, earn money." />
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white/10 rounded-xl px-3 py-2 text-center text-sm">
                  <FormattedMessage id="chatter.fbgroups.ex1" defaultMessage="'Expats in Dubai'" />
                </div>
                <div className="bg-white/10 rounded-xl px-3 py-2 text-center text-sm">
                  <FormattedMessage id="chatter.fbgroups.ex2" defaultMessage="'French in London'" />
                </div>
                <div className="bg-white/10 rounded-xl px-3 py-2 text-center text-sm">
                  <FormattedMessage id="chatter.fbgroups.ex3" defaultMessage="'Digital Nomads'" />
                </div>
                <div className="bg-white/10 rounded-xl px-3 py-2 text-center text-sm">
                  <FormattedMessage id="chatter.fbgroups.ex4" defaultMessage="'Americans Abroad'" />
                </div>
              </div>
              <p className="mt-4 text-sm text-white/70 text-center">
                <FormattedMessage id="chatter.fbgroups.tip" defaultMessage="Search 'expats + [country]' or '[nationality] in [city]' on Facebook" />
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {platforms.map((platform, idx) => (
                <div
                  key={idx}
                  className={`rounded-2xl p-4 text-center border hover:shadow-lg hover:-translate-y-1 transition-all ${
                    (platform as any).highlight
                      ? 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-blue-300 dark:border-blue-700 ring-2 ring-blue-400/50'
                      : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
                  }`}
                >
                  <div className="text-4xl mb-2">{platform.icon}</div>
                  <div className={`font-bold ${(platform as any).highlight ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
                    {platform.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{platform.desc}</div>
                  {(platform as any).highlight && (
                    <div className="mt-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
                      <FormattedMessage id="chatter.platform.recommended" defaultMessage="Most effective!" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Example scenarios */}
            <div className="mt-10 grid md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-5 border border-blue-200 dark:border-blue-700">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">👥</div>
                  <div>
                    <p className="font-medium text-blue-700 dark:text-blue-300 mb-1">
                      <FormattedMessage id="chatter.example1.title" defaultMessage="In a Facebook Group 'Expats in Spain':" />
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                      "<FormattedMessage id="chatter.example1.text" defaultMessage="Help! My visa expired and I don't know what to do. Does anyone know a lawyer?" />"
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400 mt-2 font-bold">
                      → <FormattedMessage id="chatter.example1.action" defaultMessage="You reply with your link = $10" />
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">🔴</div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white mb-1">
                      <FormattedMessage id="chatter.example2.title" defaultMessage="Someone on Reddit r/expats:" />
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                      "<FormattedMessage id="chatter.example2.text" defaultMessage="Need urgent legal advice about my work permit in Germany. Any lawyers here?" />"
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400 mt-2 font-medium">
                      → <FormattedMessage id="chatter.example2.action" defaultMessage="Share your link! = $10" />
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
                <FormattedMessage id="chatter.earnings.badge" defaultMessage="Your Earnings" />
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white mb-4">
                <FormattedMessage id="chatter.earnings.title" defaultMessage="How Much Can You Earn?" />
              </h2>
            </div>

            {/* Main earning */}
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl p-8 md:p-12 text-white text-center mb-8">
              <Phone className="w-16 h-16 mx-auto mb-4 opacity-80" />
              <div className="text-6xl md:text-8xl font-black mb-2">$10</div>
              <p className="text-xl md:text-2xl font-medium opacity-90">
                <FormattedMessage id="chatter.earnings.perCall" defaultMessage="Per client call to a lawyer or expat helper" />
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
                <div className="bg-white/20 rounded-full px-4 py-2">5 clients = $50</div>
                <div className="bg-white/20 rounded-full px-4 py-2">20 clients = $200</div>
                <div className="bg-white/20 rounded-full px-4 py-2">50 clients = $500</div>
              </div>
            </div>

            {/* Bonus earnings */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Recruit lawyers/helpers */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-3xl p-6 border border-purple-100 dark:border-purple-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-800 rounded-xl flex items-center justify-center">
                    <UserPlus className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <div className="text-3xl font-black text-purple-600 dark:text-purple-400">$5</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <FormattedMessage id="chatter.earnings.recruit" defaultMessage="Per call to lawyers/helpers you recruit" />
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <FormattedMessage id="chatter.earnings.recruit.desc" defaultMessage="Recruit a lawyer or expat helper. Every time they receive a call, you earn $5 passively!" />
                </p>
              </div>

              {/* Build a team */}
              <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-3xl p-6 border border-orange-100 dark:border-orange-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-800 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <div className="text-3xl font-black text-orange-600 dark:text-orange-400">5%</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <FormattedMessage id="chatter.earnings.team" defaultMessage="Of your team's earnings. Forever." />
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <FormattedMessage id="chatter.earnings.team.desc" defaultMessage="Sponsor other chatters. Earn 5% of their client earnings every month. Build a team = build passive income!" />
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* BUILD A TEAM - Snowball effect */}
        {/* ============================================================== */}
        <section className="py-16 md:py-24 px-4 bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 text-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold mb-4">
                <Network className="w-4 h-4" />
                <FormattedMessage id="chatter.team.badge" defaultMessage="Multiply Your Income" />
              </div>
              <h2 className="text-3xl md:text-5xl font-black mb-4">
                <FormattedMessage id="chatter.team.title" defaultMessage="Build a Team, Earn 10x More" />
              </h2>
              <p className="text-xl text-white/90 max-w-2xl mx-auto">
                <FormattedMessage id="chatter.team.subtitle" defaultMessage="Don't just earn from your own referrals. Build a team of chatters and earn from theirs too!" />
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
                    <FormattedMessage id="chatter.team.you" defaultMessage="YOU" />
                  </span>
                  <span className="text-white/80 text-sm">
                    <FormattedMessage id="chatter.team.you.earn" defaultMessage="$10/client + 5% from team" />
                  </span>
                </div>

                {/* Arrow */}
                <div className="text-3xl mb-4">↓</div>

                {/* Team Level 1 */}
                <div className="flex justify-center gap-4 md:gap-8 mb-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                        <Users className="w-7 h-7" />
                      </div>
                      <span className="mt-1 text-sm font-medium">
                        <FormattedMessage id="chatter.team.chatter" defaultMessage="Chatter" />
                      </span>
                      <span className="text-xs text-green-300">+5%</span>
                    </div>
                  ))}
                </div>

                {/* Arrow */}
                <div className="text-2xl mb-4">↓</div>

                {/* Team Level 2 */}
                <div className="flex justify-center gap-3 flex-wrap">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5" />
                      </div>
                      <span className="text-xs text-blue-200">+$2</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Example calculation */}
              <div className="mt-8 bg-white/10 rounded-2xl p-4 text-center">
                <p className="font-semibold mb-2">
                  <FormattedMessage id="chatter.team.example" defaultMessage="Example: 10 chatters in your team, each earning $200/month" />
                </p>
                <p className="text-2xl font-black text-green-300">
                  = $100/month <FormattedMessage id="chatter.team.passive" defaultMessage="passive income for you!" />
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
                <FormattedMessage id="chatter.team.cta" defaultMessage="Start Building Your Team" />
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
              <FormattedMessage id="chatter.payment.title" defaultMessage="Get Paid Your Way" />
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
              <FormattedMessage id="chatter.payment.note" defaultMessage="Minimum $25 • Processed in 48h" />
            </p>
          </div>
        </section>

        {/* ============================================================== */}
        {/* NO SPAM */}
        {/* ============================================================== */}
        <section className="py-10 px-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white">
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Ban className="w-6 h-6" />
              <h3 className="text-xl font-bold">
                <FormattedMessage id="chatter.nospam.title" defaultMessage="No Spam. Ever." />
              </h3>
            </div>
            <p className="text-white/90">
              <FormattedMessage id="chatter.nospam.desc" defaultMessage="Help people authentically. Spammers are permanently banned. Quality beats quantity." />
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
                <FormattedMessage id="chatter.faq.title" defaultMessage="Questions?" />
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
        <section className="py-16 md:py-24 px-4 bg-gradient-to-br from-emerald-600 via-green-500 to-teal-500 text-white">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-black mb-6">
              <FormattedMessage id="chatter.final.title" defaultMessage="Ready to Start Earning?" />
            </h2>
            <p className="text-xl text-white/90 mb-8">
              <FormattedMessage id="chatter.final.subtitle" defaultMessage="It's free, it's simple, and you can start right now." />
            </p>

            <button
              onClick={() => navigate(registerRoute)}
              className="group bg-white text-green-600 font-bold px-10 py-6 rounded-2xl text-xl inline-flex items-center gap-3 hover:bg-gray-100 transition-all shadow-2xl animate-pulse-glow"
            >
              <Rocket className="w-8 h-8" />
              <FormattedMessage id="chatter.final.cta" defaultMessage="Become a Chatter Now" />
              <ArrowRight className="w-7 h-7 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="flex flex-wrap justify-center gap-4 mt-8 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-300" />
                <FormattedMessage id="chatter.final.trust.1" defaultMessage="100% Free" />
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-300" />
                <FormattedMessage id="chatter.final.trust.2" defaultMessage="Start in 5 minutes" />
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-300" />
                <FormattedMessage id="chatter.final.trust.3" defaultMessage="Worldwide" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default ChatterLanding;
