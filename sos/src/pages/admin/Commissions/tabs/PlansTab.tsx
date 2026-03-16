/**
 * PlansTab - Manage promotional commission plans (time-limited rate overrides)
 * Plans define commission rates for specific periods. When users register during
 * an active plan, their rates are locked forever at those values.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functionsAffiliate, functions } from '@/config/firebase';
import {
  Calendar, Plus, Pencil, Trash2, Save, X, Loader2, AlertTriangle,
  CheckCircle, Clock, ToggleLeft, ToggleRight, RefreshCw, Info, Lock,
} from 'lucide-react';
import { UI, formatCents } from './shared';

interface CommissionPlan {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  priority: number;
  chatterRates: Record<string, number>;
  influencerRates: Record<string, number>;
  bloggerRates: Record<string, number>;
  groupAdminRates: Record<string, number>;
  affiliateRates?: Record<string, number>;
  createdAt?: string;
  updatedAt?: string;
}

const manageCommissionPlansFn = httpsCallable(functions, 'manageCommissionPlans');

/** Per-role rate fields matching backend CommissionPlan interfaces */
const RATE_FIELDS_BY_ROLE: Record<string, { key: string; label: string }[]> = {
  chatterRates: [
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
  influencerRates: [
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
  bloggerRates: [
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
  groupAdminRates: [
    { key: 'commissionClientCallAmount', label: 'Appel client (générique)' },
    { key: 'commissionClientAmountLawyer', label: 'Appel client (avocat)' },
    { key: 'commissionClientAmountExpat', label: 'Appel client (expatrié)' },
    { key: 'commissionN1CallAmount', label: 'N1 appel' },
    { key: 'commissionN2CallAmount', label: 'N2 appel' },
    { key: 'commissionActivationBonusAmount', label: 'Bonus activation' },
    { key: 'commissionN1RecruitBonusAmount', label: 'Bonus recrutement N1' },
  ],
};

const ROLES = [
  { key: 'chatterRates', label: 'Chatter' },
  { key: 'influencerRates', label: 'Influenceur' },
  { key: 'bloggerRates', label: 'Blogueur' },
  { key: 'groupAdminRates', label: 'Admin Groupe' },
];

const emptyPlan: Omit<CommissionPlan, 'id'> = {
  name: '',
  description: '',
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
  isActive: false,
  priority: 10,
  chatterRates: {},
  influencerRates: {},
  bloggerRates: {},
  groupAdminRates: {},
};

const PlansTab: React.FC = () => {
  const [plans, setPlans] = useState<CommissionPlan[]>([]);
  const [activePlan, setActivePlan] = useState<CommissionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState<CommissionPlan | null>(null);
  const [creating, setCreating] = useState(false);
  const [newPlan, setNewPlan] = useState<Omit<CommissionPlan, 'id'>>(emptyPlan);
  const [saving, setSaving] = useState(false);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listResult, activeResult] = await Promise.all([
        manageCommissionPlansFn({ action: 'list' }),
        manageCommissionPlansFn({ action: 'getActivePlan' }),
      ]);
      setPlans((listResult.data as any).plans || []);
      setActivePlan((activeResult.data as any).plan || null);
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const handleCreate = async () => {
    setSaving(true);
    setError(null);
    try {
      await manageCommissionPlansFn({ action: 'create', data: newPlan });
      setCreating(false);
      setNewPlan(emptyPlan);
      setSuccess('Plan créé');
      setTimeout(() => setSuccess(null), 3000);
      fetchPlans();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      await manageCommissionPlansFn({
        action: 'update',
        data: { planId: editing.id, ...editing },
      });
      setEditing(null);
      setSuccess('Plan mis à jour');
      setTimeout(() => setSuccess(null), 3000);
      fetchPlans();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (planId: string) => {
    if (!confirm('Supprimer ce plan ? Les affiliés ayant ce plan garderont leurs taux verrouillés.')) return;
    try {
      await manageCommissionPlansFn({ action: 'delete', data: { planId } });
      setSuccess('Plan supprimé');
      setTimeout(() => setSuccess(null), 3000);
      fetchPlans();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggle = async (plan: CommissionPlan) => {
    try {
      await manageCommissionPlansFn({
        action: 'update',
        data: { planId: plan.id, isActive: !plan.isActive },
      });
      fetchPlans();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const formatDate = (d: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const isPlanActive = (plan: CommissionPlan) => {
    if (!plan.isActive) return false;
    const now = new Date();
    const start = new Date(plan.startDate);
    const end = plan.endDate ? new Date(plan.endDate) : null;
    return now >= start && (!end || now <= end);
  };

  const renderRateEditor = (
    rates: Record<string, number>,
    onChange: (key: string, val: number) => void,
    roleLabel: string,
    roleKey: string
  ) => {
    const fields = RATE_FIELDS_BY_ROLE[roleKey] || [];
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-500 uppercase">{roleLabel}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {fields.map(({ key, label }) => (
            <div key={key}>
              <label className="text-xs text-gray-400">{label}</label>
              <input
                type="number"
                value={rates[key] ?? ''}
                onChange={(e) => onChange(key, parseInt(e.target.value) || 0)}
                placeholder="—"
                className={`${UI.input} text-xs py-1.5`}
                min={0}
                step={50}
              />
              {rates[key] > 0 && <p className="text-xs text-gray-400 mt-0.5">= {formatCents(rates[key])}</p>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>;

  return (
    <div className="space-y-6">
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

      {/* How it works */}
      <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-indigo-700 dark:text-indigo-300">
            <p className="font-medium mb-1">Comment fonctionnent les plans promotionnels</p>
            <ul className="text-xs space-y-1 text-indigo-600 dark:text-indigo-400 list-disc pl-4">
              <li>Les plans définissent des taux de commission pour une <strong>période spécifique</strong> (date début/fin)</li>
              <li>Quand un affilié s'inscrit pendant un plan actif, ses taux sont <strong>verrouillés à vie</strong></li>
              <li>Sans date de fin = plan actif indéfiniment (jusqu'à désactivation manuelle)</li>
              <li>Si plusieurs plans se chevauchent, la <strong>priorité</strong> la plus élevée l'emporte</li>
              <li>Les taux non définis dans un plan utilisent les <strong>valeurs par défaut</strong> du rôle</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Active Plan Banner */}
      {activePlan && (
        <div className={`${UI.card} p-4 border-2 border-green-400/40`}>
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Plan actif : {activePlan.name}
              </p>
              <p className="text-xs text-gray-500">
                {formatDate(activePlan.startDate)} → {activePlan.endDate ? formatDate(activePlan.endDate) : 'Illimité'}
                {' • '}Priorité {activePlan.priority}
              </p>
            </div>
          </div>
        </div>
      )}

      {!activePlan && (
        <div className={`${UI.card} p-4 border-2 border-gray-300/40`}>
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-gray-400" />
            <p className="text-sm text-gray-500">Aucun plan promotionnel actif — les valeurs par défaut s'appliquent</p>
          </div>
        </div>
      )}

      {/* Create Button */}
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-500" />
          Plans ({plans.length})
        </h3>
        <div className="flex gap-2">
          <button onClick={fetchPlans} className={`${UI.button.secondary} px-3 py-1.5 text-sm flex items-center gap-1.5`}>
            <RefreshCw className="w-3.5 h-3.5" /> Actualiser
          </button>
          <button onClick={() => setCreating(true)} className={`${UI.button.primary} px-3 py-1.5 text-sm flex items-center gap-1.5`}>
            <Plus className="w-3.5 h-3.5" /> Nouveau plan
          </button>
        </div>
      </div>

      {/* Create Form */}
      {creating && (
        <div className={`${UI.card} p-6 space-y-4 border-2 border-indigo-400/30`}>
          <h4 className="font-semibold text-gray-900 dark:text-white">Nouveau plan promotionnel</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={UI.label}>Nom</label>
              <input type="text" value={newPlan.name} onChange={(e) => setNewPlan(p => ({ ...p, name: e.target.value }))}
                className={UI.input} placeholder="Ex: Promo été 2026" />
            </div>
            <div>
              <label className={UI.label}>Date début</label>
              <input type="date" value={newPlan.startDate} onChange={(e) => setNewPlan(p => ({ ...p, startDate: e.target.value }))}
                className={UI.input} />
            </div>
            <div>
              <label className={UI.label}>Date fin (vide = illimité)</label>
              <input type="date" value={newPlan.endDate} onChange={(e) => setNewPlan(p => ({ ...p, endDate: e.target.value }))}
                className={UI.input} />
            </div>
            <div>
              <label className={UI.label}>Priorité</label>
              <input type="number" value={newPlan.priority} onChange={(e) => setNewPlan(p => ({ ...p, priority: parseInt(e.target.value) || 0 }))}
                className={UI.input} min={1} />
            </div>
          </div>
          <div>
            <label className={UI.label}>Description</label>
            <input type="text" value={newPlan.description} onChange={(e) => setNewPlan(p => ({ ...p, description: e.target.value }))}
              className={UI.input} placeholder="Optionnel" />
          </div>

          {/* Rate overrides per role */}
          <div className="space-y-4 pt-2 border-t border-gray-200 dark:border-white/10">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Taux spécifiques (laisser vide pour utiliser les valeurs par défaut)
            </p>
            {ROLES.map(({ key, label }) => (
              <div key={key}>
                {renderRateEditor(
                  (newPlan as any)[key] || {},
                  (rateKey, val) => setNewPlan(p => ({ ...p, [key]: { ...(p as any)[key], [rateKey]: val } })),
                  label,
                  key
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => { setCreating(false); setNewPlan(emptyPlan); }}
              className={`${UI.button.secondary} px-4 py-2 flex items-center gap-1.5 text-sm`}>
              <X className="w-4 h-4" /> Annuler
            </button>
            <button onClick={handleCreate} disabled={saving || !newPlan.name}
              className={`${UI.button.primary} px-4 py-2 flex items-center gap-1.5 text-sm`}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Créer
            </button>
          </div>
        </div>
      )}

      {/* Plans List */}
      {plans.length === 0 && !creating && (
        <div className={`${UI.card} p-8 text-center`}>
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Aucun plan promotionnel. Seules les valeurs par défaut s'appliquent.</p>
        </div>
      )}

      {plans.map((plan) => {
        const isEditing = editing?.id === plan.id;
        const current = isEditing ? editing : plan;
        const active = isPlanActive(plan);

        return (
          <div key={plan.id} className={`${UI.card} p-5 ${active ? 'border-2 border-green-400/30' : ''}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                {isEditing ? (
                  <input type="text" value={current.name}
                    onChange={(e) => setEditing({ ...current, name: e.target.value })}
                    className={`${UI.input} font-semibold mb-2`} />
                ) : (
                  <h4 className="font-semibold text-gray-900 dark:text-white">{plan.name}</h4>
                )}
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                  <span>{formatDate(plan.startDate)} → {plan.endDate ? formatDate(plan.endDate) : 'Illimité'}</span>
                  <span>Priorité {plan.priority}</span>
                  {active && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">Actif maintenant</span>}
                  {!plan.isActive && <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">Désactivé</span>}
                </div>
                {plan.description && <p className="text-xs text-gray-400 mt-1">{plan.description}</p>}

                {/* Show rates summary */}
                {!isEditing && (
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                    {ROLES.map(({ key, label }) => {
                      const rates = (plan as any)[key] as Record<string, number> | undefined;
                      const count = rates ? Object.values(rates).filter(v => v > 0).length : 0;
                      return (
                        <div key={key} className="text-xs p-2 bg-gray-50 dark:bg-white/5 rounded-lg">
                          <span className="text-gray-500">{label}</span>
                          <span className="ml-1 font-medium text-gray-700 dark:text-gray-300">
                            {count > 0 ? `${count} taux définis` : 'Par défaut'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Edit rates */}
                {isEditing && (
                  <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <label className={UI.label}>Date début</label>
                        <input type="date" value={current.startDate?.split('T')[0] || ''}
                          onChange={(e) => setEditing({ ...current, startDate: e.target.value })}
                          className={UI.input} />
                      </div>
                      <div>
                        <label className={UI.label}>Date fin</label>
                        <input type="date" value={current.endDate?.split('T')[0] || ''}
                          onChange={(e) => setEditing({ ...current, endDate: e.target.value })}
                          className={UI.input} />
                      </div>
                      <div>
                        <label className={UI.label}>Priorité</label>
                        <input type="number" value={current.priority}
                          onChange={(e) => setEditing({ ...current, priority: parseInt(e.target.value) || 0 })}
                          className={UI.input} min={1} />
                      </div>
                    </div>
                    {ROLES.map(({ key, label }) => (
                      <div key={key}>
                        {renderRateEditor(
                          (current as any)[key] || {},
                          (rateKey, val) => setEditing({ ...current, [key]: { ...(current as any)[key], [rateKey]: val } }),
                          label,
                          key
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => handleToggle(plan)} title={plan.isActive ? 'Désactiver' : 'Activer'}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                  {plan.isActive
                    ? <ToggleRight className="w-5 h-5 text-green-500" />
                    : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                </button>
                {isEditing ? (
                  <>
                    <button onClick={handleUpdate} disabled={saving}
                      className="p-2 rounded-lg hover:bg-green-50 text-green-600 transition-colors">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setEditing(null)}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setEditing({ ...plan })}
                      className="p-2 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(plan.id)}
                      className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PlansTab;
