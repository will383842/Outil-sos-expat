/**
 * ChatterRegisterForm - Registration form for chatters
 * Dark theme harmonized with ChatterLanding (amber/yellow + dark gradients)
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
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
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { phoneCodesData, type PhoneCodeEntry } from '@/data/phone-codes';
import { languagesData, getLanguageLabel, type SupportedLocale } from '@/data/languages-spoken';
import { useAntiBot } from '@/hooks/useAntiBot';

// Get country name based on locale
const getCountryName = (entry: PhoneCodeEntry, locale: string): string => {
  const localeMap: Record<string, keyof PhoneCodeEntry> = {
    fr: 'fr', en: 'en', es: 'es', de: 'de', pt: 'pt', ru: 'ru', zh: 'zh', ch: 'zh', ar: 'ar', hi: 'hi'
  };
  const key = localeMap[locale] || 'en';
  return entry[key] as string || entry.en;
};

// Country flag emoji from country code
const getFlag = (countryCode: string): string => {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

// ============================================================================
// DARK THEME STYLES (matching ChatterLanding)
// ============================================================================
const darkStyles = {
  input: `
    w-full px-4 py-3.5
    bg-white/5 border-2 border-white/10
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
    hover:bg-white/5
    transition-colors duration-150
    cursor-pointer
  `,
  dropdownSearch: 'w-full pl-9 pr-3 py-2.5 text-sm bg-white/5 text-white rounded-xl border-0 focus:ring-2 focus:ring-amber-400/30 placeholder:text-gray-500',
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
  const [languageSearch, setLanguageSearch] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [antiBotError, setAntiBotError] = useState<string | null>(null);

  const { honeypotValue, setHoneypotValue, validateHuman } = useAntiBot();

  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const languageDropdownRef = useRef<HTMLDivElement>(null);

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

  // Filter countries based on search
  const filteredCountries = useMemo(() => {
    if (!countrySearch) return phoneCodesData;
    const search = countrySearch.toLowerCase();
    return phoneCodesData.filter(entry =>
      getCountryName(entry, locale).toLowerCase().includes(search) ||
      entry.code.toLowerCase().includes(search)
    );
  }, [countrySearch, locale]);

  // Filter languages based on search
  const filteredLanguages = useMemo(() => {
    if (!languageSearch) return languagesData.slice(0, 30);
    const search = languageSearch.toLowerCase();
    return languagesData.filter(lang =>
      getLanguageLabel(lang, locale).toLowerCase().includes(search) ||
      lang.nativeName.toLowerCase().includes(search) ||
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

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    onErrorClear?.();
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error display */}
      {(error || antiBotError) && (
        <div className={`flex items-start gap-3 p-4 mb-2 rounded-2xl ${darkMode ? 'bg-red-500/10 border border-red-500/30 text-red-400' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400'}`}>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* First Name */}
        <div className="space-y-1">
          <label htmlFor="firstName" className={s.label}>
            <FormattedMessage id="form.firstName" defaultMessage="First name" />
            <span className={`ml-0.5 ${darkMode ? 'text-amber-400' : 'text-red-500'}`}>*</span>
          </label>
          <div className="relative">
            <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${iconColor} z-10 pointer-events-none`} />
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              placeholder={intl.formatMessage({ id: 'form.firstName.placeholder', defaultMessage: 'Your first name' })}
              className={`${s.input} pl-12 ${validationErrors.firstName ? s.inputError : s.inputDefault} ${formData.firstName ? s.inputFilled : ''}`}
              aria-required="true"
            />
          </div>
          {validationErrors.firstName && (
            <p className={s.errorText}>
              <span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px] flex-shrink-0">!</span>
              {validationErrors.firstName}
            </p>
          )}
        </div>

        {/* Last Name */}
        <div className="space-y-1">
          <label htmlFor="lastName" className={s.label}>
            <FormattedMessage id="form.lastName" defaultMessage="Last name" />
            <span className={`ml-0.5 ${darkMode ? 'text-amber-400' : 'text-red-500'}`}>*</span>
          </label>
          <div className="relative">
            <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${iconColor} z-10 pointer-events-none`} />
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              placeholder={intl.formatMessage({ id: 'form.lastName.placeholder', defaultMessage: 'Your last name' })}
              className={`${s.input} pl-12 ${validationErrors.lastName ? s.inputError : s.inputDefault} ${formData.lastName ? s.inputFilled : ''}`}
              aria-required="true"
            />
          </div>
          {validationErrors.lastName && (
            <p className={s.errorText}>
              <span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px] flex-shrink-0">!</span>
              {validationErrors.lastName}
            </p>
          )}
        </div>
      </div>

      {/* Email */}
      <div className="space-y-1">
        <label htmlFor="email" className={s.label}>
          <FormattedMessage id="form.email" defaultMessage="Email" />
          <span className={`ml-0.5 ${darkMode ? 'text-amber-400' : 'text-red-500'}`}>*</span>
        </label>
        <div className="relative">
          <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${iconColor} z-10 pointer-events-none`} />
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder={intl.formatMessage({ id: 'form.email.placeholder', defaultMessage: 'your@email.com' })}
            autoComplete="email"
            className={`${s.input} pl-12 ${validationErrors.email ? s.inputError : s.inputDefault} ${formData.email ? s.inputFilled : ''}`}
            aria-required="true"
          />
        </div>
        {validationErrors.email && (
          <p className={s.errorText}>
            <span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px] flex-shrink-0">!</span>
            {validationErrors.email}
          </p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-2">
        <label htmlFor="password" className={s.label}>
          <FormattedMessage id="form.password" defaultMessage="Password" />
          <span className={`ml-0.5 ${darkMode ? 'text-amber-400' : 'text-red-500'}`}>*</span>
        </label>
        <div className="relative">
          <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${iconColor} z-10 pointer-events-none`} />
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={handleChange}
            placeholder={intl.formatMessage({ id: 'form.password.placeholder', defaultMessage: 'Minimum 8 characters' })}
            autoComplete="new-password"
            className={`${s.input} pl-12 pr-12 ${validationErrors.password ? s.inputError : s.inputDefault}`}
            aria-required="true"
            aria-invalid={!!validationErrors.password}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors z-10 ${darkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
            aria-label={showPassword
              ? intl.formatMessage({ id: 'form.password.hide', defaultMessage: 'Hide password' })
              : intl.formatMessage({ id: 'form.password.show', defaultMessage: 'Show password' })
            }
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        {/* Password strength indicator */}
        {formData.password.length > 0 && (
          <div className="mt-2">
            <div className={`h-1.5 rounded-full overflow-hidden ${darkMode ? 'bg-white/10' : 'bg-gray-200 dark:bg-gray-700'}`}>
              <div
                className={`h-full transition-all duration-300 ${
                  formData.password.length < 6
                    ? 'w-1/4 bg-red-500'
                    : formData.password.length < 8
                    ? 'w-1/2 bg-orange-500'
                    : formData.password.length < 10
                    ? 'w-3/4 bg-yellow-500'
                    : 'w-full bg-green-500'
                }`}
              />
            </div>
            <p className={`text-xs mt-1 ${
              formData.password.length < 6
                ? 'text-red-400'
                : formData.password.length < 8
                ? 'text-orange-400'
                : formData.password.length < 10
                ? 'text-yellow-400'
                : 'text-green-400'
            }`}>
              {formData.password.length < 6 ? (
                <FormattedMessage id="form.password.strength.weak" defaultMessage="Too short (min. 6 characters)" />
              ) : formData.password.length < 8 ? (
                <FormattedMessage id="form.password.strength.fair" defaultMessage="Fair" />
              ) : formData.password.length < 10 ? (
                <FormattedMessage id="form.password.strength.good" defaultMessage="Good" />
              ) : (
                <FormattedMessage id="form.password.strength.strong" defaultMessage="Strong" />
              )}
            </p>
          </div>
        )}

        {validationErrors.password && (
          <p className={s.errorText}>
            <span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px] flex-shrink-0">!</span>
            {validationErrors.password}
          </p>
        )}
      </div>

      {/* Country */}
      <div ref={countryDropdownRef} className="space-y-2">
        <label className={s.label}>
          <FormattedMessage id="form.country" defaultMessage="Country of residence" />
          <span className={`ml-0.5 ${darkMode ? 'text-amber-400' : 'text-red-500'}`}>*</span>
        </label>
        <div className="relative">
          <Globe className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${iconColor} z-10`} />
          <button
            type="button"
            onClick={() => setShowCountryDropdown(!showCountryDropdown)}
            className={`${s.input} pl-12 pr-10 text-left flex items-center justify-between ${validationErrors.country ? s.inputError : s.inputDefault}`}
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
            <div className={s.dropdown}>
              <div className={`p-2 border-b ${darkMode ? 'border-white/10' : 'border-gray-200 dark:border-gray-700'}`}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    placeholder={intl.formatMessage({ id: 'form.search.country', defaultMessage: 'Search country...' })}
                    className={s.dropdownSearch}
                    autoFocus
                  />
                </div>
              </div>
              <div className="max-h-[280px] overflow-y-auto overscroll-contain">
                {filteredCountries.map((entry) => (
                  <button
                    key={entry.code}
                    type="button"
                    onClick={() => selectCountry(entry)}
                    className={`${s.dropdownItem} ${entry.code === formData.country ? selectedBg : ''}`}
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
          <p className={s.errorText}>
            <span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px] flex-shrink-0">!</span>
            {validationErrors.country}
          </p>
        )}
      </div>

      {/* Primary Language */}
      <div ref={languageDropdownRef} className="space-y-2">
        <label className={s.label}>
          <FormattedMessage id="form.primaryLanguage" defaultMessage="Primary language" />
          <span className={`ml-0.5 ${darkMode ? 'text-amber-400' : 'text-red-500'}`}>*</span>
        </label>
        <div className="relative">
          <Languages className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${iconColor} z-10 pointer-events-none`} />
          <button
            type="button"
            onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
            className={`${s.input} pl-12 pr-10 text-left flex items-center justify-between ${validationErrors.language ? s.inputError : s.inputDefault}`}
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
            <div className={s.dropdown}>
              <div className={`p-2 border-b ${darkMode ? 'border-white/10' : 'border-gray-200 dark:border-gray-700'}`}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={languageSearch}
                    onChange={(e) => setLanguageSearch(e.target.value)}
                    placeholder={intl.formatMessage({ id: 'form.search.language', defaultMessage: 'Search language...' })}
                    className={s.dropdownSearch}
                    autoFocus
                  />
                </div>
              </div>
              <div className="max-h-[280px] overflow-y-auto overscroll-contain">
                {filteredLanguages.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => {
                      handleLanguageChange(lang.code);
                      setShowLanguageDropdown(false);
                      setLanguageSearch('');
                    }}
                    className={`${s.dropdownItem} ${lang.code === formData.language ? selectedBg : ''}`}
                  >
                    <span className="flex-1 text-sm">{getLanguageLabel(lang, locale)}</span>
                    <span className="text-xs text-gray-500">{lang.nativeName}</span>
                    {lang.code === formData.language && <Check className={`w-4 h-4 ${checkColor}`} />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {validationErrors.language && (
          <p className={s.errorText}>
            <span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px] flex-shrink-0">!</span>
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
                      ? 'border-white/20 bg-white/5'
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
                    className={`underline underline-offset-2 font-medium ${darkMode ? 'text-amber-400 hover:text-amber-300' : 'text-red-500 hover:text-red-600'}`}
                  >
                    <FormattedMessage id="form.termsOfService" defaultMessage="Terms of Service" />
                  </Link>
                ),
                privacyLink: (
                  <Link
                    to="/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`underline underline-offset-2 font-medium ${darkMode ? 'text-amber-400 hover:text-amber-300' : 'text-red-500 hover:text-red-600'}`}
                  >
                    <FormattedMessage id="form.privacyPolicy" defaultMessage="Privacy Policy" />
                  </Link>
                ),
              }}
            />
            <span className={`ml-0.5 ${darkMode ? 'text-amber-400' : 'text-red-500'}`}>*</span>
          </span>
        </label>
        {validationErrors.acceptTerms && (
          <p className={s.errorText}>
            <span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px] flex-shrink-0">!</span>
            {validationErrors.acceptTerms}
          </p>
        )}
      </div>

      {/* Submit Button - Amber/Yellow gradient matching landing CTA */}
      <button
        type="submit"
        disabled={loading || !formData.acceptTerms}
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
