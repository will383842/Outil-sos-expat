/**
 * LiveRegion Component
 * WCAG 2.1 AA Compliant ARIA Live Region for Dynamic Content Announcements
 *
 * This component provides accessible announcements to screen reader users
 * for dynamic content changes that happen without page reload.
 *
 * Live regions are essential for:
 * - Status updates (loading, success, error messages)
 * - Real-time notifications
 * - Form validation feedback
 * - Chat message arrivals
 * - Progress updates
 *
 * @see https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/#describingwithliveregions
 *
 * @example
 * ```tsx
 * // Basic status announcement
 * <LiveRegion>
 *   {isLoading ? 'Loading conversations...' : `${count} conversations loaded`}
 * </LiveRegion>
 *
 * // Alert for errors
 * <LiveRegion politeness="assertive" role="alert">
 *   {errorMessage}
 * </LiveRegion>
 *
 * // Using the imperative hook
 * const { announce } = useLiveRegion();
 * announce('Message sent successfully');
 * ```
 */

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { cn } from '../../../../../utils/cn';
import type { AriaLivePoliteness } from '../../accessibility';

// ============================================================================
// TYPES
// ============================================================================

export type LiveRegionRole = 'status' | 'alert' | 'log' | 'marquee' | 'timer' | 'progressbar';

export interface LiveRegionProps {
  /**
   * Content to announce to screen readers
   */
  children?: React.ReactNode;

  /**
   * How urgently the announcement should be made
   * - 'polite': Wait for current speech to finish (default)
   * - 'assertive': Interrupt current speech immediately
   * - 'off': Disable announcements
   * @default 'polite'
   */
  politeness?: AriaLivePoliteness;

  /**
   * ARIA role for the live region
   * - 'status': General status updates (default for polite)
   * - 'alert': Important, time-sensitive messages (default for assertive)
   * - 'log': Sequential messages like chat
   * - 'timer': Time-related information
   * - 'progressbar': Progress indicator
   * - 'marquee': Scrolling content
   * @default 'status'
   */
  role?: LiveRegionRole;

  /**
   * Whether to read the entire region on any change
   * - true: Read entire content (default)
   * - false: Only read changed parts
   * @default true
   */
  atomic?: boolean;

  /**
   * What types of changes should trigger announcements
   * @default 'additions text'
   */
  relevant?: 'additions' | 'removals' | 'text' | 'all' | 'additions text' | 'additions removals';

  /**
   * Whether the live region is visible or hidden (sr-only)
   * @default false (hidden)
   */
  visible?: boolean;

  /**
   * Delay in ms before announcing to prevent rapid-fire updates
   * @default 0
   */
  debounceMs?: number;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Clear the announcement after this many milliseconds
   * Useful for temporary notifications
   */
  clearAfterMs?: number;

  /**
   * ID for the live region element
   */
  id?: string;

  /**
   * Whether to render the live region (useful for conditional rendering)
   * @default true
   */
  enabled?: boolean;

  /**
   * Current value for progressbar role
   */
  'aria-valuenow'?: number;

  /**
   * Maximum value for progressbar role
   */
  'aria-valuemax'?: number;

  /**
   * Minimum value for progressbar role
   */
  'aria-valuemin'?: number;
}

// ============================================================================
// STYLES
// ============================================================================

const visuallyHiddenStyles = [
  'absolute',
  'w-[1px]',
  'h-[1px]',
  'p-0',
  '-m-[1px]',
  'overflow-hidden',
  '[clip-path:inset(50%)]',
  'whitespace-nowrap',
  'border-0',
].join(' ');

const visibleStyles = [
  'relative',
  'p-4',
  'rounded-lg',
  'border',
  'shadow-sm',
].join(' ');

const roleStyles: Record<LiveRegionRole, string> = {
  status: 'bg-blue-50 border-blue-200 text-blue-800',
  alert: 'bg-red-50 border-red-200 text-red-800',
  log: 'bg-gray-50 border-gray-200 text-gray-800',
  timer: 'bg-amber-50 border-amber-200 text-amber-800',
  progressbar: 'bg-indigo-50 border-indigo-200 text-indigo-800',
  marquee: 'bg-purple-50 border-purple-200 text-purple-800',
};

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * LiveRegion Component
 *
 * Provides ARIA live region functionality for announcing dynamic content
 * changes to screen reader users.
 *
 * The component supports both polite (non-interrupting) and assertive
 * (interrupting) announcements, with appropriate ARIA roles.
 */
