/**
 * =============================================================================
 * RESPONSIVE CONTAINER - Container with responsive padding and safe areas
 * Mobile-first design with automatic adjustments for different screen sizes
 * =============================================================================
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// =============================================================================
// CONTAINER VARIANTS
// =============================================================================

const responsiveContainerVariants = cva(
  "w-full mx-auto",
  {
    variants: {
      /**
       * Maximum width constraint
       * - full: No max-width
       * - sm: max-w-screen-sm (640px)
       * - md: max-w-screen-md (768px)
       * - lg: max-w-screen-lg (1024px)
       * - xl: max-w-screen-xl (1280px)
       * - 2xl: max-w-screen-2xl (1536px)
       */
      maxWidth: {
        full: "",
        sm: "max-w-screen-sm",
        md: "max-w-screen-md",
        lg: "max-w-screen-lg",
        xl: "max-w-screen-xl",
        "2xl": "max-w-screen-2xl",
      },
      /**
       * Padding scale
       * - none: No padding
       * - sm: Small responsive padding
       * - md: Medium responsive padding (default)
       * - lg: Large responsive padding
       */
      padding: {
        none: "",
        sm: "px-3 sm:px-4 md:px-6",
        md: "px-4 sm:px-6 md:px-8",
        lg: "px-4 sm:px-8 md:px-12",
      },
      /**
       * Vertical padding
       */
      paddingY: {
        none: "",
        sm: "py-2 sm:py-3 md:py-4",
        md: "py-4 sm:py-6 md:py-8",
        lg: "py-6 sm:py-8 md:py-12",
      },
      /**
       * Safe area insets support
       * - none: No safe area
       * - horizontal: Left and right safe areas
       * - vertical: Top and bottom safe areas
       * - all: All safe areas
       */
      safeArea: {
        none: "",
        horizontal: "safe-area-x",
        vertical: "safe-area-y",
        all: "safe-area-all",
      },
    },
    defaultVariants: {
      maxWidth: "xl",
      padding: "md",
      paddingY: "none",
      safeArea: "none",
    },
  }
);

// =============================================================================
// TYPES
// =============================================================================

