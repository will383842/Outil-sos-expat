/**
 * Script d'initialisation des plans d'abonnement dans Firestore
 * Usage: node scripts/init-subscription-plans.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin with service account
const serviceAccountPath = path.join(__dirname, '..', '..', 'sos-urgently-ac307-firebase-adminsdk.json');

try {
  const serviceAccount = require(serviceAccountPath);

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
  }
} catch (error) {
  console.error('❌ Service account not found at:', serviceAccountPath);
  console.log('Trying with application default credentials...');

  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: 'sos-urgently-ac307'
    });
  }
}

const db = admin.firestore();

// Plans configuration
const LAWYER_PLANS = [
  {
    tier: 'basic',
    pricing: { EUR: 24, USD: 29 },
    aiCallsLimit: 5,
    sortOrder: 1,
    name: { fr: 'Basique', en: 'Basic' },
    description: { fr: '5 appels IA par mois', en: '5 AI calls per month' }
  },
  {
    tier: 'standard',
    pricing: { EUR: 49, USD: 59 },
    aiCallsLimit: 15,
    sortOrder: 2,
    name: { fr: 'Standard', en: 'Standard' },
    description: { fr: '15 appels IA par mois', en: '15 AI calls per month' }
  },
  {
    tier: 'pro',
    pricing: { EUR: 79, USD: 89 },
    aiCallsLimit: 30,
    sortOrder: 3,
    name: { fr: 'Professionnel', en: 'Professional' },
    description: { fr: '30 appels IA par mois', en: '30 AI calls per month' }
  },
  {
    tier: 'unlimited',
    pricing: { EUR: 129, USD: 149 },
    aiCallsLimit: -1,
    sortOrder: 4,
    name: { fr: 'Illimité', en: 'Unlimited' },
    description: { fr: 'Appels illimités', en: 'Unlimited calls' }
  }
];

const EXPAT_PLANS = [
  {
    tier: 'basic',
    pricing: { EUR: 9, USD: 9 },
    aiCallsLimit: 5,
    sortOrder: 1,
    name: { fr: 'Basique', en: 'Basic' },
    description: { fr: '5 appels IA par mois', en: '5 AI calls per month' }
  },
  {
    tier: 'standard',
    pricing: { EUR: 19, USD: 24 },
    aiCallsLimit: 15,
    sortOrder: 2,
    name: { fr: 'Standard', en: 'Standard' },
    description: { fr: '15 appels IA par mois', en: '15 AI calls per month' }
  },
  {
    tier: 'pro',
    pricing: { EUR: 29, USD: 34 },
    aiCallsLimit: 30,
    sortOrder: 3,
    name: { fr: 'Professionnel', en: 'Professional' },
    description: { fr: '30 appels IA par mois', en: '30 AI calls per month' }
  },
  {
    tier: 'unlimited',
    pricing: { EUR: 49, USD: 59 },
    aiCallsLimit: -1,
    sortOrder: 4,
    name: { fr: 'Illimité', en: 'Unlimited' },
    description: { fr: 'Appels illimités', en: 'Unlimited calls' }
  }
];

// Helper to calculate annual price with 20% discount
function calculateAnnualPrice(monthlyPrice, discountPercent = 20) {
  const yearlyTotal = monthlyPrice * 12;
  const discount = yearlyTotal * (discountPercent / 100);
  return Math.round((yearlyTotal - discount) * 100) / 100;
}

async function initializePlans() {
  console.log('🚀 Initializing subscription plans...\n');

  const batch = db.batch();
  const now = admin.firestore.Timestamp.now();

  // Create lawyer plans
  console.log('📋 Creating Lawyer plans...');
  for (const plan of LAWYER_PLANS) {
    const planId = `lawyer_${plan.tier}`;
    const annualPricingEUR = calculateAnnualPrice(plan.pricing.EUR);
    const annualPricingUSD = calculateAnnualPrice(plan.pricing.USD);

    const planData = {
      providerType: 'lawyer',
      tier: plan.tier,
      pricing: plan.pricing,
      annualPricing: { EUR: annualPricingEUR, USD: annualPricingUSD },
      annualDiscountPercent: 20,
      aiCallsLimit: plan.aiCallsLimit,
      sortOrder: plan.sortOrder,
      stripePriceId: { EUR: '', USD: '' },
      stripePriceIdAnnual: { EUR: '', USD: '' },
      isActive: true,
      name: plan.name,
      description: plan.description,
      createdAt: now,
      updatedAt: now
    };

    batch.set(db.doc(`subscription_plans/${planId}`), planData);
    console.log(`  ✅ ${planId}: ${plan.pricing.EUR}€/mois (${annualPricingEUR}€/an)`);
  }

  // Create expat plans
  console.log('\n📋 Creating Expat Aidant plans...');
  for (const plan of EXPAT_PLANS) {
    const planId = `expat_aidant_${plan.tier}`;
    const annualPricingEUR = calculateAnnualPrice(plan.pricing.EUR);
    const annualPricingUSD = calculateAnnualPrice(plan.pricing.USD);

    const planData = {
      providerType: 'expat_aidant',
      tier: plan.tier,
      pricing: plan.pricing,
      annualPricing: { EUR: annualPricingEUR, USD: annualPricingUSD },
      annualDiscountPercent: 20,
      aiCallsLimit: plan.aiCallsLimit,
      sortOrder: plan.sortOrder,
      stripePriceId: { EUR: '', USD: '' },
      stripePriceIdAnnual: { EUR: '', USD: '' },
      isActive: true,
      name: plan.name,
      description: plan.description,
      createdAt: now,
      updatedAt: now
    };

    batch.set(db.doc(`subscription_plans/${planId}`), planData);
    console.log(`  ✅ ${planId}: ${plan.pricing.EUR}€/mois (${annualPricingEUR}€/an)`);
  }

  // Initialize trial config
  console.log('\n⚙️ Initializing trial configuration...');
  batch.set(db.doc('settings/subscription'), {
    trial: {
      durationDays: 30,
      maxAiCalls: 3,
      isEnabled: true,
      updatedAt: now
    },
    annualDiscountPercent: 20,
    updatedAt: now
  }, { merge: true });
  console.log('  ✅ Trial: 30 jours, 3 appels gratuits');

  // Commit batch
  await batch.commit();

  console.log('\n✨ All subscription plans initialized successfully!');
  console.log('\n📝 Next steps:');
  console.log('  1. Go to Admin > IA page');
  console.log('  2. Click "Créer prix mensuels Stripe" to create Stripe prices');
  console.log('  3. Click "Créer prix annuels Stripe" to create annual prices');
}

// Run the script
initializePlans()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
