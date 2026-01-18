/**
 * =============================================================================
 * PROVIDER HOME - Page d'accueil de l'espace prestataire
 * =============================================================================
 *
 * Design 2026: Modern, clean, light theme, minimal animations
 * - Hero section avec conversation active
 * - KPIs en bento grid
 * - Historique des conversations récentes
 *
 * =============================================================================
 */

import { useEffect, useState, useCallback, useRef } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useProvider } from "../../contexts/UnifiedUserContext";
import { getMockData } from "../components/DevTestTools";
import { useLanguage } from "../../hooks/useLanguage";
import { Link } from "react-router-dom";

// UI Components
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";
import { KPICard } from "../../components/ui/kpi-card";
import { ConversationCard } from "../../components/ui/conversation-card";
import { QuotaBar } from "../../components/ui/quota-bar";

// Icons
import {
  MessageSquare,
  Clock,
  ArrowRight,
  Scale,
  Globe,
  CheckCircle,
  AlertCircle,
  History,
  Sparkles,
  Users,
  TrendingUp,
  Calendar,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface Conversation {
  id: string;
  bookingId?: string;
  clientName?: string;
  clientFirstName?: string;
  title?: string;
  subject?: string;
  status?: "active" | "completed" | "archived";
  messagesCount?: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  lastMessageAt?: Timestamp;
  providerType?: "lawyer" | "expat";
}

// =============================================================================
// ACTIVE CONVERSATION HERO
// =============================================================================

function ActiveConversationHero({
  conversation,
  loading,
}: {
  conversation: Conversation | null;
  loading?: boolean;
}) {
  const { t } = useLanguage({ mode: "provider" });

  // P0 DEBUG: Log hero state to detect layout shifts
  console.log("[ActiveConversationHero] 🎯 Render:", {
    loading,
    hasConversation: !!conversation,
    conversationId: conversation?.id,
    clientName: conversation?.clientName || conversation?.clientFirstName,
    renderingState: loading ? "SKELETON" : (conversation ? "ACTIVE" : "EMPTY"),
  });

  // P0 FIX: Use consistent min-height to prevent layout shifts
  const cardMinHeight = "min-h-[200px]";

  if (loading) {
    return (
      <Card className={`border-0 bg-gradient-to-br from-red-50 to-rose-50 shadow-lg ${cardMinHeight}`}>
        <CardContent className="p-8">
          <div className="flex items-start gap-6">
            <Skeleton className="w-16 h-16 rounded-2xl" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-5 w-72" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
          <Skeleton className="h-12 w-full mt-6 rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (!conversation) {
    return (
      <Card className={`border border-dashed border-gray-200 bg-gray-50/50 ${cardMinHeight}`}>
        <CardContent className="p-10 text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {t("provider:home.noActiveConversation")}
          </h3>
          <p className="text-gray-500 max-w-md mx-auto">
            {t("provider:home.noActiveDescription")}
          </p>
        </CardContent>
      </Card>
    );
  }

  const clientName = conversation.clientName || conversation.clientFirstName || "Client";
  const subject = conversation.title || conversation.subject || "Consultation";
  const isLawyer = conversation.providerType === "lawyer";

  // Calculate elapsed time
  const startTime = conversation.createdAt?.toDate() || new Date();
  const elapsed = Math.floor((Date.now() - startTime.getTime()) / 60000);
  const elapsedDisplay = elapsed < 60
    ? `${elapsed} min`
    : `${Math.floor(elapsed / 60)}h ${elapsed % 60}min`;

  return (
    <Card className={`border-0 bg-gradient-to-br from-red-50 via-rose-50 to-orange-50 shadow-lg overflow-hidden ${cardMinHeight}`}>
      <CardContent className="p-8 relative">
        {/* Subtle decorative element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-red-100/50 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />

        <div className="relative">
          {/* Status Badge */}
          <div className="flex items-center gap-2 mb-6">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 text-sm font-semibold rounded-full">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              {t("provider:home.inProgress")}
            </span>
          </div>

          <div className="flex items-start gap-6">
            {/* Type Icon */}
            <div className={`p-4 rounded-2xl shadow-sm ${isLawyer ? "bg-blue-100" : "bg-emerald-100"}`}>
              {isLawyer ? (
                <Scale className="w-8 h-8 text-blue-600" />
              ) : (
                <Globe className="w-8 h-8 text-emerald-600" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">{clientName}</h2>
              <p className="text-gray-600 text-lg mb-3">{subject}</p>
              <div className="flex items-center gap-6 text-sm text-gray-500">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {t("provider:home.startedAgo", { time: elapsedDisplay })}
                </span>
                {conversation.messagesCount && (
                  <span className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    {t("provider:home.exchanges", { count: conversation.messagesCount })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <Link
            to={`/dashboard/conversation/${conversation.bookingId || conversation.id}`}
            className="block mt-8"
          >
            <Button
              className="w-full h-14 text-lg font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg shadow-red-200"
            >
              {t("provider:home.continueConversation")}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// FORMAT RELATIVE DATE
// =============================================================================

function formatRelativeDate(timestamp: Timestamp | undefined, t: (key: string, params?: any) => string): string {
  if (!timestamp) return "—";
  const date = timestamp.toDate();
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return t("provider:home.ago.minutes", { count: diffMins });
  if (diffHours < 24) return t("provider:home.ago.hours", { count: diffHours });
  if (diffDays === 1) return t("provider:home.ago.yesterday");
  if (diffDays < 7) return t("provider:home.ago.days", { count: diffDays });
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ProviderHome() {
  const { activeProvider } = useProvider();
  const { t } = useLanguage({ mode: "provider" });
  const [loading, setLoading] = useState(true);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [recentConversations, setRecentConversations] = useState<Conversation[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Dev mode
  const isDevMock = new URLSearchParams(window.location.search).get("dev") === "true";

  // P0 DEBUG: Log component state on every render to diagnose layout issues
  console.log("[ProviderHome] 🏠 Render state:", {
    loading,
    activeProviderId: activeProvider?.id,
    activeProviderName: activeProvider?.name,
    activeProviderType: activeProvider?.type,
    aiCallsUsed: activeProvider?.aiCallsUsed,
    aiCallsLimit: activeProvider?.aiCallsLimit,
    aiQuota: activeProvider?.aiQuota,
    hasActiveConversation: !!activeConversation,
    recentConversationsCount: recentConversations.length,
    error,
    isDevMock,
  });

  // P0 DEBUG: Log translation keys to check if they resolve correctly
  console.log("[ProviderHome] 🌐 Translation check:", {
    "dashboard.stats.myDossiers": t("provider:dashboard.stats.myDossiers"),
    "dashboard.quota.title": t("provider:dashboard.quota.title"),
    "home.welcome": t("provider:home.welcome", { name: "" }),
    "home.noActiveConversation": t("provider:home.noActiveConversation"),
  });

  // P0 FIX: Use refs to prevent infinite loop from re-renders
  const lastProviderIdRef = useRef<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isSubscribedRef = useRef(false);

  // Load mock data
  const loadMockConversations = useCallback(() => {
    const mockData = getMockData();
    const conversations = mockData.conversations.map((c) => ({
      ...c,
      createdAt: { toDate: () => c.createdAt } as unknown as Timestamp,
      updatedAt: { toDate: () => c.updatedAt } as unknown as Timestamp,
      lastMessageAt: { toDate: () => c.lastMessageAt } as unknown as Timestamp,
    })) as unknown as Conversation[];

    const active = conversations.find((c) => c.status === "active");
    const recent = conversations.filter((c) => c.status !== "active");

    setActiveConversation(active || null);
    setRecentConversations(recent);
    setLoading(false);
  }, []);

  // Load conversations - P0 FIX: Use refs to prevent re-subscription on every render
  useEffect(() => {
    const providerId = activeProvider?.id || null;

    // P0 FIX: Skip if already subscribed to the same provider
    if (providerId === lastProviderIdRef.current && isSubscribedRef.current) {
      console.log("[ProviderHome] ⏭️ Skipping - already subscribed to:", providerId);
      return;
    }

    // Cleanup previous subscription
    if (unsubscribeRef.current) {
      console.log("[ProviderHome] 🧹 Cleaning up previous subscription");
      unsubscribeRef.current();
      unsubscribeRef.current = null;
      isSubscribedRef.current = false;
    }

    // P0 DEBUG: Log conversation loading trigger
    console.log("[ProviderHome] 📥 useEffect triggered:", {
      isDevMock,
      activeProviderId: providerId,
      lastProviderId: lastProviderIdRef.current,
      willLoadMock: isDevMock && (!providerId || providerId.startsWith("dev-")),
      willSkip: !providerId,
    });

    lastProviderIdRef.current = providerId;

    if (isDevMock && (!providerId || providerId.startsWith("dev-"))) {
      loadMockConversations();
      const handleMockDataUpdate = () => loadMockConversations();
      window.addEventListener("mock-data-updated", handleMockDataUpdate);
      isSubscribedRef.current = true;
      return () => {
        window.removeEventListener("mock-data-updated", handleMockDataUpdate);
        isSubscribedRef.current = false;
      };
    }

    if (!providerId) {
      console.log("[ProviderHome] ⏸️ No activeProvider, setting loading=false");
      setLoading(false);
      return;
    }

    console.log("[ProviderHome] 🔄 Loading conversations for provider:", providerId);
    setLoading(true);
    setError(null);

    const conversationsQuery = query(
      collection(db, "conversations"),
      where("providerId", "==", providerId),
      orderBy("updatedAt", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(
      conversationsQuery,
      (snapshot) => {
        const conversations = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Conversation[];

        const active = conversations.find((c) => c.status === "active");
        const recent = conversations.filter((c) => c.status !== "active");

        // P0 DEBUG: Log loaded conversations
        console.log("[ProviderHome] ✅ Conversations loaded:", {
          total: conversations.length,
          hasActive: !!active,
          recentCount: recent.length,
          activeId: active?.id,
        });

        setActiveConversation(active || null);
        setRecentConversations(recent);
        setLoading(false);
      },
      (err) => {
        // P0 DEBUG: Log error details
        console.error("[ProviderHome] ❌ Error loading conversations:", {
          code: err.code,
          message: err.message,
          providerId: providerId,
        });
        // Use a hardcoded message to avoid t() in error handler
        setError("Erreur lors du chargement des conversations");
        setLoading(false);
      }
    );

    unsubscribeRef.current = unsubscribe;
    isSubscribedRef.current = true;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
        isSubscribedRef.current = false;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProvider?.id, isDevMock]);
  // NOTE: loadMockConversations and t removed from deps - they're stable and cause infinite loop if included

  // Provider data for KPIs
  const providerData = activeProvider as Record<string, unknown> | null;
  const aiQuotaUsed = (providerData?.aiCallsUsed as number) || 0;
  const aiQuotaTotal = (providerData?.aiCallsLimit as number) || (providerData?.aiQuota as number) || 100;
  const totalConversations = recentConversations.length + (activeConversation ? 1 : 0);
  const completedThisMonth = recentConversations.filter(c => {
    const date = c.updatedAt?.toDate();
    if (!date) return false;
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  const firstName = activeProvider?.name ? activeProvider.name.split(" ")[0] : "";

  // P0 FIX: Check if this is empty state (no conversations at all)
  // We now use a SINGLE layout structure to prevent layout shifts
  const isEmptyState = !loading && recentConversations.length === 0 && !activeConversation;

  // P0 DEBUG: Log state transitions
  console.log("[ProviderHome] 📐 Layout state:", {
    loading,
    isEmptyState,
    hasRecentConversations: recentConversations.length > 0,
    hasActiveConversation: !!activeConversation,
  });

  return (
    <div className="space-y-6">
      {/* Header - STABLE: Always rendered with same structure */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {isEmptyState
            ? t("provider:home.welcome", { name: firstName ? `, ${firstName}` : "" })
            : t("provider:home.hello", { name: firstName ? `, ${firstName}` : "" })}
        </h1>
        <p className="text-gray-500 mt-2 text-lg">
          {isEmptyState
            ? t("provider:home.subtitle")
            : activeConversation
              ? t("provider:home.hasActive")
              : t("provider:home.allUpdated")}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Hero Section - STABLE: Always rendered, content changes */}
      <section>
        {isEmptyState ? (
          /* Empty State Hero - Same min-height as ActiveConversationHero */
          <Card className="text-center py-12 border-0 shadow-lg bg-gradient-to-br from-gray-50 to-white min-h-[200px]">
            <CardContent className="flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-emerald-100 rounded-2xl flex items-center justify-center mb-5">
                <CheckCircle className="w-10 h-10 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {t("provider:home.welcomeTitle")}
              </h2>
              <p className="text-gray-500 max-w-md mx-auto">
                {t("provider:home.welcomeDescription")}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                {t("provider:home.readyToReceive")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <ActiveConversationHero conversation={activeConversation} loading={loading} />
        )}
      </section>

      {/* KPIs Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title={t("provider:dashboard.stats.myDossiers")}
          value={totalConversations}
          subtitle={t("provider:dashboard.stats.total")}
          icon={<MessageSquare className="w-6 h-6" />}
          variant="default"
        />
        <KPICard
          title={t("provider:dashboard.stats.completedThisMonth")}
          value={completedThisMonth}
          subtitle={t("provider:dashboard.stats.completed")}
          icon={<Calendar className="w-6 h-6" />}
          variant="success"
        />
        <KPICard
          title={t("provider:dashboard.quota.title")}
          value={`${aiQuotaUsed}/${aiQuotaTotal}`}
          subtitle={t("provider:dashboard.quota.usages")}
          icon={<Sparkles className="w-6 h-6" />}
          variant="primary"
        />
        <KPICard
          title={t("provider:sidebar.subscription")}
          value={activeConversation ? t("provider:dashboard.stats.inProgress") : t("provider:sidebar.active")}
          subtitle={activeConversation ? t("provider:home.hasActive") : t("provider:home.readyToReceive")}
          icon={<Users className="w-6 h-6" />}
          variant={activeConversation ? "warning" : "success"}
        />
      </section>

      {/* Quota Bar */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <QuotaBar
            used={aiQuotaUsed}
            total={aiQuotaTotal}
            label={t("provider:dashboard.quota.title")}
            size="md"
          />
        </CardContent>
      </Card>

      {/* Recent Conversations */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {t("provider:home.recentHistory")}
          </h2>
          {recentConversations.length > 0 && (
            <Link
              to="/dashboard/historique"
              className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
            >
              {t("provider:home.viewAll")}
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-12 h-12 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-36" />
                      <Skeleton className="h-4 w-56" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : recentConversations.length === 0 ? (
          <Card className="border border-dashed border-gray-200 bg-gray-50/50">
            <CardContent className="p-8 text-center text-gray-500">
              <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p>{t("provider:home.noPastConversations")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {recentConversations.slice(0, 5).map((conversation) => (
              <ConversationCard
                key={conversation.id}
                id={conversation.bookingId || conversation.id}
                clientName={conversation.clientName || conversation.clientFirstName || "Client"}
                subject={conversation.title || conversation.subject || "Consultation"}
                messagesCount={conversation.messagesCount}
                providerType={conversation.providerType}
                status={conversation.status}
                timeAgo={formatRelativeDate(conversation.lastMessageAt || conversation.updatedAt, t)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
