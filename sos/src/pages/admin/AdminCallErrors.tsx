import React, { useState, useEffect, useCallback } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  Timestamp,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import AdminLayout from "../../components/admin/AdminLayout";
import ErrorBoundary from "../../components/common/ErrorBoundary";
import {
  Phone,
  PhoneOff,
  RefreshCw,
  Search,
  X,
  Calendar,
  User,
  Globe,
  AlertCircle,
  Wifi,
  WifiOff,
  Ban,
  Clock,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Signal,
} from "lucide-react";

// Types pour les erreurs d'appel
interface CallError {
  id: string;
  sessionId: string;
  participantType: "client" | "provider";
  callSid: string;
  callStatus: string;
  sipCode: string | null;
  sipMeaning: string | null;
  sipCategory: string | null;
  sipUserFriendly: string | null;
  q850Code: string | null;
  q850Meaning: string | null;
  stirShakenStatus: string | null;
  stirShakenLevel: string | null;
  stirShakenDescription: string | null;
  carrierName: string | null;
  carrierCountry: string | null;
  fromCountry: string | null;
  toCountry: string | null;
  errorSource: string;
  errorSummary: string;
  createdAt: Timestamp;
}

// Catégories d'erreurs avec icônes et couleurs
const ERROR_CATEGORIES: Record<string, {
  icon: React.ElementType;
  color: string;
  bgColor: string;
  label: string;
  description: string;
}> = {
  recipient_unavailable: {
    icon: PhoneOff,
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    label: "Destinataire indisponible",
    description: "Le téléphone est éteint, en mode avion ou hors réseau",
  },
  recipient_busy: {
    icon: Phone,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
    label: "Ligne occupée",
    description: "Le destinataire est déjà en communication",
  },
  recipient_declined: {
    icon: Ban,
    color: "text-red-600",
    bgColor: "bg-red-100",
    label: "Appel refusé",
    description: "Le destinataire a refusé l'appel",
  },
  network_error: {
    icon: WifiOff,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    label: "Erreur réseau",
    description: "Problème de réseau ou opérateur indisponible",
  },
  invalid_number: {
    icon: AlertCircle,
    color: "text-red-700",
    bgColor: "bg-red-100",
    label: "Numéro invalide",
    description: "Le numéro de téléphone n'existe pas ou est mal formaté",
  },
  timeout: {
    icon: Clock,
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    label: "Délai dépassé",
    description: "Le délai de connexion a expiré",
  },
  blocked: {
    icon: Ban,
    color: "text-red-800",
    bgColor: "bg-red-200",
    label: "Appel bloqué",
    description: "L'appel a été bloqué (spam filter ou permissions)",
  },
  geo_permission: {
    icon: Globe,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    label: "Permission géographique",
    description: "La destination n'est pas autorisée dans les paramètres Twilio",
  },
  caller_cancelled: {
    icon: X,
    color: "text-gray-500",
    bgColor: "bg-gray-100",
    label: "Appel annulé",
    description: "L'appelant a annulé avant la connexion",
  },
  server_error: {
    icon: AlertCircle,
    color: "text-red-600",
    bgColor: "bg-red-100",
    label: "Erreur serveur",
    description: "Erreur interne Twilio",
  },
  recipient: {
    icon: User,
    color: "text-orange-500",
    bgColor: "bg-orange-50",
    label: "Pas de réponse",
    description: "Le destinataire n'a pas décroché",
  },
  system: {
    icon: AlertCircle,
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    label: "Système",
    description: "Annulation par le système",
  },
  unknown: {
    icon: HelpCircle,
    color: "text-gray-500",
    bgColor: "bg-gray-100",
    label: "Inconnu",
    description: "Cause non identifiée",
  },
};

