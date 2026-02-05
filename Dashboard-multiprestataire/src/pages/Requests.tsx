/**
 * Requests Page
 * Booking request management with tabs (À traiter / Historique)
 */
import { Inbox, Bell, CheckCircle } from 'lucide-react';
import { useBookingRequests } from '../hooks';
import { BookingTabs } from '../components/bookings';
import { LoadingSpinner } from '../components/ui';

export default function Requests() {
  const {
    newBookings,
    activeBookings,
    historyBookings,
    pendingCount,
    isLoading,
    error,
  } = useBookingRequests();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-1 py-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <p className="text-sm text-red-500 mt-1">
            Vérifiez votre connexion et réessayez
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-1">
      {/* Summary counters */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <Bell className="w-5 h-5 text-green-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{newBookings.length}</p>
          <p className="text-xs text-gray-500">Nouvelles</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <Inbox className="w-5 h-5 text-amber-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
          <p className="text-xs text-gray-500">À traiter</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <CheckCircle className="w-5 h-5 text-gray-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{historyBookings.length}</p>
          <p className="text-xs text-gray-500">Historique</p>
        </div>
      </div>

      {/* Booking tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <BookingTabs
          newBookings={newBookings}
          activeBookings={activeBookings}
          historyBookings={historyBookings}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
