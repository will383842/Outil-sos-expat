/**
 * Country Rotation Callables
 *
 * Functions for managing country assignments and rotation.
 */

import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import {
  initializeCountryRotation,
  getAvailableCountries,
  assignCountriesToChatter,
  getCountryRotationStatus,
  advanceCycleManually,
  updateCycleThreshold,
} from "../services/countryRotationService";
import { ALLOWED_ORIGINS } from "../../lib/functionConfigs";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

/**
 * Assert that the request is from an authenticated user
 */
function assertAuthenticated(request: CallableRequest): string {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }
  return request.auth.uid;
}

/**
 * Assert that the request is from an admin
 */
async function assertAdmin(request: CallableRequest): Promise<string> {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const db = getFirestore();
  const uid = request.auth.uid;

  const role = request.auth.token?.role as string | undefined;
  if (role === "admin" || role === "dev") {
    return uid;
  }

  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists || !["admin", "dev"].includes(userDoc.data()?.role)) {
    throw new HttpsError("permission-denied", "Admin access required");
  }

  return uid;
}

// ============================================================================
// USER CALLABLES
// ============================================================================

/**
 * Get available countries for selection
 */
export const getAvailableCountriesForChatter = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request) => {
    ensureInitialized();
    assertAuthenticated(request);

    try {
      const result = await getAvailableCountries();

      if (!result.success) {
        throw new HttpsError("internal", result.error || "Failed to get countries");
      }

      return {
        success: true,
        countries: result.countries,
        currentCycle: result.currentCycle,
        totalCountries: result.totalCountries,
        assignedCount: result.assignedCount,
        percentAssigned: result.percentAssigned,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[getAvailableCountriesForChatter] Error", { error });
      throw new HttpsError("internal", "Failed to get available countries");
    }
  }
);

/**
 * Assign countries to the current user during registration
 */
export const assignCountriesToCurrentChatter = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request) => {
    ensureInitialized();
    const uid = assertAuthenticated(request);

    const { countryCodes } = request.data as { countryCodes: string[] };

    if (!countryCodes || !Array.isArray(countryCodes)) {
      throw new HttpsError("invalid-argument", "countryCodes array is required");
    }

    if (countryCodes.length === 0 || countryCodes.length > 5) {
      throw new HttpsError("invalid-argument", "Select between 1 and 5 countries");
    }

    try {
      const result = await assignCountriesToChatter(uid, countryCodes);

      if (!result.success && result.assignedCountries.length === 0) {
        throw new HttpsError(
          "failed-precondition",
          result.error || "Could not assign any countries"
        );
      }

      return {
        success: true,
        assignedCountries: result.assignedCountries,
        unavailableCountries: result.unavailableCountries,
        cycleAdvanced: result.cycleAdvanced,
        message:
          result.unavailableCountries.length > 0
            ? `Assigned ${result.assignedCountries.length} countries. ${result.unavailableCountries.length} were unavailable.`
            : `Successfully assigned ${result.assignedCountries.length} countries`,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[assignCountriesToCurrentChatter] Error", { uid, error });
      throw new HttpsError("internal", "Failed to assign countries");
    }
  }
);

// ============================================================================
// ADMIN CALLABLES
// ============================================================================

/**
 * Initialize the country rotation system (admin only)
 */
export const adminInitializeCountryRotation = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
    cors: ALLOWED_ORIGINS,
  },
  async (request) => {
    ensureInitialized();
    await assertAdmin(request);

    try {
      const result = await initializeCountryRotation();
      return result;
    } catch (error) {
      logger.error("[adminInitializeCountryRotation] Error", { error });
      throw new HttpsError("internal", "Failed to initialize country rotation");
    }
  }
);

/**
 * Get country rotation status (admin only)
 */
export const adminGetCountryRotationStatus = onCall(
  {
    region: "europe-west2",
    memory: "512MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request) => {
    ensureInitialized();
    await assertAdmin(request);

    try {
      const result = await getCountryRotationStatus();

      if (!result.success) {
        throw new HttpsError("internal", result.error || "Failed to get status");
      }

      return {
        success: true,
        state: result.state,
        countries: result.countryDetails,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[adminGetCountryRotationStatus] Error", { error });
      throw new HttpsError("internal", "Failed to get rotation status");
    }
  }
);

/**
 * Manually advance to next cycle (admin only)
 */
export const adminAdvanceCycle = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request) => {
    ensureInitialized();
    const adminId = await assertAdmin(request);

    try {
      const result = await advanceCycleManually(adminId);

      if (!result.success) {
        throw new HttpsError("internal", result.error || "Failed to advance cycle");
      }

      return {
        success: true,
        newCycle: result.newCycle,
        message: `Advanced to cycle ${result.newCycle}`,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[adminAdvanceCycle] Error", { error });
      throw new HttpsError("internal", "Failed to advance cycle");
    }
  }
);

/**
 * Update cycle threshold percentage (admin only)
 */
export const adminUpdateCycleThreshold = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request) => {
    ensureInitialized();
    const adminId = await assertAdmin(request);

    const { threshold } = request.data as { threshold: number };

    if (typeof threshold !== "number" || threshold < 50 || threshold > 100) {
      throw new HttpsError(
        "invalid-argument",
        "Threshold must be a number between 50 and 100"
      );
    }

    try {
      const result = await updateCycleThreshold(threshold, adminId);

      if (!result.success) {
        throw new HttpsError("internal", result.error || "Failed to update threshold");
      }

      return {
        success: true,
        message: `Threshold updated to ${threshold}%`,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[adminUpdateCycleThreshold] Error", { error });
      throw new HttpsError("internal", "Failed to update threshold");
    }
  }
);
