/**
 * Chatter Design Tokens - Centralized design system for all Chatter components
 * Single source of truth for colors, spacing, typography, and component styles.
 */

// === BACKWARD-COMPATIBLE EXPORTS ===

export const UI = {
  // Cards - Light-first design
  card: "bg-white dark:bg-white/5 border border-slate-200 dark:border-white/8 rounded-2xl shadow-sm transition-colors duration-200",
  cardHover: "transition-all duration-200 ease-out hover:border-slate-300 dark:hover:border-white/15 hover:shadow-md",
  cardHighlight: "bg-gradient-to-br from-red-500/5 to-orange-500/5 dark:from-red-500/10 dark:to-orange-500/10 border-red-200/50 dark:border-red-500/20",

  // Radius
  radiusSm: "rounded-lg",
  radiusMd: "rounded-xl",
  radiusLg: "rounded-2xl",
  radiusFull: "rounded-full",

  // Text
  textPrimary: "text-slate-900 dark:text-slate-50",
  textSecondary: "text-slate-500 dark:text-slate-400",
  textMuted: "text-slate-400 dark:text-slate-500",

  // Skeleton
  skeleton: "relative overflow-hidden bg-slate-200 dark:bg-white/10 rounded animate-pulse",

  // Buttons
  button: {
    primary: "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all active:scale-[0.98] focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
    secondary: "bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 font-medium rounded-xl transition-all",
    ghost: "bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-all",
  },
} as const;

export const CHATTER_THEME = {
  header: "bg-gradient-to-r from-red-500 via-orange-500 to-red-500 text-white",
  accent: "from-red-500 to-orange-500",
  accentBg: "bg-gradient-to-r from-red-500 to-orange-500",
  accentText: "bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent",
} as const;

// Bottom nav items count (for pb-safe spacing)
export const BOTTOM_NAV_HEIGHT = "pb-20";

// === NEW TOKENS ===

// Level colors (1-5)
export const LEVEL_COLORS = {
  1: { bg: "bg-gray-100 dark:bg-gray-500/15", text: "text-gray-600 dark:text-gray-400", border: "border-gray-300", name: "Debutant" },
  2: { bg: "bg-blue-50 dark:bg-blue-500/15", text: "text-blue-600 dark:text-blue-400", border: "border-blue-300", name: "Intermediaire" },
  3: { bg: "bg-violet-50 dark:bg-violet-500/15", text: "text-violet-600 dark:text-violet-400", border: "border-violet-300", name: "Avance" },
  4: { bg: "bg-orange-50 dark:bg-orange-500/15", text: "text-orange-600 dark:text-orange-400", border: "border-orange-300", name: "Expert" },
  5: { bg: "bg-yellow-50 dark:bg-yellow-500/15", text: "text-yellow-600 dark:text-yellow-400", border: "border-yellow-300", name: "Elite" },
} as const;

// Captain tier colors
export const TIER_COLORS = {
  bronze: { bg: "bg-amber-50 dark:bg-amber-600/15", text: "text-amber-700 dark:text-amber-400", border: "border-amber-200", gradient: "from-amber-600 to-amber-800" },
  silver: { bg: "bg-gray-50 dark:bg-gray-500/15", text: "text-gray-600 dark:text-gray-400", border: "border-gray-200", gradient: "from-gray-400 to-gray-600" },
  gold: { bg: "bg-yellow-50 dark:bg-yellow-500/15", text: "text-yellow-700 dark:text-yellow-400", border: "border-yellow-200", gradient: "from-yellow-400 to-yellow-700" },
  platinum: { bg: "bg-cyan-50 dark:bg-cyan-500/15", text: "text-cyan-700 dark:text-cyan-400", border: "border-cyan-200", gradient: "from-cyan-400 to-cyan-600" },
  diamond: { bg: "bg-purple-50 dark:bg-purple-500/15", text: "text-purple-700 dark:text-purple-400", border: "border-purple-200", gradient: "from-purple-400 to-purple-700" },
} as const;

// Commission type colors
export const COMMISSION_COLORS = {
  client_call: "text-green-500",
  n1_call: "text-blue-500",
  n2_call: "text-indigo-500",
  provider_call: "text-teal-500",
  bonus: "text-yellow-500",
  captain_call: "text-purple-500",
  manual: "text-gray-500",
} as const;

// Balance card variants
export const BALANCE_VARIANTS = {
  available: { border: "border-l-4 border-l-green-500", icon: "text-green-500", bg: "bg-green-50 dark:bg-green-500/10" },
  pending: { border: "border-l-4 border-l-amber-500", icon: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10" },
  locked: { border: "border-l-4 border-l-indigo-500", icon: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-500/10" },
} as const;

// Streak colors
export const STREAK_COLORS = {
  none: "text-slate-400",
  low: "text-slate-400",      // 1-6 days
  medium: "text-orange-500",  // 7-13 days
  high: "text-red-500",       // 14-29 days
  legendary: "text-purple-500", // 30+ days
} as const;

export function getStreakColor(days: number): string {
  if (days >= 30) return STREAK_COLORS.legendary;
  if (days >= 14) return STREAK_COLORS.high;
  if (days >= 7) return STREAK_COLORS.medium;
  if (days >= 1) return STREAK_COLORS.low;
  return STREAK_COLORS.none;
}

// Typography helpers
export const TYPOGRAPHY = {
  amountLarge: "text-4xl font-extrabold text-green-500",
  amountMedium: "text-2xl font-bold text-green-500",
  amountSmall: "text-base font-semibold text-green-500",
  sectionTitle: "text-lg font-bold text-slate-900 dark:text-white tracking-tight",
  sectionSubtitle: "text-sm text-slate-500 dark:text-slate-400",
  label: "text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500",
  affiliateCode: "font-mono text-sm font-bold tracking-wide",
} as const;

// Spacing
export const SPACING = {
  cardPadding: "p-4 sm:p-5",
  cardGap: "gap-3 sm:gap-4",
  pagePadding: "px-4 sm:px-6",
  sectionMargin: "mt-6",
  touchTarget: "min-h-[44px] min-w-[44px]",
} as const;
