/**
 * ChatterTab - Commission settings for Chatters
 */
import React, { useState, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functionsAffiliate } from '@/config/firebase';
import {
  DollarSign, Save, Loader2, AlertTriangle, CheckCircle, RefreshCw,
  Users, Star, Trophy,
} from 'lucide-react';
import { UI, formatCents } from './shared';

interface ChatterConfig {
  commissionClientCallAmountLawyer?: number;
  commissionClientCallAmountExpat?: number;
  commissionProviderCallAmountLawyer?: number;
  commissionProviderCallAmountExpat?: number;
  commissionN1CallAmount?: number;
  commissionN2CallAmount?: number;
  commissionActivationBonusAmount?: number;
  commissionN1RecruitBonusAmount?: number;
  minimumWithdrawalAmount?: number;
  validationHoldPeriodHours?: number;
  releaseDelayHours?: number;
  recruitmentLinkDurationMonths?: number;
  attributionWindowDays?: number;
  levelThresholds?: { level2: number; level3: number; level4: number; level5: number };
  telegramBonusAmount?: number;
  piggyBankUnlockThreshold?: number;
  recruitmentMilestones?: Array<{ count: number; bonus: number }>;
  monthlyCompetitionPrizes?: { first: number; second: number; third: number };
  competitionEligibilityMinimum?: number;
  version?: number;
  updatedAt?: string;
}

const DEFAULT_MILESTONES = [
  { count: 5, bonus: 1500 }, { count: 10, bonus: 3500 }, { count: 20, bonus: 7500 },
  { count: 50, bonus: 25000 }, { count: 100, bonus: 60000 }, { count: 500, bonus: 400000 },
];

