import React, { useState, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { Mail, User, UserPlus, ArrowRight, Loader2, Globe, Shield, Clock, Users } from 'lucide-react';
import { useIntl, FormattedMessage } from 'react-intl';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { Link } from 'react-router-dom';
import type { MultiValue } from 'react-select';

import { getTheme } from '../shared/theme';
import { EMAIL_REGEX, MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } from '../shared/constants';
import { sanitizeString, sanitizeEmailInput, sanitizeEmailFinal, sanitizeEmail } from '../shared/sanitize';

import DarkInput from '../shared/DarkInput';
import DarkPasswordInput from '../shared/DarkPasswordInput';
import DarkPhoneInput from '../shared/DarkPhoneInput';
import DarkCheckbox from '../shared/DarkCheckbox';
import { FieldError, FieldSuccess } from '../shared/FieldFeedback';
import FAQSection from '../shared/FAQSection';

import { getMetaIdentifiers, setMetaPixelUserData } from '@/utils/metaPixel';
import { generateEventIdForType } from '@/utils/sharedEventId';

import '@/styles/registration-dark.css';
import '@/styles/multi-language-select.css';

const MultiLanguageSelect = lazy(() => import('@/components/forms-data/MultiLanguageSelect'));

const theme = getTheme('client');

// ---------- Types ----------

interface LanguageOption {
  value: string;
  label: string;
}

interface ClientFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  languagesSpoken: string[];
  acceptTerms: boolean;
}

interface ClientRegisterFormProps {
  onRegister: (userData: Record<string, unknown>, password: string) => Promise<void>;
  onGoogleSignup: () => Promise<void>;
  isLoading: boolean;
  googleLoading: boolean;
  language: string;
  prefillEmail: string;
  referralCode: string;
  redirect: string;
  navigate: (path: string, options?: Record<string, unknown>) => void;
  authError?: string;
  trackMetaComplete: (data: Record<string, unknown>) => void;
  trackAdRegistration: (data: Record<string, unknown>) => void;
  getStoredReferralTracking: () => unknown;
}

// ---------- Trust Badges ----------

const TrustBadges: React.FC = React.memo(() => (
  <section className="mt-6 text-center" aria-labelledby="trust-heading">
    <h2 id="trust-heading" className="sr-only">
      <FormattedMessage id="registerClient.ui.trustBadgesTitle" />
    </h2>
    <div className="flex flex-wrap justify-center gap-3 text-xs text-gray-400">
      <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
        <Shield className="w-4 h-4 text-green-400" aria-hidden="true" />
        <FormattedMessage id="registerClient.ui.trustSecure" />
      </span>
      <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
        <Clock className="w-4 h-4 text-blue-400" aria-hidden="true" />
        <FormattedMessage id="registerClient.ui.trust247" />
      </span>
      <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
        <Globe className="w-4 h-4 text-purple-400" aria-hidden="true" />
        <FormattedMessage id="registerClient.ui.trustCountries" />
      </span>
      <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
        <Users className="w-4 h-4 text-orange-400" aria-hidden="true" />
        <FormattedMessage id="registerClient.ui.trustUsers" />
      </span>
    </div>
  </section>
));
TrustBadges.displayName = 'TrustBadges';

// ---------- Main Component ----------

