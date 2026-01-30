/**
 * AAA Profile Generator Utilities
 *
 * Fonctions partagées pour la génération de profils AAA complets
 * Utilisé par AdminAaaProfiles et CountryCoverageTab
 */

import {
  collection,
  addDoc,
  setDoc,
  doc,
  serverTimestamp,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { countriesData } from '../data/countries';
import { languagesData } from '../data/languages-spoken';
import { flattenLawyerSpecialities } from '../data/lawyer-specialties';
import { expatHelpTypesData } from '../data/expat-help-types';
import { getNamesByCountry } from '../data/names-by-country';
import { generateShortId, generateMultilingualSlugs } from './slugGenerator';

// Types
export type Role = 'lawyer' | 'expat';
export type Gender = 'male' | 'female';

export interface AaaProfileGenerationParams {
  role: Role;
  gender: Gender;
  country: string;
  countryCode: string;
  languages: string[];
  specialties: string[];
  email: string;
  displayName?: string;
  phone?: string;
  yearsOfExperience?: number;
  isEarly?: boolean;
  allowRealCalls?: boolean;
}

export interface GeneratedProfile {
  uid: string;
  fullName: string;
  email: string;
}

// ==========================================
// HELPERS
// ==========================================

export const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export const randomChoice = <T,>(array: T[]): T =>
  array[Math.floor(Math.random() * array.length)];

export const randomRating = (): number => {
  const r = Math.random();
  if (r < 0.95) return parseFloat((4 + Math.random()).toFixed(2));
  return parseFloat((3 + Math.random() * 0.9).toFixed(2));
};

// ==========================================
// NAME GENERATION
// ==========================================

export const genName = (gender: Gender, country: string): { firstName: string; lastName: string; fullName: string } => {
  try {
    const names = getNamesByCountry(country);
    const firstName = names[gender][randomInt(0, names[gender].length - 1)];
    const lastName = names.lastNames[randomInt(0, names.lastNames.length - 1)];
    return { firstName, lastName, fullName: `${firstName} ${lastName}` };
  } catch (e) {
    // Fallback names
    const fallbackFirstNames = {
      male: ['Jean', 'Pierre', 'Michel', 'François', 'Antoine'],
      female: ['Marie', 'Sophie', 'Claire', 'Isabelle', 'Catherine']
    };
    const fallbackLastNames = ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert'];
    const firstName = fallbackFirstNames[gender][randomInt(0, 4)];
    const lastName = fallbackLastNames[randomInt(0, 4)];
    return { firstName, lastName, fullName: `${firstName} ${lastName}` };
  }
};

// ==========================================
// COUNTRY COORDINATES
// ==========================================

const COUNTRY_COORDINATES: Record<string, Array<{ city: string; lat: number; lng: number }>> = {
  'France': [
    { city: 'Paris', lat: 48.8566, lng: 2.3522 },
    { city: 'Lyon', lat: 45.7640, lng: 4.8357 },
    { city: 'Marseille', lat: 43.2965, lng: 5.3698 },
  ],
  'Belgique': [
    { city: 'Bruxelles', lat: 50.8503, lng: 4.3517 },
    { city: 'Anvers', lat: 51.2194, lng: 4.4025 },
  ],
  'Suisse': [
    { city: 'Zurich', lat: 47.3769, lng: 8.5417 },
    { city: 'Genève', lat: 46.2044, lng: 6.1432 },
  ],
  'Canada': [
    { city: 'Montréal', lat: 45.5017, lng: -73.5673 },
    { city: 'Toronto', lat: 43.6532, lng: -79.3832 },
  ],
  'États-Unis': [
    { city: 'New York', lat: 40.7128, lng: -74.0060 },
    { city: 'Los Angeles', lat: 34.0522, lng: -118.2437 },
  ],
  'Royaume-Uni': [
    { city: 'Londres', lat: 51.5074, lng: -0.1278 },
    { city: 'Manchester', lat: 53.4808, lng: -2.2426 },
  ],
  'Allemagne': [
    { city: 'Berlin', lat: 52.5200, lng: 13.4050 },
    { city: 'Munich', lat: 48.1351, lng: 11.5820 },
  ],
  'Espagne': [
    { city: 'Madrid', lat: 40.4168, lng: -3.7038 },
    { city: 'Barcelone', lat: 41.3851, lng: 2.1734 },
  ],
  'Italie': [
    { city: 'Rome', lat: 41.9028, lng: 12.4964 },
    { city: 'Milan', lat: 45.4642, lng: 9.1900 },
  ],
  'Portugal': [
    { city: 'Lisbonne', lat: 38.7223, lng: -9.1393 },
    { city: 'Porto', lat: 41.1579, lng: -8.6291 },
  ],
  'Australie': [
    { city: 'Sydney', lat: -33.8688, lng: 151.2093 },
    { city: 'Melbourne', lat: -37.8136, lng: 144.9631 },
  ],
  'Japon': [
    { city: 'Tokyo', lat: 35.6762, lng: 139.6503 },
    { city: 'Osaka', lat: 34.6937, lng: 135.5023 },
  ],
  'Thaïlande': [
    { city: 'Bangkok', lat: 13.7563, lng: 100.5018 },
    { city: 'Chiang Mai', lat: 18.7883, lng: 98.9853 },
  ],
  'Vietnam': [
    { city: 'Ho Chi Minh', lat: 10.8231, lng: 106.6297 },
    { city: 'Hanoï', lat: 21.0285, lng: 105.8542 },
  ],
  'Maroc': [
    { city: 'Casablanca', lat: 33.5731, lng: -7.5898 },
    { city: 'Marrakech', lat: 31.6295, lng: -7.9811 },
  ],
  'Sénégal': [
    { city: 'Dakar', lat: 14.7167, lng: -17.4677 },
  ],
  "Côte d'Ivoire": [
    { city: 'Abidjan', lat: 5.3600, lng: -4.0083 },
  ],
  'Brésil': [
    { city: 'São Paulo', lat: -23.5505, lng: -46.6333 },
    { city: 'Rio de Janeiro', lat: -22.9068, lng: -43.1729 },
  ],
  'Argentine': [
    { city: 'Buenos Aires', lat: -34.6037, lng: -58.3816 },
  ],
  'Mexique': [
    { city: 'Mexico', lat: 19.4326, lng: -99.1332 },
  ],
  'Émirats arabes unis': [
    { city: 'Dubaï', lat: 25.2048, lng: 55.2708 },
    { city: 'Abu Dhabi', lat: 24.4539, lng: 54.3773 },
  ],
  'Singapour': [
    { city: 'Singapour', lat: 1.3521, lng: 103.8198 },
  ],
  'Inde': [
    { city: 'Mumbai', lat: 19.0760, lng: 72.8777 },
    { city: 'Delhi', lat: 28.7041, lng: 77.1025 },
  ],
  'Chine': [
    { city: 'Shanghai', lat: 31.2304, lng: 121.4737 },
    { city: 'Pékin', lat: 39.9042, lng: 116.4074 },
  ],
};

export const getCountryCoordinates = (country: string): { lat: number; lng: number } => {
  const coords = COUNTRY_COORDINATES[country];
  if (coords && coords.length > 0) {
    const selected = coords[Math.floor(Math.random() * coords.length)];
    return {
      lat: selected.lat + (Math.random() - 0.5) * 0.1,
      lng: selected.lng + (Math.random() - 0.5) * 0.1
    };
  }
  return {
    lat: -40 + Math.random() * 80,
    lng: -180 + Math.random() * 360
  };
};

// ==========================================
// UNIVERSITIES
// ==========================================

const UNIVERSITIES_BY_COUNTRY: Record<string, string[]> = {
  'France': ['Université Paris 1 Panthéon-Sorbonne', 'Université Paris 2 Panthéon-Assas', 'Université de Lyon'],
  'Belgique': ['Université Libre de Bruxelles', 'Université Catholique de Louvain'],
  'Suisse': ['Université de Genève', 'Université de Lausanne'],
  'Canada': ['Université de Montréal', 'Université McGill'],
  'États-Unis': ['Harvard Law School', 'Stanford Law School', 'Yale Law School'],
  'Royaume-Uni': ['University of Oxford', 'University of Cambridge'],
  'Allemagne': ['Humboldt-Universität zu Berlin', 'Ludwig-Maximilians-Universität München'],
  '_DEFAULT': ['Université Nationale', 'École Supérieure de Droit', 'Institut Universitaire']
};

export const getUniversity = (country: string): string => {
  const universities = UNIVERSITIES_BY_COUNTRY[country] || UNIVERSITIES_BY_COUNTRY['_DEFAULT'];
  return universities[Math.floor(Math.random() * universities.length)];
};

// ==========================================
// COUNTRY CODE MAPPING
// ==========================================

const NAME_TO_ISO: Record<string, string> = {
  'Afghanistan': 'AF', 'Albanie': 'AL', 'Algérie': 'DZ', 'Allemagne': 'DE', 'Andorre': 'AD',
  'Angola': 'AO', 'Argentine': 'AR', 'Arménie': 'AM', 'Australie': 'AU', 'Autriche': 'AT',
  'Azerbaïdjan': 'AZ', 'Belgique': 'BE', 'Brésil': 'BR', 'Bulgarie': 'BG', 'Cambodge': 'KH',
  'Cameroun': 'CM', 'Canada': 'CA', 'Chili': 'CL', 'Chine': 'CN', 'Colombie': 'CO',
  "Côte d'Ivoire": 'CI', 'Croatie': 'HR', 'Danemark': 'DK', 'Égypte': 'EG', 'Émirats Arabes Unis': 'AE',
  'Espagne': 'ES', 'Estonie': 'EE', 'États-Unis': 'US', 'Finlande': 'FI', 'France': 'FR',
  'Grèce': 'GR', 'Hongrie': 'HU', 'Inde': 'IN', 'Indonésie': 'ID', 'Irlande': 'IE',
  'Israël': 'IL', 'Italie': 'IT', 'Japon': 'JP', 'Kenya': 'KE', 'Liban': 'LB',
  'Luxembourg': 'LU', 'Madagascar': 'MG', 'Malaisie': 'MY', 'Maroc': 'MA', 'Mexique': 'MX',
  'Monaco': 'MC', 'Nigeria': 'NG', 'Norvège': 'NO', 'Pays-Bas': 'NL', 'Pérou': 'PE',
  'Philippines': 'PH', 'Pologne': 'PL', 'Portugal': 'PT', 'Qatar': 'QA', 'Roumanie': 'RO',
  'Royaume-Uni': 'GB', 'Russie': 'RU', 'Sénégal': 'SN', 'Singapour': 'SG', 'Suède': 'SE',
  'Suisse': 'CH', 'Thaïlande': 'TH', 'Tunisie': 'TN', 'Turquie': 'TR', 'Ukraine': 'UA',
  'Vietnam': 'VN', 'Afrique du Sud': 'ZA', 'Arabie Saoudite': 'SA',
};

export const getCountryCode = (countryName: string): string => {
  if (!countryName) return 'FR';
  if (countryName.length === 2 && countryName === countryName.toUpperCase()) {
    return countryName;
  }
  if (NAME_TO_ISO[countryName]) {
    return NAME_TO_ISO[countryName];
  }
  const country = countriesData.find(c => c.nameFr === countryName);
  return country?.code || countryName;
};

export const getCountryNameFromCode = (code: string): string => {
  const ISO_COUNTRY_MAP: Record<string, string> = Object.entries(NAME_TO_ISO).reduce((acc, [name, iso]) => {
    acc[iso] = name;
    return acc;
  }, {} as Record<string, string>);

  if (ISO_COUNTRY_MAP[code.toUpperCase()]) {
    return ISO_COUNTRY_MAP[code.toUpperCase()];
  }
  const country = countriesData.find(c => c.code === code || c.code === code.toUpperCase());
  return country?.nameFr || code;
};

// ==========================================
// LANGUAGE CODE MAPPING
// ==========================================

export const getLanguageCode = (languageName: string): string => {
  const NAME_TO_LANG: Record<string, string> = {
    'Français': 'fr', 'Anglais': 'en', 'Espagnol': 'es', 'Allemand': 'de', 'Italien': 'it',
    'Portugais': 'pt', 'Russe': 'ru', 'Chinois': 'zh', 'Japonais': 'ja', 'Coréen': 'ko',
    'Arabe': 'ar', 'Hindi': 'hi', 'Thaï': 'th', 'Vietnamien': 'vi',
  };
  if (languageName.length === 2) return languageName.toLowerCase();
  return NAME_TO_LANG[languageName] || 'fr';
};

// ==========================================
// SPECIALTIES
// ==========================================

export const getLawyerSpecialtyCodes = (): string[] => {
  return flattenLawyerSpecialities().map(spec => spec.code);
};

export const getExpatHelpTypeCodes = (): string[] => {
  return expatHelpTypesData.filter(type => !type.disabled).map(type => type.code);
};

export const getRandomSpecialties = (role: Role, count: number = 3): string[] => {
  const allCodes = role === 'lawyer' ? getLawyerSpecialtyCodes() : getExpatHelpTypeCodes();
  const shuffled = [...allCodes].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, allCodes.length));
};

