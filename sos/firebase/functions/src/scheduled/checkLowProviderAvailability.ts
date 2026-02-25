// firebase/functions/src/scheduled/checkLowProviderAvailability.ts
// Fonction schedulée pour vérifier le nombre de prestataires en ligne
// et envoyer des alertes email aux admins si trop peu sont disponibles
// =============================================================================

// Use v1 API for scheduled functions with runWith syntax
import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { ADMIN_ALERT_EMAILS } from '../lib/constants';

// Lazy initialization to prevent deployment timeout
const IS_DEPLOYMENT_ANALYSIS =
  !process.env.K_REVISION &&
  !process.env.K_SERVICE &&
  !process.env.FUNCTION_TARGET &&
  !process.env.FUNCTIONS_EMULATOR;

let _initialized = false;
function ensureInitialized() {
  if (!_initialized && !IS_DEPLOYMENT_ANALYSIS) {
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    _initialized = true;
  }
}

function getDb() {
  ensureInitialized();
  return admin.firestore();
}

// Configuration
const CONFIG = {
  // Seuil minimum de prestataires en ligne
  MIN_PROVIDERS_THRESHOLD: 2,
  // Seuil critique (alerte urgente)
  CRITICAL_THRESHOLD: 0,
  // Emails des administrateurs à notifier
  ADMIN_EMAILS: ADMIN_ALERT_EMAILS,
  // Heures de service (UTC) - ne pas alerter en dehors
  SERVICE_HOURS: {
    start: 6, // 6h UTC = 7h Paris
    end: 22, // 22h UTC = 23h Paris
  },
  // Collection pour stocker l'historique des alertes
  ALERTS_COLLECTION: 'provider_availability_alerts',
  // Intervalle minimum entre deux alertes identiques (en minutes)
  MIN_ALERT_INTERVAL_MINUTES: 30,
};

// Types
interface ProviderStats {
  totalProviders: number;
  onlineProviders: number;
  busyProviders: number;
  offlineProviders: number;
  lawyersOnline: number;
  expatsOnline: number;
  timestamp: admin.firestore.Timestamp;
}

interface AlertRecord {
  type: 'low_availability' | 'critical_availability' | 'no_providers';
  onlineCount: number;
  threshold: number;
  timestamp: admin.firestore.Timestamp;
  emailsSent: string[];
  details: ProviderStats;
}


/**
 * Vérifie si on est dans les heures de service
 */
function isWithinServiceHours(): boolean {
  const now = new Date();
  const hour = now.getUTCHours();
  return hour >= CONFIG.SERVICE_HOURS.start && hour < CONFIG.SERVICE_HOURS.end;
}

/**
 * Vérifie si une alerte similaire a été envoyée récemment
 */
async function wasAlertSentRecently(alertType: string): Promise<boolean> {
  const minAgo = new Date();
  minAgo.setMinutes(minAgo.getMinutes() - CONFIG.MIN_ALERT_INTERVAL_MINUTES);

  const recentAlerts = await getDb()
    .collection(CONFIG.ALERTS_COLLECTION)
    .where('type', '==', alertType)
    .where('timestamp', '>', admin.firestore.Timestamp.fromDate(minAgo))
    .limit(1)
    .get();

  return !recentAlerts.empty;
}

/**
 * Envoie un email d'alerte aux administrateurs
 */
