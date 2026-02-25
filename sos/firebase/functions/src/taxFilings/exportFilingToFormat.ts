/**
 * Tax Filing Export Cloud Function
 *
 * Generates export files in various formats:
 * - PDF: Summary document
 * - CSV: Data export for spreadsheets
 * - XML: Official declaration format (where required)
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { TaxFiling, FILING_TYPE_CONFIGS } from './types';

const db = getFirestore();
const storage = getStorage();

// ============================================================================
// TYPES
// ============================================================================

type ExportFormat = 'pdf' | 'csv' | 'xml';

interface ExportRequest {
  filingId: string;
  format: ExportFormat;
}

interface ExportResponse {
  success: boolean;
  url?: string;
  error?: string;
}

// ============================================================================
// CSV GENERATION
// ============================================================================

/**
 * Generate CSV content for a tax filing
 */
function generateCSV(filing: TaxFiling & { id: string }): string {
  const config = FILING_TYPE_CONFIGS[filing.type];
  const lines: string[] = [];

  // Header info
  lines.push(`Tax Filing Export`);
  lines.push(`Type,${config.nameFr}`);
  lines.push(`Period,${filing.period}`);
  lines.push(`Status,${filing.status}`);
  lines.push(`Generated,${new Date().toISOString()}`);
  lines.push('');

  // Summary
  lines.push('SUMMARY');
  lines.push(`Total Sales,${filing.summary.totalSales.toFixed(2)}`);
  lines.push(`Taxable Base,${filing.summary.totalTaxableBase.toFixed(2)}`);
  lines.push(`Tax Due,${filing.summary.totalTaxDue.toFixed(2)}`);
  lines.push(`Tax Deductible,${filing.summary.totalTaxDeductible.toFixed(2)}`);
  lines.push(`Net Tax Payable,${filing.summary.netTaxPayable.toFixed(2)}`);
  lines.push(`Currency,${filing.summary.currency}`);
  lines.push('');

  // Line items header
  lines.push('DETAIL BY COUNTRY');
  lines.push('Country Code,Country Name,VAT Rate (%),Taxable Base,Tax Amount,Transactions,Currency');

  // Line items
  for (const line of filing.lines) {
    lines.push([
      line.countryCode,
      `"${line.countryName}"`,
      line.taxRate.toFixed(2),
      line.taxableBase.toFixed(2),
      line.taxAmount.toFixed(2),
      line.transactionCount.toString(),
      line.currency,
    ].join(','));
  }

  return lines.join('\n');
}

// ============================================================================
// XML GENERATION
// ============================================================================

/**
 * Generate XML content for OSS declaration
 * Based on EU OSS XML schema
 */
function generateOSSXML(filing: TaxFiling & { id: string }): string {
  const [year, quarter] = filing.period.split('-');

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<OSSDeclaration xmlns="urn:eu:taxud:oss:v1">
  <Header>
    <DeclarationType>OSS</DeclarationType>
    <MemberStateOfIdentification>EE</MemberStateOfIdentification>
    <TaxpayerIdentificationNumber>EE102314456</TaxpayerIdentificationNumber>
    <Period>
      <Year>${year}</Year>
      <Quarter>${quarter.replace('Q', '')}</Quarter>
    </Period>
    <Currency>EUR</Currency>
  </Header>
  <Body>
    <TotalVATDue>${filing.summary.totalTaxDue.toFixed(2)}</TotalVATDue>
    <Supplies>`;

  // Add each country
  for (const line of filing.lines) {
    if (line.taxableBase === 0 && line.taxAmount === 0) continue;

    xml += `
      <Supply>
        <MemberStateOfConsumption>${line.countryCode}</MemberStateOfConsumption>
        <VATRate>${line.taxRate.toFixed(2)}</VATRate>
        <TaxableAmount>${line.taxableBase.toFixed(2)}</TaxableAmount>
        <VATAmount>${line.taxAmount.toFixed(2)}</VATAmount>
      </Supply>`;
  }

  xml += `
    </Supplies>
  </Body>
</OSSDeclaration>`;

  return xml;
}

/**
 * Generate XML for DES (Declaration Europeenne de Services)
 */
function generateDESXML(filing: TaxFiling & { id: string }): string {
  const [year, month] = filing.period.split('-');

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<DESDeclaration>
  <Header>
    <DeclarationType>DES</DeclarationType>
    <MemberStateOfOrigin>EE</MemberStateOfOrigin>
    <VATNumber>EE102314456</VATNumber>
    <Period>
      <Year>${year}</Year>
      <Month>${month}</Month>
    </Period>
  </Header>
  <Services>`;

  for (const line of filing.lines) {
    if (line.taxableBase === 0) continue;

    xml += `
    <Service>
      <MemberStateOfCustomer>${line.countryCode}</MemberStateOfCustomer>
      <CustomerVATNumber>${line.customerVatNumber || ''}</CustomerVATNumber>
      <ValueOfServices>${line.taxableBase.toFixed(2)}</ValueOfServices>
    </Service>`;
  }

  xml += `
  </Services>
</DESDeclaration>`;

  return xml;
}

