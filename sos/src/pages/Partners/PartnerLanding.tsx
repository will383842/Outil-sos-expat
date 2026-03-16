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
import { collection, query, where, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functionsAffiliate } from '@/config/firebase';
import Layout from '@/components/layout/Layout';
import SEOHead from '@/components/layout/SEOHead';
import HreflangLinks from '@/multilingual-system/components/HrefLang/HreflangLinks';
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
// FAQ ACCORDION
// ============================================================================
const FAQItem: React.FC<{
  questionId: string;
  answerId: string;
  isOpen: boolean;
  onToggle: () => void;
}> = ({ questionId, answerId, isOpen, onToggle }) => {
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden glass-card">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition-colors min-h-[44px]"
        aria-expanded={isOpen}
        aria-controls={`faq-answer-${answerId}`}
      >
        <span className="text-white font-medium pr-4">
          <FormattedMessage id={questionId} />
        </span>
        {isOpen ? (
          <Minus className="w-5 h-5 text-cyan-400 flex-shrink-0" />
        ) : (
          <Plus className="w-5 h-5 text-cyan-400 flex-shrink-0" />
        )}
      </button>
      <div
        id={`faq-answer-${answerId}`}
        role="region"
        aria-labelledby={questionId}
        className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="px-5 pb-5 text-gray-400 leading-relaxed">
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

  const inputClass = "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all min-h-[44px]";
  const selectClass = "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all appearance-none min-h-[44px]";
  const labelClass = "block text-sm font-medium text-gray-300 mb-1.5";

  if (submitted) {
    return (
      <div className="text-center py-16 px-6">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center">
          <Check className="w-10 h-10 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-4">
          <FormattedMessage id="partner.landing.form.success.title" defaultMessage="Application received!" />
        </h3>
        <p className="text-gray-400 max-w-md mx-auto">
          <FormattedMessage id="partner.landing.form.success.message" defaultMessage="Thank you for your interest. Our team will review your application and get back to you within 48 hours." />
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
        className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold text-lg rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
      >
        {submitting ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <FormattedMessage id="partner.landing.form.submit" defaultMessage="Submit application" />
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
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const applyRef = useRef<HTMLDivElement>(null);

  const scrollToApply = () => {
    applyRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Schema.org Organization JSON-LD
  const organizationJsonLd = useMemo(() => JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'SOS-Expat',
    url: 'https://www.sos-expat.com',
    logo: 'https://www.sos-expat.com/og-image.png',
    description: intl.formatMessage({
      id: 'partner.landing.v2.seo.description',
      defaultMessage: 'Monetize your expat audience with the SOS-Expat partner program. Custom commissions, integration tools, and dedicated support.',
    }),
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'partnerships',
      availableLanguage: ['French', 'English', 'Spanish', 'German', 'Portuguese', 'Arabic', 'Russian', 'Hindi', 'Chinese'],
    },
  }), [intl]);

  // ---- Value proposition cards ----
  const valueCards = [
    {
      icon: TrendingUp,
      gradient: 'from-cyan-500 to-blue-500',
      titleId: 'partner.landing.v2.value.monetize.title',
      titleDefault: 'Nouvelle source de revenus',
      descId: 'partner.landing.v2.value.monetize.desc',
      descDefault: 'Vos clients ont déjà besoin d\'aide juridique et administrative à l\'étranger. Recommandez SOS-Expat et touchez des commissions sur chaque appel.',
    },
    {
      icon: Handshake,
      gradient: 'from-blue-500 to-indigo-500',
      titleId: 'partner.landing.v2.value.custom.title',
      titleDefault: 'Commissions sur mesure',
      descId: 'partner.landing.v2.value.custom.desc',
      descDefault: 'Chaque partenariat est unique. Nous négocions les taux en fonction de votre secteur, volume et profil client. Pas de grille fixe.',
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
      titleDefault: 'Postulez',
      descId: 'partner.landing.v2.steps.apply.desc',
      descDefault: 'Remplissez le formulaire ci-dessous avec les informations sur votre entreprise et votre clientèle.',
    },
    {
      icon: Handshake,
      color: 'from-blue-500 to-indigo-500',
      titleId: 'partner.landing.v2.steps.negotiate.title',
      titleDefault: 'Nous négocions ensemble',
      descId: 'partner.landing.v2.steps.negotiate.desc',
      descDefault: 'Notre équipe vous contacte pour définir vos taux de commission et le mode de recommandation adapté à votre activité.',
    },
    {
      icon: Code,
      color: 'from-indigo-500 to-purple-500',
      titleId: 'partner.landing.v2.steps.integrate.title',
      titleDefault: 'Intégrez',
      descId: 'partner.landing.v2.steps.integrate.desc',
      descDefault: 'Partagez votre lien affilié, QR code ou intégrez notre widget. Notre équipe vous accompagne.',
    },
    {
      icon: DollarSign,
      color: 'from-purple-500 to-pink-500',
      titleId: 'partner.landing.v2.steps.earn.title',
      titleDefault: 'Gagnez',
      descId: 'partner.landing.v2.steps.earn.desc',
      descDefault: 'Recevez des commissions sur chaque appel généré par vos recommandations. Suivi en temps réel.',
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
      titleDefault: 'Commissions négociées',
      descId: 'partner.landing.v2.advantages.commission.desc',
      descDefault: 'Pas de taux fixe. Nous adaptons les commissions à votre volume, votre clientèle et votre secteur.',
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
      <SEOHead
        title={intl.formatMessage({
          id: 'partner.landing.v2.seo.title',
          defaultMessage: 'Programme Partenaire Premium - SOS-Expat',
        })}
        description={intl.formatMessage({
          id: 'partner.landing.v2.seo.description',
          defaultMessage: 'Monetize your expat audience with the SOS-Expat partner program. Custom commissions, integration tools, and dedicated support.',
        })}
      />
      <HreflangLinks pathname={location.pathname} />

      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: organizationJsonLd }}
      />

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
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.1] mb-6 tracking-tight">
                <FormattedMessage
                  id="partner.landing.v2.hero.title"
                  defaultMessage="Proposez une aide juridique et administrative à vos clients {highlight}"
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
                  defaultMessage="Entreprises, ambassades, consulats, associations — offrez à vos clients et membres un accès direct à des avocats et experts expatriation dans 197 pays. Commissions négociées, accompagnement dédié."
                />
              </p>

              {/* CTA */}
              <button
                onClick={scrollToApply}
                className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold text-lg rounded-2xl transition-all animate-pulse-glow-cyan min-h-[44px] shadow-2xl shadow-cyan-500/20"
                aria-label={intl.formatMessage({ id: 'partner.landing.v2.hero.cta.aria', defaultMessage: 'Scroll to application form' })}
              >
                <FormattedMessage id="partner.landing.v2.hero.cta" defaultMessage="Postuler maintenant" />
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
              <FormattedMessage id="partner.landing.v2.value.title" defaultMessage="Un partenariat qui rapporte" />
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
          </div>
        </section>

        {/* ================================================================
            SECTION 4 — COMMENT CA MARCHE
        ================================================================ */}
        <section
          className="section-content section-lazy bg-gradient-to-b from-black via-gray-950 to-black"
          aria-labelledby="steps-heading"
        >
          <div className="max-w-6xl mx-auto">
            <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400 text-center mb-4">
              <FormattedMessage id="partner.landing.v2.steps.overline" defaultMessage="Simple et rapide" />
            </p>
            <h2 id="steps-heading" className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-16">
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
            SECTION 9 — CTA FINAL + APPLICATION FORM
        ================================================================ */}
        <section
          id="apply"
          ref={applyRef}
          className="section-content section-lazy relative"
          aria-labelledby="apply-heading"
        >
          {/* Background accent */}
          <div className="absolute inset-0 bg-gradient-to-b from-black via-cyan-950/10 to-black" aria-hidden="true" />

          <div className="relative max-w-2xl mx-auto">
            {/* Final CTA text */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 glass-card rounded-full text-cyan-400 text-sm font-semibold mb-6">
                <Handshake className="w-4 h-4" />
                <FormattedMessage id="partner.landing.v2.apply.badge" defaultMessage="Candidature gratuite" />
              </div>

              <h2 id="apply-heading" className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                <FormattedMessage id="partner.landing.v2.apply.title" defaultMessage="Rejoignez le réseau" />
              </h2>
              <p className="text-gray-400 text-lg max-w-xl mx-auto">
                <FormattedMessage
                  id="partner.landing.v2.apply.subtitle"
                  defaultMessage="Remplissez le formulaire ci-dessous. Notre équipe vous recontacte sous 48h pour discuter de votre partenariat."
                />
              </p>
            </div>

            {/* Form card */}
            <div className="glass-card rounded-3xl p-6 md:p-10">
              <ApplicationForm />
            </div>

            {/* Footer note */}
            <p className="text-center text-gray-500 text-sm mt-8">
              <FormattedMessage
                id="partner.landing.v2.apply.footer"
                defaultMessage="En soumettant ce formulaire, vous acceptez d'être contacté par l'équipe SOS-Expat. Aucun engagement, aucun frais."
              />
            </p>
          </div>
        </section>

        {/* ================================================================
            MINI FOOTER
        ================================================================ */}
        <footer className="border-t border-white/5 py-8 text-center" role="contentinfo">
          <p className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} SOS-Expat.{' '}
            <FormattedMessage id="partner.landing.v2.footer.rights" defaultMessage="Tous droits réservés." />
          </p>
        </footer>
      </div>
    </Layout>
  );
};

export default PartnerLanding;
