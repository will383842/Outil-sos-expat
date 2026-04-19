/**
 * onClaimsFailureAlert trigger
 *
 * Alerts admins via Telegram when setCustomUserClaims fails after all retries
 * in syncRoleClaims. A user with no role claim cannot access role-gated routes
 * (Firestore Rules check request.auth.token.role), so this is a critical
 * operational signal.
 *
 * Fires on: auth_claims_logs/{id} created with action=create_failed|update_failed.
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { forwardEventToEngine } from "../telegram/forwardToEngine";

interface AuthClaimsLog {
  userId?: string;
  action?: string;
  role?: string;
  newRole?: string;
  oldRole?: string;
  error?: string;
  attempts?: number;
  trigger?: string;
}

export const onClaimsFailureAlert = onDocumentCreated(
  {
    document: "auth_claims_logs/{logId}",
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
  },
  async (event) => {
    const data = event.data?.data() as AuthClaimsLog | undefined;
    if (!data) return;

    // Only alert on terminal failures (not successes, not transient attempts)
    if (data.action !== "create_failed" && data.action !== "update_failed") return;

    const { userId, action, role, newRole, oldRole, error, attempts } = data;

    logger.warn("[onClaimsFailureAlert] Firing Telegram alert for claims failure", {
      userId,
      action,
      role: role ?? newRole,
      attempts,
    });

    // Fire-and-forget; forwardEventToEngine never throws
    await forwardEventToEngine("security.alert", userId, {
      type: "auth_claims_failure",
      severity: "high",
      message: `Custom claims sync FAILED for user ${userId}. User cannot access role-gated routes until fixed manually.`,
      details: {
        action,
        role: role ?? newRole,
        oldRole: oldRole ?? null,
        attempts: attempts ?? null,
        error: error ?? null,
      },
    });
  }
);
