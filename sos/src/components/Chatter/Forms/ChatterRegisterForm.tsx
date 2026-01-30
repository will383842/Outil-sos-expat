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
  Gift,
  ChevronDown,
  Search,
  X,
  Check,
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { phoneCodesData, type PhoneCodeEntry } from '@/data/phone-codes';
import { languagesData, getLanguageLabel, type SupportedLocale, type Language } from '@/data/languages-spoken';
import {
  FormInput,
  FormSection,
  FormError,
  FormSuccess,
  FormButton,
  formStyles,
} from '@/components/forms/FormElements';

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
  country: string;
  languages: string[];
  referralCode?: string;
}

interface ChatterRegisterFormProps {
  onSubmit: (data: ChatterRegistrationData) => Promise<void>;
  initialData?: Partial<ChatterRegistrationData>;
  loading?: boolean;
  error?: string | null;
  success?: boolean;
  /** If true, the referral code field will be hidden (already shown in parent) */
  hideReferralField?: boolean;
}

const ChatterRegisterForm: React.FC<ChatterRegisterFormProps> = ({
  onSubmit,
  initialData,
  loading = false,
  error,
  success = false,
  hideReferralField = false,
}) => {
  const intl = useIntl();
  const { language } = useApp();
  const locale = (language || 'en') as SupportedLocale;

  const [formData, setFormData] = useState<ChatterRegistrationData>({
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    email: initialData?.email || '',
    country: initialData?.country || '',
    languages: initialData?.languages || ['en'],
    referralCode: initialData?.referralCode || '',
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [languageSearch, setLanguageSearch] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

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

  // Toggle language
  const toggleLanguage = (langCode: string) => {
    setFormData(prev => {
      const languages = prev.languages.includes(langCode)
        ? prev.languages.filter(l => l !== langCode)
        : [...prev.languages, langCode];
      return { ...prev, languages: languages.length > 0 ? languages : prev.languages };
    });
    if (validationErrors.languages) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.languages;
        return newErrors;
      });
    }
  };

  // Add language from dropdown
  const addLanguageFromDropdown = (lang: Language) => {
    if (!formData.languages.includes(lang.code)) {
      setFormData(prev => ({ ...prev, languages: [...prev.languages, lang.code] }));
    }
    setShowLanguageDropdown(false);
    setLanguageSearch('');
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

    if (!formData.country) {
      errors.country = intl.formatMessage({ id: 'form.error.required', defaultMessage: 'This field is required' });
    }

    if (formData.languages.length === 0) {
      errors.languages = intl.formatMessage({ id: 'form.error.selectOne', defaultMessage: 'Select at least one option' });
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(formData);
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
      <FormError error={error || null} />

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

      {/* Languages */}
      <div ref={languageDropdownRef} className="space-y-3">
        <label className={formStyles.label}>
          <FormattedMessage id="form.languages" defaultMessage="Languages spoken" />
          <span className="text-red-500 ml-0.5">*</span>
        </label>

        {/* Selected languages as chips */}
        {formData.languages.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formData.languages.map(langCode => {
              const lang = languagesData.find(l => l.code === langCode);
              if (!lang) return null;
              return (
                <button
                  key={langCode}
                  type="button"
                  onClick={() => toggleLanguage(langCode)}
                  className={formStyles.chipRemovable}
                >
                  {getLanguageLabel(lang, locale)}
                  <X className="w-3.5 h-3.5 ml-1" />
                </button>
              );
            })}
          </div>
        )}

        {/* Add language dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
            className={`
              ${formStyles.input}
              flex items-center gap-3 text-gray-500 dark:text-gray-400
              ${validationErrors.languages ? formStyles.inputError : formStyles.inputDefault}
            `}
          >
            <Languages className="w-5 h-5" />
            <span className="text-sm">
              <FormattedMessage id="form.languages.add" defaultMessage="Add a language..." />
            </span>
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
                {filteredLanguages.map((lang) => {
                  const isSelected = formData.languages.includes(lang.code);
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => addLanguageFromDropdown(lang)}
                      disabled={isSelected}
                      className={`
                        ${formStyles.dropdownItem}
                        ${isSelected ? 'bg-gray-100 dark:bg-gray-800 opacity-50' : ''}
                      `}
                    >
                      <span className="flex-1 text-sm">{getLanguageLabel(lang, locale)}</span>
                      <span className="text-xs text-gray-500">{lang.nativeName}</span>
                      {isSelected && <Check className="w-4 h-4 text-green-500" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {validationErrors.languages && (
          <p className={formStyles.errorText}>
            <span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px]">!</span>
            {validationErrors.languages}
          </p>
        )}
      </div>

      {/* Referral Code (Optional) - Hidden if already provided via URL */}
      {!initialData?.referralCode && (
        <FormInput
          id="referralCode"
          name="referralCode"
          value={formData.referralCode || ''}
          onChange={handleChange}
          label={<FormattedMessage id="form.referralCode" defaultMessage="Referral code (optional)" />}
          placeholder={intl.formatMessage({ id: 'form.referralCode.placeholder', defaultMessage: 'REC-XXXX' })}
          icon={<Gift className="w-5 h-5" />}
          helperText={<FormattedMessage id="form.referralCode.hint" defaultMessage="If someone referred you, enter their code" />}
        />
      )}

      {/* Submit Button */}
      <FormButton
        type="submit"
        variant="primary"
        loading={loading}
        disabled={loading}
      >
        <FormattedMessage id="chatter.register.submit" defaultMessage="Sign up as a Chatter" />
      </FormButton>
    </form>
  );
};

export default ChatterRegisterForm;
