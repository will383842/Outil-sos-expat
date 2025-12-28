// functions/src/scheduledBackup.ts
import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";

if (!admin.apps.length) {
  admin.initializeApp();
}

const client = new admin.firestore.v1.FirestoreAdminClient();

export const scheduledBackup = onSchedule(
  {
    schedule: "0 3 * * *",
    //  schedule: "*/5 * * * *",-> to test the schedule every 5 minutes cron
    timeZone: "Europe/Paris",
    region: "europe-west1",
    memory: "512MiB",
  },
  async () => {
    try {
      console.log("🕐 Starting scheduled backup at 3 AM...");

      const projectId = process.env.GCLOUD_PROJECT as string;
      const bucket = `gs://${projectId}.firebasestorage.app`;
      const databaseName = client.databasePath(projectId, "(default)");
      const timestamp = Date.now();

      const [operation] = await client.exportDocuments({
        name: databaseName,
        outputUriPrefix: `${bucket}/scheduled-backups/backup-${timestamp}`,
        collectionIds: [],
      });

      console.log("✅ Scheduled backup operation started:", operation.name);

      await admin
        .firestore()
        .collection("backups")
        .add({
          type: "automatic",
          status: "completed",
          operationName: operation.name,
          bucketPath: `${bucket}/scheduled-backups/backup-${timestamp}`,
          createdBy: "system",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          timestamp,
          schedule: "0 3 * * *",
        });

      console.log("✅ Scheduled backup metadata saved");

      // ✅ Just return undefined (void) - don't return null
      return;
    } catch (error: any) {
      console.error("❌ Scheduled backup failed:", error);

      await admin.firestore().collection("backup_errors").add({
        type: "scheduled",
        error: error.message,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      throw error;
    }
  }
);
