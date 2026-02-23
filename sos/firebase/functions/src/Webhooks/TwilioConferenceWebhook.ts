import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { twilioCallManager } from '../TwilioCallManager';
import { logCallRecord } from '../utils/logs/logCallRecord';
import { logError } from '../utils/logs/logError';
import { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { validateTwilioWebhookSignature, TWILIO_AUTH_TOKEN_SECRET, TWILIO_ACCOUNT_SID_SECRET } from '../lib/twilio';
import { STRIPE_SECRET_KEY_LIVE, STRIPE_SECRET_KEY_TEST } from '../lib/stripe';
// P0 FIX: Import secrets from centralized secrets.ts - NEVER call defineSecret() here!
import { TASKS_AUTH_SECRET, PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } from '../lib/secrets';
// P0 FIX: Import call region from centralized config - dedicated region for call functions
import { CALL_FUNCTIONS_REGION } from '../configs/callRegion';
import { captureError } from '../config/sentry';

// Ensure TypeScript recognizes the secrets are used in the secrets array
void TWILIO_AUTH_TOKEN_SECRET;
void TWILIO_ACCOUNT_SID_SECRET;
void STRIPE_SECRET_KEY_LIVE;
void STRIPE_SECRET_KEY_TEST;
void TASKS_AUTH_SECRET;
void PAYPAL_CLIENT_ID;
void PAYPAL_CLIENT_SECRET;

interface TwilioConferenceWebhookBody {
  ConferenceSid: string;
  StatusCallbackEvent: string;
  FriendlyName: string;
  Timestamp: string;
  
  // Événements join/leave
  CallSid?: string;
  Muted?: string;
  Hold?: string;
  
  // Événements start/end
  ConferenceStatus?: string;
  Duration?: string;
  
  // Participant info
  ParticipantLabel?: string;
  
  // Recording info (si applicable)
  RecordingUrl?: string;
  RecordingSid?: string;
}

/**
 * Webhook pour les événements de conférence Twilio
 * Gère: start, end, join, leave, mute, hold
 */
export const twilioConferenceWebhook = onRequest(
  {
    // P0 FIX 2026-02-04: Migrated to dedicated region for call functions to avoid quota issues
    region: CALL_FUNCTIONS_REGION,
    // P0 CRITICAL FIX 2026-02-04: Allow unauthenticated access for Twilio webhooks (Cloud Run requires explicit public access)
    invoker: "public",
    memory: '512MiB',  // P0 FIX: Increased for payment capture operations
    cpu: 0.25,         // P0 FIX: Reduced to save quota (function mostly waits for API responses)
    timeoutSeconds: 540, // P1 FIX: 9 minutes — payment capture + Stripe API calls can be slow
    maxInstances: 10,  // P0 FIX: Increased for better scalability during peak
    minInstances: 1,   // P0 FIX 2026-02-23: Restored to 1 — cold start on real-time conference webhook is unacceptable
    concurrency: 1,
    // P0 CRITICAL FIX: Add Twilio secrets for signature validation + Stripe secrets for payment capture
    // P0 FIX 2026-01-18: Added TASKS_AUTH_SECRET for scheduleProviderAvailableTask (provider cooldown)
    // P0 FIX 2026-02-02: Added PAYPAL secrets for PayPal payment capture/void operations
    secrets: [TWILIO_AUTH_TOKEN_SECRET, TWILIO_ACCOUNT_SID_SECRET, STRIPE_SECRET_KEY_LIVE, STRIPE_SECRET_KEY_TEST, TASKS_AUTH_SECRET, PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET]
  },
  async (req: Request, res: Response) => {
    const confWebhookId = `conf_${Date.now().toString(36)}`;

    try {
      logger.info(`\n${'▓'.repeat(70)}`);
      logger.info(`🎤 [${confWebhookId}] twilioConferenceWebhook START`);

      // ===== P0 SECURITY FIX: Validate Twilio signature =====
      if (!validateTwilioWebhookSignature(req, res)) {
        logger.error(`🎤 [${confWebhookId}] Invalid Twilio signature - rejecting request`);
        return; // Response already sent by validateTwilioWebhookSignature
      }

      const body: TwilioConferenceWebhookBody = req.body;

      logger.info(`🎤 [${confWebhookId}] Conference Webhook reçu:`, {
        event: body.StatusCallbackEvent,
        conferenceSid: body.ConferenceSid,
        conferenceStatus: body.ConferenceStatus,
        participantLabel: body.ParticipantLabel,
        callSid: body.CallSid
      });

      // ===== P0 FIX: IDEMPOTENCY CHECK =====
      // Prevent duplicate processing of conference events (same fix as twilioCallWebhook)
      const db = admin.firestore();
      const webhookKey = `conf_${body.ConferenceSid}_${body.StatusCallbackEvent}_${body.CallSid || 'no_call'}`;
      const webhookEventRef = db.collection("processed_webhook_events").doc(webhookKey);

      let isDuplicate = false;
      try {
        await db.runTransaction(async (transaction) => {
          const existingEvent = await transaction.get(webhookEventRef);

          if (existingEvent.exists) {
            isDuplicate = true;
            return;
          }

          // P0 FIX: Don't include undefined values - Firestore rejects them
          // conference-end events don't have a CallSid
          transaction.set(webhookEventRef, {
            eventKey: webhookKey,
            conferenceSid: body.ConferenceSid,
            statusCallbackEvent: body.StatusCallbackEvent,
            ...(body.CallSid && { callSid: body.CallSid }), // Only include if defined
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
            source: "twilio_conference_webhook",
            expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000),
          });
        });
      } catch (txError) {
        // P1-3 FIX: Don't treat transaction errors as duplicates!
        // Transaction errors (contention, timeout, network) are NOT the same as legitimate duplicates.
        // Return 500 so Twilio retries the webhook instead of losing the event.
        logger.error(`🎤 [${confWebhookId}] ❌ Transaction error for webhook idempotency: ${txError}`);
        logger.error(`🎤 [${confWebhookId}] ⚠️ Returning 500 to trigger Twilio retry (was incorrectly returning 200 before)`);
        res.status(500).send('Transaction error - please retry');
        return;
      }

      if (isDuplicate) {
        logger.info(`🎤 [${confWebhookId}] ⚠️ IDEMPOTENCY: Conference event ${webhookKey} already processed, skipping`);
        res.status(200).send('OK - duplicate');
        return;
      }

      // P0 CRITICAL FIX: Find session by ConferenceSid OR by FriendlyName (conference.name)
      //
      // PROBLEM: conference.sid is only set AFTER handleConferenceStart runs
      // But handleConferenceStart can't run because findSessionByConferenceSid fails!
      // This is a chicken-and-egg problem.
      //
      // SOLUTION:
      // 1. First try to find by conference.sid (works for events AFTER conference-start)
      // 2. If not found, try to find by conference.name (FriendlyName from Twilio)
      //    This works because conference.name IS set when the session is created
      //
      let session = await twilioCallManager.findSessionByConferenceSid(body.ConferenceSid);

      if (!session) {
        logger.info(`🎤 [${confWebhookId}] Session not found by ConferenceSid, trying FriendlyName...`);
        logger.info(`🎤 [${confWebhookId}]   FriendlyName: ${body.FriendlyName}`);

        // FriendlyName is the conference name we set when creating the call
        session = await twilioCallManager.findSessionByConferenceName(body.FriendlyName);
      }

      if (!session) {
        logger.warn(`🎤 [${confWebhookId}] ❌ Session non trouvée pour conférence:`);
        logger.warn(`🎤 [${confWebhookId}]   ConferenceSid: ${body.ConferenceSid}`);
        logger.warn(`🎤 [${confWebhookId}]   FriendlyName: ${body.FriendlyName}`);
        res.status(200).send('Session not found');
        return;
      }

      // P0 FIX v3: Only set conference.sid for events that indicate a NEW conference starting
      // CRITICAL BUG FIX: Previously we set SID for ALL events including conference-end!
      // This caused old conference-end webhooks to SET the OLD SID on the session,
      // making the stale webhook check pass (session.sid === webhook.sid) and triggering refunds!
      //
      // NEW RULE: Only set SID for conference-start and participant-join events
      // For conference-end: if session doesn't have SID, it's a stale webhook - don't update!
      const eventsAllowedToSetSid = ['conference-start', 'participant-join'];
      if (!session.conference?.sid && body.ConferenceSid && eventsAllowedToSetSid.includes(body.StatusCallbackEvent)) {
        logger.info(`🎤 [${confWebhookId}] 🔧 Setting conference.sid for the first time: ${body.ConferenceSid}`);
        logger.info(`🎤 [${confWebhookId}]   Event type: ${body.StatusCallbackEvent} (allowed to set SID)`);
        try {
          await twilioCallManager.updateConferenceSid(session.id, body.ConferenceSid);
          logger.info(`🎤 [${confWebhookId}]   ✅ conference.sid updated in Firestore`);
        } catch (updateError) {
          logger.error(`🎤 [${confWebhookId}]   ⚠️ Failed to update conference.sid:`, updateError);
          // Continue processing - non-fatal error
        }
      } else if (!session.conference?.sid && body.ConferenceSid) {
        logger.info(`🎤 [${confWebhookId}] ⚠️ NOT setting conference.sid - event type "${body.StatusCallbackEvent}" not allowed to set SID`);
        logger.info(`🎤 [${confWebhookId}]   This might be a stale webhook from an old conference`);
      }

      const sessionId = session.id;
      logger.info(`🎤 [${confWebhookId}] Session found: ${sessionId}`);

      // P0 DEBUG: Log current session state for all webhooks
      logger.info(`🎤 [${confWebhookId}] 📊 CURRENT SESSION STATE:`);
      logger.info(`🎤 [${confWebhookId}]   session.status: ${session.status}`);
      logger.info(`🎤 [${confWebhookId}]   session.conference.sid: ${session.conference?.sid || 'NOT SET'}`);
      logger.info(`🎤 [${confWebhookId}]   session.conference.name: ${session.conference?.name || 'NOT SET'}`);
      logger.info(`🎤 [${confWebhookId}]   payment.status: ${session.payment?.status || 'NOT SET'}`);
      logger.info(`🎤 [${confWebhookId}]   client.status: ${session.participants?.client?.status || 'NOT SET'}`);
      logger.info(`🎤 [${confWebhookId}]   client.connectedAt: ${session.participants?.client?.connectedAt?.toDate?.() || 'NOT SET'}`);
      logger.info(`🎤 [${confWebhookId}]   provider.status: ${session.participants?.provider?.status || 'NOT SET'}`);
      logger.info(`🎤 [${confWebhookId}]   provider.connectedAt: ${session.participants?.provider?.connectedAt?.toDate?.() || 'NOT SET'}`);

      switch (body.StatusCallbackEvent) {
        case 'conference-start':
          await handleConferenceStart(sessionId, body);
          break;
          
        case 'conference-end':
          await handleConferenceEnd(sessionId, body);
          break;
          
        case 'participant-join':
          await handleParticipantJoin(sessionId, body);
          break;
          
        case 'participant-leave':
          await handleParticipantLeave(sessionId, body);
          break;
          
        case 'participant-mute':
        case 'participant-unmute':
          await handleParticipantMute(sessionId, body);
          break;
          
        case 'participant-hold':
        case 'participant-unhold':
          await handleParticipantHold(sessionId, body);
          break;
          
        default:
          logger.info(`Événement conférence non géré: ${body.StatusCallbackEvent}`);
      }

      res.status(200).send('OK');

    } catch (error) {
      logger.error('❌ Erreur webhook conférence:', error);
      await logError('twilioConferenceWebhook:error', error);
      captureError(error, { functionName: 'twilioConferenceWebhook' });
      res.status(500).send('Webhook error');
    }
  }
);

