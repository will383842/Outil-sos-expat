/** Shared design tokens and utilities for commission tabs */

export const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
  },
  input: "w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white",
  label: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1",
} as const;

export const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export const centsToInput = (cents: number) => (cents / 100).toFixed(2);

export const inputToCents = (val: string) => Math.round(parseFloat(val || '0') * 100);
