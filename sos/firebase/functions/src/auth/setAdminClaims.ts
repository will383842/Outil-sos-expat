/**
 * =============================================================================
 * SET ADMIN CLAIMS - Définir les custom claims admin pour un utilisateur
 * =============================================================================
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();

// Liste des emails autorisés à être admin (même liste que frontend)
const ADMIN_EMAILS = [
  'williamsjullin@gmail.com',
  'williamjullin@gmail.com',
  'julienvalentine1@gmail.com'
];

/**
 * Définit les custom claims admin pour l'utilisateur connecté
 * Appelé automatiquement après login admin réussi
 */
export const setAdminClaims = onCall(
  {
    region: "europe-west1",
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Vous devez être connecté");
    }

    const uid = request.auth.uid;
    const email = request.auth.token.email?.toLowerCase();

    // Vérifier que l'email est dans la whitelist admin
    if (!email || !ADMIN_EMAILS.includes(email)) {
      throw new HttpsError(
        "permission-denied",
        "Cet email n'est pas autorisé comme admin"
      );
    }

    try {
      // Définir les custom claims (admin: true pour compatibilité avec toutes les fonctions)
      await getAuth().setCustomUserClaims(uid, { role: "admin", admin: true });

      // Mettre à jour Firestore aussi
      await db.collection("users").doc(uid).set(
        {
          role: "admin",
          isAdmin: true,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      console.log(`[setAdminClaims] Admin claims set for ${email} (${uid})`);

      return {
        success: true,
        message: "Admin claims définis avec succès. Reconnectez-vous pour appliquer.",
      };
    } catch (error) {
      console.error("[setAdminClaims] Error:", error);
      throw new HttpsError("internal", "Erreur lors de la définition des claims");
    }
  }
);

/**
 * Force la mise à jour des claims admin (pour les admins existants)
 * À appeler une seule fois pour initialiser
 */
export const initializeAdminClaims = onCall(
  {
    region: "europe-west1",
    cors: true,
  },
  async (request) => {
    // Cette fonction peut être appelée sans auth pour l'initialisation
    // SÉCURITÉ: Ne fonctionne que pour les emails de la whitelist

    const { email } = request.data || {};

    if (!email) {
      throw new HttpsError("invalid-argument", "Email requis");
    }

    const normalizedEmail = email.toLowerCase();

    if (!ADMIN_EMAILS.includes(normalizedEmail)) {
      throw new HttpsError(
        "permission-denied",
        "Cet email n'est pas dans la whitelist admin"
      );
    }

    try {
      // Trouver l'utilisateur par email
      const userRecord = await getAuth().getUserByEmail(normalizedEmail);

      // Définir les custom claims (admin: true pour compatibilité avec toutes les fonctions)
      await getAuth().setCustomUserClaims(userRecord.uid, { role: "admin", admin: true });

      // Mettre à jour Firestore
      await db.collection("users").doc(userRecord.uid).set(
        {
          role: "admin",
          isAdmin: true,
          email: normalizedEmail,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      console.log(`[initializeAdminClaims] Admin initialized for ${normalizedEmail}`);

      return {
        success: true,
        uid: userRecord.uid,
        message: `Admin claims définis pour ${normalizedEmail}. L'utilisateur doit se reconnecter.`,
      };
    } catch (error: any) {
      console.error("[initializeAdminClaims] Error:", error);
      if (error.code === "auth/user-not-found") {
        throw new HttpsError("not-found", "Utilisateur non trouvé avec cet email");
      }
      throw new HttpsError("internal", "Erreur lors de l'initialisation");
    }
  }
);
