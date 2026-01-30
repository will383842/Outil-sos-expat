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
  MessageSquare,
  Bot,
  Clock,
  LogOut,
  Loader2,
  AlertCircle,
  TrendingUp,
  Filter,
  LayoutGrid,
  List,
  ChevronDown,
  Bell,
  Scale,
} from 'lucide-react';
import { useMultiProviderDashboard } from '../../hooks/useMultiProviderDashboard';
import PasswordGate from './PasswordGate';
import AccountCard from './AccountCard';
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
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'active'>(() => {
    try {
      return (localStorage.getItem('multi_dashboard_filter') as 'all' | 'pending' | 'active') || 'all';
    } catch { return 'all'; }
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

  // Filtered accounts based on status
  const filteredAccounts = useMemo(() => {
    if (filterStatus === 'all') return accounts;

    return accounts.filter(account => {
      if (filterStatus === 'pending') {
        return account.bookingRequests.some(b => b.status === 'pending');
      }
      if (filterStatus === 'active') {
        return account.bookingRequests.some(b => b.status === 'in_progress' || b.status === 'confirmed');
      }
      return true;
    });
  }, [accounts, filterStatus]);

  // Accounts with pending requests (prioritized)
  const accountsWithPending = useMemo(() => {
    return filteredAccounts.filter(a => a.bookingRequests.some(b => b.status === 'pending'));
  }, [filteredAccounts]);

  const accountsWithoutPending = useMemo(() => {
    return filteredAccounts.filter(a => !a.bookingRequests.some(b => b.status === 'pending'));
  }, [filteredAccounts]);

  // NEW: Get all new requests (< 5 minutes old) from all accounts for the priority section
  const newRequests = useMemo(() => {
    const FIVE_MINUTES = 5 * 60 * 1000;
    const now = Date.now();

    return accounts.flatMap(account =>
      account.bookingRequests
        .filter(booking => {
          const age = now - booking.createdAt.getTime();
          return age < FIVE_MINUTES;
        })
        .map(booking => ({
          ...booking,
          accountName: account.displayName,
          accountUserId: account.userId,
          // Find provider name for this booking
          providerInfo: account.providers.find(p => p.id === booking.providerId),
        }))
    ).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Most recent first
  }, [accounts]);

  // Handle opening chat
  const handleOpenChat = useCallback((
    providerId: string,
    providerName: string,
    providerType: 'lawyer' | 'expat' | undefined,
    bookingRequestId: string,
    initialMessage?: string
  ) => {
    setChatState({
      isOpen: true,
      providerId,
      providerName,
      providerType,
      bookingRequestId,
      initialMessage,
    });
  }, []);

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

  // Toggle account expansion
  const toggleAccountExpansion = useCallback((userId: string) => {
    setExpandedAccountId(prev => prev === userId ? null : userId);
  }, []);

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
                              setFilterStatus('all');
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
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <StatCard
            icon={<Users className="w-5 h-5" />}
            label="Comptes"
            value={stats.totalAccounts}
            color="blue"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Prestataires"
            value={stats.totalProviders}
            color="purple"
          />
          <StatCard
            icon={<MessageSquare className="w-5 h-5" />}
            label="Demandes"
            value={stats.totalBookings}
            color="gray"
          />
          <StatCard
            icon={<Clock className="w-5 h-5" />}
            label="En attente"
            value={stats.pendingBookings}
            color="amber"
            pulse={stats.pendingBookings > 0}
          />
          <StatCard
            icon={<Bot className="w-5 h-5" />}
            label="Réponses IA"
            value={stats.aiGeneratedResponses}
            color="green"
          />
        </div>

        {/* Toolbar: Filters & View Mode */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
          {/* Filters */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <div className="flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
              <button
                onClick={() => setFilterStatus('all')}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  filterStatus === 'all'
                    ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                Tous ({accounts.length})
              </button>
              <button
                onClick={() => setFilterStatus('pending')}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5",
                  filterStatus === 'pending'
                    ? "bg-amber-500 text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                <Bell className="w-3.5 h-3.5" />
                En attente ({accountsWithPending.length})
              </button>
              <button
                onClick={() => setFilterStatus('active')}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  filterStatus === 'active'
                    ? "bg-green-500 text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                Actifs
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
        ) : filteredAccounts.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {accounts.length === 0 ? 'Aucun compte multi-prestataire' : 'Aucun compte correspondant'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              {accounts.length === 0
                ? 'Les comptes avec plusieurs prestataires liés apparaîtront ici. Utilisez l\'onglet Multi-Prestataires dans l\'admin IA pour lier des prestataires.'
                : 'Aucun compte ne correspond aux filtres sélectionnés. Essayez de modifier vos filtres.'
              }
            </p>
            {filterStatus !== 'all' && (
              <button
                onClick={() => setFilterStatus('all')}
                className="mt-4 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Afficher tous les comptes
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Accounts with pending requests - Show section header only when viewing 'all' */}
            {accountsWithPending.length > 0 && filterStatus === 'all' && (
              <div className="mb-6">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400 mb-3 px-1">
                  <Bell className="w-4 h-4" />
                  Demandes en attente ({accountsWithPending.length} compte{accountsWithPending.length > 1 ? 's' : ''})
                </h3>
                <div className="space-y-4">
                  {accountsWithPending.map((account) => (
                    <AccountCard
                      key={account.userId}
                      account={account}
                      onOpenAiTool={openAiTool}
                      onOpenChat={handleOpenChat}
                      isCondensed={viewMode === 'condensed'}
                      isExpanded={expandedAccountId === account.userId || viewMode === 'expanded'}
                      onToggleExpand={() => toggleAccountExpansion(account.userId)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Other accounts (or all filtered accounts when filter is not 'all') */}
            {filterStatus === 'all' ? (
              // Show "Other accounts" section only when viewing all
              accountsWithoutPending.length > 0 && (
                <div>
                  {accountsWithPending.length > 0 && (
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3 px-1">
                      <Users className="w-4 h-4" />
                      Autres comptes ({accountsWithoutPending.length})
                    </h3>
                  )}
                  <div className="space-y-4">
                    {accountsWithoutPending.map((account) => (
                      <AccountCard
                        key={account.userId}
                        account={account}
                        onOpenAiTool={openAiTool}
                        onOpenChat={handleOpenChat}
                        isCondensed={viewMode === 'condensed'}
                        isExpanded={expandedAccountId === account.userId || viewMode === 'expanded'}
                        onToggleExpand={() => toggleAccountExpansion(account.userId)}
                      />
                    ))}
                  </div>
                </div>
              )
            ) : (
              // When filter is 'pending' or 'active', show filtered accounts directly
              filteredAccounts.length > 0 && (
                <div className="space-y-4">
                  {filteredAccounts.map((account) => (
                    <AccountCard
                      key={account.userId}
                      account={account}
                      onOpenAiTool={openAiTool}
                      onOpenChat={handleOpenChat}
                      isCondensed={viewMode === 'condensed'}
                      isExpanded={expandedAccountId === account.userId || viewMode === 'expanded'}
                      onToggleExpand={() => toggleAccountExpansion(account.userId)}
                    />
                  ))}
                </div>
              )
            )}
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
