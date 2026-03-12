/**
 * AdminPartnersConfig - Premium 2026 global partner program configuration
 *
 * Features:
 * - System toggles (active, listings, footer link, withdrawals)
 * - Default commission config with preview
 * - Timing & threshold settings
 * - Withdrawal minimum
 * - Attribution window
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import { db, functionsAffiliate } from '@/config/firebase';
import toast from 'react-hot-toast';
import {
  Settings,
  Save,
  Loader2,
  AlertTriangle,
  RefreshCw,
  DollarSign,
  Clock,
  Eye,
  Shield,
  Info,
  Wallet,
  Check,
  ToggleLeft,
  ToggleRight,
  Link2,
  Globe,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';

// ============================================================================
// DESIGN TOKENS
// ============================================================================

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-medium rounded-xl px-4 py-2 transition-all active:scale-[0.98]",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl px-4 py-2 transition-all active:scale-[0.98]",
  },
  input: "w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-900 dark:text-white transition-all",
  label: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5",
} as const;

// ============================================================================
// TYPES
// ============================================================================

interface PartnerConfig {
  isPartnerListingPageVisible: boolean;
  isPartnerFooterLinkVisible: boolean;
  defaultCommissionPerCallLawyer: number;
  defaultCommissionPerCallExpat: number;
  defaultHoldPeriodDays: number;
  defaultReleaseDelayHours: number;
  defaultMinimumCallDuration: number;
  minimumWithdrawalAmount: number;
  attributionWindowDays: number;
  isSystemActive: boolean;
  withdrawalsEnabled: boolean;
}

const DEFAULT_CONFIG: PartnerConfig = {
  isPartnerListingPageVisible: false,
  isPartnerFooterLinkVisible: false,
  defaultCommissionPerCallLawyer: 1000,
  defaultCommissionPerCallExpat: 1000,
  defaultHoldPeriodDays: 7,
  defaultReleaseDelayHours: 24,
  defaultMinimumCallDuration: 60,
  minimumWithdrawalAmount: 3000,
  attributionWindowDays: 30,
  isSystemActive: true,
  withdrawalsEnabled: true,
};

// ============================================================================
// TOGGLE COMPONENT
// ============================================================================

const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}> = ({ checked, onChange, label, description }) => (
  <div className="flex items-start gap-4 py-3 border-b border-gray-100 dark:border-white/5 last:border-0">
    <button
      onClick={() => onChange(!checked)}
      className="mt-0.5 flex-shrink-0 transition-transform active:scale-95"
      role="switch"
      aria-checked={checked}
    >
      {checked ? (
        <ToggleRight className="w-10 h-6 text-teal-500" />
      ) : (
        <ToggleLeft className="w-10 h-6 text-gray-400 dark:text-gray-500" />
      )}
    </button>
    <div className="min-w-0">
      <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
      {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
    </div>
  </div>
);

// ============================================================================
// COMPONENT
// ============================================================================

const AdminPartnersConfig: React.FC = () => {
  const intl = useIntl();
  const [config, setConfig] = useState<PartnerConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const docRef = doc(db, 'partner_config', 'current');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setConfig({ ...DEFAULT_CONFIG, ...snap.data() as Partial<PartnerConfig> });
      } else {
        setConfig(DEFAULT_CONFIG);
      }
    } catch (err: any) {
      console.warn('Could not load partner config, using defaults:', err.message);
      setConfig(DEFAULT_CONFIG);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    try {
      const fn = httpsCallable(functionsAffiliate, 'adminUpdatePartnerConfig');
      await fn(config);
      toast.success(intl.formatMessage({ id: 'admin.partners.config.saved', defaultMessage: 'Configuration enregistree' }));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      toast.error(err?.message || 'Error saving config');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: keyof PartnerConfig, value: number | boolean) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6 flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
          <button onClick={fetchConfig} className={`${UI.button.secondary} inline-flex items-center gap-2`}>
            <RefreshCw className="w-4 h-4" />
            <FormattedMessage id="common.retry" defaultMessage="Reessayer" />
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 flex items-center justify-center">
              <Settings className="w-5 h-5 text-teal-500" />
            </div>
            <FormattedMessage id="admin.partners.config.title" defaultMessage="Configuration Partenaires" />
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-[52px]">
            <FormattedMessage id="admin.partners.config.subtitle" defaultMessage="Parametres globaux du programme partenaire" />
          </p>
        </div>

        {/* System Toggles */}
        <div className={UI.card + ' p-6'}>
          <div className="flex items-center gap-2 mb-5">
            <Shield className="w-5 h-5 text-teal-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              <FormattedMessage id="admin.partners.config.system" defaultMessage="Systeme" />
            </h2>
          </div>
          <ToggleSwitch
            checked={config.isSystemActive}
            onChange={(v) => handleChange('isSystemActive', v)}
            label={intl.formatMessage({ id: 'admin.partners.config.systemActive', defaultMessage: 'Systeme partenaire actif' })}
            description={intl.formatMessage({ id: 'admin.partners.config.systemActiveDesc', defaultMessage: 'Active ou desactive completement le systeme partenaire' })}
          />
          <ToggleSwitch
            checked={config.withdrawalsEnabled}
            onChange={(v) => handleChange('withdrawalsEnabled', v)}
            label={intl.formatMessage({ id: 'admin.partners.config.withdrawalsEnabled', defaultMessage: 'Retraits actives' })}
            description={intl.formatMessage({ id: 'admin.partners.config.withdrawalsEnabledDesc', defaultMessage: 'Permettre aux partenaires de demander des retraits' })}
          />
        </div>

        {/* Visibility Toggles */}
        <div className={UI.card + ' p-6'}>
          <div className="flex items-center gap-2 mb-5">
            <Eye className="w-5 h-5 text-teal-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              <FormattedMessage id="admin.partners.config.visibility" defaultMessage="Visibilite" />
            </h2>
          </div>
          <ToggleSwitch
            checked={config.isPartnerListingPageVisible}
            onChange={(v) => handleChange('isPartnerListingPageVisible', v)}
            label={intl.formatMessage({ id: 'admin.partners.config.listingPageVisible', defaultMessage: 'Page listing partenaires visible' })}
            description={intl.formatMessage({ id: 'admin.partners.config.listingPageVisibleDesc', defaultMessage: 'Afficher la page publique listant les partenaires' })}
          />
          <ToggleSwitch
            checked={config.isPartnerFooterLinkVisible}
            onChange={(v) => handleChange('isPartnerFooterLinkVisible', v)}
            label={intl.formatMessage({ id: 'admin.partners.config.footerLinkVisible', defaultMessage: 'Lien footer visible' })}
            description={intl.formatMessage({ id: 'admin.partners.config.footerLinkVisibleDesc', defaultMessage: 'Afficher le lien "Devenir partenaire" dans le footer' })}
          />
        </div>

        {/* Default Commissions */}
        <div className={UI.card + ' p-6'}>
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-teal-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              <FormattedMessage id="admin.partners.config.defaultCommissions" defaultMessage="Commissions par defaut" />
            </h2>
          </div>
          <div className="flex items-start gap-2 p-3 mb-5 bg-teal-50 dark:bg-teal-900/20 rounded-xl border border-teal-100 dark:border-teal-800/30">
            <Info className="w-4 h-4 text-teal-600 dark:text-teal-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-teal-700 dark:text-teal-300">
              <FormattedMessage id="admin.partners.config.commissionNote" defaultMessage="Ces valeurs s'appliquent aux nouveaux partenaires. Chaque partenaire peut avoir sa propre configuration." />
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={UI.label}>
                <FormattedMessage id="admin.partners.config.commissionLawyer" defaultMessage="Par appel - Avocat (cents)" />
              </label>
              <input type="number" value={config.defaultCommissionPerCallLawyer} onChange={(e) => handleChange('defaultCommissionPerCallLawyer', Number(e.target.value))} className={UI.input} min={0} />
              <p className="text-xs text-gray-500 mt-1">${(config.defaultCommissionPerCallLawyer / 100).toFixed(2)}</p>
            </div>
            <div>
              <label className={UI.label}>
                <FormattedMessage id="admin.partners.config.commissionExpat" defaultMessage="Par appel - Expat (cents)" />
              </label>
              <input type="number" value={config.defaultCommissionPerCallExpat} onChange={(e) => handleChange('defaultCommissionPerCallExpat', Number(e.target.value))} className={UI.input} min={0} />
              <p className="text-xs text-gray-500 mt-1">${(config.defaultCommissionPerCallExpat / 100).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Timing & Thresholds */}
        <div className={UI.card + ' p-6'}>
          <div className="flex items-center gap-2 mb-5">
            <Clock className="w-5 h-5 text-teal-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              <FormattedMessage id="admin.partners.config.timing" defaultMessage="Delais et seuils" />
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={UI.label}><FormattedMessage id="admin.partners.config.holdPeriod" defaultMessage="Retention (jours)" /></label>
              <input type="number" value={config.defaultHoldPeriodDays} onChange={(e) => handleChange('defaultHoldPeriodDays', Number(e.target.value))} className={UI.input} min={0} />
            </div>
            <div>
              <label className={UI.label}><FormattedMessage id="admin.partners.config.releaseDelay" defaultMessage="Delai liberation (heures)" /></label>
              <input type="number" value={config.defaultReleaseDelayHours} onChange={(e) => handleChange('defaultReleaseDelayHours', Number(e.target.value))} className={UI.input} min={0} />
            </div>
            <div>
              <label className={UI.label}><FormattedMessage id="admin.partners.config.minCallDuration" defaultMessage="Duree min. appel (secondes)" /></label>
              <input type="number" value={config.defaultMinimumCallDuration} onChange={(e) => handleChange('defaultMinimumCallDuration', Number(e.target.value))} className={UI.input} min={0} />
            </div>
            <div>
              <label className={UI.label}><FormattedMessage id="admin.partners.config.attributionWindow" defaultMessage="Fenetre attribution (jours)" /></label>
              <input type="number" value={config.attributionWindowDays} onChange={(e) => handleChange('attributionWindowDays', Number(e.target.value))} className={UI.input} min={1} />
              <p className="text-xs text-gray-500 mt-1"><FormattedMessage id="admin.partners.config.attributionWindowDesc" defaultMessage="Duree pendant laquelle un clic est attribue au partenaire" /></p>
            </div>
          </div>
        </div>

        {/* Withdrawal */}
        <div className={UI.card + ' p-6'}>
          <div className="flex items-center gap-2 mb-5">
            <Wallet className="w-5 h-5 text-teal-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              <FormattedMessage id="admin.partners.config.withdrawal" defaultMessage="Retraits" />
            </h2>
          </div>
          <div>
            <label className={UI.label}><FormattedMessage id="admin.partners.config.minWithdrawal" defaultMessage="Montant minimum de retrait (cents)" /></label>
            <input type="number" value={config.minimumWithdrawalAmount} onChange={(e) => handleChange('minimumWithdrawalAmount', Number(e.target.value))} className={`${UI.input} max-w-xs`} min={0} />
            <p className="text-xs text-gray-500 mt-1">${(config.minimumWithdrawalAmount / 100).toFixed(2)}</p>
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center justify-end gap-3">
          {success && (
            <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1.5 animate-in fade-in">
              <Check className="w-4 h-4" /> <FormattedMessage id="common.saved" defaultMessage="Enregistre" />
            </span>
          )}
          <button onClick={handleSave} disabled={saving} className={`${UI.button.primary} px-8 py-3 flex items-center gap-2`}>
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            <FormattedMessage id="admin.partners.config.save" defaultMessage="Enregistrer" />
          </button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminPartnersConfig;
