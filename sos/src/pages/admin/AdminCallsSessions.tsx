import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAdminTranslations, useCallAdminTranslations } from "../../utils/adminTranslations";
import { useIntl } from "react-intl";
import { useApp } from "../../contexts/AppContext";
import { getDateLocale } from "../../utils/formatters";
import { useNavigate } from "react-router-dom";
import {
  Phone,
  Clock,
  Users,
  Search,
  Download,
  Eye,
  PlayCircle,
  StopCircle,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  DollarSign,
  Timer,
  Volume2,
  FileText,
  BarChart3,
  ArrowUpDown,
  Copy
} from "lucide-react";
import {
  collection,
  query,
  orderBy,
  limit,
  where,
  getDocs,
  getDoc,
  doc,
  Timestamp,
  startAfter,
  DocumentSnapshot
} from "firebase/firestore";
import { db } from "../../config/firebase";
import AdminLayout from "../../components/admin/AdminLayout";
import Modal from "../../components/common/Modal";
import Button from "../../components/common/Button";
import ErrorBoundary from "../../components/common/ErrorBoundary";
import { useAuth } from "../../contexts/AuthContext";
import { logError } from "../../utils/logging";

// ============ COST CALCULATION CONSTANTS ============
// Based on actual pricing from getCostMetrics.ts
// NOTE: Stripe/PayPal fees are NOT included because they are paid by the PROVIDER
// (Direct Charges model = fees deducted from provider's Stripe Connect account)
const COST_PRICING = {
  // Twilio pricing (Europe)
  TWILIO: {
    VOICE_PER_MINUTE_EUR: 0.014,  // Prix par minute d'appel sortant
    // Pour un appel conférence: 2 participants × 2 legs = ~4× le tarif de base
    // + frais de conférence Twilio
    CONFERENCE_MULTIPLIER: 4.2,
  },
  // GCP costs (estimated per call)
  GCP: {
    CLOUD_FUNCTIONS_PER_CALL_EUR: 0.002,  // ~2 invocations par appel
    FIRESTORE_PER_CALL_EUR: 0.001,         // ~10-20 reads/writes par appel
    CLOUD_TASKS_PER_CALL_EUR: 0.0005,      // Scheduling
  },
};

/**
 * Calculate costs for a single call based on duration
 */
const calculateCallCosts = (
  durationSeconds: number
): { twilio: number; gcp: number; total: number } => {
  // Twilio cost: duration in minutes × rate × conference multiplier
  const durationMinutes = Math.ceil(durationSeconds / 60); // Round up to next minute
  const twilioCost = durationMinutes * COST_PRICING.TWILIO.VOICE_PER_MINUTE_EUR * COST_PRICING.TWILIO.CONFERENCE_MULTIPLIER;

  // GCP cost: fixed overhead per call
  const gcpCost =
    COST_PRICING.GCP.CLOUD_FUNCTIONS_PER_CALL_EUR +
    COST_PRICING.GCP.FIRESTORE_PER_CALL_EUR +
    COST_PRICING.GCP.CLOUD_TASKS_PER_CALL_EUR;

  const total = twilioCost + gcpCost;

  return {
    twilio: Math.round(twilioCost * 100) / 100,
    gcp: Math.round(gcpCost * 100) / 100,
    total: Math.round(total * 100) / 100
  };
};

// ============ TYPES ============
interface CallSession {
  id: string;
  status: 'pending' | 'provider_connecting' | 'client_connecting' | 'both_connecting' | 'active' | 'completed' | 'failed' | 'cancelled';
  participants: {
    provider: {
      phone: string;
      status: 'pending' | 'ringing' | 'connected' | 'disconnected' | 'no_answer';
      callSid?: string;
      connectedAt?: Timestamp;
      disconnectedAt?: Timestamp;
      attemptCount: number;
    };
    client: {
      phone: string;
      status: 'pending' | 'ringing' | 'connected' | 'disconnected' | 'no_answer';
      callSid?: string;
      connectedAt?: Timestamp;
      disconnectedAt?: Timestamp;
      attemptCount: number;
    };
  };
  conference: {
    sid?: string;
    name: string;
    startedAt?: Timestamp;
    endedAt?: Timestamp;
    duration?: number;
    isRecording?: boolean;
    recordingUrl?: string;
    recordingSid?: string;
    participantCount?: number;
  };
  payment: {
    intentId: string;
    status: 'pending' | 'authorized' | 'captured' | 'refunded' | 'failed';
    amount: number;
    capturedAt?: Timestamp;
    refundedAt?: Timestamp;
    failureReason?: string;
  };
  metadata: {
    providerId: string;
    clientId: string;
    providerName?: string;
    clientName?: string;
    serviceType: 'lawyer_call' | 'expat_call';
    providerType: 'lawyer' | 'expat';
    maxDuration: number;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    requestId?: string;
    clientLanguages?: string[];
    providerLanguages?: string[];
    isProviderAAA?: boolean;  // Whether provider is an AAA profile
  };
  // Costs (stored in Firestore from Twilio webhook, or calculated as estimate)
  costs?: {
    twilio: number;
    gcp: number;
    total: number;
    twilioUnit?: string;  // Currency (e.g., "USD")
    isReal?: boolean;     // true = from Twilio API, false = estimated
    updatedAt?: any;      // Timestamp when costs were last updated
  };
}

interface SessionFilters {
  status: string;
  serviceType: string;
  dateRange: string;
  paymentStatus: string;
  providerType: string;
}

interface SessionStats {
  totalSessions: number;
  completedSessions: number;
  failedSessions: number;
  cancelledSessions: number;
  totalRevenue: number;
  averageDuration: number;
  successRate: number;
  totalDuration: number;
}

// ============ COMPOSANTS UTILITAIRES ============
interface StatusLabels {
  completed: string;
  failed: string;
  cancelled: string;
  active: string;
  pending: string;
}

