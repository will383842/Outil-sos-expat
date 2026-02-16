#!/usr/bin/env node

/**
 * Script de Nettoyage de la Racine du Projet - SOS Expat Project
 *
 * Ce script :
 * 1. Archive les fichiers obsolètes (rapports, JSON, scripts temporaires)
 * 2. Déplace les scripts dans /scripts/
 * 3. Déplace les docs dans leurs projets respectifs
 * 4. Supprime les fichiers inutiles
 * 5. Génère un rapport de nettoyage
 *
 * Usage: node scripts/cleanup-root-directory.js
 */

const fs = require('fs');
const path = require('path');

// Couleurs pour le terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Configuration des chemins
const PROJECT_ROOT = path.resolve(__dirname, '..');
const ARCHIVES_DIR = path.join(PROJECT_ROOT, 'sos', 'docs', '09-ARCHIVES', 'old-root-files');
const SCRIPTS_DIR = path.join(PROJECT_ROOT, 'scripts', 'legacy');

// Fichiers à SUPPRIMER (inutiles)
const FILES_TO_DELETE = [
  'nul',
  'C:UserswilliDocumentsProjetsVS_CODEsos-expat-projectkeys_to_check.json', // Nom corrompu
];

// Scripts de traduction à archiver
const TRANSLATION_SCRIPTS_TO_ARCHIVE = [
  'add-missing-translations.js',
  'analyze_missing.js',
  'analyze-influencer-translations.cjs',
  'check_chatter_translations.js',
  'check-blogger-keys.js',
  'check-translations.js',
  'extract-missing-keys.js',
  'final_summary.js',
  'update_translations.py',
];

// Rapports JSON à archiver
const JSON_REPORTS_TO_ARCHIVE = [
  'blogger-translation-report.json',
  'CHATTER_HOOKS_SUMMARY.json',
  'CHATTER_MISSING_KEYS.json',
  'CHATTER_MISSING_KEYS_BY_CATEGORY.json',
  'chatter_translations_report.json',
  'INFLUENCER_MISSING_KEYS.json',
  'missing-keys-with-values.json',
  'keys_to_check.json',
];

// Fichiers texte temporaires à archiver
const TEXT_FILES_TO_ARCHIVE = [
  '00-LIRE-MOI-AUDIT-CHATTER.txt',
  'chatter_keys.txt',
  'CHATTER_ROUTES_DETAILS.txt',
  'CHATTER_TRANSLATIONS_SUMMARY.txt',
  'RESUME-DEPENDANCES.txt',
  'COMMANDES-DEPENDANCES.sh',
  'min-instances-report.csv',
];

// Scripts Batch/PowerShell à déplacer dans /scripts/legacy/
const BATCH_SCRIPTS_TO_MOVE = [
  'build-functions.bat',
  'deploy-paypal-functions.bat',
  'install-deps.bat',
  'scan-min-instances.sh',
  'start-dev.bat',
  'start-dev.ps1',
  'start-local.bat',
  'start-local.ps1',
];

// Fichiers à déplacer vers leurs projets respectifs
const FILES_TO_RELOCATE = {
  'composer-setup.php': 'Telegram-Engine/',
  'DEPLOIEMENT-FINAL-BACKLINK-ENGINE.md': 'backlink-engine/docs/',
  'REORGANISATION-AVANT-APRES.md': 'sos/docs/09-ARCHIVES/migration-reports/',
};

/**
 * Crée les dossiers nécessaires
 */
function createDirectories() {
  log('\n📁 Création des dossiers nécessaires...', 'cyan');

  const dirs = [
    ARCHIVES_DIR,
    path.join(ARCHIVES_DIR, 'translation-scripts'),
    path.join(ARCHIVES_DIR, 'json-reports'),
    path.join(ARCHIVES_DIR, 'text-reports'),
    SCRIPTS_DIR,
    path.join(PROJECT_ROOT, 'backlink-engine', 'docs'),
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      log(`✅ Créé: ${dir.replace(PROJECT_ROOT, '.')}`, 'green');
    }
  });
}