// ==========================================
// BIO GENERATION (Simplified)
// ==========================================

const BIO_TEMPLATES_LAWYER: Record<string, string[]> = {
  fr: [
    "Avocat spécialisé avec {experience} ans d'expérience, j'accompagne les expatriés dans leurs démarches juridiques.",
    "Fort de {experience} années de pratique, je propose une expertise pointue en droit international.",
    "Avocat inscrit au barreau, je mets mon expérience de {experience} ans au service des francophones.",
  ],
  en: [
    "Specialized lawyer with {experience} years of experience, I assist expats with their legal procedures.",
    "With {experience} years of practice, I offer expertise in international law.",
    "Bar-registered lawyer, I put my {experience} years of experience at the service of French speakers.",
  ]
};

const BIO_TEMPLATES_EXPAT: Record<string, string[]> = {
  fr: [
    "Expatrié depuis {experience} ans, je vous aide à vous installer et à naviguer dans votre nouveau pays.",
    "Avec {experience} années d'expérience en tant qu'expatrié, je partage mes connaissances pour faciliter votre intégration.",
    "Installé depuis {experience} ans, j'accompagne les nouveaux arrivants dans leurs démarches quotidiennes.",
  ],
  en: [
    "Expat for {experience} years, I help you settle and navigate your new country.",
    "With {experience} years of expat experience, I share my knowledge to facilitate your integration.",
    "Settled for {experience} years, I support newcomers in their daily procedures.",
  ]
};

