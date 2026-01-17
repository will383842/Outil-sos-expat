/**
 * IaPricingTab - Gestion des plans et tarification IA
 */

import React, { useState, useEffect } from 'react';
import { useAdminTranslations, useIaAdminTranslations } from '../../../utils/adminTranslations';
import {
  Crown,
  Users,
  Sparkles,
  Zap,
  Infinity as InfinityIcon,
  ChevronDown,
  ChevronUp,
  Save,
  RefreshCw,
  Settings,
  DollarSign,
  Calendar,
  AlertTriangle,
  Globe
} from 'lucide-react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../../config/firebase';
import {
  SubscriptionPlan,
  SubscriptionTier,
  Currency,
  SupportedLanguage,
  MultilingualText,
  DEFAULT_ANNUAL_DISCOUNT_PERCENT,
  calculateAnnualPrice,
  calculateMonthlyEquivalent,
  calculateAnnualSavings,
  PlanPricing
} from '../../../types/subscription';

// Language labels for admin UI
const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
  de: 'Deutsch',
  pt: 'Português',
  ru: 'Русский',
  hi: 'हिंदी',
  ar: 'العربية',
  ch: '中文'
};

const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['fr', 'en', 'es', 'de', 'pt', 'ru', 'hi', 'ar', 'ch'];

import { cn } from '../../../utils/cn';

// ============================================================================
// PLAN EDITOR COMPONENT
// ============================================================================

interface PlanEditorProps {
  plan: SubscriptionPlan;
  onSave: (planId: string, updates: Partial<SubscriptionPlan>) => Promise<void>;
  isLoading: boolean;
  globalAnnualDiscount: number;
}

