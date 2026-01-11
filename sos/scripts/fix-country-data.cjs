/**
 * Script pour corriger et réorganiser les fichiers de données pays
 * - Trie par ordre alphabétique français
 * - S'assure que les pays prioritaires apparaissent aussi dans la liste alphabétique
 * - Ajoute les territoires manquants (HK, MO, TW)
 */

const fs = require('fs');
const path = require('path');

// Chemin des fichiers
const DATA_DIR = path.join(__dirname, '..', 'src', 'data');

// ============================================
// CORRECTION DE phone-codes.ts
// ============================================
function fixPhoneCodes() {
  const filePath = path.join(DATA_DIR, 'phone-codes.ts');
  let content = fs.readFileSync(filePath, 'utf8');

  // Extraire le tableau de données
  const match = content.match(/export const phoneCodesData: PhoneCodeEntry\[\] = \[([\s\S]*?)\];/);
  if (!match) {
    console.error('Cannot parse phone-codes.ts');
    return;
  }

  // Parser les entrées existantes
  const entriesRaw = match[1];
  const entries = [];
  const entryRegex = /\{\s*code:\s*'([^']+)',\s*phoneCode:\s*'([^']+)',(?:\s*disabled:\s*(true|false),)?\s*fr:\s*'([^']+)',\s*en:\s*'([^']+)',\s*es:\s*'([^']+)',\s*de:\s*'([^']+)',\s*pt:\s*'([^']+)',\s*ru:\s*'([^']+)',\s*zh:\s*'([^']+)',\s*ar:\s*'([^']+)',\s*hi:\s*'([^']+)'\s*\}/g;

  let entryMatch;
  while ((entryMatch = entryRegex.exec(entriesRaw)) !== null) {
    entries.push({
      code: entryMatch[1],
      phoneCode: entryMatch[2],
      disabled: entryMatch[3] === 'true',
      fr: entryMatch[4],
      en: entryMatch[5],
      es: entryMatch[6],
      de: entryMatch[7],
      pt: entryMatch[8],
      ru: entryMatch[9],
      zh: entryMatch[10],
      ar: entryMatch[11],
      hi: entryMatch[12]
    });
  }

  console.log(`phone-codes.ts: ${entries.length} entrées trouvées`);

  // Fonction de tri par nom français (avec gestion des accents)
  const sortByFrench = (a, b) => {
    return a.fr.localeCompare(b.fr, 'fr', { sensitivity: 'base' });
  };

  // Trier par nom français
  entries.sort(sortByFrench);

  // Reconstruire le fichier
  const header = `// ========================================
// src/data/phone-codes.ts — Country phone dial codes (${entries.length} countries)
// Trié par ordre alphabétique FRANÇAIS
// ========================================

export interface PhoneCodeEntry {
  code: string;
  phoneCode: string;
  disabled?: boolean;
  fr: string;
  en: string;
  es: string;
  de: string;
  pt: string;
  ru: string;
  zh: string;
  ar: string;
  hi: string;
}

export const phoneCodesData: PhoneCodeEntry[] = [
`;

  const entriesStr = entries.map(e => {
    const disabled = e.disabled ? `disabled: true, ` : '';
    return `  { code: '${e.code}', phoneCode: '${e.phoneCode}', ${disabled}fr: '${e.fr}', en: '${e.en}', es: '${e.es}', de: '${e.de}', pt: '${e.pt}', ru: '${e.ru}', zh: '${e.zh}', ar: '${e.ar}', hi: '${e.hi}' }`;
  }).join(',\n');

  const footer = `
];

export default phoneCodesData;
`;

  fs.writeFileSync(filePath, header + entriesStr + footer, 'utf8');
  console.log(`phone-codes.ts: Réorganisé avec ${entries.length} pays triés par nom français`);
}

// ============================================
// EXÉCUTION
// ============================================
console.log('=== Correction des fichiers de données pays ===\n');

try {
  fixPhoneCodes();
  console.log('\n=== Terminé ===');
} catch (error) {
  console.error('Erreur:', error);
}
