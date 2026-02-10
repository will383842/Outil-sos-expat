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
// P0 FIX: Import secrets from centralized secrets.ts - NEVER call defineSecret() here!
import { TASKS_AUTH_SECRET, STRIPE_SECRET_KEY_LIVE, STRIPE_SECRET_KEY_TEST } from '../lib/secrets';
import voicePromptsJson from '../content/voicePrompts.json';
// P0 FIX: Import call region from centralized config - dedicated region for call functions
import { CALL_FUNCTIONS_REGION } from '../configs/callRegion';

// Helper function to get intro text based on participant type and language
function getIntroText(participant: "provider" | "client", langKey: string): string {
  const prompts = voicePromptsJson as Record<string, Record<string, string>>;
  const table = participant === "provider" ? prompts.provider_intro : prompts.client_intro;
  return table[langKey] ?? table.en ?? "Please hold.";
}

// P0 FIX 2026-01-18: GATHER confirmation RE-ENABLED for both client and provider
// This is the ONLY reliable way to detect human vs voicemail
// Helper function to get confirmation prompt for client or provider
export function getConfirmationText(participantType: "provider" | "client", langKey: string): string {
  const prompts = voicePromptsJson as Record<string, Record<string, string>>;
  const table = participantType === 'client' ? prompts.client_confirmation : prompts.provider_confirmation;
  return table?.[langKey] ?? table?.en ?? "Press 1 on your phone to be connected.";
}

// Helper function to get no response message (same for client and provider)
function getNoResponseText(langKey: string): string {
  const prompts = voicePromptsJson as Record<string, Record<string, string>>;
  const table = prompts.provider_no_response;
  return table?.[langKey] ?? table?.en ?? "We did not receive a confirmation. The call will be ended.";
}

