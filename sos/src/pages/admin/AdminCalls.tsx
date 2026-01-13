import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useIntl } from "react-intl";
import { useCallAdminTranslations } from "../../utils/adminTranslations";
import { useApp } from "../../contexts/AppContext";
import { getDateLocale } from "../../utils/formatters";
import { useNavigate } from "react-router-dom";
import {
  Phone,
  PhoneCall,
  PhoneOff,
  PhoneIncoming,
  PhoneOutgoing,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Clock,
  Users,
  MapPin,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Pause,
  Play,
  RotateCcw,
  Eye,
  EyeOff,
  Settings,
  RefreshCw,
  Search,
  Filter,
  Download,
  Bell,
  Zap,
  Timer,
  Activity,
  Signal,
  Wifi,
  WifiOff,
  Globe,
  Shield,
  AlertCircle,
  Info,
  ExternalLink,
  Copy,
  MessageSquare,
  UserCheck,
  Star,
  Languages,
  Building,
  Target,
  ArrowUp,
  ArrowDown,
  Minus,
  TrendingUp,
  BarChart3,
  PieChart,
  Monitor,
  Server,
  Database,
  Network,
  Cpu,
  MemoryStick,
  HardDrive,
  Calendar,
  FileText,
  Mail,
  Flag,
  Headphones,
  Radio,
  Smartphone,
  Bluetooth
} from "lucide-react";
import {
  collection,
  query,
  orderBy,
  limit,
  where,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
  serverTimestamp,
  getDocs
} from "firebase/firestore";
import { db } from "../../config/firebase";
import { CALLS_CONFIG } from "../../config/callsConfig";
import AdminLayout from "../../components/admin/AdminLayout";
import Modal from "../../components/common/Modal";
import ErrorBoundary from "../../components/common/ErrorBoundary";
import RealtimeSuspendedBanner, { RealtimeCountdown } from "../../components/admin/RealtimeSuspendedBanner";
import { useAutoSuspendRealtime } from "../../hooks/useAutoSuspendRealtime";
import { useAuth } from "../../contexts/AuthContext";
import { logError } from "../../utils/logging";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../config/firebase";

// ============ TYPES PRODUCTION ============
interface LiveCallSession {
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
      audioQuality?: 'excellent' | 'good' | 'fair' | 'poor';
      signalStrength?: number;
      location?: { lat: number; lng: number; country: string };
    };
    client: {
      phone: string;
      status: 'pending' | 'ringing' | 'connected' | 'disconnected' | 'no_answer';
      callSid?: string;
      connectedAt?: Timestamp;
      disconnectedAt?: Timestamp;
      attemptCount: number;
      audioQuality?: 'excellent' | 'good' | 'fair' | 'poor';
      signalStrength?: number;
      location?: { lat: number; lng: number; country: string };
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
    audioQuality?: 'excellent' | 'good' | 'fair' | 'poor';
    bitrate?: number;
    codec?: string;
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
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    source?: 'web' | 'mobile' | 'api';
    userAgent?: string;
    ipAddress?: string;
  };
  realTimeData?: {
    lastPing?: Timestamp;
    connectionQuality?: number;
    latency?: number;
    jitter?: number;
    packetLoss?: number;
    bandwidth?: number;
  };
}

interface CallMetrics {
  totalActiveCalls: number;
  totalConnectingCalls: number;
  totalPendingCalls: number;
  averageConnectionTime: number;
  averageCallDuration: number;
  successRate: number;
  audioQualityAverage: number;
  networkLatencyAverage: number;
  providerResponseRate: number;
  clientResponseRate: number;
  concurrentPeakToday: number;
  totalCallsToday: number;
  revenueInProgress: number;
  estimatedTotalRevenue: number;
}

interface CallAlert {
  id: string;
  type: 'connection_issue' | 'audio_problem' | 'timeout' | 'payment_issue' | 'system_overload';
  severity: 'low' | 'medium' | 'high' | 'critical';
  callSessionId: string;
  message: string;
  timestamp: Date;
  isResolved: boolean;
  autoActions?: string[];
}

interface SystemHealth {
  apiStatus: 'operational' | 'degraded' | 'outage';
  responseTime: number;
  callCapacity: number;
  currentLoad: number;
  regionHealth: {
    [region: string]: {
      status: 'healthy' | 'warning' | 'critical';
      latency: number;
      availability: number;
    };
  };
}

// ============ COMPOSANTS UTILITAIRES ============
const CallStatusBadge: React.FC<{ status: string; animated?: boolean }> = ({ status, animated = false }) => {
  const intl = useIntl();

  const getConfig = () => {
    switch (status) {
      case 'active':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: Phone,
          label: intl.formatMessage({ id: 'admin.calls.status.active' }),
          pulse: true
        };
      case 'both_connecting':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: PhoneCall,
          label: intl.formatMessage({ id: 'admin.calls.status.connecting' }),
          pulse: true
        };
      case 'provider_connecting':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: PhoneIncoming,
          label: intl.formatMessage({ id: 'admin.calls.status.providerConnecting' }),
          pulse: true
        };
      case 'client_connecting':
        return {
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          icon: PhoneOutgoing,
          label: intl.formatMessage({ id: 'admin.calls.status.clientConnecting' }),
          pulse: true
        };
      case 'pending':
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: Clock,
          label: intl.formatMessage({ id: 'admin.calls.status.pending' })
        };
      case 'completed':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: CheckCircle,
          label: intl.formatMessage({ id: 'admin.calls.status.completed' })
        };
      case 'failed':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: XCircle,
          label: intl.formatMessage({ id: 'admin.calls.status.failed' })
        };
      case 'cancelled':
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: PhoneOff,
          label: intl.formatMessage({ id: 'admin.calls.status.cancelled' })
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: Minus,
          label: status
        };
    }
  };

  const config = getConfig();
  const IconComponent = config.icon;

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${config.color} ${
      animated && config.pulse ? 'animate-pulse' : ''
    }`}>
      <IconComponent size={12} className="mr-1" />
      {config.label}
    </span>
  );
};

const ParticipantStatusIndicator: React.FC<{
  status: string;
  audioQuality?: string;
  signalStrength?: number;
  name: string;
  phone: string;
  type: 'provider' | 'client';
}> = ({ status, audioQuality, signalStrength, name, phone, type }) => {
  const intl = useIntl();

  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'ringing': return 'bg-yellow-500 animate-pulse';
      case 'pending': return 'bg-gray-400';
      case 'disconnected': return 'bg-red-500';
      case 'no_answer': return 'bg-orange-500';
      default: return 'bg-gray-400';
    }
  };

  const getAudioQualityIcon = () => {
    if (!audioQuality) return null;
    switch (audioQuality) {
      case 'excellent': return <Signal className="text-green-500" size={14} />;
      case 'good': return <Signal className="text-blue-500" size={14} />;
      case 'fair': return <Signal className="text-yellow-500" size={14} />;
      case 'poor': return <Signal className="text-red-500" size={14} />;
      default: return null;
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'connected': return intl.formatMessage({ id: 'admin.calls.participant.connected' });
      case 'ringing': return intl.formatMessage({ id: 'admin.calls.participant.ringing' });
      case 'pending': return intl.formatMessage({ id: 'admin.calls.participant.pending' });
      case 'disconnected': return intl.formatMessage({ id: 'admin.calls.participant.disconnected' });
      case 'no_answer': return intl.formatMessage({ id: 'admin.calls.participant.noAnswer' });
      default: return status;
    }
  };

  return (
    <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
        <div className="text-sm">
          <div className="font-medium text-gray-900">
            {type === 'provider' ? '👨‍💼' : '👤'} {name || intl.formatMessage({ id: 'admin.calls.participant.anonymous' })}
          </div>
          <div className="text-gray-500 font-mono text-xs">{phone}</div>
        </div>
      </div>

      <div className="flex items-center space-x-2 ml-auto">
        {audioQuality && (
          <div className="flex items-center space-x-1" title={`${intl.formatMessage({ id: 'admin.calls.metrics.audioQuality' })}: ${audioQuality}`}>
            {getAudioQualityIcon()}
          </div>
        )}

        {signalStrength !== undefined && (
          <div className="flex items-center space-x-1" title={`${intl.formatMessage({ id: 'admin.calls.modal.signal' })} ${signalStrength}%`}>
            <div className="flex space-x-0.5">
              {[1, 2, 3, 4].map((bar) => (
                <div
                  key={bar}
                  className={`w-1 h-3 rounded-sm ${
                    bar <= (signalStrength / 25) ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                ></div>
              ))}
            </div>
          </div>
        )}

        <span className={`px-2 py-1 text-xs rounded-full ${
          status === 'connected' ? 'bg-green-100 text-green-800' :
          status === 'ringing' ? 'bg-yellow-100 text-yellow-800' :
          status === 'disconnected' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {getStatusLabel()}
        </span>
      </div>
    </div>
  );
};

const CallDurationTimer: React.FC<{ startTime?: Timestamp; isActive: boolean }> = ({ startTime, isActive }) => {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!isActive || !startTime) {
      setDuration(0);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const start = startTime.toDate().getTime();
      setDuration(Math.floor((now - start) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, isActive]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm font-mono ${
      isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
    }`}>
      <Timer size={14} />
      <span>{formatDuration(duration)}</span>
      {isActive && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>}
    </div>
  );
};