/**
 * Gère le début de la conférence
 */
async function handleConferenceStart(sessionId: string, body: TwilioConferenceWebhookBody) {
  const startId = `conf_start_${Date.now().toString(36)}`;

  try {
    logger.info(`\n${'═'.repeat(70)}`);
    logger.info(`🎤 [${startId}] handleConferenceStart START`);
    logger.info(`🎤 [${startId}]   sessionId: ${sessionId}`);
    logger.info(`🎤 [${startId}]   conferenceSid: ${body.ConferenceSid}`);
    logger.info(`🎤 [${startId}]   friendlyName: ${body.FriendlyName}`);
    logger.info(`🎤 [${startId}]   timestamp: ${body.Timestamp}`);
    logger.info(`${'═'.repeat(70)}`);

    logger.info(`🎤 [${startId}] STEP 1: Updating conference info (sid + startedAt)...`);
    await twilioCallManager.updateConferenceInfo(sessionId, {
      sid: body.ConferenceSid,
      startedAt: admin.firestore.Timestamp.fromDate(new Date())
    });
    logger.info(`🎤 [${startId}]   ✅ Conference info updated`);

    logger.info(`🎤 [${startId}] STEP 2: Setting call session status to "active"...`);
    await twilioCallManager.updateCallSessionStatus(sessionId, 'active');
    logger.info(`🎤 [${startId}]   ✅ Session status set to "active"`);

    logger.info(`🎤 [${startId}] STEP 3: Verifying session state after update...`);
    const session = await twilioCallManager.getCallSession(sessionId);
    if (session) {
      logger.info(`🎤 [${startId}]   session.status: ${session.status}`);
      logger.info(`🎤 [${startId}]   conference.sid: ${session.conference.sid}`);
      logger.info(`🎤 [${startId}]   client.status: ${session.participants.client.status}`);
      logger.info(`🎤 [${startId}]   provider.status: ${session.participants.provider.status}`);
    } else {
      logger.info(`🎤 [${startId}]   ⚠️ Session not found after update!`);
    }

    await logCallRecord({
      callId: sessionId,
      status: 'conference_started',
      retryCount: 0,
      additionalData: {
        conferenceSid: body.ConferenceSid,
        timestamp: body.Timestamp
      }
    });

    logger.info(`🎤 [${startId}] END - Conference started successfully`);
    logger.info(`${'═'.repeat(70)}\n`);

  } catch (error) {
    logger.error(`🎤 [${startId}] ❌ ERROR in handleConferenceStart:`, error);
    await logError('handleConferenceStart', error);
  }
}

/**
 * Gère la fin de la conférence
 * IMPORTANT: handleCallCompletion gère automatiquement :
 *   - Si durée >= 60s → capture paiement + schedule transfer
 *   - Si durée < 60s  → processRefund (cancel si non-capturé, refund si capturé)
 */
