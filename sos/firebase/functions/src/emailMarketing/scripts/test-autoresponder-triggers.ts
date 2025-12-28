/**
 * Autoresponder Trigger Testing Script
 * 
 * Tests that autoresponders trigger correctly and stop conditions work
 * 
 * Usage:
 *   npx ts-node scripts/test-autoresponder-triggers.ts [options]
 * 
 * Options:
 *   --type <type>     Test specific autoresponder type
 *   --lang <lang>     Test specific language
 *   --user <userId>   Test with specific user ID
 *   --all             Test all autoresponders (default)
 */

import * as admin from "firebase-admin";
import {
  getAllAutoresponderConfigs,
  shouldStopAutoresponder,
  type AutoresponderType,
} from "../utils/autoresponderConfig";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "../config";
import { mapUserToMailWizzFields } from "../utils/fieldMapper";

interface TestResult {
  config: {
    type: AutoresponderType;
    language: SupportedLanguage;
    name: string;
  };
  shouldTrigger: boolean;
  shouldStop: boolean;
  stopReason?: string;
  userFields: Record<string, any>;
  errors: string[];
}

interface TestReport {
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
}

/**
 * Initialize Firebase Admin (if not already initialized)
 */
function initializeFirebase(): void {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
}

/**
 * Get test user data
 */
async function getTestUser(userId?: string): Promise<{
  userId: string;
  userData: admin.firestore.DocumentData;
}> {
  initializeFirebase();
  const db = admin.firestore();

  if (userId) {
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      throw new Error(`User ${userId} not found`);
    }
    return {
      userId: userDoc.id,
      userData: userDoc.data()!,
    };
  }

  // Get a sample user for testing
  const usersSnapshot = await db.collection("users").limit(1).get();
  if (usersSnapshot.empty) {
    throw new Error("No users found in database");
  }

  const userDoc = usersSnapshot.docs[0];
  return {
    userId: userDoc.id,
    userData: userDoc.data(),
  };
}

/**
 * Test if an autoresponder should trigger for a user
 */
function testAutoresponderTrigger(
  config: ReturnType<typeof getAllAutoresponderConfigs>[0],
  userFields: Record<string, any>
): { shouldTrigger: boolean; reason?: string } {
  // Check include segments
  // Note: This is a simplified check - in reality, MailWizz handles segment matching
  const userLanguage = userFields.LANGUAGE?.toLowerCase() || "en";
  const configLanguage = config.language.toLowerCase();

  if (userLanguage !== configLanguage) {
    return {
      shouldTrigger: false,
      reason: `Language mismatch: user=${userLanguage}, config=${configLanguage}`,
    };
  }

  // Check trigger conditions
  if (config.trigger === "custom_field_change") {
    if (config.customFieldTrigger) {
      const fieldValue = userFields[config.customFieldTrigger.field];
      const condition = config.customFieldTrigger.condition;
      const expectedValue = config.customFieldTrigger.value;

      let conditionMet = false;
      switch (condition) {
        case "=":
          conditionMet = fieldValue == expectedValue;
          break;
        case ">":
          conditionMet = Number(fieldValue) > Number(expectedValue);
          break;
        case "<":
          conditionMet = Number(fieldValue) < Number(expectedValue);
          break;
        case ">=":
          conditionMet = Number(fieldValue) >= Number(expectedValue);
          break;
        case "<=":
          conditionMet = Number(fieldValue) <= Number(expectedValue);
          break;
        case "IN":
          conditionMet = Array.isArray(expectedValue) && expectedValue.includes(fieldValue);
          break;
      }

      if (!conditionMet) {
        return {
          shouldTrigger: false,
          reason: `Trigger condition not met: ${config.customFieldTrigger.field} ${condition} ${expectedValue} (actual: ${fieldValue})`,
        };
      }
    }
  }

  return { shouldTrigger: true };
}

/**
 * Test a single autoresponder configuration
 */
async function testAutoresponder(
  config: ReturnType<typeof getAllAutoresponderConfigs>[0],
  userFields: Record<string, any>
): Promise<TestResult> {
  const result: TestResult = {
    config: {
      type: config.type,
      language: config.language,
      name: config.name,
    },
    shouldTrigger: false,
    shouldStop: false,
    userFields: {},
    errors: [],
  };

  try {
    // Map user fields to MailWizz format
    result.userFields = userFields;

    // Test trigger condition
    const triggerTest = testAutoresponderTrigger(config, userFields);
    result.shouldTrigger = triggerTest.shouldTrigger;
    if (!triggerTest.shouldTrigger && triggerTest.reason) {
      result.errors.push(triggerTest.reason);
    }

    // Test stop conditions
    const stopTest = shouldStopAutoresponder(
      config.type,
      config.language,
      userFields
    );
    result.shouldStop = stopTest.shouldStop;
    if (stopTest.shouldStop && stopTest.reason) {
      result.stopReason = stopTest.reason;
    }
  } catch (error: any) {
    result.errors.push(`Error testing autoresponder: ${error.message}`);
  }

  return result;
}

/**
 * Run tests for all autoresponders
 */