const StatusBadge: React.FC<{ status: string; size?: 'sm' | 'md'; labels: StatusLabels }> = ({ status, size = 'sm', labels }) => {
  const getConfig = () => {
    switch (status) {
      case 'completed':
        return { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle, label: labels.completed };
      case 'failed':
        return { color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle, label: labels.failed };
      case 'cancelled':
        return { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: StopCircle, label: labels.cancelled };
      case 'active':
        return { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: PlayCircle, label: labels.active };
      case 'pending':
        return { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock, label: labels.pending };
      default:
        return { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: AlertTriangle, label: status };
    }
  };

  const config = getConfig();
  const IconComponent = config.icon;
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const iconSize = size === 'sm' ? 12 : 14;
  const padding = size === 'sm' ? 'px-2 py-1' : 'px-3 py-1.5';

  return (
    <span className={`inline-flex items-center ${padding} rounded-full ${textSize} font-medium border ${config.color}`}>
      <IconComponent size={iconSize} className="mr-1" />
      {config.label}
    </span>
  );
};

interface PaymentLabels {
  captured: string;
  authorized: string;
  refunded: string;
  failed: string;
  pending: string;
}

const PaymentStatusBadge: React.FC<{ status: string; amount: number; labels: PaymentLabels; locale?: string }> = ({ status, amount, labels, locale = 'fr-FR' }) => {
  const getConfig = () => {
    switch (status) {
      case 'captured':
        return { color: 'bg-green-100 text-green-800', label: labels.captured };
      case 'authorized':
        return { color: 'bg-blue-100 text-blue-800', label: labels.authorized };
      case 'refunded':
        return { color: 'bg-orange-100 text-orange-800', label: labels.refunded };
      case 'failed':
        return { color: 'bg-red-100 text-red-800', label: labels.failed };
      case 'pending':
        return { color: 'bg-yellow-100 text-yellow-800', label: labels.pending };
      default:
        return { color: 'bg-gray-100 text-gray-800', label: status };
    }
  };

  const config = getConfig();

  return (
    <div className="text-center">
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <DollarSign size={12} className="mr-1" />
        {config.label}
      </span>
      <div className="text-sm font-medium text-gray-900 mt-1">
        {amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
      </div>
    </div>
  );
};

const DurationDisplay: React.FC<{ 
  duration?: number; 
  startTime?: Timestamp; 
  endTime?: Timestamp; 
}> = ({ duration, startTime, endTime }) => {
  const calculateDuration = () => {
    if (duration) return duration;
    if (startTime && endTime) {
      return (endTime.toDate().getTime() - startTime.toDate().getTime()) / 1000;
    }
    return 0;
  };

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return '0s';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const totalDuration = calculateDuration();

  return (
    <div className="flex items-center text-sm">
      <Timer size={14} className="mr-1 text-gray-400" />
      <span className="font-medium">
        {formatDuration(totalDuration)}
      </span>
    </div>
  );
};

// ============ COST DISPLAY COMPONENT ============
const CostDisplay: React.FC<{
  costs?: { twilio: number; gcp: number; total: number; isReal?: boolean; twilioUnit?: string };
  locale?: string;
}> = ({ costs, locale = 'fr-FR' }) => {
  if (!costs) {
    return (
      <div className="text-sm text-gray-400">
        —
      </div>
    );
  }

  // Use USD if that's what Twilio returned, otherwise EUR
  const currency = costs.twilioUnit === 'USD' ? 'USD' : 'EUR';

  const formatCost = (value: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(value);
  };

  return (
    <div className="text-sm">
      <div className="flex items-center gap-1">
        <span className="font-medium text-red-600" title={`Twilio: ${formatCost(costs.twilio)} | GCP: ${formatCost(costs.gcp)}`}>
          {formatCost(costs.total)}
        </span>
        {costs.isReal ? (
          <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700" title="Coût réel depuis Twilio">
            ✓
          </span>
        ) : (
          <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700" title="Coût estimé">
            ~
          </span>
        )}
      </div>
      <div className="text-xs text-gray-500">
        <span title="Twilio voice costs">T: {formatCost(costs.twilio)}</span>
        <span className="mx-1">|</span>
        <span title="GCP infrastructure costs">G: {formatCost(costs.gcp)}</span>
      </div>
    </div>
  );
};

interface ParticipantLabels {
  provider: string;
  client: string;
  connected: string;
  disconnected: string;
  ringing: string;
  noAnswer: string;
  pending: string;
  attempts: string;
}

const ParticipantInfo: React.FC<{
  participant: CallSession['participants']['provider'] | CallSession['participants']['client'];
  name?: string;
  type: 'provider' | 'client';
  labels: ParticipantLabels;
  isAAA?: boolean;  // Whether this provider is an AAA profile
}> = ({ participant, name, type, labels, isAAA }) => {
  const getStatusColor = () => {
    switch (participant.status) {
      case 'connected': return 'text-green-600';
      case 'disconnected': return 'text-red-600';
      case 'ringing': return 'text-blue-600';
      case 'no_answer': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusLabel = () => {
    switch (participant.status) {
      case 'connected': return labels.connected;
      case 'disconnected': return labels.disconnected;
      case 'ringing': return labels.ringing;
      case 'no_answer': return labels.noAnswer;
      default: return labels.pending;
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <div className="flex-shrink-0">
        {type === 'provider' ? '👨‍💼' : '👤'}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-gray-900 truncate">
            {name || (type === 'provider' ? labels.provider : labels.client)}
          </span>
          {type === 'provider' && isAAA && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300" title="Profil AAA (géré en interne)">
              AAA
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500 font-mono">
          {participant.phone}
        </div>
        <div className={`text-xs font-medium ${getStatusColor()}`}>
          {getStatusLabel()}
        </div>
      </div>
      {participant.attemptCount > 1 && (
        <div className="text-xs text-orange-600 bg-orange-50 px-1 rounded">
          {participant.attemptCount} {labels.attempts}
        </div>
      )}
    </div>
  );
};

// ============ COMPOSANT PRINCIPAL ============
const AdminCallsSessions: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const adminT = useAdminTranslations();
  const callT = useCallAdminTranslations();
  const intl = useIntl();
  const { language } = useApp();

  // Translation objects for helper components
  const statusLabels: StatusLabels = useMemo(() => ({
    completed: callT.finished,
    failed: callT.failed,
    cancelled: callT.cancelled,
    active: callT.inProgress,
    pending: callT.waiting
  }), [callT]);

  const paymentLabels: PaymentLabels = useMemo(() => ({
    captured: intl.formatMessage({ id: 'admin.callSessions.payment.captured', defaultMessage: 'Capturé' }),
    authorized: intl.formatMessage({ id: 'admin.callSessions.payment.authorized', defaultMessage: 'Autorisé' }),
    refunded: intl.formatMessage({ id: 'admin.callSessions.payment.refunded', defaultMessage: 'Remboursé' }),
    failed: callT.failed,
    pending: callT.waiting
  }), [intl, callT]);

  const participantLabels: ParticipantLabels = useMemo(() => ({
    provider: intl.formatMessage({ id: 'admin.callSessions.provider', defaultMessage: 'Prestataire' }),
    client: intl.formatMessage({ id: 'admin.callSessions.client', defaultMessage: 'Client' }),
    connected: callT.connected,
    disconnected: callT.disconnected,
    ringing: callT.ringing,
    noAnswer: callT.noAnswer,
    pending: callT.waiting,
    attempts: intl.formatMessage({ id: 'admin.callSessions.attempts', defaultMessage: 'essais' })
  }), [intl, callT]);

  // States des données
  const [sessions, setSessions] = useState<CallSession[]>([]);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // States UI
  const [selectedSession, setSelectedSession] = useState<CallSession | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'duration' | 'amount'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<SessionFilters>({
    status: 'all',
    serviceType: 'all',
    dateRange: '7d',
    paymentStatus: 'all',
    providerType: 'all'
  });

  const ITEMS_PER_PAGE = 25;

  // Vérification d'authentification
  useEffect(() => {
    if (!currentUser || (currentUser as any).role !== 'admin') {
      navigate('/admin/login');
      return;
    }
  }, [currentUser, navigate]);

  // Chargement initial des sessions
  useEffect(() => {
    loadSessions(true);
  }, [filters, sortBy, sortOrder]);

  // Calcul des statistiques
  useEffect(() => {
    if (sessions.length > 0) {
      calculateStats();
    }
  }, [sessions]);

  const buildQuery = (isInitial: boolean = true) => {
    const baseQuery = collection(db, 'call_sessions');
    const constraints: any[] = [];

    // ✅ IMPORTANT: Pour éviter les erreurs d'index Firestore, on utilise uniquement
    // les combinaisons de filtres qui ont des index:
    // - status + metadata.createdAt (index existe)
    // - metadata.createdAt seul (orderBy)
    // Les autres filtres (serviceType, providerType, paymentStatus) sont appliqués côté client

    // Filtre de statut (a un index avec metadata.createdAt)
    if (filters.status !== 'all') {
      constraints.push(where('status', '==', filters.status));
    }

    // Filtre de date (metadata.createdAt)
    if (filters.dateRange !== 'all') {
      const now = new Date();
      let startDate: Date;

      switch (filters.dateRange) {
        case '1d':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      constraints.push(where('metadata.createdAt', '>=', Timestamp.fromDate(startDate)));
    }

    // Tri - toujours par metadata.createdAt pour utiliser l'index existant
    // Le tri par duration/amount sera fait côté client si nécessaire
    constraints.push(orderBy('metadata.createdAt', sortOrder));

    // Limite - charger plus pour compenser le filtrage côté client
    const loadLimit = (filters.serviceType !== 'all' || filters.providerType !== 'all' || filters.paymentStatus !== 'all')
      ? ITEMS_PER_PAGE * 3  // Charger plus si filtrage côté client nécessaire
      : ITEMS_PER_PAGE;
    constraints.push(limit(loadLimit));

    // Pagination
    if (!isInitial && lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    return query(baseQuery, ...constraints);
  };

  // Fonction de filtrage côté client pour les filtres sans index Firestore
  const applyClientSideFilters = (sessions: CallSession[]): CallSession[] => {
    return sessions.filter(session => {
      // Filtre type de service
      if (filters.serviceType !== 'all' && session.metadata.serviceType !== filters.serviceType) {
        return false;
      }
      // Filtre type de prestataire
      if (filters.providerType !== 'all' && session.metadata.providerType !== filters.providerType) {
        return false;
      }
      // Filtre statut de paiement
      if (filters.paymentStatus !== 'all' && session.payment.status !== filters.paymentStatus) {
        return false;
      }
      return true;
    });
  };

  // Fonction de tri côté client si nécessaire
  const applySorting = (sessions: CallSession[]): CallSession[] => {
    if (sortBy === 'createdAt') {
      return sessions; // Déjà trié par Firestore
    }

    return [...sessions].sort((a, b) => {
      let valueA: number, valueB: number;

      if (sortBy === 'duration') {
        valueA = a.conference.duration || 0;
        valueB = b.conference.duration || 0;
      } else { // amount
        valueA = a.payment.amount || 0;
        valueB = b.payment.amount || 0;
      }

      return sortOrder === 'asc' ? valueA - valueB : valueB - valueA;
    });
  };

  // Cache pour les noms des utilisateurs (évite les requêtes répétées)
  const [userNamesCache, setUserNamesCache] = useState<Record<string, { firstName?: string; lastName?: string; displayName?: string; isAAA?: boolean }>>({});

  // Fonction pour enrichir les sessions avec les vrais noms des utilisateurs
  const enrichSessionsWithNames = async (sessions: CallSession[]): Promise<CallSession[]> => {
    // Collecter les IDs uniques qui n'ont pas de nom ou ne sont pas en cache
    const missingClientIds = new Set<string>();
    const missingProviderIds = new Set<string>();

    sessions.forEach(session => {
      // Si le nom client est manquant et pas en cache
      if (!session.metadata.clientName && session.metadata.clientId && !userNamesCache[session.metadata.clientId]) {
        missingClientIds.add(session.metadata.clientId);
      }
      // Si le nom prestataire est manquant et pas en cache
      if (!session.metadata.providerName && session.metadata.providerId && !userNamesCache[session.metadata.providerId]) {
        missingProviderIds.add(session.metadata.providerId);
      }
    });

    // Helper to enrich session with costs and AAA info
    const enrichSession = (session: CallSession, cache: typeof userNamesCache): CallSession => {
      const duration = session.conference.duration || 0;
      const providerInfo = cache[session.metadata.providerId];

      // Use real costs from Firestore if available, otherwise calculate estimate
      let costs: CallSession['costs'];
      if (session.costs?.isReal) {
        // Real costs from Twilio webhook - use as-is
        costs = session.costs;
      } else if (session.costs?.twilio !== undefined) {
        // Partial costs in Firestore - keep them
        costs = session.costs;
      } else {
        // No costs stored - calculate estimate
        const estimatedCosts = calculateCallCosts(duration);
        costs = {
          ...estimatedCosts,
          isReal: false,
        };
      }

      return {
        ...session,
        costs,
        metadata: {
          ...session.metadata,
          clientName: session.metadata.clientName || formatUserName(cache[session.metadata.clientId]),
          providerName: session.metadata.providerName || formatUserName(providerInfo),
          isProviderAAA: providerInfo?.isAAA || false
        }
      };
    };

    // Si aucun nom manquant, retourner les sessions telles quelles avec coûts
    if (missingClientIds.size === 0 && missingProviderIds.size === 0) {
      // Appliquer le cache existant
      return sessions.map(session => enrichSession(session, userNamesCache));
    }

    const newCache: Record<string, { firstName?: string; lastName?: string; displayName?: string; isAAA?: boolean }> = { ...userNamesCache };

    // Charger les noms des clients depuis "users"
    const clientPromises = Array.from(missingClientIds).map(async (clientId) => {
      try {
        const userDoc = await getDoc(doc(db, 'users', clientId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          newCache[clientId] = {
            firstName: data.firstName,
            lastName: data.lastName,
            displayName: data.displayName || data.name,
            isAAA: false  // Clients are never AAA
          };
        }
      } catch (error) {
        console.error(`Erreur chargement user ${clientId}:`, error);
      }
    });

    // Charger les noms des prestataires depuis "sos_profiles" avec statut AAA
    const providerPromises = Array.from(missingProviderIds).map(async (providerId) => {
      try {
        // D'abord essayer sos_profiles
        const profileDoc = await getDoc(doc(db, 'sos_profiles', providerId));
        if (profileDoc.exists()) {
          const data = profileDoc.data();
          newCache[providerId] = {
            firstName: data.firstName,
            lastName: data.lastName,
            displayName: data.displayName || data.name,
            isAAA: data.isAAA === true  // Get AAA status from profile
          };
        } else {
          // Fallback vers users
          const userDoc = await getDoc(doc(db, 'users', providerId));
          if (userDoc.exists()) {
            const data = userDoc.data();
            newCache[providerId] = {
              firstName: data.firstName,
              lastName: data.lastName,
              displayName: data.displayName || data.name,
              isAAA: data.isAAA === true  // Check users collection too
            };
          }
        }
      } catch (error) {
        console.error(`Erreur chargement provider ${providerId}:`, error);
      }
    });

    // Attendre toutes les requêtes
    await Promise.all([...clientPromises, ...providerPromises]);

    // Mettre à jour le cache
    setUserNamesCache(newCache);

    // Enrichir les sessions avec les noms, coûts et statut AAA
    return sessions.map(session => enrichSession(session, newCache));
  };

  // Formater le nom d'un utilisateur
  const formatUserName = (user?: { firstName?: string; lastName?: string; displayName?: string }): string => {
    if (!user) return '';
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.displayName) {
      return user.displayName;
    }
    if (user.firstName) {
      return user.firstName;
    }
    return '';
  };

  const loadSessions = async (isInitial: boolean = true) => {
    try {
      if (isInitial) {
        setLoading(true);
        setSessions([]);
        setLastDoc(null);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      const sessionsQuery = buildQuery(isInitial);
      const snapshot = await getDocs(sessionsQuery);

      if (snapshot.empty) {
        setHasMore(false);
        return;
      }

      // Récupérer les données brutes
      const rawSessions = snapshot.docs.map(docSnapshot => ({
        id: docSnapshot.id,
        ...docSnapshot.data()
      } as CallSession));

      // Appliquer les filtres côté client
      const filteredSessions = applyClientSideFilters(rawSessions);

      // Appliquer le tri côté client si nécessaire
      const sortedSessions = applySorting(filteredSessions);

      // Limiter au nombre demandé
      const limitedSessions = sortedSessions.slice(0, ITEMS_PER_PAGE);

      // ✅ Enrichir avec les vrais noms des utilisateurs
      const enrichedSessions = await enrichSessionsWithNames(limitedSessions);

      if (isInitial) {
        setSessions(enrichedSessions);
      } else {
        // Pour le "load more", aussi enrichir les nouvelles sessions
        setSessions(prev => [...prev, ...enrichedSessions]);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      // S'il y a eu filtrage, on peut avoir plus de données disponibles
      setHasMore(snapshot.docs.length >= ITEMS_PER_PAGE);

    } catch (error) {
      console.error('Erreur lors du chargement des sessions:', error);
      logError({
        origin: 'frontend',
        error: `Erreur chargement sessions: ${error instanceof Error ? error.message : 'Unknown'}`,
        context: { component: 'AdminCallsSessions' },
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const calculateStats = async () => {
    try {
      // Calculer les stats sur toutes les sessions (pas seulement celles affichées)
      const allSessionsQuery = query(
        collection(db, 'call_sessions'),
        where('metadata.createdAt', '>=', getDateRangeStart())
      );
      
      const allSnapshot = await getDocs(allSessionsQuery);
      const allSessions = allSnapshot.docs.map(doc => doc.data() as CallSession);

      const completed = allSessions.filter(s => s.status === 'completed');
      const failed = allSessions.filter(s => s.status === 'failed');
      const cancelled = allSessions.filter(s => s.status === 'cancelled');

      const totalRevenue = allSessions
        .filter(s => s.payment.status === 'captured')
        .reduce((sum, s) => sum + s.payment.amount, 0);

      const completedWithDuration = completed.filter(s => s.conference.duration);
      const totalDuration = completedWithDuration.reduce((sum, s) => sum + (s.conference.duration || 0), 0);
      const averageDuration = completedWithDuration.length > 0 ? totalDuration / completedWithDuration.length : 0;

      const successRate = allSessions.length > 0 ? (completed.length / allSessions.length) * 100 : 0;

      setSessionStats({
        totalSessions: allSessions.length,
        completedSessions: completed.length,
        failedSessions: failed.length,
        cancelledSessions: cancelled.length,
        totalRevenue,
        averageDuration,
        successRate,
        totalDuration
      });

    } catch (error) {
      console.error('Erreur lors du calcul des statistiques:', error);
    }
  };

  const getDateRangeStart = () => {
    const now = new Date();
    switch (filters.dateRange) {
      case '1d': return Timestamp.fromDate(new Date(now.getTime() - 24 * 60 * 60 * 1000));
      case '7d': return Timestamp.fromDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
      case '30d': return Timestamp.fromDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
      case '90d': return Timestamp.fromDate(new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000));
      default: return Timestamp.fromDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
    }
  };

  // Filtrage des sessions pour la recherche
  const filteredSessions = useMemo(() => {
    if (!searchTerm) return sessions;

    const searchLower = searchTerm.toLowerCase();
    return sessions.filter(session => 
      session.id.toLowerCase().includes(searchLower) ||
      session.metadata.providerName?.toLowerCase().includes(searchLower) ||
      session.metadata.clientName?.toLowerCase().includes(searchLower) ||
      session.participants.provider.phone.includes(searchTerm) ||
      session.participants.client.phone.includes(searchTerm) ||
      session.payment.intentId.toLowerCase().includes(searchLower)
    );
  }, [sessions, searchTerm]);

  // Actions
  const handleRefresh = useCallback(() => {
    loadSessions(true);
  }, []);

  const handleExportCSV = useCallback(() => {
    if (sessions.length === 0) return;

    const csvData = sessions.map(session => ({
      'Session ID': session.id,
      'Statut': session.status,
      'Type Service': session.metadata.serviceType,
      'Type Prestataire': session.metadata.providerType,
      'Prestataire': session.metadata.providerName || 'N/A',
      'Profil AAA': session.metadata.isProviderAAA ? 'Oui' : 'Non',
      'Client': session.metadata.clientName || 'N/A',
      'Téléphone Prestataire': session.participants.provider.phone,
      'Téléphone Client': session.participants.client.phone,
      'Durée (s)': session.conference.duration || 0,
      'Montant (€)': session.payment.amount,
      'Statut Paiement': session.payment.status,
      'Coût Twilio (€)': session.costs?.twilio || 0,
      'Coût GCP (€)': session.costs?.gcp || 0,
      'Coût Total (€)': session.costs?.total || 0,
      'Date Création': session.metadata.createdAt.toDate().toLocaleString(getDateLocale(language)),
      'Date Début': session.conference.startedAt?.toDate().toLocaleString(getDateLocale(language)) || 'N/A',
      'Date Fin': session.conference.endedAt?.toDate().toLocaleString(getDateLocale(language)) || 'N/A',
      'Tentatives Prestataire': session.participants.provider.attemptCount,
      'Tentatives Client': session.participants.client.attemptCount,
      'URL Enregistrement': session.conference.recordingUrl || 'N/A'
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(value => 
        typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      ).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `sessions_appels_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [sessions]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here
    });
  }, []);

  const formatDateTime = (timestamp: Timestamp) => {
    return timestamp.toDate().toLocaleString(getDateLocale(language), {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{intl.formatMessage({ id: 'admin.callSessions.loadingHistory', defaultMessage: "Chargement de l'historique des sessions..." })}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <ErrorBoundary>
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Clock className="w-7 h-7 mr-2 text-blue-600" />
                {intl.formatMessage({ id: 'admin.callSessions.title', defaultMessage: "Historique des Sessions d'Appels" })}
              </h1>
              <p className="text-gray-600 mt-1">
                {intl.formatMessage({ id: 'admin.callSessions.subtitle', defaultMessage: "Consultation et analyse des sessions d'appels passées" })}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {sessionStats && (
                <Button
                  onClick={() => setShowStatsModal(true)}
                  variant="outline"
                  className="flex items-center"
                >
                  <BarChart3 size={16} className="mr-2" />
                  {intl.formatMessage({ id: 'admin.callSessions.statistics', defaultMessage: 'Statistiques' })}
                </Button>
              )}

              <Button
                onClick={handleExportCSV}
                variant="outline"
                className="flex items-center"
                disabled={sessions.length === 0}
              >
                <Download size={16} className="mr-2" />
                {adminT.downloadCsv}
              </Button>
              
              <Button
                onClick={handleRefresh}
                variant="outline"
                className="flex items-center"
              >
                <RefreshCw size={16} className="mr-2" />
                {adminT.refresh}
              </Button>
            </div>
          </div>

          {/* Statistiques rapides */}
          {sessionStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{intl.formatMessage({ id: 'admin.callSessions.totalSessions', defaultMessage: 'Total Sessions' })}</p>
                    <p className="text-2xl font-bold text-gray-900">{sessionStats.totalSessions}</p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-100">
                    <Phone className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{intl.formatMessage({ id: 'admin.callSessions.successRate', defaultMessage: 'Taux de Succès' })}</p>
                    <p className="text-2xl font-bold text-gray-900">{sessionStats.successRate.toFixed(1)}%</p>
                  </div>
                  <div className="p-3 rounded-full bg-green-100">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{intl.formatMessage({ id: 'admin.callSessions.totalRevenue', defaultMessage: 'Revenus Total' })}</p>
                    <p className="text-2xl font-bold text-gray-900">{sessionStats.totalRevenue.toLocaleString(language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€</p>
                  </div>
                  <div className="p-3 rounded-full bg-purple-100">
                    <DollarSign className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{intl.formatMessage({ id: 'admin.callSessions.averageDuration', defaultMessage: 'Durée Moyenne' })}</p>
                    <p className="text-2xl font-bold text-gray-900">{Math.round(sessionStats.averageDuration / 60)}min</p>
                  </div>
                  <div className="p-3 rounded-full bg-orange-100">
                    <Timer className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filtres et contrôles */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            {/* Première ligne de filtres */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{intl.formatMessage({ id: 'admin.callSessions.sessionStatus', defaultMessage: 'Statut session' })}</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">{intl.formatMessage({ id: 'admin.callSessions.allStatuses', defaultMessage: 'Tous les statuts' })}</option>
                  <option value="completed">✅ {statusLabels.completed}</option>
                  <option value="active">🔵 {statusLabels.active}</option>
                  <option value="pending">⏳ {statusLabels.pending}</option>
                  <option value="failed">❌ {statusLabels.failed}</option>
                  <option value="cancelled">🚫 {statusLabels.cancelled}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{intl.formatMessage({ id: 'admin.callSessions.paymentStatus', defaultMessage: 'Statut paiement' })}</label>
                <select
                  value={filters.paymentStatus}
                  onChange={(e) => setFilters(prev => ({ ...prev, paymentStatus: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">{intl.formatMessage({ id: 'admin.callSessions.allPayments', defaultMessage: 'Tous les paiements' })}</option>
                  <option value="captured">💰 {paymentLabels.captured}</option>
                  <option value="authorized">🔒 {paymentLabels.authorized}</option>
                  <option value="refunded">↩️ {paymentLabels.refunded}</option>
                  <option value="failed">❌ {paymentLabels.failed}</option>
                  <option value="pending">⏳ {paymentLabels.pending}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{intl.formatMessage({ id: 'admin.callSessions.serviceType', defaultMessage: 'Type de service' })}</label>
                <select
                  value={filters.serviceType}
                  onChange={(e) => setFilters(prev => ({ ...prev, serviceType: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">{intl.formatMessage({ id: 'admin.callSessions.allServices', defaultMessage: 'Tous les services' })}</option>
                  <option value="lawyer_call">⚖️ {intl.formatMessage({ id: 'admin.callSessions.lawyerCall', defaultMessage: 'Appel avocat' })}</option>
                  <option value="expat_call">🌍 {intl.formatMessage({ id: 'admin.callSessions.expatCall', defaultMessage: 'Appel expatrié' })}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{intl.formatMessage({ id: 'admin.callSessions.providerType', defaultMessage: 'Type prestataire' })}</label>
                <select
                  value={filters.providerType}
                  onChange={(e) => setFilters(prev => ({ ...prev, providerType: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">{intl.formatMessage({ id: 'admin.callSessions.allTypes', defaultMessage: 'Tous types' })}</option>
                  <option value="lawyer">⚖️ {intl.formatMessage({ id: 'admin.callSessions.lawyer', defaultMessage: 'Avocat' })}</option>
                  <option value="expat">🌍 {intl.formatMessage({ id: 'admin.callSessions.expat', defaultMessage: 'Expatrié' })}</option>
                </select>
              </div>
            </div>

            {/* Deuxième ligne de filtres */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{intl.formatMessage({ id: 'admin.callSessions.dateRange', defaultMessage: 'Période' })}</label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="1d">{intl.formatMessage({ id: 'admin.callSessions.last24h', defaultMessage: 'Dernières 24h' })}</option>
                  <option value="7d">{intl.formatMessage({ id: 'admin.callSessions.last7d', defaultMessage: '7 derniers jours' })}</option>
                  <option value="30d">{intl.formatMessage({ id: 'admin.callSessions.last30d', defaultMessage: '30 derniers jours' })}</option>
                  <option value="90d">{intl.formatMessage({ id: 'admin.callSessions.last90d', defaultMessage: '90 derniers jours' })}</option>
                  <option value="all">{intl.formatMessage({ id: 'admin.callSessions.allTime', defaultMessage: 'Toutes les périodes' })}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{intl.formatMessage({ id: 'admin.callSessions.sort', defaultMessage: 'Tri' })}</label>
                <div className="flex space-x-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="createdAt">{intl.formatMessage({ id: 'admin.callSessions.sortByDate', defaultMessage: 'Date création' })}</option>
                    <option value="duration">{intl.formatMessage({ id: 'admin.callSessions.sortByDuration', defaultMessage: 'Durée' })}</option>
                    <option value="amount">{intl.formatMessage({ id: 'admin.callSessions.sortByAmount', defaultMessage: 'Montant' })}</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    title={sortOrder === 'asc'
                      ? intl.formatMessage({ id: 'admin.callSessions.sortAsc', defaultMessage: 'Tri croissant' })
                      : intl.formatMessage({ id: 'admin.callSessions.sortDesc', defaultMessage: 'Tri décroissant' })}
                  >
                    <ArrowUpDown size={16} />
                  </button>
                </div>
              </div>

              {/* Bouton reset filtres */}
              <div className="flex items-end">
                <button
                  onClick={() => setFilters({
                    status: 'all',
                    serviceType: 'all',
                    dateRange: '7d',
                    paymentStatus: 'all',
                    providerType: 'all'
                  })}
                  className="w-full px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {intl.formatMessage({ id: 'admin.callSessions.resetFilters', defaultMessage: 'Réinitialiser les filtres' })}
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder={intl.formatMessage({ id: 'admin.callSessions.searchPlaceholder', defaultMessage: 'Rechercher par ID session, nom, téléphone...' })}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              </div>

              <div className="text-sm text-gray-600">
                {intl.formatMessage(
                  { id: 'admin.callSessions.sessionsFound', defaultMessage: '{count} session(s) trouvée(s)' },
                  { count: filteredSessions.length }
                )}
              </div>
            </div>
          </div>

          {/* Table des sessions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {intl.formatMessage({ id: 'admin.callSessions.table.session', defaultMessage: 'Session' })}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {intl.formatMessage({ id: 'admin.callSessions.table.status', defaultMessage: 'Statut' })}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {intl.formatMessage({ id: 'admin.callSessions.table.participants', defaultMessage: 'Participants' })}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {intl.formatMessage({ id: 'admin.callSessions.table.duration', defaultMessage: 'Durée' })}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {intl.formatMessage({ id: 'admin.callSessions.table.payment', defaultMessage: 'Paiement' })}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {intl.formatMessage({ id: 'admin.callSessions.table.costs', defaultMessage: 'Coûts' })}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {intl.formatMessage({ id: 'admin.callSessions.table.date', defaultMessage: 'Date' })}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {intl.formatMessage({ id: 'admin.callSessions.table.actions', defaultMessage: 'Actions' })}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSessions.map((session) => (
                    <tr key={session.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 font-mono">
                            {session.id.substring(0, 12)}...
                          </div>
                          <div className="text-xs text-gray-500">
                            {session.metadata.serviceType === 'lawyer_call'
                              ? `⚖️ ${intl.formatMessage({ id: 'admin.callSessions.lawyer', defaultMessage: 'Avocat' })}`
                              : `🌍 ${intl.formatMessage({ id: 'admin.callSessions.expat', defaultMessage: 'Expatrié' })}`}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={session.status} labels={statusLabels} />
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <ParticipantInfo
                            participant={session.participants.provider}
                            name={session.metadata.providerName}
                            type="provider"
                            labels={participantLabels}
                            isAAA={session.metadata.isProviderAAA}
                          />
                          <ParticipantInfo
                            participant={session.participants.client}
                            name={session.metadata.clientName}
                            type="client"
                            labels={participantLabels}
                          />
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <DurationDisplay
                          duration={session.conference.duration}
                          startTime={session.conference.startedAt}
                          endTime={session.conference.endedAt}
                        />
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <PaymentStatusBadge
                          status={session.payment.status}
                          amount={session.payment.amount}
                          labels={paymentLabels}
                          locale={language}
                        />
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <CostDisplay
                          costs={session.costs}
                          locale={language}
                        />
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDateTime(session.metadata.createdAt)}
                        </div>
                        {session.conference.startedAt && (
                          <div className="text-xs text-gray-500">
                            {intl.formatMessage({ id: 'admin.callSessions.started', defaultMessage: 'Démarré' })}: {formatDateTime(session.conference.startedAt)}
                          </div>
                        )}
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedSession(session);
                              setShowDetailModal(true);
                            }}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                            title={intl.formatMessage({ id: 'admin.callSessions.viewDetails', defaultMessage: 'Voir détails' })}
                          >
                            <Eye size={16} />
                          </button>

                          <button
                            onClick={() => copyToClipboard(session.id)}
                            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                            title={intl.formatMessage({ id: 'admin.callSessions.copyId', defaultMessage: 'Copier ID' })}
                          >
                            <Copy size={16} />
                          </button>

                          {session.conference.recordingUrl && (
                            <button
                              onClick={() => window.open(session.conference.recordingUrl, '_blank')}
                              className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                              title={intl.formatMessage({ id: 'admin.callSessions.listenRecording', defaultMessage: 'Écouter enregistrement' })}
                            >
                              <Volume2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Message si aucune session */}
            {filteredSessions.length === 0 && (
              <div className="text-center py-12">
                <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {intl.formatMessage({ id: 'admin.callSessions.noSessionsFound', defaultMessage: 'Aucune session trouvée' })}
                </h3>
                <p className="text-gray-600">
                  {intl.formatMessage({ id: 'admin.callSessions.noSessionsFoundDesc', defaultMessage: 'Aucune session ne correspond aux critères de recherche sélectionnés.' })}
                </p>
              </div>
            )}

            {/* Bouton charger plus */}
            {hasMore && filteredSessions.length > 0 && (
              <div className="border-t border-gray-200 px-6 py-4 text-center">
                <Button
                  onClick={() => loadSessions(false)}
                  loading={loadingMore}
                  variant="outline"
                  className="w-full"
                >
                  {loadingMore ? adminT.loading : `${adminT.loadMore} (${ITEMS_PER_PAGE})`}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Modal détails de session */}
        <Modal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title={intl.formatMessage({ id: 'admin.callSessions.modal.sessionDetails', defaultMessage: 'Détails de la session' })}
          size="large"
        >
          {selectedSession && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {intl.formatMessage({ id: 'admin.callSessions.sessionId', defaultMessage: 'Session' })} #{selectedSession.id}
                  </h3>
                  <div className="flex items-center space-x-3">
                    <StatusBadge status={selectedSession.status} size="md" labels={statusLabels} />
                    <span className={`px-3 py-1 text-sm rounded-full ${
                      selectedSession.metadata.serviceType === 'lawyer_call'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {selectedSession.metadata.serviceType === 'lawyer_call'
                        ? `⚖️ ${intl.formatMessage({ id: 'admin.callSessions.lawyerCall', defaultMessage: 'Appel Avocat' })}`
                        : `🌍 ${intl.formatMessage({ id: 'admin.callSessions.expatCall', defaultMessage: 'Appel Expatrié' })}`}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <DurationDisplay
                    duration={selectedSession.conference.duration}
                    startTime={selectedSession.conference.startedAt}
                    endTime={selectedSession.conference.endedAt}
                  />
                  <div className="text-sm text-gray-500 mt-1">
                    {selectedSession.payment.amount.toLocaleString(language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
                  </div>
                </div>
              </div>

              {/* Détails participants */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                    <Users className="mr-2" size={16} />
                    {participantLabels.provider}
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div>
                      <span className="text-sm text-gray-600">{intl.formatMessage({ id: 'admin.callSessions.modal.name', defaultMessage: 'Nom' })}:</span>
                      <span className="text-sm font-medium ml-2">{selectedSession.metadata.providerName || intl.formatMessage({ id: 'admin.callSessions.modal.notAvailable', defaultMessage: 'Non disponible' })}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">ID:</span>
                      <span className="text-sm font-mono ml-2">{selectedSession.metadata.providerId.substring(0, 12)}...</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">{intl.formatMessage({ id: 'admin.callSessions.modal.phone', defaultMessage: 'Téléphone' })}:</span>
                      <span className="text-sm font-mono ml-2">{selectedSession.participants.provider.phone}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">{intl.formatMessage({ id: 'admin.callSessions.modal.status', defaultMessage: 'Statut' })}:</span>
                      <span className="text-sm font-medium ml-2">{selectedSession.participants.provider.status}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">{intl.formatMessage({ id: 'admin.callSessions.modal.attempts', defaultMessage: 'Tentatives' })}:</span>
                      <span className="text-sm font-medium ml-2">{selectedSession.participants.provider.attemptCount}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                    <Users className="mr-2" size={16} />
                    {participantLabels.client}
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div>
                      <span className="text-sm text-gray-600">{intl.formatMessage({ id: 'admin.callSessions.modal.name', defaultMessage: 'Nom' })}:</span>
                      <span className="text-sm font-medium ml-2">{selectedSession.metadata.clientName || intl.formatMessage({ id: 'admin.callSessions.modal.notAvailable', defaultMessage: 'Non disponible' })}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">ID:</span>
                      <span className="text-sm font-mono ml-2">{selectedSession.metadata.clientId.substring(0, 12)}...</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">{intl.formatMessage({ id: 'admin.callSessions.modal.phone', defaultMessage: 'Téléphone' })}:</span>
                      <span className="text-sm font-mono ml-2">{selectedSession.participants.client.phone}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">{intl.formatMessage({ id: 'admin.callSessions.modal.status', defaultMessage: 'Statut' })}:</span>
                      <span className="text-sm font-medium ml-2">{selectedSession.participants.client.status}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">{intl.formatMessage({ id: 'admin.callSessions.modal.attempts', defaultMessage: 'Tentatives' })}:</span>
                      <span className="text-sm font-medium ml-2">{selectedSession.participants.client.attemptCount}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Paiement et métadonnées */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                    <DollarSign className="mr-2" size={16} />
                    {intl.formatMessage({ id: 'admin.callSessions.modal.payment', defaultMessage: 'Paiement' })}
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div>
                      <span className="text-sm text-gray-600">{intl.formatMessage({ id: 'admin.callSessions.modal.amount', defaultMessage: 'Montant' })}:</span>
                      <span className="text-sm font-medium ml-2">{selectedSession.payment.amount.toLocaleString(language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">{intl.formatMessage({ id: 'admin.callSessions.modal.status', defaultMessage: 'Statut' })}:</span>
                      <span className="text-sm font-medium ml-2">{selectedSession.payment.status}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Intent ID:</span>
                      <span className="text-sm font-mono ml-2">{selectedSession.payment.intentId}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                    <FileText className="mr-2" size={16} />
                    {intl.formatMessage({ id: 'admin.callSessions.modal.metadata', defaultMessage: 'Métadonnées' })}
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div>
                      <span className="text-sm text-gray-600">{intl.formatMessage({ id: 'admin.callSessions.modal.type', defaultMessage: 'Type' })}:</span>
                      <span className="text-sm font-medium ml-2">{selectedSession.metadata.providerType}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">{intl.formatMessage({ id: 'admin.callSessions.modal.maxDuration', defaultMessage: 'Durée max' })}:</span>
                      <span className="text-sm font-medium ml-2">{selectedSession.metadata.maxDuration / 60} min</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">{intl.formatMessage({ id: 'admin.callSessions.modal.created', defaultMessage: 'Créée' })}:</span>
                      <span className="text-sm font-medium ml-2">{formatDateTime(selectedSession.metadata.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <div className="flex space-x-3">
                  <Button
                    onClick={() => copyToClipboard(selectedSession.id)}
                    variant="outline"
                    className="flex items-center"
                  >
                    <Copy size={16} className="mr-2" />
                    {intl.formatMessage({ id: 'admin.callSessions.copyId', defaultMessage: 'Copier ID' })}
                  </Button>

                  {selectedSession.conference.recordingUrl && (
                    <Button
                      onClick={() => window.open(selectedSession.conference.recordingUrl, '_blank')}
                      variant="outline"
                      className="flex items-center"
                    >
                      <ExternalLink size={16} className="mr-2" />
                      {intl.formatMessage({ id: 'admin.callSessions.recording', defaultMessage: 'Enregistrement' })}
                    </Button>
                  )}
                </div>

                <Button
                  onClick={() => setShowDetailModal(false)}
                  variant="primary"
                >
                  {intl.formatMessage({ id: 'admin.common.close', defaultMessage: 'Fermer' })}
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Modal statistiques */}
        <Modal
          isOpen={showStatsModal}
          onClose={() => setShowStatsModal(false)}
          title={intl.formatMessage({ id: 'admin.callSessions.modal.detailedStats', defaultMessage: 'Statistiques détaillées' })}
          size="large"
        >
          {sessionStats && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600 mb-2">{sessionStats.totalSessions}</div>
                  <div className="text-sm text-blue-800">{intl.formatMessage({ id: 'admin.callSessions.totalSessionsLabel', defaultMessage: 'Sessions Total' })}</div>
                </div>
                <div className="text-center p-6 bg-green-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-600 mb-2">{sessionStats.completedSessions}</div>
                  <div className="text-sm text-green-800">{intl.formatMessage({ id: 'admin.callSessions.completedSessions', defaultMessage: 'Sessions Réussies' })}</div>
                </div>
                <div className="text-center p-6 bg-red-50 rounded-lg">
                  <div className="text-3xl font-bold text-red-600 mb-2">{sessionStats.failedSessions}</div>
                  <div className="text-sm text-red-800">{intl.formatMessage({ id: 'admin.callSessions.failedSessions', defaultMessage: 'Sessions Échouées' })}</div>
                </div>
              </div>

              <div className="text-center">
                <Button
                  onClick={() => setShowStatsModal(false)}
                  variant="primary"
                >
                  {intl.formatMessage({ id: 'admin.common.close', defaultMessage: 'Fermer' })}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </ErrorBoundary>
    </AdminLayout>
  );
};

export default AdminCallsSessions;