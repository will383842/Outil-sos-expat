#!/usr/bin/env node

/**
 * ============================================================================
 * SCRIPT DE VÉRIFICATION DE SÉCURITÉ
 * ============================================================================
 *
 * Ce script effectue un audit automatisé de votre projet Firebase pour
 * identifier les problèmes de sécurité potentiels.
 *
 * Usage : npm run audit
 *
 * Ce que le script vérifie :
 * - Membres IAM du projet (via gcloud CLI si disponible)
 * - Service accounts et leurs clés
 * - Configuration Firebase Functions
 * - Fichiers .env et leurs variables sensibles
 * - Génère un rapport de sécurité complet
 */

import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';
import Table from 'cli-table3';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import CONFIG from './config.js';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// RAPPORT DE SÉCURITÉ
// ============================================================================

const securityReport = {
  timestamp: new Date().toISOString(),
  projectId: CONFIG.firebase.projectId,
  gcloudAvailable: false,
  findings: [],
  iamMembers: [],
  serviceAccounts: [],
  envFiles: [],
  recommendations: [],
};

// ============================================================================
// UTILITAIRES
// ============================================================================

function addFinding(severity, category, message, recommendation = null) {
  securityReport.findings.push({
    severity, // 'critical', 'high', 'medium', 'low', 'info'
    category,
    message,
    recommendation,
  });
}

function showHeader() {
  console.log(boxen(
    chalk.bold.cyan('🔍 AUDIT DE SÉCURITÉ FIREBASE\n') +
    chalk.gray(`Projet : ${CONFIG.firebase.projectId}\n`) +
    chalk.gray(`Date : ${new Date().toLocaleString('fr-FR')}`),
    {
      padding: 1,
      margin: 1,
      borderStyle: 'double',
      borderColor: 'cyan',
    }
  ));
}

// ============================================================================
// VÉRIFICATION GCLOUD CLI
// ============================================================================

async function checkGcloudCLI() {
  const spinner = ora('Vérification de gcloud CLI...').start();

  try {
    const { stdout } = await execAsync('gcloud --version');
    securityReport.gcloudAvailable = true;
    spinner.succeed(chalk.green('gcloud CLI disponible'));
    return true;
  } catch (error) {
    spinner.warn(chalk.yellow('gcloud CLI non disponible - certaines vérifications seront limitées'));
    addFinding('info', 'Configuration', 'gcloud CLI non installé', 'Installez gcloud CLI pour un audit complet');
    return false;
  }
}

// ============================================================================
// VÉRIFICATION DES MEMBRES IAM
// ============================================================================

async function checkIAMMembers() {
  const spinner = ora('Récupération des membres IAM...').start();

  if (!securityReport.gcloudAvailable) {
    spinner.info(chalk.gray('Sauté (gcloud non disponible)'));
    console.log(chalk.yellow('\n📋 Commande à exécuter manuellement :\n'));
    console.log(chalk.cyan(`   gcloud projects get-iam-policy ${CONFIG.firebase.projectId} --format="table(bindings.role,bindings.members)"\n`));
    return;
  }

  try {
    const { stdout } = await execAsync(
      `gcloud projects get-iam-policy ${CONFIG.firebase.projectId} --format=json`
    );

    const policy = JSON.parse(stdout);
    const members = new Map();

    policy.bindings.forEach(binding => {
      binding.members.forEach(member => {
        if (!members.has(member)) {
          members.set(member, []);
        }
        members.get(member).push(binding.role);
      });
    });

    securityReport.iamMembers = Array.from(members.entries()).map(([member, roles]) => ({
      member,
      roles,
      type: member.split(':')[0],
    }));

    spinner.succeed(chalk.green(`${members.size} membres IAM trouvés`));

    // Afficher le tableau
    const table = new Table({
      head: [chalk.cyan('Type'), chalk.cyan('Membre'), chalk.cyan('Rôles')],
      colWidths: [15, 40, 45],
      wordWrap: true,
    });

    members.forEach((roles, member) => {
      const type = member.split(':')[0];
      const email = member.split(':')[1] || member;
      table.push([type, email, roles.join('\n')]);
    });

    console.log('\n' + table.toString());

    // Vérifications de sécurité
    members.forEach((roles, member) => {
      // Vérifier les rôles Owner ou Editor
      if (roles.some(r => r.includes('owner') || r.includes('editor'))) {
        const type = member.split(':')[0];
        if (type === 'user') {
          addFinding(
            'high',
            'IAM',
            `Utilisateur avec rôle élevé : ${member}`,
            'Vérifiez que cet utilisateur a besoin de ce niveau d\'accès'
          );
        }
      }

      // Vérifier les allUsers ou allAuthenticatedUsers
      if (member === 'allUsers' || member === 'allAuthenticatedUsers') {
        addFinding(
          'critical',
          'IAM',
          `Accès public détecté : ${member}`,
          'Retirez cet accès sauf si absolument nécessaire'
        );
      }
    });

  } catch (error) {
    spinner.fail(chalk.red('Erreur lors de la récupération IAM'));
    console.error(chalk.red(error.message));
  }
}

