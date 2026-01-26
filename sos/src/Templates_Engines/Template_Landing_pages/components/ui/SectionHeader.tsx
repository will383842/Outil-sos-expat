/**
 * ============================================================================
 * SECTION HEADER - En-tête de section réutilisable
 * ============================================================================
 */

import React, { memo, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TrustBadge } from './TrustBadge';

export interface SectionHeaderProps {
  /** Badge au-dessus du titre */
  badge?: {
    icon: string;
    text: string;
    color?: 'primary' | 'success' | 'accent' | 'blue' | 'purple';
  };
  /** Titre de la section */
  title: string;
  /** Partie du titre en surbrillance (gradient) */
  titleHighlight?: string;
  /** Suffixe du titre (après le highlight) */
  titleSuffix?: string;
  /** Sous-titre / description */
  subtitle?: string;
  /** Thème (clair ou sombre) */
  theme?: 'light' | 'dark';
  /** Alignement */
  align?: 'left' | 'center';
  /** Classes additionnelles */
  className?: string;
  /** Contenu additionnel après le sous-titre */
  children?: ReactNode;
}

/**
 * En-tête de section avec badge, titre et sous-titre
 * Design aligné sur SOS Expat Home page
 *
 * @example
 * ```tsx
 * <SectionHeader
 *   badge={{ icon: "Shield", text: "100% Sécurisé", color: "success" }}
 *   title="Nos"
 *   titleHighlight="experts"
 *   titleSuffix="à votre service"
 *   subtitle="Des professionnels vérifiés dans 197 pays"
 *   theme="light"
 * />
 * ```
 */
export const SectionHeader = memo<SectionHeaderProps>(({
  badge,
  title,
  titleHighlight,
  titleSuffix,
  subtitle,
  theme = 'light',
  align = 'center',
  className,
  children,
}) => {
  const isDark = theme === 'dark';

  const highlightGradient = isDark
    ? 'from-red-500 via-orange-500 to-yellow-500'
    : 'from-red-600 to-orange-500';

  return (
    <div
      className={cn(
        'mb-12 sm:mb-16',
        align === 'center' && 'text-center',
        className
      )}
    >
      {/* Badge */}
      {badge && (
        <div className="mb-6">
          <TrustBadge
            icon={badge.icon}
            text={badge.text}
            color={badge.color || 'primary'}
            variant="outline"
            size="md"
          />
        </div>
      )}

      {/* Title */}
      <h2
        className={cn(
          'text-3xl sm:text-4xl lg:text-5xl font-black mb-4 leading-tight',
          isDark ? 'text-white' : 'text-gray-900'
        )}
      >
        {title}
        {titleHighlight && (
          <>
            {' '}
            <span className={`bg-gradient-to-r ${highlightGradient} bg-clip-text text-transparent`}>
              {titleHighlight}
            </span>
          </>
        )}
        {titleSuffix && (
          <>
            {' '}
            {titleSuffix}
          </>
        )}
      </h2>

      {/* Subtitle */}
      {subtitle && (
        <p
          className={cn(
            'text-lg sm:text-xl max-w-3xl',
            align === 'center' && 'mx-auto',
            isDark ? 'text-gray-300' : 'text-gray-600'
          )}
        >
          {subtitle}
        </p>
      )}

      {/* Additional content */}
      {children}
    </div>
  );
});

SectionHeader.displayName = 'SectionHeader';