export const generateBio = (role: Role, experience: number, languages: string[]): Record<string, string> => {
  const templates = role === 'lawyer' ? BIO_TEMPLATES_LAWYER : BIO_TEMPLATES_EXPAT;
  const result: Record<string, string> = {};

  for (const lang of ['fr', 'en']) {
    const langTemplates = templates[lang] || templates['fr'];
    const template = langTemplates[Math.floor(Math.random() * langTemplates.length)];
    result[lang] = template.replace('{experience}', experience.toString());
  }

  return result;
};

// ==========================================
// CERTIFICATIONS
// ==========================================

const CERTIFICATIONS = [
  'certified-bar', 'international-law', 'mediator', 'business-law',
  'family-law', 'tax-law', 'real-estate', 'immigration'
];

export const getRandomCertifications = (count: number = 2): string[] => {
  const shuffled = [...CERTIFICATIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, CERTIFICATIONS.length));
};

// ==========================================
// GRADUATION YEAR
// ==========================================

export const getGraduationYear = (experience: number): number => {
  const currentYear = new Date().getFullYear();
  return currentYear - experience - Math.floor(Math.random() * 3) - 25;
};

// ==========================================
// RESPONSE TIME
// ==========================================

export const getResponseTime = (): string => '< 5 minutes';

// ==========================================
// PREVIOUS COUNTRIES
// ==========================================

