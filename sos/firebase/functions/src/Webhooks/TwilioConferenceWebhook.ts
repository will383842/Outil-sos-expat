import { onRequest } from 'firebase-functions/v2/https';
import { twilioCallManager } from '../TwilioCallManager';
import { logCallRecord } from '../utils/logs/logCallRecord';
import { logError } from '../utils/logs/logError';
import { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { validateTwilioWebhookSignature, TWILIO_AUTH_TOKEN_SECRET } from '../lib/twilio';

// Ensure TypeScript recognizes the secret is used in the secrets array
void TWILIO_AUTH_TOKEN_SECRET;

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
    // P0 CRITICAL FIX: Add TWILIO_AUTH_TOKEN secret for signature validation
    secrets: [TWILIO_AUTH_TOKEN_SECRET]
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

          transaction.set(webhookEventRef, {
            eventKey: webhookKey,
            conferenceSid: body.ConferenceSid,
            statusCallbackEvent: body.StatusCallbackEvent,
            callSid: body.CallSid,
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

      // Trouver la session d'appel par le nom de la conférence
      const session = await twilioCallManager.findSessionByConferenceSid(body.ConferenceSid);

      if (!session) {
        console.warn(`🎤 [${confWebhookId}] Session non trouvée pour conférence: ${body.ConferenceSid}`);
        res.status(200).send('Session not found');
        return;
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
    const duration = parseInt(body.Duration || '0');

    console.log(`\n${'█'.repeat(70)}`);
    console.log(`🏁 [${endId}] handleConferenceEnd START`);
    console.log(`🏁 [${endId}]   sessionId: ${sessionId}`);
    console.log(`🏁 [${endId}]   conferenceSid: ${body.ConferenceSid}`);
    console.log(`🏁 [${endId}]   duration: ${duration}s`);
    console.log(`🏁 [${endId}]   durationMinutes: ${(duration / 60).toFixed(1)} min`);
    console.log(`🏁 [${endId}]   minDurationForCapture: 120s (2 min)`);
    console.log(`🏁 [${endId}]   willCapture: ${duration >= 120 ? 'YES' : 'NO - will refund/cancel'}`);
    console.log(`${'█'.repeat(70)}`);

    console.log(`🏁 [${endId}] STEP 1: Fetching session state BEFORE update...`);
    const sessionBefore = await twilioCallManager.getCallSession(sessionId);
    if (sessionBefore) {
      console.log(`🏁 [${endId}]   session.status: ${sessionBefore.status}`);
      console.log(`🏁 [${endId}]   payment.status: ${sessionBefore.payment?.status}`);
      console.log(`🏁 [${endId}]   payment.intentId: ${sessionBefore.payment?.intentId?.slice(0, 20) || 'N/A'}...`);
      console.log(`🏁 [${endId}]   client.status: ${sessionBefore.participants.client.status}`);
      console.log(`🏁 [${endId}]   provider.status: ${sessionBefore.participants.provider.status}`);
    }

    console.log(`🏁 [${endId}] STEP 2: Updating conference info (endedAt + duration)...`);
    await twilioCallManager.updateConferenceInfo(sessionId, {
      endedAt: admin.firestore.Timestamp.fromDate(new Date()),
      duration: duration
    });
    console.log(`🏁 [${endId}]   ✅ Conference info updated`);

    // Log si appel trop court (pour monitoring)
    if (duration < 120) {
      console.log(`🏁 [${endId}] ⚠️ CALL TOO SHORT: ${duration}s < 120s minimum`);
      console.log(`🏁 [${endId}]   Action: Will trigger refund/cancel via handleCallCompletion`);
      await logCallRecord({
        callId: sessionId,
        status: 'call_too_short',
        retryCount: 0,
        additionalData: {
          duration,
          reason: 'Duration less than 2 minutes - will trigger refund/cancel'
        }
      });
    } else {
      console.log(`🏁 [${endId}] ✅ CALL DURATION OK: ${duration}s >= 120s minimum`);
      console.log(`🏁 [${endId}]   Action: Will capture payment via handleCallCompletion`);
    }

    // handleCallCompletion gère TOUS les cas:
    // - Si durée >= 120s → capture paiement + schedule transfer prestataire
    // - Si durée < 120s  → processRefund (cancel ou refund selon état paiement)
    console.log(`🏁 [${endId}] STEP 3: Calling handleCallCompletion(sessionId, ${duration})...`);
    await twilioCallManager.handleCallCompletion(sessionId, duration);
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
        duration,
        conferenceSid: body.ConferenceSid
      }
    });

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
    const participantType = body.ParticipantLabel as 'provider' | 'client';
    const callSid = body.CallSid!;

    console.log(`\n${'═'.repeat(70)}`);
    console.log(`👋 [${joinId}] handleParticipantJoin START - CRITICAL FOR waitForConnection()`);
    console.log(`👋 [${joinId}]   sessionId: ${sessionId}`);
    console.log(`👋 [${joinId}]   participantType: ${participantType}`);
    console.log(`👋 [${joinId}]   callSid: ${callSid}`);
    console.log(`👋 [${joinId}]   conferenceSid: ${body.ConferenceSid}`);
    console.log(`${'═'.repeat(70)}`);

    // Get status BEFORE update
    console.log(`👋 [${joinId}] STEP 1: Fetching participant status BEFORE update...`);
    const sessionBefore = await twilioCallManager.getCallSession(sessionId);
    const participantBefore = participantType === 'provider'
      ? sessionBefore?.participants.provider
      : sessionBefore?.participants.client;
    console.log(`👋 [${joinId}]   ${participantType}.status BEFORE: "${participantBefore?.status}"`);
    console.log(`👋 [${joinId}]   ${participantType}.callSid BEFORE: ${participantBefore?.callSid}`);

    // Mettre à jour le statut du participant
    console.log(`👋 [${joinId}] STEP 2: Setting ${participantType}.status to "connected"...`);
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
    const participantType = body.ParticipantLabel as 'provider' | 'client';
    const callSid = body.CallSid!;

    console.log(`\n${'─'.repeat(70)}`);
    console.log(`👋 [${leaveId}] handleParticipantLeave START`);
    console.log(`👋 [${leaveId}]   sessionId: ${sessionId}`);
    console.log(`👋 [${leaveId}]   participantType: ${participantType}`);
    console.log(`👋 [${leaveId}]   callSid: ${callSid}`);
    console.log(`👋 [${leaveId}]   conferenceSid: ${body.ConferenceSid}`);
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

    // Récupérer la durée de la conférence si disponible
    const session = await twilioCallManager.getCallSession(sessionId);
    const duration = session?.conference.duration || 0;

    console.log(`👋 [${leaveId}] STEP 3: Checking if early disconnection...`);
    console.log(`👋 [${leaveId}]   duration: ${duration}s`);
    console.log(`👋 [${leaveId}]   minDuration: 120s`);
    console.log(`👋 [${leaveId}]   isEarlyDisconnection: ${duration < 120}`);

    // Gérer la déconnexion selon le participant et la durée
    console.log(`👋 [${leaveId}] STEP 4: Calling handleEarlyDisconnection...`);
    await twilioCallManager.handleEarlyDisconnection(sessionId, participantType, duration);
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
        duration
      }
    });

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