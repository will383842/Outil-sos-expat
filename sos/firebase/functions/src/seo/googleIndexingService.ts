/**
 * Google Indexing API Service
 * Pour une indexation instantanée sur Google (complémentaire à IndexNow pour Bing)
 *
 * Prérequis:
 * 1. Ajouter le service account Firebase comme propriétaire dans Google Search Console
 * 2. Activer l'API Indexing dans Google Cloud Console
 *
 * Service Account: firebase-adminsdk-fbsvc@sos-urgently-ac307.iam.gserviceaccount.com
 */

// LAZY IMPORT: googleapis takes ~6s to load — import inside functions to avoid deployment timeout
// import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/indexing'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getGoogleLib(): any {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('googleapis').google;
}

interface GoogleIndexingResult {
  success: boolean;
  url: string;
  type: 'URL_UPDATED' | 'URL_DELETED';
  error?: string;
  notificationTime?: string;
}

interface BatchResult {
  success: boolean;
  results: GoogleIndexingResult[];
  successCount: number;
  errorCount: number;
}

/**
 * Obtient un GoogleAuth pour l'API Google Indexing
 * Utilise les credentials du service account Firebase (ADC)
 */
function getGoogleAuth() {
  const google = getGoogleLib();
  return new google.auth.GoogleAuth({
    scopes: SCOPES,
  });
}

/**
 * Soumet une URL à l'API Google Indexing
 * @param url URL à indexer
 * @param type 'URL_UPDATED' pour nouvelle/mise à jour, 'URL_DELETED' pour suppression
 */
export async function submitToGoogleIndexing(
  url: string,
  type: 'URL_UPDATED' | 'URL_DELETED' = 'URL_UPDATED'
): Promise<GoogleIndexingResult> {
  try {
    const google = getGoogleLib();
    const auth = getGoogleAuth();
    const indexing = google.indexing({ version: 'v3', auth });

    console.log(`🔍 Google Indexing: Soumission de ${url} (${type})...`);

    const response = await indexing.urlNotifications.publish({
      requestBody: {
        url,
        type,
      },
    });

    const result: GoogleIndexingResult = {
      success: true,
      url,
      type,
      notificationTime: response.data.urlNotificationMetadata?.latestUpdate?.notifyTime || undefined,
    };

    console.log(`✅ Google Indexing: ${url} soumise avec succès`);
    return result;

  } catch (error: any) {
    const errorMessage = error.message || 'Erreur inconnue';
    const statusCode = error.code || error.response?.status;

    // Gestion des erreurs spécifiques
    if (statusCode === 403) {
      console.error(`❌ Google Indexing: Permission refusée pour ${url}. Vérifiez que le service account est propriétaire dans Search Console.`);
    } else if (statusCode === 429) {
      console.error(`❌ Google Indexing: Quota dépassé (200 URLs/jour). URL: ${url}`);
    } else if (statusCode === 400) {
      console.error(`❌ Google Indexing: URL invalide ou non autorisée: ${url}`);
    } else {
      console.error(`❌ Google Indexing: Erreur ${statusCode} pour ${url}: ${errorMessage}`);
    }

    return {
      success: false,
      url,
      type,
      error: `${statusCode}: ${errorMessage}`,
    };
  }
}

/**
 * Soumet plusieurs URLs à l'API Google Indexing
 * Note: L'API a une limite de 200 URLs/jour, donc on priorise
 * @param urls Liste des URLs à indexer
 * @param maxUrls Nombre max d'URLs à soumettre (défaut: 50 pour garder du quota)
 */
export async function submitBatchToGoogleIndexing(
  urls: string[],
  maxUrls: number = 50
): Promise<BatchResult> {
  if (!urls || urls.length === 0) {
    return { success: true, results: [], successCount: 0, errorCount: 0 };
  }

  // Limiter le batch pour préserver le quota quotidien
  const batch = urls.slice(0, maxUrls);
  const results: GoogleIndexingResult[] = [];
  let successCount = 0;
  let errorCount = 0;

  console.log(`🔍 Google Indexing: Soumission de ${batch.length} URL(s)...`);

  // Soumettre séquentiellement pour éviter le rate limiting
  for (const url of batch) {
    const result = await submitToGoogleIndexing(url);
    results.push(result);

    if (result.success) {
      successCount++;
    } else {
      errorCount++;
      // Si on atteint le quota, arrêter
      if (result.error?.includes('429')) {
        console.warn('⚠️ Google Indexing: Quota atteint, arrêt du batch');
        break;
      }
    }

    // Petit délai entre les requêtes pour éviter le throttling
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`📊 Google Indexing: ${successCount} succès, ${errorCount} erreurs sur ${batch.length} URLs`);

  return {
    success: errorCount === 0,
    results,
    successCount,
    errorCount,
  };
}

/**
 * Vérifie le statut d'indexation d'une URL
 */
export async function getUrlIndexingStatus(url: string): Promise<{
  indexed: boolean;
  lastCrawlTime?: string;
  error?: string;
}> {
  try {
    const google = getGoogleLib();
    const auth = getGoogleAuth();
    const indexing = google.indexing({ version: 'v3', auth });

    const response = await indexing.urlNotifications.getMetadata({
      url,
    });

    return {
      indexed: !!response.data.latestUpdate,
      lastCrawlTime: response.data.latestUpdate?.notifyTime || undefined,
    };
  } catch (error: any) {
    return {
      indexed: false,
      error: error.message,
    };
  }
}
