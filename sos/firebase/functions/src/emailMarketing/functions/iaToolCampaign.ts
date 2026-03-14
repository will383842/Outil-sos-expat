import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineString } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { MailwizzAPI, SubscriberData } from "../utils/mailwizz";
import { mapUserToMailWizzFields } from "../utils/fieldMapper";

// -------------------------------------------------------------------------
// Config
// -------------------------------------------------------------------------

const MAILWIZZ_LIST_IA_PROSPECTS = defineString("MAILWIZZ_LIST_IA_PROSPECTS", {
  description: "MailWizz list UID for IA Tool prospect campaign",
  default: "",
});

const SUBSCRIPTION_URL = "https://sos-expat.com/dashboard/subscription";
const MAX_AI_TRIAL_CALLS = 3;

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

/** Mask email for safe logging: keeps first 4 chars + *** */
function maskEmail(email: string): string {
  if (!email || email.length < 4) return "***";
  return `${email.slice(0, 4)}***`;
}

/**
 * Build the full MailWizz fields object for an IA prospect subscriber.
 * Extends `mapUserToMailWizzFields` with IA-specific fields.
 */
function mapProviderToIaProspectFields(
  userData: admin.firestore.DocumentData,
  providerId: string
): Record<string, string> {
  const fields = mapUserToMailWizzFields(userData, providerId);

  // IA prospect specific fields
  fields.SUBSCRIPTION_URL = SUBSCRIPTION_URL;
  fields.ROLE = userData.role || "provider";
  fields.PROVIDER_TYPE = userData.providerType || userData.role || "";

  return fields;
}

/**
 * Check if the IA prospects list is configured. Returns the list UID or null.
 */
function getIaListUid(): string | null {
  const uid = MAILWIZZ_LIST_IA_PROSPECTS.value();
  if (!uid) {
    console.log("[iaToolCampaign] MAILWIZZ_LIST_IA_PROSPECTS not configured — skipping.");
    return null;
  }
  return uid;
}

// -------------------------------------------------------------------------
// 1. iaProspectOnSubscriptionChanged
//    Trigger: onDocumentUpdated on subscriptions/{providerId}
//    - active/trialing → expired/cancelled/suspended  → subscribe to IA prospects list
//    - any → active                                    → unsubscribe from IA prospects list
// -------------------------------------------------------------------------

export const iaProspectOnSubscriptionChanged = onDocumentUpdated(
  {
    document: "subscriptions/{providerId}",
    region: "europe-west3",
    cpu: 0.083,
  },
  async (event) => {
    const listUid = getIaListUid();
    if (!listUid) return;

    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const providerId = event.params.providerId;

    if (!before || !after) return;

    const beforeStatus: string = before.status || "";
    const afterStatus: string = after.status || "";

    // No status change — nothing to do
    if (beforeStatus === afterStatus) return;

    const wasActive = beforeStatus === "active" || beforeStatus === "trialing";
    const isNowInactive =
      afterStatus === "expired" ||
      afterStatus === "cancelled" ||
      afterStatus === "suspended";
    const isNowActive = afterStatus === "active";

    try {
      const mailwizz = new MailwizzAPI(listUid);

      // ------------------------------------------------------------------
      // Case A: Subscription lost → subscribe to IA prospects campaign
      // ------------------------------------------------------------------
      if (wasActive && isNowInactive) {
        const db = admin.firestore();
        const userSnap = await db.collection("users").doc(providerId).get();
        if (!userSnap.exists) {
          console.log(`[iaToolCampaign] User doc not found for ${providerId} — skipping.`);
          return;
        }
        const userData = userSnap.data()!;
        const fields = mapProviderToIaProspectFields(userData, providerId);
        fields.SUBSCRIPTION_STATUS = afterStatus;

        await mailwizz.createSubscriber(fields as SubscriberData);
        console.log(
          `[iaToolCampaign] Subscribed ${maskEmail(userData.email)} to IA prospects (status: ${beforeStatus} → ${afterStatus}).`
        );
      }

      // ------------------------------------------------------------------
      // Case B: Subscription reactivated → unsubscribe from IA prospects
      // ------------------------------------------------------------------
      if (isNowActive) {
        const db = admin.firestore();
        const userSnap = await db.collection("users").doc(providerId).get();
        const email = userSnap.data()?.email;
        if (!email) {
          console.log(`[iaToolCampaign] No email for ${providerId} — cannot unsubscribe.`);
          return;
        }

        const subscriberUid = await mailwizz.searchSubscriberByEmail(email);
        if (subscriberUid) {
          await mailwizz.unsubscribeSubscriber(subscriberUid);
          console.log(
            `[iaToolCampaign] Unsubscribed ${maskEmail(email)} from IA prospects (reactivated).`
          );
        } else {
          console.log(
            `[iaToolCampaign] ${maskEmail(email)} not found in IA prospects list — nothing to unsubscribe.`
          );
        }
      }
    } catch (error) {
      console.error(`[iaToolCampaign] Error in iaProspectOnSubscriptionChanged for ${providerId}:`, error);
    }
  }
);

