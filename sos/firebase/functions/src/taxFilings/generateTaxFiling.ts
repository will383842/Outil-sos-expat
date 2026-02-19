/**
 * Tax Filing Generation Cloud Function
 *
 * Generates tax filing drafts by aggregating transaction data
 * Supports: VAT_EE, OSS, DES, UK_VAT, CH_VAT
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import {
  TaxFilingType,
  TaxFilingFrequency,
  TaxFilingLine,
  TaxFilingSummary,
  TaxFiling,
  EU_MEMBER_STATES,
  getVatRateForCountry,
  getCountryName,
  FILING_TYPE_CONFIGS,
} from './types';

const db = getFirestore();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse period string to get start and end dates
 */
function parsePeriod(period: string, frequency: TaxFilingFrequency): { start: Date; end: Date } {
  if (frequency === 'MONTHLY') {
    // Format: "2024-01"
    const [year, month] = period.split('-').map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    return { start, end };
  } else if (frequency === 'QUARTERLY') {
    // Format: "2024-Q1"
    const [yearStr, quarterStr] = period.split('-');
    const year = parseInt(yearStr);
    const quarter = parseInt(quarterStr.replace('Q', ''));
    const startMonth = (quarter - 1) * 3;
    const start = new Date(year, startMonth, 1);
    const end = new Date(year, startMonth + 3, 0, 23, 59, 59, 999);
    return { start, end };
  } else {
    // Annual: "2024"
    const year = parseInt(period);
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59, 999);
    return { start, end };
  }
}

/**
 * Calculate due date based on period and filing type
 */
function calculateDueDate(periodEnd: Date, filingType: TaxFilingType): Date {
  const config = FILING_TYPE_CONFIGS[filingType];
  const dueDate = new Date(periodEnd);

  if (config.frequency === 'MONTHLY') {
    // Due on the Nth day of the following month
    dueDate.setMonth(dueDate.getMonth() + 1);
    dueDate.setDate(config.dueDateOffset);
  } else if (config.frequency === 'QUARTERLY') {
    // Due at end of month following quarter (or specific offset)
    dueDate.setMonth(dueDate.getMonth() + 1);
    dueDate.setDate(config.dueDateOffset);
  }

  return dueDate;
}

/**
 * Generate unique filing ID
 */
function generateFilingId(type: TaxFilingType, period: string): string {
  return `${type}_${period}`;
}

/**
 * Check if a country is in the EU
 */
function isEUCountry(countryCode: string): boolean {
  return EU_MEMBER_STATES.some(c => c.code === countryCode);
}

// ============================================================================
// TRANSACTION AGGREGATION
// ============================================================================

interface AggregatedData {
  byCountry: Map<string, {
    taxableBase: number;
    taxAmount: number;
    transactionCount: number;
    customerType: 'B2C' | 'B2B';
  }>;
  transactionIds: string[];
  totalSales: number;
}

/**
 * Aggregate transactions for a given period and type
 */
async function aggregateTransactions(
  periodStart: Date,
  periodEnd: Date,
  filingType: TaxFilingType
): Promise<AggregatedData> {
  const result: AggregatedData = {
    byCountry: new Map(),
    transactionIds: [],
    totalSales: 0,
  };

  // Query payments collection
  const paymentsRef = db.collection('payments');
  const query = paymentsRef
    .where('status', 'in', ['succeeded', 'captured'])
    .where('createdAt', '>=', Timestamp.fromDate(periodStart))
    .where('createdAt', '<=', Timestamp.fromDate(periodEnd));

  const snapshot = await query.get();

  // Also get user data to determine country
  const userCountryCache = new Map<string, string>();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const paymentId = doc.id;

    // Skip placeholder documents
    if (data._placeholder) continue;

    // Get client country
    let clientCountry = data.clientCountry || data.country;

    // If no country, try to get from user document
    if (!clientCountry && data.clientId) {
      if (userCountryCache.has(data.clientId)) {
        clientCountry = userCountryCache.get(data.clientId);
      } else {
        try {
          const userDoc = await db.collection('users').doc(data.clientId).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            clientCountry = userData?.country || userData?.currentCountry || 'XX';
            userCountryCache.set(data.clientId, clientCountry);
          }
        } catch (error) {
          console.warn(`Failed to get user country for ${data.clientId}:`, error);
          clientCountry = 'XX';
        }
      }
    }

    if (!clientCountry) clientCountry = 'XX';

    // Normalize country code
    const countryCode = clientCountry.toUpperCase().substring(0, 2);

    // Determine if B2B or B2C
    const isB2B = Boolean(data.customerVatNumber || data.businessCustomer);

    // Calculate amounts (convert from cents if needed)
    const grossAmount = (data.amountInEuros ?? (data.amount ? data.amount / 100 : 0));

    // Filter based on filing type
    let includeTransaction = false;

    switch (filingType) {
      case 'VAT_EE':
        // Only Estonian domestic sales
        includeTransaction = countryCode === 'EE';
        break;

      case 'OSS':
        // B2C sales to other EU countries (not Estonia)
        includeTransaction = isEUCountry(countryCode) && countryCode !== 'EE' && !isB2B;
        break;

      case 'DES':
        // B2B services to other EU countries (with VAT number)
        includeTransaction = isEUCountry(countryCode) && countryCode !== 'EE' && isB2B;
        break;

      case 'UK_VAT':
        // UK sales only
        includeTransaction = countryCode === 'GB';
        break;

      case 'CH_VAT':
        // Swiss sales only
        includeTransaction = countryCode === 'CH';
        break;
    }

    if (!includeTransaction) continue;

    // Get VAT rate for country
    const vatRate = getVatRateForCountry(countryCode);

    // Calculate taxable base and VAT (extracting VAT from gross amount)
    // Gross = Net * (1 + VAT rate)
    // Net = Gross / (1 + VAT rate)
    const taxableBase = vatRate > 0 ? grossAmount / (1 + vatRate / 100) : grossAmount;
    const taxAmount = grossAmount - taxableBase;

    // Add to aggregation
    const existing = result.byCountry.get(countryCode) || {
      taxableBase: 0,
      taxAmount: 0,
      transactionCount: 0,
      customerType: isB2B ? 'B2B' as const : 'B2C' as const,
    };

    result.byCountry.set(countryCode, {
      taxableBase: existing.taxableBase + taxableBase,
      taxAmount: existing.taxAmount + taxAmount,
      transactionCount: existing.transactionCount + 1,
      customerType: existing.customerType,
    });

    result.transactionIds.push(paymentId);
    result.totalSales += grossAmount;
  }

  return result;
}

