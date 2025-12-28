// functions/src/manualBackup.ts
import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";

// Initialize admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const client = new admin.firestore.v1.FirestoreAdminClient();

export const createManualBackup = onCall(
  { region: "europe-west1" },
  async (request) => {
    // Verify admin authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    // // Check if user has admin role
    // if (!request.auth.token.role || request.auth.token.role !== "admin") {
    //   throw new HttpsError("permission-denied", "Admin only");
    // }

    const userId = request.auth.uid;

    try {
      console.log("🚀 Creating manual backup for admin:", userId);

      const projectId = process.env.GCLOUD_PROJECT as string;
      // const bucket = `gs://${projectId}-backups`;
      const bucket = `gs://${projectId}.firebasestorage.app`;
      const databaseName = client.databasePath(projectId, "(default)");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

      // Create the backup
      const [operation] = await client.exportDocuments({
        name: databaseName,
        outputUriPrefix: `${bucket}/manual-backups/backup-${timestamp}`,
        collectionIds: [], // Empty = all collections
      });

      console.log("✅ Backup operation started:", operation.name);

      // Save backup metadata to Firestore
      await admin
        .firestore()
        .collection("backups")
        .add({
          type: "manual",
          status: "completed",
          operationName: operation.name,
          bucketPath: `${bucket}/backup-${timestamp}`,
          createdBy: userId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      return {
        success: true,
        operationName: operation.name,
        message: "Backup started successfully",
      };
    } catch (error: any) {
      console.error("❌ Failed to create backup:", error);
      throw new HttpsError(
        "internal",
        error.message || "Failed to create backup"
      );
    }
  }
);
