import { onRequest } from 'firebase-functions/v2/https';
import { twilioCallManager } from '../TwilioCallManager';
import { logCallRecord } from '../utils/logs/logCallRecord';
import { logError } from '../utils/logs/logError';
import { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { validateTwilioWebhookSignature, TWILIO_AUTH_TOKEN_SECRET, TWILIO_ACCOUNT_SID_SECRET } from '../lib/twilio';
import { STRIPE_SECRET_KEY_LIVE, STRIPE_SECRET_KEY_TEST } from '../lib/stripe';

// Ensure TypeScript recognizes the secrets are used in the secrets array
void TWILIO_AUTH_TOKEN_SECRET;
void TWILIO_ACCOUNT_SID_SECRET;
void STRIPE_SECRET_KEY_LIVE;
void STRIPE_SECRET_KEY_TEST;

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
    memory: '256MiB',
    cpu: 0.25,
    maxInstances: 3,
    minInstances: 0,
    concurrency: 1,
    // P0 CRITICAL FIX: Add Twilio secrets for signature validation + Stripe secrets for payment capture
    secrets: [TWILIO_AUTH_TOKEN_SECRET, TWILIO_ACCOUNT_SID_SECRET, STRIPE_SECRET_KEY_LIVE, STRIPE_SECRET_KEY_TEST]
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
        console.error(`🎤 [${confWebhookId}] ❌ Transaction error for webhook idempotency: ${txError}`);
        res.status(200).send('OK - transaction error, treated as duplicate');
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

      // P0 FIX: If we found by name but conference.sid is not set, set it now!
      if (!session.conference?.sid && body.ConferenceSid) {
        console.log(`🎤 [${confWebhookId}] 🔧 Setting conference.sid for the first time: ${body.ConferenceSid}`);
        try {
          await twilioCallManager.updateConferenceSid(session.id, body.ConferenceSid);
          console.log(`🎤 [${confWebhookId}]   ✅ conference.sid updated in Firestore`);
        } catch (updateError) {
          console.error(`🎤 [${confWebhookId}]   ⚠️ Failed to update conference.sid:`, updateError);
          // Continue processing - non-fatal error
        }
      }

      const sessionId = session.id;
      console.log(`🎤 [${confWebhookId}] Session found: ${sessionId}`);

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

  try {
    const twilioDuration = parseInt(body.Duration || '0');
    const conferenceEndTime = new Date();

    console.log(`\n${'█'.repeat(70)}`);
    console.log(`🏁 [${endId}] handleConferenceEnd START`);
    console.log(`🏁 [${endId}]   sessionId: ${sessionId}`);
    console.log(`🏁 [${endId}]   conferenceSid: ${body.ConferenceSid}`);
    console.log(`🏁 [${endId}]   twilioDuration (total conference): ${twilioDuration}s`);
    console.log(`${'█'.repeat(70)}`);

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
          // Non-critical, continue
        }
      }
    }

    // P0 FIX: Calculate BILLING duration from when BOTH participants are connected
    // This is fairer to the client - they shouldn't pay for time waiting for the provider
    let billingDuration = 0;
    const providerConnectedAt = sessionBefore?.participants.provider.connectedAt;

    if (providerConnectedAt) {
      // Provider was connected - calculate billing duration from provider connection to now
      const providerConnectedTime = providerConnectedAt.toDate();
      // P0 FIX: Ensure billingDuration is never negative (clock skew protection between servers)
      billingDuration = Math.max(0, Math.floor((conferenceEndTime.getTime() - providerConnectedTime.getTime()) / 1000));
      console.log(`🏁 [${endId}]   providerConnectedAt: ${providerConnectedTime.toISOString()}`);
      console.log(`🏁 [${endId}]   conferenceEndTime: ${conferenceEndTime.toISOString()}`);
      console.log(`🏁 [${endId}]   billingDuration (from provider connect): ${billingDuration}s`);
    } else {
      // Provider never connected - no billing
      console.log(`🏁 [${endId}]   ⚠️ Provider never connected - billingDuration = 0`);
      billingDuration = 0;
    }

    console.log(`🏁 [${endId}]   twilioDuration (total): ${twilioDuration}s (${(twilioDuration / 60).toFixed(1)} min)`);
    console.log(`🏁 [${endId}]   billingDuration (both connected): ${billingDuration}s (${(billingDuration / 60).toFixed(1)} min)`);
    console.log(`🏁 [${endId}]   minDurationForCapture: 120s (2 min)`);
    console.log(`🏁 [${endId}]   willCapture: ${billingDuration >= 120 ? 'YES' : 'NO - will refund/cancel'}`);

    console.log(`🏁 [${endId}] STEP 2: Updating conference info (endedAt + duration)...`);
    await twilioCallManager.updateConferenceInfo(sessionId, {
      endedAt: admin.firestore.Timestamp.fromDate(conferenceEndTime),
      duration: twilioDuration,
      billingDuration: billingDuration // Store both for transparency
    });
    console.log(`🏁 [${endId}]   ✅ Conference info updated`);

    // Log si appel trop court (pour monitoring) - use BILLING duration
    if (billingDuration < 120) {
      console.log(`🏁 [${endId}] ⚠️ BILLING DURATION TOO SHORT: ${billingDuration}s < 120s minimum`);
      console.log(`🏁 [${endId}]   Action: Will trigger refund/cancel via handleCallCompletion`);
      await logCallRecord({
        callId: sessionId,
        status: 'call_too_short',
        retryCount: 0,
        additionalData: {
          twilioDuration,
          billingDuration,
          reason: 'Billing duration (from both connected) less than 2 minutes - will trigger refund/cancel'
        }
      });
    } else {
      console.log(`🏁 [${endId}] ✅ BILLING DURATION OK: ${billingDuration}s >= 120s minimum`);
      console.log(`🏁 [${endId}]   Action: Will capture payment via handleCallCompletion`);
    }

    // handleCallCompletion gère TOUS les cas:
    // - Si durée >= 120s → capture paiement + schedule transfer prestataire
    // - Si durée < 120s  → processRefund (cancel ou refund selon état paiement)
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

    // P0 CRITICAL FIX: Do NOT set status to "connected" when AMD is still pending!
    //
    // IMPORTANT: Voicemails CAN join conferences! When a voicemail answers:
    // 1. The call connects to the conference TwiML
    // 2. Voicemail "joins" the conference (just listening/recording hold music)
    // 3. If we set status to "connected" here, waitForConnection() would return true
    // 4. Provider would be called even though it's a voicemail!
    //
    // Correct behavior:
    // - Keep status as "amd_pending" when participant joins with AMD pending
    // - Let the asyncAmdStatusCallback (in twilioAmdTwiml) determine human vs machine
    // - If human: asyncAmdStatusCallback sets status to "connected"
    // - If machine: asyncAmdStatusCallback sets status to "no_answer" and hangs up
    //
    // AMD typically completes within 30 seconds, and waitForConnection has 90s timeout.
    if (currentStatus === 'amd_pending') {
      console.log(`👋 [${joinId}] ⚠️ AMD is still pending - participant joined but might be voicemail`);
      console.log(`👋 [${joinId}]   ⛔ NOT setting status to "connected" yet - waiting for AMD result`);
      console.log(`👋 [${joinId}]   asyncAmdStatusCallback will set: "connected" if human, "no_answer" if machine`);
      await logCallRecord({
        callId: sessionId,
        status: `${participantType}_joined_but_amd_pending`,
        retryCount: 0,
        additionalData: {
          callSid,
          conferenceSid: body.ConferenceSid,
          reason: 'waiting_for_amd_callback_before_setting_connected'
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
    console.log(`👋 [${leaveId}]   conferenceSid: ${body.ConferenceSid}`);
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

    // P0 FIX: Calculate BILLING duration from when BOTH participants are connected
    // This is fairer to the client - they shouldn't pay for time waiting for the provider
    const session = await twilioCallManager.getCallSession(sessionId);
    const leaveTime = new Date();
    let billingDuration = 0;

    const providerConnectedAt = session?.participants.provider.connectedAt;
    if (providerConnectedAt) {
      const providerConnectedTime = providerConnectedAt.toDate();
      // P0 FIX: Ensure billingDuration is never negative (clock skew protection between servers)
      billingDuration = Math.max(0, Math.floor((leaveTime.getTime() - providerConnectedTime.getTime()) / 1000));
      console.log(`👋 [${leaveId}]   providerConnectedAt: ${providerConnectedTime.toISOString()}`);
      console.log(`👋 [${leaveId}]   leaveTime: ${leaveTime.toISOString()}`);
    } else {
      console.log(`👋 [${leaveId}]   ⚠️ Provider never connected - billingDuration = 0`);
    }

    console.log(`👋 [${leaveId}] STEP 3: Checking if early disconnection...`);
    console.log(`👋 [${leaveId}]   billingDuration (from both connected): ${billingDuration}s`);
    console.log(`👋 [${leaveId}]   minDuration: 120s`);
    console.log(`👋 [${leaveId}]   isEarlyDisconnection: ${billingDuration < 120}`);

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