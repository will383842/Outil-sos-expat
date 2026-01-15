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
 * SÉCURITÉ: Avant de supprimer un fichier, on vérifie qu'il n'est pas référencé
 * dans Firestore (users, sos_profiles). Cela évite de supprimer des photos
 * de profil actives si la migration vers profilePhotos/ a échoué.
 *
 * Impact économique estimé: ~300€/mois d'économies sur le stockage
 *
 * Exécution: Quotidienne à 3h du matin (heure Paris)
 */

import * as scheduler from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

// Configuration
const CONFIG = {
  // Supprimer les fichiers temporaires après 7 jours (augmenté de 24h pour plus de sécurité)
  TEMP_FILE_MAX_AGE_MS: 7 * 24 * 60 * 60 * 1000, // 7 jours
  // Préfixes des dossiers temporaires à nettoyer
  TEMP_PREFIXES: [
    'registration_temp/',
    'temp_profiles/',
  ],
  // Limite de fichiers à traiter par exécution (éviter timeout)
  MAX_FILES_PER_RUN: 500,
} as const;

// Cache pour les URLs référencées dans Firestore
let referencedUrlsCache: Set<string> | null = null;

/**
 * Récupère toutes les URLs de photos référencées dans Firestore
 * pour éviter de supprimer des fichiers encore utilisés
 */
async function getReferencedPhotoUrls(): Promise<Set<string>> {
  if (referencedUrlsCache) {
    return referencedUrlsCache;
  }

  const urls = new Set<string>();
  const db = admin.firestore();

  console.log('🔍 [STORAGE CLEANUP] Chargement des URLs référencées...');

  // Champs qui peuvent contenir des URLs de photos
  const photoFields = ['profilePhoto', 'photoURL', 'avatar'];

  // Collections à vérifier
  const collections = ['users', 'sos_profiles'];

  for (const collectionName of collections) {
    try {
      const snapshot = await db.collection(collectionName)
        .select(...photoFields)
        .get();

      for (const doc of snapshot.docs) {
        const data = doc.data();
        for (const field of photoFields) {
          const url = data[field];
          if (url && typeof url === 'string' && url.includes('registration_temp')) {
            // Extraire le nom du fichier depuis l'URL
            const match = url.match(/registration_temp%2F([^?]+)/);
            if (match) {
              urls.add(`registration_temp/${decodeURIComponent(match[1])}`);
            }
          }
          if (url && typeof url === 'string' && url.includes('temp_profiles')) {
            const match = url.match(/temp_profiles%2F([^?]+)/);
            if (match) {
              urls.add(`temp_profiles/${decodeURIComponent(match[1])}`);
            }
          }
        }
      }
    } catch (err) {
      console.error(`⚠️ [STORAGE CLEANUP] Erreur lecture ${collectionName}:`, err);
    }
  }

  console.log(`   → ${urls.size} fichiers temporaires référencés dans Firestore`);
  referencedUrlsCache = urls;
  return urls;
}

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

    // Réinitialiser le cache
    referencedUrlsCache = null;

    // Charger les URLs référencées dans Firestore
    const referencedUrls = await getReferencedPhotoUrls();

    let totalDeleted = 0;
    let totalErrors = 0;
    let totalSkipped = 0;
    let totalPreserved = 0; // Fichiers non supprimés car référencés
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
            // Vérifier si le fichier est référencé dans Firestore
            if (referencedUrls.has(file.name)) {
              totalPreserved++;
              console.log(`   🛡️ Préservé (référencé): ${file.name}`);
              continue;
            }

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
    console.log(`   → Fichiers conservés (récents < 7j): ${totalSkipped}`);
    console.log(`   → Fichiers préservés (référencés): ${totalPreserved}`);
    console.log(`   → Erreurs: ${totalErrors}`);
    console.log(`   → Espace libéré: ${formatBytes(totalBytesFreed)}`);

    // Log dans Firestore pour le monitoring
    try {
      await admin.firestore().collection('storage_cleanup_logs').add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        deleted: totalDeleted,
        skipped: totalSkipped,
        preserved: totalPreserved,
        errors: totalErrors,
        bytesFreed: totalBytesFreed,
        prefixes: CONFIG.TEMP_PREFIXES,
        maxAgeHours: CONFIG.TEMP_FILE_MAX_AGE_MS / (60 * 60 * 1000),
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
