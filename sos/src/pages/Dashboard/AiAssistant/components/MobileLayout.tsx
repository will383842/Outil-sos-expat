/**
 * MobileLayout - Mobile-Optimized Layout for AI Assistant
 *
 * This component provides a touch-optimized layout wrapper that:
 * - Detects mobile viewport and reorganizes layout
 * - Uses bottom sheets for modals on mobile
 * - Implements pull-to-refresh functionality
 * - Optimizes scroll performance with virtualization hints
 * - Provides floating action button for primary CTA
 * - Handles safe areas for notched devices
 *
 * @example
 * <MobileLayout
 *   onRefresh={handleRefresh}
 *   fab={{ icon: <Plus />, onClick: handleAdd, pulse: true }}
 * >
 *   <YourContent />
 * </MobileLayout>
 */

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  createContext,
  useContext,
  type ReactNode,
  type RefObject,
} from 'react';
import { X, ChevronDown } from 'lucide-react';
import { useMediaQuery, usePrefersReducedMotion } from '../hooks/useMediaQuery';
import { cn } from '../../../../utils/cn';

// Import mobile styles
import '../styles/mobile.css';

// ============================================================================
// TYPES
// ============================================================================

export interface MobileLayoutContextValue {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  openBottomSheet: (content: ReactNode, options?: BottomSheetOptions) => void;
  closeBottomSheet: () => void;
  isBottomSheetOpen: boolean;
}

export interface BottomSheetOptions {
  title?: string;
  height?: 'auto' | 'half' | 'full';
  showHandle?: boolean;
  onClose?: () => void;
}

export interface FABConfig {
  icon: ReactNode;
  onClick: () => void;
  label?: string;
  pulse?: boolean;
  disabled?: boolean;
}

export interface MobileLayoutProps {
  children: ReactNode;
  /** Callback for pull-to-refresh */
  onRefresh?: () => Promise<void>;
  /** Floating action button configuration */
  fab?: FABConfig;
  /** Custom header content */
  header?: ReactNode;
  /** Whether to show the header */
  showHeader?: boolean;
  /** Custom class name for container */
  className?: string;
  /** Enable scroll performance optimizations */
  optimizeScroll?: boolean;
}

// ============================================================================
// CONTEXT
// ============================================================================

const MobileLayoutContext = createContext<MobileLayoutContextValue | null>(null);

export function useMobileLayout(): MobileLayoutContextValue {
  const context = useContext(MobileLayoutContext);
  if (!context) {
    throw new Error('useMobileLayout must be used within a MobileLayout');
  }
  return context;
}

// ============================================================================
// BOTTOM SHEET COMPONENT
// ============================================================================

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  height?: 'auto' | 'half' | 'full';
  showHandle?: boolean;
  children: ReactNode;
}

const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  height = 'auto',
  showHandle = true,
  children,
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number>(0);
  const currentY = useRef<number>(0);
  const isDragging = useRef<boolean>(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  // Handle drag to dismiss
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current || !sheetRef.current) return;

    currentY.current = e.touches[0].clientY;
    const deltaY = currentY.current - startY.current;

    // Only allow dragging down
    if (deltaY > 0) {
      sheetRef.current.style.transform = `translateY(${deltaY}px)`;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current || !sheetRef.current) return;

    const deltaY = currentY.current - startY.current;
    isDragging.current = false;

    // If dragged more than 100px, close the sheet
    if (deltaY > 100) {
      onClose();
    }

    // Reset transform
    sheetRef.current.style.transform = '';
  }, [onClose]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* Overlay */}
      <div
        className={cn('bottom-sheet-overlay', isOpen && 'open')}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'bottom-sheet-title' : undefined}
        className={cn(
          'bottom-sheet',
          isOpen && 'open',
          height === 'half' && 'half',
          height === 'full' && 'full'
        )}
        style={{
          transition: prefersReducedMotion ? 'none' : undefined,
        }}
      >
        {/* Drag handle */}
        {showHandle && (
          <div
            className="bottom-sheet-handle"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
        )}

        {/* Header */}
        {title && (
          <div className="bottom-sheet-header">
            <h2 id="bottom-sheet-title" className="bottom-sheet-title">
              {title}
            </h2>
            <button
              className="bottom-sheet-close"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="bottom-sheet-content">{children}</div>
      </div>
    </>
  );
};

