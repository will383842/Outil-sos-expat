/**
 * Script pour corriger les avis des profils AAA existants
 * - Supprime les anciens avis
 * - Recrée avec un nombre aléatoire d'avis (entre 3 et 28) par profil
 * - Chaque profil a un nombre DIFFÉRENT
 * - AUCUN commentaire en doublon intra-profil
 * - Commentaires GENRÉS (il/elle, compétent/compétente, etc.)
 *
 * Usage:
 *   node scripts/fix-aaa-reviews.js --dry-run   (par défaut, affiche sans écrire)
 *   node scripts/fix-aaa-reviews.js --execute    (écrit en Firestore)
 */

const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.join(__dirname, '..', 'serviceAccount.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'sos-urgently-ac307'
});

const db = admin.firestore();

// ═══════════════════════════════════════════════════════════════
// TEMPLATES GENRÉS — {P} = il/elle, {Pa} = Il/Elle, {le} = le/la,
// {ce} = cet/cette, {un} = un/une, {adj} = compétent/compétente, etc.
// ═══════════════════════════════════════════════════════════════

// gender => substitutions
const GENDER_MAP = {
  male: {
    '{P}': 'il', '{Pa}': 'Il', '{le}': 'le', '{la}': 'le',
    '{ce}': 'cet', '{un}': 'un', '{lui}': 'lui',
    '{avocat}': 'avocat', '{expert}': 'expert',
    '{professionnel}': 'professionnel', '{spécialiste}': 'spécialiste',
    '{dévoué}': 'dévoué', '{compétent}': 'compétent', '{réactif}': 'réactif',
    '{attentif}': 'attentif', '{patient}': 'patient', '{joignable}': 'joignable',
    '{disponible}': 'disponible', '{humain}': 'humain', '{bienveillant}': 'bienveillant',
    '{rassurant}': 'rassurant', '{rassuré}': 'rassuré',
    '{exceptionnel}': 'exceptionnel', '{rare}': 'rare',
    '{satisfait}': 'satisfait', '{reconnaissant}': 'reconnaissant',
    '{accompagné}': 'accompagné', '{aidé}': 'aidé', '{rappelé}': 'rappelé',
    '{tenu}': 'tenu', '{su}': 'su', '{pris}': 'pris', '{fait}': 'fait',
    '{bon}': 'bon', '{meilleur}': 'meilleur', '{fiable}': 'fiable',
    '{chaleureux}': 'chaleureux', '{sérieux}': 'sérieux', '{rigoureux}': 'rigoureux',
    '{pédagogue}': 'pédagogue', '{pragmatique}': 'pragmatique',
    '{efficace}': 'efficace', '{impressionnant}': 'impressionnant',
    '{incontournable}': 'incontournable', '{excellent}': 'excellent',
    '{content}': 'content', '{surpris}': 'surpris',
  },
  female: {
    '{P}': 'elle', '{Pa}': 'Elle', '{le}': 'la', '{la}': 'la',
    '{ce}': 'cette', '{un}': 'une', '{lui}': 'elle',
    '{avocat}': 'avocate', '{expert}': 'experte',
    '{professionnel}': 'professionnelle', '{spécialiste}': 'spécialiste',
    '{dévoué}': 'dévouée', '{compétent}': 'compétente', '{réactif}': 'réactive',
    '{attentif}': 'attentive', '{patient}': 'patiente', '{joignable}': 'joignable',
    '{disponible}': 'disponible', '{humain}': 'humaine', '{bienveillant}': 'bienveillante',
    '{rassurant}': 'rassurante', '{rassuré}': 'rassurée',
    '{exceptionnel}': 'exceptionnelle', '{rare}': 'rare',
    '{satisfait}': 'satisfaite', '{reconnaissant}': 'reconnaissante',
    '{accompagné}': 'accompagnée', '{aidé}': 'aidée', '{rappelé}': 'rappelée',
    '{tenu}': 'tenue', '{su}': 'su', '{pris}': 'pris', '{fait}': 'fait',
    '{bon}': 'bonne', '{meilleur}': 'meilleure', '{fiable}': 'fiable',
    '{chaleureux}': 'chaleureuse', '{sérieux}': 'sérieuse', '{rigoureux}': 'rigoureuse',
    '{pédagogue}': 'pédagogue', '{pragmatique}': 'pragmatique',
    '{efficace}': 'efficace', '{impressionnant}': 'impressionnante',
    '{incontournable}': 'incontournable', '{excellent}': 'excellente',
    '{content}': 'contente', '{surpris}': 'surprise',
  },
};