const PlanEditor: React.FC<PlanEditorProps> = ({ plan, onSave, isLoading, globalAnnualDiscount }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editedPricing, setEditedPricing] = useState(plan.pricing);
  const [editedAnnualPricing, setEditedAnnualPricing] = useState<PlanPricing | null>(plan.annualPricing || null);
  const [useCustomAnnualPrice, setUseCustomAnnualPrice] = useState(!!plan.annualPricing);
  const [editedCalls, setEditedCalls] = useState(plan.aiCallsLimit);
  const [editedName, setEditedName] = useState<MultilingualText>(plan.name);
  const [editedDescription, setEditedDescription] = useState<MultilingualText>(plan.description);
  const [showTranslations, setShowTranslations] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const discount = plan.annualDiscountPercent ?? globalAnnualDiscount;
  const calculatedAnnualEUR = calculateAnnualPrice(editedPricing.EUR, discount);
  const calculatedAnnualUSD = calculateAnnualPrice(editedPricing.USD, discount);
  const monthlyEquivEUR = calculateMonthlyEquivalent(useCustomAnnualPrice && editedAnnualPricing ? editedAnnualPricing.EUR : calculatedAnnualEUR);
  const monthlyEquivUSD = calculateMonthlyEquivalent(useCustomAnnualPrice && editedAnnualPricing ? editedAnnualPricing.USD : calculatedAnnualUSD);
  const savingsEUR = calculateAnnualSavings(editedPricing.EUR, discount);
  const savingsUSD = calculateAnnualSavings(editedPricing.USD, discount);

  const handlePriceChange = (currency: Currency, value: string) => {
    const numValue = parseFloat(value) || 0;
    setEditedPricing(prev => ({ ...prev, [currency]: numValue }));
    setHasChanges(true);
  };

  const handleAnnualPriceChange = (currency: Currency, value: string) => {
    const numValue = parseFloat(value) || 0;
    setEditedAnnualPricing(prev => ({ ...(prev || { EUR: 0, USD: 0 }), [currency]: numValue }));
    setHasChanges(true);
  };

  const handleCallsChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    setEditedCalls(numValue);
    setHasChanges(true);
  };

  const handleNameChange = (lang: SupportedLanguage, value: string) => {
    setEditedName(prev => ({ ...prev, [lang]: value }));
    setHasChanges(true);
  };

  const handleDescriptionChange = (lang: SupportedLanguage, value: string) => {
    setEditedDescription(prev => ({ ...prev, [lang]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    await onSave(plan.id, {
      pricing: editedPricing,
      annualPricing: useCustomAnnualPrice ? editedAnnualPricing || undefined : undefined,
      aiCallsLimit: editedCalls,
      name: editedName,
      description: editedDescription
    });
    setHasChanges(false);
  };

  const tierIcons: Record<SubscriptionTier, React.ReactNode> = {
    trial: <Sparkles className="w-4 h-4" />,
    basic: <Zap className="w-4 h-4" />,
    standard: <Zap className="w-4 h-4" />,
    pro: <Crown className="w-4 h-4" />,
    unlimited: <InfinityIcon className="w-4 h-4" />
  };

  const tierColors: Record<SubscriptionTier, string> = {
    trial: 'bg-gray-100 text-gray-600',
    basic: 'bg-blue-100 text-blue-600',
    standard: 'bg-indigo-100 text-indigo-600',
    pro: 'bg-purple-100 text-purple-600',
    unlimited: 'bg-amber-100 text-amber-600'
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', tierColors[plan.tier])}>
            {tierIcons[plan.tier]}
          </div>
          <div className="text-left">
            <div className="font-medium text-gray-900">{plan.name.fr}</div>
            <div className="text-sm text-gray-500">
              {plan.aiCallsLimit === -1 ? 'Illimité' : `${plan.aiCallsLimit} appels/mois`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="font-semibold text-gray-900">{plan.pricing.EUR}€/mois</div>
            <div className="text-sm text-green-600">{monthlyEquivEUR.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€/mois (annuel)</div>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="p-4 border-t border-gray-200 space-y-4">
          {/* Monthly Pricing */}
          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-2">Prix Mensuel</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  EUR (€)
                </label>
                <input
                  type="number"
                  value={editedPricing.EUR}
                  onChange={(e) => handlePriceChange('EUR', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  USD ($)
                </label>
                <input
                  type="number"
                  value={editedPricing.USD}
                  onChange={(e) => handlePriceChange('USD', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Annual Pricing Preview */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-green-800">Prix Annuel (-{discount}%)</h4>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={useCustomAnnualPrice}
                  onChange={(e) => {
                    setUseCustomAnnualPrice(e.target.checked);
                    if (e.target.checked && !editedAnnualPricing) {
                      setEditedAnnualPricing({ EUR: calculatedAnnualEUR, USD: calculatedAnnualUSD });
                    }
                    setHasChanges(true);
                  }}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-gray-600">Prix personnalisé</span>
              </label>
            </div>

            {useCustomAnnualPrice ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    EUR annuel (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editedAnnualPricing?.EUR || calculatedAnnualEUR}
                    onChange={(e) => handleAnnualPriceChange('EUR', e.target.value)}
                    className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    USD annuel ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editedAnnualPricing?.USD || calculatedAnnualUSD}
                    onChange={(e) => handleAnnualPriceChange('USD', e.target.value)}
                    className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-white rounded-lg p-3">
                  <div className="text-gray-500">EUR</div>
                  <div className="font-bold text-green-700">{calculatedAnnualEUR.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€/an</div>
                  <div className="text-xs text-gray-500">≈ {monthlyEquivEUR.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€/mois</div>
                  <div className="text-xs text-green-600">Économie: {savingsEUR.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€</div>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-gray-500">USD</div>
                  <div className="font-bold text-green-700">${calculatedAnnualUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/an</div>
                  <div className="text-xs text-gray-500">≈ ${monthlyEquivUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mois</div>
                  <div className="text-xs text-green-600">Économie: ${savingsUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
              </div>
            )}
          </div>

          {/* AI Calls */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre d'appels IA par mois (-1 = illimité)
            </label>
            <input
              type="number"
              value={editedCalls}
              onChange={(e) => handleCallsChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Multilingual Names & Descriptions */}
          <div className="border border-indigo-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowTranslations(!showTranslations)}
              className="w-full px-4 py-3 flex items-center justify-between bg-indigo-50 hover:bg-indigo-100 transition-colors"
            >
              <span className="font-medium text-indigo-800">
                Traductions (9 langues)
              </span>
              {showTranslations ? (
                <ChevronUp className="w-4 h-4 text-indigo-600" />
              ) : (
                <ChevronDown className="w-4 h-4 text-indigo-600" />
              )}
            </button>

            {showTranslations && (
              <div className="p-4 space-y-4 bg-white">
                {/* Name translations */}
                <div>
                  <h5 className="text-sm font-semibold text-gray-800 mb-2">Nom du plan</h5>
                  <div className="grid grid-cols-3 gap-3">
                    {SUPPORTED_LANGUAGES.map(lang => (
                      <div key={`name-${lang}`}>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {LANGUAGE_LABELS[lang]}
                        </label>
                        <input
                          type="text"
                          value={editedName[lang] || ''}
                          onChange={(e) => handleNameChange(lang, e.target.value)}
                          placeholder={editedName.fr || 'Nom...'}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Description translations */}
                <div>
                  <h5 className="text-sm font-semibold text-gray-800 mb-2">Description</h5>
                  <div className="grid grid-cols-3 gap-3">
                    {SUPPORTED_LANGUAGES.map(lang => (
                      <div key={`desc-${lang}`}>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {LANGUAGE_LABELS[lang]}
                        </label>
                        <textarea
                          value={editedDescription[lang] || ''}
                          onChange={(e) => handleDescriptionChange(lang, e.target.value)}
                          placeholder={editedDescription.fr || 'Description...'}
                          rows={2}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stripe Price IDs */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm font-medium text-gray-700 mb-2">Stripe Price IDs</div>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
              <div>
                <div className="font-medium">Mensuel</div>
                <div>EUR: {plan.stripePriceId?.EUR || 'Non configuré'}</div>
                <div>USD: {plan.stripePriceId?.USD || 'Non configuré'}</div>
              </div>
              <div>
                <div className="font-medium">Annuel</div>
                <div>EUR: {plan.stripePriceIdAnnual?.EUR || 'Non configuré'}</div>
                <div>USD: {plan.stripePriceIdAnnual?.USD || 'Non configuré'}</div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          {hasChanges && (
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="w-full py-2 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Enregistrer les modifications
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const IaPricingTab: React.FC = () => {
  const iaT = useIaAdminTranslations();

  const [lawyerPlans, setLawyerPlans] = useState<SubscriptionPlan[]>([]);
  const [expatPlans, setExpatPlans] = useState<SubscriptionPlan[]>([]);
  const [annualDiscountPercent, setAnnualDiscountPercent] = useState(DEFAULT_ANNUAL_DISCOUNT_PERCENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load settings
      const settingsDoc = await getDoc(doc(db, 'settings', 'subscription'));
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        if (data?.annualDiscountPercent !== undefined) {
          setAnnualDiscountPercent(data.annualDiscountPercent);
        }
      }

      // Load plans
      const plansSnapshot = await getDocs(
        query(
          collection(db, 'subscription_plans'),
          where('isActive', '==', true),
          orderBy('sortOrder', 'asc')
        )
      );

      const lawyers: SubscriptionPlan[] = [];
      const expats: SubscriptionPlan[] = [];

      plansSnapshot.docs.forEach(doc => {
        const plan = { id: doc.id, ...doc.data() } as SubscriptionPlan;
        if (plan.providerType === 'lawyer') {
          lawyers.push(plan);
        } else {
          expats.push(plan);
        }
      });

      setLawyerPlans(lawyers);
      setExpatPlans(expats);
    } catch (err) {
      console.error('Error loading data:', err);
      setError((err as Error).message || iaT.errorLoading);
    } finally {
      setLoading(false);
    }
  };

  const savePlanPricing = async (planId: string, updates: Partial<SubscriptionPlan>) => {
    setSaving(true);
    setError(null);

    try {
      const updatePlanFn = httpsCallable(functions, 'subscriptionUpdatePlanPricingV2');
      await updatePlanFn({
        planId,
        pricing: updates.pricing,
        annualPricing: updates.annualPricing,
        aiCallsLimit: updates.aiCallsLimit,
        name: updates.name,
        description: updates.description
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      await loadData();
    } catch (err) {
      console.error('Error saving plan:', err);
      setError((err as Error).message || iaT.errorSaving);
    } finally {
      setSaving(false);
    }
  };

  const initializePlans = async () => {
    setSaving(true);
    setError(null);

    try {
      const initFn = httpsCallable(functions, 'subscriptionInitializePlans');
      await initFn();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      await loadData();
    } catch (err) {
      console.error('Error initializing plans:', err);
      setError((err as Error).message || iaT.errorModification);
    } finally {
      setSaving(false);
    }
  };

  const createMonthlyPrices = async () => {
    setSaving(true);
    setError(null);

    try {
      const createMonthlyFn = httpsCallable(functions, 'createMonthlyStripePrices');
      await createMonthlyFn();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      await loadData();
    } catch (err) {
      console.error('Error creating monthly prices:', err);
      setError((err as Error).message || iaT.errorSaving);
    } finally {
      setSaving(false);
    }
  };

  const createAnnualPrices = async () => {
    setSaving(true);
    setError(null);

    try {
      const createAnnualFn = httpsCallable(functions, 'createAnnualStripePrices');
      await createAnnualFn();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      await loadData();
    } catch (err) {
      console.error('Error creating annual prices:', err);
      setError((err as Error).message || iaT.errorSaving);
    } finally {
      setSaving(false);
    }
  };

  const migrateTo9Languages = async () => {
    setSaving(true);
    setError(null);

    try {
      const migrateFn = httpsCallable(functions, 'subscriptionMigrateTo9Languages');
      await migrateFn({});
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      await loadData();
    } catch (err) {
      console.error('Error migrating to 9 languages:', err);
      setError((err as Error).message || iaT.errorModification);
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
      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}
      {saveSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
          Modifications enregistrées avec succès
        </div>
      )}

      {/* Initialize Plans if empty */}
      {lawyerPlans.length === 0 && expatPlans.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <p className="text-amber-700 mb-4">
            Aucun plan configuré. Cliquez pour initialiser les plans par défaut.
          </p>
          <button
            onClick={initializePlans}
            disabled={saving}
            className="py-2 px-4 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
            Initialiser les plans
          </button>
        </div>
      )}

      {/* Stripe Actions */}
      {(lawyerPlans.length > 0 || expatPlans.length > 0) && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6">
          <h3 className="text-indigo-800 font-medium mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Actions Stripe
          </h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={createMonthlyPrices}
              disabled={saving}
              className="py-2 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
              Créer prix mensuels Stripe
            </button>
            <button
              onClick={createAnnualPrices}
              disabled={saving}
              className="py-2 px-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
              Créer prix annuels Stripe (-{annualDiscountPercent}%)
            </button>
            <button
              onClick={migrateTo9Languages}
              disabled={saving}
              className="py-2 px-4 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
              Migrer vers 9 langues
            </button>
          </div>
        </div>
      )}

      {/* Lawyer Plans */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Crown className="w-4 h-4 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            Plans Avocats
          </h2>
        </div>

        <div className="space-y-3">
          {lawyerPlans.map(plan => (
            <PlanEditor
              key={plan.id}
              plan={plan}
              onSave={savePlanPricing}
              isLoading={saving}
              globalAnnualDiscount={annualDiscountPercent}
            />
          ))}
          {lawyerPlans.length === 0 && (
            <p className="text-gray-500 text-center py-4">
              Aucun plan configuré
            </p>
          )}
        </div>
      </div>

      {/* Expat Plans */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-green-100 rounded-lg">
            <Users className="w-4 h-4 text-green-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            Plans Expatriés Aidants
          </h2>
        </div>

        <div className="space-y-3">
          {expatPlans.map(plan => (
            <PlanEditor
              key={plan.id}
              plan={plan}
              onSave={savePlanPricing}
              isLoading={saving}
              globalAnnualDiscount={annualDiscountPercent}
            />
          ))}
          {expatPlans.length === 0 && (
            <p className="text-gray-500 text-center py-4">
              Aucun plan configuré
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default IaPricingTab;
