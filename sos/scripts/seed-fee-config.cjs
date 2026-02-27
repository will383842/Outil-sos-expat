/**
 * Seed admin_config/fees with default processing fee rates.
 *
 * Usage:
 *   node scripts/seed-fee-config.cjs
 *
 * Requires: GOOGLE_APPLICATION_CREDENTIALS env var pointing to service account key,
 * or run from a machine with default credentials for the sos-urgently-ac307 project.
 */

const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const app = initializeApp({ projectId: "sos-urgently-ac307" });
const db = getFirestore(app);

const FEE_CONFIG = {
  stripe: {
    eur: { percentageFee: 0.029, fixedFee: 0.25, fxFeePercent: 0.01 },
    usd: { percentageFee: 0.029, fixedFee: 0.30, fxFeePercent: 0.01 },
  },
  paypal: {
    eur: { percentageFee: 0.029, fixedFee: 0.35, fxFeePercent: 0.03 },
    usd: { percentageFee: 0.029, fixedFee: 0.49, fxFeePercent: 0.03 },
    payoutFee: { percentageFee: 0.02, fixedFee: 0, maxFee: 20 },
  },
  withdrawalFees: { fixedFee: 3, currency: "USD" },
  createdAt: FieldValue.serverTimestamp(),
  updatedAt: FieldValue.serverTimestamp(),
  updatedBy: "seed-script",
};

async function main() {
  const ref = db.doc("admin_config/fees");
  const existing = await ref.get();

  if (existing.exists) {
    console.log("admin_config/fees already exists — skipping (delete manually to re-seed)");
    console.log("Current data:", JSON.stringify(existing.data(), null, 2));
  } else {
    await ref.set(FEE_CONFIG);
    console.log("admin_config/fees created with default fee rates");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
