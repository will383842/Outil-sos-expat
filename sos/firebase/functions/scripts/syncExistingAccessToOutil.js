/**
 * =============================================================================
 * SCRIPT: Synchronisation initiale des acces IA existants vers Outil
 * =============================================================================
 *
 * Ce script synchronise tous les utilisateurs avec forcedAIAccess=true ou
 * freeTrialUntil defini vers la collection providers de Outil-sos-expat.
 *
 * USAGE:
 * cd sos/firebase/functions
 * export GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account.json"
 * node scripts/syncExistingAccessToOutil.js
 *
 * PREREQUIS:
 * - Service account avec acces en lecture a Firestore SOS
 * - Secret OUTIL_SYNC_API_KEY configure
 */

const admin = require("firebase-admin");

// Configuration
const SOS_PROJECT_ID = "sos-urgently-ac307";
const OUTIL_SYNC_ENDPOINT = "https://europe-west1-outils-sos-expat.cloudfunctions.net/syncProvider";
// IMPORTANT: Remplacer par la vraie cle API
const OUTIL_SYNC_API_KEY = process.env.OUTIL_SYNC_API_KEY || "YOUR_API_KEY_HERE";

// Initialisation Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: SOS_PROJECT_ID,
  });
}

const db = admin.firestore();

async function syncAccessToOutil(uid, data) {
  const payload = {
    id: uid,
    action: "upsert",
  };

  if (data.forcedAIAccess !== undefined) {
    payload.forcedAIAccess = data.forcedAIAccess;
  }

  if (data.freeTrialUntil) {
    payload.freeTrialUntil = data.freeTrialUntil.toDate
      ? data.freeTrialUntil.toDate().toISOString()
      : new Date(data.freeTrialUntil).toISOString();
  } else {
    payload.freeTrialUntil = null;
  }

  try {
    const response = await fetch(OUTIL_SYNC_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": OUTIL_SYNC_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ERREUR] ${uid}: HTTP ${response.status} - ${errorText}`);
      return false;
    }

    console.log(`[OK] ${uid}: Synchronise avec forcedAIAccess=${payload.forcedAIAccess}`);
    return true;
  } catch (error) {
    console.error(`[ERREUR] ${uid}: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("SYNCHRONISATION DES ACCES IA EXISTANTS VERS OUTIL");
  console.log("=".repeat(60));
  console.log("");

  // Rechercher tous les utilisateurs avec forcedAIAccess=true
  console.log("Recherche des utilisateurs avec forcedAIAccess=true...");
  const forcedAccessQuery = await db
    .collection("users")
    .where("forcedAIAccess", "==", true)
    .get();

  console.log(`Trouves: ${forcedAccessQuery.size} utilisateurs avec forcedAIAccess`);

  // Rechercher les utilisateurs avec freeTrialUntil dans le futur
  console.log("Recherche des utilisateurs avec freeTrialUntil actif...");
  const now = new Date();
  const freeTrialQuery = await db
    .collection("users")
    .where("freeTrialUntil", ">", now)
    .get();

  console.log(`Trouves: ${freeTrialQuery.size} utilisateurs avec freeTrialUntil actif`);

  // Combiner et deduper les UIDs
  const usersToSync = new Map();

  forcedAccessQuery.forEach((doc) => {
    usersToSync.set(doc.id, doc.data());
  });

  freeTrialQuery.forEach((doc) => {
    if (!usersToSync.has(doc.id)) {
      usersToSync.set(doc.id, doc.data());
    }
  });

  console.log(`\nTotal a synchroniser: ${usersToSync.size} utilisateurs`);
  console.log("");

  if (usersToSync.size === 0) {
    console.log("Aucun utilisateur a synchroniser.");
    return;
  }

  // Synchroniser chaque utilisateur
  let success = 0;
  let failures = 0;

  for (const [uid, data] of usersToSync) {
    const result = await syncAccessToOutil(uid, data);
    if (result) {
      success++;
    } else {
      failures++;
    }

    // Rate limiting: 100ms entre chaque requete
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log("");
  console.log("=".repeat(60));
  console.log(`RESULTAT: ${success} succes, ${failures} echecs`);
  console.log("=".repeat(60));
}

main().catch(console.error);
