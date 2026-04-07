/**
 * Callable: captureSignupIP
 *
 * Lightweight callable that returns the caller's IP address.
 * Used during client/lawyer/expat registration (frontend-only flow)
 * so onUserCreated can use IP-based fallback attribution.
 *
 * No auth required — called right before/during registration.
 */
import { onCall } from "firebase-functions/v2/https";
import { affiliateAdminConfig } from "../../lib/functionConfigs";

export const captureSignupIP = onCall(
  {
    ...affiliateAdminConfig,
    timeoutSeconds: 5,
  },
  async (request): Promise<{ ip: string | null }> => {
    const ip =
      (request.rawRequest?.headers?.["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      (request.rawRequest?.headers?.["x-real-ip"] as string) ||
      request.rawRequest?.ip ||
      null;

    return { ip };
  }
);