// Composant pour afficher le badge STIR/SHAKEN
const StirShakenBadge: React.FC<{ status: string | null }> = ({ status }) => {
  if (!status) return null;

  const getColor = () => {
    switch (status.toUpperCase()) {
      case 'A': return 'bg-green-100 text-green-800';
      case 'B': return 'bg-yellow-100 text-yellow-800';
      case 'C': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTooltip = () => {
    switch (status.toUpperCase()) {
      case 'A': return 'Attestation complète - Numéro vérifié';
      case 'B': return 'Attestation partielle - Client vérifié';
      case 'C': return 'Attestation minimale - Risque de blocage';
      default: return 'Statut inconnu';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getColor()}`}
      title={getTooltip()}
    >
      <Signal className="w-3 h-3 mr-1" />
      STIR/SHAKEN: {status.toUpperCase()}
    </span>
  );
};

// Composant pour la carte d'erreur détaillée
const CallErrorCard: React.FC<{ error: CallError; isExpanded: boolean; onToggle: () => void }> = ({
  error,
  isExpanded,
  onToggle
}) => {
  const category = ERROR_CATEGORIES[error.errorSource] || ERROR_CATEGORIES.unknown;
  const CategoryIcon = category.icon;

  const formatDate = (timestamp: Timestamp) => {
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-3">
      {/* Header avec résumé */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            {/* Icône de catégorie */}
            <div className={`p-2 rounded-lg ${category.bgColor}`}>
              <CategoryIcon className={`w-5 h-5 ${category.color}`} />
            </div>

            {/* Infos principales */}
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className={`font-medium ${category.color}`}>
                  {category.label}
                </span>
                <span className="text-xs text-gray-500">
                  {error.participantType === 'client' ? 'Client' : 'Prestataire'}
                </span>
                {error.stirShakenStatus && (
                  <StirShakenBadge status={error.stirShakenStatus} />
                )}
              </div>

              <p className="text-sm text-gray-700 mt-1">
                {error.errorSummary || error.sipUserFriendly || category.description}
              </p>

              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                <span className="flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  {formatDate(error.createdAt)}
                </span>
                {error.toCountry && (
                  <span className="flex items-center">
                    <Globe className="w-3 h-3 mr-1" />
                    {error.fromCountry} → {error.toCountry}
                  </span>
                )}
                {error.carrierName && (
                  <span className="flex items-center">
                    <Wifi className="w-3 h-3 mr-1" />
                    {error.carrierName}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bouton expand */}
          <button className="text-gray-400 hover:text-gray-600">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Détails techniques (expandable) */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50">
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Détails techniques</h4>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            {error.sipCode && (
              <div className="bg-white p-2 rounded border">
                <span className="text-xs text-gray-500 block">Code SIP</span>
                <span className="font-mono font-medium">{error.sipCode}</span>
                {error.sipMeaning && (
                  <span className="text-xs text-gray-400 block">{error.sipMeaning}</span>
                )}
              </div>
            )}

            {error.q850Code && (
              <div className="bg-white p-2 rounded border">
                <span className="text-xs text-gray-500 block">Code Q850</span>
                <span className="font-mono font-medium">{error.q850Code}</span>
                {error.q850Meaning && (
                  <span className="text-xs text-gray-400 block">{error.q850Meaning}</span>
                )}
              </div>
            )}

            {error.stirShakenStatus && (
              <div className="bg-white p-2 rounded border">
                <span className="text-xs text-gray-500 block">STIR/SHAKEN</span>
                <span className="font-mono font-medium">{error.stirShakenStatus}</span>
                {error.stirShakenDescription && (
                  <span className="text-xs text-gray-400 block">{error.stirShakenDescription}</span>
                )}
              </div>
            )}

            <div className="bg-white p-2 rounded border">
              <span className="text-xs text-gray-500 block">Statut appel</span>
              <span className="font-mono font-medium">{error.callStatus}</span>
            </div>

            <div className="bg-white p-2 rounded border">
              <span className="text-xs text-gray-500 block">Session ID</span>
              <span className="font-mono text-xs">{error.sessionId.slice(0, 12)}...</span>
            </div>

            <div className="bg-white p-2 rounded border">
              <span className="text-xs text-gray-500 block">Call SID</span>
              <span className="font-mono text-xs">{error.callSid.slice(0, 12)}...</span>
            </div>
          </div>

          {/* Explication de la cause */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <h5 className="text-xs font-semibold text-blue-700 uppercase mb-1">Cause probable</h5>
            <p className="text-sm text-blue-800">{category.description}</p>

            {error.stirShakenStatus?.toUpperCase() === 'C' && (
              <p className="text-xs text-blue-600 mt-2">
                <AlertCircle className="w-3 h-3 inline mr-1" />
                Le niveau STIR/SHAKEN C peut causer des rejets par les opérateurs.
                Enregistrez votre entreprise sur Twilio Trust Hub pour améliorer ce statut.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const AdminCallErrors: React.FC = () => {
  const [errors, setErrors] = useState<CallError[]>([]);
  const [filteredErrors, setFilteredErrors] = useState<CallError[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filtres
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [participantFilter, setParticipantFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const BATCH_SIZE = 20;

  // Charger les erreurs
  const loadErrors = useCallback(async (reset = false) => {
    try {
      if (reset) {
        setIsLoading(true);
        setLastDoc(null);
      }

      const errorsRef = collection(db, "call_errors");
      let q = query(
        errorsRef,
        orderBy("createdAt", "desc"),
        limit(BATCH_SIZE)
      );

      // Filtre par date
      if (dateFilter !== "all") {
        const now = new Date();
        let startDate: Date;

        switch (dateFilter) {
          case "today":
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
          case "week":
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case "month":
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
          default:
            startDate = new Date(0);
        }

        q = query(
          errorsRef,
          where("createdAt", ">=", Timestamp.fromDate(startDate)),
          orderBy("createdAt", "desc"),
          limit(BATCH_SIZE)
        );
      }

      if (!reset && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const newErrors: CallError[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        newErrors.push({
          id: doc.id,
          sessionId: data.sessionId || "",
          participantType: data.participantType || "client",
          callSid: data.callSid || "",
          callStatus: data.callStatus || "",
          sipCode: data.sipCode || null,
          sipMeaning: data.sipMeaning || null,
          sipCategory: data.sipCategory || null,
          sipUserFriendly: data.sipUserFriendly || null,
          q850Code: data.q850Code || null,
          q850Meaning: data.q850Meaning || null,
          stirShakenStatus: data.stirShakenStatus || null,
          stirShakenLevel: data.stirShakenLevel || null,
          stirShakenDescription: data.stirShakenDescription || null,
          carrierName: data.carrierName || null,
          carrierCountry: data.carrierCountry || null,
          fromCountry: data.fromCountry || null,
          toCountry: data.toCountry || null,
          errorSource: data.errorSource || "unknown",
          errorSummary: data.errorSummary || "",
          createdAt: data.createdAt || Timestamp.now(),
        });
      });

      if (snapshot.docs.length > 0) {
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      }

      setHasMore(snapshot.docs.length === BATCH_SIZE);

      if (reset) {
        setErrors(newErrors);
      } else {
        setErrors((prev) => [...prev, ...newErrors]);
      }

      setLoadError(null);
    } catch (err) {
      console.error("Error loading call errors:", err);
      setLoadError("Erreur lors du chargement des erreurs d'appel");
    } finally {
      setIsLoading(false);
    }
  }, [dateFilter, lastDoc]);

  // Appliquer les filtres
  useEffect(() => {
    let filtered = [...errors];

    // Filtre par catégorie
    if (categoryFilter !== "all") {
      filtered = filtered.filter((e) => e.errorSource === categoryFilter);
    }

    // Filtre par participant
    if (participantFilter !== "all") {
      filtered = filtered.filter((e) => e.participantType === participantFilter);
    }

    // Filtre par recherche
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.sessionId.toLowerCase().includes(lowerQuery) ||
          e.callSid.toLowerCase().includes(lowerQuery) ||
          e.errorSummary.toLowerCase().includes(lowerQuery) ||
          e.carrierName?.toLowerCase().includes(lowerQuery) ||
          e.sipCode?.includes(lowerQuery) ||
          e.q850Code?.includes(lowerQuery)
      );
    }

    setFilteredErrors(filtered);
  }, [errors, categoryFilter, participantFilter, searchQuery]);

  // Charger au montage
  useEffect(() => {
    loadErrors(true);
  }, [dateFilter]);

  // Onglet actif (liste ou analytics)
  const [activeTab, setActiveTab] = useState<"list" | "analytics">("list");

  // Statistiques de base
  const stats = {
    total: errors.length,
    byCategory: errors.reduce((acc, e) => {
      acc[e.errorSource] = (acc[e.errorSource] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    stirShakenC: errors.filter((e) => e.stirShakenStatus?.toUpperCase() === "C").length,
  };

  // Analytics avancés
  const analytics = React.useMemo(() => {
    // Erreurs par pays de destination
    const byCountry: Record<string, { total: number; blocked: number; networkError: number }> = {};
    // Erreurs par opérateur
    const byCarrier: Record<string, { total: number; categories: Record<string, number> }> = {};
    // Erreurs par code SIP
    const bySipCode: Record<string, { count: number; meaning: string | null }> = {};
    // Erreurs par STIR/SHAKEN
    const byStirShaken: Record<string, number> = {};

    errors.forEach((e) => {
      // Par pays
      const country = e.toCountry || "Inconnu";
      if (!byCountry[country]) {
        byCountry[country] = { total: 0, blocked: 0, networkError: 0 };
      }
      byCountry[country].total++;
      if (e.errorSource === "blocked" || e.errorSource === "geo_permission") {
        byCountry[country].blocked++;
      }
      if (e.errorSource === "network_error") {
        byCountry[country].networkError++;
      }

      // Par opérateur
      const carrier = e.carrierName || "Inconnu";
      if (!byCarrier[carrier]) {
        byCarrier[carrier] = { total: 0, categories: {} };
      }
      byCarrier[carrier].total++;
      byCarrier[carrier].categories[e.errorSource] = (byCarrier[carrier].categories[e.errorSource] || 0) + 1;

      // Par code SIP
      if (e.sipCode) {
        if (!bySipCode[e.sipCode]) {
          bySipCode[e.sipCode] = { count: 0, meaning: e.sipMeaning };
        }
        bySipCode[e.sipCode].count++;
      }

      // Par STIR/SHAKEN
      const stirStatus = e.stirShakenStatus?.toUpperCase() || "N/A";
      byStirShaken[stirStatus] = (byStirShaken[stirStatus] || 0) + 1;
    });

    // Trier par nombre d'erreurs
    const sortedCountries = Object.entries(byCountry)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10);

    const sortedCarriers = Object.entries(byCarrier)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10);

    const sortedSipCodes = Object.entries(bySipCode)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);

    // Détecter les alertes (problèmes systémiques)
    const alerts: { type: "critical" | "warning"; message: string; details: string }[] = [];

    // Alerte si un pays a plus de 80% d'erreurs bloquées
    sortedCountries.forEach(([country, data]) => {
      if (data.total >= 3) {
        const blockedPercent = (data.blocked / data.total) * 100;
        if (blockedPercent >= 80) {
          alerts.push({
            type: "critical",
            message: `Les appels vers ${country} sont bloqués à ${blockedPercent.toFixed(0)}%`,
            details: `${data.blocked}/${data.total} appels bloqués. Vérifiez les permissions Twilio pour ce pays.`,
          });
        } else if (blockedPercent >= 50) {
          alerts.push({
            type: "warning",
            message: `Taux de blocage élevé vers ${country}: ${blockedPercent.toFixed(0)}%`,
            details: `${data.blocked}/${data.total} appels bloqués.`,
          });
        }
      }
    });

    // Alerte si un opérateur bloque beaucoup d'appels
    sortedCarriers.forEach(([carrier, data]) => {
      if (data.total >= 3 && carrier !== "Inconnu") {
        const blocked = data.categories["blocked"] || 0;
        const blockedPercent = (blocked / data.total) * 100;
        if (blockedPercent >= 50) {
          alerts.push({
            type: "warning",
            message: `L'opérateur ${carrier} bloque ${blockedPercent.toFixed(0)}% des appels`,
            details: `${blocked}/${data.total} appels bloqués par cet opérateur.`,
          });
        }
      }
    });

    // Alerte si beaucoup de STIR/SHAKEN C
    const totalWithStir = Object.values(byStirShaken).reduce((a, b) => a + b, 0);
    const stirCPercent = totalWithStir > 0 ? ((byStirShaken["C"] || 0) / totalWithStir) * 100 : 0;
    if (stirCPercent >= 50 && totalWithStir >= 5) {
      alerts.push({
        type: "critical",
        message: `${stirCPercent.toFixed(0)}% des appels ont un STIR/SHAKEN niveau C`,
        details: "Enregistrez votre entreprise sur Twilio Trust Hub pour améliorer l'attestation.",
      });
    }

    return {
      byCountry: sortedCountries,
      byCarrier: sortedCarriers,
      bySipCode: sortedSipCodes,
      byStirShaken,
      alerts,
    };
  }, [errors]);

  return (
    <ErrorBoundary>
      <AdminLayout>
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <PhoneOff className="w-7 h-7 mr-3 text-red-600" />
              Erreurs d'appels Twilio
            </h1>
            <p className="text-gray-600 mt-1">
              Diagnostic détaillé des appels échoués pour identifier la source des problèmes
            </p>
          </div>

          {/* Statistiques rapides */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-500">Total erreurs</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="text-2xl font-bold text-orange-600">
                {stats.byCategory.recipient_unavailable || 0}
              </div>
              <div className="text-sm text-gray-500">Téléphone éteint</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="text-2xl font-bold text-purple-600">
                {stats.byCategory.network_error || 0}
              </div>
              <div className="text-sm text-gray-500">Erreurs réseau</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="text-2xl font-bold text-red-600">{stats.stirShakenC}</div>
              <div className="text-sm text-gray-500">STIR/SHAKEN C</div>
            </div>
          </div>

          {/* Alertes critiques */}
          {analytics.alerts.length > 0 && (
            <div className="mb-6 space-y-3">
              {analytics.alerts.map((alert, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border ${
                    alert.type === "critical"
                      ? "bg-red-50 border-red-200"
                      : "bg-yellow-50 border-yellow-200"
                  }`}
                >
                  <div className="flex items-start">
                    <AlertCircle
                      className={`w-5 h-5 mr-3 mt-0.5 ${
                        alert.type === "critical" ? "text-red-600" : "text-yellow-600"
                      }`}
                    />
                    <div>
                      <h4
                        className={`font-medium ${
                          alert.type === "critical" ? "text-red-800" : "text-yellow-800"
                        }`}
                      >
                        {alert.message}
                      </h4>
                      <p
                        className={`text-sm mt-1 ${
                          alert.type === "critical" ? "text-red-600" : "text-yellow-600"
                        }`}
                      >
                        {alert.details}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Onglets Liste / Analytics */}
          <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
            <button
              onClick={() => setActiveTab("list")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "list"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Liste des erreurs
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "analytics"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Analytics par pays/opérateur
            </button>
          </div>

          {/* Contenu Analytics */}
          {activeTab === "analytics" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Erreurs par pays */}
              <div className="bg-white rounded-lg shadow-sm border p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Globe className="w-5 h-5 mr-2 text-blue-600" />
                  Erreurs par pays de destination
                </h3>
                {analytics.byCountry.length === 0 ? (
                  <p className="text-gray-500 text-sm">Aucune donnée</p>
                ) : (
                  <div className="space-y-3">
                    {analytics.byCountry.map(([country, data]) => (
                      <div key={country} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="font-medium text-gray-800">{country}</span>
                          {data.blocked > 0 && (
                            <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                              {data.blocked} bloqués
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                data.blocked / data.total > 0.5 ? "bg-red-500" : "bg-blue-500"
                              }`}
                              style={{ width: `${(data.total / (analytics.byCountry[0]?.[1]?.total || 1)) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 w-8 text-right">{data.total}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Erreurs par opérateur */}
              <div className="bg-white rounded-lg shadow-sm border p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Wifi className="w-5 h-5 mr-2 text-purple-600" />
                  Erreurs par opérateur
                </h3>
                {analytics.byCarrier.length === 0 ? (
                  <p className="text-gray-500 text-sm">Aucune donnée</p>
                ) : (
                  <div className="space-y-3">
                    {analytics.byCarrier.map(([carrier, data]) => (
                      <div key={carrier} className="flex items-center justify-between">
                        <div className="flex-1">
                          <span className="font-medium text-gray-800">{carrier}</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Object.entries(data.categories).slice(0, 3).map(([cat, count]) => (
                              <span
                                key={cat}
                                className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                              >
                                {ERROR_CATEGORIES[cat]?.label || cat}: {count}
                              </span>
                            ))}
                          </div>
                        </div>
                        <span className="text-lg font-semibold text-gray-700 ml-4">{data.total}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Erreurs par code SIP */}
              <div className="bg-white rounded-lg shadow-sm border p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2 text-orange-600" />
                  Top codes SIP
                </h3>
                {analytics.bySipCode.length === 0 ? (
                  <p className="text-gray-500 text-sm">Aucune donnée</p>
                ) : (
                  <div className="space-y-2">
                    {analytics.bySipCode.map(([code, data]) => (
                      <div key={code} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div>
                          <span className="font-mono font-bold text-gray-800">SIP {code}</span>
                          <span className="text-sm text-gray-500 ml-2">{data.meaning}</span>
                        </div>
                        <span className="font-semibold text-gray-700">{data.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Répartition STIR/SHAKEN */}
              <div className="bg-white rounded-lg shadow-sm border p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Signal className="w-5 h-5 mr-2 text-green-600" />
                  Répartition STIR/SHAKEN
                </h3>
                <div className="space-y-3">
                  {["A", "B", "C", "N/A"].map((level) => {
                    const count = analytics.byStirShaken[level] || 0;
                    const total = Object.values(analytics.byStirShaken).reduce((a, b) => a + b, 0);
                    const percent = total > 0 ? (count / total) * 100 : 0;

                    const colors: Record<string, string> = {
                      A: "bg-green-500",
                      B: "bg-yellow-500",
                      C: "bg-red-500",
                      "N/A": "bg-gray-400",
                    };

                    const labels: Record<string, string> = {
                      A: "Attestation complète",
                      B: "Attestation partielle",
                      C: "Attestation minimale (risque blocage)",
                      "N/A": "Non disponible",
                    };

                    return (
                      <div key={level}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">Niveau {level}</span>
                          <span className="text-gray-500">
                            {count} ({percent.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${colors[level]}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{labels[level]}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Barre de filtres et liste (seulement en mode liste) */}
          {activeTab === "list" && (
          <>
          <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              {/* Recherche */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher par session, SIP code, opérateur..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Filtre catégorie */}
              <select
                className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">Toutes les catégories</option>
                <option value="recipient_unavailable">Téléphone éteint</option>
                <option value="recipient_busy">Ligne occupée</option>
                <option value="recipient_declined">Appel refusé</option>
                <option value="network_error">Erreur réseau</option>
                <option value="invalid_number">Numéro invalide</option>
                <option value="blocked">Appel bloqué</option>
                <option value="timeout">Délai dépassé</option>
                <option value="recipient">Pas de réponse</option>
              </select>

              {/* Filtre participant */}
              <select
                className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500"
                value={participantFilter}
                onChange={(e) => setParticipantFilter(e.target.value)}
              >
                <option value="all">Tous les participants</option>
                <option value="client">Client</option>
                <option value="provider">Prestataire</option>
              </select>

              {/* Filtre date */}
              <select
                className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              >
                <option value="all">Toutes les dates</option>
                <option value="today">Aujourd'hui</option>
                <option value="week">7 derniers jours</option>
                <option value="month">30 derniers jours</option>
              </select>

              {/* Bouton rafraîchir */}
              <button
                onClick={() => loadErrors(true)}
                className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Actualiser
              </button>
            </div>
          </div>

          {/* Liste des erreurs */}
          {isLoading && errors.length === 0 ? (
            <div className="flex justify-center items-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-red-600" />
              <span className="ml-3 text-gray-600">Chargement des erreurs...</span>
            </div>
          ) : loadError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              {loadError}
            </div>
          ) : filteredErrors.length === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
              <Phone className="w-12 h-12 mx-auto text-green-500 mb-3" />
              <h3 className="text-lg font-medium text-green-800">Aucune erreur trouvée</h3>
              <p className="text-green-600 mt-1">
                {errors.length === 0
                  ? "Aucune erreur d'appel enregistrée pour le moment."
                  : "Aucune erreur ne correspond aux filtres sélectionnés."}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500 mb-4">
                {filteredErrors.length} erreur{filteredErrors.length > 1 ? "s" : ""} trouvée
                {filteredErrors.length > 1 ? "s" : ""}
              </p>

              {filteredErrors.map((error) => (
                <CallErrorCard
                  key={error.id}
                  error={error}
                  isExpanded={expandedId === error.id}
                  onToggle={() => setExpandedId(expandedId === error.id ? null : error.id)}
                />
              ))}

              {/* Charger plus */}
              {hasMore && (
                <div className="text-center mt-6">
                  <button
                    onClick={() => loadErrors(false)}
                    disabled={isLoading}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? "Chargement..." : "Charger plus"}
                  </button>
                </div>
              )}
            </div>
          )}
          </>
          )}
        </div>
      </AdminLayout>
    </ErrorBoundary>
  );
};

export default AdminCallErrors;
