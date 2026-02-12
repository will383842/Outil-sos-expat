import { defineConfig } from "vitest/config";
import { resolve } from "path";

const srcDir = resolve(__dirname, "src");
const mocksDir = resolve(__dirname, "src/__tests__/__mocks__");

export default defineConfig({
  resolve: {
    alias: [
      // Redirect production modules to test mocks.
      // Using absolute paths so the aliases work regardless of which file
      // performs the import.
      { find: /.*\/config\/database\.js$/, replacement: resolve(mocksDir, "database.ts") },
      { find: /.*\/config\/redis\.js$/, replacement: resolve(mocksDir, "redis.ts") },
      { find: /.*\/jobs\/queue\.js$/, replacement: resolve(mocksDir, "queue.ts") },
      { find: /.*\/services\/telegram\.js$/, replacement: resolve(mocksDir, "telegram.ts") },
      { find: /.*\/utils\/logger\.js$/, replacement: resolve(mocksDir, "logger.ts") },
      { find: /.*\/middleware\/auth\.js$/, replacement: resolve(mocksDir, "auth.ts") },
    ],
  },
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/__tests__/**/*.test.ts"],
    testTimeout: 10_000,
  },
});