export async function testAllAutoresponders(options: {
  type?: AutoresponderType;
  language?: SupportedLanguage;
  userId?: string;
}): Promise<TestReport> {
  console.log("🧪 Starting autoresponder trigger tests...\n");

  // Get test user
  const { userId, userData } = await getTestUser(options.userId);
  console.log(`👤 Using test user: ${userId}\n`);

  // Map user to MailWizz fields
  const userFields = mapUserToMailWizzFields(userData, userId);
  console.log("📋 User fields:", Object.keys(userFields).length, "fields\n");

  // Get configurations to test
  let configs = getAllAutoresponderConfigs();

  if (options.type) {
    configs = configs.filter((c) => c.type === options.type);
    console.log(`🔍 Filtering by type: ${options.type}\n`);
  }

  if (options.language) {
    configs = configs.filter((c) => c.language === options.language);
    console.log(`🔍 Filtering by language: ${options.language}\n`);
  }

  console.log(`📋 Testing ${configs.length} autoresponders...\n`);

  // Test each autoresponder
  const results: TestResult[] = [];
  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];
    process.stdout.write(
      `\r⏳ Testing ${i + 1}/${configs.length}: ${config.name}...`
    );
    const result = await testAutoresponder(config, userFields);
    results.push(result);
  }
  console.log("\n");

  // Generate report
  const passed = results.filter(
    (r) => r.shouldTrigger && !r.shouldStop && r.errors.length === 0
  ).length;
  const failed = results.length - passed;

  const report: TestReport = {
    total: results.length,
    passed,
    failed,
    results,
  };

  return report;
}

/**
 * Print test report
 */
export function printTestReport(report: TestReport): void {
  console.log("\n" + "=".repeat(80));
  console.log("📊 AUTORESPONDER TRIGGER TEST REPORT");
  console.log("=".repeat(80) + "\n");

  console.log(`Total Tests: ${report.total}`);
  console.log(`✅ Passed: ${report.passed}`);
  console.log(`❌ Failed: ${report.failed}\n`);

  // Group results by type
  const byType = new Map<AutoresponderType, TestResult[]>();
  for (const result of report.results) {
    if (!byType.has(result.config.type)) {
      byType.set(result.config.type, []);
    }
    byType.get(result.config.type)!.push(result);
  }

  console.log("📋 Results by Type:\n");
  for (const [type, results] of byType.entries()) {
    const passed = results.filter((r) => r.shouldTrigger && !r.shouldStop).length;
    const total = results.length;
    const status = passed === total ? "✅" : "⚠️";
    console.log(`${status} ${type}: ${passed}/${total} passed`);
  }

  // Detailed results
  console.log("\n📋 Detailed Results:\n");
  for (const result of report.results) {
    const status =
      result.shouldTrigger && !result.shouldStop && result.errors.length === 0
        ? "✅"
        : "❌";
    console.log(
      `${status} ${result.config.name} (${result.config.type})`
    );

    if (result.shouldTrigger) {
      console.log(`   ✅ Should trigger`);
    } else {
      console.log(`   ❌ Should NOT trigger`);
    }

    if (result.shouldStop) {
      console.log(`   ⛔ Should STOP (${result.stopReason || "unknown reason"})`);
    } else {
      console.log(`   ✅ Should continue`);
    }

    if (result.errors.length > 0) {
      for (const error of result.errors) {
        console.log(`   ❌ ${error}`);
      }
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    report.passed === report.total
      ? "✅ All tests passed!"
      : "⚠️  Some tests failed. Review the results above."
  );
  console.log("=".repeat(80) + "\n");
}

/**
 * Test stop conditions specifically
 */
export async function testStopConditions(userId?: string): Promise<void> {
  console.log("🛑 Testing stop conditions...\n");

  const { userId: testUserId, userData } = await getTestUser(userId);
  const userFields = mapUserToMailWizzFields(userData, testUserId);

  console.log("📋 Current user fields that affect stop conditions:\n");
  const stopConditionFields = [
    "PROFILE_STATUS",
    "ACTIVITY_STATUS",
    "TOTAL_CALLS",
    "IS_ONLINE",
    "KYC_STATUS",
    "PAYPAL_STATUS",
    "LAST_LOGIN",
    "HAS_LEFT_REVIEW",
  ];

  for (const field of stopConditionFields) {
    const value = userFields[field];
    console.log(`   ${field}: ${value || "(not set)"}`);
  }

  console.log("\n📋 Stop condition analysis:\n");

  const configs = getAllAutoresponderConfigs();
  for (const config of configs) {
    const stopTest = shouldStopAutoresponder(
      config.type,
      config.language,
      userFields
    );

    if (stopTest.shouldStop) {
      console.log(
        `⛔ ${config.name}: STOPPED (${stopTest.reason || "unknown"})`
      );
    }
  }

  console.log();
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const options: {
    type?: AutoresponderType;
    language?: SupportedLanguage;
    userId?: string;
  } = {};

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--type" && args[i + 1]) {
      options.type = args[i + 1] as AutoresponderType;
      i++;
    } else if (arg === "--lang" && args[i + 1]) {
      const lang = args[i + 1].toLowerCase();
      if (SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage)) {
        options.language = lang as SupportedLanguage;
      }
      i++;
    } else if (arg === "--user" && args[i + 1]) {
      options.userId = args[i + 1];
      i++;
    } else if (arg === "--stop-conditions") {
      await testStopConditions(options.userId);
      return;
    }
  }

  try {
    const report = await testAllAutoresponders(options);
    printTestReport(report);

    // Exit with error code if tests failed
    if (report.failed > 0) {
      process.exit(1);
    }
  } catch (error: any) {
    console.error("❌ Testing failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

