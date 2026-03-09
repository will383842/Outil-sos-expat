/**
 * Chatter Design Tokens — 2026 Design System
 * Indigo/Violet/Cyan palette with glassmorphism, motion tokens, and sidebar widgets.
 * Single source of truth for colors, spacing, typography, and component styles.
 *
 * COLOR PALETTE:
 *   Primary   — indigo-500 (#6366F1) → violet-500 (#8B5CF6)
 *   Accent    — cyan-500 (#06B6D4) → teal-500 (#14B8A6)
 *   Success   — emerald-500 (#10B981)
 *   Warning   — amber-500 (#F59E0B)
 *   Danger    — red-500 (#EF4444)
 *   Surface   — slate-900 (#0F172A), slate-800 (#1E293B)
 */

// ──────────────────────────────────────────────
// ANIMATION tokens
// ──────────────────────────────────────────────

export const ANIMATION = {
  /** Micro-interactions (button press, toggle) */
  fast: "duration-100 ease-out",
  /** Standard transitions (card hover, panel open) */
  normal: "duration-200 ease-out",
  /** Emphasised motion (page transition, modal) */
  slow: "duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
  /** Spring-like entrance for toasts / popovers */
  spring: "duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
  /** Fade in */
  fadeIn: "animate-[fadeIn_0.25s_ease-out_forwards]",
  /** Slide up entrance */
  slideUp: "animate-[slideUp_0.3s_ease-out_forwards]",
  /** Pulse glow (notifications, live indicators) */
  pulseGlow: "animate-[pulseGlow_2s_ease-in-out_infinite]",
  /** Skeleton shimmer */
  shimmer: "animate-[shimmer_1.8s_ease-in-out_infinite]",
} as const;

// ──────────────────────────────────────────────
// UI — core component tokens
// ──────────────────────────────────────────────

export const UI = {
  // ── Cards ──────────────────────────────────
  card: "bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl border border-slate-200/60 dark:border-white/[0.06] rounded-2xl shadow-sm shadow-indigo-500/[0.03] transition-all duration-200",
  cardHover: "transition-all duration-200 ease-out hover:border-indigo-300/40 dark:hover:border-indigo-400/20 hover:shadow-md hover:shadow-indigo-500/[0.06] hover:-translate-y-0.5",
  cardHighlight: "bg-gradient-to-br from-indigo-500/5 to-violet-500/5 dark:from-indigo-500/10 dark:to-violet-500/10 border-indigo-200/50 dark:border-indigo-500/20",

  // ── Glass variants ─────────────────────────
  glass: "bg-white/[0.03] backdrop-blur-2xl border border-white/[0.06] rounded-2xl",
  glassCard: "bg-white/[0.05] dark:bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] dark:border-white/[0.06] rounded-2xl shadow-lg shadow-black/5",
  bottomSheet: "bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border-t border-slate-200/60 dark:border-white/[0.08] rounded-t-3xl shadow-2xl shadow-black/20",

  // ── Radius ─────────────────────────────────
  radiusSm: "rounded-lg",
  radiusMd: "rounded-xl",
  radiusLg: "rounded-2xl",
  radiusFull: "rounded-full",

  // ── Text ───────────────────────────────────
  textPrimary: "text-slate-900 dark:text-slate-50",
  textSecondary: "text-slate-500 dark:text-slate-400",
  textMuted: "text-slate-400 dark:text-slate-500",

  // ── Skeleton ───────────────────────────────
  skeleton: "relative overflow-hidden bg-slate-200 dark:bg-white/10 rounded animate-pulse",

  // ── Buttons ────────────────────────────────
  button: {
    primary: "bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white font-medium rounded-xl transition-all duration-200 active:scale-[0.97] focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/30",
    secondary: "bg-white/80 dark:bg-white/[0.05] backdrop-blur-lg border border-slate-200/60 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 font-medium rounded-xl transition-all duration-200",
    ghost: "bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-all duration-200",
    accent: "bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-medium rounded-xl transition-all duration-200 active:scale-[0.97] focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-cyan-500/25",
  },
} as const;

