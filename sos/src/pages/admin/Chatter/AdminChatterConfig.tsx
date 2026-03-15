/**
 * AdminChatterConfig - System settings for Chatter program
 * Commission settings are managed in the centralized hub: /admin/commissions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { httpsCallable } from 'firebase/functions';
import { functionsAffiliate } from "@/config/firebase";
import {
  Settings, AlertTriangle, Save, RefreshCw, Loader2, CheckCircle,
  Calendar, Shield, GraduationCap, Globe, Check, DollarSign, ExternalLink,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
  },
  input: "w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500",
} as const;

interface ChatterConfig {
  isSystemActive: boolean;
  newRegistrationsEnabled: boolean;
  withdrawalsEnabled: boolean;
  trainingEnabled: boolean;
  quizPassingScore: number;
  quizRetryDelayHours: number;
  quizQuestionsCount: number;
  version: number;
  updatedAt?: string;
  updatedBy?: string;
  isChatterListingPageVisible?: boolean;
}

const AdminChatterConfig: React.FC = () => {
  const intl = useIntl();
  const [config, setConfig] = useState<ChatterConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  const [visibilitySuccess, setVisibilitySuccess] = useState(false);
  const [formData, setFormData] = useState<Partial<ChatterConfig>>({});

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable<void, { config: ChatterConfig }>(functionsAffiliate, 'adminGetChatterConfig');
      const result = await fn();
      setConfig(result.data.config);
      setFormData(result.data.config);
      setHasChanges(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleChange = (field: keyof ChatterConfig, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    setSuccess(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const fn = httpsCallable(functionsAffiliate, 'adminUpdateChatterConfig');
      await fn({
        isSystemActive: formData.isSystemActive,
        newRegistrationsEnabled: formData.newRegistrationsEnabled,
        withdrawalsEnabled: formData.withdrawalsEnabled,
        trainingEnabled: formData.trainingEnabled,
        quizPassingScore: formData.quizPassingScore,
        quizRetryDelayHours: formData.quizRetryDelayHours,
        quizQuestionsCount: formData.quizQuestionsCount,
      });
      setSuccess('Configuration sauvegardée');
      setHasChanges(false);
      fetchConfig();
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleListingPage = useCallback(async () => {
    setTogglingVisibility(true);
    setVisibilitySuccess(false);
    try {
      const fn = httpsCallable(functionsAffiliate, 'adminUpdateChatterConfig');
      const newValue = !config?.isChatterListingPageVisible;
      await fn({ isChatterListingPageVisible: newValue });
      setConfig(prev => prev ? { ...prev, isChatterListingPageVisible: newValue } : prev);
      setVisibilitySuccess(true);
      setTimeout(() => setVisibilitySuccess(false), 2000);
    } catch (err) {
      console.error('[AdminChatterConfig] Toggle listing page failed:', err);
    } finally {
      setTogglingVisibility(false);
    }
  }, [config?.isChatterListingPageVisible]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-10 h-10 text-red-500 animate-spin" /></div>;
  }

  return (
    <AdminLayout>
    <div className="space-y-6 max-w-4xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Settings className="w-8 h-8 text-red-500" />
            <FormattedMessage id="admin.chatterConfig.title" defaultMessage="Configuration Chatter" />
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Paramètres système du programme chatter
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchConfig} className={`${UI.button.secondary} px-4 py-2 flex items-center gap-2`}>
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
          <button onClick={handleSave} disabled={!hasChanges || saving}
            className={`${UI.button.primary} px-4 py-2 flex items-center gap-2 disabled:opacity-50`}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Sauvegarder
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className={`${UI.card} p-4 bg-red-50 dark:bg-red-900/20`}>
          <div className="flex items-center gap-3 text-red-600 dark:text-red-400"><AlertTriangle className="w-5 h-5" /><span>{error}</span></div>
        </div>
      )}
      {success && (
        <div className={`${UI.card} p-4 bg-green-50 dark:bg-green-900/20`}>
          <div className="flex items-center gap-3 text-green-600 dark:text-green-400"><CheckCircle className="w-5 h-5" /><span>{success}</span></div>
        </div>
      )}

      {/* Link to Commission Hub */}
      <a href="/admin/commissions?tab=chatter"
        className={`${UI.card} p-4 flex items-center justify-between hover:border-red-300 dark:hover:border-red-500/30 transition-colors group`}>
        <div className="flex items-center gap-3">
          <DollarSign className="w-5 h-5 text-green-500" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Commissions d'affiliation</p>
            <p className="text-xs text-gray-500">Taux, bonus, paliers, retraits — gérés dans le hub centralisé</p>
          </div>
        </div>
        <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors" />
      </a>

      {/* Directory Page Visibility */}
      <div className={`${UI.card} p-6`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold dark:text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-red-500" />
              Page Répertoire Public
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Activer pour rendre visible la page{' '}
              <a href="/nos-chatters" target="_blank" className="text-red-600 hover:underline">/nos-chatters</a>
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {visibilitySuccess && <Check className="w-5 h-5 text-green-500" />}
            {togglingVisibility ? (
              <Loader2 className="w-6 h-6 animate-spin text-red-500" />
            ) : (
              <button onClick={handleToggleListingPage}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none ${config?.isChatterListingPageVisible ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${config?.isChatterListingPageVisible ? 'translate-x-8' : 'translate-x-1'}`} />
              </button>
            )}
            <span className={`text-sm font-medium ${config?.isChatterListingPageVisible ? 'text-green-600' : 'text-gray-400'}`}>
              {config?.isChatterListingPageVisible ? 'Visible' : 'Masqué'}
            </span>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className={`${UI.card} p-6`}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-red-500" />
          Statut du système
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { field: 'isSystemActive' as const, label: 'Système actif', color: 'red' },
            { field: 'newRegistrationsEnabled' as const, label: 'Inscriptions ouvertes', color: 'red' },
            { field: 'withdrawalsEnabled' as const, label: 'Retraits activés', color: 'red' },
            { field: 'trainingEnabled' as const, label: 'Formation visible', color: 'blue', icon: <GraduationCap className="w-4 h-4 text-blue-500" /> },
          ].map(({ field, label, color, icon }) => (
            <label key={field} className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={(formData[field] as boolean) ?? true}
                onChange={(e) => handleChange(field, e.target.checked)}
                className={`w-5 h-5 rounded border-gray-300 text-${color}-500 focus:ring-${color}-500`} />
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                {icon}{label}
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Quiz Settings */}
      <div className={`${UI.card} p-6`}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-green-500" />
          Paramètres du quiz
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Score de réussite (%)</label>
            <input type="number" value={formData.quizPassingScore ?? config?.quizPassingScore ?? 85}
              onChange={(e) => handleChange('quizPassingScore', parseInt(e.target.value))}
              className={UI.input} min={0} max={100} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Délai nouvel essai (heures)</label>
            <input type="number" value={formData.quizRetryDelayHours ?? config?.quizRetryDelayHours ?? 24}
              onChange={(e) => handleChange('quizRetryDelayHours', parseInt(e.target.value))}
              className={UI.input} min={0} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nombre de questions</label>
            <input type="number" value={formData.quizQuestionsCount ?? config?.quizQuestionsCount ?? 5}
              onChange={(e) => handleChange('quizQuestionsCount', parseInt(e.target.value))}
              className={UI.input} min={1} />
          </div>
        </div>
      </div>

      {/* Version Info */}
      {config && (
        <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
          Version {config.version} — Dernière modification: {config.updatedAt ? new Date(config.updatedAt).toLocaleDateString(intl.locale, { dateStyle: 'long', timeStyle: 'short' }) : '-'}
        </div>
      )}
    </div>
    </AdminLayout>
  );
};

export default AdminChatterConfig;
