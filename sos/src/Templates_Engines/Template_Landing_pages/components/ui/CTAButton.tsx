/**
 * ============================================================================
 * CTA BUTTON - Bouton d'appel à l'action
 * ============================================================================
 */

import React, { memo, forwardRef, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';

export interface CTAButtonProps {
  /** Texte du bouton */
  children: ReactNode;
  /** URL de destination */
  href: string;
  /** Style du bouton */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  /** Taille */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Icône à afficher */
  icon?: 'arrow' | 'phone' | 'none';
  /** Position de l'icône */
  iconPosition?: 'left' | 'right';
  /** Pleine largeur */
  fullWidth?: boolean;
  /** Classes additionnelles */
  className?: string;
  /** Lien externe */
  external?: boolean;
  /** Callback au clic */
  onClick?: () => void;
  /** Tracking event */
  trackingEvent?: string;
  /** Aria label */
  ariaLabel?: string;
  /** Désactivé */
  disabled?: boolean;
}

const variantStyles = {
  primary: 'bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white hover:from-red-700 hover:via-red-600 hover:to-orange-600 shadow-lg hover:shadow-xl hover:shadow-red-500/30',
  secondary: 'bg-white text-red-600 hover:bg-red-50 shadow-lg',
  outline: 'bg-transparent border-2 border-white text-white hover:bg-white/10',
  ghost: 'bg-white/10 text-white hover:bg-white/20 border border-white/20',
};

const sizeStyles = {
  sm: 'px-4 py-2 text-sm rounded-xl gap-2',
  md: 'px-6 py-3 text-base rounded-xl gap-2',
  lg: 'px-8 py-4 text-lg rounded-2xl gap-3',
  xl: 'px-10 py-5 text-xl rounded-3xl gap-4',
};

const iconSizes = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-7 h-7',
};

/**
 * Bouton CTA avec design premium SOS Expat
 *
 * @example
 * ```tsx
 * <CTAButton href="/sos-appel" variant="primary" size="lg" icon="phone">
 *   Appeler maintenant
 * </CTAButton>
 *
 * <CTAButton href="/register" variant="secondary" icon="arrow">
 *   Commencer gratuitement
 * </CTAButton>
 * ```
 */
export const CTAButton = memo(forwardRef<HTMLAnchorElement, CTAButtonProps>(({
  children,
  href,
  variant = 'primary',
  size = 'lg',
  icon = 'arrow',
  iconPosition = 'right',
  fullWidth = false,
  className,
  external = false,
  onClick,
  trackingEvent,
  ariaLabel,
  disabled = false,
}, ref) => {
  const { onTap } = useHapticFeedback();

  const handleClick = () => {
    // Haptic feedback
    onTap();

    // Analytics tracking
    if (trackingEvent && typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', trackingEvent, {
        event_category: 'CTA',
        event_label: typeof children === 'string' ? children : 'CTA Click',
      });
    }

    // Custom callback
    onClick?.();
  };

  const IconComponent = icon === 'phone' ? Phone : icon === 'arrow' ? ArrowRight : null;

  const buttonContent = (
    <>
      {IconComponent && iconPosition === 'left' && (
        <IconComponent
          className={cn(
            iconSizes[size],
            icon === 'phone' && 'animate-pulse',
            'transition-transform group-hover:scale-110'
          )}
          aria-hidden="true"
        />
      )}
      <span>{children}</span>
      {IconComponent && iconPosition === 'right' && (
        <IconComponent
          className={cn(
            iconSizes[size],
            icon === 'arrow' && 'group-hover:translate-x-1 transition-transform'
          )}
          aria-hidden="true"
        />
      )}
    </>
  );

  const buttonClasses = cn(
    'group inline-flex items-center justify-center font-bold',
    // Mobile: fast color transition + active feedback. Desktop: full transitions + hover scale
    'transition-colors duration-150 md:transition-all md:duration-200',
    'active:scale-[0.98] md:hover:scale-105',
    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500',
    'touch-manipulation select-none',
    variantStyles[variant],
    sizeStyles[size],
    fullWidth && 'w-full',
    disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
    className
  );

  // External link
  if (external) {
    return (
      <a
        ref={ref}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClasses}
        onClick={handleClick}
        aria-label={ariaLabel}
      >
        {buttonContent}
      </a>
    );
  }

  // Internal link
  return (
    <Link
      ref={ref as React.Ref<HTMLAnchorElement>}
      to={href}
      className={buttonClasses}
      onClick={handleClick}
      aria-label={ariaLabel}
    >
      {buttonContent}
    </Link>
  );
}));

CTAButton.displayName = 'CTAButton';
