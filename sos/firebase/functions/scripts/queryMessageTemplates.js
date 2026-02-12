const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const saPath = path.resolve(__dirname, '..', '..', 'serviceAccount.json');
if (!fs.existsSync(saPath)) {
  console.log('❌ Service account not found at', saPath);
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(require(saPath)) });
const db = admin.firestore();

(async () => {
  try {
    console.log('🔍 Querying chatterMessageTemplates collection...\n');

    const snapshot = await db.collection('chatterMessageTemplates').get();
    console.log(`📊 Total templates: ${snapshot.size}\n`);

    if (snapshot.empty) {
      console.log('⚠️  Collection is empty or does not exist');
      process.exit(0);
    }

    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${index + 1}. ID: ${doc.id}`);
      console.log(`   Category: ${data.category || 'N/A'}`);
      console.log(`   Title: ${data.title || 'N/A'}`);
      console.log(`   Emoji: ${data.emoji || 'N/A'}`);
      console.log(`   Order: ${data.order || 'N/A'}`);
      const msg = data.message || '';
      console.log(`   Message: ${msg.substring(0, 100)}${msg.length > 100 ? '...' : ''}`);
      console.log('');
    });

    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
})();
