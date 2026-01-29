/**
 * Trigger: onCallCompleted
 *
 * Fires when a call session is marked as completed.
 * - Checks if client was referred by a chatter
 * - Creates client referral commission
 * - Checks if provider was recruited by a chatter
 * - Creates recruitment commission (first call only)
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { ChatterNotification, Chatter } from "../types";
import { createCommission } from "../services";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

interface CallSession {
  id: string;
  status: string;
  clientId: string;
  providerId: string;
  providerType: "lawyer" | "expat";
  duration?: number;
  connectionFee?: number;
  totalAmount?: number;
  isPaid?: boolean;
  createdAt: Timestamp;
  completedAt?: Timestamp;
}

interface UserDocument {
  email: string;
  firstName?: string;
  lastName?: string;
  referredByChatter?: string; // Chatter code that referred this user
  referredByChatterId?: string;
  providerRecruitedByChatter?: string; // For providers: chatter code that recruited them
  providerRecruitedByChatterId?: string;
  providerFirstCallReceived?: boolean; // Track if provider received first call
}

export const chatterOnCallCompleted = onDocumentUpdated(
  {
    document: "call_sessions/{sessionId}",
    region: "europe-west1",
    memory: "512MiB",
    timeoutSeconds: 120,
  },
  async (event) => {
    ensureInitialized();

    const beforeData = event.data?.before.data() as CallSession | undefined;
    const afterData = event.data?.after.data() as CallSession | undefined;

    if (!beforeData || !afterData) {
      return;
    }

    // Only trigger when call is marked as completed and paid
    const wasNotCompleted =
      beforeData.status !== "completed" || !beforeData.isPaid;
    const isNowCompleted =
      afterData.status === "completed" && afterData.isPaid;

    if (!wasNotCompleted || !isNowCompleted) {
      return;
    }

    const sessionId = event.params.sessionId;
    const session = afterData;

    logger.info("[chatterOnCallCompleted] Processing completed call", {
      sessionId,
      clientId: session.clientId,
      providerId: session.providerId,
      duration: session.duration,
    });

    const db = getFirestore();

    try {
      // 1. Check if client was referred by a chatter
      const clientDoc = await db.collection("users").doc(session.clientId).get();

      if (clientDoc.exists) {
        const clientData = clientDoc.data() as UserDocument;

        if (clientData.referredByChatterId) {
          // Create client referral commission
          const result = await createCommission({
            chatterId: clientData.referredByChatterId,
            type: "client_referral",
            source: {
              id: sessionId,
              type: "call_session",
              details: {
                clientId: session.clientId,
                clientEmail: clientData.email,
                callSessionId: sessionId,
                callDuration: session.duration,
                connectionFee: session.connectionFee,
              },
            },
          });

          if (result.success) {
            logger.info("[chatterOnCallCompleted] Client referral commission created", {
              sessionId,
              chatterId: clientData.referredByChatterId,
              commissionId: result.commissionId,
              amount: result.amount,
            });

            // Create notification for chatter
            await createCommissionNotification(
              db,
              clientData.referredByChatterId,
              "commission_earned",
              "Nouvelle commission client !",
              `Vous avez gagné une commission pour le client ${maskEmail(clientData.email)}.`,
              result.commissionId!,
              result.amount!
            );

            // Check if this is the first commission for the chatter (award badge)
            await checkFirstClientBadge(db, clientData.referredByChatterId);

            // Check if the chatter was recruited by another chatter (recruiter commission)
            const chatterDoc = await db
              .collection("chatters")
              .doc(clientData.referredByChatterId)
              .get();

            if (chatterDoc.exists) {
              const chatter = chatterDoc.data() as Chatter;

              // If this chatter was recruited and hasn't generated a recruiter commission yet
              if (chatter.recruitedBy && !chatter.recruiterCommissionPaid) {
                // Mark that recruiter commission will be paid (prevent race conditions)
                await db.collection("chatters").doc(clientData.referredByChatterId).update({
                  recruiterCommissionPaid: true,
                  updatedAt: Timestamp.now(),
                });

                // Create recruitment commission for the recruiter
                const recruiterResult = await createCommission({
                  chatterId: chatter.recruitedBy,
                  type: "recruitment",
                  source: {
                    id: clientData.referredByChatterId,
                    type: "user",
                    details: {
                      providerId: clientData.referredByChatterId,
                      providerEmail: chatter.email,
                      providerType: "expat", // Chatters are treated as expat-type
                      firstCallId: sessionId,
                    },
                  },
                });

                if (recruiterResult.success) {
                  logger.info("[chatterOnCallCompleted] Recruiter commission created", {
                    recruiterId: chatter.recruitedBy,
                    recruitedChatterId: clientData.referredByChatterId,
                    commissionId: recruiterResult.commissionId,
                  });

                  await createCommissionNotification(
                    db,
                    chatter.recruitedBy,
                    "commission_earned",
                    "Commission de recrutement !",
                    `Votre filleul ${chatter.firstName} ${chatter.lastName.charAt(0)}. a apporté son premier client !`,
                    recruiterResult.commissionId!,
                    recruiterResult.amount!
                  );
                } else {
                  // If commission creation failed, rollback the flag
                  await db.collection("chatters").doc(clientData.referredByChatterId).update({
                    recruiterCommissionPaid: false,
                    updatedAt: Timestamp.now(),
                  });
                }
              }
            }
          } else {
            logger.warn("[chatterOnCallCompleted] Failed to create client commission", {
              sessionId,
              chatterId: clientData.referredByChatterId,
              error: result.error,
            });
          }
        }
      }

      // 2. Check if provider was recruited by a chatter (commission for EACH call during 6 months)
      const providerDoc = await db.collection("users").doc(session.providerId).get();

      if (providerDoc.exists) {
        const providerData = providerDoc.data() as UserDocument;

        // Check if provider was recruited by a chatter
        if (providerData.providerRecruitedByChatterId) {
          // Check if recruitment link is still active (within 6 months)
          const linkQuery = await db
            .collection("chatter_recruitment_links")
            .where("chatterId", "==", providerData.providerRecruitedByChatterId)
            .where("usedByProviderId", "==", session.providerId)
            .where("isActive", "==", true)
            .limit(1)
            .get();

          // Check if link exists and is not expired
          let isWithinRecruitmentPeriod = false;
          let recruitmentLink = null;

          if (!linkQuery.empty) {
            recruitmentLink = linkQuery.docs[0];
            const linkData = recruitmentLink.data();
            // Link is active if expiresAt is in the future
            isWithinRecruitmentPeriod = linkData.expiresAt.toMillis() > Date.now();
          }

          if (isWithinRecruitmentPeriod) {
            // Track if this is the first call (for badge)
            const isFirstCall = !providerData.providerFirstCallReceived;

            if (isFirstCall) {
              // Mark provider as having received first call
              await db.collection("users").doc(session.providerId).update({
                providerFirstCallReceived: true,
                providerFirstCallAt: Timestamp.now(),
              });
            }

            // Create recruitment commission for EACH call during the 6-month period
            const result = await createCommission({
              chatterId: providerData.providerRecruitedByChatterId,
              type: "recruitment",
              source: {
                id: session.providerId,
                type: "provider",
                details: {
                  providerId: session.providerId,
                  providerEmail: providerData.email,
                  providerType: session.providerType,
                  firstCallId: isFirstCall ? sessionId : undefined,
                  callSessionId: sessionId,
                },
              },
            });

            if (result.success) {
              logger.info("[chatterOnCallCompleted] Provider recruitment commission created", {
                sessionId,
                chatterId: providerData.providerRecruitedByChatterId,
                providerId: session.providerId,
                commissionId: result.commissionId,
                isFirstCall,
              });

              await createCommissionNotification(
                db,
                providerData.providerRecruitedByChatterId,
                "commission_earned",
                "Commission de recrutement prestataire !",
                isFirstCall
                  ? `Le prestataire ${maskEmail(providerData.email)} a reçu son premier appel !`
                  : `Le prestataire ${maskEmail(providerData.email)} a reçu un appel !`,
                result.commissionId!,
                result.amount!
              );

              // Update recruitment link commission count
              if (recruitmentLink) {
                const currentCount = recruitmentLink.data().commissionCount || 0;
                await recruitmentLink.ref.update({
                  commissionCount: currentCount + 1,
                  lastCommissionAt: Timestamp.now(),
                  lastCommissionId: result.commissionId,
                });
              }

              // Check first recruitment badge (only on first call)
              if (isFirstCall) {
                await checkFirstRecruitmentBadge(db, providerData.providerRecruitedByChatterId);
              }
            }
          } else {
            logger.info("[chatterOnCallCompleted] Recruitment link expired, no commission", {
              sessionId,
              providerId: session.providerId,
              chatterId: providerData.providerRecruitedByChatterId,
            });
          }
        }
      }

      logger.info("[chatterOnCallCompleted] Call processing complete", {
        sessionId,
      });
    } catch (error) {
      logger.error("[chatterOnCallCompleted] Error", { sessionId, error });
    }
  }
);

/**
 * Create a commission notification
 */
