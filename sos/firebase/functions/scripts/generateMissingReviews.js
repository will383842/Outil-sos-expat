/**
 * Script de génération des avis manquants
 * ========================================
 *
 * Exécution: node scripts/generateMissingReviews.js [--dry-run] [--provider-id=xxx]
 *
 * Options:
 *   --dry-run       : Preview seulement, ne génère rien
 *   --provider-id=x : Générer uniquement pour un profil spécifique
 */

const admin = require('firebase-admin');

// Initialiser Firebase Admin
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

// =============================================
// CONFIGURATION
// =============================================

const REVIEW_CATEGORIES = ['veryShort', 'short', 'medium', 'long'];

// Commentaires par défaut (fallback si pas de JSON)
const REVIEW_COMMENTS = {
  veryShort: [
    "Excellent !", "Parfait, merci !", "Très pro.", "Top !", "Je recommande.",
    "Super aide !", "Nickel.", "Impeccable !", "Merci beaucoup !", "Génial.",
    "Appel ultra rapide.", "Dépannage express.", "Rassurant immédiatement.",
    "Avocat en 5 minutes.", "Très humain.", "Hyper réactif.", "Service éclair.",
    "Super contact.", "Conseils concrets.", "Clair et direct."
  ],
  short: [
    "Service excellent ! Très professionnel.",
    "Une aide précieuse. Je recommande vivement.",
    "Personne très compétente. Réponse rapide.",
    "Accompagnement de qualité. Très satisfait.",
    "Professionnel et efficace. Top !",
    "A dépassé mes attentes. Bravo.",
    "Expertise remarquable. Communication fluide.",
    "Travail sérieux. Résultat impeccable.",
    "Très réactif. Service de qualité.",
    "J'ai payé et un avocat m'a rappelé en quelques minutes.",
    "SOS-Expat a débloqué une situation urgente en un appel.",
    "L'avocat a posé les bonnes questions et m'a donné un plan d'action.",
    "Appel reçu en moins de 5 minutes, parfait pour une urgence.",
    "Le ton était sympa et rassurant, l'équipe connaît les galères d'expats.",
    "En quelques minutes, j'ai compris ce que je devais faire."
  ],
  medium: [
    "Je me sentais perdu à l'étranger, l'avocat m'a remis les idées en place en un seul appel. Très professionnel et rassurant.",
    "L'expatrié aidant connaissait exactement la situation locale, ça m'a vraiment mis en confiance. Je recommande vivement ce service.",
    "Service humain, direct, sans jugement, parfait quand on panique un peu. Exactement ce dont j'avais besoin.",
    "L'avocat m'a aidé via SOS-Expat puis nous avons continué ensuite directement. Parfait pour un premier contact.",
    "J'ai eu un premier diagnostic rapide, puis j'ai pu approfondir avec le même avocat. Excellent système.",
    "L'expatriée aidante m'a donné des conseils très concrets sur la vie sur place, pas seulement de la théorie.",
    "On n'a pas perdu de temps, tout était clair dès les premières minutes d'appel. Très efficace.",
    "Un vrai service d'urgence pour expats, disponible exactement quand on en a besoin. Merci !",
    "L'appel m'a permis d'éviter une grosse bêtise administrative, je suis vraiment reconnaissant.",
    "La personne connaissait très bien les règles locales, pas besoin d'expliquer trois fois."
  ],
  long: [
    "Je ne savais plus quoi faire face à ce problème administratif complexe. L'avocat de SOS-Expat a pris le temps de m'écouter, de comprendre ma situation et m'a donné un plan d'action clair. Grâce à ses conseils, j'ai pu résoudre mon problème en quelques jours. Service vraiment exceptionnel !",
    "En tant qu'expatrié depuis peu, je me sentais complètement perdu. L'aide que j'ai reçue via SOS-Expat a été déterminante. L'expert connaissait parfaitement les subtilités locales et m'a guidé pas à pas. Je recommande sans hésitation ce service à tous les expatriés.",
    "J'avais une urgence juridique un dimanche soir. J'ai été rappelé en moins de 10 minutes par un avocat compétent qui a su me rassurer et m'expliquer mes options. Le prix est très raisonnable pour la qualité du service. Une vraie bouée de sauvetage pour les expats !",
    "Première expérience avec SOS-Expat et je suis bluffé. L'expatrié aidant connaissait exactement les démarches à suivre dans mon pays d'accueil. Il m'a même donné des contacts utiles pour la suite. Un service humain et professionnel que je recommande chaudement."
  ]
};

