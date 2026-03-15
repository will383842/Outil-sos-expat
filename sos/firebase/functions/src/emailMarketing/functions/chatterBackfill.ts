import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { MailwizzAPI } from "../utils/mailwizz";
import { MAILWIZZ_LIST_CHATTER_ONBOARDING } from "../config";
import { MAILWIZZ_API_KEY } from "../../lib/secrets";

const BATCH_SIZE = 50;
const DELAY_BETWEEN_BATCHES_MS = 1000;

/**
 * backfillExistingChattersToMailWizz
 *
 * Callable admin-only — europe-west3
 *
 * Parcourt TOUS les chatters existants en Firestore et les inscrit
 * dans la liste MailWizz onboarding avec CHATTER_STATUS=inscrit.
 *
 * Idempotent : MailWizz ne crée pas de doublon si l'email existe déjà.
 * Traitement par lots de 50 avec 1s de pause entre chaque lot.
 */
export const backfillExistingChattersToMailWizz = onCall(
  {
    region: "europe-west3",
    memory: "512MiB",
    timeoutSeconds: 540, // 9 min max pour callable
    secrets: [MAILWIZZ_API_KEY],
  },
  async (request) => {
    // --- Auth check: admin only ---
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const callerUid = request.auth.uid;
    const db = admin.firestore();

    // Vérifier le rôle admin dans Firestore
    const userDoc = await db.collection("users").doc(callerUid).get();
    const userData = userDoc.data();
    if (!userData || userData.role !== "admin") {
      throw new HttpsError("permission-denied", "Admin access required.");
    }

    // --- Vérifier que la liste onboarding est configurée ---
    const listOnboarding = MAILWIZZ_LIST_CHATTER_ONBOARDING.value();
    if (!listOnboarding) {
      throw new HttpsError(
        "failed-precondition",
        "MAILWIZZ_LIST_CHATTER_ONBOARDING is not configured."
      );
    }

    const mailwizz = new MailwizzAPI(listOnboarding);

    // --- Stats ---
    let totalProcessed = 0;
    let subscribed = 0;
    let skipped = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    // --- Pagination Firestore ---
    let lastDoc: admin.firestore.QueryDocumentSnapshot | null = null;

    console.log("[backfillChatters] Starting backfill to MailWizz onboarding list...");

    do {
      let query = db.collection("chatters").limit(BATCH_SIZE);

      if (lastDoc) {
        query = query.startAfter(lastDoc);
      }

      const snapshot = await query.get();
      if (snapshot.empty) break;

      // Traiter le lot en séquence (pour respecter le rate limit MailWizz)
      for (const doc of snapshot.docs) {
        const chatter = doc.data();
        const email: string | undefined = chatter.email;

        if (!email) {
          console.warn(`[backfillChatters] Chatter ${doc.id} has no email — skipping.`);
          skipped++;
          totalProcessed++;
          continue;
        }

        try {
          await mailwizz.createSubscriber({
            EMAIL: email,
            FNAME: chatter.firstName || "",
            LNAME: chatter.lastName || "",
            COUNTRY: chatter.country || "",
            LANGUAGE: chatter.language || "fr",
            CHATTER_STATUS: "inscrit",
            IS_SENEGAL: chatter.country === "SN" ? "yes" : "no",
          });
          subscribed++;
        } catch (err: any) {
          errors++;
          const errMsg = `${doc.id}: ${err?.message || String(err)}`;
          errorDetails.push(errMsg);
          console.error(`[backfillChatters] Error for chatter ${doc.id}:`, err);
        }

        totalProcessed++;
      }

      lastDoc = snapshot.docs[snapshot.docs.length - 1] ?? null;

      console.log(
        `[backfillChatters] Progress: ${totalProcessed} processed, ${subscribed} subscribed, ${skipped} skipped, ${errors} errors`
      );

      // Rate limiting : pause entre les lots
      if (lastDoc) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
      }
    } while (lastDoc);

    const summary = {
      totalProcessed,
      subscribed,
      skipped,
      errors,
      errorDetails: errorDetails.slice(0, 20), // Limiter les détails d'erreur retournés
    };

    console.log("[backfillChatters] Backfill complete.", JSON.stringify(summary));

    return summary;
  }
);
