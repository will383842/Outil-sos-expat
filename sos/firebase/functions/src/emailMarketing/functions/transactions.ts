import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { MailwizzAPI } from "../utils/mailwizz";
import { logGA4Event, logTrustpilotEvent } from "../utils/analytics";
import { getLanguageCode } from "../config";
// P2-2 FIX: Unified payment status checks
import { isPaymentCompleted } from "../../utils/paymentStatusUtils";


/**
 * FUNCTION 3: Handle Call Completed
 * Trigger: onUpdate on calls/{callId}
 * Sends completion emails to client and provider
 */
export const handleCallCompleted = onDocumentUpdated(
  {
    document: "call_sessions/{sessionId}",
    region: "europe-west3",
    cpu: 0.083,
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const sessionId = event.params.sessionId;

    if (!before || !after) {
      console.warn(`⚠️ No data for call session ${sessionId}`);
      return;
    }

    // Only process when status changes to completed
    if (before.status !== "completed" && after.status === "completed") {
      try {
        const mailwizz = new MailwizzAPI();

        // Get provider data
        const providerDoc = await admin
          .firestore()
          .collection("users")
          .doc(after.providerId)
          .get();

        if (!providerDoc.exists) {
          console.warn(`⚠️ Provider ${after.providerId} not found`);
          return;
        }

        const provider = providerDoc.data();

        // Update provider stats in MailWizz
        const totalCalls = (provider?.totalCalls || 0) + 1;
        try {
          await mailwizz.updateSubscriber(after.providerId, {
            TOTAL_CALLS: totalCalls.toString(),
          });
        } catch (updateError) {
          console.error(`❌ Error updating provider stats:`, updateError);
        }

        // Get client data
        const clientDoc = await admin
          .firestore()
          .collection("users")
          .doc(after.clientId)
          .get();

        if (!clientDoc.exists) {
          console.warn(`⚠️ Client ${after.clientId} not found`);
          return;
        }

        const client = clientDoc.data();
        const clientLang = getLanguageCode(
          client?.language || client?.preferredLanguage || client?.lang || "en"
        );
        const providerLang = getLanguageCode(
          provider?.language || provider?.preferredLanguage || provider?.lang || "en"
        );

        // Send call completed emails
        const duration = after.callDuration || after.duration || 0;
        const amount = after.price || after.amount || 0;

        // Email to client
        try {
          await mailwizz.sendTransactional({
            to: client?.email || after.clientId,
            template: `TR_CLI_call-completed_${clientLang}`,
            customFields: {
              FNAME: client?.firstName || "",
              EXPERT_NAME: provider?.firstName || provider?.name || "Provider",
              DURATION: duration.toString(),
              AMOUNT: amount.toString(),
            },
          });
        } catch (emailError) {
          console.error(`❌ Error sending client email:`, emailError);
        }

        // Email to provider
        try {
          await mailwizz.sendTransactional({
            to: provider?.email || after.providerId,
            template: `TR_PRO_call-completed_${providerLang}`,
            customFields: {
              FNAME: provider?.firstName || "",
              CLIENT_NAME: client?.firstName || client?.name || "Client",
              DURATION: duration.toString(),
              AMOUNT: amount.toString(),
            },
          });
        } catch (emailError) {
          console.error(`❌ Error sending provider email:`, emailError);
        }

        // Log GA4 event
        await logGA4Event("call_completed", {
          call_id: sessionId,
          client_id: after.clientId,
          provider_id: after.providerId,
          duration: duration,
          amount: amount,
        });

        console.log(`✅ Call completed emails sent: ${sessionId}`);
      } catch (error: any) {
        console.error(`❌ Error in handleCallCompleted for ${sessionId}:`, error);
      }
    }
  }
);

/**
 * FUNCTION 2: Handle Review Submitted
 * Trigger: onCreate on reviews/{reviewId}
 * CRITICAL: Handles Trustpilot invitation for satisfied clients (rating >= 4)
 */
