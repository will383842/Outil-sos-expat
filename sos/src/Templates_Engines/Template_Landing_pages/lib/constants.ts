/**
 * ============================================================================
 * CONSTANTS - Template Landing Pages
 * ============================================================================
 *
 * Constantes globales pour les landing pages.
 * En harmonie avec le design system SOS Expat.
 */

// ============================================================================
// COULEURS (alignées sur Tailwind config SOS Expat)
// ============================================================================

export const COLORS = {
  // Primaire - Rouge SOS Expat
  primary: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',  // Principal
    600: '#dc2626',  // Hover
    700: '#b91c1c',  // Active
    800: '#991b1b',
    900: '#7f1d1d',
  },

  // Accent - Orange/Yellow pour CTAs
  accent: {
    400: '#fbbf24',
    500: '#f59e0b',  // CTA principal
    600: '#d97706',  // CTA hover
  },

  // Bleu - Secondaire
  blue: {
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
  },

  // Succès
  success: {
    50: '#ecfdf5',
    500: '#10b981',
    600: '#059669',
  },

  // Surfaces
  surface: {
    light: '#ffffff',
    subtle: '#f8fafc',
    muted: '#f1f5f9',
    dark: '#0f172a',
    darker: '#030712',
  },

  // Texte
  text: {
    primary: '#0f172a',
    secondary: '#475569',
    muted: '#94a3b8',
    inverse: '#ffffff',
  },
} as const;

// ============================================================================
// GRADIENTS (style SOS Expat)
// ============================================================================

export const GRADIENTS = {
  // CTA Principal (rouge-orange)
  primaryCta: 'from-red-600 via-red-500 to-orange-500',
  primaryCtaHover: 'from-red-700 via-red-600 to-orange-600',

  // Hero background
  heroDark: 'from-gray-900 via-gray-800 to-gray-900',
  heroAccent: 'from-red-500/10 via-transparent to-blue-500/10',

  // Sections
  sectionLight: 'from-white via-rose-50 to-white',
  sectionDark: 'from-gray-950 to-gray-900',

  // Trust badges
  trust: 'from-green-500 to-blue-500',
  trustAlt: 'from-blue-500 to-purple-500',

  // Texte gradient
  textPrimary: 'from-red-500 via-orange-500 to-yellow-500',
  textBlue: 'from-blue-600 to-purple-600',
  textGreen: 'from-green-500 to-blue-500',
} as const;

// ============================================================================
// ESPACEMENTS
// ============================================================================

export const SPACING = {
  section: {
    paddingY: 'py-16 sm:py-28 lg:py-32',
    paddingX: 'px-4 sm:px-6 lg:px-8',
  },
  container: {
    maxWidth: 'max-w-7xl',
    center: 'mx-auto',
  },
  gap: {
    cards: 'gap-6 sm:gap-8',
    items: 'gap-3 sm:gap-4',
  },
} as const;

// ============================================================================
// BREAKPOINTS (Tailwind)
// ============================================================================

export const BREAKPOINTS = {
  xs: 320,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

// ============================================================================
// Z-INDEX
// ============================================================================

export const Z_INDEX = {
  base: 0,
  content: 10,
  header: 40,
  sticky: 50,
  modal: 100,
  tooltip: 110,
} as const;

// ============================================================================
// ANIMATIONS TIMING
// ============================================================================

export const TIMING = {
  fast: 150,
  normal: 300,
  slow: 500,
  stagger: 100,
} as const;

// ============================================================================
// SEO CONSTANTS
// ============================================================================

export const SEO = {
  siteName: 'SOS Expat',
  baseUrl: 'https://sos-expat.com',
  logoUrl: 'https://sos-expat.com/sos-logo.webp',
  ogImageUrl: 'https://sos-expat.com/og-image.jpg',
  twitterHandle: '@sosexpat',
} as const;

// ============================================================================
// ACCESSIBILITY
// ============================================================================

export const A11Y = {
  minTouchTarget: 48, // pixels
  minContrastRatio: 4.5,
  focusRingWidth: 2,
  focusRingOffset: 2,
} as const;

// ============================================================================
// PERFORMANCE TARGETS
// ============================================================================

export const PERFORMANCE = {
  LCP: 2500, // ms
  FID: 100, // ms
  CLS: 0.1,
} as const;
