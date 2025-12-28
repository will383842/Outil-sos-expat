import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

export const enqueueMessageEvent = onCall({ region: "europe-west1" }, async (req) => {

  try {
    console.log("enqueueMessageEvent called", req);
    const authUid = req.auth?.uid || null;
  const data = req.data || {};
  const { eventId, locale = "fr-FR", to = {}, context = {} } = data;

  if (!eventId || typeof eventId !== "string") {
    throw new HttpsError("invalid-argument", "eventId manquant ou invalide");
    }

  const doc = {
    eventId,
    locale,
    to: {
      email: to.email || null,
      phone: to.phone || null,
      pushToken: to.pushToken || null,
      uid: to.uid || null},
    context,
    requestedBy: authUid,
    createdAt: admin.firestore.FieldValue.serverTimestamp()};

    await db.collection("message_events").add(doc);
    console.log("enqueueMessageEvent done - Event added to queue");
    return { ok: true };
    console.log("enqueueMessageEvent done");
  } catch (error) {
    if(error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to enqueue message event");
  }
});
