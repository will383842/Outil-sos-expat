import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { MailwizzAPI, SubscriberData } from "../utils/mailwizz";
import { mapChatterToMailWizzFields } from "../utils/fieldMapper";
import {
  MAILWIZZ_LIST_CHATTER_RECRUTEMENT,
  MAILWIZZ_LIST_CHATTER_ONBOARDING,
  getLanguageCode,
} from "../config";

/**
 * chatterMailwizzOnRegistered
 *
 * Trigger Firestore : onDocumentCreated sur chatters/{chatterId} — europe-west3
 *
 * Actions :
 *  1. Si MAILWIZZ_LIST_CHATTER_RECRUTEMENT configuré :
 *     - Recherche l'email dans la liste recrutement
 *     - Si trouvé → unsubscribe → stoppe Campagne A
 *  2. Si MAILWIZZ_LIST_CHATTER_ONBOARDING configuré :
 *     - Crée l'abonné dans la liste onboarding avec CHATTER_STATUS=inscrit
 *     - L'autoresponder MailWizz démarre Campagne B automatiquement à la souscription
 *
 * Tout est non-bloquant (try/catch) — une erreur MailWizz ne fait pas planter le trigger.
 */
export const chatterMailwizzOnRegistered = onDocumentCreated(
  {
    document: "chatters/{chatterId}",
    region: "europe-west3",
    memory: "256MiB",
  },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const { email, country, language } = data as {
      email?: string;
      country?: string;
      language?: string;
    };

    if (!email) {
      console.warn("[chatterMailwizz] No email on chatter doc — skipping.");
      return;
    }

    const listRecrutement = MAILWIZZ_LIST_CHATTER_RECRUTEMENT.value();
    const listOnboarding = MAILWIZZ_LIST_CHATTER_ONBOARDING.value();

    // --- Step 1: Unsubscribe from Campagne A (recrutement) if configured ---
    if (listRecrutement) {
      try {
        const mailwizzRecrutement = new MailwizzAPI(listRecrutement);
        const subscriberUid = await mailwizzRecrutement.searchSubscriberByEmail(email);
        if (subscriberUid) {
          await mailwizzRecrutement.unsubscribeSubscriber(subscriberUid);
          console.log(`[chatterMailwizz] Unsubscribed from recrutement list: ${email.slice(0, 4)}***`);
        }
      } catch (err) {
        console.error("[chatterMailwizz] Error unsubscribing from recrutement list:", err);
      }
    }

    // --- Step 2: Subscribe to Campagne B (onboarding) if configured ---
    if (listOnboarding) {
      try {
        const chatterId = event.params.chatterId;
        const mailwizzOnboarding = new MailwizzAPI(listOnboarding);

        // Send ALL chatter fields so campaign emails have real data
        const allFields = mapChatterToMailWizzFields(data, chatterId);
        allFields.LANGUAGE = getLanguageCode(language || data.preferredLanguage || "en").toLowerCase();
        allFields.CHATTER_STATUS = "inscrit";
        allFields.IS_SENEGAL = country === "SN" ? "yes" : "no";
        allFields.COUNTRY = country || "";

        await mailwizzOnboarding.createSubscriber(allFields as SubscriberData);
        console.log(`[chatterMailwizz] Subscribed to onboarding list with ${Object.keys(allFields).length} fields: ${email.slice(0, 4)}***`);
      } catch (err) {
        console.error("[chatterMailwizz] Error subscribing to onboarding list:", err);
      }
    }
  }
);

/**
 * detectInactiveChattersCron
 *
 * Scheduler : every 24 hours — europe-west3
 *
 * Requête : chatters où createdAt <= now-30j ET totalCalls == 0 ET chatterInactiveTagged != true
 * Pour chaque chatter :
 *  - Met à jour CHATTER_STATUS=inactif-30j dans la liste onboarding
 *  - Pose le flag chatterInactiveTagged=true pour éviter les doublons
 */
export const detectInactiveChattersCron = onSchedule(
  {
    schedule: "every 24 hours",
    region: "europe-west3",
    timeZone: "UTC",
    memory: "256MiB",
    cpu: 0.083,
  },
  async () => {
    const listOnboarding = MAILWIZZ_LIST_CHATTER_ONBOARDING.value();
    if (!listOnboarding) {
      console.log("[detectInactiveChattersCron] MAILWIZZ_LIST_CHATTER_ONBOARDING not configured — skipping.");
      return;
    }

    console.log("[detectInactiveChattersCron] Starting inactive chatters detection...");
    const db = admin.firestore();
    const mailwizz = new MailwizzAPI(listOnboarding);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const batchSize = 100;
    let lastDoc: admin.firestore.QueryDocumentSnapshot | null = null;
    let processedCount = 0;
    let taggedCount = 0;

    // NOTE: Firestore ne permet pas deux filtres d'inégalité sur des champs différents.
    // On filtre createdAt <= (inégalité) + totalCalls == (égalité) côté Firestore.
    // Le filtre chatterInactiveTagged est appliqué en mémoire pour éviter l'erreur d'index.
    do {
      let query = db
        .collection("chatters")
        .where("createdAt", "<=", admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
        .where("totalCalls", "==", 0)
        .limit(batchSize);

      if (lastDoc) {
        query = query.startAfter(lastDoc);
      }

      const snapshot = await query.get();
      if (snapshot.empty) break;

      for (const doc of snapshot.docs) {
        const chatter = doc.data();

        // Skip already tagged — filtre en mémoire (champ absent = non tagué = à traiter)
        if (chatter.chatterInactiveTagged === true) {
          processedCount++;
          continue;
        }

        const email: string | undefined = chatter.email;
        if (!email) {
          processedCount++;
          continue;
        }

        try {
          // Search subscriber UID then update status
          const subscriberUid = await mailwizz.searchSubscriberByEmail(email);
          if (subscriberUid) {
            await mailwizz.updateSubscriber(subscriberUid, {
              CHATTER_STATUS: "inactif-30j",
            });
          } else {
            console.warn(`[detectInactiveChattersCron] Subscriber not found in MailWizz: ${email.slice(0, 4)}***`);
          }

          // Mark as tagged in Firestore regardless (prevents re-processing)
          await db.collection("chatters").doc(doc.id).update({
            chatterInactiveTagged: true,
          });
          taggedCount++;
        } catch (err) {
          console.error(`[detectInactiveChattersCron] Error tagging chatter ${doc.id}:`, err);
        }

        processedCount++;
      }

      lastDoc = snapshot.docs[snapshot.docs.length - 1] ?? null;
    } while (lastDoc);

    console.log(
      `[detectInactiveChattersCron] Done. Processed: ${processedCount}, Tagged: ${taggedCount}`
    );
  }
);
