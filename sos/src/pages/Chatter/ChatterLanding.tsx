/**
 * ChatterLanding - Landing Page Chatter
 *
 * V7: Full i18n + SEO perfection + Mobile-first performance
 * - All text via FormattedMessage (9 languages)
 * - Schema.org FAQPage + WebApplication + BreadcrumbList JSON-LD
 * - i18n meta tags (title, description, OG, keywords, aiSummary)
 * - content-visibility: auto for below-fold perf
 * - 44px+ touch targets, safe-area, prefers-reduced-motion
 * - Semantic HTML5 (main, article, section, nav)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocaleNavigate } from '@/multilingual-system';
import { getTranslatedRouteSlug, type RouteKey } from '@/multilingual-system/core/routing/localeRoutes';
import { useApp } from '@/contexts/AppContext';
import Layout from '@/components/layout/Layout';
import SEOHead from '@/components/layout/SEOHead';
import HreflangLinks from '@/multilingual-system/components/HrefLang/HreflangLinks';
import {
  ArrowRight,
  Check,
  Users,
  ChevronDown,
  Infinity,
  Plus,
  Minus,
} from 'lucide-react';

// ============================================================================
// STYLES - Mobile-first with performance hints
// ============================================================================
const globalStyles = `
  /* Animations */
  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 20px rgba(251, 191, 36, 0.4); }
    50% { box-shadow: 0 0 40px rgba(251, 191, 36, 0.6); }
  }
  .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }

  .section-content {
    padding: 3rem 1rem;
    position: relative;
  }
  @media (min-width: 640px) {
    .section-content { padding: 4rem 1.5rem; }
  }
  @media (min-width: 1024px) {
    .section-content { padding: 6rem 2rem; }
  }
  /* Below-fold sections: paint only when near viewport */
  .section-lazy {
    content-visibility: auto;
    contain-intrinsic-size: auto 600px;
  }
  @media (prefers-reduced-motion: reduce) {
    .animate-bounce, .transition-all { animation: none !important; transition: none !important; }
  }
