/**
 * rgpdRecordingCleanup.ts
 *
 * P2-3 FIX: Nettoyage automatique des enregistrements d'appels pour conformité RGPD.
 *
 * Fonctionnalités:
 * - Suppression des enregistrements Twilio après 90 jours
 * - Suppression des métadonnées Firestore après 90 jours
 * - Anonymisation des données sensibles dans call_sessions
 * - Logs d'audit pour traçabilité
 *
 * Configuration:
 * - RECORDING_RETENTION_DAYS: 90 jours par défaut (configurable)
 * - Exécution quotidienne à 3h00 UTC
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret, defineString } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { logError } from "../utils/logs/logError";

// Configuration
const TWILIO_ACCOUNT_SID = defineSecret("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = defineSecret("TWILIO_AUTH_TOKEN");
const RECORDING_RETENTION_DAYS = defineString("RECORDING_RETENTION_DAYS", { default: "90" });

// Types
interface RecordingDoc {
  sessionId: string;
  recordingSid: string;
  recordingUrl?: string;
  recordingStatus: string;
  createdAt: admin.firestore.Timestamp;
  deletedAt?: admin.firestore.Timestamp;
  anonymizedAt?: admin.firestore.Timestamp;
}

interface CleanupStats {
  recordingsDeleted: number;
  recordingsAnonymized: number;
  sessionsAnonymized: number;
  twilioDeleteSuccess: number;
  twilioDeleteFailed: number;
  errors: string[];
}

/**
 * Supprime un enregistrement Twilio via l'API
 */
