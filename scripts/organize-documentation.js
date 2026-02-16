#!/usr/bin/env node

/**
 * Script de Réorganisation de la Documentation - SOS Expat Project
 *
 * Ce script :
 * 1. Crée l'arborescence complète /sos/docs/
 * 2. Déplace les fichiers obsolètes vers /sos/docs/09-ARCHIVES/
 * 3. Garde les fichiers essentiels à la racine
 * 4. Génère un rapport de migration
 *
 * Usage: node scripts/organize-documentation.js
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
const DOCS_DIR = path.join(PROJECT_ROOT, 'sos', 'docs');
const ARCHIVE_DIR = path.join(DOCS_DIR, '09-ARCHIVES', 'old-root-docs');

// Structure complète des dossiers de documentation
const DOCS_STRUCTURE = [
  '00-INDEX',
  '01-GETTING-STARTED',
  '02-ARCHITECTURE',
  '03-FEATURES',
  '04-AFFILIATE',
  '05-DEPLOYMENT',
  '06-OPERATIONS',
  '07-DEVELOPMENT',
  '08-API-REFERENCE',
  '09-ARCHIVES/old-root-docs',
  '09-ARCHIVES/migration-reports',
];

// Fichiers à garder à la racine du projet
const FILES_TO_KEEP = [
  'README.md',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'LICENSE',
  '.gitignore',
  '.env.example',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'vite.config.ts',
  'tailwind.config.js',
  'postcss.config.js',
];

// Fichiers à archiver (62 fichiers obsolètes identifiés)
const FILES_TO_ARCHIVE = [
  // Backlink Engine (18 fichiers)
  'BACKLINK-ENGINE-ACTIONS-URGENTES.md',
  'BACKLINK-ENGINE-AUDIT-COMPLET.md',
  'BACKLINK-ENGINE-BUGS-CORRIGES.md',
  'BACKLINK-ENGINE-CORRECTIONS-EFFECTUEES.md',
  'BACKLINK-ENGINE-DOCUMENTATION-COMPLETE.md',
  'BACKLINK-ENGINE-ETAT-FINAL-COMPLET.md',
  'BACKLINK-ENGINE-ETAT-PRODUCTION-FINAL.md',
  'BACKLINK-ENGINE-NETTOYAGE-COMPLET.md',
  'BACKLINK-ENGINE-RESUME-FINAL.md',
  'BACKLINK-ENGINE-TESTS-MANUELS.md',
  'BACKLINK-ENGINE-TRAVAUX-FINAUX.md',
  'BACKLINK-ENGINE-VERIFICATION-COMPLETE.md',
  'BACKLINK-ENGINE-VERIFICATION-FINALE.md',
  'BACKLINK-ENGINE-DEPLOY.md',
  'BACKLINK-ENGINE-STATUS.md',
  'BACKLINK-ENGINE-TODO.md',
  'BACKLINK-ENGINE-MIGRATIONS.md',
  'BACKLINK-ENGINE-API-DOCS.md',

  // Chatter (11 fichiers)
  'CHATTER_HOOKS_AUDIT.md',
  'CHATTER_MAINTENANCE_REFERENCE.md',
  'CHATTER-DASHBOARD-STATUS.md',
  'CHATTER-FLOW-ANALYSIS.md',
  'CHATTER-FRONTEND-AUDIT.md',
  'CHATTER-HOOKS-COMPLETE.md',
  'CHATTER-ROUTES-AUDIT.md',
  'CHATTER-SIMPLIFICATION-COMPLETE.md',
  'CHATTER-TELEGRAM-INTEGRATION.md',
  'CHATTER-VERIFICATION.md',
  'RAPPORT-ANALYSE-REGIONS-CHATTER.md',

  // Influencer (12 fichiers)
  'INFLUENCER_FRONTEND_AUDIT.md',
  'INFLUENCER_ROUTES_AUDIT.md',
  'INFLUENCER-DASHBOARD-STATUS.md',
  'INFLUENCER-FLOW-ANALYSIS.md',
  'INFLUENCER-HOOKS-COMPLETE.md',
  'INFLUENCER-ROUTES-COMPLETE.md',
  'INFLUENCER-SIMPLIFICATION.md',
  'INFLUENCER-VERIFICATION.md',
  'INFLUENCER-FRONTEND-COMPLETE.md',
  'INFLUENCER-BACKEND-AUDIT.md',
  'INFLUENCER-TELEGRAM-SETUP.md',
  'INFLUENCER-BONUS-SYSTEM.md',

  // Rapports d'audit généraux (9 fichiers)
  'RAPPORT-AUDIT-ARCHITECTURE-COMPLETE-2026-02-15.md',
  'RAPPORT-FINAL-2026-02-16.md',
  'RAPPORT-CORRECTIONS-INSCRIPTION.md',
  'RAPPORT-TEST-INTEGRATION-STRIPE.md',
  'TESTS-VERIFICATION-COMPLETE-2026-02-16.md',
  'STATUT-FINAL-CORRECTIONS.md',
  'AUDIT-COMPLET-2026.md',
  'VERIFICATION-FINALE.md',
  'DEPLOIEMENT-STATUS.md',

  // Autres fichiers obsolètes (12 fichiers)
  'BLOGGER-COMPLETE.md',
  'GROUPADMIN-COMPLETE.md',
  'AFFILIATE-SYSTEM-OVERVIEW.md',
  'MULTI-PROVIDER-BUG-FIX.md',
  'PAYMENT-SYSTEM-REFACTOR.md',
  'STRIPE-PAYPAL-INTEGRATION.md',
  'TWILIO-CALL-FLOW.md',
  'FIREBASE-REGIONS-MIGRATION.md',
  'FRONTEND-CLOUDFLARE-DEPLOY.md',
  'BACKEND-FUNCTIONS-DEPLOY.md',
  'SECURITY-AUDIT-2026.md',
  'PERFORMANCE-OPTIMIZATION.md',
];

/**
 * Crée l'arborescence des dossiers de documentation
 */
