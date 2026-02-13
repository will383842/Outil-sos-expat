#!/usr/bin/env node
/**
 * Deep Contrast Audit - Vérification exhaustive de tous les problèmes de contraste
 *
 * Vérifie:
 * - text-gray-500 sans dark: sur fond blanc (FAIL)
 * - text-gray-400 sans dark: sur fond blanc (FAIL)
 * - text-white/60, /70, /80 sur fond noir (peut être amélioré)
 * - bg-white/5 (barely visible)
 * - Tout autre pattern problématique
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

// Patterns problématiques à détecter
const PROBLEMS = [
  {
    name: 'gray-500 sans dark mode (CRITICAL)',
    pattern: /text-gray-500(?!\s+dark:)/g,
    severity: 'CRITICAL',
    fix: 'Ajouter dark:text-gray-300 ou remplacer par gray-700 dark:text-gray-300',
  },
  {
    name: 'gray-400 sans dark mode (CRITICAL)',
    pattern: /text-gray-400(?!\s+dark:)/g,
    severity: 'CRITICAL',
    fix: 'Ajouter dark:text-gray-400 ou remplacer par gray-600 dark:text-gray-400',
  },
  {
    name: 'white/60 sur fond noir (WARNING)',
    pattern: /text-white\/60/g,
    severity: 'WARNING',
    fix: 'Remplacer par text-white/80 ou text-white/90',
  },
  {
    name: 'white/70 sur fond noir (WARNING)',
    pattern: /text-white\/70/g,
    severity: 'WARNING',
    fix: 'Remplacer par text-white/90',
  },
  {
    name: 'bg-white/5 barely visible (INFO)',
    pattern: /bg-white\/5(?!\s*\|)/g,
    severity: 'INFO',
    fix: 'Considérer bg-white/10 pour meilleure visibilité',
  },
  {
    name: 'text-gray-300 sur fond blanc (CRITICAL)',
    pattern: /(?<!dark:)text-gray-300(?!\s+dark:)/g,
    severity: 'CRITICAL',
    fix: 'Ne jamais utiliser gray-300 sur fond blanc',
  },
  {
    name: 'text-gray-200 sur fond blanc (CRITICAL)',
    pattern: /(?<!dark:)text-gray-200(?!\s+dark:)/g,
    severity: 'CRITICAL',
    fix: 'Ne jamais utiliser gray-200 sur fond blanc',
  },
];

// Directories à auditer par rôle
const ROLES = {
  blogger: [
    'src/pages/Blogger',
    'src/components/Blogger',
  ],
  influencer: [
    'src/pages/Influencer',
    'src/components/Influencer',
  ],
  groupAdmin: [
    'src/pages/GroupAdmin',
    'src/components/GroupAdmin',
  ],
  chatter: [
    'src/pages/Chatter',
    'src/components/Chatter',
  ],
};

let totalIssues = 0;
const issuesByRole = {};
const issuesBySeverity = { CRITICAL: 0, WARNING: 0, INFO: 0 };

function scanFile(filePath, role) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relPath = path.relative(ROOT, filePath);
  const issues = [];

  // Détection dark mode only (bg-black, bg-gradient avec noir)
  const isDarkModeOnly =
    /className="[^"]*bg-black[^"]*"/.test(content) ||
    /className="[^"]*bg-gradient-to-[^"]*black[^"]*"/.test(content) ||
    filePath.includes('Landing.tsx') ||
    filePath.includes('Register.tsx');

  PROBLEMS.forEach(({ name, pattern, severity, fix }) => {
    const matches = content.match(pattern);
    if (matches) {
      // Si dark mode only, ignorer les warnings sur gray-400/500 (ils sont OK sur fond noir)
      if (isDarkModeOnly && severity === 'CRITICAL' && name.includes('sans dark mode')) {
        return; // OK pour dark mode only
      }

      matches.forEach(match => {
        const lines = content.substring(0, content.indexOf(match)).split('\n');
        const lineNumber = lines.length;
        const lineContent = content.split('\n')[lineNumber - 1]?.trim();

        issues.push({
          file: relPath,
          line: lineNumber,
          lineContent: lineContent?.substring(0, 100) + (lineContent?.length > 100 ? '...' : ''),
          problem: name,
          match,
          severity,
          fix,
          isDarkModeOnly,
        });
      });
    }
  });

  return issues;
}

function scanDirectory(dir, role) {
  const fullPath = path.join(ROOT, dir);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Skipped: ${dir} (not found)`);
    return [];
  }

  const files = execSync(`find "${fullPath}" -name "*.tsx" -type f`, { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);

  const allIssues = [];

  files.forEach(file => {
    const issues = scanFile(file, role);
    allIssues.push(...issues);
  });

  return allIssues;
}

console.log('🔍 Deep Contrast Audit - Vérification exhaustive\n');
console.log('═══════════════════════════════════════════════════════════════\n');

Object.entries(ROLES).forEach(([role, dirs]) => {
  console.log(`\n📁 ${role.toUpperCase()}`);
  console.log('─'.repeat(70));

  const roleIssues = [];

  dirs.forEach(dir => {
    const issues = scanDirectory(dir, role);
    roleIssues.push(...issues);
  });

  if (roleIssues.length === 0) {
    console.log(`✅ Aucun problème détecté !`);
  } else {
    // Grouper par sévérité
    const critical = roleIssues.filter(i => i.severity === 'CRITICAL');
    const warnings = roleIssues.filter(i => i.severity === 'WARNING');
    const info = roleIssues.filter(i => i.severity === 'INFO');

    if (critical.length > 0) {
      console.log(`\n🔴 CRITICAL (${critical.length} problèmes):`);
      critical.slice(0, 10).forEach(issue => {
        console.log(`   ${issue.file}:${issue.line}`);
        console.log(`   → ${issue.problem}`);
        console.log(`   → ${issue.match}`);
        console.log(`   💡 ${issue.fix}\n`);
      });
      if (critical.length > 10) {
        console.log(`   ... et ${critical.length - 10} autres\n`);
      }
    }

    if (warnings.length > 0) {
      console.log(`\n⚠️  WARNING (${warnings.length} problèmes):`);
      warnings.slice(0, 5).forEach(issue => {
        console.log(`   ${issue.file}:${issue.line} → ${issue.match}`);
      });
      if (warnings.length > 5) {
        console.log(`   ... et ${warnings.length - 5} autres\n`);
      }
    }

    if (info.length > 0) {
      console.log(`\nℹ️  INFO (${info.length} améliorations possibles)`);
    }

    issuesBySeverity.CRITICAL += critical.length;
    issuesBySeverity.WARNING += warnings.length;
    issuesBySeverity.INFO += info.length;
  }

  issuesByRole[role] = roleIssues.length;
  totalIssues += roleIssues.length;
});

// Résumé final
console.log('\n\n═══════════════════════════════════════════════════════════════');
console.log('📊 RÉSUMÉ GLOBAL');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('Par Rôle:');
Object.entries(issuesByRole).forEach(([role, count]) => {
  const icon = count === 0 ? '✅' : count < 5 ? '⚠️ ' : '🔴';
  console.log(`  ${icon} ${role.padEnd(12)}: ${count} problèmes`);
});

console.log('\nPar Sévérité:');
console.log(`  🔴 CRITICAL: ${issuesBySeverity.CRITICAL}`);
console.log(`  ⚠️  WARNING:  ${issuesBySeverity.WARNING}`);
console.log(`  ℹ️  INFO:     ${issuesBySeverity.INFO}`);

console.log(`\n📈 Total: ${totalIssues} problèmes détectés`);

if (totalIssues === 0) {
  console.log('\n🎉 PARFAIT ! Aucun problème de contraste détecté.\n');
  process.exit(0);
} else if (issuesBySeverity.CRITICAL === 0) {
  console.log('\n✅ Bon ! Aucun problème critique. Quelques améliorations possibles.\n');
  process.exit(0);
} else {
  console.log('\n❌ ACTION REQUISE ! Des problèmes critiques ont été détectés.\n');
  process.exit(1);
}
