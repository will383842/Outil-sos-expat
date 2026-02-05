/**
 * Booking Tabs Component
 * Two tabs: "À traiter" (pending) and "Historique" (completed/cancelled)
 */
import { useState } from 'react';
import { Inbox, History, Bell } from 'lucide-react';
import type { BookingRequest } from '../../types';
import BookingRequestCard from './BookingRequestCard';

interface BookingTabsProps {
  newBookings: BookingRequest[];
  activeBookings: BookingRequest[];
  historyBookings: BookingRequest[];
  isLoading?: boolean;
  onDelete?: (bookingId: string) => void;
}

type Tab = 'pending' | 'history';

export default function BookingTabs({
  newBookings,
  activeBookings,
  historyBookings,
  isLoading,
  onDelete,
}: BookingTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('pending');

  const pendingCount = newBookings.length + activeBookings.length;

  const tabs: { id: Tab; label: string; icon: typeof Inbox; count?: number }[] = [
    { id: 'pending', label: 'À traiter', icon: Inbox, count: pendingCount },
    { id: 'history', label: 'Historique', icon: History, count: historyBookings.length },
  ];

  return (
    <div>
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center justify-center gap-2 flex-1 py-3 min-h-[48px] text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-full ${
                  activeTab === tab.id
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'pending' && (
        <div>
          {/* New requests section */}
          {newBookings.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Bell className="w-4 h-4 text-green-600" />
                <h3 className="text-sm font-semibold text-green-700 uppercase tracking-wide">
                  Nouvelles demandes
                </h3>
              </div>
              <div className="space-y-3 p-3 bg-green-50/50 border border-green-200 rounded-xl">
                {newBookings.map((booking) => (
                  <BookingRequestCard key={booking.id} booking={booking} isNew />
                ))}
              </div>
            </div>
          )}

          {/* Active requests */}
          {activeBookings.length > 0 && (
            <div className="space-y-3">
              {newBookings.length > 0 && (
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  En cours de traitement
                </h3>
              )}
              {activeBookings.map((booking) => (
                <BookingRequestCard key={booking.id} booking={booking} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {pendingCount === 0 && !isLoading && (
            <div className="text-center py-12">
              <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Aucune demande à traiter</p>
              <p className="text-sm text-gray-400 mt-1">
                Les nouvelles demandes apparaîtront ici en temps réel
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div>
          {historyBookings.length > 0 ? (
            <div className="space-y-3">
              {historyBookings.map((booking) => (
                <BookingRequestCard key={booking.id} booking={booking} onDelete={onDelete} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Aucun historique</p>
              <p className="text-sm text-gray-400 mt-1">
                Les demandes terminées ou annulées apparaîtront ici
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
