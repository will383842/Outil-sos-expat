/**
 * Admin Callable: Terminate Active Call
 *
 * Allows admins to force-terminate an active call via the Twilio API.
 * If the Twilio call has already ended, the Firestore document is still
 * updated so the admin action is always recorded.
 */

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getApps, initializeApp } from 'firebase-admin/app';
import { logger } from 'firebase-functions/v2';
import { adminConfig } from '../lib/functionConfigs';
import { TWILIO_SECRETS } from '../lib/secrets';

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
 * Input for terminating a call
 */
interface TerminateCallInput {
  callSessionId: string; // Firestore call_sessions doc ID
  reason: string; // Why the admin is terminating
}

/**
 * Admin Terminate Call
 *
 * Force-terminates an active call via Twilio and updates the Firestore
 * call session document. Creates an audit log entry for accountability.
 */
export const adminTerminateCall = onCall(
  { ...adminConfig, timeoutSeconds: 30, secrets: TWILIO_SECRETS },
  async (request): Promise<{ success: boolean; message: string; callSessionId: string }> => {
    ensureInitialized();
    const adminId = await verifyAdmin(request);

    const db = getFirestore();
    const input = request.data as TerminateCallInput;

    // --- Validation ---
    if (!input?.callSessionId) {
      throw new HttpsError('invalid-argument', 'callSessionId is required');
    }

    if (!input?.reason || input.reason.trim().length < 5) {
      throw new HttpsError('invalid-argument', 'reason is required (minimum 5 characters)');
    }

    const { callSessionId, reason } = input;

    try {
      logger.info('[adminTerminateCall] Terminating call', {
        adminId,
        callSessionId,
        reason,
      });

      // --- Read the call session ---
      const sessionRef = db.collection('call_sessions').doc(callSessionId);
      const sessionDoc = await sessionRef.get();

      if (!sessionDoc.exists) {
        throw new HttpsError('not-found', 'Call session not found');
      }

      const sessionData = sessionDoc.data()!;
      const previousStatus = sessionData.status as string;

      // Verify the session is not already in a terminal state
      const terminalStatuses = ['completed', 'cancelled', 'failed'];
      if (terminalStatuses.includes(previousStatus)) {
        throw new HttpsError(
          'failed-precondition',
          `Call session is already in terminal status: ${previousStatus}`
        );
      }

      // --- Terminate via Twilio ---
      // Call SIDs are per-participant (not at root level)
      const providerCallSid = sessionData.participants?.provider?.callSid || null;
      const clientCallSid = sessionData.participants?.client?.callSid || null;
      let twilioTerminated = false;

      if (providerCallSid || clientCallSid) {
        try {
          const { getTwilioClient } = await import('../lib/twilio');
          const client = getTwilioClient();

          if (providerCallSid) {
            try {
              await client.calls(providerCallSid).update({ status: 'completed' });
              twilioTerminated = true;
              logger.info('[adminTerminateCall] Provider call terminated', { providerCallSid });
            } catch (e) {
              logger.warn('[adminTerminateCall] Provider call termination failed (may have ended)', {
                providerCallSid,
                error: e instanceof Error ? e.message : 'Unknown error',
              });
            }
          }

          if (clientCallSid) {
            try {
              await client.calls(clientCallSid).update({ status: 'completed' });
              twilioTerminated = true;
              logger.info('[adminTerminateCall] Client call terminated', { clientCallSid });
            } catch (e) {
              logger.warn('[adminTerminateCall] Client call termination failed (may have ended)', {
                clientCallSid,
                error: e instanceof Error ? e.message : 'Unknown error',
              });
            }
          }
        } catch (importError) {
          logger.warn('[adminTerminateCall] Failed to load Twilio client', {
            error: importError instanceof Error ? importError.message : 'Unknown error',
          });
        }
      } else {
        logger.warn('[adminTerminateCall] No Twilio SIDs found on session participants', {
          callSessionId,
        });
      }

      // --- Update Firestore call session + audit log (atomic batch) ---
      const now = Timestamp.now();
      const auditRef = db.collection('admin_audit_logs').doc();
      const batch = db.batch();

      batch.update(sessionRef, {
        status: 'completed',
        adminTerminated: true,
        terminatedBy: adminId,
        terminationReason: reason,
        terminatedAt: now,
        'metadata.updatedAt': now,
      });

      batch.set(auditRef, {
        id: auditRef.id,
        action: 'call_terminated',
        actorId: adminId,
        actorType: 'admin',
        targetId: callSessionId,
        targetType: 'call_session',
        timestamp: now,
        details: {
          reason,
          providerCallSid,
          clientCallSid,
          previousStatus,
          twilioTerminated,
        },
      });

      await batch.commit();

      logger.info('[adminTerminateCall] Call terminated successfully', {
        adminId,
        callSessionId,
        providerCallSid,
        clientCallSid,
        previousStatus,
        twilioTerminated,
        auditLogId: auditRef.id,
      });

      return {
        success: true,
        message: 'Call terminated',
        callSessionId,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      logger.error('[adminTerminateCall] Error', {
        adminId,
        callSessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new HttpsError('internal', 'Failed to terminate call');
    }
  }
);
