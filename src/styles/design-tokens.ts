/**
 * =============================================================================
 * DESIGN TOKENS - Système de design scalable et maintenable
 * =============================================================================
 *
 * Ce fichier centralise tous les tokens de design pour :
 * - Cohérence visuelle à travers l'application
 * - Facilité de maintenance et de theming
 * - Type safety avec TypeScript
 * - Support dark mode
 * - Accessibilité (contrastes, tailles)
 *
 * Usage :
 * - CSS : Utiliser les variables CSS définies dans design-tokens.css
 * - JS/TS : Importer depuis ce fichier pour la logique conditionnelle
 *
 * @example
 * import { colors, spacing, breakpoints } from '@/styles/design-tokens';
 *
 * // Dans du JSX avec style inline (rare, préférer Tailwind)
 * <div style={{ padding: spacing.md }}>
 *
 * // Dans du code conditionnel
 * if (window.innerWidth < breakpoints.md) { ... }
 */

// =============================================================================
// COLORS - Palette de couleurs SOS-Expat
// =============================================================================

export const colors = {
  // Brand colors
  brand: {
    primary: '#dc2626', // sos-red
    primaryLight: '#fecaca', // red-200
    primaryDark: '#b91c1c', // red-700
    secondary: '#1e40af', // blue-800
    secondaryLight: '#dbeafe', // blue-100
  },

  // Semantic colors
  semantic: {
    success: '#22c55e', // green-500
    successLight: '#dcfce7', // green-100
    warning: '#f59e0b', // amber-500
    warningLight: '#fef3c7', // amber-100
    error: '#ef4444', // red-500
    errorLight: '#fee2e2', // red-100
    info: '#3b82f6', // blue-500
    infoLight: '#dbeafe', // blue-100
  },

  // Neutral colors (gray scale)
  neutral: {
    white: '#ffffff',
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    black: '#000000',
  },

  // Provider type colors
  provider: {
    lawyer: '#8b5cf6', // violet-500
    lawyerLight: '#ede9fe', // violet-100
    expat: '#06b6d4', // cyan-500
    expatLight: '#cffafe', // cyan-100
  },

  // Status colors
  status: {
    pending: '#f59e0b', // amber-500
    pendingBg: '#fef3c7', // amber-100
    inProgress: '#3b82f6', // blue-500
    inProgressBg: '#dbeafe', // blue-100
    completed: '#22c55e', // green-500
    completedBg: '#dcfce7', // green-100
    cancelled: '#6b7280', // gray-500
    cancelledBg: '#f3f4f6', // gray-100
  },
} as const;

// =============================================================================
// SPACING - Système d'espacement cohérent
// =============================================================================

export const spacing = {
  /** 0px */
  0: '0',
  /** 4px - Micro spacing */
  xs: '0.25rem',
  /** 8px - Small spacing */
  sm: '0.5rem',
  /** 12px - Medium-small spacing */
  md: '0.75rem',
  /** 16px - Base spacing */
  base: '1rem',
  /** 20px - Medium spacing */
  lg: '1.25rem',
  /** 24px - Large spacing */
  xl: '1.5rem',
  /** 32px - Extra large spacing */
  '2xl': '2rem',
  /** 48px - Huge spacing */
  '3xl': '3rem',
  /** 64px - Maximum spacing */
  '4xl': '4rem',
} as const;

// =============================================================================
// TYPOGRAPHY - Système typographique
// =============================================================================

export const typography = {
  // Font families
  fontFamily: {
    sans: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  },

  // Font sizes (mobile-first, scales up on desktop)
  fontSize: {
    /** 10px */
    xs: '0.625rem',
    /** 12px */
    sm: '0.75rem',
    /** 14px */
    md: '0.875rem',
    /** 16px - Base (minimum for mobile inputs) */
    base: '1rem',
    /** 18px */
    lg: '1.125rem',
    /** 20px */
    xl: '1.25rem',
    /** 24px */
    '2xl': '1.5rem',
    /** 30px */
    '3xl': '1.875rem',
    /** 36px */
    '4xl': '2.25rem',
  },

  // Font weights
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  // Line heights
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
} as const;

// =============================================================================
// BREAKPOINTS - Points de rupture responsive
// =============================================================================

export const breakpoints = {
  /** 0px - Extra small (mobile portrait) */
  xs: 0,
  /** 640px - Small (mobile landscape, small tablets) */
  sm: 640,
  /** 768px - Medium (tablets) */
  md: 768,
  /** 1024px - Large (laptops, desktops) */
  lg: 1024,
  /** 1280px - Extra large (large desktops) */
  xl: 1280,
  /** 1536px - 2XL (ultra-wide) */
  '2xl': 1536,
} as const;

