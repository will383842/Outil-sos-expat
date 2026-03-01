import type { CurrencyRate } from '@/types/finance';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

// Fallback rate if Firestore unavailable
const FALLBACK_RATES: CurrencyRate[] = [
  { base: 'EUR', quote: 'USD', rate: 1.08, asOf: new Date().toISOString() },
];

// Cache: fetched rates from Firestore
let cachedRates: CurrencyRate[] | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Fetch latest ECB rates from Firestore exchange_rates collection
 */
async function fetchEcbRates(): Promise<CurrencyRate[]> {
  if (cachedRates && Date.now() < cacheExpiry) {
    return cachedRates;
  }

  try {
    // Try today first, then yesterday (ECB publishes weekdays only)
    const today = new Date();
    for (let i = 0; i <= 3; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      const docRef = doc(db, 'exchange_rates', dateStr);
      const snapshot = await getDoc(docRef);

      if (snapshot.exists()) {
        const data = snapshot.data();
        const rates: CurrencyRate[] = [];

        if (data.rates && typeof data.rates === 'object') {
          for (const [currency, rate] of Object.entries(data.rates)) {
            if (currency !== 'EUR' && typeof rate === 'number') {
              rates.push({
                base: 'EUR',
                quote: currency as 'USD',
                rate,
                asOf: dateStr,
              });
            }
          }
        }

        if (rates.length > 0) {
          cachedRates = rates;
          cacheExpiry = Date.now() + CACHE_TTL_MS;
          return rates;
        }
      }
    }
  } catch {
    // Firestore read failed, use fallback
  }

  return FALLBACK_RATES;
}

/**
 * Convert amount between currencies using ECB rates
 */
export function convert(amount: number, from: string, to: string, rates: CurrencyRate[] = cachedRates || FALLBACK_RATES): number {
  if (from === to) return amount;
  const r = rates.find(x => x.base === to && x.quote === from) || rates.find(x => x.base === from && x.quote === to);
  if (!r) return amount;
  return r.base === to ? amount / r.rate : amount * r.rate;
}

/**
 * Convert with async rate fetching from Firestore
 */
export async function convertAsync(amount: number, from: string, to: string): Promise<number> {
  const rates = await fetchEcbRates();
  return convert(amount, from, to, rates);
}

/**
 * Get the current EUR/USD rate
 */
export async function getEurUsdRate(): Promise<number> {
  const rates = await fetchEcbRates();
  const usdRate = rates.find(r => r.base === 'EUR' && r.quote === 'USD');
  return usdRate?.rate || 1.08;
}

export { fetchEcbRates };
