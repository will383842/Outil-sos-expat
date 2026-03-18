/**
 * PartnerLanding - B2B Premium Landing Page
 *
 * Dark premium design with cyan/blue identity for Partners.
 * Mobile-first, accessible, glassmorphism cards, micro-animations.
 * Targets: B2B partners — real estate agencies, banks, insurance companies,
 * relocation firms, law firms, associations, media, international corporations.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functionsAffiliate } from '@/config/firebase';
import Layout from '@/components/layout/Layout';
import HreflangLinks from '@/multilingual-system/components/HrefLang/HreflangLinks';
import { getLocaleString, getTranslatedRouteSlug } from '@/multilingual-system/core/routing/localeRoutes';
import { useApp } from '@/contexts/AppContext';
import {
  ArrowRight,
  Check,
  Plus,
  Minus,
  Globe,
  DollarSign,
  BarChart3,
  Link2,
  Users,
  Shield,
  TrendingUp,
  Zap,
  HeadphonesIcon,
  Award,
  Loader2,
  ExternalLink,
  Briefcase,
  Palette,
  Clock,
  CreditCard,
  Building2,
  Plane,
  Scale,
  Heart,
  Megaphone,
  GraduationCap,
  Handshake,
  MessageSquare,
  Code,
  Timer,
  Languages,
  PhoneCall,
  Landmark,
} from 'lucide-react';

// ============================================================================
// STYLES
// ============================================================================
const globalStyles = `
  @media (max-width: 768px) {
    .partner-landing h1 { font-size: 2.25rem !important; }
    .partner-landing h2 { font-size: 1.875rem !important; }
    .partner-landing h3 { font-size: 1.5rem !important; }
  }
  .partner-landing h1,
  .partner-landing h2,
  .partner-landing h3 {
    color: white;
  }
  .partner-landing h1 span,
  .partner-landing h2 span,
  .partner-landing h3 span {
    font-size: inherit;
  }
  @keyframes pulse-glow-cyan {
    0%, 100% { box-shadow: 0 0 20px rgba(6, 182, 212, 0.4); }
    50% { box-shadow: 0 0 40px rgba(6, 182, 212, 0.6); }
  }
  .animate-pulse-glow-cyan { animation: pulse-glow-cyan 2s ease-in-out infinite; }
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-8px); }
  }
  .animate-float { animation: float 3s ease-in-out infinite; }
  @keyframes count-up {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-count-up { animation: count-up 0.6s ease-out forwards; }
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
    .animate-bounce,
    .animate-pulse-glow-cyan,
    .animate-float,
    .animate-count-up,
    .transition-all,
    .transition-colors,
    .transition-transform {
      animation: none !important;
      transition: none !important;
    }
  }
  .glass-card {
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }
  .glass-card:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(6, 182, 212, 0.2);
  }
`;

// ============================================================================
// CONSTANTS
// ============================================================================
const CATEGORIES = [
  'expatriation', 'travel', 'legal', 'finance', 'insurance',
  'relocation', 'education', 'media', 'association', 'corporate', 'other',
] as const;

const TRAFFIC_TIERS = [
  'lt10k', '10k-50k', '50k-100k', '100k-500k', '500k-1m', 'gt1m',
] as const;

const COUNTRIES = [
  'AF','AL','DZ','AR','AU','AT','BE','BR','CA','CL','CN','CO','CZ','DK','EG',
  'FI','FR','DE','GR','HU','IN','ID','IE','IL','IT','JP','KE','KR','MA','MX',
  'NL','NZ','NG','NO','PK','PH','PL','PT','RO','RU','SA','SG','ZA','ES','SE',
  'CH','TH','TR','AE','GB','US','VN',
];

const LANGUAGES = ['fr','en','es','de','pt','ar','ch','ru','hi'] as const;

// ============================================================================
// SEO CONSTANTS (same pattern as Home.tsx for unification)
// ============================================================================
const SEO_CONSTANTS = {
  SITE_NAME: 'SOS Expat',
  BASE_URL: 'https://sos-expat.com',
  LOGO_URL: 'https://sos-expat.com/sos-logo.webp',
  OG_IMAGE_URL: 'https://sos-expat.com/og-image.png',
  TWITTER_HANDLE: '@sosexpat',
  SOCIAL: {
    facebook: 'https://facebook.com/sosexpat',
    linkedin: 'https://linkedin.com/company/sosexpat',
    twitter: 'https://twitter.com/sosexpat',
  },
} as const;

const OG_LOCALES: Record<string, string> = {
  fr: 'fr_FR', en: 'en_US', es: 'es_ES', de: 'de_DE',
  pt: 'pt_BR', ru: 'ru_RU', zh: 'zh_CN', ch: 'zh_CN', ar: 'ar_SA', hi: 'hi_IN',
};

const SUPPORTED_LANGS = ['fr', 'en', 'es', 'de', 'pt', 'ru', 'ch', 'ar', 'hi'] as const;

// ============================================================================
// FAQ ACCORDION
// ============================================================================
const FAQItem: React.FC<{
  questionId: string;
  answerId: string;
  isOpen: boolean;
  onToggle: () => void;
}> = ({ questionId, answerId, isOpen, onToggle }) => {
  return (
    <div className="border border-white/10 rounded-2xl overflow-hidden transition-colors duration-200 hover:border-white/20">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 px-5 sm:px-6 py-4 sm:py-5 text-left min-h-[48px]"
        aria-expanded={isOpen}
        aria-controls={`faq-answer-${answerId}`}
      >
        <span className="text-base sm:text-lg font-semibold text-white pr-2">
          <FormattedMessage id={questionId} />
        </span>
        <span className={`flex flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full items-center justify-center transition-all duration-300 ${isOpen ? 'bg-cyan-500 text-white' : 'bg-white/10 text-cyan-400'}`}>
          {isOpen ? (
            <Minus className="w-4 h-4 sm:w-5 sm:h-5" />
          ) : (
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
        </span>
      </button>
      <div
        id={`faq-answer-${answerId}`}
        role="region"
        aria-labelledby={questionId}
        className={`overflow-hidden transition-all duration-300 ease-out ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="px-5 sm:px-6 pb-5 sm:pb-6 text-sm sm:text-base text-gray-400 leading-relaxed">
          <FormattedMessage id={answerId} />
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// TRUSTED PARTNERS SECTION
// ============================================================================
const TrustedPartnersSection: React.FC = () => {
  const [partners, setPartners] = useState<Array<{
    id: string;
    websiteName: string;
    websiteLogo?: string;
    websiteUrl: string;
  }>>([]);

  useEffect(() => {
    const fetchPartners = async () => {
      try {
        const q = query(
          collection(db, 'partners'),
          where('isVisible', '==', true),
          where('status', '==', 'active')
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          websiteName: doc.data().websiteName || '',
          websiteLogo: doc.data().websiteLogo,
          websiteUrl: doc.data().websiteUrl || '',
        }));
        setPartners(data);
      } catch {
        // silent
      }
    };
    fetchPartners();
  }, []);

  if (partners.length === 0) return null;

  return (
    <section className="section-content section-lazy" aria-label="Trusted partners">
      <div className="max-w-6xl mx-auto text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400 mb-4">
          <FormattedMessage id="partner.landing.v2.trust.overline" defaultMessage="Partenaires actifs" />
        </p>
        <h2 className="text-3xl md:text-4xl font-bold mb-12">
          <FormattedMessage id="partner.landing.v2.trust.title" defaultMessage="Ils nous font confiance" />
        </h2>
        <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10">
          {partners.map((p) => (
            <a
              key={p.id}
              href={p.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 glass-card rounded-xl px-6 py-4 transition-all duration-200 group hover:scale-105"
              aria-label={`${p.websiteName} - partner website`}
            >
              {p.websiteLogo ? (
                <img
                  src={p.websiteLogo}
                  alt={p.websiteName}
                  className="h-10 w-auto object-contain"
                  loading="lazy"
                />
              ) : (
                <Globe className="w-8 h-8 text-cyan-400" />
              )}
              <span className="text-white font-medium">{p.websiteName}</span>
              <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-cyan-400 transition-colors" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

// ============================================================================
// ANIMATED COUNTER
// ============================================================================
const AnimatedStat: React.FC<{
  value: string;
  label: string;
  icon: React.ReactNode;
}> = ({ value, label, icon }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`text-center transition-all duration-700 ${visible ? 'animate-count-up' : 'opacity-0 translate-y-5'}`}
    >
      <div className="flex justify-center mb-3">{icon}</div>
      <div className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-2">
        {value}
      </div>
      <div className="text-gray-400 text-sm md:text-base">{label}</div>
    </div>
  );
};

// ============================================================================
// APPLICATION FORM
// ============================================================================
interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  language: string;
  websiteUrl: string;
  websiteName: string;
  websiteCategory: string;
  websiteTraffic: string;
  websiteDescription: string;
  message: string;
}

const INITIAL_FORM: FormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  country: '',
  language: '',
  websiteUrl: '',
  websiteName: '',
  websiteCategory: '',
  websiteTraffic: '',
  websiteDescription: '',
  message: '',
};

const ApplicationForm: React.FC = () => {
  const intl = useIntl();
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  };

  const validate = (): string | null => {
    if (!form.firstName.trim()) return intl.formatMessage({ id: 'partner.landing.form.error.firstName', defaultMessage: 'First name is required' });
    if (!form.lastName.trim()) return intl.formatMessage({ id: 'partner.landing.form.error.lastName', defaultMessage: 'Last name is required' });
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return intl.formatMessage({ id: 'partner.landing.form.error.email', defaultMessage: 'Valid email is required' });
    if (!form.country) return intl.formatMessage({ id: 'partner.landing.form.error.country', defaultMessage: 'Country is required' });
    if (!form.language) return intl.formatMessage({ id: 'partner.landing.form.error.language', defaultMessage: 'Language is required' });
    if (form.websiteUrl.trim() && !form.websiteUrl.startsWith('https://'))
      return intl.formatMessage({ id: 'partner.landing.form.error.websiteUrl', defaultMessage: 'Website URL must start with https://' });
    if (!form.websiteName.trim()) return intl.formatMessage({ id: 'partner.landing.form.error.websiteName', defaultMessage: 'Website name is required' });
    if (!form.websiteCategory) return intl.formatMessage({ id: 'partner.landing.form.error.category', defaultMessage: 'Category is required' });
    if (form.websiteDescription.length > 500)
      return intl.formatMessage({ id: 'partner.landing.form.error.descriptionTooLong', defaultMessage: 'Description must be under 500 characters' });
    if (form.message.length > 1000)
      return intl.formatMessage({ id: 'partner.landing.form.error.messageTooLong', defaultMessage: 'Message must be under 1000 characters' });
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const submitFn = httpsCallable(functionsAffiliate, 'submitPartnerApplication');
      await submitFn({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || undefined,
        country: form.country,
        language: form.language,
        websiteUrl: form.websiteUrl.trim() || undefined,
        websiteName: form.websiteName.trim(),
        websiteCategory: form.websiteCategory,
        websiteTraffic: form.websiteTraffic || undefined,
        websiteDescription: form.websiteDescription.trim() || undefined,
        message: form.message.trim() || undefined,
      });
      setSubmitted(true);
    } catch (err: any) {
      console.error('Submit partner application error:', err);
      setError(
        err?.message || intl.formatMessage({ id: 'partner.landing.form.error.generic', defaultMessage: 'An error occurred. Please try again.' })
      );
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full px-4 py-3 sm:py-3.5 bg-white/5 border border-white/10 rounded-xl text-sm sm:text-base text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all min-h-[48px]";
  const selectClass = "w-full px-4 py-3 sm:py-3.5 bg-white/5 border border-white/10 rounded-xl text-sm sm:text-base text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all appearance-none min-h-[48px]";
  const labelClass = "block text-sm sm:text-base font-medium text-gray-300 mb-1.5";

  if (submitted) {
    return (
      <div className="text-center py-16 px-6">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center">
          <Check className="w-10 h-10 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-4">
          <FormattedMessage id="partner.landing.form.success.title" defaultMessage="Message envoyé !" />
        </h3>
        <p className="text-gray-400 max-w-md mx-auto">
          <FormattedMessage id="partner.landing.form.success.message" defaultMessage="Merci pour votre intérêt. Notre équipe vous recontacte sous 48h pour discuter de votre partenariat." />
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* Row: firstName + lastName */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="pf-firstName" className={labelClass}>
            <FormattedMessage id="partner.landing.form.firstName" defaultMessage="First name" /> *
          </label>
          <input
            id="pf-firstName"
            type="text"
            name="firstName"
            value={form.firstName}
            onChange={handleChange}
            className={inputClass}
            required
            autoComplete="given-name"
          />
        </div>
        <div>
          <label htmlFor="pf-lastName" className={labelClass}>
            <FormattedMessage id="partner.landing.form.lastName" defaultMessage="Last name" /> *
          </label>
          <input
            id="pf-lastName"
            type="text"
            name="lastName"
            value={form.lastName}
            onChange={handleChange}
            className={inputClass}
            required
            autoComplete="family-name"
          />
        </div>
      </div>

      {/* Row: email + phone */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="pf-email" className={labelClass}>
            <FormattedMessage id="partner.landing.form.email" defaultMessage="Email" /> *
          </label>
          <input
            id="pf-email"
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            className={inputClass}
            required
            autoComplete="email"
          />
        </div>
        <div>
          <label htmlFor="pf-phone" className={labelClass}>
            <FormattedMessage id="partner.landing.form.phone" defaultMessage="Phone" />
          </label>
          <input
            id="pf-phone"
            type="tel"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            className={inputClass}
            autoComplete="tel"
          />
        </div>
      </div>

      {/* Row: country + language */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="pf-country" className={labelClass}>
            <FormattedMessage id="partner.landing.form.country" defaultMessage="Country" /> *
          </label>
          <select
            id="pf-country"
            name="country"
            value={form.country}
            onChange={handleChange}
            className={selectClass}
            required
          >
            <option value="">{intl.formatMessage({ id: 'partner.landing.form.selectCountry', defaultMessage: 'Select a country' })}</option>
            {COUNTRIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="pf-language" className={labelClass}>
            <FormattedMessage id="partner.landing.form.language" defaultMessage="Language" /> *
          </label>
          <select
            id="pf-language"
            name="language"
            value={form.language}
            onChange={handleChange}
            className={selectClass}
            required
          >
            <option value="">{intl.formatMessage({ id: 'partner.landing.form.selectLanguage', defaultMessage: 'Select a language' })}</option>
            {LANGUAGES.map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Website URL + name */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="pf-websiteUrl" className={labelClass}>
            <FormattedMessage id="partner.landing.form.websiteUrl" defaultMessage="Website URL" />
          </label>
          <input
            id="pf-websiteUrl"
            type="url"
            name="websiteUrl"
            value={form.websiteUrl}
            onChange={handleChange}
            placeholder="https://"
            className={inputClass}
            autoComplete="url"
          />
        </div>
        <div>
          <label htmlFor="pf-websiteName" className={labelClass}>
            <FormattedMessage id="partner.landing.form.websiteName" defaultMessage="Website name" /> *
          </label>
          <input
            id="pf-websiteName"
            type="text"
            name="websiteName"
            value={form.websiteName}
            onChange={handleChange}
            className={inputClass}
            required
            autoComplete="organization"
          />
        </div>
      </div>

      {/* Category + traffic */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="pf-category" className={labelClass}>
            <FormattedMessage id="partner.landing.form.category" defaultMessage="Website category" /> *
          </label>
          <select
            id="pf-category"
            name="websiteCategory"
            value={form.websiteCategory}
            onChange={handleChange}
            className={selectClass}
            required
          >
            <option value="">{intl.formatMessage({ id: 'partner.landing.form.selectCategory', defaultMessage: 'Select a category' })}</option>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>
                {intl.formatMessage({ id: `partner.landing.category.${c}`, defaultMessage: c })}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="pf-traffic" className={labelClass}>
            <FormattedMessage id="partner.landing.form.traffic" defaultMessage="Monthly traffic" />
          </label>
          <select
            id="pf-traffic"
            name="websiteTraffic"
            value={form.websiteTraffic}
            onChange={handleChange}
            className={selectClass}
          >
            <option value="">{intl.formatMessage({ id: 'partner.landing.form.selectTraffic', defaultMessage: 'Select traffic tier' })}</option>
            {TRAFFIC_TIERS.map(t => (
              <option key={t} value={t}>
                {intl.formatMessage({ id: `partner.landing.traffic.${t}`, defaultMessage: t })}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Website description */}
      <div>
        <label htmlFor="pf-description" className={labelClass}>
          <FormattedMessage id="partner.landing.form.websiteDescription" defaultMessage="Website description" />
          <span className="text-gray-500 ml-2">({form.websiteDescription.length}/500)</span>
        </label>
        <textarea
          id="pf-description"
          name="websiteDescription"
          value={form.websiteDescription}
          onChange={handleChange}
          maxLength={500}
          rows={3}
          className={inputClass}
        />
      </div>

      {/* Message */}
      <div>
        <label htmlFor="pf-message" className={labelClass}>
          <FormattedMessage id="partner.landing.form.message" defaultMessage="Message (optional)" />
          <span className="text-gray-500 ml-2">({form.message.length}/1000)</span>
        </label>
        <textarea
          id="pf-message"
          name="message"
          value={form.message}
          onChange={handleChange}
          maxLength={1000}
          rows={4}
          className={inputClass}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm" role="alert">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 sm:py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold text-base sm:text-lg rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[48px] sm:min-h-[56px] will-change-transform"
      >
        {submitting ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <FormattedMessage id="partner.landing.form.submit" defaultMessage="Nous contacter" />
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </button>
    </form>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const PartnerLanding: React.FC = () => {
  const intl = useIntl();
  const location = useLocation();
  const { language } = useApp();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showStickyCTA, setShowStickyCTA] = useState(false);

  const openContactModal = () => setShowContactModal(true);
  const closeContactModal = () => setShowContactModal(false);

  // Sticky CTA: show after scrolling past hero
  useEffect(() => {
    const onScroll = () => {
      setShowStickyCTA(window.scrollY > window.innerHeight * 0.8);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ======= URL Construction (same pattern as Home) =======
  const defaultLocale = getLocaleString(language as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar');
  const partnerSlug = getTranslatedRouteSlug('partner-landing' as any, language as any) || 'devenir-partenaire';
  const canonicalUrl = `${SEO_CONSTANTS.BASE_URL}/${defaultLocale}/${partnerSlug}`;

  // ======= SEO Meta Data =======
  const seoData = useMemo(() => ({
    title: intl.formatMessage({ id: 'partner.landing.v2.seo.title', defaultMessage: 'Programme Partenaire B2B - SOS-Expat | Assistance Juridique Expatriés' }),
    description: intl.formatMessage({ id: 'partner.landing.v2.seo.description', defaultMessage: 'Devenez partenaire SOS-Expat et offrez à vos clients un accès à des avocats et experts expatriation dans 197 pays. Accord sur mesure, outils d\'intégration, dashboard temps réel.' }),
    keywords: intl.formatMessage({ id: 'seo.partner.keywords', defaultMessage: 'partenaire SOS Expat, programme partenariat B2B expatriés, assistance juridique internationale, widget intégration, ambassade partenaire, assurance expatrié, relocation, association expatriés, avocat expatrié, aide administrative internationale, accord B2B sur mesure, service expatriation entreprise' }),
    ogTitle: intl.formatMessage({ id: 'seo.partner.ogTitle', defaultMessage: 'Programme Partenaire SOS-Expat | Offrez un Service Juridique d\'Exception à Vos Clients Expatriés' }),
    ogDescription: intl.formatMessage({ id: 'seo.partner.ogDescription', defaultMessage: 'Recommandez SOS-Expat à vos clients expatriés : avocats et experts dans 197 pays, 9 langues, 24/7. Accord de partenariat sur mesure, outils d\'intégration, account manager dédié.' }),
    twitterTitle: intl.formatMessage({ id: 'seo.partner.twitterTitle', defaultMessage: 'Partenaire SOS-Expat | Assistance Juridique Expatriés B2B' }),
    twitterDescription: intl.formatMessage({ id: 'seo.partner.twitterDescription', defaultMessage: 'Ambassades, entreprises, associations : offrez à vos clients expatriés un accès à des avocats et experts dans 197 pays. Widget, lien, QR code. Dashboard temps réel.' }),
  }), [intl]);

  // ======= JSON-LD Schema.org — Organization (enriched, with @id) =======
  const jsonLdOrganization = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SEO_CONSTANTS.BASE_URL}/#organization`,
    'name': SEO_CONSTANTS.SITE_NAME,
    'url': SEO_CONSTANTS.BASE_URL,
    'logo': {
      '@type': 'ImageObject',
      'url': SEO_CONSTANTS.LOGO_URL,
      'width': 512,
      'height': 512,
    },
    'description': seoData.description,
    'sameAs': Object.values(SEO_CONSTANTS.SOCIAL),
    'contactPoint': {
      '@type': 'ContactPoint',
      'contactType': 'partnerships',
      'availableLanguage': ['French', 'English', 'Spanish', 'German', 'Portuguese', 'Russian', 'Chinese', 'Arabic', 'Hindi'],
      'areaServed': 'Worldwide',
    },
    'knowsAbout': [
      'Expatriation', 'Legal assistance abroad', 'Immigration law', 'International relocation',
      'International law', 'B2B partnerships', 'Administrative assistance for expats',
      'Consular services', 'Cross-border legal advice', 'Expat support services',
    ],
  }), [seoData.description]);

  // ======= JSON-LD — WebSite (SearchAction) =======
  const jsonLdWebSite = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SEO_CONSTANTS.BASE_URL}/#website`,
    'name': SEO_CONSTANTS.SITE_NAME,
    'url': SEO_CONSTANTS.BASE_URL,
    'inLanguage': language,
    'potentialAction': {
      '@type': 'SearchAction',
      'target': {
        '@type': 'EntryPoint',
        'urlTemplate': `${SEO_CONSTANTS.BASE_URL}/recherche?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }), [language]);

  // ======= JSON-LD — FAQPage (8 FAQ items from the page) =======
  const jsonLdFAQ = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': Array.from({ length: 8 }, (_, i) => ({
      '@type': 'Question',
      'name': intl.formatMessage({ id: `partner.landing.v2.faq.q${i + 1}` }),
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': intl.formatMessage({ id: `partner.landing.v2.faq.a${i + 1}` }),
      },
    })),
  }), [intl]);

  // ======= JSON-LD — BreadcrumbList =======
  const jsonLdBreadcrumb = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      {
        '@type': 'ListItem',
        'position': 1,
        'name': intl.formatMessage({ id: 'breadcrumb.home', defaultMessage: 'Accueil' }),
        'item': `${SEO_CONSTANTS.BASE_URL}/${defaultLocale}`,
      },
      {
        '@type': 'ListItem',
        'position': 2,
        'name': intl.formatMessage({ id: 'partner.landing.v2.seo.title', defaultMessage: 'Programme Partenaire' }),
        'item': canonicalUrl,
      },
    ],
  }), [intl, defaultLocale, canonicalUrl]);

  // ======= JSON-LD — HowTo (4 steps from the page) =======
  const jsonLdHowTo = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    'name': intl.formatMessage({ id: 'partner.landing.v2.hero.badge', defaultMessage: 'Programme Partenaire Premium' }),
    'description': seoData.description,
    'totalTime': 'PT10M',
    'step': [
      {
        '@type': 'HowToStep',
        'position': 1,
        'name': intl.formatMessage({ id: 'partner.landing.v2.steps.apply.title', defaultMessage: 'Échangeons' }),
        'text': intl.formatMessage({ id: 'partner.landing.v2.steps.apply.desc', defaultMessage: 'Contactez-nous pour nous parler de votre organisation.' }),
      },
      {
        '@type': 'HowToStep',
        'position': 2,
        'name': intl.formatMessage({ id: 'partner.landing.v2.steps.negotiate.title', defaultMessage: 'Construisons ensemble' }),
        'text': intl.formatMessage({ id: 'partner.landing.v2.steps.negotiate.desc', defaultMessage: 'Nous définissons ensemble les termes de votre partenariat.' }),
      },
      {
        '@type': 'HowToStep',
        'position': 3,
        'name': intl.formatMessage({ id: 'partner.landing.v2.steps.integrate.title', defaultMessage: 'Intégrez' }),
        'text': intl.formatMessage({ id: 'partner.landing.v2.steps.integrate.desc', defaultMessage: 'Partagez votre lien, QR code ou intégrez notre widget.' }),
      },
      {
        '@type': 'HowToStep',
        'position': 4,
        'name': intl.formatMessage({ id: 'partner.landing.v2.steps.earn.title', defaultMessage: 'Profitez' }),
        'text': intl.formatMessage({ id: 'partner.landing.v2.steps.earn.desc', defaultMessage: 'Vos clients accèdent à un service d\'exception et vous profitez des avantages négociés.' }),
      },
    ],
  }), [intl, seoData.description]);

  // ======= JSON-LD — Speakable WebPage (AI) =======
  const jsonLdSpeakable = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${canonicalUrl}#webpage`,
    'url': canonicalUrl,
    'name': seoData.title,
    'description': seoData.description,
    'isPartOf': { '@id': `${SEO_CONSTANTS.BASE_URL}/#website` },
    'about': { '@id': `${SEO_CONSTANTS.BASE_URL}/#organization` },
    'speakable': {
      '@type': 'SpeakableSpecification',
      'cssSelector': ['#partner-heading', '#value-heading', '#howto-heading', '#faq-heading', '#cta-heading'],
    },
    'specialty': 'B2B Partner Program for Expatriation Services',
  }), [canonicalUrl, seoData]);

  // ======= JSON-LD — ProfessionalService (B2B offering) =======
  const jsonLdService = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': `${SEO_CONSTANTS.BASE_URL}/#partner-service`,
    'name': `${SEO_CONSTANTS.SITE_NAME} - Partner Program`,
    'url': canonicalUrl,
    'provider': { '@type': 'Organization', '@id': `${SEO_CONSTANTS.BASE_URL}/#organization` },
    'areaServed': { '@type': 'Place', 'name': 'Worldwide' },
    'serviceType': 'B2B Partnership Program',
    'description': seoData.description,
    'hasOfferCatalog': {
      '@type': 'OfferCatalog',
      'name': intl.formatMessage({ id: 'partner.landing.v2.value.custom.title', defaultMessage: 'Un partenariat sur mesure' }),
      'itemListElement': [
        {
          '@type': 'Offer',
          'itemOffered': {
            '@type': 'Service',
            'name': intl.formatMessage({ id: 'partner.landing.v2.value.monetize.title', defaultMessage: 'Un service complémentaire pour votre audience' }),
          },
        },
        {
          '@type': 'Offer',
          'itemOffered': {
            '@type': 'Service',
            'name': intl.formatMessage({ id: 'partner.landing.v2.value.tools.title', defaultMessage: 'Outils clés en main' }),
          },
        },
      ],
    },
  }), [intl, canonicalUrl, seoData.description]);

  // ---- Value proposition cards ----
  const valueCards = [
    {
      icon: Users,
      gradient: 'from-cyan-500 to-blue-500',
      titleId: 'partner.landing.v2.value.monetize.title',
      titleDefault: 'Un service complémentaire pour votre audience',
      descId: 'partner.landing.v2.value.monetize.desc',
      descDefault: 'Vos clients, membres ou abonnés ont besoin d\'aide juridique et administrative à l\'étranger. SOS-Expat prend en charge ce service pour vous : une tâche en moins, une vraie valeur ajoutée pour votre communauté.',
    },
    {
      icon: Handshake,
      gradient: 'from-blue-500 to-indigo-500',
      titleId: 'partner.landing.v2.value.custom.title',
      titleDefault: 'Un partenariat sur mesure',
      descId: 'partner.landing.v2.value.custom.desc',
      descDefault: 'Chaque collaboration est unique. Nous construisons ensemble un accord adapté à vos objectifs : commissions, réductions pour vos clients, co-branding, ou toute formule qui vous convient.',
    },
    {
      icon: Code,
      gradient: 'from-indigo-500 to-purple-500',
      titleId: 'partner.landing.v2.value.tools.title',
      titleDefault: 'Outils clés en main',
      descId: 'partner.landing.v2.value.tools.desc',
      descDefault: 'Widget intégrable, lien affilié, QR code, dashboard de suivi et un account manager dédié pour piloter votre partenariat.',
    },
  ];

  // ---- How it works steps ----
  const steps = [
    {
      icon: MessageSquare,
      color: 'from-cyan-500 to-blue-500',
      titleId: 'partner.landing.v2.steps.apply.title',
      titleDefault: 'Échangeons',
      descId: 'partner.landing.v2.steps.apply.desc',
      descDefault: 'Contactez-nous pour nous parler de votre organisation et de votre audience. Nous vous répondons sous 48h.',
    },
    {
      icon: Handshake,
      color: 'from-blue-500 to-indigo-500',
      titleId: 'partner.landing.v2.steps.negotiate.title',
      titleDefault: 'Construisons ensemble',
      descId: 'partner.landing.v2.steps.negotiate.desc',
      descDefault: 'Nous définissons ensemble les termes de votre partenariat : services pour vos clients, avantages mutuels, mode de recommandation.',
    },
    {
      icon: Code,
      color: 'from-indigo-500 to-purple-500',
      titleId: 'partner.landing.v2.steps.integrate.title',
      titleDefault: 'Intégrez',
      descId: 'partner.landing.v2.steps.integrate.desc',
      descDefault: 'Partagez votre lien, QR code ou intégrez notre widget sur votre site. Notre équipe vous accompagne.',
    },
    {
      icon: TrendingUp,
      color: 'from-purple-500 to-pink-500',
      titleId: 'partner.landing.v2.steps.earn.title',
      titleDefault: 'Profitez',
      descId: 'partner.landing.v2.steps.earn.desc',
      descDefault: 'Vos clients accèdent à un service d\'exception, et vous bénéficiez des avantages négociés dans votre accord. Suivi en temps réel.',
    },
  ];

  // ---- Partner profiles ----
  const partnerProfiles = [
    { icon: Landmark, titleId: 'partner.landing.v2.profiles.embassy', titleDefault: 'Ambassades & consulats' },
    { icon: Building2, titleId: 'partner.landing.v2.profiles.realestate', titleDefault: 'Agences immobilières' },
    { icon: CreditCard, titleId: 'partner.landing.v2.profiles.banking', titleDefault: 'Banques & fintech' },
    { icon: Shield, titleId: 'partner.landing.v2.profiles.insurance', titleDefault: 'Compagnies d\'assurance' },
    { icon: Plane, titleId: 'partner.landing.v2.profiles.relocation', titleDefault: 'Cabinets de relocation' },
    { icon: Scale, titleId: 'partner.landing.v2.profiles.legal', titleDefault: 'Cabinets d\'avocats' },
    { icon: Heart, titleId: 'partner.landing.v2.profiles.association', titleDefault: 'Associations (toutes nationalités)' },
    { icon: Megaphone, titleId: 'partner.landing.v2.profiles.media', titleDefault: 'Médias & presse' },
    { icon: GraduationCap, titleId: 'partner.landing.v2.profiles.education', titleDefault: 'Écoles & universités' },
    { icon: Briefcase, titleId: 'partner.landing.v2.profiles.corporate', titleDefault: 'Entreprises internationales' },
  ];

  // ---- Advantages ----
  const advantages = [
    {
      icon: DollarSign,
      titleId: 'partner.landing.v2.advantages.commission.title',
      titleDefault: 'Accord flexible et négocié',
      descId: 'partner.landing.v2.advantages.commission.desc',
      descDefault: 'Pas de formule imposée. Nous adaptons les termes du partenariat à vos objectifs : commissions, avantages clients, visibilité croisée.',
    },
    {
      icon: BarChart3,
      titleId: 'partner.landing.v2.advantages.dashboard.title',
      titleDefault: 'Dashboard temps réel',
      descId: 'partner.landing.v2.advantages.dashboard.desc',
      descDefault: 'Suivez vos clics, appels et revenus en direct depuis votre tableau de bord partenaire.',
    },
    {
      icon: Palette,
      titleId: 'partner.landing.v2.advantages.widget.title',
      titleDefault: 'Widget personnalisable',
      descId: 'partner.landing.v2.advantages.widget.desc',
      descDefault: 'Widget, lien affilié, QR code : choisissez le format qui convient à votre activité. Tout est personnalisable.',
    },
    {
      icon: HeadphonesIcon,
      titleId: 'partner.landing.v2.advantages.manager.title',
      titleDefault: 'Account manager dédié',
      descId: 'partner.landing.v2.advantages.manager.desc',
      descDefault: 'Un interlocuteur unique pour répondre à vos questions, optimiser vos performances et vous accompagner.',
    },
    {
      icon: Award,
      titleId: 'partner.landing.v2.advantages.discount.title',
      titleDefault: 'Réduction pour votre audience',
      descId: 'partner.landing.v2.advantages.discount.desc',
      descDefault: 'Offrez une valeur ajoutée à vos clients avec une réduction négociée sur les appels SOS-Expat.',
    },
    {
      icon: CreditCard,
      titleId: 'partner.landing.v2.advantages.payment.title',
      titleDefault: 'Paiement rapide',
      descId: 'partner.landing.v2.advantages.payment.desc',
      descDefault: 'Recevez vos commissions par Wise, PayPal, virement bancaire ou Mobile Money. À vous de choisir.',
    },
  ];

  // ---- Key stats ----
  const stats = [
    {
      value: '197',
      labelId: 'partner.landing.v2.stats.countries',
      labelDefault: 'pays couverts',
      icon: <Globe className="w-8 h-8 text-cyan-400" />,
    },
    {
      value: '9',
      labelId: 'partner.landing.v2.stats.languages',
      labelDefault: 'langues supportées',
      icon: <Languages className="w-8 h-8 text-cyan-400" />,
    },
    {
      value: '24/7',
      labelId: 'partner.landing.v2.stats.availability',
      labelDefault: 'disponibilité',
      icon: <Clock className="w-8 h-8 text-cyan-400" />,
    },
    {
      value: '< 5 min',
      labelId: 'partner.landing.v2.stats.connection',
      labelDefault: 'mise en relation',
      icon: <PhoneCall className="w-8 h-8 text-cyan-400" />,
    },
  ];

  // ---- FAQ (8 questions) ----
  const faqKeys = [
    { q: 'partner.landing.v2.faq.q1', a: 'partner.landing.v2.faq.a1' },
    { q: 'partner.landing.v2.faq.q2', a: 'partner.landing.v2.faq.a2' },
    { q: 'partner.landing.v2.faq.q3', a: 'partner.landing.v2.faq.a3' },
    { q: 'partner.landing.v2.faq.q4', a: 'partner.landing.v2.faq.a4' },
    { q: 'partner.landing.v2.faq.q5', a: 'partner.landing.v2.faq.a5' },
    { q: 'partner.landing.v2.faq.q6', a: 'partner.landing.v2.faq.a6' },
    { q: 'partner.landing.v2.faq.q7', a: 'partner.landing.v2.faq.a7' },
    { q: 'partner.landing.v2.faq.q8', a: 'partner.landing.v2.faq.a8' },
  ];

  return (
    <Layout showFooter={false}>
      {/* ================= SEO HEAD — FULL (unified with Home.tsx) ================= */}
      <Helmet>
        {/* Base */}
        <html lang={language} />
        <title>{seoData.title}</title>
        <meta name="title" content={seoData.title} />
        <meta name="description" content={seoData.description} />
        <meta name="keywords" content={seoData.keywords} />
        <meta name="author" content={SEO_CONSTANTS.SITE_NAME} />

        {/* Robots */}
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <meta name="googlebot" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />

        {/* Viewport & charset */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />

        {/* Other meta */}
        <meta name="language" content={language} />
        <meta name="revisit-after" content="7 days" />
        <meta name="rating" content="general" />
        <meta name="distribution" content="global" />

        {/* AI-specific meta signals */}
        <meta name="ai-crawlable" content="true" />
        <meta name="content-language" content={language} />
        <meta name="document-state" content="dynamic" />
        <meta name="content-type" content="B2B Partner Landing Page" />
        <meta name="expertise-level" content="professional" />
        <meta name="trustworthiness" content="high" />
        <meta name="content-quality" content="high" />
        <meta name="summary" content={seoData.ogDescription} />

        {/* Canonical */}
        <link rel="canonical" href={canonicalUrl} />

        {/* Hreflang — handled by HreflangLinks component below (avoids duplicate hreflang) */}

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content={SEO_CONSTANTS.SITE_NAME} />
        <meta property="og:title" content={seoData.ogTitle} />
        <meta property="og:description" content={seoData.ogDescription} />
        <meta property="og:image" content={SEO_CONSTANTS.OG_IMAGE_URL} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={seoData.ogTitle} />
        <meta property="og:locale" content={OG_LOCALES[language] || 'en_US'} />
        {SUPPORTED_LANGS.filter(l => l !== language).map((lang) => (
          <meta key={lang} property="og:locale:alternate" content={OG_LOCALES[lang]} />
        ))}

        {/* Twitter Cards */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={canonicalUrl} />
        <meta name="twitter:title" content={seoData.twitterTitle} />
        <meta name="twitter:description" content={seoData.twitterDescription} />
        <meta name="twitter:image" content={SEO_CONSTANTS.OG_IMAGE_URL} />
        <meta name="twitter:site" content={SEO_CONSTANTS.TWITTER_HANDLE} />
        <meta name="twitter:creator" content={SEO_CONSTANTS.TWITTER_HANDLE} />

        {/* Security */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />

        {/* Preconnect — ordered by priority */}
        <link rel="preconnect" href="https://firestore.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://firebasestorage.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />

        {/* JSON-LD Schema.org — 7 schemas (same as Home) */}
        <script type="application/ld+json">
          {JSON.stringify(jsonLdOrganization)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(jsonLdWebSite)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(jsonLdService)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(jsonLdFAQ)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(jsonLdBreadcrumb)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(jsonLdSpeakable)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(jsonLdHowTo)}
        </script>
      </Helmet>
      {/* HreflangLinks removed: handled globally in App.tsx L1086 */}

      <style>{globalStyles}</style>

      <div className="partner-landing bg-black text-white min-h-screen">

        {/* ================================================================
            SECTION 1 — HERO
        ================================================================ */}
        <section
          className="relative overflow-hidden min-h-[100svh] flex items-center"
          aria-label={intl.formatMessage({ id: 'partner.landing.v2.hero.ariaLabel', defaultMessage: 'Partner program hero' })}
        >
          {/* Background layers */}
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/30 via-black to-blue-950/30" aria-hidden="true" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(6,182,212,0.08),transparent_50%)]" aria-hidden="true" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(59,130,246,0.08),transparent_50%)]" aria-hidden="true" />

          {/* Floating decorative elements */}
          <div className="absolute top-20 left-10 w-72 h-72 bg-cyan-500/5 rounded-full blur-3xl animate-float" aria-hidden="true" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} aria-hidden="true" />

          <div className="relative section-content w-full pt-20 pb-16 md:pt-28 md:pb-24">
            <div className="max-w-5xl mx-auto text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-5 py-2.5 glass-card rounded-full text-cyan-400 text-sm font-semibold mb-8">
                <Zap className="w-4 h-4" />
                <FormattedMessage id="partner.landing.v2.hero.badge" defaultMessage="Programme Partenaire Premium" />
              </div>

              {/* Headline */}
              <h1 id="partner-heading" className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.1] mb-6 tracking-tight">
                <FormattedMessage
                  id="partner.landing.v2.hero.title"
                  defaultMessage="Un service juridique et administratif complet pour vos clients {highlight}"
                  values={{
                    highlight: (
                      <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                        {intl.formatMessage({ id: 'partner.landing.v2.hero.highlight', defaultMessage: 'expatriés' })}
                      </span>
                    ),
                  }}
                />
              </h1>

              {/* Subtitle */}
              <p className="text-lg md:text-xl lg:text-2xl text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed">
                <FormattedMessage
                  id="partner.landing.v2.hero.subtitle"
                  defaultMessage="Offrez à vos clients, membres ou abonnés un accès direct à des avocats et experts expatriation dans 197 pays, 24h/24. Une tâche en moins pour vos équipes, un service complémentaire d'exception pour votre communauté."
                />
              </p>

              {/* CTA */}
              <button
                onClick={openContactModal}
                className="inline-flex items-center gap-3 px-8 sm:px-10 py-4 sm:py-5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold text-base sm:text-lg rounded-2xl transition-all active:scale-[0.98] animate-pulse-glow-cyan min-h-[48px] sm:min-h-[56px] shadow-2xl shadow-cyan-500/20 will-change-transform"
                aria-label={intl.formatMessage({ id: 'partner.landing.v2.hero.cta.aria', defaultMessage: 'Ouvrir le formulaire de contact partenaire' })}
              >
                <FormattedMessage id="partner.landing.v2.hero.cta" defaultMessage="Discutons de votre partenariat" />
                <ArrowRight className="w-5 h-5" />
              </button>

              {/* Trust indicators */}
              <div className="mt-14 flex flex-wrap justify-center gap-6 md:gap-10">
                {[
                  { icon: Globe, text: intl.formatMessage({ id: 'partner.landing.v2.hero.trust.countries', defaultMessage: '197 pays' }) },
                  { icon: Languages, text: intl.formatMessage({ id: 'partner.landing.v2.hero.trust.languages', defaultMessage: '9 langues' }) },
                  { icon: Clock, text: intl.formatMessage({ id: 'partner.landing.v2.hero.trust.availability', defaultMessage: '24/7' }) },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-gray-400">
                    <item.icon className="w-5 h-5 text-cyan-400" />
                    <span className="text-sm font-medium">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce hidden sm:flex flex-col items-center gap-1" aria-hidden="true">
            <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-1.5">
              <div className="w-1.5 h-3 rounded-full bg-cyan-400/60 animate-pulse" />
            </div>
          </div>

          {/* Bottom gradient fade */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black to-transparent" aria-hidden="true" />
        </section>

        {/* ================================================================
            SECTION 2 — TRUSTED PARTNERS (from Firestore)
        ================================================================ */}
        <TrustedPartnersSection />

        {/* ================================================================
            SECTION 3 — PROPOSITION DE VALEUR
        ================================================================ */}
        <section className="section-content section-lazy" aria-labelledby="value-heading">
          <div className="max-w-6xl mx-auto">
            <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400 text-center mb-4">
              <FormattedMessage id="partner.landing.v2.value.overline" defaultMessage="Pourquoi SOS-Expat ?" />
            </p>
            <h2 id="value-heading" className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-16">
              <FormattedMessage id="partner.landing.v2.value.title" defaultMessage="Pourquoi devenir partenaire ?" />
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {valueCards.map((card, i) => {
                const Icon = card.icon;
                return (
                  <div
                    key={i}
                    className="glass-card rounded-2xl p-8 transition-all duration-300 hover:scale-[1.02] group"
                  >
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-r ${card.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">
                      <FormattedMessage id={card.titleId} defaultMessage={card.titleDefault} />
                    </h3>
                    <p className="text-gray-400 leading-relaxed">
                      <FormattedMessage id={card.descId} defaultMessage={card.descDefault} />
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Inline CTA after value props */}
            <div className="text-center mt-12">
              <button
                onClick={openContactModal}
                className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold text-base sm:text-lg rounded-2xl transition-all active:scale-[0.98] min-h-[48px] sm:min-h-[56px] shadow-lg shadow-cyan-500/10 will-change-transform"
              >
                <FormattedMessage id="partner.landing.v2.inline.cta" defaultMessage="Discutons de votre partenariat" />
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 4 — COMMENT CA MARCHE
        ================================================================ */}
        <section
          className="section-content section-lazy bg-gradient-to-b from-black via-gray-950 to-black"
          aria-labelledby="howto-heading"
        >
          <div className="max-w-6xl mx-auto">
            <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400 text-center mb-4">
              <FormattedMessage id="partner.landing.v2.steps.overline" defaultMessage="Simple et rapide" />
            </p>
            <h2 id="howto-heading" className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-16">
              <FormattedMessage id="partner.landing.v2.steps.title" defaultMessage="Comment ça marche" />
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
              {/* Connecting line (desktop only) */}
              <div className="hidden lg:block absolute top-8 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-cyan-500/30 via-indigo-500/30 to-purple-500/30" aria-hidden="true" />

              {steps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={i} className="text-center relative">
                    <div className="relative mb-6 inline-block">
                      <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-r ${step.color} flex items-center justify-center shadow-lg`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-black border-2 border-cyan-400 flex items-center justify-center text-sm font-bold text-cyan-400">
                        {i + 1}
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      <FormattedMessage id={step.titleId} defaultMessage={step.titleDefault} />
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">
                      <FormattedMessage id={step.descId} defaultMessage={step.descDefault} />
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 5 — POUR QUI
        ================================================================ */}
        <section className="section-content section-lazy" aria-labelledby="profiles-heading">
          <div className="max-w-6xl mx-auto">
            <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400 text-center mb-4">
              <FormattedMessage id="partner.landing.v2.profiles.overline" defaultMessage="Tous les secteurs concernés" />
            </p>
            <h2 id="profiles-heading" className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-6">
              <FormattedMessage id="partner.landing.v2.profiles.title" defaultMessage="Qui peut devenir partenaire ?" />
            </h2>
            <p className="text-gray-400 text-center max-w-2xl mx-auto mb-14 text-lg">
              <FormattedMessage
                id="partner.landing.v2.profiles.subtitle"
                defaultMessage="Entreprises, ambassades, consulats, associations, institutions — toute organisation en contact avec des expatriés, voyageurs ou professionnels en mobilité internationale, partout dans le monde."
              />
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
              {partnerProfiles.map((profile, i) => {
                const Icon = profile.icon;
                return (
                  <div
                    key={i}
                    className="glass-card rounded-2xl p-6 text-center transition-all duration-300 hover:scale-[1.03] hover:border-cyan-500/30 group"
                  >
                    <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 flex items-center justify-center mb-4 group-hover:from-cyan-500/20 group-hover:to-blue-500/20 transition-colors">
                      <Icon className="w-6 h-6 text-cyan-400" />
                    </div>
                    <h3 className="text-sm md:text-base font-semibold">
                      <FormattedMessage id={profile.titleId} defaultMessage={profile.titleDefault} />
                    </h3>
                  </div>
                );
              })}
            </div>

            {/* Inline CTA after profiles */}
            <div className="text-center mt-12">
              <button
                onClick={openContactModal}
                className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 border-2 border-cyan-500/50 hover:border-cyan-400 hover:bg-cyan-500/10 text-cyan-400 font-bold text-base sm:text-lg rounded-2xl transition-all active:scale-[0.98] min-h-[48px] sm:min-h-[56px] will-change-transform"
              >
                <FormattedMessage id="partner.landing.v2.inline.cta2" defaultMessage="Votre secteur est concerné ? Parlons-en" />
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 6 — AVANTAGES
        ================================================================ */}
        <section
          className="section-content section-lazy bg-gradient-to-b from-black via-gray-950 to-black"
          aria-labelledby="advantages-heading"
        >
          <div className="max-w-6xl mx-auto">
            <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400 text-center mb-4">
              <FormattedMessage id="partner.landing.v2.advantages.overline" defaultMessage="Vos avantages" />
            </p>
            <h2 id="advantages-heading" className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-16">
              <FormattedMessage id="partner.landing.v2.advantages.title" defaultMessage="Tout ce dont vous avez besoin" />
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {advantages.map((adv, i) => {
                const Icon = adv.icon;
                return (
                  <div
                    key={i}
                    className="glass-card rounded-2xl p-7 transition-all duration-300 hover:scale-[1.02] group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 flex items-center justify-center mb-5 group-hover:from-cyan-500/30 group-hover:to-blue-500/30 transition-colors">
                      <Icon className="w-6 h-6 text-cyan-400" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      <FormattedMessage id={adv.titleId} defaultMessage={adv.titleDefault} />
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      <FormattedMessage id={adv.descId} defaultMessage={adv.descDefault} />
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 7 — CHIFFRES CLES
        ================================================================ */}
        <section className="section-content section-lazy" aria-labelledby="stats-heading">
          <div className="max-w-5xl mx-auto">
            <h2 id="stats-heading" className="sr-only">
              <FormattedMessage id="partner.landing.v2.stats.title" defaultMessage="Key figures" />
            </h2>

            <div className="glass-card rounded-3xl p-8 md:p-12 lg:p-16">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
                {stats.map((stat, i) => (
                  <AnimatedStat
                    key={i}
                    value={stat.value}
                    label={intl.formatMessage({ id: stat.labelId, defaultMessage: stat.labelDefault })}
                    icon={stat.icon}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 8 — FAQ
        ================================================================ */}
        <section
          className="section-content section-lazy bg-gradient-to-b from-black via-gray-950 to-black"
          aria-labelledby="faq-heading"
        >
          <div className="max-w-3xl mx-auto">
            <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400 text-center mb-4">
              <FormattedMessage id="partner.landing.v2.faq.overline" defaultMessage="FAQ" />
            </p>
            <h2 id="faq-heading" className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-12">
              <FormattedMessage id="partner.landing.v2.faq.title" defaultMessage="Questions fréquentes" />
            </h2>

            <div className="space-y-3" role="list">
              {faqKeys.map((faq, i) => (
                <FAQItem
                  key={i}
                  questionId={faq.q}
                  answerId={faq.a}
                  isOpen={openFaq === i}
                  onToggle={() => setOpenFaq(openFaq === i ? null : i)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 9 — CTA FINAL (Partnership value)
        ================================================================ */}
        <section
          className="section-content section-lazy relative"
          aria-labelledby="cta-heading"
        >
          {/* Background accent */}
          <div className="absolute inset-0 bg-gradient-to-b from-black via-cyan-950/10 to-black" aria-hidden="true" />

          <div className="relative max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 glass-card rounded-full text-cyan-400 text-sm font-semibold mb-6">
              <Handshake className="w-4 h-4" />
              <FormattedMessage id="partner.landing.v2.cta.badge" defaultMessage="Sans engagement" />
            </div>

            <h2 id="cta-heading" className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              <FormattedMessage id="partner.landing.v2.cta.title" defaultMessage="Offrez un service d'exception à votre communauté" />
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-6 leading-relaxed">
              <FormattedMessage
                id="partner.landing.v2.cta.subtitle"
                defaultMessage="Un partenariat avec SOS-Expat, c'est un service complémentaire pour vos clients, une tâche en moins pour vos équipes, et une vraie valeur ajoutée pour votre organisation. Parlons-en."
              />
            </p>
            <p className="text-gray-500 text-sm mb-10">
              <FormattedMessage
                id="partner.landing.v2.cta.reassurance"
                defaultMessage="Aucun engagement, aucun frais. Notre équipe vous recontacte sous 48h."
              />
            </p>

            <button
              onClick={openContactModal}
              className="inline-flex items-center gap-3 px-8 sm:px-12 py-4 sm:py-5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold text-base sm:text-lg rounded-2xl transition-all active:scale-[0.98] animate-pulse-glow-cyan min-h-[48px] sm:min-h-[56px] shadow-2xl shadow-cyan-500/20 will-change-transform"
            >
              <FormattedMessage id="partner.landing.v2.cta.button" defaultMessage="Démarrer la conversation" />
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </section>

        {/* ================================================================
            MODAL — Contact Form (Popup)
        ================================================================ */}
        {showContactModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-heading"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={closeContactModal}
              aria-hidden="true"
            />

            {/* Modal content */}
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-950 border border-white/10 rounded-3xl p-6 md:p-10 shadow-2xl">
              {/* Close button */}
              <button
                onClick={closeContactModal}
                className="absolute top-3 right-3 sm:top-4 sm:right-4 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                aria-label={intl.formatMessage({ id: 'partner.landing.v2.modal.close', defaultMessage: 'Fermer' })}
              >
                <Plus className="w-5 h-5 text-gray-400 rotate-45" />
              </button>

              <div className="text-center mb-8">
                <h3 id="modal-heading" className="text-2xl md:text-3xl font-bold text-white mb-3">
                  <FormattedMessage id="partner.landing.v2.modal.title" defaultMessage="Parlons de votre partenariat" />
                </h3>
                <p className="text-gray-400">
                  <FormattedMessage id="partner.landing.v2.modal.subtitle" defaultMessage="Partagez-nous quelques informations, nous vous recontactons sous 48h pour construire ensemble votre partenariat." />
                </p>
              </div>

              <ApplicationForm />

              <p className="text-center text-gray-500 text-xs mt-6">
                <FormattedMessage
                  id="partner.landing.v2.modal.footer"
                  defaultMessage="En soumettant ce formulaire, vous acceptez d'être contacté par l'équipe SOS-Expat. Aucun engagement, aucun frais."
                />
              </p>
            </div>
          </div>
        )}

        {/* ================================================================
            MINI FOOTER
        ================================================================ */}
        <footer className="border-t border-white/5 py-8 pb-24 lg:pb-8 text-center" role="contentinfo">
          <p className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} SOS-Expat.{' '}
            <FormattedMessage id="partner.landing.v2.footer.rights" defaultMessage="Tous droits réservés." />
          </p>
        </footer>
      </div>

      {/* ================================================================
          STICKY CTA — Mobile only (same pattern as affiliate pages)
      ================================================================ */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 lg:hidden transition-all duration-300 ${showStickyCTA && !showContactModal ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="bg-black/90 backdrop-blur-md border-t border-white/10 px-4 py-3">
          <button
            onClick={openContactModal}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold text-base rounded-2xl transition-all active:scale-[0.98] min-h-[48px] sm:min-h-[52px] shadow-lg shadow-cyan-500/20 will-change-transform"
          >
            <FormattedMessage id="partner.landing.v2.hero.cta" defaultMessage="Discutons de votre partenariat" />
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default PartnerLanding;
