// ✅ Import corrigé - utilisation de la planification idempotente par tâches
import { scheduleCallTaskWithIdempotence } from '../lib/tasks';
import { getFirestore } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';

// 🔧 FIX CRITIQUE: Configuration d'optimisation CPU
const CPU_OPTIMIZED_CONFIG = {
  region: 'europe-west1' as const,
  cors: true,
  memory: '256MiB' as const,
  cpu: 0.25 as const,
  timeoutSeconds: 30,
  maxInstances: 3,
  minInstances: 0,
  concurrency: 1
};

const db = getFirestore();

// 🔍 Interface pour la nouvelle structure des données
interface CallSessionData {
  participants?: {
    provider?: { phone?: string };
    client?: { phone?: string };
  };
  metadata?: {
    title?: string;
    clientLanguages?: string[];
  };
  sessionId?: string;
  status?: string;

  // ⚠️ DEPRECATED: Ancienne structure (fallback seulement)
  providerPhone?: string;
  clientPhone?: string;
  title?: string;
  clientLanguages?: string[];
}

// ✅ Fonction interne (pour usage depuis d'autres Cloud Functions comme les webhooks)
export async function notifyAfterPaymentInternal(callId: string): Promise<void> {
  const startTime = Date.now();

  try {
    logger.info(`🚀 Début notifyAfterPaymentInternal pour callId: ${callId}`);

    // ✅ CORRECT: Utiliser la collection 'call_sessions'
    const callDoc = await db.collection('call_sessions').doc(callId).get();

    if (!callDoc.exists) {
      logger.warn(`⚠️ Document call_sessions/${callId} introuvable`);
      return;
    }

    const callData = callDoc.data() as CallSessionData;

    if (!callData) {
      logger.warn(`⚠️ Données vides pour callId: ${callId}`);
      return;
    }

    // ✅ CORRECT: Mapping des nouveaux champs avec fallback robuste
    const providerPhone = callData.participants?.provider?.phone ?? callData.providerPhone ?? '';
    const clientPhone = callData.participants?.client?.phone ?? callData.clientPhone ?? '';

    // 🛡️ Validation stricte des données critiques
    if (!providerPhone || !clientPhone) {
      const error = `Numéros de téléphone manquants - Provider: ${providerPhone ? '✓' : '✗'}, Client: ${clientPhone ? '✓' : '✗'}`;
      logger.error(`❌ ${error}`, {
        callId,
        hasProvider: !!providerPhone,
        hasClient: !!clientPhone,
        structureInfo: {
          hasParticipants: !!callData.participants,
          hasProviderData: !!callData.participants?.provider,
          hasClientData: !!callData.participants?.client,
          hasMetadata: !!callData.metadata
        }
      });
      throw new Error(error);
    }

    // 📱 Validation format téléphone (renforcée)
    const phoneRegex = /^\+[1-9]\d{7,14}$/; // Au moins 8 chiffres après le +
    if (!phoneRegex.test(providerPhone)) {
      logger.error(`❌ Format téléphone provider invalide: ${providerPhone}`, { callId });
      throw new Error(`Format téléphone provider invalide: ${providerPhone}`);
    }
    if (!phoneRegex.test(clientPhone)) {
      logger.error(`❌ Format téléphone client invalide: ${clientPhone}`, { callId });
      throw new Error(`Format téléphone client invalide: ${clientPhone}`);
    }

    logger.info(`📋 Données extraites`, {
      callId,
      providerPhone: `${providerPhone.substring(0, 6)}***`,
      clientPhone: `${clientPhone.substring(0, 6)}***`,
      dataSource: callData.participants?.provider?.phone ? 'NEW_STRUCTURE' : 'LEGACY_FALLBACK'
    });

    // 🔁 Planification de l'appel vocal
    try {
      // 🔧 FIX: Utiliser callId comme sessionId par défaut si non spécifié
      // P1-1 FIX: Utiliser la version idempotente pour éviter les appels multiples
      const callSessionId = callData.sessionId || callId;
      await scheduleCallTaskWithIdempotence(callSessionId, 5 * 60); // 5 minutes

      logger.info(`⏰ Tâche d'appel planifiée`, {
        callId,
        callSessionId,
        delayMinutes: 5
      });
    } catch (scheduleError) {
      // ⚠️ Log mais ne fait pas échouer toute la fonction
      logger.error(`❌ Erreur planification appel (non-bloquante)`, {
        callId,
        error: scheduleError instanceof Error ? scheduleError.message : 'Erreur inconnue'
      });
    }

    // 📊 Métriques de performance
    const totalDuration = Date.now() - startTime;
    logger.info(`🏁 notifyAfterPaymentInternal terminée`, {
      callId,
      totalDuration: `${totalDuration}ms`,
      success: true
    });

  } catch (error) {
    const totalDuration = Date.now() - startTime;
    logger.error(`💥 Erreur dans notifyAfterPaymentInternal`, {
      callId,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${totalDuration}ms`
    });
    throw error;
  }
}

// ✅ Cloud Function (appelable depuis le frontend) - OPTIMISÉE CPU
export const notifyAfterPayment = onCall(
  CPU_OPTIMIZED_CONFIG,
  async (request) => {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      logger.info(`🎯 Cloud Function notifyAfterPayment appelée`, {
        requestId,
        userId: request.auth?.uid,
        data: request.data
      });

      // 🛡️ Vérification d'authentification stricte
      if (!request.auth?.uid) {
        logger.warn(`🚫 Tentative d'accès non authentifié`, { requestId });
        throw new HttpsError(
          'unauthenticated',
          'Authentification requise pour cette opération'
        );
      }

      // 🔍 Validation des données d'entrée
      const { callId } = request.data;

      if (!callId || typeof callId !== 'string' || callId.trim().length === 0) {
        logger.error(`❌ CallId invalide`, { requestId, callId, userId: request.auth.uid });
        throw new HttpsError(
          'invalid-argument',
          'callId est requis et doit être une chaîne non vide'
        );
      }

      const sanitizedCallId = callId.trim();

      await notifyAfterPaymentInternal(sanitizedCallId);

      const response = {
        success: true,
        message: 'Appel planifié avec succès',
        callId: sanitizedCallId,
        timestamp: new Date().toISOString(),
        duration: `${Date.now() - startTime}ms`
      };

      logger.info(`✅ Cloud Function notifyAfterPayment réussie`, {
        requestId,
        userId: request.auth.uid,
        callId: sanitizedCallId,
        duration: response.duration
      });

      return response;

    } catch (error) {
      const duration = Date.now() - startTime;

      // 🔄 Gestion différenciée des erreurs
      if (error instanceof HttpsError) {
        logger.warn(`⚠️ Erreur client dans notifyAfterPayment`, {
          requestId,
          code: error.code,
          message: error.message,
          duration: `${duration}ms`
        });
        throw error; // Re-throw les HttpsError directement
      }

      // 🚨 Erreurs serveur inattendues
      logger.error(`💥 Erreur serveur dans notifyAfterPayment`, {
        requestId,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        stack: error instanceof Error ? error.stack : undefined,
        duration: `${duration}ms`
      });

      throw new HttpsError(
        'internal',
        'Une erreur interne s\'est produite lors de la planification de l\'appel'
      );
    }
  }
);