function applyGender(template, gender) {
  const map = GENDER_MAP[gender] || GENDER_MAP['male'];
  let result = template;
  for (const [key, value] of Object.entries(map)) {
    result = result.split(key).join(value);
  }
  return result;
}

// 120 templates avec marqueurs de genre
const REVIEW_TEMPLATES = [
  // Bloc 1 — Satisfaction générale (10)
  "{excellent} {avocat}, très {professionnel} et à l'écoute de mes besoins spécifiques.",
  "Conseils juridiques de qualité exceptionnelle, je recommande vivement.",
  "Très {satisfait}, réponse rapide et solution {efficace} à mon problème.",
  "Expertise remarquable en droit international, dossier complexe résolu.",
  "{un} {professionnel} {dévoué} et {compétent}, toujours {disponible} et {réactif}.",
  "Service impeccable, communication claire et parfaitement transparente.",
  "Professionnalisme exemplaire, je n'hésiterai pas à refaire appel à ses services.",
  "Excellent suivi de dossier, toujours {joignable} et {attentif} à mes questions.",
  "Ses conseils m'ont été extrêmement précieux, un grand merci pour tout !",
  "Grande expertise juridique, maîtrise parfaite du droit international.",

  // Bloc 2 — Expatriation (10)
  "Grâce à son expertise, j'ai obtenu mon visa sans aucune difficulté.",
  "Son expérience avec les expatriés fait vraiment toute la différence.",
  "Je {le} recommande chaleureusement à tous les Français vivant à l'étranger.",
  "Très {bon} {avocat} francophone, ce qui est {rare} dans ce pays !",
  "{Pa} parle parfaitement français, facilitant grandement nos échanges.",
  "Son réseau local m'a permis de résoudre des problèmes administratifs complexes.",
  "Un vrai atout pour tout expatrié qui a besoin d'aide juridique.",
  "Indispensable quand on vit à l'étranger et qu'on ne connaît pas le droit local.",
  "Enfin {un} {avocat} qui comprend les réalités de l'expatriation au quotidien.",
  "Parfait pour les démarches administratives quand on est loin de la France.",

  // Bloc 3 — Qualité du conseil (10)
  "{pédagogue} et {patient}, {P} m'a expliqué en détail toutes les options possibles.",
  "A {pris} le temps de bien comprendre ma situation avant de proposer des solutions.",
  "Maîtrise parfaite du sujet, conseils toujours avisés et pertinents.",
  "Prend vraiment le temps d'expliquer les procédures légales en détail.",
  "Ses explications claires m'ont permis de comprendre mes droits rapidement.",
  "Approche {pragmatique} et concrète, pas de jargon juridique inutile.",
  "{Pa} a {su} vulgariser des notions complexes pour que je prenne les bonnes décisions.",
  "Conseils personnalisés et adaptés à ma situation spécifique, merci beaucoup.",
  "A analysé mon dossier en profondeur avant de me donner son avis éclairé.",
  "Son approche méthodique m'a beaucoup {rassuré} dans une période stressante.",

  // Bloc 4 — Réactivité (10)
  "Réactivité vraiment {impressionnant}, réponse en moins de 24h systématiquement.",
  "Toujours {disponible} même le week-end quand j'avais des urgences.",
  "J'ai été {surpris} par sa rapidité à traiter mon dossier pourtant urgent.",
  "Disponibilité {exceptionnel}, {P} a répondu à mes appels même tard le soir.",
  "Temps de réponse record, {P} m'a {rappelé} dans l'heure qui a suivi ma demande.",
  "Une réactivité que je n'avais jamais vue chez {un} {avocat} auparavant.",
  "{Pa} a {su} gérer l'urgence de ma situation avec calme et efficacité.",
  "Malgré la complexité, {P} a traité mon cas en un temps remarquablement court.",
  "J'apprécie sa rapidité sans jamais compromettre la qualité du travail.",
  "Toujours {joignable}, que ce soit par téléphone ou par message sur la plateforme.",

  // Bloc 5 — Résultats (10)
  "A {su} défendre mes intérêts avec brio face à une situation très complexe.",
  "Résultat au-delà de mes attentes, je suis vraiment {reconnaissant}.",
  "Grâce à ses conseils avisés, mon dossier a abouti favorablement.",
  "{Pa} a obtenu gain de cause là où d'autres avocats avaient échoué.",
  "Mon dossier semblait impossible, mais {P} a trouvé une solution brillante.",
  "Résultat concret en seulement quelques semaines, {impressionnant}.",
  "{Pa} m'a {fait} économiser du temps et de l'argent avec son approche directe.",
  "Sa stratégie juridique s'est avérée payante dès le premier rendez-vous.",
  "Le résultat a dépassé toutes mes espérances, merci pour votre travail.",
  "Dossier résolu efficacement sans procédure inutilement longue.",

  // Bloc 6 — Confiance et humanité (10)
  "{un} {avocat} de confiance, j'ai pu résoudre tous mes problèmes légaux grâce à {lui}.",
  "J'ai senti dès le premier contact que j'étais entre de bonnes mains.",
  "Très {humain} dans son approche, {P} comprend le stress lié à l'expatriation.",
  "{rassurant} et {bienveillant}, exactement ce dont j'avais besoin dans cette épreuve.",
  "{Pa} m'a {accompagné} avec empathie tout au long de cette procédure difficile.",
  "Relation de confiance installée dès le premier échange, merci sincèrement.",
  "Je me suis senti écouté et compris, ce qui change tout dans un contexte juridique.",
  "Son humanité et son professionnalisme en font {un} {avocat} {exceptionnel}.",
  "{Pa} ne fait pas que du droit, {P} accompagne vraiment ses clients moralement.",
  "J'ai enfin trouvé {un} {avocat} qui traite ses clients comme des personnes, pas des dossiers.",

  // Bloc 7 — Tarifs et rapport qualité-prix (10)
  "Excellent rapport qualité-prix, un service vraiment haut de gamme.",
  "Tarifs tout à fait raisonnables pour un service de qualité supérieure.",
  "Honoraires transparents dès le départ, aucune mauvaise surprise.",
  "Le prix de la consultation vaut largement le retour sur investissement.",
  "Service premium à un tarif accessible, c'est appréciable.",
  "Pas de frais cachés, tout est clair dès le début, j'apprécie.",
  "Pour le prix payé, la qualité des conseils est remarquable.",
  "Bon rapport qualité-prix comparé à d'autres avocats que j'ai consultés.",
  "L'investissement en vaut la peine, j'ai évité des erreurs très coûteuses.",
  "Tarification juste et proportionnée au travail effectivement fourni.",

  // Bloc 8 — Spécialités (10)
  "Excellent accompagnement pour mon divorce international, merci infiniment.",
  "Documents rédigés avec soin et conseils extrêmement précis.",
  "A {su} gérer mon dossier avec brio malgré sa grande complexité.",
  "Je suis très {reconnaissant} pour son aide dans cette affaire délicate.",
  "J'ai beaucoup apprécié son accompagnement dans mes démarches administratives.",
  "Aide précieuse pour mon installation dans un nouveau pays, merci.",
  "{spécialiste} {incontournable} pour les questions de droit de la famille à l'étranger.",
  "{Pa} maîtrise parfaitement les conventions internationales en la matière.",
  "Sa connaissance du droit local est un vrai avantage pour les expatriés.",
  "{expert} en fiscalité internationale, ses conseils m'ont fait économiser gros.",

  // Bloc 9 — Recommandation forte (10)
  "Je recommande sans aucune hésitation à tout expatrié francophone.",
  "Compétence et sérieux au rendez-vous, je suis pleinement {satisfait}.",
  "Efficacité et professionnalisme, exactement ce que je recherchais.",
  "Je n'hésiterai pas une seconde à {le} recommander autour de moi.",
  "Cinq étoiles bien méritées, bravo pour ce service {exceptionnel}.",
  "{le} {meilleur} {avocat} francophone que j'ai pu trouver dans cette région.",
  "Si vous cherchez {un} {avocat} {fiable} à l'étranger, ne cherchez plus.",
  "{un} {professionnel} {rare}, je {le} recommande les yeux fermés.",
  "Mon entourage expatrié m'avait recommandé ses services, à juste titre !",
  "J'ai déjà recommandé ses services à trois amis expatriés.",

  // Bloc 10 — Situations variées (10)
  "M'a {aidé} à résoudre un litige immobilier compliqué à distance.",
  "Grâce à {lui}, j'ai pu régulariser ma situation administrative en un mois.",
  "Accompagnement parfait pour la création de mon entreprise à l'étranger.",
  "{Pa} a débloqué mon dossier de permis de séjour quand tout semblait perdu.",
  "Aide cruciale pour la reconnaissance de mon diplôme à l'international.",
  "A facilité toutes mes démarches pour l'inscription scolaire de mes enfants.",
  "{expert} dans la gestion des doubles impositions, un vrai soulagement fiscal.",
  "M'a {accompagné} pour ma demande de nationalité avec succès.",
  "{Pa} a géré mon dossier de succession internationale avec une grande rigueur.",
  "Assistance rapide et {efficace} pour un problème de contrat de travail local.",

  // Bloc 11 — Plateforme SOS-Expat (10)
  "La plateforme SOS-Expat m'a permis de trouver {ce} {excellent} {professionnel}.",
  "Super concept que de pouvoir consulter {un} {avocat} francophone si facilement.",
  "L'appel vidéo a rendu la consultation très pratique depuis mon pays d'accueil.",
  "Très {content} d'avoir découvert SOS-Expat pour mes besoins juridiques.",
  "Le système de réservation en ligne est simple et le service au top.",
  "Pratique de pouvoir consulter depuis n'importe où dans le monde.",
  "La qualité des avocats sur cette plateforme est vraiment au rendez-vous.",
  "J'utiliserai de nouveau SOS-Expat si j'ai besoin d'un conseil juridique.",
  "Enfin une solution moderne pour les expatriés qui ont besoin d'aide.",
  "SOS-Expat m'a sauvé la mise, merci à toute l'équipe et à {ce} {avocat}.",

  // Bloc 12 — Avis courts et impactants (10)
  "Service 5 étoiles, rien à redire !",
  "Parfait du début à la fin.",
  "{avocat} au top, je reviendrai sans hésiter.",
  "Merci pour votre aide précieuse et votre patience.",
  "Exactement {le} {professionnel} qu'il me fallait.",
  "Un grand merci, problème résolu en un temps record !",
  "Consultation très utile, je recommande à 100%.",
  "Rien à ajouter, tout était parfait.",
  "{professionnel}, rapide, {compétent}. Le trio gagnant.",
  "Je suis {rassuré} d'avoir trouvé {un} tel {professionnel}.",
];

