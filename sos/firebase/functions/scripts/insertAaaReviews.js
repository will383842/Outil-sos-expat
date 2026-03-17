/**
 * Insert 4 additional personalized French reviews for each AAA profile
 * Reviews are coherent with each profile's role, specialties, country, gender
 *
 * Usage:
 *   cd sos/firebase/functions
 *   node scripts/insertAaaReviews.js --dry-run
 *   node scripts/insertAaaReviews.js --execute
 */

const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'sos-urgently-ac307' });
const db = admin.firestore();

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Specialty code to French label mapping (simplified)
const SPECIALTY_LABELS = {
  'IMMI_VISAS_PERMIS_SEJOUR': 'visas et permis de séjour',
  'IMMI_CONTRATS_TRAVAIL_INTERNATIONAL': 'contrats de travail internationaux',
  'IMMI_NATURALISATION': 'naturalisation',
  'IMMI_VISA_NOMADE_DIGITAL': 'visa nomade digital',
  'FAM_MARIAGE_DIVORCE': 'mariage et divorce',
  'FAM_GARDE_ENFANTS_TRANSFRONTALIERE': 'garde d\'enfants transfrontalière',
  'FAM_SCOLARITE_INTERNATIONALE': 'scolarité internationale',
  'FISC_DECLARATIONS_INTERNATIONALES': 'déclarations fiscales internationales',
  'FISC_OPTIMISATION_EXPATRIES': 'optimisation fiscale pour expatriés',
  'FISC_DOUBLE_IMPOSITION': 'double imposition',
  'ENTR_CREATION_ENTREPRISE_ETRANGER': 'création d\'entreprise à l\'étranger',
  'ENTR_INVESTISSEMENTS': 'investissements',
  'ENTR_IMPORT_EXPORT': 'import-export',
  'TRAV_SECURITE_SOCIALE_INTERNATIONALE': 'sécurité sociale internationale',
  'TRAV_RETRAITE_INTERNATIONALE': 'retraite internationale',
  'URG_ASSISTANCE_PENALE_INTERNATIONALE': 'assistance pénale internationale',
  'URG_ACCIDENTS_RESPONSABILITE_CIVILE': 'accidents et responsabilité civile',
  'IMMO_ACHAT_VENTE': 'achat et vente immobilière',
  'IMMO_LOCATION_BAUX': 'location et baux',
  'IMMO_LITIGES_IMMOBILIERS': 'litiges immobiliers',
  'PATR_SUCCESSIONS_INTERNATIONALES': 'successions internationales',
  'PATR_TESTAMENTS': 'testaments',
  'ASSU_ASSURANCES_INTERNATIONALES': 'assurances internationales',
  'BANK_PROBLEMES_COMPTES_BANCAIRES': 'problèmes de comptes bancaires',
  'BANK_VIREMENTS_CREDITS': 'virements et crédits bancaires',
  'CUR_DEMARCHES_ADMINISTRATIVES': 'démarches administratives',
  'CUR_TRADUCTIONS_LEGALISATIONS': 'traductions et légalisations',
  'CUR_RECLAMATIONS_LITIGES_MINEURS': 'réclamations et litiges',
  'CONS_ACHATS_DEFECTUEUX_ETRANGER': 'achats défectueux',
  'CONS_SERVICES_NON_CONFORMES': 'services non conformes',
  'SANT_DROIT_MEDICAL': 'droit médical',
  'SANT_REMBOURSEMENTS_SOINS': 'remboursements de soins',
  'TRAN_PROBLEMES_AERIENS': 'problèmes aériens',
  'TRAN_BAGAGES_PERDUS_ENDOMMAGES': 'bagages perdus ou endommagés',
  'VIO_DISCRIMINATIONS': 'discriminations',
  'VIO_VIOLENCES_DOMESTIQUES': 'violences domestiques',
  'ARGT_SURENDETTEMENT_PLANS': 'surendettement',
  'ARGT_FRAIS_BANCAIRES_ABUSIFS': 'frais bancaires abusifs',
  'ARGT_ARNAQUES_ESCROQUERIES': 'arnaques et escroqueries',
  'COMP_DROIT_AFRICAIN': 'droit africain',
  'COMP_DROIT_ASIATIQUE': 'droit asiatique',
  'OTH_PRECISER_BESOIN': 'assistance diverse',
};

