/**
 * DashboardStats - Cartes statistiques pour le dashboard
 * Affiche les KPIs clés pour users et prestataires
 */

import React, { useMemo } from 'react';
import { useIntl } from 'react-intl';
import {
  Phone,
  DollarSign,
  Star,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  Calendar,
  Wallet,
  Award,
} from 'lucide-react';
import type { User } from '../../contexts/types';

interface DashboardStatsProps {
  user: User;
  calls?: Array<{
    status: string;
    duration?: number;
    price?: number;
    createdAt?: Date;
  }>;
  reviews?: Array<{
    rating: number;
    status?: string;
  }>;
  loading?: boolean;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  gradient: string;
  iconBg: string;
  loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  subValue,
  trend,
  trendValue,
  gradient,
  iconBg,
  loading,
}) => {
  // P1 FIX: Use consistent min-height to prevent layout jumps between loading and loaded states
  if (loading) {
    return (
      <div className="stats-card-animate bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-lg min-h-[120px]">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="stats-skeleton h-4 w-20 mb-3" />
            <div className="stats-skeleton h-8 w-16 mb-2" />
            <div className="stats-skeleton h-3 w-24" />
          </div>
          <div className="stats-skeleton h-12 w-12 rounded-xl" />
        </div>
      </div>
    );
  }

  // P1 FIX: Removed hover:-translate-y-0.5 to prevent micro-jumps on hover
  return (
    <div className={`stats-card-animate bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-lg hover:shadow-xl transition-shadow duration-300 min-h-[120px]`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
            {label}
          </p>
          <p className={`mt-1 text-2xl sm:text-3xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent counter-animate`}>
            {value}
          </p>
          {subValue && (
            <p className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
              {subValue}
            </p>
          )}
          {trend && trendValue && (
            <div className={`mt-2 inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
              trend === 'up'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : trend === 'down'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
            }`}>
              {trend === 'up' && <TrendingUp className="w-3 h-3" />}
              {trendValue}
            </div>
          )}
        </div>
        <div className={`p-2.5 sm:p-3 rounded-xl ${iconBg}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

const DashboardStats: React.FC<DashboardStatsProps> = ({
  user,
  calls = [],
  reviews = [],
  loading = false,
}) => {
  const intl = useIntl();
  const isProvider = user.role === 'lawyer' || user.role === 'expat';

  // Calculs des statistiques
  const stats = useMemo(() => {
    const completedCalls = calls.filter(c => c.status === 'completed');
    const totalDuration = completedCalls.reduce((sum, c) => sum + (c.duration || 0), 0);
    const totalEarnings = completedCalls.reduce((sum, c) => sum + (c.price || 0), 0);
    const publishedReviews = reviews.filter(r => r.status === 'published' || !r.status);
    const avgRating = publishedReviews.length > 0
      ? publishedReviews.reduce((sum, r) => sum + r.rating, 0) / publishedReviews.length
      : 0;

    // Calcul des appels ce mois
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const callsThisMonth = completedCalls.filter(c => {
      if (!c.createdAt) return false;
      const callDate = c.createdAt instanceof Date ? c.createdAt : new Date(c.createdAt);
      return callDate >= startOfMonth;
    }).length;

    return {
      totalCalls: completedCalls.length,
      callsThisMonth,
      totalDuration,
      avgDuration: completedCalls.length > 0 ? Math.round(totalDuration / completedCalls.length) : 0,
      totalEarnings,
      avgRating: avgRating.toFixed(1),
      reviewCount: publishedReviews.length,
      pendingCalls: calls.filter(c => c.status === 'pending' || c.status === 'scheduled').length,
    };
  }, [calls, reviews]);

  // Formatage
  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(intl.locale, {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Stats pour les prestataires (lawyers/expats)
  if (isProvider) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard
          icon={<Phone className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />}
          label={intl.formatMessage({ id: 'dashboard.stats.totalCalls', defaultMessage: 'Total Calls' })}
          value={stats.totalCalls}
          subValue={stats.callsThisMonth > 0
            ? intl.formatMessage(
                { id: 'dashboard.stats.thisMonth', defaultMessage: '{count} this month' },
                { count: stats.callsThisMonth }
              )
            : undefined
          }
          gradient="from-blue-600 to-indigo-600"
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          loading={loading}
        />

        <StatCard
          icon={<Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 dark:text-emerald-400" />}
          label={intl.formatMessage({ id: 'dashboard.stats.earnings', defaultMessage: 'Earnings' })}
          value={formatCurrency(user.totalEarnings || stats.totalEarnings)}
          subValue={formatCurrency(((user as any).pendingBalance || 0))}
          gradient="from-emerald-600 to-teal-600"
          iconBg="bg-emerald-100 dark:bg-emerald-900/30"
          loading={loading}
        />

        <StatCard
          icon={<Star className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500 dark:text-amber-400" />}
          label={intl.formatMessage({ id: 'dashboard.stats.rating', defaultMessage: 'Rating' })}
          value={user.rating ? user.rating.toFixed(1) : stats.avgRating}
          subValue={intl.formatMessage(
            { id: 'dashboard.stats.reviewCount', defaultMessage: '{count} reviews' },
            { count: user.reviewCount || stats.reviewCount }
          )}
          gradient="from-amber-500 to-orange-500"
          iconBg="bg-amber-100 dark:bg-amber-900/30"
          loading={loading}
        />

        <StatCard
          icon={<Clock className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400" />}
          label={intl.formatMessage({ id: 'dashboard.stats.avgDuration', defaultMessage: 'Avg Duration' })}
          value={formatDuration(stats.avgDuration)}
          subValue={intl.formatMessage(
            { id: 'dashboard.stats.totalTime', defaultMessage: '{time} total' },
            { time: formatDuration(stats.totalDuration) }
          )}
          gradient="from-purple-600 to-pink-600"
          iconBg="bg-purple-100 dark:bg-purple-900/30"
          loading={loading}
        />
      </div>
    );
  }

  // Stats pour les clients
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      <StatCard
        icon={<Phone className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />}
        label={intl.formatMessage({ id: 'dashboard.stats.consultations', defaultMessage: 'Consultations' })}
        value={stats.totalCalls}
        subValue={stats.pendingCalls > 0
          ? intl.formatMessage(
              { id: 'dashboard.stats.pending', defaultMessage: '{count} pending' },
              { count: stats.pendingCalls }
            )
          : undefined
        }
        gradient="from-blue-600 to-indigo-600"
        iconBg="bg-blue-100 dark:bg-blue-900/30"
        loading={loading}
      />

      <StatCard
        icon={<Clock className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400" />}
        label={intl.formatMessage({ id: 'dashboard.stats.totalTime', defaultMessage: 'Total Time' })}
        value={formatDuration(stats.totalDuration)}
        subValue={stats.avgDuration > 0
          ? intl.formatMessage(
              { id: 'dashboard.stats.avgPerCall', defaultMessage: 'Avg {time}/call' },
              { time: formatDuration(stats.avgDuration) }
            )
          : undefined
        }
        gradient="from-purple-600 to-pink-600"
        iconBg="bg-purple-100 dark:bg-purple-900/30"
        loading={loading}
      />

      <StatCard
        icon={<DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 dark:text-emerald-400" />}
        label={intl.formatMessage({ id: 'dashboard.stats.spent', defaultMessage: 'Total Spent' })}
        value={formatCurrency(stats.totalEarnings)}
        gradient="from-emerald-600 to-teal-600"
        iconBg="bg-emerald-100 dark:bg-emerald-900/30"
        loading={loading}
      />

      <StatCard
        icon={<Star className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500 dark:text-amber-400" />}
        label={intl.formatMessage({ id: 'dashboard.stats.reviewsGiven', defaultMessage: 'Reviews Given' })}
        value={stats.reviewCount}
        gradient="from-amber-500 to-orange-500"
        iconBg="bg-amber-100 dark:bg-amber-900/30"
        loading={loading}
      />
    </div>
  );
};

export default DashboardStats;
