/**
 * Autoresponder Configuration Utilities
 * 
 * TypeScript definitions and helpers for all 11 autoresponder types
 * and 9 languages (99 total autoresponders)
 */

import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "../config";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Autoresponder types (11 total)
 */
export type AutoresponderType =
  | "nurture-profile"
  | "nurture-no-calls"
  | "nurture-login-clients"
  | "nurture-login-providers"
  | "nurture-kyc"
  | "nurture-offline"
  | "nurture-paypal"
  | "nurture-action"
  | "reactivation-clients"
  | "reactivation-providers"
  | "request-review";

/**
 * Autoresponder configuration
 */
export interface AutoresponderConfig {
  type: AutoresponderType;
  language: SupportedLanguage;
  name: string;
  description: string;
  includeSegments: string[];
  excludeSegments: string[];
  trigger: "after_subscribe" | "custom_field_change";
  customFieldTrigger?: {
    field: string;
    condition: string;
    value: string | number | string[];
  };
  sendTime: string; // "09:00" or "10:00"
  sequence: EmailSequenceItem[];
  stopConditions: StopCondition[];
  rtlSupport?: boolean; // For Arabic
}

/**
 * Email sequence item
 */
export interface EmailSequenceItem {
  day: number; // Days from trigger
  template: string; // Template name
  sendTime?: string; // Optional override
}

/**
 * Stop condition
 */
export interface StopCondition {
  field: string;
  operator: "=" | "!=" | ">" | "<" | ">=" | "<=" | "IN" | "NOT IN";
  value: string | number | string[] | boolean | null;
}

// ============================================================================
// AUTORESPONDER DEFINITIONS
// ============================================================================

/**
 * Get all autoresponder configurations
 */
export function getAllAutoresponderConfigs(): AutoresponderConfig[] {
  const configs: AutoresponderConfig[] = [];

  for (const lang of SUPPORTED_LANGUAGES) {
    // Type 1: Nurture Profile
    configs.push(getNurtureProfileConfig(lang));

    // Type 2: Nurture No Calls
    configs.push(getNurtureNoCallsConfig(lang));

    // Type 3: Nurture Login Clients
    configs.push(getNurtureLoginClientsConfig(lang));

    // Type 4: Nurture Login Providers
    configs.push(getNurtureLoginProvidersConfig(lang));

    // Type 5: Nurture KYC
    configs.push(getNurtureKYCConfig(lang));

    // Type 6: Nurture Offline
    configs.push(getNurtureOfflineConfig(lang));

    // Type 7: Nurture PayPal
    configs.push(getNurturePayPalConfig(lang));

    // Type 8: Nurture Action
    configs.push(getNurtureActionConfig(lang));

    // Type 9: Reactivation Clients
    configs.push(getReactivationClientsConfig(lang));

    // Type 10: Reactivation Providers
    configs.push(getReactivationProvidersConfig(lang));

    // Type 11: Request Review
    configs.push(getRequestReviewConfig(lang));
  }

  return configs;
}

/**
 * Type 1: Nurture Profile
 */
export function getNurtureProfileConfig(lang: SupportedLanguage): AutoresponderConfig {
  const langUpper = lang.toUpperCase();
  return {
    type: "nurture-profile",
    language: lang,
    name: `Nurture Profile ${langUpper}`,
    description: `Help providers complete their profile - ${langUpper}`,
    includeSegments: ["profile_incomplete", `language_${lang}`],
    excludeSegments: [],
    trigger: "after_subscribe",
    sendTime: "09:00",
    sequence: [
      { day: 1, template: `CA_PRO_nurture-profile_01_${langUpper}` },
      { day: 3, template: `CA_PRO_nurture-profile_02_${langUpper}` },
      { day: 7, template: `CA_PRO_nurture-profile_03_${langUpper}` },
      { day: 14, template: `CA_PRO_nurture-profile_04_${langUpper}` },
    ],
    stopConditions: [
      { field: "PROFILE_STATUS", operator: "=", value: "profile_complete" },
    ],
  };
}

/**
 * Type 2: Nurture No Calls
 */
