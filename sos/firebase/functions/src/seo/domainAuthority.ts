/**
 * SEO Domain Authority Cloud Functions
 *
 * Gestion manuelle du score d'autorité de domaine.
 * Les scores sont saisis manuellement via le widget admin.
 *
 * Structure Firestore:
 * - seo/domainAuthority: score actuel et métadonnées
 * - seo/domainAuthority/history/{YYYY-MM}: historique mensuel
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";

const db = getFirestore();

// Types
interface DomainAuthorityData {
  domain: string;
  currentScore: number;
  previousScore: number;
  pageAuthority?: number;
  lastUpdated: Timestamp;
}

interface HistoryEntry {
  score: number;
  pageAuthority?: number;
  date: Timestamp;
}

interface GetDomainAuthorityResponse {
  domain: string;
  currentScore: number;
  previousScore: number;
  pageAuthority?: number;
  trend: number;
  lastUpdated: Date | null;
  history: Array<{
    month: string;
    score: number;
    pageAuthority?: number;
    date: Date;
  }>;
}

interface AddManualScoreRequest {
  score: number;
  pageAuthority?: number;
  month?: string; // Format YYYY-MM
}

interface AddManualScoreResponse {
  success: boolean;
  message: string;
}

// Constantes
const DOMAIN = "sos-expat.com";
const DOC_PATH = "seo/domainAuthority";

/**
 * Récupère les données d'autorité de domaine depuis Firestore
 */
export const getDomainAuthority = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    cpu: 0.25,
    timeoutSeconds: 30,
  },
  async (request): Promise<GetDomainAuthorityResponse> => {
    // Vérifier l'authentification
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Utilisateur non authentifié");
    }

    const docRef = db.doc(DOC_PATH);
    const historyRef = db.collection(`${DOC_PATH}/history`);

    try {
      // Récupérer les données actuelles
      const docSnap = await docRef.get();
      const currentData = docSnap.exists ? (docSnap.data() as DomainAuthorityData) : null;

      // Récupérer l'historique (12 derniers mois)
      const historySnap = await historyRef.orderBy("date", "desc").limit(12).get();

      const history = historySnap.docs.map((doc) => {
        const data = doc.data() as HistoryEntry;
        return {
          month: doc.id,
          score: data.score,
          pageAuthority: data.pageAuthority,
          date: data.date.toDate(),
        };
      });

      // Trier l'historique par mois croissant pour l'affichage du graphique
      history.sort((a, b) => a.month.localeCompare(b.month));

      if (!currentData) {
        return {
          domain: DOMAIN,
          currentScore: 0,
          previousScore: 0,
          pageAuthority: undefined,
          trend: 0,
          lastUpdated: null,
          history,
        };
      }

      return {
        domain: currentData.domain,
        currentScore: currentData.currentScore,
        previousScore: currentData.previousScore,
        pageAuthority: currentData.pageAuthority,
        trend: currentData.currentScore - currentData.previousScore,
        lastUpdated: currentData.lastUpdated.toDate(),
        history,
      };
    } catch (error) {
      console.error("[getDomainAuthority] Erreur:", error);
      throw new HttpsError("internal", "Erreur lors de la récupération des données");
    }
  }
);

/**
 * Ajoute un score manuellement
 */
export const addManualDomainAuthority = onCall<AddManualScoreRequest>(
  {
    region: "europe-west1",
    memory: "256MiB",
    cpu: 0.25,
    timeoutSeconds: 30,
  },
  async (request): Promise<AddManualScoreResponse> => {
    // Vérifier l'authentification
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Utilisateur non authentifié");
    }

    // Vérifier le rôle admin
    const userDoc = await db.doc(`users/${request.auth.uid}`).get();
    const userData = userDoc.data();
    if (!userData || userData.role !== "admin") {
      throw new HttpsError("permission-denied", "Seuls les admins peuvent ajouter des scores");
    }

    const { score, pageAuthority, month } = request.data;

    // Valider le score
    if (typeof score !== "number" || score < 0 || score > 100) {
      throw new HttpsError("invalid-argument", "Le score doit être entre 0 et 100");
    }

    // Valider pageAuthority si fourni
    if (pageAuthority !== undefined && (typeof pageAuthority !== "number" || pageAuthority < 0 || pageAuthority > 100)) {
      throw new HttpsError("invalid-argument", "Le Page Authority doit être entre 0 et 100");
    }

    try {
      const docRef = db.doc(DOC_PATH);
      const historyRef = db.collection(`${DOC_PATH}/history`);

      // Récupérer les données actuelles
      const docSnap = await docRef.get();
      const currentData = docSnap.exists ? (docSnap.data() as DomainAuthorityData) : null;

      // Mettre à jour le document principal
      const previousScore = currentData?.currentScore ?? score;

      await docRef.set(
        {
          domain: DOMAIN,
          currentScore: score,
          previousScore: previousScore,
          ...(pageAuthority !== undefined && { pageAuthority }),
          lastUpdated: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      // Ajouter à l'historique
      const now = new Date();
      const monthKey = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      // Valider le format du mois
      if (!/^\d{4}-\d{2}$/.test(monthKey)) {
        throw new HttpsError("invalid-argument", "Le mois doit être au format YYYY-MM");
      }

      await historyRef.doc(monthKey).set({
        score,
        ...(pageAuthority !== undefined && { pageAuthority }),
        date: FieldValue.serverTimestamp(),
      });

      console.log(`[addManualDomainAuthority] Score ajouté: ${score} pour ${monthKey}`);

      return {
        success: true,
        message: `Score ${score} ajouté pour ${monthKey}`,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      console.error("[addManualDomainAuthority] Erreur:", error);
      throw new HttpsError("internal", "Erreur lors de l'ajout du score");
    }
  }
);