export const getPreviousCountries = (currentCountry: string): string[] => {
  const count = Math.floor(Math.random() * 3); // 0 à 2 pays
  if (count === 0) return [];

  const countries = ['FR', 'GB', 'US', 'DE', 'ES', 'IT', 'PT', 'BE', 'CH', 'CA'];
  const currentCode = getCountryCode(currentCountry);
  const available = countries.filter(c => c !== currentCode);
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

// ==========================================
// PAYOUT CONFIG
// ==========================================

export const loadAaaPayoutConfig = async (): Promise<{ defaultMode: string; externalAccounts: any[] }> => {
  try {
    const configDoc = await getDoc(doc(db, 'admin_config', 'aaa_payout'));
    if (configDoc.exists()) {
      const data = configDoc.data();
      return {
        defaultMode: data.defaultMode || 'internal',
        externalAccounts: data.externalAccounts || [],
      };
    }
  } catch (e) {
    console.error('Error loading AAA payout config:', e);
  }
  return { defaultMode: 'internal', externalAccounts: [] };
};

// ==========================================
// PROFILE GENERATION
// ==========================================

export async function generateCompleteAaaProfile(params: AaaProfileGenerationParams): Promise<GeneratedProfile> {
  const {
    role,
    gender,
    country,
    countryCode,
    languages,
    specialties,
    email,
    displayName,
    phone,
    yearsOfExperience = randomInt(3, 15),
    isEarly = false,
    allowRealCalls = true,
  } = params;

  // Generate name
  const { firstName, lastName, fullName } = displayName
    ? { firstName: displayName.split(' ')[0], lastName: displayName.split(' ').slice(1).join(' ') || 'Provider', fullName: displayName }
    : genName(gender, country);

  // Generate UID
  const uid = `aaa_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  // Get coordinates
  const mapLocation = getCountryCoordinates(country);

  // Get payout config
  const payoutConfig = await loadAaaPayoutConfig();

  // Get language codes
  const languageCodes = languages.map(l => getLanguageCode(l));

  // Generate bio
  const bio = generateBio(role, yearsOfExperience, languages);

  // Rating and reviews
  const rating = randomRating();
  const reviewCount = randomInt(5, 25);
  const totalCalls = reviewCount + randomInt(5, 20);

  // Dates
  const createdAt = new Date();
  createdAt.setDate(createdAt.getDate() - randomInt(30, 365)); // Random date in last year

  // Profile photo (placeholder)
  const profilePhoto = `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}&backgroundColor=b6e3f4`;

  // Base user data
  const baseUser: Record<string, any> = {
    uid,
    email: email.toLowerCase(),
    displayName: fullName,
    fullName,
    firstName,
    lastName,
    phone: phone || `+33${randomInt(600000000, 699999999)}`,
    phoneCountryCode: '+33',
    country: countryCode,
    currentCountry: countryCode,
    languages: languageCodes,
    languagesSpoken: languageCodes,
    preferredLanguage: languageCodes[0] || 'fr',
    profilePhoto,
    bio,
    isApproved: true,
    approvalStatus: 'approved',
    isOnline: false,
    isVisible: true,
    isVisibleOnMap: true,
    isCallable: allowRealCalls,
    createdAt: Timestamp.fromDate(createdAt),
    updatedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
    lastActivity: serverTimestamp(),  // ✅ Ajouté pour éviter les problèmes avec orderBy
    role,
    isSOS: true,
    points: 0,
    affiliateCode: `AAA${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    referralBy: null,
    responseTime: getResponseTime(),
    availability: 'offline',
    totalCalls,
    totalEarnings: 0,
    averageRating: rating,
    rating,
    reviewCount,
    isEarlyProvider: isEarly,
    mapLocation,
    gender,
    // AAA specific fields
    isAAA: true,
    aaaPayoutMode: payoutConfig.defaultMode,
    kycDelegated: true,
    kycStatus: 'not_required',
    forcedAIAccess: true,
    hasActiveSubscription: true,
    subscriptionStatus: 'active',
  };

  // Add early badge if applicable
  if (isEarly) {
    baseUser.earlyBadge = role;
  }

  // Role-specific fields
  if (role === 'lawyer') {
    Object.assign(baseUser, {
      specialties,
      practiceCountries: [countryCode],
      yearsOfExperience,
      barNumber: `BAR${randomInt(10000, 99999)}`,
      lawSchool: getUniversity(country),
      graduationYear: getGraduationYear(yearsOfExperience),
      certifications: getRandomCertifications(randomInt(1, 3)),
      needsVerification: false,
      verificationStatus: 'approved',
    });
  } else {
    Object.assign(baseUser, {
      helpTypes: specialties,
      specialties,
      residenceCountry: countryCode,
      yearsAsExpat: yearsOfExperience,
      yearsOfExperience,
      previousCountries: getPreviousCountries(country),
      needsVerification: false,
      verificationStatus: 'approved',
    });
  }

  // Clean undefined values
  const cleanUser = Object.entries(baseUser).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, any>);

  // Save to users collection
  await setDoc(doc(db, 'users', uid), cleanUser);

  // Générer shortId et slugs multilingues pour SEO
  const shortId = generateShortId(uid);
  const slugs = generateMultilingualSlugs({
    firstName: cleanUser.firstName || fullName.split(' ')[0],
    lastName: cleanUser.lastName || '',
    role: role,
    country: countryCode,
    languages: languageCodes,
    specialties: specialties,
  });

  // Save to sos_profiles collection avec shortId et slugs
  const providerProfile = {
    ...cleanUser,
    type: role,
    createdByAdmin: true,
    profileCompleted: true,
    shortId,
    slugs,
  };
  await setDoc(doc(db, 'sos_profiles', uid), providerProfile);

  // Save to UI collections avec slug SEO-friendly
  const card = {
    id: uid,
    uid,
    title: fullName,
    subtitle: role === 'lawyer' ? 'Avocat' : 'Expatrié aidant',
    country,
    photo: profilePhoto,
    rating,
    reviewCount,
    languages: languageCodes,
    specialties,
    shortId,
    slugs,
    // URL SEO-friendly avec slug français par défaut
    href: slugs.fr ? `/${slugs.fr}` : `/profile/${uid}`,
    createdAt: serverTimestamp(),
  };
  await setDoc(doc(db, 'ui_profile_cards', uid), card);
  await setDoc(doc(db, 'ui_profile_carousel', uid), card);

  // Generate reviews
  const serviceType = role === 'lawyer' ? 'lawyer_call' : 'expat_call';
  const reviewComments = [
    "Excellent service, très professionnel !",
    "Très satisfait de l'accompagnement.",
    "Conseils précieux et pertinents.",
    "Je recommande vivement !",
    "Service de qualité, merci !",
    "Disponible et à l'écoute.",
    "Expertise remarquable.",
    "Très bon conseil, je reviendrai.",
  ];

  for (let j = 0; j < reviewCount; j++) {
    const reviewDate = new Date(createdAt);
    reviewDate.setDate(reviewDate.getDate() + randomInt(1, 180));

    const clientGender: Gender = Math.random() > 0.5 ? 'male' : 'female';
    const clientName = genName(clientGender, 'France').firstName;

    await addDoc(collection(db, 'reviews'), {
      providerId: uid,
      clientId: `aaa_client_${Date.now()}_${j}`,
      clientName,
      clientCountry: 'FR',
      rating: parseFloat((4.0 + Math.random()).toFixed(1)),
      comment: reviewComments[j % reviewComments.length],
      isPublic: true,
      status: 'published',
      serviceType,
      createdAt: Timestamp.fromDate(reviewDate),
      helpfulVotes: randomInt(0, 10),
    });
  }

  // Generate call sessions
  for (let j = 0; j < totalCalls; j++) {
    const callDate = new Date(createdAt);
    callDate.setDate(callDate.getDate() + randomInt(1, 180));
    const callDuration = randomInt(15, 45) * 60;
    const callEndDate = new Date(callDate.getTime() + callDuration * 1000);

    await addDoc(collection(db, 'call_sessions'), {
      metadata: {
        providerId: uid,
        providerName: fullName,
        clientId: `client_${j + 1}`,
        clientName: `Client ${j + 1}`,
      },
      status: 'completed',
      duration: callDuration,
      callType: 'video',
      createdAt: Timestamp.fromDate(callDate),
      startedAt: Timestamp.fromDate(callDate),
      endedAt: Timestamp.fromDate(callEndDate),
    });
  }

  return { uid, fullName, email };
}
