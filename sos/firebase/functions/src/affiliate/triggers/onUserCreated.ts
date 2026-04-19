/**
 * Affiliate Trigger: onUserCreated
 *
 * Triggered when a new user document is created.
 * Handles:
 * - Generate unique affiliate code
 * - Resolve referrer from pending referral code
 * - Capture commission rates (frozen for life)
 * - Initialize affiliate balances
 * - Create signup commission for referrer
 * - Fraud detection
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import {
  generateAffiliateCode,
  resolveAffiliateCode,
  normalizeAffiliateCode,
} from "../utils/codeGenerator";
import {
  getAffiliateConfigCached,
  isAffiliateSystemActive,
  areNewAffiliatesEnabled,
  getAntiFraudSettings,
} from "../utils/configService";
import { checkReferralFraud } from "../utils/fraudDetection";
import { createCommission } from "../services/commissionService";
import { createHash } from "crypto";
import { CapturedRates, UserAffiliateFields } from "../types";
import { notifyBacklinkEngineUserRegistered } from "../../Webhooks/notifyBacklinkEngine";
import { snapshotLockedRates } from "../../lib/planResolver";

/** Hash IP for server-side fallback attribution matching */
function hashIP(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").substring(0, 16);
}

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

/**
 * Trigger: onUserCreated
 *
 * Sets up affiliate data for new users
 */
