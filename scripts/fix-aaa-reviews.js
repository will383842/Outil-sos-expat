/**
 * Script pour corriger les avis des profils AAA existants
 * - Supprime les anciens avis
 * - Recrée avec 1-2 avis par semaine depuis l'inscription
 */

const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.join(__dirname, '..', 'serviceAccount.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'sos-urgently-ac307'
});

const db = admin.firestore();

// Commentaires d'avis
const REVIEW_COMMENTS = [
  "Excellent avocat, très professionnel et à l'écoute de mes besoins spécifiques.",
  "Conseils juridiques de qualité exceptionnelle, je recommande vivement ses services.",
  "Très satisfait de ses services, réponse rapide et solution efficace à mon problème.",
  "Expertise remarquable en droit international, il a résolu mon dossier complexe.",
  "Un professionnel dévoué et compétent, toujours disponible et réactif.",
  "J'ai beaucoup apprécié son accompagnement dans mes démarches administratives.",
  "Service impeccable, communication claire et parfaitement transparente.",
  "Avocat très compétent qui a résolu mon dossier bien plus rapidement que prévu.",
  "Professionnalisme exemplaire, je n'hésiterai pas à refaire appel à ses services.",
  "Excellent suivi de dossier, toujours joignable et attentif à mes questions.",
  "Ses conseils m'ont été extrêmement précieux, un grand merci pour tout!",
  "Grande expertise juridique, il maîtrise parfaitement le droit international.",
  "Très bonne expérience globale, je recommande sans aucune hésitation.",
  "Avocat sérieux et rigoureux, résultats parfaitement conformés à mes attentes.",
  "Pédagogue et patient, il m'a expliqué en détail toutes les options possibles.",
  "Service client irréprochable, il répond toujours rapidement à mes demandes.",
  "A su gérer mon dossier avec brio malgré sa grande complexité.",
  "Je suis très reconnaissant pour son aide précieuse dans cette affaire délicate.",
  "Maîtrise parfaite du sujet, conseils toujours avisés et pertinents.",
  "Excellent rapport qualité-prix, un service vraiment haut de gamme.",
  "Très bon avocat francophone, ce qui est rare dans ce pays!",
  "Il parle parfaitement français, facilitant grandement tous nos échanges.",
  "Compétence et sérieux au rendez-vous, je suis pleinement satisfait du résultat.",
  "A pris le temps de bien comprendre ma situation avant de proposer des solutions.",
  "Tarifs tout à fait raisonnables pour un service de qualité supérieure.",
  "Son expérience avec les expatriés fait vraiment toute la différence.",
  "Je le recommande chaleureusement à tous les Français vivant à l'étranger.",
  "Un avocat de confiance, j'ai pu résoudre tous mes problèmes légaux grâce à lui.",
  "Efficacité et professionnalisme, exactement ce que je recherchais.",
  "Grâce à son expertise, j'ai obtenu mon visa sans aucune difficulté.",
  "Excellent accompagnement pour mon divorce international, merci infiniment.",
  "A su défendre mes intérêts avec brio face à une situation très complexe.",
  "Toujours disponible même le week-end quand j'avais des urgences.",
  "Documents rédigés avec soin et conseils extrêmement précis.",
  "Un vrai professionnel qui connaît son métier sur le bout des doigts.",
  "Réactivité vraiment impressionnante, réponse en moins de 24h systématiquement.",
  "Je suis très content d'avoir trouvé un avocat francophone aussi compétent.",
  "Son réseau local m'a permis de résoudre des problèmes administratifs complexes.",
  "Prend vraiment le temps d'expliquer les procédures légales en détail.",
  "Honoraires transparents dès le départ, aucune mauvaise surprise à la fin.",
];

// Noms par région
const NAMES_BY_REGION = {
  fr: ['Jean', 'Pierre', 'Michel', 'Philippe', 'Thomas', 'Nicolas', 'François', 'Laurent'],
  en: ['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph'],
  es: ['Antonio', 'José', 'Manuel', 'Francisco', 'Juan', 'David', 'Carlos', 'Miguel'],
  de: ['Hans', 'Peter', 'Wolfgang', 'Klaus', 'Michael', 'Thomas', 'Andreas', 'Stefan'],
  ar: ['Mohamed', 'Ahmed', 'Ali', 'Hassan', 'Omar', 'Youssef', 'Khalid', 'Said'],
  cn: ['Wei', 'Ming', 'Jun', 'Feng', 'Lei', 'Bo', 'Jian', 'Peng'],
  africa: ['Moussa', 'Ibrahim', 'Abdoulaye', 'Ousmane', 'Cheikh', 'Mamadou', 'Amadou', 'Issa'],
};

