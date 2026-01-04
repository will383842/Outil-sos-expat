import type { Payment, Invoice, CountryAmount, VatBucket, Currency } from '@/types/finance';

export function aggregateByCountry(payments: Payment[], invoices: Invoice[]) : CountryAmount[] {
  const map = new Map<string, CountryAmount>();
  const push = (country:string, currency:Currency, gross:number, tax:number)=>{
    const k = country+'|'+currency;
    const prev = map.get(k) || { country, currency, gross:0, net:0, tax:0, count:0 };
    prev.gross += gross; prev.tax += (tax||0); prev.net = prev.gross - prev.tax; prev.count += 1; map.set(k, prev);
  };
  for(const p of payments){ push(p.country||'UNK', p.currency, p.amount, p.tax||0); }
  for(const inv of invoices){ push(inv.country||'UNK', inv.currency, inv.total, inv.tax||0); }
  return Array.from(map.values());
}

export function bucketsVat(invoices: Invoice[]): VatBucket[] {
  const map = new Map<string, VatBucket>();
  for(const inv of invoices){
    const country = inv.country||'UNK';
    const rates = inv.taxRates?.length ? inv.taxRates : [{id:'', country, name:'n/a', rate: 0}];
    for(const tr of rates){
      const k = `${country}|${tr.rate}`;
      const prev = map.get(k) || { country, rate: tr.rate, taxable: 0, tax: 0 };
      // Hypothèse: inv.tax est global; si lignes indisponibles, on répartit au taux unique
      // Pour un vrai split par ligne, brancher depuis Firestore/Stripe invoice lines
      prev.tax += inv.tax || 0;
      prev.taxable += Math.max(inv.total - (inv.tax||0), 0);
      map.set(k, prev);
    }
  }
  return Array.from(map.values());
}

/**
 * Convert array of objects to CSV string with proper Excel compatibility
 * @param rows - Array of records to convert
 * @param options - Optional configuration
 * @returns CSV string with BOM for Excel UTF-8 support
 */
export function toCsv(
  rows: Record<string, unknown>[],
  options?: { includeBom?: boolean; delimiter?: string }
): string {
  if (!rows.length) return '';

  const { includeBom = true, delimiter = ',' } = options || {};
  const headers = Object.keys(rows[0]);

  // Escape function: handles quotes, newlines, and special characters
  const esc = (v: unknown): string => {
    if (v === null || v === undefined) return '""';

    // Handle objects/arrays by JSON stringifying
    const str = typeof v === 'object' ? JSON.stringify(v) : String(v);

    // Escape quotes and wrap in quotes if contains special chars
    const escaped = str.replace(/"/g, '""');
    const needsQuotes = escaped.includes(delimiter) ||
                        escaped.includes('\n') ||
                        escaped.includes('\r') ||
                        escaped.includes('"');

    return needsQuotes ? `"${escaped}"` : escaped;
  };

  const csvContent = [
    headers.join(delimiter),
    ...rows.map(r => headers.map(h => esc(r[h])).join(delimiter))
  ].join('\n');

  // Add BOM for Excel UTF-8 compatibility
  const BOM = '\uFEFF';
  return includeBom ? BOM + csvContent : csvContent;
}
