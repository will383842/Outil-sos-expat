/**
 * AdminChatterConfig - Admin page for configuring chatter system settings
 * Allows configuration of commission rates, withdrawal limits, bonuses, etc.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { httpsCallable } from 'firebase/functions';
import { functionsAffiliate } from "@/config/firebase";
import {
  Settings,
  DollarSign,
  Star,
  Trophy,
  Clock,
  AlertTriangle,
  Save,
  RefreshCw,
  Loader2,
  CheckCircle,
  Info,
  Percent,
  Calendar,
  Shield,
  Video,
  Users,
  GraduationCap,
  Globe,
  Check,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
    danger: "bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-all",
  },
  input: "w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500",
} as const;

interface ChatterConfig {
  isSystemActive: boolean;
  newRegistrationsEnabled: boolean;
  withdrawalsEnabled: boolean;
  trainingEnabled: boolean;
  commissionClientAmount: number;
  commissionRecruitmentAmount: number;
  commissionClientCallAmountLawyer?: number;
  commissionClientCallAmountExpat?: number;
  commissionProviderCallAmountLawyer?: number;
  commissionProviderCallAmountExpat?: number;
  levelBonuses: {
    level1: number;
    level2: number;
    level3: number;
    level4: number;
    level5: number;
  };
  levelThresholds: {
    level2: number;
    level3: number;
    level4: number;
    level5: number;
  };
  top1BonusMultiplier: number;
  top2BonusMultiplier: number;
  top3BonusMultiplier: number;
  zoomBonusMultiplier: number;
  zoomBonusDurationDays: number;
  recruitmentLinkDurationMonths: number;
  minimumWithdrawalAmount: number;
  validationHoldPeriodHours: number;
  releaseDelayHours: number;
  quizPassingScore: number;
  quizRetryDelayHours: number;
  quizQuestionsCount: number;
  attributionWindowDays: number;
  version: number;
  updatedAt?: string;
  updatedBy?: string;
  isChatterListingPageVisible?: boolean;
  // Captain Chatter
  commissionCaptainCallAmountLawyer?: number;
  commissionCaptainCallAmountExpat?: number;
  captainTiers?: Array<{ name: string; minCalls: number; bonus: number }>;
  captainQualityBonusAmount?: number;
}

const AdminChatterConfig: React.FC = () => {
  const intl = useIntl();

  // State
  const [config, setConfig] = useState<ChatterConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const [togglingVisibility, setTogglingVisibility] = useState(false);
  const [visibilitySuccess, setVisibilitySuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<ChatterConfig>>({});

  // Fetch config
  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const adminGetChatterConfig = httpsCallable<void, { config: ChatterConfig }>(
        functionsAffiliate,
        'adminGetChatterConfig'
      );

      const result = await adminGetChatterConfig();
      setConfig(result.data.config);
      setFormData(result.data.config);
      setHasChanges(false);
    } catch (err: any) {
      console.error('Error fetching config:', err);
      setError(err.message || 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Handle input change
  const handleChange = (field: keyof ChatterConfig, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    setSuccess(null);
  };

  // Handle nested change (levelBonuses, levelThresholds)
  const handleNestedChange = (
    parent: 'levelBonuses' | 'levelThresholds',
    field: string,
    value: number
  ) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...(prev[parent] || config?.[parent]),
        [field]: value,
      },
    }));
    setHasChanges(true);
    setSuccess(null);
  };

  // Save config
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const adminUpdateChatterConfig = httpsCallable<Partial<ChatterConfig>, { success: boolean }>(
        functionsAffiliate,
        'adminUpdateChatterConfig'
      );

      await adminUpdateChatterConfig(formData);
      setSuccess(intl.formatMessage({ id: 'admin.chatterConfig.saved', defaultMessage: 'Configuration sauvegardée avec succès' }));
      setHasChanges(false);
      fetchConfig();
    } catch (err: any) {
      console.error('Error saving config:', err);
      setError(err.message || 'Failed to save configuration');
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

  // Format amount for display (cents to dollars)
  const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
      </div>
    );
  }

  return (
    <AdminLayout>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Settings className="w-8 h-8 text-red-500" />
            <FormattedMessage id="admin.chatterConfig.title" defaultMessage="Configuration Chatter" />
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            <FormattedMessage id="admin.chatterConfig.subtitle" defaultMessage="Gérer les paramètres du système de parrainage" />
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={fetchConfig}
            className={`${UI.button.secondary} px-4 py-2 flex items-center gap-2`}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <FormattedMessage id="common.refresh" defaultMessage="Actualiser" />
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className={`${UI.button.primary} px-4 py-2 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <FormattedMessage id="common.save" defaultMessage="Sauvegarder" />
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className={`${UI.card} p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800`}>
          <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className={`${UI.card} p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800`}>
          <div className="flex items-center gap-3 text-green-600 dark:text-green-400">
            <CheckCircle className="w-5 h-5" />
            <span>{success}</span>
          </div>
        </div>
      )}

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
              {' '}avec les chatters dont la visibilité est activée.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {visibilitySuccess && <Check className="w-5 h-5 text-green-500" />}
            {togglingVisibility ? (
              <Loader2 className="w-6 h-6 animate-spin text-red-500" />
            ) : (
              <button
                onClick={handleToggleListingPage}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none ${
                  config?.isChatterListingPageVisible ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  config?.isChatterListingPageVisible ? 'translate-x-8' : 'translate-x-1'
                }`} />
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
          <FormattedMessage id="admin.chatterConfig.systemStatus" defaultMessage="Statut du système" />
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isSystemActive ?? config?.isSystemActive ?? true}
              onChange={(e) => handleChange('isSystemActive', e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-red-500 focus:ring-red-500"
            />
            <span className="text-gray-700 dark:text-gray-300">
              <FormattedMessage id="admin.chatterConfig.systemActive" defaultMessage="Système actif" />
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.newRegistrationsEnabled ?? config?.newRegistrationsEnabled ?? true}
              onChange={(e) => handleChange('newRegistrationsEnabled', e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-red-500 focus:ring-red-500"
            />
            <span className="text-gray-700 dark:text-gray-300">
              <FormattedMessage id="admin.chatterConfig.registrationsEnabled" defaultMessage="Inscriptions ouvertes" />
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.withdrawalsEnabled ?? config?.withdrawalsEnabled ?? true}
              onChange={(e) => handleChange('withdrawalsEnabled', e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-red-500 focus:ring-red-500"
            />
            <span className="text-gray-700 dark:text-gray-300">
              <FormattedMessage id="admin.chatterConfig.withdrawalsEnabled" defaultMessage="Retraits activés" />
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.trainingEnabled ?? config?.trainingEnabled ?? true}
              onChange={(e) => handleChange('trainingEnabled', e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
            />
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <GraduationCap className="w-4 h-4 text-blue-500" />
              <FormattedMessage id="admin.chatterConfig.trainingEnabled" defaultMessage="Formation visible" />
            </div>
          </label>
        </div>
      </div>

      {/* Commission Amounts */}
      <div className={`${UI.card} p-6`}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-500" />
          <FormattedMessage id="admin.chatterConfig.commissions" defaultMessage="Montants des commissions" />
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Commission appel client — split avocat/expatrié */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FormattedMessage id="admin.commission.clientByType" defaultMessage="Commission appel client (par type de prestataire)" />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1"><FormattedMessage id="admin.commission.lawyerLabel" defaultMessage="Avocat" /> (cents)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={formData.commissionClientCallAmountLawyer ?? config?.commissionClientCallAmountLawyer ?? 500}
                    onChange={(e) => handleChange('commissionClientCallAmountLawyer', parseInt(e.target.value))}
                    className={UI.input}
                    min={0}
                    step={100}
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    = {formatCents(formData.commissionClientCallAmountLawyer ?? config?.commissionClientCallAmountLawyer ?? 500)}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1"><FormattedMessage id="admin.commission.expatLabel" defaultMessage="Expatrié" /> (cents)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={formData.commissionClientCallAmountExpat ?? config?.commissionClientCallAmountExpat ?? 300}
                    onChange={(e) => handleChange('commissionClientCallAmountExpat', parseInt(e.target.value))}
                    className={UI.input}
                    min={0}
                    step={100}
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    = {formatCents(formData.commissionClientCallAmountExpat ?? config?.commissionClientCallAmountExpat ?? 300)}
                  </span>
                </div>
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              <FormattedMessage id="admin.commission.clientByType.desc" defaultMessage="Commission fixe pour chaque client qui effectue un appel payant" />
            </p>
          </div>

          {/* Commission prestataire recruté — split avocat/expatrié */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FormattedMessage id="admin.commission.providerByType" defaultMessage="Commission prestataire recruté (par type)" />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1"><FormattedMessage id="admin.commission.lawyerLabel" defaultMessage="Avocat" /> (cents)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={formData.commissionProviderCallAmountLawyer ?? config?.commissionProviderCallAmountLawyer ?? 500}
                    onChange={(e) => handleChange('commissionProviderCallAmountLawyer', parseInt(e.target.value))}
                    className={UI.input}
                    min={0}
                    step={100}
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    = {formatCents(formData.commissionProviderCallAmountLawyer ?? config?.commissionProviderCallAmountLawyer ?? 500)}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1"><FormattedMessage id="admin.commission.expatLabel" defaultMessage="Expatrié" /> (cents)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={formData.commissionProviderCallAmountExpat ?? config?.commissionProviderCallAmountExpat ?? 300}
                    onChange={(e) => handleChange('commissionProviderCallAmountExpat', parseInt(e.target.value))}
                    className={UI.input}
                    min={0}
                    step={100}
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    = {formatCents(formData.commissionProviderCallAmountExpat ?? config?.commissionProviderCallAmountExpat ?? 300)}
                  </span>
                </div>
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              <FormattedMessage id="admin.commission.providerByType.desc" defaultMessage="Commission pour chaque appel reçu par un partenaire recruté (6 mois)" />
            </p>
          </div>
        </div>

        {/* Captain Chatter Commissions */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/10">
          <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="text-yellow-500">&#128081;</span>
            <FormattedMessage id="admin.chatterConfig.captainCommissions" defaultMessage="Commissions Capitaine Chatter" />
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FormattedMessage id="admin.chatterConfig.captainCallLawyer" defaultMessage="Captain call — avocat (cents)" />
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={formData.commissionCaptainCallAmountLawyer ?? config?.commissionCaptainCallAmountLawyer ?? 300}
                  onChange={(e) => handleChange('commissionCaptainCallAmountLawyer', parseInt(e.target.value))}
                  className={UI.input}
                  min={0}
                  step={50}
                />
                <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  = {formatCents(formData.commissionCaptainCallAmountLawyer ?? config?.commissionCaptainCallAmountLawyer ?? 300)}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FormattedMessage id="admin.chatterConfig.captainCallExpat" defaultMessage="Captain call — expatrié (cents)" />
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={formData.commissionCaptainCallAmountExpat ?? config?.commissionCaptainCallAmountExpat ?? 200}
                  onChange={(e) => handleChange('commissionCaptainCallAmountExpat', parseInt(e.target.value))}
                  className={UI.input}
                  min={0}
                  step={50}
                />
                <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  = {formatCents(formData.commissionCaptainCallAmountExpat ?? config?.commissionCaptainCallAmountExpat ?? 200)}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FormattedMessage id="admin.chatterConfig.captainQualityBonus" defaultMessage="Bonus qualité capitaine (cents)" />
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={formData.captainQualityBonusAmount ?? config?.captainQualityBonusAmount ?? 5000}
                onChange={(e) => handleChange('captainQualityBonusAmount', parseInt(e.target.value))}
                className={UI.input}
                min={0}
                step={500}
                style={{ maxWidth: 200 }}
              />
              <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                = {formatCents(formData.captainQualityBonusAmount ?? config?.captainQualityBonusAmount ?? 5000)}
              </span>
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            <FormattedMessage id="admin.chatterConfig.captainCommissions.desc" defaultMessage="Le capitaine reçoit ces commissions À LA PLACE des commissions N1/N2 standard. Paliers mensuels configurables dans la liste capitaines." />
          </p>
        </div>

        {/* Recruiter Milestone Bonus */}
        <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
                <FormattedMessage id="admin.chatterConfig.recruiterBonus" defaultMessage="Bonus partenaire automatique" />
              </p>
              <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                <FormattedMessage
                  id="admin.chatterConfig.recruiterBonus.desc"
                  defaultMessage="$50 automatiquement versés au partenaire quand son filleul atteint $500 de commissions."
                />
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Withdrawal Settings */}
      <div className={`${UI.card} p-6`}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-500" />
          <FormattedMessage id="admin.chatterConfig.withdrawalSettings" defaultMessage="Paramètres de retrait" />
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FormattedMessage id="admin.chatterConfig.minWithdrawal" defaultMessage="Retrait minimum (cents)" />
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={formData.minimumWithdrawalAmount ?? config?.minimumWithdrawalAmount ?? 3000}
                onChange={(e) => handleChange('minimumWithdrawalAmount', parseInt(e.target.value))}
                className={UI.input}
                min={0}
                step={100}
              />
              <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                = {formatCents(formData.minimumWithdrawalAmount ?? config?.minimumWithdrawalAmount ?? 3000)}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FormattedMessage id="admin.chatterConfig.validationHold" defaultMessage="Délai de validation (heures)" />
            </label>
            <input
              type="number"
              value={formData.validationHoldPeriodHours ?? config?.validationHoldPeriodHours ?? 48}
              onChange={(e) => handleChange('validationHoldPeriodHours', parseInt(e.target.value))}
              className={UI.input}
              min={0}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FormattedMessage id="admin.chatterConfig.releaseDelay" defaultMessage="Délai de libération (heures)" />
            </label>
            <input
              type="number"
              value={formData.releaseDelayHours ?? config?.releaseDelayHours ?? 24}
              onChange={(e) => handleChange('releaseDelayHours', parseInt(e.target.value))}
              className={UI.input}
              min={0}
            />
          </div>
        </div>
      </div>

      {/* Level Bonuses */}
      <div className={`${UI.card} p-6`}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500" />
          <FormattedMessage id="admin.chatterConfig.levelBonuses" defaultMessage="Bonus par niveau" />
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {([1, 2, 3, 4, 5] as const).map((level) => {
            const levelKey = `level${level}` as 'level1' | 'level2' | 'level3' | 'level4' | 'level5';
            const bonusValue = (formData.levelBonuses?.[levelKey] ?? config?.levelBonuses?.[levelKey]) ?? 1;
            return (
              <div key={level}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Niveau {level} {level === 1 ? '(Bronze)' : level === 2 ? '(Silver)' : level === 3 ? '(Gold)' : level === 4 ? '(Platinum)' : '(Diamond)'}
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={bonusValue}
                    onChange={(e) => handleNestedChange('levelBonuses', levelKey, parseFloat(e.target.value))}
                    className={UI.input}
                    step={0.05}
                    min={1}
                  />
                  <Percent className="w-4 h-4 text-gray-400" />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  +{((bonusValue - 1) * 100).toFixed(0)}%
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Level Thresholds */}
      <div className={`${UI.card} p-6`}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-500" />
          <FormattedMessage id="admin.chatterConfig.levelThresholds" defaultMessage="Seuils de niveau (gains totaux)" />
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {([2, 3, 4, 5] as const).map((level) => {
            const levelKey = `level${level}` as 'level2' | 'level3' | 'level4' | 'level5';
            const thresholdValue = (formData.levelThresholds?.[levelKey] ?? config?.levelThresholds?.[levelKey]) ?? 0;
            return (
              <div key={level}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Niveau {level}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={thresholdValue}
                    onChange={(e) => handleNestedChange('levelThresholds', levelKey, parseInt(e.target.value))}
                    className={UI.input}
                    step={1000}
                    min={0}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  = {formatCents(thresholdValue)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top 3 Bonuses */}
      <div className={`${UI.card} p-6`}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-red-500" />
          <FormattedMessage id="admin.chatterConfig.top3Bonuses" defaultMessage="Bonus Top 3 mensuel" />
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FormattedMessage id="admin.chatterConfig.top1Bonus" defaultMessage="Top 1 (multiplicateur)" />
            </label>
            <input
              type="number"
              value={formData.top1BonusMultiplier ?? config?.top1BonusMultiplier ?? 2.0}
              onChange={(e) => handleChange('top1BonusMultiplier', parseFloat(e.target.value))}
              className={UI.input}
              step={0.1}
              min={1}
            />
            <p className="mt-1 text-xs text-gray-500">
              +{((formData.top1BonusMultiplier ?? config?.top1BonusMultiplier ?? 2.0) - 1) * 100}% bonus
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FormattedMessage id="admin.chatterConfig.top2Bonus" defaultMessage="Top 2 (multiplicateur)" />
            </label>
            <input
              type="number"
              value={formData.top2BonusMultiplier ?? config?.top2BonusMultiplier ?? 1.5}
              onChange={(e) => handleChange('top2BonusMultiplier', parseFloat(e.target.value))}
              className={UI.input}
              step={0.1}
              min={1}
            />
            <p className="mt-1 text-xs text-gray-500">
              +{((formData.top2BonusMultiplier ?? config?.top2BonusMultiplier ?? 1.5) - 1) * 100}% bonus
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FormattedMessage id="admin.chatterConfig.top3Bonus" defaultMessage="Top 3 (multiplicateur)" />
            </label>
            <input
              type="number"
              value={formData.top3BonusMultiplier ?? config?.top3BonusMultiplier ?? 1.15}
              onChange={(e) => handleChange('top3BonusMultiplier', parseFloat(e.target.value))}
              className={UI.input}
              step={0.05}
              min={1}
            />
            <p className="mt-1 text-xs text-gray-500">
              +{((formData.top3BonusMultiplier ?? config?.top3BonusMultiplier ?? 1.15) - 1) * 100}% bonus
            </p>
          </div>
        </div>
      </div>

      {/* Zoom & Quiz Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Zoom Settings */}
        <div className={`${UI.card} p-6`}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Video className="w-5 h-5 text-blue-500" />
            <FormattedMessage id="admin.chatterConfig.zoomSettings" defaultMessage="Bonus Zoom" />
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FormattedMessage id="admin.chatterConfig.zoomBonus" defaultMessage="Multiplicateur bonus Zoom" />
              </label>
              <input
                type="number"
                value={formData.zoomBonusMultiplier ?? config?.zoomBonusMultiplier ?? 1.1}
                onChange={(e) => handleChange('zoomBonusMultiplier', parseFloat(e.target.value))}
                className={UI.input}
                step={0.05}
                min={1}
              />
              <p className="mt-1 text-xs text-gray-500">
                +{((formData.zoomBonusMultiplier ?? config?.zoomBonusMultiplier ?? 1.1) - 1) * 100}% bonus
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FormattedMessage id="admin.chatterConfig.zoomDuration" defaultMessage="Durée du bonus (jours)" />
              </label>
              <input
                type="number"
                value={formData.zoomBonusDurationDays ?? config?.zoomBonusDurationDays ?? 7}
                onChange={(e) => handleChange('zoomBonusDurationDays', parseInt(e.target.value))}
                className={UI.input}
                min={1}
              />
            </div>
          </div>
        </div>

        {/* Quiz Settings */}
        <div className={`${UI.card} p-6`}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-500" />
            <FormattedMessage id="admin.chatterConfig.quizSettings" defaultMessage="Paramètres du quiz" />
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FormattedMessage id="admin.chatterConfig.quizPassingScore" defaultMessage="Score de réussite (%)" />
              </label>
              <input
                type="number"
                value={formData.quizPassingScore ?? config?.quizPassingScore ?? 85}
                onChange={(e) => handleChange('quizPassingScore', parseInt(e.target.value))}
                className={UI.input}
                min={0}
                max={100}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FormattedMessage id="admin.chatterConfig.quizRetryDelay" defaultMessage="Délai avant nouvel essai (heures)" />
              </label>
              <input
                type="number"
                value={formData.quizRetryDelayHours ?? config?.quizRetryDelayHours ?? 24}
                onChange={(e) => handleChange('quizRetryDelayHours', parseInt(e.target.value))}
                className={UI.input}
                min={0}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FormattedMessage id="admin.chatterConfig.quizQuestions" defaultMessage="Nombre de questions" />
              </label>
              <input
                type="number"
                value={formData.quizQuestionsCount ?? config?.quizQuestionsCount ?? 5}
                onChange={(e) => handleChange('quizQuestionsCount', parseInt(e.target.value))}
                className={UI.input}
                min={1}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Other Settings */}
      <div className={`${UI.card} p-6`}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-500" />
          <FormattedMessage id="admin.chatterConfig.otherSettings" defaultMessage="Autres paramètres" />
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FormattedMessage id="admin.chatterConfig.recruitmentDuration" defaultMessage="Durée du lien partenaires (mois)" />
            </label>
            <input
              type="number"
              value={formData.recruitmentLinkDurationMonths ?? config?.recruitmentLinkDurationMonths ?? 6}
              onChange={(e) => handleChange('recruitmentLinkDurationMonths', parseInt(e.target.value))}
              className={UI.input}
              min={1}
            />
            <p className="mt-1 text-xs text-gray-500">
              <FormattedMessage id="admin.chatterConfig.recruitmentDuration.desc" defaultMessage="Période pendant laquelle les commissions partenaires sont versées" />
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FormattedMessage id="admin.chatterConfig.attributionWindow" defaultMessage="Fenêtre d'attribution (jours)" />
            </label>
            <input
              type="number"
              value={formData.attributionWindowDays ?? config?.attributionWindowDays ?? 30}
              onChange={(e) => handleChange('attributionWindowDays', parseInt(e.target.value))}
              className={UI.input}
              min={1}
            />
            <p className="mt-1 text-xs text-gray-500">
              <FormattedMessage id="admin.chatterConfig.attributionWindow.desc" defaultMessage="Durée de validité du cookie d'attribution" />
            </p>
          </div>
        </div>
      </div>

      {/* Version Info */}
      {config && (
        <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
          <FormattedMessage
            id="admin.chatterConfig.versionInfo"
            defaultMessage="Version {version} - Dernière modification: {date}"
            values={{
              version: config.version,
              date: config.updatedAt
                ? new Date(config.updatedAt).toLocaleDateString(intl.locale, {
                    dateStyle: 'long',
                    timeStyle: 'short',
                  })
                : '-',
            }}
          />
        </div>
      )}
    </div>
    </AdminLayout>
  );
};

export default AdminChatterConfig;
