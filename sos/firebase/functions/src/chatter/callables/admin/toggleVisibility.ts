/**
 * Admin Toggle Chatter Visibility
 *
 * Toggles whether a chatter appears in the public directory.
 * Uses custom claims + users collection for authorization (chatter pattern).
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { ALLOWED_ORIGINS } from "../../../lib/functionConfigs";

interface ToggleChatterVisibilityInput {
  chatterId: string;
  isVisible: boolean;
}

interface ToggleChatterVisibilityResponse {
  success: boolean;
  chatterId: string;
  isVisible: boolean;
}

export const adminToggleChatterVisibility = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<ToggleChatterVisibilityResponse> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const db = getFirestore();
    const uid = request.auth.uid;

    // Check admin via custom claims first (faster)
    const role = request.auth.token?.role as string | undefined;
    if (role !== "admin" && role !== "dev") {
      // Fall back to Firestore check
      const userDoc = await db.collection("users").doc(uid).get();
      if (!userDoc.exists || !["admin", "dev"].includes(userDoc.data()?.role)) {
        throw new HttpsError("permission-denied", "Admin access required");
      }
    }

    const input = request.data as ToggleChatterVisibilityInput;

    if (!input?.chatterId) {
      throw new HttpsError("invalid-argument", "chatterId is required");
    }
    if (typeof input.isVisible !== "boolean") {
      throw new HttpsError("invalid-argument", "isVisible must be a boolean");
    }

    try {
      await db.collection("chatters").doc(input.chatterId).update({
        isVisible: input.isVisible,
        updatedAt: FieldValue.serverTimestamp(),
      });

      logger.info("[adminToggleChatterVisibility] Visibility updated", {
        chatterId: input.chatterId,
        isVisible: input.isVisible,
        adminUid: uid,
      });

      return {
        success: true,
        chatterId: input.chatterId,
        isVisible: input.isVisible,
      };
    } catch (error) {
      logger.error("[adminToggleChatterVisibility] Error", { error });
      throw new HttpsError("internal", "Failed to toggle chatter visibility");
    }
  }
);
