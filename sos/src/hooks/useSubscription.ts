/**
 * useSubscription Hook
 * Gestion de l'abonnement du prestataire
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/useAuth';
import {
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
  ProviderType,
  Currency,
  CreateSubscriptionRequest,
  CreateSubscriptionResponse
} from '../types/subscription';
import {
  getSubscription,
  subscribeToSubscription,
  getSubscriptionPlans,
  subscribeToPlans,
  createSubscription,
  updateSubscription,
  cancelSubscription,
  reactivateSubscription,
  openCustomerPortal,
  startTrial
} from '../services/subscription/subscriptionService';

interface UseSubscriptionReturn {
  // State
  subscription: Subscription | null;
  plans: SubscriptionPlan[];
  loading: boolean;
  error: string | null;

  // Status helpers
  isTrialing: boolean;
  isActive: boolean;
  isPastDue: boolean;
  isCanceled: boolean;
  canAccessAi: boolean;

  // Actions
  loadSubscription: () => Promise<void>;
  loadPlans: (providerType: ProviderType) => Promise<void>;
  subscribe: (request: CreateSubscriptionRequest) => Promise<CreateSubscriptionResponse>;
  upgrade: (newPlanId: string) => Promise<{ success: boolean; error?: string }>;
  downgrade: (newPlanId: string) => Promise<{ success: boolean; error?: string }>;
  cancel: (immediate?: boolean, reason?: string) => Promise<{ success: boolean; error?: string }>;
  reactivate: () => Promise<{ success: boolean; error?: string }>;
  openBillingPortal: () => Promise<void>;
  initializeTrial: (providerType: ProviderType) => Promise<Subscription>;

  // Utils
  getPlanForTier: (tier: string) => SubscriptionPlan | undefined;
  formatPrice: (plan: SubscriptionPlan, currency: Currency) => string;
}

export function useSubscription(): UseSubscriptionReturn {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load subscription on mount and subscribe to changes
  useEffect(() => {
    if (!user?.uid) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Subscribe to real-time updates
    const unsubscribe = subscribeToSubscription(user.uid, (sub) => {
      setSubscription(sub);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Load plans when provider type is known
  useEffect(() => {
    if (!user?.role) return;

    const providerType: ProviderType = user.role === 'lawyer' ? 'lawyer' : 'expat_aidant';

    const unsubscribe = subscribeToPlans(providerType, (loadedPlans) => {
      setPlans(loadedPlans);
    });

    return () => unsubscribe();
  }, [user?.role]);

  // Status helpers
  const isTrialing = subscription?.status === 'trialing';
  const isActive = subscription?.status === 'active';
  const isPastDue = subscription?.status === 'past_due';
  const isCanceled = subscription?.status === 'canceled' || subscription?.cancelAtPeriodEnd === true;
  const canAccessAi = isTrialing || isActive;

  // Load subscription manually
  const loadSubscription = useCallback(async () => {
    if (!user?.uid) return;

    setLoading(true);
    setError(null);

    try {
      const sub = await getSubscription(user.uid);
      setSubscription(sub);
    } catch (err: any) {
      setError(err.message || 'Failed to load subscription');
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  // Load plans manually
  const loadPlans = useCallback(async (providerType: ProviderType) => {
    setLoading(true);
    setError(null);

    try {
      const loadedPlans = await getSubscriptionPlans(providerType);
      setPlans(loadedPlans);
    } catch (err: any) {
      setError(err.message || 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  }, []);

  // Subscribe to a plan
  const subscribe = useCallback(async (request: CreateSubscriptionRequest): Promise<CreateSubscriptionResponse> => {
    setLoading(true);
    setError(null);

    try {
      const result = await createSubscription(request);

      if (!result.success && result.error) {
        setError(result.error);
      }

      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create subscription';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // Upgrade subscription
  const upgrade = useCallback(async (newPlanId: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await updateSubscription(newPlanId);

      if (!result.success && result.error) {
        setError(result.error);
      }

      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to upgrade subscription';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // Downgrade subscription (same as upgrade, just different plan)
  const downgrade = upgrade;

  // Cancel subscription
  const cancel = useCallback(async (immediate: boolean = false, reason?: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await cancelSubscription(!immediate, reason);

      if (!result.success && result.error) {
        setError(result.error);
      }

      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to cancel subscription';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // Reactivate canceled subscription
  const reactivate = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await reactivateSubscription();

      if (!result.success && result.error) {
        setError(result.error);
      }

      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to reactivate subscription';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // Open Stripe billing portal
  const openBillingPortal = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { url } = await openCustomerPortal();
      window.location.href = url;
    } catch (err: any) {
      setError(err.message || 'Failed to open billing portal');
      setLoading(false);
    }
  }, []);

  // Initialize trial period
  const initializeTrial = useCallback(async (providerType: ProviderType) => {
    if (!user?.uid) {
      throw new Error('User must be authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      const newSubscription = await startTrial(user.uid, providerType);
      setSubscription(newSubscription);
      return newSubscription;
    } catch (err: any) {
      setError(err.message || 'Failed to start trial');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  // Get plan by tier
  const getPlanForTier = useCallback((tier: string) => {
    return plans.find((p) => p.tier === tier);
  }, [plans]);

  // Format price for display
  const formatPrice = useCallback((plan: SubscriptionPlan, currency: Currency) => {
    const price = plan.pricing[currency];
    const symbol = currency === 'EUR' ? '€' : '$';

    return `${price}${symbol}`;
  }, []);

  return {
    // State
    subscription,
    plans,
    loading,
    error,

    // Status helpers
    isTrialing,
    isActive,
    isPastDue,
    isCanceled,
    canAccessAi,

    // Actions
    loadSubscription,
    loadPlans,
    subscribe,
    upgrade,
    downgrade,
    cancel,
    reactivate,
    openBillingPortal,
    initializeTrial,

    // Utils
    getPlanForTier,
    formatPrice
  };
}

export default useSubscription;
