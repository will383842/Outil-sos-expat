/**
 * AI Assistant Accessibility Components
 * WCAG 2.1 AA Compliant Component Library
 *
 * This module exports all accessibility-related components and utilities
 * for the AI Assistant dashboard.
 *
 * Components:
 * - VisuallyHidden: Screen reader only text
 * - LiveRegion: Dynamic content announcements
 * - SkipLink: Skip navigation links
 *
 * @example
 * ```tsx
 * import {
 *   VisuallyHidden,
 *   LiveRegion,
 *   SkipLink,
 *   SkipLinkGroup,
 *   StandardSkipLinks,
 * } from './components/a11y';
 * ```
 */

// ============================================================================
// VISUALLY HIDDEN COMPONENT
// ============================================================================

export {
  VisuallyHidden,
  ScreenReaderOnly,
  SrOnly,
  useVisuallyHiddenStyles,
  default as VisuallyHiddenDefault,
} from './VisuallyHidden';

export type { VisuallyHiddenProps, VisuallyHiddenOwnProps } from './VisuallyHidden';

// ============================================================================
// LIVE REGION COMPONENT
// ============================================================================

export {
  LiveRegion,
  StatusRegion,
  AlertRegion,
  LogRegion,
  ProgressRegion,
  useLiveRegion,
  useLoadingAnnouncement,
  default as LiveRegionDefault,
} from './LiveRegion';

export type { LiveRegionProps, LiveRegionRole } from './LiveRegion';

// ============================================================================
// SKIP LINK COMPONENT
// ============================================================================

export {
  SkipLink,
  SkipLinkGroup,
  SkipToMainContent,
  SkipToNavigation,
  SkipToSearch,
  StandardSkipLinks,
  useSkipLinks,
  useSkipLink,
  default as SkipLinkDefault,
} from './SkipLink';

export type { SkipLinkProps, SkipLinkGroupProps, StandardSkipLinksProps, UseSkipLinksOptions } from './SkipLink';
