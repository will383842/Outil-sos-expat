/**
 * MultiProviderDashboard - Page principale du dashboard multi-prestataires
 *
 * Dashboard dédié aux comptes multi-prestataires avec:
 * - Accès via mot de passe unique
 * - Affichage de tous les comptes multi-prestataires
 * - Booking requests en temps réel avec réponses IA auto-générées
 * - Statistiques globales
 */

import React from 'react';
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
} from 'lucide-react';
import { useMultiProviderDashboard } from '../../hooks/useMultiProviderDashboard';
import PasswordGate from './PasswordGate';
import AccountCard from './AccountCard';
import { cn } from '../../utils/cn';

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
  } = useMultiProviderDashboard();

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
              <button
                onClick={refresh}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Rafraîchir"
              >
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                <span className="hidden sm:inline">Rafraîchir</span>
              </button>
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
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
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

        {/* Error Message */}
        {error && (
          <div className="mb-6 flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-red-500 animate-spin mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Chargement des comptes...</p>
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Aucun compte multi-prestataire
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Les comptes avec plusieurs prestataires liés apparaîtront ici.
              Utilisez l'onglet Multi-Prestataires dans l'admin IA pour lier des prestataires.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {accounts.map((account) => (
              <AccountCard key={account.userId} account={account} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-gray-400 dark:text-gray-600">
        SOS-Expat Multi-Provider Dashboard &copy; {new Date().getFullYear()}
      </footer>
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
