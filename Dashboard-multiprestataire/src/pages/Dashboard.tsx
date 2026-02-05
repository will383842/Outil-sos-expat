/**
 * Dashboard Page
 * Main overview with KPIs and quick actions
 */
import { Link } from 'react-router-dom';
import { Users, Inbox } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useAgencyProviders, useBookingRequests } from '../hooks';
import { StatsCard, ActivityFeed } from '../components/dashboard';
import { LoadingSpinner } from '../components/ui';

export default function Dashboard() {
  const { user } = useAuth();
  const { providers, isLoading: loadingProviders, activeCount, onlineCount } = useAgencyProviders();
  const { pendingCount, newBookings, isLoading: loadingBookings } = useBookingRequests();
  const { t } = useTranslation();

  const isLoading = loadingProviders || loadingBookings;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4">
      {/* Welcome message */}
      <p className="text-gray-600 text-sm sm:text-base mb-4 sm:mb-6">
        {t('dashboard.greeting', { name: user?.displayName || user?.email })}
      </p>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-5">
        <Link to="/requests" className="active:scale-[0.98] transition-transform">
          <StatsCard
            title={t('dashboard.requests_to_process')}
            value={pendingCount}
            icon={<Inbox className="w-6 h-6 text-amber-600" />}
            iconBg="bg-amber-100"
            subtitle={pendingCount > 0 ? t('dashboard.new_count_other', { count: newBookings.length }) : t('dashboard.all_caught_up')}
          />
        </Link>

        <Link to="/team" className="active:scale-[0.98] transition-transform">
          <StatsCard
            title={t('dashboard.providers')}
            value={activeCount}
            icon={<Users className="w-6 h-6 text-primary-600" />}
            iconBg="bg-primary-100"
            subtitle={t('dashboard.online_count', { count: onlineCount })}
          />
        </Link>
      </div>

      {/* New requests quick access */}
      {newBookings.length > 0 && (
        <Link
          to="/requests"
          className="block mb-5 p-3 bg-green-50 border border-green-200 rounded-xl active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-semibold text-green-700">
                {t('dashboard.new_requests_other', { count: newBookings.length })}
              </span>
            </div>
            <span className="text-xs text-green-600 font-medium">{t('dashboard.view')} →</span>
          </div>
        </Link>
      )}

      {/* Recent Activity */}
      <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">
        {t('dashboard.recent_activity')}
      </h2>
      <ActivityFeed providers={providers} />
    </div>
  );
}
