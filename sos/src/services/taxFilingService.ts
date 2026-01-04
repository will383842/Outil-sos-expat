/**
 * Tax Filing Service
 *
 * Frontend service for managing tax filings
 * Handles Firestore queries and Cloud Function calls
 */

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
  onSnapshot,
  Timestamp,
  QueryConstraint,
  Unsubscribe,
} from 'firebase/firestore';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { db } from '../config/firebase';
import {
  TaxFiling,
  TaxFilingType,
  TaxFilingStatus,
  TaxFilingFilters,
  TaxFilingKPIs,
  TaxCalendarEvent,
  FILING_TYPE_CONFIGS,
  TAX_FILING_STATUS_LABELS,
  TAX_FILING_TYPE_LABELS,
} from '../types/taxFiling';

// ============================================================================
// FIREBASE FUNCTIONS
// ============================================================================

const functions = getFunctions(undefined, 'europe-west1');

// Callable function references
const generateTaxFilingFn = httpsCallable<
  { type: TaxFilingType; period: string; force?: boolean },
  { success: boolean; filingId?: string; filing?: Partial<TaxFiling>; error?: string }
>(functions, 'generateTaxFiling');

const generateAllTaxFilingsFn = httpsCallable<
  { period: string; types?: TaxFilingType[] },
  { results: Array<{ type: TaxFilingType; success: boolean; filingId?: string; error?: string }> }
>(functions, 'generateAllTaxFilings');

const updateFilingStatusFn = httpsCallable<
  {
    filingId: string;
    newStatus: TaxFilingStatus;
    reason?: string;
    confirmationNumber?: string;
    paymentReference?: string;
    notes?: string;
  },
  { success: boolean; filing?: Partial<TaxFiling>; error?: string }
>(functions, 'updateFilingStatus');

const deleteFilingDraftFn = httpsCallable<
  { filingId: string; confirm: boolean },
  { success: boolean; deletedId?: string }
>(functions, 'deleteFilingDraft');

const exportFilingToFormatFn = httpsCallable<
  { filingId: string; format: 'pdf' | 'csv' | 'xml' },
  { success: boolean; url?: string; error?: string }
>(functions, 'exportFilingToFormat');

const exportFilingAllFormatsFn = httpsCallable<
  { filingId: string },
  { success: boolean; files: { pdf?: string; csv?: string; xml?: string } }
>(functions, 'exportFilingAllFormats');

const triggerFilingRemindersFn = httpsCallable<
  Record<string, never>,
  {
    success: boolean;
    filingsChecked: number;
    remindersSent: number;
    results: Array<{
      filingId: string;
      type: string;
      period: string;
      daysUntilDue: number;
      reminderSent: boolean;
      reminderType?: string;
    }>;
  }
>(functions, 'triggerFilingReminders');

const updateFilingAmountsFn = httpsCallable<
  {
    filingId: string;
    taxDeductible?: number;
    notes?: string;
    lines?: Array<{
      countryCode: string;
      taxableBase?: number;
      taxAmount?: number;
    }>;
  },
  { success: boolean; filing?: Partial<TaxFiling>; error?: string }
>(functions, 'updateFilingAmounts');

// ============================================================================
// COLLECTION REFERENCE
// ============================================================================

const COLLECTION = 'tax_filings';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function toDate(value: unknown): Date {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') return new Date(value);
  return new Date();
}