// -------------------------------------------------------------------------
// 2. iaProspectOnTrialExhausted
//    Trigger: onDocumentUpdated on ai_usage/{providerId}
//    When trialCallsUsed reaches >= MAX_AI_TRIAL_CALLS and user has no active subscription
// -------------------------------------------------------------------------

export const iaProspectOnTrialExhausted = onDocumentUpdated(
  {
    document: "ai_usage/{providerId}",
    region: "europe-west3",
    cpu: 0.083,
  },
  async (event) => {
    const listUid = getIaListUid();
    if (!listUid) return;

    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const providerId = event.params.providerId;

    if (!before || !after) return;

    const beforeCalls: number = before.trialCallsUsed || 0;
    const afterCalls: number = after.trialCallsUsed || 0;

    // Only trigger when trialCallsUsed actually changes and crosses the threshold
    if (beforeCalls === afterCalls) return;
    if (afterCalls < MAX_AI_TRIAL_CALLS) return;

    try {
      const db = admin.firestore();

      // Check if user has an active subscription
      const subSnap = await db.collection("subscriptions").doc(providerId).get();
      if (subSnap.exists) {
        const subData = subSnap.data();
        if (subData?.status === "active" || subData?.status === "trialing") {
          console.log(
            `[iaToolCampaign] Provider ${providerId} has active subscription — skipping trial exhausted.`
          );
          return;
        }
      }

      // Fetch user data
      const userSnap = await db.collection("users").doc(providerId).get();
      if (!userSnap.exists) {
        console.log(`[iaToolCampaign] User doc not found for ${providerId} — skipping.`);
        return;
      }
      const userData = userSnap.data()!;

      const fields = mapProviderToIaProspectFields(userData, providerId);
      fields.SUBSCRIPTION_STATUS = "trial_exhausted";

      const mailwizz = new MailwizzAPI(listUid);
      await mailwizz.createSubscriber(fields as SubscriberData);

      console.log(
        `[iaToolCampaign] Trial exhausted for ${maskEmail(userData.email)} (${afterCalls}/${MAX_AI_TRIAL_CALLS} calls) — subscribed to IA prospects.`
      );
    } catch (error) {
      console.error(`[iaToolCampaign] Error in iaProspectOnTrialExhausted for ${providerId}:`, error);
    }
  }
);

// -------------------------------------------------------------------------
// 3. iaProspectSyncFieldsCron
//    Schedule: daily at 03:00 UTC
//    Syncs fresh Firestore data to MailWizz for all IA prospect subscribers
// -------------------------------------------------------------------------

export const iaProspectSyncFieldsCron = onSchedule(
  {
    schedule: "0 3 * * *",
    timeZone: "UTC",
    region: "europe-west3",
    cpu: 0.083,
    memory: "256MiB",
  },
  async () => {
    const listUid = getIaListUid();
    if (!listUid) return;

    console.log("[iaToolCampaign] Starting daily IA prospect field sync...");

    const mailwizz = new MailwizzAPI(listUid);
    const db = admin.firestore();

    let page = 1;
    let totalPages = 1;
    let updatedCount = 0;
    let errorCount = 0;
    const batchSize = 50;

    try {
      // Paginate through all subscribers in the IA prospects list
      do {
        const response = await (mailwizz as any).fetchSubscribersPage(page, batchSize);

        // If the MailwizzAPI doesn't have fetchSubscribersPage, use raw axios
        // This is a direct API call since MailwizzAPI may not expose list pagination
        let subscribers: Array<{ subscriber_uid: string; EMAIL: string; [key: string]: any }> = [];

        if (response && response.records) {
          subscribers = response.records;
          totalPages = response.total_pages || 1;
        } else {
          // Fallback: use axios directly via the config
          const axios = require("axios");
          const { validateMailWizzConfig } = require("../config");
          const config = validateMailWizzConfig();

          const apiResponse = await axios.get(
            `${config.apiUrl}/lists/${listUid}/subscribers?page=${page}&per_page=${batchSize}`,
            {
              headers: {
                "X-MW-PUBLIC-KEY": config.apiKey,
                "X-MW-CUSTOMER-ID": config.customerId,
                "User-Agent": "SOS-Platform/1.0",
              },
              timeout: 15000,
            }
          );

          const data = apiResponse.data?.data;
          subscribers = data?.records || [];
          totalPages = data?.total_pages || 1;
        }

        if (subscribers.length === 0) break;

        // Process subscribers in this page
        for (const subscriber of subscribers) {
          const email = subscriber.EMAIL;
          const subscriberUid = subscriber.subscriber_uid;

          if (!email || !subscriberUid) continue;

          try {
            // Find the user doc by email
            const userQuery = await db
              .collection("users")
              .where("email", "==", email)
              .limit(1)
              .get();

            if (userQuery.empty) {
              console.log(`[iaToolCampaign] Sync: no user doc for ${maskEmail(email)} — skipping.`);
              continue;
            }

            const userDoc = userQuery.docs[0];
            const userData = userDoc.data();
            const providerId = userDoc.id;

            const fields = mapProviderToIaProspectFields(userData, providerId);

            // Also refresh subscription status
            const subSnap = await db.collection("subscriptions").doc(providerId).get();
            if (subSnap.exists) {
              const subData = subSnap.data();
              fields.SUBSCRIPTION_STATUS = subData?.status || "unknown";

              // If they now have an active subscription, unsubscribe them
              if (subData?.status === "active" || subData?.status === "trialing") {
                await mailwizz.unsubscribeSubscriber(subscriberUid);
                console.log(
                  `[iaToolCampaign] Sync: ${maskEmail(email)} now active — unsubscribed from IA prospects.`
                );
                updatedCount++;
                continue;
              }
            } else {
              fields.SUBSCRIPTION_STATUS = "none";
            }

            await mailwizz.updateSubscriber(subscriberUid, fields);
            updatedCount++;
          } catch (subError) {
            errorCount++;
            console.error(
              `[iaToolCampaign] Sync error for ${maskEmail(email)}:`,
              subError
            );
          }
        }

        page++;
      } while (page <= totalPages);

      console.log(
        `[iaToolCampaign] Daily sync complete: ${updatedCount} updated, ${errorCount} errors.`
      );
    } catch (error) {
      console.error("[iaToolCampaign] Fatal error in iaProspectSyncFieldsCron:", error);
    }
  }
);

