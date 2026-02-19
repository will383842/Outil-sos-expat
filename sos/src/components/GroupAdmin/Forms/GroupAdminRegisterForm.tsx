/**
 * GroupAdminRegisterForm - Dark theme registration form for Group/Community Administrators
 * Follows ChatterRegisterForm patterns: DarkInput-style glassmorphism, inline validation,
 * password strength, terms tracking, 2-step wizard
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  User,
  Mail,
  Globe,
  Lock,
  Phone,
  Link2,
  FileText,
  Users,
  BarChart3,
  ChevronDown,
  Search,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { phoneCodesData } from '@/data/phone-codes';
import { getCountryNameFromEntry as getCountryName, getFlag } from '@/utils/phoneCodeHelpers';
import {
  GroupType,
  GroupSizeTier,
  SupportedGroupAdminLanguage,
  GROUP_TYPE_LABELS,
  GROUP_SIZE_LABELS,
} from '@/types/groupAdmin';

// ============================================================================
// PASSWORD STRENGTH (same logic as ChatterRegisterForm)
// ============================================================================
const evaluatePasswordStrength = (password: string) => {
  if (!password) return { score: 0, label: '', color: '', width: '0%', feedback: [] as string[] };

  let score = 0;
  const feedback: string[] = [];

  if (password.length >= 8) score++;
  else feedback.push('8+ characters');
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  else feedback.push('uppercase letter');
  if (/[0-9]/.test(password)) score++;
  else feedback.push('number');
  if (/[^A-Za-z0-9]/.test(password)) score++;
  else feedback.push('special character');

  const normalizedScore = Math.min(score, 4);
  const strengthMap: Record<number, { label: string; color: string; width: string }> = {
    0: { label: 'Very weak', color: 'bg-red-500', width: '5%' },
    1: { label: 'Weak', color: 'bg-orange-500', width: '25%' },
    2: { label: 'Fair', color: 'bg-yellow-500', width: '50%' },
    3: { label: 'Good', color: 'bg-blue-500', width: '75%' },
    4: { label: 'Strong', color: 'bg-green-500', width: '100%' },
  };

  return { score: normalizedScore, ...strengthMap[normalizedScore], feedback: feedback.slice(0, 2) };
};

// ============================================================================
// DARK THEME STYLES (indigo accent)
// ============================================================================
const darkStyles = {
  input: `
    w-full px-4 py-3.5
    bg-white/10 border-2 border-white/10
    rounded-2xl
    text-base text-white
    placeholder:text-gray-400
    focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:ring-offset-0
    focus:border-indigo-400/50 focus:bg-white/10
    transition-all duration-200 ease-out
    disabled:opacity-50 disabled:cursor-not-allowed
  `,
  inputError: 'border-red-500/60 focus:ring-red-500/30 bg-red-500/10',
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
  dropdownSearch: 'w-full pl-9 pr-3 py-2.5 text-sm bg-white/10 text-white rounded-xl border-0 focus:ring-2 focus:ring-indigo-400/30 placeholder:text-gray-400',
};

// ============================================================================
// CONSTANTS
// ============================================================================
const SUPPORTED_LANGUAGES: { value: SupportedGroupAdminLanguage; label: string }[] = [
  { value: 'fr', label: 'Francais' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Espanol' },
  { value: 'pt', label: 'Portugues' },
  { value: 'de', label: 'Deutsch' },
  { value: 'it', label: 'Italiano' },
  { value: 'ar', label: 'Arabic' },
  { value: 'nl', label: 'Nederlands' },
  { value: 'zh', label: 'Chinese' },
];

const GROUP_TYPES: GroupType[] = [
  'travel', 'expat', 'digital_nomad', 'immigration', 'relocation',
  'language', 'country_specific', 'profession', 'family', 'student',
  'retirement',
  'affiliation', 'press', 'media', 'lawyers', 'translators', 'movers',
  'real_estate', 'insurance', 'finance', 'healthcare', 'education',
  'other',
];

const GROUP_SIZES: GroupSizeTier[] = [
  'lt1k', '1k-5k', '5k-10k', '10k-25k', '25k-50k', '50k-100k', 'gt100k',
];

const MIN_PASSWORD_LENGTH = 8;

// ============================================================================
// TYPES
// ============================================================================
export interface GroupAdminRegistrationData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  country: string;
  language: SupportedGroupAdminLanguage;
  groupUrl: string;
  groupName: string;
  groupType: GroupType | '';
  groupSize: GroupSizeTier | '';
  groupCountry: string;
  groupLanguage: SupportedGroupAdminLanguage;
  groupDescription: string;
  acceptTerms: boolean;
  termsAcceptedAt?: string;
  termsVersion?: string;
  termsType?: string;
  termsAcceptanceMeta?: {
    userAgent: string;
    language: string;
    timestamp: number;
    acceptanceMethod: string;
  };
  referralCode?: string;
}

interface GroupAdminRegisterFormProps {
  onSubmit: (data: GroupAdminRegistrationData) => Promise<void>;
  initialData?: Partial<GroupAdminRegistrationData>;
  loading?: boolean;
  error?: string | null;
  onErrorClear?: () => void;
  isLoggedIn?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================
const GroupAdminRegisterForm: React.FC<GroupAdminRegisterFormProps> = ({
  onSubmit,
  initialData,
  loading = false,
  error,
  onErrorClear,
  isLoggedIn = false,
}) => {
  const intl = useIntl();
  const { language } = useApp();
  const locale = (language || 'en') as string;

  // Load saved group URLs from localStorage
  const getSavedGroupUrls = useCallback((): string[] => {
    try {
      const saved = localStorage.getItem('groupAdmin_savedUrls');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }, []);

  const saveGroupUrl = useCallback((url: string) => {
    try {
      const saved = getSavedGroupUrls();
      // Add new URL at the beginning, remove duplicates, keep max 5
      const updated = [url, ...saved.filter(u => u !== url)].slice(0, 5);
      localStorage.setItem('groupAdmin_savedUrls', JSON.stringify(updated));
    } catch {
      // Ignore localStorage errors
    }
  }, [getSavedGroupUrls]);

  const [savedUrls] = useState<string[]>(() => getSavedGroupUrls());
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<GroupAdminRegistrationData>({
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    email: initialData?.email || '',
    password: '',
    phone: '',
    country: initialData?.country || '',
    language: 'en',
    groupUrl: savedUrls[0] || '', // Pre-fill with last used URL
    groupName: '',
    groupType: '',
    groupSize: '',
    groupCountry: '',
    groupLanguage: 'en',
    groupDescription: '',
    acceptTerms: false,
    referralCode: initialData?.referralCode,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  // Phone country state (separate from residence country)
  const [phoneCountryCode, setPhoneCountryCode] = useState<string>(initialData?.country || '');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [showUrlHistoryDropdown, setShowUrlHistoryDropdown] = useState(false);
  const urlHistoryDropdownRef = useRef<HTMLDivElement>(null);

  // Dropdown states
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showPhoneCountryDropdown, setShowPhoneCountryDropdown] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showGroupCountryDropdown, setShowGroupCountryDropdown] = useState(false);
  const [showGroupLanguageDropdown, setShowGroupLanguageDropdown] = useState(false);
  const [showGroupTypeDropdown, setShowGroupTypeDropdown] = useState(false);
  const [showGroupSizeDropdown, setShowGroupSizeDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [phoneCountrySearch, setPhoneCountrySearch] = useState('');
  const [groupCountrySearch, setGroupCountrySearch] = useState('');

  // Refs
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const phoneCountryDropdownRef = useRef<HTMLDivElement>(null);
  const languageDropdownRef = useRef<HTMLDivElement>(null);
  const groupCountryDropdownRef = useRef<HTMLDivElement>(null);
  const groupLanguageDropdownRef = useRef<HTMLDivElement>(null);
  const groupTypeDropdownRef = useRef<HTMLDivElement>(null);
  const groupSizeDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const refs = [
        { ref: countryDropdownRef, setter: setShowCountryDropdown, searchSetter: setCountrySearch },
        { ref: phoneCountryDropdownRef, setter: setShowPhoneCountryDropdown, searchSetter: setPhoneCountrySearch },
        { ref: languageDropdownRef, setter: setShowLanguageDropdown },
        { ref: groupCountryDropdownRef, setter: setShowGroupCountryDropdown, searchSetter: setGroupCountrySearch },
        { ref: groupLanguageDropdownRef, setter: setShowGroupLanguageDropdown },
        { ref: groupTypeDropdownRef, setter: setShowGroupTypeDropdown },
        { ref: groupSizeDropdownRef, setter: setShowGroupSizeDropdown },
        { ref: urlHistoryDropdownRef, setter: setShowUrlHistoryDropdown },
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

  // Filtered countries (accent-insensitive)
  const filteredCountries = useMemo(() => {
    if (!countrySearch) return phoneCodesData;
    const strip = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const search = strip(countrySearch);
    return phoneCodesData.filter(entry =>
      strip(getCountryName(entry, locale)).includes(search) ||
      entry.code.toLowerCase().includes(search)
    );
  }, [countrySearch, locale]);

  const filteredPhoneCountries = useMemo(() => {
    if (!phoneCountrySearch) return phoneCodesData;
    const strip = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const search = strip(phoneCountrySearch);
    return phoneCodesData.filter(entry =>
      strip(getCountryName(entry, locale)).includes(search) ||
      entry.code.toLowerCase().includes(search) ||
      entry.phoneCode.includes(search)
    );
  }, [phoneCountrySearch, locale]);

  const filteredGroupCountries = useMemo(() => {
    if (!groupCountrySearch) return phoneCodesData;
    const strip = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const search = strip(groupCountrySearch);
    return phoneCodesData.filter(entry =>
      strip(getCountryName(entry, locale)).includes(search) ||
      entry.code.toLowerCase().includes(search)
    );
  }, [groupCountrySearch, locale]);

  // Selected entries
  const selectedCountry = useMemo(() =>
    phoneCodesData.find(e => e.code === formData.country), [formData.country]);
  const selectedPhoneCountry = useMemo(() =>
    phoneCodesData.find(e => e.code === phoneCountryCode), [phoneCountryCode]);
  const selectedGroupCountry = useMemo(() =>
    phoneCodesData.find(e => e.code === formData.groupCountry), [formData.groupCountry]);
  const selectedLanguage = useMemo(() =>
    SUPPORTED_LANGUAGES.find(l => l.value === formData.language), [formData.language]);
  const selectedGroupLanguage = useMemo(() =>
    SUPPORTED_LANGUAGES.find(l => l.value === formData.groupLanguage), [formData.groupLanguage]);

  const passwordStrength = useMemo(() =>
    evaluatePasswordStrength(formData.password), [formData.password]);

  // Sync phone country with residence country when residence country changes
  useEffect(() => {
    if (formData.country && !phoneCountryCode) {
      setPhoneCountryCode(formData.country);
    }
  }, [formData.country, phoneCountryCode]);

  // Update formData.phone when phone number or country changes
  useEffect(() => {
    if (phoneNumber || phoneCountryCode) {
      const dialCode = selectedPhoneCountry?.phoneCode || '';
      // Format: +33612345678 (dial code + number without leading 0)
      const cleanNumber = phoneNumber.replace(/^0+/, '').replace(/\D/g, '');
      const fullPhone = cleanNumber ? `${dialCode}${cleanNumber}` : '';
      setFormData(prev => ({ ...prev, phone: fullPhone }));
    } else {
      setFormData(prev => ({ ...prev, phone: '' }));
    }
  }, [phoneNumber, phoneCountryCode, selectedPhoneCountry]);

  // Field handlers
  const handleChange = useCallback((field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    onErrorClear?.();
    if (validationErrors[field]) {
      setValidationErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    }
  }, [onErrorClear, validationErrors]);

  const handlePhoneNumberChange = useCallback((value: string) => {
    // Allow only digits, spaces, dashes, parentheses
    const cleaned = value.replace(/[^\d\s\-()]/g, '');
    setPhoneNumber(cleaned);
    onErrorClear?.();
    if (validationErrors.phone) {
      setValidationErrors(prev => { const n = { ...prev }; delete n.phone; return n; });
    }
  }, [onErrorClear, validationErrors.phone]);

  const handleBlur = useCallback((field: string) => {
    setTouchedFields(prev => new Set(prev).add(field));
  }, []);

  // Validation
  const validateStep1 = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.firstName.trim()) errors.firstName = intl.formatMessage({ id: 'form.error.required', defaultMessage: 'Required' });
    if (!formData.lastName.trim()) errors.lastName = intl.formatMessage({ id: 'form.error.required', defaultMessage: 'Required' });
    if (!formData.email.trim()) errors.email = intl.formatMessage({ id: 'form.error.required', defaultMessage: 'Required' });
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) || formData.email.length > 254) errors.email = intl.formatMessage({ id: 'form.error.emailInvalid', defaultMessage: 'Invalid email' });
    if (!isLoggedIn) {
      if (!formData.password) errors.password = intl.formatMessage({ id: 'form.error.required', defaultMessage: 'Required' });
      else if (formData.password.length < MIN_PASSWORD_LENGTH) errors.password = intl.formatMessage({ id: 'form.error.passwordTooShort', defaultMessage: 'Min {min} characters' }, { min: MIN_PASSWORD_LENGTH });
    }
    if (!formData.country) errors.country = intl.formatMessage({ id: 'form.error.required', defaultMessage: 'Required' });
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.groupUrl || !/^https?:\/\/.+/.test(formData.groupUrl))
      errors.groupUrl = intl.formatMessage({ id: 'groupadmin.register.error.groupUrlRequired', defaultMessage: 'Valid group or community URL required' });
    if (!formData.groupName || formData.groupName.length < 3)
      errors.groupName = intl.formatMessage({ id: 'groupadmin.register.error.groupNameRequired', defaultMessage: 'Group name required (min 3 chars)' });
    if (!formData.groupType) errors.groupType = intl.formatMessage({ id: 'form.error.required', defaultMessage: 'Required' });
    if (!formData.groupSize) errors.groupSize = intl.formatMessage({ id: 'form.error.required', defaultMessage: 'Required' });
    if (!formData.groupCountry) errors.groupCountry = intl.formatMessage({ id: 'form.error.required', defaultMessage: 'Required' });
    if (!formData.acceptTerms)
      errors.acceptTerms = intl.formatMessage({ id: 'groupadmin.register.error.termsRequired', defaultMessage: 'You must accept the terms' });
    setValidationErrors(prev => ({ ...prev, ...errors }));
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep2()) return;

    // Save group URL to localStorage for future use
    if (formData.groupUrl) {
      saveGroupUrl(formData.groupUrl);
    }

    const now = new Date();
    const submissionData: GroupAdminRegistrationData = {
      ...formData,
      termsAcceptedAt: now.toISOString(),
      termsVersion: '2026-02-01',
      termsType: 'cgu_group_admin',
      termsAcceptanceMeta: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        timestamp: now.getTime(),
        acceptanceMethod: 'checkbox_click',
      },
    };
    await onSubmit(submissionData);
  };

  // ============================================================================
  // REUSABLE DARK DROPDOWN COMPONENT
  // ============================================================================
  const DarkDropdown = ({
    refObj,
    isOpen,
    setIsOpen,
    selectedLabel,
    placeholder,
    icon,
    error,
    children,
  }: {
    refObj: React.RefObject<HTMLDivElement>;
    isOpen: boolean;
    setIsOpen: (v: boolean) => void;
    selectedLabel: React.ReactNode;
    placeholder: string;
    icon: React.ReactNode;
    error?: string;
    children: React.ReactNode;
  }) => (
    <div ref={refObj} className="relative">
      {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none z-10">{icon}</div>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          ${darkStyles.input}
          ${icon ? 'pl-12' : ''} pr-10 text-left min-h-[48px]
          flex items-center justify-between
          ${error ? darkStyles.inputError : selectedLabel ? darkStyles.inputFilled : ''}
        `}
      >
        <span className={selectedLabel ? '' : 'text-gray-400'}>{selectedLabel || placeholder}</span>
        <ChevronDown className={`w-5 h-5 text-gray-300 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className={darkStyles.dropdown}>
          {children}
        </div>
      )}
    </div>
  );

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error alert */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border rounded-2xl text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-4 mb-2">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${step >= 1 ? 'bg-indigo-500 text-white' : 'bg-white/10 text-gray-400'}`}>1</div>
        <div className={`w-16 h-1 rounded-full transition-colors ${step >= 2 ? 'bg-indigo-500' : 'bg-white/10'}`} />
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${step >= 2 ? 'bg-indigo-500 text-white' : 'bg-white/10 text-gray-400'}`}>2</div>
      </div>

      {/* STEP 1: Personal Info */}
      {step === 1 && (
        <div className="space-y-5">
          <h3 className="text-lg font-bold">
            <FormattedMessage id="groupadmin.register.step1.title" defaultMessage="Your Information" />
          </h3>

          {/* Name row */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={darkStyles.label}>
                <FormattedMessage id="form.firstName" defaultMessage="First name" /> <span className="text-red-400 font-bold text-lg">*</span> 
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 pointer-events-none" />
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  onBlur={() => handleBlur('firstName')}
                  placeholder={intl.formatMessage({ id: 'form.firstName.placeholder', defaultMessage: 'John' })}
                  className={`${darkStyles.input} pl-12 ${validationErrors.firstName ? darkStyles.inputError : formData.firstName ? darkStyles.inputFilled : ''}`}
                />
              </div>
              {validationErrors.firstName && <p className={darkStyles.errorText}><AlertCircle className="w-3.5 h-3.5" />{validationErrors.firstName}</p>}
            </div>

            <div className="space-y-1">
              <label className={darkStyles.label}>
                <FormattedMessage id="form.lastName" defaultMessage="Last name" /> <span className="text-red-400 font-bold text-lg">*</span> 
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 pointer-events-none" />
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  onBlur={() => handleBlur('lastName')}
                  placeholder={intl.formatMessage({ id: 'form.lastName.placeholder', defaultMessage: 'Doe' })}
                  className={`${darkStyles.input} pl-12 ${validationErrors.lastName ? darkStyles.inputError : formData.lastName ? darkStyles.inputFilled : ''}`}
                />
              </div>
              {validationErrors.lastName && <p className={darkStyles.errorText}><AlertCircle className="w-3.5 h-3.5" />{validationErrors.lastName}</p>}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className={darkStyles.label}>
              <FormattedMessage id="form.email" defaultMessage="Email" /> <span className="text-red-400 font-bold text-lg">*</span> 
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 pointer-events-none" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                onBlur={() => handleBlur('email')}
                placeholder="john@example.com"
                autoComplete="email"
                className={`${darkStyles.input} pl-12 ${validationErrors.email ? darkStyles.inputError : formData.email ? darkStyles.inputFilled : ''}`}
              />
            </div>
            {validationErrors.email && <p className={darkStyles.errorText}><AlertCircle className="w-3.5 h-3.5" />{validationErrors.email}</p>}
          </div>

          {/* Password (only if not logged in) */}
          {!isLoggedIn && (
            <div className="space-y-1">
              <label className={darkStyles.label}>
                <FormattedMessage id="form.password" defaultMessage="Password" /> <span className="text-red-400 font-bold text-lg">*</span> 
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  onBlur={() => handleBlur('password')}
                  placeholder={intl.formatMessage({ id: 'form.password.placeholder', defaultMessage: 'Min. 8 characters' })}
                  autoComplete="new-password"
                  className={`${darkStyles.input} pl-12 pr-12 ${validationErrors.password ? darkStyles.inputError : formData.password ? darkStyles.inputFilled : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {/* Password strength indicator */}
              {formData.password && (
                <div className="mt-2">
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full ${passwordStrength.color} rounded-full transition-all duration-300`} style={{ width: passwordStrength.width }} />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs">{passwordStrength.label}</span>
                    {passwordStrength.feedback.length > 0 && (
                      <span className="text-xs">
                        <FormattedMessage id="form.password.add" defaultMessage="Add:" /> {passwordStrength.feedback.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              )}
              {validationErrors.password && <p className={darkStyles.errorText}><AlertCircle className="w-3.5 h-3.5" />{validationErrors.password}</p>}
            </div>
          )}

          {/* Phone (optional) with country code selector */}
          <div className="space-y-1">
            <label className={darkStyles.label}>
              <FormattedMessage id="groupadmin.register.phone" defaultMessage="Phone (optional)" />
            </label>
            <div className="grid gap-2">
              {/* Country code dropdown */}
              <div className="col-span-5">
                <DarkDropdown
                  refObj={phoneCountryDropdownRef}
                  isOpen={showPhoneCountryDropdown}
                  setIsOpen={setShowPhoneCountryDropdown}
                  selectedLabel={selectedPhoneCountry ? (
                    <span className="flex items-center gap-2">
                      <span className="text-lg">{getFlag(selectedPhoneCountry.code)}</span>
                      <span className="text-white font-medium">{selectedPhoneCountry.phoneCode}</span>
                    </span>
                  ) : null}
                  placeholder={intl.formatMessage({ id: 'form.phone.selectCountry', defaultMessage: 'Code' })}
                  icon={<Globe className="w-5 h-5" />}
                >
                  <div className="p-2 border-b">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                      <input
                        type="text"
                        value={phoneCountrySearch}
                        onChange={(e) => setPhoneCountrySearch(e.target.value)}
                        placeholder={intl.formatMessage({ id: 'form.search.country', defaultMessage: 'Search...' })}
                        className={darkStyles.dropdownSearch}
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-[280px] overflow-y-auto">
                    {filteredPhoneCountries.map(entry => (
                      <button
                        key={entry.code}
                        type="button"
                        onClick={() => {
                          setPhoneCountryCode(entry.code);
                          setShowPhoneCountryDropdown(false);
                          setPhoneCountrySearch('');
                        }}
                        className={`${darkStyles.dropdownItem} ${entry.code === phoneCountryCode ? 'bg-indigo-500/10' : ''}`}
                      >
                        <span className="text-xl">{getFlag(entry.code)}</span>
                        <span className="flex-1 text-left">{getCountryName(entry, locale)}</span>
                        <span className="text-xs">{entry.phoneCode}</span>
                        {entry.code === phoneCountryCode && <Check className="w-4 h-4 text-indigo-400" />}
                      </button>
                    ))}
                  </div>
                </DarkDropdown>
              </div>

              {/* Phone number input */}
              <div className="col-span-7">
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 pointer-events-none z-10" />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => handlePhoneNumberChange(e.target.value)}
                    onBlur={() => handleBlur('phone')}
                    placeholder={intl.formatMessage({ id: 'form.phone.placeholder', defaultMessage: '612345678' })}
                    className={`${darkStyles.input} pl-12 ${phoneNumber ? darkStyles.inputFilled : ''}`}
                    inputMode="tel"
                  />
                </div>
              </div>
            </div>
            {/* Display full formatted phone number */}
            {formData.phone && (
              <p className="text-xs mt-1">
                <FormattedMessage id="form.phone.formatted" defaultMessage="Full number:" /> <span className="text-white font-mono">{formData.phone}</span>
              </p>
            )}
          </div>

          {/* Country + Language row */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Country dropdown */}
            <div className="space-y-1">
              <label className={darkStyles.label}>
                <FormattedMessage id="form.country" defaultMessage="Country" /> <span className="text-red-400 font-bold text-lg">*</span> 
              </label>
              <DarkDropdown
                refObj={countryDropdownRef}
                isOpen={showCountryDropdown}
                setIsOpen={setShowCountryDropdown}
                selectedLabel={selectedCountry ? (
                  <span className="flex items-center gap-2">
                    <span className="text-lg">{getFlag(selectedCountry.code)}</span>
                    <span className="truncate">{getCountryName(selectedCountry, locale)}</span>
                  </span>
                ) : null}
                placeholder={intl.formatMessage({ id: 'form.country.placeholder', defaultMessage: 'Select country' })}
                icon={<Globe className="w-5 h-5" />}
                error={validationErrors.country}
              >
                <div className="p-2 border-b">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <input
                      type="text"
                      value={countrySearch}
                      onChange={(e) => setCountrySearch(e.target.value)}
                      placeholder={intl.formatMessage({ id: 'form.search.country', defaultMessage: 'Search...' })}
                      className={darkStyles.dropdownSearch}
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
                        handleChange('country', entry.code);
                        setShowCountryDropdown(false);
                        setCountrySearch('');
                      }}
                      className={`${darkStyles.dropdownItem} ${entry.code === formData.country ? 'bg-indigo-500/20' : ''}`}
                    >
                      <span className="text-xl">{getFlag(entry.code)}</span>
                      <span className="flex-1 text-sm">{getCountryName(entry, locale)}</span>
                      {entry.code === formData.country && <Check className="w-4 h-4 text-indigo-400" />}
                    </button>
                  ))}
                </div>
              </DarkDropdown>
              {validationErrors.country && <p className={darkStyles.errorText}><AlertCircle className="w-3.5 h-3.5" />{validationErrors.country}</p>}
            </div>

            {/* Language dropdown */}
            <div className="space-y-1">
              <label className={darkStyles.label}>
                <FormattedMessage id="form.language" defaultMessage="Language" /> <span className="text-red-400 font-bold text-lg">*</span> 
              </label>
              <DarkDropdown
                refObj={languageDropdownRef}
                isOpen={showLanguageDropdown}
                setIsOpen={setShowLanguageDropdown}
                selectedLabel={selectedLanguage ? selectedLanguage.label : null}
                placeholder={intl.formatMessage({ id: 'form.select.placeholder', defaultMessage: 'Select...' })}
                icon={null}
                error={undefined}
              >
                <div className="max-h-[280px] overflow-y-auto overscroll-contain">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang.value}
                      type="button"
                      onClick={() => {
                        handleChange('language', lang.value);
                        setShowLanguageDropdown(false);
                      }}
                      className={`${darkStyles.dropdownItem} ${lang.value === formData.language ? 'bg-indigo-500/20' : ''}`}
                    >
                      <span className="flex-1 text-sm">{lang.label}</span>
                      {lang.value === formData.language && <Check className="w-4 h-4 text-indigo-400" />}
                    </button>
                  ))}
                </div>
              </DarkDropdown>
            </div>
          </div>

          {/* Next button */}
          <button
            type="button"
            onClick={handleNextStep}
            className="w-full py-4 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white font-bold rounded-2xl shadow-lg hover:shadow-indigo-500/30 transition-all duration-200 flex items-center justify-center gap-2 min-h-[48px]"
          >
            <FormattedMessage id="groupadmin.register.next" defaultMessage="Next" />
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* STEP 2: Group Info */}
      {step === 2 && (
        <div className="space-y-5">
          <h3 className="text-lg font-bold">
            <FormattedMessage id="groupadmin.register.step2.title" defaultMessage="Your Group / Community" />
          </h3>

          {/* Group URL with history */}
          <div className="space-y-1">
            <label className={darkStyles.label}>
              <FormattedMessage id="groupadmin.register.groupUrl" defaultMessage="Group / Community URL" /> <span className="text-red-400 font-bold text-lg">*</span> 
              {savedUrls.length > 0 && (
                <span className="ml-2 text-xs">
                  <FormattedMessage id="groupadmin.register.groupUrl.prefilled" defaultMessage="(pre-filled from history)" />
                </span>
              )}
            </label>
            <div className="relative" ref={urlHistoryDropdownRef}>
              <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 pointer-events-none z-10" />
              <input
                type="url"
                value={formData.groupUrl}
                onChange={(e) => handleChange('groupUrl', e.target.value)}
                onBlur={() => handleBlur('groupUrl')}
                placeholder="https://www.facebook.com/groups/... or any group URL"
                className={`${darkStyles.input} pl-12 ${savedUrls.length > 0 ? 'pr-10' : ''} ${validationErrors.groupUrl ? darkStyles.inputError : formData.groupUrl ? darkStyles.inputFilled : ''}`}
              />
              {/* History button */}
              {savedUrls.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowUrlHistoryDropdown(!showUrlHistoryDropdown)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-indigo-400 transition-colors p-1 rounded-lg hover:bg-white/10 z-10"
                  title={intl.formatMessage({ id: 'groupadmin.register.groupUrl.showHistory', defaultMessage: 'Show history' })}
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${showUrlHistoryDropdown ? 'rotate-180' : ''}`} />
                </button>
              )}

              {/* History dropdown */}
              {showUrlHistoryDropdown && savedUrls.length > 0 && (
                <div className={darkStyles.dropdown}>
                  <div className="p-2 border-b">
                    <p className="text-xs">
                      <FormattedMessage id="groupadmin.register.groupUrl.history" defaultMessage="Previously used URLs:" />
                    </p>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto">
                    {savedUrls.map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          handleChange('groupUrl', url);
                          setShowUrlHistoryDropdown(false);
                        }}
                        className={`${darkStyles.dropdownItem} ${url === formData.groupUrl ? 'bg-indigo-500/10' : ''}`}
                      >
                        <Link2 className="w-4 h-4 text-gray-300 flex-shrink-0" />
                        <span className="flex-1 text-sm truncate">{url}</span>
                        {url === formData.groupUrl && <Check className="w-4 h-4 text-indigo-400 flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {validationErrors.groupUrl && <p className={darkStyles.errorText}><AlertCircle className="w-3.5 h-3.5" />{validationErrors.groupUrl}</p>}
          </div>

          {/* Group Name */}
          <div className="space-y-1">
            <label className={darkStyles.label}>
              <FormattedMessage id="groupadmin.register.groupName" defaultMessage="Group Name" /> <span className="text-red-400 font-bold text-lg">*</span> 
            </label>
            <div className="relative">
              <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 pointer-events-none" />
              <input
                type="text"
                value={formData.groupName}
                onChange={(e) => handleChange('groupName', e.target.value)}
                onBlur={() => handleBlur('groupName')}
                placeholder={intl.formatMessage({ id: 'groupadmin.register.groupName.placeholder', defaultMessage: 'Expats in Paris' })}
                className={`${darkStyles.input} pl-12 ${validationErrors.groupName ? darkStyles.inputError : formData.groupName ? darkStyles.inputFilled : ''}`}
              />
            </div>
            {validationErrors.groupName && <p className={darkStyles.errorText}><AlertCircle className="w-3.5 h-3.5" />{validationErrors.groupName}</p>}
          </div>

          {/* Group Type + Group Size */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Group Type */}
            <div className="space-y-1">
              <label className={darkStyles.label}>
                <FormattedMessage id="groupadmin.register.groupType" defaultMessage="Group Type" /> <span className="text-red-400 font-bold text-lg">*</span> 
              </label>
              <DarkDropdown
                refObj={groupTypeDropdownRef}
                isOpen={showGroupTypeDropdown}
                setIsOpen={setShowGroupTypeDropdown}
                selectedLabel={formData.groupType ? GROUP_TYPE_LABELS[formData.groupType as GroupType]?.en : null}
                placeholder={intl.formatMessage({ id: 'form.select.placeholder', defaultMessage: 'Select...' })}
                icon={<Users className="w-5 h-5" />}
                error={validationErrors.groupType}
              >
                <div className="max-h-[280px] overflow-y-auto overscroll-contain">
                  {GROUP_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        handleChange('groupType', type);
                        setShowGroupTypeDropdown(false);
                      }}
                      className={`${darkStyles.dropdownItem} ${type === formData.groupType ? 'bg-indigo-500/20' : ''}`}
                    >
                      <span className="flex-1 text-sm">{GROUP_TYPE_LABELS[type]?.en || type}</span>
                      {type === formData.groupType && <Check className="w-4 h-4 text-indigo-400" />}
                    </button>
                  ))}
                </div>
              </DarkDropdown>
              {validationErrors.groupType && <p className={darkStyles.errorText}><AlertCircle className="w-3.5 h-3.5" />{validationErrors.groupType}</p>}
            </div>

            {/* Group Size */}
            <div className="space-y-1">
              <label className={darkStyles.label}>
                <FormattedMessage id="groupadmin.register.groupSize" defaultMessage="Group Size" /> <span className="text-red-400 font-bold text-lg">*</span> 
              </label>
              <DarkDropdown
                refObj={groupSizeDropdownRef}
                isOpen={showGroupSizeDropdown}
                setIsOpen={setShowGroupSizeDropdown}
                selectedLabel={formData.groupSize ? GROUP_SIZE_LABELS[formData.groupSize as GroupSizeTier] : null}
                placeholder={intl.formatMessage({ id: 'form.select.placeholder', defaultMessage: 'Select...' })}
                icon={<BarChart3 className="w-5 h-5" />}
                error={validationErrors.groupSize}
              >
                <div className="max-h-[280px] overflow-y-auto overscroll-contain">
                  {GROUP_SIZES.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        handleChange('groupSize', size);
                        setShowGroupSizeDropdown(false);
                      }}
                      className={`${darkStyles.dropdownItem} ${size === formData.groupSize ? 'bg-indigo-500/20' : ''}`}
                    >
                      <span className="flex-1 text-sm">{GROUP_SIZE_LABELS[size]}</span>
                      {size === formData.groupSize && <Check className="w-4 h-4 text-indigo-400" />}
                    </button>
                  ))}
                </div>
              </DarkDropdown>
              {validationErrors.groupSize && <p className={darkStyles.errorText}><AlertCircle className="w-3.5 h-3.5" />{validationErrors.groupSize}</p>}
            </div>
          </div>

          {/* Group Country + Group Language */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Group Country */}
            <div className="space-y-1">
              <label className={darkStyles.label}>
                <FormattedMessage id="groupadmin.register.groupCountry" defaultMessage="Group Country" /> <span className="text-red-400 font-bold text-lg">*</span> 
              </label>
              <DarkDropdown
                refObj={groupCountryDropdownRef}
                isOpen={showGroupCountryDropdown}
                setIsOpen={setShowGroupCountryDropdown}
                selectedLabel={selectedGroupCountry ? (
                  <span className="flex items-center gap-2">
                    <span className="text-lg">{getFlag(selectedGroupCountry.code)}</span>
                    <span className="truncate">{getCountryName(selectedGroupCountry, locale)}</span>
                  </span>
                ) : null}
                placeholder={intl.formatMessage({ id: 'form.country.placeholder', defaultMessage: 'Select country' })}
                icon={<Globe className="w-5 h-5" />}
                error={validationErrors.groupCountry}
              >
                <div className="p-2 border-b">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <input
                      type="text"
                      value={groupCountrySearch}
                      onChange={(e) => setGroupCountrySearch(e.target.value)}
                      placeholder={intl.formatMessage({ id: 'form.search.country', defaultMessage: 'Search...' })}
                      className={darkStyles.dropdownSearch}
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-[280px] overflow-y-auto overscroll-contain">
                  {filteredGroupCountries.map((entry) => (
                    <button
                      key={entry.code}
                      type="button"
                      onClick={() => {
                        handleChange('groupCountry', entry.code);
                        setShowGroupCountryDropdown(false);
                        setGroupCountrySearch('');
                      }}
                      className={`${darkStyles.dropdownItem} ${entry.code === formData.groupCountry ? 'bg-indigo-500/20' : ''}`}
                    >
                      <span className="text-xl">{getFlag(entry.code)}</span>
                      <span className="flex-1 text-sm">{getCountryName(entry, locale)}</span>
                      {entry.code === formData.groupCountry && <Check className="w-4 h-4 text-indigo-400" />}
                    </button>
                  ))}
                </div>
              </DarkDropdown>
              {validationErrors.groupCountry && <p className={darkStyles.errorText}><AlertCircle className="w-3.5 h-3.5" />{validationErrors.groupCountry}</p>}
            </div>

            {/* Group Language */}
            <div className="space-y-1">
              <label className={darkStyles.label}>
                <FormattedMessage id="groupadmin.register.groupLanguage" defaultMessage="Group Language" />
              </label>
              <DarkDropdown
                refObj={groupLanguageDropdownRef}
                isOpen={showGroupLanguageDropdown}
                setIsOpen={setShowGroupLanguageDropdown}
                selectedLabel={selectedGroupLanguage ? selectedGroupLanguage.label : null}
                placeholder={intl.formatMessage({ id: 'form.select.placeholder', defaultMessage: 'Select...' })}
                icon={null}
                error={undefined}
              >
                <div className="max-h-[280px] overflow-y-auto overscroll-contain">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang.value}
                      type="button"
                      onClick={() => {
                        handleChange('groupLanguage', lang.value);
                        setShowGroupLanguageDropdown(false);
                      }}
                      className={`${darkStyles.dropdownItem} ${lang.value === formData.groupLanguage ? 'bg-indigo-500/20' : ''}`}
                    >
                      <span className="flex-1 text-sm">{lang.label}</span>
                      {lang.value === formData.groupLanguage && <Check className="w-4 h-4 text-indigo-400" />}
                    </button>
                  ))}
                </div>
              </DarkDropdown>
            </div>
          </div>

          {/* Group Description */}
          <div className="space-y-1">
            <label className={darkStyles.label}>
              <FormattedMessage id="groupadmin.register.groupDescription" defaultMessage="Group Description (optional)" />
            </label>
            <textarea
              value={formData.groupDescription}
              onChange={(e) => handleChange('groupDescription', e.target.value)}
              rows={3}
              maxLength={500}
              placeholder={intl.formatMessage({ id: 'groupadmin.register.groupDescription.placeholder', defaultMessage: 'Brief description of your group...' })}
              className={`${darkStyles.input} resize-none ${formData.groupDescription ? darkStyles.inputFilled : ''}`}
            />
            <div className="flex justify-end">
              <span className={`text-xs ${formData.groupDescription.length >= 500 ? 'text-red-400' : 'text-gray-400'}`}>
                {formData.groupDescription.length}/500
              </span>
            </div>
          </div>

          {/* Terms acceptance */}
          <div className="p-4 bg-white/10 border rounded-2xl">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative flex-shrink-0 mt-0.5">
                <input
                  type="checkbox"
                  checked={formData.acceptTerms}
                  onChange={(e) => handleChange('acceptTerms', e.target.checked)}
                  className="w-5 h-5 rounded-md border-2 bg-white/10 text-indigo-500 focus:ring-2 transition-all duration-200"
                />
              </div>
              <span className="text-sm group-hover:text-white transition-colors">
                <FormattedMessage
                  id="groupadmin.register.terms"
                  defaultMessage="I accept the {terms} and {privacy}"
                  values={{
                    terms: <a href="/terms" className="text-indigo-400 hover:text-indigo-300 underline">Terms of Service</a>,
                    privacy: <a href="/privacy-policy" className="text-indigo-400 hover:text-indigo-300 underline">Privacy Policy</a>,
                  }}
                />
              </span>
            </label>
            {validationErrors.acceptTerms && <p className={`${darkStyles.errorText} mt-2 ml-8`}><AlertCircle className="w-3.5 h-3.5" />{validationErrors.acceptTerms}</p>}
          </div>

          {/* Action buttons */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => { setStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="flex-1 py-4 bg-white/10 hover:bg-white/10 text-white font-medium rounded-2xl transition-colors items-center justify-center gap-2 min-h-[48px] border"
            >
              <ArrowLeft className="w-5 h-5" />
              <FormattedMessage id="groupadmin.register.back" defaultMessage="Back" />
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-4 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-lg hover:shadow-indigo-500/30 transition-all duration-200 items-center justify-center gap-2 min-h-[48px]"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 rounded-full animate-spin" />
                  <FormattedMessage id="groupadmin.register.submitting" defaultMessage="Submitting..." />
                </>
              ) : (
                <>
                  <FormattedMessage id="groupadmin.register.submit" defaultMessage="Create Account" />
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </form>
  );
};

export default GroupAdminRegisterForm;