/**
 * Generate XML for Estonian VAT return
 */
function generateVATEEXML(filing: TaxFiling & { id: string }): string {
  const [year, month] = filing.period.split('-');

  return `<?xml version="1.0" encoding="UTF-8"?>
<VATReturn xmlns="urn:ee:emta:vat:v1">
  <Header>
    <TaxpayerRegistrationNumber>12345678</TaxpayerRegistrationNumber>
    <Period>
      <Year>${year}</Year>
      <Month>${month}</Month>
    </Period>
  </Header>
  <Body>
    <TaxableSales>${filing.summary.totalTaxableBase.toFixed(2)}</TaxableSales>
    <OutputVAT>${filing.summary.totalTaxDue.toFixed(2)}</OutputVAT>
    <InputVAT>${filing.summary.totalTaxDeductible.toFixed(2)}</InputVAT>
    <VATPayable>${filing.summary.netTaxPayable.toFixed(2)}</VATPayable>
  </Body>
</VATReturn>`;
}

/**
 * Generate XML based on filing type
 */
function generateXML(filing: TaxFiling & { id: string }): string {
  switch (filing.type) {
    case 'OSS':
      return generateOSSXML(filing);
    case 'DES':
      return generateDESXML(filing);
    case 'VAT_EE':
      return generateVATEEXML(filing);
    default:
      throw new Error(`XML export not supported for ${filing.type}`);
  }
}

// ============================================================================
// PDF GENERATION (HTML-based for simplicity)
// ============================================================================

/**
 * Generate HTML content for PDF conversion
 */