function convertFirestoreFiling(docId: string, data: Record<string, unknown>): TaxFiling & { id: string } {
  return {
    id: docId,
    type: data.type as TaxFilingType,
    period: data.period as string,
    periodStart: data.periodStart as Timestamp,
    periodEnd: data.periodEnd as Timestamp,
    frequency: data.frequency as 'MONTHLY' | 'QUARTERLY' | 'ANNUAL',
    dueDate: data.dueDate as Timestamp,
    submissionDeadline: data.submissionDeadline as Timestamp,
    paymentDeadline: data.paymentDeadline as Timestamp,
    status: data.status as TaxFilingStatus,
    statusHistory: data.statusHistory as TaxFiling['statusHistory'],
    summary: data.summary as TaxFiling['summary'],
    lines: data.lines as TaxFiling['lines'],
    generatedFiles: (data.generatedFiles || {}) as TaxFiling['generatedFiles'],
    submittedAt: data.submittedAt as Timestamp | undefined,
    submittedBy: data.submittedBy as string | undefined,
    confirmationNumber: data.confirmationNumber as string | undefined,
    paymentReference: data.paymentReference as string | undefined,
    paidAt: data.paidAt as Timestamp | undefined,
    paymentConfirmation: data.paymentConfirmation as string | undefined,
    reminders: (data.reminders || {
      sent30Days: false,
      sent7Days: false,
      sent1Day: false,
    }) as TaxFiling['reminders'],
    notes: data.notes as string | undefined,
    rejectionReason: data.rejectionReason as string | undefined,
    transactionIds: data.transactionIds as string[] | undefined,
    createdAt: data.createdAt as Timestamp,
    updatedAt: data.updatedAt as Timestamp,
    createdBy: data.createdBy as string | undefined,
    updatedBy: data.updatedBy as string | undefined,
  };
}

// ============================================================================
// FETCH FUNCTIONS
// ============================================================================

/**
 * Fetch all tax filings with optional filters
 */
export async function fetchTaxFilings(
  filters: TaxFilingFilters = {}
): Promise<(TaxFiling & { id: string })[]> {
  try {
    const constraints: QueryConstraint[] = [
      orderBy('dueDate', 'desc'),
    ];

    // Add type filter
    if (filters.type && filters.type !== 'all') {
      constraints.push(where('type', '==', filters.type));
    }

    // Add status filter
    if (filters.status && filters.status !== 'all') {
      constraints.push(where('status', '==', filters.status));
    }

    // Add year filter
    if (filters.year) {
      const yearStart = new Date(filters.year, 0, 1);
      const yearEnd = new Date(filters.year + 1, 0, 1);
      constraints.push(where('periodStart', '>=', Timestamp.fromDate(yearStart)));
      constraints.push(where('periodStart', '<', Timestamp.fromDate(yearEnd)));
    }

    const q = query(collection(db, COLLECTION), ...constraints);
    const snapshot = await getDocs(q);

    const filings: (TaxFiling & { id: string })[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      filings.push(convertFirestoreFiling(docSnap.id, data));
    });

    return filings;
  } catch (error) {
    console.error('[TaxFilingService] Error fetching filings:', error);
    return [];
  }
}

/**
 * Fetch a single tax filing by ID
 */
export async function fetchTaxFilingById(filingId: string): Promise<(TaxFiling & { id: string }) | null> {
  try {
    const docRef = doc(db, COLLECTION, filingId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return convertFirestoreFiling(docSnap.id, docSnap.data());
  } catch (error) {
    console.error('[TaxFilingService] Error fetching filing by ID:', error);
    return null;
  }
}

/**
 * Subscribe to tax filings updates (real-time)
 */
export function subscribeTaxFilings(
  filters: TaxFilingFilters,
  callback: (filings: (TaxFiling & { id: string })[]) => void
): Unsubscribe {
  const constraints: QueryConstraint[] = [
    orderBy('dueDate', 'desc'),
  ];

  if (filters.type && filters.type !== 'all') {
    constraints.push(where('type', '==', filters.type));
  }

  if (filters.status && filters.status !== 'all') {
    constraints.push(where('status', '==', filters.status));
  }

  const q = query(collection(db, COLLECTION), ...constraints);

  return onSnapshot(q, (snapshot) => {
    const filings: (TaxFiling & { id: string })[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      filings.push(convertFirestoreFiling(docSnap.id, data));
    });

    callback(filings);
  }, (error) => {
    console.error('[TaxFilingService] Error in subscription:', error);
    callback([]);
  });
}

// ============================================================================
// KPIs AND STATISTICS
// ============================================================================

/**
 * Calculate KPIs for tax filings dashboard
 */
