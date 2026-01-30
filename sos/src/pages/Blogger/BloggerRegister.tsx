/**
 * BloggerRegister - Mobile-first registration page for bloggers
 * Harmonized 2026 UX with blog-specific fields
 * NO phone number required for bloggers
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocaleNavigate } from '@/multilingual-system';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import Layout from '@/components/layout/Layout';
import { phoneCodesData, type PhoneCodeEntry } from '@/data/phone-codes';
import {
  RegisterBloggerInput,
  RegisterBloggerResponse,
  BLOG_THEMES,
  BLOG_TRAFFIC_TIERS,
  SupportedBloggerLanguage,
} from '@/types/blogger';
import {
  User,
  Mail,
  Globe,
  Link2,
  FileText,
  BarChart3,
  Tag,
  ChevronDown,
  Search,
  Check,
} from 'lucide-react';
import {
  FormInput,
  FormTextarea,
  FormSection,
  FormError,
  FormSuccess,
  FormButton,
  FormCheckbox,
  FormWarningBox,
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

const LANGUAGES: { value: SupportedBloggerLanguage; label: string }[] = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'pt', label: 'Português' },
  { value: 'de', label: 'Deutsch' },
  { value: 'it', label: 'Italiano' },
  { value: 'ar', label: 'العربية' },
  { value: 'nl', label: 'Nederlands' },
  { value: 'zh', label: '中文' },
];

interface BloggerFormData {
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  language: SupportedBloggerLanguage;
  blogUrl: string;
  blogName: string;
  blogLanguage: SupportedBloggerLanguage;
  blogCountry: string;
  blogTheme: string;
  blogTraffic: string;
  blogDescription: string;
  definitiveRoleAcknowledged: boolean;
}

const BloggerRegister: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const { user } = useAuth();
  const { language } = useApp();
  const locale = (language || 'en') as string;

  const [formData, setFormData] = useState<BloggerFormData>({
    firstName: '',
    lastName: '',
    email: user?.email || '',
    country: '',
    language: 'fr',
    blogUrl: '',
    blogName: '',
    blogLanguage: 'fr',
    blogCountry: '',
    blogTheme: 'expatriation',
    blogTraffic: '1k-5k',
    blogDescription: '',
    definitiveRoleAcknowledged: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Dropdown states
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showBlogLanguageDropdown, setShowBlogLanguageDropdown] = useState(false);
  const [showBlogCountryDropdown, setShowBlogCountryDropdown] = useState(false);
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const [showTrafficDropdown, setShowTrafficDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [blogCountrySearch, setBlogCountrySearch] = useState('');

  // Refs for outside click handling
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const languageDropdownRef = useRef<HTMLDivElement>(null);
  const blogLanguageDropdownRef = useRef<HTMLDivElement>(null);
  const blogCountryDropdownRef = useRef<HTMLDivElement>(null);
  const themeDropdownRef = useRef<HTMLDivElement>(null);
  const trafficDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const refs = [
        { ref: countryDropdownRef, setter: setShowCountryDropdown, searchSetter: setCountrySearch },
        { ref: languageDropdownRef, setter: setShowLanguageDropdown },
        { ref: blogLanguageDropdownRef, setter: setShowBlogLanguageDropdown },
        { ref: blogCountryDropdownRef, setter: setShowBlogCountryDropdown, searchSetter: setBlogCountrySearch },
        { ref: themeDropdownRef, setter: setShowThemeDropdown },
        { ref: trafficDropdownRef, setter: setShowTrafficDropdown },
      ];

      refs.forEach(({ ref, setter, searchSetter }) => {
        if (ref.current && !ref.current.contains(e.target as Node)) {
          setter(false);
          if (searchSetter) searchSetter('');
        }
      });
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

  const filteredBlogCountries = useMemo(() => {
    if (!blogCountrySearch) return phoneCodesData;
    const search = blogCountrySearch.toLowerCase();
    return phoneCodesData.filter(entry =>
      getCountryName(entry, locale).toLowerCase().includes(search) ||
      entry.code.toLowerCase().includes(search)
    );
  }, [blogCountrySearch, locale]);

  // Get selected entries
  const selectedCountryEntry = useMemo(() =>
    phoneCodesData.find(e => e.code === formData.country),
    [formData.country]
  );

  const selectedBlogCountryEntry = useMemo(() =>
    phoneCodesData.find(e => e.code === formData.blogCountry),
    [formData.blogCountry]
  );

  const selectedLanguage = useMemo(() =>
    LANGUAGES.find(l => l.value === formData.language),
    [formData.language]
  );

  const selectedBlogLanguage = useMemo(() =>
    LANGUAGES.find(l => l.value === formData.blogLanguage),
    [formData.blogLanguage]
  );

  const selectedTheme = useMemo(() =>
    BLOG_THEMES.find(t => t.value === formData.blogTheme),
    [formData.blogTheme]
  );

  const selectedTraffic = useMemo(() =>
    BLOG_TRAFFIC_TIERS.find(t => t.value === formData.blogTraffic),
    [formData.blogTraffic]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

  const clearValidationError = (field: string) => {
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
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

    if (!formData.country) {
      errors.country = intl.formatMessage({ id: 'form.error.required', defaultMessage: 'This field is required' });
    }

    if (!formData.blogUrl.trim()) {
      errors.blogUrl = intl.formatMessage({ id: 'form.error.required', defaultMessage: 'This field is required' });
    } else if (!/^https?:\/\/.+/.test(formData.blogUrl)) {
      errors.blogUrl = intl.formatMessage({ id: 'form.error.urlInvalid', defaultMessage: 'Please enter a valid URL' });
    }

    if (!formData.blogName.trim()) {
      errors.blogName = intl.formatMessage({ id: 'form.error.required', defaultMessage: 'This field is required' });
    }

    if (!formData.blogCountry) {
      errors.blogCountry = intl.formatMessage({ id: 'form.error.required', defaultMessage: 'This field is required' });
    }

    if (!formData.definitiveRoleAcknowledged) {
      errors.definitiveRoleAcknowledged = intl.formatMessage({
        id: 'blogger.register.error.acknowledgment',
        defaultMessage: 'You must acknowledge that the blogger role is permanent',
      });
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const registerBlogger = httpsCallable<RegisterBloggerInput, RegisterBloggerResponse>(
        functions,
        'registerBlogger'
      );

      const result = await registerBlogger({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: '', // Not required for bloggers
        country: formData.country,
        language: formData.language,
        bio: '',
        blogUrl: formData.blogUrl,
        blogName: formData.blogName,
        blogLanguage: formData.blogLanguage,
        blogCountry: formData.blogCountry,
        blogTheme: formData.blogTheme as RegisterBloggerInput['blogTheme'],
        blogTraffic: formData.blogTraffic as RegisterBloggerInput['blogTraffic'],
        blogDescription: formData.blogDescription,
        definitiveRoleAcknowledged: formData.definitiveRoleAcknowledged,
      });

      if (result.data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/blogger/tableau-de-bord');
        }, 2000);
      } else {
        setError(result.data.message);
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white dark:from-gray-950 dark:to-black flex items-center justify-center px-4">
          <div className={formStyles.formCard}>
            <FormSuccess
              title={<FormattedMessage id="blogger.register.success.title" defaultMessage="Registration successful!" />}
              message={<FormattedMessage id="blogger.register.success.message" defaultMessage="Your blogger account is now active. Redirecting to your dashboard..." />}
            />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white dark:from-gray-950 dark:to-black py-8 md:py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              <FormattedMessage id="blogger.register.title" defaultMessage="Become a Partner Blogger" />
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              <FormattedMessage
                id="blogger.register.subtitle"
                defaultMessage="Earn $10 per referred client and $5 per recruited provider"
              />
            </p>
          </div>

          {/* Form Card */}
          <div className={formStyles.formCard}>
            <form onSubmit={handleSubmit} className="space-y-8">
              <FormError error={error} />

              {/* Personal Info Section */}
              <FormSection
                title={<FormattedMessage id="blogger.register.personalInfo" defaultMessage="Personal Information" />}
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
                                <span className="truncate">{getCountryName(selectedCountryEntry, locale)}</span>
                              </span>
                            ) : (
                              intl.formatMessage({ id: 'form.country.placeholder', defaultMessage: 'Select country' })
                            )}
                          </span>
                          <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${showCountryDropdown ? 'rotate-180' : ''}`} />
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
                                  placeholder={intl.formatMessage({ id: 'form.search.country', defaultMessage: 'Search...' })}
                                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 rounded-xl border-0 focus:ring-2 focus:ring-purple-500/30"
                                  autoFocus
                                />
                              </div>
                            </div>
                            <div className="max-h-[280px] overflow-y-auto overscroll-contain">
                              {filteredCountries.map((entry) => (
                                <button
                                  key={entry.code}
                                  type="button"
                                  onClick={() => {
                                    setFormData(prev => ({ ...prev, country: entry.code }));
                                    setShowCountryDropdown(false);
                                    setCountrySearch('');
                                    clearValidationError('country');
                                  }}
                                  className={`
                                    ${formStyles.dropdownItem}
                                    ${entry.code === formData.country ? 'bg-purple-50 dark:bg-purple-900/20' : ''}
                                  `}
                                >
                                  <span className="text-xl">{getFlag(entry.code)}</span>
                                  <span className="flex-1 text-sm">{getCountryName(entry, locale)}</span>
                                  {entry.code === formData.country && (
                                    <Check className="w-4 h-4 text-purple-500" />
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
                          <span>{selectedLanguage?.label || 'Select'}</span>
                          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showLanguageDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        {showLanguageDropdown && (
                          <div className={formStyles.dropdown}>
                            <div className="max-h-[280px] overflow-y-auto overscroll-contain">
                              {LANGUAGES.map((lang) => (
                                <button
                                  key={lang.value}
                                  type="button"
                                  onClick={() => {
                                    setFormData(prev => ({ ...prev, language: lang.value }));
                                    setShowLanguageDropdown(false);
                                  }}
                                  className={`
                                    ${formStyles.dropdownItem}
                                    ${lang.value === formData.language ? 'bg-purple-50 dark:bg-purple-900/20' : ''}
                                  `}
                                >
                                  <span className="flex-1 text-sm">{lang.label}</span>
                                  {lang.value === formData.language && (
                                    <Check className="w-4 h-4 text-purple-500" />
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

              {/* Blog Info Section */}
              <FormSection
                title={<FormattedMessage id="blogger.register.blogInfo" defaultMessage="Blog Information" />}
              >
                <div className="space-y-4">
                  <FormInput
                    id="blogUrl"
                    name="blogUrl"
                    type="url"
                    value={formData.blogUrl}
                    onChange={handleChange}
                    label={<FormattedMessage id="form.blogUrl" defaultMessage="Blog URL" />}
                    placeholder="https://myblog.com"
                    icon={<Link2 className="w-5 h-5" />}
                    error={validationErrors.blogUrl}
                    required
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput
                      id="blogName"
                      name="blogName"
                      value={formData.blogName}
                      onChange={handleChange}
                      label={<FormattedMessage id="form.blogName" defaultMessage="Blog name" />}
                      placeholder={intl.formatMessage({ id: 'form.blogName.placeholder', defaultMessage: 'My Amazing Blog' })}
                      icon={<FileText className="w-5 h-5" />}
                      error={validationErrors.blogName}
                      required
                    />

                    {/* Blog Language */}
                    <div ref={blogLanguageDropdownRef} className="space-y-2">
                      <label className={formStyles.label}>
                        <FormattedMessage id="form.blogLanguage" defaultMessage="Blog language" />
                        <span className="text-red-500 ml-0.5">*</span>
                      </label>

                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowBlogLanguageDropdown(!showBlogLanguageDropdown)}
                          className={`${formStyles.input} pr-10 text-left flex items-center justify-between ${formStyles.inputDefault}`}
                        >
                          <span>{selectedBlogLanguage?.label || 'Select'}</span>
                          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showBlogLanguageDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        {showBlogLanguageDropdown && (
                          <div className={formStyles.dropdown}>
                            <div className="max-h-[280px] overflow-y-auto overscroll-contain">
                              {LANGUAGES.map((lang) => (
                                <button
                                  key={lang.value}
                                  type="button"
                                  onClick={() => {
                                    setFormData(prev => ({ ...prev, blogLanguage: lang.value }));
                                    setShowBlogLanguageDropdown(false);
                                  }}
                                  className={`
                                    ${formStyles.dropdownItem}
                                    ${lang.value === formData.blogLanguage ? 'bg-purple-50 dark:bg-purple-900/20' : ''}
                                  `}
                                >
                                  <span className="flex-1 text-sm">{lang.label}</span>
                                  {lang.value === formData.blogLanguage && (
                                    <Check className="w-4 h-4 text-purple-500" />
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Blog Target Country */}
                    <div ref={blogCountryDropdownRef} className="space-y-2">
                      <label className={formStyles.label}>
                        <FormattedMessage id="form.blogCountry" defaultMessage="Target country" />
                        <span className="text-red-500 ml-0.5">*</span>
                      </label>

                      <div className="relative">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                        <button
                          type="button"
                          onClick={() => setShowBlogCountryDropdown(!showBlogCountryDropdown)}
                          className={`
                            ${formStyles.input}
                            pl-12 pr-10 text-left
                            flex items-center justify-between
                            ${validationErrors.blogCountry ? formStyles.inputError : formStyles.inputDefault}
                          `}
                        >
                          <span className={selectedBlogCountryEntry ? '' : 'text-gray-400'}>
                            {selectedBlogCountryEntry ? (
                              <span className="flex items-center gap-2">
                                <span className="text-lg">{getFlag(selectedBlogCountryEntry.code)}</span>
                                <span className="truncate">{getCountryName(selectedBlogCountryEntry, locale)}</span>
                              </span>
                            ) : (
                              intl.formatMessage({ id: 'form.blogCountry.placeholder', defaultMessage: 'Target audience' })
                            )}
                          </span>
                          <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${showBlogCountryDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        {showBlogCountryDropdown && (
                          <div className={formStyles.dropdown}>
                            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                  type="text"
                                  value={blogCountrySearch}
                                  onChange={(e) => setBlogCountrySearch(e.target.value)}
                                  placeholder={intl.formatMessage({ id: 'form.search.country', defaultMessage: 'Search...' })}
                                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 rounded-xl border-0 focus:ring-2 focus:ring-purple-500/30"
                                  autoFocus
                                />
                              </div>
                            </div>
                            <div className="max-h-[280px] overflow-y-auto overscroll-contain">
                              {filteredBlogCountries.map((entry) => (
                                <button
                                  key={entry.code}
                                  type="button"
                                  onClick={() => {
                                    setFormData(prev => ({ ...prev, blogCountry: entry.code }));
                                    setShowBlogCountryDropdown(false);
                                    setBlogCountrySearch('');
                                    clearValidationError('blogCountry');
                                  }}
                                  className={`
                                    ${formStyles.dropdownItem}
                                    ${entry.code === formData.blogCountry ? 'bg-purple-50 dark:bg-purple-900/20' : ''}
                                  `}
                                >
                                  <span className="text-xl">{getFlag(entry.code)}</span>
                                  <span className="flex-1 text-sm">{getCountryName(entry, locale)}</span>
                                  {entry.code === formData.blogCountry && (
                                    <Check className="w-4 h-4 text-purple-500" />
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {validationErrors.blogCountry && (
                        <p className={formStyles.errorText}>
                          <span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px]">!</span>
                          {validationErrors.blogCountry}
                        </p>
                      )}
                    </div>

                    {/* Blog Theme */}
                    <div ref={themeDropdownRef} className="space-y-2">
                      <label className={formStyles.label}>
                        <FormattedMessage id="form.blogTheme" defaultMessage="Theme" />
                        <span className="text-red-500 ml-0.5">*</span>
                      </label>

                      <div className="relative">
                        <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                        <button
                          type="button"
                          onClick={() => setShowThemeDropdown(!showThemeDropdown)}
                          className={`${formStyles.input} pl-12 pr-10 text-left flex items-center justify-between ${formStyles.inputDefault}`}
                        >
                          <span>{selectedTheme?.labelFr || 'Select'}</span>
                          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showThemeDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        {showThemeDropdown && (
                          <div className={formStyles.dropdown}>
                            <div className="max-h-[280px] overflow-y-auto overscroll-contain">
                              {BLOG_THEMES.map((theme) => (
                                <button
                                  key={theme.value}
                                  type="button"
                                  onClick={() => {
                                    setFormData(prev => ({ ...prev, blogTheme: theme.value }));
                                    setShowThemeDropdown(false);
                                  }}
                                  className={`
                                    ${formStyles.dropdownItem}
                                    ${theme.value === formData.blogTheme ? 'bg-purple-50 dark:bg-purple-900/20' : ''}
                                  `}
                                >
                                  <span className="flex-1 text-sm">{theme.labelFr}</span>
                                  {theme.value === formData.blogTheme && (
                                    <Check className="w-4 h-4 text-purple-500" />
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Blog Traffic */}
                  <div ref={trafficDropdownRef} className="space-y-2">
                    <label className={formStyles.label}>
                      <FormattedMessage id="form.blogTraffic" defaultMessage="Monthly traffic estimate" />
                      <span className="text-red-500 ml-0.5">*</span>
                    </label>

                    <div className="relative">
                      <BarChart3 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                      <button
                        type="button"
                        onClick={() => setShowTrafficDropdown(!showTrafficDropdown)}
                        className={`${formStyles.input} pl-12 pr-10 text-left flex items-center justify-between ${formStyles.inputDefault}`}
                      >
                        <span>{selectedTraffic?.labelFr || 'Select'}</span>
                        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showTrafficDropdown ? 'rotate-180' : ''}`} />
                      </button>

                      {showTrafficDropdown && (
                        <div className={formStyles.dropdown}>
                          <div className="max-h-[280px] overflow-y-auto overscroll-contain">
                            {BLOG_TRAFFIC_TIERS.map((tier) => (
                              <button
                                key={tier.value}
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, blogTraffic: tier.value }));
                                  setShowTrafficDropdown(false);
                                }}
                                className={`
                                  ${formStyles.dropdownItem}
                                  ${tier.value === formData.blogTraffic ? 'bg-purple-50 dark:bg-purple-900/20' : ''}
                                `}
                              >
                                <span className="flex-1 text-sm">{tier.labelFr}</span>
                                {tier.value === formData.blogTraffic && (
                                  <Check className="w-4 h-4 text-purple-500" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <FormTextarea
                    id="blogDescription"
                    name="blogDescription"
                    value={formData.blogDescription}
                    onChange={handleChange}
                    label={<FormattedMessage id="form.blogDescription" defaultMessage="Blog description" />}
                    placeholder={intl.formatMessage({ id: 'form.blogDescription.placeholder', defaultMessage: 'Describe your blog and its audience...' })}
                    rows={3}
                    maxLength={500}
                    showCount
                  />
                </div>
              </FormSection>

              {/* Definitive Role Warning */}
              <FormWarningBox
                title={<FormattedMessage id="blogger.register.warning.title" defaultMessage="Important: Permanent Role" />}
                message={<FormattedMessage id="blogger.register.warning.message" defaultMessage="By becoming a partner blogger, you will not be able to become a Chatter or Influencer. This choice is final and irreversible." />}
              >
                <FormCheckbox
                  id="definitiveRoleAcknowledged"
                  name="definitiveRoleAcknowledged"
                  checked={formData.definitiveRoleAcknowledged}
                  onChange={(checked) => {
                    setFormData(prev => ({ ...prev, definitiveRoleAcknowledged: checked }));
                    clearValidationError('definitiveRoleAcknowledged');
                  }}
                  label={<FormattedMessage id="blogger.register.acknowledgment" defaultMessage="I understand and accept that this role is permanent" />}
                  error={validationErrors.definitiveRoleAcknowledged}
                  variant="warning"
                />
              </FormWarningBox>

              {/* Submit Button */}
              <FormButton
                type="submit"
                variant="primary"
                loading={isSubmitting}
                disabled={isSubmitting}
                accentColor="purple"
              >
                <FormattedMessage id="blogger.register.submit" defaultMessage="Become a Partner Blogger" />
              </FormButton>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default BloggerRegister;
