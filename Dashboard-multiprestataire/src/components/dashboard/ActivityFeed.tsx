/**
 * Activity Feed Component
 * Shows recent provider activity
 */
import { useTranslation } from 'react-i18next';
import type { Provider } from '../../types';
import { OnlineIndicator } from '../ui';

interface ActivityItem {
  id: string;
  providerName: string;
  providerInitials: string;
  action: string;
  time: string;
  isOnline: boolean;
}

interface ActivityFeedProps {
  providers: Provider[];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function ActivityFeed({ providers }: ActivityFeedProps) {
  const { t } = useTranslation();

  function getRelativeTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return t('activity.time_now');
    if (minutes < 60) return t('activity.time_minutes', { count: minutes });
    if (hours < 24) return t('activity.time_hours', { count: hours });
    if (days < 7) return t('activity.time_days', { count: days });
    return date.toLocaleDateString();
  }

  // Generate activity items from providers
  const activities: ActivityItem[] = providers
    .filter((p) => p.lastOnlineAt)
    .sort((a, b) => {
      const dateA = a.lastOnlineAt instanceof Date ? a.lastOnlineAt : a.lastOnlineAt?.toDate?.() || new Date(0);
      const dateB = b.lastOnlineAt instanceof Date ? b.lastOnlineAt : b.lastOnlineAt?.toDate?.() || new Date(0);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 5)
    .map((p) => {
      const lastOnline = p.lastOnlineAt instanceof Date
        ? p.lastOnlineAt
        : p.lastOnlineAt?.toDate?.() || new Date();

      return {
        id: p.id,
        providerName: p.name,
        providerInitials: getInitials(p.name),
        action: p.isOnline ? t('activity.is_online') : t('activity.disconnected'),
        time: getRelativeTime(lastOnline),
        isOnline: p.isOnline,
      };
    });

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
        <p className="text-gray-500">{t('dashboard.no_activity')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="divide-y divide-gray-100">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="px-4 sm:px-6 py-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600">
                    {activity.providerInitials}
                  </span>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5">
                  <OnlineIndicator isOnline={activity.isOnline} />
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-900">
                  <span className="font-medium">{activity.providerName}</span>{' '}
                  {activity.action}
                </p>
              </div>
            </div>
            <span className="text-xs text-gray-500">{activity.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
