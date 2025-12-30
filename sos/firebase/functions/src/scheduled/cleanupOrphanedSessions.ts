/**
 * Cleanup Orphaned Sessions & Busy Providers
 *
 * Cette fonction scheduled nettoie:
 * 1. Les sessions d'appel orphelines (stuck en pending/connecting)
 * 2. Les prestataires stuck en statut "busy" sans session active
 *
 * Exécution: Toutes les 30 minutes
 */

import * as scheduler from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { logError } from '../utils/logs/logError';
import { logCallRecord } from '../utils/logs/logCallRecord';
import { setProviderAvailable } from '../callables/providerStatusManager';

// Seuils de timeout (en millisecondes)
const THRESHOLDS = {
  // Sessions en "pending" depuis plus de 60 minutes
  SESSION_PENDING_TIMEOUT: 60 * 60 * 1000,
  // Sessions en "connecting" depuis plus de 45 minutes
  SESSION_CONNECTING_TIMEOUT: 45 * 60 * 1000,
  // Prestataires "busy" depuis plus de 2 heures sans session active
  PROVIDER_BUSY_TIMEOUT: 2 * 60 * 60 * 1000,
} as const;

export const cleanupOrphanedSessions = scheduler.onSchedule(
  {
    // OPTIMIZED: Changed from 30 minutes to 1 hour to reduce invocations by 50%
    // Previous: 48 invocations/day → Now: 24 invocations/day
    schedule: 'every 1 hours',
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
    memory: '256MiB',
  },
  async () => {
    console.log('🧹 [CLEANUP] Démarrage nettoyage sessions orphelines et prestataires busy...');

    const db = admin.firestore();
    const now = Date.now();

    let sessionsCleanedCount = 0;
    let providersCleanedCount = 0;
    let errorCount = 0;

    // ===================================================================
    // PARTIE 1: Nettoyer les sessions orphelines
    // ===================================================================

    try {
      // Sessions en "pending" depuis trop longtemps
      const pendingCutoff = admin.firestore.Timestamp.fromMillis(
        now - THRESHOLDS.SESSION_PENDING_TIMEOUT
      );

      const pendingSessions = await db
        .collection('call_sessions')
        .where('status', '==', 'pending')
        .where('metadata.createdAt', '<', pendingCutoff)
        .get();

      for (const doc of pendingSessions.docs) {
        try {
          const session = doc.data();
          const sessionId = doc.id;
          const ageMinutes = Math.round(
            (now - session.metadata.createdAt.toMillis()) / 60000
          );

          console.log(`⚠️ Session orpheline (pending): ${sessionId} - age: ${ageMinutes}min`);

          // Marquer comme failed
          await doc.ref.update({
            status: 'failed',
            'payment.status':
              session.payment?.status === 'authorized' ? 'cancelled' : session.payment?.status,
            'payment.refundReason': 'orphaned_session_cleanup',
            'metadata.updatedAt': admin.firestore.Timestamp.now(),
          });

          // Libérer le prestataire s'il était marqué busy
          if (session.metadata?.providerId) {
            try {
              await setProviderAvailable(
                session.metadata.providerId,
                'orphaned_session_cleanup'
              );
            } catch (providerError) {
              console.error(`Error freeing provider ${session.metadata.providerId}:`, providerError);
            }
          }

          await logCallRecord({
            callId: sessionId,
            status: 'session_cleanup_orphaned_pending',
            retryCount: 0,
            additionalData: {
              previousStatus: 'pending',
              ageMinutes,
              reason: 'timeout_exceeded',
            },
          });

          sessionsCleanedCount++;
        } catch (sessionError) {
          errorCount++;
          await logError(`cleanupOrphanedSessions:pending:${doc.id}`, sessionError);
        }
      }

      // Sessions en "provider_connecting" ou "client_connecting" depuis trop longtemps
      const connectingCutoff = admin.firestore.Timestamp.fromMillis(
        now - THRESHOLDS.SESSION_CONNECTING_TIMEOUT
      );

      const connectingStatuses = ['provider_connecting', 'client_connecting', 'both_connecting'];

      for (const status of connectingStatuses) {
        const connectingSessions = await db
          .collection('call_sessions')
          .where('status', '==', status)
          .where('metadata.createdAt', '<', connectingCutoff)
          .get();

        for (const doc of connectingSessions.docs) {
          try {
            const session = doc.data();
            const sessionId = doc.id;
            const ageMinutes = Math.round(
              (now - session.metadata.createdAt.toMillis()) / 60000
            );

            console.log(`⚠️ Session orpheline (${status}): ${sessionId} - age: ${ageMinutes}min`);

            await doc.ref.update({
              status: 'failed',
              'payment.status':
                session.payment?.status === 'authorized' ? 'cancelled' : session.payment?.status,
              'payment.refundReason': 'orphaned_session_cleanup',
              'metadata.updatedAt': admin.firestore.Timestamp.now(),
            });

            // Libérer le prestataire
            if (session.metadata?.providerId) {
              try {
                await setProviderAvailable(
                  session.metadata.providerId,
                  'orphaned_session_cleanup'
                );
              } catch (providerError) {
                console.error(`Error freeing provider ${session.metadata.providerId}:`, providerError);
              }
            }

            await logCallRecord({
              callId: sessionId,
              status: `session_cleanup_orphaned_${status}`,
              retryCount: 0,
              additionalData: {
                previousStatus: status,
                ageMinutes,
                reason: 'timeout_exceeded',
              },
            });

            sessionsCleanedCount++;
          } catch (sessionError) {
            errorCount++;
            await logError(`cleanupOrphanedSessions:${status}:${doc.id}`, sessionError);
          }
        }
      }

    } catch (sessionsError) {
      console.error('❌ Erreur nettoyage sessions:', sessionsError);
      await logError('cleanupOrphanedSessions:sessions', sessionsError);
    }

    // ===================================================================
    // PARTIE 2: Nettoyer les prestataires stuck en "busy"
    // ===================================================================

    try {
      const busyCutoff = admin.firestore.Timestamp.fromMillis(
        now - THRESHOLDS.PROVIDER_BUSY_TIMEOUT
      );

      // Trouver les prestataires en "busy" depuis trop longtemps
      const busyProviders = await db
        .collection('sos_profiles')
        .where('availability', '==', 'busy')
        .where('busySince', '<', busyCutoff)
        .get();

      for (const doc of busyProviders.docs) {
        try {
          const providerData = doc.data();
          const providerId = doc.id;
          const busyMinutes = providerData.busySince
            ? Math.round((now - providerData.busySince.toMillis()) / 60000)
            : 0;

          console.log(`⚠️ Prestataire stuck en busy: ${providerId} - busy depuis: ${busyMinutes}min`);

          // Vérifier si le prestataire a une session active
          const currentSessionId = providerData.currentCallSessionId;

          if (currentSessionId) {
            // Vérifier si la session existe et est vraiment active
            const sessionDoc = await db
              .collection('call_sessions')
              .doc(currentSessionId)
              .get();

            if (sessionDoc.exists) {
              const sessionData = sessionDoc.data();
              const isActiveSession = ['active', 'both_connecting'].includes(
                sessionData?.status || ''
              );

              if (isActiveSession) {
                console.log(`✓ Prestataire ${providerId} a une session active (${currentSessionId}), on le laisse busy`);
                continue; // Ne pas nettoyer, session vraiment active
              }
            }
          }

          // Pas de session active, libérer le prestataire
          console.log(`🔄 Libération du prestataire ${providerId} (pas de session active)`);

          await setProviderAvailable(providerId, 'busy_timeout_cleanup');

          // Log d'audit
          await db.collection('provider_status_logs').add({
            providerId,
            action: 'CLEANUP_BUSY_TIMEOUT',
            previousStatus: 'busy',
            newStatus: 'available',
            busyMinutes,
            sessionId: currentSessionId || null,
            reason: 'busy_timeout_exceeded',
            timestamp: admin.firestore.Timestamp.now(),
          });

          providersCleanedCount++;
        } catch (providerError) {
          errorCount++;
          await logError(`cleanupOrphanedSessions:busyProvider:${doc.id}`, providerError);
        }
      }

    } catch (providersError) {
      console.error('❌ Erreur nettoyage prestataires busy:', providersError);
      await logError('cleanupOrphanedSessions:providers', providersError);
    }

    // ===================================================================
    // RAPPORT FINAL
    // ===================================================================

    console.log(`🧹 [CLEANUP] Terminé - Sessions nettoyées: ${sessionsCleanedCount}, Prestataires libérés: ${providersCleanedCount}, Erreurs: ${errorCount}`);

    if (sessionsCleanedCount > 0 || providersCleanedCount > 0) {
      // Log pour monitoring
      await db.collection('system_logs').add({
        type: 'cleanup_orphaned_sessions',
        sessionsCleanedCount,
        providersCleanedCount,
        errorCount,
        timestamp: admin.firestore.Timestamp.now(),
      });
    }
  }
);
