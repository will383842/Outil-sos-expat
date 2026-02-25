/**
 * Admin Manual Cleanup for Orphaned Call Sessions
 *
 * Fonction callable pour les admins permettant de nettoyer manuellement
 * toutes les sessions d'appel orphelines (stuck en pending/connecting).
 *
 * Usage: Depuis la console admin, appeler cette fonction pour un nettoyage immédiat.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { logError } from '../utils/logs/logError';
import { logCallRecord } from '../utils/logs/logCallRecord';
import { setProviderAvailable } from './providerStatusManager';

interface CleanupResult {
  success: boolean;
  sessionsFound: number;
  sessionsCleaned: number;
  providersFreed: number;
  errors: number;
  details: Array<{
    sessionId: string;
    status: string;
    ageMinutes: number;
    action: string;
  }>;
}

/**
 * Nettoie TOUTES les sessions orphelines (pas de limite de temps)
 * Réservé aux admins pour un nettoyage d'urgence
 */
export const adminCleanupOrphanedSessions = onCall<{ dryRun?: boolean }, Promise<CleanupResult>>(
  {
    region: 'europe-west1',
    memory: '256MiB',
    timeoutSeconds: 300,
  },
  async (request) => {
    // Vérification admin
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const db = admin.firestore();

    // Vérifier le rôle admin
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const userData = userDoc.data();

    if (!userData || userData.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const dryRun = request.data?.dryRun ?? false;
    const now = Date.now();

    console.log(`🧹 [ADMIN CLEANUP] Démarrage nettoyage manuel (dryRun: ${dryRun})`);

    const result: CleanupResult = {
      success: true,
      sessionsFound: 0,
      sessionsCleaned: 0,
      providersFreed: 0,
      errors: 0,
      details: [],
    };

    try {
      // Récupérer TOUTES les sessions en statut non-terminal
      const orphanedStatuses = [
        'pending',
        'provider_connecting',
        'client_connecting',
        'both_connecting',
      ];

      for (const status of orphanedStatuses) {
        const sessionsSnapshot = await db
          .collection('call_sessions')
          .where('status', '==', status)
          .get();

        for (const doc of sessionsSnapshot.docs) {
          const session = doc.data();
          const sessionId = doc.id;
          const createdAt = session.metadata?.createdAt?.toMillis?.() || 0;
          const ageMinutes = Math.round((now - createdAt) / 60000);

          result.sessionsFound++;

          // Seulement nettoyer les sessions de plus de 60 minutes
          // (les plus récentes peuvent être légitimes)
          if (ageMinutes < 60) {
            result.details.push({
              sessionId,
              status,
              ageMinutes,
              action: 'SKIPPED_TOO_RECENT',
            });
            continue;
          }

          try {
            if (!dryRun) {
              // Marquer comme failed
              await doc.ref.update({
                status: 'failed',
                'payment.status': session.payment?.status === 'authorized'
                  ? 'cancelled'
                  : session.payment?.status,
                'payment.refundReason': 'admin_manual_cleanup',
                'metadata.updatedAt': admin.firestore.Timestamp.now(),
                'metadata.cleanupNote': `Cleaned by admin ${request.auth.uid} on ${new Date().toISOString()}`,
              });

              // Libérer le prestataire
              // ✅ BUG FIX: providerId is at ROOT level, fallback to metadata for backward compatibility
              const providerId = session.providerId || session.metadata?.providerId;
              if (providerId) {
                try {
                  await setProviderAvailable(
                    providerId,
                    'admin_manual_cleanup'
                  );
                  result.providersFreed++;
                } catch (providerError) {
                  console.error(`Error freeing provider ${providerId}:`, providerError);
                }
              }

              // Log pour audit
              await logCallRecord({
                callId: sessionId,
                status: 'admin_manual_cleanup',
                retryCount: 0,
                additionalData: {
                  previousStatus: status,
                  ageMinutes,
                  adminId: request.auth.uid,
                  cleanedAt: new Date().toISOString(),
                },
              });
            }

            result.sessionsCleaned++;
            result.details.push({
              sessionId,
              status,
              ageMinutes,
              action: dryRun ? 'WOULD_CLEAN' : 'CLEANED',
            });

          } catch (sessionError) {
            result.errors++;
            result.details.push({
              sessionId,
              status,
              ageMinutes,
              action: `ERROR: ${sessionError instanceof Error ? sessionError.message : 'Unknown error'}`,
            });
            await logError(`adminCleanupOrphanedSessions:${sessionId}`, sessionError);
          }
        }
      }

      // Log système
      if (!dryRun && result.sessionsCleaned > 0) {
        await db.collection('system_logs').add({
          type: 'admin_manual_cleanup',
          adminId: request.auth.uid,
          sessionsFound: result.sessionsFound,
          sessionsCleaned: result.sessionsCleaned,
          providersFreed: result.providersFreed,
          errors: result.errors,
          timestamp: admin.firestore.Timestamp.now(),
        });
      }

      console.log(`🧹 [ADMIN CLEANUP] Terminé - Found: ${result.sessionsFound}, Cleaned: ${result.sessionsCleaned}, Providers freed: ${result.providersFreed}, Errors: ${result.errors}`);

      return result;

    } catch (error) {
      console.error('❌ [ADMIN CLEANUP] Erreur:', error);
      await logError('adminCleanupOrphanedSessions', error);

      result.success = false;
      return result;
    }
  }
);

/**
 * Récupère les statistiques des sessions orphelines (sans les nettoyer)
 */
export const adminGetOrphanedSessionsStats = onCall<void, Promise<{
  total: number;
  byStatus: Record<string, number>;
  byAge: Record<string, number>;
  oldestSession: { id: string; ageMinutes: number; status: string } | null;
}>>(
  {
    region: 'europe-west1',
    memory: '256MiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const db = admin.firestore();

    // Vérifier le rôle admin
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const userData = userDoc.data();

    if (!userData || userData.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const now = Date.now();
    const orphanedStatuses = ['pending', 'provider_connecting', 'client_connecting', 'both_connecting'];

    const stats = {
      total: 0,
      byStatus: {} as Record<string, number>,
      byAge: {
        '< 1h': 0,
        '1-24h': 0,
        '1-7 days': 0,
        '> 7 days': 0,
      } as Record<string, number>,
      oldestSession: null as { id: string; ageMinutes: number; status: string } | null,
    };

    let oldestAge = 0;

    for (const status of orphanedStatuses) {
      const snapshot = await db
        .collection('call_sessions')
        .where('status', '==', status)
        .get();

      stats.byStatus[status] = snapshot.size;
      stats.total += snapshot.size;

      for (const doc of snapshot.docs) {
        const session = doc.data();
        const createdAt = session.metadata?.createdAt?.toMillis?.() || 0;
        const ageMinutes = Math.round((now - createdAt) / 60000);

        // Catégoriser par âge
        if (ageMinutes < 60) {
          stats.byAge['< 1h']++;
        } else if (ageMinutes < 24 * 60) {
          stats.byAge['1-24h']++;
        } else if (ageMinutes < 7 * 24 * 60) {
          stats.byAge['1-7 days']++;
        } else {
          stats.byAge['> 7 days']++;
        }

        // Tracker la plus ancienne
        if (ageMinutes > oldestAge) {
          oldestAge = ageMinutes;
          stats.oldestSession = {
            id: doc.id,
            ageMinutes,
            status,
          };
        }
      }
    }

    return stats;
  }
);
