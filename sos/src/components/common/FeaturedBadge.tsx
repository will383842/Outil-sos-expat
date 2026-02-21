import React from 'react';
import { useIntl } from 'react-intl';

interface FeaturedBadgeProps {
  isFeatured?: boolean;
  /** 'sm' = carte prestataire (32px), 'md' = page profil (52px) */
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Badge "Recommandé" officiel SOS-Expat.
 * N'affiche rien si isFeatured !== true.
 */
export default function FeaturedBadge({ isFeatured, size = 'sm', className = '' }: FeaturedBadgeProps) {
  const intl = useIntl();

  if (!isFeatured) return null;

  const label = intl.formatMessage({
    id: 'provider.featured',
    defaultMessage: 'Recommandé',
  });

  const sizeClass = size === 'sm' ? 'w-8 h-8' : 'w-13 h-13';

  return (
    <img
      src="/badges/featured-badge.png"
      alt={label}
      title={label}
      aria-label={label}
      className={`${sizeClass} rounded-full object-cover drop-shadow-md ${className}`}
      style={size === 'md' ? { width: 52, height: 52 } : { width: 32, height: 32 }}
    />
  );
}
