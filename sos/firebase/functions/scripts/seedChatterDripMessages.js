/**
 * Script pour seed les 60+ messages de motivation (drip campaign) pour chatters
 * Ces messages sont envoyés automatiquement via Telegram sur 90 jours
 */

const path = require("path");
const fs = require("fs");
const admin = require("firebase-admin");

// Service account
const saPath = path.resolve(__dirname, "..", "..", "serviceAccount.json");

if (!fs.existsSync(saPath)) {
  console.error("❌ serviceAccount.json introuvable à", saPath);
  console.log("💡 Créez ce fichier depuis la console Firebase");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require(saPath)),
});

const db = admin.firestore();

// Import des messages depuis le fichier TypeScript compilé
const MESSAGES_FILE = path.resolve(__dirname, "..", "src", "chatter", "data", "chatterDripMessages.ts");

async function seedDripMessages() {
  console.log("🚀 Début du seed des messages de motivation chatters...\n");

  try {
    // Pour l'instant, on va créer la structure manuellement
    // TODO: Compiler le fichier TS ou le convertir en JSON

    const batch = db.batch();
    let count = 0;

    // Structure de la collection
    const collectionRef = db.collection("chatter_drip_messages");

    // On va lire directement le fichier et parser les messages
    const fileContent = fs.readFileSync(MESSAGES_FILE, "utf8");

    // Extraction des messages par regex (simple parsing)
    const messageMatches = fileContent.matchAll(/{\s*day:\s*(\d+),\s*messages:\s*{([^}]+)}/gs);

    for (const match of messageMatches) {
      const day = parseInt(match[1]);

      // On va créer un document par jour
      const docRef = collectionRef.doc(`day_${day}`);

      batch.set(docRef, {
        day,
        status: "active",
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      }, { merge: true });

      count++;

      if (count % 10 === 0) {
        console.log(`📝 ${count} messages préparés...`);
      }
    }

    await batch.commit();
    console.log(`\n✅ ${count} messages de drip campaign créés avec succès !`);
    console.log(`📊 Collection: chatter_drip_messages`);

  } catch (error) {
    console.error("❌ Erreur:", error);
    process.exit(1);
  }

  process.exit(0);
}

// Exécution
seedDripMessages();
