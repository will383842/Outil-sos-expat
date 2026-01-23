/**
 * Setup Multi-Dashboard Configuration in Firestore
 *
 * Run: node scripts/setup-multi-dashboard.js
 */

const admin = require('firebase-admin');

// Initialize with default credentials (uses GOOGLE_APPLICATION_CREDENTIALS or gcloud auth)
admin.initializeApp({
  projectId: 'sos-urgently-ac307'
});

const db = admin.firestore();

async function setupMultiDashboard() {
  console.log('Setting up multi-dashboard configuration...');

  try {
    await db.doc('admin_config/multi_dashboard').set({
      enabled: true,
      sessionDurationHours: 24,
      authorizedEmail: 'williamsjullin@gmail.com',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('✅ Multi-dashboard configuration created successfully!');
    console.log('');
    console.log('Configuration:');
    console.log('  - Document: admin_config/multi_dashboard');
    console.log('  - enabled: true');
    console.log('  - sessionDurationHours: 24');
    console.log('  - authorizedEmail: williamsjullin@gmail.com');
    console.log('');
    console.log('Password is stored in Secret Manager as MULTI_DASHBOARD_PASSWORD');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

setupMultiDashboard();