export function getNurtureNoCallsConfig(lang: SupportedLanguage): AutoresponderConfig {
  const langUpper = lang.toUpperCase();
  return {
    type: "nurture-no-calls",
    language: lang,
    name: `Nurture No Calls ${langUpper}`,
    description: `Encourage providers to get their first call - ${langUpper}`,
    includeSegments: ["providers_no_calls", `language_${lang}`],
    excludeSegments: [],
    trigger: "custom_field_change",
    customFieldTrigger: {
      field: "TOTAL_CALLS",
      condition: "=",
      value: 0,
    },
    sendTime: "10:00",
    sequence: [
      { day: 2, template: `CA_PRO_nurture-no-calls_01_${langUpper}` },
      { day: 5, template: `CA_PRO_nurture-no-calls_02_${langUpper}` },
      { day: 10, template: `CA_PRO_nurture-no-calls_03_${langUpper}` },
    ],
    stopConditions: [
      { field: "TOTAL_CALLS", operator: ">", value: 0 },
      { field: "IS_ONLINE", operator: "=", value: "offline" },
    ],
  };
}

/**
 * Type 3: Nurture Login Clients
 */
export function getNurtureLoginClientsConfig(lang: SupportedLanguage): AutoresponderConfig {
  const langUpper = lang.toUpperCase();
  return {
    type: "nurture-login-clients",
    language: lang,
    name: `Nurture Login Client ${langUpper}`,
    description: `Encourage clients to make their first login - ${langUpper}`,
    includeSegments: ["clients_never_logged", `language_${lang}`],
    excludeSegments: [],
    trigger: "after_subscribe",
    sendTime: "09:00",
    sequence: [
      { day: 1, template: `CA_CLI_nurture-login_01_${langUpper}` },
      { day: 3, template: `CA_CLI_nurture-login_02_${langUpper}` },
      { day: 7, template: `CA_CLI_nurture-login_03_${langUpper}` },
      { day: 14, template: `CA_CLI_nurture-login_04_${langUpper}` },
    ],
    stopConditions: [
      { field: "ACTIVITY_STATUS", operator: "=", value: "active" },
      { field: "LAST_LOGIN", operator: "!=", value: "" },
    ],
  };
}

/**
 * Type 4: Nurture Login Providers
 */
export function getNurtureLoginProvidersConfig(lang: SupportedLanguage): AutoresponderConfig {
  const langUpper = lang.toUpperCase();
  return {
    type: "nurture-login-providers",
    language: lang,
    name: `Nurture Login Provider ${langUpper}`,
    description: `Encourage providers to make their first login - ${langUpper}`,
    includeSegments: ["providers_never_logged", `language_${lang}`],
    excludeSegments: [],
    trigger: "after_subscribe",
    sendTime: "09:00",
    sequence: [
      { day: 1, template: `CA_PRO_nurture-login_01_${langUpper}` },
      { day: 3, template: `CA_PRO_nurture-login_02_${langUpper}` },
      { day: 7, template: `CA_PRO_nurture-login_03_${langUpper}` },
      { day: 14, template: `CA_PRO_nurture-login_04_${langUpper}` },
    ],
    stopConditions: [
      { field: "ACTIVITY_STATUS", operator: "=", value: "active" },
      { field: "LAST_LOGIN", operator: "!=", value: "" },
    ],
  };
}

/**
 * Type 5: Nurture KYC
 */
export function getNurtureKYCConfig(lang: SupportedLanguage): AutoresponderConfig {
  const langUpper = lang.toUpperCase();
  return {
    type: "nurture-kyc",
    language: lang,
    name: `Nurture KYC ${langUpper}`,
    description: `Help providers complete KYC verification - ${langUpper}`,
    includeSegments: ["all_providers", `language_${lang}`],
    excludeSegments: [],
    trigger: "custom_field_change",
    customFieldTrigger: {
      field: "KYC_STATUS",
      condition: "IN",
      value: ["kyc_pending", "kyc_submitted", "kyc_rejected"],
    },
    sendTime: "10:00",
    sequence: [
      { day: 1, template: `CA_PRO_nurture-kyc_01_${langUpper}` },
      { day: 3, template: `CA_PRO_nurture-kyc_02_${langUpper}` },
      { day: 7, template: `CA_PRO_nurture-kyc_03_${langUpper}` },
      { day: 14, template: `CA_PRO_nurture-kyc_04_${langUpper}` },
    ],
    stopConditions: [
      { field: "KYC_STATUS", operator: "=", value: "kyc_verified" },
    ],
  };
}

