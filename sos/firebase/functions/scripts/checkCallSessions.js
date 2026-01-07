const admin = require('firebase-admin');

// Use ADC
admin.initializeApp({ projectId: 'sos-urgently-ac307' });
const db = admin.firestore();

async function main() {
  console.log('=== CALL SESSIONS (les plus récentes) ===\n');

  try {
    const sessions = await db.collection('call_sessions')
      .orderBy('createdAt', 'desc')
      .limit(3)
      .get();

    if (sessions.empty) {
      console.log('Aucune session trouvée.');
    } else {
      sessions.docs.forEach(doc => {
        const d = doc.data();
        console.log('ID:', doc.id);
        console.log('  Status:', d.status);
        console.log('  Created:', d.createdAt?.toDate?.().toISOString() || 'N/A');
        console.log('  Client status:', d.participants?.client?.status);
        console.log('  Provider status:', d.participants?.provider?.status);
        console.log('  Conference:', d.conference?.name || 'N/A');
        console.log();
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  }

  process.exit(0);
}

main();
