/**
 * AccountCard - Carte compte multi-prestataire
 *
 * Affiche les détails d'un compte multi-prestataire avec ses prestataires et demandes
 */

import React, { useState } from 'react';
import {
  User,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Clock,
  Link2,
  Users,
} from 'lucide-react';
import type { MultiProviderAccount } from '../../hooks/useMultiProviderDashboard';
import ProviderBadge from './ProviderBadge';
import BookingRequestCard from './BookingRequestCard';
import { cn } from '../../utils/cn';

interface AccountCardProps {
  account: MultiProviderAccount;
  onOpenAiTool?: (providerId: string, bookingId?: string) => void;
  onOpenChat?: (providerId: string, providerName: string, providerType: 'lawyer' | 'expat' | undefined, bookingId: string, initialMessage?: string) => void;
  isCondensed?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const AccountCard: React.FC<AccountCardProps> = ({
  account,
  onOpenAiTool,
  onOpenChat,
  isCondensed = false,
  isExpanded: externalExpanded,
  onToggleExpand,
}) => {
  // Use external expansion state if provided, otherwise use internal state
  const [internalExpanded, setInternalExpanded] = useState(!isCondensed);
  const expanded = externalExpanded !== undefined ? externalExpanded : internalExpanded;
  const [showAllBookings, setShowAllBookings] = useState(false);

  const handleToggleExpand = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setInternalExpanded(!internalExpanded);
    }
  };

  const pendingBookings = account.bookingRequests.filter(b => b.status === 'pending');
  const displayedBookings = showAllBookings
    ? account.bookingRequests
    : account.bookingRequests.slice(0, 5);

  const getProviderName = (providerId: string) => {
    return account.providers.find(p => p.id === providerId)?.name || providerId;
  };

  return (
    <div
      id={`account-${account.userId}`}
      className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden transition-all duration-300"
    >
      {/* Header */}
      <button
        onClick={handleToggleExpand}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-red-500/20">
            <User className="w-6 h-6 text-white" />
          </div>

          {/* Account Info */}
          <div className="text-left">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              {account.displayName}
              {account.shareBusyStatus && (
                <span className="px-2 py-0.5 text-[10px] font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full flex items-center gap-1">
                  <Link2 className="w-2.5 h-2.5" />
                  Sync
                </span>
              )}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{account.email}</p>
          </div>
        </div>

        {/* Stats & Arrow */}
        <div className="flex items-center gap-4">
          {/* Provider Count */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg">
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">{account.providers.length}</span>
            <span className="text-xs hidden sm:inline">prestataire{account.providers.length > 1 ? 's' : ''}</span>
          </div>

          {/* Pending Bookings */}
          {pendingBookings.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-lg animate-pulse">
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm font-medium">{pendingBookings.length}</span>
              <span className="text-xs hidden sm:inline">en attente</span>
            </div>
          )}

          {/* Total Bookings */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">{account.bookingRequests.length}</span>
            <span className="text-xs hidden sm:inline">total</span>
          </div>

          {/* Expand Arrow */}
          <div className="text-gray-400">
            {expanded ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </div>
        </div>
      </button>

      {/* Expanded Content - Two Column Layout */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700">
          <div className="flex flex-col lg:flex-row">
            {/* Left Sidebar - Providers */}
            <div className="lg:w-64 xl:w-72 flex-shrink-0 bg-gray-50 dark:bg-gray-800/50 border-b lg:border-b-0 lg:border-r border-gray-100 dark:border-gray-700">
              <div className="p-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Prestataires ({account.providers.length})
                </h4>
                <div className="space-y-2">
                  {account.providers.map((provider) => (
                    <ProviderBadge key={provider.id} provider={provider} compact />
                  ))}
                </div>
              </div>
            </div>

            {/* Right Main Area - Booking Requests */}
            <div className="flex-1 min-w-0">
              <div className="p-4 lg:p-6">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Demandes récentes
                  {pendingBookings.length > 0 && (
                    <span className="ml-1 px-2 py-0.5 text-xs font-bold bg-amber-500 text-white rounded-full">
                      {pendingBookings.length} en attente
                    </span>
                  )}
                </h4>

                {account.bookingRequests.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Aucune demande pour le moment</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {displayedBookings.map((booking) => (
                      <BookingRequestCard
                        key={booking.id}
                        booking={booking}
                        providerName={getProviderName(booking.providerId)}
                        onOpenAiTool={onOpenAiTool}
                        onOpenChat={onOpenChat}
                      />
                    ))}

                    {/* Show More Button */}
                    {account.bookingRequests.length > 5 && (
                      <button
                        onClick={() => setShowAllBookings(!showAllBookings)}
                        className="w-full py-3 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        {showAllBookings
                          ? 'Afficher moins'
                          : `Voir toutes les demandes (${account.bookingRequests.length})`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountCard;
