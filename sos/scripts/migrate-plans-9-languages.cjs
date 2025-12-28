/**
 * Script to migrate subscription plans to 9 languages
 * Run this script once after deploying the Cloud Functions
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin with default credentials
admin.initializeApp({
  projectId: 'sos-urgently-ac307'
});

const db = admin.firestore();

// Plan names in all 9 languages
const planNames = {
  basic: {
    fr: 'Basic', en: 'Basic', es: 'Básico', de: 'Basis',
    pt: 'Básico', ru: 'Базовый', hi: 'बेसिक', ar: 'أساسي', ch: '基础'
  },
  standard: {
    fr: 'Standard', en: 'Standard', es: 'Estándar', de: 'Standard',
    pt: 'Padrão', ru: 'Стандартный', hi: 'स्टैंडर्ड', ar: 'قياسي', ch: '标准'
  },
  pro: {
    fr: 'Pro', en: 'Pro', es: 'Pro', de: 'Pro',
    pt: 'Pro', ru: 'Про', hi: 'प्रो', ar: 'احترافي', ch: '专业'
  },
  unlimited: {
    fr: 'Illimité', en: 'Unlimited', es: 'Ilimitado', de: 'Unbegrenzt',
    pt: 'Ilimitado', ru: 'Безлимитный', hi: 'असीमित', ar: 'غير محدود', ch: '无限'
  }
};

// Description templates
const getDescription = (aiCallsLimit) => {
  const isUnlimited = aiCallsLimit === -1;
  return {
    fr: isUnlimited ? 'Appels illimités par mois' : `${aiCallsLimit} appels par mois`,
    en: isUnlimited ? 'Unlimited calls per month' : `${aiCallsLimit} calls per month`,
    es: isUnlimited ? 'Llamadas ilimitadas por mes' : `${aiCallsLimit} llamadas por mes`,
    de: isUnlimited ? 'Unbegrenzte Anrufe pro Monat' : `${aiCallsLimit} Anrufe pro Monat`,
    pt: isUnlimited ? 'Chamadas ilimitadas por mês' : `${aiCallsLimit} chamadas por mês`,
    ru: isUnlimited ? 'Безлимитные звонки в месяц' : `${aiCallsLimit} звонков в месяц`,
    hi: isUnlimited ? 'प्रति माह असीमित कॉल' : `प्रति माह ${aiCallsLimit} कॉल`,
    ar: isUnlimited ? 'مكالمات غير محدودة شهريًا' : `${aiCallsLimit} مكالمات شهريًا`,
    ch: isUnlimited ? '每月无限通话' : `每月 ${aiCallsLimit} 次通话`
  };
};

async function migratePlans() {
  console.log('Starting migration of subscription plans to 9 languages...');

  try {
    const plansRef = db.collection('subscription_plans');
    const snapshot = await plansRef.get();

    if (snapshot.empty) {
      console.log('No plans found to migrate');
      return;
    }

    let migratedCount = 0;

    for (const doc of snapshot.docs) {
      const plan = doc.data();
      const tier = plan.tier;

      // Check if plan needs migration (has old name format)
      if (typeof plan.name === 'object' && plan.name.ar) {
        console.log(`Plan ${doc.id} (${tier}) already has 9 languages, skipping...`);
        continue;
      }

      // Get the 9-language names
      const newName = planNames[tier] || {
        fr: plan.name?.fr || tier,
        en: plan.name?.en || tier,
        es: plan.name?.es || tier,
        de: plan.name?.de || tier,
        pt: plan.name?.pt || tier,
        ru: plan.name?.ru || tier,
        hi: plan.name?.hi || tier,
        ar: plan.name?.ar || tier,
        ch: plan.name?.ch || tier
      };

      // Get the 9-language descriptions
      const newDescription = getDescription(plan.aiCallsLimit || 5);

      // Update the plan
      await plansRef.doc(doc.id).update({
        name: newName,
        description: newDescription,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`✓ Migrated plan: ${doc.id} (${tier})`);
      migratedCount++;
    }

    console.log(`\nMigration complete! ${migratedCount} plans updated.`);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }

  process.exit(0);
}

migratePlans();
