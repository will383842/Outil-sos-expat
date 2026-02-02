/**
 * InfluencerRegisterForm - Mobile-first registration form for influencers
 * Harmonized 2026 UX with platform selection and community info
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
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
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocaleNavigate } from '@/multilingual-system';
import { getTranslatedRouteSlug, type RouteKey } from '@/multilingual-system/core/routing/localeRoutes';
import { useApp } from '@/contexts/AppContext';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { phoneCodesData, type PhoneCodeEntry } from '@/data/phone-codes';
import {
  FormInput,
  FormTextarea,
  FormChips,
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
  referralCode: string;
}

interface InfluencerRegisterFormProps {
  referralCode?: string;
}

const InfluencerRegisterForm: React.FC<InfluencerRegisterFormProps> = ({ referralCode = '' }) => {
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
    referralCode: referralCode,
  });

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

  // Get selected country entry
  const selectedCountryEntry = useMemo(() =>
    phoneCodesData.find(e => e.code === formData.country),
    [formData.country]
  );

  // Get selected language
  const selectedLanguage = useMemo(() =>
    LANGUAGES.find(l => l.value === formData.language),
    [formData.language]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user modifies form
    setError(null);
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
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

  const handlePlatformChange = (platforms: string[]) => {
    setFormData(prev => ({ ...prev, platforms }));
    if (validationErrors.platforms && platforms.length > 0) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.platforms;
        return newErrors;
      });
    }
  };

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

    // Password validation - minimum 8 characters
    if (!formData.password) {
      errors.password = intl.formatMessage({ id: 'form.error.required', defaultMessage: 'This field is required' });
    } else if (formData.password.length < 8) {
      errors.password = intl.formatMessage({ id: 'form.error.passwordTooShort', defaultMessage: 'Password must be at least 8 characters' });
    }

    if (!formData.country) {
      errors.country = intl.formatMessage({ id: 'form.error.required', defaultMessage: 'This field is required' });
    }

    if (formData.platforms.length === 0) {
      errors.platforms = intl.formatMessage({ id: 'form.error.selectOne', defaultMessage: 'Select at least one option' });
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    setError(null);

    try {
      // Step 1: Create Firebase Auth account with role 'influencer'
      console.log('[InfluencerRegister] Creating Firebase Auth account...');
      await register({
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: 'influencer',
      }, formData.password);
      console.log('[InfluencerRegister] Firebase Auth account created successfully');

      // Step 2: Call Cloud Function to create influencer profile
      console.log('[InfluencerRegister] Calling registerInfluencer Cloud Function...');
      const functions = getFunctions(undefined, 'europe-west1');
      const registerInfluencer = httpsCallable(functions, 'registerInfluencer');

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
        recruiterCode: formData.referralCode || undefined,
      });

      const data = result.data as { success: boolean; affiliateCodeClient: string };

      if (data.success) {
        console.log('[InfluencerRegister] Registration completed successfully');
        setSuccess(true);
        // Refresh user data to ensure role is updated in context
        await refreshUser();
        setTimeout(() => {
          navigate(`/${getTranslatedRouteSlug('influencer-dashboard' as RouteKey, langCode)}`, { replace: true });
        }, 2000);
      }
    } catch (err: unknown) {
      console.error('[InfluencerRegister] Registration error:', err);

      // Handle specific Firebase Auth errors
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';

      if (errorMessage.includes('email-already-in-use')) {
        setError(intl.formatMessage({ id: 'form.error.emailAlreadyInUse', defaultMessage: 'This email is already registered' }));
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

  if (success) {
    return (
      <FormSuccess
        title={<FormattedMessage id="influencer.register.success.title" defaultMessage="Registration successful!" />}
        message={<FormattedMessage id="influencer.register.success.message" defaultMessage="Your account is now active. Redirecting to your dashboard..." />}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <FormError error={error} />

      {/* Personal Info Section */}
      <FormSection
        title={<FormattedMessage id="influencer.register.section.personal" defaultMessage="Personal Information" />}
      >
        <div className="space-y-4">
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

          {/* Password Field */}
          <div className="space-y-2">
            <label htmlFor="password" className={formStyles.label}>
              <FormattedMessage id="form.password" defaultMessage="Password" />
              <span className="text-red-500 ml-0.5">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                placeholder={intl.formatMessage({ id: 'form.password.placeholder', defaultMessage: 'Minimum 8 characters' })}
                autoComplete="new-password"
                className={`
                  ${formStyles.input}
                  pl-12 pr-12
                  ${validationErrors.password ? formStyles.inputError : formStyles.inputDefault}
                `}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label={showPassword
                  ? intl.formatMessage({ id: 'form.password.hide', defaultMessage: 'Hide password' })
                  : intl.formatMessage({ id: 'form.password.show', defaultMessage: 'Show password' })
                }
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {validationErrors.password && (
              <p className={formStyles.errorText}>
                <span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px]">!</span>
                {validationErrors.password}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Country Dropdown */}
            <div ref={countryDropdownRef} className="space-y-2">
              <label className={formStyles.label}>
                <FormattedMessage id="form.country" defaultMessage="Country" />
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
                      intl.formatMessage({ id: 'form.country.placeholder', defaultMessage: 'Select country' })
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

            {/* Language Dropdown */}
            <div ref={languageDropdownRef} className="space-y-2">
              <label className={formStyles.label}>
                <FormattedMessage id="form.language" defaultMessage="Main language" />
                <span className="text-red-500 ml-0.5">*</span>
              </label>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                  className={`
                    ${formStyles.input}
                    pr-10 text-left
                    flex items-center justify-between
                    ${formStyles.inputDefault}
                  `}
                >
                  <span>{selectedLanguage?.label || 'Select language'}</span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showLanguageDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showLanguageDropdown && (
                  <div className={formStyles.dropdown}>
                    <div className="max-h-[280px] overflow-y-auto overscroll-contain">
                      {LANGUAGES.map((lang) => (
                        <button
                          key={lang.value}
                          type="button"
                          onClick={() => selectLanguage(lang.value)}
                          className={`
                            ${formStyles.dropdownItem}
                            ${lang.value === formData.language ? 'bg-red-50 dark:bg-red-900/20' : ''}
                          `}
                        >
                          <span className="flex-1 text-sm">{lang.label}</span>
                          {lang.value === formData.language && (
                            <Check className="w-4 h-4 text-red-500" />
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
      </FormSection>

      {/* Platforms Section */}
      <FormSection
        title={<FormattedMessage id="influencer.register.section.platforms" defaultMessage="Your Platforms" />}
        description={<FormattedMessage id="influencer.register.platformsHint" defaultMessage="Select at least one platform where you create content" />}
      >
        <FormChips
          selected={formData.platforms}
          onChange={handlePlatformChange}
          options={PLATFORMS}
          label=""
          error={validationErrors.platforms}
          required
        />
      </FormSection>

      {/* Community Section */}
      <FormSection
        title={<FormattedMessage id="influencer.register.section.community" defaultMessage="Your Community" />}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              id="communitySize"
              name="communitySize"
              type="number"
              value={formData.communitySize}
              onChange={handleChange}
              label={<FormattedMessage id="form.communitySize" defaultMessage="Community size" />}
              placeholder={intl.formatMessage({ id: 'form.communitySize.placeholder', defaultMessage: 'e.g. 5000' })}
              icon={<Users className="w-5 h-5" />}
            />

            <FormInput
              id="communityNiche"
              name="communityNiche"
              value={formData.communityNiche}
              onChange={handleChange}
              label={<FormattedMessage id="form.communityNiche" defaultMessage="Niche / Theme" />}
              placeholder={intl.formatMessage({ id: 'form.communityNiche.placeholder', defaultMessage: 'e.g. expatriation, travel...' })}
              icon={<Tag className="w-5 h-5" />}
            />
          </div>

          <FormTextarea
            id="bio"
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            label={<FormattedMessage id="form.bio" defaultMessage="Bio / Description" />}
            placeholder={intl.formatMessage({ id: 'form.bio.placeholder', defaultMessage: 'Tell us about your community and content...' })}
            rows={3}
            maxLength={500}
            showCount
          />
        </div>
      </FormSection>

      {/* Submit Button */}
      <FormButton
        type="submit"
        variant="primary"
        loading={loading}
        disabled={loading}
      >
        <FormattedMessage id="influencer.register.submit" defaultMessage="Become an Influencer" />
      </FormButton>
    </form>
  );
};

export default InfluencerRegisterForm;