/**
 * Type 6: Nurture Offline
 */
export function getNurtureOfflineConfig(lang: SupportedLanguage): AutoresponderConfig {
  const langUpper = lang.toUpperCase();
  return {
    type: "nurture-offline",
    language: lang,
    name: `Nurture Offline ${langUpper}`,
    description: `Remind providers to go online - ${langUpper}`,
    includeSegments: ["providers_offline", `language_${lang}`],
    excludeSegments: [],
    trigger: "custom_field_change",
    customFieldTrigger: {
      field: "IS_ONLINE",
      condition: "=",
      value: "offline",
    },
    sendTime: "09:00",
    sequence: [
      { day: 1, template: `CA_PRO_nurture-offline_01_${langUpper}` },
      { day: 3, template: `CA_PRO_nurture-offline_02_${langUpper}` },
      { day: 5, template: `CA_PRO_nurture-offline_03_${langUpper}` },
      { day: 7, template: `CA_PRO_nurture-offline_04_${langUpper}` },
      { day: 10, template: `CA_PRO_nurture-offline_05_${langUpper}` },
    ],
    stopConditions: [
      { field: "IS_ONLINE", operator: "=", value: "online" },
    ],
  };
}

/**
 * Type 7: Nurture PayPal
 */
export function getNurturePayPalConfig(lang: SupportedLanguage): AutoresponderConfig {
  const langUpper = lang.toUpperCase();
  return {
    type: "nurture-paypal",
    language: lang,
    name: `Nurture PayPal ${langUpper}`,
    description: `Help providers configure PayPal - ${langUpper}`,
    includeSegments: ["providers_paypal_pending", `language_${lang}`],
    excludeSegments: [],
    trigger: "custom_field_change",
    customFieldTrigger: {
      field: "PAYPAL_STATUS",
      condition: "=",
      value: "paypal_pending",
    },
    sendTime: "10:00",
    sequence: [
      { day: 1, template: `CA_PRO_nurture-paypal_01_${langUpper}` },
      { day: 4, template: `CA_PRO_nurture-paypal_02_${langUpper}` },
      { day: 8, template: `CA_PRO_nurture-paypal_03_${langUpper}` },
    ],
    stopConditions: [
      { field: "PAYPAL_STATUS", operator: "=", value: "paypal_ok" },
    ],
  };
}

/**
 * Type 8: Nurture Action
 */
export function getNurtureActionConfig(lang: SupportedLanguage): AutoresponderConfig {
  const langUpper = lang.toUpperCase();
  return {
    type: "nurture-action",
    language: lang,
    name: `Nurture Action ${langUpper}`,
    description: `Encourage clients to take their first action - ${langUpper}`,
    includeSegments: ["clients_no_action", `language_${lang}`],
    excludeSegments: [],
    trigger: "custom_field_change",
    customFieldTrigger: {
      field: "TOTAL_CALLS",
      condition: "=",
      value: 0,
    },
    sendTime: "09:00",
    sequence: [
      { day: 1, template: `CA_CLI_nurture-action_01_${langUpper}` },
      { day: 3, template: `CA_CLI_nurture-action_02_${langUpper}` },
      { day: 7, template: `CA_CLI_nurture-action_03_${langUpper}` },
      { day: 14, template: `CA_CLI_nurture-action_04_${langUpper}` },
    ],
    stopConditions: [
      { field: "TOTAL_CALLS", operator: ">", value: 0 },
    ],
  };
}

/**
 * Type 9: Reactivation Clients
 */
