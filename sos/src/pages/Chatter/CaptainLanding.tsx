/**
 * CaptainLanding - Landing Page Capitaine Chatter
 *
 * Recruter des capitaines pour construire des équipes de chatters worldwide.
 * Style identique à ChatterLanding (dark theme, amber/yellow CTAs, sections modulaires).
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocaleNavigate } from '@/multilingual-system';
import { getTranslatedRouteSlug, type RouteKey } from '@/multilingual-system/core/routing/localeRoutes';
import { useApp } from '@/contexts/AppContext';
import Layout from '@/components/layout/Layout';
import SEOHead from '@/components/layout/SEOHead';
import { trackMetaViewContent } from '@/utils/metaPixel';
import { logAnalyticsEvent } from '@/config/firebase';
import HreflangLinks from '@/multilingual-system/components/HrefLang/HreflangLinks';
import {
  ArrowRight,
  Check,
  Users,
  ChevronDown,
  Plus,
  Minus,
  Crown,
  Globe,
  TrendingUp,
  Shield,
  Star,
} from 'lucide-react';

// ============================================================================
// STYLES - Identique à ChatterLanding
// ============================================================================
const globalStyles = `
  @media (max-width: 768px) {
    .captain-landing h1 { font-size: 2.25rem !important; }
    .captain-landing h2 { font-size: 1.875rem !important; }
    .captain-landing h3 { font-size: 1.5rem !important; }
  }
  .captain-landing h1,
  .captain-landing h2,
  .captain-landing h3 {
    color: white;
  }
  .captain-landing h1 span,
  .captain-landing h2 span,
  .captain-landing h3 span {
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
  @media (min-width: 640px) {
    .section-content { padding: 4rem 1.5rem; }
  }
  @media (min-width: 1024px) {
    .section-content { padding: 6rem 2rem; }
  }
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
    className={`flex items-center justify-center gap-2 sm:gap-3 bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-extrabold rounded-2xl shadow-lg transition-all active:scale-[0.98] hover:shadow-xl hover:from-amber-300 hover:to-yellow-300 will-change-transform ${size === 'large' ? 'min-h-[56px] sm:min-h-[64px] px-6 sm:px-8 py-4 sm:py-5 text-lg sm:text-xl' : 'min-h-[48px] sm:min-h-[56px] px-5 sm:px-6 py-3 sm:py-4 text-base sm:text-lg'} ${className}`}
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
      aria-controls={`faq-captain-answer-${index}`}
      id={`faq-captain-question-${index}`}
    >
      <span className="text-base sm:text-lg font-semibold pr-2">{question}</span>
      <span className={`flex flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full items-center justify-center transition-all duration-300 ${isOpen ? 'bg-amber-400 text-black' : 'bg-white/10 text-white'}`} aria-hidden="true">
        {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
      </span>
    </button>
    <div
      id={`faq-captain-answer-${index}`}
      role="region"
      aria-labelledby={`faq-captain-question-${index}`}
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
// TIER DATA
// ============================================================================
const TIERS = [
  { name: 'Bronze', calls: 20, bonus: 25, color: 'from-orange-700/30 to-orange-600/10', border: 'border-orange-600/30', text: 'text-orange-400', icon: '🥉' },
  { name: 'Argent', calls: 50, bonus: 50, color: 'from-gray-400/20 to-gray-300/10', border: 'border-gray-400/30', text: 'text-gray-300', icon: '🥈' },
  { name: 'Or', calls: 100, bonus: 100, color: 'from-amber-500/20 to-yellow-500/10', border: 'border-amber-500/30', text: 'text-amber-400', icon: '🥇' },
  { name: 'Platine', calls: 200, bonus: 200, color: 'from-cyan-500/20 to-blue-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', icon: '💎' },
  { name: 'Diamant', calls: 400, bonus: 400, color: 'from-purple-500/20 to-pink-500/10', border: 'border-purple-500/30', text: 'text-purple-400', icon: '👑' },
];

// ============================================================================
// PAGE
// ============================================================================

const CaptainLanding: React.FC = () => {
  const navigate = useLocaleNavigate();
  const intl = useIntl();
  const location = useLocation();
  const { language } = useApp();
  const langCode = (language || 'fr') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';

  const [showStickyCTA, setShowStickyCTA] = useState(false);
  const [teamSize, setTeamSize] = useState(30);
  const [callsPerChatter, setCallsPerChatter] = useState(15);
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  const registerRoute = `/${getTranslatedRouteSlug('chatter-register' as RouteKey, langCode)}`;
  const goToRegister = () => navigate(registerRoute);

  const ctaAriaLabel = intl.formatMessage({ id: 'captain.aria.cta.main', defaultMessage: 'Devenir Capitaine Chatter maintenant' });

  useEffect(() => {
    trackMetaViewContent({ content_name: 'captain_landing', content_category: 'landing_page', content_type: 'page' });
    logAnalyticsEvent('page_view', { page_title: 'captain_landing', page_location: window.location.href });
  }, []);

  useEffect(() => {
    const onScroll = () => setShowStickyCTA(window.scrollY > window.innerHeight * 0.8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Revenue calculations
  const totalTeamCalls = teamSize * callsPerChatter;
  const commissionPerCall = 3; // $3 per team call (lawyer) / average
  const monthlyCommissions = totalTeamCalls * commissionPerCall;
  const currentTier = TIERS.reduce((acc, tier) => totalTeamCalls >= tier.calls ? tier : acc, TIERS[0]);
  const tierBonus = currentTier.bonus;
  const qualityBonus = 100; // $100/month quality bonus
  const totalMonthly = monthlyCommissions + tierBonus + qualityBonus;

  // SEO
  const seoTitle = intl.formatMessage({ id: 'captain.landing.seo.title', defaultMessage: 'Devenir Capitaine Chatter | Dirigez une equipe mondiale | SOS-Expat' });
  const seoDescription = intl.formatMessage({ id: 'captain.landing.seo.description', defaultMessage: 'Devenez Capitaine Chatter et dirigez votre equipe de chatters dans le monde entier. Commissions sur chaque appel + bonus de palier + bonus qualite.' });

  // FAQ
  const faqItems = useMemo(() => [
    {
      q: intl.formatMessage({ id: 'captain.faq.q1', defaultMessage: "Comment devenir Capitaine ?" }),
      a: intl.formatMessage({ id: 'captain.faq.a1', defaultMessage: "Inscrivez-vous comme chatter, puis recrutez votre premiere equipe. Les chatters les plus actifs sont promus Capitaine par notre equipe admin." }),
    },
    {
      q: intl.formatMessage({ id: 'captain.faq.q2', defaultMessage: "Combien de chatters dois-je recruter ?" }),
      a: intl.formatMessage({ id: 'captain.faq.a2', defaultMessage: "Il n'y a pas de limite ! Plus votre equipe est grande, plus vous gagnez. Les meilleurs capitaines ont 50-200+ chatters actifs couvrant des dizaines de pays." }),
    },
    {
      q: intl.formatMessage({ id: 'captain.faq.q3', defaultMessage: "Comment sont calcules mes gains ?" }),
      a: intl.formatMessage({ id: 'captain.faq.a3', defaultMessage: "Vous gagnez 2-3$ sur chaque appel de votre equipe (N1 et N2), plus un bonus de palier mensuel (25$ a 400$), plus un bonus qualite de 100$/mois si active." }),
    },
    {
      q: intl.formatMessage({ id: 'captain.faq.q4', defaultMessage: "Puis-je continuer a faire mes propres appels ?" }),
      a: intl.formatMessage({ id: 'captain.faq.a4', defaultMessage: "Absolument ! En tant que capitaine, vous gagnez toujours 3-5$ par appel direct EN PLUS de vos commissions d'equipe. Les deux se cumulent." }),
    },
    {
      q: intl.formatMessage({ id: 'captain.faq.q5', defaultMessage: "Quels pays puis-je couvrir ?" }),
      a: intl.formatMessage({ id: 'captain.faq.a5', defaultMessage: "Tous les 197 pays du monde ! L'admin vous assigne des pays et langues selon votre profil, mais votre equipe peut recruter partout." }),
    },
    {
      q: intl.formatMessage({ id: 'captain.faq.q6', defaultMessage: "Le bonus qualite, c'est quoi ?" }),
      a: intl.formatMessage({ id: 'captain.faq.a6', defaultMessage: "C'est un bonus mensuel de 100$ attribue aux capitaines dont l'equipe maintient un bon niveau d'activite et de satisfaction client." }),
    },
  ], [intl]);

  return (
    <Layout showFooter={false}>
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        ogImage="/og-image.png"
        ogType="website"
        contentType="LandingPage"
      />
      <HreflangLinks pathname={location.pathname} />

      <style>{globalStyles}</style>

      <div className="captain-landing bg-black text-white">

        {/* ================================================================
            HERO
        ================================================================ */}
        <section className="min-h-[100svh] flex justify-center items-center relative bg-gradient-to-b from-indigo-950 via-purple-900 to-black overflow-hidden" aria-label={intl.formatMessage({ id: 'captain.landing.hero.label', defaultMessage: 'Devenir Capitaine Chatter' })}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(251,191,36,0.12),transparent_50%)]" aria-hidden="true" />

          <div className="relative z-10 text-center px-4 sm:px-6 max-w-5xl mx-auto">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-300 px-4 sm:px-6 py-2 rounded-full text-sm sm:text-base font-bold border border-amber-500/30 mb-6">
              <Crown className="w-4 h-4 sm:w-5 sm:h-5" />
              <FormattedMessage id="captain.landing.hero.badge" defaultMessage="Programme Capitaine Chatter" />
            </div>

            <h1 className="!text-4xl lg:!text-5xl xl:!text-6xl font-black text-white mb-3 sm:mb-6 !leading-[1.1]">
              <FormattedMessage id="captain.landing.hero.line1" defaultMessage="Dirigez une equipe" />{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-400 to-green-400">
                <FormattedMessage id="captain.landing.hero.highlight" defaultMessage="mondiale" />
              </span>
              <br />
              <span className="text-gray-200">
                <FormattedMessage id="captain.landing.hero.line2" defaultMessage="de chatters" />
              </span>
            </h1>

            <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border rounded-2xl p-4 sm:p-6 mb-5 sm:mb-8 max-w-4xl mx-auto">
              <p className="text-center sm:text-base mb-4">
                <FormattedMessage id="captain.landing.hero.sources" defaultMessage="3 sources de revenus en tant que Capitaine :" />
              </p>
              <div className="grid sm:grid-cols-3 gap-3 sm:gap-4">
                {/* Source 1 : Commissions equipe */}
                <div className="bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border rounded-xl p-3 sm:p-4 text-center">
                  <div className="text-2xl sm:text-3xl font-black mb-1">2-3$</div>
                  <div className="text-xs sm:text-sm">
                    <FormattedMessage id="captain.landing.hero.source1" defaultMessage="par appel d'equipe" />
                  </div>
                </div>
                {/* Source 2 : Bonus palier */}
                <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border rounded-xl p-3 sm:p-4 text-center">
                  <div className="text-2xl sm:text-3xl font-black mb-1">25-400$</div>
                  <div className="text-xs sm:text-sm">
                    <FormattedMessage id="captain.landing.hero.source2" defaultMessage="bonus palier/mois" />
                  </div>
                </div>
                {/* Source 3 : Bonus qualite */}
                <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border rounded-xl p-3 sm:p-4 text-center relative">
                  <span className="absolute -top-2 bg-red-500 text-white font-bold px-2 py-0.5 rounded-full text-xs">
                    <FormattedMessage id="captain.landing.hero.extra" defaultMessage="+ EXTRA" />
                  </span>
                  <div className="text-2xl sm:text-3xl font-black mb-1">100$/mois</div>
                  <div className="text-xs sm:text-sm">
                    <FormattedMessage id="captain.landing.hero.source3" defaultMessage="bonus qualite" />
                  </div>
                </div>
              </div>
            </div>

            <p className="text-base sm:text-lg mb-5 sm:mb-10 max-w-2xl mx-auto leading-relaxed">
              <FormattedMessage id="captain.landing.hero.desc" defaultMessage="Recrutez des chatters dans le monde entier. Plus votre equipe grandit, plus vos revenus explosent. Les top capitaines gagnent 2000-8000$/mois !" />
            </p>

            <CTAButton onClick={goToRegister} size="large" className="w-full sm:w-auto max-w-md mx-auto" ariaLabel={ctaAriaLabel}>
              <FormattedMessage id="captain.landing.cta.start" defaultMessage="Devenir Capitaine" />
            </CTAButton>

            <p className="text-gray-300 mt-4 sm:mt-6 sm:text-base">
              <FormattedMessage id="captain.landing.reassurance" defaultMessage="100% gratuit - D'abord chatter, puis promu Capitaine" />
            </p>
          </div>

          <ScrollIndicator label={intl.formatMessage({ id: 'captain.landing.scroll', defaultMessage: 'Decouvrir' })} />
        </section>

        {/* ================================================================
            SECTION - VOTRE MISSION
        ================================================================ */}
        <section className="section-content bg-black" aria-labelledby="captain-mission-title">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <div className="inline-flex items-center gap-2 bg-purple-500/20 text-purple-300 px-4 sm:px-6 py-2 rounded-full text-sm sm:text-base font-bold border border-purple-500/30 mb-4">
                <Globe className="w-4 h-4" />
                <FormattedMessage id="captain.landing.mission.badge" defaultMessage="Votre Mission" />
              </div>
              <h2 id="captain-mission-title" className="!text-3xl sm:!text-4xl lg:!text-5xl font-black mb-4">
                <FormattedMessage id="captain.landing.mission.title" defaultMessage="Couvrir le monde entier" />
              </h2>
              <p className="text-base sm:text-lg lg:text-xl max-w-3xl mx-auto text-white/90">
                <FormattedMessage id="captain.landing.mission.subtitle" defaultMessage="En tant que Capitaine, vous recrutez et formez des chatters pour aider les expatries dans TOUS les pays et TOUTES les langues." />
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Recrutement */}
              <article className="bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border border-amber-500/20 rounded-2xl p-5 sm:p-6">
                <div className="text-3xl mb-3">
                  <Users className="w-8 h-8 text-amber-400" />
                </div>
                <h3 className="!text-xl font-bold text-white mb-2">
                  <FormattedMessage id="captain.landing.mission.recruit.title" defaultMessage="Recrutez sans limite" />
                </h3>
                <p className="text-sm sm:text-base text-white/80">
                  <FormattedMessage id="captain.landing.mission.recruit.desc" defaultMessage="Construisez une equipe de chatters illimitee. Niveau 1 (vos recrues directes) + Niveau 2 (les recrues de vos recrues)." />
                </p>
              </article>

              {/* Couverture mondiale */}
              <article className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl p-5 sm:p-6">
                <div className="text-3xl mb-3">
                  <Globe className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="!text-xl font-bold text-white mb-2">
                  <FormattedMessage id="captain.landing.mission.cover.title" defaultMessage="197 pays a couvrir" />
                </h3>
                <p className="text-sm sm:text-base text-white/80">
                  <FormattedMessage id="captain.landing.mission.cover.desc" defaultMessage="Chaque capitaine se voit assigner des pays et langues. Votre objectif : maximiser la couverture mondiale de SOS-Expat." />
                </p>
              </article>

              {/* Leadership */}
              <article className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-5 sm:p-6 sm:col-span-2 lg:col-span-1">
                <div className="text-3xl mb-3">
                  <Crown className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="!text-xl font-bold text-white mb-2">
                  <FormattedMessage id="captain.landing.mission.lead.title" defaultMessage="Formez et motivez" />
                </h3>
                <p className="text-sm sm:text-base text-white/80">
                  <FormattedMessage id="captain.landing.mission.lead.desc" defaultMessage="Guidez votre equipe vers le succes. Plus vos chatters sont actifs, plus vous gagnez. Leur succes = votre succes." />
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION - 3 SOURCES DE REVENUS CAPITAINE
        ================================================================ */}
        <section className="section-content bg-gradient-to-b from-black to-gray-950" aria-labelledby="captain-revenue-title">
          <div className="max-w-7xl mx-auto">
            <h2 id="captain-revenue-title" className="!text-3xl sm:!text-3xl lg:!text-4xl xl:!text-5xl font-black text-center mb-3 sm:mb-4">
              <span className="text-amber-400"><FormattedMessage id="captain.landing.revenue.highlight" defaultMessage="3 sources" /></span>{' '}
              <FormattedMessage id="captain.landing.revenue.title" defaultMessage="de revenus Capitaine" />
            </h2>
            <p className="text-base sm:text-lg lg:text-xl mb-10 sm:mb-12 lg:mb-16 text-center">
              <FormattedMessage id="captain.landing.revenue.subtitle" defaultMessage="Tout se cumule. Aucune limite." />
            </p>

            <div className="grid lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
              {/* Source 1 - Commissions equipe */}
              <article className="bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-8">
                <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-amber-500 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-5 lg:mb-6" aria-hidden="true">
                  <span className="text-xl sm:text-2xl lg:text-3xl font-black">1</span>
                </div>
                <h3 className="!text-2xl sm:!text-2xl lg:!text-3xl font-bold text-white mb-3 sm:mb-4">
                  <FormattedMessage id="captain.landing.source1.title" defaultMessage="Commissions d'equipe" />
                </h3>
                <p className="text-base sm:text-lg lg:text-xl mb-4 sm:mb-5 lg:mb-6">
                  <FormattedMessage id="captain.landing.source1.desc" defaultMessage="Chaque appel de votre equipe vous rapporte. Plus d'appels = plus de gains. Automatique et illimite." />
                </p>
                <div className="space-y-1 sm:space-y-2">
                  <div className="!text-lg sm:!text-xl lg:!text-2xl font-bold text-amber-400">
                    3$ <FormattedMessage id="captain.landing.source1.lawyer" defaultMessage="/ appel avocat" />
                  </div>
                  <div className="!text-lg sm:!text-xl lg:!text-2xl font-bold text-yellow-400">
                    2$ <FormattedMessage id="captain.landing.source1.expat" defaultMessage="/ appel expatrie" />
                  </div>
                </div>
              </article>

              {/* Source 2 - Bonus palier mensuel */}
              <article className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 border rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-8">
                <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-green-500 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-5 lg:mb-6" aria-hidden="true">
                  <span className="text-xl sm:text-2xl lg:text-3xl font-black">2</span>
                </div>
                <h3 className="!text-2xl sm:!text-2xl lg:!text-3xl font-bold text-white mb-3 sm:mb-4">
                  <FormattedMessage id="captain.landing.source2.title" defaultMessage="Bonus de palier" />
                </h3>
                <p className="text-base sm:text-lg lg:text-xl mb-4 sm:mb-5 lg:mb-6">
                  <FormattedMessage id="captain.landing.source2.desc" defaultMessage="5 paliers mensuels bases sur les appels totaux de votre equipe. Plus l'equipe performe, plus le bonus est gros." />
                </p>
                <div className="space-y-2">
                  {TIERS.map(tier => (
                    <div key={tier.name} className={`flex items-center justify-between bg-gradient-to-r ${tier.color} border ${tier.border} rounded-lg px-3 py-2`}>
                      <span className="flex items-center gap-2 text-sm sm:text-base font-medium">
                        <span>{tier.icon}</span> {tier.name}
                        <span className="text-xs text-white/60">({tier.calls}+ appels)</span>
                      </span>
                      <span className={`font-bold ${tier.text}`}>{tier.bonus}$/mois</span>
                    </div>
                  ))}
                </div>
              </article>

              {/* Source 3 - Bonus qualite */}
              <article className="bg-gradient-to-br from-purple-500/20 to-violet-500/10 border-2 rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-8 relative overflow-hidden">
                <div className="absolute top-3 right-3 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs sm:text-sm font-black px-3 py-1 rounded-full shadow-lg animate-pulse">
                  <FormattedMessage id="captain.landing.source3.badge" defaultMessage="EXCLUSIF" />
                </div>
                <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-purple-500 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-5 lg:mb-6" aria-hidden="true">
                  <span className="text-xl sm:text-2xl lg:text-3xl font-black">3</span>
                </div>
                <h3 className="!text-2xl sm:!text-2xl lg:!text-3xl font-bold text-white mb-3 sm:mb-4">
                  <FormattedMessage id="captain.landing.source3.title" defaultMessage="Bonus qualite" />
                </h3>
                <p className="text-base sm:text-lg lg:text-xl mb-4 sm:mb-5">
                  <FormattedMessage id="captain.landing.source3.desc" defaultMessage="100$/mois de bonus supplementaire pour les capitaines dont l'equipe maintient un excellent niveau d'activite." />
                </p>
                <div className="bg-white/10 border rounded-xl p-4 text-center">
                  <div className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-2">
                    100$/mois
                  </div>
                  <p className="text-sm text-white/70">
                    <FormattedMessage id="captain.landing.source3.condition" defaultMessage="Equipe active et performante = bonus garanti" />
                  </p>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION - CALCULATEUR CAPTAIN
        ================================================================ */}
        <section className="section-content bg-gradient-to-b from-gray-950 via-green-950/20 to-gray-950" aria-labelledby="captain-calc-title">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8 sm:mb-10">
              <span className="inline-block bg-amber-500/20 text-amber-400 px-4 py-1.5 rounded-full text-sm sm:text-base font-bold border border-amber-500/30 mb-4">
                <FormattedMessage id="captain.landing.calc.badge" defaultMessage="Calculateur de revenus" />
              </span>
              <h2 id="captain-calc-title" className="!text-3xl sm:!text-4xl lg:!text-5xl font-black mb-4">
                <FormattedMessage id="captain.landing.calc.title" defaultMessage="Simulez VOS gains de Capitaine" />
              </h2>
            </div>

            <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
              {/* Sliders */}
              <div className="bg-white/10 border rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-8">
                <h3 className="!text-lg sm:!text-xl font-bold text-white mb-6">
                  <FormattedMessage id="captain.landing.calc.config" defaultMessage="Configurez votre equipe" />
                </h3>
                <div className="space-y-6">
                  <div>
                    <label htmlFor="captain-team-slider" className="text-sm sm:text-base block mb-2">
                      <FormattedMessage
                        id="captain.landing.calc.teamSize"
                        defaultMessage="Chatters dans votre equipe : {count}"
                        values={{ count: <span className="text-amber-400 font-bold">{teamSize}</span> }}
                      />
                    </label>
                    <input
                      id="captain-team-slider"
                      type="range"
                      min="5"
                      max="200"
                      value={teamSize}
                      onChange={(e) => setTeamSize(Number(e.target.value))}
                      className="w-full appearance-none cursor-pointer h-2 bg-white/10 rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:cursor-pointer"
                    />
                  </div>
                  <div>
                    <label htmlFor="captain-calls-slider" className="text-sm sm:text-base block mb-2">
                      <FormattedMessage
                        id="captain.landing.calc.callsPerChatter"
                        defaultMessage="Appels/mois par chatter : {count}"
                        values={{ count: <span className="text-green-400 font-bold">{callsPerChatter}</span> }}
                      />
                    </label>
                    <input
                      id="captain-calls-slider"
                      type="range"
                      min="5"
                      max="40"
                      value={callsPerChatter}
                      onChange={(e) => setCallsPerChatter(Number(e.target.value))}
                      className="w-full appearance-none cursor-pointer h-2 bg-white/10 rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-green-400 [&::-webkit-slider-thumb]:cursor-pointer"
                    />
                  </div>

                  {/* Current tier indicator */}
                  <div className={`bg-gradient-to-r ${currentTier.color} border ${currentTier.border} rounded-xl p-4 text-center`}>
                    <p className="text-xs text-white/60 mb-1">
                      <FormattedMessage id="captain.landing.calc.currentTier" defaultMessage="Votre palier actuel" />
                    </p>
                    <p className={`text-xl sm:text-2xl font-black ${currentTier.text}`}>
                      {currentTier.icon} {currentTier.name}
                    </p>
                    <p className="text-xs text-white/60 mt-1">
                      {totalTeamCalls} <FormattedMessage id="captain.landing.calc.teamCalls" defaultMessage="appels equipe/mois" />
                    </p>
                  </div>
                </div>
              </div>

              {/* Result */}
              <div className="bg-gradient-to-br from-amber-500/15 to-green-500/10 border-2 border-amber-500/30 rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-8 flex flex-col justify-center">
                <p className="text-xs sm:text-sm text-center mb-2 text-white/60">
                  <FormattedMessage id="captain.landing.calc.totalLabel" defaultMessage="VOS REVENUS CAPITAINE MENSUELS" />
                </p>
                <p className="text-5xl sm:text-6xl lg:text-7xl font-black text-center bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-yellow-400 to-green-400 mb-4" aria-live="polite">
                  {totalMonthly}$
                </p>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm sm:text-base">
                    <span><FormattedMessage id="captain.landing.calc.commissions" defaultMessage="Commissions equipe" /></span>
                    <span className="font-bold text-amber-400">{monthlyCommissions}$</span>
                  </div>
                  <div className="flex items-center justify-between text-sm sm:text-base">
                    <span><FormattedMessage id="captain.landing.calc.tierBonus" defaultMessage="Bonus palier" /> ({currentTier.name})</span>
                    <span className="font-bold text-green-400">{tierBonus}$</span>
                  </div>
                  <div className="flex items-center justify-between text-sm sm:text-base">
                    <span><FormattedMessage id="captain.landing.calc.qualityBonus" defaultMessage="Bonus qualite" /></span>
                    <span className="font-bold text-purple-400">{qualityBonus}$</span>
                  </div>
                  <div className="border-t border-white/20 pt-2 flex items-center justify-between text-sm">
                    <span className="text-white/60"><FormattedMessage id="captain.landing.calc.excludingPersonal" defaultMessage="+ vos appels directs a 3-5$" /></span>
                    <span className="text-white/60"><FormattedMessage id="captain.landing.calc.notIncluded" defaultMessage="non inclus" /></span>
                  </div>
                </div>
                <CTAButton onClick={goToRegister} className="w-full" ariaLabel={ctaAriaLabel}>
                  <FormattedMessage id="captain.landing.calc.cta" defaultMessage="Commencer maintenant" />
                </CTAButton>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION - COMMENT DEVENIR CAPITAINE
        ================================================================ */}
        <section className="section-content bg-gray-950" aria-labelledby="captain-steps-title">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <span className="inline-block bg-green-500/20 text-green-400 px-4 py-1.5 rounded-full text-sm sm:text-base font-bold border border-green-500/30 mb-4">
                <FormattedMessage id="captain.landing.steps.badge" defaultMessage="4 etapes simples" />
              </span>
              <h2 id="captain-steps-title" className="!text-3xl sm:!text-4xl lg:!text-5xl font-black mb-4">
                <FormattedMessage id="captain.landing.steps.title" defaultMessage="Comment devenir" />{' '}
                <span className="text-amber-400"><FormattedMessage id="captain.landing.steps.highlight" defaultMessage="Capitaine" /></span>
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {[
                {
                  step: 1,
                  icon: <Check className="w-6 h-6" />,
                  titleId: 'captain.landing.step1.title',
                  titleDefault: 'Inscrivez-vous',
                  descId: 'captain.landing.step1.desc',
                  descDefault: 'Creez votre compte chatter gratuitement en 2 minutes. Liez Telegram.',
                  color: 'bg-amber-500',
                },
                {
                  step: 2,
                  icon: <Users className="w-6 h-6" />,
                  titleId: 'captain.landing.step2.title',
                  titleDefault: 'Recrutez',
                  descId: 'captain.landing.step2.desc',
                  descDefault: 'Commencez a recruter des chatters avec votre code de parrainage. Partagez sur les reseaux.',
                  color: 'bg-green-500',
                },
                {
                  step: 3,
                  icon: <TrendingUp className="w-6 h-6" />,
                  titleId: 'captain.landing.step3.title',
                  titleDefault: 'Performez',
                  descId: 'captain.landing.step3.desc',
                  descDefault: 'Montrez vos resultats : equipe active, bons appels, couverture geographique. L\'admin vous remarquera.',
                  color: 'bg-blue-500',
                },
                {
                  step: 4,
                  icon: <Crown className="w-6 h-6" />,
                  titleId: 'captain.landing.step4.title',
                  titleDefault: 'Promotion !',
                  descId: 'captain.landing.step4.desc',
                  descDefault: 'Vous etes promu Capitaine ! Acces au dashboard equipe, bonus palier, bonus qualite, et gestion de pays.',
                  color: 'bg-purple-500',
                },
              ].map(item => (
                <article key={item.step} className="bg-white/5 border rounded-2xl p-5 sm:p-6 text-center">
                  <div className={`w-14 h-14 ${item.color} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                    <span className="text-white">{item.icon}</span>
                  </div>
                  <div className="text-xs text-white/40 font-bold mb-2">
                    <FormattedMessage id="captain.landing.stepLabel" defaultMessage="ETAPE {n}" values={{ n: item.step }} />
                  </div>
                  <h3 className="!text-xl font-bold text-white mb-2">
                    <FormattedMessage id={item.titleId} defaultMessage={item.titleDefault} />
                  </h3>
                  <p className="text-sm sm:text-base text-white/80">
                    <FormattedMessage id={item.descId} defaultMessage={item.descDefault} />
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION - AVANTAGES EXCLUSIFS CAPITAINE
        ================================================================ */}
        <section className="section-content bg-gradient-to-b from-gray-950 via-purple-950/20 to-gray-950" aria-labelledby="captain-perks-title">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <span className="inline-block bg-purple-500/20 text-purple-400 px-4 py-1.5 rounded-full text-sm sm:text-base font-bold border border-purple-500/30 mb-4">
                <Star className="w-4 h-4 inline mr-1" />
                <FormattedMessage id="captain.landing.perks.badge" defaultMessage="Avantages exclusifs" />
              </span>
              <h2 id="captain-perks-title" className="!text-3xl sm:!text-4xl lg:!text-5xl font-black mb-4">
                <FormattedMessage id="captain.landing.perks.title" defaultMessage="Pourquoi devenir" />{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-purple-400">
                  <FormattedMessage id="captain.landing.perks.highlight" defaultMessage="Capitaine ?" />
                </span>
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
              {[
                { emoji: '👑', titleKey: 'captain.landing.perk1.title', titleDefault: 'Statut Capitaine', descKey: 'captain.landing.perk1.desc', descDefault: 'Badge exclusif visible par toute la communaute. Reconnaissance officielle.', color: 'text-amber-400' },
                { emoji: '📊', titleKey: 'captain.landing.perk2.title', titleDefault: 'Dashboard equipe', descKey: 'captain.landing.perk2.desc', descDefault: 'Suivez les performances de chaque chatter : appels, gains, activite en temps reel.', color: 'text-blue-400' },
                { emoji: '🌍', titleKey: 'captain.landing.perk3.title', titleDefault: 'Pays assignes', descKey: 'captain.landing.perk3.desc', descDefault: 'Pays et langues assignes par l\'admin. Vous etes responsable de la couverture de vos zones.', color: 'text-green-400' },
                { emoji: '💰', titleKey: 'captain.landing.perk4.title', titleDefault: 'Triple revenu', descKey: 'captain.landing.perk4.desc', descDefault: 'Commissions d\'equipe + bonus palier + bonus qualite. Tout se cumule chaque mois.', color: 'text-yellow-400' },
                { emoji: '🚀', titleKey: 'captain.landing.perk5.title', titleDefault: 'Croissance infinie', descKey: 'captain.landing.perk5.desc', descDefault: 'Aucune limite de recrutement. Plus votre equipe grandit, plus vos revenus explosent.', color: 'text-purple-400' },
                { emoji: '🛡️', titleKey: 'captain.landing.perk6.title', titleDefault: 'Support prioritaire', descKey: 'captain.landing.perk6.desc', descDefault: 'Acces direct a l\'equipe SOS-Expat. Formation, outils, et accompagnement personnalise.', color: 'text-red-400' },
              ].map((item, i) => (
                <div key={i} className="bg-white/5 border rounded-xl sm:rounded-2xl p-4 sm:p-5">
                  <span className="text-3xl mb-3 block" aria-hidden="true">{item.emoji}</span>
                  <div className={`font-bold text-base sm:text-lg ${item.color} mb-1`}>
                    <FormattedMessage id={item.titleKey} defaultMessage={item.titleDefault} />
                  </div>
                  <div className="text-sm text-white/70">
                    <FormattedMessage id={item.descKey} defaultMessage={item.descDefault} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION - ZERO RISQUE
        ================================================================ */}
        <section className="section-content bg-gray-950" aria-labelledby="captain-risk-title">
          <div className="max-w-5xl mx-auto">
            <h2 id="captain-risk-title" className="!text-3xl sm:!text-3xl lg:!text-4xl xl:!text-5xl font-black text-center mb-8 sm:mb-12">
              <FormattedMessage id="captain.landing.risk.title" defaultMessage="Zero risque." />{' '}
              <span className="text-green-400"><FormattedMessage id="captain.landing.risk.highlight" defaultMessage="Zero limite." /></span>
            </h2>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-8">
              {[
                { emoji: '💸', titleKey: 'captain.landing.risk.free', titleDefault: '100% gratuit', descKey: 'captain.landing.risk.free.desc', descDefault: 'Aucun investissement. Jamais.', color: 'text-green-400' },
                { emoji: '🌍', titleKey: 'captain.landing.risk.global', titleDefault: '197 pays', descKey: 'captain.landing.risk.global.desc', descDefault: 'Recrutez dans le monde entier.', color: 'text-blue-400' },
                { emoji: '📱', titleKey: 'captain.landing.risk.phone', titleDefault: 'Smartphone suffit', descKey: 'captain.landing.risk.phone.desc', descDefault: 'Gerez votre equipe depuis votre telephone.', color: 'text-amber-400' },
                { emoji: '⏰', titleKey: 'captain.landing.risk.flexible', titleDefault: 'Horaires libres', descKey: 'captain.landing.risk.flexible.desc', descDefault: 'Travaillez quand vous voulez.', color: 'text-red-400' },
              ].map((item, i) => (
                <div key={i} className="bg-white/10 border rounded-xl sm:rounded-2xl p-4 sm:p-5 text-center">
                  <span className="text-3xl sm:text-4xl mb-2 block" aria-hidden="true">{item.emoji}</span>
                  <div className={`font-bold text-sm sm:text-base ${item.color} mb-0.5`}>
                    <FormattedMessage id={item.titleKey} defaultMessage={item.titleDefault} />
                  </div>
                  <div className="text-gray-300 text-xs sm:text-sm">
                    <FormattedMessage id={item.descKey} defaultMessage={item.descDefault} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION - FAQ
        ================================================================ */}
        <section className="section-content bg-gradient-to-b from-gray-950 to-gray-950" id="faq" aria-labelledby="captain-faq-title">
          <div className="max-w-3xl mx-auto">
            <h2 id="captain-faq-title" className="!text-3xl sm:!text-3xl lg:!text-4xl xl:!text-5xl font-black text-center mb-3 sm:mb-4">
              <FormattedMessage id="captain.faq.title" defaultMessage="Questions ?" />
            </h2>
            <p className="text-base sm:text-lg lg:text-xl mb-8 sm:mb-10 lg:mb-12 text-center">
              <FormattedMessage id="captain.faq.subtitle" defaultMessage="Tout ce qu'il faut savoir avant de devenir Capitaine" />
            </p>
            <div className="space-y-3 sm:space-y-4">
              {faqItems.map((item, i) => (
                <FAQItem
                  key={i}
                  index={i}
                  question={item.q}
                  answer={item.a}
                  isOpen={openFAQ === i}
                  onToggle={() => setOpenFAQ(openFAQ === i ? null : i)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
            CTA FINAL
        ================================================================ */}
        <section className="section-content bg-gradient-to-b from-gray-950 via-purple-950/20 to-black relative" aria-labelledby="captain-cta-final">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(251,191,36,0.06),transparent_50%)]" aria-hidden="true" />

          <div className="relative z-10 max-w-4xl mx-auto text-center">
            <Crown className="w-12 h-12 sm:w-16 sm:h-16 text-amber-400 mx-auto mb-4" />

            <h2 id="captain-cta-final" className="!text-2xl sm:!text-4xl lg:!text-5xl xl:!text-6xl font-black text-white mb-4 sm:mb-6">
              <FormattedMessage id="captain.landing.cta.title" defaultMessage="Devenez le leader" />
              <br />
              <span className="text-amber-400"><FormattedMessage id="captain.landing.cta.highlight" defaultMessage="de votre equipe mondiale" /></span>
            </h2>

            <p className="text-base sm:text-lg mb-6 sm:mb-8 max-w-2xl mx-auto">
              <FormattedMessage id="captain.landing.cta.desc" defaultMessage="Commencez comme chatter, prouvez votre valeur, et devenez Capitaine. Vos gains n'ont aucune limite." />
            </p>

            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-8 sm:mb-10">
              {[
                'captain.landing.recap.commissions',
                'captain.landing.recap.tierBonus',
                'captain.landing.recap.qualityBonus',
                'captain.landing.recap.free',
              ].map((key, i) => (
                <span key={i} className="flex items-center gap-1.5 bg-amber-500/15 border text-white rounded-full px-3 sm:px-4 py-2 sm:text-base font-medium">
                  <Check className="w-4 h-4 text-amber-400" aria-hidden="true" />
                  <FormattedMessage
                    id={key}
                    defaultMessage={
                      i === 0 ? 'Commissions illimitees' :
                      i === 1 ? 'Bonus palier' :
                      i === 2 ? '100$/mois qualite' : 'Gratuit'
                    }
                  />
                </span>
              ))}
            </div>

            <CTAButton onClick={goToRegister} size="large" className="w-full max-w-sm sm:max-w-md mx-auto" ariaLabel={ctaAriaLabel}>
              <FormattedMessage id="captain.landing.cta.final" defaultMessage="Devenir Capitaine maintenant" />
            </CTAButton>

            <p className="text-gray-300 mt-5 sm:mt-6 sm:text-base lg:text-lg">
              <FormattedMessage id="captain.landing.cta.footer" defaultMessage="Inscription gratuite - Commencez comme chatter - Promotion sur merite" />
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
            aria-label={ctaAriaLabel}
          >
            <div className="bg-black/95 backdrop-blur-md border-t px-4 py-3">
              <button
                onClick={goToRegister}
                aria-label={ctaAriaLabel}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-extrabold py-3.5 sm:py-4 rounded-xl min-h-[48px] sm:min-h-[52px] active:scale-[0.98] sm:text-lg will-change-transform"
              >
                <Crown className="w-5 h-5" aria-hidden="true" />
                <FormattedMessage id="captain.landing.cta.start" defaultMessage="Devenir Capitaine" />
                <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
};

export default CaptainLanding;
