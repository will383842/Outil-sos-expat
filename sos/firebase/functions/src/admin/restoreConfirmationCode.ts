/**
 * Isolated Gen2 function for restore confirmation code
 *
 * This function is isolated in its own file to minimize cold start time.
 * Cloud Run containers need to start quickly and respond on port 8080.
 * By keeping imports minimal, we ensure fast container startup.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

// Lazy initialization for Firebase Admin
let initialized = false;
function ensureInitialized() {
  if (!initialized && getApps().length === 0) {
    initializeApp();
    initialized = true;
  }
}

/**
 * Check if user is admin
 */
async function isAdmin(uid: string): Promise<boolean> {
  ensureInitialized();
  const db = getFirestore();
  const userDoc = await db.collection("users").doc(uid).get();
  const userData = userDoc.data();
  return userData?.role === "admin" || userData?.role === "dev";
}

/**
 * Génère un code de confirmation unique pour une restauration
 */
function generateConfirmationCode(): string {
  const words = ["RESTORE", "CONFIRM", "BACKUP", "IMPORT", "DATA"];
  const randomWord = words[Math.floor(Math.random() * words.length)];
  const randomNum = Math.floor(Math.random() * 9000) + 1000;
  return `${randomWord}-${randomNum}`;
}

/**
 * Génère un code de confirmation pour une restauration
 * L'admin doit retaper ce code pour confirmer la restauration
 *
 * Isolated in its own file for faster Cloud Run cold start.
 */
export const adminGetRestoreConfirmationCode = onCall(
  {
    region: "europe-west1",
    timeoutSeconds: 30,
    memory: "256MiB",
    cpu: 0.083,
    minInstances: 0,
    maxInstances: 10,
    concurrency: 1,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    if (!(await isAdmin(request.auth.uid))) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const data = request.data as { backupId: string };
    const code = generateConfirmationCode();

    // Log la demande de code (pour audit)
    ensureInitialized();
    const db = getFirestore();
    await db.collection("admin_audit_logs").add({
      action: "RESTORE_CONFIRMATION_CODE_REQUESTED",
      adminId: request.auth.uid,
      metadata: { backupId: data.backupId, codeGenerated: code },
      createdAt: Timestamp.now(),
    });

    return {
      success: true,
      code,
      message: "Tapez ce code exactement pour confirmer la restauration",
      expiresIn: "5 minutes",
    };
  }
);
