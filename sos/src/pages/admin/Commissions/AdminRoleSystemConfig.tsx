/**
 * AdminRoleSystemConfig - Shared component for role-specific SYSTEM settings
 * Used by all 5 role config pages (Chatter, Influencer, Blogger, GroupAdmin, Partner)
 * Commission settings are NOT here — they're in the CommissionsHub (/admin/commissions)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import { db, functionsAffiliate } from '@/config/firebase';
import {
  Settings, Save, Loader2, AlertTriangle, RefreshCw, CheckCircle,
  Shield, Globe, Eye, EyeOff, DollarSign, ExternalLink,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';

// ============================================================================
// SHARED DESIGN TOKENS — identical across all role pages
// ============================================================================

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
  },
  input: "w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white",
} as const;

// ============================================================================
// ROLE DEFINITIONS
// ============================================================================

export interface RoleDefinition {
  id: string;
  title: string;
  subtitle: string;
  firestoreCollection: string;  // e.g. 'chatter_config'
  updateCallable: string;       // e.g. 'adminUpdateChatterConfig'
  commissionHubTab: string;     // e.g. 'chatter'
  visibilityField?: string;     // e.g. 'isChatterListingPageVisible'
  visibilityLabel?: string;     // e.g. 'Page /nos-chatters'
  visibilityUrl?: string;       // e.g. '/nos-chatters'
  systemToggles: Array<{ field: string; label: string }>;
  extraFields?: React.ReactNode; // quiz settings, payment mode, etc.
}

// ============================================================================
// COMPONENT
// ============================================================================

interface Props {
  role: RoleDefinition;
}

const AdminRoleSystemConfig: React.FC<Props> = ({ role }) => {
  const [config, setConfig] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  const [visibilitySuccess, setVisibilitySuccess] = useState(false);

  // Read from Firestore directly to avoid 403/CORS issues with callables
  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const docRef = doc(db, role.firestoreCollection, 'current');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setConfig(snap.data());
      } else {
        setConfig({});
      }
    } catch (err: any) {
      console.warn(`Could not load ${role.firestoreCollection}:`, err.message);
      setConfig({});
    } finally {
      setLoading(false);
    }
  }, [role.firestoreCollection]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleChange = (field: string, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    setSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const fn = httpsCallable(functionsAffiliate, role.updateCallable);
      // Build payload with only system fields
      const payload: Record<string, any> = {};
      role.systemToggles.forEach(t => {
        if (config[t.field] !== undefined) payload[t.field] = config[t.field];
      });
      await fn(payload);
      setSuccess(true);
      setHasChanges(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleVisibility = async () => {
    if (!role.visibilityField) return;
    const newValue = !config[role.visibilityField];
    setTogglingVisibility(true);
    setVisibilitySuccess(false);
    try {
      const fn = httpsCallable(functionsAffiliate, role.updateCallable);
      await fn({ [role.visibilityField]: newValue });
      setConfig(prev => ({ ...prev, [role.visibilityField!]: newValue }));
      setVisibilitySuccess(true);
      setTimeout(() => setVisibilitySuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Erreur');
    } finally {
      setTogglingVisibility(false);
    }
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

  const isVisible = role.visibilityField ? config[role.visibilityField] : undefined;

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Settings className="w-7 h-7 text-red-500" />
              {role.title}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{role.subtitle}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchConfig}
              className={`${UI.button.secondary} px-3 py-2 flex items-center gap-2 text-sm`}>
              <RefreshCw className="w-4 h-4" /> Actualiser
            </button>
            <button onClick={handleSave} disabled={!hasChanges || saving}
              className={`${UI.button.primary} px-4 py-2 flex items-center gap-2 text-sm disabled:opacity-50`}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Sauvegarder
            </button>
          </div>
        </div>

        {/* Feedback */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
            <CheckCircle className="w-4 h-4 flex-shrink-0" /> Configuration enregistrée
          </div>
        )}

        {/* Link to Commission Hub */}
        <a href={`/admin/commissions?tab=${role.commissionHubTab}`}
          className={`${UI.card} p-4 flex items-center justify-between hover:border-red-300 dark:hover:border-red-500/30 transition-colors group`}>
          <div className="flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Commissions d'affiliation</p>
              <p className="text-xs text-gray-500">Taux, bonus, retraits, plans — gérés dans le hub centralisé</p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors" />
        </a>

        {/* Page Visibility Toggle */}
        {role.visibilityField && (
          <div className={`${UI.card} p-5 border-2 ${isVisible ? 'border-green-400/40 dark:border-green-500/30' : 'border-gray-200/40 dark:border-gray-600/30'}`}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isVisible ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800/50'}`}>
                  {isVisible ? <Eye className="w-5 h-5 text-green-600 dark:text-green-400" /> : <EyeOff className="w-5 h-5 text-gray-500" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Page répertoire public</p>
                  <p className="text-xs text-gray-500">
                    Visibilité de{' '}
                    <a href={role.visibilityUrl} target="_blank" rel="noopener noreferrer" className="text-red-500 hover:underline">
                      {role.visibilityLabel}
                    </a>
                  </p>
                  {visibilitySuccess && (
                    <p className="text-xs text-green-500 mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Mis à jour</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {togglingVisibility ? (
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                ) : (
                  <button onClick={handleToggleVisibility}
                    className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none ${isVisible ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${isVisible ? 'translate-x-8' : 'translate-x-1'}`} />
                  </button>
                )}
                <span className={`text-xs font-medium ${isVisible ? 'text-green-600' : 'text-gray-400'}`}>
                  {isVisible ? 'Visible' : 'Masqué'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* System Toggles */}
        <div className={`${UI.card} p-6`}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-500" /> Paramètres système
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {role.systemToggles.map(({ field, label }) => (
              <label key={field}
                className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                <input
                  type="checkbox"
                  checked={config[field] ?? true}
                  onChange={(e) => handleChange(field, e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-red-500 focus:ring-red-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Extra Fields (role-specific) */}
        {role.extraFields && (
          <div className={`${UI.card} p-6`}>
            {React.cloneElement(role.extraFields as React.ReactElement, {
              config,
              onChange: handleChange,
              ui: UI,
            })}
          </div>
        )}

        {/* Version Info */}
        {(config.version || config.updatedAt) && (
          <p className="text-xs text-gray-400 text-center">
            {config.version && `Version ${config.version}`}
            {config.version && config.updatedAt && ' — '}
            {config.updatedAt && `Dernière MAJ : ${new Date(config.updatedAt._seconds ? config.updatedAt._seconds * 1000 : config.updatedAt).toLocaleDateString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}`}
          </p>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminRoleSystemConfig;
