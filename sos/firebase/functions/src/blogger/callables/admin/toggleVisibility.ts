/**
 * Admin Toggle Blogger Visibility
 *
 * Toggles whether a blogger appears in the public directory.
 * Uses admins collection for authorization (blogger-specific pattern).
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { ALLOWED_ORIGINS } from "../../../lib/functionConfigs";

interface ToggleBloggerVisibilityInput {
  bloggerId: string;
  isVisible: boolean;
}

interface ToggleBloggerVisibilityResponse {
  success: boolean;
  bloggerId: string;
  isVisible: boolean;
}

export const adminToggleBloggerVisibility = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.25,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<ToggleBloggerVisibilityResponse> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const db = getFirestore();

    // Check admin via admins collection (blogger pattern)
    const adminDoc = await db.collection("admins").doc(request.auth.uid).get();
    if (!adminDoc.exists) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const input = request.data as ToggleBloggerVisibilityInput;

    if (!input?.bloggerId) {
      throw new HttpsError("invalid-argument", "bloggerId is required");
    }
    if (typeof input.isVisible !== "boolean") {
      throw new HttpsError("invalid-argument", "isVisible must be a boolean");
    }

    try {
      await db.collection("bloggers").doc(input.bloggerId).update({
        isVisible: input.isVisible,
        updatedAt: FieldValue.serverTimestamp(),
      });

      logger.info("[adminToggleBloggerVisibility] Visibility updated", {
        bloggerId: input.bloggerId,
        isVisible: input.isVisible,
        adminUid: request.auth.uid,
      });

      return {
        success: true,
        bloggerId: input.bloggerId,
        isVisible: input.isVisible,
      };
    } catch (error) {
      logger.error("[adminToggleBloggerVisibility] Error", { error });
      throw new HttpsError("internal", "Failed to toggle blogger visibility");
    }
  }
);
