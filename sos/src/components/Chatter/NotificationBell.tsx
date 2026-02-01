/**
 * NotificationBell - Notification dropdown for chatter dashboard
 *
 * Features:
 * - Bell icon with red badge showing unread count
 * - Dropdown on click showing recent notifications
 * - Mark as read functionality (individual and all)
 * - Different icons/colors for notification types
 * - Time ago format for timestamps
 * - Empty state when no notifications
 * - Dark mode support, mobile responsive
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocaleNavigate } from '@/multilingual-system';
import {
  Bell,
  DollarSign,
  Award,
  Users,
  AlertCircle,
  Video,
  CheckCheck,
  X,
  ChevronRight,
} from 'lucide-react';
import type { ChatterNotification } from '@/types/chatter';

// ============================================================================
// TYPES
// ============================================================================

export type NotificationType = 'commission' | 'achievement' | 'team' | 'system' | 'zoom';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date | string;
  actionUrl?: string;
}

interface NotificationBellProps {
  notifications: ChatterNotification[];
  unreadCount: number;
  onMarkAsRead: (notificationId: string) => Promise<void>;
  onMarkAllAsRead: () => Promise<void>;
  maxDisplayed?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const NOTIFICATION_CONFIG: Record<NotificationType, {
  icon: typeof DollarSign;
  bgColor: string;
  iconColor: string;
  darkBgColor: string;
  darkIconColor: string;
}> = {
  commission: {
    icon: DollarSign,
    bgColor: 'bg-green-100',
    iconColor: 'text-green-600',
    darkBgColor: 'dark:bg-green-900/30',
    darkIconColor: 'dark:text-green-400',
  },
  achievement: {
    icon: Award,
    bgColor: 'bg-amber-100',
    iconColor: 'text-amber-600',
    darkBgColor: 'dark:bg-amber-900/30',
    darkIconColor: 'dark:text-amber-400',
  },
  team: {
    icon: Users,
    bgColor: 'bg-purple-100',
    iconColor: 'text-purple-600',
    darkBgColor: 'dark:bg-purple-900/30',
    darkIconColor: 'dark:text-purple-400',
  },
  system: {
    icon: AlertCircle,
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-600',
    darkBgColor: 'dark:bg-blue-900/30',
    darkIconColor: 'dark:text-blue-400',
  },
  zoom: {
    icon: Video,
    bgColor: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    darkBgColor: 'dark:bg-indigo-900/30',
    darkIconColor: 'dark:text-indigo-400',
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format time difference for "time ago" display
 */
function formatTimeAgo(timestamp: Date | string, locale: string): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  const isFrench = locale.startsWith('fr');

  if (diffSeconds < 60) {
    return isFrench ? "a l'instant" : 'just now';
  }
  if (diffMinutes === 1) {
    return isFrench ? 'il y a 1 min' : '1 min ago';
  }
  if (diffMinutes < 60) {
    return isFrench ? `il y a ${diffMinutes} min` : `${diffMinutes} min ago`;
  }
  if (diffHours === 1) {
    return isFrench ? 'il y a 1 h' : '1 hour ago';
  }
  if (diffHours < 24) {
    return isFrench ? `il y a ${diffHours} h` : `${diffHours} hours ago`;
  }
  if (diffDays === 1) {
    return isFrench ? 'hier' : 'yesterday';
  }
  if (diffDays < 7) {
    return isFrench ? `il y a ${diffDays} j` : `${diffDays} days ago`;
  }

  // More than a week ago, show formatted date
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

/**
 * Map ChatterNotification type to NotificationType
 */
function mapNotificationType(type: string): NotificationType {
  const typeMap: Record<string, NotificationType> = {
    commission: 'commission',
    commission_available: 'commission',
    commission_paid: 'commission',
    achievement: 'achievement',
    badge_earned: 'achievement',
    level_up: 'achievement',
    team: 'team',
    team_member_joined: 'team',
    team_milestone: 'team',
    recruitment: 'team',
    system: 'system',
    announcement: 'system',
    zoom: 'zoom',
    zoom_reminder: 'zoom',
    zoom_bonus: 'zoom',
  };
  return typeMap[type] || 'system';
}

// ============================================================================
// NOTIFICATION ITEM COMPONENT
// ============================================================================

interface NotificationItemProps {
  notification: ChatterNotification;
  onMarkAsRead: (id: string) => void;
  onNavigate: (url: string) => void;
  locale: string;
}

