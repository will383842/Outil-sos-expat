/**
 * sequentialInvoiceNumber.ts
 *
 * P2 FIX 2026-02-12: Sequential invoice numbering system (INTERNATIONAL COMPLIANCE)
 *
 * Provides atomic sequential invoice numbering that complies with international
 * invoicing standards requiring continuous, non-repeating, chronological numbers.
 *
 * Format: SOSEXPAT-YYYY-NNNNNN (e.g., SOSEXPAT-2026-000001)
 * - SOSEXPAT: Company identifier
 * - YYYY: Year (resets counter annually)
 * - NNNNNN: 6-digit sequential counter (000001-999999)
 *
 * Features:
 * - Atomic counter increment using Firestore transactions
 * - Annual counter reset (January 1st)
 * - Collision-free generation
 * - Retry logic for high concurrency
 * - Audit trail in invoice_counters collection
 *
 * Collections:
 * - invoice_counters/{year}: Stores counter for each year
 *   - year: number (e.g., 2026)
 *   - counter: number (current counter value)
 *   - lastInvoiceNumber: string (last generated invoice number)
 *   - lastGeneratedAt: Timestamp
 *   - totalInvoices: number (lifetime counter)
 */

import * as admin from "firebase-admin";

export interface InvoiceNumberResult {
  invoiceNumber: string;
  year: number;
  sequenceNumber: number;
  counter: number;
}

/**
 * Generate next sequential invoice number
 *
 * Uses Firestore transaction to atomically increment counter and prevent duplicates.
 * Automatically creates new counter document for new years.
 *
 * @returns Promise<InvoiceNumberResult> - Generated invoice number and metadata
 * @throws Error if generation fails after retries
 */
export async function generateSequentialInvoiceNumber(): Promise<InvoiceNumberResult> {
  const db = admin.firestore();
  const currentYear = new Date().getFullYear();
  const counterRef = db.collection("invoice_counters").doc(currentYear.toString());

  const maxRetries = 5;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const result = await db.runTransaction(async (transaction) => {
        const counterDoc = await transaction.get(counterRef);

        let counter: number;
        let isNewYear = false;

        if (!counterDoc.exists) {
          // Initialize counter for new year
          counter = 1;
          isNewYear = true;
          console.log(`📊 [SequentialInvoice] Initializing counter for year ${currentYear}`);
        } else {
          const data = counterDoc.data()!;
          counter = (data.counter || 0) + 1;

          // Safety check: ensure year matches
          if (data.year !== currentYear) {
            console.warn(
              `⚠️ [SequentialInvoice] Year mismatch in counter doc: expected ${currentYear}, got ${data.year}`
            );
            counter = 1;
            isNewYear = true;
          }
        }

        // Format: SOSEXPAT-2026-000001
        const sequenceStr = counter.toString().padStart(6, "0");
        const invoiceNumber = `SOSEXPAT-${currentYear}-${sequenceStr}`;

        // Update or create counter document
        const counterData = {
          year: currentYear,
          counter,
          lastInvoiceNumber: invoiceNumber,
          lastGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
          totalInvoices: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        if (isNewYear) {
          counterData.createdAt = admin.firestore.FieldValue.serverTimestamp();
        }

        transaction.set(counterRef, counterData, { merge: true });

        return {
          invoiceNumber,
          year: currentYear,
          sequenceNumber: counter,
          counter,
        };
      });

      console.log(
        `✅ [SequentialInvoice] Generated: ${result.invoiceNumber} (attempt ${attempt + 1})`
      );

      return result;
    } catch (error) {
      attempt++;
      console.warn(
        `⚠️ [SequentialInvoice] Transaction failed (attempt ${attempt}/${maxRetries}):`,
        error
      );

      if (attempt >= maxRetries) {
        console.error(`❌ [SequentialInvoice] Failed after ${maxRetries} attempts`);
        throw new Error(
          `Failed to generate sequential invoice number after ${maxRetries} attempts: ${error}`
        );
      }

      // Exponential backoff: 100ms, 200ms, 400ms, 800ms, 1600ms
      const backoffMs = 100 * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  throw new Error("Unexpected: loop exited without result or error");
}

/**
 * Get current counter value for a specific year
 *
 * @param year - Year to query (defaults to current year)
 * @returns Promise<number> - Current counter value (0 if not initialized)
 */
export async function getCurrentCounter(year?: number): Promise<number> {
  const db = admin.firestore();
  const targetYear = year || new Date().getFullYear();
  const counterRef = db.collection("invoice_counters").doc(targetYear.toString());

  const counterDoc = await counterRef.get();

  if (!counterDoc.exists) {
    return 0;
  }

  const data = counterDoc.data()!;
  return data.counter || 0;
}

/**
 * Validate invoice number format
 *
 * @param invoiceNumber - Invoice number to validate
 * @returns boolean - True if valid format
 */
export function validateInvoiceNumberFormat(invoiceNumber: string): boolean {
  // Format: SOSEXPAT-YYYY-NNNNNN
  const regex = /^SOSEXPAT-\d{4}-\d{6}$/;
  return regex.test(invoiceNumber);
}

/**
 * Parse invoice number into components
 *
 * @param invoiceNumber - Invoice number to parse
 * @returns Object with year and sequence, or null if invalid
 */
export function parseInvoiceNumber(
  invoiceNumber: string
): { year: number; sequence: number } | null {
  if (!validateInvoiceNumberFormat(invoiceNumber)) {
    return null;
  }

  const parts = invoiceNumber.split("-");
  return {
    year: parseInt(parts[1], 10),
    sequence: parseInt(parts[2], 10),
  };
}

/**
 * Get invoice statistics for a year
 *
 * @param year - Year to query (defaults to current year)
 * @returns Promise<object> - Statistics object
 */
export async function getInvoiceStats(year?: number): Promise<{
  year: number;
  totalInvoices: number;
  lastInvoiceNumber: string | null;
  lastGeneratedAt: Date | null;
}> {
  const db = admin.firestore();
  const targetYear = year || new Date().getFullYear();
  const counterRef = db.collection("invoice_counters").doc(targetYear.toString());

  const counterDoc = await counterRef.get();

  if (!counterDoc.exists) {
    return {
      year: targetYear,
      totalInvoices: 0,
      lastInvoiceNumber: null,
      lastGeneratedAt: null,
    };
  }

  const data = counterDoc.data()!;
  return {
    year: targetYear,
    totalInvoices: data.totalInvoices || data.counter || 0,
    lastInvoiceNumber: data.lastInvoiceNumber || null,
    lastGeneratedAt: data.lastGeneratedAt?.toDate() || null,
  };
}

/**
 * Manual counter reset (ADMIN ONLY - use with extreme caution)
 *
 * This should NEVER be called in production unless there's a critical error.
 * Resetting counters can break invoice number continuity which violates
 * international invoicing standards.
 *
 * @param year - Year to reset
 * @param newCounter - New counter value (defaults to 0)
 */
export async function resetCounter(year: number, newCounter: number = 0): Promise<void> {
  const db = admin.firestore();
  const counterRef = db.collection("invoice_counters").doc(year.toString());

  console.warn(`⚠️ [SequentialInvoice] RESETTING COUNTER for year ${year} to ${newCounter}`);

  await counterRef.set(
    {
      year,
      counter: newCounter,
      lastInvoiceNumber: null,
      lastGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
      totalInvoices: newCounter,
      resetAt: admin.firestore.FieldValue.serverTimestamp(),
      resetReason: "manual_reset",
    },
    { merge: true }
  );

  console.log(`✅ [SequentialInvoice] Counter reset complete for year ${year}`);
}
