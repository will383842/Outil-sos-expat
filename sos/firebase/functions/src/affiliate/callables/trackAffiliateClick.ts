/**
 * Callable: trackAffiliateClick
 *
 * PUBLIC callable (no auth required) for tracking affiliate link clicks
 * across ALL roles (chatter, influencer, blogger, groupAdmin).
 *
 * This is the server-side counterpart to the client-side localStorage tracking.
 * It ensures attribution survives when localStorage is cleared, the user
 * switches devices, or uses private browsing.
 *
 * Modeled after partner/callables/trackPartnerClick.ts.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";
import { createHash } from "crypto";

import {
  type TrackAffiliateClickInput,
  type AffiliateClick,
  type AffiliateClickActorType,
  AFFILIATE_CLICK_COLLECTIONS,
} from "../types";
import { resolveAffiliateCode, normalizeAffiliateCode } from "../utils/codeGenerator";
import { affiliateAdminConfig } from "../../lib/functionConfigs";

function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

/** Hash IP address (same logic as registerChatter.ts) */
function hashIP(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").substring(0, 16);
}

/** Truncate a string to max length, returning undefined if empty */
function trunc(val: string | undefined, maxLen: number): string | undefined {
  if (!val) return undefined;
  return val.substring(0, maxLen);
}

const VALID_ACTOR_TYPES: AffiliateClickActorType[] = ['chatter', 'influencer', 'blogger', 'groupAdmin'];
const VALID_CODE_TYPES = ['client', 'recruitment', 'provider'] as const;

export const trackAffiliateClick = onCall(
  {
    ...affiliateAdminConfig,
    timeoutSeconds: 10,
  },
  async (request): Promise<{ success: boolean; clickId: string }> => {
    ensureInitialized();

    const db = getFirestore();
    const input = request.data as TrackAffiliateClickInput;

    // ── Input validation ──
    if (!input?.affiliateCode || typeof input.affiliateCode !== "string") {
      throw new HttpsError("invalid-argument", "affiliateCode is required");
    }
    if (!input.actorType || !VALID_ACTOR_TYPES.includes(input.actorType)) {
      throw new HttpsError("invalid-argument", `actorType must be one of: ${VALID_ACTOR_TYPES.join(", ")}`);
    }
    if (!input.codeType || !VALID_CODE_TYPES.includes(input.codeType)) {
      throw new HttpsError("invalid-argument", `codeType must be one of: ${VALID_CODE_TYPES.join(", ")}`);
    }

    const normalizedCode = normalizeAffiliateCode(input.affiliateCode);

    // ── Get server-side IP ──
    const clientIp =
      request.rawRequest?.headers?.["x-forwarded-for"]?.toString().split(",")[0] ||
      request.rawRequest?.headers?.["x-real-ip"]?.toString() ||
      request.rawRequest?.ip ||
      "unknown";
    const ipHashValue = clientIp !== "unknown" ? hashIP(clientIp) : undefined;

    try {
      // 1. Rate limiting by IP hash (max 30 clicks per minute per IP)
      if (ipHashValue) {
        const rateLimitRef = db.collection("rate_limits").doc(`affiliate_click_${ipHashValue}`);
        const rateLimitDoc = await rateLimitRef.get();

        if (rateLimitDoc.exists) {
          const data = rateLimitDoc.data();
          const lastReset = data?.lastReset?.toDate?.() || new Date(0);
          const now = new Date();
          const elapsed = now.getTime() - lastReset.getTime();

          if (elapsed < 60000) {
            if ((data?.count || 0) >= 30) {
              throw new HttpsError("resource-exhausted", "Rate limit exceeded");
            }
            await rateLimitRef.update({ count: FieldValue.increment(1) });
          } else {
            await rateLimitRef.set({ count: 1, lastReset: Timestamp.now() });
          }
        } else {
          await rateLimitRef.set({ count: 1, lastReset: Timestamp.now() });
        }
      }

      // 2. Resolve affiliate code (searches users.affiliateCode, affiliateCodeClient,
      //    affiliateCodeRecruitment, and role-specific collections)
      const referrer = await resolveAffiliateCode(normalizedCode);
      if (!referrer) {
        throw new HttpsError("not-found", "Affiliate code not found or inactive");
      }

      // 3. Create click document in the appropriate collection
      const collectionName = AFFILIATE_CLICK_COLLECTIONS[input.actorType];
      const now = Timestamp.now();
      const clickRef = db.collection(collectionName).doc();

      const click: AffiliateClick = {
        id: clickRef.id,
        affiliateId: referrer.userId,
        affiliateCode: normalizedCode,
        actorType: input.actorType,
        codeType: input.codeType,
        clickedAt: now,
        converted: false,
        // Browser & server data
        userAgent: trunc(input.userAgent, 500),
        referrerUrl: trunc(input.referrerUrl, 2000),
        landingPage: trunc(input.landingPage, 2000),
        ipHash: ipHashValue,
        sessionId: trunc(input.sessionId, 100),
        // UTM
        utmSource: trunc(input.utmSource, 200),
        utmMedium: trunc(input.utmMedium, 200),
        utmCampaign: trunc(input.utmCampaign, 200),
        utmContent: trunc(input.utmContent, 200),
        utmTerm: trunc(input.utmTerm, 200),
        // Ad platform IDs
        ...(input.fbclid || input.fbp || input.fbc
          ? {
              metaIds: {
                fbclid: trunc(input.fbclid, 200),
                fbp: trunc(input.fbp, 200),
                fbc: trunc(input.fbc, 500),
              },
            }
          : {}),
        ...(input.gclid || input.gadSource
          ? {
              googleIds: {
                gclid: trunc(input.gclid, 200),
                gadSource: trunc(input.gadSource, 100),
              },
            }
          : {}),
        ...(input.ttclid
          ? {
              tiktokIds: {
                ttclid: trunc(input.ttclid, 200),
              },
            }
          : {}),
        // Geo
        userCountry: trunc(input.userCountry, 10),
        userTimezone: trunc(input.userTimezone, 50),
        userLanguage: trunc(input.userLanguage, 10),
        // CAPI dedup
        eventId: trunc(input.eventId, 100),
      };

      await clickRef.set(click);

      // 4. Increment click counter on the affiliate's user doc (non-blocking)
      db.collection("users").doc(referrer.userId).update({
        totalAffiliateClicks: FieldValue.increment(1),
        updatedAt: now,
      }).catch((err) => {
        // Non-critical: counter increment failure shouldn't fail the click
        logger.warn("[trackAffiliateClick] Failed to increment click counter", {
          affiliateId: referrer.userId,
          error: err,
        });
      });

      logger.info("[trackAffiliateClick] Click tracked", {
        clickId: clickRef.id,
        affiliateId: referrer.userId,
        affiliateCode: normalizedCode,
        actorType: input.actorType,
        collection: collectionName,
      });

      return { success: true, clickId: clickRef.id };
    } catch (error) {
      if (error instanceof HttpsError) throw error;

      logger.error("[trackAffiliateClick] Error", {
        affiliateCode: normalizedCode,
        actorType: input.actorType,
        error,
      });
      throw new HttpsError("internal", "Failed to track click");
    }
  }
);
