/**
 * PartnerTab - Commission settings for Partners (global defaults)
 * Individual partner overrides are managed per-partner in AdminPartnerDetail
 */
import React, { useState, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import { db, functionsAffiliate } from '@/config/firebase';
import {
  DollarSign, Clock, Save, Loader2, AlertTriangle, CheckCircle, RefreshCw, Info,
} from 'lucide-react';
import { UI, formatCents } from './shared';

interface PartnerConfig {
  isSystemActive?: boolean;
  withdrawalsEnabled?: boolean;
  defaultCommissionPerCallLawyer?: number;
  defaultCommissionPerCallExpat?: number;
  defaultHoldPeriodDays?: number;
  defaultReleaseDelayHours?: number;
  defaultMinimumCallDuration?: number;
  attributionWindowDays?: number;
  minimumWithdrawalAmount?: number;
  updatedAt?: string;
}

const PartnerTab: React.FC = () => {
  const [config, setConfig] = useState<PartnerConfig>({});
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
        setConfig(snap.data() as PartnerConfig);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const fn = httpsCallable(functionsAffiliate, 'adminUpdatePartnerConfig');
      await fn(config);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const update = (field: string, value: number) => setConfig(prev => ({ ...prev, [field]: value }));

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-green-500 animate-spin" /></div>;

  return (
    <div className="space-y-6">
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

      {/* Info */}
      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-start gap-2 text-green-700 dark:text-green-300 text-sm">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Valeurs par défaut globales</p>
          <p className="text-xs mt-1">Chaque partenaire peut avoir ses propres taux configurés individuellement dans sa fiche partenaire. Ces valeurs s'appliquent aux nouveaux partenaires.</p>
        </div>
      </div>

      {/* Default Commissions */}
      <div className={`${UI.card} p-6`}>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-500" />
          Commission par défaut par appel
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={UI.label}>Avocat (cents)</label>
            <div className="flex items-center gap-2">
              <input type="number" value={config.defaultCommissionPerCallLawyer ?? 500}
                onChange={(e) => update('defaultCommissionPerCallLawyer', parseInt(e.target.value) || 0)}
                className={UI.input} min={0} step={50} />
              <span className="text-sm text-gray-500 whitespace-nowrap">= {formatCents(config.defaultCommissionPerCallLawyer ?? 500)}</span>
            </div>
          </div>
          <div>
            <label className={UI.label}>Expatrié (cents)</label>
            <div className="flex items-center gap-2">
              <input type="number" value={config.defaultCommissionPerCallExpat ?? 300}
                onChange={(e) => update('defaultCommissionPerCallExpat', parseInt(e.target.value) || 0)}
                className={UI.input} min={0} step={50} />
              <span className="text-sm text-gray-500 whitespace-nowrap">= {formatCents(config.defaultCommissionPerCallExpat ?? 300)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Timing & Thresholds */}
      <div className={`${UI.card} p-6`}>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-500" />
          Délais et seuils par défaut
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className={UI.label}>Retrait min. (cents)</label>
            <input type="number" value={config.minimumWithdrawalAmount ?? 3000}
              onChange={(e) => update('minimumWithdrawalAmount', parseInt(e.target.value) || 0)}
              className={UI.input} min={0} step={100} />
            <p className="text-xs text-gray-500 mt-1">= {formatCents(config.minimumWithdrawalAmount ?? 3000)}</p>
          </div>
          <div>
            <label className={UI.label}>Hold (jours)</label>
            <input type="number" value={config.defaultHoldPeriodDays ?? 7}
              onChange={(e) => update('defaultHoldPeriodDays', parseInt(e.target.value) || 0)}
              className={UI.input} min={0} />
          </div>
          <div>
            <label className={UI.label}>Libération (heures)</label>
            <input type="number" value={config.defaultReleaseDelayHours ?? 24}
              onChange={(e) => update('defaultReleaseDelayHours', parseInt(e.target.value) || 0)}
              className={UI.input} min={0} />
          </div>
          <div>
            <label className={UI.label}>Durée min. appel (sec)</label>
            <input type="number" value={config.defaultMinimumCallDuration ?? 60}
              onChange={(e) => update('defaultMinimumCallDuration', parseInt(e.target.value) || 0)}
              className={UI.input} min={0} />
          </div>
          <div>
            <label className={UI.label}>Attribution (jours)</label>
            <input type="number" value={config.attributionWindowDays ?? 30}
              onChange={(e) => update('attributionWindowDays', parseInt(e.target.value) || 0)}
              className={UI.input} min={1} />
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center justify-between">
        <button onClick={fetchConfig} className={`${UI.button.secondary} px-4 py-2 flex items-center gap-2 text-sm`}>
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
        <button onClick={handleSave} disabled={saving} className={`${UI.button.primary} px-6 py-2.5 flex items-center gap-2`}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Enregistrer
        </button>
      </div>
    </div>
  );
};

export default PartnerTab;
