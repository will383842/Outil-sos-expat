/**
 * Requests Page
 * Booking request management with tabs
 */
import { useMemo } from 'react';
import { Inbox, Bell, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useBookingRequests, useAgencyProviders } from '../hooks';
import { BookingTabs } from '../components/bookings';
import { LoadingSpinner } from '../components/ui';
import type { Provider } from '../types';

export default function Requests() {
  const {
    newBookings,
    activeBookings,
    historyBookings,
    pendingCount,
    deleteBooking,
    isLoading,
    error,
  } = useBookingRequests();
  const { providers } = useAgencyProviders();
  const { t } = useTranslation();

  const providerMap = useMemo(() => {
    const map = new Map<string, Provider>();
    for (const p of providers) {
      map.set(p.id, p);
    }
    return map;
  }, [providers]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 font-medium">{t('requests.error_loading')}</p>
          <p className="text-sm text-red-500 mt-1">
            {t('requests.error_retry')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4">
      {/* Summary counters */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 sm:p-4 text-center">
          <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mx-auto mb-0.5" />
          <p className="text-lg sm:text-2xl font-bold text-gray-900">{newBookings.length}</p>
          <p className="text-xs text-gray-500">{t('requests.new_label')}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 sm:p-4 text-center">
          <Inbox className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 mx-auto mb-0.5" />
          <p className="text-lg sm:text-2xl font-bold text-gray-900">{pendingCount}</p>
          <p className="text-xs text-gray-500">{t('requests.to_process')}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 sm:p-4 text-center">
          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mx-auto mb-0.5" />
          <p className="text-lg sm:text-2xl font-bold text-gray-900">{historyBookings.length}</p>
          <p className="text-xs text-gray-500">{t('requests.history')}</p>
        </div>
      </div>

      {/* Booking tabs */}
      <BookingTabs
        newBookings={newBookings}
        activeBookings={activeBookings}
        historyBookings={historyBookings}
        isLoading={isLoading}
        onDelete={deleteBooking}
        providerMap={providerMap}
      />
    </div>
  );
}
