/**
 * AI Assistant Accessibility Utilities
 * WCAG 2.1 AA Compliant Accessibility Helpers
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
  'audio[controls]',
  'video[controls]',
  'details > summary:first-of-type',
].join(', ');

export const NavigationKeys = {
  TAB: 'Tab',
  ESCAPE: 'Escape',
  ENTER: 'Enter',
  SPACE: ' ',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
} as const;

export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
  return Array.from(elements).filter(
    (el) => !el.hasAttribute('disabled') && el.offsetParent !== null
  );
}

export interface FocusTrapOptions {
  onEscape?: () => void;
  initialFocus?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement> | string;
  restoreFocus?: boolean;
  restoreFocusRef?: React.RefObject<HTMLElement>;
  loop?: boolean;
}

export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement>,
  isActive: boolean,
  options: FocusTrapOptions = {}
): void {
  const {
    onEscape,
    initialFocus = true,
    initialFocusRef,
    restoreFocus = true,
    restoreFocusRef,
    loop = true,
  } = options;

  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    previouslyFocusedElement.current = document.activeElement as HTMLElement;

    const container = containerRef.current;

    if (initialFocus) {
      requestAnimationFrame(() => {
        if (initialFocusRef) {
          if (typeof initialFocusRef === 'string') {
            const element = container.querySelector<HTMLElement>(initialFocusRef);
            element?.focus();
          } else if (initialFocusRef.current) {
            initialFocusRef.current.focus();
          }
        } else {
          const focusableElements = getFocusableElements(container);
          if (focusableElements.length > 0) {
            focusableElements[0].focus();
          }
        }
      });
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === NavigationKeys.ESCAPE && onEscape) {
        event.preventDefault();
        event.stopPropagation();
        onEscape();
        return;
      }

      if (event.key === NavigationKeys.TAB && loop) {
        const focusableElements = getFocusableElements(container);
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);

      if (restoreFocus) {
        const elementToRestore = restoreFocusRef?.current || previouslyFocusedElement.current;
        if (elementToRestore && document.body.contains(elementToRestore)) {
          elementToRestore.focus();
        }
      }
    };
  }, [isActive, containerRef, onEscape, initialFocus, initialFocusRef, restoreFocus, restoreFocusRef, loop]);
}

export function useFocusRestore(): () => void {
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previouslyFocusedElement.current = document.activeElement as HTMLElement;
  }, []);

  return useCallback(() => {
    if (previouslyFocusedElement.current && document.body.contains(previouslyFocusedElement.current)) {
      previouslyFocusedElement.current.focus();
    }
  }, []);
}

export function useSkipLink(targetId: string) {
  const skipTo = useCallback(() => {
    const target = document.getElementById(targetId);
    if (target) {
      if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1');
      }
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [targetId]);

  const skipLinkProps = {
    href: `#${targetId}`,
    onClick: (e: React.MouseEvent) => {
      e.preventDefault();
      skipTo();
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === NavigationKeys.ENTER || e.key === NavigationKeys.SPACE) {
        e.preventDefault();
        skipTo();
      }
    },
  };

  return { skipLinkProps, skipTo };
}

export type AriaLivePoliteness = 'polite' | 'assertive' | 'off';
export type AnnouncementType = 'status' | 'alert' | 'log' | 'progress' | 'timer';

function createLiveRegion(id: string, politeness: AriaLivePoliteness): HTMLElement {
  let region = document.getElementById(id);

  if (!region) {
    region = document.createElement('div');
    region.id = id;
    region.setAttribute('aria-live', politeness);
    region.setAttribute('aria-atomic', 'true');
    region.setAttribute('role', politeness === 'assertive' ? 'alert' : 'status');
    region.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `;
    document.body.appendChild(region);
  }

  return region;
}

export function announce(message: string, politeness: AriaLivePoliteness = 'polite'): void {
  const regionId = `ai-assistant-live-region-${politeness}`;
  const region = createLiveRegion(regionId, politeness);

  region.textContent = '';

  requestAnimationFrame(() => {
    region.textContent = message;
  });
}

export function useAnnouncer() {
  const announceStatus = useCallback((message: string) => {
    announce(message, 'polite');
  }, []);

  const announceError = useCallback((message: string) => {
    announce(message, 'assertive');
  }, []);

  const announceLoading = useCallback((message: string) => {
    announce(message, 'polite');
  }, []);

  const announceComplete = useCallback((message: string) => {
    announce(message, 'polite');
  }, []);

  const clearAnnouncements = useCallback(() => {
    const regions = ['polite', 'assertive'].map(
      (p) => document.getElementById(`ai-assistant-live-region-${p}`)
    );
    regions.forEach((region) => {
      if (region) region.textContent = '';
    });
  }, []);

  return {
    announce,
    announceStatus,
    announceError,
    announceLoading,
    announceComplete,
    clearAnnouncements,
  };
}

export function useLoadingAnnouncement(
  isLoading: boolean,
  loadingMessage: string,
  completeMessage?: string
): void {
  const wasLoading = useRef(false);

  useEffect(() => {
    if (isLoading && !wasLoading.current) {
      announce(loadingMessage, 'polite');
    } else if (!isLoading && wasLoading.current && completeMessage) {
      announce(completeMessage, 'polite');
    }

    wasLoading.current = isLoading;
  }, [isLoading, loadingMessage, completeMessage]);
}

export interface ListNavigationOptions {
  loop?: boolean;
  orientation?: 'vertical' | 'horizontal' | 'both';
  onSelect?: (index: number) => void;
  onNavigate?: (index: number) => void;
  typeAhead?: boolean;
}

export function useListNavigation(
  itemCount: number,
  options: ListNavigationOptions = {}
) {
  const {
    loop = true,
    orientation = 'vertical',
    onSelect,
    onNavigate,
    typeAhead = false,
  } = options;

  const [focusedIndex, setFocusedIndex] = useState(0);
  const typeAheadBuffer = useRef('');
  const typeAheadTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (focusedIndex >= itemCount && itemCount > 0) {
      setFocusedIndex(itemCount - 1);
    }
  }, [itemCount, focusedIndex]);

  const navigateToIndex = useCallback(
    (newIndex: number) => {
      let targetIndex = newIndex;

      if (loop) {
        if (targetIndex < 0) targetIndex = itemCount - 1;
        if (targetIndex >= itemCount) targetIndex = 0;
      } else {
        targetIndex = Math.max(0, Math.min(itemCount - 1, targetIndex));
      }

      setFocusedIndex(targetIndex);
      onNavigate?.(targetIndex);
    },
    [itemCount, loop, onNavigate]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, items?: { label?: string }[]) => {
      const { key } = event;
      let handled = false;

      switch (key) {
        case NavigationKeys.ARROW_UP:
          if (orientation === 'vertical' || orientation === 'both') {
            navigateToIndex(focusedIndex - 1);
            handled = true;
          }
          break;

        case NavigationKeys.ARROW_DOWN:
          if (orientation === 'vertical' || orientation === 'both') {
            navigateToIndex(focusedIndex + 1);
            handled = true;
          }
          break;

        case NavigationKeys.ARROW_LEFT:
          if (orientation === 'horizontal' || orientation === 'both') {
            navigateToIndex(focusedIndex - 1);
            handled = true;
          }
          break;

        case NavigationKeys.ARROW_RIGHT:
          if (orientation === 'horizontal' || orientation === 'both') {
            navigateToIndex(focusedIndex + 1);
            handled = true;
          }
          break;

        case NavigationKeys.HOME:
          navigateToIndex(0);
          handled = true;
          break;

        case NavigationKeys.END:
          navigateToIndex(itemCount - 1);
          handled = true;
          break;

        case NavigationKeys.ENTER:
        case NavigationKeys.SPACE:
          onSelect?.(focusedIndex);
          handled = true;
          break;

        default:
          if (typeAhead && items && key.length === 1) {
            if (typeAheadTimeout.current) {
              clearTimeout(typeAheadTimeout.current);
            }
            typeAheadBuffer.current += key.toLowerCase();

            const matchIndex = items.findIndex((item) =>
              item.label?.toLowerCase().startsWith(typeAheadBuffer.current)
            );

            if (matchIndex !== -1) {
              navigateToIndex(matchIndex);
            }

            typeAheadTimeout.current = setTimeout(() => {
              typeAheadBuffer.current = '';
            }, 500);

            handled = true;
          }
      }

      if (handled) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    [focusedIndex, itemCount, navigateToIndex, onSelect, orientation, typeAhead]
  );

  useEffect(() => {
    return () => {
      if (typeAheadTimeout.current) {
        clearTimeout(typeAheadTimeout.current);
      }
    };
  }, []);

  return {
    focusedIndex,
    setFocusedIndex,
    handleKeyDown,
    navigateToIndex,
  };
}

export function useRovingTabIndex(
  itemRefs: React.MutableRefObject<(HTMLElement | null)[]>,
  focusedIndex: number
): void {
  useEffect(() => {
    itemRefs.current.forEach((ref, index) => {
      if (ref) {
        ref.tabIndex = index === focusedIndex ? 0 : -1;
        if (index === focusedIndex && document.activeElement !== ref) {
          const parent = ref.closest('[data-keyboard-nav]');
          if (parent?.contains(document.activeElement)) {
            ref.focus();
          }
        }
      }
    });
  }, [focusedIndex, itemRefs]);
}

export function getModalAriaProps(options: {
  labelledBy?: string;
  describedBy?: string;
  isOpen: boolean;
}) {
  return {
    role: 'dialog' as const,
    'aria-modal': true,
    'aria-labelledby': options.labelledBy,
    'aria-describedby': options.describedBy,
    'aria-hidden': !options.isOpen,
  };
}

export function getPopupTriggerAriaProps(options: {
  isOpen: boolean;
  popupId: string;
  popupType?: 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
}) {
  return {
    'aria-haspopup': options.popupType || true,
    'aria-expanded': options.isOpen,
    'aria-controls': options.isOpen ? options.popupId : undefined,
  };
}

export function getMenuAriaProps(options: {
  labelledBy?: string;
  label?: string;
  orientation?: 'horizontal' | 'vertical';
}) {
  return {
    role: 'menu' as const,
    'aria-labelledby': options.labelledBy,
    'aria-label': options.label,
    'aria-orientation': options.orientation,
  };
}

export function getMenuItemAriaProps(options: {
  isSelected?: boolean;
  isDisabled?: boolean;
  hasSubmenu?: boolean;
}) {
  return {
    role: 'menuitem' as const,
    'aria-selected': options.isSelected,
    'aria-disabled': options.isDisabled,
    'aria-haspopup': options.hasSubmenu || undefined,
  };
}

export function getLiveRegionAriaProps(options: {
  politeness?: AriaLivePoliteness;
  atomic?: boolean;
  relevant?: 'additions' | 'removals' | 'text' | 'all';
}) {
  return {
    'aria-live': options.politeness || 'polite',
    'aria-atomic': options.atomic ?? true,
    'aria-relevant': options.relevant,
  };
}

export function getLoadingAriaProps(options: {
  isLoading: boolean;
  loadingText?: string;
}) {
  return {
    'aria-busy': options.isLoading,
    'aria-describedby': options.isLoading && options.loadingText ? 'loading-description' : undefined,
  };
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export function getContrastRatio(foreground: string, background: string): number {
  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);

  if (!fg || !bg) return 0;

  const l1 = getLuminance(fg.r, fg.g, fg.b);
  const l2 = getLuminance(bg.r, bg.g, bg.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

export function meetsContrastRequirement(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA',
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  const thresholds = {
    AA: isLargeText ? 3 : 4.5,
    AAA: isLargeText ? 4.5 : 7,
  };
  return ratio >= thresholds[level];
}

export const focusIndicatorStyles = {
  default: 'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
  highContrast: 'focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2',
  onDark: 'focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900',
  input: 'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
  card: 'focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2',
};

export function getHeadingLevel(
  parentLevel: 1 | 2 | 3 | 4 | 5 | 6 = 1
): 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' {
  const nextLevel = Math.min(parentLevel + 1, 6) as 1 | 2 | 3 | 4 | 5 | 6;
  return `h${nextLevel}` as const;
}

export function generateId(prefix: string = 'a11y'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

export function useId(prefix: string = 'a11y'): string {
  const idRef = useRef<string>();
  if (!idRef.current) {
    idRef.current = generateId(prefix);
  }
  return idRef.current;
}

export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}