export function getReactivationClientsConfig(lang: SupportedLanguage): AutoresponderConfig {
  const langUpper = lang.toUpperCase();
  return {
    type: "reactivation-clients",
    language: lang,
    name: `Reactivation Client ${langUpper}`,
    description: `Re-engage inactive clients - ${langUpper}`,
    includeSegments: ["clients_inactive", `language_${lang}`],
    excludeSegments: [],
    trigger: "custom_field_change",
    customFieldTrigger: {
      field: "ACTIVITY_STATUS",
      condition: "=",
      value: "inactive",
    },
    sendTime: "09:00",
    sequence: [
      { day: 1, template: `CA_CLI_nurture-inactive_01_${langUpper}` },
      { day: 3, template: `CA_CLI_nurture-inactive_02_${langUpper}` },
      { day: 7, template: `CA_CLI_nurture-inactive_03_${langUpper}` },
      { day: 14, template: `CA_CLI_nurture-inactive_04_${langUpper}` },
      { day: 21, template: `CA_CLI_nurture-inactive_05_${langUpper}` },
    ],
    stopConditions: [
      { field: "LAST_ACTIVITY", operator: "!=", value: "inactive_30_days" },
      { field: "ACTIVITY_STATUS", operator: "=", value: "active" },
    ],
    rtlSupport: lang === "ar", // RTL for Arabic
  };
}

/**
 * Type 10: Reactivation Providers
 */
export function getReactivationProvidersConfig(lang: SupportedLanguage): AutoresponderConfig {
  const langUpper = lang.toUpperCase();
  return {
    type: "reactivation-providers",
    language: lang,
    name: `Reactivation Provider ${langUpper}`,
    description: `Re-engage inactive providers - ${langUpper}`,
    includeSegments: ["providers_inactive", `language_${lang}`],
    excludeSegments: [],
    trigger: "custom_field_change",
    customFieldTrigger: {
      field: "ACTIVITY_STATUS",
      condition: "=",
      value: "inactive",
    },
    sendTime: "10:00",
    sequence: [
      { day: 1, template: `CA_PRO_nurture-inactive-p_01_${langUpper}` },
      { day: 5, template: `CA_PRO_nurture-inactive-p_02_${langUpper}` },
      { day: 10, template: `CA_PRO_nurture-inactive-p_03_${langUpper}` },
    ],
    stopConditions: [
      { field: "LAST_ACTIVITY", operator: "!=", value: "inactive_30_days" },
      { field: "ACTIVITY_STATUS", operator: "=", value: "active" },
    ],
  };
}

/**
 * Type 11: Request Review
 */