// ============================================================================
// VÉRIFICATION DES SERVICE ACCOUNTS
// ============================================================================

async function checkServiceAccounts() {
  const spinner = ora('Récupération des service accounts...').start();

  if (!securityReport.gcloudAvailable) {
    spinner.info(chalk.gray('Sauté (gcloud non disponible)'));
    console.log(chalk.yellow('\n📋 Commandes à exécuter manuellement :\n'));
    console.log(chalk.cyan(`   # Lister les service accounts`));
    console.log(chalk.cyan(`   gcloud iam service-accounts list --project=${CONFIG.firebase.projectId}\n`));
    console.log(chalk.cyan(`   # Pour chaque service account, lister les clés`));
    console.log(chalk.cyan(`   gcloud iam service-accounts keys list --iam-account=SERVICE_ACCOUNT_EMAIL\n`));
    return;
  }

  try {
    const { stdout } = await execAsync(
      `gcloud iam service-accounts list --project=${CONFIG.firebase.projectId} --format=json`
    );

    const serviceAccounts = JSON.parse(stdout);
    spinner.succeed(chalk.green(`${serviceAccounts.length} service accounts trouvés`));

    // Pour chaque SA, récupérer les clés
    for (const sa of serviceAccounts) {
      const saSpinner = ora(`Vérification des clés pour ${sa.email}...`).start();

      try {
        const { stdout: keysStdout } = await execAsync(
          `gcloud iam service-accounts keys list --iam-account=${sa.email} --format=json`
        );

        const keys = JSON.parse(keysStdout);

        // Filtrer les clés utilisateur (pas les clés système)
        const userKeys = keys.filter(k => k.keyType === 'USER_MANAGED');

        securityReport.serviceAccounts.push({
          email: sa.email,
          displayName: sa.displayName,
          disabled: sa.disabled,
          totalKeys: keys.length,
          userManagedKeys: userKeys.length,
          keys: userKeys.map(k => ({
            keyId: k.name.split('/').pop(),
            validAfter: k.validAfterTime,
            validBefore: k.validBeforeTime,
          })),
        });

        // Vérifications de sécurité
        if (userKeys.length > 0) {
          addFinding(
            'medium',
            'Service Account',
            `${sa.email} a ${userKeys.length} clé(s) utilisateur`,
            'Vérifiez que ces clés sont toujours nécessaires et connues'
          );
        }

        // Vérifier les clés anciennes (plus de 90 jours)
        userKeys.forEach(key => {
          const createdDate = new Date(key.validAfterTime);
          const daysSinceCreation = Math.floor((Date.now() - createdDate) / (1000 * 60 * 60 * 24));

          if (daysSinceCreation > 90) {
            addFinding(
              'high',
              'Service Account',
              `Clé ancienne détectée (${daysSinceCreation} jours) pour ${sa.email}`,
              'Régénérez cette clé et supprimez l\'ancienne'
            );
          }
        });

        saSpinner.succeed(`${sa.email}: ${userKeys.length} clé(s) utilisateur`);

      } catch (error) {
        saSpinner.fail(`Erreur pour ${sa.email}`);
      }
    }

    // Afficher le tableau récapitulatif
    const table = new Table({
      head: [chalk.cyan('Service Account'), chalk.cyan('Clés User'), chalk.cyan('Statut')],
      colWidths: [50, 15, 15],
    });

    securityReport.serviceAccounts.forEach(sa => {
      const status = sa.disabled ? chalk.red('Désactivé') : chalk.green('Actif');
      const keyCount = sa.userManagedKeys > 0
        ? chalk.yellow(sa.userManagedKeys.toString())
        : chalk.green('0');
      table.push([sa.email, keyCount, status]);
    });

    console.log('\n' + table.toString());

  } catch (error) {
    spinner.fail(chalk.red('Erreur lors de la récupération des service accounts'));
    console.error(chalk.red(error.message));
  }
}

