// src/pages/admin/AdminProviders.tsx
// Page de gestion et monitoring des prestataires en temps réel
// =============================================================================

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserCheck,
  Users,
  Wifi,
  WifiOff,
  Phone,
  PhoneOff,
  Clock,
  MapPin,
  Search,
  Filter,
  RefreshCw,
  Download,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  Globe,
  Star,
  Calendar,
  ArrowUp,
  ArrowDown,
  Minus,
  Bell,
  Settings,
  Mail,
  MessageSquare,
  Timer,
  Zap,
  Shield,
  Scale,
  Briefcase,
  Check,
  X,
} from 'lucide-react';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  Timestamp,
  getDocs,
  doc,
  updateDoc,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import Modal from '../../components/common/Modal';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import RealtimeSuspendedBanner, { RealtimeCountdown } from '../../components/admin/RealtimeSuspendedBanner';
import { useAutoSuspendRealtime } from '../../hooks/useAutoSuspendRealtime';
import { useAuth } from '../../contexts/AuthContext';
import { logError } from '../../utils/logging';

// ============ TYPES ============
interface Provider {
  id: string;
  email: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  type: 'lawyer' | 'expat';
  role?: string;
  isOnline: boolean;
  availability: 'available' | 'busy' | 'offline';
  currentCallSessionId?: string;
  busySince?: Timestamp;
  busyReason?: string;
  lastActivity?: Timestamp;
  lastActivityCheck?: Timestamp;
  lastStatusChange?: Timestamp;
  isApproved: boolean;
  approvalStatus?: string;
  validationStatus?: 'pending' | 'approved' | 'rejected';
  isVisible?: boolean;
  country?: string;
  city?: string;
  languages?: string[];
  specializations?: string[];
  rating?: number;
  totalCalls?: number;
  successfulCalls?: number;
  totalRevenue?: number;
  averageCallDuration?: number;
  responseRate?: number;
  createdAt?: Timestamp;
  stripeOnboardingComplete?: boolean;
  paypalOnboardingComplete?: boolean;
  paymentGateway?: 'stripe' | 'paypal';
  profilePhoto?: string;
}

interface ProviderStats {
  totalProviders: number;
  onlineNow: number;
  busyNow: number;
  offlineNow: number;
  approvedProviders: number;
  pendingApproval: number;
  lawyersCount: number;
  expatsCount: number;
  averageRating: number;
  totalCallsToday: number;
  totalRevenueToday: number;
}

interface ProviderAlert {
  id: string;
  providerId: string;
  providerName: string;
  type: 'inactive_long' | 'low_response_rate' | 'kyc_incomplete' | 'payment_issue';
  severity: 'low' | 'medium' | 'high';
  message: string;
  timestamp: Date;
}

