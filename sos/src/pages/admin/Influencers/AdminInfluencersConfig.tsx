/**
 * AdminInfluencersConfig - System settings for Influencer program
 * Commission settings are managed in the centralized hub: /admin/commissions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { httpsCallable } from 'firebase/functions';
import { functionsAffiliate } from '@/config/firebase';
import {
  Settings, Save, Loader2, AlertTriangle, RefreshCw, Check, CheckCircle,
  Shield, GraduationCap, Globe, Eye, EyeOff, ExternalLink, DollarSign, History,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';
import { AntiFraudSettings, RateHistoryViewer } from './components';
import type { InfluencerAntiFraudConfig } from '@/types/influencer';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
  },
  tab: "px-4 py-2 text-sm font-medium rounded-lg transition-all",
  tabActive: "bg-red-500 text-white",
  tabInactive: "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10",
} as const;

interface InfluencerConfig {
  isSystemActive?: boolean;
  newRegistrationsEnabled?: boolean;
  withdrawalsEnabled?: boolean;
  trainingEnabled?: boolean;
  isInfluencerListingPageVisible?: boolean;
  antiFraud?: InfluencerAntiFraudConfig;
  updatedAt?: string;
  updatedBy?: string;
}

const DEFAULT_ANTI_FRAUD: InfluencerAntiFraudConfig = {
  enabled: false, maxReferralsPerDay: 0, maxReferralsPerWeek: 0,
  blockSameIPReferrals: false, minAccountAgeDays: 0,
  requireEmailVerification: false, suspiciousConversionRateThreshold: 0,
  autoSuspendOnViolation: false,
};

type Tab = 'general' | 'antifraud' | 'history';

const AdminInfluencersConfig: React.FC = () => {
  const intl = useIntl();
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [config, setConfig] = useState<InfluencerConfig>({});
  const [antiFraud, setAntiFraud] = useState<InfluencerAntiFraudConfig>(DEFAULT_ANTI_FRAUD);
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
      const fn = httpsCallable<void, { config: InfluencerConfig }>(functionsAffiliate, 'adminGetInfluencerConfig');
      const result = await fn();
      setConfig(result.data.config);
      if (result.data.config.antiFraud) setAntiFraud(result.data.config.antiFraud);
    } catch (err: any) {
      console.error('Error fetching config:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSaveGeneral = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const fn = httpsCallable(functionsAffiliate, 'adminUpdateInfluencerConfig');
      await fn({
        updates: {
          isSystemActive: config.isSystemActive,
          newRegistrationsEnabled: config.newRegistrationsEnabled,
          withdrawalsEnabled: config.withdrawalsEnabled,
          trainingEnabled: config.trainingEnabled,
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

  const handleSaveAntiFraud = async () => {
    setSaving(true);
    setError(null);
    try {
      const fn = httpsCallable(functionsAffiliate, 'adminUpdateAntiFraudConfig');
      await fn({ antiFraud });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleListingPage = async () => {
    setTogglingVisibility(true);
    try {
      const fn = httpsCallable(functionsAffiliate, 'adminUpdateInfluencerConfig');
      const newValue = !config.isInfluencerListingPageVisible;
      await fn({ updates: { isInfluencerListingPageVisible: newValue } });
      setConfig({ ...config, isInfluencerListingPageVisible: newValue });
      setVisibilitySuccess(true);
      setTimeout(() => setVisibilitySuccess(false), 3000);
    } catch (err) {
      console.error('Error toggling listing page:', err);
    } finally {
      setTogglingVisibility(false);
    }
  };

  if (loading) {
    return <AdminLayout><div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 text-red-500 animate-spin" /></div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Settings className="w-7 h-7 text-red-500" />
              Configuration Influenceurs
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Paramètres système du programme influenceurs</p>
          </div>
          <button onClick={fetchConfig} className={`${UI.button.secondary} px-3 py-2 flex items-center gap-2 text-sm`}>
            <RefreshCw className="w-4 h-4" /> Actualiser
          </button>
        </div>

        {/* Link to Commission Hub */}
        <a href="/admin/commissions?tab=influenceur"
          className={`${UI.card} p-4 flex items-center justify-between hover:border-red-300 dark:hover:border-red-500/30 transition-colors group`}>
          <div className="flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Commissions d'affiliation</p>
              <p className="text-xs text-gray-500">Taux, remise client, retraits — gérés dans le hub centralisé</p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors" />
        </a>

        {/* Page Visibility Toggle */}
        <div className={`${UI.card} p-6 border-2 ${config.isInfluencerListingPageVisible ? 'border-green-400/40' : 'border-gray-300/40'}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${config.isInfluencerListingPageVisible ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800/50'}`}>
                {config.isInfluencerListingPageVisible ? <Eye className="w-6 h-6 text-green-600" /> : <EyeOff className="w-6 h-6 text-gray-500" />}
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Page publique des influenceurs</h3>
                <p className="text-sm text-gray-500 mt-1">Contrôle la visibilité de <strong>/nos-influenceurs</strong></p>
                {visibilitySuccess && <div className="flex items-center gap-1.5 mt-2 text-green-500 text-sm"><CheckCircle className="w-4 h-4" /> Mis à jour</div>}
              </div>
            </div>
            <button onClick={handleToggleListingPage} disabled={togglingVisibility}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${config.isInfluencerListingPageVisible ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
              {togglingVisibility
                ? <Loader2 className="w-4 h-4 animate-spin text-white mx-auto" />
                : <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform ${config.isInfluencerListingPageVisible ? 'translate-x-7' : 'translate-x-1'}`} />}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
          {([
            { id: 'general' as const, label: 'Général', icon: Settings },
            { id: 'antifraud' as const, label: 'Anti-fraude', icon: Shield },
            { id: 'history' as const, label: 'Historique', icon: History },
          ]).map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`${UI.tab} ${activeTab === id ? UI.tabActive : UI.tabInactive}`}>
              <Icon className="w-4 h-4 inline mr-2" />{label}
            </button>
          ))}
        </div>

        {/* Feedback */}
        {error && <div className={`${UI.card} p-4 bg-red-50 dark:bg-red-900/20 flex items-center gap-3`}><AlertTriangle className="w-5 h-5 text-red-500" /><p className="text-red-600 text-sm">{error}</p></div>}
        {success && <div className={`${UI.card} p-4 bg-green-50 dark:bg-green-900/20 flex items-center gap-3`}><Check className="w-5 h-5 text-green-500" /><p className="text-green-600 text-sm">Configuration enregistrée</p></div>}

        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div className={`${UI.card} p-6`}>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-500" /> Paramètres système
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { field: 'isSystemActive' as const, label: 'Système actif' },
                  { field: 'newRegistrationsEnabled' as const, label: 'Inscriptions ouvertes' },
                  { field: 'withdrawalsEnabled' as const, label: 'Retraits activés' },
                  { field: 'trainingEnabled' as const, label: 'Formation visible' },
                ].map(({ field, label }) => (
                  <label key={field} className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                    <input type="checkbox" checked={(config[field] as boolean) ?? true}
                      onChange={(e) => setConfig(prev => ({ ...prev, [field]: e.target.checked }))}
                      className="w-5 h-5 rounded border-gray-300 text-red-500 focus:ring-red-500" />
                    <span className="text-gray-700 dark:text-gray-300 text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={handleSaveGeneral} disabled={saving}
                className={`${UI.button.primary} px-6 py-3 flex items-center gap-2`}>
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Enregistrer
              </button>
            </div>
          </div>
        )}

        {activeTab === 'antifraud' && (
          <div className="space-y-6">
            <AntiFraudSettings config={antiFraud} onChange={setAntiFraud} />
            <div className="flex justify-end">
              <button onClick={handleSaveAntiFraud} disabled={saving}
                className={`${UI.button.primary} px-6 py-3 flex items-center gap-2`}>
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Enregistrer
              </button>
            </div>
          </div>
        )}

        {activeTab === 'history' && <RateHistoryViewer />}

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

export default AdminInfluencersConfig;