// -------------------------------------------------------------------------
// 4. iaProspectResubscribeAfterCancel
//    Schedule: daily at 10:00 UTC
//    Re-subscribes providers who cancelled 7+ days ago and haven't been re-processed
// -------------------------------------------------------------------------

export const iaProspectResubscribeAfterCancel = onSchedule(
  {
    schedule: "0 10 * * *",
    timeZone: "UTC",
    region: "europe-west3",
    cpu: 0.083,
    memory: "256MiB",
  },
  async () => {
    const listUid = getIaListUid();
    if (!listUid) return;

    console.log("[iaToolCampaign] Starting resubscribe-after-cancel check...");

    const db = admin.firestore();
    const mailwizz = new MailwizzAPI(listUid);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoTimestamp = admin.firestore.Timestamp.fromDate(sevenDaysAgo);

    let processedCount = 0;
    let subscribedCount = 0;
    let errorCount = 0;

    try {
      // Query cancelled subscriptions older than 7 days that haven't been re-processed
      const snapshot = await db
        .collection("subscriptions")
        .where("status", "==", "cancelled")
        .where("canceledAt", "<=", sevenDaysAgoTimestamp)
        .get();

      if (snapshot.empty) {
        console.log("[iaToolCampaign] No cancelled subscriptions older than 7 days found.");
        return;
      }

      for (const doc of snapshot.docs) {
        const subData = doc.data();
        const providerId = doc.id;

        // Skip if already re-processed
        if (subData.iaProspectResubscribed === true) {
          continue;
        }

        processedCount++;

        try {
          // Fetch user data
          const userSnap = await db.collection("users").doc(providerId).get();
          if (!userSnap.exists) {
            console.log(`[iaToolCampaign] Resubscribe: user doc not found for ${providerId} — skipping.`);
            continue;
          }
          const userData = userSnap.data()!;
          const email = userData.email;

          if (!email) {
            console.log(`[iaToolCampaign] Resubscribe: no email for ${providerId} — skipping.`);
            continue;
          }

          // Check if already in the IA prospects list
          const existingSubscriber = await mailwizz.searchSubscriberByEmail(email);
          if (!existingSubscriber) {
            // Not in list — subscribe them
            const fields = mapProviderToIaProspectFields(userData, providerId);
            fields.SUBSCRIPTION_STATUS = "cancelled";

            await mailwizz.createSubscriber(fields as SubscriberData);
            subscribedCount++;
            console.log(
              `[iaToolCampaign] Resubscribed ${maskEmail(email)} to IA prospects (cancelled 7+ days ago).`
            );
          } else {
            console.log(
              `[iaToolCampaign] ${maskEmail(email)} already in IA prospects list — skipping.`
            );
          }

          // Mark as re-processed to prevent future re-processing
          await db.collection("subscriptions").doc(providerId).update({
            iaProspectResubscribed: true,
          });
        } catch (subError) {
          errorCount++;
          console.error(
            `[iaToolCampaign] Resubscribe error for ${providerId}:`,
            subError
          );
        }
      }

      console.log(
        `[iaToolCampaign] Resubscribe-after-cancel complete: ${processedCount} processed, ${subscribedCount} subscribed, ${errorCount} errors.`
      );
    } catch (error) {
      console.error("[iaToolCampaign] Fatal error in iaProspectResubscribeAfterCancel:", error);
    }
  }
);
