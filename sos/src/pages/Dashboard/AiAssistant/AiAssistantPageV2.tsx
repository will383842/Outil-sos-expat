/**
 * AI Assistant Page V2 - Refactored
 * Modern 2026 UI matching Subscription page design
 *
 * Changes:
 * - Removed ConversationsSection (conversations récentes)
 * - Removed SubscriptionCard (moved to subscription page)
 * - Removed DurationReminder
 * - ProviderSelector only visible for multi-provider accounts
 * - Fixed N/A names for linked providers
 * - Stable layout with no jumping
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
import { usePWA } from '../../../components/pwa/PWAProvider';
import {
  Bot,
  Zap,
  Clock,
  Phone,
  ExternalLink,
  Loader2,
  Sparkles,
  Crown,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ChevronRight,
  Calendar,
  ArrowUpRight,
  Users,
  Download,
  Smartphone,
} from 'lucide-react';
import { cn } from '../../../utils/cn';

// Import components
import { ProviderSelector, FeaturesCard } from './components';

// Import styles
import './styles/tokens.css';

// ============================================================================
// CONFIGURATION
// ============================================================================

const OUTIL_BASE_URL = import.meta.env.VITE_OUTIL_BASE_URL || 'https://ia.sos-expat.com';

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
  hasForcedAccess?: boolean;
}

interface GenerateOutilTokenResponse {
  success: boolean;
  token: string;
  expiresIn: number;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface StatCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string | number;
  subValue?: string;
  status?: 'success' | 'warning' | 'error' | 'info';
}

const StatCard: React.FC<StatCardProps> = ({ icon, iconBg, label, value, subValue, status }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow min-h-[120px]">
    <div className="flex items-start justify-between">
      <div className={cn('p-2.5 rounded-xl', iconBg)}>
        {icon}
      </div>
      {status === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
      {status === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
      {status === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
    </div>
    <div className="mt-4">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        {subValue && (
          <span className="text-sm text-gray-500">{subValue}</span>
        )}
      </div>
    </div>
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const AiAssistantPageV2: React.FC = () => {
  const intl = useIntl();
  const { language } = useApp();
  const navigate = useLocaleNavigate();
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
    remaining,
    isInTrial,
    trialDaysRemaining,
    trialCallsRemaining,
    isNearQuotaLimit,
    isQuotaExhausted,
    canMakeAiCall,
    isUnlimited,
    usage,
    loading: quotaLoading,
  } = useAiQuota();

  const { subscription, loading: subLoading } = useSubscription();

  // PWA Install
  const { canInstall, triggerInstall, isInstalled } = usePWA();
  const [isInstallingPWA, setIsInstallingPWA] = useState(false);

  const handleInstallPWA = useCallback(async () => {
    setIsInstallingPWA(true);
    try {
      await triggerInstall();
    } finally {
      setIsInstallingPWA(false);
    }
  }, [triggerInstall]);

  // State
  const [isAccessingOutil, setIsAccessingOutil] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [linkedProviders, setLinkedProviders] = useState<LinkedProvider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [hasNewActivity, setHasNewActivity] = useState(false);

  // Check if multi-provider account - P1 FIX: Use stable check to avoid layout shift
  const isMultiProvider = linkedProviders.length > 1;
  // P1 FIX: Track if we've ever had multi providers to maintain layout stability
  const [hadMultiProviders, setHadMultiProviders] = useState(false);

  // Update hadMultiProviders when linkedProviders changes
  useEffect(() => {
    if (isMultiProvider && !hadMultiProviders) {
      setHadMultiProviders(true);
    }
  }, [isMultiProvider, hadMultiProviders]);

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
            // Get name from multiple possible fields
            const providerName = profileData.firstName
              || profileData.name
              || profileData.displayName
              || userData?.displayName
              || userData?.firstName
              || user.displayName
              || intl.formatMessage({ id: 'aiAssistant.myProfile', defaultMessage: 'Mon profil' });

            setLinkedProviders([{
              id: user.uid,
              name: providerName,
              email: profileData.email || user.email || '',
              type: profileData.providerType === 'expat_aidant' ? 'expat' : 'lawyer',
              profilePhoto: profileData.profilePhoto || profileData.photoURL,
              pendingRequests: notifs.pending,
              unreadMessages: notifs.unread,
              lastActivityAt: notifs.lastActivity,
              hasUrgentRequest: notifs.urgent,
              hasForcedAccess: profileData.forcedAIAccess === true,
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
              // Get name from multiple possible fields - fix N/A issue
              const providerName = data.firstName
                || data.name
                || data.displayName
                || data.fullName
                || data.email?.split('@')[0] // Fallback to email username
                || `Prestataire ${providers.length + 1}`;

              providers.push({
                id: providerId,
                name: providerName,
                email: data.email,
                type: data.providerType === 'expat_aidant' ? 'expat' : 'lawyer',
                profilePhoto: data.profilePhoto || data.photoURL,
                pendingRequests: notifs.pending,
                unreadMessages: notifs.unread,
                lastActivityAt: notifs.lastActivity,
                hasUrgentRequest: notifs.urgent,
                hasForcedAccess: data.forcedAIAccess === true,
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
  }, [user?.uid, intl]);

  // Real-time notifications listener
  useEffect(() => {
    if (!selectedProviderId) return;

    const bookingsQuery = query(
      collection(db, 'call_sessions'),
      where('providerId', '==', selectedProviderId),
      where('status', '==', 'pending')
    );

    const unsubscribeBookings = onSnapshot(bookingsQuery, (snapshot) => {
      const hasPending = !snapshot.empty;
      setHasNewActivity(hasPending);

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

  // Handle SSO access
  // P1 FIX: Open window synchronously to avoid popup blocker
  // P0 FIX: Remove 'noopener' to allow writing to the window, use link click fallback
  const handleAccessOutil = useCallback(async (overrideProviderId?: string) => {
    if (!canMakeAiCall && !linkedProviders.find(p => p.id === (overrideProviderId || selectedProviderId))?.hasForcedAccess) {
      navigate(translatedRoutes.subscriptionPlans);
      return;
    }

    setIsAccessingOutil(true);
    setAccessError(null);

    // P1 FIX: Open window IMMEDIATELY (synchronously) to avoid popup blocker
    // P0 FIX: Don't use 'noopener' so we can write to the window and redirect it
    const newWindow = window.open('about:blank', '_blank');
    let windowUsable = false;

    if (!newWindow) {
      console.warn('[AiAssistant] Popup blocked, will use link click fallback');
    } else {
      // Write a loading page to the new window
      try {
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Connexion à l'Outil IA...</title>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  display: flex;
                  flex-direction: column;
                  justify-content: center;
                  align-items: center;
                  height: 100vh;
                  margin: 0;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                }
                .spinner {
                  width: 50px;
                  height: 50px;
                  border: 4px solid rgba(255,255,255,0.3);
                  border-top-color: white;
                  border-radius: 50%;
                  animation: spin 1s linear infinite;
                }
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
                h2 { margin-top: 20px; font-weight: 500; }
                p { opacity: 0.8; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="spinner"></div>
              <h2>Connexion en cours...</h2>
              <p>Vous allez être redirigé vers l'Outil IA SOS Expat</p>
            </body>
          </html>
        `);
        newWindow.document.close();
        windowUsable = true;
      } catch (writeError) {
        console.warn('[AiAssistant] Cannot write to popup window:', writeError);
        try { newWindow.close(); } catch { /* ignore */ }
      }
    }

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

        if (newWindow && windowUsable && !newWindow.closed) {
          // Redirect the already-opened window to SSO URL
          try {
            newWindow.location.href = ssoUrl;
          } catch (redirectError) {
            console.warn('[AiAssistant] Cannot redirect popup, using link fallback:', redirectError);
            try { newWindow.close(); } catch { /* ignore */ }
            // Fallback: open in new tab using a link click
            const link = document.createElement('a');
            link.href = ssoUrl;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        } else {
          // Fallback: open in new tab using a link click (preserves current tab)
          const link = document.createElement('a');
          link.href = ssoUrl;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        if (newWindow && !newWindow.closed) {
          try { newWindow.close(); } catch { /* ignore */ }
        }
        throw new Error('Token non reçu');
      }
    } catch (error: unknown) {
      if (newWindow && !newWindow.closed) {
        try { newWindow.close(); } catch { /* ignore */ }
      }
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
  }, [canMakeAiCall, selectedProviderId, linkedProviders, user?.uid, navigate, translatedRoutes.subscriptionPlans, intl]);

  // Helpers
  const selectedProvider = linkedProviders.find(p => p.id === selectedProviderId);
  const hasAccess = canMakeAiCall || selectedProvider?.hasForcedAccess;

  const getQuotaStatus = () => {
    if (isUnlimited) return 'success';
    if (isQuotaExhausted) return 'error';
    if (isNearQuotaLimit) return 'warning';
    return 'success';
  };

  const getTrialStatus = () => {
    if (!isInTrial) return undefined;
    if (trialDaysRemaining <= 3) return 'error';
    if (trialDaysRemaining <= 7) return 'warning';
    return 'info';
  };

  // P1 FIX: Separate loading states instead of combined blocking
  // Only show full skeleton if ALL critical data is loading on initial mount
  const isInitialLoading = subLoading && quotaLoading && providersLoading;

  // Individual loading states for partial renders
  const isQuotaReady = !quotaLoading;
  const isProvidersReady = !providersLoading;


  // ============================================================================
  // LOADING STATE - Only show full skeleton on initial load
  // ============================================================================

  if (isInitialLoading) {
    return (
      <DashboardLayout activeKey="ai-assistant">
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/30">
          <div className="max-w-6xl mx-auto px-4 py-8">
            {/* Skeleton Header */}
            <div className="mb-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gray-200 rounded-2xl animate-pulse" />
                <div>
                  <div className="h-7 w-48 bg-gray-200 rounded-lg animate-pulse" />
                  <div className="h-4 w-72 bg-gray-100 rounded mt-2 animate-pulse" />
                </div>
              </div>
            </div>

            {/* Skeleton Hero CTA */}
            <div className="mb-8 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-2xl h-36 animate-pulse" />

            {/* Skeleton Stats - 3 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 min-h-[120px] animate-pulse">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl mb-4" />
                  <div className="h-3 w-20 bg-gray-100 rounded mb-2" />
                  <div className="h-6 w-16 bg-gray-200 rounded" />
                </div>
              ))}
            </div>

            {/* Skeleton Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl border border-gray-200 h-64 animate-pulse" />
              </div>
              <div>
                <div className="bg-white rounded-xl border border-gray-200 h-40 animate-pulse mb-6" />
                <div className="bg-white rounded-xl border border-gray-200 h-32 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <DashboardLayout activeKey="ai-assistant">
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/30">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* ================================================================ */}
          {/* HEADER */}
          {/* ================================================================ */}
          <header className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Animated Icon */}
                <div className="relative">
                  <div className="p-3.5 bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-500/25">
                    <Bot className="w-7 h-7 text-white" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl blur-xl opacity-40 -z-10" />
                </div>

                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
                    {intl.formatMessage({ id: 'aiAssistant.title' })}
                  </h1>
                  <p className="text-gray-500 mt-0.5">
                    {intl.formatMessage({ id: 'aiAssistant.description' })}
                  </p>
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* PWA Install Button */}
                {canInstall && !isInstalled && (
                  <button
                    onClick={handleInstallPWA}
                    disabled={isInstallingPWA}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-70"
                  >
                    {isInstallingPWA ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span>{intl.formatMessage({ id: 'pwa.install.button', defaultMessage: 'Installer l\'app' })}</span>
                  </button>
                )}
                {isInTrial && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-medium shadow-lg">
                    <Sparkles className="w-4 h-4" />
                    <span>{intl.formatMessage({ id: 'subscription.trial.period' })}</span>
                  </div>
                )}
                {hasAccess && !isInTrial && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                    <CheckCircle className="w-4 h-4" />
                    {intl.formatMessage({ id: 'subscription.status.active' })}
                  </div>
                )}
                {!hasAccess && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium">
                    <XCircle className="w-4 h-4" />
                    {intl.formatMessage({ id: 'subscription.errors.noAccess', defaultMessage: 'Pas d\'accès' })}
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* ================================================================ */}
          {/* HERO CTA - Primary Action */}
          {/* ================================================================ */}
          <div className="mb-8">
            <div
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-purple-700 shadow-2xl shadow-indigo-500/20"
              style={{ contain: 'layout paint' }}
            >
              {/* Animated background */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl" />
                <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-purple-500/20 to-transparent rounded-full blur-3xl" />
              </div>

              <div className="relative z-10 p-6 md:p-8">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  {/* Left: Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-white/15 backdrop-blur-sm rounded-xl">
                        <Sparkles className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl md:text-2xl font-bold text-white">
                          {intl.formatMessage({ id: 'aiAssistant.toolTitle' })}
                        </h2>
                        <p className="text-indigo-100 text-sm">
                          {intl.formatMessage({ id: 'aiAssistant.toolDescription' })}
                        </p>
                      </div>
                    </div>

                    {/* Multi-provider info */}
                    {isMultiProvider && selectedProvider && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-lg text-sm text-white/90">
                        <Users className="w-4 h-4" />
                        <span>{selectedProvider.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Right: CTA Button */}
                  <div className="flex flex-col items-stretch lg:items-end gap-3">
                    <button
                      onClick={() => handleAccessOutil()}
                      disabled={!hasAccess || isAccessingOutil}
                      className={cn(
                        'group relative px-8 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all duration-300',
                        hasAccess && !isAccessingOutil
                          ? 'bg-white text-indigo-600 shadow-xl hover:shadow-2xl hover:scale-[1.03] active:scale-[0.98]'
                          : 'bg-white/20 text-white/70 cursor-not-allowed'
                      )}
                    >
                      {isAccessingOutil ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          {intl.formatMessage({ id: 'common.connecting' })}
                        </>
                      ) : hasAccess ? (
                        <>
                          <ExternalLink className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                          {intl.formatMessage({ id: 'aiAssistant.accessButton' })}
                          <ArrowUpRight className="w-4 h-4 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                        </>
                      ) : (
                        <>
                          <Crown className="w-5 h-5" />
                          {intl.formatMessage({ id: 'subscription.errors.noSubscription' })}
                        </>
                      )}
                    </button>

                    {!hasAccess && (
                      <button
                        onClick={() => navigate(translatedRoutes.subscriptionPlans)}
                        className="text-sm text-white/80 hover:text-white underline underline-offset-2 transition-colors"
                      >
                        {intl.formatMessage({ id: 'subscription.viewPlans' })}
                      </button>
                    )}
                  </div>
                </div>

                {/* Error Display */}
                {accessError && (
                  <div className="mt-4 p-3 bg-red-500/20 border border-red-400/30 rounded-xl">
                    <p className="text-sm text-white text-center">{accessError}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ================================================================ */}
          {/* STATS CARDS - Simplified to 3 */}
          {/* ================================================================ */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8" style={{ contain: 'layout' }}>
            <StatCard
              icon={<Phone className="w-5 h-5 text-indigo-600" />}
              iconBg="bg-indigo-100"
              label={intl.formatMessage({ id: 'subscription.stats.callsThisMonth' })}
              value={currentUsage}
              subValue={isUnlimited ? intl.formatMessage({ id: 'subscription.quota.unlimited' }) : `/ ${limit}`}
              status={getQuotaStatus()}
            />
            <StatCard
              icon={<Zap className="w-5 h-5 text-green-600" />}
              iconBg="bg-green-100"
              label={intl.formatMessage({ id: 'subscription.quota.remaining' })}
              value={isUnlimited ? '∞' : remaining}
              subValue={isUnlimited ? '' : intl.formatMessage({ id: 'aiAssistant.callsLabel', defaultMessage: 'appels' })}
              status={getQuotaStatus()}
            />
            {isInTrial ? (
              <StatCard
                icon={<Clock className="w-5 h-5 text-amber-600" />}
                iconBg="bg-amber-100"
                label={intl.formatMessage({ id: 'subscription.stats.trialDaysLeft' })}
                value={trialDaysRemaining}
                subValue={intl.formatMessage({ id: 'common.days' })}
                status={getTrialStatus()}
              />
            ) : (
              <StatCard
                icon={<Calendar className="w-5 h-5 text-purple-600" />}
                iconBg="bg-purple-100"
                label={intl.formatMessage({ id: 'subscription.billing.nextRenewal', defaultMessage: 'Renouvellement' })}
                value={subscription?.currentPeriodEnd
                  ? new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short' }).format(subscription.currentPeriodEnd)
                  : '-'}
              />
            )}
          </div>

          {/* ================================================================ */}
          {/* MAIN CONTENT - Simplified 2-column layout */}
          {/* ================================================================ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ contain: 'layout' }}>
            {/* Left Column - Quota & Provider Selector */}
            <div className="lg:col-span-2 space-y-6">
              {/* Provider Selector - ONLY for multi-provider accounts */}
              {(isMultiProvider || hadMultiProviders || !isProvidersReady) && (
                isProvidersReady && isMultiProvider ? (
                  <ProviderSelector
                    providers={linkedProviders}
                    selectedId={selectedProviderId}
                    onSelect={setSelectedProviderId}
                    onQuickAccess={handleAccessOutil}
                    loading={false}
                    isAccessingOutil={isAccessingOutil}
                    hasNewActivity={hasNewActivity}
                  />
                ) : !isProvidersReady ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full" />
                      <div className="flex-1">
                        <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
                        <div className="h-3 w-24 bg-gray-100 rounded" />
                      </div>
                    </div>
                  </div>
                ) : null
              )}

              {/* Quota Card - Clean & Modern */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <Zap className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {isInTrial
                        ? intl.formatMessage({ id: 'subscription.trial.period' })
                        : intl.formatMessage({ id: 'subscription.quota.usage' })}
                    </h2>
                  </div>
                  {isUnlimited && (
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                      ∞ {intl.formatMessage({ id: 'subscription.quota.unlimited' })}
                    </span>
                  )}
                </div>

                <div className="p-6">
                  {/* Progress Bar */}
                  {!isUnlimited && limit > 0 && (
                    <div className="mb-6">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">{intl.formatMessage({ id: 'subscription.quota.usage' })}</span>
                        <span className="font-medium text-gray-900">
                          {Math.min(100, Math.round((currentUsage / limit) * 100))}%
                        </span>
                      </div>
                      <div className={cn(
                        'h-3 rounded-full overflow-hidden',
                        isQuotaExhausted ? 'bg-red-100' : isNearQuotaLimit ? 'bg-orange-100' : 'bg-green-100'
                      )}>
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-700 ease-out',
                            isQuotaExhausted
                              ? 'bg-gradient-to-r from-red-500 to-red-600'
                              : isNearQuotaLimit
                              ? 'bg-gradient-to-r from-orange-400 to-amber-500'
                              : 'bg-gradient-to-r from-green-400 to-emerald-500'
                          )}
                          style={{ width: `${Math.min(100, Math.round((currentUsage / limit) * 100))}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-xl font-bold text-gray-900">{currentUsage}</p>
                      <p className="text-xs text-gray-500">{intl.formatMessage({ id: 'subscription.quota.used' })}</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg border-x border-gray-100">
                      <p className="text-xl font-bold text-gray-900">{isUnlimited ? '∞' : limit}</p>
                      <p className="text-xs text-gray-500">{intl.formatMessage({ id: 'subscription.quota.total' })}</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className={cn(
                        'text-xl font-bold',
                        isUnlimited ? 'text-amber-600' : isQuotaExhausted ? 'text-red-600' : isNearQuotaLimit ? 'text-orange-600' : 'text-green-600'
                      )}>
                        {isUnlimited ? '∞' : remaining}
                      </p>
                      <p className="text-xs text-gray-500">{intl.formatMessage({ id: 'subscription.quota.remaining' })}</p>
                    </div>
                  </div>

                  {/* Trial Info */}
                  {isInTrial && (
                    <div className="bg-indigo-50 rounded-xl p-4 flex items-start gap-3">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-medium text-indigo-900">
                          {intl.formatMessage({ id: 'subscription.trial.period' })}
                        </p>
                        <p className="text-sm text-indigo-700">
                          {intl.formatMessage({ id: 'subscription.trial.daysRemaining' }, { days: trialDaysRemaining })}
                          {' - '}
                          {intl.formatMessage({ id: 'subscription.trial.callsRemaining' }, { calls: trialCallsRemaining })}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Upgrade Prompt */}
                  {(isNearQuotaLimit || isQuotaExhausted) && !isUnlimited && (
                    <button
                      onClick={() => navigate(translatedRoutes.subscriptionPlans)}
                      className="mt-4 w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      {isQuotaExhausted
                        ? intl.formatMessage({ id: 'subscription.actions.upgrade' })
                        : intl.formatMessage({ id: 'subscription.quota.upgradePrompt' })}
                    </button>
                  )}

                  {/* Reset Info */}
                  {!isInTrial && (
                    <p className="text-xs text-gray-500 text-center mt-4">
                      {intl.formatMessage({ id: 'subscription.quota.resetInfo' })}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Navigation & Features */}
            <div className="space-y-6">
              {/* Navigation Links - Simplified */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <h3 className="font-semibold text-gray-900 mb-4 text-sm uppercase tracking-wide">
                  {intl.formatMessage({ id: 'subscription.quickActions.title' })}
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => navigate(translatedRoutes.subscription)}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                  >
                    <span className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Zap className="w-4 h-4 text-green-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {intl.formatMessage({ id: 'subscription.mySubscription' })}
                      </span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  <button
                    onClick={() => navigate(translatedRoutes.subscriptionPlans)}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                  >
                    <span className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Crown className="w-4 h-4 text-purple-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {intl.formatMessage({ id: 'subscription.viewPlans' })}
                      </span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* PWA Install */}
                  {canInstall && !isInstalled && (
                    <button
                      onClick={handleInstallPWA}
                      disabled={isInstallingPWA}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors group disabled:opacity-50"
                    >
                      <span className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                          {isInstallingPWA ? (
                            <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                          ) : (
                            <Smartphone className="w-4 h-4 text-emerald-600" />
                          )}
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          {intl.formatMessage({ id: 'pwa.install.action', defaultMessage: 'Installer l\'app' })}
                        </span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}
                </div>
              </div>

              {/* Features Card */}
              <FeaturesCard />

              {/* Upgrade CTA - Only for trial/limited users */}
              {(isInTrial || isNearQuotaLimit || isQuotaExhausted) && !isUnlimited && (
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-5 text-white">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-sm">
                      {isInTrial
                        ? intl.formatMessage({ id: 'subscription.trial.upgrade', defaultMessage: 'Passez au premium' })
                        : intl.formatMessage({ id: 'subscription.quota.upgradePrompt' })}
                    </h3>
                  </div>
                  <p className="text-indigo-100 text-sm mb-4">
                    {isInTrial
                      ? intl.formatMessage({ id: 'subscription.trial.upgradeDescription', defaultMessage: 'Débloquez toutes les fonctionnalités.' })
                      : intl.formatMessage({ id: 'subscription.cta.upgradeDescription', defaultMessage: 'Plus d\'appels IA, plus de clients.' })}
                  </p>
                  <button
                    onClick={() => navigate(translatedRoutes.subscriptionPlans)}
                    className="w-full py-2.5 bg-white text-indigo-600 rounded-lg font-semibold text-sm hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    {intl.formatMessage({ id: 'subscription.viewPlans' })}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AiAssistantPageV2;
