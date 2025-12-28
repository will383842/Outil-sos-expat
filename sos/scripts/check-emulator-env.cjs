// scripts/check-emulator-env.cjs
const fs = require("fs");
const path = require("path");

const rootDir = process.cwd();
const envDevPath = path.join(rootDir, ".env.development");

// Check if .env.development exists
if (!fs.existsSync(envDevPath)) {
  console.warn("⚠️  Warning: .env.development file not found.");
  console.warn("   Emulators may not work correctly without proper configuration.");
  process.exit(0); // Don't block, just warn
}

// Read and parse .env.development
const envContent = fs.readFileSync(envDevPath, "utf8");
const useEmulatorsMatch = envContent.match(/VITE_USE_EMULATORS\s*=\s*(.+)/);

if (!useEmulatorsMatch) {
  console.warn("⚠️  Warning: VITE_USE_EMULATORS not found in .env.development");
  console.warn("   Frontend will connect to cloud Firebase instead of emulators.");
  console.warn("   Add 'VITE_USE_EMULATORS=true' to .env.development to use emulators.");
  process.exit(0); // Don't block, just warn
}

const useEmulators = useEmulatorsMatch[1].trim().toLowerCase();

if (useEmulators !== "true" && useEmulators !== '"true"' && useEmulators !== "'true'") {
  console.warn("⚠️  Warning: VITE_USE_EMULATORS is not set to 'true' in .env.development");
  console.warn(`   Current value: ${useEmulatorsMatch[1]}`);
  console.warn("   Frontend will connect to cloud Firebase instead of local emulators.");
  console.warn("   Set 'VITE_USE_EMULATORS=true' in .env.development to use emulators.");
  process.exit(0); // Don't block, just warn
}

console.log("✅ VITE_USE_EMULATORS=true detected - Frontend will use local emulators");


