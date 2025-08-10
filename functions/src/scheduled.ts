import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

export const cleanupOldConversations = onSchedule("every 24 hours", async () => {
  const db = admin.firestore();
  const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 180; // 180 days
  const snap = await db.collection("conversations").where("updatedAt", "<", cutoff).get();
  const batch = db.batch();
  snap.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
});
