#!/usr/bin/env node

/**
 * Script de Migration de la Documentation Restante - SOS Expat Project
 *
 * Ce script :
 * 1. Migre /DOCUMENTATION/ → /sos/docs/ (ancienne structure)
 * 2. Migre /docs/ (racine) → projets appropriés
 * 3. Archive /All_Explains/
 * 4. Renomme "Outils d'emailing" → email-tools
 * 5. Génère un rapport de migration
 *
 * Usage: node scripts/migrate-remaining-docs.js
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
const OLD_DOCUMENTATION = path.join(PROJECT_ROOT, 'DOCUMENTATION');
const NEW_DOCS = path.join(PROJECT_ROOT, 'sos', 'docs');
const ROOT_DOCS = path.join(PROJECT_ROOT, 'docs');
const ALL_EXPLAINS = path.join(PROJECT_ROOT, 'All_Explains');
const OUTILS_EMAILING = path.join(PROJECT_ROOT, 'Outils d\'emailing');
const EMAIL_TOOLS = path.join(PROJECT_ROOT, 'email-tools');
const ARCHIVES_DIR = path.join(NEW_DOCS, '09-ARCHIVES');

/**
 * Copie récursive de dossier
 */
function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    log(`⚠️  Source non trouvée: ${src}`, 'yellow');
    return 0;
  }

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  let copiedCount = 0;
  const entries = fs.readdirSync(src, { withFileTypes: true });

  entries.forEach(entry => {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copiedCount += copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      copiedCount++;
    }
  });

  return copiedCount;
}

/**
 * Migre l'ancienne documentation /DOCUMENTATION/ → /sos/docs/
 */
function migrateOldDocumentation() {
  log('\n📦 Migration de l\'ancienne documentation /DOCUMENTATION/...', 'cyan');

  if (!fs.existsSync(OLD_DOCUMENTATION)) {
    log('⚠️  Dossier DOCUMENTATION/ non trouvé', 'yellow');
    return { migrated: 0, sections: [] };
  }

  const sections = fs.readdirSync(OLD_DOCUMENTATION);
  let totalMigrated = 0;
  const migratedSections = [];

  sections.forEach(section => {
    const srcPath = path.join(OLD_DOCUMENTATION, section);

    // Ignorer les fichiers (seulement traiter les dossiers)
    const stats = fs.statSync(srcPath);
    if (!stats.isDirectory()) {
      log(`⏭️  Ignoré (fichier): ${section}`, 'yellow');
      return;
    }

    // Mapper les anciennes sections vers les nouvelles
    const sectionMap = {
      '00_INDEX': '00-INDEX',
      '01_GETTING_STARTED': '01-GETTING-STARTED',
      '02_ARCHITECTURE': '02-ARCHITECTURE',
      '03_FRONTEND': '07-DEVELOPMENT/frontend',
      '04_BACKEND': '07-DEVELOPMENT/backend',
      '05_PAYMENTS': '03-FEATURES/payments',
      '06_AFFILIATION': '04-AFFILIATE',
      '07_SECURITY': '06-OPERATIONS/security',
      '08_OPERATIONS': '06-OPERATIONS',
    };

    const destSection = sectionMap[section] || `09-ARCHIVES/old-documentation/${section}`;
    const destPath = path.join(NEW_DOCS, destSection);

    const copied = copyRecursive(srcPath, destPath);
    if (copied > 0) {
      totalMigrated += copied;
      migratedSections.push({ section, copied, destination: destSection });
      log(`✅ Migré: ${section} → ${destSection} (${copied} fichiers)`, 'green');
    }
  });

  // Archiver le dossier original
  if (totalMigrated > 0) {
    const archivePath = path.join(ARCHIVES_DIR, 'DOCUMENTATION-backup');
    if (!fs.existsSync(archivePath)) {
      fs.renameSync(OLD_DOCUMENTATION, archivePath);
      log(`✅ Dossier original archivé → 09-ARCHIVES/DOCUMENTATION-backup`, 'green');
    }
  }

  return { migrated: totalMigrated, sections: migratedSections };
}

/**
 * Migre /docs/ (racine) vers les projets appropriés
 */
