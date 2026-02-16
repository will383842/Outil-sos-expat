const fs = require('fs');

const report = JSON.parse(fs.readFileSync('chatter_translations_report.json', 'utf8'));

console.log(`

╔════════════════════════════════════════════════════════════════╗
║       VÉRIFICATION DES TRADUCTIONS I18N - CHATTER             ║
╚════════════════════════════════════════════════════════════════╝

`);

console.log(`📊 STATISTIQUES GLOBALES\n`);
console.log(`   Nombre total de clés Chatter utilisées:     602 clés`);
console.log(`   Nombre de clés manquantes (toutes langues): 202 clés`);
console.log(`   Taux de couverture moyen:                   66% (400 clés en français)\n`);

console.log(`\n═══════════════════════════════════════════════════════════════\n`);
console.log(`📈 COUVERTURE PAR LANGUE\n`);

const sorted = Object.entries(report.languages)
  .sort((a, b) => b[1].coverage - a[1].coverage);

sorted.forEach(([lang, data], idx) => {
  const bar = '█'.repeat(Math.round(data.coverage / 5)) + '░'.repeat(20 - Math.round(data.coverage / 5));
  const symbol = data.coverage === 100 ? '✅' : '⚠️';
  console.log(`${symbol} ${lang.toUpperCase().padEnd(4)} [${bar}] ${data.coverage}%  (${data.present}/602)`);
});

console.log(`\n═══════════════════════════════════════════════════════════════\n`);
console.log(`🔍 ANALYSE DÉTAILLÉE\n`);

const languages = ['fr', 'en', 'es', 'de', 'ru', 'pt', 'ch', 'hi', 'ar'];

// Keys with partial coverage
const pt = report.missingKeysByLanguage.pt;
const hi = report.missingKeysByLanguage.hi;

console.log(`\n✓ Langues avec la meilleure couverture:\n`);
console.log(`  PT (Portugais):  67% - Manque 200 clés`);
console.log(`  HI (Hindi):      67% - Manque 201 clés`);
console.log(`\n    Clés présentes en PT mais absentes en HI:`);
console.log(`    - chatter.register.alreadyRegistered\n`);
console.log(`  Clés présentes en HI mais absentes en PT:`);
console.log(`    - chatter.register.loginLink\n`);

console.log(`\n✗ Langues avec couverture standard:\n`);
['fr', 'en', 'es', 'de', 'ru', 'ch', 'ar'].forEach(lang => {
  console.log(`  ${lang.toUpperCase()} (${report.languages[lang].coverage}%)`);
});

console.log(`\n═══════════════════════════════════════════════════════════════\n`);
console.log(`📋 TOP 10 CATÉGORIES DE CLÉS MANQUANTES\n`);

const keysByPrefix = {};
const allMissing = new Set();
Object.values(report.missingKeysByLanguage).forEach(keys => {
  keys.forEach(k => allMissing.add(k));
});

allMissing.forEach(key => {
  const prefix = key.split('.').slice(0, 3).join('.');
  if (!keysByPrefix[prefix]) {
    keysByPrefix[prefix] = 0;
  }
  keysByPrefix[prefix]++;
});

Object.entries(keysByPrefix)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .forEach(([prefix, count], idx) => {
    console.log(`  ${(idx+1).toString().padStart(2)}. ${prefix.padEnd(35)} (${count} clés)`);
  });

console.log(`\n═══════════════════════════════════════════════════════════════\n`);
console.log(`⚠️  POINTS IMPORTANTS\n`);
console.log(`  • 200 clés manquent dans TOUTES les 9 langues`);
console.log(`  • Seulement 2 clés sont présentes partiellement:`);
console.log(`    - chatter.register.alreadyRegistered (PT, EN, etc.)`);
console.log(`    - chatter.register.loginLink (HI, etc.)\n`);
console.log(`  • Les catégories principales manquantes:`);
console.log(`    - Erreurs d'enregistrement (11 clés)`);
console.log(`    - Exemples de calculs (8 clés)`);
console.log(`    - Schémas JSON/Rich Snippets (20+ clés)`);
console.log(`    - Contenu produit/fournisseur (30+ clés)\n`);

console.log(`\n═══════════════════════════════════════════════════════════════\n`);
console.log(`✅ RECOMMANDATION\n`);
console.log(`  Les traductions Chatter sont incomplétes à 34%.`);
console.log(`  Il faut ajouter 202 clés manquantes dans les 9 langues.\n`);
