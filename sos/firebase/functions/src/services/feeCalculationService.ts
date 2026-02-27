// firebase/functions/src/services/feeCalculationService.ts
import { db as firestore } from '../utils/firebase';

/* ==================== Types ==================== */

export interface ProcessorFeeRate {
  percentageFee: number;   // ex: 0.029 = 2.9%
  fixedFee: number;        // ex: 0.25 (en devise)
  fxFeePercent: number;    // ex: 0.01 = 1% (frais de conversion devise)
}

export interface PayoutFeeRate {
  percentageFee: number;   // ex: 0.02 = 2%
  fixedFee: number;        // ex: 0 (en devise)
  maxFee: number;          // ex: 20 (plafond en devise)
}

export interface WithdrawalFeeConfig {
  fixedFee: number;        // Frais fixe par retrait (en devise, ex: 3 = 3$)
  currency: string;        // Devise (ex: 'USD')
}

export interface FeeConfig {
  stripe: {
    eur: ProcessorFeeRate;
    usd: ProcessorFeeRate;
  };
  paypal: {
    eur: ProcessorFeeRate;
    usd: ProcessorFeeRate;
    payoutFee: PayoutFeeRate;
  };
  withdrawalFees: WithdrawalFeeConfig;
}

export interface EstimatedFees {
  processingFee: number;   // Frais de traitement du processeur (sur le montant total)
  payoutFee: number;       // Frais de payout (PayPal uniquement, sur montant provider)
  totalFees: number;       // processingFee + payoutFee
  providerNetAmount: number; // providerAmount - totalFees
}

export interface FeeBreakdown {
  gateway: 'stripe' | 'paypal';
  currency: string;
  processingFee: number;
  payoutFee: number;
  totalFees: number;
  providerGrossAmount: number;
  providerNetAmount: number;
  feeConfig: ProcessorFeeRate;
}

/* ==================== Valeurs par défaut ==================== */

const DEFAULT_FEE_CONFIG: FeeConfig = {
  stripe: {
    eur: { percentageFee: 0.029, fixedFee: 0.25, fxFeePercent: 0.01 },
    usd: { percentageFee: 0.029, fixedFee: 0.30, fxFeePercent: 0.01 },
  },
  paypal: {
    eur: { percentageFee: 0.029, fixedFee: 0.35, fxFeePercent: 0.03 },
    usd: { percentageFee: 0.029, fixedFee: 0.49, fxFeePercent: 0.03 },
    payoutFee: { percentageFee: 0.02, fixedFee: 0, maxFee: 20 },
  },
  withdrawalFees: { fixedFee: 3, currency: 'USD' },
};

/* ==================== Cache ==================== */

let cachedConfig: FeeConfig | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/* ==================== Service ==================== */

/**
 * Récupère la config des frais depuis Firestore (admin_config/fees) avec cache 5 min.
 * Fallback sur les valeurs par défaut si le document n'existe pas ou est invalide.
 */
export async function getFeeConfig(): Promise<FeeConfig> {
  const now = Date.now();
  if (cachedConfig && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return cachedConfig;
  }

  try {
    const doc = await firestore.doc('admin_config/fees').get();
    if (doc.exists) {
      const data = doc.data() as FeeConfig;
      if (isValidFeeConfig(data)) {
        // Rétrocompatibilité : si withdrawalFees manquant, utiliser la valeur par défaut
        if (!data.withdrawalFees) {
          data.withdrawalFees = DEFAULT_FEE_CONFIG.withdrawalFees;
        }
        cachedConfig = data;
        cacheTimestamp = now;
        return data;
      }
      console.warn('[feeCalculationService] Config fees invalide, utilisation du fallback');
    }
  } catch (error) {
    console.error('[feeCalculationService] Erreur lecture config fees:', error);
  }

  cachedConfig = DEFAULT_FEE_CONFIG;
  cacheTimestamp = now;
  return DEFAULT_FEE_CONFIG;
}

/**
 * Arrondi à 2 décimales (centimes). Retourne 0 si la valeur n'est pas un nombre fini.
 */
