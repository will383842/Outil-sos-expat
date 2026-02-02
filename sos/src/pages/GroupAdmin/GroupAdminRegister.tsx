/**
 * GroupAdminRegister - Registration Page for Facebook Group Administrators
 */

import React, { useState, useEffect } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useSearchParams } from 'react-router-dom';
import { useLocaleNavigate } from '@/multilingual-system';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import SEOHead from '@/components/layout/SEOHead';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';
import {
  CheckCircle,
  ArrowRight,
  AlertCircle,
  Loader2,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  GroupType,
  GroupSizeTier,
  SupportedGroupAdminLanguage,
  GROUP_TYPE_LABELS,
  GROUP_SIZE_LABELS,
} from '@/types/groupAdmin';

// ============================================================================
// CONSTANTS
// ============================================================================
const SUPPORTED_LANGUAGES: SupportedGroupAdminLanguage[] = [
  'fr', 'en', 'es', 'pt', 'ar', 'de', 'it', 'nl', 'zh'
];

const LANGUAGE_LABELS: Record<SupportedGroupAdminLanguage, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
  pt: 'Português',
  ar: 'العربية',
  de: 'Deutsch',
  it: 'Italiano',
  nl: 'Nederlands',
  zh: '中文',
};

const GROUP_TYPES: GroupType[] = [
  'travel', 'expat', 'digital_nomad', 'immigration', 'relocation',
  'language', 'country_specific', 'profession', 'family', 'student',
  'retirement', 'other'
];

