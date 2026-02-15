import React, { useState, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { Mail, User, Globe, Heart } from 'lucide-react';
import { useIntl, FormattedMessage } from 'react-intl';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import type { MultiValue } from 'react-select';

import { getTheme } from '../shared/theme';
import {
  EMAIL_REGEX, NAME_REGEX,
  MIN_BIO_LENGTH, MAX_BIO_LENGTH,
  MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH,
  LANG_TO_COUNTRY_PROP, LANG_TO_HELP_LOCALE,
} from '../shared/constants';
import { sanitizeString, sanitizeStringFinal, sanitizeEmailInput, sanitizeEmailFinal, sanitizeEmail } from '../shared/sanitize';
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
import { expatHelpTypesData, getExpatHelpTypeLabel } from '@/data/expat-help-types';
import { LocaleLink } from '../../../multilingual-system';

import { getMetaIdentifiers, setMetaPixelUserData } from '@/utils/metaPixel';
import { generateEventIdForType } from '@/utils/sharedEventId';

import '@/styles/registration-dark.css';
import '@/styles/multi-language-select.css';

const MultiLanguageSelect = lazy(() => import('@/components/forms-data/MultiLanguageSelect'));

const theme = getTheme('expat');

// Types
interface ExpatFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  currentCountry: string;
  currentPresenceCountry: string;
  interventionCountries: string[]; // Changed from interventionCountries (single) to interventionCountries (multiple)
  preferredLanguage: string;
  helpTypes: string[];
  customHelpType: string;
  yearsAsExpat: number;
  profilePhoto: string;
  bio: string;
  availability: 'available' | 'busy' | 'offline';
  acceptTerms: boolean;
}

interface LanguageOption {
  value: string;
  label: string;
}

interface ExpatRegisterFormProps {
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

const ExpatRegisterForm: React.FC<ExpatRegisterFormProps> = ({
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

  const [form, setForm] = useState<ExpatFormData>({
    firstName: '',
    lastName: '',
    email: prefillEmail,
    password: '',
    phone: '',
    currentCountry: '',
    currentPresenceCountry: '',
    interventionCountries: [],
    preferredLanguage: lang,
    helpTypes: [],
    customHelpType: '',
    yearsAsExpat: 0,
    profilePhoto: '',
    bio: '',
    availability: 'offline',
    acceptTerms: false,
  });

  const [selectedLanguages, setSelectedLanguages] = useState<MultiValue<LanguageOption>>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [botError, setBotError] = useState('');
  const [showCustomHelp, setShowCustomHelp] = useState(false);

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

  // Help type options
  const helpTypeOptions = useMemo(() => {
    const mappedLocale = LANG_TO_HELP_LOCALE[lang] || 'fr';
    return expatHelpTypesData
      .filter(item => !item.disabled)
      .map(item => ({
        value: item.code,
        label: getExpatHelpTypeLabel(item.code, mappedLocale),
      }));
  }, [lang]);

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

  const setField = useCallback(<K extends keyof ExpatFormData>(name: K, value: ExpatFormData[K]) => {
    setForm(prev => ({ ...prev, [name]: value }));
    clearError(name);
  }, [clearError]);

  const onTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let processed = value;
    if (name === 'email') {
      processed = sanitizeEmailInput(value);
    } else if (name === 'firstName' || name === 'lastName') {
      // ✅ FIX: Suppression du filtre restrictif - laisse NAME_REGEX valider Unicode
      processed = sanitizeString(value);
    } else {
      processed = sanitizeString(value);
    }
    setForm(prev => ({ ...prev, [name]: processed }));
    clearError(name);
  }, [clearError]);

  const onPhoneChange = useCallback((value: string) => {
    setForm(prev => ({ ...prev, phone: value }));
    markTouched('phone');
    const parsed = parsePhoneNumberFromString(value);
    if (!value) {
      clearError('phone');
    } else if (!parsed || !parsed.isValid()) {
      setFieldErrors(prev => ({ ...prev, phone: intl.formatMessage({ id: 'registerExpat.errors.phoneInvalid' }) }));
    } else {
      clearError('phone');
    }
  }, [intl, markTouched, clearError]);

  // Help type handlers
  const addHelpType = useCallback((code: string) => {
    if (code === 'AUTRE_PRECISER') {
      setShowCustomHelp(true);
      return;
    }
    if (!form.helpTypes.includes(code)) {
      setField('helpTypes', [...form.helpTypes, code]);
    }
  }, [form.helpTypes, setField]);