// ============================================================================
// FILING GENERATION
// ============================================================================

/**
 * Build filing lines from aggregated data
 */
function buildFilingLines(aggregatedData: AggregatedData, filingType: TaxFilingType): TaxFilingLine[] {
  const lines: TaxFilingLine[] = [];

  if (filingType === 'OSS') {
    // For OSS, include all 27 EU countries (excluding Estonia)
    for (const country of EU_MEMBER_STATES) {
      if (country.code === 'EE') continue; // Skip Estonia for OSS

      const data = aggregatedData.byCountry.get(country.code);
      lines.push({
        countryCode: country.code,
        countryName: country.name,
        taxRate: country.vatRate,
        taxableBase: data?.taxableBase ?? 0,
        taxAmount: data?.taxAmount ?? 0,
        transactionCount: data?.transactionCount ?? 0,
        currency: 'EUR',
        customerType: 'B2C',
      });
    }
  } else {
    // For other types, only include countries with transactions
    aggregatedData.byCountry.forEach((data, countryCode) => {
      lines.push({
        countryCode,
        countryName: getCountryName(countryCode),
        taxRate: getVatRateForCountry(countryCode),
        taxableBase: data.taxableBase,
        taxAmount: data.taxAmount,
        transactionCount: data.transactionCount,
        currency: 'EUR',
        customerType: data.customerType,
      });
    });
  }

  // Sort by country name
  lines.sort((a, b) => a.countryName.localeCompare(b.countryName));

  return lines;
}

/**
 * Calculate summary from lines
 */
