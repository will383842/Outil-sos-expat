/**
 * Status Badge Component
 */
import type { AvailabilityStatus } from '../../types';

interface StatusBadgeProps {
  status: AvailabilityStatus | 'active' | 'inactive' | 'compliant' | 'non-compliant';
  size?: 'sm' | 'md';
  showDot?: boolean;
}

const statusConfig = {
  available: {
    label: 'Disponible',
    bg: 'bg-green-100',
    text: 'text-green-700',
    dot: 'bg-green-500',
  },
  busy: {
    label: 'Occupé',
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    dot: 'bg-yellow-500',
  },
  offline: {
    label: 'Hors ligne',
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    dot: 'bg-gray-400',
  },
  active: {
    label: 'Actif',
    bg: 'bg-green-100',
    text: 'text-green-700',
    dot: 'bg-green-500',
  },
  inactive: {
    label: 'Inactif',
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    dot: 'bg-gray-400',
  },
  compliant: {
    label: 'Conforme',
    bg: 'bg-green-100',
    text: 'text-green-700',
    dot: 'bg-green-500',
  },
  'non-compliant': {
    label: 'Non conforme',
    bg: 'bg-red-100',
    text: 'text-red-700',
    dot: 'bg-red-500',
  },
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
};

export default function StatusBadge({ status, size = 'md', showDot = true }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full ${config.bg} ${config.text} ${sizeClasses[size]}`}
    >
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      )}
      {config.label}
    </span>
  );
}

/**
 * Online indicator dot
 */
export function OnlineIndicator({ isOnline }: { isOnline: boolean }) {
  return (
    <span
      className={`w-3 h-3 rounded-full border-2 border-white ${
        isOnline ? 'bg-green-500' : 'bg-gray-400'
      }`}
      title={isOnline ? 'En ligne' : 'Hors ligne'}
    />
  );
}
