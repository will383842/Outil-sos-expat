/**
 * =============================================================================
 * CONVERSATION HISTORY - Historique complet des conversations
 * =============================================================================
 *
 * Page affichant l'historique complet des conversations du prestataire :
 * - Liste paginée de toutes les conversations
 * - Filtres par statut, date
 * - Recherche par nom de client
 *
 * =============================================================================
 */

import { useEffect, useState, useMemo, useCallback } from "react";
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
import { db } from "../../lib/firebase";
import { useProvider } from "../../contexts/UnifiedUserContext";
import { getMockData } from "../components/DevTestTools";
import { useLanguage } from "../../hooks/useLanguage";
import { Link } from "react-router-dom";

// UI
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Skeleton } from "../../components/ui/skeleton";

// Icons
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
  status?: "active" | "completed" | "archived" | "cancelled";
  messagesCount?: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  lastMessageAt?: Timestamp;
  providerType?: "lawyer" | "expat";
  duration?: number; // en minutes
}

type FilterStatus = "all" | "completed" | "archived" | "cancelled";

// =============================================================================
// COMPOSANTS
// =============================================================================

function ConversationCard({ conversation }: { conversation: Conversation }) {
  const { t, currentLocale } = useLanguage({ mode: "provider" });
  const clientName = conversation.clientName || conversation.clientFirstName || "Client";
  const subject = conversation.title || conversation.subject || "Consultation";
  const isLawyer = conversation.providerType === "lawyer";

  // Formatage de la date
  const formatDate = (timestamp?: Timestamp) => {
    if (!timestamp) return "—";
    const date = timestamp.toDate();
    const locale = currentLocale?.replace("-", "_") || "fr-FR";
    return date.toLocaleDateString(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Formatage de la durée
  const formatDuration = (minutes?: number) => {
    if (!minutes) return "—";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  // Statut avec couleur
  const getStatusConfig = (status?: string) => {
    switch (status) {
      case "completed":
        return {
          label: t("provider:conversationHistory.completed"),
          icon: CheckCircle,
          className: "bg-green-100 text-green-700",
        };
      case "archived":
        return {
          label: t("provider:conversationHistory.archived"),
          icon: CheckCircle,
          className: "bg-gray-100 text-gray-600",
        };
      case "cancelled":
        return {
          label: t("provider:conversationHistory.cancelled"),
          icon: XCircle,
          className: "bg-red-100 text-red-700",
        };
      default:
        return {
          label: t("provider:conversationHistory.active"),
          icon: Clock,
          className: "bg-amber-100 text-amber-700",
        };
    }
  };

  const statusConfig = getStatusConfig(conversation.status);
  const StatusIcon = statusConfig.icon;

  return (
    <Link
      to={`/dashboard/conversation/${conversation.bookingId || conversation.id}`}
      className="block"
    >
      <Card className="hover:shadow-md transition-shadow group">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Avatar type */}
            <div className={`p-2.5 rounded-xl ${isLawyer ? "bg-blue-50" : "bg-green-50"}`}>
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
                  <h3 className="font-semibold text-gray-900 group-hover:text-red-600 transition-colors">
                    {clientName}
                  </h3>
                  <p className="text-sm text-gray-600 mt-0.5">{subject}</p>
                </div>

                {/* Statut */}
                <span
                  className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${statusConfig.className}`}
                >
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
                    {t("provider:conversationHistory.exchanges", { count: conversation.messagesCount })}
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
            <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-red-500 group-hover:translate-x-1 transition-all flex-shrink-0 mt-2" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Skeleton className="w-12 h-12 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-60" />
            <div className="flex gap-4 mt-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// PAGE PRINCIPALE
// =============================================================================

const PAGE_SIZE = 10;

export default function ConversationHistory() {
  const { activeProvider } = useProvider();
  const { t } = useLanguage({ mode: "provider" });
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

  // Mode mock activé UNIQUEMENT avec ?dev=true dans l'URL
  const isDevMock = new URLSearchParams(window.location.search).get("dev") === "true";

  // Fonction pour charger les données mock
  const loadMockConversations = useCallback(() => {
    const mockData = getMockData();
    const pastConversations = mockData.conversations
      .filter((c) => c.status !== "active")
      .map((c) => ({
        ...c,
        createdAt: { toDate: () => c.createdAt } as unknown as Timestamp,
        updatedAt: { toDate: () => c.updatedAt } as unknown as Timestamp,
        lastMessageAt: { toDate: () => c.lastMessageAt } as unknown as Timestamp,
      })) as unknown as Conversation[];

    setConversations(pastConversations);
    setHasMore(false);
    setLoading(false);
  }, []);

  // Charger les conversations initiales
  useEffect(() => {
    // En mode mock (?dev=true) avec provider mock, utiliser les données mock
    if (isDevMock && (!activeProvider?.id || activeProvider.id.startsWith("dev-"))) {
      loadMockConversations();

      // Écouter les changements de données mock
      const handleMockDataUpdate = () => {
        loadMockConversations();
      };
      window.addEventListener("mock-data-updated", handleMockDataUpdate);

      return () => {
        window.removeEventListener("mock-data-updated", handleMockDataUpdate);
      };
    }

    if (!activeProvider?.id) {
      setLoading(false);
      return;
    }

    const loadConversations = async () => {
      setLoading(true);
      setError(null);

      try {
        // Optimisé: utiliser "in" au lieu de "!=" pour réduire les coûts Firestore
        // "!=" scanne toute la collection, "in" ne lit que les docs correspondants
        let q = query(
          collection(db, "conversations"),
          where("providerId", "==", activeProvider.id),
          where("status", "in", ["completed", "archived", "cancelled"]),
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
        setError(t("provider:conversationHistory.loadError"));
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [activeProvider?.id, isDevMock, loadMockConversations]);

  // Charger plus
  const loadMore = async () => {
    if (!activeProvider?.id || !lastDoc || loadingMore) return;

    setLoadingMore(true);

    try {
      // Optimisé: utiliser "in" au lieu de "!=" pour réduire les coûts Firestore
      let q = query(
        collection(db, "conversations"),
        where("providerId", "==", activeProvider.id),
        where("status", "in", ["completed", "archived", "cancelled"]),
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

    // Filtre par statut
    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }

    // Filtre par recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          (c.clientName?.toLowerCase().includes(query) ?? false) ||
          (c.clientFirstName?.toLowerCase().includes(query) ?? false) ||
          (c.title?.toLowerCase().includes(query) ?? false) ||
          (c.subject?.toLowerCase().includes(query) ?? false)
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("provider:conversationHistory.title")}</h1>
        <p className="text-gray-500 mt-1">
          {t("provider:conversationHistory.conversationCount", { count: stats.total })}
        </p>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Recherche */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder={t("provider:conversationHistory.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Bouton filtres */}
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
        >
          <Filter className="w-4 h-4" />
          {t("provider:conversationHistory.filters")}
          <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
        </Button>
      </div>

      {/* Filtres dépliables */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-500 mr-2">{t("provider:conversationHistory.statusFilter")}</span>
              {[
                { value: "all", label: t("provider:conversationHistory.filterAll") },
                { value: "completed", label: t("provider:conversationHistory.filterCompleted") },
                { value: "archived", label: t("provider:conversationHistory.filterArchived") },
                { value: "cancelled", label: t("provider:conversationHistory.filterCancelled") },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setStatusFilter(option.value as FilterStatus)}
                  className={`px-4 py-2.5 text-sm rounded-full transition-colors min-h-[44px] ${
                    statusFilter === option.value
                      ? "bg-red-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Erreur */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Liste des conversations */}
      <div className="space-y-3">
        {loading ? (
          // Skeletons
          Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
        ) : filteredConversations.length === 0 ? (
          // État vide
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                {searchQuery || statusFilter !== "all"
                  ? t("provider:conversationHistory.noResults")
                  : t("provider:conversationHistory.noPastConversations")}
              </h3>
              <p className="text-gray-500">
                {searchQuery || statusFilter !== "all"
                  ? t("provider:conversationHistory.modifySearch")
                  : t("provider:conversationHistory.comingHere")}
              </p>
            </CardContent>
          </Card>
        ) : (
          // Liste
          <>
            {filteredConversations.map((conversation) => (
              <ConversationCard key={conversation.id} conversation={conversation} />
            ))}

            {/* Bouton charger plus */}
            {hasMore && !searchQuery && statusFilter === "all" && (
              <div className="text-center pt-4">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="min-w-[200px]"
                >
                  {loadingMore ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      {t("provider:conversationHistory.loading")}
                    </>
                  ) : (
                    t("provider:conversationHistory.loadMore")
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
