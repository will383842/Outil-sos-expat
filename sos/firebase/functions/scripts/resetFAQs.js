/**
 * Script pour réinitialiser les FAQ avec les nouvelles traductions
 * Usage: node scripts/resetFAQs.js
 *
 * Ce script:
 * 1. Supprime toutes les FAQ existantes
 * 2. Crée les nouvelles FAQ avec traduction automatique en 9 langues
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin with project ID
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'sos-urgently-ac307'
  });
}

const db = admin.firestore();

// Les 9 langues supportées
const SUPPORTED_LANGUAGES = ['fr', 'en', 'es', 'de', 'pt', 'ru', 'hi', 'ar', 'ch'];

// ============================================================================
// FAQ SOURCES (mises à jour avec les corrections)
// ============================================================================

const DISCOVER_FAQS = [
  {
    question: "Qu'est-ce que SOS-Expat ?",
    answer: "SOS-Expat est une plateforme de mise en relation qui offre un premier contact rapide avec des avocats spécialisés et des expats aidants locaux. Notre mission : apporter une première aide immédiate, personnalisée et multilingue à tout expatrié, voyageur ou vacancier, quelle que soit sa nationalité, sa langue ou son pays. Nous couvrons 197 pays et proposons nos services en 9 langues.",
    category: "discover",
    tags: ["présentation", "plateforme", "mission", "expatriés", "voyageurs", "vacanciers"],
    order: 1,
    isActive: true,
    isFooter: true
  },
  {
    question: "Comment fonctionne la plateforme ?",
    answer: "SOS-Expat vous connecte à des prestataires pour un premier contact d'aide rapide :\n\n1. Créez votre compte gratuitement\n2. Choisissez un prestataire (avocat 49€/20min ou expat aidant 19€/30min)\n3. Effectuez un paiement unique (rémunération prestataire + frais de mise en relation)\n4. Soyez mis en relation immédiatement par téléphone\n5. Évaluez votre prestataire après l'appel\n\nCes appels sont conçus pour apporter une première aide. Toute ouverture de dossier ou collaboration se poursuit directement avec le prestataire, en dehors de la plateforme.",
    category: "discover",
    tags: ["fonctionnement", "étapes", "processus", "inscription", "premier contact"],
    order: 2,
    isActive: true,
    isFooter: true
  },
  {
    question: "Quelle différence entre avocat et expat aidant ?",
    answer: "SOS-Expat propose un premier contact rapide avec deux types de prestataires :\n\n• Avocat (49€ / 20 min) : Professionnel du droit diplômé, inscrit au barreau. Premier conseil juridique sur contrats, litiges, immigration, droit du travail...\n\n• Expat Aidant (19€ / 30 min) : Expatrié expérimenté vivant dans votre pays de destination. Premiers conseils pratiques sur démarches administratives, logement, culture locale...\n\nCes appels constituent une première aide rapide. Si un suivi ou l'ouverture d'un dossier est nécessaire, cela se fait directement entre vous et le prestataire, en dehors de la plateforme SOS-Expat.",
    category: "discover",
    tags: ["avocat", "expat aidant", "différence", "prestataire", "premier contact"],
    order: 5,
    isActive: true,
    isFooter: true
  },
  {
    question: "Qui sont les prestataires sur SOS-Expat ?",
    answer: "Nos prestataires sont des professionnels vérifiés qui offrent un premier contact d'aide rapide :\n• Avocats : diplômés et inscrits au barreau de leur pays (49€/20min)\n• Expats aidants : expatriés expérimentés vivant depuis au moins 2 ans dans leur pays d'accueil (19€/30min)\n\nTous passent par un processus de vérification (KYC) et sont notés par les utilisateurs. Les tarifs sont fixés par SOS-Expat, les prestataires ne fixent pas leurs propres prix.",
    category: "discover",
    tags: ["prestataires", "vérification", "qualité", "tarifs fixes"],
    order: 8,
    isActive: true,
    isFooter: false
  }
];

const PROVIDERS_FAQS = [
  {
    question: "Comment devenir prestataire ?",
    answer: "SOS-Expat est une plateforme de mise en relation pour des premiers contacts rapides avec des expatriés, voyageurs et vacanciers du monde entier.\n\n1. Cliquez sur \"Devenir prestataire\"\n2. Choisissez votre profil : Avocat ou Expat Aidant\n3. Remplissez le formulaire avec vos informations\n4. Téléchargez les documents requis (diplôme pour avocats, preuve de résidence pour expats)\n5. Complétez la vérification d'identité (KYC)\n6. Attendez la validation (généralement 24-48h)\n\nNote importante : Les tarifs sont définis par SOS-Expat (49€/20min pour avocats, 19€/30min pour expats). Vous n'avez pas à fixer vos propres tarifs.",
    category: "providers",
    tags: ["prestataire", "inscription", "devenir", "avocat", "expat"],
    order: 20,
    isActive: true,
    isFooter: true
  },
  {
    question: "Comment suis-je payé ?",
    answer: "Les paiements sont effectués via Stripe Connect :\n• Après chaque appel réussi, votre rémunération est créditée sur votre compte Stripe\n• Les tarifs sont fixés par SOS-Expat : 49€ (20 min) pour avocats, 19€ (30 min) pour expats aidants\n• Le client fait un paiement unique, scindé entre votre rémunération et les frais de mise en relation SOS-Expat\n• Seuls les frais Stripe (~2.9%) sont déduits de votre part\n• Virements automatiques vers votre compte bancaire (quotidien, hebdomadaire ou mensuel)\n• Suivi de vos revenus dans votre tableau de bord",
    category: "providers",
    tags: ["paiement", "revenus", "stripe", "rémunération"],
    order: 22,
    isActive: true,
    isFooter: true
  },
  {
    question: "Comment fonctionne la rémunération sur SOS-Expat ?",
    answer: "SOS-Expat est une plateforme de mise en relation pour des premiers contacts rapides. Le modèle est simple :\n\n• Tarifs fixes définis par SOS-Expat : 49€ (20 min avocat), 19€ (30 min expat aidant)\n• Le client fait un SEUL paiement qui comprend :\n  - Votre rémunération de prestataire\n  - Les frais de mise en relation SOS-Expat (couvrant Twilio, plateforme, fonctionnalités)\n• Seuls les frais de transaction Stripe (~2.9%) sont déduits de votre part\n\nImportant : Ces appels sont un premier contact d'aide rapide. Si le client souhaite ouvrir un dossier ou poursuivre la collaboration, cela se fait directement avec vous, en dehors de la plateforme SOS-Expat.",
    category: "providers",
    tags: ["rémunération", "frais", "tarification", "premier contact"],
    order: 25,
    isActive: true,
    isFooter: false
  }
];

const CLIENTS_FAQS = [
  {
    question: "Combien de temps dure un appel ?",
    answer: "Les durées sont fixes et adaptées à un premier contact d'aide rapide :\n\n• Appel Avocat : 20 minutes pour 49€\n• Appel Expat Aidant : 30 minutes pour 19€\n\nUn compteur affiche le temps restant pendant l'appel. Ces appels permettent d'obtenir une première aide. Pour un suivi plus approfondi ou l'ouverture d'un dossier, vous pouvez poursuivre directement avec le prestataire en dehors de la plateforme.",
    category: "clients",
    tags: ["durée", "temps", "appel", "premier contact"],
    order: 14,
    isActive: true,
    isFooter: false
  }
];

const PAYMENTS_FAQS = [
  {
    question: "Comment fonctionne le paiement ?",
    answer: "Le paiement s'effectue avant la mise en relation, de manière 100% sécurisée via Stripe :\n\n1. Vous choisissez votre prestataire (avocat ou expat aidant)\n2. Vous effectuez un paiement unique (19€ ou 49€) qui comprend :\n   - La rémunération du prestataire\n   - Les frais de mise en relation SOS-Expat (Twilio, plateforme)\n3. Vous êtes mis en relation immédiatement par téléphone\n4. Si l'appel n'aboutit pas, remboursement automatique à 100%\n\nCe premier contact vous permet d'obtenir une aide rapide. Toute suite (dossier, collaboration) se fait directement avec le prestataire, en dehors de SOS-Expat.",
    category: "payments",
    tags: ["paiement", "stripe", "sécurité", "frais", "premier contact"],
    order: 30,
    isActive: true,
    isFooter: true
  },
  {
    question: "Quels sont les tarifs ?",
    answer: "Nos tarifs sont simples, fixes et transparents :\n\n• Appel Avocat : 49€ pour 20 minutes de premier conseil juridique\n• Appel Expat Aidant : 19€ pour 30 minutes de premiers conseils pratiques\n\nCe tarif unique comprend la rémunération du prestataire + les frais de mise en relation SOS-Expat. Aucun frais caché. Remboursement à 100% si l'appel n'aboutit pas.\n\nCes appels sont conçus pour apporter une première aide rapide aux expatriés, voyageurs et vacanciers du monde entier.",
    category: "payments",
    tags: ["tarifs", "prix", "avocat", "expat", "premier contact"],
    order: 31,
    isActive: true,
    isFooter: true
  }
];

// Toutes les FAQ modifiées
const MODIFIED_FAQS = [
  ...DISCOVER_FAQS,
  ...PROVIDERS_FAQS,
  ...CLIENTS_FAQS,
  ...PAYMENTS_FAQS
];

// ============================================================================
// TRANSLATION HELPERS
// ============================================================================

/**
 * Traduire un texte via l'API MyMemory (gratuit)
 */