export const handleReviewSubmitted = onDocumentCreated(
  {
    document: "reviews/{reviewId}",
    region: "europe-west3",
    cpu: 0.083,
  },
  async (event) => {
    const review = event.data?.data();
    const reviewId = event.params.reviewId;

    if (!review || !event.data) {
      console.warn(`⚠️ No review data for ${reviewId}`);
      return;
    }
    const { rating, clientId, providerId, comment, callId } = review;

    if (!rating || !clientId || !providerId) {
      console.warn(`⚠️ Invalid review data: ${reviewId}`);
      return;
    }

    try {
      const mailwizz = new MailwizzAPI();

      // Get client data
      const clientDoc = await admin
        .firestore()
        .collection("users")
        .doc(clientId)
        .get();

      if (!clientDoc.exists) {
        console.warn(`⚠️ Client ${clientId} not found`);
        return;
      }

      const client = clientDoc.data();
      const lang = getLanguageCode(
        client?.language || client?.preferredLanguage || client?.lang || "en"
      );

      // Update MailWizz with rating
      try {
        await mailwizz.updateSubscriber(clientId, {
          RATING_STARS: rating.toString(),
        });
      } catch (updateError) {
        console.error(`❌ Error updating rating in MailWizz:`, updateError);
      }

      // CRITICAL: Trustpilot invitation for satisfied clients (rating >= 4)
      if (rating >= 4) {
        // Satisfied client → Trustpilot invitation
        try {
          await mailwizz.sendTransactional({
            to: client?.email || clientId,
            template: `TR_CLI_trustpilot-invite_${lang}`,
            customFields: {
              FNAME: client?.firstName || "",
              TRUSTPILOT_URL: "https://www.trustpilot.com/review/sos-expat.com",
              RATING_STARS: rating.toString(),
            },
          });

          await logTrustpilotEvent("invite_sent", clientId, rating);
          await logGA4Event("trustpilot_invite_sent", {
            user_id: clientId,
            rating_stars: rating,
            email_language: lang.toLowerCase(),
            review_id: reviewId,
          });
        } catch (emailError) {
          console.error(`❌ Error sending Trustpilot invite:`, emailError);
        }

        // Notify provider of good review
        const providerDoc = await admin
          .firestore()
          .collection("users")
          .doc(providerId)
          .get();

        if (providerDoc.exists) {
          const provider = providerDoc.data();
          const providerLang = getLanguageCode(
            provider?.language || provider?.preferredLanguage || provider?.lang || "en"
          );

          try {
            await mailwizz.sendTransactional({
              to: provider?.email || providerId,
              template: `TR_PRO_good-review-received_${providerLang}`,
              customFields: {
                FNAME: provider?.firstName || "",
                CLIENT_NAME: client?.firstName || "Client",
                RATING_STARS: rating.toString(),
                REVIEW_TEXT: comment || "",
              },
            });
          } catch (emailError) {
            console.error(`❌ Error sending provider notification:`, emailError);
          }

          // In-app notification for provider
          try {
            await admin.firestore().collection("inapp_notifications").add({
              uid: providerId,
              type: "new_review",
              title: rating >= 4 ? "⭐ Nouvel avis positif" : "📝 Nouvel avis",
              message: `${client?.firstName || "Un client"} vous a donné ${rating}/5 étoiles`,
              link: "/dashboard/reviews",
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              read: false,
            });
          } catch (notifError) {
            console.error(`❌ Error creating in-app notification:`, notifError);
          }
        }
      } else {
        // Unsatisfied client → Simple thank you
        try {
          await mailwizz.sendTransactional({
            to: client?.email || clientId,
            template: `TR_CLI_thank-you-review_${lang}`,
            customFields: {
              FNAME: client?.firstName || "",
              REVIEW_TEXT: comment || "",
              RATING_STARS: rating.toString(),
            },
          });
        } catch (emailError) {
          console.error(`❌ Error sending thank you email:`, emailError);
        }

        // Store negative review for follow-up (TTL: 90 days)
        // Note: Configure TTL policy in Firebase Console > Firestore > TTL > Add policy for 'expireAt' field
        const ninetyDaysFromNow = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
        try {
          await admin.firestore().collection("negative_reviews").add({
            clientId,
            providerId,
            rating,
            text: comment || "",
            callId,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            expireAt: admin.firestore.Timestamp.fromDate(ninetyDaysFromNow),
          });
        } catch (storeError) {
          console.error(`❌ Error storing negative review:`, storeError);
        }

        // Create support alert for very low ratings (<= 2) (TTL: 30 days)
        if (rating <= 2) {
          const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          try {
            await admin.firestore().collection("support_alerts").add({
              type: "negative_review",
              severity: "high",
              clientId,
              providerId,
              rating,
              text: comment || "",
              callId,
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
              expireAt: admin.firestore.Timestamp.fromDate(thirtyDaysFromNow),
              status: "pending",
            });
          } catch (alertError) {
            console.error(`❌ Error creating support alert:`, alertError);
          }

          await logGA4Event("negative_review_detected", {
            user_id: clientId,
            rating_stars: rating,
            provider_id: providerId,
            review_id: reviewId,
          });
        }

        // Notify provider of negative/neutral review
        const providerDoc = await admin
          .firestore()
          .collection("users")
          .doc(providerId)
          .get();

        if (providerDoc.exists) {
          const provider = providerDoc.data();
          const providerLang = getLanguageCode(
            provider?.language || provider?.preferredLanguage || provider?.lang || "en"
          );

          const template =
            rating === 3
              ? `TR_PRO_neutral-review-received_${providerLang}`
              : `TR_PRO_bad-review-received_${providerLang}`;

          try {
            await mailwizz.sendTransactional({
              to: provider?.email || providerId,
              template,
              customFields: {
                FNAME: provider?.firstName || "",
                CLIENT_NAME: client?.firstName || "Client",
                RATING_STARS: rating.toString(),
                REVIEW_TEXT: comment || "",
              },
            });
          } catch (emailError) {
            console.error(`❌ Error sending provider notification:`, emailError);
          }

          // In-app notification for provider (negative/neutral review)
          try {
            await admin.firestore().collection("inapp_notifications").add({
              uid: providerId,
              type: "new_review",
              title: rating <= 2 ? "⚠️ Avis négatif reçu" : "📝 Nouvel avis",
              message: `${client?.firstName || "Un client"} vous a donné ${rating}/5 étoiles`,
              link: "/dashboard/reviews",
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              read: false,
            });
          } catch (notifError) {
            console.error(`❌ Error creating in-app notification:`, notifError);
          }
        }
      }

      // Update client's review status
      try {
        await admin.firestore().collection("users").doc(clientId).update({
          hasSubmittedReview: true,
          lastReviewAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (updateError) {
        console.error(`❌ Error updating review status:`, updateError);
      }

      console.log(`✅ Review processed: ${reviewId}, rating: ${rating}`);
    } catch (error: any) {
      console.error(`❌ Error in handleReviewSubmitted for ${reviewId}:`, error);
    }
  }
);

/**
 * FUNCTION 4: Handle Payment Received
 * Trigger: onCreate on payments/{paymentId}
 */
export const handlePaymentReceived = onDocumentCreated(
  {
    document: "payments/{paymentId}",
    region: "europe-west3",
    cpu: 0.083,
  },
  async (event) => {
    const payment = event.data?.data();
    const paymentId = event.params.paymentId;

    if (!payment || !event.data) {
      console.warn(`⚠️ No payment data for ${paymentId}`);
      return;
    }

    // P2-2 FIX: Check if payment succeeded using unified utility
    if (isPaymentCompleted(payment.status)) {
      try {
        const mailwizz = new MailwizzAPI();

        // Get user data
        const userDoc = await admin
          .firestore()
          .collection("users")
          .doc(payment.userId || payment.clientId)
          .get();

        if (!userDoc.exists) {
          console.warn(`⚠️ User not found for payment ${paymentId}`);
          return;
        }

        const user = userDoc.data();
        const lang = getLanguageCode(
          user?.language || user?.preferredLanguage || user?.lang || "en"
        );

        await mailwizz.sendTransactional({
          to: user?.email || payment.userId || payment.clientId,
          template: `TR_CLI_payment-success_${lang}`,
          customFields: {
            FNAME: user?.firstName || "",
            AMOUNT: (payment.amount || 0).toString(),
            CURRENCY: payment.currency || "EUR",
            INVOICE_URL: payment.invoiceUrl || `https://sos-expat.com/invoices/${paymentId}`,
          },
        });

        await logGA4Event("payment_received", {
          user_id: payment.userId || payment.clientId,
          payment_id: paymentId,
          amount: payment.amount || 0,
          currency: payment.currency || "EUR",
        });

        console.log(`✅ Payment receipt sent: ${paymentId}`);
      } catch (error: any) {
        console.error(`❌ Error in handlePaymentReceived for ${paymentId}:`, error);
      }
    }
  }
);

/**
 * FUNCTION 5: Handle Payment Failed
 * Trigger: onCreate on payments/{paymentId}
 */
export const handlePaymentFailed = onDocumentCreated(
  {
    document: "payments/{paymentId}",
    region: "europe-west3",
    cpu: 0.083,
  },
  async (event) => {
    const payment = event.data?.data();
    const paymentId = event.params.paymentId;

    if (!payment || !event.data) {
      return;
    }

    // Check if payment failed
    if (payment.status === "failed") {
      try {
        const mailwizz = new MailwizzAPI();

        // Get user data
        const userDoc = await admin
          .firestore()
          .collection("users")
          .doc(payment.userId || payment.clientId)
          .get();

        if (!userDoc.exists) {
          console.warn(`⚠️ User not found for payment ${paymentId}`);
          return;
        }

        const user = userDoc.data();
        const lang = getLanguageCode(
          user?.language || user?.preferredLanguage || user?.lang || "en"
        );

        await mailwizz.sendTransactional({
          to: user?.email || payment.userId || payment.clientId,
          template: `TR_CLI_payment-failed_${lang}`,
          customFields: {
            FNAME: user?.firstName || "",
            AMOUNT: (payment.amount || 0).toString(),
            CURRENCY: payment.currency || "EUR",
            REASON: payment.failureReason || payment.reason || "Unknown error",
            RETRY_URL: "https://sos-expat.com/billing/retry",
          },
        });

        await logGA4Event("payment_failed", {
          user_id: payment.userId || payment.clientId,
          payment_id: paymentId,
          amount: payment.amount || 0,
          reason: payment.failureReason || payment.reason || "Unknown",
        });

        console.log(`✅ Payment failed notification sent: ${paymentId}`);
      } catch (error: any) {
        console.error(`❌ Error in handlePaymentFailed for ${paymentId}:`, error);
      }
    }
  }
);

/**
 * FUNCTION 6: Handle Payout Requested
 * Trigger: onCreate on payouts/{payoutId}
 */
export const handlePayoutRequested = onDocumentCreated(
  {
    document: "payouts/{payoutId}",
    region: "europe-west3",
    cpu: 0.083,
  },
  async (event) => {
    const payout = event.data?.data();
    const payoutId = event.params.payoutId;

    if (!payout || !event.data) {
      console.warn(`⚠️ No payout data for ${payoutId}`);
      return;
    }

    try {
      const mailwizz = new MailwizzAPI();

      // Get provider data
      const userDoc = await admin
        .firestore()
        .collection("users")
        .doc(payout.providerId)
        .get();

      if (!userDoc.exists) {
        console.warn(`⚠️ Provider ${payout.providerId} not found`);
        return;
      }

      const user = userDoc.data();
      const lang = getLanguageCode(
        user?.language || user?.preferredLanguage || user?.lang || "en"
      );

      await mailwizz.sendTransactional({
        to: user?.email || payout.providerId,
        template: `TR_PRO_payout-requested_${lang}`,
        customFields: {
          FNAME: user?.firstName || "",
          AMOUNT: (payout.amount || 0).toString(),
          CURRENCY: payout.currency || "EUR",
          THRESHOLD: (user?.payoutThreshold || 50).toString(),
        },
      });

      await logGA4Event("payout_requested", {
        user_id: payout.providerId,
        payout_id: payoutId,
        amount: payout.amount || 0,
        currency: payout.currency || "EUR",
      });

      console.log(`✅ Payout requested notification sent: ${payoutId}`);
    } catch (error: any) {
      console.error(`❌ Error in handlePayoutRequested for ${payoutId}:`, error);
    }
  }
);

/**
 * FUNCTION 7: Handle Payout Sent
 * Trigger: onUpdate on payouts/{payoutId}
 */
export const handlePayoutSent = onDocumentUpdated(
  {
    document: "payouts/{payoutId}",
    region: "europe-west3",
    cpu: 0.083,
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const payoutId = event.params.payoutId;

    if (!before || !after) {
      return;
    }

    // Only process when status changes to sent
    if (before.status !== "sent" && after.status === "sent") {
      try {
        const mailwizz = new MailwizzAPI();

        // Get provider data
        const userDoc = await admin
          .firestore()
          .collection("users")
          .doc(after.providerId)
          .get();

        if (!userDoc.exists) {
          console.warn(`⚠️ Provider ${after.providerId} not found`);
          return;
        }

        const user = userDoc.data();
        const lang = getLanguageCode(
          user?.language || user?.preferredLanguage || user?.lang || "en"
        );

        await mailwizz.sendTransactional({
          to: user?.email || after.providerId,
          template: `TR_PRO_payout-sent_${lang}`,
          customFields: {
            FNAME: user?.firstName || "",
            AMOUNT: (after.amount || 0).toString(),
            CURRENCY: after.currency || "EUR",
            THRESHOLD: (user?.payoutThreshold || 50).toString(),
          },
        });

        await logGA4Event("payout_sent", {
          user_id: after.providerId,
          payout_id: payoutId,
          amount: after.amount || 0,
          currency: after.currency || "EUR",
        });

        console.log(`✅ Payout sent notification: ${payoutId}`);
      } catch (error: any) {
        console.error(`❌ Error in handlePayoutSent for ${payoutId}:`, error);
      }
    }
  }
);

/**
 * FUNCTION: Handle Call Missed
 * Trigger: onUpdate on calls/{callId} — status changes to "missed" or "no_answer"
 * Sends a missed call notification to the provider
 * 4 template variants selected based on consecutive missed calls count
 */
export const handleCallMissed = onDocumentUpdated(
  {
    document: "call_sessions/{sessionId}",
    region: "europe-west3",
    cpu: 0.083,
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const sessionId = event.params.sessionId;

    if (!before || !after) return;

    const missedStatuses = ["missed", "no_answer", "unanswered"];
    const wasMissed = missedStatuses.includes(before.status);
    const isMissed = missedStatuses.includes(after.status);

    if (!wasMissed && isMissed) {
      try {
        const mailwizz = new MailwizzAPI();

        const providerDoc = await admin
          .firestore()
          .collection("users")
          .doc(after.providerId)
          .get();

        if (!providerDoc.exists) return;

        const provider = providerDoc.data();
        const lang = getLanguageCode(
          provider?.language || provider?.preferredLanguage || "en"
        );

        // Select variant based on consecutive missed calls (1-4)
        const consecutiveMissed = Math.min(
          provider?.consecutiveMissedCalls || after.attemptNumber || 1,
          4
        );
        const variant = consecutiveMissed.toString().padStart(2, "0");

        const clientName = after.clientName || after.clientFirstName || "";

        await mailwizz.sendTransactional({
          to: provider?.email || after.providerId,
          template: `TR_PRO_call-missed-${variant}_${lang}`,
          customFields: {
            FNAME: provider?.firstName || "",
            CLIENT_NAME: clientName,
          },
        });

        await logGA4Event("call_missed_email_sent", {
          call_id: sessionId,
          provider_id: after.providerId,
          variant,
        });

        console.log(`✅ Call missed email sent (variant ${variant}): ${sessionId}`);
      } catch (error: any) {
        console.error(`❌ Error in handleCallMissed for ${sessionId}:`, error);
      }
    }
  }
);

/**
 * FUNCTION: Handle Payout Failed
 * Trigger: onUpdate on payouts/{payoutId} — status changes to "failed"
 */
export const handlePayoutFailed = onDocumentUpdated(
  {
    document: "payouts/{payoutId}",
    region: "europe-west3",
    cpu: 0.083,
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const payoutId = event.params.payoutId;

    if (!before || !after) return;

    if (before.status !== "failed" && after.status === "failed") {
      try {
        const mailwizz = new MailwizzAPI();

        const userDoc = await admin
          .firestore()
          .collection("users")
          .doc(after.providerId)
          .get();

        if (!userDoc.exists) return;

        const user = userDoc.data();
        const lang = getLanguageCode(
          user?.language || user?.preferredLanguage || "en"
        );

        await mailwizz.sendTransactional({
          to: user?.email || after.providerId,
          template: `TR_PRO_payout-failed_${lang}`,
          customFields: {
            FNAME: user?.firstName || "",
            AMOUNT: (after.amount || 0).toString(),
            CURRENCY: after.currency || "EUR",
            REASON: after.failureReason || after.reason || "Unknown error",
            DASHBOARD_URL: "https://sos-expat.com/dashboard",
          },
        });

        await logGA4Event("payout_failed_email_sent", {
          user_id: after.providerId,
          payout_id: payoutId,
          amount: after.amount || 0,
          reason: after.failureReason || after.reason || "Unknown",
        });

        console.log(`✅ Payout failed notification sent: ${payoutId}`);
      } catch (error: any) {
        console.error(`❌ Error in handlePayoutFailed for ${payoutId}:`, error);
      }
    }
  }
);

/**
 * FUNCTION: Handle Payout Threshold Reached
 * Trigger: onUpdate on users/{userId} — totalEarnings crosses the payout threshold
 */
export const handlePayoutThresholdReached = onDocumentUpdated(
  {
    document: "users/{userId}",
    region: "europe-west3",
    cpu: 0.083,
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const userId = event.params.userId;

    if (!before || !after) return;

    // Only for providers
    if (after.role !== "provider" && after.role !== "lawyer") return;

    const threshold = after.payoutThreshold || 50;
    const oldTotal = before.totalEarnings || 0;
    const newTotal = after.totalEarnings || 0;

    // Only fire when threshold is crossed (not on every update)
    if (oldTotal < threshold && newTotal >= threshold) {
      try {
        const mailwizz = new MailwizzAPI();
        const lang = getLanguageCode(
          after.language || after.preferredLanguage || "en"
        );

        await mailwizz.sendTransactional({
          to: after.email || userId,
          template: `TR_PRO_payout-threshold-reached_${lang}`,
          customFields: {
            FNAME: after.firstName || "",
            THRESHOLD: threshold.toString(),
            AMOUNT: newTotal.toString(),
            DASHBOARD_URL: "https://sos-expat.com/dashboard",
          },
        });

        await logGA4Event("payout_threshold_reached", {
          user_id: userId,
          threshold,
          total_earnings: newTotal,
        });

        console.log(`✅ Payout threshold reached email sent: ${userId}`);
      } catch (error: any) {
        console.error(`❌ Error in handlePayoutThresholdReached for ${userId}:`, error);
      }
    }
  }
);

/**
 * FUNCTION: Handle First Earning
 * Trigger: onUpdate on users/{userId} — totalEarnings goes from 0 to > 0
 */
export const handleFirstEarning = onDocumentUpdated(
  {
    document: "users/{userId}",
    region: "europe-west3",
    cpu: 0.083,
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const userId = event.params.userId;

    if (!before || !after) return;

    // Only for providers
    if (after.role !== "provider" && after.role !== "lawyer") return;

    const oldTotal = before.totalEarnings || 0;
    const newTotal = after.totalEarnings || 0;

    // Only fire for first ever earning (0 → >0)
    if (oldTotal === 0 && newTotal > 0) {
      try {
        const mailwizz = new MailwizzAPI();
        const lang = getLanguageCode(
          after.language || after.preferredLanguage || "en"
        );

        await mailwizz.sendTransactional({
          to: after.email || userId,
          template: `TR_PRO_first-earning_${lang}`,
          customFields: {
            FNAME: after.firstName || "",
            AMOUNT: newTotal.toString(),
            CURRENCY: "EUR",
            DASHBOARD_URL: "https://sos-expat.com/dashboard",
          },
        });

        await logGA4Event("first_earning", {
          user_id: userId,
          amount: newTotal,
        });

        console.log(`✅ First earning email sent: ${userId}`);
      } catch (error: any) {
        console.error(`❌ Error in handleFirstEarning for ${userId}:`, error);
      }
    }
  }
);

/**
 * FUNCTION: Handle Earning Credited
 * Trigger: onUpdate on users/{userId} — totalEarnings increases (not first earning)
 * Notifies the provider when a new earning is credited after a call
 */
export const handleEarningCredited = onDocumentUpdated(
  {
    document: "users/{userId}",
    region: "europe-west3",
    cpu: 0.083,
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const userId = event.params.userId;

    if (!before || !after) return;

    // Only for providers
    if (after.role !== "provider" && after.role !== "lawyer") return;

    const oldTotal = before.totalEarnings || 0;
    const newTotal = after.totalEarnings || 0;

    // Only fire when earnings increase (but NOT for first earning — handleFirstEarning handles that)
    if (oldTotal > 0 && newTotal > oldTotal) {
      const earnedAmount = newTotal - oldTotal;

      try {
        const mailwizz = new MailwizzAPI();
        const lang = getLanguageCode(
          after.language || after.preferredLanguage || "en"
        );

        // Try to find the most recent completed call to get the client name
        // Uses single-field index only (providerId) to avoid requiring composite index
        let clientName = "";
        try {
          const recentCallsSnap = await admin
            .firestore()
            .collection("calls")
            .where("providerId", "==", userId)
            .orderBy("createdAt", "desc")
            .limit(5)
            .get();

          const lastCompletedCall = recentCallsSnap.docs
            .map((d) => d.data())
            .find((c) => c.status === "completed");

          if (lastCompletedCall) {
            clientName = lastCompletedCall.clientName || lastCompletedCall.clientFirstName || "";
            if (!clientName && lastCompletedCall.clientId) {
              const clientDoc = await admin
                .firestore()
                .collection("users")
                .doc(lastCompletedCall.clientId)
                .get();
              clientName = clientDoc.data()?.firstName || "";
            }
          }
        } catch {
          // Client name is optional — continue without it
        }

        await mailwizz.sendTransactional({
          to: after.email || userId,
          template: `TR_PRO_earning-credited_${lang}`,
          customFields: {
            FNAME: after.firstName || "",
            AMOUNT: earnedAmount.toString(),
            CURRENCY: "EUR",
            CLIENT_NAME: clientName,
            TOTAL_EARNINGS: newTotal.toString(),
          },
        });

        await logGA4Event("earning_credited", {
          user_id: userId,
          amount: earnedAmount,
          total_earnings: newTotal,
        });

        console.log(`✅ Earning credited email sent: ${userId} (+${earnedAmount})`);
      } catch (error: any) {
        console.error(`❌ Error in handleEarningCredited for ${userId}:`, error);
      }
    }
  }
);

/**
 * FUNCTION: Handle Referral Bonus
 * Trigger: onCreate on referral_bonuses/{bonusId}
 * Notifies the referrer when they earn a bonus from a referral
 */
export const handleReferralBonus = onDocumentCreated(
  {
    document: "referral_bonuses/{bonusId}",
    region: "europe-west3",
    cpu: 0.083,
  },
  async (event) => {
    const bonus = event.data?.data();
    const bonusId = event.params.bonusId;

    if (!bonus || !event.data) return;

    const { referrerId, referralName, bonusAmount, currency } = bonus;

    if (!referrerId) {
      console.warn(`⚠️ No referrerId for bonus ${bonusId}`);
      return;
    }

    try {
      const mailwizz = new MailwizzAPI();

      const referrerDoc = await admin
        .firestore()
        .collection("users")
        .doc(referrerId)
        .get();

      if (!referrerDoc.exists) return;

      const referrer = referrerDoc.data();
      const lang = getLanguageCode(
        referrer?.language || referrer?.preferredLanguage || "en"
      );

      await mailwizz.sendTransactional({
        to: referrer?.email || referrerId,
        template: `TR_PRO_referral-bonus_${lang}`,
        customFields: {
          FNAME: referrer?.firstName || "",
          REFERRAL_NAME: referralName || "",
          BONUS_AMOUNT: (bonusAmount || 0).toString(),
          CURRENCY: currency || "EUR",
          DASHBOARD_URL: "https://sos-expat.com/dashboard",
        },
      });

      await logGA4Event("referral_bonus_email_sent", {
        referrer_id: referrerId,
        bonus_id: bonusId,
        bonus_amount: bonusAmount || 0,
      });

      console.log(`✅ Referral bonus email sent: ${bonusId}`);
    } catch (error: any) {
      console.error(`❌ Error in handleReferralBonus for ${bonusId}:`, error);
    }
  }
);

