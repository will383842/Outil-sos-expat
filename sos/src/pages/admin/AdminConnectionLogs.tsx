// src/pages/admin/AdminConnectionLogs.tsx
// Admin page for viewing connection logs with advanced filtering and statistics

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { useAuth } from '../../contexts/AuthContext';
import {
  Search,
  Filter,
  RefreshCw,
  Download,
  Eye,
  Calendar,
  User,
  Globe,
  Monitor,
  Smartphone,
  Shield,
  Activity,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  LogIn,
  LogOut,
  Key,
  Server,
  CreditCard,
  Phone,
  Cloud,
  ChevronDown,
  ChevronUp,
  MapPin,
  Code,
  X,
  Play,
  Pause,
} from 'lucide-react';

/* ============================================================
   TYPES
   ============================================================ */

interface ConnectionLog {
  id: string;
  timestamp: Date;
  userId?: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  service: 'firebase_auth' | 'admin_console' | 'twilio' | 'stripe' | 'google_cloud' | 'api';
  eventType: 'login' | 'logout' | 'token_refresh' | 'api_access' | 'admin_action';
  action: string;
  ipAddress?: string;
  country?: string;
  countryCode?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  userAgent?: string;
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  device?: string;
  isMobile?: boolean;
  isSuccess: boolean;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  sessionId?: string;
  requestId?: string;
}

interface ConnectionStats {
  loginsToday: number;
  uniqueUsersToday: number;
  failedLoginsToday: number;
  loginsLastHour: number;
  activeSessionsCount: number;
  topCountries: { country: string; count: number }[];
  topServices: { service: string; count: number }[];
}

interface Filters {
  dateFrom: string;
  dateTo: string;
  userSearch: string;
  service: string;
  eventType: string;
  action: string;
  isSuccess: string;
}

type Lang = 'fr' | 'en';

/* ============================================================
   i18n
   ============================================================ */

const detectLang = (): Lang =>
  typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('fr') ? 'fr' : 'en';