function migrateRootDocs() {
  log('\n📦 Migration de /docs/ (racine)...', 'cyan');

  if (!fs.existsSync(ROOT_DOCS)) {
    log('⚠️  Dossier docs/ non trouvé', 'yellow');
    return { migrated: 0, files: [] };
  }

  const migrations = {
    'cahier-des-charges-telegram-tool.md': path.join(PROJECT_ROOT, 'Telegram-Engine', 'docs'),
    'GUIDE_INSTALLATION_COMPLETE.md': path.join(NEW_DOCS, '01-GETTING-STARTED'),
    'GUIDE_RECUPERATION_COMPLETE.md': path.join(NEW_DOCS, '06-OPERATIONS'),
    'TWILIO_CALL_WORKFLOW.md': path.join(NEW_DOCS, '03-FEATURES'),
    'TWILIO_CALL_WORKFLOW_COMPLET.md': path.join(NEW_DOCS, '03-FEATURES'),
  };

  let migratedCount = 0;
  const migratedFiles = [];

  Object.entries(migrations).forEach(([filename, destination]) => {
    const srcPath = path.join(ROOT_DOCS, filename);
    const destPath = path.join(destination, filename);

    if (fs.existsSync(srcPath)) {
      if (!fs.existsSync(destination)) {
        fs.mkdirSync(destination, { recursive: true });
      }

      fs.copyFileSync(srcPath, destPath);
      migratedCount++;
      migratedFiles.push({ filename, destination: destination.replace(PROJECT_ROOT, '.') });
      log(`✅ Migré: ${filename} → ${destination.replace(PROJECT_ROOT, '.')}`, 'green');
    } else {
      log(`⚠️  Non trouvé: ${filename}`, 'yellow');
    }
  });

  // Archiver /docs/ original si migration réussie
  if (migratedCount > 0) {
    const archivePath = path.join(ARCHIVES_DIR, 'docs-root-backup');
    if (!fs.existsSync(archivePath)) {
      fs.renameSync(ROOT_DOCS, archivePath);
      log(`✅ Dossier original archivé → 09-ARCHIVES/docs-root-backup`, 'green');
    }
  }

  return { migrated: migratedCount, files: migratedFiles };
}

/**
 * Archive /All_Explains/
 */
function archiveAllExplains() {
  log('\n📦 Archivage de /All_Explains/...', 'cyan');

  if (!fs.existsSync(ALL_EXPLAINS)) {
    log('⚠️  Dossier All_Explains/ non trouvé', 'yellow');
    return { archived: 0 };
  }

  const archivePath = path.join(ARCHIVES_DIR, 'All_Explains');
  const copied = copyRecursive(ALL_EXPLAINS, archivePath);

  if (copied > 0) {
    fs.rmSync(ALL_EXPLAINS, { recursive: true, force: true });
    log(`✅ Archivé: All_Explains/ → 09-ARCHIVES/All_Explains (${copied} fichiers)`, 'green');
  }

  return { archived: copied };
}

/**
 * Renomme "Outils d'emailing" → email-tools
 */
function renameEmailTools() {
  log('\n🔄 Renommage "Outils d\'emailing" → email-tools...', 'cyan');

  if (!fs.existsSync(OUTILS_EMAILING)) {
    log('⚠️  Dossier "Outils d\'emailing" non trouvé', 'yellow');
    return { renamed: false };
  }

  fs.renameSync(OUTILS_EMAILING, EMAIL_TOOLS);
  log('✅ Renommé: "Outils d\'emailing" → email-tools', 'green');

  return { renamed: true };
}

/**
 * Crée un README dans email-tools
 */
function createEmailToolsReadme() {
  const readmePath = path.join(EMAIL_TOOLS, 'README.md');

  if (fs.existsSync(readmePath)) {
    log('⚠️  README.md existe déjà dans email-tools/', 'yellow');
    return;
  }

  const content = `# Email Tools

> Outils et templates pour les campagnes d'emailing et backlink.

---

## 📁 Contenu

- **templates/** - Templates d'emails
- **scripts/** - Scripts d'automatisation
- **backup-cold/** - Backups

---

## 📚 Documentation

- [TEMPLATES_ORGANISATION.md](./TEMPLATES_ORGANISATION.md) - Organisation des templates
- [PLAN_MIGRATION_HETZNER.md](./PLAN_MIGRATION_HETZNER.md) - Plan migration serveur
- [SECURITY_ACTIONS.md](./SECURITY_ACTIONS.md) - Actions de sécurité

---

**Email Tools © 2024-2026**
`;

  fs.writeFileSync(readmePath, content, 'utf8');
  log('✅ Créé: email-tools/README.md', 'green');
}

/**
 * Génère le rapport de migration
 */
function generateMigrationReport(results) {
  log('\n📄 Génération du rapport de migration...', 'cyan');

  const timestamp = new Date().toISOString().split('T')[0];
  const reportPath = path.join(ARCHIVES_DIR, 'migration-reports', `migrate-remaining-${timestamp}.md`);

  const report = `# Rapport de Migration de la Documentation Restante

**Date** : ${new Date().toLocaleString('fr-FR')}
**Script** : \`scripts/migrate-remaining-docs.js\`

---

## 📊 Résumé

| Opération | Résultat |
|-----------|----------|
| **Fichiers migrés (DOCUMENTATION/)** | ${results.oldDocs.migrated} |
| **Sections migrées** | ${results.oldDocs.sections.length} |
| **Fichiers migrés (docs/)** | ${results.rootDocs.migrated} |
| **Fichiers archivés (All_Explains)** | ${results.allExplains.archived} |
| **Dossier renommé** | ${results.emailTools.renamed ? '✅ Oui' : '❌ Non'} |

---

## 📦 Migration /DOCUMENTATION/ → /sos/docs/

**Total fichiers migrés** : ${results.oldDocs.migrated}

### Sections Migrées

${results.oldDocs.sections.length > 0 ? results.oldDocs.sections.map(s =>
  `- **${s.section}** → \`${s.destination}\` (${s.copied} fichiers)`
).join('\n') : '_Aucune_'}

