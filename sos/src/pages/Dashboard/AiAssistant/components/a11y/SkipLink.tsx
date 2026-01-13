/**
 * SkipLink Component
 * WCAG 2.1 AA Compliant Skip Navigation Link
 *
 * Skip links allow keyboard and screen reader users to bypass repetitive
 * navigation and jump directly to the main content or other landmarks.
 *
 * This is a Level A requirement under WCAG 2.1 Success Criterion 2.4.1 (Bypass Blocks).
 *
 * Features:
 * - Hidden until focused (keyboard users)
 * - High contrast focus state for visibility
 * - Smooth scroll to target
 * - Programmatic focus management
 * - Support for multiple skip targets
 *
 * @see https://www.w3.org/WAI/WCAG21/Understanding/bypass-blocks.html
 *
 * @example
 * ```tsx
 * // Basic usage
 * <SkipLink targetId="main-content">
 *   Skip to main content
 * </SkipLink>
 *
 * // Multiple skip links
 * <SkipLinkGroup>
 *   <SkipLink targetId="main-content">Skip to main content</SkipLink>
 *   <SkipLink targetId="search">Skip to search</SkipLink>
 *   <SkipLink targetId="footer">Skip to footer</SkipLink>
 * </SkipLinkGroup>
 *
 * // With custom styling
 * <SkipLink targetId="main" variant="dark">
 *   Skip to main content
 * </SkipLink>
 * ```
 */

import React, { useCallback, useRef } from 'react';
import { cn } from '../../../../../utils/cn';
import { NavigationKeys, useSkipLink } from '../../accessibility';

// ============================================================================
// TYPES
// ============================================================================

export interface SkipLinkProps {
  /**
   * ID of the target element to skip to
   */
  targetId: string;

  /**
   * Content of the skip link (usually text)
   */
  children: React.ReactNode;

  /**
   * Visual style variant
   * @default 'default'
   */
  variant?: 'default' | 'dark' | 'highContrast';

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Callback when skip link is activated
   */
  onSkip?: () => void;

  /**
   * Whether to use smooth scrolling
   * @default true
   */
  smoothScroll?: boolean;

  /**
   * Focus behavior after skipping
   * - 'target': Focus the target element (default)
   * - 'firstFocusable': Focus the first focusable element within target
   * @default 'target'
   */
  focusBehavior?: 'target' | 'firstFocusable';
}

export interface SkipLinkGroupProps {
  /**
   * Skip link components
   */
  children: React.ReactNode;

  /**
   * Position of the skip link group
   * @default 'top-left'
   */
  position?: 'top-left' | 'top-center' | 'top-right';

  /**
   * Additional CSS classes
   */
  className?: string;
}

// ============================================================================
// STYLES
// ============================================================================

/**
 * Base styles - visually hidden but accessible
 */
const baseStyles = [
  // Visually hidden by default
  'absolute',
  '-translate-y-full',
  'opacity-0',
  // Appear on focus
  'focus:translate-y-0',
  'focus:opacity-100',
  // Layout and spacing
  'z-[9999]',
  'px-4',
  'py-3',
  'text-sm',
  'font-semibold',
  // Transition for smooth appearance
  'transition-all',
  'duration-200',
  // Focus ring
  'focus:outline-none',
  'focus:ring-2',
  'focus:ring-offset-2',
  // Ensure clickability
  'cursor-pointer',
  // Prevent text selection
  'select-none',
].join(' ');

/**
 * Variant styles for different contexts
 */
const variantStyles = {
  default: [
    'bg-indigo-600',
    'text-white',
    'rounded-b-lg',
    'shadow-lg',
    'focus:ring-indigo-500',
    'hover:bg-indigo-700',
    'focus:bg-indigo-700',
  ].join(' '),

  dark: [
    'bg-gray-900',
    'text-white',
    'rounded-b-lg',
    'shadow-lg',
    'focus:ring-gray-500',
    'hover:bg-gray-800',
    'focus:bg-gray-800',
  ].join(' '),

  highContrast: [
    'bg-black',
    'text-yellow-300',
    'rounded-b-lg',
    'shadow-lg',
    'border-2',
    'border-yellow-300',
    'focus:ring-yellow-300',
    'hover:bg-gray-900',
    'focus:bg-gray-900',
  ].join(' '),
};

