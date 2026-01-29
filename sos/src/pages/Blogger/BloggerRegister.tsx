/**
 * BloggerRegister - Registration page for new bloggers
 *
 * Includes:
 * - Personal info form
 * - Blog-specific fields (URL, name, theme, traffic)
 * - Definitive role acknowledgment checkbox (REQUIRED)
 */

import React, { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocaleNavigate } from '@/multilingual-system';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import {
  RegisterBloggerInput,
  RegisterBloggerResponse,
  BLOG_THEMES,
  BLOG_TRAFFIC_TIERS,
  SupportedBloggerLanguage,
  BlogTheme,
  BlogTrafficTier,
} from '@/types/blogger';
import {
  AlertTriangle,
  CheckCircle,
  Loader2,
} from 'lucide-react';

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

const BloggerRegister: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const { user } = useAuth();

  const [formData, setFormData] = useState<Partial<RegisterBloggerInput>>({
    firstName: '',
    lastName: '',
    email: user?.email || '',
    phone: '',
    country: '',
    language: 'fr',
    bio: '',
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validate required fields
    if (!formData.definitiveRoleAcknowledged) {
      setError(intl.formatMessage({
        id: 'blogger.register.error.acknowledgment',
        defaultMessage: 'Vous devez accepter que le rôle de blogueur est définitif.',
      }));
      setIsSubmitting(false);
      return;
    }

    try {
      const registerBlogger = httpsCallable<RegisterBloggerInput, RegisterBloggerResponse>(
        functions,
        'registerBlogger'
      );

      const result = await registerBlogger(formData as RegisterBloggerInput);

      if (result.data.success) {
        setSuccess(true);
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          navigate('/blogger/tableau-de-bord');
        }, 2000);
      } else {
        setError(result.data.message);
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white dark:from-gray-950 dark:to-black flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl max-w-md text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              <FormattedMessage id="blogger.register.success.title" defaultMessage="Inscription réussie !" />
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              <FormattedMessage
                id="blogger.register.success.message"
                defaultMessage="Votre compte blogueur est maintenant actif. Redirection vers votre tableau de bord..."
              />
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white dark:from-gray-950 dark:to-black py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              <FormattedMessage id="blogger.register.title" defaultMessage="Devenir Blogueur Partenaire" />
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              <FormattedMessage
                id="blogger.register.subtitle"
                defaultMessage="Gagnez 10$ par client référé et 5$ par prestataire recruté"
              />
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8">
            {/* Personal Info Section */}
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              <FormattedMessage id="blogger.register.personalInfo" defaultMessage="Informations personnelles" />
            </h2>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <FormattedMessage id="blogger.register.firstName" defaultMessage="Prénom" /> *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <FormattedMessage id="blogger.register.lastName" defaultMessage="Nom" /> *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <FormattedMessage id="blogger.register.email" defaultMessage="Email" /> *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <FormattedMessage id="blogger.register.country" defaultMessage="Pays" /> *
                </label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <FormattedMessage id="blogger.register.language" defaultMessage="Langue principale" /> *
                </label>
                <select
                  name="language"
                  value={formData.language}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <FormattedMessage id="blogger.register.phone" defaultMessage="Téléphone" />
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Blog Info Section */}
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <FormattedMessage id="blogger.register.blogInfo" defaultMessage="Informations sur votre blog" />
            </h2>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <FormattedMessage id="blogger.register.blogUrl" defaultMessage="URL du blog" /> *
                </label>
                <input
                  type="url"
                  name="blogUrl"
                  value={formData.blogUrl}
                  onChange={handleChange}
                  required
                  placeholder="https://monblog.com"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <FormattedMessage id="blogger.register.blogName" defaultMessage="Nom du blog" /> *
                </label>
                <input
                  type="text"
                  name="blogName"
                  value={formData.blogName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <FormattedMessage id="blogger.register.blogLanguage" defaultMessage="Langue du blog" /> *
                </label>
                <select
                  name="blogLanguage"
                  value={formData.blogLanguage}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <FormattedMessage id="blogger.register.blogCountry" defaultMessage="Pays cible du blog" /> *
                </label>
                <input
                  type="text"
                  name="blogCountry"
                  value={formData.blogCountry}
                  onChange={handleChange}
                  required
                  placeholder="France, Canada, etc."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <FormattedMessage id="blogger.register.blogTheme" defaultMessage="Thématique" /> *
                </label>
                <select
                  name="blogTheme"
                  value={formData.blogTheme}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {BLOG_THEMES.map((theme) => (
                    <option key={theme.value} value={theme.value}>
                      {theme.labelFr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <FormattedMessage id="blogger.register.blogTraffic" defaultMessage="Trafic mensuel estimé" /> *
                </label>
                <select
                  name="blogTraffic"
                  value={formData.blogTraffic}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {BLOG_TRAFFIC_TIERS.map((tier) => (
                    <option key={tier.value} value={tier.value}>
                      {tier.labelFr}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <FormattedMessage id="blogger.register.blogDescription" defaultMessage="Description du blog" />
                </label>
                <textarea
                  name="blogDescription"
                  value={formData.blogDescription}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Definitive Role Acknowledgment */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">
                    <FormattedMessage id="blogger.register.warning.title" defaultMessage="Important : Rôle définitif" />
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                    <FormattedMessage
                      id="blogger.register.warning.message"
                      defaultMessage="En devenant blogueur partenaire, vous ne pourrez plus devenir Chatter ou Influenceur. Ce choix est définitif et irréversible."
                    />
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="definitiveRoleAcknowledged"
                      checked={formData.definitiveRoleAcknowledged}
                      onChange={handleChange}
                      required
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      <FormattedMessage
                        id="blogger.register.acknowledgment"
                        defaultMessage="Je comprends et j'accepte que ce rôle est définitif"
                      />
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-purple-600 text-white py-3 rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <FormattedMessage id="blogger.register.submitting" defaultMessage="Inscription en cours..." />
                </>
              ) : (
                <FormattedMessage id="blogger.register.submit" defaultMessage="Devenir Blogueur Partenaire" />
              )}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default BloggerRegister;