// ============================================================================
// PULL TO REFRESH COMPONENT
// ============================================================================

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  disabled?: boolean;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  disabled = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'idle' | 'pulling' | 'refreshing'>('idle');
  const startY = useRef<number>(0);
  const pullDistance = useRef<number>(0);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || state === 'refreshing') return;

      // Only start if scrolled to top
      if (containerRef.current?.scrollTop === 0) {
        startY.current = e.touches[0].clientY;
      }
    },
    [disabled, state]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || state === 'refreshing' || startY.current === 0) return;

      const currentY = e.touches[0].clientY;
      pullDistance.current = currentY - startY.current;

      // Only trigger when pulling down from top
      if (pullDistance.current > 0 && containerRef.current?.scrollTop === 0) {
        setState('pulling');
      }
    },
    [disabled, state]
  );

  const handleTouchEnd = useCallback(async () => {
    if (disabled || state === 'refreshing') return;

    // If pulled far enough, trigger refresh
    if (pullDistance.current > 80 && state === 'pulling') {
      setState('refreshing');
      try {
        await onRefresh();
      } finally {
        setState('idle');
      }
    } else {
      setState('idle');
    }

    startY.current = 0;
    pullDistance.current = 0;
  }, [disabled, state, onRefresh]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'pull-refresh-container',
        state === 'pulling' && 'pulling',
        state === 'refreshing' && 'refreshing'
      )}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Refresh indicator */}
      <div className="pull-refresh-indicator">
        <div className="pull-refresh-spinner" />
      </div>

      {children}
    </div>
  );
};

// ============================================================================
// FLOATING ACTION BUTTON COMPONENT
// ============================================================================

interface FloatingActionButtonProps extends FABConfig {
  visible?: boolean;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  icon,
  onClick,
  label,
  pulse = false,
  disabled = false,
  visible = true,
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (!visible) return null;

