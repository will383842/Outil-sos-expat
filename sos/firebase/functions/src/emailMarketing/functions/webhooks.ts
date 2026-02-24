import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as crypto from "crypto";
import { MailwizzAPI } from "../utils/mailwizz";
import { logGA4Event, logEmailEvent, logTrustpilotEvent } from "../utils/analytics";
import { getMailWizzWebhookSecret } from "../config";



/**
 * Verify webhook secret from request headers
 * SECURITY: Uses timing-safe comparison to prevent timing attacks
 * Returns true if secret matches, false otherwise
 */
function verifyWebhookSecret(req: any): boolean {
  try {
    // Check header first, then fall back to query parameter
    const receivedSecret = (req.headers["x-webhook-secret"] as string) || (req.query?.secret as string);
    const expectedSecret = getMailWizzWebhookSecret();

    if (!receivedSecret || !expectedSecret) {
      console.warn("⚠️ Webhook secret missing in request or config");
      return false;
    }

    // SECURITY: Use timing-safe comparison to prevent timing attacks
    const receivedBuffer = Buffer.from(receivedSecret, "utf-8");
    const expectedBuffer = Buffer.from(expectedSecret, "utf-8");

    // If lengths differ, secrets don't match (but still use constant time)
    if (receivedBuffer.length !== expectedBuffer.length) {
      console.warn("⚠️ Webhook secret length mismatch");
      return false;
    }

    const isValid = crypto.timingSafeEqual(receivedBuffer, expectedBuffer);

    if (!isValid) {
      console.warn("⚠️ Webhook secret mismatch");
      return false;
    }

    return true;
  } catch (error: any) {
    console.error("❌ Error verifying webhook secret:", error.message);
    return false;
  }
}

/**
 * WEBHOOK 1: Handle Email Open
 * Trigger: MailWizz webhook for campaign.open event
 * Endpoint: /handleEmailOpen
 */
