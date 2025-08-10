import * as admin from "firebase-admin";

export async function checkRateLimit(key: string, limit = 120, windowSeconds = 3600) {
  const now = Date.now();
  const bucket = Math.floor(now / (windowSeconds * 1000));
  const coll = admin.firestore().collection("ops").doc("ratelimits").collection("entries");
  const docRef = coll.doc(`${key}-${bucket}`);
  const snap = await docRef.get();
  const count = snap.exists ? (snap.data()!.count || 0) : 0;
  if (count >= limit) return false;
  await docRef.set(
    { count: count + 1, bucket, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true }
  );
  return true;
}
