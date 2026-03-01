/**
 * Service de taux de change ECB - SOS-Expat OU
 *
 * Recupere les taux de change officiels de la Banque Centrale Europeenne.
 * Obligation legale: comptabilite estonienne en EUR avec taux BCE du jour.
 *
 * @module accounting/ecbExchangeRateService
 */

import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions/v2';

// =============================================================================
// CONFIGURATION
// =============================================================================

const ECB_DAILY_URL = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';
const ECB_HIST_URL = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist.xml';
const COLLECTION = 'exchange_rates';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

// =============================================================================
// TYPES
// =============================================================================

export interface ExchangeRateDoc {
  date: string; // YYYY-MM-DD
  rates: Record<string, number>; // currency code -> rate vs EUR
  source: 'ECB';
  fetchedAt: FirebaseFirestore.Timestamp;
}

// =============================================================================
// CACHE MEMOIRE
// =============================================================================

interface CacheEntry {
  rates: Record<string, number>;
  fetchedAt: number;
}

const memoryCache: Map<string, CacheEntry> = new Map();

// =============================================================================
// INITIALISATION
// =============================================================================

const IS_DEPLOYMENT_ANALYSIS =
  !process.env.K_REVISION &&
  !process.env.K_SERVICE &&
  !process.env.FUNCTION_TARGET &&
  !process.env.FUNCTIONS_EMULATOR;

function getDb() {
  if (!IS_DEPLOYMENT_ANALYSIS && !admin.apps.length) {
    admin.initializeApp();
  }
  return admin.firestore();
}

// =============================================================================
// PARSE XML ECB
// =============================================================================

/**
 * Parse le XML ECB pour extraire les taux de change.
 * Format: <Cube time="YYYY-MM-DD"><Cube currency="USD" rate="1.0862"/>...</Cube>
 */