/**
 * Supprime les fichiers inutiles
 */
function deleteUselessFiles() {
  log('\n🗑️  Suppression des fichiers inutiles...', 'cyan');

  let deletedCount = 0;
  const deletedFiles = [];

  FILES_TO_DELETE.forEach(filename => {
    const filePath = path.join(PROJECT_ROOT, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      deletedFiles.push(filename);
      deletedCount++;
      log(`✅ Supprimé: ${filename}`, 'green');
    } else {
      log(`⚠️  Non trouvé: ${filename}`, 'yellow');
    }
  });

  return { deletedCount, deletedFiles };
}

/**
 * Archive les scripts de traduction
 */
function archiveTranslationScripts() {
  log('\n📦 Archivage des scripts de traduction...', 'cyan');

  let archivedCount = 0;
  const archivedFiles = [];
  const archiveDir = path.join(ARCHIVES_DIR, 'translation-scripts');

  TRANSLATION_SCRIPTS_TO_ARCHIVE.forEach(filename => {
    const sourcePath = path.join(PROJECT_ROOT, filename);
    const destPath = path.join(archiveDir, filename);

    if (fs.existsSync(sourcePath)) {
      fs.renameSync(sourcePath, destPath);
      archivedFiles.push(filename);
      archivedCount++;
      log(`✅ Archivé: ${filename}`, 'green');
    } else {
      log(`⚠️  Non trouvé: ${filename}`, 'yellow');
    }
  });

  return { archivedCount, archivedFiles };
}

/**
 * Archive les rapports JSON
 */
function archiveJsonReports() {
  log('\n📦 Archivage des rapports JSON...', 'cyan');

  let archivedCount = 0;
  const archivedFiles = [];
  const archiveDir = path.join(ARCHIVES_DIR, 'json-reports');

  JSON_REPORTS_TO_ARCHIVE.forEach(filename => {
    const sourcePath = path.join(PROJECT_ROOT, filename);
    const destPath = path.join(archiveDir, filename);

    if (fs.existsSync(sourcePath)) {
      fs.renameSync(sourcePath, destPath);
      archivedFiles.push(filename);
      archivedCount++;
      log(`✅ Archivé: ${filename}`, 'green');
    } else {
      log(`⚠️  Non trouvé: ${filename}`, 'yellow');
    }
  });

  return { archivedCount, archivedFiles };
}

/**
 * Archive les fichiers texte temporaires
 */
function archiveTextFiles() {
  log('\n📦 Archivage des fichiers texte temporaires...', 'cyan');

  let archivedCount = 0;
  const archivedFiles = [];
  const archiveDir = path.join(ARCHIVES_DIR, 'text-reports');

  TEXT_FILES_TO_ARCHIVE.forEach(filename => {
    const sourcePath = path.join(PROJECT_ROOT, filename);
    const destPath = path.join(archiveDir, filename);

    if (fs.existsSync(sourcePath)) {
      fs.renameSync(sourcePath, destPath);
      archivedFiles.push(filename);
      archivedCount++;
      log(`✅ Archivé: ${filename}`, 'green');
    } else {
      log(`⚠️  Non trouvé: ${filename}`, 'yellow');
    }
  });

  return { archivedCount, archivedFiles };
}

/**
 * Déplace les scripts Batch/PowerShell
 */
function moveBatchScripts() {
  log('\n🔄 Déplacement des scripts Batch/PowerShell...', 'cyan');

  let movedCount = 0;
  const movedFiles = [];

  BATCH_SCRIPTS_TO_MOVE.forEach(filename => {
    const sourcePath = path.join(PROJECT_ROOT, filename);
    const destPath = path.join(SCRIPTS_DIR, filename);

    if (fs.existsSync(sourcePath)) {
      fs.renameSync(sourcePath, destPath);
      movedFiles.push(filename);
      movedCount++;
      log(`✅ Déplacé: ${filename} → scripts/legacy/`, 'green');
    } else {
      log(`⚠️  Non trouvé: ${filename}`, 'yellow');
    }
  });

  return { movedCount, movedFiles };
}