const CLIENT_FIRST_NAMES = [
  'Jean', 'Marie', 'Pierre', 'Sophie', 'Nicolas', 'Isabelle', 'Thomas', 'Caroline',
  'Alexandre', 'Julie', 'David', 'Laura', 'Marc', 'Emma', 'Antoine', 'Camille',
  'Michael', 'Sarah', 'James', 'Emily', 'Robert', 'Anna', 'William', 'Lisa',
  'Hans', 'Maria', 'Klaus', 'Eva', 'Stefan', 'Christine', 'Andreas', 'Monika',
  'Carlos', 'Ana', 'Pedro', 'Lucia', 'Miguel', 'Elena', 'Juan', 'Rosa'
];

const CLIENT_COUNTRIES = [
  'France', 'United States', 'United Kingdom', 'Germany', 'Spain',
  'Italy', 'Canada', 'Australia', 'Belgium', 'Switzerland'
];

// Cache des commentaires utilisés
const usedComments = new Set();

// =============================================
// FONCTIONS UTILITAIRES
// =============================================

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRealisticRating() {
  const rand = Math.random();
  if (rand < 0.50) return 5;
  if (rand < 0.80) return 4;
  if (rand < 0.92) return 4.5;
  if (rand < 0.97) return 3.5;
  return 3;
}

function getUniqueComment() {
  const category = randomChoice(REVIEW_CATEGORIES);
  const comments = REVIEW_COMMENTS[category];

  // Essayer de trouver un commentaire non utilisé
  let attempts = 0;
  while (attempts < 100) {
    const comment = randomChoice(comments);
    const key = `${category}_${comment.substring(0, 20)}`;

    if (!usedComments.has(key)) {
      usedComments.add(key);
      return comment;
    }
    attempts++;
  }

  // Fallback: retourner un commentaire même s'il est déjà utilisé
  return randomChoice(comments);
}

function generateReviewDate(profileCreatedAt, reviewIndex, totalReviews) {
  const now = new Date();
  const createdAt = profileCreatedAt?.toDate?.() || profileCreatedAt || new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
  const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceCreation <= 0) {
    return new Date(now.getTime() - randomInt(1, 30) * 24 * 60 * 60 * 1000);
  }

  const daysOffset = Math.floor((reviewIndex / totalReviews) * daysSinceCreation);
  const jitter = randomInt(-3, 3);
  const reviewDate = new Date(createdAt.getTime() + (daysOffset + jitter) * 24 * 60 * 60 * 1000);

  return reviewDate > now ? new Date(now.getTime() - randomInt(1, 7) * 24 * 60 * 60 * 1000) : reviewDate;
}

// =============================================
// FONCTIONS PRINCIPALES
// =============================================

async function countExistingReviews(providerId) {
  const snapshot = await db.collection('reviews')
    .where('providerId', '==', providerId)
    .where('status', '==', 'published')
    .where('isPublic', '==', true)
    .get();
  return snapshot.size;
}

async function getProfilesNeedingReviews() {
  const profiles = [];
  const snapshot = await db.collection('sos_profiles').get();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const expectedReviews = typeof data.reviewCount === 'number' ? data.reviewCount : 0;

    if (expectedReviews <= 0) continue;

    const existingReviews = await countExistingReviews(doc.id);
    const missingReviews = expectedReviews - existingReviews;

    if (missingReviews > 0) {
      const type = data.type === 'lawyer' || data.role === 'lawyer' ? 'lawyer' : 'expat';

      profiles.push({
        id: doc.id,
        fullName: data.fullName || data.displayName || doc.id,
        type,
        existingReviews,
        expectedReviews,
        missingReviews,
        createdAt: data.createdAt
      });
    }
  }

  return profiles;
}

async function previewMissingReviews() {
  console.log('========================================');
  console.log('PREVIEW: Avis manquants à générer');
  console.log('========================================\n');

  const profiles = await getProfilesNeedingReviews();
  const totalMissing = profiles.reduce((sum, p) => sum + p.missingReviews, 0);

  if (profiles.length === 0) {
    console.log('✅ Aucun profil n\'a besoin d\'avis supplémentaires!');
    return { profiles: [], totalMissing: 0 };
  }

  console.log(`Profils avec avis manquants: ${profiles.length}`);
  console.log(`Total d'avis à générer: ${totalMissing}\n`);

  const lawyers = profiles.filter(p => p.type === 'lawyer');
  const expats = profiles.filter(p => p.type === 'expat');

  if (lawyers.length > 0) {
    console.log(`\n📚 AVOCATS (${lawyers.length}):`);
    lawyers.slice(0, 10).forEach(p => {
      console.log(`   ${p.fullName}: ${p.existingReviews}/${p.expectedReviews} avis (manquants: ${p.missingReviews})`);
    });
    if (lawyers.length > 10) console.log(`   ... et ${lawyers.length - 10} autres`);
  }

  if (expats.length > 0) {
    console.log(`\n🌍 EXPATRIÉS (${expats.length}):`);
    expats.slice(0, 10).forEach(p => {
      console.log(`   ${p.fullName}: ${p.existingReviews}/${p.expectedReviews} avis (manquants: ${p.missingReviews})`);
    });
    if (expats.length > 10) console.log(`   ... et ${expats.length - 10} autres`);
  }

  return { profiles, totalMissing };
}

