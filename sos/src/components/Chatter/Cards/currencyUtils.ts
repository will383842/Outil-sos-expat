/**
 * Currency Utilities for Chatter Components
 *
 * All monetary values in the system are stored in USD cents.
 * This utility provides consistent formatting for display.
 */

/**
 * Format cents to USD display format
 * @param cents - Amount in cents (e.g., 1000 = $10.00)
 * @returns Formatted USD string (e.g., "$10.00")
 */
export function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  return `$${dollars.toFixed(2)}`;
}

/**
 * Format cents to USD display format without decimal places
 * Useful for displaying whole dollar amounts
 * @param cents - Amount in cents (e.g., 1000 = $10)
 * @returns Formatted USD string (e.g., "$10")
 */
export function formatCurrencyWhole(cents: number): string {
  const dollars = cents / 100;
  return `$${dollars.toFixed(0)}`;
}

/**
 * Format cents to USD display format with compact notation for large amounts
 * @param cents - Amount in cents
 * @returns Formatted USD string (e.g., "$1.5k" for $1500)
 */
export function formatCurrencyCompact(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1000) {
    return `$${(dollars / 1000).toFixed(1)}k`;
  }
  return `$${dollars.toFixed(0)}`;
}

/**
 * Format cents to USD using Intl.NumberFormat for locale-aware formatting
 * @param cents - Amount in cents
 * @param locale - Locale string (e.g., 'en-US', 'fr-FR')
 * @returns Formatted USD string with locale-specific number formatting
 */
export function formatCurrencyLocale(cents: number, locale: string = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/**
 * Format cents to USD using Intl.NumberFormat without decimals
 * @param cents - Amount in cents
 * @param locale - Locale string (e.g., 'en-US', 'fr-FR')
 * @returns Formatted USD string with locale-specific number formatting, no decimals
 */
export function formatCurrencyLocaleWhole(cents: number, locale: string = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
