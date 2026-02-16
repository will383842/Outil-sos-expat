import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

/**
 * Configuration Vitest pour les tests E2E
 *
 * - Tests d'intégration avec Firebase Emulators
 * - Tests de paiement avec Stripe Test Mode
 * - Tests de webhooks Twilio
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // Node environment for E2E tests
    include: ['tests/e2e/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 30000, // 30s timeout for E2E tests
    hookTimeout: 30000,
    teardownTimeout: 10000,
    // Désactive le parallélisme pour les tests E2E (Firebase emulators)
    pool: 'forks',
    // Note: poolOptions déplacé vers options de niveau supérieur dans Vitest 4
    poolMatchGlobs: [
      ['tests/e2e/**', { singleFork: true }]
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules',
        '**/*.d.ts',
        'tests/**',
      ]
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