async function translateText(text, fromLang, toLang) {
  if (!text || text.trim().length === 0) return text;
  if (fromLang === toLang) return text;

  const languageMap = {
    fr: "fr", en: "en", es: "es", pt: "pt", de: "de",
    ru: "ru", ch: "zh", hi: "hi", ar: "ar",
  };
  const targetLang = languageMap[toLang] || toLang;
  const sourceLang = languageMap[fromLang] || fromLang;

  try {
    // MyMemory API
    const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
    const response = await fetch(myMemoryUrl);
    if (response.ok) {
      const data = await response.json();
      if (data.responseData?.translatedText) {
        return data.responseData.translatedText;
      }
    }
  } catch (error) {
    console.warn(`[translateText] MyMemory error for ${toLang}:`, error.message);
  }

  // Fallback: Google Translate
  try {
    const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(googleUrl);
    if (response.ok) {
      const data = await response.json();
      if (data && Array.isArray(data) && data[0] && Array.isArray(data[0])) {
        return data[0].map(item => item[0]).join("");
      }
    }
  } catch (error) {
    console.warn(`[translateText] Google error for ${toLang}:`, error.message);
  }

  return text;
}

/**
 * Générer un slug à partir du texte
 */
function generateSlug(text) {
  if (!text || text.trim().length === 0) return "untitled";

  // Translittération cyrillique
  const cyrillicMap = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
    'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
    'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
    'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
  };

  let processedText = text.toLowerCase();

  // Cyrillique
  if (/[\u0400-\u04FF]/.test(processedText)) {
    processedText = processedText.split('').map(char => cyrillicMap[char] || char).join('');
  }

  let slug = processedText
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 100);

  return slug || "untitled";
}

