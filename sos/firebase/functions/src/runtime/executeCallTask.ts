// firebase/functions/src/runtime/executeCallTask.ts - VERSION CORRIGÉE
import { Request, Response } from "express";
// import { onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";
import { getTwilioClient, getTwilioPhoneNumber } from "../lib/twilio";
import { beginOutboundCallForSession } from "../services/twilioCallManagerAdapter";
import { logError } from "../utils/logs/logError";
import { logCallRecord } from "../utils/logs/logCallRecord";
import { captureError } from "../config/sentry";

// P0 FIX: Import from centralized secrets - NEVER call defineSecret() here!
import {
  TASKS_AUTH_SECRET,
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER,
  TWILIO_SECRETS,
  getTasksAuthSecret,
} from "../lib/secrets";

// Re-export for backwards compatibility
export { TASKS_AUTH_SECRET, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, TWILIO_SECRETS };

const db = getFirestore();

// --- Handler principal ---
export async function runExecuteCallTask(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  let callSessionId = '';
  
  try {
    logger.info('🔍 [executeCallTask] === DÉBUT EXÉCUTION ===');
    logger.info('🔍 [executeCallTask] Method:', req.method);
    logger.info('🔍 [executeCallTask] Headers:', JSON.stringify(req.headers, null, 2));
    logger.info('🔍 [executeCallTask] Raw Body:', req.body);

    // ✅ ÉTAPE 1: Authentification Cloud Tasks
    const authHeader = req.get("X-Task-Auth") || "";
    const expectedAuth = getTasksAuthSecret() || "";
    
    logger.info('🔐 [executeCallTask] Auth check:', {
      hasAuthHeader: !!authHeader,
      authHeaderLength: authHeader.length,
      hasExpectedAuth: !!expectedAuth,
      expectedAuthLength: expectedAuth.length,
      authMatch: authHeader === expectedAuth
    });

    if (!authHeader) {
      logger.error('❌ [executeCallTask] Missing X-Task-Auth header');
      res.status(401).send("Missing X-Task-Auth header");
      return;
    }

    if (authHeader !== expectedAuth) {
      logger.error('❌ [executeCallTask] Invalid X-Task-Auth header');
      res.status(401).send("Invalid X-Task-Auth header");
      return;
    }

    logger.info('✅ [executeCallTask] Authentication successful');

    // ✅ ÉTAPE 2: Extraction du payload
    const requestBody = req.body || {};

    // P0 FIX: Suppression du fallback hardcodé - DOIT échouer si pas de callSessionId
    callSessionId = requestBody.callSessionId;

    logger.info('📋 [executeCallTask] Payload extracted:', {
      hasBody: !!req.body,
      bodyKeys: Object.keys(requestBody),
      callSessionId: callSessionId || 'MISSING',
      fullPayload: JSON.stringify(requestBody, null, 2)
    });

    if (!callSessionId) {
      logger.error('❌ [executeCallTask] Missing callSessionId in request body');
      logger.error('❌ [executeCallTask] Available keys:', Object.keys(requestBody));
      await logError('executeCallTask:missingCallSessionId', {
        body: requestBody,
        keys: Object.keys(requestBody)
      });
      res.status(400).json({
        success: false,
        error: "Missing callSessionId in request body",
        availableKeys: Object.keys(requestBody)
      });
      return;
    }

    logger.info(`📞 [executeCallTask] Processing call session: ${callSessionId}`);

    // ✅ ÉTAPE 3: IDEMPOTENCE CHECK - Empêcher les exécutions multiples
    const lockRef = db.collection('call_execution_locks').doc(callSessionId);
    const lockDoc = await lockRef.get();

    if (lockDoc.exists) {
      const lockData = lockDoc.data();
      const lockStatus = lockData?.status;
      const lockAge = Date.now() - (lockData?.createdAt?.toMillis() || 0);

      // Si déjà en cours d'exécution ou complété (et lock < 10 minutes)
      if ((lockStatus === 'executing' || lockStatus === 'completed') && lockAge < 10 * 60 * 1000) {
        logger.info(`⏭️ [executeCallTask] IDEMPOTENCE: Session ${callSessionId} already ${lockStatus}, skipping`);
        res.status(200).json({
          success: true,
          message: `Call already ${lockStatus}`,
          callSessionId,
          idempotent: true
        });
        return;
      }
    }

    // Créer/mettre à jour le lock
    await lockRef.set({
      status: 'executing',
      createdAt: new Date(),
      updatedAt: new Date()
    }, { merge: true });

    logger.info(`🔒 [executeCallTask] Lock acquired for session: ${callSessionId}`);

    // ✅ ÉTAPE 4: Log initial
    await logCallRecord({
      callId: callSessionId,
      status: 'cloud_task_received',
      retryCount: 0,
      additionalData: {
        executedAt: new Date().toISOString(),
        requestMethod: req.method,
        userAgent: req.get('User-Agent') || 'unknown'
      }
    });

    // ✅ ÉTAPE 4: Vérification Twilio (pour les logs)
    logger.info('📞 [executeCallTask] Checking Twilio credentials...');
    
    try {
      const twilio = getTwilioClient();
      const fromNumber = getTwilioPhoneNumber();
      logger.info('✅ [executeCallTask] Twilio credentials OK:', {
        hasClient: !!twilio,
        fromNumber: fromNumber ? fromNumber.substring(0, 5) + '...' : 'MISSING'
      });
    } catch (twilioError) {
      logger.error('❌ [executeCallTask] Twilio credentials issue:', twilioError);
      // Continue quand même car TwilioCallManager gère ses propres credentials
    }

    // ✅ ÉTAPE 5: Re-check provider availability before calling
    logger.info(`🔍 [executeCallTask] Re-checking provider availability for: ${callSessionId}`);
    const callSessionDoc = await db.collection('call_sessions').doc(callSessionId).get();
    if (callSessionDoc.exists) {
      const sessionData = callSessionDoc.data();
      const providerId = sessionData?.providerId;
      if (providerId) {
        const profileDoc = await db.collection('sos_profiles').doc(providerId).get();
        const profileData = profileDoc.data();
        if (profileData && profileData.status !== 'available') {
          logger.warn(`⚠️ [executeCallTask] Provider ${providerId} is no longer available (status: ${profileData.status}), aborting call`);
          await lockRef.update({ status: 'aborted_provider_unavailable', updatedAt: new Date() });

          // C1 AUDIT FIX: Cancel payment immediately when provider is unavailable
          // Without this, the payment authorization stays blocked on the client's card
          let paymentCancelled = false;
          try {
            const { twilioCallManager } = await import("../TwilioCallManager");
            await twilioCallManager.cancelCallSession(
              callSessionId,
              'provider_unavailable_at_execution',
              'executeCallTask'
            );
            paymentCancelled = true;
            logger.info(`✅ [executeCallTask] Payment cancelled/refunded for unavailable provider`);
          } catch (refundError) {
            logger.error(`❌ [executeCallTask] Failed to cancel payment:`, refundError);
            await logError('executeCallTask:refundOnProviderUnavailable', refundError);
          }

          res.status(200).json({
            success: false,
            error: 'Provider no longer available',
            callSessionId,
            providerStatus: profileData.status,
            paymentCancelled,
          });
          return;
        }
        logger.info(`✅ [executeCallTask] Provider ${providerId} still available`);
      }
    }

    // ✅ ÉTAPE 5b: Exécution via l'adapter
    logger.info(`🚀 [executeCallTask] Starting call execution for: ${callSessionId}`);

    const callResult = await beginOutboundCallForSession(callSessionId);
    logger.info('✅ [executeCallTask] Call execution result:', callResult);

    const executionTime = Date.now() - startTime;

    logger.info('✅ [executeCallTask] Call execution completed:', {
      callSessionId,
      executionTimeMs: executionTime,
      resultStatus: callResult?.status || 'unknown',
      hasResult: !!callResult
    });

    // ✅ ÉTAPE 6: Log de succès + mise à jour du lock
    await lockRef.update({
      status: 'completed',
      updatedAt: new Date(),
      completedAt: new Date()
    });

    await logCallRecord({
      callId: callSessionId,
      status: 'cloud_task_completed_successfully',
      retryCount: 0,
      additionalData: {
        executionTimeMs: executionTime,
        completedAt: new Date().toISOString(),
        resultStatus: callResult?.status || 'unknown'
      }
    });

    // ✅ ÉTAPE 7: Réponse de succès
    const response = {
      success: true,
      callSessionId,
      executionTimeMs: executionTime,
      result: callResult,
      timestamp: new Date().toISOString()
    };

    logger.info('🎉 [executeCallTask] === SUCCÈS ===');
    logger.info('🎉 [executeCallTask] Response:', JSON.stringify(response, null, 2));

    res.status(200).json(response);
    return;

  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    logger.error('❌ [executeCallTask] === ERREUR ===');
    logger.error('❌ [executeCallTask] Error details:', {
      callSessionId: callSessionId || 'unknown',
      executionTimeMs: executionTime,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      errorType: error instanceof Error ? error.constructor.name : 'UnknownError'
    });

    // Logger l'erreur
    await logError('executeCallTask:runExecuteCallTask', error);
    captureError(error, { functionName: 'executeCallTask', extra: { callSessionId } });

    if (callSessionId) {
      // Mettre à jour le lock avec l'échec
      try {
        await db.collection('call_execution_locks').doc(callSessionId).update({
          status: 'failed',
          updatedAt: new Date(),
          failedAt: new Date(),
          error: error instanceof Error ? error.message : String(error)
        });
      } catch (lockError) {
        logger.error('Failed to update lock:', lockError);
      }

      await logCallRecord({
        callId: callSessionId,
        status: 'cloud_task_failed',
        retryCount: 0,
        errorMessage: error instanceof Error ? error.message : String(error),
        additionalData: {
          executionTimeMs: executionTime,
          failedAt: new Date().toISOString(),
          errorType: error instanceof Error ? error.constructor.name : 'UnknownError'
        }
      });
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorType = error instanceof Error ? error.constructor.name : 'UnknownError';

    // P0 AUDIT FIX: Distinguish transient vs permanent errors
    // Transient errors (Twilio API timeout, network issues) → 500 so Cloud Tasks retries
    // Permanent errors (validation, bad data) → 200 to prevent futile retries
    const isTransientError =
      errorMessage.includes('ETIMEDOUT') ||
      errorMessage.includes('ECONNRESET') ||
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ENETUNREACH') ||
      errorMessage.includes('socket hang up') ||
      errorMessage.includes('network') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('503') ||
      errorMessage.includes('502') ||
      errorMessage.includes('429') ||
      errorType === 'FetchError' ||
      errorType === 'AbortError';

    const errorResponse = {
      success: false,
      error: errorMessage,
      callSessionId: callSessionId || 'unknown',
      executionTimeMs: executionTime,
      timestamp: new Date().toISOString(),
      handled: !isTransientError,
      transient: isTransientError,
    };

    if (isTransientError) {
      // P0 AUDIT FIX: Return 500 for transient errors so Cloud Tasks will retry
      logger.error(`❌ [executeCallTask] TRANSIENT error — returning 500 for Cloud Tasks retry`);
      res.status(500).json(errorResponse);
    } else {
      // Permanent error — return 200 to prevent futile retries
      logger.error(`❌ [executeCallTask] PERMANENT error — returning 200 (no retry needed)`);
      res.status(200).json(errorResponse);
    }
    return;
  }
}

// --- Fonction Firebase v2 avec configuration optimisée ---
// export const executeCallTask = onRequest(
//   {
//     region: "europe-west1",
//     memory: "512MiB",
//     cpu: 0.25,              // réduit la pression CPU
//     maxInstances: 10,       // limite le fan-out
//     minInstances: 0,        // pas de réservation permanente
//     concurrency: 1,         // OK avec cpu < 1
//     timeoutSeconds: 120
//   },
//   (req, res) => runExecuteCallTask(req as Request, res as Response)
// );