import React, { useState, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { Mail, User, Globe, Briefcase } from 'lucide-react';
import { useIntl, FormattedMessage } from 'react-intl';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import type { MultiValue } from 'react-select';

import { getTheme } from '../shared/theme';
import {
  EMAIL_REGEX, NAME_REGEX,
  MIN_BIO_LENGTH, MAX_BIO_LENGTH,
  MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH,
  LANG_TO_COUNTRY_PROP,
} from '../shared/constants';
import { sanitizeString, sanitizeStringFinal, sanitizeEmailInput, sanitizeEmailFinal, sanitizeName, sanitizeEmail } from '../shared/sanitize';
import { getCountryCode, isCountrySupportedByStripe } from '../shared/stripeCountries';
import { getRegistrationErrorMessage } from '../shared/registrationErrors';

import RegistrationWizard from '../shared/RegistrationWizard';
import DarkInput from '../shared/DarkInput';
import DarkPasswordInput from '../shared/DarkPasswordInput';
import DarkPhoneInput from '../shared/DarkPhoneInput';
import DarkSelect from '../shared/DarkSelect';
import DarkMultiSelect from '../shared/DarkMultiSelect';
import DarkTextarea from '../shared/DarkTextarea';
import DarkImageUploader from '../shared/DarkImageUploader';
import DarkCheckbox from '../shared/DarkCheckbox';
import { FieldError, FieldSuccess } from '../shared/FieldFeedback';

import { countriesData } from '@/data/countries';
import { LocaleLink } from '../../../multilingual-system';

import { getMetaIdentifiers, setMetaPixelUserData } from '@/utils/metaPixel';
import { generateEventIdForType } from '@/utils/sharedEventId';

import '@/styles/registration-dark.css';
import '@/styles/multi-language-select.css';

const MultiLanguageSelect = lazy(() => import('@/components/forms-data/MultiLanguageSelect'));
const SpecialtySelect = lazy(() => import('@/components/forms-data/SpecialtySelect'));

const theme = getTheme('lawyer');

// Types
interface LawyerFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  currentCountry: string;
  preferredLanguage: string;
  practiceCountries: string[];
  yearsOfExperience: number;
  specialties: string[];
  graduationYear: number;
  profilePhoto: string;
  bio: string;
  educations: string[];
  availability: 'available' | 'busy' | 'offline';
  acceptTerms: boolean;
}

interface LanguageOption {
  value: string;
  label: string;
}

interface CountryOption {
  value: string;
  label: string;
}

interface LawyerRegisterFormProps {
  onRegister: (userData: Record<string, unknown>, password: string) => Promise<void>;
  isLoading: boolean;
  language: string;
  prefillEmail: string;
  referralCode: string;
  redirect: string;
  navigate: (path: string, options?: Record<string, unknown>) => void;
  validateHuman: (action: string) => Promise<{
    isValid: boolean;
    reason?: string;
    recaptchaToken?: string | null;
    securityMeta?: Record<string, unknown>;
  }>;
  honeypotValue: string;
  setHoneypotValue: (v: string) => void;
  stats: { mouseMovements: number; keystrokes: number; timeSpent: number };
  trackMetaComplete: (data: Record<string, unknown>) => void;
  trackAdRegistration: (data: Record<string, unknown>) => void;
  getStoredReferralTracking: () => unknown;
}

