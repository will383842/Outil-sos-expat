/**
 * Script to initialize Telegram admin notification config in Firestore
 * Usage: node scripts/initTelegramConfig.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin with application default credentials
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'sos-urgently-ac307'
  });
}

const db = admin.firestore();

async function initTelegramConfig() {
  console.log('Starting Telegram admin config initialization...\n');

  const config = {
    recipientChatId: '7560535072',
    recipientPhoneNumber: '',
    notifications: {
      newRegistration: {
        enabled: true,
        roles: ['lawyer', 'expat', 'client', 'chatter', 'influencer', 'blogger']
      },
      callCompleted: {
        enabled: true,
        minDurationSeconds: 60
      },
      paymentReceived: {
        enabled: true,
        minAmountEur: 0
      },
      dailyReport: {
        enabled: true
      }
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: 'system_init'
  };

  console.log('Config to be saved:');
  console.log(JSON.stringify({
    ...config,
    updatedAt: '<server_timestamp>'
  }, null, 2));
  console.log('\n');

  try {
    await db.doc('telegram_admin_config/settings').set(config);
    console.log('Telegram admin config initialized successfully!');
    console.log('Document path: telegram_admin_config/settings');
  } catch (error) {
    console.error('Error initializing config:', error);
    throw error;
  }
}

initTelegramConfig()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