/**
 * Position styles for skip link group
 */
const positionStyles = {
  'top-left': 'left-4',
  'top-center': 'left-1/2 -translate-x-1/2',
  'top-right': 'right-4',
};

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * SkipLink Component
 *
 * A focusable link that allows keyboard users to skip repetitive content
 * and navigate directly to the main content area or other landmarks.
 *
 * The link is visually hidden until it receives keyboard focus, at which
 * point it becomes visible with high contrast styling.
 */
export const SkipLink: React.FC<SkipLinkProps> = ({
  targetId,
  children,
  variant = 'default',
  className,
  onSkip,
  smoothScroll = true,
  focusBehavior = 'target',
}) => {
  const linkRef = useRef<HTMLAnchorElement>(null);

  const handleSkip = useCallback(() => {
    const target = document.getElementById(targetId);
    if (!target) {
      console.warn(`[SkipLink] Target element with id "${targetId}" not found`);
      return;
    }

    // Scroll to target
    target.scrollIntoView({
      behavior: smoothScroll ? 'smooth' : 'auto',
      block: 'start',
    });

    // Handle focus
    if (focusBehavior === 'firstFocusable') {
      // Find first focusable element within target
      const focusableSelector = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled]):not([type="hidden"])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(', ');

      const firstFocusable = target.querySelector<HTMLElement>(focusableSelector);
      if (firstFocusable) {
        firstFocusable.focus();
      } else {
        // Fallback to target
        if (!target.hasAttribute('tabindex')) {
          target.setAttribute('tabindex', '-1');
        }
        target.focus();
      }
    } else {
      // Focus the target element directly
      if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1');
      }
      target.focus();
    }

    // Callback
    onSkip?.();
  }, [targetId, smoothScroll, focusBehavior, onSkip]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleSkip();
  }, [handleSkip]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === NavigationKeys.ENTER || e.key === NavigationKeys.SPACE) {
      e.preventDefault();
      handleSkip();
    }
  }, [handleSkip]);

  return (
    <a
      ref={linkRef}
      href={`#${targetId}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        baseStyles,
        variantStyles[variant],
        className
      )}
      role="link"
      aria-label={typeof children === 'string' ? children : `Skip to ${targetId}`}
    >
      {children}
    </a>
  );
};

/**
 * SkipLinkGroup Component
 *
 * Container for multiple skip links that appear in sequence.
 * Useful when there are multiple landmarks users might want to skip to.
 */
export const SkipLinkGroup: React.FC<SkipLinkGroupProps> = ({
  children,
  position = 'top-left',
  className,
}) => {
  return (
    <nav
      aria-label="Skip links"
      className={cn(
        'fixed top-0 z-[9999]',
        positionStyles[position],
        'flex flex-col gap-1',
        className
      )}
    >
      {children}
    </nav>
  );
};

// ============================================================================
// HOOKS
// ============================================================================

export interface UseSkipLinksOptions {
  /** Default target ID */
  defaultTargetId?: string;
  /** Callback when any skip link is activated */
  onSkip?: (targetId: string) => void;
}

/**
 * Hook for managing multiple skip links programmatically
 *
 * @example
 * ```tsx
 * const { skipTo, registerTarget } = useSkipLinks();
 *
 * // Register targets
 * registerTarget('main', mainContentRef);
 * registerTarget('search', searchRef);
 *
 * // Programmatic skip
 * skipTo('main');
 * ```
 */
export function useSkipLinks(options: UseSkipLinksOptions = {}) {
  const { onSkip } = options;
  const targetsRef = useRef<Map<string, HTMLElement>>(new Map());

  const registerTarget = useCallback((id: string, element: HTMLElement | React.RefObject<HTMLElement>) => {
    const el = 'current' in element ? element.current : element;
    if (el) {
      targetsRef.current.set(id, el);
      // Ensure the element has an ID
      if (!el.id) {
        el.id = id;
      }
    }
  }, []);

  const unregisterTarget = useCallback((id: string) => {
    targetsRef.current.delete(id);
  }, []);

  const skipTo = useCallback((targetId: string) => {
    const target = targetsRef.current.get(targetId) || document.getElementById(targetId);

    if (!target) {
      console.warn(`[useSkipLinks] Target "${targetId}" not found`);
      return false;
    }

    // Scroll to target
    target.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });

    // Focus target
    if (!target.hasAttribute('tabindex')) {
      target.setAttribute('tabindex', '-1');
    }
    target.focus();

    // Callback
    onSkip?.(targetId);

    return true;
  }, [onSkip]);

  const getTargetIds = useCallback(() => {
    return Array.from(targetsRef.current.keys());
  }, []);

  return {
    registerTarget,
    unregisterTarget,
    skipTo,
    getTargetIds,
  };
}

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

/**
 * Pre-configured skip link for main content
 */
export const SkipToMainContent: React.FC<Omit<SkipLinkProps, 'targetId' | 'children'> & {
  targetId?: string;
  children?: React.ReactNode;
}> = ({
  targetId = 'main-content',
  children = 'Skip to main content',
  ...props
}) => (
  <SkipLink targetId={targetId} {...props}>
    {children}
  </SkipLink>
);

/**
 * Pre-configured skip link for navigation
 */
export const SkipToNavigation: React.FC<Omit<SkipLinkProps, 'targetId' | 'children'> & {
  targetId?: string;
  children?: React.ReactNode;
}> = ({
  targetId = 'navigation',
  children = 'Skip to navigation',
  ...props
}) => (
  <SkipLink targetId={targetId} {...props}>
    {children}
  </SkipLink>
);

/**
 * Pre-configured skip link for search
 */
export const SkipToSearch: React.FC<Omit<SkipLinkProps, 'targetId' | 'children'> & {
  targetId?: string;
  children?: React.ReactNode;
}> = ({
  targetId = 'search',
  children = 'Skip to search',
  focusBehavior = 'firstFocusable',
  ...props
}) => (
  <SkipLink targetId={targetId} focusBehavior={focusBehavior} {...props}>
    {children}
  </SkipLink>
);

// ============================================================================
// STANDARD SKIP LINK SET
// ============================================================================

export interface StandardSkipLinksProps {
  /** Main content target ID */
  mainContentId?: string;
  /** Navigation target ID (optional) */
  navigationId?: string;
  /** Search target ID (optional) */
  searchId?: string;
  /** Additional custom skip links */
  additionalLinks?: Array<{
    targetId: string;
    label: string;
  }>;
  /** Variant for all skip links */
  variant?: SkipLinkProps['variant'];
  /** Language for labels */
  locale?: 'en' | 'fr' | 'es' | 'de';
}

const skipLinkLabels = {
  en: {
    main: 'Skip to main content',
    navigation: 'Skip to navigation',
    search: 'Skip to search',
  },
  fr: {
    main: 'Aller au contenu principal',
    navigation: 'Aller a la navigation',
    search: 'Aller a la recherche',
  },
  es: {
    main: 'Ir al contenido principal',
    navigation: 'Ir a la navegacion',
    search: 'Ir a la busqueda',
  },
  de: {
    main: 'Zum Hauptinhalt springen',
    navigation: 'Zur Navigation springen',
    search: 'Zur Suche springen',
  },
};

/**
 * StandardSkipLinks Component
 *
 * A pre-configured set of skip links for common page landmarks.
 * Includes main content, navigation, and search with localized labels.
 */
export const StandardSkipLinks: React.FC<StandardSkipLinksProps> = ({
  mainContentId = 'main-content',
  navigationId,
  searchId,
  additionalLinks = [],
  variant = 'default',
  locale = 'en',
}) => {
  const labels = skipLinkLabels[locale];

  return (
    <SkipLinkGroup>
      <SkipLink targetId={mainContentId} variant={variant}>
        {labels.main}
      </SkipLink>

      {navigationId && (
        <SkipLink targetId={navigationId} variant={variant}>
          {labels.navigation}
        </SkipLink>
      )}

      {searchId && (
        <SkipLink targetId={searchId} variant={variant} focusBehavior="firstFocusable">
          {labels.search}
        </SkipLink>
      )}

      {additionalLinks.map((link) => (
        <SkipLink key={link.targetId} targetId={link.targetId} variant={variant}>
          {link.label}
        </SkipLink>
      ))}
    </SkipLinkGroup>
  );
};

// ============================================================================
// RE-EXPORT HOOK FROM ACCESSIBILITY
// ============================================================================

export { useSkipLink };

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default SkipLink;
