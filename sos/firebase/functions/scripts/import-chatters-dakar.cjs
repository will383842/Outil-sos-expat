/**
 * Import Chatters Dakar — Script standalone
 *
 * Importe les candidats chatters (ex: 83 de Dakar) dans la liste MailWizz
 * chatter-recrutement avec CHATTER_STATUS=candidat et IS_SENEGAL=yes si pays SN.
 *
 * Usage :
 *   node scripts/import-chatters-dakar.cjs --input /path/to/candidates.csv
 *   node scripts/import-chatters-dakar.cjs --input /path/to/candidates.json
 *
 * Variables d'environnement requises :
 *   MAILWIZZ_API_URL       (ex: https://mail.sos-expat.com/api/index.php)
 *   MAILWIZZ_API_KEY       clé publique MailWizz
 *   MAILWIZZ_CUSTOMER_ID   (ex: 1)
 *   MAILWIZZ_LIST_CHATTER_RECRUTEMENT  UID de la liste recrutement chatters
 *
 * Format CSV attendu (première ligne = headers) :
 *   email,firstName,lastName,country
 *   jean.dupont@example.com,Jean,Dupont,SN
 *
 * Format JSON attendu (tableau d'objets) :
 *   [{ "email": "...", "firstName": "...", "lastName": "...", "country": "SN" }, ...]
 */

"use strict";

const fs = require("fs");
const path = require("path");
const axios = require("axios");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const MAILWIZZ_API_URL =
  process.env.MAILWIZZ_API_URL || "https://mail.sos-expat.com/api/index.php";
const MAILWIZZ_API_KEY = process.env.MAILWIZZ_API_KEY || "";
const MAILWIZZ_CUSTOMER_ID = process.env.MAILWIZZ_CUSTOMER_ID || "1";
const LIST_UID = process.env.MAILWIZZ_LIST_CHATTER_RECRUTEMENT || "";

// Pays considérés comme Sénégal (country code ou libellé)
const SENEGAL_VALUES = new Set(["SN", "Sénégal", "Senegal", "senegal", "sénégal"]);

// Délai entre chaque appel API (ms) — respecter les rate limits MailWizz
const DELAY_MS = 300;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse a simple CSV string (comma-separated, first row = headers).
 * No support for quoted commas — use simple data only.
 */
function parseCsv(content) {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] || "";
    });
    return obj;
  });
}

/**
 * Create a subscriber in MailWizz via REST API.
 */