export const handleEmailOpen = onRequest(
  {
    region: "europe-west1",
    cpu: 0.083,
  },
  // @ts-ignore - Type compatibility issue between firebase-functions and express types
  async (req: any, res: any) => {
    try {
      // Verify webhook secret
      if (!verifyWebhookSecret(req)) {
        res.status(401).send("Unauthorized");
        return;
      }

      const { subscriber_uid, campaign_uid, email } = req.body;

      if (!subscriber_uid || !email) {
        console.warn("⚠️ Missing required fields in email open webhook");
        res.status(400).send("Bad Request: Missing required fields");
        return;
      }

      // Store event in Firestore
      await admin.firestore().collection("email_events").add({
        type: "opened",
        subscriberId: subscriber_uid,
        campaignId: campaign_uid || null,
        email: email,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Log GA4 event
      await logGA4Event("email_opened", {
        subscriber_id: subscriber_uid,
        campaign_id: campaign_uid || "",
        email: email,
      });

      // Try to find user by email and log email event
      try {
        const userQuery = await admin
          .firestore()
          .collection("users")
          .where("email", "==", email)
          .limit(1)
          .get();

        if (!userQuery.empty) {
          const userId = userQuery.docs[0].id;
          await logEmailEvent("opened", userId, campaign_uid || "unknown", {
            subscriber_id: subscriber_uid,
          });
        }
      } catch (userError) {
        console.error("❌ Error finding user for email open:", userError);
        // Don't fail the webhook if user lookup fails
      }

      console.log(`✅ Email opened: ${email} (campaign: ${campaign_uid || "unknown"})`);
      res.status(200).send("OK");
    } catch (error: any) {
      console.error("❌ Error handling email open:", error);
      res.status(500).send("Error");
    }
  }
);

/**
 * WEBHOOK 2: Handle Email Click
 * Trigger: MailWizz webhook for campaign.click event
 * Endpoint: /handleEmailClick
 */
export const handleEmailClick = onRequest(
  {
    region: "europe-west1",
    cpu: 0.083,
  },
  // @ts-ignore - Type compatibility issue between firebase-functions and express types
  async (req: any, res: any) => {
    try {
      // Verify webhook secret
      if (!verifyWebhookSecret(req)) {
        res.status(401).send("Unauthorized");
        return;
      }

      const { subscriber_uid, campaign_uid, email, url } = req.body;

      if (!subscriber_uid || !email) {
        console.warn("⚠️ Missing required fields in email click webhook");
        res.status(400).send("Bad Request: Missing required fields");
        return;
      }

      // Store event in Firestore
      await admin.firestore().collection("email_events").add({
        type: "clicked",
        subscriberId: subscriber_uid,
        campaignId: campaign_uid || null,
        email: email,
        url: url || null,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Log GA4 event
      await logGA4Event("email_clicked", {
        subscriber_id: subscriber_uid,
        campaign_id: campaign_uid || "",
        email: email,
        url: url || "",
      });

      // Special tracking for Trustpilot links
      if (url && url.includes("trustpilot.com")) {
        try {
          const userQuery = await admin
            .firestore()
            .collection("users")
            .where("email", "==", email)
            .limit(1)
            .get();

          if (!userQuery.empty) {
            const userId = userQuery.docs[0].id;
            await logTrustpilotEvent("clicked", userId);
            await logGA4Event("trustpilot_clicked", {
              subscriber_id: subscriber_uid,
              campaign_id: campaign_uid || "",
              user_id: userId,
            });
          }
        } catch (trustpilotError) {
          console.error("❌ Error logging Trustpilot click:", trustpilotError);
          // Don't fail the webhook if Trustpilot logging fails
        }
      }

      // Try to find user by email and log email event
      try {
        const userQuery = await admin
          .firestore()
          .collection("users")
          .where("email", "==", email)
          .limit(1)
          .get();

        if (!userQuery.empty) {
          const userId = userQuery.docs[0].id;
          await logEmailEvent("clicked", userId, campaign_uid || "unknown", {
            subscriber_id: subscriber_uid,
            url: url || "",
          });
        }
      } catch (userError) {
        console.error("❌ Error finding user for email click:", userError);
        // Don't fail the webhook if user lookup fails
      }

      console.log(`✅ Email clicked: ${email} → ${url || "unknown URL"} (campaign: ${campaign_uid || "unknown"})`);
      res.status(200).send("OK");
    } catch (error: any) {
      console.error("❌ Error handling email click:", error);
      res.status(500).send("Error");
    }
  }
);

/**
 * WEBHOOK 3: Handle Email Bounce
 * Trigger: MailWizz webhook for campaign.bounce event
 * Endpoint: /handleEmailBounce
 */
export const handleEmailBounce = onRequest(
  {
    region: "europe-west1",
    cpu: 0.083,
  },
  // @ts-ignore - Type compatibility issue between firebase-functions and express types
  async (req: any, res: any) => {
    try {
      // Verify webhook secret
      if (!verifyWebhookSecret(req)) {
        res.status(401).send("Unauthorized");
        return;
      }

      const { subscriber_uid, email, bounce_type, message } = req.body;

      if (!subscriber_uid || !email) {
        console.warn("⚠️ Missing required fields in email bounce webhook");
        res.status(400).send("Bad Request: Missing required fields");
        return;
      }

      // Store event in Firestore
      await admin.firestore().collection("email_events").add({
        type: "bounced",
        subscriberId: subscriber_uid,
        email: email,
        bounceType: bounce_type || "unknown",
        message: message || null,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Log GA4 event
      await logGA4Event("email_bounced", {
        subscriber_id: subscriber_uid,
        bounce_type: bounce_type || "unknown",
        email: email,
      });

      // Handle hard bounces - mark email as invalid
      if (bounce_type === "hard") {
        try {
          const userQuery = await admin
            .firestore()
            .collection("users")
            .where("email", "==", email)
            .limit(1)
            .get();

          if (!userQuery.empty) {
            const userId = userQuery.docs[0].id;
            const mailwizz = new MailwizzAPI();

            // Update user in Firestore
            await admin.firestore().collection("users").doc(userId).update({
              emailBounced: true,
              emailBouncedAt: admin.firestore.FieldValue.serverTimestamp(),
              emailStatus: "invalid",
            });

            // Stop all autoresponders for this user
            try {
              await mailwizz.stopAutoresponders(userId, "hard_bounce");
            } catch (stopError) {
              console.error("❌ Error stopping autoresponders:", stopError);
              // Don't fail if stopping autoresponders fails
            }

            // Log email event
            await logEmailEvent("bounced", userId, "unknown", {
              subscriber_id: subscriber_uid,
              bounce_type: "hard",
            });

            console.log(`✅ Hard bounce - email marked invalid: ${email}`);
          }
        } catch (hardBounceError) {
          console.error("❌ Error handling hard bounce:", hardBounceError);
          // Don't fail the webhook if hard bounce handling fails
        }
      } else {
        // Soft bounce - just log it
        try {
          const userQuery = await admin
            .firestore()
            .collection("users")
            .where("email", "==", email)
            .limit(1)
            .get();

          if (!userQuery.empty) {
            const userId = userQuery.docs[0].id;
            await logEmailEvent("bounced", userId, "unknown", {
              subscriber_id: subscriber_uid,
              bounce_type: "soft",
            });
          }
        } catch (softBounceError) {
          console.error("❌ Error logging soft bounce:", softBounceError);
        }
      }

      console.log(`✅ Bounce handled: ${email} (${bounce_type || "unknown"})`);
      res.status(200).send("OK");
    } catch (error: any) {
      console.error("❌ Error handling bounce:", error);
      res.status(500).send("Error");
    }
  }
);

/**
 * WEBHOOK 4: Handle Email Complaint
 * Trigger: MailWizz webhook for campaign.complaint event
 * Endpoint: /handleEmailComplaint
 */
export const handleEmailComplaint = onRequest(
  {
    region: "europe-west1",
    cpu: 0.083,
  },
  // @ts-ignore - Type compatibility issue between firebase-functions and express types
  async (req: any, res: any) => {
    try {
      // Verify webhook secret
      if (!verifyWebhookSecret(req)) {
        res.status(401).send("Unauthorized");
        return;
      }

      const { subscriber_uid, email, message } = req.body;

      if (!subscriber_uid || !email) {
        console.warn("⚠️ Missing required fields in email complaint webhook");
        res.status(400).send("Bad Request: Missing required fields");
        return;
      }

      // Store event in Firestore
      await admin.firestore().collection("email_events").add({
        type: "complained",
        subscriberId: subscriber_uid,
        email: email,
        message: message || null,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Log GA4 event
      await logGA4Event("email_complained", {
        subscriber_id: subscriber_uid,
        email: email,
      });

      // Auto-unsubscribe user who complained
      try {
        const userQuery = await admin
          .firestore()
          .collection("users")
          .where("email", "==", email)
          .limit(1)
          .get();

        if (!userQuery.empty) {
          const userId = userQuery.docs[0].id;
          const mailwizz = new MailwizzAPI();

          // Update user in Firestore
          await admin.firestore().collection("users").doc(userId).update({
            emailComplaint: true,
            emailComplaintAt: admin.firestore.FieldValue.serverTimestamp(),
            unsubscribed: true,
            unsubscribedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Unsubscribe from MailWizz
          try {
            await mailwizz.unsubscribeSubscriber(userId);
          } catch (unsubscribeError) {
            console.error("❌ Error unsubscribing from MailWizz:", unsubscribeError);
            // Don't fail if MailWizz unsubscribe fails
          }

          // Stop all autoresponders
          try {
            await mailwizz.stopAutoresponders(userId, "spam_complaint");
          } catch (stopError) {
            console.error("❌ Error stopping autoresponders:", stopError);
            // Don't fail if stopping autoresponders fails
          }

          // Log email event
          await logEmailEvent("complained", userId, "unknown", {
            subscriber_id: subscriber_uid,
          });

          console.log(`✅ Complaint - user auto-unsubscribed: ${email}`);
        }
      } catch (complaintError) {
        console.error("❌ Error handling complaint:", complaintError);
        // Don't fail the webhook if complaint handling fails
      }

      console.log(`✅ Complaint handled: ${email}`);
      res.status(200).send("OK");
    } catch (error: any) {
      console.error("❌ Error handling complaint:", error);
      res.status(500).send("Error");
    }
  }
);

/**
 * WEBHOOK 5: Handle Unsubscribe
 * Trigger: MailWizz webhook for subscriber.unsubscribe event
 * Endpoint: /handleUnsubscribe
 */
export const handleUnsubscribe = onRequest(
  {
    region: "europe-west1",
    cpu: 0.083,
  },
  // @ts-ignore - Type compatibility issue between firebase-functions and express types
  async (req: any, res: any) => {
    try {
      // Verify webhook secret
      if (!verifyWebhookSecret(req)) {
        res.status(401).send("Unauthorized");
        return;
      }

      const { subscriber_uid, email } = req.body;

      if (!subscriber_uid || !email) {
        console.warn("⚠️ Missing required fields in unsubscribe webhook");
        res.status(400).send("Bad Request: Missing required fields");
        return;
      }

      // Store event in Firestore
      await admin.firestore().collection("email_events").add({
        type: "unsubscribed",
        subscriberId: subscriber_uid,
        email: email,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Log GA4 event
      await logGA4Event("email_unsubscribed", {
        subscriber_id: subscriber_uid,
        email: email,
      });

      // Update user in Firebase
      try {
        const userQuery = await admin
          .firestore()
          .collection("users")
          .where("email", "==", email)
          .limit(1)
          .get();

        if (!userQuery.empty) {
          const userId = userQuery.docs[0].id;
          const mailwizz = new MailwizzAPI();

          // Update user in Firestore
          await admin.firestore().collection("users").doc(userId).update({
            unsubscribed: true,
            unsubscribedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Ensure unsubscribe in MailWizz (if not already done)
          try {
            await mailwizz.unsubscribeSubscriber(userId);
          } catch (unsubscribeError) {
            console.error("❌ Error unsubscribing from MailWizz:", unsubscribeError);
            // Don't fail if MailWizz unsubscribe fails (might already be unsubscribed)
          }

          // Stop all autoresponders
          try {
            await mailwizz.stopAutoresponders(userId, "user_unsubscribed");
          } catch (stopError) {
            console.error("❌ Error stopping autoresponders:", stopError);
            // Don't fail if stopping autoresponders fails
          }

          // Log email event
          await logEmailEvent("unsubscribed", userId, "unknown", {
            subscriber_id: subscriber_uid,
          });

          console.log(`✅ User unsubscribed in Firebase: ${email}`);
        }
      } catch (unsubscribeError) {
        console.error("❌ Error handling unsubscribe:", unsubscribeError);
        // Don't fail the webhook if unsubscribe handling fails
      }

      console.log(`✅ Unsubscribe handled: ${email}`);
      res.status(200).send("OK");
    } catch (error: any) {
      console.error("❌ Error handling unsubscribe:", error);
      res.status(500).send("Error");
    }
  }
);