function parseEcbXml(xml: string): Array<{ date: string; rates: Record<string, number> }> {
  const results: Array<{ date: string; rates: Record<string, number> }> = [];

  // Match each time cube
  const timeCubeRegex = /<Cube\s+time=['"](\d{4}-\d{2}-\d{2})['"]\s*>([\s\S]*?)<\/Cube>/g;
  let timeMatch;

  while ((timeMatch = timeCubeRegex.exec(xml)) !== null) {
    const date = timeMatch[1];
    const innerXml = timeMatch[2];
    const rates: Record<string, number> = { EUR: 1 };

    const rateRegex = /<Cube\s+currency=['"]([A-Z]{3})['"]\s+rate=['"]([0-9.]+)['"]\s*\/>/g;
    let rateMatch;

    while ((rateMatch = rateRegex.exec(innerXml)) !== null) {
      rates[rateMatch[1]] = parseFloat(rateMatch[2]);
    }

    if (Object.keys(rates).length > 1) {
      results.push({ date, rates });
    }
  }

  return results;
}

// =============================================================================
// FETCH & STORE
// =============================================================================

/**
 * Fetch les taux ECB quotidiens et les stocke dans Firestore
 */
export async function fetchAndStoreDailyRates(): Promise<{ date: string; count: number }> {
  logger.info('ECB: Fetching daily exchange rates');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

  const response = await fetch(ECB_DAILY_URL, { signal: controller.signal });
  clearTimeout(timeout);
  if (!response.ok) {
    throw new Error(`ECB fetch failed: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  const parsed = parseEcbXml(xml);

  if (parsed.length === 0) {
    throw new Error('ECB: No rates parsed from XML');
  }

  const { date, rates } = parsed[0];
  const db = getDb();

  const doc: ExchangeRateDoc = {
    date,
    rates,
    source: 'ECB',
    fetchedAt: admin.firestore.Timestamp.now(),
  };

  await db.collection(COLLECTION).doc(date).set(doc);

  // Update memory cache
  memoryCache.set(date, { rates, fetchedAt: Date.now() });

  logger.info('ECB: Daily rates stored', { date, currencies: Object.keys(rates).length });

  return { date, count: Object.keys(rates).length };
}

/**
 * Backfill des taux historiques ECB
 */
export async function fetchAndStoreHistoricalRates(): Promise<{ count: number }> {
  logger.info('ECB: Fetching historical exchange rates');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout (large XML)

  const response = await fetch(ECB_HIST_URL, { signal: controller.signal });
  clearTimeout(timeout);
  if (!response.ok) {
    throw new Error(`ECB hist fetch failed: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  const parsed = parseEcbXml(xml);

  if (parsed.length === 0) {
    throw new Error('ECB: No historical rates parsed');
  }

  const db = getDb();
  let stored = 0;

  // Batch write (max 500 per batch)
  for (let i = 0; i < parsed.length; i += 450) {
    const batch = db.batch();
    const chunk = parsed.slice(i, i + 450);

    for (const { date, rates } of chunk) {
      const ref = db.collection(COLLECTION).doc(date);
      batch.set(ref, {
        date,
        rates,
        source: 'ECB',
        fetchedAt: admin.firestore.Timestamp.now(),
      } as ExchangeRateDoc);
      stored++;
    }

    await batch.commit();
  }

  logger.info('ECB: Historical rates stored', { count: stored });
  return { count: stored };
}

// =============================================================================
// LECTURE DES TAUX
// =============================================================================

/**
 * Obtenir les taux pour une date donnee.
 * Fallback J-1, J-2, J-3 pour weekends/jours feries.
 */
async function getRatesForDate(dateStr: string): Promise<Record<string, number> | null> {
  // Check memory cache
  const cached = memoryCache.get(dateStr);
  if (cached && (Date.now() - cached.fetchedAt) < CACHE_TTL_MS) {
    return cached.rates;
  }

  // Check Firestore
  const db = getDb();
  const doc = await db.collection(COLLECTION).doc(dateStr).get();

  if (doc.exists) {
    const data = doc.data() as ExchangeRateDoc;
    memoryCache.set(dateStr, { rates: data.rates, fetchedAt: Date.now() });
    return data.rates;
  }

  return null;
}

/**
 * Formater une date en YYYY-MM-DD
 */
function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

/**
 * Obtenir le taux EUR pour une devise a une date donnee.
 * Fallback automatique J-1 -> J-3 pour weekends/jours feries.
 *
 * @returns taux (1 EUR = X units of currency)
 */
export async function getEurRate(currency: string, date?: Date): Promise<{
  rate: number;
  date: string;
}> {
  if (currency === 'EUR') {
    return { rate: 1, date: formatDate(date || new Date()) };
  }

  const targetDate = date || new Date();

  // Try target date then fallback up to 5 days back (handles long weekends)
  for (let i = 0; i <= 5; i++) {
    const d = new Date(targetDate);
    d.setDate(d.getDate() - i);
    const dateStr = formatDate(d);

    const rates = await getRatesForDate(dateStr);
    if (rates && rates[currency] !== undefined) {
      return { rate: rates[currency], date: dateStr };
    }
  }

  // Ultimate fallback: hardcoded USD rate (approximate, updated Feb 2026)
  if (currency === 'USD') {
    logger.warn('ECB: Using hardcoded fallback rate for USD — fetch daily rates ASAP');
    return { rate: 1.04, date: formatDate(targetDate) };
  }

  throw new Error(`ECB: No exchange rate found for ${currency} around ${formatDate(targetDate)}`);
}

/**
 * Convertir un montant en EUR en utilisant le taux ECB
 *
 * @param amountInCurrency Montant dans la devise source
 * @param currency Code devise source (ex: 'USD')
 * @param date Date pour le taux (defaut: aujourd'hui)
 * @returns { amountEur, exchangeRate, exchangeRateDate }
 */
export async function convertToEur(
  amountInCurrency: number,
  currency: string,
  date?: Date
): Promise<{
  amountEur: number;
  exchangeRate: number;
  exchangeRateDate: string;
}> {
  if (currency === 'EUR') {
    return {
      amountEur: Math.round(amountInCurrency * 100) / 100,
      exchangeRate: 1,
      exchangeRateDate: formatDate(date || new Date()),
    };
  }

  const { rate, date: rateDate } = await getEurRate(currency, date);

  // ECB rate: 1 EUR = rate units of currency
  // So amountInCurrency / rate = amount in EUR
  const amountEur = Math.round((amountInCurrency / rate) * 100) / 100;

  return {
    amountEur,
    exchangeRate: rate,
    exchangeRateDate: rateDate,
  };
}

/**
 * Convertir des centimes dans une devise en EUR (centimes -> EUR)
 */
export async function convertCentsToEur(
  amountCents: number,
  currency: string,
  date?: Date
): Promise<{
  amountEur: number;
  exchangeRate: number;
  exchangeRateDate: string;
}> {
  return convertToEur(amountCents / 100, currency, date);
}
