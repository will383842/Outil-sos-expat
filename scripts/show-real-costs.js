/**
 * Script pour voir la décomposition RÉELLE des coûts
 *
 * Ce script montre que le dashboard "GCP Billing" agrège en fait :
 * - Les vrais coûts GCP (Firestore, Functions, Storage)
 * - Les coûts Twilio ESTIMÉS (qui sont facturés SÉPARÉMENT par Twilio)
 *
 * Exécution:
 *   cd sos/firebase/functions
 *   firebase functions:shell
 *   > require('../../../scripts/show-real-costs.js')
 */

const admin = require('firebase-admin');

// Initialize if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function showRealCostBreakdown(dateStr) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📊 DÉCOMPOSITION RÉELLE DES COÛTS - ${dateStr}`);
  console.log(`${'='.repeat(70)}\n`);

  // 1. Get cost_metrics document
  const doc = await db.collection('cost_metrics').doc(dateStr).get();

  if (!doc.exists) {
    console.log(`❌ Pas de données pour ${dateStr}`);
    return;
  }

  const data = doc.data();

  console.log('📋 DONNÉES BRUTES cost_metrics:');
  console.log(JSON.stringify(data, null, 2));

  // 2. Separate GCP vs Twilio costs
  console.log(`\n${'─'.repeat(70)}`);
  console.log('💰 SÉPARATION DES COÛTS PAR FOURNISSEUR:');
  console.log(`${'─'.repeat(70)}\n`);

  // GCP Costs (vraie facture Google)
  const gcpCosts = {
    firestore: data.firestore?.estimatedCost || 0,
    functions: data.functions?.estimatedCost || 0,
    storage: data.storage?.estimatedCost || 0,
    networking: data.networking?.estimatedCost || 0,
  };
  const totalGcp = Object.values(gcpCosts).reduce((a, b) => a + b, 0);

  // Twilio Costs (facture Twilio séparée)
  const twilioCosts = {
    voice: data.twilio?.voice?.estimatedCostEur || 0,
    sms: data.twilio?.sms?.estimatedCostEur || 0,
    total: data.twilio?.total?.estimatedCostEur || 0,
  };

  console.log('┌─────────────────────────────────────────────────────────────────────┐');
  console.log('│                    FACTURE GOOGLE CLOUD (réelle)                    │');
  console.log('├─────────────────────────────────────────────────────────────────────┤');
  console.log(`│  Firestore:        €${gcpCosts.firestore.toFixed(2).padStart(8)}                                  │`);
  console.log(`│  Cloud Functions:  €${gcpCosts.functions.toFixed(2).padStart(8)}                                  │`);
  console.log(`│  Cloud Storage:    €${gcpCosts.storage.toFixed(2).padStart(8)}                                  │`);
  console.log(`│  Networking:       €${gcpCosts.networking.toFixed(2).padStart(8)}                                  │`);
  console.log('├─────────────────────────────────────────────────────────────────────┤');
  console.log(`│  TOTAL GCP:        €${totalGcp.toFixed(2).padStart(8)}   ← Votre vraie facture Google     │`);
  console.log('└─────────────────────────────────────────────────────────────────────┘');

  console.log('');

  console.log('┌─────────────────────────────────────────────────────────────────────┐');
  console.log('│                    FACTURE TWILIO (séparée)                         │');
  console.log('├─────────────────────────────────────────────────────────────────────┤');
  console.log(`│  Voice calls:      €${twilioCosts.voice.toFixed(2).padStart(8)}                                  │`);
  console.log(`│  SMS:              €${twilioCosts.sms.toFixed(2).padStart(8)}                                  │`);
  console.log('├─────────────────────────────────────────────────────────────────────┤');
  console.log(`│  TOTAL TWILIO:     €${twilioCosts.total.toFixed(2).padStart(8)}   ← Facturé par Twilio, PAS GCP │`);
  console.log('└─────────────────────────────────────────────────────────────────────┘');

  console.log('');

  const grandTotal = totalGcp + twilioCosts.total;
  console.log('┌─────────────────────────────────────────────────────────────────────┐');
  console.log('│                    DASHBOARD ADMIN (consolidé)                      │');
  console.log('├─────────────────────────────────────────────────────────────────────┤');
  console.log(`│  GCP:              €${totalGcp.toFixed(2).padStart(8)}                                  │`);
  console.log(`│  + Twilio:         €${twilioCosts.total.toFixed(2).padStart(8)}                                  │`);
  console.log('├─────────────────────────────────────────────────────────────────────┤');
  console.log(`│  TOTAL AFFICHÉ:    €${grandTotal.toFixed(2).padStart(8)}   ← Ce que vous voyez (mélangé!) │`);
  console.log('└─────────────────────────────────────────────────────────────────────┘');

  // 3. Show call session details
  console.log(`\n${'─'.repeat(70)}`);
  console.log('📞 DÉTAILS APPELS (pour vérifier Twilio):');
  console.log(`${'─'.repeat(70)}\n`);

  const startOfDay = new Date(`${dateStr}T00:00:00Z`);
  const endOfDay = new Date(`${dateStr}T23:59:59Z`);

  const sessions = await db.collection('call_sessions')
    .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(startOfDay))
    .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(endOfDay))
    .get();

  console.log(`Sessions trouvées: ${sessions.size}`);

  let realTwilioCost = 0;
  let callsWithCost = 0;

  sessions.docs.forEach(doc => {
    const session = doc.data();
    if (session.costs?.twilio) {
      realTwilioCost += session.costs.twilio;
      callsWithCost++;
    }
  });

  console.log(`Appels avec coût Twilio enregistré: ${callsWithCost}`);
  console.log(`Coût Twilio RÉEL (depuis webhooks): $${realTwilioCost.toFixed(4)}`);
  console.log(`                                   ≈ €${(realTwilioCost * 0.92).toFixed(2)}`);

  console.log(`\n${'='.repeat(70)}`);
  console.log('📌 CONCLUSION:');
  console.log(`${'='.repeat(70)}`);
  console.log(`
  ⚠️  Le dashboard "GCP Billing Costs" de votre application MÉLANGE :
      - Les vrais coûts GCP (facturés par Google)
      - Les coûts Twilio estimés (facturés SÉPARÉMENT par Twilio)

  📍 Pour voir vos VRAIES factures :
      - GCP: https://console.cloud.google.com/billing/
      - Twilio: https://console.twilio.com/us1/billing

  💡 Les €${grandTotal.toFixed(2)} affichés = €${totalGcp.toFixed(2)} (GCP) + €${twilioCosts.total.toFixed(2)} (Twilio)
  `);
}

// Run for multiple dates
async function main() {
  await showRealCostBreakdown('2025-01-13');
  await showRealCostBreakdown('2025-01-15');
  await showRealCostBreakdown('2025-01-16');
  process.exit(0);
}

module.exports = { showRealCostBreakdown, main };

if (require.main === module) {
  main().catch(console.error);
}