---

## 📦 Migration /docs/ (racine)

**Total fichiers migrés** : ${results.rootDocs.migrated}

${results.rootDocs.files.length > 0 ? results.rootDocs.files.map(f =>
  `- \`${f.filename}\` → \`${f.destination}\``
).join('\n') : '_Aucun_'}

---

## 📦 Archivage All_Explains/

**Fichiers archivés** : ${results.allExplains.archived}

**Destination** : \`sos/docs/09-ARCHIVES/All_Explains/\`

---

## 🔄 Renommage Dossier

- **"Outils d'emailing"** → **email-tools** : ${results.emailTools.renamed ? '✅ Renommé' : '❌ Non effectué'}

---

## ✅ Structure Finale

\`\`\`
sos-expat-project/
├── email-tools/             # Outils d'emailing (renommé)
│   ├── README.md            # ✅ NOUVEAU
│   ├── templates/
│   ├── scripts/
│   └── backup-cold/
│
├── sos/
│   └── docs/                # Documentation centralisée
│       ├── 00-INDEX/
│       ├── 01-GETTING-STARTED/
│       │   └── GUIDE_INSTALLATION_COMPLETE.md  # ✅ Migré
│       ├── 02-ARCHITECTURE/
│       ├── 03-FEATURES/
│       │   ├── TWILIO_CALL_WORKFLOW.md          # ✅ Migré
│       │   └── TWILIO_CALL_WORKFLOW_COMPLET.md  # ✅ Migré
│       ├── 04-AFFILIATE/
│       ├── 05-DEPLOYMENT/
│       ├── 06-OPERATIONS/
│       │   └── GUIDE_RECUPERATION_COMPLETE.md   # ✅ Migré
│       ├── 07-DEVELOPMENT/
│       ├── 08-API-REFERENCE/
│       └── 09-ARCHIVES/
│           ├── DOCUMENTATION-backup/    # Ancienne doc
│           ├── docs-root-backup/        # Ancien /docs/
│           └── All_Explains/            # Anciennes explications
│
└── Telegram-Engine/
    └── docs/
        └── cahier-des-charges-telegram-tool.md  # ✅ Migré
\`\`\`

---

## 🎯 Résultat

**Organisation parfaite de la documentation !**

- ✅ Ancienne documentation /DOCUMENTATION/ migrée
- ✅ Documentation racine /docs/ migrée
- ✅ All_Explains archivé
- ✅ email-tools renommé et documenté

---

**Migration effectuée avec succès !** 🎉
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
  log('  📚 MIGRATION DE LA DOCUMENTATION RESTANTE - SOS EXPAT', 'bright');
  log('='.repeat(60) + '\n', 'bright');

  try {
    // Étape 1 : Migrer /DOCUMENTATION/
    const oldDocs = migrateOldDocumentation();

    // Étape 2 : Migrer /docs/ (racine)
    const rootDocs = migrateRootDocs();

    // Étape 3 : Archiver All_Explains
    const allExplains = archiveAllExplains();

    // Étape 4 : Renommer email tools
    const emailTools = renameEmailTools();

    // Étape 5 : Créer README email-tools
    if (emailTools.renamed) {
      createEmailToolsReadme();
    }

    // Étape 6 : Générer le rapport
    const results = { oldDocs, rootDocs, allExplains, emailTools };
    const reportPath = generateMigrationReport(results);

    // Résumé final
    const totalMigrated = oldDocs.migrated + rootDocs.migrated + allExplains.archived;

    log('\n' + '='.repeat(60), 'bright');
    log('  ✅ MIGRATION TERMINÉE AVEC SUCCÈS !', 'green');
    log('='.repeat(60), 'bright');

    log('\n📊 Statistiques :', 'cyan');
    log(`   - Fichiers DOCUMENTATION/ migrés : ${oldDocs.migrated}`, 'green');
    log(`   - Fichiers docs/ migrés : ${rootDocs.migrated}`, 'green');
    log(`   - Fichiers All_Explains archivés : ${allExplains.archived}`, 'yellow');
    log(`   - Email tools renommé : ${emailTools.renamed ? '✅' : '❌'}`, emailTools.renamed ? 'green' : 'red');
    log(`   - TOTAL TRAITÉ : ${totalMigrated}`, 'bright');

    log('\n📄 Rapport de migration :', 'cyan');
    log(`   ${reportPath}`, 'blue');

    log('\n🎯 Prochaines étapes :', 'cyan');
    log('   1. Vérifier les fichiers migrés dans sos/docs/', 'reset');
    log('   2. Vérifier Telegram-Engine/docs/', 'reset');
    log('   3. Vérifier email-tools/', 'reset');
    log('   4. Supprimer les dossiers archivés si tout est OK\n', 'reset');

  } catch (error) {
    log('\n❌ ERREUR lors de la migration :', 'red');
    log(error.message, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Exécution
main();