// Noms complets réalistes
const CLIENT_FULL_NAMES = [
  'Sophie Marchand', 'Thomas Lefèvre', 'Nathalie Perrot', 'Marc Fontaine',
  'Élodie Tremblay', 'Jean-Pierre Lambert', 'Fatima Benali', 'Claire Dupont',
  'Aminata Diallo', 'Philippe Morel', 'Isabelle Renard', 'Thierry Garnier',
  'Valérie Rousseau', 'Stéphane Gagnon', 'Caroline Duval', 'Nicolas Petit',
  'François Girard', 'Sandrine Lefèvre', 'Laurent Moreau', 'Émilie Duval',
  'Christophe Morel', 'Aurélie Vasseur', 'Pierre Delorme', 'Fabien Gauthier',
  'Mélanie Picard', 'David Fontaine', 'Julien Carpentier', 'Antoine Lambert',
  'Camille Dupont', 'Nadia Bensalem', 'Rachid El Amrani', 'Youssef Tazi',
  'Cédric Martin', 'Olivier Nsimba', 'Damien Leroy', 'Véronique Caron',
  'Alexandre Bertrand', 'Isabelle Moreau', 'Didier Lambert', 'Hélène Joubert',
  'James Mitchell', 'Sarah Thompson', 'Robert Wilson', 'Emma Johnson',
  'Hans Müller', 'Wolfgang Schmidt', 'Klaus Weber', 'Petra Fischer',
  'Mohamed Al-Rashid', 'Ahmed Bouzid', 'Ali Mansouri', 'Samira Khelifi',
  'Moussa Diop', 'Ibrahim Touré', 'Abdoulaye Ndiaye', 'Ousmane Koné',
  'Antonio García', 'María López', 'Carlos Rodríguez', 'Ana Martínez',
];