async function handleConferenceEnd(sessionId: string, body: TwilioConferenceWebhookBody) {
  const endId = `conf_end_${Date.now().toString(36)}`;
  const webhookConferenceSid = body.ConferenceSid;

  try {
    const twilioDuration = parseInt(body.Duration || '0');
    const conferenceEndTime = new Date();

    logger.info(`\n${'█'.repeat(70)}`);
    logger.info(`🏁 [${endId}] handleConferenceEnd START`);
    logger.info(`🏁 [${endId}]   sessionId: ${sessionId}`);
    logger.info(`🏁 [${endId}]   conferenceSid: ${webhookConferenceSid}`);
    logger.info(`🏁 [${endId}]   twilioDuration (total conference): ${twilioDuration}s`);
    logger.info(`${'█'.repeat(70)}`);

    // P0 CRITICAL FIX 2026-01-17 v2: Check if this webhook is from the CURRENT conference
    // When a participant is transferred to a new conference, the old conference ends
    // and sends a conference-end event. We must ignore it if the session has moved to a new conference.
    //
    // BUG FIX: If the webhook has a ConferenceSID but the session doesn't have one yet,
    // it means the conference-end webhook arrived BEFORE the conference-start webhook.
    // This happens when an OLD conference ends while a NEW conference is starting.
    // We must IGNORE these webhooks to prevent premature payment cancellation.
    logger.info(`🏁 [${endId}] STEP 0: Checking if webhook is from CURRENT conference...`);
    const sessionForConferenceCheck = await twilioCallManager.getCallSession(sessionId);
    const currentConferenceSid = sessionForConferenceCheck?.conference?.sid;

    if (webhookConferenceSid) {
      if (!currentConferenceSid) {
        // Webhook has a SID but session doesn't have one yet
        // This means conference-start hasn't been processed yet
        // This webhook is from an OLD conference - IGNORE IT
        logger.info(`🏁 [${endId}] ⚠️ STALE CONFERENCE WEBHOOK - IGNORING (session has no SID yet)`);
        logger.info(`🏁 [${endId}]   webhookConferenceSid: ${webhookConferenceSid}`);
        logger.info(`🏁 [${endId}]   currentConferenceSid: NOT SET YET`);
        logger.info(`🏁 [${endId}]   This webhook arrived BEFORE conference-start - it's from an OLD conference`);
        logger.info(`🏁 [${endId}]   ⛔ NOT processing this webhook to prevent premature payment cancellation`);
        logger.info(`${'█'.repeat(70)}\n`);
        return;
      }

      if (currentConferenceSid !== webhookConferenceSid) {
        logger.info(`🏁 [${endId}] ⚠️ STALE CONFERENCE WEBHOOK - IGNORING (SID mismatch)`);
        logger.info(`🏁 [${endId}]   webhookConferenceSid: ${webhookConferenceSid}`);
        logger.info(`🏁 [${endId}]   currentConferenceSid: ${currentConferenceSid}`);
        logger.info(`🏁 [${endId}]   This is an OLD conference ending - the call has moved to a new conference`);
        logger.info(`🏁 [${endId}]   ⛔ NOT processing this webhook to prevent premature payment cancellation`);
        logger.info(`${'█'.repeat(70)}\n`);
        return;
      }

      logger.info(`🏁 [${endId}]   ✅ ConferenceSID matches current session - processing webhook`);
      logger.info(`🏁 [${endId}]   ✅ P0 FIX v3 CHECK PASSED - This is the CURRENT conference, proceeding...`);
    } else {
      logger.info(`🏁 [${endId}]   ⚠️ Webhook has no ConferenceSID - proceeding with caution`);
    }

    // P0 DEBUG: Log provider.connectedAt status - this determines billing duration
    const sessionForBillingCheck = await twilioCallManager.getCallSession(sessionId);
    const providerConnectedForBilling = sessionForBillingCheck?.participants?.provider?.connectedAt;
    logger.info(`🏁 [${endId}] 📊 BILLING CHECK: provider.connectedAt = ${providerConnectedForBilling?.toDate?.() || 'NOT SET (billingDuration will be 0!)'}`);

    // P0 CRITICAL FIX 2026-01-17 v4: Don't process payment if session is still connecting!
    // If provider never connected (connectedAt is null) AND session is still in connecting phase,
    // this conference-end is likely from a temporary conference that ended due to connection issues.
    // We should NOT trigger a refund - let the retry loop handle it!
    const sessionStatus = sessionForBillingCheck?.status;
    const isStillConnecting = ['scheduled', 'calling', 'client_connecting', 'provider_connecting', 'both_connecting'].includes(sessionStatus || '');

    if (!providerConnectedForBilling) {
      logger.info(`🏁 [${endId}] ⚠️ Provider never connected!`);
      logger.info(`🏁 [${endId}]   session.status: ${sessionStatus}`);
      logger.info(`🏁 [${endId}]   isStillConnecting: ${isStillConnecting}`);

      if (isStillConnecting) {
        logger.info(`🏁 [${endId}] ⛔ P0 FIX v4: NOT processing this conference-end!`);
        logger.info(`🏁 [${endId}]   Reason: Session is still in connecting phase (${sessionStatus})`);
        logger.info(`🏁 [${endId}]   The retry loop will handle the provider connection`);
        logger.info(`🏁 [${endId}]   Only updating conference.endedAt for tracking, NOT triggering payment processing`);

        // Just update the conference ended timestamp for tracking, but don't process payment
        await twilioCallManager.updateConferenceInfo(sessionId, {
          endedAt: admin.firestore.Timestamp.fromDate(new Date()),
          duration: parseInt(body.Duration || '0'),
        });

        logger.info(`${'█'.repeat(70)}\n`);
        return; // EXIT - don't process payment, let retry loop continue
      }

      logger.info(`🏁 [${endId}] ⚠️ WARNING: Session is NOT in connecting phase, will process refund`);
    }

    logger.info(`🏁 [${endId}] STEP 1: Fetching session state BEFORE update...`);
    const sessionBefore = await twilioCallManager.getCallSession(sessionId);
    if (sessionBefore) {
      logger.info(`🏁 [${endId}]   session.status: ${sessionBefore.status}`);
      logger.info(`🏁 [${endId}]   payment.status: ${sessionBefore.payment?.status}`);
      logger.info(`🏁 [${endId}]   payment.intentId: ${sessionBefore.payment?.intentId?.slice(0, 20) || 'N/A'}...`);
      logger.info(`🏁 [${endId}]   client.status: ${sessionBefore.participants.client.status}`);
      logger.info(`🏁 [${endId}]   provider.status: ${sessionBefore.participants.provider.status}`);
      logger.info(`🏁 [${endId}]   provider.connectedAt: ${sessionBefore.participants.provider.connectedAt?.toDate?.() || 'N/A'}`);

      // Cancel forceEndCall safety net task (call ended normally)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const forceEndCallTaskId = (sessionBefore.metadata as any)?.forceEndCallTaskId;
      if (forceEndCallTaskId && !forceEndCallTaskId.startsWith('skipped_')) {
        try {
          const { cancelForceEndCallTask } = await import('../lib/tasks');
          await cancelForceEndCallTask(forceEndCallTaskId);
          logger.info(`🏁 [${endId}]   ✅ ForceEndCall task cancelled: ${forceEndCallTaskId}`);
        } catch (cancelError) {
          logger.warn(`🏁 [${endId}]   ⚠️ Failed to cancel forceEndCall task:`, cancelError);
          // P2-1: Log non-critical errors for monitoring
          await logError('TwilioConferenceWebhook:cancelForceEndCallTask', { sessionId, forceEndCallTaskId, error: cancelError });
          // Non-critical, continue
        }
      }
    }

    // P0 FIX 2026-01-18: Calculate BILLING duration as time when BOTH participants are connected
    // This is fairer to the client - they shouldn't pay for time when they were alone in conference
    //
    // BUG FIXED: Previously, billingDuration was calculated as:
    //   conferenceEndTime - providerConnectedAt
    // This was WRONG because if the provider hangs up early, the client remains alone
    // in the conference, and all that time was incorrectly billed.
    //
    // CORRECT CALCULATION:
    //   billingDuration = min(clientDisconnectedAt, providerDisconnectedAt) - max(clientConnectedAt, providerConnectedAt)
    //   This measures ONLY the time when BOTH participants were connected simultaneously.
    //
    let billingDuration = 0;
    const clientConnectedAt = sessionBefore?.participants.client.connectedAt;
    const providerConnectedAt = sessionBefore?.participants.provider.connectedAt;
    const clientDisconnectedAt = sessionBefore?.participants.client.disconnectedAt;
    const providerDisconnectedAt = sessionBefore?.participants.provider.disconnectedAt;

    if (providerConnectedAt && clientConnectedAt) {
      // BOTH participants were connected at some point - calculate overlap duration
      const clientConnectedTime = clientConnectedAt.toDate().getTime();
      const providerConnectedTime = providerConnectedAt.toDate().getTime();

      // bothConnectedAt = when the SECOND participant joined (the later of the two)
      const bothConnectedAt = Math.max(clientConnectedTime, providerConnectedTime);

      // firstDisconnectedAt = when the FIRST participant left (the earlier of the two)
      // If disconnectedAt is not set, use conferenceEndTime as fallback
      const clientDisconnectTime = clientDisconnectedAt?.toDate?.()?.getTime() || conferenceEndTime.getTime();
      const providerDisconnectTime = providerDisconnectedAt?.toDate?.()?.getTime() || conferenceEndTime.getTime();
      const firstDisconnectedAt = Math.min(clientDisconnectTime, providerDisconnectTime);

      // billingDuration = time when BOTH were connected simultaneously
      // P0 FIX: Use Math.round instead of Math.floor to prevent edge case
      // where 119.9s rounds down to 119s and triggers refund instead of capture
      billingDuration = Math.max(0, Math.round((firstDisconnectedAt - bothConnectedAt) / 1000));

      logger.info(`🏁 [${endId}]   📊 BILLING DURATION CALCULATION (P0 FIX 2026-01-18):`);
      logger.info(`🏁 [${endId}]     clientConnectedAt: ${new Date(clientConnectedTime).toISOString()}`);
      logger.info(`🏁 [${endId}]     providerConnectedAt: ${new Date(providerConnectedTime).toISOString()}`);
      logger.info(`🏁 [${endId}]     bothConnectedAt (2nd joined): ${new Date(bothConnectedAt).toISOString()}`);
      logger.info(`🏁 [${endId}]     clientDisconnectedAt: ${clientDisconnectedAt ? new Date(clientDisconnectTime).toISOString() : 'still connected'}`);
      logger.info(`🏁 [${endId}]     providerDisconnectedAt: ${providerDisconnectedAt ? new Date(providerDisconnectTime).toISOString() : 'still connected'}`);
      logger.info(`🏁 [${endId}]     firstDisconnectedAt (1st left): ${new Date(firstDisconnectedAt).toISOString()}`);
      logger.info(`🏁 [${endId}]     billingDuration (BOTH connected): ${billingDuration}s (${(billingDuration / 60).toFixed(1)} min)`);

      // Log who disconnected first (for debugging)
      const whoLeftFirst = clientDisconnectTime <= providerDisconnectTime ? 'CLIENT' : 'PROVIDER';
      logger.info(`🏁 [${endId}]     whoLeftFirst: ${whoLeftFirst}`);
    } else if (providerConnectedAt) {
      // Provider connected but client never connected - no billing
      logger.info(`🏁 [${endId}]   ⚠️ Client never connected - billingDuration = 0`);
      billingDuration = 0;
    } else {
      // Provider never connected - no billing
      logger.info(`🏁 [${endId}]   ⚠️ Provider never connected - billingDuration = 0`);
      billingDuration = 0;
    }

    // P0 FIX 2026-02-01: Minimum duration reduced from 120s (2 min) to 60s (1 min)
    const MIN_DURATION_FOR_CAPTURE = 60;

    // P0 FIX 2026-02-02: CRITICAL FIX for PayPal capture not triggering!
    // If billingDuration = 0 but twilioDuration >= MIN_DURATION, use twilioDuration as fallback.
    // This happens when connectedAt is not set for one or both participants due to:
    // - handleParticipantJoin skipping update (status was amd_pending/calling/ringing)
    // - Race condition between DTMF confirmation and participant-join webhooks
    //
    // SAFETY: We ONLY use twilioDuration as fallback when:
    // 1. billingDuration = 0 (something went wrong with timestamp tracking)
    // 2. twilioDuration >= MIN_DURATION (conference actually lasted long enough)
    // 3. Both participants were at some point in a "connected-like" state
    //
    // This prevents false captures while ensuring real calls are captured.
    let effectiveBillingDuration = billingDuration;

    if (billingDuration === 0 && twilioDuration >= MIN_DURATION_FOR_CAPTURE) {
      logger.info(`🏁 [${endId}] ⚠️ P0 FIX 2026-02-02: billingDuration=0 but twilioDuration=${twilioDuration}s`);
      logger.info(`🏁 [${endId}]   This indicates connectedAt timestamps were not properly set`);

      // Check if both participants reached "connected" status at some point
      const clientStatus = sessionBefore?.participants?.client?.status;
      const providerStatus = sessionBefore?.participants?.provider?.status;
      const clientEverConnected = clientStatus === 'connected' || clientStatus === 'disconnected';
      const providerEverConnected = providerStatus === 'connected' || providerStatus === 'disconnected';

      logger.info(`🏁 [${endId}]   clientStatus: ${clientStatus}, everConnected: ${clientEverConnected}`);
      logger.info(`🏁 [${endId}]   providerStatus: ${providerStatus}, everConnected: ${providerEverConnected}`);

      if (clientEverConnected && providerEverConnected) {
        // Both participants connected at some point - use Twilio duration as fallback
        effectiveBillingDuration = twilioDuration;
        logger.info(`🏁 [${endId}]   ✅ FALLBACK: Using twilioDuration=${twilioDuration}s as effectiveBillingDuration`);
        logger.info(`🏁 [${endId}]   Reason: Both participants were connected but connectedAt timestamps missing`);

        // P0 ALERT: Log billing fallback for admin investigation
        try {
          await admin.firestore().collection("billing_fallback_alerts").add({
            sessionId,
            conferenceSid: body.ConferenceSid,
            billingDuration: 0,
            twilioDuration,
            effectiveBillingDuration: twilioDuration,
            clientStatus,
            providerStatus,
            reason: "connectedAt timestamps missing - used twilioDuration fallback",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            reviewed: false,
          });
        } catch (alertErr) {
          logger.error(`🏁 [${endId}] Failed to create billing fallback alert:`, alertErr);
        }
      } else {
        logger.info(`🏁 [${endId}]   ❌ NOT using fallback: Not all participants were connected`);
        logger.info(`🏁 [${endId}]   Keeping billingDuration=0 to trigger refund`);
      }
    }

    logger.info(`🏁 [${endId}]   twilioDuration (total): ${twilioDuration}s (${(twilioDuration / 60).toFixed(1)} min)`);
    logger.info(`🏁 [${endId}]   billingDuration (both connected): ${billingDuration}s (${(billingDuration / 60).toFixed(1)} min)`);
    logger.info(`🏁 [${endId}]   effectiveBillingDuration: ${effectiveBillingDuration}s (${(effectiveBillingDuration / 60).toFixed(1)} min)`);
    logger.info(`🏁 [${endId}]   minDurationForCapture: ${MIN_DURATION_FOR_CAPTURE}s (1 min)`);
    logger.info(`🏁 [${endId}]   willCapture: ${effectiveBillingDuration >= MIN_DURATION_FOR_CAPTURE ? 'YES' : 'NO - will refund/cancel'}`);

    logger.info(`🏁 [${endId}] STEP 2: Updating conference info (endedAt + duration)...`);
    await twilioCallManager.updateConferenceInfo(sessionId, {
      endedAt: admin.firestore.Timestamp.fromDate(conferenceEndTime),
      duration: twilioDuration,
      billingDuration: billingDuration, // Store original for transparency
      effectiveBillingDuration: effectiveBillingDuration // P0 FIX 2026-02-02: Store effective duration used for capture decision
    });
    logger.info(`🏁 [${endId}]   ✅ Conference info updated`);

    // Log si appel trop court (pour monitoring) - use EFFECTIVE BILLING duration
    if (effectiveBillingDuration < MIN_DURATION_FOR_CAPTURE) {
      logger.info(`🏁 [${endId}] ⚠️ EFFECTIVE BILLING DURATION TOO SHORT: ${effectiveBillingDuration}s < ${MIN_DURATION_FOR_CAPTURE}s minimum`);
      logger.info(`🏁 [${endId}]   Action: Will trigger refund/cancel via handleCallCompletion`);
      await logCallRecord({
        callId: sessionId,
        status: 'call_too_short',
        retryCount: 0,
        additionalData: {
          twilioDuration,
          billingDuration,
          effectiveBillingDuration,
          reason: `Effective billing duration less than ${MIN_DURATION_FOR_CAPTURE}s - will trigger refund/cancel`
        }
      });
    } else {
      logger.info(`🏁 [${endId}] ✅ EFFECTIVE BILLING DURATION OK: ${effectiveBillingDuration}s >= ${MIN_DURATION_FOR_CAPTURE}s minimum`);
      logger.info(`🏁 [${endId}]   Action: Will capture payment via handleCallCompletion`);
    }

    // handleCallCompletion gère TOUS les cas:
    // - Si durée >= 60s → capture paiement + schedule transfer prestataire
    // - Si durée < 60s  → processRefund (cancel ou refund selon état paiement)
    // P0 FIX 2026-02-02: Pass EFFECTIVE BILLING duration (with fallback to Twilio duration)
    logger.info(`🏁 [${endId}] STEP 3: Calling handleCallCompletion(sessionId, ${effectiveBillingDuration})...`);
    await twilioCallManager.handleCallCompletion(sessionId, effectiveBillingDuration);
    logger.info(`🏁 [${endId}]   ✅ handleCallCompletion completed`);

    logger.info(`🏁 [${endId}] STEP 4: Fetching session state AFTER completion...`);
    const sessionAfter = await twilioCallManager.getCallSession(sessionId);
    if (sessionAfter) {
      logger.info(`🏁 [${endId}]   session.status: ${sessionAfter.status}`);
      logger.info(`🏁 [${endId}]   payment.status: ${sessionAfter.payment?.status}`);
    }

    await logCallRecord({
      callId: sessionId,
      status: 'conference_ended',
      retryCount: 0,
      additionalData: {
        twilioDuration,
        billingDuration,
        effectiveBillingDuration,
        conferenceSid: body.ConferenceSid
      }
    });

    // === LOGS DÉTAILLÉS POUR DEBUG CONFERENCE-END ===
    logger.info(`\n${'🎤'.repeat(30)}`);
    logger.info(`🎤 [${endId}] === CONFERENCE END SUMMARY ===`);
    logger.info(`🎤 [${endId}]   sessionId: ${sessionId}`);
    logger.info(`🎤 [${endId}]   conferenceSid: ${body.ConferenceSid}`);
    logger.info(`🎤 [${endId}]   twilioDuration (total): ${twilioDuration}s`);
    logger.info(`🎤 [${endId}]   billingDuration (both connected): ${billingDuration}s`);
    logger.info(`🎤 [${endId}]   effectiveBillingDuration (used for capture): ${effectiveBillingDuration}s`);
    logger.info(`🎤 [${endId}]   capture threshold: ${MIN_DURATION_FOR_CAPTURE}s (1 min)`);
    logger.info(`🎤 [${endId}]   decision: ${effectiveBillingDuration >= MIN_DURATION_FOR_CAPTURE ? 'CAPTURE PAYMENT' : 'REFUND/CANCEL'}`);

    // Fetch and log final state
    const finalSessionState = await twilioCallManager.getCallSession(sessionId);
    if (finalSessionState) {
      logger.info(`🎤 [${endId}]   FINAL SESSION STATE:`);
      logger.info(`🎤 [${endId}]     session.status: ${finalSessionState.status}`);
      logger.info(`🎤 [${endId}]     payment.status: ${finalSessionState.payment?.status}`);
      logger.info(`🎤 [${endId}]     client.status: ${finalSessionState.participants.client.status}`);
      logger.info(`🎤 [${endId}]     provider.status: ${finalSessionState.participants.provider.status}`);
      logger.info(`🎤 [${endId}]     invoicesCreated: ${finalSessionState.metadata?.invoicesCreated || false}`);
    }
    logger.info(`${'🎤'.repeat(30)}\n`);

    logger.info(`🏁 [${endId}] END - Conference end handled successfully`);
    logger.info(`${'█'.repeat(70)}\n`);

  } catch (error) {
    logger.error(`🏁 [${endId}] ❌ ERROR in handleConferenceEnd:`, error);
    await logError('handleConferenceEnd', error);
  }
}

