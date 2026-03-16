/**
 * GroupAdminTab - Commission settings for Group Admins
 */
import React, { useState, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functionsAffiliate } from '@/config/firebase';
import {
  DollarSign, Percent, Clock, Save, Loader2, AlertTriangle, CheckCircle, RefreshCw, Users,
} from 'lucide-react';
import { UI, formatCents } from './shared';

interface GroupAdminConfig {
  commissionClientAmountLawyer?: number;
  commissionClientAmountExpat?: number;
  commissionN1CallAmount?: number;
  commissionN2CallAmount?: number;
  commissionActivationBonusAmount?: number;
  commissionN1RecruitBonusAmount?: number;
  activationCallsRequired?: number;
  clientDiscountType?: 'percent' | 'fixed';
  clientDiscountPercent?: number;
  clientDiscountAmount?: number;
  paymentMode?: 'manual' | 'automatic';
  recruitmentWindowMonths?: number;
  minimumWithdrawalAmount?: number;
  validationHoldPeriodDays?: number;
  releaseDelayHours?: number;
  attributionWindowDays?: number;
  leaderboardSize?: number;
  version?: number;
}

const GroupAdminTab: React.FC = () => {
  const [config, setConfig] = useState<GroupAdminConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable(functionsAffiliate, 'adminGetGroupAdminConfig');
      const result = await fn({});
      const data = result.data as { config?: GroupAdminConfig };
      setConfig(data.config ?? result.data as GroupAdminConfig);
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
      const fn = httpsCallable(functionsAffiliate, 'adminUpdateGroupAdminConfig');
      await fn(config);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const update = (field: string, value: number | string) => setConfig(prev => ({ ...prev, [field]: value }));

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>;

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

      {/* Commission client */}
      <div className={`${UI.card} p-6`}>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-500" />
          Commission appel client
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={UI.label}>Avocat (cents)</label>
            <div className="flex items-center gap-2">
              <input type="number" value={config.commissionClientAmountLawyer ?? 500}
                onChange={(e) => update('commissionClientAmountLawyer', parseInt(e.target.value) || 0)}
                className={UI.input} min={0} step={50} />
              <span className="text-sm text-gray-500 whitespace-nowrap">= {formatCents(config.commissionClientAmountLawyer ?? 500)}</span>
            </div>
          </div>
          <div>
            <label className={UI.label}>Expatrié (cents)</label>
            <div className="flex items-center gap-2">
              <input type="number" value={config.commissionClientAmountExpat ?? 300}
                onChange={(e) => update('commissionClientAmountExpat', parseInt(e.target.value) || 0)}
                className={UI.input} min={0} step={50} />
              <span className="text-sm text-gray-500 whitespace-nowrap">= {formatCents(config.commissionClientAmountExpat ?? 300)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* MLM (N1/N2) */}
      <div className={`${UI.card} p-6`}>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-500" />
          Commissions réseau (N1/N2)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className={UI.label}>N1 appel (cents)</label>
            <input type="number" value={config.commissionN1CallAmount ?? 100}
              onChange={(e) => update('commissionN1CallAmount', parseInt(e.target.value) || 0)}
              className={UI.input} min={0} step={50} />
            <p className="text-xs text-gray-500 mt-1">= {formatCents(config.commissionN1CallAmount ?? 100)} / appel recrue</p>
          </div>
          <div>
            <label className={UI.label}>N2 appel (cents)</label>
            <input type="number" value={config.commissionN2CallAmount ?? 50}
              onChange={(e) => update('commissionN2CallAmount', parseInt(e.target.value) || 0)}
              className={UI.input} min={0} step={25} />
            <p className="text-xs text-gray-500 mt-1">= {formatCents(config.commissionN2CallAmount ?? 50)} / appel recrue N2</p>
          </div>
          <div>
            <label className={UI.label}>Bonus activation (cents)</label>
            <input type="number" value={config.commissionActivationBonusAmount ?? 500}
              onChange={(e) => update('commissionActivationBonusAmount', parseInt(e.target.value) || 0)}
              className={UI.input} min={0} step={100} />
            <p className="text-xs text-gray-500 mt-1">= {formatCents(config.commissionActivationBonusAmount ?? 500)}</p>
          </div>
          <div>
            <label className={UI.label}>Bonus N1→N2 (cents)</label>
            <input type="number" value={config.commissionN1RecruitBonusAmount ?? 100}
              onChange={(e) => update('commissionN1RecruitBonusAmount', parseInt(e.target.value) || 0)}
              className={UI.input} min={0} step={50} />
            <p className="text-xs text-gray-500 mt-1">= {formatCents(config.commissionN1RecruitBonusAmount ?? 100)}</p>
          </div>
        </div>
        <div className="mt-4">
          <label className={UI.label}>Appels requis pour activation</label>
          <input type="number" value={config.activationCallsRequired ?? 2}
            onChange={(e) => update('activationCallsRequired', parseInt(e.target.value) || 0)}
            className={`${UI.input} max-w-xs`} min={1} />
        </div>
      </div>

      {/* Client Discount */}
      <div className={`${UI.card} p-6`}>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Percent className="w-5 h-5 text-orange-500" />
          Remise client
        </h3>
        <div className="mb-3">
          <label className={UI.label}>Type de remise</label>
          <div className="flex gap-3 mt-1">
            {([{ value: 'fixed', label: 'Montant fixe ($)' }, { value: 'percent', label: 'Pourcentage (%)' }] as const).map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="discountType" value={opt.value}
                  checked={(config.clientDiscountType ?? 'fixed') === opt.value}
                  onChange={() => update('clientDiscountType', opt.value as any)}
                  className="w-4 h-4 text-orange-500 focus:ring-orange-500" />
                <span className="text-gray-700 dark:text-gray-300 text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="max-w-xs">
          {(config.clientDiscountType ?? 'fixed') === 'fixed' ? (
            <>
              <label className={UI.label}>Montant remise (cents)</label>
              <input type="number" value={config.clientDiscountAmount ?? 500}
                onChange={(e) => update('clientDiscountAmount', parseInt(e.target.value) || 0)}
                className={UI.input} min={0} step={100} />
              <p className="text-xs text-gray-500 mt-1">= {formatCents(config.clientDiscountAmount ?? 500)}</p>
            </>
          ) : (
            <>
              <label className={UI.label}>Pourcentage de remise</label>
              <div className="relative">
                <input type="number" min={0} max={100} step={1}
                  value={config.clientDiscountPercent ?? 5}
                  onChange={(e) => update('clientDiscountPercent', parseInt(e.target.value) || 0)}
                  className={`${UI.input} pr-8`} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Payment & Timing */}
      <div className={`${UI.card} p-6`}>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-500" />
          Paiement et délais
        </h3>
        <div className="mb-4">
          <label className={UI.label}>Mode de paiement</label>
          <div className="flex gap-4 mt-1">
            {(['manual', 'automatic'] as const).map((mode) => (
              <label key={mode} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="paymentMode" value={mode}
                  checked={config.paymentMode === mode}
                  onChange={() => update('paymentMode', mode)}
                  className="w-4 h-4 text-blue-500 focus:ring-blue-500" />
                <span className="text-gray-700 dark:text-gray-300 text-sm capitalize">{mode === 'manual' ? 'Manuel' : 'Automatique'}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className={UI.label}>Retrait min. (cents)</label>
            <input type="number" value={config.minimumWithdrawalAmount ?? 3000}
              onChange={(e) => update('minimumWithdrawalAmount', parseInt(e.target.value) || 0)}
              className={UI.input} min={0} step={100} />
            <p className="text-xs text-gray-500 mt-1">= {formatCents(config.minimumWithdrawalAmount ?? 3000)}</p>
          </div>
          <div>
            <label className={UI.label}>Validation (jours)</label>
            <input type="number" value={config.validationHoldPeriodDays ?? 7}
              onChange={(e) => update('validationHoldPeriodDays', parseInt(e.target.value) || 0)}
              className={UI.input} min={0} />
          </div>
          <div>
            <label className={UI.label}>Libération (heures)</label>
            <input type="number" value={config.releaseDelayHours ?? 24}
              onChange={(e) => update('releaseDelayHours', parseInt(e.target.value) || 0)}
              className={UI.input} min={0} />
          </div>
          <div>
            <label className={UI.label}>Recrutement (mois)</label>
            <input type="number" value={config.recruitmentWindowMonths ?? 6}
              onChange={(e) => update('recruitmentWindowMonths', parseInt(e.target.value) || 0)}
              className={UI.input} min={1} />
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

export default GroupAdminTab;
