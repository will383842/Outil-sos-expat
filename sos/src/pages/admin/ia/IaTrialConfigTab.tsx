/**
 * IaTrialConfigTab - Configuration de la période d'essai et remise annuelle
 */

import React, { useState, useEffect } from 'react';
import { useAdminTranslations, useIaAdminTranslations } from '../../../utils/adminTranslations';
import {
  Clock,
  TrendingUp,
  Save,
  RefreshCw,
  Check,
  AlertTriangle
} from 'lucide-react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../../config/firebase';
import {
  TrialConfig,
  DEFAULT_TRIAL_CONFIG,
  DEFAULT_ANNUAL_DISCOUNT_PERCENT
} from '../../../types/subscription';
import { cn } from '../../../utils/cn';

export const IaTrialConfigTab: React.FC = () => {
  const adminT = useAdminTranslations();
  const iaT = useIaAdminTranslations();

  // Trial config state
  const [trialConfig, setTrialConfig] = useState<TrialConfig>(DEFAULT_TRIAL_CONFIG);
  const [editedTrialDays, setEditedTrialDays] = useState(30);
  const [editedTrialCalls, setEditedTrialCalls] = useState(3);
  const [trialEnabled, setTrialEnabled] = useState(true);
  const [trialHasChanges, setTrialHasChanges] = useState(false);

  // Annual discount state
  const [annualDiscountPercent, setAnnualDiscountPercent] = useState(DEFAULT_ANNUAL_DISCOUNT_PERCENT);
  const [editedAnnualDiscount, setEditedAnnualDiscount] = useState(DEFAULT_ANNUAL_DISCOUNT_PERCENT);
  const [annualDiscountHasChanges, setAnnualDiscountHasChanges] = useState(false);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'subscription'));
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        if (data?.trial) {
          const trial = data.trial;
          setTrialConfig({
            ...trial,
            updatedAt: trial.updatedAt?.toDate()
          });
          setEditedTrialDays(trial.durationDays);
          setEditedTrialCalls(trial.maxAiCalls);
          setTrialEnabled(trial.isEnabled);
        }
        if (data?.annualDiscountPercent !== undefined) {
          setAnnualDiscountPercent(data.annualDiscountPercent);
          setEditedAnnualDiscount(data.annualDiscountPercent);
        }
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || iaT.errorLoading);
    } finally {
      setLoading(false);
    }
  };

  const saveTrialConfig = async () => {
    setSaving(true);
    setError(null);

    try {
      const updateTrialFn = httpsCallable(functions, 'subscriptionUpdateTrialConfig');
      await updateTrialFn({
        durationDays: editedTrialDays,
        maxAiCalls: editedTrialCalls,
        isEnabled: trialEnabled
      });

      setSaveSuccess(true);
      setTrialHasChanges(false);
      setTimeout(() => setSaveSuccess(false), 3000);
      await loadData();
    } catch (err: any) {
      console.error('Error saving trial config:', err);
      setError(err.message || iaT.errorSaving);
    } finally {
      setSaving(false);
    }
  };

  const saveAnnualDiscount = async () => {
    setSaving(true);
    setError(null);

    try {
      await updateDoc(doc(db, 'settings', 'subscription'), {
        annualDiscountPercent: editedAnnualDiscount,
        updatedAt: serverTimestamp()
      });

      setAnnualDiscountPercent(editedAnnualDiscount);
      setSaveSuccess(true);
      setAnnualDiscountHasChanges(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error saving annual discount:', err);
      setError(err.message || iaT.errorSaving);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cloud Functions Warning */}
      <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-amber-800">Cloud Function non déployée</p>
          <p className="text-sm text-amber-700 mt-1">
            La fonction <code className="bg-amber-100 px-1 rounded">subscriptionUpdateTrialConfig</code> doit être déployée pour sauvegarder la configuration d'essai.
          </p>
          <p className="text-xs text-amber-600 mt-2">
            La remise annuelle peut être modifiée directement via Firestore.
          </p>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}
      {saveSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2 text-green-700">
          <Check className="w-4 h-4" />
          {iaT.savedSuccess}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trial Config */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Période d'essai
            </h2>
          </div>

          <div className="space-y-4">
            {/* Trial Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Essai gratuit activé</span>
              <button
                onClick={() => {
                  setTrialEnabled(!trialEnabled);
                  setTrialHasChanges(true);
                }}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  trialEnabled ? 'bg-indigo-600' : 'bg-gray-300'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    trialEnabled ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>

            {/* Trial Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Durée de l'essai (jours)
              </label>
              <input
                type="number"
                value={editedTrialDays}
                onChange={(e) => {
                  setEditedTrialDays(parseInt(e.target.value) || 0);
                  setTrialHasChanges(true);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Trial Calls */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre d'appels IA gratuits
              </label>
              <input
                type="number"
                value={editedTrialCalls}
                onChange={(e) => {
                  setEditedTrialCalls(parseInt(e.target.value) || 0);
                  setTrialHasChanges(true);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Current Config Info */}
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
              <p className="font-medium mb-1">Configuration actuelle :</p>
              <ul className="list-disc list-inside space-y-1">
                <li>{trialConfig.durationDays} jours</li>
                <li>{trialConfig.maxAiCalls} appels gratuits</li>
                <li>{trialConfig.isEnabled ? 'Activé' : 'Désactivé'}</li>
              </ul>
              {trialConfig.updatedAt && (
                <p className="mt-2 text-xs text-gray-500">
                  Dernière modification : {trialConfig.updatedAt.toLocaleDateString()}
                </p>
              )}
            </div>

            {/* Save Button */}
            {trialHasChanges && (
              <button
                onClick={saveTrialConfig}
                disabled={saving}
                className="w-full py-2 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Enregistrer
              </button>
            )}
          </div>
        </div>

        {/* Annual Discount Config */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Remise Annuelle
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pourcentage de remise (%)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={editedAnnualDiscount}
                  onChange={(e) => {
                    const val = Math.min(50, Math.max(0, parseInt(e.target.value) || 0));
                    setEditedAnnualDiscount(val);
                    setAnnualDiscountHasChanges(true);
                  }}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <span className="text-2xl font-bold text-green-600">
                  -{editedAnnualDiscount}%
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Remise appliquée sur le prix mensuel x 12 pour l'abonnement annuel
              </p>
            </div>

            {/* Example */}
            <div className="bg-green-50 rounded-lg p-3 text-sm text-green-700">
              <p className="font-medium">Exemple avec un plan à 49€/mois :</p>
              <ul className="mt-1 space-y-1">
                <li>Prix annuel sans remise : 588€</li>
                <li>Avec -{editedAnnualDiscount}% : {(588 * (1 - editedAnnualDiscount/100)).toFixed(2)}€/an</li>
                <li>Soit {(588 * (1 - editedAnnualDiscount/100) / 12).toFixed(2)}€/mois</li>
              </ul>
            </div>

            {/* Save Button */}
            {annualDiscountHasChanges && (
              <button
                onClick={saveAnnualDiscount}
                disabled={saving}
                className="w-full py-2 px-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Enregistrer la remise
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IaTrialConfigTab;
