/**
 * Admin Callable: Toggle Influencer Visibility
 *
 * Allows an admin to show/hide an Influencer from the public directory.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";
import { ALLOWED_ORIGINS } from "../../../lib/functionConfigs";

function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

async function verifyAdmin(userId: string, authToken?: Record<string, unknown>): Promise<void> {
  const tokenRole = authToken?.role as string | undefined;
  if (tokenRole === "admin") {
    return;
  }
  const db = getFirestore();
  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists) {
    throw new HttpsError("permission-denied", "User not found");
  }
  const userData = userDoc.data();
  if (!userData || userData.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin access required");
  }
}

interface ToggleInfluencerVisibilityInput {
  influencerId: string;
  isVisible: boolean;
}

export const adminToggleInfluencerVisibility = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    maxInstances: 5,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: true }> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await verifyAdmin(request.auth.uid, request.auth.token);

    const input = request.data as ToggleInfluencerVisibilityInput;

    if (!input.influencerId || typeof input.influencerId !== "string") {
      throw new HttpsError("invalid-argument", "influencerId is required");
    }
    if (typeof input.isVisible !== "boolean") {
      throw new HttpsError("invalid-argument", "isVisible must be a boolean");
    }

    const db = getFirestore();

    try {
      const docRef = db.collection("influencers").doc(input.influencerId);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        throw new HttpsError("not-found", `Influencer ${input.influencerId} not found`);
      }

      await docRef.update({
        isVisible: input.isVisible,
        updatedAt: Timestamp.now(),
      });

      logger.info("[adminToggleInfluencerVisibility] Visibility updated", {
        influencerId: input.influencerId,
        isVisible: input.isVisible,
        updatedBy: request.auth.uid,
      });

      return { success: true };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[adminToggleInfluencerVisibility] Error", { error });
      throw new HttpsError("internal", "Failed to update Influencer visibility");
    }
  }
);