// P0 FIX 2026-01-18: Escape special XML characters to prevent TwiML parse errors (Error 12100)
// In XML, & must be &amp;, < must be &lt;, > must be &gt;, " must be &quot;, ' must be &apos;
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
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
    // P0 FIX 2026-02-04: Migrated to dedicated region for call functions to avoid quota issues
    region: CALL_FUNCTIONS_REGION,
    // P0 CRITICAL FIX 2026-02-04: Allow unauthenticated access for Twilio webhooks (Cloud Run requires explicit public access)
    invoker: "public",
    memory: '256MiB',
    cpu: 0.25,
    maxInstances: 10,  // P1 FIX: Increased from 3 for better scalability
    minInstances: 1,   // P0 FIX: Keep warm to avoid cold start delays on call status updates
    concurrency: 1,    // Keep at 1 to avoid race conditions with Firestore updates
    // P0 CRITICAL FIX: Add Twilio secrets for signature validation + hangup calls to voicemail
    // P0 FIX 2026-01-18: Added TASKS_AUTH_SECRET for scheduleProviderAvailableTask (provider cooldown)
    // P0 FIX 2026-01-30: Added Stripe secrets for payment capture after successful call
    secrets: [TWILIO_AUTH_TOKEN_SECRET, TWILIO_ACCOUNT_SID_SECRET, TASKS_AUTH_SECRET, STRIPE_SECRET_KEY_LIVE, STRIPE_SECRET_KEY_TEST]
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
        // P1-3 FIX: Don't treat transaction errors as duplicates!
        // Transaction errors (contention, timeout, network) are NOT the same as legitimate duplicates.
        // Return 500 so Twilio retries the webhook instead of losing the event.
        console.error(`❌ Transaction error for webhook idempotency: ${txError}`);
        console.error(`⚠️ Returning 500 to trigger Twilio retry (was incorrectly returning 200 before)`);
        res.status(500).send('Transaction error - please retry');
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

    // P0 FIX 2026-01-18: IGNORE AnsweredBy in status callback!
    // With asyncAmd="true", AMD detection is handled EXCLUSIVELY by twilioAmdTwiml callback.
    // Even if Twilio sends AnsweredBy here, we MUST ignore it because:
    // 1. The initial AMD detection (machine_start) has HIGH FALSE POSITIVE rate
    // 2. We now use DTMF confirmation to verify human presence
    // 3. Acting on AnsweredBy here causes race conditions and premature hangups
    //
    // ALL AMD decisions are made in twilioAmdTwiml which:
    // - Returns Gather TwiML for DTMF confirmation
    // - Only hangs up on confirmed machine_end_* (voicemail beep heard)
    const answeredBy = body.AnsweredBy;

    console.log(`📞 [${webhookId}] STEP 1: AMD Detection`);
    console.log(`📞 [${webhookId}]   answeredBy value: "${answeredBy || 'UNDEFINED'}"`);
    console.log(`📞 [${webhookId}]   participantType: ${participantType}`);
    console.log(`📞 [${webhookId}]   ⚠️ P0 FIX: IGNORING AnsweredBy in status callback - twilioAmdTwiml handles AMD!`);

    // P0 FIX 2026-01-18: ALWAYS set amd_pending, regardless of AnsweredBy value
    // The twilioAmdTwiml callback handles ALL AMD decisions with DTMF confirmation
    {
      console.log(`📞 [${webhookId}] ⚠️ Setting status to "amd_pending" - twilioAmdTwiml will handle AMD`);
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

    // P0 FIX 2026-01-18: ALL AMD handling moved to twilioAmdTwiml
    // With asyncAmd mode, we ALWAYS enter the block above and return
    // This point should NEVER be reached

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

      // P0 FIX: Use Math.round instead of Math.floor to prevent edge case
      // where 119.9s rounds down to 119s and triggers refund instead of capture
      billingDuration = Math.round((endTime - bothConnectedAt) / 1000);

      console.log(`🏁 [${completedId}] 📊 BILLING DURATION CALCULATION:`);
      console.log(`🏁 [${completedId}]   clientConnectedAt: ${new Date(clientConnectedAt).toISOString()}`);
      console.log(`🏁 [${completedId}]   providerConnectedAt: ${new Date(providerConnectedAt).toISOString()}`);
      console.log(`🏁 [${completedId}]   bothConnectedAt (2nd joined): ${new Date(bothConnectedAt).toISOString()}`);
      console.log(`🏁 [${completedId}]   billingDuration: ${billingDuration}s`);
      console.log(`🏁 [${completedId}]   (vs Twilio CallDuration: ${duration}s - durée individuelle du participant)`);
    } else {
      // P0 CRITICAL FIX 2026-01-20: RACE CONDITION BUG FIX
      // The original code forced billingDuration=0 if connectedAt was missing.
      // BUT due to webhook race conditions, connectedAt might not be read correctly
      // even if the call was successful (session.status === 'active' proves both were connected).
      //
      // FALLBACK 1: Check if handleConferenceEnd already calculated billingDuration
      // FALLBACK 2: Check if session was 'active' (proves both participants connected)
      // FALLBACK 3: Only force 0 if session was NEVER active

      const existingBillingDuration = session.conference?.billingDuration;
      const sessionWasActive = session.status === 'active' || session.status === 'completed';

      if (existingBillingDuration && existingBillingDuration > 0) {
        // FALLBACK 1: Use billingDuration already calculated by handleConferenceEnd
        billingDuration = existingBillingDuration;
        console.log(`🏁 [${completedId}] 📊 FALLBACK 1: Using existing conference.billingDuration: ${billingDuration}s`);
        console.log(`🏁 [${completedId}]   (handleConferenceEnd already calculated this - more reliable)`);
      } else if (sessionWasActive && session.conference?.startedAt) {
        // FALLBACK 2: Session was active, calculate from conference timestamps
        const conferenceStartTime = session.conference.startedAt.toDate().getTime();
        const conferenceEndTime = session.conference?.endedAt?.toDate().getTime() || Date.now();
        billingDuration = Math.round((conferenceEndTime - conferenceStartTime) / 1000);
        console.log(`🏁 [${completedId}] 📊 FALLBACK 2: Session was ACTIVE - calculating from conference timestamps`);
        console.log(`🏁 [${completedId}]   conferenceStartedAt: ${new Date(conferenceStartTime).toISOString()}`);
        console.log(`🏁 [${completedId}]   conferenceEndTime: ${new Date(conferenceEndTime).toISOString()}`);
        console.log(`🏁 [${completedId}]   billingDuration (from conference): ${billingDuration}s`);
        console.log(`🏁 [${completedId}]   ⚠️ Note: connectedAt timestamps missing due to race condition, but session WAS active`);
      } else {
        // FALLBACK 3: Session was never active - truly no billing duration
        // This is the correct case for: provider never answered, client hung up during connecting, etc.
        billingDuration = 0;
        console.log(`🏁 [${completedId}] ⚠️ Missing connection timestamps AND session was not active`);
        console.log(`🏁 [${completedId}]   clientConnectedAt: ${clientConnectedAt ? 'present' : 'MISSING'}`);
        console.log(`🏁 [${completedId}]   providerConnectedAt: ${providerConnectedAt ? 'present' : 'MISSING'}`);
        console.log(`🏁 [${completedId}]   session.status: ${session.status}`);
        console.log(`🏁 [${completedId}]   billingDuration FORCED to 0 (no active call occurred)`);
      }
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
    // P0 FIX 2026-02-05: Aligned with CALL_CONFIG.MIN_CALL_DURATION (60s) - was incorrectly 120s
    const MIN_DURATION_FOR_CAPTURE = 60;
    if (billingDuration >= MIN_DURATION_FOR_CAPTURE) {
      console.log(`🏁 [${completedId}] STEP 3: billingDuration >= ${MIN_DURATION_FOR_CAPTURE}s → handleCallCompletion (capture payment)`);
      await twilioCallManager.handleCallCompletion(sessionId, billingDuration);
    } else {
      // P0 CRITICAL FIX 2026-01-17: Check if this participant was EVER connected
      // If participant was NEVER connected (connectedAt is null), DON'T call handleEarlyDisconnection
      // because the retry loop in callParticipantWithRetries is handling this case.
      // Calling handleEarlyDisconnection would interfere with the retry loop and prematurely
      // cancel the payment while the retry loop is still trying to reach the participant.
      const participant = participantType === 'provider' ? session.participants.provider : session.participants.client;
      const participantConnectedAt = participant?.connectedAt;

      if (!participantConnectedAt) {
        console.log(`🏁 [${completedId}] STEP 3: ${participantType} was NEVER connected (no_answer/rejected)`);
        console.log(`🏁 [${completedId}]   ⚠️ SKIPPING handleEarlyDisconnection - retry loop handles this`);
        console.log(`🏁 [${completedId}]   ${participantType}.attemptCount: ${participant?.attemptCount || 0}`);
        console.log(`🏁 [${completedId}]   ${participantType}.status: ${participant?.status}`);
        console.log(`🏁 [${completedId}]   session.status: ${session.status}`);
        console.log(`🏁 [${completedId}]   Retry loop will call handleCallFailure after all attempts exhausted`);
      } else {
        console.log(`🏁 [${completedId}] STEP 3: billingDuration < ${MIN_DURATION_FOR_CAPTURE}s → handleEarlyDisconnection (may refund)`);
        // P0 FIX LOG 2026-01-15: Log participant retry state BEFORE calling handleEarlyDisconnection
        console.log(`🏁 [${completedId}] 📊 RETRY STATE before handleEarlyDisconnection:`);
        console.log(`🏁 [${completedId}]   ${participantType}.attemptCount: ${participant?.attemptCount || 0}`);
        console.log(`🏁 [${completedId}]   ${participantType}.status: ${participant?.status}`);
        console.log(`🏁 [${completedId}]   ${participantType}.connectedAt: ${participantConnectedAt?.toDate?.() || 'N/A'}`);
        console.log(`🏁 [${completedId}]   session.status: ${session.status}`);
        console.log(`🏁 [${completedId}]   MAX_RETRIES: 3 (if attemptCount < 3, retries should continue)`);
        await twilioCallManager.handleEarlyDisconnection(sessionId, participantType, billingDuration);
      }
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
    console.log(`🏁 [${completedId}]   threshold (MIN_DURATION_FOR_CAPTURE): ${MIN_DURATION_FOR_CAPTURE}s`);
    console.log(`🏁 [${completedId}]   action taken: ${billingDuration >= MIN_DURATION_FOR_CAPTURE ? 'handleCallCompletion (CAPTURE)' : 'handleEarlyDisconnection (MAY REFUND)'}`);

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

// ===== MAPPING DES CODES SIP POUR DIAGNOSTIC =====
const SIP_CODE_MEANINGS: Record<string, { category: string; meaning: string; userFriendly: string }> = {
  '480': { category: 'recipient_unavailable', meaning: 'Temporarily Unavailable', userFriendly: 'Téléphone éteint ou hors réseau' },
  '486': { category: 'recipient_busy', meaning: 'Busy Here', userFriendly: 'Ligne occupée' },
  '487': { category: 'caller_cancelled', meaning: 'Request Terminated', userFriendly: 'Appel annulé' },
  '503': { category: 'network_error', meaning: 'Service Unavailable', userFriendly: 'Service opérateur indisponible' },
  '404': { category: 'invalid_number', meaning: 'Not Found', userFriendly: 'Numéro invalide ou inexistant' },
  '408': { category: 'timeout', meaning: 'Request Timeout', userFriendly: 'Délai de connexion dépassé' },
  '484': { category: 'invalid_number', meaning: 'Address Incomplete', userFriendly: 'Numéro incomplet' },
  '488': { category: 'incompatible', meaning: 'Not Acceptable Here', userFriendly: 'Format d\'appel non supporté' },
  '500': { category: 'server_error', meaning: 'Server Internal Error', userFriendly: 'Erreur serveur Twilio' },
  '502': { category: 'network_error', meaning: 'Bad Gateway', userFriendly: 'Erreur réseau opérateur' },
  '504': { category: 'timeout', meaning: 'Gateway Timeout', userFriendly: 'Délai opérateur dépassé' },
  '603': { category: 'recipient_declined', meaning: 'Decline', userFriendly: 'Appel refusé par le destinataire' },
  '403': { category: 'blocked', meaning: 'Forbidden', userFriendly: 'Appel bloqué (permissions/spam)' },
  '21215': { category: 'geo_permission', meaning: 'Geographic Permission Error', userFriendly: 'Permission géographique non activée' },
};

const Q850_CODE_MEANINGS: Record<string, string> = {
  '1': 'Numéro non attribué',
  '16': 'Raccrochage normal',
  '17': 'Ligne occupée',
  '18': 'Pas de réponse utilisateur',
  '19': 'Pas de réponse (sonnerie)',
  '21': 'Appel refusé',
  '27': 'Destination hors service',
  '28': 'Format de numéro invalide',
  '31': 'Appel rejeté par le réseau',
  '34': 'Pas de circuit disponible',
  '38': 'Réseau hors service',
  '41': 'Échec temporaire',
  '42': 'Congestion réseau',
  '50': 'Fonction non disponible',
  '63': 'Service non disponible',
  '79': 'Service non implémenté',
  '88': 'Destination incompatible',
  '102': 'Délai de récupération expiré',
  '127': 'Cause inconnue',
};

const STIR_SHAKEN_MEANINGS: Record<string, { level: string; description: string }> = {
  'A': { level: 'full', description: 'Attestation complète - numéro vérifié' },
  'B': { level: 'partial', description: 'Attestation partielle - client vérifié mais pas le numéro' },
  'C': { level: 'gateway', description: 'Attestation minimale - opérateurs peuvent rejeter' },
};

interface TwilioErrorDetails {
  sipCode: string | null;
  sipMeaning: string | null;
  sipCategory: string | null;
  sipUserFriendly: string | null;
  q850Code: string | null;
  q850Meaning: string | null;
  stirShakenStatus: string | null;
  stirShakenLevel: string | null;
  stirShakenDescription: string | null;
  carrierName: string | null;
  carrierCountry: string | null;
  fromCountry: string | null;
  toCountry: string | null;
  errorSource: string;
  errorSummary: string;
}

/**
 * Extrait et catégorise les détails d'erreur Twilio pour diagnostic admin
 */
function extractTwilioErrorDetails(body: TwilioCallWebhookBody): TwilioErrorDetails {
  // Cast to access optional Twilio properties not in our interface
  const rawBody = body as unknown as Record<string, unknown>;

  // Extraire le code SIP
  const sipCode = rawBody.SipResponseCode as string | undefined;
  const sipInfo = sipCode ? SIP_CODE_MEANINGS[sipCode] : null;

  // Extraire le code Q850 (cause code téléphonie)
  const q850Code = rawBody.Q850CauseCode as string | undefined ||
                   rawBody.CauseCode as string | undefined;
  const q850Meaning = q850Code ? Q850_CODE_MEANINGS[q850Code] || 'Code inconnu' : null;

  // Extraire STIR/SHAKEN (si disponible)
  const stirShaken = rawBody.StirVerstat as string | undefined ||
                     rawBody.StirStatus as string | undefined;
  const stirInfo = stirShaken ? STIR_SHAKEN_MEANINGS[stirShaken.toUpperCase()] : null;

  // Extraire les infos opérateur/pays
  const carrierName = rawBody.CalledCarrier as string | undefined ||
                      rawBody.ToCarrier as string | undefined;
  const carrierCountry = rawBody.CalledCarrierCountry as string | undefined;
  const fromCountry = rawBody.FromCountry as string | undefined || rawBody.CallerCountry as string | undefined;
  const toCountry = rawBody.ToCountry as string | undefined || rawBody.CalledCountry as string | undefined;

  // Déterminer la source de l'erreur
  let errorSource = 'unknown';
  let errorSummary = 'Erreur inconnue';

  if (body.CallStatus === 'no-answer') {
    errorSource = 'recipient';
    errorSummary = 'Le destinataire n\'a pas répondu';
  } else if (body.CallStatus === 'busy') {
    errorSource = 'recipient';
    errorSummary = 'La ligne est occupée';
  } else if (body.CallStatus === 'failed') {
    if (sipInfo) {
      errorSource = sipInfo.category;
      errorSummary = sipInfo.userFriendly;
    } else if (sipCode) {
      errorSource = 'network';
      errorSummary = `Erreur réseau (SIP ${sipCode})`;
    } else if (q850Code) {
      errorSource = 'telecom';
      errorSummary = q850Meaning || `Erreur télécom (Q850: ${q850Code})`;
    } else {
      errorSource = 'unknown';
      errorSummary = 'Échec de connexion';
    }
  } else if (body.CallStatus === 'canceled') {
    errorSource = 'system';
    errorSummary = 'Appel annulé par le système';
  }

  // Ajouter contexte STIR/SHAKEN si niveau C
  if (stirShaken?.toUpperCase() === 'C' && errorSource !== 'recipient') {
    errorSummary += ' (attestation faible - possible blocage opérateur)';
  }

  return {
    sipCode: sipCode || null,
    sipMeaning: sipInfo?.meaning || null,
    sipCategory: sipInfo?.category || null,
    sipUserFriendly: sipInfo?.userFriendly || null,
    q850Code: q850Code || null,
    q850Meaning,
    stirShakenStatus: stirShaken || null,
    stirShakenLevel: stirInfo?.level || null,
    stirShakenDescription: stirInfo?.description || null,
    carrierName: carrierName || null,
    carrierCountry: carrierCountry || null,
    fromCountry: fromCountry || null,
    toCountry: toCountry || null,
    errorSource,
    errorSummary,
  };
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

          console.log(`[BONUS] Session définitivement échouée (status: ${session.status}), checking if provider should be set offline`);

          // ✅ BUG FIX: providerId is at ROOT level, fallback to metadata for backward compatibility
          const providerId = session.providerId || session.metadata?.providerId;

          if (!providerId) {
            console.log(`[BONUS] ProviderId non trouvé dans session: ${sessionId}`);
            return;
          }

          console.log(`[BONUS] Attempting to set provider ${providerId} offline`);
          prodLogger.info('PROVIDER_OFFLINE_PROCESSING', `Setting provider offline after no-answer`, { sessionId, providerId });

          // P2-2 FIX: Use transaction for atomic read-then-write to prevent race condition
          // This prevents double updates when both webhook and handleCallFailure try to set offline simultaneously
          const sessionRef = db.collection('call_sessions').doc(sessionId);
          const transactionResult = await db.runTransaction(async (transaction) => {
            const sessionDoc = await transaction.get(sessionRef);
            const sessionData = sessionDoc.data();

            // Check if already processed (atomic read within transaction)
            if (sessionData?.metadata?.providerSetOffline) {
              console.log(`[BONUS] Provider already set offline by another process, skipping`);
              return { wasSetOffline: false, preferredLanguage: 'fr' };
            }

            // Check if provider is still online
            const providerRef = db.collection('sos_profiles').doc(providerId);
            const providerDoc = await transaction.get(providerRef);
            const providerData = providerDoc.data();

            // ✅ EXEMPTION AAA: Les profils AAA ne doivent JAMAIS être mis hors ligne automatiquement
            const isAaaProfile = providerId.startsWith('aaa_') || providerData?.isAAA === true;
            if (isAaaProfile) {
              console.log(`[BONUS] ⏭️ SKIP: Provider ${providerId} is AAA profile - will NOT be set offline`);
              transaction.update(sessionRef, {
                'metadata.providerSetOffline': true,
                'metadata.providerSetOfflineReason': 'aaa_profile_exempt',
                'metadata.providerSetOfflineAt': admin.firestore.FieldValue.serverTimestamp(),
              });
              return { wasSetOffline: false, preferredLanguage: providerData?.preferredLanguage || 'fr' };
            }

            if (!providerData?.isOnline) {
              console.log(`[BONUS] Prestataire ${providerId} déjà hors ligne, marking session only`);
              // Still mark session as processed to prevent future attempts
              transaction.update(sessionRef, {
                'metadata.providerSetOffline': true,
                'metadata.providerSetOfflineReason': 'provider_already_offline_webhook',
                'metadata.providerSetOfflineAt': admin.firestore.FieldValue.serverTimestamp(),
              });
              return { wasSetOffline: false, preferredLanguage: providerData?.preferredLanguage || 'fr' };
            }

            // ✅ BUG FIX: Nettoyer TOUS les champs busy-related en plus de mettre offline
            // Sans ce nettoyage, les champs restent orphelins et peuvent causer des problèmes
            // quand le prestataire se remet en ligne
            const offlineUpdateData = {
              isOnline: false,
              availability: 'offline',
              // Nettoyer les champs busy-related
              currentCallSessionId: admin.firestore.FieldValue.delete(),
              busySince: admin.firestore.FieldValue.delete(),
              busyReason: admin.firestore.FieldValue.delete(),
              busyBySibling: admin.firestore.FieldValue.delete(),
              busySiblingProviderId: admin.firestore.FieldValue.delete(),
              busySiblingCallSessionId: admin.firestore.FieldValue.delete(),
              wasOfflineBeforeCall: admin.firestore.FieldValue.delete(),
              lastStatusChange: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };

            // Update sos_profiles
            transaction.update(providerRef, offlineUpdateData);

            // Update users
            transaction.update(db.collection('users').doc(providerId), offlineUpdateData);

            // Mark session as processed (idempotency)
            transaction.update(sessionRef, {
              'metadata.providerSetOffline': true,
              'metadata.providerSetOfflineReason': 'provider_no_answer_webhook',
              'metadata.providerSetOfflineAt': admin.firestore.FieldValue.serverTimestamp(),
            });

            return { wasSetOffline: true, preferredLanguage: providerData?.preferredLanguage || 'fr' };
          });

          if (!transactionResult.wasSetOffline) {
            console.log(`[BONUS] Provider ${providerId} was not set offline (already processed or already offline)`);
            return;
          }

          console.log(`[BONUS] Provider ${providerId} successfully set offline via transaction`);

          // Récupérer la langue préférée pour la notification (from transaction result)
          const preferredLanguage = transactionResult.preferredLanguage;
          
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

    // ===== STOCKAGE DES DÉTAILS D'ERREUR TWILIO =====
    // P0 FIX: Stocker les codes SIP et détails pour diagnostic admin
    const twilioErrorDetails = extractTwilioErrorDetails(body);

    // Stocker dans la collection call_errors pour suivi admin
    try {
      const db = admin.firestore();
      await db.collection('call_errors').add({
        sessionId,
        participantType,
        callSid: body.CallSid,
        callStatus: body.CallStatus,
        ...twilioErrorDetails,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`📊 [${failedId}] Call error details saved to Firestore`);
    } catch (saveError) {
      console.error(`⚠️ [${failedId}] Failed to save call error details:`, saveError);
    }

    await logCallRecord({
      callId: sessionId,
      status: `${participantType}_call_failed`,
      retryCount: 0,
      errorMessage: `Call failed: ${body.CallStatus}`,
      additionalData: {
        callSid: body.CallSid,
        failureReason: body.CallStatus,
        ...twilioErrorDetails
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
    // P0 CRITICAL FIX: Allow unauthenticated access for Twilio webhooks (Cloud Run requires explicit public access)
    invoker: "public",
    memory: '128MiB',
    cpu: 0.083,
    maxInstances: 1,
    minInstances: 0,
    concurrency: 1,
  },
  async (_req: Request, res: Response) => {
    // Recording desactive - retourner 200 OK pour eviter les retries Twilio
    console.log('[twilioRecordingWebhook] Recording desactive - ignoring callback');
    res.status(200).send('Recording disabled for GDPR compliance');
  }
);

/**
 * TwiML endpoint appelé quand un appel est décroché.
 *
 * AMD DÉSACTIVÉ (2026-01-20): La détection de répondeur (AMD) a été désactivée car elle
 * causait un délai de 3-8 secondes de silence au début de chaque appel.
 *
 * La confirmation DTMF (appuyer sur 1) est utilisée à la place :
 * - Plus fiable (un répondeur ne peut pas appuyer sur une touche)
 * - Pas de délai au décrochage
 * - Timeout de 10 secondes si pas de réponse → retry
 *
 * Note: Le code AMD est conservé pour rétrocompatibilité si on réactive l'AMD.
 */
export const twilioAmdTwiml = onRequest(
  {
    // P0 FIX 2026-02-04: Migrated to dedicated region for call functions to avoid quota issues
    region: CALL_FUNCTIONS_REGION,
    // P0 CRITICAL FIX 2026-02-04: Allow unauthenticated access for Twilio webhooks (Cloud Run requires explicit public access)
    invoker: "public",
    memory: '256MiB',  // P0 FIX: 128MiB was too low (firebase-admin requires ~150MB)
    cpu: 0.25,
    maxInstances: 10,
    minInstances: 0,  // Reduced to 0 to free CPU quota for createPaymentIntent. AMD TwiML is called after AMD detection completes, brief cold start acceptable.
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
      console.log(`🎯 [${amdId}] ████████ twilioAmdTwiml START (AMD DÉSACTIVÉ - DTMF uniquement) ████████`);
      console.log(`🎯 [${amdId}]   sessionId: ${sessionId}`);
      console.log(`🎯 [${amdId}]   participantType: ${participantType}`);
      console.log(`🎯 [${amdId}]   conferenceName: ${conferenceName}`);
      console.log(`🎯 [${amdId}]   timeLimit: ${timeLimit}`);
      console.log(`🎯 [${amdId}]   ttsLocale: ${ttsLocale}`);
      console.log(`🎯 [${amdId}]   langKey: ${langKey}`);
      console.log(`🎯 [${amdId}]   answeredBy: ${answeredBy || 'undefined (AMD désactivé - normal)'}`);
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
      console.log(`🎯 [${amdId}] │ 🧠 AMD DECISION LOGIC TRACE (P0 FIX 2026-01-18 v4)         │`);
      console.log(`🎯 [${amdId}] ├────────────────────────────────────────────────────────────┤`);
      console.log(`🎯 [${amdId}] │ INPUT:                                                     │`);
      console.log(`🎯 [${amdId}] │   answeredBy: "${answeredBy || 'undefined'}"`);
      console.log(`🎯 [${amdId}] │   participantType: "${participantType}"`);
      console.log(`🎯 [${amdId}] │   isMachineStart: ${isMachineStart} (v4: IGNORED - DTMF confirms)`);
      console.log(`🎯 [${amdId}] │   isMachineEnd: ${isMachineEnd} (v4: MACHINE - hang up)`);
      console.log(`🎯 [${amdId}] └────────────────────────────────────────────────────────────┘`);

      // ══════════════════════════════════════════════════════════════════════
      // P0 CRITICAL FIX 2026-01-18 v4: DTMF-BASED MACHINE DETECTION
      // ══════════════════════════════════════════════════════════════════════
      //
      // PREVIOUS PROBLEM (v3):
      //   machine_start was treated as machine → immediate hangup
      //   But machine_start has HIGH FALSE POSITIVE RATE (humans saying "Allô?")
      //   This caused real humans to be hung up on immediately!
      //
      // NEW SOLUTION (v4):
      //   - machine_start → DO NOT HANG UP, let DTMF confirm (press 1)
      //   - machine_end_* → CONFIRMED voicemail (beep heard) → hang up
      //   - fax → hang up
      //
      // BEHAVIOR (v4 - DTMF-based):
      //   ┌─────────────────┬───────────────────────────────────────────────┐
      //   │ answeredBy      │ Action                                        │
      //   ├─────────────────┼───────────────────────────────────────────────┤
      //   │ machine_start   │ IGNORE - let DTMF confirm (high false +rate)  │
      //   │ machine_end_*   │ HANG UP + RETRY (confirmed voicemail w/ beep) │
      //   │ fax             │ HANG UP (fax machine)                         │
      //   │ human           │ CONNECT to conference                         │
      //   │ unknown         │ CONNECT to conference (AMD timeout, assume ok)│
      //   │ undefined       │ AMD PENDING - wait for callback               │
      //   └─────────────────┴───────────────────────────────────────────────┘
      //
      // WHY THIS WORKS:
      //   - DTMF prompt asks user to "press 1 to connect"
      //   - Real humans will press 1 → connected
      //   - Real voicemails can't press 1 → timeout → retry
      //   - machine_start false positives (humans) can still press 1
      //
      // P0 FIX v4: Only hang up on CONFIRMED voicemail (machine_end_*) or fax
      const shouldHangup = isMachineEnd; // v4: Only machine_end_* = hang up (beep heard = confirmed voicemail)

      // ██████████████████████████████████████████████████████████████████████
      // P0 DIAGNOSTIC: HANGUP DECISION
      // ██████████████████████████████████████████████████████████████████████
      console.log(`🎯 [${amdId}] ┌────────────────────────────────────────────────────────────┐`);
      console.log(`🎯 [${amdId}] │ 🚦 HANGUP DECISION (v4 - DTMF-based):                      │`);
      console.log(`🎯 [${amdId}] │   shouldHangup = isMachineEnd (only confirmed voicemail)   │`);
      console.log(`🎯 [${amdId}] │   isMachineStart: ${isMachineStart} (v4: IGNORED - let DTMF confirm)`);
      console.log(`🎯 [${amdId}] │   isMachineEnd: ${isMachineEnd}`);
      console.log(`🎯 [${amdId}] │   shouldHangup: ${shouldHangup}`);
      console.log(`🎯 [${amdId}] │   → ${shouldHangup ? '❌ WILL HANG UP (confirmed voicemail)' : '✅ WILL NOT HANG UP - DTMF will confirm'}`);
      console.log(`🎯 [${amdId}] └────────────────────────────────────────────────────────────┘`);

      if (isMachineStart) {
        // P0 FIX v4: machine_start detected - IGNORE and let DTMF confirm
        console.log(`\n🎯 [${amdId}] ╔════════════════════════════════════════════════════════════╗`);
        console.log(`🎯 [${amdId}] ║ ⚡ P0 FIX v4: machine_start → IGNORING (DTMF will confirm) ║`);
        console.log(`🎯 [${amdId}] ╠════════════════════════════════════════════════════════════╣`);
        console.log(`🎯 [${amdId}] ║ answeredBy: "${answeredBy}"`);
        console.log(`🎯 [${amdId}] ║ participantType: "${participantType}"`);
        console.log(`🎯 [${amdId}] ║ ACTION: NOT hanging up - letting DTMF flow confirm         ║`);
        console.log(`🎯 [${amdId}] ║ REASON: machine_start has HIGH false positive rate         ║`);
        console.log(`🎯 [${amdId}] ║         (humans saying "Allô?" detected as machine)        ║`);
        console.log(`🎯 [${amdId}] ║ NEXT: User must press 1 to connect, timeout = retry        ║`);
        console.log(`🎯 [${amdId}] ╚════════════════════════════════════════════════════════════╝\n`);
        // v4: Do NOT hang up - let DTMF confirm
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
      // P0 FIX 2026-01-18 v4: DTMF-based detection
      // - machine_start → TREAT AS POTENTIAL HUMAN (let DTMF confirm)
      // - machine_end_* → MACHINE (hang up + retry) - already handled above
      // - human → HUMAN CONFIRMED → join conference
      // - unknown → HUMAN (AMD couldn't determine after 30s) → join conference
      // Note: If we reach this point, shouldHangup was FALSE
      const isHumanConfirmed = answeredBy === 'human'
        || (isAsyncAmdCallback && answeredBy === 'unknown')
        || (isAsyncAmdCallback && isMachineStart); // v4: machine_start = let DTMF confirm

      // ██████████████████████████████████████████████████████████████████████
      // P0 DIAGNOSTIC: HUMAN CONFIRMED DECISION
      // ██████████████████████████████████████████████████████████████████████
      console.log(`🎯 [${amdId}] ┌────────────────────────────────────────────────────────────┐`);
      console.log(`🎯 [${amdId}] │ 🧑 HUMAN CONFIRMED DECISION (v4 DTMF-based):               │`);
      console.log(`🎯 [${amdId}] │   isAsyncAmdCallback: ${isAsyncAmdCallback}`);
      console.log(`🎯 [${amdId}] │   answeredBy === 'human': ${answeredBy === 'human'}`);
      console.log(`🎯 [${amdId}] │   isAsyncAmd && unknown: ${isAsyncAmdCallback && answeredBy === 'unknown'}`);
      console.log(`🎯 [${amdId}] │   isMachineStart (v4: treated as POTENTIAL HUMAN): ${isMachineStart}`);
      console.log(`🎯 [${amdId}] │   isMachineEnd (MACHINE - will hang up): ${isMachineEnd}`);
      console.log(`🎯 [${amdId}] │   → isHumanConfirmed: ${isHumanConfirmed}`);
      console.log(`🎯 [${amdId}] │   → ${isHumanConfirmed ? '✅ WILL PLAY DTMF PROMPT' : '⏳ AMD PENDING - HOLD MUSIC'}`);
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
          // P0 FIX 2026-01-18: DO NOT hang up the call! Just ignore the callback.
          // Race condition: The DB might have a newer callSid because a retry started,
          // but this callback is for the CURRENT call that's still valid.
          // Hanging up would kill the active call incorrectly.
          if (callSid && providerCallSid && callSid !== providerCallSid) {
            console.log(`\n${'⚠️'.repeat(35)}`);
            console.log(`🎯 [${amdId}] 🛡️ AMD CALLBACK - CallSid mismatch detected`);
            console.log(`🎯 [${amdId}]   callSid from callback: ${callSid}`);
            console.log(`🎯 [${amdId}]   callSid in DB: ${providerCallSid}`);
            console.log(`🎯 [${amdId}]   ⚠️ NOT hanging up - could be race condition with retry loop`);
            console.log(`🎯 [${amdId}]   ACTION: Return empty response, let call continue naturally`);
            console.log(`${'⚠️'.repeat(35)}\n`);

            // Just return empty response - don't hang up!
            // The call will continue with whatever TwiML is already executing
            res.type('text/xml');
            res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
            return;
          }
        } catch (sessionError) {
          console.warn(`🎯 [${amdId}]   ⚠️ Could not check provider status:`, sessionError);
          // P2-1: Log non-critical errors for monitoring
          await logError('twilioWebhooks:amdCallback:checkProviderStatus', { sessionId, callSid, error: sessionError });
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

        // HUMAN CONFIRMED - Both client and provider should use DTMF confirmation
        // P0 FIX 2026-01-18: AMD can be fooled by voicemail greetings!
        // A voicemail saying "Hello, you've reached..." is detected as "human"
        // SOLUTION: ALWAYS require DTMF confirmation, even when AMD says "human"
        //
        // For ASYNC AMD callbacks, the initial Gather TwiML is already executing.
        // We should NOT override it - just let the Gather flow complete.

        if (participantType === 'client') {
          // P0 FIX 2026-01-18: Check if client already received Gather TwiML
          // If so, ignore AMD callback and let Gather flow complete
          if (isAsyncAmdCallback && sessionId) {
            try {
              const session = await twilioCallManager.getCallSession(sessionId);
              const clientStatus = session?.participants.client.status;

              // If client is waiting for DTMF (amd_pending), don't override!
              if (clientStatus === 'amd_pending') {
                console.log(`\n${'⚠️'.repeat(35)}`);
                console.log(`🎯 [${amdId}] 🛡️ AMD CALLBACK - Client waiting for DTMF confirmation!`);
                console.log(`🎯 [${amdId}]   clientStatus: ${clientStatus}`);
                console.log(`🎯 [${amdId}]   AMD said "human" but this could be voicemail greeting!`);
                console.log(`🎯 [${amdId}]   ACTION: Ignoring AMD - let DTMF confirmation complete`);
                console.log(`${'⚠️'.repeat(35)}\n`);

                // Return empty response - don't disrupt the Gather flow!
                res.type('text/xml');
                res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
                return;
              }

              // If client already connected via DTMF, nothing to do
              if (clientStatus === 'connected') {
                console.log(`🎯 [${amdId}] 🛡️ AMD CALLBACK - Client already CONNECTED via DTMF`);
                res.type('text/xml');
                res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
                return;
              }
            } catch (sessionError) {
              console.warn(`🎯 [${amdId}]   ⚠️ Could not check client status:`, sessionError);
              // P2-1: Log non-critical errors for monitoring
              await logError('twilioWebhooks:amdCallback:checkClientStatus', { sessionId, callSid, error: sessionError });
            }
          }

          // FALLBACK: If we somehow get here, log it but don't set connected directly
          // This path should NOT be reached with proper DTMF flow
          console.log(`🎯 [${amdId}] ⚠️ CLIENT HUMAN CONFIRMED (FALLBACK PATH)`);
          console.log(`🎯 [${amdId}]   This is unexpected - client should use DTMF confirmation`);
          console.log(`🎯 [${amdId}]   Returning empty response`);

          res.type('text/xml');
          res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
          return;
        } else {
          // PROVIDER HUMAN CONFIRMED via async AMD callback
          //
          // P0 FIX 2026-01-18: With DTMF confirmation, provider should NOT be marked as "connected"
          // until they press 1. The Gather TwiML is already executing when this callback arrives.
          //
          // If provider status is "amd_pending", it means Gather is waiting for DTMF input.
          // We should NOT set status to "connected" - let the Gather flow complete.
          //
          console.log(`🎯 [${amdId}] 📞 PROVIDER AMD CALLBACK - Checking if DTMF confirmation in progress...`);
          console.log(`🎯 [${amdId}]   answeredBy: ${answeredBy}`);
          console.log(`🎯 [${amdId}]   isAsyncAmdCallback: ${isAsyncAmdCallback}`);

          if (sessionId) {
            try {
              const session = await twilioCallManager.getCallSession(sessionId);
              const providerStatus = session?.participants.provider.status;
              console.log(`🎯 [${amdId}]   Provider current status: ${providerStatus}`);

              // P0 FIX 2026-01-18: If provider is waiting for DTMF (amd_pending), do NOT set connected!
              // Let the Gather flow complete - twilioGatherResponse will set the correct status
              if (providerStatus === 'amd_pending') {
                console.log(`\n${'⚠️'.repeat(35)}`);
                console.log(`🎯 [${amdId}] 🛡️ PROVIDER WAITING FOR DTMF CONFIRMATION!`);
                console.log(`🎯 [${amdId}]   Status is "amd_pending" - Gather TwiML is executing`);
                console.log(`🎯 [${amdId}]   AMD said "${answeredBy}" but we need DTMF confirmation (press 1)`);
                console.log(`🎯 [${amdId}]   ACTION: NOT setting to "connected" - let Gather flow complete`);
                console.log(`${'⚠️'.repeat(35)}\n`);

                // Return empty response - don't disrupt the Gather flow!
                res.type('text/xml');
                res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
                console.log(`🎯 [${amdId}] END - AMD callback ignored (waiting for DTMF)\n`);
                return;
              }

              // If already connected, nothing to do
              if (providerStatus === 'connected') {
                console.log(`🎯 [${amdId}]   Provider already "connected" - no update needed`);
                res.type('text/xml');
                res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
                console.log(`🎯 [${amdId}] END - Provider already connected\n`);
                return;
              }

              // Provider is in some other status (not amd_pending, not connected)
              // This is unexpected - log and return empty response
              console.log(`🎯 [${amdId}]   Provider in unexpected status: ${providerStatus}`);
              console.log(`🎯 [${amdId}]   Returning empty response to avoid disruption`);
            } catch (statusError) {
              console.error(`🎯 [${amdId}]   ⚠️ Failed to check provider status:`, statusError);
            }
          }

          // Return empty response - don't disrupt the Gather flow
          res.type('text/xml');
          res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
          console.log(`🎯 [${amdId}] END - Provider AMD callback handled\n`);
          return;
        }
      } else {
        // AMD DÉSACTIVÉ: answeredBy sera toujours undefined - c'est normal
        // On utilise le flux DTMF (appuyer sur 1) pour confirmer que c'est un humain
        console.log(`🎯 [${amdId}] 📞 FLUX NORMAL (AMD désactivé) - Envoi du TwiML DTMF`);
        console.log(`🎯 [${amdId}]   answeredBy: "${answeredBy || 'undefined'}" (normal sans AMD)`);
        console.log(`🎯 [${amdId}]   → L'utilisateur devra appuyer sur 1 pour confirmer`);

        // Set status to "amd_pending" (= en attente de confirmation DTMF)
        // Note: Le nom "amd_pending" est historique, signifie maintenant "en attente de DTMF"
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
              console.log(`🎯 [${amdId}]   ✅ Status: amd_pending (en attente confirmation DTMF)`);
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
          // P0 FIX 2026-01-18: CLIENT must confirm with DTMF before joining conference
          // This prevents voicemail from being treated as "connected"
          const { getTwilioGatherResponseUrl } = await import('../utils/urlBase');
          const gatherResponseUrl = getTwilioGatherResponseUrl();

          // Build Gather action URL with all necessary parameters
          const gatherActionUrl = `${gatherResponseUrl}?sessionId=${encodeURIComponent(sessionId)}&participantType=client&conferenceName=${encodeURIComponent(conferenceName)}&timeLimit=${timeLimit}&ttsLocale=${encodeURIComponent(ttsLocale)}&langKey=${encodeURIComponent(langKey)}`;

          // Get intro message + confirmation prompt
          const introMessage = getIntroText('client', langKey);
          const confirmationPrompt = getConfirmationText('client', langKey);
          const noResponseMessage = getNoResponseText(langKey);

          console.log(`🎯 [${amdId}] CLIENT: Using DTMF confirmation (Gather)`);
          console.log(`🎯 [${amdId}]   introMessage: "${introMessage.substring(0, 40)}..."`);
          console.log(`🎯 [${amdId}]   confirmationPrompt: "${confirmationPrompt}"`);
          console.log(`🎯 [${amdId}]   gatherActionUrl: ${gatherActionUrl.substring(0, 80)}...`);

          // TwiML: Play intro, then Gather for DTMF confirmation
          // P0 FIX 2026-01-18: Use <Redirect> instead of <Hangup/> to trigger retry on timeout
          // When Gather times out (no DTMF), Twilio skips to next verb.
          // <Redirect> calls twilioGatherResponse which sets status to "no_answer" → triggers retry
          // P0 FIX 2026-01-18: Escape XML special characters to prevent Error 12100 (Document parse failure)
          const timeoutRedirectUrl = `${gatherResponseUrl}?sessionId=${encodeURIComponent(sessionId)}&participantType=client&conferenceName=${encodeURIComponent(conferenceName)}&timeLimit=${timeLimit}&ttsLocale=${encodeURIComponent(ttsLocale)}&langKey=${encodeURIComponent(langKey)}&timeout=1`;

          const clientGatherTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="${ttsLocale}">${escapeXml(introMessage)}</Say>
  <Gather input="dtmf" numDigits="1" timeout="10" action="${escapeXml(gatherActionUrl)}" method="POST">
    <Say voice="alice" language="${ttsLocale}">${escapeXml(confirmationPrompt)}</Say>
  </Gather>
  <Say voice="alice" language="${ttsLocale}">${escapeXml(noResponseMessage)}</Say>
  <Redirect method="POST">${escapeXml(timeoutRedirectUrl)}</Redirect>
</Response>`;

          res.type('text/xml');
          res.send(clientGatherTwiml);
          console.log(`🎯 [${amdId}] END - Client sent GATHER TwiML (waiting for DTMF confirmation)\n`);
          return;
        } else {
          // P0 FIX 2026-01-18: PROVIDER must confirm with DTMF before joining conference
          // This prevents voicemail from being treated as "connected"
          //
          // PREVIOUS BEHAVIOR (2026-01-16, BROKEN):
          // - Provider joined conference IMMEDIATELY without confirmation
          // - Voicemail answered → marked as "connected" → no retry
          // - Client left waiting while voicemail recorded the hold music
          //
          // NEW BEHAVIOR (2026-01-18, FIXED):
          // - Provider must press 1 to confirm they are human
          // - Only then do they join the conference
          // - If no confirmation (voicemail), hang up and retry
          //
          const { getTwilioGatherResponseUrl } = await import('../utils/urlBase');
          const gatherResponseUrl = getTwilioGatherResponseUrl();

          // Build Gather action URL with all necessary parameters
          const gatherActionUrl = `${gatherResponseUrl}?sessionId=${encodeURIComponent(sessionId)}&participantType=provider&conferenceName=${encodeURIComponent(conferenceName)}&timeLimit=${timeLimit}&ttsLocale=${encodeURIComponent(ttsLocale)}&langKey=${encodeURIComponent(langKey)}`;

          // Get intro message + confirmation prompt
          const introMessage = getIntroText('provider', langKey);
          const confirmationPrompt = getConfirmationText('provider', langKey);
          const noResponseMessage = getNoResponseText(langKey);

          console.log(`🎯 [${amdId}] PROVIDER: Using DTMF confirmation (Gather)`);
          console.log(`🎯 [${amdId}]   introMessage: "${introMessage.substring(0, 40)}..."`);
          console.log(`🎯 [${amdId}]   confirmationPrompt: "${confirmationPrompt}"`);
          console.log(`🎯 [${amdId}]   gatherActionUrl: ${gatherActionUrl.substring(0, 80)}...`);

          // TwiML: Play intro, then Gather for DTMF confirmation
          // P0 FIX 2026-01-18: Use <Redirect> instead of <Hangup/> to trigger retry on timeout
          // When Gather times out (no DTMF), Twilio skips to next verb.
          // <Redirect> calls twilioGatherResponse which sets status to "no_answer" → triggers retry
          // P0 FIX 2026-01-18: Escape XML special characters to prevent Error 12100 (Document parse failure)
          const timeoutRedirectUrl = `${gatherResponseUrl}?sessionId=${encodeURIComponent(sessionId)}&participantType=provider&conferenceName=${encodeURIComponent(conferenceName)}&timeLimit=${timeLimit}&ttsLocale=${encodeURIComponent(ttsLocale)}&langKey=${encodeURIComponent(langKey)}&timeout=1`;

          const providerGatherTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="${ttsLocale}">${escapeXml(introMessage)}</Say>
  <Gather input="dtmf" numDigits="1" timeout="10" action="${escapeXml(gatherActionUrl)}" method="POST">
    <Say voice="alice" language="${ttsLocale}">${escapeXml(confirmationPrompt)}</Say>
  </Gather>
  <Say voice="alice" language="${ttsLocale}">${escapeXml(noResponseMessage)}</Say>
  <Redirect method="POST">${escapeXml(timeoutRedirectUrl)}</Redirect>
</Response>`;

          // NOTE: Do NOT set status to "connected" here!
          // The status will be set by twilioGatherResponse ONLY if the provider presses 1
          // This ensures voicemails are not marked as "connected"

          res.type('text/xml');
          res.send(providerGatherTwiml);
          console.log(`🎯 [${amdId}] END - Provider sent GATHER TwiML (waiting for DTMF confirmation)\n`);
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

      // P0 FIX 2026-01-18: Escape XML special characters to prevent Error 12100
      const conferenceTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="${ttsLocale}">${escapeXml(welcomeMessage)}</Say>
  <Dial timeout="60" timeLimit="${timeLimit}">
    <Conference
      waitUrl="http://twimlets.com/holdmusic?Bucket=com.twilio.music.classical"
      startConferenceOnEnter="${startConference}"
      endConferenceOnExit="true"
      statusCallback="${escapeXml(conferenceWebhookUrl)}"
      statusCallbackEvent="start end join leave"
      statusCallbackMethod="POST"
      participantLabel="${participantType}"
    >${escapeXml(conferenceName)}</Conference>
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
    // P0 FIX 2026-02-04: Migrated to dedicated region for call functions to avoid quota issues
    region: CALL_FUNCTIONS_REGION,
    // P0 CRITICAL FIX 2026-02-04: Allow unauthenticated access for Twilio webhooks (Cloud Run requires explicit public access)
    invoker: "public",
    memory: '256MiB',
    cpu: 0.25,
    maxInstances: 10,
    minInstances: 1,  // P0 FIX: Keep warm for instant DTMF response handling
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
      // P0 FIX 2026-01-18: timeout=1 indicates Gather timed out (no DTMF input)
      const isGatherTimeout = req.query.timeout === '1';

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
      console.log(`🎤 [${gatherId}]   isGatherTimeout: ${isGatherTimeout}`);
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
        // Participant confirmed! Set status to connected and join conference
        console.log(`🎤 [${gatherId}] 🎉 ${participantType.toUpperCase()} CONFIRMED - Setting status to "connected" and joining conference`);

        if (sessionId) {
          try {
            await twilioCallManager.updateParticipantStatus(
              sessionId,
              participantType,
              'connected',
              admin.firestore.Timestamp.fromDate(new Date())
            );
            console.log(`🎤 [${gatherId}]   ✅ ${participantType} status set to "connected"`);

            // If provider confirmed, mark them as BUSY
            if (participantType === 'provider') {
              try {
                const session = await twilioCallManager.getCallSession(sessionId);
                // ✅ BUG FIX: providerId is at ROOT level, fallback to metadata for backward compatibility
                const providerId = session?.providerId || session?.metadata?.providerId;
                if (providerId) {
                  console.log(`🎤 [${gatherId}]   🔶 Setting provider ${providerId} to BUSY...`);
                  await setProviderBusy(providerId, sessionId, 'in_call');
                  console.log(`🎤 [${gatherId}]   ✅ Provider ${providerId} marked as BUSY`);
                } else {
                  console.warn(`🎤 [${gatherId}]   ⚠️ Cannot set provider busy - providerId not found in session`);
                }
              } catch (busyError) {
                console.error(`🎤 [${gatherId}]   ⚠️ Failed to set provider busy (non-blocking):`, busyError);
              }
            }
          } catch (statusError) {
            console.error(`🎤 [${gatherId}]   ⚠️ Failed to update status:`, statusError);
          }
        }

        // Get welcome message (already heard intro, so just a brief message)
        // Build conference TwiML with correct settings based on participant type
        const { getTwilioConferenceWebhookUrl } = await import('../utils/urlBase');
        const conferenceWebhookUrl = getTwilioConferenceWebhookUrl();

        // Client starts conference, provider joins existing conference
        const startConferenceOnEnter = participantType === 'client' ? 'true' : 'false';
        // P0 FIX 2026-01-18: BOTH participants ending should end conference!
        // BUG FIXED: Previously provider had endConferenceOnExit=false, so when provider hung up,
        // the client stayed connected on hold music and CONTINUED TO PAY!
        // Now BOTH participants end the conference when they exit.
        const endConferenceOnExit = 'true'; // Always true for both client and provider

        console.log(`🎤 [${gatherId}]   startConferenceOnEnter: ${startConferenceOnEnter}`);
        console.log(`🎤 [${gatherId}]   endConferenceOnExit: ${endConferenceOnExit}`);

        // P0 FIX 2026-01-18: Escape XML special characters to prevent Error 12100
        const conferenceTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="60" timeLimit="${timeLimit}">
    <Conference
      waitUrl="http://twimlets.com/holdmusic?Bucket=com.twilio.music.classical"
      startConferenceOnEnter="${startConferenceOnEnter}"
      endConferenceOnExit="${endConferenceOnExit}"
      statusCallback="${escapeXml(conferenceWebhookUrl)}"
      statusCallbackEvent="start end join leave"
      statusCallbackMethod="POST"
      participantLabel="${participantType}"
    >${escapeXml(conferenceName)}</Conference>
  </Dial>
</Response>`;

        res.type('text/xml');
        res.send(conferenceTwiml);
        console.log(`🎤 [${gatherId}] END - ${participantType} joining conference\n`);

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

        // P0 FIX 2026-01-18: Escape XML special characters to prevent Error 12100
        const hangupTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="${ttsLocale}">${escapeXml(noResponseMessage)}</Say>
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