/**
 * Phase 0 — Master Audit Script
 *
 * Runs all 4 snapshot scripts sequentially and generates a summary file.
 * This is the entry point for the Phase 0 audit.
 *
 * Usage: node scripts/audit/runFullAudit.js
 *
 * Prerequisites:
 *   - Firebase CLI logged in (firebase login)
 *   - OR Application Default Credentials configured
 *   - Run from: sos/firebase/functions/
 *
 * Output: scripts/audit/snapshots/ directory with all JSON files
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const SCRIPTS = [
  { name: "Commissions", file: "snapshotCommissions.js" },
  { name: "Affiliate Codes", file: "snapshotAffiliateCodes.js" },
  { name: "Referrals", file: "snapshotReferrals.js" },
  { name: "Clicks & Recruitments", file: "snapshotClicksAndRecruitments.js" },
  { name: "Discount Config", file: "snapshotDiscountConfig.js" },
];

function runScript(scriptFile, scriptName) {
  const scriptPath = path.join(__dirname, scriptFile);
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  Running: ${scriptName} (${scriptFile})`);
  console.log("=".repeat(60));

  try {
    execSync(`node "${scriptPath}"`, {
      stdio: "inherit",
      cwd: path.join(__dirname, "../.."),
      timeout: 300000, // 5 min max per script
    });
    return { name: scriptName, status: "success" };
  } catch (err) {
    console.error(`\n  ❌ FAILED: ${scriptName}`);
    console.error(`  Error: ${err.message}`);
    return { name: scriptName, status: "failed", error: err.message };
  }
}

function generateSummary(results) {
  const snapshotsDir = path.join(__dirname, "snapshots");
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  // Read each snapshot file and extract key numbers
  const summaryData = {
    auditDate: new Date().toISOString(),
    scriptResults: results,
    snapshots: {},
  };

  const snapshotFiles = fs.readdirSync(snapshotsDir).filter((f) => f.includes(dateStr));

  for (const file of snapshotFiles) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(snapshotsDir, file), "utf-8"));
      summaryData.snapshots[file] = data.summary || data.globalTotals || { note: "see full file" };
    } catch {
      summaryData.snapshots[file] = { error: "Could not parse" };
    }
  }

  const summaryPath = path.join(snapshotsDir, `snapshot_summary_${dateStr}.json`);
  fs.writeFileSync(summaryPath, JSON.stringify(summaryData, null, 2), "utf-8");

  return summaryPath;
}

async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  PHASE 0 — Full Affiliate System Audit                 ║");
  console.log("║  SOS-Expat Unified Affiliation Plan                    ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`\n  Date: ${new Date().toISOString()}`);
  console.log(`  Project: sos-urgently-ac307\n`);

  const startTime = Date.now();
  const results = [];

  for (const script of SCRIPTS) {
    const result = runScript(script.file, script.name);
    results.push(result);
  }

  // Generate summary
  console.log(`\n${"=".repeat(60)}`);
  console.log("  Generating summary...");
  console.log("=".repeat(60));

  const summaryPath = generateSummary(results);

  // Final report
  const passed = results.filter((r) => r.status === "success").length;
  const failed = results.filter((r) => r.status === "failed").length;
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n╔══════════════════════════════════════════════════════════╗`);
  console.log(`║  AUDIT COMPLETE                                        ║`);
  console.log(`╠══════════════════════════════════════════════════════════╣`);
  console.log(`║  Scripts: ${passed}/${SCRIPTS.length} passed${failed > 0 ? `, ${failed} FAILED` : ""}`.padEnd(57) + "║");
  console.log(`║  Duration: ${totalTime}s`.padEnd(57) + "║");
  console.log(`║  Summary: ${summaryPath}`.padEnd(57) + "║");
  console.log(`╚══════════════════════════════════════════════════════════╝`);

  if (failed > 0) {
    console.log("\n  ⚠️  Some scripts failed — check output above for details.");
    process.exit(1);
  }

  console.log("\n  ✅ All snapshots exported. Review the JSON files before proceeding to Phase 1.");
  console.log("  📁 Location: scripts/audit/snapshots/\n");
}

main();
