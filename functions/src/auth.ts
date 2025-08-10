import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1"; // ✅ v1 compat

try { admin.app(); } catch { admin.initializeApp(); }

/**
 * Crée un document Firestore users/{uid} à la création d'un compte Auth.
 */
export const onUserCreate = functions.auth.user().onCreate(async (user): Promise<void> => {
  const db = admin.firestore();

  const ref = db.collection("users").doc(user.uid);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({
      uid: user.uid,
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      photoURL: user.photoURL ?? null,
      phoneNumber: user.phoneNumber ?? null,
      provider: user.providerData?.[0]?.providerId ?? null,
      role: "user",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
});
