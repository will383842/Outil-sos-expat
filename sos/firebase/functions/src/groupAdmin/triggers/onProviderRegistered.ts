/**
 * Trigger: On Provider Registered (for GroupAdmin recruitment)
 *
 * When a provider (lawyer/expat) registers using a GroupAdmin recruitment link:
 * - Create recruitment link record in group_admin_recruited_providers
 * - Commission will be awarded on each provider call for the window duration
 */

import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";

import { GroupAdmin, GroupAdminRecruitedProvider } from "../types";
import { getGroupAdminConfig } from "../groupAdminConfig";
import { createClientReferralCommission } from "../services/groupAdminCommissionService";

/**
 * Handler called from consolidatedOnUserCreated.
 * Checks if the new provider was recruited via a GroupAdmin code.
 */
export async function handleGroupAdminProviderRegistered(event: any): Promise<void> {
  const snapshot = event.data;
  if (!snapshot) return;

  const userId = event.params.userId;
  const userData = snapshot.data() as {
    role?: string;
    providerRecruitedByGroupAdmin?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };

  // Only process lawyers and expats
  if (userData.role !== "lawyer" && userData.role !== "expat") return;

  // Check if recruited via GroupAdmin code
  if (!userData.providerRecruitedByGroupAdmin) return;

  const providerName = `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || userData.email || userId;

  logger.info("[handleGroupAdminProviderRegistered] GroupAdmin recruitment code detected", {
    userId,
    groupAdminCode: userData.providerRecruitedByGroupAdmin,
    role: userData.role,
  });

  await checkGroupAdminProviderRecruitment(
    userId,
    userData.email || "",
    providerName,
    userData.role as "lawyer" | "expat",
    userData.providerRecruitedByGroupAdmin
  );
}

/**
 * Create the group_admin_recruited_providers record when a provider registers.
 */
export async function checkGroupAdminProviderRecruitment(
  providerId: string,
  providerEmail: string,
  providerName: string,
  providerType: "lawyer" | "expat",
  recruitmentCode: string
): Promise<{ success: boolean; groupAdminId?: string; error?: string }> {
  const db = getFirestore();

  try {
    // 1. Check config
    const config = await getGroupAdminConfig();
    if (!config.isSystemActive) {
      return { success: false, error: "GroupAdmin system not active" };
    }

    // 2. Find GroupAdmin by recruitment code
    const gaQuery = await db
      .collection("group_admins")
      .where("affiliateCodeRecruitment", "==", recruitmentCode.toUpperCase())
      .where("status", "==", "active")
      .limit(1)
      .get();

    if (gaQuery.empty) {
      logger.warn("[checkGroupAdminProviderRecruitment] GroupAdmin not found for code", { recruitmentCode });
      return { success: false, error: "GroupAdmin not found for recruitment code" };
    }

    const gaDoc = gaQuery.docs[0];
    const groupAdmin = gaDoc.data() as GroupAdmin;
    const groupAdminId = gaDoc.id;

    // 3. Check if already recruited
    const existing = await db
      .collection("group_admin_recruited_providers")
      .where("groupAdminId", "==", groupAdminId)
      .where("providerId", "==", providerId)
      .limit(1)
      .get();

    if (!existing.empty) {
      return { success: false, error: "Provider already recruited by this GroupAdmin" };
    }

    // 4. Create recruitment record
    const now = Timestamp.now();
    const windowMonths = config.recruitmentWindowMonths ?? 6;
    const windowEndDate = new Date();
    windowEndDate.setMonth(windowEndDate.getMonth() + windowMonths);

    const recruitmentRef = db.collection("group_admin_recruited_providers").doc();

    const recruitment: GroupAdminRecruitedProvider = {
      id: recruitmentRef.id,
      groupAdminId,
      groupAdminCode: groupAdmin.affiliateCodeRecruitment,
      groupAdminEmail: groupAdmin.email,
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

    // 5. Update GroupAdmin recruit count
    const currentMonth = new Date().toISOString().substring(0, 7);
    await db.collection("group_admins").doc(groupAdminId).update({
      totalRecruits: FieldValue.increment(1),
      "currentMonthStats.recruits": groupAdmin.currentMonthStats?.month === currentMonth
        ? FieldValue.increment(1)
        : 1,
      "currentMonthStats.month": currentMonth,
      updatedAt: now,
    });

    // 6. Notify GroupAdmin (i18n: 9 languages, English fallback)
    const gaLang = groupAdmin.language || "en";
    const recruitTitles: Record<string, string> = {
      fr: "Nouveau prestataire recruté !",
      en: "New provider recruited!",
      es: "¡Nuevo proveedor reclutado!",
      de: "Neuer Anbieter rekrutiert!",
      pt: "Novo prestador recrutado!",
      ru: "Новый поставщик привлечён!",
      hi: "नया प्रदाता भर्ती हुआ!",
      zh: "新服务商已招募！",
      ar: "تم تجنيد مزوّد جديد!",
    };
    const recruitMessages: Record<string, string> = {
      fr: `${providerName} s'est inscrit via votre lien. Vous gagnerez une commission sur chaque appel pendant ${windowMonths} mois.`,
      en: `${providerName} registered via your link. You'll earn a commission on each call for ${windowMonths} months.`,
      es: `${providerName} se registró a través de tu enlace. Ganarás una comisión por cada llamada durante ${windowMonths} meses.`,
      de: `${providerName} hat sich über Ihren Link registriert. Sie verdienen eine Provision für jeden Anruf während ${windowMonths} Monaten.`,
      pt: `${providerName} registrou-se pelo seu link. Você ganhará uma comissão por cada chamada durante ${windowMonths} meses.`,
      ru: `${providerName} зарегистрировался по вашей ссылке. Вы будете получать комиссию за каждый звонок в течение ${windowMonths} месяцев.`,
      hi: `${providerName} आपके लिंक से पंजीकृत हुआ। आप ${windowMonths} महीने तक प्रत्येक कॉल पर कमीशन कमाएंगे।`,
      zh: `${providerName} 通过您的链接注册。您将在 ${windowMonths} 个月内从每次通话中获得佣金。`,
      ar: `${providerName} سجّل عبر رابطك. ستحصل على عمولة عن كل مكالمة لمدة ${windowMonths} أشهر.`,
    };
    await db.collection("group_admin_notifications").add({
      groupAdminId,
      type: "new_provider_recruited",
      title: recruitTitles[gaLang] || recruitTitles.en,
      titleTranslations: recruitTitles,
      message: recruitMessages[gaLang] || recruitMessages.en,
      messageTranslations: recruitMessages,
      isRead: false,
      emailSent: false,
      data: { recruitmentId: recruitmentRef.id },
      createdAt: now,
    });

    logger.info("[checkGroupAdminProviderRecruitment] Recruitment recorded", {
      groupAdminId,
      providerId,
      recruitmentId: recruitmentRef.id,
    });

    return { success: true, groupAdminId };
  } catch (error) {
    logger.error("[checkGroupAdminProviderRecruitment] Error", { providerId, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Award commission to GroupAdmin(s) when a recruited provider completes a paid call.
 * Called from onCallCompleted.
 */
export async function awardGroupAdminProviderRecruitmentCommission(
  providerId: string,
  callId: string
): Promise<{ awarded: boolean; error?: string }> {
  const db = getFirestore();

  try {
    const config = await getGroupAdminConfig();
    if (!config.isSystemActive) {
      return { awarded: false, error: "GroupAdmin system not active" };
    }

    const now = Timestamp.now();

    // Find active recruitment links for this provider
    const recruitmentQuery = await db
      .collection("group_admin_recruited_providers")
      .where("providerId", "==", providerId)
      .where("isActive", "==", true)
      .where("commissionWindowEndsAt", ">", now)
      .get();

    if (recruitmentQuery.empty) {
      return { awarded: false };
    }

    // Anti-double payment: identify the client's GroupAdmin referrer (if any)
    // Lookup call session to get clientId
    let clientGroupAdminReferrerId: string | null = null;
    const callDoc = await db.collection("call_sessions").doc(callId).get();
    if (callDoc.exists) {
      const callData = callDoc.data();
      const clientId = callData?.clientId;
      if (clientId) {
        const clientDoc = await db.collection("users").doc(clientId).get();
        if (clientDoc.exists) {
          const clientData = clientDoc.data();
          const pendingCode = clientData?.pendingReferralCode;
          const referredBy = clientData?.referredBy;
          const groupAdminCode = (pendingCode && typeof pendingCode === "string" && pendingCode.toUpperCase().startsWith("GROUP-"))
            ? pendingCode.toUpperCase()
            : (referredBy && typeof referredBy === "string" && referredBy.toUpperCase().startsWith("GROUP-"))
              ? referredBy.toUpperCase()
              : null;

          if (groupAdminCode) {
            const gaQuery = await db.collection("group_admins")
              .where("affiliateCodeClient", "==", groupAdminCode)
              .limit(1)
              .get();
            if (!gaQuery.empty) {
              clientGroupAdminReferrerId = gaQuery.docs[0].id;
            }
          }
        }
      }
    }

    for (const recruitmentDoc of recruitmentQuery.docs) {
      const recruitment = recruitmentDoc.data() as GroupAdminRecruitedProvider;

      // Anti-double payment: skip if same GroupAdmin referred client AND recruited provider
      if (clientGroupAdminReferrerId && clientGroupAdminReferrerId === recruitment.groupAdminId) {
        logger.info("[awardGroupAdminProviderRecruitmentCommission] Skipping — same GroupAdmin referred client and recruited provider (anti-double)", {
          groupAdminId: recruitment.groupAdminId,
          callId,
        });
        continue;
      }

      // Check for duplicate commission on this call (idempotency)
      const existingCommission = await db
        .collection("group_admin_commissions")
        .where("groupAdminId", "==", recruitment.groupAdminId)
        .where("sourceId", "==", callId)
        .where("type", "==", "provider_recruitment")
        .limit(1)
        .get();

      if (!existingCommission.empty) continue;

      // Award commission (split by provider type: lawyer=$5, expat=$3)
      const commission = await createClientReferralCommission(
        recruitment.groupAdminId,
        providerId,
        callId,
        `Provider recruitment commission for ${recruitment.providerName}`,
        recruitment.providerType
      );

      if (commission) {
        await recruitmentDoc.ref.update({
          callsWithCommission: FieldValue.increment(1),
          totalCommissions: FieldValue.increment(commission.amount),
          lastCommissionAt: now,
          updatedAt: now,
        });

        logger.info("[awardGroupAdminProviderRecruitmentCommission] Commission awarded", {
          groupAdminId: recruitment.groupAdminId,
          providerId,
          callId,
          amount: commission.amount,
        });
      }
    }

    return { awarded: true };
  } catch (error) {
    logger.error("[awardGroupAdminProviderRecruitmentCommission] Error", { providerId, callId, error });
    return { awarded: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