const GROUP_SIZES: GroupSizeTier[] = [
  'lt1k', '1k-5k', '5k-10k', '10k-25k', '25k-50k', '50k-100k', 'gt100k'
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const GroupAdminRegister: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const { user, register } = useAuth();
  const [searchParams] = useSearchParams();
  const recruitmentCode = searchParams.get('ref') || '';

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [affiliateCodes, setAffiliateCodes] = useState<{ client: string; recruitment: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    // Personal info
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    country: '',
    language: 'en' as SupportedGroupAdminLanguage,

    // Group info
    groupUrl: '',
    groupName: '',
    groupType: '' as GroupType | '',
    groupSize: '' as GroupSizeTier | '',
    groupCountry: '',
    groupLanguage: 'en' as SupportedGroupAdminLanguage,
    groupDescription: '',

    // Terms
    acceptTerms: false,
  });

  // Pre-fill from user data if logged in
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        country: user.country || '',
      }));
    }
  }, [user]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const validateStep1 = (): boolean => {
    if (!formData.firstName || !formData.lastName) {
      setError(intl.formatMessage({ id: 'groupadmin.register.error.nameRequired', defaultMessage: 'First and last name are required' }));
      return false;
    }
    if (!formData.email || !formData.email.includes('@')) {
      setError(intl.formatMessage({ id: 'groupadmin.register.error.emailRequired', defaultMessage: 'Valid email is required' }));
      return false;
    }
    // Validate password only if user is not already logged in
    if (!user) {
      if (!formData.password || formData.password.length < 6) {
        setError(intl.formatMessage({ id: 'groupadmin.register.error.passwordMin', defaultMessage: 'Password must be at least 6 characters' }));
        return false;
      }
    }
    if (!formData.country) {
      setError(intl.formatMessage({ id: 'groupadmin.register.error.countryRequired', defaultMessage: 'Country is required' }));
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!formData.groupUrl || !formData.groupUrl.includes('facebook.com/groups/')) {
      setError(intl.formatMessage({ id: 'groupadmin.register.error.groupUrlRequired', defaultMessage: 'Valid Facebook group URL is required' }));
      return false;
    }
    if (!formData.groupName || formData.groupName.length < 3) {
      setError(intl.formatMessage({ id: 'groupadmin.register.error.groupNameRequired', defaultMessage: 'Group name is required (min 3 characters)' }));
      return false;
    }
    if (!formData.groupType) {
      setError(intl.formatMessage({ id: 'groupadmin.register.error.groupTypeRequired', defaultMessage: 'Group type is required' }));
      return false;
    }
    if (!formData.groupSize) {
      setError(intl.formatMessage({ id: 'groupadmin.register.error.groupSizeRequired', defaultMessage: 'Group size is required' }));
      return false;
    }
    if (!formData.groupCountry) {
      setError(intl.formatMessage({ id: 'groupadmin.register.error.groupCountryRequired', defaultMessage: 'Group country is required' }));
      return false;
    }
    if (!formData.acceptTerms) {
      setError(intl.formatMessage({ id: 'groupadmin.register.error.termsRequired', defaultMessage: 'You must accept the terms and conditions' }));
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Step 1: Create Firebase Auth account if user is not logged in
      if (!user) {
        try {
          await register({
            email: formData.email,
            firstName: formData.firstName,
            lastName: formData.lastName,
            role: 'groupAdmin',
          }, formData.password);
        } catch (authErr: unknown) {
          const authError = authErr as { message?: string; code?: string };
          if (authError.message?.includes('email-already-in-use') || authError.code === 'auth/email-already-in-use') {
            setError(intl.formatMessage({ id: 'groupadmin.register.error.emailInUse', defaultMessage: 'This email is already in use. Please log in instead.' }));
          } else if (authError.message?.includes('weak-password') || authError.code === 'auth/weak-password') {
            setError(intl.formatMessage({ id: 'groupadmin.register.error.weakPassword', defaultMessage: 'Password is too weak. Please use at least 6 characters.' }));
          } else if (authError.message?.includes('invalid-email') || authError.code === 'auth/invalid-email') {
            setError(intl.formatMessage({ id: 'groupadmin.register.error.invalidEmail', defaultMessage: 'Invalid email address.' }));
          } else {
            setError(authError.message || intl.formatMessage({ id: 'groupadmin.register.error.authFailed', defaultMessage: 'Account creation failed. Please try again.' }));
          }
          setIsSubmitting(false);
          return;
        }
      }

      // Step 2: Call Cloud Function to create group admin profile
      const registerGroupAdmin = httpsCallable(functions, 'registerGroupAdmin');
      const result = await registerGroupAdmin({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || undefined,
        country: formData.country.toUpperCase(),
        language: formData.language,
        groupUrl: formData.groupUrl,
        groupName: formData.groupName,
        groupType: formData.groupType,
        groupSize: formData.groupSize,
        groupCountry: formData.groupCountry.toUpperCase(),
        groupLanguage: formData.groupLanguage,
        groupDescription: formData.groupDescription || undefined,
        recruitmentCode: recruitmentCode || undefined,
      });

      const data = result.data as { success: boolean; affiliateCodeClient: string; affiliateCodeRecruitment: string };

      if (data.success) {
        setSuccess(true);
        setAffiliateCodes({
          client: data.affiliateCodeClient,
          recruitment: data.affiliateCodeRecruitment,
        });
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success screen
  if (success && affiliateCodes) {
    return (
      <Layout>
        <SEOHead title={intl.formatMessage({ id: 'groupadmin.register.success.title', defaultMessage: 'Welcome to SOS-Expat!' })} description="Registration complete - Start earning with SOS-Expat" />
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              <FormattedMessage id="groupadmin.register.success.heading" defaultMessage="Registration Complete!" />
            </h1>
            <p className="text-gray-600 mb-6">
              <FormattedMessage id="groupadmin.register.success.message" defaultMessage="Your account has been created. Here are your affiliate codes:" />
            </p>

            <div className="space-y-4 mb-8">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-1">
                  <FormattedMessage id="groupadmin.register.success.clientCode" defaultMessage="Client Referral Code" />
                </div>
                <div className="font-mono text-lg font-bold text-indigo-600">{affiliateCodes.client}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-1">
                  <FormattedMessage id="groupadmin.register.success.recruitCode" defaultMessage="Admin Recruitment Code" />
                </div>
                <div className="font-mono text-lg font-bold text-purple-600">{affiliateCodes.recruitment}</div>
              </div>
            </div>

            <button
              onClick={() => navigate('/group-admin/tableau-de-bord')}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <FormattedMessage id="groupadmin.register.success.goToDashboard" defaultMessage="Go to Dashboard" />
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEOHead title={intl.formatMessage({ id: 'groupadmin.register.seo.title', defaultMessage: 'Register as Group Admin | SOS-Expat' })} description="Join SOS-Expat as a Group Admin and earn commissions" />

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4">
        <div className="max-w-xl mx-auto">
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>1</div>
            <div className={`w-20 h-1 ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-200'}`} />
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Header */}
            <h1 className="text-2xl font-bold text-center mb-2">
              {step === 1 ? (
                <FormattedMessage id="groupadmin.register.step1.title" defaultMessage="Your Information" />
              ) : (
                <FormattedMessage id="groupadmin.register.step2.title" defaultMessage="Your Facebook Group" />
              )}
            </h1>
            <p className="text-gray-500 text-center mb-8">
              {step === 1 ? (
                <FormattedMessage id="groupadmin.register.step1.subtitle" defaultMessage="Tell us about yourself" />
              ) : (
                <FormattedMessage id="groupadmin.register.step2.subtitle" defaultMessage="Tell us about your group" />
              )}
            </p>

            {/* Error message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            )}

            {/* Step 1: Personal Info */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <FormattedMessage id="groupadmin.register.firstName" defaultMessage="First Name" />
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder={intl.formatMessage({ id: 'groupadmin.register.firstName.placeholder', defaultMessage: 'John' })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <FormattedMessage id="groupadmin.register.lastName" defaultMessage="Last Name" />
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder={intl.formatMessage({ id: 'groupadmin.register.lastName.placeholder', defaultMessage: 'Doe' })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <FormattedMessage id="groupadmin.register.email" defaultMessage="Email" />
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="john@example.com"
                  />
                </div>

                {/* Password field - only show if user is not logged in */}
                {!user && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <span className="flex items-center gap-1.5">
                        <Lock className="w-4 h-4" />
                        <FormattedMessage id="groupadmin.register.password" defaultMessage="Password" />
                        <span className="text-red-500">*</span>
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder={intl.formatMessage({ id: 'groupadmin.register.password.placeholder', defaultMessage: 'Min. 6 characters' })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      <FormattedMessage id="groupadmin.register.password.hint" defaultMessage="Password must be at least 6 characters" />
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <FormattedMessage id="groupadmin.register.phone" defaultMessage="Phone (optional)" />
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="+1 234 567 8900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <FormattedMessage id="groupadmin.register.country" defaultMessage="Country" />
                    </label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => handleInputChange('country', e.target.value.toUpperCase().slice(0, 2))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="US"
                      maxLength={2}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      <FormattedMessage id="groupadmin.register.country.hint" defaultMessage="2-letter code (e.g., US, FR, DE)" />
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <FormattedMessage id="groupadmin.register.language" defaultMessage="Language" />
                    </label>
                    <select
                      value={formData.language}
                      onChange={(e) => handleInputChange('language', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <option key={lang} value={lang}>{LANGUAGE_LABELS[lang]}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleNextStep}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <FormattedMessage id="groupadmin.register.next" defaultMessage="Next" />
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Step 2: Group Info */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <FormattedMessage id="groupadmin.register.groupUrl" defaultMessage="Facebook Group URL" />
                  </label>
                  <input
                    type="url"
                    value={formData.groupUrl}
                    onChange={(e) => handleInputChange('groupUrl', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="https://www.facebook.com/groups/..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <FormattedMessage id="groupadmin.register.groupName" defaultMessage="Group Name" />
                  </label>
                  <input
                    type="text"
                    value={formData.groupName}
                    onChange={(e) => handleInputChange('groupName', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder={intl.formatMessage({ id: 'groupadmin.register.groupName.placeholder', defaultMessage: 'Expats in Paris' })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <FormattedMessage id="groupadmin.register.groupType" defaultMessage="Group Type" />
                    </label>
                    <select
                      value={formData.groupType}
                      onChange={(e) => handleInputChange('groupType', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">
                        {intl.formatMessage({ id: 'groupadmin.register.groupType.select', defaultMessage: 'Select...' })}
                      </option>
                      {GROUP_TYPES.map((type) => (
                        <option key={type} value={type}>{GROUP_TYPE_LABELS[type].en}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <FormattedMessage id="groupadmin.register.groupSize" defaultMessage="Group Size" />
                    </label>
                    <select
                      value={formData.groupSize}
                      onChange={(e) => handleInputChange('groupSize', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">
                        {intl.formatMessage({ id: 'groupadmin.register.groupSize.select', defaultMessage: 'Select...' })}
                      </option>
                      {GROUP_SIZES.map((size) => (
                        <option key={size} value={size}>{GROUP_SIZE_LABELS[size]}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <FormattedMessage id="groupadmin.register.groupCountry" defaultMessage="Group Country" />
                    </label>
                    <input
                      type="text"
                      value={formData.groupCountry}
                      onChange={(e) => handleInputChange('groupCountry', e.target.value.toUpperCase().slice(0, 2))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="FR"
                      maxLength={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <FormattedMessage id="groupadmin.register.groupLanguage" defaultMessage="Group Language" />
                    </label>
                    <select
                      value={formData.groupLanguage}
                      onChange={(e) => handleInputChange('groupLanguage', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <option key={lang} value={lang}>{LANGUAGE_LABELS[lang]}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <FormattedMessage id="groupadmin.register.groupDescription" defaultMessage="Group Description (optional)" />
                  </label>
                  <textarea
                    value={formData.groupDescription}
                    onChange={(e) => handleInputChange('groupDescription', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    rows={3}
                    placeholder={intl.formatMessage({ id: 'groupadmin.register.groupDescription.placeholder', defaultMessage: 'Brief description of your group...' })}
                  />
                </div>

                {/* Terms checkbox */}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.acceptTerms}
                    onChange={(e) => handleInputChange('acceptTerms', e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mt-0.5"
                  />
                  <span className="text-sm text-gray-600">
                    <FormattedMessage
                      id="groupadmin.register.terms"
                      defaultMessage="I accept the {terms} and {privacy}"
                      values={{
                        terms: <a href="/terms" className="text-indigo-600 hover:underline">Terms of Service</a>,
                        privacy: <a href="/privacy-policy" className="text-indigo-600 hover:underline">Privacy Policy</a>,
                      }}
                    />
                  </span>
                </label>

                <div className="flex gap-4">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-6 rounded-lg transition-colors"
                  >
                    <FormattedMessage id="groupadmin.register.back" defaultMessage="Back" />
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
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

                {user && (
                  <p className="text-center text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                    <FormattedMessage id="groupadmin.register.loggedInAs" defaultMessage="You are logged in as {email}" values={{ email: user.email }} />
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Recruitment code info */}
          {recruitmentCode && (
            <div className="mt-4 p-4 bg-purple-50 border border-purple-100 rounded-lg text-center">
              <p className="text-sm text-purple-700">
                <FormattedMessage
                  id="groupadmin.register.recruitedBy"
                  defaultMessage="You were invited with code: {code}"
                  values={{ code: <span className="font-mono font-bold">{recruitmentCode}</span> }}
                />
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default GroupAdminRegister;