const STRINGS: Record<Lang, Record<string, string>> = {
  fr: {
    title: 'Logs de connexion',
    subtitle: 'Historique des connexions et actions utilisateurs',
    loginsToday: 'Connexions aujourd\'hui',
    uniqueUsers: 'Utilisateurs uniques',
    failedLogins: 'Echecs de connexion',
    lastHour: 'Derniere heure',
    activeSessions: 'Sessions actives',
    filters: 'Filtres',
    advancedFilters: 'Filtres avances',
    search: 'Rechercher par email ou nom...',
    dateFrom: 'Date debut',
    dateTo: 'Date fin',
    service: 'Service',
    allServices: 'Tous les services',
    eventType: 'Type d\'evenement',
    allEventTypes: 'Tous les types',
    action: 'Action',
    allActions: 'Toutes les actions',
    status: 'Statut',
    allStatuses: 'Tous',
    success: 'Succes',
    failed: 'Echec',
    apply: 'Appliquer',
    reset: 'Reinitialiser',
    exportCSV: 'Exporter CSV',
    realtime: 'Temps reel',
    realtimeOn: 'Actualisation auto',
    realtimeOff: 'Actualisation manuelle',
    refresh: 'Actualiser',
    loading: 'Chargement...',
    loadMore: 'Charger plus',
    noResults: 'Aucun log trouve',
    timestamp: 'Date/Heure',
    user: 'Utilisateur',
    ipAddress: 'Adresse IP',
    device: 'Appareil',
    details: 'Details',
    viewDetails: 'Voir details',
    logDetails: 'Details du log',
    eventInfo: 'Informations evenement',
    userInfo: 'Informations utilisateur',
    locationInfo: 'Localisation',
    deviceInfo: 'Appareil',
    rawMetadata: 'Metadonnees brutes',
    close: 'Fermer',
    unknown: 'Inconnu',
    anonymous: 'Anonyme',
    admin: 'Admin',
    provider: 'Prestataire',
    client: 'Client',
    // Services
    firebase_auth: 'Firebase Auth',
    admin_console: 'Console Admin',
    twilio: 'Twilio',
    stripe: 'Stripe',
    google_cloud: 'Google Cloud',
    api: 'API',
    // Event types
    login: 'Connexion',
    logout: 'Deconnexion',
    token_refresh: 'Rafraichissement token',
    api_access: 'Acces API',
    admin_action: 'Action admin',
    // Actions
    login_success: 'Connexion reussie',
    login_failed: 'Connexion echouee',
    password_reset: 'Reinitialisation mot de passe',
    password_change: 'Changement mot de passe',
    email_verification: 'Verification email',
    mfa_enabled: 'MFA active',
    mfa_disabled: 'MFA desactive',
    account_locked: 'Compte verrouille',
    account_unlocked: 'Compte deverrouille',
    session_expired: 'Session expiree',
    token_refreshed: 'Token rafraichi',
    api_call: 'Appel API',
    webhook_received: 'Webhook recu',
    payment_processed: 'Paiement traite',
    call_initiated: 'Appel initie',
    call_ended: 'Appel termine',
    user_created: 'Utilisateur cree',
    user_updated: 'Utilisateur modifie',
    user_deleted: 'Utilisateur supprime',
    role_changed: 'Role modifie',
    permission_granted: 'Permission accordee',
    permission_revoked: 'Permission revoquee',
    exportStarted: 'Export demarre...',
    exportComplete: 'Export termine',
    exportError: 'Erreur lors de l\'export',
    errorLoading: 'Erreur lors du chargement',
    retry: 'Reessayer',
  },
  en: {
    title: 'Connection Logs',
    subtitle: 'User connections and actions history',
    loginsToday: 'Logins today',
    uniqueUsers: 'Unique users',
    failedLogins: 'Failed logins',
    lastHour: 'Last hour',
    activeSessions: 'Active sessions',
    filters: 'Filters',
    advancedFilters: 'Advanced filters',
    search: 'Search by email or name...',
    dateFrom: 'Start date',
    dateTo: 'End date',
    service: 'Service',
    allServices: 'All services',
    eventType: 'Event type',
    allEventTypes: 'All types',
    action: 'Action',
    allActions: 'All actions',
    status: 'Status',
    allStatuses: 'All',
    success: 'Success',
    failed: 'Failed',
    apply: 'Apply',
    reset: 'Reset',
    exportCSV: 'Export CSV',
    realtime: 'Real-time',
    realtimeOn: 'Auto refresh',
    realtimeOff: 'Manual refresh',
    refresh: 'Refresh',
    loading: 'Loading...',
    loadMore: 'Load more',
    noResults: 'No logs found',
    timestamp: 'Date/Time',
    user: 'User',
    ipAddress: 'IP Address',
    device: 'Device',
    details: 'Details',
    viewDetails: 'View details',
    logDetails: 'Log Details',
    eventInfo: 'Event Information',
    userInfo: 'User Information',
    locationInfo: 'Location',
    deviceInfo: 'Device',
    rawMetadata: 'Raw Metadata',
    close: 'Close',
    unknown: 'Unknown',
    anonymous: 'Anonymous',
    admin: 'Admin',
    provider: 'Provider',
    client: 'Client',
    // Services
    firebase_auth: 'Firebase Auth',
    admin_console: 'Admin Console',
    twilio: 'Twilio',
    stripe: 'Stripe',
    google_cloud: 'Google Cloud',
    api: 'API',
    // Event types
    login: 'Login',
    logout: 'Logout',
    token_refresh: 'Token Refresh',
    api_access: 'API Access',
    admin_action: 'Admin Action',
    // Actions
    login_success: 'Login successful',
    login_failed: 'Login failed',
    password_reset: 'Password reset',
    password_change: 'Password change',
    email_verification: 'Email verification',
    mfa_enabled: 'MFA enabled',
    mfa_disabled: 'MFA disabled',
    account_locked: 'Account locked',
    account_unlocked: 'Account unlocked',
    session_expired: 'Session expired',
    token_refreshed: 'Token refreshed',
    api_call: 'API call',
    webhook_received: 'Webhook received',
    payment_processed: 'Payment processed',
    call_initiated: 'Call initiated',
    call_ended: 'Call ended',
    user_created: 'User created',
    user_updated: 'User updated',
    user_deleted: 'User deleted',
    role_changed: 'Role changed',
    permission_granted: 'Permission granted',
    permission_revoked: 'Permission revoked',
    exportStarted: 'Export started...',
    exportComplete: 'Export complete',
    exportError: 'Error during export',
    errorLoading: 'Error loading data',
    retry: 'Retry',
  },
};

const tFor = (lang: Lang) => (key: string) => STRINGS[lang][key] ?? key;

