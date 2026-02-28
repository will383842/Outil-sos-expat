import { messaging, getDb } from "../../../utils/firebase";
import { logger } from "firebase-functions/v2";

/**
 * Send a push notification via FCM.
 *
 * P0-3 FIX: Detects invalid/unregistered tokens and marks them
 * as isValid:false in Firestore so they are not retried in loops.
 * P2-1 FIX: Added TTL (1 hour) to prevent stale notifications.
 * P2-2 FIX: Added platform-specific config (sound, badge, icon, deeplink).
 *
 * @param uid Optional user ID — used for efficient token cleanup on error
 */
export async function sendPush(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>,
  uid?: string
) {
  try {
    await messaging.send({
      token,
      notification: { title, body },
      data,
      // P2-2 FIX: Platform-specific config
      android: {
        priority: "high",
        ttl: 3600 * 1000, // P2-1: 1 hour TTL
        notification: {
          icon: "ic_notification",
          color: "#4F46E5",
          sound: "default",
        },
      },
      webpush: {
        headers: { TTL: "3600" }, // P2-1: 1 hour TTL
        fcmOptions: {
          link: data?.deeplink || "/",
        },
        notification: {
          icon: "/icons/icon-192x192.png",
          badge: "/icons/icon-72x72.png",
        },
      },
      apns: {
        headers: {
          "apns-expiration": String(Math.floor(Date.now() / 1000) + 3600), // P2-1: 1h
        },
        payload: {
          aps: {
            badge: 1,
            sound: "default",
          },
        },
      },
    });
  } catch (error: unknown) {
    const code =
      error && typeof error === "object" && "code" in error
        ? (error as { code: string }).code
        : "";

    if (
      code === "messaging/invalid-registration-token" ||
      code === "messaging/registration-token-not-registered"
    ) {
      logger.warn("[sendPush] Invalid FCM token, cleaning up", {
        tokenPrefix: token.slice(0, 20),
        errorCode: code,
        uid: uid || "unknown",
      });

      try {
        const db = getDb();

        if (uid) {
          // Fast path: we know the user — query their sub-collection directly
          const tokenQuery = await db
            .collection("fcm_tokens")
            .doc(uid)
            .collection("tokens")
            .where("token", "==", token)
            .limit(1)
            .get();

          if (!tokenQuery.empty) {
            await tokenQuery.docs[0].ref.update({ isValid: false });
            logger.info("[sendPush] Marked invalid token", {
              uid,
              tokenId: tokenQuery.docs[0].id,
            });
          }
        } else {
          // Slow path: scan all users (fallback)
          const usersSnap = await db.collection("fcm_tokens").listDocuments();
          for (const userDocRef of usersSnap) {
            const tokenQuery = await userDocRef
              .collection("tokens")
              .where("token", "==", token)
              .where("isValid", "==", true)
              .limit(1)
              .get();

            if (!tokenQuery.empty) {
              await tokenQuery.docs[0].ref.update({ isValid: false });
              logger.info("[sendPush] Marked invalid token", {
                uid: userDocRef.id,
                tokenId: tokenQuery.docs[0].id,
              });
              break;
            }
          }
        }
      } catch (cleanupError) {
        logger.error("[sendPush] Token cleanup failed", { cleanupError });
      }
    }

    throw error;
  }
}