export const LiveRegion: React.FC<LiveRegionProps> = ({
  children,
  politeness = 'polite',
  role,
  atomic = true,
  relevant = 'additions text',
  visible = false,
  debounceMs = 0,
  className,
  clearAfterMs,
  id,
  enabled = true,
  'aria-valuenow': ariaValueNow,
  'aria-valuemax': ariaValueMax,
  'aria-valuemin': ariaValueMin,
}) => {
  const [announcement, setAnnouncement] = useState<React.ReactNode>(null);
  const debounceRef = useRef<NodeJS.Timeout>();
  const clearRef = useRef<NodeJS.Timeout>();
  const generatedId = useId();
  const regionId = id || generatedId;

  // Determine the appropriate role based on politeness if not specified
  const computedRole = role || (politeness === 'assertive' ? 'alert' : 'status');

  // Handle debounced announcements
  useEffect(() => {
    if (!enabled) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (debounceMs > 0) {
      debounceRef.current = setTimeout(() => {
        setAnnouncement(children);
      }, debounceMs);
    } else {
      setAnnouncement(children);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [children, debounceMs, enabled]);

  // Handle auto-clearing
  useEffect(() => {
    if (!clearAfterMs || !announcement) return;

    if (clearRef.current) {
      clearTimeout(clearRef.current);
    }

    clearRef.current = setTimeout(() => {
      setAnnouncement(null);
    }, clearAfterMs);

    return () => {
      if (clearRef.current) {
        clearTimeout(clearRef.current);
      }
    };
  }, [announcement, clearAfterMs]);

  if (!enabled) return null;

  return (
    <div
      id={regionId}
      role={computedRole}
      aria-live={politeness}
      aria-atomic={atomic}
      aria-relevant={relevant}
      aria-valuenow={ariaValueNow}
      aria-valuemax={ariaValueMax}
      aria-valuemin={ariaValueMin}
      className={cn(
        visible ? `${visibleStyles} ${roleStyles[computedRole]}` : visuallyHiddenStyles,
        className
      )}
    >
      {announcement}
    </div>
  );
};

// ============================================================================
// SPECIALIZED COMPONENTS
// ============================================================================

/**
 * StatusRegion - For polite status updates
 *
 * @example
 * ```tsx
 * <StatusRegion>
 *   {loading ? 'Loading...' : 'Data loaded successfully'}
 * </StatusRegion>
 * ```
 */
export const StatusRegion: React.FC<Omit<LiveRegionProps, 'politeness' | 'role'>> = (props) => (
  <LiveRegion {...props} politeness="polite" role="status" />
);

/**
 * AlertRegion - For urgent, assertive announcements
 *
 * @example
 * ```tsx
 * <AlertRegion>
 *   {error && `Error: ${error.message}`}
 * </AlertRegion>
 * ```
 */
export const AlertRegion: React.FC<Omit<LiveRegionProps, 'politeness' | 'role'>> = (props) => (
  <LiveRegion {...props} politeness="assertive" role="alert" />
);

/**
 * LogRegion - For sequential messages like chat logs
 *
 * @example
 * ```tsx
 * <LogRegion>
 *   {messages.map(msg => msg.text).join('. ')}
 * </LogRegion>
 * ```
 */
export const LogRegion: React.FC<Omit<LiveRegionProps, 'politeness' | 'role' | 'atomic'>> = (props) => (
  <LiveRegion {...props} politeness="polite" role="log" atomic={false} />
);

/**
 * ProgressRegion - For progress updates
 *
 * @example
 * ```tsx
 * <ProgressRegion>
 *   {`${progress}% complete`}
 * </ProgressRegion>
 * ```
 */
export const ProgressRegion: React.FC<Omit<LiveRegionProps, 'role'> & {
  value?: number;
  max?: number;
  min?: number;
}> = ({ value, max = 100, min = 0, ...props }) => (
  <LiveRegion
    {...props}
    role="progressbar"
    aria-valuenow={value}
    aria-valuemax={max}
    aria-valuemin={min}
  />
);

// ============================================================================
// HOOKS
// ============================================================================

interface UseLiveRegionOptions {
  /** Default politeness level */
  defaultPoliteness?: AriaLivePoliteness;
  /** Debounce delay in ms */
  debounceMs?: number;
  /** Auto-clear after ms */
  clearAfterMs?: number;
}

interface UseLiveRegionReturn {
  /** Current announcement content */
  announcement: string | null;
  /** Announce a message with polite politeness */
  announce: (message: string) => void;
  /** Announce a message with assertive politeness */
  announceAssertive: (message: string) => void;
  /** Clear the current announcement */
  clear: () => void;
  /** Props to spread on a custom live region element */
  regionProps: {
    role: LiveRegionRole;
    'aria-live': AriaLivePoliteness;
    'aria-atomic': boolean;
    'aria-relevant': string;
  };
}

/**
 * Hook for programmatic live region announcements
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { announce, announceAssertive, announcement, regionProps } = useLiveRegion();
 *
 *   const handleSubmit = async () => {
 *     try {
 *       await submitForm();
 *       announce('Form submitted successfully');
 *     } catch (error) {
 *       announceAssertive(`Error: ${error.message}`);
 *     }
 *   };
 *
 *   return (
 *     <>
 *       <form onSubmit={handleSubmit}>...</form>
 *       <LiveRegion>{announcement}</LiveRegion>
 *     </>
 *   );
 * }
 * ```
 */
export function useLiveRegion(options: UseLiveRegionOptions = {}): UseLiveRegionReturn {
  const {
    defaultPoliteness = 'polite',
    debounceMs = 0,
    clearAfterMs,
  } = options;

  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [politeness, setPoliteness] = useState<AriaLivePoliteness>(defaultPoliteness);
  const debounceRef = useRef<NodeJS.Timeout>();
  const clearRef = useRef<NodeJS.Timeout>();

  const scheduleAnnouncement = useCallback((message: string, announcePoliteness: AriaLivePoliteness) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const doAnnounce = () => {
      setPoliteness(announcePoliteness);
      setAnnouncement(message);

      if (clearAfterMs) {
        if (clearRef.current) {
          clearTimeout(clearRef.current);
        }
        clearRef.current = setTimeout(() => {
          setAnnouncement(null);
        }, clearAfterMs);
      }
    };

    if (debounceMs > 0) {
      debounceRef.current = setTimeout(doAnnounce, debounceMs);
    } else {
      doAnnounce();
    }
  }, [debounceMs, clearAfterMs]);

  const announce = useCallback((message: string) => {
    scheduleAnnouncement(message, 'polite');
  }, [scheduleAnnouncement]);

  const announceAssertive = useCallback((message: string) => {
    scheduleAnnouncement(message, 'assertive');
  }, [scheduleAnnouncement]);

  const clear = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (clearRef.current) {
      clearTimeout(clearRef.current);
    }
    setAnnouncement(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (clearRef.current) {
        clearTimeout(clearRef.current);
      }
    };
  }, []);

  const regionProps = {
    role: (politeness === 'assertive' ? 'alert' : 'status') as LiveRegionRole,
    'aria-live': politeness,
    'aria-atomic': true as const,
    'aria-relevant': 'additions text' as const,
  };

  return {
    announcement,
    announce,
    announceAssertive,
    clear,
    regionProps,
  };
}