function createDocsStructure() {
  log('\n📁 Création de l\'arborescence de documentation...', 'cyan');

  // Créer le dossier docs principal
  if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
    log(`✅ Créé: ${DOCS_DIR}`, 'green');
  }

  // Créer tous les sous-dossiers
  DOCS_STRUCTURE.forEach(folder => {
    const folderPath = path.join(DOCS_DIR, folder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
      log(`✅ Créé: sos/docs/${folder}`, 'green');
    }
  });
}

/**
 * Déplace les fichiers obsolètes vers les archives
 */
function archiveObsoleteFiles() {
  log('\n📦 Archivage des fichiers obsolètes...', 'cyan');

  let movedCount = 0;
  let notFoundCount = 0;
  const movedFiles = [];
  const notFoundFiles = [];

  FILES_TO_ARCHIVE.forEach(filename => {
    const sourcePath = path.join(PROJECT_ROOT, filename);
    const destPath = path.join(ARCHIVE_DIR, filename);

    if (fs.existsSync(sourcePath)) {
      // Déplacer le fichier
      fs.renameSync(sourcePath, destPath);
      movedFiles.push(filename);
      movedCount++;
      log(`✅ Archivé: ${filename}`, 'green');
    } else {
      notFoundFiles.push(filename);
      notFoundCount++;
      log(`⚠️  Non trouvé: ${filename}`, 'yellow');
    }
  });

  log(`\n📊 Résumé: ${movedCount} fichiers archivés, ${notFoundCount} non trouvés`, 'bright');

  return { movedFiles, notFoundFiles };
}

/**
 * Génère un fichier INDEX.md dans chaque section
 */
function generateIndexFiles() {
  log('\n📝 Génération des fichiers INDEX.md...', 'cyan');

  const sections = {
    '00-INDEX': {
      title: 'Index de la Documentation',
      description: 'Navigation principale de toute la documentation SOS Expat',
    },
    '01-GETTING-STARTED': {
      title: 'Guide de Démarrage',
      description: 'Installation, configuration, premiers pas',
    },
    '02-ARCHITECTURE': {
      title: 'Architecture',
      description: 'Architecture système, multi-région, stack technique',
    },
    '03-FEATURES': {
      title: 'Fonctionnalités',
      description: 'Documentation des fonctionnalités principales',
    },
    '04-AFFILIATE': {
      title: 'Système Affiliate',
      description: 'Chatter, Influencer, Blogger, GroupAdmin',
    },
    '05-DEPLOYMENT': {
      title: 'Déploiement',
      description: 'Guides de déploiement Frontend, Backend, Infrastructure',
    },
    '06-OPERATIONS': {
      title: 'Opérations',
      description: 'Monitoring, backups, sécurité, maintenance',
    },
    '07-DEVELOPMENT': {
      title: 'Guide Développeur',
      description: 'Standards de code, workflows, bonnes pratiques',
    },
    '08-API-REFERENCE': {
      title: 'Référence API',
      description: 'Documentation complète des APIs et schémas',
    },
  };

  Object.entries(sections).forEach(([folder, meta]) => {
    const indexPath = path.join(DOCS_DIR, folder, 'INDEX.md');

    const content = `# ${meta.title}

> ${meta.description}

---

## 📂 Contenu de cette Section

<!-- TODO: Ajouter la liste des fichiers de cette section -->

---

## 🔗 Navigation

- [← Retour à l'Index Principal](../00-INDEX/INDEX.md)
- [📐 Architecture](../02-ARCHITECTURE/INDEX.md)
- [🚀 Déploiement](../05-DEPLOYMENT/INDEX.md)

---

**Documentation SOS Expat © 2024-2026**
`;

    if (!fs.existsSync(indexPath)) {
      fs.writeFileSync(indexPath, content, 'utf8');
      log(`✅ Créé: sos/docs/${folder}/INDEX.md`, 'green');
    }
  });
}

