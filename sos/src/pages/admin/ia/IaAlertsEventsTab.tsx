/**
 * IaAlertsEventsTab - Onglet Alertes & Événements
 * Suivi temps réel des événements d'abonnement avec alertes configurables
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../../../contexts/AppContext';
import { useAuth } from '../../../contexts/AuthContext';
import { getDateLocale } from '../../../utils/formatters';
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Filter,
  RefreshCw,
  Settings,
  Check,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Search,
  Calendar,
  TrendingDown,
  TrendingUp,
  CreditCard,
  UserX,
  Clock,
  Zap,
  Mail,
  MessageSquare,
  Webhook,
  Save,
  X
} from 'lucide-react';
import { db } from '../../../config/firebase';
import {
  collection,
  query,
  orderBy,
  limit,
  doc,
  updateDoc,
  where,
  Timestamp,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { cn } from '../../../utils/cn';
import {
  SubscriptionEvent,
  SubscriptionEventType,
  AlertSeverity,
  AlertConfig
} from './types';

// ============================================================================
// CONSTANTS
// ============================================================================

const EVENT_TYPE_CONFIG: Record<SubscriptionEventType, {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  defaultSeverity: AlertSeverity;
  category: 'subscription' | 'trial' | 'payment' | 'quota' | 'alert';
}> = {
  'subscription.created': { icon: CheckCircle, label: 'Abonnement créé', defaultSeverity: 'success', category: 'subscription' },
  'subscription.activated': { icon: CheckCircle, label: 'Abonnement activé', defaultSeverity: 'success', category: 'subscription' },
  'subscription.upgraded': { icon: TrendingUp, label: 'Upgrade', defaultSeverity: 'success', category: 'subscription' },
  'subscription.downgraded': { icon: TrendingDown, label: 'Downgrade', defaultSeverity: 'warning', category: 'subscription' },
  'subscription.canceled': { icon: XCircle, label: 'Annulation', defaultSeverity: 'error', category: 'subscription' },
  'subscription.expired': { icon: Clock, label: 'Expiré', defaultSeverity: 'error', category: 'subscription' },
  'subscription.reactivated': { icon: RefreshCw, label: 'Réactivé', defaultSeverity: 'success', category: 'subscription' },
  'subscription.paused': { icon: Clock, label: 'Mis en pause', defaultSeverity: 'warning', category: 'subscription' },
  'subscription.resumed': { icon: Zap, label: 'Repris', defaultSeverity: 'success', category: 'subscription' },
  'trial.started': { icon: Clock, label: 'Essai démarré', defaultSeverity: 'info', category: 'trial' },
  'trial.ending_soon': { icon: AlertTriangle, label: 'Essai finit bientôt', defaultSeverity: 'warning', category: 'trial' },
  'trial.converted': { icon: CheckCircle, label: 'Essai converti', defaultSeverity: 'success', category: 'trial' },
  'trial.expired': { icon: XCircle, label: 'Essai expiré', defaultSeverity: 'error', category: 'trial' },
  'payment.succeeded': { icon: CreditCard, label: 'Paiement réussi', defaultSeverity: 'success', category: 'payment' },
  'payment.failed': { icon: XCircle, label: 'Paiement échoué', defaultSeverity: 'error', category: 'payment' },
  'payment.action_required': { icon: AlertTriangle, label: '3D Secure requis', defaultSeverity: 'warning', category: 'payment' },
  'payment.refunded': { icon: RefreshCw, label: 'Remboursé', defaultSeverity: 'info', category: 'payment' },
  'quota.warning_80': { icon: AlertTriangle, label: 'Quota 80%', defaultSeverity: 'warning', category: 'quota' },
  'quota.exceeded': { icon: XCircle, label: 'Quota dépassé', defaultSeverity: 'error', category: 'quota' },
  'quota.reset': { icon: RefreshCw, label: 'Quota réinitialisé', defaultSeverity: 'info', category: 'quota' },
  'churn.risk_detected': { icon: UserX, label: 'Risque de churn', defaultSeverity: 'error', category: 'alert' },
  'mrr.significant_change': { icon: TrendingDown, label: 'Changement MRR', defaultSeverity: 'warning', category: 'alert' },
};

const SEVERITY_COLORS: Record<AlertSeverity, { bg: string; text: string; border: string; icon: string }> = {
  info: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: 'text-blue-500' },
  warning: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: 'text-amber-500' },
  error: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: 'text-red-500' },
  success: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: 'text-green-500' },
};

const CATEGORIES = [
  { id: 'all', label: 'Tous' },
  { id: 'subscription', label: 'Abonnements' },
  { id: 'trial', label: 'Essais' },
  { id: 'payment', label: 'Paiements' },
  { id: 'quota', label: 'Quotas' },
  { id: 'alert', label: 'Alertes' },
];

// ============================================================================
// COMPONENTS
// ============================================================================

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  trend?: { value: number; label: string };
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, trend }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {trend && (
          <p className={cn(
            'text-xs mt-1 flex items-center gap-1',
            trend.value >= 0 ? 'text-green-600' : 'text-red-600'
          )}>
            {trend.value >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
          </p>
        )}
      </div>
      <div className={cn('p-3 rounded-lg', color)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
  </div>
);

interface EventItemProps {
  event: SubscriptionEvent;
  onAcknowledge: (id: string) => void;
  onMarkRead: (id: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  language: string;
}

const EventItem: React.FC<EventItemProps> = ({
  event,
  onAcknowledge,
  onMarkRead,
  isExpanded,
  onToggleExpand,
  language
}) => {
  const config = EVENT_TYPE_CONFIG[event.eventType];
  const colors = SEVERITY_COLORS[event.severity];
  const Icon = config?.icon || Info;

  return (
    <div
      className={cn(
        'border rounded-lg transition-all',
        colors.border,
        colors.bg,
        !event.isRead && 'ring-2 ring-offset-1',
        event.severity === 'error' && !event.isRead && 'ring-red-400',
        event.severity === 'warning' && !event.isRead && 'ring-amber-400'
      )}
    >
      <div
        className="p-4 cursor-pointer"
        onClick={onToggleExpand}
      >
        <div className="flex items-start gap-3">
          <div className={cn('p-2 rounded-lg', colors.bg)}>
            <Icon className={cn('w-5 h-5', colors.icon)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('text-sm font-medium', colors.text)}>
                {event.title}
              </span>
              <span className={cn(
                'px-2 py-0.5 rounded-full text-xs font-medium',
                colors.bg,
                colors.text
              )}>
                {config?.label || event.eventType}
              </span>
              {!event.isRead && (
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                  Nouveau
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {event.description}
            </p>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span>{event.providerName}</span>
              <span>{event.providerEmail}</span>
              <span>
                {new Date(event.createdAt).toLocaleString(getDateLocale(language), {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!event.isRead && (
              <button
                onClick={(e) => { e.stopPropagation(); onMarkRead(event.id); }}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                title="Marquer comme lu"
              >
                <Eye className="w-4 h-4 text-gray-400" />
              </button>
            )}
            {!event.isAcknowledged && event.severity !== 'info' && event.severity !== 'success' && (
              <button
                onClick={(e) => { e.stopPropagation(); onAcknowledge(event.id); }}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                title="Acquitter"
              >
                <Check className="w-4 h-4 text-gray-400" />
              </button>
            )}
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {isExpanded && event.metadata && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-200 bg-white/50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
            {event.metadata.previousTier && (
              <div>
                <p className="text-xs text-gray-500">Plan précédent</p>
                <p className="text-sm font-medium">{event.metadata.previousTier}</p>
              </div>
            )}
            {event.metadata.newTier && (
              <div>
                <p className="text-xs text-gray-500">Nouveau plan</p>
                <p className="text-sm font-medium">{event.metadata.newTier}</p>
              </div>
            )}
            {event.metadata.amount !== undefined && (
              <div>
                <p className="text-xs text-gray-500">Montant</p>
                <p className="text-sm font-medium">
                  {event.metadata.amount.toFixed(2)} {event.metadata.currency || 'EUR'}
                </p>
              </div>
            )}
            {event.metadata.mrrImpact !== undefined && (
              <div>
                <p className="text-xs text-gray-500">Impact MRR</p>
                <p className={cn(
                  'text-sm font-medium',
                  event.metadata.mrrImpact >= 0 ? 'text-green-600' : 'text-red-600'
                )}>
                  {event.metadata.mrrImpact >= 0 ? '+' : ''}{event.metadata.mrrImpact.toFixed(2)} EUR
                </p>
              </div>
            )}
            {event.metadata.reason && (
              <div className="col-span-2">
                <p className="text-xs text-gray-500">Raison</p>
                <p className="text-sm font-medium">{event.metadata.reason}</p>
              </div>
            )}
            {event.metadata.churnRiskScore !== undefined && (
              <div>
                <p className="text-xs text-gray-500">Score de risque</p>
                <p className={cn(
                  'text-sm font-medium',
                  event.metadata.churnRiskScore >= 70 ? 'text-red-600' :
                    event.metadata.churnRiskScore >= 40 ? 'text-amber-600' : 'text-green-600'
                )}>
                  {event.metadata.churnRiskScore}%
                </p>
              </div>
            )}
          </div>
          {event.isAcknowledged && (
            <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
              Acquitté par {event.acknowledgedBy} le{' '}
              {event.acknowledgedAt && new Date(event.acknowledgedAt).toLocaleString(getDateLocale(language))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const IaAlertsEventsTab: React.FC = () => {
  const { language } = useApp();
  const { user: currentUser } = useAuth();
  // State
  const [events, setEvents] = useState<SubscriptionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<AlertSeverity | 'all'>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [dateRange, setDateRange] = useState<'24h' | '7d' | '30d' | 'all'>('7d');

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recentEvents = events.filter(e => new Date(e.createdAt) >= last24h);
    const weekEvents = events.filter(e => new Date(e.createdAt) >= last7d);

    return {
      total: events.length,
      unread: events.filter(e => !e.isRead).length,
      errors: events.filter(e => e.severity === 'error' && !e.isAcknowledged).length,
      warnings: events.filter(e => e.severity === 'warning' && !e.isAcknowledged).length,
      last24h: recentEvents.length,
      last7d: weekEvents.length,
      paymentFailures: events.filter(e => e.eventType === 'payment.failed' && !e.isAcknowledged).length,
      churnRisks: events.filter(e => e.eventType === 'churn.risk_detected' && !e.isAcknowledged).length,
    };
  }, [events]);

  // Load events from Firestore with polling (30s) instead of real-time for cost savings
  useEffect(() => {
    let isMounted = true;

    const loadEvents = async () => {
      if (!isMounted) return;
      setLoading(true);

      try {
        // Calculate date filter
        let dateFilter: Date | null = null;
        const now = new Date();
        switch (dateRange) {
          case '24h':
            dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case '7d':
            dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30d':
            dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            dateFilter = null;
        }

        let q = query(
          collection(db, 'subscription_events'),
          orderBy('createdAt', 'desc'),
          limit(500)
        );

        if (dateFilter) {
          q = query(
            collection(db, 'subscription_events'),
            where('createdAt', '>=', Timestamp.fromDate(dateFilter)),
            orderBy('createdAt', 'desc'),
            limit(500)
          );
        }

        const snapshot = await getDocs(q);
        if (!isMounted) return;

        const loadedEvents: SubscriptionEvent[] = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            eventType: data.eventType,
            severity: data.severity || EVENT_TYPE_CONFIG[data.eventType as SubscriptionEventType]?.defaultSeverity || 'info',
            providerId: data.providerId,
            providerName: data.providerName || 'N/A',
            providerEmail: data.providerEmail || 'N/A',
            providerType: data.providerType || 'expat_aidant',
            title: data.title || getEventTitle(data.eventType),
            description: data.description || '',
            metadata: data.metadata,
            isRead: data.isRead || false,
            isAcknowledged: data.isAcknowledged || false,
            acknowledgedBy: data.acknowledgedBy,
            acknowledgedAt: data.acknowledgedAt?.toDate(),
            createdAt: data.createdAt?.toDate() || new Date(),
          };
        });

        setEvents(loadedEvents);
      } catch (error) {
        console.error('Error loading events:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Chargement initial uniquement (bouton manuel pour actualiser)
    // ÉCONOMIE: Suppression du setInterval automatique (30s)
    // Avant: 2,880 requêtes/jour - Après: ~50 requêtes/jour (manuel)
    loadEvents();

    return () => {
      isMounted = false;
    };
  }, [dateRange]);

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // Category filter
      if (selectedCategory !== 'all') {
        const config = EVENT_TYPE_CONFIG[event.eventType];
        if (config?.category !== selectedCategory) return false;
      }

      // Severity filter
      if (selectedSeverity !== 'all' && event.severity !== selectedSeverity) {
        return false;
      }

      // Unread filter
      if (showUnreadOnly && event.isRead) {
        return false;
      }

      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          event.providerName.toLowerCase().includes(search) ||
          event.providerEmail.toLowerCase().includes(search) ||
          event.title.toLowerCase().includes(search) ||
          event.description.toLowerCase().includes(search)
        );
      }

      return true;
    });
  }, [events, selectedCategory, selectedSeverity, showUnreadOnly, searchTerm]);

  // Handlers
  const handleAcknowledge = useCallback(async (eventId: string) => {
    try {
      await updateDoc(doc(db, 'subscription_events', eventId), {
        isAcknowledged: true,
        acknowledgedBy: currentUser?.displayName || currentUser?.email || 'Admin',
        acknowledgedAt: Timestamp.now(),
        isRead: true,
      });
    } catch (error) {
      console.error('Error acknowledging event:', error);
    }
  }, []);

  const handleMarkRead = useCallback(async (eventId: string) => {
    try {
      await updateDoc(doc(db, 'subscription_events', eventId), {
        isRead: true,
      });
    } catch (error) {
      console.error('Error marking event as read:', error);
    }
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    try {
      const batch = writeBatch(db);
      const unreadEvents = events.filter(e => !e.isRead);

      unreadEvents.forEach(event => {
        batch.update(doc(db, 'subscription_events', event.id), { isRead: true });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, [events]);

  const handleRefresh = useCallback(() => {
    setLoading(true);
    // Re-trigger useEffect by changing dateRange
    setDateRange(prev => prev);
    setTimeout(() => setLoading(false), 500);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Non lus"
          value={stats.unread}
          icon={Bell}
          color="bg-indigo-500"
        />
        <StatCard
          title="Erreurs critiques"
          value={stats.errors}
          icon={XCircle}
          color="bg-red-500"
        />
        <StatCard
          title="Avertissements"
          value={stats.warnings}
          icon={AlertTriangle}
          color="bg-amber-500"
        />
        <StatCard
          title="Risques de churn"
          value={stats.churnRisks}
          icon={UserX}
          color="bg-purple-500"
        />
      </div>

      {/* Quick Stats Row */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.last24h}</p>
            <p className="text-xs text-gray-500">Dernières 24h</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.last7d}</p>
            <p className="text-xs text-gray-500">7 derniers jours</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">{stats.paymentFailures}</p>
            <p className="text-xs text-gray-500">Paiements échoués</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-600">{stats.churnRisks}</p>
            <p className="text-xs text-gray-500">Risques churn</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500">Total événements</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Category Filter */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  selectedCategory === cat.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Severity Filter */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value as AlertSeverity | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Toutes sévérités</option>
            <option value="error">Erreurs</option>
            <option value="warning">Avertissements</option>
            <option value="success">Succès</option>
            <option value="info">Info</option>
          </select>

          {/* Date Range */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as '24h' | '7d' | '30d' | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="24h">24 heures</option>
            <option value="7d">7 jours</option>
            <option value="30d">30 jours</option>
            <option value="all">Tout</option>
          </select>

          {/* Unread Toggle */}
          <button
            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              showUnreadOnly
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {showUnreadOnly ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            Non lus
          </button>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleMarkAllRead}
              disabled={stats.unread === 0}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              Tout marquer lu
            </button>
            <button
              onClick={handleRefresh}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className={cn('w-4 h-4 text-gray-600', loading && 'animate-spin')} />
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucun événement trouvé</p>
            <p className="text-sm text-gray-400 mt-1">
              {showUnreadOnly ? 'Tous les événements ont été lus' : 'Modifiez vos filtres'}
            </p>
          </div>
        ) : (
          filteredEvents.map(event => (
            <EventItem
              key={event.id}
              event={event}
              onAcknowledge={handleAcknowledge}
              onMarkRead={handleMarkRead}
              isExpanded={expandedEventId === event.id}
              onToggleExpand={() => setExpandedEventId(
                expandedEventId === event.id ? null : event.id
              )}
              language={language}
            />
          ))
        )}
      </div>

      {/* Pagination info */}
      {!loading && filteredEvents.length > 0 && (
        <div className="text-center text-sm text-gray-500">
          Affichage de {filteredEvents.length} événements
          {filteredEvents.length !== events.length && ` sur ${events.length}`}
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <AlertSettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
};

// ============================================================================
// SETTINGS MODAL
// ============================================================================

interface AlertSettingsModalProps {
  onClose: () => void;
}

const AlertSettingsModal: React.FC<AlertSettingsModalProps> = ({ onClose }) => {
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [slackEnabled, setSlackEnabled] = useState(false);
  const [slackWebhook, setSlackWebhook] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'settings', 'admin_alerts'), {
        emailEnabled,
        slackEnabled,
        slackWebhook,
        updatedAt: Timestamp.now(),
      });
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Configuration des alertes</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Email Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Notifications email</p>
                <p className="text-sm text-gray-500">Recevoir les alertes par email</p>
              </div>
            </div>
            <button
              onClick={() => setEmailEnabled(!emailEnabled)}
              className={cn(
                'w-12 h-6 rounded-full transition-colors',
                emailEnabled ? 'bg-indigo-600' : 'bg-gray-300'
              )}
            >
              <div className={cn(
                'w-5 h-5 bg-white rounded-full shadow transition-transform',
                emailEnabled ? 'translate-x-6' : 'translate-x-0.5'
              )} />
            </button>
          </div>

          {/* Slack Notifications */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium">Notifications Slack</p>
                  <p className="text-sm text-gray-500">Recevoir les alertes sur Slack</p>
                </div>
              </div>
              <button
                onClick={() => setSlackEnabled(!slackEnabled)}
                className={cn(
                  'w-12 h-6 rounded-full transition-colors',
                  slackEnabled ? 'bg-indigo-600' : 'bg-gray-300'
                )}
              >
                <div className={cn(
                  'w-5 h-5 bg-white rounded-full shadow transition-transform',
                  slackEnabled ? 'translate-x-6' : 'translate-x-0.5'
                )} />
              </button>
            </div>

            {slackEnabled && (
              <input
                type="url"
                placeholder="URL du webhook Slack"
                value={slackWebhook}
                onChange={(e) => setSlackWebhook(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            )}
          </div>

          {/* Alert Types */}
          <div>
            <p className="font-medium mb-3">Types d'alertes à recevoir</p>
            <div className="space-y-2">
              {[
                { id: 'payment.failed', label: 'Paiements échoués', enabled: true },
                { id: 'churn.risk_detected', label: 'Risques de churn', enabled: true },
                { id: 'subscription.canceled', label: 'Annulations', enabled: true },
                { id: 'trial.expired', label: 'Essais expirés', enabled: false },
                { id: 'mrr.significant_change', label: 'Changements MRR', enabled: true },
              ].map(alert => (
                <label key={alert.id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked={alert.enabled}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className="text-sm">{alert.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// HELPERS
// ============================================================================

function getEventTitle(eventType: string): string {
  const config = EVENT_TYPE_CONFIG[eventType as SubscriptionEventType];
  return config?.label || eventType;
}

export default IaAlertsEventsTab;
