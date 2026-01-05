/**
 * Script pour vérifier la configuration des templates et routing dans Firestore
 */
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'sos-urgently-ac307' });
}
const db = admin.firestore();

async function verify() {
  console.log('\n=== VERIFICATION DES TEMPLATES FIRESTORE ===\n');

  // Check routing
  const routingDoc = await db.doc('message_routing/config').get();
  if (routingDoc.exists) {
    const routing = routingDoc.data().routing || {};
    console.log('✅ message_routing/config EXISTS');
    console.log('   call.scheduled.client:', JSON.stringify(routing['call.scheduled.client']));
    console.log('   call.scheduled.provider:', JSON.stringify(routing['call.scheduled.provider']));
  } else {
    console.log('❌ message_routing/config NOT FOUND');
  }

  console.log('\n---\n');

  // Check FR templates
  const frClient = await db.doc('message_templates/fr-FR/items/call.scheduled.client').get();
  const frProvider = await db.doc('message_templates/fr-FR/items/call.scheduled.provider').get();

  console.log('FR Templates:');
  if (frClient.exists) {
    const data = frClient.data();
    console.log('  ✅ call.scheduled.client EXISTS');
    console.log('     channels.sms:', data.channels?.sms);
    console.log('     sms.text exists:', !!data.sms?.text);
    console.log('     sms.text (truncated):', (data.sms?.text || '').slice(0, 80) + '...');
  } else {
    console.log('  ❌ call.scheduled.client NOT FOUND');
  }

  if (frProvider.exists) {
    const data = frProvider.data();
    console.log('  ✅ call.scheduled.provider EXISTS');
    console.log('     channels.sms:', data.channels?.sms);
    console.log('     sms.text exists:', !!data.sms?.text);
  } else {
    console.log('  ❌ call.scheduled.provider NOT FOUND');
  }

  console.log('\n---\n');

  // Check EN templates
  const enClient = await db.doc('message_templates/en/items/call.scheduled.client').get();
  const enProvider = await db.doc('message_templates/en/items/call.scheduled.provider').get();

  console.log('EN Templates:');
  if (enClient.exists) {
    const data = enClient.data();
    console.log('  ✅ call.scheduled.client EXISTS');
    console.log('     channels.sms:', data.channels?.sms);
    console.log('     sms.text exists:', !!data.sms?.text);
  } else {
    console.log('  ❌ call.scheduled.client NOT FOUND');
  }

  if (enProvider.exists) {
    const data = enProvider.data();
    console.log('  ✅ call.scheduled.provider EXISTS');
    console.log('     channels.sms:', data.channels?.sms);
    console.log('     sms.text exists:', !!data.sms?.text);
  } else {
    console.log('  ❌ call.scheduled.provider NOT FOUND');
  }

  console.log('\n=== VERIFICATION COMPLETE ===');
}

verify().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
