/**
 * BloggerLanding - V2 Dark Premium Mobile-First
 *
 * Harmonized with ChatterLanding V7 design system:
 * - Dark theme (bg-black text-white) with purple/indigo identity
 * - Mobile-first with safe-area, 44px+ touch targets
 * - Accessible FAQ accordion (aria-controls, Plus/Minus)
 * - content-visibility: auto for below-fold perf
 * - Sticky CTA on mobile, prefers-reduced-motion
 */

import React, { useState, useEffect } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';
import { useLocaleNavigate } from '@/multilingual-system';
import { getTranslatedRouteSlug, type RouteKey } from '@/multilingual-system/core/routing/localeRoutes';
import { useApp } from '@/contexts/AppContext';
import Layout from '@/components/layout/Layout';
import SEOHead from '@/components/layout/SEOHead';
import { trackMetaViewContent } from '@/utils/metaPixel';
import HreflangLinks from '@/multilingual-system/components/HrefLang/HreflangLinks';
import FAQPageSchema from '@/components/seo/FAQPageSchema';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Plus,
  Minus,
  DollarSign,
  PenTool,
  Link,
  Code,
  Calculator,
  Phone,
  Crown,
  UserPlus,
  Search,
  Zap,
  Clock,
  FileText,
  Copy,
} from 'lucide-react';
import { useCountryFromUrl, useCountryLandingConfig, formatPaymentMethodDisplay, convertToLocal } from '@/country-landing';

// ============================================================================
// STYLES
// ============================================================================
const globalStyles = `
  @media (max-width: 768px) {
    .blogger-landing h1 { font-size: 2.25rem !important; }
    .blogger-landing h2 { font-size: 1.875rem !important; }
    .blogger-landing h3 { font-size: 1.5rem !important; }
    /* p tags: NO override — let Tailwind classes control each <p> individually */
  }

  /* FIX: index.css forces "span { font-size: 14px }" on mobile.
     Colored highlight spans inside headings MUST inherit the heading font-size. */
  .blogger-landing h1 span,
  .blogger-landing h2 span,
  .blogger-landing h3 span {
    font-size: inherit;
  }

  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 20px rgba(251, 191, 36, 0.4); }
    50% { box-shadow: 0 0 40px rgba(251, 191, 36, 0.6); }
  }
  .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
  .section-content {
    padding: 3rem 1rem;
    position: relative;
  }
  @media (min-width: 640px) { .section-content { padding: 4rem 1.5rem; } }
  @media (min-width: 1024px) { .section-content { padding: 6rem 2rem; } }
  .section-lazy {
    content-visibility: auto;
    contain-intrinsic-size: auto 600px;
  }
  @media (prefers-reduced-motion: reduce) {
    .animate-bounce, .transition-all { animation: none !important; transition: none !important; }
  }
`;

// ============================================================================
// SHARED COMPONENTS
// ============================================================================
const CTAButton: React.FC<{
  onClick: () => void;
  children: React.ReactNode;
  size?: 'normal' | 'large';
  className?: string;
  ariaLabel?: string;
}> = ({ onClick, children, size = 'normal', className = '', ariaLabel }) => (
  <button
    onClick={onClick}
    aria-label={ariaLabel}
    className={`
      flex items-center justify-center gap-2 sm:gap-3
      bg-gradient-to-r from-amber-400 to-yellow-400
      text-black font-extrabold rounded-2xl
      shadow-lg shadow-amber-500/30
      transition-all active:scale-[0.98] hover:shadow-xl hover:from-amber-300 hover:to-yellow-300
      will-change-transform
      ${size === 'large' ? 'min-h-[56px] sm:min-h-[64px] px-6 sm:px-8 py-4 sm:py-5 text-lg sm:text-xl' : 'min-h-[48px] sm:min-h-[56px] px-5 sm:px-6 py-3 sm:py-4 text-base sm:text-lg'}
      ${className}
    `}
  >
    {children}
    <ArrowRight className={size === 'large' ? 'w-5 h-5 sm:w-6 sm:h-6' : 'w-4 h-4 sm:w-5 sm:h-5'} aria-hidden="true" />
  </button>
);

