/**
 * Smart Contrast Audit - Context-aware audit tool
 *
 * Comprend la différence entre:
 * - Pages DARK-ONLY (Landing, Register): text-gray-300 est OK
 * - Pages DASHBOARD: besoin de dark: variants pour gray-400/gray-500
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const ROLES = ['blogger', 'influencer', 'groupAdmin', 'chatter'];

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

const DASHBOARD_PATTERNS = [
  {
    name: 'gray-500 sans dark mode',
    pattern: /(?<!dark:|dark:placeholder:)text-gray-500(?!\s+dark:)/g,
    severity: 'CRITICAL',
    suggestion: 'Ajouter dark:text-gray-300 ou remplacer par text-gray-700 dark:text-gray-300'
  },
  {
    name: 'gray-400 sans dark mode',
    pattern: /(?<!dark:|dark:placeholder:)text-gray-400(?!\s+dark:)/g,
    severity: 'CRITICAL',
    suggestion: 'Ajouter dark:text-gray-400 ou remplacer par text-gray-600 dark:text-gray-400'
  }
];

const LANDING_PATTERNS = [
  {
    name: 'text-white/60 contraste faible',
    pattern: /text-white\/60/g,
    severity: 'WARNING',
    suggestion: 'Utiliser text-white/85 pour meilleur contraste'
  },
  {
    name: 'text-white/70 contraste faible',
    pattern: /text-white\/70/g,
    severity: 'WARNING',
    suggestion: 'Utiliser text-white/85 pour meilleur contraste'
  },
  {
    name: 'bg-white/5 à peine visible',
    pattern: /bg-white\/5(?!\s*\|)/g,
    severity: 'INFO',
    suggestion: 'Utiliser bg-white/10 pour meilleure visibilité'
  }
];

function auditFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const filename = path.basename(filePath);
  const isDark = isDarkModeOnly(content, filename);

  const patterns = isDark ? LANDING_PATTERNS : DASHBOARD_PATTERNS;
  const issues = [];

  for (const { name, pattern, severity, suggestion } of patterns) {
    const matches = content.match(pattern);
    if (matches) {
      for (const match of matches) {
        issues.push({
          file: filePath.replace(/\\/g, '/'),
          type: name,
          severity,
          match,
          suggestion,
          pageType: isDark ? 'dark-only' : 'dashboard'
        });
      }
    }
  }

  return issues;
}

function main() {
  console.log('🔍 Smart Contrast Audit - Context-aware\n');
  console.log('=' .repeat(70) + '\n');

  const allIssues = {};
  let totalIssues = 0;

  for (const role of ROLES) {
    const patterns = [
      `src/pages/${role.charAt(0).toUpperCase() + role.slice(1)}/**/*.tsx`,
      `src/components/${role.charAt(0).toUpperCase() + role.slice(1)}/**/*.tsx`,
    ];

    allIssues[role] = [];

    for (const pattern of patterns) {
      const files = glob.sync(pattern);

      for (const file of files) {
        const issues = auditFile(file);
        allIssues[role].push(...issues);
      }
    }

    totalIssues += allIssues[role].length;
  }

  // Affichage par rôle
  for (const role of ROLES) {
    const issues = allIssues[role];

    if (issues.length === 0) {
      console.log(`✅ ${role.toUpperCase()}: Aucun problème détecté\n`);
      continue;
    }

    console.log(`📁 ${role.toUpperCase().replace('ADMIN', 'ADMIN')} (${issues.length} problèmes)`);
    console.log('-'.repeat(70));

    const bySeverity = {
      CRITICAL: issues.filter(i => i.severity === 'CRITICAL'),
      WARNING: issues.filter(i => i.severity === 'WARNING'),
      INFO: issues.filter(i => i.severity === 'INFO')
    };

    for (const [severity, items] of Object.entries(bySeverity)) {
      if (items.length === 0) continue;

      const icon = severity === 'CRITICAL' ? '🔴' : severity === 'WARNING' ? '⚠️' : 'ℹ️';
      console.log(`\n${icon} ${severity} (${items.length}):`);

      // Grouper par fichier
      const byFile = {};
      for (const item of items) {
        if (!byFile[item.file]) byFile[item.file] = [];
        byFile[item.file].push(item);
      }

      // Afficher max 5 fichiers
      const files = Object.keys(byFile).slice(0, 5);
      for (const file of files) {
        const fileIssues = byFile[file];
        const pageType = fileIssues[0].pageType === 'dark-only' ? '🌙' : '☀️';
        console.log(`   ${pageType} ${file} (${fileIssues.length})`);
        console.log(`      → ${fileIssues[0].type}: ${fileIssues[0].match}`);
        console.log(`      💡 ${fileIssues[0].suggestion}`);
      }

      if (Object.keys(byFile).length > 5) {
        console.log(`   ... et ${Object.keys(byFile).length - 5} autres fichiers`);
      }
    }

    console.log('\n');
  }

  // Résumé
  console.log('='.repeat(70));
  console.log('📊 RÉSUMÉ GLOBAL');
  console.log('='.repeat(70) + '\n');

  console.log('Par Rôle:');
  for (const role of ROLES) {
    const count = allIssues[role].length;
    const icon = count === 0 ? '✅' : '🔴';
    console.log(`  ${icon} ${role.padEnd(12)}: ${count} problèmes`);
  }

  const allFlat = Object.values(allIssues).flat();
  const bySeverity = {
    CRITICAL: allFlat.filter(i => i.severity === 'CRITICAL').length,
    WARNING: allFlat.filter(i => i.severity === 'WARNING').length,
    INFO: allFlat.filter(i => i.severity === 'INFO').length
  };

  console.log('\nPar Sévérité:');
  console.log(`  🔴 CRITICAL: ${bySeverity.CRITICAL}`);
  console.log(`  ⚠️  WARNING:  ${bySeverity.WARNING}`);
  console.log(`  ℹ️  INFO:     ${bySeverity.INFO}`);

  console.log(`\n📈 Total: ${totalIssues} problèmes détectés`);

  if (totalIssues === 0) {
    console.log('\n🎉 PARFAIT ! Tous les contrastes sont optimaux.');
  } else {
    console.log('\n❌ ACTION REQUISE ! Des problèmes critiques ont été détectés.');
  }

  console.log('\n' + '='.repeat(70) + '\n');

  process.exit(totalIssues > 0 ? 1 : 0);
}

main();
