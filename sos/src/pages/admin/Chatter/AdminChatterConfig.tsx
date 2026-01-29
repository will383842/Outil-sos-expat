/**
 * AdminChatterConfig - Admin page for configuring chatter system settings
 * Allows configuration of commission rates, withdrawal limits, bonuses, etc.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { getFunctions, httpsCallable } from 'firebase/functions';
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
} from 'lucide-react';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
    danger: "bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-all",
  },
  input: "w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500",
} as const;

interface ChatterConfig {
  isSystemActive: boolean;
  newRegistrationsEnabled: boolean;
  withdrawalsEnabled: boolean;
  commissionClientAmount: number;
  commissionRecruitmentAmount: number;
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
}

const AdminChatterConfig: React.FC = () => {
  const intl = useIntl();
  const functions = getFunctions(undefined, 'europe-west1');

  // State
  const [config, setConfig] = useState<ChatterConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<ChatterConfig>>({});

  // Fetch config
  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const adminGetChatterConfig = httpsCallable<void, { config: ChatterConfig }>(
        functions,
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
  }, [functions]);

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
        functions,
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

  // Format amount for display (cents to dollars)
  const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Settings className="w-8 h-8 text-amber-500" />
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

      {/* System Status */}
      <div className={`${UI.card} p-6`}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-amber-500" />
          <FormattedMessage id="admin.chatterConfig.systemStatus" defaultMessage="Statut du système" />
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isSystemActive ?? config?.isSystemActive ?? true}
              onChange={(e) => handleChange('isSystemActive', e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
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
              className="w-5 h-5 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
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
              className="w-5 h-5 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
            />
            <span className="text-gray-700 dark:text-gray-300">
              <FormattedMessage id="admin.chatterConfig.withdrawalsEnabled" defaultMessage="Retraits activés" />
            </span>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FormattedMessage id="admin.chatterConfig.clientCommission" defaultMessage="Commission par client référé (cents)" />
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={formData.commissionClientAmount ?? config?.commissionClientAmount ?? 1000}
                onChange={(e) => handleChange('commissionClientAmount', parseInt(e.target.value))}
                className={UI.input}
                min={0}
                step={100}
              />
              <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                = {formatCents(formData.commissionClientAmount ?? config?.commissionClientAmount ?? 1000)}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              <FormattedMessage id="admin.chatterConfig.clientCommission.desc" defaultMessage="Commission fixe pour chaque client qui effectue un appel payant" />
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FormattedMessage id="admin.chatterConfig.recruitmentCommission" defaultMessage="Commission par recrutement (cents)" />
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={formData.commissionRecruitmentAmount ?? config?.commissionRecruitmentAmount ?? 500}
                onChange={(e) => handleChange('commissionRecruitmentAmount', parseInt(e.target.value))}
                className={UI.input}
                min={0}
                step={100}
              />
              <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                = {formatCents(formData.commissionRecruitmentAmount ?? config?.commissionRecruitmentAmount ?? 500)}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              <FormattedMessage id="admin.chatterConfig.recruitmentCommission.desc" defaultMessage="Commission pour chaque appel reçu par un prestataire recruté (6 mois)" />
            </p>
          </div>
        </div>

        {/* Recruiter Milestone Bonus */}
        <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                <FormattedMessage id="admin.chatterConfig.recruiterBonus" defaultMessage="Bonus recruteur automatique" />
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                <FormattedMessage
                  id="admin.chatterConfig.recruiterBonus.desc"
                  defaultMessage="$50 automatiquement versés au recruteur quand son filleul atteint $500 de commissions."
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
                value={formData.minimumWithdrawalAmount ?? config?.minimumWithdrawalAmount ?? 2500}
                onChange={(e) => handleChange('minimumWithdrawalAmount', parseInt(e.target.value))}
                className={UI.input}
                min={0}
                step={100}
              />
              <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                = {formatCents(formData.minimumWithdrawalAmount ?? config?.minimumWithdrawalAmount ?? 2500)}
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
          <Trophy className="w-5 h-5 text-amber-500" />
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
              <FormattedMessage id="admin.chatterConfig.recruitmentDuration" defaultMessage="Durée du lien de recrutement (mois)" />
            </label>
            <input
              type="number"
              value={formData.recruitmentLinkDurationMonths ?? config?.recruitmentLinkDurationMonths ?? 6}
              onChange={(e) => handleChange('recruitmentLinkDurationMonths', parseInt(e.target.value))}
              className={UI.input}
              min={1}
            />
            <p className="mt-1 text-xs text-gray-500">
              <FormattedMessage id="admin.chatterConfig.recruitmentDuration.desc" defaultMessage="Période pendant laquelle les commissions de recrutement sont versées" />
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
  );
};

export default AdminChatterConfig;