const ClientRegisterForm: React.FC<ClientRegisterFormProps> = ({
  onRegister,
  onGoogleSignup,
  isLoading,
  googleLoading,
  language,
  prefillEmail,
  referralCode,
  redirect,
  navigate,
  authError,
  trackMetaComplete,
  trackAdRegistration,
  getStoredReferralTracking,
}) => {
  const intl = useIntl();
  const lang = language as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'hi' | 'pt' | 'ch' | 'ar';

  const hasNavigatedRef = useRef(false);
  const isMountedRef = useRef(true);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Form state
  const [form, setForm] = useState<ClientFormData>({
    firstName: '',
    lastName: '',
    email: prefillEmail,
    password: '',
    phone: '',
    languagesSpoken: [],
    acceptTerms: false,
  });
  const [selectedLanguages, setSelectedLanguages] = useState<MultiValue<LanguageOption>>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [generalError, setGeneralError] = useState('');

  // Refs for focus management
  const firstNameRef = useRef<HTMLInputElement>(null);

  // ---------- Helpers ----------

  const markTouched = useCallback((name: string) => {
    setTouched(prev => ({ ...prev, [name]: true }));
  }, []);

  const clearError = useCallback((name: string) => {
    setFieldErrors(prev => ({ ...prev, [name]: undefined }));
  }, []);

  const setField = useCallback(<K extends keyof ClientFormData>(key: K, value: ClientFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    clearError(key);
  }, [clearError]);

  // ---------- Input handlers ----------

  const onTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const sanitized = name === 'email' ? sanitizeEmailInput(value) : sanitizeString(value);
    setField(name as keyof ClientFormData, sanitized as never);
  }, [setField]);

  const onTextBlur = useCallback((name: string) => {
    markTouched(name);
    // Apply final sanitization for email (lowercase)
    if (name === 'email') {
      setField('email', sanitizeEmailFinal(form.email));
    }
    // Inline validation on blur
    const val = form[name as keyof ClientFormData];
    if (name === 'firstName' || name === 'lastName') {
      if (!val || (typeof val === 'string' && val.trim().length < 2)) {
        setFieldErrors(prev => ({ ...prev, [name]: intl.formatMessage({ id: `registerClient.errors.${name}Required` }) }));
      }
    } else if (name === 'email') {
      if (!val || (typeof val === 'string' && !EMAIL_REGEX.test(val))) {
        setFieldErrors(prev => ({ ...prev, email: intl.formatMessage({ id: 'registerClient.errors.emailInvalid' }) }));
      }
    }
  }, [form, intl, markTouched, setField]);

  const onPhoneChange = useCallback((val: string) => {
    setField('phone', val);
    if (val && touched.phone) {
      try {
        const parsed = parsePhoneNumberFromString(val);
        if (!parsed || !parsed.isValid()) {
          setFieldErrors(prev => ({ ...prev, phone: intl.formatMessage({ id: 'registerClient.errors.phoneInvalid' }) }));
        }
      } catch {
        setFieldErrors(prev => ({ ...prev, phone: intl.formatMessage({ id: 'registerClient.errors.phoneInvalid' }) }));
      }
    }
  }, [setField, intl, touched.phone]);

  const onLanguagesChange = useCallback((newValue: MultiValue<LanguageOption>) => {
    setSelectedLanguages(newValue);
    const arr = newValue.map(l => l.value);
    setField('languagesSpoken', arr);
    markTouched('languagesSpoken');
    if (arr.length === 0) {
      setFieldErrors(prev => ({ ...prev, languagesSpoken: intl.formatMessage({ id: 'registerClient.errors.languagesRequired' }) }));
    }
  }, [setField, markTouched, intl]);

  const onTermsChange = useCallback((checked: boolean) => {
    setField('acceptTerms', checked);
    markTouched('acceptTerms');
    if (!checked) {
      setFieldErrors(prev => ({ ...prev, acceptTerms: intl.formatMessage({ id: 'registerClient.errors.termsRequired' }) }));
    }
  }, [setField, markTouched, intl]);

  // ---------- Validation ----------

  const validateAll = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (!form.firstName.trim() || form.firstName.trim().length < 2) {
      errors.firstName = intl.formatMessage({ id: 'registerClient.errors.firstNameRequired' });
    }
    if (!form.lastName.trim() || form.lastName.trim().length < 2) {
      errors.lastName = intl.formatMessage({ id: 'registerClient.errors.lastNameRequired' });
    }
    if (!form.email.trim() || !EMAIL_REGEX.test(form.email)) {
      errors.email = intl.formatMessage({ id: 'registerClient.errors.emailInvalid' });
    }
    if (!form.password || form.password.length < MIN_PASSWORD_LENGTH) {
      errors.password = intl.formatMessage({ id: 'registerClient.errors.passwordTooShort' });
    } else if (form.password.length > MAX_PASSWORD_LENGTH) {
      errors.password = intl.formatMessage({ id: 'registerClient.errors.passwordTooLong' });
    }
    if (form.languagesSpoken.length === 0) {
      errors.languagesSpoken = intl.formatMessage({ id: 'registerClient.errors.languagesRequired' });
    }
    if (!form.phone.trim()) {
      errors.phone = intl.formatMessage({ id: 'registerClient.errors.phoneRequired' });
    } else {
      try {
        const parsed = parsePhoneNumberFromString(form.phone);
        if (!parsed || !parsed.isValid()) {
          errors.phone = intl.formatMessage({ id: 'registerClient.errors.phoneInvalid' });
        }
      } catch {
        errors.phone = intl.formatMessage({ id: 'registerClient.errors.phoneInvalid' });
      }
    }
    if (!form.acceptTerms) {
      errors.acceptTerms = intl.formatMessage({ id: 'registerClient.errors.termsRequired' });
    }

    setFieldErrors(errors);
    setTouched({
      firstName: true, lastName: true, email: true, password: true,
      languagesSpoken: true, phone: true, acceptTerms: true,
    });

    return Object.keys(errors).length === 0;
  }, [form, intl]);

  // ---------- Form valid ----------

  const isFormValid = useMemo(() => {
    return (
      form.firstName.trim().length >= 2 &&
      form.lastName.trim().length >= 2 &&
      EMAIL_REGEX.test(form.email) &&
      form.password.length >= MIN_PASSWORD_LENGTH &&
      form.password.length <= MAX_PASSWORD_LENGTH &&
      form.languagesSpoken.length > 0 &&
      !!form.phone.trim() &&
      (() => {
        try {
          const p = parsePhoneNumberFromString(form.phone);
          return p && p.isValid();
        } catch { return false; }
      })() &&
      form.acceptTerms
    );
  }, [form]);

  // ---------- Submit ----------

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || hasNavigatedRef.current) return;

    console.log('[ClientRegisterForm] 🔵 handleSubmit() START', {
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone,
      languagesCount: form.languagesSpoken.length,
      timestamp: new Date().toISOString()
    });

    if (!validateAll()) {
      console.log('[ClientRegisterForm] ❌ Validation failed');
      firstNameRef.current?.focus();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    setGeneralError('');

    try {
      let phoneE164: string | undefined;
      let phoneCountry: string | undefined;
      if (form.phone) {
        const parsed = parsePhoneNumberFromString(form.phone);
        if (parsed && parsed.isValid()) {
          phoneE164 = parsed.number;
          phoneCountry = parsed.country;
        }
      }

      const trimmedFirst = sanitizeString(form.firstName.trim());
      const trimmedLast = sanitizeString(form.lastName.trim());
      const capitalFirst = trimmedFirst.charAt(0).toUpperCase() + trimmedFirst.slice(1).toLowerCase();
      const capitalLast = trimmedLast.charAt(0).toUpperCase() + trimmedLast.slice(1).toLowerCase();

      const metaEventId = generateEventIdForType('registration');
      const metaIds = getMetaIdentifiers();

      const userData: Record<string, unknown> = {
        role: 'client',
        firstName: capitalFirst,
        lastName: capitalLast,
        fullName: `${capitalFirst} ${capitalLast}`,
        email: sanitizeEmail(form.email),
        languagesSpoken: form.languagesSpoken,
        phone: phoneE164,
        currentCountry: phoneCountry,
        country: phoneCountry,
        ...(metaIds.fbp ? { fbp: metaIds.fbp } : {}),
        ...(metaIds.fbc ? { fbc: metaIds.fbc } : {}),
        metaEventId,
        isApproved: true,
        approvalStatus: 'approved',
        verificationStatus: 'approved',
        status: 'active',
        termsAccepted: true,
        termsAcceptedAt: new Date().toISOString(),
        termsVersion: '3.0',
        termsType: 'terms_clients',
        termsAcceptanceMeta: {
          userAgent: navigator.userAgent,
          language: navigator.language,
          timestamp: Date.now(),
          acceptanceMethod: 'checkbox_click',
        },
      };

      // Affiliate tracking
      if (referralCode) {
        userData.pendingReferralCode = referralCode.toUpperCase().trim();
      }
      const tracking = getStoredReferralTracking() as { capturedAt?: string } | null;
      if (tracking) {
        userData.referralTracking = tracking;
      }
      if (referralCode && tracking?.capturedAt) {
        userData.referralCapturedAt = tracking.capturedAt;
      } else if (referralCode) {
        userData.referralCapturedAt = new Date().toISOString();
      }

      console.log('[ClientRegisterForm] 📤 Calling onRegister()', {
        role: 'client',
        email: userData.email,
        hasPhone: !!userData.phone,
        timestamp: new Date().toISOString()
      });

      await onRegister(userData, form.password);

      console.log('[ClientRegisterForm] ✅ onRegister() succeeded');

      if (!isMountedRef.current) return;

      // Analytics
      trackMetaComplete({ content_name: 'client_registration', status: 'completed', country: phoneCountry, eventID: metaEventId });
      trackAdRegistration({ contentName: 'client_registration' });
      setMetaPixelUserData({ email: sanitizeEmail(form.email), firstName: capitalFirst, lastName: capitalLast, country: phoneCountry });

      setIsRedirecting(true);
      hasNavigatedRef.current = true;

      // Attendre 1.5s pour laisser Firebase Auth & Firestore se synchroniser
      setTimeout(() => {
        navigate(redirect, {
          replace: true,
          state: {
            message: intl.formatMessage({ id: 'registerClient.success.registered' }),
            type: 'success',
          },
        });
      }, 1500);
    } catch (err) {
      console.log('[ClientRegisterForm] ❌ ERROR:', {
        errorType: err?.constructor?.name,
        errorCode: (err as any)?.code,
        errorMessage: (err as Error)?.message,
        errorStack: (err as Error)?.stack?.split('\n').slice(0, 3),
        timestamp: new Date().toISOString()
      });

      if (!isMountedRef.current) return;

      let msg = intl.formatMessage({ id: 'registerClient.errors.registrationError' });
      if (err instanceof Error) {
        if (err.message.includes('email-already-in-use') || err.message.includes('déjà associé')) {
          msg = intl.formatMessage({ id: 'registerClient.errors.emailAlreadyExists' });
        } else if (err.message.includes('email-linked-to-google') || err.message.includes('lié à un compte Google')) {
          msg = intl.formatMessage({ id: 'registerClient.errors.emailAlreadyExists' });
        } else if (err.message.includes('weak-password')) {
          msg = intl.formatMessage({ id: 'registerClient.errors.passwordTooShort' });
        } else if (err.message.includes('invalid-email')) {
          msg = intl.formatMessage({ id: 'registerClient.errors.emailInvalid' });
        } else if (err.message.includes('network') || err.message.includes('réseau')) {
          msg = intl.formatMessage({ id: 'registerClient.errors.networkError' });
        }
      }
      setGeneralError(msg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      if (isMountedRef.current) setIsSubmitting(false);
    }
  }, [
    form, isSubmitting, validateAll, onRegister, navigate, redirect, intl,
    referralCode, trackMetaComplete, trackAdRegistration, getStoredReferralTracking,
  ]);

  const effectiveLoading = isLoading || isSubmitting || googleLoading;

  // ---------- Render ----------

  // Écran de redirection après inscription réussie
  if (isRedirecting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-900 to-blue-800 px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-3xl font-bold text-white mb-3">✅ Inscription réussie !</h2>
          <p className="text-lg text-gray-300 mb-2">Votre compte client a été créé avec succès.</p>
          <p className="text-sm text-gray-400">Redirection vers votre tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <article className="w-full max-w-md">
      {/* Header */}
      <header className="text-center mb-6">
        <div
          className={`w-14 h-14 mx-auto mb-4 bg-gradient-to-br ${theme.accentGradient} rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20`}
          aria-hidden="true"
        >
          <UserPlus className="w-7 h-7 text-white" aria-hidden="true" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          <FormattedMessage id="registerClient.ui.title" />
        </h1>
        <p className="text-gray-400 text-sm mt-2 font-medium">
          <FormattedMessage id="registerClient.ui.subtitle" />
        </p>
      </header>

      {/* Main card */}
      <section
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg dark-reg-form"
        aria-labelledby="form-heading"
      >
        <h2 id="form-heading" className="sr-only">
          <FormattedMessage id="registerClient.ui.formTitle" />
        </h2>

        {/* Error alert */}
        {(authError || generalError) && (
          <div
            className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 mb-5"
            role="alert"
            aria-live="assertive"
          >
            <p className="text-sm font-medium text-red-400">{authError || generalError}</p>
          </div>
        )}

        {/* Google button */}
        <button
          type="button"
          onClick={onGoogleSignup}
          disabled={effectiveLoading}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 bg-white hover:bg-gray-50 text-gray-900 rounded-2xl font-bold text-sm sm:text-base transition-all duration-200 shadow-lg min-h-[52px] disabled:opacity-60 disabled:cursor-not-allowed"
          aria-label={intl.formatMessage({ id: 'registerClient.ui.aria_google_button' })}
        >
          {googleLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-gray-600" aria-hidden="true" />
          ) : (
            <>
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>{intl.formatMessage({ id: 'registerClient.ui.googleSignup' })}</span>
            </>
          )}
        </button>

        {/* Divider */}
        <div className="relative my-5" role="separator" aria-hidden="true">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white/5 backdrop-blur-sm text-gray-500 font-medium rounded-full">
              <FormattedMessage id="registerClient.ui.orDivider" />
            </span>
          </div>
        </div>

        {/* Email form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* FirstName + LastName */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <DarkInput
                ref={firstNameRef}
                theme={theme}
                label={intl.formatMessage({ id: 'registerClient.fields.firstName' })}
                id="firstName"
                name="firstName"
                type="text"
                autoComplete="given-name"
                required
                value={form.firstName}
                onChange={onTextChange}
                onBlur={() => onTextBlur('firstName')}
                error={fieldErrors.firstName}
                touched={touched.firstName}
                icon={<User className="w-5 h-5" />}
                placeholder={intl.formatMessage({ id: 'registerClient.help.firstNamePlaceholder' })}
              />
              <FieldError error={fieldErrors.firstName} show={!!(fieldErrors.firstName && touched.firstName)} id="firstName-error" />
            </div>
            <div>
              <DarkInput
                theme={theme}
                label={intl.formatMessage({ id: 'registerClient.fields.lastName' })}
                id="lastName"
                name="lastName"
                type="text"
                autoComplete="family-name"
                required
                value={form.lastName}
                onChange={onTextChange}
                onBlur={() => onTextBlur('lastName')}
                error={fieldErrors.lastName}
                touched={touched.lastName}
                icon={<User className="w-5 h-5" />}
                placeholder={intl.formatMessage({ id: 'registerClient.help.lastNamePlaceholder' })}
              />
              <FieldError error={fieldErrors.lastName} show={!!(fieldErrors.lastName && touched.lastName)} id="lastName-error" />
            </div>
          </div>

          {/* Email */}
          <div>
            <DarkInput
              theme={theme}
              label={intl.formatMessage({ id: 'registerClient.fields.email' })}
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={onTextChange}
              onBlur={() => onTextBlur('email')}
              error={fieldErrors.email}
              touched={touched.email}
              icon={<Mail className="w-5 h-5" />}
              placeholder={intl.formatMessage({ id: 'registerClient.help.emailPlaceholder' })}
            />
            <FieldError error={fieldErrors.email} show={!!(fieldErrors.email && touched.email)} id="email-error" />
            <FieldSuccess
              show={!fieldErrors.email && !!touched.email && EMAIL_REGEX.test(form.email)}
              message={intl.formatMessage({ id: 'registerClient.success.emailValid' })}
            />
          </div>

          {/* Password */}
          <div>
            <DarkPasswordInput
              theme={theme}
              label={intl.formatMessage({ id: 'registerClient.fields.password' })}
              value={form.password}
              onChange={(e) => setField('password', e.target.value)}
              onBlur={() => markTouched('password')}
              error={fieldErrors.password}
              touched={touched.password}
              strengthLabelId={intl.formatMessage({ id: 'registerClient.ui.passwordStrength' })}
              showPasswordLabel={intl.formatMessage({ id: 'registerClient.ui.ariaShowPassword' })}
              hidePasswordLabel={intl.formatMessage({ id: 'registerClient.ui.ariaHidePassword' })}
            />
            <FieldError error={fieldErrors.password} show={!!(fieldErrors.password && touched.password)} id="password-error" />
            <FieldSuccess
              show={!fieldErrors.password && !!touched.password && form.password.length >= MIN_PASSWORD_LENGTH}
              message={intl.formatMessage({ id: 'registerClient.success.passwordValid' })}
            />
          </div>

          {/* Languages */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              <FormattedMessage id="registerClient.fields.languagesSpoken" />
              <span className="text-red-400 font-bold text-lg ml-1" aria-hidden="true">*</span>
              <span className="inline-flex items-center px-2 py-0.5 ml-2 text-[10px] font-bold text-white bg-red-500 rounded-md">OBLIGATOIRE</span>
            </label>
            <Suspense
              fallback={
                <div className="h-12 animate-pulse rounded-2xl bg-white/5 border-2 border-white/10" role="status" />
              }
            >
              <MultiLanguageSelect
                value={selectedLanguages}
                onChange={onLanguagesChange}
                locale={lang}
                placeholder={intl.formatMessage({ id: 'registerClient.help.languagesPlaceholder' })}
              />
            </Suspense>
            {selectedLanguages.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5" role="list">
                {selectedLanguages.map(l => (
                  <span
                    key={l.value}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium ${theme.tagBg} ${theme.tagText} border ${theme.tagBorder}`}
                    role="listitem"
                  >
                    {l.label}
                  </span>
                ))}
              </div>
            )}
            <FieldError error={fieldErrors.languagesSpoken} show={!!(fieldErrors.languagesSpoken && touched.languagesSpoken)} />
            <FieldSuccess show={form.languagesSpoken.length > 0} message={intl.formatMessage({ id: 'registerClient.success.fieldValid' })} />
          </div>

          {/* Phone */}
          <div>
            <DarkPhoneInput
              theme={theme}
              label={intl.formatMessage({ id: 'registerClient.fields.phone' })}
              value={form.phone}
              onChange={onPhoneChange}
              onBlur={() => markTouched('phone')}
              error={fieldErrors.phone}
              touched={touched.phone}
              locale={lang}
            />
            <FieldError error={fieldErrors.phone} show={!!(fieldErrors.phone && touched.phone)} id="phone-error" />
            <FieldSuccess
              show={!fieldErrors.phone && !!touched.phone && !!form.phone && (parsePhoneNumberFromString(form.phone)?.isValid() ?? false)}
              message={intl.formatMessage({ id: 'registerClient.success.fieldValid' })}
            />
          </div>

          {/* Terms */}
          <DarkCheckbox
            theme={theme}
            checked={form.acceptTerms}
            onChange={onTermsChange}
            error={fieldErrors.acceptTerms}
          >
            <FormattedMessage id="registerClient.ui.acceptTerms" />{' '}
            <Link
              to={theme.cguPath}
              target="_blank"
              rel="noopener noreferrer"
              className={`${theme.linkColor} ${theme.linkHover} underline font-bold`}
            >
              <FormattedMessage id="registerClient.ui.termsLink" />
            </Link>
            <span className="text-red-400 font-bold text-lg ml-1" aria-hidden="true">*</span>
            <span className="inline-flex items-center px-2 py-0.5 ml-2 text-[10px] font-bold text-white bg-red-500 rounded-md">OBLIGATOIRE</span>
          </DarkCheckbox>

          {/* Submit */}
          <button
            type="submit"
            disabled={!isFormValid || effectiveLoading}
            className={`
              w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl
              font-bold text-white text-base min-h-[52px]
              transition-all duration-200 shadow-lg mt-2
              ${isFormValid && !effectiveLoading
                ? `bg-gradient-to-r ${theme.accentGradient} hover:opacity-90 hover:shadow-xl active:scale-[0.98]`
                : 'bg-gray-700 cursor-not-allowed opacity-60'
              }
            `}
            aria-label={intl.formatMessage({ id: 'registerClient.ui.aria_submit_button' })}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                <FormattedMessage id="registerClient.ui.loading" />
              </>
            ) : (
              <>
                <FormattedMessage id="registerClient.ui.createAccount" />
                <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </>
            )}
          </button>
        </form>
      </section>

      {/* Login link */}
      <footer className="mt-5 text-center">
        <p className="text-gray-400 text-sm">
          <FormattedMessage id="registerClient.ui.alreadyRegistered" />{' '}
          <Link
            to={`/login?redirect=${encodeURIComponent(redirect)}`}
            className={`${theme.linkColor} ${theme.linkHover} font-bold underline`}
          >
            <FormattedMessage id="registerClient.ui.login" />
          </Link>
        </p>
      </footer>

      {/* FAQ */}
      <FAQSection theme={theme} intl={intl} faqCount={8} />

      {/* Trust Badges */}
      <TrustBadges />
    </article>
  );
};

export default ClientRegisterForm;
