/**
 * RecentActivity - Timeline d'activité récente sur le dashboard
 * Affiche les dernières actions de l'utilisateur
 */

import React from 'react';
import { useIntl } from 'react-intl';
import { formatDistanceToNow } from 'date-fns';
import { fr, enUS, es, de, ru, pt } from 'date-fns/locale';
import { useApp } from '../../contexts/AppContext';
import {
  Phone,
  Star,
  MessageSquare,
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  UserPlus,
  AlertCircle,
} from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'call_completed' | 'call_scheduled' | 'call_cancelled' | 'review_received' | 'review_given' | 'message' | 'payment' | 'profile_update';
  title: string;
  description?: string;
  timestamp: Date;
  metadata?: {
    rating?: number;
    amount?: number;
    providerName?: string;
    clientName?: string;
  };
}

interface RecentActivityProps {
  calls?: Array<{
    id: string;
    status: string;
    createdAt?: Date;
    startedAt?: Date;
    endedAt?: Date;
    providerName?: string;
    clientName?: string;
    price?: number;
    clientRating?: number;
  }>;
  reviews?: Array<{
    id: string;
    rating: number;
    createdAt?: Date;
    clientName?: string;
  }>;
  isProvider: boolean;
  maxItems?: number;
}

const RecentActivity: React.FC<RecentActivityProps> = ({
  calls = [],
  reviews = [],
  isProvider,
  maxItems = 5,
}) => {
  const intl = useIntl();
  const { language } = useApp();

  // Locale pour date-fns
  const getLocale = () => {
    switch (language) {
      case 'fr': return fr;
      case 'es': return es;
      case 'de': return de;
      case 'ru': return ru;
      case 'pt': return pt;
      default: return enUS;
    }
  };

  // Construire la liste d'activités
  const activities: ActivityItem[] = React.useMemo(() => {
    const items: ActivityItem[] = [];

    // Ajouter les appels
    calls.forEach((call) => {
      const timestamp = call.endedAt || call.startedAt || call.createdAt;
      if (!timestamp) return;

      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);

      if (call.status === 'completed') {
        items.push({
          id: `call-${call.id}`,
          type: 'call_completed',
          title: intl.formatMessage({ id: 'activity.callCompleted', defaultMessage: 'Call completed' }),
          description: isProvider ? call.clientName : call.providerName,
          timestamp: date,
          metadata: {
            amount: call.price,
            rating: call.clientRating,
          },
        });
      } else if (call.status === 'scheduled' || call.status === 'pending') {
        items.push({
          id: `call-scheduled-${call.id}`,
          type: 'call_scheduled',
          title: intl.formatMessage({ id: 'activity.callScheduled', defaultMessage: 'Call scheduled' }),
          description: isProvider ? call.clientName : call.providerName,
          timestamp: date,
        });
      } else if (call.status === 'cancelled' || call.status === 'no_show') {
        items.push({
          id: `call-cancelled-${call.id}`,
          type: 'call_cancelled',
          title: intl.formatMessage({ id: 'activity.callCancelled', defaultMessage: 'Call cancelled' }),
          description: isProvider ? call.clientName : call.providerName,
          timestamp: date,
        });
      }
    });

    // Ajouter les avis reçus (pour les prestataires)
    if (isProvider) {
      reviews.forEach((review) => {
        if (!review.createdAt) return;
        const date = review.createdAt instanceof Date ? review.createdAt : new Date(review.createdAt);

        items.push({
          id: `review-${review.id}`,
          type: 'review_received',
          title: intl.formatMessage({ id: 'activity.reviewReceived', defaultMessage: 'New review' }),
          description: review.clientName,
          timestamp: date,
          metadata: { rating: review.rating },
        });
      });
    }

    // Trier par date décroissante et limiter
    return items
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, maxItems);
  }, [calls, reviews, isProvider, maxItems, intl]);

  // Icône et couleur selon le type
  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'call_completed':
        return { icon: <CheckCircle className="w-4 h-4" />, bg: 'bg-green-100 dark:bg-green-900/30', color: 'text-green-600 dark:text-green-400' };
      case 'call_scheduled':
        return { icon: <Clock className="w-4 h-4" />, bg: 'bg-blue-100 dark:bg-blue-900/30', color: 'text-blue-600 dark:text-blue-400' };
      case 'call_cancelled':
        return { icon: <XCircle className="w-4 h-4" />, bg: 'bg-red-100 dark:bg-red-900/30', color: 'text-red-600 dark:text-red-400' };
      case 'review_received':
      case 'review_given':
        return { icon: <Star className="w-4 h-4" />, bg: 'bg-amber-100 dark:bg-amber-900/30', color: 'text-amber-600 dark:text-amber-400' };
      case 'message':
        return { icon: <MessageSquare className="w-4 h-4" />, bg: 'bg-purple-100 dark:bg-purple-900/30', color: 'text-purple-600 dark:text-purple-400' };
      case 'payment':
        return { icon: <CreditCard className="w-4 h-4" />, bg: 'bg-emerald-100 dark:bg-emerald-900/30', color: 'text-emerald-600 dark:text-emerald-400' };
      default:
        return { icon: <AlertCircle className="w-4 h-4" />, bg: 'bg-gray-100 dark:bg-gray-800', color: 'text-gray-600 dark:text-gray-400' };
    }
  };

  // P1 FIX: Use consistent min-height to prevent layout jumps when activities load
  // Si pas d'activités
  if (activities.length === 0) {
    return (
      <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-6 min-h-[280px]">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          {intl.formatMessage({ id: 'dashboard.recentActivity', defaultMessage: 'Recent Activity' })}
        </h3>
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <Clock className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {intl.formatMessage({ id: 'dashboard.noActivity', defaultMessage: 'No recent activity' })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-4 sm:p-6 min-h-[280px]">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4 text-gray-400" />
        {intl.formatMessage({ id: 'dashboard.recentActivity', defaultMessage: 'Recent Activity' })}
      </h3>

      <div className="space-y-3">
        {activities.map((activity, index) => {
          const { icon, bg, color } = getActivityIcon(activity.type);
          const isLast = index === activities.length - 1;

          return (
            <div key={activity.id} className="relative flex gap-3">
              {/* Timeline line */}
              {!isLast && (
                <div className="absolute left-[18px] top-9 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
              )}

              {/* Icon */}
              <div className={`relative z-10 flex-shrink-0 w-9 h-9 rounded-full ${bg} flex items-center justify-center ${color}`}>
                {icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {activity.title}
                    </p>
                    {activity.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {activity.description}
                      </p>
                    )}
                  </div>

                  {/* Rating or Amount */}
                  {activity.metadata?.rating && (
                    <div className="flex items-center gap-0.5 text-amber-500">
                      <Star className="w-3 h-3 fill-current" />
                      <span className="text-xs font-medium">{activity.metadata.rating}</span>
                    </div>
                  )}
                  {activity.metadata?.amount && !activity.metadata?.rating && (
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      +{activity.metadata.amount}€
                    </span>
                  )}
                </div>

                {/* Timestamp */}
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                  {formatDistanceToNow(activity.timestamp, { addSuffix: true, locale: getLocale() })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecentActivity;
