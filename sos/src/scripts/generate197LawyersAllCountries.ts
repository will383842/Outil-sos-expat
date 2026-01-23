/**
 * =============================================================================
 * SCRIPT: G\u00e9n\u00e9ration de 197 Avocats Hommes - TOUS LES PAYS
 * =============================================================================
 *
 * Contraintes respect\u00e9es :
 * - 197 profils d'avocats HOMMES (un par pays)
 * - TOUS parlent FRAN\u00c7AIS uniquement
 * - Ethnicit\u00e9s vari\u00e9es (pr\u00e9noms/noms selon le pays d'origine)
 * - P\u00e9riode d'inscription : 1er octobre - 30 d\u00e9cembre 2024
 * - Chaque profil a un pays d'intervention UNIQUE
 * - Grande vari\u00e9t\u00e9 dans les profils (pas de copie-coller)
 * - Apparaissent dans AdminAaaProfiles (isTestProfile: true)
 *
 * Usage: Importer et appeler generate197Lawyers() depuis la console admin
 */

import {
  collection, addDoc, setDoc, doc, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { getNamesByCountry } from '../data/names-by-country';
import { countriesData } from '../data/countries';

// =============================================================================
// CONFIGURATION DES 197 PAYS
// =============================================================================

// Extraire tous les pays valides de countriesData
function getAllCountries(): Array<{ name: string; code: string }> {
  return countriesData
    .filter(c => c.code !== 'SEPARATOR' && !c.disabled && c.code && c.nameFr)
    .map(c => ({ name: c.nameFr, code: c.code }));
}

// =============================================================================
// SP\u00c9CIALIT\u00c9S JURIDIQUES VARI\u00c9ES
// =============================================================================

const LAWYER_SPECIALTIES_POOL = [
  // ✅ CORRIGÉ: Codes synchronisés avec lawyer-specialties.ts (58 codes valides)
  // URG - Urgences (3)
  'URG_ASSISTANCE_PENALE_INTERNATIONALE', 'URG_ACCIDENTS_RESPONSABILITE_CIVILE', 'URG_RAPATRIEMENT_URGENCE',
  // CUR - Services courants (3)
  'CUR_TRADUCTIONS_LEGALISATIONS', 'CUR_RECLAMATIONS_LITIGES_MINEURS', 'CUR_DEMARCHES_ADMINISTRATIVES',
  // IMMI - Immigration et travail (3)
  'IMMI_VISAS_PERMIS_SEJOUR', 'IMMI_CONTRATS_TRAVAIL_INTERNATIONAL', 'IMMI_NATURALISATION',
  // IMMO - Immobilier (3)
  'IMMO_ACHAT_VENTE', 'IMMO_LOCATION_BAUX', 'IMMO_LITIGES_IMMOBILIERS',
  // FISC - Fiscalité (3)
  'FISC_DECLARATIONS_INTERNATIONALES', 'FISC_DOUBLE_IMPOSITION', 'FISC_OPTIMISATION_EXPATRIES',
  // FAM - Famille (3)
  'FAM_MARIAGE_DIVORCE', 'FAM_GARDE_ENFANTS_TRANSFRONTALIERE', 'FAM_SCOLARITE_INTERNATIONALE',
  // PATR - Patrimoine (3)
  'PATR_SUCCESSIONS_INTERNATIONALES', 'PATR_GESTION_PATRIMOINE', 'PATR_TESTAMENTS',
  // ENTR - Entreprise (3)
  'ENTR_CREATION_ENTREPRISE_ETRANGER', 'ENTR_INVESTISSEMENTS', 'ENTR_IMPORT_EXPORT',
  // ASSU - Assurances et protection (3)
  'ASSU_ASSURANCES_INTERNATIONALES', 'ASSU_PROTECTION_DONNEES', 'ASSU_CONTENTIEUX_ADMINISTRATIFS',
  // CONS - Consommation et services (3)
  'CONS_ACHATS_DEFECTUEUX_ETRANGER', 'CONS_SERVICES_NON_CONFORMES', 'CONS_ECOMMERCE_INTERNATIONAL',
  // BANK - Banque et finance (3)
  'BANK_PROBLEMES_COMPTES_BANCAIRES', 'BANK_VIREMENTS_CREDITS', 'BANK_SERVICES_FINANCIERS',
  // ARGT - Problèmes d'argent (5)
  'ARGT_RETARDS_SALAIRE_IMPAYES', 'ARGT_ARNAQUES_ESCROQUERIES', 'ARGT_SURENDETTEMENT_PLANS',
  'ARGT_FRAIS_BANCAIRES_ABUSIFS', 'ARGT_LITIGES_ETABLISSEMENTS_CREDIT',
  // RELA - Problèmes relationnels (5)
  'RELA_CONFLITS_VOISINAGE', 'RELA_CONFLITS_TRAVAIL', 'RELA_CONFLITS_FAMILIAUX',
  'RELA_MEDIATION_RESOLUTION_AMIABLE', 'RELA_DIFFAMATION_REPUTATION',
  // TRAN - Transport (3)
  'TRAN_PROBLEMES_AERIENS', 'TRAN_BAGAGES_PERDUS_ENDOMMAGES', 'TRAN_ACCIDENTS_TRANSPORT',
  // SANT - Santé (3)
  'SANT_ERREURS_MEDICALES', 'SANT_REMBOURSEMENTS_SOINS', 'SANT_DROIT_MEDICAL',
  // NUM - Numérique (3)
  'NUM_CYBERCRIMINALITE', 'NUM_CONTRATS_EN_LIGNE', 'NUM_PROTECTION_NUMERIQUE',
  // VIO - Violences et discriminations (3)
  'VIO_HARCELEMENT', 'VIO_VIOLENCES_DOMESTIQUES', 'VIO_DISCRIMINATIONS',
  // IP - Propriété intellectuelle (3)
  'IP_CONTREFACONS', 'IP_BREVETS_MARQUES', 'IP_DROITS_AUTEUR',
  // ENV - Environnement (3)
  'ENV_NUISANCES', 'ENV_PERMIS_CONSTRUIRE', 'ENV_DROIT_URBANISME',
  // RET - Retour en France (2)
  'RET_RAPATRIEMENT_BIENS', 'RET_REINTEGRATION_FISCALE_SOCIALE',
  // OTH - Autre (1)
  'OTH_PRECISER_BESOIN',
];

// =============================================================================
// CERTIFICATIONS VARI\u00c9ES
// =============================================================================

const CERTIFICATIONS_POOL = [
  'certified-bar',
  'international-law',
  'mediator',
  'business-law',
  'family-law',
  'tax-law',
  'real-estate',
  'notary',
  'arbitrator',
  'immigration',
  'criminal-law',
  'human-rights',
  'environmental-law',
  'maritime-law',
  'aviation-law',
  'sports-law',
  'medical-law',
  'cyber-law',
];

// =============================================================================
// TEMPLATES DE BIOS VARI\u00c9S
// =============================================================================

const BIO_TEMPLATES_FR = [
  "Fort de {experience} ann\u00e9es d'exp\u00e9rience en droit international, je conseille et accompagne les expatri\u00e9s francophones dans toutes leurs d\u00e9marches juridiques en {country}. Ma sp\u00e9cialisation en {specialty} me permet d'apporter des solutions adapt\u00e9es \u00e0 chaque situation.",
  "Avocat inscrit au barreau depuis {experience} ans, je me consacre exclusivement aux probl\u00e9matiques juridiques des Fran\u00e7ais install\u00e9s en {country}. Mon expertise couvre notamment {specialty}.",
  "Passionn\u00e9 par le droit international, j'exerce depuis {experience} ans en {country} o\u00f9 j'accompagne une client\u00e8le francophone exigeante. Je suis reconnu pour mon expertise en {specialty}.",
  "Apr\u00e8s {experience} ans de pratique juridique, j'ai d\u00e9velopp\u00e9 une expertise pointue en {specialty}. J'assiste les expatri\u00e9s francophones en {country} avec rigueur et d\u00e9vouement.",
  "Sp\u00e9cialiste du droit des expatri\u00e9s depuis {experience} ans, je propose mes services aux francophones r\u00e9sidant en {country}. Mon domaine d'expertise principal est {specialty}.",
  "Dipl\u00f4m\u00e9 en droit international et install\u00e9 en {country} depuis {experience} ans, j'offre un accompagnement juridique complet aux expatri\u00e9s francophones, particuli\u00e8rement en {specialty}.",
  "Avec {experience} ann\u00e9es d'exp\u00e9rience au service des expatri\u00e9s, je suis votre interlocuteur privil\u00e9gi\u00e9 pour toute question juridique en {country}. Expert en {specialty}.",
  "Mon cabinet, \u00e9tabli en {country} depuis {experience} ans, se d\u00e9die \u00e0 l'accompagnement juridique des francophones. Ma sp\u00e9cialit\u00e9 : {specialty}.",
  "Juriste chevronn\u00e9 avec {experience} ans de pratique, je guide les expatri\u00e9s francophones \u00e0 travers les complexit\u00e9s l\u00e9gales de {country}. Expertise en {specialty}.",
  "Avocat bilingue exer\u00e7ant en {country} depuis {experience} ans, je mets mon expertise en {specialty} au service de la communaut\u00e9 francophone.",
  "D\u00e9di\u00e9 \u00e0 la d\u00e9fense des int\u00e9r\u00eats des expatri\u00e9s depuis {experience} ans, j'interviens en {country} sur des dossiers complexes de {specialty}.",
  "Expert juridique reconnu en {country}, je cumule {experience} ans d'exp\u00e9rience au service des francophones. Comp\u00e9tences approfondies en {specialty}.",
];

const BIO_TEMPLATES_EN = [
  "With {experience} years of experience in international law, I advise and assist French-speaking expatriates with all their legal matters in {country}. My specialization in {specialty} allows me to provide tailored solutions.",
  "A licensed attorney for {experience} years, I focus exclusively on legal issues for French citizens living in {country}. My expertise includes {specialty}.",
  "Passionate about international law, I have been practicing for {experience} years in {country}, serving a demanding French-speaking clientele. I am recognized for my expertise in {specialty}.",
  "After {experience} years of legal practice, I have developed sharp expertise in {specialty}. I assist French-speaking expatriates in {country} with rigor and dedication.",
  "Specialist in expatriate law for {experience} years, I offer my services to French speakers residing in {country}. My main area of expertise is {specialty}.",
  "Graduate in international law and established in {country} for {experience} years, I provide comprehensive legal support to French-speaking expatriates, particularly in {specialty}.",
];

// =============================================================================
// COMMENTAIRES D'AVIS VARI\u00c9S
// =============================================================================

const REVIEW_COMMENTS = [
  "Excellent avocat, tr\u00e8s professionnel et \u00e0 l'\u00e9coute de mes besoins.",
  "Conseils juridiques de qualit\u00e9 exceptionnelle, je recommande vivement.",
  "Tr\u00e8s satisfait de ses services, r\u00e9ponse rapide et solution efficace.",
  "Expertise remarquable en droit international, a r\u00e9solu mon probl\u00e8me.",
  "Un professionnel d\u00e9vou\u00e9 et comp\u00e9tent, disponible et r\u00e9actif.",
  "J'ai beaucoup appr\u00e9ci\u00e9 son accompagnement dans mes d\u00e9marches complexes.",
  "Service impeccable, communication claire et transparente.",
  "Avocat tr\u00e8s comp\u00e9tent qui a r\u00e9solu mon dossier rapidement.",
  "Professionnalisme exemplaire, je n'h\u00e9siterai pas \u00e0 refaire appel \u00e0 lui.",
  "Excellent suivi de dossier, toujours joignable et \u00e0 l'\u00e9coute.",
  "Ses conseils m'ont \u00e9t\u00e9 pr\u00e9cieux, merci pour tout!",
  "Grande expertise, il conna\u00eet parfaitement le droit international.",
  "Tr\u00e8s bonne exp\u00e9rience, je recommande sans h\u00e9sitation.",
  "Avocat s\u00e9rieux et rigoureux, r\u00e9sultats conform\u00e9ment \u00e0 mes attentes.",
  "P\u00e9dagogue et patient, il m'a expliqu\u00e9 toutes les options.",
  "Service client irr\u00e9prochable, toujours disponible pour r\u00e9pondre.",
  "A su g\u00e9rer mon dossier avec professionnalisme malgr\u00e9 la complexit\u00e9.",
  "Je suis reconnaissant pour son aide pr\u00e9cieuse dans cette affaire.",
  "Ma\u00eetrise parfaite du sujet, conseils avis\u00e9s et pertinents.",
  "Rapport qualit\u00e9-prix excellent, service haut de gamme.",
  "Tr\u00e8s bon avocat francophone, rare dans ce pays!",
  "Il parle parfaitement fran\u00e7ais, ce qui facilite grandement les \u00e9changes.",
  "Comp\u00e9tence et s\u00e9rieux au rendez-vous, je suis pleinement satisfait.",
  "A pris le temps de bien comprendre ma situation avant d'agir.",
  "Tarifs raisonnables pour un service de qualit\u00e9 sup\u00e9rieure.",
  "Son exp\u00e9rience avec les expatri\u00e9s fait vraiment la diff\u00e9rence.",
  "Je le recommande \u00e0 tous les Fran\u00e7ais vivant dans ce pays.",
  "Avocat de confiance, j'ai pu r\u00e9soudre tous mes probl\u00e8mes l\u00e9gaux.",
  "Efficacit\u00e9 et professionnalisme, exactement ce que je cherchais.",
  "Gr\u00e2ce \u00e0 lui, j'ai pu obtenir mon visa sans difficult\u00e9.",
  "Excellent accompagnement pour mon divorce international.",
  "A su d\u00e9fendre mes int\u00e9r\u00eats avec brio face \u00e0 une situation complexe.",
  "Toujours disponible m\u00eame le week-end en cas d'urgence.",
  "Conseils pr\u00e9cis et documents r\u00e9dig\u00e9s avec soin.",
  "Un vrai professionnel qui conna\u00eet son m\u00e9tier sur le bout des doigts.",
  "R\u00e9activit\u00e9 impressionnante, r\u00e9ponse en moins de 24h.",
  "Je suis tr\u00e8s content d'avoir trouv\u00e9 un avocat francophone comp\u00e9tent.",
  "Son r\u00e9seau local m'a permis de r\u00e9soudre des probl\u00e8mes administratifs.",
  "Prend vraiment le temps d'expliquer les proc\u00e9dures en d\u00e9tail.",
  "Honoraires transparents, pas de mauvaise surprise \u00e0 la fin.",
];

// =============================================================================
// UNIVERSIT\u00c9S PAR R\u00c9GION
// =============================================================================

const UNIVERSITIES_BY_REGION: Record<string, string[]> = {
  'europe_west': [
    'Universit\u00e9 Paris 1 Panth\u00e9on-Sorbonne',
    'Universit\u00e9 Paris 2 Panth\u00e9on-Assas',
    'London School of Economics',
    'Universit\u00e4t Heidelberg',
    'Universit\u00e0 di Bologna',
  ],
  'europe_east': [
    'Charles University Prague',
    'University of Warsaw',
    'Lomonosov Moscow State University',
    'University of Belgrade',
    'Jagiellonian University',
  ],
  'north_america': [
    'Harvard Law School',
    'Yale Law School',
    'McGill University',
    'Universit\u00e9 de Montr\u00e9al',
    'Columbia Law School',
  ],
  'latin_america': [
    'Universidad de Buenos Aires',
    'Universidad Nacional Aut\u00f3noma de M\u00e9xico',
    'Universidade de S\u00e3o Paulo',
    'Pontificia Universidad Cat\u00f3lica de Chile',
    'Universidad de los Andes',
  ],
  'africa': [
    'Universit\u00e9 Cheikh Anta Diop de Dakar',
    'University of Cape Town',
    'Cairo University',
    'Universit\u00e9 de Tunis',
    'Universit\u00e9 Mohammed V de Rabat',
  ],
  'middle_east': [
    'American University of Beirut',
    'Tel Aviv University',
    'King Saud University',
    'Qatar University',
    'American University in Cairo',
  ],
  'asia_east': [
    'University of Tokyo',
    'Peking University',
    'National University of Singapore',
    'Seoul National University',
    'Hong Kong University',
  ],
  'asia_south': [
    'National Law School of India',
    'University of Dhaka',
    'University of Colombo',
    'Tribhuvan University',
    'Lahore University',
  ],
  'asia_southeast': [
    'Chulalongkorn University',
    'University of Malaya',
    'Vietnam National University',
    'Universitas Indonesia',
    'University of the Philippines',
  ],
  'oceania': [
    'University of Sydney',
    'University of Melbourne',
    'University of Auckland',
    'Australian National University',
    'University of Queensland',
  ],
  'default': [
    'Universit\u00e9 Internationale de Droit',
    '\u00c9cole Sup\u00e9rieure de Droit International',
    'Institut de Droit Compar\u00e9',
    'Facult\u00e9 de Droit International',
    'Acad\u00e9mie de Droit des Affaires',
  ],
};

// =============================================================================
// COORDONN\u00c9ES GPS PAR PAYS (capitales)
// =============================================================================

const CAPITAL_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'AF': { lat: 34.5553, lng: 69.2075 }, // Kabul
  'AL': { lat: 41.3275, lng: 19.8187 }, // Tirana
  'DZ': { lat: 36.7538, lng: 3.0588 }, // Alger
  'AD': { lat: 42.5063, lng: 1.5218 }, // Andorre
  'AO': { lat: -8.8390, lng: 13.2894 }, // Luanda
  'AR': { lat: -34.6037, lng: -58.3816 }, // Buenos Aires
  'AM': { lat: 40.1792, lng: 44.4991 }, // Erevan
  'AU': { lat: -35.2809, lng: 149.1300 }, // Canberra
  'AT': { lat: 48.2082, lng: 16.3738 }, // Vienne
  'AZ': { lat: 40.4093, lng: 49.8671 }, // Bakou
  'BS': { lat: 25.0343, lng: -77.3963 }, // Nassau
  'BH': { lat: 26.2285, lng: 50.5860 }, // Manama
  'BD': { lat: 23.8103, lng: 90.4125 }, // Dhaka
  'BB': { lat: 13.1132, lng: -59.5988 }, // Bridgetown
  'BY': { lat: 53.9006, lng: 27.5590 }, // Minsk
  'BE': { lat: 50.8503, lng: 4.3517 }, // Bruxelles
  'BZ': { lat: 17.2510, lng: -88.7590 }, // Belmopan
  'BJ': { lat: 6.4969, lng: 2.6283 }, // Porto-Novo
  'BT': { lat: 27.4728, lng: 89.6390 }, // Thimphou
  'BO': { lat: -16.4897, lng: -68.1193 }, // La Paz
  'BA': { lat: 43.8563, lng: 18.4131 }, // Sarajevo
  'BW': { lat: -24.6282, lng: 25.9231 }, // Gaborone
  'BR': { lat: -15.8267, lng: -47.9218 }, // Brasilia
  'BN': { lat: 4.9031, lng: 114.9398 }, // Bandar Seri Begawan
  'BG': { lat: 42.6977, lng: 23.3219 }, // Sofia
  'BF': { lat: 12.3714, lng: -1.5197 }, // Ouagadougou
  'BI': { lat: -3.3731, lng: 29.3644 }, // Bujumbura
  'KH': { lat: 11.5564, lng: 104.9282 }, // Phnom Penh
  'CM': { lat: 3.8480, lng: 11.5021 }, // Yaound\u00e9
  'CA': { lat: 45.4215, lng: -75.6972 }, // Ottawa
  'CV': { lat: 14.9315, lng: -23.5087 }, // Praia
  'CF': { lat: 4.3947, lng: 18.5582 }, // Bangui
  'TD': { lat: 12.1348, lng: 15.0557 }, // N'Djamena
  'CL': { lat: -33.4489, lng: -70.6693 }, // Santiago
  'CN': { lat: 39.9042, lng: 116.4074 }, // P\u00e9kin
  'CO': { lat: 4.7110, lng: -74.0721 }, // Bogota
  'KM': { lat: -11.7022, lng: 43.2551 }, // Moroni
  'CG': { lat: -4.2634, lng: 15.2429 }, // Brazzaville
  'CD': { lat: -4.4419, lng: 15.2663 }, // Kinshasa
  'CR': { lat: 9.9281, lng: -84.0907 }, // San Jos\u00e9
  'CI': { lat: 6.8276, lng: -5.2893 }, // Yamoussoukro
  'HR': { lat: 45.8150, lng: 15.9819 }, // Zagreb
  'CU': { lat: 23.1136, lng: -82.3666 }, // La Havane
  'CY': { lat: 35.1856, lng: 33.3823 }, // Nicosie
  'CZ': { lat: 50.0755, lng: 14.4378 }, // Prague
  'DK': { lat: 55.6761, lng: 12.5683 }, // Copenhague
  'DJ': { lat: 11.5886, lng: 43.1456 }, // Djibouti
  'DM': { lat: 15.3017, lng: -61.3881 }, // Roseau
  'DO': { lat: 18.4861, lng: -69.9312 }, // Saint-Domingue
  'EC': { lat: -0.1807, lng: -78.4678 }, // Quito
  'EG': { lat: 30.0444, lng: 31.2357 }, // Le Caire
  'SV': { lat: 13.6929, lng: -89.2182 }, // San Salvador
  'GQ': { lat: 3.7504, lng: 8.7371 }, // Malabo
  'ER': { lat: 15.3229, lng: 38.9251 }, // Asmara
  'EE': { lat: 59.4370, lng: 24.7536 }, // Tallinn
  'SZ': { lat: -26.3054, lng: 31.1367 }, // Mbabane
  'ET': { lat: 9.0320, lng: 38.7469 }, // Addis-Abeba
  'FJ': { lat: -18.1416, lng: 178.4419 }, // Suva
  'FI': { lat: 60.1699, lng: 24.9384 }, // Helsinki
  'FR': { lat: 48.8566, lng: 2.3522 }, // Paris
  'GA': { lat: 0.4162, lng: 9.4673 }, // Libreville
  'GM': { lat: 13.4549, lng: -16.5790 }, // Banjul
  'GE': { lat: 41.7151, lng: 44.8271 }, // Tbilissi
  'DE': { lat: 52.5200, lng: 13.4050 }, // Berlin
  'GH': { lat: 5.6037, lng: -0.1870 }, // Accra
  'GR': { lat: 37.9838, lng: 23.7275 }, // Ath\u00e8nes
  'GD': { lat: 12.0561, lng: -61.7488 }, // Saint-Georges
  'GT': { lat: 14.6349, lng: -90.5069 }, // Guatemala City
  'GN': { lat: 9.6412, lng: -13.5784 }, // Conakry
  'GW': { lat: 11.8636, lng: -15.5977 }, // Bissau
  'GY': { lat: 6.8013, lng: -58.1551 }, // Georgetown
  'HT': { lat: 18.5944, lng: -72.3074 }, // Port-au-Prince
  'HN': { lat: 14.0723, lng: -87.1921 }, // Tegucigalpa
  'HU': { lat: 47.4979, lng: 19.0402 }, // Budapest
  'IS': { lat: 64.1466, lng: -21.9426 }, // Reykjavik
  'IN': { lat: 28.6139, lng: 77.2090 }, // New Delhi
  'ID': { lat: -6.2088, lng: 106.8456 }, // Jakarta
  'IR': { lat: 35.6892, lng: 51.3890 }, // T\u00e9h\u00e9ran
  'IQ': { lat: 33.3152, lng: 44.3661 }, // Bagdad
  'IE': { lat: 53.3498, lng: -6.2603 }, // Dublin
  'IL': { lat: 31.7683, lng: 35.2137 }, // J\u00e9rusalem
  'IT': { lat: 41.9028, lng: 12.4964 }, // Rome
  'JM': { lat: 18.1096, lng: -77.2975 }, // Kingston
  'JP': { lat: 35.6762, lng: 139.6503 }, // Tokyo
  'JO': { lat: 31.9454, lng: 35.9284 }, // Amman
  'KZ': { lat: 51.1605, lng: 71.4704 }, // Astana
  'KE': { lat: -1.2921, lng: 36.8219 }, // Nairobi
  'KI': { lat: 1.3382, lng: 173.0176 }, // Tarawa
  'KP': { lat: 39.0392, lng: 125.7625 }, // Pyongyang
  'KR': { lat: 37.5665, lng: 126.9780 }, // S\u00e9oul
  'KW': { lat: 29.3759, lng: 47.9774 }, // Kowe\u00eft City
  'KG': { lat: 42.8746, lng: 74.5698 }, // Bichkek
  'LA': { lat: 17.9757, lng: 102.6331 }, // Vientiane
  'LV': { lat: 56.9496, lng: 24.1052 }, // Riga
  'LB': { lat: 33.8938, lng: 35.5018 }, // Beyrouth
  'LS': { lat: -29.3142, lng: 27.4833 }, // Maseru
  'LR': { lat: 6.3004, lng: -10.7969 }, // Monrovia
  'LY': { lat: 32.8872, lng: 13.1913 }, // Tripoli
  'LI': { lat: 47.1660, lng: 9.5554 }, // Vaduz
  'LT': { lat: 54.6872, lng: 25.2797 }, // Vilnius
  'LU': { lat: 49.6116, lng: 6.1319 }, // Luxembourg
  'MG': { lat: -18.8792, lng: 47.5079 }, // Antananarivo
  'MW': { lat: -13.9626, lng: 33.7741 }, // Lilongwe
  'MY': { lat: 3.1390, lng: 101.6869 }, // Kuala Lumpur
  'MV': { lat: 4.1755, lng: 73.5093 }, // Mal\u00e9
  'ML': { lat: 12.6392, lng: -8.0029 }, // Bamako
  'MT': { lat: 35.8989, lng: 14.5146 }, // La Valette
  'MH': { lat: 7.1315, lng: 171.1845 }, // Majuro
  'MR': { lat: 18.0735, lng: -15.9582 }, // Nouakchott
  'MU': { lat: -20.1609, lng: 57.5012 }, // Port-Louis
  'MX': { lat: 19.4326, lng: -99.1332 }, // Mexico
  'FM': { lat: 6.9248, lng: 158.1610 }, // Palikir
  'MD': { lat: 47.0105, lng: 28.8638 }, // Chi\u015fin\u0103u
  'MC': { lat: 43.7384, lng: 7.4246 }, // Monaco
  'MN': { lat: 47.9212, lng: 106.9055 }, // Oulan-Bator
  'ME': { lat: 42.4304, lng: 19.2594 }, // Podgorica
  'MA': { lat: 34.0209, lng: -6.8416 }, // Rabat
  'MZ': { lat: -25.9692, lng: 32.5732 }, // Maputo
  'MM': { lat: 19.7633, lng: 96.0785 }, // Naypyidaw
  'NA': { lat: -22.5609, lng: 17.0658 }, // Windhoek
  'NR': { lat: -0.5228, lng: 166.9315 }, // Yaren
  'NP': { lat: 27.7172, lng: 85.3240 }, // Katmandou
  'NL': { lat: 52.3676, lng: 4.9041 }, // Amsterdam
  'NZ': { lat: -41.2866, lng: 174.7756 }, // Wellington
  'NI': { lat: 12.1150, lng: -86.2362 }, // Managua
  'NE': { lat: 13.5116, lng: 2.1254 }, // Niamey
  'NG': { lat: 9.0579, lng: 7.4951 }, // Abuja
  'NO': { lat: 59.9139, lng: 10.7522 }, // Oslo
  'OM': { lat: 23.5880, lng: 58.3829 }, // Mascate
  'PK': { lat: 33.6844, lng: 73.0479 }, // Islamabad
  'PW': { lat: 7.5150, lng: 134.5825 }, // Ngerulmud
  'PS': { lat: 31.9522, lng: 35.2332 }, // Ramallah
  'PA': { lat: 9.1012, lng: -79.4025 }, // Panama
  'PG': { lat: -9.4438, lng: 147.1803 }, // Port Moresby
  'PY': { lat: -25.2637, lng: -57.5759 }, // Asunci\u00f3n
  'PE': { lat: -12.0464, lng: -77.0428 }, // Lima
  'PH': { lat: 14.5995, lng: 120.9842 }, // Manille
  'PL': { lat: 52.2297, lng: 21.0122 }, // Varsovie
  'PT': { lat: 38.7223, lng: -9.1393 }, // Lisbonne
  'QA': { lat: 25.2854, lng: 51.5310 }, // Doha
  'RO': { lat: 44.4268, lng: 26.1025 }, // Bucarest
  'RU': { lat: 55.7558, lng: 37.6173 }, // Moscou
  'RW': { lat: -1.9403, lng: 29.8739 }, // Kigali
  'KN': { lat: 17.2948, lng: -62.7249 }, // Basseterre
  'LC': { lat: 14.0101, lng: -60.9875 }, // Castries
  'VC': { lat: 13.1587, lng: -61.2248 }, // Kingstown
  'WS': { lat: -13.8506, lng: -171.7513 }, // Apia
  'SM': { lat: 43.9322, lng: 12.4484 }, // Saint-Marin
  'ST': { lat: 0.3365, lng: 6.7273 }, // S\u00e3o Tom\u00e9
  'SA': { lat: 24.7136, lng: 46.6753 }, // Riyad
  'SN': { lat: 14.6928, lng: -17.4467 }, // Dakar
  'RS': { lat: 44.7866, lng: 20.4489 }, // Belgrade
  'SC': { lat: -4.6191, lng: 55.4513 }, // Victoria
  'SL': { lat: 8.4657, lng: -13.2317 }, // Freetown
  'SG': { lat: 1.3521, lng: 103.8198 }, // Singapour
  'SK': { lat: 48.1486, lng: 17.1077 }, // Bratislava
  'SI': { lat: 46.0569, lng: 14.5058 }, // Ljubljana
  'SB': { lat: -9.4456, lng: 159.9729 }, // Honiara
  'SO': { lat: 2.0469, lng: 45.3182 }, // Mogadiscio
  'ZA': { lat: -25.7461, lng: 28.1881 }, // Pretoria
  'SS': { lat: 4.8517, lng: 31.5825 }, // Juba
  'ES': { lat: 40.4168, lng: -3.7038 }, // Madrid
  'LK': { lat: 6.9271, lng: 79.8612 }, // Colombo
  'SD': { lat: 15.5007, lng: 32.5599 }, // Khartoum
  'SR': { lat: 5.8520, lng: -55.2038 }, // Paramaribo
  'SE': { lat: 59.3293, lng: 18.0686 }, // Stockholm
  'CH': { lat: 46.9480, lng: 7.4474 }, // Berne
  'SY': { lat: 33.5138, lng: 36.2765 }, // Damas
  'TW': { lat: 25.0330, lng: 121.5654 }, // Taipei
  'TJ': { lat: 38.5598, lng: 68.7740 }, // Douchanbé
  'TZ': { lat: -6.1630, lng: 35.7516 }, // Dodoma
  'TH': { lat: 13.7563, lng: 100.5018 }, // Bangkok
  'TL': { lat: -8.5569, lng: 125.5603 }, // Dili
  'TG': { lat: 6.1725, lng: 1.2314 }, // Lom\u00e9
  'TO': { lat: -21.2085, lng: -175.1982 }, // Nuku'alofa
  'TT': { lat: 10.6596, lng: -61.5086 }, // Port-d'Espagne
  'TN': { lat: 36.8065, lng: 10.1815 }, // Tunis
  'TR': { lat: 39.9334, lng: 32.8597 }, // Ankara
  'TM': { lat: 37.9601, lng: 58.3261 }, // Achgabat
  'TV': { lat: -8.5167, lng: 179.2167 }, // Funafuti
  'UG': { lat: 0.3476, lng: 32.5825 }, // Kampala
  'UA': { lat: 50.4501, lng: 30.5234 }, // Kiev
  'AE': { lat: 24.4539, lng: 54.3773 }, // Abu Dhabi
  'GB': { lat: 51.5074, lng: -0.1278 }, // Londres
  'US': { lat: 38.9072, lng: -77.0369 }, // Washington
  'UY': { lat: -34.9011, lng: -56.1645 }, // Montevideo
  'UZ': { lat: 41.2995, lng: 69.2401 }, // Tachkent
  'VU': { lat: -17.7333, lng: 168.3167 }, // Port-Vila
  'VA': { lat: 41.9029, lng: 12.4534 }, // Vatican
  'VE': { lat: 10.4806, lng: -66.9036 }, // Caracas
  'VN': { lat: 21.0285, lng: 105.8542 }, // Hano\u00ef
  'YE': { lat: 15.3694, lng: 44.1910 }, // Sanaa
  'ZM': { lat: -15.3875, lng: 28.3228 }, // Lusaka
  'ZW': { lat: -17.8252, lng: 31.0335 }, // Harare
};

