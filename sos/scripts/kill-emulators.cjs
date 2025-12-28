// scripts/kill-emulators.cjs
const { execSync } = require("child_process");

console.log("🔧 Killing all Firebase emulator processes...\n");

try {
  // Kill main emulator process
  execSync(`pkill -9 -f 'firebase.*emulators' 2>/dev/null`, { encoding: "utf8" });
  
  // Kill Java emulator processes
  execSync(`pkill -9 -f 'cloud-storage-rules-runtime' 2>/dev/null`, { encoding: "utf8" });
  execSync(`pkill -9 -f 'firebase-tools-emulator' 2>/dev/null`, { encoding: "utf8" });
  
  // Kill any orphaned firebase function processes
  execSync(`pkill -9 -f 'firebase-functions' 2>/dev/null`, { encoding: "utf8" });
  
  // Wait a moment
  execSync("sleep 1", { encoding: "utf8" });
  
  console.log("✅ Attempted to kill all Firebase emulator processes");
  console.log("   Check ports with: node scripts/check-emulator-ports.cjs\n");
} catch (error) {
  console.log("⚠️  Some processes may not have been killed");
  console.log("   Try manually: pkill -9 -f 'firebase.*emulators'\n");
}