function generatePDFHTML(filing: TaxFiling & { id: string }): string {
  const config = FILING_TYPE_CONFIGS[filing.type];

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);

  const formatDate = (timestamp: Timestamp) =>
    timestamp.toDate().toLocaleDateString('fr-FR');

  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${config.nameFr} - ${filing.period}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    h1 { color: #DC2626; border-bottom: 2px solid #DC2626; padding-bottom: 10px; }
    h2 { color: #1F2937; margin-top: 30px; }
    .header-info { background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .header-info p { margin: 5px 0; }
    .summary-box { display: flex; flex-wrap: wrap; gap: 20px; margin: 20px 0; }
    .summary-item { background: #EFF6FF; padding: 15px 20px; border-radius: 8px; min-width: 150px; }
    .summary-item .label { font-size: 12px; color: #6B7280; }
    .summary-item .value { font-size: 24px; font-weight: bold; color: #1E40AF; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #E5E7EB; padding: 10px; text-align: left; }
    th { background: #F9FAFB; font-weight: 600; }
    tr:nth-child(even) { background: #F9FAFB; }
    .total-row { font-weight: bold; background: #DBEAFE !important; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E7EB; font-size: 12px; color: #6B7280; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .status-DRAFT { background: #FEF3C7; color: #92400E; }
    .status-PENDING_REVIEW { background: #DBEAFE; color: #1E40AF; }
    .status-SUBMITTED { background: #D1FAE5; color: #065F46; }
    .status-ACCEPTED { background: #D1FAE5; color: #065F46; }
    .status-PAID { background: #D1FAE5; color: #065F46; }
    .status-REJECTED { background: #FEE2E2; color: #991B1B; }
  </style>
</head>
<body>
  <h1>SOS-Expat OU - Declaration Fiscale</h1>

  <div class="header-info">
    <p><strong>Type:</strong> ${config.nameFr}</p>
    <p><strong>Periode:</strong> ${filing.period}</p>
    <p><strong>Du:</strong> ${formatDate(filing.periodStart)} au ${formatDate(filing.periodEnd)}</p>
    <p><strong>Echeance:</strong> ${formatDate(filing.dueDate)}</p>
    <p><strong>Statut:</strong> <span class="status-badge status-${filing.status}">${filing.status}</span></p>
  </div>

  <h2>Resume</h2>
  <div class="summary-box">
    <div class="summary-item">
      <div class="label">Ventes Totales</div>
      <div class="value">${formatCurrency(filing.summary.totalSales)}</div>
    </div>
    <div class="summary-item">
      <div class="label">Base Taxable</div>
      <div class="value">${formatCurrency(filing.summary.totalTaxableBase)}</div>
    </div>
    <div class="summary-item">
      <div class="label">TVA Due</div>
      <div class="value">${formatCurrency(filing.summary.totalTaxDue)}</div>
    </div>
    <div class="summary-item">
      <div class="label">TVA Deductible</div>
      <div class="value">${formatCurrency(filing.summary.totalTaxDeductible)}</div>
    </div>
    <div class="summary-item">
      <div class="label">TVA Nette a Payer</div>
      <div class="value" style="color: #DC2626;">${formatCurrency(filing.summary.netTaxPayable)}</div>
    </div>
  </div>

  <h2>Detail par Pays</h2>
  <table>
    <thead>
      <tr>
        <th>Code</th>
        <th>Pays</th>
        <th>Taux TVA</th>
        <th>Base Taxable</th>
        <th>TVA</th>
        <th>Transactions</th>
      </tr>
    </thead>
    <tbody>`;

  for (const line of filing.lines) {
    if (filing.type !== 'OSS' && line.taxableBase === 0 && line.taxAmount === 0) continue;

    html += `
      <tr>
        <td>${line.countryCode}</td>
        <td>${line.countryName}</td>
        <td>${line.taxRate}%</td>
        <td>${formatCurrency(line.taxableBase)}</td>
        <td>${formatCurrency(line.taxAmount)}</td>
        <td>${line.transactionCount}</td>
      </tr>`;
  }

  html += `
      <tr class="total-row">
        <td colspan="3">TOTAL</td>
        <td>${formatCurrency(filing.summary.totalTaxableBase)}</td>
        <td>${formatCurrency(filing.summary.totalTaxDue)}</td>
        <td>${filing.lines.reduce((sum, l) => sum + l.transactionCount, 0)}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <p>Document genere automatiquement le ${new Date().toLocaleDateString('fr-FR')} a ${new Date().toLocaleTimeString('fr-FR')}</p>
    <p>SOS-Expat OU - Harju maakond, Tallinn, Kesklinna linnaosa, Narva mnt 5, 10117, Estonia</p>
    <p>N° TVA: EE102314456</p>
  </div>
</body>
</html>`;

  return html;
}

// ============================================================================
// STORAGE HELPERS
// ============================================================================

/**
 * Upload file to Firebase Storage and get download URL
 */
async function uploadFile(
  content: string,
  filingId: string,
  format: ExportFormat
): Promise<string> {
  const bucket = storage.bucket();
  const filename = `tax-filings/${filingId}/${filingId}.${format}`;
  const file = bucket.file(filename);

  const contentType =
    format === 'csv'
      ? 'text/csv'
      : format === 'xml'
      ? 'application/xml'
      : 'text/html';

  await file.save(content, {
    contentType,
    metadata: {
      cacheControl: 'public, max-age=3600',
    },
  });

  // Make file public and get URL
  await file.makePublic();
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;

  return publicUrl;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Export Tax Filing to Format
 */
export const exportFilingToFormat = onCall(
  {
    region: 'europe-west1',
    cpu: 0.083,
    timeoutSeconds: 120,
    memory: '256MiB',
  },
  async (request): Promise<ExportResponse> => {
    // Check authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    // Check admin claim
    const customClaims = request.auth.token;
    if (!customClaims.admin && !customClaims.superAdmin) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const { filingId, format } = request.data as ExportRequest;

    // Validate inputs
    if (!filingId) {
      throw new HttpsError('invalid-argument', 'Filing ID is required');
    }

    if (!format || !['pdf', 'csv', 'xml'].includes(format)) {
      throw new HttpsError('invalid-argument', 'Invalid format. Must be pdf, csv, or xml');
    }

    try {
      // Get filing document
      const filingDoc = await db.collection('tax_filings').doc(filingId).get();

      if (!filingDoc.exists) {
        throw new HttpsError('not-found', 'Filing not found');
      }

      const filing = { id: filingDoc.id, ...filingDoc.data() } as TaxFiling & { id: string };

      // Generate content based on format
      let content: string;

      switch (format) {
        case 'csv':
          content = generateCSV(filing);
          break;
        case 'xml':
          content = generateXML(filing);
          break;
        case 'pdf':
          content = generatePDFHTML(filing);
          break;
        default:
          throw new HttpsError('invalid-argument', 'Unsupported format');
      }

      // Upload to storage
      const url = await uploadFile(content, filingId, format);

      // Update filing document with file URL
      await filingDoc.ref.update({
        [`generatedFiles.${format}`]: url,
        updatedAt: Timestamp.now(),
      });

      logger.info(`Tax filing exported successfully`, {
        filingId,
        format,
        url,
      });

      return {
        success: true,
        url,
      };

    } catch (error) {
      logger.error('Error exporting tax filing:', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError('internal', `Failed to export filing: ${error}`);
    }
  });

/**
 * Export all formats for a filing
 */
export const exportFilingAllFormats = onCall(
  {
    region: 'europe-west1',
    cpu: 0.083,
    timeoutSeconds: 180,
    memory: '256MiB',
  },
  async (request) => {
    // Check authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    // Check admin claim
    const customClaims = request.auth.token;
    if (!customClaims.admin && !customClaims.superAdmin) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const { filingId } = request.data as { filingId: string };

    if (!filingId) {
      throw new HttpsError('invalid-argument', 'Filing ID is required');
    }

    try {
      // Get filing document
      const filingDoc = await db.collection('tax_filings').doc(filingId).get();

      if (!filingDoc.exists) {
        throw new HttpsError('not-found', 'Filing not found');
      }

      const filing = { id: filingDoc.id, ...filingDoc.data() } as TaxFiling & { id: string };
      const results: Record<ExportFormat, string | null> = {
        pdf: null,
        csv: null,
        xml: null,
      };

      // Generate CSV
      try {
        const csvContent = generateCSV(filing);
        results.csv = await uploadFile(csvContent, filingId, 'csv');
      } catch (e) {
        logger.warn('Failed to generate CSV:', e);
      }

      // Generate PDF (HTML)
      try {
        const pdfContent = generatePDFHTML(filing);
        results.pdf = await uploadFile(pdfContent, filingId, 'pdf');
      } catch (e) {
        logger.warn('Failed to generate PDF:', e);
      }

      // Generate XML (only for supported types)
      if (['OSS', 'DES', 'VAT_EE'].includes(filing.type)) {
        try {
          const xmlContent = generateXML(filing);
          results.xml = await uploadFile(xmlContent, filingId, 'xml');
        } catch (e) {
          logger.warn('Failed to generate XML:', e);
        }
      }

      // Update filing document
      await filingDoc.ref.update({
        generatedFiles: {
          pdf: results.pdf,
          csv: results.csv,
          xml: results.xml,
        },
        updatedAt: Timestamp.now(),
      });

      return {
        success: true,
        files: results,
      };

    } catch (error) {
      logger.error('Error exporting all formats:', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError('internal', `Failed to export filing: ${error}`);
    }
  });
