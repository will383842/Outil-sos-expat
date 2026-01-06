/**
 * Script de synchronisation des providers manquants
 *
 * Exécution:
 * cd Outil-sos-expat/functions
 * GOOGLE_APPLICATION_CREDENTIALS="C:/Users/willi/AppData/Roaming/firebase/williamsjullin_gmail_com_application_default_credentials.json" node scripts/syncMissingProviders.js
 */

const admin = require("firebase-admin");

// Initialize Firebase Admin pour Outil-sos-expat
// Use Application Default Credentials (gcloud auth application-default login)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: "outils-sos-expat",
  });
}

const db = admin.firestore();

async function checkAndSyncProviders() {
  console.log("🔍 Checking providers in Outil-sos-expat...\n");

  // 1. Get all bookings and extract unique providerIds
  const bookingsSnap = await db.collection("bookings").get();
  const providerIds = new Set();

  bookingsSnap.docs.forEach(doc => {
    const data = doc.data();
    if (data.providerId) {
      providerIds.add(data.providerId);
    }
  });

  console.log(`📊 Found ${providerIds.size} unique providerIds in bookings`);
  console.log("   Provider IDs:", [...providerIds]);

  // 2. Check which providers exist
  const missingProviders = [];
  const existingProviders = [];

  for (const providerId of providerIds) {
    const providerDoc = await db.collection("providers").doc(providerId).get();
    if (providerDoc.exists) {
      existingProviders.push(providerId);
      console.log(`✅ Provider exists: ${providerId}`);
    } else {
      missingProviders.push(providerId);
      console.log(`❌ Provider MISSING: ${providerId}`);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Existing: ${existingProviders.length}`);
  console.log(`   Missing: ${missingProviders.length}`);

  // 3. Check conversations
  console.log("\n🔍 Checking conversations...");
  const conversationsSnap = await db.collection("conversations").get();
  console.log(`   Total conversations: ${conversationsSnap.size}`);

  const convByProvider = {};
  conversationsSnap.docs.forEach(doc => {
    const data = doc.data();
    const pid = data.providerId || "unknown";
    convByProvider[pid] = (convByProvider[pid] || 0) + 1;
  });

  console.log("   Conversations per provider:", convByProvider);

  // 4. If there are missing providers, create them
  if (missingProviders.length > 0) {
    console.log("\n⚠️  MISSING PROVIDERS DETECTED!");
    console.log("To fix, create these providers manually in Outil Firestore:");

    for (const providerId of missingProviders) {
      // Try to get info from bookings
      const bookingWithProvider = bookingsSnap.docs.find(doc =>
        doc.data().providerId === providerId
      );
      const bookingData = bookingWithProvider?.data();

      console.log(`\n📝 Provider: ${providerId}`);
      console.log("   Suggested document to create:");
      console.log({
        id: providerId,
        name: bookingData?.providerName || "Unknown Provider",
        email: "email@from-sos-profiles.com",
        type: bookingData?.providerType || "lawyer",
        active: true,
        source: "manual-sync-script",
        createdAt: new Date().toISOString(),
      });
    }

    // Ask to create
    console.log("\n🔧 Creating minimal provider documents...");

    for (const providerId of missingProviders) {
      const bookingWithProvider = bookingsSnap.docs.find(doc =>
        doc.data().providerId === providerId
      );
      const bookingData = bookingWithProvider?.data();

      const providerData = {
        name: bookingData?.providerName || "Provider",
        type: bookingData?.providerType || "lawyer",
        active: true,
        source: "sync-script-missing-provider",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        // Note: email will need to be updated manually or via sync
      };

      await db.collection("providers").doc(providerId).set(providerData, { merge: true });
      console.log(`✅ Created provider: ${providerId}`);
    }
  }

  // 5. Verify auth users (to map emails)
  console.log("\n🔍 Listing Firebase Auth users to find emails...");
  try {
    const listUsersResult = await admin.auth().listUsers(100);
    listUsersResult.users.forEach(user => {
      if (missingProviders.includes(user.uid)) {
        console.log(`   Found user: ${user.uid} -> ${user.email}`);
      }
    });
  } catch (e) {
    console.log("   Could not list users:", e.message);
  }

  console.log("\n✅ Done!");
}

// Run
checkAndSyncProviders().catch(console.error);