// Badge pour le type d'appel
const CallTypeBadge: React.FC<{ providerType: 'lawyer' | 'expat' }> = ({ providerType }) => {
  const intl = useIntl();

  if (providerType === 'lawyer') {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        {intl.formatMessage({ id: 'admin.calls.callType.lawyer' })}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
      {intl.formatMessage({ id: 'admin.calls.callType.expat' })}
    </span>
  );
};

const MetricsCard: React.FC<{
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  color: string;
  isLoading?: boolean;
}> = ({ title, value, change, changeLabel, icon: Icon, color, isLoading = false }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        {isLoading ? (
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-20 mt-2"></div>
          </div>
        ) : (
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        )}
        {change !== undefined && !isLoading && (
          <div className="flex items-center mt-1">
            {change > 0 ? (
              <ArrowUp className="text-green-500" size={16} />
            ) : change < 0 ? (
              <ArrowDown className="text-red-500" size={16} />
            ) : (
              <Minus className="text-gray-400" size={16} />
            )}
            <span className={`text-sm ml-1 ${
              change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-500'
            }`}>
              {Math.abs(change)}% {changeLabel}
            </span>
          </div>
        )}
      </div>
      <div className={`p-3 rounded-full ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
    </div>
  </div>
);

// ============ COMPOSANT PRINCIPAL ============
const AdminCallsMonitoring: React.FC = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const callT = useCallAdminTranslations();
  const { language } = useApp();

  // States des données
  const [liveCalls, setLiveCalls] = useState<LiveCallSession[]>([]);
  const [callMetrics, setCallMetrics] = useState<CallMetrics | null>(null);
  const [callAlerts, setCallAlerts] = useState<CallAlert[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  
  // States UI
  const [isLoading, setIsLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'grid' | 'list' | 'board'>('grid');
  const [selectedCall, setSelectedCall] = useState<LiveCallSession | null>(null);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    serviceType: 'all',
    priority: 'all',
    showCompleted: false,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // ✅ OPTIMISATION: Auto-suspension du temps réel après 5 min d'inactivité
  const {
    isRealtimeActive: isRealTimeActive,
    isSuspendedDueToInactivity,
    resumeRealtime,
    suspendRealtime,
    timeUntilSuspend,
  } = useAutoSuspendRealtime({
    inactivityDelay: 5 * 60 * 1000, // 5 minutes
    enabled: true,
  });

  // ✅ CORRECTION: Ref pour tracker le nombre d'appels précédent (évite ré-abonnements inutiles)
  const previousCallsCountRef = useRef<number>(0);

  // Formatters
  const formatCurrency = (amount: number) => `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€`;
  const formatDateTime = (timestamp: Timestamp | Date) => {
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  // Vérification d'authentification
  useEffect(() => {
    if (!currentUser || (currentUser as any).role !== 'admin') {
      navigate('/admin/login');
      return;
    }
  }, [currentUser, navigate]);

  // Chargement des données en temps réel
  useEffect(() => {
    if (!currentUser || !isRealTimeActive) return;

    // ✅ OPTIMISATION COÛTS GCP: Polling 30s au lieu de onSnapshot pour les appels
    let isMounted = true;

    const loadCalls = async () => {
      try {
        // ✅ FIX: Construire la liste des statuts dynamiquement selon les filtres
        const activeStatuses = [
          'pending',
          'provider_connecting',
          'client_connecting',
          'both_connecting',
          'active'
        ];
        const completedStatuses = ['completed', 'failed', 'cancelled'];

        // Si showCompleted est activé, inclure les statuts terminés
        const statusesToQuery = filters.showCompleted
          ? [...activeStatuses, ...completedStatuses]
          : activeStatuses;

        // Si un statut spécifique est sélectionné dans le filtre, l'utiliser
        const finalStatuses = filters.status !== 'all'
          ? [filters.status]
          : statusesToQuery;

        const callSessionsQuery = query(
          collection(db, 'call_sessions'),
          where('status', 'in', finalStatuses),
          orderBy('metadata.createdAt', 'desc'),
          limit(CALLS_CONFIG.firestore.liveCallsLimit)
        );

        const snapshot = await getDocs(callSessionsQuery);
        if (!isMounted) return;

        const sessions = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
          } as LiveCallSession;
        });

        // Jouer un son pour les nouveaux appels
        if (soundEnabled && sessions.length > previousCallsCountRef.current) {
          playNotificationSound('new_call');
        }

        previousCallsCountRef.current = sessions.length;
        setLiveCalls(sessions);
      } catch (error: any) {
        console.error('Erreur lors du chargement des appels:', error);
        logError({
          origin: 'frontend',
          error: `Erreur monitoring appels: ${error.message}`,
          context: { component: 'AdminCallsMonitoring' },
        });
      }
    };

    loadCalls();
    const intervalId = setInterval(loadCalls, 30000); // Poll every 30s

    setIsLoading(false);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [currentUser, isRealTimeActive, soundEnabled, filters.showCompleted, filters.status]);

  // Calcul des métriques en temps réel basé sur les vraies données 
  useEffect(() => {
    if (liveCalls.length === 0) {
      setCallMetrics(null);
      return;
    }

    const activeCalls = liveCalls.filter(call => call.status === 'active');
    const connectingCalls = liveCalls.filter(call => 
      ['provider_connecting', 'client_connecting', 'both_connecting'].includes(call.status)
    );
    const pendingCalls = liveCalls.filter(call => call.status === 'pending');

    // Calculs des métriques réelles
    const totalActiveCalls = activeCalls.length;
    const totalConnectingCalls = connectingCalls.length;
    const totalPendingCalls = pendingCalls.length;

    // Durée moyenne des appels actifs
    const activeCallsWithDuration = activeCalls.filter(call => call.conference.startedAt);
    const averageCallDuration = activeCallsWithDuration.length > 0
      ? activeCallsWithDuration.reduce((sum, call) => {
          const now = Date.now();
          const start = call.conference.startedAt!.toDate().getTime();
          return sum + (now - start) / 1000;
        }, 0) / activeCallsWithDuration.length
      : 0;

    // Revenus en cours
    const revenueInProgress = activeCalls.reduce((sum, call) => sum + call.payment.amount, 0);
    const estimatedTotalRevenue = liveCalls.reduce((sum, call) => sum + call.payment.amount, 0);

    // Qualité audio moyenne
    const callsWithAudioQuality = liveCalls.filter(call => call.conference.audioQuality);
    const audioQualityMap = CALLS_CONFIG.audioQuality;
    const audioQualityAverage = callsWithAudioQuality.length > 0
      ? callsWithAudioQuality.reduce((sum, call) => {
          return sum + (audioQualityMap[call.conference.audioQuality as keyof typeof audioQualityMap] || 0);
        }, 0) / callsWithAudioQuality.length
      : 0;

    // Latence réseau moyenne
    const callsWithLatency = liveCalls.filter(call => call.realTimeData?.latency);
    const networkLatencyAverage = callsWithLatency.length > 0
      ? callsWithLatency.reduce((sum, call) => sum + (call.realTimeData!.latency || 0), 0) / callsWithLatency.length
      : 0;

    // Calculer les statistiques du jour via Firestore
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = Timestamp.fromDate(today);

    // Ces valeurs seront calculées via une requête Firestore séparée
    const loadTodayStats = async () => {
      try {
        const todayQuery = query(
          collection(db, 'call_sessions'),
          where('metadata.createdAt', '>=', todayTimestamp)
        );
        const todaySnapshot = await getDocs(todayQuery);
        
        const todayData = todaySnapshot.docs.map(doc => doc.data() as LiveCallSession);
        const completedToday = todayData.filter(call => call.status === 'completed').length;
        const totalToday = todayData.length;
        const concurrentPeak = Math.max(totalActiveCalls, 0);
        
        const successRate = totalToday > 0 ? (completedToday / totalToday) * 100 : 0;

        const connectionTimes = todayData
          .filter(call => call.participants.provider.connectedAt && call.participants.client.connectedAt)
          .map(call => {
            const providerTime = call.participants.provider.connectedAt!.toDate().getTime();
            const clientTime = call.participants.client.connectedAt!.toDate().getTime();
            const startTime = call.metadata.createdAt.toDate().getTime();
            return Math.max(providerTime - startTime, clientTime - startTime) / 1000;
          });

        const averageConnectionTime = connectionTimes.length > 0
          ? connectionTimes.reduce((sum, time) => sum + time, 0) / connectionTimes.length
          : 0;

        // Calcul des taux de réponse
        const providerResponses = todayData.filter(call => 
          call.participants.provider.status === 'connected'
        ).length;
        const clientResponses = todayData.filter(call => 
          call.participants.client.status === 'connected'
        ).length;

        const providerResponseRate = totalToday > 0 ? (providerResponses / totalToday) * 100 : 0;
        const clientResponseRate = totalToday > 0 ? (clientResponses / totalToday) * 100 : 0;

        const metrics: CallMetrics = {
          totalActiveCalls,
          totalConnectingCalls,
          totalPendingCalls,
          averageConnectionTime,
          averageCallDuration,
          successRate,
          audioQualityAverage,
          networkLatencyAverage,
          providerResponseRate,
          clientResponseRate,
          concurrentPeakToday: concurrentPeak,
          totalCallsToday: totalToday,
          revenueInProgress,
          estimatedTotalRevenue,
        };

        setCallMetrics(metrics);
      } catch (error) {
        console.error('Erreur lors du calcul des métriques:', error);
      }
    };

    loadTodayStats();
  }, [liveCalls]);

  // Génération d'alertes automatiques basées sur les vraies données
  useEffect(() => {
    const newAlerts: CallAlert[] = [];

    liveCalls.forEach(call => {
      // Alerte pour les appels bloqués
      const timeSinceCreation = Date.now() - call.metadata.createdAt.toDate().getTime();
      if (['pending', 'provider_connecting', 'client_connecting'].includes(call.status) &&
          timeSinceCreation > CALLS_CONFIG.alerts.stuckCallThreshold) {
        newAlerts.push({
          id: `stuck_${call.id}`,
          type: 'timeout',
          severity: 'high',
          callSessionId: call.id,
          message: `Appel bloqué depuis ${Math.floor(timeSinceCreation / 60000)} minutes`,
          timestamp: new Date(),
          isResolved: false,
          autoActions: ['retry_connection', 'escalate_support']
        });
      }

      // Alerte pour la qualité audio
      if (call.status === 'active' && call.conference.audioQuality === 'poor') {
        newAlerts.push({
          id: `audio_${call.id}`,
          type: 'audio_problem',
          severity: 'medium',
          callSessionId: call.id,
          message: 'Qualité audio dégradée détectée',
          timestamp: new Date(),
          isResolved: false,
          autoActions: ['check_connection', 'suggest_callback']
        });
      }

      // Alerte pour la latence réseau
      if (call.realTimeData?.latency && call.realTimeData.latency > CALLS_CONFIG.alerts.maxLatency) {
        newAlerts.push({
          id: `latency_${call.id}`,
          type: 'connection_issue',
          severity: 'medium',
          callSessionId: call.id,
          message: `Latence élevée: ${call.realTimeData.latency.toFixed(0)}ms`,
          timestamp: new Date(),
          isResolved: false,
        });
      }

      // Alerte pour les échecs de paiement
      if (call.payment.status === 'failed') {
        newAlerts.push({
          id: `payment_${call.id}`,
          type: 'payment_issue',
          severity: 'high',
          callSessionId: call.id,
          message: `Échec de paiement: ${call.payment.failureReason || 'Raison inconnue'}`,
          timestamp: new Date(),
          isResolved: false,
          autoActions: ['retry_payment', 'contact_client']
        });
      }
    });

    // Alerte pour surcharge système
    if (callMetrics && callMetrics.totalActiveCalls > CALLS_CONFIG.alerts.maxConcurrentCalls) {
      newAlerts.push({
        id: 'system_overload',
        type: 'system_overload',
        severity: 'critical',
        callSessionId: 'system',
        message: `${callMetrics.totalActiveCalls} appels simultanés - Capacité proche de la limite`,
        timestamp: new Date(),
        isResolved: false,
        autoActions: ['scale_resources', 'alert_team']
      });
    }

    setCallAlerts(prev => {
      const existingIds = prev.map(alert => alert.id);
      const uniqueNewAlerts = newAlerts.filter(alert => !existingIds.includes(alert.id));
      return [...prev, ...uniqueNewAlerts].slice(-CALLS_CONFIG.firestore.maxAlerts);
    });
  }, [liveCalls, callMetrics]);

  // Chargement de la santé du système via une API réelle
  useEffect(() => {
    const loadSystemHealth = async () => {
      try {
        // Appel à l'API de santé du système (si disponible)
        const healthResponse = await fetch('/api/system/health');
        if (healthResponse.ok) {
          const healthData = await healthResponse.json();
          setSystemHealth(healthData);
        } else {
          // Fallback avec des données basiques basées sur les appels réels
          setSystemHealth({
            apiStatus: 'operational',
            responseTime: 95,
            callCapacity: 1000,
            currentLoad: liveCalls.length,
            regionHealth: {
              'eu-west-1': {
                status: 'healthy',
                latency: 45,
                availability: 99.9,
              },
              'us-east-1': {
                status: 'healthy',
                latency: 120,
                availability: 99.8,
              },
            },
          });
        }
      } catch (error) {
        console.error('Erreur lors du chargement de la santé système:', error);
        // Données minimales en cas d'erreur
        setSystemHealth({
          apiStatus: 'degraded',
          responseTime: 0,
          callCapacity: 1000,
          currentLoad: liveCalls.length,
          regionHealth: {},
        });
      }
    };

    loadSystemHealth();
    const interval = setInterval(loadSystemHealth, CALLS_CONFIG.refresh.systemHealthInterval);

    return () => clearInterval(interval);
  }, [liveCalls.length]);

  // Filtrage des appels
  const filteredCalls = useMemo(() => {
    return liveCalls.filter(call => {
      if (filters.status !== 'all' && call.status !== filters.status) return false;
      if (filters.serviceType !== 'all' && call.metadata.serviceType !== filters.serviceType) return false;
      if (filters.priority !== 'all' && call.metadata.priority !== filters.priority) return false;
      if (!filters.showCompleted && ['completed', 'failed', 'cancelled'].includes(call.status)) return false;
      
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          call.id.toLowerCase().includes(searchLower) ||
          call.metadata.providerName?.toLowerCase().includes(searchLower) ||
          call.metadata.clientName?.toLowerCase().includes(searchLower) ||
          call.participants.provider.phone.includes(searchTerm) ||
          call.participants.client.phone.includes(searchTerm)
        );
      }
      
      return true;
    });
  }, [liveCalls, filters, searchTerm]);

  // Sons de notification
  const playNotificationSound = useCallback((type: 'new_call' | 'call_ended' | 'alert') => {
    if (!soundEnabled) return;
    
    // Création d'un son simple avec Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      switch (type) {
        case 'new_call':
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
          break;
        case 'call_ended':
          oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
          break;
        case 'alert':
          oscillator.frequency.setValueAtTime(1200, audioContext.currentTime);
          break;
      }
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.warn('Impossible de jouer le son de notification:', error);
    }
  }, [soundEnabled]);

  // Actions sur les appels via Firebase Functions
  const handleForceDisconnect = useCallback(async (sessionId: string) => {
    if (!confirm(callT.forceDisconnectConfirm)) return;
    
    try {
      const forceDisconnectFunction = httpsCallable(functions, 'adminForceDisconnectCall');
      await forceDisconnectFunction({ sessionId, reason: 'Admin force disconnect' });

      playNotificationSound('call_ended');
    } catch (error) {
      console.error('Erreur lors de la déconnexion forcée:', error);
      alert(callT.disconnectError);
    }
  }, [playNotificationSound]);

  const handleJoinCall = useCallback(async (sessionId: string) => {
    const call = liveCalls.find(c => c.id === sessionId);
    if (!call || call.status !== 'active') {
      alert(callT.joinCallError);
      return;
    }

    try {
      const joinCallFunction = httpsCallable(functions, 'adminJoinCall');
      const result = await joinCallFunction({ sessionId });
      
      if (result.data) {
        const { conferenceUrl, accessToken } = result.data as any;
        window.open(conferenceUrl, '_blank');
      }
    } catch (error) {
      console.error('Erreur lors de la tentative de rejoindre l\'appel:', error);
      alert(callT.joinCallError);
    }
  }, [liveCalls]);

  const handleTransferCall = useCallback(async (sessionId: string) => {
    const newProviderId = prompt('ID du nouveau prestataire:');
    if (!newProviderId) return;

    try {
      const transferCallFunction = httpsCallable(functions, 'adminTransferCall');
      await transferCallFunction({ sessionId, newProviderId });
    } catch (error) {
      console.error('Erreur lors du transfert:', error);
      alert(callT.transferError);
    }
  }, []);

  const handleMuteCall = useCallback(async (sessionId: string, participantType: 'provider' | 'client') => {
    try {
      const muteCallFunction = httpsCallable(functions, 'adminMuteParticipant');
      await muteCallFunction({ sessionId, participantType });
    } catch (error) {
      console.error('Erreur lors du mute:', error);
      alert('Erreur lors de la mise en sourdine');
    }
  }, []);

  const handleResolveAlert = useCallback((alertId: string) => {
    setCallAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, isResolved: true } : alert
    ));
  }, []);

  const handleDismissAlert = useCallback((alertId: string) => {
    setCallAlerts(prev => prev.filter(alert => alert.id !== alertId));
  }, []);

  const unreadAlertsCount = callAlerts.filter(alert => !alert.isResolved).length;

  // Composant CallActionButtons
  const CallActionButtons: React.FC<{
    session: LiveCallSession;
    onForceDisconnect: (sessionId: string) => void;
    onTransferCall: (sessionId: string) => void;
    onJoinCall: (sessionId: string) => void;
    onMuteCall: (sessionId: string, participantType: 'provider' | 'client') => void;
  }> = ({ session, onForceDisconnect, onTransferCall, onJoinCall, onMuteCall }) => {
    const intl = useIntl();
    const canJoin = session.status === 'active';
    const canDisconnect = ['active', 'both_connecting', 'provider_connecting', 'client_connecting'].includes(session.status);
    const canTransfer = session.status === 'active';

    return (
      <div className="flex items-center space-x-2">
        {canJoin && (
          <button
            onClick={() => onJoinCall(session.id)}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            title={intl.formatMessage({ id: 'admin.calls.actions.joinCall' })}
          >
            <Headphones size={16} />
          </button>
        )}

        {canDisconnect && (
          <button
            onClick={() => onForceDisconnect(session.id)}
            className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            title={intl.formatMessage({ id: 'admin.calls.actions.forceDisconnect' })}
          >
            <PhoneOff size={16} />
          </button>
        )}

        {canTransfer && (
          <button
            onClick={() => onTransferCall(session.id)}
            className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            title={intl.formatMessage({ id: 'admin.calls.actions.transfer' })}
          >
            <RotateCcw size={16} />
          </button>
        )}

        <button
          onClick={() => onMuteCall(session.id, 'provider')}
          className="p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          title={intl.formatMessage({ id: 'admin.calls.actions.muteProvider' })}
        >
          <MicOff size={16} />
        </button>

        <button
          onClick={() => onMuteCall(session.id, 'client')}
          className="p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          title={intl.formatMessage({ id: 'admin.calls.actions.muteClient' })}
        >
          <VolumeX size={16} />
        </button>
      </div>
    );
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{intl.formatMessage({ id: 'admin.calls.loading' })}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <ErrorBoundary
        fallback={
          <div className="p-8 text-center">
            {intl.formatMessage({ id: 'admin.calls.errorFallback' })}
          </div>
        }
      >
        {/* ✅ Bannière quand temps réel suspendu pour économiser les coûts */}
        {isSuspendedDueToInactivity && (
          <RealtimeSuspendedBanner onResume={resumeRealtime} reason="inactivity" />
        )}

        <div className="px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Phone className="mr-3 text-red-600" size={28} />
                {intl.formatMessage({ id: 'admin.calls.title' })}
                {isRealTimeActive && (
                  <div className="ml-3 flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse mr-2"></div>
                    <span className="text-sm text-green-600 font-medium">{intl.formatMessage({ id: 'admin.calls.liveIndicator' })}</span>
                  </div>
                )}
              </h1>
              <p className="text-gray-600 mt-1">
                {intl.formatMessage({ id: 'admin.calls.subtitle' })}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Alertes */}
              <button
                className={`relative p-2 rounded-lg border transition-colors ${
                  unreadAlertsCount > 0 
                    ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100' 
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
                title={intl.formatMessage({ id: 'admin.calls.buttons.alerts' })}
              >
                <Bell size={20} />
                {unreadAlertsCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                    {unreadAlertsCount > 9 ? '9+' : unreadAlertsCount}
                  </span>
                )}
              </button>

              {/* Contrôles audio */}
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-lg border transition-colors ${
                  soundEnabled 
                    ? 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100' 
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
                title={soundEnabled ? intl.formatMessage({ id: 'admin.calls.buttons.disableSound' }) : intl.formatMessage({ id: 'admin.calls.buttons.enableSound' })}
              >
                {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </button>

              {/* Mode temps réel + countdown */}
              <div className="flex items-center space-x-2">
                <RealtimeCountdown seconds={timeUntilSuspend} isActive={isRealTimeActive} />
                <button
                  onClick={() => isRealTimeActive ? suspendRealtime() : resumeRealtime()}
                  className={`p-2 rounded-lg border transition-colors ${
                    isRealTimeActive
                      ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  title={isRealTimeActive ? intl.formatMessage({ id: 'admin.calls.buttons.pauseRealtime' }) : intl.formatMessage({ id: 'admin.calls.buttons.enableRealtime' })}
                >
                  {isRealTimeActive ? <Pause size={20} /> : <Play size={20} />}
                </button>
              </div>

              {/* Stats System */}
              <button
                onClick={() => setShowStatsModal(true)}
                className="p-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                title={intl.formatMessage({ id: 'admin.calls.buttons.systemStats' })}
              >
                <Activity size={20} />
              </button>

              {/* Refresh */}
              <button
                onClick={() => window.location.reload()}
                className="p-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                title={intl.formatMessage({ id: 'admin.calls.buttons.refresh' })}
              >
                <RefreshCw size={20} />
              </button>
            </div>
          </div>

          {/* Métriques temps réel */}
          {callMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <MetricsCard
                title={intl.formatMessage({ id: 'admin.calls.metrics.activeCalls' })}
                value={callMetrics.totalActiveCalls}
                icon={Phone}
                color="bg-green-500"
              />
              <MetricsCard
                title={intl.formatMessage({ id: 'admin.calls.metrics.connecting' })}
                value={callMetrics.totalConnectingCalls}
                icon={PhoneCall}
                color="bg-blue-500"
              />
              <MetricsCard
                title={intl.formatMessage({ id: 'admin.calls.metrics.pending' })}
                value={callMetrics.totalPendingCalls}
                icon={Clock}
                color="bg-yellow-500"
              />
              <MetricsCard
                title={intl.formatMessage({ id: 'admin.calls.metrics.revenueInProgress' })}
                value={formatCurrency(callMetrics.revenueInProgress)}
                icon={TrendingUp}
                color="bg-purple-500"
              />
            </div>
          )}

          {/* Alertes actives */}
          {callAlerts.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <AlertTriangle className="mr-2 text-red-500" size={20} />
                {intl.formatMessage({ id: 'admin.calls.alerts.title' })} ({intl.formatMessage({ id: 'admin.calls.alerts.unresolved' }, { count: unreadAlertsCount })})
              </h3>
              <div className="space-y-3">
                {callAlerts.slice(0, 3).map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border-l-4 ${
                      alert.severity === 'critical' ? 'border-red-500 bg-red-50' :
                      alert.severity === 'high' ? 'border-orange-500 bg-orange-50' :
                      alert.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                      'border-blue-500 bg-blue-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                            alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                            alert.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                            alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {alert.severity.toUpperCase()}
                          </span>
                          <span className="text-sm font-medium">{alert.message}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {intl.formatMessage({ id: 'admin.calls.alerts.session' })}: {alert.callSessionId} • {alert.timestamp.toLocaleTimeString(getDateLocale(language))}
                        </div>
                        {alert.autoActions && (
                          <div className="flex space-x-2 mt-2">
                            {alert.autoActions.map((action, index) => (
                              <button
                                key={index}
                                className="text-xs bg-white px-2 py-1 rounded border hover:bg-gray-50"
                                onClick={() => {/* TODO: Implement action handler */}}
                              >
                                {action.replace('_', ' ').toUpperCase()}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-1">
                        {!alert.isResolved && (
                          <button
                            onClick={() => handleResolveAlert(alert.id)}
                            className="text-gray-400 hover:text-green-600"
                            title={intl.formatMessage({ id: 'admin.calls.alerts.markResolved' })}
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDismissAlert(alert.id)}
                          className="text-gray-400 hover:text-red-600"
                          title={intl.formatMessage({ id: 'admin.calls.alerts.delete' })}
                        >
                          <XCircle size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filtres et contrôles */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <Filter size={16} className="text-gray-400" />
                <span className="text-sm font-medium text-gray-700">{intl.formatMessage({ id: 'admin.calls.filters.title' })}</span>
              </div>

              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              >
                <option value="all">{intl.formatMessage({ id: 'admin.calls.filters.allStatus' })}</option>
                <option value="active">{intl.formatMessage({ id: 'admin.calls.filters.active' })}</option>
                <option value="both_connecting">{intl.formatMessage({ id: 'admin.calls.filters.connecting' })}</option>
                <option value="provider_connecting">{intl.formatMessage({ id: 'admin.calls.filters.providerConnecting' })}</option>
                <option value="client_connecting">{intl.formatMessage({ id: 'admin.calls.filters.clientConnecting' })}</option>
                <option value="pending">{intl.formatMessage({ id: 'admin.calls.filters.pending' })}</option>
                {/* Statuts terminés - visibles uniquement si showCompleted activé */}
                {filters.showCompleted && (
                  <>
                    <option value="completed">{intl.formatMessage({ id: 'admin.calls.filters.completed' })}</option>
                    <option value="failed">{intl.formatMessage({ id: 'admin.calls.filters.failed' })}</option>
                    <option value="cancelled">{intl.formatMessage({ id: 'admin.calls.filters.cancelled' })}</option>
                  </>
                )}
              </select>

              <select
                value={filters.serviceType}
                onChange={(e) => setFilters(prev => ({ ...prev, serviceType: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              >
                <option value="all">{intl.formatMessage({ id: 'admin.calls.filters.allServices' })}</option>
                <option value="lawyer_call">{intl.formatMessage({ id: 'admin.calls.filters.lawyerCalls' })}</option>
                <option value="expat_call">{intl.formatMessage({ id: 'admin.calls.filters.expatCalls' })}</option>
              </select>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.showCompleted}
                  onChange={(e) => {
                    const newShowCompleted = e.target.checked;
                    setFilters(prev => {
                      // Si on décoche et qu'un statut terminé était sélectionné, réinitialiser
                      const completedStatuses = ['completed', 'failed', 'cancelled'];
                      const shouldResetStatus = !newShowCompleted && completedStatuses.includes(prev.status);
                      return {
                        ...prev,
                        showCompleted: newShowCompleted,
                        status: shouldResetStatus ? 'all' : prev.status
                      };
                    });
                  }}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded mr-2"
                />
                <span className="text-sm text-gray-700">{intl.formatMessage({ id: 'admin.calls.filters.includeCompleted' })}</span>
              </label>

              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">{intl.formatMessage({ id: 'admin.calls.filters.view' })}</span>
                <button
                  onClick={() => setSelectedView('grid')}
                  className={`p-1 rounded ${selectedView === 'grid' ? 'bg-red-100 text-red-600' : 'text-gray-400'}`}
                >
                  <BarChart3 size={16} />
                </button>
                <button
                  onClick={() => setSelectedView('list')}
                  className={`p-1 rounded ${selectedView === 'list' ? 'bg-red-100 text-red-600' : 'text-gray-400'}`}
                >
                  <Activity size={16} />
                </button>
                <button
                  onClick={() => setSelectedView('board')}
                  className={`p-1 rounded ${selectedView === 'board' ? 'bg-red-100 text-red-600' : 'text-gray-400'}`}
                >
                  <Monitor size={16} />
                </button>
              </div>

              <div className="flex-1"></div>

              <div className="relative">
                <input
                  type="text"
                  placeholder={intl.formatMessage({ id: 'admin.calls.filters.searchPlaceholder' })}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-4 py-1 border border-gray-300 rounded-md text-sm w-64"
                />
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              </div>
            </div>
          </div>

          {/* Liste des appels selon la vue sélectionnée */}
          {selectedView === 'grid' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredCalls.map((call) => (
                <div key={call.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <CallStatusBadge status={call.status} animated={true} />
                        <CallTypeBadge providerType={call.metadata.providerType} />
                      </div>
                      <div className="text-sm font-mono text-gray-500">
                        ID: {call.id.substring(0, 8)}...
                      </div>
                      <div className="text-xs text-gray-400">
                        {intl.formatMessage({ id: 'admin.calls.modal.created' })} {formatDateTime(call.metadata.createdAt)}
                      </div>
                    </div>
                    
                    <CallDurationTimer 
                      startTime={call.conference.startedAt} 
                      isActive={call.status === 'active'} 
                    />
                  </div>

                  <div className="space-y-3 mb-4">
                    <ParticipantStatusIndicator
                      status={call.participants.provider.status}
                      audioQuality={call.participants.provider.audioQuality}
                      signalStrength={call.participants.provider.signalStrength}
                      name={call.metadata.providerName || intl.formatMessage({ id: 'admin.calls.participant.provider' })}
                      phone={call.participants.provider.phone}
                      type="provider"
                    />
                    
                    <ParticipantStatusIndicator
                      status={call.participants.client.status}
                      audioQuality={call.participants.client.audioQuality}
                      signalStrength={call.participants.client.signalStrength}
                      name={call.metadata.clientName || intl.formatMessage({ id: 'admin.calls.participant.client' })}
                      phone={call.participants.client.phone}
                      type="client"
                    />
                  </div>

                  {/* Métriques de qualité */}
                  {call.realTimeData && (
                    <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                      <div className="bg-gray-50 p-2 rounded">
                        <div className="text-gray-600">{intl.formatMessage({ id: 'admin.calls.modal.latency' })}</div>
                        <div className="font-medium">{call.realTimeData.latency?.toFixed(0)}ms</div>
                      </div>
                      <div className="bg-gray-50 p-2 rounded">
                        <div className="text-gray-600">{intl.formatMessage({ id: 'admin.calls.modal.quality' })}</div>
                        <div className="font-medium">{call.realTimeData.connectionQuality?.toFixed(0)}%</div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <div className="text-sm">
                      <span className="text-gray-600">{intl.formatMessage({ id: 'admin.calls.modal.amount' })} </span>
                      <span className="font-medium">{formatCurrency(call.payment.amount)}</span>
                    </div>
                    
                    <div className="flex space-x-1">
                      <button
                        onClick={() => {
                          setSelectedCall(call);
                          setShowCallModal(true);
                        }}
                        className="p-1 text-blue-600 hover:text-blue-800"
                        title={intl.formatMessage({ id: 'admin.calls.actions.viewDetails' })}
                      >
                        <Eye size={16} />
                      </button>
                      
                      <CallActionButtons
                        session={call}
                        onForceDisconnect={handleForceDisconnect}
                        onTransferCall={handleTransferCall}
                        onJoinCall={handleJoinCall}
                        onMuteCall={handleMuteCall}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedView === 'list' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {intl.formatMessage({ id: 'admin.calls.table.call' })}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {intl.formatMessage({ id: 'admin.calls.table.status' })}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {intl.formatMessage({ id: 'admin.calls.table.participants' })}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {intl.formatMessage({ id: 'admin.calls.table.duration' })}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {intl.formatMessage({ id: 'admin.calls.table.quality' })}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {intl.formatMessage({ id: 'admin.calls.table.amount' })}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {intl.formatMessage({ id: 'admin.calls.table.actions' })}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCalls.map((call) => (
                      <tr key={call.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <CallStatusBadge status={call.status} animated={true} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            <div className="flex items-center space-x-1 mb-1">
                              <span className={`w-2 h-2 rounded-full ${
                                call.participants.provider.status === 'connected' ? 'bg-green-500' : 'bg-gray-300'
                              }`}></span>
                              <span>{call.metadata.providerName || intl.formatMessage({ id: 'admin.calls.participant.provider' })}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className={`w-2 h-2 rounded-full ${
                                call.participants.client.status === 'connected' ? 'bg-green-500' : 'bg-gray-300'
                              }`}></span>
                              <span>{call.metadata.clientName || intl.formatMessage({ id: 'admin.calls.participant.client' })}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <CallDurationTimer 
                            startTime={call.conference.startedAt} 
                            isActive={call.status === 'active'} 
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {call.realTimeData && (
                            <div className="text-sm">
                              <div>{intl.formatMessage({ id: 'admin.calls.table.latency' })} {call.realTimeData.latency?.toFixed(0)}ms</div>
                              <div>{intl.formatMessage({ id: 'admin.calls.table.qualityPercent' })} {call.realTimeData.connectionQuality?.toFixed(0)}%</div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {formatCurrency(call.payment.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <CallActionButtons
                            session={call}
                            onForceDisconnect={handleForceDisconnect}
                            onTransferCall={handleTransferCall}
                            onJoinCall={handleJoinCall}
                            onMuteCall={handleMuteCall}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedView === 'board' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Colonnes par statut */}
              {['pending', 'provider_connecting', 'client_connecting', 'active'].map((status) => (
                <div key={status} className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-2 ${
                      status === 'active' ? 'bg-green-500' :
                      status.includes('connecting') ? 'bg-blue-500' :
                      'bg-gray-400'
                    }`}></div>
                    {status === 'pending' ? intl.formatMessage({ id: 'admin.calls.board.pending' }) :
                     status === 'provider_connecting' ? intl.formatMessage({ id: 'admin.calls.board.providerConnecting' }) :
                     status === 'client_connecting' ? intl.formatMessage({ id: 'admin.calls.board.clientConnecting' }) :
                     status === 'active' ? intl.formatMessage({ id: 'admin.calls.board.active' }) : status}
                    <span className="ml-2 px-2 py-1 bg-white text-xs rounded-full">
                      {filteredCalls.filter(call => call.status === status).length}
                    </span>
                  </h3>
                  
                  <div className="space-y-3">
                    {filteredCalls
                      .filter(call => call.status === status)
                      .map((call) => (
                        <div key={call.id} className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                          <div className="flex justify-between items-start mb-2">
                            <div className="text-sm font-medium text-gray-900">
                              {call.id.substring(0, 8)}...
                            </div>
                            <CallDurationTimer 
                              startTime={call.conference.startedAt} 
                              isActive={call.status === 'active'} 
                            />
                          </div>
                          
                          <div className="text-xs text-gray-500 mb-2">
                            {call.metadata.providerType === 'lawyer' ? intl.formatMessage({ id: 'admin.calls.callType.lawyerCall' }) : intl.formatMessage({ id: 'admin.calls.callType.expatCall' })} 
                            - {formatCurrency(call.payment.amount)}
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex space-x-1">
                              <span className={`w-2 h-2 rounded-full ${
                                call.participants.provider.status === 'connected' ? 'bg-green-500' : 'bg-gray-300'
                              }`}></span>
                              <span className={`w-2 h-2 rounded-full ${
                                call.participants.client.status === 'connected' ? 'bg-green-500' : 'bg-gray-300'
                              }`}></span>
                            </div>
                            
                            <button
                              onClick={() => {
                                setSelectedCall(call);
                                setShowCallModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Eye size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Message si aucun appel */}
          {filteredCalls.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <Phone className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{intl.formatMessage({ id: 'admin.calls.empty.title' })}</h3>
              <p className="text-gray-600">
                {isRealTimeActive
                  ? intl.formatMessage({ id: 'admin.calls.empty.monitoringActive' })
                  : intl.formatMessage({ id: 'admin.calls.empty.monitoringPaused' })}
              </p>
            </div>
          )}
        </div>

        {/* Modal détails d'appel */}
        <Modal
          isOpen={showCallModal}
          onClose={() => setShowCallModal(false)}
          title={intl.formatMessage({ id: 'admin.calls.modal.callDetails' })}
          size="large"
        >
          {selectedCall && (
            <div className="space-y-6">
              {/* Header avec statut et actions */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {intl.formatMessage({ id: 'admin.calls.modal.callId' }, { id: selectedCall.id.substring(0, 8) })}
                  </h3>
                  <div className="flex items-center space-x-3">
                    <CallStatusBadge status={selectedCall.status} animated={true} />
                    <CallTypeBadge providerType={selectedCall.metadata.providerType} />
                    {selectedCall.metadata.priority && (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        selectedCall.metadata.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                        selectedCall.metadata.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedCall.metadata.priority.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <CallDurationTimer 
                    startTime={selectedCall.conference.startedAt} 
                    isActive={selectedCall.status === 'active'} 
                  />
                  <div className="text-sm text-gray-500 mt-1">
                    {formatCurrency(selectedCall.payment.amount)}
                  </div>
                </div>
              </div>

              {/* Participants détaillés */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                    <UserCheck className="mr-2" size={16} />
                    {intl.formatMessage({ id: 'admin.calls.modal.provider' })}
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {selectedCall.metadata.providerName || intl.formatMessage({ id: 'admin.calls.modal.nameUnavailable' })}
                        </div>
                        <div className="text-sm text-gray-500 font-mono">
                          {selectedCall.participants.provider.phone}
                        </div>
                        <div className="text-xs text-gray-400">
                          ID: {selectedCall.metadata.providerId.substring(0, 8)}...
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        selectedCall.participants.provider.status === 'connected' ? 'bg-green-100 text-green-800' :
                        selectedCall.participants.provider.status === 'ringing' ? 'bg-yellow-100 text-yellow-800' :
                        selectedCall.participants.provider.status === 'disconnected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedCall.participants.provider.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-gray-600">{intl.formatMessage({ id: 'admin.calls.modal.attempts' })}</span>
                        <span className="font-medium ml-1">{selectedCall.participants.provider.attemptCount}</span>
                      </div>
                      {selectedCall.participants.provider.audioQuality && (
                        <div>
                          <span className="text-gray-600">{intl.formatMessage({ id: 'admin.calls.modal.audio' })}</span>
                          <span className="font-medium ml-1">{selectedCall.participants.provider.audioQuality}</span>
                        </div>
                      )}
                      {selectedCall.participants.provider.signalStrength !== undefined && (
                        <div>
                          <span className="text-gray-600">{intl.formatMessage({ id: 'admin.calls.modal.signal' })}</span>
                          <span className="font-medium ml-1">{selectedCall.participants.provider.signalStrength}%</span>
                        </div>
                      )}
                      {selectedCall.participants.provider.callSid && (
                        <div>
                          <span className="text-gray-600">{intl.formatMessage({ id: 'admin.calls.modal.callSid' })}</span>
                          <span className="font-mono ml-1 text-xs">{selectedCall.participants.provider.callSid.substring(0, 10)}...</span>
                        </div>
                      )}
                    </div>

                    {selectedCall.participants.provider.connectedAt && (
                      <div className="mt-2 text-xs text-gray-500">
                        {intl.formatMessage({ id: 'admin.calls.modal.connectedAt' })} {formatDateTime(selectedCall.participants.provider.connectedAt)}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                    <Users className="mr-2" size={16} />
                    {intl.formatMessage({ id: 'admin.calls.modal.client' })}
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {selectedCall.metadata.clientName || intl.formatMessage({ id: 'admin.calls.modal.nameUnavailable' })}
                        </div>
                        <div className="text-sm text-gray-500 font-mono">
                          {selectedCall.participants.client.phone}
                        </div>
                        <div className="text-xs text-gray-400">
                          ID: {selectedCall.metadata.clientId.substring(0, 8)}...
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        selectedCall.participants.client.status === 'connected' ? 'bg-green-100 text-green-800' :
                        selectedCall.participants.client.status === 'ringing' ? 'bg-yellow-100 text-yellow-800' :
                        selectedCall.participants.client.status === 'disconnected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedCall.participants.client.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-gray-600">{intl.formatMessage({ id: 'admin.calls.modal.attempts' })}</span>
                        <span className="font-medium ml-1">{selectedCall.participants.client.attemptCount}</span>
                      </div>
                      {selectedCall.participants.client.audioQuality && (
                        <div>
                          <span className="text-gray-600">{intl.formatMessage({ id: 'admin.calls.modal.audio' })}</span>
                          <span className="font-medium ml-1">{selectedCall.participants.client.audioQuality}</span>
                        </div>
                      )}
                      {selectedCall.participants.client.signalStrength !== undefined && (
                        <div>
                          <span className="text-gray-600">{intl.formatMessage({ id: 'admin.calls.modal.signal' })}</span>
                          <span className="font-medium ml-1">{selectedCall.participants.client.signalStrength}%</span>
                        </div>
                      )}
                      {selectedCall.participants.client.callSid && (
                        <div>
                          <span className="text-gray-600">{intl.formatMessage({ id: 'admin.calls.modal.callSid' })}</span>
                          <span className="font-mono ml-1 text-xs">{selectedCall.participants.client.callSid.substring(0, 10)}...</span>
                        </div>
                      )}
                    </div>
                    
                    {selectedCall.participants.client.connectedAt && (
                      <div className="mt-2 text-xs text-gray-500">
                        {intl.formatMessage({ id: 'admin.calls.modal.connectedAt' })} {formatDateTime(selectedCall.participants.client.connectedAt)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Informations de conférence et qualité */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                    <Radio className="mr-2" size={16} />
                    {intl.formatMessage({ id: 'admin.calls.modal.twilioConference' })}
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">{intl.formatMessage({ id: 'admin.calls.modal.conferenceName' })}</span>
                        <span className="font-mono text-xs">{selectedCall.conference.name}</span>
                      </div>
                      {selectedCall.conference.sid && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">{intl.formatMessage({ id: 'admin.calls.modal.conferenceSid' })}</span>
                          <span className="font-mono text-xs">{selectedCall.conference.sid}</span>
                        </div>
                      )}
                      {selectedCall.conference.participantCount && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">{intl.formatMessage({ id: 'admin.calls.modal.participants' })}</span>
                          <span className="font-medium">{selectedCall.conference.participantCount}</span>
                        </div>
                      )}
                      {selectedCall.conference.isRecording && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">{intl.formatMessage({ id: 'admin.calls.actions.recording' })}</span>
                          <span className="text-red-600 flex items-center">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-1"></div>
                            {intl.formatMessage({ id: 'admin.calls.modal.recordingActive' })}
                          </span>
                        </div>
                      )}
                      {selectedCall.conference.audioQuality && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">{intl.formatMessage({ id: 'admin.calls.modal.audioQuality' })}</span>
                          <span className="font-medium">{selectedCall.conference.audioQuality}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                    <Network className="mr-2" size={16} />
                    {intl.formatMessage({ id: 'admin.calls.modal.realtimeMetrics' })}
                  </h4>
                  {selectedCall.realTimeData ? (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-white p-2 rounded">
                          <div className="text-gray-600 text-xs">{intl.formatMessage({ id: 'admin.calls.modal.latency' })}</div>
                          <div className="font-medium">{selectedCall.realTimeData.latency?.toFixed(0)}ms</div>
                        </div>
                        <div className="bg-white p-2 rounded">
                          <div className="text-gray-600 text-xs">{intl.formatMessage({ id: 'admin.calls.modal.quality' })}</div>
                          <div className="font-medium">{selectedCall.realTimeData.connectionQuality?.toFixed(0)}%</div>
                        </div>
                        <div className="bg-white p-2 rounded">
                          <div className="text-gray-600 text-xs">{intl.formatMessage({ id: 'admin.calls.modal.jitter' })}</div>
                          <div className="font-medium">{selectedCall.realTimeData.jitter?.toFixed(1)}ms</div>
                        </div>
                        <div className="bg-white p-2 rounded">
                          <div className="text-gray-600 text-xs">{intl.formatMessage({ id: 'admin.calls.modal.packetLoss' })}</div>
                          <div className="font-medium">{selectedCall.realTimeData.packetLoss?.toFixed(1)}%</div>
                        </div>
                      </div>

                      {selectedCall.realTimeData.lastPing && (
                        <div className="mt-2 text-xs text-gray-500">
                          {intl.formatMessage({ id: 'admin.calls.modal.lastMeasurement' })} {formatDateTime(selectedCall.realTimeData.lastPing)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                      {intl.formatMessage({ id: 'admin.calls.modal.noRealtimeData' })}
                    </div>
                  )}
                </div>
              </div>

              {/* Informations de paiement */}
              <div>
                <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                  <TrendingUp className="mr-2" size={16} />
                  {intl.formatMessage({ id: 'admin.calls.modal.payment' })}
                </h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{intl.formatMessage({ id: 'admin.calls.modal.amount' })}</span>
                      <span className="font-medium">{formatCurrency(selectedCall.payment.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{intl.formatMessage({ id: 'admin.calls.modal.paymentStatus' })}</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        selectedCall.payment.status === 'captured' ? 'bg-green-100 text-green-800' :
                        selectedCall.payment.status === 'authorized' ? 'bg-blue-100 text-blue-800' :
                        selectedCall.payment.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedCall.payment.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{intl.formatMessage({ id: 'admin.calls.modal.intentId' })}</span>
                      <span className="font-mono text-xs">{selectedCall.payment.intentId.substring(0, 12)}...</span>
                    </div>
                  </div>
                  {selectedCall.payment.failureReason && (
                    <div className="mt-3 p-2 bg-red-50 rounded text-sm">
                      <span className="text-red-700 font-medium">{intl.formatMessage({ id: 'admin.calls.modal.paymentError' })} </span>
                      <span className="text-red-600">{selectedCall.payment.failureReason}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Langues et métadonnées */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                    <Languages className="mr-2" size={16} />
                    {intl.formatMessage({ id: 'admin.calls.modal.languages' })}
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-gray-600">{intl.formatMessage({ id: 'admin.calls.modal.clientLanguages' })} </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedCall.metadata.clientLanguages?.map((lang) => (
                          <span key={lang} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {lang}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">{intl.formatMessage({ id: 'admin.calls.modal.providerLanguages' })} </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedCall.metadata.providerLanguages?.map((lang) => (
                          <span key={lang} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            {lang}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                    <Info className="mr-2" size={16} />
                    {intl.formatMessage({ id: 'admin.calls.modal.metadata' })}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{intl.formatMessage({ id: 'admin.calls.modal.maxDuration' })}</span>
                      <span className="font-medium">{selectedCall.metadata.maxDuration / 60} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{intl.formatMessage({ id: 'admin.calls.modal.source' })}</span>
                      <span className="font-medium">{selectedCall.metadata.source || 'web'}</span>
                    </div>
                    {selectedCall.metadata.requestId && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">{intl.formatMessage({ id: 'admin.calls.modal.requestId' })}</span>
                        <span className="font-mono text-xs">{selectedCall.metadata.requestId}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">{intl.formatMessage({ id: 'admin.calls.modal.created' })}</span>
                      <span className="font-medium">{formatDateTime(selectedCall.metadata.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{intl.formatMessage({ id: 'admin.calls.modal.updated' })}</span>
                      <span className="font-medium">{formatDateTime(selectedCall.metadata.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions d'administration */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  {intl.formatMessage({ id: 'admin.calls.modal.realtimeMonitoring' })}
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowCallModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    {intl.formatMessage({ id: 'admin.calls.actions.close' })}
                  </button>
                  
                  <CallActionButtons
                    session={selectedCall}
                    onForceDisconnect={handleForceDisconnect}
                    onTransferCall={handleTransferCall}
                    onJoinCall={handleJoinCall}
                    onMuteCall={handleMuteCall}
                  />
                  
                  {selectedCall.conference.recordingUrl && (
                    <button
                      onClick={() => window.open(selectedCall.conference.recordingUrl, '_blank')}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
                    >
                      <ExternalLink size={16} className="mr-2" />
                      {intl.formatMessage({ id: 'admin.calls.actions.recording' })}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* Modal statistiques système */}
        <Modal
          isOpen={showStatsModal}
          onClose={() => setShowStatsModal(false)}
          title={intl.formatMessage({ id: 'admin.calls.systemStats.title' })}
          size="large"
        >
          {systemHealth && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricsCard
                  title={intl.formatMessage({ id: 'admin.calls.systemStats.apiStatus' })}
                  value={systemHealth.apiStatus.toUpperCase()}
                  icon={Wifi}
                  color={systemHealth.apiStatus === 'operational' ? 'bg-green-500' : 'bg-red-500'}
                />
                <MetricsCard
                  title={intl.formatMessage({ id: 'admin.calls.systemStats.responseTime' })}
                  value={`${systemHealth.responseTime.toFixed(0)}ms`}
                  icon={Timer}
                  color="bg-blue-500"
                />
                <MetricsCard
                  title={intl.formatMessage({ id: 'admin.calls.systemStats.currentLoad' })}
                  value={`${systemHealth.currentLoad}/${systemHealth.callCapacity}`}
                  icon={Server}
                  color="bg-purple-500"
                />
              </div>

              {Object.keys(systemHealth.regionHealth).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">{intl.formatMessage({ id: 'admin.calls.systemStats.regionHealth' })}</h3>
                  <div className="space-y-3">
                    {Object.entries(systemHealth.regionHealth).map(([region, health]) => (
                      <div key={region} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            health.status === 'healthy' ? 'bg-green-500' :
                            health.status === 'warning' ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}></div>
                          <span className="font-medium">{region}</span>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            health.status === 'healthy' ? 'bg-green-100 text-green-800' :
                            health.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {health.status}
                          </span>
                        </div>
                        <div className="flex space-x-4 text-sm">
                          <div>
                            <span className="text-gray-600">{intl.formatMessage({ id: 'admin.calls.systemStats.latency' })}: </span>
                            <span className="font-medium">{health.latency.toFixed(0)}ms</span>
                          </div>
                          <div>
                            <span className="text-gray-600">{intl.formatMessage({ id: 'admin.calls.systemStats.availability' })}: </span>
                            <span className="font-medium">{health.availability}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {callMetrics && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">{intl.formatMessage({ id: 'admin.calls.systemStats.detailedMetrics' })}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600">{intl.formatMessage({ id: 'admin.calls.metrics.successRate' })}</div>
                      <div className="text-xl font-bold text-gray-900">{callMetrics.successRate.toFixed(1)}%</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600">{intl.formatMessage({ id: 'admin.calls.metrics.avgDuration' })}</div>
                      <div className="text-xl font-bold text-gray-900">{Math.round(callMetrics.averageCallDuration / 60)}min</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600">{intl.formatMessage({ id: 'admin.calls.metrics.connectionTime' })}</div>
                      <div className="text-xl font-bold text-gray-900">{Math.round(callMetrics.averageConnectionTime)}s</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600">{intl.formatMessage({ id: 'admin.calls.metrics.audioQuality' })}</div>
                      <div className="text-xl font-bold text-gray-900">{callMetrics.audioQualityAverage.toFixed(1)}/4</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600">{intl.formatMessage({ id: 'admin.calls.metrics.networkLatency' })}</div>
                      <div className="text-xl font-bold text-gray-900">{Math.round(callMetrics.networkLatencyAverage)}ms</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600">{intl.formatMessage({ id: 'admin.calls.metrics.callsToday' })}</div>
                      <div className="text-xl font-bold text-gray-900">{callMetrics.totalCallsToday}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>
      </ErrorBoundary>
    </AdminLayout>
  );
};

export default AdminCallsMonitoring;