/**
 * Gère l'arrivée d'un participant
 * P0 CRITICAL: Cette fonction met le statut à "connected" - waitForConnection() attend ce statut
 */
async function handleParticipantJoin(sessionId: string, body: TwilioConferenceWebhookBody) {
  const joinId = `join_${Date.now().toString(36)}`;

  try {
    const callSid = body.CallSid!;

    // P0 FIX: Determine participantType from ParticipantLabel OR fallback to CallSid lookup
    // ParticipantLabel may be undefined if TwiML didn't include participantLabel attribute
    let participantType = body.ParticipantLabel as 'provider' | 'client' | undefined;

    if (!participantType) {
      // Fallback: identify participant by matching CallSid in session
      logger.info(`👋 [${joinId}] ⚠️ ParticipantLabel is missing, using CallSid fallback`);
      const session = await twilioCallManager.getCallSession(sessionId);
      if (session) {
        if (session.participants.client.callSid === callSid) {
          participantType = 'client';
          logger.info(`👋 [${joinId}]   ✅ Identified as CLIENT via CallSid match`);
        } else if (session.participants.provider.callSid === callSid) {
          participantType = 'provider';
          logger.info(`👋 [${joinId}]   ✅ Identified as PROVIDER via CallSid match`);
        } else {
          logger.info(`👋 [${joinId}]   ❌ CallSid does not match any participant!`);
          logger.info(`👋 [${joinId}]   webhook callSid: ${callSid}`);
          logger.info(`👋 [${joinId}]   client.callSid: ${session.participants.client.callSid}`);
          logger.info(`👋 [${joinId}]   provider.callSid: ${session.participants.provider.callSid}`);
          // Cannot identify participant - log error and return
          await logError('handleParticipantJoin:unknown_participant', {
            sessionId,
            callSid,
            clientCallSid: session.participants.client.callSid,
            providerCallSid: session.participants.provider.callSid
          });
          return;
        }
      } else {
        logger.info(`👋 [${joinId}]   ❌ Session not found - cannot identify participant`);
        return;
      }
    }

    logger.info(`\n${'═'.repeat(70)}`);
    logger.info(`👋 [${joinId}] handleParticipantJoin START - CRITICAL FOR waitForConnection()`);
    logger.info(`👋 [${joinId}]   sessionId: ${sessionId}`);
    logger.info(`👋 [${joinId}]   participantType: ${participantType}`);
    logger.info(`👋 [${joinId}]   callSid: ${callSid}`);
    logger.info(`👋 [${joinId}]   conferenceSid: ${body.ConferenceSid}`);
    logger.info(`👋 [${joinId}]   source: ${body.ParticipantLabel ? 'ParticipantLabel' : 'CallSid fallback'}`);
    logger.info(`${'═'.repeat(70)}`);

    // Get status BEFORE update
    logger.info(`👋 [${joinId}] STEP 1: Fetching participant status BEFORE update...`);
    const sessionBefore = await twilioCallManager.getCallSession(sessionId);
    const participantBefore = participantType === 'provider'
      ? sessionBefore?.participants.provider
      : sessionBefore?.participants.client;
    const currentStatus = participantBefore?.status;
    logger.info(`👋 [${joinId}]   ${participantType}.status BEFORE: "${currentStatus}"`);
    logger.info(`👋 [${joinId}]   ${participantType}.callSid BEFORE: ${participantBefore?.callSid}`);

    // P0 CRITICAL FIX v2 (2026-01-18): Race condition between webhooks!
    //
    // BUG: participant-join can arrive BEFORE the "answered" webhook that sets amd_pending
    // When this happens, currentStatus is still "calling" or "ringing", and we incorrectly
    // set status to "connected", causing waitForConnection() to return true prematurely.
    //
    // IMPORTANT: Voicemails CAN join conferences! When a voicemail answers:
    // 1. The call connects to the conference TwiML
    // 2. Voicemail "joins" the conference (just listening/recording hold music)
    // 3. If we set status to "connected" here, waitForConnection() would return true
    // 4. Provider would be called even though it's a voicemail!
    //
    // Correct behavior:
    // - Keep status unchanged when participant joins with AMD pending OR pre-AMD states
    // - Let the asyncAmdStatusCallback (in twilioAmdTwiml) determine human vs machine
    // - If human: asyncAmdStatusCallback sets status to "connected"
    // - If machine: asyncAmdStatusCallback sets status to "no_answer" and hangs up
    //
    // AMD typically completes within 30 seconds, and waitForConnection has 90s timeout.
    //
    // Statuses that should wait for AMD callback:
    // - "amd_pending": AMD is already in progress
    // - "calling": participant-join arrived before "answered" webhook (race condition)
    // - "ringing": participant-join arrived before "answered" webhook (race condition)
    // - "connected": ALREADY connected via DTMF (twilioGatherResponse) - DO NOT OVERWRITE connectedAt!
    //
    // P0 FIX v3 2026-01-18: BUG FIXED - connectedAt was being OVERWRITTEN!
    // When twilioGatherResponse sets connectedAt=T1 and then handleParticipantJoin runs,
    // it was calling updateParticipantStatus again with connectedAt=T2 (LATER timestamp),
    // making billingDuration SHORTER than actual! Now we skip if already connected.
    const statusesThatShouldSkipUpdate = ['amd_pending', 'calling', 'ringing', 'connected'];

    if (statusesThatShouldSkipUpdate.includes(currentStatus || '')) {
      // P0 FIX v3: Handle 'connected' status differently - already confirmed via DTMF!
      if (currentStatus === 'connected') {
        logger.info(`👋 [${joinId}] ✅ Status is already "connected" (set by twilioGatherResponse via DTMF)`);
        logger.info(`👋 [${joinId}]   ⛔ NOT calling updateParticipantStatus to preserve original connectedAt!`);
        logger.info(`👋 [${joinId}]   P0 FIX v3: This prevents billingDuration from being incorrectly shortened`);

        await logCallRecord({
          callId: sessionId,
          status: `${participantType}_joined_already_connected`,
          retryCount: 0,
          additionalData: {
            callSid,
            conferenceSid: body.ConferenceSid,
            currentStatus,
            reason: 'already_connected_via_dtmf_preserving_connectedAt'
          }
        });

        logger.info(`👋 [${joinId}] END - Participant already connected, connectedAt preserved`);
        logger.info(`${'═'.repeat(70)}\n`);
        return;
      }

      // AMD pending states - wait for AMD callback
      logger.info(`👋 [${joinId}] ⚠️ Status "${currentStatus}" - participant joined but AMD not confirmed yet`);
      logger.info(`👋 [${joinId}]   ⛔ NOT setting status to "connected" yet - waiting for AMD result`);
      logger.info(`👋 [${joinId}]   asyncAmdStatusCallback will set: "connected" if human, "no_answer" if machine`);

      // P0 FIX v2: Log the race condition detection for debugging
      if (currentStatus === 'calling' || currentStatus === 'ringing') {
        logger.info(`👋 [${joinId}]   🔄 RACE CONDITION DETECTED: participant-join arrived before "answered" webhook`);
        logger.info(`👋 [${joinId}]   🔄 This is normal - "answered" webhook will set amd_pending soon`);
      }

      await logCallRecord({
        callId: sessionId,
        status: `${participantType}_joined_but_waiting_for_amd`,
        retryCount: 0,
        additionalData: {
          callSid,
          conferenceSid: body.ConferenceSid,
          currentStatus,
          reason: currentStatus === 'amd_pending'
            ? 'amd_pending_waiting_for_callback'
            : 'race_condition_waiting_for_answered_webhook'
        }
      });
      // IMPORTANT: Return early - do NOT set status to "connected"
      // Let asyncAmdStatusCallback handle it after AMD analysis completes
      logger.info(`👋 [${joinId}] END - Waiting for AMD callback to determine human/machine`);
      logger.info(`${'═'.repeat(70)}\n`);
      return;
    }

    // AMD is not pending - safe to set status to "connected"
    logger.info(`👋 [${joinId}] STEP 2: Setting ${participantType}.status to "connected"...`);
    logger.info(`👋 [${joinId}]   AMD is not pending, so this is safe`);
    logger.info(`👋 [${joinId}]   This is CRITICAL - waitForConnection() polls for this status!`);
    await twilioCallManager.updateParticipantStatus(
      sessionId,
      participantType,
      'connected',
      admin.firestore.Timestamp.fromDate(new Date())
    );
    logger.info(`👋 [${joinId}]   ✅ updateParticipantStatus() completed`);

    // Verify status was updated
    logger.info(`👋 [${joinId}] STEP 3: Verifying status was updated...`);
    const sessionAfter = await twilioCallManager.getCallSession(sessionId);
    const participantAfter = participantType === 'provider'
      ? sessionAfter?.participants.provider
      : sessionAfter?.participants.client;
    logger.info(`👋 [${joinId}]   ${participantType}.status AFTER: "${participantAfter?.status}"`);

    if (participantAfter?.status === 'connected') {
      logger.info(`👋 [${joinId}]   ✅ Status correctly set to "connected" - waitForConnection() will succeed!`);
    } else {
      logger.info(`👋 [${joinId}]   ❌ STATUS NOT "connected"! waitForConnection() may fail!`);
    }

    // Vérifier si les deux participants sont connectés
    logger.info(`👋 [${joinId}] STEP 4: Checking if BOTH participants are connected...`);
    logger.info(`👋 [${joinId}]   client.status: ${sessionAfter?.participants.client.status}`);
    logger.info(`👋 [${joinId}]   provider.status: ${sessionAfter?.participants.provider.status}`);

    if (sessionAfter &&
        sessionAfter.participants.provider.status === 'connected' &&
        sessionAfter.participants.client.status === 'connected') {

      logger.info(`👋 [${joinId}]   ✅ BOTH CONNECTED! Setting session status to "active"...`);
      await twilioCallManager.updateCallSessionStatus(sessionId, 'active');
      logger.info(`👋 [${joinId}]   ✅ Session status set to "active"`);

      // Schedule forceEndCall task as safety net (will terminate call if stuck)
      // Add 10 minutes buffer to the maxDuration for the safety timeout
      try {
        const { scheduleForceEndCallTask } = await import('../lib/tasks');
        const maxDuration = sessionAfter.metadata?.maxDuration || 1200; // 20 min default
        const safetyTimeout = maxDuration + 600; // Add 10 min safety buffer
        const taskId = await scheduleForceEndCallTask(sessionId, safetyTimeout);
        logger.info(`👋 [${joinId}]   ⏱️ ForceEndCall safety net scheduled: ${taskId} (${safetyTimeout}s)`);

        // Store the taskId in session metadata for potential cancellation
        await admin.firestore().collection('call_sessions').doc(sessionId).update({
          'metadata.forceEndCallTaskId': taskId,
          'metadata.forceEndCallScheduledAt': admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (taskError) {
        logger.warn(`👋 [${joinId}]   ⚠️ Failed to schedule forceEndCall task:`, taskError);
        // P2-1: Log non-critical errors for monitoring
        await logError('TwilioConferenceWebhook:scheduleForceEndCallTask', { sessionId, error: taskError });
        // Non-critical, continue
      }

      await logCallRecord({
        callId: sessionId,
        status: 'both_participants_connected',
        retryCount: 0
      });
    } else {
      logger.info(`👋 [${joinId}]   ⏳ Waiting for other participant to join...`);
    }

    await logCallRecord({
      callId: sessionId,
      status: `${participantType}_joined_conference`,
      retryCount: 0,
      additionalData: {
        callSid,
        conferenceSid: body.ConferenceSid
      }
    });

    logger.info(`👋 [${joinId}] END - Participant join handled successfully`);
    logger.info(`${'═'.repeat(70)}\n`);

  } catch (error) {
    logger.error(`👋 [${joinId}] ❌ ERROR in handleParticipantJoin:`, error);
    await logError('handleParticipantJoin', error);
  }
}

/**
 * Gère le départ d'un participant
 */
async function handleParticipantLeave(sessionId: string, body: TwilioConferenceWebhookBody) {
  const leaveId = `leave_${Date.now().toString(36)}`;

  try {
    const callSid = body.CallSid!;
    const webhookConferenceSid = body.ConferenceSid;

    // P0 CRITICAL FIX 2026-01-17 v2: Check if this webhook is from the CURRENT conference
    // When a participant is transferred to a new conference, the old conference sends
    // a participant-leave event. We must ignore it if the session has moved to a new conference.
    //
    // BUG FIX v2: If the webhook has a ConferenceSID but the session doesn't have one yet,
    // it means the participant-leave webhook arrived BEFORE the conference-start webhook.
    // This happens when an OLD conference ends while a NEW conference is starting.
    // We must IGNORE these webhooks to prevent incorrect state updates.
    const sessionForConferenceCheck = await twilioCallManager.getCallSession(sessionId);
    const currentConferenceSid = sessionForConferenceCheck?.conference?.sid;

    if (webhookConferenceSid) {
      if (!currentConferenceSid) {
        // Webhook has a SID but session doesn't have one yet
        // This means conference-start hasn't been processed yet
        // This webhook is from an OLD conference - IGNORE IT
        logger.info(`👋 [${leaveId}] ⚠️ STALE CONFERENCE WEBHOOK - IGNORING (session has no SID yet)`);
        logger.info(`👋 [${leaveId}]   webhookConferenceSid: ${webhookConferenceSid}`);
        logger.info(`👋 [${leaveId}]   currentConferenceSid: NOT SET YET`);
        logger.info(`👋 [${leaveId}]   This webhook arrived BEFORE conference-start - it's from an OLD conference`);
        logger.info(`👋 [${leaveId}]   ⛔ NOT processing this webhook to prevent incorrect state updates`);
        return;
      }

      if (currentConferenceSid !== webhookConferenceSid) {
        logger.info(`👋 [${leaveId}] ⚠️ STALE CONFERENCE WEBHOOK - IGNORING (SID mismatch)`);
        logger.info(`👋 [${leaveId}]   webhookConferenceSid: ${webhookConferenceSid}`);
        logger.info(`👋 [${leaveId}]   currentConferenceSid: ${currentConferenceSid}`);
        logger.info(`👋 [${leaveId}]   Participant likely transferred to new conference - skipping leave handling`);
        return;
      }

      logger.info(`👋 [${leaveId}]   ✅ ConferenceSID matches current session - processing webhook`);
    }

    // P0 FIX: Determine participantType from ParticipantLabel OR fallback to CallSid lookup
    let participantType = body.ParticipantLabel as 'provider' | 'client' | undefined;

    if (!participantType) {
      // Fallback: identify participant by matching CallSid in session
      logger.info(`👋 [${leaveId}] ⚠️ ParticipantLabel is missing, using CallSid fallback`);
      const session = await twilioCallManager.getCallSession(sessionId);
      if (session) {
        if (session.participants.client.callSid === callSid) {
          participantType = 'client';
        } else if (session.participants.provider.callSid === callSid) {
          participantType = 'provider';
        } else {
          logger.info(`👋 [${leaveId}]   ❌ CallSid does not match any participant, skipping leave handling`);
          return;
        }
        logger.info(`👋 [${leaveId}]   ✅ Identified as ${participantType.toUpperCase()} via CallSid match`);
      } else {
        logger.info(`👋 [${leaveId}]   ❌ Session not found - cannot identify participant`);
        return;
      }
    }

    logger.info(`\n${'─'.repeat(70)}`);
    logger.info(`👋 [${leaveId}] handleParticipantLeave START`);
    logger.info(`👋 [${leaveId}]   sessionId: ${sessionId}`);
    logger.info(`👋 [${leaveId}]   participantType: ${participantType}`);
    logger.info(`👋 [${leaveId}]   callSid: ${callSid}`);
    logger.info(`👋 [${leaveId}]   conferenceSid: ${webhookConferenceSid}`);
    logger.info(`👋 [${leaveId}]   source: ${body.ParticipantLabel ? 'ParticipantLabel' : 'CallSid fallback'}`);
    logger.info(`${'─'.repeat(70)}`);

    // Get status BEFORE update
    logger.info(`👋 [${leaveId}] STEP 1: Fetching session state BEFORE update...`);
    const sessionBefore = await twilioCallManager.getCallSession(sessionId);
    if (sessionBefore) {
      logger.info(`👋 [${leaveId}]   session.status: ${sessionBefore.status}`);
      logger.info(`👋 [${leaveId}]   client.status: ${sessionBefore.participants.client.status}`);
      logger.info(`👋 [${leaveId}]   provider.status: ${sessionBefore.participants.provider.status}`);
      logger.info(`👋 [${leaveId}]   conference.duration: ${sessionBefore.conference.duration}s`);
    }

    // Mettre à jour le statut du participant
    logger.info(`👋 [${leaveId}] STEP 2: Setting ${participantType}.status to "disconnected"...`);
    await twilioCallManager.updateParticipantStatus(
      sessionId,
      participantType,
      'disconnected',
      admin.firestore.Timestamp.fromDate(new Date())
    );
    logger.info(`👋 [${leaveId}]   ✅ Status updated to "disconnected"`);

    // P0 FIX 2026-01-18: Calculate BILLING duration as time when BOTH participants are connected
    // This is fairer to the client - they shouldn't pay for time when they were alone
    //
    // Same fix as handleConferenceEnd - use overlap duration between both participants
    const session = await twilioCallManager.getCallSession(sessionId);
    const leaveTime = new Date();
    let billingDuration = 0;

    const clientConnectedAt = session?.participants.client.connectedAt;
    const providerConnectedAt = session?.participants.provider.connectedAt;

    if (providerConnectedAt && clientConnectedAt) {
      // BOTH participants were connected - calculate overlap duration
      const clientConnectedTime = clientConnectedAt.toDate().getTime();
      const providerConnectedTime = providerConnectedAt.toDate().getTime();

      // bothConnectedAt = when the SECOND participant joined
      const bothConnectedAt = Math.max(clientConnectedTime, providerConnectedTime);

      // endTime = when THIS participant is leaving
      const endTime = leaveTime.getTime();

      // billingDuration = time from when both connected until now
      // P0 FIX: Use Math.round instead of Math.floor to prevent edge case
      billingDuration = Math.max(0, Math.round((endTime - bothConnectedAt) / 1000));

      logger.info(`👋 [${leaveId}]   📊 BILLING DURATION (P0 FIX 2026-01-18):`);
      logger.info(`👋 [${leaveId}]     clientConnectedAt: ${new Date(clientConnectedTime).toISOString()}`);
      logger.info(`👋 [${leaveId}]     providerConnectedAt: ${new Date(providerConnectedTime).toISOString()}`);
      logger.info(`👋 [${leaveId}]     bothConnectedAt: ${new Date(bothConnectedAt).toISOString()}`);
      logger.info(`👋 [${leaveId}]     leaveTime: ${leaveTime.toISOString()}`);
      logger.info(`👋 [${leaveId}]     billingDuration: ${billingDuration}s`);
    } else if (providerConnectedAt) {
      logger.info(`👋 [${leaveId}]   ⚠️ Client never connected - billingDuration = 0`);
    } else {
      logger.info(`👋 [${leaveId}]   ⚠️ Provider never connected - billingDuration = 0`);
    }

    logger.info(`👋 [${leaveId}] STEP 3: Checking if early disconnection...`);
    logger.info(`👋 [${leaveId}]   billingDuration (from both connected): ${billingDuration}s`);
    logger.info(`👋 [${leaveId}]   minDuration: 60s`);
    logger.info(`👋 [${leaveId}]   isEarlyDisconnection: ${billingDuration < 60}`);

    // P0 CRITICAL FIX 2026-01-17 v4: Don't process if session is still connecting!
    // If session is in connecting phase, the retry loop should continue handling provider retries.
    // Calling handleEarlyDisconnection would set session.status to "failed" and STOP the retry loop.
    const sessionStatus = session?.status;
    const connectingStatuses = ['scheduled', 'calling', 'client_connecting', 'provider_connecting', 'both_connecting'];
    const isStillConnecting = connectingStatuses.includes(sessionStatus || '');

    if (!providerConnectedAt && isStillConnecting) {
      logger.info(`👋 [${leaveId}] ⛔ P0 FIX v4: NOT calling handleEarlyDisconnection!`);
      logger.info(`👋 [${leaveId}]   Reason: Provider never connected AND session is still in connecting phase`);
      logger.info(`👋 [${leaveId}]   session.status: ${sessionStatus}`);
      logger.info(`👋 [${leaveId}]   The retry loop will handle the provider connection`);
      logger.info(`👋 [${leaveId}]   Skipping handleEarlyDisconnection to allow retry loop to continue`);

      // Just log the event and return - don't process payment or set session to failed
      await logCallRecord({
        callId: sessionId,
        status: `${participantType}_left_during_connecting`,
        retryCount: 0,
        additionalData: {
          callSid,
          conferenceSid: body.ConferenceSid,
          sessionStatus,
          skippedReason: 'P0_FIX_V4_CONNECTING_PHASE'
        }
      });

      logger.info(`👋 [${leaveId}] END - Skipped handleEarlyDisconnection (P0 FIX v4)`);
      logger.info(`${'─'.repeat(70)}\n`);
      return; // EXIT - don't call handleEarlyDisconnection
    }

    // Gérer la déconnexion selon le participant et la durée
    // P0 FIX: Pass BILLING duration (from when both connected)
    logger.info(`👋 [${leaveId}] STEP 4: Calling handleEarlyDisconnection...`);
    await twilioCallManager.handleEarlyDisconnection(sessionId, participantType, billingDuration);
    logger.info(`👋 [${leaveId}]   ✅ handleEarlyDisconnection completed`);

    // Verify final state
    logger.info(`👋 [${leaveId}] STEP 5: Fetching session state AFTER handling...`);
    const sessionAfter = await twilioCallManager.getCallSession(sessionId);
    if (sessionAfter) {
      logger.info(`👋 [${leaveId}]   session.status: ${sessionAfter.status}`);
      logger.info(`👋 [${leaveId}]   client.status: ${sessionAfter.participants.client.status}`);
      logger.info(`👋 [${leaveId}]   provider.status: ${sessionAfter.participants.provider.status}`);
    }

    await logCallRecord({
      callId: sessionId,
      status: `${participantType}_left_conference`,
      retryCount: 0,
      additionalData: {
        callSid,
        conferenceSid: body.ConferenceSid,
        billingDuration
      }
    });

    // === LOGS DÉTAILLÉS POUR DEBUG PARTICIPANT-LEAVE ===
    logger.info(`\n${'👋'.repeat(30)}`);
    logger.info(`👋 [${leaveId}] === PARTICIPANT LEAVE SUMMARY ===`);
    logger.info(`👋 [${leaveId}]   sessionId: ${sessionId}`);
    logger.info(`👋 [${leaveId}]   participantType: ${participantType}`);
    logger.info(`👋 [${leaveId}]   callSid: ${callSid}`);
    logger.info(`👋 [${leaveId}]   billingDuration: ${billingDuration}s`);
    logger.info(`👋 [${leaveId}]   isEarlyDisconnection: ${billingDuration < 60 ? 'YES' : 'NO'}`);

    // Fetch and log final state after leave
    const finalLeaveState = await twilioCallManager.getCallSession(sessionId);
    if (finalLeaveState) {
      logger.info(`👋 [${leaveId}]   FINAL STATE AFTER LEAVE:`);
      logger.info(`👋 [${leaveId}]     session.status: ${finalLeaveState.status}`);
      logger.info(`👋 [${leaveId}]     client.status: ${finalLeaveState.participants.client.status}`);
      logger.info(`👋 [${leaveId}]     provider.status: ${finalLeaveState.participants.provider.status}`);
      logger.info(`👋 [${leaveId}]     payment.status: ${finalLeaveState.payment?.status}`);
    }
    logger.info(`${'👋'.repeat(30)}\n`);

    logger.info(`👋 [${leaveId}] END - Participant leave handled successfully`);
    logger.info(`${'─'.repeat(70)}\n`);

  } catch (error) {
    logger.error(`👋 [${leaveId}] ❌ ERROR in handleParticipantLeave:`, error);
    await logError('handleParticipantLeave', error);
  }
}

/**
 * Gère les événements mute/unmute
 */
async function handleParticipantMute(sessionId: string, body: TwilioConferenceWebhookBody) {
  try {
    const participantType = body.ParticipantLabel as 'provider' | 'client';
    const isMuted = body.StatusCallbackEvent === 'participant-mute';
    
    logger.info(`🔇 Participant ${isMuted ? 'muted' : 'unmuted'}: ${participantType}`);

    await logCallRecord({
      callId: sessionId,
      status: `${participantType}_${isMuted ? 'muted' : 'unmuted'}`,
      retryCount: 0,
      additionalData: {
        callSid: body.CallSid,
        conferenceSid: body.ConferenceSid
      }
    });

  } catch (error) {
    await logError('handleParticipantMute', error);
  }
}

/**
 * Gère les événements hold/unhold
 */
async function handleParticipantHold(sessionId: string, body: TwilioConferenceWebhookBody) {
  try {
    const participantType = body.ParticipantLabel as 'provider' | 'client';
    const isOnHold = body.StatusCallbackEvent === 'participant-hold';
    
    logger.info(`⏸️ Participant ${isOnHold ? 'on hold' : 'off hold'}: ${participantType}`);

    await logCallRecord({
      callId: sessionId,
      status: `${participantType}_${isOnHold ? 'hold' : 'unhold'}`,
      retryCount: 0,
      additionalData: {
        callSid: body.CallSid,
        conferenceSid: body.ConferenceSid
      }
    });

  } catch (error) {
    await logError('handleParticipantHold', error);
  }
}