/**
 * ============================================================================
 * TRUST BADGE - Badge de confiance
 * ============================================================================
 */

import React, { memo } from 'react';
import { DynamicIcon } from './DynamicIcon';
import { cn } from '@/lib/utils';

export interface TrustBadgeProps {
  /** Icône à afficher */
  icon: string;
  /** Texte du badge */
  text: string;
  /** Couleur du badge */
  color?: 'primary' | 'success' | 'accent' | 'blue' | 'purple';
  /** Taille */
  size?: 'sm' | 'md' | 'lg';
  /** Variante de style */
  variant?: 'solid' | 'outline' | 'ghost';
  /** Classes CSS additionnelles */
  className?: string;
}

const colorMap = {
  primary: {
    solid: 'bg-gradient-to-r from-red-500 to-orange-500 text-white',
    outline: 'border-red-500/30 text-red-400 bg-red-500/10',
    ghost: 'text-red-400',
  },
  success: {
    solid: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white',
    outline: 'border-green-500/30 text-green-400 bg-green-500/10',
    ghost: 'text-green-400',
  },
  accent: {
    solid: 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white',
    outline: 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10',
    ghost: 'text-yellow-400',
  },
  blue: {
    solid: 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white',
    outline: 'border-blue-500/30 text-blue-400 bg-blue-500/10',
    ghost: 'text-blue-400',
  },
  purple: {
    solid: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
    outline: 'border-purple-500/30 text-purple-400 bg-purple-500/10',
    ghost: 'text-purple-400',
  },
};

const sizeMap = {
  sm: {
    container: 'px-3 py-1.5 text-xs gap-1.5',
    icon: 'w-3.5 h-3.5',
  },
  md: {
    container: 'px-4 py-2 text-sm gap-2',
    icon: 'w-4 h-4',
  },
  lg: {
    container: 'px-5 py-2.5 text-base gap-2.5',
    icon: 'w-5 h-5',
  },
};

/**
 * Badge de confiance avec icône
 *
 * @example
 * ```tsx
 * <TrustBadge icon="Shield" text="Paiement sécurisé" color="success" />
 * <TrustBadge icon="Clock" text="Réponse < 5 min" variant="outline" />
 * ```
 */
export const TrustBadge = memo<TrustBadgeProps>(({
  icon,
  text,
  color = 'primary',
  size = 'md',
  variant = 'outline',
  className,
}) => {
  const colorClasses = colorMap[color][variant];
  const sizeClasses = sizeMap[size];

  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold rounded-full backdrop-blur-sm',
        variant === 'outline' && 'border',
        colorClasses,
        sizeClasses.container,
        className
      )}
    >
      <DynamicIcon name={icon} className={sizeClasses.icon} aria-hidden="true" />
      <span>{text}</span>
    </span>
  );
});

TrustBadge.displayName = 'TrustBadge';
