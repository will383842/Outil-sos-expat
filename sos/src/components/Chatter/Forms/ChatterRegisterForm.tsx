/**
 * ChatterRegisterForm - Mobile-first registration form for chatters
 * Harmonized 2026 UX - NO phone required at registration
 * Phone will be collected after quiz for WhatsApp community
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
import {
  FormInput,
  FormSection,
  FormError,
  FormSuccess,
  FormButton,
  formStyles,
} from '@/components/forms/FormElements';
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

export interface ChatterRegistrationData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;                // Password for Firebase Auth account
  country: string;
  interventionCountries?: string[]; // Countries where chatter can operate
  language: string;                // Primary language
  additionalLanguages?: string[];  // Additional languages spoken
  referralCode?: string;           // Auto from URL only - never manual input
  // ✅ TRACKING CGU - Preuve légale d'acceptation des conditions
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
  // Security metadata for anti-bot validation
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
  onErrorClear?: () => void; // Called when user modifies form to clear parent error
}

const ChatterRegisterForm: React.FC<ChatterRegisterFormProps> = ({
  onSubmit,
  initialData,
  loading = false,
  error,
  success = false,
  onErrorClear,
}) => {
  const intl = useIntl();
  const { language } = useApp();
  const locale = (language || 'en') as SupportedLocale;

  // Referral code comes ONLY from URL (via initialData), never from manual input
  const [formData, setFormData] = useState<ChatterRegistrationData>({
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    email: initialData?.email || '',
    password: '',
    country: initialData?.country || '',
    language: initialData?.language || locale,
    referralCode: initialData?.referralCode, // Auto from URL only
    acceptTerms: false,
  });

  // Password visibility toggle
  const [showPassword, setShowPassword] = useState(false);

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [languageSearch, setLanguageSearch] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [antiBotError, setAntiBotError] = useState<string | null>(null);

  // Anti-bot protection
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

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear parent error when user modifies any field
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

    // Password validation - minimum 6 characters (Firebase requirement)
    if (!formData.password) {
      errors.password = intl.formatMessage({ id: 'form.error.required', defaultMessage: 'This field is required' });
    } else if (formData.password.length < 6) {
      errors.password = intl.formatMessage({ id: 'form.error.passwordTooShort', defaultMessage: 'Password must be at least 6 characters' });
    }

    if (!formData.country) {
      errors.country = intl.formatMessage({ id: 'form.error.required', defaultMessage: 'This field is required' });
    }

    if (!formData.language) {
      errors.language = intl.formatMessage({ id: 'form.error.required', defaultMessage: 'This field is required' });
    }

    // ✅ Validation CGU obligatoire
    if (!formData.acceptTerms) {
      errors.acceptTerms = intl.formatMessage({ id: 'form.error.acceptTermsRequired', defaultMessage: 'You must accept the terms and conditions' });
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
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

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAntiBotError(null);
    if (!validate()) return;

    // Anti-bot validation
    const botCheck = await validateHuman('chatter_register');
    if (!botCheck.isValid) {
      setAntiBotError(botCheck.reason || 'Validation failed. Please try again.');
      return;
    }

    // ✅ Ajouter les métadonnées d'acceptation CGU + sécurité
    const dataWithTerms: ChatterRegistrationData = {
      ...formData,
      termsAcceptedAt: new Date().toISOString(),
      termsVersion: "3.0", // Version actuelle des CGU chatters
      termsType: "terms_chatters",
      termsAcceptanceMeta: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        timestamp: Date.now(),
        acceptanceMethod: "checkbox_click",
      },
      // Security metadata for backend analysis
      _securityMeta: botCheck.securityMeta,
    };

    await onSubmit(dataWithTerms);
  };

  // Success state
  if (success) {
    return (
      <FormSuccess
        title={<FormattedMessage id="chatter.register.success.title" defaultMessage="Registration successful!" />}
        message={<FormattedMessage id="chatter.register.success.message" defaultMessage="Redirecting to your quiz..." />}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormError error={error || antiBotError || null} />

      {/* Honeypot field - hidden from humans, bots will fill it */}
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
      <FormSection>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            label={<FormattedMessage id="form.firstName" defaultMessage="First name" />}
            placeholder={intl.formatMessage({ id: 'form.firstName.placeholder', defaultMessage: 'Your first name' })}
            icon={<User className="w-5 h-5" />}
            error={validationErrors.firstName}
            required
          />

          <FormInput
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            label={<FormattedMessage id="form.lastName" defaultMessage="Last name" />}
            placeholder={intl.formatMessage({ id: 'form.lastName.placeholder', defaultMessage: 'Your last name' })}
            icon={<User className="w-5 h-5" />}
            error={validationErrors.lastName}
            required
          />
        </div>
      </FormSection>

      {/* Email */}
      <FormInput
        id="email"
        name="email"
        type="email"
        value={formData.email}
        onChange={handleChange}
        label={<FormattedMessage id="form.email" defaultMessage="Email" />}
        placeholder={intl.formatMessage({ id: 'form.email.placeholder', defaultMessage: 'your@email.com' })}
        icon={<Mail className="w-5 h-5" />}
        error={validationErrors.email}
        required
        autoComplete="email"
      />

      {/* Password */}
      <div className="space-y-2">
        <label htmlFor="password" className={formStyles.label}>
          <FormattedMessage id="form.password" defaultMessage="Password" />
          <span className="text-red-500 ml-0.5">*</span>
        </label>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10 pointer-events-none" />
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={handleChange}
            placeholder={intl.formatMessage({ id: 'form.password.placeholder', defaultMessage: 'Minimum 6 characters' })}
            autoComplete="new-password"
            className={`
              ${formStyles.input}
              pl-12 pr-12
              ${validationErrors.password ? formStyles.inputError : formStyles.inputDefault}
            `}
            aria-required="true"
            aria-invalid={!!validationErrors.password}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors z-10"
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
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
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
                ? 'text-red-500'
                : formData.password.length < 8
                ? 'text-orange-500'
                : formData.password.length < 10
                ? 'text-yellow-600 dark:text-yellow-400'
                : 'text-green-500'
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
          <p className={formStyles.errorText}>
            <span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px]">!</span>
            {validationErrors.password}
          </p>
        )}
      </div>

      {/* Country */}
      <div ref={countryDropdownRef} className="space-y-2">
        <label className={formStyles.label}>
          <FormattedMessage id="form.country" defaultMessage="Country of residence" />
          <span className="text-red-500 ml-0.5">*</span>
        </label>

        <div className="relative">
          <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
          <button
            type="button"
            onClick={() => setShowCountryDropdown(!showCountryDropdown)}
            className={`
              ${formStyles.input}
              pl-12 pr-10 text-left
              flex items-center justify-between
              ${validationErrors.country ? formStyles.inputError : formStyles.inputDefault}
            `}
          >
            <span className={selectedCountryEntry ? '' : 'text-gray-400'}>
              {selectedCountryEntry ? (
                <span className="flex items-center gap-2">
                  <span className="text-lg">{getFlag(selectedCountryEntry.code)}</span>
                  {getCountryName(selectedCountryEntry, locale)}
                </span>
              ) : (
                intl.formatMessage({ id: 'form.country.placeholder', defaultMessage: 'Select your country' })
              )}
            </span>
            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showCountryDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showCountryDropdown && (
            <div className={formStyles.dropdown}>
              <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    placeholder={intl.formatMessage({ id: 'form.search.country', defaultMessage: 'Search country...' })}
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 rounded-xl border-0 focus:ring-2 focus:ring-red-500/30"
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
                    className={`
                      ${formStyles.dropdownItem}
                      ${entry.code === formData.country ? 'bg-red-50 dark:bg-red-900/20' : ''}
                    `}
                  >
                    <span className="text-xl">{getFlag(entry.code)}</span>
                    <span className="flex-1 text-sm">{getCountryName(entry, locale)}</span>
                    {entry.code === formData.country && (
                      <Check className="w-4 h-4 text-red-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {validationErrors.country && (
          <p className={formStyles.errorText}>
            <span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px]">!</span>
            {validationErrors.country}
          </p>
        )}
      </div>

      {/* Primary Language */}
      <div ref={languageDropdownRef} className="space-y-3">
        <label className={formStyles.label}>
          <FormattedMessage id="form.primaryLanguage" defaultMessage="Primary language" />
          <span className="text-red-500 ml-0.5">*</span>
        </label>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
            className={`
              ${formStyles.input}
              pl-12 pr-10 text-left flex items-center justify-between
              ${validationErrors.language ? formStyles.inputError : formStyles.inputDefault}
            `}
          >
            <Languages className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <span className={formData.language ? '' : 'text-gray-400'}>
              {formData.language ? (
                getLanguageLabel(languagesData.find(l => l.code === formData.language) || { code: formData.language, name: formData.language, nativeName: formData.language, labels: {} }, locale)
              ) : (
                intl.formatMessage({ id: 'form.language.placeholder', defaultMessage: 'Select your primary language' })
              )}
            </span>
            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showLanguageDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showLanguageDropdown && (
            <div className={formStyles.dropdown}>
              <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={languageSearch}
                    onChange={(e) => setLanguageSearch(e.target.value)}
                    placeholder={intl.formatMessage({ id: 'form.search.language', defaultMessage: 'Search language...' })}
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 rounded-xl border-0 focus:ring-2 focus:ring-red-500/30"
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
                    className={`
                      ${formStyles.dropdownItem}
                      ${lang.code === formData.language ? 'bg-red-50 dark:bg-red-900/20' : ''}
                    `}
                  >
                    <span className="flex-1 text-sm">{getLanguageLabel(lang, locale)}</span>
                    <span className="text-xs text-gray-500">{lang.nativeName}</span>
                    {lang.code === formData.language && <Check className="w-4 h-4 text-red-500" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {validationErrors.language && (
          <p className={formStyles.errorText}>
            <span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px]">!</span>
            {validationErrors.language}
          </p>
        )}
      </div>

      {/* ✅ Acceptation des CGU - Obligatoire */}
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
                  ? 'border-red-500 bg-red-50'
                  : formData.acceptTerms
                    ? 'border-green-500 bg-green-500 text-white'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                }
                focus:ring-2 focus:ring-red-500/30 focus:ring-offset-0
                transition-all duration-200
                cursor-pointer
              `}
              aria-required="true"
              aria-invalid={!!validationErrors.acceptTerms}
            />
          </div>
          <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            <FormattedMessage
              id="chatter.register.acceptTerms"
              defaultMessage="I accept the {termsLink} and the {privacyLink}"
              values={{
                termsLink: (
                  <Link
                    to="/cgu-chatters"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-500 hover:text-red-600 underline underline-offset-2 font-medium"
                  >
                    <FormattedMessage id="form.termsOfService" defaultMessage="Terms of Service" />
                  </Link>
                ),
                privacyLink: (
                  <Link
                    to="/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-500 hover:text-red-600 underline underline-offset-2 font-medium"
                  >
                    <FormattedMessage id="form.privacyPolicy" defaultMessage="Privacy Policy" />
                  </Link>
                ),
              }}
            />
            <span className="text-red-500 ml-0.5">*</span>
          </span>
        </label>
        {validationErrors.acceptTerms && (
          <p className={formStyles.errorText}>
            <span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px]">!</span>
            {validationErrors.acceptTerms}
          </p>
        )}
      </div>

      {/* Submit Button */}
      <FormButton
        type="submit"
        variant="primary"
        loading={loading}
        disabled={loading || !formData.acceptTerms}
      >
        <FormattedMessage id="chatter.register.submit" defaultMessage="Sign up as a Chatter" />
      </FormButton>
    </form>
  );
};

export default ChatterRegisterForm;