async function deleteTwilioRecording(recordingSid: string): Promise<boolean> {
  try {
    const accountSid = TWILIO_ACCOUNT_SID.value();
    const authToken = TWILIO_AUTH_TOKEN.value();

    if (!accountSid || !authToken) {
      console.warn("[RGPD] Twilio credentials not configured, skipping Twilio deletion");
      return false;
    }

    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${recordingSid}.json`,
      {
        method: "DELETE",
        headers: {
          "Authorization": `Basic ${auth}`,
        },
      }
    );

    if (response.ok || response.status === 404) {
      // 404 = déjà supprimé, on considère comme succès
      console.log(`✅ [RGPD] Recording ${recordingSid.substring(0, 8)}... deleted from Twilio`);
      return true;
    }

    console.error(`❌ [RGPD] Failed to delete Twilio recording: ${response.status}`);
    return false;
  } catch (error) {
    console.error(`❌ [RGPD] Error deleting Twilio recording:`, error);
    return false;
  }
}

/**
 * Anonymise les données sensibles d'une session d'appel
 */
async function anonymizeCallSession(
  db: admin.firestore.Firestore,
  sessionId: string
): Promise<boolean> {
  try {
    const sessionRef = db.collection("call_sessions").doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      return false;
    }

    // Anonymiser les numéros de téléphone et URLs d'enregistrement
    await sessionRef.update({
      "participants.provider.phone": "[ANONYMIZED]",
      "participants.client.phone": "[ANONYMIZED]",
      "conference.recordingUrl": null,
      "conference.recordingSid": "[DELETED]",
      "metadata.anonymizedAt": admin.firestore.FieldValue.serverTimestamp(),
      "metadata.rgpdCompliant": true,
    });

    console.log(`✅ [RGPD] Session ${sessionId.substring(0, 8)}... anonymized`);
    return true;
  } catch (error) {
    console.error(`❌ [RGPD] Error anonymizing session:`, error);
    return false;
  }
}

/**
 * Fonction schedulée de nettoyage RGPD
 * Exécution: tous les jours à 3h00 UTC
 */
export const rgpdRecordingCleanup = onSchedule(
  {
    schedule: "0 3 * * *", // Tous les jours à 3h00 UTC
    region: "europe-west1",
    timeZone: "UTC",
    memory: "512MiB",
    timeoutSeconds: 540, // 9 minutes max
    secrets: [TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN],
  },
  async () => {
    console.log("🧹 [RGPD] Starting recording cleanup job");

    const db = admin.firestore();
    const retentionDays = parseInt(RECORDING_RETENTION_DAYS.value() || "90", 10);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const stats: CleanupStats = {
      recordingsDeleted: 0,
      recordingsAnonymized: 0,
      sessionsAnonymized: 0,
      twilioDeleteSuccess: 0,
      twilioDeleteFailed: 0,
      errors: [],
    };

    try {
      // 1. Trouver les enregistrements à supprimer
      const recordingsSnapshot = await db
        .collection("call_recordings")
        .where("createdAt", "<", admin.firestore.Timestamp.fromDate(cutoffDate))
        .where("deletedAt", "==", null)
        .limit(100) // Traiter par batch pour éviter les timeouts
        .get();

      console.log(`📊 [RGPD] Found ${recordingsSnapshot.size} recordings to process`);

      const sessionsToAnonymize = new Set<string>();

      for (const doc of recordingsSnapshot.docs) {
        const recording = doc.data() as RecordingDoc;

        try {
          // Supprimer de Twilio
          if (recording.recordingSid && recording.recordingSid !== "[DELETED]") {
            const twilioDeleted = await deleteTwilioRecording(recording.recordingSid);
            if (twilioDeleted) {
              stats.twilioDeleteSuccess++;
            } else {
              stats.twilioDeleteFailed++;
            }
          }

          // Marquer comme supprimé dans Firestore (soft delete + anonymization)
          await doc.ref.update({
            recordingUrl: null,
            recordingSid: "[DELETED]",
            deletedAt: admin.firestore.FieldValue.serverTimestamp(),
            deletionReason: "RGPD_AUTO_CLEANUP",
            originalRecordingSid: recording.recordingSid?.substring(0, 8) + "...[redacted]",
          });

          stats.recordingsDeleted++;

          // Ajouter la session à anonymiser
          if (recording.sessionId) {
            sessionsToAnonymize.add(recording.sessionId);
          }
        } catch (error) {
          const errMsg = `Failed to process recording ${doc.id}: ${error}`;
          stats.errors.push(errMsg);
          await logError("rgpdRecordingCleanup:recording", error);
        }
      }

      // 2. Anonymiser les sessions correspondantes
      for (const sessionId of sessionsToAnonymize) {
        const anonymized = await anonymizeCallSession(db, sessionId);
        if (anonymized) {
          stats.sessionsAnonymized++;
        }
      }

      // 3. Nettoyer aussi les vieux logs d'appels (call_records)
      const oldCallRecordsSnapshot = await db
        .collection("call_records")
        .where("createdAt", "<", admin.firestore.Timestamp.fromDate(cutoffDate))
        .limit(100)
        .get();

      for (const doc of oldCallRecordsSnapshot.docs) {
        try {
          // Anonymiser plutôt que supprimer (pour les métriques)
          await doc.ref.update({
            "additionalData.recordingUrl": null,
            "additionalData.recordingSid": "[DELETED]",
            anonymizedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          stats.recordingsAnonymized++;
        } catch (error) {
          stats.errors.push(`Failed to anonymize call_record ${doc.id}`);
        }
      }

      // 4. Logger les statistiques
      await db.collection("rgpd_cleanup_logs").add({
        executedAt: admin.firestore.FieldValue.serverTimestamp(),
        retentionDays,
        cutoffDate,
        stats,
        success: stats.errors.length === 0,
      });

      console.log("✅ [RGPD] Cleanup completed:", stats);

    } catch (error) {
      await logError("rgpdRecordingCleanup", error);
      console.error("❌ [RGPD] Cleanup job failed:", error);
    }
  }
);

/**
 * Fonction manuelle pour déclencher le nettoyage (admin uniquement)
 */
export const triggerRgpdCleanup = onCall(
  {
    region: "europe-west1",
  },
  async (request) => {
    // Vérifier que l'appelant est admin
    if (!request.auth?.token?.admin) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const data = request.data as { retentionDays?: number; dryRun?: boolean } | undefined;
    const retentionDays = data?.retentionDays || 90;
    const dryRun = data?.dryRun === true;

    console.log(`🧹 [GDPR] Manual cleanup triggered (dryRun=${dryRun}, retention=${retentionDays} days)`);

    const db = admin.firestore();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Compter les enregistrements à traiter
    const snapshot = await db
      .collection("call_recordings")
      .where("createdAt", "<", admin.firestore.Timestamp.fromDate(cutoffDate))
      .where("deletedAt", "==", null)
      .get();

    if (dryRun) {
      return {
        dryRun: true,
        recordingsToDelete: snapshot.size,
        cutoffDate: cutoffDate.toISOString(),
        message: `Would delete ${snapshot.size} recordings older than ${retentionDays} days`,
      };
    }

    // Déclencher le nettoyage réel (via PubSub ou directement)
    // Pour l'instant, retourner juste le compte
    return {
      triggered: true,
      recordingsToProcess: snapshot.size,
      message: "Cleanup will run in the scheduled job",
    };
  }
);