export function roundAmount(n: number): number {
  if (!isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/**
 * Calcule les frais estimés pour une transaction.
 *
 * @param gateway - 'stripe' ou 'paypal'
 * @param totalAmount - Montant total payé par le client (en devise, pas en cents)
 * @param providerAmount - Montant brut destiné au prestataire (en devise)
 * @param currency - 'eur' ou 'usd'
 * @returns EstimatedFees avec le breakdown des frais
 */
export async function calculateEstimatedFees(
  gateway: 'stripe' | 'paypal',
  totalAmount: number,
  providerAmount: number,
  currency: string,
): Promise<EstimatedFees> {
  const config = await getFeeConfig();
  const cur = (currency || 'eur').toLowerCase() as 'eur' | 'usd';

  // Frais de traitement du processeur (appliqués sur le montant total de la transaction)
  const processorRate: ProcessorFeeRate = gateway === 'stripe'
    ? (config.stripe[cur] || config.stripe.eur)
    : (config.paypal[cur] || config.paypal.eur);

  // P1-2 FIX: Inclure fxFeePercent (frais cross-border) dans le calcul.
  // Stripe: +1% sur transactions cross-border, PayPal: +3%.
  // Appliqué en worst-case (estimation haute) pour éviter de sous-estimer les frais
  // et que la plateforme absorbe la différence.
  const effectivePercentage = processorRate.percentageFee + (processorRate.fxFeePercent || 0);
  const processingFee = roundAmount(
    totalAmount * effectivePercentage + processorRate.fixedFee
  );

  // Frais de payout (PayPal uniquement, appliqués sur le montant provider)
  let payoutFee = 0;
  if (gateway === 'paypal' && config.paypal.payoutFee) {
    const payoutRate = config.paypal.payoutFee;
    const rawPayoutFee = providerAmount * payoutRate.percentageFee + payoutRate.fixedFee;
    payoutFee = roundAmount(Math.min(rawPayoutFee, payoutRate.maxFee));
  }

  const totalFees = roundAmount(processingFee + payoutFee);
  // Garantir que le montant net ne soit jamais négatif (cas extrême: frais > montant provider)
  const providerNetAmount = Math.max(0, roundAmount(providerAmount - totalFees));

  return {
    processingFee,
    payoutFee,
    totalFees,
    providerNetAmount,
  };
}

/**
 * Invalide le cache (utilisé après modification admin)
 */
export function clearFeeConfigCache(): void {
  cachedConfig = null;
  cacheTimestamp = 0;
}

/**
 * Récupère la config des frais de retrait des commissions affiliés.
 * Retourne le montant fixe et la devise (ex: { fixedFee: 3, currency: 'USD' }).
 */
export async function getWithdrawalFee(): Promise<WithdrawalFeeConfig> {
  const config = await getFeeConfig();
  return config.withdrawalFees;
}

/* ==================== Validation ==================== */

function isValidProcessorFeeRate(rate: unknown): rate is ProcessorFeeRate {
  if (!rate || typeof rate !== 'object') return false;
  const r = rate as Record<string, unknown>;
  return (
    typeof r.percentageFee === 'number' && isFinite(r.percentageFee) && r.percentageFee >= 0 && r.percentageFee <= 1 &&
    typeof r.fixedFee === 'number' && isFinite(r.fixedFee) && r.fixedFee >= 0 &&
    typeof r.fxFeePercent === 'number' && isFinite(r.fxFeePercent) && r.fxFeePercent >= 0 && r.fxFeePercent <= 1
  );
}

function isValidPayoutFeeRate(rate: unknown): rate is PayoutFeeRate {
  if (!rate || typeof rate !== 'object') return false;
  const r = rate as Record<string, unknown>;
  return (
    typeof r.percentageFee === 'number' && isFinite(r.percentageFee) && r.percentageFee >= 0 && r.percentageFee <= 1 &&
    typeof r.fixedFee === 'number' && isFinite(r.fixedFee) && r.fixedFee >= 0 &&
    typeof r.maxFee === 'number' && isFinite(r.maxFee) && r.maxFee >= 0
  );
}

function isValidWithdrawalFeeConfig(config: unknown): config is WithdrawalFeeConfig {
  if (!config || typeof config !== 'object') return false;
  const c = config as Record<string, unknown>;
  return (
    typeof c.fixedFee === 'number' && isFinite(c.fixedFee) && c.fixedFee >= 0 &&
    typeof c.currency === 'string' && c.currency.length > 0
  );
}

function isValidFeeConfig(data: unknown): data is FeeConfig {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  const stripe = d.stripe as Record<string, unknown> | undefined;
  const paypal = d.paypal as Record<string, unknown> | undefined;

  // withdrawalFees est optionnel pour la rétrocompatibilité (documents existants sans ce champ)
  const hasValidWithdrawalFees = !d.withdrawalFees || isValidWithdrawalFeeConfig(d.withdrawalFees);

  return !!(
    stripe &&
    isValidProcessorFeeRate(stripe.eur) &&
    isValidProcessorFeeRate(stripe.usd) &&
    paypal &&
    isValidProcessorFeeRate(paypal.eur) &&
    isValidProcessorFeeRate(paypal.usd) &&
    isValidPayoutFeeRate(paypal.payoutFee) &&
    hasValidWithdrawalFees
  );
}
