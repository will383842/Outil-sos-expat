import { db, storage, FieldValue } from './firebase';
import { InvoiceRecord } from './types';
import { logError } from '../utils/logs/logError';

/**
 * P1-5 FIX: Improved server-side invoice generation
 *
 * Generates a proper HTML invoice that can be rendered or converted to PDF.
 * Uses hierarchical storage path matching Firebase Storage rules.
 */

// Extended invoice data with optional fields
// NOTE: Ces champs sont maintenant inclus directement dans InvoiceRecord (types.ts)
// Cette interface est conservée pour rétro-compatibilité
interface ExtendedInvoiceData extends InvoiceRecord {
  providerAddress?: string;
  description?: string;
}

// Invoice template
const generateInvoiceHTML = (invoice: ExtendedInvoiceData): string => {
  const date = new Date();
  const formattedDate = date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const isPlatform = invoice.type === 'platform';
  const title = isPlatform ? 'Facture de mise en relation' : 'Facture prestataire';
  const companyName = isPlatform ? 'SOS Expat' : (invoice.providerName || 'Prestataire');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${title} - ${invoice.invoiceNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
    .invoice-info { text-align: right; }
    .invoice-number { font-size: 20px; font-weight: bold; color: #2563eb; }
    .date { color: #666; margin-top: 5px; }
    .parties { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .party { width: 45%; }
    .party-title { font-weight: bold; color: #666; margin-bottom: 10px; }
    .party-name { font-size: 18px; font-weight: bold; }
    .party-details { color: #666; font-size: 14px; }
    .items { margin-bottom: 40px; }
    .items-table { width: 100%; border-collapse: collapse; }
    .items-table th, .items-table td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
    .items-table th { background: #f8f9fa; font-weight: bold; }
    .items-table .amount { text-align: right; }
    .total-row { font-weight: bold; background: #f0f7ff; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; text-align: center; }
    .legal { margin-top: 20px; font-size: 10px; color: #999; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">${companyName}</div>
    <div class="invoice-info">
      <div class="invoice-number">${invoice.invoiceNumber}</div>
      <div class="date">${formattedDate}</div>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <div class="party-title">ÉMETTEUR</div>
      <div class="party-name">${companyName}</div>
      <div class="party-details">
        ${isPlatform ? 'SOS Expat SAS<br>Service de mise en relation' : (invoice.providerAddress || '')}
      </div>
    </div>
    <div class="party">
      <div class="party-title">CLIENT</div>
      <div class="party-name">${invoice.clientName || 'Client'}</div>
      <div class="party-details">
        ${invoice.clientEmail || ''}
      </div>
    </div>
  </div>

  <div class="items">
    <table class="items-table">
      <thead>
        <tr>
          <th>Description</th>
          <th class="amount">Montant</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${invoice.description || (isPlatform ? 'Frais de mise en relation' : 'Prestation de conseil')}</td>
          <td class="amount">${invoice.amount?.toFixed(2) || '0.00'} ${invoice.currency || 'EUR'}</td>
        </tr>
        <tr class="total-row">
          <td>TOTAL</td>
          <td class="amount">${invoice.amount?.toFixed(2) || '0.00'} ${invoice.currency || 'EUR'}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>Merci pour votre confiance.</p>
    <p class="legal">
      ${isPlatform ? 'SOS Expat SAS - Service de mise en relation entre expatriés et professionnels' : ''}
      <br>Document généré automatiquement - Valide sans signature
    </p>
  </div>
</body>
</html>`;
};

export const generateInvoice = async (invoice: InvoiceRecord & Partial<ExtendedInvoiceData>) => {
  try {
    // Generate HTML invoice
    const htmlContent = generateInvoiceHTML(invoice);
    const buffer = Buffer.from(htmlContent, 'utf-8');

    // P1-5 FIX: Use hierarchical path matching Firebase Storage rules
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const invoiceType = invoice.type || 'platform';

    // Path format: invoices/{type}/{YYYY}/{MM}/{invoiceNumber}.html
    const filePath = `invoices/${invoiceType}/${year}/${month}/${invoice.invoiceNumber}.html`;

    const file = storage.bucket().file(filePath);
    await file.save(buffer, {
      contentType: 'text/html',
      metadata: {
        invoiceNumber: invoice.invoiceNumber,
        type: invoiceType,
        generatedBy: 'server',
        version: '2.0',
      },
    });

    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 1000 * 60 * 60 * 24 * 365, // 1 year
    });

    const invoiceData = {
      ...invoice,
      downloadUrl: url,
      filePath,
      fileFormat: 'html',
      timestamp: FieldValue.serverTimestamp(),
      createdAt: new Date(),
      environment: process.env.NODE_ENV || 'development',
      generatedBy: 'server',
      version: '2.0',
    };

    await db.collection('invoice_records').doc(invoice.invoiceNumber).set(invoiceData);

    console.log(`✅ [generateInvoice] Invoice generated: ${invoice.invoiceNumber} -> ${filePath}`);

    return url;
  } catch (e) {
    console.error(`❌ [generateInvoice] Failed to generate invoice ${invoice.invoiceNumber}:`, e);
    await logError('generateInvoice:failure', { invoice, error: e });
    throw e;
  }
};
