/**
 * Admin Callable: Toggle GroupAdmin Visibility
 *
 * Allows an admin to show/hide a GroupAdmin from the public directory.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";
import { ALLOWED_ORIGINS } from "../../../lib/functionConfigs";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

/**
 * Verify the caller is an admin
 */
async function verifyAdmin(userId: string, authToken?: Record<string, unknown>): Promise<void> {
  // Check custom claims first (faster, no Firestore read)
  const tokenRole = authToken?.role as string | undefined;
  if (tokenRole === "admin" || tokenRole === "dev") {
    return;
  }

  // Fall back to Firestore check
  const db = getFirestore();
  const userDoc = await db.collection("users").doc(userId).get();

  if (!userDoc.exists) {
    throw new HttpsError("permission-denied", "User not found");
  }

  const userData = userDoc.data();
  if (!userData || !["admin", "dev"].includes(userData.role)) {
    throw new HttpsError("permission-denied", "Admin access required");
  }
}

interface ToggleGroupAdminVisibilityInput {
  groupAdminId: string;
  isVisible: boolean;
}

interface ToggleGroupAdminVisibilityResponse {
  success: true;
}

/**
 * adminToggleGroupAdminVisibility
 *
 * Admin callable — requires admin auth.
 * Updates `isVisible` on a GroupAdmin document.
 */
export const adminToggleGroupAdminVisibility = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.25,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<ToggleGroupAdminVisibilityResponse> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await verifyAdmin(request.auth.uid, request.auth.token);

    const input = request.data as ToggleGroupAdminVisibilityInput;

    if (!input.groupAdminId || typeof input.groupAdminId !== "string") {
      throw new HttpsError("invalid-argument", "groupAdminId is required");
    }
    if (typeof input.isVisible !== "boolean") {
      throw new HttpsError("invalid-argument", "isVisible must be a boolean");
    }

    const db = getFirestore();

    try {
      const docRef = db.collection("group_admins").doc(input.groupAdminId);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        throw new HttpsError("not-found", `GroupAdmin ${input.groupAdminId} not found`);
      }

      await docRef.update({
        isVisible: input.isVisible,
        updatedAt: Timestamp.now(),
      });

      logger.info("[adminToggleGroupAdminVisibility] Visibility updated", {
        groupAdminId: input.groupAdminId,
        isVisible: input.isVisible,
        updatedBy: request.auth.uid,
      });

      return { success: true };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[adminToggleGroupAdminVisibility] Error", { error });
      throw new HttpsError("internal", "Failed to update GroupAdmin visibility");
    }
  }
);