/**
 * Relocalise les fichiers vers leurs projets respectifs
 */
function relocateFiles() {
  log('\n🔄 Relocalisation des fichiers vers leurs projets...', 'cyan');

  let relocatedCount = 0;
  const relocatedFiles = [];

  Object.entries(FILES_TO_RELOCATE).forEach(([filename, destination]) => {
    const sourcePath = path.join(PROJECT_ROOT, filename);
    const destPath = path.join(PROJECT_ROOT, destination, filename);

    if (fs.existsSync(sourcePath)) {
      // Créer le dossier de destination si nécessaire
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      fs.renameSync(sourcePath, destPath);
      relocatedFiles.push({ filename, destination });
      relocatedCount++;
      log(`✅ Déplacé: ${filename} → ${destination}`, 'green');
    } else {
      log(`⚠️  Non trouvé: ${filename}`, 'yellow');
    }
  });

  return { relocatedCount, relocatedFiles };
}

/**
 * Génère le rapport de nettoyage
 */
function generateCleanupReport(results) {
  log('\n📄 Génération du rapport de nettoyage...', 'cyan');

  const timestamp = new Date().toISOString().split('T')[0];
  const reportPath = path.join(
    PROJECT_ROOT,
    'sos',
    'docs',
    '09-ARCHIVES',
    'migration-reports',
    `cleanup-root-${timestamp}.md`
  );

  const totalProcessed =
    results.deleted.deletedCount +
    results.translationScripts.archivedCount +
    results.jsonReports.archivedCount +
    results.textFiles.archivedCount +
    results.batchScripts.movedCount +
    results.relocated.relocatedCount;

  const report = `# Rapport de Nettoyage de la Racine du Projet

**Date** : ${new Date().toLocaleString('fr-FR')}
**Script** : \`scripts/cleanup-root-directory.js\`

---

## 📊 Résumé

| Opération | Nombre de fichiers |
|-----------|-------------------|
| **Fichiers supprimés** | ${results.deleted.deletedCount} |
| **Scripts traduction archivés** | ${results.translationScripts.archivedCount} |
| **Rapports JSON archivés** | ${results.jsonReports.archivedCount} |
| **Fichiers texte archivés** | ${results.textFiles.archivedCount} |
| **Scripts Batch déplacés** | ${results.batchScripts.movedCount} |
| **Fichiers relocalisés** | ${results.relocated.relocatedCount} |
| **TOTAL TRAITÉ** | **${totalProcessed}** |

---

## 🗑️ Fichiers Supprimés (${results.deleted.deletedCount})

${results.deleted.deletedFiles.length > 0 ? results.deleted.deletedFiles.map(f => `- \`${f}\``).join('\n') : '_Aucun_'}

---

## 📦 Scripts de Traduction Archivés (${results.translationScripts.archivedCount})

**Destination** : \`sos/docs/09-ARCHIVES/old-root-files/translation-scripts/\`

${results.translationScripts.archivedFiles.length > 0 ? results.translationScripts.archivedFiles.map(f => `- \`${f}\``).join('\n') : '_Aucun_'}

---

## 📦 Rapports JSON Archivés (${results.jsonReports.archivedCount})

**Destination** : \`sos/docs/09-ARCHIVES/old-root-files/json-reports/\`

${results.jsonReports.archivedFiles.length > 0 ? results.jsonReports.archivedFiles.map(f => `- \`${f}\``).join('\n') : '_Aucun_'}

---

## 📦 Fichiers Texte Archivés (${results.textFiles.archivedCount})

**Destination** : \`sos/docs/09-ARCHIVES/old-root-files/text-reports/\`

${results.textFiles.archivedFiles.length > 0 ? results.textFiles.archivedFiles.map(f => `- \`${f}\``).join('\n') : '_Aucun_'}

---

## 🔄 Scripts Batch/PowerShell Déplacés (${results.batchScripts.movedCount})

