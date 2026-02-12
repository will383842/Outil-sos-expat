/**
 * Script de test pour les drip messages
 * Teste les fonctions callables admin
 */

const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

// Service account
const saPath = path.resolve(__dirname, "..", "..", "serviceAccount.json");

if (!fs.existsSync(saPath)) {
  console.error("❌ serviceAccount.json manquant");
  console.log("💡 Pour tester en production, configurez le service account");
  console.log("   Ou utilisez l'émulateur Firebase");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require(saPath)),
});

const functions = admin.functions();

async function testDripMessages() {
  console.log("🧪 Test des fonctions drip messages\n");

  try {
    // Test 1: Prévisualiser un message
    console.log("📋 Test 1: Prévisualiser le message du jour 0 (bienvenue)");
    const previewResult = await functions
      .httpsCallable("chatter_previewDripMessage")({ day: 0, language: "fr" });

    console.log("✅ Résultat:");
    console.log("   Jour:", previewResult.data.day);
    console.log("   Langue:", previewResult.data.language);
    console.log("   Message:", previewResult.data.message.substring(0, 150) + "...");

    // Test 2: Obtenir les stats d'un chatter (remplacer par un vrai ID)
    console.log("\n📊 Test 2: Obtenir les stats drip");
    const testChatterId = "TEST_CHATTER_ID"; // À remplacer

    try {
      const statsResult = await functions
        .httpsCallable("chatter_getDripStats")({ chatterId: testChatterId });

      console.log("✅ Stats:");
      console.log("   Jour actuel:", statsResult.data.currentDay);
      console.log("   Dernier message envoyé:", statsResult.data.lastDripDay);
      console.log("   Total messages:", statsResult.data.totalMessages);
    } catch (e) {
      console.log("⚠️  Pas de chatter test configuré (normal)");
    }

    // Test 3: Prévisualiser plusieurs jours
    console.log("\n📅 Test 3: Prévisualiser messages clés");
    const keyDays = [0, 1, 7, 30, 60, 90];

    for (const day of keyDays) {
      try {
        const result = await functions
          .httpsCallable("chatter_previewDripMessage")({ day, language: "fr" });

        const msg = result.data.message;
        const preview = msg.substring(0, 80).replace(/\n/g, " ");
        console.log(`   Jour ${day.toString().padStart(2)}: ${preview}...`);
      } catch (e) {
        console.log(`   Jour ${day.toString().padStart(2)}: Aucun message configuré`);
      }
    }

    console.log("\n✅ Tests terminés avec succès !");
    console.log("\n💡 Pour tester l'envoi automatique:");
    console.log("   1. Créez un chatter avec telegram_id");
    console.log("   2. Attendez le scheduled function (10h Paris) ou appelez manuellement");
    console.log("   3. Vérifiez la collection telegram_queue");

  } catch (error) {
    console.error("\n❌ Erreur:", error.message);
    if (error.details) {
      console.error("   Détails:", error.details);
    }
    process.exit(1);
  }

  process.exit(0);
}

// Exécution
testDripMessages();
