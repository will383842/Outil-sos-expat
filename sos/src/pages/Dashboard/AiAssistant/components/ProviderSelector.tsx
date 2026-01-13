/**
 * Provider Selector Component
 * Multi-provider support with notifications and quick access
 */

import React, { useState, useRef, useEffect } from 'react';
import { useIntl } from 'react-intl';
import {
  Users,
  Bell,
  ChevronDown,
  Scale,
  Check,
  AlertTriangle,
  MessageSquare,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { cn } from '../../../../utils/cn';
import { GlassCard } from './Card';

interface LinkedProvider {
  id: string;
  name: string;
  email?: string;
  type: 'lawyer' | 'expat';
  profilePhoto?: string;
  pendingRequests: number;
  unreadMessages: number;
  lastActivityAt?: Date;
  hasUrgentRequest?: boolean;
}

interface ProviderSelectorProps {
  providers: LinkedProvider[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onQuickAccess: (id: string) => void;
  loading?: boolean;
  isAccessingOutil?: boolean;
  hasNewActivity?: boolean;
}

export const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  providers,
  selectedId,
  onSelect,
  onQuickAccess,
  loading = false,
  isAccessingOutil = false,
  hasNewActivity = false,
}) => {
  const intl = useIntl();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedProvider = providers.find((p) => p.id === selectedId);
  const totalNotifications = providers.reduce(
    (sum, p) => sum + p.pendingRequests + p.unreadMessages,
    0
  );
  const hasUrgentProvider = providers.some((p) => p.hasUrgentRequest);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setIsOpen(false);
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  if (loading) {
    return (
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-gray-200/50 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
          <span className="text-gray-500 text-sm">Chargement des profils...</span>
        </div>
      </div>
    );
  }

  if (providers.length <= 1) return null;

  return (
    <GlassCard
      className={cn(
        'p-4 transition-all',
        hasNewActivity && 'ring-2 ring-red-400 animate-pulse',
        hasUrgentProvider && 'border-red-300 bg-red-50/30'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-500" />
          Profil actif
          {totalNotifications > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-bounce">
              <Bell className="w-3 h-3" />
              {totalNotifications}
            </span>
          )}
        </h3>
        <span className="text-xs text-gray-400">{providers.length} profils liés</span>
      </div>

      {/* Current Provider Selector */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          className={cn(
            'w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200',
            selectedProvider?.hasUrgentRequest
              ? 'bg-red-100 border-2 border-red-400 hover:bg-red-200'
              : (selectedProvider?.pendingRequests || 0) > 0
              ? 'bg-amber-50 border-2 border-amber-300 hover:bg-amber-100'
              : 'bg-indigo-50/80 border border-indigo-200 hover:bg-indigo-100'
          )}
        >
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <ProviderAvatar provider={selectedProvider} size="md" showBadge />
            {/* Info */}
            <div className="text-left">
              <div className="font-medium text-gray-900 flex items-center gap-2">
                {selectedProvider?.name || 'Sélectionner...'}
                {selectedProvider?.hasUrgentRequest && (
                  <AlertTriangle className="w-4 h-4 text-red-600 animate-pulse" />
                )}
              </div>
              <div className="text-xs text-gray-500 flex items-center gap-2">
                {selectedProvider?.type === 'lawyer' ? 'Avocat' : 'Expatrié aidant'}
                {(selectedProvider?.pendingRequests || 0) > 0 && (
                  <span className="text-amber-600 font-medium">
                    • {selectedProvider?.pendingRequests} en attente
                  </span>
                )}
              </div>
            </div>
          </div>
          <ChevronDown
            className={cn('w-5 h-5 text-gray-400 transition-transform duration-200', isOpen && 'rotate-180')}
          />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div
            role="listbox"
            className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden max-h-80 overflow-y-auto animate-fade-in-up"
          >
            {providers.map((provider) => {
              const notifCount = provider.pendingRequests + provider.unreadMessages;
              return (
                <button
                  key={provider.id}
                  role="option"
                  aria-selected={provider.id === selectedId}
                  onClick={() => {
                    onSelect(provider.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors border-l-4',
                    provider.id === selectedId && 'bg-indigo-50',
                    provider.hasUrgentRequest
                      ? 'border-l-red-500 bg-red-50 hover:bg-red-100'
                      : notifCount > 0
                      ? 'border-l-amber-400 bg-amber-50/50 hover:bg-amber-100/50'
                      : 'border-l-transparent'
                  )}
                >
                  <ProviderAvatar provider={provider} size="sm" showBadge />
                  <div className="text-left flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm flex items-center gap-1.5">
                      <span className="truncate">{provider.name}</span>
                      {provider.hasUrgentRequest && (
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600 animate-pulse flex-shrink-0" />
                      )}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <span>{provider.type === 'lawyer' ? 'Avocat' : 'Expatrié'}</span>
                      {provider.pendingRequests > 0 && (
                        <span className="text-amber-600 font-semibold flex items-center gap-0.5">
                          <Bell className="w-3 h-3" />
                          {provider.pendingRequests}
                        </span>
                      )}
                      {provider.unreadMessages > 0 && (
                        <span className="text-blue-600 font-semibold flex items-center gap-0.5">
                          <MessageSquare className="w-3 h-3" />
                          {provider.unreadMessages}
                        </span>
                      )}
                    </div>
                  </div>
                  {provider.id === selectedId ? (
                    <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                  ) : (
                    notifCount > 0 && (
                      <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full flex-shrink-0">
                        NOUVEAU
                      </span>
                    )
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Access Buttons */}
      <div className="mt-3 space-y-2">
        <div className="text-xs text-gray-500 font-medium">Accès rapide :</div>
        <div className="flex flex-wrap gap-2">
          {providers.map((provider) => {
            const notifCount = provider.pendingRequests + provider.unreadMessages;
            return (
              <button
                key={provider.id}
                onClick={() => onQuickAccess(provider.id)}
                disabled={isAccessingOutil}
                title={`Ouvrir l'outil IA en tant que ${provider.name}`}
                className={cn(
                  'relative flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all',
                  provider.hasUrgentRequest
                    ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse ring-2 ring-red-300'
                    : notifCount > 0
                    ? 'bg-amber-500 text-white hover:bg-amber-600 ring-2 ring-amber-200'
                    : provider.id === selectedId
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                  isAccessingOutil && 'opacity-50 cursor-not-allowed'
                )}
              >
                {provider.hasUrgentRequest && <AlertTriangle className="w-3 h-3" />}
                <ExternalLink className="w-3 h-3" />
                <span className="truncate max-w-[100px]">
                  {provider.name.length > 12 ? provider.name.slice(0, 12) + '...' : provider.name}
                </span>
                {notifCount > 0 && (
                  <span
                    className={cn(
                      'absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full',
                      provider.hasUrgentRequest
                        ? 'bg-white text-red-600'
                        : 'bg-white text-amber-600 border border-amber-400'
                    )}
                  >
                    {notifCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </GlassCard>
  );
};

// Provider Avatar sub-component
interface ProviderAvatarProps {
  provider?: LinkedProvider;
  size?: 'sm' | 'md' | 'lg';
  showBadge?: boolean;
}

const ProviderAvatar: React.FC<ProviderAvatarProps> = ({ provider, size = 'md', showBadge = false }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const badgeSizes = {
    sm: 'min-w-[16px] h-[16px] text-[9px] -top-1 -right-1',
    md: 'min-w-[18px] h-[18px] text-[10px] -top-1 -right-1',
    lg: 'min-w-[20px] h-[20px] text-[11px] -top-1 -right-1',
  };

  const totalNotifs = (provider?.pendingRequests || 0) + (provider?.unreadMessages || 0);

  return (
    <div className="relative flex-shrink-0">
      {provider?.profilePhoto ? (
        <img
          src={provider.profilePhoto}
          alt=""
          className={cn(
            sizeClasses[size],
            'rounded-full object-cover border-2',
            provider.hasUrgentRequest ? 'border-red-500' : 'border-indigo-300'
          )}
        />
      ) : (
        <div
          className={cn(
            sizeClasses[size],
            'rounded-full flex items-center justify-center border-2',
            provider?.type === 'lawyer' ? 'bg-blue-100 border-blue-300' : 'bg-green-100 border-green-300'
          )}
        >
          <Scale
            className={cn(iconSizes[size], provider?.type === 'lawyer' ? 'text-blue-600' : 'text-green-600')}
          />
        </div>
      )}
      {showBadge && totalNotifs > 0 && (
        <span
          className={cn(
            'absolute flex items-center justify-center font-bold text-white rounded-full px-1',
            badgeSizes[size],
            provider?.hasUrgentRequest ? 'bg-red-600 animate-pulse' : 'bg-red-500'
          )}
        >
          {totalNotifs > 99 ? '99+' : totalNotifs}
        </span>
      )}
    </div>
  );
};

export default ProviderSelector;
