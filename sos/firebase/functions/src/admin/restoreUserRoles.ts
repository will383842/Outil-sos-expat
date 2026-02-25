/**
 * =============================================================================
 * RESTORE USER ROLES - SCRIPT DE RESTAURATION DES RÔLES UTILISATEURS
 * =============================================================================
 *
 * Ce script corrige les utilisateurs dont le rôle a été incorrectement
 * changé en 'client' à cause du bug des fallbacks dans AuthContext.
 *
 * CAUSE DU BUG:
 * - Commits a756c14 + 06efdb3 du 30 décembre 2025
 * - defaultAuthContext retournait user=null avant initialisation
 * - Cold starts des Cloud Functions causaient des timeouts
 * - Frontend utilisait fallback role='client' en cas de timeout
 *
 * CE QUE CE SCRIPT FAIT:
 * 1. Trouve les users avec role='client' qui ont un profil sos_profiles
 * 2. Restaure leur vrai rôle (lawyer/expat) depuis sos_profiles
 * 3. Synchronise les Custom Claims Firebase
 * 4. Log toutes les restaurations pour audit
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

interface RestoreResult {
  userId: string;
  email: string;
  oldRole: string;
  newRole: string;
  success: boolean;
  error?: string;
}

interface RestoreSummary {
  totalProcessed: number;
  restored: number;
  failed: number;
  skipped: number;
  details: RestoreResult[];
}

/**
 * Callable function: restoreUserRoles
 * Accessible uniquement aux admins
 */
export const restoreUserRoles = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 540, // 9 minutes pour traiter beaucoup d'utilisateurs
  },
  async (request): Promise<RestoreSummary> => {
    // Vérifier que l'appelant est admin
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentification requise");
    }

    const callerRole = request.auth.token.role;
    if (callerRole !== "admin") {
      throw new HttpsError("permission-denied", "Réservé aux administrateurs");
    }

    const db = admin.firestore();
    const summary: RestoreSummary = {
      totalProcessed: 0,
      restored: 0,
      failed: 0,
      skipped: 0,
      details: [],
    };

    console.log("[restoreUserRoles] 🔧 Démarrage de la restauration des rôles...");

    try {
      // Étape 1: Trouver tous les users avec role='client'
      const clientUsersSnapshot = await db
        .collection("users")
        .where("role", "==", "client")
        .get();

      console.log(`[restoreUserRoles] Trouvé ${clientUsersSnapshot.size} utilisateurs avec role='client'`);

      for (const userDoc of clientUsersSnapshot.docs) {
        summary.totalProcessed++;
        const userId = userDoc.id;
        const userData = userDoc.data();

        try {
          // Étape 2: Vérifier s'ils ont un profil sos_profiles
          const sosProfileDoc = await db.collection("sos_profiles").doc(userId).get();

          if (!sosProfileDoc.exists) {
            // Pas de profil sos_profiles = vraiment un client
            summary.skipped++;
            continue;
          }

          const sosData = sosProfileDoc.data();
          const providerType = sosData?.providerType as string;

          if (!providerType || !["lawyer", "expat"].includes(providerType)) {
            // providerType invalide
            summary.skipped++;
            continue;
          }

          // Étape 3: Restaurer le rôle correct
          const batch = db.batch();

          // Mettre à jour users/{uid}
          batch.update(userDoc.ref, {
            role: providerType,
            _roleRestored: true,
            _roleRestoredAt: admin.firestore.FieldValue.serverTimestamp(),
            _roleRestoredFrom: "client",
          });

          await batch.commit();

          // Étape 4: Synchroniser les Custom Claims Firebase
          await admin.auth().setCustomUserClaims(userId, { role: providerType });

          // Log d'audit
          await db.collection("role_restoration_logs").add({
            userId,
            email: userData.email || "unknown",
            oldRole: "client",
            newRole: providerType,
            restoredBy: request.auth.uid,
            restoredAt: admin.firestore.FieldValue.serverTimestamp(),
            success: true,
          });

          summary.restored++;
          summary.details.push({
            userId,
            email: userData.email || "unknown",
            oldRole: "client",
            newRole: providerType,
            success: true,
          });

          console.log(`[restoreUserRoles] ✅ Restauré: ${userId} -> ${providerType}`);
        } catch (error) {
          summary.failed++;
          const errorMessage = error instanceof Error ? error.message : "Unknown error";

          summary.details.push({
            userId,
            email: userData.email || "unknown",
            oldRole: "client",
            newRole: "unknown",
            success: false,
            error: errorMessage,
          });

          console.error(`[restoreUserRoles] ❌ Erreur pour ${userId}:`, error);

          // Log d'erreur
          await db.collection("role_restoration_logs").add({
            userId,
            email: userData.email || "unknown",
            oldRole: "client",
            error: errorMessage,
            restoredBy: request.auth.uid,
            restoredAt: admin.firestore.FieldValue.serverTimestamp(),
            success: false,
          });
        }
      }

      console.log(`[restoreUserRoles] 📊 Terminé: ${summary.restored} restaurés, ${summary.failed} échecs, ${summary.skipped} ignorés`);

      return summary;
    } catch (error) {
      console.error("[restoreUserRoles] ❌ Erreur globale:", error);
      throw new HttpsError("internal", "Erreur lors de la restauration des rôles");
    }
  }
);

