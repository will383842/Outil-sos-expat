import { onRequest } from 'firebase-functions/v2/https';
import { twilioCallManager } from '../TwilioCallManager';
import { logCallRecord } from '../utils/logs/logCallRecord';
import { logError } from '../utils/logs/logError';
import { logger as prodLogger } from '../utils/productionLogger';
import { logWebhookTest } from '../utils/productionTestLogger';
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

// P0 FIX 2026-01-16: GATHER confirmation removed for NEW calls, but these functions
// are still needed for twilioGatherResponse webhook (for backwards compatibility)
// Helper function to get confirmation prompt for provider (used by twilioGatherResponse)
export function getConfirmationText(langKey: string): string {
  const prompts = voicePromptsJson as Record<string, Record<string, string>>;
  const table = prompts.provider_confirmation;
  return table?.[langKey] ?? table?.en ?? "Press 1 or say YES to confirm your availability.";
}

// Helper function to get no response message for provider
function getNoResponseText(langKey: string): string {
  const prompts = voicePromptsJson as Record<string, Record<string, string>>;
  const table = prompts.provider_no_response;
  return table?.[langKey] ?? table?.en ?? "We did not receive a confirmation. The call will be ended.";
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
    maxInstances: 10,  // P1 FIX: Increased from 3 for better scalability
    minInstances: 0,
    concurrency: 1,    // Keep at 1 to avoid race conditions with Firestore updates
    // P0 CRITICAL FIX: Add Twilio secrets for signature validation + hangup calls to voicemail
    secrets: [TWILIO_AUTH_TOKEN_SECRET, TWILIO_ACCOUNT_SID_SECRET]
  },
  async (req: Request, res: Response) => {
    const requestId = `twilio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    try {
      console.log(`\n${'🔔'.repeat(40)}`);
      console.log(`[twilioCallWebhook] === Twilio Webhook Execution Started ===`);
      console.log(`[twilioCallWebhook] requestId: ${requestId}`);
      console.log(`[twilioCallWebhook] timestamp: ${new Date().toISOString()}`);
      console.log(`${'🔔'.repeat(40)}`);
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

      // ===== PRODUCTION TEST LOG =====
      logWebhookTest.twilio.incoming(body as any);

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

      // ===== PRODUCTION TEST LOG =====
      logWebhookTest.twilio.success(body.CallStatus, body.CallSid, {
        sessionId,
        participantType,
        duration: body.CallDuration,
      });

      res.status(200).send('OK');

    } catch (error) {
      const errorDetails = {
        requestId,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorStack: error instanceof Error ? error.stack?.split('\n').slice(0, 5).join(' | ') : 'N/A',
        twilioCode: (error as any)?.code || 'N/A',
        twilioStatus: (error as any)?.status || 'N/A',
        requestBody: JSON.stringify(req.body || {}).slice(0, 500),
        timestamp: new Date().toISOString(),
      };

      console.error(`\n${'❌'.repeat(40)}`);
      console.error(`❌ [twilioCallWebhook] WEBHOOK ERROR:`, errorDetails);
      console.error(`${'❌'.repeat(40)}\n`);

      prodLogger.error('TWILIO_WEBHOOK_ERROR', `[${requestId}] Webhook processing failed`, errorDetails);

      // ===== PRODUCTION TEST LOG =====
      logWebhookTest.twilio.error(req.body?.CallStatus || 'unknown', error as Error, errorDetails);

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

    // P2 FIX: Validate that this webhook is for the CURRENT call attempt (consistency with other handlers)
    // Race condition: Ringing webhook from attempt 1 can arrive during attempt 2
    const sessionForValidation = await twilioCallManager.getCallSession(sessionId);
    const participantForValidation = participantType === 'provider'
      ? sessionForValidation?.participants.provider
      : sessionForValidation?.participants.client;
    const currentCallSid = participantForValidation?.callSid;

    if (currentCallSid && body.CallSid && currentCallSid !== body.CallSid) {
      console.log(`📞 [ringing] ⚠️ STALE WEBHOOK DETECTED!`);
      console.log(`📞 [ringing]   Webhook callSid: ${body.CallSid}`);
      console.log(`📞 [ringing]   Current callSid: ${currentCallSid}`);
      console.log(`📞 [ringing]   This webhook is from an OLD call attempt - IGNORING`);
      return; // Ignore stale webhook
    }

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

    // P0 CRITICAL FIX: Validate that this webhook is for the CURRENT call attempt
    // Race condition: Webhook from attempt 1 can arrive AFTER attempt 2 has started/completed
    // If we don't validate, we could:
    // 1. Mark the current connected participant as "disconnected"
    // 2. Trigger handleEarlyDisconnection with duration=0
    // 3. Incorrectly call handleCallFailure and terminate the whole session!
    // This is THE BUG causing calls to disconnect when the provider answers.
    const sessionForValidation = await twilioCallManager.getCallSession(sessionId);
    const participantForValidation = participantType === 'provider'
      ? sessionForValidation?.participants.provider
      : sessionForValidation?.participants.client;
    const currentCallSid = participantForValidation?.callSid;

    if (currentCallSid && body.CallSid && currentCallSid !== body.CallSid) {
      console.log(`🏁 [${completedId}] ⚠️ STALE WEBHOOK DETECTED!`);
      console.log(`🏁 [${completedId}]   Webhook callSid: ${body.CallSid}`);
      console.log(`🏁 [${completedId}]   Current callSid: ${currentCallSid}`);
      console.log(`🏁 [${completedId}]   This webhook is from an OLD call attempt - IGNORING`);
      console.log(`${'─'.repeat(60)}\n`);
      return; // Ignore stale webhook - DO NOT process this!
    }
    console.log(`🏁 [${completedId}] ✅ CallSid validated - matches current call attempt`);

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
      // P0 FIX LOG 2026-01-15: Log participant retry state BEFORE calling handleEarlyDisconnection
      const participant = participantType === 'provider' ? session.participants.provider : session.participants.client;
      console.log(`🏁 [${completedId}] 📊 RETRY STATE before handleEarlyDisconnection:`);
      console.log(`🏁 [${completedId}]   ${participantType}.attemptCount: ${participant?.attemptCount || 0}`);
      console.log(`🏁 [${completedId}]   ${participantType}.status: ${participant?.status}`);
      console.log(`🏁 [${completedId}]   session.status: ${session.status}`);
      console.log(`🏁 [${completedId}]   MAX_RETRIES: 3 (if attemptCount < 3, retries should continue)`);
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

    // === LOGS POUR DEBUG RACCROCHAGE ===
    console.log(`\n${'🏁'.repeat(30)}`);
    console.log(`🏁 [${completedId}] === HANGUP SUMMARY ===`);
    console.log(`🏁 [${completedId}]   sessionId: ${sessionId}`);
    console.log(`🏁 [${completedId}]   participant who hung up: ${participantType}`);
    console.log(`🏁 [${completedId}]   billingDuration: ${billingDuration}s`);
    console.log(`🏁 [${completedId}]   threshold (MIN_CALL_DURATION): 120s`);
    console.log(`🏁 [${completedId}]   action taken: ${billingDuration >= 120 ? 'handleCallCompletion (CAPTURE)' : 'handleEarlyDisconnection (MAY REFUND)'}`);

    // Fetch final state for debug
    const finalSession = await twilioCallManager.getCallSession(sessionId);
    if (finalSession) {
      console.log(`🏁 [${completedId}]   FINAL STATE:`);
      console.log(`🏁 [${completedId}]     session.status: ${finalSession.status}`);
      console.log(`🏁 [${completedId}]     payment.status: ${finalSession.payment?.status}`);
      console.log(`🏁 [${completedId}]     client.status: ${finalSession.participants.client.status}`);
      console.log(`🏁 [${completedId}]     provider.status: ${finalSession.participants.provider.status}`);
      console.log(`🏁 [${completedId}]     client.callSid: ${finalSession.participants.client.callSid || 'none'}`);
      console.log(`🏁 [${completedId}]     provider.callSid: ${finalSession.participants.provider.callSid || 'none'}`);
    }
    console.log(`${'🏁'.repeat(30)}\n`);

    console.log(`🏁 [${completedId}] END`);
    console.log(`${'─'.repeat(60)}\n`);

  } catch (error) {
    console.error(`\n${'❌'.repeat(40)}`);
    console.error(`🏁 [${completedId}] ❌ HANDLECALLCOMPLETED EXCEPTION:`, {
      sessionId,
      participantType,
      callSid: body.CallSid,
      callStatus: body.CallStatus,
      callDuration: body.CallDuration,
      price: body.Price,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : 'Unknown',
      errorStack: error instanceof Error ? error.stack?.split('\n').slice(0, 5).join(' | ') : 'N/A',
      timestamp: new Date().toISOString(),
    });
    console.error(`${'❌'.repeat(40)}\n`);
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
    console.error(`\n${'❌'.repeat(40)}`);
    console.error(`❌ [handleCallFailed] EXCEPTION:`, {
      sessionId,
      participantType,
      callSid: body.CallSid,
      callStatus: body.CallStatus,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : 'Unknown',
      errorStack: error instanceof Error ? error.stack?.split('\n').slice(0, 5).join(' | ') : 'N/A',
      timestamp: new Date().toISOString(),
    });
    console.error(`${'❌'.repeat(40)}\n`);
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
      console.log(`🎯 [${amdId}] ████████ twilioAmdTwiml START ████████`);
      console.log(`🎯 [${amdId}]   sessionId: ${sessionId}`);
      console.log(`🎯 [${amdId}]   participantType: ${participantType}`);
      console.log(`🎯 [${amdId}]   conferenceName: ${conferenceName}`);
      console.log(`🎯 [${amdId}]   timeLimit: ${timeLimit}`);
      console.log(`🎯 [${amdId}]   ttsLocale: ${ttsLocale}`);
      console.log(`🎯 [${amdId}]   langKey: ${langKey}`);
      console.log(`🎯 [${amdId}]   answeredBy: ${answeredBy || 'NOT_PROVIDED (AMD pending)'}`);
      console.log(`🎯 [${amdId}]   callSid: ${callSid || 'NOT_PROVIDED'}`);
      console.log(`🎯 [${amdId}]   timestamp: ${new Date().toISOString()}`);
      console.log(`${'▓'.repeat(60)}`);

      // P0 DIAGNOSTIC LOG: Dump all request data for debugging
      console.log(`🎯 [${amdId}] 📋 FULL REQUEST DATA:`);
      console.log(`🎯 [${amdId}]   req.method: ${req.method}`);
      console.log(`🎯 [${amdId}]   req.query: ${JSON.stringify(req.query)}`);
      console.log(`🎯 [${amdId}]   req.body: ${JSON.stringify(req.body || {})}`);
      console.log(`🎯 [${amdId}]   All AnsweredBy values: body=${req.body?.AnsweredBy}, query=${req.query.AnsweredBy}`);

      // ===== PRODUCTION TEST LOG =====
      logWebhookTest.twilio.amd({ sessionId, participantType, answeredBy, callSid });

      // P0 CRITICAL FIX: Stale callback check - but ONLY for asyncAmdStatusCallback (when answeredBy is defined)
      //
      // RACE CONDITION BUG FIXED:
      // - The initial `url` callback fires IMMEDIATELY when the call is answered
      // - At this point, updateParticipantCallSid() may NOT have run yet
      // - The session still has the OLD callSid from the previous attempt
      // - If we do the stale check here, it will ALWAYS fail on retry attempts!
      // - This causes the call to be hung up immediately → "rings once and hangs up"
      //
      // Solution: Only do stale check for asyncAmdStatusCallback (answeredBy is defined)
      // - Initial `url` callback: answeredBy is UNDEFINED → SKIP stale check
      // - asyncAmdStatusCallback: answeredBy is DEFINED → DO stale check
      //
      // This is safe because:
      // - For `url` callback: This is always for the CURRENT call (synchronous)
      // - For asyncAmdStatusCallback: This can be delayed from an OLD call (needs check)

      if (sessionId && callSid && answeredBy) {
        // Only check for stale callbacks when answeredBy is provided (asyncAmdStatusCallback)
        const session = await twilioCallManager.getCallSession(sessionId);
        const currentParticipant = participantType === 'provider'
          ? session?.participants.provider
          : session?.participants.client;
        const currentCallSid = currentParticipant?.callSid;

        if (currentCallSid && currentCallSid !== callSid) {
          console.log(`🎯 [${amdId}] ⚠️ STALE AMD CALLBACK DETECTED! (asyncAmdStatusCallback)`);
          console.log(`🎯 [${amdId}]   Callback callSid: ${callSid}`);
          console.log(`🎯 [${amdId}]   Current callSid: ${currentCallSid}`);
          console.log(`🎯 [${amdId}]   answeredBy: ${answeredBy}`);
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
      } else if (sessionId && callSid && !answeredBy) {
        // Initial `url` callback - SKIP stale check (updateParticipantCallSid may not have run yet)
        console.log(`🎯 [${amdId}] ⏭️ Skipping stale check for initial url callback (answeredBy undefined)`);
        console.log(`🎯 [${amdId}]   This is the initial TwiML request - session may not be updated yet`);
      }

      // Check if answered by machine - UNIFIED DETECTION (P0 FIX 2026-01-17 v3)
      //
      // AMD returns different values with different meanings:
      // - machine_start → AMD detected machine BEFORE beep/greeting ended
      //                   HIGH FALSE POSITIVE RATE - humans saying "Allô?" are detected as machine
      //                   → TREAT AS HUMAN
      // - machine_end_beep → AMD detected machine AND heard the beep
      //                      → ACTUAL VOICEMAIL - hang up and retry
      // - machine_end_silence → AMD detected machine, greeting ended with silence
      //                         → ACTUAL VOICEMAIL - hang up and retry
      // - machine_end_other → AMD detected machine, greeting ended other way
      //                       → ACTUAL VOICEMAIL - hang up and retry
      // - fax → Fax machine → hang up
      //
      const isMachineStart = answeredBy === 'machine_start';
      const isMachineEnd = answeredBy && (
        answeredBy === 'machine_end_beep' ||
        answeredBy === 'machine_end_silence' ||
        answeredBy === 'machine_end_other' ||
        answeredBy === 'fax'
      );
      // Note: isMachine = isMachineStart || isMachineEnd (not used directly, but logic above)

      // ██████████████████████████████████████████████████████████████████████
      // P0 DIAGNOSTIC: AMD DECISION LOGIC - DETAILED TRACE
      // ██████████████████████████████████████████████████████████████████████
      console.log(`\n🎯 [${amdId}] ┌────────────────────────────────────────────────────────────┐`);
      console.log(`🎯 [${amdId}] │ 🧠 AMD DECISION LOGIC TRACE (P0 FIX 2026-01-17 v3)         │`);
      console.log(`🎯 [${amdId}] ├────────────────────────────────────────────────────────────┤`);
      console.log(`🎯 [${amdId}] │ INPUT:                                                     │`);
      console.log(`🎯 [${amdId}] │   answeredBy: "${answeredBy || 'undefined'}"`);
      console.log(`🎯 [${amdId}] │   participantType: "${participantType}"`);
      console.log(`🎯 [${amdId}] │   isMachineStart: ${isMachineStart} (v3: treated as MACHINE)`);
      console.log(`🎯 [${amdId}] │   isMachineEnd: ${isMachineEnd} (v3: treated as MACHINE)`);
      console.log(`🎯 [${amdId}] └────────────────────────────────────────────────────────────┘`);

      // ══════════════════════════════════════════════════════════════════════
      // P0 CRITICAL FIX 2026-01-17 v3: UNIFIED MACHINE DETECTION
      // ══════════════════════════════════════════════════════════════════════
      //
      // PREVIOUS PROBLEM (v2):
      //   machine_start was treated as human due to high false positive rate.
      //   But this caused CLIENT's voicemail to be treated as "connected",
      //   then PROVIDER was incorrectly called while client wasn't actually there.
      //
      // NEW SOLUTION (v3):
      //   Treat ALL machine detections uniformly → HANG UP + RETRY (up to 3x)
      //
      // BEHAVIOR (v3 unified - same for CLIENT and PROVIDER):
      //   ┌─────────────────┬───────────────────────────────────────────────┐
      //   │ answeredBy      │ Action                                        │
      //   ├─────────────────┼───────────────────────────────────────────────┤
      //   │ machine_start   │ HANG UP + RETRY (early detection)             │
      //   │ machine_end_*   │ HANG UP + RETRY (confirmed voicemail)         │
      //   │ human           │ CONNECT to conference                         │
      //   │ unknown         │ CONNECT to conference (AMD timeout, assume ok)│
      //   │ undefined       │ AMD PENDING - wait for callback               │
      //   └─────────────────┴───────────────────────────────────────────────┘
      //
      // TRADE-OFF: If a human is wrongly detected as machine_start (false positive),
      //            they will be called back (up to 3 retries). This is acceptable.
      //
      const shouldHangup = isMachineEnd || isMachineStart; // v3: ALL machine detections = hang up

      // ██████████████████████████████████████████████████████████████████████
      // P0 DIAGNOSTIC: HANGUP DECISION
      // ██████████████████████████████████████████████████████████████████████
      console.log(`🎯 [${amdId}] ┌────────────────────────────────────────────────────────────┐`);
      console.log(`🎯 [${amdId}] │ 🚦 HANGUP DECISION (v3 - unified):                         │`);
      console.log(`🎯 [${amdId}] │   shouldHangup = isMachineEnd || isMachineStart            │`);
      console.log(`🎯 [${amdId}] │   isMachineStart: ${isMachineStart}`);
      console.log(`🎯 [${amdId}] │   isMachineEnd: ${isMachineEnd}`);
      console.log(`🎯 [${amdId}] │   shouldHangup: ${shouldHangup}`);
      console.log(`🎯 [${amdId}] │   → ${shouldHangup ? '❌ WILL HANG UP (machine detected)' : '✅ WILL NOT HANG UP (human/unknown)'}`);
      console.log(`🎯 [${amdId}] └────────────────────────────────────────────────────────────┘`);

      if (isMachineStart) {
        // P0 FIX v3: machine_start detected - TREAT AS MACHINE (hang up + retry)
        console.log(`\n🎯 [${amdId}] ╔════════════════════════════════════════════════════════════╗`);
        console.log(`🎯 [${amdId}] ║ ⚡ P0 FIX v3: machine_start → TREATING AS MACHINE          ║`);
        console.log(`🎯 [${amdId}] ╠════════════════════════════════════════════════════════════╣`);
        console.log(`🎯 [${amdId}] ║ answeredBy: "${answeredBy}"`);
        console.log(`🎯 [${amdId}] ║ participantType: "${participantType}"`);
        console.log(`🎯 [${amdId}] ║ ACTION: HANGING UP - treating as voicemail`);
        console.log(`🎯 [${amdId}] ║ REASON: Unified detection - all machine_* = voicemail`);
        console.log(`🎯 [${amdId}] ║         (if false positive, participant will be called back)`);
        console.log(`🎯 [${amdId}] ║ NEXT: Will hang up and trigger retry (up to 3x)           ║`);
        console.log(`🎯 [${amdId}] ╚════════════════════════════════════════════════════════════╝\n`);
        // Will be handled by shouldHangup block below
      }

      if (shouldHangup) {
        // MACHINE DETECTED (machine_start OR machine_end_*) → Hangup immediately and retry
        console.log(`🎯 [${amdId}] ⚠️ MACHINE DETECTED - HANGING UP CALL`);
        console.log(`🎯 [${amdId}]   answeredBy: ${answeredBy || 'UNDEFINED'}`);
        console.log(`🎯 [${amdId}]   participantType: ${participantType}`);
        console.log(`🎯 [${amdId}]   callSid: ${callSid}`);
        console.log(`🎯 [${amdId}]   isMachineStart: ${isMachineStart}, isMachineEnd: ${isMachineEnd}`);
        console.log(`🎯 [${amdId}]   Action: Hang up and retry (up to 3x)`);

        // Update participant status to no_answer for retry logic
        if (sessionId) {
          try {
            await twilioCallManager.updateParticipantStatus(sessionId, participantType, 'no_answer');
            console.log(`🎯 [${amdId}]   ✅ Status set to no_answer - retry will be triggered`);
          } catch (statusError) {
            console.error(`🎯 [${amdId}]   ⚠️ Failed to update status:`, statusError);
          }
        }

        // P0 CRITICAL FIX: For asyncAmdStatusCallback, the returned TwiML is IGNORED by Twilio!
        // The call is already in the conference. We must use the REST API to hang up the call.
        // This is different from the initial `url` callback where TwiML IS executed.
        if (callSid) {
          try {
            const { getTwilioClient } = await import('../lib/twilio');
            const twilioClient = getTwilioClient();
            console.log(`🎯 [${amdId}]   📞 Using REST API to hang up call ${callSid}...`);
            await twilioClient.calls(callSid).update({ status: 'completed' });
            console.log(`🎯 [${amdId}]   ✅ Call hung up via REST API`);
          } catch (hangupError) {
            console.error(`🎯 [${amdId}]   ⚠️ Failed to hang up call via REST API:`, hangupError);
            // Log but continue - the TwiML hangup might still work for initial url callback
          }
        }

        // Return hangup TwiML - works for initial `url` callback, ignored for asyncAmdStatusCallback
        const hangupTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Hangup/>
</Response>`;

        res.type('text/xml');
        res.send(hangupTwiml);
        console.log(`🎯 [${amdId}] END - Voicemail detected (${answeredBy}), call terminated - will retry\n`);
        return;
      }

      // P0 FIX: Check if answeredBy is provided (human confirmed) or undefined (AMD pending)
      // With asyncAmd="true", the first callback via `url` does NOT have AnsweredBy yet
      // We should ONLY set status to "connected" if we have CONFIRMED it's a human
      // If answeredBy is undefined, keep status as "amd_pending" and wait for AMD callback
      //
      // P0 FIX 2026-01-15: Handle "unknown" as human when it's the ASYNC callback!
      // When AMD returns "unknown", it means:
      // 1. The call was answered (otherwise we'd get "no-answer" from Twilio status callback)
      // 2. AMD analyzed for 30s but couldn't determine human vs machine
      // 3. This usually happens with humans who speak briefly or have unusual voice patterns
      // We should treat "unknown" as "human" to avoid leaving the caller in silent conference forever
      //
      // How to distinguish initial URL callback from async AMD callback:
      // - Initial URL callback: answeredBy is undefined/missing (Twilio hasn't analyzed yet)
      // - Async AMD callback: answeredBy is provided (human, machine_*, fax, or unknown)
      const isAsyncAmdCallback = answeredBy !== undefined && answeredBy !== null && answeredBy !== '';
      // P0 FIX 2026-01-17 v3: UNIFIED machine detection
      // - machine_start → MACHINE (hang up + retry) - already handled above
      // - machine_end_* → MACHINE (hang up + retry) - already handled above
      // - human → HUMAN CONFIRMED → join conference
      // - unknown → HUMAN (AMD couldn't determine after 30s) → join conference
      // Note: If we reach this point, shouldHangup was FALSE, so answeredBy is "human" or "unknown"
      const isHumanConfirmed = answeredBy === 'human'
        || (isAsyncAmdCallback && answeredBy === 'unknown');
      // v3: Removed isMachineStart - now treated as machine (handled above)

      // ██████████████████████████████████████████████████████████████████████
      // P0 DIAGNOSTIC: HUMAN CONFIRMED DECISION
      // ██████████████████████████████████████████████████████████████████████
      console.log(`🎯 [${amdId}] ┌────────────────────────────────────────────────────────────┐`);
      console.log(`🎯 [${amdId}] │ 🧑 HUMAN CONFIRMED DECISION (v3 unified):                  │`);
      console.log(`🎯 [${amdId}] │   isAsyncAmdCallback: ${isAsyncAmdCallback}`);
      console.log(`🎯 [${amdId}] │   answeredBy === 'human': ${answeredBy === 'human'}`);
      console.log(`🎯 [${amdId}] │   isAsyncAmd && unknown: ${isAsyncAmdCallback && answeredBy === 'unknown'}`);
      console.log(`🎯 [${amdId}] │   isMachineStart (now treated as MACHINE): ${isMachineStart}`);
      console.log(`🎯 [${amdId}] │   isMachineEnd (MACHINE - already hung up): ${isMachineEnd}`);
      console.log(`🎯 [${amdId}] │   → isHumanConfirmed: ${isHumanConfirmed}`);
      console.log(`🎯 [${amdId}] │   → ${isHumanConfirmed ? '✅ WILL JOIN CONFERENCE' : '⏳ AMD PENDING - HOLD MUSIC'}`);
      console.log(`🎯 [${amdId}] └────────────────────────────────────────────────────────────┘`);

      // P0 CRITICAL FIX 2026-01-16: RACE CONDITION PROTECTION
      // If provider already confirmed via GATHER and is now "connected", ignore stale AMD callback!
      // This prevents: Provider presses 1 → joins conference → AMD callback arrives late → disrupts call
      if (isAsyncAmdCallback && participantType === 'provider' && sessionId) {
        try {
          const session = await twilioCallManager.getCallSession(sessionId);
          const providerStatus = session?.participants.provider.status;
          const providerCallSid = session?.participants.provider.callSid;

          // Check if provider is already connected (joined conference during AMD pending)
          if (providerStatus === 'connected') {
            console.log(`\n${'⚠️'.repeat(35)}`);
            console.log(`🎯 [${amdId}] 🛡️ AMD CALLBACK - Provider already CONNECTED (in conference)!`);
            console.log(`🎯 [${amdId}]   Provider joined conference during AMD pending phase`);
            console.log(`🎯 [${amdId}]   providerStatus: ${providerStatus}`);
            console.log(`🎯 [${amdId}]   callSid from callback: ${callSid}`);
            console.log(`🎯 [${amdId}]   callSid in DB: ${providerCallSid}`);
            console.log(`🎯 [${amdId}]   ACTION: Ignoring stale AMD callback - provider is in conference`);
            console.log(`${'⚠️'.repeat(35)}\n`);

            // Return empty response - don't disrupt the active call!
            res.type('text/xml');
            res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
            return;
          }

          // Also check for callSid mismatch (different call attempt)
          if (callSid && providerCallSid && callSid !== providerCallSid) {
            console.log(`\n${'⚠️'.repeat(35)}`);
            console.log(`🎯 [${amdId}] 🛡️ STALE AMD CALLBACK - CallSid mismatch!`);
            console.log(`🎯 [${amdId}]   This is from an OLD call attempt`);
            console.log(`🎯 [${amdId}]   callSid from callback: ${callSid}`);
            console.log(`🎯 [${amdId}]   callSid in DB: ${providerCallSid}`);
            console.log(`🎯 [${amdId}]   ACTION: Ignoring stale AMD callback`);
            console.log(`${'⚠️'.repeat(35)}\n`);

            // Hang up the old call if it's still active
            try {
              const { getTwilioClient } = await import('../lib/twilio');
              const twilioClient = getTwilioClient();
              if (twilioClient) {
                await twilioClient.calls(callSid).update({ status: 'completed' });
                console.log(`🎯 [${amdId}]   ✅ Old call hung up`);
              }
            } catch (hangupError) {
              console.log(`🎯 [${amdId}]   ℹ️ Could not hang up old call (already ended?)`);
            }

            res.type('text/xml');
            res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`);
            return;
          }
        } catch (sessionError) {
          console.warn(`🎯 [${amdId}]   ⚠️ Could not check provider status:`, sessionError);
          // Continue processing - let the normal flow handle it
        }
      }

      if (isHumanConfirmed) {
        if (answeredBy === 'unknown') {
          console.log(`\n${'🟢'.repeat(35)}`);
          console.log(`🎯 [${amdId}] ⚠️ AMD returned "unknown" - treating as HUMAN!`);
          console.log(`🎯 [${amdId}]   isAsyncAmdCallback: ${isAsyncAmdCallback}`);
          console.log(`🎯 [${amdId}]   Reason: AMD couldn't determine after analysis, but call IS answered`);
          console.log(`🎯 [${amdId}]   Action: Will proceed to confirmation or conference`);
          console.log(`${'🟢'.repeat(35)}\n`);
        }

        // HUMAN CONFIRMED - Different handling for client vs provider
        // CLIENT: Join conference directly (they initiated the call)
        // PROVIDER: Ask for confirmation first (press 1 or say YES)
        if (participantType === 'client') {
          // CLIENT: Set connected and join conference directly
          console.log(`🎯 [${amdId}] ✅ CLIENT HUMAN CONFIRMED - Setting status to "connected" and joining conference`);

          if (sessionId) {
            try {
              await twilioCallManager.updateParticipantStatus(
                sessionId,
                participantType,
                'connected',
                admin.firestore.Timestamp.fromDate(new Date())
              );
              console.log(`🎯 [${amdId}]   ✅ Client status set to "connected"`);
            } catch (statusError) {
              console.error(`🎯 [${amdId}]   ⚠️ Failed to update status:`, statusError);
            }
          }
        } else {
          // PROVIDER HUMAN CONFIRMED via async AMD callback
          //
          // P0 FIX 2026-01-16: This section is now a FALLBACK only.
          //
          // NORMAL FLOW (with fix):
          // 1. Initial callback (answeredBy=undefined) → provider joins conference immediately
          // 2. Provider status set to "connected"
          // 3. Async AMD callback → race condition check finds "connected" → returns early
          //
          // This code is reached ONLY if:
          // - Race condition check didn't find "connected" status (edge case)
          // - Status update in AMD pending section failed
          //
          // Since provider should already be in conference, we just:
          // 1. Log for debugging
          // 2. Return empty response (don't disrupt existing call)
          //
          // REMOVED: REST API redirect - it was failing with "Call not in progress"
          // because the provider was already in conference or call had ended.
          //
          console.log(`🎯 [${amdId}] ⚠️ PROVIDER HUMAN CONFIRMED (FALLBACK PATH)`);
          console.log(`🎯 [${amdId}]   answeredBy: ${answeredBy}`);
          console.log(`🎯 [${amdId}]   This is unexpected - provider should already be in conference`);
          console.log(`🎯 [${amdId}]   Provider joined conference on initial callback (AMD pending section)`);
          console.log(`🎯 [${amdId}]   Returning empty response to avoid disrupting call`);

          // Ensure status is "connected" (might have failed in AMD pending section)
          if (sessionId) {
            try {
              const session = await twilioCallManager.getCallSession(sessionId);
              if (session?.participants.provider.status !== 'connected') {
                await twilioCallManager.updateParticipantStatus(
                  sessionId,
                  participantType,
                  'connected',
                  admin.firestore.Timestamp.fromDate(new Date())
                );
                console.log(`🎯 [${amdId}]   ✅ Provider status updated to "connected" (was ${session?.participants.provider.status})`);
              } else {
                console.log(`🎯 [${amdId}]   Provider already "connected" - no update needed`);
              }
            } catch (statusError) {
              console.error(`🎯 [${amdId}]   ⚠️ Failed to check/update status:`, statusError);
            }
          }

          // Return empty response - provider should already be in conference
          res.type('text/xml');
          res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
          console.log(`🎯 [${amdId}] END - Provider fallback path (empty response)\n`);
          return;
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

        // P1 CRITICAL FIX: For AMD pending, DON'T join conference yet!
        // If we join conference with endConferenceOnExit="true" and then AMD detects machine,
        // hanging up the call will END THE ENTIRE CONFERENCE and kick out the client!
        //
        // Solution:
        // - CLIENT (AMD pending): Join conference normally - client starts the conference
        // - PROVIDER (AMD pending): Play hold music LOCALLY, don't join conference yet
        //   When AMD confirms human, the asyncAmdStatusCallback will be triggered
        //   and we can then join the conference via a different mechanism

        if (participantType === 'client') {
          // Client joins conference normally - they are the first participant and start the conference
          const { getTwilioConferenceWebhookUrl } = await import('../utils/urlBase');
          const conferenceWebhookUrl = getTwilioConferenceWebhookUrl();

          const clientConferenceTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="60" timeLimit="${timeLimit}">
    <Conference
      waitUrl="http://twimlets.com/holdmusic?Bucket=com.twilio.music.classical"
      startConferenceOnEnter="true"
      endConferenceOnExit="true"
      statusCallback="${conferenceWebhookUrl}"
      statusCallbackEvent="start end join leave"
      statusCallbackMethod="POST"
      participantLabel="client"
    >${conferenceName}</Conference>
  </Dial>
</Response>`;

          res.type('text/xml');
          res.send(clientConferenceTwiml);
          console.log(`🎯 [${amdId}] END - Client sent to CONFERENCE (AMD pending but client always joins)\n`);
          return;
        } else {
          // P0 FIX 2026-01-16: PROVIDER AMD PENDING - JOIN CONFERENCE IMMEDIATELY!
          //
          // PREVIOUS BEHAVIOR (BROKEN):
          // - Provider sent to hold music while AMD analyzes
          // - Provider hears only music, no message → thinks it's spam → HANGS UP
          // - AMD callback arrives → tries REST API redirect → call already ended → error 21220
          // - Result: Provider never connects, retries 3x, same failure
          //
          // NEW BEHAVIOR (FIXED):
          // - Provider joins conference IMMEDIATELY with endConferenceOnExit="false"
          // - Provider hears welcome message and is connected to client right away
          // - If AMD later detects machine, we hang up via REST API (conference continues for client)
          // - The welcome message prevents provider from hanging up thinking it's spam
          //
          // Key insight: Better to occasionally connect to voicemail than to have 100% failure rate!
          //
          console.log(`🎯 [${amdId}] ⚡ P0 FIX: PROVIDER AMD PENDING - JOINING CONFERENCE IMMEDIATELY!`);
          console.log(`🎯 [${amdId}]   Previous: Hold music → REST API redirect (FAILED - call ended)`);
          console.log(`🎯 [${amdId}]   Now: Join conference directly with endConferenceOnExit="false"`);

          // Get welcome message for provider
          const providerWelcomeMsg = getIntroText('provider', langKey);
          console.log(`🎯 [${amdId}]   welcomeMessage: "${providerWelcomeMsg.substring(0, 50)}..."`);

          const { getTwilioConferenceWebhookUrl } = await import('../utils/urlBase');
          const conferenceWebhookUrl = getTwilioConferenceWebhookUrl();

          // Provider joins conference with endConferenceOnExit="false"
          // This allows us to hang up provider without ending client's conference if AMD detects machine
          const providerAmdPendingTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="${ttsLocale}">${providerWelcomeMsg}</Say>
  <Dial timeout="60" timeLimit="${timeLimit}">
    <Conference
      waitUrl="http://twimlets.com/holdmusic?Bucket=com.twilio.music.classical"
      startConferenceOnEnter="false"
      endConferenceOnExit="false"
      statusCallback="${conferenceWebhookUrl}"
      statusCallbackEvent="start end join leave"
      statusCallbackMethod="POST"
      participantLabel="provider"
    >${conferenceName}</Conference>
  </Dial>
</Response>`;

          // Also update status to connected since they're joining conference
          if (sessionId) {
            try {
              await twilioCallManager.updateParticipantStatus(
                sessionId,
                participantType,
                'connected',
                admin.firestore.Timestamp.fromDate(new Date())
              );
              console.log(`🎯 [${amdId}]   ✅ Provider status set to "connected" (AMD pending but in conference)`);
            } catch (statusError) {
              console.error(`🎯 [${amdId}]   ⚠️ Failed to update status:`, statusError);
            }
          }

          res.type('text/xml');
          res.send(providerAmdPendingTwiml);
          console.log(`🎯 [${amdId}] END - Provider JOINING CONFERENCE (AMD pending - endConferenceOnExit=false)\n`);
          return;
        }
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
      participantLabel="${participantType}"
    >${conferenceName}</Conference>
  </Dial>
</Response>`;

      // Note: Provider human confirmed now goes through Gather confirmation (line ~1291)
      // This code path is only reached for CLIENT human confirmed
      // For async AMD callback on client, use REST API to redirect (though client usually has sync AMD)
      if (isAsyncAmdCallback && callSid) {
        console.log(`🎯 [${amdId}] 🔄 CLIENT ASYNC AMD CALLBACK - Using REST API to redirect to conference`);
        console.log(`🎯 [${amdId}]   callSid: ${callSid}`);

        try {
          const { getTwilioClient } = await import('../lib/twilio');
          const twilioClient = getTwilioClient();
          if (twilioClient) {
            await twilioClient.calls(callSid).update({
              twiml: conferenceTwiml
            });
            console.log(`🎯 [${amdId}]   ✅ Call updated via REST API - client will now join conference`);
          } else {
            console.error(`🎯 [${amdId}]   ❌ Twilio client not available - cannot redirect call!`);
          }
        } catch (restError) {
          console.error(`🎯 [${amdId}]   ❌ Failed to update call via REST API:`, restError);
        }
      }

      res.type('text/xml');
      res.send(conferenceTwiml);
      console.log(`🎯 [${amdId}] END - Sent CONFERENCE TwiML with welcome message (client human confirmed)\n`);

    } catch (error) {
      const errorDetails = {
        amdId,
        sessionId: req.query.sessionId || req.body?.sessionId || 'unknown',
        participantType: req.query.participantType || req.body?.participantType || 'unknown',
        callSid: req.body?.CallSid || 'unknown',
        answeredBy: req.body?.AnsweredBy || 'unknown',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorStack: error instanceof Error ? error.stack?.split('\n').slice(0, 5).join(' | ') : 'N/A',
        requestBody: JSON.stringify(req.body || {}).slice(0, 500),
        timestamp: new Date().toISOString(),
      };

      console.error(`\n${'❌'.repeat(40)}`);
      console.error(`🎯 [${amdId}] ❌ TWILIOAMDTWIML EXCEPTION:`, errorDetails);
      console.error(`${'❌'.repeat(40)}\n`);
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
 * Webhook pour gérer la réponse du Gather (confirmation vocale du provider)
 *
 * Ce webhook est appelé quand le provider:
 * - Appuie sur 1 (DTMF)
 * - Dit "oui", "yes", "sí", etc. (speech recognition)
 *
 * Si confirmation reçue → rejoint la conférence
 * Si pas de confirmation → status = no_answer, permet retry
 */
export const twilioGatherResponse = onRequest(
  {
    region: 'europe-west1',
    memory: '256MiB',
    cpu: 0.25,
    maxInstances: 10,
    minInstances: 0,
    concurrency: 1
  },
  async (req: Request, res: Response) => {
    const gatherId = `gather_${Date.now().toString(36)}`;

    try {
      // Parse query parameters (from Gather action URL)
      const sessionId = req.query.sessionId as string;
      const participantType = req.query.participantType as 'client' | 'provider';
      const conferenceName = req.query.conferenceName as string;
      const timeLimit = parseInt(req.query.timeLimit as string) || 1200;
      const ttsLocale = req.query.ttsLocale as string || 'fr-FR';
      const langKey = req.query.langKey as string || 'fr';

      // Get Gather response from Twilio
      const digits = req.body?.Digits; // DTMF input (e.g., "1")
      const speechResult = req.body?.SpeechResult; // Speech recognition result
      const callSid = req.body?.CallSid;

      console.log(`\n${'🎤'.repeat(40)}`);
      console.log(`🎤 [${gatherId}] twilioGatherResponse START`);
      console.log(`🎤 [${gatherId}]   sessionId: ${sessionId}`);
      console.log(`🎤 [${gatherId}]   participantType: ${participantType}`);
      console.log(`🎤 [${gatherId}]   conferenceName: ${conferenceName}`);
      console.log(`🎤 [${gatherId}]   callSid: ${callSid}`);
      console.log(`🎤 [${gatherId}]   digits: ${digits || 'none'}`);
      console.log(`🎤 [${gatherId}]   speechResult: ${speechResult || 'none'}`);
      console.log(`${'🎤'.repeat(40)}`);

      // Determine if provider confirmed
      let isConfirmed = false;

      // Check DTMF input (pressed 1)
      if (digits === '1') {
        console.log(`🎤 [${gatherId}] ✅ DTMF CONFIRMATION: Provider pressed 1`);
        isConfirmed = true;
      }

      // Check speech input (said yes/oui/sí/etc.)
      if (!isConfirmed && speechResult) {
        const normalizedSpeech = speechResult.toLowerCase().trim();
        const confirmWords = [
          'oui', 'yes', 'si', 'sí', 'ja', 'да', 'haan', 'hā', 'sim', 'tak',
          'evet', 'sì', 'hai', 'ok', 'okay', 'd\'accord', 'dacord', 'bien',
          '是', 'はい', 'ਹਾਂ', 'نعم', 'بله', '네', 'vâng', 'có'
        ];

        for (const word of confirmWords) {
          if (normalizedSpeech.includes(word)) {
            console.log(`🎤 [${gatherId}] ✅ SPEECH CONFIRMATION: Provider said "${speechResult}" (matched: ${word})`);
            isConfirmed = true;
            break;
          }
        }

        if (!isConfirmed) {
          console.log(`🎤 [${gatherId}] ❌ Speech not recognized as confirmation: "${speechResult}"`);
        }
      }

      if (isConfirmed) {
        // Provider confirmed! Set status to connected and join conference
        console.log(`🎤 [${gatherId}] 🎉 PROVIDER CONFIRMED - Setting status to "connected" and joining conference`);

        if (sessionId) {
          try {
            await twilioCallManager.updateParticipantStatus(
              sessionId,
              participantType,
              'connected',
              admin.firestore.Timestamp.fromDate(new Date())
            );
            console.log(`🎤 [${gatherId}]   ✅ Status set to "connected"`);
          } catch (statusError) {
            console.error(`🎤 [${gatherId}]   ⚠️ Failed to update status:`, statusError);
          }
        }

        // Get welcome message in provider's language
        const welcomeMessage = getIntroText('provider', langKey);

        // Build conference TwiML
        const { getTwilioConferenceWebhookUrl } = await import('../utils/urlBase');
        const conferenceWebhookUrl = getTwilioConferenceWebhookUrl();

        const conferenceTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="${ttsLocale}">${welcomeMessage}</Say>
  <Dial timeout="60" timeLimit="${timeLimit}">
    <Conference
      waitUrl="http://twimlets.com/holdmusic?Bucket=com.twilio.music.classical"
      startConferenceOnEnter="false"
      endConferenceOnExit="true"
      statusCallback="${conferenceWebhookUrl}"
      statusCallbackEvent="start end join leave"
      statusCallbackMethod="POST"
      participantLabel="provider"
    >${conferenceName}</Conference>
  </Dial>
</Response>`;

        res.type('text/xml');
        res.send(conferenceTwiml);
        console.log(`🎤 [${gatherId}] END - Provider joining conference\n`);

      } else {
        // No confirmation received - treat as no_answer for retry
        console.log(`🎤 [${gatherId}] ❌ NO CONFIRMATION - Setting status to "no_answer" for retry`);

        if (sessionId) {
          try {
            await twilioCallManager.updateParticipantStatus(
              sessionId,
              participantType,
              'no_answer'
            );
            console.log(`🎤 [${gatherId}]   ✅ Status set to "no_answer" - retry will be triggered`);
          } catch (statusError) {
            console.error(`🎤 [${gatherId}]   ⚠️ Failed to update status:`, statusError);
          }
        }

        // Get no response message and hang up
        const noResponseMessage = getNoResponseText(langKey);

        const hangupTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="${ttsLocale}">${noResponseMessage}</Say>
  <Hangup/>
</Response>`;

        res.type('text/xml');
        res.send(hangupTwiml);
        console.log(`🎤 [${gatherId}] END - Hanging up, will retry\n`);
      }

    } catch (error) {
      console.error(`\n${'❌'.repeat(40)}`);
      console.error(`🎤 [${gatherId}] ❌ TWILIOGATHERRESPONSE EXCEPTION:`, {
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack?.split('\n').slice(0, 5).join(' | ') : 'N/A',
      });
      console.error(`${'❌'.repeat(40)}\n`);
      await logError('twilioGatherResponse', error);

      // On error, hang up
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