// =============================================================================
// FONCTIONS UTILITAIRES
// =============================================================================

function randomDateBetween(start: Date, end: Date): Date {
  const startTime = start.getTime();
  const endTime = end.getTime();
  return new Date(startTime + Math.random() * (endTime - startTime));
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomRating(): number {
  const r = Math.random();
  if (r < 0.7) return parseFloat((4.5 + Math.random() * 0.5).toFixed(2));
  if (r < 0.95) return parseFloat((4.0 + Math.random() * 0.5).toFixed(2));
  return parseFloat((3.7 + Math.random() * 0.3).toFixed(2));
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function getRegion(countryCode: string): string {
  const europeWest = ['FR', 'BE', 'NL', 'LU', 'DE', 'AT', 'CH', 'IT', 'ES', 'PT', 'GB', 'IE', 'MC', 'AD', 'SM', 'VA', 'MT', 'LI'];
  const europeEast = ['PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'RS', 'HR', 'SI', 'BA', 'ME', 'MK', 'AL', 'BY', 'UA', 'MD', 'RU', 'EE', 'LV', 'LT'];
  const northAmerica = ['US', 'CA', 'MX'];
  const latinAmerica = ['AR', 'BR', 'CL', 'CO', 'PE', 'VE', 'EC', 'BO', 'PY', 'UY', 'GY', 'SR', 'PA', 'CR', 'NI', 'HN', 'SV', 'GT', 'BZ', 'CU', 'DO', 'HT', 'JM', 'TT', 'BB', 'BS', 'GD', 'LC', 'VC', 'DM', 'KN'];
  const africa = ['DZ', 'MA', 'TN', 'LY', 'EG', 'SD', 'SS', 'ET', 'ER', 'DJ', 'SO', 'KE', 'UG', 'TZ', 'RW', 'BI', 'CD', 'CG', 'GA', 'GQ', 'CM', 'CF', 'TD', 'NE', 'NG', 'BJ', 'TG', 'GH', 'CI', 'BF', 'ML', 'SN', 'GM', 'GW', 'GN', 'SL', 'LR', 'MR', 'CV', 'ST', 'AO', 'ZM', 'ZW', 'BW', 'NA', 'ZA', 'SZ', 'LS', 'MW', 'MZ', 'MG', 'MU', 'SC', 'KM'];
  const middleEast = ['SA', 'AE', 'QA', 'KW', 'BH', 'OM', 'YE', 'JO', 'LB', 'SY', 'IQ', 'IR', 'IL', 'PS', 'TR', 'CY'];
  const asiaEast = ['CN', 'JP', 'KR', 'KP', 'TW', 'MN', 'HK', 'MO', 'SG'];
  const asiaSouth = ['IN', 'PK', 'BD', 'LK', 'NP', 'BT', 'MV', 'AF'];
  const asiaSoutheast = ['TH', 'VN', 'MM', 'LA', 'KH', 'MY', 'ID', 'PH', 'BN', 'TL'];
  const oceania = ['AU', 'NZ', 'PG', 'FJ', 'SB', 'VU', 'WS', 'TO', 'KI', 'MH', 'FM', 'PW', 'NR', 'TV'];
  const centralAsia = ['KZ', 'KG', 'TJ', 'TM', 'UZ', 'GE', 'AM', 'AZ'];

  if (europeWest.includes(countryCode)) return 'europe_west';
  if (europeEast.includes(countryCode)) return 'europe_east';
  if (northAmerica.includes(countryCode)) return 'north_america';
  if (latinAmerica.includes(countryCode)) return 'latin_america';
  if (africa.includes(countryCode)) return 'africa';
  if (middleEast.includes(countryCode)) return 'middle_east';
  if (asiaEast.includes(countryCode)) return 'asia_east';
  if (asiaSouth.includes(countryCode)) return 'asia_south';
  if (asiaSoutheast.includes(countryCode)) return 'asia_southeast';
  if (oceania.includes(countryCode)) return 'oceania';
  if (centralAsia.includes(countryCode)) return 'europe_east';
  return 'default';
}

function getUniversity(countryCode: string): string {
  const region = getRegion(countryCode);
  const universities = UNIVERSITIES_BY_REGION[region] || UNIVERSITIES_BY_REGION['default'];
  return randomChoice(universities);
}

function getCoordinates(countryCode: string): { lat: number; lng: number } {
  const coords = CAPITAL_COORDINATES[countryCode];
  if (coords) {
    return {
      lat: coords.lat + (Math.random() - 0.5) * 0.1,
      lng: coords.lng + (Math.random() - 0.5) * 0.1
    };
  }
  // Fallback: coordonn\u00e9es al\u00e9atoires
  return {
    lat: -40 + Math.random() * 80,
    lng: -180 + Math.random() * 360
  };
}

// ✅ CORRIGÉ: Labels synchronisés avec lawyer-specialties.ts
function getSpecialtyLabel(code: string): string {
  const labels: Record<string, string> = {
    // URG
    'URG_ASSISTANCE_PENALE_INTERNATIONALE': 'Assistance pénale internationale',
    'URG_ACCIDENTS_RESPONSABILITE_CIVILE': 'Accidents et responsabilité civile',
    'URG_RAPATRIEMENT_URGENCE': 'Rapatriement d\'urgence',
    // CUR
    'CUR_TRADUCTIONS_LEGALISATIONS': 'Traductions et légalisations',
    'CUR_RECLAMATIONS_LITIGES_MINEURS': 'Réclamations et litiges mineurs',
    'CUR_DEMARCHES_ADMINISTRATIVES': 'Démarches administratives',
    // IMMI
    'IMMI_VISAS_PERMIS_SEJOUR': 'Visas et permis de séjour',
    'IMMI_CONTRATS_TRAVAIL_INTERNATIONAL': 'Contrats de travail international',
    'IMMI_NATURALISATION': 'Naturalisation',
    // IMMO
    'IMMO_ACHAT_VENTE': 'Achat/vente à l\'étranger',
    'IMMO_LOCATION_BAUX': 'Location et baux',
    'IMMO_LITIGES_IMMOBILIERS': 'Litiges immobiliers',
    // FISC
    'FISC_DECLARATIONS_INTERNATIONALES': 'Déclarations fiscales internationales',
    'FISC_DOUBLE_IMPOSITION': 'Double imposition',
    'FISC_OPTIMISATION_EXPATRIES': 'Optimisation fiscale expatriés',
    // FAM
    'FAM_MARIAGE_DIVORCE': 'Mariage/divorce international',
    'FAM_GARDE_ENFANTS_TRANSFRONTALIERE': 'Garde d\'enfants transfrontalière',
    'FAM_SCOLARITE_INTERNATIONALE': 'Scolarité internationale',
    // PATR
    'PATR_SUCCESSIONS_INTERNATIONALES': 'Successions internationales',
    'PATR_GESTION_PATRIMOINE': 'Gestion de patrimoine',
    'PATR_TESTAMENTS': 'Testaments',
    // ENTR
    'ENTR_CREATION_ENTREPRISE_ETRANGER': 'Création d\'entreprise à l\'étranger',
    'ENTR_INVESTISSEMENTS': 'Investissements',
    'ENTR_IMPORT_EXPORT': 'Import/export',
  };
  return labels[code] || code.replace(/_/g, ' ').toLowerCase();
}

// =============================================================================
// FONCTION PRINCIPALE
// =============================================================================

export async function generate197Lawyers(): Promise<void> {
  console.log('='.repeat(70));
  console.log(' G\u00c9N\u00c9RATION DE 197 AVOCATS HOMMES - TOUS LES PAYS DU MONDE');
  console.log(' Langue: FRAN\u00c7AIS UNIQUEMENT | P\u00e9riode: 1er Oct - 30 D\u00e9c 2024');
  console.log('='.repeat(70));

  const START_DATE = new Date('2024-10-01');
  const END_DATE = new Date('2024-12-30');
  const TODAY = new Date();

  // R\u00e9cup\u00e9rer tous les pays
  const allCountries = getAllCountries();
  console.log(`\n\ud83c\udf0d ${allCountries.length} pays trouv\u00e9s dans le syst\u00e8me\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < allCountries.length; i++) {
    const country = allCountries[i];

    try {
      // R\u00e9cup\u00e9rer les noms selon l'ethnicit\u00e9 du pays
      const namesData = getNamesByCountry(country.name);

      // G\u00e9n\u00e9rer le nom masculin
      const firstName = randomChoice(namesData.male);
      const lastName = randomChoice(namesData.lastNames);
      const fullName = `${firstName} ${lastName}`;
      const email = `${slugify(firstName)}.${slugify(lastName)}@example.com`;

      // UID unique
      const uid = `aaa_lawyer_${country.code.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

      // Date de cr\u00e9ation al\u00e9atoire
      const createdAt = randomDateBetween(START_DATE, END_DATE);

      // Exp\u00e9rience vari\u00e9e (3-30 ans)
      const experience = randomInt(3, 30);
      const graduationYear = new Date().getFullYear() - experience - randomInt(0, 5);

      // S\u00e9lectionner 2-5 sp\u00e9cialit\u00e9s vari\u00e9es
      const numSpecialties = randomInt(2, 5);
      const shuffledSpecialties = [...LAWYER_SPECIALTIES_POOL].sort(() => Math.random() - 0.5);
      const specialties = shuffledSpecialties.slice(0, numSpecialties);

      // S\u00e9lectionner 1-3 certifications
      const numCerts = randomInt(1, 3);
      const shuffledCerts = [...CERTIFICATIONS_POOL].sort(() => Math.random() - 0.5);
      const certifications = shuffledCerts.slice(0, numCerts);

      // Statistiques vari\u00e9es
      const daysSinceCreation = Math.max(1, Math.floor((TODAY.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)));
      const weeks = Math.max(1, Math.floor(daysSinceCreation / 7));
      const callsPerWeek = randomInt(0, 4);
      const totalCalls = Math.max(0, weeks * callsPerWeek + randomInt(0, 5));
      const reviewCount = Math.max(0, Math.min(totalCalls, Math.floor(totalCalls * (0.3 + Math.random() * 0.5))));
      const rating = randomRating();

      // Bio vari\u00e9e
      const bioTemplate = randomChoice(BIO_TEMPLATES_FR);
      const mainSpecialty = getSpecialtyLabel(specialties[0]);
      const bioFr = bioTemplate
        .replace(/{experience}/g, experience.toString())
        .replace(/{country}/g, country.name)
        .replace(/{specialty}/g, mainSpecialty);

      const bioEnTemplate = randomChoice(BIO_TEMPLATES_EN);
      const bioEn = bioEnTemplate
        .replace(/{experience}/g, experience.toString())
        .replace(/{country}/g, country.name)
        .replace(/{specialty}/g, mainSpecialty);

      // Universit\u00e9
      const lawSchool = getUniversity(country.code);

      // Coordonn\u00e9es
      const mapLocation = getCoordinates(country.code);

      // Prix vari\u00e9s selon la r\u00e9gion
      const region = getRegion(country.code);
      let basePrice = 49;
      if (region === 'europe_west' || region === 'north_america') basePrice = randomInt(59, 99);
      else if (region === 'asia_east' || region === 'middle_east') basePrice = randomInt(49, 79);
      else if (region === 'africa' || region === 'asia_south') basePrice = randomInt(29, 49);
      else basePrice = randomInt(39, 69);

      // Dur\u00e9e de consultation vari\u00e9e
      const duration = randomChoice([15, 20, 30, 45]);

      // Temps de r\u00e9ponse vari\u00e9
      const responseTime = randomChoice(['< 5 minutes', '< 15 minutes', '< 30 minutes', '< 1 heure']);

      // Construire le profil
      const profileData: any = {
        uid,
        firstName,
        lastName,
        fullName,
        email,
        phone: '+33743331201',
        phoneCountryCode: '+33',
        country: country.code,
        currentCountry: country.code,
        preferredLanguage: 'fr',
        languages: ['fr'], // FRAN\u00c7AIS UNIQUEMENT
        languagesSpoken: ['fr'], // FRANÇAIS UNIQUEMENT (code ISO)
        profilePhoto: '',
        avatar: '',
        isTestProfile: true,
        isAAA: true,
        isActive: true,
        isApproved: true,
        isVerified: true,
        approvalStatus: 'approved',
        verificationStatus: 'approved',
        isOnline: Math.random() > 0.7, // 30% en ligne
        isVisible: true,
        isVisibleOnMap: true,
        isCallable: true,
        createdAt: Timestamp.fromDate(createdAt),
        updatedAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        role: 'lawyer',
        type: 'lawyer',
        isSOS: true,
        points: randomInt(0, 500),
        affiliateCode: `LAW${country.code}${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
        referralBy: null,
        bio: { fr: bioFr, en: bioEn },
        responseTime,
        availability: 'available',
        totalCalls,
        totalEarnings: totalCalls * basePrice * (Math.random() * 0.5 + 0.5),
        averageRating: rating,
        rating,
        reviewCount,
        mapLocation,
        price: basePrice,
        duration,
        // Champs sp\u00e9cifiques avocat
        specialties,
        practiceCountries: [country.code],
        yearsOfExperience: experience,
        barNumber: `BAR-${country.code}-${randomInt(10000, 99999)}`,
        lawSchool,
        graduationYear,
        certifications,
        needsVerification: false,
      };

      // Sauvegarder dans Firestore
      await setDoc(doc(db, 'users', uid), profileData);
      await setDoc(doc(db, 'sos_profiles', uid), { ...profileData, createdByAdmin: true, profileCompleted: true });

      // Carte de profil
      await setDoc(doc(db, 'ui_profile_cards', uid), {
        id: uid, uid, title: fullName, subtitle: 'Avocat',
        country: country.name, photo: '', rating, reviewCount,
        languages: ['fr'], specialties,
        href: `/profile/${uid}`, createdAt: serverTimestamp(),
      });

      // G\u00e9n\u00e9rer des avis vari\u00e9s
      const usedComments = new Set<string>();
      for (let j = 0; j < reviewCount; j++) {
        const reviewDaysAfter = Math.floor((j / Math.max(1, reviewCount)) * daysSinceCreation);
        const reviewDate = new Date(createdAt.getTime() + reviewDaysAfter * 24 * 60 * 60 * 1000);
        const reviewRating = parseFloat((3.5 + Math.random() * 1.5).toFixed(1));

        // Choisir un commentaire non utilis\u00e9
        let comment = randomChoice(REVIEW_COMMENTS);
        let attempts = 0;
        while (usedComments.has(comment) && attempts < 50) {
          comment = randomChoice(REVIEW_COMMENTS);
          attempts++;
        }
        usedComments.add(comment);

        // Pr\u00e9nom de client vari\u00e9
        const clientCountry = randomChoice(allCountries);
        const clientNames = getNamesByCountry(clientCountry.name);
        const clientFirstName = randomChoice(clientNames.male);

        await addDoc(collection(db, 'reviews'), {
          providerId: uid,
          clientId: `client_${Date.now()}_${j}`,
          clientName: clientFirstName,
          clientCountry: clientCountry.name,
          rating: reviewRating,
          comment,
          isPublic: true,
          status: 'published',
          serviceType: 'lawyer_call',
          createdAt: Timestamp.fromDate(reviewDate),
          helpfulVotes: randomInt(0, 15),
        });
      }

      successCount++;
      const progress = ((i + 1) / allCountries.length * 100).toFixed(1);
      console.log(`\u2713 [${i + 1}/${allCountries.length}] ${progress}% | ${fullName} | ${country.name} (${country.code}) | ${experience}ans | ${reviewCount} avis`);

      // Pause pour \u00e9viter de surcharger Firestore
      await new Promise(resolve => setTimeout(resolve, 50));

    } catch (err) {
      errorCount++;
      console.error(`\u2717 [${i + 1}/${allCountries.length}] ERREUR ${country.name}:`, (err as Error).message);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(` TERMIN\u00c9! ${successCount} profils cr\u00e9\u00e9s avec succ\u00e8s, ${errorCount} erreurs`);
  console.log('='.repeat(70));
}

// Export pour la console
if (typeof window !== 'undefined') {
  (window as any).generate197Lawyers = generate197Lawyers;
  console.log('\n\ud83d\udee0\ufe0f Script charg\u00e9! Tapez: generate197Lawyers()');
  console.log('   \u2192 G\u00e9n\u00e8re 197 avocats hommes (1 par pays)');
  console.log('   \u2192 Tous parlent FRAN\u00c7AIS uniquement');
  console.log('   \u2192 Ethnicit\u00e9s vari\u00e9es selon le pays');
  console.log('   \u2192 P\u00e9riode: 1er octobre - 30 d\u00e9cembre 2024\n');
}

export default generate197Lawyers;

