const fs = require('fs');
const path = require('path');

const LOCALES_DIR = './sos/src/locales';

// Traductions professionnelles des 6 clés manquantes pour influencer
const INFLUENCER_MISSING = {
  'fr-fr': {
    "influencer.register.personalInfo": "Informations personnelles",
    "influencer.register.socialInfo": "Informations sur les réseaux sociaux",
    "influencer.register.warning.title": "Important : Rôle permanent",
    "influencer.register.warning.message": "En devenant influenceur, vous ne pourrez pas devenir Chatter ou Blogueur. Ce choix est définitif et irréversible.",
    "influencer.register.acknowledgment": "Je comprends et accepte que ce rôle est permanent",
    "influencer.register.error.acknowledgment": "Vous devez reconnaître que le rôle d'influenceur est permanent"
  },
  'en': {
    "influencer.register.personalInfo": "Personal information",
    "influencer.register.socialInfo": "Social media information",
    "influencer.register.warning.title": "Important: Permanent role",
    "influencer.register.warning.message": "By becoming an influencer, you will not be able to become a Chatter or Blogger. This choice is final and irreversible.",
    "influencer.register.acknowledgment": "I understand and accept that this role is permanent",
    "influencer.register.error.acknowledgment": "You must acknowledge that the influencer role is permanent"
  },
  'de-de': {
    "influencer.register.personalInfo": "Persönliche Informationen",
    "influencer.register.socialInfo": "Social-Media-Informationen",
    "influencer.register.warning.title": "Wichtig: Dauerhafte Rolle",
    "influencer.register.warning.message": "Wenn Sie Influencer werden, können Sie kein Chatter oder Blogger mehr werden. Diese Wahl ist endgültig und unwiderruflich.",
    "influencer.register.acknowledgment": "Ich verstehe und akzeptiere, dass diese Rolle dauerhaft ist",
    "influencer.register.error.acknowledgment": "Sie müssen bestätigen, dass die Influencer-Rolle dauerhaft ist"
  },
  'ru-ru': {
    "influencer.register.personalInfo": "Личная информация",
    "influencer.register.socialInfo": "Информация о социальных сетях",
    "influencer.register.warning.title": "Важно: постоянная роль",
    "influencer.register.warning.message": "Став инфлюенсером, вы не сможете стать чаттером или блогером. Этот выбор окончательный и необратимый.",
    "influencer.register.acknowledgment": "Я понимаю и принимаю, что эта роль является постоянной",
    "influencer.register.error.acknowledgment": "Вы должны признать, что роль инфлюенсера является постоянной"
  },
  'ar-sa': {
    "influencer.register.personalInfo": "معلومات شخصية",
    "influencer.register.socialInfo": "معلومات وسائل التواصل الاجتماعي",
    "influencer.register.warning.title": "مهم: دور دائم",
    "influencer.register.warning.message": "بأن تصبح مؤثرًا، لن تتمكن من أن تصبح متحدثًا أو مدونًا. هذا الاختيار نهائي ولا رجعة فيه.",
    "influencer.register.acknowledgment": "أفهم وأقبل أن هذا الدور دائم",
    "influencer.register.error.acknowledgment": "يجب عليك الإقرار بأن دور المؤثر دائم"
  }
};

// Espagnol - traductions pour influencer (84 clés manquantes - on commence par les 6 principales)
const INFLUENCER_ES_PARTIAL = {
  "influencer.register.personalInfo": "Información personal",
  "influencer.register.socialInfo": "Información de redes sociales",
  "influencer.register.warning.title": "Importante: Rol permanente",
  "influencer.register.warning.message": "Al convertirte en influencer, no podrás convertirte en Chatter o Blogger. Esta elección es definitiva e irreversible.",
  "influencer.register.acknowledgment": "Entiendo y acepto que este rol es permanente",
  "influencer.register.error.acknowledgment": "Debes reconocer que el rol de influencer es permanente"
};

function addMissingKeys(filePath, missingKeys) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);

    let modified = false;
    for (const [key, value] of Object.entries(missingKeys)) {
      if (!data[key]) {
        data[key] = value;
        modified = true;
        console.log(`  ✅ Ajouté: ${key}`);
      }
    }

    if (modified) {
      // Trier les clés alphabétiquement pour garder la cohérence
      const sortedData = Object.keys(data)
        .sort()
        .reduce((acc, key) => {
          acc[key] = data[key];
          return acc;
        }, {});

      fs.writeFileSync(filePath, JSON.stringify(sortedData, null, 2) + '\n', 'utf8');
      console.log(`  💾 Fichier sauvegardé\n`);
      return true;
    } else {
      console.log(`  ⏭️  Aucune modification nécessaire\n`);
      return false;
    }
  } catch (error) {
    console.error(`  ❌ Erreur: ${error.message}\n`);
    return false;
  }
}

console.log('🚀 Ajout des traductions manquantes pour INFLUENCER\n');
console.log('=' .repeat(80));

// Ajouter les 6 clés manquantes pour chaque langue
for (const [lang, translations] of Object.entries(INFLUENCER_MISSING)) {
  console.log(`\n📝 ${lang.toUpperCase()}`);
  const filePath = path.join(LOCALES_DIR, lang, 'common.json');
  addMissingKeys(filePath, translations);
}

// Ajouter aussi pour l'espagnol (au moins les 6 principales)
console.log(`\n📝 ES-ES (6 clés principales)`);
const esPath = path.join(LOCALES_DIR, 'es-es', 'common.json');
addMissingKeys(esPath, INFLUENCER_ES_PARTIAL);

console.log('\n' + '='.repeat(80));
console.log('✨ Traductions influencer ajoutées avec succès !\n');
