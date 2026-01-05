/**
 * Initialize Budget Configuration
 *
 * This seed function initializes the budget_config collection with default thresholds
 * for monitoring service costs (Twilio, Firestore, Functions, Storage).
 */

import * as admin from "firebase-admin";

interface BudgetThreshold {
  budget: number;
  alertAt: number[];
}

interface MonthlyBudgetConfig {
  twilio: BudgetThreshold;
  firestore: BudgetThreshold;
  functions: BudgetThreshold;
  storage: BudgetThreshold;
  total: BudgetThreshold;
}

interface BudgetConfigDocument {
  id: string;
  monthly: MonthlyBudgetConfig;
  createdAt: admin.firestore.FieldValue;
  updatedAt: admin.firestore.FieldValue;
}

const DEFAULT_BUDGET_CONFIG: Omit<BudgetConfigDocument, "createdAt" | "updatedAt"> = {
  id: "default",
  monthly: {
    twilio: { budget: 100, alertAt: [50, 80, 100] },
    firestore: { budget: 50, alertAt: [50, 80, 100] },
    functions: { budget: 30, alertAt: [50, 80, 100] },
    storage: { budget: 20, alertAt: [50, 80, 100] },
    total: { budget: 200, alertAt: [50, 80, 100] },
  },
};

/**
 * Initialize the budget_config collection with default thresholds.
 * This function is idempotent - it will only create the config if it doesn't exist.
 *
 * @param forceUpdate - If true, will overwrite existing config. Default: false
 * @returns Promise<{ created: boolean; updated: boolean; config: BudgetConfigDocument }>
 */
export async function initBudgetConfig(
  forceUpdate = false
): Promise<{ created: boolean; updated: boolean; config: Omit<BudgetConfigDocument, "createdAt" | "updatedAt"> }> {
  const db = admin.firestore();
  const configRef = db.collection("budget_config").doc("default");

  try {
    const existingDoc = await configRef.get();

    if (existingDoc.exists && !forceUpdate) {
      console.log("[initBudgetConfig] Budget config already exists, skipping initialization.");
      return {
        created: false,
        updated: false,
        config: existingDoc.data() as Omit<BudgetConfigDocument, "createdAt" | "updatedAt">,
      };
    }

    const configToSave: BudgetConfigDocument = {
      ...DEFAULT_BUDGET_CONFIG,
      createdAt: existingDoc.exists
        ? existingDoc.data()?.createdAt
        : admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await configRef.set(configToSave, { merge: false });

    const action = existingDoc.exists ? "updated" : "created";
    console.log(`[initBudgetConfig] Budget config ${action} successfully.`);
    console.log("[initBudgetConfig] Default thresholds:", JSON.stringify(DEFAULT_BUDGET_CONFIG.monthly, null, 2));

    return {
      created: !existingDoc.exists,
      updated: existingDoc.exists,
      config: DEFAULT_BUDGET_CONFIG,
    };
  } catch (error) {
    console.error("[initBudgetConfig] Error initializing budget config:", error);
    throw error;
  }
}

/**
 * Get the current budget configuration.
 * Returns the default config if none exists in the database.
 *
 * @returns Promise<MonthlyBudgetConfig>
 */
export async function getBudgetConfig(): Promise<MonthlyBudgetConfig> {
  const db = admin.firestore();
  const configRef = db.collection("budget_config").doc("default");

  try {
    const doc = await configRef.get();

    if (!doc.exists) {
      console.log("[getBudgetConfig] No config found, returning defaults.");
      return DEFAULT_BUDGET_CONFIG.monthly;
    }

    const data = doc.data() as BudgetConfigDocument;
    return data.monthly;
  } catch (error) {
    console.error("[getBudgetConfig] Error fetching budget config:", error);
    return DEFAULT_BUDGET_CONFIG.monthly;
  }
}

/**
 * Update specific budget thresholds.
 *
 * @param updates - Partial updates to apply to the monthly budget config
 * @returns Promise<MonthlyBudgetConfig>
 */
export async function updateBudgetConfig(
  updates: Partial<MonthlyBudgetConfig>
): Promise<MonthlyBudgetConfig> {
  const db = admin.firestore();
  const configRef = db.collection("budget_config").doc("default");

  try {
    const doc = await configRef.get();

    if (!doc.exists) {
      // Initialize with defaults first, then apply updates
      await initBudgetConfig();
    }

    const currentConfig = await getBudgetConfig();
    const updatedMonthly: MonthlyBudgetConfig = {
      ...currentConfig,
      ...updates,
    };

    await configRef.update({
      monthly: updatedMonthly,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log("[updateBudgetConfig] Budget config updated successfully.");
    return updatedMonthly;
  } catch (error) {
    console.error("[updateBudgetConfig] Error updating budget config:", error);
    throw error;
  }
}

/**
 * Check if a specific service cost has exceeded any alert thresholds.
 *
 * @param service - The service to check (twilio, firestore, functions, storage, total)
 * @param currentCost - The current cost for the service
 * @returns Promise<{ exceeded: boolean; thresholds: number[]; percentUsed: number }>
 */
export async function checkBudgetThreshold(
  service: keyof MonthlyBudgetConfig,
  currentCost: number
): Promise<{ exceeded: boolean; thresholds: number[]; percentUsed: number }> {
  const config = await getBudgetConfig();
  const serviceConfig = config[service];

  if (!serviceConfig) {
    console.warn(`[checkBudgetThreshold] Unknown service: ${service}`);
    return { exceeded: false, thresholds: [], percentUsed: 0 };
  }

  const percentUsed = (currentCost / serviceConfig.budget) * 100;
  const exceededThresholds = serviceConfig.alertAt.filter(
    (threshold) => percentUsed >= threshold
  );

  return {
    exceeded: exceededThresholds.length > 0,
    thresholds: exceededThresholds,
    percentUsed: Math.round(percentUsed * 100) / 100,
  };
}

// Export types for external use
export type { BudgetThreshold, MonthlyBudgetConfig, BudgetConfigDocument };

// Export default config for reference
export { DEFAULT_BUDGET_CONFIG };