/* ============================================================
   SERVICE ICONS & COLORS
   ============================================================ */

const SERVICE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  firebase_auth: { icon: Shield, color: 'text-orange-600', bg: 'bg-orange-100' },
  admin_console: { icon: Monitor, color: 'text-purple-600', bg: 'bg-purple-100' },
  twilio: { icon: Phone, color: 'text-red-600', bg: 'bg-red-100' },
  stripe: { icon: CreditCard, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  google_cloud: { icon: Cloud, color: 'text-blue-600', bg: 'bg-blue-100' },
  api: { icon: Server, color: 'text-gray-600', bg: 'bg-gray-100' },
};

const ACTION_COLORS: Record<string, string> = {
  login_success: 'text-green-600 bg-green-50',
  login_failed: 'text-red-600 bg-red-50',
  password_reset: 'text-yellow-600 bg-yellow-50',
  account_locked: 'text-red-600 bg-red-50',
  account_unlocked: 'text-green-600 bg-green-50',
  session_expired: 'text-orange-600 bg-orange-50',
  token_refreshed: 'text-blue-600 bg-blue-50',
  payment_processed: 'text-green-600 bg-green-50',
  call_initiated: 'text-blue-600 bg-blue-50',
  call_ended: 'text-gray-600 bg-gray-50',
  user_created: 'text-green-600 bg-green-50',
  user_deleted: 'text-red-600 bg-red-50',
  role_changed: 'text-purple-600 bg-purple-50',
};

const ROLE_BADGES: Record<string, { label: string; color: string }> = {
  admin: { label: 'Admin', color: 'bg-purple-100 text-purple-800' },
  provider: { label: 'Provider', color: 'bg-blue-100 text-blue-800' },
  lawyer: { label: 'Lawyer', color: 'bg-indigo-100 text-indigo-800' },
  expat: { label: 'Expat', color: 'bg-teal-100 text-teal-800' },
  client: { label: 'Client', color: 'bg-gray-100 text-gray-800' },
};

/* ============================================================
   COUNTRY FLAGS (simple emoji mapping)
   ============================================================ */