async function createCommissionNotification(
  db: FirebaseFirestore.Firestore,
  chatterId: string,
  type: ChatterNotification["type"],
  title: string,
  message: string,
  commissionId: string,
  amount: number
): Promise<void> {
  const notificationRef = db.collection("chatter_notifications").doc();

  const notification: ChatterNotification = {
    id: notificationRef.id,
    chatterId,
    type,
    title,
    titleTranslations: {
      en:
        type === "commission_earned"
          ? "New commission earned!"
          : "Recruitment commission!",
    },
    message,
    messageTranslations: {
      en: message, // Simplified for now
    },
    actionUrl: "/chatter/dashboard",
    isRead: false,
    emailSent: false,
    data: {
      commissionId,
      amount,
    },
    createdAt: Timestamp.now(),
  };

  await notificationRef.set(notification);
}

/**
 * Check and award first client badge
 */
async function checkFirstClientBadge(
  db: FirebaseFirestore.Firestore,
  chatterId: string
): Promise<void> {
  const chatterDoc = await db.collection("chatters").doc(chatterId).get();

  if (!chatterDoc.exists) return;

  const chatter = chatterDoc.data() as Chatter;

  // Check if badge already awarded
  if (chatter.badges.includes("first_client")) return;

  // Award badge
  await db.collection("chatters").doc(chatterId).update({
    badges: [...chatter.badges, "first_client"],
  });

  // Create badge award record
  await db.collection("chatter_badge_awards").add({
    chatterId,
    chatterEmail: chatter.email,
    badgeType: "first_client",
    awardedAt: Timestamp.now(),
    bonusCommissionId: null,
    context: { clientCount: 1 },
  });

  // Create notification
  const notificationRef = db.collection("chatter_notifications").doc();
  await notificationRef.set({
    id: notificationRef.id,
    chatterId,
    type: "badge_earned",
    title: "Badge débloqué : Premier Client !",
    titleTranslations: { en: "Badge unlocked: First Client!" },
    message: "Vous avez référé votre premier client !",
    messageTranslations: { en: "You referred your first client!" },
    isRead: false,
    emailSent: false,
    data: { badgeType: "first_client" },
    createdAt: Timestamp.now(),
  });

  logger.info("[checkFirstClientBadge] Badge awarded", { chatterId });
}

