/**
 * Script pour corriger TOUS les profils AAA
 * - Dates d'inscription: 1er octobre 2024 - 30 décembre 2024
 * - Âges: 27-55 ans
 * - Sexe: Hommes uniquement
 * - Langue: Français uniquement
 * - Avis: 1-2 par semaine depuis inscription
 */

const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.join(__dirname, '..', 'serviceAccount.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'sos-urgently-ac307'
});

const db = admin.firestore();

// =============================================================================
// NOMS MASCULINS PAR RÉGION
// =============================================================================

const NAMES_FR = { male: ['Jean', 'Pierre', 'Michel', 'Philippe', 'Thomas', 'Nicolas', 'François', 'Laurent', 'Éric', 'David', 'Stéphane', 'Olivier', 'Christophe', 'Frédéric', 'Patrick', 'Antoine', 'Julien', 'Alexandre', 'Sébastien', 'Vincent'], lastNames: ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau'] };
const NAMES_DE = { male: ['Hans', 'Peter', 'Wolfgang', 'Klaus', 'Michael', 'Thomas', 'Andreas', 'Stefan', 'Christian', 'Martin'], lastNames: ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann'] };
const NAMES_ES = { male: ['Antonio', 'José', 'Manuel', 'Francisco', 'Juan', 'David', 'Carlos', 'Miguel', 'Pedro', 'Alejandro'], lastNames: ['García', 'Rodríguez', 'González', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Martín'] };
const NAMES_IT = { male: ['Marco', 'Luca', 'Giuseppe', 'Francesco', 'Antonio', 'Matteo', 'Alessandro', 'Andrea', 'Stefano', 'Paolo'], lastNames: ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco'] };
const NAMES_EN = { male: ['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Christopher'], lastNames: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'] };
const NAMES_PT = { male: ['José', 'João', 'Antonio', 'Francisco', 'Carlos', 'Paulo', 'Pedro', 'Lucas', 'Luiz', 'Marcos'], lastNames: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes'] };
const NAMES_AFRICA_FR = { male: ['Moussa', 'Ibrahim', 'Abdoulaye', 'Ousmane', 'Cheikh', 'Mamadou', 'Amadou', 'Issa', 'Aliou', 'Souleymane'], lastNames: ['Diop', 'Ba', 'Ndiaye', 'Traoré', 'Diallo', 'Koné', 'Sy', 'Sarr', 'Cissé', 'Camara'] };
const NAMES_AFRICA_EN = { male: ['John', 'Michael', 'Samuel', 'David', 'Peter', 'Daniel', 'Joseph', 'Paul', 'Emmanuel', 'James'], lastNames: ['Mensah', 'Okafor', 'Abebe', 'Kamau', 'Okoro', 'Mwangi', 'Ochieng', 'Mutua', 'Nkrumah', 'Adeyemi'] };
const NAMES_MA = { male: ['Mohamed', 'Ahmed', 'Ali', 'Hassan', 'Omar', 'Youssef', 'Khalid', 'Said', 'Rachid', 'Karim'], lastNames: ['Alami', 'Benjelloun', 'El Amrani', 'Bennis', 'Cherkaoui', 'Idrissi', 'Tazi', 'Fassi', 'El Mansouri', 'Bennani'] };
const NAMES_CN = { male: ['Wei', 'Ming', 'Jun', 'Feng', 'Lei', 'Bo', 'Jian', 'Peng', 'Yang', 'Hao'], lastNames: ['Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Huang', 'Zhao', 'Wu', 'Zhou'] };
const NAMES_JP = { male: ['Hiroshi', 'Takeshi', 'Kenji', 'Yuki', 'Taro', 'Koji', 'Masao', 'Akira', 'Satoshi', 'Kazuo'], lastNames: ['Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Kato'] };
const NAMES_IN = { male: ['Raj', 'Amit', 'Rahul', 'Arun', 'Vijay', 'Suresh', 'Ravi', 'Sanjay', 'Anand', 'Ashok'], lastNames: ['Patel', 'Kumar', 'Singh', 'Sharma', 'Shah', 'Gupta', 'Reddy', 'Iyer', 'Nair', 'Rao'] };
const NAMES_SLAVIC = { male: ['Ivan', 'Oleg', 'Dmitri', 'Sergei', 'Alexei', 'Nikolai', 'Andrei', 'Vladimir', 'Yuri', 'Mikhail'], lastNames: ['Ivanov', 'Petrov', 'Sidorov', 'Smirnov', 'Kuznetsov', 'Popov', 'Sokolov', 'Orlov', 'Volkov', 'Fedorov'] };
const NAMES_TURKIC = { male: ['Mehmet', 'Ahmet', 'Mustafa', 'Ali', 'Murat', 'Okan', 'Hakan', 'Yusuf', 'Emre', 'Burak'], lastNames: ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Yıldırım', 'Aydın', 'Öztürk', 'Arslan'] };
const NAMES_SE_ASIA = { male: ['Somchai', 'Somsak', 'Sompong', 'Wichai', 'Niran', 'Kitti', 'Prasert', 'Surachai', 'Thana', 'Amnuay'], lastNames: ['Saetang', 'Chokchai', 'Rattana', 'Siriwan', 'Prasert', 'Niran', 'Chaiyaporn', 'Somchai', 'Wichai', 'Thana'] };
const NAMES_KOREAN = { male: ['Min-jun', 'Seo-joon', 'Ji-hoon', 'Jae-won', 'Hyun-woo', 'Dong-hyun', 'Sung-min', 'Jong-ho', 'Young-soo', 'Tae-hyun'], lastNames: ['Kim', 'Lee', 'Park', 'Choi', 'Jung', 'Kang', 'Cho', 'Yoon', 'Jang', 'Lim'] };
const NAMES_VIET = { male: ['Anh', 'Minh', 'Quang', 'Huy', 'Tuan', 'Duc', 'Nam', 'Phong', 'Khanh', 'Long'], lastNames: ['Nguyen', 'Tran', 'Le', 'Pham', 'Hoang', 'Huynh', 'Vu', 'Vo', 'Dang', 'Bui'] };
const NAMES_INDONESIA = { male: ['Agus', 'Budi', 'Joko', 'Hendra', 'Rizky', 'Andi', 'Yudi', 'Fajar', 'Dedi', 'Imam'], lastNames: ['Pratama', 'Saputra', 'Santoso', 'Wijaya', 'Hidayat', 'Kurniawan', 'Setiawan', 'Nugroho', 'Siregar', 'Gunawan'] };
const NAMES_NORDIC = { male: ['Lars', 'Ola', 'Erik', 'Mikael', 'Jonas', 'Henrik', 'Anders', 'Nils', 'Per', 'Ole'], lastNames: ['Johansson', 'Andersen', 'Hansen', 'Larsen', 'Nielsen', 'Berg', 'Lund', 'Haug', 'Olsen', 'Persson'] };
const NAMES_PERSIAN = { male: ['Ali', 'Hassan', 'Reza', 'Hossein', 'Mahmoud', 'Farid', 'Omid', 'Saeed', 'Amir', 'Javad'], lastNames: ['Hosseini', 'Rezai', 'Rahimi', 'Karimi', 'Ahmadi', 'Jafari', 'Moradi', 'Farhadi', 'Ebrahimi', 'Nasseri'] };
const NAMES_HEBREW = { male: ['David', 'Yosef', 'Moshe', 'Avi', 'Yaakov', 'Yehuda', 'Noam', 'Alon', 'Eitan', 'Yair'], lastNames: ['Cohen', 'Levi', 'Mizrahi', 'Biton', 'Goldstein', 'Katz', 'Azoulay', 'Ohayon', 'Peretz', 'Ben-David'] };

function getNamesByCountryCode(code) {
  const FR_COUNTRIES = ['FR', 'BE', 'LU', 'MC', 'HT', 'CH'];
  const DE_COUNTRIES = ['DE', 'AT', 'LI'];
  const ES_COUNTRIES = ['ES', 'AD', 'MX', 'GT', 'HN', 'SV', 'NI', 'CR', 'PA', 'CU', 'DO', 'CO', 'VE', 'EC', 'PE', 'BO', 'PY', 'CL', 'AR', 'UY'];
  const IT_COUNTRIES = ['IT', 'SM', 'VA', 'MT'];
  const PT_COUNTRIES = ['PT', 'BR', 'AO', 'MZ', 'CV', 'GW', 'ST', 'TL'];
  const EN_COUNTRIES = ['GB', 'IE', 'US', 'CA', 'AU', 'NZ', 'JM', 'TT', 'BB', 'BS', 'GY', 'BZ', 'AG', 'DM', 'GD', 'KN', 'LC', 'VC', 'CY'];
  const AFRICA_FR_COUNTRIES = ['SN', 'ML', 'CI', 'BF', 'NE', 'TG', 'BJ', 'GN', 'CM', 'CF', 'TD', 'CG', 'CD', 'GA', 'DJ', 'KM', 'MG', 'MR', 'RW', 'BI', 'GQ'];
  const AFRICA_EN_COUNTRIES = ['NG', 'GH', 'KE', 'TZ', 'UG', 'ZA', 'ZW', 'ZM', 'BW', 'NA', 'MW', 'LS', 'SZ', 'ET', 'ER', 'SS', 'SD', 'SO', 'GM', 'SL', 'LR', 'SC', 'MU'];
  const MA_COUNTRIES = ['MA', 'DZ', 'TN', 'LY', 'EG', 'SA', 'AE', 'QA', 'KW', 'BH', 'OM', 'YE', 'JO', 'LB', 'SY', 'IQ', 'PS'];
  const CN_COUNTRIES = ['CN', 'TW', 'SG'];
  const JP_COUNTRIES = ['JP'];
  const IN_COUNTRIES = ['IN', 'BD', 'NP', 'LK', 'MV', 'PK', 'BT'];
  const SLAVIC_COUNTRIES = ['RU', 'UA', 'BY', 'PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'RS', 'HR', 'SI', 'BA', 'ME', 'MK', 'AL', 'MD', 'EE', 'LV', 'LT', 'GE', 'AM', 'AZ'];
  const TURKIC_COUNTRIES = ['TR', 'KZ', 'UZ', 'TM', 'KG', 'TJ'];
  const SE_ASIA_COUNTRIES = ['TH', 'MM', 'LA', 'KH'];
  const KOREAN_COUNTRIES = ['KR', 'KP'];
  const VIET_COUNTRIES = ['VN'];
  const INDONESIA_COUNTRIES = ['ID', 'MY', 'BN', 'PH'];
  const NORDIC_COUNTRIES = ['NO', 'SE', 'DK', 'FI', 'IS', 'NL'];
  const PERSIAN_COUNTRIES = ['IR', 'AF'];
  const HEBREW_COUNTRIES = ['IL'];

  if (FR_COUNTRIES.includes(code)) return NAMES_FR;
  if (DE_COUNTRIES.includes(code)) return NAMES_DE;
  if (ES_COUNTRIES.includes(code)) return NAMES_ES;
  if (IT_COUNTRIES.includes(code)) return NAMES_IT;
  if (PT_COUNTRIES.includes(code)) return NAMES_PT;
  if (EN_COUNTRIES.includes(code)) return NAMES_EN;
  if (AFRICA_FR_COUNTRIES.includes(code)) return NAMES_AFRICA_FR;
  if (AFRICA_EN_COUNTRIES.includes(code)) return NAMES_AFRICA_EN;
  if (MA_COUNTRIES.includes(code)) return NAMES_MA;
  if (CN_COUNTRIES.includes(code)) return NAMES_CN;
  if (JP_COUNTRIES.includes(code)) return NAMES_JP;
  if (IN_COUNTRIES.includes(code)) return NAMES_IN;
  if (SLAVIC_COUNTRIES.includes(code)) return NAMES_SLAVIC;
  if (TURKIC_COUNTRIES.includes(code)) return NAMES_TURKIC;
  if (SE_ASIA_COUNTRIES.includes(code)) return NAMES_SE_ASIA;
  if (KOREAN_COUNTRIES.includes(code)) return NAMES_KOREAN;
  if (VIET_COUNTRIES.includes(code)) return NAMES_VIET;
  if (INDONESIA_COUNTRIES.includes(code)) return NAMES_INDONESIA;
  if (NORDIC_COUNTRIES.includes(code)) return NAMES_NORDIC;
  if (PERSIAN_COUNTRIES.includes(code)) return NAMES_PERSIAN;
  if (HEBREW_COUNTRIES.includes(code)) return NAMES_HEBREW;
  return NAMES_EN;
}

// Commentaires d'avis
const REVIEW_COMMENTS = [
  "Excellent avocat, très professionnel et à l'écoute.",
  "Conseils juridiques de qualité exceptionnelle.",
  "Très satisfait de ses services, réponse rapide.",
  "Expertise remarquable en droit international.",
  "Un professionnel dévoué et compétent.",
  "Service impeccable, communication claire.",
  "Avocat très compétent, je recommande.",
  "Professionnalisme exemplaire.",
  "Excellent suivi de dossier.",
  "Ses conseils m'ont été très précieux.",
  "Grande expertise juridique.",
  "Très bonne expérience, je recommande.",
  "Avocat sérieux et rigoureux.",
  "Pédagogue et patient.",
  "A su gérer mon dossier avec brio.",
  "Service client irréprochable.",
  "Maîtrise parfaite du sujet.",
  "Excellent rapport qualité-prix.",
  "Très bon avocat francophone.",
  "Compétence et sérieux au rendez-vous.",
  "Tarifs raisonnables pour un service de qualité.",
  "Son expérience fait vraiment la différence.",
  "Je le recommande à tous les expatriés.",
  "Un avocat de confiance.",
  "Efficacité et professionnalisme.",
  "Grâce à lui, j'ai obtenu mon visa.",
  "Excellent accompagnement.",
  "A su défendre mes intérêts avec brio.",
  "Toujours disponible quand j'avais des urgences.",
  "Documents rédigés avec soin.",
  "Un vrai professionnel.",
  "Réactivité impressionnante.",
  "Avocat francophone très compétent.",
  "Son réseau local m'a beaucoup aidé.",
  "Prend le temps d'expliquer les procédures.",
  "Honoraires transparents.",
  "Je suis très satisfait du résultat.",
  "Merci pour votre aide précieuse.",
  "Je recommande vivement ses services.",
  "Excellent travail, merci!",
];

const ALL_COUNTRIES_NAMES = ['France', 'Belgique', 'Suisse', 'Canada', 'États-Unis', 'Royaume-Uni', 'Allemagne', 'Espagne', 'Italie', 'Maroc', 'Algérie', 'Tunisie', 'Sénégal', 'Côte d\'Ivoire', 'Cameroun', 'Chine', 'Japon', 'Inde', 'Brésil', 'Argentine'];

const BIO_TEMPLATES = [
  "Fort de {exp} années d'expérience en droit international, je conseille les expatriés francophones. Basé en {pays}, j'interviens également dans {autres_pays}.",
  "Avocat inscrit au barreau depuis {exp} ans, je me consacre aux problématiques juridiques des Français à l'étranger.",
  "Passionné par le droit international, j'exerce depuis {exp} ans. Installé en {pays}, j'interviens aussi dans {autres_pays}.",
  "Après {exp} ans de pratique juridique, j'ai développé une expertise pointue en droit des expatriés.",
  "Spécialiste du droit des expatriés depuis {exp} ans. De {pays}, j'interviens dans {autres_pays}.",
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDateBetween(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function slugify(str) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

async function fixAllAaaProfiles() {
  console.log('='.repeat(70));
  console.log(' CORRECTION COMPLÈTE DES PROFILS AAA');
  console.log(' - Dates: 1er oct 2024 - 30 déc 2024');
  console.log(' - Âges: 27-55 ans');
  console.log(' - Sexe: Hommes uniquement');
  console.log(' - Langue: Français');
  console.log(' - Avis: 1-2 par semaine');
  console.log('='.repeat(70));

  const START_DATE = new Date('2025-10-01');
  const END_DATE = new Date('2025-12-31');
  const TODAY = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;

  // Récupérer tous les profils AAA
  console.log('\n📋 Récupération des profils AAA...');
  const profilesSnapshot = await db.collection('sos_profiles')
    .where('isTestProfile', '==', true)
    .get();

  console.log(`   Trouvé ${profilesSnapshot.size} profils AAA\n`);

  let updated = 0;
  let reviewsDeleted = 0;
  let reviewsCreated = 0;

  for (const doc of profilesSnapshot.docs) {
    const profile = doc.data();
    const uid = doc.id;
    const countryCode = profile.country || 'FR';

    // 1. Générer un nouveau nom MASCULIN selon le pays
    const namesData = getNamesByCountryCode(countryCode);
    const firstName = randomChoice(namesData.male);
    const lastName = randomChoice(namesData.lastNames);
    const fullName = `${firstName} ${lastName}`;
    const email = `${slugify(firstName)}.${slugify(lastName)}.${randomInt(1, 999)}@test-sos.com`;

    // 2. Nouvelle date d'inscription (oct-déc 2024)
    const createdAt = randomDateBetween(START_DATE, END_DATE);

    // 3. Âge entre 27 et 55 ans
    const age = randomInt(27, 55);
    const birthYear = TODAY.getFullYear() - age;
    const yearsOfExperience = age - randomInt(24, 27); // Commence à exercer entre 24-27 ans
    const graduationYear = birthYear + randomInt(24, 27);

    // 4. Bio
    const practiceCountries = profile.practiceCountries || [countryCode];
    const countryName = profile.currentCountry ? profile.currentCountry : countryCode;
    const otherCountriesText = practiceCountries.length > 1 ? practiceCountries.slice(1).join(', ') : 'plusieurs régions';
    const bio = randomChoice(BIO_TEMPLATES)
      .replace(/{exp}/g, yearsOfExperience.toString())
      .replace(/{pays}/g, countryName)
      .replace(/{autres_pays}/g, otherCountriesText);

    // 5. Calculer les avis (1-2 par semaine depuis inscription)
    const daysSinceCreation = Math.max(1, Math.floor((TODAY.getTime() - createdAt.getTime()) / msPerDay));
    const weeksSinceCreation = Math.max(1, Math.floor(daysSinceCreation / 7));
    const maxReviewsPerWeek = Math.random() > 0.5 ? 2 : 1;
    const reviewCount = Math.min(weeksSinceCreation * maxReviewsPerWeek, 40);
    const totalCalls = Math.floor(reviewCount * (2 + Math.random()));
    const rating = parseFloat((4.0 + Math.random() * 1.0).toFixed(2));

    // 6. Mettre à jour le profil dans toutes les collections
    const updateData = {
      firstName,
      lastName,
      fullName,
      email,
      age,
      birthYear,
      yearsOfExperience,
      graduationYear,
      bio: { fr: bio, en: bio },
      languages: ['fr'],
      languagesSpoken: ['Français'],
      preferredLanguage: 'fr',
      createdAt: admin.firestore.Timestamp.fromDate(createdAt),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      reviewCount,
      totalCalls,
      rating,
      averageRating: rating,
    };

    await db.collection('users').doc(uid).update(updateData);
    await db.collection('sos_profiles').doc(uid).update(updateData);
    await db.collection('ui_profile_cards').doc(uid).update({
      title: fullName,
      rating,
      reviewCount,
    });

    // 7. Supprimer les anciens avis
    const oldReviews = await db.collection('reviews').where('providerId', '==', uid).get();
    const deletePromises = oldReviews.docs.map(r => r.ref.delete());
    await Promise.all(deletePromises);
    reviewsDeleted += oldReviews.size;

    // 8. Créer les nouveaux avis
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

      const clientNames = Object.values({...NAMES_FR, ...NAMES_EN, ...NAMES_ES}).flat().filter(n => typeof n === 'string' && n.length > 2);
      const clientName = randomChoice(clientNames);
      const clientCountry = randomChoice(ALL_COUNTRIES_NAMES);

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
      reviewsCreated++;
    }

    updated++;
    console.log(`✓ [${updated}/${profilesSnapshot.size}] ${fullName} | ${age} ans | Inscrit: ${createdAt.toLocaleDateString('fr-FR')} | ${reviewCount} avis`);

    await new Promise(r => setTimeout(r, 50));
  }

  console.log('\n' + '='.repeat(70));
  console.log(` TERMINÉ!`);
  console.log(` - ${updated} profils mis à jour`);
  console.log(` - ${reviewsDeleted} anciens avis supprimés`);
  console.log(` - ${reviewsCreated} nouveaux avis créés`);
  console.log('='.repeat(70));

  process.exit(0);
}

fixAllAaaProfiles().catch(err => {
  console.error('Erreur:', err);
  process.exit(1);
});
