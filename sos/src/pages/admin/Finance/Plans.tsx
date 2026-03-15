/**
 * Subscription Plans Management Page
 * Admin page for managing IA subscription plans (pricing, limits, sync to Stripe)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  DollarSign,
  Users,
  Zap,
  Upload,
  AlertCircle,
  Loader2,
  Edit3,
  X,
  Check,
  Crown,
  Scale,
  Infinity,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  ArrowUpDown,
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
// TIER CONFIG
// ============================================================================

const TIER_CONFIG: Record<string, {
  gradient: string;
  bgLight: string;
  border: string;
  icon: string;
  ring: string;
  text: string;
  badge: string;
}> = {
  trial: {
    gradient: 'from-slate-500 to-slate-600',
    bgLight: 'bg-slate-50',
    border: 'border-slate-200',
    icon: 'text-slate-500',
    ring: 'ring-slate-400',
    text: 'text-slate-700',
    badge: 'bg-slate-100 text-slate-600',
  },
  basic: {
    gradient: 'from-blue-500 to-blue-600',
    bgLight: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'text-blue-500',
    ring: 'ring-blue-400',
    text: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-600',
  },
  standard: {
    gradient: 'from-violet-500 to-violet-600',
    bgLight: 'bg-violet-50',
    border: 'border-violet-200',
    icon: 'text-violet-500',
    ring: 'ring-violet-400',
    text: 'text-violet-700',
    badge: 'bg-violet-100 text-violet-600',
  },
  pro: {
    gradient: 'from-amber-500 to-orange-500',
    bgLight: 'bg-amber-50',
    border: 'border-amber-200',
    icon: 'text-amber-500',
    ring: 'ring-amber-400',
    text: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-600',
  },
  unlimited: {
    gradient: 'from-emerald-500 to-teal-500',
    bgLight: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: 'text-emerald-500',
    ring: 'ring-emerald-400',
    text: 'text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-600',
  },
};

const DEFAULT_TIER_CONFIG = TIER_CONFIG.basic;

const TIER_LABELS: Record<string, string> = {
  trial: 'Essai',
  basic: 'Basic',
  standard: 'Standard',
  pro: 'Pro',
  unlimited: 'Unlimited',
};

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
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [savingPlan, setSavingPlan] = useState<string | null>(null);

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

      const tierOrder: Record<string, number> = { trial: 0, basic: 1, standard: 2, pro: 3, unlimited: 4 };
      fetchedPlans.sort((a, b) => (tierOrder[a.tier] ?? 99) - (tierOrder[b.tier] ?? 99));

      setPlans(fetchedPlans);

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
    setExpandedPlan(plan.id);
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
      setSavingPlan(planId);
      const planRef = doc(db, 'subscription_plans', planId);

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
    } finally {
      setSavingPlan(null);
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

  const filteredPlans = useMemo(
    () => plans.filter((p) => p.providerType === activeTab),
    [plans, activeTab]
  );

  const totalSubscribers = useMemo(
    () => filteredPlans.reduce((sum, p) => sum + (planStats[p.id] ?? 0), 0),
    [filteredPlans, planStats]
  );

  const activePlansCount = useMemo(
    () => filteredPlans.filter((p) => p.isActive).length,
    [filteredPlans]
  );

  const syncedCount = useMemo(
    () => filteredPlans.filter((p) => p.stripePriceId?.EUR).length,
    [filteredPlans]
  );

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

  const getTierConfig = (tier: string) => TIER_CONFIG[tier] || DEFAULT_TIER_CONFIG;

  // ========================================
  // RENDER
  // ========================================

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* ====== HEADER ====== */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-200">
                <Crown className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  <FormattedMessage id="admin.plans.title" />
                </h1>
                <p className="text-sm text-gray-500">
                  <FormattedMessage id="admin.plans.subtitle" />
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchPlans}
                disabled={loading}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Rafraichir</span>
              </button>
              <button
                onClick={syncToStripe}
                disabled={syncing}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md shadow-indigo-200 disabled:opacity-50"
              >
                {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Sync Stripe
              </button>
            </div>
          </div>

          {/* ====== TABS ====== */}
          <div className="mt-6 flex gap-2">
            {(['lawyer', 'expat_aidant'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setEditingPlan(null); setEditForm({}); }}
                className={`relative px-5 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                  activeTab === tab
                    ? 'bg-gray-900 text-white shadow-md'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                }`}
              >
                {tab === 'lawyer' ? (
                  <span className="flex items-center gap-2">
                    <Scale className="h-4 w-4" />
                    Avocats
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Expatries Aidants
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ====== STATS CARDS ====== */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalSubscribers}</p>
              <p className="text-xs text-gray-500 font-medium">Abonnes actifs</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-50">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {activePlansCount}<span className="text-base font-normal text-gray-400">/{filteredPlans.length}</span>
              </p>
              <p className="text-xs text-gray-500 font-medium">Plans actifs</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-50">
              <ArrowUpDown className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {syncedCount}<span className="text-base font-normal text-gray-400">/{filteredPlans.length}</span>
              </p>
              <p className="text-xs text-gray-500 font-medium">Syncs Stripe</p>
            </div>
          </div>
        </div>

        {/* ====== PLANS LIST ====== */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-400 mb-3" />
            <p className="text-sm text-gray-400">Chargement des plans...</p>
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 text-center py-20">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium"><FormattedMessage id="admin.plans.noPlans" /></p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredPlans.map((plan) => {
              const isEditing = editingPlan === plan.id;
              const isExpanded = expandedPlan === plan.id;
              const subscriberCount = planStats[plan.id] ?? 0;
              const cfg = getTierConfig(plan.tier);
              const isSaving = savingPlan === plan.id;
              const isSynced = !!plan.stripePriceId?.EUR;

              return (
                <div
                  key={plan.id}
                  className={`group relative bg-white rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
                    plan.isActive ? cfg.border : 'border-gray-200 opacity-70'
                  } ${isEditing ? `ring-2 ${cfg.ring} ring-offset-2` : 'hover:shadow-lg hover:-translate-y-0.5'}`}
                >
                  {/* Colored top bar */}
                  <div className={`h-1.5 bg-gradient-to-r ${cfg.gradient}`} />

                  <div className="p-5">
                    {/* Plan header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${cfg.bgLight}`}>
                          {plan.tier === 'unlimited' ? (
                            <Infinity className={`h-5 w-5 ${cfg.icon}`} />
                          ) : plan.tier === 'pro' ? (
                            <Crown className={`h-5 w-5 ${cfg.icon}`} />
                          ) : (
                            <Zap className={`h-5 w-5 ${cfg.icon}`} />
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-gray-900">
                            {TIER_LABELS[plan.tier] || plan.tier}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                              plan.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {plan.isActive ? (
                                <><CheckCircle2 className="h-3 w-3" /> Actif</>
                              ) : (
                                <><XCircle className="h-3 w-3" /> Inactif</>
                              )}
                            </span>
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                              isSynced ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-600'
                            }`}>
                              {isSynced ? 'Stripe OK' : 'Non sync'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Toggle active */}
                      <button
                        onClick={() => togglePlanActive(plan)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          plan.isActive ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                        title={plan.isActive ? 'Desactiver' : 'Activer'}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                            plan.isActive ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Pricing display */}
                    <div className={`rounded-xl p-4 mb-4 ${cfg.bgLight}`}>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-3xl font-extrabold ${cfg.text}`}>
                          {formatPrice(plan.pricing.EUR, 'EUR')}
                        </span>
                        <span className="text-sm text-gray-400 font-medium">/mois</span>
                      </div>
                      <div className="text-sm text-gray-500 mt-0.5">
                        {formatPrice(plan.pricing.USD, 'USD')}/mois
                      </div>
                      {plan.pricingAnnual && (
                        <div className="mt-2 pt-2 border-t border-gray-200/60">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-700">
                              {formatPrice(plan.pricingAnnual.EUR, 'EUR')}/an
                            </span>
                            <span className="inline-flex items-center text-xs font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                              -{plan.annualDiscountPercent ?? 20}%
                            </span>
                          </div>
                          <div className="text-xs text-gray-400">
                            {formatPrice(plan.pricingAnnual.USD, 'USD')}/an
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Quick stats row */}
                    <div className="flex items-center justify-between text-sm mb-3">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Zap className="h-4 w-4 text-yellow-500" />
                        <span className="font-medium">
                          {plan.aiCallsLimit === -1
                            ? intl.formatMessage({ id: 'admin.plans.unlimited' })
                            : `${plan.aiCallsLimit} appels IA/mois`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <Users className="h-3.5 w-3.5" />
                        <span className="font-semibold text-gray-700">{subscriberCount}</span>
                        <span className="text-xs">abonnes</span>
                      </div>
                    </div>

                    {/* Expand/Collapse for details */}
                    {!isEditing && (
                      <button
                        onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
                        className="w-full flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-gray-600 py-1.5 transition-colors"
                      >
                        {isExpanded ? (
                          <><ChevronUp className="h-3.5 w-3.5" /> Moins de details</>
                        ) : (
                          <><ChevronDown className="h-3.5 w-3.5" /> Plus de details</>
                        )}
                      </button>
                    )}

                    {/* Expanded details */}
                    {isExpanded && !isEditing && (
                      <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 text-sm">
                        {plan.features && plan.features.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Fonctionnalites</p>
                            <ul className="space-y-1">
                              {plan.features.map((f, i) => (
                                <li key={i} className="flex items-center gap-2 text-gray-600">
                                  <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                                  {f}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span>Stripe Price ID:</span>
                          <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-mono">
                            {plan.stripePriceId?.EUR || 'non configure'}
                          </code>
                        </div>
                      </div>
                    )}

                    {/* ====== EDIT FORM ====== */}
                    {isEditing && (
                      <div className="mt-3 pt-4 border-t border-gray-200 space-y-4">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Edit3 className="h-3 w-3" />
                          Modification du plan
                        </p>

                        {/* Pricing fields */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">
                              Prix EUR <span className="text-gray-400 font-normal">(cents/mois)</span>
                            </label>
                            <div className="relative">
                              <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
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
                                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">
                              Prix USD <span className="text-gray-400 font-normal">(cents/mois)</span>
                            </label>
                            <div className="relative">
                              <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
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
                                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">
                              Remise annuelle <span className="text-gray-400 font-normal">(%)</span>
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
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">
                              Appels IA/mois
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
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                            />
                            <p className="text-[10px] text-gray-400 mt-1">-1 = illimite</p>
                          </div>
                        </div>

                        {/* Annual pricing preview */}
                        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-3 space-y-1">
                          <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
                            <Eye className="h-3 w-3" />
                            Apercu prix annuel calcule
                          </p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="font-semibold text-gray-700">
                              {formatPrice(calcAnnualPreview(editForm.pricing?.EUR ?? 0, editForm.annualDiscountPercent ?? 20), 'EUR')}/an
                            </span>
                            <span className="text-gray-400">|</span>
                            <span className="font-semibold text-gray-700">
                              {formatPrice(calcAnnualPreview(editForm.pricing?.USD ?? 0, editForm.annualDiscountPercent ?? 20), 'USD')}/an
                            </span>
                          </div>
                        </div>

                        {/* Edit actions */}
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => saveEditing(plan.id)}
                            disabled={isSaving}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 shadow-md shadow-green-100 transition-all disabled:opacity-50"
                          >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            Enregistrer
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                          >
                            <X className="h-4 w-4" />
                            Annuler
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Edit button (when not editing) */}
                    {!isEditing && (
                      <button
                        onClick={() => startEditing(plan)}
                        className={`mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border-2 transition-all ${
                          cfg.border
                        } ${cfg.text} hover:${cfg.bgLight} hover:shadow-sm`}
                      >
                        <Edit3 className="h-4 w-4" />
                        Modifier le plan
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ====== COMPARISON TABLE ====== */}
        {!loading && filteredPlans.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-gray-400" />
              <h2 className="font-bold text-gray-900">Comparaison des plans</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">EUR/mois</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">USD/mois</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">EUR/an</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Appels IA</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Abonnes</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Stripe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPlans.map((plan) => {
                    const cfg = getTierConfig(plan.tier);
                    const isSynced = !!plan.stripePriceId?.EUR;
                    return (
                      <tr key={plan.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${cfg.gradient}`} />
                            <span className="font-semibold text-gray-900">{TIER_LABELS[plan.tier] || plan.tier}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {plan.isActive ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700">
                              <Eye className="h-3 w-3" /> Visible
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400">
                              <EyeOff className="h-3 w-3" /> Cache
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-700">
                          {formatPrice(plan.pricing.EUR, 'EUR')}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-700">
                          {formatPrice(plan.pricing.USD, 'USD')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {plan.pricingAnnual ? (
                            <div>
                              <span className="font-semibold text-gray-700">{formatPrice(plan.pricingAnnual.EUR, 'EUR')}</span>
                              <span className="ml-1 text-xs text-green-600 font-bold">-{plan.annualDiscountPercent ?? 20}%</span>
                            </div>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {plan.aiCallsLimit === -1 ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600">
                              <Infinity className="h-3 w-3" /> Illimite
                            </span>
                          ) : (
                            <span className="font-semibold text-gray-700">{plan.aiCallsLimit}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-bold text-gray-900">{planStats[plan.id] ?? 0}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isSynced ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-orange-400 mx-auto" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPlans;
