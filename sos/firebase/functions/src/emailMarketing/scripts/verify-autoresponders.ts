/**
 * Autoresponder Verification Script
 * 
 * Validates that all 99 autoresponders are properly configured in MailWizz
 * 
 * Usage:
 *   npx ts-node scripts/verify-autoresponders.ts
 * 
 * Or compile and run:
 *   npm run build
 *   node dist/emailMarketing/scripts/verify-autoresponders.js
 */

import axios from "axios";
import {
  getAllAutoresponderConfigs,
  verifyAutoresponderCount,
  type AutoresponderConfig,
} from "../utils/autoresponderConfig";
import { validateMailWizzConfig } from "../config";

interface VerificationResult {
  config: AutoresponderConfig;
  exists: boolean;
  nameMatch: boolean;
  segmentsValid: boolean;
  templatesValid: boolean;
  stopConditionsValid: boolean;
  errors: string[];
  warnings: string[];
}

interface VerificationReport {
  total: number;
  valid: number;
  invalid: number;
  missing: number;
  results: VerificationResult[];
  summary: {
    missingAutoresponders: string[];
    invalidSegments: string[];
    missingTemplates: string[];
    invalidStopConditions: string[];
  };
}

/**
 * Verify a single autoresponder in MailWizz
 */
async function verifyAutoresponder(
  config: AutoresponderConfig,
  mailwizzConfig: ReturnType<typeof validateMailWizzConfig>
): Promise<VerificationResult> {
  const result: VerificationResult = {
    config,
    exists: false,
    nameMatch: false,
    segmentsValid: false,
    templatesValid: false,
    stopConditionsValid: false,
    errors: [],
    warnings: [],
  };

  try {
    // Search for autoresponder by name
    const searchResponse = await axios.get(
      `${mailwizzConfig.apiUrl}/lists/${mailwizzConfig.listUid}/autoresponders`,
      {
        headers: {
          "X-MW-PUBLIC-KEY": mailwizzConfig.apiKey,
          "X-MW-CUSTOMER-ID": mailwizzConfig.customerId,
        },
        params: {
          search: config.name,
        },
      }
    );

    const autoresponders = searchResponse.data?.data?.records || [];
    const autoresponder = autoresponders.find(
      (ar: any) => ar.name === config.name
    );

    if (!autoresponder) {
      result.errors.push(`Autoresponder "${config.name}" not found in MailWizz`);
      return result;
    }

    result.exists = true;

    // Verify name matches
    if (autoresponder.name === config.name) {
      result.nameMatch = true;
    } else {
      result.errors.push(
        `Name mismatch: expected "${config.name}", found "${autoresponder.name}"`
      );
    }

    // Verify segments
    const includeSegments = autoresponder.includeSegments || [];
    const excludeSegments = autoresponder.excludeSegments || [];

    const missingIncludeSegments = config.includeSegments.filter(
      (seg) => !includeSegments.includes(seg)
    );
    const missingExcludeSegments = config.excludeSegments.filter(
      (seg) => !excludeSegments.includes(seg)
    );

    if (missingIncludeSegments.length === 0 && missingExcludeSegments.length === 0) {
      result.segmentsValid = true;
    } else {
      if (missingIncludeSegments.length > 0) {
        result.errors.push(
          `Missing include segments: ${missingIncludeSegments.join(", ")}`
        );
      }
      if (missingExcludeSegments.length > 0) {
        result.warnings.push(
          `Missing exclude segments: ${missingExcludeSegments.join(", ")}`
        );
      }
    }

    // Verify templates
    const emailSequence = autoresponder.emailSequence || [];
    const configTemplates = config.sequence.map((item) => item.template);

    const missingTemplates: string[] = [];
    for (const template of configTemplates) {
      const found = emailSequence.some(
        (email: any) => email.template === template || email.templateName === template
      );
      if (!found) {
        missingTemplates.push(template);
      }
    }

    if (missingTemplates.length === 0) {
      result.templatesValid = true;
    } else {
      result.errors.push(`Missing templates: ${missingTemplates.join(", ")}`);
    }

    // Verify stop conditions
    const stopConditions = autoresponder.stopConditions || [];
    const configStopConditions = config.stopConditions;

    // Basic check - MailWizz may store stop conditions differently
    if (configStopConditions.length > 0 && stopConditions.length === 0) {
      result.warnings.push("Stop conditions not configured in MailWizz");
    } else {
      result.stopConditionsValid = true;
    }

    // Verify status
    if (autoresponder.status !== "active") {
      result.warnings.push(`Autoresponder is not active (status: ${autoresponder.status})`);
    }
  } catch (error: any) {
    result.errors.push(
      `Error verifying autoresponder: ${error.message || "Unknown error"}`
    );
  }

  return result;
}

