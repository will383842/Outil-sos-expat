/**
 * Trigger: Suppression automatique du profil sos_profiles
 * quand un utilisateur est supprimé de la collection users
 *
 * Ce trigger garantit la cohérence des données entre users et sos_profiles
 */

import { onDocumentDeleted } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";

// Configuration du trigger
const triggerConfig = {
  region: "europe-west3",
  memory: "256MiB" as const,
  timeoutSeconds: 60,
};

/**
 * Trigger déclenché quand un document est supprimé de la collection 'users'
 * Supprime automatiquement le profil correspondant dans 'sos_profiles'
 */
export const onUserDeleted = onDocumentDeleted(
  {
    ...triggerConfig,
    document: "users/{userId}",
  },
  async (event) => {
    const userId = event.params.userId;
    const deletedUserData = event.data?.data();

    logger.info(`[USER_CLEANUP] Utilisateur supprimé: ${userId}`, {
      email: deletedUserData?.email,
      role: deletedUserData?.role,
    });

    const db = admin.firestore();
    const batch = db.batch();
    let deletedCount = 0;

    try {
      // 1. Supprimer le profil dans sos_profiles
      const profileRef = db.collection("sos_profiles").doc(userId);
      const profileDoc = await profileRef.get();

      if (profileDoc.exists) {
        batch.delete(profileRef);
        deletedCount++;
        logger.info(`[USER_CLEANUP] Profil sos_profiles trouvé et marqué pour suppression: ${userId}`);
      } else {
        logger.info(`[USER_CLEANUP] Pas de profil sos_profiles pour: ${userId}`);
      }

      // 2. Supprimer les documents KYC associés
      const kycRef = db.collection("kyc_documents").doc(userId);
      const kycDoc = await kycRef.get();

      if (kycDoc.exists) {
        batch.delete(kycRef);
        deletedCount++;
        logger.info(`[USER_CLEANUP] Document KYC trouvé et marqué pour suppression: ${userId}`);
      }

      // 3. Supprimer les notifications de l'utilisateur
      const notificationsSnap = await db
        .collection("notifications")
        .where("userId", "==", userId)
        .limit(100)
        .get();

      notificationsSnap.docs.forEach((doc) => {
        batch.delete(doc.ref);
        deletedCount++;
      });

      if (notificationsSnap.size > 0) {
        logger.info(`[USER_CLEANUP] ${notificationsSnap.size} notifications marquées pour suppression`);
      }

      // 4. Logger l'action dans admin_audit_logs
      const auditRef = db.collection("admin_audit_logs").doc();
      batch.set(auditRef, {
        action: "user_cleanup_cascade",
        userId: userId,
        deletedUserEmail: deletedUserData?.email || "unknown",
        deletedUserRole: deletedUserData?.role || "unknown",
        deletedDocuments: deletedCount,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        triggeredBy: "onUserDeleted_trigger",
      });

      // Exécuter le batch
      await batch.commit();

      logger.info(`[USER_CLEANUP] Nettoyage terminé pour ${userId}`, {
        deletedDocuments: deletedCount,
        collections: ["sos_profiles", "kyc_documents", "notifications"],
      });

      return { success: true, deletedDocuments: deletedCount };
    } catch (error) {
      logger.error(`[USER_CLEANUP] Erreur lors du nettoyage pour ${userId}:`, error);
      throw error;
    }
  }
);

/**
 * Logique interne pour nettoyer les profils orphelins
 */
const cleanupOrphanedProfilesInternal = async (): Promise<{
  found: number;
  deleted: number;
  errors: string[];
}> => {
  const db = admin.firestore();
  const errors: string[] = [];
  let found = 0;
  let deleted = 0;

  logger.info("[ORPHAN_CLEANUP] Démarrage du nettoyage des profils orphelins");

  try {
    // Récupérer tous les profils sos_profiles
    const profilesSnap = await db.collection("sos_profiles").get();

    logger.info(`[ORPHAN_CLEANUP] ${profilesSnap.size} profils à vérifier`);

    // Vérifier chaque profil
    for (const profileDoc of profilesSnap.docs) {
      const userId = profileDoc.id;
      const userDoc = await db.collection("users").doc(userId).get();

      if (!userDoc.exists) {
        found++;
        logger.warn(`[ORPHAN_CLEANUP] Profil orphelin trouvé: ${userId}`);

        try {
          // Supprimer le profil orphelin
          await profileDoc.ref.delete();
          deleted++;
          logger.info(`[ORPHAN_CLEANUP] Profil orphelin supprimé: ${userId}`);
        } catch (err) {
          const errorMsg = `Erreur suppression ${userId}: ${err}`;
          errors.push(errorMsg);
          logger.error(`[ORPHAN_CLEANUP] ${errorMsg}`);
        }
      }
    }

    // Logger le résultat dans admin_audit_logs
    await db.collection("admin_audit_logs").add({
      action: "orphan_profiles_cleanup",
      found,
      deleted,
      errors: errors.length,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      triggeredBy: "manual_cleanup",
    });

    logger.info(`[ORPHAN_CLEANUP] Terminé - Trouvés: ${found}, Supprimés: ${deleted}, Erreurs: ${errors.length}`);

    return { found, deleted, errors };
  } catch (error) {
    logger.error("[ORPHAN_CLEANUP] Erreur globale:", error);
    throw error;
  }
};

/**
 * Fonction callable pour nettoyer manuellement les profils orphelins
 * Réservée aux administrateurs
 */
export const cleanupOrphanedProfiles = onCall(
  {
    ...triggerConfig,
    memory: "512MiB" as const,
    timeoutSeconds: 300, // 5 minutes pour traiter beaucoup de profils
  },
  async (request) => {
    // Vérifier que l'appelant est admin
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentification requise");
    }

    const db = admin.firestore();
    const userDoc = await db.collection("users").doc(request.auth.uid).get();
    const userData = userDoc.data();

    if (!userData || userData.role !== "admin") {
      logger.warn(`[ORPHAN_CLEANUP] Tentative non autorisée par: ${request.auth.uid}`);
      throw new HttpsError("permission-denied", "Accès réservé aux administrateurs");
    }

    logger.info(`[ORPHAN_CLEANUP] Lancé par admin: ${request.auth.uid} (${userData.email})`);

    // Exécuter le nettoyage
    const result = await cleanupOrphanedProfilesInternal();

    // Mettre à jour l'audit log avec l'admin qui a déclenché
    await db.collection("admin_audit_logs").add({
      action: "orphan_profiles_cleanup_manual",
      triggeredBy: request.auth.uid,
      triggeredByEmail: userData.email,
      ...result,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return result;
  }
);
