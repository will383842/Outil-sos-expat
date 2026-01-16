/**
 * Script d'analyse des coûts GCP pour le 13 janvier et hier
 *
 * Exécuter avec: npx ts-node scripts/analyze-billing-jan13.ts
 * Ou depuis Firebase Functions: firebase functions:shell puis analyzeJan13Costs()
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin (si pas déjà fait)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

interface CostMetricData {
  date?: string;
  period?: string;
  twilio?: {
    sms?: { hourlyCount: number; dailyCount: number; estimatedCostEur: number };
    voice?: { hourlyCount: number; dailyCount: number; estimatedCostEur: number };
    total?: { estimatedCostEur: number };
  };
  firestore?: {
    reads: number;
    writes: number;
    estimatedCost: number;
  };
  functions?: {
    invocations: number;
    computeTimeMs: number;
    estimatedCost: number;
  };
  updatedAt?: admin.firestore.Timestamp;
}

interface CallSessionCosts {
  twilio?: number;
  twilioUnit?: string;
  gcp?: number;
  total?: number;
  isReal?: boolean;
}

async function analyzeBillingForDate(dateStr: string): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 ANALYSE DES COÛTS POUR LE ${dateStr}`);
  console.log(`${'='.repeat(60)}\n`);

  // 1. Récupérer cost_metrics pour cette date
  console.log('1️⃣ Récupération des cost_metrics...');
  const costMetricsDoc = await db.collection('cost_metrics').doc(dateStr).get();

  if (costMetricsDoc.exists) {
    const data = costMetricsDoc.data() as CostMetricData;
    console.log('\n📈 COST METRICS:');
    console.log(JSON.stringify(data, null, 2));

    if (data?.twilio?.total) {
      console.log(`\n💰 Twilio Total: €${data.twilio.total.estimatedCostEur?.toFixed(2) || 'N/A'}`);
    }
    if (data?.twilio?.voice) {
      console.log(`   - Voice calls: ${data.twilio.voice.dailyCount || 0} appels`);
    }
    if (data?.twilio?.sms) {
      console.log(`   - SMS: ${data.twilio.sms.dailyCount || 0} messages`);
    }
  } else {
    console.log('⚠️ Aucune donnée cost_metrics trouvée pour cette date');
  }

  // 2. Compter les call_sessions de ce jour
  console.log('\n2️⃣ Analyse des call_sessions...');
  const startOfDay = new Date(`${dateStr}T00:00:00Z`);
  const endOfDay = new Date(`${dateStr}T23:59:59Z`);

  const callSessionsSnapshot = await db.collection('call_sessions')
    .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(startOfDay))
    .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(endOfDay))
    .get();

  console.log(`\n📞 CALL SESSIONS: ${callSessionsSnapshot.size} sessions trouvées`);

  let totalTwilioCost = 0;
  let totalGcpCost = 0;
  let statusCounts: Record<string, number> = {};
  let amdStatusCounts: Record<string, number> = {};
  let retryCount = 0;

  callSessionsSnapshot.docs.forEach(doc => {
    const data = doc.data();
    const costs = data.costs as CallSessionCosts | undefined;

    if (costs?.twilio) {
      totalTwilioCost += costs.twilio;
    }
    if (costs?.gcp) {
      totalGcpCost += costs.gcp;
    }

    // Count statuses
    const status = data.status || 'unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;

    // Count AMD statuses (si disponible)
    if (data.clientAmdStatus) {
      amdStatusCounts[data.clientAmdStatus] = (amdStatusCounts[data.clientAmdStatus] || 0) + 1;
    }
    if (data.providerAmdStatus) {
      amdStatusCounts[data.providerAmdStatus] = (amdStatusCounts[data.providerAmdStatus] || 0) + 1;
    }

    // Count retries
    if (data.retryCount && data.retryCount > 0) {
      retryCount += data.retryCount;
    }
  });

  console.log(`\n💵 COÛTS TWILIO (depuis call_sessions): $${totalTwilioCost.toFixed(4)}`);
  console.log(`💵 COÛTS GCP (depuis call_sessions): €${totalGcpCost.toFixed(4)}`);
  console.log(`\n📊 Statuts des sessions:`);
  Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).forEach(([status, count]) => {
    console.log(`   - ${status}: ${count}`);
  });

  if (Object.keys(amdStatusCounts).length > 0) {
    console.log(`\n🤖 Statuts AMD:`);
    Object.entries(amdStatusCounts).sort((a, b) => b[1] - a[1]).forEach(([status, count]) => {
      console.log(`   - ${status}: ${count}`);
    });
  }

  if (retryCount > 0) {
    console.log(`\n🔄 RETRIES: ${retryCount} tentatives supplémentaires`);
    console.log(`   ⚠️ Coût potentiel des retries: ~€${(retryCount * 0.065).toFixed(2)}`);
  }

  // 3. Vérifier les system_logs pour les erreurs
  console.log('\n3️⃣ Analyse des system_logs (erreurs)...');
  const systemLogsSnapshot = await db.collection('system_logs')
    .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(startOfDay))
    .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(endOfDay))
    .where('level', '==', 'error')
    .limit(100)
    .get();

  console.log(`\n🚨 ERREURS: ${systemLogsSnapshot.size} erreurs trouvées`);

  const errorTypes: Record<string, number> = {};
  systemLogsSnapshot.docs.forEach(doc => {
    const data = doc.data();
    const errorType = data.type || data.message?.substring(0, 50) || 'unknown';
    errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
  });

  if (Object.keys(errorTypes).length > 0) {
    console.log('Types d\'erreurs:');
    Object.entries(errorTypes).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([type, count]) => {
      console.log(`   - ${type}: ${count}`);
    });
  }

  // 4. Vérifier les ai_call_logs pour les coûts AI
  console.log('\n4️⃣ Analyse des ai_call_logs...');
  const aiLogsSnapshot = await db.collection('ai_call_logs')
    .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(startOfDay))
    .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(endOfDay))
    .get();

  console.log(`\n🤖 AI CALLS: ${aiLogsSnapshot.size} appels AI`);

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  const providerCounts: Record<string, number> = {};

  aiLogsSnapshot.docs.forEach(doc => {
    const data = doc.data();
    totalInputTokens += data.inputTokens || 0;
    totalOutputTokens += data.outputTokens || 0;
    const provider = data.provider || 'unknown';
    providerCounts[provider] = (providerCounts[provider] || 0) + 1;
  });

  if (aiLogsSnapshot.size > 0) {
    console.log(`   - Tokens input: ${totalInputTokens.toLocaleString()}`);
    console.log(`   - Tokens output: ${totalOutputTokens.toLocaleString()}`);
    console.log(`   - Providers:`);
    Object.entries(providerCounts).forEach(([provider, count]) => {
      console.log(`     - ${provider}: ${count} appels`);
    });

    // Estimation coût AI
    const claudeCost = (totalInputTokens / 1000000) * 3 + (totalOutputTokens / 1000000) * 15;
    console.log(`\n   💰 Coût AI estimé (Claude pricing): $${claudeCost.toFixed(2)}`);
  }

  // 5. Résumé
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📋 RÉSUMÉ POUR LE ${dateStr}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`
  Sessions d'appels: ${callSessionsSnapshot.size}
  Retries détectés: ${retryCount}
  Erreurs système: ${systemLogsSnapshot.size}
  Appels AI: ${aiLogsSnapshot.size}

  COÛTS ESTIMÉS:
  - Twilio (calls): $${totalTwilioCost.toFixed(2)} (~€${(totalTwilioCost * 0.92).toFixed(2)})
  - GCP overhead: €${totalGcpCost.toFixed(2)}
  - AI: ~$${((totalInputTokens / 1000000) * 3 + (totalOutputTokens / 1000000) * 15).toFixed(2)}
  `);
}

async function main() {
  console.log('🚀 Démarrage de l\'analyse de facturation...\n');

  // Analyser le 13 janvier 2025
  await analyzeBillingForDate('2025-01-13');

  // Analyser hier (15 janvier 2025)
  await analyzeBillingForDate('2025-01-15');

  // Analyser aujourd'hui (16 janvier 2025)
  await analyzeBillingForDate('2025-01-16');

  // Comparaison
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 COMPARAISON DES JOURNÉES');
  console.log(`${'='.repeat(60)}`);
  console.log(`
  Le 13 janvier avait probablement un pic dû au bug AMD "unknown"
  qui causait des retry loops. Ce bug a été corrigé le 15 janvier
  (commits e2e3897 et 3576f51).

  Vérifiez:
  1. Le nombre de retries le 13 vs le 15
  2. Les statuts AMD "unknown" le 13
  3. Le ratio appels/sessions (devrait être proche de 1:1 maintenant)
  `);

  process.exit(0);
}

// Exporter pour utilisation dans Firebase Functions Shell
export { analyzeBillingForDate, main };

// Si exécuté directement
if (require.main === module) {
  main().catch(console.error);
}
