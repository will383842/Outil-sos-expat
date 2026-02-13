/**
 * GroupAdminLanding - Landing Page for Group/Community Administrators
 *
 * V2: Harmonized with ChatterLanding V7 dark premium design
 * - Dark theme (bg-black text-white) with blue/indigo identity
 * - Mobile-first with safe-area, 44px+ touch targets
 * - Accessible FAQ accordion (aria-controls, Plus/Minus)
 * - content-visibility: auto for below-fold perf
 * - Sticky CTA on mobile
 * - prefers-reduced-motion support
 */

import React, { useState, useEffect } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocaleNavigate } from '@/multilingual-system';
import { getTranslatedRouteSlug, type RouteKey } from '@/multilingual-system/core/routing/localeRoutes';
import { useApp } from '@/contexts/AppContext';
import Layout from '@/components/layout/Layout';
import SEOHead from '@/components/layout/SEOHead';
import { trackMetaViewContent } from '@/utils/metaPixel';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Plus,
  Minus,
  Users,
  UserPlus,
  Copy,
  DollarSign,
  Image,
  Globe,
  Gift,
} from 'lucide-react';
import { useCountryFromUrl, useCountryLandingConfig, convertToLocal } from '@/country-landing';

// ============================================================================
// STYLES - Mobile-first with performance hints
// ============================================================================
const globalStyles = `
  /* FORCE font sizes on mobile - override index.css clamp() rules */
  @media (max-width: 768px) {
    .groupadmin-landing h1 { font-size: 2.25rem !important; }
    .groupadmin-landing h2 { font-size: 1.875rem !important; }
    .groupadmin-landing h3 { font-size: 1.5rem !important; }
    /* p tags: NO override — let Tailwind classes control each <p> individually */
  }

  /* FIX: index.css forces "span { font-size: 14px }" on mobile.
     Colored highlight spans inside headings MUST inherit the heading font-size. */
  .groupadmin-landing h1 span,
  .groupadmin-landing h2 span,
  .groupadmin-landing h3 span {
    font-size: inherit;
  }

  /* Animations */
  @keyframes pulse-glow-blue {
    0%, 100% { box-shadow: 0 0 20px rgba(96, 165, 250, 0.4); }
    50% { box-shadow: 0 0 40px rgba(96, 165, 250, 0.6); }
  }
  .animate-pulse-glow-blue { animation: pulse-glow-blue 2s ease-in-out infinite; }

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
    className={`flex items-center justify-center gap-2 sm:gap-3 bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-extrabold rounded-2xl shadow-lg transition-all active:scale-[0.98] hover:shadow-xl hover:from-amber-300 hover:to-yellow-300 will-change-transform${size === 'large' ? 'min-h-[56px] sm:min-h-[64px] px-6 sm:px-8 py-4 sm:py-5 text-lg sm:text-xl' : 'min-h-[48px] sm:min-h-[56px] px-5 sm:px-6 py-3 sm:py-4 text-base sm:text-lg'}${className}`}
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
  <div className="border rounded-2xl overflow-hidden transition-colors duration-200 hover:border-white/20">
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between gap-4 px-5 sm:px-6 py-4 sm:py-5 text-left min-h-[48px]"
      aria-expanded={isOpen}
      aria-controls={`faq-answer-${index}`}
      id={`faq-question-${index}`}
    >
      <span className="text-base sm:text-lg font-semibold pr-2">{question}</span>
      <span className={`flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full items-center justify-center transition-all duration-300${isOpen ? 'bg-amber-400 text-black' : 'bg-white/10 text-white'}`} aria-hidden="true">
        {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
      </span>
    </button>
    <div
      id={`faq-answer-${index}`}
      role="region"
      aria-labelledby={`faq-question-${index}`}
      className={`overflow-hidden transition-all duration-300 ease-out ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
    >
      <div className="px-5 sm:px-6 pb-5 sm:pb-6 text-sm sm:text-base leading-relaxed">
        {answer}
      </div>
    </div>
  </div>
);

