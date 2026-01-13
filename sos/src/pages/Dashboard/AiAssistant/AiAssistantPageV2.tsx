/**
 * AI Assistant Page V2 - Refactored
 * Modern 2026 UI with modular components
 *
 * Reduced from 1,122 lines to ~280 lines
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useIntl } from 'react-intl';
import { useLocaleNavigate } from '../../../multilingual-system';
import { getTranslatedRouteSlug, type RouteKey } from '../../../multilingual-system/core/routing/localeRoutes';
import { useApp } from '../../../contexts/AppContext';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { functions, db } from '../../../config/firebase';
import { useAiQuota } from '../../../hooks/useAiQuota';
import { useSubscription } from '../../../hooks/useSubscription';
import { useAuth } from '../../../contexts/AuthContext';
import DashboardLayout from '../../../components/layout/DashboardLayout';

// Import modern components
import {
  Header,
  ProviderSelector,
  AccessCTA,
  QuotaVisualization,
  SubscriptionCard,
  FeaturesCard,
  ConversationsSection,
} from './components';

// Import styles
import './styles/tokens.css';

// ============================================================================
// CONFIGURATION
// ============================================================================

const OUTIL_BASE_URL = import.meta.env.VITE_OUTIL_BASE_URL || 'https://outils-sos-expat.web.app';

// ============================================================================
// TYPES
// ============================================================================

interface LinkedProvider {
  id: string;
  name: string;
  email?: string;
  type: 'lawyer' | 'expat';
  profilePhoto?: string;
  pendingRequests: number;
  unreadMessages: number;
  lastActivityAt?: Date;
  hasUrgentRequest?: boolean;
}

interface RecentConversation {
  id: string;
  clientName: string;
  subject: string;
  lastMessageAt: Date;
  messageCount: number;
  status: 'active' | 'archived' | 'expired';
  country?: string;
}

interface GenerateOutilTokenResponse {
  success: boolean;
  token: string;
  expiresIn: number;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const AiAssistantPageV2: React.FC = () => {
  const intl = useIntl();
  const { language } = useApp();
  const navigate = useLocaleNavigate();
  const locale = language;
  const { user } = useAuth();

  // Route translations
  const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';
  const translatedRoutes = useMemo(() => ({
    subscription: `/${getTranslatedRouteSlug('dashboard-subscription' as RouteKey, langCode)}`,
    subscriptionPlans: `/${getTranslatedRouteSlug('dashboard-subscription-plans' as RouteKey, langCode)}`,
  }), [langCode]);

  // Hooks
  const {
    currentUsage,
    limit,
    isInTrial,
    trialDaysRemaining,
    trialCallsRemaining,
    isNearQuotaLimit,
    canMakeAiCall,
  } = useAiQuota();

  const { subscription } = useSubscription();

  // State
  const [isAccessingOutil, setIsAccessingOutil] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [linkedProviders, setLinkedProviders] = useState<LinkedProvider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [hasNewActivity, setHasNewActivity] = useState(false);
  const [recentConversations, setRecentConversations] = useState<RecentConversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [conversationsError, setConversationsError] = useState<string | null>(null);

  // Load linked providers
  useEffect(() => {
    let isMounted = true;
    const unsubscribers: (() => void)[] = [];

    const loadLinkedProviders = async () => {
      if (!user?.uid) return;

      try {
        setProvidersLoading(true);
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        const linkedIds: string[] = userData?.linkedProviderIds || [];

        const loadNotifications = async (providerId: string) => {
          try {
            const notifDoc = await getDoc(doc(db, 'provider_notifications', providerId));
            if (notifDoc.exists()) {
              const data = notifDoc.data();
              return {
                pending: data.pendingRequests || 0,
                unread: data.unreadMessages || 0,
                lastActivity: data.lastActivityAt?.toDate?.(),
                urgent: data.hasUrgentRequest || false,
              };
            }
          } catch {
            console.warn(`[AiAssistant] Could not load notifications for ${providerId}`);
          }
          return { pending: 0, unread: 0, urgent: false };
        };

        // Handle no linked providers - use self
        if (linkedIds.length === 0) {
          const notifs = await loadNotifications(user.uid);
          const profileDoc = await getDoc(doc(db, 'sos_profiles', user.uid));

          if (isMounted) {
            const profileData = profileDoc.data() || {};
            setLinkedProviders([{
              id: user.uid,
              name: profileData.name || userData?.displayName || 'Mon profil',
              email: profileData.email || user.email || '',
              type: profileData.providerType === 'expat_aidant' ? 'expat' : 'lawyer',
              profilePhoto: profileData.profilePhoto,
              pendingRequests: notifs.pending,
              unreadMessages: notifs.unread,
              lastActivityAt: notifs.lastActivity,
              hasUrgentRequest: notifs.urgent,
            }]);
            setSelectedProviderId(user.uid);
            setProvidersLoading(false);
          }
          return;
        }

        // Load all linked providers
        const providers: LinkedProvider[] = [];
        for (const providerId of linkedIds) {
          try {
            const notifs = await loadNotifications(providerId);
            const profileDoc = await getDoc(doc(db, 'sos_profiles', providerId));
            if (profileDoc.exists()) {
              const data = profileDoc.data();
              providers.push({
                id: providerId,
                name: data.name || data.displayName || 'N/A',
                email: data.email,
                type: data.providerType === 'expat_aidant' ? 'expat' : 'lawyer',
                profilePhoto: data.profilePhoto,
                pendingRequests: notifs.pending,
                unreadMessages: notifs.unread,
                lastActivityAt: notifs.lastActivity,
                hasUrgentRequest: notifs.urgent,
              });
            }
          } catch {
            console.warn(`[AiAssistant] Could not load provider ${providerId}`);
          }
        }

        // Sort by urgency and notifications
        providers.sort((a, b) => {
          if (a.hasUrgentRequest && !b.hasUrgentRequest) return -1;
          if (!a.hasUrgentRequest && b.hasUrgentRequest) return 1;
          return (b.pendingRequests + b.unreadMessages) - (a.pendingRequests + a.unreadMessages);
        });

        if (isMounted) {
          setLinkedProviders(providers);
          setSelectedProviderId(providers[0]?.id || null);
          setProvidersLoading(false);
        }
      } catch (err) {
        console.error('[AiAssistant] Error loading providers:', err);
        if (isMounted) setProvidersLoading(false);
      }
    };

    loadLinkedProviders();

    return () => {
      isMounted = false;
      unsubscribers.forEach(unsub => unsub());
    };
  }, [user?.uid]);

  // Real-time notifications listener
  useEffect(() => {
    if (!selectedProviderId) return;

    // Listen for new bookings for this provider
    const bookingsQuery = query(
      collection(db, 'call_sessions'),
      where('providerId', '==', selectedProviderId),
      where('status', '==', 'pending')
    );

    const unsubscribeBookings = onSnapshot(bookingsQuery, (snapshot) => {
      // Check if there are any new pending bookings
      const hasPending = !snapshot.empty;
      setHasNewActivity(hasPending);

      // Update linkedProviders with new notification counts
      if (!snapshot.empty) {
        setLinkedProviders(prev => prev.map(provider => {
          if (provider.id === selectedProviderId) {
            return {
              ...provider,
              pendingRequests: snapshot.size,
              lastActivityAt: new Date(),
            };
          }
          return provider;
        }));
      }
    }, (error) => {
      console.warn('[AiAssistant] Real-time bookings listener error:', error);
    });

    return () => {
      unsubscribeBookings();
    };
  }, [selectedProviderId]);

  // Fetch conversations (placeholder)
  useEffect(() => {
    let isMounted = true;

    const fetchConversations = async () => {
      if (!user?.uid) return;
      try {
        if (isMounted) setConversationsLoading(true);
        // TODO: Implement API call
        if (isMounted) {
          setRecentConversations([]);
          setConversationsError(null);
        }
      } catch {
        if (isMounted) {
          setConversationsError(intl.formatMessage({ id: 'aiAssistant.errors.loadConversations' }));
        }
      } finally {
        if (isMounted) setConversationsLoading(false);
      }
    };

    fetchConversations();
    return () => { isMounted = false; };
  }, [user?.uid, locale]);

  // Handle SSO access
  const handleAccessOutil = useCallback(async (overrideProviderId?: string) => {
    if (!canMakeAiCall) {
      navigate(translatedRoutes.subscriptionPlans);
      return;
    }

    setIsAccessingOutil(true);
    setAccessError(null);

    try {
      const targetProviderId = overrideProviderId || selectedProviderId;
      const generateToken = httpsCallable<{ asProviderId?: string }, GenerateOutilTokenResponse>(
        functions,
        'generateOutilToken'
      );

      const requestData: { asProviderId?: string } = {};
      if (targetProviderId && targetProviderId !== user?.uid) {
        requestData.asProviderId = targetProviderId;
      }

      const result = await generateToken(requestData);

      if (result.data.success && result.data.token) {
        const ssoUrl = `${OUTIL_BASE_URL}/auth?token=${encodeURIComponent(result.data.token)}`;
        window.open(ssoUrl, '_blank', 'noopener,noreferrer');
      } else {
        throw new Error('Token non reçu');
      }
    } catch (error: unknown) {
      console.error('SSO Error:', error);
      const firebaseError = error as { code?: string; message?: string };
      let errorMessage = intl.formatMessage({ id: 'aiAssistant.errors.accessError' });

      if (firebaseError.code === 'functions/permission-denied') {
        errorMessage = firebaseError.message || intl.formatMessage({ id: 'aiAssistant.errors.accessDenied' });
      } else if (firebaseError.code === 'functions/resource-exhausted') {
        errorMessage = intl.formatMessage({ id: 'subscription.errors.quotaExhausted' });
      }

      setAccessError(errorMessage);
    } finally {
      setIsAccessingOutil(false);
    }
  }, [canMakeAiCall, selectedProviderId, user?.uid, navigate, translatedRoutes.subscriptionPlans, intl]);

  // Get tier name
  const getTierName = useCallback(() => {
    if (isInTrial) return intl.formatMessage({ id: 'subscription.trial.title' });
    if (!subscription?.tier) return intl.formatMessage({ id: 'common.none' });
    const tierNames: Record<string, string> = {
      basic: 'Basic',
      standard: 'Standard',
      pro: 'Pro',
      unlimited: 'Illimité',
    };
    return tierNames[subscription.tier] || subscription.tier;
  }, [isInTrial, subscription?.tier, intl]);

  const selectedProvider = linkedProviders.find(p => p.id === selectedProviderId);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <DashboardLayout activeKey="ai-assistant">
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/30">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <Header />

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Controls */}
            <aside className="lg:col-span-1 space-y-6">
              {/* Provider Selector */}
              <ProviderSelector
                providers={linkedProviders}
                selectedId={selectedProviderId}
                onSelect={setSelectedProviderId}
                onQuickAccess={handleAccessOutil}
                loading={providersLoading}
                isAccessingOutil={isAccessingOutil}
                hasNewActivity={hasNewActivity}
              />

              {/* Main CTA */}
              <AccessCTA
                onAccess={() => handleAccessOutil()}
                loading={isAccessingOutil}
                canMakeCall={canMakeAiCall}
                error={accessError}
                selectedProviderName={selectedProvider?.name}
                showMultiProvider={linkedProviders.length > 1}
                onViewPlans={() => navigate(translatedRoutes.subscriptionPlans)}
              />

              {/* Quota */}
              <QuotaVisualization
                currentUsage={currentUsage}
                limit={limit}
                isInTrial={isInTrial}
                trialDaysRemaining={trialDaysRemaining}
                trialCallsRemaining={trialCallsRemaining}
                showUpgradePrompt={isNearQuotaLimit}
                onUpgradeClick={() => navigate(translatedRoutes.subscriptionPlans)}
              />

              {/* Subscription */}
              <SubscriptionCard
                tierName={getTierName()}
                isInTrial={isInTrial}
                trialDaysRemaining={trialDaysRemaining}
                currentUsage={currentUsage}
                limit={limit}
                onManageClick={() => navigate(translatedRoutes.subscription)}
              />

              {/* Features */}
              <FeaturesCard />
            </aside>

            {/* Right Column - Conversations */}
            <main className="lg:col-span-2">
              <ConversationsSection
                conversations={recentConversations}
                loading={conversationsLoading}
                error={conversationsError}
                canMakeCall={canMakeAiCall}
                locale={locale}
                onViewAll={() => handleAccessOutil()}
                onOpenConversation={(id) => {
                  window.open(
                    `${OUTIL_BASE_URL}/dashboard/conversation/${id}`,
                    '_blank',
                    'noopener,noreferrer'
                  );
                }}
                onStartNew={() => handleAccessOutil()}
              />
            </main>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AiAssistantPageV2;
