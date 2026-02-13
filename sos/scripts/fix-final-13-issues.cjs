/**
 * Script pour corriger les 13 derniers problèmes de contraste
 */

const fs = require('fs');
const path = require('path');

const FILES = [
  'src/pages/Chatter/ChatterLeaderboard.tsx',
  'src/components/Chatter/Cards/ChatterLevelCard.tsx',
  'src/components/Chatter/Cards/ComparisonStatsCard.tsx',
  'src/components/Chatter/Cards/DailyMissionsCard.tsx',
  'src/components/Chatter/Cards/MilestoneProgressCard.tsx',
  'src/components/Chatter/Cards/PiggyBankCard.tsx',
  'src/components/Chatter/Cards/ReferralTreeCard.tsx',
  'src/components/Chatter/Cards/RevenueCalculatorCard.tsx',
  'src/components/Chatter/Cards/WeeklyChallengeCard.tsx',
];

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changes = 0;

  // Fix: text-gray-500 → text-gray-700 dark:text-gray-300 (si pas déjà dark:text-gray-500)
  // On cherche className=" ... text-gray-500 ..." où il n'y a pas de dark:text-
  const classNamePattern = /className=(?:"([^"]*)"|{`([^`]*)`})/g;

  content = content.replace(classNamePattern, (fullMatch, quoted, backticked) => {
    const classes = quoted || backticked;
    const isBackticked = !!backticked;

    // Séparer les parties (pour gérer les ${}  dans les backticks)
    let fixed = classes;

    // Fix text-gray-500 qui n'est pas déjà précédé de dark: et pas suivi de dark:
    if (/(?<!dark:)text-gray-500(?!\s+dark:)/.test(fixed)) {
      // Remplacer UNIQUEMENT si c'est un standalone text-gray-500
      fixed = fixed.replace(/(^|[\s"'\`])text-gray-500($|[\s"'\`])/g, '$1text-gray-700 dark:text-gray-300$2');
      changes++;
    }

    // Fix text-gray-400 qui n'est pas déjà précédé de dark: et pas suivi de dark:
    if (/(?<!dark:)text-gray-400(?!\s+dark:)/.test(fixed)) {
      fixed = fixed.replace(/(^|[\s"'\`])text-gray-400($|[\s"'\`])/g, '$1text-gray-600 dark:text-gray-400$2');
      changes++;
    }

    if (fixed !== classes) {
      return isBackticked ? `className={\`${fixed}\`}` : `className="${fixed}"`;
    }

    return fullMatch;
  });

  if (changes > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
  }

  return changes;
}

function main() {
  console.log('🎯 Correction des 13 derniers problèmes de contraste\n');

  let total = 0;

  for (const file of FILES) {
    const changes = fixFile(file);
    if (changes > 0) {
      console.log(`  ✓ ${file} (${changes} fixes)`);
      total += changes;
    }
  }

  console.log(`\n✅ Terminé ! ${total} corrections appliquées\n`);
}

main();