// ──────────────────────────────────────────────
// CHATTER_THEME — header / accent branding
// ──────────────────────────────────────────────

export const CHATTER_THEME = {
  header: "bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 text-white",
  accent: "from-indigo-500 to-violet-500",
  accentBg: "bg-gradient-to-r from-indigo-500 to-violet-500",
  accentText: "bg-gradient-to-r from-indigo-500 to-violet-600 bg-clip-text text-transparent",
} as const;

// Bottom nav items count (for pb-safe spacing)
export const BOTTOM_NAV_HEIGHT = "pb-20";

// ──────────────────────────────────────────────
// SEMANTIC COLOR SETS (kept for backward compat)
// ──────────────────────────────────────────────

// Level colors (1–5)
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
  available: { border: "border-l-4 border-l-emerald-500", icon: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
  pending: { border: "border-l-4 border-l-amber-500", icon: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10" },
  locked: { border: "border-l-4 border-l-indigo-500", icon: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-500/10" },
} as const;

// Streak colors
export const STREAK_COLORS = {
  none: "text-slate-400",
  low: "text-slate-400",        // 1–6 days
  medium: "text-cyan-500",      // 7–13 days
  high: "text-indigo-500",      // 14–29 days
  legendary: "text-violet-500", // 30+ days
} as const;

export function getStreakColor(days: number): string {
  if (days >= 30) return STREAK_COLORS.legendary;
  if (days >= 14) return STREAK_COLORS.high;
  if (days >= 7) return STREAK_COLORS.medium;
  if (days >= 1) return STREAK_COLORS.low;
  return STREAK_COLORS.none;
}

// ──────────────────────────────────────────────
// MONEY TOKENS — Financial elements styling
// ──────────────────────────────────────────────

export const MONEY = {
  /** Card with golden/amber tint for financial amounts */
  card: "bg-gradient-to-br from-amber-500/10 to-yellow-500/5 dark:from-amber-500/10 dark:to-yellow-500/5 border border-amber-500/15 rounded-2xl",
  /** Hero money amount (dashboard total) */
  heroAmount: "text-[clamp(2rem,6vw,3rem)] font-extrabold tabular-nums tracking-tight text-amber-300",
  /** Card-level money amount */
  cardAmount: "text-[clamp(1.25rem,3vw,1.75rem)] font-bold tabular-nums text-emerald-500",
  /** Inline money amount */
  inlineAmount: "text-base font-semibold tabular-nums text-emerald-500",
  /** Positive trend */
  positive: "text-emerald-500",
  /** Negative trend */
  negative: "text-red-500",
  /** Pending/waiting */
  pending: "text-amber-500",
} as const;

// ──────────────────────────────────────────────
// INPUT TOKENS — Form elements
// ──────────────────────────────────────────────

export const INPUT = {
  base: "bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200 min-h-[48px]",
  select: "bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 py-3 text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200 min-h-[48px]",
  label: "text-sm font-medium text-slate-300 mb-1.5 block",
  error: "text-xs text-red-400 mt-1",
} as const;

// ──────────────────────────────────────────────
// TYPOGRAPHY helpers
// ──────────────────────────────────────────────

export const TYPOGRAPHY = {
  amountLarge: "text-4xl font-extrabold text-emerald-500 tracking-tight",
  amountMedium: "text-2xl font-bold text-emerald-500",
  amountSmall: "text-base font-semibold text-emerald-500",
  /** Hero headline — page titles */
  heroTitle: "text-[clamp(1.5rem,4vw,2.25rem)] font-extrabold tracking-tight",
  /** Section headline — card groups */
  sectionTitle: "text-lg font-bold text-slate-900 dark:text-white tracking-tight",
  sectionSubtitle: "text-sm text-slate-500 dark:text-slate-400",
  /** Card headline */
  cardTitle: "text-[clamp(0.875rem,2vw,1.125rem)] font-semibold tracking-tight",
  label: "text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500",
  affiliateCode: "font-mono text-sm font-bold tracking-wide",
  /** Gradient headline for feature callouts */
  gradientHeadline: "text-2xl font-extrabold bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent tracking-tight",
  /** Caption / secondary text */
  caption: "text-[clamp(0.6875rem,1.2vw,0.8125rem)] text-slate-400 dark:text-slate-500",
} as const;

// ──────────────────────────────────────────────
// FLUID TYPOGRAPHY — clamp()-based mobile↔desktop scaling
// ──────────────────────────────────────────────

export const FLUID_TYPOGRAPHY = {
  /** Hero / page titles: 24px → 36px */
  heroTitle: "text-[clamp(1.5rem,4vw,2.25rem)]",
  /** Card titles: 14px → 18px */
  cardTitle: "text-[clamp(0.875rem,2vw,1.125rem)]",
  /** Large values (balances, amounts): 20px → 30px */
  cardValue: "text-[clamp(1.25rem,3vw,1.875rem)]",
  /** Body text: 13px → 15px */
  body: "text-[clamp(0.8125rem,1.5vw,0.9375rem)]",
  /** Captions / secondary text: 11px → 13px */
  caption: "text-[clamp(0.6875rem,1.2vw,0.8125rem)]",
  /** Badges / tags: 10px → 12px */
  badge: "text-[clamp(0.625rem,1vw,0.75rem)]",
} as const;

// ──────────────────────────────────────────────
// SPACING
// ──────────────────────────────────────────────

export const SPACING = {
  cardPadding: "p-4 sm:p-5",
  cardGap: "gap-3 sm:gap-4",
  pagePadding: "px-4 sm:px-6",
  sectionMargin: "mt-6",
  touchTarget: "min-h-[44px] min-w-[44px]",
} as const;

// ──────────────────────────────────────────────
// SIDEBAR TOKENS — balance widget, piggy bank, affiliate links
// ──────────────────────────────────────────────

export const SIDEBAR_TOKENS = {
  /** Wrapper for the entire sidebar */
  container: "flex flex-col gap-3 p-3",

  /** Balance display widget */
  balanceWidget: {
    wrapper: "bg-white/[0.04] dark:bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-4 space-y-3",
    totalLabel: "text-xs font-medium uppercase tracking-wider text-slate-400",
    totalAmount: "text-3xl font-extrabold text-emerald-400 tracking-tight",
    row: "flex items-center justify-between text-sm",
    rowLabel: "text-slate-400",
    rowValue: "font-semibold text-slate-200",
    progressBar: "h-1.5 rounded-full bg-slate-700 overflow-hidden",
    progressFill: "h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500",
    belowThreshold: "text-amber-400 text-xs font-medium",
  },

  /** Piggy bank mini widget */
  piggyBank: {
    wrapper: "bg-gradient-to-br from-indigo-500/10 to-violet-500/10 dark:from-indigo-500/[0.08] dark:to-violet-500/[0.08] backdrop-blur-xl border border-indigo-300/20 dark:border-indigo-500/15 rounded-2xl p-4 space-y-2",
    icon: "text-3xl",
    title: "text-sm font-bold text-slate-800 dark:text-slate-100",
    amount: "text-xl font-extrabold text-emerald-500",
    subtitle: "text-xs text-slate-500 dark:text-slate-400",
    action: "mt-2 w-full text-center bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-semibold rounded-xl py-2 transition-all duration-200 hover:shadow-md hover:shadow-indigo-500/25 active:scale-[0.97]",
  },

  /** Affiliate link cards */
  affiliateLink: {
    wrapper: "bg-white/[0.04] dark:bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-xl p-3 flex items-center gap-3 group cursor-pointer transition-all duration-200 hover:bg-white/[0.07] hover:border-cyan-400/20",
    icon: "flex-shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center text-cyan-400",
    title: "text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-400 transition-colors",
    subtitle: "text-xs text-slate-500 dark:text-slate-400",
    copyBadge: "ml-auto flex-shrink-0 text-xs font-medium text-cyan-500 bg-cyan-500/10 rounded-full px-2 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
  },

  /** Section divider inside sidebar */
  divider: "border-t border-white/[0.06] my-2",
} as const;