// Media query helpers
export const mediaQueries = {
  sm: `(min-width: ${breakpoints.sm}px)`,
  md: `(min-width: ${breakpoints.md}px)`,
  lg: `(min-width: ${breakpoints.lg}px)`,
  xl: `(min-width: ${breakpoints.xl}px)`,
  '2xl': `(min-width: ${breakpoints['2xl']}px)`,
  // Max-width queries (for mobile-first exceptions)
  maxSm: `(max-width: ${breakpoints.sm - 1}px)`,
  maxMd: `(max-width: ${breakpoints.md - 1}px)`,
  maxLg: `(max-width: ${breakpoints.lg - 1}px)`,
  // Feature queries
  touch: '(pointer: coarse)',
  mouse: '(pointer: fine)',
  reducedMotion: '(prefers-reduced-motion: reduce)',
  darkMode: '(prefers-color-scheme: dark)',
} as const;

// =============================================================================
// SHADOWS - Ombres et élévations
// =============================================================================

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  // Colored shadows for cards
  red: '0 4px 14px 0 rgb(220 38 38 / 0.25)',
  blue: '0 4px 14px 0 rgb(59 130 246 / 0.25)',
} as const;

// =============================================================================
// BORDER RADIUS - Arrondis des coins
// =============================================================================

export const borderRadius = {
  none: '0',
  sm: '0.125rem', // 2px
  DEFAULT: '0.25rem', // 4px
  md: '0.375rem', // 6px
  lg: '0.5rem', // 8px
  xl: '0.75rem', // 12px
  '2xl': '1rem', // 16px
  '3xl': '1.5rem', // 24px
  full: '9999px',
} as const;

// =============================================================================
// TRANSITIONS - Animations et transitions
// =============================================================================

export const transitions = {
  // Durées
  duration: {
    fast: '150ms',
    DEFAULT: '200ms',
    slow: '300ms',
    slower: '500ms',
  },

  // Timing functions
  easing: {
    DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)', // ease-out
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },

  // Preset transitions
  preset: {
    colors: 'color 200ms, background-color 200ms, border-color 200ms',
    transform: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    opacity: 'opacity 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    all: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

// =============================================================================
// Z-INDEX - Couches de superposition
// =============================================================================

export const zIndex = {
  /** Below everything */
  behind: -1,
  /** Default layer */
  base: 0,
  /** Slightly elevated */
  raised: 10,
  /** Dropdown menus */
  dropdown: 1000,
  /** Sticky elements */
  sticky: 1020,
  /** Fixed elements (bottom nav) */
  fixed: 1030,
  /** Modal backdrop */
  modalBackdrop: 1040,
  /** Modal content */
  modal: 1050,
  /** Popovers */
  popover: 1060,
  /** Tooltips */
  tooltip: 1070,
  /** Toast notifications */
  toast: 1080,
  /** Maximum (loading overlays) */
  max: 9999,
} as const;

// =============================================================================
// TOUCH TARGETS - Tailles minimales pour le tactile
// =============================================================================

export const touchTargets = {
  /** Minimum iOS/Android recommandé */
  minimum: '44px',
  /** Confortable pour la plupart des utilisateurs */
  comfortable: '48px',
  /** Large touch target */
  large: '56px',
} as const;

// =============================================================================
// SAFE AREAS - Zones sûres pour les appareils avec encoche
// =============================================================================

export const safeAreas = {
  top: 'env(safe-area-inset-top, 0px)',
  right: 'env(safe-area-inset-right, 0px)',
  bottom: 'env(safe-area-inset-bottom, 0px)',
  left: 'env(safe-area-inset-left, 0px)',
} as const;

// =============================================================================
// COMPONENT TOKENS - Tokens spécifiques aux composants
// =============================================================================

export const components = {
  // Header
  header: {
    height: '56px',
    heightLg: '64px',
  },

  // Bottom Navigation
  bottomNav: {
    height: '64px',
    iconSize: '24px',
  },

  // Sidebar
  sidebar: {
    width: '280px',
    widthCollapsed: '72px',
  },

  // Cards
  card: {
    padding: spacing.base,
    paddingLg: spacing.xl,
    borderRadius: borderRadius.xl,
  },

  // Buttons
  button: {
    heightSm: '32px',
    height: '40px',
    heightLg: '48px',
    minWidth: touchTargets.minimum,
  },

  // Inputs
  input: {
    height: '40px',
    heightLg: '48px',
    // Minimum 16px pour éviter le zoom sur iOS
    fontSize: typography.fontSize.base,
  },

  // Modals
  modal: {
    maxWidth: '500px',
    maxWidthLg: '800px',
  },
} as const;

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type ColorKey = keyof typeof colors;
export type SpacingKey = keyof typeof spacing;
export type BreakpointKey = keyof typeof breakpoints;
export type ShadowKey = keyof typeof shadows;
export type BorderRadiusKey = keyof typeof borderRadius;
export type ZIndexKey = keyof typeof zIndex;

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

const designTokens = {
  colors,
  spacing,
  typography,
  breakpoints,
  mediaQueries,
  shadows,
  borderRadius,
  transitions,
  zIndex,
  touchTargets,
  safeAreas,
  components,
};

export default designTokens;
