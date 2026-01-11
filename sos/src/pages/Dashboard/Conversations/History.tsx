/**
 * Conversation History - Historique des conversations IA
 * Pour les prestataires (avocats et expatriés aidants)
 */

import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useLocaleNavigate } from "../../../multilingual-system";
import { getTranslatedRouteSlug, type RouteKey } from "../../../multilingual-system/core/routing/localeRoutes";
import { useIntl } from "react-intl";
import { useApp } from "../../../contexts/AppContext";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  Timestamp,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "../../../config/firebase";
import { useAuth } from "../../../contexts/AuthContext";
import {
  MessageSquare,
  Clock,
  ArrowRight,
  Search,
  Filter,
  Scale,
  Globe,
  CheckCircle,
  XCircle,
  Calendar,
  ChevronDown,
  Bot,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { cn } from "../../../utils/cn";
import { getDateLocale } from "../../../utils/formatters";

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
  status?: "active" | "completed" | "archived" | "cancelled";
  messagesCount?: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  lastMessageAt?: Timestamp;
  providerType?: "lawyer" | "expat";
  duration?: number;
}

type FilterStatus = "all" | "completed" | "archived" | "cancelled";

// =============================================================================
// COMPOSANTS
// =============================================================================

function ConversationCard({ conversation }: { conversation: Conversation }) {
  const intl = useIntl();
  const { language: locale } = useApp();

  const clientName = conversation.clientName || conversation.clientFirstName || intl.formatMessage({ id: 'common.client' });
  const subject = conversation.title || conversation.subject || intl.formatMessage({ id: 'common.consultation' });
  const isLawyer = conversation.providerType === "lawyer";

  const formatDate = (timestamp?: Timestamp) => {
    if (!timestamp) return "—";
    const date = timestamp.toDate();
    return date.toLocaleDateString(getDateLocale(locale), {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return "—";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const getStatusConfig = (status?: string) => {
    switch (status) {
      case "completed":
        return {
          label: intl.formatMessage({ id: 'status.completed' }),
          icon: CheckCircle,
          className: "bg-green-100 text-green-700",
        };
      case "archived":
        return {
          label: intl.formatMessage({ id: 'status.archived' }),
          icon: CheckCircle,
          className: "bg-gray-100 text-gray-600",
        };
      case "cancelled":
        return {
          label: intl.formatMessage({ id: 'status.cancelled' }),
          icon: XCircle,
          className: "bg-red-100 text-red-700",
        };
      default:
        return {
          label: intl.formatMessage({ id: 'status.inProgress' }),
          icon: Clock,
          className: "bg-amber-100 text-amber-700",
        };
    }
  };

  const statusConfig = getStatusConfig(conversation.status);
  const StatusIcon = statusConfig.icon;

  return (
    <Link
      to={`/dashboard/conversations/${conversation.bookingId || conversation.id}`}
      className="block"
    >
      <div className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow group p-4">
        <div className="flex items-start gap-4">
          {/* Avatar type */}
          <div className={cn(
            "p-2.5 rounded-xl",
            isLawyer ? "bg-blue-50" : "bg-green-50"
          )}>
            {isLawyer ? (
              <Scale className="w-5 h-5 text-blue-600" />
            ) : (
              <Globe className="w-5 h-5 text-green-600" />
            )}
          </div>

          {/* Contenu */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                  {clientName}
                </h3>
                <p className="text-sm text-gray-600 mt-0.5">{subject}</p>
              </div>

              {/* Statut */}
              <span className={cn(
                "flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap",
                statusConfig.className
              )}>
                <StatusIcon className="w-3 h-3" />
                {statusConfig.label}
              </span>
            </div>

            {/* Métadonnées */}
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(conversation.createdAt)}
              </span>
              {conversation.messagesCount && (
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-4 h-4" />
                  {conversation.messagesCount} {intl.formatMessage({ id: 'conversations.exchanges' })}
                </span>
              )}
              {conversation.duration && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatDuration(conversation.duration)}
                </span>
              )}
            </div>
          </div>

          {/* Arrow */}
          <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all flex-shrink-0 mt-2" />
        </div>
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gray-200 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-60 bg-gray-200 rounded animate-pulse" />
          <div className="flex gap-4 mt-3">
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// PAGE PRINCIPALE
// =============================================================================

const PAGE_SIZE = 10;

export const ConversationHistory: React.FC = () => {
  const intl = useIntl();
  const { language: locale } = useApp();
  const navigate = useLocaleNavigate();
  const { user } = useAuth();

  // ✅ FIX: Calculate translated routes based on current language
  const langCode = (locale || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';
  const translatedRoutes = useMemo(() => {
    const aiAssistantSlug = getTranslatedRouteSlug('dashboard-ai-assistant' as RouteKey, langCode);
    return {
      aiAssistant: `/${aiAssistantSlug}`,
    };
  }, [langCode]);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtres
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Charger les conversations initiales
  useEffect(() => {
    const providerId = user?.uid;

    if (!providerId) {
      setLoading(false);
      return;
    }

    const loadConversations = async () => {
      setLoading(true);
      setError(null);

      try {
        const q = query(
          collection(db, "conversations"),
          where("providerId", "==", providerId),
          orderBy("updatedAt", "desc"),
          limit(PAGE_SIZE)
        );

        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Conversation[];

        setConversations(data);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
        setHasMore(snapshot.docs.length === PAGE_SIZE);
      } catch (err) {
        console.error("[ConversationHistory] Error loading:", err);
        setError(intl.formatMessage({ id: 'conversations.loadError' }));
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [user?.uid, locale]);

  // Charger plus
  const loadMore = async () => {
    const providerId = user?.uid;
    if (!providerId || !lastDoc || loadingMore) return;

    setLoadingMore(true);

    try {
      const q = query(
        collection(db, "conversations"),
        where("providerId", "==", providerId),
        orderBy("updatedAt", "desc"),
        startAfter(lastDoc),
        limit(PAGE_SIZE)
      );

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Conversation[];

      setConversations((prev) => [...prev, ...data]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error("[ConversationHistory] Error loading more:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Filtrer les conversations localement
  const filteredConversations = useMemo(() => {
    let filtered = conversations;

    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          (c.clientName?.toLowerCase().includes(q) ?? false) ||
          (c.clientFirstName?.toLowerCase().includes(q) ?? false) ||
          (c.title?.toLowerCase().includes(q) ?? false) ||
          (c.subject?.toLowerCase().includes(q) ?? false)
      );
    }

    return filtered;
  }, [conversations, statusFilter, searchQuery]);

  // Statistiques
  const stats = useMemo(() => {
    const completed = conversations.filter((c) => c.status === "completed").length;
    const archived = conversations.filter((c) => c.status === "archived").length;
    const cancelled = conversations.filter((c) => c.status === "cancelled").length;
    return { total: conversations.length, completed, archived, cancelled };
  }, [conversations]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(translatedRoutes.aiAssistant)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {intl.formatMessage({ id: 'conversations.historyTitle' })}
                </h1>
                <p className="text-gray-500 mt-0.5">
                  {intl.formatMessage({ id: 'conversations.count' }, { count: stats.total })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Barre de recherche et filtres */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={intl.formatMessage({ id: 'conversations.searchPlaceholder' })}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-4 h-4" />
            {intl.formatMessage({ id: 'common.filters' })}
            <ChevronDown className={cn("w-4 h-4 transition-transform", showFilters && "rotate-180")} />
          </button>
        </div>

        {/* Filtres dépliables */}
        {showFilters && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-500 mr-2">
                {intl.formatMessage({ id: 'conversations.status' })}
              </span>
              {[
                { value: "all", label: intl.formatMessage({ id: 'common.all' }) },
                { value: "completed", label: intl.formatMessage({ id: 'status.completed' }) },
                { value: "archived", label: intl.formatMessage({ id: 'status.archived' }) },
                { value: "cancelled", label: intl.formatMessage({ id: 'status.cancelled' }) },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setStatusFilter(option.value as FilterStatus)}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-full transition-colors",
                    statusFilter === option.value
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 mb-6">
            {error}
          </div>
        )}

        {/* Liste des conversations */}
        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
          ) : filteredConversations.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 py-12 text-center">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                {searchQuery || statusFilter !== "all"
                  ? intl.formatMessage({ id: 'conversations.noResults' })
                  : intl.formatMessage({ id: 'conversations.noConversations' })}
              </h3>
              <p className="text-gray-500">
                {searchQuery || statusFilter !== "all"
                  ? intl.formatMessage({ id: 'conversations.tryChangingCriteria' })
                  : intl.formatMessage({ id: 'conversations.willAppearHere' })}
              </p>
            </div>
          ) : (
            <>
              {filteredConversations.map((conversation) => (
                <ConversationCard key={conversation.id} conversation={conversation} />
              ))}

              {hasMore && !searchQuery && statusFilter === "all" && (
                <div className="text-center pt-4">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="px-6 py-2.5 bg-white border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    {loadingMore ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {intl.formatMessage({ id: 'common.loading' })}
                      </span>
                    ) : (
                      intl.formatMessage({ id: 'common.loadMore' })
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationHistory;
