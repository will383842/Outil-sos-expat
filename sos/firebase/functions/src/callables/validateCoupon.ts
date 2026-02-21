/**
 * validateCoupon — Cloud Function callable
 *
 * Validates a coupon code server-side:
 * - Checks coupon exists and is active
 * - Validates date window (valid_from / valid_until)
 * - Checks applicable services
 * - Checks minimum order amount
 * - Checks usage limits (total + per user)
 * - Returns discount details if valid
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";
import { userConfig } from "../lib/functionConfigs";
import { createSecurityAlert } from "../securityAlerts";

interface ValidateCouponInput {
  code: string;
  serviceType: "lawyer_call" | "expat_call";
  totalAmount: number;
}

interface ValidateCouponResponse {
  isValid: boolean;
  message: string;
  discountAmount: number;
  discountType: "fixed" | "percentage";
  discountValue: number;
  couponId?: string;
  maxDiscount?: number;
}

// m3 FIX: Promo abuse detection — track failed attempts per user
const ABUSE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const ABUSE_THRESHOLD = 5; // 5 failed attempts → alert

async function trackFailedAttempt(userId: string, code: string): Promise<void> {
  try {
    const db = admin.firestore();

    // Record the failed attempt
    await db.collection("coupon_failed_attempts").add({
      userId,
      code,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: new Date(),
    });

    // Count recent failures for this user
    const windowStart = new Date(Date.now() - ABUSE_WINDOW_MS);
    const recentFailures = await db
      .collection("coupon_failed_attempts")
      .where("userId", "==", userId)
      .where("createdAt", ">=", windowStart)
      .count()
      .get();

    const failCount = recentFailures.data().count;

    if (failCount >= ABUSE_THRESHOLD) {
      logger.warn("[validateCoupon] Promo abuse detected", { userId, failCount });
      await createSecurityAlert({
        type: "security.promo_abuse",
        severity: "warning",
        context: {
          timestamp: new Date().toISOString(),
          userId,
          attemptCount: failCount,
          affectedResource: `coupon_validation`,
          promoCode: code,
        },
        source: { userId },
      });
    }
  } catch (e) {
    // Non-blocking — don't fail the validation if tracking fails
    logger.error("[validateCoupon] Failed to track abuse", { error: e });
  }
}

export const validateCouponCallable = onCall(
  { ...userConfig, memory: "256MiB", timeoutSeconds: 15, concurrency: 1 },
  async (request): Promise<ValidateCouponResponse> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const userId = request.auth.uid;
    const input = request.data as ValidateCouponInput;

    if (!input.code || typeof input.code !== "string") {
      return {
        isValid: false,
        message: "Code promo requis",
        discountAmount: 0,
        discountType: "fixed",
        discountValue: 0,
      };
    }

    const code = input.code.toUpperCase().trim();
    if (!code || code.length > 50) {
      return {
        isValid: false,
        message: "Code promo invalide",
        discountAmount: 0,
        discountType: "fixed",
        discountValue: 0,
      };
    }

    const serviceType = input.serviceType;
    if (serviceType !== "lawyer_call" && serviceType !== "expat_call") {
      return {
        isValid: false,
        message: "Type de service invalide",
        discountAmount: 0,
        discountType: "fixed",
        discountValue: 0,
      };
    }

    const totalAmount =
      typeof input.totalAmount === "number" && input.totalAmount > 0
        ? input.totalAmount
        : 0;

    try {
      const db = admin.firestore();
      const snap = await db
        .collection("coupons")
        .where("code", "==", code)
        .limit(1)
        .get();

      if (snap.empty) {
        await trackFailedAttempt(userId, code);
        return {
          isValid: false,
          message: "Code promo introuvable",
          discountAmount: 0,
          discountType: "fixed",
          discountValue: 0,
        };
      }

      const doc = snap.docs[0];
      const cpn = doc.data();

      // Active check
      if (cpn.active === false) {
        await trackFailedAttempt(userId, code);
        return {
          isValid: false,
          message: "Ce code promo n'est plus actif",
          discountAmount: 0,
          discountType: "fixed",
          discountValue: 0,
        };
      }

      // Date window check
      const now = new Date();
      const validFrom = cpn.valid_from?.toDate?.();
      const validUntil = cpn.valid_until?.toDate?.();
      if (validFrom && now < validFrom) {
        return {
          isValid: false,
          message: "Ce code promo n'est pas encore actif",
          discountAmount: 0,
          discountType: "fixed",
          discountValue: 0,
        };
      }
      if (validUntil && now > validUntil) {
        await trackFailedAttempt(userId, code);
        return {
          isValid: false,
          message: "Ce code promo a expiré",
          discountAmount: 0,
          discountType: "fixed",
          discountValue: 0,
        };
      }

      // Service check
      if (
        Array.isArray(cpn.services) &&
        cpn.services.length > 0 &&
        !cpn.services.includes(serviceType)
      ) {
        return {
          isValid: false,
          message: "Ce code promo n'est pas applicable à ce service",
          discountAmount: 0,
          discountType: "fixed",
          discountValue: 0,
        };
      }

      // Minimum order amount check
      if (
        typeof cpn.min_order_amount === "number" &&
        cpn.min_order_amount > 0 &&
        totalAmount < cpn.min_order_amount
      ) {
        return {
          isValid: false,
          message: `Montant minimum requis: ${cpn.min_order_amount}€`,
          discountAmount: 0,
          discountType: "fixed",
          discountValue: 0,
        };
      }

      // Usage limits — total
      if (typeof cpn.max_uses_total === "number" && cpn.max_uses_total > 0) {
        const totalUsages = await db
          .collection("coupon_usages")
          .where("couponId", "==", doc.id)
          .count()
          .get();
        if (totalUsages.data().count >= cpn.max_uses_total) {
          return {
            isValid: false,
            message: "Ce code promo a atteint sa limite d'utilisation",
            discountAmount: 0,
            discountType: "fixed",
            discountValue: 0,
          };
        }
      }

      // Usage limits — per user
      if (
        typeof cpn.max_uses_per_user === "number" &&
        cpn.max_uses_per_user > 0
      ) {
        const userUsages = await db
          .collection("coupon_usages")
          .where("couponId", "==", doc.id)
          .where("userId", "==", userId)
          .count()
          .get();
        if (userUsages.data().count >= cpn.max_uses_per_user) {
          return {
            isValid: false,
            message: "Vous avez déjà utilisé ce code promo",
            discountAmount: 0,
            discountType: "fixed",
            discountValue: 0,
          };
        }
      }

      // Calculate discount
      const couponType: "fixed" | "percentage" =
        cpn.type === "percentage" ? "percentage" : "fixed";
      const amount = typeof cpn.amount === "number" ? cpn.amount : 0;
      const maxDiscount =
        typeof cpn.maxDiscount === "number" ? cpn.maxDiscount : undefined;

      let discount = 0;
      if (couponType === "fixed") {
        discount = Math.min(amount, totalAmount);
      } else {
        discount = Math.round(((totalAmount * amount) / 100) * 100) / 100;
      }
      if (maxDiscount !== undefined) {
        discount = Math.min(discount, maxDiscount);
      }
      discount = Math.min(discount, totalAmount);
      discount = Math.round(discount * 100) / 100;

      logger.info("[validateCoupon] Coupon validated", {
        code,
        userId: userId.substring(0, 10),
        discount,
        couponType,
        couponId: doc.id,
      });

      return {
        isValid: true,
        message: "Code promo valide",
        discountAmount: discount,
        discountType: couponType,
        discountValue: amount,
        couponId: doc.id,
        maxDiscount,
      };
    } catch (error) {
      logger.error("[validateCoupon] Error", { error, code });
      throw new HttpsError(
        "internal",
        "Erreur lors de la validation du code promo"
      );
    }
  }
);