async function sendAlertEmail(
  subject: string,
  body: string,
  stats: ProviderStats,
  alertType: string
): Promise<string[]> {
  const sentTo: string[] = [];

  // Utiliser la collection mail pour envoyer via Firebase Email Extension
  // ou une intégration comme SendGrid/Mailgun
  for (const email of CONFIG.ADMIN_EMAILS) {
    try {
      await getDb().collection('mail').add({
        to: email,
        message: {
          subject: `[SOS Expats ALERT] ${subject}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">⚠️ Alerte Disponibilité Prestataires</h1>
              </div>

              <div style="background: white; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
                <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                  ${body}
                </p>

                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                  <h3 style="margin: 0 0 10px 0; color: #1f2937;">Statistiques actuelles:</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280;">Prestataires en ligne:</td>
                      <td style="padding: 8px 0; font-weight: bold; color: #10b981;">${stats.onlineProviders}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280;">En appel:</td>
                      <td style="padding: 8px 0; font-weight: bold; color: #f59e0b;">${stats.busyProviders}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280;">Hors ligne:</td>
                      <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">${stats.offlineProviders}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280;">Total:</td>
                      <td style="padding: 8px 0; font-weight: bold; color: #1f2937;">${stats.totalProviders}</td>
                    </tr>
                  </table>
                </div>

                <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
                  <p style="margin: 0; color: #92400e;">
                    <strong>Répartition:</strong><br>
                    🏛️ Avocats en ligne: ${stats.lawyersOnline}<br>
                    🌍 Expatriés en ligne: ${stats.expatsOnline}
                  </p>
                </div>

                <div style="text-align: center; margin-top: 20px;">
                  <a href="https://ia.sos-expat.com/admin/providers"
                     style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
                    Voir le Dashboard Prestataires
                  </a>
                </div>
              </div>

              <div style="background: #f9fafb; padding: 15px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; text-align: center;">
                <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                  Alerte générée automatiquement le ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}<br>
                  Type d'alerte: ${alertType}
                </p>
              </div>
            </div>
          `,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      sentTo.push(email);
      console.log(`📧 Email d'alerte envoyé à: ${email}`);
    } catch (error) {
      console.error(`❌ Erreur envoi email à ${email}:`, error);
    }
  }

  return sentTo;
}

/**
 * Récupère les statistiques actuelles des prestataires
 */
async function getProviderStats(): Promise<ProviderStats> {
  const snapshot = await getDb()
    .collection('sos_profiles')
    .where('type', 'in', ['lawyer', 'expat'])
    .get();

  let totalProviders = 0;
  let onlineProviders = 0;
  let busyProviders = 0;
  let offlineProviders = 0;
  let lawyersOnline = 0;
  let expatsOnline = 0;

  snapshot.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
    const data = doc.data();
    totalProviders++;

    if (data.isOnline && data.availability === 'available') {
      onlineProviders++;
      if (data.type === 'lawyer') lawyersOnline++;
      if (data.type === 'expat') expatsOnline++;
    } else if (data.isOnline && data.availability === 'busy') {
      busyProviders++;
    } else {
      offlineProviders++;
    }
  });

  return {
    totalProviders,
    onlineProviders,
    busyProviders,
    offlineProviders,
    lawyersOnline,
    expatsOnline,
    timestamp: admin.firestore.Timestamp.now(),
  };
}

/**
 * Enregistre l'alerte dans l'historique
 */
async function recordAlert(alert: AlertRecord): Promise<void> {
  await getDb().collection(CONFIG.ALERTS_COLLECTION).add(alert);
}

/**
 * Met à jour les statistiques temps réel pour le dashboard
 */
async function updateRealtimeStats(stats: ProviderStats): Promise<void> {
  await getDb().collection('admin_realtime').doc('provider_stats').set(
    {
      ...stats,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Fonction principale - Exécutée toutes les 15 minutes
 */
export const checkLowProviderAvailability = functions
  .region('europe-west1')
  .runWith({
    timeoutSeconds: 60,
    memory: '128MB',
  })
  .pubsub.schedule('every 60 minutes')
  .timeZone('Europe/Paris')
  .onRun(async () => {
    console.log('🔍 Vérification de la disponibilité des prestataires...');

    try {
      // Récupérer les statistiques actuelles
      const stats = await getProviderStats();
      console.log(`📊 Stats: ${stats.onlineProviders} en ligne, ${stats.busyProviders} occupés, ${stats.offlineProviders} hors ligne`);

      // Mettre à jour les stats temps réel
      await updateRealtimeStats(stats);

      // Vérifier si on est dans les heures de service
      if (!isWithinServiceHours()) {
        console.log('⏰ En dehors des heures de service, pas d\'alerte envoyée');
        return null;
      }

      // Vérifier les seuils et envoyer des alertes si nécessaire
      const availableCount = stats.onlineProviders;

      // Alerte critique: aucun prestataire disponible
      if (availableCount === 0) {
        const alertType = 'no_providers';
        const wasRecent = await wasAlertSentRecently(alertType);

        if (!wasRecent) {
          const emailsSent = await sendAlertEmail(
            'CRITIQUE: Aucun prestataire disponible!',
            'Aucun prestataire n\'est actuellement en ligne et disponible pour recevoir des appels. Les clients ne peuvent pas être mis en relation avec un professionnel.',
            stats,
            alertType
          );

          await recordAlert({
            type: 'no_providers',
            onlineCount: availableCount,
            threshold: CONFIG.MIN_PROVIDERS_THRESHOLD,
            timestamp: admin.firestore.Timestamp.now(),
            emailsSent,
            details: stats,
          });

          console.log('🚨 ALERTE CRITIQUE envoyée: Aucun prestataire disponible');
        }
      }
      // Alerte critique: très peu de prestataires
      else if (availableCount <= CONFIG.CRITICAL_THRESHOLD) {
        const alertType = 'critical_availability';
        const wasRecent = await wasAlertSentRecently(alertType);

        if (!wasRecent) {
          const emailsSent = await sendAlertEmail(
            `CRITIQUE: Seulement ${availableCount} prestataire(s) disponible(s)!`,
            `Le nombre de prestataires disponibles est critique. Seulement ${availableCount} prestataire(s) peu(ven)t actuellement recevoir des appels.`,
            stats,
            alertType
          );

          await recordAlert({
            type: 'critical_availability',
            onlineCount: availableCount,
            threshold: CONFIG.CRITICAL_THRESHOLD,
            timestamp: admin.firestore.Timestamp.now(),
            emailsSent,
            details: stats,
          });

          console.log(`🚨 ALERTE CRITIQUE envoyée: ${availableCount} prestataire(s) disponible(s)`);
        }
      }
      // Alerte basse disponibilité
      else if (availableCount < CONFIG.MIN_PROVIDERS_THRESHOLD) {
        const alertType = 'low_availability';
        const wasRecent = await wasAlertSentRecently(alertType);

        if (!wasRecent) {
          const emailsSent = await sendAlertEmail(
            `Attention: Faible disponibilité (${availableCount} prestataires)`,
            `Le nombre de prestataires disponibles est inférieur au seuil recommandé de ${CONFIG.MIN_PROVIDERS_THRESHOLD}. Actuellement: ${availableCount} prestataire(s) en ligne.`,
            stats,
            alertType
          );

          await recordAlert({
            type: 'low_availability',
            onlineCount: availableCount,
            threshold: CONFIG.MIN_PROVIDERS_THRESHOLD,
            timestamp: admin.firestore.Timestamp.now(),
            emailsSent,
            details: stats,
          });

          console.log(`⚠️ ALERTE BASSE DISPO envoyée: ${availableCount} prestataire(s) disponible(s)`);
        }
      } else {
        console.log(`✅ Disponibilité OK: ${availableCount} prestataire(s) en ligne`);
      }

      return null;
    } catch (error) {
      console.error('❌ Erreur lors de la vérification de disponibilité:', error);
      throw error;
    }
  });

/**
 * Fonction callable pour obtenir les stats en temps réel (pour le dashboard)
 */
export const getProviderAvailabilityStats = functions
  .region('europe-west1')
  .https.onCall(async (_data, context) => {
    // Vérifier l'authentification
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentification requise');
    }

    try {
      const stats = await getProviderStats();

      // Récupérer l'historique des alertes récentes
      const recentAlerts = await getDb()
        .collection(CONFIG.ALERTS_COLLECTION)
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get();

      const alerts = recentAlerts.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return {
        stats,
        alerts,
        thresholds: {
          min: CONFIG.MIN_PROVIDERS_THRESHOLD,
          critical: CONFIG.CRITICAL_THRESHOLD,
        },
      };
    } catch (error) {
      console.error('Erreur getProviderAvailabilityStats:', error);
      throw new functions.https.HttpsError('internal', 'Erreur lors de la récupération des statistiques');
    }
  });

export default checkLowProviderAvailability;
