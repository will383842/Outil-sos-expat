/**
 * =============================================================================
 * TOUCH TARGET - Wrapper component ensuring minimum touch target size
 * Follows Apple HIG standard (44x44px minimum)
 * =============================================================================
 */

import * as React from "react";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

export interface TouchTargetProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Minimum touch target size in pixels (default: 44 - Apple HIG standard) */
  minSize?: number;
  /** The content to wrap */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Whether to center the content within the touch target */
  centered?: boolean;
  /** HTML element to render (default: div) */
  as?: "div" | "span" | "button";
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * TouchTarget wraps interactive elements to ensure they meet
 * minimum touch target size requirements (44x44px by default).
 *
 * Uses invisible padding when the visual element is smaller than
 * the minimum touch target size.
 *
 * @example
 * // Wrap a small icon button
 * <TouchTarget>
 *   <button className="p-1">
 *     <Icon size={16} />
 *   </button>
 * </TouchTarget>
 *
 * @example
 * // Custom minimum size
 * <TouchTarget minSize={48}>
 *   <SmallButton />
 * </TouchTarget>
 */
const TouchTarget = React.forwardRef<HTMLDivElement, TouchTargetProps>(
  (
    {
      minSize = 44,
      children,
      className,
      centered = true,
      as: Component = "div",
      ...props
    },
    ref
  ) => {
    return (
      <Component
        ref={ref as React.Ref<HTMLDivElement>}
        className={cn(
          "relative",
          centered && "inline-flex items-center justify-center",
          className
        )}
        style={{
          minWidth: `${minSize}px`,
          minHeight: `${minSize}px`,
        }}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

TouchTarget.displayName = "TouchTarget";

// =============================================================================
// TOUCH TARGET EXPAND - Invisible hit area expander
// =============================================================================

export interface TouchTargetExpandProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  /** Size of the touch target in pixels */
  size?: number;
}

/**
 * TouchTargetExpand creates an invisible expanded hit area
 * around a smaller visual element using absolute positioning.
 *
 * Place this as a child of a relatively positioned parent
 * to expand its touch area.
 *
 * @example
 * <button className="relative p-1">
 *   <Icon size={16} />
 *   <TouchTargetExpand />
 * </button>
 */
const TouchTargetExpand = React.forwardRef<
  HTMLSpanElement,
  TouchTargetExpandProps
>(({ size = 44, className, ...props }, ref) => {
  return (
    <span
      ref={ref}
      className={cn(
        "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
        "pointer-events-auto",
        className
      )}
      style={{
        width: `max(100%, ${size}px)`,
        height: `max(100%, ${size}px)`,
      }}
      aria-hidden="true"
      {...props}
    />
  );
});

TouchTargetExpand.displayName = "TouchTargetExpand";

// =============================================================================
// HOOK - useTouchTarget
// =============================================================================

/**
 * Hook that returns style props for ensuring minimum touch target size
 *
 * @param minSize - Minimum size in pixels (default: 44)
 * @returns Style object to spread on the element
 *
 * @example
 * const touchStyle = useTouchTarget(48);
 * <button style={touchStyle}>Click me</button>
 */
export function useTouchTarget(minSize: number = 44): React.CSSProperties {
  return {
    minWidth: `${minSize}px`,
    minHeight: `${minSize}px`,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export { TouchTarget, TouchTargetExpand };