const ChatterTab: React.FC = () => {
  const [config, setConfig] = useState<ChatterConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable<void, { config: ChatterConfig }>(functionsAffiliate, 'adminGetChatterConfig');
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
      await fn(config);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const update = (field: string, value: any) => setConfig(prev => ({ ...prev, [field]: value }));

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-red-500 animate-spin" /></div>;

  return (
    <div className="space-y-6">
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

      {/* Commission appel client */}
      <div className={`${UI.card} p-6`}>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-500" />
          Commission appel client
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={UI.label}>Avocat (cents)</label>
            <div className="flex items-center gap-2">
              <input type="number" value={config.commissionClientCallAmountLawyer ?? 500}
                onChange={(e) => update('commissionClientCallAmountLawyer', parseInt(e.target.value) || 0)}
                className={UI.input} min={0} step={50} />
              <span className="text-sm text-gray-500 whitespace-nowrap">= {formatCents(config.commissionClientCallAmountLawyer ?? 500)}</span>
            </div>
          </div>
          <div>
            <label className={UI.label}>Expatrié (cents)</label>
            <div className="flex items-center gap-2">
              <input type="number" value={config.commissionClientCallAmountExpat ?? 300}
                onChange={(e) => update('commissionClientCallAmountExpat', parseInt(e.target.value) || 0)}
                className={UI.input} min={0} step={50} />
              <span className="text-sm text-gray-500 whitespace-nowrap">= {formatCents(config.commissionClientCallAmountExpat ?? 300)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Commission prestataire recruté */}
      <div className={`${UI.card} p-6`}>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-blue-500" />
          Commission prestataire recruté
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={UI.label}>Avocat (cents)</label>
            <div className="flex items-center gap-2">
              <input type="number" value={config.commissionProviderCallAmountLawyer ?? 500}
                onChange={(e) => update('commissionProviderCallAmountLawyer', parseInt(e.target.value) || 0)}
                className={UI.input} min={0} step={50} />
              <span className="text-sm text-gray-500 whitespace-nowrap">= {formatCents(config.commissionProviderCallAmountLawyer ?? 500)}</span>
            </div>
          </div>
          <div className="flex items-center text-sm text-gray-400 italic">
            Pas de commission pour les expats aidants
          </div>
        </div>
      </div>

      {/* Commissions MLM (N1/N2) */}
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
            <p className="text-xs text-gray-500 mt-1">= {formatCents(config.commissionN1CallAmount ?? 100)}</p>
          </div>
          <div>
            <label className={UI.label}>N2 appel (cents)</label>
            <input type="number" value={config.commissionN2CallAmount ?? 50}
              onChange={(e) => update('commissionN2CallAmount', parseInt(e.target.value) || 0)}
              className={UI.input} min={0} step={25} />
            <p className="text-xs text-gray-500 mt-1">= {formatCents(config.commissionN2CallAmount ?? 50)}</p>
          </div>
          <div>
            <label className={UI.label}>Bonus activation (cents)</label>
            <input type="number" value={config.commissionActivationBonusAmount ?? 500}
              onChange={(e) => update('commissionActivationBonusAmount', parseInt(e.target.value) || 0)}
              className={UI.input} min={0} step={100} />
            <p className="text-xs text-gray-500 mt-1">= {formatCents(config.commissionActivationBonusAmount ?? 500)}</p>
          </div>
          <div>
            <label className={UI.label}>Bonus recrutement N1 (cents)</label>
            <input type="number" value={config.commissionN1RecruitBonusAmount ?? 100}
              onChange={(e) => update('commissionN1RecruitBonusAmount', parseInt(e.target.value) || 0)}
              className={UI.input} min={0} step={50} />
            <p className="text-xs text-gray-500 mt-1">= {formatCents(config.commissionN1RecruitBonusAmount ?? 100)}</p>
          </div>
        </div>
      </div>

      {/* Telegram Bonus */}
      <div className={`${UI.card} p-6`}>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-blue-500" />
          Bonus Telegram (Tirelire)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={UI.label}>Montant du bonus (cents)</label>
            <input type="number" value={config.telegramBonusAmount ?? 5000}
              onChange={(e) => update('telegramBonusAmount', parseInt(e.target.value) || 0)}
              className={UI.input} min={0} step={500} />
            <p className="text-xs text-gray-500 mt-1">= {formatCents(config.telegramBonusAmount ?? 5000)}</p>
          </div>
          <div>
            <label className={UI.label}>Seuil de déblocage (cents)</label>
            <input type="number" value={config.piggyBankUnlockThreshold ?? 15000}
              onChange={(e) => update('piggyBankUnlockThreshold', parseInt(e.target.value) || 0)}
              className={UI.input} min={0} step={1000} />
            <p className="text-xs text-gray-500 mt-1">= {formatCents(config.piggyBankUnlockThreshold ?? 15000)} min. pour débloquer</p>
          </div>
        </div>
      </div>

      {/* Recruitment Milestones */}
      <div className={`${UI.card} p-6`}>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-500" />
          Bonus de recrutement (paliers)
        </h3>
        <div className="space-y-2">
          {(config.recruitmentMilestones ?? DEFAULT_MILESTONES).map((m, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <label className="text-xs text-gray-500 w-16 shrink-0">Recrues</label>
                <input type="number" value={m.count}
                  onChange={(e) => {
                    const milestones = [...(config.recruitmentMilestones ?? DEFAULT_MILESTONES)];
                    milestones[idx] = { ...milestones[idx], count: parseInt(e.target.value) || 0 };
                    update('recruitmentMilestones', milestones);
                  }}
                  className={UI.input} min={1} />
              </div>
              <div className="flex items-center gap-2 flex-1">
                <label className="text-xs text-gray-500 w-16 shrink-0">Bonus (¢)</label>
                <input type="number" value={m.bonus}
                  onChange={(e) => {
                    const milestones = [...(config.recruitmentMilestones ?? DEFAULT_MILESTONES)];
                    milestones[idx] = { ...milestones[idx], bonus: parseInt(e.target.value) || 0 };
                    update('recruitmentMilestones', milestones);
                  }}
                  className={UI.input} min={0} step={100} />
                <span className="text-xs text-gray-500 whitespace-nowrap">= {formatCents(m.bonus)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Competition */}
      <div className={`${UI.card} p-6`}>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Prix compétition mensuelle Top 3
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {(['first', 'second', 'third'] as const).map((place, idx) => {
            const labels = ['1ère place', '2ème place', '3ème place'];
            const prizes = config.monthlyCompetitionPrizes ?? { first: 20000, second: 10000, third: 5000 };
            return (
              <div key={place}>
                <label className={UI.label}>{labels[idx]}</label>
                <input type="number" value={prizes[place]}
                  onChange={(e) => update('monthlyCompetitionPrizes', { ...prizes, [place]: parseInt(e.target.value) || 0 })}
                  className={UI.input} min={0} step={500} />
                <p className="text-xs text-gray-500 mt-1">= {formatCents(prizes[place])}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-4">
          <label className={UI.label}>Seuil éligibilité (cents)</label>
          <input type="number" value={config.competitionEligibilityMinimum ?? 20000}
            onChange={(e) => update('competitionEligibilityMinimum', parseInt(e.target.value) || 0)}
            className={`${UI.input} max-w-xs`} min={0} step={1000} />
          <p className="text-xs text-gray-500 mt-1">= {formatCents(config.competitionEligibilityMinimum ?? 20000)} min. pour participer</p>
        </div>
      </div>

      {/* Withdrawal & Timing */}
      <div className={`${UI.card} p-6`}>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Retraits et délais</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <label className={UI.label}>Retrait min. (cents)</label>
            <input type="number" value={config.minimumWithdrawalAmount ?? 3000}
              onChange={(e) => update('minimumWithdrawalAmount', parseInt(e.target.value) || 0)}
              className={UI.input} min={0} step={100} />
            <p className="text-xs text-gray-500 mt-1">= {formatCents(config.minimumWithdrawalAmount ?? 3000)}</p>
          </div>
          <div>
            <label className={UI.label}>Validation (heures)</label>
            <input type="number" value={config.validationHoldPeriodHours ?? 48}
              onChange={(e) => update('validationHoldPeriodHours', parseInt(e.target.value) || 0)}
              className={UI.input} min={0} />
          </div>
          <div>
            <label className={UI.label}>Libération (heures)</label>
            <input type="number" value={config.releaseDelayHours ?? 24}
              onChange={(e) => update('releaseDelayHours', parseInt(e.target.value) || 0)}
              className={UI.input} min={0} />
          </div>
          <div>
            <label className={UI.label}>Durée lien (mois)</label>
            <input type="number" value={config.recruitmentLinkDurationMonths ?? 6}
              onChange={(e) => update('recruitmentLinkDurationMonths', parseInt(e.target.value) || 0)}
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

      {/* Level Thresholds */}
      <div className={`${UI.card} p-6`}>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Seuils de niveau (gains totaux en cents)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {([2, 3, 4, 5] as const).map((level) => {
            const key = `level${level}` as 'level2' | 'level3' | 'level4' | 'level5';
            const val = config.levelThresholds?.[key] ?? 0;
            return (
              <div key={level}>
                <label className={UI.label}>Niveau {level}</label>
                <input type="number" value={val}
                  onChange={(e) => update('levelThresholds', { ...config.levelThresholds, [key]: parseInt(e.target.value) || 0 })}
                  className={UI.input} min={0} step={1000} />
                <p className="text-xs text-gray-500 mt-1">= {formatCents(val)}</p>
              </div>
            );
          })}
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

      {config.updatedAt && (
        <p className="text-xs text-gray-400 text-right">
          Dernière MAJ : {new Date(config.updatedAt).toLocaleString('fr-FR')} — v{config.version}
        </p>
      )}
    </div>
  );
};

export default ChatterTab;
