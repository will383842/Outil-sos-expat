/**
 * Advanced duplicate cleaner - Handles complex duplication patterns
 *
 * Fixes patterns like:
 * - text-gray-600 dark:text-gray-600 dark:text-gray-400 → text-gray-600 dark:text-gray-400
 * - bg-gray-100 dark:bg-gray-100 dark:bg-gray-900 → bg-gray-100 dark:bg-gray-900
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const ROLES = ['Blogger', 'Influencer', 'GroupAdmin', 'Chatter'];

function advancedCleanDuplicates(content) {
  let fixed = content;
  let changes = 0;

  // Pattern pour capturer className avec potentiellement des duplications
  const classNamePattern = /className="([^"]*)"/g;

  fixed = fixed.replace(classNamePattern, (match, classes) => {
    const originalClasses = classes;
    const parts = classes.split(/\s+/).filter(Boolean);

    const cleanedParts = [];
    const seenProps = new Map(); // Map<property, {base?: string, dark?: string}>

    for (const part of parts) {
      if (part.startsWith('dark:')) {
        // Classe dark mode
        const [, darkClass] = part.split(':');
        const property = darkClass.split('-')[0]; // ex: "text", "bg", "border"

        if (!seenProps.has(property)) {
          seenProps.set(property, { dark: part });
        } else {
          // On a déjà vu cette propriété, mettre à jour le dark
          seenProps.get(property).dark = part;
        }
      } else {
        // Classe normale (light mode)
        const property = part.split('-')[0];

        if (!seenProps.has(property)) {
          seenProps.set(property, { base: part });
        } else if (!seenProps.get(property).base) {
          // Ajouter la classe base si elle n'existe pas
          seenProps.get(property).base = part;
        }
        // Sinon, c'est une duplication, on l'ignore
      }
    }

    // Reconstruire les classes: d'abord les classes base, puis les dark
    for (const [, { base, dark }] of seenProps) {
      if (base) cleanedParts.push(base);
      if (dark) cleanedParts.push(dark);
    }

    const result = cleanedParts.join(' ');
    if (result !== originalClasses) {
      changes++;
    }

    return `className="${result}"`;
  });

  // Nettoyer aussi les template literals avec backticks
  const backtickPattern = /className=\{`([^`]*)`\}/g;
  fixed = fixed.replace(backtickPattern, (match, classes) => {
    // Pour les template literals, on cherche les parties sans ${}
    const parts = classes.split(/(\$\{[^}]+\})/);
    let changed = false;

    const processedParts = parts.map(part => {
      if (part.startsWith('${')) return part; // Garder les expressions telles quelles

      const classParts = part.split(/\s+/).filter(Boolean);
      const cleanedParts = [];
      const seenProps = new Map();

      for (const p of classParts) {
        if (p.startsWith('dark:')) {
          const [, darkClass] = p.split(':');
          const property = darkClass.split('-')[0];

          if (!seenProps.has(property)) {
            seenProps.set(property, { dark: p });
          } else {
            seenProps.get(property).dark = p;
            changed = true;
          }
        } else {
          const property = p.split('-')[0];

          if (!seenProps.has(property)) {
            seenProps.set(property, { base: p });
          } else if (!seenProps.get(property).base) {
            seenProps.get(property).base = p;
          } else {
            changed = true; // Duplication détectée
          }
        }
      }

      for (const [, { base, dark }] of seenProps) {
        if (base) cleanedParts.push(base);
        if (dark) cleanedParts.push(dark);
      }

      return cleanedParts.join(' ');
    });

    if (changed) {
      changes++;
      return `className={\`${processedParts.join('')}\`}`;
    }

    return match;
  });

  return { content: fixed, changes };
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const { content: fixed, changes } = advancedCleanDuplicates(content);

  if (changes > 0) {
    fs.writeFileSync(filePath, fixed, 'utf8');
    return changes;
  }

  return 0;
}

function main() {
  console.log('🔧 Advanced Duplicate Cleaner - Complex pattern handling\n');

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
          console.log(`  ✓ ${file.replace(/\\/g, '/')} (${changes} patterns nettoyés)`);
        }
      }
    }

    if (roleChanges > 0) {
      console.log(`\n📁 ${role.toUpperCase()}: ${roleFiles} fichiers (${roleChanges} patterns)\n`);
      totalFiles += roleFiles;
      totalChanges += roleChanges;
    }
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`✅ Nettoyage avancé terminé !`);
  console.log(`   📊 ${totalFiles} fichiers`);
  console.log(`   🔧 ${totalChanges} patterns complexes corrigés`);
  console.log(`${'='.repeat(70)}\n`);
}

main();
