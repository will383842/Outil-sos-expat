/**
 * AI Assistant Access Page
 * Page d'accès à l'Outil IA - Affiche quota, conversations récentes, et lien vers Outil
 *
 * ARCHITECTURE:
 * - SOS gère les abonnements et affiche le quota
 * - Outil-sos-expat est L'OUTIL IA complet (chat, conversations)
 * - Cette page sert de "passerelle" vers l'Outil
 */

import React, { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { useLocaleNavigate } from '../../../multilingual-system';
import { useApp } from '../../../contexts/AppContext';
import {
  Bot,
  ExternalLink,
  MessageSquare,
  Clock,
  Zap,
  Crown,
  AlertCircle,
  TrendingUp,
  Calendar,
  ChevronRight,
  Sparkles,
  User,
  Globe,
  Loader2
} from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../config/firebase';
import { useAiQuota } from '../../../hooks/useAiQuota';
import { useSubscription } from '../../../hooks/useSubscription';
import { useAuth } from '../../../contexts/AuthContext';
import { QuotaUsageBar } from '../../../components/subscription/QuotaUsageBar';
import { cn } from '../../../utils/cn';
import { getDateLocale } from '../../../utils/formatters';
import DashboardLayout from '../../../components/layout/DashboardLayout';

// ============================================================================
// CONFIGURATION
// ============================================================================

// URL de base de l'Outil (sans /dashboard car on passe par /auth pour le SSO)
const OUTIL_BASE_URL = import.meta.env.VITE_OUTIL_BASE_URL || 'https://outils-sos-expat.web.app';

// Interface pour la réponse de la Cloud Function
interface GenerateOutilTokenResponse {
  success: boolean;
  token: string;
  expiresIn: number;
}

// ============================================================================
// TYPES
// ============================================================================

interface RecentConversation {
  id: string;
  clientName: string;
  subject: string;
  lastMessageAt: Date;
  messageCount: number;
  status: 'active' | 'archived' | 'expired';
  country?: string;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface ConversationCardProps {
  conversation: RecentConversation;
  locale: string;
  intl: ReturnType<typeof useIntl>;
  onClick: () => void;
}

const ConversationCard: React.FC<ConversationCardProps> = ({ conversation, locale, intl, onClick }) => {
  const timeAgo = getTimeAgo(conversation.lastMessageAt, locale, intl);

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <User className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
              {conversation.clientName}
            </h4>
            <p className="text-sm text-gray-500 line-clamp-1">{conversation.subject}</p>
            {conversation.country && (
              <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                <Globe className="w-3 h-3" />
                {conversation.country}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full',
            conversation.status === 'active' && 'bg-green-100 text-green-700',
            conversation.status === 'archived' && 'bg-gray-100 text-gray-600',
            conversation.status === 'expired' && 'bg-amber-100 text-amber-700'
          )}>
            {conversation.status === 'active' && intl.formatMessage({ id: 'aiAssistant.status.active' })}
            {conversation.status === 'archived' && intl.formatMessage({ id: 'aiAssistant.status.archived' })}
            {conversation.status === 'expired' && intl.formatMessage({ id: 'aiAssistant.status.expired' })}
          </span>
          <span className="text-xs text-gray-400">{timeAgo}</span>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <MessageSquare className="w-3 h-3" />
          {conversation.messageCount} {intl.formatMessage({ id: 'aiAssistant.messages' })}
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
      </div>
    </button>
  );
};

// Helper function for time ago
function getTimeAgo(date: Date, locale: string, intl: ReturnType<typeof useIntl>): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) {
    return intl.formatMessage({ id: 'aiAssistant.timeAgo.minutes' }, { count: diffMins });
  } else if (diffHours < 24) {
    return intl.formatMessage({ id: 'aiAssistant.timeAgo.hours' }, { count: diffHours });
  } else if (diffDays < 7) {
    return intl.formatMessage({ id: 'aiAssistant.timeAgo.days' }, { count: diffDays });
  } else {
    return date.toLocaleDateString(getDateLocale(locale), {
      day: 'numeric',
      month: 'short'
    });
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const AiAssistantPage: React.FC = () => {
  const intl = useIntl();
  const { language } = useApp();
  const navigate = useLocaleNavigate();
  const locale = language;
  const { user } = useAuth();

  // Hooks
  const {
    currentUsage,
    limit,
    isInTrial,
    trialDaysRemaining,
    trialCallsRemaining,
    isNearQuotaLimit,
    canMakeAiCall
  } = useAiQuota();

  const { subscription } = useSubscription();

  // State for SSO access
  const [isAccessingOutil, setIsAccessingOutil] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);

  // State for recent conversations (fetched from Outil)
  const [recentConversations, setRecentConversations] = useState<RecentConversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [conversationsError, setConversationsError] = useState<string | null>(null);

  // Fetch recent conversations from Outil
  useEffect(() => {
    // P0 FIX: isMounted flag pour éviter setState après unmount
    let isMounted = true;

    const fetchRecentConversations = async () => {
      if (!user?.uid) return;

      try {
        if (isMounted) setConversationsLoading(true);

        // TODO: Implement API call to Outil to fetch recent conversations
        // For now, we'll show a placeholder
        // const response = await fetch(`${OUTIL_API_URL}/provider/${user.uid}/conversations?limit=5`);
        // const data = await response.json();
        // if (isMounted) setRecentConversations(data.conversations);

        // Placeholder - will be replaced with actual API call
        if (isMounted) {
          setRecentConversations([]);
          setConversationsError(null);
        }
      } catch (error) {
        console.error('Error fetching conversations:', error);
        if (isMounted) {
          setConversationsError(intl.formatMessage({ id: 'aiAssistant.errors.loadConversations' }));
        }
      } finally {
        if (isMounted) setConversationsLoading(false);
      }
    };

    fetchRecentConversations();

    // Cleanup: marquer comme démonté
    return () => {
      isMounted = false;
    };
  }, [user?.uid, locale]);

  // Handle access to Outil with SSO
  const handleAccessOutil = async () => {
    if (!canMakeAiCall) {
      // Show upgrade modal or redirect to plans
      navigate('/dashboard/subscription/plans');
      return;
    }

    setIsAccessingOutil(true);
    setAccessError(null);

    try {
      // Appeler la Cloud Function pour générer le token SSO
      const generateToken = httpsCallable<void, GenerateOutilTokenResponse>(
        functions,
        'generateOutilToken'
      );

      const result = await generateToken();

      if (result.data.success && result.data.token) {
        // Ouvrir l'Outil avec le token SSO
        const ssoUrl = `${OUTIL_BASE_URL}/auth?token=${encodeURIComponent(result.data.token)}`;
        window.open(ssoUrl, '_blank', 'noopener,noreferrer');
      } else {
        throw new Error('Token non reçu');
      }
    } catch (error: any) {
      console.error('Erreur SSO:', error);

      // Message d'erreur en fonction du type d'erreur
      let errorMessage = intl.formatMessage({ id: 'aiAssistant.errors.accessError' });

      if (error.code === 'functions/permission-denied') {
        errorMessage = error.message || intl.formatMessage({ id: 'aiAssistant.errors.accessDenied' });
      } else if (error.code === 'functions/resource-exhausted') {
        errorMessage = intl.formatMessage({ id: 'subscription.errors.quotaExhausted' });
      }

      setAccessError(errorMessage);
    } finally {
      setIsAccessingOutil(false);
    }
  };

  // Get subscription tier display name
  const getTierName = () => {
    if (isInTrial) return intl.formatMessage({ id: 'subscription.trial.title' });
    if (!subscription?.tier) return intl.formatMessage({ id: 'common.none' });

    const tierNames: Record<string, { fr: string; en: string }> = {
      basic: { fr: 'Basic', en: 'Basic' },
      standard: { fr: 'Standard', en: 'Standard' },
      pro: { fr: 'Pro', en: 'Pro' },
      unlimited: { fr: 'Illimité', en: 'Unlimited' }
    };

    const tierName = tierNames[subscription.tier];
    return (tierName && (tierName.fr || tierName.en)) || subscription.tier;
  };

  return (
    <DashboardLayout activeKey="ai-assistant">
    <div className="bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {intl.formatMessage({ id: 'aiAssistant.title' })}
              </h1>
              <p className="text-gray-500 text-sm">
                {intl.formatMessage({ id: 'aiAssistant.description' })}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Quota & CTA */}
          <div className="lg:col-span-1 space-y-6">
            {/* Main CTA - Access Outil */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Sparkles className="w-5 h-5" />
                </div>
                <span className="font-semibold">
                  {intl.formatMessage({ id: 'aiAssistant.toolTitle' })}
                </span>
              </div>

              <p className="text-white/80 text-sm mb-6">
                {intl.formatMessage({ id: 'aiAssistant.toolDescription' })}
              </p>

              <button
                onClick={handleAccessOutil}
                disabled={!canMakeAiCall || isAccessingOutil}
                className={cn(
                  'w-full py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all',
                  canMakeAiCall && !isAccessingOutil
                    ? 'bg-white text-indigo-600 hover:bg-indigo-50 shadow-md hover:shadow-lg'
                    : 'bg-white/30 text-white/70 cursor-not-allowed'
                )}
              >
                {isAccessingOutil ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {intl.formatMessage({ id: 'common.connecting' })}
                  </>
                ) : canMakeAiCall ? (
                  <>
                    <ExternalLink className="w-5 h-5" />
                    {intl.formatMessage({ id: 'aiAssistant.accessButton' })}
                  </>
                ) : (
                  <>
                    <Crown className="w-5 h-5" />
                    {intl.formatMessage({ id: 'subscription.errors.noSubscription' })}
                  </>
                )}
              </button>

              {/* Afficher l'erreur SSO si présente */}
              {accessError && (
                <div className="mt-3 p-2 bg-red-500/20 border border-red-400/30 rounded-lg">
                  <p className="text-sm text-white text-center">{accessError}</p>
                </div>
              )}

              {!canMakeAiCall && (
                <button
                  onClick={() => navigate('/dashboard/subscription/plans')}
                  className="w-full mt-3 py-2 text-sm text-white/80 hover:text-white underline"
                >
                  {intl.formatMessage({ id: 'subscription.viewPlans' })}
                </button>
              )}
            </div>

            {/* Quota Usage */}
            <QuotaUsageBar
              currentUsage={currentUsage}
              limit={limit}
              isInTrial={isInTrial}
              trialDaysRemaining={trialDaysRemaining}
              trialCallsRemaining={trialCallsRemaining}
              showUpgradePrompt={isNearQuotaLimit}
              onUpgradeClick={() => navigate('/dashboard/subscription/plans')}
            />

            {/* Subscription Info */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-indigo-500" />
                {intl.formatMessage({ id: 'subscription.mySubscription' })}
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    {intl.formatMessage({ id: 'subscription.plans.currentPlan' })}
                  </span>
                  <span className="font-medium text-gray-900">{getTierName()}</span>
                </div>

                {isInTrial && trialDaysRemaining !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {intl.formatMessage({ id: 'subscription.trial.daysRemaining' }, { days: trialDaysRemaining })}
                    </span>
                    <span className={cn(
                      'font-medium',
                      trialDaysRemaining <= 7 ? 'text-amber-600' : 'text-gray-900'
                    )}>
                      {trialDaysRemaining} {intl.formatMessage({ id: 'common.days' })}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    {intl.formatMessage({ id: 'subscription.quota.thisMonth' })}
                  </span>
                  <span className="font-medium text-gray-900">
                    {currentUsage} / {limit === -1 ? '∞' : limit}
                  </span>
                </div>

                <button
                  onClick={() => navigate('/dashboard/subscription')}
                  className="w-full mt-2 py-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center justify-center gap-1"
                >
                  {intl.formatMessage({ id: 'subscription.manageBilling' })}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* AI Features */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-green-500" />
                {intl.formatMessage({ id: 'aiAssistant.features' })}
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                  {intl.formatMessage({ id: 'aiAssistant.feature.autoBooking' })}
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                  {intl.formatMessage({ id: 'aiAssistant.feature.realTimeChat' })}
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                  {intl.formatMessage({ id: 'aiAssistant.feature.webSearch' })}
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                  {intl.formatMessage({ id: 'aiAssistant.feature.contextPreserved' })}
                </li>
              </ul>
            </div>
          </div>

          {/* Right Column - Recent Conversations */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-400" />
                  {intl.formatMessage({ id: 'aiAssistant.recentConversations' })}
                </h2>
                <button
                  onClick={handleAccessOutil}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                >
                  {intl.formatMessage({ id: 'common.viewAll' })}
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>

              {conversationsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-24 bg-gray-100 rounded-xl" />
                    </div>
                  ))}
                </div>
              ) : conversationsError ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
                  <p className="text-gray-500">{conversationsError}</p>
                </div>
              ) : recentConversations.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-8 h-8 text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {intl.formatMessage({ id: 'aiAssistant.noConversations' })}
                  </h3>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto">
                    {intl.formatMessage({ id: 'aiAssistant.noConversationsDescription' })}
                  </p>
                  <button
                    onClick={handleAccessOutil}
                    disabled={!canMakeAiCall}
                    className={cn(
                      'inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all',
                      canMakeAiCall
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-md'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    )}
                  >
                    <ExternalLink className="w-5 h-5" />
                    {intl.formatMessage({ id: 'aiAssistant.accessButton' })}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentConversations.map((conversation) => (
                    <ConversationCard
                      key={conversation.id}
                      conversation={conversation}
                      locale={locale}
                      intl={intl}
                      onClick={() => {
                        // Pour les conversations, on ouvre directement (l'utilisateur sera déjà authentifié)
                        window.open(
                          `${OUTIL_BASE_URL}/dashboard/conversation/${conversation.id}`,
                          '_blank',
                          'noopener,noreferrer'
                        );
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Time limit reminder */}
              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-800 mb-1">
                      {intl.formatMessage({ id: 'aiAssistant.conversationDuration' })}
                    </h4>
                    <p className="text-sm text-amber-700">
                      {intl.formatMessage({ id: 'aiAssistant.conversationDurationDetails' })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </DashboardLayout>
  );
};

export default AiAssistantPage;
