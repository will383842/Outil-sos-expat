/**
 * PartnerLanding - "Devenir Partenaire" public landing page
 *
 * Dark premium design with cyan/blue identity for Partners.
 * Mobile-first, accessible FAQ, application form.
 */

import React, { useState, useEffect, useRef } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functionsAffiliate } from '@/config/firebase';
import Layout from '@/components/layout/Layout';
import SEOHead from '@/components/layout/SEOHead';
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
  ChevronDown,
  Loader2,
  ExternalLink,
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
  const intl = useIntl();
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
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
      {isOpen && (
        <div
          id={`faq-answer-${answerId}`}
          className="px-5 pb-5 text-gray-400 leading-relaxed"
        >
          <FormattedMessage id={answerId} />
        </div>
      )}
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
    <section className="section-content section-lazy">
      <div className="max-w-6xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-12">
          <FormattedMessage id="partner.landing.trust.title" defaultMessage="Ils nous font confiance" />
        </h2>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
          {partners.map((p) => (
            <a
              key={p.id}
              href={p.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-6 py-4 hover:bg-white/10 transition-colors group"
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
    if (!form.websiteUrl.trim() || !form.websiteUrl.startsWith('https://'))
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
        websiteUrl: form.websiteUrl.trim(),
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

  const inputClass = "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all";
  const selectClass = "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all appearance-none";
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Row: firstName + lastName */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>
            <FormattedMessage id="partner.landing.form.firstName" defaultMessage="First name" /> *
          </label>
          <input
            type="text"
            name="firstName"
            value={form.firstName}
            onChange={handleChange}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className={labelClass}>
            <FormattedMessage id="partner.landing.form.lastName" defaultMessage="Last name" /> *
          </label>
          <input
            type="text"
            name="lastName"
            value={form.lastName}
            onChange={handleChange}
            className={inputClass}
            required
          />
        </div>
      </div>

      {/* Row: email + phone */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>
            <FormattedMessage id="partner.landing.form.email" defaultMessage="Email" /> *
          </label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className={labelClass}>
            <FormattedMessage id="partner.landing.form.phone" defaultMessage="Phone" />
          </label>
          <input
            type="tel"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            className={inputClass}
          />
        </div>
      </div>

      {/* Row: country + language */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>
            <FormattedMessage id="partner.landing.form.country" defaultMessage="Country" /> *
          </label>
          <select
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
          <label className={labelClass}>
            <FormattedMessage id="partner.landing.form.language" defaultMessage="Language" /> *
          </label>
          <select
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
          <label className={labelClass}>
            <FormattedMessage id="partner.landing.form.websiteUrl" defaultMessage="Website URL" /> *
          </label>
          <input
            type="url"
            name="websiteUrl"
            value={form.websiteUrl}
            onChange={handleChange}
            placeholder="https://"
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className={labelClass}>
            <FormattedMessage id="partner.landing.form.websiteName" defaultMessage="Website name" /> *
          </label>
          <input
            type="text"
            name="websiteName"
            value={form.websiteName}
            onChange={handleChange}
            className={inputClass}
            required
          />
        </div>
      </div>

      {/* Category + traffic */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>
            <FormattedMessage id="partner.landing.form.category" defaultMessage="Website category" /> *
          </label>
          <select
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
          <label className={labelClass}>
            <FormattedMessage id="partner.landing.form.traffic" defaultMessage="Monthly traffic" />
          </label>
          <select
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
        <label className={labelClass}>
          <FormattedMessage id="partner.landing.form.websiteDescription" defaultMessage="Website description" />
          <span className="text-gray-500 ml-2">({form.websiteDescription.length}/500)</span>
        </label>
        <textarea
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
        <label className={labelClass}>
          <FormattedMessage id="partner.landing.form.message" defaultMessage="Message (optional)" />
          <span className="text-gray-500 ml-2">({form.message.length}/1000)</span>
        </label>
        <textarea
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
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold text-lg rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const applyRef = useRef<HTMLDivElement>(null);

  const scrollToApply = () => {
    applyRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const steps = [
    { icon: Users, color: 'from-cyan-500 to-blue-500' },
    { icon: Link2, color: 'from-blue-500 to-indigo-500' },
    { icon: Globe, color: 'from-indigo-500 to-purple-500' },
    { icon: DollarSign, color: 'from-purple-500 to-pink-500' },
  ];

  const advantages = [
    { icon: DollarSign },
    { icon: TrendingUp },
    { icon: BarChart3 },
    { icon: Shield },
    { icon: HeadphonesIcon },
    { icon: Award },
  ];

  const faqKeys = [
    'partner.landing.faq.q1',
    'partner.landing.faq.q2',
    'partner.landing.faq.q3',
    'partner.landing.faq.q4',
    'partner.landing.faq.q5',
    'partner.landing.faq.q6',
  ];

  return (
    <Layout>
      <SEOHead
        title={intl.formatMessage({ id: 'partner.landing.seo.title', defaultMessage: 'Become a Partner - SOS-Expat' })}
        description={intl.formatMessage({ id: 'partner.landing.seo.description', defaultMessage: 'Monetize your expat audience with SOS-Expat partner program.' })}
      />
      <style>{globalStyles}</style>

      <div className="partner-landing bg-black text-white min-h-screen">
        {/* ==================== HERO ==================== */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 via-black to-blue-900/20" />
          <div className="relative section-content pt-20 pb-16 md:pt-28 md:pb-24">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-400 text-sm font-medium mb-8">
                <Zap className="w-4 h-4" />
                <FormattedMessage id="partner.landing.hero.badge" defaultMessage="Partner Program" />
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
                <FormattedMessage
                  id="partner.landing.hero.title"
                  defaultMessage="Monetize your {highlight} audience"
                  values={{
                    highlight: (
                      <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                        {intl.formatMessage({ id: 'partner.landing.hero.highlight', defaultMessage: 'expat' })}
                      </span>
                    ),
                  }}
                />
              </h1>

              <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10">
                <FormattedMessage
                  id="partner.landing.hero.subtitle"
                  defaultMessage="Join the SOS-Expat partner network and earn commissions for every call generated from your website."
                />
              </p>

              <button
                onClick={scrollToApply}
                className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold text-lg rounded-xl transition-all animate-pulse-glow-cyan min-h-[44px]"
              >
                <FormattedMessage id="partner.landing.hero.cta" defaultMessage="Apply now" />
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </section>

        {/* ==================== HOW IT WORKS ==================== */}
        <section className="section-content section-lazy bg-gradient-to-b from-black via-gray-950 to-black">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
              <FormattedMessage id="partner.landing.howItWorks.title" defaultMessage="How it works" />
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {steps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={i} className="text-center">
                    <div className="relative mb-6">
                      <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-r ${step.color} flex items-center justify-center`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-sm font-bold text-cyan-400">
                        {i + 1}
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      <FormattedMessage id={`partner.landing.howItWorks.step${i + 1}.title`} defaultMessage={`Step ${i + 1}`} />
                    </h3>
                    <p className="text-gray-400 text-sm">
                      <FormattedMessage id={`partner.landing.howItWorks.step${i + 1}.description`} defaultMessage="Description" />
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ==================== WHY BECOME A PARTNER ==================== */}
        <section className="section-content section-lazy">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
              <FormattedMessage id="partner.landing.advantages.title" defaultMessage="Why become a partner?" />
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {advantages.map((adv, i) => {
                const Icon = adv.icon;
                return (
                  <div
                    key={i}
                    className="p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-cyan-400" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      <FormattedMessage id={`partner.landing.advantages.item${i + 1}.title`} defaultMessage={`Advantage ${i + 1}`} />
                    </h3>
                    <p className="text-gray-400 text-sm">
                      <FormattedMessage id={`partner.landing.advantages.item${i + 1}.description`} defaultMessage="Description" />
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ==================== TRUSTED PARTNERS ==================== */}
        <TrustedPartnersSection />

        {/* ==================== FAQ ==================== */}
        <section className="section-content section-lazy bg-gradient-to-b from-black via-gray-950 to-black">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              <FormattedMessage id="partner.landing.faq.title" defaultMessage="Frequently asked questions" />
            </h2>

            <div className="space-y-3">
              {faqKeys.map((key, i) => (
                <FAQItem
                  key={i}
                  questionId={key}
                  answerId={key.replace('.q', '.a')}
                  isOpen={openFaq === i}
                  onToggle={() => setOpenFaq(openFaq === i ? null : i)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ==================== APPLICATION FORM ==================== */}
        <section id="apply" ref={applyRef} className="section-content section-lazy">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
              <FormattedMessage id="partner.landing.apply.title" defaultMessage="Apply to become a partner" />
            </h2>
            <p className="text-gray-400 text-center mb-10">
              <FormattedMessage id="partner.landing.apply.subtitle" defaultMessage="Fill in the form below and we'll get back to you within 48 hours." />
            </p>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
              <ApplicationForm />
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default PartnerLanding;