**Destination** : \`scripts/legacy/\`

${results.batchScripts.movedFiles.length > 0 ? results.batchScripts.movedFiles.map(f => `- \`${f}\``).join('\n') : '_Aucun_'}

---

## 🔄 Fichiers Relocalisés (${results.relocated.relocatedCount})

${results.relocated.relocatedFiles.length > 0 ? results.relocated.relocatedFiles.map(({ filename, destination }) => `- \`${filename}\` → \`${destination}\``).join('\n') : '_Aucun_'}

---

## ✅ Résultat Final

**Racine du projet maintenant propre !**

Fichiers restants à la racine (attendus) :
- \`package.json\`
- \`package-lock.json\`
- \`serviceAccount.json\` ⚠️ (sensible - NE PAS COMMIT)
- \`node_modules/\` (dépendances)

---

**Nettoyage effectué avec succès !** 🎉
`;

  fs.writeFileSync(reportPath, report, 'utf8');
  log(`✅ Rapport généré: ${reportPath}`, 'green');

  return reportPath;
}

/**
 * Fonction principale
 */
function main() {
  log('\n' + '='.repeat(60), 'bright');
  log('  🧹 NETTOYAGE DE LA RACINE DU PROJET - SOS EXPAT', 'bright');
  log('='.repeat(60) + '\n', 'bright');

  try {
    // Étape 1 : Créer les dossiers
    createDirectories();

    // Étape 2 : Supprimer les fichiers inutiles
    const deleted = deleteUselessFiles();

    // Étape 3 : Archiver les scripts de traduction
    const translationScripts = archiveTranslationScripts();

    // Étape 4 : Archiver les rapports JSON
    const jsonReports = archiveJsonReports();

    // Étape 5 : Archiver les fichiers texte
    const textFiles = archiveTextFiles();

    // Étape 6 : Déplacer les scripts Batch/PowerShell
    const batchScripts = moveBatchScripts();

    // Étape 7 : Relocaliser les fichiers
    const relocated = relocateFiles();

    // Étape 8 : Générer le rapport
    const results = {
      deleted,
      translationScripts,
      jsonReports,
      textFiles,
      batchScripts,
      relocated,
    };

    const reportPath = generateCleanupReport(results);

    // Résumé final
    const totalProcessed =
      deleted.deletedCount +
      translationScripts.archivedCount +
      jsonReports.archivedCount +
      textFiles.archivedCount +
      batchScripts.movedCount +
      relocated.relocatedCount;

    log('\n' + '='.repeat(60), 'bright');
    log('  ✅ NETTOYAGE TERMINÉ AVEC SUCCÈS !', 'green');
    log('='.repeat(60), 'bright');

    log('\n📊 Statistiques :', 'cyan');
    log(`   - Fichiers supprimés : ${deleted.deletedCount}`, 'red');
    log(`   - Scripts archivés : ${translationScripts.archivedCount}`, 'yellow');
    log(`   - Rapports JSON archivés : ${jsonReports.archivedCount}`, 'yellow');
    log(`   - Fichiers texte archivés : ${textFiles.archivedCount}`, 'yellow');
    log(`   - Scripts Batch déplacés : ${batchScripts.movedCount}`, 'blue');
    log(`   - Fichiers relocalisés : ${relocated.relocatedCount}`, 'blue');
    log(`   - TOTAL TRAITÉ : ${totalProcessed}`, 'bright');

    log('\n📄 Rapport de nettoyage :', 'cyan');
    log(`   ${reportPath}`, 'blue');

    log('\n🎯 Prochaines étapes :', 'cyan');
    log('   1. Vérifier les archives dans sos/docs/09-ARCHIVES/old-root-files/', 'reset');
    log('   2. Vérifier les scripts dans scripts/legacy/', 'reset');
    log('   3. Confirmer que tout fonctionne correctement', 'reset');
    log('   4. Commiter les changements\n', 'reset');

  } catch (error) {
    log('\n❌ ERREUR lors du nettoyage :', 'red');
    log(error.message, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Exécution
main();
