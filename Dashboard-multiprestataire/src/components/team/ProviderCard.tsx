/**
 * Provider Card Component
 * Displays a single provider with status and quick actions
 */
import { Phone, Mail, MoreVertical } from 'lucide-react';
import { Card, StatusBadge, OnlineIndicator } from '../ui';
import type { Provider } from '../../types';

interface ProviderCardProps {
  provider: Provider;
  onEdit?: (provider: Provider) => void;
}

export default function ProviderCard({ provider, onEdit }: ProviderCardProps) {
  const initials = provider.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className="relative">
      <div className="flex items-start gap-4">
        {/* Avatar with online indicator */}
        <div className="relative flex-shrink-0">
          {provider.photoURL ? (
            <img
              src={provider.photoURL}
              alt={provider.name}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-primary-600">{initials}</span>
            </div>
          )}
          <div className="absolute -bottom-0.5 -right-0.5">
            <OnlineIndicator isOnline={provider.isOnline} />
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-gray-900 truncate">{provider.name}</h3>
            <span className="text-xs text-gray-500 capitalize">
              {provider.type === 'lawyer' ? 'Avocat' : 'Expat'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
            {provider.email && (
              <a
                href={`mailto:${provider.email}`}
                className="flex items-center gap-1 hover:text-primary-600 truncate"
              >
                <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{provider.email}</span>
              </a>
            )}
            {provider.phone && (
              <a
                href={`tel:${provider.phone}`}
                className="flex items-center gap-1 hover:text-primary-600"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{provider.phone}</span>
              </a>
            )}
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge status={provider.availability} />
            {!provider.isActive && (
              <StatusBadge status="inactive" />
            )}
          </div>
        </div>

        {/* Actions */}
        {onEdit && (
          <button
            onClick={() => onEdit(provider)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Stats row */}
      <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-lg font-semibold text-gray-900">
            {provider.totalCalls || 0}
          </p>
          <p className="text-xs text-gray-500">Appels</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-900">
            {provider.totalHoursOnline || 0}h
          </p>
          <p className="text-xs text-gray-500">En ligne</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-900">
            {provider.rating ? provider.rating.toFixed(1) : '-'}
          </p>
          <p className="text-xs text-gray-500">Note</p>
        </div>
      </div>
    </Card>
  );
}