`;

// ============================================================================
// COMPOSANTS
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

// FAQ Accordion Item - accessible with aria-controls
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

const BASE_URL = 'https://sos-expat.com';

// Hreflang mapping: lang code → locale prefix + route slug + OG locale
const HREFLANG_MAP = [
  { lang: 'fr', locale: 'fr-fr', slug: 'devenir-chatter', ogLocale: 'fr_FR' },
  { lang: 'en', locale: 'en-us', slug: 'become-chatter', ogLocale: 'en_US' },
  { lang: 'es', locale: 'es-es', slug: 'ser-chatter', ogLocale: 'es_ES' },
  { lang: 'de', locale: 'de-de', slug: 'chatter-werden', ogLocale: 'de_DE' },
  { lang: 'ru', locale: 'ru-ru', slug: 'stat-chatterom', ogLocale: 'ru_RU' },
  { lang: 'pt', locale: 'pt-pt', slug: 'tornar-se-chatter', ogLocale: 'pt_PT' },
  { lang: 'zh', locale: 'zh-cn', slug: 'chengwei-chatter', ogLocale: 'zh_CN' },
  { lang: 'hi', locale: 'hi-in', slug: 'chatter-bane', ogLocale: 'hi_IN' },
  { lang: 'ar', locale: 'ar-sa', slug: '%D9%83%D9%86-%D9%85%D8%B3%D9%88%D9%82%D8%A7', ogLocale: 'ar_SA' },
] as const;

const ChatterLanding: React.FC = () => {
  const navigate = useLocaleNavigate();
  const intl = useIntl();
  const location = useLocation();
  const { language } = useApp();
  const langCode = (language || 'fr') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';

  const [showStickyCTA, setShowStickyCTA] = useState(false);
  const [teamSize, setTeamSize] = useState(10);
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  // SEO: canonical URL + hrefLang
  const htmlLang = langCode === 'ch' ? 'zh' : langCode;
  const currentHreflang = HREFLANG_MAP.find(h => h.lang === htmlLang) || HREFLANG_MAP[0];
  const canonicalUrl = `${BASE_URL}/${currentHreflang.locale}/${currentHreflang.slug}`;

  // FAQ data
  const faqItems = [
    { q: 'chatter.faq.q1', a: 'chatter.faq.a1' },
    { q: 'chatter.faq.q2', a: 'chatter.faq.a2' },
    { q: 'chatter.faq.q3', a: 'chatter.faq.a3' },
    { q: 'chatter.faq.q4', a: 'chatter.faq.a4' },
    { q: 'chatter.faq.q5', a: 'chatter.faq.a5' },
    { q: 'chatter.faq.q6', a: 'chatter.faq.a6' },
    { q: 'chatter.faq.q7', a: 'chatter.faq.a7' },
    { q: 'chatter.faq.quiz', a: 'chatter.faq.quiz.answer' },
  ];

  // Schema.org FAQPage JSON-LD (Google Snippet 0)
  const faqJsonLd = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(item => ({
      '@type': 'Question',
      name: intl.formatMessage({ id: item.q }),
      acceptedAnswer: {
        '@type': 'Answer',
        text: intl.formatMessage({ id: item.a }),
      },
    })),
  }), [intl]);

  // Schema.org WebApplication JSON-LD (AIO referencing + E-E-A-T)
  const webAppJsonLd = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'SOS-Expat Chatter',
    url: canonicalUrl,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'All',
    inLanguage: htmlLang,
    availableLanguage: ['fr', 'en', 'es', 'de', 'ru', 'pt', 'zh', 'hi', 'ar'],
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
    publisher: {
      '@type': 'Organization',
      name: 'SOS-Expat',
      url: 'https://www.sos-expat.com',
      logo: `${BASE_URL}/og-image.png`,
    },
    description: intl.formatMessage({ id: 'chatter.landing.seo.description' }),
  }), [intl, canonicalUrl, htmlLang]);

  // Schema.org Organization JSON-LD (E-E-A-T for AEO)
  const organizationJsonLd = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'SOS-Expat',
    url: 'https://www.sos-expat.com',
    logo: `${BASE_URL}/og-image.png`,
    sameAs: [],
    description: intl.formatMessage({ id: 'chatter.landing.seo.description' }),
  }), [intl]);

  // Schema.org BreadcrumbList JSON-LD
  const breadcrumbJsonLd = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'SOS-Expat', item: 'https://www.sos-expat.com' },
      { '@type': 'ListItem', position: 2, name: intl.formatMessage({ id: 'chatter.landing.seo.title' }), item: canonicalUrl },
    ],
  }), [intl, canonicalUrl]);

  const registerRoute = `/${getTranslatedRouteSlug('chatter-register' as RouteKey, langCode)}`;
  const goToRegister = () => navigate(registerRoute);

  const ctaAriaLabel = intl.formatMessage({ id: 'chatter.aria.cta.main', defaultMessage: 'Start earning money now - Register as a Chatter for free' });

  useEffect(() => {
    const onScroll = () => setShowStickyCTA(window.scrollY > window.innerHeight * 0.8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const teamEarnings = teamSize * 10;

  // SEO titles
  const seoTitle = intl.formatMessage({ id: 'chatter.landing.seo.title' });
  const seoDescription = intl.formatMessage({ id: 'chatter.landing.seo.description' });

  return (
    <Layout showFooter={false}>
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        ogImage="/og-chatter-2026.jpg"
        ogType="website"
        contentType="LandingPage"
      />
      <HreflangLinks pathname={location.pathname} />

      {/* Custom styles */}
      <style>{globalStyles}</style>

      {/* Structured Data (4 JSON-LD blocks) */}
      <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      <script type="application/ld+json">{JSON.stringify(webAppJsonLd)}</script>
      <script type="application/ld+json">{JSON.stringify(organizationJsonLd)}</script>
      <script type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</script>

      <div className="chatter-landing bg-black text-white">

        {/* ================================================================
            HERO - MOBILE-FIRST
        ================================================================ */}
        <section className="min-h-[100svh] flex flex-col justify-center items-center relative bg-gradient-to-b from-red-950 via-red-900 to-black overflow-hidden" aria-label={intl.formatMessage({ id: 'chatter.landing.seo.ogTitle', defaultMessage: 'Become a Chatter' })}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(251,191,36,0.15),transparent_50%)]" aria-hidden="true" />

          <div className="relative z-10 text-center px-4 sm:px-6 max-w-5xl mx-auto">

            <h1 className="text-4xl sm:text-4xl lg:text-5xl xl:text-6xl font-black leading-[1.1] mb-3 sm:mb-6">
              <span className="text-white"><FormattedMessage id="chatter.landing.hero.desktop.line1" defaultMessage="Gagnez de l'argent" /></span>
              <br />
              <span className="text-white"><FormattedMessage id="chatter.landing.hero.desktop.line2" defaultMessage="en aidant les " /></span>
              <span className="text-amber-400"><FormattedMessage id="chatter.landing.hero.desktop.highlight" defaultMessage="voyageurs" /></span>
            </h1>

            <p className="text-2xl sm:text-2xl lg:text-3xl text-white font-bold mb-2 sm:mb-4">
              <span className="text-amber-400">10$</span> <FormattedMessage id="chatter.landing.hero.desktop.perCall" defaultMessage="pour vous à chaque appel" />
            </p>

            <p className="text-base sm:text-lg lg:text-xl text-gray-300 mb-5 sm:mb-10 max-w-2xl mx-auto leading-relaxed">
              <FormattedMessage id="chatter.landing.hero.desktop.desc" defaultMessage="Partagez votre lien aux expatriés qui ont besoin d'aide juridique. Quand ils appellent, vous gagnez." />
            </p>

            <CTAButton onClick={goToRegister} size="large" className="w-full sm:w-auto max-w-md mx-auto" ariaLabel={ctaAriaLabel}>
              <FormattedMessage id="chatter.landing.cta.start" defaultMessage="Commencer gratuitement" />
            </CTAButton>

            <p className="text-gray-400 mt-4 sm:mt-6 text-sm sm:text-base">
              <FormattedMessage id="chatter.landing.reassurance" defaultMessage="100% gratuit • Aucun investissement • 197 pays" />
            </p>
          </div>

          <ScrollIndicator label={intl.formatMessage({ id: 'chatter.landing.scroll', defaultMessage: 'Découvrir' })} />
        </section>

        {/* ================================================================
            SECTION 2 - 3 SOURCES DE REVENUS
        ================================================================ */}
        <section className="section-content section-lazy bg-gradient-to-b from-black to-gray-950" aria-labelledby="section-revenue">
          <div className="max-w-7xl mx-auto">

            <h2 id="section-revenue" className="text-3xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-center text-white mb-3 sm:mb-4">
              <span className="text-amber-400"><FormattedMessage id="chatter.landing.revenue.title.highlight" defaultMessage="3 façons" /></span>{' '}
              <FormattedMessage id="chatter.landing.revenue.title" defaultMessage="de gagner" />
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-300 text-center mb-10 sm:mb-12 lg:mb-16">
              <FormattedMessage id="chatter.landing.revenue.subtitle" defaultMessage="Cumulez vos revenus. Sans limite." />
            </p>

            <div className="grid lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">

              {/* Source 1 */}
              <article className="bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/40 rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-8">
                <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-amber-500 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-5 lg:mb-6" aria-hidden="true">
                  <span className="text-xl sm:text-2xl lg:text-3xl font-black text-black">1</span>
                </div>
                <h3 className="text-2xl sm:text-2xl lg:text-3xl font-bold text-white mb-3 sm:mb-4">
                  <FormattedMessage id="chatter.landing.source1.title" defaultMessage="Scrollez, aidez, gagnez" />
                </h3>
                <p className="text-base sm:text-lg lg:text-xl text-gray-200 mb-4 sm:mb-5 lg:mb-6">
                  <FormattedMessage id="chatter.landing.source1.desc" defaultMessage="Parcourez les groupes Facebook et forums. Aidez ceux qui ont besoin en partageant votre lien." />
                </p>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-amber-400">
                  10$ / <FormattedMessage id="chatter.landing.perCall" defaultMessage="appel" />
                </div>
              </article>

              {/* Source 2 */}
              <article className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-500/40 rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-8">
                <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-green-500 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-5 lg:mb-6" aria-hidden="true">
                  <span className="text-xl sm:text-2xl lg:text-3xl font-black text-black">2</span>
                </div>
                <h3 className="text-2xl sm:text-2xl lg:text-3xl font-bold text-white mb-3 sm:mb-4">
                  <FormattedMessage id="chatter.landing.source2.title" defaultMessage="Recrutez des chatters" />
                </h3>
                <p className="text-base sm:text-lg lg:text-xl text-gray-200 mb-4 sm:mb-5 lg:mb-6">
                  <FormattedMessage id="chatter.landing.source2.desc" defaultMessage="Créez une équipe ILLIMITÉE. Sur chaque appel de vos recrues :" />
                </p>
                <div className="space-y-1 sm:space-y-2">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-400">
                    +1$ <FormattedMessage id="chatter.landing.source2.level1" defaultMessage="niveau 1" />
                  </div>
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-cyan-400">
                    +0,50$ <FormattedMessage id="chatter.landing.source2.level2" defaultMessage="niveau 2" />
                  </div>
                </div>
              </article>

              {/* Source 3 */}
              <article className="bg-gradient-to-br from-purple-500/20 to-violet-500/10 border border-purple-500/40 rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-8">
                <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-purple-500 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-5 lg:mb-6" aria-hidden="true">
                  <span className="text-xl sm:text-2xl lg:text-3xl font-black text-white">3</span>
                </div>
                <h3 className="text-2xl sm:text-2xl lg:text-3xl font-bold text-white mb-3 sm:mb-4">
                  <FormattedMessage id="chatter.landing.source3.title" defaultMessage="Trouvez des partenaires" />
                </h3>
                <p className="text-base sm:text-lg lg:text-xl text-gray-200 mb-4 sm:mb-5 lg:mb-6">
                  <FormattedMessage id="chatter.landing.source3.desc" defaultMessage="Invitez des avocats ou expatriés aidants avec votre lien spécial." />
                </p>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-purple-400 mb-2">
                  5$ / <FormattedMessage id="chatter.landing.perCall" defaultMessage="appel" />
                </div>
                <p className="text-sm sm:text-base lg:text-lg text-gray-300">
                  <FormattedMessage id="chatter.landing.source3.info" defaultMessage="Un avocat reçoit 8 à 60 appels/mois" />
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 3 - PREUVE SOCIALE
        ================================================================ */}
        <section className="section-content section-lazy bg-gray-950" aria-labelledby="section-proof">
          <div className="max-w-7xl mx-auto">

            <h2 id="section-proof" className="text-3xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-center text-white mb-3 sm:mb-4">
              <FormattedMessage id="chatter.landing.proof.title" defaultMessage="Ils gagnent" />{' '}
              <span className="text-green-400"><FormattedMessage id="chatter.landing.proof.highlight" defaultMessage="vraiment" /></span>
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-400 text-center mb-10 sm:mb-12 lg:mb-16">
              <FormattedMessage id="chatter.landing.proof.subtitle" defaultMessage="Chatters vérifiés ce mois" />
            </p>

            {/* Podium */}
            <div className="flex items-end justify-center gap-2 sm:gap-4 lg:gap-8 mb-10 sm:mb-12 lg:mb-16" role="list" aria-label={intl.formatMessage({ id: 'chatter.landing.proof.podium', defaultMessage: 'Top earners' })}>
              {/* 2nd */}
              <div className="flex flex-col items-center" role="listitem">
                <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-gray-400 rounded-full flex items-center justify-center text-2xl sm:text-3xl lg:text-4xl mb-2 sm:mb-3" aria-hidden="true">🥈</div>
                <div className="bg-gradient-to-t from-gray-500/20 to-gray-400/10 border border-gray-400/40 rounded-t-xl sm:rounded-t-2xl px-3 sm:px-6 lg:px-10 pt-4 sm:pt-6 pb-5 sm:pb-8 text-center">
                  <p className="text-white font-bold text-sm sm:text-base lg:text-xl">Fatou S.</p>
                  <p className="text-xl sm:text-2xl lg:text-4xl font-black text-gray-300">3 850$</p>
                </div>
              </div>
              {/* 1st */}
              <div className="flex flex-col items-center -mb-4 sm:-mb-6" role="listitem">
                <div className="w-14 h-14 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-amber-500 rounded-full flex items-center justify-center text-3xl sm:text-4xl lg:text-5xl mb-2 sm:mb-3" aria-hidden="true">🥇</div>
                <div className="bg-gradient-to-t from-amber-500/20 to-yellow-400/10 border-2 border-amber-500/50 rounded-t-xl sm:rounded-t-2xl px-4 sm:px-8 lg:px-14 pt-5 sm:pt-8 pb-6 sm:pb-10 text-center">
                  <p className="text-white font-bold text-base sm:text-lg lg:text-2xl">Marie L.</p>
                  <p className="text-2xl sm:text-3xl lg:text-5xl font-black text-amber-400">5 300$</p>
                  <p className="text-xs sm:text-sm lg:text-base text-gray-400 mt-1">TOP EARNER</p>
                </div>
              </div>
              {/* 3rd */}
              <div className="flex flex-col items-center" role="listitem">
                <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-orange-700 rounded-full flex items-center justify-center text-2xl sm:text-3xl lg:text-4xl mb-2 sm:mb-3" aria-hidden="true">🥉</div>
                <div className="bg-gradient-to-t from-orange-700/20 to-orange-600/10 border border-orange-600/40 rounded-t-xl sm:rounded-t-2xl px-3 sm:px-6 lg:px-10 pt-4 sm:pt-6 pb-5 sm:pb-8 text-center">
                  <p className="text-white font-bold text-sm sm:text-base lg:text-xl">Kwame O.</p>
                  <p className="text-xl sm:text-2xl lg:text-4xl font-black text-orange-400">2 940$</p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 sm:gap-6 max-w-sm sm:max-w-lg mx-auto">
              <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white">1 200+</div>
                <div className="text-sm sm:text-base lg:text-lg text-gray-400 mt-1 sm:mt-2">
                  <FormattedMessage id="chatter.landing.stats.chatters" defaultMessage="Chatters actifs" />
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white">197</div>
                <div className="text-sm sm:text-base lg:text-lg text-gray-400 mt-1 sm:mt-2">
                  <FormattedMessage id="chatter.landing.stats.countries" defaultMessage="Pays" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 4 - AGENCE
        ================================================================ */}
        <section className="section-content section-lazy bg-gradient-to-b from-gray-950 via-green-950/20 to-gray-950" aria-labelledby="section-agency">
          <div className="max-w-7xl mx-auto">

            <div className="text-center mb-8 sm:mb-10 lg:mb-12">
              <span className="inline-block bg-green-500/20 text-green-400 px-4 sm:px-6 py-1.5 sm:py-2 rounded-full text-sm sm:text-base lg:text-lg font-bold border border-green-500/30 mb-4 sm:mb-6">
                <FormattedMessage id="chatter.landing.agency.badge" defaultMessage="🏢 Modèle Agence" />
              </span>
              <h2 id="section-agency" className="text-3xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-white mb-3 sm:mb-4">
                <FormattedMessage id="chatter.landing.agency.title" defaultMessage="De chatter solo à" />{' '}
                <span className="text-green-400"><FormattedMessage id="chatter.landing.agency.highlight" defaultMessage="agence" /></span>
              </h2>
              <p className="text-base sm:text-lg lg:text-xl text-gray-400">
                <FormattedMessage id="chatter.landing.agency.subtitle" defaultMessage="Recrutez des chatters. Gagnez sur leur activité. Sans limite." />
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-10 max-w-5xl mx-auto">
              {/* Structure */}
              <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-8">
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-5 sm:mb-6 lg:mb-8">
                  <FormattedMessage id="chatter.landing.agency.structure" defaultMessage="Structure de votre agence" />
                </h3>
                <div className="space-y-4 sm:space-y-5 lg:space-y-6">
                  <div className="flex items-center gap-3 sm:gap-4 lg:gap-5">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0" aria-hidden="true">
                      <span className="text-xs sm:text-sm font-black text-black">BOSS</span>
                    </div>
                    <div>
                      <div className="text-base sm:text-lg lg:text-xl text-white font-bold">
                        <FormattedMessage id="chatter.landing.agency.you" defaultMessage="Vous = Le directeur" />
                      </div>
                      <div className="text-lg sm:text-xl lg:text-2xl font-bold text-amber-400">
                        10$ / <FormattedMessage id="chatter.landing.agency.persoCall" defaultMessage="appel perso" />
                      </div>
                    </div>
                  </div>

                  <div className="border-l-2 border-dashed border-green-500/50 ml-6 sm:ml-7 lg:ml-8 h-6 sm:h-8" aria-hidden="true" />

                  <div className="flex items-center gap-3 sm:gap-4 lg:gap-5 ml-2 sm:ml-3 lg:ml-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0" aria-hidden="true">
                      <Users className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
                    </div>
                    <div>
                      <div className="text-sm sm:text-base lg:text-lg text-white">
                        <FormattedMessage id="chatter.landing.agency.team" defaultMessage="Votre équipe" />{' '}
                        <span className="text-green-400 font-bold">(<FormattedMessage id="chatter.landing.unlimited" defaultMessage="illimitée" />)</span>
                      </div>
                      <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-400">
                        +1$ <FormattedMessage id="chatter.landing.agency.perCall" defaultMessage="sur chaque appel" />
                      </div>
                    </div>
                  </div>

                  <div className="border-l-2 border-dashed border-cyan-500/50 ml-6 sm:ml-7 lg:ml-8 h-6 sm:h-8" aria-hidden="true" />

                  <div className="flex items-center gap-3 sm:gap-4 lg:gap-5 ml-4 sm:ml-6 lg:ml-8">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-cyan-600 rounded-full flex items-center justify-center flex-shrink-0" aria-hidden="true">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
                    </div>
                    <div>
                      <div className="text-sm sm:text-base lg:text-lg text-white">
                        <FormattedMessage id="chatter.landing.agency.recruits" defaultMessage="Leurs recrues" />{' '}
                        <span className="text-cyan-400 font-bold">(<FormattedMessage id="chatter.landing.unlimited" defaultMessage="illimitées" />)</span>
                      </div>
                      <div className="text-lg sm:text-xl lg:text-2xl font-bold text-cyan-400">
                        +0,50$ <FormattedMessage id="chatter.landing.agency.perCall" defaultMessage="sur chaque appel" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Calculator */}
              <div className="bg-gradient-to-br from-green-500/15 to-emerald-500/10 border border-green-500/40 rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-8">
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-5 sm:mb-6 lg:mb-8">
                  <FormattedMessage id="chatter.landing.calc.title" defaultMessage="Calculez vos revenus passifs" />
                </h3>
                <label htmlFor="team-slider" className="text-base sm:text-lg lg:text-xl text-gray-300 block mb-4 sm:mb-5 lg:mb-6">
                  <FormattedMessage
                    id="chatter.landing.calc.label"
                    defaultMessage="Votre agence avec {count} chatters :"
                    values={{ count: <span className="text-green-400 font-bold">{teamSize}</span> }}
                  />
                </label>
                <input
                  id="team-slider"
                  type="range"
                  min="1"
                  max="50"
                  value={teamSize}
                  onChange={(e) => setTeamSize(Number(e.target.value))}
                  aria-valuemin={1}
                  aria-valuemax={50}
                  aria-valuenow={teamSize}
                  aria-label={intl.formatMessage({ id: 'chatter.landing.calc.sliderLabel', defaultMessage: 'Team size' })}
                  className="w-full h-2 sm:h-3 bg-white/10 rounded-full appearance-none cursor-pointer mb-6 sm:mb-8
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:h-7
                    sm:[&::-webkit-slider-thumb]:w-8 sm:[&::-webkit-slider-thumb]:h-8
                    [&::-webkit-slider-thumb]:bg-green-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                    [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-green-500/40"
                />
                <div className="text-center">
                  <p className="text-base sm:text-lg lg:text-xl text-gray-400 mb-2 sm:mb-3">
                    <FormattedMessage id="chatter.landing.calc.passive" defaultMessage="Revenus passifs mensuels" />
                  </p>
                  <p className="text-4xl sm:text-5xl lg:text-6xl font-black text-green-400" aria-live="polite">
                    +{teamEarnings}$
                  </p>
                  <p className="text-sm sm:text-base lg:text-lg text-gray-400 mt-3 sm:mt-4 flex items-center justify-center gap-2">
                    <Infinity className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
                    <FormattedMessage id="chatter.landing.calc.forever" defaultMessage="À vie. Tant que votre agence tourne." />
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 5 - ZÉRO RISQUE
        ================================================================ */}
        <section className="section-content section-lazy bg-gray-950" aria-labelledby="section-risk">
          <div className="max-w-7xl mx-auto">

            <h2 id="section-risk" className="text-3xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-center text-white mb-8 sm:mb-12 lg:mb-16">
              <FormattedMessage id="chatter.landing.risk.title" defaultMessage="Zéro risque." />{' '}
              <span className="text-green-400"><FormattedMessage id="chatter.landing.risk.highlight" defaultMessage="Zéro limite." /></span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 mb-8 sm:mb-10 lg:mb-12">
              {[
                { emoji: '🌍', titleKey: 'chatter.landing.risk.countries', descKey: 'chatter.landing.risk.countries.desc', color: 'text-blue-400' },
                { emoji: '🗣️', titleKey: 'chatter.landing.risk.languages', descKey: 'chatter.landing.risk.languages.desc', color: 'text-purple-400' },
                { emoji: '💸', titleKey: 'chatter.landing.risk.free', descKey: 'chatter.landing.risk.free.desc', color: 'text-green-400' },
                { emoji: '📱', titleKey: 'chatter.landing.risk.phone', descKey: 'chatter.landing.risk.phone.desc', color: 'text-amber-400' },
                { emoji: '⏰', titleKey: 'chatter.landing.risk.noCommit', descKey: 'chatter.landing.risk.noCommit.desc', color: 'text-red-400' },
              ].map((item, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 text-center">
                  <span className="text-3xl sm:text-4xl lg:text-5xl mb-2 sm:mb-3 lg:mb-4 block" aria-hidden="true">{item.emoji}</span>
                  <div className={`font-bold text-sm sm:text-base lg:text-xl ${item.color} mb-0.5 sm:mb-1`}>
                    <FormattedMessage id={item.titleKey} />
                  </div>
                  <div className="text-gray-400 text-xs sm:text-sm lg:text-base">
                    <FormattedMessage id={item.descKey} />
                  </div>
                </div>
              ))}
            </div>

            {/* Payments */}
            <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-8 text-center max-w-3xl mx-auto">
              <p className="text-base sm:text-lg lg:text-xl text-gray-300 mb-4 sm:mb-5 lg:mb-6">
                <FormattedMessage id="chatter.landing.payment.info" defaultMessage="Retrait dès 25$ • Reçu en 48h" />
              </p>
              <div className="flex flex-wrap justify-center gap-2 sm:gap-3 lg:gap-4">
                {['🌐 Wise', '🟠 Orange Money', '🌊 Wave', '💚 M-Pesa', '🏦 Virement'].map((m, i) => (
                  <span key={i} className="bg-white/10 text-white rounded-full px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 lg:py-3 text-sm sm:text-base lg:text-lg font-medium">{m}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 6 - FAQ (Google Snippet 0 + Microdata)
        ================================================================ */}
        <section className="section-content section-lazy bg-gradient-to-b from-gray-950 to-gray-950" id="faq" aria-labelledby="section-faq" itemScope itemType="https://schema.org/FAQPage">
          <div className="max-w-3xl mx-auto">
            <h2 id="section-faq" className="text-3xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-center text-white mb-3 sm:mb-4">
              <FormattedMessage id="chatter.faq.title" defaultMessage="Questions ?" />
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-400 text-center mb-8 sm:mb-10 lg:mb-12">
              <FormattedMessage id="chatter.faq.subtitle" defaultMessage="Everything you need to know before getting started" />
            </p>

            <div className="space-y-3 sm:space-y-4">
              {faqItems.map((item, i) => (
                <FAQItem
                  key={i}
                  index={i}
                  question={<FormattedMessage id={item.q} />}
                  answer={<FormattedMessage id={item.a} />}
                  isOpen={openFAQ === i}
                  onToggle={() => setOpenFAQ(openFAQ === i ? null : i)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 7 - CTA FINAL
        ================================================================ */}
        <section className="section-content bg-gradient-to-b from-gray-950 via-red-950/20 to-black relative" aria-labelledby="section-cta-final">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(251,191,36,0.06),transparent_50%)]" aria-hidden="true" />

          <div className="relative z-10 max-w-4xl mx-auto text-center">

            <p className="text-base sm:text-lg lg:text-xl text-gray-300 mb-4 sm:mb-5 lg:mb-6">
              <FormattedMessage id="chatter.landing.cta.join" defaultMessage="Rejoignez 1 200+ chatters dans 197 pays" />
            </p>

            <h2 id="section-cta-final" className="text-2xl sm:text-4xl lg:text-5xl xl:text-6xl font-black text-white mb-6 sm:mb-8">
              <FormattedMessage id="chatter.landing.cta.title" defaultMessage="Commencez à gagner" />
              <br />
              <span className="text-amber-400"><FormattedMessage id="chatter.landing.cta.highlight" defaultMessage="aujourd'hui" /></span>
            </h2>

            {/* Recap */}
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 lg:gap-4 mb-8 sm:mb-10">
              {[
                'chatter.landing.recap.revenue',
                'chatter.landing.recap.team',
                'chatter.landing.recap.countries',
                'chatter.landing.recap.free',
              ].map((key, i) => (
                <span key={i} className="flex items-center gap-1.5 sm:gap-2 bg-amber-500/15 border border-amber-500/40 text-white rounded-full px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 lg:py-3 text-sm sm:text-base lg:text-lg font-medium">
                  <Check className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" aria-hidden="true" />
                  <FormattedMessage id={key} />
                </span>
              ))}
            </div>

            <CTAButton onClick={goToRegister} size="large" className="w-full max-w-sm sm:max-w-md mx-auto" ariaLabel={ctaAriaLabel}>
              <FormattedMessage id="chatter.landing.cta.final" defaultMessage="Devenir Chatter maintenant" />
            </CTAButton>

            <p className="text-gray-500 mt-5 sm:mt-6 text-sm sm:text-base lg:text-lg">
              <FormattedMessage id="chatter.landing.cta.footer" defaultMessage="Inscription gratuite • Démarrez en 5 minutes" />
            </p>
          </div>
        </section>

        {/* ================================================================
            STICKY CTA MOBILE
        ================================================================ */}
        {showStickyCTA && (
          <div
            className="fixed bottom-0 left-0 right-0 z-40 lg:hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            role="complementary"
            aria-label="CTA"
          >
            <div className="bg-black/95 backdrop-blur-md border-t border-amber-500/40 px-4 py-3">
              <button
                onClick={goToRegister}
                aria-label={ctaAriaLabel}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-extrabold py-3.5 sm:py-4 rounded-xl min-h-[48px] sm:min-h-[52px] active:scale-[0.98] text-base sm:text-lg will-change-transform"
              >
                <FormattedMessage id="chatter.landing.cta.start" defaultMessage="Commencer gratuitement" />
                <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
};

export default ChatterLanding;
