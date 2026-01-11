#!/usr/bin/env node

/**
 * ============================================================================
 * ASSISTANT INTERACTIF DE SÉCURISATION FIREBASE
 * ============================================================================
 *
 * Cet outil vous guide à travers toutes les étapes nécessaires pour sécuriser
 * votre projet Firebase après le retrait d'un développeur.
 *
 * Usage : npm start
 *
 * Fonctionnalités :
 * - Checklist interactive avec suivi de progression
 * - Vérification automatique de la sécurité
 * - Guide étape par étape
 * - Mise à jour automatisée des credentials
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import boxen from 'boxen';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import CONFIG from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// ÉTAT DE LA CHECKLIST (persisté dans un fichier JSON)
// ============================================================================

const CHECKLIST_FILE = path.join(__dirname, 'checklist-state.json');

const DEFAULT_CHECKLIST = {
  // Étape 1 : Accès IAM
  'iam-review': { done: false, label: 'Réviser les accès IAM Firebase/Google Cloud' },
  'iam-remove': { done: false, label: 'Retirer l\'accès du développeur' },
  'iam-verify': { done: false, label: 'Vérifier qu\'aucun accès résiduel n\'existe' },

  // Étape 2 : Service Accounts
  'sa-list': { done: false, label: 'Lister tous les service accounts' },
  'sa-keys': { done: false, label: 'Vérifier les clés de chaque service account' },
  'sa-rotate': { done: false, label: 'Régénérer les clés compromises' },
  'sa-delete-old': { done: false, label: 'Supprimer les anciennes clés' },

  // Étape 3 : Clés API tierces
  'api-stripe': { done: false, label: 'Régénérer les clés Stripe' },
  'api-paypal': { done: false, label: 'Régénérer les clés PayPal' },
  'api-twilio': { done: false, label: 'Régénérer les clés Twilio' },
  'api-zoho': { done: false, label: 'Régénérer les clés Zoho' },

  // Étape 4 : Firebase
  'firebase-appcheck': { done: false, label: 'Activer/Vérifier App Check' },
  'firebase-rules': { done: false, label: 'Réviser les Security Rules Firestore' },
  'firebase-functions': { done: false, label: 'Vérifier la config Firebase Functions' },

  // Étape 5 : Variables d'environnement
  'env-update': { done: false, label: 'Mettre à jour les fichiers .env' },
  'env-functions': { done: false, label: 'Mettre à jour Firebase Functions config' },
  'env-backup': { done: false, label: 'Créer un backup des anciennes configs' },

  // Étape 6 : Vérification finale
  'verify-deploy': { done: false, label: 'Tester le déploiement' },
  'verify-logs': { done: false, label: 'Vérifier les logs d\'audit' },
};

function loadChecklist() {
  try {
    if (fs.existsSync(CHECKLIST_FILE)) {
      const data = fs.readFileSync(CHECKLIST_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.log(chalk.yellow('Création d\'une nouvelle checklist...'));
  }
  return { ...DEFAULT_CHECKLIST };
}

function saveChecklist(checklist) {
  fs.writeFileSync(CHECKLIST_FILE, JSON.stringify(checklist, null, 2));
}

// ============================================================================
// AFFICHAGE
// ============================================================================

function clearScreen() {
  console.clear();
}

function showHeader() {
  const header = boxen(
    chalk.bold.cyan('🔒 ASSISTANT DE SÉCURISATION FIREBASE\n') +
    chalk.gray(`Projet : ${CONFIG.firebase.projectId}\n`) +
    chalk.gray('─'.repeat(40)) + '\n' +
    chalk.yellow('Sécurisez votre projet après le retrait d\'un développeur'),
    {
      padding: 1,
      margin: 1,
      borderStyle: 'double',
      borderColor: 'cyan',
    }
  );
  console.log(header);
}

function showProgress(checklist) {
  const total = Object.keys(checklist).length;
  const done = Object.values(checklist).filter(item => item.done).length;
  const percent = Math.round((done / total) * 100);

  const barWidth = 30;
  const filled = Math.round((done / total) * barWidth);
  const empty = barWidth - filled;

  const bar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));

  console.log('\n' + chalk.bold('Progression : ') + bar + chalk.bold(` ${percent}%`) + chalk.gray(` (${done}/${total})`));
}

function showChecklist(checklist) {
  console.log('\n' + chalk.bold.underline('CHECKLIST DE SÉCURISATION :') + '\n');

  const categories = [
    { title: '📋 1. ACCÈS IAM', items: ['iam-review', 'iam-remove', 'iam-verify'] },
    { title: '🔑 2. SERVICE ACCOUNTS', items: ['sa-list', 'sa-keys', 'sa-rotate', 'sa-delete-old'] },
    { title: '🔐 3. CLÉS API TIERCES', items: ['api-stripe', 'api-paypal', 'api-twilio', 'api-zoho'] },
    { title: '🔥 4. FIREBASE', items: ['firebase-appcheck', 'firebase-rules', 'firebase-functions'] },
    { title: '⚙️  5. VARIABLES D\'ENVIRONNEMENT', items: ['env-update', 'env-functions', 'env-backup'] },
    { title: '✅ 6. VÉRIFICATION FINALE', items: ['verify-deploy', 'verify-logs'] },
  ];

  categories.forEach(category => {
    console.log(chalk.bold.blue(category.title));
    category.items.forEach(key => {
      const item = checklist[key];
      const checkbox = item.done ? chalk.green('✓') : chalk.gray('○');
      const label = item.done ? chalk.strikethrough.gray(item.label) : chalk.white(item.label);
      console.log(`   ${checkbox} ${label}`);
    });
    console.log('');
  });
}

// ============================================================================
// MENUS ET ACTIONS
// ============================================================================

async function mainMenu(checklist) {
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Que voulez-vous faire ?',
      choices: [
        { name: '📋 Voir/Modifier la checklist', value: 'checklist' },
        { name: '🔍 Lancer l\'audit de sécurité', value: 'audit' },
        { name: '📖 Voir le guide étape par étape', value: 'guide' },
        { name: '🔄 Mettre à jour les credentials', value: 'credentials' },
        { name: '📊 Générer un rapport', value: 'report' },
        { name: '🔗 Ouvrir les consoles (liens)', value: 'links' },
        new inquirer.Separator(),
        { name: '↩️  Quitter', value: 'exit' },
      ],
    },
  ]);

  return action;
}

async function checklistMenu(checklist) {
  clearScreen();
  showHeader();
  showProgress(checklist);
  showChecklist(checklist);

  const choices = Object.entries(checklist).map(([key, item]) => ({
    name: `${item.done ? chalk.green('✓') : chalk.gray('○')} ${item.label}`,
    value: key,
  }));

  choices.push(new inquirer.Separator());
  choices.push({ name: '✅ Tout marquer comme fait', value: 'mark-all' });
  choices.push({ name: '↻ Réinitialiser la checklist', value: 'reset' });
  choices.push({ name: '↩️  Retour au menu principal', value: 'back' });

  const { selected } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selected',
      message: 'Sélectionnez un élément à basculer :',
      choices,
      pageSize: 20,
    },
  ]);

  if (selected === 'back') {
    return;
  }

  if (selected === 'mark-all') {
    Object.keys(checklist).forEach(key => {
      checklist[key].done = true;
    });
    saveChecklist(checklist);
    console.log(chalk.green('\n✓ Tous les éléments ont été marqués comme faits !'));
    await pause();
    return checklistMenu(checklist);
  }

  if (selected === 'reset') {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Êtes-vous sûr de vouloir réinitialiser la checklist ?',
        default: false,
      },
    ]);
    if (confirm) {
      Object.keys(checklist).forEach(key => {
        checklist[key].done = false;
      });
      saveChecklist(checklist);
      console.log(chalk.yellow('\n↻ Checklist réinitialisée !'));
    }
    await pause();
    return checklistMenu(checklist);
  }

  // Toggle l'élément sélectionné
  checklist[selected].done = !checklist[selected].done;
  saveChecklist(checklist);

  // Afficher les détails/instructions pour cet élément
  await showItemDetails(selected, checklist[selected]);

  return checklistMenu(checklist);
}

async function showItemDetails(key, item) {
  const details = getItemDetails(key);

  console.log('\n' + boxen(
    chalk.bold(item.label) + '\n\n' +
    chalk.white(details.description) + '\n\n' +
    (details.command ? chalk.cyan('Commande :\n') + chalk.yellow(details.command) + '\n\n' : '') +
    (details.link ? chalk.cyan('Console : ') + chalk.underline.blue(details.link) : ''),
    {
      padding: 1,
      borderStyle: 'round',
      borderColor: 'yellow',
    }
  ));

  await pause();
}

function getItemDetails(key) {
  const details = {
    // IAM
    'iam-review': {
      description: 'Accédez à la console IAM pour voir tous les utilisateurs ayant accès au projet.',
      command: `gcloud projects get-iam-policy ${CONFIG.firebase.projectId} --format="table(bindings.role,bindings.members)"`,
      link: CONFIG.consoleUrls.iamAdmin,
    },
    'iam-remove': {
      description: 'Supprimez l\'accès du développeur en retirant son email de tous les rôles IAM.',
      command: `gcloud projects remove-iam-policy-binding ${CONFIG.firebase.projectId} --member="user:EMAIL_DU_DEV" --role="ROLE_A_SUPPRIMER"`,
      link: CONFIG.consoleUrls.iamAdmin,
    },
    'iam-verify': {
      description: 'Vérifiez qu\'aucun accès résiduel n\'existe (invitations en attente, groupes, etc.).',
      link: CONFIG.consoleUrls.iamAdmin,
    },

    // Service Accounts
    'sa-list': {
      description: 'Listez tous les service accounts du projet pour identifier ceux potentiellement compromis.',
      command: `gcloud iam service-accounts list --project=${CONFIG.firebase.projectId}`,
      link: CONFIG.consoleUrls.serviceAccounts,
    },
    'sa-keys': {
      description: 'Pour chaque service account, listez les clés et leur date de création.',
      command: `gcloud iam service-accounts keys list --iam-account=SERVICE_ACCOUNT_EMAIL`,
      link: CONFIG.consoleUrls.serviceAccounts,
    },
    'sa-rotate': {
      description: 'Créez de nouvelles clés pour les service accounts critiques.',
      command: `gcloud iam service-accounts keys create nouvelle-cle.json --iam-account=SERVICE_ACCOUNT_EMAIL`,
      link: CONFIG.consoleUrls.serviceAccounts,
    },
    'sa-delete-old': {
      description: 'Supprimez les anciennes clés après avoir vérifié que les nouvelles fonctionnent.',
      command: `gcloud iam service-accounts keys delete KEY_ID --iam-account=SERVICE_ACCOUNT_EMAIL`,
      link: CONFIG.consoleUrls.serviceAccounts,
    },

    // API Keys
    'api-stripe': {
      description: 'Créez de nouvelles clés API Stripe et mettez à jour vos configurations.',
      link: 'https://dashboard.stripe.com/apikeys',
    },
    'api-paypal': {
      description: 'Régénérez vos credentials PayPal dans le Developer Dashboard.',
      link: 'https://developer.paypal.com/dashboard/applications',
    },
    'api-twilio': {
      description: 'Générez un nouveau Auth Token Twilio et mettez à jour vos configurations.',
      link: 'https://console.twilio.com/us1/account/keys-credentials/api-keys',
    },
    'api-zoho': {
      description: 'Créez un nouveau client Zoho et régénérez les tokens.',
      link: 'https://api-console.zoho.com/',
    },

    // Firebase
    'firebase-appcheck': {
      description: 'Activez App Check pour protéger vos backends contre les abus.',
      link: CONFIG.consoleUrls.appCheck,
    },
    'firebase-rules': {
      description: 'Révisez vos Security Rules pour vous assurer qu\'elles sont toujours sécurisées.',
      link: CONFIG.consoleUrls.securityRules,
    },
    'firebase-functions': {
      description: 'Vérifiez la configuration des Cloud Functions.',
      command: `firebase functions:config:get --project=${CONFIG.firebase.projectId}`,
    },

    // Env
    'env-update': {
      description: 'Mettez à jour tous les fichiers .env avec les nouvelles clés.',
      command: 'node update-credentials.js',
    },
    'env-functions': {
      description: 'Mettez à jour la configuration Firebase Functions.',
      command: `firebase functions:config:set service.key="NOUVELLE_CLE" --project=${CONFIG.firebase.projectId}`,
    },
    'env-backup': {
      description: 'Créez un backup sécurisé de vos anciennes configurations.',
      command: 'node update-credentials.js --backup',
    },

    // Verify
    'verify-deploy': {
      description: 'Déployez et testez que tout fonctionne avec les nouvelles credentials.',
      command: `firebase deploy --project=${CONFIG.firebase.projectId}`,
    },
    'verify-logs': {
      description: 'Vérifiez les logs d\'audit pour détecter toute activité suspecte.',
      link: CONFIG.consoleUrls.auditLogs,
    },
  };

  return details[key] || { description: 'Aucun détail disponible.' };
}

async function showLinks() {
  clearScreen();
  showHeader();

  console.log('\n' + chalk.bold.underline('🔗 LIENS VERS LES CONSOLES :') + '\n');

  const links = [
    { name: 'Firebase Console', url: CONFIG.consoleUrls.firebaseConsole },
    { name: 'IAM & Admin', url: CONFIG.consoleUrls.iamAdmin },
    { name: 'Service Accounts', url: CONFIG.consoleUrls.serviceAccounts },
    { name: 'API Credentials', url: CONFIG.consoleUrls.apiCredentials },
    { name: 'App Check', url: CONFIG.consoleUrls.appCheck },
    { name: 'Audit Logs', url: CONFIG.consoleUrls.auditLogs },
    { name: 'Security Rules', url: CONFIG.consoleUrls.securityRules },
    new inquirer.Separator('─── Services Tiers ───'),
    { name: 'Stripe Dashboard', url: 'https://dashboard.stripe.com/apikeys' },
    { name: 'PayPal Developer', url: 'https://developer.paypal.com/dashboard/applications' },
    { name: 'Twilio Console', url: 'https://console.twilio.com' },
    { name: 'Zoho API Console', url: 'https://api-console.zoho.com/' },
  ];

  links.forEach(link => {
    if (link.name && link.url) {
      console.log(`  ${chalk.cyan('→')} ${chalk.bold(link.name)}`);
      console.log(`    ${chalk.underline.blue(link.url)}\n`);
    }
  });

  await pause();
}

async function generateReport(checklist) {
  clearScreen();
  showHeader();

  const spinner = ora('Génération du rapport...').start();

  const report = {
    generatedAt: new Date().toISOString(),
    projectId: CONFIG.firebase.projectId,
    progress: {
      total: Object.keys(checklist).length,
      completed: Object.values(checklist).filter(item => item.done).length,
    },
    items: checklist,
  };

  const reportPath = path.join(__dirname, 'reports', `security-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  spinner.succeed(chalk.green(`Rapport généré : ${reportPath}`));

  // Afficher un résumé
  console.log('\n' + boxen(
    chalk.bold('📊 RÉSUMÉ DU RAPPORT\n\n') +
    `Projet : ${chalk.cyan(report.projectId)}\n` +
    `Date : ${chalk.gray(report.generatedAt)}\n` +
    `Progression : ${chalk.green(`${report.progress.completed}/${report.progress.total}`)} tâches complétées\n\n` +
    chalk.yellow('Éléments restants :') + '\n' +
    Object.entries(checklist)
      .filter(([_, item]) => !item.done)
      .map(([_, item]) => `  • ${item.label}`)
      .join('\n'),
    {
      padding: 1,
      borderStyle: 'round',
    }
  ));

  await pause();
}

async function pause() {
  await inquirer.prompt([
    {
      type: 'input',
      name: 'continue',
      message: 'Appuyez sur Entrée pour continuer...',
    },
  ]);
}

// ============================================================================
// POINT D'ENTRÉE
// ============================================================================

async function main() {
  const checklist = loadChecklist();

  while (true) {
    clearScreen();
    showHeader();
    showProgress(checklist);

    const action = await mainMenu(checklist);

    switch (action) {
      case 'checklist':
        await checklistMenu(checklist);
        break;

      case 'audit':
        console.log(chalk.cyan('\nLancement de l\'audit de sécurité...\n'));
        console.log(chalk.yellow('Exécutez : npm run audit'));
        await pause();
        break;

      case 'guide':
        console.log(chalk.cyan('\nOuverture du guide...\n'));
        console.log(chalk.yellow('Exécutez : npm run guide'));
        await pause();
        break;

      case 'credentials':
        console.log(chalk.cyan('\nMise à jour des credentials...\n'));
        console.log(chalk.yellow('Exécutez : npm run update-credentials'));
        await pause();
        break;

      case 'report':
        await generateReport(checklist);
        break;

      case 'links':
        await showLinks();
        break;

      case 'exit':
        console.log(chalk.cyan('\n👋 À bientôt ! Pensez à compléter toutes les étapes de sécurisation.\n'));
        process.exit(0);
    }
  }
}

main().catch(console.error);
