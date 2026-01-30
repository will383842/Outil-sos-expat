/**
 * =============================================================================
 * SOS FIRESTORE - Shared access to sos-urgently-ac307 Firestore
 * =============================================================================
 *
 * This module provides access to the main SOS project's Firestore database.
 * The multi-dashboard reads data from sos-urgently-ac307 (where the admin
 * console writes multi-provider accounts), not from outils-sos-expat.
 *
 * USAGE:
 *   import { getSosFirestore, SOS_SERVICE_ACCOUNT } from "./sosFirestore";
 *
 *   // In function config, add the secret:
 *   secrets: [SOS_SERVICE_ACCOUNT]
 *
 *   // Then use:
 *   const db = getSosFirestore();
 */

import * as admin from "firebase-admin";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";

// =============================================================================
// SECRET: Service account for sos-urgently-ac307 (main SOS project)
// =============================================================================
export const SOS_SERVICE_ACCOUNT = defineSecret("SOS_SERVICE_ACCOUNT_KEY");

// Instance Firebase Admin for the SOS project
let sosApp: admin.app.App | null = null;

/**
 * Initialize or retrieve the Firebase Admin instance for the SOS project.
 * This allows reading from sos-urgently-ac307's Firestore.
 */
export function getSosApp(): admin.app.App {
  if (!sosApp) {
    const serviceAccountJson = SOS_SERVICE_ACCOUNT.value();
    if (!serviceAccountJson) {
      logger.error("[sosFirestore] SOS_SERVICE_ACCOUNT_KEY secret not configured");
      throw new Error("SOS_SERVICE_ACCOUNT_KEY secret not configured. Please run: firebase functions:secrets:set SOS_SERVICE_ACCOUNT_KEY");
    }

    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      sosApp = admin.initializeApp(
        {
          credential: admin.credential.cert(serviceAccount),
          projectId: "sos-urgently-ac307",
        },
        "sos-multi-dashboard" // Unique name for this app instance
      );
      logger.info("[sosFirestore] SOS Firebase Admin initialized for sos-urgently-ac307");
    } catch (e) {
      logger.error("[sosFirestore] Failed to parse service account JSON:", e);
      throw new Error("Invalid SOS_SERVICE_ACCOUNT_KEY configuration. Ensure the JSON is valid.");
    }
  }
  return sosApp;
}

/**
 * Get the Firestore instance for the SOS project (sos-urgently-ac307)
 */
export function getSosFirestore(): FirebaseFirestore.Firestore {
  return admin.firestore(getSosApp());
}

/**
 * Get the Auth instance for the SOS project (sos-urgently-ac307)
 */
export function getSosAuth(): admin.auth.Auth {
  return admin.auth(getSosApp());
}
