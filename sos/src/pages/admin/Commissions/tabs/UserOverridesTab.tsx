/**
 * UserOverridesTab - Individual user commission overrides
 * Allows admin to search a user and override their commission rates,
 * assign a specific plan, or set a custom discount.
 */
import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functionsAffiliate } from '@/config/firebase';
import {
  Search, Save, Loader2, AlertTriangle, CheckCircle, UserCog,
  Lock, Unlock, Info, DollarSign, Percent,
} from 'lucide-react';
import { UI, formatCents } from './shared';

interface UserInfo {
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  affiliateCode?: string;
  commissionPlanId?: string | null;
  commissionPlanName?: string | null;
  lockedRates?: Record<string, number> | null;
  rateLockDate?: string | null;
  discountConfig?: Record<string, unknown> | null;
}

interface UserCommissionSummary {
  totalEarned: number;
  pendingBalance: number;
  availableBalance: number;
  paidTotal: number;
  commissionCount: number;
}

/** Per-role rate keys matching backend commission field names */
const RATE_KEYS_BY_ROLE: Record<string, { key: string; label: string }[]> = {
  chatter: [
    { key: 'commissionClientCallAmount', label: 'Appel client (générique)' },
    { key: 'commissionClientCallAmountLawyer', label: 'Appel client (avocat)' },
    { key: 'commissionClientCallAmountExpat', label: 'Appel client (expatrié)' },
    { key: 'commissionN1CallAmount', label: 'N1 appel' },
    { key: 'commissionN2CallAmount', label: 'N2 appel' },
    { key: 'commissionActivationBonusAmount', label: 'Bonus activation' },
    { key: 'commissionN1RecruitBonusAmount', label: 'Bonus recrutement N1' },
    { key: 'commissionProviderCallAmount', label: 'Appel prestataire (générique)' },
    { key: 'commissionProviderCallAmountLawyer', label: 'Appel prestataire (avocat)' },
    { key: 'commissionProviderCallAmountExpat', label: 'Appel prestataire (expatrié)' },
    { key: 'commissionCaptainCallAmountLawyer', label: 'Captain (avocat)' },
    { key: 'commissionCaptainCallAmountExpat', label: 'Captain (expatrié)' },
  ],
  influencer: [
    { key: 'commissionClientAmount', label: 'Appel client (générique)' },
    { key: 'commissionClientAmountLawyer', label: 'Appel client (avocat)' },
    { key: 'commissionClientAmountExpat', label: 'Appel client (expatrié)' },
    { key: 'commissionRecruitmentAmount', label: 'Recrutement (générique)' },
    { key: 'commissionRecruitmentAmountLawyer', label: 'Recrutement (avocat)' },
    { key: 'commissionRecruitmentAmountExpat', label: 'Recrutement (expatrié)' },
    { key: 'commissionN1CallAmount', label: 'N1 appel' },
    { key: 'commissionN2CallAmount', label: 'N2 appel' },
    { key: 'commissionActivationBonusAmount', label: 'Bonus activation' },
    { key: 'commissionN1RecruitBonusAmount', label: 'Bonus recrutement N1' },
  ],
  blogger: [
    { key: 'commissionClientAmount', label: 'Appel client (générique)' },
    { key: 'commissionClientAmountLawyer', label: 'Appel client (avocat)' },
    { key: 'commissionClientAmountExpat', label: 'Appel client (expatrié)' },
    { key: 'commissionRecruitmentAmount', label: 'Recrutement (générique)' },
    { key: 'commissionRecruitmentAmountLawyer', label: 'Recrutement (avocat)' },
    { key: 'commissionRecruitmentAmountExpat', label: 'Recrutement (expatrié)' },
    { key: 'commissionN1CallAmount', label: 'N1 appel' },
    { key: 'commissionN2CallAmount', label: 'N2 appel' },
    { key: 'commissionActivationBonusAmount', label: 'Bonus activation' },
    { key: 'commissionN1RecruitBonusAmount', label: 'Bonus recrutement N1' },
  ],
  groupAdmin: [
    { key: 'commissionClientCallAmount', label: 'Appel client (générique)' },
    { key: 'commissionClientAmountLawyer', label: 'Appel client (avocat)' },
    { key: 'commissionClientAmountExpat', label: 'Appel client (expatrié)' },
    { key: 'commissionN1CallAmount', label: 'N1 appel' },
    { key: 'commissionN2CallAmount', label: 'N2 appel' },
    { key: 'commissionActivationBonusAmount', label: 'Bonus activation' },
    { key: 'commissionN1RecruitBonusAmount', label: 'Bonus recrutement N1' },
  ],
  affiliate: [
    { key: 'signupBonus', label: 'Bonus inscription' },
    { key: 'callCommissionRate', label: 'Taux commission appel' },
    { key: 'callFixedBonus', label: 'Bonus fixe appel' },
    { key: 'subscriptionRate', label: 'Taux abonnement' },
    { key: 'subscriptionFixedBonus', label: 'Bonus fixe abonnement' },
    { key: 'providerValidationBonus', label: 'Bonus validation prestataire' },
    { key: 'commissionN1CallAmount', label: 'N1 appel' },
    { key: 'commissionN2CallAmount', label: 'N2 appel' },
    { key: 'commissionActivationBonusAmount', label: 'Bonus activation' },
    { key: 'commissionN1RecruitBonusAmount', label: 'Bonus recrutement N1' },
  ],
};