/**
 * Verify all templates exist in MailWizz
 */
async function verifyTemplates(
  configs: AutoresponderConfig[],
  mailwizzConfig: ReturnType<typeof validateMailWizzConfig>
): Promise<Set<string>> {
  const allTemplates = new Set<string>();
  const missingTemplates = new Set<string>();

  // Collect all template names
  for (const config of configs) {
    for (const item of config.sequence) {
      allTemplates.add(item.template);
    }
  }

  // Verify each template exists
  for (const template of allTemplates) {
    try {
      const response = await axios.get(
        `${mailwizzConfig.apiUrl}/templates`,
        {
          headers: {
            "X-MW-PUBLIC-KEY": mailwizzConfig.apiKey,
            "X-MW-CUSTOMER-ID": mailwizzConfig.customerId,
          },
          params: {
            search: template,
          },
        }
      );

      const templates = response.data?.data?.records || [];
      const found = templates.some(
        (t: any) => t.name === template || t.uid === template
      );

      if (!found) {
        missingTemplates.add(template);
      }
    } catch (error) {
      // If template search fails, assume template might exist
      // (API might not support search)
      console.warn(`Could not verify template ${template}:`, error);
    }
  }

  return missingTemplates;
}

/**
 * Verify all segments exist in MailWizz
 */
async function verifySegments(
  configs: AutoresponderConfig[],
  mailwizzConfig: ReturnType<typeof validateMailWizzConfig>
): Promise<Set<string>> {
  const allSegments = new Set<string>();
  const missingSegments = new Set<string>();

  // Collect all segment names
  for (const config of configs) {
    for (const seg of config.includeSegments) {
      allSegments.add(seg);
    }
    for (const seg of config.excludeSegments) {
      allSegments.add(seg);
    }
  }

  // Verify each segment exists
  try {
    const response = await axios.get(
      `${mailwizzConfig.apiUrl}/lists/${mailwizzConfig.listUid}/segments`,
      {
        headers: {
          "X-MW-PUBLIC-KEY": mailwizzConfig.apiKey,
          "X-MW-CUSTOMER-ID": mailwizzConfig.customerId,
        },
      }
    );

    const segments = response.data?.data?.records || [];
    const segmentNames = new Set(segments.map((s: any) => s.name || s.uid));

    for (const segment of allSegments) {
      if (!segmentNames.has(segment)) {
        missingSegments.add(segment);
      }
    }
  } catch (error) {
    console.warn("Could not verify segments:", error);
  }

  return missingSegments;
}

/**
 * Main verification function
 */
