/**
 * Script pour seed les 60+ messages de motivation (drip campaign) pour chatters
 * Ces messages sont envoyés automatiquement via Telegram sur 90 jours
 */

const path = require("path");
const fs = require("fs");
const admin = require("firebase-admin");
const { execSync } = require("child_process");

// Try service account first, fallback to Application Default Credentials
const saPath = path.resolve(__dirname, "..", "..", "serviceAccount.json");

if (fs.existsSync(saPath)) {
  console.log("✅ Utilisation du serviceAccount.json");
  admin.initializeApp({
    credential: admin.credential.cert(require(saPath)),
  });
} else {
  console.log("✅ Utilisation des Application Default Credentials (gcloud)");
  admin.initializeApp({
    projectId: "sos-urgently-ac307",
  });
}

const db = admin.firestore();

// Compiler et importer le fichier TS
const TS_FILE = path.resolve(
  __dirname,
  "..",
  "src",
  "chatter",
  "data",
  "chatterDripMessages.ts"
);

async function parseMessagesFromTS() {
  console.log("📖 Import du fichier TypeScript compilé...");

  // Vérifier si le fichier lib existe déjà
  const libFile = path.resolve(__dirname, "..", "lib", "chatter", "data", "chatterDripMessages.js");

  if (!fs.existsSync(libFile)) {
    console.log("⚙️  Compilation du TypeScript en cours...");
    try {
      execSync("npm run build", {
        cwd: path.resolve(__dirname, ".."),
        stdio: "inherit"
      });
    } catch (error) {
      console.error("❌ Erreur de compilation TypeScript");
      throw error;
    }
  }

  // Importer le fichier compilé
  const { CHATTER_DRIP_MESSAGES } = require(libFile);

  if (!CHATTER_DRIP_MESSAGES || !Array.isArray(CHATTER_DRIP_MESSAGES)) {
    throw new Error("CHATTER_DRIP_MESSAGES n'est pas un tableau valide");
  }

  console.log(`✅ ${CHATTER_DRIP_MESSAGES.length} messages importés depuis le fichier compilé`);
  return CHATTER_DRIP_MESSAGES;
}

async function seedDripMessages() {
  console.log("🚀 Début du seed des messages de motivation chatters...\n");

  try {
    // Parser les messages
    const messages = await parseMessagesFromTS();

    if (messages.length === 0) {
      console.error("❌ Aucun message trouvé dans le fichier");
      process.exit(1);
    }

    console.log(`📊 ${messages.length} messages à insérer dans Firestore\n`);

    // Insérer dans Firestore en batches
    const batchSize = 500;
    let totalInserted = 0;

    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = db.batch();
      const chunk = messages.slice(i, i + batchSize);

      for (const msg of chunk) {
        const docRef = db.collection("chatter_drip_messages").doc(`day_${msg.day}`);
        batch.set(docRef, {
          day: msg.day,
          messages: msg.messages,
          status: "active",
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
        });
      }

      await batch.commit();
      totalInserted += chunk.length;
      console.log(`✅ ${totalInserted}/${messages.length} messages insérés...`);
    }

    console.log(`\n🎉 Seed terminé avec succès !`);
    console.log(`📊 ${totalInserted} messages dans la collection 'chatter_drip_messages'`);
    console.log(`\n💡 Les messages seront envoyés automatiquement via la fonction scheduled`);
    console.log(`   'sendChatterDripMessages' tous les jours à 10h00 Europe/Paris`);

    // Afficher quelques exemples
    console.log(`\n📋 Exemples de messages :`);
    const firstMsg = messages[0];
    console.log(`   Jour ${firstMsg.day} (FR) : ${firstMsg.messages.fr.substring(0, 100)}...`);

    const lastMsg = messages[messages.length - 1];
    console.log(`   Jour ${lastMsg.day} (FR) : ${lastMsg.messages.fr.substring(0, 100)}...`);

  } catch (error) {
    console.error("❌ Erreur:", error);
    process.exit(1);
  }

  process.exit(0);
}

// Exécution
seedDripMessages();
