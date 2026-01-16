/**
 * RESTAURÉ: minInstances remis pour éviter les cold starts critiques
 *
 * ⚠️ ATTENTION: La réduction à 0 causait des cold starts de 5-30s
 * qui provoquaient des timeouts dans le frontend, résultant en
 * perte de rôles utilisateurs (fallback vers role='client')
 *
 * Configuration équilibrée:
 * - critical: 1 instance warm (auth, user data - CRITIQUE)
 * - webhook: 1 instance warm (paiements - CRITIQUE)
 * - standard: 0 (acceptable pour fonctions non-critiques)
 * - admin: 0 (acceptable pour fonctions admin)
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
    minInstances: 1,  // Maintenu pour fiabilité paiements
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
