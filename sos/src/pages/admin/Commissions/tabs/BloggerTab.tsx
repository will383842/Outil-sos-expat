/**
 * BloggerTab - Commission settings for Bloggers
 */
import React, { useState, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functionsAffiliate } from '@/config/firebase';
import {
  DollarSign, Clock, Save, Loader2, AlertTriangle, CheckCircle, RefreshCw, Info,
} from 'lucide-react';
import { UI, formatCents } from './shared';

interface BloggerConfig {
  commissionClientAmountLawyer?: number;
  commissionClientAmountExpat?: number;
  commissionRecruitmentAmountLawyer?: number;
  commissionRecruitmentAmountExpat?: number;
  minimumWithdrawalAmount?: number;
  commissionValidationDays?: number;
  commissionReleaseHours?: number;
  recruitmentCommissionWindowMonths?: number;
  updatedAt?: string;
  updatedBy?: string;
}

const BloggerTab: React.FC = () => {
  const [config, setConfig] = useState<BloggerConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable<void, { config: BloggerConfig }>(functionsAffiliate, 'adminGetBloggerConfig');
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
      const fn = httpsCallable(functionsAffiliate, 'adminUpdateBloggerConfig');
      await fn({
        updates: {
          commissionClientAmountLawyer: config.commissionClientAmountLawyer,
          commissionClientAmountExpat: config.commissionClientAmountExpat,
          commissionRecruitmentAmountLawyer: config.commissionRecruitmentAmountLawyer,
          commissionRecruitmentAmountExpat: config.commissionRecruitmentAmountExpat,
          minimumWithdrawalAmount: config.minimumWithdrawalAmount,
          commissionValidationDays: config.commissionValidationDays,
          commissionReleaseHours: config.commissionReleaseHours,
          recruitmentCommissionWindowMonths: config.recruitmentCommissionWindowMonths,
        },
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const update = (field: string, value: number) => setConfig(prev => ({ ...prev, [field]: value }));

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-purple-500 animate-spin" /></div>;

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
      <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex items-center gap-2 text-purple-700 dark:text-purple-300 text-sm">
        <Info className="w-4 h-4 flex-shrink-0" />
        Remise client blogueur : 0% (pas de remise)
      </div>

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

      {/* Commission recrutement */}
      <div className={`${UI.card} p-6`}>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-blue-500" />
          Commission recrutement prestataire
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={UI.label}>Avocat (cents)</label>
            <div className="flex items-center gap-2">
              <input type="number" value={config.commissionRecruitmentAmountLawyer ?? 500}
                onChange={(e) => update('commissionRecruitmentAmountLawyer', parseInt(e.target.value) || 0)}
                className={UI.input} min={0} step={50} />
              <span className="text-sm text-gray-500 whitespace-nowrap">= {formatCents(config.commissionRecruitmentAmountLawyer ?? 500)}</span>
            </div>
          </div>
          <div>
            <label className={UI.label}>Expatrié (cents)</label>
            <div className="flex items-center gap-2">
              <input type="number" value={config.commissionRecruitmentAmountExpat ?? 300}
                onChange={(e) => update('commissionRecruitmentAmountExpat', parseInt(e.target.value) || 0)}
                className={UI.input} min={0} step={50} />
              <span className="text-sm text-gray-500 whitespace-nowrap">= {formatCents(config.commissionRecruitmentAmountExpat ?? 300)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Retraits et délais */}
      <div className={`${UI.card} p-6`}>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-500" />
          Retraits et délais
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className={UI.label}>Retrait min. (cents)</label>
            <input type="number" value={config.minimumWithdrawalAmount ?? 3000}
              onChange={(e) => update('minimumWithdrawalAmount', parseInt(e.target.value) || 0)}
              className={UI.input} min={0} step={100} />
            <p className="text-xs text-gray-500 mt-1">= {formatCents(config.minimumWithdrawalAmount ?? 3000)}</p>
          </div>
          <div>
            <label className={UI.label}>Validation (jours)</label>
            <input type="number" value={config.commissionValidationDays ?? 7}
              onChange={(e) => update('commissionValidationDays', parseInt(e.target.value) || 0)}
              className={UI.input} min={1} max={30} />
          </div>
          <div>
            <label className={UI.label}>Libération (heures)</label>
            <input type="number" value={config.commissionReleaseHours ?? 24}
              onChange={(e) => update('commissionReleaseHours', parseInt(e.target.value) || 0)}
              className={UI.input} min={1} max={168} />
          </div>
          <div>
            <label className={UI.label}>Fenêtre recrutement (mois)</label>
            <input type="number" value={config.recruitmentCommissionWindowMonths ?? 6}
              onChange={(e) => update('recruitmentCommissionWindowMonths', parseInt(e.target.value) || 0)}
              className={UI.input} min={1} max={24} />
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

      {config.updatedAt && (
        <p className="text-xs text-gray-400 text-right">
          Dernière MAJ : {new Date(config.updatedAt).toLocaleString('fr-FR')}
          {config.updatedBy && ` par ${config.updatedBy}`}
        </p>
      )}
    </div>
  );
};

export default BloggerTab;