  return (
    <div className="fab-container">
      <button
        className={cn(
          'fab-button',
          pulse && !prefersReducedMotion && 'fab-pulse',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onClick={onClick}
        disabled={disabled}
        aria-label={label || 'Action button'}
      >
        {icon}
      </button>
    </div>
  );
};

// ============================================================================
// COLLAPSIBLE SECTION COMPONENT
// ============================================================================

export interface CollapsibleSectionProps {
  title: string;
  icon?: ReactNode;
  defaultExpanded?: boolean;
  children: ReactNode;
  className?: string;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon,
  defaultExpanded = false,
  children,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const { isDesktop } = useMobileLayout();

  // Auto-expand on desktop
  const expanded = isDesktop || isExpanded;

  return (
    <div
      className={cn(
        'collapsible-section',
        expanded && 'expanded',
        className
      )}
    >
      <button
        className="collapsible-header"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-semibold text-gray-900">{title}</span>
        </div>
        <ChevronDown className="collapsible-icon" />
      </button>
      <div className="collapsible-content">
        <div className="collapsible-body">{children}</div>
      </div>
    </div>
  );
};

// ============================================================================
// MOBILE HEADER COMPONENT
// ============================================================================

interface MobileHeaderProps {
  children?: ReactNode;
  sticky?: boolean;
  scrollContainerRef?: RefObject<HTMLDivElement>;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({
  children,
  sticky = true,
  scrollContainerRef,
}) => {
  const [isHidden, setIsHidden] = useState(false);
  const lastScrollY = useRef<number>(0);
  const { isMobile } = useMobileLayout();

  // Hide header on scroll down, show on scroll up
  useEffect(() => {
    if (!sticky || !isMobile) return;

    const container = scrollContainerRef?.current || window;

    const handleScroll = () => {
      const scrollY =
        scrollContainerRef?.current?.scrollTop || window.scrollY;

      if (scrollY > lastScrollY.current && scrollY > 60) {
        setIsHidden(true);
      } else {
        setIsHidden(false);
      }

      lastScrollY.current = scrollY;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [sticky, isMobile, scrollContainerRef]);

  return (
    <header
      className={cn(
        'ai-assistant-header',
        isHidden && 'header-hidden'
      )}
    >
      {children}
    </header>
  );
};

// ============================================================================
// MAIN MOBILE LAYOUT COMPONENT
// ============================================================================

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  onRefresh,
  fab,
  header,
  showHeader = true,
  className,
  optimizeScroll = true,
}) => {
  const mediaQuery = useMediaQuery();
  const { isMobile, isTablet, isDesktop, isTouchDevice } = mediaQuery;
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Bottom sheet state
  const [bottomSheetState, setBottomSheetState] = useState<{
    isOpen: boolean;
    content: ReactNode;
    options: BottomSheetOptions;
  }>({
    isOpen: false,
    content: null,
    options: {},
  });

  // Bottom sheet handlers
  const openBottomSheet = useCallback(
    (content: ReactNode, options: BottomSheetOptions = {}) => {
      setBottomSheetState({
        isOpen: true,
        content,
        options,
      });
    },
    []
  );

  const closeBottomSheet = useCallback(() => {
    bottomSheetState.options.onClose?.();
    setBottomSheetState((prev) => ({
      ...prev,
      isOpen: false,
    }));
  }, [bottomSheetState.options]);

  // Context value
  const contextValue: MobileLayoutContextValue = {
    isMobile,
    isTablet,
    isDesktop,
    isTouchDevice,
    openBottomSheet,
    closeBottomSheet,
    isBottomSheetOpen: bottomSheetState.isOpen,
  };

  // Scroll performance optimization
  useEffect(() => {
    if (!optimizeScroll || !scrollContainerRef.current) return;

    const container = scrollContainerRef.current;

    // Add will-change hint during scroll
    let scrollTimeout: ReturnType<typeof setTimeout>;

    const handleScrollStart = () => {
      container.style.willChange = 'transform';
      clearTimeout(scrollTimeout);
    };

    const handleScrollEnd = () => {
      scrollTimeout = setTimeout(() => {
        container.style.willChange = 'auto';
      }, 100);
    };

    container.addEventListener('touchstart', handleScrollStart, { passive: true });
    container.addEventListener('touchend', handleScrollEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleScrollStart);
      container.removeEventListener('touchend', handleScrollEnd);
      clearTimeout(scrollTimeout);
    };
  }, [optimizeScroll]);

  // Render content
  const content = (
    <div className="ai-assistant-content">
      <div className="ai-assistant-grid">{children}</div>
    </div>
  );

  return (
    <MobileLayoutContext.Provider value={contextValue}>
      <div
        ref={scrollContainerRef}
        className={cn(
          'ai-assistant-container',
          className
        )}
      >
        {/* Header */}
        {showHeader && header && (
          <MobileHeader scrollContainerRef={scrollContainerRef}>
            {header}
          </MobileHeader>
        )}

        {/* Main content with optional pull-to-refresh */}
        {onRefresh && isTouchDevice ? (
          <PullToRefresh onRefresh={onRefresh}>{content}</PullToRefresh>
        ) : (
          content
        )}

        {/* Floating Action Button - Mobile only */}
        {fab && isMobile && (
          <FloatingActionButton
            icon={fab.icon}
            onClick={fab.onClick}
            label={fab.label}
            pulse={fab.pulse}
            disabled={fab.disabled}
          />
        )}

        {/* Bottom Sheet */}
        <BottomSheet
          isOpen={bottomSheetState.isOpen}
          onClose={closeBottomSheet}
          title={bottomSheetState.options.title}
          height={bottomSheetState.options.height}
          showHandle={bottomSheetState.options.showHandle}
        >
          {bottomSheetState.content}
        </BottomSheet>
      </div>
    </MobileLayoutContext.Provider>
  );
};

// ============================================================================
// EXPORTS
// ============================================================================

export default MobileLayout;
export { BottomSheet, PullToRefresh, FloatingActionButton, MobileHeader };
