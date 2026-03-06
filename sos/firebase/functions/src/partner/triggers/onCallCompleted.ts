/**
 * Trigger: On Call Completed (for partner commissions)
 *
 * This handler fires when a call session transitions to isPaid === true
 * and checks if the client was referred by a partner affiliate link.
 *
 * IMPORTANT: Commission is only created when isPaid === true,
 * which is set by Stripe/PayPal webhooks when payment is captured
 * (money received on SOS Expat's account).
 *
 * NOTE: This is called from the consolidated onCallCompleted trigger,
 * not as a standalone Firestore trigger.
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import type { Partner } from "../types";
import {
  createPartnerCommission,
  calculateCommissionAmount,
  isDuplicateCommission,
} from "../services/partnerCommissionService";
import { getPartnerConfig } from "../services/partnerConfigService";

/**
 * Extracted handler for use by consolidated trigger.
 * Contains the full partner onCallCompleted logic.
 */
export async function handleCallCompleted(
  event: Parameters<Parameters<typeof onDocumentUpdated>[1]>[0]
): Promise<void> {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  const sessionId = event.params.sessionId;

  if (!before || !after) return;

  // Check if call just became paid (isPaid set by Stripe/PayPal webhook on capture)
  const wasNotPaid = before.status !== "completed" || !before.isPaid;
  const isNowPaid = after.status === "completed" && after.isPaid === true;

  if (!wasNotPaid || !isNowPaid) return;

  const clientId = after.clientId || after.userId;
  const clientEmail = after.clientEmail || after.userEmail || "";
  const duration = after.duration || after.callDuration || 0;
  const connectionFee = after.connectionFee || after.amount || 0;
  const providerId = after.providerId || after.expertId || after.lawyerId || null;
  const providerType: "lawyer" | "expat" =
    after.providerType ?? after.metadata?.providerType ?? "lawyer";

  if (!clientId) {
    logger.warn("[partnerOnCallCompleted] No clientId found", { sessionId });
    return;
  }

  try {
    // 1. Check if partner system is active
    const config = await getPartnerConfig();
    if (!config.isSystemActive) {
      return;
    }

    // 2. Check if client was referred by a partner
    const db = getFirestore();
    const userDoc = await db.collection("users").doc(clientId).get();

    if (!userDoc.exists) {
      return;
    }

    const userData = userDoc.data();
    let partnerId: string | null = null;

    // Check direct partner attribution on user doc
    const partnerCode = userData?.partnerReferredBy;
    const partnerReferredById = userData?.partnerReferredById;

    if (partnerReferredById) {
      // Direct partner ID reference
      partnerId = partnerReferredById;
    } else if (partnerCode) {
      // Look up partner by affiliate code
      const partnerQuery = await db
        .collection("partners")
        .where("affiliateCode", "==", partnerCode)
        .limit(1)
        .get();

      if (!partnerQuery.empty) {
        partnerId = partnerQuery.docs[0].id;
      }
    }

    // 3. Fallback: check partner_affiliate_clicks for converted click with this user
    if (!partnerId) {
      const clickQuery = await db
        .collection("partner_affiliate_clicks")
        .where("convertedUserId", "==", clientId)
        .where("converted", "==", true)
        .limit(1)
        .get();

      if (clickQuery.empty) {
        return; // Not a partner referral
      }

      partnerId = clickQuery.docs[0].data().partnerId;
    }

    if (!partnerId) {
      return;
    }

    // 4. Read partner document and validate
    const partnerDoc = await db.collection("partners").doc(partnerId).get();
    if (!partnerDoc.exists) {
      logger.warn("[partnerOnCallCompleted] Partner not found", { partnerId, sessionId });
      return;
    }

    const partner = partnerDoc.data() as Partner;

    if (partner.status !== "active") {
      logger.warn("[partnerOnCallCompleted] Partner not active", {
        partnerId,
        status: partner.status,
        sessionId,
      });
      return;
    }

    // 5. Check minimum call duration (anti-fraud)
    const minDuration = partner.commissionConfig?.minimumCallDuration
      ?? config.defaultMinimumCallDuration
      ?? 60;

    if (!duration || duration < minDuration) {
      logger.warn("[partnerOnCallCompleted] Call too short for commission", {
        sessionId,
        partnerId,
        duration,
        minimumRequired: minDuration,
      });
      return;
    }

    // 6. Check for duplicate commission (same sourceId + partnerId + type)
    const isDuplicate = await isDuplicateCommission(partnerId, sessionId, "client_referral");
    if (isDuplicate) {
      logger.warn("[partnerOnCallCompleted] Duplicate commission skipped", {
        sessionId,
        partnerId,
      });
      return;
    }

    // 7. Calculate commission amount
    const amount = calculateCommissionAmount(partner, providerType, connectionFee);

    // 8. Create commission (atomic with balance update)
    const commissionId = await createPartnerCommission({
      partnerId,
      partnerCode: partner.affiliateCode,
      partnerEmail: partner.email,
      type: "client_referral",
      sourceId: sessionId,
      sourceType: "call_session",
      sourceDetails: {
        clientId,
        clientEmail,
        callSessionId: sessionId,
        callDuration: duration,
        connectionFee,
        providerId: providerId ?? undefined,
        providerType,
      },
      amount,
      description: `Commission client refere - Appel #${sessionId.slice(-6)}`,
    });

    logger.info("[partnerOnCallCompleted] Commission awarded", {
      sessionId,
      partnerId,
      commissionId,
      amount,
      providerType,
    });

    // 9. Create notification (9 languages)
    const amountStr = (amount / 100).toFixed(2);
    await db.collection("partner_notifications").add({
      partnerId,
      type: "commission_earned",
      title: "Nouvelle commission !",
      titleTranslations: {
        fr: "Nouvelle commission !",
        en: "New commission!",
        es: "Nueva comision!",
        de: "Neue Provision!",
        pt: "Nova comissao!",
        ru: "Новая комиссия!",
        hi: "नया कमीशन!",
        zh: "新佣金！",
        ar: "عمولة جديدة!",
      },
      message: `Vous avez gagne $${amountStr} pour un client refere.`,
      messageTranslations: {
        fr: `Vous avez gagne $${amountStr} pour un client refere.`,
        en: `You earned $${amountStr} for a referred client.`,
        es: `Has ganado $${amountStr} por un cliente referido.`,
        de: `Sie haben $${amountStr} fur einen geworbenen Kunden verdient.`,
        pt: `Voce ganhou $${amountStr} por um cliente indicado.`,
        ru: `Вы заработали $${amountStr} за привлеченного клиента.`,
        hi: `आपने रेफ़र किए गए क्लाइंट के लिए $${amountStr} कमाए।`,
        zh: `您因推荐客户赚取了 $${amountStr}。`,
        ar: `لقد ربحت $${amountStr} مقابل عميل محال.`,
      },
      isRead: false,
      data: {
        commissionId,
        amount,
        callSessionId: sessionId,
      },
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    logger.error("[partnerOnCallCompleted] Error processing partner commission", {
      sessionId,
      clientId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
