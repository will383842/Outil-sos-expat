/**
 * Production function configurations
 *
 * 2026-02-13: Toutes les configs réduites à minInstances: 0 pour optimisation coûts.
 * - critical: 0 (cold start acceptable, frontend gère le retry)
 * - webhook: 0 (Stripe retente automatiquement 7x, cold start acceptable)
 * - standard: 0 (fonctions non-critiques)
 * - admin: 0 (fonctions admin)
 */
export const productionConfigs = {
  critical: {
    region: "europe-west1",
    memory: "1GiB",
    cpu: 2.0,
    maxInstances: 20,
    minInstances: 0,  // 2025-01-16: Réduit à 0 pour économies (~€45/mois). Cold starts acceptables.
    concurrency: 10
  },
  webhook: {
    region: "europe-west1",
    memory: "512MiB",
    cpu: 1.0,
    maxInstances: 15,
    minInstances: 0,  // Réduit de 1 à 0 - Stripe retente automatiquement (7x), cold start acceptable pour webhooks
    concurrency: 15
  },
  standard: {
    region: "europe-west1",
    memory: "256MiB",
    cpu: 0.5,
    maxInstances: 8,
    minInstances: 0,  // OK: fonctions non-critiques
    concurrency: 5
  },
  admin: {
    region: "europe-west1",
    memory: "256MiB",
    cpu: 0.25,
    maxInstances: 3,
    minInstances: 0,  // OK: fonctions admin
    concurrency: 1
  }
};