/** Fallback keys shown when user role is unknown */
const RATE_KEYS_FALLBACK = [
  { key: 'commissionClientCallAmount', label: 'Appel client' },
  { key: 'commissionN1CallAmount', label: 'N1 appel' },
  { key: 'commissionN2CallAmount', label: 'N2 appel' },
  { key: 'commissionActivationBonusAmount', label: 'Bonus activation' },
  { key: 'commissionN1RecruitBonusAmount', label: 'Bonus recrutement N1' },
];

const UserOverridesTab: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [summary, setSummary] = useState<UserCommissionSummary | null>(null);
  const [editRates, setEditRates] = useState<Record<string, number>>({});
  const [assignPlanId, setAssignPlanId] = useState('');

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    setUserInfo(null);
    setSummary(null);
    setEditRates({});

    try {
      const fn = httpsCallable<{ userId: string }, {
        success: boolean;
        userId: string;
        userInfo: UserInfo;
        summary: UserCommissionSummary;
      }>(functionsAffiliate, 'adminGetUserCommissionSummary');

      const result = await fn({ userId: searchQuery.trim() });
      setUserId(searchQuery.trim());
      setUserInfo(result.data.userInfo);
      setSummary(result.data.summary);
      if (result.data.userInfo?.lockedRates) {
        setEditRates({ ...result.data.userInfo.lockedRates });
      }
    } catch (err: any) {
      setError(err.message || 'Utilisateur non trouvé');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRates = async () => {
    if (!userId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const fn = httpsCallable<{ userId: string; rates: Record<string, number> }, { success: boolean }>(
        functionsAffiliate, 'adminSetUserLockedRates'
      );
      await fn({ userId, rates: editRates });
      setSuccess('Taux individuels enregistrés');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignPlan = async () => {
    if (!userId || !assignPlanId.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const fn = httpsCallable<{ userId: string; planId: string }, { success: boolean }>(
        functionsAffiliate, 'adminAssignPlanToUser'
      );
      await fn({ userId, planId: assignPlanId.trim() });
      setSuccess('Plan assigné');
      setTimeout(() => setSuccess(null), 3000);
      handleSearch(); // Refresh
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePlan = async () => {
    if (!userId) return;
    if (!confirm('Retirer le plan individuel ? Les taux par défaut du rôle s\'appliqueront.')) return;
    try {
      const fn = httpsCallable<{ userId: string }, { success: boolean }>(
        functionsAffiliate, 'adminRemovePlanFromUser'
      );
      await fn({ userId });
      setSuccess('Plan retiré');
      setTimeout(() => setSuccess(null), 3000);
      handleSearch();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Explanation */}
      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-700 dark:text-amber-300">
            <p className="font-medium mb-1">Overrides individuels</p>
            <ul className="text-xs space-y-1 text-amber-600 dark:text-amber-400 list-disc pl-4">
              <li><strong>Taux verrouillés</strong> : gelés à l'inscription, ne changent jamais (sauf override manuel)</li>
              <li><strong>Plan assigné</strong> : plan spécifique attribué par admin (priorité sur le plan par défaut)</li>
              <li><strong>Override manuel</strong> : taux définis manuellement, <strong>priorité maximale</strong> sur tout le reste</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className={`${UI.card} p-6`}>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <UserCog className="w-5 h-5 text-indigo-500" />
          Rechercher un utilisateur
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="UID de l'utilisateur"
            className={`${UI.input} flex-1`}
          />
          <button onClick={handleSearch} disabled={loading}
            className={`${UI.button.primary} px-4 py-2 flex items-center gap-2`}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Rechercher
          </button>
        </div>
      </div>

      {/* Feedback */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center gap-2 text-red-600 text-sm">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center gap-2 text-green-600 text-sm">
          <CheckCircle className="w-4 h-4" /> {success}
        </div>
      )}

      {/* User Info */}
      {userInfo && (
        <>
          <div className={`${UI.card} p-6`}>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Profil</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-gray-900 dark:text-white font-medium">{userInfo.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Nom</p>
                <p className="text-gray-900 dark:text-white">{userInfo.firstName} {userInfo.lastName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Rôle</p>
                <p className="text-gray-900 dark:text-white capitalize">{userInfo.role || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Code affilié</p>
                <p className="text-gray-900 dark:text-white font-mono text-xs">{userInfo.affiliateCode || '—'}</p>
              </div>
            </div>

            {/* Locked info */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500 flex items-center gap-1"><Lock className="w-3 h-3" /> Plan verrouillé</p>
                <p className="text-gray-900 dark:text-white">{userInfo.commissionPlanName || userInfo.commissionPlanId || 'Aucun'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Date verrouillage</p>
                <p className="text-gray-900 dark:text-white">
                  {userInfo.rateLockDate ? new Date(userInfo.rateLockDate).toLocaleDateString('fr-FR') : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Taux verrouillés</p>
                <p className="text-gray-900 dark:text-white">
                  {userInfo.lockedRates ? `${Object.keys(userInfo.lockedRates).length} taux` : 'Aucun'}
                </p>
              </div>
            </div>
          </div>

          {/* Summary */}
          {summary && (
            <div className={`${UI.card} p-6`}>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-500" />
                Résumé commissions
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: 'Total gagné', value: summary.totalEarned, color: 'text-green-600' },
                  { label: 'En attente', value: summary.pendingBalance, color: 'text-amber-600' },
                  { label: 'Disponible', value: summary.availableBalance, color: 'text-blue-600' },
                  { label: 'Payé', value: summary.paidTotal, color: 'text-gray-600' },
                  { label: 'Nb commissions', value: summary.commissionCount, color: 'text-indigo-600', raw: true },
                ].map(({ label, value, color, raw }) => (
                  <div key={label} className="text-center p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className={`font-semibold font-mono ${color}`}>
                      {raw ? value : formatCents(value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Locked Rates Editor */}
          <div className={`${UI.card} p-6`}>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-red-500" />
              Override taux individuels
              <span className="text-xs font-normal text-gray-400">(priorité maximale)</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {(RATE_KEYS_BY_ROLE[userInfo.role || ''] || RATE_KEYS_FALLBACK).map(({ key, label }) => (
                <div key={key}>
                  <label className="text-xs text-gray-500">{label}</label>
                  <input
                    type="number"
                    value={editRates[key] ?? ''}
                    onChange={(e) => setEditRates(prev => ({
                      ...prev,
                      [key]: parseInt(e.target.value) || 0,
                    }))}
                    placeholder="Par défaut"
                    className={`${UI.input} text-sm`}
                    min={0}
                    step={50}
                  />
                  {editRates[key] > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">= {formatCents(editRates[key])}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={handleSaveRates} disabled={saving}
                className={`${UI.button.primary} px-4 py-2 flex items-center gap-2 text-sm`}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Enregistrer les overrides
              </button>
            </div>
          </div>

          {/* Assign Plan */}
          <div className={`${UI.card} p-6`}>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Percent className="w-5 h-5 text-purple-500" />
              Assigner un plan spécifique
            </h3>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className={UI.label}>ID du plan</label>
                <input
                  type="text"
                  value={assignPlanId}
                  onChange={(e) => setAssignPlanId(e.target.value)}
                  placeholder="Ex: promo_ete_2026"
                  className={UI.input}
                />
              </div>
              <button onClick={handleAssignPlan} disabled={saving || !assignPlanId.trim()}
                className={`${UI.button.primary} px-4 py-2.5 text-sm`}>
                Assigner
              </button>
              {userInfo.commissionPlanId && (
                <button onClick={handleRemovePlan}
                  className="px-4 py-2.5 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-colors flex items-center gap-1.5">
                  <Unlock className="w-4 h-4" /> Retirer
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UserOverridesTab;
