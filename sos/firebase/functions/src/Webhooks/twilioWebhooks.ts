import { onRequest } from 'firebase-functions/v2/https';
import { twilioCallManager } from '../TwilioCallManager';
import { logCallRecord } from '../utils/logs/logCallRecord';
import { logError } from '../utils/logs/logError';
import { logger as prodLogger } from '../utils/productionLogger';
import { Response } from 'express';
import * as admin from 'firebase-admin';
import { Request } from 'firebase-functions/v2/https';
import { validateTwilioWebhookSignature, TWILIO_AUTH_TOKEN_SECRET, TWILIO_ACCOUNT_SID_SECRET } from '../lib/twilio';
import { setProviderBusy } from '../callables/providerStatusManager';
import voicePromptsJson from '../content/voicePrompts.json';

// Helper function to get intro text based on participant type and language
function getIntroText(participant: "provider" | "client", langKey: string): string {
  const prompts = voicePromptsJson as Record<string, Record<string, string>>;
  const table = participant === "provider" ? prompts.provider_intro : prompts.client_intro;
  return table[langKey] ?? table.en ?? "Please hold.";
}


interface TwilioCallWebhookBody {
  CallSid: string;
  CallStatus: string;
  CallDuration?: string;
  From: string;
  To: string;
  AnsweredBy?: string;
  Timestamp: string;

  // Informations supplémentaires
  Direction?: string;
  ForwardedFrom?: string;

  // Pricing info (sent on "completed" status)
  Price?: string;       // Cost of the call (e.g., "-0.0150")
  PriceUnit?: string;   // Currency (e.g., "USD")
}

/**
 * Webhook unifié pour les événements d'appels Twilio
 * Compatible avec le système TwilioCallManager moderne
 */
export const twilioCallWebhook = onRequest(
  {
    region: 'europe-west1',
    memory: '256MiB',
    cpu: 0.25,
    maxInstances: 3,
    minInstances: 0,
    concurrency: 1,
    // P0 CRITICAL FIX: Add Twilio secrets for signature validation + hangup calls to voicemail
    secrets: [TWILIO_AUTH_TOKEN_SECRET, TWILIO_ACCOUNT_SID_SECRET]
  },
  async (req: Request, res: Response) => {
    const requestId = `twilio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    try {
      console.log("[twilioCallWebhook] === Twilio Webhook Execution Started ===");
      prodLogger.info('TWILIO_WEBHOOK_START', `[${requestId}] Twilio call webhook received`, {
        requestId,
        method: req.method,
        timestamp: new Date().toISOString()
      });

      // ===== P0 SECURITY FIX: Validate Twilio signature =====
      if (!validateTwilioWebhookSignature(req as any, res as any)) {
        console.error("[twilioCallWebhook] Invalid Twilio signature - rejecting request");
        prodLogger.warn('TWILIO_WEBHOOK_INVALID_SIGNATURE', `[${requestId}] Invalid Twilio signature`, { requestId });
        return; // Response already sent by validateTwilioWebhookSignature
      }

      const body: TwilioCallWebhookBody = req.body;

      // ✅ P1 SECURITY FIX: Sanitize phone numbers in logs (GDPR compliance)
      const sanitizePhone = (phone: string) => phone ? `${phone.slice(0, 4)}****${phone.slice(-2)}` : 'unknown';

      prodLogger.info('TWILIO_WEBHOOK_EVENT', `[${requestId}] Call event: ${body.CallStatus}`, {
        requestId,
        callSid: body.CallSid?.slice(0, 20) + '...',
        callStatus: body.CallStatus,
        duration: body.CallDuration
      });

      console.log('🔔 Call Webhook reçu:', {
        event: body.CallStatus,
        callSid: body.CallSid,
        from: sanitizePhone(body.From),
        to: sanitizePhone(body.To),
        duration: body.CallDuration
      });

      // ✅ P1-3 FIX: Atomic idempotency check using Firestore transaction
      // This prevents race conditions where two webhook calls arrive simultaneously
      const db = admin.firestore();
      const webhookKey = `twilio_${body.CallSid}_${body.CallStatus}`;
      const webhookEventRef = db.collection("processed_webhook_events").doc(webhookKey);

      let isDuplicate = false;
      try {
        await db.runTransaction(async (transaction) => {
          const existingEvent = await transaction.get(webhookEventRef);

          if (existingEvent.exists) {
            isDuplicate = true;
            return; // Exit transaction - this is a duplicate
          }

          // Atomically mark event as being processed within the transaction
          transaction.set(webhookEventRef, {
            eventKey: webhookKey,
            callSid: body.CallSid,
            callStatus: body.CallStatus,
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
            source: "twilio_call_webhook",
          });
        });
      } catch (txError) {
        console.error(`❌ Transaction error for webhook idempotency: ${txError}`);
        // On transaction failure, treat as potentially duplicate to be safe
        res.status(200).send('OK - transaction error, treated as duplicate');
        return;
      }

      if (isDuplicate) {
        console.log(`⚠️ IDEMPOTENCY: Twilio event ${webhookKey} already processed, skipping`);
        res.status(200).send('OK - duplicate');
        return;
      }

      // Trouver la session d'appel par CallSid
      const sessionResult = await twilioCallManager.findSessionByCallSid(body.CallSid);

      if (!sessionResult) {
        console.warn(`Session non trouvée pour CallSid: ${body.CallSid}`);
        prodLogger.warn('TWILIO_WEBHOOK_SESSION_NOT_FOUND', `[${requestId}] Session not found for CallSid`, {
          requestId,
          callSid: body.CallSid?.slice(0, 20) + '...',
          callStatus: body.CallStatus
        });
        res.status(200).send('Session not found');
        return;
      }
      console.log('[twilioCallWebhook] Session Result : ', sessionResult);
      prodLogger.debug('TWILIO_WEBHOOK_SESSION_FOUND', `[${requestId}] Session found`, {
        requestId,
        sessionId: sessionResult.session.id,
        participantType: sessionResult.participantType
      });

      const { session, participantType } = sessionResult;
      const sessionId = session.id;

      // Traiter les différents statuts d'appel
      switch (body.CallStatus) {
        case 'ringing':
          await handleCallRinging(sessionId, participantType, body);
          break;
          
        case 'answered':
        case 'in-progress':
          await handleCallAnswered(sessionId, participantType, body);
          break;
          
        case 'completed':
          await handleCallCompleted(sessionId, participantType, body);
          break;
          
        case 'failed':
        case 'busy':
        case 'no-answer':
          await handleCallFailed(sessionId, participantType, body);
          break;
          
        default:
          console.log(`Statut d'appel non géré: ${body.CallStatus}`);
          prodLogger.debug('TWILIO_WEBHOOK_UNHANDLED_STATUS', `[${requestId}] Unhandled call status: ${body.CallStatus}`, {
            requestId,
            callStatus: body.CallStatus,
            sessionId
          });
      }

      prodLogger.info('TWILIO_WEBHOOK_SUCCESS', `[${requestId}] Webhook processed successfully`, {
        requestId,
        sessionId,
        callStatus: body.CallStatus,
        participantType
      });

      res.status(200).send('OK');

    } catch (error) {
      console.error('❌ Erreur webhook appel:', error);
      prodLogger.error('TWILIO_WEBHOOK_ERROR', `[${requestId}] Webhook processing failed`, {
        requestId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack?.slice(0, 500) : undefined
      });
      await logError('twilioCallWebhook:error', error);
      res.status(500).send('Webhook error');
    }
  }
);