async function generateMissingReviews(specificProviderId = null) {
  console.log('========================================');
  console.log('GÉNÉRATION: Avis manquants');
  console.log('========================================\n');

  usedComments.clear();

  let profiles = await getProfilesNeedingReviews();

  if (specificProviderId) {
    profiles = profiles.filter(p => p.id === specificProviderId);
    if (profiles.length === 0) {
      console.log(`❌ Profil non trouvé ou n'a pas besoin d'avis: ${specificProviderId}`);
      return;
    }
  }

  if (profiles.length === 0) {
    console.log('✅ Aucun profil n\'a besoin d\'avis supplémentaires!');
    return;
  }

  let totalGenerated = 0;
  let totalErrors = 0;

  console.log(`Profils à traiter: ${profiles.length}`);
  console.log(`Avis à générer: ${profiles.reduce((s, p) => s + p.missingReviews, 0)}\n`);

  for (let i = 0; i < profiles.length; i++) {
    const profile = profiles[i];
    let generated = 0;
    let errors = 0;

    console.log(`\n[${i + 1}/${profiles.length}] ${profile.fullName} (${profile.type})`);
    console.log(`   Génération de ${profile.missingReviews} avis...`);

    for (let j = 0; j < profile.missingReviews; j++) {
      try {
        const rating = generateRealisticRating();
        const comment = getUniqueComment();
        const clientName = randomChoice(CLIENT_FIRST_NAMES);
        const clientCountry = randomChoice(CLIENT_COUNTRIES);
        const reviewDate = generateReviewDate(
          profile.createdAt,
          profile.existingReviews + j,
          profile.expectedReviews
        );
        const serviceType = profile.type === 'lawyer' ? 'lawyer_call' : 'expat_call';

        await db.collection('reviews').add({
          providerId: profile.id,
          clientId: `generated_client_${Date.now()}_${j}`,
          clientName,
          clientCountry,
          rating,
          comment,
          isPublic: true,
          status: 'published',
          serviceType,
          createdAt: admin.firestore.Timestamp.fromDate(reviewDate),
          helpfulVotes: randomInt(0, 15),
          verified: true,
          generatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        generated++;
        totalGenerated++;

        if ((j + 1) % 5 === 0) {
          console.log(`   ... ${j + 1}/${profile.missingReviews} avis créés`);
        }

      } catch (error) {
        errors++;
        totalErrors++;
        console.error(`   ❌ Erreur avis #${j + 1}:`, error.message);
      }

      // Pause pour ne pas surcharger Firestore
      if (j % 10 === 9) {
        await new Promise(r => setTimeout(r, 100));
      }
    }

    const emoji = errors === 0 ? '✅' : '⚠️';
    console.log(`   ${emoji} ${generated} avis créés${errors > 0 ? `, ${errors} erreurs` : ''}`);
  }

  console.log('\n========================================');
  console.log('RÉSUMÉ GÉNÉRATION');
  console.log('========================================');
  console.log(`Profils traités: ${profiles.length}`);
  console.log(`Avis générés: ${totalGenerated}`);
  console.log(`Erreurs: ${totalErrors}`);
  console.log('========================================\n');

  if (totalErrors === 0) {
    console.log('✅ Tous les avis ont été générés avec succès!');
  } else {
    console.log(`⚠️  ${totalErrors} erreurs lors de la génération`);
  }
}

// =============================================
// MAIN
// =============================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const providerIdArg = args.find(a => a.startsWith('--provider-id='));
  const providerId = providerIdArg ? providerIdArg.split('=')[1] : null;

  console.log('\n🚀 Script de génération des avis manquants\n');

  if (dryRun) {
    console.log('Mode: DRY RUN (preview seulement)\n');
    await previewMissingReviews();
  } else {
    if (providerId) {
      console.log(`Mode: Génération pour un seul profil (${providerId})\n`);
    } else {
      console.log('Mode: Génération pour tous les profils\n');
    }
    await generateMissingReviews(providerId);
  }

  process.exit(0);
}

main().catch(error => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});
