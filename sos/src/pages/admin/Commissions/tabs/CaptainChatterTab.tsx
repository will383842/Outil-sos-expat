/**
 * CaptainChatterTab - Captain-specific commission settings
 */
import React, { useState, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functionsAffiliate } from '@/config/firebase';
import {
  Crown, Save, Loader2, AlertTriangle, CheckCircle, RefreshCw, Award,
} from 'lucide-react';
import { UI, formatCents } from './shared';

interface CaptainConfig {
  commissionCaptainCallAmountLawyer?: number;
  commissionCaptainCallAmountExpat?: number;
  captainQualityBonusAmount?: number;
  captainTiers?: Array<{ name: string; minCalls: number; bonus: number }>;
  updatedAt?: string;
  version?: number;
}

const DEFAULT_TIERS = [
  { name: 'Bronze', minCalls: 20, bonus: 2500 },
  { name: 'Silver', minCalls: 50, bonus: 5000 },
  { name: 'Gold', minCalls: 100, bonus: 10000 },
  { name: 'Platinum', minCalls: 200, bonus: 20000 },
  { name: 'Diamond', minCalls: 400, bonus: 40000 },
];

const CaptainChatterTab: React.FC = () => {
  const [config, setConfig] = useState<CaptainConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable<void, { config: CaptainConfig }>(functionsAffiliate, 'adminGetChatterConfig');
      const result = await fn();
      setConfig(result.data.config);
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
      const fn = httpsCallable(functionsAffiliate, 'adminUpdateChatterConfig');
      await fn({
        commissionCaptainCallAmountLawyer: config.commissionCaptainCallAmountLawyer,
        commissionCaptainCallAmountExpat: config.commissionCaptainCallAmountExpat,
        captainQualityBonusAmount: config.captainQualityBonusAmount,
        captainTiers: config.captainTiers,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const update = (field: string, value: any) => setConfig(prev => ({ ...prev, [field]: value }));

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-yellow-500 animate-spin" /></div>;

  const tiers = config.captainTiers ?? DEFAULT_TIERS;

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

      {/* Captain Call Commissions */}
      <div className={`${UI.card} p-6`}>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Crown className="w-5 h-5 text-yellow-500" />
          Commissions Captain par appel
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Le captain reçoit ces commissions A LA PLACE des commissions N1/N2 standard.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={UI.label}>Appel avocat (cents)</label>
            <div className="flex items-center gap-2">
              <input type="number" value={config.commissionCaptainCallAmountLawyer ?? 300}
                onChange={(e) => update('commissionCaptainCallAmountLawyer', parseInt(e.target.value) || 0)}
                className={UI.input} min={0} step={50} />
              <span className="text-sm text-gray-500 whitespace-nowrap">= {formatCents(config.commissionCaptainCallAmountLawyer ?? 300)}</span>
            </div>
          </div>
          <div>
            <label className={UI.label}>Appel expatrié (cents)</label>
            <div className="flex items-center gap-2">
              <input type="number" value={config.commissionCaptainCallAmountExpat ?? 200}
                onChange={(e) => update('commissionCaptainCallAmountExpat', parseInt(e.target.value) || 0)}
                className={UI.input} min={0} step={50} />
              <span className="text-sm text-gray-500 whitespace-nowrap">= {formatCents(config.commissionCaptainCallAmountExpat ?? 200)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quality Bonus */}
      <div className={`${UI.card} p-6`}>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-green-500" />
          Bonus qualité Captain
        </h3>
        <div className="max-w-xs">
          <label className={UI.label}>Montant (cents)</label>
          <div className="flex items-center gap-2">
            <input type="number" value={config.captainQualityBonusAmount ?? 10000}
              onChange={(e) => update('captainQualityBonusAmount', parseInt(e.target.value) || 0)}
              className={UI.input} min={0} step={500} />
            <span className="text-sm text-gray-500 whitespace-nowrap">= {formatCents(config.captainQualityBonusAmount ?? 10000)}</span>
          </div>
        </div>
      </div>

      {/* Captain Tiers */}
      <div className={`${UI.card} p-6`}>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Crown className="w-5 h-5 text-purple-500" />
          Paliers Captain (bonus mensuels)
        </h3>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
            <span>Nom du palier</span>
            <span>Appels min.</span>
            <span>Bonus (cents)</span>
          </div>
          {tiers.map((tier, idx) => (
            <div key={idx} className="grid grid-cols-3 gap-4 items-center">
              <input type="text" value={tier.name}
                onChange={(e) => {
                  const updated = [...tiers];
                  updated[idx] = { ...updated[idx], name: e.target.value };
                  update('captainTiers', updated);
                }}
                className={UI.input} />
              <input type="number" value={tier.minCalls}
                onChange={(e) => {
                  const updated = [...tiers];
                  updated[idx] = { ...updated[idx], minCalls: parseInt(e.target.value) || 0 };
                  update('captainTiers', updated);
                }}
                className={UI.input} min={1} />
              <div className="flex items-center gap-2">
                <input type="number" value={tier.bonus}
                  onChange={(e) => {
                    const updated = [...tiers];
                    updated[idx] = { ...updated[idx], bonus: parseInt(e.target.value) || 0 };
                    update('captainTiers', updated);
                  }}
                  className={UI.input} min={0} step={500} />
                <span className="text-xs text-gray-500 whitespace-nowrap">= {formatCents(tier.bonus)}</span>
              </div>
            </div>
          ))}
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

export default CaptainChatterTab;
