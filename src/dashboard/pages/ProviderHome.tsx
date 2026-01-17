/**
 * =============================================================================
 * PROVIDER HOME - Page d'accueil de l'espace prestataire
 * =============================================================================
 *
 * Page principale centrée sur les conversations :
 * - Conversation en cours (si active) avec CTA proéminent
 * - Historique des conversations récentes
 * - Interface épurée, sans stats inutiles
 *
 * =============================================================================
 */

import { useEffect, useState, useCallback } from "react";
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
import { getMockData, type MockConversation } from "../components/DevTestTools";
import { useLanguage } from "../../hooks/useLanguage";
import { Link } from "react-router-dom";

// UI
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";

// Icons
import {
  MessageSquare,
  Clock,
  ArrowRight,
  User,
  Scale,
  Globe,
  CheckCircle,
  Sparkles,
  AlertCircle,
  History as HistoryIcon,
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
// COMPOSANTS
// =============================================================================

function ActiveConversationCard({
  conversation,
  loading,
}: {
  conversation: Conversation | null;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card className="border-2 border-red-200 bg-red-50/30">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-60" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <Skeleton className="h-10 w-full mt-4" />
        </CardContent>
      </Card>
    );
  }

  if (!conversation) {
    return (
      <Card className="border border-dashed border-gray-300 bg-gray-50/50">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            Aucune conversation active
          </h3>
          <p className="text-gray-500 text-sm">
            Toutes vos consultations sont terminées. Les nouvelles demandes apparaîtront ici.
          </p>
        </CardContent>
      </Card>
    );
  }

  const clientName = conversation.clientName || conversation.clientFirstName || "Client";
  const subject = conversation.title || conversation.subject || "Consultation";
  const isLawyer = conversation.providerType === "lawyer";

  // Calculer le temps écoulé
  const startTime = conversation.createdAt?.toDate() || new Date();
  const elapsed = Math.floor((Date.now() - startTime.getTime()) / 60000); // minutes
  const elapsedDisplay = elapsed < 60 ? `${elapsed} min` : `${Math.floor(elapsed / 60)}h ${elapsed % 60}min`;

  return (
    <Card className="border-2 border-red-200 bg-gradient-to-r from-red-50/50 to-white shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full flex items-center gap-1">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            En cours
          </span>
        </div>

        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className={`p-3 rounded-xl ${isLawyer ? "bg-blue-100" : "bg-green-100"}`}>
            {isLawyer ? (
              <Scale className="w-6 h-6 text-blue-600" />
            ) : (
              <Globe className="w-6 h-6 text-green-600" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900">{clientName}</h3>
            <p className="text-gray-600">{subject}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Commencée il y a {elapsedDisplay}
              </span>
              {conversation.messagesCount && (
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-4 h-4" />
                  {conversation.messagesCount} échanges
                </span>
              )}
            </div>
          </div>
        </div>

        {/* CTA */}
        <Link to={`/dashboard/conversation/${conversation.bookingId || conversation.id}`} className="block mt-4">
          <Button className="w-full bg-red-600 hover:bg-red-700 text-white h-12 text-base">
            Continuer la conversation
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function ConversationListItem({ conversation }: { conversation: Conversation }) {
  const clientName = conversation.clientName || conversation.clientFirstName || "Client";
  const subject = conversation.title || conversation.subject || "Consultation";
  const isLawyer = conversation.providerType === "lawyer";

  // Formatage de la date relative
  const formatRelativeDate = (timestamp?: Timestamp) => {
    if (!timestamp) return "—";
    const date = timestamp.toDate();
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `il y a ${diffMins} min`;
    if (diffHours < 24) return `il y a ${diffHours}h`;
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return `il y a ${diffDays} jours`;
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  return (
    <Link
      to={`/dashboard/conversation/${conversation.bookingId || conversation.id}`}
      className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors rounded-lg group"
    >
      {/* Avatar */}
      <div className={`p-2 rounded-lg ${isLawyer ? "bg-blue-50" : "bg-green-50"}`}>
        {isLawyer ? (
          <Scale className="w-5 h-5 text-blue-600" />
        ) : (
          <Globe className="w-5 h-5 text-green-600" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="font-medium text-gray-900 truncate group-hover:text-red-600 transition-colors">
            {clientName}
          </p>
          <span className="text-sm text-gray-500 ml-2 whitespace-nowrap">
            {formatRelativeDate(conversation.lastMessageAt || conversation.updatedAt)}
          </span>
        </div>
        <p className="text-sm text-gray-500 truncate">{subject}</p>
        {conversation.messagesCount && (
          <p className="text-xs text-gray-400 mt-0.5">
            {conversation.messagesCount} échanges avec l'IA
          </p>
        )}
      </div>

      {/* Arrow */}
      <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-red-500 group-hover:translate-x-1 transition-all" />
    </Link>
  );
}

// =============================================================================
// PAGE PRINCIPALE
// =============================================================================

export default function ProviderHome() {
  const { activeProvider } = useProvider();
  const [loading, setLoading] = useState(true);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [recentConversations, setRecentConversations] = useState<Conversation[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Mode mock activé UNIQUEMENT avec ?dev=true dans l'URL
  const isDevMock = new URLSearchParams(window.location.search).get("dev") === "true";

  // Fonction pour charger les données mock
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

  // Charger les conversations
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

    setLoading(true);
    setError(null);

    // Query pour les conversations du provider
    const conversationsQuery = query(
      collection(db, "conversations"),
      where("providerId", "==", activeProvider.id),
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

        // Séparer la conversation active des autres
        const active = conversations.find((c) => c.status === "active");
        const recent = conversations.filter((c) => c.status !== "active");

        setActiveConversation(active || null);
        setRecentConversations(recent);
        setLoading(false);
      },
      (err) => {
        console.error("[ProviderHome] Error loading conversations:", err);
        setError("Impossible de charger les conversations");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [activeProvider?.id, isDevMock, loadMockConversations]);

  // État vide (premier usage)
  if (!loading && recentConversations.length === 0 && !activeConversation) {
    return (
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Bienvenue{activeProvider?.name ? `, ${activeProvider.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-gray-500 mt-1">Votre espace de consultation IA</p>
        </div>

        {/* État vide */}
        <Card className="text-center py-12">
          <CardContent>
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-10 h-10 text-purple-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Bienvenue sur votre espace
            </h2>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              Vos conversations avec les clients apparaîtront ici dès qu'une nouvelle demande vous sera attribuée.
            </p>
            <p className="text-sm text-gray-400">
              En attendant, vous pouvez compléter votre profil pour optimiser les réponses de l'IA.
            </p>
            <Link to="/dashboard/profil" className="inline-block mt-4">
              <Button variant="outline">
                Compléter mon profil
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bonjour{activeProvider?.name ? `, ${activeProvider.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-gray-500 mt-1">
          {activeConversation ? "Vous avez une conversation en cours" : "Toutes vos consultations sont à jour"}
        </p>
      </div>

      {/* Erreur */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Conversation active */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Conversation en cours
        </h2>
        <ActiveConversationCard conversation={activeConversation} loading={loading} />
      </section>

      {/* Historique récent */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Historique récent
          </h2>
          {recentConversations.length > 0 && (
            <Link to="/dashboard/historique" className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1">
              Voir tout
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="w-10 h-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentConversations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <HistoryIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p>Aucune conversation passée</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentConversations.slice(0, 5).map((conversation) => (
                  <ConversationListItem key={conversation.id} conversation={conversation} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
