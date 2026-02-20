/**
 * =============================================================================
 * SET ADMIN CLAIMS - Définir les custom claims admin pour un utilisateur
 * =============================================================================
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { ALLOWED_ORIGINS } from "../lib/functionConfigs";

const db = getFirestore();

// Fallback hardcoded list (used only if Firestore read fails or doc doesn't exist)
const FALLBACK_ADMIN_EMAILS = [
  'williamsjullin@gmail.com',
  'williamjullin@gmail.com',
  'julienvalentine1@gmail.com'
];

/**
 * Get admin whitelist from Firestore, fallback to hardcoded list
 */
async function getAdminEmails(): Promise<string[]> {
  try {
    const doc = await db.collection("settings").doc("admin_whitelist").get();
    if (doc.exists) {
      const data = doc.data();
      if (data?.emails && Array.isArray(data.emails) && data.emails.length > 0) {
        return data.emails.map((e: string) => e.toLowerCase());
      }
    }
    // Doc doesn't exist yet — initialize it with fallback values
    await db.collection("settings").doc("admin_whitelist").set({
      emails: FALLBACK_ADMIN_EMAILS,
      updatedAt: new Date(),
      note: "Auto-initialized from hardcoded list",
    });
    return FALLBACK_ADMIN_EMAILS;
  } catch (error) {
    console.warn("[getAdminEmails] Firestore read failed, using fallback", error);
    return FALLBACK_ADMIN_EMAILS;
  }
}

/**
 * Définit les custom claims admin pour l'utilisateur connecté
 * Appelé automatiquement après login admin réussi
 */
export const setAdminClaims = onCall(
  {
    region: "europe-west1",
    cors: ALLOWED_ORIGINS,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Vous devez être connecté");
    }

    const uid = request.auth.uid;
    const email = request.auth.token.email?.toLowerCase();

    // Vérifier que l'email est dans la whitelist admin (from Firestore)
    const adminEmails = await getAdminEmails();
    if (!email || !adminEmails.includes(email)) {
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
 * BOOTSTRAP FIRST ADMIN - Initialise le premier admin quand aucun n'existe
 * Sécurité: Vérifie que l'email est dans la whitelist ET que l'utilisateur
 * est authentifié avec cet email. Ne crée PAS un nouvel utilisateur.
 *
 * Usage: Appeler cette fonction après s'être connecté avec un email whitelisté
 * quand le document users/{uid} n'existe pas ou n'a pas role: 'admin'
 */
export const bootstrapFirstAdmin = onCall(
  {
    region: "europe-west1",
    cors: ALLOWED_ORIGINS,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Vous devez être connecté");
    }

    const uid = request.auth.uid;
    const email = request.auth.token.email?.toLowerCase();

    console.log(`[bootstrapFirstAdmin] Attempt by ${email} (${uid})`);

    // SECURITY: Vérifier que l'email est dans la whitelist admin (from Firestore)
    const adminEmails = await getAdminEmails();
    if (!email || !adminEmails.includes(email)) {
      console.warn(`[bootstrapFirstAdmin] SECURITY: Rejected non-whitelisted email: ${email}`);
      throw new HttpsError(
        "permission-denied",
        "Cet email n'est pas autorisé comme admin"
      );
    }

    try {
      // 1. Définir les custom claims Firebase Auth
      await getAuth().setCustomUserClaims(uid, { role: "admin", admin: true });
      console.log(`[bootstrapFirstAdmin] Custom claims set for ${uid}`);

      // 2. Créer ou mettre à jour le document Firestore
      const userRef = db.collection("users").doc(uid);
      const userDoc = await userRef.get();

      const userData = {
        role: "admin",
        isAdmin: true,
        email: email,
        updatedAt: new Date(),
        ...(userDoc.exists ? {} : {
          // Champs supplémentaires uniquement si le document n'existe pas
          createdAt: new Date(),
          isApproved: true,
          approvalStatus: 'approved',
          isActive: true,
          displayName: email.split('@')[0],
        })
      };

      await userRef.set(userData, { merge: true });
      console.log(`[bootstrapFirstAdmin] Firestore document updated for ${uid}`);

      // 3. Log pour audit
      await db.collection("admin_audit_logs").add({
        action: "bootstrap_first_admin",
        email: email,
        uid: uid,
        timestamp: new Date(),
        note: "Premier admin bootstrappé via whitelist"
      });

      return {
        success: true,
        message: `Admin bootstrappé avec succès pour ${email}. Reconnectez-vous pour appliquer les changements.`,
        uid: uid
      };
    } catch (error: any) {
      console.error("[bootstrapFirstAdmin] Error:", error);
      throw new HttpsError("internal", `Erreur: ${error.message}`);
    }
  }
);

/**
 * P0 SECURITY FIX: Force la mise à jour des claims admin (pour les admins existants)
 * REQUIRES: Caller must be an existing admin to add new admins
 * This prevents unauthenticated privilege escalation
 */
export const initializeAdminClaims = onCall(
  {
    region: "europe-west1",
    cors: ALLOWED_ORIGINS,
  },
  async (request) => {
    // P0 SECURITY FIX: Require authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Vous devez être connecté");
    }

    // P0 SECURITY FIX: Verify caller is already an admin
    const callerRole = request.auth.token.role;
    const callerIsAdmin = request.auth.token.admin === true;

    if (callerRole !== "admin" && !callerIsAdmin) {
      // Log unauthorized attempt for security monitoring
      console.warn(`[initializeAdminClaims] SECURITY: Unauthorized attempt by ${request.auth.uid} (${request.auth.token.email})`);
      throw new HttpsError(
        "permission-denied",
        "Seuls les administrateurs existants peuvent créer de nouveaux admins"
      );
    }

    const { email } = request.data || {};

    if (!email) {
      throw new HttpsError("invalid-argument", "Email requis");
    }

    const normalizedEmail = email.toLowerCase();

    // Keep whitelist as additional security layer (from Firestore)
    const adminEmails = await getAdminEmails();
    if (!adminEmails.includes(normalizedEmail)) {
      console.warn(`[initializeAdminClaims] SECURITY: Attempt to add non-whitelisted email: ${normalizedEmail} by ${request.auth.uid}`);
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

      // Log admin creation for audit
      console.log(`[initializeAdminClaims] Admin initialized for ${normalizedEmail} by ${request.auth.token.email}`);

      // Create audit log entry
      await db.collection("admin_audit_logs").add({
        action: "admin_claims_initialized",
        targetEmail: normalizedEmail,
        targetUid: userRecord.uid,
        performedBy: request.auth.uid,
        performedByEmail: request.auth.token.email,
        timestamp: new Date(),
      });

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
