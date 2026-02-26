/**
 * Admin Callable: Get Audit Logs
 *
 * Retrieves the audit trail for payment actions.
 * Supports filtering by withdrawal, date range, and action type.
 */

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getApps, initializeApp } from 'firebase-admin/app';
import { logger } from 'firebase-functions/v2';
import { adminConfig } from '../../../lib/functionConfigs';

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

/**
 * Verify that the request is from an admin user
 */
async function verifyAdmin(request: CallableRequest): Promise<string> {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required');
  }

  const uid = request.auth.uid;

  // Check custom claims first (faster)
  const role = request.auth.token?.role as string | undefined;
  if (role === 'admin') {
    return uid;
  }

  // Fall back to Firestore check
  const db = getFirestore();
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Admin access required');
  }

  return uid;
}

/**
 * Input for getting audit logs
 */
interface GetAuditLogsInput {
  withdrawalId?: string;
  userId?: string;
  actorId?: string;
  action?: string | string[];
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

/**
 * Audit log entry
 */
interface AuditLogEntry {
  id: string;
  action: string;
  actorId: string;
  actorType: 'user' | 'admin' | 'system';
  actorName?: string;
  targetId?: string;
  targetType?: string;
  timestamp: string;
  details: Record<string, unknown>;
}

/**
 * Response for audit logs
 */
interface GetAuditLogsResponse {
  logs: AuditLogEntry[];
  total: number;
  hasMore: boolean;
}

/**
 * Get Audit Logs
 *
 * Returns the audit trail for payment-related actions.
 * Supports comprehensive filtering for compliance and investigation.
 */
export const adminGetAuditLogs = onCall(
  { ...adminConfig, timeoutSeconds: 30 },
  async (request): Promise<GetAuditLogsResponse> => {
    ensureInitialized();
    const adminId = await verifyAdmin(request);

    const db = getFirestore();
    const input = (request.data as GetAuditLogsInput) || {};

    const {
      withdrawalId,
      userId,
      actorId,
      action,
      fromDate,
      toDate,
      limit = 50,
      offset = 0,
    } = input;

    try {
      logger.info('[adminGetAuditLogs] Fetching audit logs', {
        adminId,
        filters: { withdrawalId, userId, actorId, action, fromDate, toDate },
        pagination: { limit, offset },
      });

      // Build query
      let query = db.collection('payment_audit_logs') as FirebaseFirestore.Query;

      // Filter by withdrawal ID
      if (withdrawalId) {
        query = query.where('targetId', '==', withdrawalId);
      }

      // Filter by user ID (in details)
      if (userId) {
        query = query.where('details.userId', '==', userId);
      }

      // Filter by actor ID
      if (actorId) {
        query = query.where('actorId', '==', actorId);
      }

      // Filter by action type
      if (action) {
        const actions = Array.isArray(action) ? action : [action];
        if (actions.length === 1) {
          query = query.where('action', '==', actions[0]);
        } else if (actions.length <= 10) {
          query = query.where('action', 'in', actions);
        }
      }

      // Filter by date range
      if (fromDate) {
        const fromTimestamp = Timestamp.fromDate(new Date(fromDate));
        query = query.where('timestamp', '>=', fromTimestamp);
      }

      if (toDate) {
        const toTimestamp = Timestamp.fromDate(new Date(toDate));
        query = query.where('timestamp', '<=', toTimestamp);
      }

      // Order by timestamp (newest first)
      query = query.orderBy('timestamp', 'desc');

      // Get total count
      // Note: Firestore doesn't support count with all filters, so we estimate
      const countQuery = db.collection('payment_audit_logs').orderBy('timestamp', 'desc');
      const countSnapshot = await countQuery.limit(1000).get();
      const estimatedTotal = countSnapshot.size;

      // Apply pagination
      query = query.offset(offset).limit(limit);

      const snapshot = await query.get();

      // Map logs to response format
      const logs: AuditLogEntry[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          action: data.action,
          actorId: data.actorId,
          actorType: data.actorType,
          actorName: data.actorName,
          targetId: data.targetId,
          targetType: data.targetType,
          timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp,
          details: data.details || {},
        };
      });

      // Enrich logs with actor names if not present
      const actorIds = Array.from(new Set(logs.filter((l) => l.actorId && !l.actorName).map((l) => l.actorId)));

      if (actorIds.length > 0 && actorIds.length <= 10) {
        const userDocs = await Promise.all(
          actorIds.map((id) => db.collection('users').doc(id).get())
        );

        const actorNames: Record<string, string> = {};
        userDocs.forEach((doc) => {
          if (doc.exists) {
            const userData = doc.data();
            actorNames[doc.id] = userData?.displayName || userData?.email || doc.id;
          }
        });

        logs.forEach((log) => {
          if (log.actorId && actorNames[log.actorId]) {
            log.actorName = actorNames[log.actorId];
          }
        });
      }

      logger.info('[adminGetAuditLogs] Logs fetched', {
        adminId,
        returnedCount: logs.length,
        total: estimatedTotal,
      });

      return {
        logs,
        total: estimatedTotal,
        hasMore: offset + logs.length < estimatedTotal,
      };
    } catch (error) {
      logger.error('[adminGetAuditLogs] Error', {
        adminId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new HttpsError('internal', 'Failed to fetch audit logs');
    }
  }
);

/**
 * Get Audit Log Actions
 *
 * Returns the list of possible audit log actions for filtering.
 */
export const adminGetAuditLogActions = onCall(
  { ...adminConfig, memory: '256MiB', timeoutSeconds: 10 },
  async (request): Promise<{ actions: string[] }> => {
    ensureInitialized();
    await verifyAdmin(request);

    // Return all possible audit actions
    const actions = [
      'config_update',
      'withdrawal_requested',
      'withdrawal_approved',
      'withdrawal_rejected',
      'withdrawal_processing',
      'withdrawal_sent',
      'withdrawal_completed',
      'withdrawal_failed',
      'withdrawal_cancelled',
      'withdrawal_retry',
      'payment_method_added',
      'payment_method_removed',
      'payment_method_verified',
      'balance_updated',
      'refund_initiated',
      'refund_completed',
    ];

    return { actions };
  }
);
