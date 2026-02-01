import { onRequest } from 'firebase-functions/v2/https';
import { twilioCallManager } from '../TwilioCallManager';
import { logCallRecord } from '../utils/logs/logCallRecord';
import { logError } from '../utils/logs/logError';
import { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { validateTwilioWebhookSignature, TWILIO_AUTH_TOKEN_SECRET, TWILIO_ACCOUNT_SID_SECRET } from '../lib/twilio';
import { STRIPE_SECRET_KEY_LIVE, STRIPE_SECRET_KEY_TEST } from '../lib/stripe';
// P0 FIX: Import secrets from centralized secrets.ts - NEVER call defineSecret() here!
import { TASKS_AUTH_SECRET } from '../lib/secrets';

// Ensure TypeScript recognizes the secrets are used in the secrets array
void TWILIO_AUTH_TOKEN_SECRET;
void TWILIO_ACCOUNT_SID_SECRET;
void STRIPE_SECRET_KEY_LIVE;
void STRIPE_SECRET_KEY_TEST;
void TASKS_AUTH_SECRET;

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
    region: 'europe-west1',
    memory: '512MiB',  // P0 FIX: Increased for payment capture operations
    cpu: 0.25,         // P0 FIX: Reduced to save quota (function mostly waits for API responses)
    timeoutSeconds: 300, // P0 FIX: 5 minutes timeout for payment capture
    maxInstances: 10,  // P0 FIX: Increased for better scalability during peak
    minInstances: 1,   // P0 FIX: Keep warm to avoid cold start delays on conference events
    concurrency: 1,
    // P0 CRITICAL FIX: Add Twilio secrets for signature validation + Stripe secrets for payment capture
    // P0 FIX 2026-01-18: Added TASKS_AUTH_SECRET for scheduleProviderAvailableTask (provider cooldown)
    secrets: [TWILIO_AUTH_TOKEN_SECRET, TWILIO_ACCOUNT_SID_SECRET, STRIPE_SECRET_KEY_LIVE, STRIPE_SECRET_KEY_TEST, TASKS_AUTH_SECRET]
  },
  async (req: Request, res: Response) => {
    const confWebhookId = `conf_${Date.now().toString(36)}`;

    try {
      console.log(`\n${'▓'.repeat(70)}`);
      console.log(`🎤 [${confWebhookId}] twilioConferenceWebhook START`);

      // ===== P0 SECURITY FIX: Validate Twilio signature =====
      if (!validateTwilioWebhookSignature(req, res)) {
        console.error(`🎤 [${confWebhookId}] Invalid Twilio signature - rejecting request`);
        return; // Response already sent by validateTwilioWebhookSignature
      }

      const body: TwilioConferenceWebhookBody = req.body;

      console.log(`🎤 [${confWebhookId}] Conference Webhook reçu:`, {
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
          });
        });
      } catch (txError) {
        // P1-3 FIX: Don't treat transaction errors as duplicates!
        // Transaction errors (contention, timeout, network) are NOT the same as legitimate duplicates.
        // Return 500 so Twilio retries the webhook instead of losing the event.
        console.error(`🎤 [${confWebhookId}] ❌ Transaction error for webhook idempotency: ${txError}`);
        console.error(`🎤 [${confWebhookId}] ⚠️ Returning 500 to trigger Twilio retry (was incorrectly returning 200 before)`);
        res.status(500).send('Transaction error - please retry');
        return;
      }

      if (isDuplicate) {
        console.log(`🎤 [${confWebhookId}] ⚠️ IDEMPOTENCY: Conference event ${webhookKey} already processed, skipping`);
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
        console.log(`🎤 [${confWebhookId}] Session not found by ConferenceSid, trying FriendlyName...`);
        console.log(`🎤 [${confWebhookId}]   FriendlyName: ${body.FriendlyName}`);

        // FriendlyName is the conference name we set when creating the call
        session = await twilioCallManager.findSessionByConferenceName(body.FriendlyName);
      }

      if (!session) {
        console.warn(`🎤 [${confWebhookId}] ❌ Session non trouvée pour conférence:`);
        console.warn(`🎤 [${confWebhookId}]   ConferenceSid: ${body.ConferenceSid}`);
        console.warn(`🎤 [${confWebhookId}]   FriendlyName: ${body.FriendlyName}`);
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
        console.log(`🎤 [${confWebhookId}] 🔧 Setting conference.sid for the first time: ${body.ConferenceSid}`);
        console.log(`🎤 [${confWebhookId}]   Event type: ${body.StatusCallbackEvent} (allowed to set SID)`);
        try {
          await twilioCallManager.updateConferenceSid(session.id, body.ConferenceSid);
          console.log(`🎤 [${confWebhookId}]   ✅ conference.sid updated in Firestore`);
        } catch (updateError) {
          console.error(`🎤 [${confWebhookId}]   ⚠️ Failed to update conference.sid:`, updateError);
          // Continue processing - non-fatal error
        }
      } else if (!session.conference?.sid && body.ConferenceSid) {
        console.log(`🎤 [${confWebhookId}] ⚠️ NOT setting conference.sid - event type "${body.StatusCallbackEvent}" not allowed to set SID`);
        console.log(`🎤 [${confWebhookId}]   This might be a stale webhook from an old conference`);
      }

      const sessionId = session.id;
      console.log(`🎤 [${confWebhookId}] Session found: ${sessionId}`);

      // P0 DEBUG: Log current session state for all webhooks
      console.log(`🎤 [${confWebhookId}] 📊 CURRENT SESSION STATE:`);
      console.log(`🎤 [${confWebhookId}]   session.status: ${session.status}`);
      console.log(`🎤 [${confWebhookId}]   session.conference.sid: ${session.conference?.sid || 'NOT SET'}`);
      console.log(`🎤 [${confWebhookId}]   session.conference.name: ${session.conference?.name || 'NOT SET'}`);
      console.log(`🎤 [${confWebhookId}]   payment.status: ${session.payment?.status || 'NOT SET'}`);
      console.log(`🎤 [${confWebhookId}]   client.status: ${session.participants?.client?.status || 'NOT SET'}`);
      console.log(`🎤 [${confWebhookId}]   client.connectedAt: ${session.participants?.client?.connectedAt?.toDate?.() || 'NOT SET'}`);
      console.log(`🎤 [${confWebhookId}]   provider.status: ${session.participants?.provider?.status || 'NOT SET'}`);
      console.log(`🎤 [${confWebhookId}]   provider.connectedAt: ${session.participants?.provider?.connectedAt?.toDate?.() || 'NOT SET'}`);

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
          console.log(`Événement conférence non géré: ${body.StatusCallbackEvent}`);
      }

      res.status(200).send('OK');

    } catch (error) {
      console.error('❌ Erreur webhook conférence:', error);
      await logError('twilioConferenceWebhook:error', error);
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
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`🎤 [${startId}] handleConferenceStart START`);
    console.log(`🎤 [${startId}]   sessionId: ${sessionId}`);
    console.log(`🎤 [${startId}]   conferenceSid: ${body.ConferenceSid}`);
    console.log(`🎤 [${startId}]   friendlyName: ${body.FriendlyName}`);
    console.log(`🎤 [${startId}]   timestamp: ${body.Timestamp}`);
    console.log(`${'═'.repeat(70)}`);

    console.log(`🎤 [${startId}] STEP 1: Updating conference info (sid + startedAt)...`);
    await twilioCallManager.updateConferenceInfo(sessionId, {
      sid: body.ConferenceSid,
      startedAt: admin.firestore.Timestamp.fromDate(new Date())
    });
    console.log(`🎤 [${startId}]   ✅ Conference info updated`);

    console.log(`🎤 [${startId}] STEP 2: Setting call session status to "active"...`);
    await twilioCallManager.updateCallSessionStatus(sessionId, 'active');
    console.log(`🎤 [${startId}]   ✅ Session status set to "active"`);

    console.log(`🎤 [${startId}] STEP 3: Verifying session state after update...`);
    const session = await twilioCallManager.getCallSession(sessionId);
    if (session) {
      console.log(`🎤 [${startId}]   session.status: ${session.status}`);
      console.log(`🎤 [${startId}]   conference.sid: ${session.conference.sid}`);
      console.log(`🎤 [${startId}]   client.status: ${session.participants.client.status}`);
      console.log(`🎤 [${startId}]   provider.status: ${session.participants.provider.status}`);
    } else {
      console.log(`🎤 [${startId}]   ⚠️ Session not found after update!`);
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

    console.log(`🎤 [${startId}] END - Conference started successfully`);
    console.log(`${'═'.repeat(70)}\n`);

  } catch (error) {
    console.error(`🎤 [${startId}] ❌ ERROR in handleConferenceStart:`, error);
    await logError('handleConferenceStart', error);
  }
}

