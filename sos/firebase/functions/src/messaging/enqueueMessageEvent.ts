import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { ALLOWED_ORIGINS } from "../lib/functionConfigs";

// Lazy initialization to prevent deployment timeout
const IS_DEPLOYMENT_ANALYSIS =
  !process.env.K_REVISION &&
  !process.env.K_SERVICE &&
  !process.env.FUNCTION_TARGET &&
  !process.env.FUNCTIONS_EMULATOR;

let _initialized = false;
function ensureInitialized() {
  if (!_initialized && !IS_DEPLOYMENT_ANALYSIS) {
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    _initialized = true;
  }
}

function getDb() {
  ensureInitialized();
  return admin.firestore();
}

export const enqueueMessageEvent = onCall({ region: "europe-west1", cpu: 0.083, cors: ALLOWED_ORIGINS }, async (req) => {

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
      fcmToken: to.fcmToken || to.pushToken || null, // P0 FIX: worker reads fcmToken, not pushToken
      uid: to.uid || null,
    },
    context,
    uid: authUid, // P0 FIX: uid at top level for push token lookup fallback
    requestedBy: authUid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

    await getDb().collection("message_events").add(doc);
    console.log("enqueueMessageEvent done - Event added to queue");
    return { ok: true };
  } catch (error) {
    if(error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to enqueue message event");
  }
});