// ============ COMPOSANTS UTILITAIRES ============
const StatusBadge: React.FC<{ status: 'available' | 'busy' | 'offline'; isOnline: boolean }> = ({ status, isOnline }) => {
  const getConfig = () => {
    if (!isOnline || status === 'offline') {
      return { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: WifiOff, label: 'Hors ligne' };
    }
    if (status === 'busy') {
      return { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: Phone, label: 'En appel', pulse: true };
    }
    return { color: 'bg-green-100 text-green-800 border-green-200', icon: Wifi, label: 'En ligne', pulse: true };
  };

  const config = getConfig();
  const IconComponent = config.icon;

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${config.color} ${
      config.pulse ? 'animate-pulse' : ''
    }`}>
      <IconComponent size={12} className="mr-1" />
      {config.label}
    </span>
  );
};

const ProviderTypeBadge: React.FC<{ type: 'lawyer' | 'expat' }> = ({ type }) => {
  if (type === 'lawyer') {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        <Scale size={12} className="mr-1" />
        Avocat
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
      <Globe size={12} className="mr-1" />
      Expatrié
    </span>
  );
};

const MetricCard: React.FC<{
  title: string;
  value: string | number;
  change?: number;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  color: string;
  subtitle?: string;
  isLive?: boolean;
}> = ({ title, value, change, icon: Icon, color, subtitle, isLive }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 relative overflow-hidden">
    {isLive && (
      <div className="absolute top-2 right-2 flex items-center">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
        <span className="text-xs text-green-600 font-medium">LIVE</span>
      </div>
    )}
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        {change !== undefined && (
          <div className="flex items-center mt-2">
            {change > 0 ? (
              <ArrowUp className="text-green-500" size={14} />
            ) : change < 0 ? (
              <ArrowDown className="text-red-500" size={14} />
            ) : (
              <Minus className="text-gray-400" size={14} />
            )}
            <span className={`text-sm ml-1 ${
              change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-500'
            }`}>
              {Math.abs(change)}% vs hier
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
const AdminProviders: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const mountedRef = useRef<boolean>(true);

  // States des données
  const [providers, setProviders] = useState<Provider[]>([]);
  const [stats, setStats] = useState<ProviderStats | null>(null);
  const [alerts, setAlerts] = useState<ProviderAlert[]>([]);
  // ✅ OPTIMISATION: Stats séparées pour éviter les lectures excessives
  const [todayCallsStats, setTodayCallsStats] = useState({ totalCallsToday: 0, totalRevenueToday: 0 });
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);

  // States UI
  const [isLoading, setIsLoading] = useState(true);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // ✅ OPTIMISATION: Auto-suspension du temps réel après 5 min d'inactivité
  // Économie estimée: ~90% des lectures quand l'onglet est ouvert mais inactif
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
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    approval: 'all',
    country: 'all',
  });
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'lastActivity' | 'rating'>('status');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Formatters
  const formatDateTime = (timestamp: Timestamp | Date | undefined) => {
    if (!timestamp) return 'N/A';
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatRelativeTime = (timestamp: Timestamp | Date | undefined) => {
    if (!timestamp) return 'N/A';
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    return `Il y a ${diffDays}j`;
  };

  // Charger les stats d'appels d'aujourd'hui depuis Firestore
  const loadTodayCallsStats = useCallback(async () => {
    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const callsQuery = query(
        collection(db, 'call_sessions'),
        where('startTime', '>=', Timestamp.fromDate(startOfToday)),
        where('payment.status', '==', 'captured')
      );

      const snapshot = await getDocs(callsQuery);
      let totalCalls = 0;
      let totalRevenue = 0;

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (!data._placeholder) {
          totalCalls++;
          // Revenus = montant total de l'appel
          const amount = data.payment?.amount || data.totalAmount || 0;
          totalRevenue += Number(amount);
        }
      });

      return { totalCallsToday: totalCalls, totalRevenueToday: totalRevenue };
    } catch (error) {
      console.error('[AdminProviders] Error loading today calls stats:', error);
      // Fallback: essayer sans le filtre payment.status si l'index n'existe pas
      try {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const callsQuery = query(
          collection(db, 'call_sessions'),
          where('startTime', '>=', Timestamp.fromDate(startOfToday))
        );

        const snapshot = await getDocs(callsQuery);
        let totalCalls = 0;
        let totalRevenue = 0;

        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (!data._placeholder && data.payment?.status === 'captured') {
            totalCalls++;
            const amount = data.payment?.amount || data.totalAmount || 0;
            totalRevenue += Number(amount);
          }
        });

        return { totalCallsToday: totalCalls, totalRevenueToday: totalRevenue };
      } catch (fallbackError) {
        console.error('[AdminProviders] Fallback also failed:', fallbackError);
        return { totalCallsToday: 0, totalRevenueToday: 0 };
      }
    }
  }, []);

  // Chargement des prestataires en temps réel
  useEffect(() => {
    if (!currentUser || !isRealTimeActive) return;

    mountedRef.current = true;
    console.log('🟢 Démarrage du monitoring des prestataires');

    // Écoute de tous les prestataires (lawyers + expats)
    const providersQuery = query(
      collection(db, 'sos_profiles'),
      where('type', 'in', ['lawyer', 'expat']),
      orderBy('lastActivity', 'desc'),
      limit(500)
    );

    const unsubscribe = onSnapshot(
      providersQuery,
      async (snapshot) => {
        if (!mountedRef.current) return;

        const providersList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as Provider));

        console.log(`👥 ${providersList.length} prestataires chargés`);
        setProviders(providersList);
        setIsLoading(false);

        // Calculer les stats
        const onlineCount = providersList.filter(p => p.isOnline && p.availability === 'available').length;
        const busyCount = providersList.filter(p => p.isOnline && p.availability === 'busy').length;
        const offlineCount = providersList.filter(p => !p.isOnline || p.availability === 'offline').length;
        const approvedCount = providersList.filter(p => p.isApproved).length;
        const pendingCount = providersList.filter(p => !p.isApproved && p.approvalStatus === 'pending').length;
        const lawyersCount = providersList.filter(p => p.type === 'lawyer').length;
        const expatsCount = providersList.filter(p => p.type === 'expat').length;

        const ratingsSum = providersList
          .filter(p => p.rating !== undefined)
          .reduce((sum, p) => sum + (p.rating || 0), 0);
        const ratingsCount = providersList.filter(p => p.rating !== undefined).length;
        const averageRating = ratingsCount > 0 ? ratingsSum / ratingsCount : 0;

        // ✅ OPTIMISATION: Ne plus charger les stats à chaque snapshot
        // Les stats d'appels sont maintenant chargées indépendamment (voir useEffect séparé)
        setStats({
          totalProviders: providersList.length,
          onlineNow: onlineCount,
          busyNow: busyCount,
          offlineNow: offlineCount,
          approvedProviders: approvedCount,
          pendingApproval: pendingCount,
          lawyersCount,
          expatsCount,
          averageRating,
          totalCallsToday: todayCallsStats.totalCallsToday,
          totalRevenueToday: todayCallsStats.totalRevenueToday,
        });

        // Générer des alertes
        generateAlerts(providersList);
      },
      (error) => {
        if (!mountedRef.current) return;
        console.error('Erreur lors du chargement des prestataires:', error);
        logError({
          origin: 'frontend',
          error: `Erreur monitoring prestataires: ${error.message}`,
          context: { component: 'AdminProviders' },
        });
        setIsLoading(false);
      }
    );

    return () => {
      console.log('🔴 Arrêt du monitoring des prestataires');
      mountedRef.current = false;
      unsubscribe();
    };
  }, [currentUser, isRealTimeActive, todayCallsStats]);

  // ✅ OPTIMISATION: Charger les stats d'appels indépendamment (toutes les 60 secondes)
  // Économie estimée: ~15-20€/mois en lectures Firestore
  useEffect(() => {
    if (!currentUser) return;

    // Charger immédiatement au montage
    loadTodayCallsStats().then(stats => {
      if (mountedRef.current) {
        setTodayCallsStats(stats);
      }
    });

    // Puis rafraîchir toutes les 60 secondes
    const intervalId = setInterval(() => {
      loadTodayCallsStats().then(stats => {
        if (mountedRef.current) {
          setTodayCallsStats(stats);
        }
      });
    }, 60000); // 60 secondes

    return () => {
      clearInterval(intervalId);
    };
  }, [currentUser, loadTodayCallsStats]);

  // Générer des alertes basées sur les données
  const generateAlerts = useCallback((providersList: Provider[]) => {
    const newAlerts: ProviderAlert[] = [];
    const now = Date.now();

    providersList.forEach((provider) => {
      // Alerte: en ligne depuis longtemps sans activité
      if (provider.isOnline && provider.lastActivity) {
        const lastActivityTime = provider.lastActivity.toDate().getTime();
        const inactivityMs = now - lastActivityTime;
        const inactivityHours = inactivityMs / 3600000;

        if (inactivityHours > 1) {
          newAlerts.push({
            id: `inactive_${provider.id}`,
            providerId: provider.id,
            providerName: provider.displayName || provider.email,
            type: 'inactive_long',
            severity: inactivityHours > 2 ? 'high' : 'medium',
            message: `En ligne mais inactif depuis ${Math.floor(inactivityHours)}h`,
            timestamp: new Date(),
          });
        }
      }

      // Alerte: taux de réponse faible
      if (provider.responseRate !== undefined && provider.responseRate < 50 && provider.totalCalls && provider.totalCalls > 5) {
        newAlerts.push({
          id: `response_${provider.id}`,
          providerId: provider.id,
          providerName: provider.displayName || provider.email,
          type: 'low_response_rate',
          severity: provider.responseRate < 30 ? 'high' : 'medium',
          message: `Taux de réponse faible: ${provider.responseRate.toFixed(0)}%`,
          timestamp: new Date(),
        });
      }

      // Alerte: KYC incomplet
      if (provider.isApproved && !provider.stripeOnboardingComplete && !provider.paypalOnboardingComplete) {
        newAlerts.push({
          id: `kyc_${provider.id}`,
          providerId: provider.id,
          providerName: provider.displayName || provider.email,
          type: 'kyc_incomplete',
          severity: 'high',
          message: 'KYC/Paiement non configuré',
          timestamp: new Date(),
        });
      }
    });

    setAlerts(newAlerts.slice(0, 20)); // Garder les 20 premières
  }, []);

  // Filtrage et tri des prestataires
  const filteredProviders = useMemo(() => {
    let result = providers.filter((provider) => {
      // Filtre par recherche
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          provider.email?.toLowerCase().includes(search) ||
          provider.displayName?.toLowerCase().includes(search) ||
          provider.firstName?.toLowerCase().includes(search) ||
          provider.lastName?.toLowerCase().includes(search) ||
          provider.phone?.includes(search) ||
          provider.country?.toLowerCase().includes(search) ||
          provider.city?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      // Filtre par statut
      if (filters.status !== 'all') {
        if (filters.status === 'online' && (!provider.isOnline || provider.availability !== 'available')) return false;
        if (filters.status === 'busy' && (!provider.isOnline || provider.availability !== 'busy')) return false;
        if (filters.status === 'offline' && (provider.isOnline && provider.availability !== 'offline')) return false;
      }

      // Filtre par type
      if (filters.type !== 'all' && provider.type !== filters.type) return false;

      // Filtre par approbation
      if (filters.approval !== 'all') {
        if (filters.approval === 'approved' && !provider.isApproved) return false;
        if (filters.approval === 'pending' && (provider.isApproved || provider.approvalStatus !== 'pending')) return false;
        if (filters.approval === 'rejected' && provider.approvalStatus !== 'rejected') return false;
      }

      return true;
    });

    // Tri
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = (a.displayName || a.email).localeCompare(b.displayName || b.email);
          break;
        case 'status':
          // Online > Busy > Offline
          const statusOrder = { available: 3, busy: 2, offline: 1 };
          const aStatus = a.isOnline ? (statusOrder[a.availability] || 1) : 0;
          const bStatus = b.isOnline ? (statusOrder[b.availability] || 1) : 0;
          comparison = bStatus - aStatus;
          break;
        case 'lastActivity':
          const aTime = a.lastActivity?.toDate().getTime() || 0;
          const bTime = b.lastActivity?.toDate().getTime() || 0;
          comparison = bTime - aTime;
          break;
        case 'rating':
          comparison = (b.rating || 0) - (a.rating || 0);
          break;
      }

      return sortOrder === 'desc' ? comparison : -comparison;
    });

    return result;
  }, [providers, searchTerm, filters, sortBy, sortOrder]);

  // Export CSV
  const handleExportCSV = useCallback(() => {
    const headers = [
      'ID',
      'Email',
      'Nom',
      'Type',
      'Statut',
      'En ligne',
      'Pays',
      'Ville',
      'Note',
      'Appels totaux',
      'Taux de réponse',
      'Dernière activité',
    ];

    const rows = filteredProviders.map((p) => [
      p.id,
      p.email,
      p.displayName || `${p.firstName || ''} ${p.lastName || ''}`.trim(),
      p.type,
      p.availability,
      p.isOnline ? 'Oui' : 'Non',
      p.country || '',
      p.city || '',
      p.rating?.toFixed(1) || '',
      p.totalCalls || 0,
      p.responseRate ? `${p.responseRate.toFixed(0)}%` : '',
      p.lastActivity ? formatDateTime(p.lastActivity) : '',
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prestataires_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [filteredProviders]);

  // Forcer un prestataire hors ligne (using transaction for atomicity)
  const handleForceOffline = useCallback(async (providerId: string) => {
    if (!confirm('Voulez-vous vraiment mettre ce prestataire hors ligne ?')) return;

    try {
      await runTransaction(db, async (transaction) => {
        const providerRef = doc(db, 'sos_profiles', providerId);
        const userRef = doc(db, 'users', providerId);

        const updateData = {
          isOnline: false,
          availability: 'offline',
          lastStatusChange: Timestamp.now(),
        };

        transaction.update(providerRef, updateData);
        transaction.update(userRef, updateData);
      });

      console.log(`Prestataire ${providerId} mis hors ligne par l'admin`);
    } catch (error) {
      console.error('Erreur lors de la mise hors ligne:', error);
      alert('Erreur lors de la mise hors ligne du prestataire');
    }
  }, []);

  // Approuver un prestataire (using transaction for atomicity)
  const handleApproveProvider = useCallback(async (providerId: string) => {
    if (!confirm('Voulez-vous approuver ce prestataire ?')) return;

    try {
      await runTransaction(db, async (transaction) => {
        const providerRef = doc(db, 'sos_profiles', providerId);
        const userRef = doc(db, 'users', providerId);

        const updateData = {
          isApproved: true,
          validationStatus: 'approved',
          approvalStatus: 'approved',
          updatedAt: Timestamp.now(),
        };

        transaction.update(providerRef, updateData);
        transaction.update(userRef, updateData);
      });

      console.log(`Prestataire ${providerId} approuve par l'admin`);
      alert('Prestataire approuve avec succes');
    } catch (error) {
      console.error('Erreur lors de l\'approbation:', error);
      logError({
        origin: 'frontend',
        error: `Erreur approbation prestataire: ${(error as Error).message}`,
        context: { component: 'AdminProviders', providerId },
      });
      alert('Erreur lors de l\'approbation du prestataire');
    }
  }, []);

  // Rejeter un prestataire (using transaction for atomicity)
  const handleRejectProvider = useCallback(async (providerId: string) => {
    if (!confirm('Voulez-vous rejeter ce prestataire ?')) return;

    try {
      await runTransaction(db, async (transaction) => {
        const providerRef = doc(db, 'sos_profiles', providerId);
        const userRef = doc(db, 'users', providerId);

        const updateData = {
          isApproved: false,
          validationStatus: 'rejected',
          approvalStatus: 'rejected',
          updatedAt: Timestamp.now(),
        };

        transaction.update(providerRef, updateData);
        transaction.update(userRef, updateData);
      });

      console.log(`Prestataire ${providerId} rejete par l'admin`);
      alert('Prestataire rejete');
    } catch (error) {
      console.error('Erreur lors du rejet:', error);
      logError({
        origin: 'frontend',
        error: `Erreur rejet prestataire: ${(error as Error).message}`,
        context: { component: 'AdminProviders', providerId },
      });
      alert('Erreur lors du rejet du prestataire');
    }
  }, []);

  // Voir les détails d'un prestataire
  const handleViewDetails = useCallback((provider: Provider) => {
    setSelectedProvider(provider);
    setShowDetailModal(true);
  }, []);

  // Nombre d'alertes non résolues
  const unreadAlertsCount = alerts.length;

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des prestataires...</p>
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
            Une erreur est survenue lors du chargement des prestataires.
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
                <UserCheck className="mr-3 text-blue-600" size={28} />
                Gestion des Prestataires
                {isRealTimeActive && (
                  <div className="ml-3 flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse mr-2"></div>
                    <span className="text-sm text-green-600 font-medium">LIVE</span>
                  </div>
                )}
              </h1>
              <p className="text-gray-600 mt-1">
                Monitoring et gestion des avocats et expatriés partenaires
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {/* Alertes */}
              <button
                onClick={() => setShowStatsModal(true)}
                className={`relative p-2 rounded-lg border transition-colors ${
                  unreadAlertsCount > 0
                    ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
                title="Alertes actives"
              >
                <Bell size={20} />
                {unreadAlertsCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadAlertsCount > 9 ? '9+' : unreadAlertsCount}
                  </span>
                )}
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
                  title={isRealTimeActive ? 'Pause temps réel' : 'Activer temps réel'}
                >
                  <Activity size={20} />
                </button>
              </div>

              {/* Export */}
              <button
                onClick={handleExportCSV}
                className="p-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                title="Exporter CSV"
              >
                <Download size={20} />
              </button>

              {/* Refresh */}
              <button
                onClick={() => window.location.reload()}
                className="p-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                title="Actualiser"
              >
                <RefreshCw size={20} />
              </button>
            </div>
          </div>

          {/* Métriques principales */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-8">
              <MetricCard
                title="En ligne maintenant"
                value={stats.onlineNow}
                icon={Wifi}
                color="bg-green-500"
                subtitle={`sur ${stats.totalProviders} prestataires`}
                isLive
              />
              <MetricCard
                title="En appel"
                value={stats.busyNow}
                icon={Phone}
                color="bg-orange-500"
                isLive
              />
              <MetricCard
                title="Hors ligne"
                value={stats.offlineNow}
                icon={WifiOff}
                color="bg-gray-500"
              />
              <MetricCard
                title="Avocats"
                value={stats.lawyersCount}
                icon={Scale}
                color="bg-blue-500"
                subtitle={`${providers.filter(p => p.type === 'lawyer' && p.isOnline).length} en ligne`}
              />
              <MetricCard
                title="Expatriés"
                value={stats.expatsCount}
                icon={Globe}
                color="bg-teal-500"
                subtitle={`${providers.filter(p => p.type === 'expat' && p.isOnline).length} en ligne`}
              />
            </div>
          )}

          {/* Barre de statistiques supplémentaires */}
          {stats && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stats.approvedProviders}</div>
                  <div className="text-xs text-gray-500">Approuvés</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">{stats.pendingApproval}</div>
                  <div className="text-xs text-gray-500">En attente</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : 'N/A'}
                  </div>
                  <div className="text-xs text-gray-500">Note moyenne</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {((stats.onlineNow / stats.totalProviders) * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-500">Taux de présence</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{stats.totalCallsToday}</div>
                  <div className="text-xs text-gray-500">Appels aujourd'hui</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {stats.totalRevenueToday.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
                  </div>
                  <div className="text-xs text-gray-500">Revenus aujourd'hui</div>
                </div>
              </div>
            </div>
          )}

          {/* Alertes actives */}
          {alerts.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <AlertTriangle className="mr-2 text-yellow-500" size={20} />
                Alertes ({alerts.length})
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {alerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      alert.severity === 'high'
                        ? 'bg-red-50 border-l-4 border-red-500'
                        : alert.severity === 'medium'
                        ? 'bg-yellow-50 border-l-4 border-yellow-500'
                        : 'bg-blue-50 border-l-4 border-blue-500'
                    }`}
                  >
                    <div>
                      <span className="font-medium text-gray-900">{alert.providerName}</span>
                      <span className="text-gray-600 ml-2">- {alert.message}</span>
                    </div>
                    <button
                      onClick={() => {
                        const provider = providers.find((p) => p.id === alert.providerId);
                        if (provider) handleViewDetails(provider);
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filtres et recherche */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <Filter size={16} className="text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Filtres:</span>
              </div>

              <select
                value={filters.status}
                onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
              >
                <option value="all">Tous les statuts</option>
                <option value="online">En ligne</option>
                <option value="busy">En appel</option>
                <option value="offline">Hors ligne</option>
              </select>

              <select
                value={filters.type}
                onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
              >
                <option value="all">Tous les types</option>
                <option value="lawyer">Avocats</option>
                <option value="expat">Expatriés</option>
              </select>

              <select
                value={filters.approval}
                onChange={(e) => setFilters((prev) => ({ ...prev, approval: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
              >
                <option value="all">Toutes approbations</option>
                <option value="approved">Approuvés</option>
                <option value="pending">En attente</option>
                <option value="rejected">Rejetés</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
              >
                <option value="status">Trier par statut</option>
                <option value="name">Trier par nom</option>
                <option value="lastActivity">Trier par activité</option>
                <option value="rating">Trier par note</option>
              </select>

              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-1.5 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {sortOrder === 'desc' ? <ArrowDown size={16} /> : <ArrowUp size={16} />}
              </button>

              <div className="flex-1"></div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Rechercher nom, email, pays..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-4 py-1.5 border border-gray-300 rounded-md text-sm w-64"
                />
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              </div>

              <span className="text-sm text-gray-500">
                {filteredProviders.length} résultat(s)
              </span>
            </div>
          </div>

          {/* Liste des prestataires */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prestataire
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Localisation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dernière activité
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Note
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Appels
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProviders.map((provider) => (
                    <tr key={provider.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {provider.profilePhoto ? (
                              <img
                                className="h-10 w-10 rounded-full object-cover"
                                src={provider.profilePhoto}
                                alt={`Photo de profil de ${provider.displayName || provider.firstName || 'prestataire'}`}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <Users className="h-5 w-5 text-gray-500" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {provider.displayName || `${provider.firstName || ''} ${provider.lastName || ''}`.trim() || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500">{provider.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={provider.availability} isOnline={provider.isOnline} />
                        {provider.availability === 'busy' && provider.busySince && (
                          <div className="text-xs text-gray-500 mt-1">
                            depuis {formatRelativeTime(provider.busySince)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <ProviderTypeBadge type={provider.type} />
                        {!provider.isApproved && (
                          <span className="ml-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                            Non approuvé
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <MapPin size={14} className="mr-1" />
                          {provider.city && provider.country
                            ? `${provider.city}, ${provider.country}`
                            : provider.country || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Clock size={14} className="mr-1" />
                          {formatRelativeTime(provider.lastActivity)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {provider.rating ? (
                          <div className="flex items-center">
                            <Star size={14} className="text-yellow-400 mr-1" />
                            <span className="text-sm font-medium">{provider.rating.toFixed(1)}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {provider.totalCalls || 0}
                        {provider.responseRate !== undefined && (
                          <span className="text-xs text-gray-400 ml-1">
                            ({provider.responseRate.toFixed(0)}%)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {/* Approve/Reject buttons for non-approved providers */}
                          {!provider.isApproved && (
                            <>
                              <button
                                onClick={() => handleApproveProvider(provider.id)}
                                className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
                                title="Approuver"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={() => handleRejectProvider(provider.id)}
                                className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                                title="Rejeter"
                              >
                                <X size={16} />
                              </button>
                            </>
                          )}
                          {/* Show rejection button for approved providers (to revoke approval) */}
                          {provider.isApproved && (
                            <button
                              onClick={() => handleRejectProvider(provider.id)}
                              className="p-1.5 text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded"
                              title="Revoquer l'approbation"
                            >
                              <X size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => handleViewDetails(provider)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                            title="Voir détails"
                          >
                            <Eye size={16} />
                          </button>
                          {provider.isOnline && (
                            <button
                              onClick={() => handleForceOffline(provider.id)}
                              className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                              title="Forcer hors ligne"
                            >
                              <WifiOff size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/admin/users?id=${provider.id}`)}
                            className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded"
                            title="Voir profil complet"
                          >
                            <Settings size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredProviders.length === 0 && (
              <div className="p-12 text-center">
                <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun prestataire trouvé</h3>
                <p className="text-gray-600">
                  Essayez de modifier vos filtres ou votre recherche.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal détails du prestataire */}
        <Modal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title="Détails du prestataire"
          size="large"
        >
          {selectedProvider && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                    {selectedProvider.profilePhoto ? (
                      <img
                        src={selectedProvider.profilePhoto}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Users className="h-8 w-8 text-gray-500" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {selectedProvider.displayName ||
                        `${selectedProvider.firstName || ''} ${selectedProvider.lastName || ''}`.trim() ||
                        'N/A'}
                    </h3>
                    <p className="text-gray-500">{selectedProvider.email}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <StatusBadge status={selectedProvider.availability} isOnline={selectedProvider.isOnline} />
                      <ProviderTypeBadge type={selectedProvider.type} />
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {selectedProvider.rating && (
                    <div className="flex items-center justify-end mb-2">
                      <Star className="text-yellow-400 mr-1" size={20} />
                      <span className="text-2xl font-bold">{selectedProvider.rating.toFixed(1)}</span>
                    </div>
                  )}
                  <span
                    className={`px-3 py-1 text-sm rounded-full ${
                      selectedProvider.isApproved
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {selectedProvider.isApproved ? 'Approuvé' : 'Non approuvé'}
                  </span>
                </div>
              </div>

              {/* Informations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Informations personnelles</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">ID:</span>
                      <span className="font-mono text-sm">{selectedProvider.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Téléphone:</span>
                      <span>{selectedProvider.phone || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pays:</span>
                      <span>{selectedProvider.country || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ville:</span>
                      <span>{selectedProvider.city || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Inscrit le:</span>
                      <span>{formatDateTime(selectedProvider.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Statistiques</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Appels totaux:</span>
                      <span className="font-medium">{selectedProvider.totalCalls || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Appels réussis:</span>
                      <span className="font-medium">{selectedProvider.successfulCalls || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Taux de réponse:</span>
                      <span className="font-medium">
                        {selectedProvider.responseRate !== undefined
                          ? `${selectedProvider.responseRate.toFixed(0)}%`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Revenus totaux:</span>
                      <span className="font-medium">
                        {selectedProvider.totalRevenue !== undefined
                          ? `${selectedProvider.totalRevenue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Durée moyenne:</span>
                      <span className="font-medium">
                        {selectedProvider.averageCallDuration !== undefined
                          ? `${Math.round(selectedProvider.averageCallDuration / 60)} min`
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Activité */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Activité</h4>
                <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-gray-600 text-sm">Dernière activité:</span>
                    <div className="font-medium">{formatRelativeTime(selectedProvider.lastActivity)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600 text-sm">Dernier changement statut:</span>
                    <div className="font-medium">{formatRelativeTime(selectedProvider.lastStatusChange)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600 text-sm">Configuration paiement:</span>
                    <div className="font-medium space-y-1">
                      {/* Stripe */}
                      <div className="flex items-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          selectedProvider.stripeOnboardingComplete
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {selectedProvider.stripeOnboardingComplete ? (
                            <><CheckCircle size={12} className="mr-1" /> Stripe OK</>
                          ) : (
                            <><XCircle size={12} className="mr-1" /> Stripe</>
                          )}
                        </span>
                      </div>
                      {/* PayPal */}
                      <div className="flex items-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          selectedProvider.paypalOnboardingComplete
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {selectedProvider.paypalOnboardingComplete ? (
                            <><CheckCircle size={12} className="mr-1" /> PayPal OK</>
                          ) : (
                            <><XCircle size={12} className="mr-1" /> PayPal</>
                          )}
                        </span>
                      </div>
                      {/* Passerelle active */}
                      {(selectedProvider.stripeOnboardingComplete || selectedProvider.paypalOnboardingComplete) && (
                        <div className="text-xs text-gray-500 mt-1">
                          Passerelle active: <strong>{selectedProvider.paymentGateway || 'Stripe'}</strong>
                        </div>
                      )}
                      {/* Alerte si aucun paiement configuré */}
                      {!selectedProvider.stripeOnboardingComplete && !selectedProvider.paypalOnboardingComplete && selectedProvider.isApproved && (
                        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                          <AlertTriangle size={12} className="inline mr-1" />
                          Prestataire approuvé mais aucun paiement configuré
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Langues et spécialisations */}
              {(selectedProvider.languages?.length || selectedProvider.specializations?.length) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {selectedProvider.languages?.length && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Langues</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedProvider.languages.map((lang) => (
                          <span key={lang} className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                            {lang}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedProvider.specializations?.length && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Spécialisations</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedProvider.specializations.map((spec) => (
                          <span key={spec} className="px-2 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Fermer
                </button>
                <div className="flex space-x-3">
                  {/* Approve/Reject buttons */}
                  {!selectedProvider.isApproved && (
                    <button
                      onClick={() => {
                        handleApproveProvider(selectedProvider.id);
                        setShowDetailModal(false);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
                    >
                      <Check size={16} className="mr-2" />
                      Approuver
                    </button>
                  )}
                  {!selectedProvider.isApproved && (
                    <button
                      onClick={() => {
                        handleRejectProvider(selectedProvider.id);
                        setShowDetailModal(false);
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
                    >
                      <X size={16} className="mr-2" />
                      Rejeter
                    </button>
                  )}
                  {selectedProvider.isApproved && (
                    <button
                      onClick={() => {
                        handleRejectProvider(selectedProvider.id);
                        setShowDetailModal(false);
                      }}
                      className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 flex items-center"
                    >
                      <X size={16} className="mr-2" />
                      Revoquer
                    </button>
                  )}
                  {selectedProvider.isOnline && (
                    <button
                      onClick={() => {
                        handleForceOffline(selectedProvider.id);
                        setShowDetailModal(false);
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
                    >
                      <WifiOff size={16} className="mr-2" />
                      Forcer hors ligne
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/admin/users?id=${selectedProvider.id}`)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                  >
                    <Settings size={16} className="mr-2" />
                    Voir profil complet
                  </button>
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* Modal statistiques et alertes */}
        <Modal
          isOpen={showStatsModal}
          onClose={() => setShowStatsModal(false)}
          title="Alertes et statistiques"
          size="large"
        >
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Alertes actives ({alerts.length})</h3>
              {alerts.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-lg border-l-4 ${
                        alert.severity === 'high'
                          ? 'bg-red-50 border-red-500'
                          : alert.severity === 'medium'
                          ? 'bg-yellow-50 border-yellow-500'
                          : 'bg-blue-50 border-blue-500'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-medium text-gray-900">{alert.providerName}</span>
                          <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Type: {alert.type.replace('_', ' ')} | Sévérité: {alert.severity}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            const provider = providers.find((p) => p.id === alert.providerId);
                            if (provider) {
                              setShowStatsModal(false);
                              handleViewDetails(provider);
                            }
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="mx-auto h-12 w-12 text-green-400 mb-4" />
                  <p>Aucune alerte active</p>
                </div>
              )}
            </div>

            {stats && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Résumé des statistiques</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-green-600">{stats.onlineNow}</div>
                    <div className="text-sm text-gray-600">En ligne</div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-orange-600">{stats.busyNow}</div>
                    <div className="text-sm text-gray-600">En appel</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-gray-600">{stats.offlineNow}</div>
                    <div className="text-sm text-gray-600">Hors ligne</div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-blue-600">{stats.lawyersCount}</div>
                    <div className="text-sm text-gray-600">Avocats</div>
                  </div>
                  <div className="bg-teal-50 p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-teal-600">{stats.expatsCount}</div>
                    <div className="text-sm text-gray-600">Expatriés</div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-yellow-600">{stats.pendingApproval}</div>
                    <div className="text-sm text-gray-600">En attente</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      </ErrorBoundary>
    </AdminLayout>
  );
};

export default AdminProviders;
