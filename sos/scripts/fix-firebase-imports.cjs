/**
 * Script pour corriger les imports Firebase Functions incorrects
 *
 * Corrections :
 * 1. `import { httpsCallable } from 'firebase/functionsWest2'` → `import { httpsCallable } from 'firebase/functions'`
 * 2. Ajouter `import { functionsWest2 } from '@/config/firebase'` si nécessaire
 * 3. Assurer que `functionsWest2` est utilisé correctement
 */

const fs = require('fs');
const path = require('path');

// Fichiers à corriger
const FILES_TO_FIX = [
  // GroupAdmin pages
  'src/pages/GroupAdmin/GroupAdminDashboard.tsx',
  'src/pages/GroupAdmin/GroupAdminLeaderboard.tsx',
  'src/pages/GroupAdmin/GroupAdminPayments.tsx',
  'src/pages/GroupAdmin/GroupAdminPosts.tsx',
  'src/pages/GroupAdmin/GroupAdminReferrals.tsx',
  'src/pages/GroupAdmin/GroupAdminResources.tsx',

  // Admin GroupAdmins pages
  'src/pages/admin/GroupAdmins/AdminGroupAdminsPosts.tsx',
  'src/pages/admin/GroupAdmins/AdminGroupAdminsRecruitments.tsx',
  'src/pages/admin/GroupAdmins/AdminGroupAdminsResources.tsx',
];

const PROJECT_ROOT = path.join(__dirname, '..');

function fixFile(relPath) {
  const filePath = path.join(PROJECT_ROOT, relPath);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${relPath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Fix 1: Remplacer l'import incorrect
  if (content.includes("from 'firebase/functionsWest2'")) {
    content = content.replace(
      /import\s+{([^}]+)}\s+from\s+['"]firebase\/functionsWest2['"]/g,
      "import { $1 } from 'firebase/functions'"
    );
    modified = true;

    // S'assurer que functionsWest2 est importé depuis @/config/firebase
    if (!content.includes("import { functionsWest2 }") && !content.includes("import { functions, functionsWest2 }")) {
      // Trouver la section des imports Firebase
      const firebaseConfigImportMatch = content.match(/import\s+{[^}]*}\s+from\s+['"]@\/config\/firebase['"]/);

      if (firebaseConfigImportMatch) {
        // Ajouter functionsWest2 à l'import existant
        const existingImport = firebaseConfigImportMatch[0];
        const newImport = existingImport.replace(
          /import\s+{([^}]+)}\s+from\s+['"]@\/config\/firebase['"]/,
          (match, imports) => {
            if (!imports.includes('functionsWest2')) {
              return `import { ${imports.trim()}, functionsWest2 } from '@/config/firebase'`;
            }
            return match;
          }
        );
        content = content.replace(existingImport, newImport);
      } else {
        // Ajouter un nouvel import après les autres imports
        const lastImportMatch = content.match(/import[^;]+from[^;]+;(?=\n\n|$)/g);
        if (lastImportMatch) {
          const lastImport = lastImportMatch[lastImportMatch.length - 1];
          content = content.replace(lastImport, `${lastImport}\nimport { functionsWest2 } from '@/config/firebase';`);
        }
      }
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${relPath}`);
    return true;
  }

  console.log(`⏭️  No changes needed: ${relPath}`);
  return false;
}

function main() {
  console.log('🔧 Fixing Firebase Functions imports...\n');

  let fixed = 0;
  let skipped = 0;

  for (const file of FILES_TO_FIX) {
    if (fixFile(file)) {
      fixed++;
    } else {
      skipped++;
    }
  }

  console.log(`\n📊 Summary: ${fixed} files fixed, ${skipped} files skipped`);
}

main();
