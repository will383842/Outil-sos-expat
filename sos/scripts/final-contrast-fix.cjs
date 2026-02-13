/**
 * Script de correction finale du contraste - Intelligent et context-aware
 *
 * Distingue entre:
 * - Pages DARK-ONLY (Landing, Register): text-gray-300 OK, pas besoin de dark:
 * - Pages DASHBOARD (dual-mode): besoin de dark: variants
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const ROLES = ['Blogger', 'Influencer', 'GroupAdmin', 'Chatter'];

function isDarkModeOnly(content, filename) {
  return (
    filename.includes('Landing.tsx') ||
    filename.includes('Register.tsx') ||
    filename.includes('RegisterForm.tsx') ||
    filename.includes('LandingOld.tsx') ||
    /className="[^"]*bg-black[^"]*"/.test(content) ||
    /className="[^"]*bg-gradient-to-\w+ from-\w+-\d+ via-\w+-\d+ to-black/.test(content)
  );
}

function fixDashboardContrast(content) {
  let fixed = content;
  let changes = 0;

  // Fix 1: text-gray-500 sans dark: → text-gray-700 dark:text-gray-300
  const gray500Pattern = /className="([^"]*)text-gray-500(?!\s+dark:)([^"]*)"/g;
  fixed = fixed.replace(gray500Pattern, (match, before, after) => {
    changes++;
    return `className="${before}text-gray-700 dark:text-gray-300${after}"`;
  });

  // Fix 2: text-gray-400 sans dark: → text-gray-600 dark:text-gray-400
  const gray400Pattern = /className="([^"]*)text-gray-400(?!\s+dark:)([^"]*)"/g;
  fixed = fixed.replace(gray400Pattern, (match, before, after) => {
    changes++;
    return `className="${before}text-gray-600 dark:text-gray-400${after}"`;
  });

  return { content: fixed, changes };
}

function fixLandingContrast(content) {
  let fixed = content;
  let changes = 0;

  // Fix 1: text-white/60 → text-white/85
  if (fixed.includes('text-white/60')) {
    fixed = fixed.replace(/text-white\/60/g, 'text-white/85');
    changes += (content.match(/text-white\/60/g) || []).length;
  }

  // Fix 2: text-white/70 → text-white/85
  if (fixed.includes('text-white/70')) {
    fixed = fixed.replace(/text-white\/70/g, 'text-white/85');
    changes += (content.match(/text-white\/70/g) || []).length;
  }

  // Fix 3: bg-white/5 → bg-white/10 (sauf dans "|" qui est un séparateur)
  const bgPattern = /bg-white\/5(?!\s*\|)/g;
  if (bgPattern.test(content)) {
    fixed = fixed.replace(bgPattern, 'bg-white/10');
    changes += (content.match(bgPattern) || []).length;
  }

  return { content: fixed, changes };
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const filename = path.basename(filePath);

  const isDark = isDarkModeOnly(content, filename);
  const { content: fixed, changes } = isDark
    ? fixLandingContrast(content)
    : fixDashboardContrast(content);

  if (changes > 0) {
    fs.writeFileSync(filePath, fixed, 'utf8');
    return { changes, type: isDark ? 'dark-only' : 'dashboard' };
  }

  return null;
}

function main() {
  console.log('🎨 Correction finale du contraste - Context-aware\n');

  let totalFiles = 0;
  let totalChanges = 0;
  let darkOnlyFiles = 0;
  let dashboardFiles = 0;

  for (const role of ROLES) {
    const patterns = [
      `src/pages/${role}/**/*.tsx`,
      `src/components/${role}/**/*.tsx`,
    ];

    let roleFiles = 0;
    let roleChanges = 0;
    let roleDarkOnly = 0;
    let roleDashboard = 0;

    for (const pattern of patterns) {
      const files = glob.sync(pattern);

      for (const file of files) {
        const result = processFile(file);
        if (result) {
          roleFiles++;
          roleChanges += result.changes;

          if (result.type === 'dark-only') {
            roleDarkOnly++;
            console.log(`  🌙 ${file.replace(/\\/g, '/')} (${result.changes} fixes dark-mode)`);
          } else {
            roleDashboard++;
            console.log(`  ☀️  ${file.replace(/\\/g, '/')} (${result.changes} fixes dashboard)`);
          }
        }
      }
    }

    if (roleChanges > 0) {
      console.log(`\n📁 ${role.toUpperCase()}: ${roleFiles} fichiers (${roleDarkOnly} dark-only, ${roleDashboard} dashboard) - ${roleChanges} corrections\n`);
      totalFiles += roleFiles;
      totalChanges += roleChanges;
      darkOnlyFiles += roleDarkOnly;
      dashboardFiles += roleDashboard;
    }
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`✅ Correction finale terminée !`);
  console.log(`   📊 ${totalFiles} fichiers corrigés`);
  console.log(`   🌙 ${darkOnlyFiles} pages dark-only (Landing/Register)`);
  console.log(`   ☀️  ${dashboardFiles} pages dashboard (dual-mode)`);
  console.log(`   🎨 ${totalChanges} corrections de contraste appliquées`);
  console.log(`${'='.repeat(70)}\n`);
}

main();
