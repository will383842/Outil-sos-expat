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
  /** Si true, tous les prestataires liés passent en "busy" quand l'un d'eux est en appel */
  shareBusyStatus?: boolean;
}

// ============================================================================
// SUBSCRIPTION EVENTS & ALERTS
// ============================================================================

export type SubscriptionEventType =
  | 'subscription.created'
  | 'subscription.activated'
  | 'subscription.upgraded'
  | 'subscription.downgraded'
  | 'subscription.canceled'
  | 'subscription.expired'
  | 'subscription.reactivated'
  | 'subscription.paused'
  | 'subscription.resumed'
  | 'trial.started'
  | 'trial.ending_soon'
  | 'trial.converted'
  | 'trial.expired'
  | 'payment.succeeded'
  | 'payment.failed'
  | 'payment.action_required'
  | 'payment.refunded'
  | 'quota.warning_80'
  | 'quota.exceeded'
  | 'quota.reset'
  | 'churn.risk_detected'
  | 'mrr.significant_change';

export type AlertSeverity = 'info' | 'warning' | 'error' | 'success';

export interface SubscriptionEvent {
  id: string;
  eventType: SubscriptionEventType;
  severity: AlertSeverity;
  providerId: string;
  providerName: string;
  providerEmail: string;
  providerType: 'lawyer' | 'expat_aidant';
  title: string;
  description: string;
  metadata?: {
    previousTier?: string;
    newTier?: string;
    previousStatus?: string;
    newStatus?: string;
    amount?: number;
    currency?: string;
    reason?: string;
    stripeEventId?: string;
    mrrImpact?: number;
    churnRiskScore?: number;
  };
  isRead: boolean;
  isAcknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  createdAt: Date;
}

export interface AlertConfig {
  id: string;
  eventType: SubscriptionEventType;
  isEnabled: boolean;
  emailNotification: boolean;
  slackNotification: boolean;
  webhookNotification: boolean;
  webhookUrl?: string;
  emailRecipients: string[];
  severity: AlertSeverity;
}

// ============================================================================
// ADVANCED ANALYTICS
// ============================================================================

export interface CohortData {
  cohortMonth: string; // YYYY-MM
  totalUsers: number;
  retentionByMonth: number[]; // retention % for months 0, 1, 2, 3...
  avgLTV: number;
  churnedCount: number;
}

export interface LTVMetrics {
  overallLTV: number;
  ltvByTier: Record<string, number>;
  ltvByProviderType: Record<string, number>;
  avgSubscriptionDuration: number; // in months
  avgRevenuePerUser: number;
  projectedLTV: number;
}

export interface ChurnPrediction {
  providerId: string;
  providerName: string;
  providerEmail: string;
  riskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: string[];
  lastActivity: Date;
  daysSinceLastActivity: number;
  usageDeclinePercent: number;
  recommendedAction: string;
}

export interface RevenueMetrics {
  mrr: number;
  arr: number;
  mrrGrowthRate: number;
  netMrrChange: number;
  newMrr: number;
  expansionMrr: number;
  contractionMrr: number;
  churnedMrr: number;
  reactivationMrr: number;
}

export interface MRRMovement {
  date: string;
  newMrr: number;
  expansionMrr: number;
  contractionMrr: number;
  churnedMrr: number;
  reactivationMrr: number;
  netMrr: number;
}

// ============================================================================
// ADMIN NOTIFICATION PREFERENCES
// ============================================================================

export interface AdminNotificationPreferences {
  adminId: string;
  email: string;
  enableEmailAlerts: boolean;
  enableSlackAlerts: boolean;
  slackWebhookUrl?: string;
  alertThresholds: {
    mrrDropPercent: number; // Alert if MRR drops by this %
    churnRatePercent: number; // Alert if churn rate exceeds this
    failedPaymentsCount: number; // Alert after X failed payments
    trialExpiringDays: number; // Alert X days before trial expires
  };
  subscribedEvents: SubscriptionEventType[];
  quietHoursStart?: string; // HH:MM
  quietHoursEnd?: string; // HH:MM
  timezone: string;
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
  | 'logs'
  | 'alerts'
  | 'analytics';

export interface IaTab {
  id: IaTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}
