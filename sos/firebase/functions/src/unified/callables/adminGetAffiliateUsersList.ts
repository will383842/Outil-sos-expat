import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { getApps, initializeApp } from "firebase-admin/app";
import { affiliateAdminConfig } from "../../lib/functionConfigs";

function ensureInitialized() { if (!getApps().length) initializeApp(); }

async function assertAdmin(request: any): Promise<string> {
  if (!request.auth) throw new HttpsError("unauthenticated", "Auth required");
  const uid = request.auth.uid;
  const role = request.auth.token?.role;
  if (role === "admin") return uid;
  const db = getFirestore();
  const doc = await db.collection("users").doc(uid).get();
  if (!doc.exists || doc.data()?.role !== "admin") throw new HttpsError("permission-denied", "Admin only");
  return uid;
}

export const adminGetAffiliateUsersList = onCall(
  { ...affiliateAdminConfig, memory: "512MiB", timeoutSeconds: 120 },
  async (request) => {
    ensureInitialized();
    await assertAdmin(request);

    const { role, sortBy = "createdAt", sortOrder = "desc", limit: maxLimit = 500 } = request.data as {
      role: string; sortBy?: string; sortOrder?: string; limit?: number;
    };

    if (!role) throw new HttpsError("invalid-argument", "Role is required");

    const db = getFirestore();
    const validRoles = ["client", "lawyer", "expat"];
    if (!validRoles.includes(role)) throw new HttpsError("invalid-argument", `Invalid role: ${role}`);

    // Query users by role
    const usersSnap = await db.collection("users").where("role", "==", role).limit(maxLimit).get();

    const users = usersSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        email: data.email || "",
        status: data.status || "active",
        totalEarned: data.affiliateTotalEarned || 0,
        totalReferrals: data.affiliateTotalReferrals || 0,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() || "",
      };
    });

    // Sort
    users.sort((a, b) => {
      const aVal = (a as any)[sortBy] || 0;
      const bVal = (b as any)[sortBy] || 0;
      return sortOrder === "desc" ? (bVal > aVal ? 1 : -1) : (aVal > bVal ? 1 : -1);
    });

    return { users, total: users.length };
  }
);
