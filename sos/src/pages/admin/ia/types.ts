/**
 * Types partagés pour l'Outil IA Admin
 */

import { SubscriptionTier } from '../../../types/subscription';

// ============================================================================
// STATS
// ============================================================================

export interface SubscriptionStats {
  totalProviders: number;
  activeSubscriptions: number;
  trialUsers: number;
  paidUsers: number;
  mrr: number;
  byTier: Record<SubscriptionTier, number>;
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