const ScrollIndicator: React.FC<{ label: string }> = ({ label }) => (
  <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2" aria-hidden="true">
    <span className="text-white/80 sm:text-sm font-medium">{label}</span>
    <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-white/80 animate-bounce" />
  </div>
);

// ============================================================================
// PAGE
// ============================================================================
const GroupAdminLanding: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const { language } = useApp();
  const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showStickyCTA, setShowStickyCTA] = useState(false);

  // Country-specific config
  const { countryCode, lang: urlLang } = useCountryFromUrl();
  const { config: countryConfig } = useCountryLandingConfig('groupadmin', countryCode, urlLang || langCode);

  // VENDEUR: Ne montrer la conversion QUE si le montant reste attractif (pas en Europe avec des 0,XX€)
  const local = (usd: number) => {
    const hideConversionCurrencies = ['EUR', 'GBP', 'CHF', 'USD', 'CAD', 'AUD'];
    if (hideConversionCurrencies.includes(countryConfig.currency.code)) {
      return ''; // Pas de conversion pour les petits montants
    }
    const str = convertToLocal(usd, countryConfig.currency);
    return str ? ` (${str})` : '';
  };

  // Calculateur
  const [groupMembers, setGroupMembers] = useState(10000);
  const [conversionRate, setConversionRate] = useState(2); // % de membres qui appellent par mois

  const registerRoute = `/${getTranslatedRouteSlug('groupadmin-register' as RouteKey, langCode)}`;
  const handleRegisterClick = () => {
    navigate(registerRoute);
  };

  useEffect(() => {
    trackMetaViewContent({ content_name: 'groupadmin_landing', content_category: 'landing_page', content_type: 'page' });
  }, []);

  useEffect(() => {
    const onScroll = () => setShowStickyCTA(window.scrollY > window.innerHeight * 0.8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const ctaAriaLabel = intl.formatMessage({ id: 'groupAdmin.landing.hero.cta', defaultMessage: 'Become a Partner' });

  const faqItems = [
    {
      q: intl.formatMessage({ id: 'groupAdmin.landing.faq.q1', defaultMessage: 'Is it really free to join?' }),
      a: intl.formatMessage({ id: 'groupAdmin.landing.faq.a1', defaultMessage: 'Yes! Registration is 100% free. There are no fees, no commitments, and no minimum requirements.' }),
    },
    {
      q: intl.formatMessage({ id: 'groupAdmin.landing.faq.q2', defaultMessage: 'When do I get paid?' }),
      a: intl.formatMessage({ id: 'groupAdmin.landing.faq.a2', defaultMessage: 'Commissions become available 7 days after the client\'s consultation. You can withdraw anytime once you have at least $25.' }),
    },
    {
      q: intl.formatMessage({ id: 'groupAdmin.landing.faq.q3', defaultMessage: 'What payment methods are available?' }),
      a: intl.formatMessage({ id: 'groupAdmin.landing.faq.a3', defaultMessage: 'We support PayPal, Wise, Mobile Money, and bank transfers to over 100 countries.' }),
    },
    {
      q: intl.formatMessage({ id: 'groupAdmin.landing.faq.q4', defaultMessage: 'How does the $5 discount work for my members?' }),
      a: intl.formatMessage({ id: 'groupAdmin.landing.faq.a4', defaultMessage: 'Every call made through your affiliate link gives your community members a $5 discount. This makes it easy to promote - your members save money while you earn $10 per call.' }),
    },
    {
      q: intl.formatMessage({ id: 'groupAdmin.landing.faq.q5', defaultMessage: 'What kind of groups are eligible?' }),
      a: intl.formatMessage({ id: 'groupAdmin.landing.faq.a5', defaultMessage: 'Any group or community related to travel, expatriation, immigration, international relocation, or living abroad is eligible. Facebook groups, Discord servers, WhatsApp communities, forums, and more!' }),
    },
  ];

  return (
    <Layout showFooter={false}>
      <SEOHead
        title={intl.formatMessage({ id: 'groupAdmin.landing.seo.title', defaultMessage: 'Become a Group Admin Partner - Earn $10 per Call + $5 Discount | SOS-Expat' })}
        description={intl.formatMessage({ id: 'groupAdmin.landing.seo.description', defaultMessage: 'Monetize your group or community. Earn $10 for each call generated by your affiliate link, plus a $5 discount for your members on every call. Ready-to-use tools in 9 languages.' })}
      />

      {/* Custom styles */}
      <style>{globalStyles}</style>

      <div className="groupadmin-landing bg-black text-white">

        {/* ================================================================
            HERO - FULL VIEWPORT
        ================================================================ */}
        <section
          className="min-h-[100svh] flex justify-center items-center relative bg-gradient-to-b from-blue-950 via-indigo-900 to-black overflow-hidden"
          aria-label={intl.formatMessage({ id: 'groupAdmin.landing.seo.title', defaultMessage: 'Become a Group Admin Partner' })}
        >
          {/* Radial blue glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(96,165,250,0.15),transparent_50%)]" aria-hidden="true" />

          <div className="relative z-10 text-center px-4 sm:px-6 max-w-5xl mx-auto">

            {/* Community Badge */}
            <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 px-4 sm:px-6 py-1.5 sm:py-2 rounded-full sm:text-base font-bold border mb-4 sm:mb-6">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
              <FormattedMessage id="groupAdmin.landing.badge" defaultMessage="For Group & Community Admins" />
            </div>

            {/* Headline ULTRA-VENDEUR */}
            <h1 className="!text-4xl lg:!text-5xl xl:!text-6xl font-black text-white mb-3 sm:mb-6 !leading-[1.1]">
              <span><FormattedMessage id="groupAdmin.landing.hero.new.line1" defaultMessage="Gagnez jusqu'à" /></span>{' '}
              <span className="text-transparent bg-clip-text from-blue-400 via-indigo-400 to-purple-400">
                <FormattedMessage id="groupAdmin.landing.hero.new.amount" defaultMessage="5000$+/mois" />
              </span>
              <br />
              <span className="text-gray-200"><FormattedMessage id="groupAdmin.landing.hero.new.line2" defaultMessage="avec votre groupe" /></span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg mb-5 sm:mb-8 max-w-2xl mx-auto leading-relaxed">
              <FormattedMessage
                id="groupAdmin.landing.hero.new.subtitle"
                defaultMessage="Monétisez votre communauté Facebook, Discord, WhatsApp ou forum. Vos membres économisent 5$/appel, vous gagnez 10$/appel. Win-win !"
              />
            </p>

            {/* 3 sources de revenus */}
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border rounded-2xl p-4 sm:p-6 mb-5 sm:mb-8 max-w-4xl mx-auto">
              <p className="text-center sm:text-base mb-4">
                <FormattedMessage id="groupAdmin.landing.hero.sources" defaultMessage="3 sources de revenus illimitées :" />
              </p>
              <div className="grid sm:grid-cols-3 gap-3 sm:gap-4">
                {/* Source 1 : Appels membres */}
                <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border rounded-xl p-3 sm:p-4 text-center">
                  <div className="text-2xl sm:text-3xl font-black mb-1">10$</div>
                  <div className="text-xs sm:text-sm"><FormattedMessage id="groupAdmin.landing.hero.source1" defaultMessage="par appel membre" /></div>
                </div>

                {/* Source 2 : Recruter autres admins */}
                <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border rounded-xl p-3 sm:p-4 text-center">
                  <div className="text-2xl sm:text-3xl font-black mb-1">500-2000$</div>
                  <div className="text-xs sm:text-sm"><FormattedMessage id="groupAdmin.landing.hero.source2" defaultMessage="équipe d'admins" /></div>
                </div>

                {/* Source 3 : Partenaires (Avocats/Aidants) */}
                <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border rounded-xl p-3 sm:p-4 text-center relative">
                  <span className="absolute -top-2 bg-red-500 text-white font-bold px-2 py-0.5 rounded-full">
                    <FormattedMessage id="groupAdmin.landing.hero.hot" defaultMessage="🔥 HOT" />
                  </span>
                  <div className="text-2xl sm:text-3xl font-black mb-1">1500$</div>
                  <div className="text-xs sm:text-sm"><FormattedMessage id="groupAdmin.landing.hero.source3" defaultMessage="avec 10 partenaires" /></div>
                </div>
              </div>

              {/* Exemple partenaire */}
              <div className="mt-4 pt-4 border-t text-center">
                <p className="text-xs sm:text-sm">
                  <FormattedMessage
                    id="groupAdmin.landing.hero.partnerExample"
                    defaultMessage="💡 1 partenaire (avocat/aidant) = 30 appels/mois × 5$ × 6 mois = {total} passifs !"
                    values={{ total: <span className="text-purple-400 font-bold">900$</span> }}
                  />
                </p>
              </div>
            </div>

            {/* CTA Button */}
            <CTAButton onClick={handleRegisterClick} size="large" className="w-full sm:w-auto max-w-md mx-auto" ariaLabel={ctaAriaLabel}>
              <FormattedMessage id="groupAdmin.landing.hero.cta" defaultMessage="Become a Partner" />
            </CTAButton>

            <p className="text-gray-300 mt-4 sm:mt-6 sm:text-base">
              <FormattedMessage id="groupAdmin.landing.hero.free" defaultMessage="100% free - No commitment" />
            </p>
          </div>

          <ScrollIndicator label={intl.formatMessage({ id: 'groupAdmin.landing.scroll', defaultMessage: 'Discover' })} />
        </section>

        {/* ================================================================
            SECTION 2 - HOW IT WORKS (3 steps)
        ================================================================ */}
        <section className="section-content bg-gradient-to-b from-black to-gray-950" aria-labelledby="section-how">
          <div className="max-w-7xl mx-auto">

            <h2 id="section-how" className="!text-3xl sm:!text-3xl lg:!text-4xl xl:!text-5xl font-black text-center mb-3 sm:mb-4">
              <FormattedMessage id="groupAdmin.landing.howItWorks.title" defaultMessage="How It Works" />
            </h2>
            <p className="text-base sm:text-lg lg:text-xl mb-10 sm:mb-12 lg:mb-16">
              <FormattedMessage id="groupAdmin.landing.howItWorks.subtitle" defaultMessage="Three simple steps to start earning" />
            </p>

            <div className="grid lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">

              {/* Step 1 */}
              <article className="bg-gradient-to-br from-blue-500/20 to-indigo-500/10 border rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-8">
                <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-blue-500 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-5 lg:mb-6" aria-hidden="true">
                  <UserPlus className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" />
                </div>
                <div className="text-sm font-bold mb-2">
                  <FormattedMessage id="groupAdmin.landing.step1.label" defaultMessage="STEP 1" />
                </div>
                <h3 className="!text-2xl sm:!text-2xl lg:!text-3xl font-bold text-white mb-3 sm:mb-4">
                  <FormattedMessage id="groupAdmin.landing.step1.title" defaultMessage="Register for Free" />
                </h3>
                <p className="text-base sm:text-lg lg:text-xl">
                  <FormattedMessage id="groupAdmin.landing.step1.description" defaultMessage="Sign up and add your group or community. Get your unique affiliate links instantly." />
                </p>
              </article>

              {/* Step 2 */}
              <article className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 border rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-8">
                <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-green-500 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-5 lg:mb-6" aria-hidden="true">
                  <Copy className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" />
                </div>
                <div className="text-sm font-bold mb-2">
                  <FormattedMessage id="groupAdmin.landing.step2.label" defaultMessage="STEP 2" />
                </div>
                <h3 className="!text-2xl sm:!text-2xl lg:!text-3xl font-bold text-white mb-3 sm:mb-4">
                  <FormattedMessage id="groupAdmin.landing.step2.title" defaultMessage="Share Ready-Made Posts" />
                </h3>
                <p className="text-base sm:text-lg lg:text-xl">
                  <FormattedMessage id="groupAdmin.landing.step2.description" defaultMessage="Use our copy-paste posts, banners, and images. Available in 9 languages!" />
                </p>
              </article>

              {/* Step 3 */}
              <article className="bg-gradient-to-br from-yellow-500/20 to-amber-500/10 border rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-8">
                <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-yellow-500 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-5 lg:mb-6" aria-hidden="true">
                  <DollarSign className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-black" />
                </div>
                <div className="text-sm font-bold mb-2">
                  <FormattedMessage id="groupAdmin.landing.step3.label" defaultMessage="STEP 3" />
                </div>
                <h3 className="!text-2xl sm:!text-2xl lg:!text-3xl font-bold text-white mb-3 sm:mb-4">
                  <FormattedMessage id="groupAdmin.landing.step3.title" defaultMessage="Earn Commissions" />
                </h3>
                <p className="text-base sm:text-lg lg:text-xl">
                  <FormattedMessage id="groupAdmin.landing.step3.description" defaultMessage="Earn $10 for each call generated by your link. Your members get $5 off every call. Withdraw anytime." />
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 3 - CALCULATEUR DE REVENUS (ULTRA VENDEUR)
        ================================================================ */}
        <section className="section-content bg-gradient-to-b from-black via-green-950/20 to-gray-950" aria-labelledby="section-calculator">
          <div className="max-w-7xl mx-auto">

            <div className="text-center mb-8 sm:mb-10 lg:mb-12">
              <span className="inline-block bg-green-500/20 text-green-400 px-4 sm:px-6 py-1.5 sm:py-2 rounded-full sm:text-base lg:text-lg font-bold border mb-4 sm:mb-6">
                <FormattedMessage id="groupAdmin.landing.calc.badge" defaultMessage="💰 Calculateur de revenus" />
              </span>
              <h2 id="section-calculator" className="!text-3xl sm:!text-3xl lg:!text-4xl xl:!text-5xl font-black text-white mb-3 sm:mb-4">
                <FormattedMessage id="groupAdmin.landing.calc.title" defaultMessage="Combien pouvez-vous gagner ?" />
              </h2>
              <p className="text-base sm:text-lg lg:text-xl">
                <FormattedMessage id="groupAdmin.landing.calc.subtitle" defaultMessage="Estimez vos revenus mensuels en fonction de votre communauté" />
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="bg-gradient-to-br from-green-500/15 to-emerald-500/10 border rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-8">

                {/* Sliders */}
                <div className="space-y-5 mb-6">
                  {/* Membres du groupe */}
                  <div>
                    <label htmlFor="members-slider" className="text-sm sm:text-base block mb-2">
                      <FormattedMessage
                        id="groupAdmin.landing.calc.members"
                        defaultMessage="Membres dans votre groupe : {count}"
                        values={{ count: <span className="text-green-400 font-bold">{groupMembers.toLocaleString()}</span> }}
                      />
                    </label>
                    <input
                      id="members-slider"
                      type="range"
                      min="1000"
                      max="100000"
                      step="1000"
                      value={groupMembers}
                      onChange={(e) => setGroupMembers(Number(e.target.value))}
                      className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none"
                    />
                  </div>

                  {/* Taux de conversion */}
                  <div>
                    <label htmlFor="conversion-slider" className="text-sm sm:text-base block mb-2">
                      <FormattedMessage
                        id="groupAdmin.landing.calc.conversion"
                        defaultMessage="Taux de conversion : {rate}%"
                        values={{ rate: <span className="text-blue-400 font-bold">{conversionRate}</span> }}
                      />
                    </label>
                    <input
                      id="conversion-slider"
                      type="range"
                      min="0.5"
                      max="5"
                      step="0.5"
                      value={conversionRate}
                      onChange={(e) => setConversionRate(Number(e.target.value))}
                      className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none"
                    />
                    <p className="text-xs mt-1">
                      <FormattedMessage id="groupAdmin.landing.calc.conversionHelp" defaultMessage="% de membres qui utilisent le service par mois" />
                    </p>
                  </div>
                </div>

                {/* Résultat ULTRA VENDEUR */}
                <div className="bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border-2 rounded-xl p-5 text-center">
                  <p className="text-xs sm:text-sm mb-1">
                    <FormattedMessage id="groupAdmin.landing.calc.monthlyEarnings" defaultMessage="VOS REVENUS MENSUELS ESTIMÉS" />
                  </p>
                  <p className="text-5xl sm:text-6xl lg:text-7xl font-black bg-clip-text from-green-400 via-emerald-400 to-blue-400 mb-2" aria-live="polite">
                    +{Math.round((groupMembers * conversionRate / 100) * 10)}$
                  </p>

                  {/* Détails */}
                  <div className="text-xs sm:text-sm mb-3">
                    <FormattedMessage
                      id="groupAdmin.landing.calc.details"
                      defaultMessage="{members} membres × {rate}% conversion × 10$ = {earnings}$/mois"
                      values={{
                        members: groupMembers.toLocaleString(),
                        rate: conversionRate,
                        earnings: Math.round((groupMembers * conversionRate / 100) * 10)
                      }}
                    />
                  </div>

                  {/* Message motivant */}
                  <p className="text-sm sm:text-base font-bold mb-2">
                    <FormattedMessage id="groupAdmin.landing.calc.motivation" defaultMessage="🎯 Sans compter les avocats/aidants que vous pouvez recruter !" />
                  </p>
                  <p className="text-xs sm:text-sm">
                    <FormattedMessage id="groupAdmin.landing.calc.recurring" defaultMessage="Revenus récurrents chaque mois" />
                  </p>
                </div>

                {/* Exemples concrets */}
                <div className="mt-6 grid sm:grid-cols-3 gap-3">
                  <div className="bg-white/10 border rounded-lg p-3 text-center">
                    <div className="text-xs mb-1"><FormattedMessage id="groupadmin.examples.small.title" /></div>
                    <div className="text-lg font-bold"><FormattedMessage id="groupadmin.examples.small.members" /></div>
                    <div className="text-sm"><FormattedMessage id="groupadmin.examples.small.earnings" /></div>
                  </div>
                  <div className="bg-white/10 border rounded-lg p-3 text-center">
                    <div className="text-xs mb-1"><FormattedMessage id="groupadmin.examples.medium.title" /></div>
                    <div className="text-lg font-bold"><FormattedMessage id="groupadmin.examples.medium.members" /></div>
                    <div className="text-sm"><FormattedMessage id="groupadmin.examples.medium.earnings" /></div>
                  </div>
                  <div className="bg-white/10 border rounded-lg p-3 text-center">
                    <div className="text-xs mb-1"><FormattedMessage id="groupadmin.examples.large.title" /></div>
                    <div className="text-lg font-bold"><FormattedMessage id="groupadmin.examples.large.members" /></div>
                    <div className="text-sm"><FormattedMessage id="groupadmin.examples.large.earnings" /></div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ================================================================
            SECTION 4 - BENEFITS (4 cards)
        ================================================================ */}
        <section className="section-content bg-gray-950" aria-labelledby="section-benefits">
          <div className="max-w-7xl mx-auto">

            <h2 id="section-benefits" className="!text-3xl sm:!text-3xl lg:!text-4xl xl:!text-5xl font-black text-center mb-8 sm:mb-12 lg:mb-16">
              <FormattedMessage id="groupAdmin.landing.benefits.title" defaultMessage="Why Join?" />
            </h2>

            <div className="grid lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">

              {/* Benefit 1 */}
              <div className="bg-gradient-to-br from-green-500/15 to-emerald-500/10 border rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500/20 rounded-xl flex items-center justify-center mb-3 sm:mb-4" aria-hidden="true">
                  <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
                </div>
                <h3 className="font-bold text-base sm:text-lg lg:text-xl mb-1 sm:mb-2">
                  <FormattedMessage id="groupAdmin.landing.benefit1.title" defaultMessage="$10 Per Call" />
                </h3>
                <p className="text-xs sm:text-sm lg:text-base">
                  <FormattedMessage id="groupAdmin.landing.benefit1.description" defaultMessage="Earn $10 for every call generated through your affiliate link." />
                </p>
              </div>

              {/* Benefit 2 */}
              <div className="bg-gradient-to-br from-blue-500/15 to-indigo-500/10 border rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-3 sm:mb-4" aria-hidden="true">
                  <Image className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                </div>
                <h3 className="font-bold text-base sm:text-lg lg:text-xl mb-1 sm:mb-2">
                  <FormattedMessage id="groupAdmin.landing.benefit2.title" defaultMessage="Ready-Made Tools" />
                </h3>
                <p className="text-xs sm:text-sm lg:text-base">
                  <FormattedMessage id="groupAdmin.landing.benefit2.description" defaultMessage="Posts, banners, images - all ready to use. Just copy-paste!" />
                </p>
              </div>

              {/* Benefit 3 */}
              <div className="bg-gradient-to-br from-purple-500/15 to-violet-500/10 border rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-3 sm:mb-4" aria-hidden="true">
                  <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
                </div>
                <h3 className="font-bold text-base sm:text-lg lg:text-xl mb-1 sm:mb-2">
                  <FormattedMessage id="groupAdmin.landing.benefit3.title" defaultMessage="9 Languages" />
                </h3>
                <p className="text-xs sm:text-sm lg:text-base">
                  <FormattedMessage id="groupAdmin.landing.benefit3.description" defaultMessage="All resources available in FR, EN, ES, PT, AR, DE, IT, NL, ZH." />
                </p>
              </div>

              {/* Benefit 4 */}
              <div className="bg-gradient-to-br from-amber-500/15 to-yellow-500/10 border rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500/20 rounded-xl flex items-center justify-center mb-3 sm:mb-4" aria-hidden="true">
                  <Gift className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
                </div>
                <h3 className="font-bold text-base sm:text-lg lg:text-xl mb-1 sm:mb-2">
                  <FormattedMessage id="groupAdmin.landing.benefit4.title" defaultMessage="$5 Off Every Call" />
                </h3>
                <p className="text-xs sm:text-sm lg:text-base">
                  <FormattedMessage id="groupAdmin.landing.benefit4.description" defaultMessage="Your community members get $5 off on every call made through your link." />
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 5 - TARGET GROUPS (pills)
        ================================================================ */}
        <section className="section-content bg-gradient-to-b from-gray-950 to-gray-950" aria-labelledby="section-targets">
          <div className="max-w-7xl mx-auto">

            <h2 id="section-targets" className="!text-3xl sm:!text-3xl lg:!text-4xl xl:!text-5xl font-black text-center mb-3 sm:mb-4">
              <FormattedMessage id="groupAdmin.landing.targetGroups.title" defaultMessage="Perfect For Your Group" />
            </h2>
            <p className="text-base sm:text-lg lg:text-xl mb-8 sm:mb-10 lg:mb-12">
              <FormattedMessage id="groupAdmin.landing.targetGroups.subtitle" defaultMessage="Whether you manage a Facebook group, Discord server, WhatsApp community, forum, or any other group - we have the right tools for you." />
            </p>

            <div className="flex justify-center gap-2 sm:gap-3 lg:gap-4 max-w-4xl mx-auto">
              {[
                { id: 'travel', icon: '✈️', label: 'Travel Groups' },
                { id: 'expat', icon: '🌍', label: 'Expat Communities' },
                { id: 'nomad', icon: '💻', label: 'Digital Nomads' },
                { id: 'immigration', icon: '🛂', label: 'Immigration' },
                { id: 'relocation', icon: '📦', label: 'Relocation' },
                { id: 'student', icon: '🎓', label: 'Students Abroad' },
                { id: 'family', icon: '👨‍👩‍👧‍👦', label: 'Expat Families' },
                { id: 'retirement', icon: '🌴', label: 'Retirement Abroad' },
              ].map((group) => (
                <div
                  key={group.id}
                  className="bg-white/10 border rounded-full px-4 sm:px-5 lg:px-6 py-2.5 sm:py-3 flex items-center gap-2 hover:border-white/20 transition-colors"
                >
                  <span className="text-lg sm:text-xl" aria-hidden="true">{group.icon}</span>
                  <span className="font-medium text-sm sm:text-base lg:text-lg">
                    <FormattedMessage id={`groupAdmin.landing.groupType.${group.id}`} defaultMessage={group.label} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 6 - FAQ (accessible accordion)
        ================================================================ */}
        <section className="section-content bg-gray-950" id="faq" aria-labelledby="section-faq">
          <div className="max-w-3xl mx-auto">
            <h2 id="section-faq" className="!text-3xl sm:!text-3xl lg:!text-4xl xl:!text-5xl font-black text-center mb-3 sm:mb-4">
              <FormattedMessage id="groupAdmin.landing.faq.title" defaultMessage="Frequently Asked Questions" />
            </h2>
            <p className="text-base sm:text-lg lg:text-xl mb-8 sm:mb-10 lg:mb-12">
              <FormattedMessage id="groupAdmin.landing.faq.subtitle" defaultMessage="Everything you need to know before getting started" />
            </p>

            <div className="space-y-3 sm:space-y-4">
              {faqItems.map((faq, i) => (
                <FAQItem
                  key={i}
                  index={i}
                  question={faq.q}
                  answer={faq.a}
                  isOpen={openFaq === i}
                  onToggle={() => setOpenFaq(openFaq === i ? null : i)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 7 - CTA FINAL
        ================================================================ */}
        <section className="section-content bg-gradient-to-b from-gray-950 via-blue-950/20 to-black relative" aria-labelledby="section-cta-final">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(96,165,250,0.06),transparent_50%)]" aria-hidden="true" />

          <div className="relative z-10 max-w-4xl mx-auto text-center">

            <h2 id="section-cta-final" className="!text-2xl sm:!text-4xl lg:!text-5xl xl:!text-6xl font-black text-white mb-6 sm:mb-8">
              <FormattedMessage id="groupAdmin.landing.finalCta.title" defaultMessage="Ready to Start Earning?" />
            </h2>

            <p className="text-base sm:text-lg lg:text-xl mb-6 sm:mb-8">
              <FormattedMessage id="groupAdmin.landing.finalCta.subtitle" defaultMessage="Join hundreds of group admins already earning with SOS-Expat." />
            </p>

            {/* Recap pills */}
            <div className="flex justify-center gap-2 sm:gap-3 lg:gap-4 mb-8 sm:mb-10">
              {[
                { id: 'groupAdmin.landing.recap.perCall', defaultMessage: '$10 per call' },
                { id: 'groupAdmin.landing.recap.discount', defaultMessage: '$5 discount for members' },
                { id: 'groupAdmin.landing.recap.languages', defaultMessage: '9 languages' },
                { id: 'groupAdmin.landing.recap.free', defaultMessage: '100% free' },
              ].map((item, i) => (
                <span key={i} className="flex items-center gap-1.5 sm:gap-2 bg-amber-500/15 border text-white rounded-full px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 lg:py-3 sm:text-base lg:text-lg font-medium">
                  <Check className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" aria-hidden="true" />
                  <FormattedMessage id={item.id} defaultMessage={item.defaultMessage} />
                </span>
              ))}
            </div>

            <CTAButton onClick={handleRegisterClick} size="large" className="w-full max-w-sm sm:max-w-md mx-auto" ariaLabel={ctaAriaLabel}>
              <FormattedMessage id="groupAdmin.landing.finalCta.cta" defaultMessage="Register Now - It's Free" />
            </CTAButton>

            <p className="text-gray-400 mt-5 sm:mt-6 sm:text-base lg:text-lg">
              <FormattedMessage id="groupAdmin.landing.finalCta.footer" defaultMessage="Free registration • Start in 5 minutes" />
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
            <div className="bg-black/95 backdrop-blur-md border-t px-4 py-3">
              <button
                onClick={handleRegisterClick}
                aria-label={ctaAriaLabel}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-extrabold py-3.5 sm:py-4 rounded-xl min-h-[48px] sm:min-h-[52px] active:scale-[0.98] sm:text-lg will-change-transform"
              >
                <FormattedMessage id="groupAdmin.landing.hero.cta" defaultMessage="Become a Partner" />
                <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
};

export default GroupAdminLanding;
