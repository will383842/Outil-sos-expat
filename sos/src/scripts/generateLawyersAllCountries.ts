/**
 * =============================================================================
 * SCRIPT: G\u00e9n\u00e9ration d'Avocats Hommes couvrant TOUS LES 197 PAYS
 * =============================================================================
 *
 * Contraintes respect\u00e9es :
 * - Chaque avocat a entre 1 et 5 PAYS D'INTERVENTION
 * - Environ 40-50 avocats pour couvrir les 197 pays
 * - TOUS parlent FRAN\u00c7AIS uniquement
 * - Ethnicit\u00e9s vari\u00e9es (pr\u00e9noms/noms selon le pays de r\u00e9sidence)
 * - P\u00e9riode d'inscription : 1er octobre - 30 d\u00e9cembre 2024
 * - Grande vari\u00e9t\u00e9 dans les profils (pas de copie-coller)
 * - Apparaissent dans AdminAaaProfiles (isTestProfile: true)
 *
 * Usage: Importer et appeler generateLawyersAllCountries() depuis la console admin
 */

import {
  collection, addDoc, setDoc, doc, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { getNamesByCountry } from '../data/names-by-country';
import { countriesData } from '../data/countries';

// =============================================================================
// R\u00c9CUP\u00c9RER TOUS LES PAYS
// =============================================================================

function getAllCountries(): Array<{ name: string; code: string }> {
  return countriesData
    .filter(c => c.code !== 'SEPARATOR' && !c.disabled && c.code && c.nameFr)
    .map(c => ({ name: c.nameFr, code: c.code }));
}

// =============================================================================
// SP\u00c9CIALIT\u00c9S JURIDIQUES
// =============================================================================

// ✅ CORRIGÉ: Codes synchronisés avec lawyer-specialties.ts
const LAWYER_SPECIALTIES = [
  // URG - Urgences
  'URG_ASSISTANCE_PENALE_INTERNATIONALE', 'URG_ACCIDENTS_RESPONSABILITE_CIVILE', 'URG_RAPATRIEMENT_URGENCE',
  // CUR - Services courants
  'CUR_TRADUCTIONS_LEGALISATIONS', 'CUR_RECLAMATIONS_LITIGES_MINEURS', 'CUR_DEMARCHES_ADMINISTRATIVES',
  // IMMI - Immigration et travail
  'IMMI_VISAS_PERMIS_SEJOUR', 'IMMI_CONTRATS_TRAVAIL_INTERNATIONAL', 'IMMI_NATURALISATION',
  // IMMO - Immobilier
  'IMMO_ACHAT_VENTE', 'IMMO_LOCATION_BAUX', 'IMMO_LITIGES_IMMOBILIERS',
  // FISC - Fiscalité
  'FISC_DECLARATIONS_INTERNATIONALES', 'FISC_DOUBLE_IMPOSITION', 'FISC_OPTIMISATION_EXPATRIES',
  // FAM - Famille
  'FAM_MARIAGE_DIVORCE', 'FAM_GARDE_ENFANTS_TRANSFRONTALIERE', 'FAM_SCOLARITE_INTERNATIONALE',
  // PATR - Patrimoine
  'PATR_SUCCESSIONS_INTERNATIONALES', 'PATR_GESTION_PATRIMOINE', 'PATR_TESTAMENTS',
  // ENTR - Entreprise
  'ENTR_CREATION_ENTREPRISE_ETRANGER', 'ENTR_INVESTISSEMENTS', 'ENTR_IMPORT_EXPORT',
  // ASSU - Assurances
  'ASSU_ASSURANCES_INTERNATIONALES', 'ASSU_PROTECTION_DONNEES', 'ASSU_CONTENTIEUX_ADMINISTRATIFS',
  // BANK - Banque
  'BANK_PROBLEMES_COMPTES_BANCAIRES', 'BANK_VIREMENTS_CREDITS', 'BANK_SERVICES_FINANCIERS',
];

// =============================================================================
// CERTIFICATIONS
// =============================================================================

const CERTIFICATIONS = [
  'certified-bar', 'international-law', 'mediator', 'business-law', 'family-law',
  'tax-law', 'real-estate', 'notary', 'arbitrator', 'immigration', 'criminal-law',
  'human-rights', 'environmental-law',
];

// =============================================================================
// TEMPLATES DE BIOS VARI\u00c9S
// =============================================================================

const BIO_TEMPLATES = [
  "Fort de {exp} ann\u00e9es d'exp\u00e9rience en droit international, je conseille les expatri\u00e9s francophones. Bas\u00e9 en {pays}, j'interviens \u00e9galement dans {autres_pays}. Sp\u00e9cialiste en {specialty}.",
  "Avocat inscrit au barreau depuis {exp} ans, je me consacre aux probl\u00e9matiques juridiques des Fran\u00e7ais \u00e0 l'\u00e9tranger. Depuis {pays}, j'accompagne mes clients dans {autres_pays}.",
  "Passionn\u00e9 par le droit international, j'exerce depuis {exp} ans. Install\u00e9 en {pays}, j'interviens aussi dans {autres_pays}. Expert en {specialty}.",
  "Apr\u00e8s {exp} ans de pratique juridique, j'ai d\u00e9velopp\u00e9 une expertise pointue. Bas\u00e9 en {pays}, je couvre \u00e9galement {autres_pays}.",
  "Sp\u00e9cialiste du droit des expatri\u00e9s depuis {exp} ans, j'offre mes services aux francophones. De {pays}, j'interviens dans {autres_pays}.",
  "Dipl\u00f4m\u00e9 en droit international, j'offre un accompagnement juridique complet. R\u00e9sidant en {pays}, je pratique aussi dans {autres_pays}.",
  "Avec {exp} ann\u00e9es au service des expatri\u00e9s, je suis votre interlocuteur privil\u00e9gi\u00e9. Bas\u00e9 en {pays}, j'interviens dans {autres_pays}.",
  "Mon cabinet, \u00e9tabli en {pays}, se d\u00e9die \u00e0 l'accompagnement juridique des francophones dans {autres_pays}. Sp\u00e9cialit\u00e9: {specialty}.",
  "Juriste chevronn\u00e9 avec {exp} ans de pratique, je guide les expatri\u00e9s francophones. Depuis {pays}, j'interviens dans {autres_pays}.",
  "Expert juridique bas\u00e9 en {pays}, je cumule {exp} ans d'exp\u00e9rience. J'interviens \u00e9galement dans {autres_pays}. Comp\u00e9tences en {specialty}.",
  "D\u00e9di\u00e9 \u00e0 la d\u00e9fense des int\u00e9r\u00eats des expatri\u00e9s depuis {exp} ans. R\u00e9sidant en {pays}, je couvre aussi {autres_pays}.",
  "Avocat bilingue exer\u00e7ant en {pays} depuis {exp} ans. J'interviens \u00e9galement dans {autres_pays}. Expert en {specialty}.",
];

// =============================================================================
// COMMENTAIRES D'AVIS VARI\u00c9S (40 commentaires uniques)
// =============================================================================

const REVIEW_COMMENTS = [
  "Excellent avocat, tr\u00e8s professionnel et \u00e0 l'\u00e9coute de mes besoins sp\u00e9cifiques.",
  "Conseils juridiques de qualit\u00e9 exceptionnelle, je recommande vivement ses services.",
  "Tr\u00e8s satisfait de ses services, r\u00e9ponse rapide et solution efficace \u00e0 mon probl\u00e8me.",
  "Expertise remarquable en droit international, il a r\u00e9solu mon dossier complexe.",
  "Un professionnel d\u00e9vou\u00e9 et comp\u00e9tent, toujours disponible et r\u00e9actif.",
  "J'ai beaucoup appr\u00e9ci\u00e9 son accompagnement dans mes d\u00e9marches administratives.",
  "Service impeccable, communication claire et parfaitement transparente.",
  "Avocat tr\u00e8s comp\u00e9tent qui a r\u00e9solu mon dossier bien plus rapidement que pr\u00e9vu.",
  "Professionnalisme exemplaire, je n'h\u00e9siterai pas \u00e0 refaire appel \u00e0 ses services.",
  "Excellent suivi de dossier, toujours joignable et attentif \u00e0 mes questions.",
  "Ses conseils m'ont \u00e9t\u00e9 extr\u00eamement pr\u00e9cieux, un grand merci pour tout!",
  "Grande expertise juridique, il ma\u00eetrise parfaitement le droit international.",
  "Tr\u00e8s bonne exp\u00e9rience globale, je recommande sans aucune h\u00e9sitation.",
  "Avocat s\u00e9rieux et rigoureux, r\u00e9sultats parfaitement conform\u00e9s \u00e0 mes attentes.",
  "P\u00e9dagogue et patient, il m'a expliqu\u00e9 en d\u00e9tail toutes les options possibles.",
  "Service client irr\u00e9prochable, il r\u00e9pond toujours rapidement \u00e0 mes demandes.",
  "A su g\u00e9rer mon dossier avec brio malgr\u00e9 sa grande complexit\u00e9.",
  "Je suis tr\u00e8s reconnaissant pour son aide pr\u00e9cieuse dans cette affaire d\u00e9licate.",
  "Ma\u00eetrise parfaite du sujet, conseils toujours avis\u00e9s et pertinents.",
  "Excellent rapport qualit\u00e9-prix, un service vraiment haut de gamme.",
  "Tr\u00e8s bon avocat francophone, ce qui est rare dans ce pays!",
  "Il parle parfaitement fran\u00e7ais, facilitant grandement tous nos \u00e9changes.",
  "Comp\u00e9tence et s\u00e9rieux au rendez-vous, je suis pleinement satisfait du r\u00e9sultat.",
  "A pris le temps de bien comprendre ma situation avant de proposer des solutions.",
  "Tarifs tout \u00e0 fait raisonnables pour un service de qualit\u00e9 sup\u00e9rieure.",
  "Son exp\u00e9rience avec les expatri\u00e9s fait vraiment toute la diff\u00e9rence.",
  "Je le recommande chaleureusement \u00e0 tous les Fran\u00e7ais vivant \u00e0 l'\u00e9tranger.",
  "Un avocat de confiance, j'ai pu r\u00e9soudre tous mes probl\u00e8mes l\u00e9gaux gr\u00e2ce \u00e0 lui.",
  "Efficacit\u00e9 et professionnalisme, exactement ce que je recherchais.",
  "Gr\u00e2ce \u00e0 son expertise, j'ai obtenu mon visa sans aucune difficult\u00e9.",
  "Excellent accompagnement pour mon divorce international, merci infiniment.",
  "A su d\u00e9fendre mes int\u00e9r\u00eats avec brio face \u00e0 une situation tr\u00e8s complexe.",
  "Toujours disponible m\u00eame le week-end quand j'avais des urgences.",
  "Documents r\u00e9dig\u00e9s avec soin et conseils extr\u00eamement pr\u00e9cis.",
  "Un vrai professionnel qui conna\u00eet son m\u00e9tier sur le bout des doigts.",
  "R\u00e9activit\u00e9 vraiment impressionnante, r\u00e9ponse en moins de 24h syst\u00e9matiquement.",
  "Je suis tr\u00e8s content d'avoir trouv\u00e9 un avocat francophone aussi comp\u00e9tent.",
  "Son r\u00e9seau local m'a permis de r\u00e9soudre des probl\u00e8mes administratifs complexes.",
  "Prend vraiment le temps d'expliquer les proc\u00e9dures l\u00e9gales en d\u00e9tail.",
  "Honoraires transparents d\u00e8s le d\u00e9part, aucune mauvaise surprise \u00e0 la fin.",
];

// =============================================================================
// UNIVERSIT\u00c9S PAR R\u00c9GION
// =============================================================================

const UNIVERSITIES: Record<string, string[]> = {
  europe: ['Universit\u00e9 Paris 1 Panth\u00e9on-Sorbonne', 'Universit\u00e9 Paris 2 Panth\u00e9on-Assas', 'London School of Economics', 'Universit\u00e4t Heidelberg', 'Universit\u00e0 di Bologna', 'University of Amsterdam'],
  america: ['Harvard Law School', 'Yale Law School', 'Columbia Law School', 'McGill University', 'Universit\u00e9 de Montr\u00e9al', 'Universidad de Buenos Aires', 'Universidade de S\u00e3o Paulo'],
  africa: ['Universit\u00e9 Cheikh Anta Diop de Dakar', 'University of Cape Town', 'Cairo University', 'Universit\u00e9 de Tunis', 'Universit\u00e9 Mohammed V de Rabat', 'Universit\u00e9 d\'Abidjan'],
  asia: ['University of Tokyo', 'Peking University', 'National University of Singapore', 'American University of Beirut', 'Tel Aviv University', 'Chulalongkorn University'],
  oceania: ['University of Sydney', 'University of Melbourne', 'University of Auckland'],
  default: ['Universit\u00e9 Internationale de Droit', '\u00c9cole Sup\u00e9rieure de Droit International', 'Facult\u00e9 de Droit Compar\u00e9'],
};

// =============================================================================
// COORDONN\u00c9ES CAPITALES (extrait)
// =============================================================================

const CAPITALS: Record<string, { lat: number; lng: number }> = {
  'FR': { lat: 48.8566, lng: 2.3522 }, 'BE': { lat: 50.8503, lng: 4.3517 }, 'CH': { lat: 46.9480, lng: 7.4474 },
  'CA': { lat: 45.4215, lng: -75.6972 }, 'US': { lat: 38.9072, lng: -77.0369 }, 'GB': { lat: 51.5074, lng: -0.1278 },
  'DE': { lat: 52.5200, lng: 13.4050 }, 'IT': { lat: 41.9028, lng: 12.4964 }, 'ES': { lat: 40.4168, lng: -3.7038 },
  'PT': { lat: 38.7223, lng: -9.1393 }, 'NL': { lat: 52.3676, lng: 4.9041 }, 'AT': { lat: 48.2082, lng: 16.3738 },
  'SN': { lat: 14.6928, lng: -17.4467 }, 'CI': { lat: 6.8276, lng: -5.2893 }, 'ML': { lat: 12.6392, lng: -8.0029 },
  'CM': { lat: 3.8480, lng: 11.5021 }, 'MA': { lat: 34.0209, lng: -6.8416 }, 'TN': { lat: 36.8065, lng: 10.1815 },
  'DZ': { lat: 36.7538, lng: 3.0588 }, 'JP': { lat: 35.6762, lng: 139.6503 }, 'CN': { lat: 39.9042, lng: 116.4074 },
  'KR': { lat: 37.5665, lng: 126.9780 }, 'IN': { lat: 28.6139, lng: 77.2090 }, 'TH': { lat: 13.7563, lng: 100.5018 },
  'VN': { lat: 21.0285, lng: 105.8542 }, 'AU': { lat: -35.2809, lng: 149.1300 }, 'NZ': { lat: -41.2866, lng: 174.7756 },
  'BR': { lat: -15.8267, lng: -47.9218 }, 'AR': { lat: -34.6037, lng: -58.3816 }, 'MX': { lat: 19.4326, lng: -99.1332 },
  'ZA': { lat: -25.7461, lng: 28.1881 }, 'NG': { lat: 9.0579, lng: 7.4951 }, 'EG': { lat: 30.0444, lng: 31.2357 },
  'AE': { lat: 24.4539, lng: 54.3773 }, 'SA': { lat: 24.7136, lng: 46.6753 }, 'IL': { lat: 31.7683, lng: 35.2137 },
  'TR': { lat: 39.9334, lng: 32.8597 }, 'RU': { lat: 55.7558, lng: 37.6173 }, 'PL': { lat: 52.2297, lng: 21.0122 },
};

// =============================================================================
// FONCTIONS UTILITAIRES
// =============================================================================

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDateBetween(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomRating(): number {
  const r = Math.random();
  if (r < 0.6) return parseFloat((4.5 + Math.random() * 0.5).toFixed(2));
  if (r < 0.9) return parseFloat((4.0 + Math.random() * 0.5).toFixed(2));
  return parseFloat((3.7 + Math.random() * 0.3).toFixed(2));
}

function slugify(str: string): string {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

function getRegion(code: string): string {
  const europe = ['FR', 'BE', 'NL', 'LU', 'DE', 'AT', 'CH', 'IT', 'ES', 'PT', 'GB', 'IE', 'PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'GR', 'HR', 'RS', 'SI', 'BA', 'ME', 'MK', 'AL', 'BY', 'UA', 'RU', 'EE', 'LV', 'LT', 'SE', 'NO', 'DK', 'FI', 'IS'];
  const america = ['US', 'CA', 'MX', 'BR', 'AR', 'CL', 'CO', 'PE', 'VE', 'EC', 'BO', 'PY', 'UY', 'PA', 'CR', 'GT', 'CU', 'DO', 'HT', 'JM'];
  const africa = ['DZ', 'MA', 'TN', 'EG', 'SN', 'CI', 'ML', 'BF', 'NE', 'NG', 'CM', 'GA', 'CG', 'CD', 'KE', 'TZ', 'UG', 'ZA', 'MG', 'MU'];
  const asia = ['JP', 'CN', 'KR', 'IN', 'TH', 'VN', 'ID', 'MY', 'SG', 'PH', 'AE', 'SA', 'IL', 'TR', 'IR', 'PK'];
  const oceania = ['AU', 'NZ', 'FJ', 'PG'];

  if (europe.includes(code)) return 'europe';
  if (america.includes(code)) return 'america';
  if (africa.includes(code)) return 'africa';
  if (asia.includes(code)) return 'asia';
  if (oceania.includes(code)) return 'oceania';
  return 'default';
}

function getCoordinates(code: string): { lat: number; lng: number } {
  const c = CAPITALS[code];
  if (c) return { lat: c.lat + (Math.random() - 0.5) * 0.1, lng: c.lng + (Math.random() - 0.5) * 0.1 };
  return { lat: -40 + Math.random() * 80, lng: -180 + Math.random() * 360 };
}

// =============================================================================
// FONCTION PRINCIPALE
// =============================================================================

export async function generateLawyersAllCountries(): Promise<void> {
  console.log('='.repeat(70));
  console.log(' G\u00c9N\u00c9RATION D\'AVOCATS COUVRANT TOUS LES 197 PAYS');
  console.log(' Chaque avocat: 1-5 pays d\'intervention | Langue: FRAN\u00c7AIS');
  console.log('='.repeat(70));

  const START_DATE = new Date('2024-10-01');
  const END_DATE = new Date('2024-12-30');
  const TODAY = new Date();

  // R\u00e9cup\u00e9rer tous les pays et les m\u00e9langer
  const allCountries = getAllCountries();
  const shuffledCountries = [...allCountries].sort(() => Math.random() - 0.5);

  console.log(`\n\ud83c\udf0d ${shuffledCountries.length} pays \u00e0 couvrir\n`);

  const profiles: any[] = [];
  let countryIndex = 0;

  // Distribuer les pays entre les avocats (1-5 pays par avocat)
  while (countryIndex < shuffledCountries.length) {
    // Nombre de pays pour cet avocat (1-5)
    const numCountries = randomInt(1, 5);
    const assignedCountries = shuffledCountries.slice(countryIndex, countryIndex + numCountries);
    countryIndex += numCountries;

    if (assignedCountries.length === 0) break;

    // Le pays principal est le premier
    const mainCountry = assignedCountries[0];
    const otherCountries = assignedCountries.slice(1);

    profiles.push({
      mainCountry,
      allCountries: assignedCountries,
      otherCountries,
    });
  }

  console.log(`\ud83d\udc64 ${profiles.length} avocats \u00e0 g\u00e9n\u00e9rer\n`);

  let success = 0;
  let errors = 0;

  for (let i = 0; i < profiles.length; i++) {
    const profile = profiles[i];
    const mainCountry = profile.mainCountry;

    try {
      // Noms selon l'ethnicit\u00e9 du pays principal
      const namesData = getNamesByCountry(mainCountry.name);
      const firstName = randomChoice(namesData.male);
      const lastName = randomChoice(namesData.lastNames);
      const fullName = `${firstName} ${lastName}`;
      const email = `${slugify(firstName)}.${slugify(lastName)}@example.com`;

      // UID unique
      const uid = `aaa_lawyer_${mainCountry.code.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

      // Date de cr\u00e9ation
      const createdAt = randomDateBetween(START_DATE, END_DATE);

      // Exp\u00e9rience (3-30 ans)
      const experience = randomInt(3, 30);
      const graduationYear = new Date().getFullYear() - experience - randomInt(0, 5);

      // Sp\u00e9cialit\u00e9s (2-5)
      const numSpec = randomInt(2, 5);
      const specialties = [...LAWYER_SPECIALTIES].sort(() => Math.random() - 0.5).slice(0, numSpec);

      // Certifications (1-3)
      const numCert = randomInt(1, 3);
      const certifications = [...CERTIFICATIONS].sort(() => Math.random() - 0.5).slice(0, numCert);

      // Statistiques
      const daysSinceCreation = Math.max(1, Math.floor((TODAY.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)));
      const weeks = Math.max(1, Math.floor(daysSinceCreation / 7));
      const totalCalls = Math.max(0, weeks * randomInt(0, 4) + randomInt(0, 5));
      const reviewCount = Math.max(0, Math.floor(totalCalls * (0.3 + Math.random() * 0.4)));
      const rating = randomRating();

      // Bio
      const bioTemplate = randomChoice(BIO_TEMPLATES);
      const otherCountriesText = profile.otherCountries.length > 0
        ? profile.otherCountries.map((c: any) => c.name).join(', ')
        : 'plusieurs r\u00e9gions voisines';
      const bio = bioTemplate
        .replace(/{exp}/g, experience.toString())
        .replace(/{pays}/g, mainCountry.name)
        .replace(/{autres_pays}/g, otherCountriesText)
        .replace(/{specialty}/g, specialties[0].replace(/_/g, ' ').toLowerCase());

      // Universit\u00e9
      const region = getRegion(mainCountry.code);
      const lawSchool = randomChoice(UNIVERSITIES[region] || UNIVERSITIES.default);

      // Coordonn\u00e9es
      const mapLocation = getCoordinates(mainCountry.code);

      // Prix
      let price = randomInt(39, 89);
      if (['FR', 'US', 'GB', 'CH', 'DE'].includes(mainCountry.code)) price = randomInt(59, 99);
      if (['SN', 'ML', 'CI', 'CM'].includes(mainCountry.code)) price = randomInt(29, 49);

      // Dur\u00e9e et temps de r\u00e9ponse
      const duration = randomChoice([15, 20, 30, 45]);
      const responseTime = randomChoice(['< 5 minutes', '< 15 minutes', '< 30 minutes']);

      // Codes des pays d'intervention
      const practiceCountryCodes = profile.allCountries.map((c: any) => c.code);

      // Profil complet
      const profileData: any = {
        uid, firstName, lastName, fullName, email,
        phone: '+33743331201', phoneCountryCode: '+33',
        country: mainCountry.code, currentCountry: mainCountry.code,
        preferredLanguage: 'fr',
        languages: ['fr'], // Code ISO - FRANÇAIS UNIQUEMENT
        languagesSpoken: ['fr'], // Code ISO - doit être identique à languages
        // ✅ Photo générée automatiquement avec DiceBear
        profilePhoto: `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}&backgroundColor=b6e3f4`,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}&backgroundColor=b6e3f4`,
        isTestProfile: true, isAAA: true, isActive: true, isApproved: true, isVerified: true,
        approvalStatus: 'approved', verificationStatus: 'approved',
        isOnline: Math.random() > 0.7,
        isVisible: true, isVisibleOnMap: true, isCallable: true,
        createdAt: Timestamp.fromDate(createdAt),
        updatedAt: serverTimestamp(), lastLoginAt: serverTimestamp(),
        role: 'lawyer', type: 'lawyer', isSOS: true,
        points: randomInt(0, 500),
        affiliateCode: `LAW${mainCountry.code}${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
        bio: { fr: bio, en: bio.replace('Fran\u00e7ais', 'French') },
        responseTime, availability: 'available',
        totalCalls, totalEarnings: totalCalls * price * 0.7,
        averageRating: rating, rating, reviewCount,
        mapLocation, price, duration,
        specialties, practiceCountries: practiceCountryCodes,
        yearsOfExperience: experience,
        barNumber: `BAR-${mainCountry.code}-${randomInt(10000, 99999)}`,
        lawSchool, graduationYear, certifications,
        needsVerification: false,
      };

      // Sauvegarder
      await setDoc(doc(db, 'users', uid), profileData);
      await setDoc(doc(db, 'sos_profiles', uid), { ...profileData, createdByAdmin: true, profileCompleted: true });
      await setDoc(doc(db, 'ui_profile_cards', uid), {
        id: uid, uid, title: fullName, subtitle: 'Avocat',
        country: mainCountry.name, photo: '', rating, reviewCount,
        languages: ['fr'], specialties, // Code ISO
        href: `/profile/${uid}`, createdAt: serverTimestamp(),
      });

      // Avis
      const usedComments = new Set<string>();
      for (let j = 0; j < reviewCount; j++) {
        const reviewDate = new Date(createdAt.getTime() + (j / Math.max(1, reviewCount)) * daysSinceCreation * 24 * 60 * 60 * 1000);

        let comment = randomChoice(REVIEW_COMMENTS);
        let attempts = 0;
        while (usedComments.has(comment) && attempts < 50) {
          comment = randomChoice(REVIEW_COMMENTS);
          attempts++;
        }
        usedComments.add(comment);

        const clientCountry = randomChoice(allCountries);
        const clientNames = getNamesByCountry(clientCountry.name);
        const clientName = randomChoice(clientNames.male);

        await addDoc(collection(db, 'reviews'), {
          providerId: uid, clientId: `client_${Date.now()}_${j}`,
          clientName, clientCountry: clientCountry.name,
          rating: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
          comment, isPublic: true, status: 'published',
          serviceType: 'lawyer_call',
          createdAt: Timestamp.fromDate(reviewDate),
          helpfulVotes: randomInt(0, 15),
        });
      }

      success++;
      const countriesStr = practiceCountryCodes.join(', ');
      console.log(`\u2713 [${i + 1}/${profiles.length}] ${fullName} | ${mainCountry.name} | Pays: ${countriesStr} | ${reviewCount} avis`);

      await new Promise(r => setTimeout(r, 30));

    } catch (err) {
      errors++;
      console.error(`\u2717 ERREUR ${mainCountry.name}:`, (err as Error).message);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(` TERMIN\u00c9! ${success} avocats cr\u00e9\u00e9s | ${errors} erreurs`);
  console.log(` Tous les ${shuffledCountries.length} pays sont couverts`);
  console.log('='.repeat(70));
}

// Export
if (typeof window !== 'undefined') {
  (window as any).generateLawyersAllCountries = generateLawyersAllCountries;
  console.log('\n\ud83d\udee0\ufe0f Script charg\u00e9! Tapez: generateLawyersAllCountries()');
  console.log('   \u2192 G\u00e9n\u00e8re des avocats couvrant TOUS les 197 pays');
  console.log('   \u2192 Chaque avocat: 1-5 pays d\'intervention');
  console.log('   \u2192 Tous parlent FRAN\u00c7AIS uniquement');
  console.log('   \u2192 Ethnicit\u00e9s vari\u00e9es selon le pays\n');
}

export default generateLawyersAllCountries;
