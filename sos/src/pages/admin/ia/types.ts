/**
 * Types partagés pour l'Outil IA Admin
 */

import { SubscriptionTier, SubscriptionStatus, Currency, BillingPeriod } from '../../../types/subscription';

// ============================================================================
// STATS
// ============================================================================

export interface SubscriptionStats {
  totalProviders: number;
  activeSubscriptions: number;
  trialUsers: number;
  paidUsers: number;
  mrr: number;
  mrrEur: number;
  mrrUsd: number;
  churnRate: number;
  trialConversionRate: number;
  byTier: Record<SubscriptionTier, number>;
}

// ============================================================================
// DASHBOARD CHART DATA
// ============================================================================

export interface DailySubscriberData {
  date: string;
  total: number;
  active: number;
  trial: number;
  canceled: number;
}

export interface PlanDistributionData {
  name: string;
  value: number;
  color: string;
}

export interface UsageByPlanData {
  plan: string;
  avgUsage: number;
  maxUsage: number;
  minUsage: number;
}

// ============================================================================
// SUBSCRIPTIONS LIST
// ============================================================================

export interface SubscriptionListItem {
  id: string;
  providerId: string;
  providerName: string;
  providerEmail: string;
  providerType: 'lawyer' | 'expat_aidant';
  planId: string;
  planName: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  billingPeriod: BillingPeriod;
  currency: Currency;
  amount: number;
  startDate: Date;
  endDate: Date;
  canceledAt?: Date;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
}

export type SubscriptionFilter = {
  status: SubscriptionStatus | 'all';
  tier: SubscriptionTier | 'all';
  billingPeriod: BillingPeriod | 'all';
  dateRange: 'all' | '7d' | '30d' | '90d' | '1y';
  search: string;
};

// ============================================================================
// QUOTA RESET HISTORY
// ============================================================================

export interface QuotaResetLog {
  id: string;
  providerId: string;
  providerName: string;
  resetBy: string;
  resetByName: string;
  previousUsage: number;
  quotaLimit: number;
  reason?: string;
  createdAt: Date;
}

// ============================================================================
// PRICING HISTORY
// ============================================================================

export interface PricingChangeLog {
  id: string;
  planId: string;
  planName: string;
  changedBy: string;
  changedByName: string;
  previousPricing: { EUR: number; USD: number };
  newPricing: { EUR: number; USD: number };
  previousAiCalls?: number;
  newAiCalls?: number;
  createdAt: Date;
}

// ============================================================================
// TRIAL PROVIDERS
// ============================================================================

export interface TrialProvider {
  id: string;
  email: string;
  displayName: string;
  providerType: 'lawyer' | 'expat_aidant';
  trialStartedAt: Date;
  trialEndsAt: Date;
  daysRemaining: number;
  aiCallsUsed: number;
  maxAiCalls: number;
  lastActivityAt?: Date;
}

// ============================================================================
// AI USAGE LOGS
// ============================================================================

export interface AiUsageLog {
  id: string;
  userId: string;
  prestataireId: string;
  provider: 'claude' | 'gpt4o' | 'perplexity';
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  feature: string;
  success: boolean;
  errorMessage?: string;
  responseTimeMs: number;
  createdAt: Date;
}

// ============================================================================
// PROVIDER ACCESS (Nouveau)
// ============================================================================

export type IAAccessStatus = 'subscription' | 'trial' | 'forced' | 'none';

export interface ProviderIAAccess {
  id: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  role: 'lawyer' | 'expat_aidant';

  // Accès IA
  accessStatus: IAAccessStatus;
  forcedAIAccess: boolean;
  freeTrialUntil?: Date | null;
  subscriptionStatus?: string;
  subscriptionTier?: SubscriptionTier;

  // Quotas
  aiCallsUsed: number;
  aiCallsLimit: number;
  aiQuotaResetAt?: Date;

  // Metadata
  createdAt: Date;
  lastLoginAt?: Date;
}

// ============================================================================
// MULTI-PROVIDERS (Nouveau)
// ============================================================================

export interface MultiProviderAccount {
  userId: string;
  email: string;
  displayName: string;
  linkedProviderIds: string[];
  activeProviderId?: string;
  providersCount: number;
  providers: {
    id: string;
    name: string;
    type: 'lawyer' | 'expat';
    isActive: boolean;
  }[];
  createdAt: Date;
}

// ============================================================================
// ONGLETS
// ============================================================================

export type IaTabId =
  | 'dashboard'
  | 'access'
  | 'quotas'
  | 'subscriptions'
  | 'multi-providers'
  | 'pricing'
  | 'trial-config'
  | 'logs';

export interface IaTab {
  id: IaTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}
