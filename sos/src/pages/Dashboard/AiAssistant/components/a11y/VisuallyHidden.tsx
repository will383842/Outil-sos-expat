/**
 * VisuallyHidden Component
 * WCAG 2.1 AA Compliant Screen Reader Only Text
 *
 * This component renders content that is visually hidden but remains
 * accessible to screen readers and other assistive technologies.
 *
 * Use cases:
 * - Providing additional context for icons or visual elements
 * - Adding descriptive labels to interactive elements
 * - Including skip links that appear only on focus
 * - Hiding decorative content from screen readers
 *
 * @example
 * ```tsx
 * // Basic usage - hidden text for screen readers
 * <button>
 *   <SearchIcon />
 *   <VisuallyHidden>Search</VisuallyHidden>
 * </button>
 *
 * // With focusable content (e.g., skip links)
 * <VisuallyHidden focusable>
 *   <a href="#main-content">Skip to main content</a>
 * </VisuallyHidden>
 *
 * // As a different element type
 * <VisuallyHidden as="span" id="description">
 *   This field is required
 * </VisuallyHidden>
 * ```
 */

import React, { forwardRef } from 'react';
import { cn } from '../../../../../utils/cn';

// ============================================================================
// TYPES
// ============================================================================

type PolymorphicRef<C extends React.ElementType> = React.ComponentPropsWithRef<C>['ref'];

type AsProp<C extends React.ElementType> = {
  /** The element type to render as */
  as?: C;
};

type PropsToOmit<C extends React.ElementType, P> = keyof (AsProp<C> & P);

type PolymorphicComponentProp<
  C extends React.ElementType,
  Props = Record<string, unknown>
> = React.PropsWithChildren<Props & AsProp<C>> &
  Omit<React.ComponentPropsWithoutRef<C>, PropsToOmit<C, Props>>;

type PolymorphicComponentPropWithRef<
  C extends React.ElementType,
  Props = Record<string, unknown>
> = PolymorphicComponentProp<C, Props> & { ref?: PolymorphicRef<C> };

export interface VisuallyHiddenOwnProps {
  /**
   * When true, the content becomes visible when focused.
   * Useful for skip links and other keyboard-only interactive elements.
   * @default false
   */
  focusable?: boolean;
  /**
   * Additional CSS classes to apply
   */
  className?: string;
}

export type VisuallyHiddenProps<C extends React.ElementType = 'span'> =
  PolymorphicComponentPropWithRef<C, VisuallyHiddenOwnProps>;

// ============================================================================
// STYLES
// ============================================================================

/**
 * CSS styles that visually hide content while keeping it accessible
 * Based on the technique recommended by WebAIM and used by Bootstrap, Tailwind, etc.
 *
 * Note: Using clip-path instead of the deprecated clip property for future compatibility
 */
const visuallyHiddenStyles = {
  base: [
    // Position absolutely to remove from document flow
    'absolute',
    // Make the element as small as possible
    'w-[1px]',
    'h-[1px]',
    // Remove padding
    'p-0',
    // Use negative margin to prevent the element from affecting layout
    '-m-[1px]',
    // Hide overflow
    'overflow-hidden',
    // Use clip-path to hide the element
    '[clip-path:inset(50%)]',
    // Prevent text wrapping
    'whitespace-nowrap',
    // Remove border
    'border-0',
  ].join(' '),

  // Styles to apply when the element receives focus (for focusable content)
  focusVisible: [
    'focus-within:static',
    'focus-within:w-auto',
    'focus-within:h-auto',
    'focus-within:m-0',
    'focus-within:overflow-visible',
    'focus-within:[clip-path:none]',
    'focus-within:whitespace-normal',
    // Focus indicator styles for accessibility
    'focus-within:ring-2',
    'focus-within:ring-indigo-500',
    'focus-within:ring-offset-2',
    'focus-within:rounded',
    'focus-within:p-2',
    'focus-within:bg-white',
    'focus-within:z-50',
    'focus-within:shadow-lg',
  ].join(' '),
};

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * VisuallyHidden Component
 *
 * Renders content that is visually hidden but accessible to screen readers.
 * This is essential for providing context to assistive technology users
 * without cluttering the visual interface.
 *
 * The component uses the "visually hidden" CSS technique that:
 * - Removes the element from visual rendering
 * - Keeps the content in the accessibility tree
 * - Allows screen readers to read the content
 *
 * When `focusable` is true, the content becomes visible when focused,
 * which is the recommended pattern for skip links.
 */
function VisuallyHiddenInner<C extends React.ElementType = 'span'>(
  props: VisuallyHiddenProps<C>,
  ref: PolymorphicRef<C>
) {
  const {
    as,
    children,
    focusable = false,
    className,
    ...restProps
  } = props;

  const Component = as || 'span';

  return (
    <Component
      ref={ref}
      className={cn(
        visuallyHiddenStyles.base,
        focusable && visuallyHiddenStyles.focusVisible,
        className
      )}
      {...restProps}
    >
      {children}
    </Component>
  );
}

/**
 * VisuallyHidden - A polymorphic component for screen reader only content
 *
 * Features:
 * - Polymorphic: can render as any HTML element via the `as` prop
 * - Focusable mode: content becomes visible when focused (for skip links)
 * - WCAG 2.1 AA compliant
 * - Supports ref forwarding
 *
 * @example
 * ```tsx
 * // Icon button with accessible label
 * <button aria-label="Close">
 *   <XIcon aria-hidden="true" />
 *   <VisuallyHidden>Close dialog</VisuallyHidden>
 * </button>
 *
 * // Skip link
 * <VisuallyHidden as="div" focusable>
 *   <a href="#main">Skip to main content</a>
 * </VisuallyHidden>
 *
 * // Form field description
 * <input aria-describedby="password-requirements" />
 * <VisuallyHidden as="p" id="password-requirements">
 *   Password must be at least 8 characters long
 * </VisuallyHidden>
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const VisuallyHidden = forwardRef(VisuallyHiddenInner as any) as unknown as <
  C extends React.ElementType = 'span'
>(
  props: VisuallyHiddenProps<C>
) => React.ReactElement | null;

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================

/**
 * ScreenReaderOnly - Alias for VisuallyHidden
 * Some teams prefer this more descriptive name
 */
export const ScreenReaderOnly = VisuallyHidden;

/**
 * SrOnly - Short alias commonly used in utility-first CSS frameworks
 */
export const SrOnly = VisuallyHidden;

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook to get visually hidden styles for custom implementations
 *
 * @example
 * ```tsx
 * const { baseStyles, focusStyles } = useVisuallyHiddenStyles();
 * return (
 *   <div className={cn(baseStyles, isFocusable && focusStyles)}>
 *     {content}
 *   </div>
 * );
 * ```
 */
export function useVisuallyHiddenStyles() {
  return {
    baseStyles: visuallyHiddenStyles.base,
    focusStyles: visuallyHiddenStyles.focusVisible,
  };
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default VisuallyHidden;