/**
 * Génère le rapport de migration
 */
function generateMigrationReport(movedFiles, notFoundFiles) {
  log('\n📄 Génération du rapport de migration...', 'cyan');

  const timestamp = new Date().toISOString().split('T')[0];
  const reportPath = path.join(DOCS_DIR, '09-ARCHIVES', 'migration-reports', `migration-${timestamp}.md`);

  const report = `# Rapport de Migration de Documentation

**Date** : ${new Date().toLocaleString('fr-FR')}
**Script** : \`scripts/organize-documentation.js\`

---

## 📊 Résumé

- **Fichiers archivés** : ${movedFiles.length}
- **Fichiers non trouvés** : ${notFoundFiles.length}
- **Dossiers créés** : ${DOCS_STRUCTURE.length}

---

## ✅ Fichiers Archivés (${movedFiles.length})

${movedFiles.map(f => `- \`${f}\``).join('\n')}

---

## ⚠️ Fichiers Non Trouvés (${notFoundFiles.length})

${notFoundFiles.length > 0 ? notFoundFiles.map(f => `- \`${f}\``).join('\n') : '_Aucun_'}

---

## 📁 Structure Créée

\`\`\`
sos/docs/
${DOCS_STRUCTURE.map(f => `├── ${f}/`).join('\n')}
\`\`\`

---

## 🎯 Prochaines Étapes

1. ✅ Structure de base créée
2. ⏳ Remplir chaque section avec du contenu pertinent
3. ⏳ Mettre à jour les liens inter-documents
4. ⏳ Générer la table des matières principale

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
  log('  📚 RÉORGANISATION DE LA DOCUMENTATION - SOS EXPAT', 'bright');
  log('='.repeat(60) + '\n', 'bright');

  try {
    // Étape 1 : Créer l'arborescence
    createDocsStructure();

    // Étape 2 : Archiver les fichiers obsolètes
    const { movedFiles, notFoundFiles } = archiveObsoleteFiles();

    // Étape 3 : Générer les fichiers INDEX
    generateIndexFiles();

    // Étape 4 : Générer le rapport
    const reportPath = generateMigrationReport(movedFiles, notFoundFiles);

    // Résumé final
    log('\n' + '='.repeat(60), 'bright');
    log('  ✅ MIGRATION TERMINÉE AVEC SUCCÈS !', 'green');
    log('='.repeat(60), 'bright');

    log('\n📊 Statistiques :', 'cyan');
    log(`   - Fichiers archivés : ${movedFiles.length}`, 'green');
    log(`   - Fichiers non trouvés : ${notFoundFiles.length}`, 'yellow');
    log(`   - Dossiers créés : ${DOCS_STRUCTURE.length}`, 'green');

    log('\n📄 Rapport de migration :', 'cyan');
    log(`   ${reportPath}`, 'blue');

    log('\n🎯 Prochaines étapes :', 'cyan');
    log('   1. Vérifier le contenu archivé dans sos/docs/09-ARCHIVES/old-root-docs/', 'reset');
    log('   2. Remplir les sections avec du contenu pertinent', 'reset');
    log('   3. Mettre à jour les liens inter-documents', 'reset');
    log('   4. Générer la table des matières principale\n', 'reset');

  } catch (error) {
    log('\n❌ ERREUR lors de la migration :', 'red');
    log(error.message, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Exécution
main();
