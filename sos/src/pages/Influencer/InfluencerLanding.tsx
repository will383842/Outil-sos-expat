/**
 * InfluencerLanding - V2 Dark Premium Mobile-First
 *
 * Harmonized with ChatterLanding V7 design system:
 * - Dark theme (bg-black text-white) with red/orange identity
 * - Mobile-first with safe-area, 44px+ touch targets
 * - Accessible FAQ accordion (aria-controls, Plus/Minus)
 * - content-visibility: auto for below-fold perf
 * - Sticky CTA on mobile, prefers-reduced-motion
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
  ArrowRight,
  Check,
  ChevronDown,
  Plus,
  Minus,
  Users,
  DollarSign,
  Gift,
  Globe,
  UserPlus,
  MessageSquare,
  Share2,
  Crown,
  Phone,
  Percent,
  Video,
} from 'lucide-react';

// ============================================================================
// STYLES
// ============================================================================
const globalStyles = `
  @media (max-width: 768px) {
    .influencer-landing h1 { font-size: 2.25rem !important; }
    .influencer-landing h2 { font-size: 1.875rem !important; }
    .influencer-landing h3 { font-size: 1.5rem !important; }
    .influencer-landing p { font-size: 1rem !important; }
  }
  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 20px rgba(251, 191, 36, 0.4); }
    50% { box-shadow: 0 0 40px rgba(251, 191, 36, 0.6); }
  }
  .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
  .section-content { padding: 3rem 1rem; position: relative; }
  @media (min-width: 640px) { .section-content { padding: 4rem 1.5rem; } }
  @media (min-width: 1024px) { .section-content { padding: 6rem 2rem; } }
  .section-lazy { content-visibility: auto; contain-intrinsic-size: auto 600px; }
  @media (prefers-reduced-motion: reduce) {
    .animate-bounce, .transition-all { animation: none !important; transition: none !important; }
  }
`;

// ============================================================================
// COMPONENTS
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
  <div className="border border-white/10 rounded-2xl overflow-hidden transition-colors duration-200 hover:border-white/20">
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between gap-4 px-5 sm:px-6 py-4 sm:py-5 text-left min-h-[48px]"
      aria-expanded={isOpen}
      aria-controls={`faq-answer-${index}`}
      id={`faq-question-${index}`}
    >
      <span className="text-base sm:text-lg font-semibold text-white pr-2">{question}</span>
      <span className={`flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all duration-300 ${isOpen ? 'bg-amber-400 text-black' : 'bg-white/10 text-white'}`} aria-hidden="true">
        {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
      </span>
    </button>
    <div
      id={`faq-answer-${index}`}
      role="region"
      aria-labelledby={`faq-question-${index}`}
      className={`overflow-hidden transition-all duration-300 ease-out ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
    >
      <div className="px-5 sm:px-6 pb-5 sm:pb-6 text-sm sm:text-base text-gray-300 leading-relaxed">
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
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setCount(Math.floor((1 - Math.pow(1 - progress, 4)) * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isVisible, end, duration]);

  return <span ref={ref} className={className}>{prefix}{count.toLocaleString()}{suffix}</span>;
};

// ============================================================================
// PAGE
// ============================================================================
const InfluencerLanding: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const location = useLocation();
  const { language } = useApp();
  const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showStickyCTA, setShowStickyCTA] = useState(false);

  // Calculator state
  const [calcVideos, setCalcVideos] = useState(4);
  const [calcViewsPerVideo, setCalcViewsPerVideo] = useState(5000);
  const [calcClickRate, setCalcClickRate] = useState(2);
  const [calcConversionRate, setCalcConversionRate] = useState(5);
  const monthlyViews = calcVideos * calcViewsPerVideo;
  const monthlyClicks = Math.floor((monthlyViews * calcClickRate) / 100);
  const monthlyClients = Math.floor((monthlyClicks * calcConversionRate) / 100);
  const monthlyEarnings = monthlyClients * 10;

  const registerRoute = `/${getTranslatedRouteSlug('influencer-register' as RouteKey, langCode)}`;
  const goToRegister = () => navigate(registerRoute);

  useEffect(() => {
    const onScroll = () => setShowStickyCTA(window.scrollY > window.innerHeight * 0.8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const seoTitle = intl.formatMessage({ id: 'influencer.landing.seo.title', defaultMessage: 'Become a SOS-Expat Influencer | Earn $10/client helping people find legal help' });
  const seoDescription = intl.formatMessage({ id: 'influencer.landing.seo.description', defaultMessage: 'Promote SOS-Expat on YouTube, Instagram, TikTok. Earn $10 per client, $5 per lawyer/helper partner. Promo tools included. Withdraw via Wise or PayPal.' });
  const ctaAriaLabel = intl.formatMessage({ id: 'influencer.hero.cta', defaultMessage: 'Become an Influencer - It\'s Free' });

  const faqs = [
    { question: intl.formatMessage({ id: 'influencer.faq.q1', defaultMessage: "What exactly do I have to do as an Influencer?" }), answer: intl.formatMessage({ id: 'influencer.faq.a1', defaultMessage: "Create content about expat life, travel, or immigration on YouTube, Instagram, TikTok or your blog. Include your unique affiliate link. When your followers call a lawyer or expat helper, you earn $10. That's it!" }) },
    { question: intl.formatMessage({ id: 'influencer.faq.q2', defaultMessage: "How much can I realistically earn?" }), answer: intl.formatMessage({ id: 'influencer.faq.a2', defaultMessage: "It depends on your audience size. 10 clients = $100. 50 clients = $500. Some influencers earn $1000-5000/month by finding lawyer/helper partners and earning $5 per call they receive." }) },
    { question: intl.formatMessage({ id: 'influencer.faq.q3', defaultMessage: "What is an 'expat helper'?" }), answer: intl.formatMessage({ id: 'influencer.faq.a3', defaultMessage: "Expat helpers are experienced expats who provide practical advice and guidance. They're not lawyers, but they know the local system well and can help with everyday questions about visas, administration, housing, etc." }) },
    { question: intl.formatMessage({ id: 'influencer.faq.q4', defaultMessage: "What promo tools do I get?" }), answer: intl.formatMessage({ id: 'influencer.faq.a4', defaultMessage: "You get ready-made banners, interactive widgets for your website, personalized QR codes, promo texts in 9 languages, and high-quality logos. Everything you need to promote professionally." }) },
    { question: intl.formatMessage({ id: 'influencer.faq.q5', defaultMessage: "How and when do I get paid?" }), answer: intl.formatMessage({ id: 'influencer.faq.a5', defaultMessage: "Withdraw anytime once you reach $50. We support Wise, PayPal, Mobile Money, and bank transfers. Payments processed within 48 hours." }) },
    { question: intl.formatMessage({ id: 'influencer.faq.q6', defaultMessage: "What discount do my followers get?" }), answer: intl.formatMessage({ id: 'influencer.faq.a6', defaultMessage: "Your followers automatically get 5% off their first call when they use your link. It's an exclusive benefit for your community!" }) },
    { question: intl.formatMessage({ id: 'influencer.faq.q7', defaultMessage: "What audience size do I need?" }), answer: intl.formatMessage({ id: 'influencer.faq.a7', defaultMessage: "There's no minimum! Micro-influencers with 1,000 engaged followers often convert better than mega-influencers. It's about engagement, not size. Quality over quantity!" }) },
    { question: intl.formatMessage({ id: 'influencer.faq.q8', defaultMessage: "Can I recruit lawyers or helpers?" }), answer: intl.formatMessage({ id: 'influencer.faq.a8', defaultMessage: "Yes! Find lawyers or expat helpers to join the platform. You earn $5 for every call they receive during their first 6 months. It's passive income from their success!" }) },
  ];

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

  const platforms = [
    { name: 'YouTube', icon: '🎬', desc: intl.formatMessage({ id: 'influencer.platform.youtube', defaultMessage: 'Video content & tutorials' }), highlight: true },
    { name: 'Instagram', icon: '📸', desc: intl.formatMessage({ id: 'influencer.platform.instagram', defaultMessage: 'Stories & Reels' }) },
    { name: 'TikTok', icon: '🎵', desc: intl.formatMessage({ id: 'influencer.platform.tiktok', defaultMessage: 'Short-form videos' }) },
    { name: intl.formatMessage({ id: 'influencer.platform.blog.name', defaultMessage: 'Your Blog' }), icon: '📝', desc: intl.formatMessage({ id: 'influencer.platform.blog', defaultMessage: 'SEO articles' }) },
    { name: 'Twitter/X', icon: '🐦', desc: intl.formatMessage({ id: 'influencer.platform.twitter', defaultMessage: 'Quick tips & threads' }) },
    { name: 'Facebook', icon: '👤', desc: intl.formatMessage({ id: 'influencer.platform.facebook', defaultMessage: 'Page & Groups' }) },
  ];

  return (
    <Layout showFooter={false}>
      <SEOHead title={seoTitle} description={seoDescription} ogImage="/og-influencer-2026.jpg" ogType="website" contentType="LandingPage" />
      <HreflangLinks pathname={location.pathname} />
      <FAQPageSchema faqs={faqs} pageTitle={seoTitle} />
      <style>{globalStyles}</style>

      <div className="influencer-landing bg-black text-white">

        {/* ================================================================
            HERO - FULL VIEWPORT
        ================================================================ */}
        <section className="min-h-[100svh] flex flex-col justify-center items-center relative bg-gradient-to-b from-red-950 via-red-900 to-black overflow-hidden" aria-label={seoTitle}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(239,68,68,0.15),transparent_50%)]" aria-hidden="true" />

          <div className="relative z-10 text-center px-4 sm:px-6 max-w-5xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-red-500/20 text-red-300 px-4 sm:px-6 py-1.5 sm:py-2 rounded-full text-sm sm:text-base font-bold border border-red-500/30 mb-4 sm:mb-6">
              <Video className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
              <AnimatedCounter end={847} suffix="+" className="font-black" />
              <FormattedMessage id="influencer.hero.badge" defaultMessage=" Influencers worldwide" />
            </div>

            <h1 style={{ fontSize: '2.25rem', lineHeight: 1.1 }} className="font-black text-white mb-3 sm:mb-6">
              <span className="text-amber-400"><FormattedMessage id="influencer.hero.earn" defaultMessage="Earn" /> $10</span>
              <br />
              <span className="text-2xl sm:text-4xl lg:text-5xl">
                <FormattedMessage id="influencer.hero.perClient" defaultMessage="Per Client Referred" />
              </span>
            </h1>

            <p style={{ fontSize: '1rem' }} className="text-gray-300 mb-5 sm:mb-8 max-w-2xl mx-auto leading-relaxed">
              <FormattedMessage id="influencer.hero.subtitle" defaultMessage="YouTube, Instagram, TikTok, Blog... Promote SOS-Expat to your followers. Get banners, widgets, QR codes. Your followers get 5% off!" />
            </p>

            {/* Simple explanation */}
            <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 max-w-2xl mx-auto mb-6 sm:mb-8">
              <p className="text-base sm:text-lg font-semibold">
                <FormattedMessage id="influencer.hero.simple" defaultMessage="Your job: Create content → Share your link → Followers call → You earn $10" />
              </p>
            </div>

            <CTAButton onClick={goToRegister} size="large" className="w-full sm:w-auto max-w-md mx-auto" ariaLabel={ctaAriaLabel}>
              <FormattedMessage id="influencer.hero.cta" defaultMessage="Become an Influencer - It's Free" />
            </CTAButton>

            {/* Trust pills */}
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-5 sm:mt-8">
              {[
                { icon: <Globe className="w-3.5 h-3.5" />, id: 'influencer.hero.trust.1', dm: 'All Countries' },
                { icon: <Percent className="w-3.5 h-3.5" />, id: 'influencer.hero.trust.2', dm: '5% Off for Followers' },
                { icon: <Users className="w-3.5 h-3.5" />, id: 'influencer.hero.trust.4', dm: 'No Min Followers' },
              ].map((item, i) => (
                <span key={i} className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-300">
                  {item.icon}
                  <FormattedMessage id={item.id} defaultMessage={item.dm} />
                </span>
              ))}
            </div>
          </div>

          <ScrollIndicator label={intl.formatMessage({ id: 'influencer.scroll', defaultMessage: 'Discover' })} />
        </section>

        {/* ================================================================
            SECTION 2 - HOW IT WORKS (3 steps)
        ================================================================ */}
        <section className="section-content section-lazy bg-gradient-to-b from-black to-gray-950" aria-labelledby="section-role">
          <div className="max-w-7xl mx-auto">
            <h2 id="section-role" className="!text-3xl sm:!text-3xl lg:!text-4xl xl:!text-5xl font-black text-center text-white mb-3 sm:mb-4">
              <FormattedMessage id="influencer.role.title" defaultMessage="It's Super Simple" />
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-400 text-center mb-10 sm:mb-12 lg:mb-16">
              <FormattedMessage id="influencer.role.subtitle" defaultMessage="Use your existing audience. We give you all the tools." />
            </p>

            <div className="grid lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
              <article className="bg-gradient-to-br from-red-500/20 to-orange-500/10 border border-red-500/40 rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-8">
                <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-red-500 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-5 lg:mb-6" aria-hidden="true">
                  <Video className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" />
                </div>
                <div className="text-sm font-bold text-red-400 mb-2"><FormattedMessage id="influencer.step1.label" defaultMessage="STEP 1" /></div>
                <h3 className="!text-2xl sm:!text-2xl lg:!text-3xl font-bold text-white mb-3 sm:mb-4">
                  <FormattedMessage id="influencer.step1.title" defaultMessage="Create Content" />
                </h3>
                <p className="text-base sm:text-lg lg:text-xl text-gray-200 mb-4">
                  <FormattedMessage id="influencer.step1.desc" defaultMessage="Make videos about expat life, travel tips, visa advice, living abroad. Use our banners and promo texts to promote SOS-Expat naturally." />
                </p>
                <div className="flex flex-wrap gap-2">
                  {['YouTube', 'Instagram', 'TikTok', 'Blog'].map((p) => (
                    <span key={p} className="px-3 py-1 bg-white/10 text-white rounded-full text-xs font-medium">{p}</span>
                  ))}
                </div>
              </article>

              <article className="bg-gradient-to-br from-purple-500/20 to-pink-500/10 border border-purple-500/40 rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-8">
                <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-purple-500 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-5 lg:mb-6" aria-hidden="true">
                  <Share2 className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" />
                </div>
                <div className="text-sm font-bold text-purple-400 mb-2"><FormattedMessage id="influencer.step2.label" defaultMessage="STEP 2" /></div>
                <h3 className="!text-2xl sm:!text-2xl lg:!text-3xl font-bold text-white mb-3 sm:mb-4">
                  <FormattedMessage id="influencer.step2.title" defaultMessage="Share Your Link" />
                </h3>
                <p className="text-base sm:text-lg lg:text-xl text-gray-200 mb-4">
                  <FormattedMessage id="influencer.step2.desc" defaultMessage="Add your unique affiliate link in video descriptions, bio, stories. Your followers get 5% off their first call - exclusive benefit!" />
                </p>
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <p className="text-sm text-gray-400 italic">
                    "<FormattedMessage id="influencer.step2.example" defaultMessage="Link in bio for 5% off your first call with a lawyer or expat helper!" />"
                  </p>
                </div>
              </article>

              <article className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-500/40 rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-8">
                <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-green-500 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-5 lg:mb-6" aria-hidden="true">
                  <DollarSign className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-black" />
                </div>
                <div className="text-sm font-bold text-green-400 mb-2"><FormattedMessage id="influencer.step3.label" defaultMessage="STEP 3" /></div>
                <h3 className="!text-2xl sm:!text-2xl lg:!text-3xl font-bold text-white mb-3 sm:mb-4">
                  <FormattedMessage id="influencer.step3.title" defaultMessage="Get Paid $10" />
                </h3>
                <p className="text-base sm:text-lg lg:text-xl text-gray-200 mb-4">
                  <FormattedMessage id="influencer.step3.desc" defaultMessage="When followers make a call through your link, you earn $10. Withdraw anytime via Wise, PayPal, Mobile Money, or bank transfer." />
                </p>
                <div className="text-lg font-bold text-green-400"><FormattedMessage id="influencer.step3.note" defaultMessage="No limit on earnings!" /></div>
              </article>
            </div>

            {/* Lawyer OR Helper note */}
            <div className="mt-8 sm:mt-12 bg-amber-500/10 border border-amber-500/30 rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0" aria-hidden="true">
                  <MessageSquare className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-1">
                    <FormattedMessage id="influencer.note.title" defaultMessage="Lawyers AND Expat Helpers" />
                  </h3>
                  <p className="text-sm sm:text-base text-gray-300">
                    <FormattedMessage id="influencer.note.desc" defaultMessage="SOS-Expat connects people with professional lawyers AND experienced expat helpers. Lawyers for legal matters, expat helpers for practical advice. Both available instantly by phone, worldwide." />
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 3 - WHO CAN JOIN (profiles)
        ================================================================ */}
        <section className="section-content section-lazy bg-gray-950" aria-labelledby="section-profiles">
          <div className="max-w-7xl mx-auto">
            <h2 id="section-profiles" className="!text-3xl sm:!text-3xl lg:!text-4xl xl:!text-5xl font-black text-center text-white mb-3 sm:mb-4">
              <FormattedMessage id="influencer.profiles.title" defaultMessage="Who Can Join?" />
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-400 text-center mb-8 sm:mb-12">
              <FormattedMessage id="influencer.profiles.subtitle" defaultMessage="YouTubers, Instagrammers, TikTokers, Bloggers... If your audience travels or lives abroad, SOS-Expat is perfect for you!" />
            </p>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
              {[
                { emoji: '🎬', id: 'youtuber', color: 'red' },
                { emoji: '🌍', id: 'expatvlogger', color: 'green' },
                { emoji: '💻', id: 'nomad', color: 'purple' },
                { emoji: '📸', id: 'photographer', color: 'pink' },
                { emoji: '⚖️', id: 'advisor', color: 'blue' },
                { emoji: '✨', id: 'lifestyle', color: 'amber' },
                { emoji: '🇪🇸', id: 'country', color: 'teal' },
                { emoji: '📱', id: 'micro', color: 'violet' },
              ].map((profile) => (
                <div key={profile.id} className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-5 hover:border-white/20 transition-colors">
                  <span className="text-3xl sm:text-4xl block mb-3" aria-hidden="true">{profile.emoji}</span>
                  <h3 className="font-bold text-sm sm:text-base text-white mb-1">
                    <FormattedMessage id={`influencer.profiles.${profile.id}.title`} />
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-400">
                    <FormattedMessage id={`influencer.profiles.${profile.id}.desc`} />
                  </p>
                </div>
              ))}
            </div>

            {/* Why followers need SOS-Expat */}
            <div className="mt-8 sm:mt-12 bg-gradient-to-br from-red-500/15 to-orange-500/10 border border-red-500/30 rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-8">
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-6 text-center">
                <FormattedMessage id="influencer.profiles.why.title" defaultMessage="Why Your Followers Need SOS-Expat" />
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {[
                  { emoji: '📋', id: 'why1' },
                  { emoji: '⚖️', id: 'why2' },
                  { emoji: '🆘', id: 'why3' },
                  { emoji: '🌍', id: 'why4' },
                ].map((item) => (
                  <div key={item.id} className="text-center">
                    <span className="text-3xl sm:text-4xl block mb-2" aria-hidden="true">{item.emoji}</span>
                    <h4 className="font-semibold text-sm sm:text-base text-white mb-1">
                      <FormattedMessage id={`influencer.profiles.${item.id}.title`} />
                    </h4>
                    <p className="text-xs sm:text-sm text-gray-400">
                      <FormattedMessage id={`influencer.profiles.${item.id}.desc`} />
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 4 - CONTENT TYPES + PLATFORMS
        ================================================================ */}
        <section className="section-content section-lazy bg-gradient-to-b from-gray-950 to-gray-950" aria-labelledby="section-content">
          <div className="max-w-7xl mx-auto">
            <h2 id="section-content" className="!text-3xl sm:!text-3xl lg:!text-4xl xl:!text-5xl font-black text-center text-white mb-3 sm:mb-4">
              <FormattedMessage id="influencer.content.title" defaultMessage="Content That Converts Best" />
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-400 text-center mb-8 sm:mb-12">
              <FormattedMessage id="influencer.content.subtitle" defaultMessage="Topics that work well for SOS-Expat referrals" />
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-12">
              {contentTypes.map((content, idx) => (
                <div key={idx} className={`bg-white/5 border rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center ${content.highlight ? 'border-red-500/40 ring-1 ring-red-500/20' : 'border-white/10'}`}>
                  <span className="text-2xl sm:text-3xl block mb-2" aria-hidden="true">{content.icon}</span>
                  <div className={`font-bold text-sm sm:text-base ${content.highlight ? 'text-red-400' : 'text-white'}`}>{content.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{content.desc}</div>
                  {content.highlight && <div className="mt-2 text-xs font-semibold text-red-400"><FormattedMessage id="influencer.content.recommended" defaultMessage="High conversion!" /></div>}
                </div>
              ))}
            </div>

            {/* Platforms */}
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-6 text-center">
              <FormattedMessage id="influencer.tools.title" defaultMessage="Promo Tools Included" />
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4">
              {platforms.map((platform, idx) => (
                <div key={idx} className={`bg-white/5 border rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center ${(platform as any).highlight ? 'border-red-500/40' : 'border-white/10'}`}>
                  <span className="text-2xl sm:text-3xl block mb-2" aria-hidden="true">{platform.icon}</span>
                  <div className={`font-bold text-xs sm:text-sm ${(platform as any).highlight ? 'text-red-400' : 'text-white'}`}>{platform.name}</div>
                  <div className="text-xs text-gray-500 mt-1 hidden sm:block">{platform.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 5 - EARNINGS CALCULATOR
        ================================================================ */}
        <section className="section-content section-lazy bg-gray-950" aria-labelledby="section-calc">
          <div className="max-w-7xl mx-auto">
            <h2 id="section-calc" className="!text-3xl sm:!text-3xl lg:!text-4xl xl:!text-5xl font-black text-center text-white mb-3 sm:mb-4">
              <FormattedMessage id="influencer.calculator.title" defaultMessage="Calculate Your Potential" />
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-400 text-center mb-8 sm:mb-12">
              <FormattedMessage id="influencer.calculator.subtitle" defaultMessage="Adjust the sliders based on your content frequency and audience engagement" />
            </p>

            <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto">
              {/* Main earning card */}
              <div className="bg-gradient-to-br from-red-500/15 to-orange-500/10 border border-red-500/30 rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-8 text-center">
                <Phone className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-red-400 opacity-80" aria-hidden="true" />
                <div className="text-5xl sm:text-6xl lg:text-7xl font-black text-amber-400 mb-2">$10</div>
                <p className="text-base sm:text-lg text-gray-300">
                  <FormattedMessage id="influencer.earnings.perCall" defaultMessage="Per client call to a lawyer or expat helper" />
                </p>
                <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-4 sm:mt-6">
                  {['10 = $100', '50 = $500', '100 = $1000'].map((v) => (
                    <span key={v} className="bg-white/10 rounded-full px-3 sm:px-4 py-1.5 text-xs sm:text-sm text-gray-300">{v}</span>
                  ))}
                </div>
              </div>

              {/* Calculator */}
              <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-8">
                <div className="space-y-5 sm:space-y-6">
                  {[
                    { label: 'influencer.calculator.videos', dm: 'Videos/posts per month', value: calcVideos, min: 1, max: 30, set: setCalcVideos, isInt: true },
                    { label: 'influencer.calculator.views', dm: 'Average views per content', value: calcViewsPerVideo, min: 500, max: 100000, step: 500, set: setCalcViewsPerVideo, isInt: true, fmt: true },
                    { label: 'influencer.calculator.clickrate', dm: 'Link click rate', value: calcClickRate, min: 0.5, max: 10, step: 0.5, set: setCalcClickRate, suffix: '%' },
                    { label: 'influencer.calculator.conversion', dm: 'Conversion rate (clicks → calls)', value: calcConversionRate, min: 1, max: 15, set: setCalcConversionRate, suffix: '%', isInt: true },
                  ].map((s) => (
                    <div key={s.label}>
                      <label className="flex items-center justify-between text-sm font-medium text-gray-300 mb-2">
                        <span><FormattedMessage id={s.label} defaultMessage={s.dm} /></span>
                        <span className="text-green-400 font-bold text-lg">{s.fmt ? s.value.toLocaleString() : s.value}{s.suffix || ''}</span>
                      </label>
                      <input
                        type="range"
                        min={s.min}
                        max={s.max}
                        step={s.step || (s.isInt ? 1 : 0.5)}
                        value={s.value}
                        onChange={(e) => s.set(s.isInt ? parseInt(e.target.value) : parseFloat(e.target.value))}
                        className="w-full h-2 sm:h-3 bg-white/10 rounded-full appearance-none cursor-pointer
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6
                          sm:[&::-webkit-slider-thumb]:w-7 sm:[&::-webkit-slider-thumb]:h-7
                          [&::-webkit-slider-thumb]:bg-green-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                          [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-green-500/40"
                      />
                    </div>
                  ))}

                  <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/10 border border-green-500/30 rounded-2xl p-5 text-center">
                    <p className="text-sm text-gray-400 mb-1"><FormattedMessage id="influencer.calculator.result" defaultMessage="Estimated monthly earnings" /></p>
                    <p className="text-4xl sm:text-5xl font-black text-green-400" aria-live="polite">${monthlyEarnings}</p>
                    <p className="text-xs sm:text-sm text-gray-500 mt-2">
                      {monthlyViews.toLocaleString()} <FormattedMessage id="influencer.calculator.views.label" defaultMessage="views" /> × {calcClickRate}% = {monthlyClicks.toLocaleString()} <FormattedMessage id="influencer.calculator.clicks" defaultMessage="clicks" /> × {calcConversionRate}% = {monthlyClients} <FormattedMessage id="influencer.calculator.clients" defaultMessage="clients" /> × $10
                    </p>
                  </div>
                  <p className="text-xs text-gray-600 text-center">
                    <FormattedMessage id="influencer.calculator.disclaimer" defaultMessage="Results vary depending on your niche, audience engagement, and content quality. These are estimates, not guarantees." />
                  </p>
                </div>
              </div>
            </div>

            {/* Bonus earnings */}
            <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 mt-8 sm:mt-12 max-w-5xl mx-auto">
              <div className="bg-gradient-to-br from-purple-500/15 to-pink-500/10 border border-purple-500/30 rounded-2xl p-5 sm:p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500/20 rounded-xl flex items-center justify-center" aria-hidden="true">
                    <UserPlus className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-purple-400">$5</div>
                    <div className="text-xs sm:text-sm text-gray-400"><FormattedMessage id="influencer.earnings.partner" defaultMessage="Per call to your lawyer/helper partners" /></div>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-gray-400"><FormattedMessage id="influencer.earnings.partner.desc" defaultMessage="Find a lawyer or expat helper to join. Earn $5 passively every time they receive a call!" /></p>
              </div>

              <div className="bg-gradient-to-br from-green-500/15 to-emerald-500/10 border border-green-500/30 rounded-2xl p-5 sm:p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500/20 rounded-xl flex items-center justify-center" aria-hidden="true">
                    <Gift className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-green-400">5%</div>
                    <div className="text-xs sm:text-sm text-gray-400"><FormattedMessage id="influencer.earnings.discount" defaultMessage="Discount for your followers" /></div>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-gray-400"><FormattedMessage id="influencer.earnings.discount.desc" defaultMessage="Your followers get 5% off. Exclusive benefit that makes your link more valuable!" /></p>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 6 - BUILD NETWORK
        ================================================================ */}
        <section className="section-content section-lazy bg-gradient-to-b from-gray-950 via-orange-950/20 to-gray-950" aria-labelledby="section-network">
          <div className="max-w-7xl mx-auto">
            <h2 id="section-network" className="!text-3xl sm:!text-3xl lg:!text-4xl xl:!text-5xl font-black text-center text-white mb-3 sm:mb-4">
              <FormattedMessage id="influencer.network.title" defaultMessage="Build Your Network, Earn More" />
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-400 text-center mb-8 sm:mb-12">
              <FormattedMessage id="influencer.network.subtitle" defaultMessage="Recruit lawyers and expat helpers. Earn $5 per call they receive for 6 months!" />
            </p>

            <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-10 max-w-3xl mx-auto">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-500 rounded-full flex items-center justify-center shadow-xl mb-2" aria-hidden="true">
                  <Crown className="w-8 h-8 sm:w-10 sm:h-10 text-black" />
                </div>
                <span className="font-bold text-base sm:text-lg text-white"><FormattedMessage id="influencer.network.you" defaultMessage="YOU" /></span>
                <span className="text-xs sm:text-sm text-gray-400"><FormattedMessage id="influencer.network.you.earn" defaultMessage="$10/client + $5/call from partners" /></span>

                <div className="text-2xl sm:text-3xl my-3 sm:my-4 text-gray-600" aria-hidden="true">↓</div>

                <div className="flex justify-center gap-4 sm:gap-8">
                  {[
                    { emoji: '⚖️', label: intl.formatMessage({ id: 'influencer.network.lawyer', defaultMessage: 'Lawyer' }) },
                    { emoji: '🌍', label: intl.formatMessage({ id: 'influencer.network.helper', defaultMessage: 'Helper' }) },
                  ].map((item, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/10 rounded-full flex items-center justify-center text-xl sm:text-2xl">{item.emoji}</div>
                      <span className="mt-1 text-sm font-medium text-white">{item.label}</span>
                      <span className="text-xs text-green-400">+$5/call</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 sm:mt-8 bg-green-500/10 border border-green-500/30 rounded-2xl p-4 text-center">
                <p className="font-semibold text-sm sm:text-base text-white mb-1"><FormattedMessage id="influencer.network.example" defaultMessage="Example: 3 lawyers/helpers receiving 20 calls/month each" /></p>
                <p className="text-xl sm:text-2xl font-black text-green-400">= $300/month <FormattedMessage id="influencer.network.passive" defaultMessage="passive income for 6 months!" /></p>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 7 - SOCIAL PROOF
        ================================================================ */}
        <section className="section-content section-lazy bg-gray-950" aria-labelledby="section-proof">
          <div className="max-w-7xl mx-auto">
            <h2 id="section-proof" className="!text-3xl sm:!text-3xl lg:!text-4xl xl:!text-5xl font-black text-center text-white mb-8 sm:mb-12">
              <FormattedMessage id="influencer.social.title" defaultMessage="Influencers Are Earning Every Day" />
            </h2>

            <div className="grid grid-cols-3 gap-3 sm:gap-6 mb-8 sm:mb-12">
              {[
                { value: <AnimatedCounter end={847} />, label: intl.formatMessage({ id: 'influencer.stats.influencers', defaultMessage: 'Active Influencers' }), icon: '🎬' },
                { value: <><AnimatedCounter end={89} prefix="$" />K</>, label: intl.formatMessage({ id: 'influencer.stats.paid', defaultMessage: 'Paid This Month' }), icon: '💰' },
                { value: <AnimatedCounter end={52} />, label: intl.formatMessage({ id: 'influencer.stats.countries', defaultMessage: 'Countries' }), icon: '🌍' },
              ].map((stat, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-6 text-center">
                  <span className="text-xl sm:text-2xl block mb-2" aria-hidden="true">{stat.icon}</span>
                  <div className="text-xl sm:text-2xl lg:text-3xl font-black text-white">{stat.value}</div>
                  <div className="text-xs sm:text-sm text-gray-400 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Payment methods */}
            <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-center max-w-3xl mx-auto">
              <h3 className="text-base sm:text-lg font-bold text-white mb-4"><FormattedMessage id="influencer.payment.title" defaultMessage="Get Paid Your Way" /></h3>
              <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                {['🌐 Wise', '💳 PayPal', '🟠 Orange Money', '🌊 Wave', '💛 MTN MoMo', '💚 M-Pesa', '🏦 Bank'].map((m, i) => (
                  <span key={i} className="bg-white/10 text-white rounded-full px-3 sm:px-4 py-2 text-sm font-medium">{m}</span>
                ))}
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-4"><FormattedMessage id="influencer.payment.note" defaultMessage="Minimum $50 • Processed in 48h • Worldwide" /></p>
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 8 - FAQ
        ================================================================ */}
        <section className="section-content section-lazy bg-gradient-to-b from-gray-950 to-gray-950" id="faq" aria-labelledby="section-faq">
          <div className="max-w-3xl mx-auto">
            <h2 id="section-faq" className="!text-3xl sm:!text-3xl lg:!text-4xl xl:!text-5xl font-black text-center text-white mb-3 sm:mb-4">
              <FormattedMessage id="influencer.faq.title" defaultMessage="Questions?" />
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-400 text-center mb-8 sm:mb-10 lg:mb-12">
              <FormattedMessage id="influencer.faq.subtitle" defaultMessage="Everything you need to know" />
            </p>
            <div className="space-y-3 sm:space-y-4">
              {faqs.map((faq, i) => (
                <FAQItem key={i} index={i} question={faq.question} answer={faq.answer} isOpen={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? null : i)} />
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 9 - FINAL CTA
        ================================================================ */}
        <section className="section-content bg-gradient-to-b from-gray-950 via-red-950/20 to-black relative" aria-labelledby="section-cta-final">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(239,68,68,0.06),transparent_50%)]" aria-hidden="true" />

          <div className="relative z-10 max-w-4xl mx-auto text-center">
            <h2 id="section-cta-final" className="!text-2xl sm:!text-4xl lg:!text-5xl xl:!text-6xl font-black text-white mb-6 sm:mb-8">
              <FormattedMessage id="influencer.final.title" defaultMessage="Ready to Monetize Your Audience?" />
            </h2>

            <p className="text-base sm:text-lg lg:text-xl text-gray-300 mb-4 sm:mb-6">
              <FormattedMessage id="influencer.final.subtitle" defaultMessage="It's free, instant activation, promo tools included, works worldwide." />
            </p>

            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-8 sm:mb-10">
              {[
                { id: 'influencer.final.trust.1', dm: '100% Free' },
                { id: 'influencer.final.trust.2', dm: 'No Min Followers' },
                { id: 'influencer.final.trust.3', dm: 'All Countries' },
                { id: 'influencer.final.trust.4', dm: 'Promo Tools Included' },
              ].map((item, i) => (
                <span key={i} className="flex items-center gap-1.5 sm:gap-2 bg-amber-500/15 border border-amber-500/40 text-white rounded-full px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 text-sm sm:text-base font-medium">
                  <Check className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" aria-hidden="true" />
                  <FormattedMessage id={item.id} defaultMessage={item.dm} />
                </span>
              ))}
            </div>

            <CTAButton onClick={goToRegister} size="large" className="w-full max-w-sm sm:max-w-md mx-auto" ariaLabel={ctaAriaLabel}>
              <FormattedMessage id="influencer.final.cta" defaultMessage="Become an Influencer Now" />
            </CTAButton>

            <p className="text-gray-500 mt-5 sm:mt-6 text-sm sm:text-base">
              <FormattedMessage id="influencer.final.footer" defaultMessage="Free registration • Start in 5 minutes" />
            </p>
          </div>
        </section>

        {/* ================================================================
            STICKY CTA MOBILE
        ================================================================ */}
        {showStickyCTA && (
          <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} role="complementary" aria-label="CTA">
            <div className="bg-black/95 backdrop-blur-md border-t border-red-500/40 px-4 py-3">
              <button
                onClick={goToRegister}
                aria-label={ctaAriaLabel}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-extrabold py-3.5 sm:py-4 rounded-xl min-h-[48px] sm:min-h-[52px] active:scale-[0.98] text-base sm:text-lg will-change-transform"
              >
                <FormattedMessage id="influencer.sticky.cta" defaultMessage="Start Earning Now" />
                <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
};

export default InfluencerLanding;
