import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { getApps, initializeApp } from "firebase-admin/app";
import { affiliateAdminConfig } from "../../../lib/functionConfigs";

function ensureInitialized() {
  if (!getApps().length) initializeApp();
}

async function assertAdmin(request: any): Promise<string> {
  if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required");
  const uid = request.auth.uid;
  const role = request.auth.token?.role as string | undefined;
  if (role === "admin") return uid;
  const db = getFirestore();
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== "admin") throw new HttpsError("permission-denied", "Admin access required");
  return uid;
}

export const adminUpdateClientConfig = onCall(
  { ...affiliateAdminConfig, memory: "256MiB", timeoutSeconds: 30, maxInstances: 1 },
  async (request) => {
    ensureInitialized();
    await assertAdmin(request);
    const { updates } = request.data as { updates: Record<string, any> };
    if (!updates || typeof updates !== "object") throw new HttpsError("invalid-argument", "Updates object required");
    const db = getFirestore();
    const configRef = db.collection("client_config").doc("current");
    const configDoc = await configRef.get();
    if (!configDoc.exists) {
      await configRef.set({ ...updates, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    } else {
      await configRef.update({ ...updates, updatedAt: new Date().toISOString() });
    }
    const updated = await configRef.get();
    return { success: true, config: updated.data() };
  }
);