const NotificationItemComponent: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onNavigate,
  locale,
}) => {
  const notificationType = mapNotificationType(notification.type);
  const config = NOTIFICATION_CONFIG[notificationType];
  const IconComponent = config.icon;

  const handleClick = () => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }
    if (notification.actionUrl) {
      onNavigate(notification.actionUrl);
    }
  };

  return (
    <div
      className={`
        flex items-start gap-3 p-3 cursor-pointer transition-colors
        ${notification.isRead
          ? 'bg-transparent hover:bg-gray-50 dark:hover:bg-white/5'
          : 'bg-red-50/50 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20'
        }
      `}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Icon */}
      <div
        className={`
          flex-shrink-0 p-2 rounded-full
          ${config.bgColor} ${config.darkBgColor}
        `}
      >
        <IconComponent
          className={`w-4 h-4 ${config.iconColor} ${config.darkIconColor}`}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={`
              text-sm font-medium truncate
              ${notification.isRead
                ? 'text-gray-700 dark:text-gray-300'
                : 'text-gray-900 dark:text-white'
              }
            `}
          >
            {notification.title}
          </p>
          {!notification.isRead && (
            <span className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-red-500" />
          )}
        </div>
        <p
          className={`
            text-xs mt-0.5 line-clamp-2
            ${notification.isRead
              ? 'text-gray-500 dark:text-gray-400'
              : 'text-gray-600 dark:text-gray-300'
            }
          `}
        >
          {notification.message}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {formatTimeAgo(notification.createdAt, locale)}
        </p>
      </div>

      {/* Action indicator */}
      {notification.actionUrl && (
        <ChevronRight className="flex-shrink-0 w-4 h-4 text-gray-400 dark:text-gray-500 mt-1" />
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const NotificationBell: React.FC<NotificationBellProps> = ({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  maxDisplayed = 10,
}) => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    try {
      await onMarkAsRead(notificationId);
    } catch (error) {
      console.error('[NotificationBell] Error marking notification as read:', error);
    }
  }, [onMarkAsRead]);

  const handleMarkAllAsRead = useCallback(async () => {
    if (isMarkingAllRead || unreadCount === 0) return;

    setIsMarkingAllRead(true);
    try {
      await onMarkAllAsRead();
    } catch (error) {
      console.error('[NotificationBell] Error marking all as read:', error);
    } finally {
      setIsMarkingAllRead(false);
    }
  }, [onMarkAllAsRead, isMarkingAllRead, unreadCount]);

  const handleNavigate = useCallback((url: string) => {
    setIsOpen(false);
    // Handle both relative and absolute URLs
    if (url.startsWith('http')) {
      window.open(url, '_blank');
    } else {
      navigate(url);
    }
  }, [navigate]);

  const displayedNotifications = notifications.slice(0, maxDisplayed);

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          relative p-2 rounded-xl transition-all duration-200
          hover:bg-gray-100 dark:hover:bg-white/10
          focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
          dark:focus:ring-offset-gray-900
          ${isOpen ? 'bg-gray-100 dark:bg-white/10' : ''}
        `}
        aria-label={intl.formatMessage(
          { id: 'chatter.notifications.bell.label', defaultMessage: '{count} notifications non lues' },
          { count: unreadCount }
        )}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span
            className={`
              absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1
              flex items-center justify-center
              text-[10px] font-bold text-white
              bg-red-500 rounded-full
              animate-pulse
            `}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className={`
            absolute right-0 mt-2 z-50
            w-80 sm:w-96 max-h-[70vh]
            bg-white dark:bg-gray-900
            border border-gray-200 dark:border-white/10
            rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/50
            overflow-hidden
            animate-fade-in-up
          `}
          style={{ animationDuration: '150ms' }}
          role="menu"
          aria-orientation="vertical"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <FormattedMessage id="chatter.notifications.title" defaultMessage="Notifications" />
              {unreadCount > 0 && (
                <span className="text-xs font-medium text-red-500">({unreadCount})</span>
              )}
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={isMarkingAllRead}
                  className={`
                    flex items-center gap-1 px-2 py-1 text-xs font-medium
                    text-red-600 dark:text-red-400
                    hover:bg-red-50 dark:hover:bg-red-900/20
                    rounded-lg transition-colors
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <FormattedMessage id="chatter.notifications.markAllRead" defaultMessage="Tout lire" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                aria-label={intl.formatMessage({ id: 'common.close', defaultMessage: 'Fermer' })}
              >
                <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-[50vh] overflow-y-auto">
            {displayedNotifications.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                  <Bell className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  <FormattedMessage
                    id="chatter.notifications.empty"
                    defaultMessage="Aucune notification"
                  />
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  <FormattedMessage
                    id="chatter.notifications.emptyHint"
                    defaultMessage="Les nouvelles notifications apparaitront ici"
                  />
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-white/5">
                {displayedNotifications.map((notification) => (
                  <NotificationItemComponent
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={handleMarkAsRead}
                    onNavigate={handleNavigate}
                    locale={intl.locale}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer - Show when there are more notifications */}
          {notifications.length > maxDisplayed && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
              <button
                onClick={() => {
                  setIsOpen(false);
                  // Navigate to notifications page if one exists
                  // navigate('/chatter/notifications');
                }}
                className="w-full text-center text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
              >
                <FormattedMessage
                  id="chatter.notifications.viewAll"
                  defaultMessage="Voir toutes les notifications ({count})"
                  values={{ count: notifications.length }}
                />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
