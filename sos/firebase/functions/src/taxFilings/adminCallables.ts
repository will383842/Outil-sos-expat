/**
 * Tax Filing Admin Callable Functions
 *
 * Administrative functions for managing tax filings
 */

import * as functions from 'firebase-functions';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { TaxFiling, TaxFilingStatus } from './types';

const db = getFirestore();

// ============================================================================
// UPDATE FILING STATUS
// ============================================================================

interface UpdateStatusRequest {
  filingId: string;
  newStatus: TaxFilingStatus;
  reason?: string;
  confirmationNumber?: string;
  paymentReference?: string;
  notes?: string;
}

interface UpdateStatusResponse {
  success: boolean;
  filing?: Partial<TaxFiling>;
  error?: string;
}

/**
 * Update the status of a tax filing
 */
export const updateFilingStatus = functions
  .region('europe-west1')
  .runWith({
    timeoutSeconds: 30,
    memory: '256MB',
  })
  .https.onCall(async (data: UpdateStatusRequest, context): Promise<UpdateStatusResponse> => {
    // Check authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    // Check admin claim
    const customClaims = context.auth.token;
    if (!customClaims.admin && !customClaims.superAdmin) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const { filingId, newStatus, reason, confirmationNumber, paymentReference, notes } = data;

    // Validate inputs
    if (!filingId) {
      throw new functions.https.HttpsError('invalid-argument', 'Filing ID is required');
    }

    const validStatuses: TaxFilingStatus[] = ['DRAFT', 'PENDING_REVIEW', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'PAID'];
    if (!newStatus || !validStatuses.includes(newStatus)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid status');
    }

    try {
      const filingRef = db.collection('tax_filings').doc(filingId);
      const filingDoc = await filingRef.get();

      if (!filingDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Filing not found');
      }

      const currentFiling = filingDoc.data() as TaxFiling;
      const now = Timestamp.now();

      // Build update object
      const updateData: Record<string, unknown> = {
        status: newStatus,
        updatedAt: now,
        updatedBy: context.auth.uid,
        statusHistory: FieldValue.arrayUnion({
          status: newStatus,
          changedAt: now,
          changedBy: context.auth.uid,
          reason: reason || `Status changed to ${newStatus}`,
        }),
      };

      // Add status-specific fields
      if (newStatus === 'SUBMITTED') {
        updateData.submittedAt = now;
        updateData.submittedBy = context.auth.uid;
        if (confirmationNumber) {
          updateData.confirmationNumber = confirmationNumber;
        }
      }

      if (newStatus === 'PAID') {
        updateData.paidAt = now;
        if (paymentReference) {
          updateData.paymentReference = paymentReference;
        }
      }

      if (newStatus === 'REJECTED' && reason) {
        updateData.rejectionReason = reason;
      }

      if (notes) {
        updateData.notes = notes;
      }

      await filingRef.update(updateData);

      functions.logger.info(`Tax filing status updated`, {
        filingId,
        oldStatus: currentFiling.status,
        newStatus,
        updatedBy: context.auth.uid,
      });

      // Get updated filing
      const updatedDoc = await filingRef.get();
      const updatedFiling = { id: updatedDoc.id, ...updatedDoc.data() } as TaxFiling & { id: string };

      return {
        success: true,
        filing: updatedFiling,
      };

    } catch (error) {
      functions.logger.error('Error updating filing status:', error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError('internal', `Failed to update status: ${error}`);
    }
  });

// ============================================================================
// DELETE DRAFT FILING
// ============================================================================

interface DeleteDraftRequest {
  filingId: string;
  confirm: boolean;
}

/**
 * Delete a draft tax filing (only DRAFT status can be deleted)
 */
export const deleteFilingDraft = functions
  .region('europe-west1')
  .runWith({
    timeoutSeconds: 30,
    memory: '256MB',
  })
  .https.onCall(async (data: DeleteDraftRequest, context) => {
    // Check authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    // Check admin claim
    const customClaims = context.auth.token;
    if (!customClaims.admin && !customClaims.superAdmin) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const { filingId, confirm } = data;

    if (!filingId) {
      throw new functions.https.HttpsError('invalid-argument', 'Filing ID is required');
    }

    if (!confirm) {
      throw new functions.https.HttpsError('failed-precondition', 'Deletion not confirmed');
    }

    try {
      const filingRef = db.collection('tax_filings').doc(filingId);
      const filingDoc = await filingRef.get();

      if (!filingDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Filing not found');
      }

      const filing = filingDoc.data() as TaxFiling;

      // Only allow deletion of DRAFT status
      if (filing.status !== 'DRAFT') {
        throw new functions.https.HttpsError(
          'failed-precondition',
          `Cannot delete filing with status ${filing.status}. Only DRAFT filings can be deleted.`
        );
      }

      // Delete the filing
      await filingRef.delete();

      functions.logger.info(`Tax filing draft deleted`, {
        filingId,
        type: filing.type,
        period: filing.period,
        deletedBy: context.auth.uid,
      });

      return {
        success: true,
        deletedId: filingId,
      };

    } catch (error) {
      functions.logger.error('Error deleting filing draft:', error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError('internal', `Failed to delete draft: ${error}`);
    }
  });

// ============================================================================
// UPDATE FILING AMOUNTS
// ============================================================================

interface UpdateAmountsRequest {
  filingId: string;
  taxDeductible?: number;
  notes?: string;
  lines?: Array<{
    countryCode: string;
    taxableBase?: number;
    taxAmount?: number;
  }>;
}

/**
 * Update amounts in a filing (e.g., add deductible VAT)
 */
export const updateFilingAmounts = functions
  .region('europe-west1')
  .runWith({
    timeoutSeconds: 30,
    memory: '256MB',
  })
  .https.onCall(async (data: UpdateAmountsRequest, context) => {
    // Check authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    // Check admin claim
    const customClaims = context.auth.token;
    if (!customClaims.admin && !customClaims.superAdmin) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const { filingId, taxDeductible, notes, lines } = data;

    if (!filingId) {
      throw new functions.https.HttpsError('invalid-argument', 'Filing ID is required');
    }

    try {
      const filingRef = db.collection('tax_filings').doc(filingId);
      const filingDoc = await filingRef.get();

      if (!filingDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Filing not found');
      }

      const filing = filingDoc.data() as TaxFiling;

      // Only allow updates to DRAFT or PENDING_REVIEW status
      if (!['DRAFT', 'PENDING_REVIEW'].includes(filing.status)) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          `Cannot update filing with status ${filing.status}`
        );
      }

      const now = Timestamp.now();
      const updateData: Record<string, unknown> = {
        updatedAt: now,
        updatedBy: context.auth.uid,
      };

      // Update deductible VAT
      if (taxDeductible !== undefined) {
        updateData['summary.totalTaxDeductible'] = taxDeductible;
        updateData['summary.netTaxPayable'] = filing.summary.totalTaxDue - taxDeductible;
      }

      // Update notes
      if (notes !== undefined) {
        updateData.notes = notes;
      }

      // Update individual lines if provided
      if (lines && lines.length > 0) {
        const updatedLines = [...filing.lines];

        for (const lineUpdate of lines) {
          const lineIndex = updatedLines.findIndex(l => l.countryCode === lineUpdate.countryCode);
          if (lineIndex >= 0) {
            if (lineUpdate.taxableBase !== undefined) {
              updatedLines[lineIndex].taxableBase = lineUpdate.taxableBase;
            }
            if (lineUpdate.taxAmount !== undefined) {
              updatedLines[lineIndex].taxAmount = lineUpdate.taxAmount;
            }
          }
        }

        updateData.lines = updatedLines;

        // Recalculate summary
        const totalTaxableBase = updatedLines.reduce((sum, l) => sum + l.taxableBase, 0);
        const totalTaxDue = updatedLines.reduce((sum, l) => sum + l.taxAmount, 0);
        const deductible = taxDeductible ?? filing.summary.totalTaxDeductible;

        updateData['summary.totalTaxableBase'] = totalTaxableBase;
        updateData['summary.totalTaxDue'] = totalTaxDue;
        updateData['summary.netTaxPayable'] = totalTaxDue - deductible;
      }

      await filingRef.update(updateData);

      functions.logger.info(`Tax filing amounts updated`, {
        filingId,
        updatedBy: context.auth.uid,
      });

      // Get updated filing
      const updatedDoc = await filingRef.get();
      const updatedFiling = { id: updatedDoc.id, ...updatedDoc.data() } as TaxFiling & { id: string };

      return {
        success: true,
        filing: updatedFiling,
      };

    } catch (error) {
      functions.logger.error('Error updating filing amounts:', error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError('internal', `Failed to update amounts: ${error}`);
    }
  });
