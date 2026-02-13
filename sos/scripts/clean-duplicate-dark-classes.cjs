/**
 * Script pour nettoyer les duplications de classes dark: dans Tailwind
 * Exemple: "text-gray-700 dark:text-gray-300 dark:text-gray-600" → "text-gray-700 dark:text-gray-300"
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const ROLES = ['Blogger', 'Influencer', 'GroupAdmin', 'Chatter'];

function cleanDuplicateDarkClasses(content) {
  let fixed = content;
  let changes = 0;

  // Pattern pour capturer toutes les classes dans un className
  const classNamePattern = /className="([^"]*)"/g;

  fixed = fixed.replace(classNamePattern, (match, classes) => {
    const classArray = classes.split(/\s+/);
    const cleaned = [];
    const darkClasses = new Set();
    const baseClasses = new Set();

    // Séparer les classes base et dark
    for (const cls of classArray) {
      if (cls.startsWith('dark:')) {
        const property = cls.split(':')[1].split('-')[0]; // ex: "text" de "dark:text-gray-300"

        // Si on n'a pas encore vu de classe dark: pour cette propriété, on la garde
        if (!darkClasses.has(property)) {
          darkClasses.add(property);
          cleaned.push(cls);
        } else {
          // Duplication détectée
          changes++;
        }
      } else {
        const property = cls.split('-')[0]; // ex: "text" de "text-gray-700"

        // Pour les classes base, garder uniquement la première occurrence de chaque propriété
        if (!baseClasses.has(property)) {
          baseClasses.add(property);
          cleaned.push(cls);
        } else {
          // Duplication détectée
          changes++;
        }
      }
    }

    return `className="${cleaned.join(' ')}"`;
  });

  return { content: fixed, changes };
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const { content: fixed, changes } = cleanDuplicateDarkClasses(content);

  if (changes > 0) {
    fs.writeFileSync(filePath, fixed, 'utf8');
    return changes;
  }

  return 0;
}

function main() {
  console.log('🧹 Nettoyage des duplications dark: dans les classes Tailwind\n');

  let totalFiles = 0;
  let totalChanges = 0;

  for (const role of ROLES) {
    const patterns = [
      `src/pages/${role}/**/*.tsx`,
      `src/components/${role}/**/*.tsx`,
    ];

    let roleFiles = 0;
    let roleChanges = 0;

    for (const pattern of patterns) {
      const files = glob.sync(pattern);

      for (const file of files) {
        const changes = processFile(file);
        if (changes > 0) {
          roleFiles++;
          roleChanges += changes;
          console.log(`  ✓ ${file.replace(/\\/g, '/')} (${changes} duplications nettoyées)`);
        }
      }
    }

    if (roleChanges > 0) {
      console.log(`\n📁 ${role.toUpperCase()}: ${roleFiles} fichiers nettoyés (${roleChanges} duplications)\n`);
      totalFiles += roleFiles;
      totalChanges += roleChanges;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Terminé ! ${totalFiles} fichiers nettoyés, ${totalChanges} duplications supprimées`);
  console.log(`${'='.repeat(60)}\n`);
}

main();