const ALL_COUNTRIES = ['France', 'Belgique', 'Suisse', 'Canada', 'États-Unis', 'Royaume-Uni', 'Allemagne', 'Espagne', 'Italie', 'Maroc', 'Algérie', 'Tunisie', 'Sénégal', 'Côte d\'Ivoire', 'Cameroun', 'Chine', 'Japon', 'Inde', 'Brésil', 'Argentine'];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function fixAaaReviews() {
  console.log('='.repeat(70));
  console.log(' CORRECTION DES AVIS AAA');
  console.log(' Logique: 1-2 avis par semaine depuis l\'inscription');
  console.log('='.repeat(70));

  const TODAY = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;

  // 1. Récupérer tous les profils AAA (isTestProfile: true)
  console.log('\n📋 Récupération des profils AAA...');
  const profilesSnapshot = await db.collection('sos_profiles')
    .where('isTestProfile', '==', true)
    .get();

  console.log(`   Trouvé ${profilesSnapshot.size} profils AAA\n`);

  let totalDeleted = 0;
  let totalCreated = 0;

  for (const doc of profilesSnapshot.docs) {
    const profile = doc.data();
    const uid = doc.id;
    const fullName = profile.fullName || `${profile.firstName} ${profile.lastName}`;

    // Récupérer la date d'inscription
    let createdAt;
    if (profile.createdAt && profile.createdAt.toDate) {
      createdAt = profile.createdAt.toDate();
    } else {
      // Fallback: date aléatoire entre oct et déc 2024
      createdAt = new Date('2024-10-01');
      createdAt.setDate(createdAt.getDate() + randomInt(0, 90));
    }

    // 2. Supprimer les anciens avis de ce profil
    const oldReviews = await db.collection('reviews')
      .where('providerId', '==', uid)
      .get();

    const deletePromises = oldReviews.docs.map(r => r.ref.delete());
    await Promise.all(deletePromises);
    totalDeleted += oldReviews.size;

    // 3. Calculer le nombre d'avis (1-2 par semaine)
    const daysSinceCreation = Math.max(1, Math.floor((TODAY.getTime() - createdAt.getTime()) / msPerDay));
    const weeksSinceCreation = Math.max(1, Math.floor(daysSinceCreation / 7));
    const maxReviewsPerWeek = Math.random() > 0.5 ? 2 : 1;
    const reviewCount = Math.min(weeksSinceCreation * maxReviewsPerWeek, 40);

    // 4. Créer les nouveaux avis
    const usedComments = new Set();

    for (let j = 0; j < reviewCount; j++) {
      const weekIndex = Math.floor(j / maxReviewsPerWeek);
      const dayInWeek = randomInt(0, 6);
      const reviewDate = new Date(createdAt.getTime() + (weekIndex * 7 + dayInWeek) * msPerDay);
      const finalReviewDate = reviewDate > TODAY ? TODAY : reviewDate;

      let comment = randomChoice(REVIEW_COMMENTS);
      let attempts = 0;
      while (usedComments.has(comment) && attempts < 50) {
        comment = randomChoice(REVIEW_COMMENTS);
        attempts++;
      }
      usedComments.add(comment);

      const clientName = randomChoice(Object.values(NAMES_BY_REGION).flat());
      const clientCountry = randomChoice(ALL_COUNTRIES);

      await db.collection('reviews').add({
        providerId: uid,
        clientId: `client_fix_${Date.now()}_${j}`,
        clientName,
        clientCountry,
        rating: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
        comment,
        isPublic: true,
        status: 'published',
        serviceType: 'lawyer_call',
        createdAt: admin.firestore.Timestamp.fromDate(finalReviewDate),
        helpfulVotes: randomInt(0, 15),
      });
      totalCreated++;
    }

    // 5. Mettre à jour le compteur d'avis et le rating du profil
    const avgRating = parseFloat((4.0 + Math.random() * 1.0).toFixed(2));
    const totalCalls = Math.floor(reviewCount * (2 + Math.random()));

    await db.collection('users').doc(uid).update({
      reviewCount,
      rating: avgRating,
      averageRating: avgRating,
      totalCalls,
    });

    await db.collection('sos_profiles').doc(uid).update({
      reviewCount,
      rating: avgRating,
      averageRating: avgRating,
      totalCalls,
    });

    await db.collection('ui_profile_cards').doc(uid).update({
      reviewCount,
      rating: avgRating,
    });

    console.log(`✓ ${fullName} | Inscrit: ${createdAt.toLocaleDateString('fr-FR')} | ${weeksSinceCreation} sem | ${reviewCount} avis`);

    // Petite pause
    await new Promise(r => setTimeout(r, 50));
  }

  console.log('\n' + '='.repeat(70));
  console.log(` TERMINÉ!`);
  console.log(` - ${totalDeleted} anciens avis supprimés`);
  console.log(` - ${totalCreated} nouveaux avis créés`);
  console.log(` - Logique: 1-2 avis/semaine depuis inscription`);
  console.log('='.repeat(70));

  process.exit(0);
}

fixAaaReviews().catch(err => {
  console.error('Erreur:', err);
  process.exit(1);
});