  const removeHelpType = useCallback((code: string) => {
    setField('helpTypes', form.helpTypes.filter(h => h !== code));
  }, [form.helpTypes, setField]);

  const addCustomHelp = useCallback(() => {
    const v = sanitizeString(form.customHelpType).trim();
    if (v && !form.helpTypes.includes(v)) {
      setField('helpTypes', [...form.helpTypes, v]);
      setForm(prev => ({ ...prev, customHelpType: '' }));
      setShowCustomHelp(false);
    }
  }, [form.customHelpType, form.helpTypes, setField]);

  // Step validations
  const validateStep1 = useCallback(() => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = intl.formatMessage({ id: 'registerExpat.errors.firstNameRequired' });
    else if (!NAME_REGEX.test(form.firstName.trim())) e.firstName = intl.formatMessage({ id: 'registerExpat.errors.firstNameInvalid' });

    if (!form.lastName.trim()) e.lastName = intl.formatMessage({ id: 'registerExpat.errors.lastNameRequired' });
    else if (!NAME_REGEX.test(form.lastName.trim())) e.lastName = intl.formatMessage({ id: 'registerExpat.errors.lastNameInvalid' });

    if (!form.email.trim()) e.email = intl.formatMessage({ id: 'registerExpat.errors.emailRequired' });
    else if (!EMAIL_REGEX.test(form.email)) e.email = intl.formatMessage({ id: 'registerExpat.errors.emailInvalid' });

    if (!form.password || form.password.length < MIN_PASSWORD_LENGTH) e.password = intl.formatMessage({ id: 'registerExpat.errors.passwordTooShort' });
    else if (form.password.length > MAX_PASSWORD_LENGTH) e.password = intl.formatMessage({ id: 'registerExpat.errors.passwordTooLong' });

    if (!form.phone.trim()) {
      e.phone = intl.formatMessage({ id: 'registerExpat.errors.phoneRequired' });
    } else {
      const parsed = parsePhoneNumberFromString(form.phone);
      if (!parsed || !parsed.isValid()) e.phone = intl.formatMessage({ id: 'registerExpat.errors.phoneInvalid' });
    }

    setFieldErrors(prev => ({ ...prev, ...e }));
    setTouched(prev => ({ ...prev, firstName: true, lastName: true, email: true, password: true, phone: true }));
    return Object.keys(e).length === 0;
  }, [form, intl]);

  const validateStep2 = useCallback(() => {
    const e: Record<string, string> = {};
    if (!form.currentCountry) e.currentCountry = intl.formatMessage({ id: 'registerExpat.errors.needCountry' });
    if (!form.currentPresenceCountry) e.currentPresenceCountry = intl.formatMessage({ id: 'registerExpat.errors.needPresence' });
    if (form.interventionCountries.length === 0) e.interventionCountries = intl.formatMessage({ id: 'registerExpat.errors.needIntervention' });
    setFieldErrors(prev => ({ ...prev, ...e }));
    setTouched(prev => ({ ...prev, currentCountry: true, currentPresenceCountry: true, interventionCountries: true }));
    return Object.keys(e).length === 0;
  }, [form, intl]);

  const validateStep3 = useCallback(() => {
    const e: Record<string, string> = {};
    if (form.helpTypes.length === 0) e.helpTypes = intl.formatMessage({ id: 'registerExpat.errors.needHelp' });
    if (form.yearsAsExpat < 1) e.yearsAsExpat = intl.formatMessage({ id: 'registerExpat.errors.needYears' });
    setFieldErrors(prev => ({ ...prev, ...e }));
    return Object.keys(e).length === 0;
  }, [form, intl]);

  const validateStep4 = useCallback(() => {
    const e: Record<string, string> = {};
    const bio = form.bio.trim();
    if (!bio || bio.length < MIN_BIO_LENGTH) e.bio = intl.formatMessage({ id: 'registerExpat.errors.needBio' });
    else if (bio.length > MAX_BIO_LENGTH) e.bio = intl.formatMessage({ id: 'registerExpat.errors.bioTooLong' });
    if (!form.profilePhoto) e.profilePhoto = intl.formatMessage({ id: 'registerExpat.errors.needPhoto' });
    if ((selectedLanguages as LanguageOption[]).length === 0) e.languages = intl.formatMessage({ id: 'registerExpat.errors.needLang' });
    setFieldErrors(prev => ({ ...prev, ...e }));
    setTouched(prev => ({ ...prev, bio: true }));
    return Object.keys(e).length === 0;
  }, [form, selectedLanguages, intl]);

  const validateStep5 = useCallback(() => {
    const e: Record<string, string> = {};
    if (!form.acceptTerms) e.acceptTerms = intl.formatMessage({ id: 'registerExpat.errors.acceptTermsRequired' });
    setFieldErrors(prev => ({ ...prev, ...e }));
    return Object.keys(e).length === 0;
  }, [form, intl]);

  // Submit
  const handleSubmit = useCallback(async () => {
    if (isSubmitting || hasNavigatedRef.current) return;
    setBotError('');
    setIsSubmitting(true);

    const startTime = Date.now();
    console.log('[ExpatRegisterForm] 🔵 DÉBUT INSCRIPTION', {
      timestamp: new Date().toISOString(),
      email: form.email,
      firstName: form.firstName,
      lastName: form.lastName,
      currentPresenceCountry: form.currentPresenceCountry,
      interventionCountriesCount: form.interventionCountries.length,
      helpTypesCount: form.helpTypes.length,
      languagesCount: selectedLanguages.length,
      yearsAsExpat: form.yearsAsExpat,
      hasProfilePhoto: !!form.profilePhoto,
      userAgent: navigator.userAgent,
      online: navigator.onLine,
      serviceWorkerActive: !!navigator.serviceWorker?.controller,
      formFillTime: stats.timeSpent,
      mouseMovements: stats.mouseMovements,
      keystrokes: stats.keystrokes
    });

    console.log('[ExpatRegisterForm] 🤖 ANTI-BOT CHECK - Début', {
      timestamp: new Date().toISOString(),
      formFillTime: stats.timeSpent,
      mouseMovements: stats.mouseMovements,
      keystrokes: stats.keystrokes
    });

    const botCheck = await validateHuman('register_expat');

    console.log('[ExpatRegisterForm] 🤖 ANTI-BOT CHECK - Résultat', {
      timestamp: new Date().toISOString(),
      isValid: botCheck.isValid,
      reason: botCheck.reason,
      hasRecaptchaToken: !!botCheck.recaptchaToken,
      securityMeta: botCheck.securityMeta
    });

    if (!botCheck.isValid) {
      console.log('[ExpatRegisterForm] 🚨 ANTI-BOT BLOQUÉ', {
        timestamp: new Date().toISOString(),
        reason: botCheck.reason,
        formFillTime: stats.timeSpent,
        mouseMovements: stats.mouseMovements,
        keystrokes: stats.keystrokes
      });
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
      const residenceCountryCode = getCountryCode(form.currentPresenceCountry);

      const metaEventId = generateEventIdForType('registration');
      const metaIds = getMetaIdentifiers();

      const userData = {
        role: 'expat' as const,
        type: 'expat' as const,
        email: sanitizeEmail(form.email),
        fullName: `${sanitizeString(form.firstName)} ${sanitizeString(form.lastName)}`,
        name: `${sanitizeString(form.firstName)} ${sanitizeString(form.lastName)}`,
        firstName: sanitizeString(form.firstName),
        lastName: sanitizeString(form.lastName),
        phone: form.phone,
        currentCountry: form.currentCountry,
        currentPresenceCountry: form.currentPresenceCountry,
        country: form.currentPresenceCountry,
        countryCode: residenceCountryCode,
        interventionCountries: form.interventionCountries,
        practiceCountries: form.interventionCountries,
        operatingCountries: form.interventionCountries,
        profilePhoto: form.profilePhoto,
        photoURL: form.profilePhoto,
        avatar: form.profilePhoto,
        languages: languageCodes,
        languagesSpoken: languageCodes,
        helpTypes: form.helpTypes.map(h => sanitizeString(h)),
        yearsAsExpat: Math.max(1, Math.min(60, form.yearsAsExpat)),
        bio: sanitizeString(form.bio),
        description: sanitizeString(form.bio),
        availability: 'offline' as const,
        isOnline: false,
        isApproved: false,
        isVisible: false,
        isActive: true,
        approvalStatus: 'pending' as const,
        verificationStatus: 'pending',
        status: 'pending',
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
        termsType: 'terms_expats',
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
        ...(metaIds.fbp ? { fbp: metaIds.fbp } : {}),
        ...(metaIds.fbc ? { fbc: metaIds.fbc } : {}),
        metaEventId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      console.log('[ExpatRegisterForm] 📤 APPEL BACKEND - Début', {
        timestamp: new Date().toISOString(),
        function: 'onRegister (registerExpat)',
        email: userData.email,
        role: userData.role,
        currentPresenceCountry: userData.currentPresenceCountry,
        interventionCountriesCount: userData.interventionCountries.length,
        helpTypesCount: userData.helpTypes.length,
        languagesCount: userData.languages.length,
        hasRecaptchaToken: !!userData._securityMeta.recaptchaToken,
        dataKeys: Object.keys(userData).filter(k => !k.startsWith('_')),
        elapsedSinceStart: Date.now() - startTime
      });

      await onRegister(userData, form.password);

      console.log('[ExpatRegisterForm] ✅ BACKEND OK - onRegister réussi', {
        timestamp: new Date().toISOString(),
        email: userData.email,
        duration: Date.now() - startTime
      });

      const stripeCountryCode = getCountryCode(form.currentPresenceCountry);

      if (!isCountrySupportedByStripe(stripeCountryCode)) {
        setIsRedirecting(true);
        hasNavigatedRef.current = true;
        trackMetaComplete({ content_name: 'expat_registration', status: 'completed', country: form.currentPresenceCountry, eventID: metaEventId });
        trackAdRegistration({ contentName: 'expat_registration' });
        setMetaPixelUserData({ email: sanitizeEmail(form.email), firstName: sanitizeString(form.firstName), lastName: sanitizeString(form.lastName), country: form.currentPresenceCountry });

        // Attendre 1.5s pour laisser Firebase Auth & Firestore se synchroniser
        setTimeout(() => {
          navigate(redirect, { replace: true, state: { message: intl.formatMessage({ id: 'registerExpat.success.registered' }), type: 'success' } });
        }, 1500);
        return;
      }

      console.log('[ExpatRegisterForm] 💳 CRÉATION COMPTE STRIPE - Début', {
        timestamp: new Date().toISOString(),
        email: userData.email,
        country: stripeCountryCode,
        userType: 'expat'
      });

      try {
        const { httpsCallable } = await import('firebase/functions');
        const { functions } = await import('@/config/firebase');
        const createStripeAccount = httpsCallable(functions, 'createStripeAccount');
        await createStripeAccount({ email: sanitizeEmail(form.email), currentCountry: stripeCountryCode, firstName: sanitizeStringFinal(form.firstName), lastName: sanitizeStringFinal(form.lastName), userType: 'expat' });

        console.log('[ExpatRegisterForm] ✅ STRIPE OK - Compte créé', {
          timestamp: new Date().toISOString(),
          email: userData.email,
          duration: Date.now() - startTime
        });
      } catch (stripeErr) {
        console.error('[ExpatRegisterForm] ❌ STRIPE ERREUR (non bloquant)', {
          timestamp: new Date().toISOString(),
          error: stripeErr,
          errorCode: (stripeErr as any)?.code,
          errorMessage: (stripeErr as Error)?.message,
          email: userData.email
        });
      }

      setIsRedirecting(true);
      hasNavigatedRef.current = true;
      trackMetaComplete({ content_name: 'expat_registration', status: 'completed', country: form.currentPresenceCountry, eventID: metaEventId });
      trackAdRegistration({ contentName: 'expat_registration' });
      setMetaPixelUserData({ email: sanitizeEmail(form.email), firstName: sanitizeString(form.firstName), lastName: sanitizeString(form.lastName), country: form.currentPresenceCountry });

      // Attendre 1.5s pour laisser Firebase Auth & Firestore se synchroniser
      setTimeout(() => {
        navigate(redirect, { replace: true, state: { message: intl.formatMessage({ id: 'registerExpat.success.registered' }), type: 'success' } });
      }, 1500);

    } catch (err: unknown) {
      console.error('[ExpatRegisterForm] ❌ ERREUR INSCRIPTION', {
        timestamp: new Date().toISOString(),
        email: form.email,
        errorType: err?.constructor?.name,
        errorCode: (err as any)?.code,
        errorMessage: (err as Error)?.message,
        errorDetails: (err as any)?.details,
        errorStack: (err as Error)?.stack?.split('\n').slice(0, 10),
        duration: Date.now() - startTime,
        formData: {
          email: form.email,
          firstName: form.firstName,
          lastName: form.lastName,
          currentPresenceCountry: form.currentPresenceCountry,
          hasPhoto: !!form.profilePhoto,
          helpTypesCount: form.helpTypes.length
        },
        network: {
          online: navigator.onLine,
          serviceWorker: !!navigator.serviceWorker?.controller,
          userAgent: navigator.userAgent
        }
      });

      if (!isMountedRef.current || hasNavigatedRef.current) return;
      const msg = getRegistrationErrorMessage(err, intl, 'registerExpat');
      setFieldErrors(prev => ({ ...prev, general: msg }));
      setIsSubmitting(false);
    }
  }, [isSubmitting, validateHuman, selectedLanguages, form, onRegister, referralCode, getStoredReferralTracking, stats, navigate, redirect, intl, trackMetaComplete, trackAdRegistration]);

  const canSubmit = useMemo(() => {
    const parsed = parsePhoneNumberFromString(form.phone);
    return (
      !!form.firstName.trim() && NAME_REGEX.test(form.firstName.trim()) &&
      !!form.lastName.trim() && NAME_REGEX.test(form.lastName.trim()) &&
      EMAIL_REGEX.test(form.email) &&
      form.password.length >= MIN_PASSWORD_LENGTH &&
      form.password.length <= MAX_PASSWORD_LENGTH &&
      !!form.phone && !!parsed?.isValid() &&
      !!form.currentCountry &&
      !!form.currentPresenceCountry &&
      form.interventionCountries.length > 0 &&
      form.bio.trim().length >= MIN_BIO_LENGTH &&
      form.bio.trim().length <= MAX_BIO_LENGTH &&
      !!form.profilePhoto &&
      form.helpTypes.length > 0 &&
      (selectedLanguages as LanguageOption[]).length > 0 &&
      form.yearsAsExpat >= 1 &&
      form.acceptTerms &&
      !isLoading && !isSubmitting
    );
  }, [form, selectedLanguages, isLoading, isSubmitting]);

  const helpDisplayLabel = useCallback((code: string) => {
    const mappedLocale = LANG_TO_HELP_LOCALE[lang] || 'fr';
    return getExpatHelpTypeLabel(code, mappedLocale);
  }, [lang]);

  // Build wizard steps
  const steps = useMemo(() => [
    {
      label: intl.formatMessage({ id: 'registerExpat.step.identity', defaultMessage: 'Identity' }),
      validate: validateStep1,
      content: (
        <div className="space-y-5">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
            <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${theme.iconBg}`}>
              <User className={`w-4 h-4 ${theme.iconText}`} aria-hidden="true" />
            </div>
            <h2 className="text-lg font-bold text-white">
              <FormattedMessage id="registerExpat.section.identity" />
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <DarkInput
                theme={theme}
                id="firstName"
                name="firstName"
                label={intl.formatMessage({ id: 'registerExpat.fields.firstName' })}
                value={form.firstName}
                onChange={onTextChange}
                onBlur={() => markTouched('firstName')}
                autoComplete="given-name"
                placeholder={intl.formatMessage({ id: 'registerExpat.placeholders.firstName' })}
                error={fieldErrors.firstName}
                touched={touched.firstName}
                required
              />
              <FieldError error={fieldErrors.firstName} show={!!(fieldErrors.firstName && touched.firstName)} />
              <FieldSuccess show={!fieldErrors.firstName && !!touched.firstName && !!form.firstName.trim() && NAME_REGEX.test(form.firstName.trim())} message={intl.formatMessage({ id: 'registerExpat.success.fieldValid' })} />
            </div>
            <div>
              <DarkInput
                theme={theme}
                id="lastName"
                name="lastName"
                label={intl.formatMessage({ id: 'registerExpat.fields.lastName' })}
                value={form.lastName}
                onChange={onTextChange}
                onBlur={() => markTouched('lastName')}
                autoComplete="family-name"
                placeholder={intl.formatMessage({ id: 'registerExpat.placeholders.lastName' })}
                error={fieldErrors.lastName}
                touched={touched.lastName}
                required
              />
              <FieldError error={fieldErrors.lastName} show={!!(fieldErrors.lastName && touched.lastName)} />
              <FieldSuccess show={!fieldErrors.lastName && !!touched.lastName && !!form.lastName.trim() && NAME_REGEX.test(form.lastName.trim())} message={intl.formatMessage({ id: 'registerExpat.success.fieldValid' })} />
            </div>
          </div>

          <div>
            <DarkInput
              theme={theme}
              id="email"
              name="email"
              type="email"
              label={intl.formatMessage({ id: 'registerExpat.fields.email' })}
              value={form.email}
              onChange={onTextChange}
              onBlur={onEmailBlur}
              autoComplete="email"
              inputMode="email"
              placeholder={intl.formatMessage({ id: 'registerExpat.placeholders.email' })}
              icon={<Mail className="w-5 h-5" />}
              error={fieldErrors.email}
              touched={touched.email}
              required
            />
            <FieldError error={fieldErrors.email} show={!!(touched.email && fieldErrors.email)} />
            <FieldSuccess show={!!touched.email && !!form.email && EMAIL_REGEX.test(form.email)} message={intl.formatMessage({ id: 'registerExpat.success.emailValid' })} />
          </div>

          <DarkPasswordInput
            theme={theme}
            label={intl.formatMessage({ id: 'registerExpat.fields.password' })}
            value={form.password}
            onChange={(e) => setField('password', e.target.value)}
            onBlur={() => markTouched('password')}
            error={fieldErrors.password}
            touched={touched.password}
            strengthLabelId={intl.formatMessage({ id: 'registerExpat.ui.passwordStrength', defaultMessage: 'Password strength' })}
            showPasswordLabel={intl.formatMessage({ id: 'registerExpat.ui.showPassword', defaultMessage: 'Show password' })}
            hidePasswordLabel={intl.formatMessage({ id: 'registerExpat.ui.hidePassword', defaultMessage: 'Hide password' })}
          />
          <FieldError error={fieldErrors.password} show={!!(fieldErrors.password && touched.password)} />
          <FieldSuccess show={!fieldErrors.password && !!touched.password && form.password.length >= MIN_PASSWORD_LENGTH} message={intl.formatMessage({ id: 'registerExpat.success.pwdOk' })} />

          <DarkPhoneInput
            theme={theme}
            label={intl.formatMessage({ id: 'registerExpat.fields.phone' })}
            value={form.phone}
            onChange={onPhoneChange}
            onBlur={() => markTouched('phone')}
            error={fieldErrors.phone}
            touched={touched.phone}
            locale={lang}
          />
          <FieldError error={fieldErrors.phone} show={!!(touched.phone && fieldErrors.phone)} />
          <FieldSuccess show={!!(touched.phone && !fieldErrors.phone && parsePhoneNumberFromString(form.phone)?.isValid())} message={intl.formatMessage({ id: 'registerExpat.success.fieldValid' })} />
        </div>
      ),
    },
    {
      label: intl.formatMessage({ id: 'registerExpat.step.location', defaultMessage: 'Location' }),
      validate: validateStep2,
      content: (
        <div className="space-y-5">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
            <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${theme.iconBg}`}>
              <Globe className={`w-4 h-4 ${theme.iconText}`} aria-hidden="true" />
            </div>
            <h2 className="text-lg font-bold text-white">
              <FormattedMessage id="registerExpat.section.location" />
            </h2>
          </div>

          <DarkSelect
            theme={theme}
            id="currentCountry"
            label={intl.formatMessage({ id: 'registerExpat.fields.originCountry' })}
            options={countryOptions}
            value={form.currentCountry}
            onChange={(v) => {
              setField('currentCountry', v);
              if (!form.currentPresenceCountry) setForm(prev => ({ ...prev, currentPresenceCountry: v }));
              if (form.interventionCountries.length === 0) setForm(prev => ({ ...prev, interventionCountries: [v] }));
            }}
            onBlur={() => markTouched('currentCountry')}
            placeholder={intl.formatMessage({ id: 'registerExpat.select.selectCountry' })}
            error={fieldErrors.currentCountry}
            touched={touched.currentCountry}
            required
          />
          <FieldError error={fieldErrors.currentCountry} show={!!(fieldErrors.currentCountry && touched.currentCountry)} />

          <DarkSelect
            theme={theme}
            id="currentPresenceCountry"
            label={intl.formatMessage({ id: 'registerExpat.fields.currentPresenceCountry' })}
            options={countryOptions}
            value={form.currentPresenceCountry}
            onChange={(v) => setField('currentPresenceCountry', v)}
            onBlur={() => markTouched('currentPresenceCountry')}
            placeholder={intl.formatMessage({ id: 'registerExpat.select.selectPresenceCountry' })}
            error={fieldErrors.currentPresenceCountry}
            touched={touched.currentPresenceCountry}
            required
          />
          <FieldError error={fieldErrors.currentPresenceCountry} show={!!(fieldErrors.currentPresenceCountry && touched.currentPresenceCountry)} />

          <DarkMultiSelect
            theme={theme}
            id="interventionCountries"
            label={intl.formatMessage({ id: 'registerExpat.fields.interventionCountries' })}
            options={countrySelectOptions}
            value={form.interventionCountries}
            onChange={(vals) => setField('interventionCountries', vals)}
            placeholder={intl.formatMessage({ id: 'registerExpat.select.selectInterventionCountry' })}
            error={fieldErrors.interventionCountries}
            required
          />
          <FieldError error={fieldErrors.interventionCountries} show={!!(fieldErrors.interventionCountries && touched.interventionCountries)} />

          <DarkSelect
            theme={theme}
            id="preferredLanguage"
            label={intl.formatMessage({ id: 'registerExpat.fields.preferredLanguage', defaultMessage: 'Preferred language' })}
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
            onChange={(v) => setField('preferredLanguage', v as ExpatFormData['preferredLanguage'])}
            placeholder="Select..."
            searchable={false}
          />
        </div>
      ),
    },
    {
      label: intl.formatMessage({ id: 'registerExpat.step.services', defaultMessage: 'Services' }),
      validate: validateStep3,
      content: (
        <div className="space-y-5">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
            <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${theme.iconBg}`}>
              <Heart className={`w-4 h-4 ${theme.iconText}`} aria-hidden="true" />
            </div>
            <h2 className="text-lg font-bold text-white">
              <FormattedMessage id="registerExpat.section.skills" />
            </h2>
          </div>

          <DarkMultiSelect
            theme={theme}
            id="helpTypes"
            label={intl.formatMessage({ id: 'registerExpat.fields.helpDomains' })}
            options={helpTypeOptions}
            value={form.helpTypes}
            onChange={(vals) => {
              // Check for AUTRE_PRECISER
              const newVal = vals.find(v => v === 'AUTRE_PRECISER' && !form.helpTypes.includes('AUTRE_PRECISER'));
              if (newVal) {
                setShowCustomHelp(true);
                return;
              }
              setField('helpTypes', vals);
            }}
            placeholder={intl.formatMessage({ id: 'registerExpat.fields.addHelp' })}
            error={fieldErrors.helpTypes}
            required
            getDisplayLabel={helpDisplayLabel}
          />

          {showCustomHelp && (
            <div className="flex gap-2">
              <DarkInput
                theme={theme}
                id="customHelpType"
                label=""
                value={form.customHelpType}
                onChange={(e) => setForm(p => ({ ...p, customHelpType: e.target.value }))}
                placeholder={intl.formatMessage({ id: 'registerExpat.fields.specifyHelp' })}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomHelp(); } }}
                className="flex-1"
              />
              <button
                type="button"
                onClick={addCustomHelp}
                disabled={!form.customHelpType.trim()}
                className={`px-6 py-3 rounded-2xl font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed transition-colors bg-gradient-to-r ${theme.accentGradient}`}
              >
                OK
              </button>
            </div>
          )}
          <FieldError error={fieldErrors.helpTypes} show={!!fieldErrors.helpTypes} />
          <FieldSuccess show={form.helpTypes.length > 0} message={intl.formatMessage({ id: 'registerExpat.success.fieldValid' })} />

          <DarkInput
            theme={theme}
            id="yearsAsExpat"
            name="yearsAsExpat"
            type="number"
            label={intl.formatMessage({ id: 'registerExpat.fields.yearsAsExpat' })}
            value={form.yearsAsExpat || ''}
            onChange={(e) => setField('yearsAsExpat', Number(e.target.value))}
            min={1}
            max={60}
            inputMode="numeric"
            placeholder="5"
            required
          />
          <FieldError error={fieldErrors.yearsAsExpat} show={!!fieldErrors.yearsAsExpat} />
          <FieldSuccess show={form.yearsAsExpat >= 1} message={intl.formatMessage({ id: 'registerExpat.success.fieldValid' })} />
        </div>
      ),
    },
    {
      label: intl.formatMessage({ id: 'registerExpat.step.profile', defaultMessage: 'Profile' }),
      validate: validateStep4,
      content: (
        <div className="space-y-5">
          <DarkTextarea
            theme={theme}
            id="bio"
            name="bio"
            label={intl.formatMessage({ id: 'registerExpat.fields.bio' })}
            value={form.bio}
            onChange={onTextChange}
            onBlur={() => markTouched('bio')}
            error={fieldErrors.bio}
            touched={touched.bio}
            required
            currentLength={form.bio.length}
            minLength={MIN_BIO_LENGTH}
            maxLength={MAX_BIO_LENGTH}
            remainingMessage={intl.formatMessage({ id: 'registerExpat.bio.remaining' }, { count: MIN_BIO_LENGTH - form.bio.trim().length })}
            completeMessage={intl.formatMessage({ id: 'registerExpat.bio.complete' })}
            placeholder={intl.formatMessage({ id: 'registerExpat.placeholders.bio' })}
          />
          <FieldError error={fieldErrors.bio} show={!!(fieldErrors.bio && touched.bio)} />
          <FieldSuccess show={form.bio.trim().length >= MIN_BIO_LENGTH} message={intl.formatMessage({ id: 'registerExpat.success.fieldValid' })} />

          <DarkImageUploader
            theme={theme}
            label={intl.formatMessage({ id: 'registerExpat.fields.profilePhoto' })}
            value={form.profilePhoto}
            onChange={(url) => setField('profilePhoto', url)}
            error={fieldErrors.profilePhoto}
            locale={lang}
            altText={intl.formatMessage({ id: 'registerExpat.ui.profilePhotoAlt', defaultMessage: 'Profile photo' })}
            loadingLabel={intl.formatMessage({ id: 'common.loading', defaultMessage: 'Loading...' })}
          />
          <FieldError error={fieldErrors.profilePhoto} show={!!fieldErrors.profilePhoto} />
          <FieldSuccess show={!!form.profilePhoto} message={intl.formatMessage({ id: 'registerExpat.success.fieldValid' })} />

          <div className="dark-reg-form">
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              <FormattedMessage id="registerExpat.fields.languages" />
              <span className="text-red-400 font-bold text-lg ml-1">*</span>
            <span className="text-xs text-red-400/80 ml-1 font-semibold">(obligatoire)</span>
              <span className="text-xs text-red-400/80 ml-1 font-semibold">(obligatoire)</span>
            </label>
            <Suspense fallback={<div className="h-14 animate-pulse rounded-2xl bg-white/5 border border-white/10" />}>
              <MultiLanguageSelect
                value={selectedLanguages}
                onChange={(v: MultiValue<LanguageOption>) => {
                  setSelectedLanguages(v);
                  clearError('languages');
                }}
                locale={lang}
                placeholder={intl.formatMessage({ id: 'registerExpat.select.searchLanguages' })}
              />
            </Suspense>
            <FieldError error={fieldErrors.languages} show={!!fieldErrors.languages} />
            <FieldSuccess show={(selectedLanguages as LanguageOption[]).length > 0} message={intl.formatMessage({ id: 'registerExpat.success.fieldValid' })} />
          </div>
        </div>
      ),
    },
    {
      label: intl.formatMessage({ id: 'registerExpat.step.validation', defaultMessage: 'Confirm' }),
      validate: validateStep5,
      content: (
        <div className="space-y-5">
          <h2 className="text-lg font-bold text-white mb-4">
            <FormattedMessage id="registerExpat.step.validationTitle" defaultMessage="Finalize your registration" />
          </h2>

          <div className="space-y-2 text-sm text-gray-400">
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-gray-500"><FormattedMessage id="registerExpat.fields.firstName" /></span>
              <span className="text-white font-medium">{form.firstName} {form.lastName}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-gray-500"><FormattedMessage id="registerExpat.fields.email" /></span>
              <span className="text-white font-medium">{form.email}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-gray-500"><FormattedMessage id="registerExpat.fields.currentPresenceCountry" /></span>
              <span className="text-white font-medium">{form.currentPresenceCountry}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-gray-500"><FormattedMessage id="registerExpat.fields.helpDomains" /></span>
              <span className="text-white font-medium">{form.helpTypes.length}</span>
            </div>
          </div>

          <DarkCheckbox
            theme={theme}
            checked={form.acceptTerms}
            onChange={(checked) => { setField('acceptTerms', checked); setTouched(p => ({ ...p, acceptTerms: true })); }}
            error={fieldErrors.acceptTerms}
          >
            <FormattedMessage id="registerExpat.ui.acceptTerms" />{' '}
            <LocaleLink
              to="/cgu-expatries"
              className={`font-bold underline ${theme.linkColor} ${theme.linkHover}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FormattedMessage id="registerExpat.ui.termsLink" />
            </LocaleLink>
            <span className="text-red-400 font-bold text-lg ml-1">*</span>
            <span className="text-xs text-red-400/80 ml-1 font-semibold">(obligatoire)</span>
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
  ], [form, fieldErrors, touched, selectedLanguages, countryOptions, helpTypeOptions, showCustomHelp, intl, lang, onTextChange, markTouched, setField, onPhoneChange, clearError, addCustomHelp, helpDisplayLabel, validateStep1, validateStep2, validateStep3, validateStep4, validateStep5]);

  // Écran de redirection après inscription réussie
  if (isRedirecting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-emerald-900 to-emerald-800 px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-3xl font-bold text-white mb-3">✅ Inscription réussie !</h2>
          <p className="text-lg text-gray-300 mb-2">Votre compte expatrié a été créé avec succès.</p>
          <p className="text-sm text-gray-400">Redirection vers votre tableau de bord...</p>
        </div>
      </div>
    );
  }

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

export default ExpatRegisterForm;