export async function handleAffiliateUserCreated(event: any) {
    ensureInitialized();

    const snapshot = event.data;
    if (!snapshot) {
      logger.warn("[affiliateOnUserCreated] No data in event");
      return;
    }

    const userId = event.params.userId;
    const userData = snapshot.data();

    logger.info("[affiliateOnUserCreated] Processing new user", {
      userId,
      email: userData.email,
      pendingReferralCode: userData.pendingReferralCode || null,
    });

    const db = getFirestore();

    try {
      // 1. Check if affiliate system is active
      const systemActive = await isAffiliateSystemActive();
      if (!systemActive) {
        logger.info("[affiliateOnUserCreated] Affiliate system is inactive");
        return;
      }

      // 2. Check if new affiliates are enabled
      const newAffiliatesEnabled = await areNewAffiliatesEnabled();
      if (!newAffiliatesEnabled) {
        logger.info("[affiliateOnUserCreated] New affiliates are disabled");
        return;
      }

      // 3. Get affiliate config for rates
      const config = await getAffiliateConfigCached();

      // 4. Generate unique affiliate code
      const affiliateCode = await generateAffiliateCode(
        userData.email,
        userData.firstName,
        userData.lastName
      );

      logger.info("[affiliateOnUserCreated] Generated affiliate code", {
        userId,
        affiliateCode,
      });

      // 5. Capture current rates (frozen for life)
      // 5a. Legacy capturedRates from affiliate_config (backward compat)
      const capturedRates: CapturedRates = {
        capturedAt: Timestamp.now(),
        configVersion: config.version.toString(),
        signupBonus: config.defaultRates.signupBonus,
        callCommissionRate: config.defaultRates.callCommissionRate,
        callFixedBonus: config.defaultRates.callFixedBonus,
        subscriptionRate: config.defaultRates.subscriptionRate,
        subscriptionFixedBonus: config.defaultRates.subscriptionFixedBonus,
        providerValidationBonus: config.defaultRates.providerValidationBonus,
      };

      // 5b. Commission Plans lockedRates (Lifetime Rate Lock)
      const planSnapshot = await snapshotLockedRates("affiliate");

      // 6. Resolve referrer if pending referral code
      let referredBy: string | null = null;
      let referredByUserId: string | null = null;
      let referrerEmail: string | null = null;
      let createSignupCommission = false;

      const pendingReferralCode = userData.pendingReferralCode;
      if (pendingReferralCode) {
        // Enforce attribution window from config (dynamic, admin-configurable)
        const attributionWindowDays = config.attribution?.windowDays ?? 30;
        const referralCapturedAt = userData.referralCapturedAt;
        let referralExpired = false;
        if (!referralCapturedAt) {
          // No timestamp = can't verify window, treat as expired to prevent stale attribution
          logger.warn("[affiliateOnUserCreated] Referral code missing capturedAt timestamp, treating as expired", {
            userId,
            code: pendingReferralCode,
          });
          referralExpired = true;
        } else {
          const capturedDate = new Date(referralCapturedAt);
          const windowMs = attributionWindowDays * 24 * 60 * 60 * 1000;
          if (Date.now() - capturedDate.getTime() > windowMs) {
            logger.warn(`[affiliateOnUserCreated] Referral code expired (>${attributionWindowDays} days)`, {
              userId,
              code: pendingReferralCode,
              capturedAt: referralCapturedAt,
              windowDays: attributionWindowDays,
              expiredAgo: `${Math.round((Date.now() - capturedDate.getTime()) / (24 * 60 * 60 * 1000))} days`,
            });
            referralExpired = true;
          }
        }

        if (!referralExpired) {
        const normalizedCode = normalizeAffiliateCode(pendingReferralCode);
        const referrer = await resolveAffiliateCode(normalizedCode);

        if (referrer) {
          // SECURITY: Block self-referral — user cannot refer themselves
          if (referrer.userId === userId) {
            logger.warn("[affiliateOnUserCreated] Self-referral blocked", {
              userId,
              referrerUserId: referrer.userId,
              code: pendingReferralCode,
            });
            // Don't attribute, continue with user creation
          } else {
          // 6a. Fraud detection
          const antiFraudSettings = await getAntiFraudSettings();
          const fraudCheck = await checkReferralFraud(
            referrer.userId,
            userData.email,
            userData.signupIP || null,
            userData.deviceFingerprint || null,
            antiFraudSettings
          );

          if (!fraudCheck.allowed) {
            logger.warn("[affiliateOnUserCreated] Referral blocked by fraud detection", {
              userId,
              referrerId: referrer.userId,
              reason: fraudCheck.blockReason,
              riskScore: fraudCheck.riskScore,
            });
            // Still process user, but don't attribute referral
          } else {
            referredBy = normalizedCode;
            referredByUserId = referrer.userId;
            referrerEmail = referrer.email;
            createSignupCommission = true;

            // Store actor type for later use
            (userData as any)._referrerActorType = referrer.actorType;

            // Log fraud warnings if any
            if (fraudCheck.shouldAlert) {
              logger.warn("[affiliateOnUserCreated] Fraud alert triggered", {
                userId,
                referrerId: referrer.userId,
                riskScore: fraudCheck.riskScore,
                issues: fraudCheck.issues,
              });
            }
          }
          } // end else (not self-referral)
        } else {
          logger.info("[affiliateOnUserCreated] Invalid referral code", {
            code: normalizedCode,
          });
        }
        } // end if (!referralExpired)
      }

      // 6b. SERVER-SIDE FALLBACK ATTRIBUTION (post-cookie 2026)
      // When localStorage was empty (private browsing, device switch, data cleared),
      // try to match the user's IP against recent unconverted affiliate clicks.
      if (!referredBy && !pendingReferralCode && userData.signupIP) {
        const ipHashValue = hashIP(userData.signupIP);
        const windowMs = (config.attribution?.windowDays ?? 30) * 24 * 60 * 60 * 1000;
        const windowStart = Timestamp.fromMillis(Date.now() - windowMs);

        const clickCollections = [
          "chatter_affiliate_clicks",
          "influencer_affiliate_clicks",
          "blogger_affiliate_clicks",
          "group_admin_affiliate_clicks",
          "partner_affiliate_clicks",
        ];

        for (const collection of clickCollections) {
          try {
            const clickSnap = await db.collection(collection)
              .where("ipHash", "==", ipHashValue)
              .where("converted", "==", false)
              .where("clickedAt", ">=", windowStart)
              .orderBy("clickedAt", "desc")
              .limit(1)
              .get();

            if (!clickSnap.empty) {
              const clickData = clickSnap.docs[0].data();
              const code = clickData.affiliateCode || clickData.chatterCode || clickData.influencerCode || clickData.bloggerCode || clickData.partnerCode;
              if (code) {
                const resolved = await resolveAffiliateCode(normalizeAffiliateCode(code));
                if (resolved && resolved.userId !== userId) {
                  referredBy = code;
                  referredByUserId = resolved.userId;
                  referrerEmail = resolved.email;
                  createSignupCommission = true;
                  (userData as any)._referrerActorType = resolved.actorType;

                  // Mark click as converted
                  await clickSnap.docs[0].ref.update({
                    converted: true,
                    convertedAt: Timestamp.now(),
                    conversionId: userId,
                    conversionType: "server_fallback",
                  });

                  logger.info("[affiliateOnUserCreated] Server-side fallback attribution matched", {
                    userId,
                    collection,
                    clickId: clickSnap.docs[0].id,
                    affiliateCode: code,
                    affiliateId: resolved.userId,
                  });
                  break; // First match wins
                }
              }
            }
          } catch (err) {
            // Index may not exist yet for this collection — skip gracefully
            logger.warn("[affiliateOnUserCreated] Fallback query failed for collection", {
              collection,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }
      }

      // 7. Prepare affiliate fields
      const affiliateFields: Partial<UserAffiliateFields> = {
        affiliateCode,
        referredBy,
        referredByUserId,
        referredAt: referredBy ? Timestamp.now() : null,
        capturedRates,
        // Commission Plans — Lifetime Rate Lock
        ...(planSnapshot ? {
          commissionPlanId: planSnapshot.commissionPlanId,
          commissionPlanName: planSnapshot.commissionPlanName,
          rateLockDate: planSnapshot.rateLockDate,
          lockedRates: planSnapshot.lockedRates,
        } : {}),
        totalEarned: 0,
        availableBalance: 0,
        pendingBalance: 0,
        affiliateStats: {
          totalReferrals: 0,
          activeReferrals: 0,
          totalCommissions: 0,
          byType: {
            signup: { count: 0, amount: 0 },
            firstCall: { count: 0, amount: 0 },
            recurringCall: { count: 0, amount: 0 },
            subscription: { count: 0, amount: 0 },
            renewal: { count: 0, amount: 0 },
            providerBonus: { count: 0, amount: 0 },
          },
        },
        bankDetails: null,
        pendingPayoutId: null,
        affiliateStatus: "active",
      };

      // 8. Add referral tracking if available
      if (referredBy && userData.referralTracking) {
        (affiliateFields as UserAffiliateFields).referralTracking = {
          utmSource: userData.referralTracking.utmSource,
          utmMedium: userData.referralTracking.utmMedium,
          utmCampaign: userData.referralTracking.utmCampaign,
          landingPage: userData.referralTracking.landingPage,
          userAgent: userData.referralTracking.userAgent,
          ip: userData.signupIP,
        };
      }

      // 8b. ✅ FIX: Create actor-specific fields for Blogger/Influencer/Chatter/GroupAdmin
      // This ensures their specific triggers can find the referral
      const actorType = (userData as any)._referrerActorType;
      if (actorType === "blogger") {
        (affiliateFields as any).bloggerReferredBy = referredBy;
        (affiliateFields as any).referredByBlogger = referredBy;
        logger.info("[affiliateOnUserCreated] Set blogger-specific referral fields", {
          userId,
          bloggerCode: referredBy,
        });
      } else if (actorType === "influencer") {
        (affiliateFields as any).influencerReferredBy = referredBy;
        (affiliateFields as any).referredByInfluencer = referredBy;
        (affiliateFields as any).influencerCode = referredBy;
        logger.info("[affiliateOnUserCreated] Set influencer-specific referral fields", {
          userId,
          influencerCode: referredBy,
        });
      } else if (actorType === "chatter") {
        (affiliateFields as any).chatterReferredBy = referredBy;
        (affiliateFields as any).referredByChatter = referredBy;
        logger.info("[affiliateOnUserCreated] Set chatter-specific referral fields", {
          userId,
          chatterCode: referredBy,
        });
      } else if (actorType === "groupAdmin") {
        (affiliateFields as any).groupAdminReferredBy = referredBy;
        (affiliateFields as any).referredByGroupAdmin = referredBy;
        logger.info("[affiliateOnUserCreated] Set groupAdmin-specific referral fields", {
          userId,
          groupAdminCode: referredBy,
        });
      } else if (actorType === "partner") {
        (affiliateFields as any).partnerReferredBy = referredBy;
        (affiliateFields as any).partnerReferredById = referredByUserId;
        logger.info("[affiliateOnUserCreated] Set partner-specific referral fields", {
          userId,
          partnerCode: referredBy,
        });
      }

      // 9. Update user document with affiliate fields + clean pending referral fields
      // (referredByUserId / referredByChatter / referredByGroupAdmin / etc. now authoritative)
      const cleanupFields: Record<string, unknown> = {};
      if (referredByUserId) {
        cleanupFields.pendingReferralCode = FieldValue.delete();
        cleanupFields.referralCapturedAt = FieldValue.delete();
      }
      await db.collection("users").doc(userId).update({
        ...affiliateFields,
        ...cleanupFields,
        updatedAt: Timestamp.now(),
      });

      logger.info("[affiliateOnUserCreated] Updated user with affiliate fields", {
        userId,
        affiliateCode,
        referredBy,
      });

      // 10. Update referrer stats if applicable
      if (referredByUserId) {
        const referrerDoc = await db.collection("users").doc(referredByUserId).get();
        const referrerData = referrerDoc.exists ? referrerDoc.data() : null;

        await db.collection("users").doc(referredByUserId).update({
          "affiliateStats.totalReferrals": FieldValue.increment(1),
          updatedAt: Timestamp.now(),
        });

        // Calculate parrainNiveau2Id for N2 MLM (grandparent referrer)
        if (referrerData?.referredByUserId) {
          await db.collection("users").doc(userId).update({
            parrainNiveau2Id: referrerData.referredByUserId,
          });
          logger.info("[affiliateOnUserCreated] Set parrainNiveau2Id", {
            userId,
            parrainNiveau2Id: referrerData.referredByUserId,
          });
        }

        logger.info("[affiliateOnUserCreated] Updated referrer stats", {
          referrerId: referredByUserId,
        });
      }

      // 11. Create signup commission if applicable
      if (createSignupCommission && referredByUserId) {
        const signupRule = config.commissionRules.referral_signup;

        if (signupRule.enabled) {
          const commissionResult = await createCommission({
            type: "referral_signup",
            referrerId: referredByUserId,
            refereeId: userId,
            source: {
              id: userId,
              type: "user",
              details: {
                email: userData.email,
                role: userData.role,
              },
            },
            amounts: {},
            context: {
              isEmailVerified: userData.emailVerified || false,
            },
            description: `Inscription de ${userData.email}`,
          });

          if (commissionResult.success) {
            logger.info("[affiliateOnUserCreated] Signup commission created", {
              commissionId: commissionResult.commissionId,
              amount: commissionResult.amount,
              referrerId: referredByUserId,
              refereeId: userId,
            });
          } else {
            logger.info("[affiliateOnUserCreated] Signup commission not created", {
              reason: commissionResult.reason || commissionResult.error,
            });
          }
        }
      }

      // 12. Create referral tracking document
      if (referredByUserId) {
        await db.collection("referrals").add({
          referrerId: referredByUserId,
          referrerEmail,
          referrerCode: referredBy,
          refereeId: userId,
          refereeEmail: userData.email,
          refereeRole: userData.role || "client",
          status: "active",
          createdAt: Timestamp.now(),
          tracking: affiliateFields.referralTracking || null,
          firstActionAt: null,
          totalCommissions: 0,
        });

        logger.info("[affiliateOnUserCreated] Referral tracking created", {
          referrerId: referredByUserId,
          refereeId: userId,
        });
      }

      logger.info("[affiliateOnUserCreated] Completed successfully", {
        userId,
        affiliateCode,
        referredBy,
        createSignupCommission,
      });

      // ==========================================
      // NOTIFY BACKLINK ENGINE (stop prospecting)
      // ==========================================
      // Only notify for roles not already handled by their dedicated registration functions
      // (chatter, blogger, influencer, group_admin, lawyer are handled in their own functions)
      const userRole = userData.role || "client";
      const rolesToNotify = ["client", "expat"];

      if (rolesToNotify.includes(userRole) && userData.email) {
        try {
          await notifyBacklinkEngineUserRegistered({
            email: userData.email.toLowerCase(),
            userId,
            userType: userRole === "expat" ? "provider" : userRole,
            firstName: userData.firstName || userData.fullName?.split(" ")[0],
            lastName: userData.lastName || userData.fullName?.split(" ").slice(1).join(" "),
            phone: userData.phone,
            metadata: {
              role: userRole,
              source: "affiliateOnUserCreated",
              affiliateCode,
            },
          });
          logger.info("[affiliateOnUserCreated] Notified Backlink Engine", {
            userId,
            userRole,
            email: userData.email,
          });
        } catch (notifyError) {
          // Don't fail the trigger if webhook fails
          logger.warn("[affiliateOnUserCreated] Failed to notify Backlink Engine", {
            userId,
            error: notifyError,
          });
        }
      }
    } catch (error) {
      logger.error("[affiliateOnUserCreated] Error processing user", {
        userId,
        error,
      });
      throw error;
    }
}

export const affiliateOnUserCreated = onDocumentCreated(
  {
    document: "users/{userId}",
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
  },
  handleAffiliateUserCreated
);
