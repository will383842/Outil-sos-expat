/**
 * AdminPartnersConfig - System settings for Partner program
 * Commission settings are managed in the centralized hub: /admin/commissions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import { db, functionsAffiliate } from '@/config/firebase';
import toast from 'react-hot-toast';
import {
  Settings, Save, Loader2, AlertTriangle, RefreshCw,
  Eye, Shield, Check, ToggleLeft, ToggleRight, DollarSign, ExternalLink,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-medium rounded-xl px-4 py-2 transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl px-4 py-2 transition-all",
  },
} as const;

interface PartnerConfig {
  isPartnerListingPageVisible: boolean;
  isPartnerFooterLinkVisible: boolean;
  isSystemActive: boolean;
  withdrawalsEnabled: boolean;
}

const DEFAULT_CONFIG: PartnerConfig = {
  isPartnerListingPageVisible: false,
  isPartnerFooterLinkVisible: false,
  isSystemActive: true,
  withdrawalsEnabled: true,
};

const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}> = ({ checked, onChange, label, description }) => (
  <div className="flex items-start gap-4 py-3 border-b border-gray-100 dark:border-white/5 last:border-0">
    <button onClick={() => onChange(!checked)} className="mt-0.5 flex-shrink-0" role="switch" aria-checked={checked}>
      {checked ? <ToggleRight className="w-10 h-6 text-teal-500" /> : <ToggleLeft className="w-10 h-6 text-gray-400" />}
    </button>
    <div className="min-w-0">
      <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
      {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
    </div>
  </div>
);

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
        const data = snap.data();
        setConfig({
          isPartnerListingPageVisible: data.isPartnerListingPageVisible ?? false,
          isPartnerFooterLinkVisible: data.isPartnerFooterLinkVisible ?? false,
          isSystemActive: data.isSystemActive ?? true,
          withdrawalsEnabled: data.withdrawalsEnabled ?? true,
        });
      }
    } catch (err: any) {
      console.warn('Could not load partner config:', err.message);
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
      toast.success('Configuration enregistrée');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      toast.error(err?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: keyof PartnerConfig, value: boolean) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return <AdminLayout><div className="p-6 flex items-center justify-center min-h-[50vh]"><Loader2 className="w-8 h-8 text-teal-500 animate-spin" /></div></AdminLayout>;
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={fetchConfig} className={`${UI.button.secondary} inline-flex items-center gap-2`}>
            <RefreshCw className="w-4 h-4" /> Réessayer
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
            Configuration Partenaires
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-[52px]">
            Paramètres système du programme partenaire
          </p>
        </div>

        {/* Link to Commission Hub */}
        <a href="/admin/commissions?tab=partenaire"
          className={`${UI.card} p-4 flex items-center justify-between hover:border-teal-300 dark:hover:border-teal-500/30 transition-colors group`}>
          <div className="flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Commissions d'affiliation</p>
              <p className="text-xs text-gray-500">Taux par défaut, délais, retraits — gérés dans le hub centralisé</p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-teal-500 transition-colors" />
        </a>

        {/* System Toggles */}
        <div className={UI.card + ' p-6'}>
          <div className="flex items-center gap-2 mb-5">
            <Shield className="w-5 h-5 text-teal-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Système</h2>
          </div>
          <ToggleSwitch checked={config.isSystemActive} onChange={(v) => handleChange('isSystemActive', v)}
            label="Système partenaire actif" description="Active ou désactive complètement le système partenaire" />
          <ToggleSwitch checked={config.withdrawalsEnabled} onChange={(v) => handleChange('withdrawalsEnabled', v)}
            label="Retraits activés" description="Permettre aux partenaires de demander des retraits" />
        </div>

        {/* Visibility Toggles */}
        <div className={UI.card + ' p-6'}>
          <div className="flex items-center gap-2 mb-5">
            <Eye className="w-5 h-5 text-teal-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Visibilité</h2>
          </div>
          <ToggleSwitch checked={config.isPartnerListingPageVisible} onChange={(v) => handleChange('isPartnerListingPageVisible', v)}
            label="Page listing partenaires visible" description="Afficher la page publique listant les partenaires" />
          <ToggleSwitch checked={config.isPartnerFooterLinkVisible} onChange={(v) => handleChange('isPartnerFooterLinkVisible', v)}
            label="Lien footer visible" description="Afficher le lien 'Devenir partenaire' dans le footer" />
        </div>

        {/* Save */}
        <div className="flex items-center justify-end gap-3">
          {success && (
            <span className="text-sm text-green-600 flex items-center gap-1.5"><Check className="w-4 h-4" /> Enregistré</span>
          )}
          <button onClick={handleSave} disabled={saving} className={`${UI.button.primary} px-8 py-3 flex items-center gap-2`}>
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Enregistrer
          </button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminPartnersConfig;