const getCountryFlag = (countryCode?: string): string => {
  if (!countryCode) return '';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

/* ============================================================
   HELPER COMPONENTS
   ============================================================ */

const StatCard: React.FC<{
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  trend?: { value: number; isUp: boolean };
}> = ({ title, value, icon: Icon, color, trend }) => (
  <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
      {trend && (
        <div className={`flex items-center ${trend.isUp ? 'text-red-500' : 'text-green-500'}`}>
          {trend.isUp ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          <span className="text-sm font-medium">{Math.abs(trend.value)}%</span>
        </div>
      )}
    </div>
  </div>
);

const ServiceBadge: React.FC<{ service: string; t: (key: string) => string }> = ({ service, t }) => {
  const config = SERVICE_CONFIG[service] || SERVICE_CONFIG.api;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
      <Icon className="h-3 w-3 mr-1" />
      {t(service)}
    </span>
  );
};

const RoleBadge: React.FC<{ role?: string }> = ({ role }) => {
  if (!role) return null;
  const config = ROLE_BADGES[role] || ROLE_BADGES.client;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
};

const ActionBadge: React.FC<{ action: string; isSuccess: boolean; t: (key: string) => string }> = ({
  action,
  isSuccess,
  t,
}) => {
  const colorClass = ACTION_COLORS[action] || (isSuccess ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50');
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {isSuccess ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
      {t(action) || action}
    </span>
  );
};

const DeviceIcon: React.FC<{ isMobile?: boolean; browser?: string; os?: string }> = ({ isMobile, browser, os }) => {
  const Icon = isMobile ? Smartphone : Monitor;
  const browserIcon = browser?.toLowerCase().includes('chrome')
    ? 'Chrome'
    : browser?.toLowerCase().includes('firefox')
    ? 'Firefox'
    : browser?.toLowerCase().includes('safari')
    ? 'Safari'
    : browser?.toLowerCase().includes('edge')
    ? 'Edge'
    : browser;

  return (
    <div className="flex items-center space-x-1 text-gray-500">
      <Icon className="h-4 w-4" />
      <span className="text-xs">{browserIcon}</span>
      {os && <span className="text-xs text-gray-400">/ {os}</span>}
    </div>
  );
};

/* ============================================================
   LOG DETAIL MODAL
   ============================================================ */

const LogDetailModal: React.FC<{
  log: ConnectionLog | null;
  isOpen: boolean;
  onClose: () => void;
  t: (key: string) => string;
}> = ({ log, isOpen, onClose, t }) => {
  if (!log) return null;

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(date));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('logDetails')} size="large" closeLabel={t('close')}>
      <div className="space-y-6">
        {/* Event Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <Activity className="h-4 w-4 mr-2" />
            {t('eventInfo')}
          </h3>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-xs text-gray-500">{t('timestamp')}</dt>
              <dd className="text-sm font-medium text-gray-900">{formatTimestamp(log.timestamp)}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">{t('service')}</dt>
              <dd className="mt-1">
                <ServiceBadge service={log.service} t={t} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">{t('eventType')}</dt>
              <dd className="text-sm font-medium text-gray-900">{t(log.eventType)}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">{t('action')}</dt>
              <dd className="mt-1">
                <ActionBadge action={log.action} isSuccess={log.isSuccess} t={t} />
              </dd>
            </div>
            {log.sessionId && (
              <div>
                <dt className="text-xs text-gray-500">Session ID</dt>
                <dd className="text-xs font-mono text-gray-600 truncate">{log.sessionId}</dd>
              </div>
            )}
            {log.requestId && (
              <div>
                <dt className="text-xs text-gray-500">Request ID</dt>
                <dd className="text-xs font-mono text-gray-600 truncate">{log.requestId}</dd>
              </div>
            )}
            {!log.isSuccess && log.errorMessage && (
              <div className="col-span-2">
                <dt className="text-xs text-gray-500">Error</dt>
                <dd className="text-sm text-red-600 bg-red-50 p-2 rounded mt-1">{log.errorMessage}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* User Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <User className="h-4 w-4 mr-2" />
            {t('userInfo')}
          </h3>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-xs text-gray-500">Email</dt>
              <dd className="text-sm font-medium text-gray-900">{log.userEmail || t('anonymous')}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">{t('user')}</dt>
              <dd className="text-sm text-gray-900">{log.userName || t('unknown')}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Role</dt>
              <dd className="mt-1">
                <RoleBadge role={log.userRole} />
              </dd>
            </div>
            {log.userId && (
              <div>
                <dt className="text-xs text-gray-500">User ID</dt>
                <dd className="text-xs font-mono text-gray-600 truncate">{log.userId}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Location Info */}
        {(log.ipAddress || log.country) && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <MapPin className="h-4 w-4 mr-2" />
              {t('locationInfo')}
            </h3>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-gray-500">{t('ipAddress')}</dt>
                <dd className="text-sm font-mono text-gray-900">{log.ipAddress || t('unknown')}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Country</dt>
                <dd className="text-sm text-gray-900">
                  {log.countryCode && <span className="mr-1">{getCountryFlag(log.countryCode)}</span>}
                  {log.country || t('unknown')}
                </dd>
              </div>
              {log.city && (
                <div>
                  <dt className="text-xs text-gray-500">City</dt>
                  <dd className="text-sm text-gray-900">{log.city}</dd>
                </div>
              )}
              {log.latitude && log.longitude && (
                <div>
                  <dt className="text-xs text-gray-500">Coordinates</dt>
                  <dd className="text-xs font-mono text-gray-600">
                    {log.latitude.toFixed(4)}, {log.longitude.toFixed(4)}
                  </dd>
                </div>
              )}
            </dl>
            {/* Map thumbnail placeholder */}
            {log.latitude && log.longitude && (
              <div className="mt-3">
                <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                  <Globe className="h-8 w-8 text-gray-400" />
                  <span className="ml-2 text-sm text-gray-500">
                    Map: {log.latitude.toFixed(2)}, {log.longitude.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Device Info */}
        {(log.userAgent || log.browser) && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <Monitor className="h-4 w-4 mr-2" />
              {t('deviceInfo')}
            </h3>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-gray-500">Browser</dt>
                <dd className="text-sm text-gray-900">
                  {log.browser}
                  {log.browserVersion && <span className="text-gray-500 ml-1">v{log.browserVersion}</span>}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">OS</dt>
                <dd className="text-sm text-gray-900">
                  {log.os}
                  {log.osVersion && <span className="text-gray-500 ml-1">{log.osVersion}</span>}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">{t('device')}</dt>
                <dd className="text-sm text-gray-900">
                  {log.isMobile ? (
                    <span className="flex items-center">
                      <Smartphone className="h-4 w-4 mr-1" /> Mobile
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <Monitor className="h-4 w-4 mr-1" /> Desktop
                    </span>
                  )}
                </dd>
              </div>
              {log.device && (
                <div>
                  <dt className="text-xs text-gray-500">Device Model</dt>
                  <dd className="text-sm text-gray-900">{log.device}</dd>
                </div>
              )}
            </dl>
            {log.userAgent && (
              <div className="mt-3">
                <dt className="text-xs text-gray-500 mb-1">User Agent</dt>
                <dd className="text-xs font-mono text-gray-600 bg-white p-2 rounded border break-all">
                  {log.userAgent}
                </dd>
              </div>
            )}
          </div>
        )}

        {/* Raw Metadata */}
        {log.metadata && Object.keys(log.metadata).length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <Code className="h-4 w-4 mr-2" />
              {t('rawMetadata')}
            </h3>
            <pre className="text-xs font-mono text-gray-600 bg-gray-900 text-green-400 p-3 rounded-lg overflow-x-auto max-h-48">
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </Modal>
  );
};

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

const AdminConnectionLogs: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  // Language
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('admin_lang') as Lang) || detectLang());
  const t = useMemo(() => tFor(lang), [lang]);

  // Data state
  const [logs, setLogs] = useState<ConnectionLog[]>([]);
  const [stats, setStats] = useState<ConnectionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDocId, setLastDocId] = useState<string | null>(null);

  // Filters state
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    userSearch: '',
    service: 'all',
    eventType: 'all',
    action: 'all',
    isSuccess: 'all',
  });
  const [appliedFilters, setAppliedFilters] = useState<Filters>(filters);

  // Modal state
  const [selectedLog, setSelectedLog] = useState<ConnectionLog | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Real-time toggle
  const [isRealtime, setIsRealtime] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/admin/login');
    }
  }, [currentUser, navigate]);

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const getConnectionStats = httpsCallable<unknown, ConnectionStats>(functions, 'getConnectionStats');
      const result = await getConnectionStats({});
      setStats(result.data);
    } catch (err) {
      console.error('Error loading stats:', err);
      // Set default stats on error
      setStats({
        loginsToday: 0,
        uniqueUsersToday: 0,
        failedLoginsToday: 0,
        loginsLastHour: 0,
        activeSessionsCount: 0,
        topCountries: [],
        topServices: [],
      });
    }
  }, []);

  // Load logs
  const loadLogs = useCallback(
    async (reset: boolean = false) => {
      try {
        if (reset) {
          setIsLoading(true);
          setLogs([]);
          setLastDocId(null);
          setHasMore(true);
        } else {
          setIsLoadingMore(true);
        }
        setError(null);

        const getConnectionLogs = httpsCallable<
          {
            filters: {
              dateFrom?: string;
              dateTo?: string;
              userSearch?: string;
              service?: string;
              eventType?: string;
              action?: string;
              isSuccess?: boolean;
            };
            limit: number;
            lastDocId?: string;
          },
          { logs: ConnectionLog[]; hasMore: boolean; lastDocId: string | null }
        >(functions, 'getConnectionLogs');

        const filterPayload: {
          dateFrom?: string;
          dateTo?: string;
          userSearch?: string;
          service?: string;
          eventType?: string;
          action?: string;
          isSuccess?: boolean;
        } = {
          dateFrom: appliedFilters.dateFrom,
          dateTo: appliedFilters.dateTo,
        };

        if (appliedFilters.userSearch) filterPayload.userSearch = appliedFilters.userSearch;
        if (appliedFilters.service !== 'all') filterPayload.service = appliedFilters.service;
        if (appliedFilters.eventType !== 'all') filterPayload.eventType = appliedFilters.eventType;
        if (appliedFilters.action !== 'all') filterPayload.action = appliedFilters.action;
        if (appliedFilters.isSuccess !== 'all') filterPayload.isSuccess = appliedFilters.isSuccess === 'success';

        const result = await getConnectionLogs({
          filters: filterPayload,
          limit: 50,
          lastDocId: reset ? undefined : lastDocId || undefined,
        });

        const newLogs = result.data.logs.map((log) => ({
          ...log,
          timestamp: new Date(log.timestamp),
        }));

        if (reset) {
          setLogs(newLogs);
        } else {
          setLogs((prev) => [...prev, ...newLogs]);
        }

        setHasMore(result.data.hasMore);
        setLastDocId(result.data.lastDocId);
      } catch (err) {
        console.error('Error loading logs:', err);
        setError(t('errorLoading'));
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [appliedFilters, lastDocId, t]
  );

  // Initial load
  useEffect(() => {
    loadStats();
    loadLogs(true);
  }, []);

  // Reload when filters are applied
  useEffect(() => {
    loadLogs(true);
  }, [appliedFilters]);

  // Real-time refresh
  useEffect(() => {
    if (!isRealtime) return;

    const interval = setInterval(() => {
      loadStats();
      loadLogs(true);
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [isRealtime, loadStats, loadLogs]);

  // Apply filters
  const handleApplyFilters = () => {
    setAppliedFilters(filters);
    setShowFilters(false);
  };

  // Reset filters
  const handleResetFilters = () => {
    const defaultFilters: Filters = {
      dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      dateTo: new Date().toISOString().split('T')[0],
      userSearch: '',
      service: 'all',
      eventType: 'all',
      action: 'all',
      isSuccess: 'all',
    };
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
  };

  // Export to CSV
  const handleExportCSV = () => {
    try {
      const headers = [
        'Timestamp',
        'User Email',
        'User Name',
        'Role',
        'Service',
        'Event Type',
        'Action',
        'Status',
        'IP Address',
        'Country',
        'City',
        'Browser',
        'OS',
        'Device',
      ];

      const rows = logs.map((log) => [
        new Date(log.timestamp).toISOString(),
        log.userEmail || '',
        log.userName || '',
        log.userRole || '',
        log.service,
        log.eventType,
        log.action,
        log.isSuccess ? 'Success' : 'Failed',
        log.ipAddress || '',
        log.country || '',
        log.city || '',
        log.browser || '',
        log.os || '',
        log.isMobile ? 'Mobile' : 'Desktop',
      ]);

      const csvContent = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `connection-logs-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  // View log details
  const handleViewDetails = (log: ConnectionLog) => {
    setSelectedLog(log);
    setShowDetailModal(true);
  };

  // Format timestamp
  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  // Actions list for filter
  const actionOptions = [
    'login_success',
    'login_failed',
    'password_reset',
    'password_change',
    'email_verification',
    'mfa_enabled',
    'mfa_disabled',
    'account_locked',
    'account_unlocked',
    'session_expired',
    'token_refreshed',
    'api_call',
    'webhook_received',
    'payment_processed',
    'call_initiated',
    'call_ended',
    'user_created',
    'user_updated',
    'user_deleted',
    'role_changed',
    'permission_granted',
    'permission_revoked',
  ];

  return (
    <AdminLayout>
      <ErrorBoundary>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
              <p className="text-sm text-gray-500 mt-1">{t('subtitle')}</p>
            </div>
            <div className="flex items-center space-x-3">
              {/* Real-time toggle */}
              <button
                onClick={() => setIsRealtime(!isRealtime)}
                className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isRealtime ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {isRealtime ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                {isRealtime ? t('realtimeOn') : t('realtimeOff')}
              </button>

              {/* Refresh button */}
              <Button
                variant="outline"
                size="small"
                onClick={() => {
                  loadStats();
                  loadLogs(true);
                }}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {t('refresh')}
              </Button>

              {/* Export button */}
              <Button variant="outline" size="small" onClick={handleExportCSV} disabled={logs.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                {t('exportCSV')}
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title={t('loginsToday')}
              value={stats?.loginsToday ?? '-'}
              icon={LogIn}
              color="bg-green-500"
            />
            <StatCard
              title={t('uniqueUsers')}
              value={stats?.uniqueUsersToday ?? '-'}
              icon={User}
              color="bg-blue-500"
            />
            <StatCard
              title={t('failedLogins')}
              value={stats?.failedLoginsToday ?? '-'}
              icon={AlertCircle}
              color="bg-red-500"
              trend={
                stats?.failedLoginsToday && stats.failedLoginsToday > 10 ? { value: 15, isUp: true } : undefined
              }
            />
            <StatCard
              title={t('lastHour')}
              value={stats?.loginsLastHour ?? '-'}
              icon={Clock}
              color="bg-purple-500"
            />
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow border border-gray-100 p-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('search')}
                  value={filters.userSearch}
                  onChange={(e) => setFilters({ ...filters, userSearch: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              {/* Quick filters */}
              <div className="flex items-center space-x-2">
                <select
                  value={filters.service}
                  onChange={(e) => {
                    setFilters({ ...filters, service: e.target.value });
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="all">{t('allServices')}</option>
                  <option value="firebase_auth">{t('firebase_auth')}</option>
                  <option value="admin_console">{t('admin_console')}</option>
                  <option value="twilio">{t('twilio')}</option>
                  <option value="stripe">{t('stripe')}</option>
                  <option value="google_cloud">{t('google_cloud')}</option>
                  <option value="api">{t('api')}</option>
                </select>

                <select
                  value={filters.isSuccess}
                  onChange={(e) => {
                    setFilters({ ...filters, isSuccess: e.target.value });
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="all">{t('allStatuses')}</option>
                  <option value="success">{t('success')}</option>
                  <option value="failed">{t('failed')}</option>
                </select>

                <Button variant="outline" size="small" onClick={() => setShowFilters(!showFilters)}>
                  <Filter className="h-4 w-4 mr-2" />
                  {t('advancedFilters')}
                  {showFilters ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                </Button>

                <Button variant="primary" size="small" onClick={handleApplyFilters}>
                  {t('apply')}
                </Button>
              </div>
            </div>

            {/* Advanced filters panel */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('dateFrom')}</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('dateTo')}</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('eventType')}</label>
                  <select
                    value={filters.eventType}
                    onChange={(e) => setFilters({ ...filters, eventType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  >
                    <option value="all">{t('allEventTypes')}</option>
                    <option value="login">{t('login')}</option>
                    <option value="logout">{t('logout')}</option>
                    <option value="token_refresh">{t('token_refresh')}</option>
                    <option value="api_access">{t('api_access')}</option>
                    <option value="admin_action">{t('admin_action')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('action')}</label>
                  <select
                    value={filters.action}
                    onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  >
                    <option value="all">{t('allActions')}</option>
                    {actionOptions.map((action) => (
                      <option key={action} value={action}>
                        {t(action)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <Button variant="ghost" size="small" onClick={handleResetFilters} className="w-full">
                    <X className="h-4 w-4 mr-1" />
                    {t('reset')}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Error state */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <span className="text-red-700">{error}</span>
              </div>
              <Button variant="outline" size="small" onClick={() => loadLogs(true)}>
                {t('retry')}
              </Button>
            </div>
          )}

          {/* Logs Table */}
          <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('timestamp')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('user')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('service')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('action')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('ipAddress')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('device')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('details')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mx-auto" />
                        <p className="text-gray-500 mt-2">{t('loading')}</p>
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <Activity className="h-12 w-12 text-gray-300 mx-auto" />
                        <p className="text-gray-500 mt-2">{t('noResults')}</p>
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-900">
                            <Clock className="h-4 w-4 text-gray-400 mr-2" />
                            {formatTimestamp(log.timestamp)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900">
                              {log.userEmail || t('anonymous')}
                            </span>
                            <div className="flex items-center mt-1 space-x-1">
                              {log.userName && (
                                <span className="text-xs text-gray-500">{log.userName}</span>
                              )}
                              <RoleBadge role={log.userRole} />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <ServiceBadge service={log.service} t={t} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <ActionBadge action={log.action} isSuccess={log.isSuccess} t={t} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-600">
                            {log.countryCode && (
                              <span className="mr-2 text-lg">{getCountryFlag(log.countryCode)}</span>
                            )}
                            <span className="font-mono text-xs">{log.ipAddress || '-'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <DeviceIcon isMobile={log.isMobile} browser={log.browser} os={log.os} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => handleViewDetails(log)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title={t('viewDetails')}
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Load more */}
            {hasMore && !isLoading && logs.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => loadLogs(false)}
                  disabled={isLoadingMore}
                  fullWidth
                >
                  {isLoadingMore ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      {t('loading')}
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-2" />
                      {t('loadMore')}
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Detail Modal */}
        <LogDetailModal
          log={selectedLog}
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedLog(null);
          }}
          t={t}
        />
      </ErrorBoundary>
    </AdminLayout>
  );
};

export default AdminConnectionLogs;
