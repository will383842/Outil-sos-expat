#!/usr/bin/env node

/**
 * Script de migration SÉCURISÉ
 * Migre UNIQUEMENT les fonctions d'affiliation vers europe-west2
 *
 * Modules ciblés :
 * - chatter/
 * - influencer/
 * - blogger/
 * - groupAdmin/
 *
 * NE TOUCHE PAS aux autres fonctions !
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// === CONFIGURATION SÉCURISÉE ===
const SRC_DIR = path.join(__dirname, 'src');
const TARGET_FOLDERS = ['chatter', 'influencer', 'blogger', 'groupAdmin'];
const OLD_REGION = 'region: "europe-west1"';
const NEW_REGION = 'region: "europe-west2"';

// Exclusions (fonctions déjà en west3 à ne pas toucher)
const EXCLUDE_PATTERNS = [
  '**/telegramOnboarding.ts', // Déjà en west3
  '**/updateTelegramOnboarding.ts', // Déjà en west3
];

console.log('\n🔍 MIGRATION AFFILIATION → europe-west2\n');
console.log('📁 Dossiers ciblés :', TARGET_FOLDERS.join(', '));
console.log('🔒 Autres dossiers : NON TOUCHÉS\n');

// === ÉTAPE 1 : Trouver les fichiers à modifier ===
let filesToModify = [];

TARGET_FOLDERS.forEach(folder => {
  const folderPath = path.join(SRC_DIR, folder);

  if (!fs.existsSync(folderPath)) {
    console.warn(`⚠️  Dossier introuvable : ${folder}`);
    return;
  }

  // Trouver tous les fichiers .ts dans ce dossier
  const pattern = path.join(folderPath, '**', '*.ts');
  const files = glob.sync(pattern);

  files.forEach(file => {
    // Vérifier si le fichier est exclu
    const shouldExclude = EXCLUDE_PATTERNS.some(pattern => {
      const excludePattern = path.join(SRC_DIR, pattern.replace('**/', ''));
      return file.includes(pattern.replace('**/', ''));
    });

    if (shouldExclude) {
      console.log(`⏭️  Exclu (déjà en west3) : ${path.relative(SRC_DIR, file)}`);
      return;
    }

    // Lire le contenu
    const content = fs.readFileSync(file, 'utf8');

    // Vérifier si le fichier contient la région à remplacer
    if (content.includes(OLD_REGION)) {
      const occurrences = (content.match(new RegExp(OLD_REGION, 'g')) || []).length;
      filesToModify.push({ file, occurrences });
    }
  });
});

// === ÉTAPE 2 : Afficher le preview ===
console.log('\n📊 PREVIEW DES MODIFICATIONS :\n');

if (filesToModify.length === 0) {
  console.log('✅ Aucun fichier à modifier (peut-être déjà migrés ?)');
  process.exit(0);
}

let totalOccurrences = 0;
filesToModify.forEach(({ file, occurrences }) => {
  console.log(`  📄 ${path.relative(SRC_DIR, file)} (${occurrences} occurrence${occurrences > 1 ? 's' : ''})`);
  totalOccurrences += occurrences;
});

console.log(`\n📈 TOTAL : ${filesToModify.length} fichiers, ${totalOccurrences} occurrences\n`);

// === ÉTAPE 3 : Demander confirmation ===
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

readline.question('⚠️  Appliquer ces modifications ? (oui/non) : ', (answer) => {
  if (answer.toLowerCase() !== 'oui') {
    console.log('\n❌ Migration annulée.\n');
    readline.close();
    process.exit(0);
  }

  // === ÉTAPE 4 : Appliquer les modifications ===
  console.log('\n🚀 Application des modifications...\n');

  let modifiedCount = 0;
  filesToModify.forEach(({ file }) => {
    const content = fs.readFileSync(file, 'utf8');
    const newContent = content.replace(new RegExp(OLD_REGION, 'g'), NEW_REGION);

    fs.writeFileSync(file, newContent, 'utf8');
    modifiedCount++;
    console.log(`  ✅ ${path.relative(SRC_DIR, file)}`);
  });

  console.log(`\n✨ Migration terminée ! ${modifiedCount} fichiers modifiés.\n`);
  console.log('📋 PROCHAINES ÉTAPES :\n');
  console.log('  1. cd sos/firebase/functions');
  console.log('  2. rm -rf lib && npm run build');
  console.log('  3. firebase deploy --only functions --project=sos-urgently-ac307\n');

  readline.close();
});