// ============================================================================
// VÉRIFICATION DES FICHIERS .ENV
// ============================================================================

async function checkEnvFiles() {
  const spinner = ora('Analyse des fichiers .env...').start();

  const envFiles = [];
  const sensitivePatterns = [
    { pattern: /secret/i, severity: 'critical' },
    { pattern: /private/i, severity: 'critical' },
    { pattern: /password/i, severity: 'critical' },
    { pattern: /api_key/i, severity: 'high' },
    { pattern: /apikey/i, severity: 'high' },
    { pattern: /token/i, severity: 'high' },
    { pattern: /auth/i, severity: 'medium' },
  ];

  for (const envPath of CONFIG.filesToCheck) {
    const fullPath = path.resolve(__dirname, envPath);

    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));

      const variables = lines.map(line => {
        const [key] = line.split('=');
        return key?.trim();
      }).filter(Boolean);

      const sensitiveVars = variables.filter(v =>
        sensitivePatterns.some(p => p.pattern.test(v))
      );

      envFiles.push({
        path: envPath,
        fullPath,
        totalVars: variables.length,
        sensitiveVars,
      });

      if (sensitiveVars.length > 0) {
        addFinding(
          'info',
          'Fichiers .env',
          `${envPath} contient ${sensitiveVars.length} variable(s) sensible(s)`,
          'Ces variables devront être mises à jour après rotation des clés'
        );
      }
    }
  }

  securityReport.envFiles = envFiles;

  if (envFiles.length > 0) {
    spinner.succeed(chalk.green(`${envFiles.length} fichier(s) .env analysé(s)`));

    const table = new Table({
      head: [chalk.cyan('Fichier'), chalk.cyan('Variables'), chalk.cyan('Sensibles')],
      colWidths: [35, 15, 15],
    });

    envFiles.forEach(f => {
      table.push([
        f.path,
        f.totalVars.toString(),
        f.sensitiveVars.length > 0 ? chalk.yellow(f.sensitiveVars.length.toString()) : '0',
      ]);
    });

    console.log('\n' + table.toString());

    // Lister les variables sensibles
    const allSensitiveVars = [...new Set(envFiles.flatMap(f => f.sensitiveVars))];
    if (allSensitiveVars.length > 0) {
      console.log(chalk.yellow('\n📋 Variables sensibles détectées :'));
      allSensitiveVars.forEach(v => console.log(`   • ${v}`));
    }
  } else {
    spinner.warn(chalk.yellow('Aucun fichier .env trouvé'));
  }
}

// ============================================================================
// VÉRIFICATION FIREBASE FUNCTIONS CONFIG
// ============================================================================

async function checkFirebaseFunctionsConfig() {
  const spinner = ora('Vérification Firebase Functions config...').start();

  console.log(chalk.yellow('\n📋 Commande à exécuter manuellement :\n'));
  console.log(chalk.cyan(`   firebase functions:config:get --project=${CONFIG.firebase.projectId}\n`));

  spinner.info(chalk.gray('Exécutez la commande ci-dessus pour voir la configuration'));

  addFinding(
    'info',
    'Firebase Functions',
    'Vérifiez manuellement la configuration Firebase Functions',
    `Exécutez : firebase functions:config:get --project=${CONFIG.firebase.projectId}`
  );
}

// ============================================================================
// GÉNÉRATION DU RAPPORT
// ============================================================================

