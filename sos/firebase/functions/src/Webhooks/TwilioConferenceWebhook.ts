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
  try {
    console.log(`🎤 Conférence démarrée: ${sessionId}`);
    
    await twilioCallManager.updateConferenceInfo(sessionId, {
      sid: body.ConferenceSid,
      startedAt: admin.firestore.Timestamp.fromDate(new Date())});

    await twilioCallManager.updateCallSessionStatus(sessionId, 'active');

    await logCallRecord({
      callId: sessionId,
      status: 'conference_started',
      retryCount: 0,
      additionalData: {
        conferenceSid: body.ConferenceSid,
        timestamp: body.Timestamp
      }
    });

  } catch (error) {
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
  try {
    const duration = parseInt(body.Duration || '0');
    console.log(`🏁 Conférence terminée: ${sessionId}, durée: ${duration}s`);

    await twilioCallManager.updateConferenceInfo(sessionId, {
      endedAt: admin.firestore.Timestamp.fromDate(new Date()),
      duration: duration
    });

    // Log si appel trop court (pour monitoring)
    if (duration < 120) {
      await logCallRecord({
        callId: sessionId,
        status: 'call_too_short',
        retryCount: 0,
        additionalData: {
          duration,
          reason: 'Duration less than 2 minutes - will trigger refund/cancel'
        }
      });
    }

    // handleCallCompletion gère TOUS les cas:
    // - Si durée >= 120s → capture paiement + schedule transfer prestataire
    // - Si durée < 120s  → processRefund (cancel ou refund selon état paiement)
    await twilioCallManager.handleCallCompletion(sessionId, duration);

    await logCallRecord({
      callId: sessionId,
      status: 'conference_ended',
      retryCount: 0,
      additionalData: {
        duration,
        conferenceSid: body.ConferenceSid
      }
    });

  } catch (error) {
    await logError('handleConferenceEnd', error);
  }
}

/**
 * Gère l'arrivée d'un participant
 */
async function handleParticipantJoin(sessionId: string, body: TwilioConferenceWebhookBody) {
  try {
    const participantType = body.ParticipantLabel as 'provider' | 'client';
    const callSid = body.CallSid!;
    
    console.log(`👋 Participant rejoint: ${participantType} (${callSid})`);

    // Mettre à jour le statut du participant
    await twilioCallManager.updateParticipantStatus(
      sessionId, 
      participantType, 
      'connected',
      admin.firestore.Timestamp.fromDate(new Date())
    );

    // Vérifier si les deux participants sont connectés
    const session = await twilioCallManager.getCallSession(sessionId);
    if (session && 
        session.participants.provider.status === 'connected' && 
        session.participants.client.status === 'connected') {
      
      await twilioCallManager.updateCallSessionStatus(sessionId, 'active');
      
      await logCallRecord({
        callId: sessionId,
        status: 'both_participants_connected',
        retryCount: 0
      });
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

  } catch (error) {
    await logError('handleParticipantJoin', error);
  }
}

/**
 * Gère le départ d'un participant
 */
async function handleParticipantLeave(sessionId: string, body: TwilioConferenceWebhookBody) {
  try {
    const participantType = body.ParticipantLabel as 'provider' | 'client';
    const callSid = body.CallSid!;
    
    console.log(`👋 Participant parti: ${participantType} (${callSid})`);

    // Mettre à jour le statut du participant
    await twilioCallManager.updateParticipantStatus(
      sessionId, 
      participantType, 
      'disconnected',
      admin.firestore.Timestamp.fromDate(new Date())
    );

    // Récupérer la durée de la conférence si disponible
    const session = await twilioCallManager.getCallSession(sessionId);
    const duration = session?.conference.duration || 0;

    // Gérer la déconnexion selon le participant et la durée
    await twilioCallManager.handleEarlyDisconnection(sessionId, participantType, duration);
    // (Maintenant que la méthode existe dans TwilioCallManager)

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

  } catch (error) {
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