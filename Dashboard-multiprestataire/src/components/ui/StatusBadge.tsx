/**
 * Status Badge Component
 */
import { useTranslation } from 'react-i18next';
import type { AvailabilityStatus } from '../../types';

interface StatusBadgeProps {
  status: AvailabilityStatus | 'active' | 'inactive' | 'compliant' | 'non-compliant';
  size?: 'sm' | 'md';
  showDot?: boolean;
}

const statusConfig = {
  available: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    dot: 'bg-green-500',
  },
  busy: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    dot: 'bg-yellow-500',
  },
  offline: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    dot: 'bg-gray-400',
  },
  active: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    dot: 'bg-green-500',
  },
  inactive: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    dot: 'bg-gray-400',
  },
  compliant: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    dot: 'bg-green-500',
  },
  'non-compliant': {
    bg: 'bg-red-100',
    text: 'text-red-700',
    dot: 'bg-red-500',
  },
};

const statusLabelKeys: Record<string, string> = {
  available: 'status_badge.available',
  busy: 'status_badge.busy',
  offline: 'status_badge.offline',
  active: 'status_badge.active',
  inactive: 'status_badge.inactive',
  compliant: 'status_badge.compliant',
  'non-compliant': 'status_badge.non_compliant',
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
};

export default function StatusBadge({ status, size = 'md', showDot = true }: StatusBadgeProps) {
  const { t } = useTranslation();
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full ${config.bg} ${config.text} ${sizeClasses[size]}`}
    >
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      )}
      {t(statusLabelKeys[status])}
    </span>
  );
}

/**
 * Online indicator dot
 */
export function OnlineIndicator({ isOnline }: { isOnline: boolean }) {
  const { t } = useTranslation();
  return (
    <span
      className={`w-3 h-3 rounded-full border-2 border-white ${
        isOnline ? 'bg-green-500' : 'bg-gray-400'
      }`}
      title={isOnline ? t('status_badge.online_title') : t('status_badge.offline_title')}
    />
  );
}