const COUNTRY_NAMES = {
  'FR': 'France', 'BE': 'Belgique', 'CH': 'Suisse', 'CA': 'Canada', 'SN': 'Sénégal',
  'MA': 'Maroc', 'CI': 'Côte d\'Ivoire', 'CM': 'Cameroun', 'TN': 'Tunisie', 'DZ': 'Algérie',
  'MX': 'Mexique', 'SG': 'Singapour', 'MU': 'Maurice', 'SE': 'Suède', 'IT': 'Italie',
  'PL': 'Pologne', 'CZ': 'République tchèque', 'IE': 'Irlande', 'TR': 'Turquie',
  'GA': 'Gabon', 'KE': 'Kenya', 'DJ': 'Djibouti', 'KW': 'Koweït', 'US': 'États-Unis',
  'DO': 'République dominicaine', 'ZA': 'Afrique du Sud', 'AE': 'Émirats arabes unis',
  'GF': 'Guyane française', 'HK': 'Hong Kong', 'JP': 'Japon', 'IN': 'Inde',
  'KZ': 'Kazakhstan', 'AU': 'Australie', 'HT': 'Haïti', 'AL': 'Albanie',
  'EE': 'Estonie', 'GB': 'Royaume-Uni', 'KR': 'Corée du Sud', 'RO': 'Roumanie',
  'LB': 'Liban', 'TH': 'Thaïlande', 'HR': 'Croatie', 'CO': 'Colombie',
  'ET': 'Éthiopie', 'GH': 'Ghana', 'TT': 'Trinidad-et-Tobago', 'PF': 'Polynésie française',
  'AR': 'Argentine', 'EG': 'Égypte', 'AO': 'Angola', 'ZM': 'Zambie',
  'ES': 'Espagne', 'MD': 'Moldavie', 'GP': 'Guadeloupe', 'PH': 'Philippines',
};

const CLIENT_NAMES_FR = [
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
  'Sandrine Petit', 'Bruno Arnaud', 'Patrice Renaud', 'Aurélie Fontaine',
  'Christine Bonnet', 'François Petit', 'Christelle Martin', 'Antoine Dupuis',
  'Jean-Claude Arnaud', 'Stéphanie Girard', 'Patrick Nguyen', 'Romain Girard',
];

const CLIENT_COUNTRIES = ['FR', 'BE', 'CA', 'CH', 'SN', 'MA', 'FR', 'FR', 'BE', 'CA'];

function getSpecLabel(code) {
  return SPECIALTY_LABELS[code] || code.toLowerCase().replace(/_/g, ' ');
}

function getCountryName(code) {
  return COUNTRY_NAMES[code] || code;
}

