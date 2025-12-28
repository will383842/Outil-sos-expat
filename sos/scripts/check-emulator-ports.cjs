// scripts/check-emulator-ports.cjs
// Cross-platform port checker (Windows/Linux/Mac)
const { execSync } = require("child_process");
const os = require("os");

// Ports used by Firebase emulators (from firebase.json)
const EMULATOR_PORTS = {
  ui: 4002,
  hub: 4402,
  functions: 5001,
  firestore: 8080,
  auth: 9099,
  storage: 9199,
  logging: 4502,
};

const isWindows = os.platform() === "win32";

function checkPort(port) {
  try {
    if (isWindows) {
      // Windows: use netstat
      const result = execSync(`netstat -ano | findstr ":${port}" | findstr "LISTENING"`, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      return result.trim().length > 0;
    } else {
      // Linux/Mac: use lsof
      const result = execSync(`lsof -i :${port} 2>/dev/null || echo ""`, { encoding: "utf8" });
      return result.trim().length > 0;
    }
  } catch (error) {
    // If command fails, port is likely free
    return false;
  }
}

function findProcessOnPort(port) {
  try {
    if (isWindows) {
      // Windows: parse netstat output to get PID
      const result = execSync(`netstat -ano | findstr ":${port}" | findstr "LISTENING"`, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      if (result.trim()) {
        const lines = result.trim().split("\n");
        return lines.map((line) => {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          return { command: "process", pid };
        });
      }
      return [];
    } else {
      // Linux/Mac: use lsof
      const result = execSync(`lsof -i :${port} 2>/dev/null | grep LISTEN | grep -v COMMAND || echo ""`, {
        encoding: "utf8",
      });
      if (result.trim()) {
        const lines = result.trim().split("\n");
        return lines.map((line) => {
          const parts = line.split(/\s+/);
          return { command: parts[0], pid: parts[1] };
        });
      }
      return [];
    }
  } catch (error) {
    return [];
  }
}

function killProcess(pid) {
  try {
    if (isWindows) {
      execSync(`taskkill /F /PID ${pid}`, { stdio: "pipe" });
    } else {
      execSync(`kill -9 ${pid}`, { stdio: "pipe" });
    }
    return true;
  } catch (error) {
    return false;
  }
}

// Check all emulator ports
const occupiedPorts = [];
for (const [name, port] of Object.entries(EMULATOR_PORTS)) {
  if (checkPort(port)) {
    const processes = findProcessOnPort(port);
    occupiedPorts.push({ name, port, processes });
  }
}

if (occupiedPorts.length > 0) {
  console.error("\n❌ Error: Firebase emulator ports are already in use:\n");
  occupiedPorts.forEach(({ name, port, processes }) => {
    console.error(`   Port ${port} (${name}):`);
    processes.forEach((proc) => {
      console.error(`     - ${proc.command} (PID: ${proc.pid})`);
    });
  });

  // Collect all PIDs
  const allPids = new Set();
  occupiedPorts.forEach(({ processes }) => {
    processes.forEach((proc) => {
      if (proc.pid) {
        allPids.add(proc.pid);
      }
    });
  });

  if (allPids.size > 0) {
    const pidList = Array.from(allPids).join(", ");
    console.error("\n💡 To fix this, stop the existing processes:");
    console.error(`     npm run kill-emulators`);
    if (isWindows) {
      console.error(`     # or manually: taskkill /F /PID <pid>`);
    } else {
      console.error(`     # or manually: kill ${pidList}`);
    }

    // Check if user wants auto-kill
    if (process.env.AUTO_KILL_EMULATORS === "true") {
      console.log("\n🔧 Auto-killing processes on emulator ports...");
      let killed = 0;
      allPids.forEach((pid) => {
        if (killProcess(pid)) {
          console.log(`   Killed PID ${pid}`);
          killed++;
        }
      });

      if (killed > 0) {
        console.log(`✅ Killed ${killed} process(es). Waiting for ports to be released...`);
        // Wait a moment for ports to be released
        const start = Date.now();
        while (Date.now() - start < 2000) {
          // Busy wait
        }

        // Re-check ports
        let stillOccupied = 0;
        for (const [name, port] of Object.entries(EMULATOR_PORTS)) {
          if (checkPort(port)) {
            stillOccupied++;
          }
        }

        if (stillOccupied === 0) {
          console.log("✅ All Firebase emulator ports are now available\n");
          process.exit(0);
        }
      }
    }
  }
  process.exit(1);
}

console.log("✅ All emulator ports are available");
process.exit(0);