const LawyerRegisterForm: React.FC<LawyerRegisterFormProps> = ({
  onRegister,
  isLoading,
  language,
  prefillEmail,
  referralCode,
  redirect,
  navigate,
  validateHuman,
  honeypotValue,
  setHoneypotValue,
  stats,
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

  const [form, setForm] = useState<LawyerFormData>({
    firstName: '',
    lastName: '',
    email: prefillEmail,
    password: '',
    phone: '',
    currentCountry: '',
    preferredLanguage: lang,
    practiceCountries: [],
    yearsOfExperience: 0,
    specialties: [],
    graduationYear: new Date().getFullYear() - 5,
    profilePhoto: '',
    bio: '',
    educations: [''],
    availability: 'offline',
    acceptTerms: false,
  });

  const [selectedLanguages, setSelectedLanguages] = useState<MultiValue<LanguageOption>>([]);
  const [selectedPracticeCountries, setSelectedPracticeCountries] = useState<MultiValue<CountryOption>>([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState<MultiValue<{ value: string; label: string }>>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [botError, setBotError] = useState('');

  // Country options
  const countryOptions = useMemo(() => {
    const prop = LANG_TO_COUNTRY_PROP[lang] || 'nameEn';
    return countriesData
      .filter(c => !c.disabled)
      .map(c => ({ value: (c as unknown as Record<string, unknown>)[prop] as string, label: (c as unknown as Record<string, unknown>)[prop] as string }));
  }, [lang]);

  const countrySelectOptions = useMemo(() =>
    countryOptions.map(c => ({ value: c.value, label: c.label })),
  [countryOptions]);

  const markTouched = useCallback((name: string) => {
    setTouched(p => ({ ...p, [name]: true }));
  }, []);

  const onEmailBlur = useCallback(() => {
    markTouched('email');
    setForm(prev => ({ ...prev, email: sanitizeEmailFinal(prev.email) }));
  }, [markTouched]);

  const clearError = useCallback((name: string) => {
    setFieldErrors(prev => {
      if (!prev[name]) return prev;
      const rest = { ...prev };
      delete rest[name];
      return rest;
    });
  }, []);

  const setField = useCallback(<K extends keyof LawyerFormData>(name: K, value: LawyerFormData[K]) => {
    setForm(prev => ({ ...prev, [name]: value }));
    clearError(name);
  }, [clearError]);

  // Input change handler
  const onTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let processed = value;
    if (name === 'email') {
      processed = sanitizeEmailInput(value);
    } else if (name === 'firstName' || name === 'lastName') {
      processed = sanitizeName(value);
    } else if (name === 'bio') {
      processed = sanitizeString(value);
    } else {
      processed = sanitizeString(value);
    }
    setForm(prev => ({ ...prev, [name]: processed }));
    clearError(name);
  }, [clearError]);

  // Education handlers
  const updateEducation = useCallback((idx: number, val: string) => {
    setForm(p => {
      const arr = [...p.educations];
      arr[idx] = sanitizeString(val);
      return { ...p, educations: arr };
    });
  }, []);

  const addEducation = useCallback(() => setForm(p => ({ ...p, educations: [...p.educations, ''] })), []);

  const removeEducation = useCallback((idx: number) => {
    setForm(p => {
      const arr = p.educations.filter((_, i) => i !== idx);
      return { ...p, educations: arr.length ? arr : [''] };
    });
  }, []);

  // Phone change with validation
  const onPhoneChange = useCallback((value: string) => {
    setForm(prev => ({ ...prev, phone: value }));
    markTouched('phone');
    const parsed = parsePhoneNumberFromString(value);
    if (!value) {
      clearError('phone');
    } else if (!parsed || !parsed.isValid()) {
      setFieldErrors(prev => ({ ...prev, phone: intl.formatMessage({ id: 'registerLawyer.errors.phoneInvalid' }) }));
    } else {
      clearError('phone');
    }
  }, [intl, markTouched, clearError]);

  // Step validations
  const validateStep1 = useCallback(() => {
    const e: Record<string, string> = {};
    const fn = form.firstName.trim();
    const ln = form.lastName.trim();

    if (!fn) e.firstName = intl.formatMessage({ id: 'registerLawyer.errors.firstNameRequired' });
    else if (!NAME_REGEX.test(fn)) e.firstName = intl.formatMessage({ id: 'registerLawyer.errors.firstNameInvalid' });

    if (!ln) e.lastName = intl.formatMessage({ id: 'registerLawyer.errors.lastNameRequired' });
    else if (!NAME_REGEX.test(ln)) e.lastName = intl.formatMessage({ id: 'registerLawyer.errors.lastNameInvalid' });

    if (!form.email.trim()) e.email = intl.formatMessage({ id: 'registerLawyer.errors.emailRequired' });
    else if (!EMAIL_REGEX.test(form.email)) e.email = intl.formatMessage({ id: 'registerLawyer.errors.emailInvalid' });

    if (!form.password || form.password.length < MIN_PASSWORD_LENGTH) e.password = intl.formatMessage({ id: 'registerLawyer.errors.passwordTooShort' });
    else if (form.password.length > MAX_PASSWORD_LENGTH) e.password = intl.formatMessage({ id: 'registerLawyer.errors.passwordTooLong' });

    if (!form.phone.trim()) {
      e.phone = intl.formatMessage({ id: 'registerLawyer.errors.phoneRequired' });
    } else {
      const parsed = parsePhoneNumberFromString(form.phone);
      if (!parsed || !parsed.isValid()) e.phone = intl.formatMessage({ id: 'registerLawyer.errors.phoneInvalid' });
    }

    setFieldErrors(prev => ({ ...prev, ...e }));
    setTouched(prev => ({ ...prev, firstName: true, lastName: true, email: true, password: true, phone: true }));
    return Object.keys(e).length === 0;
  }, [form, intl]);

  const validateStep2 = useCallback(() => {
    const e: Record<string, string> = {};
    if (!form.currentCountry) e.currentCountry = intl.formatMessage({ id: 'registerLawyer.errors.needCountry' });
    if (form.practiceCountries.length === 0) e.practiceCountries = intl.formatMessage({ id: 'registerLawyer.errors.needPractice' });
    setFieldErrors(prev => ({ ...prev, ...e }));
    setTouched(prev => ({ ...prev, currentCountry: true }));
    return Object.keys(e).length === 0;
  }, [form, intl]);

  const validateStep3 = useCallback(() => {
    const e: Record<string, string> = {};
    if (form.specialties.length === 0) e.specialties = intl.formatMessage({ id: 'registerLawyer.errors.needSpecialty' });
    if (!form.educations.some(v => v.trim().length > 0)) e.educations = intl.formatMessage({ id: 'registerLawyer.errors.needEducation' });
    setFieldErrors(prev => ({ ...prev, ...e }));
    return Object.keys(e).length === 0;
  }, [form, intl]);

  const validateStep4 = useCallback(() => {
    const e: Record<string, string> = {};
    const bio = form.bio.trim();
    if (!bio || bio.length < MIN_BIO_LENGTH) e.bio = intl.formatMessage({ id: 'registerLawyer.errors.needBio' });
    else if (bio.length > MAX_BIO_LENGTH) e.bio = intl.formatMessage({ id: 'registerLawyer.errors.bioTooLong' });
    if (!form.profilePhoto) e.profilePhoto = intl.formatMessage({ id: 'registerLawyer.errors.needPhoto' });
    if ((selectedLanguages as LanguageOption[]).length === 0) e.languages = intl.formatMessage({ id: 'registerLawyer.errors.needLanguage' });
    setFieldErrors(prev => ({ ...prev, ...e }));
    setTouched(prev => ({ ...prev, bio: true }));
    return Object.keys(e).length === 0;
  }, [form, selectedLanguages, intl]);

  const validateStep5 = useCallback(() => {
    const e: Record<string, string> = {};
    if (!form.acceptTerms) e.acceptTerms = intl.formatMessage({ id: 'registerLawyer.errors.acceptTermsRequired' });
    setFieldErrors(prev => ({ ...prev, ...e }));
    return Object.keys(e).length === 0;
  }, [form, intl]);

  // Submit handler
  const handleSubmit = useCallback(async () => {
    if (isSubmitting || hasNavigatedRef.current) return;
    setBotError('');
    setIsSubmitting(true);

    const botCheck = await validateHuman('register_lawyer');
    if (!botCheck.isValid) {
      const msgs: Record<string, string> = {
        'Suspicious activity detected': 'A validation error occurred. Please try again.',
        'Please take your time to fill the form': 'Please take your time to fill out the form correctly.',
      };
      setBotError(msgs[botCheck.reason || ''] || 'Validation error.');
      setIsSubmitting(false);
      return;
    }

    try {
      const { setPersistence, browserLocalPersistence } = await import('firebase/auth');
      const { auth } = await import('@/config/firebase');
      await setPersistence(auth, browserLocalPersistence);

      const languageCodes = (selectedLanguages as LanguageOption[]).map(l => l.value);
      const sanitizedEdu = form.educations.map(e => sanitizeStringFinal(e)).filter(Boolean);
      const fn = sanitizeStringFinal(form.firstName);
      const ln = sanitizeStringFinal(form.lastName);
      const bio = sanitizeStringFinal(form.bio);

      const metaEventId = generateEventIdForType('registration');
      const metaIds = getMetaIdentifiers();

      const userData = {
        role: 'lawyer' as const,
        type: 'lawyer' as const,
        email: sanitizeEmail(form.email),
        fullName: `${fn} ${ln}`,
        name: `${fn} ${ln}`,
        firstName: fn,
        lastName: ln,
        phone: form.phone,
        currentCountry: form.currentCountry,
        country: form.currentCountry,
        practiceCountries: form.practiceCountries,
        profilePhoto: form.profilePhoto,
        photoURL: form.profilePhoto,
        avatar: form.profilePhoto,
        languages: languageCodes,
        languagesSpoken: languageCodes,
        specialties: form.specialties,
        education: sanitizedEdu.join(', '),
        yearsOfExperience: Math.max(0, Math.min(60, form.yearsOfExperience)),
        graduationYear: Math.max(1980, Math.min(new Date().getFullYear(), form.graduationYear)),
        bio,
        description: bio,
        availability: form.availability,
        isOnline: false,
        isApproved: false,
        isVisible: false,
        isActive: true,
        approvalStatus: 'pending' as const,
        verificationStatus: 'pending',
        status: 'pending',
        rating: 4.5,
        reviewCount: 0,
        preferredLanguage: form.preferredLanguage,
        _securityMeta: {
          recaptchaToken: botCheck.recaptchaToken,
          formFillTime: stats.timeSpent,
          mouseMovements: stats.mouseMovements,
          keystrokes: stats.keystrokes,
          userAgent: navigator.userAgent,
          timestamp: Date.now(),
        },
        termsAccepted: form.acceptTerms,
        termsAcceptedAt: new Date().toISOString(),
        termsVersion: '3.0',
        termsType: 'terms_lawyers',
        termsAcceptanceMeta: {
          userAgent: navigator.userAgent,
          language: navigator.language,
          timestamp: Date.now(),
          acceptanceMethod: 'checkbox_click',
        },
        ...(referralCode && {
          pendingReferralCode: referralCode.toUpperCase().trim(),
          providerRecruitedByChatter: referralCode.toUpperCase().trim(),
        }),
        ...(() => {
          const tracking = getStoredReferralTracking();
          return tracking ? { referralTracking: tracking } : {};
        })(),
        fbp: metaIds.fbp,
        fbc: metaIds.fbc,
        metaEventId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await onRegister(userData, form.password);

      const stripeCountryCode = getCountryCode(form.currentCountry);

      if (!isCountrySupportedByStripe(stripeCountryCode)) {
        hasNavigatedRef.current = true;
        trackMetaComplete({ content_name: 'lawyer_registration', status: 'completed', country: form.currentCountry, eventID: metaEventId });
        trackAdRegistration({ contentName: 'lawyer_registration' });
        setMetaPixelUserData({ email: sanitizeEmail(form.email), firstName: fn, lastName: ln, country: form.currentCountry });
        navigate(redirect, { replace: true, state: { message: intl.formatMessage({ id: 'registerLawyer.success.registered' }), type: 'success' } });
        return;
      }

      try {
        const { httpsCallable } = await import('firebase/functions');
        const { functions } = await import('@/config/firebase');
        const createStripeAccount = httpsCallable(functions, 'createStripeAccount');
        await createStripeAccount({ email: sanitizeEmail(form.email), currentCountry: stripeCountryCode, firstName: fn, lastName: ln, userType: 'lawyer' });
      } catch (stripeErr) {
        console.error('[RegisterLawyer] Stripe error (account created):', stripeErr);
      }

      hasNavigatedRef.current = true;
      trackMetaComplete({ content_name: 'lawyer_registration', status: 'completed', country: form.currentCountry, eventID: metaEventId });
      trackAdRegistration({ contentName: 'lawyer_registration' });
      setMetaPixelUserData({ email: sanitizeEmail(form.email), firstName: fn, lastName: ln, country: form.currentCountry });
      navigate(redirect, { replace: true, state: { message: intl.formatMessage({ id: 'registerLawyer.success.registered' }), type: 'success' } });

    } catch (err: unknown) {
      console.error('[RegisterLawyer] Registration error:', err);
      if (!isMountedRef.current || hasNavigatedRef.current) return;
      const msg = getRegistrationErrorMessage(err, intl, 'registerLawyer', form.currentCountry, getCountryCode(form.currentCountry));
      setFieldErrors(prev => ({ ...prev, general: msg }));
      setIsSubmitting(false);
    }
  }, [isSubmitting, validateHuman, selectedLanguages, form, onRegister, referralCode, getStoredReferralTracking, stats, navigate, redirect, intl, trackMetaComplete, trackAdRegistration]);

  const canSubmit = useMemo(() => {
    const parsed = parsePhoneNumberFromString(form.phone);
    const fn = form.firstName.trim();
    const ln = form.lastName.trim();
    const bio = form.bio.trim();
    return (
      !!fn && NAME_REGEX.test(fn) &&
      !!ln && NAME_REGEX.test(ln) &&
      EMAIL_REGEX.test(form.email) &&
      form.password.length >= MIN_PASSWORD_LENGTH &&
      form.password.length <= MAX_PASSWORD_LENGTH &&
      !!form.phone && !!parsed?.isValid() &&
      !!form.currentCountry &&
      bio.length >= MIN_BIO_LENGTH && bio.length <= MAX_BIO_LENGTH &&
      !!form.profilePhoto &&
      form.specialties.length > 0 &&
      form.practiceCountries.length > 0 &&
      (selectedLanguages as LanguageOption[]).length > 0 &&
      form.educations.some(e => e.trim().length > 0) &&
      form.acceptTerms &&
      !isLoading && !isSubmitting
    );
  }, [form, selectedLanguages, isLoading, isSubmitting]);

  // Build wizard steps
  const steps = useMemo(() => [
    {
      label: intl.formatMessage({ id: 'registerLawyer.step.identity', defaultMessage: 'Identity' }),
      validate: validateStep1,
      content: (
        <div className="space-y-5">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
            <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${theme.iconBg}`}>
              <User className={`w-4 h-4 ${theme.iconText}`} aria-hidden="true" />
            </div>
            <h2 className="text-lg font-bold text-white">
              <FormattedMessage id="registerLawyer.section.identity" />
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <DarkInput
                theme={theme}
                id="firstName"
                name="firstName"
                label={intl.formatMessage({ id: 'registerLawyer.fields.firstName' })}
                value={form.firstName}
                onChange={onTextChange}
                onBlur={() => markTouched('firstName')}
                autoComplete="given-name"
                placeholder={intl.formatMessage({ id: 'registerLawyer.placeholder.firstName' })}
                error={fieldErrors.firstName}
                touched={touched.firstName}
                required
              />
              <FieldError error={fieldErrors.firstName} show={!!(fieldErrors.firstName && touched.firstName)} />
              <FieldSuccess show={!fieldErrors.firstName && !!touched.firstName && !!form.firstName.trim() && NAME_REGEX.test(form.firstName.trim())} message={intl.formatMessage({ id: 'registerLawyer.success.fieldValid' })} />
            </div>
            <div>
              <DarkInput
                theme={theme}
                id="lastName"
                name="lastName"
                label={intl.formatMessage({ id: 'registerLawyer.fields.lastName' })}
                value={form.lastName}
                onChange={onTextChange}
                onBlur={() => markTouched('lastName')}
                autoComplete="family-name"
                placeholder={intl.formatMessage({ id: 'registerLawyer.placeholder.lastName' })}
                error={fieldErrors.lastName}
                touched={touched.lastName}
                required
              />
              <FieldError error={fieldErrors.lastName} show={!!(fieldErrors.lastName && touched.lastName)} />
              <FieldSuccess show={!fieldErrors.lastName && !!touched.lastName && !!form.lastName.trim() && NAME_REGEX.test(form.lastName.trim())} message={intl.formatMessage({ id: 'registerLawyer.success.fieldValid' })} />
            </div>
          </div>

          <div>
            <DarkInput
              theme={theme}
              id="email"
              name="email"
              type="email"
              label={intl.formatMessage({ id: 'registerLawyer.fields.email' })}
              value={form.email}
              onChange={onTextChange}
              onBlur={onEmailBlur}
              autoComplete="email"
              inputMode="email"
              placeholder={intl.formatMessage({ id: 'registerLawyer.placeholder.email' })}
              icon={<Mail className="w-5 h-5" />}
              error={fieldErrors.email}
              touched={touched.email}
              required
            />
            <FieldError error={fieldErrors.email} show={!!(touched.email && fieldErrors.email)} />
            <FieldSuccess show={!!touched.email && !!form.email && EMAIL_REGEX.test(form.email)} message={intl.formatMessage({ id: 'registerLawyer.success.emailValid' })} />
          </div>

          <DarkPasswordInput
            theme={theme}
            label={intl.formatMessage({ id: 'registerLawyer.fields.password' })}
            value={form.password}
            onChange={(e) => { setField('password', e.target.value); }}
            onBlur={() => markTouched('password')}
            error={fieldErrors.password}
            touched={touched.password}
            strengthLabelId={intl.formatMessage({ id: 'registerLawyer.ui.passwordStrength', defaultMessage: 'Password strength' })}
            showPasswordLabel={intl.formatMessage({ id: 'registerLawyer.ui.showPassword', defaultMessage: 'Show password' })}
            hidePasswordLabel={intl.formatMessage({ id: 'registerLawyer.ui.hidePassword', defaultMessage: 'Hide password' })}
          />
          <FieldError error={fieldErrors.password} show={!!(fieldErrors.password && touched.password)} />
          <FieldSuccess show={!fieldErrors.password && !!touched.password && form.password.length >= MIN_PASSWORD_LENGTH} message={intl.formatMessage({ id: 'registerLawyer.success.pwdOk' })} />

          <DarkPhoneInput
            theme={theme}
            label={intl.formatMessage({ id: 'registerLawyer.fields.phone' })}
            value={form.phone}
            onChange={onPhoneChange}
            onBlur={() => markTouched('phone')}
            error={fieldErrors.phone}
            touched={touched.phone}
            locale={lang}
          />
          <FieldError error={fieldErrors.phone} show={!!(touched.phone && fieldErrors.phone)} />
          <FieldSuccess show={!!(touched.phone && !fieldErrors.phone && parsePhoneNumberFromString(form.phone)?.isValid())} message={intl.formatMessage({ id: 'registerLawyer.success.fieldValid' })} />
        </div>
      ),
    },
    {
      label: intl.formatMessage({ id: 'registerLawyer.step.location', defaultMessage: 'Location' }),
      validate: validateStep2,
      content: (
        <div className="space-y-5">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
            <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${theme.iconBg}`}>
              <Globe className={`w-4 h-4 ${theme.iconText}`} aria-hidden="true" />
            </div>
            <h2 className="text-lg font-bold text-white">
              <FormattedMessage id="registerLawyer.section.location" />
            </h2>
          </div>

          <DarkSelect
            theme={theme}
            id="currentCountry"
            label={intl.formatMessage({ id: 'registerLawyer.fields.residenceCountry' })}
            options={countrySelectOptions}
            value={form.currentCountry}
            onChange={(v) => setField('currentCountry', v)}
            onBlur={() => markTouched('currentCountry')}
            placeholder={intl.formatMessage({ id: 'common.select', defaultMessage: 'Select...' })}
            error={fieldErrors.currentCountry}
            touched={touched.currentCountry}
            required
          />
          <FieldError error={fieldErrors.currentCountry} show={!!(fieldErrors.currentCountry && touched.currentCountry)} />
          <FieldSuccess show={!!form.currentCountry} message={intl.formatMessage({ id: 'registerLawyer.success.fieldValid' })} />

          <DarkMultiSelect
            theme={theme}
            id="practiceCountries"
            label={intl.formatMessage({ id: 'registerLawyer.fields.practiceCountries' })}
            options={countrySelectOptions}
            value={form.practiceCountries}
            onChange={(vals) => { setField('practiceCountries', vals); setSelectedPracticeCountries(vals.map(v => ({ value: v, label: countryOptions.find(c => c.value === v)?.label || v })) as MultiValue<CountryOption>); }}
            placeholder={intl.formatMessage({ id: 'registerLawyer.select.addPractice' })}
            error={fieldErrors.practiceCountries}
            required
          />
          <FieldError error={fieldErrors.practiceCountries} show={!!fieldErrors.practiceCountries} />
          <FieldSuccess show={form.practiceCountries.length > 0} message={intl.formatMessage({ id: 'registerLawyer.success.fieldValid' })} />

          <DarkSelect
            theme={theme}
            id="preferredLanguage"
            label={intl.formatMessage({ id: 'registerLawyer.fields.preferredLanguage', defaultMessage: 'Preferred language' })}
            options={[
              { value: 'fr', label: 'Français' },
              { value: 'en', label: 'English' },
              { value: 'es', label: 'Español' },
              { value: 'de', label: 'Deutsch' },
              { value: 'pt', label: 'Português' },
              { value: 'ru', label: 'Русский' },
              { value: 'ar', label: 'العربية' },
              { value: 'hi', label: 'हिन्दी' },
              { value: 'ch', label: '中文' },
            ]}
            value={form.preferredLanguage}
            onChange={(v) => setField('preferredLanguage', v as LawyerFormData['preferredLanguage'])}
            placeholder="Select..."
            searchable={false}
          />
        </div>
      ),
    },
    {
      label: intl.formatMessage({ id: 'registerLawyer.step.expertise', defaultMessage: 'Expertise' }),
      validate: validateStep3,
      content: (
        <div className="space-y-5">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
            <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${theme.iconBg}`}>
              <Briefcase className={`w-4 h-4 ${theme.iconText}`} aria-hidden="true" />
            </div>
            <h2 className="text-lg font-bold text-white">
              <FormattedMessage id="registerLawyer.section.expertise" />
            </h2>
          </div>

          <div className="dark-reg-form">
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              <FormattedMessage id="registerLawyer.fields.specialties" />
              <span className="text-red-400 ml-1">*</span>
            </label>
            <Suspense fallback={<div className="h-14 animate-pulse rounded-2xl bg-white/5 border border-white/10" />}>
              <SpecialtySelect
                value={selectedSpecialties}
                onChange={(v) => {
                  setSelectedSpecialties(v);
                  setField('specialties', v.map(s => s.value));
                }}
                locale={lang}
                placeholder={intl.formatMessage({ id: 'registerLawyer.placeholder.selectSpecialties' })}
                aria-label={intl.formatMessage({ id: 'registerLawyer.fields.specialties' })}
              />
            </Suspense>
            <FieldError error={fieldErrors.specialties} show={!!fieldErrors.specialties} />
            <FieldSuccess show={form.specialties.length > 0} message={intl.formatMessage({ id: 'registerLawyer.success.fieldValid' })} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              <FormattedMessage id="registerLawyer.fields.education" />
              <span className="text-red-400 ml-1">*</span>
            </label>
            <div className="space-y-3">
              {form.educations.map((ed, idx) => (
                <div key={idx} className="flex gap-2">
                  <DarkInput
                    theme={theme}
                    id={`education-${idx}`}
                    label=""
                    value={ed}
                    onChange={(e) => updateEducation(idx, e.target.value)}
                    placeholder={intl.formatMessage({ id: 'registerLawyer.placeholder.education' })}
                    className="flex-1"
                  />
                  {form.educations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEducation(idx)}
                      className="px-3 py-2 rounded-2xl border border-white/10 hover:bg-red-500/10 hover:border-red-500/30 transition-colors text-gray-400"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addEducation}
              className={`mt-3 text-sm font-bold ${theme.linkColor} ${theme.linkHover} transition-colors`}
            >
              + <FormattedMessage id="registerLawyer.select.addEducation" />
            </button>
            <FieldError error={fieldErrors.educations} show={!!fieldErrors.educations} />
            <FieldSuccess show={form.educations.some(e => e.trim().length > 0)} message={intl.formatMessage({ id: 'registerLawyer.success.fieldValid' })} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DarkInput
              theme={theme}
              id="graduationYear"
              name="graduationYear"
              type="number"
              label={intl.formatMessage({ id: 'registerLawyer.fields.graduationYear' })}
              value={form.graduationYear}
              onChange={(e) => setField('graduationYear', Number(e.target.value))}
              min={1980}
              max={new Date().getFullYear()}
              inputMode="numeric"
            />
            <DarkInput
              theme={theme}
              id="yearsOfExperience"
              name="yearsOfExperience"
              type="number"
              label={intl.formatMessage({ id: 'registerLawyer.fields.yearsOfExperience' })}
              value={form.yearsOfExperience || ''}
              onChange={(e) => setField('yearsOfExperience', e.target.value === '' ? 0 : Number(e.target.value))}
              min={0}
              max={60}
              inputMode="numeric"
            />
          </div>
        </div>
      ),
    },
    {
      label: intl.formatMessage({ id: 'registerLawyer.step.profile', defaultMessage: 'Profile' }),
      validate: validateStep4,
      content: (
        <div className="space-y-5">
          <DarkTextarea
            theme={theme}
            id="bio"
            name="bio"
            label={intl.formatMessage({ id: 'registerLawyer.fields.bio' })}
            value={form.bio}
            onChange={onTextChange}
            onBlur={() => markTouched('bio')}
            error={fieldErrors.bio}
            touched={touched.bio}
            required
            currentLength={form.bio.length}
            minLength={MIN_BIO_LENGTH}
            maxLength={MAX_BIO_LENGTH}
            remainingMessage={intl.formatMessage({ id: 'registerLawyer.bio.remaining' }, { count: MIN_BIO_LENGTH - form.bio.trim().length })}
            completeMessage={intl.formatMessage({ id: 'registerLawyer.bio.complete' })}
            placeholder={intl.formatMessage({ id: 'registerLawyer.placeholder.bio' })}
          />
          <FieldError error={fieldErrors.bio} show={!!(fieldErrors.bio && touched.bio)} />
          <FieldSuccess show={form.bio.trim().length >= MIN_BIO_LENGTH} message={intl.formatMessage({ id: 'registerLawyer.success.fieldValid' })} />

          <DarkImageUploader
            theme={theme}
            label={intl.formatMessage({ id: 'registerLawyer.fields.profilePhoto' })}
            value={form.profilePhoto}
            onChange={(url) => { setField('profilePhoto', url); }}
            error={fieldErrors.profilePhoto}
            locale={lang}
            altText={intl.formatMessage({ id: 'registerLawyer.ui.profilePhotoAlt', defaultMessage: 'Profile photo' })}
            loadingLabel={intl.formatMessage({ id: 'common.loading', defaultMessage: 'Loading...' })}
          />
          <FieldError error={fieldErrors.profilePhoto} show={!!fieldErrors.profilePhoto} />
          <FieldSuccess show={!!form.profilePhoto} message={intl.formatMessage({ id: 'registerLawyer.success.fieldValid' })} />

          <div className="dark-reg-form">
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              <FormattedMessage id="registerLawyer.fields.languages" />
              <span className="text-red-400 ml-1">*</span>
            </label>
            <Suspense fallback={<div className="h-14 animate-pulse rounded-2xl bg-white/5 border border-white/10" />}>
              <MultiLanguageSelect
                value={selectedLanguages}
                onChange={(v: MultiValue<LanguageOption>) => {
                  setSelectedLanguages(v);
                  setTouched(p => ({ ...p, languages: true }));
                }}
                locale={lang}
                placeholder={intl.formatMessage({ id: 'registerLawyer.select.searchLanguages' })}
              />
            </Suspense>
            <FieldError error={fieldErrors.languages} show={!!fieldErrors.languages} />
            <FieldSuccess show={(selectedLanguages as LanguageOption[]).length > 0} message={intl.formatMessage({ id: 'registerLawyer.success.fieldValid' })} />
          </div>
        </div>
      ),
    },
    {
      label: intl.formatMessage({ id: 'registerLawyer.step.validation', defaultMessage: 'Confirm' }),
      validate: validateStep5,
      content: (
        <div className="space-y-5">
          <h2 className="text-lg font-bold text-white mb-4">
            <FormattedMessage id="registerLawyer.step.validationTitle" defaultMessage="Finalize your registration" />
          </h2>

          {/* Summary */}
          <div className="space-y-2 text-sm text-gray-400">
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-gray-500"><FormattedMessage id="registerLawyer.fields.firstName" /></span>
              <span className="text-white font-medium">{form.firstName} {form.lastName}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-gray-500"><FormattedMessage id="registerLawyer.fields.email" /></span>
              <span className="text-white font-medium">{form.email}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-gray-500"><FormattedMessage id="registerLawyer.fields.residenceCountry" /></span>
              <span className="text-white font-medium">{form.currentCountry}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-gray-500"><FormattedMessage id="registerLawyer.fields.specialties" /></span>
              <span className="text-white font-medium">{form.specialties.length}</span>
            </div>
          </div>

          <DarkCheckbox
            theme={theme}
            checked={form.acceptTerms}
            onChange={(checked) => { setField('acceptTerms', checked); setTouched(p => ({ ...p, acceptTerms: true })); }}
            error={fieldErrors.acceptTerms}
          >
            <FormattedMessage id="registerLawyer.ui.acceptTerms" />{' '}
            <LocaleLink
              to="/cgu-avocats"
              className={`font-bold underline ${theme.linkColor} ${theme.linkHover}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FormattedMessage id="registerLawyer.ui.termsLink" />
            </LocaleLink>
            <span className="text-red-400 ml-1">*</span>
          </DarkCheckbox>
          <FieldError error={fieldErrors.acceptTerms} show={!!fieldErrors.acceptTerms} />

          <p className="text-xs text-gray-600 text-center">
            Ce site est protégé par reCAPTCHA et les{' '}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className={`${theme.linkColor} hover:underline`}>
              règles de confidentialité
            </a>{' '}
            et{' '}
            <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className={`${theme.linkColor} hover:underline`}>
              conditions d'utilisation
            </a>{' '}
            de Google s'appliquent.
          </p>
        </div>
      ),
    },
  ], [form, fieldErrors, touched, selectedLanguages, selectedSpecialties, selectedPracticeCountries, countrySelectOptions, countryOptions, intl, lang, onTextChange, markTouched, setField, onPhoneChange, updateEducation, addEducation, removeEducation, validateStep1, validateStep2, validateStep3, validateStep4, validateStep5]);

  return (
    <RegistrationWizard
      theme={theme}
      steps={steps}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting || isLoading}
      canSubmit={canSubmit}
      generalError={fieldErrors.general}
      botError={botError}
      honeypotValue={honeypotValue}
      setHoneypotValue={setHoneypotValue}
    />
  );
};

export default LawyerRegisterForm;
