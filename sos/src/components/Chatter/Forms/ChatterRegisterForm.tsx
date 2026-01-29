/**
 * ChatterRegisterForm - Registration form for becoming a chatter
 * Collects required information for chatter registration
 */

import React, { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { User, Mail, Phone, Globe, AlertCircle, Loader2, ChevronDown } from 'lucide-react';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  input: "w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all",
  label: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1",
  button: {
    primary: "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed",
  },
} as const;

// Supported languages for chatters
const SUPPORTED_LANGUAGES = [
  { code: 'fr', name: 'Français' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'de', name: 'Deutsch' },
  { code: 'pt', name: 'Português' },
  { code: 'ar', name: 'العربية' },
];

// Countries (simplified list)
const COUNTRIES = [
  { code: 'SN', name: 'Sénégal' },
  { code: 'CI', name: "Côte d'Ivoire" },
  { code: 'CM', name: 'Cameroun' },
  { code: 'MA', name: 'Maroc' },
  { code: 'TN', name: 'Tunisie' },
  { code: 'DZ', name: 'Algérie' },
  { code: 'FR', name: 'France' },
  { code: 'BE', name: 'Belgique' },
  { code: 'CH', name: 'Suisse' },
  { code: 'CA', name: 'Canada' },
  { code: 'US', name: 'États-Unis' },
  { code: 'GB', name: 'Royaume-Uni' },
  { code: 'DE', name: 'Allemagne' },
  { code: 'ES', name: 'Espagne' },
  { code: 'PT', name: 'Portugal' },
  { code: 'IT', name: 'Italie' },
  { code: 'ML', name: 'Mali' },
  { code: 'BF', name: 'Burkina Faso' },
  { code: 'GN', name: 'Guinée' },
  { code: 'KE', name: 'Kenya' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'GH', name: 'Ghana' },
];

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
  phone: string;
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

  const [formData, setFormData] = useState<ChatterRegistrationData>({
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    country: initialData?.country || '',
    languages: initialData?.languages || ['fr'],
    referralCode: initialData?.referralCode || '',
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Handle language toggle
  const toggleLanguage = (langCode: string) => {
    setFormData(prev => {
      const languages = prev.languages.includes(langCode)
        ? prev.languages.filter(l => l !== langCode)
        : [...prev.languages, langCode];
      // Ensure at least one language is selected
      return { ...prev, languages: languages.length > 0 ? languages : prev.languages };
    });
  };

  // Validate form
  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      errors.firstName = intl.formatMessage({ id: 'chatter.register.error.firstName', defaultMessage: 'Le prénom est requis' });
    }

    if (!formData.lastName.trim()) {
      errors.lastName = intl.formatMessage({ id: 'chatter.register.error.lastName', defaultMessage: 'Le nom est requis' });
    }

    if (!formData.email.trim()) {
      errors.email = intl.formatMessage({ id: 'chatter.register.error.email', defaultMessage: "L'email est requis" });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = intl.formatMessage({ id: 'chatter.register.error.emailInvalid', defaultMessage: 'Email invalide' });
    }

    if (!formData.phone.trim()) {
      errors.phone = intl.formatMessage({ id: 'chatter.register.error.phone', defaultMessage: 'Le téléphone est requis' });
    }

    if (!formData.country) {
      errors.country = intl.formatMessage({ id: 'chatter.register.error.country', defaultMessage: 'Le pays est requis' });
    }

    if (formData.languages.length === 0) {
      errors.languages = intl.formatMessage({ id: 'chatter.register.error.languages', defaultMessage: 'Sélectionnez au moins une langue' });
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Name Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className={UI.label}>
            <FormattedMessage id="chatter.register.firstName" defaultMessage="Prénom" />
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
              placeholder={intl.formatMessage({ id: 'chatter.register.firstNamePlaceholder', defaultMessage: 'Votre prénom' })}
            />
          </div>
          {validationErrors.firstName && (
            <p className="mt-1 text-xs text-red-500">{validationErrors.firstName}</p>
          )}
        </div>

        <div>
          <label htmlFor="lastName" className={UI.label}>
            <FormattedMessage id="chatter.register.lastName" defaultMessage="Nom" />
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
              placeholder={intl.formatMessage({ id: 'chatter.register.lastNamePlaceholder', defaultMessage: 'Votre nom' })}
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
            placeholder={intl.formatMessage({ id: 'chatter.register.emailPlaceholder', defaultMessage: 'votre@email.com' })}
          />
        </div>
        {validationErrors.email && (
          <p className="mt-1 text-xs text-red-500">{validationErrors.email}</p>
        )}
      </div>

      {/* Phone */}
      <div>
        <label htmlFor="phone" className={UI.label}>
          <FormattedMessage id="chatter.register.phone" defaultMessage="Téléphone" />
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className={`${UI.input} pl-10 ${validationErrors.phone ? 'border-red-500 focus:ring-red-500' : ''}`}
            placeholder={intl.formatMessage({ id: 'chatter.register.phonePlaceholder', defaultMessage: '+221 77 123 45 67' })}
          />
        </div>
        {validationErrors.phone && (
          <p className="mt-1 text-xs text-red-500">{validationErrors.phone}</p>
        )}
      </div>

      {/* Country */}
      <div>
        <label htmlFor="country" className={UI.label}>
          <FormattedMessage id="chatter.register.country" defaultMessage="Pays de résidence" />
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
              {intl.formatMessage({ id: 'chatter.register.countrySelect', defaultMessage: 'Sélectionner un pays' })}
            </option>
            {COUNTRIES.map(country => (
              <option key={country.code} value={country.code}>
                {country.name}
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
          <FormattedMessage id="chatter.register.languages" defaultMessage="Langues parlées" />
        </label>
        <div className="flex flex-wrap gap-2">
          {SUPPORTED_LANGUAGES.map(lang => (
            <button
              key={lang.code}
              type="button"
              onClick={() => toggleLanguage(lang.code)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                formData.languages.includes(lang.code)
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                  : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20'
              }`}
            >
              {lang.name}
            </button>
          ))}
        </div>
        {validationErrors.languages && (
          <p className="mt-1 text-xs text-red-500">{validationErrors.languages}</p>
        )}
      </div>

      {/* Referral Code (Optional) */}
      <div>
        <label htmlFor="referralCode" className={UI.label}>
          <FormattedMessage id="chatter.register.referralCode" defaultMessage="Code de parrainage (optionnel)" />
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
          <FormattedMessage id="chatter.register.referralCodeHint" defaultMessage="Si quelqu'un vous a recommandé, entrez son code" />
        </p>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className={`${UI.button.primary} w-full py-4 flex items-center justify-center gap-2`}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <FormattedMessage id="chatter.register.submitting" defaultMessage="Inscription en cours..." />
          </>
        ) : (
          <FormattedMessage id="chatter.register.submit" defaultMessage="S'inscrire comme Chatter" />
        )}
      </button>
    </form>
  );
};

export default ChatterRegisterForm;