/**
 * Hook for loading state announcements
 *
 * @example
 * ```tsx
 * const { loadingAnnouncement, setLoading } = useLoadingAnnouncement({
 *   loadingMessage: 'Loading conversations...',
 *   successMessage: 'Conversations loaded',
 *   errorMessage: 'Failed to load conversations',
 * });
 *
 * // When loading starts
 * setLoading(true);
 *
 * // When loading completes
 * setLoading(false, isError);
 *
 * return <LiveRegion>{loadingAnnouncement}</LiveRegion>;
 * ```
 */
export function useLoadingAnnouncement(options: {
  loadingMessage: string;
  successMessage?: string;
  errorMessage?: string;
}) {
  const { loadingMessage, successMessage, errorMessage } = options;
  const [loadingAnnouncement, setLoadingAnnouncement] = useState<string | null>(null);

  const setLoading = useCallback((isLoading: boolean, isError?: boolean) => {
    if (isLoading) {
      setLoadingAnnouncement(loadingMessage);
    } else if (isError && errorMessage) {
      setLoadingAnnouncement(errorMessage);
    } else if (successMessage) {
      setLoadingAnnouncement(successMessage);
    } else {
      setLoadingAnnouncement(null);
    }
  }, [loadingMessage, successMessage, errorMessage]);

  return {
    loadingAnnouncement,
    setLoading,
  };
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default LiveRegion;
