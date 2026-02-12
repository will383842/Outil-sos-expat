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
  console.log("   ou utilisez GOOGLE_APPLICATION_CREDENTIALS");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require(saPath)),
});

const db = admin.firestore();

// Lire le fichier TS et extraire les messages
const MESSAGES_FILE = path.resolve(
  __dirname,
  "..",
  "src",
  "chatter",
  "data",
  "chatterDripMessages.ts"
);

async function parseMessagesFromTS() {
  console.log("📖 Lecture du fichier TypeScript...");
  const content = fs.readFileSync(MESSAGES_FILE, "utf8");

  // Pattern pour extraire les messages
  const messagesArray = [];

  // Regex pour trouver chaque objet message
  const messageRegex = /\{\s*\/\/[^\n]*\n\s*day:\s*(\d+),\s*messages:\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/gs;

  let match;
  while ((match = messageRegex.exec(content)) !== null) {
    const day = parseInt(match[1]);
    const messagesBlock = match[2];

    // Extraire chaque langue
    const languages = {};
    const langRegex = /(\w+):\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g;

    let langMatch;
    while ((langMatch = langRegex.exec(messagesBlock)) !== null) {
      const lang = langMatch[1];
      let message = langMatch[2];

      // Unescape les caractères échappés
      message = message
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\\\/g, "\\");

      languages[lang] = message;
    }

    if (Object.keys(languages).length > 0) {
      messagesArray.push({ day, messages: languages });
    }
  }

  console.log(`✅ ${messagesArray.length} messages extraits du fichier TypeScript`);
  return messagesArray;
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
