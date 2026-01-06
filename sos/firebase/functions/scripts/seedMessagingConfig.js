/**
 * Script pour synchroniser les templates et routing vers Firestore
 * Supporte 9 langues: fr, en, es, de, pt, ru, ar, hi, ch
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

// All supported languages (same as i18n.ts)
const SUPPORTED_LANGUAGES = ['fr', 'en', 'es', 'de', 'pt', 'ru', 'ar', 'hi', 'ch'];

async function syncTemplatesForLocale(locale, templates) {
  const templateArray = templates.templates || templates.items || [];
  let count = 0;
  for (const template of templateArray) {
    if (template && template.id) {
      const plainTemplate = JSON.parse(JSON.stringify(template));
      await db.doc(`message_templates/${locale}/items/${template.id}`).set(plainTemplate, { merge: true });
      console.log(`  ✅ ${locale.toUpperCase()}: ${template.id}`);
      count++;
    }
  }
  return count;
}

async function seedMessagingConfig() {
  console.log('🚀 Starting messaging config sync (9 languages)...\n');

  const assetsDir = path.join(__dirname, '..', 'src', 'assets');

  // Load routing
  console.log('📂 Loading routing config...');
  const routing = JSON.parse(fs.readFileSync(path.join(assetsDir, 'sos-expat-message-routing.json'), 'utf8'));
  console.log(`  ✅ Routing loaded: ${Object.keys(routing.routing || routing).length} events`);

  // Sync routing
  console.log('\n📤 Syncing routing to Firestore...');
  await db.doc('message_routing/config').set(routing, { merge: true });
  console.log('  ✅ Routing synced');

  // Sync templates for each language
  for (const locale of SUPPORTED_LANGUAGES) {
    const templateFile = path.join(assetsDir, `sos-expat-message-templates-${locale}.json`);

    if (fs.existsSync(templateFile)) {
      console.log(`\n📤 Syncing ${locale.toUpperCase()} templates...`);
      const templates = JSON.parse(fs.readFileSync(templateFile, 'utf8'));
      const count = await syncTemplatesForLocale(locale, templates);
      console.log(`  📊 ${count} templates synced for ${locale.toUpperCase()}`);
    } else {
      console.log(`\n⚠️  Template file not found for ${locale.toUpperCase()}: ${templateFile}`);
    }
  }

  console.log('\n🎉 Messaging config sync complete for all 9 languages!');
}

seedMessagingConfig()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
