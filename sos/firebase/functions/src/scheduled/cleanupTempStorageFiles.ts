/**
 * Cleanup Temporary Storage Files
 *
 * ÉCONOMIE: Cette fonction nettoie les fichiers temporaires de Firebase Storage
 * qui ne sont jamais supprimés automatiquement.
 *
 * Cibles:
 * - registration_temp/* : Fichiers uploadés pendant l'inscription (abandonnée)
 * - temp_profiles/* : Photos de profil temporaires
 *
 * Impact économique estimé: ~300€/mois d'économies sur le stockage
 *
 * Exécution: Quotidienne à 3h du matin (heure Paris)
 */

import * as scheduler from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

// Configuration
const CONFIG = {
  // Supprimer les fichiers temporaires après 24 heures
  TEMP_FILE_MAX_AGE_MS: 24 * 60 * 60 * 1000, // 24h
  // Préfixes des dossiers temporaires à nettoyer
  TEMP_PREFIXES: [
    'registration_temp/',
    'temp_profiles/',
  ],
  // Limite de fichiers à traiter par exécution (éviter timeout)
  MAX_FILES_PER_RUN: 500,
} as const;

/**
 * Fonction scheduled pour nettoyer les fichiers temporaires de Storage
 */
export const cleanupTempStorageFiles = scheduler.onSchedule(
  {
    schedule: 'every day 03:00',
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
    memory: '512MiB',
    timeoutSeconds: 300, // 5 minutes max
  },
  async () => {
    console.log('🧹 [STORAGE CLEANUP] Démarrage nettoyage fichiers temporaires...');

    const bucket = admin.storage().bucket();
    const now = Date.now();
    const cutoffTime = now - CONFIG.TEMP_FILE_MAX_AGE_MS;

    let totalDeleted = 0;
    let totalErrors = 0;
    let totalSkipped = 0;
    let totalBytesFreed = 0;

    for (const prefix of CONFIG.TEMP_PREFIXES) {
      console.log(`📂 [STORAGE CLEANUP] Analyse du dossier: ${prefix}`);

      try {
        // Lister tous les fichiers dans le préfixe
        const [files] = await bucket.getFiles({
          prefix,
          maxResults: CONFIG.MAX_FILES_PER_RUN,
        });

        console.log(`   → ${files.length} fichiers trouvés dans ${prefix}`);

        for (const file of files) {
          try {
            // Récupérer les métadonnées du fichier
            const [metadata] = await file.getMetadata();
            const createdTime = metadata.timeCreated
              ? new Date(metadata.timeCreated).getTime()
              : now; // Si pas de date, considérer comme récent (ne pas supprimer)

            // Vérifier si le fichier est assez vieux pour être supprimé
            if (createdTime < cutoffTime) {
              const fileSize = typeof metadata.size === 'number'
                ? metadata.size
                : parseInt(String(metadata.size || '0'), 10);

              // Supprimer le fichier
              await file.delete();

              totalDeleted++;
              totalBytesFreed += fileSize;

              console.log(`   ✅ Supprimé: ${file.name} (${formatBytes(fileSize)}, créé il y a ${formatAge(now - createdTime)})`);
            } else {
              totalSkipped++;
            }
          } catch (fileError: any) {
            totalErrors++;
            console.error(`   ❌ Erreur suppression ${file.name}:`, fileError.message);
          }
        }
      } catch (prefixError: any) {
        console.error(`❌ [STORAGE CLEANUP] Erreur listing ${prefix}:`, prefixError.message);
      }
    }

    // Résumé
    console.log('📊 [STORAGE CLEANUP] Résumé:');
    console.log(`   → Fichiers supprimés: ${totalDeleted}`);
    console.log(`   → Fichiers conservés (récents): ${totalSkipped}`);
    console.log(`   → Erreurs: ${totalErrors}`);
    console.log(`   → Espace libéré: ${formatBytes(totalBytesFreed)}`);

    // Log dans Firestore pour le monitoring
    try {
      await admin.firestore().collection('storage_cleanup_logs').add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        deleted: totalDeleted,
        skipped: totalSkipped,
        errors: totalErrors,
        bytesFreed: totalBytesFreed,
        prefixes: CONFIG.TEMP_PREFIXES,
        // TTL: supprimer ce log après 30 jours
        expireAt: admin.firestore.Timestamp.fromMillis(now + 30 * 24 * 60 * 60 * 1000),
      });
    } catch (logError) {
      console.error('⚠️ Erreur logging cleanup:', logError);
    }

    console.log('✅ [STORAGE CLEANUP] Nettoyage terminé');
  }
);

/**
 * Formater une taille en bytes de manière lisible
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Formater une durée en millisecondes de manière lisible
 */
function formatAge(ms: number): string {
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days} jour(s)`;
}
