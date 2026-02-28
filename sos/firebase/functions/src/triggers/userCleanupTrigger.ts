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
  memory: "512MiB" as const,
  timeoutSeconds: 120,
};

/**
 * Batch-delete all docs matching a query, with pagination (500 per batch).
 * Recurses until no docs remain.
 */
async function deleteQueryResults(
  query: FirebaseFirestore.Query,
  db: FirebaseFirestore.Firestore
): Promise<number> {
  const snapshot = await query.limit(500).get();
  if (snapshot.empty) return 0;

  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();

  const count = snapshot.size;
  if (count === 500) {
    // More docs may remain — recurse
    return count + await deleteQueryResults(query, db);
  }
  return count;
}

/**
 * Delete a single doc by collection/docId if it exists.
 */
async function deleteDocIfExists(
  db: FirebaseFirestore.Firestore,
  collection: string,
  docId: string
): Promise<boolean> {
  const ref = db.collection(collection).doc(docId);
  const doc = await ref.get();
  if (doc.exists) {
    await ref.delete();
    return true;
  }
  return false;
}

/**
 * Trigger déclenché quand un document est supprimé de la collection 'users'
 * Nettoie toutes les collections associées à cet utilisateur
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
    let totalDeleted = 0;
    const cleanedCollections: string[] = [];

    try {
      // ====================================================================
      // 1. Documents directs (par userId comme doc ID)
      // ====================================================================
      const directDocCollections = [
        "sos_profiles",
        "kyc_documents",
        "chatters",
        "bloggers",
        "influencers",
        "group_admins",
        "lawyers",
        "chatter_call_counts",
        "chatter_badges",
      ];

      for (const collection of directDocCollections) {
        const deleted = await deleteDocIfExists(db, collection, userId);
        if (deleted) {
          totalDeleted++;
          cleanedCollections.push(collection);
          logger.info(`[USER_CLEANUP] Supprimé ${collection}/${userId}`);
        }
      }

      // ====================================================================
      // 2. Collections query-based (where userId/chatterId/providerId == deletedUserId)
      // ====================================================================
      const queryCollections: Array<{ collection: string; field: string }> = [
        // Notifications
        { collection: "notifications", field: "userId" },
        { collection: "chatter_notifications", field: "chatterId" },
        { collection: "blogger_notifications", field: "bloggerId" },
        { collection: "influencer_notifications", field: "influencerId" },
        { collection: "group_admin_notifications", field: "groupAdminId" },
        // Commissions
        { collection: "chatter_commissions", field: "chatterId" },
        { collection: "blogger_commissions", field: "bloggerId" },
        { collection: "influencer_commissions", field: "influencerId" },
        { collection: "group_admin_commissions", field: "groupAdminId" },
        { collection: "affiliate_commissions", field: "affiliateId" },
        // Withdrawals
        { collection: "chatter_withdrawals", field: "chatterId" },
        { collection: "blogger_withdrawals", field: "bloggerId" },
        { collection: "influencer_withdrawals", field: "influencerId" },
        { collection: "group_admin_withdrawals", field: "groupAdminId" },
        // Activity
        { collection: "chatter_posts", field: "chatterId" },
        { collection: "chatter_activity_feed", field: "chatterId" },
        // Telegram
        { collection: "telegram_onboarding_links", field: "userId" },
        // Provider logs
        { collection: "provider_status_logs", field: "providerId" },
        { collection: "provider_action_logs", field: "providerId" },
      ];

      for (const { collection, field } of queryCollections) {
        const query = db.collection(collection).where(field, "==", userId);
        const count = await deleteQueryResults(query, db);
        if (count > 0) {
          totalDeleted += count;
          cleanedCollections.push(`${collection}(${count})`);
          logger.info(`[USER_CLEANUP] Supprimé ${count} docs de ${collection}`);
        }
      }

      // ====================================================================
      // 3. Logger l'action dans admin_audit_logs
      // ====================================================================
      await db.collection("admin_audit_logs").add({
        action: "user_cleanup_cascade",
        userId: userId,
        deletedUserEmail: deletedUserData?.email || "unknown",
        deletedUserRole: deletedUserData?.role || "unknown",
        deletedDocuments: totalDeleted,
        cleanedCollections,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        triggeredBy: "onUserDeleted_trigger",
      });

      logger.info(`[USER_CLEANUP] Nettoyage terminé pour ${userId}`, {
        deletedDocuments: totalDeleted,
        cleanedCollections,
      });

      return { success: true, deletedDocuments: totalDeleted };
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
    memory: "256MiB" as const,
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
