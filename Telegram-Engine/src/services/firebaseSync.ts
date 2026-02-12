import { initializeApp, cert, getApps, type ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync, existsSync } from "fs";
import { prisma } from "../config/database.js";
import { logger } from "../utils/logger.js";

let firestoreDb: FirebaseFirestore.Firestore | null = null;

function initFirebase(): FirebaseFirestore.Firestore | null {
  if (firestoreDb) return firestoreDb;

  const saPath = process.env["FIREBASE_SERVICE_ACCOUNT_PATH"];
  if (!saPath || !existsSync(saPath)) {
    logger.warn("Firebase service account not found. Subscriber sync disabled.");
    return null;
  }

  try {
    const sa = JSON.parse(readFileSync(saPath, "utf-8")) as ServiceAccount;
    if (getApps().length === 0) {
      initializeApp({ credential: cert(sa) });
    }
    firestoreDb = getFirestore();
    return firestoreDb;
  } catch (err) {
    logger.error({ err }, "Failed to initialize Firebase Admin");
    return null;
  }
}

const ROLE_MAP: Record<string, string> = {
  chatter: "chatter",
  influencer: "influencer",
  blogger: "blogger",
  groupAdmin: "groupAdmin",
};

export async function syncSubscribersFromFirestore(): Promise<{
  synced: number;
  errors: number;
}> {
  const db = initFirebase();
  if (!db) return { synced: 0, errors: 0 };

  let synced = 0;
  let errors = 0;

  try {
    // Query users with a telegram_id
    const usersSnap = await db
      .collection("users")
      .where("telegram_id", "!=", null)
      .get();

    logger.info({ count: usersSnap.size }, "Found Firestore users with telegram_id");

    for (const doc of usersSnap.docs) {
      try {
        const data = doc.data();
        const telegramChatId = String(data["telegram_id"]);
        const role = ROLE_MAP[data["role"] as string] ?? "chatter";
        const language = (data["language"] as string) ?? "en";
        const country = (data["country"] as string) ?? null;

        await prisma.subscriber.upsert({
          where: { telegramChatId },
          create: {
            telegramChatId,
            telegramUsername: (data["telegram_username"] as string) ?? null,
            firstName: (data["firstName"] as string) ?? (data["displayName"] as string) ?? null,
            lastName: (data["lastName"] as string) ?? null,
            sosUserId: doc.id,
            role,
            language: language.substring(0, 2).toLowerCase(),
            country: country?.substring(0, 3).toUpperCase() ?? null,
            status: "active",
          },
          update: {
            telegramUsername: (data["telegram_username"] as string) ?? undefined,
            firstName: (data["firstName"] as string) ?? (data["displayName"] as string) ?? undefined,
            role,
            language: language.substring(0, 2).toLowerCase(),
            country: country?.substring(0, 3).toUpperCase() ?? undefined,
          },
        });
        synced++;
      } catch (err) {
        errors++;
        logger.error({ err, docId: doc.id }, "Failed to sync subscriber");
      }
    }

    logger.info({ synced, errors }, "Subscriber sync complete");
  } catch (err) {
    logger.error({ err }, "Subscriber sync failed");
  }

  return { synced, errors };
}
