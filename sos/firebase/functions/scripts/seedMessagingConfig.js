/**
 * Script pour synchroniser les templates et routing vers Firestore
 * Usage: node scripts/seedMessagingConfig.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin with project ID
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'sos-urgently-ac307'
  });
}

const db = admin.firestore();

async function seedMessagingConfig() {
  console.log('🚀 Starting messaging config sync...\n');

  const assetsDir = path.join(__dirname, '..', 'src', 'assets');

  // Load JSON files
  console.log('📂 Loading JSON files...');
  const fr = JSON.parse(fs.readFileSync(path.join(assetsDir, 'sos-expat-message-templates-fr.json'), 'utf8'));
  const en = JSON.parse(fs.readFileSync(path.join(assetsDir, 'sos-expat-message-templates-en.json'), 'utf8'));
  const routing = JSON.parse(fs.readFileSync(path.join(assetsDir, 'sos-expat-message-routing.json'), 'utf8'));

  console.log(`  ✅ FR templates loaded: ${fr.items ? Object.keys(fr.items).length : (fr.length || 'array')}`);
  console.log(`  ✅ EN templates loaded: ${en.items ? Object.keys(en.items).length : (en.length || 'array')}`);
  console.log(`  ✅ Routing loaded: ${Object.keys(routing.routing || routing).length} events`);

  // Sync routing
  console.log('\n📤 Syncing routing to Firestore...');
  await db.doc('message_routing/config').set(routing, { merge: true });
  console.log('  ✅ Routing synced');

  // Sync FR templates
  console.log('\n📤 Syncing FR templates...');
  const frTemplates = fr.templates || fr.items || [];
  for (const template of frTemplates) {
    if (template && template.id) {
      // Convert to plain object if needed
      const plainTemplate = JSON.parse(JSON.stringify(template));
      await db.doc(`message_templates/fr-FR/items/${template.id}`).set(plainTemplate, { merge: true });
      console.log(`  ✅ FR: ${template.id}`);
    }
  }

  // Sync EN templates
  console.log('\n📤 Syncing EN templates...');
  const enTemplates = en.templates || en.items || [];
  for (const template of enTemplates) {
    if (template && template.id) {
      // Convert to plain object if needed
      const plainTemplate = JSON.parse(JSON.stringify(template));
      await db.doc(`message_templates/en/items/${template.id}`).set(plainTemplate, { merge: true });
      console.log(`  ✅ EN: ${template.id}`);
    }
  }

  console.log('\n🎉 Messaging config sync complete!');
}

seedMessagingConfig()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
