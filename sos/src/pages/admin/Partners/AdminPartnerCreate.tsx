/**
 * AdminPartnerCreate - Create a new partner account
 * 7 sections: Email, Contact, Website, Affiliate Code, Commissions, Contract, Commercial Contact
 * Supports ?fromApplication={id} to pre-fill from an application
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functionsAffiliate } from '@/config/firebase';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Mail,
  User,
  Globe,
  Link2,
  DollarSign,
  FileText,
  Building,
  Loader2,
  Check,
  AlertTriangle,
  Copy,
  ExternalLink,
  Info,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
  },
  input: "w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-gray-900 dark:text-white",
  select: "w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-gray-900 dark:text-white",
  label: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5",
} as const;

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

interface FormState {
  // Section 1: Email
  email: string;
  sendCredentials: boolean;
  // Section 2: Contact
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  language: string;
  // Section 3: Website
  websiteUrl: string;
  websiteName: string;
  websiteDescription: string;
  websiteCategory: string;
  websiteTraffic: string;
  // Section 4: Affiliate code
  affiliateCode: string;
  // Section 5: Commissions
  usePercentage: boolean;
  commissionPerCallLawyer: number;
  commissionPerCallExpat: number;
  commissionPercentage: number;
  holdPeriodDays: number;
  releaseDelayHours: number;
  // Section 5b: Discount
  discountEnabled: boolean;
  discountType: 'fixed' | 'percentage';
  discountValue: number;
  discountMaxCents: number;
  discountLabel: string;
  // Section 6: Contract
  contractStartDate: string;
  contractEndDate: string;
  contractNotes: string;
  // Section 7: Commercial contact
  contactName: string;
  contactEmail: string;
  companyName: string;
  vatNumber: string;
}

const INITIAL_FORM: FormState = {
  email: '',
  sendCredentials: true,
  firstName: '',
  lastName: '',
  phone: '',
  country: '',
  language: 'fr',
  websiteUrl: '',
  websiteName: '',
  websiteDescription: '',
  websiteCategory: '',
  websiteTraffic: '',
  affiliateCode: '',
  usePercentage: false,
  commissionPerCallLawyer: 500,
  commissionPerCallExpat: 300,
  commissionPercentage: 10,
  holdPeriodDays: 7,
  releaseDelayHours: 24,
  discountEnabled: false,
  discountType: 'fixed',
  discountValue: 500,
  discountMaxCents: 0,
  discountLabel: '',
  contractStartDate: new Date().toISOString().slice(0, 10),
  contractEndDate: '',
  contractNotes: '',
  contactName: '',
  contactEmail: '',
  companyName: '',
  vatNumber: '',
};

interface CreationResult {
  partnerId: string;
  affiliateCode: string;
  affiliateLink: string;
  emailSent: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const AdminPartnerCreate: React.FC = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromApplicationId = searchParams.get('fromApplication');

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CreationResult | null>(null);
  const [codeChecking, setCodeChecking] = useState(false);
  const [codeAvailable, setCodeAvailable] = useState<boolean | null>(null);
  const [loadingApplication, setLoadingApplication] = useState(false);

  // Pre-fill from application
  useEffect(() => {
    if (!fromApplicationId) return;
    const load = async () => {
      setLoadingApplication(true);
      try {
        const fn = httpsCallable<any, { applications: any[] }>(functionsAffiliate, 'adminPartnerApplicationsList');
        const res = await fn({ applicationId: fromApplicationId });
        const app = res.data.applications?.[0];
        if (!app) throw new Error('Application not found');
        setForm(prev => ({
          ...prev,
          email: app.email || '',
          firstName: app.firstName || '',
          lastName: app.lastName || '',
          phone: app.phone || '',
          country: app.country || '',
          language: app.language || 'fr',
          websiteUrl: app.websiteUrl || '',
          websiteName: app.websiteName || '',
          websiteDescription: app.websiteDescription || '',
          websiteCategory: app.websiteCategory || '',
          websiteTraffic: app.websiteTraffic || '',
        }));
      } catch (err) {
        console.error('Failed to load application:', err);
        toast.error(intl.formatMessage({ id: 'admin.partners.create.applicationLoadError', defaultMessage: 'Failed to load application data' }));
      } finally {
        setLoadingApplication(false);
      }
    };
    load();
  }, [fromApplicationId, intl]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value,
    }));
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
    setForm(prev => ({ ...prev, affiliateCode: code }));
    setCodeAvailable(null);
  };

  // Code uniqueness is validated server-side by createPartner callable.
  // We show the code as potentially available once it meets minimum length.
  useEffect(() => {
    if (!form.affiliateCode || form.affiliateCode.length < 3) {
      setCodeAvailable(null);
      return;
    }
    // No dedicated check callable exists; createPartner validates uniqueness on submit.
    setCodeChecking(false);
    setCodeAvailable(null);
  }, [form.affiliateCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.firstName || !form.lastName || !form.affiliateCode || !form.websiteUrl) {
      toast.error(intl.formatMessage({ id: 'admin.partners.create.missingFields', defaultMessage: 'Please fill all required fields' }));
      return;
    }
    if (codeAvailable === false) {
      toast.error(intl.formatMessage({ id: 'admin.partners.create.codeTaken', defaultMessage: 'This affiliate code is already taken' }));
      return;
    }

    setSubmitting(true);
    try {
      const fn = httpsCallable<any, CreationResult>(functionsAffiliate, 'createPartner');
      const res = await fn({
        email: form.email.trim().toLowerCase(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim() || undefined,
        country: form.country,
        language: form.language,
        websiteUrl: form.websiteUrl.trim(),
        websiteName: form.websiteName.trim(),
        websiteDescription: form.websiteDescription.trim() || undefined,
        websiteCategory: form.websiteCategory,
        websiteTraffic: form.websiteTraffic || undefined,
        affiliateCode: form.affiliateCode,
        commissionPerCallLawyer: form.commissionPerCallLawyer,
        commissionPerCallExpat: form.commissionPerCallExpat,
        usePercentage: form.usePercentage,
        commissionPercentage: form.usePercentage ? form.commissionPercentage : undefined,
        discountType: form.discountEnabled ? form.discountType : undefined,
        discountValue: form.discountEnabled ? form.discountValue : undefined,
        discountMaxCents: form.discountEnabled && form.discountType === 'percentage' && form.discountMaxCents > 0 ? form.discountMaxCents : undefined,
        discountLabel: form.discountEnabled && form.discountLabel ? form.discountLabel : undefined,
        holdPeriodDays: form.holdPeriodDays,
        releaseDelayHours: form.releaseDelayHours,
        contractNotes: form.contractNotes.trim() || undefined,
        contactName: form.contactName.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        companyName: form.companyName.trim() || undefined,
        vatNumber: form.vatNumber.trim() || undefined,
        sendCredentials: form.sendCredentials,
        fromApplicationId: fromApplicationId || undefined,
      });
      setResult(res.data);
      toast.success(intl.formatMessage({ id: 'admin.partners.create.success', defaultMessage: 'Partner created successfully' }));
    } catch (err: any) {
      console.error('Create partner error:', err);
      toast.error(err?.message || intl.formatMessage({ id: 'admin.partners.create.error', defaultMessage: 'Failed to create partner' }));
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(intl.formatMessage({ id: 'admin.partners.create.copied', defaultMessage: 'Copied to clipboard' }));
  };

  // Success state
  if (result) {
    return (
      <AdminLayout>
        <div className="p-4 md:p-6 max-w-2xl mx-auto">
          <div className={UI.card + ' p-8 text-center'}>
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center">
              <Check className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              <FormattedMessage id="admin.partners.create.successTitle" defaultMessage="Partner created!" />
            </h2>

            <div className="space-y-4 text-left bg-gray-50 dark:bg-white/5 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  <FormattedMessage id="admin.partners.create.result.code" defaultMessage="Affiliate code" />
                </span>
                <div className="flex items-center gap-2">
                  <code className="text-cyan-600 dark:text-cyan-400 font-mono font-bold">{result.affiliateCode}</code>
                  <button onClick={() => copyToClipboard(result.affiliateCode)}>
                    <Copy className="w-4 h-4 text-gray-400 hover:text-cyan-400" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  <FormattedMessage id="admin.partners.create.result.link" defaultMessage="Affiliate link" />
                </span>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-cyan-600 dark:text-cyan-400 font-mono truncate max-w-[200px]">{result.affiliateLink}</code>
                  <button onClick={() => copyToClipboard(result.affiliateLink)}>
                    <Copy className="w-4 h-4 text-gray-400 hover:text-cyan-400" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  <FormattedMessage id="admin.partners.create.result.emailSent" defaultMessage="Credentials email" />
                </span>
                <span className={result.emailSent ? 'text-green-400' : 'text-gray-400'}>
                  {result.emailSent
                    ? intl.formatMessage({ id: 'admin.partners.create.result.sent', defaultMessage: 'Sent' })
                    : intl.formatMessage({ id: 'admin.partners.create.result.notSent', defaultMessage: 'Not sent' })}
                </span>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => navigate(`/admin/partners/${result.partnerId}`)}
                className={`${UI.button.primary} px-6 py-3`}
              >
                <FormattedMessage id="admin.partners.create.viewPartner" defaultMessage="View partner" />
              </button>
              <button
                onClick={() => navigate('/admin/partners')}
                className={`${UI.button.secondary} px-6 py-3`}
              >
                <FormattedMessage id="admin.partners.create.backToList" defaultMessage="Back to list" />
              </button>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (loadingApplication) {
    return (
      <AdminLayout>
        <div className="p-4 md:p-6 flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/admin/partners')} className={`${UI.button.secondary} p-2`}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              <FormattedMessage id="admin.partners.create.title" defaultMessage="Create partner" />
            </h1>
            {fromApplicationId && (
              <p className="text-sm text-cyan-500">
                <FormattedMessage id="admin.partners.create.fromApplication" defaultMessage="Pre-filled from application" />
              </p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Email */}
          <div className={UI.card + ' p-6'}>
            <div className="flex items-center gap-2 mb-4">
              <Mail className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                <FormattedMessage id="admin.partners.create.section.email" defaultMessage="Email & Credentials" />
              </h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className={UI.label}>
                  <FormattedMessage id="admin.partners.create.email" defaultMessage="Email" /> *
                </label>
                <input type="email" name="email" value={form.email} onChange={handleChange} className={UI.input} required />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" name="sendCredentials" checked={form.sendCredentials} onChange={handleChange} className="w-4 h-4 text-cyan-500 rounded" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  <FormattedMessage id="admin.partners.create.sendCredentials" defaultMessage="Send credentials by email" />
                </span>
              </label>
            </div>
          </div>

          {/* Section 2: Contact */}
          <div className={UI.card + ' p-6'}>
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                <FormattedMessage id="admin.partners.create.section.contact" defaultMessage="Contact" />
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={UI.label}><FormattedMessage id="admin.partners.create.firstName" defaultMessage="First name" /> *</label>
                <input type="text" name="firstName" value={form.firstName} onChange={handleChange} className={UI.input} required />
              </div>
              <div>
                <label className={UI.label}><FormattedMessage id="admin.partners.create.lastName" defaultMessage="Last name" /> *</label>
                <input type="text" name="lastName" value={form.lastName} onChange={handleChange} className={UI.input} required />
              </div>
              <div>
                <label className={UI.label}><FormattedMessage id="admin.partners.create.phone" defaultMessage="Phone" /></label>
                <input type="tel" name="phone" value={form.phone} onChange={handleChange} className={UI.input} />
              </div>
              <div>
                <label className={UI.label}><FormattedMessage id="admin.partners.create.country" defaultMessage="Country" /> *</label>
                <select name="country" value={form.country} onChange={handleChange} className={UI.select} required>
                  <option value="">{intl.formatMessage({ id: 'admin.partners.create.selectCountry', defaultMessage: 'Select' })}</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={UI.label}><FormattedMessage id="admin.partners.create.language" defaultMessage="Language" /> *</label>
                <select name="language" value={form.language} onChange={handleChange} className={UI.select} required>
                  {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Website */}
          <div className={UI.card + ' p-6'}>
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                <FormattedMessage id="admin.partners.create.section.website" defaultMessage="Website" />
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className={UI.label}><FormattedMessage id="admin.partners.create.websiteUrl" defaultMessage="Website URL" /> *</label>
                <input type="url" name="websiteUrl" value={form.websiteUrl} onChange={handleChange} placeholder="https://" className={UI.input} required />
              </div>
              <div>
                <label className={UI.label}><FormattedMessage id="admin.partners.create.websiteName" defaultMessage="Website name" /> *</label>
                <input type="text" name="websiteName" value={form.websiteName} onChange={handleChange} className={UI.input} required />
              </div>
              <div>
                <label className={UI.label}><FormattedMessage id="admin.partners.create.websiteCategory" defaultMessage="Category" /> *</label>
                <select name="websiteCategory" value={form.websiteCategory} onChange={handleChange} className={UI.select} required>
                  <option value="">{intl.formatMessage({ id: 'admin.partners.create.selectCategory', defaultMessage: 'Select' })}</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{intl.formatMessage({ id: `partner.landing.category.${c}`, defaultMessage: c })}</option>)}
                </select>
              </div>
              <div>
                <label className={UI.label}><FormattedMessage id="admin.partners.create.websiteTraffic" defaultMessage="Monthly traffic" /></label>
                <select name="websiteTraffic" value={form.websiteTraffic} onChange={handleChange} className={UI.select}>
                  <option value="">{intl.formatMessage({ id: 'admin.partners.create.selectTraffic', defaultMessage: 'Select' })}</option>
                  {TRAFFIC_TIERS.map(t => <option key={t} value={t}>{intl.formatMessage({ id: `partner.landing.traffic.${t}`, defaultMessage: t })}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className={UI.label}><FormattedMessage id="admin.partners.create.websiteDescription" defaultMessage="Description" /></label>
                <textarea name="websiteDescription" value={form.websiteDescription} onChange={handleChange} rows={3} className={UI.input} />
              </div>
            </div>
          </div>

          {/* Section 4: Affiliate Code */}
          <div className={UI.card + ' p-6'}>
            <div className="flex items-center gap-2 mb-4">
              <Link2 className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                <FormattedMessage id="admin.partners.create.section.code" defaultMessage="Affiliate Code" />
              </h2>
            </div>
            <div>
              <label className={UI.label}><FormattedMessage id="admin.partners.create.affiliateCode" defaultMessage="Code (uppercase)" /> *</label>
              <div className="relative">
                <input
                  type="text"
                  value={form.affiliateCode}
                  onChange={handleCodeChange}
                  className={UI.input + ' uppercase font-mono'}
                  placeholder="MYPARTNER"
                  required
                  minLength={3}
                  maxLength={20}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {codeChecking && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                  {!codeChecking && codeAvailable === true && <Check className="w-4 h-4 text-green-400" />}
                  {!codeChecking && codeAvailable === false && <AlertTriangle className="w-4 h-4 text-red-400" />}
                </div>
              </div>
              {codeAvailable === false && (
                <p className="text-xs text-red-400 mt-1">
                  <FormattedMessage id="admin.partners.create.codeTaken" defaultMessage="This code is already taken" />
                </p>
              )}
              {form.affiliateCode.length >= 3 && codeAvailable === true && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  <FormattedMessage id="admin.partners.create.linkPreview" defaultMessage="Link:" />{' '}
                  <code className="text-cyan-400">https://sos-expat.com/?ref={form.affiliateCode}</code>
                </p>
              )}
            </div>
          </div>

          {/* Section 5: Commissions */}
          <div className={UI.card + ' p-6'}>
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                <FormattedMessage id="admin.partners.create.section.commissions" defaultMessage="Commissions" />
              </h2>
            </div>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" name="usePercentage" checked={form.usePercentage} onChange={handleChange} className="w-4 h-4 text-cyan-500 rounded" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  <FormattedMessage id="admin.partners.create.usePercentage" defaultMessage="Use percentage instead of fixed amounts" />
                </span>
              </label>

              {form.usePercentage ? (
                <div>
                  <label className={UI.label}><FormattedMessage id="admin.partners.create.percentage" defaultMessage="Commission percentage (%)" /></label>
                  <input type="number" name="commissionPercentage" value={form.commissionPercentage} onChange={handleChange} min={1} max={50} className={UI.input} />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={UI.label}><FormattedMessage id="admin.partners.create.commissionLawyer" defaultMessage="Per call (lawyer) - cents" /></label>
                    <input type="number" name="commissionPerCallLawyer" value={form.commissionPerCallLawyer} onChange={handleChange} min={0} className={UI.input} />
                    <p className="text-xs text-gray-500 mt-1">${(form.commissionPerCallLawyer / 100).toFixed(2)}</p>
                  </div>
                  <div>
                    <label className={UI.label}><FormattedMessage id="admin.partners.create.commissionExpat" defaultMessage="Per call (expat) - cents" /></label>
                    <input type="number" name="commissionPerCallExpat" value={form.commissionPerCallExpat} onChange={handleChange} min={0} className={UI.input} />
                    <p className="text-xs text-gray-500 mt-1">${(form.commissionPerCallExpat / 100).toFixed(2)}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={UI.label}><FormattedMessage id="admin.partners.create.holdPeriod" defaultMessage="Hold period (days)" /></label>
                  <input type="number" name="holdPeriodDays" value={form.holdPeriodDays} onChange={handleChange} min={0} className={UI.input} />
                </div>
                <div>
                  <label className={UI.label}><FormattedMessage id="admin.partners.create.releaseDelay" defaultMessage="Release delay (hours)" /></label>
                  <input type="number" name="releaseDelayHours" value={form.releaseDelayHours} onChange={handleChange} min={0} className={UI.input} />
                </div>
              </div>
            </div>
          </div>

          {/* Section 5b: Discount */}
          <div className={UI.card + ' p-6'}>
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                <FormattedMessage id="admin.partners.create.section.discount" defaultMessage="Remise communauté (optionnel)" />
              </h2>
            </div>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" name="discountEnabled" checked={form.discountEnabled} onChange={handleChange} className="w-4 h-4 text-blue-500 rounded" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  <FormattedMessage id="admin.partners.create.discountEnabled" defaultMessage="Offrir une remise à la communauté de ce partenaire" />
                </span>
              </label>

              {form.discountEnabled && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={UI.label}><FormattedMessage id="admin.partners.create.discountType" defaultMessage="Type de remise" /></label>
                      <select name="discountType" value={form.discountType} onChange={handleChange} className={UI.select}>
                        <option value="fixed">{intl.formatMessage({ id: 'admin.partners.create.discountFixed', defaultMessage: 'Montant fixe ($)' })}</option>
                        <option value="percentage">{intl.formatMessage({ id: 'admin.partners.create.discountPercentage', defaultMessage: 'Pourcentage (%)' })}</option>
                      </select>
                    </div>
                    <div>
                      <label className={UI.label}>
                        {form.discountType === 'fixed'
                          ? <FormattedMessage id="admin.partners.create.discountValueCents" defaultMessage="Montant (cents)" />
                          : <FormattedMessage id="admin.partners.create.discountValuePercent" defaultMessage="Pourcentage (%)" />
                        }
                      </label>
                      <input type="number" name="discountValue" value={form.discountValue} onChange={handleChange} min={0} max={form.discountType === 'percentage' ? 100 : undefined} className={UI.input} />
                      {form.discountType === 'fixed' && <p className="text-xs text-gray-500 mt-1">${(form.discountValue / 100).toFixed(2)}</p>}
                    </div>
                  </div>
                  {form.discountType === 'percentage' && (
                    <div>
                      <label className={UI.label}><FormattedMessage id="admin.partners.create.discountMaxCents" defaultMessage="Remise max (cents, 0 = illimité)" /></label>
                      <input type="number" name="discountMaxCents" value={form.discountMaxCents} onChange={handleChange} min={0} className={UI.input + ' max-w-xs'} />
                    </div>
                  )}
                  <div>
                    <label className={UI.label}><FormattedMessage id="admin.partners.create.discountLabel" defaultMessage="Libellé (affiché au client)" /></label>
                    <input type="text" name="discountLabel" value={form.discountLabel} onChange={handleChange} className={UI.input} placeholder={intl.formatMessage({ id: 'admin.partners.create.discountLabelPlaceholder', defaultMessage: 'Ex: Remise Expatica -10%' })} />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Section 6: Contract */}
          <div className={UI.card + ' p-6'}>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                <FormattedMessage id="admin.partners.create.section.contract" defaultMessage="Contract" />
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={UI.label}><FormattedMessage id="admin.partners.create.startDate" defaultMessage="Start date" /></label>
                <input type="date" name="contractStartDate" value={form.contractStartDate} onChange={handleChange} className={UI.input} />
              </div>
              <div>
                <label className={UI.label}><FormattedMessage id="admin.partners.create.endDate" defaultMessage="End date (optional)" /></label>
                <input type="date" name="contractEndDate" value={form.contractEndDate} onChange={handleChange} className={UI.input} />
              </div>
              <div className="md:col-span-2">
                <label className={UI.label}><FormattedMessage id="admin.partners.create.contractNotes" defaultMessage="Notes" /></label>
                <textarea name="contractNotes" value={form.contractNotes} onChange={handleChange} rows={3} className={UI.input} />
              </div>
            </div>
          </div>

          {/* Section 7: Commercial Contact */}
          <div className={UI.card + ' p-6'}>
            <div className="flex items-center gap-2 mb-4">
              <Building className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                <FormattedMessage id="admin.partners.create.section.commercial" defaultMessage="Commercial Contact (optional)" />
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={UI.label}><FormattedMessage id="admin.partners.create.contactName" defaultMessage="Contact name" /></label>
                <input type="text" name="contactName" value={form.contactName} onChange={handleChange} className={UI.input} />
              </div>
              <div>
                <label className={UI.label}><FormattedMessage id="admin.partners.create.contactEmail" defaultMessage="Contact email" /></label>
                <input type="email" name="contactEmail" value={form.contactEmail} onChange={handleChange} className={UI.input} />
              </div>
              <div>
                <label className={UI.label}><FormattedMessage id="admin.partners.create.companyName" defaultMessage="Company name" /></label>
                <input type="text" name="companyName" value={form.companyName} onChange={handleChange} className={UI.input} />
              </div>
              <div>
                <label className={UI.label}><FormattedMessage id="admin.partners.create.vatNumber" defaultMessage="VAT number" /></label>
                <input type="text" name="vatNumber" value={form.vatNumber} onChange={handleChange} className={UI.input} />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => navigate('/admin/partners')} className={`${UI.button.secondary} px-6 py-3`}>
              <FormattedMessage id="admin.partners.create.cancel" defaultMessage="Cancel" />
            </button>
            <button
              type="submit"
              disabled={submitting || codeAvailable === false}
              className={`${UI.button.primary} px-8 py-3 flex items-center gap-2 disabled:opacity-50`}
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <FormattedMessage id="admin.partners.create.submit" defaultMessage="Create partner" />
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

export default AdminPartnerCreate;
