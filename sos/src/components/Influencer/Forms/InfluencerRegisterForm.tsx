/**
 * InfluencerRegisterForm - Registration form for influencers
 */

import React, { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useAuth } from '@/contexts/AuthContext';
import { useLocaleNavigate } from '@/multilingual-system';
import { getTranslatedRouteSlug, type RouteKey } from '@/multilingual-system/core/routing/localeRoutes';
import { useApp } from '@/contexts/AppContext';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Loader2, Check, AlertCircle } from 'lucide-react';

const PLATFORMS = [
  { id: 'youtube', label: 'YouTube' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'twitter', label: 'Twitter/X' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'blog', label: 'Blog' },
  { id: 'website', label: 'Site Web' },
  { id: 'podcast', label: 'Podcast' },
  { id: 'newsletter', label: 'Newsletter' },
  { id: 'other', label: 'Autre' },
];

const LANGUAGES = [
  { id: 'fr', label: 'Français' },
  { id: 'en', label: 'English' },
  { id: 'es', label: 'Español' },
  { id: 'de', label: 'Deutsch' },
  { id: 'pt', label: 'Português' },
  { id: 'ar', label: 'العربية' },
  { id: 'it', label: 'Italiano' },
  { id: 'nl', label: 'Nederlands' },
  { id: 'zh', label: '中文' },
];

const InfluencerRegisterForm: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const { user } = useAuth();
  const { language } = useApp();
  const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    firstName: user?.firstName || user?.displayName?.split(' ')[0] || '',
    lastName: user?.lastName || user?.displayName?.split(' ').slice(1).join(' ') || '',
    email: user?.email || '',
    phone: '',
    country: '',
    language: language || 'fr',
    platforms: [] as string[],
    bio: '',
    communitySize: '',
    communityNiche: '',
    socialLinks: {
      youtube: '',
      instagram: '',
      facebook: '',
      tiktok: '',
      twitter: '',
      linkedin: '',
      website: '',
    },
  });

  const handlePlatformToggle = (platformId: string) => {
    setFormData((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platformId)
        ? prev.platforms.filter((p) => p !== platformId)
        : [...prev.platforms, platformId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const functions = getFunctions(undefined, 'europe-west1');
      const registerInfluencer = httpsCallable(functions, 'registerInfluencer');

      const result = await registerInfluencer({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || undefined,
        country: formData.country,
        language: formData.language,
        platforms: formData.platforms,
        bio: formData.bio || undefined,
        communitySize: formData.communitySize ? parseInt(formData.communitySize) : undefined,
        communityNiche: formData.communityNiche || undefined,
        socialLinks: Object.fromEntries(
          Object.entries(formData.socialLinks).filter(([_, v]) => v)
        ),
      });

      const data = result.data as { success: boolean; affiliateCodeClient: string };

      if (data.success) {
        setSuccess(true);
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          navigate(`/${getTranslatedRouteSlug('influencer-dashboard' as RouteKey, langCode)}`);
        }, 2000);
      }
    } catch (err: unknown) {
      console.error('Registration error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          <FormattedMessage id="influencer.register.success.title" defaultMessage="Inscription réussie !" />
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          <FormattedMessage id="influencer.register.success.message" defaultMessage="Votre compte est activé. Redirection vers votre tableau de bord..." />
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Personal Info */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          <FormattedMessage id="influencer.register.section.personal" defaultMessage="Informations personnelles" />
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <FormattedMessage id="influencer.register.firstName" defaultMessage="Prénom" /> *
            </label>
            <input
              type="text"
              required
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <FormattedMessage id="influencer.register.lastName" defaultMessage="Nom" /> *
            </label>
            <input
              type="text"
              required
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            <FormattedMessage id="influencer.register.email" defaultMessage="Email" /> *
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <FormattedMessage id="influencer.register.country" defaultMessage="Pays" /> *
            </label>
            <input
              type="text"
              required
              placeholder="FR, US, MA..."
              maxLength={2}
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value.toUpperCase() })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <FormattedMessage id="influencer.register.language" defaultMessage="Langue principale" /> *
            </label>
            <select
              required
              value={formData.language}
              onChange={(e) => setFormData({ ...formData, language: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id}>{lang.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Platforms */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          <FormattedMessage id="influencer.register.section.platforms" defaultMessage="Vos plateformes" /> *
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          <FormattedMessage id="influencer.register.platformsHint" defaultMessage="Sélectionnez au moins une plateforme" />
        </p>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((platform) => (
            <button
              key={platform.id}
              type="button"
              onClick={() => handlePlatformToggle(platform.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                formData.platforms.includes(platform.id)
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {platform.label}
            </button>
          ))}
        </div>
      </div>

      {/* Community Info */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          <FormattedMessage id="influencer.register.section.community" defaultMessage="Votre communauté" />
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <FormattedMessage id="influencer.register.communitySize" defaultMessage="Taille de la communauté" />
            </label>
            <input
              type="number"
              placeholder="Ex: 5000"
              value={formData.communitySize}
              onChange={(e) => setFormData({ ...formData, communitySize: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <FormattedMessage id="influencer.register.communityNiche" defaultMessage="Thématique/niche" />
            </label>
            <input
              type="text"
              placeholder="Ex: expatriation, voyage..."
              value={formData.communityNiche}
              onChange={(e) => setFormData({ ...formData, communityNiche: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            <FormattedMessage id="influencer.register.bio" defaultMessage="Bio / Description" />
          </label>
          <textarea
            rows={3}
            placeholder={intl.formatMessage({ id: 'influencer.register.bioPlaceholder', defaultMessage: 'Décrivez votre communauté et votre activité...' })}
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || formData.platforms.length === 0}
        className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <FormattedMessage id="influencer.register.submitting" defaultMessage="Inscription en cours..." />
          </>
        ) : (
          <FormattedMessage id="influencer.register.submit" defaultMessage="Devenir Influenceur" />
        )}
      </button>
    </form>
  );
};

export default InfluencerRegisterForm;
