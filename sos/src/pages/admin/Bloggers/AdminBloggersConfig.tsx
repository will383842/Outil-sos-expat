/**
 * AdminBloggersConfig - Admin page for configuring blogger system settings
 *
 * Note: Bloggers have FIXED commissions - this page allows configuring
 * system-level settings but NOT commission rates (those are fixed at $10/$5)
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
  Clock,
  RefreshCw,
  Check,
  Shield,
  Info,
  Globe,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';

// Design tokens - Purple theme for Bloggers
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
  },
  input: "w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white",
} as const;

interface BloggerConfig {
  // Fixed commissions (read-only display)
  clientReferralCommission: number; // Always 1000 ($10)
  providerRecruitmentCommission: number; // Always 500 ($5)
  clientDiscountPercent: number; // Always 0%

  // Configurable settings
  minimumWithdrawalAmount: number;
  commissionValidationDays: number;
  commissionReleaseHours: number;
  recruitmentCommissionWindowMonths: number;

  // System toggles
  isSystemActive?: boolean;
  newRegistrationsEnabled?: boolean;
  withdrawalsEnabled?: boolean;

  // Metadata
  updatedAt?: string;
  updatedBy?: string;

  // Directory page visibility
  isBloggerListingPageVisible?: boolean;
}

// Default config
const DEFAULT_CONFIG: BloggerConfig = {
  clientReferralCommission: 1000, // Fixed $10
  providerRecruitmentCommission: 500, // Fixed $5
  clientDiscountPercent: 0, // No discount for bloggers
  minimumWithdrawalAmount: 3000, // $30 default
  commissionValidationDays: 7,
  commissionReleaseHours: 24,
  recruitmentCommissionWindowMonths: 6,
  isSystemActive: true,
  newRegistrationsEnabled: true,
  withdrawalsEnabled: true,
  isBloggerListingPageVisible: false,
};

const AdminBloggersConfig: React.FC = () => {
  const intl = useIntl();

  const [config, setConfig] = useState<BloggerConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  const [visibilitySuccess, setVisibilitySuccess] = useState(false);

  // Fetch current config
  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const adminGetBloggerConfig = httpsCallable<void, { config: BloggerConfig }>(
        functionsWest2,
        'adminGetBloggerConfig'
      );

      const result = await adminGetBloggerConfig();
      setConfig({
        ...DEFAULT_CONFIG,
        ...result.data.config,
        // Ensure fixed values are always correct
        clientReferralCommission: 1000,
        providerRecruitmentCommission: 500,
        clientDiscountPercent: 0,
      });
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

  // Save config
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const adminUpdateBloggerConfig = httpsCallable(functionsWest2, 'adminUpdateBloggerConfig');
      await adminUpdateBloggerConfig({
        updates: {
          minimumWithdrawalAmount: config.minimumWithdrawalAmount,
          commissionValidationDays: config.commissionValidationDays,
          commissionReleaseHours: config.commissionReleaseHours,
          recruitmentCommissionWindowMonths: config.recruitmentCommissionWindowMonths,
          isSystemActive: config.isSystemActive,
          newRegistrationsEnabled: config.newRegistrationsEnabled,
          withdrawalsEnabled: config.withdrawalsEnabled,
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

  // Handle input change
  const handleChange = (field: keyof BloggerConfig, value: number | boolean) => {
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


  const handleToggleListingPage = useCallback(async () => {
    setTogglingVisibility(true);
    setVisibilitySuccess(false);
    try {
      const fn = httpsCallable(functionsWest2, 'adminUpdateBloggerConfig');
      const newValue = !config.isBloggerListingPageVisible;
      await fn({ isBloggerListingPageVisible: newValue });
      setConfig(prev => ({ ...prev, isBloggerListingPageVisible: newValue }));
      setVisibilitySuccess(true);
      setTimeout(() => setVisibilitySuccess(false), 2000);
    } catch (err) {
      console.error('[AdminBloggersConfig] Toggle listing page failed:', err);
    } finally {
      setTogglingVisibility(false);
    }
  }, [config.isBloggerListingPageVisible]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
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
              <Settings className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500" />
              <FormattedMessage id="admin.bloggers.config.title" defaultMessage="Configuration Blogueurs" />
            </h1>
            <p className="mt-1 text-sm sm:text-base text-gray-500 dark:text-gray-400">
              <FormattedMessage
                id="admin.bloggers.config.subtitle"
                defaultMessage="Paramètres du programme blogueurs"
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

        {/* Directory Page Visibility */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold dark:text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-purple-500" />
                Page Répertoire Public
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Activer pour rendre visible la page{' '}
                <a href="/nos-blogueurs" target="_blank" className="text-purple-600 hover:underline">/nos-blogueurs</a>
                {' '}avec les blogueurs dont la visibilité est activée.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {visibilitySuccess && <Check className="w-5 h-5 text-green-500" />}
              {togglingVisibility ? (
                <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
              ) : (
                <button
                  onClick={handleToggleListingPage}
                  className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none ${
                    config.isBloggerListingPageVisible ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    config.isBloggerListingPageVisible ? 'translate-x-8' : 'translate-x-1'
                  }`} />
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
            <Shield className="w-5 h-5 text-purple-500" />
            <FormattedMessage id="admin.config.systemSettings" defaultMessage="Paramètres système" />
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
              <input
                type="checkbox"
                checked={config.isSystemActive ?? true}
                onChange={(e) => handleChange('isSystemActive', e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-purple-500 focus:ring-purple-500"
              />
              <span className="text-gray-700 dark:text-gray-300 text-sm">
                <FormattedMessage id="admin.config.systemActive" defaultMessage="Système actif" />
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
              <input
                type="checkbox"
                checked={config.newRegistrationsEnabled ?? true}
                onChange={(e) => handleChange('newRegistrationsEnabled', e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-purple-500 focus:ring-purple-500"
              />
              <span className="text-gray-700 dark:text-gray-300 text-sm">
                <FormattedMessage id="admin.config.registrationsEnabled" defaultMessage="Inscriptions ouvertes" />
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
              <input
                type="checkbox"
                checked={config.withdrawalsEnabled ?? true}
                onChange={(e) => handleChange('withdrawalsEnabled', e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-purple-500 focus:ring-purple-500"
              />
              <span className="text-gray-700 dark:text-gray-300 text-sm">
                <FormattedMessage id="admin.config.withdrawalsEnabled" defaultMessage="Retraits activés" />
              </span>
            </label>
          </div>
        </div>

        {/* Fixed Commissions Info - Read Only */}
        <div className={`${UI.card} p-6 bg-purple-50 dark:bg-purple-900/20`}>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-purple-500" />
            <FormattedMessage id="admin.bloggers.config.fixedCommissions" defaultMessage="Commissions fixes (non modifiables)" />
          </h2>

          <div className="flex items-start gap-3 mb-4">
            <Info className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-purple-700 dark:text-purple-300">
              <FormattedMessage
                id="admin.bloggers.config.fixedCommissionsInfo"
                defaultMessage="Les commissions des blogueurs sont fixes et ne peuvent pas être modifiées. C'est une caractéristique distinctive du programme blogueur par rapport aux chatters et influenceurs."
              />
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-white dark:bg-white/5 rounded-xl">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Commission par appel référé</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">$10.00</p>
              <p className="text-xs text-gray-400 mt-1">Montant fixe</p>
            </div>

            <div className="p-4 bg-white dark:bg-white/5 rounded-xl">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Commission par appel partenaire</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">$5.00</p>
              <p className="text-xs text-gray-400 mt-1">Par appel du partenaire</p>
            </div>

            <div className="p-4 bg-white dark:bg-white/5 rounded-xl">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Remise client</p>
              <p className="text-2xl font-bold text-gray-400 dark:text-gray-500">0%</p>
              <p className="text-xs text-gray-400 mt-1">Pas de remise client</p>
            </div>
          </div>
        </div>

        {/* Withdrawal Settings */}
        <div className={`${UI.card} p-6`}>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
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
            <Clock className="w-5 h-5 text-blue-500" />
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
              <p className="mt-1 text-xs text-gray-500">
                <FormattedMessage
                  id="admin.config.validationDaysHelp"
                  defaultMessage="Délai avant validation de la commission"
                />
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
              <p className="mt-1 text-xs text-gray-500">
                <FormattedMessage
                  id="admin.config.releaseHoursHelp"
                  defaultMessage="Délai avant disponibilité pour retrait"
                />
              </p>
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
              <p className="mt-1 text-xs text-gray-500">
                <FormattedMessage
                  id="admin.config.recruitWindowHelp"
                  defaultMessage="Durée de suivi des partenaires"
                />
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

export default AdminBloggersConfig;
