/**
 * RefreshButton - Bouton d'actualisation manuel pour les pages admin
 *
 * OBJECTIF ÉCONOMIES: Remplacer les setInterval automatiques par un bouton manuel
 * pour réduire drastiquement les lectures Firestore (jusqu'à -96% de coûts)
 *
 * Avant: setInterval 30s = 2,880 requêtes/jour par page
 * Après: Bouton manuel = ~50-100 requêtes/jour par page
 */

import React, { useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { useIntl } from 'react-intl';
import { cn } from '../../utils/cn';

interface RefreshButtonProps {
  /** Fonction async appelée lors du clic */
  onRefresh: () => Promise<void>;
  /** Date de la dernière actualisation */
  lastRefreshTime?: Date | null;
  /** Afficher le timestamp de dernière actualisation */
  showLastRefresh?: boolean;
  /** Texte personnalisé du bouton */
  label?: string;
  /** Taille du bouton */
  size?: 'sm' | 'md' | 'lg';
  /** Variante du bouton */
  variant?: 'primary' | 'secondary' | 'ghost';
  /** Classes CSS additionnelles */
  className?: string;
  /** Désactiver le bouton */
  disabled?: boolean;
}

/**
 * Bouton d'actualisation manuel avec indicateur de chargement
 * et affichage optionnel de la dernière mise à jour
 */
export const RefreshButton: React.FC<RefreshButtonProps> = ({
  onRefresh,
  lastRefreshTime,
  showLastRefresh = true,
  label,
  size = 'md',
  variant = 'secondary',
  className,
  disabled = false,
}) => {
  const intl = useIntl();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing || disabled) return;

    setIsRefreshing(true);
    try {
      await onRefresh();
    } catch (error) {
      console.error('[RefreshButton] Erreur lors de l\'actualisation:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh, isRefreshing, disabled]);

  const formatLastRefresh = useCallback((date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffSecs < 10) return intl.formatMessage({ id: 'admin.refresh.justNow', defaultMessage: 'À l\'instant' });
    if (diffSecs < 60) return intl.formatMessage({ id: 'admin.refresh.secondsAgo', defaultMessage: 'Il y a {seconds}s' }, { seconds: diffSecs });
    if (diffMins < 60) return intl.formatMessage({ id: 'admin.refresh.minutesAgo', defaultMessage: 'Il y a {minutes} min' }, { minutes: diffMins });
    if (diffHours < 24) return intl.formatMessage({ id: 'admin.refresh.hoursAgo', defaultMessage: 'Il y a {hours}h' }, { hours: diffHours });

    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }, [intl]);

  // Tailles
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-2',
    lg: 'px-4 py-2 text-base gap-2',
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 18,
  };

  // Variantes
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white border-transparent',
    secondary: 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200 dark:border-gray-600',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-600 border-transparent dark:hover:bg-gray-800 dark:text-gray-400',
  };

  const buttonLabel = label || intl.formatMessage({ id: 'admin.refresh.button', defaultMessage: 'Actualiser' });

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <button
        onClick={handleRefresh}
        disabled={isRefreshing || disabled}
        className={cn(
          'inline-flex items-center justify-center rounded-md border font-medium transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          sizeClasses[size],
          variantClasses[variant]
        )}
        title={buttonLabel}
      >
        <RefreshCw
          size={iconSizes[size]}
          className={cn(
            'transition-transform',
            isRefreshing && 'animate-spin'
          )}
        />
        <span>{buttonLabel}</span>
      </button>

      {showLastRefresh && lastRefreshTime && (
        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {intl.formatMessage({ id: 'admin.refresh.lastUpdate', defaultMessage: 'Mis à jour:' })}{' '}
          {formatLastRefresh(lastRefreshTime)}
        </span>
      )}
    </div>
  );
};

export default RefreshButton;
