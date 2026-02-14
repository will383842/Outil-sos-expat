/**
 * BloggerRegister - Dark theme registration page for bloggers
 * Harmonized with ChatterRegister pattern (2026 best practices)
 *
 * Features:
 * - Dark-only glassmorphism (purple accent)
 * - Password strength indicator
 * - Inline validation on blur
 * - Terms acceptance + definitive role acknowledgment
 * - Email-already-exists UI
 * - Role conflict check
 * - Referral code banner
 * - NO phone number required for bloggers
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocaleNavigate } from '@/multilingual-system';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { getTranslatedRouteSlug, type RouteKey } from '@/multilingual-system/core/routing/localeRoutes';
import { httpsCallable } from 'firebase/functions';
import { functionsWest2 } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import Layout from '@/components/layout/Layout';
import SEOHead from '@/components/layout/SEOHead';
import HreflangLinks from '@/multilingual-system/components/HrefLang/HreflangLinks';
import { phoneCodesData, type PhoneCodeEntry } from '@/data/phone-codes';
import {
  RegisterBloggerInput,
  RegisterBloggerResponse,
  BLOG_THEMES,
  BLOG_TRAFFIC_TIERS,
  SupportedBloggerLanguage,
} from '@/types/blogger';
import {
  User,
  Mail,
  Globe,
  Link2,
  FileText,
  BarChart3,
  Tag,
  ChevronDown,
  Search,
  Check,
  Gift,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowLeft,
  LogIn,
  CheckCircle,
  PenTool,
} from 'lucide-react';
import { storeReferralCode, getStoredReferralCode, clearStoredReferral } from '@/utils/referralStorage';
import { getCountryNameFromEntry as getCountryName, getFlag } from '@/utils/phoneCodeHelpers';
import { trackMetaCompleteRegistration, trackMetaStartRegistration, getMetaIdentifiers, setMetaPixelUserData } from '@/utils/metaPixel';
import { trackAdRegistration } from '@/services/adAttributionService';
import { generateEventIdForType } from '@/utils/sharedEventId';

// ============================================================================
// PASSWORD STRENGTH
// ============================================================================
interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
  width: string;
  feedback: string[];
}

const evaluatePasswordStrength = (password: string, intl: ReturnType<typeof useIntl>): PasswordStrength => {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score++;
  else feedback.push(intl.formatMessage({ id: 'form.password.feedback.minLength', defaultMessage: 'At least 8 characters' }));
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  else feedback.push(intl.formatMessage({ id: 'form.password.feedback.uppercase', defaultMessage: 'Add an uppercase letter' }));
  if (/[0-9]/.test(password)) score++;
  else feedback.push(intl.formatMessage({ id: 'form.password.feedback.number', defaultMessage: 'Add a number' }));
  if (/[^A-Za-z0-9]/.test(password)) score++;
  else feedback.push(intl.formatMessage({ id: 'form.password.feedback.special', defaultMessage: 'Add a special character' }));

  const normalizedScore = Math.min(4, Math.floor(score * 0.8)) as 0 | 1 | 2 | 3 | 4;
  const strengthMap: Record<number, { label: string; color: string; width: string }> = {
    0: { label: intl.formatMessage({ id: 'form.password.strength.veryWeak', defaultMessage: 'Very weak' }), color: 'text-red-500', width: 'w-1/5' },
    1: { label: intl.formatMessage({ id: 'form.password.strength.weak', defaultMessage: 'Weak' }), color: 'text-red-400', width: 'w-2/5' },
    2: { label: intl.formatMessage({ id: 'form.password.strength.fair', defaultMessage: 'Fair' }), color: 'text-orange-400', width: 'w-3/5' },
    3: { label: intl.formatMessage({ id: 'form.password.strength.good', defaultMessage: 'Good' }), color: 'text-yellow-400', width: 'w-4/5' },
    4: { label: intl.formatMessage({ id: 'form.password.strength.strong', defaultMessage: 'Strong' }), color: 'text-green-400', width: 'w-full' },
  };

  return { score: normalizedScore, ...strengthMap[normalizedScore], feedback: feedback.slice(0, 2) };
};

// ============================================================================
// DARK THEME STYLES (purple accent)
// ============================================================================
const s = {
  input: `
    w-full px-4 py-3.5
    bg-white/10 border-2 border-white/10
    rounded-2xl
    text-base text-white
    placeholder:text-gray-500
    focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:ring-offset-0
    focus:border-purple-400/50 focus:bg-white/10
    transition-all duration-200 ease-out
    disabled:opacity-50 disabled:cursor-not-allowed
    min-h-[48px]
  `,
  inputError: 'border-red-500/60 focus:ring-red-500/30 bg-red-500/10',
  inputDefault: '',
  inputFilled: 'bg-white/8 border-white/20',
  label: 'block text-sm font-semibold text-gray-300 mb-2',
  errorText: 'mt-1.5 text-xs text-red-400 flex items-center gap-1',
  sectionTitle: 'text-lg font-bold text-white mb-1',
  sectionDescription: 'text-sm text-gray-400 mb-4',
  dropdown: `
    absolute z-50 mt-2 w-full
    bg-gray-900 border border-white/10
    rounded-2xl shadow-xl shadow-black/30
    overflow-hidden
  `,
  dropdownItem: `
    w-full px-4 py-3
    flex items-center gap-3
    text-left text-sm text-white
    hover:bg-white/10
    transition-colors duration-150
    cursor-pointer
  `,
  dropdownSearch: 'w-full pl-9 pr-3 py-2.5 text-sm bg-white/10 text-white rounded-xl border-0 focus:ring-2 focus:ring-purple-400/30 placeholder:text-gray-500',
  card: 'bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl shadow-lg',
};

// ============================================================================
// CONSTANTS
// ============================================================================
const LANGUAGES: { value: SupportedBloggerLanguage; label: string }[] = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'pt', label: 'Português' },
  { value: 'de', label: 'Deutsch' },
  { value: 'it', label: 'Italiano' },
  { value: 'ar', label: 'العربية' },
  { value: 'nl', label: 'Nederlands' },
  { value: 'zh', label: '中文' },
];

interface BloggerFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  country: string;
  language: SupportedBloggerLanguage;
  blogUrl: string;
  blogName: string;
  blogLanguage: SupportedBloggerLanguage;
  blogCountry: string;
  blogTheme: string;
  blogTraffic: string;
  blogDescription: string;
  definitiveRoleAcknowledged: boolean;
  acceptTerms: boolean;
  referralCode: string;
}

const MIN_PASSWORD_LENGTH = 8;

// ============================================================================
// COMPONENT
// ============================================================================
const BloggerRegister: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, isLoading: authLoading, authInitialized, register, refreshUser } = useAuth();
  const { language } = useApp();
  const [showPassword, setShowPassword] = useState(false);
  const locale = (language || 'en') as string;
  const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';

  const [emailAlreadyExists, setEmailAlreadyExists] = useState(false);
  const [existingEmail, setExistingEmail] = useState('');

  const referralCodeFromUrl = useMemo(() => {
    const fromUrl = searchParams.get('ref')
      || searchParams.get('referralCode')
      || searchParams.get('code')
      || searchParams.get('sponsor')
      || '';

    if (fromUrl) {
      storeReferralCode(fromUrl, 'blogger', 'recruitment');
      return fromUrl;
    }

    return getStoredReferralCode('blogger') || '';
  }, [searchParams]);

  const landingRoute = `/${getTranslatedRouteSlug('blogger-landing' as RouteKey, langCode)}`;
  const dashboardRoute = `/${getTranslatedRouteSlug('blogger-dashboard' as RouteKey, langCode)}`;
  const loginRoute = `/${getTranslatedRouteSlug('login' as RouteKey, langCode)}`;

  // ============================================================================
  // STATE
  // ============================================================================
  const [formData, setFormData] = useState<BloggerFormData>({
    firstName: '',
    lastName: '',
    email: user?.email || '',
    password: '',
    country: '',
    language: 'fr',
    blogUrl: '',
    blogName: '',
    blogLanguage: 'fr',
    blogCountry: '',
    blogTheme: 'expatriation',
    blogTraffic: '1k-5k',
    blogDescription: '',
    definitiveRoleAcknowledged: false,
    acceptTerms: false,
    referralCode: referralCodeFromUrl,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  // Role check
  const userRole = user?.role;
  const hasExistingRole = userRole && ['blogger', 'chatter', 'influencer', 'groupAdmin', 'lawyer', 'expat', 'client'].includes(userRole);
  const isAlreadyBlogger = userRole === 'blogger';

  useEffect(() => {
    if (authInitialized && !authLoading && isAlreadyBlogger && !success) {
      navigate(dashboardRoute, { replace: true });
    }
  }, [authInitialized, authLoading, isAlreadyBlogger, navigate, dashboardRoute, success]);

  // Meta Pixel: Track StartRegistration on mount
  useEffect(() => {
    trackMetaStartRegistration({ content_name: 'blogger_registration' });
  }, []);

  // Dropdown states
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showBlogLanguageDropdown, setShowBlogLanguageDropdown] = useState(false);
  const [showBlogCountryDropdown, setShowBlogCountryDropdown] = useState(false);
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const [showTrafficDropdown, setShowTrafficDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [blogCountrySearch, setBlogCountrySearch] = useState('');

  // Refs
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const languageDropdownRef = useRef<HTMLDivElement>(null);
  const blogLanguageDropdownRef = useRef<HTMLDivElement>(null);
  const blogCountryDropdownRef = useRef<HTMLDivElement>(null);
  const themeDropdownRef = useRef<HTMLDivElement>(null);
  const trafficDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const refs = [
        { ref: countryDropdownRef, setter: setShowCountryDropdown, searchSetter: setCountrySearch },
        { ref: languageDropdownRef, setter: setShowLanguageDropdown },
        { ref: blogLanguageDropdownRef, setter: setShowBlogLanguageDropdown },
        { ref: blogCountryDropdownRef, setter: setShowBlogCountryDropdown, searchSetter: setBlogCountrySearch },
        { ref: themeDropdownRef, setter: setShowThemeDropdown },
        { ref: trafficDropdownRef, setter: setShowTrafficDropdown },
      ];

      refs.forEach(({ ref, setter, searchSetter }) => {
        if (ref.current && !ref.current.contains(e.target as Node)) {
          setter(false);
          if (searchSetter) searchSetter('');
        }
      });
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered data
  const filteredCountries = useMemo(() => {
    if (!countrySearch) return phoneCodesData;
    const strip = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const search = strip(countrySearch);
    return phoneCodesData.filter(entry =>
      strip(getCountryName(entry, locale)).includes(search) || entry.code.toLowerCase().includes(search)
    );
  }, [countrySearch, locale]);

  const filteredBlogCountries = useMemo(() => {
    if (!blogCountrySearch) return phoneCodesData;
    const strip = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const search = strip(blogCountrySearch);
    return phoneCodesData.filter(entry =>
      strip(getCountryName(entry, locale)).includes(search) || entry.code.toLowerCase().includes(search)
    );
  }, [blogCountrySearch, locale]);

  const selectedCountryEntry = useMemo(() => phoneCodesData.find(e => e.code === formData.country), [formData.country]);
  const selectedBlogCountryEntry = useMemo(() => phoneCodesData.find(e => e.code === formData.blogCountry), [formData.blogCountry]);
  const selectedLanguage = useMemo(() => LANGUAGES.find(l => l.value === formData.language), [formData.language]);
  const selectedBlogLanguage = useMemo(() => LANGUAGES.find(l => l.value === formData.blogLanguage), [formData.blogLanguage]);
  const selectedTheme = useMemo(() => BLOG_THEMES.find(t => t.value === formData.blogTheme), [formData.blogTheme]);
  const selectedTraffic = useMemo(() => BLOG_TRAFFIC_TIERS.find(t => t.value === formData.blogTraffic), [formData.blogTraffic]);

  const passwordStrength = useMemo(
    () => formData.password ? evaluatePasswordStrength(formData.password, intl) : null,
    [formData.password, intl]
  );

  // ============================================================================
  // INLINE VALIDATION
  // ============================================================================
  const validateField = useCallback((name: string, value: string): string | null => {
    switch (name) {
      case 'firstName':
      case 'lastName':
        if (!value.trim()) return intl.formatMessage({ id: 'form.error.required', defaultMessage: 'This field is required' });
        if (value.trim().length < 2) return intl.formatMessage({ id: 'form.error.tooShort', defaultMessage: 'Must be at least 2 characters' });
        return null;
      case 'email':
        if (!value.trim()) return intl.formatMessage({ id: 'form.error.required', defaultMessage: 'This field is required' });
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return intl.formatMessage({ id: 'form.error.emailInvalid', defaultMessage: 'Please enter a valid email' });
        return null;
      case 'password':
        if (!value) return intl.formatMessage({ id: 'form.error.required', defaultMessage: 'This field is required' });
        if (value.length < MIN_PASSWORD_LENGTH) return intl.formatMessage({ id: 'form.error.passwordTooShort', defaultMessage: 'Password must be at least 8 characters' });
        return null;
      case 'blogUrl':
        if (!value.trim()) return intl.formatMessage({ id: 'form.error.required', defaultMessage: 'This field is required' });
        if (!/^https?:\/\/.+/.test(value)) return intl.formatMessage({ id: 'form.error.urlInvalid', defaultMessage: 'Please enter a valid URL' });
        return null;
      case 'blogName':
        if (!value.trim()) return intl.formatMessage({ id: 'form.error.required', defaultMessage: 'This field is required' });
        return null;
      default:
        return null;
    }
  }, [intl]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTouchedFields(prev => new Set(prev).add(name));
    const fieldError = validateField(name, value);
    if (fieldError) {
      setValidationErrors(prev => ({ ...prev, [name]: fieldError }));
    } else {
      setValidationErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
    }
  }, [validateField]);

  // ============================================================================
  // HANDLERS
  // ============================================================================
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
    if (touchedFields.has(name)) {
      const fieldError = validateField(name, value);
      if (fieldError) {
        setValidationErrors(prev => ({ ...prev, [name]: fieldError }));
      } else {
        setValidationErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
      }
    }
  };

  const clearValidationError = (field: string) => {
    if (validationErrors[field]) {
      setValidationErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    }
  };

  // ============================================================================
  // VALIDATION & SUBMIT
  // ============================================================================
  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.firstName.trim()) errors.firstName = intl.formatMessage({ id: 'form.error.required', defaultMessage: 'This field is required' });
    if (!formData.lastName.trim()) errors.lastName = intl.formatMessage({ id: 'form.error.required', defaultMessage: 'This field is required' });
    if (!formData.email.trim()) {
      errors.email = intl.formatMessage({ id: 'form.error.required', defaultMessage: 'This field is required' });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = intl.formatMessage({ id: 'form.error.emailInvalid', defaultMessage: 'Please enter a valid email' });
    }
    if (!formData.password) {
      errors.password = intl.formatMessage({ id: 'form.error.required', defaultMessage: 'This field is required' });
    } else if (formData.password.length < MIN_PASSWORD_LENGTH) {
      errors.password = intl.formatMessage({ id: 'form.error.passwordTooShort', defaultMessage: 'Password must be at least 8 characters' });
    }
    if (!formData.country) errors.country = intl.formatMessage({ id: 'form.error.required', defaultMessage: 'This field is required' });
    if (!formData.blogUrl.trim()) {
      errors.blogUrl = intl.formatMessage({ id: 'form.error.required', defaultMessage: 'This field is required' });
    } else if (!/^https?:\/\/.+/.test(formData.blogUrl)) {
      errors.blogUrl = intl.formatMessage({ id: 'form.error.urlInvalid', defaultMessage: 'Please enter a valid URL' });
    }
    if (!formData.blogName.trim()) errors.blogName = intl.formatMessage({ id: 'form.error.required', defaultMessage: 'This field is required' });
    if (!formData.blogCountry) errors.blogCountry = intl.formatMessage({ id: 'form.error.required', defaultMessage: 'This field is required' });
    if (!formData.definitiveRoleAcknowledged) errors.definitiveRoleAcknowledged = intl.formatMessage({ id: 'blogger.register.error.acknowledgment', defaultMessage: 'You must acknowledge that the blogger role is permanent' });
    if (!formData.acceptTerms) errors.acceptTerms = intl.formatMessage({ id: 'form.error.acceptTermsRequired', defaultMessage: 'You must accept the terms and conditions' });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setError(null);

    // Meta Pixel: Generate event ID for deduplication + get fbp/fbc
    const metaEventId = generateEventIdForType('registration');
    const metaIds = getMetaIdentifiers();

    try {
      await register({
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: 'blogger',
        // Meta Pixel/CAPI tracking identifiers (filter undefined to avoid Firestore error)
        ...(metaIds.fbp && { fbp: metaIds.fbp }),
        ...(metaIds.fbc && { fbc: metaIds.fbc }),
        country: formData.country,
        metaEventId,
      }, formData.password);

      const registerBlogger = httpsCallable<RegisterBloggerInput, RegisterBloggerResponse>(functionsWest2, 'registerBlogger');

      const result = await registerBlogger({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: '',
        country: formData.country,
        language: formData.language,
        bio: '',
        blogUrl: formData.blogUrl,
        blogName: formData.blogName,
        blogLanguage: formData.blogLanguage,
        blogCountry: formData.blogCountry,
        blogTheme: formData.blogTheme as RegisterBloggerInput['blogTheme'],
        blogTraffic: formData.blogTraffic as RegisterBloggerInput['blogTraffic'],
        blogDescription: formData.blogDescription,
        definitiveRoleAcknowledged: formData.definitiveRoleAcknowledged,
        recruiterCode: formData.referralCode || undefined,
        termsAcceptedAt: new Date().toISOString(),
        termsVersion: "3.0",
        termsType: "terms_bloggers",
        termsAcceptanceMeta: {
          userAgent: navigator.userAgent,
          language: navigator.language,
          timestamp: Date.now(),
          acceptanceMethod: "checkbox_click",
        },
      });

      if (result.data.success) {
        setSuccess(true);
        clearStoredReferral('blogger');

        // Meta Pixel: Track CompleteRegistration + Ad Attribution + Advanced Matching
        trackMetaCompleteRegistration({
          content_name: 'blogger_registration',
          status: 'completed',
          country: formData.country,
          eventID: metaEventId,
        });
        trackAdRegistration({ contentName: 'blogger_registration' });
        setMetaPixelUserData({
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          country: formData.country,
        });

        await refreshUser();
        setTimeout(() => {
          navigate(dashboardRoute, { replace: true });
        }, 2000);
      } else {
        setError(result.data.message);
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      const errorMessage = e.message || 'An error occurred';

      if (errorMessage.includes('email-already-in-use') || errorMessage.includes('already associated')) {
        setEmailAlreadyExists(true);
        setExistingEmail(formData.email);
      } else if (errorMessage.includes('weak-password')) {
        setError(intl.formatMessage({ id: 'form.error.weakPassword', defaultMessage: 'Password is too weak' }));
      } else if (errorMessage.includes('invalid-email')) {
        setError(intl.formatMessage({ id: 'form.error.emailInvalid', defaultMessage: 'Please enter a valid email' }));
      } else if (errorMessage.includes('network')) {
        setError(intl.formatMessage({ id: 'form.error.network', defaultMessage: 'Network error. Please try again.' }));
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================================
  // RENDER: Role conflict
  // ============================================================================
  if (authInitialized && !authLoading && hasExistingRole && !isAlreadyBlogger) {
    const roleLabels: Record<string, string> = {
      chatter: 'Chatter',
      influencer: 'Influencer',
      groupAdmin: 'Group Admin',
      lawyer: intl.formatMessage({ id: 'role.lawyer', defaultMessage: 'Lawyer' }),
      expat: intl.formatMessage({ id: 'role.expat', defaultMessage: 'Expat Helper' }),
      client: intl.formatMessage({ id: 'role.client', defaultMessage: 'Client' }),
    };

    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-b from-purple-950 via-gray-950 to-black">
          <div className={`max-w-md w-full ${s.card} p-8 text-center`}>
            <div className="w-16 h-16 bg-purple-500/20 border rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold mb-4">
              <FormattedMessage id="blogger.register.roleConflict.title" defaultMessage="Registration Not Allowed" />
            </h1>
            <p className="text-gray-400 mb-6">
              <FormattedMessage
                id="blogger.register.roleConflict.message"
                defaultMessage="You are already registered as {role}. Each account can only have one role."
                values={{ role: roleLabels[userRole] || userRole }}
              />
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full px-6 py-3 min-h-[48px] bg-gradient-to-r from-purple-500 to-violet-500 text-white font-extrabold rounded-xl transition-all hover:shadow-lg"
            >
              <FormattedMessage id="blogger.register.roleConflict.button" defaultMessage="Go to My Dashboard" />
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const seoTitle = intl.formatMessage({ id: 'blogger.register.seo.title', defaultMessage: 'Inscription Blogger SOS-Expat' });
  const seoDescription = intl.formatMessage({ id: 'blogger.register.seo.description', defaultMessage: 'Inscrivez-vous au programme Blogger SOS-Expat.' });

  const benefits = [
    { icon: <Gift className="w-5 h-5 text-purple-400" />, text: intl.formatMessage({ id: 'blogger.register.benefit1', defaultMessage: '$10 per referred client' }) },
    { icon: <PenTool className="w-5 h-5 text-violet-400" />, text: intl.formatMessage({ id: 'blogger.register.benefit2', defaultMessage: '$5 per recruited provider' }) },
    { icon: <BarChart3 className="w-5 h-5 text-blue-400" />, text: intl.formatMessage({ id: 'blogger.register.benefit3', defaultMessage: 'Banners, widgets, QR codes included' }) },
    { icon: <CheckCircle className="w-5 h-5 text-green-400" />, text: intl.formatMessage({ id: 'blogger.register.benefit4', defaultMessage: 'Instant activation (no quiz)' }) },
  ];

  // ============================================================================
  // RENDER: Main
  // ============================================================================
  return (
    <Layout>
      <SEOHead title={seoTitle} description={seoDescription} ogImage="/og-blogger-register.jpg" ogType="website" />
      <HreflangLinks pathname={location.pathname} />

      <div className="min-h-screen bg-gradient-to-b from-purple-950 via-gray-950 to-black py-12 px-4">
        {/* Radial glow */}
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(168,85,247,0.08),transparent_50%)] pointer-events-none" />

        <div className="max-w-4xl mx-auto relative z-10">
          {/* Back Button */}
          <button
            onClick={() => navigate(landingRoute)}
            className="flex items-center gap-2 text-gray-400 hover:text-purple-400 transition-colors mb-6 min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <FormattedMessage id="common.back" defaultMessage="Retour" />
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center shadow-lg">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              <FormattedMessage id="blogger.register.title" defaultMessage="Become a Partner Blogger" />
            </h1>
            <p className="text-lg max-w-2xl mx-auto">
              <FormattedMessage id="blogger.register.subtitle" defaultMessage="Earn $10 per referred client and $5 per recruited provider" />
            </p>
          </div>

          {/* Email Already Exists */}
          {emailAlreadyExists ? (
            <div className="max-w-lg mx-auto">
              <div className={`${s.card} p-8 text-center`}>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/20 border flex items-center justify-center">
                  <Mail className="w-8 h-8 text-blue-400" />
                </div>
                <h2 className="text-xl font-bold mb-2">
                  <FormattedMessage id="blogger.register.emailExists.title" defaultMessage="You already have an account!" />
                </h2>
                <p className="text-gray-400 mb-2">
                  <FormattedMessage
                    id="blogger.register.emailExists.message"
                    defaultMessage="The email {email} is already registered."
                    values={{ email: <strong className="text-white">{existingEmail}</strong> }}
                  />
                </p>
                <p className="text-gray-500 mb-6">
                  <FormattedMessage id="blogger.register.emailExists.hint" defaultMessage="Log in to continue." />
                </p>
                <button
                  onClick={() => navigate(loginRoute)}
                  className="w-full py-4 bg-gradient-to-r from-purple-500 to-violet-500 text-white font-bold rounded-xl flex items-center justify-center gap-3 hover:opacity-90 transition-opacity mb-4"
                >
                  <LogIn className="w-5 h-5" />
                  <FormattedMessage id="blogger.register.emailExists.loginButton" defaultMessage="Log in" />
                </button>
                <button
                  onClick={() => { setEmailAlreadyExists(false); setExistingEmail(''); }}
                  className="text-sm hover:text-white underline"
                >
                  <FormattedMessage id="blogger.register.emailExists.tryDifferent" defaultMessage="Use a different email" />
                </button>
              </div>
            </div>
          ) : success ? (
            <div className="max-w-lg mx-auto">
              <div className={`${s.card} p-8 text-center`}>
                <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center shadow-lg bg-green-500/20 border">
                  <Check className="w-10 h-10 text-green-400" />
                </div>
                <h2 className="text-2xl font-bold mb-2">
                  <FormattedMessage id="blogger.register.success.title" defaultMessage="Registration successful!" />
                </h2>
                <p className="text-gray-400">
                  <FormattedMessage id="blogger.register.success.message" defaultMessage="Your blogger account is now active. Redirecting to your dashboard..." />
                </p>
              </div>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Benefits Sidebar */}
              <div className="lg:col-span-1">
                <div className={`${s.card} p-6 sticky top-24`}>
                  <h2 className="font-semibold text-white mb-4">
                    <FormattedMessage id="blogger.register.benefits.title" defaultMessage="What you get" />
                  </h2>
                  <div className="space-y-4">
                    {benefits.map((benefit, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        {benefit.icon}
                        <span className="text-sm">{benefit.text}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 pt-6 border-t">
                    <div className="text-sm">
                      <FormattedMessage id="blogger.register.info" defaultMessage="Registration is free. Your account will be activated immediately." />
                    </div>
                  </div>
                </div>
              </div>

              {/* Form */}
              <div className="lg:col-span-2">
                <div className={`${s.card} p-6`}>
                  {/* Already registered link */}
                  <div className="mb-6 p-3 bg-blue-500/10 rounded-xl border text-center">
                    <p className="text-sm">
                      <FormattedMessage id="blogger.register.alreadyRegistered" defaultMessage="Already registered?" />{' '}
                      <button onClick={() => navigate(loginRoute)} className="text-blue-400 hover:text-blue-300 font-medium underline">
                        <FormattedMessage id="blogger.register.loginLink" defaultMessage="Log in here" />
                      </button>
                    </p>
                  </div>

                  {/* Referral code banner */}
                  {referralCodeFromUrl && (
                    <div className="mb-6 p-4 bg-green-500/10 rounded-xl border">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500/20 border rounded-full flex items-center justify-center">
                          <Gift className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-green-300">
                            <FormattedMessage id="blogger.register.referralDetected" defaultMessage="You've been referred!" />
                          </p>
                          <p className="text-sm">
                            <FormattedMessage
                              id="blogger.register.referralCode.applied"
                              defaultMessage="Referral code {code} will be applied automatically"
                              values={{ code: <strong className="text-green-300">{referralCodeFromUrl}</strong> }}
                            />
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-8" noValidate>
                    {/* ARIA */}
                    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
                      {Object.keys(validationErrors).length > 0 && intl.formatMessage({ id: 'form.errors.count', defaultMessage: '{count} errors in form' }, { count: Object.keys(validationErrors).length })}
                    </div>

                    {error && (
                      <div role="alert" className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border text-red-400">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{error}</span>
                      </div>
                    )}

                    {/* ---- Personal Info ---- */}
                    <div>
                      <h3 className={s.sectionTitle}>
                        <FormattedMessage id="blogger.register.personalInfo" defaultMessage="Personal Information" />
                      </h3>
                      <div className="space-y-4 mt-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          {/* First Name */}
                          <div className="space-y-1">
                            <label htmlFor="firstName" className={s.label}><FormattedMessage id="form.firstName" defaultMessage="First name" /><span className="text-purple-400 ml-0.5">*</span></label>
                            <div className="relative">
                              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 z-10 pointer-events-none" />
                              <input type="text" id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} onBlur={handleBlur} placeholder={intl.formatMessage({ id: 'form.firstName.placeholder', defaultMessage: 'Your first name' })} className={`${s.input} pl-12 ${validationErrors.firstName ? s.inputError : s.inputDefault} ${formData.firstName ? s.inputFilled : ''}`} aria-required="true" aria-invalid={!!validationErrors.firstName} autoComplete="given-name" enterKeyHint="next" />
                            </div>
                            {validationErrors.firstName && <p className={s.errorText} role="alert"><span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white">!</span>{validationErrors.firstName}</p>}
                          </div>

                          {/* Last Name */}
                          <div className="space-y-1">
                            <label htmlFor="lastName" className={s.label}><FormattedMessage id="form.lastName" defaultMessage="Last name" /><span className="text-purple-400 ml-0.5">*</span></label>
                            <div className="relative">
                              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 z-10 pointer-events-none" />
                              <input type="text" id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} onBlur={handleBlur} placeholder={intl.formatMessage({ id: 'form.lastName.placeholder', defaultMessage: 'Your last name' })} className={`${s.input} pl-12 ${validationErrors.lastName ? s.inputError : s.inputDefault} ${formData.lastName ? s.inputFilled : ''}`} aria-required="true" aria-invalid={!!validationErrors.lastName} autoComplete="family-name" enterKeyHint="next" />
                            </div>
                            {validationErrors.lastName && <p className={s.errorText} role="alert"><span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white">!</span>{validationErrors.lastName}</p>}
                          </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-1">
                          <label htmlFor="email" className={s.label}><FormattedMessage id="form.email" defaultMessage="Email" /><span className="text-purple-400 ml-0.5">*</span></label>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 z-10 pointer-events-none" />
                            <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} onBlur={handleBlur} placeholder={intl.formatMessage({ id: 'form.email.placeholder', defaultMessage: 'your@email.com' })} autoComplete="email" inputMode="email" enterKeyHint="next" className={`${s.input} pl-12 ${validationErrors.email ? s.inputError : s.inputDefault} ${formData.email ? s.inputFilled : ''}`} aria-required="true" aria-invalid={!!validationErrors.email} />
                          </div>
                          {validationErrors.email && <p className={s.errorText} role="alert"><span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white">!</span>{validationErrors.email}</p>}
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                          <label htmlFor="password" className={s.label}><FormattedMessage id="form.password" defaultMessage="Password" /><span className="text-purple-400 ml-0.5">*</span></label>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 z-10 pointer-events-none" />
                            <input id="password" name="password" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={handleChange} onBlur={handleBlur} placeholder={intl.formatMessage({ id: 'form.password.placeholder', defaultMessage: 'Minimum 8 characters' })} autoComplete="new-password" enterKeyHint="next" className={`${s.input} pl-12 pr-12 ${validationErrors.password ? s.inputError : s.inputDefault}`} aria-required="true" aria-invalid={!!validationErrors.password} />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 hover:bg-white/10 transition-colors z-10 p-1 rounded-lg" aria-label={showPassword ? intl.formatMessage({ id: 'form.password.hide', defaultMessage: 'Hide password' }) : intl.formatMessage({ id: 'form.password.show', defaultMessage: 'Show password' })} aria-pressed={showPassword}>
                              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                          {passwordStrength && (
                            <div className="mt-2 space-y-2">
                              <div className="h-1.5 rounded-full overflow-hidden bg-white/10">
                                <div className={`h-full transition-all duration-300 ${passwordStrength.width} ${passwordStrength.score === 0 ? 'bg-red-500' : passwordStrength.score === 1 ? 'bg-red-400' : passwordStrength.score === 2 ? 'bg-orange-400' : passwordStrength.score === 3 ? 'bg-yellow-400' : 'bg-green-500'}`} />
                              </div>
                              <div className="flex items-center justify-between">
                                <p className={`text-xs font-medium ${passwordStrength.color}`}>{passwordStrength.label}</p>
                                {passwordStrength.feedback.length > 0 && <p className="text-xs">{passwordStrength.feedback[0]}</p>}
                              </div>
                            </div>
                          )}
                          {validationErrors.password && <p className={s.errorText} role="alert"><span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white">!</span>{validationErrors.password}</p>}
                        </div>

                        {/* Country + Language */}
                        <div className="grid md:grid-cols-2 gap-4">
                          {/* Country Dropdown */}
                          <div ref={countryDropdownRef} className="space-y-2">
                            <label className={s.label}><FormattedMessage id="form.country" defaultMessage="Country" /><span className="text-purple-400 ml-0.5">*</span></label>
                            <div className="relative">
                              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 z-10" />
                              <button type="button" onClick={() => setShowCountryDropdown(!showCountryDropdown)} className={`${s.input} pl-12 pr-10 text-left flex items-center justify-between ${validationErrors.country ? s.inputError : s.inputDefault}`} aria-haspopup="listbox" aria-expanded={showCountryDropdown}>
                                <span className={selectedCountryEntry ? 'text-white' : 'text-gray-500'}>
                                  {selectedCountryEntry ? <span className="flex items-center gap-2"><span className="text-lg">{getFlag(selectedCountryEntry.code)}</span><span className="truncate">{getCountryName(selectedCountryEntry, locale)}</span></span> : intl.formatMessage({ id: 'form.country.placeholder', defaultMessage: 'Select country' })}
                                </span>
                                <ChevronDown className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform duration-200 ${showCountryDropdown ? 'rotate-180' : ''}`} />
                              </button>
                              {showCountryDropdown && (
                                <div className={s.dropdown}>
                                  <div className="p-2 border-b"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" value={countrySearch} onChange={(e) => setCountrySearch(e.target.value)} placeholder={intl.formatMessage({ id: 'form.search.country', defaultMessage: 'Search...' })} className={s.dropdownSearch} autoFocus /></div></div>
                                  <div className="max-h-[280px] overflow-y-auto overscroll-contain">
                                    {filteredCountries.map((entry) => (
                                      <button key={entry.code} type="button" onClick={() => { setFormData(prev => ({ ...prev, country: entry.code })); setShowCountryDropdown(false); setCountrySearch(''); clearValidationError('country'); }} className={`${s.dropdownItem} ${entry.code === formData.country ? 'bg-purple-500/10' : ''}`}>
                                        <span className="text-xl">{getFlag(entry.code)}</span><span className="flex-1 text-sm">{getCountryName(entry, locale)}</span>{entry.code === formData.country && <Check className="w-4 h-4 text-purple-400" />}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            {validationErrors.country && <p className={s.errorText} role="alert"><span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white">!</span>{validationErrors.country}</p>}
                          </div>

                          {/* Language */}
                          <div ref={languageDropdownRef} className="space-y-2">
                            <label className={s.label}><FormattedMessage id="form.language" defaultMessage="Main language" /></label>
                            <div className="relative">
                              <button type="button" onClick={() => setShowLanguageDropdown(!showLanguageDropdown)} className={`${s.input} pr-10 text-left flex items-center justify-between`} aria-haspopup="listbox" aria-expanded={showLanguageDropdown}>
                                <span className="text-white">{selectedLanguage?.label || 'Select'}</span>
                                <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${showLanguageDropdown ? 'rotate-180' : ''}`} />
                              </button>
                              {showLanguageDropdown && (
                                <div className={s.dropdown}><div className="max-h-[280px] overflow-y-auto overscroll-contain">
                                  {LANGUAGES.map((lang) => (
                                    <button key={lang.value} type="button" onClick={() => { setFormData(prev => ({ ...prev, language: lang.value })); setShowLanguageDropdown(false); }} className={`${s.dropdownItem} ${lang.value === formData.language ? 'bg-purple-500/10' : ''}`}>
                                      <span className="flex-1 text-sm">{lang.label}</span>{lang.value === formData.language && <Check className="w-4 h-4 text-purple-400" />}
                                    </button>
                                  ))}
                                </div></div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ---- Blog Info ---- */}
                    <div>
                      <h3 className={s.sectionTitle}><FormattedMessage id="blogger.register.blogInfo" defaultMessage="Blog Information" /></h3>
                      <div className="space-y-4 mt-4">
                        {/* Blog URL */}
                        <div className="space-y-1">
                          <label htmlFor="blogUrl" className={s.label}><FormattedMessage id="form.blogUrl" defaultMessage="Blog URL" /><span className="text-purple-400 ml-0.5">*</span></label>
                          <div className="relative">
                            <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 z-10 pointer-events-none" />
                            <input type="url" id="blogUrl" name="blogUrl" value={formData.blogUrl} onChange={handleChange} onBlur={handleBlur} placeholder="https://myblog.com" className={`${s.input} pl-12 ${validationErrors.blogUrl ? s.inputError : s.inputDefault} ${formData.blogUrl ? s.inputFilled : ''}`} aria-required="true" aria-invalid={!!validationErrors.blogUrl} inputMode="url" />
                          </div>
                          {validationErrors.blogUrl && <p className={s.errorText} role="alert"><span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white">!</span>{validationErrors.blogUrl}</p>}
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          {/* Blog Name */}
                          <div className="space-y-1">
                            <label htmlFor="blogName" className={s.label}><FormattedMessage id="form.blogName" defaultMessage="Blog name" /><span className="text-purple-400 ml-0.5">*</span></label>
                            <div className="relative">
                              <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 z-10 pointer-events-none" />
                              <input type="text" id="blogName" name="blogName" value={formData.blogName} onChange={handleChange} onBlur={handleBlur} placeholder={intl.formatMessage({ id: 'form.blogName.placeholder', defaultMessage: 'My Amazing Blog' })} className={`${s.input} pl-12 ${validationErrors.blogName ? s.inputError : s.inputDefault} ${formData.blogName ? s.inputFilled : ''}`} aria-required="true" aria-invalid={!!validationErrors.blogName} />
                            </div>
                            {validationErrors.blogName && <p className={s.errorText} role="alert"><span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white">!</span>{validationErrors.blogName}</p>}
                          </div>

                          {/* Blog Language */}
                          <div ref={blogLanguageDropdownRef} className="space-y-2">
                            <label className={s.label}><FormattedMessage id="form.blogLanguage" defaultMessage="Blog language" /></label>
                            <div className="relative">
                              <button type="button" onClick={() => setShowBlogLanguageDropdown(!showBlogLanguageDropdown)} className={`${s.input} pr-10 text-left flex items-center justify-between`} aria-haspopup="listbox" aria-expanded={showBlogLanguageDropdown}>
                                <span className="text-white">{selectedBlogLanguage?.label || 'Select'}</span>
                                <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${showBlogLanguageDropdown ? 'rotate-180' : ''}`} />
                              </button>
                              {showBlogLanguageDropdown && (
                                <div className={s.dropdown}><div className="max-h-[280px] overflow-y-auto overscroll-contain">
                                  {LANGUAGES.map((lang) => (
                                    <button key={lang.value} type="button" onClick={() => { setFormData(prev => ({ ...prev, blogLanguage: lang.value })); setShowBlogLanguageDropdown(false); }} className={`${s.dropdownItem} ${lang.value === formData.blogLanguage ? 'bg-purple-500/10' : ''}`}>
                                      <span className="flex-1 text-sm">{lang.label}</span>{lang.value === formData.blogLanguage && <Check className="w-4 h-4 text-purple-400" />}
                                    </button>
                                  ))}
                                </div></div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          {/* Blog Target Country */}
                          <div ref={blogCountryDropdownRef} className="space-y-2">
                            <label className={s.label}><FormattedMessage id="form.blogCountry" defaultMessage="Target country" /><span className="text-purple-400 ml-0.5">*</span></label>
                            <div className="relative">
                              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 z-10" />
                              <button type="button" onClick={() => setShowBlogCountryDropdown(!showBlogCountryDropdown)} className={`${s.input} pl-12 pr-10 text-left flex items-center justify-between ${validationErrors.blogCountry ? s.inputError : s.inputDefault}`} aria-haspopup="listbox" aria-expanded={showBlogCountryDropdown}>
                                <span className={selectedBlogCountryEntry ? 'text-white' : 'text-gray-500'}>
                                  {selectedBlogCountryEntry ? <span className="flex items-center gap-2"><span className="text-lg">{getFlag(selectedBlogCountryEntry.code)}</span><span className="truncate">{getCountryName(selectedBlogCountryEntry, locale)}</span></span> : intl.formatMessage({ id: 'form.blogCountry.placeholder', defaultMessage: 'Target audience' })}
                                </span>
                                <ChevronDown className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform duration-200 ${showBlogCountryDropdown ? 'rotate-180' : ''}`} />
                              </button>
                              {showBlogCountryDropdown && (
                                <div className={s.dropdown}>
                                  <div className="p-2 border-b"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" value={blogCountrySearch} onChange={(e) => setBlogCountrySearch(e.target.value)} placeholder={intl.formatMessage({ id: 'form.search.country', defaultMessage: 'Search...' })} className={s.dropdownSearch} autoFocus /></div></div>
                                  <div className="max-h-[280px] overflow-y-auto overscroll-contain">
                                    {filteredBlogCountries.map((entry) => (
                                      <button key={entry.code} type="button" onClick={() => { setFormData(prev => ({ ...prev, blogCountry: entry.code })); setShowBlogCountryDropdown(false); setBlogCountrySearch(''); clearValidationError('blogCountry'); }} className={`${s.dropdownItem} ${entry.code === formData.blogCountry ? 'bg-purple-500/10' : ''}`}>
                                        <span className="text-xl">{getFlag(entry.code)}</span><span className="flex-1 text-sm">{getCountryName(entry, locale)}</span>{entry.code === formData.blogCountry && <Check className="w-4 h-4 text-purple-400" />}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            {validationErrors.blogCountry && <p className={s.errorText} role="alert"><span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white">!</span>{validationErrors.blogCountry}</p>}
                          </div>

                          {/* Blog Theme */}
                          <div ref={themeDropdownRef} className="space-y-2">
                            <label className={s.label}><FormattedMessage id="form.blogTheme" defaultMessage="Theme" /></label>
                            <div className="relative">
                              <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 z-10" />
                              <button type="button" onClick={() => setShowThemeDropdown(!showThemeDropdown)} className={`${s.input} pl-12 pr-10 text-left flex items-center justify-between`} aria-haspopup="listbox" aria-expanded={showThemeDropdown}>
                                <span className="text-white">{selectedTheme?.labelFr || 'Select'}</span>
                                <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${showThemeDropdown ? 'rotate-180' : ''}`} />
                              </button>
                              {showThemeDropdown && (
                                <div className={s.dropdown}><div className="max-h-[280px] overflow-y-auto overscroll-contain">
                                  {BLOG_THEMES.map((theme) => (
                                    <button key={theme.value} type="button" onClick={() => { setFormData(prev => ({ ...prev, blogTheme: theme.value })); setShowThemeDropdown(false); }} className={`${s.dropdownItem} ${theme.value === formData.blogTheme ? 'bg-purple-500/10' : ''}`}>
                                      <span className="flex-1 text-sm">{theme.labelFr}</span>{theme.value === formData.blogTheme && <Check className="w-4 h-4 text-purple-400" />}
                                    </button>
                                  ))}
                                </div></div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Blog Traffic */}
                        <div ref={trafficDropdownRef} className="space-y-2">
                          <label className={s.label}><FormattedMessage id="form.blogTraffic" defaultMessage="Monthly traffic estimate" /></label>
                          <div className="relative">
                            <BarChart3 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 z-10" />
                            <button type="button" onClick={() => setShowTrafficDropdown(!showTrafficDropdown)} className={`${s.input} pl-12 pr-10 text-left flex items-center justify-between`} aria-haspopup="listbox" aria-expanded={showTrafficDropdown}>
                              <span className="text-white">{selectedTraffic?.labelFr || 'Select'}</span>
                              <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${showTrafficDropdown ? 'rotate-180' : ''}`} />
                            </button>
                            {showTrafficDropdown && (
                              <div className={s.dropdown}><div className="max-h-[280px] overflow-y-auto overscroll-contain">
                                {BLOG_TRAFFIC_TIERS.map((tier) => (
                                  <button key={tier.value} type="button" onClick={() => { setFormData(prev => ({ ...prev, blogTraffic: tier.value })); setShowTrafficDropdown(false); }} className={`${s.dropdownItem} ${tier.value === formData.blogTraffic ? 'bg-purple-500/10' : ''}`}>
                                    <span className="flex-1 text-sm">{tier.labelFr}</span>{tier.value === formData.blogTraffic && <Check className="w-4 h-4 text-purple-400" />}
                                  </button>
                                ))}
                              </div></div>
                            )}
                          </div>
                        </div>

                        {/* Blog Description */}
                        <div className="space-y-1">
                          <label htmlFor="blogDescription" className={s.label}><FormattedMessage id="form.blogDescription" defaultMessage="Blog description" /></label>
                          <textarea id="blogDescription" name="blogDescription" value={formData.blogDescription} onChange={handleChange} placeholder={intl.formatMessage({ id: 'form.blogDescription.placeholder', defaultMessage: 'Describe your blog and its audience...' })} rows={3} maxLength={500} className={`${s.input} resize-none ${formData.blogDescription ? s.inputFilled : ''}`} />
                          <div className="flex justify-end"><span className="text-xs">{formData.blogDescription.length}/500</span></div>
                        </div>
                      </div>
                    </div>

                    {/* ---- Definitive Role Warning ---- */}
                    <div className="p-4 bg-amber-500/10 rounded-2xl border">
                      <div className="flex items-start gap-3 mb-3">
                        <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-amber-300"><FormattedMessage id="blogger.register.warning.title" defaultMessage="Important: Permanent Role" /></p>
                          <p className="text-sm mt-1"><FormattedMessage id="blogger.register.warning.message" defaultMessage="By becoming a partner blogger, you will not be able to become a Chatter or Influencer. This choice is final and irreversible." /></p>
                        </div>
                      </div>
                      <label className="flex items-start gap-3 cursor-pointer select-none">
                        <input type="checkbox" checked={formData.definitiveRoleAcknowledged} onChange={(e) => { setFormData(prev => ({ ...prev, definitiveRoleAcknowledged: e.target.checked })); clearValidationError('definitiveRoleAcknowledged'); }} className={`h-5 w-5 rounded border-2 mt-0.5${validationErrors.definitiveRoleAcknowledged ? 'border-red-500 bg-red-500/10' : formData.definitiveRoleAcknowledged ? 'border-amber-400 bg-amber-400 text-black' : 'border-white/20 bg-white/10'}focus:ring-2 transition-all duration-200 cursor-pointer`} aria-required="true" />
                        <span className="text-sm"><FormattedMessage id="blogger.register.acknowledgment" defaultMessage="I understand and accept that this role is permanent" /></span>
                      </label>
                      {validationErrors.definitiveRoleAcknowledged && <p className={`${s.errorText} mt-2`} role="alert"><span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white">!</span>{validationErrors.definitiveRoleAcknowledged}</p>}
                    </div>

                    {/* ---- Terms & Conditions ---- */}
                    <div className="space-y-2">
                      <label className="flex items-start gap-3 cursor-pointer select-none">
                        <input type="checkbox" checked={formData.acceptTerms} onChange={(e) => { setFormData(prev => ({ ...prev, acceptTerms: e.target.checked })); clearValidationError('acceptTerms'); }} className={`h-5 w-5 rounded border-2 mt-0.5${validationErrors.acceptTerms ? 'border-red-500 bg-red-500/10' : formData.acceptTerms ? 'border-purple-400 bg-purple-400 text-white' : 'border-white/20 bg-white/10'}focus:ring-2 transition-all duration-200 cursor-pointer`} aria-required="true" aria-invalid={!!validationErrors.acceptTerms} />
                        <span className="text-sm leading-relaxed">
                          <FormattedMessage
                            id="blogger.register.acceptTerms"
                            defaultMessage="I accept the {termsLink} and the {privacyLink}"
                            values={{
                              termsLink: <Link to="/cgu-bloggers" target="_blank" rel="noopener noreferrer" className="underline font-medium text-purple-400 hover:text-purple-300"><FormattedMessage id="form.termsOfService" defaultMessage="Terms of Service" /></Link>,
                              privacyLink: <Link to="/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline font-medium text-purple-400 hover:text-purple-300"><FormattedMessage id="form.privacyPolicy" defaultMessage="Privacy Policy" /></Link>,
                            }}
                          />
                          <span className="text-purple-400 ml-0.5">*</span>
                        </span>
                      </label>
                      {validationErrors.acceptTerms && <p className={s.errorText} role="alert"><span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white">!</span>{validationErrors.acceptTerms}</p>}
                    </div>

                    {/* Submit */}
                    <button type="submit" disabled={isSubmitting || !formData.acceptTerms || !formData.definitiveRoleAcknowledged} aria-busy={isSubmitting} className="w-full py-4 px-6 font-extrabold rounded-2xl flex items-center justify-center gap-2 transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-lg hover:shadow-xl hover:from-purple-400 hover:to-violet-400 active:scale-[0.98]">
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 rounded-full animate-spin" />
                          <FormattedMessage id="form.submitting" defaultMessage="Processing..." />
                        </>
                      ) : (
                        <FormattedMessage id="blogger.register.submit" defaultMessage="Become a Partner Blogger" />
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default BloggerRegister;
