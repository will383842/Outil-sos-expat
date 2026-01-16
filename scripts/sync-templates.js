const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin with application default credentials
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'sos-urgently-ac307'
});

const db = admin.firestore();

async function syncTemplates() {
  const assetsDir = path.join(__dirname, '..', 'sos', 'firebase', 'functions', 'src', 'assets');

  const locales = [
    { file: 'sos-expat-message-templates-fr.json', collection: 'fr-FR' },
    { file: 'sos-expat-message-templates-en.json', collection: 'en' },
    { file: 'sos-expat-message-templates-de.json', collection: 'de' },
    { file: 'sos-expat-message-templates-es.json', collection: 'es' },
    { file: 'sos-expat-message-templates-ar.json', collection: 'ar' },
    { file: 'sos-expat-message-templates-ch.json', collection: 'zh' },
    { file: 'sos-expat-message-templates-hi.json', collection: 'hi' },
    { file: 'sos-expat-message-templates-pt.json', collection: 'pt' },
    { file: 'sos-expat-message-templates-ru.json', collection: 'ru' },
  ];

  console.log('Starting templates sync...\n');

  // Sync routing first
  const routingPath = path.join(assetsDir, 'sos-expat-message-routing.json');
  const routing = JSON.parse(fs.readFileSync(routingPath, 'utf8'));
  await db.doc('message_routing/config').set(routing, { merge: true });
  console.log('[OK] Routing config synced');

  // Sync templates for each locale
  for (const locale of locales) {
    try {
      const filePath = path.join(assetsDir, locale.file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const templates = data.templates || [];

      let count = 0;
      for (const template of templates) {
        if (!template.id) continue;
        await db.doc(`message_templates/${locale.collection}/items/${template.id}`).set(template, { merge: true });
        count++;
      }

      console.log(`[OK] ${locale.collection}: ${count} templates synced`);
    } catch (err) {
      console.error(`[ERROR] ${locale.file}: ${err.message}`);
    }
  }

  console.log('\nTemplates sync complete!');
  process.exit(0);
}

syncTemplates().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
