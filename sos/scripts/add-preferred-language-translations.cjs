#!/usr/bin/env node
/**
 * Script pour ajouter les traductions manquantes "preferredLanguage"
 * dans tous les fichiers de langue (fr, en, es, de, pt, ru, zh, hi, ar)
 */

const fs = require('fs');
const path = require('path');

const HELPER_DIR = path.join(__dirname, '../src/helper');

// Traductions pour "Langue préférée" dans les 9 langues
const translations = {
  fr: 'Langue préférée',
  en: 'Preferred language',
  es: 'Idioma preferido',
  de: 'Bevorzugte Sprache',
  pt: 'Idioma preferido',
  ru: 'Предпочтительный язык',
  zh: '首选语言',
  hi: 'पसंदीदा भाषा',
  ar: 'اللغة المفضلة'
};

const languages = ['fr', 'en', 'es', 'de', 'pt', 'ru', 'zh', 'hi', 'ar'];

let totalAdded = 0;

languages.forEach(lang => {
  const filePath = path.join(HELPER_DIR, `${lang}.json`);

  if (!fs.existsSync(filePath)) {
    console.log(`❌ [${lang}] Fichier non trouvé: ${filePath}`);
    return;
  }

  console.log(`\n📝 [${lang}] Traitement de ${lang}.json...`);

  try {
    // Lire le fichier JSON
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);

    // Vérifier si les clés existent déjà
    const expatKey = 'registerExpat.fields.preferredLanguage';
    const lawyerKey = 'registerLawyer.fields.preferredLanguage';

    let added = 0;

    if (!data[expatKey]) {
      data[expatKey] = translations[lang];
      console.log(`   ✅ Ajouté: ${expatKey} = "${translations[lang]}"`);
      added++;
      totalAdded++;
    } else {
      console.log(`   ⏭️  Existe déjà: ${expatKey}`);
    }

    if (!data[lawyerKey]) {
      data[lawyerKey] = translations[lang];
      console.log(`   ✅ Ajouté: ${lawyerKey} = "${translations[lang]}"`);
      added++;
      totalAdded++;
    } else {
      console.log(`   ⏭️  Existe déjà: ${lawyerKey}`);
    }

    if (added > 0) {
      // Trier les clés alphabétiquement
      const sortedData = Object.keys(data)
        .sort()
        .reduce((acc, key) => {
          acc[key] = data[key];
          return acc;
        }, {});

      // Écrire le fichier JSON avec indentation
      fs.writeFileSync(
        filePath,
        JSON.stringify(sortedData, null, 2) + '\n',
        'utf8'
      );
      console.log(`   💾 Fichier sauvegardé avec ${added} nouvelle(s) traduction(s)`);
    } else {
      console.log(`   ✓ Aucune modification nécessaire`);
    }

  } catch (error) {
    console.error(`❌ [${lang}] Erreur:`, error.message);
  }
});

console.log(`\n✅ TERMINÉ: ${totalAdded} traductions ajoutées au total`);
console.log(`\n📌 Les clés ajoutées:`);
console.log(`   - registerExpat.fields.preferredLanguage`);
console.log(`   - registerLawyer.fields.preferredLanguage`);
console.log(`\n💡 Les formulaires d'inscription afficheront maintenant "Langue préférée" dans la bonne langue!`);
