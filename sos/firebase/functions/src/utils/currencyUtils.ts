/**
 * currencyUtils.ts
 *
 * P2-10 FIX: Utilitaires centralisés pour les opérations sur les montants.
 *
 * Problème: Les arrondis sont effectués à plusieurs endroits avec des méthodes
 * différentes, ce qui peut causer des différences de centimes.
 *
 * Solution: Fonctions centralisées pour toutes les opérations monétaires.
 */

/**
 * Devises supportées
 */
export type SupportedCurrency = "EUR" | "USD" | "eur" | "usd";

/**
 * Configuration par devise
 */
const CURRENCY_CONFIG: Record<string, { decimals: number; minAmount: number; maxAmount: number }> = {
  EUR: { decimals: 2, minAmount: 0.50, maxAmount: 10000 },
  USD: { decimals: 2, minAmount: 0.50, maxAmount: 10000 },
};

/**
 * Arrondit un montant à 2 décimales (standard monétaire)
 * Utilise Math.round pour un arrondi au plus proche
 *
 * @example roundAmount(10.125) => 10.13
 * @example roundAmount(10.124) => 10.12
 */
export function roundAmount(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Convertit des euros en centimes
 * @example eurosToCents(49.99) => 4999
 */
export function eurosToCents(euros: number): number {
  return Math.round(euros * 100);
}

/**
 * Convertit des centimes en euros
 * @example centsToEuros(4999) => 49.99
 */
export function centsToEuros(cents: number): number {
  return roundAmount(cents / 100);
}

/**
 * Formate un montant pour affichage (ex: "49.99")
 * @example formatAmount(49.9) => "49.90"
 */
export function formatAmount(amount: number): string {
  return roundAmount(amount).toFixed(2);
}

/**
 * Formate un montant avec devise pour affichage (ex: "49.99 €")
 */
export function formatAmountWithCurrency(amount: number, currency: SupportedCurrency = "EUR"): string {
  const formatted = formatAmount(amount);
  const isUSD = currency.toUpperCase() === "USD";
  return isUSD ? `$${formatted}` : `${formatted} €`;
}

/**
 * Calcule le total à partir des composants (commission + provider)
 * avec arrondi correct
 */
export function calculateTotal(commissionAmount: number, providerAmount: number): number {
  return roundAmount(commissionAmount + providerAmount);
}

/**
 * Vérifie la cohérence des montants (total = commission + provider)
 * @returns L'écart en valeur absolue
 */
export function checkAmountCoherence(
  totalAmount: number,
  commissionAmount: number,
  providerAmount: number,
  toleranceCents: number = 2
): { isValid: boolean; difference: number; toleranceExceeded: boolean } {
  const expected = calculateTotal(commissionAmount, providerAmount);
  const difference = Math.abs(roundAmount(totalAmount) - expected);
  const toleranceEuros = toleranceCents / 100;

  return {
    isValid: difference <= toleranceEuros,
    difference,
    toleranceExceeded: difference > toleranceEuros,
  };
}

/**
 * Applique une réduction à un montant
 * @param amount - Montant original
 * @param discount - Montant de la réduction
 * @returns Montant après réduction (minimum 0)
 */
export function applyDiscount(amount: number, discount: number): number {
  return roundAmount(Math.max(0, amount - discount));
}

/**
 * Calcule un pourcentage d'un montant
 * @param amount - Montant de base
 * @param percentage - Pourcentage (ex: 10 pour 10%)
 * @returns Montant du pourcentage arrondi
 */
export function calculatePercentage(amount: number, percentage: number): number {
  return roundAmount((amount * percentage) / 100);
}

/**
 * Valide qu'un montant est dans les limites acceptées
 */
export function validateAmount(
  amount: number,
  currency: SupportedCurrency = "EUR"
): { isValid: boolean; error?: string } {
  const config = CURRENCY_CONFIG[currency.toUpperCase()] || CURRENCY_CONFIG.EUR;

  if (typeof amount !== "number" || isNaN(amount)) {
    return { isValid: false, error: "Montant invalide" };
  }

  if (amount < config.minAmount) {
    return { isValid: false, error: `Montant minimum: ${formatAmountWithCurrency(config.minAmount, currency)}` };
  }

  if (amount > config.maxAmount) {
    return { isValid: false, error: `Montant maximum: ${formatAmountWithCurrency(config.maxAmount, currency)}` };
  }

  return { isValid: true };
}

/**
 * Convertit un montant de centimes vers la devise principale
 * avec le bon nombre de décimales
 */
export function fromMinorUnits(amountInMinorUnits: number, currency: SupportedCurrency = "EUR"): number {
  const config = CURRENCY_CONFIG[currency.toUpperCase()] || CURRENCY_CONFIG.EUR;
  return amountInMinorUnits / Math.pow(10, config.decimals);
}

/**
 * Convertit un montant de la devise principale vers les centimes
 */
export function toMinorUnits(amount: number, currency: SupportedCurrency = "EUR"): number {
  const config = CURRENCY_CONFIG[currency.toUpperCase()] || CURRENCY_CONFIG.EUR;
  return Math.round(amount * Math.pow(10, config.decimals));
}
