/**
 * ProviderBadge - Badge prestataire avec statut
 *
 * Affiche le nom, type et statut d'un prestataire
 */

import React from 'react';
import { Scale, Globe, Check, Phone, Wifi, WifiOff } from 'lucide-react';
import type { Provider } from '../../hooks/useMultiProviderDashboard';
import { cn } from '../../utils/cn';

interface ProviderBadgeProps {
  provider: Provider;
  showActive?: boolean;
  compact?: boolean;
}

const ProviderBadge: React.FC<ProviderBadgeProps> = ({
  provider,
  showActive = true,
  compact = false,
}) => {
  const isLawyer = provider.type === 'lawyer';

  const getStatusColor = () => {
    if (provider.availability === 'busy') return 'bg-red-500';
    if (provider.isOnline) return 'bg-green-500';
    return 'bg-gray-400';
  };

  const getStatusText = () => {
    if (provider.availability === 'busy') return 'Occupé';
    if (provider.isOnline) return 'En ligne';
    return 'Hors ligne';
  };

  // Compact version for sidebar
  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-colors",
          provider.isActive && showActive
            ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
            : "bg-white dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
        )}
      >
        {/* Provider Type Icon with Status */}
        <div className="relative flex-shrink-0">
          <div
            className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center",
              isLawyer
                ? "bg-purple-100 dark:bg-purple-900/30"
                : "bg-blue-100 dark:bg-blue-900/30"
            )}
          >
            {isLawyer ? (
              <Scale className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            ) : (
              <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            )}
          </div>
          <div
            className={cn(
              "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-700",
              getStatusColor()
            )}
            title={getStatusText()}
          />
        </div>

        {/* Provider Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-gray-900 dark:text-white truncate text-xs">
              {provider.name}
            </span>
            {provider.isActive && showActive && (
              <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
            <span className={cn(
              isLawyer ? "text-purple-600 dark:text-purple-400" : "text-blue-600 dark:text-blue-400"
            )}>
              {isLawyer ? 'Avocat' : 'Aidant'}
            </span>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span>{getStatusText()}</span>
          </div>
        </div>
      </div>
    );
  }

  // Full version (default)
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors",
        provider.isActive && showActive
          ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
          : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
      )}
    >
      {/* Provider Type Icon */}
      <div className="relative">
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center",
            isLawyer
              ? "bg-purple-100 dark:bg-purple-900/30"
              : "bg-blue-100 dark:bg-blue-900/30"
          )}
        >
          {isLawyer ? (
            <Scale className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          ) : (
            <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          )}
        </div>
        {/* Status Indicator */}
        <div
          className={cn(
            "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800",
            getStatusColor()
          )}
          title={getStatusText()}
        />
      </div>

      {/* Provider Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-white truncate text-sm">
            {provider.name}
          </span>
          {provider.isActive && showActive && (
            <span className="flex-shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded font-medium">
              <Check className="w-2.5 h-2.5" />
              Actif
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className={cn(
            "capitalize",
            isLawyer ? "text-purple-600 dark:text-purple-400" : "text-blue-600 dark:text-blue-400"
          )}>
            {isLawyer ? 'Avocat' : 'Aidant'}
          </span>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <span className="flex items-center gap-1">
            {provider.availability === 'busy' ? (
              <Phone className="w-3 h-3 text-red-500" />
            ) : provider.isOnline ? (
              <Wifi className="w-3 h-3 text-green-500" />
            ) : (
              <WifiOff className="w-3 h-3 text-gray-400" />
            )}
            {getStatusText()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProviderBadge;