function calculateSummary(lines: TaxFilingLine[], totalSales: number): TaxFilingSummary {
  const totalTaxableBase = lines.reduce((sum, line) => sum + line.taxableBase, 0);
  const totalTaxDue = lines.reduce((sum, line) => sum + line.taxAmount, 0);

  return {
    totalSales,
    totalTaxableBase,
    totalTaxDue,
    totalTaxDeductible: 0, // To be filled manually if needed
    netTaxPayable: totalTaxDue, // Will be adjusted if deductible is set
    currency: 'EUR',
  };
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

interface GenerateTaxFilingRequest {
  type: TaxFilingType;
  period: string;
  force?: boolean; // Force regenerate even if exists
}

interface GenerateTaxFilingResponse {
  success: boolean;
  filingId?: string;
  filing?: Partial<TaxFiling>;
  error?: string;
}

/**
 * Generate Tax Filing Cloud Function
 *
 * Callable function that generates a draft tax filing for a given type and period
 */
export const generateTaxFiling = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 300,
    memory: '512MiB',
  },
  async (request): Promise<GenerateTaxFilingResponse> => {
    // Check authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    // Check admin claim
    const customClaims = request.auth.token;
    if (!customClaims.admin && !customClaims.superAdmin) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const { type, period, force } = request.data as GenerateTaxFilingRequest;

    // Validate inputs
    if (!type || !['VAT_EE', 'OSS', 'DES', 'UK_VAT', 'CH_VAT'].includes(type)) {
      throw new HttpsError('invalid-argument', 'Invalid filing type');
    }

    if (!period) {
      throw new HttpsError('invalid-argument', 'Period is required');
    }

    try {
      const config = FILING_TYPE_CONFIGS[type];
      const filingId = generateFilingId(type, period);

      // Check if filing already exists
      const existingDoc = await db.collection('tax_filings').doc(filingId).get();
      if (existingDoc.exists && !force) {
        return {
          success: false,
          error: 'Filing already exists for this period. Use force=true to regenerate.',
          filingId,
        };
      }

      // Parse period
      const { start: periodStart, end: periodEnd } = parsePeriod(period, config.frequency);

      // Calculate due date
      const dueDate = calculateDueDate(periodEnd, type);

      // Aggregate transactions
      logger.info(`Aggregating transactions for ${type} ${period}`, {
        periodStart,
        periodEnd,
      });

      const aggregatedData = await aggregateTransactions(periodStart, periodEnd, type);

      // Build lines
      const lines = buildFilingLines(aggregatedData, type);

      // Calculate summary
      const summary = calculateSummary(lines, aggregatedData.totalSales);

      // Create filing document
      const now = Timestamp.now();
      const filing: Omit<TaxFiling, 'id'> = {
        type,
        period,
        periodStart: Timestamp.fromDate(periodStart),
        periodEnd: Timestamp.fromDate(periodEnd),
        frequency: config.frequency,
        dueDate: Timestamp.fromDate(dueDate),
        submissionDeadline: Timestamp.fromDate(dueDate),
        paymentDeadline: Timestamp.fromDate(dueDate),
        status: 'DRAFT',
        statusHistory: [{
          status: 'DRAFT',
          changedAt: now,
          changedBy: request.auth.uid,
          reason: force ? 'Regenerated' : 'Initial generation',
        }],
        summary,
        lines,
        generatedFiles: {},
        reminders: {
          sent30Days: false,
          sent7Days: false,
          sent1Day: false,
        },
        transactionIds: aggregatedData.transactionIds,
        createdAt: existingDoc.exists ? existingDoc.data()?.createdAt ?? now : now,
        updatedAt: now,
        createdBy: existingDoc.exists ? existingDoc.data()?.createdBy : request.auth.uid,
        updatedBy: request.auth.uid,
      };

      // Save to Firestore
      await db.collection('tax_filings').doc(filingId).set(filing, { merge: true });

      logger.info(`Tax filing generated successfully: ${filingId}`, {
        transactionCount: aggregatedData.transactionIds.length,
        totalTaxDue: summary.totalTaxDue,
      });

      return {
        success: true,
        filingId,
        filing: {
          ...filing,
          id: filingId,
        } as Partial<TaxFiling>,
      };

    } catch (error) {
      logger.error('Error generating tax filing:', error);
      throw new HttpsError('internal', `Failed to generate tax filing: ${error}`);
    }
  });

/**
 * Generate all filings for a period
 * Useful for batch generation at end of month/quarter
 */
export const generateAllTaxFilings = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 540,
    memory: '1GiB',
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

    const { period, types = ['VAT_EE', 'OSS', 'DES'] } = request.data as { period: string; types?: TaxFilingType[] };

    const results: Array<{ type: TaxFilingType; success: boolean; filingId?: string; error?: string }> = [];

    for (const type of types) {
      try {
        const config = FILING_TYPE_CONFIGS[type];
        const filingId = generateFilingId(type, period);

        // Determine if this type should be generated for the period
        // Monthly types for any period, quarterly only for Q1-Q4
        const isQuarterly = config.frequency === 'QUARTERLY';
        const isQuarterlyPeriod = period.includes('Q');

        if (isQuarterly && !isQuarterlyPeriod) {
          results.push({
            type,
            success: false,
            error: 'Quarterly filing requires quarterly period (e.g., 2024-Q1)',
          });
          continue;
        }

        if (!isQuarterly && isQuarterlyPeriod) {
          results.push({
            type,
            success: false,
            error: 'Monthly filing requires monthly period (e.g., 2024-01)',
          });
          continue;
        }

        // Parse period
        const { start: periodStart, end: periodEnd } = parsePeriod(period, config.frequency);
        const dueDate = calculateDueDate(periodEnd, type);

        // Aggregate
        const aggregatedData = await aggregateTransactions(periodStart, periodEnd, type);
        const lines = buildFilingLines(aggregatedData, type);
        const summary = calculateSummary(lines, aggregatedData.totalSales);

        // Save
        const now = Timestamp.now();
        await db.collection('tax_filings').doc(filingId).set({
          type,
          period,
          periodStart: Timestamp.fromDate(periodStart),
          periodEnd: Timestamp.fromDate(periodEnd),
          frequency: config.frequency,
          dueDate: Timestamp.fromDate(dueDate),
          submissionDeadline: Timestamp.fromDate(dueDate),
          paymentDeadline: Timestamp.fromDate(dueDate),
          status: 'DRAFT',
          statusHistory: [{
            status: 'DRAFT',
            changedAt: now,
            changedBy: request.auth.uid,
            reason: 'Batch generation',
          }],
          summary,
          lines,
          generatedFiles: {},
          reminders: {
            sent30Days: false,
            sent7Days: false,
            sent1Day: false,
          },
          transactionIds: aggregatedData.transactionIds,
          createdAt: now,
          updatedAt: now,
          createdBy: request.auth.uid,
          updatedBy: request.auth.uid,
        }, { merge: true });

        results.push({
          type,
          success: true,
          filingId,
        });

      } catch (error) {
        logger.error(`Error generating ${type} filing:`, error);
        results.push({
          type,
          success: false,
          error: String(error),
        });
      }
    }

    return { results };
  });
