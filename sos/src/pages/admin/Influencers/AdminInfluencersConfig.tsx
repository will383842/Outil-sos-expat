/**
 * AdminInfluencersConfig - Admin page for configuring influencer system settings
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { getFunctions, httpsCallable } from 'firebase/functions';
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
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
  },
  input: "w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white",
} as const;

interface InfluencerConfig {
  clientReferralCommission: number;
  providerRecruitmentCommission: number;
  clientDiscountPercent: number;
  minimumWithdrawalAmount: number;
  commissionValidationDays: number;
  commissionReleaseHours: number;
  recruitmentCommissionWindowMonths: number;
  updatedAt?: string;
  updatedBy?: string;
}

const DEFAULT_CONFIG: InfluencerConfig = {
  clientReferralCommission: 1000, // $10
  providerRecruitmentCommission: 500, // $5
  clientDiscountPercent: 5,
  minimumWithdrawalAmount: 5000, // $50
  commissionValidationDays: 7,
  commissionReleaseHours: 24,
  recruitmentCommissionWindowMonths: 6,
};

const AdminInfluencersConfig: React.FC = () => {
  const intl = useIntl();
  const functions = getFunctions(undefined, 'europe-west1');

  const [config, setConfig] = useState<InfluencerConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch current config
  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const adminGetInfluencerConfig = httpsCallable<void, { config: InfluencerConfig }>(
        functions,
        'adminGetInfluencerConfig'
      );

      const result = await adminGetInfluencerConfig();
      setConfig(result.data.config);
    } catch (err: any) {
      console.error('Error fetching config:', err);
      // Use default config if not found
      setConfig(DEFAULT_CONFIG);
    } finally {
      setLoading(false);
    }
  }, [functions]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Save config
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const adminUpdateInfluencerConfig = httpsCallable(functions, 'adminUpdateInfluencerConfig');
      await adminUpdateInfluencerConfig({ config });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error saving config:', err);
      setError(err.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  // Handle input change (convert dollars to cents for amounts)
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
      <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
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

        {/* Commission Settings */}
        <div className={`${UI.card} p-6`}>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            <FormattedMessage id="admin.config.commissions" defaultMessage="Commissions" />
          </h2>

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
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                <FormattedMessage id="admin.config.clientCommission.hint" defaultMessage="Montant fixe par appel client référé" />
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FormattedMessage id="admin.config.recruitCommission" defaultMessage="Commission recrutement prestataire" />
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
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                <FormattedMessage id="admin.config.recruitCommission.hint" defaultMessage="Montant fixe par appel reçu par prestataire recruté" />
              </p>
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
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              <FormattedMessage id="admin.config.discountPercent.hint" defaultMessage="Remise automatique appliquée aux clients utilisant un lien d'affiliation" />
            </p>
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
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              <FormattedMessage id="admin.config.minWithdrawal.hint" defaultMessage="Solde minimum requis pour demander un retrait" />
            </p>
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
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                <FormattedMessage id="admin.config.validationDays.hint" defaultMessage="Avant validation commission" />
              </p>
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
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                <FormattedMessage id="admin.config.releaseHours.hint" defaultMessage="Après validation" />
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FormattedMessage id="admin.config.recruitWindow" defaultMessage="Fenêtre recrutement (mois)" />
              </label>
              <input
                type="number"
                min="1"
                max="24"
                value={config.recruitmentCommissionWindowMonths}
                onChange={(e) => handleChange('recruitmentCommissionWindowMonths', parseInt(e.target.value || '6'))}
                className={UI.input}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                <FormattedMessage id="admin.config.recruitWindow.hint" defaultMessage="Période de commissions sur recrues" />
              </p>
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
            onClick={handleSave}
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
    </AdminLayout>
  );
};

export default AdminInfluencersConfig;
