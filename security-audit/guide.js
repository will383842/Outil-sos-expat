#!/usr/bin/env node

/**
 * ============================================================================
 * GUIDE ÉTAPE PAR ÉTAPE - SÉCURISATION FIREBASE
 * ============================================================================
 *
 * Ce guide interactif vous accompagne à travers chaque étape de la
 * sécurisation de votre projet Firebase.
 *
 * Usage : npm run guide
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import boxen from 'boxen';
import CONFIG from './config.js';

// ============================================================================
// DONNÉES DU GUIDE
// ============================================================================

const GUIDE_SECTIONS = [
  {
    id: 'iam',
    title: '1. RETRAIT DES ACCÈS IAM',
    icon: '👤',
    steps: [
      {
        title: 'Lister tous les membres IAM actuels',
        description: `
Avant de supprimer des accès, vous devez avoir une vue complète de qui a accès au projet.

Cette commande affiche TOUS les utilisateurs, groupes et service accounts avec leurs rôles.
        `,
        command: `gcloud projects get-iam-policy ${CONFIG.firebase.projectId} --format="table(bindings.role,bindings.members)"`,
        consoleUrl: CONFIG.consoleUrls.iamAdmin,
        tips: [
          'Notez les emails de tous les utilisateurs avec des rôles "owner" ou "editor"',
          'Identifiez l\'email du développeur à retirer',
          'Vérifiez s\'il est dans plusieurs rôles différents',
        ],
      },
      {
        title: 'Supprimer l\'accès du développeur',
        description: `
Pour chaque rôle que le développeur possède, vous devez exécuter une commande de suppression.

⚠️  ATTENTION : Remplacez EMAIL_DU_DEV par l'email réel et ROLE par le rôle exact.
        `,
        command: `# Exemple pour retirer le rôle Editor
gcloud projects remove-iam-policy-binding ${CONFIG.firebase.projectId} \\
  --member="user:EMAIL_DU_DEV@example.com" \\
  --role="roles/editor"

# Exemple pour retirer le rôle Firebase Admin
gcloud projects remove-iam-policy-binding ${CONFIG.firebase.projectId} \\
  --member="user:EMAIL_DU_DEV@example.com" \\
  --role="roles/firebase.admin"`,
        consoleUrl: CONFIG.consoleUrls.iamAdmin,
        tips: [
          'Vous pouvez aussi le faire via la console : cliquez sur l\'utilisateur > supprimer',
          'Vérifiez après suppression que l\'utilisateur n\'apparaît plus',
          'Si l\'utilisateur est membre d\'un groupe Google, retirez-le aussi du groupe',
        ],
      },
      {
        title: 'Vérifier les invitations en attente',
        description: `
Les invitations en attente dans Firebase peuvent encore donner accès au projet.
Vérifiez et supprimez toute invitation pour le développeur retiré.
        `,
        consoleUrl: 'https://console.firebase.google.com/project/' + CONFIG.firebase.projectId + '/settings/iam',
        tips: [
          'Allez dans Settings > Users and permissions',
          'Vérifiez l\'onglet "Pending invites"',
          'Supprimez toute invitation pour le développeur',
        ],
      },
    ],
  },
  {
    id: 'service-accounts',
    title: '2. SERVICE ACCOUNTS ET CLÉS',
    icon: '🔑',
    steps: [
      {
        title: 'Lister tous les service accounts',
        description: `
Les service accounts sont des comptes utilisés par vos applications pour s'authentifier.
Si le développeur avait accès aux clés, elles sont potentiellement compromises.
        `,
        command: `gcloud iam service-accounts list --project=${CONFIG.firebase.projectId}`,
        consoleUrl: CONFIG.consoleUrls.serviceAccounts,
        tips: [
          'Notez tous les service accounts listés',
          'Les emails se terminent par @*.iam.gserviceaccount.com',
        ],
      },
      {
        title: 'Vérifier les clés de chaque service account',
        description: `
Chaque service account peut avoir plusieurs clés. Vous devez identifier quelles clés
ont été créées ou potentiellement partagées avec le développeur.
        `,
        command: `# Remplacez SERVICE_ACCOUNT_EMAIL par l'email réel
gcloud iam service-accounts keys list --iam-account=SERVICE_ACCOUNT_EMAIL`,
        tips: [
          'Les clés avec keyType "USER_MANAGED" sont celles que vous avez créées',
          'Les clés "SYSTEM_MANAGED" sont gérées par Google, ne les touchez pas',
          'Notez les dates de création - si une clé a été créée quand le dev avait accès, elle est suspecte',
        ],
      },
      {
        title: 'Créer de nouvelles clés',
        description: `
Créez de nouvelles clés pour remplacer celles potentiellement compromises.

⚠️  IMPORTANT : Gardez le fichier JSON généré en sécurité !
        `,
        command: `# Créer une nouvelle clé
gcloud iam service-accounts keys create nouvelle-cle.json \\
  --iam-account=SERVICE_ACCOUNT_EMAIL`,
        tips: [
          'Le fichier JSON contient la clé privée - ne le partagez JAMAIS',
          'Stockez-le dans un gestionnaire de secrets si possible',
          'Mettez immédiatement à jour vos .env avec la nouvelle clé',
        ],
      },
      {
        title: 'Supprimer les anciennes clés',
        description: `
Après avoir vérifié que vos applications fonctionnent avec les nouvelles clés,
supprimez les anciennes.

⚠️  Cette action est IRRÉVERSIBLE !
        `,
        command: `# Lister d'abord les clés pour obtenir les KEY_ID
gcloud iam service-accounts keys list --iam-account=SERVICE_ACCOUNT_EMAIL

# Supprimer une clé spécifique
gcloud iam service-accounts keys delete KEY_ID \\
  --iam-account=SERVICE_ACCOUNT_EMAIL`,
        tips: [
          'Testez d\'abord en staging/dev avant de supprimer en production',
          'Assurez-vous que toutes vos applications utilisent les nouvelles clés',
          'Gardez un backup du fichier de l\'ancienne clé pendant 24h (au cas où)',
        ],
      },
    ],
  },
  {
    id: 'api-keys',
    title: '3. CLÉS API TIERCES',
    icon: '🔐',
    steps: [
      {
        title: 'Stripe - Régénérer les clés API',
        description: `
Stripe utilise des clés API pour authentifier les requêtes. Si compromises,
quelqu'un pourrait voir vos paiements ou effectuer des remboursements.
        `,
        consoleUrl: 'https://dashboard.stripe.com/apikeys',
        tips: [
          '1. Connectez-vous à Stripe Dashboard',
          '2. Allez dans Developers > API Keys',
          '3. Cliquez sur "Roll key" pour la Secret key',
          '4. Copiez la nouvelle clé IMMÉDIATEMENT (elle ne sera plus visible)',
          '5. Mettez à jour votre .env avec STRIPE_SECRET_KEY=nouvelle_cle',
          '6. Pour les webhooks, allez dans Webhooks et récupérez le nouveau secret',
        ],
        envVars: ['STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY', 'STRIPE_WEBHOOK_SECRET'],
      },
      {
        title: 'PayPal - Régénérer les credentials',
        description: `
PayPal utilise un Client ID et Secret pour OAuth. Régénérez-les pour sécuriser vos transactions.
        `,
        consoleUrl: 'https://developer.paypal.com/dashboard/applications',
        tips: [
          '1. Connectez-vous au PayPal Developer Dashboard',
          '2. Allez dans My Apps & Credentials',
          '3. Sélectionnez votre application',
          '4. Cliquez sur "Reset" pour le Client Secret',
          '5. Mettez à jour votre .env avec les nouvelles valeurs',
        ],
        envVars: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'],
      },
      {
        title: 'Twilio - Régénérer l\'Auth Token',
        description: `
Twilio utilise un Account SID et Auth Token. Le token peut être régénéré sans changer le SID.
        `,
        consoleUrl: 'https://console.twilio.com',
        tips: [
          '1. Connectez-vous à la console Twilio',
          '2. Allez dans Account > Keys & Credentials > API Keys',
          '3. Ou dans le Dashboard, sous "Auth Token", cliquez sur l\'icône de rotation',
          '4. Confirmez la régénération',
          '5. Mettez à jour votre .env avec TWILIO_AUTH_TOKEN=nouveau_token',
        ],
        envVars: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN'],
      },
      {
        title: 'Zoho - Créer un nouveau client',
        description: `
Pour Zoho, il est plus sûr de créer un nouveau client OAuth et de révoquer l'ancien.
        `,
        consoleUrl: 'https://api-console.zoho.com/',
        tips: [
          '1. Connectez-vous à Zoho API Console',
          '2. Créez une nouvelle application (Self Client ou Server-based)',
          '3. Récupérez le nouveau Client ID et Secret',
          '4. Générez un nouveau Refresh Token avec les scopes nécessaires',
          '5. Mettez à jour votre .env',
          '6. Après validation, supprimez l\'ancien client',
        ],
        envVars: ['ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET', 'ZOHO_REFRESH_TOKEN'],
      },
    ],
  },
  {
    id: 'firebase-security',
    title: '4. SÉCURITÉ FIREBASE',
    icon: '🔥',
    steps: [
      {
        title: 'Activer Firebase App Check',
        description: `
App Check aide à protéger vos backends contre les abus en vérifiant que les requêtes
proviennent de vos vraies applications.
        `,
        consoleUrl: CONFIG.consoleUrls.appCheck,
        tips: [
          '1. Allez dans Firebase Console > App Check',
          '2. Sélectionnez votre app (Web, iOS, Android)',
          '3. Pour le Web, utilisez reCAPTCHA Enterprise',
          '4. Enregistrez et activez l\'enforcement',
          '5. Testez que votre app fonctionne toujours',
        ],
      },
      {
        title: 'Réviser les Security Rules Firestore',
        description: `
Vérifiez que vos règles de sécurité Firestore ne contiennent pas de failles.
        `,
        consoleUrl: CONFIG.consoleUrls.securityRules,
        tips: [
          'Évitez "allow read, write: if true;" - c\'est une faille majeure',
          'Utilisez toujours request.auth pour vérifier l\'authentification',
          'Validez les données avec request.resource.data',
          'Testez vos règles avec le simulateur Firebase',
        ],
        codeExample: `
// Exemple de règles sécurisées
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Seuls les utilisateurs authentifiés peuvent lire leur propre profil
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Les admins peuvent tout lire
    match /{document=**} {
      allow read, write: if request.auth.token.admin == true;
    }
  }
}`,
      },
      {
        title: 'Vérifier Firebase Functions config',
        description: `
Les configurations Firebase Functions peuvent contenir des secrets. Vérifiez qu'ils
sont toujours valides et mettez-les à jour si nécessaire.
        `,
        command: `# Voir la config actuelle
firebase functions:config:get --project=${CONFIG.firebase.projectId}

# Mettre à jour une valeur
firebase functions:config:set service.key="NOUVELLE_VALEUR" --project=${CONFIG.firebase.projectId}

# Après modification, redéployer les functions
firebase deploy --only functions --project=${CONFIG.firebase.projectId}`,
        tips: [
          'La config est stockée de manière sécurisée par Firebase',
          'Mettez à jour toutes les clés API tierces après rotation',
          'N\'oubliez pas de redéployer après modification',
        ],
      },
    ],
  },
  {
    id: 'env-update',
    title: '5. MISE À JOUR DES VARIABLES D\'ENVIRONNEMENT',
    icon: '⚙️',
    steps: [
      {
        title: 'Identifier tous les fichiers .env',
        description: `
Localisez tous les fichiers contenant des variables d'environnement dans votre projet.
        `,
        command: `# Sur Unix/Mac
find . -name ".env*" -type f 2>/dev/null

# Sur Windows PowerShell
Get-ChildItem -Recurse -Filter ".env*" | Select-Object FullName`,
        tips: [
          'Fichiers typiques : .env, .env.local, .env.production, .env.development',
          'Vérifiez aussi functions/.env si vous avez des Cloud Functions',
          'Les fichiers .env ne doivent JAMAIS être dans git',
        ],
      },
      {
        title: 'Créer un backup des anciennes configs',
        description: `
Avant de modifier quoi que ce soit, créez une sauvegarde.
        `,
        command: `# Créer un dossier de backup avec la date
mkdir -p backups/$(date +%Y%m%d)
cp .env* backups/$(date +%Y%m%d)/
cp functions/.env* backups/$(date +%Y%m%d)/ 2>/dev/null || true`,
        tips: [
          'Gardez le backup dans un endroit sécurisé',
          'Supprimez le backup après 1-2 semaines une fois tout vérifié',
        ],
      },
      {
        title: 'Mettre à jour les clés',
        description: `
Mettez à jour chaque fichier .env avec les nouvelles clés générées.

Utilisez le script fourni ou éditez manuellement.
        `,
        command: `# Utiliser le script de mise à jour
npm run update-credentials

# Ou éditer manuellement
code .env`,
        tips: [
          'Copiez-collez soigneusement - une erreur peut casser l\'app',
          'Vérifiez qu\'il n\'y a pas d\'espaces en début/fin de valeur',
          'Testez localement avant de déployer',
        ],
      },
    ],
  },
  {
    id: 'verification',
    title: '6. VÉRIFICATION FINALE',
    icon: '✅',
    steps: [
      {
        title: 'Tester en local',
        description: `
Avant de déployer, testez que tout fonctionne avec les nouvelles credentials.
        `,
        command: `# Démarrer l'app en local
npm run dev

# Tester les fonctions Firebase
firebase emulators:start`,
        tips: [
          'Testez les paiements Stripe en mode test',
          'Vérifiez que les emails/SMS Twilio s\'envoient',
          'Testez l\'authentification',
        ],
      },
      {
        title: 'Déployer et vérifier',
        description: `
Déployez les modifications et vérifiez que tout fonctionne en production.
        `,
        command: `# Déployer sur Firebase
firebase deploy --project=${CONFIG.firebase.projectId}

# Ou déployer sélectivement
firebase deploy --only functions --project=${CONFIG.firebase.projectId}
firebase deploy --only hosting --project=${CONFIG.firebase.projectId}`,
        tips: [
          'Surveillez les logs après déploiement',
          'Testez les fonctionnalités critiques en production',
          'Gardez l\'ancien code en backup au cas où',
        ],
      },
      {
        title: 'Vérifier les logs d\'audit',
        description: `
Consultez les logs pour détecter toute activité suspecte du développeur retiré.
        `,
        consoleUrl: CONFIG.consoleUrls.auditLogs,
        tips: [
          'Filtrez par l\'email du développeur',
          'Vérifiez les 30 derniers jours',
          'Recherchez des actions suspectes : suppressions, exports de données, etc.',
        ],
      },
    ],
  },
];

// ============================================================================
// AFFICHAGE
// ============================================================================

function clearScreen() {
  console.clear();
}

function showHeader() {
  console.log(boxen(
    chalk.bold.cyan('📖 GUIDE DE SÉCURISATION FIREBASE\n') +
    chalk.gray(`Projet : ${CONFIG.firebase.projectId}\n`) +
    chalk.gray('─'.repeat(40)) + '\n' +
    chalk.yellow('Guide interactif étape par étape'),
    {
      padding: 1,
      margin: 1,
      borderStyle: 'double',
      borderColor: 'cyan',
    }
  ));
}

function showStep(step, stepNumber, totalSteps) {
  console.log(boxen(
    chalk.bold.yellow(`Étape ${stepNumber}/${totalSteps}: ${step.title}\n\n`) +
    chalk.white(step.description.trim()) +
    (step.command ? '\n\n' + chalk.cyan('📋 Commande(s) à exécuter :\n') + chalk.bgGray.white('\n' + step.command + '\n') : '') +
    (step.consoleUrl ? '\n\n' + chalk.cyan('🔗 Console : ') + chalk.underline.blue(step.consoleUrl) : '') +
    (step.envVars ? '\n\n' + chalk.cyan('📝 Variables .env concernées :\n') + step.envVars.map(v => `   • ${v}`).join('\n') : '') +
    (step.codeExample ? '\n\n' + chalk.cyan('💻 Exemple de code :\n') + chalk.gray(step.codeExample) : ''),
    {
      padding: 1,
      margin: { top: 1, bottom: 0 },
      borderStyle: 'round',
      borderColor: 'yellow',
    }
  ));

  if (step.tips && step.tips.length > 0) {
    console.log('\n' + chalk.bold.green('💡 Conseils :'));
    step.tips.forEach(tip => {
      console.log(chalk.green(`   • ${tip}`));
    });
  }
}

// ============================================================================
// MENUS
// ============================================================================

async function mainMenu() {
  const choices = GUIDE_SECTIONS.map(section => ({
    name: `${section.icon} ${section.title}`,
    value: section.id,
  }));

  choices.push(new inquirer.Separator());
  choices.push({ name: '📋 Voir toutes les commandes gcloud', value: 'all-commands' });
  choices.push({ name: '🔗 Voir tous les liens', value: 'all-links' });
  choices.push({ name: '↩️  Quitter', value: 'exit' });

  const { selection } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selection',
      message: 'Choisissez une section :',
      choices,
      pageSize: 15,
    },
  ]);

  return selection;
}

async function sectionMenu(section) {
  clearScreen();
  showHeader();

  console.log(chalk.bold(`\n${section.icon} ${section.title}\n`));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(chalk.gray(`Cette section contient ${section.steps.length} étapes.\n`));

  const choices = section.steps.map((step, index) => ({
    name: `${index + 1}. ${step.title}`,
    value: index,
  }));

  choices.push(new inquirer.Separator());
  choices.push({ name: '📖 Voir toutes les étapes', value: 'all' });
  choices.push({ name: '↩️  Retour au menu principal', value: 'back' });

  const { selection } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selection',
      message: 'Choisissez une étape :',
      choices,
    },
  ]);

  return selection;
}

async function showAllCommands() {
  clearScreen();
  showHeader();

  console.log(chalk.bold.underline('\n📋 TOUTES LES COMMANDES GCLOUD\n'));

  GUIDE_SECTIONS.forEach(section => {
    console.log(chalk.bold.blue(`\n${section.icon} ${section.title}`));
    console.log(chalk.gray('─'.repeat(50)));

    section.steps.forEach(step => {
      if (step.command) {
        console.log(chalk.yellow(`\n# ${step.title}`));
        console.log(chalk.white(step.command));
      }
    });
  });

  await pause();
}

async function showAllLinks() {
  clearScreen();
  showHeader();

  console.log(chalk.bold.underline('\n🔗 TOUS LES LIENS\n'));

  // Liens Firebase/Google Cloud
  console.log(chalk.bold.blue('\n🔥 Firebase & Google Cloud'));
  console.log(chalk.gray('─'.repeat(50)));
  Object.entries(CONFIG.consoleUrls).forEach(([name, url]) => {
    console.log(`  ${chalk.cyan('→')} ${chalk.bold(name)}`);
    console.log(`    ${chalk.underline.blue(url)}`);
  });

  // Liens des services tiers
  console.log(chalk.bold.blue('\n🔐 Services Tiers'));
  console.log(chalk.gray('─'.repeat(50)));
  CONFIG.thirdPartyServices.forEach(service => {
    console.log(`  ${chalk.cyan('→')} ${chalk.bold(service.name)}`);
    console.log(`    ${chalk.underline.blue(service.consoleUrl)}`);
  });

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
  while (true) {
    clearScreen();
    showHeader();

    const selection = await mainMenu();

    if (selection === 'exit') {
      console.log(chalk.cyan('\n👋 Bonne sécurisation !\n'));
      process.exit(0);
    }

    if (selection === 'all-commands') {
      await showAllCommands();
      continue;
    }

    if (selection === 'all-links') {
      await showAllLinks();
      continue;
    }

    const section = GUIDE_SECTIONS.find(s => s.id === selection);
    if (!section) continue;

    while (true) {
      const stepSelection = await sectionMenu(section);

      if (stepSelection === 'back') break;

      if (stepSelection === 'all') {
        clearScreen();
        showHeader();
        console.log(chalk.bold(`\n${section.icon} ${section.title}\n`));

        section.steps.forEach((step, index) => {
          showStep(step, index + 1, section.steps.length);
          console.log('\n');
        });

        await pause();
        continue;
      }

      clearScreen();
      showHeader();
      showStep(section.steps[stepSelection], stepSelection + 1, section.steps.length);
      await pause();
    }
  }
}

main().catch(console.error);
