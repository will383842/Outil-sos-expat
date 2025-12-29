/**
 * IaTrialConfigTab - Configuration de la periode d'essai et remise annuelle
 * Avec liste des providers en essai, stats de conversion
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAdminTranslations, useIaAdminTranslations } from '../../../utils/adminTranslations';
import {
  Clock,
  TrendingUp,
  Save,
  RefreshCw,
  Check,
  AlertTriangle,
  Users,
  Sparkles,
  Crown,
  ArrowRight,
  Calendar,
  Activity,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  getDocs,
  query,
  where,
  limit
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../../config/firebase';
import {
  TrialConfig,
  DEFAULT_TRIAL_CONFIG,
  DEFAULT_ANNUAL_DISCOUNT_PERCENT
} from '../../../types/subscription';
import { TrialProvider } from './types';
import { cn } from '../../../utils/cn';

// ============================================================================
// TRIAL PROVIDERS TABLE
// ============================================================================

interface TrialProvidersTableProps {
  providers: TrialProvider[];
  loading: boolean;
  onRefresh: () => void;
}

const TrialProvidersTable: React.FC<TrialProvidersTableProps> = ({ providers, loading, onRefresh }) => {
  const [expanded, setExpanded] = useState(true);

  if (!expanded) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <button
          onClick={() => setExpanded(true)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-gray-900">
              Prestataires en essai ({providers.length})
            </span>
          </div>
          <ChevronDown className="w-5 h-5 text-gray-400" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <button
          onClick={() => setExpanded(false)}
          className="flex items-center gap-2"
        >
          <Sparkles className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-gray-900">
            Prestataires en essai ({providers.length})
          </span>
          <ChevronUp className="w-4 h-4 text-gray-400" />
        </button>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
        </div>
      ) : providers.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          Aucun prestataire en essai actuellement
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Prestataire
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Debut essai
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Jours restants
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Appels IA
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Derniere activite
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {providers.map(provider => {
                const usagePercent = Math.round((provider.aiCallsUsed / provider.maxAiCalls) * 100);

                return (
                  <tr key={provider.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-gray-900">{provider.displayName}</div>
                        <div className="text-sm text-gray-500">{provider.email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                        {provider.providerType === 'lawyer' ? 'Avocat' : 'Expatrie'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {provider.trialStartedAt.toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'px-2 py-1 rounded text-sm font-medium',
                        provider.daysRemaining <= 3
                          ? 'bg-red-100 text-red-700'
                          : provider.daysRemaining <= 7
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-green-100 text-green-700'
                      )}>
                        {provider.daysRemaining}j
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-24">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>{provider.aiCallsUsed}</span>
                          <span>{provider.maxAiCalls}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className={cn(
                              'h-1.5 rounded-full',
                              usagePercent >= 100 ? 'bg-red-500' :
                              usagePercent >= 66 ? 'bg-amber-500' : 'bg-blue-500'
                            )}
                            style={{ width: `${Math.min(usagePercent, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {provider.lastActivityAt
                        ? provider.lastActivityAt.toLocaleDateString('fr-FR')
                        : '-'
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

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

  // Trial providers
  const [trialProviders, setTrialProviders] = useState<TrialProvider[]>([]);
  const [providersLoading, setProvidersLoading] = useState(true);

  // Conversion stats
  const [conversionStats, setConversionStats] = useState({
    totalTrials: 0,
    activeTrials: 0,
    converted: 0,
    expired: 0,
    conversionRate: 0
  });

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    loadTrialProviders();
    loadConversionStats();
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

  const loadTrialProviders = useCallback(async () => {
    setProvidersLoading(true);
    try {
      const now = new Date();

      // Query users with trial status
      const usersQuery = query(
        collection(db, 'users'),
        where('role', 'in', ['lawyer', 'expat_aidant', 'provider']),
        limit(500)
      );

      const snapshot = await getDocs(usersQuery);
      const providers: TrialProvider[] = [];

      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        const freeTrialUntil = data.freeTrialUntil?.toDate();
        const trialStartedAt = data.trialStartedAt?.toDate() || data.createdAt?.toDate();

        // Check if in trial
        const isInTrial = data.subscriptionStatus === 'trialing' ||
          (freeTrialUntil && freeTrialUntil > now && !data.stripeSubscriptionId);

        if (isInTrial && freeTrialUntil) {
          const daysRemaining = Math.max(0, Math.ceil((freeTrialUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

          providers.push({
            id: docSnap.id,
            email: data.email || '',
            displayName: data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'N/A',
            providerType: data.role === 'provider' ? (data.providerType || 'lawyer') : data.role,
            trialStartedAt: trialStartedAt || new Date(),
            trialEndsAt: freeTrialUntil,
            daysRemaining,
            aiCallsUsed: data.aiCallsUsed || 0,
            maxAiCalls: data.aiCallsLimit || trialConfig.maxAiCalls || 3,
            lastActivityAt: data.aiLastCallAt?.toDate() || data.lastLoginAt?.toDate()
          });
        }
      });

      // Sort by days remaining (least first)
      providers.sort((a, b) => a.daysRemaining - b.daysRemaining);

      setTrialProviders(providers);
    } catch (err) {
      console.error('Error loading trial providers:', err);
    } finally {
      setProvidersLoading(false);
    }
  }, [trialConfig.maxAiCalls]);

  const loadConversionStats = async () => {
    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('role', 'in', ['lawyer', 'expat_aidant', 'provider']),
        limit(1000)
      );

      const snapshot = await getDocs(usersQuery);

      let totalTrials = 0;
      let activeTrials = 0;
      let converted = 0;
      let expired = 0;

      const now = new Date();

      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();

        // Has ever been in trial
        if (data.trialStartedAt || data.freeTrialUntil) {
          totalTrials++;

          const freeTrialUntil = data.freeTrialUntil?.toDate();

          if (data.subscriptionStatus === 'active' && data.stripeSubscriptionId) {
            // Converted to paid
            converted++;
          } else if (freeTrialUntil && freeTrialUntil > now) {
            // Still in trial
            activeTrials++;
          } else if (freeTrialUntil && freeTrialUntil <= now) {
            // Trial expired without conversion
            expired++;
          }
        }
      });

      const conversionRate = totalTrials > 0
        ? Math.round((converted / (converted + expired)) * 100 * 10) / 10
        : 0;

      setConversionStats({
        totalTrials,
        activeTrials,
        converted,
        expired,
        conversionRate
      });
    } catch (err) {
      console.error('Error loading conversion stats:', err);
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
      // If Cloud Function not available, try direct update
      try {
        await updateDoc(doc(db, 'settings', 'subscription'), {
          trial: {
            durationDays: editedTrialDays,
            maxAiCalls: editedTrialCalls,
            isEnabled: trialEnabled,
            updatedAt: serverTimestamp(),
            updatedBy: 'admin'
          },
          updatedAt: serverTimestamp()
        });
        setSaveSuccess(true);
        setTrialHasChanges(false);
        setTimeout(() => setSaveSuccess(false), 3000);
        await loadData();
      } catch (directErr: any) {
        setError(directErr.message || iaT.errorSaving);
      }
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
      {/* Conversion Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{conversionStats.totalTrials}</div>
          <div className="text-sm text-gray-500">Total essais</div>
        </div>
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <div className="text-2xl font-bold text-blue-700">{conversionStats.activeTrials}</div>
          <div className="text-sm text-blue-600">En cours</div>
        </div>
        <div className="bg-green-50 rounded-lg border border-green-200 p-4">
          <div className="text-2xl font-bold text-green-700">{conversionStats.converted}</div>
          <div className="text-sm text-green-600">Convertis</div>
        </div>
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-700">{conversionStats.expired}</div>
          <div className="text-sm text-gray-500">Expires</div>
        </div>
        <div className={cn(
          'rounded-lg border p-4',
          conversionStats.conversionRate >= 30
            ? 'bg-green-50 border-green-200'
            : conversionStats.conversionRate >= 15
            ? 'bg-amber-50 border-amber-200'
            : 'bg-red-50 border-red-200'
        )}>
          <div className={cn(
            'text-2xl font-bold',
            conversionStats.conversionRate >= 30 ? 'text-green-700' :
            conversionStats.conversionRate >= 15 ? 'text-amber-700' : 'text-red-700'
          )}>
            {conversionStats.conversionRate}%
          </div>
          <div className={cn(
            'text-sm',
            conversionStats.conversionRate >= 30 ? 'text-green-600' :
            conversionStats.conversionRate >= 15 ? 'text-amber-600' : 'text-red-600'
          )}>
            Taux conversion
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <span className="text-red-700">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4 text-red-500" />
          </button>
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
              Periode d'essai
            </h2>
          </div>

          <div className="space-y-4">
            {/* Trial Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Essai gratuit active</span>
              <button
                onClick={() => {
                  setTrialEnabled(!trialEnabled);
                  setTrialHasChanges(true);
                }}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  trialEnabled ? 'bg-indigo-600' : 'bg-gray-300'
                )}
                role="switch"
                aria-checked={trialEnabled}
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
                Duree de l'essai (jours)
              </label>
              <input
                type="number"
                value={editedTrialDays}
                onChange={(e) => {
                  setEditedTrialDays(parseInt(e.target.value) || 0);
                  setTrialHasChanges(true);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                min="1"
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
                min="0"
              />
            </div>

            {/* Current Config Info */}
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
              <p className="font-medium mb-1">Configuration actuelle :</p>
              <ul className="list-disc list-inside space-y-1">
                <li>{trialConfig.durationDays} jours</li>
                <li>{trialConfig.maxAiCalls} appels gratuits</li>
                <li>{trialConfig.isEnabled ? 'Active' : 'Desactive'}</li>
              </ul>
              {trialConfig.updatedAt && (
                <p className="mt-2 text-xs text-gray-500">
                  Derniere modification : {trialConfig.updatedAt.toLocaleDateString('fr-FR')}
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
                Remise appliquee sur le prix mensuel x 12 pour l'abonnement annuel
              </p>
            </div>

            {/* Example */}
            <div className="bg-green-50 rounded-lg p-3 text-sm text-green-700">
              <p className="font-medium">Exemple avec un plan a 49EUR/mois :</p>
              <ul className="mt-1 space-y-1">
                <li>Prix annuel sans remise : 588EUR</li>
                <li>Avec -{editedAnnualDiscount}% : {(588 * (1 - editedAnnualDiscount/100)).toFixed(2)}EUR/an</li>
                <li>Soit {(588 * (1 - editedAnnualDiscount/100) / 12).toFixed(2)}EUR/mois</li>
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

      {/* Trial Providers Table */}
      <TrialProvidersTable
        providers={trialProviders}
        loading={providersLoading}
        onRefresh={loadTrialProviders}
      />
    </div>
  );
};

export default IaTrialConfigTab;