export interface ResponsiveContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof responsiveContainerVariants> {
  /** HTML element to render */
  as?: "div" | "section" | "main" | "article" | "aside" | "header" | "footer";
  /** Center content vertically */
  centerVertical?: boolean;
  /** Full screen height minus safe areas */
  fullHeight?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * ResponsiveContainer provides a consistent layout container with:
 * - Responsive horizontal padding (grows with screen size)
 * - Optional max-width constraints
 * - Safe area insets support for notched devices
 * - Mobile-first design approach
 *
 * @example
 * // Basic usage
 * <ResponsiveContainer>
 *   <YourContent />
 * </ResponsiveContainer>
 *
 * @example
 * // With safe areas and max width
 * <ResponsiveContainer maxWidth="lg" safeArea="all">
 *   <YourContent />
 * </ResponsiveContainer>
 *
 * @example
 * // Full height page layout
 * <ResponsiveContainer as="main" fullHeight safeArea="vertical">
 *   <YourContent />
 * </ResponsiveContainer>
 */
const ResponsiveContainer = React.forwardRef<
  HTMLDivElement,
  ResponsiveContainerProps
>(
  (
    {
      className,
      maxWidth,
      padding,
      paddingY,
      safeArea,
      as: Component = "div",
      centerVertical = false,
      fullHeight = false,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <Component
        ref={ref}
        className={cn(
          responsiveContainerVariants({
            maxWidth,
            padding,
            paddingY,
            safeArea,
          }),
          centerVertical && "flex flex-col items-center justify-center",
          fullHeight && "min-h-screen-safe",
          className
        )}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

ResponsiveContainer.displayName = "ResponsiveContainer";

// =============================================================================
// RESPONSIVE PAGE WRAPPER
// =============================================================================

export interface ResponsivePageProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Page title (optional, for accessibility) */
  title?: string;
  /** Include top safe area */
  safeTop?: boolean;
  /** Include bottom safe area */
  safeBottom?: boolean;
}

/**
 * ResponsivePage wraps entire page content with appropriate
 * safe areas and responsive padding for mobile-first design.
 *
 * @example
 * <ResponsivePage title="Dashboard" safeTop safeBottom>
 *   <PageContent />
 * </ResponsivePage>
 */
const ResponsivePage = React.forwardRef<HTMLDivElement, ResponsivePageProps>(
  (
    {
      className,
      title,
      safeTop = true,
      safeBottom = true,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "min-h-screen bg-background",
          safeTop && "safe-area-top",
          safeBottom && "safe-area-bottom",
          className
        )}
        role="main"
        aria-label={title}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ResponsivePage.displayName = "ResponsivePage";

// =============================================================================
// RESPONSIVE SECTION
// =============================================================================

export interface ResponsiveSectionProps
  extends React.HTMLAttributes<HTMLElement> {
  /** Section heading (optional) */
  heading?: string;
  /** Heading level */
  headingLevel?: "h1" | "h2" | "h3" | "h4";
  /** Spacing between section elements */
  spacing?: "sm" | "md" | "lg";
}

/**
 * ResponsiveSection provides consistent vertical spacing and optional heading
 * for page sections in a mobile-first layout.
 *
 * @example
 * <ResponsiveSection heading="Recent Activity" spacing="md">
 *   <ActivityList />
 * </ResponsiveSection>
 */
const ResponsiveSection = React.forwardRef<
  HTMLElement,
  ResponsiveSectionProps
>(
  (
    {
      className,
      heading,
      headingLevel: HeadingTag = "h2",
      spacing = "md",
      children,
      ...props
    },
    ref
  ) => {
    const spacingClasses = {
      sm: "space-y-3 sm:space-y-4",
      md: "space-y-4 sm:space-y-6",
      lg: "space-y-6 sm:space-y-8",
    };

    return (
      <section
        ref={ref}
        className={cn(spacingClasses[spacing], className)}
        {...props}
      >
        {heading && (
          <HeadingTag className="text-lg sm:text-xl font-semibold text-foreground">
            {heading}
          </HeadingTag>
        )}
        {children}
      </section>
    );
  }
);

ResponsiveSection.displayName = "ResponsiveSection";

// =============================================================================
// RESPONSIVE GRID
// =============================================================================

export interface ResponsiveGridProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of columns on mobile */
  cols?: 1 | 2;
  /** Number of columns on tablet (sm breakpoint) */
  colsSm?: 1 | 2 | 3;
  /** Number of columns on desktop (md breakpoint) */
  colsMd?: 1 | 2 | 3 | 4;
  /** Number of columns on large screens (lg breakpoint) */
  colsLg?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Gap between items */
  gap?: "sm" | "md" | "lg";
}

/**
 * ResponsiveGrid creates a mobile-first grid layout that adapts
 * to different screen sizes.
 *
 * @example
 * <ResponsiveGrid cols={1} colsSm={2} colsMd={3} gap="md">
 *   <Card />
 *   <Card />
 *   <Card />
 * </ResponsiveGrid>
 */
const ResponsiveGrid = React.forwardRef<HTMLDivElement, ResponsiveGridProps>(
  (
    {
      className,
      cols = 1,
      colsSm,
      colsMd,
      colsLg,
      gap = "md",
      children,
      ...props
    },
    ref
  ) => {
    const colsClasses: Record<number, string> = {
      1: "grid-cols-1",
      2: "grid-cols-2",
      3: "grid-cols-3",
      4: "grid-cols-4",
      5: "grid-cols-5",
      6: "grid-cols-6",
    };

    const smClasses: Record<number, string> = {
      1: "sm:grid-cols-1",
      2: "sm:grid-cols-2",
      3: "sm:grid-cols-3",
    };

    const mdClasses: Record<number, string> = {
      1: "md:grid-cols-1",
      2: "md:grid-cols-2",
      3: "md:grid-cols-3",
      4: "md:grid-cols-4",
    };

    const lgClasses: Record<number, string> = {
      1: "lg:grid-cols-1",
      2: "lg:grid-cols-2",
      3: "lg:grid-cols-3",
      4: "lg:grid-cols-4",
      5: "lg:grid-cols-5",
      6: "lg:grid-cols-6",
    };

    const gapClasses = {
      sm: "gap-3 sm:gap-4",
      md: "gap-4 sm:gap-6",
      lg: "gap-6 sm:gap-8",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "grid",
          colsClasses[cols],
          colsSm && smClasses[colsSm],
          colsMd && mdClasses[colsMd],
          colsLg && lgClasses[colsLg],
          gapClasses[gap],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ResponsiveGrid.displayName = "ResponsiveGrid";

// =============================================================================
// RESPONSIVE STACK
// =============================================================================

export interface ResponsiveStackProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Direction on mobile */
  direction?: "vertical" | "horizontal";
  /** Switch direction at breakpoint */
  switchAt?: "sm" | "md" | "lg";
  /** Gap between items */
  gap?: "sm" | "md" | "lg";
  /** Align items */
  align?: "start" | "center" | "end" | "stretch";
}

/**
 * ResponsiveStack creates a flexbox layout that can switch
 * between horizontal and vertical orientation at breakpoints.
 *
 * @example
 * // Stack that's vertical on mobile, horizontal on tablet+
 * <ResponsiveStack direction="vertical" switchAt="md" gap="md">
 *   <Button>Cancel</Button>
 *   <Button>Save</Button>
 * </ResponsiveStack>
 */
const ResponsiveStack = React.forwardRef<HTMLDivElement, ResponsiveStackProps>(
  (
    {
      className,
      direction = "vertical",
      switchAt,
      gap = "md",
      align = "stretch",
      children,
      ...props
    },
    ref
  ) => {
    const baseDirection =
      direction === "vertical" ? "flex-col" : "flex-row";
    const switchDirection =
      direction === "vertical" ? "flex-row" : "flex-col";

    const switchClasses = switchAt && {
      sm: `sm:${switchDirection}`,
      md: `md:${switchDirection}`,
      lg: `lg:${switchDirection}`,
    };

    const gapClasses = {
      sm: "gap-2 sm:gap-3",
      md: "gap-3 sm:gap-4",
      lg: "gap-4 sm:gap-6",
    };

    const alignClasses = {
      start: "items-start",
      center: "items-center",
      end: "items-end",
      stretch: "items-stretch",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "flex",
          baseDirection,
          switchAt && switchClasses?.[switchAt],
          gapClasses[gap],
          alignClasses[align],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ResponsiveStack.displayName = "ResponsiveStack";

// =============================================================================
// EXPORTS
// =============================================================================

export {
  ResponsiveContainer,
  ResponsivePage,
  ResponsiveSection,
  ResponsiveGrid,
  ResponsiveStack,
  responsiveContainerVariants,
};