// Generate 4 review templates per profile type
function generateReviews(profile) {
  const { id, fullName, gender, role, country, specialties, createdAt, yearsExp } = profile;
  const firstName = fullName.split(' ')[0];
  const countryName = getCountryName(country);
  const isLawyer = role === 'lawyer';
  const isFemale = gender === 'female';

  // Get top 2 specialties as labels
  const spec1 = getSpecLabel(specialties[0] || 'OTH_PRECISER_BESOIN');
  const spec2 = getSpecLabel(specialties[1] || specialties[0] || 'OTH_PRECISER_BESOIN');
  const spec3 = getSpecLabel(specialties[2] || specialties[0] || 'OTH_PRECISER_BESOIN');

  const title = isLawyer ? (isFemale ? 'Maître' : 'Maître') : '';
  const pronoun = isFemale ? 'elle' : 'il';
  const pronoun_cap = isFemale ? 'Elle' : 'Il';
  const adj_e = isFemale ? 'e' : '';
  const roleWord = isLawyer ? (isFemale ? 'avocate' : 'avocat') : (isFemale ? 'experte' : 'expert');
  const serviceType = isLawyer ? 'lawyer_call' : 'expat_call';

  // Registration date
  const regDate = new Date(createdAt);
  const now = new Date('2026-03-17');
  const totalDays = Math.floor((now - regDate) / (1000*60*60*24));

  // Review templates - deeply personalized
  const reviewPool = [];

  if (isLawyer) {
    reviewPool.push(
      `${title} ${fullName.split(' ').pop()} m'a accompagné${adj_e === 'e' ? 'e' : ''} pour une question de ${spec1} en ${countryName}. ${pronoun_cap} a été d'une efficacité remarquable et m'a expliqué chaque étape avec clarté. Je recommande vivement ${isFemale ? 'cette avocate' : 'cet avocat'} à tout expatrié.`,
      `Excellent${adj_e} ${roleWord} ! ${firstName} m'a aidé à résoudre un problème lié ${spec2.startsWith('a') || spec2.startsWith('é') || spec2.startsWith('i') || spec2.startsWith('o') || spec2.startsWith('u') ? 'à l\'' : 'aux '}${spec2} en ${countryName}. ${pronoun_cap} maîtrise parfaitement le droit local et m'a fait gagner un temps précieux. Très professionnel${adj_e}.`,
      `J'ai consulté ${title} ${fullName.split(' ').pop()} pour ${spec3} depuis ${countryName}. ${pronoun_cap} a pris le temps de bien comprendre ma situation et m'a donné des conseils concrets et adaptés. Un${adj_e} ${roleWord} compétent${adj_e} et à l'écoute.`,
      `${firstName} a géré mon dossier de ${spec1} avec beaucoup de rigueur. ${pronoun_cap} connaît parfaitement les procédures en ${countryName} et m'a tenu${adj_e === 'e' ? '' : ''} informé à chaque étape. Grâce à ${isFemale ? 'elle' : 'lui'}, tout s'est réglé rapidement.`,
      `Très satisfait${adj_e === 'e' ? '' : ''} de ma consultation avec ${title} ${fullName.split(' ').pop()}. ${pronoun_cap} m'a conseillé sur ${spec2} en ${countryName} avec une expertise impressionnante. Ses ${yearsExp} ans d'expérience se ressentent dans la qualité de ses conseils.`,
      `J'avais un problème urgent lié ${spec3.startsWith('a') || spec3.startsWith('é') ? 'à l\'' : 'aux '}${spec3} en ${countryName}. ${firstName} a réagi immédiatement et a su me rassurer. ${pronoun_cap} a trouvé une solution que je n'aurais jamais envisagée seul. Merci infiniment !`,
    );
  } else {
    reviewPool.push(
      `${firstName} m'a été d'une aide précieuse pour mes ${spec1} en ${countryName}. ${pronoun_cap} connaît parfaitement les démarches locales et m'a fait gagner un temps fou. Je recommande vivement ses services à tout nouvel expatrié.`,
      `Grâce à ${firstName}, j'ai pu m'installer en ${countryName} sans stress. ${pronoun_cap} m'a accompagné${adj_e === 'e' ? 'e' : ''} pour ${spec2} avec beaucoup de patience et de professionnalisme. Un${adj_e} vrai${adj_e === 'e' ? 'e' : ''} allié${adj_e === 'e' ? 'e' : ''} pour l'expatriation.`,
      `${firstName} connaît ${countryName} comme sa poche. ${pronoun_cap} m'a aidé${adj_e === 'e' ? 'e' : ''} avec ${spec3} et ses conseils d'insider m'ont évité beaucoup d'erreurs de débutant. Très réactif${adj_e} et toujours disponible.`,
      `Service impeccable ! ${firstName} m'a guidé dans mes ${spec1} en ${countryName}. Ses ${yearsExp} ans d'expérience sur place font toute la différence. ${pronoun_cap} est chaleureux${adj_e === 'e' ? 'se' : ''}, efficace et donne des conseils très pratiques.`,
      `J'ai contacté ${firstName} pour ${spec2} et j'ai été bluffé${adj_e === 'e' ? '' : ''} par la qualité de l'accompagnement. ${pronoun_cap} m'a non seulement aidé${adj_e === 'e' ? 'e' : ''} avec mes démarches mais aussi partagé des astuces locales précieuses. Un vrai plus pour la vie en ${countryName}.`,
      `Super expérience avec ${firstName} ! ${pronoun_cap} m'a accompagné${adj_e === 'e' ? 'e' : ''} pour ${spec3} en ${countryName}. Rapide, efficace, et surtout très humain${adj_e === 'e' ? 'e' : ''}. Je n'hésiterai pas à refaire appel à ${isFemale ? 'elle' : 'lui'}.`,
    );
  }

  // Pick 4 unique reviews
  const shuffled = reviewPool.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 4);

  // Generate dates: spread across time + 1 recent
  const ratings = [5, 5, 4, 5].sort(() => Math.random() - 0.5);
  const dayOffsets = [
    randomInt(10, Math.min(30, totalDays)),           // early
    randomInt(30, Math.min(60, totalDays)),            // mid
    randomInt(50, Math.min(80, totalDays)),            // later
    randomInt(Math.max(1, totalDays - 10), totalDays), // recent (within last 10 days)
  ].sort((a, b) => a - b);

  const usedNames = new Set();

  return selected.map((comment, i) => {
    let clientName;
    do {
      clientName = CLIENT_NAMES_FR[randomInt(0, CLIENT_NAMES_FR.length - 1)];
    } while (usedNames.has(clientName));
    usedNames.add(clientName);

    const reviewDate = new Date(regDate.getTime() + dayOffsets[i] * 24*60*60*1000);

    return {
      providerId: id,
      clientId: `generated_review_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      clientName,
      clientCountry: CLIENT_COUNTRIES[randomInt(0, CLIENT_COUNTRIES.length - 1)],
      rating: ratings[i],
      comment,
      commentKey: `custom_review_${i}`,
      isPublic: true,
      status: 'published',
      serviceType,
      createdAt: admin.firestore.Timestamp.fromDate(reviewDate),
      helpfulVotes: randomInt(0, 15),
      verified: true,
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
  });
}

async function run(dryRun = true) {
  console.log(`\n⭐ Insert AAA Reviews - ${dryRun ? 'DRY RUN' : '⚠️  EXÉCUTION RÉELLE'}`);
  console.log('='.repeat(60));

  // Load all AAA profiles
  const snap = await db.collection('sos_profiles').where('isAAA', '==', true).get();
  console.log(`\n📋 Found ${snap.size} AAA profiles`);

  const allReviews = [];

  for (const d of snap.docs) {
    const data = d.data();
    const profile = {
      id: d.id,
      fullName: data.fullName,
      gender: data.gender || 'male',
      role: data.type || data.role || 'lawyer',
      country: data.country || 'FR',
      specialties: data.specialties || data.helpTypes || [],
      createdAt: data.createdAt?._seconds
        ? new Date(data.createdAt._seconds * 1000).toISOString()
        : '2025-12-15',
      yearsExp: data.yearsOfExperience || data.yearsAsExpat || 5,
    };

    const reviews = generateReviews(profile);
    allReviews.push(...reviews);

    if (dryRun) {
      console.log(`\n👤 ${data.fullName} (${profile.role}, ${profile.gender}, ${getCountryName(profile.country)}):`);
      reviews.forEach((r, i) => {
        console.log(`   ⭐${r.rating} [${r.createdAt.toDate().toISOString().split('T')[0]}] ${r.comment.substring(0, 80)}...`);
      });
    }
  }

  console.log(`\n📊 Total reviews to insert: ${allReviews.length}`);

  if (dryRun) {
    console.log('\n🔍 DRY RUN terminé. Lancez avec --execute pour insérer.');
    return;
  }

  // Insert reviews in batches
  let inserted = 0;
  const batchSize = 400; // Firestore limit is 500 per batch

  for (let i = 0; i < allReviews.length; i += batchSize) {
    const batch = db.batch();
    const chunk = allReviews.slice(i, i + batchSize);

    for (const review of chunk) {
      const ref = db.collection('reviews').doc();
      batch.set(ref, review);
    }

    await batch.commit();
    inserted += chunk.length;
    console.log(`   Inserted ${inserted}/${allReviews.length} reviews`);
  }

  // Update reviewCount on each profile
  console.log('\n📊 Updating review counts...');
  for (const d of snap.docs) {
    const currentCount = d.data().reviewCount || 0;
    const newCount = currentCount + 4;

    await db.collection('sos_profiles').doc(d.id).update({ reviewCount: newCount });
    try {
      await db.collection('users').doc(d.id).update({ reviewCount: newCount });
    } catch (e) { /* users doc may not exist */ }
  }

  console.log(`\n✅ Done! Inserted ${inserted} reviews for ${snap.size} profiles`);
}

const args = process.argv.slice(2);
const dryRun = !args.includes('--execute');
run(dryRun).catch(e => { console.error('❌ Fatal:', e); process.exit(1); });
