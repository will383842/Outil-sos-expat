/**
 * MultiProviderDashboard - Page principale du dashboard multi-prestataires
 *
 * Dashboard dédié aux comptes multi-prestataires avec:
 * - Accès via mot de passe unique
 * - Affichage de tous les comptes multi-prestataires
 * - Booking requests en temps réel avec réponses IA auto-générées
 * - Statistiques globales
 * - Chat inline pour chaque prestataire
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  RefreshCw,
  Users,
  Bot,
  Clock,
  LogOut,
  Loader2,
  AlertCircle,
  Filter,
  LayoutGrid,
  List,
  ChevronDown,
  Bell,
  Scale,
} from 'lucide-react';
import { useMultiProviderDashboard } from '../../hooks/useMultiProviderDashboard';
import PasswordGate from './PasswordGate';
import ChatPanel from './ChatPanel';
import { cn } from '../../utils/cn';

// Chat state type
interface ChatState {
  isOpen: boolean;
  providerId: string;
  providerName: string;
  providerType?: 'lawyer' | 'expat';
  bookingRequestId?: string;
  initialMessage?: string;
}

// ============================================================================
// CONSTANTS: Time thresholds for booking classification
// ============================================================================
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
const FIVE_MINUTES = 5 * 60 * 1000;

const MultiProviderDashboard: React.FC = () => {
  const {
    accounts,
    stats,
    isLoading,
    isAuthenticated,
    error,
    authenticate,
    logout,
    refresh,
    openAiTool,
    migrateOldBookings,
    // Chat
    conversations,
    chatLoading,
    loadConversations,
    sendMessage,
    clearConversations,
  } = useMultiProviderDashboard();

  // Chat state
  const [chatState, setChatState] = useState<ChatState>({
    isOpen: false,
    providerId: '',
    providerName: '',
    providerType: undefined,
    bookingRequestId: undefined,
    initialMessage: undefined,
  });

  // Migration state
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<string | null>(null);

  // View state - with persistence
  const [viewMode, setViewMode] = useState<'expanded' | 'condensed'>(() => {
    try {
      return (localStorage.getItem('multi_dashboard_view_mode') as 'expanded' | 'condensed') || 'condensed';
    } catch { return 'condensed'; }
  });
  // Simplified filter: 'active' (à traiter) or 'history' (historique)
  const [filterStatus, setFilterStatus] = useState<'active' | 'history'>(() => {
    try {
      const saved = localStorage.getItem('multi_dashboard_filter');
      if (saved === 'history') return 'history';
      return 'active'; // Default to active (à traiter)
    } catch { return 'active'; }
  });
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('multi_dashboard_expanded_account') || null;
    } catch { return null; }
  });

  // Persist view preferences
  React.useEffect(() => {
    try {
      localStorage.setItem('multi_dashboard_view_mode', viewMode);
    } catch { /* ignore */ }
  }, [viewMode]);

  React.useEffect(() => {
    try {
      localStorage.setItem('multi_dashboard_filter', filterStatus);
    } catch { /* ignore */ }
  }, [filterStatus]);

  React.useEffect(() => {
    try {
      if (expandedAccountId) {
        localStorage.setItem('multi_dashboard_expanded_account', expandedAccountId);
      } else {
        localStorage.removeItem('multi_dashboard_expanded_account');
      }
    } catch { /* ignore */ }
  }, [expandedAccountId]);

  // ============================================================================
  // EXPIRATION LOGIC: Pending requests > 24h are considered "expired"
  // ============================================================================

  // Helper to check if a booking is "active" (needs attention)
  const isActiveBooking = useCallback((booking: { status: string; createdAt: Date }) => {
    const age = Date.now() - booking.createdAt.getTime();
    // Active = pending AND less than 24h old
    return booking.status === 'pending' && age < TWENTY_FOUR_HOURS;
  }, []);

  // Helper to check if booking is "new" (< 5 min)
  const isNewBooking = useCallback((booking: { createdAt: Date }) => {
    const age = Date.now() - booking.createdAt.getTime();
    return age < FIVE_MINUTES;
  }, []);

  // Helper to check if booking is "expired" (pending > 24h) or completed/cancelled
  const isHistoryBooking = useCallback((booking: { status: string; createdAt: Date }) => {
    const age = Date.now() - booking.createdAt.getTime();
    // History = completed, cancelled, OR pending > 24h (expired)
    return booking.status === 'completed' ||
           booking.status === 'cancelled' ||
           (booking.status === 'pending' && age >= TWENTY_FOUR_HOURS);
  }, []);

  // ============================================================================
  // FILTERED DATA
  // ============================================================================

  // Count of active bookings (for stats)
  const activeBookingsCount = useMemo(() => {
    return accounts.flatMap(a => a.bookingRequests).filter(isActiveBooking).length;
  }, [accounts, isActiveBooking]);

  // Accounts with HISTORY bookings (completed, cancelled, or expired pending)
  const accountsWithHistoryBookings = useMemo(() => {
    return accounts.filter(account =>
      account.bookingRequests.some(isHistoryBooking)
    ).map(account => ({
      ...account,
      // Filter to only show history bookings
      bookingRequests: account.bookingRequests.filter(isHistoryBooking)
    }));
  }, [accounts, isHistoryBooking]);

  // Count expired pending (for info)
  const expiredPendingCount = useMemo(() => {
    return accounts.flatMap(a => a.bookingRequests).filter(b => {
      const age = Date.now() - b.createdAt.getTime();
      return b.status === 'pending' && age >= TWENTY_FOUR_HOURS;
    }).length;
  }, [accounts]);

  // URGENT: Get all new requests (< 5 minutes old) from all accounts
  const newRequests = useMemo(() => {
    return accounts.flatMap(account =>
      account.bookingRequests
        .filter(booking => isNewBooking(booking) && booking.status === 'pending')
        .map(booking => ({
          ...booking,
          accountName: account.displayName,
          accountUserId: account.userId,
          providerInfo: account.providers.find(p => p.id === booking.providerId),
        }))
    ).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [accounts, isNewBooking]);

  // À TRAITER: Pending requests between 5 min and 24h old
  const pendingRequests = useMemo(() => {
    return accounts.flatMap(account =>
      account.bookingRequests
        .filter(booking => {
          const age = Date.now() - booking.createdAt.getTime();
          return booking.status === 'pending' &&
                 age >= FIVE_MINUTES &&
                 age < TWENTY_FOUR_HOURS;
        })
        .map(booking => ({
          ...booking,
          accountName: account.displayName,
          accountUserId: account.userId,
          providerInfo: account.providers.find(p => p.id === booking.providerId),
        }))
    ).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [accounts]);

  // Handle closing chat
  const handleCloseChat = useCallback(() => {
    setChatState(prev => ({ ...prev, isOpen: false }));
    clearConversations();
  }, [clearConversations]);

  // Handle loading conversations
  const handleLoadConversations = useCallback(async () => {
    if (chatState.providerId) {
      await loadConversations(chatState.providerId);
    }
  }, [chatState.providerId, loadConversations]);

  // Handle sending message
  const handleSendMessage = useCallback(async (message: string, conversationId?: string) => {
    if (chatState.providerId) {
      await sendMessage(chatState.providerId, message, conversationId, chatState.bookingRequestId);
    }
  }, [chatState.providerId, chatState.bookingRequestId, sendMessage]);

  // Handle migration of old pending bookings
  const handleMigration = useCallback(async () => {
    if (isMigrating) return;

    const confirmed = window.confirm(
      'Voulez-vous marquer toutes les anciennes demandes en attente comme "terminées" ?\n\n' +
      'Cette action est irréversible.'
    );

    if (!confirmed) return;

    setIsMigrating(true);
    setMigrationResult(null);

    const result = await migrateOldBookings(false);

    if (result) {
      setMigrationResult(result.message);
    }

    setIsMigrating(false);
  }, [isMigrating, migrateOldBookings]);

  // Not authenticated - show password gate
  if (!isAuthenticated) {
    return (
      <PasswordGate
        onAuthenticate={authenticate}
        error={error}
        isLoading={isLoading}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/25">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-gray-900 dark:text-white">
                  Dashboard Multi-Prestataires
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  SOS-Expat Administration
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {/* Quick Account Selector */}
              {accounts.length > 1 && (
                <div className="relative group">
                  <button
                    className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                    title="Aller au compte"
                  >
                    <Users className="w-4 h-4" />
                    <span className="hidden sm:inline text-sm font-medium">Comptes</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {/* Dropdown */}
                  <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 max-h-80 overflow-y-auto">
                    <div className="p-2">
                      <p className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                        Accès rapide
                      </p>
                      {accounts.map((account) => {
                        const hasPending = account.bookingRequests.some(b => b.status === 'pending');
                        return (
                          <button
                            key={account.userId}
                            onClick={() => {
                              setExpandedAccountId(account.userId);
                              setFilterStatus('active');
                              // Scroll to the account
                              setTimeout(() => {
                                document.getElementById(`account-${account.userId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }, 100);
                            }}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                              expandedAccountId === account.userId
                                ? "bg-blue-50 dark:bg-blue-900/20"
                                : "hover:bg-gray-50 dark:hover:bg-gray-700"
                            )}
                          >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-xs font-bold">
                                {account.displayName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {account.displayName}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {account.providers.length} prestataire{account.providers.length > 1 ? 's' : ''}
                              </p>
                            </div>
                            {hasPending && (
                              <span className="flex-shrink-0 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={refresh}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Rafraîchir"
              >
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                <span className="hidden sm:inline">Rafraîchir</span>
              </button>

              {/* Migration button - Only show if there are pending bookings */}
              {stats.pendingBookings > 0 && (
                <button
                  onClick={handleMigration}
                  disabled={isMigrating}
                  className="flex items-center gap-2 px-4 py-2 text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
                  title="Marquer anciennes demandes comme terminées"
                >
                  <Clock className={cn("w-4 h-4", isMigrating && "animate-spin")} />
                  <span className="hidden sm:inline">{isMigrating ? 'Migration...' : 'Clôturer anciennes'}</span>
                </button>
              )}

              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards - Simplified and action-oriented */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={<Bell className="w-5 h-5" />}
            label="Urgents (< 5 min)"
            value={newRequests.length}
            color="green"
            pulse={newRequests.length > 0}
          />
          <StatCard
            icon={<Clock className="w-5 h-5" />}
            label="À traiter"
            value={activeBookingsCount}
            color="amber"
            pulse={activeBookingsCount > 0}
          />
          <StatCard
            icon={<Users className="w-5 h-5" />}
            label="Comptes"
            value={stats.totalAccounts}
            color="blue"
          />
          <StatCard
            icon={<Bot className="w-5 h-5" />}
            label="Réponses IA"
            value={stats.aiGeneratedResponses}
            color="purple"
          />
        </div>

        {/* Toolbar: Filters & View Mode */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
          {/* Filters - Simplified: À traiter vs Historique */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <div className="flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
              <button
                onClick={() => setFilterStatus('active')}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-2",
                  filterStatus === 'active'
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                <Bell className="w-4 h-4" />
                À traiter
                {activeBookingsCount > 0 && (
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-bold",
                    filterStatus === 'active'
                      ? "bg-white/20 text-white"
                      : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                  )}>
                    {activeBookingsCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setFilterStatus('history')}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2",
                  filterStatus === 'history'
                    ? "bg-gray-500 text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                <Clock className="w-4 h-4" />
                Historique
                {expiredPendingCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
                    +{expiredPendingCount} expirées
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('condensed')}
              className={cn(
                "p-2 rounded-lg transition-colors",
                viewMode === 'condensed'
                  ? "bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white"
                  : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              )}
              title="Vue condensée"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('expanded')}
              className={cn(
                "p-2 rounded-lg transition-colors",
                viewMode === 'expanded'
                  ? "bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white"
                  : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              )}
              title="Vue détaillée"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Migration Result */}
        {migrationResult && (
          <div className="mb-6 flex items-center justify-between gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-400">
            <div className="flex items-center gap-3">
              <Bot className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{migrationResult}</p>
            </div>
            <button
              onClick={() => setMigrationResult(null)}
              className="text-green-500 hover:text-green-700 dark:hover:text-green-300"
            >
              &times;
            </button>
          </div>
        )}

        {/* NEW REQUESTS SECTION - High visibility for requests < 5 minutes old */}
        {newRequests.length > 0 && (
          <div className="mb-6">
            <div className="bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10 dark:from-green-500/20 dark:via-emerald-500/20 dark:to-teal-500/20 rounded-2xl border-2 border-green-400 dark:border-green-600 p-4 animate-pulse-subtle">
              <div className="flex items-center justify-between mb-4">
                <h3 className="flex items-center gap-2 text-lg font-bold text-green-700 dark:text-green-400">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                  NOUVELLES DEMANDES ({newRequests.length})
                </h3>
                <span className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
                  Moins de 5 min
                </span>
              </div>
              <div className="space-y-3">
                {newRequests.map((request) => (
                  <div
                    key={request.id}
                    className="bg-white dark:bg-gray-800 rounded-xl border border-green-200 dark:border-green-700 p-4 shadow-lg hover:shadow-xl transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Client Info - LEFT */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-green-500 text-white rounded-full animate-pulse">
                            NOUVEAU
                          </span>
                          <span className="font-bold text-gray-900 dark:text-white text-lg">
                            {request.clientName}
                          </span>
                          {request.clientCurrentCountry && (
                            <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              </svg>
                              {request.clientCurrentCountry}
                            </span>
                          )}
                          {request.clientPhone && (
                            <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              {request.clientPhone}
                            </span>
                          )}
                        </div>

                        {/* Request Title/Description */}
                        {request.title && (
                          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 line-clamp-2 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
                            "{request.title}"
                          </p>
                        )}

                        {/* Provider & Account Info */}
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-lg flex items-center gap-1">
                            {request.providerType === 'lawyer' ? (
                              <Scale className="w-3 h-3" />
                            ) : (
                              <Users className="w-3 h-3" />
                            )}
                            {request.providerInfo?.name || request.providerName || 'Prestataire'}
                          </span>
                          <span className="text-gray-400">•</span>
                          <span>{request.accountName}</span>
                          <span className="text-gray-400">•</span>
                          <Clock className="w-3 h-3" />
                          <span>
                            {Math.floor((Date.now() - request.createdAt.getTime()) / 60000)} min
                          </span>
                        </div>
                      </div>

                      {/* ACTION BUTTON - RIGHT */}
                      <div className="flex-shrink-0">
                        <button
                          onClick={() => openAiTool(request.providerId, request.id)}
                          className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all text-sm"
                        >
                          <Bot className="w-4 h-4" />
                          OUVRIR
                        </button>
                      </div>
                    </div>

                    {/* AI Response Preview if available */}
                    {request.aiResponse && (
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 mb-1">
                          <Bot className="w-3 h-3" />
                          Reponse IA generee
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                          {request.aiResponse.content.substring(0, 150)}...
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-red-500 animate-spin mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Chargement des comptes...</p>
          </div>
        ) : filterStatus === 'active' ? (
          /* ========== VUE "À TRAITER" ========== */
          <div className="space-y-6">
            {/* Section: À TRAITER (pending 5min-24h) */}
            {pendingRequests.length > 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-amber-200 dark:border-amber-800 overflow-hidden">
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 px-4 py-3 border-b border-amber-200 dark:border-amber-800">
                  <h3 className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-400">
                    <Bell className="w-5 h-5" />
                    À TRAITER ({pendingRequests.length})
                    <span className="text-xs font-normal text-amber-600 dark:text-amber-500 ml-2">
                      Demandes de 5 min à 24h
                    </span>
                  </h3>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {pendingRequests.map((request) => {
                    const ageMinutes = Math.floor((Date.now() - request.createdAt.getTime()) / 60000);
                    const ageHours = Math.floor(ageMinutes / 60);
                    const ageDisplay = ageHours > 0 ? `${ageHours}h ${ageMinutes % 60}min` : `${ageMinutes} min`;

                    return (
                      <div key={request.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          {/* Client Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <span className="font-bold text-gray-900 dark:text-white">
                                {request.clientName}
                              </span>
                              {request.clientCurrentCountry && (
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  📍 {request.clientCurrentCountry}
                                </span>
                              )}
                              {request.clientPhone && (
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  📞 {request.clientPhone}
                                </span>
                              )}
                            </div>

                            {request.title && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                                "{request.title}"
                              </p>
                            )}

                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                              <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-lg flex items-center gap-1">
                                {request.providerType === 'lawyer' ? <Scale className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                                {request.providerInfo?.name || 'Prestataire'}
                              </span>
                              <span className="text-gray-400">•</span>
                              <span>{request.accountName}</span>
                              <span className="text-gray-400">•</span>
                              <span className={cn(
                                "flex items-center gap-1 px-2 py-0.5 rounded-full",
                                ageHours >= 12 ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" :
                                ageHours >= 1 ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" :
                                "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                              )}>
                                <Clock className="w-3 h-3" />
                                {ageDisplay}
                              </span>
                            </div>
                          </div>

                          {/* Action Button */}
                          <button
                            onClick={() => openAiTool(request.providerId, request.id)}
                            className="flex-shrink-0 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                          >
                            <Bot className="w-4 h-4" />
                            Répondre
                          </button>
                        </div>

                        {/* AI Response Preview */}
                        {request.aiResponse && (
                          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 mb-1">
                              <Bot className="w-3 h-3" />
                              Réponse IA générée
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                              {request.aiResponse.content.substring(0, 150)}...
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : newRequests.length === 0 ? (
              /* No active requests at all */
              <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Tout est à jour !
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Aucune demande en attente de réponse.
                </p>
                {accountsWithHistoryBookings.length > 0 && (
                  <button
                    onClick={() => setFilterStatus('history')}
                    className="mt-4 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white underline"
                  >
                    Voir l'historique des conversations
                  </button>
                )}
              </div>
            ) : null}
          </div>
        ) : (
          /* ========== VUE "HISTORIQUE" ========== */
          <div className="space-y-6">
            {accountsWithHistoryBookings.length > 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="flex items-center gap-2 font-bold text-gray-700 dark:text-gray-300">
                    <Clock className="w-5 h-5" />
                    HISTORIQUE
                    <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-2">
                      Conversations terminées et demandes expirées (&gt;24h)
                    </span>
                  </h3>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
                  {accountsWithHistoryBookings.flatMap(account =>
                    account.bookingRequests.map(booking => ({
                      ...booking,
                      accountName: account.displayName,
                      accountUserId: account.userId,
                      providerInfo: account.providers.find(p => p.id === booking.providerId),
                    }))
                  ).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 50).map((request) => {
                    const isExpired = request.status === 'pending';
                    const dateStr = request.createdAt.toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: request.createdAt.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                    });

                    return (
                      <div key={request.id} className="p-4 opacity-75 hover:opacity-100 transition-opacity">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={cn(
                                "px-2 py-0.5 text-xs font-medium rounded-full",
                                isExpired
                                  ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                                  : request.status === 'completed'
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                              )}>
                                {isExpired ? 'Expirée' : request.status === 'completed' ? 'Terminée' : 'Annulée'}
                              </span>
                              <span className="font-medium text-gray-700 dark:text-gray-300">
                                {request.clientName}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                → {request.providerInfo?.name || 'Prestataire'}
                              </span>
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                • {dateStr}
                              </span>
                            </div>
                            {request.title && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                                {request.title}
                              </p>
                            )}
                          </div>

                          <button
                            onClick={() => openAiTool(request.providerId, request.id)}
                            className="flex-shrink-0 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                          >
                            Voir
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                <Clock className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Aucun historique
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Les conversations terminées apparaîtront ici.
                </p>
              </div>
            )}

            {/* Back to active */}
            <div className="text-center">
              <button
                onClick={() => setFilterStatus('active')}
                className="px-4 py-2 text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 underline"
              >
                ← Retour aux demandes à traiter
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-gray-400 dark:text-gray-600">
        SOS-Expat Multi-Provider Dashboard &copy; {new Date().getFullYear()}
      </footer>

      {/* Chat Panel */}
      <ChatPanel
        isOpen={chatState.isOpen}
        onClose={handleCloseChat}
        providerId={chatState.providerId}
        providerName={chatState.providerName}
        providerType={chatState.providerType}
        bookingRequestId={chatState.bookingRequestId}
        initialMessage={chatState.initialMessage}
        conversations={conversations}
        isLoading={chatLoading}
        onSendMessage={handleSendMessage}
        onLoadConversations={handleLoadConversations}
      />
    </div>
  );
};

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'blue' | 'purple' | 'green' | 'amber' | 'gray';
  pulse?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color, pulse }) => {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    gray: 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700',
  };

  const iconBgClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900/40',
    purple: 'bg-purple-100 dark:bg-purple-900/40',
    green: 'bg-green-100 dark:bg-green-900/40',
    amber: 'bg-amber-100 dark:bg-amber-900/40',
    gray: 'bg-gray-100 dark:bg-gray-700',
  };

  return (
    <div
      className={cn(
        "relative p-4 rounded-xl border transition-all",
        colorClasses[color],
        pulse && "animate-pulse"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", iconBgClasses[color])}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs opacity-75">{label}</p>
        </div>
      </div>
    </div>
  );
};

export default MultiProviderDashboard;
