/**
 * AdminGroupAdminsConfig - System settings for GroupAdmin program
 * Commission settings are managed in the centralized hub: /admin/commissions
 */

import React, { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { httpsCallable } from 'firebase/functions';
import { functionsAffiliate } from '@/config/firebase';
import {
  Settings, Save, Loader2, AlertTriangle, Globe, EyeOff, ExternalLink,
  CheckCircle, RefreshCw, Users, DollarSign, Shield,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
  },
  input: "w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500",
  label: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1",
} as const;

interface GroupAdminConfig {
  isSystemActive: boolean;
  isGroupAdminListingPageVisible: boolean;
  newRegistrationsEnabled: boolean;
  withdrawalsEnabled: boolean;
  paymentMode: "manual" | "automatic";
  leaderboardSize: number;
  version: number;
}

const PAGE_URL = 'https://sos-expat.com/groupes-communaute';

const AdminGroupAdminsConfig: React.FC = () => {
  const intl = useIntl();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  const [visibilitySuccess, setVisibilitySuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [config, setConfig] = useState<GroupAdminConfig | null>(null);

  const fetchConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable(functionsAffiliate, 'adminGetGroupAdminConfig');
      const result = await fn({});
      const data = result.data as { config: GroupAdminConfig };
      setConfig(data.config ?? result.data as GroupAdminConfig);
    } catch (err) {
      setError('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchConfig(); }, []);

  const handleToggleListingPage = async () => {
    if (!config) return;
    const newValue = !config.isGroupAdminListingPageVisible;
    setTogglingVisibility(true);
    setError(null);
    try {
      const fn = httpsCallable(functionsAffiliate, 'adminUpdateGroupAdminConfig');
      await fn({ isGroupAdminListingPageVisible: newValue });
      setConfig({ ...config, isGroupAdminListingPageVisible: newValue });
      setVisibilitySuccess(true);
      setTimeout(() => setVisibilitySuccess(false), 3000);
    } catch (err) {
      setError('Erreur lors de la mise à jour');
    } finally {
      setTogglingVisibility(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const fn = httpsCallable(functionsAffiliate, 'adminUpdateGroupAdminConfig');
      await fn({
        isSystemActive: config.isSystemActive,
        newRegistrationsEnabled: config.newRegistrationsEnabled,
        withdrawalsEnabled: config.withdrawalsEnabled,
        paymentMode: config.paymentMode,
        leaderboardSize: config.leaderboardSize,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof GroupAdminConfig, value: number | boolean | string) => {
    if (!config) return;
    setConfig({ ...config, [field]: value });
  };

  if (loading) {
    return <AdminLayout><div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div></AdminLayout>;
  }

  if (!config) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-screen text-red-500">
          <AlertTriangle className="w-12 h-12 mb-4" />
          <p>{error || 'Erreur de chargement'}</p>
          <button onClick={fetchConfig} className={`${UI.button.secondary} px-4 py-2 mt-4`}>Réessayer</button>
        </div>
      </AdminLayout>
    );
  }

  const isVisible = config.isGroupAdminListingPageVisible;

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-500" />
              Configuration Admin Groupe
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Paramètres système du programme Admin Groupe</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchConfig} className={`${UI.button.secondary} p-2`}><RefreshCw className="w-4 h-4" /></button>
            <button onClick={handleSave} disabled={saving} className={`${UI.button.primary} px-4 py-2 flex items-center gap-2`}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Sauvegarder
            </button>
          </div>
        </div>

        {/* Feedback */}
        {error && <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-red-700"><AlertTriangle className="w-5 h-5" />{error}</div>}
        {success && <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-2 text-green-700"><CheckCircle className="w-5 h-5" />Configuration sauvegardée</div>}

        {/* Link to Commission Hub */}
        <a href="/admin/commissions?tab=groupadmin"
          className={`${UI.card} p-4 flex items-center justify-between hover:border-blue-300 dark:hover:border-blue-500/30 transition-colors group`}>
          <div className="flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Commissions d'affiliation</p>
              <p className="text-xs text-gray-500">Taux, N1/N2, bonus, remise, retraits — gérés dans le hub centralisé</p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
        </a>

        {/* Public Listing Page */}
        <div className={`${UI.card} p-6 border-2 ${isVisible ? 'border-green-400/40' : 'border-gray-300/40'}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${isVisible ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800/50'}`}>
                {isVisible ? <Globe className="w-6 h-6 text-green-600" /> : <EyeOff className="w-6 h-6 text-gray-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Répertoire public</h2>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${isVisible ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {isVisible ? 'Visible' : 'Masqué'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">Contrôle la page <span className="font-mono text-xs">/groupes-communaute</span></p>
                {visibilitySuccess && <div className="flex items-center gap-1.5 mt-2 text-sm text-green-600"><CheckCircle className="w-4 h-4" />Mis à jour</div>}
              </div>
            </div>
            <div className="flex-shrink-0 flex items-center gap-3">
              {togglingVisibility && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
              <button onClick={handleToggleListingPage} disabled={togglingVisibility}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${isVisible ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform ${isVisible ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className={UI.card + " p-6"}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" /> Statut du système
          </h2>
          <div className="space-y-4">
            {[
              { field: 'isSystemActive' as const, label: 'Système actif' },
              { field: 'newRegistrationsEnabled' as const, label: 'Inscriptions ouvertes' },
              { field: 'withdrawalsEnabled' as const, label: 'Retraits activés' },
            ].map(({ field, label }) => (
              <label key={field} className="flex items-center gap-3">
                <input type="checkbox" checked={config[field] as boolean}
                  onChange={(e) => updateField(field, e.target.checked)}
                  className="w-5 h-5 rounded text-blue-500 focus:ring-blue-500" />
                <span className="text-gray-700 dark:text-gray-300">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Payment Mode & Other */}
        <div className={UI.card + " p-6"}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" /> Autres paramètres
          </h2>
          <div className="space-y-4">
            <div>
              <label className={UI.label}>Mode de paiement</label>
              <div className="flex items-center gap-4 mt-2">
                {(['manual', 'automatic'] as const).map((mode) => (
                  <label key={mode} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="paymentMode" value={mode}
                      checked={config.paymentMode === mode}
                      onChange={() => updateField('paymentMode', mode)}
                      className="w-4 h-4 text-blue-500 focus:ring-blue-500" />
                    <span className="text-gray-700 dark:text-gray-300 text-sm">{mode === 'manual' ? 'Manuel' : 'Automatique'}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className={UI.label}>Taille du classement</label>
              <input type="number" value={config.leaderboardSize}
                onChange={(e) => updateField('leaderboardSize', parseInt(e.target.value) || 0)}
                className={`${UI.input} max-w-xs`} />
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-500 text-center">Version {config.version}</p>
      </div>
    </AdminLayout>
  );
};

export default AdminGroupAdminsConfig;
