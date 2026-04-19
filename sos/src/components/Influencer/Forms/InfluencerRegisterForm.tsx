/**
 * InfluencerRegisterForm — simplified, mobile-first
 *
 * Kept minimum to maximize signup conversion:
 *   firstName, lastName, email, password, country, platforms (≥1), CGU.
 * Removed from signup form (moved to dashboard profile):
 *   language (auto-detected from AppContext), community size, niche, intervention countries, bio.
 * Backend still accepts those fields as optional.
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  User,
  Mail,
  Globe,
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
import { functionsAffiliate, auth } from '@/config/firebase';
import { phoneCodesData, type PhoneCodeEntry } from '@/data/phone-codes';
import { clearStoredReferral, getStoredReferral, clearUnifiedReferral } from '@/utils/referralStorage';
import { getTrafficSourceForRegistration } from '@/services/clickTrackingService';
import { getCountryNameFromEntry as getCountryName, getFlag } from '@/utils/phoneCodeHelpers';
import { trackMetaCompleteRegistration, trackMetaStartRegistration, getMetaIdentifiers, setMetaPixelUserData } from '@/utils/metaPixel';
import { trackAdRegistration } from '@/services/adAttributionService';
import { trackGoogleAdsSignUp, setGoogleAdsUserData } from '@/utils/googleAds';
import { generateEventIdForType } from '@/utils/sharedEventId';
import { useAntiBot } from '@/hooks/useAntiBot';

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
// STYLES — mobile-first, generous tap targets, red accent
// ============================================================================
const s = {
  input: `
    w-full px-4 py-4
    bg-white/10 border-2 border-white/10
    rounded-2xl
    text-base text-white
    placeholder:text-gray-400
    focus:outline-none focus:ring-2 focus:ring-red-400/40
    focus:border-red-400/50 focus:bg-white/10
    transition-all duration-200 ease-out
    disabled:opacity-50 disabled:cursor-not-allowed
    min-h-[52px]
  `,
  inputError: 'border-red-500/60 focus:ring-red-500/30 bg-red-500/10',
  inputDefault: '',
  inputFilled: 'bg-white/10 border-white/20',
  label: 'block text-sm font-semibold text-gray-200 mb-2',
  errorText: 'mt-1.5 text-xs text-red-400 flex items-center gap-1',
  dropdown: `
    absolute z-50 mt-2 w-full
    bg-gray-900 border border-white/10
    rounded-2xl shadow-xl shadow-black/30
    overflow-hidden
  `,
  dropdownItem: `
    w-full px-4 py-3.5
    flex items-center gap-3
    text-left text-sm text-white
    hover:bg-white/10
    transition-colors duration-150
    cursor-pointer
    min-h-[48px]
  `,
  dropdownSearch: 'w-full pl-9 pr-3 py-3 text-sm bg-white/10 text-white rounded-xl border-0 focus:ring-2 focus:ring-red-400/30 placeholder:text-gray-400',
};

// ============================================================================
// CONSTANTS
// ============================================================================
// Top 8 platforms visible by default; the rest is behind a toggle to keep the
// form short on mobile. 17 platforms total would bloat the form.
const TOP_PLATFORMS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'twitter', label: 'X / Twitter' },
  { value: 'linkedin', label: 'LinkedIn' },
];
const MORE_PLATFORMS = [
  { value: 'snapchat', label: 'Snapchat' },
  { value: 'reddit', label: 'Reddit' },
  { value: 'discord', label: 'Discord' },
  { value: 'blog', label: 'Blog' },
  { value: 'website', label: 'Website' },
  { value: 'forum', label: 'Forum' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'other', label: 'Other' },
];

const SUPPORTED_LANGUAGES = ['fr', 'en', 'es', 'pt', 'ar', 'de', 'zh', 'ru', 'hi'];

// ============================================================================
// TYPES
// ============================================================================
interface InfluencerFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  country: string;
  platforms: string[];
  referralCode: string;
  acceptTerms: boolean;
}

interface InfluencerRegisterFormProps {
  referralCode?: string;
  onEmailAlreadyExists?: (email: string) => void;
  onRegistrationStateChange?: (isRegistering: boolean) => void;
  onSuccess?: (data: { language: string; country: string }) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================
const InfluencerRegisterForm: React.FC<InfluencerRegisterFormProps> = ({
  referralCode = '',
  onEmailAlreadyExists,
  onRegistrationStateChange,
  onSuccess,
}) => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const { user, register, refreshUser } = useAuth();
  const { language } = useApp();
  const locale = (language || 'en') as string;
  const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';

  // Resolve the language sent to backend: AppContext → navigator → "en" fallback
  const resolvedLanguage = useMemo<string>(() => {
    if (language && SUPPORTED_LANGUAGES.includes(language)) return language;
    if (typeof navigator !== 'undefined') {
      const nav = (navigator.language || '').slice(0, 2).toLowerCase();
      if (SUPPORTED_LANGUAGES.includes(nav)) return nav;
    }
    return 'en';
  }, [language]);

  const { honeypotValue, setHoneypotValue, validateHuman } = useAntiBot();
  const [botError, setBotError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [showPassword, setShowPassword] = useState(false);
  const [showMorePlatforms, setShowMorePlatforms] = useState(false);

  const [formData, setFormData] = useState<InfluencerFormData>({
    firstName: user?.firstName || user?.displayName?.split(' ')[0] || '',
    lastName: user?.lastName || user?.displayName?.split(' ').slice(1).join(' ') || '',
    email: user?.email || '',
    password: '',
    country: '',
    platforms: [],
    referralCode: referralCode,
    acceptTerms: false,
  });

  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [focusedDropdownIndex, setFocusedDropdownIndex] = useState(-1);

  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const countryListRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target as Node)) {
        setShowCountryDropdown(false);
        setCountrySearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setFocusedDropdownIndex(-1);
  }, [showCountryDropdown]);

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
    const strip = (v: string) => v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const search = strip(countrySearch);
    return phoneCodesData.filter(entry =>
      strip(getCountryName(entry, locale)).includes(search) ||
      entry.code.toLowerCase().includes(search)
    );
  }, [countrySearch, locale]);

  const selectedCountryEntry = useMemo(() =>
    phoneCodesData.find(e => e.code === formData.country),
    [formData.country]
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

  // Keyboard navigation for dropdown
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

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError('Pas de connexion internet. Vérifiez votre réseau.');
      return;
    }

    setLoading(true);
    setError(null);
    setBotError(null);
    onRegistrationStateChange?.(true);

    const botCheck = await validateHuman('register_influencer');
    if (!botCheck.isValid) {
      const msgs: Record<string, string> = {
        'Suspicious activity detected': 'A validation error occurred. Please try again.',
        'Please take your time to fill the form': 'Please take your time to fill out the form correctly.',
      };
      setBotError(msgs[botCheck.reason || ''] || 'Validation error.');
      setLoading(false);
      onRegistrationStateChange?.(false);
      return;
    }

    const metaEventId = generateEventIdForType('registration');
    const metaIds = getMetaIdentifiers();

    try {
      await register({
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: 'influencer',
        ...(metaIds.fbp && { fbp: metaIds.fbp }),
        ...(metaIds.fbc && { fbc: metaIds.fbc }),
        country: formData.country,
        metaEventId,
      }, formData.password);

      const registerInfluencer = httpsCallable(functionsAffiliate, 'registerInfluencer');

      let result;
      try {
        result = await registerInfluencer({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          country: formData.country,
          language: resolvedLanguage,
          platforms: formData.platforms,
          recruitmentCode: formData.referralCode || undefined,
          referralCapturedAt: getStoredReferral('influencer')?.capturedAt || new Date().toISOString(),
          trafficSource: getTrafficSourceForRegistration(),
          termsAcceptedAt: new Date().toISOString(),
          termsVersion: "3.0",
          termsType: "terms_influencers",
          termsAffiliateVersion: "1.0",
          termsAffiliateType: "terms_affiliate",
          termsAcceptanceMeta: {
            userAgent: navigator.userAgent,
            language: navigator.language,
            timestamp: Date.now(),
            acceptanceMethod: "checkbox_click",
          },
        });
      } catch (cfError) {
        try {
          const { deleteUser } = await import('firebase/auth');
          const currentUser = auth.currentUser;
          if (currentUser) {
            await deleteUser(currentUser);
          }
        } catch (deleteErr) {
          console.error('[InfluencerRegister] Failed to cleanup orphaned auth user:', deleteErr);
        }
        throw cfError;
      }

      const data = result.data as { success: boolean; affiliateCodeClient: string };

      if (data.success) {
        setSuccess(true);
        clearStoredReferral('influencer');
        clearUnifiedReferral();

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

        await setGoogleAdsUserData({ email: formData.email, firstName: formData.firstName, lastName: formData.lastName, country: formData.country });
        trackGoogleAdsSignUp({ method: 'email', content_name: 'influencer_registration', country: formData.country });

        await refreshUser();

        if (onSuccess) {
          onSuccess({ language: resolvedLanguage, country: formData.country || '' });
        } else {
          setTimeout(() => {
            navigate(`/${getTranslatedRouteSlug('influencer-telegram' as RouteKey, langCode)}`, { replace: true });
          }, 500);
        }
      }
    } catch (err: unknown) {
      onRegistrationStateChange?.(false);
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
          <h2 className="text-3xl font-bold text-white mb-3">
            <FormattedMessage id="influencer.register.success.title" defaultMessage="Inscription réussie !" />
          </h2>
          <p className="text-lg text-gray-300 mb-2">
            <FormattedMessage id="influencer.register.success.subtitle" defaultMessage="Votre compte Influenceur a été créé." />
          </p>
          <p className="text-sm text-gray-400">
            <FormattedMessage id="influencer.register.success.redirect" defaultMessage="Redirection en cours..." />
          </p>
        </div>
      </div>
    );
  }

  const platformsToShow = showMorePlatforms ? [...TOP_PLATFORMS, ...MORE_PLATFORMS] : TOP_PLATFORMS;

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* Honeypot */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', top: '-9999px', opacity: 0, height: 0, overflow: 'hidden' }}>
        <label htmlFor="website_url_inf">Website</label>
        <input type="text" id="website_url_inf" name="website_url" tabIndex={-1} autoComplete="off" value={honeypotValue} onChange={(e) => setHoneypotValue(e.target.value)} />
      </div>

      {botError && (
        <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-sm text-red-300 text-center">
          {botError}
        </div>
      )}

      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {Object.keys(validationErrors).length > 0 && (
          intl.formatMessage(
            { id: 'form.errors.count', defaultMessage: '{count} errors in form' },
            { count: Object.keys(validationErrors).length }
          )
        )}
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* ---- First + Last name (stacked on mobile, 2 cols on sm+) ---- */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="firstName" className={s.label}>
            <FormattedMessage id="form.firstName" defaultMessage="Prénom" />
            <span className="text-red-400 font-bold ml-0.5">*</span>
          </label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder={intl.formatMessage({ id: 'form.firstName.placeholder', defaultMessage: 'Prénom' })}
              className={`${s.input} pl-12 ${validationErrors.firstName ? s.inputError : s.inputDefault} ${formData.firstName ? s.inputFilled : ''}`}
              aria-required="true"
              aria-invalid={!!validationErrors.firstName}
              autoComplete="given-name"
              enterKeyHint="next"
            />
          </div>
          {validationErrors.firstName && (
            <p className={s.errorText} role="alert">
              <span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px]">!</span>
              {validationErrors.firstName}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="lastName" className={s.label}>
            <FormattedMessage id="form.lastName" defaultMessage="Nom" />
            <span className="text-red-400 font-bold ml-0.5">*</span>
          </label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder={intl.formatMessage({ id: 'form.lastName.placeholder', defaultMessage: 'Nom' })}
              className={`${s.input} pl-12 ${validationErrors.lastName ? s.inputError : s.inputDefault} ${formData.lastName ? s.inputFilled : ''}`}
              aria-required="true"
              aria-invalid={!!validationErrors.lastName}
              autoComplete="family-name"
              enterKeyHint="next"
            />
          </div>
          {validationErrors.lastName && (
            <p className={s.errorText} role="alert">
              <span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px]">!</span>
              {validationErrors.lastName}
            </p>
          )}
        </div>
      </div>

      {/* ---- Email ---- */}
      <div className="space-y-1">
        <label htmlFor="email" className={s.label}>
          <FormattedMessage id="form.email" defaultMessage="Email" />
          <span className="text-red-400 font-bold ml-0.5">*</span>
        </label>
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="votre@email.com"
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
            <span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px]">!</span>
            {validationErrors.email}
          </p>
        )}
      </div>

      {/* ---- Password ---- */}
      <div className="space-y-2">
        <label htmlFor="password" className={s.label}>
          <FormattedMessage id="form.password" defaultMessage="Mot de passe" />
          <span className="text-red-400 font-bold ml-0.5">*</span>
        </label>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder={intl.formatMessage({ id: 'form.password.placeholder', defaultMessage: 'Minimum 8 caractères' })}
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
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 hover:bg-white/10 p-2 rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center"
            aria-label={showPassword
              ? intl.formatMessage({ id: 'form.password.hide', defaultMessage: 'Hide password' })
              : intl.formatMessage({ id: 'form.password.show', defaultMessage: 'Show password' })
            }
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        {passwordStrength && (
          <div id="password-strength" className="mt-2 space-y-1.5">
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
            <div className="flex items-center justify-between text-xs">
              <span className={`font-medium ${passwordStrength.color}`}>{passwordStrength.label}</span>
              {passwordStrength.feedback.length > 0 && (
                <span className="text-gray-400">{passwordStrength.feedback[0]}</span>
              )}
            </div>
          </div>
        )}

        {validationErrors.password && (
          <p id="password-error" className={s.errorText} role="alert">
            <span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px]">!</span>
            {validationErrors.password}
          </p>
        )}
      </div>

      {/* ---- Country ---- */}
      <div ref={countryDropdownRef} className="space-y-1">
        <label id="country-label" className={s.label}>
          <FormattedMessage id="form.country" defaultMessage="Pays" />
          <span className="text-red-400 font-bold ml-0.5">*</span>
        </label>
        <div className="relative">
          <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10 pointer-events-none" />
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
                intl.formatMessage({ id: 'form.country.placeholder', defaultMessage: 'Sélectionnez votre pays' })
              )}
            </span>
            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showCountryDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showCountryDropdown && (
            <div className={s.dropdown} role="listbox" aria-labelledby="country-label">
              <div className="p-2 border-b border-white/10">
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
                    placeholder={intl.formatMessage({ id: 'form.search.country', defaultMessage: 'Rechercher un pays...' })}
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
            <span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px]">!</span>
            {validationErrors.country}
          </p>
        )}
      </div>

      {/* ---- Platforms (top 8 visible + toggle) ---- */}
      <div className="space-y-2">
        <label className={s.label}>
          <FormattedMessage id="influencer.register.platforms.label" defaultMessage="Vos plateformes" />
          <span className="text-red-400 font-bold ml-0.5">*</span>
        </label>
        <p className="text-xs text-gray-400 -mt-1">
          <FormattedMessage id="influencer.register.platforms.hint" defaultMessage="Sélectionnez au moins une plateforme" />
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {platformsToShow.map((platform) => {
            const isSelected = formData.platforms.includes(platform.value);
            return (
              <button
                key={platform.value}
                type="button"
                onClick={() => togglePlatform(platform.value)}
                className={`
                  px-3 py-3 rounded-xl text-sm font-medium
                  border-2 transition-all duration-200
                  min-h-[48px] flex items-center justify-center gap-1.5
                  ${isSelected
                    ? 'bg-red-500/20 border-red-400/50 text-red-200'
                    : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/20'
                  }
                `}
              >
                {isSelected && <Check className="w-4 h-4 flex-shrink-0" />}
                <span className="truncate">{platform.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setShowMorePlatforms(v => !v)}
          className="text-sm text-red-400 hover:text-red-300 underline underline-offset-2"
        >
          {showMorePlatforms
            ? <FormattedMessage id="influencer.register.platforms.showLess" defaultMessage="Voir moins" />
            : <FormattedMessage id="influencer.register.platforms.showMore" defaultMessage="+ Autres plateformes" />}
        </button>

        {validationErrors.platforms && (
          <p className={s.errorText} role="alert">
            <span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px]">!</span>
            {validationErrors.platforms}
          </p>
        )}
      </div>

      {/* ---- Terms ---- */}
      <div className="space-y-2 pt-2">
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            id="acceptTerms"
            checked={formData.acceptTerms}
            onChange={handleTermsChange}
            className={`
              mt-0.5 h-5 w-5 rounded border-2 flex-shrink-0
              ${validationErrors.acceptTerms
                ? 'border-red-500 bg-red-500/10'
                : formData.acceptTerms
                  ? 'border-red-400 bg-red-400 text-white'
                  : 'border-white/20 bg-white/10'
              }
              focus:ring-2 focus:ring-red-400/30
              transition-all duration-200 cursor-pointer
            `}
            aria-required="true"
            aria-invalid={!!validationErrors.acceptTerms}
          />
          <span className="text-sm leading-relaxed text-gray-300">
            <FormattedMessage
              id="influencer.register.acceptTerms"
              defaultMessage="J'accepte les {termsLink}, les {affiliateTermsLink} et la {privacyLink}. Je comprends que la connexion Telegram est obligatoire pour retirer mes commissions."
              values={{
                termsLink: (
                  <Link to="/cgu-influenceurs" target="_blank" rel="noopener noreferrer" className="underline font-medium text-red-400 hover:text-red-300">
                    <FormattedMessage id="form.termsOfService" defaultMessage="CGU" />
                  </Link>
                ),
                affiliateTermsLink: (
                  <Link to="/cgu-affiliation" target="_blank" rel="noopener noreferrer" className="underline font-medium text-red-400 hover:text-red-300">
                    <FormattedMessage id="form.affiliateTerms" defaultMessage="CGU Affiliation" />
                  </Link>
                ),
                privacyLink: (
                  <Link to="/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline font-medium text-red-400 hover:text-red-300">
                    <FormattedMessage id="form.privacyPolicy" defaultMessage="Politique de confidentialité" />
                  </Link>
                ),
              }}
            />
            <span className="text-red-400 font-bold ml-0.5">*</span>
          </span>
        </label>
        {validationErrors.acceptTerms && (
          <p className={s.errorText} role="alert">
            <span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px]">!</span>
            {validationErrors.acceptTerms}
          </p>
        )}
      </div>

      {/* ---- Submit (full-width, big tap target) ---- */}
      <button
        type="submit"
        disabled={loading || !formData.acceptTerms}
        aria-busy={loading}
        className="w-full py-4 px-6 font-extrabold rounded-2xl flex items-center justify-center gap-2 transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg hover:shadow-xl hover:from-red-400 hover:to-rose-400 active:scale-[0.98] min-h-[56px] text-base"
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            <FormattedMessage id="form.submitting" defaultMessage="Création en cours..." />
          </>
        ) : (
          <FormattedMessage id="influencer.register.submit" defaultMessage="Créer mon compte" />
        )}
      </button>
    </form>
  );
};

export default InfluencerRegisterForm;