/**
 * Traduire une FAQ vers toutes les langues
 */
async function translateFAQ(question, answer) {
  const translatedQuestion = {};
  const translatedAnswer = {};
  const slugMap = {};

  // Traduction EN d'abord pour les slugs non-latin
  const englishQuestion = await translateText(question, 'fr', 'en');
  console.log(`    → EN: "${englishQuestion.substring(0, 50)}..."`);

  for (const lang of SUPPORTED_LANGUAGES) {
    // Traduction
    const translatedQ = await translateText(question, 'fr', lang);
    const translatedA = await translateText(answer, 'fr', lang);

    translatedQuestion[lang] = translatedQ;
    translatedAnswer[lang] = translatedA;

    // Slug
    const NON_LATIN = ['hi', 'ru', 'ar', 'ch'];
    if (NON_LATIN.includes(lang)) {
      slugMap[lang] = `${lang}-${generateSlug(englishQuestion)}`;
    } else {
      slugMap[lang] = generateSlug(translatedQ);
    }

    console.log(`    → ${lang.toUpperCase()}: OK`);

    // Pause pour éviter le rate limiting
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  return { question: translatedQuestion, answer: translatedAnswer, slug: slugMap };
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

async function deleteAllFAQs() {
  console.log('\n🗑️  Suppression des FAQ existantes...');

  const snapshot = await db.collection('faqs').get();
  let deleted = 0;

  for (const doc of snapshot.docs) {
    await doc.ref.delete();
    deleted++;
  }

  console.log(`   ✅ ${deleted} FAQ supprimées`);
  return deleted;
}

async function createFAQs() {
  console.log('\n📝 Création des nouvelles FAQ avec traductions...\n');

  let created = 0;

  for (const faq of MODIFIED_FAQS) {
    console.log(`  📄 "${faq.question.substring(0, 50)}..."`);

    try {
      // Traduire
      const { question, answer, slug } = await translateFAQ(faq.question, faq.answer);

      // Créer dans Firestore
      const faqData = {
        question,
        answer,
        slug,
        category: faq.category,
        tags: faq.tags,
        order: faq.order,
        isActive: faq.isActive,
        isFooter: faq.isFooter || false,
        views: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await db.collection('faqs').add(faqData);
      created++;
      console.log(`     ✅ FAQ créée (${created}/${MODIFIED_FAQS.length})\n`);

      // Pause entre chaque FAQ
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`     ❌ Erreur: ${error.message}\n`);
    }
  }

  return created;
}

async function updateExistingFAQs() {
  console.log('\n🔄 Mise à jour des FAQ existantes...\n');

  let updated = 0;

  // Récupérer toutes les FAQ existantes
  const snapshot = await db.collection('faqs').get();
  const existingFAQs = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  console.log(`   📊 ${existingFAQs.length} FAQ existantes trouvées`);

  for (const faq of MODIFIED_FAQS) {
    // Chercher la FAQ existante par question FR
    const existing = existingFAQs.find(e =>
      e.question?.fr?.toLowerCase().includes(faq.question.substring(0, 30).toLowerCase()) ||
      faq.question.toLowerCase().includes(e.question?.fr?.substring(0, 30)?.toLowerCase() || '')
    );

    if (existing) {
      console.log(`  📄 Mise à jour: "${faq.question.substring(0, 40)}..."`);

      try {
        // Traduire
        const { question, answer, slug } = await translateFAQ(faq.question, faq.answer);

        // Mettre à jour dans Firestore
        await db.collection('faqs').doc(existing.id).update({
          question,
          answer,
          slug,
          category: faq.category,
          tags: faq.tags,
          order: faq.order,
          isActive: faq.isActive,
          isFooter: faq.isFooter || false,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        updated++;
        console.log(`     ✅ Mise à jour OK (${updated})\n`);

        // Pause
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`     ❌ Erreur: ${error.message}\n`);
      }
    } else {
      console.log(`  ⚠️  FAQ non trouvée: "${faq.question.substring(0, 40)}..."`);
    }
  }

  return updated;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('═'.repeat(60));
  console.log('🔄 RÉINITIALISATION DES FAQ SOS-EXPAT');
  console.log('═'.repeat(60));
  console.log(`\n📋 ${MODIFIED_FAQS.length} FAQ à mettre à jour\n`);

  const args = process.argv.slice(2);

  if (args.includes('--update-only')) {
    // Mode mise à jour: ne met à jour que les FAQ existantes
    const updated = await updateExistingFAQs();
    console.log('\n' + '═'.repeat(60));
    console.log(`✅ TERMINÉ: ${updated} FAQ mises à jour`);
  } else {
    // Mode reset complet: supprime tout et recrée
    await deleteAllFAQs();
    const created = await createFAQs();
    console.log('\n' + '═'.repeat(60));
    console.log(`✅ TERMINÉ: ${created} FAQ créées avec traductions en 9 langues`);
  }

  console.log('═'.repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });
