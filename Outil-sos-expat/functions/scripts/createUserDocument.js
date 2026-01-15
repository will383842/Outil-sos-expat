/**
 * Script pour créer le document users manquant pour un provider
 *
 * ROOT CAUSE: Les règles Firestore vérifient isAssignedProvider() qui appelle
 * getUserData() - si le document users/{uid} n'existe pas, l'accès est refusé.
 *
 * Exécution:
 * cd Outil-sos-expat/functions
 * GOOGLE_APPLICATION_CREDENTIALS="C:/Users/willi/AppData/Roaming/firebase/williamsjullin_gmail_com_application_default_credentials.json" node scripts/createUserDocument.js
 */

const admin = require("firebase-admin");

// Initialize Firebase Admin pour Outil-sos-expat
if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: "outils-sos-expat",
  });
}

const db = admin.firestore();

async function createUserDocument() {
  const providerId = "DfDbWASBaeaVEZrqg6Wlcd3zpYX2";

  console.log("🔧 Creating user document for provider:", providerId);
  console.log("");

  // Get provider info
  const providerDoc = await db.collection("providers").doc(providerId).get();
  const providerData = providerDoc.data() || {};

  console.log("📋 Provider data:", {
    exists: providerDoc.exists,
    name: providerData.name,
    forcedAIAccess: providerData.forcedAIAccess,
  });

  const userData = {
    // Link to the provider - CRITICAL for isAssignedProvider() rule
    linkedProviderIds: [providerId],
    activeProviderId: providerId,

    // Subscription - needed for hasActiveSubscription() rule
    subscriptionStatus: "active",
    subscriptionTier: "unlimited",

    // Role - needed for isProvider() rule
    role: "provider",

    // Metadata
    email: providerData.email || "julienvalentine1@gmail.com",
    name: providerData.name || "Provider",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    source: "fix-script-missing-user-doc",
  };

  await db.collection("users").doc(providerId).set(userData, { merge: true });
  console.log("\n✅ User document CREATED with:");
  console.log(JSON.stringify({
    linkedProviderIds: userData.linkedProviderIds,
    activeProviderId: userData.activeProviderId,
    subscriptionStatus: userData.subscriptionStatus,
    role: userData.role,
    email: userData.email,
  }, null, 2));

  // Verify
  const verifyDoc = await db.collection("users").doc(providerId).get();
  console.log("\n=== VERIFICATION ===");
  console.log("User doc exists:", verifyDoc.exists);

  if (verifyDoc.exists) {
    const data = verifyDoc.data();
    console.log("✅ linkedProviderIds:", data.linkedProviderIds);
    console.log("✅ activeProviderId:", data.activeProviderId);
    console.log("✅ subscriptionStatus:", data.subscriptionStatus);
    console.log("✅ role:", data.role);
  }

  console.log("\n🎉 DONE! User should now be able to see conversations on dashboard.");
  console.log("   → Refresh https://ia.sos-expat.com/dashboard");
}

// Run
createUserDocument().catch(console.error);
