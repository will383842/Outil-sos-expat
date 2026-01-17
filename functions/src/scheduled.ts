import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions";

// =============================================================================
// CLEANUP: Anciennes conversations (180 jours)
// =============================================================================

export const cleanupOldConversations = onSchedule("every 24 hours", async () => {
  const db = admin.firestore();
  const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 180; // 180 days
  const snap = await db.collection("conversations").where("updatedAt", "<", cutoff).get();
  const batch = db.batch();
  snap.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
});

// =============================================================================
// AUDIT HEBDOMADAIRE: Flags forcedAIAccess (P0.3)
// Détecte les providers avec bypass admin pour alerter les admins
// =============================================================================

export const weeklyForcedAccessAudit = onSchedule(
  {
    schedule: "every sunday 09:00",
    timeZone: "Europe/Paris",
    region: "europe-west1",
  },
  async () => {
    const db = admin.firestore();

    logger.info("[weeklyForcedAccessAudit] Démarrage de l'audit des flags forcedAIAccess");

    try {
      // Récupérer tous les providers avec forcedAIAccess = true
      const providersWithBypass = await db
        .collection("providers")
        .where("forcedAIAccess", "==", true)
        .get();

      if (providersWithBypass.empty) {
        logger.info("[weeklyForcedAccessAudit] Aucun provider avec forcedAIAccess trouvé");
        return;
      }

      const auditResults: Array<{
        providerId: string;
        email?: string;
        name?: string;
        providerType?: string;
        aiCallsUsed?: number;
        forcedAccessSince?: Date;
      }> = [];

      for (const doc of providersWithBypass.docs) {
        const data = doc.data();
        auditResults.push({
          providerId: doc.id,
          email: data.email,
          name: data.name || data.displayName,
          providerType: data.providerType,
          aiCallsUsed: data.aiCallsUsed || 0,
          forcedAccessSince: data.forcedAccessGrantedAt?.toDate?.(),
        });
      }

      // Enregistrer l'audit dans Firestore
      await db.collection("auditLogs").add({
        type: "forced_access_audit",
        action: "weekly_audit",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        severity: providersWithBypass.size > 5 ? "warning" : "info",
        details: {
          totalProvidersWithBypass: providersWithBypass.size,
          providers: auditResults,
        },
      });

      logger.warn("[weeklyForcedAccessAudit] Audit terminé", {
        totalProvidersWithBypass: providersWithBypass.size,
        providerIds: auditResults.map(p => p.providerId),
      });

      // Si trop de providers avec bypass, créer une notification admin
      if (providersWithBypass.size > 5) {
        await db.collection("notifications").add({
          type: "admin_alert",
          title: "Audit forcedAIAccess",
          message: `${providersWithBypass.size} providers ont l'accès IA forcé. Vérifiez si ces bypass sont toujours nécessaires.`,
          severity: "warning",
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          targetRole: "admin",
        });
      }
    } catch (error) {
      logger.error("[weeklyForcedAccessAudit] Erreur lors de l'audit", error);
    }
  }
);

// =============================================================================
// CLEANUP: Messages bloqués en "processing" (timeout 5 min)
// Évite les messages qui restent bloqués si une fonction crash
// =============================================================================

export const cleanupStuckMessages = onSchedule(
  {
    schedule: "every 5 minutes",
    region: "europe-west1",
  },
  async () => {
    const db = admin.firestore();
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    try {
      // Trouver les messages bloqués en "processing: true" depuis plus de 5 min
      const stuckMessages = await db
        .collectionGroup("messages")
        .where("processing", "==", true)
        .get();

      if (stuckMessages.empty) {
        return;
      }

      let cleanedCount = 0;
      const batch = db.batch();

      for (const doc of stuckMessages.docs) {
        const data = doc.data();
        const timestamp = data.timestamp?.toDate?.() || data.createdAt?.toDate?.();

        // Ne nettoyer que si le message est plus vieux que 5 minutes
        if (timestamp && timestamp < fiveMinutesAgo) {
          batch.update(doc.ref, {
            processing: false,
            aiSkipped: true,
            aiSkippedReason: "processing_timeout",
            cleanedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        await batch.commit();
        logger.warn("[cleanupStuckMessages] Messages bloqués nettoyés", { cleanedCount });
      }
    } catch (error) {
      logger.error("[cleanupStuckMessages] Erreur lors du nettoyage", error);
    }
  }
);

// =============================================================================
// ARCHIVAGE AUTO: Conversations expirées non archivées
// Rattrape les conversations qui auraient dû être archivées
// =============================================================================

export const archiveExpiredConversations = onSchedule(
  {
    schedule: "every 1 hours",
    region: "europe-west1",
  },
  async () => {
    const db = admin.firestore();

    try {
      // Stratégie: Récupérer les conversations des dernières 24h
      // et vérifier lesquelles devraient être archivées
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const conversations = await db
        .collection("conversations")
        .where("createdAt", ">=", oneDayAgo)
        .orderBy("createdAt", "desc")
        .limit(200)
        .get();

      if (conversations.empty) {
        return;
      }

      let archivedCount = 0;
      let skippedAlreadyArchived = 0;
      const now = Date.now();

      for (const convoDoc of conversations.docs) {
        const convo = convoDoc.data();

        // Skip si déjà archivée
        if (convo.status === "archived" || convo.archivedAt) {
          skippedAlreadyArchived++;
          continue;
        }

        if (!convo.bookingId) continue;

        // Récupérer le booking associé
        const bookingDoc = await db.collection("bookings").doc(convo.bookingId).get();
        if (!bookingDoc.exists) continue;

        const booking = bookingDoc.data();
        if (!booking?.aiProcessedAt) continue;

        // Calculer si expiré
        const providerType = booking.providerType || convo.providerType || "lawyer";
        const durationMinutes = providerType === "expat" ? 35 : 25;
        const durationMs = durationMinutes * 60 * 1000;

        const startTime = booking.aiProcessedAt.toMillis();
        const expirationTime = startTime + durationMs;

        if (now > expirationTime) {
          // Archiver la conversation
          await convoDoc.ref.update({
            archivedAt: admin.firestore.FieldValue.serverTimestamp(),
            status: "archived",
            archiveReason: "auto_archive_expired",
          });
          archivedCount++;
        }
      }

      if (archivedCount > 0 || skippedAlreadyArchived > 0) {
        logger.info("[archiveExpiredConversations] Traitement terminé", {
          archivedCount,
          skippedAlreadyArchived,
          totalChecked: conversations.size,
        });
      }
    } catch (error) {
      logger.error("[archiveExpiredConversations] Erreur lors de l'archivage", error);
    }
  }
);
