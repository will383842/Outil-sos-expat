/**
 * Admin Commission Plans Page
 *
 * CRUD interface for managing commission plans (Lifetime Rate Lock).
 * Plans define commission rates for specific time periods.
 * When affiliates register during a plan, rates are locked forever.
 */

import React, { useState, useEffect, useCallback } from "react";
import { httpsCallable, functions } from "@/config/firebase";

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
  createdBy?: string;
}

const manageCommissionPlansFn = httpsCallable(functions, "manageCommissionPlans");

const AdminCommissionPlans: React.FC = () => {
  const [plans, setPlans] = useState<CommissionPlan[]>([]);
  const [activePlan, setActivePlan] = useState<CommissionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<CommissionPlan | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      const [listResult, activeResult] = await Promise.all([
        manageCommissionPlansFn({ action: "list" }),
        manageCommissionPlansFn({ action: "getActivePlan" }),
      ]);
      const listData = listResult.data as any;
      const activeData = activeResult.data as any;
      setPlans(listData.plans || []);
      setActivePlan(activeData.plan || null);
    } catch (err: any) {
      setError(err.message || "Failed to load plans");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleDelete = async (planId: string) => {
    if (!confirm("Supprimer ce plan ? Les affilies ayant ce plan garderont leurs rates verrouilles.")) return;
    try {
      await manageCommissionPlansFn({ action: "delete", data: { planId } });
      await fetchPlans();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleActive = async (plan: CommissionPlan) => {
    try {
      await manageCommissionPlansFn({
        action: "update",
        data: { planId: plan.id, isActive: !plan.isActive },
      });
      await fetchPlans();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatAmount = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Commission Plans (Lifetime Rate Lock)
          </h1>
          <p className="text-gray-600 mt-1">
            Les rates d'un plan sont verrouilles a vie pour chaque affilie qui s'inscrit pendant la periode active.
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Nouveau Plan
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-bold">&times;</button>
        </div>
      )}

      {/* Active Plan Banner */}
      {activePlan && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full mr-2">ACTIF</span>
            <span className="font-semibold text-green-800">{activePlan.name}</span>
            <span className="text-green-600 ml-2">
              (jusqu'au {formatDate(activePlan.endDate)})
            </span>
          </div>
          <p className="text-green-700 mt-1 text-sm">
            Tous les nouveaux affilies recevront les rates de ce plan, verrouilles a vie.
          </p>
        </div>
      )}

      {/* Plans Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Periode</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priorite</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chatter Client</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Influencer Client</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Affiliate Appel</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {plans.map((plan) => (
              <tr key={plan.id} className={plan.id === activePlan?.id ? "bg-green-50" : ""}>
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{plan.name}</div>
                  {plan.description && (
                    <div className="text-sm text-gray-500 truncate max-w-xs">{plan.description}</div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {formatDate(plan.startDate)} - {formatDate(plan.endDate)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{plan.priority}</td>
                <td className="px-6 py-4 text-sm">
                  {plan.chatterRates?.commissionClientCallAmountLawyer
                    ? `${formatAmount(plan.chatterRates.commissionClientCallAmountLawyer)} / ${formatAmount(plan.chatterRates.commissionClientCallAmountExpat || plan.chatterRates.commissionClientCallAmount)}`
                    : formatAmount(plan.chatterRates?.commissionClientCallAmount || 0)}
                </td>
                <td className="px-6 py-4 text-sm">
                  {plan.influencerRates?.commissionClientAmountLawyer
                    ? `${formatAmount(plan.influencerRates.commissionClientAmountLawyer)} / ${formatAmount(plan.influencerRates.commissionClientAmountExpat || plan.influencerRates.commissionClientAmount)}`
                    : formatAmount(plan.influencerRates?.commissionClientAmount || 0)}
                </td>
                <td className="px-6 py-4 text-sm">
                  {plan.affiliateRates?.callFixedBonus
                    ? formatAmount(plan.affiliateRates.callFixedBonus)
                    : plan.affiliateRates?.callCommissionRate
                      ? `${(plan.affiliateRates.callCommissionRate * 100).toFixed(0)}%`
                      : "-"}
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleToggleActive(plan)}
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      plan.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {plan.isActive ? "Actif" : "Inactif"}
                  </button>
                </td>
                <td className="px-6 py-4 text-right text-sm space-x-2">
                  <button
                    onClick={() => setEditingPlan(plan)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(plan.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
            {plans.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                  Aucun plan. Creez votre premier plan de commission.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Form Modal */}
      {(showCreateForm || editingPlan) && (
        <PlanFormModal
          plan={editingPlan}
          onClose={() => {
            setShowCreateForm(false);
            setEditingPlan(null);
          }}
          onSave={async (data) => {
            try {
              if (editingPlan) {
                await manageCommissionPlansFn({
                  action: "update",
                  data: { planId: editingPlan.id, ...data },
                });
              } else {
                await manageCommissionPlansFn({ action: "create", data });
              }
              setShowCreateForm(false);
              setEditingPlan(null);
              await fetchPlans();
            } catch (err: any) {
              setError(err.message);
            }
          }}
        />
      )}
    </div>
  );
};

// ============================================================================
// PLAN FORM MODAL
// ============================================================================

interface PlanFormModalProps {
  plan: CommissionPlan | null;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

const PlanFormModal: React.FC<PlanFormModalProps> = ({ plan, onClose, onSave }) => {
  const [name, setName] = useState(plan?.name || "");
  const [description, setDescription] = useState(plan?.description || "");
  const [startDate, setStartDate] = useState(
    plan?.startDate ? new Date(plan.startDate).toISOString().split("T")[0] : ""
  );
  const [endDate, setEndDate] = useState(
    plan?.endDate ? new Date(plan.endDate).toISOString().split("T")[0] : ""
  );
  const [priority, setPriority] = useState(plan?.priority || 0);
  const [isActive, setIsActive] = useState(plan?.isActive ?? true);

  // Rates (in dollars for UX, converted to cents on save)
  const [chatterClientCall, setChatterClientCall] = useState(
    (plan?.chatterRates?.commissionClientCallAmount || 1000) / 100
  );
  const [chatterN1, setChatterN1] = useState(
    (plan?.chatterRates?.commissionN1CallAmount || 100) / 100
  );
  const [chatterN2, setChatterN2] = useState(
    (plan?.chatterRates?.commissionN2CallAmount || 50) / 100
  );
  const [influencerClient, setInfluencerClient] = useState(
    (plan?.influencerRates?.commissionClientAmount || 1000) / 100
  );
  const [influencerRecruitment, setInfluencerRecruitment] = useState(
    (plan?.influencerRates?.commissionRecruitmentAmount || 500) / 100
  );
  const [bloggerClient, setBloggerClient] = useState(
    (plan?.bloggerRates?.commissionClientAmount || 1000) / 100
  );
  const [groupAdminClientCall, setGroupAdminClientCall] = useState(
    (plan?.groupAdminRates?.commissionClientCallAmount || 1000) / 100
  );
  // Affiliate (generic) rates
  const [affiliateCallFixed, setAffiliateCallFixed] = useState(
    (plan?.affiliateRates?.callFixedBonus || 1000) / 100
  );
  const [affiliateCallRate, setAffiliateCallRate] = useState(
    plan?.affiliateRates?.callCommissionRate || 0
  );
  const [affiliateSignup, setAffiliateSignup] = useState(
    (plan?.affiliateRates?.signupBonus || 100) / 100
  );
  const [affiliateProviderBonus, setAffiliateProviderBonus] = useState(
    (plan?.affiliateRates?.providerValidationBonus || 500) / 100
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        name,
        description,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate + "T23:59:59Z").toISOString(),
        priority,
        isActive,
        chatterRates: {
          commissionClientCallAmount: Math.round(chatterClientCall * 100),
          commissionN1CallAmount: Math.round(chatterN1 * 100),
          commissionN2CallAmount: Math.round(chatterN2 * 100),
          commissionActivationBonusAmount: 500,
          commissionN1RecruitBonusAmount: 100,
          commissionProviderCallAmount: 500,
        },
        influencerRates: {
          commissionClientAmount: Math.round(influencerClient * 100),
          commissionRecruitmentAmount: Math.round(influencerRecruitment * 100),
        },
        bloggerRates: {
          commissionClientAmount: Math.round(bloggerClient * 100),
          commissionRecruitmentAmount: 500,
        },
        groupAdminRates: {
          commissionClientCallAmount: Math.round(groupAdminClientCall * 100),
          commissionN1CallAmount: Math.round(chatterN1 * 100),
          commissionN2CallAmount: Math.round(chatterN2 * 100),
          commissionActivationBonusAmount: 500,
          commissionN1RecruitBonusAmount: 100,
        },
        affiliateRates: {
          signupBonus: Math.round(affiliateSignup * 100),
          callCommissionRate: affiliateCallRate,
          callFixedBonus: Math.round(affiliateCallFixed * 100),
          subscriptionRate: 0,
          subscriptionFixedBonus: 500,
          providerValidationBonus: Math.round(affiliateProviderBonus * 100),
        },
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">
            {plan ? "Modifier le plan" : "Nouveau plan de commission"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nom du plan</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Offre Lancement Mars 2026"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Priorite</label>
                <input
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Date de debut</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date de fin</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">Plan actif</label>
            </div>

            {/* Commission Rates */}
            <div className="border-t pt-4">
              <h3 className="font-semibold text-gray-800 mb-3">Rates par appel client (en $)</h3>
              <p className="text-xs text-gray-500 mb-3">
                Si un seul montant est defini (pas de split lawyer/expat), ce montant s'applique a TOUS les appels.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600">Chatter - Appel client ($)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={chatterClientCall}
                    onChange={(e) => setChatterClientCall(Number(e.target.value))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Chatter - N1 ($)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={chatterN1}
                    onChange={(e) => setChatterN1(Number(e.target.value))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Chatter - N2 ($)</label>
                  <input
                    type="number"
                    step="0.25"
                    value={chatterN2}
                    onChange={(e) => setChatterN2(Number(e.target.value))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">GroupAdmin - Appel client ($)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={groupAdminClientCall}
                    onChange={(e) => setGroupAdminClientCall(Number(e.target.value))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Influencer - Appel client ($)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={influencerClient}
                    onChange={(e) => setInfluencerClient(Number(e.target.value))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Influencer - Recrutement ($)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={influencerRecruitment}
                    onChange={(e) => setInfluencerRecruitment(Number(e.target.value))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Blogger - Appel client ($)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={bloggerClient}
                    onChange={(e) => setBloggerClient(Number(e.target.value))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Affiliate (Generic) Rates */}
            <div className="border-t pt-4">
              <h3 className="font-semibold text-gray-800 mb-3">Programme Affiliation Generique (clients/avocats/expatries)</h3>
              <p className="text-xs text-gray-500 mb-3">
                Rates pour le programme d'affiliation integre aux comptes utilisateurs standards.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600">Bonus inscription ($)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={affiliateSignup}
                    onChange={(e) => setAffiliateSignup(Number(e.target.value))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Appel client - fixe ($)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={affiliateCallFixed}
                    onChange={(e) => setAffiliateCallFixed(Number(e.target.value))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Appel client - % (0-1, ex: 0.75 = 75%)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={affiliateCallRate}
                    onChange={(e) => setAffiliateCallRate(Number(e.target.value))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Bonus validation prestataire ($)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={affiliateProviderBonus}
                    onChange={(e) => setAffiliateProviderBonus(Number(e.target.value))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Enregistrement..." : plan ? "Mettre a jour" : "Creer le plan"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminCommissionPlans;
