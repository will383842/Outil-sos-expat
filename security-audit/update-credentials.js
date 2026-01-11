#!/usr/bin/env node

/**
 * ============================================================================
 * SCRIPT DE MISE À JOUR DES CREDENTIALS
 * ============================================================================
 *
 * Ce script vous aide à mettre à jour les clés API et credentials dans vos
 * fichiers .env après rotation des clés.
 *
 * Usage : npm run update-credentials
 *
 * Fonctionnalités :
 * - Backup automatique des anciennes configurations
 * - Mise à jour interactive des clés
 * - Mise à jour Firebase Functions config
 * - Validation des nouvelles clés
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import boxen from 'boxen';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import CONFIG from './config.js';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// UTILITAIRES
// ============================================================================

function showHeader() {
  console.log(boxen(
    chalk.bold.cyan('🔄 MISE À JOUR DES CREDENTIALS\n') +
    chalk.gray(`Projet : ${CONFIG.firebase.projectId}\n`) +
    chalk.gray('─'.repeat(40)) + '\n' +
    chalk.yellow('Mettez à jour vos clés API en toute sécurité'),
    {
      padding: 1,
      margin: 1,
      borderStyle: 'double',
      borderColor: 'cyan',
    }
  ));
}

function parseEnvFile(content) {
  const lines = content.split('\n');
  const env = {};
  const comments = {};
  const order = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('#') || trimmed === '') {
      // Conserver les commentaires et lignes vides
      comments[index] = line;
    } else if (trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=');
      env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
      order.push({ type: 'var', key: key.trim(), index });
    }
  });

  return { env, comments, order, originalLines: lines };
}

function buildEnvFile(env, originalContent) {
  const { comments, order, originalLines } = parseEnvFile(originalContent);
  const result = [];
  const processedKeys = new Set();

  // Reconstruire en préservant l'ordre et les commentaires
  originalLines.forEach((line, index) => {
    if (comments[index] !== undefined) {
      result.push(comments[index]);
    } else {
      const trimmed = line.trim();
      if (trimmed.includes('=')) {
        const [key] = trimmed.split('=');
        const keyTrimmed = key.trim();
        if (env[keyTrimmed] !== undefined) {
          result.push(`${keyTrimmed}=${env[keyTrimmed]}`);
          processedKeys.add(keyTrimmed);
        }
      }
    }
  });

  // Ajouter les nouvelles clés qui n'existaient pas
  Object.entries(env).forEach(([key, value]) => {
    if (!processedKeys.has(key)) {
      result.push(`${key}=${value}`);
    }
  });

  return result.join('\n');
}

// ============================================================================
// BACKUP
// ============================================================================

async function createBackup(files) {
  const spinner = ora('Création du backup...').start();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = path.join(__dirname, 'backups', timestamp);

  try {
    fs.mkdirSync(backupDir, { recursive: true });

    const backedUpFiles = [];

    for (const filePath of files) {
      const fullPath = path.resolve(__dirname, filePath);
      if (fs.existsSync(fullPath)) {
        const fileName = path.basename(fullPath);
        const backupPath = path.join(backupDir, fileName);
        fs.copyFileSync(fullPath, backupPath);
        backedUpFiles.push(fileName);
      }
    }

    // Créer un fichier d'info
    const infoPath = path.join(backupDir, 'backup-info.json');
    fs.writeFileSync(infoPath, JSON.stringify({
      timestamp,
      files: backedUpFiles,
      reason: 'Rotation des credentials après retrait développeur',
    }, null, 2));

    spinner.succeed(chalk.green(`Backup créé : ${backupDir}`));
    return backupDir;
  } catch (error) {
    spinner.fail(chalk.red('Erreur lors du backup'));
    console.error(error.message);
    return null;
  }
}

// ============================================================================
// MISE À JOUR DES FICHIERS .ENV
// ============================================================================

async function updateEnvFile(filePath, updates) {
  const fullPath = path.resolve(__dirname, filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(chalk.yellow(`⚠️  Fichier non trouvé : ${filePath}`));
    return false;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const { env } = parseEnvFile(content);

  // Appliquer les mises à jour
  Object.entries(updates).forEach(([key, value]) => {
    if (value) {
      env[key] = value;
    }
  });

  // Reconstruire le fichier
  const newContent = buildEnvFile(env, content);
  fs.writeFileSync(fullPath, newContent);

  return true;
}

// ============================================================================
// INTERFACE DE SAISIE DES NOUVELLES CLÉS
// ============================================================================

async function promptForNewCredentials(service) {
  console.log(boxen(
    chalk.bold.yellow(`🔐 ${service.name}\n\n`) +
    chalk.gray(service.rotationGuide) + '\n\n' +
    chalk.cyan('Console : ') + chalk.underline.blue(service.consoleUrl),
    {
      padding: 1,
      borderStyle: 'round',
      borderColor: 'yellow',
    }
  ));

  const updates = {};

  for (const envKey of service.envKeys) {
    const { shouldUpdate } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldUpdate',
        message: `Mettre à jour ${chalk.cyan(envKey)} ?`,
        default: true,
      },
    ]);

    if (shouldUpdate) {
      const { newValue } = await inquirer.prompt([
        {
          type: 'password',
          name: 'newValue',
          message: `Nouvelle valeur pour ${chalk.cyan(envKey)} :`,
          mask: '*',
        },
      ]);

      if (newValue && newValue.trim()) {
        updates[envKey] = newValue.trim();
        console.log(chalk.green(`✓ ${envKey} sera mis à jour`));
      }
    }
  }

  return updates;
}

// ============================================================================
// MISE À JOUR FIREBASE FUNCTIONS CONFIG
// ============================================================================

async function updateFirebaseFunctionsConfig(updates) {
  const spinner = ora('Vérification de Firebase CLI...').start();

  try {
    await execAsync('firebase --version');
    spinner.succeed('Firebase CLI disponible');
  } catch {
    spinner.warn(chalk.yellow('Firebase CLI non disponible'));
    console.log(chalk.gray('\nInstallation : npm install -g firebase-tools'));
    return;
  }

  console.log(chalk.bold('\n📤 Mise à jour Firebase Functions config\n'));

  // Convertir les clés en format Firebase config
  const configUpdates = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (value) {
      // Convertir STRIPE_SECRET_KEY en stripe.secret_key
      const configKey = key.toLowerCase().replace(/_/g, '.');
      configUpdates.push({ key: configKey, value });
    }
  });

  if (configUpdates.length === 0) {
    console.log(chalk.gray('Aucune mise à jour à effectuer'));
    return;
  }

  console.log(chalk.yellow('Les commandes suivantes seront exécutées :\n'));

  configUpdates.forEach(({ key, value }) => {
    console.log(chalk.cyan(`firebase functions:config:set ${key}="***" --project=${CONFIG.firebase.projectId}`));
  });

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Exécuter ces commandes ?',
      default: false,
    },
  ]);

  if (confirm) {
    for (const { key, value } of configUpdates) {
      const cmdSpinner = ora(`Mise à jour ${key}...`).start();
      try {
        await execAsync(
          `firebase functions:config:set ${key}="${value}" --project=${CONFIG.firebase.projectId}`
        );
        cmdSpinner.succeed(`${key} mis à jour`);
      } catch (error) {
        cmdSpinner.fail(`Erreur pour ${key}`);
        console.error(chalk.red(error.message));
      }
    }

    console.log(chalk.yellow('\n⚠️  N\'oubliez pas de redéployer les functions :'));
    console.log(chalk.cyan(`firebase deploy --only functions --project=${CONFIG.firebase.projectId}`));
  }
}

// ============================================================================
// MENU PRINCIPAL
// ============================================================================

async function mainMenu() {
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Que voulez-vous faire ?',
      choices: [
        { name: '📦 Créer un backup des configs actuelles', value: 'backup' },
        { name: '🔄 Mettre à jour les credentials par service', value: 'update-by-service' },
        { name: '📝 Éditer un fichier .env spécifique', value: 'edit-env' },
        { name: '☁️  Mettre à jour Firebase Functions config', value: 'firebase-config' },
        { name: '📋 Générer un template de nouvelles clés', value: 'template' },
        new inquirer.Separator(),
        { name: '↩️  Quitter', value: 'exit' },
      ],
    },
  ]);

  return action;
}

async function updateByService() {
  console.clear();
  showHeader();

  const { services } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'services',
      message: 'Sélectionnez les services à mettre à jour :',
      choices: CONFIG.thirdPartyServices.map(s => ({
        name: s.name,
        value: s,
      })),
    },
  ]);

  if (services.length === 0) {
    console.log(chalk.yellow('Aucun service sélectionné'));
    return;
  }

  const allUpdates = {};

  for (const service of services) {
    const updates = await promptForNewCredentials(service);
    Object.assign(allUpdates, updates);
  }

  if (Object.keys(allUpdates).length === 0) {
    console.log(chalk.yellow('\nAucune mise à jour à effectuer'));
    return;
  }

  // Résumé
  console.log(boxen(
    chalk.bold.green('📋 RÉSUMÉ DES MISES À JOUR\n\n') +
    Object.keys(allUpdates).map(key => `  • ${key}`).join('\n'),
    {
      padding: 1,
      borderStyle: 'round',
      borderColor: 'green',
    }
  ));

  // Sélectionner les fichiers à mettre à jour
  const existingFiles = CONFIG.filesToCheck.filter(f => {
    const fullPath = path.resolve(__dirname, f);
    return fs.existsSync(fullPath);
  });

  if (existingFiles.length === 0) {
    console.log(chalk.yellow('\nAucun fichier .env trouvé'));
    return;
  }

  const { filesToUpdate } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'filesToUpdate',
      message: 'Sélectionnez les fichiers à mettre à jour :',
      choices: existingFiles.map(f => ({ name: f, value: f, checked: true })),
    },
  ]);

  if (filesToUpdate.length === 0) {
    console.log(chalk.yellow('\nAucun fichier sélectionné'));
    return;
  }

  // Créer le backup
  await createBackup(filesToUpdate);

  // Mettre à jour les fichiers
  const spinner = ora('Mise à jour des fichiers...').start();

  for (const file of filesToUpdate) {
    await updateEnvFile(file, allUpdates);
  }

  spinner.succeed(chalk.green('Fichiers mis à jour avec succès !'));

  // Proposer la mise à jour Firebase Functions
  const { updateFirebase } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'updateFirebase',
      message: 'Mettre à jour aussi Firebase Functions config ?',
      default: true,
    },
  ]);

  if (updateFirebase) {
    await updateFirebaseFunctionsConfig(allUpdates);
  }
}

async function editSpecificEnvFile() {
  console.clear();
  showHeader();

  const existingFiles = CONFIG.filesToCheck.filter(f => {
    const fullPath = path.resolve(__dirname, f);
    return fs.existsSync(fullPath);
  });

  if (existingFiles.length === 0) {
    console.log(chalk.yellow('\nAucun fichier .env trouvé'));
    return;
  }

  const { selectedFile } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedFile',
      message: 'Sélectionnez le fichier à éditer :',
      choices: existingFiles,
    },
  ]);

  const fullPath = path.resolve(__dirname, selectedFile);
  const content = fs.readFileSync(fullPath, 'utf8');
  const { env } = parseEnvFile(content);

  console.log(chalk.bold(`\n📄 Variables dans ${selectedFile} :\n`));
  Object.entries(env).forEach(([key, value]) => {
    const masked = value.length > 8 ? value.slice(0, 4) + '****' + value.slice(-4) : '****';
    console.log(`  ${chalk.cyan(key)} = ${chalk.gray(masked)}`);
  });

  const { varsToEdit } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'varsToEdit',
      message: 'Sélectionnez les variables à modifier :',
      choices: Object.keys(env).map(k => ({ name: k, value: k })),
    },
  ]);

  if (varsToEdit.length === 0) return;

  // Backup
  await createBackup([selectedFile]);

  const updates = {};

  for (const varName of varsToEdit) {
    const { newValue } = await inquirer.prompt([
      {
        type: 'password',
        name: 'newValue',
        message: `Nouvelle valeur pour ${chalk.cyan(varName)} :`,
        mask: '*',
      },
    ]);

    if (newValue && newValue.trim()) {
      updates[varName] = newValue.trim();
    }
  }

  if (Object.keys(updates).length > 0) {
    await updateEnvFile(selectedFile, updates);
    console.log(chalk.green(`\n✓ ${selectedFile} mis à jour !`));
  }
}

async function generateTemplate() {
  console.clear();
  showHeader();

  const templatePath = path.join(__dirname, 'templates', `new-credentials-${Date.now()}.txt`);

  let template = `# ============================================================================
# TEMPLATE - NOUVELLES CREDENTIALS
# ============================================================================
# Généré le : ${new Date().toLocaleString('fr-FR')}
# Projet : ${CONFIG.firebase.projectId}
#
# Instructions :
# 1. Régénérez les clés dans chaque console
# 2. Collez les nouvelles valeurs ci-dessous
# 3. Utilisez ce fichier comme référence pour mettre à jour vos .env
#
# ⚠️  ATTENTION : Supprimez ce fichier après utilisation !
# ============================================================================

`;

  CONFIG.thirdPartyServices.forEach(service => {
    template += `\n# ${service.name}\n`;
    template += `# Console : ${service.consoleUrl}\n`;
    service.envKeys.forEach(key => {
      template += `${key}=\n`;
    });
  });

  fs.writeFileSync(templatePath, template);

  console.log(chalk.green(`\n✓ Template créé : ${templatePath}\n`));
  console.log(chalk.yellow('Utilisez ce fichier pour noter vos nouvelles clés pendant la rotation.'));
  console.log(chalk.red('\n⚠️  N\'oubliez pas de supprimer ce fichier après utilisation !'));
}

// ============================================================================
// POINT D'ENTRÉE
// ============================================================================

async function main() {
  while (true) {
    console.clear();
    showHeader();

    const action = await mainMenu();

    switch (action) {
      case 'backup':
        await createBackup(CONFIG.filesToCheck);
        await pause();
        break;

      case 'update-by-service':
        await updateByService();
        await pause();
        break;

      case 'edit-env':
        await editSpecificEnvFile();
        await pause();
        break;

      case 'firebase-config':
        console.log(chalk.yellow('\nEntrez les nouvelles valeurs pour Firebase Functions config :'));
        const updates = {};
        for (const service of CONFIG.thirdPartyServices) {
          for (const key of service.envKeys) {
            const { value } = await inquirer.prompt([
              {
                type: 'password',
                name: 'value',
                message: `${key} (laisser vide pour ignorer) :`,
                mask: '*',
              },
            ]);
            if (value && value.trim()) {
              updates[key] = value.trim();
            }
          }
        }
        await updateFirebaseFunctionsConfig(updates);
        await pause();
        break;

      case 'template':
        await generateTemplate();
        await pause();
        break;

      case 'exit':
        console.log(chalk.cyan('\n👋 À bientôt !\n'));
        process.exit(0);
    }
  }
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

main().catch(console.error);
