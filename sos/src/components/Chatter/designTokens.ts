/**
 * Chatter Design Tokens - Centralized design system for all Chatter components
 * Single source of truth for glassmorphism, gradients, spacing, and animations.
 */

export const UI = {
  // Cards
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  cardHover: "transition-all duration-300 ease-out hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-white/5 hover:-translate-y-1",

  // Radius
  radiusSm: "rounded-lg",
  radiusMd: "rounded-xl",
  radiusFull: "rounded-full",

  // Text
  textMuted: "text-gray-500 dark:text-gray-400",
  textPrimary: "text-gray-900 dark:text-white",

  // Skeleton / shimmer
  skeleton: `relative overflow-hidden bg-gray-200 dark:bg-white/10 rounded before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent dark:before:via-white/10`,

  // Buttons
  button: {
    primary: "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all active:scale-[0.98]",
    secondary: "bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/15 font-medium rounded-xl transition-all",
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
