/**
 * Activity Feed Component
 * Shows recent provider activity
 */
import type { Provider } from '../../types';
import { OnlineIndicator } from '../ui';

interface ActivityItem {
  id: string;
  providerName: string;
  providerInitials: string;
  action: string;
  time: string;
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

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  if (hours < 24) return `Il y a ${hours}h`;
  if (days < 7) return `Il y a ${days}j`;
  return date.toLocaleDateString('fr-FR');
}

export default function ActivityFeed({ providers }: ActivityFeedProps) {
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
        action: p.isOnline ? 'est en ligne' : 's\'est déconnecté',
        time: getRelativeTime(lastOnline),
      };
    });

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
        <p className="text-gray-500">Aucune activité récente</p>
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
                  <OnlineIndicator
                    isOnline={activity.action === 'est en ligne'}
                  />
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
