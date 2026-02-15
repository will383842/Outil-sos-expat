#!/usr/bin/env node
/**
 * Script pour ajouter des logs TRÈS détaillés dans tous les formulaires d'inscription
 * et Cloud Functions backend pour diagnostiquer les problèmes d'inscription
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../src');
const FUNCTIONS_DIR = path.join(__dirname, '../firebase/functions/src');

// Fichiers à modifier
const FILES_TO_LOG = [
  // Frontend - Pages
  {
    path: 'pages/Chatter/ChatterRegister.tsx',
    component: 'ChatterRegister',
    role: 'chatter',
    type: 'page'
  },
  {
    path: 'pages/Blogger/BloggerRegister.tsx',
    component: 'BloggerRegister',
    role: 'blogger',
    type: 'page'
  },
  {
    path: 'pages/GroupAdmin/GroupAdminRegister.tsx',
    component: 'GroupAdminRegister',
    role: 'groupAdmin',
    type: 'page'
  },
  // Frontend - Forms
  {
    path: 'components/Influencer/Forms/InfluencerRegisterForm.tsx',
    component: 'InfluencerRegisterForm',
    role: 'influencer',
    type: 'form'
  },
];

console.log('🔍 ANALYSE: Recherche des patterns d\'inscription...\n');

FILES_TO_LOG.forEach(file => {
  const filePath = path.join(SRC_DIR, file.path);

  if (!fs.existsSync(filePath)) {
    console.log(`❌ [${file.component}] Fichier non trouvé: ${filePath}`);
    return;
  }

  console.log(`📝 [${file.component}] Traitement...`);

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Pattern 1: Début handleSubmit
  const handleSubmitPattern = /const handleSubmit = (useCallback\()?async \(\) => \{[\s\S]*?if \(isSubmitting.*?\) return;/;
  if (handleSubmitPattern.test(content) && !content.includes(`[${file.component}] 🔵 DÉBUT INSCRIPTION`)) {
    console.log(`   🔵 Ajout log DÉBUT handleSubmit`);
    content = content.replace(
      /const handleSubmit = (useCallback\()?async \(\) => \{([\s\S]*?if \(isSubmitting.*?\) return;[\s\S]*?setIsSubmitting\(true\);)/,
      (match, useCallback, body) => {
        const startTimeDecl = body.includes('const startTime') ? '' : '\n    const startTime = Date.now();';
        return `const handleSubmit = ${useCallback ? 'useCallback(' : ''}async () => {${body}${startTimeDecl}
    console.log('[${file.component}] 🔵 DÉBUT INSCRIPTION', {
      timestamp: new Date().toISOString(),
      email: form.email,
      role: '${file.role}',
      userAgent: navigator.userAgent,
      online: navigator.onLine,
      serviceWorkerActive: !!navigator.serviceWorker?.controller
    });`;
      }
    );
    modified = true;
  }

  // Pattern 2: Appel backend (registerChatter, registerInfluencer, etc.)
  const registerPattern = new RegExp(`await register${file.role.charAt(0).toUpperCase() + file.role.slice(1)}\\(`);
  if (registerPattern.test(content) && !content.includes(`[${file.component}] 📤 APPEL BACKEND`)) {
    console.log(`   📤 Ajout log APPEL BACKEND`);
    // Ajouter log avant l'appel
    content = content.replace(
      new RegExp(`(\\s+)(await register${file.role.charAt(0).toUpperCase() + file.role.slice(1)}\\()`),
      `$1console.log('[${file.component}] 📤 APPEL BACKEND - Début', {
$1  timestamp: new Date().toISOString(),
$1  function: 'register${file.role.charAt(0).toUpperCase() + file.role.slice(1)}',
$1  email: form?.email || email,
$1  role: '${file.role}',
$1  elapsedSinceStart: Date.now() - startTime
$1});
$1
$1$2`
    );
    modified = true;
  }

  // Pattern 3: Catch error
  if (content.includes('} catch (err') && !content.includes(`[${file.component}] ❌ ERREUR INSCRIPTION`)) {
    console.log(`   ❌ Ajout log ERREUR catch`);
    content = content.replace(
      /} catch \((err|error|e):? ?\w*\) \{[\s\S]*?console\.error\(/,
      (match) => {
        return match.replace(
          /console\.error\(/,
          `console.error('[${file.component}] ❌ ERREUR INSCRIPTION', {
      timestamp: new Date().toISOString(),
      errorType: err?.constructor?.name,
      errorCode: (err as any)?.code,
      errorMessage: (err as Error)?.message,
      errorStack: (err as Error)?.stack?.split('\\n').slice(0, 10),
      duration: Date.now() - startTime,
      network: {
        online: navigator.onLine,
        serviceWorker: !!navigator.serviceWorker?.controller
      }
    });
    console.error('[${file.component}] Détails erreur:',`
        );
      }
    );
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`   ✅ Fichier modifié avec succès\n`);
  } else {
    console.log(`   ⏭️  Aucune modification nécessaire (logs déjà présents)\n`);
  }
});

console.log('\n✅ FRONTEND TERMINÉ\n');
console.log('📌 PROCHAINE ÉTAPE: Ajouter logs dans les Cloud Functions backend');
console.log('   - registerChatter.ts');
console.log('   - registerInfluencer.ts');
console.log('   - registerBlogger.ts');
console.log('   - registerGroupAdmin.ts');
console.log('   - registerLawyer.ts');
console.log('   - registerExpat.ts');
console.log('   - registerClient.ts');