/**
 * Gère le statut "ringing"
 */
async function handleCallRinging(
  sessionId: string,
  participantType: 'provider' | 'client',
  body: TwilioCallWebhookBody
) {
  try {
    console.log(`📞 ${participantType} en cours de sonnerie: ${sessionId}`);
    prodLogger.info('TWILIO_CALL_RINGING', `Call ringing for ${participantType}`, {
      sessionId,
      participantType,
      callSid: body.CallSid?.slice(0, 20) + '...'
    });
    
    await twilioCallManager.updateParticipantStatus(
      sessionId,
      participantType,
      'ringing'
    );

    await logCallRecord({
      callId: sessionId,
      status: `${participantType}_ringing`,
      retryCount: 0,
      additionalData: {
        callSid: body.CallSid,
        timestamp: body.Timestamp
      }
    });

  } catch (error) {
    await logError('handleCallRinging', error);
  }
}

/**
 * Gère le statut "answered"
 * P0 CRITICAL: Cette fonction met le statut à "connected" - waitForConnection() attend ce statut
 */
async function handleCallAnswered(
  sessionId: string,
  participantType: 'provider' | 'client',
  body: TwilioCallWebhookBody
) {
  const webhookId = `answered_${Date.now().toString(36)}`;

  try {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`📞 [${webhookId}] handleCallAnswered START`);
    console.log(`📞 [${webhookId}]   sessionId: ${sessionId}`);
    console.log(`📞 [${webhookId}]   participantType: ${participantType}`);
    console.log(`📞 [${webhookId}]   callSid: ${body.CallSid}`);
    console.log(`📞 [${webhookId}]   callStatus: ${body.CallStatus}`);
    console.log(`📞 [${webhookId}]   answeredBy: ${body.AnsweredBy || 'not_provided'}`);
    console.log(`${'═'.repeat(70)}`);

    // P0 CRITICAL FIX: Validate that this webhook is for the CURRENT call attempt
    // Race condition: Webhook from attempt 1 can arrive during attempt 2
    // If we don't validate, we could update status for the wrong call!
    const sessionForValidation = await twilioCallManager.getCallSession(sessionId);
    const participantForValidation = participantType === 'provider'
      ? sessionForValidation?.participants.provider
      : sessionForValidation?.participants.client;
    const currentCallSid = participantForValidation?.callSid;

    if (currentCallSid && body.CallSid && currentCallSid !== body.CallSid) {
      console.log(`📞 [${webhookId}] ⚠️ STALE WEBHOOK DETECTED!`);
      console.log(`📞 [${webhookId}]   Webhook callSid: ${body.CallSid}`);
      console.log(`📞 [${webhookId}]   Current callSid: ${currentCallSid}`);
      console.log(`📞 [${webhookId}]   This webhook is from an OLD call attempt - IGNORING`);
      console.log(`${'═'.repeat(70)}\n`);
      return; // Ignore stale webhook
    }
    console.log(`📞 [${webhookId}] ✅ CallSid validated - matches current call attempt`);

    // P0 FIX: Vérifier si c'est un répondeur qui a répondu (AMD - Answering Machine Detection)
    // Avec machineDetection: "DetectMessageEnd", AnsweredBy devrait TOUJOURS être défini
    // Valeurs possibles: human, machine_start, machine_end_beep, machine_end_silence, machine_end_other, fax
    const answeredBy = body.AnsweredBy;

    console.log(`📞 [${webhookId}] STEP 1: AMD Detection`);
    console.log(`📞 [${webhookId}]   answeredBy value: "${answeredBy || 'UNDEFINED'}"`);
    console.log(`📞 [${webhookId}]   participantType: ${participantType}`);

    // P0 FIX: RACE CONDITION FIX
    // With asyncAmd="true", the AMD result comes via twilioAmdTwiml callback, NOT here!
    // If answeredBy is undefined, we MUST NOT set status to "connected" yet.
    // The twilioAmdTwiml callback will determine human vs machine and set the correct status.
    // Setting "connected" here would cause waitForConnection() to return true BEFORE
    // we know if it's a human or voicemail, causing the provider to be called incorrectly.

    if (!answeredBy) {
      // asyncAmd="true" means AMD result comes via twilioAmdTwiml, not here
      // DO NOT set status to "connected" - wait for twilioAmdTwiml to decide
      console.log(`📞 [${webhookId}] ⚠️ AnsweredBy is UNDEFINED - asyncAmd mode active`);
      console.log(`📞 [${webhookId}]   AMD detection is handled by twilioAmdTwiml callback`);
      console.log(`📞 [${webhookId}]   ⛔ NOT setting status to "connected" - waiting for AMD callback`);
      console.log(`📞 [${webhookId}]   twilioAmdTwiml will set: "connected" if human, "no_answer" if machine`);
      console.log(`${'═'.repeat(70)}\n`);

      // Set status to "amd_pending" to indicate we're waiting for AMD callback
      // This prevents waitForConnection() from seeing "connected" prematurely
      await twilioCallManager.updateParticipantStatus(
        sessionId,
        participantType,
        'amd_pending'
      );
      console.log(`📞 [${webhookId}] ✅ Status set to "amd_pending" - waiting for AMD callback`);

      await logCallRecord({
        callId: sessionId,
        status: `${participantType}_answered_amd_pending`,
        retryCount: 0,
        additionalData: {
          callSid: body.CallSid,
          answeredBy: 'undefined',
          action: 'waiting_for_amd_callback'
        }
      });

      return; // Return early - let twilioAmdTwiml handle the status update
    }

    // If answeredBy IS provided (rare case without asyncAmd), process it here
    const effectiveAnsweredBy = answeredBy;
    const isMachine = effectiveAnsweredBy.startsWith('machine') || effectiveAnsweredBy === 'fax';
    console.log(`📞 [${webhookId}]   isMachine: ${isMachine}`);

    if (isMachine) {
      console.log(`📞 [${webhookId}] ⚠️ MACHINE DETECTED - Setting status to "no_answer" and hanging up`);
      prodLogger.info('TWILIO_CALL_ANSWERED_MACHINE', `Answering machine detected for ${participantType}`, {
        sessionId,
        participantType,
        answeredBy,
        callSid: body.CallSid?.slice(0, 20) + '...'
      });

      // Raccrocher l'appel immédiatement pour éviter de laisser un message
      try {
        const { getTwilioClient } = await import('../lib/twilio');
        const twilioClient = getTwilioClient();
        await twilioClient.calls(body.CallSid).update({ status: 'completed' });
        console.log(`📞 [${webhookId}] ✅ Call ${body.CallSid} hung up (voicemail)`);
      } catch (hangupError) {
        console.error(`📞 [${webhookId}] ⚠️ Hangup error:`, hangupError);
      }

      // Mettre à jour le statut comme "no_answer" pour permettre les retries
      console.log(`📞 [${webhookId}] Setting participant status to "no_answer"...`);
      await twilioCallManager.updateParticipantStatus(
        sessionId,
        participantType,
        'no_answer'
      );
      console.log(`📞 [${webhookId}] ✅ Status set to "no_answer"`);

      await logCallRecord({
        callId: sessionId,
        status: `${participantType}_answered_by_machine`,
        retryCount: 0,
        additionalData: {
          callSid: body.CallSid,
          answeredBy,
          action: 'hangup_and_retry'
        }
      });

      console.log(`📞 [${webhookId}] END - Machine detected, returning early`);
      console.log(`${'═'.repeat(70)}\n`);
      return; // Ne pas continuer avec le traitement normal
    }

    // HUMAN ANSWERED (only reaches here if answeredBy was explicitly provided)
    console.log(`📞 [${webhookId}] STEP 2: HUMAN ANSWERED - Setting status to "connected"`);
    console.log(`📞 [${webhookId}]   This is the CRITICAL step that allows waitForConnection() to succeed!`);

    prodLogger.info('TWILIO_CALL_ANSWERED', `Call answered by ${participantType}`, {
      sessionId,
      participantType,
      answeredBy,
      callSid: body.CallSid?.slice(0, 20) + '...'
    });

    // Get current status before update for debugging
    const sessionBefore = await twilioCallManager.getCallSession(sessionId);
    const participantBefore = participantType === 'provider'
      ? sessionBefore?.participants.provider
      : sessionBefore?.participants.client;
    console.log(`📞 [${webhookId}]   Status BEFORE update: "${participantBefore?.status}"`);

    await twilioCallManager.updateParticipantStatus(
      sessionId,
      participantType,
      'connected',
      admin.firestore.Timestamp.fromDate(new Date())
    );

    // Verify status was updated
    const sessionAfter = await twilioCallManager.getCallSession(sessionId);
    const participantAfter = participantType === 'provider'
      ? sessionAfter?.participants.provider
      : sessionAfter?.participants.client;
    console.log(`📞 [${webhookId}]   Status AFTER update: "${participantAfter?.status}"`);
    console.log(`📞 [${webhookId}] ✅ Status update complete - waitForConnection() should now see "connected"`);
    console.log(`${'═'.repeat(70)}\n`);

    // ===== NOUVEAU: Mettre le prestataire en statut "busy" quand il répond =====
    if (participantType === 'provider') {
      const currentSession = await twilioCallManager.getCallSession(sessionId);
      if (currentSession?.metadata?.providerId) {
        try {
          await setProviderBusy(
            currentSession.metadata.providerId,
            sessionId,
            'in_call'
          );
          console.log(`📞 [Webhook] Provider ${currentSession.metadata.providerId} marked as BUSY`);
        } catch (busyError) {
          console.error(`⚠️ [Webhook] Failed to set provider busy (non-blocking):`, busyError);
        }
      }
    }

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
      status: `${participantType}_answered`,
      retryCount: 0,
      additionalData: {
        callSid: body.CallSid,
        answeredBy: body.AnsweredBy
      }
    });

  } catch (error) {
    await logError('handleCallAnswered', error);
  }
}

