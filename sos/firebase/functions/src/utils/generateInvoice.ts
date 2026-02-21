import { db, storage, FieldValue } from './firebase';
import { InvoiceRecord } from './types';
import { logError } from '../utils/logs/logError';
import {
  getInvoiceTranslations,
  formatInvoiceDate,
  formatInvoiceCurrency,
} from './invoiceTranslations';
import { generateSequentialCreditNoteNumber } from './sequentialInvoiceNumber';

/**
 * P1-5 FIX: Improved server-side invoice generation
 * P2 FIX 2026-02-12: Added multilingual support (9 languages)
 *
 * Generates a proper HTML invoice that can be rendered or converted to PDF.
 * Uses hierarchical storage path matching Firebase Storage rules.
 * Supports 9 languages: FR, EN, ES, DE, PT, RU, ZH, HI, AR
 */

// Extended invoice data with optional fields
// NOTE: Ces champs sont maintenant inclus directement dans InvoiceRecord (types.ts)
// Cette interface est conservée pour rétro-compatibilité
interface ExtendedInvoiceData extends InvoiceRecord {
  providerAddress?: string;
  description?: string;
  locale?: string; // P2 FIX: Added locale support
}

// Invoice template with multilingual support
const generateInvoiceHTML = (invoice: ExtendedInvoiceData): string => {
  const date = new Date();
  const locale = invoice.locale || 'en';
  const t = getInvoiceTranslations(locale);
  const formattedDate = formatInvoiceDate(date, locale);

  const isPlatform = invoice.type === 'platform';
  const title = isPlatform ? t.platformInvoiceTitle : t.providerInvoiceTitle;
  const companyName = isPlatform ? t.companyName : (invoice.providerName || 'Provider');

  // Format currency
  const formattedAmount = formatInvoiceCurrency(
    invoice.amount || 0,
    invoice.currency || 'EUR',
    locale
  );

  // RTL support for Arabic
  const isRTL = locale.startsWith('ar');
  const direction = isRTL ? 'rtl' : 'ltr';
  const textAlign = isRTL ? 'right' : 'left';

  return `<!DOCTYPE html>
<html lang="${locale.split('-')[0]}" dir="${direction}">
<head>
  <meta charset="UTF-8">
  <title>${title} - ${invoice.invoiceNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; direction: ${direction}; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
    .invoice-info { text-align: ${isRTL ? 'left' : 'right'}; }
    .invoice-number { font-size: 20px; font-weight: bold; color: #2563eb; }
    .date { color: #666; margin-top: 5px; }
    .parties { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .party { width: 45%; }
    .party-title { font-weight: bold; color: #666; margin-bottom: 10px; }
    .party-name { font-size: 18px; font-weight: bold; }
    .party-details { color: #666; font-size: 14px; }
    .items { margin-bottom: 40px; }
    .items-table { width: 100%; border-collapse: collapse; }
    .items-table th, .items-table td { padding: 12px; text-align: ${textAlign}; border-bottom: 1px solid #eee; }
    .items-table th { background: #f8f9fa; font-weight: bold; }
    .items-table .amount { text-align: ${isRTL ? 'left' : 'right'}; }
    .total-row { font-weight: bold; background: #f0f7ff; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; text-align: center; }
    .legal { margin-top: 20px; font-size: 10px; color: #999; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">${companyName}</div>
    <div class="invoice-info">
      <div class="invoice-number">${t.invoiceNumber} ${invoice.invoiceNumber}</div>
      <div class="date">${formattedDate}</div>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <div class="party-title">${t.issuer}</div>
      <div class="party-name">${companyName}</div>
      <div class="party-details">
        ${isPlatform ? t.platformDescription : (invoice.providerAddress || '')}
      </div>
    </div>
    <div class="party">
      <div class="party-title">${t.client}</div>
      <div class="party-name">${invoice.clientName || t.client}</div>
      <div class="party-details">
        ${invoice.clientEmail || ''}
      </div>
    </div>
  </div>

  <div class="items">
    <table class="items-table">
      <thead>
        <tr>
          <th>${t.description}</th>
          <th class="amount">${t.amount}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${invoice.description || (isPlatform ? t.platformFeeDescription : t.consultationDescription)}</td>
          <td class="amount">${formattedAmount}</td>
        </tr>
        <tr class="total-row">
          <td>${t.total}</td>
          <td class="amount">${formattedAmount}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>${t.thankYouMessage}</p>
    <p class="legal">
      ${isPlatform ? t.legalNotice : ''}
      <br>${t.validWithoutSignature}
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

// =============================================================================
// M1 AUDIT FIX: Credit Note (Facture d'avoir) generation
// =============================================================================

export interface CreditNoteData {
  originalInvoiceNumber: string;
  refundId: string;
  amount: number;
  currency: string;
  reason: string;
  callId: string;
  clientId: string;
  providerId: string;
  clientName?: string;
  clientEmail?: string;
  providerName?: string;
  locale?: string;
  gateway?: 'stripe' | 'paypal';
}

const generateCreditNoteHTML = (data: CreditNoteData & { creditNoteNumber: string }): string => {
  const date = new Date();
  const locale = data.locale || 'en';
  const t = getInvoiceTranslations(locale);
  const formattedDate = formatInvoiceDate(date, locale);
  const formattedAmount = formatInvoiceCurrency(data.amount, data.currency || 'EUR', locale);

  const isRTL = locale.startsWith('ar');
  const direction = isRTL ? 'rtl' : 'ltr';
  const textAlign = isRTL ? 'right' : 'left';

  return `<!DOCTYPE html>
<html lang="${locale.split('-')[0]}" dir="${direction}">
<head>
  <meta charset="UTF-8">
  <title>${t.creditNoteTitle} - ${data.creditNoteNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; direction: ${direction}; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .logo { font-size: 24px; font-weight: bold; color: #dc2626; }
    .credit-badge { display: inline-block; background: #dc2626; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-left: 10px; }
    .invoice-info { text-align: ${isRTL ? 'left' : 'right'}; }
    .invoice-number { font-size: 20px; font-weight: bold; color: #dc2626; }
    .date { color: #666; margin-top: 5px; }
    .original-ref { margin-top: 10px; padding: 8px 12px; background: #fef2f2; border-left: 3px solid #dc2626; font-size: 14px; }
    .parties { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .party { width: 45%; }
    .party-title { font-weight: bold; color: #666; margin-bottom: 10px; }
    .party-name { font-size: 18px; font-weight: bold; }
    .party-details { color: #666; font-size: 14px; }
    .items { margin-bottom: 40px; }
    .items-table { width: 100%; border-collapse: collapse; }
    .items-table th, .items-table td { padding: 12px; text-align: ${textAlign}; border-bottom: 1px solid #eee; }
    .items-table th { background: #fef2f2; font-weight: bold; }
    .items-table .amount { text-align: ${isRTL ? 'left' : 'right'}; color: #dc2626; }
    .total-row { font-weight: bold; background: #fef2f2; }
    .reason { margin-bottom: 20px; padding: 12px; background: #f9fafb; border-radius: 4px; }
    .reason-label { font-weight: bold; color: #666; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; text-align: center; }
    .legal { margin-top: 20px; font-size: 10px; color: #999; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <span class="logo">${t.companyName}</span>
      <span class="credit-badge">${t.creditNoteTitle.toUpperCase()}</span>
    </div>
    <div class="invoice-info">
      <div class="invoice-number">${t.creditNoteNumber} ${data.creditNoteNumber}</div>
      <div class="date">${formattedDate}</div>
      <div class="original-ref">
        ${t.originalInvoiceRef}: <strong>${data.originalInvoiceNumber}</strong>
      </div>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <div class="party-title">${t.issuer}</div>
      <div class="party-name">${t.companyName}</div>
      <div class="party-details">${t.platformDescription}</div>
    </div>
    <div class="party">
      <div class="party-title">${t.client}</div>
      <div class="party-name">${data.clientName || t.client}</div>
      <div class="party-details">${data.clientEmail || ''}</div>
    </div>
  </div>

  <div class="reason">
    <span class="reason-label">${t.refundReasonLabel}:</span> ${data.reason}
  </div>

  <div class="items">
    <table class="items-table">
      <thead>
        <tr>
          <th>${t.description}</th>
          <th class="amount">${t.amount}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${t.creditNoteDescription}</td>
          <td class="amount">-${formattedAmount}</td>
        </tr>
        <tr class="total-row">
          <td>${t.total}</td>
          <td class="amount">-${formattedAmount}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>${t.creditNoteFooter}</p>
    <p class="legal">
      ${t.legalNotice}
      <br>${t.validWithoutSignature}
    </p>
  </div>
</body>
</html>`;
};

/**
 * M1 AUDIT FIX: Generate a credit note (facture d'avoir) for a refund
 *
 * EU compliance: Every refund must have a corresponding credit note document.
 * Uses sequential numbering: AVOIR-YYYY-NNNNNN
 */
export const generateCreditNote = async (data: CreditNoteData): Promise<string> => {
  try {
    // 1. Generate sequential credit note number
    const { invoiceNumber: creditNoteNumber } = await generateSequentialCreditNoteNumber();

    // 2. Generate HTML
    const htmlContent = generateCreditNoteHTML({ ...data, creditNoteNumber });
    const buffer = Buffer.from(htmlContent, 'utf-8');

    // 3. Store in Firebase Storage
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const filePath = `invoices/credit_notes/${year}/${month}/${creditNoteNumber}.html`;

    const file = storage.bucket().file(filePath);
    await file.save(buffer, {
      contentType: 'text/html',
      metadata: {
        creditNoteNumber,
        originalInvoiceNumber: data.originalInvoiceNumber,
        refundId: data.refundId,
        type: 'credit_note',
        generatedBy: 'server',
      },
    });

    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 1000 * 60 * 60 * 24 * 365, // 1 year
    });

    // 4. Store record in Firestore
    await db.collection('credit_notes').doc(creditNoteNumber).set({
      creditNoteNumber,
      originalInvoiceNumber: data.originalInvoiceNumber,
      refundId: data.refundId,
      callId: data.callId,
      clientId: data.clientId,
      providerId: data.providerId,
      amount: data.amount,
      currency: data.currency,
      reason: data.reason,
      gateway: data.gateway || 'stripe',
      downloadUrl: url,
      filePath,
      locale: data.locale || 'en',
      clientName: data.clientName || null,
      clientEmail: data.clientEmail || null,
      providerName: data.providerName || null,
      status: 'issued',
      timestamp: FieldValue.serverTimestamp(),
      createdAt: new Date(),
    });

    console.log(`✅ [generateCreditNote] Credit note generated: ${creditNoteNumber} -> ${filePath}`);
    return url;
  } catch (e) {
    console.error(`❌ [generateCreditNote] Failed:`, e);
    await logError('generateCreditNote:failure', { data, error: e });
    throw e;
  }
};
