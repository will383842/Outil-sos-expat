// firebase/functions/src/services/twilioCallManagerAdapter.ts - VERSION CORRIGÉE SANS RÉFÉRENCES CIRCULAIRES
// ============================================================================
// P0 DEBUG VERSION - Exhaustive logging for booking flow debugging
// ============================================================================
import { getFirestore } from "firebase-admin/firestore";
import { logError } from "../utils/logs/logError";
import { logCallRecord } from "../utils/logs/logCallRecord";

/**
 * ✅ Fonction principale pour exécuter un appel via Cloud Tasks
 * Cette fonction utilise directement TwilioCallManager sans dépendances circulaires
 */
export async function beginOutboundCallForSession(callSessionId: string) {
  const startTime = Date.now();
  const debugId = `adapter_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

  console.log(`\n`);
  console.log(`=======================================================================`);
  console.log(`🚀 [Adapter][${debugId}] ========== BEGIN OUTBOUND CALL ==========`);
  console.log(`=======================================================================`);
  console.log(`🚀 [Adapter][${debugId}] CallSessionId: ${callSessionId}`);
  console.log(`🚀 [Adapter][${debugId}] Timestamp: ${new Date().toISOString()}`);
  console.log(`🚀 [Adapter][${debugId}] Node version: ${process.version}`);
  console.log(`🚀 [Adapter][${debugId}] Environment: ${process.env.NODE_ENV || 'unknown'}`);

  try {
    // ✅ ÉTAPE 1: Connexion Firestore
    console.log(`\n📂 [Adapter][${debugId}] STEP 1: Connecting to Firestore...`);
    const db = getFirestore();
    console.log(`✅ [Adapter][${debugId}] Firestore connection OK`);

    // ✅ ÉTAPE 2: Récupération session
    console.log(`\n📂 [Adapter][${debugId}] STEP 2: Fetching session document...`);
    console.log(`📂 [Adapter][${debugId}] Collection: call_sessions, DocID: ${callSessionId}`);

    const sessionDoc = await db.collection("call_sessions").doc(callSessionId).get();

    console.log(`📂 [Adapter][${debugId}] Session fetch result:`, {
      exists: sessionDoc.exists,
      id: sessionDoc.id,
      ref: sessionDoc.ref.path
    });

    if (!sessionDoc.exists) {
      console.error(`❌ [Adapter][${debugId}] CRITICAL: Session ${callSessionId} NOT FOUND in Firestore!`);
      console.error(`❌ [Adapter][${debugId}] This means the session was never created or was deleted.`);
      throw new Error(`Session ${callSessionId} introuvable dans call_sessions`);
    }

    const sessionData = sessionDoc.data();

    // ✅ ÉTAPE 3: Log session complet
    console.log(`\n📊 [Adapter][${debugId}] STEP 3: Session data analysis:`);
    console.log(`📊 [Adapter][${debugId}] Session ID: ${sessionData?.id || callSessionId}`);
    console.log(`📊 [Adapter][${debugId}] Status: ${sessionData?.status}`);
    console.log(`📊 [Adapter][${debugId}] ClientId: ${sessionData?.clientId || sessionData?.metadata?.clientId}`);
    console.log(`📊 [Adapter][${debugId}] ProviderId: ${sessionData?.providerId || sessionData?.metadata?.providerId}`);
    console.log(`📊 [Adapter][${debugId}] ServiceType: ${sessionData?.metadata?.serviceType}`);
    console.log(`📊 [Adapter][${debugId}] ProviderType: ${sessionData?.metadata?.providerType}`);
    console.log(`📊 [Adapter][${debugId}] PaymentIntentId: ${sessionData?.payment?.intentId}`);
    console.log(`📊 [Adapter][${debugId}] Payment status: ${sessionData?.payment?.status}`);
    console.log(`📊 [Adapter][${debugId}] Amount: ${sessionData?.payment?.amount}€`);

    // 📱 PHONE NUMBERS - CRITICAL
    console.log(`\n📱 [Adapter][${debugId}] STEP 4: PHONE NUMBERS ANALYSIS:`);
    console.log(`📱 [Adapter][${debugId}] Client phone (encrypted): ${sessionData?.participants?.client?.phone ? sessionData.participants.client.phone.substring(0, 20) + '...' : 'MISSING!'}`);
    console.log(`📱 [Adapter][${debugId}] Provider phone (encrypted): ${sessionData?.participants?.provider?.phone ? sessionData.participants.provider.phone.substring(0, 20) + '...' : 'MISSING!'}`);
    console.log(`📱 [Adapter][${debugId}] Has client phone: ${!!sessionData?.participants?.client?.phone}`);
    console.log(`📱 [Adapter][${debugId}] Has provider phone: ${!!sessionData?.participants?.provider?.phone}`);
    console.log(`📱 [Adapter][${debugId}] Client phone length: ${sessionData?.participants?.client?.phone?.length || 0}`);
    console.log(`📱 [Adapter][${debugId}] Provider phone length: ${sessionData?.participants?.provider?.phone?.length || 0}`);

    // Check for missing phones
    if (!sessionData?.participants?.client?.phone) {
      console.error(`❌ [Adapter][${debugId}] CRITICAL: Client phone is MISSING!`);
    }
    if (!sessionData?.participants?.provider?.phone) {
      console.error(`❌ [Adapter][${debugId}] CRITICAL: Provider phone is MISSING!`);
    }

    // 🔧 FIX LANGUAGE ISSUE BEFORE CALLING TwilioCallManager:
    // Default to English ('en') as universal fallback when no language is specified
    console.log(`\n🔧 [Adapter][${debugId}] STEP 5: Language check...`);
    if (!sessionData?.metadata?.clientLanguages) {
      console.log(`🔧 [Adapter][${debugId}] Adding missing clientLanguages (defaulting to ['en'])`);
      await db.collection("call_sessions").doc(callSessionId).update({
        'metadata.clientLanguages': ['en'],
        'metadata.providerLanguages': sessionData?.metadata?.providerLanguages || ['en'],
        'metadata.updatedAt': new Date()
      });
      console.log(`✅ [Adapter][${debugId}] Languages updated in Firestore`);
    } else {
      console.log(`✅ [Adapter][${debugId}] Languages already present: ${JSON.stringify(sessionData.metadata.clientLanguages)}`);
    }

    // ✅ ÉTAPE 6: Vérifier le paiement avant de continuer
    console.log(`\n💰 [Adapter][${debugId}] STEP 6: Payment verification...`);
    const paymentStatus = sessionData?.payment?.status;
    console.log(`💰 [Adapter][${debugId}] Payment status: ${paymentStatus}`);
    console.log(`💰 [Adapter][${debugId}] Payment intent ID: ${sessionData?.payment?.intentId}`);
    console.log(`💰 [Adapter][${debugId}] Payment amount: ${sessionData?.payment?.amount}€`);

    // P0 SECURITY FIX: Vérifier que le paiement EST autorisé (pas juste qu'il n'est pas refusé)
    // Statuts valides:
    // - "authorized" (PayPal après authorizeOrder)
    // - "requires_capture" (Stripe avec capture_method: manual)
    const validPaymentStatuses = ["authorized", "requires_capture"];
    if (!paymentStatus || !validPaymentStatuses.includes(paymentStatus)) {
      console.error(`❌ [Adapter][${debugId}] Payment NOT authorized!`);
      console.error(`❌ [Adapter][${debugId}] Expected: 'authorized' or 'requires_capture', Got: '${paymentStatus}'`);
      throw new Error(`Paiement non autorisé pour session ${callSessionId} (status=${paymentStatus})`);
    }
    console.log(`✅ [Adapter][${debugId}] Payment verified OK (status: ${paymentStatus})`);

    // ✅ ÉTAPE 7: Import et appel TwilioCallManager
    console.log(`\n📞 [Adapter][${debugId}] STEP 7: Importing TwilioCallManager...`);
    const importStart = Date.now();
    const { TwilioCallManager } = await import("../TwilioCallManager");
    console.log(`✅ [Adapter][${debugId}] TwilioCallManager imported in ${Date.now() - importStart}ms`);

    console.log(`\n📞 [Adapter][${debugId}] STEP 8: Starting outbound call...`);
    console.log(`📞 [Adapter][${debugId}] Calling TwilioCallManager.startOutboundCall({`);
    console.log(`📞 [Adapter][${debugId}]   sessionId: ${callSessionId},`);
    console.log(`📞 [Adapter][${debugId}]   delayMinutes: 0`);
    console.log(`📞 [Adapter][${debugId}] })`);

    const callStart = Date.now();
    const result = await TwilioCallManager.startOutboundCall({
      sessionId: callSessionId,
      delayMinutes: 0  // Immédiat car déjà programmé par Cloud Tasks
    });
    const callDuration = Date.now() - callStart;

    console.log(`\n✅ [Adapter][${debugId}] STEP 9: Call result received in ${callDuration}ms:`);
    console.log(`✅ [Adapter][${debugId}] Result status: ${result?.status || 'unknown'}`);
    console.log(`✅ [Adapter][${debugId}] Result object:`, JSON.stringify(result, null, 2));

    // ✅ ÉTAPE 10: Logger le succès
    console.log(`\n📝 [Adapter][${debugId}] STEP 10: Logging success...`);
    await logCallRecord({
      callId: callSessionId,
      status: 'cloud_task_executed_successfully',
      retryCount: 0,
      additionalData: {
        adaptedVia: 'beginOutboundCallForSession',
        resultStatus: result?.status || 'unknown',
        debugId,
        totalDurationMs: Date.now() - startTime
      }
    });

    const totalDuration = Date.now() - startTime;
    console.log(`\n=======================================================================`);
    console.log(`✅ [Adapter][${debugId}] ========== CALL INITIATED SUCCESSFULLY ==========`);
    console.log(`✅ [Adapter][${debugId}] Total execution time: ${totalDuration}ms`);
    console.log(`=======================================================================\n`);

    return result;

  } catch (error) {
    const errorDuration = Date.now() - startTime;

    console.error(`\n=======================================================================`);
    console.error(`❌ [Adapter][${debugId}] ========== CALL FAILED ==========`);
    console.error(`=======================================================================`);
    console.error(`❌ [Adapter][${debugId}] CallSessionId: ${callSessionId}`);
    console.error(`❌ [Adapter][${debugId}] Duration before error: ${errorDuration}ms`);
    console.error(`❌ [Adapter][${debugId}] Error type: ${error instanceof Error ? error.constructor.name : typeof error}`);
    console.error(`❌ [Adapter][${debugId}] Error message: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`❌ [Adapter][${debugId}] Error stack:`, error instanceof Error ? error.stack : 'No stack');
    console.error(`=======================================================================\n`);

    // Logger l'erreur
    await logError(`twilioCallManagerAdapter:beginOutboundCallForSession`, error);

    await logCallRecord({
      callId: callSessionId,
      status: 'cloud_task_execution_failed',
      retryCount: 0,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      additionalData: {
        adaptedVia: 'beginOutboundCallForSession',
        errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
        debugId,
        durationBeforeErrorMs: errorDuration
      }
    });

    throw error;
  }
}

/**
 * ✅ Version de compatibilité avec l'ancienne signature
 * Accepte les paramètres twilio et fromNumber mais ne les utilise pas
 */
export async function beginOutboundCallForSessionLegacy({
  callSessionId}: {
  callSessionId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  twilio?: any; // Paramètre optionnel pour compatibilité
  fromNumber?: string; // Paramètre optionnel pour compatibilité
}) {
  // Déléguer à la fonction principale
  return beginOutboundCallForSession(callSessionId);
}