/**
 * Gère le statut "completed"
 */
async function handleCallCompleted(
  sessionId: string,
  participantType: 'provider' | 'client',
  body: TwilioCallWebhookBody
) {
  const completedId = `completed_${Date.now().toString(36)}`;

  try {
    const duration = parseInt(body.CallDuration || '0');

    // Extract Twilio cost from webhook (Price is negative, e.g., "-0.0150")
    const twilioPrice = body.Price ? Math.abs(parseFloat(body.Price)) : null;
    const priceUnit = body.PriceUnit || 'USD';

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`🏁 [${completedId}] handleCallCompleted START`);
    console.log(`🏁 [${completedId}]   sessionId: ${sessionId}`);
    console.log(`🏁 [${completedId}]   participantType: ${participantType}`);
    console.log(`🏁 [${completedId}]   callSid: ${body.CallSid}`);
    console.log(`🏁 [${completedId}]   twilioCallDuration: ${duration}s (individual participant duration)`);
    console.log(`🏁 [${completedId}]   twilioPrice: ${twilioPrice} ${priceUnit}`);
    console.log(`🏁 [${completedId}]   ⚠️ Note: billingDuration will be calculated below from timestamps`);
    console.log(`${'─'.repeat(60)}`);

    prodLogger.info('TWILIO_CALL_COMPLETED', `Call completed for ${participantType}`, {
      sessionId,
      participantType,
      twilioCallDuration: duration,
      twilioPrice,
      priceUnit,
      callSid: body.CallSid?.slice(0, 20) + '...',
      note: 'billingDuration calculated from timestamps below'
    });

    // Store Twilio cost in call_session if available
    if (twilioPrice !== null) {
      try {
        const db = admin.firestore();
        const sessionRef = db.collection('call_sessions').doc(sessionId);
        const sessionDoc = await sessionRef.get();

        if (sessionDoc.exists) {
          const existingCosts = sessionDoc.data()?.costs || {};
          const existingTwilioCost = existingCosts.twilio || 0;

          // Accumulate costs for both participants (client + provider legs)
          const newTwilioCost = existingTwilioCost + twilioPrice;

          // Fixed GCP cost per call (not per participant)
          const gcpCost = 0.0035; // Cloud Functions + Firestore + Tasks

          await sessionRef.update({
            'costs.twilio': Math.round(newTwilioCost * 10000) / 10000,
            'costs.twilioUnit': priceUnit,
            'costs.gcp': gcpCost,
            'costs.total': Math.round((newTwilioCost + gcpCost) * 10000) / 10000,
            'costs.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
            'costs.isReal': true,  // Flag: this is real cost from Twilio, not estimated
          });

          console.log(`🏁 [${completedId}] 💰 Twilio cost stored: ${newTwilioCost} ${priceUnit} (accumulated from ${participantType})`);
        }
      } catch (costError) {
        console.error(`🏁 [${completedId}] ⚠️ Failed to store Twilio cost (non-blocking):`, costError);
        // Don't throw - cost storage failure shouldn't break the call flow
      }
    } else {
      console.log(`🏁 [${completedId}] ⚠️ No Twilio price in webhook (will need manual refresh)`);
    }

    console.log(`🏁 [${completedId}] STEP 1: Setting participant status to "disconnected"...`);
    await twilioCallManager.updateParticipantStatus(
      sessionId,
      participantType,
      'disconnected',
      admin.firestore.Timestamp.fromDate(new Date())
    );
    console.log(`🏁 [${completedId}]   ✅ Status updated`);

    // Récupérer la session pour déterminer le traitement approprié
    console.log(`🏁 [${completedId}] STEP 2: Fetching session to determine next action...`);
    const session = await twilioCallManager.getCallSession(sessionId);
    if (!session) {
      console.warn(`🏁 [${completedId}] ⚠️ Session non trouvée lors de la completion: ${sessionId}`);
      console.log(`${'─'.repeat(60)}\n`);
      return;
    }

    console.log(`🏁 [${completedId}]   session.status: ${session.status}`);
    console.log(`🏁 [${completedId}]   client.status: ${session.participants.client.status}`);
    console.log(`🏁 [${completedId}]   provider.status: ${session.participants.provider.status}`);

    // ===== P0 FIX: Calculer billingDuration (durée depuis que les DEUX sont connectés) =====
    // La durée de facturation commence quand le 2ème participant rejoint, pas quand le 1er décroche
    let billingDuration = 0;
    const clientConnectedAt = session.participants.client.connectedAt?.toDate()?.getTime();
    const providerConnectedAt = session.participants.provider.connectedAt?.toDate()?.getTime();

    if (clientConnectedAt && providerConnectedAt) {
      // bothConnectedAt = quand le 2ème participant a rejoint (le max des deux timestamps)
      const bothConnectedAt = Math.max(clientConnectedAt, providerConnectedAt);

      // endTime = maintenant
      const endTime = Date.now();

      billingDuration = Math.floor((endTime - bothConnectedAt) / 1000);

      console.log(`🏁 [${completedId}] 📊 BILLING DURATION CALCULATION:`);
      console.log(`🏁 [${completedId}]   clientConnectedAt: ${new Date(clientConnectedAt).toISOString()}`);
      console.log(`🏁 [${completedId}]   providerConnectedAt: ${new Date(providerConnectedAt).toISOString()}`);
      console.log(`🏁 [${completedId}]   bothConnectedAt (2nd joined): ${new Date(bothConnectedAt).toISOString()}`);
      console.log(`🏁 [${completedId}]   billingDuration: ${billingDuration}s`);
      console.log(`🏁 [${completedId}]   (vs Twilio CallDuration: ${duration}s - durée individuelle du participant)`);
    } else {
      // Fallback: si on n'a pas les timestamps de connexion, utiliser CallDuration de Twilio
      billingDuration = duration;
      console.log(`🏁 [${completedId}] ⚠️ Missing connection timestamps, using Twilio CallDuration as fallback: ${duration}s`);
      console.log(`🏁 [${completedId}]   clientConnectedAt: ${clientConnectedAt ? 'present' : 'MISSING'}`);
      console.log(`🏁 [${completedId}]   providerConnectedAt: ${providerConnectedAt ? 'present' : 'MISSING'}`);
    }

    // Stocker billingDuration dans la session pour référence
    try {
      const db = admin.firestore();
      await db.collection('call_sessions').doc(sessionId).update({
        'conference.billingDuration': billingDuration,
        'metadata.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (updateError) {
      console.error(`🏁 [${completedId}] ⚠️ Failed to store billingDuration (non-blocking):`, updateError);
    }

    // ===== Utiliser billingDuration (pas CallDuration) pour la décision de capture/remboursement =====
    if (billingDuration >= 120) {
      console.log(`🏁 [${completedId}] STEP 3: billingDuration >= 120s → handleCallCompletion (capture payment)`);
      await twilioCallManager.handleCallCompletion(sessionId, billingDuration);
    } else {
      console.log(`🏁 [${completedId}] STEP 3: billingDuration < 120s → handleEarlyDisconnection (may refund)`);
      await twilioCallManager.handleEarlyDisconnection(sessionId, participantType, billingDuration);
    }
    console.log(`🏁 [${completedId}]   ✅ Post-completion handling done`);

    await logCallRecord({
      callId: sessionId,
      status: `${participantType}_call_completed`,
      retryCount: 0,
      duration: billingDuration,
      additionalData: {
        callSid: body.CallSid,
        twilioCallDuration: duration,
        billingDuration: billingDuration,
        note: 'billingDuration = time since BOTH participants connected'
      }
    });

    console.log(`🏁 [${completedId}] END`);
    console.log(`${'─'.repeat(60)}\n`);

  } catch (error) {
    console.error(`🏁 [${completedId}] ❌ ERROR:`, error);
    await logError('handleCallCompleted', error);
  }
}

/**
 * Gère les échecs d'appel
 */
async function handleCallFailed(
  sessionId: string,
  participantType: 'provider' | 'client',
  body: TwilioCallWebhookBody
) {
  const failedId = `failed_${Date.now().toString(36)}`;

  try {
    console.log(`\n${'▓'.repeat(60)}`);
    console.log(`❌ [${failedId}] handleCallFailed START`);
    console.log(`❌ [${failedId}]   sessionId: ${sessionId}`);
    console.log(`❌ [${failedId}]   participantType: ${participantType}`);
    console.log(`❌ [${failedId}]   callSid: ${body.CallSid}`);
    console.log(`❌ [${failedId}]   CallStatus: ${body.CallStatus}`);
    console.log(`❌ [${failedId}]   AnsweredBy: ${body.AnsweredBy || 'N/A'}`);
    console.log(`${'▓'.repeat(60)}`);

    // P0 CRITICAL FIX: Validate that this webhook is for the CURRENT call attempt
    // Race condition: Webhook from attempt 1 can arrive during attempt 2
    // If we don't validate, we could update status for the wrong call!
    const sessionForValidation = await twilioCallManager.getCallSession(sessionId);
    const participantForValidation = participantType === 'provider'
      ? sessionForValidation?.participants.provider
      : sessionForValidation?.participants.client;
    const currentCallSidForValidation = participantForValidation?.callSid;

    if (currentCallSidForValidation && body.CallSid && currentCallSidForValidation !== body.CallSid) {
      console.log(`❌ [${failedId}] ⚠️ STALE WEBHOOK DETECTED!`);
      console.log(`❌ [${failedId}]   Webhook callSid: ${body.CallSid}`);
      console.log(`❌ [${failedId}]   Current callSid: ${currentCallSidForValidation}`);
      console.log(`❌ [${failedId}]   This webhook is from an OLD call attempt - IGNORING`);
      console.log(`${'▓'.repeat(60)}\n`);
      return; // Ignore stale webhook
    }
    console.log(`❌ [${failedId}] ✅ CallSid validated - matches current call attempt`);

    prodLogger.warn('TWILIO_CALL_FAILED', `Call failed for ${participantType}: ${body.CallStatus}`, {
      sessionId,
      participantType,
      failureReason: body.CallStatus,
      callSid: body.CallSid?.slice(0, 20) + '...'
    });

    const newStatus = body.CallStatus === 'no-answer' ? 'no_answer' : 'disconnected';
    console.log(`❌ [${failedId}] STEP 1: Setting participant status to "${newStatus}"...`);

    await twilioCallManager.updateParticipantStatus(
      sessionId,
      participantType,
      newStatus
    );
    console.log(`❌ [${failedId}]   ✅ Status updated to "${newStatus}"`);

    // 🔴 FONCTIONNALITÉ BONUS: Mise hors ligne automatique du prestataire sur no-answer
    // P2-2 FIX: Improved with idempotency, atomic batch updates, and better logging
    if (participantType === 'provider' && body.CallStatus === 'no-answer') {
      // Fonction async auto-exécutée pour isolation totale
      (async () => {
        try {
          console.log(`[BONUS] No-answer détecté pour prestataire, session: ${sessionId}`);
          prodLogger.info('PROVIDER_OFFLINE_START', `No-answer detected, checking if should set offline`, { sessionId });

          const db = admin.firestore();
          const session = await twilioCallManager.getCallSession(sessionId);

          if (!session) {
            console.log(`[BONUS] Session non trouvée: ${sessionId}`);
            return;
          }

          // 🛡️ PROTECTION CRITIQUE: Vérifier que c'est la DERNIÈRE tentative
          // Ne pas mettre offline si Twilio va encore réessayer
          if (session.status !== 'failed' && session.status !== 'cancelled') {
            console.log(`[BONUS] Session status: ${session.status} - Twilio va réessayer, on ne déconnecte pas encore`);
            return;
          }

          // P2-2 FIX: Idempotency check - prevent double offline processing
          if (session.metadata?.providerSetOffline) {
            console.log(`[BONUS] Provider already set offline for session: ${sessionId}`);
            return;
          }

          console.log(`[BONUS] Session définitivement échouée (status: ${session.status}), on peut mettre offline`);

          const providerId = session.metadata?.providerId;

          if (!providerId) {
            console.log(`[BONUS] ProviderId non trouvé dans session: ${sessionId}`);
            return;
          }

          // Vérifier que le prestataire est bien en ligne avant de le déconnecter
          const providerDoc = await db.collection('sos_profiles').doc(providerId).get();
          const providerData = providerDoc.data();

          if (!providerData?.isOnline) {
            console.log(`[BONUS] Prestataire ${providerId} déjà hors ligne, rien à faire`);
            return;
          }

          console.log(`[BONUS] Mise hors ligne du prestataire: ${providerId}`);
          prodLogger.info('PROVIDER_OFFLINE_PROCESSING', `Setting provider offline after no-answer`, { sessionId, providerId });

          // P2-2 FIX: Use batch for atomic updates across collections
          const batch = db.batch();

          // Update sos_profiles
          batch.update(db.collection('sos_profiles').doc(providerId), {
            isOnline: false,
            availability: 'offline',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Update users
          batch.update(db.collection('users').doc(providerId), {
            isOnline: false,
            availability: 'offline',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Mark session as processed (idempotency)
          batch.update(db.collection('call_sessions').doc(sessionId), {
            'metadata.providerSetOffline': true,
            'metadata.providerSetOfflineAt': admin.firestore.FieldValue.serverTimestamp(),
          });

          // Commit all updates atomically
          await batch.commit();
          
          // Récupérer la langue préférée pour la notification
          const preferredLanguage = providerData?.preferredLanguage || 'fr';
          
          // Messages multilingues
          const notificationMessages: Record<string, { title: string; message: string }> = {
            fr: {
              title: 'Vous avez été déconnecté',
              message: 'Vous avez été automatiquement déconnecté car vous n\'avez pas répondu à un appel après plusieurs tentatives. Vous pouvez vous reconnecter quand vous êtes disponible.'
            },
            en: {
              title: 'You have been disconnected',
              message: 'You have been automatically disconnected because you did not answer a call after multiple attempts. You can reconnect when you are available.'
            },
            es: {
              title: 'Has sido desconectado',
              message: 'Has sido desconectado automáticamente porque no respondiste a una llamada después de varios intentos. Puedes reconectarte cuando estés disponible.'
            },
            de: {
              title: 'Sie wurden getrennt',
              message: 'Sie wurden automatisch getrennt, weil Sie einen Anruf nach mehreren Versuchen nicht beantwortet haben. Sie können sich wieder verbinden, wenn Sie verfügbar sind.'
            },
            ru: {
              title: 'Вы были отключены',
              message: 'Вы были автоматически отключены, потому что не ответили на звонок после нескольких попыток. Вы можете подключиться снова, когда будете доступны.'
            },
            hi: {
              title: 'आपको डिस्कनेक्ट कर दिया गया है',
              message: 'कई प्रयासों के बाद कॉल का जवाब न देने के कारण आपको स्वचालित रूप से डिस्कनेक्ट कर दिया गया है। जब आप उपलब्ध हों तो आप फिर से कनेक्ट कर सकते हैं।'
            },
            pt: {
              title: 'Você foi desconectado',
              message: 'Você foi automaticamente desconectado porque não atendeu a uma chamada após várias tentativas. Você pode reconectar quando estiver disponível.'
            },
            ar: {
              title: 'تم قطع الاتصال بك',
              message: 'تم قطع الاتصال بك تلقائيًا لأنك لم ترد على مكالمة بعد عدة محاولات. يمكنك إعادة الاتصال عندما تكون متاحًا.'
            },
            ch: {
              title: '您已断开连接',
              message: '由于您在多次尝试后未接听电话，您已被自动断开连接。当您有空时可以重新连接。'
            }
          };
          
          const notification = notificationMessages[preferredLanguage] || notificationMessages.fr;
          
          // Créer la notification
          await db.collection('notifications').add({
            userId: providerId,
            type: 'provider_no_answer',
            title: notification.title,
            message: notification.message,
            isRead: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          
          console.log(`✅ [BONUS] Prestataire ${providerId} mis hors ligne avec succès après échec définitif`);
          prodLogger.info('PROVIDER_OFFLINE_SUCCESS', `Provider set offline successfully`, { sessionId, providerId });

        } catch (bonusError) {
          // Erreur isolée - n'affecte PAS le flux principal
          console.error('⚠️ [BONUS] Erreur mise hors ligne prestataire (fonctionnalité bonus):', bonusError);
          prodLogger.error('PROVIDER_OFFLINE_ERROR', `Failed to set provider offline`, {
            sessionId,
            error: bonusError instanceof Error ? bonusError.message : String(bonusError)
          });
          // On ne throw PAS l'erreur - le flux principal continue normalement
        }
      })(); // Fonction async auto-exécutée et isolée
    }

    // Déterminer la raison de l'échec pour le traitement approprié
    let failureReason = 'system_error';
    if (body.CallStatus === 'no-answer') {
      failureReason = `${participantType}_no_answer`;
    } else if (body.CallStatus === 'busy') {
      failureReason = `${participantType}_busy`;
    } else if (body.CallStatus === 'failed') {
      failureReason = `${participantType}_failed`;
    }

    // P1-2 FIX: NE PAS appeler handleCallFailure ici !
    // TwilioCallManager a sa propre logique de retry interne (3 tentatives via callParticipantWithRetries).
    // Appeler handleCallFailure depuis ce webhook interfère avec les retries internes
    // et peut déclencher un remboursement prématuré avant que les 3 tentatives soient épuisées.
    // handleCallFailure sera appelé par TwilioCallManager.executeCallSequence après tous les retries.
    console.log(`📞 [twilioWebhooks] Call failed for ${participantType}, reason: ${failureReason} - NOT calling handleCallFailure (handled by TwilioCallManager retry logic)`);
    // REMOVED: await twilioCallManager.handleCallFailure(sessionId, failureReason);

    await logCallRecord({
      callId: sessionId,
      status: `${participantType}_call_failed`,
      retryCount: 0,
      errorMessage: `Call failed: ${body.CallStatus}`,
      additionalData: {
        callSid: body.CallSid,
        failureReason: body.CallStatus
      }
    });

  } catch (error) {
    await logError('handleCallFailed', error);
  }
}

// P0-1 FIX: Suppression du double export twilioConferenceWebhook
// Ce webhook est défini et exporté directement depuis ./TwilioConferenceWebhook.ts
// L'ancienne redirection ici causait de la confusion et un double déploiement.
// IMPORTANT: L'export se fait maintenant via index.ts -> TwilioConferenceWebhook.ts

/**
 * Webhook pour les événements d'enregistrement
 * DESACTIVE - L'enregistrement des appels est desactive pour conformite RGPD (commit 12a83a9)
 * Cette fonction reste deployee pour eviter les erreurs 404 si Twilio envoie des callbacks
 */
export const twilioRecordingWebhook = onRequest(
  {
    region: 'europe-west1',
    memory: '128MiB',
    cpu: 0.083,
    maxInstances: 1,
    minInstances: 0,
    concurrency: 1
  },
  async (_req: Request, res: Response) => {
    // Recording desactive - retourner 200 OK pour eviter les retries Twilio
    console.log('[twilioRecordingWebhook] Recording desactive - ignoring callback');
    res.status(200).send('Recording disabled for GDPR compliance');
  }
);

/**
 * P0 FIX: TwiML endpoint that checks AMD BEFORE returning TwiML
 *
 * This is called by Twilio AFTER the call is answered (and AMD analysis is complete).
 * By using this URL instead of inline TwiML, we can:
 * - Check if AnsweredBy indicates a machine → return hangup TwiML (no message played!)
 * - Check if AnsweredBy indicates a human → return conference TwiML with welcome message
 *
 * This prevents voicemail systems from recording our "vous allez être mis en relation" message.
 */
export const twilioAmdTwiml = onRequest(
  {
    region: 'europe-west1',
    memory: '256MiB',  // P0 FIX: 128MiB was too low (firebase-admin requires ~150MB)
    cpu: 0.25,
    maxInstances: 10,
    minInstances: 0,
    concurrency: 1
  },
  async (req: Request, res: Response) => {
    const amdId = `amd_${Date.now().toString(36)}`;

    try {
      // Parse query parameters
      const sessionId = req.query.sessionId as string;
      const participantType = req.query.participantType as 'client' | 'provider';
      const conferenceName = req.query.conferenceName as string;
      const timeLimit = parseInt(req.query.timeLimit as string) || 1200;
      const ttsLocale = req.query.ttsLocale as string || 'fr-FR';
      const langKey = req.query.langKey as string || 'fr';

      // Get AMD result from Twilio callback
      const answeredBy = req.body?.AnsweredBy || req.query.AnsweredBy;
      const callSid = req.body?.CallSid || req.query.CallSid;

      console.log(`\n${'▓'.repeat(60)}`);
      console.log(`🎯 [${amdId}] twilioAmdTwiml START`);
      console.log(`🎯 [${amdId}]   sessionId: ${sessionId}`);
      console.log(`🎯 [${amdId}]   participantType: ${participantType}`);
      console.log(`🎯 [${amdId}]   conferenceName: ${conferenceName}`);
      console.log(`🎯 [${amdId}]   timeLimit: ${timeLimit}`);
      console.log(`🎯 [${amdId}]   ttsLocale: ${ttsLocale}`);
      console.log(`🎯 [${amdId}]   langKey: ${langKey}`);
      console.log(`🎯 [${amdId}]   answeredBy: ${answeredBy || 'NOT_PROVIDED'}`);
      console.log(`🎯 [${amdId}]   callSid: ${callSid || 'NOT_PROVIDED'}`);
      console.log(`${'▓'.repeat(60)}`);

      // P0 CRITICAL FIX: Validate that this callback is for the CURRENT call attempt
      // Race condition: AMD callback from attempt 1 can arrive during attempt 2
      // If we don't validate, we could update status for the wrong call!
      if (sessionId && callSid) {
        const session = await twilioCallManager.getCallSession(sessionId);
        const currentParticipant = participantType === 'provider'
          ? session?.participants.provider
          : session?.participants.client;
        const currentCallSid = currentParticipant?.callSid;

        if (currentCallSid && currentCallSid !== callSid) {
          console.log(`🎯 [${amdId}] ⚠️ STALE AMD CALLBACK DETECTED!`);
          console.log(`🎯 [${amdId}]   Callback callSid: ${callSid}`);
          console.log(`🎯 [${amdId}]   Current callSid: ${currentCallSid}`);
          console.log(`🎯 [${amdId}]   This callback is from an OLD call attempt - IGNORING`);
          console.log(`🎯 [${amdId}]   Returning HANGUP to prevent interference with new call`);
          console.log(`${'▓'.repeat(60)}\n`);

          // Return hangup TwiML for the old call - don't update any status
          const staleHangupTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Hangup/>
</Response>`;
          res.type('text/xml');
          res.send(staleHangupTwiml);
          return;
        }
        console.log(`🎯 [${amdId}] ✅ CallSid validated - matches current call attempt`);
      }

      // Check if answered by machine
      const isMachine = answeredBy && (
        answeredBy.startsWith('machine') ||
        answeredBy === 'fax'
      );

      // P0 FIX: With asyncAmd="true", the first callback via `url` does NOT have AnsweredBy yet
      // AnsweredBy only arrives via asyncAmdStatusCallback AFTER AMD analysis completes
      // So we should ONLY hangup if we have CONFIRMED it's a machine, not if AnsweredBy is undefined
      // If AnsweredBy is undefined, proceed to conference - the AMD callback will correct if needed
      const shouldHangup = isMachine;

      if (shouldHangup) {
        // MACHINE CONFIRMED → Hangup immediately with NO audio (prevents voicemail recording)
        console.log(`🎯 [${amdId}] ⚠️ MACHINE CONFIRMED - Returning HANGUP TwiML (NO AUDIO!)`);
        console.log(`🎯 [${amdId}]   answeredBy: ${answeredBy || 'UNDEFINED'}`);
        console.log(`🎯 [${amdId}]   participantType: ${participantType}`);
        console.log(`🎯 [${amdId}]   This prevents voicemail from recording our message!`);

        // Update participant status to no_answer for retry logic
        if (sessionId) {
          try {
            await twilioCallManager.updateParticipantStatus(sessionId, participantType, 'no_answer');
            console.log(`🎯 [${amdId}]   ✅ Status set to no_answer - retry will be triggered`);
          } catch (statusError) {
            console.error(`🎯 [${amdId}]   ⚠️ Failed to update status:`, statusError);
          }
        }

        // Return hangup TwiML - NO SAY, NO AUDIO, JUST HANGUP
        const hangupTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Hangup/>
</Response>`;

        res.type('text/xml');
        res.send(hangupTwiml);
        console.log(`🎯 [${amdId}] END - Sent HANGUP TwiML\n`);
        return;
      }

      // P0 FIX: Check if answeredBy is provided (human confirmed) or undefined (AMD pending)
      // With asyncAmd="true", the first callback via `url` does NOT have AnsweredBy yet
      // We should ONLY set status to "connected" if we have CONFIRMED it's a human
      // If answeredBy is undefined, keep status as "amd_pending" and wait for AMD callback

      const isHumanConfirmed = answeredBy === 'human';

      if (isHumanConfirmed) {
        // HUMAN CONFIRMED → Return conference TwiML with welcome message
        console.log(`🎯 [${amdId}] ✅ HUMAN CONFIRMED - Returning CONFERENCE TwiML`);

        // Update participant status to connected ONLY when human is confirmed
        if (sessionId) {
          try {
            await twilioCallManager.updateParticipantStatus(
              sessionId,
              participantType,
              'connected',
              admin.firestore.Timestamp.fromDate(new Date())
            );
            console.log(`🎯 [${amdId}]   ✅ Status set to connected (human confirmed)`);
          } catch (statusError) {
            console.error(`🎯 [${amdId}]   ⚠️ Failed to update status:`, statusError);
          }
        }
      } else {
        // answeredBy is undefined or unknown - AMD is still pending
        // DO NOT set status to "connected" yet - wait for AMD callback
        // P0 FIX: Also do NOT play the welcome message yet - it would be recorded by voicemail!
        console.log(`🎯 [${amdId}] ⏳ AMD PENDING - Returning SILENT CONFERENCE TwiML (no message!)`);
        console.log(`🎯 [${amdId}]   answeredBy: "${answeredBy || 'UNDEFINED'}"`);
        console.log(`🎯 [${amdId}]   Status remains "amd_pending" - waiting for asyncAmdStatusCallback`);
        console.log(`🎯 [${amdId}]   NOT playing welcome message to avoid voicemail recording!`);

        // Set status to amd_pending if not already set
        if (sessionId) {
          try {
            const session = await twilioCallManager.getCallSession(sessionId);
            const currentParticipant = participantType === 'provider'
              ? session?.participants.provider
              : session?.participants.client;

            // Only update to amd_pending if not already in a terminal state
            if (currentParticipant?.status !== 'connected' &&
                currentParticipant?.status !== 'disconnected' &&
                currentParticipant?.status !== 'no_answer') {
              await twilioCallManager.updateParticipantStatus(
                sessionId,
                participantType,
                'amd_pending'
              );
              console.log(`🎯 [${amdId}]   ✅ Status set to amd_pending`);
            } else {
              console.log(`🎯 [${amdId}]   Status already ${currentParticipant?.status}, not updating`);
            }
          } catch (statusError) {
            console.error(`🎯 [${amdId}]   ⚠️ Failed to update status:`, statusError);
          }
        }

        // P0 FIX: Return SILENT conference TwiML - NO welcome message!
        // This prevents voicemail from recording our message.
        // The participant will just hear the hold music while AMD analyzes.
        // Once AMD confirms human, the asyncAmdStatusCallback will be called
        // and handleParticipantJoin will set status to "connected".
        const startConference = participantType === 'client';
        const { getTwilioConferenceWebhookUrl } = await import('../utils/urlBase');
        const conferenceWebhookUrl = getTwilioConferenceWebhookUrl();

        const silentConferenceTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="60" timeLimit="${timeLimit}">
    <Conference
      waitUrl="http://twimlets.com/holdmusic?Bucket=com.twilio.music.classical"
      startConferenceOnEnter="${startConference}"
      endConferenceOnExit="true"
      statusCallback="${conferenceWebhookUrl}"
      statusCallbackEvent="start end join leave"
      statusCallbackMethod="POST"
    >${conferenceName}</Conference>
  </Dial>
</Response>`;

        res.type('text/xml');
        res.send(silentConferenceTwiml);
        console.log(`🎯 [${amdId}] END - Sent SILENT CONFERENCE TwiML (AMD pending)\n`);
        return;
      }

      // HUMAN CONFIRMED - Get welcome message and play it
      const welcomeMessage = getIntroText(participantType, langKey);
      console.log(`🎯 [${amdId}]   welcomeMessage: "${welcomeMessage.substring(0, 50)}..."`)

      // Generate conference TwiML with welcome message (only for confirmed human)
      // Client starts conference (startConferenceOnEnter=true)
      // Provider joins existing conference (startConferenceOnEnter=false)
      const startConference = participantType === 'client';
      const { getTwilioConferenceWebhookUrl } = await import('../utils/urlBase');
      const conferenceWebhookUrl = getTwilioConferenceWebhookUrl();

      const conferenceTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="${ttsLocale}">${welcomeMessage}</Say>
  <Dial timeout="60" timeLimit="${timeLimit}">
    <Conference
      waitUrl="http://twimlets.com/holdmusic?Bucket=com.twilio.music.classical"
      startConferenceOnEnter="${startConference}"
      endConferenceOnExit="true"
      statusCallback="${conferenceWebhookUrl}"
      statusCallbackEvent="start end join leave"
      statusCallbackMethod="POST"
    >${conferenceName}</Conference>
  </Dial>
</Response>`;

      res.type('text/xml');
      res.send(conferenceTwiml);
      console.log(`🎯 [${amdId}] END - Sent CONFERENCE TwiML with welcome message (human confirmed)\n`);

    } catch (error) {
      console.error(`🎯 [${amdId}] ❌ ERROR:`, error);
      await logError('twilioAmdTwiml', error);

      // On error, return hangup to prevent any audio playing
      const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Hangup/>
</Response>`;
      res.type('text/xml');
      res.send(errorTwiml);
    }
  }
);

/**
 * Fonction utilitaire pour recherche de session (compatible avec l'ancien système)
 */
export const findCallSessionByCallSid = async (callSid: string) => {
  try {
    const result = await twilioCallManager.findSessionByCallSid(callSid);
    if (result) {
      return {
        doc: {
          id: result.session.id,
          data: () => result.session
        },
        type: result.participantType
      };
    }
    return null;
  } catch (error) {
    console.error('Error finding call session:', error);
    return null;
  }
};