/**
 * Callable function: syncAllCustomClaims
 * Synchronise les Custom Claims pour TOUS les utilisateurs
 * basé sur leur rôle Firestore
 */
export const syncAllCustomClaims = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 540,
  },
  async (request): Promise<{ synced: number; failed: number; errors: string[] }> => {
    // Vérifier que l'appelant est admin
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentification requise");
    }

    const callerRole = request.auth.token.role;
    if (callerRole !== "admin") {
      throw new HttpsError("permission-denied", "Réservé aux administrateurs");
    }

    const db = admin.firestore();
    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    console.log("[syncAllCustomClaims] 🔄 Démarrage de la synchronisation des claims...");

    try {
      // Récupérer tous les utilisateurs avec un rôle défini
      const usersSnapshot = await db
        .collection("users")
        .where("role", "in", ["client", "lawyer", "expat", "admin"])
        .get();

      console.log(`[syncAllCustomClaims] Trouvé ${usersSnapshot.size} utilisateurs à synchroniser`);

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const role = userDoc.data().role;

        try {
          await admin.auth().setCustomUserClaims(userId, { role });
          synced++;
        } catch (error) {
          failed++;
          const errorMessage = `${userId}: ${error instanceof Error ? error.message : "Unknown"}`;
          errors.push(errorMessage);
          console.error(`[syncAllCustomClaims] ❌ Erreur pour ${userId}:`, error);
        }
      }

      console.log(`[syncAllCustomClaims] 📊 Terminé: ${synced} synchronisés, ${failed} échecs`);

      // Log d'audit global
      await db.collection("admin_actions_log").add({
        action: "syncAllCustomClaims",
        performedBy: request.auth.uid,
        performedAt: admin.firestore.FieldValue.serverTimestamp(),
        result: { synced, failed, errorCount: errors.length },
      });

      return { synced, failed, errors: errors.slice(0, 50) }; // Limiter les erreurs retournées
    } catch (error) {
      console.error("[syncAllCustomClaims] ❌ Erreur globale:", error);
      throw new HttpsError("internal", "Erreur lors de la synchronisation");
    }
  }
);

/**
 * Callable function: checkUserRole
 * Vérifie et affiche le rôle d'un utilisateur spécifique
 * Utile pour le debug
 */
export const checkUserRole = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    cpu: 0.083,
  },
  async (request): Promise<{
    userId: string;
    firestoreRole: string | null;
    customClaimsRole: string | null;
    sosProfileType: string | null;
    hasDiscrepancy: boolean;
  }> => {
    // Vérifier que l'appelant est admin
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentification requise");
    }

    const callerRole = request.auth.token.role;
    if (callerRole !== "admin") {
      throw new HttpsError("permission-denied", "Réservé aux administrateurs");
    }

    const userId = request.data?.userId as string;
    if (!userId) {
      throw new HttpsError("invalid-argument", "userId requis");
    }

    const db = admin.firestore();

    // 1. Rôle Firestore
    const userDoc = await db.collection("users").doc(userId).get();
    const firestoreRole = userDoc.exists ? (userDoc.data()?.role as string) || null : null;

    // 2. Custom Claims Firebase Auth
    let customClaimsRole: string | null = null;
    try {
      const userRecord = await admin.auth().getUser(userId);
      customClaimsRole = (userRecord.customClaims?.role as string) || null;
    } catch {
      customClaimsRole = null;
    }

    // 3. Type dans sos_profiles
    const sosDoc = await db.collection("sos_profiles").doc(userId).get();
    const sosProfileType = sosDoc.exists ? (sosDoc.data()?.providerType as string) || null : null;

    // Vérifier les discordances
    const hasDiscrepancy: boolean =
      (firestoreRole !== customClaimsRole) ||
      (sosProfileType !== null && firestoreRole !== sosProfileType);

    return {
      userId,
      firestoreRole,
      customClaimsRole,
      sosProfileType,
      hasDiscrepancy,
    };
  }
);