function generateReport() {
  console.log('\n');
  console.log(boxen(
    chalk.bold.cyan('📊 RAPPORT DE SÉCURITÉ'),
    { padding: 1, borderStyle: 'double', borderColor: 'cyan' }
  ));

  // Résumé des findings par sévérité
  const severityCounts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  securityReport.findings.forEach(f => {
    severityCounts[f.severity]++;
  });

  console.log('\n' + chalk.bold('Résumé des findings :'));
  console.log(`  ${chalk.bgRed.white(' CRITICAL ')} ${severityCounts.critical}`);
  console.log(`  ${chalk.bgYellow.black(' HIGH ')}     ${severityCounts.high}`);
  console.log(`  ${chalk.bgBlue.white(' MEDIUM ')}   ${severityCounts.medium}`);
  console.log(`  ${chalk.bgGray.white(' LOW ')}      ${severityCounts.low}`);
  console.log(`  ${chalk.bgCyan.black(' INFO ')}     ${severityCounts.info}`);

  // Afficher les findings détaillés
  if (securityReport.findings.length > 0) {
    console.log('\n' + chalk.bold.underline('Détails des findings :\n'));

    const severityColors = {
      critical: chalk.red,
      high: chalk.yellow,
      medium: chalk.blue,
      low: chalk.gray,
      info: chalk.cyan,
    };

    securityReport.findings.forEach((finding, index) => {
      const color = severityColors[finding.severity];
      console.log(`${index + 1}. ${color(`[${finding.severity.toUpperCase()}]`)} ${chalk.bold(finding.category)}`);
      console.log(`   ${finding.message}`);
      if (finding.recommendation) {
        console.log(`   ${chalk.green('→')} ${finding.recommendation}`);
      }
      console.log('');
    });
  }

  // Recommandations générales
  securityReport.recommendations = [
    'Révoquez immédiatement l\'accès IAM du développeur retiré',
    'Régénérez toutes les clés API tierces (Stripe, PayPal, etc.)',
    'Supprimez les clés de service account partagées',
    'Activez App Check pour protéger vos backends',
    'Révisez les Security Rules Firestore et Storage',
    'Mettez à jour toutes les variables d\'environnement',
    'Vérifiez les logs d\'audit pour toute activité suspecte',
  ];

  console.log(chalk.bold.underline('📌 Recommandations prioritaires :\n'));
  securityReport.recommendations.forEach((rec, i) => {
    console.log(`  ${i + 1}. ${rec}`);
  });

  // Sauvegarder le rapport
  const reportPath = path.join(__dirname, 'reports', `audit-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(securityReport, null, 2));

  console.log('\n' + chalk.green(`✓ Rapport sauvegardé : ${reportPath}`));
}

// ============================================================================
// POINT D'ENTRÉE
// ============================================================================

async function main() {
  console.clear();
  showHeader();

  console.log(chalk.bold.underline('\n🔍 DÉMARRAGE DE L\'AUDIT DE SÉCURITÉ\n'));

  // 1. Vérifier gcloud CLI
  await checkGcloudCLI();
  console.log('');

  // 2. Vérifier les membres IAM
  console.log(chalk.bold('\n📋 VÉRIFICATION DES ACCÈS IAM'));
  console.log(chalk.gray('─'.repeat(50)));
  await checkIAMMembers();

  // 3. Vérifier les service accounts
  console.log(chalk.bold('\n🔑 VÉRIFICATION DES SERVICE ACCOUNTS'));
  console.log(chalk.gray('─'.repeat(50)));
  await checkServiceAccounts();

  // 4. Vérifier les fichiers .env
  console.log(chalk.bold('\n📁 VÉRIFICATION DES FICHIERS .ENV'));
  console.log(chalk.gray('─'.repeat(50)));
  await checkEnvFiles();

  // 5. Vérifier Firebase Functions config
  console.log(chalk.bold('\n⚡ VÉRIFICATION FIREBASE FUNCTIONS'));
  console.log(chalk.gray('─'.repeat(50)));
  await checkFirebaseFunctionsConfig();

  // 6. Générer le rapport
  generateReport();

  console.log('\n' + boxen(
    chalk.bold.yellow('⚠️  ACTIONS RECOMMANDÉES\n\n') +
    '1. Exécutez les commandes gcloud listées ci-dessus\n' +
    '2. Utilisez npm start pour suivre la checklist\n' +
    '3. Utilisez npm run update-credentials pour mettre à jour les clés\n' +
    '4. Consultez npm run guide pour le guide détaillé',
    { padding: 1, borderStyle: 'round', borderColor: 'yellow' }
  ));
}

main().catch(console.error);
