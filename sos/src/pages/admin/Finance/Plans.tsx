/**
 * Subscription Plans Management Page
 * Admin page for managing IA subscription plans (pricing, limits, sync to Stripe)
 */

import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useIntl, FormattedMessage } from 'react-intl';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  getCountFromServer,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../../config/firebase';
import AdminLayout from '../../../components/admin/AdminLayout';
import {
  RefreshCw,
  Save,
  DollarSign,
  Users,
  Zap,
  ToggleLeft,
  ToggleRight,
  Upload,
  AlertCircle,
  Loader2,
  Edit3,
  X,
  Check,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface SubscriptionPlan {
  id: string;
  tier: string;
  providerType: 'lawyer' | 'expat_aidant';
  pricing: { EUR: number; USD: number };
  pricingAnnual?: { EUR: number; USD: number };
  annualDiscountPercent?: number;
  aiCallsLimit: number;
  isActive: boolean;
  stripePriceId?: { EUR?: string; USD?: string };
  stripePriceIdAnnual?: { EUR?: string; USD?: string };
  features?: string[];
  updatedAt?: unknown;
}

interface PlanStats {
  [planId: string]: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

const AdminPlans: React.FC = () => {
  const intl = useIntl();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [planStats, setPlanStats] = useState<PlanStats>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<SubscriptionPlan>>({});
  const [activeTab, setActiveTab] = useState<'lawyer' | 'expat_aidant'>('lawyer');

  // ========================================
  // DATA FETCHING
  // ========================================

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'subscription_plans'));
      const fetchedPlans: SubscriptionPlan[] = [];
      snapshot.forEach((docSnap) => {
        fetchedPlans.push({ id: docSnap.id, ...docSnap.data() } as SubscriptionPlan);
      });

      // Sort by tier order
      const tierOrder: Record<string, number> = { trial: 0, basic: 1, standard: 2, pro: 3, unlimited: 4 };
      fetchedPlans.sort((a, b) => (tierOrder[a.tier] ?? 99) - (tierOrder[b.tier] ?? 99));

      setPlans(fetchedPlans);

      // Fetch active subscriber counts per plan
      const stats: PlanStats = {};
      await Promise.all(
        fetchedPlans.map(async (plan) => {
          try {
            const q = query(
              collection(db, 'subscriptions'),
              where('planId', '==', plan.id),
              where('status', '==', 'active')
            );
            const countSnap = await getCountFromServer(q);
            stats[plan.id] = countSnap.data().count;
          } catch {
            stats[plan.id] = 0;
          }
        })
      );
      setPlanStats(stats);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error(intl.formatMessage({ id: 'admin.plans.errorLoading' }));
    } finally {
      setLoading(false);
    }
  }, [intl]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // ========================================
  // ACTIONS
  // ========================================

  const startEditing = (plan: SubscriptionPlan) => {
    setEditingPlan(plan.id);
    setEditForm({
      pricing: { ...plan.pricing },
      pricingAnnual: plan.pricingAnnual ? { ...plan.pricingAnnual } : undefined,
      annualDiscountPercent: plan.annualDiscountPercent ?? 20,
      aiCallsLimit: plan.aiCallsLimit,
    });
  };

  const cancelEditing = () => {
    setEditingPlan(null);
    setEditForm({});
  };

  const saveEditing = async (planId: string) => {
    try {
      const planRef = doc(db, 'subscription_plans', planId);

      // Validate inputs
      const discount = editForm.annualDiscountPercent ?? 20;
      const monthlyEUR = editForm.pricing?.EUR ?? 0;
      const monthlyUSD = editForm.pricing?.USD ?? 0;

      if (monthlyEUR < 0 || monthlyUSD < 0) {
        toast.error(intl.formatMessage({ id: 'admin.plans.errorSaving' }));
        return;
      }
      if (discount < 0 || discount > 100) {
        toast.error(intl.formatMessage({ id: 'admin.plans.errorSaving' }));
        return;
      }

      // Calculate annual pricing from discount
      const annualEUR = Math.round(monthlyEUR * 12 * (1 - discount / 100));
      const annualUSD = Math.round(monthlyUSD * 12 * (1 - discount / 100));

      await updateDoc(planRef, {
        'pricing.EUR': monthlyEUR,
        'pricing.USD': monthlyUSD,
        'pricingAnnual.EUR': annualEUR,
        'pricingAnnual.USD': annualUSD,
        annualDiscountPercent: discount,
        aiCallsLimit: editForm.aiCallsLimit ?? 0,
        updatedAt: new Date(),
      });

      toast.success(intl.formatMessage({ id: 'admin.plans.saved' }));
      setEditingPlan(null);
      setEditForm({});
      fetchPlans();
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error(intl.formatMessage({ id: 'admin.plans.errorSaving' }));
    }
  };

  const togglePlanActive = async (plan: SubscriptionPlan) => {
    try {
      const planRef = doc(db, 'subscription_plans', plan.id);
      await updateDoc(planRef, {
        isActive: !plan.isActive,
        updatedAt: new Date(),
      });
      toast.success(
        plan.isActive
          ? intl.formatMessage({ id: 'admin.plans.deactivated' })
          : intl.formatMessage({ id: 'admin.plans.activated' })
      );
      fetchPlans();
    } catch (error) {
      console.error('Error toggling plan:', error);
      toast.error(intl.formatMessage({ id: 'admin.plans.errorToggle' }));
    }
  };

  const syncToStripe = async () => {
    setSyncing(true);
    try {
      const fn = httpsCallable(functions, 'syncSubscriptionPlansToStripe');
      await fn({});
      toast.success(intl.formatMessage({ id: 'admin.plans.syncSuccess' }));
      fetchPlans();
    } catch (error) {
      console.error('Error syncing to Stripe:', error);
      toast.error(intl.formatMessage({ id: 'admin.plans.syncError' }));
    } finally {
      setSyncing(false);
    }
  };

  // ========================================
  // HELPERS
  // ========================================

  const filteredPlans = plans.filter((p) => p.providerType === activeTab);

  const formatPrice = (cents: number, currency: string) => {
    return new Intl.NumberFormat(intl.locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  const calcAnnualPreview = (monthlyCents: number, discount: number) => {
    return Math.round(monthlyCents * 12 * (1 - discount / 100));
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              <FormattedMessage id="admin.plans.title" />
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              <FormattedMessage id="admin.plans.subtitle" />
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchPlans}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <FormattedMessage id="admin.plans.refresh" />
            </button>
            <button
              onClick={syncToStripe}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              <FormattedMessage id="admin.plans.syncStripe" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          {(['lawyer', 'expat_aidant'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FormattedMessage id={`admin.plans.tab.${tab}`} />
            </button>
          ))}
        </div>

        {/* Plans Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p><FormattedMessage id="admin.plans.noPlans" /></p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {filteredPlans.map((plan) => {
              const isEditing = editingPlan === plan.id;
              const subscriberCount = planStats[plan.id] ?? 0;

              return (
                <div
                  key={plan.id}
                  className={`bg-white rounded-xl border-2 p-5 transition-all ${
                    plan.isActive ? 'border-gray-200' : 'border-dashed border-gray-300 opacity-60'
                  } ${isEditing ? 'ring-2 ring-indigo-500' : ''}`}
                >
                  {/* Plan Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg capitalize">{plan.tier}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        plan.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {plan.isActive
                          ? intl.formatMessage({ id: 'admin.plans.active' })
                          : intl.formatMessage({ id: 'admin.plans.inactive' })}
                      </span>
                    </div>
                    <button
                      onClick={() => togglePlanActive(plan)}
                      className="text-gray-400 hover:text-gray-600"
                      title={plan.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {plan.isActive ? (
                        <ToggleRight className="h-6 w-6 text-green-500" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                    <Users className="h-4 w-4" />
                    <span>{subscriberCount} <FormattedMessage id="admin.plans.activeSubscribers" /></span>
                  </div>

                  {/* Pricing */}
                  {isEditing ? (
                    <div className="space-y-3 mb-4">
                      <div>
                        <label className="text-xs text-gray-500 font-medium">EUR (cents/mois)</label>
                        <input
                          type="number"
                          min="0"
                          value={editForm.pricing?.EUR ?? 0}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              pricing: { ...prev.pricing!, EUR: Math.max(0, Number(e.target.value)) },
                            }))
                          }
                          className="w-full mt-1 px-2 py-1.5 text-sm border rounded-md"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 font-medium">USD (cents/mois)</label>
                        <input
                          type="number"
                          min="0"
                          value={editForm.pricing?.USD ?? 0}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              pricing: { ...prev.pricing!, USD: Math.max(0, Number(e.target.value)) },
                            }))
                          }
                          className="w-full mt-1 px-2 py-1.5 text-sm border rounded-md"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 font-medium">
                          <FormattedMessage id="admin.plans.annualDiscount" /> (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={editForm.annualDiscountPercent ?? 20}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              annualDiscountPercent: Number(e.target.value),
                            }))
                          }
                          className="w-full mt-1 px-2 py-1.5 text-sm border rounded-md"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 font-medium">
                          <FormattedMessage id="admin.plans.aiCallsLimit" />
                        </label>
                        <input
                          type="number"
                          min="-1"
                          value={editForm.aiCallsLimit ?? 0}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              aiCallsLimit: Number(e.target.value),
                            }))
                          }
                          className="w-full mt-1 px-2 py-1.5 text-sm border rounded-md"
                        />
                        <p className="text-xs text-gray-400 mt-0.5">-1 = illimite</p>
                      </div>

                      {/* Annual Preview */}
                      <div className="bg-gray-50 rounded-md p-2 text-xs text-gray-600">
                        <p className="font-medium mb-1"><FormattedMessage id="admin.plans.annualPreview" /></p>
                        <p>EUR: {formatPrice(calcAnnualPreview(editForm.pricing?.EUR ?? 0, editForm.annualDiscountPercent ?? 20), 'EUR')}/an</p>
                        <p>USD: {formatPrice(calcAnnualPreview(editForm.pricing?.USD ?? 0, editForm.annualDiscountPercent ?? 20), 'USD')}/an</p>
                      </div>

                      {/* Edit Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEditing(plan.id)}
                          className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <FormattedMessage id="admin.plans.save" />
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          <X className="h-3.5 w-3.5" />
                          <FormattedMessage id="admin.plans.cancel" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">
                          {formatPrice(plan.pricing.EUR, 'EUR')} / {formatPrice(plan.pricing.USD, 'USD')}
                          <span className="text-gray-400 text-xs"> /mois</span>
                        </span>
                      </div>
                      {plan.pricingAnnual && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-gray-300" />
                          <span className="text-xs text-gray-500">
                            {formatPrice(plan.pricingAnnual.EUR, 'EUR')} / {formatPrice(plan.pricingAnnual.USD, 'USD')}
                            <span className="text-gray-400"> /an (-{plan.annualDiscountPercent ?? 20}%)</span>
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">
                          {plan.aiCallsLimit === -1
                            ? intl.formatMessage({ id: 'admin.plans.unlimited' })
                            : `${plan.aiCallsLimit} ${intl.formatMessage({ id: 'admin.plans.callsPerMonth' })}`}
                        </span>
                      </div>

                      {/* Edit Button */}
                      <button
                        onClick={() => startEditing(plan)}
                        className="mt-2 w-full inline-flex items-center justify-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <FormattedMessage id="admin.plans.edit" />
                      </button>
                    </div>
                  )}

                  {/* Stripe Status */}
                  <div className="border-t pt-3">
                    <p className="text-xs text-gray-400">
                      Stripe: {plan.stripePriceId?.EUR ? (
                        <span className="text-green-600"><Save className="inline h-3 w-3" /> Synced</span>
                      ) : (
                        <span className="text-orange-500"><AlertCircle className="inline h-3 w-3" /> Not synced</span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPlans;
