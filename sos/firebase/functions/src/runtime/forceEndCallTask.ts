// firebase/functions/src/runtime/forceEndCallTask.ts
// Cloud Task handler to force-end calls that exceed maximum duration
import { onRequest } from "firebase-functions/v2/https";
import { Request, Response } from "express";
import * as admin from 'firebase-admin';
import { logError } from "../utils/logs/logError";
import { logCallRecord } from "../utils/logs/logCallRecord";
import { logger as prodLogger } from "../utils/productionLogger";
// P0 FIX: Import secrets from centralized secrets.ts - NEVER call defineSecret() here!
import { TASKS_AUTH_SECRET } from "../lib/secrets";

interface ForceEndCallPayload {
  sessionId: string;
  reason: string;
  scheduledAt: string;
  taskId: string;
  maxDuration: number;
}

/**
 * Cloud Task handler to force-end a call if it's still active after maximum duration.
 * This is a safety net in case normal call termination fails.
 *
 * Actions:
 * 1. Check if session is still in active/connecting state
 * 2. If yes, forcefully terminate both participants
 * 3. Mark session as failed and trigger refund
 */
export const forceEndCallTask = onRequest(
  {
    region: "europe-west1",
    memory: "256MiB",
    cpu: 0.25,
    maxInstances: 5,
    minInstances: 0,
    concurrency: 1,
    timeoutSeconds: 60,
    secrets: [TASKS_AUTH_SECRET]
  },
  async (req: Request, res: Response) => {
    const debugId = `force_end_${Date.now().toString(36)}`;
    const startTime = Date.now();

    try {
      console.log(`\n${'🛑'.repeat(40)}`);
      console.log(`🛑 [${debugId}] forceEndCallTask START`);
      console.log(`🛑 [${debugId}] Method: ${req.method}`);
      console.log(`${'🛑'.repeat(40)}`);

      // STEP 1: Authentication
      const authHeader = req.get("X-Task-Auth") || "";
      const expectedAuth = TASKS_AUTH_SECRET.value() || "";

      if (!authHeader || authHeader !== expectedAuth) {
        console.error(`🛑 [${debugId}] ❌ Authentication failed`);
        res.status(401).send("Unauthorized");
        return;
      }
      console.log(`🛑 [${debugId}] ✅ Authentication successful`);

      // STEP 2: Extract payload
      const payload = req.body as ForceEndCallPayload;
      const { sessionId, reason, taskId, maxDuration } = payload;

      console.log(`🛑 [${debugId}] Payload:`, {
        sessionId,
        reason,
        taskId,
        maxDuration
      });

      if (!sessionId) {
        console.error(`🛑 [${debugId}] ❌ Missing sessionId`);
        res.status(400).json({ success: false, error: "Missing sessionId" });
        return;
      }

      prodLogger.info('FORCE_END_CALL_TASK_START', `Processing force end call for session ${sessionId}`, {
        sessionId,
        reason,
        taskId,
        maxDuration,
        debugId
      });

      // STEP 3: Get session and check if still active
      const db = admin.firestore();
      const sessionRef = db.collection('call_sessions').doc(sessionId);
      const sessionDoc = await sessionRef.get();

      if (!sessionDoc.exists) {
        console.log(`🛑 [${debugId}] Session ${sessionId} not found - nothing to do`);
        res.status(200).json({ success: true, message: "Session not found" });
        return;
      }

      const session = sessionDoc.data();
      const sessionStatus = session?.status;

      console.log(`🛑 [${debugId}] Session status: ${sessionStatus}`);

      // Only force-end if session is in active/connecting state
      const activeStatuses = ['active', 'provider_connecting', 'client_connecting', 'both_connecting', 'pending'];

      if (!activeStatuses.includes(sessionStatus)) {
        console.log(`🛑 [${debugId}] Session ${sessionId} is in terminal state (${sessionStatus}) - nothing to do`);
        res.status(200).json({
          success: true,
          message: `Session already in terminal state: ${sessionStatus}`,
          sessionId
        });
        return;
      }

      console.log(`🛑 [${debugId}] ⚠️ Session ${sessionId} is STILL ACTIVE after ${maxDuration}s - FORCE ENDING`);

      // STEP 4: Force terminate Twilio calls
      const clientCallSid = session?.participants?.client?.callSid;
      const providerCallSid = session?.participants?.provider?.callSid;

      let clientHungUp = false;
      let providerHungUp = false;

      try {
        const { getTwilioClient } = await import('../lib/twilio');
        const twilioClient = getTwilioClient();

        // Hang up client
        if (clientCallSid) {
          try {
            console.log(`🛑 [${debugId}] Hanging up client call: ${clientCallSid}`);
            await twilioClient.calls(clientCallSid).update({ status: 'completed' });
            clientHungUp = true;
            console.log(`🛑 [${debugId}]   ✅ Client call hung up`);
          } catch (clientError) {
            console.warn(`🛑 [${debugId}]   ⚠️ Failed to hang up client:`, clientError);
          }
        }

        // Hang up provider
        if (providerCallSid) {
          try {
            console.log(`🛑 [${debugId}] Hanging up provider call: ${providerCallSid}`);
            await twilioClient.calls(providerCallSid).update({ status: 'completed' });
            providerHungUp = true;
            console.log(`🛑 [${debugId}]   ✅ Provider call hung up`);
          } catch (providerError) {
            console.warn(`🛑 [${debugId}]   ⚠️ Failed to hang up provider:`, providerError);
          }
        }
      } catch (twilioError) {
        console.error(`🛑 [${debugId}] ❌ Twilio error:`, twilioError);
      }

      // STEP 5: Update session status
      await sessionRef.update({
        status: 'failed',
        'payment.status': 'cancelled',
        'payment.refundReason': 'force_end_call_timeout',
        'metadata.forceEndedAt': admin.firestore.FieldValue.serverTimestamp(),
        'metadata.forceEndReason': reason,
        'metadata.forceEndTaskId': taskId,
        'metadata.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
        'participants.client.status': 'disconnected',
        'participants.provider.status': 'disconnected'
      });

      console.log(`🛑 [${debugId}] ✅ Session ${sessionId} marked as failed`);

      // STEP 6: Log the event
      await logCallRecord({
        callId: sessionId,
        status: 'force_ended_timeout',
        retryCount: 0,
        additionalData: {
          reason,
          taskId,
          maxDuration,
          clientHungUp,
          providerHungUp,
          previousStatus: sessionStatus,
          forceEndedAt: new Date().toISOString()
        }
      });

      // STEP 7: Free up the provider if they were in this call
      if (session?.metadata?.providerId) {
        try {
          const { setProviderAvailable } = await import('../callables/providerStatusManager');
          await setProviderAvailable(session.metadata.providerId, 'force_end_call');
          console.log(`🛑 [${debugId}] ✅ Provider ${session.metadata.providerId} freed`);
        } catch (providerError) {
          console.warn(`🛑 [${debugId}] ⚠️ Failed to free provider:`, providerError);
        }
      }

      const executionTime = Date.now() - startTime;

      prodLogger.info('FORCE_END_CALL_TASK_SUCCESS', `Force ended session ${sessionId}`, {
        sessionId,
        reason,
        clientHungUp,
        providerHungUp,
        previousStatus: sessionStatus,
        executionTimeMs: executionTime,
        debugId
      });

      console.log(`\n${'🛑'.repeat(40)}`);
      console.log(`🛑 [${debugId}] forceEndCallTask COMPLETE`);
      console.log(`🛑 [${debugId}]   sessionId: ${sessionId}`);
      console.log(`🛑 [${debugId}]   previousStatus: ${sessionStatus}`);
      console.log(`🛑 [${debugId}]   clientHungUp: ${clientHungUp}`);
      console.log(`🛑 [${debugId}]   providerHungUp: ${providerHungUp}`);
      console.log(`🛑 [${debugId}]   executionTime: ${executionTime}ms`);
      console.log(`${'🛑'.repeat(40)}\n`);

      res.status(200).json({
        success: true,
        sessionId,
        forceEnded: true,
        previousStatus: sessionStatus,
        clientHungUp,
        providerHungUp,
        executionTimeMs: executionTime
      });

    } catch (error) {
      const executionTime = Date.now() - startTime;

      console.error(`\n${'❌'.repeat(40)}`);
      console.error(`🛑 [${debugId}] ❌ forceEndCallTask EXCEPTION:`, {
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack?.split('\n').slice(0, 5).join(' | ') : 'N/A',
        executionTimeMs: executionTime
      });
      console.error(`${'❌'.repeat(40)}\n`);

      await logError('forceEndCallTask', error);

      // Return 200 to prevent Cloud Tasks retry
      res.status(200).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTimeMs: executionTime
      });
    }
  }
);
