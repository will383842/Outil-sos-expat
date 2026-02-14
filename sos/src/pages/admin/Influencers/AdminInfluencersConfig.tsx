/**
 * AdminInfluencersConfig - Admin page for configuring influencer system settings
 * V2: Enhanced with commission rules editor, anti-fraud settings, and rate history
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { httpsCallable } from 'firebase/functions';
import { functionsWest2 } from '@/config/firebase';
import {
  Settings,
  Save,
  Loader2,
  AlertTriangle,
  DollarSign,
  Percent,
  Clock,
  RefreshCw,
  Check,
  Shield,
  History,
  ChevronRight,
  GraduationCap,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';
import {
  CommissionRulesEditor,
  AntiFraudSettings,
  RateHistoryViewer,
} from './components';
import type {
  InfluencerConfig,
  InfluencerCommissionRule,
  InfluencerAntiFraudConfig,
} from '@/types/influencer';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
  },
  input: "w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white",
  tab: "px-4 py-2 text-sm font-medium rounded-lg transition-all",
  tabActive: "bg-red-500 text-white",
  tabInactive: "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10",
} as const;

// Default config for fallback
const DEFAULT_CONFIG: InfluencerConfig = {
  clientReferralCommission: 1000,
  providerRecruitmentCommission: 500,
  clientDiscountPercent: 5,
  minimumWithdrawalAmount: 5000,
  commissionValidationDays: 7,
  commissionReleaseHours: 24,
  recruitmentCommissionWindowMonths: 6,
};

// Default commission rules
const DEFAULT_COMMISSION_RULES: InfluencerCommissionRule[] = [
  {
    id: 'client_referral',
    type: 'client_referral',
    enabled: true,
    calculationType: 'fixed',
    fixedAmount: 1000,
    percentageRate: 0,
    conditions: {},
    holdPeriodDays: 7,
    releaseDelayHours: 24,
    description: 'Commission par appel référé',
  },
  {
    id: 'recruitment',
    type: 'recruitment',
    enabled: true,
    calculationType: 'fixed',
    fixedAmount: 500,
    percentageRate: 0,
    conditions: {},
    holdPeriodDays: 7,
    releaseDelayHours: 24,
    description: 'Commission par appel partenaire',
  },
];

const DEFAULT_ANTI_FRAUD: InfluencerAntiFraudConfig = {
  enabled: false,
  maxReferralsPerDay: 0,
  maxReferralsPerWeek: 0,
  blockSameIPReferrals: false,
  minAccountAgeDays: 0,
  requireEmailVerification: false,
  suspiciousConversionRateThreshold: 0,
  autoSuspendOnViolation: false,
};

type Tab = 'general' | 'rules' | 'antifraud' | 'history';

const AdminInfluencersConfig: React.FC = () => {
  const intl = useIntl();

  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [config, setConfig] = useState<InfluencerConfig>(DEFAULT_CONFIG);
  const [commissionRules, setCommissionRules] = useState<InfluencerCommissionRule[]>(DEFAULT_COMMISSION_RULES);
  const [antiFraud, setAntiFraud] = useState<InfluencerAntiFraudConfig>(DEFAULT_ANTI_FRAUD);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch current config
  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const adminGetInfluencerConfig = httpsCallable<void, { config: InfluencerConfig }>(
        functionsWest2,
        'adminGetInfluencerConfig'
      );

      const result = await adminGetInfluencerConfig();
      const fetchedConfig = result.data.config;
      setConfig(fetchedConfig);

      // Set V2 fields
      if (fetchedConfig.commissionRules && fetchedConfig.commissionRules.length > 0) {
        setCommissionRules(fetchedConfig.commissionRules);
      }
      if (fetchedConfig.antiFraud) {
        setAntiFraud(fetchedConfig.antiFraud);
      }
    } catch (err: any) {
      console.error('Error fetching config:', err);
      setConfig(DEFAULT_CONFIG);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Save general config
  const handleSaveGeneral = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const adminUpdateInfluencerConfig = httpsCallable(functionsWest2, 'adminUpdateInfluencerConfig');
      await adminUpdateInfluencerConfig({
        updates: {
          clientReferralCommission: config.clientReferralCommission,
          providerRecruitmentCommission: config.providerRecruitmentCommission,
          clientDiscountPercent: config.clientDiscountPercent,
          minimumWithdrawalAmount: config.minimumWithdrawalAmount,
          commissionValidationDays: config.commissionValidationDays,
          commissionReleaseHours: config.commissionReleaseHours,
          recruitmentCommissionWindowMonths: config.recruitmentCommissionWindowMonths,
        },
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error saving config:', err);
      setError(err.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  // Save commission rules
  const handleSaveRules = async (rules: InfluencerCommissionRule[], reason: string) => {
    setSavingRules(true);
    setError(null);

    try {
      const adminUpdateCommissionRules = httpsCallable(functionsWest2, 'adminUpdateCommissionRules');
      await adminUpdateCommissionRules({ rules, reason });
      setCommissionRules(rules);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error saving rules:', err);
      setError(err.message || 'Failed to save commission rules');
      throw err;
    } finally {
      setSavingRules(false);
    }
  };

  // Save anti-fraud config
  const handleSaveAntiFraud = async () => {
    setSaving(true);
    setError(null);

    try {
      const adminUpdateAntiFraudConfig = httpsCallable(functionsWest2, 'adminUpdateAntiFraudConfig');
      await adminUpdateAntiFraudConfig({ antiFraud });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error saving anti-fraud config:', err);
      setError(err.message || 'Failed to save anti-fraud configuration');
    } finally {
      setSaving(false);
    }
  };

  // Handle input change
  const handleChange = (field: keyof InfluencerConfig, value: number) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  // Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(intl.locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 sm:gap-3">
              <Settings className="w-6 h-6 sm:w-8 sm:h-8 text-red-500" />
              <FormattedMessage id="admin.influencers.config.title" defaultMessage="Configuration Influenceurs" />
            </h1>
            <p className="mt-1 text-sm sm:text-base text-gray-500 dark:text-gray-400">
              <FormattedMessage
                id="admin.influencers.config.subtitle"
                defaultMessage="Paramètres du programme influenceurs"
              />
            </p>
          </div>

          <button
            onClick={fetchConfig}
            className={`${UI.button.secondary} px-3 py-2 flex items-center gap-2 text-sm`}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <FormattedMessage id="common.refresh" defaultMessage="Actualiser" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
          <button
            onClick={() => setActiveTab('general')}
            className={`${UI.tab} ${activeTab === 'general' ? UI.tabActive : UI.tabInactive}`}
          >
            <Settings className="w-4 h-4 inline mr-2" />
            Général
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`${UI.tab} ${activeTab === 'rules' ? UI.tabActive : UI.tabInactive}`}
          >
            <DollarSign className="w-4 h-4 inline mr-2" />
            Règles de commission
          </button>
          <button
            onClick={() => setActiveTab('antifraud')}
            className={`${UI.tab} ${activeTab === 'antifraud' ? UI.tabActive : UI.tabInactive}`}
          >
            <Shield className="w-4 h-4 inline mr-2" />
            Anti-fraude
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`${UI.tab} ${activeTab === 'history' ? UI.tabActive : UI.tabInactive}`}
          >
            <History className="w-4 h-4 inline mr-2" />
            Historique
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className={`${UI.card} p-4 bg-red-50 dark:bg-red-900/20 flex items-center gap-3`}>
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className={`${UI.card} p-4 bg-green-50 dark:bg-green-900/20 flex items-center gap-3`}>
            <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
            <p className="text-green-600 dark:text-green-400 text-sm">
              <FormattedMessage id="admin.config.saved" defaultMessage="Configuration enregistrée avec succès" />
            </p>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            {/* System Settings */}
            <div className={`${UI.card} p-6`}>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-500" />
                <FormattedMessage id="admin.config.systemSettings" defaultMessage="Paramètres système" />
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                  <input
                    type="checkbox"
                    checked={config.isSystemActive ?? true}
                    onChange={(e) => setConfig(prev => ({ ...prev, isSystemActive: e.target.checked }))}
                    className="w-5 h-5 rounded border-gray-300 text-red-500 focus:ring-red-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300 text-sm">
                    <FormattedMessage id="admin.config.systemActive" defaultMessage="Système actif" />
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                  <input
                    type="checkbox"
                    checked={config.newRegistrationsEnabled ?? true}
                    onChange={(e) => setConfig(prev => ({ ...prev, newRegistrationsEnabled: e.target.checked }))}
                    className="w-5 h-5 rounded border-gray-300 text-red-500 focus:ring-red-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300 text-sm">
                    <FormattedMessage id="admin.config.registrationsEnabled" defaultMessage="Inscriptions ouvertes" />
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                  <input
                    type="checkbox"
                    checked={config.withdrawalsEnabled ?? true}
                    onChange={(e) => setConfig(prev => ({ ...prev, withdrawalsEnabled: e.target.checked }))}
                    className="w-5 h-5 rounded border-gray-300 text-red-500 focus:ring-red-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300 text-sm">
                    <FormattedMessage id="admin.config.withdrawalsEnabled" defaultMessage="Retraits activés" />
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                  <input
                    type="checkbox"
                    checked={config.trainingEnabled ?? true}
                    onChange={(e) => setConfig(prev => ({ ...prev, trainingEnabled: e.target.checked }))}
                    className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 text-sm">
                    <GraduationCap className="w-4 h-4 text-blue-500" />
                    <FormattedMessage id="admin.config.trainingEnabled" defaultMessage="Formation visible" />
                  </div>
                </label>
              </div>
            </div>

            {/* Commission Settings (Legacy - for backward compatibility) */}
            <div className={`${UI.card} p-6`}>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-500" />
                <FormattedMessage id="admin.config.commissions" defaultMessage="Commissions (valeurs par défaut)" />
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Ces valeurs sont utilisées pour les nouveaux influenceurs. Pour modifier les règles détaillées, allez dans l'onglet "Règles de commission".
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <FormattedMessage id="admin.config.clientCommission" defaultMessage="Commission parrainage client" />
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={(config.clientReferralCommission / 100).toFixed(2)}
                      onChange={(e) => handleChange('clientReferralCommission', Math.round(parseFloat(e.target.value || '0') * 100))}
                      className={`${UI.input} pl-8`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <FormattedMessage id="admin.config.recruitCommission" defaultMessage="Commission partenaire" />
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={(config.providerRecruitmentCommission / 100).toFixed(2)}
                      onChange={(e) => handleChange('providerRecruitmentCommission', Math.round(parseFloat(e.target.value || '0') * 100))}
                      className={`${UI.input} pl-8`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Client Discount */}
            <div className={`${UI.card} p-6`}>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Percent className="w-5 h-5 text-blue-500" />
                <FormattedMessage id="admin.config.discount" defaultMessage="Remise client" />
              </h2>

              <div className="max-w-md">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FormattedMessage id="admin.config.discountPercent" defaultMessage="Pourcentage de remise" />
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={config.clientDiscountPercent}
                    onChange={(e) => handleChange('clientDiscountPercent', parseInt(e.target.value || '0'))}
                    className={`${UI.input} pr-8`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                </div>
              </div>
            </div>

            {/* Withdrawal Settings */}
            <div className={`${UI.card} p-6`}>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-red-500" />
                <FormattedMessage id="admin.config.withdrawals" defaultMessage="Retraits" />
              </h2>

              <div className="max-w-md">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FormattedMessage id="admin.config.minWithdrawal" defaultMessage="Montant minimum de retrait" />
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={(config.minimumWithdrawalAmount / 100).toFixed(2)}
                    onChange={(e) => handleChange('minimumWithdrawalAmount', Math.round(parseFloat(e.target.value || '0') * 100))}
                    className={`${UI.input} pl-8`}
                  />
                </div>
              </div>
            </div>

            {/* Timing Settings */}
            <div className={`${UI.card} p-6`}>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-500" />
                <FormattedMessage id="admin.config.timing" defaultMessage="Délais" />
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <FormattedMessage id="admin.config.validationDays" defaultMessage="Jours de validation" />
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={config.commissionValidationDays}
                    onChange={(e) => handleChange('commissionValidationDays', parseInt(e.target.value || '7'))}
                    className={UI.input}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <FormattedMessage id="admin.config.releaseHours" defaultMessage="Heures de déblocage" />
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="168"
                    value={config.commissionReleaseHours}
                    onChange={(e) => handleChange('commissionReleaseHours', parseInt(e.target.value || '24'))}
                    className={UI.input}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <FormattedMessage id="admin.config.recruitWindow" defaultMessage="Fenêtre partenaires (mois)" />
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={config.recruitmentCommissionWindowMonths}
                    onChange={(e) => handleChange('recruitmentCommissionWindowMonths', parseInt(e.target.value || '6'))}
                    className={UI.input}
                  />
                </div>
              </div>
            </div>

            {/* Last Updated Info */}
            {config.updatedAt && (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage
                  id="admin.config.lastUpdated"
                  defaultMessage="Dernière mise à jour : {date}"
                  values={{ date: formatDate(config.updatedAt) }}
                />
                {config.updatedBy && (
                  <span className="ml-2">
                    par {config.updatedBy}
                  </span>
                )}
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSaveGeneral}
                disabled={saving}
                className={`${UI.button.primary} px-6 py-3 flex items-center gap-2`}
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                <FormattedMessage id="common.save" defaultMessage="Enregistrer" />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'rules' && (
          <CommissionRulesEditor
            rules={commissionRules}
            onChange={setCommissionRules}
            onSave={handleSaveRules}
            isSaving={savingRules}
          />
        )}

        {activeTab === 'antifraud' && (
          <div className="space-y-6">
            <AntiFraudSettings
              config={antiFraud}
              onChange={setAntiFraud}
            />
            <div className="flex justify-end">
              <button
                onClick={handleSaveAntiFraud}
                disabled={saving}
                className={`${UI.button.primary} px-6 py-3 flex items-center gap-2`}
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                <FormattedMessage id="common.save" defaultMessage="Enregistrer" />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <RateHistoryViewer />
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminInfluencersConfig;
