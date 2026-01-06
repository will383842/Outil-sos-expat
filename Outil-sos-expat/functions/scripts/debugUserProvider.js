/**
 * Script de debug pour comprendre pourquoi le dashboard est vide
 *
 * Exécution:
 * cd Outil-sos-expat/functions
 * GOOGLE_APPLICATION_CREDENTIALS="C:/Users/willi/AppData/Roaming/firebase/williamsjullin_gmail_com_application_default_credentials.json" node scripts/debugUserProvider.js
 */

const admin = require("firebase-admin");

// Initialize Firebase Admin pour Outil-sos-expat
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: "outils-sos-expat",
  });
}

const db = admin.firestore();

async function debugProvider() {
  const providerId = "DfDbWASBaeaVEZrqg6Wlcd3zpYX2";

  console.log("🔍 DEBUG - Provider Dashboard Issue\n");
  console.log("━".repeat(60));

  // 1. Check provider document
  console.log("\n📋 1. Provider Document:");
  const providerDoc = await db.collection("providers").doc(providerId).get();
  if (providerDoc.exists) {
    const data = providerDoc.data();
    console.log("   ✅ Document EXISTS");
    console.log("   ID:", providerDoc.id);
    console.log("   Data:", JSON.stringify(data, null, 2));
  } else {
    console.log("   ❌ Document NOT FOUND");
  }

  // 2. Check users collection
  console.log("\n📋 2. Users Collection:");
  const usersSnap = await db.collection("users").get();
  console.log(`   Total users: ${usersSnap.size}`);

  // Find user with this providerId
  const userWithProvider = usersSnap.docs.find(doc => {
    const data = doc.data();
    return data.providerId === providerId ||
           doc.id === providerId ||
           (data.linkedProviderIds && data.linkedProviderIds.includes(providerId));
  });

  if (userWithProvider) {
    console.log("   ✅ Found user document linking to provider:");
    console.log("   User ID:", userWithProvider.id);
    console.log("   Data:", JSON.stringify(userWithProvider.data(), null, 2));
  } else {
    console.log("   ⚠️  No user document explicitly links to this provider");
    console.log("   The provider may be matched by UID or email");
  }

  // 3. Check if document ID matches Firebase Auth UID
  console.log("\n📋 3. Firebase Auth Check:");
  try {
    const authUser = await admin.auth().getUser(providerId);
    console.log("   ✅ Auth user EXISTS with this UID");
    console.log("   Email:", authUser.email);
    console.log("   Display Name:", authUser.displayName);
    console.log("   Provider:", authUser.providerData.map(p => p.providerId).join(", "));

    // Check if email matches provider document
    const providerData = providerDoc.data();
    if (providerData?.email === authUser.email) {
      console.log("   ✅ Email matches provider document");
    } else {
      console.log("   ⚠️  EMAIL MISMATCH!");
      console.log("      Auth email:", authUser.email);
      console.log("      Provider doc email:", providerData?.email);
    }
  } catch (e) {
    console.log("   ❌ No auth user with this UID:", e.code);
  }

  // 4. Check conversations for this provider
  console.log("\n📋 4. Conversations:");
  const convQuery = await db.collection("conversations")
    .where("providerId", "==", providerId)
    .get();
  console.log(`   Total conversations: ${convQuery.size}`);

  if (convQuery.size > 0) {
    console.log("   Recent conversations:");
    convQuery.docs.slice(0, 3).forEach(doc => {
      const data = doc.data();
      console.log(`   - ID: ${doc.id}`);
      console.log(`     bookingId: ${data.bookingId}`);
      console.log(`     providerType: ${data.providerType}`);
      console.log(`     createdAt: ${data.createdAt?.toDate?.()?.toISOString()}`);
    });
  }

  // 5. Check provider lookup by email
  console.log("\n📋 5. Provider Lookup by Email:");
  const providerData = providerDoc.data();
  if (providerData?.email) {
    const emailQuery = await db.collection("providers")
      .where("email", "==", providerData.email.toLowerCase())
      .get();
    console.log(`   Query for email "${providerData.email}":`);
    console.log(`   Results: ${emailQuery.size} document(s)`);
    emailQuery.docs.forEach(doc => {
      console.log(`   - ID: ${doc.id} (${doc.id === providerId ? "MATCH" : "different"})`);
    });
  } else {
    console.log("   ⚠️  Provider document has no email field!");
    console.log("   This means the frontend cannot find this provider by email");
  }

  // 6. Summary
  console.log("\n" + "━".repeat(60));
  console.log("📊 SUMMARY:\n");

  const issues = [];

  if (!providerDoc.exists) {
    issues.push("❌ Provider document doesn't exist");
  }

  const pData = providerDoc.data();
  if (!pData?.email) {
    issues.push("❌ Provider document missing 'email' field - Frontend can't match by email!");
  }

  if (pData?.active === false) {
    issues.push("❌ Provider is marked as inactive");
  }

  if (issues.length === 0) {
    console.log("✅ Provider data looks correct!");
    console.log("\n⚠️  If dashboard is still empty, the issue is likely:");
    console.log("   1. User is not logged in");
    console.log("   2. User is logged in with DIFFERENT email than provider.email");
    console.log("   3. SSO token not properly generated");
    console.log("\nTo verify, check browser console for:");
    console.log('   [UnifiedUser] Provider trouvé par UID: xxx');
    console.log('   or');
    console.log('   [UnifiedUser] Provider trouvé par email (legacy): xxx');
  } else {
    console.log("Found issues:");
    issues.forEach(issue => console.log(issue));
  }

  console.log("\n✅ Done!");
}

// Run
debugProvider().catch(console.error);