export function getRequestReviewConfig(lang: SupportedLanguage): AutoresponderConfig {
  const langUpper = lang.toUpperCase();
  return {
    type: "request-review",
    language: lang,
    name: `Request Review ${langUpper}`,
    description: `Request reviews from clients who completed calls - ${langUpper}`,
    includeSegments: ["clients_completed_call", `language_${lang}`],
    excludeSegments: [],
    trigger: "custom_field_change",
    customFieldTrigger: {
      field: "TOTAL_CALLS",
      condition: ">",
      value: 0,
    },
    sendTime: "10:00",
    sequence: [
      { day: 1, template: `CA_CLI_request-review_01_${langUpper}` },
      { day: 3, template: `CA_CLI_request-review_02_${langUpper}` },
      { day: 7, template: `CA_CLI_request-review_03_${langUpper}` },
      { day: 14, template: `CA_CLI_request-review_04_${langUpper}` },
    ],
    stopConditions: [
      { field: "HAS_LEFT_REVIEW", operator: "=", value: "true" },
    ],
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get autoresponder name from type and language
 */
export function getAutoresponderName(
  type: AutoresponderType,
  language: SupportedLanguage
): string {
  const config = getAllAutoresponderConfigs().find(
    (c) => c.type === type && c.language === language
  );
  return config?.name || `${type} ${language.toUpperCase()}`;
}

/**
 * Get template name for a specific autoresponder email
 */
export function getTemplateName(
  type: AutoresponderType,
  language: SupportedLanguage,
  emailIndex: number
): string {
  const config = getAllAutoresponderConfigs().find(
    (c) => c.type === type && c.language === language
  );
  if (!config || !config.sequence[emailIndex]) {
    throw new Error(
      `Template not found for ${type} ${language} email ${emailIndex}`
    );
  }
  return config.sequence[emailIndex].template;
}

/**
 * Get all templates for an autoresponder type
 */
export function getTemplatesForType(
  type: AutoresponderType,
  language: SupportedLanguage
): string[] {
  const config = getAllAutoresponderConfigs().find(
    (c) => c.type === type && c.language === language
  );
  return config?.sequence.map((item) => item.template) || [];
}

/**
 * Validate stop condition
 */
export function validateStopCondition(
  condition: StopCondition,
  fieldValue: any
): boolean {
  const { operator, value } = condition;

  switch (operator) {
    case "=":
      // Handle boolean values
      if (typeof value === "boolean") {
        return fieldValue === value || fieldValue === String(value);
      }
      return fieldValue === value || fieldValue === String(value);
    case "!=":
      // Handle null/empty checks
      if (value === "" || value === null) {
        return fieldValue != null && fieldValue !== "";
      }
      return fieldValue !== value && fieldValue !== String(value);
    case ">":
      return Number(fieldValue) > Number(value);
    case "<":
      return Number(fieldValue) < Number(value);
    case ">=":
      return Number(fieldValue) >= Number(value);
    case "<=":
      return Number(fieldValue) <= Number(value);
    case "IN":
      return Array.isArray(value) && value.includes(fieldValue);
    case "NOT IN":
      return Array.isArray(value) && !value.includes(fieldValue);
    default:
      return false;
  }
}

/**
 * Check if autoresponder should be stopped
 */
export function shouldStopAutoresponder(
  type: AutoresponderType,
  language: SupportedLanguage,
  userFields: Record<string, any>
): { shouldStop: boolean; reason?: string } {
  const config = getAllAutoresponderConfigs().find(
    (c) => c.type === type && c.language === language
  );

  if (!config) {
    return { shouldStop: false };
  }

  for (const condition of config.stopConditions) {
    const fieldValue = userFields[condition.field];
    if (validateStopCondition(condition, fieldValue)) {
      return {
        shouldStop: true,
        reason: `${condition.field} ${condition.operator} ${condition.value}`,
      };
    }
  }

  return { shouldStop: false };
}

/**
 * Get all autoresponders for a specific language
 */
export function getAutorespondersForLanguage(
  language: SupportedLanguage
): AutoresponderConfig[] {
  return getAllAutoresponderConfigs().filter((c) => c.language === language);
}

/**
 * Get all autoresponders for a specific type
 */
export function getAutorespondersForType(
  type: AutoresponderType
): AutoresponderConfig[] {
  return getAllAutoresponderConfigs().filter((c) => c.type === type);
}

/**
 * Count total autoresponders
 */
export function getTotalAutoresponderCount(): number {
  return getAllAutoresponderConfigs().length;
}

/**
 * Verify all 99 autoresponders are defined
 */
export function verifyAutoresponderCount(): {
  valid: boolean;
  expected: number;
  actual: number;
  missing?: string[];
} {
  const expected = 11 * 9; // 11 types × 9 languages
  const actual = getTotalAutoresponderCount();
  const configs = getAllAutoresponderConfigs();

  if (actual === expected) {
    return { valid: true, expected, actual };
  }

  // Find missing combinations
  const missing: string[] = [];
  const types: AutoresponderType[] = [
    "nurture-profile",
    "nurture-no-calls",
    "nurture-login-clients",
    "nurture-login-providers",
    "nurture-kyc",
    "nurture-offline",
    "nurture-paypal",
    "nurture-action",
    "reactivation-clients",
    "reactivation-providers",
    "request-review",
  ];

  for (const type of types) {
    for (const lang of SUPPORTED_LANGUAGES) {
      const exists = configs.some(
        (c) => c.type === type && c.language === lang
      );
      if (!exists) {
        missing.push(`${type}-${lang}`);
      }
    }
  }

  return { valid: false, expected, actual, missing };
}