async function createSubscriber(listUid, subscriber) {
  const formData = new URLSearchParams();
  Object.entries(subscriber).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      formData.append(key, String(value));
    }
  });

  const response = await axios.post(
    `${MAILWIZZ_API_URL}/lists/${listUid}/subscribers`,
    formData.toString(),
    {
      headers: {
        "X-MW-PUBLIC-KEY": MAILWIZZ_API_KEY,
        "X-MW-CUSTOMER-ID": MAILWIZZ_CUSTOMER_ID,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "SOS-Platform-Import/1.0",
      },
      timeout: 15000,
    }
  );

  return response.data;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  // --- Validate config ---
  if (!MAILWIZZ_API_KEY) {
    console.error("❌ MAILWIZZ_API_KEY non défini.");
    process.exit(1);
  }
  if (!LIST_UID) {
    console.error("❌ MAILWIZZ_LIST_CHATTER_RECRUTEMENT non défini.");
    process.exit(1);
  }

  // --- Parse --input argument ---
  const inputIndex = process.argv.indexOf("--input");
  if (inputIndex === -1 || !process.argv[inputIndex + 1]) {
    console.error("❌ Usage: node import-chatters-dakar.cjs --input <fichier.csv|fichier.json>");
    process.exit(1);
  }

  const inputFile = path.resolve(process.argv[inputIndex + 1]);
  if (!fs.existsSync(inputFile)) {
    console.error(`❌ Fichier introuvable : ${inputFile}`);
    process.exit(1);
  }

  const ext = path.extname(inputFile).toLowerCase();
  const content = fs.readFileSync(inputFile, "utf-8");

  let candidates;
  if (ext === ".json") {
    candidates = JSON.parse(content);
  } else if (ext === ".csv") {
    candidates = parseCsv(content);
  } else {
    console.error("❌ Format non supporté. Utiliser .csv ou .json");
    process.exit(1);
  }

  console.log(`\n🚀 Import MailWizz — Liste recrutement chatters`);
  console.log(`   Fichier     : ${inputFile}`);
  console.log(`   Candidats   : ${candidates.length}`);
  console.log(`   Liste UID   : ${LIST_UID}`);
  console.log(`   API URL     : ${MAILWIZZ_API_URL}`);
  console.log("─".repeat(60));

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const email = (c.email || c.EMAIL || "").trim();
    const firstName = (c.firstName || c.FNAME || c.first_name || "").trim();
    const lastName = (c.lastName || c.LNAME || c.last_name || "").trim();
    const country = (c.country || c.COUNTRY || "").trim();

    if (!email) {
      console.warn(`⚠️  [${i + 1}/${candidates.length}] Email manquant — ignoré`);
      errorCount++;
      errors.push({ index: i + 1, email: "(vide)", reason: "email manquant" });
      continue;
    }

    const isSenegal = SENEGAL_VALUES.has(country);
    // Langue depuis CSV, défaut "fr" — important pour les autoresponders multilingues
    const language = (c.language || c.LANGUAGE || "fr").trim().toLowerCase();

    const subscriber = {
      EMAIL: email,
      FNAME: firstName,
      LNAME: lastName,
      COUNTRY: country,
      LANGUAGE: language,
      CHATTER_STATUS: "candidat",
      IS_SENEGAL: isSenegal ? "yes" : "no",
    };

    try {
      const result = await createSubscriber(LIST_UID, subscriber);
      const status = result?.status || "unknown";
      if (status === "success" || status === "SUCCESS") {
        console.log(`✅ [${i + 1}/${candidates.length}] ${email}${isSenegal ? " 🇸🇳" : ""}`);
        successCount++;
      } else {
        // MailWizz peut retourner status=error avec un message (ex: already subscribed)
        const msg = result?.data?.message || JSON.stringify(result);
        console.warn(`⚠️  [${i + 1}/${candidates.length}] ${email} — ${msg}`);
        // On compte comme succès partiel si déjà inscrit
        if (msg && msg.toLowerCase().includes("already")) {
          successCount++;
        } else {
          errorCount++;
          errors.push({ index: i + 1, email, reason: msg });
        }
      }
    } catch (err) {
      const msg = err.response?.data?.data?.message || err.message;
      console.error(`❌ [${i + 1}/${candidates.length}] ${email} — ${msg}`);
      errorCount++;
      errors.push({ index: i + 1, email, reason: msg });
    }

    // Rate limiting
    if (i < candidates.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  // --- Résumé ---
  console.log("─".repeat(60));
  console.log(`\n📊 Résumé de l'import :`);
  console.log(`   ✅ Succès  : ${successCount}`);
  console.log(`   ❌ Erreurs : ${errorCount}`);
  console.log(`   Total      : ${candidates.length}`);

  if (errors.length > 0) {
    console.log("\n❌ Détail des erreurs :");
    errors.forEach((e) => {
      console.log(`   [${e.index}] ${e.email} → ${e.reason}`);
    });

    // Export des erreurs dans un fichier JSON
    const errorFile = inputFile.replace(/\.(csv|json)$/i, "-errors.json");
    fs.writeFileSync(errorFile, JSON.stringify(errors, null, 2), "utf-8");
    console.log(`\n💾 Erreurs exportées dans : ${errorFile}`);
  }

  console.log("\n✅ Import terminé.\n");
}

main().catch((err) => {
  console.error("❌ Erreur fatale :", err);
  process.exit(1);
});
