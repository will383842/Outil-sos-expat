/**
 * CSV Export Utilities
 */

/**
 * Generate CSV content from data
 */
export function generateCSV(
  headers: string[],
  rows: (string | number | null | undefined)[][]
): string {
  const escapeCSV = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = headers.map(escapeCSV).join(',');
  const dataRows = rows.map(row => row.map(escapeCSV).join(','));

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Download CSV file
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export data as CSV file
 */
export function exportToCSV(
  headers: string[],
  rows: (string | number | null | undefined)[][],
  filename: string
): void {
  const csv = generateCSV(headers, rows);
  downloadCSV(csv, filename);
}

/**
 * Format date for CSV
 */
export function formatDateForCSV(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * Format currency for CSV (in dollars)
 */
export function formatCurrencyForCSV(cents: number): string {
  return (cents / 100).toFixed(2);
}