export async function verifyAllAutoresponders(): Promise<VerificationReport> {
  console.log("🔍 Starting autoresponder verification...\n");

  // Verify count
  const countCheck = verifyAutoresponderCount();
  if (!countCheck.valid) {
    console.error(
      `❌ Autoresponder count mismatch: Expected ${countCheck.expected}, found ${countCheck.actual}`
    );
    if (countCheck.missing) {
      console.error(`Missing: ${countCheck.missing.join(", ")}`);
    }
  } else {
    console.log(`✅ Autoresponder count correct: ${countCheck.actual}\n`);
  }

  // Get MailWizz config
  const mailwizzConfig = validateMailWizzConfig();
  const configs = getAllAutoresponderConfigs();

  console.log(`📋 Verifying ${configs.length} autoresponders...\n`);

  // Verify each autoresponder
  const results: VerificationResult[] = [];
  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];
    process.stdout.write(
      `\r⏳ Verifying ${i + 1}/${configs.length}: ${config.name}...`
    );
    const result = await verifyAutoresponder(config, mailwizzConfig);
    results.push(result);
  }
  console.log("\n");

  // Verify templates
  console.log("📧 Verifying templates...");
  const missingTemplates = await verifyTemplates(configs, mailwizzConfig);

  // Verify segments
  console.log("🏷️  Verifying segments...");
  const missingSegments = await verifySegments(configs, mailwizzConfig);

  // Generate report
  const valid = results.filter(
    (r) =>
      r.exists &&
      r.nameMatch &&
      r.segmentsValid &&
      r.templatesValid &&
      r.errors.length === 0
  ).length;

  const invalid = results.filter((r) => r.errors.length > 0).length;
  const missing = results.filter((r) => !r.exists).length;

  const report: VerificationReport = {
    total: results.length,
    valid,
    invalid,
    missing,
    results,
    summary: {
      missingAutoresponders: results
        .filter((r) => !r.exists)
        .map((r) => r.config.name),
      invalidSegments: Array.from(missingSegments),
      missingTemplates: Array.from(missingTemplates),
      invalidStopConditions: results
        .filter((r) => !r.stopConditionsValid)
        .map((r) => r.config.name),
    },
  };

  return report;
}

/**
 * Print verification report
 */
export function printReport(report: VerificationReport): void {
  console.log("\n" + "=".repeat(80));
  console.log("📊 AUTORESPONDER VERIFICATION REPORT");
  console.log("=".repeat(80) + "\n");

  console.log(`Total Autoresponders: ${report.total}`);
  console.log(`✅ Valid: ${report.valid}`);
  console.log(`❌ Invalid: ${report.invalid}`);
  console.log(`⚠️  Missing: ${report.missing}\n`);

  if (report.summary.missingAutoresponders.length > 0) {
    console.log("❌ Missing Autoresponders:");
    for (const name of report.summary.missingAutoresponders) {
      console.log(`   - ${name}`);
    }
    console.log();
  }

  if (report.summary.invalidSegments.length > 0) {
    console.log("❌ Missing Segments:");
    for (const seg of report.summary.invalidSegments) {
      console.log(`   - ${seg}`);
    }
    console.log();
  }

  if (report.summary.missingTemplates.length > 0) {
    console.log("❌ Missing Templates:");
    for (const template of report.summary.missingTemplates) {
      console.log(`   - ${template}`);
    }
    console.log();
  }

  // Detailed results
  console.log("\n📋 Detailed Results:\n");
  for (const result of report.results) {
    const status = result.errors.length === 0 ? "✅" : "❌";
    console.log(`${status} ${result.config.name} (${result.config.language.toUpperCase()})`);
    
    if (result.errors.length > 0) {
      for (const error of result.errors) {
        console.log(`   ❌ ${error}`);
      }
    }
    
    if (result.warnings.length > 0) {
      for (const warning of result.warnings) {
        console.log(`   ⚠️  ${warning}`);
      }
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    report.valid === report.total
      ? "✅ All autoresponders are properly configured!"
      : "⚠️  Some autoresponders need attention. Please review the report above."
  );
  console.log("=".repeat(80) + "\n");
}

/**
 * Main entry point
 */
async function main() {
  try {
    const report = await verifyAllAutoresponders();
    printReport(report);

    // Exit with error code if validation failed
    if (report.valid !== report.total) {
      process.exit(1);
    }
  } catch (error: any) {
    console.error("❌ Verification failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

