/**
 * AdminBloggersConfig - System settings for Blogger program
 * Commission settings are managed in the centralized hub: /admin/commissions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { httpsCallable } from 'firebase/functions';
import { functionsAffiliate } from '@/config/firebase';
import {
  Settings, Save, Loader2, AlertTriangle, RefreshCw, Check,
  Shield, Globe, DollarSign, ExternalLink,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
  },
} as const;

interface BloggerConfig {
  isSystemActive?: boolean;
  newRegistrationsEnabled?: boolean;
  withdrawalsEnabled?: boolean;
  isBloggerListingPageVisible?: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

const AdminBloggersConfig: React.FC = () => {
  const intl = useIntl();
  const [config, setConfig] = useState<BloggerConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  const [visibilitySuccess, setVisibilitySuccess] = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable<void, { config: BloggerConfig }>(functionsAffiliate, 'adminGetBloggerConfig');
      const result = await fn();
      setConfig({ ...result.data.config });
    } catch (err: any) {
      console.error('Error fetching config:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const fn = httpsCallable(functionsAffiliate, 'adminUpdateBloggerConfig');
      await fn({
        updates: {
          isSystemActive: config.isSystemActive,
          newRegistrationsEnabled: config.newRegistrationsEnabled,
          withdrawalsEnabled: config.withdrawalsEnabled,
        },
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleListingPage = useCallback(async () => {
    setTogglingVisibility(true);
    setVisibilitySuccess(false);
    try {
      const fn = httpsCallable(functionsAffiliate, 'adminUpdateBloggerConfig');
      const newValue = !config.isBloggerListingPageVisible;
      await fn({ isBloggerListingPageVisible: newValue });
      setConfig(prev => ({ ...prev, isBloggerListingPageVisible: newValue }));
      setVisibilitySuccess(true);
      setTimeout(() => setVisibilitySuccess(false), 2000);
    } catch (err) {
      console.error('Toggle listing page failed:', err);
    } finally {
      setTogglingVisibility(false);
    }
  }, [config.isBloggerListingPageVisible]);

  if (loading) {
    return <AdminLayout><div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 text-purple-500 animate-spin" /></div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Settings className="w-7 h-7 text-purple-500" />
              Configuration Blogueurs
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Paramètres système du programme blogueurs</p>
          </div>
          <button onClick={fetchConfig} className={`${UI.button.secondary} px-3 py-2 flex items-center gap-2 text-sm`}>
            <RefreshCw className="w-4 h-4" /> Actualiser
          </button>
        </div>

        {/* Feedback */}
        {error && <div className={`${UI.card} p-4 bg-red-50 dark:bg-red-900/20 flex items-center gap-3`}><AlertTriangle className="w-5 h-5 text-red-500" /><p className="text-red-600 text-sm">{error}</p></div>}
        {success && <div className={`${UI.card} p-4 bg-green-50 dark:bg-green-900/20 flex items-center gap-3`}><Check className="w-5 h-5 text-green-500" /><p className="text-green-600 text-sm">Configuration enregistrée</p></div>}

        {/* Link to Commission Hub */}
        <a href="/admin/commissions?tab=blogueur"
          className={`${UI.card} p-4 flex items-center justify-between hover:border-purple-300 dark:hover:border-purple-500/30 transition-colors group`}>
          <div className="flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Commissions d'affiliation</p>
              <p className="text-xs text-gray-500">Taux, retraits — gérés dans le hub centralisé</p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-purple-500 transition-colors" />
        </a>

        {/* Directory Page Visibility */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold dark:text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-purple-500" /> Page Répertoire Public
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Visibilité de <a href="/nos-blogueurs" target="_blank" className="text-purple-600 hover:underline">/nos-blogueurs</a>
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {visibilitySuccess && <Check className="w-5 h-5 text-green-500" />}
              {togglingVisibility ? (
                <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
              ) : (
                <button onClick={handleToggleListingPage}
                  className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${config.isBloggerListingPageVisible ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${config.isBloggerListingPageVisible ? 'translate-x-8' : 'translate-x-1'}`} />
                </button>
              )}
              <span className={`text-sm font-medium ${config.isBloggerListingPageVisible ? 'text-green-600' : 'text-gray-400'}`}>
                {config.isBloggerListingPageVisible ? 'Visible' : 'Masqué'}
              </span>
            </div>
          </div>
        </div>

        {/* System Settings */}
        <div className={`${UI.card} p-6`}>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-500" /> Paramètres système
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { field: 'isSystemActive' as const, label: 'Système actif' },
              { field: 'newRegistrationsEnabled' as const, label: 'Inscriptions ouvertes' },
              { field: 'withdrawalsEnabled' as const, label: 'Retraits activés' },
            ].map(({ field, label }) => (
              <label key={field} className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                <input type="checkbox" checked={(config[field] as boolean) ?? true}
                  onChange={(e) => setConfig(prev => ({ ...prev, [field]: e.target.checked }))}
                  className="w-5 h-5 rounded border-gray-300 text-purple-500 focus:ring-purple-500" />
                <span className="text-gray-700 dark:text-gray-300 text-sm">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving} className={`${UI.button.primary} px-6 py-3 flex items-center gap-2`}>
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Enregistrer
          </button>
        </div>

        {config.updatedAt && (
          <p className="text-sm text-gray-500 text-center">
            Dernière MAJ : {new Date(config.updatedAt).toLocaleDateString(intl.locale, { dateStyle: 'long', timeStyle: 'short' })}
            {config.updatedBy && ` par ${config.updatedBy}`}
          </p>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminBloggersConfig;