/**
 * Check and award first recruitment badge
 */
async function checkFirstRecruitmentBadge(
  db: FirebaseFirestore.Firestore,
  chatterId: string
): Promise<void> {
  const chatterDoc = await db.collection("chatters").doc(chatterId).get();

  if (!chatterDoc.exists) return;

  const chatter = chatterDoc.data() as Chatter;

  // Check if badge already awarded
  if (chatter.badges.includes("first_recruitment")) return;

  // Award badge
  await db.collection("chatters").doc(chatterId).update({
    badges: [...chatter.badges, "first_recruitment"],
  });

  // Create badge award record
  await db.collection("chatter_badge_awards").add({
    chatterId,
    chatterEmail: chatter.email,
    badgeType: "first_recruitment",
    awardedAt: Timestamp.now(),
    bonusCommissionId: null,
    context: { recruitCount: 1 },
  });

  // Create notification
  const notificationRef = db.collection("chatter_notifications").doc();
  await notificationRef.set({
    id: notificationRef.id,
    chatterId,
    type: "badge_earned",
    title: "Badge débloqué : Premier Recrutement !",
    titleTranslations: { en: "Badge unlocked: First Recruitment!" },
    message: "Vous avez recruté votre premier prestataire !",
    messageTranslations: { en: "You recruited your first provider!" },
    isRead: false,
    emailSent: false,
    data: { badgeType: "first_recruitment" },
    createdAt: Timestamp.now(),
  });

  logger.info("[checkFirstRecruitmentBadge] Badge awarded", { chatterId });
}

/**
 * Mask email for display
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***@***.***";
  const maskedLocal = local.length > 2 ? local.substring(0, 2) + "***" : "***";
  return `${maskedLocal}@${domain}`;
}