const ALL_COUNTRIES = [
  'France', 'Belgique', 'Suisse', 'Canada', 'États-Unis', 'Royaume-Uni',
  'Allemagne', 'Espagne', 'Italie', 'Maroc', 'Algérie', 'Tunisie',
  'Sénégal', "Côte d'Ivoire", 'Cameroun', 'Chine', 'Japon', 'Inde',
  'Brésil', 'Argentine', 'Australie', 'Émirats arabes unis', 'Portugal',
  'Pays-Bas', 'Thaïlande', 'Singapour', 'Mexique',
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function fixAaaReviews(dryRun) {
  console.log('='.repeat(70));
  console.log(` CORRECTION DES AVIS AAA — ${dryRun ? 'DRY RUN' : '⚠️  EXÉCUTION RÉELLE'}`);
  console.log(' Commentaires GENRÉS (il/elle, compétent/compétente, etc.)');
  console.log('='.repeat(70));

  const TODAY = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;

  // 1. Récupérer tous les profils AAA
  console.log('\n📋 Récupération des profils AAA...');
  const profilesSnapshot = await db.collection('sos_profiles')
    .where('isAAA', '==', true)
    .get();

  let docs = profilesSnapshot.docs;
  if (docs.length === 0) {
    console.log('   Aucun profil isAAA, tentative avec isTestProfile...');
    const fallback = await db.collection('sos_profiles')
      .where('isTestProfile', '==', true)
      .get();
    docs = fallback.docs;
  }

  console.log(`   Trouvé ${docs.length} profils AAA\n`);

  if (docs.length === 0) {
    console.log('❌ Aucun profil trouvé, arrêt.');
    process.exit(1);
  }

  // Stats genre
  const genderStats = { male: 0, female: 0 };
  docs.forEach(d => { genderStats[d.data().gender || 'male']++; });
  console.log(`   Genres: ${genderStats.male} hommes, ${genderStats.female} femmes`);
  console.log(`   Templates disponibles: ${REVIEW_TEMPLATES.length}`);

  // Pré-générer des nombres d'avis uniques pour chaque profil
  const usedCounts = new Set();
  function getUniqueReviewCount() {
    let count;
    const maxAttempts = usedCounts.size < 26 ? 200 : 1;
    let attempts = 0;
    do {
      count = randomInt(3, 28);
      attempts++;
    } while (usedCounts.has(count) && attempts < maxAttempts);
    usedCounts.add(count);
    return count;
  }

  let totalDeleted = 0;
  let totalCreated = 0;

  const profilePlans = [];
  let totalPlanned = 0;
  for (const doc of docs) {
    const reviewCount = getUniqueReviewCount();
    profilePlans.push({ doc, reviewCount });
    totalPlanned += reviewCount;
  }
  console.log(`   Total avis planifiés: ${totalPlanned}\n`);

  for (const { doc: profileDoc, reviewCount } of profilePlans) {
    const profile = profileDoc.data();
    const uid = profileDoc.id;
    const fullName = profile.fullName || `${profile.firstName} ${profile.lastName}`;
    const gender = profile.gender || 'male';

    // Date d'inscription
    let createdAt;
    if (profile.createdAt && profile.createdAt.toDate) {
      createdAt = profile.createdAt.toDate();
    } else {
      createdAt = new Date('2024-10-01');
      createdAt.setDate(createdAt.getDate() + randomInt(0, 90));
    }

    const daysSinceCreation = Math.max(1, Math.floor((TODAY.getTime() - createdAt.getTime()) / msPerDay));
    const avgRating = parseFloat((4.0 + Math.random() * 1.0).toFixed(2));
    const totalCalls = Math.floor(reviewCount * (2 + Math.random()));

    // Générer les commentaires genrés pour ce profil
    const shuffledTemplates = shuffle(REVIEW_TEMPLATES);
    const profileComments = [];
    for (let j = 0; j < reviewCount; j++) {
      const template = shuffledTemplates[j % shuffledTemplates.length];
      profileComments.push(applyGender(template, gender));
    }

    if (dryRun) {
      console.log(`📋 ${fullName} (${gender}) | ${reviewCount} avis | rating: ${avgRating}`);
      for (let j = 0; j < Math.min(reviewCount, 3); j++) {
        const dayOffset = Math.floor(((j + 1) / (reviewCount + 1)) * daysSinceCreation);
        const reviewDate = new Date(createdAt.getTime() + dayOffset * msPerDay);
        console.log(`   ⭐ [${reviewDate.toISOString().split('T')[0]}] ${profileComments[j].substring(0, 80)}...`);
      }
      if (reviewCount > 3) console.log(`   ... et ${reviewCount - 3} autres avis`);
      totalCreated += reviewCount;
      continue;
    }

    // === MODE EXÉCUTION ===

    // Supprimer les anciens avis
    const oldReviews = await db.collection('reviews')
      .where('providerId', '==', uid)
      .get();

    if (oldReviews.size > 0) {
      // Firestore batch limit = 500
      for (let i = 0; i < oldReviews.docs.length; i += 400) {
        const batch = db.batch();
        oldReviews.docs.slice(i, i + 400).forEach(r => batch.delete(r.ref));
        await batch.commit();
      }
      totalDeleted += oldReviews.size;
    }

    // Créer les nouveaux avis
    for (let j = 0; j < reviewCount; j++) {
      const dayOffset = Math.floor(((j + 1) / (reviewCount + 1)) * daysSinceCreation);
      const reviewDate = new Date(createdAt.getTime() + dayOffset * msPerDay);
      const finalReviewDate = reviewDate > TODAY ? TODAY : reviewDate;

      await db.collection('reviews').add({
        providerId: uid,
        clientId: `client_fix_${Date.now()}_${j}`,
        clientName: randomChoice(CLIENT_FULL_NAMES),
        clientCountry: randomChoice(ALL_COUNTRIES),
        rating: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
        comment: profileComments[j],
        isPublic: true,
        status: 'published',
        serviceType: profile.type === 'expat' ? 'expat_call' : 'lawyer_call',
        createdAt: admin.firestore.Timestamp.fromDate(finalReviewDate),
        helpfulVotes: randomInt(0, 15),
      });
      totalCreated++;
    }

    // Mettre à jour les compteurs
    const updateData = { reviewCount, rating: avgRating, averageRating: avgRating, totalCalls };
    await db.collection('sos_profiles').doc(uid).update(updateData);
    try { await db.collection('users').doc(uid).update(updateData); } catch (e) { /* ok */ }
    try { await db.collection('ui_profile_cards').doc(uid).update({ reviewCount, rating: avgRating }); } catch (e) { /* ok */ }

    console.log(`✓ ${fullName} (${gender}) | ${reviewCount} avis | rating: ${avgRating}`);
    await new Promise(r => setTimeout(r, 50));
  }

  console.log('\n' + '='.repeat(70));
  console.log(` TERMINÉ!`);
  if (!dryRun) console.log(` - ${totalDeleted} anciens avis supprimés`);
  console.log(` - ${totalCreated} nouveaux avis ${dryRun ? 'planifiés' : 'créés'}`);
  console.log(` - ${profilePlans.length} profils traités`);
  console.log(` - Commentaires genrés: il/elle, compétent/compétente, etc.`);
  console.log('='.repeat(70));

  process.exit(0);
}

const args = process.argv.slice(2);
const dryRun = !args.includes('--execute');
if (dryRun) {
  console.log('\n💡 Mode DRY RUN — ajoutez --execute pour écrire en Firestore\n');
}
fixAaaReviews(dryRun).catch(err => {
  console.error('❌ Erreur:', err);
  process.exit(1);
});
