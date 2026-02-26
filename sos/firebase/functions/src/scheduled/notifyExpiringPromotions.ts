/**
 * m2 FIX: Notify admins when promotions are about to expire
 *
 * Checks daily at 8:00 AM Paris time:
 * 1. Coupons (collection `coupons`) with `valid_until` within 3 days
 * 2. Price overrides (`admin_config/pricing` → `overrides`) with `endsAt` within 3 days
 *
 * Sends notification via `message_events` collection → triggers email to admins.
 * Schedule: Every day at 08:00 Europe/Paris
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { scheduledConfig } from "../lib/functionConfigs";

// ============================================================================
// LAZY INITIALIZATION
// ============================================================================

const IS_DEPLOYMENT_ANALYSIS =
  !process.env.K_REVISION &&
  !process.env.K_SERVICE &&
  !process.env.FUNCTION_TARGET &&
  !process.env.FUNCTIONS_EMULATOR;

let _initialized = false;
function ensureInitialized() {
  if (!_initialized && !IS_DEPLOYMENT_ANALYSIS) {
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    _initialized = true;
  }
}

function getDb() {
  ensureInitialized();
  return admin.firestore();
}

// ============================================================================
// CONSTANTS
// ============================================================================

const EXPIRY_WARNING_DAYS = 3;
const ADMIN_NOTIFICATION_EVENT_ID = "admin_promo_expiration_warning";

// ============================================================================
// MAIN SCHEDULED FUNCTION
// ============================================================================

export const notifyExpiringPromotions = onSchedule(
  {
    ...scheduledConfig,
    schedule: "every day 08:00",
    timeZone: "Europe/Paris",
    timeoutSeconds: 60,
  },
  async () => {
    console.log("🔔 [notifyExpiringPromotions] Checking for expiring promotions...");

    const db = getDb();
    const now = new Date();
    const warningThreshold = new Date(now.getTime() + EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000);

    const expiringItems: string[] = [];

    // -----------------------------------------------------------------------
    // 1. Check coupons with valid_until within 3 days
    // -----------------------------------------------------------------------
    try {
      const couponsSnap = await db
        .collection("coupons")
        .where("active", "==", true)
        .get();

      for (const doc of couponsSnap.docs) {
        const data = doc.data();
        const validUntil = data.valid_until?.toDate?.();
        if (!validUntil) continue;

        // Already expired → skip (not our concern here)
        if (validUntil < now) continue;

        // Expires within warning window
        if (validUntil <= warningThreshold) {
          const daysLeft = Math.ceil((validUntil.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
          const code = data.code || doc.id;
          expiringItems.push(`Coupon "${code}" expire dans ${daysLeft}j (${validUntil.toISOString().split("T")[0]})`);
          console.log(`⚠️ Coupon "${code}" expires in ${daysLeft} days`);
        }
      }
    } catch (e) {
      console.error("❌ [notifyExpiringPromotions] Error checking coupons:", e);
    }

    // -----------------------------------------------------------------------
    // 2. Check price overrides (admin_config/pricing → overrides)
    // -----------------------------------------------------------------------
    try {
      const pricingDoc = await db.collection("admin_config").doc("pricing").get();
      if (pricingDoc.exists) {
        const pricingData = pricingDoc.data();
        const overrides = pricingData?.overrides || {};

        for (const serviceType of ["lawyer", "expat"]) {
          const override = overrides[serviceType];
          if (!override?.enabled) continue;

          const endsAt = override.endsAt?.toDate?.();
          if (!endsAt) continue;
          if (endsAt < now) continue;

          if (endsAt <= warningThreshold) {
            const daysLeft = Math.ceil((endsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
            expiringItems.push(`Prix promotionnel ${serviceType} expire dans ${daysLeft}j (${endsAt.toISOString().split("T")[0]})`);
            console.log(`⚠️ Price override "${serviceType}" expires in ${daysLeft} days`);
          }
        }
      }
    } catch (e) {
      console.error("❌ [notifyExpiringPromotions] Error checking price overrides:", e);
    }

    // -----------------------------------------------------------------------
    // 3. Send notification if any items are expiring
    // -----------------------------------------------------------------------
    if (expiringItems.length === 0) {
      console.log("✅ [notifyExpiringPromotions] No expiring promotions found");
      return;
    }

    console.log(`🔔 [notifyExpiringPromotions] ${expiringItems.length} expiring items found, notifying admins`);

    // Find admin users to notify
    try {
      const adminsSnap = await db
        .collection("users")
        .where("role", "in", ["admin"])
        .get();

      if (adminsSnap.empty) {
        console.warn("⚠️ [notifyExpiringPromotions] No admin users found");
        return;
      }

      const summary = expiringItems.join("\n• ");

      for (const adminDoc of adminsSnap.docs) {
        const adminData = adminDoc.data();
        const email = adminData.email;
        if (!email) continue;

        await db.collection("message_events").add({
          eventId: ADMIN_NOTIFICATION_EVENT_ID,
          locale: adminData.locale || "fr-FR",
          to: {
            email,
            phone: null,
            pushToken: null,
            uid: adminDoc.id,
          },
          context: {
            subject: `⚠️ ${expiringItems.length} promotion(s) expirent bientôt`,
            items: expiringItems,
            summary: `• ${summary}`,
            count: expiringItems.length,
            warningDays: EXPIRY_WARNING_DAYS,
          },
          requestedBy: "system:notifyExpiringPromotions",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`📧 Notification sent to admin ${adminDoc.id} (${email})`);
      }

      console.log(`✅ [notifyExpiringPromotions] Notified ${adminsSnap.size} admins about ${expiringItems.length} expiring promotions`);
    } catch (e) {
      console.error("❌ [notifyExpiringPromotions] Error sending notifications:", e);
    }
  }
);
