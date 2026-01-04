import type { Payment, Invoice, CountryAmount, VatBucket, Currency } from '@/types/finance';
import * as XLSX from 'xlsx';

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

/**
 * Convert array of objects to Excel file (XLSX format)
 * Uses SheetJS (xlsx) library for proper Excel file generation
 * @param rows - Array of records to convert
 * @param options - Optional configuration
 * @returns Blob containing Excel file
 */
export function toExcel(
  rows: Record<string, unknown>[],
  options?: {
    sheetName?: string;
    includeHeaders?: boolean;
    columnWidths?: Record<string, number>;
  }
): Blob {
  const { sheetName = 'Export', includeHeaders = true, columnWidths } = options || {};

  // Create worksheet from JSON data
  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: includeHeaders ? Object.keys(rows[0] || {}) : undefined,
  });

  // Apply column widths if specified
  if (columnWidths) {
    const cols: XLSX.ColInfo[] = Object.keys(rows[0] || {}).map((key) => ({
      wch: columnWidths[key] || 15, // Default width of 15 characters
    }));
    worksheet['!cols'] = cols;
  } else {
    // Auto-calculate column widths based on content
    const headers = Object.keys(rows[0] || {});
    const cols: XLSX.ColInfo[] = headers.map((header) => {
      // Find max content length for this column
      const maxContentLength = Math.max(
        header.length,
        ...rows.map((row) => {
          const value = row[header];
          if (value === null || value === undefined) return 0;
          return String(value).length;
        })
      );
      return { wch: Math.min(Math.max(maxContentLength + 2, 10), 50) }; // Min 10, Max 50
    });
    worksheet['!cols'] = cols;
  }

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Generate Excel file as array buffer
  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  // Convert to Blob
  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Download a Blob as a file
 * @param blob - The Blob to download
 * @param filename - The filename for the download
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
