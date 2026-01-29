/**
 * Country Rotation Service
 *
 * Manages the country rotation system for chatters:
 * - Each country can only be assigned once per cycle
 * - When 90% of countries are assigned, a new cycle begins
 * - Countries become available again in the new cycle
 */

import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import {
  ChatterCountryAssignment,
  ChatterCountryRotationState,
  SUPPORTED_COUNTRIES,
} from "../types";

const DEFAULT_CYCLE_THRESHOLD_PERCENT = 90;

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the country rotation system
 * Creates documents for all countries and the global state
 */
export async function initializeCountryRotation(): Promise<{
  success: boolean;
  message: string;
}> {
  const db = getFirestore();

  try {
    // Check if already initialized
    const stateDoc = await db
      .collection("chatter_config")
      .doc("country_rotation")
      .get();

    if (stateDoc.exists) {
      return { success: true, message: "Country rotation already initialized" };
    }

    const batch = db.batch();
    const now = Timestamp.now();

    // Create global state
    const stateRef = db.collection("chatter_config").doc("country_rotation");
    const initialState: ChatterCountryRotationState = {
      id: "country_rotation",
      currentGlobalCycle: 1,
      totalCountries: SUPPORTED_COUNTRIES.length,
      countriesAssignedInCurrentCycle: 0,
      cycleThresholdPercent: DEFAULT_CYCLE_THRESHOLD_PERCENT,
      autoAdvanceCycle: true,
      lastCycleAdvancedAt: null,
      updatedAt: now,
    };
    batch.set(stateRef, initialState);

    // Create assignment document for each country
    for (const country of SUPPORTED_COUNTRIES) {
      const countryRef = db
        .collection("chatter_country_assignments")
        .doc(country.code);
      const assignment: ChatterCountryAssignment = {
        countryCode: country.code,
        countryName: country.name,
        currentCycle: 1,
        assignmentsInCurrentCycle: 0,
        totalAssignments: 0,
        currentCycleChatterIds: [],
        lastAssignedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      batch.set(countryRef, assignment);
    }

    await batch.commit();

    logger.info("[initializeCountryRotation] Initialized", {
      totalCountries: SUPPORTED_COUNTRIES.length,
    });

    return {
      success: true,
      message: `Initialized ${SUPPORTED_COUNTRIES.length} countries`,
    };
  } catch (error) {
    logger.error("[initializeCountryRotation] Error", { error });
    return {
      success: false,
      message: error instanceof Error ? error.message : "Initialization failed",
    };
  }
}

// ============================================================================
// GET AVAILABLE COUNTRIES
// ============================================================================

/**
 * Get list of countries available for selection in the current cycle
 * A country is available if it hasn't been assigned in the current cycle
 */
export async function getAvailableCountries(): Promise<{
  success: boolean;
  countries: Array<{ code: string; name: string; timesAssigned: number }>;
  currentCycle: number;
  totalCountries: number;
  assignedCount: number;
  percentAssigned: number;
  error?: string;
}> {
  const db = getFirestore();

  try {
    // Get global state
    const stateDoc = await db
      .collection("chatter_config")
      .doc("country_rotation")
      .get();

    if (!stateDoc.exists) {
      // Initialize if not exists
      await initializeCountryRotation();
      return getAvailableCountries(); // Retry after initialization
    }

    const state = stateDoc.data() as ChatterCountryRotationState;

    // Get all country assignments
    const assignmentsSnapshot = await db
      .collection("chatter_country_assignments")
      .get();

    const availableCountries: Array<{
      code: string;
      name: string;
      timesAssigned: number;
    }> = [];

    let assignedInCycleCount = 0;

    for (const doc of assignmentsSnapshot.docs) {
      const assignment = doc.data() as ChatterCountryAssignment;

      // Country is available if:
      // 1. Its current cycle is less than the global cycle (hasn't been assigned in this cycle yet)
      // 2. OR its assignmentsInCurrentCycle is 0 for the current cycle
      const isAssignedInCurrentCycle =
        assignment.currentCycle === state.currentGlobalCycle &&
        assignment.assignmentsInCurrentCycle > 0;

      if (isAssignedInCurrentCycle) {
        assignedInCycleCount++;
      } else {
        availableCountries.push({
          code: assignment.countryCode,
          name: assignment.countryName,
          timesAssigned: assignment.totalAssignments,
        });
      }
    }

    // Sort by name for easier selection
    availableCountries.sort((a, b) => a.name.localeCompare(b.name));

    const percentAssigned =
      (assignedInCycleCount / state.totalCountries) * 100;

    return {
      success: true,
      countries: availableCountries,
      currentCycle: state.currentGlobalCycle,
      totalCountries: state.totalCountries,
      assignedCount: assignedInCycleCount,
      percentAssigned: Math.round(percentAssigned * 10) / 10,
    };
  } catch (error) {
    logger.error("[getAvailableCountries] Error", { error });
    return {
      success: false,
      countries: [],
      currentCycle: 1,
      totalCountries: 0,
      assignedCount: 0,
      percentAssigned: 0,
      error: error instanceof Error ? error.message : "Failed to get countries",
    };
  }
}

// ============================================================================
// ASSIGN COUNTRIES TO CHATTER
// ============================================================================

/**
 * Assign selected countries to a chatter
 * Validates availability and updates the rotation system
 */
export async function assignCountriesToChatter(
  chatterId: string,
  countryCodes: string[]
): Promise<{
  success: boolean;
  assignedCountries: string[];
  unavailableCountries: string[];
  cycleAdvanced: boolean;
  error?: string;
}> {
  const db = getFirestore();

  // Validate input
  if (!countryCodes || countryCodes.length === 0) {
    return {
      success: false,
      assignedCountries: [],
      unavailableCountries: [],
      cycleAdvanced: false,
      error: "No countries provided",
    };
  }

  if (countryCodes.length > 5) {
    return {
      success: false,
      assignedCountries: [],
      unavailableCountries: countryCodes,
      cycleAdvanced: false,
      error: "Maximum 5 countries allowed",
    };
  }

  try {
    const result = await db.runTransaction(async (transaction) => {
      // Get global state
      const stateRef = db.collection("chatter_config").doc("country_rotation");
      const stateDoc = await transaction.get(stateRef);

      if (!stateDoc.exists) {
        throw new Error("Country rotation not initialized");
      }

      const state = stateDoc.data() as ChatterCountryRotationState;
      const now = Timestamp.now();

      const assignedCountries: string[] = [];
      const unavailableCountries: string[] = [];

      // Check each country
      for (const code of countryCodes) {
        const countryRef = db
          .collection("chatter_country_assignments")
          .doc(code.toUpperCase());
        const countryDoc = await transaction.get(countryRef);

        if (!countryDoc.exists) {
          unavailableCountries.push(code);
          continue;
        }

        const assignment = countryDoc.data() as ChatterCountryAssignment;

        // Check if available in current cycle
        const isAssignedInCurrentCycle =
          assignment.currentCycle === state.currentGlobalCycle &&
          assignment.assignmentsInCurrentCycle > 0;

        if (isAssignedInCurrentCycle) {
          unavailableCountries.push(code);
          continue;
        }

        // Assign the country
        transaction.update(countryRef, {
          currentCycle: state.currentGlobalCycle,
          assignmentsInCurrentCycle: 1,
          totalAssignments: FieldValue.increment(1),
          currentCycleChatterIds: FieldValue.arrayUnion(chatterId),
          lastAssignedAt: now,
          updatedAt: now,
        });

        assignedCountries.push(code.toUpperCase());
      }

      // Update global state
      const newAssignedCount =
        state.countriesAssignedInCurrentCycle + assignedCountries.length;

      transaction.update(stateRef, {
        countriesAssignedInCurrentCycle: newAssignedCount,
        updatedAt: now,
      });

      // Check if we need to advance the cycle
      const percentAssigned = (newAssignedCount / state.totalCountries) * 100;
      let cycleAdvanced = false;

      if (
        state.autoAdvanceCycle &&
        percentAssigned >= state.cycleThresholdPercent
      ) {
        // Advance to next cycle
        transaction.update(stateRef, {
          currentGlobalCycle: state.currentGlobalCycle + 1,
          countriesAssignedInCurrentCycle: 0,
          lastCycleAdvancedAt: now,
          updatedAt: now,
        });
        cycleAdvanced = true;

        logger.info("[assignCountriesToChatter] Cycle advanced", {
          previousCycle: state.currentGlobalCycle,
          newCycle: state.currentGlobalCycle + 1,
          percentAssigned,
        });
      }

      return {
        assignedCountries,
        unavailableCountries,
        cycleAdvanced,
      };
    });

    logger.info("[assignCountriesToChatter] Countries assigned", {
      chatterId,
      assigned: result.assignedCountries,
      unavailable: result.unavailableCountries,
    });

    return {
      success: result.assignedCountries.length > 0,
      ...result,
    };
  } catch (error) {
    logger.error("[assignCountriesToChatter] Error", { chatterId, error });
    return {
      success: false,
      assignedCountries: [],
      unavailableCountries: countryCodes,
      cycleAdvanced: false,
      error: error instanceof Error ? error.message : "Assignment failed",
    };
  }
}

// ============================================================================
// RELEASE COUNTRIES (when chatter is deleted/banned)
// ============================================================================

/**
 * Release countries assigned to a chatter (optional, for cleanup)
 * Note: In the current design, countries stay assigned even if chatter leaves
 * This is just for admin use if needed
 */
export async function releaseChatterCountries(
  chatterId: string,
  countryCodes: string[]
): Promise<{ success: boolean; releasedCount: number }> {
  const db = getFirestore();

  try {
    const batch = db.batch();
    const now = Timestamp.now();
    let releasedCount = 0;

    for (const code of countryCodes) {
      const countryRef = db
        .collection("chatter_country_assignments")
        .doc(code.toUpperCase());
      const countryDoc = await countryRef.get();

      if (countryDoc.exists) {
        const assignment = countryDoc.data() as ChatterCountryAssignment;

        // Only release if chatter is actually assigned
        if (assignment.currentCycleChatterIds.includes(chatterId)) {
          batch.update(countryRef, {
            currentCycleChatterIds: FieldValue.arrayRemove(chatterId),
            assignmentsInCurrentCycle: Math.max(
              0,
              assignment.assignmentsInCurrentCycle - 1
            ),
            updatedAt: now,
          });
          releasedCount++;
        }
      }
    }

    if (releasedCount > 0) {
      // Update global count
      const stateRef = db.collection("chatter_config").doc("country_rotation");
      batch.update(stateRef, {
        countriesAssignedInCurrentCycle: FieldValue.increment(-releasedCount),
        updatedAt: now,
      });
    }

    await batch.commit();

    logger.info("[releaseChatterCountries] Countries released", {
      chatterId,
      releasedCount,
    });

    return { success: true, releasedCount };
  } catch (error) {
    logger.error("[releaseChatterCountries] Error", { chatterId, error });
    return { success: false, releasedCount: 0 };
  }
}

// ============================================================================
// ADMIN: GET ROTATION STATUS
// ============================================================================

/**
 * Get detailed rotation status for admin dashboard
 */
export async function getCountryRotationStatus(): Promise<{
  success: boolean;
  state: ChatterCountryRotationState | null;
  countryDetails: Array<{
    code: string;
    name: string;
    currentCycle: number;
    assignmentsInCurrentCycle: number;
    totalAssignments: number;
    chatterCount: number;
    isAvailable: boolean;
  }>;
  error?: string;
}> {
  const db = getFirestore();

  try {
    // Get global state
    const stateDoc = await db
      .collection("chatter_config")
      .doc("country_rotation")
      .get();

    if (!stateDoc.exists) {
      return {
        success: false,
        state: null,
        countryDetails: [],
        error: "Country rotation not initialized",
      };
    }

    const state = stateDoc.data() as ChatterCountryRotationState;

    // Get all country assignments
    const assignmentsSnapshot = await db
      .collection("chatter_country_assignments")
      .orderBy("countryName")
      .get();

    const countryDetails = assignmentsSnapshot.docs.map((doc) => {
      const assignment = doc.data() as ChatterCountryAssignment;
      const isAvailable =
        assignment.currentCycle < state.currentGlobalCycle ||
        assignment.assignmentsInCurrentCycle === 0;

      return {
        code: assignment.countryCode,
        name: assignment.countryName,
        currentCycle: assignment.currentCycle,
        assignmentsInCurrentCycle: assignment.assignmentsInCurrentCycle,
        totalAssignments: assignment.totalAssignments,
        chatterCount: assignment.currentCycleChatterIds.length,
        isAvailable,
      };
    });

    return {
      success: true,
      state,
      countryDetails,
    };
  } catch (error) {
    logger.error("[getCountryRotationStatus] Error", { error });
    return {
      success: false,
      state: null,
      countryDetails: [],
      error: error instanceof Error ? error.message : "Failed to get status",
    };
  }
}

// ============================================================================
// ADMIN: MANUALLY ADVANCE CYCLE
// ============================================================================

/**
 * Manually advance to the next cycle (admin action)
 */
export async function advanceCycleManually(
  adminId: string
): Promise<{ success: boolean; newCycle: number; error?: string }> {
  const db = getFirestore();

  try {
    const stateRef = db.collection("chatter_config").doc("country_rotation");
    const stateDoc = await stateRef.get();

    if (!stateDoc.exists) {
      return { success: false, newCycle: 0, error: "Not initialized" };
    }

    const state = stateDoc.data() as ChatterCountryRotationState;
    const newCycle = state.currentGlobalCycle + 1;
    const now = Timestamp.now();

    await stateRef.update({
      currentGlobalCycle: newCycle,
      countriesAssignedInCurrentCycle: 0,
      lastCycleAdvancedAt: now,
      updatedAt: now,
    });

    logger.info("[advanceCycleManually] Cycle advanced", {
      adminId,
      previousCycle: state.currentGlobalCycle,
      newCycle,
    });

    return { success: true, newCycle };
  } catch (error) {
    logger.error("[advanceCycleManually] Error", { adminId, error });
    return {
      success: false,
      newCycle: 0,
      error: error instanceof Error ? error.message : "Failed to advance cycle",
    };
  }
}

// ============================================================================
// ADMIN: UPDATE THRESHOLD
// ============================================================================

/**
 * Update the cycle threshold percentage
 */
export async function updateCycleThreshold(
  newThreshold: number,
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  if (newThreshold < 50 || newThreshold > 100) {
    return { success: false, error: "Threshold must be between 50% and 100%" };
  }

  const db = getFirestore();

  try {
    await db.collection("chatter_config").doc("country_rotation").update({
      cycleThresholdPercent: newThreshold,
      updatedAt: Timestamp.now(),
    });

    logger.info("[updateCycleThreshold] Threshold updated", {
      adminId,
      newThreshold,
    });

    return { success: true };
  } catch (error) {
    logger.error("[updateCycleThreshold] Error", { adminId, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update",
    };
  }
}