export async function fetchTaxFilingKPIs(): Promise<TaxFilingKPIs> {
  try {
    const allFilings = await fetchTaxFilings({});

    const now = new Date();
    const pendingStatuses: TaxFilingStatus[] = ['DRAFT', 'PENDING_REVIEW'];
    const overdueFilings = allFilings.filter(f => {
      const dueDate = toDate(f.dueDate);
      return pendingStatuses.includes(f.status) && dueDate < now;
    });

    const upcomingDeadlines = allFilings
      .filter(f => {
        const dueDate = toDate(f.dueDate);
        return pendingStatuses.includes(f.status) && dueDate >= now;
      })
      .sort((a, b) => toDate(a.dueDate).getTime() - toDate(b.dueDate).getTime())
      .slice(0, 5)
      .map(f => {
        const dueDate = toDate(f.dueDate);
        return {
          type: f.type,
          period: f.period,
          dueDate,
          daysUntilDue: Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        };
      });

    const totalTaxDue = allFilings
      .filter(f => f.status !== 'PAID' && f.status !== 'REJECTED')
      .reduce((sum, f) => sum + (f.summary?.netTaxPayable || 0), 0);

    const totalTaxPaid = allFilings
      .filter(f => f.status === 'PAID')
      .reduce((sum, f) => sum + (f.summary?.netTaxPayable || 0), 0);

    return {
      totalFilings: allFilings.length,
      pendingFilings: allFilings.filter(f => pendingStatuses.includes(f.status)).length,
      overdueFilings: overdueFilings.length,
      totalTaxDue,
      totalTaxPaid,
      upcomingDeadlines,
    };
  } catch (error) {
    console.error('[TaxFilingService] Error calculating KPIs:', error);
    return {
      totalFilings: 0,
      pendingFilings: 0,
      overdueFilings: 0,
      totalTaxDue: 0,
      totalTaxPaid: 0,
      upcomingDeadlines: [],
    };
  }
}

/**
 * Get calendar events for tax deadlines
 */
export async function fetchTaxCalendarEvents(
  year: number,
  month?: number
): Promise<TaxCalendarEvent[]> {
  try {
    const allFilings = await fetchTaxFilings({ year });
    const now = new Date();

    let filteredFilings = allFilings;
    if (month !== undefined) {
      filteredFilings = allFilings.filter(f => {
        const dueDate = toDate(f.dueDate);
        return dueDate.getMonth() === month;
      });
    }

    return filteredFilings.map(f => {
      const dueDate = toDate(f.dueDate);
      const config = FILING_TYPE_CONFIGS[f.type];

      return {
        id: f.id,
        type: f.type,
        period: f.period,
        title: `${config.nameFr} - ${f.period}`,
        date: dueDate,
        status: f.status,
        amount: f.summary?.netTaxPayable,
        isOverdue: dueDate < now && !['SUBMITTED', 'ACCEPTED', 'PAID'].includes(f.status),
      };
    });
  } catch (error) {
    console.error('[TaxFilingService] Error fetching calendar events:', error);
    return [];
  }
}

// ============================================================================
// CLOUD FUNCTION WRAPPERS
// ============================================================================

/**
 * Generate a new tax filing draft
 */
