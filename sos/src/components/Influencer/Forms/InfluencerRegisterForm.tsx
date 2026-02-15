/**
 * InfluencerRegisterForm - Dark theme registration form for influencers
 * Harmonized with ChatterRegisterForm pattern (2026 best practices)
 *
 * Features:
 * - Dark-only glassmorphism (red accent)
 * - Password strength indicator
 * - Inline validation on blur
 * - Terms acceptance with eIDAS/RGPD tracking
 * - onEmailAlreadyExists callback
 * - Keyboard-accessible dropdowns (ARIA listbox)
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  User,
  Mail,
  Globe,
  Users,
  Tag,
  ChevronDown,
  Search,
  Check,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLocaleNavigate } from '@/multilingual-system';
import { getTranslatedRouteSlug, type RouteKey } from '@/multilingual-system/core/routing/localeRoutes';
import { useApp } from '@/contexts/AppContext';
import { httpsCallable } from 'firebase/functions';
import { phoneCodesData, type PhoneCodeEntry } from '@/data/phone-codes';
import { clearStoredReferral } from '@/utils/referralStorage';
import { getCountryNameFromEntry as getCountryName, getFlag } from '@/utils/phoneCodeHelpers';
import { trackMetaCompleteRegistration, trackMetaStartRegistration, getMetaIdentifiers, setMetaPixelUserData } from '@/utils/metaPixel';
import { trackAdRegistration } from '@/services/adAttributionService';
import { generateEventIdForType } from '@/utils/sharedEventId';

// ============================================================================
// PASSWORD STRENGTH UTILITY
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

  return {
    score: normalizedScore,
    ...strengthMap[normalizedScore],
    feedback: feedback.slice(0, 2),
  };
};

// ============================================================================
// DARK THEME STYLES (red accent - matching influencer theme)
// ============================================================================
const darkStyles = {
  input: `
    w-full px-4 py-3.5
    bg-white/10 border-2 border-white/10
    rounded-2xl
    text-base text-white
    placeholder:text-gray-400
    focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:ring-offset-0
    focus:border-red-400/50 focus:bg-white/10
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
  sectionDescription: 'text-sm text-gray-300 mb-4',
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
  dropdownSearch: 'w-full pl-9 pr-3 py-2.5 text-sm bg-white/10 text-white rounded-xl border-0 focus:ring-2 focus:ring-red-400/30 placeholder:text-gray-400',
};

// ============================================================================
// CONSTANTS
// ============================================================================
const PLATFORMS = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'blog', label: 'Blog' },
  { value: 'website', label: 'Website' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'other', label: 'Other' },
];

const LANGUAGES = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'de', label: 'Deutsch' },
  { value: 'pt', label: 'Português' },
  { value: 'ar', label: 'العربية' },
  { value: 'it', label: 'Italiano' },
  { value: 'nl', label: 'Nederlands' },
  { value: 'zh', label: '中文' },
];

// ============================================================================
// TYPES
// ============================================================================
interface InfluencerFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  country: string;
  language: string;
  platforms: string[];
  bio: string;
  communitySize: string;
  communityNiche: string;
  interventionCountries: string[]; // Geographic targeting (optional)
  referralCode: string;
  acceptTerms: boolean;
}

interface InfluencerRegisterFormProps {
  referralCode?: string;
  onEmailAlreadyExists?: (email: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================
const InfluencerRegisterForm: React.FC<InfluencerRegisterFormProps> = ({
  referralCode = '',
  onEmailAlreadyExists,
}) => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const { user, register, refreshUser } = useAuth();
  const { language } = useApp();
  const locale = (language || 'en') as string;
  const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState<InfluencerFormData>({
    firstName: user?.firstName || user?.displayName?.split(' ')[0] || '',
    lastName: user?.lastName || user?.displayName?.split(' ').slice(1).join(' ') || '',
    email: user?.email || '',
    password: '',
    country: '',
    language: (language || 'fr') as string,
    platforms: [],
    bio: '',
    communitySize: '',
    communityNiche: '',
    interventionCountries: [], // Optional geographic targeting
    referralCode: referralCode,
    acceptTerms: false,
  });

  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showInterventionCountriesDropdown, setShowInterventionCountriesDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [interventionCountriesSearch, setInterventionCountriesSearch] = useState('');
  const [focusedDropdownIndex, setFocusedDropdownIndex] = useState(-1);

  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const languageDropdownRef = useRef<HTMLDivElement>(null);
  const interventionCountriesDropdownRef = useRef<HTMLDivElement>(null);
  const countryListRef = useRef<HTMLDivElement>(null);
  const interventionCountriesListRef = useRef<HTMLDivElement>(null);

  const s = darkStyles;

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target as Node)) {
        setShowCountryDropdown(false);
        setCountrySearch('');
      }
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(e.target as Node)) {
        setShowLanguageDropdown(false);
      }
      if (interventionCountriesDropdownRef.current && !interventionCountriesDropdownRef.current.contains(e.target as Node)) {
        setShowInterventionCountriesDropdown(false);
        setInterventionCountriesSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset focused index when dropdown opens/closes
  useEffect(() => {
    setFocusedDropdownIndex(-1);
  }, [showCountryDropdown, showLanguageDropdown, showInterventionCountriesDropdown]);

  // Meta Pixel: Track StartRegistration on mount
  useEffect(() => {
    trackMetaStartRegistration({ content_name: 'influencer_registration' });
  }, []);

  // Scroll focused item into view
  useEffect(() => {
    if (showCountryDropdown && focusedDropdownIndex >= 0 && countryListRef.current) {
      const items = countryListRef.current.querySelectorAll('[role="option"]');
      items[focusedDropdownIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedDropdownIndex, showCountryDropdown]);

  // Filter countries based on search (accent-insensitive)
  const filteredCountries = useMemo(() => {
    if (!countrySearch) return phoneCodesData;
    const strip = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const search = strip(countrySearch);
    return phoneCodesData.filter(entry =>
      strip(getCountryName(entry, locale)).includes(search) ||
      entry.code.toLowerCase().includes(search)
    );
  }, [countrySearch, locale]);

  // Filter intervention countries based on search
  const filteredInterventionCountries = useMemo(() => {
    if (!interventionCountriesSearch) return phoneCodesData;
    const strip = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const search = strip(interventionCountriesSearch);
    return phoneCodesData.filter(entry =>
      strip(getCountryName(entry, locale)).includes(search) ||
      entry.code.toLowerCase().includes(search)
    );
  }, [interventionCountriesSearch, locale]);

  const selectedCountryEntry = useMemo(() =>
    phoneCodesData.find(e => e.code === formData.country),
    [formData.country]
  );

  const selectedLanguage = useMemo(() =>
    LANGUAGES.find(l => l.value === formData.language),
    [formData.language]
  );

  // Password strength
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
        if (value.length < 8) return intl.formatMessage({ id: 'form.error.passwordTooShort', defaultMessage: 'Password must be at least 8 characters' });
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
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
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
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
    }
  };

  const selectCountry = (entry: PhoneCodeEntry) => {
    setFormData(prev => ({ ...prev, country: entry.code }));
    setShowCountryDropdown(false);
    setCountrySearch('');
    if (validationErrors.country) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.country;
        return newErrors;
      });
    }
  };

  const selectLanguage = (langValue: string) => {
    setFormData(prev => ({ ...prev, language: langValue }));
    setShowLanguageDropdown(false);
  };

  const togglePlatform = (platform: string) => {
    setFormData(prev => {
      const platforms = prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform];
      return { ...prev, platforms };
    });
    if (validationErrors.platforms) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.platforms;
        return newErrors;
      });
    }
  };

  const toggleInterventionCountry = (countryCode: string) => {
    setFormData(prev => {
      const countries = prev.interventionCountries.includes(countryCode)
        ? prev.interventionCountries.filter(c => c !== countryCode)
        : [...prev.interventionCountries, countryCode];
      return { ...prev, interventionCountries: countries };
    });
  };

  const handleTermsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, acceptTerms: e.target.checked }));
    if (validationErrors.acceptTerms) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.acceptTerms;
        return newErrors;
      });
    }
  };

  // Keyboard navigation for dropdowns
  const handleDropdownKeyDown = useCallback((
    e: React.KeyboardEvent,
    items: { code: string }[],
    onSelect: (code: string) => void,
    onClose: () => void
  ) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedDropdownIndex(prev => Math.min(prev + 1, items.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedDropdownIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedDropdownIndex >= 0 && items[focusedDropdownIndex]) {
          onSelect(items[focusedDropdownIndex].code);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      case 'Tab':
        onClose();
        break;
    }
  }, [focusedDropdownIndex]);

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
    } else if (formData.password.length < 8) {
      errors.password = intl.formatMessage({ id: 'form.error.passwordTooShort', defaultMessage: 'Password must be at least 8 characters' });
    }
    if (!formData.country) errors.country = intl.formatMessage({ id: 'form.error.required', defaultMessage: 'This field is required' });
    if (formData.platforms.length === 0) errors.platforms = intl.formatMessage({ id: 'form.error.selectOne', defaultMessage: 'Select at least one option' });
    if (!formData.acceptTerms) errors.acceptTerms = intl.formatMessage({ id: 'form.error.acceptTermsRequired', defaultMessage: 'You must accept the terms and conditions' });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setError(null);

    // Meta Pixel: Generate event ID for deduplication + get fbp/fbc
    const metaEventId = generateEventIdForType('registration');
    const metaIds = getMetaIdentifiers();

    try {
      await register({
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: 'influencer',
        // Meta Pixel/CAPI tracking identifiers (filter undefined to avoid Firestore error)
        ...(metaIds.fbp && { fbp: metaIds.fbp }),
        ...(metaIds.fbc && { fbc: metaIds.fbc }),
        country: formData.country,
        metaEventId,
      }, formData.password);

      const { functionsWest2 } = await import('@/config/firebase');
      const registerInfluencer = httpsCallable(functionsWest2, 'registerInfluencer');

      const result = await registerInfluencer({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        country: formData.country,
        language: formData.language,
        platforms: formData.platforms,
        bio: formData.bio || undefined,
        communitySize: formData.communitySize ? parseInt(formData.communitySize) : undefined,
        communityNiche: formData.communityNiche || undefined,
        interventionCountries: formData.interventionCountries.length > 0 ? formData.interventionCountries : undefined,
        recruiterCode: formData.referralCode || undefined,
        termsAcceptedAt: new Date().toISOString(),
        termsVersion: "3.0",
        termsType: "terms_influencers",
        termsAcceptanceMeta: {
          userAgent: navigator.userAgent,
          language: navigator.language,
          timestamp: Date.now(),
          acceptanceMethod: "checkbox_click",
        },
      });

      const data = result.data as { success: boolean; affiliateCodeClient: string };

      if (data.success) {
        setSuccess(true);
        clearStoredReferral('influencer');

        // Meta Pixel: Track CompleteRegistration + Ad Attribution + Advanced Matching
        trackMetaCompleteRegistration({
          content_name: 'influencer_registration',
          status: 'completed',
          country: formData.country,
          eventID: metaEventId,
        });
        trackAdRegistration({ contentName: 'influencer_registration' });
        setMetaPixelUserData({
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          country: formData.country,
        });

        await refreshUser();
        setTimeout(() => {
          navigate(`/${getTranslatedRouteSlug('influencer-dashboard' as RouteKey, langCode)}`, { replace: true });
        }, 2000);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';

      if (errorMessage.includes('email-already-in-use')) {
        if (onEmailAlreadyExists) {
          onEmailAlreadyExists(formData.email);
        } else {
          setError(intl.formatMessage({ id: 'form.error.emailAlreadyInUse', defaultMessage: 'This email is already registered' }));
        }
      } else if (errorMessage.includes('weak-password')) {
        setError(intl.formatMessage({ id: 'form.error.weakPassword', defaultMessage: 'Password is too weak' }));
      } else if (errorMessage.includes('invalid-email')) {
        setError(intl.formatMessage({ id: 'form.error.emailInvalid', defaultMessage: 'Please enter a valid email' }));
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-red-950 via-gray-950 to-black px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-3xl font-bold text-white mb-3">✅ Inscription réussie !</h2>
          <p className="text-lg text-gray-300 mb-2">Votre compte Influenceur a été créé avec succès.</p>
          <p className="text-sm text-gray-400">Redirection vers votre tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8" noValidate>
      {/* ARIA Live Region */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {Object.keys(validationErrors).length > 0 && (
          intl.formatMessage(
            { id: 'form.errors.count', defaultMessage: '{count} errors in form' },
            { count: Object.keys(validationErrors).length }
          )
        )}
      </div>

      {/* Error display */}
      {error && (
        <div role="alert" className="flex items-start gap-3 p-4 mb-2 rounded-2xl bg-red-500/10 border text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* ---- Personal Info Section ---- */}
      <div>
        <h3 className={s.sectionTitle}>
          <FormattedMessage id="influencer.register.section.personal" defaultMessage="Personal Information" />
        </h3>
        <p className={s.sectionDescription}>
          <FormattedMessage id="influencer.register.section.personal.desc" defaultMessage="Basic information for your influencer account" />
        </p>

        <div className="space-y-4">
          {/* Name fields */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* First Name */}
            <div className="space-y-1">
              <label htmlFor="firstName" className={s.label}>
                <FormattedMessage id="form.firstName" defaultMessage="First name" />
                <span className="text-red-400 font-bold text-lg ml-0.5">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10 pointer-events-none" />
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder={intl.formatMessage({ id: 'form.firstName.placeholder', defaultMessage: 'Your first name' })}
                  className={`${s.input} pl-12 ${validationErrors.firstName ? s.inputError : s.inputDefault} ${formData.firstName ? s.inputFilled : ''}`}
                  aria-required="true"
                  aria-invalid={!!validationErrors.firstName}
                  autoComplete="given-name"
                  enterKeyHint="next"
                />
              </div>
              {validationErrors.firstName && (
                <p className={s.errorText} role="alert">
                  <span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white">!</span>
                  {validationErrors.firstName}
                </p>
              )}
            </div>

            {/* Last Name */}
            <div className="space-y-1">
              <label htmlFor="lastName" className={s.label}>
                <FormattedMessage id="form.lastName" defaultMessage="Last name" />
                <span className="text-red-400 font-bold text-lg ml-0.5">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10 pointer-events-none" />
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder={intl.formatMessage({ id: 'form.lastName.placeholder', defaultMessage: 'Your last name' })}
                  className={`${s.input} pl-12 ${validationErrors.lastName ? s.inputError : s.inputDefault} ${formData.lastName ? s.inputFilled : ''}`}
                  aria-required="true"
                  aria-invalid={!!validationErrors.lastName}
                  autoComplete="family-name"
                  enterKeyHint="next"
                />
              </div>
              {validationErrors.lastName && (
                <p className={s.errorText} role="alert">
                  <span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white">!</span>
                  {validationErrors.lastName}
                </p>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label htmlFor="email" className={s.label}>
              <FormattedMessage id="form.email" defaultMessage="Email" />
              <span className="text-red-400 font-bold text-lg ml-0.5">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10 pointer-events-none" />
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder={intl.formatMessage({ id: 'form.email.placeholder', defaultMessage: 'your@email.com' })}
                autoComplete="email"
                inputMode="email"
                enterKeyHint="next"
                className={`${s.input} pl-12 ${validationErrors.email ? s.inputError : s.inputDefault} ${formData.email ? s.inputFilled : ''}`}
                aria-required="true"
                aria-invalid={!!validationErrors.email}
              />
            </div>
            {validationErrors.email && (
              <p className={s.errorText} role="alert">
                <span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white">!</span>
                {validationErrors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label htmlFor="password" className={s.label}>
              <FormattedMessage id="form.password" defaultMessage="Password" />
              <span className="text-red-400 font-bold text-lg ml-0.5">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10 pointer-events-none" />
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder={intl.formatMessage({ id: 'form.password.placeholder', defaultMessage: 'Minimum 8 characters' })}
                autoComplete="new-password"
                enterKeyHint="next"
                className={`${s.input} pl-12 pr-12 ${validationErrors.password ? s.inputError : s.inputDefault}`}
                aria-required="true"
                aria-invalid={!!validationErrors.password}
                aria-describedby={`password-strength ${validationErrors.password ? 'password-error' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 hover:bg-white/10 transition-colors z-10 p-1 rounded-lg"
                aria-label={showPassword
                  ? intl.formatMessage({ id: 'form.password.hide', defaultMessage: 'Hide password' })
                  : intl.formatMessage({ id: 'form.password.show', defaultMessage: 'Show password' })
                }
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Password strength indicator */}
            {passwordStrength && (
              <div id="password-strength" className="mt-2 space-y-2">
                <div className="h-1.5 rounded-full overflow-hidden bg-white/10">
                  <div
                    className={`h-full transition-all duration-300 ${passwordStrength.width} ${
                      passwordStrength.score === 0 ? 'bg-red-500' :
                      passwordStrength.score === 1 ? 'bg-red-400' :
                      passwordStrength.score === 2 ? 'bg-orange-400' :
                      passwordStrength.score === 3 ? 'bg-yellow-400' :
                      'bg-green-500'
                    }`}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className={`text-xs font-medium ${passwordStrength.color}`}>
                    {passwordStrength.label}
                  </p>
                  {passwordStrength.feedback.length > 0 && (
                    <p className="text-xs">
                      {passwordStrength.feedback[0]}
                    </p>
                  )}
                </div>
              </div>
            )}

            {validationErrors.password && (
              <p id="password-error" className={s.errorText} role="alert">
                <span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white">!</span>
                {validationErrors.password}
              </p>
            )}
          </div>

          {/* Country + Language */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Country Dropdown */}
            <div ref={countryDropdownRef} className="space-y-2">
              <label id="country-label" className={s.label}>
                <FormattedMessage id="form.country" defaultMessage="Country" />
                <span className="text-red-400 font-bold text-lg ml-0.5">*</span>
              </label>
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                <button
                  type="button"
                  onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                  onKeyDown={(e) => showCountryDropdown && handleDropdownKeyDown(
                    e,
                    filteredCountries,
                    (code) => selectCountry(filteredCountries.find(c => c.code === code)!),
                    () => setShowCountryDropdown(false)
                  )}
                  className={`${s.input} pl-12 pr-10 text-left flex items-center justify-between ${validationErrors.country ? s.inputError : s.inputDefault}`}
                  aria-haspopup="listbox"
                  aria-expanded={showCountryDropdown}
                  aria-labelledby="country-label"
                >
                  <span className={selectedCountryEntry ? 'text-white' : 'text-gray-400'}>
                    {selectedCountryEntry ? (
                      <span className="flex items-center gap-2">
                        <span className="text-lg">{getFlag(selectedCountryEntry.code)}</span>
                        {getCountryName(selectedCountryEntry, locale)}
                      </span>
                    ) : (
                      intl.formatMessage({ id: 'form.country.placeholder', defaultMessage: 'Select country' })
                    )}
                  </span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showCountryDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showCountryDropdown && (
                  <div className={s.dropdown} role="listbox" aria-labelledby="country-label">
                    <div className="p-2 border-b">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                        <input
                          type="text"
                          value={countrySearch}
                          onChange={(e) => setCountrySearch(e.target.value)}
                          onKeyDown={(e) => handleDropdownKeyDown(
                            e,
                            filteredCountries,
                            (code) => selectCountry(filteredCountries.find(c => c.code === code)!),
                            () => setShowCountryDropdown(false)
                          )}
                          placeholder={intl.formatMessage({ id: 'form.search.country', defaultMessage: 'Search country...' })}
                          className={s.dropdownSearch}
                          autoFocus
                        />
                      </div>
                    </div>
                    <div ref={countryListRef} className="max-h-[280px] overflow-y-auto overscroll-contain">
                      {filteredCountries.map((entry, idx) => (
                        <button
                          key={entry.code}
                          type="button"
                          role="option"
                          aria-selected={entry.code === formData.country}
                          onClick={() => selectCountry(entry)}
                          className={`${s.dropdownItem} ${entry.code === formData.country ? 'bg-red-500/10' : ''} ${idx === focusedDropdownIndex ? 'bg-white/10' : ''}`}
                        >
                          <span className="text-xl">{getFlag(entry.code)}</span>
                          <span className="flex-1 text-sm">{getCountryName(entry, locale)}</span>
                          {entry.code === formData.country && (
                            <Check className="w-4 h-4 text-red-400" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {validationErrors.country && (
                <p className={s.errorText} role="alert">
                  <span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white">!</span>
                  {validationErrors.country}
                </p>
              )}
            </div>

            {/* Language Dropdown */}
            <div ref={languageDropdownRef} className="space-y-2">
              <label id="language-label" className={s.label}>
                <FormattedMessage id="form.language" defaultMessage="Main language" />
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                  className={`${s.input} pr-10 text-left flex items-center justify-between`}
                  aria-haspopup="listbox"
                  aria-expanded={showLanguageDropdown}
                  aria-labelledby="language-label"
                >
                  <span className="text-white">{selectedLanguage?.label || 'Select language'}</span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showLanguageDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showLanguageDropdown && (
                  <div className={s.dropdown} role="listbox" aria-labelledby="language-label">
                    <div className="max-h-[280px] overflow-y-auto overscroll-contain">
                      {LANGUAGES.map((lang) => (
                        <button
                          key={lang.value}
                          type="button"
                          role="option"
                          aria-selected={lang.value === formData.language}
                          onClick={() => selectLanguage(lang.value)}
                          className={`${s.dropdownItem} ${lang.value === formData.language ? 'bg-red-500/10' : ''}`}
                        >
                          <span className="flex-1 text-sm">{lang.label}</span>
                          {lang.value === formData.language && (
                            <Check className="w-4 h-4 text-red-400" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Platforms Section ---- */}
      <div>
        <h3 className={s.sectionTitle}>
          <FormattedMessage id="influencer.register.section.platforms" defaultMessage="Your Platforms" />
        </h3>
        <p className={s.sectionDescription}>
          <FormattedMessage id="influencer.register.platformsHint" defaultMessage="Select at least one platform where you create content" />
          <span className="text-red-400 font-bold text-lg ml-0.5">*</span>
        </p>

        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((platform) => {
            const isSelected = formData.platforms.includes(platform.value);
            return (
              <button
                key={platform.value}
                type="button"
                onClick={() => togglePlatform(platform.value)}
                className={`
                  px-4 py-2.5 rounded-xl text-sm font-medium
                  border-2 transition-all duration-200
                  ${isSelected
                    ? 'bg-red-500/20 border-red-400/40 text-red-300'
                    : 'bg-white/10 border-white/10 text-gray-300 hover:border-white/20 hover:text-gray-300'
                  }
                `}
              >
                {isSelected && <Check className="w-3.5 h-3.5 inline mr-1.5" />}
                {platform.label}
              </button>
            );
          })}
        </div>
        {validationErrors.platforms && (
          <p className={`${s.errorText} mt-2`} role="alert">
            <span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white">!</span>
            {validationErrors.platforms}
          </p>
        )}
      </div>

      {/* ---- Community Section ---- */}
      <div>
        <h3 className={s.sectionTitle}>
          <FormattedMessage id="influencer.register.section.community" defaultMessage="Your Community" />
        </h3>
        <p className={s.sectionDescription}>
          <FormattedMessage id="influencer.register.section.community.desc" defaultMessage="Tell us about your audience (optional)" />
        </p>

        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Community Size */}
            <div className="space-y-1">
              <label htmlFor="communitySize" className={s.label}>
                <FormattedMessage id="form.communitySize" defaultMessage="Community size" />
              </label>
              <div className="relative">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10 pointer-events-none" />
                <input
                  type="number"
                  id="communitySize"
                  name="communitySize"
                  value={formData.communitySize}
                  onChange={handleChange}
                  placeholder={intl.formatMessage({ id: 'form.communitySize.placeholder', defaultMessage: 'e.g. 5000' })}
                  inputMode="numeric"
                  className={`${s.input} pl-12 ${formData.communitySize ? s.inputFilled : ''}`}
                />
              </div>
            </div>

            {/* Community Niche */}
            <div className="space-y-1">
              <label htmlFor="communityNiche" className={s.label}>
                <FormattedMessage id="form.communityNiche" defaultMessage="Niche / Theme" />
              </label>
              <div className="relative">
                <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10 pointer-events-none" />
                <input
                  type="text"
                  id="communityNiche"
                  name="communityNiche"
                  value={formData.communityNiche}
                  onChange={handleChange}
                  placeholder={intl.formatMessage({ id: 'form.communityNiche.placeholder', defaultMessage: 'e.g. expatriation, travel...' })}
                  className={`${s.input} pl-12 ${formData.communityNiche ? s.inputFilled : ''}`}
                />
              </div>
            </div>
          </div>

          {/* Intervention Countries (Optional) */}
          <div ref={interventionCountriesDropdownRef} className="space-y-2">
            <label id="intervention-countries-label" className={s.label}>
              <FormattedMessage id="form.interventionCountries" defaultMessage="Target countries" />
              <span className="ml-2 text-xs text-gray-400">(<FormattedMessage id="common.optional" defaultMessage="Optional" />)</span>
            </label>
            <p className="text-xs text-gray-400 mb-2">
              <FormattedMessage
                id="form.interventionCountries.hint"
                defaultMessage="Select the countries where you can promote our services (helps target your audience)"
              />
            </p>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowInterventionCountriesDropdown(!showInterventionCountriesDropdown)}
                className={`${s.input} pr-10 text-left flex items-center justify-between`}
                aria-haspopup="listbox"
                aria-expanded={showInterventionCountriesDropdown}
                aria-labelledby="intervention-countries-label"
              >
                <span className={formData.interventionCountries.length > 0 ? 'text-white' : 'text-gray-400'}>
                  {formData.interventionCountries.length > 0 ? (
                    <span className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      {formData.interventionCountries.length} {intl.formatMessage({
                        id: 'form.countriesSelected',
                        defaultMessage: formData.interventionCountries.length === 1 ? 'country selected' : 'countries selected'
                      })}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      {intl.formatMessage({ id: 'form.interventionCountries.placeholder', defaultMessage: 'Select countries...' })}
                    </span>
                  )}
                </span>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showInterventionCountriesDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showInterventionCountriesDropdown && (
                <div className={s.dropdown} role="listbox" aria-labelledby="intervention-countries-label">
                  <div className="p-2 border-b border-white/10">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                      <input
                        type="text"
                        value={interventionCountriesSearch}
                        onChange={(e) => setInterventionCountriesSearch(e.target.value)}
                        placeholder={intl.formatMessage({ id: 'form.search.country', defaultMessage: 'Search country...' })}
                        className={s.dropdownSearch}
                        autoFocus
                      />
                    </div>
                  </div>
                  <div ref={interventionCountriesListRef} className="max-h-[280px] overflow-y-auto overscroll-contain">
                    {filteredInterventionCountries.map((entry) => {
                      const isSelected = formData.interventionCountries.includes(entry.code);
                      return (
                        <button
                          key={entry.code}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => toggleInterventionCountry(entry.code)}
                          className={`${s.dropdownItem} ${isSelected ? 'bg-red-500/10' : ''}`}
                        >
                          <span className="text-xl">{getFlag(entry.code)}</span>
                          <span className="flex-1 text-sm">{getCountryName(entry, locale)}</span>
                          {isSelected && (
                            <Check className="w-4 h-4 text-red-400" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            {formData.interventionCountries.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.interventionCountries.map(code => {
                  const entry = phoneCodesData.find(e => e.code === code);
                  if (!entry) return null;
                  return (
                    <span
                      key={code}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/10 border border-red-400/30 rounded-lg text-sm text-red-300"
                    >
                      <span className="text-base">{getFlag(code)}</span>
                      {getCountryName(entry, locale)}
                      <button
                        type="button"
                        onClick={() => toggleInterventionCountry(code)}
                        className="ml-1 hover:text-red-200 transition-colors"
                        aria-label={`Remove ${getCountryName(entry, locale)}`}
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---- Terms & Conditions ---- */}
      <div className="space-y-2">
        <label className="flex items-start gap-3 cursor-pointer select-none group">
          <div className="relative mt-0.5">
            <input
              type="checkbox"
              id="acceptTerms"
              checked={formData.acceptTerms}
              onChange={handleTermsChange}
              className={`h-5 w-5 rounded border-2${validationErrors.acceptTerms
                  ? 'border-red-500 bg-red-500/10'
                  : formData.acceptTerms
                    ? 'border-red-400 bg-red-400 text-white'
                    : 'border-white/20 bg-white/10'
                }focus:ring-2 transition-all duration-200 cursor-pointer`}
              aria-required="true"
              aria-invalid={!!validationErrors.acceptTerms}
            />
          </div>
          <span className="text-sm leading-relaxed">
            <FormattedMessage
              id="influencer.register.acceptTerms"
              defaultMessage="I accept the {termsLink} and the {privacyLink}"
              values={{
                termsLink: (
                  <Link
                    to="/cgu-influenceurs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium text-red-400 hover:text-red-300"
                  >
                    <FormattedMessage id="form.termsOfService" defaultMessage="Terms of Service" />
                  </Link>
                ),
                privacyLink: (
                  <Link
                    to="/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium text-red-400 hover:text-red-300"
                  >
                    <FormattedMessage id="form.privacyPolicy" defaultMessage="Privacy Policy" />
                  </Link>
                ),
              }}
            />
            <span className="text-red-400 font-bold text-lg ml-0.5">*</span>
          </span>
        </label>
        {validationErrors.acceptTerms && (
          <p className={s.errorText} role="alert">
            <span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white">!</span>
            {validationErrors.acceptTerms}
          </p>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || !formData.acceptTerms}
        aria-busy={loading}
        className={`w-full py-4 px-6 font-extrabold rounded-2xl flex items-center justify-center gap-2 transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg hover:shadow-xl hover:from-red-400 hover:to-rose-400 active:scale-[0.98]`}
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 rounded-full animate-spin" />
            <FormattedMessage id="form.submitting" defaultMessage="Processing..." />
          </>
        ) : (
          <FormattedMessage id="influencer.register.submit" defaultMessage="Become an Influencer" />
        )}
      </button>
    </form>
  );
};

export default InfluencerRegisterForm;