const FAQItem: React.FC<{
  question: React.ReactNode;
  answer: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}> = ({ question, answer, isOpen, onToggle, index }) => (
  <div className="border border-white/10 rounded-2xl overflow-hidden transition-colors duration-200 hover:border-white/20" itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between gap-4 px-5 sm:px-6 py-4 sm:py-5 text-left min-h-[48px]"
      aria-expanded={isOpen}
      aria-controls={`faq-answer-${index}`}
      id={`faq-question-${index}`}
    >
      <span className="text-base sm:text-lg font-semibold text-white pr-2" itemProp="name">{question}</span>
      <span className={`flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all duration-300 ${isOpen ? 'bg-amber-400 text-black' : 'bg-white/10 text-white'}`} aria-hidden="true">
        {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
      </span>
    </button>
    <div
      id={`faq-answer-${index}`}
      role="region"
      aria-labelledby={`faq-question-${index}`}
      className={`overflow-hidden transition-all duration-300 ease-out ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
      itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer"
    >
      <div className="px-5 sm:px-6 pb-5 sm:pb-6 text-sm sm:text-base text-gray-300 leading-relaxed" itemProp="text">
        {answer}
      </div>
    </div>
  </div>
);

const ScrollIndicator: React.FC<{ label: string }> = ({ label }) => (
  <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2" aria-hidden="true">
    <span className="text-white/60 text-xs sm:text-sm font-medium">{label}</span>
    <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-white/60 animate-bounce" />
  </div>
);

// ============================================================================
// PAGE
// ============================================================================
const BloggerLanding: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const location = useLocation();
  const { language } = useApp();
  const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';

  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showStickyCTA, setShowStickyCTA] = useState(false);

  // Country-specific config
  const { countryCode, lang: urlLang } = useCountryFromUrl();
  const { config: countryConfig } = useCountryLandingConfig('blogger', countryCode, urlLang || langCode);
  const local = (usd: number) => { const s = convertToLocal(usd, countryConfig.currency); return s ? ` (${s})` : ''; };

  // Calculator
  const [calcArticles, setCalcArticles] = useState(20);
  const [calcVisitsPerArticle, setCalcVisitsPerArticle] = useState(5);
  const [calcConversionRate, setCalcConversionRate] = useState(1);
  const monthlyVisits = calcArticles * calcVisitsPerArticle * 30;
  const monthlyClients = Math.floor((monthlyVisits * calcConversionRate) / 100);
  const monthlyEarnings = monthlyClients * 10;

  const registerRoute = `/${getTranslatedRouteSlug('blogger-register' as RouteKey, langCode)}`;
  const goToRegister = () => navigate(registerRoute);

  useEffect(() => {
    trackMetaViewContent({ content_name: 'blogger_landing', content_category: 'landing_page', content_type: 'page' });
  }, []);

  useEffect(() => {
    const onScroll = () => setShowStickyCTA(window.scrollY > window.innerHeight * 0.8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // SEO
  const seoTitle = intl.formatMessage({ id: 'blogger.landing.seo.title', defaultMessage: 'Become a SOS-Expat Blogger Partner | Earn $10/client with your blog' });
  const seoDescription = intl.formatMessage({ id: 'blogger.landing.seo.description', defaultMessage: 'Write articles about expat life. Earn $10 per client, $5 per lawyer/helper partner. Templates, logos, and resources included. Withdraw via Wise or PayPal.' });
  const ctaAriaLabel = intl.formatMessage({ id: 'blogger.aria.cta.main', defaultMessage: 'Start earning money with your blog - Register as a Blogger Partner for free' });

  // FAQ
  const faqs = [
    { question: intl.formatMessage({ id: 'blogger.faq.q1', defaultMessage: "What exactly do I have to do as a Blogger Partner?" }), answer: intl.formatMessage({ id: 'blogger.faq.a1', defaultMessage: "Write blog articles about expat life, travel, immigration, visas, or living abroad. Include your unique affiliate link in articles. When readers call a lawyer or expat helper, you earn $10. That's it!" }) },
    { question: intl.formatMessage({ id: 'blogger.faq.q2', defaultMessage: "How much can I realistically earn?" }), answer: intl.formatMessage({ id: 'blogger.faq.a2', defaultMessage: "It depends on your blog traffic. 10 clients = $100. 50 clients = $500. Some bloggers earn $1000-3000/month by writing SEO-optimized articles that rank well on Google." }) },
    { question: intl.formatMessage({ id: 'blogger.faq.q3', defaultMessage: "What is an 'expat helper'?" }), answer: intl.formatMessage({ id: 'blogger.faq.a3', defaultMessage: "Expat helpers are experienced expats who provide practical advice and guidance. They're not lawyers, but they know the local system well and can help with everyday questions about visas, administration, housing, etc." }) },
    { question: intl.formatMessage({ id: 'blogger.faq.q4', defaultMessage: "What resources do I get?" }), answer: intl.formatMessage({ id: 'blogger.faq.a4', defaultMessage: "You get article templates, ready-to-copy texts in 9 languages, HD logos, banners, and a complete integration guide with SEO best practices." }) },
    { question: intl.formatMessage({ id: 'blogger.faq.q5', defaultMessage: "How and when do I get paid?" }), answer: intl.formatMessage({ id: 'blogger.faq.a5', defaultMessage: "Withdraw anytime once you reach $50. We support Wise, PayPal, Mobile Money, and bank transfers. Payments processed within 48 hours." }) },
    { question: intl.formatMessage({ id: 'blogger.faq.q6', defaultMessage: "Do I need a specific blog topic?" }), answer: intl.formatMessage({ id: 'blogger.faq.a6', defaultMessage: "Your blog should relate to expat life, travel, immigration, or similar topics. We provide article templates if you need inspiration!" }) },
  ];

  // Article topics
  const articleTopics = [
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

  // Resources
  const resources = [
    { name: intl.formatMessage({ id: 'blogger.resource.templates', defaultMessage: 'Article Templates' }), icon: '📝' },
    { name: intl.formatMessage({ id: 'blogger.resource.texts', defaultMessage: 'Ready Texts' }), icon: '📋' },
    { name: intl.formatMessage({ id: 'blogger.resource.widgets', defaultMessage: 'Smart Widgets' }), icon: '🧩', highlight: true },
    { name: intl.formatMessage({ id: 'blogger.resource.logos', defaultMessage: 'HD Logos' }), icon: '✨' },
    { name: intl.formatMessage({ id: 'blogger.resource.banners', defaultMessage: 'Banners' }), icon: '🖼️' },
    { name: intl.formatMessage({ id: 'blogger.resource.seo', defaultMessage: 'SEO Guide' }), icon: '🔍' },
  ];

  // Payment methods (from country config)
  const paymentMethods = countryConfig.paymentMethods.map(m => ({ name: m.name, icon: m.emoji }));

  return (
    <Layout showFooter={false}>
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        ogImage="/og-blogger-2026.jpg"
        ogType="website"
        contentType="LandingPage"
      />
      <HreflangLinks pathname={location.pathname} />
      <FAQPageSchema faqs={faqs} pageTitle={seoTitle} />

      <style>{globalStyles}</style>

      <div className="blogger-landing bg-black text-white">

        {/* ================================================================
            SECTION 1 - HERO
        ================================================================ */}
        <section
          className="min-h-[100svh] flex flex-col justify-center items-center relative bg-gradient-to-b from-purple-950 via-purple-900 to-black overflow-hidden"
          aria-label={seoTitle}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(168,85,247,0.15),transparent_50%)]" aria-hidden="true" />

          <div className="relative z-10 text-center px-4 sm:px-6 max-w-5xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-6 sm:mb-8">
              <PenTool className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" aria-hidden="true" />
              <span className="text-sm sm:text-base font-semibold text-white/90">
                <FormattedMessage id="blogger.hero.badge" defaultMessage="Blogger Partner Program • Resources Included" />
              </span>
            </div>

            {/* H1 */}
            <h1 className="!text-4xl lg:!text-5xl xl:!text-6xl font-black text-white mb-3 sm:mb-6 !leading-[1.1]">
              <FormattedMessage id="blogger.hero.title" defaultMessage="Monetize Your Blog: $10 Per Client" />
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-white/80 max-w-3xl mx-auto mb-4 sm:mb-6">
              <FormattedMessage id="blogger.hero.subtitle" defaultMessage="Write articles about expat life. Include your link. Readers call a lawyer or expat helper. You earn $10." />
            </p>

            {/* Simple flow box */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 max-w-2xl mx-auto mb-6 sm:mb-8 border border-white/10">
              <p className="text-base sm:text-lg font-semibold text-white/90">
                <FormattedMessage id="blogger.hero.simple" defaultMessage="Your job: Write articles → Add your link → Readers call → You earn $10" />
              </p>
            </div>

            {/* Key numbers */}
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-6 sm:mb-8">
              {[
                { value: '$10', label: intl.formatMessage({ id: 'blogger.hero.trust.client', defaultMessage: 'per client' }) },
                { value: '$5', label: intl.formatMessage({ id: 'blogger.hero.trust.partner', defaultMessage: 'per partner call' }) },
                { value: 'SEO', label: intl.formatMessage({ id: 'blogger.hero.trust.seo', defaultMessage: 'passive traffic' }) },
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center bg-white/5 border border-white/10 rounded-2xl px-5 py-3 min-w-[100px]">
                  <span className="text-xl sm:text-2xl font-black text-purple-400">{item.value}</span>
                  <span className="text-xs sm:text-sm text-white/60">{item.label}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <CTAButton onClick={goToRegister} size="large" className="animate-pulse-glow mx-auto" ariaLabel={ctaAriaLabel}>
              <FormattedMessage id="blogger.hero.cta" defaultMessage="Become a Blogger Partner - It's Free" />
            </CTAButton>

            {/* Trust pills */}
            <div className="flex flex-wrap justify-center gap-3 mt-6 sm:mt-8 text-xs sm:text-sm">
              <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
                <FileText className="w-3.5 h-3.5 text-purple-400" aria-hidden="true" />
                <FormattedMessage id="blogger.hero.trust.1" defaultMessage="Article Templates" />
              </div>
              <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
                <Search className="w-3.5 h-3.5 text-purple-400" aria-hidden="true" />
                <FormattedMessage id="blogger.hero.trust.2" defaultMessage="SEO Guide" />
              </div>
              <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
                <Code className="w-3.5 h-3.5 text-purple-400" aria-hidden="true" />
                <FormattedMessage id="blogger.hero.trust.3" defaultMessage="HD Logos & Banners" />
              </div>
            </div>
          </div>

          <ScrollIndicator label={intl.formatMessage({ id: 'blogger.hero.scroll', defaultMessage: 'Discover more' })} />
        </section>

        {/* ================================================================
            SECTION 2 - HOW IT WORKS (3 steps)
        ================================================================ */}
        <section className="section-content section-lazy" aria-labelledby="blogger-steps-title">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10 sm:mb-14">
              <h2 id="blogger-steps-title" className="text-2xl sm:text-4xl font-black mb-3">
                <FormattedMessage id="blogger.role.title" defaultMessage="It's Super Simple" />
              </h2>
              <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto">
                <FormattedMessage id="blogger.role.subtitle" defaultMessage="Use your existing blog. We give you all the resources." />
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
              {/* Step 1 - Write */}
              <article className="relative bg-white/5 border border-purple-500/30 rounded-2xl p-5 sm:p-6">
                <div className="absolute -top-3 -left-3 w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg">1</div>
                <div className="pt-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-purple-500/20 rounded-xl flex items-center justify-center mb-3">
                    <PenTool className="w-6 h-6 sm:w-7 sm:h-7 text-purple-400" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold mb-2">
                    <FormattedMessage id="blogger.step1.title" defaultMessage="Write Articles" />
                  </h3>
                  <p className="text-sm sm:text-base text-gray-400 mb-3">
                    <FormattedMessage id="blogger.step1.desc" defaultMessage="Write about expat life, visas, moving abroad, legal tips. Use our templates if you need inspiration. Focus on SEO for long-term traffic." />
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-purple-500/30 text-purple-300 rounded-full text-xs font-bold">
                      <FormattedMessage id="blogger.step1.tag.visa" defaultMessage="Visa Guides" />
                    </span>
                    <span className="px-3 py-1 bg-white/5 text-white/70 rounded-full text-xs font-medium">
                      <FormattedMessage id="blogger.step1.tag.tips" defaultMessage="Living Abroad" />
                    </span>
                    <span className="px-3 py-1 bg-white/5 text-white/70 rounded-full text-xs font-medium">
                      <FormattedMessage id="blogger.step1.tag.legal" defaultMessage="Legal Tips" />
                    </span>
                  </div>
                </div>
              </article>

              {/* Step 2 - Link */}
              <article className="relative bg-white/5 border border-blue-500/30 rounded-2xl p-5 sm:p-6">
                <div className="absolute -top-3 -left-3 w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg">2</div>
                <div className="pt-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-500/20 rounded-xl flex items-center justify-center mb-3">
                    <Link className="w-6 h-6 sm:w-7 sm:h-7 text-blue-400" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold mb-2">
                    <FormattedMessage id="blogger.step2.title" defaultMessage="Add Your Link" />
                  </h3>
                  <p className="text-sm sm:text-base text-gray-400 mb-3">
                    <FormattedMessage id="blogger.step2.desc" defaultMessage="Include your unique affiliate link in articles. Use our banners, widgets, or simple text links. We track everything automatically." />
                  </p>
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 mb-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-purple-300">
                      <Code className="w-4 h-4" aria-hidden="true" />
                      <FormattedMessage id="blogger.step2.widgets" defaultMessage="Ready-to-use widgets with your link already embedded!" />
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                    <p className="text-sm text-gray-400 italic">
                      "<FormattedMessage id="blogger.step2.example" defaultMessage="Need help with your visa? Talk to a lawyer or expat helper in minutes →" />"
                    </p>
                  </div>
                </div>
              </article>

              {/* Step 3 - Earn */}
              <article className="relative bg-white/5 border border-green-500/30 rounded-2xl p-5 sm:p-6">
                <div className="absolute -top-3 -left-3 w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg">3</div>
                <div className="pt-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-500/20 rounded-xl flex items-center justify-center mb-3">
                    <DollarSign className="w-6 h-6 sm:w-7 sm:h-7 text-green-400" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold mb-2">
                    <FormattedMessage id="blogger.step3.title" defaultMessage="Get Paid $10" />
                  </h3>
                  <p className="text-sm sm:text-base text-gray-400 mb-3">
                    <FormattedMessage id="blogger.step3.desc" defaultMessage="When readers make a call through your link, you earn $10. Withdraw anytime via Wise, PayPal, or Mobile Money." />
                  </p>
                  <div className="flex items-center gap-2 text-green-400 font-bold">
                    <Check className="w-5 h-5" aria-hidden="true" />
                    <FormattedMessage id="blogger.step3.note" defaultMessage="No limit on earnings!" />
                  </div>
                </div>
              </article>
            </div>

            {/* Note: Lawyers AND Expat Helpers */}
            <div className="mt-8 sm:mt-10 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl" aria-hidden="true">⚖️</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-1">
                    <FormattedMessage id="blogger.note.title" defaultMessage="Lawyers AND Expat Helpers" />
                  </h3>
                  <p className="text-sm sm:text-base text-gray-400">
                    <FormattedMessage id="blogger.note.desc" defaultMessage="SOS-Expat connects people with professional lawyers AND experienced expat helpers. Lawyers for legal matters, expat helpers for practical advice. Both available instantly by phone, worldwide." />
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 3 - WHO CAN JOIN (8 profiles)
        ================================================================ */}
        <section className="section-content section-lazy" aria-labelledby="blogger-profiles-title">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10 sm:mb-14">
              <h2 id="blogger-profiles-title" className="text-2xl sm:text-4xl font-black mb-3">
                <FormattedMessage id="blogger.profiles.title" defaultMessage="Who Can Join?" />
              </h2>
              <p className="text-base sm:text-lg text-gray-400 max-w-3xl mx-auto">
                <FormattedMessage id="blogger.profiles.subtitle" defaultMessage="Bloggers, photographers, influencers... If your audience travels or lives abroad, SOS-Expat is perfect for you!" />
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {[
                { emoji: '✈️', titleId: 'blogger.profiles.travel.title', titleDefault: 'Travel Bloggers', descId: 'blogger.profiles.travel.desc', descDefault: 'Your readers plan trips. They need visa info, legal help abroad. $10 per referral!', gradient: 'from-blue-500 to-cyan-400' },
                { emoji: '🏖️', titleId: 'blogger.profiles.vacation.title', titleDefault: 'Vacation Bloggers', descId: 'blogger.profiles.vacation.desc', descDefault: 'Beach lovers, resort experts. Tourists abroad sometimes need urgent legal help.', gradient: 'from-orange-500 to-yellow-400' },
                { emoji: '📸', titleId: 'blogger.profiles.photo.title', titleDefault: 'Travel Photographers', descId: 'blogger.profiles.photo.desc', descDefault: 'Photo essays, destination guides. Your visual content + our link = passive income.', gradient: 'from-purple-500 to-pink-400' },
                { emoji: '💻', titleId: 'blogger.profiles.nomad.title', titleDefault: 'Digital Nomads', descId: 'blogger.profiles.nomad.desc', descDefault: 'Your audience NEEDS visa info! Digital nomad visa guides = high conversion.', gradient: 'from-indigo-500 to-purple-400', badge: 'TOP' },
                { emoji: '🎬', titleId: 'blogger.profiles.influencer.title', titleDefault: 'Travel Influencers', descId: 'blogger.profiles.influencer.desc', descDefault: 'YouTube, Instagram, TikTok. Link in bio + affiliate links in descriptions.', gradient: 'from-pink-500 to-rose-400' },
                { emoji: '🌍', titleId: 'blogger.profiles.expat.title', titleDefault: 'Expat Bloggers', descId: 'blogger.profiles.expat.desc', descDefault: 'You live abroad. Perfect fit! Your readers face the same challenges you did.', gradient: 'from-green-500 to-emerald-400', badge: 'BEST' },
                { emoji: '🚚', titleId: 'blogger.profiles.relocation.title', titleDefault: 'Relocation Experts', descId: 'blogger.profiles.relocation.desc', descDefault: 'Moving abroad guides, country comparisons. High intent audience!', gradient: 'from-amber-500 to-orange-400' },
                { emoji: '🏔️', titleId: 'blogger.profiles.adventure.title', titleDefault: 'Adventure Bloggers', descId: 'blogger.profiles.adventure.desc', descDefault: 'Hiking, diving, extreme sports abroad. Adventurers need legal protection too!', gradient: 'from-teal-500 to-cyan-400' },
              ].map((profile, i) => (
                <article key={i} className={`relative bg-white/5 rounded-2xl p-4 sm:p-5 border ${profile.badge ? 'border-purple-500/50 ring-1 ring-purple-400/30' : 'border-white/10'} transition-colors hover:border-white/20`}>
                  {profile.badge && (
                    <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-purple-500 text-white rounded-full text-[10px] sm:text-xs font-bold">{profile.badge}</div>
                  )}
                  <div className={`w-11 h-11 sm:w-14 sm:h-14 bg-gradient-to-br ${profile.gradient} rounded-xl flex items-center justify-center text-lg sm:text-2xl mb-3`}>
                    {profile.emoji}
                  </div>
                  <h3 className="font-bold text-sm sm:text-base mb-1">
                    <FormattedMessage id={profile.titleId} defaultMessage={profile.titleDefault} />
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-400">
                    <FormattedMessage id={profile.descId} defaultMessage={profile.descDefault} />
                  </p>
                </article>
              ))}
            </div>

            {/* Why your audience needs SOS-Expat */}
            <div className="mt-8 sm:mt-10 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/20 rounded-2xl p-5 sm:p-8">
              <h3 className="text-lg sm:text-xl font-bold text-center mb-6">
                <FormattedMessage id="blogger.profiles.why.title" defaultMessage="Why Your Audience Needs SOS-Expat" />
              </h3>
              <div className="grid sm:grid-cols-3 gap-5">
                {[
                  { emoji: '📋', titleId: 'blogger.profiles.why1.title', titleDefault: 'Visa Problems', descId: 'blogger.profiles.why1.desc', descDefault: 'Expired visa, wrong documents, need extension. Travelers need help FAST.' },
                  { emoji: '⚖️', titleId: 'blogger.profiles.why2.title', titleDefault: 'Legal Issues Abroad', descId: 'blogger.profiles.why2.desc', descDefault: 'Traffic accidents, contracts, scams. Legal help in a foreign country = urgent.' },
                  { emoji: '🆘', titleId: 'blogger.profiles.why3.title', titleDefault: 'Practical Questions', descId: 'blogger.profiles.why3.desc', descDefault: 'Bank account, housing, local admin. Expat helpers share real experience.' },
                ].map((item, i) => (
                  <div key={i} className="text-center">
                    <div className="text-3xl mb-2">{item.emoji}</div>
                    <h4 className="font-semibold mb-1">
                      <FormattedMessage id={item.titleId} defaultMessage={item.titleDefault} />
                    </h4>
                    <p className="text-sm text-gray-400">
                      <FormattedMessage id={item.descId} defaultMessage={item.descDefault} />
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 4 - MONETIZE EXISTING BLOG + CALCULATOR
        ================================================================ */}
        <section className="section-content section-lazy" aria-labelledby="blogger-existing-title">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10 sm:mb-14">
              <h2 id="blogger-existing-title" className="text-2xl sm:text-4xl font-black mb-3">
                <FormattedMessage id="blogger.existing.title" defaultMessage="Monetize Your Existing Articles" />
              </h2>
              <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto">
                <FormattedMessage id="blogger.existing.subtitle" defaultMessage="You already have articles? Add our widgets to them and start earning immediately. It takes 30 seconds per article." />
              </p>
            </div>

            {/* 2 integration methods */}
            <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 mb-8">
              {/* Method 1: Sidebar */}
              <div className="bg-white/5 border border-amber-500/30 rounded-2xl p-5 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 bg-amber-400 text-black rounded-full flex items-center justify-center">
                    <Zap className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg">
                      <FormattedMessage id="blogger.existing.method1.title" defaultMessage="Sidebar / Theme" />
                    </h3>
                    <p className="text-xs sm:text-sm text-amber-400 font-semibold">
                      <FormattedMessage id="blogger.existing.method1.badge" defaultMessage="Recommended for large blogs" />
                    </p>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-gray-300">
                  {['blogger.existing.method1.point1', 'blogger.existing.method1.point2', 'blogger.existing.method1.point3'].map((id, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <FormattedMessage id={id} defaultMessage={['Add widget ONCE in your sidebar or theme', 'Appears on ALL pages automatically', 'Works with WordPress, Blogger, Wix, etc.'][i]} />
                    </li>
                  ))}
                </ul>
                <div className="mt-4 bg-white/5 rounded-xl p-3 flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-amber-400" aria-hidden="true" />
                  <span className="font-semibold">
                    <FormattedMessage id="blogger.existing.method1.time" defaultMessage="5 minutes, one time only" />
                  </span>
                </div>
              </div>

              {/* Method 2: Per article */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 bg-white/10 rounded-full flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white/80" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg">
                      <FormattedMessage id="blogger.existing.method2.title" defaultMessage="In specific articles" />
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500">
                      <FormattedMessage id="blogger.existing.method2.badge" defaultMessage="For targeted placement" />
                    </p>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-gray-300">
                  {['blogger.existing.method2.point1', 'blogger.existing.method2.point2', 'blogger.existing.method2.point3'].map((id, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <FormattedMessage id={id} defaultMessage={['Copy-paste widget in article content', 'Place at the best spot for conversion', 'Ideal for your top-performing articles'][i]} />
                    </li>
                  ))}
                </ul>
                <div className="mt-4 bg-white/5 rounded-xl p-3 flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-gray-500" aria-hidden="true" />
                  <span className="font-semibold">
                    <FormattedMessage id="blogger.existing.method2.time" defaultMessage="30 seconds per article" />
                  </span>
                </div>
              </div>
            </div>

            {/* Pro tip */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-8 max-w-2xl mx-auto text-center text-sm">
              <span className="font-bold text-amber-400">💡 <FormattedMessage id="blogger.existing.tip.label" defaultMessage="Pro tip:" /></span>{' '}
              <span className="text-gray-300">
                <FormattedMessage id="blogger.existing.tip.text" defaultMessage="Add the widget in your sidebar for all pages, PLUS inside your 10 best articles for maximum visibility." />
              </span>
            </div>

            {/* Calculator */}
            <div className="bg-white/5 border border-purple-500/30 rounded-2xl p-5 sm:p-8 max-w-2xl mx-auto">
              <h3 className="text-lg sm:text-xl font-bold text-center mb-6 flex items-center justify-center gap-2">
                <Calculator className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" aria-hidden="true" />
                <FormattedMessage id="blogger.existing.calculator.title" defaultMessage="Calculate Your Potential Earnings" />
              </h3>

              <div className="space-y-6">
                {/* Articles slider */}
                <div>
                  <label className="flex items-center justify-between text-sm font-medium mb-2">
                    <span className="text-gray-300">
                      <FormattedMessage id="blogger.existing.calculator.articles" defaultMessage="How many articles do you have?" />
                    </span>
                    <span className="text-purple-400 font-bold text-lg">{calcArticles}</span>
                  </label>
                  <input type="range" min="5" max="100" value={calcArticles} onChange={(e) => setCalcArticles(parseInt(e.target.value))} className="w-full h-3 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                  <div className="flex justify-between text-xs text-gray-500 mt-1"><span>5</span><span>50</span><span>100</span></div>
                </div>

                {/* Visits per article per day */}
                <div>
                  <label className="flex items-center justify-between text-sm font-medium mb-2">
                    <span className="text-gray-300">
                      <FormattedMessage id="blogger.existing.calculator.visits" defaultMessage="Average visits per article/day" />
                    </span>
                    <span className="text-purple-400 font-bold text-lg">{calcVisitsPerArticle}</span>
                  </label>
                  <input type="range" min="1" max="50" value={calcVisitsPerArticle} onChange={(e) => setCalcVisitsPerArticle(parseInt(e.target.value))} className="w-full h-3 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                  <div className="flex justify-between text-xs text-gray-500 mt-1"><span>1</span><span>25</span><span>50</span></div>
                </div>

                {/* Conversion rate */}
                <div>
                  <label className="flex items-center justify-between text-sm font-medium mb-2">
                    <span className="text-gray-300">
                      <FormattedMessage id="blogger.existing.calculator.conversion" defaultMessage="Conversion rate" />
                    </span>
                    <span className="text-purple-400 font-bold text-lg">{calcConversionRate}%</span>
                  </label>
                  <input type="range" min="0.5" max="3" step="0.5" value={calcConversionRate} onChange={(e) => setCalcConversionRate(parseFloat(e.target.value))} className="w-full h-3 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                  <div className="flex justify-between text-xs text-gray-500 mt-1"><span>0.5%</span><span>1.5%</span><span>3%</span></div>
                </div>

                {/* Results */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-5 sm:p-6 text-center">
                  <p className="text-sm opacity-90 mb-1">
                    <FormattedMessage id="blogger.existing.calculator.result" defaultMessage="Estimated monthly earnings" />
                  </p>
                  <p className="text-4xl sm:text-5xl font-black">${monthlyEarnings}</p>
                  <p className="text-sm opacity-80 mt-2">
                    {monthlyVisits.toLocaleString()} <FormattedMessage id="blogger.existing.calculator.visits.label" defaultMessage="visits" /> × {calcConversionRate}% = {monthlyClients} <FormattedMessage id="blogger.existing.calculator.clients" defaultMessage="clients" /> × $10
                  </p>
                </div>

                <p className="text-xs text-gray-500 text-center">
                  <FormattedMessage id="blogger.existing.calculator.disclaimer" defaultMessage="Results vary depending on your niche, traffic quality, and content relevance. These are estimates, not guarantees." />
                </p>
              </div>
            </div>

            {/* CTA */}
            <div className="text-center mt-8">
              <CTAButton onClick={goToRegister} ariaLabel={ctaAriaLabel}>
                <FormattedMessage id="blogger.existing.cta" defaultMessage="Start Monetizing My Articles" />
              </CTAButton>
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 5 - ARTICLE TOPICS + WIDGET HIGHLIGHT
        ================================================================ */}
        <section className="section-content section-lazy" aria-labelledby="blogger-topics-title">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10 sm:mb-14">
              <h2 id="blogger-topics-title" className="text-2xl sm:text-4xl font-black mb-3">
                <FormattedMessage id="blogger.topics.title" defaultMessage="What to Write About?" />
              </h2>
              <p className="text-base sm:text-lg text-gray-400">
                <FormattedMessage id="blogger.topics.subtitle" defaultMessage="Topics that work well for SOS-Expat referrals" />
              </p>
            </div>

            {/* Visa guides highlight */}
            <div className="bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/20 rounded-2xl p-5 sm:p-8 mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl sm:text-3xl">📋</span>
                </div>
                <div>
                  <h3 className="text-lg sm:text-2xl font-bold mb-1">
                    <FormattedMessage id="blogger.topics.visa.title" defaultMessage="Visa Guides = Best Performers" />
                  </h3>
                  <p className="text-sm sm:text-base text-gray-400">
                    <FormattedMessage id="blogger.topics.visa.desc" defaultMessage="Articles about visa requirements rank well on Google and convert best." />
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {['blogger.topics.ex1', 'blogger.topics.ex2', 'blogger.topics.ex3', 'blogger.topics.ex4'].map((id, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-center text-xs sm:text-sm text-gray-300">
                    <FormattedMessage id={id} defaultMessage={["'Spain Digital Nomad Visa'", "'UK Work Permit Guide'", "'How to Get a French Visa'", "'Dubai Residence Permit'"][i]} />
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs sm:text-sm text-gray-500 text-center">
                <FormattedMessage id="blogger.topics.tip" defaultMessage="Focus on long-tail keywords for better SEO rankings" />
              </p>
            </div>

            {/* Topic grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {articleTopics.map((topic, idx) => (
                <div
                  key={idx}
                  className={`rounded-2xl p-3 sm:p-4 text-center border transition-colors ${
                    topic.highlight
                      ? 'bg-purple-500/10 border-purple-500/30'
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="text-2xl sm:text-3xl mb-1 sm:mb-2">{topic.icon}</div>
                  <div className={`font-bold text-xs sm:text-sm ${topic.highlight ? 'text-purple-300' : 'text-white'}`}>{topic.name}</div>
                  <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5">{topic.desc}</div>
                  {topic.highlight && (
                    <div className="mt-1 text-[10px] sm:text-xs font-semibold text-purple-400">
                      <FormattedMessage id="blogger.topic.recommended" defaultMessage="Top performer!" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Example articles */}
            <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {[
                { emoji: '💻', typeId: 'blogger.example.nomad.type', typeDefault: 'Digital Nomad:', textId: 'blogger.example.nomad.text', textDefault: 'Spain Digital Nomad Visa 2026 Guide', earning: '$10/visa help call', colorClass: 'text-purple-400' },
                { emoji: '✈️', typeId: 'blogger.example.travel.type', typeDefault: 'Travel Blog:', textId: 'blogger.example.travel.text', textDefault: 'What to Do if You Lose Your Passport in Thailand', earning: '$10/emergency help', colorClass: 'text-blue-400' },
                { emoji: '📸', typeId: 'blogger.example.photo.type', typeDefault: 'Photo Blog:', textId: 'blogger.example.photo.text', textDefault: 'Photography Permits in Morocco: What You Need', earning: '$10/legal help', colorClass: 'text-pink-400' },
                { emoji: '🏖️', typeId: 'blogger.example.vacation.type', typeDefault: 'Vacation Blog:', textId: 'blogger.example.vacation.text', textDefault: 'Bali Tourist Visa: How to Extend Your Stay', earning: '$10/visa help', colorClass: 'text-orange-400' },
              ].map((ex, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4">
                  <div className="text-xl sm:text-2xl mb-2">{ex.emoji}</div>
                  <p className={`text-xs font-semibold ${ex.colorClass} mb-1`}>
                    <FormattedMessage id={ex.typeId} defaultMessage={ex.typeDefault} />
                  </p>
                  <p className="text-xs sm:text-sm text-gray-400 italic mb-2">
                    "<FormattedMessage id={ex.textId} defaultMessage={ex.textDefault} />"
                  </p>
                  <p className="text-xs text-green-400 font-bold">→ {ex.earning}</p>
                </div>
              ))}
            </div>

            {/* Widget highlight */}
            <div className="mt-8 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/30 rounded-2xl p-5 sm:p-8 relative overflow-hidden">
              <div className="absolute top-2 right-3 px-2.5 py-1 bg-amber-400 text-black rounded-full text-[10px] sm:text-xs font-black">NEW</div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Code className="w-8 h-8 sm:w-10 sm:h-10 text-purple-400" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl sm:text-2xl font-black mb-2">
                    <FormattedMessage id="blogger.resources.widgets.highlight.title" defaultMessage="Smart Widgets = Copy & Paste" />
                  </h3>
                  <p className="text-sm text-gray-300 mb-4">
                    <FormattedMessage id="blogger.resources.widgets.highlight.desc" defaultMessage="Pre-built buttons and banners with your affiliate link already integrated. Just copy the HTML code and paste it into your articles. Multiple sizes and styles available. Perfect tracking included!" />
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
                    {['blogger.resources.widgets.tag1', 'blogger.resources.widgets.tag2', 'blogger.resources.widgets.tag3', 'blogger.resources.widgets.tag4'].map((id, i) => (
                      <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-gray-300">
                        <FormattedMessage id={id} defaultMessage={['CTA Buttons', 'Banners 728x90', 'Sidebar 300x250', 'Mobile Optimized'][i]} />
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 6 - RESOURCES + EARNINGS
        ================================================================ */}
        <section className="section-content section-lazy" aria-labelledby="blogger-resources-title">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10 sm:mb-14">
              <h2 id="blogger-resources-title" className="text-2xl sm:text-4xl font-black mb-3">
                <FormattedMessage id="blogger.resources.title" defaultMessage="Resources Included Free" />
              </h2>
              <p className="text-base sm:text-lg text-gray-400">
                <FormattedMessage id="blogger.resources.subtitle" defaultMessage="Everything you need to promote professionally" />
              </p>
            </div>

            {/* Resources grid */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4 mb-10">
              {resources.map((resource, idx) => (
                <div key={idx} className={`rounded-2xl p-3 sm:p-4 text-center border ${resource.highlight ? 'bg-purple-500/10 border-purple-500/30' : 'bg-white/5 border-white/10'}`}>
                  <div className="text-2xl sm:text-3xl mb-1">{resource.icon}</div>
                  <div className="text-xs sm:text-sm font-medium">{resource.name}</div>
                </div>
              ))}
            </div>

            {/* 3 resource detail cards */}
            <div className="grid sm:grid-cols-3 gap-4 sm:gap-6 mb-10">
              {[
                { icon: <FileText className="w-6 h-6 text-purple-400" />, titleId: 'blogger.resources.templates.title', titleDefault: 'Article Templates', descId: 'blogger.resources.templates.desc', descDefault: 'Pre-written article structures you can customize. Just add your personal touch and publish.', borderClass: 'border-purple-500/20', bgClass: 'bg-purple-500/20' },
                { icon: <Copy className="w-6 h-6 text-blue-400" />, titleId: 'blogger.resources.texts.title', titleDefault: 'Ready-to-Copy Texts', descId: 'blogger.resources.texts.desc', descDefault: 'Promotional texts in 9 languages. Copy, paste, and you\'re done.', borderClass: 'border-blue-500/20', bgClass: 'bg-blue-500/20' },
                { icon: <Search className="w-6 h-6 text-green-400" />, titleId: 'blogger.resources.seo.title', titleDefault: 'SEO Guide', descId: 'blogger.resources.seo.desc', descDefault: 'Best practices to rank your articles on Google and drive organic traffic.', borderClass: 'border-green-500/20', bgClass: 'bg-green-500/20' },
              ].map((card, i) => (
                <div key={i} className={`bg-white/5 border ${card.borderClass} rounded-2xl p-5 sm:p-6`}>
                  <div className={`w-11 h-11 ${card.bgClass} rounded-xl flex items-center justify-center mb-3`} aria-hidden="true">
                    {card.icon}
                  </div>
                  <h3 className="text-base sm:text-lg font-bold mb-2">
                    <FormattedMessage id={card.titleId} defaultMessage={card.titleDefault} />
                  </h3>
                  <p className="text-sm text-gray-400">
                    <FormattedMessage id={card.descId} defaultMessage={card.descDefault} />
                  </p>
                </div>
              ))}
            </div>

            {/* Earnings overview */}
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-4xl font-black mb-3">
                <FormattedMessage id="blogger.earnings.title" defaultMessage="How Much Can You Earn?" />
              </h2>
            </div>

            {/* Main earning card */}
            <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-6 sm:p-10 text-center mb-6">
              <Phone className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 opacity-80" aria-hidden="true" />
              <div className="text-5xl sm:text-7xl font-black mb-2">$10</div>
              <p className="text-lg sm:text-xl opacity-90">
                <FormattedMessage id="blogger.earnings.perCall" defaultMessage="Per client call to a lawyer or expat helper" />
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3 text-sm">
                {['10 = $100', '50 = $500', '100 = $1000'].map((text, i) => (
                  <div key={i} className="bg-white/10 rounded-full px-4 py-2">{text.split('=')[0]} clients = ${text.split('$')[1]}</div>
                ))}
              </div>
            </div>

            {/* Bonus earnings */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-white/5 border border-purple-500/20 rounded-2xl p-5 sm:p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-purple-400" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-purple-400">$5</div>
                    <div className="text-xs sm:text-sm text-gray-400">
                      <FormattedMessage id="blogger.earnings.partner" defaultMessage="Per call to your lawyer/helper partners" />
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-400">
                  <FormattedMessage id="blogger.earnings.partner.desc" defaultMessage="Find a lawyer or expat helper to join SOS-Expat. Every time they receive a call, you earn $5 passively!" />
                </p>
              </div>
              <div className="bg-white/5 border border-green-500/20 rounded-2xl p-5 sm:p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <Search className="w-5 h-5 text-green-400" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-green-400">SEO</div>
                    <div className="text-xs sm:text-sm text-gray-400">
                      <FormattedMessage id="blogger.earnings.seo" defaultMessage="Long-term passive traffic" />
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-400">
                  <FormattedMessage id="blogger.earnings.seo.desc" defaultMessage="Your articles rank on Google and generate traffic for months or years. Write once, earn forever!" />
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 7 - RECRUIT PARTNERS (Network diagram)
        ================================================================ */}
        <section className="section-content section-lazy" aria-labelledby="blogger-passive-title">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10 sm:mb-14">
              <h2 id="blogger-passive-title" className="text-2xl sm:text-4xl font-black mb-3">
                <FormattedMessage id="blogger.passive.title" defaultMessage="Find Lawyer & Helper Partners" />
              </h2>
              <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto">
                <FormattedMessage id="blogger.passive.subtitle" defaultMessage="Know a lawyer or experienced expat? Help them join SOS-Expat and earn $5 every time they receive a call!" />
              </p>
            </div>

            {/* Network diagram */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-10 max-w-3xl mx-auto">
              <div className="flex flex-col items-center">
                {/* You */}
                <div className="flex flex-col items-center mb-5">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <Crown className="w-8 h-8 sm:w-10 sm:h-10 text-white" aria-hidden="true" />
                  </div>
                  <span className="mt-2 font-bold text-base sm:text-lg">
                    <FormattedMessage id="blogger.passive.you" defaultMessage="YOU" />
                  </span>
                  <span className="text-gray-400 text-xs sm:text-sm">
                    <FormattedMessage id="blogger.passive.you.earn" defaultMessage="$10/client + $5/call from partners" />
                  </span>
                </div>

                <div className="text-2xl sm:text-3xl mb-4 text-gray-500" aria-hidden="true">↓</div>

                {/* Partners */}
                <div className="flex justify-center gap-4 sm:gap-8 mb-6">
                  {[
                    { emoji: '⚖️', label: intl.formatMessage({ id: 'blogger.passive.lawyer', defaultMessage: 'Lawyer' }) },
                    { emoji: '🌍', label: intl.formatMessage({ id: 'blogger.passive.helper', defaultMessage: 'Helper' }) },
                    { emoji: '⚖️', label: intl.formatMessage({ id: 'blogger.passive.lawyer', defaultMessage: 'Lawyer' }) },
                  ].map((item, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/10 rounded-full flex items-center justify-center text-xl sm:text-2xl">{item.emoji}</div>
                      <span className="mt-1 text-xs sm:text-sm font-medium">{item.label}</span>
                      <span className="text-xs text-green-400">+$5/call</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Example */}
              <div className="mt-6 bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                <p className="font-semibold mb-1 text-sm sm:text-base">
                  <FormattedMessage id="blogger.passive.example" defaultMessage="Example: 3 lawyer partners, 20 calls/month each" />
                </p>
                <p className="text-xl sm:text-2xl font-black text-green-400">
                  = $300/month <FormattedMessage id="blogger.passive.passive" defaultMessage="passive income!" />
                </p>
              </div>
            </div>

            {/* Payment methods */}
            <div className="mt-10 text-center">
              <h3 className="text-lg sm:text-xl font-bold mb-5">
                <FormattedMessage id="blogger.payment.title" defaultMessage="Get Paid Your Way" />
              </h3>
              <div className="flex flex-wrap justify-center gap-3">
                {paymentMethods.map((method, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2">
                    <span className="text-lg">{method.icon}</span>
                    <span className="font-medium text-sm">{method.name}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs sm:text-sm text-gray-500">
                <FormattedMessage id="blogger.payment.note" defaultMessage="Minimum $50 • Processed in 48h" />
              </p>
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 8 - FAQ (accessible accordion)
        ================================================================ */}
        <section className="section-content section-lazy" aria-labelledby="blogger-faq-title">
          <div className="max-w-3xl mx-auto">
            <h2 id="blogger-faq-title" className="text-2xl sm:text-4xl font-black text-center mb-8 sm:mb-10">
              <FormattedMessage id="blogger.faq.title" defaultMessage="Questions?" />
            </h2>
            <div className="space-y-3" itemScope itemType="https://schema.org/FAQPage">
              {faqs.map((faq, idx) => (
                <FAQItem
                  key={idx}
                  question={faq.question}
                  answer={faq.answer}
                  isOpen={openFaq === idx}
                  onToggle={() => setOpenFaq(openFaq === idx ? null : idx)}
                  index={idx}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 9 - FINAL CTA
        ================================================================ */}
        <section className="section-content" aria-label="Call to action">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl sm:text-4xl font-black mb-4 sm:mb-6">
              <FormattedMessage id="blogger.final.title" defaultMessage="Ready to Monetize Your Blog?" />
            </h2>
            <p className="text-base sm:text-lg text-gray-400 mb-6 sm:mb-8">
              <FormattedMessage id="blogger.final.subtitle" defaultMessage="It's free, resources included, start earning today." />
            </p>

            {/* Recap pills */}
            <div className="flex flex-wrap justify-center gap-3 mb-6 sm:mb-8">
              {[
                { id: 'blogger.final.trust.1', defaultMessage: '100% Free' },
                { id: 'blogger.final.trust.2', defaultMessage: 'Resources Included' },
                { id: 'blogger.final.trust.3', defaultMessage: 'SEO Guide' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm">
                  <Check className="w-4 h-4 text-green-400" aria-hidden="true" />
                  <FormattedMessage id={item.id} defaultMessage={item.defaultMessage} />
                </div>
              ))}
            </div>

            <CTAButton onClick={goToRegister} size="large" className="animate-pulse-glow mx-auto" ariaLabel={ctaAriaLabel}>
              <FormattedMessage id="blogger.final.cta" defaultMessage="Become a Blogger Partner Now" />
            </CTAButton>
          </div>
        </section>

        {/* ================================================================
            STICKY CTA (mobile only)
        ================================================================ */}
        <div
          className={`fixed bottom-0 left-0 right-0 z-50 lg:hidden transition-all duration-300 ${showStickyCTA ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="bg-black/90 backdrop-blur-md border-t border-white/10 px-4 py-3">
            <CTAButton onClick={goToRegister} className="w-full" ariaLabel={ctaAriaLabel}>
              <FormattedMessage id="blogger.hero.cta" defaultMessage="Become a Blogger Partner - It's Free" />
            </CTAButton>
          </div>
        </div>

      </div>
    </Layout>
  );
};

export default BloggerLanding;