export async function generateTaxFiling(
  type: TaxFilingType,
  period: string,
  force = false
): Promise<{ success: boolean; filingId?: string; error?: string }> {
  try {
    const result = await generateTaxFilingFn({ type, period, force });
    return result.data;
  } catch (error) {
    console.error('[TaxFilingService] Error generating filing:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Generate all filings for a period
 */
export async function generateAllTaxFilings(
  period: string,
  types?: TaxFilingType[]
): Promise<{
  results: Array<{ type: TaxFilingType; success: boolean; filingId?: string; error?: string }>;
}> {
  try {
    const result = await generateAllTaxFilingsFn({ period, types });
    return result.data;
  } catch (error) {
    console.error('[TaxFilingService] Error generating all filings:', error);
    return { results: [] };
  }
}

/**
 * Update filing status
 */
export async function updateFilingStatus(
  filingId: string,
  newStatus: TaxFilingStatus,
  options: {
    reason?: string;
    confirmationNumber?: string;
    paymentReference?: string;
    notes?: string;
  } = {}
): Promise<{ success: boolean; filing?: Partial<TaxFiling>; error?: string }> {
  try {
    const result = await updateFilingStatusFn({
      filingId,
      newStatus,
      ...options,
    });
    return result.data;
  } catch (error) {
    console.error('[TaxFilingService] Error updating status:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Delete a draft filing
 */
export async function deleteFilingDraft(
  filingId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await deleteFilingDraftFn({ filingId, confirm: true });
    return { success: result.data.success };
  } catch (error) {
    console.error('[TaxFilingService] Error deleting draft:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Export filing to specific format
 */
export async function exportFilingToFormat(
  filingId: string,
  format: 'pdf' | 'csv' | 'xml'
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const result = await exportFilingToFormatFn({ filingId, format });
    return result.data;
  } catch (error) {
    console.error('[TaxFilingService] Error exporting filing:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Export filing to all formats
 */
export async function exportFilingAllFormats(
  filingId: string
): Promise<{ success: boolean; files?: { pdf?: string; csv?: string; xml?: string }; error?: string }> {
  try {
    const result = await exportFilingAllFormatsFn({ filingId });
    return { success: result.data.success, files: result.data.files };
  } catch (error) {
    console.error('[TaxFilingService] Error exporting all formats:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Manually trigger filing reminders
 */
export async function triggerFilingReminders(): Promise<{
  success: boolean;
  remindersSent?: number;
  error?: string;
}> {
  try {
    const result = await triggerFilingRemindersFn({});
    return {
      success: result.data.success,
      remindersSent: result.data.remindersSent,
    };
  } catch (error) {
    console.error('[TaxFilingService] Error triggering reminders:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Update filing amounts (deductible VAT, line adjustments)
 */
export async function updateFilingAmounts(
  filingId: string,
  updates: {
    taxDeductible?: number;
    notes?: string;
    lines?: Array<{
      countryCode: string;
      taxableBase?: number;
      taxAmount?: number;
    }>;
  }
): Promise<{ success: boolean; filing?: Partial<TaxFiling>; error?: string }> {
  try {
    const result = await updateFilingAmountsFn({
      filingId,
      ...updates,
    });
    return result.data;
  } catch (error) {
    console.error('[TaxFilingService] Error updating amounts:', error);
    return { success: false, error: String(error) };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get current period string for a filing type
 */
export function getCurrentPeriod(type: TaxFilingType): string {
  const config = FILING_TYPE_CONFIGS[type];
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Get previous period (current month's filing is for previous period)
  if (config.frequency === 'MONTHLY') {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    return `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
  } else if (config.frequency === 'QUARTERLY') {
    // Get previous quarter
    const currentQuarter = Math.ceil(month / 3);
    const prevQuarter = currentQuarter === 1 ? 4 : currentQuarter - 1;
    const prevYear = currentQuarter === 1 ? year - 1 : year;
    return `${prevYear}-Q${prevQuarter}`;
  } else {
    // Annual
    return `${year - 1}`;
  }
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format date for display
 */
export function formatDate(date: Date | Timestamp): string {
  const d = date instanceof Timestamp ? date.toDate() : date;
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Get status color class
 */
export function getStatusColor(status: TaxFilingStatus): string {
  const colors: Record<TaxFilingStatus, string> = {
    DRAFT: 'bg-gray-100 text-gray-800',
    PENDING_REVIEW: 'bg-yellow-100 text-yellow-800',
    SUBMITTED: 'bg-blue-100 text-blue-800',
    ACCEPTED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    PAID: 'bg-emerald-100 text-emerald-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Get filing type badge color
 */
export function getTypeColor(type: TaxFilingType): string {
  const colors: Record<TaxFilingType, string> = {
    VAT_EE: 'bg-purple-100 text-purple-800',
    OSS: 'bg-indigo-100 text-indigo-800',
    DES: 'bg-cyan-100 text-cyan-800',
    UK_VAT: 'bg-rose-100 text-rose-800',
    CH_VAT: 'bg-orange-100 text-orange-800',
  };
  return colors[type] || 'bg-gray-100 text-gray-800';
}

/**
 * Check if a filing is overdue
 */
export function isFilingOverdue(filing: TaxFiling): boolean {
  const dueDate = toDate(filing.dueDate);
  const now = new Date();
  const pendingStatuses: TaxFilingStatus[] = ['DRAFT', 'PENDING_REVIEW'];
  return pendingStatuses.includes(filing.status) && dueDate < now;
}

/**
 * Get days until due date
 */
export function getDaysUntilDue(filing: TaxFiling): number {
  const dueDate = toDate(filing.dueDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  return Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
