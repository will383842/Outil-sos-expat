/**
 * Script de migration des documents légaux vers Firestore
 * Exécuter avec: node scripts/migrate-legal-docs.cjs
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialiser Firebase Admin
const serviceAccountPath = path.join(__dirname, '../../serviceAccount.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.log('⚠️ serviceAccountKey.json non trouvé.');
  console.log('Alternative: Lancez la migration depuis Admin → Documents Légaux');
  console.log('Ou téléchargez la clé depuis Firebase Console → Paramètres → Comptes de service');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

const db = admin.firestore();

// Charger les documents légaux
const legalDocsPath = path.join(__dirname, '../src/services/legalDocumentsData.json');
const legalDocs = JSON.parse(fs.readFileSync(legalDocsPath, 'utf8'));

async function migrate() {
  console.log('🚀 Démarrage de la migration des documents légaux...\n');

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const doc of legalDocs) {
    try {
      const docRef = db.collection('legal_documents').doc(doc.id);
      const existing = await docRef.get();

      if (existing.exists) {
        // Mettre à jour si la version est différente
        const existingData = existing.data();
        if (existingData.version !== doc.version) {
          await docRef.update({
            content: doc.content,
            version: doc.version,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log(`✅ Mis à jour: ${doc.id} (v${existingData.version} → v${doc.version})`);
          updated++;
        } else {
          console.log(`⏭️ Ignoré (même version): ${doc.id}`);
          skipped++;
        }
      } else {
        await docRef.set({
          ...doc,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          publishedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`✨ Créé: ${doc.id}`);
        created++;
      }
    } catch (error) {
      console.error(`❌ Erreur pour ${doc.id}:`, error.message);
    }
  }

  console.log('\n════════════════════════════════════════════');
  console.log('              MIGRATION TERMINÉE             ');
  console.log('════════════════════════════════════════════');
  console.log(`✨ Créés:    ${created}`);
  console.log(`✅ Mis à jour: ${updated}`);
  console.log(`⏭️ Ignorés:   ${skipped}`);
  console.log('════════════════════════════════════════════\n');

  process.exit(0);
}

migrate().catch(err => {
  console.error('Erreur fatale:', err);
  process.exit(1);
});
