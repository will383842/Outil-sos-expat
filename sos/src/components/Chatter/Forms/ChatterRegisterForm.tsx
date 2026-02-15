/**
 * ChatterRegisterForm - Registration form for chatters
 * Dark theme harmonized with ChatterLanding (amber/yellow + dark gradients)
 *
 * 2026 Best Practices:
 * - Full ARIA accessibility (aria-describedby, aria-live, listbox pattern)
 * - Inline validation on blur
 * - Advanced password strength (length + complexity)
 * - Keyboard navigation in dropdowns
 * - Mobile-optimized inputs (inputmode, enterkeyhint)
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  User,
  Mail,
  Globe,
  Languages,
  ChevronDown,
  Search,
  Check,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { phoneCodesData, type PhoneCodeEntry } from '@/data/phone-codes';
import { languagesData, getLanguageLabel, type SupportedLocale } from '@/data/languages-spoken';
import { useAntiBot } from '@/hooks/useAntiBot';
import { getCountryNameFromEntry as getCountryName, getFlag } from '@/utils/phoneCodeHelpers';

// ============================================================================
// PASSWORD STRENGTH UTILITY (2026 best practice: complexity check)
// ============================================================================
interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4; // 0=very weak, 1=weak, 2=fair, 3=good, 4=strong
  label: string;
  color: string;
  width: string;
  feedback: string[];
}

const evaluatePasswordStrength = (password: string, intl: ReturnType<typeof useIntl>): PasswordStrength => {
  const feedback: string[] = [];
  let score = 0;

  // Length checks
  if (password.length >= 8) score++;
  else feedback.push(intl.formatMessage({ id: 'form.password.feedback.minLength', defaultMessage: 'At least 8 characters' }));

  if (password.length >= 12) score++;

  // Complexity checks
  if (/[A-Z]/.test(password)) score++;
  else feedback.push(intl.formatMessage({ id: 'form.password.feedback.uppercase', defaultMessage: 'Add an uppercase letter' }));

  if (/[0-9]/.test(password)) score++;
  else feedback.push(intl.formatMessage({ id: 'form.password.feedback.number', defaultMessage: 'Add a number' }));

  if (/[^A-Za-z0-9]/.test(password)) score++;
  else feedback.push(intl.formatMessage({ id: 'form.password.feedback.special', defaultMessage: 'Add a special character' }));

  // Normalize score to 0-4
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
    feedback: feedback.slice(0, 2), // Show max 2 feedback items
  };
};

// ============================================================================
// DARK THEME STYLES (matching ChatterLanding)
// ============================================================================
const darkStyles = {
  input: `
    w-full px-4 py-3.5
    bg-white/10 border-2 border-white/10
    rounded-2xl
    text-base text-white
    placeholder:text-gray-500
    focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:ring-offset-0
    focus:border-amber-400/50 focus:bg-white/10
    transition-all duration-200 ease-out
    disabled:opacity-50 disabled:cursor-not-allowed
  `,
  inputError: 'border-red-500/60 focus:ring-red-500/30 bg-red-500/10',
  inputDefault: '',
  inputFilled: 'bg-white/8 border-white/20',
  label: 'block text-sm font-semibold text-gray-300 mb-2',
  errorText: 'mt-1.5 text-xs text-red-400 flex items-center gap-1',
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
  dropdownSearch: 'w-full pl-9 pr-3 py-2.5 text-sm bg-white/10 text-white rounded-xl border-0 focus:ring-2 focus:ring-amber-400/30 placeholder:text-gray-500',
};

export interface ChatterRegistrationData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  country: string;
  interventionCountries?: string[];
  language: string;
  additionalLanguages?: string[];
  referralCode?: string;
  acceptTerms: boolean;
  termsAcceptedAt?: string;
  termsVersion?: string;
  termsType?: string;
  termsAcceptanceMeta?: {
    userAgent: string;
    language: string;
    timestamp: number;
    acceptanceMethod: string;
    ipAddress?: string;
  };
  _securityMeta?: {
    formFillTime: number;
    mouseMovements: number;
    keystrokes: number;
    userAgent: string;
    timestamp: number;
    recaptchaToken?: string | null;
  };
}

interface ChatterRegisterFormProps {
  onSubmit: (data: ChatterRegistrationData) => Promise<void>;
  initialData?: Partial<ChatterRegistrationData>;
  loading?: boolean;
  error?: string | null;
  success?: boolean;
  onErrorClear?: () => void;
  darkMode?: boolean;
}

const ChatterRegisterForm: React.FC<ChatterRegisterFormProps> = ({
  onSubmit,
  initialData,
  loading = false,
  error,
  success = false,
  onErrorClear,
  darkMode = false,
}) => {
  const intl = useIntl();
  const { language } = useApp();
  const locale = (language || 'en') as SupportedLocale;

  const [formData, setFormData] = useState<ChatterRegistrationData>({
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    email: initialData?.email || '',
    password: '',
    country: initialData?.country || '',
    language: initialData?.language || locale,
    referralCode: initialData?.referralCode,
    acceptTerms: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set()); // Track touched fields for inline validation
  const [languageSearch, setLanguageSearch] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [antiBotError, setAntiBotError] = useState<string | null>(null);
  const [focusedDropdownIndex, setFocusedDropdownIndex] = useState(-1); // Keyboard navigation

  const { honeypotValue, setHoneypotValue, validateHuman } = useAntiBot();

  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const languageDropdownRef = useRef<HTMLDivElement>(null);
  const countryListRef = useRef<HTMLDivElement>(null);
  const languageListRef = useRef<HTMLDivElement>(null);
  const errorAnnouncerRef = useRef<HTMLDivElement>(null); // ARIA live region

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target as Node)) {
        setShowCountryDropdown(false);
        setCountrySearch('');
      }
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(e.target as Node)) {
        setShowLanguageDropdown(false);
        setLanguageSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Filter languages based on search (accent-insensitive)
  const filteredLanguages = useMemo(() => {
    if (!languageSearch) return languagesData.slice(0, 30);
    const strip = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const search = strip(languageSearch);
    return languagesData.filter(lang =>
      strip(getLanguageLabel(lang, locale)).includes(search) ||
      strip(lang.nativeName).includes(search) ||
      lang.code.toLowerCase().includes(search)
    );
  }, [languageSearch, locale]);

  // Get selected country entry
  const selectedCountryEntry = useMemo(() =>
    phoneCodesData.find(e => e.code === formData.country),
    [formData.country]
  );

  // Styles helper
  const s = darkMode ? darkStyles : {
    input: `w-full px-4 py-3.5 bg-gray-100 dark:bg-gray-800/70 border-2 border-gray-200 dark:border-gray-600/50 rounded-2xl text-base text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-transparent focus:bg-white dark:focus:bg-gray-900 transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed`,
    inputError: 'border-red-400 dark:border-red-500 focus:ring-red-500/30 bg-red-50 dark:bg-red-900/20',
    inputDefault: 'focus:ring-blue-500/30 dark:focus:ring-blue-400/30',
    inputFilled: '',
    label: 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2',
    errorText: 'mt-1.5 text-xs text-red-500 dark:text-red-400 flex items-center gap-1',
    dropdown: 'absolute z-50 mt-2 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl shadow-black/10 dark:shadow-black/30 overflow-hidden',
    dropdownItem: 'w-full px-4 py-3 flex items-center gap-3 text-left text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150 cursor-pointer',
    dropdownSearch: 'w-full pl-9 pr-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 rounded-xl border-0 focus:ring-2 focus:ring-red-500/30',
  };

  // ============================================================================
  // INLINE VALIDATION (2026 best practice: validate on blur)
  // ============================================================================
  const validateField = useCallback((name: string, value: string): string | null => {
    switch (name) {
      case 'firstName':
      case 'lastName':
        if (!value.trim()) {
          return intl.formatMessage({ id: 'form.error.required', defaultMessage: 'This field is required' });
        }
        if (value.trim().length < 2) {
          return intl.formatMessage({ id: 'form.error.tooShort', defaultMessage: 'Must be at least 2 characters' });
        }
        return null;
      case 'email':
        if (!value.trim()) {
          return intl.formatMessage({ id: 'form.error.required', defaultMessage: 'This field is required' });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return intl.formatMessage({ id: 'form.error.emailInvalid', defaultMessage: 'Please enter a valid email' });
        }
        return null;
      case 'password':
        if (!value) {
          return intl.formatMessage({ id: 'form.error.required', defaultMessage: 'This field is required' });
        }
        if (value.length < 8) {
          return intl.formatMessage({ id: 'form.error.passwordTooShort', defaultMessage: 'Password must be at least 8 characters' });
        }
        return null;
      default:
        return null;
    }
  }, [intl]);

  // Handle blur for inline validation
  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouchedFields(prev => new Set(prev).add(name));

    const error = validateField(name, value);
    if (error) {
      setValidationErrors(prev => ({ ...prev, [name]: error }));
    } else {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  }, [validateField]);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    onErrorClear?.();

    // If field was touched, revalidate on change for immediate feedback
    if (touchedFields.has(name)) {
      const error = validateField(name, value);
      if (error) {
        setValidationErrors(prev => ({ ...prev, [name]: error }));
      } else {
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
    }
  };

  // Select country
  const selectCountry = (entry: PhoneCodeEntry) => {
    setFormData(prev => ({
      ...prev,
      country: entry.code,
    }));
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

  // Handle primary language change
  const handleLanguageChange = (langCode: string) => {
    setFormData(prev => ({ ...prev, language: langCode }));
    if (validationErrors.language) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.language;
        return newErrors;
      });
    }
  };

  // ============================================================================
  // KEYBOARD NAVIGATION (2026 best practice: full keyboard support)
  // ============================================================================
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

  // Scroll focused item into view
  useEffect(() => {
    if (showCountryDropdown && focusedDropdownIndex >= 0 && countryListRef.current) {
      const items = countryListRef.current.querySelectorAll('[role="option"]');
      items[focusedDropdownIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedDropdownIndex, showCountryDropdown]);

  useEffect(() => {
    if (showLanguageDropdown && focusedDropdownIndex >= 0 && languageListRef.current) {
      const items = languageListRef.current.querySelectorAll('[role="option"]');
      items[focusedDropdownIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedDropdownIndex, showLanguageDropdown]);

  // Reset focused index when dropdown opens/closes
  useEffect(() => {
    setFocusedDropdownIndex(-1);
  }, [showCountryDropdown, showLanguageDropdown]);

  // Password strength calculation
  const passwordStrength = useMemo(
    () => formData.password ? evaluatePasswordStrength(formData.password, intl) : null,
    [formData.password, intl]
  );

  // Handle terms checkbox change
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

  // Validate form
  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      errors.firstName = intl.formatMessage({ id: 'form.error.required', defaultMessage: 'This field is required' });
    }
    if (!formData.lastName.trim()) {
      errors.lastName = intl.formatMessage({ id: 'form.error.required', defaultMessage: 'This field is required' });
    }
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
    if (!formData.country) {
      errors.country = intl.formatMessage({ id: 'form.error.required', defaultMessage: 'This field is required' });
    }
    if (!formData.language) {
      errors.language = intl.formatMessage({ id: 'form.error.required', defaultMessage: 'This field is required' });
    }
    if (!formData.acceptTerms) {
      errors.acceptTerms = intl.formatMessage({ id: 'form.error.acceptTermsRequired', defaultMessage: 'You must accept the terms and conditions' });
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAntiBotError(null);
    if (!validate()) return;

    const botCheck = await validateHuman('chatter_register');
    if (!botCheck.isValid) {
      setAntiBotError(botCheck.reason || 'Validation failed. Please try again.');
      return;
    }

    const dataWithTerms: ChatterRegistrationData = {
      ...formData,
      termsAcceptedAt: new Date().toISOString(),
      termsVersion: "3.0",
      termsType: "terms_chatters",
      termsAcceptanceMeta: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        timestamp: Date.now(),
        acceptanceMethod: "checkbox_click",
      },
      _securityMeta: botCheck.securityMeta,
    };

    await onSubmit(dataWithTerms);
  };

  // Success state
  if (success) {
    return (
      <div className={darkMode ? 'text-center py-12' : ''}>
        <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center shadow-lg ${darkMode ? 'bg-green-500/20 border border-green-500/30 shadow-green-500/20' : 'bg-gradient-to-br from-green-400 to-green-500 shadow-green-500/30'}`}>
          <Check className={`w-10 h-10 ${darkMode ? 'text-green-400' : 'text-white'}`} />
        </div>
        <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
          <FormattedMessage id="chatter.register.success.title" defaultMessage="Registration successful!" />
        </h2>
        <p className={darkMode ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'}>
          <FormattedMessage id="chatter.register.success.message" defaultMessage="Redirecting to your quiz..." />
        </p>
      </div>
    );
  }

  // Icon color
  const iconColor = darkMode ? 'text-gray-500' : 'text-gray-400';
  const accentColor = darkMode ? 'text-amber-400' : 'text-red-500';
  const selectedBg = darkMode ? 'bg-amber-500/10' : 'bg-red-50 dark:bg-red-900/20';
  const checkColor = darkMode ? 'text-amber-400' : 'text-red-500';

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* ARIA Live Region for error announcements (2026 a11y) */}
      <div
        ref={errorAnnouncerRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {Object.keys(validationErrors).length > 0 && (
          intl.formatMessage(
            { id: 'form.errors.count', defaultMessage: '{count} errors in form' },
            { count: Object.keys(validationErrors).length }
          )
        )}
      </div>

      {/* Error display */}
      {(error || antiBotError) && (
        <div
          role="alert"
          className={`flex items-start gap-3 p-4 mb-2 rounded-2xl ${darkMode ? 'bg-red-500/10 border border-red-500/30 text-red-400' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400'}`}
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span className="text-sm">{error || antiBotError}</span>
        </div>
      )}

      {/* Honeypot */}
      <input
        type="text"
        name="website"
        value={honeypotValue}
        onChange={(e) => setHoneypotValue(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        style={{ position: 'absolute', left: '-9999px', opacity: 0 }}
        aria-hidden="true"
      />

      {/* Name Fields */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* First Name */}
        <div className="space-y-1">
          <label htmlFor="firstName" className={s.label}>
            <FormattedMessage id="form.firstName" defaultMessage="First name" />
            <span className={`font-bold text-lg ml-0.5 ${darkMode ? 'text-amber-400' : 'text-red-500'}`}>*</span>
          </label>
          <div className="relative">
            <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${iconColor} z-10 pointer-events-none`} />
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
              aria-describedby={validationErrors.firstName ? 'firstName-error' : undefined}
              autoComplete="given-name"
              enterKeyHint="next"
            />
          </div>
          {validationErrors.firstName && (
            <p id="firstName-error" className={s.errorText} role="alert">
              <span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white">!</span>
              {validationErrors.firstName}
            </p>
          )}
        </div>

        {/* Last Name */}
        <div className="space-y-1">
          <label htmlFor="lastName" className={s.label}>
            <FormattedMessage id="form.lastName" defaultMessage="Last name" />
            <span className={`font-bold text-lg ml-0.5 ${darkMode ? 'text-amber-400' : 'text-red-500'}`}>*</span>
          </label>
          <div className="relative">
            <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${iconColor} z-10 pointer-events-none`} />
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
              aria-describedby={validationErrors.lastName ? 'lastName-error' : undefined}
              autoComplete="family-name"
              enterKeyHint="next"
            />
          </div>
          {validationErrors.lastName && (
            <p id="lastName-error" className={s.errorText} role="alert">
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
          <span className={`font-bold text-lg ml-0.5 ${darkMode ? 'text-amber-400' : 'text-red-500'}`}>*</span>
        </label>
        <div className="relative">
          <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${iconColor} z-10 pointer-events-none`} />
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
            aria-describedby={validationErrors.email ? 'email-error' : undefined}
          />
        </div>
        {validationErrors.email && (
          <p id="email-error" className={s.errorText} role="alert">
            <span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white">!</span>
            {validationErrors.email}
          </p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-2">
        <label htmlFor="password" className={s.label}>
          <FormattedMessage id="form.password" defaultMessage="Password" />
          <span className={`font-bold text-lg ml-0.5 ${darkMode ? 'text-amber-400' : 'text-red-500'}`}>*</span>
        </label>
        <div className="relative">
          <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${iconColor} z-10 pointer-events-none`} />
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
            className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors z-10 p-1 rounded-lg ${darkMode ? 'text-gray-500 hover:text-gray-300 hover:bg-white/10' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            aria-label={showPassword
              ? intl.formatMessage({ id: 'form.password.hide', defaultMessage: 'Hide password' })
              : intl.formatMessage({ id: 'form.password.show', defaultMessage: 'Show password' })
            }
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        {/* Password strength indicator (2026 best practice: complexity-based) */}
        {passwordStrength && (
          <div id="password-strength" className="mt-2 space-y-2">
            <div className={`h-1.5 rounded-full overflow-hidden ${darkMode ? 'bg-white/10' : 'bg-gray-200 dark:bg-gray-700'}`}>
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
                <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
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

      {/* Country */}
      <div ref={countryDropdownRef} className="space-y-2">
        <label id="country-label" className={s.label}>
          <FormattedMessage id="form.country" defaultMessage="Country of residence" />
          <span className={`font-bold text-lg ml-0.5 ${darkMode ? 'text-amber-400' : 'text-red-500'}`}>*</span>
        </label>
        <div className="relative">
          <Globe className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${iconColor} z-10`} />
          <button
            type="button"
            id="country-button"
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
            aria-describedby={validationErrors.country ? 'country-error' : undefined}
          >
            <span className={selectedCountryEntry ? '' : 'text-gray-500'}>
              {selectedCountryEntry ? (
                <span className="flex items-center gap-2">
                  <span className="text-lg">{getFlag(selectedCountryEntry.code)}</span>
                  <span className={darkMode ? 'text-white' : ''}>{getCountryName(selectedCountryEntry, locale)}</span>
                </span>
              ) : (
                intl.formatMessage({ id: 'form.country.placeholder', defaultMessage: 'Select your country' })
              )}
            </span>
            <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${showCountryDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showCountryDropdown && (
            <div className={s.dropdown} role="listbox" aria-labelledby="country-label">
              <div className={`p-2 border-b ${darkMode ? 'border-white/10' : 'border-gray-200 dark:border-gray-700'}`}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
                    aria-label={intl.formatMessage({ id: 'form.search.country', defaultMessage: 'Search country...' })}
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
                    className={`${s.dropdownItem} ${entry.code === formData.country ? selectedBg : ''} ${idx === focusedDropdownIndex ? (darkMode ? 'bg-white/10' : 'bg-gray-100') : ''}`}
                  >
                    <span className="text-xl">{getFlag(entry.code)}</span>
                    <span className="flex-1 text-sm">{getCountryName(entry, locale)}</span>
                    {entry.code === formData.country && (
                      <Check className={`w-4 h-4 ${checkColor}`} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {validationErrors.country && (
          <p id="country-error" className={s.errorText} role="alert">
            <span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white">!</span>
            {validationErrors.country}
          </p>
        )}
      </div>

      {/* Primary Language */}
      <div ref={languageDropdownRef} className="space-y-2">
        <label id="language-label" className={s.label}>
          <FormattedMessage id="form.primaryLanguage" defaultMessage="Primary language" />
          <span className={`font-bold text-lg ml-0.5 ${darkMode ? 'text-amber-400' : 'text-red-500'}`}>*</span>
        </label>
        <div className="relative">
          <Languages className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${iconColor} z-10 pointer-events-none`} />
          <button
            type="button"
            id="language-button"
            onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
            onKeyDown={(e) => showLanguageDropdown && handleDropdownKeyDown(
              e,
              filteredLanguages,
              (code) => {
                handleLanguageChange(code);
                setShowLanguageDropdown(false);
                setLanguageSearch('');
              },
              () => setShowLanguageDropdown(false)
            )}
            className={`${s.input} pl-12 pr-10 text-left flex items-center justify-between ${validationErrors.language ? s.inputError : s.inputDefault}`}
            aria-haspopup="listbox"
            aria-expanded={showLanguageDropdown}
            aria-labelledby="language-label"
            aria-describedby={validationErrors.language ? 'language-error' : undefined}
          >
            <span className={formData.language ? (darkMode ? 'text-white' : '') : 'text-gray-500'}>
              {formData.language ? (
                getLanguageLabel(languagesData.find(l => l.code === formData.language) || { code: formData.language, name: formData.language, nativeName: formData.language, labels: {} }, locale)
              ) : (
                intl.formatMessage({ id: 'form.language.placeholder', defaultMessage: 'Select your primary language' })
              )}
            </span>
            <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${showLanguageDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showLanguageDropdown && (
            <div className={s.dropdown} role="listbox" aria-labelledby="language-label">
              <div className={`p-2 border-b ${darkMode ? 'border-white/10' : 'border-gray-200 dark:border-gray-700'}`}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={languageSearch}
                    onChange={(e) => setLanguageSearch(e.target.value)}
                    onKeyDown={(e) => handleDropdownKeyDown(
                      e,
                      filteredLanguages,
                      (code) => {
                        handleLanguageChange(code);
                        setShowLanguageDropdown(false);
                        setLanguageSearch('');
                      },
                      () => setShowLanguageDropdown(false)
                    )}
                    placeholder={intl.formatMessage({ id: 'form.search.language', defaultMessage: 'Search language...' })}
                    className={s.dropdownSearch}
                    autoFocus
                    aria-label={intl.formatMessage({ id: 'form.search.language', defaultMessage: 'Search language...' })}
                  />
                </div>
              </div>
              <div ref={languageListRef} className="max-h-[280px] overflow-y-auto overscroll-contain">
                {filteredLanguages.map((lang, idx) => (
                  <button
                    key={lang.code}
                    type="button"
                    role="option"
                    aria-selected={lang.code === formData.language}
                    onClick={() => {
                      handleLanguageChange(lang.code);
                      setShowLanguageDropdown(false);
                      setLanguageSearch('');
                    }}
                    className={`${s.dropdownItem} ${lang.code === formData.language ? selectedBg : ''} ${idx === focusedDropdownIndex ? (darkMode ? 'bg-white/10' : 'bg-gray-100') : ''}`}
                  >
                    <span className="flex-1 text-sm">{getLanguageLabel(lang, locale)}</span>
                    <span className="text-xs">{lang.nativeName}</span>
                    {lang.code === formData.language && <Check className={`w-4 h-4 ${checkColor}`} />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {validationErrors.language && (
          <p id="language-error" className={s.errorText} role="alert">
            <span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white">!</span>
            {validationErrors.language}
          </p>
        )}
      </div>

      {/* Terms & Conditions */}
      <div className="space-y-2">
        <label className="flex items-start gap-3 cursor-pointer select-none group">
          <div className="relative mt-0.5">
            <input
              type="checkbox"
              id="acceptTerms"
              checked={formData.acceptTerms}
              onChange={handleTermsChange}
              className={`
                h-5 w-5 rounded border-2
                ${validationErrors.acceptTerms
                  ? 'border-red-500 bg-red-500/10'
                  : formData.acceptTerms
                    ? darkMode
                      ? 'border-amber-400 bg-amber-400 text-black'
                      : 'border-green-500 bg-green-500 text-white'
                    : darkMode
                      ? 'border-white/20 bg-white/10'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                }
                focus:ring-2 ${darkMode ? 'focus:ring-amber-400/30' : 'focus:ring-red-500/30'} focus:ring-offset-0
                transition-all duration-200 cursor-pointer
              `}
              aria-required="true"
              aria-invalid={!!validationErrors.acceptTerms}
            />
          </div>
          <span className={`text-sm leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
            <FormattedMessage
              id="chatter.register.acceptTerms"
              defaultMessage="I accept the {termsLink} and the {privacyLink}"
              values={{
                termsLink: (
                  <Link
                    to="/cgu-chatters"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`underline font-medium${darkMode ? 'text-amber-400 hover:text-amber-300' : 'text-red-500 hover:text-red-600'}`}
                  >
                    <FormattedMessage id="form.termsOfService" defaultMessage="Terms of Service" />
                  </Link>
                ),
                privacyLink: (
                  <Link
                    to="/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`underline font-medium${darkMode ? 'text-amber-400 hover:text-amber-300' : 'text-red-500 hover:text-red-600'}`}
                  >
                    <FormattedMessage id="form.privacyPolicy" defaultMessage="Privacy Policy" />
                  </Link>
                ),
              }}
            />
            <span className={`font-bold text-lg ml-0.5 ${darkMode ? 'text-amber-400' : 'text-red-500'}`}>*</span>
          </span>
        </label>
        {validationErrors.acceptTerms && (
          <p id="terms-error" className={s.errorText} role="alert">
            <span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white">!</span>
            {validationErrors.acceptTerms}
          </p>
        )}
      </div>

      {/* Submit Button - Amber/Yellow gradient matching landing CTA */}
      <button
        type="submit"
        disabled={loading || !formData.acceptTerms}
        aria-busy={loading}
        className={`
          w-full py-4 px-6 font-extrabold rounded-2xl
          flex items-center justify-center gap-2
          transition-all duration-200 ease-out
          disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none
          ${darkMode
            ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-black shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:from-amber-300 hover:to-yellow-300 active:scale-[0.98]'
            : 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30 transform hover:-translate-y-0.5 active:translate-y-0'
          }
        `}
      >
        {loading ? (
          <>
            <div className={`w-5 h-5 border-2 rounded-full animate-spin ${darkMode ? 'border-black/30 border-t-black' : 'border-white/30 border-t-white'}`} />
            <FormattedMessage id="form.submitting" defaultMessage="Processing..." />
          </>
        ) : (
          <FormattedMessage id="chatter.register.submit" defaultMessage="Sign up as a Chatter" />
        )}
      </button>
    </form>
  );
};

export default ChatterRegisterForm;
