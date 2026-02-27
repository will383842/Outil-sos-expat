/**
 * Trigger: On Provider Registered (for blogger recruitment)
 *
 * When a provider registers using a blogger's recruitment link:
 * - Create recruitment link record
 * - Set up 6-month commission window
 * - Award commissions on each provider call for 6 months
 */

import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { Blogger, BloggerRecruitedProvider } from "../types";
import { createBloggerCommission } from "../services/bloggerCommissionService";
import { getBloggerConfigCached } from "../utils/bloggerConfigService";

/**
 * Check and create blogger recruitment link when provider registers
 *
 * This should be called when a provider registers with a blogger recruitment code.
 */
export async function checkBloggerProviderRecruitment(
  providerId: string,
  providerEmail: string,
  providerName: string,
  providerType: "lawyer" | "expat",
  recruitmentCode: string
): Promise<{ success: boolean; bloggerId?: string; error?: string }> {
  const db = getFirestore();

  try {
    // 1. Check config
    const config = await getBloggerConfigCached();
    if (!config.isSystemActive) {
      return { success: false, error: "Blogger system not active" };
    }

    // 2. Find blogger by recruitment code
    const bloggerQuery = await db
      .collection("bloggers")
      .where("affiliateCodeRecruitment", "==", recruitmentCode.toUpperCase())
      .limit(1)
      .get();

    if (bloggerQuery.empty) {
      return { success: false, error: "Blogger not found for recruitment code" };
    }

    const bloggerDoc = bloggerQuery.docs[0];
    const blogger = bloggerDoc.data() as Blogger;
    const bloggerId = bloggerDoc.id;

    // 3. Check blogger status
    if (blogger.status !== "active") {
      return { success: false, error: "Blogger not active" };
    }

    // 4. Check if this provider was already recruited by this blogger
    const existingRecruitment = await db
      .collection("blogger_recruited_providers")
      .where("bloggerId", "==", bloggerId)
      .where("providerId", "==", providerId)
      .limit(1)
      .get();

    if (!existingRecruitment.empty) {
      return { success: false, error: "Provider already recruited by this blogger" };
    }

    // 5. Create recruitment record
    const now = Timestamp.now();
    const windowEndDate = new Date();
    windowEndDate.setMonth(windowEndDate.getMonth() + config.recruitmentWindowMonths);

    const recruitmentRef = db.collection("blogger_recruited_providers").doc();

    const recruitment: BloggerRecruitedProvider = {
      id: recruitmentRef.id,
      bloggerId,
      bloggerCode: blogger.affiliateCodeRecruitment,
      bloggerEmail: blogger.email,
      providerId,
      providerEmail,
      providerType,
      providerName,
      recruitedAt: now,
      commissionWindowEndsAt: Timestamp.fromDate(windowEndDate),
      isActive: true,
      callsWithCommission: 0,
      totalCommissions: 0,
      lastCommissionAt: null,
      createdAt: now,
      updatedAt: now,
    };

    await recruitmentRef.set(recruitment);

    // 6. Update blogger's recruit count (atomic increments to prevent race conditions)
    const currentMonth = new Date().toISOString().substring(0, 7);
    await db.collection("bloggers").doc(bloggerId).update({
      totalRecruits: FieldValue.increment(1),
      "currentMonthStats.recruits": blogger.currentMonthStats?.month === currentMonth
        ? FieldValue.increment(1)
        : 1,
      "currentMonthStats.month": currentMonth,
      updatedAt: now,
    });

    // 7. Create notification
    await db.collection("blogger_notifications").add({
      bloggerId,
      type: "new_referral",
      title: "Nouveau prestataire recruté !",
      titleTranslations: { en: "New provider recruited!" },
      message: `${providerName} s'est inscrit via votre lien. Vous gagnerez $5 sur chaque appel pendant 6 mois.`,
      messageTranslations: {
        en: `${providerName} registered via your link. You'll earn $5 on each call for 6 months.`,
      },
      isRead: false,
      emailSent: false,
      data: {
        referralId: recruitmentRef.id,
      },
      createdAt: now,
    });

    logger.info("[checkBloggerProviderRecruitment] Recruitment recorded", {
      bloggerId,
      providerId,
      recruitmentId: recruitmentRef.id,
    });

    return { success: true, bloggerId };
  } catch (error) {
    logger.error("[checkBloggerProviderRecruitment] Error", { providerId, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Award recruitment commission when a recruited provider completes a call
 *
 * Call this from your call completion logic.
 */
export async function awardBloggerRecruitmentCommission(
  providerId: string,
  callId: string,
  _callDuration: number, // Reserved for future use
  clientId?: string // Anti-double payment: skip blogger who also referred this client
): Promise<{ awarded: boolean; commissions: { bloggerId: string; commissionId: string }[]; error?: string }> {
  const db = getFirestore();
  const commissions: { bloggerId: string; commissionId: string }[] = [];

  try {
    // 1. Check config
    const config = await getBloggerConfigCached();
    if (!config.isSystemActive) {
      return { awarded: false, commissions, error: "Blogger system not active" };
    }

    // Anti-double payment: identify client's blogger referrer (if any)
    let clientBloggerReferrerId: string | null = null;
    if (clientId) {
      const clientDoc = await db.collection("users").doc(clientId).get();
      if (clientDoc.exists) {
        const clientData = clientDoc.data();
        const bloggerCode = clientData?.bloggerReferredBy || clientData?.referredByBlogger;
        if (bloggerCode) {
          const bloggerQuery = await db.collection("bloggers")
            .where("affiliateCodeClient", "==", bloggerCode)
            .limit(1)
            .get();
          if (!bloggerQuery.empty) {
            clientBloggerReferrerId = bloggerQuery.docs[0].id;
          }
        }
      }

      // Fallback: check blogger_clicks attribution (client may have been referred via click, not code)
      if (!clientBloggerReferrerId) {
        const clickQuery = await db.collection("blogger_affiliate_clicks")
          .where("conversionId", "==", clientId)
          .where("converted", "==", true)
          .limit(1)
          .get();
        if (!clickQuery.empty) {
          clientBloggerReferrerId = clickQuery.docs[0].data().bloggerId;
        }
      }
    }

    // 2. Find active recruitment links for this provider
    const now = Timestamp.now();
    const recruitmentQuery = await db
      .collection("blogger_recruited_providers")
      .where("providerId", "==", providerId)
      .where("isActive", "==", true)
      .where("commissionWindowEndsAt", ">", now)
      .get();

    if (recruitmentQuery.empty) {
      return { awarded: false, commissions }; // No active recruitment links
    }

    // 3. Award commission to each blogger who recruited this provider
    for (const recruitmentDoc of recruitmentQuery.docs) {
      const recruitment = recruitmentDoc.data() as BloggerRecruitedProvider;

      // Anti-double payment: skip if this blogger also referred the client
      if (clientBloggerReferrerId && recruitment.bloggerId === clientBloggerReferrerId) {
        logger.info("[awardBloggerRecruitmentCommission] Skipping — same blogger referred client and recruited provider (anti-double)", {
          bloggerId: recruitment.bloggerId,
          clientId,
          callId,
        });
        continue;
      }

      // Check if commission already exists for this call
      const existingCommission = await db
        .collection("blogger_commissions")
        .where("bloggerId", "==", recruitment.bloggerId)
        .where("sourceId", "==", callId)
        .where("type", "==", "recruitment")
        .limit(1)
        .get();

      if (!existingCommission.empty) {
        continue; // Already awarded
      }

      // Calculate months remaining
      const monthsRemaining = Math.ceil(
        (recruitment.commissionWindowEndsAt.toMillis() - now.toMillis()) /
        (30 * 24 * 60 * 60 * 1000)
      );

      // Create commission (split by provider type)
      const result = await createBloggerCommission({
        bloggerId: recruitment.bloggerId,
        type: "recruitment",
        source: {
          id: callId,
          type: "call_session",
          details: {
            providerId: recruitment.providerId,
            providerEmail: recruitment.providerEmail,
            providerType: recruitment.providerType,
            callId,
            recruitmentDate: recruitment.recruitedAt.toDate().toISOString(),
            monthsRemaining,
          },
        },
        providerType: recruitment.providerType,
        description: `Commission recrutement - ${recruitment.providerName} - Appel #${callId.slice(-6)}`,
      });

      if (result.success) {
        commissions.push({
          bloggerId: recruitment.bloggerId,
          commissionId: result.commissionId!,
        });

        // Update recruitment record (atomic increments to prevent race conditions)
        await recruitmentDoc.ref.update({
          callsWithCommission: FieldValue.increment(1),
          totalCommissions: FieldValue.increment(result.amount!),
          lastCommissionAt: now,
          updatedAt: now,
        });

        // Create notification
        await db.collection("blogger_notifications").add({
          bloggerId: recruitment.bloggerId,
          type: "commission_earned",
          title: "Commission recrutement !",
          titleTranslations: { en: "Recruitment commission!" },
          message: `Vous avez gagné $${(result.amount! / 100).toFixed(2)} grâce à ${recruitment.providerName}.`,
          messageTranslations: {
            en: `You earned $${(result.amount! / 100).toFixed(2)} thanks to ${recruitment.providerName}.`,
          },
          isRead: false,
          emailSent: false,
          data: {
            commissionId: result.commissionId,
            amount: result.amount,
          },
          createdAt: now,
        });
      }
    }

    logger.info("[awardBloggerRecruitmentCommission] Commissions awarded", {
      providerId,
      callId,
      commissionsAwarded: commissions.length,
    });

    return {
      awarded: commissions.length > 0,
      commissions,
    };
  } catch (error) {
    logger.error("[awardBloggerRecruitmentCommission] Error", { providerId, error });
    return {
      awarded: false,
      commissions,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Handler: called from consolidatedOnUserCreated when a provider (lawyer/expat) registers.
 * Checks if they were recruited via a blogger's recruitment link and records
 * the recruitment for future $5/call commissions (6-month window).
 *
 * NOTE: The field `providerRecruitedByBlogger` is written to `users/{userId}`
 * by LawyerRegisterForm / ExpatRegisterForm. This handler reads from that document
 * via the consolidatedOnUserCreated dispatcher (which listens to users/{userId}).
 */
export async function handleBloggerProviderRegistered(event: any): Promise<void> {
  const snapshot = event.data;
  if (!snapshot) return;

  const userId = event.params.userId;
  const userData = snapshot.data() as {
    role?: string;
    providerRecruitedByBlogger?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };

  // Only process providers (lawyers and expats)
  if (userData.role !== "lawyer" && userData.role !== "expat") return;

  // Check for blogger recruitment code written by registration form
  if (!userData.providerRecruitedByBlogger) return;

  const providerName =
    `${userData.firstName || ""} ${userData.lastName || ""}`.trim() ||
    userData.email ||
    userId;

  logger.info("[handleBloggerProviderRegistered] Blogger recruitment code detected", {
    userId,
    bloggerCode: userData.providerRecruitedByBlogger,
    role: userData.role,
  });

  await checkBloggerProviderRecruitment(
    userId,
    userData.email || "",
    providerName,
    userData.role as "lawyer" | "expat",
    userData.providerRecruitedByBlogger
  );
}

/**
 * Deactivate expired recruitment windows
 * Call this daily via scheduled function
 */
export async function deactivateExpiredRecruitments(): Promise<{
  deactivated: number;
}> {
  const db = getFirestore();
  const now = Timestamp.now();

  const expiredQuery = await db
    .collection("blogger_recruited_providers")
    .where("isActive", "==", true)
    .where("commissionWindowEndsAt", "<=", now)
    .limit(100)
    .get();

  let deactivated = 0;

  for (const doc of expiredQuery.docs) {
    await doc.ref.update({
      isActive: false,
      updatedAt: now,
    });
    deactivated++;
  }

  if (deactivated > 0) {
    logger.info("[deactivateExpiredRecruitments] Recruitments deactivated", {
      count: deactivated,
    });
  }

  return { deactivated };
}
