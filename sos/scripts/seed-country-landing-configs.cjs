/**
 * Seed country_landing_configs collection with presets for priority countries.
 *
 * Usage:
 *   node scripts/seed-country-landing-configs.cjs
 *
 * Requires: GOOGLE_APPLICATION_CREDENTIALS env var pointing to service account key,
 * or run from a machine with default credentials for the sos-urgently-ac307 project.
 */

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");

// Init Firebase Admin
const app = initializeApp({
  projectId: "sos-urgently-ac307",
});
const db = getFirestore(app);

// Region presets
const REGIONS = {
  west_africa: {
    countries: ["SN", "CI", "ML", "BF", "CM"],
    currency: { code: "XOF", symbol: "FCFA", exchangeRate: 600, displayLocale: "fr-SN" },
    paymentMethods: [
      { name: "Orange Money", emoji: "\uD83D\uDFE0", priority: 1 },
      { name: "Wave", emoji: "\uD83C\uDF0A", priority: 2 },
      { name: "MTN MoMo", emoji: "\uD83D\uDC9B", priority: 3 },
      { name: "Free Money", emoji: "\uD83D\uDCF1", priority: 4 },
      { name: "Wise", emoji: "\uD83C\uDF10", priority: 5 },
    ],
  },
  east_africa: {
    countries: ["KE", "TZ", "UG"],
    currency: { code: "KES", symbol: "KSh", exchangeRate: 150, displayLocale: "en-KE" },
    paymentMethods: [
      { name: "M-Pesa", emoji: "\uD83D\uDC9A", priority: 1 },
      { name: "MTN MoMo", emoji: "\uD83D\uDC9B", priority: 2 },
      { name: "Airtel Money", emoji: "\uD83D\uDCF1", priority: 3 },
      { name: "Wise", emoji: "\uD83C\uDF10", priority: 4 },
    ],
  },
  north_africa: {
    countries: ["MA", "DZ", "TN"],
    currency: { code: "MAD", symbol: "MAD", exchangeRate: 10, displayLocale: "fr-MA" },
    paymentMethods: [
      { name: "Wise", emoji: "\uD83C\uDF10", priority: 1 },
    ],
  },
  europe: {
    countries: ["FR", "DE", "ES", "BE"],
    currency: { code: "EUR", symbol: "\u20AC", exchangeRate: 0.92, displayLocale: "fr-FR" },
    paymentMethods: [
      { name: "Wise", emoji: "\uD83C\uDF10", priority: 1 },
    ],
  },
  north_america: {
    countries: ["US", "CA"],
    currency: { code: "USD", symbol: "$", exchangeRate: 1, displayLocale: "en-US" },
    paymentMethods: [
      { name: "Wise", emoji: "\uD83C\uDF10", priority: 1 },
    ],
  },
};

const ROLES = ["chatter", "influencer", "blogger", "groupadmin"];

// Default testimonials
const DEFAULT_TESTIMONIALS = [
  { name: "Marie L.", earningsDisplay: "5 300$", earningsUSD: 5300, rank: 1 },
  { name: "Fatou S.", earningsDisplay: "3 850$", earningsUSD: 3850, rank: 2 },
  { name: "Kwame O.", earningsDisplay: "2 940$", earningsUSD: 2940, rank: 3 },
];

function formatAmount(amount, currency) {
  try {
    return (
      new Intl.NumberFormat(currency.displayLocale, {
        style: "decimal",
        maximumFractionDigits: 0,
      }).format(Math.round(amount)) +
      " " +
      currency.symbol
    );
  } catch {
    return `${Math.round(amount).toLocaleString()} ${currency.symbol}`;
  }
}

function buildTestimonials(currency) {
  if (currency.exchangeRate === 1) return DEFAULT_TESTIMONIALS;
  return DEFAULT_TESTIMONIALS.map((t) => ({
    ...t,
    earningsDisplay: `${formatAmount(t.earningsUSD * currency.exchangeRate, currency)} (${t.earningsUSD}$)`,
  }));
}

async function seed() {
  console.log("Seeding country_landing_configs...\n");

  const batch = db.batch();
  let count = 0;

  for (const [regionName, region] of Object.entries(REGIONS)) {
    for (const countryCode of region.countries) {
      for (const role of ROLES) {
        // Determine lang based on region
        const lang = ["west_africa", "north_africa", "europe"].includes(regionName) ? "fr" : "en";
        const docId = `${role}_${countryCode}_${lang}`;
        const ref = db.collection("country_landing_configs").doc(docId);

        const data = {
          role,
          countryCode,
          lang,
          status: "draft",
          notes: `Auto-seeded from ${regionName} preset`,
          paymentMethods: region.paymentMethods,
          currency: region.currency,
          testimonials: buildTestimonials(region.currency),
          seoOverrides: {},
          isActive: false,
          lastUpdatedAt: Timestamp.now(),
          updatedBy: "seed-script",
        };

        batch.set(ref, data, { merge: true });
        count++;
        console.log(`  + ${docId}`);
      }
    }
  }

  await batch.commit();
  console.log(`\nDone! Seeded ${count} configs across ${Object.keys(REGIONS).length} regions.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
