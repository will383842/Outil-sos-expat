/**
 * Script pour corriger le document provider manquant d'email
 *
 * Exécution:
 * cd Outil-sos-expat/functions
 * GOOGLE_APPLICATION_CREDENTIALS="C:/Users/willi/AppData/Roaming/firebase/williamsjullin_gmail_com_application_default_credentials.json" node scripts/fixProviderEmail.js
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

async function fixProviderEmail() {
  const providerId = "DfDbWASBaeaVEZrqg6Wlcd3zpYX2";

  console.log("🔧 Fixing provider document...\n");

  // 1. Get the provider document
  const providerDoc = await db.collection("providers").doc(providerId).get();
  if (!providerDoc.exists) {
    console.log("❌ Provider document not found!");
    return;
  }

  const currentData = providerDoc.data();
  console.log("Current provider data:", JSON.stringify(currentData, null, 2));

  // 2. Check bookings to find email
  console.log("\n🔍 Looking for provider info in bookings...");
  const bookings = await db.collection("bookings")
    .where("providerId", "==", providerId)
    .limit(5)
    .get();

  let providerInfo = {};
  bookings.docs.forEach(doc => {
    const data = doc.data();
    console.log("Booking info:", {
      providerName: data.providerName,
      providerType: data.providerType,
      providerCountry: data.providerCountry,
    });
    if (data.providerName) providerInfo.name = data.providerName;
    if (data.providerType) providerInfo.type = data.providerType;
    if (data.providerCountry) providerInfo.country = data.providerCountry;
  });

  // 3. The email needs to come from SOS - let's check what we have
  // Note: We need to get the email from SOS sos_profiles collection
  // For now, prompt the user to enter it manually

  console.log("\n⚠️  The email must be retrieved from SOS Firestore.");
  console.log("Run this command to get the email from SOS:");
  console.log(`\ngcloud firestore documents list --project=sos-urgently-ac307 --database="(default)" --collection="sos_profiles" --filter="__name__='sos_profiles/${providerId}'" 2>&1 | head -50`);

  console.log("\n🔧 If you know the email, update the provider document:");
  console.log(`
const update = {
  email: "provider@email.com",
  name: "${providerInfo.name || 'Provider Name'}",
  type: "${providerInfo.type || 'lawyer'}",
  country: "${providerInfo.country || ''}",
  active: true,
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
};

await db.collection("providers").doc("${providerId}").update(update);
`);

  // 4. Try to update with the info we have (minus email which we don't have)
  console.log("\n🔧 Updating with available info (still needs email)...");

  const updateData = {
    name: providerInfo.name || currentData.name || "Provider",
    type: providerInfo.type || currentData.type || "lawyer",
    active: true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (providerInfo.country) {
    updateData.country = providerInfo.country;
  }

  await db.collection("providers").doc(providerId).update(updateData);
  console.log("✅ Updated with:", updateData);

  console.log("\n⚠️  EMAIL STILL NEEDS TO BE ADDED!");
  console.log("The frontend will not work until email is set.");

  console.log("\n✅ Done!");
}

// Run
fixProviderEmail().catch(console.error);
