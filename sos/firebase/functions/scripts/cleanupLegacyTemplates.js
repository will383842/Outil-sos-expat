/**
 * Script pour nettoyer les templates obsolètes dans Firestore
 * Supprime les templates legacy qui sont au niveau racine (ancien format)
 * et garde uniquement les templates dans le nouveau format: message_templates/{locale}/items/{templateId}
 *
 * Usage: node scripts/cleanupLegacyTemplates.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin with project ID
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'sos-urgently-ac307'
  });
}

const db = admin.firestore();

// Templates valides (ceux qui sont dans les fichiers JSON)
const VALID_TEMPLATE_IDS = [
  'call.scheduled.provider',
  'call.scheduled.client',
  'user.signup.success',
  'provider.signup.success',
  'user.profile.incomplete.d1',
  'provider.profile.incomplete.d1',
  'request.created.client',
  'request.created.provider',
  'request.needs_changes.client',
  'request.approved.client',
  'checkout.abandoned.client.24h',
  'payment.succeeded.client',
  'payment.failed.client',
  'booking_paid_provider',
  'call.cancelled.client_no_answer',
  'provider.set.offline.no_answer',
  'handoff.started.client',
  'handoff.to.provider',
  'message.new.client',
  'message.new.provider',
  'messages.digest.client.daily',
  'request.closed.client',
  'request.closed.provider',
  'client.post_closure.d7',
  'security.suspicious_login',
  'provider.monthly.report',
  'budget.alert.warning',
  'budget.alert.critical',
  'security.daily_report',
  'provider.payout.received',
  'payment_refunded',
  'subscription.reminder',
];

// Locales valides
const VALID_LOCALES = ['fr', 'en', 'es', 'de', 'pt', 'ru', 'ar', 'hi', 'ch', 'fr-FR'];

async function cleanupLegacyTemplates() {
  console.log('🧹 Starting legacy templates cleanup...\n');

  let deletedCount = 0;
  let skippedCount = 0;

  // 1. Lister tous les documents au niveau racine de message_templates
  console.log('📂 Scanning root-level documents in message_templates...');
  const rootDocs = await db.collection('message_templates').listDocuments();

  for (const docRef of rootDocs) {
    const docId = docRef.id;

    // Si c'est un locale valide, c'est le nouveau format - ne pas supprimer
    if (VALID_LOCALES.includes(docId) || docId === 'config') {
      console.log(`  ⏭️  Skipping valid locale/config: ${docId}`);
      skippedCount++;
      continue;
    }

    // Si c'est un template ID au niveau racine, c'est l'ancien format - supprimer
    if (VALID_TEMPLATE_IDS.includes(docId)) {
      console.log(`  🗑️  Deleting legacy template at root: ${docId}`);
      await docRef.delete();
      deletedCount++;
      continue;
    }

    // Autre document inconnu - afficher pour vérification manuelle
    const doc = await docRef.get();
    if (doc.exists) {
      const data = doc.data();
      // Vérifier si c'est un ancien template (a un champ content, text, ou sms)
      if (data.content || data.text || data.sms || data.email) {
        console.log(`  🗑️  Deleting unknown legacy template: ${docId}`);
        await docRef.delete();
        deletedCount++;
      } else {
        console.log(`  ⚠️  Unknown document (keeping): ${docId} - keys: ${Object.keys(data).join(', ')}`);
        skippedCount++;
      }
    }
  }

  console.log(`\n📊 Cleanup summary:`);
  console.log(`   - Deleted: ${deletedCount} legacy templates`);
  console.log(`   - Skipped: ${skippedCount} valid documents`);
  console.log('\n🎉 Legacy templates cleanup complete!');
}

cleanupLegacyTemplates()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