/**
 * Gère la fin de la conférence
 * IMPORTANT: handleCallCompletion gère automatiquement :
 *   - Si durée >= 120s → capture paiement + schedule transfer
 *   - Si durée < 120s  → processRefund (cancel si non-capturé, refund si capturé)
 */
async function handleConferenceEnd(sessionId: string, body: TwilioConferenceWebhookBody) {
  const endId = `conf_end_${Date.now().toString(36)}`;
  const webhookConferenceSid = body.ConferenceSid;

  try {
    const twilioDuration = parseInt(body.Duration || '0');
    const conferenceEndTime = new Date();

    console.log(`\n${'█'.repeat(70)}`);
    console.log(`🏁 [${endId}] handleConferenceEnd START`);
    console.log(`🏁 [${endId}]   sessionId: ${sessionId}`);
    console.log(`🏁 [${endId}]   conferenceSid: ${webhookConferenceSid}`);
    console.log(`🏁 [${endId}]   twilioDuration (total conference): ${twilioDuration}s`);
    console.log(`${'█'.repeat(70)}`);

    // P0 CRITICAL FIX 2026-01-17 v2: Check if this webhook is from the CURRENT conference
    // When a participant is transferred to a new conference, the old conference ends
    // and sends a conference-end event. We must ignore it if the session has moved to a new conference.
    //
    // BUG FIX: If the webhook has a ConferenceSID but the session doesn't have one yet,
    // it means the conference-end webhook arrived BEFORE the conference-start webhook.
    // This happens when an OLD conference ends while a NEW conference is starting.
    // We must IGNORE these webhooks to prevent premature payment cancellation.
    console.log(`🏁 [${endId}] STEP 0: Checking if webhook is from CURRENT conference...`);
    const sessionForConferenceCheck = await twilioCallManager.getCallSession(sessionId);
    const currentConferenceSid = sessionForConferenceCheck?.conference?.sid;

    if (webhookConferenceSid) {
      if (!currentConferenceSid) {
        // Webhook has a SID but session doesn't have one yet
        // This means conference-start hasn't been processed yet
        // This webhook is from an OLD conference - IGNORE IT
        console.log(`🏁 [${endId}] ⚠️ STALE CONFERENCE WEBHOOK - IGNORING (session has no SID yet)`);
        console.log(`🏁 [${endId}]   webhookConferenceSid: ${webhookConferenceSid}`);
        console.log(`🏁 [${endId}]   currentConferenceSid: NOT SET YET`);
        console.log(`🏁 [${endId}]   This webhook arrived BEFORE conference-start - it's from an OLD conference`);
        console.log(`🏁 [${endId}]   ⛔ NOT processing this webhook to prevent premature payment cancellation`);
        console.log(`${'█'.repeat(70)}\n`);
        return;
      }

      if (currentConferenceSid !== webhookConferenceSid) {
        console.log(`🏁 [${endId}] ⚠️ STALE CONFERENCE WEBHOOK - IGNORING (SID mismatch)`);
        console.log(`🏁 [${endId}]   webhookConferenceSid: ${webhookConferenceSid}`);
        console.log(`🏁 [${endId}]   currentConferenceSid: ${currentConferenceSid}`);
        console.log(`🏁 [${endId}]   This is an OLD conference ending - the call has moved to a new conference`);
        console.log(`🏁 [${endId}]   ⛔ NOT processing this webhook to prevent premature payment cancellation`);
        console.log(`${'█'.repeat(70)}\n`);
        return;
      }

      console.log(`🏁 [${endId}]   ✅ ConferenceSID matches current session - processing webhook`);
      console.log(`🏁 [${endId}]   ✅ P0 FIX v3 CHECK PASSED - This is the CURRENT conference, proceeding...`);
    } else {
      console.log(`🏁 [${endId}]   ⚠️ Webhook has no ConferenceSID - proceeding with caution`);
    }

    // P0 DEBUG: Log provider.connectedAt status - this determines billing duration
    const sessionForBillingCheck = await twilioCallManager.getCallSession(sessionId);
    const providerConnectedForBilling = sessionForBillingCheck?.participants?.provider?.connectedAt;
    console.log(`🏁 [${endId}] 📊 BILLING CHECK: provider.connectedAt = ${providerConnectedForBilling?.toDate?.() || 'NOT SET (billingDuration will be 0!)'}`);

    // P0 CRITICAL FIX 2026-01-17 v4: Don't process payment if session is still connecting!
    // If provider never connected (connectedAt is null) AND session is still in connecting phase,
    // this conference-end is likely from a temporary conference that ended due to connection issues.
    // We should NOT trigger a refund - let the retry loop handle it!
    const sessionStatus = sessionForBillingCheck?.status;
    const isStillConnecting = ['scheduled', 'calling', 'client_connecting', 'provider_connecting', 'both_connecting'].includes(sessionStatus || '');

    if (!providerConnectedForBilling) {
      console.log(`🏁 [${endId}] ⚠️ Provider never connected!`);
      console.log(`🏁 [${endId}]   session.status: ${sessionStatus}`);
      console.log(`🏁 [${endId}]   isStillConnecting: ${isStillConnecting}`);

      if (isStillConnecting) {
        console.log(`🏁 [${endId}] ⛔ P0 FIX v4: NOT processing this conference-end!`);
        console.log(`🏁 [${endId}]   Reason: Session is still in connecting phase (${sessionStatus})`);
        console.log(`🏁 [${endId}]   The retry loop will handle the provider connection`);
        console.log(`🏁 [${endId}]   Only updating conference.endedAt for tracking, NOT triggering payment processing`);

        // Just update the conference ended timestamp for tracking, but don't process payment
        await twilioCallManager.updateConferenceInfo(sessionId, {
          endedAt: admin.firestore.Timestamp.fromDate(new Date()),
          duration: parseInt(body.Duration || '0'),
        });

        console.log(`${'█'.repeat(70)}\n`);
        return; // EXIT - don't process payment, let retry loop continue
      }

      console.log(`🏁 [${endId}] ⚠️ WARNING: Session is NOT in connecting phase, will process refund`);
    }

    console.log(`🏁 [${endId}] STEP 1: Fetching session state BEFORE update...`);
    const sessionBefore = await twilioCallManager.getCallSession(sessionId);
    if (sessionBefore) {
      console.log(`🏁 [${endId}]   session.status: ${sessionBefore.status}`);
      console.log(`🏁 [${endId}]   payment.status: ${sessionBefore.payment?.status}`);
      console.log(`🏁 [${endId}]   payment.intentId: ${sessionBefore.payment?.intentId?.slice(0, 20) || 'N/A'}...`);
      console.log(`🏁 [${endId}]   client.status: ${sessionBefore.participants.client.status}`);
      console.log(`🏁 [${endId}]   provider.status: ${sessionBefore.participants.provider.status}`);
      console.log(`🏁 [${endId}]   provider.connectedAt: ${sessionBefore.participants.provider.connectedAt?.toDate?.() || 'N/A'}`);

      // Cancel forceEndCall safety net task (call ended normally)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const forceEndCallTaskId = (sessionBefore.metadata as any)?.forceEndCallTaskId;
      if (forceEndCallTaskId && !forceEndCallTaskId.startsWith('skipped_')) {
        try {
          const { cancelForceEndCallTask } = await import('../lib/tasks');
          await cancelForceEndCallTask(forceEndCallTaskId);
          console.log(`🏁 [${endId}]   ✅ ForceEndCall task cancelled: ${forceEndCallTaskId}`);
        } catch (cancelError) {
          console.warn(`🏁 [${endId}]   ⚠️ Failed to cancel forceEndCall task:`, cancelError);
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

      console.log(`🏁 [${endId}]   📊 BILLING DURATION CALCULATION (P0 FIX 2026-01-18):`);
      console.log(`🏁 [${endId}]     clientConnectedAt: ${new Date(clientConnectedTime).toISOString()}`);
      console.log(`🏁 [${endId}]     providerConnectedAt: ${new Date(providerConnectedTime).toISOString()}`);
      console.log(`🏁 [${endId}]     bothConnectedAt (2nd joined): ${new Date(bothConnectedAt).toISOString()}`);
      console.log(`🏁 [${endId}]     clientDisconnectedAt: ${clientDisconnectedAt ? new Date(clientDisconnectTime).toISOString() : 'still connected'}`);
      console.log(`🏁 [${endId}]     providerDisconnectedAt: ${providerDisconnectedAt ? new Date(providerDisconnectTime).toISOString() : 'still connected'}`);
      console.log(`🏁 [${endId}]     firstDisconnectedAt (1st left): ${new Date(firstDisconnectedAt).toISOString()}`);
      console.log(`🏁 [${endId}]     billingDuration (BOTH connected): ${billingDuration}s (${(billingDuration / 60).toFixed(1)} min)`);

      // Log who disconnected first (for debugging)
      const whoLeftFirst = clientDisconnectTime <= providerDisconnectTime ? 'CLIENT' : 'PROVIDER';
      console.log(`🏁 [${endId}]     whoLeftFirst: ${whoLeftFirst}`);
    } else if (providerConnectedAt) {
      // Provider connected but client never connected - no billing
      console.log(`🏁 [${endId}]   ⚠️ Client never connected - billingDuration = 0`);
      billingDuration = 0;
    } else {
      // Provider never connected - no billing
      console.log(`🏁 [${endId}]   ⚠️ Provider never connected - billingDuration = 0`);
      billingDuration = 0;
    }

    // P0 FIX 2026-02-01: Minimum duration reduced from 120s (2 min) to 60s (1 min)
    const MIN_DURATION_FOR_CAPTURE = 60;
    console.log(`🏁 [${endId}]   twilioDuration (total): ${twilioDuration}s (${(twilioDuration / 60).toFixed(1)} min)`);
    console.log(`🏁 [${endId}]   billingDuration (both connected): ${billingDuration}s (${(billingDuration / 60).toFixed(1)} min)`);
    console.log(`🏁 [${endId}]   minDurationForCapture: ${MIN_DURATION_FOR_CAPTURE}s (1 min)`);
    console.log(`🏁 [${endId}]   willCapture: ${billingDuration >= MIN_DURATION_FOR_CAPTURE ? 'YES' : 'NO - will refund/cancel'}`);

    console.log(`🏁 [${endId}] STEP 2: Updating conference info (endedAt + duration)...`);
    await twilioCallManager.updateConferenceInfo(sessionId, {
      endedAt: admin.firestore.Timestamp.fromDate(conferenceEndTime),
      duration: twilioDuration,
      billingDuration: billingDuration // Store both for transparency
    });
    console.log(`🏁 [${endId}]   ✅ Conference info updated`);

    // Log si appel trop court (pour monitoring) - use BILLING duration
    if (billingDuration < MIN_DURATION_FOR_CAPTURE) {
      console.log(`🏁 [${endId}] ⚠️ BILLING DURATION TOO SHORT: ${billingDuration}s < ${MIN_DURATION_FOR_CAPTURE}s minimum`);
      console.log(`🏁 [${endId}]   Action: Will trigger refund/cancel via handleCallCompletion`);
      await logCallRecord({
        callId: sessionId,
        status: 'call_too_short',
        retryCount: 0,
        additionalData: {
          twilioDuration,
          billingDuration,
          reason: `Billing duration (from both connected) less than ${MIN_DURATION_FOR_CAPTURE}s - will trigger refund/cancel`
        }
      });
    } else {
      console.log(`🏁 [${endId}] ✅ BILLING DURATION OK: ${billingDuration}s >= ${MIN_DURATION_FOR_CAPTURE}s minimum`);
      console.log(`🏁 [${endId}]   Action: Will capture payment via handleCallCompletion`);
    }

    // handleCallCompletion gère TOUS les cas:
    // - Si durée >= 60s → capture paiement + schedule transfer prestataire
    // - Si durée < 60s  → processRefund (cancel ou refund selon état paiement)
    // P0 FIX: Pass BILLING duration (from when both connected), not Twilio's total duration
    console.log(`🏁 [${endId}] STEP 3: Calling handleCallCompletion(sessionId, ${billingDuration})...`);
    await twilioCallManager.handleCallCompletion(sessionId, billingDuration);
    console.log(`🏁 [${endId}]   ✅ handleCallCompletion completed`);

    console.log(`🏁 [${endId}] STEP 4: Fetching session state AFTER completion...`);
    const sessionAfter = await twilioCallManager.getCallSession(sessionId);
    if (sessionAfter) {
      console.log(`🏁 [${endId}]   session.status: ${sessionAfter.status}`);
      console.log(`🏁 [${endId}]   payment.status: ${sessionAfter.payment?.status}`);
    }

    await logCallRecord({
      callId: sessionId,
      status: 'conference_ended',
      retryCount: 0,
      additionalData: {
        twilioDuration,
        billingDuration,
        conferenceSid: body.ConferenceSid
      }
    });

    // === LOGS DÉTAILLÉS POUR DEBUG CONFERENCE-END ===
    console.log(`\n${'🎤'.repeat(30)}`);
    console.log(`🎤 [${endId}] === CONFERENCE END SUMMARY ===`);
    console.log(`🎤 [${endId}]   sessionId: ${sessionId}`);
    console.log(`🎤 [${endId}]   conferenceSid: ${body.ConferenceSid}`);
    console.log(`🎤 [${endId}]   twilioDuration (total): ${twilioDuration}s`);
    console.log(`🎤 [${endId}]   billingDuration (both connected): ${billingDuration}s`);
    console.log(`🎤 [${endId}]   capture threshold: 120s`);
    console.log(`🎤 [${endId}]   decision: ${billingDuration >= 120 ? 'CAPTURE PAYMENT' : 'REFUND/CANCEL'}`);

    // Fetch and log final state
    const finalSessionState = await twilioCallManager.getCallSession(sessionId);
    if (finalSessionState) {
      console.log(`🎤 [${endId}]   FINAL SESSION STATE:`);
      console.log(`🎤 [${endId}]     session.status: ${finalSessionState.status}`);
      console.log(`🎤 [${endId}]     payment.status: ${finalSessionState.payment?.status}`);
      console.log(`🎤 [${endId}]     client.status: ${finalSessionState.participants.client.status}`);
      console.log(`🎤 [${endId}]     provider.status: ${finalSessionState.participants.provider.status}`);
      console.log(`🎤 [${endId}]     invoicesCreated: ${finalSessionState.metadata?.invoicesCreated || false}`);
    }
    console.log(`${'🎤'.repeat(30)}\n`);

    console.log(`🏁 [${endId}] END - Conference end handled successfully`);
    console.log(`${'█'.repeat(70)}\n`);

  } catch (error) {
    console.error(`🏁 [${endId}] ❌ ERROR in handleConferenceEnd:`, error);
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
      console.log(`👋 [${joinId}] ⚠️ ParticipantLabel is missing, using CallSid fallback`);
      const session = await twilioCallManager.getCallSession(sessionId);
      if (session) {
        if (session.participants.client.callSid === callSid) {
          participantType = 'client';
          console.log(`👋 [${joinId}]   ✅ Identified as CLIENT via CallSid match`);
        } else if (session.participants.provider.callSid === callSid) {
          participantType = 'provider';
          console.log(`👋 [${joinId}]   ✅ Identified as PROVIDER via CallSid match`);
        } else {
          console.log(`👋 [${joinId}]   ❌ CallSid does not match any participant!`);
          console.log(`👋 [${joinId}]   webhook callSid: ${callSid}`);
          console.log(`👋 [${joinId}]   client.callSid: ${session.participants.client.callSid}`);
          console.log(`👋 [${joinId}]   provider.callSid: ${session.participants.provider.callSid}`);
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
        console.log(`👋 [${joinId}]   ❌ Session not found - cannot identify participant`);
        return;
      }
    }

    console.log(`\n${'═'.repeat(70)}`);
    console.log(`👋 [${joinId}] handleParticipantJoin START - CRITICAL FOR waitForConnection()`);
    console.log(`👋 [${joinId}]   sessionId: ${sessionId}`);
    console.log(`👋 [${joinId}]   participantType: ${participantType}`);
    console.log(`👋 [${joinId}]   callSid: ${callSid}`);
    console.log(`👋 [${joinId}]   conferenceSid: ${body.ConferenceSid}`);
    console.log(`👋 [${joinId}]   source: ${body.ParticipantLabel ? 'ParticipantLabel' : 'CallSid fallback'}`);
    console.log(`${'═'.repeat(70)}`);

    // Get status BEFORE update
    console.log(`👋 [${joinId}] STEP 1: Fetching participant status BEFORE update...`);
    const sessionBefore = await twilioCallManager.getCallSession(sessionId);
    const participantBefore = participantType === 'provider'
      ? sessionBefore?.participants.provider
      : sessionBefore?.participants.client;
    const currentStatus = participantBefore?.status;
    console.log(`👋 [${joinId}]   ${participantType}.status BEFORE: "${currentStatus}"`);
    console.log(`👋 [${joinId}]   ${participantType}.callSid BEFORE: ${participantBefore?.callSid}`);

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
        console.log(`👋 [${joinId}] ✅ Status is already "connected" (set by twilioGatherResponse via DTMF)`);
        console.log(`👋 [${joinId}]   ⛔ NOT calling updateParticipantStatus to preserve original connectedAt!`);
        console.log(`👋 [${joinId}]   P0 FIX v3: This prevents billingDuration from being incorrectly shortened`);

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

        console.log(`👋 [${joinId}] END - Participant already connected, connectedAt preserved`);
        console.log(`${'═'.repeat(70)}\n`);
        return;
      }

      // AMD pending states - wait for AMD callback
      console.log(`👋 [${joinId}] ⚠️ Status "${currentStatus}" - participant joined but AMD not confirmed yet`);
      console.log(`👋 [${joinId}]   ⛔ NOT setting status to "connected" yet - waiting for AMD result`);
      console.log(`👋 [${joinId}]   asyncAmdStatusCallback will set: "connected" if human, "no_answer" if machine`);

      // P0 FIX v2: Log the race condition detection for debugging
      if (currentStatus === 'calling' || currentStatus === 'ringing') {
        console.log(`👋 [${joinId}]   🔄 RACE CONDITION DETECTED: participant-join arrived before "answered" webhook`);
        console.log(`👋 [${joinId}]   🔄 This is normal - "answered" webhook will set amd_pending soon`);
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
      console.log(`👋 [${joinId}] END - Waiting for AMD callback to determine human/machine`);
      console.log(`${'═'.repeat(70)}\n`);
      return;
    }

    // AMD is not pending - safe to set status to "connected"
    console.log(`👋 [${joinId}] STEP 2: Setting ${participantType}.status to "connected"...`);
    console.log(`👋 [${joinId}]   AMD is not pending, so this is safe`);
    console.log(`👋 [${joinId}]   This is CRITICAL - waitForConnection() polls for this status!`);
    await twilioCallManager.updateParticipantStatus(
      sessionId,
      participantType,
      'connected',
      admin.firestore.Timestamp.fromDate(new Date())
    );
    console.log(`👋 [${joinId}]   ✅ updateParticipantStatus() completed`);

    // Verify status was updated
    console.log(`👋 [${joinId}] STEP 3: Verifying status was updated...`);
    const sessionAfter = await twilioCallManager.getCallSession(sessionId);
    const participantAfter = participantType === 'provider'
      ? sessionAfter?.participants.provider
      : sessionAfter?.participants.client;
    console.log(`👋 [${joinId}]   ${participantType}.status AFTER: "${participantAfter?.status}"`);

    if (participantAfter?.status === 'connected') {
      console.log(`👋 [${joinId}]   ✅ Status correctly set to "connected" - waitForConnection() will succeed!`);
    } else {
      console.log(`👋 [${joinId}]   ❌ STATUS NOT "connected"! waitForConnection() may fail!`);
    }

    // Vérifier si les deux participants sont connectés
    console.log(`👋 [${joinId}] STEP 4: Checking if BOTH participants are connected...`);
    console.log(`👋 [${joinId}]   client.status: ${sessionAfter?.participants.client.status}`);
    console.log(`👋 [${joinId}]   provider.status: ${sessionAfter?.participants.provider.status}`);

    if (sessionAfter &&
        sessionAfter.participants.provider.status === 'connected' &&
        sessionAfter.participants.client.status === 'connected') {

      console.log(`👋 [${joinId}]   ✅ BOTH CONNECTED! Setting session status to "active"...`);
      await twilioCallManager.updateCallSessionStatus(sessionId, 'active');
      console.log(`👋 [${joinId}]   ✅ Session status set to "active"`);

      // Schedule forceEndCall task as safety net (will terminate call if stuck)
      // Add 10 minutes buffer to the maxDuration for the safety timeout
      try {
        const { scheduleForceEndCallTask } = await import('../lib/tasks');
        const maxDuration = sessionAfter.metadata?.maxDuration || 1200; // 20 min default
        const safetyTimeout = maxDuration + 600; // Add 10 min safety buffer
        const taskId = await scheduleForceEndCallTask(sessionId, safetyTimeout);
        console.log(`👋 [${joinId}]   ⏱️ ForceEndCall safety net scheduled: ${taskId} (${safetyTimeout}s)`);

        // Store the taskId in session metadata for potential cancellation
        await admin.firestore().collection('call_sessions').doc(sessionId).update({
          'metadata.forceEndCallTaskId': taskId,
          'metadata.forceEndCallScheduledAt': admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (taskError) {
        console.warn(`👋 [${joinId}]   ⚠️ Failed to schedule forceEndCall task:`, taskError);
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
      console.log(`👋 [${joinId}]   ⏳ Waiting for other participant to join...`);
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

    console.log(`👋 [${joinId}] END - Participant join handled successfully`);
    console.log(`${'═'.repeat(70)}\n`);

  } catch (error) {
    console.error(`👋 [${joinId}] ❌ ERROR in handleParticipantJoin:`, error);
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
        console.log(`👋 [${leaveId}] ⚠️ STALE CONFERENCE WEBHOOK - IGNORING (session has no SID yet)`);
        console.log(`👋 [${leaveId}]   webhookConferenceSid: ${webhookConferenceSid}`);
        console.log(`👋 [${leaveId}]   currentConferenceSid: NOT SET YET`);
        console.log(`👋 [${leaveId}]   This webhook arrived BEFORE conference-start - it's from an OLD conference`);
        console.log(`👋 [${leaveId}]   ⛔ NOT processing this webhook to prevent incorrect state updates`);
        return;
      }

      if (currentConferenceSid !== webhookConferenceSid) {
        console.log(`👋 [${leaveId}] ⚠️ STALE CONFERENCE WEBHOOK - IGNORING (SID mismatch)`);
        console.log(`👋 [${leaveId}]   webhookConferenceSid: ${webhookConferenceSid}`);
        console.log(`👋 [${leaveId}]   currentConferenceSid: ${currentConferenceSid}`);
        console.log(`👋 [${leaveId}]   Participant likely transferred to new conference - skipping leave handling`);
        return;
      }

      console.log(`👋 [${leaveId}]   ✅ ConferenceSID matches current session - processing webhook`);
    }

    // P0 FIX: Determine participantType from ParticipantLabel OR fallback to CallSid lookup
    let participantType = body.ParticipantLabel as 'provider' | 'client' | undefined;

    if (!participantType) {
      // Fallback: identify participant by matching CallSid in session
      console.log(`👋 [${leaveId}] ⚠️ ParticipantLabel is missing, using CallSid fallback`);
      const session = await twilioCallManager.getCallSession(sessionId);
      if (session) {
        if (session.participants.client.callSid === callSid) {
          participantType = 'client';
        } else if (session.participants.provider.callSid === callSid) {
          participantType = 'provider';
        } else {
          console.log(`👋 [${leaveId}]   ❌ CallSid does not match any participant, skipping leave handling`);
          return;
        }
        console.log(`👋 [${leaveId}]   ✅ Identified as ${participantType.toUpperCase()} via CallSid match`);
      } else {
        console.log(`👋 [${leaveId}]   ❌ Session not found - cannot identify participant`);
        return;
      }
    }

    console.log(`\n${'─'.repeat(70)}`);
    console.log(`👋 [${leaveId}] handleParticipantLeave START`);
    console.log(`👋 [${leaveId}]   sessionId: ${sessionId}`);
    console.log(`👋 [${leaveId}]   participantType: ${participantType}`);
    console.log(`👋 [${leaveId}]   callSid: ${callSid}`);
    console.log(`👋 [${leaveId}]   conferenceSid: ${webhookConferenceSid}`);
    console.log(`👋 [${leaveId}]   source: ${body.ParticipantLabel ? 'ParticipantLabel' : 'CallSid fallback'}`);
    console.log(`${'─'.repeat(70)}`);

    // Get status BEFORE update
    console.log(`👋 [${leaveId}] STEP 1: Fetching session state BEFORE update...`);
    const sessionBefore = await twilioCallManager.getCallSession(sessionId);
    if (sessionBefore) {
      console.log(`👋 [${leaveId}]   session.status: ${sessionBefore.status}`);
      console.log(`👋 [${leaveId}]   client.status: ${sessionBefore.participants.client.status}`);
      console.log(`👋 [${leaveId}]   provider.status: ${sessionBefore.participants.provider.status}`);
      console.log(`👋 [${leaveId}]   conference.duration: ${sessionBefore.conference.duration}s`);
    }

    // Mettre à jour le statut du participant
    console.log(`👋 [${leaveId}] STEP 2: Setting ${participantType}.status to "disconnected"...`);
    await twilioCallManager.updateParticipantStatus(
      sessionId,
      participantType,
      'disconnected',
      admin.firestore.Timestamp.fromDate(new Date())
    );
    console.log(`👋 [${leaveId}]   ✅ Status updated to "disconnected"`);

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

      console.log(`👋 [${leaveId}]   📊 BILLING DURATION (P0 FIX 2026-01-18):`);
      console.log(`👋 [${leaveId}]     clientConnectedAt: ${new Date(clientConnectedTime).toISOString()}`);
      console.log(`👋 [${leaveId}]     providerConnectedAt: ${new Date(providerConnectedTime).toISOString()}`);
      console.log(`👋 [${leaveId}]     bothConnectedAt: ${new Date(bothConnectedAt).toISOString()}`);
      console.log(`👋 [${leaveId}]     leaveTime: ${leaveTime.toISOString()}`);
      console.log(`👋 [${leaveId}]     billingDuration: ${billingDuration}s`);
    } else if (providerConnectedAt) {
      console.log(`👋 [${leaveId}]   ⚠️ Client never connected - billingDuration = 0`);
    } else {
      console.log(`👋 [${leaveId}]   ⚠️ Provider never connected - billingDuration = 0`);
    }

    console.log(`👋 [${leaveId}] STEP 3: Checking if early disconnection...`);
    console.log(`👋 [${leaveId}]   billingDuration (from both connected): ${billingDuration}s`);
    console.log(`👋 [${leaveId}]   minDuration: 120s`);
    console.log(`👋 [${leaveId}]   isEarlyDisconnection: ${billingDuration < 120}`);

    // P0 CRITICAL FIX 2026-01-17 v4: Don't process if session is still connecting!
    // If session is in connecting phase, the retry loop should continue handling provider retries.
    // Calling handleEarlyDisconnection would set session.status to "failed" and STOP the retry loop.
    const sessionStatus = session?.status;
    const connectingStatuses = ['scheduled', 'calling', 'client_connecting', 'provider_connecting', 'both_connecting'];
    const isStillConnecting = connectingStatuses.includes(sessionStatus || '');

    if (!providerConnectedAt && isStillConnecting) {
      console.log(`👋 [${leaveId}] ⛔ P0 FIX v4: NOT calling handleEarlyDisconnection!`);
      console.log(`👋 [${leaveId}]   Reason: Provider never connected AND session is still in connecting phase`);
      console.log(`👋 [${leaveId}]   session.status: ${sessionStatus}`);
      console.log(`👋 [${leaveId}]   The retry loop will handle the provider connection`);
      console.log(`👋 [${leaveId}]   Skipping handleEarlyDisconnection to allow retry loop to continue`);

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

      console.log(`👋 [${leaveId}] END - Skipped handleEarlyDisconnection (P0 FIX v4)`);
      console.log(`${'─'.repeat(70)}\n`);
      return; // EXIT - don't call handleEarlyDisconnection
    }

    // Gérer la déconnexion selon le participant et la durée
    // P0 FIX: Pass BILLING duration (from when both connected)
    console.log(`👋 [${leaveId}] STEP 4: Calling handleEarlyDisconnection...`);
    await twilioCallManager.handleEarlyDisconnection(sessionId, participantType, billingDuration);
    console.log(`👋 [${leaveId}]   ✅ handleEarlyDisconnection completed`);

    // Verify final state
    console.log(`👋 [${leaveId}] STEP 5: Fetching session state AFTER handling...`);
    const sessionAfter = await twilioCallManager.getCallSession(sessionId);
    if (sessionAfter) {
      console.log(`👋 [${leaveId}]   session.status: ${sessionAfter.status}`);
      console.log(`👋 [${leaveId}]   client.status: ${sessionAfter.participants.client.status}`);
      console.log(`👋 [${leaveId}]   provider.status: ${sessionAfter.participants.provider.status}`);
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
    console.log(`\n${'👋'.repeat(30)}`);
    console.log(`👋 [${leaveId}] === PARTICIPANT LEAVE SUMMARY ===`);
    console.log(`👋 [${leaveId}]   sessionId: ${sessionId}`);
    console.log(`👋 [${leaveId}]   participantType: ${participantType}`);
    console.log(`👋 [${leaveId}]   callSid: ${callSid}`);
    console.log(`👋 [${leaveId}]   billingDuration: ${billingDuration}s`);
    console.log(`👋 [${leaveId}]   isEarlyDisconnection: ${billingDuration < 120 ? 'YES' : 'NO'}`);

    // Fetch and log final state after leave
    const finalLeaveState = await twilioCallManager.getCallSession(sessionId);
    if (finalLeaveState) {
      console.log(`👋 [${leaveId}]   FINAL STATE AFTER LEAVE:`);
      console.log(`👋 [${leaveId}]     session.status: ${finalLeaveState.status}`);
      console.log(`👋 [${leaveId}]     client.status: ${finalLeaveState.participants.client.status}`);
      console.log(`👋 [${leaveId}]     provider.status: ${finalLeaveState.participants.provider.status}`);
      console.log(`👋 [${leaveId}]     payment.status: ${finalLeaveState.payment?.status}`);
    }
    console.log(`${'👋'.repeat(30)}\n`);

    console.log(`👋 [${leaveId}] END - Participant leave handled successfully`);
    console.log(`${'─'.repeat(70)}\n`);

  } catch (error) {
    console.error(`👋 [${leaveId}] ❌ ERROR in handleParticipantLeave:`, error);
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
    
    console.log(`🔇 Participant ${isMuted ? 'muted' : 'unmuted'}: ${participantType}`);

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
    
    console.log(`⏸️ Participant ${isOnHold ? 'on hold' : 'off hold'}: ${participantType}`);

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