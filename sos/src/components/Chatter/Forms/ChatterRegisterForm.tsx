/**
 * ChatterRegisterForm - Mobile-first registration form for becoming a chatter
 * Uses phone codes and languages from data files
 * All defaultMessage in English for proper i18n fallback
 */

import React, { useState, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { User, Mail, Phone, Globe, AlertCircle, Loader2, ChevronDown, Search, Languages } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { phoneCodesData, type PhoneCodeEntry } from '@/data/phone-codes';
import { languagesData, getLanguageLabel, type SupportedLocale, type Language } from '@/data/languages-spoken';

// Design tokens - Mobile-first
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  input: "w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all text-sm md:text-base",
  label: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1",
  button: {
    primary: "w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed",
  },
} as const;

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

interface ChatterRegisterFormProps {
  onSubmit: (data: ChatterRegistrationData) => Promise<void>;
  initialData?: Partial<ChatterRegistrationData>;
  loading?: boolean;
  error?: string | null;
}

export interface ChatterRegistrationData {
  firstName: string;
  lastName: string;
  email: string;
  phoneCode: string;
  phoneNumber: string;
  country: string;
  languages: string[];
  referralCode?: string;
}

const ChatterRegisterForm: React.FC<ChatterRegisterFormProps> = ({
  onSubmit,
  initialData,
  loading = false,
  error,
}) => {
  const intl = useIntl();
  const { language } = useApp();
  const locale = (language || 'en') as SupportedLocale;

  const [formData, setFormData] = useState<ChatterRegistrationData>({
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    email: initialData?.email || '',
    phoneCode: initialData?.phoneCode || '+1',
    phoneNumber: initialData?.phoneNumber || '',
    country: initialData?.country || '',
    languages: initialData?.languages || ['en'],
    referralCode: initialData?.referralCode || '',
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [phoneCodeSearch, setPhoneCodeSearch] = useState('');
  const [languageSearch, setLanguageSearch] = useState('');
  const [showPhoneDropdown, setShowPhoneDropdown] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  // Filter phone codes based on search
  const filteredPhoneCodes = useMemo(() => {
    if (!phoneCodeSearch) return phoneCodesData;
    const search = phoneCodeSearch.toLowerCase();
    return phoneCodesData.filter(entry =>
      getCountryName(entry, locale).toLowerCase().includes(search) ||
      entry.phoneCode.includes(search) ||
      entry.code.toLowerCase().includes(search)
    );
  }, [phoneCodeSearch, locale]);

  // Filter languages based on search
  const filteredLanguages = useMemo(() => {
    if (!languageSearch) return languagesData.slice(0, 30); // Show top 30 by default
    const search = languageSearch.toLowerCase();
    return languagesData.filter(lang =>
      getLanguageLabel(lang, locale).toLowerCase().includes(search) ||
      lang.nativeName.toLowerCase().includes(search) ||
      lang.code.toLowerCase().includes(search)
    );
  }, [languageSearch, locale]);

  // Get selected phone code entry
  const selectedPhoneEntry = useMemo(() =>
    phoneCodesData.find(e => e.phoneCode === formData.phoneCode),
    [formData.phoneCode]
  );

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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

  // Select phone code
  const selectPhoneCode = (entry: PhoneCodeEntry) => {
    setFormData(prev => ({
      ...prev,
      phoneCode: entry.phoneCode,
      country: entry.code
    }));
    setShowPhoneDropdown(false);
    setPhoneCodeSearch('');
  };

  // Handle language toggle
  const toggleLanguage = (langCode: string) => {
    setFormData(prev => {
      const languages = prev.languages.includes(langCode)
        ? prev.languages.filter(l => l !== langCode)
        : [...prev.languages, langCode];
      return { ...prev, languages: languages.length > 0 ? languages : prev.languages };
    });
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
      errors.firstName = intl.formatMessage({ id: 'chatter.register.error.firstName', defaultMessage: 'First name is required' });
    }

    if (!formData.lastName.trim()) {
      errors.lastName = intl.formatMessage({ id: 'chatter.register.error.lastName', defaultMessage: 'Last name is required' });
    }

    if (!formData.email.trim()) {
      errors.email = intl.formatMessage({ id: 'chatter.register.error.email', defaultMessage: 'Email is required' });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = intl.formatMessage({ id: 'chatter.register.error.emailInvalid', defaultMessage: 'Invalid email address' });
    }

    if (!formData.phoneNumber.trim()) {
      errors.phoneNumber = intl.formatMessage({ id: 'chatter.register.error.phone', defaultMessage: 'Phone number is required' });
    }

    if (!formData.country) {
      errors.country = intl.formatMessage({ id: 'chatter.register.error.country', defaultMessage: 'Country is required' });
    }

    if (formData.languages.length === 0) {
      errors.languages = intl.formatMessage({ id: 'chatter.register.error.languages', defaultMessage: 'Select at least one language' });
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
      {/* Error Message */}
      {error && (
        <div className="p-3 md:p-4 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Name Fields - Stack on mobile */}
      <div className="space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
        <div>
          <label htmlFor="firstName" className={UI.label}>
            <FormattedMessage id="chatter.register.firstName" defaultMessage="First name" />
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              className={`${UI.input} pl-10 ${validationErrors.firstName ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder={intl.formatMessage({ id: 'chatter.register.firstNamePlaceholder', defaultMessage: 'Your first name' })}
            />
          </div>
          {validationErrors.firstName && (
            <p className="mt-1 text-xs text-red-500">{validationErrors.firstName}</p>
          )}
        </div>

        <div>
          <label htmlFor="lastName" className={UI.label}>
            <FormattedMessage id="chatter.register.lastName" defaultMessage="Last name" />
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              className={`${UI.input} pl-10 ${validationErrors.lastName ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder={intl.formatMessage({ id: 'chatter.register.lastNamePlaceholder', defaultMessage: 'Your last name' })}
            />
          </div>
          {validationErrors.lastName && (
            <p className="mt-1 text-xs text-red-500">{validationErrors.lastName}</p>
          )}
        </div>
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className={UI.label}>
          <FormattedMessage id="chatter.register.email" defaultMessage="Email" />
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={`${UI.input} pl-10 ${validationErrors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
            placeholder={intl.formatMessage({ id: 'chatter.register.emailPlaceholder', defaultMessage: 'your@email.com' })}
          />
        </div>
        {validationErrors.email && (
          <p className="mt-1 text-xs text-red-500">{validationErrors.email}</p>
        )}
      </div>

      {/* Phone with country code selector */}
      <div>
        <label className={UI.label}>
          <FormattedMessage id="chatter.register.phone" defaultMessage="Phone number" />
        </label>
        <div className="flex gap-2">
          {/* Phone code dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPhoneDropdown(!showPhoneDropdown)}
              className={`${UI.input} w-[100px] md:w-[120px] flex items-center justify-between gap-1 px-2`}
            >
              <span className="flex items-center gap-1">
                {selectedPhoneEntry && (
                  <>
                    <span className="text-base">{getFlag(selectedPhoneEntry.code)}</span>
                    <span className="text-xs md:text-sm">{selectedPhoneEntry.phoneCode}</span>
                  </>
                )}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {showPhoneDropdown && (
              <div className="absolute z-50 mt-1 w-[280px] md:w-[320px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-[300px] overflow-hidden">
                <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={phoneCodeSearch}
                      onChange={(e) => setPhoneCodeSearch(e.target.value)}
                      placeholder={intl.formatMessage({ id: 'chatter.register.searchCountry', defaultMessage: 'Search country...' })}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 rounded-lg border-0 focus:ring-2 focus:ring-red-500"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="overflow-y-auto max-h-[240px]">
                  {filteredPhoneCodes.map((entry) => (
                    <button
                      key={entry.code}
                      type="button"
                      onClick={() => selectPhoneCode(entry)}
                      className="w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                    >
                      <span className="text-lg">{getFlag(entry.code)}</span>
                      <span className="flex-1 text-sm text-gray-900 dark:text-white truncate">
                        {getCountryName(entry, locale)}
                      </span>
                      <span className="text-sm text-gray-500">{entry.phoneCode}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Phone number input */}
          <div className="relative flex-1">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="tel"
              id="phoneNumber"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              className={`${UI.input} pl-10 ${validationErrors.phoneNumber ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder={intl.formatMessage({ id: 'chatter.register.phonePlaceholder', defaultMessage: '123 456 789' })}
            />
          </div>
        </div>
        {validationErrors.phoneNumber && (
          <p className="mt-1 text-xs text-red-500">{validationErrors.phoneNumber}</p>
        )}
      </div>

      {/* Country (auto-filled from phone code, but can change) */}
      <div>
        <label htmlFor="country" className={UI.label}>
          <FormattedMessage id="chatter.register.country" defaultMessage="Country of residence" />
        </label>
        <div className="relative">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            id="country"
            name="country"
            value={formData.country}
            onChange={handleChange}
            className={`${UI.input} pl-10 appearance-none ${validationErrors.country ? 'border-red-500 focus:ring-red-500' : ''}`}
          >
            <option value="">
              {intl.formatMessage({ id: 'chatter.register.countrySelect', defaultMessage: 'Select a country' })}
            </option>
            {phoneCodesData.map(entry => (
              <option key={entry.code} value={entry.code}>
                {getFlag(entry.code)} {getCountryName(entry, locale)}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
        {validationErrors.country && (
          <p className="mt-1 text-xs text-red-500">{validationErrors.country}</p>
        )}
      </div>

      {/* Languages */}
      <div>
        <label className={UI.label}>
          <FormattedMessage id="chatter.register.languages" defaultMessage="Languages spoken" />
        </label>

        {/* Selected languages as chips */}
        <div className="flex flex-wrap gap-2 mb-2">
          {formData.languages.map(langCode => {
            const lang = languagesData.find(l => l.code === langCode);
            if (!lang) return null;
            return (
              <button
                key={langCode}
                type="button"
                onClick={() => toggleLanguage(langCode)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-red-500 to-orange-500 text-white flex items-center gap-1"
              >
                {getLanguageLabel(lang, locale)}
                <span className="ml-1">×</span>
              </button>
            );
          })}
        </div>

        {/* Add language dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
            className={`${UI.input} flex items-center gap-2 text-gray-500`}
          >
            <Languages className="w-5 h-5" />
            <span className="text-sm">
              <FormattedMessage id="chatter.register.addLanguage" defaultMessage="Add a language..." />
            </span>
          </button>

          {showLanguageDropdown && (
            <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-[300px] overflow-hidden">
              <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={languageSearch}
                    onChange={(e) => setLanguageSearch(e.target.value)}
                    placeholder={intl.formatMessage({ id: 'chatter.register.searchLanguage', defaultMessage: 'Search language...' })}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 rounded-lg border-0 focus:ring-2 focus:ring-red-500"
                    autoFocus
                  />
                </div>
              </div>
              <div className="overflow-y-auto max-h-[240px]">
                {filteredLanguages.map((lang) => {
                  const isSelected = formData.languages.includes(lang.code);
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => addLanguageFromDropdown(lang)}
                      disabled={isSelected}
                      className={`w-full px-3 py-2 flex items-center gap-3 text-left ${
                        isSelected
                          ? 'bg-gray-100 dark:bg-gray-700 opacity-50 cursor-not-allowed'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className="flex-1 text-sm text-gray-900 dark:text-white">
                        {getLanguageLabel(lang, locale)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {lang.nativeName}
                      </span>
                      {isSelected && (
                        <span className="text-xs text-green-500">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {validationErrors.languages && (
          <p className="mt-1 text-xs text-red-500">{validationErrors.languages}</p>
        )}
      </div>

      {/* Referral Code (Optional) */}
      <div>
        <label htmlFor="referralCode" className={UI.label}>
          <FormattedMessage id="chatter.register.referralCode" defaultMessage="Referral code (optional)" />
        </label>
        <input
          type="text"
          id="referralCode"
          name="referralCode"
          value={formData.referralCode}
          onChange={handleChange}
          className={UI.input}
          placeholder={intl.formatMessage({ id: 'chatter.register.referralCodePlaceholder', defaultMessage: 'REC-XXXX' })}
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          <FormattedMessage id="chatter.register.referralCodeHint" defaultMessage="If someone referred you, enter their code" />
        </p>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className={`${UI.button.primary} py-3 md:py-4 flex items-center justify-center gap-2`}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <FormattedMessage id="chatter.register.submitting" defaultMessage="Signing up..." />
          </>
        ) : (
          <FormattedMessage id="chatter.register.submit" defaultMessage="Sign up as a Chatter" />
        )}
      </button>
    </form>
  );
};

export default ChatterRegisterForm;
