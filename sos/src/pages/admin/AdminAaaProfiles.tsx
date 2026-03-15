// Imports des traductions AAA par langue
import aaaTranslationsFr from "../../helper/aaaprofiles/admin_aaa_fr.json";
import aaaTranslationsEn from "../../helper/aaaprofiles/admin_aaa_en.json";
import aaaTranslationsEs from "../../helper/aaaprofiles/admin_aaa_es.json";
import aaaTranslationsDe from "../../helper/aaaprofiles/admin_aaa_de.json";
import aaaTranslationsPt from "../../helper/aaaprofiles/admin_aaa_pt.json";
import aaaTranslationsRu from "../../helper/aaaprofiles/admin_aaa_ru.json";
import aaaTranslationsZh from "../../helper/aaaprofiles/admin_aaa_zh.json";
import aaaTranslationsAr from "../../helper/aaaprofiles/admin_aaa_ar.json";
import aaaTranslationsHi from "../../helper/aaaprofiles/admin_aaa_hi.json";

const TRANSLATIONS_MAP: Record<string, any> = {
  fr: aaaTranslationsFr,
  en: aaaTranslationsEn,
  es: aaaTranslationsEs,
  de: aaaTranslationsDe,
  pt: aaaTranslationsPt,
  ru: aaaTranslationsRu,
  zh: aaaTranslationsZh,
  ar: aaaTranslationsAr,
  hi: aaaTranslationsHi,
};

import React, { useEffect, useMemo, useState, Suspense } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useIntl } from 'react-intl';
import type { DocumentData as FirestoreData } from 'firebase/firestore';
import {
  Users, UserPlus, Scale, Flag, Check, AlertCircle, Loader, RefreshCw,
  Save, AlertTriangle, Edit, Eye, Trash, EyeOff, Star, Search, List, Calendar, X,
  Wallet, CreditCard, Building, Plus, Settings, DollarSign
} from 'lucide-react';
import {
  collection, addDoc, setDoc, doc, serverTimestamp, getDocs, query,
  where, updateDoc, deleteDoc, runTransaction, Timestamp, orderBy, limit, getDoc, deleteField
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';

const ImageUploader = React.lazy(() => import('../../components/common/ImageUploader'));

import { countriesData } from '../../data/countries';
import { languagesData } from '../../data/languages-spoken';
import { flattenLawyerSpecialities } from '../../data/lawyer-specialties';
import { expatHelpTypesData } from '../../data/expat-help-types';
import { getNamesByCountry } from '../../data/names-by-country';
import { getLawyerSpecialityLabel } from '../../data/lawyer-specialties';
import { getExpatHelpTypeLabel } from '../../data/expat-help-types';

// Import du script de migration
import { previewMigration, migrateAllSpecialtyCodes, migrateOneProfile, checkAllProfiles, previewBioCountryFix, fixAllBiosCountryCodes, fixOneBioCountryCodes } from '../../scripts/migrateSpecialtyCodes';

// Import des scripts de synchronisation/génération des avis
import { previewMissingReviews, generateMissingReviews, generateMissingReviewsForOne } from '../../scripts/generateMissingReviews';
import { previewReviewCountSync, syncAllReviewCounts, syncOneProfileReviewCount } from '../../scripts/syncReviewCounts';
import { getSpecialtyLabel, mapLanguageToLocale } from '../../utils/specialtyMapper';

// Import du script de génération massive d'avocats
import { generateLawyersAllCountries } from '../../scripts/generateLawyersAllCountries';

// ==========================================
// 🔧 MIGRATION: Add forcedAIAccess to existing AAA profiles
// ==========================================
async function migrateAaaProfilesForAIAccess(dryRun = true) {
  const { collection, query, where, getDocs, updateDoc, doc, writeBatch } = await import('firebase/firestore');
  const { db } = await import('../../config/firebase');

  console.log(`[AAA Migration] Starting ${dryRun ? 'DRY RUN' : 'REAL MIGRATION'}...`);

  // Find all AAA profiles
  const usersQuery = query(
    collection(db, 'users'),
    where('isAAA', '==', true)
  );

  const snapshot = await getDocs(usersQuery);
  console.log(`[AAA Migration] Found ${snapshot.size} AAA profiles`);

  const profilesToMigrate: string[] = [];

  for (const userDoc of snapshot.docs) {
    const data = userDoc.data();
    if (data.forcedAIAccess !== true) {
      profilesToMigrate.push(userDoc.id);
      console.log(`[AAA Migration] Will migrate: ${userDoc.id} (${data.fullName || data.email})`);
    }
  }

  console.log(`[AAA Migration] ${profilesToMigrate.length} profiles need migration`);

  if (dryRun) {
    console.log('[AAA Migration] DRY RUN complete. Run migrateAaaProfiles(false) to apply changes.');
    return { total: snapshot.size, toMigrate: profilesToMigrate.length, migrated: 0 };
  }

  // Migrate in batches of 500
  let migrated = 0;
  const batchSize = 500;

  for (let i = 0; i < profilesToMigrate.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = profilesToMigrate.slice(i, i + batchSize);

    for (const profileId of chunk) {
      // Update users collection
      batch.update(doc(db, 'users', profileId), {
        forcedAIAccess: true,
        hasActiveSubscription: true,
        subscriptionStatus: 'active',
      });

      // Update sos_profiles collection
      batch.update(doc(db, 'sos_profiles', profileId), {
        forcedAIAccess: true,
        hasActiveSubscription: true,
        subscriptionStatus: 'active',
      });
    }

    await batch.commit();
    migrated += chunk.length;
    console.log(`[AAA Migration] Migrated ${migrated}/${profilesToMigrate.length}`);
  }

  console.log(`[AAA Migration] ✅ Complete! Migrated ${migrated} profiles`);
  return { total: snapshot.size, toMigrate: profilesToMigrate.length, migrated };
}

// Exposer les fonctions globalement pour la console
if (typeof window !== 'undefined') {
  (window as any).generateLawyersAllCountries = generateLawyersAllCountries;
  (window as any).migrateSpecialtyCodes = {
    preview: previewMigration,
    migrateAll: migrateAllSpecialtyCodes,
    migrateOne: migrateOneProfile,
    checkAll: checkAllProfiles,
    // Fonctions pour les codes pays dans les bios
    previewBios: previewBioCountryFix,
    fixBios: fixAllBiosCountryCodes,
    fixOneBio: fixOneBioCountryCodes,
  };
  // P1 FIX: Migration for AAA profiles AI access
  (window as any).migrateAaaProfiles = migrateAaaProfilesForAIAccess;

  // Scripts de gestion des avis (reviews)
  (window as any).reviewsTools = {
    // Générer les avis manquants pour correspondre au reviewCount
    previewMissing: previewMissingReviews,
    generateMissing: generateMissingReviews,
    generateMissingForOne: generateMissingReviewsForOne,
    // Synchroniser les compteurs (ajuster reviewCount aux avis réels)
    previewSync: previewReviewCountSync,
    syncAll: syncAllReviewCounts,
    syncOne: syncOneProfileReviewCount,
  };
}

// ==========================================
// 🛡️ VALIDATION ET LOGGING DES SPÉCIALITÉS
// ==========================================

// Cache des codes valides pour performance
let validLawyerCodesCache: Set<string> | null = null;
let validExpatCodesCache: Set<string> | null = null;

const getValidLawyerCodes = (): Set<string> => {
  if (!validLawyerCodesCache) {
    validLawyerCodesCache = new Set(flattenLawyerSpecialities().map(s => s.code));
  }
  return validLawyerCodesCache;
};

const getValidExpatCodes = (): Set<string> => {
  if (!validExpatCodesCache) {
    validExpatCodesCache = new Set(expatHelpTypesData.filter(t => !t.disabled).map(t => t.code));
  }
  return validExpatCodesCache;
};

/**
 * Valide un code de spécialité selon le type de profil
 */
const isValidSpecialtyCode = (code: string, profileType: 'lawyer' | 'expat'): boolean => {
  if (profileType === 'lawyer') {
    return getValidLawyerCodes().has(code);
  } else {
    return getValidExpatCodes().has(code);
  }
};

/**
 * Valide et filtre les codes de spécialité, retourne uniquement les codes valides
 */
const validateAndFilterSpecialties = (
  codes: string[],
  profileType: 'lawyer' | 'expat',
  enableLogging: boolean = true
): { valid: string[]; invalid: string[] } => {
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const code of codes) {
    if (isValidSpecialtyCode(code, profileType)) {
      valid.push(code);
    } else {
      invalid.push(code);
      if (enableLogging) {
        console.warn(`[AAA] ⚠️ Code spécialité invalide détecté: "${code}" pour ${profileType}`);
      }
    }
  }

  if (enableLogging && invalid.length > 0) {
    console.error(`[AAA] ❌ ${invalid.length} code(s) invalide(s) filtré(s):`, invalid);
  }

  return { valid, invalid };
};

/**
 * Log détaillé de la génération d'un profil
 */
const logProfileGeneration = (
  uid: string,
  role: 'lawyer' | 'expat',
  specialties: string[],
  country: string
) => {
  // Debug logging removed for production
};

/**
 * Vérifie un profil après génération
 */
const verifyGeneratedProfile = async (
  uid: string,
  role: 'lawyer' | 'expat',
  specialties: string[]
): Promise<{ success: boolean; issues: string[] }> => {
  const issues: string[] = [];

  // Vérifier que les spécialités sont valides
  const { invalid } = validateAndFilterSpecialties(specialties, role, false);
  if (invalid.length > 0) {
    issues.push(`Codes invalides: ${invalid.join(', ')}`);
  }

  // Vérifier le nombre de spécialités
  if (specialties.length < 1) {
    issues.push('Aucune spécialité assignée');
  }
  if (specialties.length > 10) {
    issues.push(`Trop de spécialités (${specialties.length})`);
  }

  return {
    success: issues.length === 0,
    issues
  };
};

// ✅ IMPORTS CORRIGÉS depuis slugGenerator (generateSlug non utilisé - généré par ProviderProfile)
import { 
  slugify,
  LANGUAGE_TO_I18N,
  getLanguageCode,
  formatPublicName,
  COUNTRY_TO_MAIN_LANGUAGE
} from '../../utils/slugGenerator';

// ==========================================
// 🌍 COORDONNÉES GPS RÉALISTES PAR PAYS
// ==========================================
const COUNTRY_COORDINATES: Record<string, Array<{ city: string; lat: number; lng: number }>> = {
  // Europe francophone
  'France': [
    { city: 'Paris', lat: 48.8566, lng: 2.3522 },
    { city: 'Lyon', lat: 45.7640, lng: 4.8357 },
    { city: 'Marseille', lat: 43.2965, lng: 5.3698 },
    { city: 'Toulouse', lat: 43.6047, lng: 1.4442 },
    { city: 'Nice', lat: 43.7102, lng: 7.2620 }
  ],
  'Belgique': [
    { city: 'Bruxelles', lat: 50.8503, lng: 4.3517 },
    { city: 'Anvers', lat: 51.2194, lng: 4.4025 },
    { city: 'Gand', lat: 51.0543, lng: 3.7174 }
  ],
  'Suisse': [
    { city: 'Zurich', lat: 47.3769, lng: 8.5417 },
    { city: 'Genève', lat: 46.2044, lng: 6.1432 },
    { city: 'Lausanne', lat: 46.5197, lng: 6.6323 }
  ],
  'Canada': [
    { city: 'Montréal', lat: 45.5017, lng: -73.5673 },
    { city: 'Québec', lat: 46.8139, lng: -71.2080 },
    { city: 'Toronto', lat: 43.6532, lng: -79.3832 },
    { city: 'Vancouver', lat: 49.2827, lng: -123.1207 }
  ],
  
  // Asie du Sud-Est
  'Thaïlande': [
    { city: 'Bangkok', lat: 13.7563, lng: 100.5018 },
    { city: 'Chiang Mai', lat: 18.7883, lng: 98.9853 },
    { city: 'Phuket', lat: 7.8804, lng: 98.3923 },
    { city: 'Pattaya', lat: 12.9236, lng: 100.8825 }
  ],
  'Vietnam': [
    { city: 'Hô-Chi-Minh-Ville', lat: 10.8231, lng: 106.6297 },
    { city: 'Hanoï', lat: 21.0285, lng: 105.8542 },
    { city: 'Da Nang', lat: 16.0544, lng: 108.2022 }
  ],
  'Cambodge': [
    { city: 'Phnom Penh', lat: 11.5564, lng: 104.9282 },
    { city: 'Siem Reap', lat: 13.3671, lng: 103.8448 }
  ],
  
  // Amérique du Nord
  'États-Unis': [
    { city: 'New York', lat: 40.7128, lng: -74.0060 },
    { city: 'Los Angeles', lat: 34.0522, lng: -118.2437 },
    { city: 'Miami', lat: 25.7617, lng: -80.1918 },
    { city: 'San Francisco', lat: 37.7749, lng: -122.4194 }
  ],
  'Mexique': [
    { city: 'Mexico', lat: 19.4326, lng: -99.1332 },
    { city: 'Cancún', lat: 21.1619, lng: -86.8515 },
    { city: 'Guadalajara', lat: 20.6597, lng: -103.3496 }
  ],
  
  // Europe
  'Espagne': [
    { city: 'Madrid', lat: 40.4168, lng: -3.7038 },
    { city: 'Barcelone', lat: 41.3851, lng: 2.1734 },
    { city: 'Valencia', lat: 39.4699, lng: -0.3763 },
    { city: 'Séville', lat: 37.3891, lng: -5.9845 }
  ],
  'Portugal': [
    { city: 'Lisbonne', lat: 38.7223, lng: -9.1393 },
    { city: 'Porto', lat: 41.1579, lng: -8.6291 },
    { city: 'Faro', lat: 37.0194, lng: -7.9322 }
  ],
  'Allemagne': [
    { city: 'Berlin', lat: 52.5200, lng: 13.4050 },
    { city: 'Munich', lat: 48.1351, lng: 11.5820 },
    { city: 'Francfort', lat: 50.1109, lng: 8.6821 },
    { city: 'Hambourg', lat: 53.5511, lng: 9.9937 }
  ],
  'Royaume-Uni': [
    { city: 'Londres', lat: 51.5074, lng: -0.1278 },
    { city: 'Manchester', lat: 53.4808, lng: -2.2426 },
    { city: 'Édimbourg', lat: 55.9533, lng: -3.1883 }
  ],
  'Italie': [
    { city: 'Rome', lat: 41.9028, lng: 12.4964 },
    { city: 'Milan', lat: 45.4642, lng: 9.1900 },
    { city: 'Florence', lat: 43.7696, lng: 11.2558 }
  ],
  
  // Océanie
  'Australie': [
    { city: 'Sydney', lat: -33.8688, lng: 151.2093 },
    { city: 'Melbourne', lat: -37.8136, lng: 144.9631 },
    { city: 'Brisbane', lat: -27.4698, lng: 153.0251 },
    { city: 'Perth', lat: -31.9505, lng: 115.8605 }
  ],
  'Nouvelle-Zélande': [
    { city: 'Auckland', lat: -36.8485, lng: 174.7633 },
    { city: 'Wellington', lat: -41.2865, lng: 174.7762 }
  ],
  
  // Afrique du Nord
  'Maroc': [
    { city: 'Casablanca', lat: 33.5731, lng: -7.5898 },
    { city: 'Rabat', lat: 34.0209, lng: -6.8416 },
    { city: 'Marrakech', lat: 31.6295, lng: -7.9811 }
  ],
  'Tunisie': [
    { city: 'Tunis', lat: 36.8065, lng: 10.1815 },
    { city: 'Sfax', lat: 34.7406, lng: 10.7603 }
  ],
  
  // Asie
  'Japon': [
    { city: 'Tokyo', lat: 35.6762, lng: 139.6503 },
    { city: 'Osaka', lat: 34.6937, lng: 135.5023 },
    { city: 'Kyoto', lat: 35.0116, lng: 135.7681 }
  ],
  'Chine': [
    { city: 'Pékin', lat: 39.9042, lng: 116.4074 },
    { city: 'Shanghai', lat: 31.2304, lng: 121.4737 },
    { city: 'Hong Kong', lat: 22.3193, lng: 114.1694 }
  ],
  'Singapour': [
    { city: 'Singapour', lat: 1.3521, lng: 103.8198 }
  ],
  'Inde': [
    { city: 'Mumbai', lat: 19.0760, lng: 72.8777 },
    { city: 'Delhi', lat: 28.7041, lng: 77.1025 },
    { city: 'Bangalore', lat: 12.9716, lng: 77.5946 }
  ],
  
  // Moyen-Orient
  'Émirats arabes unis': [
    { city: 'Dubaï', lat: 25.2048, lng: 55.2708 },
    { city: 'Abu Dhabi', lat: 24.4539, lng: 54.3773 }
  ],
  'Israël': [
    { city: 'Tel Aviv', lat: 32.0853, lng: 34.7818 },
    { city: 'Jérusalem', lat: 31.7683, lng: 35.2137 }
  ],
  
  // Amérique du Sud
  'Brésil': [
    { city: 'São Paulo', lat: -23.5505, lng: -46.6333 },
    { city: 'Rio de Janeiro', lat: -22.9068, lng: -43.1729 },
    { city: 'Brasília', lat: -15.8267, lng: -47.9218 }
  ],
  'Argentine': [
    { city: 'Buenos Aires', lat: -34.6037, lng: -58.3816 },
    { city: 'Córdoba', lat: -31.4201, lng: -64.1888 }
  ],
  'Chili': [
    { city: 'Santiago', lat: -33.4489, lng: -70.6693 },
    { city: 'Valparaíso', lat: -33.0472, lng: -71.6127 }
  ],
};

// Fonction pour obtenir une coordonnée aléatoire pour un pays
const getCountryCoordinates = (country: string): { lat: number; lng: number } => {
  const coords = COUNTRY_COORDINATES[country];
  if (coords && coords.length > 0) {
    const selected = coords[Math.floor(Math.random() * coords.length)];
    // Ajouter une légère variation (±0.05°) pour éviter les doublons exacts
    return {
      lat: selected.lat + (Math.random() - 0.5) * 0.1,
      lng: selected.lng + (Math.random() - 0.5) * 0.1
    };
  }
  // Fallback : coordonnées mondiales aléatoires
  return {
    lat: -40 + Math.random() * 80,
    lng: -180 + Math.random() * 360
  };
};

// ==========================================
// 🎓 UNIVERSITÉS PAR PAYS (3-5 par pays)
// ==========================================
const UNIVERSITIES_BY_COUNTRY: Record<string, string[]> = {
  'France': [
    'Université Paris 1 Panthéon-Sorbonne',
    'Université Paris 2 Panthéon-Assas',
    'Université de Lyon',
    'Université d\'Aix-Marseille',
    'Université de Toulouse'
  ],
  'Belgique': [
    'Université Libre de Bruxelles',
    'Université Catholique de Louvain',
    'Université de Liège'
  ],
  'Suisse': [
    'Université de Genève',
    'Université de Lausanne',
    'Université de Zurich'
  ],
  'Canada': [
    'Université de Montréal',
    'Université McGill',
    'Université de Toronto',
    'Université de British Columbia'
  ],
  'Thaïlande': [
    'Chulalongkorn University',
    'Thammasat University',
    'Mahidol University'
  ],
  'Vietnam': [
    'Vietnam National University',
    'Ho Chi Minh City University of Law',
    'Hanoi Law University'
  ],
  'États-Unis': [
    'Harvard Law School',
    'Stanford Law School',
    'Yale Law School',
    'Columbia Law School',
    'NYU School of Law'
  ],
  'Royaume-Uni': [
    'University of Oxford',
    'University of Cambridge',
    'London School of Economics',
    'King\'s College London'
  ],
  'Espagne': [
    'Universidad Complutense de Madrid',
    'Universidad de Barcelona',
    'Universidad de Valencia'
  ],
  'Allemagne': [
    'Humboldt-Universität zu Berlin',
    'Ludwig-Maximilians-Universität München',
    'Universität Frankfurt'
  ],
  'Australie': [
    'University of Sydney',
    'University of Melbourne',
    'Australian National University'
  ],
  'Japon': [
    'University of Tokyo',
    'Kyoto University',
    'Waseda University'
  ],
  'Brésil': [
    'Universidade de São Paulo',
    'Universidade Federal do Rio de Janeiro',
    'Pontifícia Universidade Católica'
  ],
  // Fallback générique pour les pays non listés
  '_DEFAULT': [
    'Université Nationale',
    'École Supérieure de Droit',
    'Institut Universitaire'
  ]
};

const getUniversity = (country: string): string => {
  const universities = UNIVERSITIES_BY_COUNTRY[country] || UNIVERSITIES_BY_COUNTRY['_DEFAULT'];
  return universities[Math.floor(Math.random() * universities.length)];
};

// ==========================================
// ⏱️ TEMPS DE RÉPONSE VARIÉS
// ==========================================
const RESPONSE_TIMES = [
  '< 5 minutes',
];

const getResponseTime = (): string => {
  return RESPONSE_TIMES[0]; // 100% : < 5 min
};

// ==========================================
// 🌍 GÉNÉRATION DE PAYS PRÉCÉDENTS (0-3)
// ==========================================
const getPreviousCountries = (currentCountry: string, allCountries: string[]): string[] => {
  const count = Math.floor(Math.random() * 4); // 0 à 3 pays
  if (count === 0) return [];
  
  const available = allCountries.filter(c => c !== currentCountry);
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

// ==========================================
// 📅 ANNÉE DE DIPLÔME RÉALISTE
// ==========================================
const getGraduationYear = (experience: number, minAge: number = 27): number => {
  // Âge moyen de fin d'études : 25 ans pour un avocat, 23 pour un expat
  const studyCompletionAge = minAge === 27 ? 25 : 23;
  const currentYear = new Date().getFullYear();
  // Année de diplôme = année actuelle - expérience - années depuis fin d'études
  const graduationYear = currentYear - experience - Math.floor(Math.random() * 3);
  return graduationYear;
};

// ==========================================
// 🎯 HELPERS
// ==========================================

const getCountryNames = (): string[] => {
  return countriesData
    .filter(country => country.code !== 'SEPARATOR' && !country.disabled)
    .map(country => country.nameFr);
};

const getLanguageNames = (): string[] => {
  return languagesData.map(lang => lang.name);
};

const getLawyerSpecialtyCodes = (): string[] => {
  return flattenLawyerSpecialities().map(spec => spec.code);
};

const getExpatHelpTypeCodes = (): string[] => {
  return expatHelpTypesData.filter(type => !type.disabled).map(type => type.code);
};

const COUNTRIES_LIST = getCountryNames();
const LANGUAGE_OPTIONS = getLanguageNames();
const LAWYER_SPECIALTIES = getLawyerSpecialtyCodes();
const EXPAT_HELP_TYPES = getExpatHelpTypeCodes();

// ==========================================
// 🌍 MAPPINGS PAYS ET LANGUES
// ==========================================

/**
 * Convertit un nom de pays en code ISO
 */
const getCountryCode = (countryName: string): string => {
  if (!countryName) return 'FR';
  
  // Si c'est déjà un code ISO (2 lettres majuscules)
  if (countryName.length === 2 && countryName === countryName.toUpperCase()) {
    return countryName;
  }
  
  // Mapping inverse nom -> code
  const NAME_TO_ISO: Record<string, string> = {
    'Afghanistan': 'AF', 'Albanie': 'AL', 'Algérie': 'DZ', 'Allemagne': 'DE', 'Andorre': 'AD',
    'Angola': 'AO', 'Argentine': 'AR', 'Arménie': 'AM', 'Australie': 'AU', 'Autriche': 'AT',
    'Azerbaïdjan': 'AZ', 'Bahamas': 'BS', 'Bahreïn': 'BH', 'Bangladesh': 'BD', 'Barbade': 'BB',
    'Belgique': 'BE', 'Belize': 'BZ', 'Bénin': 'BJ', 'Bhoutan': 'BT', 'Biélorussie': 'BY',
    'Bolivie': 'BO', 'Bosnie-Herzégovine': 'BA', 'Botswana': 'BW', 'Brésil': 'BR', 'Brunei': 'BN',
    'Bulgarie': 'BG', 'Burkina Faso': 'BF', 'Burundi': 'BI', 'Cambodge': 'KH', 'Cameroun': 'CM',
    'Canada': 'CA', 'Cap-Vert': 'CV', 'Centrafrique': 'CF', 'Chili': 'CL', 'Chine': 'CN',
    'Chypre': 'CY', 'Colombie': 'CO', 'Comores': 'KM', 'Congo': 'CG', 'Corée du Nord': 'KP',
    'Corée du Sud': 'KR', 'Costa Rica': 'CR', "Côte d'Ivoire": 'CI', 'Croatie': 'HR', 'Cuba': 'CU',
    'Danemark': 'DK', 'Djibouti': 'DJ', 'Dominique': 'DM', 'Égypte': 'EG', 'Émirats Arabes Unis': 'AE',
    'Équateur': 'EC', 'Érythrée': 'ER', 'Espagne': 'ES', 'Estonie': 'EE', 'États-Unis': 'US',
    'Éthiopie': 'ET', 'Fidji': 'FJ', 'Finlande': 'FI', 'France': 'FR', 'Gabon': 'GA',
    'Gambie': 'GM', 'Géorgie': 'GE', 'Ghana': 'GH', 'Grèce': 'GR', 'Grenade': 'GD',
    'Guatemala': 'GT', 'Guinée': 'GN', 'Guinée-Bissau': 'GW', 'Guinée Équatoriale': 'GQ', 'Guyana': 'GY',
    'Haïti': 'HT', 'Honduras': 'HN', 'Hongrie': 'HU', 'Îles Marshall': 'MH', 'Îles Salomon': 'SB',
    'Inde': 'IN', 'Indonésie': 'ID', 'Irak': 'IQ', 'Iran': 'IR', 'Irlande': 'IE',
    'Islande': 'IS', 'Israël': 'IL', 'Italie': 'IT', 'Jamaïque': 'JM', 'Japon': 'JP',
    'Jordanie': 'JO', 'Kazakhstan': 'KZ', 'Kenya': 'KE', 'Kirghizistan': 'KG', 'Kiribati': 'KI',
    'Koweït': 'KW', 'Laos': 'LA', 'Lesotho': 'LS', 'Lettonie': 'LV', 'Liban': 'LB',
    'Liberia': 'LR', 'Libye': 'LY', 'Liechtenstein': 'LI', 'Lituanie': 'LT', 'Luxembourg': 'LU',
    'Madagascar': 'MG', 'Malaisie': 'MY', 'Malawi': 'MW', 'Maldives': 'MV', 'Mali': 'ML',
    'Malte': 'MT', 'Maroc': 'MA', 'Maurice': 'MU', 'Mauritanie': 'MR', 'Mexique': 'MX',
    'Micronésie': 'FM', 'Moldavie': 'MD', 'Monaco': 'MC', 'Mongolie': 'MN', 'Monténégro': 'ME',
    'Mozambique': 'MZ', 'Myanmar': 'MM', 'Namibie': 'NA', 'Nauru': 'NR', 'Népal': 'NP',
    'Nicaragua': 'NI', 'Niger': 'NE', 'Nigeria': 'NG', 'Norvège': 'NO', 'Nouvelle-Zélande': 'NZ',
    'Oman': 'OM', 'Ouganda': 'UG', 'Ouzbékistan': 'UZ', 'Pakistan': 'PK', 'Palaos': 'PW',
    'Palestine': 'PS', 'Panama': 'PA', 'Papouasie-Nouvelle-Guinée': 'PG', 'Paraguay': 'PY', 'Pays-Bas': 'NL',
    'Pérou': 'PE', 'Philippines': 'PH', 'Pologne': 'PL', 'Portugal': 'PT', 'Qatar': 'QA',
    'RD Congo': 'CD', 'Rép. Dominicaine': 'DO', 'Roumanie': 'RO', 'Royaume-Uni': 'GB', 'Russie': 'RU',
    'Rwanda': 'RW', 'Saint-Kitts-et-Nevis': 'KN', 'Saint-Marin': 'SM', 'Saint-Vincent': 'VC', 'Sainte-Lucie': 'LC',
    'Salvador': 'SV', 'Samoa': 'WS', 'Sao Tomé-et-Príncipe': 'ST', 'Sénégal': 'SN', 'Serbie': 'RS',
    'Seychelles': 'SC', 'Sierra Leone': 'SL', 'Singapour': 'SG', 'Slovaquie': 'SK', 'Slovénie': 'SI',
    'Somalie': 'SO', 'Soudan': 'SD', 'Soudan du Sud': 'SS', 'Sri Lanka': 'LK', 'Suède': 'SE',
    'Suisse': 'CH', 'Suriname': 'SR', 'Syrie': 'SY', 'Tadjikistan': 'TJ', 'Taïwan': 'TW',
    'Tanzanie': 'TZ', 'Tchad': 'TD', 'Tchéquie': 'CZ', 'Thaïlande': 'TH', 'Timor oriental': 'TL',
    'Togo': 'TG', 'Tonga': 'TO', 'Trinité-et-Tobago': 'TT', 'Tunisie': 'TN', 'Turkménistan': 'TM',
    'Turquie': 'TR', 'Tuvalu': 'TV', 'Ukraine': 'UA', 'Uruguay': 'UY', 'Vanuatu': 'VU',
    'Vatican': 'VA', 'Venezuela': 'VE', 'Vietnam': 'VN', 'Yémen': 'YE', 'Zambie': 'ZM', 'Zimbabwe': 'ZW',
    'Afrique du Sud': 'ZA', 'Arabie Saoudite': 'SA', 'Eswatini': 'SZ'
  };
  
  if (NAME_TO_ISO[countryName]) {
    return NAME_TO_ISO[countryName];
  }
  
  // Fallback sur countriesData
  const country = countriesData.find(c => c.nameFr === countryName);
  return country?.code || countryName;
};

/**
 * ✅ NOUVEAU: Convertit un code ISO en nom de pays complet
 */
const getCountryNameFromCode = (code: string): string => {
  if (!code) return '-';
  
  // Mapping direct des codes ISO les plus courants
  const ISO_COUNTRY_MAP: Record<string, string> = {
    'AF': 'Afghanistan', 'AL': 'Albanie', 'DZ': 'Algérie', 'AD': 'Andorre', 'AO': 'Angola',
    'AR': 'Argentine', 'AM': 'Arménie', 'AU': 'Australie', 'AT': 'Autriche', 'AZ': 'Azerbaïdjan',
    'BS': 'Bahamas', 'BH': 'Bahreïn', 'BD': 'Bangladesh', 'BB': 'Barbade', 'BY': 'Biélorussie',
    'BE': 'Belgique', 'BZ': 'Belize', 'BJ': 'Bénin', 'BT': 'Bhoutan', 'BO': 'Bolivie',
    'BA': 'Bosnie-Herzégovine', 'BW': 'Botswana', 'BR': 'Brésil', 'BN': 'Brunei', 'BG': 'Bulgarie',
    'BF': 'Burkina Faso', 'BI': 'Burundi', 'KH': 'Cambodge', 'CM': 'Cameroun', 'CA': 'Canada',
    'CV': 'Cap-Vert', 'CF': 'Centrafrique', 'TD': 'Tchad', 'CL': 'Chili', 'CN': 'Chine',
    'CO': 'Colombie', 'KM': 'Comores', 'CG': 'Congo', 'CD': 'RD Congo', 'CR': 'Costa Rica',
    'CI': "Côte d'Ivoire", 'HR': 'Croatie', 'CU': 'Cuba', 'CY': 'Chypre', 'CZ': 'Tchéquie',
    'DK': 'Danemark', 'DJ': 'Djibouti', 'DM': 'Dominique', 'DO': 'Rép. Dominicaine', 'EC': 'Équateur',
    'EG': 'Égypte', 'SV': 'Salvador', 'GQ': 'Guinée Équatoriale', 'ER': 'Érythrée', 'EE': 'Estonie',
    'SZ': 'Eswatini', 'ET': 'Éthiopie', 'FJ': 'Fidji', 'FI': 'Finlande', 'FR': 'France',
    'GA': 'Gabon', 'GM': 'Gambie', 'GE': 'Géorgie', 'DE': 'Allemagne', 'GH': 'Ghana',
    'GR': 'Grèce', 'GD': 'Grenade', 'GT': 'Guatemala', 'GN': 'Guinée', 'GW': 'Guinée-Bissau',
    'GY': 'Guyana', 'HT': 'Haïti', 'HN': 'Honduras', 'HU': 'Hongrie', 'IS': 'Islande',
    'IN': 'Inde', 'ID': 'Indonésie', 'IR': 'Iran', 'IQ': 'Irak', 'IE': 'Irlande',
    'IL': 'Israël', 'IT': 'Italie', 'JM': 'Jamaïque', 'JP': 'Japon', 'JO': 'Jordanie',
    'KZ': 'Kazakhstan', 'KE': 'Kenya', 'KI': 'Kiribati', 'KP': 'Corée du Nord', 'KR': 'Corée du Sud',
    'KW': 'Koweït', 'KG': 'Kirghizistan', 'LA': 'Laos', 'LV': 'Lettonie', 'LB': 'Liban',
    'LS': 'Lesotho', 'LR': 'Liberia', 'LY': 'Libye', 'LI': 'Liechtenstein', 'LT': 'Lituanie',
    'LU': 'Luxembourg', 'MG': 'Madagascar', 'MW': 'Malawi', 'MY': 'Malaisie', 'MV': 'Maldives',
    'ML': 'Mali', 'MT': 'Malte', 'MH': 'Îles Marshall', 'MR': 'Mauritanie', 'MU': 'Maurice',
    'MX': 'Mexique', 'FM': 'Micronésie', 'MD': 'Moldavie', 'MC': 'Monaco', 'MN': 'Mongolie',
    'ME': 'Monténégro', 'MA': 'Maroc', 'MZ': 'Mozambique', 'MM': 'Myanmar', 'NA': 'Namibie',
    'NR': 'Nauru', 'NP': 'Népal', 'NL': 'Pays-Bas', 'NZ': 'Nouvelle-Zélande', 'NI': 'Nicaragua',
    'NE': 'Niger', 'NG': 'Nigeria', 'NO': 'Norvège', 'OM': 'Oman', 'PK': 'Pakistan',
    'PW': 'Palaos', 'PS': 'Palestine', 'PA': 'Panama', 'PG': 'Papouasie-Nouvelle-Guinée', 'PY': 'Paraguay',
    'PE': 'Pérou', 'PH': 'Philippines', 'PL': 'Pologne', 'PT': 'Portugal', 'QA': 'Qatar',
    'RO': 'Roumanie', 'RU': 'Russie', 'RW': 'Rwanda', 'KN': 'Saint-Kitts-et-Nevis', 'LC': 'Sainte-Lucie',
    'VC': 'Saint-Vincent', 'WS': 'Samoa', 'SM': 'Saint-Marin', 'ST': 'Sao Tomé-et-Príncipe', 'SA': 'Arabie Saoudite',
    'SN': 'Sénégal', 'RS': 'Serbie', 'SC': 'Seychelles', 'SL': 'Sierra Leone', 'SG': 'Singapour',
    'SK': 'Slovaquie', 'SI': 'Slovénie', 'SB': 'Îles Salomon', 'SO': 'Somalie', 'ZA': 'Afrique du Sud',
    'SS': 'Soudan du Sud', 'ES': 'Espagne', 'LK': 'Sri Lanka', 'SD': 'Soudan', 'SR': 'Suriname',
    'SE': 'Suède', 'CH': 'Suisse', 'SY': 'Syrie', 'TW': 'Taïwan', 'TJ': 'Tadjikistan',
    'TZ': 'Tanzanie', 'TH': 'Thaïlande', 'TL': 'Timor oriental', 'TG': 'Togo', 'TO': 'Tonga',
    'TT': 'Trinité-et-Tobago', 'TN': 'Tunisie', 'TR': 'Turquie', 'TM': 'Turkménistan', 'TV': 'Tuvalu',
    'UG': 'Ouganda', 'UA': 'Ukraine', 'AE': 'Émirats Arabes Unis', 'GB': 'Royaume-Uni', 'US': 'États-Unis',
    'UY': 'Uruguay', 'UZ': 'Ouzbékistan', 'VU': 'Vanuatu', 'VA': 'Vatican', 'VE': 'Venezuela',
    'VN': 'Vietnam', 'YE': 'Yémen', 'ZM': 'Zambie', 'ZW': 'Zimbabwe'
  };
  
  // Chercher dans le mapping direct
  if (ISO_COUNTRY_MAP[code.toUpperCase()]) {
    return ISO_COUNTRY_MAP[code.toUpperCase()];
  }
  
  // Fallback sur countriesData
  const country = countriesData.find(c => c.code === code || c.code === code.toUpperCase());
  return country?.nameFr || code;
};

/**
 * ✅ NOUVEAU: Convertit un code de langue en nom complet
 */
const getLanguageNameFromCode = (code: string): string => {
  if (!code) return code;
  
  // Mapping direct des codes ISO 639-1 les plus courants
  const ISO_LANGUAGE_MAP: Record<string, string> = {
    'fr': 'Français', 'en': 'Anglais', 'es': 'Espagnol', 'de': 'Allemand', 'it': 'Italien',
    'pt': 'Portugais', 'ru': 'Russe', 'zh': 'Chinois', 'ch': 'Chinois', 'ja': 'Japonais', 'ko': 'Coréen',
    'ar': 'Arabe', 'hi': 'Hindi', 'bn': 'Bengali', 'pa': 'Pendjabi', 'vi': 'Vietnamien',
    'th': 'Thaï', 'tr': 'Turc', 'pl': 'Polonais', 'uk': 'Ukrainien', 'nl': 'Néerlandais',
    'sv': 'Suédois', 'no': 'Norvégien', 'da': 'Danois', 'fi': 'Finnois', 'el': 'Grec',
    'he': 'Hébreu', 'cs': 'Tchèque', 'sk': 'Slovaque', 'hu': 'Hongrois', 'ro': 'Roumain',
    'bg': 'Bulgare', 'hr': 'Croate', 'sr': 'Serbe', 'sl': 'Slovène', 'et': 'Estonien',
    'lv': 'Letton', 'lt': 'Lituanien', 'id': 'Indonésien', 'ms': 'Malais', 'tl': 'Tagalog',
    'sw': 'Swahili', 'am': 'Amharique', 'fa': 'Persan', 'ur': 'Ourdou', 'ta': 'Tamoul',
    'te': 'Télougou', 'ml': 'Malayalam', 'kn': 'Kannada', 'mr': 'Marathi', 'gu': 'Gujarati',
    'ne': 'Népalais', 'si': 'Cingalais', 'my': 'Birman', 'km': 'Khmer', 'lo': 'Lao',
    'ka': 'Géorgien', 'hy': 'Arménien', 'az': 'Azéri', 'kk': 'Kazakh', 'uz': 'Ouzbek',
    'mn': 'Mongol', 'af': 'Afrikaans', 'zu': 'Zoulou', 'xh': 'Xhosa', 'yo': 'Yoruba',
    'ig': 'Igbo', 'ha': 'Haoussa', 'so': 'Somali', 'rw': 'Kinyarwanda', 'mg': 'Malgache'
  };
  
  const codeLower = code.toLowerCase();
  
  // Chercher dans le mapping direct
  if (ISO_LANGUAGE_MAP[codeLower]) {
    return ISO_LANGUAGE_MAP[codeLower];
  }
  
  // Si c'est déjà un nom complet (première lettre majuscule et plus de 2 caractères)
  if (code.length > 2 && code[0] === code[0].toUpperCase()) {
    return code;
  }
  
  // Fallback sur languagesData
  const lang = languagesData.find(l => l.code?.toLowerCase() === codeLower);
  return lang?.name || code;
};

/**
 * ✅ NOUVEAU: Convertit un nom de langue en code ISO
 */
const getLanguageCodeLocal = (languageName: string): string => {
  if (!languageName) return 'fr';
  
  // Si c'est déjà un code ISO (2 lettres minuscules)
  if (languageName.length === 2 && languageName === languageName.toLowerCase()) {
    return languageName;
  }
  
  // Mapping inverse nom -> code
  const NAME_TO_ISO: Record<string, string> = {
    'Français': 'fr', 'Anglais': 'en', 'Espagnol': 'es', 'Allemand': 'de', 'Italien': 'it',
    'Portugais': 'pt', 'Russe': 'ru', 'Chinois': 'zh', 'Japonais': 'ja', 'Coréen': 'ko',
    'Arabe': 'ar', 'Hindi': 'hi', 'Bengali': 'bn', 'Pendjabi': 'pa', 'Vietnamien': 'vi',
    'Thaï': 'th', 'Turc': 'tr', 'Polonais': 'pl', 'Ukrainien': 'uk', 'Néerlandais': 'nl',
    'Suédois': 'sv', 'Norvégien': 'no', 'Danois': 'da', 'Finnois': 'fi', 'Grec': 'el',
    'Hébreu': 'he', 'Tchèque': 'cs', 'Slovaque': 'sk', 'Hongrois': 'hu', 'Roumain': 'ro',
    'Bulgare': 'bg', 'Croate': 'hr', 'Serbe': 'sr', 'Slovène': 'sl', 'Estonien': 'et',
    'Letton': 'lv', 'Lituanien': 'lt', 'Indonésien': 'id', 'Malais': 'ms', 'Tagalog': 'tl',
    'Swahili': 'sw', 'Amharique': 'am', 'Persan': 'fa', 'Ourdou': 'ur', 'Tamoul': 'ta',
    'Télougou': 'te', 'Malayalam': 'ml', 'Kannada': 'kn', 'Marathi': 'mr', 'Gujarati': 'gu',
    'Népalais': 'ne', 'Cingalais': 'si', 'Birman': 'my', 'Khmer': 'km', 'Lao': 'lo',
    'Géorgien': 'ka', 'Arménien': 'hy', 'Azéri': 'az', 'Kazakh': 'kk', 'Ouzbek': 'uz',
    'Mongol': 'mn', 'Afrikaans': 'af', 'Zoulou': 'zu', 'Xhosa': 'xh', 'Yoruba': 'yo',
    'Igbo': 'ig', 'Haoussa': 'ha', 'Somali': 'so', 'Kinyarwanda': 'rw', 'Malgache': 'mg'
  };
  
  if (NAME_TO_ISO[languageName]) {
    return NAME_TO_ISO[languageName];
  }
  
  // Essayer getLanguageCode importé
  try {
    const code = getLanguageCode(languageName);
    if (code && code !== languageName) return code;
  } catch { /* getLanguageCode may throw for unknown languages — fallback below */ }
  
  // Fallback: retourner le nom tel quel (peut être un code déjà)
  return languageName.toLowerCase().slice(0, 2);
};

/**
 * Convertit un nom de langue en code ISO
 */
const getLanguageCodesFromNames = (languageNames: string[]): string[] => {
  return languageNames.map(name => {
    const langCode = getLanguageCode(name);
    return langCode || 'fr';
  });
};

const START_DATE = new Date('2025-08-20');
const TODAY = new Date();

// ==========================================
// 🎯 SYSTÈME DE TRACKING PERSISTANT - ZÉRO DOUBLON
// ==========================================

interface UsedContent {
  type: 'bio' | 'review';
  role?: string;
  langCode: string;
  index: number;
  key?: string;
  usedAt: any;
  profileId?: string;
}

// Cache en mémoire pour éviter trop de lectures Firestore
const memoryCache = {
  usedBios: new Map<string, Set<number>>(),
  usedReviews: new Map<string, Set<string>>(),
  isLoaded: false
};

/**
 * 📄 Charge tout le contenu déjà utilisé depuis Firestore
 * Appelé au démarrage et avant chaque génération
 */
async function loadUsedContent(): Promise<void> {
  if (memoryCache.isLoaded) return;
  
  try {
    const usedContentRef = collection(db, 'aaa_used_content');
    const snapshot = await getDocs(usedContentRef);
    
    let biosCount = 0;
    let reviewsCount = 0;
    
    snapshot.forEach(doc => {
      const data = doc.data() as UsedContent;
      
      if (data.type === 'bio' && data.role) {
        const key = `${data.role}_${data.langCode}`;
        if (!memoryCache.usedBios.has(key)) {
          memoryCache.usedBios.set(key, new Set());
        }
        memoryCache.usedBios.get(key)!.add(data.index);
        biosCount++;
      }
      
      if (data.type === 'review') {
        const key = data.langCode;
        if (!memoryCache.usedReviews.has(key)) {
          memoryCache.usedReviews.set(key, new Set());
        }
        memoryCache.usedReviews.get(key)!.add(data.key!);
        reviewsCount++;
      }
    });
    
    memoryCache.isLoaded = true;
  } catch (error) {
    console.error('❌ Erreur lors du chargement du contenu:', error);
    throw new Error(`Impossible de charger le contenu utilisé: ${error}`);
  }
}

/**
 * 💾 Sauvegarde une bio comme utilisée dans Firestore
 */
async function saveUsedBio(
  role: Role,
  langCode: string,
  bioIndex: number,
  profileId: string
): Promise<void> {
  const docId = `bio_${role}_${langCode}_${bioIndex}`;
  
  try {
    await setDoc(doc(db, 'aaa_used_content', docId), {
      type: 'bio',
      role,
      langCode,
      index: bioIndex,
      profileId,
      usedAt: serverTimestamp()
    });
    
    // Mettre à jour le cache en mémoire
    const key = `${role}_${langCode}`;
    if (!memoryCache.usedBios.has(key)) {
      memoryCache.usedBios.set(key, new Set());
    }
    memoryCache.usedBios.get(key)!.add(bioIndex);
  } catch (error) {
    console.error('❌ Erreur sauvegarde bio:', error);
    throw error;
  }
}

/**
 * 💾 Sauvegarde un commentaire d'avis comme utilisé dans Firestore
 */
async function saveUsedReview(
  langCode: string,
  reviewKey: string,
  profileId: string
): Promise<void> {
  // Remplacer les points par underscores pour Firestore
  const cleanKey = reviewKey.replace(/\./g, '_');
  const docId = `review_${langCode}_${cleanKey}`;
  
  try {
    await setDoc(doc(db, 'aaa_used_content', docId), {
      type: 'review',
      langCode,
      key: reviewKey,
      profileId,
      usedAt: serverTimestamp()
    });
    
    // Mettre à jour le cache en mémoire
    if (!memoryCache.usedReviews.has(langCode)) {
      memoryCache.usedReviews.set(langCode, new Set());
    }
    memoryCache.usedReviews.get(langCode)!.add(reviewKey);
  } catch (error) {
    console.error('❌ Erreur sauvegarde review:', error);
    throw error;
  }
}

/**
 * 📋 Récupère toutes les clés de reviews disponibles
 * Construit dynamiquement la liste complète : 5 catégories × 80 commentaires = 400 reviews
 */
function getAllReviewKeys(): string[] {
  const categories = ['veryShort', 'short', 'medium', 'long', 'veryLong'];
  const keys: string[] = [];
  
  for (const category of categories) {
    for (let i = 1; i <= 80; i++) {
      keys.push(`admin.aaa.reviews.${category}.${i}`);
    }
  }
  
  return keys;
}

/**
 * 🎯 Obtient une bio unique garantie sans doublon
 * @throws Error si toutes les bios sont déjà utilisées
 */
async function getUniqueBio(
  t: any,
  role: Role,
  langCode: string,
  profileId: string
): Promise<string> {
  const bioKey = `admin.aaa.bio.${role}`;
  const templatesObj = t(bioKey, { returnObjects: true, lng: langCode });
  
  // ✅ CONVERTIR L'OBJET EN ARRAY
  let templates: string[] = [];
  if (templatesObj && typeof templatesObj === 'object' && !Array.isArray(templatesObj)) {
    templates = Object.values(templatesObj);
  } else if (Array.isArray(templatesObj)) {
    templates = templatesObj;
  }
  
  // Fallback si les templates ne sont pas chargés
  if (templates.length === 0) {
    console.warn(`⚠️ Aucun template trouvé pour ${bioKey} en ${langCode}`);
    const fallbackKey = role === 'lawyer' 
      ? 'admin.aaa.bio.lawyer.1' 
      : 'admin.aaa.bio.expat.1';
    return t(fallbackKey, { lng: langCode });
  }

  const key = `${role}_${langCode}`;
  const used = memoryCache.usedBios.get(key) || new Set<number>();
  
  // 🛑 VÉRIFICATION CRITIQUE : Toutes les bios sont-elles utilisées ?
  if (used.size >= templates.length) {
    const errorMessage = 
      `❌ PLUS DE BIOS DISPONIBLES - LIMITE ATTEINTE\n\n` +
      `📊 Statistiques:\n` +
      `   Type: ${role}\n` +
      `   Langue: ${langCode}\n` +
      `   Bios utilisées: ${used.size}/${templates.length}\n\n` +
      `💡 Solutions possibles:\n` +
      `   1. Ajoutez plus de bios dans le fichier JSON (recommandé 200+)\n` +
      `   2. Utilisez une autre langue\n` +
      `   3. Contactez le développeur pour augmenter les templates\n\n` +
      `📍 Chemin JSON: admin.aaa.bio.${role}`;
    
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
  
  // 🎲 Trouver un index non utilisé avec protection contre boucle infinie
  let index: number;
  let attempts = 0;
  const maxAttempts = templates.length * 10; // Sécurité : 10× le nombre de templates
  
  do {
    index = Math.floor(Math.random() * templates.length);
    attempts++;
    
    if (attempts > maxAttempts) {
      const errorMessage = 
        `❌ ERREUR SYSTÈME - Impossible de trouver une bio unique\n\n` +
        `Tentatives: ${attempts}/${maxAttempts}\n` +
        `Utilisées: ${used.size}/${templates.length}\n` +
        `Type: ${role}, Langue: ${langCode}\n\n` +
        `Cela ne devrait JAMAIS arriver. Contactez le développeur.`;
      
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
  } while (used.has(index));
  
  // 💾 Sauvegarder dans Firestore + cache
  await saveUsedBio(role, langCode, index, profileId);

  const percentage = Math.round(((used.size + 1) / templates.length) * 100);

  // ⚠️ Avertissement si on approche de la limite
  if (percentage >= 80) {
    console.warn(
      `⚠️ ATTENTION: ${percentage}% des bios ${role}_${langCode} sont utilisées!\n` +
      `   Il reste seulement ${templates.length - used.size - 1} bios disponibles.\n` +
      `   Préparez des templates supplémentaires.`
    );
  }

  return templates[index];
}

// ========================================
// 🌍 TRADUCTION DES CODES DE SPÉCIALITÉS
// ========================================

/**
 * Convertit les codes de spécialités en labels traduits
 * Utilise le specialtyMapper pour gérer les codes camelCase et SCREAMING_SNAKE_CASE
 * @example ["visVisaTravail"] → ["Visas et permis de séjour"]
 * @example ["URG_ASSISTANCE_PENALE_INTERNATIONALE"] → ["Assistance pénale internationale"]
 */
function translateSpecialtyCodes(
  codes: string[],
  role: Role,
  langCode: string
): string[] {
  const locale = mapLanguageToLocale(langCode);
  if (role === 'lawyer') {
    return codes.map(code => getSpecialtyLabel(code.trim(), locale));
  } else {
    return codes.map(code =>
      getExpatHelpTypeLabel(code.trim().toUpperCase(), langCode as 'fr' | 'en' | 'es' | 'de' | 'pt' | 'ru' | 'zh' | 'ar' | 'hi')
    );
  }
}

/**
 * 🛡️ Assure que la valeur est un nom de pays complet (pas un code ISO)
 * Si c'est un code ISO, le convertit en nom complet
 */
const ensureCountryName = (countryOrCode: string): string => {
  if (!countryOrCode) return '';

  // Si c'est déjà un nom complet (plus de 3 caractères et pas tout en majuscules)
  if (countryOrCode.length > 3 || !/^[A-Z]{2,3}$/.test(countryOrCode)) {
    // Vérifier si c'est dans la liste des noms de pays
    if (COUNTRIES_LIST.includes(countryOrCode)) {
      return countryOrCode;
    }
  }

  // Sinon, essayer de convertir depuis le code ISO
  const convertedName = getCountryNameFromCode(countryOrCode);
  if (convertedName !== '-' && convertedName !== countryOrCode) {
    return convertedName;
  }

  // Si pas trouvé, retourner tel quel
  return countryOrCode;
};

/**
 * 🌍 Génère une bio multilingue pour toutes les langues disponibles
 */
async function getMultilingualBio(
  t: any,
  role: Role,
  profileId: string,
  specialties: string[],
  country: string,
  experience: number
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const bioLanguages = ['fr', 'en', 'es', 'de', 'pt', 'ru', 'zh', 'ar', 'hi'];

  // 🛡️ S'assurer que c'est un nom de pays, pas un code ISO
  const countryName = ensureCountryName(country);

  for (const lang of bioLanguages) {
    try {
      const bioTemplate = await getUniqueBio(t, role, lang, profileId);

      // ✅ CORRECTION : Traduire les codes en labels
      const translatedSpecialties = translateSpecialtyCodes(specialties, role, lang);

      const bio = interpolateBio(bioTemplate, {
        specialties: translatedSpecialties.join(', '),
        help: translatedSpecialties.join(', '),
        services: translatedSpecialties.join(', '),
        country: countryName, // ✅ Utilise le nom complet, pas le code
        experience
      });
      result[lang] = bio;
    } catch (error) {
      console.error(`❌ Erreur génération bio ${role} en ${lang}:`, error);
      if (lang !== 'fr' && result['en']) {
        result[lang] = result['en'];
      }
    }
  }

  return result;
}

/**
 * 🌍 Génère une motivation multilingue pour expatriés
 */
async function getMultilingualMotivation(
  country: string,
  experience: number
): Promise<Record<string, string>> {
  // 🛡️ S'assurer que c'est un nom de pays, pas un code ISO
  const countryName = ensureCountryName(country);

  const motivationTemplates: Record<string, string[]> = {
    fr: [
      'Passionné par l\'aide aux expatriés à {country}',
      'Expert de la vie d\'expatrié à {country} depuis {experience} ans',
      'J\'accompagne les nouveaux arrivants à {country} dans leurs démarches',
      'Expatrié expérimenté, je partage mes connaissances de {country}',
      'Facilitateur d\'intégration pour expatriés à {country}'
    ],
    en: [
      'Passionate about helping expats in {country}',
      'Expert in expat life in {country} for {experience} years',
      'I support newcomers in {country} with their procedures',
      'Experienced expat, I share my knowledge of {country}',
      'Integration facilitator for expats in {country}'
    ],
    es: [
      'Apasionado por ayudar a expatriados en {country}',
      'Experto en vida de expatriado en {country} desde hace {experience} años',
      'Acompaño a los recién llegados a {country} en sus trámites',
      'Expatriado experimentado, comparto mis conocimientos de {country}',
      'Facilitador de integración para expatriados en {country}'
    ],
    de: [
      'Leidenschaftlich daran interessiert, Expats in {country} zu helfen',
      'Experte für Expat-Leben in {country} seit {experience} Jahren',
      'Ich unterstütze Neuankömmlinge in {country} bei ihren Verfahren',
      'Erfahrener Expat, ich teile mein Wissen über {country}',
      'Integrationsförderer für Expats in {country}'
    ],
    pt: [
      'Apaixonado por ajudar expatriados em {country}',
      'Especialista em vida de expatriado em {country} há {experience} anos',
      'Acompanho os recém-chegados em {country} nos seus procedimentos',
      'Expatriado experiente, partilho os meus conhecimentos de {country}',
      'Facilitador de integração para expatriados em {country}'
    ],
    ru: [
      'Увлечен помощью экспатриантам в {country}',
      'Эксперт по жизни экспатрианта в {country} уже {experience} лет',
      'Помогаю новым иммигрантам в {country} с их делами',
      'Опытный экспатриант, делюсь своими знаниями о {country}',
      'Помогаю экспатриантам интегрироваться в {country}'
    ],
    zh: [
      '热衷于帮助{country}的外籍人士',
      '在{country}有{experience}年外籍生活经验',
      '帮助新来的人在{country}办理手续',
      '经验丰富的外籍人士，分享我对{country}的了解',
      '帮助外籍人士融入{country}'
    ],
    ar: [
      'شغوف بمساعدة المغتربين في {country}',
      'خبير في حياة المغتربين في {country} منذ {experience} سنوات',
      'أساعد القادمين الجدد في {country} في إجراءاتهم',
      'مغترب ذو خبرة، أشارك معرفتي عن {country}',
      'ميسر اندماج للمغتربين في {country}'
    ],
    hi: [
      '{country} में प्रवासियों की मदद करने का जुनून',
      '{country} में {experience} वर्षों से प्रवासी जीवन विशेषज्ञ',
      '{country} में नए आने वालों की प्रक्रियाओं में मदद करता हूं',
      'अनुभवी प्रवासी, {country} के बारे में अपना ज्ञान साझा करता हूं',
      '{country} में प्रवासियों के लिए एकीकरण सुविधाकर्ता'
    ]
  };

  const motivationLanguages = ['fr', 'en', 'es', 'de', 'pt', 'ru', 'zh', 'ar', 'hi'];

  const result: Record<string, string> = {};

  for (const lang of motivationLanguages) {
    const templates = motivationTemplates[lang] || motivationTemplates['en'];
    const template = templates[Math.floor(Math.random() * templates.length)];
    result[lang] = template
      .replace('{country}', countryName) // ✅ Utilise le nom complet, pas le code
      .replace('{experience}', experience.toString());
  }

  return result;
}

/**
 * 🌍 Certifications multilingues
 */
const CERTIFICATIONS_MULTILINGUE: Record<string, Record<string, string>> = {
  'certified-bar': {
    fr: 'Barreau certifié',
    en: 'Certified Bar',
    es: 'Colegio de Abogados certificado',
    de: 'Zertifizierte Anwaltskammer',
    pt: 'Ordem dos Advogados certificada'
  },
  'international-law': {
    fr: 'Spécialiste en droit international',
    en: 'International Law Specialist',
    es: 'Especialista en Derecho Internacional',
    de: 'Spezialist für Internationales Recht',
    pt: 'Especialista em Direito Internacional'
  },
  'mediator': {
    fr: 'Médiateur agréé',
    en: 'Accredited Mediator',
    es: 'Mediador acreditado',
    de: 'Akkreditierter Mediator',
    pt: 'Mediador credenciado'
  },
  'business-law': {
    fr: 'Droit des affaires certifié',
    en: 'Certified Business Law',
    es: 'Derecho Empresarial certificado',
    de: 'Zertifiziertes Wirtschaftsrecht',
    pt: 'Direito Empresarial certificado'
  },
  'family-law': {
    fr: 'Expert en droit de la famille',
    en: 'Family Law Expert',
    es: 'Experto en Derecho de Familia',
    de: 'Familienrechtsexperte',
    pt: 'Especialista em Direito de Família'
  },
  'tax-law': {
    fr: 'Droit fiscal avancé',
    en: 'Advanced Tax Law',
    es: 'Derecho Fiscal avanzado',
    de: 'Fortgeschrittenes Steuerrecht',
    pt: 'Direito Fiscal avançado'
  },
  'real-estate': {
    fr: 'Droit immobilier certifié',
    en: 'Certified Real Estate Law',
    es: 'Derecho Inmobiliario certificado',
    de: 'Zertifiziertes Immobilienrecht',
    pt: 'Direito Imobiliário certificado'
  },
  'notary': {
    fr: 'Notaire public',
    en: 'Notary Public',
    es: 'Notario público',
    de: 'Notar',
    pt: 'Notário público'
  },
  'arbitrator': {
    fr: 'Arbitre international',
    en: 'International Arbitrator',
    es: 'Árbitro internacional',
    de: 'Internationaler Schiedsrichter',
    pt: 'Árbitro internacional'
  },
  'immigration': {
    fr: 'Consultant en immigration',
    en: 'Immigration Consultant',
    es: 'Consultor de inmigración',
    de: 'Einwanderungsberater',
    pt: 'Consultor de imigração'
  }
};

function getMultilingualCertifications(count: number = 2): string[] {
  const certKeys = Object.keys(CERTIFICATIONS_MULTILINGUE);
  const shuffled = [...certKeys].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, certKeys.length));
}

/**
 * 💬 Obtient un commentaire d'avis unique garanti sans doublon
 * @throws Error si tous les commentaires sont déjà utilisés
 */
async function getUniqueReviewComment(
  t: any,
  profileLanguages: string[],
  profileId: string
): Promise<{ key: string; text: string }> {
  // 🌍 Déterminer la langue de l'avis
  let reviewLang = 'fr';
  for (const lang of profileLanguages) {
    if (LANGUAGE_TO_I18N[lang]) {
      reviewLang = LANGUAGE_TO_I18N[lang];
      break;
    }
  }

  const used = memoryCache.usedReviews.get(reviewLang) || new Set<string>();
  const allKeys = getAllReviewKeys(); // 400 reviews disponibles
  
  // 🛑 VÉRIFICATION CRITIQUE : Tous les commentaires sont-ils utilisés ?
  if (used.size >= allKeys.length) {
    const errorMessage = 
      `❌ PLUS DE COMMENTAIRES D'AVIS DISPONIBLES - LIMITE ATTEINTE\n\n` +
      `📊 Statistiques:\n` +
      `   Langue: ${reviewLang}\n` +
      `   Commentaires utilisés: ${used.size}/${allKeys.length}\n\n` +
      `💡 Solutions possibles:\n` +
      `   1. Ajoutez plus de reviews dans le fichier JSON (recommandé 600+)\n` +
      `   2. Utilisez une autre langue\n` +
      `   3. Contactez le développeur pour augmenter les templates\n\n` +
      `📍 Chemin JSON: admin.aaa.reviews.(veryShort|short|medium|long|veryLong)`;
    
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
  
  // 🎲 Trouver une clé non utilisée avec protection contre boucle infinie
  let key: string;
  let attempts = 0;
  const maxAttempts = allKeys.length * 10; // Sécurité : 10× le nombre de reviews
  
  do {
    key = allKeys[Math.floor(Math.random() * allKeys.length)];
    attempts++;
    
    if (attempts > maxAttempts) {
      const errorMessage = 
        `❌ ERREUR SYSTÈME - Impossible de trouver un commentaire unique\n\n` +
        `Tentatives: ${attempts}/${maxAttempts}\n` +
        `Utilisés: ${used.size}/${allKeys.length}\n` +
        `Langue: ${reviewLang}\n\n` +
        `Cela ne devrait JAMAIS arriver. Contactez le développeur.`;
      
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
  } while (used.has(key));
  
  // 💾 Sauvegarder dans Firestore + cache
  await saveUsedReview(reviewLang, key, profileId);

  const percentage = Math.round(((used.size + 1) / allKeys.length) * 100);

  // ⚠️ Avertissement si on approche de la limite
  if (percentage >= 80) {
    console.warn(
      `⚠️ ATTENTION: ${percentage}% des reviews ${reviewLang} sont utilisées!\n` +
      `   Il reste seulement ${allKeys.length - used.size - 1} commentaires disponibles.\n` +
      `   Préparez des templates supplémentaires.`
    );
  }

  // ✅ Toujours utiliser FR comme fallback
  const fallbackText = t(key, { lng: 'fr' });

  return { key, text: fallbackText };
}

// ==========================================
// FIN DU SYSTÈME DE TRACKING PERSISTANT
// ==========================================

function randomDateBetween(start: Date, end: Date): Date {
  const startTime = start.getTime();
  const endTime = end.getTime();
  const randomTime = startTime + Math.random() * (endTime - startTime);
  return new Date(randomTime);
}

function weeksSince(date: Date): number {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 7));
}

const genName = (gender: Gender, country: string) => {
  const names = getNamesByCountry(country);
  const firstName = names[gender][randomInt(0, names[gender].length - 1)];
  const lastName = names.lastNames[randomInt(0, names.lastNames.length - 1)];
  return { firstName, lastName, fullName: `${firstName} ${lastName}` };
};

const interpolateBio = (template: string, values: Record<string, any>): string => {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] || '');
};

type Role = 'lawyer' | 'expat';
type Gender = 'male' | 'female';

interface AaaProfile {
  id: string; fullName: string; firstName: string; lastName: string; email: string;
  phone: string; phoneCountryCode: string; type: Role; country: string; languages: string[];
  specialties: string[]; rating: number; reviewCount: number; yearsOfExperience: number;
  profilePhoto: string; description: string; isOnline: boolean; isVisible: boolean;
  isCallable: boolean; createdAt: Date; isTestProfile?: boolean; price?: number; duration?: number;
  role?: Role; totalCalls?: number; mainInterventionCountry?: string;
  practiceCountries?: string[]; helpTypes?: string[]; graduationYear?: number;
  educations?: string[]; yearsAsExpat?: number; whatsapp?: string; currentCountry?: string;
  currentPresenceCountry?: string; residenceCountry?: string; presenceCountry?: string;
  interventionCountry?: string; languagesSpoken?: string[]; preferredLanguage?: string;
  acceptTerms?: boolean; provider?: string; isEarlyProvider?: boolean; earlyBadge?: 'lawyer' | 'expat';
  lawSchool?: string; certifications?: string[]; motivation?: string | Record<string, string>; responseTime?: string;
  previousCountries?: string[]; mapLocation?: { lat: number; lng: number }; slug?: string;
  bio?: string | Record<string, string>; barNumber?: string;
  // AAA Payout fields
  isAAA?: boolean;
  aaaPayoutMode?: 'internal' | string; // 'internal' or external account ID
}

// AAA External Account configuration
interface AaaExternalAccount {
  id: string;
  name: string; // Display name (e.g., "PayPal Thaïlande", "Stripe EU")
  gateway: 'paypal' | 'stripe';
  accountId: string; // PayPal Merchant ID or Stripe Account ID
  email?: string;
  holderName: string;
  country: string;
  isActive: boolean;
  createdAt: Date;
}

// AAA Payout Config
interface AaaPayoutConfig {
  externalAccounts: AaaExternalAccount[];
  defaultMode: 'internal' | string; // Default for new profiles
  lastUpdated?: Date;
}

interface GenerationForm {
  count: number; roleDistribution: { lawyer: number; expat: number };
  genderDistribution: { male: number; female: number }; countries: string[]; languages: string[];
  minExperience: number; maxExperience: number; minAge: number; maxAge: number;
  allowRealCalls: boolean; isTestProfile: boolean; customPhoneNumber: string;
  useCustomPhone: boolean; markAsEarly: boolean; earlyPercentage: number;
}

const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const randomChoice = <T,>(array: T[]): T => array[Math.floor(Math.random() * array.length)];

const randomRating = (): number => {
  const r = Math.random();
  if (r < 0.95) return parseFloat((4 + Math.random()).toFixed(2));
  return parseFloat((3 + Math.random() * 0.9).toFixed(2));
};

const pickLanguages = (selected: string[], country: string): string[] => {
  // Si aucune langue sélectionnée, retourner tableau vide
  if (selected.length === 0) {
    return [];
  }
  
  const pool = [...selected];
  const result = new Set<string>();
  
  // ✅ Toujours ajouter Français SI coché
  const foundFrancais = pool.find((l) => l.toLowerCase() === 'français');
  if (foundFrancais) result.add(foundFrancais);
  
  // ✅ Toujours ajouter Anglais SI coché
  const foundAnglais = pool.find((l) => l.toLowerCase() === 'anglais' || l.toLowerCase() === 'english');
  if (foundAnglais) result.add(foundAnglais);
  
  // Ajouter des langues supplémentaires aléatoires du pool (0 à 2)
  const maxExtra = Math.min(2, pool.length);
  const addCount = randomInt(0, maxExtra);
  for (let i = 0; i < addCount; i++) {
    const cand = pool[randomInt(0, pool.length - 1)];
    result.add(cand); // Set évite les doublons automatiquement
  }
  
  // Si rien (ni français ni anglais cochés), prendre au moins une langue du pool
  if (result.size === 0 && pool.length > 0) {
    result.add(pool[0]);
  }
  
  return Array.from(result);
};

const genEmail = (firstName: string, lastName: string) =>
  `${slugify(firstName)}.${slugify(lastName)}@example.com`;

const AdminAaaProfiles: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const intl = useIntl();

  // ✅ NOUVELLE fonction t() avec support multi-langue
  const t = (
    id: string,
    options?: { lng?: string; returnObjects?: boolean; [key: string]: any }
  ): any => {
    // Langue courante de l'admin (fr, en, es, ...)
    const intlLang = intl.locale?.split('-')[0] || 'fr';
    const lang = options?.lng || intlLang;
    const translations = TRANSLATIONS_MAP[lang] || TRANSLATIONS_MAP['fr'];

    // Naviguer dans l'objet JSON avec le chemin (ex: "admin.aaa.reviews.short.1")
    const keys = id.split('.');
    let value: any = translations;

    for (const key of keys) {
      if (value && typeof value === 'object') {
        value = value[key];
      } else {
        return id; // Retourne la clé si non trouvé
      }
    }

    // Si on demande le tableau/objet brut (bios, etc.)
    if (options?.returnObjects) {
      return value;
    }

    return typeof value === 'string' ? value : id;
  };

  const [activeTab, setActiveTab] = useState<'generate' | 'manage' | 'planner' | 'simulation'>('generate');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [existingProfiles, setExistingProfiles] = useState<AaaProfile[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'lawyer' | 'expat'>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<AaaProfile | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<AaaProfile>>({});
  const [editBioLang, setEditBioLang] = useState<string>('fr');
  const [newProfilePhoto, setNewProfilePhoto] = useState<string>('');
  const [uploadingPhotoFor, setUploadingPhotoFor] = useState<string | null>(null);

  const [formData, setFormData] = useState<GenerationForm>({
    count: 10, roleDistribution: { lawyer: 50, expat: 50 },
    genderDistribution: { male: 50, female: 50 },
    countries: ['Canada', 'Thaïlande', 'Australie', 'Espagne', 'Allemagne'],
    languages: [], minExperience: 2, maxExperience: 15,
    minAge: 27, maxAge: 65, allowRealCalls: false, isTestProfile: true,
    customPhoneNumber: '+33743331201', useCustomPhone: true, markAsEarly: false, earlyPercentage: 20,
  });

  const [planner] = useState({
    enabled: false, dailyCount: 20, regionCountries: ['Thaïlande', 'Vietnam', 'Cambodge'],
    role: 'expat' as Role, genderBias: { male: 50, female: 50 }, languages: ['fr', 'en'],
  });

  // ========== AAA BUSY SIMULATION CONFIG ==========
  const [simConfig, setSimConfig] = useState<{
    enabled: boolean;
    simultaneousBusy: number;
    busyDurationMinutes: number;
  }>({ enabled: false, simultaneousBusy: 5, busyDurationMinutes: 20 });
  const [simConfigLoaded, setSimConfigLoaded] = useState(false);
  const [savingSimConfig, setSavingSimConfig] = useState(false);
  const [simulatedProfiles, setSimulatedProfiles] = useState<Array<{ id: string; name: string; simulatedAt: Date }>>([]);

  const loadSimConfig = async () => {
    try {
      const snap = await getDoc(doc(db, 'admin_config', 'aaa_busy_simulation'));
      if (snap.exists()) {
        const data = snap.data();
        setSimConfig({
          enabled: data.enabled ?? false,
          simultaneousBusy: data.simultaneousBusy ?? 5,
          busyDurationMinutes: data.busyDurationMinutes ?? 20,
        });
      }
      setSimConfigLoaded(true);
    } catch (err) {
      console.error('[AAA Simulation] Error loading config:', err);
    }
  };

  const saveSimConfig = async (newConfig: typeof simConfig) => {
    setSavingSimConfig(true);
    try {
      await setDoc(doc(db, 'admin_config', 'aaa_busy_simulation'), {
        ...newConfig,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser?.uid || 'unknown',
      });
      setSimConfig(newConfig);
      setSuccess(newConfig.enabled ? 'Simulation busy activée' : 'Simulation busy désactivée');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(`Erreur sauvegarde config simulation: ${(err as Error).message}`);
    } finally {
      setSavingSimConfig(false);
    }
  };

  const loadSimulatedProfiles = async () => {
    try {
      // Utilise la collection 'users' car sos_profiles a des security rules
      // qui bloquent les queries collection-wide (resource.data.isVisible check)
      const snap = await getDocs(
        query(collection(db, 'users'), where('isAAA', '==', true))
      );
      const profiles: typeof simulatedProfiles = [];
      for (const d of snap.docs) {
        const data = d.data();
        if (data.aaaBusySimulatedAt) {
          profiles.push({
            id: d.id,
            name: data.fullName || data.displayName || d.id,
            simulatedAt: data.aaaBusySimulatedAt.toDate(),
          });
        }
      }
      setSimulatedProfiles(profiles);
    } catch (err) {
      console.error('[AAA Simulation] Error loading simulated profiles:', err);
      toast.error('Erreur chargement profils simulés');
    }
  };

  // ========== AAA PAYOUT CONFIG ==========
  const [aaaPayoutConfig, setAaaPayoutConfig] = useState<AaaPayoutConfig>({
    externalAccounts: [],
    defaultMode: 'internal',
  });
  const [showPayoutConfigModal, setShowPayoutConfigModal] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AaaExternalAccount | null>(null);
  const [newAccountForm, setNewAccountForm] = useState<Partial<AaaExternalAccount>>({
    gateway: 'paypal',
    isActive: true,
  });
  const [savingPayoutConfig, setSavingPayoutConfig] = useState(false);

  // ========== AAA PAYOUT CONFIG FUNCTIONS ==========
  const loadAaaPayoutConfig = async () => {
    try {
      const configDoc = await getDoc(doc(db, 'admin_config', 'aaa_payout'));
      if (configDoc.exists()) {
        const data = configDoc.data();
        setAaaPayoutConfig({
          externalAccounts: (data.externalAccounts || []).map((acc: any) => ({
            ...acc,
            createdAt: acc.createdAt?.toDate?.() || new Date(),
          })),
          defaultMode: data.defaultMode || 'internal',
          lastUpdated: data.lastUpdated?.toDate?.() || undefined,
        });
      }
    } catch (err) {
      console.error('[AAA Payout] Error loading config:', err);
    }
  };

  const saveAaaPayoutConfig = async (config: AaaPayoutConfig) => {
    setSavingPayoutConfig(true);
    try {
      await setDoc(doc(db, 'admin_config', 'aaa_payout'), {
        externalAccounts: config.externalAccounts.map(acc => ({
          ...acc,
          createdAt: Timestamp.fromDate(acc.createdAt),
        })),
        defaultMode: config.defaultMode,
        lastUpdated: serverTimestamp(),
      });
      setAaaPayoutConfig(config);
      setSuccess('Configuration payout AAA sauvegardée');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('[AAA Payout] Error saving config:', err);
      setError(`Erreur sauvegarde config: ${(err as Error).message}`);
    } finally {
      setSavingPayoutConfig(false);
    }
  };

  const addExternalAccount = () => {
    if (!newAccountForm.name || !newAccountForm.accountId || !newAccountForm.holderName) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }
    const newAccount: AaaExternalAccount = {
      id: `ext_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: newAccountForm.name!,
      gateway: newAccountForm.gateway || 'paypal',
      accountId: newAccountForm.accountId!,
      email: newAccountForm.email,
      holderName: newAccountForm.holderName!,
      country: newAccountForm.country || 'TH',
      isActive: newAccountForm.isActive ?? true,
      createdAt: new Date(),
    };
    const updatedConfig = {
      ...aaaPayoutConfig,
      externalAccounts: [...aaaPayoutConfig.externalAccounts, newAccount],
    };
    saveAaaPayoutConfig(updatedConfig);
    setNewAccountForm({ gateway: 'paypal', isActive: true });
    setShowAddAccountModal(false);
  };

  const updateExternalAccount = (accountId: string, updates: Partial<AaaExternalAccount>) => {
    const updatedAccounts = aaaPayoutConfig.externalAccounts.map(acc =>
      acc.id === accountId ? { ...acc, ...updates } : acc
    );
    saveAaaPayoutConfig({ ...aaaPayoutConfig, externalAccounts: updatedAccounts });
  };

  const deleteExternalAccount = (accountId: string) => {
    const updatedAccounts = aaaPayoutConfig.externalAccounts.filter(acc => acc.id !== accountId);
    // Also reset any profiles using this account to internal
    const updatedConfig = {
      ...aaaPayoutConfig,
      externalAccounts: updatedAccounts,
      defaultMode: aaaPayoutConfig.defaultMode === accountId ? 'internal' : aaaPayoutConfig.defaultMode,
    };
    saveAaaPayoutConfig(updatedConfig);
  };

  const updateProfilePayoutMode = async (profileId: string, mode: 'internal' | string) => {
    try {
      // Use transaction to ensure atomic update across both collections
      await runTransaction(db, async (transaction) => {
        const sosProfileRef = doc(db, 'sos_profiles', profileId);
        const userRef = doc(db, 'users', profileId);

        // Read both documents first (required by Firestore transaction rules)
        const sosProfileDoc = await transaction.get(sosProfileRef);
        const userDoc = await transaction.get(userRef);

        // Update sos_profiles
        if (sosProfileDoc.exists()) {
          transaction.update(sosProfileRef, {
            aaaPayoutMode: mode,
            isAAA: true,
          });
        }

        // Update users
        if (userDoc.exists()) {
          transaction.update(userRef, {
            aaaPayoutMode: mode,
            isAAA: true,
          });
        }
      });

      // Update local state only after successful transaction
      setExistingProfiles(prev => prev.map(p =>
        p.id === profileId ? { ...p, aaaPayoutMode: mode, isAAA: true } : p
      ));
      setSuccess(`Mode payout mis à jour: ${mode === 'internal' ? 'Interne (SOS-Expat)' : aaaPayoutConfig.externalAccounts.find(a => a.id === mode)?.name || mode}`);
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error('[AAA Payout] Error updating profile mode:', err);
      setError(`Erreur mise à jour: ${(err as Error).message}`);
    }
  };

  const getPayoutModeLabel = (mode: string | undefined): string => {
    if (!mode || mode === 'internal') return 'Interne (SOS-Expat)';
    const account = aaaPayoutConfig.externalAccounts.find(a => a.id === mode);
    return account ? `${account.name} (${account.gateway.toUpperCase()})` : mode;
  };

  useEffect(() => {
    if (!currentUser || (currentUser as { role?: string }).role !== 'admin') {
      navigate('/admin/login');
      return;
    }

    // ✅ CHARGER LE CONTENU UTILISÉ AU DÉMARRAGE
    loadUsedContent().catch((error) => {
      console.error('❌ Erreur chargement contenu utilisé:', error);
      setError(`Impossible de charger le contenu utilisé: ${error.message}`);
    });

    // ✅ CHARGER LA CONFIG PAYOUT AAA
    loadAaaPayoutConfig();

    // ✅ CHARGER LA CONFIG SIMULATION BUSY
    loadSimConfig();

    if (activeTab === 'manage') loadExistingProfiles().catch(() => {});
    if (activeTab === 'simulation') loadSimulatedProfiles().catch(() => {});
  }, [currentUser, navigate, activeTab]);

  const filteredProfiles = useMemo(() => {
    let filtered = existingProfiles;
    
    // Filtre par type (avocat/expatrié)
    if (roleFilter !== 'all') {
      filtered = filtered.filter(p => (p.type || p.role) === roleFilter);
    }
    
    // Filtre par langue parlée
    if (languageFilter !== 'all') {
      filtered = filtered.filter(p => {
        const langs = p.languages || p.languagesSpoken || [];
        // Vérifier si la langue (nom ou code) correspond
        return langs.some(lang => {
          const langName = getLanguageNameFromCode(lang);
          return lang === languageFilter || langName === languageFilter;
        });
      });
    }
    
    // Filtre par pays d'intervention
    if (countryFilter !== 'all') {
      filtered = filtered.filter(p => {
        const role = p.type || p.role;
        let interventionCountries: string[] = [];
        
        if (role === 'lawyer') {
          interventionCountries = p.practiceCountries || [];
        } else {
          interventionCountries = [p.residenceCountry, ...(p.previousCountries || [])].filter(Boolean) as string[];
        }
        
        // Fallback sur country si pas de pays d'intervention
        if (interventionCountries.length === 0) {
          interventionCountries = [p.country];
        }
        
        // Vérifier si le pays (nom ou code) correspond
        return interventionCountries.some(c => {
          const countryName = getCountryNameFromCode(c);
          return c === countryFilter || countryName === countryFilter;
        });
      });
    }
    
    // Recherche textuelle
    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.country?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // ✅ TRI: En ligne d'abord, puis hors ligne, puis par prénom alphabétique
    filtered.sort((a, b) => {
      // 1. En ligne en premier
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      
      // 2. Puis par prénom alphabétique
      const firstNameA = (a.firstName || a.fullName?.split(' ')[0] || '').toLowerCase();
      const firstNameB = (b.firstName || b.fullName?.split(' ')[0] || '').toLowerCase();
      return firstNameA.localeCompare(firstNameB, 'fr');
    });
    
    return filtered;
  }, [existingProfiles, searchTerm, roleFilter, languageFilter, countryFilter]);
  
  // ✅ Extraire les langues et pays uniques pour les filtres
  const availableLanguages = useMemo(() => {
    const langSet = new Set<string>();
    existingProfiles.forEach(p => {
      (p.languages || p.languagesSpoken || []).forEach(lang => {
        const langName = getLanguageNameFromCode(lang);
        if (langName && langName !== '-') langSet.add(langName);
      });
    });
    return Array.from(langSet).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [existingProfiles]);
  
  const availableCountries = useMemo(() => {
    const countrySet = new Set<string>();
    existingProfiles.forEach(p => {
      const role = p.type || p.role;
      let countries: string[] = [];
      
      if (role === 'lawyer') {
        countries = p.practiceCountries || [];
      } else {
        countries = [p.residenceCountry, ...(p.previousCountries || [])].filter(Boolean) as string[];
      }
      
      if (countries.length === 0) {
        countries = [p.country];
      }
      
      countries.forEach(c => {
        const countryName = getCountryNameFromCode(c);
        if (countryName && countryName !== '-') countrySet.add(countryName);
      });
    });
    return Array.from(countrySet).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [existingProfiles]);

  if (!COUNTRIES_LIST || !LANGUAGE_OPTIONS || !LAWYER_SPECIALTIES) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader className="animate-spin mx-auto mb-4" size={48} />
            <p className="text-gray-600">{t('admin.loading')}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const loadExistingProfiles = async () => {
    try {
      setIsLoadingProfiles(true);

      // ✅ FIX: Charger les profils AAA depuis sos_profiles (source de vérité)
      // Les profils AAA sont identifiés par isAAA: true OU createdByAdmin: true OU isTestProfile: true
      // Note: On évite orderBy pour ne pas nécessiter d'index composite Firestore
      const sosProfilesRef = collection(db, 'sos_profiles');

      // Requête 1: Profils avec isAAA: true (sans orderBy pour éviter les problèmes d'index)
      const aaaQuery = query(
        sosProfilesRef,
        where('isAAA', '==', true),
        limit(500)
      );

      // Requête 2: Profils avec createdByAdmin: true
      const adminCreatedQuery = query(
        sosProfilesRef,
        where('createdByAdmin', '==', true),
        limit(500)
      );

      // Requête 3: Profils avec isTestProfile: true (legacy)
      const testProfileQuery = query(
        sosProfilesRef,
        where('isTestProfile', '==', true),
        limit(500)
      );

      // Requête 4: Profils dont l'UID commence par "aaa_" (pattern de aaaProfileGenerator)
      // Firestore trick: >= 'aaa_' et < 'aab' capture tous les UIDs commençant par aaa_
      const uidPatternQuery = query(
        sosProfilesRef,
        where('uid', '>=', 'aaa_'),
        where('uid', '<', 'aab'),
        limit(500)
      );

      // Requête 5: Profils avec email @example.com (pattern de tous les scripts de génération)
      // C'est le critère le plus fiable car TOUS les profils générés utilisent ce domaine
      const exampleEmailQuery = query(
        sosProfilesRef,
        where('email', '>=', 'a'),  // Pour capturer tous les emails
        where('email', '<=', 'z\uf8ff'),
        limit(1000)
      );

      // Exécuter les 5 requêtes en parallèle
      const [aaaSnapshot, adminSnapshot, testSnapshot, uidPatternSnapshot, allProfilesSnapshot] = await Promise.all([
        getDocs(aaaQuery),
        getDocs(adminCreatedQuery),
        getDocs(testProfileQuery),
        getDocs(uidPatternQuery).catch(() => ({ docs: [], size: 0 })),
        getDocs(exampleEmailQuery).catch(() => ({ docs: [], size: 0 }))
      ]);

      // Fusionner et dédupliquer les résultats
      const profilesMap = new Map<string, AaaProfile>();

      const processSnapshot = (snapshot: typeof aaaSnapshot) => {
        snapshot.docs.forEach((d) => {
          if (!profilesMap.has(d.id)) {
            const data = d.data();
            profilesMap.set(d.id, {
              id: d.id, ...data,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
            } as AaaProfile);
          }
        });
      };

      processSnapshot(aaaSnapshot);
      processSnapshot(adminSnapshot);
      processSnapshot(testSnapshot);
      if ('docs' in uidPatternSnapshot) {
        processSnapshot(uidPatternSnapshot as typeof aaaSnapshot);
      }

      // Traiter la 5ème requête: filtrer les emails @example.com (profils générés)
      if ('docs' in allProfilesSnapshot) {
        (allProfilesSnapshot as typeof aaaSnapshot).docs.forEach((d) => {
          const data = d.data();
          const email = (data.email as string) || '';
          // Inclure seulement les profils avec email @example.com (pattern AAA/test)
          if (email.endsWith('@example.com') && !profilesMap.has(d.id)) {
            profilesMap.set(d.id, {
              id: d.id, ...data,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
            } as AaaProfile);
          }
        });
      }

      // Convertir en array et trier par date côté client
      const profiles = Array.from(profilesMap.values()).sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );

      setExistingProfiles(profiles);
      const uidCount = 'size' in uidPatternSnapshot ? uidPatternSnapshot.size : 0;
      const exampleEmailCount = 'docs' in allProfilesSnapshot
        ? (allProfilesSnapshot as typeof aaaSnapshot).docs.filter(d => ((d.data().email as string) || '').endsWith('@example.com')).length
        : 0;
      console.log(`[AAA Profiles] Loaded ${profiles.length} profiles (AAA: ${aaaSnapshot.size}, AdminCreated: ${adminSnapshot.size}, Test: ${testSnapshot.size}, UID: ${uidCount}, @example.com: ${exampleEmailCount})`);
    } catch (e) {
      console.error('[AAA Profiles] Error loading profiles:', e);
    } finally {
      setIsLoadingProfiles(false);
    }
  };

  const handleCountryToggle = (country: string) => {
    setFormData((prev) => ({
      ...prev,
      countries: prev.countries.includes(country)
        ? prev.countries.filter((c) => c !== country)
        : [...prev.countries, country],
    }));
  };

  const handleLanguageToggle = (language: string) => {
    setFormData((prev) => ({
      ...prev,
      languages: prev.languages.includes(language)
        ? prev.languages.filter((l) => l !== language)
        : [...prev.languages, language],
    }));
  };

  const handleSelectAllCountries = () => {
    setFormData((prev) => ({
      ...prev,
      countries: prev.countries.length === COUNTRIES_LIST.length ? [] : [...COUNTRIES_LIST],
    }));
  };

  const handleSelectAllLanguages = () => {
    setFormData((prev) => ({
      ...prev,
      languages: prev.languages.length === LANGUAGE_OPTIONS.length ? [] : [...LANGUAGE_OPTIONS],
    }));
  };

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }).format(date);

  const generateAaaProfiles = async () => {
    try {
      // ✅ FORCER LE RESET DU CACHE AVANT LA GÉNÉRATION
      memoryCache.usedBios.clear();
      memoryCache.usedReviews.clear();
      memoryCache.isLoaded = false;
      await loadUsedContent();
      
      setIsGenerating(true);
      setGeneratedCount(0);
      setSuccess(null);
      setError(null);

      const { count, roleDistribution, genderDistribution, countries, languages,
        minExperience, maxExperience, customPhoneNumber, useCustomPhone, markAsEarly, earlyPercentage } = formData;

      if (count <= 0) return setError('Nombre invalide');
      if (countries.length === 0) return setError('Aucun pays sélectionné');
      if (languages.length === 0) return setError('Aucune langue sélectionnée');

      const lawyerCount = Math.round((roleDistribution.lawyer / 100) * count);
      const maleCount = Math.round((genderDistribution.male / 100) * count);

      let malesGenerated = 0;
      let lawyersGenerated = 0;

      for (let i = 0; i < count; i++) {
        const gender: Gender = malesGenerated < maleCount ? 'male' : 'female';
        if (gender === 'male') malesGenerated++;
        const role: Role = lawyersGenerated < lawyerCount ? 'lawyer' : 'expat';
        if (role === 'lawyer') lawyersGenerated++;
        const isEarly = markAsEarly && (i < Math.floor(count * earlyPercentage / 100));
        await generateOne(role, gender, countries, languages, minExperience, maxExperience, customPhoneNumber, useCustomPhone, isEarly);
        setGeneratedCount((n) => n + 1);
      }

      setSuccess(`${count} profils générés avec succès`);
      if (activeTab === 'manage') loadExistingProfiles();
    } catch (e) {
      console.error(e);
      setError(`Erreur: ${(e as Error).message || 'unknown'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateOne = async (
    role: Role, gender: Gender, countries: string[], languages: string[],
    minExperience: number, maxExperience: number, customPhoneNumber: string,
    useCustomPhone: boolean, isEarly: boolean = false
  ): Promise<string> => {
    const country = randomChoice(countries);
    const countryCode = getCountryCode(country);
    const { firstName, lastName, fullName } = genName(gender, country);
    const email = genEmail(firstName, lastName);
    const experience = randomInt(minExperience, maxExperience);
    const phone = useCustomPhone ? customPhoneNumber : '+33743331201';
    const selectedLanguages = pickLanguages(languages, country);
    const languageCodes = getLanguageCodesFromNames(selectedLanguages);

    // 📅 Date de création : toujours entre le 20 août 2025 et aujourd'hui
    const createdAt = randomDateBetween(START_DATE, TODAY);

    // 📆 Nombre de semaines depuis l'inscription (min 1)
    const rawWeeks = weeksSince(createdAt);
    const weeks = Math.max(1, rawWeeks);

    // 📞 1 à 3 appels par semaine
    const callsPerWeek = randomInt(1, 3);
    const totalCalls = Math.max(1, weeks * callsPerWeek);

    // ⭐ 1 à 2 avis par semaine depuis l'inscription
    const reviewsPerWeek = randomInt(1, 2);
    const reviewCount = Math.max(1, Math.min(totalCalls, weeks * reviewsPerWeek));

    const uid = `aaa_${role}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // ✅ Générer une photo de profil avec DiceBear (avatar cohérent avec le genre)
    const avatarStyle = gender === 'female' ? 'adventurer' : 'adventurer';
    const profilePhoto = `https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${uid}&backgroundColor=b6e3f4`;

    const rating = isEarly ? Math.min(5.0, randomRating() + 0.2) : randomRating();
    
    const specialties: string[] = [];
    if (role === 'lawyer') {
      const count = randomInt(2, 4);
      while (specialties.length < count) {
        const s = randomChoice(LAWYER_SPECIALTIES);
        if (!specialties.includes(s)) specialties.push(s);
      }
    } else {
      const count = randomInt(2, 4);
      while (specialties.length < count) {
        const s = randomChoice(EXPAT_HELP_TYPES);
        if (!specialties.includes(s)) specialties.push(s);
      }
    }

    // 🛡️ VALIDATION DES CODES DE SPÉCIALITÉ
    const { valid: validatedSpecialties, invalid: invalidSpecialties } = validateAndFilterSpecialties(
      specialties,
      role,
      true // enableLogging
    );

    // Si des codes invalides sont détectés, les remplacer par des codes valides
    if (invalidSpecialties.length > 0) {
      console.warn(`[AAA] 🔄 Remplacement de ${invalidSpecialties.length} code(s) invalide(s) pour ${uid}`);
      // Ajouter des codes valides pour remplacer les invalides
      const codeSource = role === 'lawyer' ? LAWYER_SPECIALTIES : EXPAT_HELP_TYPES;
      while (validatedSpecialties.length < specialties.length) {
        const replacement = randomChoice(codeSource);
        if (!validatedSpecialties.includes(replacement)) {
          validatedSpecialties.push(replacement);
        }
      }
    }

    // Utiliser les spécialités validées
    const finalSpecialties = validatedSpecialties;

    // 📝 LOG DE GÉNÉRATION
    logProfileGeneration(uid, role, finalSpecialties, country);

    // ✅ Déterminer la langue principale du profil
    const mainLanguage = selectedLanguages[0] || 'Français';
    const langCode = getLanguageCode(mainLanguage);

    // ✅ Bio multilingue (utilise les spécialités validées)
    const bio = await getMultilingualBio(
      t,
      role,
      uid,
      finalSpecialties,
      country,
      experience
    );

    // 🆕 COORDONNÉES GPS RÉALISTES
    const mapLocation = getCountryCoordinates(country);
    
    // 🆕 TEMPS DE RÉPONSE VARIÉ
    const responseTime = getResponseTime();
    
    // 🆕 PAYS PRÉCÉDENTS (0-3)
    const previousCountries = getPreviousCountries(country, countries);

    // ⚠️ Le slug n'est PAS généré ici - il est généré dynamiquement par ProviderProfile.tsx
    // Cela permet d'avoir des URLs multilingues selon la langue de l'utilisateur

    const baseUser: any = {
      uid, firstName, lastName, fullName, email, phone, phoneCountryCode: '+33',
      country: countryCode, countryName: country, // ✅ Stocke aussi le nom du pays
      currentCountry: countryCode, preferredLanguage: langCode, languages: languageCodes,
      profilePhoto, avatar: profilePhoto, isTestProfile: true, isActive: true,
      isApproved: true, isVerified: true, approvalStatus: 'approved', verificationStatus: 'approved',
      isOnline: false, isVisible: true,
      isVisibleOnMap: true, isCallable: formData.allowRealCalls,
      createdAt: Timestamp.fromDate(createdAt), updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(), role, isSOS: true, points: 0,
      affiliateCode: `AAA${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      referralBy: null, bio,
      responseTime,
      availability: 'offline', totalCalls, totalEarnings: 0, averageRating: rating,
      rating, reviewCount, isEarlyProvider: isEarly,
      mapLocation,
      gender, // ✅ Stocke le genre pour éviter les décalages photo/nom
    };

    // ✅ Ajouter earlyBadge seulement si isEarly est true
    if (isEarly) {
      baseUser.earlyBadge = role;
    }

    if (role === 'lawyer') {
      const lawSchool = getUniversity(country);
      const certificationKeys = getMultilingualCertifications(randomInt(1, 3));
      const graduationYear = getGraduationYear(experience, 27);

      Object.assign(baseUser, {
        specialties: finalSpecialties, // ✅ Utilise les spécialités validées
        practiceCountries: [countryCode], yearsOfExperience: experience,
        barNumber: `BAR${randomInt(10000, 99999)}`,
        lawSchool,
        graduationYear,
        certifications: certificationKeys,
        needsVerification: false, verificationStatus: 'approved',
      });
    } else {
      const previousCountryCodes = previousCountries.map(c => getCountryCode(c));
      const motivation = await getMultilingualMotivation(country, experience);

      Object.assign(baseUser, {
        helpTypes: finalSpecialties, // ✅ Utilise les spécialités validées
        specialties: finalSpecialties, // ✅ Utilise les spécialités validées
        residenceCountry: countryCode,
        yearsAsExpat: experience, yearsOfExperience: experience,
        previousCountries: previousCountryCodes,
        motivation,
        needsVerification: false, verificationStatus: 'approved',
      });
    }

    // ✅ NETTOYER LES VALEURS UNDEFINED AVANT FIRESTORE
    const cleanBaseUser = Object.entries(baseUser).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as any);

    // ✅ AJOUTER LES CHAMPS AAA
    cleanBaseUser.isAAA = true;
    cleanBaseUser.aaaPayoutMode = aaaPayoutConfig.defaultMode; // 'internal' par défaut
    cleanBaseUser.kycDelegated = true;
    cleanBaseUser.kycStatus = 'not_required';
    // P1 FIX: AAA profiles get automatic AI access without subscription
    cleanBaseUser.forcedAIAccess = true;
    cleanBaseUser.hasActiveSubscription = true;
    cleanBaseUser.subscriptionStatus = 'active';

    await setDoc(doc(db, 'users', uid), cleanBaseUser);

    const providerProfile: FirestoreData = {
      ...cleanBaseUser, uid, type: role, fullName, createdByAdmin: true, profileCompleted: true,
      isAAA: true,
      aaaPayoutMode: aaaPayoutConfig.defaultMode,
      kycDelegated: true,
      kycStatus: 'not_required',
      // P1 FIX: AAA profiles get automatic AI access
      forcedAIAccess: true,
      hasActiveSubscription: true,
      subscriptionStatus: 'active',
    };
    await setDoc(doc(db, 'sos_profiles', uid), providerProfile);

    const card = {
      id: uid, uid, title: fullName,
      subtitle: role === 'lawyer' ? 'Avocat' : 'Expatrié aidant',
      country, photo: profilePhoto, rating, reviewCount, languages: languageCodes,
      specialties: (providerProfile.specialties as string[]) || [],
      href: `/profile/${uid}`,
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'ui_profile_cards', uid), card);
    await setDoc(doc(db, 'ui_profile_carousel', uid), card);

    const serviceType = role === 'lawyer' ? 'lawyer_call' : 'expat_call';
    
    // ✅ GÉNÉRATION DES AVIS AVEC PRÉNOMS UNIQUEMENT
    for (let j = 0; j < reviewCount; j++) {
      // Calculer la date de l'avis
      const daysSinceCreation = Math.floor((TODAY.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      const reviewDaysAfterCreation = Math.floor((j / reviewCount) * daysSinceCreation);
      const reviewDate = new Date(createdAt.getTime() + reviewDaysAfterCreation * 24 * 60 * 60 * 1000);
      
      // Note entre 4.0 et 5.0
      const r = parseFloat((4.0 + Math.random()).toFixed(1));
      
      // ✅ GÉNÉRER UN PRÉNOM RÉALISTE DE CLIENT
      const clientGender: Gender = Math.random() > 0.5 ? 'male' : 'female';
      
      // 70% du pays du provider, 30% d'un autre pays aléatoire
      const clientCountryForName = Math.random() > 0.7 
        ? country 
        : randomChoice(countries);
      
      // ✅ Extraction du prénom uniquement
      const { firstName: clientFirstName } = genName(clientGender, clientCountryForName);
      
      // Obtenir un commentaire unique traduit
      const reviewComment = await getUniqueReviewComment(t, selectedLanguages, uid);
      
      // Créer l'avis dans Firestore
      await addDoc(collection(db, 'reviews'), {
        providerId: uid, 
        clientId: `aaa_client_${Date.now()}_${j}`,
        clientName: clientFirstName,
        clientCountry: clientCountryForName, 
        rating: r,
        comment: reviewComment.text,
        commentKey: reviewComment.key,
        isPublic: true, 
        status: 'published',
        serviceType,
        createdAt: Timestamp.fromDate(reviewDate), 
        helpfulVotes: randomInt(0, 10),
      });
    }

    // ✅ GÉNÉRATION DES APPELS (call_sessions)
    for (let j = 0; j < totalCalls; j++) {
      const daysSinceCreation = Math.floor((TODAY.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      const callDaysAfterCreation = Math.floor((j / totalCalls) * daysSinceCreation);
      const callDate = new Date(createdAt.getTime() + callDaysAfterCreation * 24 * 60 * 60 * 1000);
      const callDuration = randomInt(15, 45) * 60; // en secondes
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

    // 🔍 VÉRIFICATION AUTOMATIQUE APRÈS GÉNÉRATION
    const verification = await verifyGeneratedProfile(uid, role, finalSpecialties);
    if (!verification.success) {
      console.error(`[AAA] Problèmes détectés pour ${uid}:`, verification.issues);
    }

    return uid;
  };

  const handleEditProfile = (profile: AaaProfile) => {
    setSelectedProfile(profile);
    
    // ✅ Convertir les codes de langue en noms complets
    const languageNames = (profile.languages || profile.languagesSpoken || []).map(code => {
      // Si c'est déjà un nom complet, le garder
      const isAlreadyName = LANGUAGE_OPTIONS.includes(code);
      if (isAlreadyName) return code;
      // Sinon convertir le code en nom
      return getLanguageNameFromCode(code);
    }).filter(name => name && name !== '-');
    
    // ✅ Convertir les codes pays en noms complets pour les pays précédents
    const previousCountryNames = (profile.previousCountries || []).map(code => {
      const isAlreadyName = COUNTRIES_LIST.includes(code);
      if (isAlreadyName) return code;
      return getCountryNameFromCode(code);
    }).filter(name => name && name !== '-');
    
    // ✅ Convertir les codes pays en noms complets pour les pays de pratique (avocats)
    const practiceCountryNames = (profile.practiceCountries || []).map(code => {
      const isAlreadyName = COUNTRIES_LIST.includes(code);
      if (isAlreadyName) return code;
      return getCountryNameFromCode(code);
    }).filter(name => name && name !== '-');
    
    // ✅ Convertir le pays d'origine
    const countryName = COUNTRIES_LIST.includes(profile.country) 
      ? profile.country 
      : getCountryNameFromCode(profile.country);
    
    // ✅ Convertir le pays de résidence (expatriés)
    const residenceCountryName = profile.residenceCountry 
      ? (COUNTRIES_LIST.includes(profile.residenceCountry) 
          ? profile.residenceCountry 
          : getCountryNameFromCode(profile.residenceCountry))
      : '';
    
    setEditFormData({
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      phone: profile.phone,
      phoneCountryCode: profile.phoneCountryCode,
      country: countryName,
      languages: languageNames,
      specialties: profile.specialties || profile.helpTypes || [],
      description: profile.description || '',
      isOnline: profile.isOnline,
      isVisible: profile.isVisible,
      isCallable: profile.isCallable,
      rating: profile.rating,
      reviewCount: profile.reviewCount,
      yearsOfExperience: profile.yearsOfExperience || profile.yearsAsExpat,
      isEarlyProvider: profile.isEarlyProvider,
      earlyBadge: profile.earlyBadge,
      type: profile.type || profile.role,
      lawSchool: profile.lawSchool,
      certifications: profile.certifications || [],
      motivation: profile.motivation,
      responseTime: profile.responseTime,
      previousCountries: previousCountryNames,
      graduationYear: profile.graduationYear,
      mapLocation: profile.mapLocation,
      slug: profile.slug,
      practiceCountries: practiceCountryNames,
      residenceCountry: residenceCountryName,
      totalCalls: profile.totalCalls,
      helpTypes: profile.helpTypes || [],
      bio: profile.bio || {},
    });
    setNewProfilePhoto(profile.profilePhoto);
    setEditBioLang('fr');
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    if (!selectedProfile) return;
    try {
      setIsLoading(true);
      const fullName = `${editFormData.firstName} ${editFormData.lastName}`.trim();
      
      // ✅ Convertir les noms de pays en codes ISO
      const countryCode = getCountryCode(editFormData.country || '');
      
      // ✅ Convertir les noms de langues en codes
      const languageCodes = (editFormData.languages || []).map(name => {
        const langCode = getLanguageCodeLocal(name);
        return langCode || name; // Garder le nom si pas de code trouvé
      });
      
      // ✅ Convertir les pays de pratique en codes (avocats)
      const practiceCountryCodes = (editFormData.practiceCountries || []).map(name => {
        return getCountryCode(name) || name;
      });
      
      // ✅ Convertir le pays de résidence en code (expatriés)
      const residenceCountryCode = editFormData.residenceCountry 
        ? getCountryCode(editFormData.residenceCountry) || editFormData.residenceCountry
        : '';
      
      // ✅ Convertir les pays précédents en codes (expatriés)
      const previousCountryCodes = (editFormData.previousCountries || []).map(name => {
        return getCountryCode(name) || name;
      });
      
      // ⚠️ Le slug n'est PAS généré ici - il est généré dynamiquement par ProviderProfile.tsx
      // Cela permet d'avoir des URLs multilingues selon la langue de l'utilisateur
      
      // ✅ Préparer les données à sauvegarder
      const dataToSave: any = {
        firstName: editFormData.firstName,
        lastName: editFormData.lastName,
        fullName,
        email: editFormData.email,
        phone: editFormData.phone,
        phoneCountryCode: editFormData.phoneCountryCode,
        country: countryCode,
        currentCountry: countryCode,
        languages: languageCodes,
        specialties: editFormData.specialties,
        isOnline: editFormData.isOnline,
        isVisible: editFormData.isVisible,
        isVisibleOnMap: editFormData.isVisible,
        isCallable: editFormData.isCallable,
        rating: editFormData.rating,
        averageRating: editFormData.rating,
        reviewCount: editFormData.reviewCount,
        totalCalls: editFormData.totalCalls,
        yearsOfExperience: editFormData.yearsOfExperience,
        isEarlyProvider: editFormData.isEarlyProvider,
        earlyBadge: editFormData.isEarlyProvider ? editFormData.earlyBadge : null,
        responseTime: editFormData.responseTime,
        mapLocation: editFormData.mapLocation,
        profilePhoto: newProfilePhoto,
        avatar: newProfilePhoto,
        photoURL: newProfilePhoto,
        bio: editFormData.bio,
        updatedAt: serverTimestamp(),
      };
      
      // ✅ Ajouter les champs spécifiques aux avocats
      if ((editFormData.type || editFormData.role) === 'lawyer') {
        dataToSave.lawSchool = editFormData.lawSchool;
        dataToSave.graduationYear = editFormData.graduationYear;
        dataToSave.certifications = editFormData.certifications;
        dataToSave.practiceCountries = practiceCountryCodes;
      }
      
      // ✅ Ajouter les champs spécifiques aux expatriés
      if ((editFormData.type || editFormData.role) === 'expat') {
        dataToSave.motivation = editFormData.motivation;
        dataToSave.residenceCountry = residenceCountryCode;
        dataToSave.previousCountries = previousCountryCodes;
        dataToSave.helpTypes = editFormData.specialties;
        dataToSave.yearsAsExpat = editFormData.yearsOfExperience;
      }
      
      // ✅ Nettoyer les valeurs undefined/null
      const cleanData = Object.entries(dataToSave).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          acc[key] = value;
        }
        return acc;
      }, {} as any);
      
      // ✅ FIX: Ajouter try-catch pour gérer le cas où le document users n'existe pas
      const usersRef = doc(db, 'users', selectedProfile.id);
      try {
        await updateDoc(usersRef, cleanData);
      } catch (usersError) {
        if ((usersError as { code?: string }).code === 'not-found') {
          // Créer le document s'il n'existe pas
          await setDoc(usersRef, {
            ...cleanData,
            uid: selectedProfile.id,
            role: editFormData.type || editFormData.role,
            createdAt: serverTimestamp(),
            isAAA: true,
            createdByAdmin: true
          });
          console.log(`[AAA] Created missing users document for ${selectedProfile.id}`);
        } else {
          throw usersError;
        }
      }

      const sosProfileRef = doc(db, 'sos_profiles', selectedProfile.id);
      try {
        await updateDoc(sosProfileRef, cleanData);
      } catch (sosError) {
        if ((sosError as { code?: string }).code === 'not-found') {
          await setDoc(sosProfileRef, {
            ...cleanData,
            uid: selectedProfile.id,
            type: editFormData.type || editFormData.role,
            createdAt: serverTimestamp(),
            createdByAdmin: true,
            profileCompleted: true
          });
        } else {
          throw sosError;
        }
      }
      
      const cardUpdate = {
        title: fullName,
        photo: newProfilePhoto,
        rating: editFormData.rating,
        reviewCount: editFormData.reviewCount,
        languages: editFormData.languages,
        specialties: editFormData.specialties,
        country: editFormData.country,
        updatedAt: serverTimestamp()
      };
      
      try {
        await updateDoc(doc(db, 'ui_profile_cards', selectedProfile.id), cardUpdate);
      } catch (cardError) {
        if ((cardError as { code?: string }).code === 'not-found') {
          await setDoc(doc(db, 'ui_profile_cards', selectedProfile.id), {
            id: selectedProfile.id,
            uid: selectedProfile.id,
            title: fullName,
            subtitle: editFormData.type === 'lawyer' ? 'Avocat' : 'Expatrié aidant',
            country: editFormData.country,
            photo: newProfilePhoto,
            rating: editFormData.rating,
            reviewCount: editFormData.reviewCount,
            languages: editFormData.languages,
            specialties: editFormData.specialties,
            href: `/profile/${selectedProfile.id}`,
            createdAt: serverTimestamp()
          });
        } else {
          console.warn('⚠️ Erreur mise à jour ui_profile_cards:', cardError);
        }
      }
      
      try {
        await updateDoc(doc(db, 'ui_profile_carousel', selectedProfile.id), cardUpdate);
      } catch (carouselError) {
        if ((carouselError as { code?: string }).code === 'not-found') {
          await setDoc(doc(db, 'ui_profile_carousel', selectedProfile.id), {
            id: selectedProfile.id,
            uid: selectedProfile.id,
            title: fullName,
            subtitle: editFormData.type === 'lawyer' ? 'Avocat' : 'Expatrié aidant',
            country: editFormData.country,
            photo: newProfilePhoto,
            rating: editFormData.rating,
            reviewCount: editFormData.reviewCount,
            languages: editFormData.languages,
            specialties: editFormData.specialties,
            href: `/profile/${selectedProfile.id}`,
            createdAt: serverTimestamp()
          });
        } else {
          console.warn('⚠️ Erreur mise à jour ui_profile_carousel:', carouselError);
        }
      }
      
      setShowEditModal(false);
      setSelectedProfile(null);
      await loadExistingProfiles();
      toast.success('Profil mis à jour avec succès');
    } catch (e) {
      console.error('Erreur mise à jour:', e);
      toast.error(`Erreur: ${(e as Error).message || e}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!selectedProfile) return;
    try {
      setIsLoading(true);
      await deleteDoc(doc(db, 'sos_profiles', selectedProfile.id));
      await deleteDoc(doc(db, 'users', selectedProfile.id));
      setShowDeleteModal(false);
      setSelectedProfile(null);
      await loadExistingProfiles();
      toast.success('Profil supprimé');
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleVisibility = async (profileId: string, currentVisibility: boolean) => {
    try {
      const newVisibility = !currentVisibility;
      
      // Mise à jour users (avec fallback si n'existe pas)
      try {
        await updateDoc(doc(db, 'users', profileId), {
          isVisible: newVisibility,
          isVisibleOnMap: newVisibility,
          updatedAt: serverTimestamp(),
        });
      } catch (usersErr) {
        if ((usersErr as { code?: string }).code !== 'not-found') {
          console.warn('Erreur users:', usersErr);
        }
      }

      // Mise à jour sos_profiles (ignorer si n'existe pas)
      try {
        await updateDoc(doc(db, 'sos_profiles', profileId), {
          isVisible: newVisibility, 
          isVisibleOnMap: newVisibility, 
          updatedAt: serverTimestamp(),
        });
      } catch (sosErr) {
        if ((sosErr as { code?: string }).code !== 'not-found') {
          console.warn('Erreur sos_profiles:', sosErr);
        }
      }
      
      // Rafraîchir la liste
      await loadExistingProfiles();
    } catch (e) {
      console.error('Erreur toggle visibility:', e);
      toast.error('Erreur lors de la mise à jour de la visibilité');
    }
  };

  const handleToggleOnline = async (profileId: string, currentOnline: boolean) => {
    const profile = existingProfiles.find((p) => p.id === profileId);
    if (!currentOnline && (!profile?.phone || profile.phone === '')) {
      toast.error('Numéro de téléphone requis pour mettre en ligne');
      return;
    }
    try {
      const newOnline = !currentOnline;
      
      // Mise à jour users (avec fallback si n'existe pas)
      try {
        await updateDoc(doc(db, 'users', profileId), {
          isOnline: newOnline,
          availability: newOnline ? 'available' : 'offline',
          updatedAt: serverTimestamp(),
        });
      } catch (usersErr) {
        if ((usersErr as { code?: string }).code !== 'not-found') {
          console.warn('Erreur users:', usersErr);
        }
      }

      // Mise à jour sos_profiles (ignorer si n'existe pas)
      try {
        await updateDoc(doc(db, 'sos_profiles', profileId), {
          isOnline: newOnline,
          availability: newOnline ? 'available' : 'offline',
          updatedAt: serverTimestamp(),
        });
      } catch (sosErr) {
        if ((sosErr as { code?: string }).code !== 'not-found') {
          console.warn('Erreur sos_profiles:', sosErr);
        }
      }
      
      // Rafraîchir la liste
      await loadExistingProfiles();
    } catch (e) {
      console.error('Erreur toggle online:', e);
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  const handleBulkToggleOnline = async (online: boolean) => {
    if (selectedProfiles.length === 0) {
      toast.error('Sélectionnez au moins un profil');
      return;
    }
    if (online) {
      const missing = selectedProfiles.filter((id) => {
        const p = existingProfiles.find((x) => x.id === id);
        return !p?.phone;
      });
      if (missing.length > 0) {
        toast.error(`${missing.length} profils sans téléphone`);
        return;
      }
    }
    try {
      for (const id of selectedProfiles) {
        // P0 FIX: Nettoyer TOUS les champs de statut d'appel pour éviter les incohérences
        const statusUpdate = {
          isOnline: online,
          availability: online ? 'available' : 'offline',
          updatedAt: serverTimestamp(),
          // Supprimer les champs busy pour éviter les incohérences
          ...(online && {
            busyReason: deleteField(),
            currentCallSessionId: deleteField(),
            busySince: deleteField(),
            busyBySibling: deleteField(),
            busySiblingProviderId: deleteField(),
            busySiblingCallSessionId: deleteField(),
          }),
        };
        // ✅ FIX: Ajouter try-catch pour gérer les documents manquants
        try {
          await updateDoc(doc(db, 'users', id), statusUpdate);
        } catch (e) {
          if ((e as { code?: string }).code !== 'not-found') console.warn('users:', e);
        }
        try {
          await updateDoc(doc(db, 'sos_profiles', id), statusUpdate);
        } catch (e) {
          if ((e as { code?: string }).code !== 'not-found') console.warn('sos_profiles:', e);
        }
      }
      await loadExistingProfiles();
      setSelectedProfiles([]);
      toast.success(`${selectedProfiles.length} profils mis à jour`);
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  // Gérer la visibilité en masse
  const handleBulkToggleVisibility = async (visible: boolean) => {
    if (selectedProfiles.length === 0) {
      toast.error('Sélectionnez au moins un profil');
      return;
    }
    try {
      for (const id of selectedProfiles) {
        // ✅ FIX: Ajouter try-catch pour gérer les documents manquants
        try {
          await updateDoc(doc(db, 'users', id), {
            isVisible: visible, isVisibleOnMap: visible, updatedAt: serverTimestamp(),
          });
        } catch (e) {
          if ((e as { code?: string }).code !== 'not-found') console.warn('users:', e);
        }
        try {
          await updateDoc(doc(db, 'sos_profiles', id), {
            isVisible: visible, isVisibleOnMap: visible, updatedAt: serverTimestamp(),
          });
        } catch (e) {
          if ((e as { code?: string }).code !== 'not-found') console.warn('sos_profiles:', e);
        }
      }
      await loadExistingProfiles();
      setSelectedProfiles([]);
      toast.success(`${selectedProfiles.length} profils ${visible ? 'rendus visibles' : 'masqués'}`);
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleSelectProfile = (id: string) => {
    setSelectedProfiles((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const ids = filteredProfiles.map((p) => p.id);
    setSelectedProfiles((prev) => (prev.length === ids.length ? [] : ids));
  };

  const handleEditLanguageToggle = (language: string) => {
    setEditFormData((prev) => ({
      ...prev,
      languages: prev.languages?.includes(language)
        ? prev.languages.filter((l) => l !== language)
        : [...(prev.languages || []), language],
    }));
  };

  const handleEditCertificationToggle = (certification: string) => {
    setEditFormData((prev) => ({
      ...prev,
      certifications: prev.certifications?.includes(certification)
        ? prev.certifications.filter((c) => c !== certification)
        : [...(prev.certifications || []), certification],
    }));
  };

  const handleEditPreviousCountryToggle = (country: string) => {
    setEditFormData((prev) => ({
      ...prev,
      previousCountries: prev.previousCountries?.includes(country)
        ? prev.previousCountries.filter((c) => c !== country)
        : [...(prev.previousCountries || []), country],
    }));
  };

  // ✅ FONCTION HELPER pour obtenir TOUS les pays d'intervention
  const getAllInterventionCountries = (profile: AaaProfile): string => {
    const role = profile.type || profile.role;
    const countries: string[] = [];
    
    if (role === 'lawyer') {
      // Pour les avocats : practiceCountries (peut être multiple)
      if (profile.practiceCountries && profile.practiceCountries.length > 0) {
        profile.practiceCountries.forEach(code => {
          const countryName = getCountryNameFromCode(code);
          if (countryName && !countries.includes(countryName)) {
            countries.push(countryName);
          }
        });
      }
    } else {
      // Pour les expatriés : residenceCountry + previousCountries
      if (profile.residenceCountry) {
        const countryName = getCountryNameFromCode(profile.residenceCountry);
        if (countryName && !countries.includes(countryName)) {
          countries.push(countryName);
        }
      }
      
      // Ajouter les pays précédents pour les expatriés
      if (profile.previousCountries && profile.previousCountries.length > 0) {
        profile.previousCountries.forEach(code => {
          const countryName = getCountryNameFromCode(code);
          if (countryName && !countries.includes(countryName)) {
            countries.push(countryName);
          }
        });
      }
    }
    
    // Fallback : utiliser le pays principal si aucun pays trouvé
    if (countries.length === 0) {
      const mainCountry = getCountryNameFromCode(profile.country);
      if (mainCountry) {
        countries.push(mainCountry);
      }
    }
    
    return countries.length > 0 ? countries.join(', ') : '-';
  };

  // ✅ FONCTION HELPER pour afficher les langues
  const getDisplayLanguages = (profile: AaaProfile): string => {
    const langs = profile.languages || profile.languagesSpoken || [];
    if (langs.length === 0) return '-';
    
    return langs.map(code => getLanguageNameFromCode(code)).join(', ');
  };

  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Profils AAA</h1>
          <div className="flex gap-2">
            <button onClick={() => setShowPayoutConfigModal(true)} className="px-4 py-2 rounded-md font-medium transition-colors flex items-center bg-purple-600 text-white hover:bg-purple-700">
              <Wallet className="mr-2" size={18} /> Payout Config
            </button>
            <button onClick={() => setActiveTab('generate')} className={`px-4 py-2 rounded-md font-medium transition-colors flex items-center ${activeTab === 'generate' ? 'bg-red-600 text-white hover:bg-red-700' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
              <UserPlus className="mr-2" size={18} /> Générer
            </button>
            <button onClick={() => setActiveTab('manage')} className={`px-4 py-2 rounded-md font-medium transition-colors flex items-center ${activeTab === 'manage' ? 'bg-red-600 text-white hover:bg-red-700' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
              <List className="mr-2" size={18} /> Gérer ({existingProfiles.length})
            </button>
            <button onClick={() => setActiveTab('planner')} className={`px-4 py-2 rounded-md font-medium transition-colors flex items-center ${activeTab === 'planner' ? 'bg-red-600 text-white hover:bg-red-700' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
              <Calendar className="mr-2" size={18} /> Planner
            </button>
            <button onClick={() => { setActiveTab('simulation'); loadSimulatedProfiles(); }} className={`px-4 py-2 rounded-md font-medium transition-colors flex items-center ${activeTab === 'simulation' ? 'bg-orange-600 text-white hover:bg-orange-700' : 'border border-orange-300 text-orange-700 hover:bg-orange-50'}`}>
              <Settings className="mr-2 animate-spin" style={{ animationDuration: '3s' }} size={18} /> Simulation Busy
            </button>
          </div>
        </div>

        {activeTab === 'generate' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Paramètres de génération</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de profils</label>
                <input type="number" min={1} max={200} value={formData.count} onChange={(e) => setFormData((p) => ({ ...p, count: Number(e.target.value) }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Distribution Rôles</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Avocats</span>
                        <span>{formData.roleDistribution.lawyer}%</span>
                      </label>
                      <input type="range" min={0} max={100} step={5} value={formData.roleDistribution.lawyer} onChange={(e) => { const v = Number(e.target.value); setFormData((p) => ({ ...p, roleDistribution: { lawyer: v, expat: 100 - v } })); }} className="w-full" />
                    </div>
                    <div>
                      <label className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Expatriés</span>
                        <span>{formData.roleDistribution.expat}%</span>
                      </label>
                      <input type="range" min={0} max={100} step={5} value={formData.roleDistribution.expat} onChange={(e) => { const v = Number(e.target.value); setFormData((p) => ({ ...p, roleDistribution: { lawyer: 100 - v, expat: v } })); }} className="w-full" />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Distribution Genre</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Hommes</span>
                        <span>{formData.genderDistribution.male}%</span>
                      </label>
                      <input type="range" min={0} max={100} step={5} value={formData.genderDistribution.male} onChange={(e) => { const v = Number(e.target.value); setFormData((p) => ({ ...p, genderDistribution: { male: v, female: 100 - v } })); }} className="w-full" />
                    </div>
                    <div>
                      <label className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Femmes</span>
                        <span>{formData.genderDistribution.female}%</span>
                      </label>
                      <input type="range" min={0} max={100} step={5} value={formData.genderDistribution.female} onChange={(e) => { const v = Number(e.target.value); setFormData((p) => ({ ...p, genderDistribution: { male: 100 - v, female: v } })); }} className="w-full" />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700">
                    Pays ({formData.countries.length} sélectionnés)
                  </h3>
                  <button
                    type="button"
                    onClick={handleSelectAllCountries}
                    className="text-xs px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-colors"
                  >
                    {formData.countries.length === COUNTRIES_LIST.length ? '❌ Désélectionner tout' : '✅ Sélectionner tout'}
                  </button>
                </div>
                <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-3">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {COUNTRIES_LIST.map((country: string) => (
                      <label key={country} className="flex items-center text-sm">
                        <input type="checkbox" checked={formData.countries.includes(country)} onChange={() => handleCountryToggle(country)} className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded mr-2" />
                        {country}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700">
                    Langues ({formData.languages.length} sélectionnées)
                  </h3>
                  <button
                    type="button"
                    onClick={handleSelectAllLanguages}
                    className="text-xs px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-colors"
                  >
                    {formData.languages.length === LANGUAGE_OPTIONS.length ? '❌ Désélectionner tout' : '✅ Sélectionner tout'}
                  </button>
                </div>
                <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-3">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {LANGUAGE_OPTIONS.map((language: string) => (
                      <label key={language} className="flex items-center text-sm">
                        <input type="checkbox" checked={formData.languages.includes(language)} onChange={() => handleLanguageToggle(language)} className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded mr-2" />
                        {language}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center mb-3">
                  <input id="useCustomPhone" type="checkbox" checked={formData.useCustomPhone} onChange={(e) => setFormData((p) => ({ ...p, useCustomPhone: e.target.checked }))} className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded" />
                  <label htmlFor="useCustomPhone" className="ml-2 text-sm font-medium text-gray-700">Utiliser un numéro personnalisé</label>
                </div>
                {formData.useCustomPhone && (
                  <>
                    <input type="text" placeholder="+33743331201" value={formData.customPhoneNumber} onChange={(e) => setFormData((p) => ({ ...p, customPhoneNumber: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" />
                    <p className="text-xs text-gray-500 mt-1">Format international</p>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Expérience (années)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Min</label>
                      <input type="number" min={1} max={50} value={formData.minExperience} onChange={(e) => setFormData((p) => ({ ...p, minExperience: Number(e.target.value) }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Max</label>
                      <input type="number" min={1} max={50} value={formData.maxExperience} onChange={(e) => setFormData((p) => ({ ...p, maxExperience: Number(e.target.value) }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Âge</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Min</label>
                      <input type="number" min={23} max={80} value={formData.minAge} onChange={(e) => setFormData((p) => ({ ...p, minAge: Number(e.target.value) }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Max</label>
                      <input type="number" min={23} max={80} value={formData.maxAge} onChange={(e) => setFormData((p) => ({ ...p, maxAge: Number(e.target.value) }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">⚠️ Minimum : 23 ans pour expatriés, 27 ans pour avocats</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
                  <Star className="mr-2" size={20} />
                  Early Providers
                </h3>
                <label className="flex items-center mb-3">
                  <input type="checkbox" checked={formData.markAsEarly} onChange={(e) => setFormData(p => ({ ...p, markAsEarly: e.target.checked }))} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                  <span className="ml-2 text-sm text-gray-700">Marquer comme Early Providers</span>
                </label>
                {formData.markAsEarly && (
                  <div className="ml-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pourcentage</label>
                    <input type="number" min={1} max={100} value={formData.earlyPercentage} onChange={(e) => setFormData(p => ({ ...p, earlyPercentage: parseInt(e.target.value, 10) }))} className="w-24 px-3 py-2 border border-gray-300 rounded-md" />
                    <p className="text-xs text-gray-500 mt-1">{Math.floor(formData.count * formData.earlyPercentage / 100)} profils sur {formData.count}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center">
                <input id="allowRealCalls" type="checkbox" checked={formData.allowRealCalls} onChange={(e) => setFormData((p) => ({ ...p, allowRealCalls: e.target.checked }))} className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded" />
                <label htmlFor="allowRealCalls" className="ml-2 block text-sm text-gray-700">Autoriser les appels réels</label>
              </div>

              <div className="pt-4">
                <button onClick={generateAaaProfiles} disabled={isGenerating} className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center">
                  {isGenerating ? (
                    <>
                      <Loader className="animate-spin mr-2" size={20} />
                      Génération {generatedCount}/{formData.count}
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2" size={20} />
                      Générer {formData.count} profils
                    </>
                  )}
                </button>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Erreur</h3>
                      <div className="mt-2 text-sm text-red-700">{error}</div>
                    </div>
                  </div>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex">
                    <Check className="h-5 w-5 text-green-400" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">Succès</h3>
                      <div className="mt-2 text-sm text-green-700">{success}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'manage' && (
          <div className="w-full">
            {/* Barre de filtres */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* Type */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600">Type:</span>
                  <div className="flex items-center space-x-1">
                    <button onClick={() => setRoleFilter('all')} className={`px-3 py-1.5 text-sm rounded transition-colors ${roleFilter === 'all' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                      Tous
                    </button>
                    <button onClick={() => setRoleFilter('lawyer')} className={`px-3 py-1.5 text-sm rounded transition-colors flex items-center ${roleFilter === 'lawyer' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                      <Scale className="mr-1" size={14} /> Avocats
                    </button>
                    <button onClick={() => setRoleFilter('expat')} className={`px-3 py-1.5 text-sm rounded transition-colors flex items-center ${roleFilter === 'expat' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                      <Users className="mr-1" size={14} /> Expatriés
                    </button>
                  </div>
                </div>

                {/* Séparateur */}
                <div className="h-8 w-px bg-gray-300 hidden md:block"></div>

                {/* Langue */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600">Langue:</span>
                  <select 
                    value={languageFilter} 
                    onChange={(e) => setLanguageFilter(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white min-w-[140px]"
                  >
                    <option value="all">Toutes</option>
                    {LANGUAGE_OPTIONS.map((lang: string) => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>

                {/* Séparateur */}
                <div className="h-8 w-px bg-gray-300 hidden md:block"></div>

                {/* Pays d'intervention */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600">Pays:</span>
                  <select 
                    value={countryFilter} 
                    onChange={(e) => setCountryFilter(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white min-w-[160px]"
                  >
                    <option value="all">Tous les pays</option>
                    {COUNTRIES_LIST.map((country: string) => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>

                {/* Séparateur */}
                <div className="h-8 w-px bg-gray-300 hidden md:block"></div>

                {/* Recherche */}
                <div className="relative flex-grow max-w-xs">
                  <input type="text" placeholder="Rechercher nom, email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                </div>

                {/* Bouton reset */}
                {(roleFilter !== 'all' || languageFilter !== 'all' || countryFilter !== 'all' || searchTerm) && (
                  <button 
                    onClick={() => {
                      setRoleFilter('all');
                      setLanguageFilter('all');
                      setCountryFilter('all');
                      setSearchTerm('');
                    }}
                    className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                  >
                    ✕ Réinitialiser
                  </button>
                )}

                {/* Actualiser */}
                <button onClick={loadExistingProfiles} className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors flex items-center ml-auto">
                  <RefreshCw size={14} className="mr-1" />
                  Actualiser
                </button>
              </div>

              {/* Actions en masse si sélection */}
              {selectedProfiles.length > 0 && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
                  <span className="text-sm text-gray-600">{selectedProfiles.length} sélectionné(s):</span>
                  <button onClick={() => handleBulkToggleOnline(true)} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors">
                    🟢 Mettre en ligne
                  </button>
                  <button onClick={() => handleBulkToggleOnline(false)} className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors">
                    ⚫ Mettre hors ligne
                  </button>
                  <button onClick={() => handleBulkToggleVisibility(false)} className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded transition-colors">
                    👁️‍🗨️ Masquer
                  </button>
                  <button onClick={() => handleBulkToggleVisibility(true)} className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded transition-colors">
                    👁️ Rendre visible
                  </button>
                </div>
              )}
            </div>

            {/* Compteur de résultats */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {filteredProfiles.length} profil{filteredProfiles.length > 1 ? 's' : ''} 
                {filteredProfiles.filter(p => p.isOnline).length > 0 && (
                  <span className="ml-2 text-sm font-normal text-green-600">
                    ({filteredProfiles.filter(p => p.isOnline).length} en ligne)
                  </span>
                )}
              </h3>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                        <input type="checkbox" checked={selectedProfiles.length === filteredProfiles.length && filteredProfiles.length > 0} onChange={handleSelectAll} className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded" />
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Photo</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Langues</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profil</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pays d'origine</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pays d'intervention</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Téléphone</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inscription</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center gap-1">
                          <Wallet size={14} />
                          Payout
                        </div>
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {isLoadingProfiles ? (
                      <tr>
                        <td colSpan={13} className="px-6 py-4 text-center">
                          <LoadingSpinner text="Chargement..." />
                        </td>
                      </tr>
                    ) : filteredProfiles.length > 0 ? (
                      filteredProfiles.map((profile) => (
                        <tr key={profile.id} className="hover:bg-gray-50">
                          {/* Checkbox */}
                          <td className="px-3 py-4 whitespace-nowrap">
                            <input type="checkbox" checked={selectedProfiles.includes(profile.id)} onChange={() => handleSelectProfile(profile.id)} className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded" />
                          </td>
                          
                          {/* Photo + Edit */}
                          <td className="px-3 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {/* ✅ Fallback: générer photo DiceBear si pas de photo */}
                              <img
                                src={profile.profilePhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}&backgroundColor=b6e3f4`}
                                alt={profile.fullName}
                                className="w-10 h-10 rounded-full object-cover border-2 border-gray-300 flex-shrink-0"
                              />
                              
                              <button
                                onClick={() => handleEditProfile(profile)}
                                className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded transition-colors flex-shrink-0"
                                title="Modifier le profil"
                                disabled={uploadingPhotoFor === profile.id}
                              >
                                {uploadingPhotoFor === profile.id ? (
                                  <Loader className="animate-spin" size={16} />
                                ) : (
                                  <Edit size={16} />
                                )}
                              </button>
                            </div>
                          </td>
                          
                          {/* Langues parlées */}
                          <td className="px-3 py-4">
                            <div className="text-sm text-gray-700 max-w-[150px]">
                              {getDisplayLanguages(profile)}
                            </div>
                          </td>
                          
                          {/* Profil (Nom, Email, Badge) */}
                          <td className="px-3 py-4">
                            <div className="min-w-[150px]">
                              <div className="text-sm font-medium text-gray-900">
                                {profile.firstName} {profile.lastName.charAt(0)}.
                              </div>
                              <div className="text-xs text-gray-500 truncate max-w-[180px]">{profile.email}</div>
                              {profile.isEarlyProvider && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                                  🏷️ {profile.earlyBadge === 'lawyer' ? 'Early Lawyer' : 'Early Expat'}
                                </span>
                              )}
                            </div>
                          </td>
                          
                          {/* Pays d'origine */}
                          <td className="px-3 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">
                              {getCountryNameFromCode(profile.country)}
                            </div>
                          </td>
                          
                          {/* Pays d'intervention (tous) */}
                          <td className="px-3 py-4">
                            <div className="text-sm text-gray-700 max-w-[200px]">
                              {getAllInterventionCountries(profile)}
                            </div>
                          </td>
                          
                          {/* Type (Avocat/Expatrié) */}
                          <td className="px-3 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${(profile.type || profile.role) === 'lawyer' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                              {(profile.type || profile.role) === 'lawyer' ? 'Avocat' : 'Expatrié'}
                            </span>
                          </td>
                          
                          {/* Téléphone */}
                          <td className="px-3 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {profile.phone || 'Non renseigné'}
                            </div>
                          </td>
                          
                          {/* Notes (Rating + Appels + Avis) */}
                          <td className="px-3 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {Array.from({ length: 5 }, (_, i) => (
                                <Star key={i} size={12} className={i < Math.floor(profile.rating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'} />
                              ))}
                              <span className="ml-1 text-sm">{(profile.rating || 0).toFixed(1)}</span>
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              📞 {profile.totalCalls || 0} • ⭐ {profile.reviewCount}
                            </div>
                          </td>
                          
                          {/* Statut (En ligne/Hors ligne + Visibilité) */}
                          <td className="px-3 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {/* Toggle En ligne - Style Switch */}
                              <button
                                onClick={() => handleToggleOnline(profile.id, profile.isOnline)}
                                disabled={!profile.isOnline && (!profile.phone || profile.phone === '')}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                                  profile.isOnline 
                                    ? 'bg-green-500 focus:ring-green-500' 
                                    : 'bg-gray-300 focus:ring-gray-400'
                                } ${!profile.isOnline && (!profile.phone || profile.phone === '') ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                title={profile.isOnline ? 'Cliquer pour mettre hors ligne' : (profile.phone ? 'Cliquer pour mettre en ligne' : 'Téléphone requis')}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
                                    profile.isOnline ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                              <span className={`text-xs font-medium ${profile.isOnline ? 'text-green-700' : 'text-gray-500'}`}>
                                {profile.isOnline ? 'En ligne' : 'Hors ligne'}
                              </span>
                              
                              {/* Séparateur */}
                              <span className="text-gray-300">|</span>
                              
                              {/* Toggle Visibilité - Style Switch */}
                              <button
                                onClick={() => handleToggleVisibility(profile.id, profile.isVisible)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                                  profile.isVisible 
                                    ? 'bg-blue-500 focus:ring-blue-500' 
                                    : 'bg-orange-400 focus:ring-orange-400'
                                }`}
                                title={profile.isVisible ? 'Cliquer pour masquer' : 'Cliquer pour rendre visible'}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
                                    profile.isVisible ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                              <span className={`text-xs font-medium ${profile.isVisible ? 'text-blue-700' : 'text-orange-600'}`}>
                                {profile.isVisible ? 'Visible' : 'Masqué'}
                              </span>
                            </div>
                          </td>
                          
                          {/* Date d'inscription */}
                          <td className="px-3 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {profile.createdAt ? formatDate(new Date(profile.createdAt)) : '-'}
                            </div>
                          </td>

                          {/* Payout Mode */}
                          <td className="px-3 py-4 whitespace-nowrap">
                            <select
                              value={profile.aaaPayoutMode || 'internal'}
                              onChange={(e) => updateProfilePayoutMode(profile.id, e.target.value)}
                              className={`text-xs px-2 py-1 rounded-md border focus:ring-2 focus:ring-purple-500 ${
                                profile.aaaPayoutMode === 'internal' || !profile.aaaPayoutMode
                                  ? 'bg-gray-100 border-gray-300 text-gray-700'
                                  : 'bg-purple-50 border-purple-300 text-purple-700'
                              }`}
                            >
                              <option value="internal">Interne</option>
                              {aaaPayoutConfig.externalAccounts.filter(a => a.isActive).map(acc => (
                                <option key={acc.id} value={acc.id}>
                                  {acc.name}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Actions */}
                          <td className="px-3 py-4 whitespace-nowrap">
                            <div className="flex gap-1">
                              {/* View Profile */}
                              <button 
                                onClick={() => window.open(`/profile/${profile.id}`, '_blank')} 
                                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors" 
                                title="Voir le profil public"
                              >
                                <Eye size={16} />
                              </button>
                              {/* Delete */}
                              <button 
                                onClick={() => { setSelectedProfile(profile); setShowDeleteModal(true); }} 
                                className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors" 
                                title="Supprimer"
                              >
                                <Trash size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={13} className="px-6 py-4 text-center text-gray-500">
                          Aucun profil trouvé
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'planner' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Planificateur</h2>
            <p className="text-sm text-gray-600 mb-6">Automatisation de la génération de profils</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Activer</label>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={planner.enabled} readOnly />
                  <span className="text-sm text-gray-600">Actif</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre par jour</label>
                <input type="number" min={1} max={200} value={planner.dailyCount} readOnly className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
                <select value={planner.role} disabled className="w-full px-3 py-2 border rounded">
                  <option value="lawyer">Avocat</option>
                  <option value="expat">Expatrié</option>
                </select>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-6">Fonctionnalité à venir</p>
          </div>
        )}

        {activeTab === 'simulation' && (
          <div className="space-y-6">
            {/* Toggle principal */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Simulation d'activité Busy</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Simule de l'activité en mettant des profils AAA en statut "Occupé" de manière rotative
                  </p>
                </div>
                <button
                  onClick={() => saveSimConfig({ ...simConfig, enabled: !simConfig.enabled })}
                  disabled={savingSimConfig}
                  className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                    simConfig.enabled ? 'bg-green-500' : 'bg-gray-300'
                  } ${savingSimConfig ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${
                    simConfig.enabled ? 'translate-x-9' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {simConfig.enabled && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center mb-4">
                  <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                  <span className="text-sm text-green-700">
                    Simulation active — le cron tourne toutes les 4 minutes
                  </span>
                </div>
              )}

              {!simConfig.enabled && simConfigLoaded && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center mb-4">
                  <AlertCircle className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0" />
                  <span className="text-sm text-gray-600">
                    Simulation désactivée — tous les profils AAA busy simulés seront automatiquement libérés
                  </span>
                </div>
              )}

              {/* Paramètres */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de profils simultanément busy
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={simConfig.simultaneousBusy}
                      onChange={(e) => setSimConfig(prev => ({ ...prev, simultaneousBusy: Number(e.target.value) }))}
                      className="flex-1"
                    />
                    <span className="text-lg font-semibold text-gray-900 w-8 text-center">{simConfig.simultaneousBusy}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Recommandé : 4-6 profils</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Durée busy par profil (minutes)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={5}
                      max={60}
                      step={5}
                      value={simConfig.busyDurationMinutes}
                      onChange={(e) => setSimConfig(prev => ({ ...prev, busyDurationMinutes: Number(e.target.value) }))}
                      className="flex-1"
                    />
                    <span className="text-lg font-semibold text-gray-900 w-12 text-center">{simConfig.busyDurationMinutes}m</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Recommandé : 15-25 minutes</p>
                </div>
              </div>

              {/* Bouton sauvegarder les paramètres */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => saveSimConfig(simConfig)}
                  disabled={savingSimConfig}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 flex items-center disabled:opacity-50"
                >
                  {savingSimConfig ? <Loader className="animate-spin mr-2" size={16} /> : <Save className="mr-2" size={16} />}
                  Enregistrer les paramètres
                </button>
              </div>
            </div>

            {/* Monitoring live */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-md font-semibold text-gray-900">
                  Profils actuellement en busy simulé ({simulatedProfiles.length})
                </h3>
                <button
                  onClick={loadSimulatedProfiles}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center"
                >
                  <RefreshCw size={14} className="mr-1" /> Rafraîchir
                </button>
              </div>

              {simulatedProfiles.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">
                  Aucun profil AAA en busy simulé actuellement
                </p>
              ) : (
                <div className="space-y-2">
                  {simulatedProfiles.map((p) => {
                    const elapsed = Math.round((Date.now() - p.simulatedAt.getTime()) / 60000);
                    const remaining = Math.max(0, simConfig.busyDurationMinutes - elapsed);
                    const progress = Math.min(100, (elapsed / simConfig.busyDurationMinutes) * 100);
                    return (
                      <div key={p.id} className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-100">
                        <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900 truncate">{p.name}</span>
                            <span className="text-xs text-gray-500 flex-shrink-0">
                              {remaining > 0 ? `${remaining}min restantes` : 'Expiration imminente'}
                            </span>
                          </div>
                          <div className="w-full bg-orange-200 rounded-full h-1.5 mt-1">
                            <div
                              className="bg-orange-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Explication */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Comment ça marche</h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>Un cron tourne toutes les 4 minutes et maintient le nombre de profils AAA busy configuré</li>
                <li>Les profils sont choisis aléatoirement et changent à chaque rotation</li>
                <li>Les profils ne sont jamais tous busy en même temps — ils sont décalés dans le temps</li>
                <li>Si un vrai appel arrive sur un AAA, le système de simulation ne l'affecte pas</li>
                <li>Désactiver le toggle libère immédiatement tous les profils busy simulés</li>
              </ul>
            </div>
          </div>
        )}

        <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Éditer le profil" size="large">
          {selectedProfile && (
            <div className="space-y-4 max-h-[85vh] overflow-y-auto px-2">
              {/* Informations de base */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-3">📋 Informations de base</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                    <input type="text" value={editFormData.firstName || ''} onChange={(e) => setEditFormData((p) => ({ ...p, firstName: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                    <input type="text" value={editFormData.lastName || ''} onChange={(e) => setEditFormData((p) => ({ ...p, lastName: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input type="email" value={editFormData.email || ''} onChange={(e) => setEditFormData((p) => ({ ...p, email: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                    <input type="text" value={editFormData.phone || ''} onChange={(e) => setEditFormData((p) => ({ ...p, phone: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="+33743331201" />
                  </div>
                </div>
              </div>

              {/* Photo de profil */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-3">📷 Photo de profil</h4>
                <div className="flex items-center space-x-4">
                  {newProfilePhoto ? (
                    <img src={newProfilePhoto} alt="Photo" className="w-20 h-20 rounded-full object-cover border-2 border-gray-300" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center border-2 border-dashed border-gray-400">
                      <span className="text-gray-400">?</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <Suspense fallback={<div>Chargement...</div>}>
                      <ImageUploader
                        currentImage={newProfilePhoto}
                        onImageUploaded={(url) => setNewProfilePhoto(url)}
                        uploadPath="profile_photos"
                        maxSizeMB={5}
                        isRegistration={false}
                      />
                    </Suspense>
                    <p className="text-xs text-gray-500 mt-2">PNG, JPG, WEBP jusqu'à 5MB</p>
                  </div>
                </div>
              </div>

              {/* Pays */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-800 mb-3">🌍 Pays</h4>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pays d'origine</label>
                  <select 
                    value={editFormData.country || ''} 
                    onChange={(e) => setEditFormData((p) => ({ ...p, country: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Sélectionner --</option>
                    {COUNTRIES_LIST.map((country: string) => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>

                {(editFormData.type || editFormData.role) === 'lawyer' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pays de pratique ({editFormData.practiceCountries?.length || 0})
                    </label>
                    {/* Tags des pays sélectionnés */}
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(editFormData.practiceCountries || []).map((country: string) => (
                        <span key={country} className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                          {country}
                          <button
                            type="button"
                            onClick={() => setEditFormData((prev) => ({
                              ...prev,
                              practiceCountries: prev.practiceCountries?.filter((c) => c !== country),
                            }))}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                          >
                            <X size={14} />
                          </button>
                        </span>
                      ))}
                      {(editFormData.practiceCountries?.length || 0) === 0 && (
                        <span className="text-gray-400 text-sm italic">Aucun pays sélectionné</span>
                      )}
                    </div>
                    {/* Dropdown pour ajouter */}
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value && !editFormData.practiceCountries?.includes(e.target.value)) {
                          setEditFormData((prev) => ({
                            ...prev,
                            practiceCountries: [...(prev.practiceCountries || []), e.target.value],
                          }));
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="">+ Ajouter un pays de pratique...</option>
                      {COUNTRIES_LIST.filter(c => !editFormData.practiceCountries?.includes(c)).map((country: string) => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                  </div>
                )}

                {(editFormData.type || editFormData.role) === 'expat' && (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pays de résidence actuel</label>
                      <select 
                        value={editFormData.residenceCountry || ''} 
                        onChange={(e) => setEditFormData((p) => ({ ...p, residenceCountry: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Sélectionner --</option>
                        {COUNTRIES_LIST.map((country: string) => (
                          <option key={country} value={country}>{country}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Pays précédents ({editFormData.previousCountries?.length || 0})
                      </label>
                      {/* Tags des pays sélectionnés */}
                      <div className="flex flex-wrap gap-2 mb-2">
                        {(editFormData.previousCountries || []).map((country: string) => (
                          <span key={country} className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                            {country}
                            <button
                              type="button"
                              onClick={() => handleEditPreviousCountryToggle(country)}
                              className="ml-1 text-blue-600 hover:text-blue-800"
                            >
                              <X size={14} />
                            </button>
                          </span>
                        ))}
                        {(editFormData.previousCountries?.length || 0) === 0 && (
                          <span className="text-gray-400 text-sm italic">Aucun pays précédent</span>
                        )}
                      </div>
                      {/* Dropdown pour ajouter */}
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value && !editFormData.previousCountries?.includes(e.target.value)) {
                            handleEditPreviousCountryToggle(e.target.value);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="">+ Ajouter un pays précédent...</option>
                        {COUNTRIES_LIST.filter(c => !editFormData.previousCountries?.includes(c) && c !== editFormData.residenceCountry).map((country: string) => (
                          <option key={country} value={country}>{country}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>

              {/* Langues parlées */}
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-green-800 mb-3">
                  💬 Langues parlées ({editFormData.languages?.length || 0})
                </h4>
                {/* Tags des langues sélectionnées */}
                <div className="flex flex-wrap gap-2 mb-2">
                  {(editFormData.languages || []).map((language: string) => (
                    <span key={language} className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                      {language}
                      <button
                        type="button"
                        onClick={() => handleEditLanguageToggle(language)}
                        className="ml-1 text-green-600 hover:text-green-800"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                  {(editFormData.languages?.length || 0) === 0 && (
                    <span className="text-gray-400 text-sm italic">Aucune langue sélectionnée</span>
                  )}
                </div>
                {/* Dropdown pour ajouter */}
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value && !editFormData.languages?.includes(e.target.value)) {
                      handleEditLanguageToggle(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                >
                  <option value="">+ Ajouter une langue...</option>
                  {LANGUAGE_OPTIONS.filter(l => !editFormData.languages?.includes(l)).map((language: string) => (
                    <option key={language} value={language}>{language}</option>
                  ))}
                </select>
              </div>

              {/* Spécialités - Avocats */}
              {(editFormData.type || editFormData.role) === 'lawyer' && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-purple-800 mb-3">
                    ⚖️ Spécialités juridiques ({editFormData.specialties?.length || 0})
                  </h4>
                  {/* Tags des spécialités sélectionnées */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(editFormData.specialties || []).map((specialty: string) => (
                      <span key={specialty} className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">
                        {getSpecialtyLabel(specialty, 'fr')}
                        <button
                          type="button"
                          onClick={() => setEditFormData((prev) => ({
                            ...prev,
                            specialties: prev.specialties?.filter((s) => s !== specialty),
                          }))}
                          className="ml-1 text-purple-600 hover:text-purple-800"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                    {(editFormData.specialties?.length || 0) === 0 && (
                      <span className="text-gray-400 text-sm italic">Aucune spécialité sélectionnée</span>
                    )}
                  </div>
                  {/* Dropdown pour ajouter */}
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value && !editFormData.specialties?.includes(e.target.value)) {
                        setEditFormData((prev) => ({
                          ...prev,
                          specialties: [...(prev.specialties || []), e.target.value],
                        }));
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  >
                    <option value="">+ Ajouter une spécialité...</option>
                    {LAWYER_SPECIALTIES.filter(s => !editFormData.specialties?.includes(s)).map((specialty: string) => (
                      <option key={specialty} value={specialty}>{getSpecialtyLabel(specialty, 'fr')}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Types d'aide - Expatriés */}
              {(editFormData.type || editFormData.role) === 'expat' && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-purple-800 mb-3">
                    🤝 Types d'aide ({editFormData.specialties?.length || 0})
                  </h4>
                  {/* Tags des types d'aide sélectionnés */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(editFormData.specialties || []).map((helpType: string) => (
                      <span key={helpType} className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">
                        {getExpatHelpTypeLabel(helpType, 'fr')}
                        <button
                          type="button"
                          onClick={() => setEditFormData((prev) => ({
                            ...prev,
                            specialties: prev.specialties?.filter((s) => s !== helpType),
                            helpTypes: prev.helpTypes?.filter((s) => s !== helpType),
                          }))}
                          className="ml-1 text-purple-600 hover:text-purple-800"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                    {(editFormData.specialties?.length || 0) === 0 && (
                      <span className="text-gray-400 text-sm italic">Aucun type d'aide sélectionné</span>
                    )}
                  </div>
                  {/* Dropdown pour ajouter */}
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value && !editFormData.specialties?.includes(e.target.value)) {
                        setEditFormData((prev) => ({
                          ...prev,
                          specialties: [...(prev.specialties || []), e.target.value],
                          helpTypes: [...(prev.helpTypes || []), e.target.value],
                        }));
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  >
                    <option value="">+ Ajouter un type d'aide...</option>
                    {EXPAT_HELP_TYPES.filter(h => !editFormData.specialties?.includes(h)).map((helpType: string) => (
                      <option key={helpType} value={helpType}>{getExpatHelpTypeLabel(helpType, 'fr')}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Informations professionnelles - Avocats */}
              {(editFormData.type || editFormData.role) === 'lawyer' && (
                <div className="bg-yellow-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-yellow-800 mb-3">🎓 Formation et certifications</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Université / École de droit</label>
                      <input 
                        type="text" 
                        value={editFormData.lawSchool || ''} 
                        onChange={(e) => setEditFormData((p) => ({ ...p, lawSchool: e.target.value }))} 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500" 
                        placeholder="Ex: Université Paris 1 Panthéon-Sorbonne"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Année de diplôme</label>
                      <input 
                        type="number" 
                        min={1960} 
                        max={new Date().getFullYear()} 
                        value={editFormData.graduationYear || ''} 
                        onChange={(e) => setEditFormData((p) => ({ ...p, graduationYear: parseInt(e.target.value, 10) }))} 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Certifications ({editFormData.certifications?.length || 0})
                    </label>
                    {/* Tags des certifications sélectionnées */}
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(editFormData.certifications || []).map((certKey: string) => (
                        <span key={certKey} className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
                          {CERTIFICATIONS_MULTILINGUE[certKey]?.fr || certKey}
                          <button
                            type="button"
                            onClick={() => handleEditCertificationToggle(certKey)}
                            className="ml-1 text-yellow-600 hover:text-yellow-800"
                          >
                            <X size={14} />
                          </button>
                        </span>
                      ))}
                      {(editFormData.certifications?.length || 0) === 0 && (
                        <span className="text-gray-400 text-sm italic">Aucune certification</span>
                      )}
                    </div>
                    {/* Dropdown pour ajouter */}
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value && !editFormData.certifications?.includes(e.target.value)) {
                          handleEditCertificationToggle(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
                    >
                      <option value="">+ Ajouter une certification...</option>
                      {Object.keys(CERTIFICATIONS_MULTILINGUE).filter(c => !editFormData.certifications?.includes(c)).map((certKey: string) => (
                        <option key={certKey} value={certKey}>{CERTIFICATIONS_MULTILINGUE[certKey].fr}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Motivation - Expatriés */}
              {(editFormData.type || editFormData.role) === 'expat' && (
                <div className="bg-yellow-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-yellow-800 mb-3">💡 Motivation / Présentation</h4>
                  <textarea 
                    value={typeof editFormData.motivation === 'string' ? editFormData.motivation : (editFormData.motivation as Record<string, string>)?.fr || ''} 
                    onChange={(e) => {
                      if (typeof editFormData.motivation === 'object') {
                        setEditFormData((p) => ({ 
                          ...p, 
                          motivation: {
                            ...(p.motivation as Record<string, string>),
                            fr: e.target.value
                          }
                        }));
                      } else {
                        setEditFormData((p) => ({ ...p, motivation: e.target.value }));
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500" 
                    rows={3}
                    placeholder="Ex: Passionné par l'aide aux expatriés à..."
                  />
                </div>
              )}

              {/* Bio multilingue */}
              <div className="bg-indigo-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-indigo-800 mb-3">📝 Bio / Description (9 langues)</h4>
                
                {/* Onglets de langue */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {[
                    { code: 'fr', label: '🇫🇷 FR' },
                    { code: 'en', label: '🇬🇧 EN' },
                    { code: 'es', label: '🇪🇸 ES' },
                    { code: 'de', label: '🇩🇪 DE' },
                    { code: 'pt', label: '🇵🇹 PT' },
                    { code: 'ru', label: '🇷🇺 RU' },
                    { code: 'zh', label: '🇨🇳 ZH' },
                    { code: 'ar', label: '🇸🇦 AR' },
                    { code: 'hi', label: '🇮🇳 HI' },
                  ].map((lang) => {
                    const bioData = editFormData.bio as Record<string, string> | undefined;
                    const hasContent = bioData && bioData[lang.code] && bioData[lang.code].trim() !== '';
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => setEditBioLang(lang.code)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          editBioLang === lang.code
                            ? 'bg-indigo-600 text-white'
                            : hasContent
                              ? 'bg-indigo-200 text-indigo-800 hover:bg-indigo-300'
                              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                      >
                        {lang.label}
                        {hasContent && editBioLang !== lang.code && <span className="ml-1">✓</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Zone de texte pour la langue sélectionnée */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bio en {editBioLang === 'fr' ? 'Français' : editBioLang === 'en' ? 'Anglais' : editBioLang === 'es' ? 'Espagnol' : editBioLang === 'de' ? 'Allemand' : editBioLang === 'pt' ? 'Portugais' : editBioLang === 'ru' ? 'Russe' : editBioLang === 'zh' ? 'Chinois' : editBioLang === 'ar' ? 'Arabe' : 'Hindi'}
                  </label>
                  <textarea
                    value={
                      typeof editFormData.bio === 'object' 
                        ? (editFormData.bio as Record<string, string>)?.[editBioLang] || '' 
                        : ''
                    }
                    onChange={(e) => {
                      setEditFormData((p) => ({
                        ...p,
                        bio: {
                          ...(typeof p.bio === 'object' ? p.bio as Record<string, string> : {}),
                          [editBioLang]: e.target.value
                        }
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows={4}
                    placeholder={`Entrez la bio en ${editBioLang === 'fr' ? 'français' : editBioLang === 'en' ? 'anglais' : editBioLang}...`}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {((editFormData.bio as Record<string, string>)?.[editBioLang] || '').length} caractères
                  </p>
                </div>

                {/* Indicateur de remplissage */}
                <div className="mt-3 text-xs text-gray-600">
                  {(() => {
                    const bioData = editFormData.bio as Record<string, string> | undefined;
                    const filledCount = bioData ? Object.values(bioData).filter(v => v && v.trim() !== '').length : 0;
                    return `${filledCount}/9 langues remplies`;
                  })()}
                </div>
              </div>

              {/* Paramètres supplémentaires */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-3">⚙️ Paramètres</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Temps de réponse</label>
                    <select 
                      value={editFormData.responseTime || '< 5 minutes'} 
                      onChange={(e) => setEditFormData((p) => ({ ...p, responseTime: e.target.value }))} 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                      {RESPONSE_TIMES.map((time: string) => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expérience (années)</label>
                    <input type="number" min={1} max={50} value={editFormData.yearsOfExperience || ''} onChange={(e) => setEditFormData((p) => ({ ...p, yearsOfExperience: parseInt(e.target.value, 10) }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                    <input 
                      type="number" 
                      step="0.0001"
                      value={editFormData.mapLocation?.lat || ''} 
                      onChange={(e) => setEditFormData((p) => ({ 
                        ...p, 
                        mapLocation: { ...p.mapLocation!, lat: parseFloat(e.target.value) } 
                      }))} 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                    <input 
                      type="number" 
                      step="0.0001"
                      value={editFormData.mapLocation?.lng || ''} 
                      onChange={(e) => setEditFormData((p) => ({ 
                        ...p, 
                        mapLocation: { ...p.mapLocation!, lng: parseFloat(e.target.value) } 
                      }))} 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500" 
                    />
                  </div>
                </div>
              </div>

              {/* Statistiques */}
              <div className="bg-orange-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-orange-800 mb-3">📊 Statistiques</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Note moyenne</label>
                    <input type="number" min={1} max={5} step={0.1} value={editFormData.rating || ''} onChange={(e) => setEditFormData((p) => ({ ...p, rating: parseFloat(e.target.value) }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre d'avis</label>
                    <input type="number" min={0} max={1000} value={editFormData.reviewCount || ''} onChange={(e) => setEditFormData((p) => ({ ...p, reviewCount: parseInt(e.target.value, 10) }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre d'appels</label>
                    <input type="number" min={0} max={10000} value={editFormData.totalCalls || ''} onChange={(e) => setEditFormData((p) => ({ ...p, totalCalls: parseInt(e.target.value, 10) }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </div>
                </div>
              </div>

              {/* Statut en ligne */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-3">🔘 Statut</h4>
                <div className="flex items-center space-x-4">
                  <button type="button" onClick={() => setEditFormData(p => ({ ...p, isOnline: true }))} className={`flex-1 px-4 py-3 rounded-md transition-colors font-medium ${editFormData.isOnline ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    🟢 En ligne
                  </button>
                  <button type="button" onClick={() => setEditFormData(p => ({ ...p, isOnline: false }))} className={`flex-1 px-4 py-3 rounded-md transition-colors font-medium ${!editFormData.isOnline ? 'bg-gray-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    ⚫ Hors ligne
                  </button>
                </div>
              </div>

              {/* Early Provider */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-800 mb-3">🏷️ Early Provider</h4>
                <label className="flex items-center">
                  <input type="checkbox" checked={!!editFormData.isEarlyProvider} onChange={(e) => setEditFormData(p => ({ ...p, isEarlyProvider: e.target.checked, earlyBadge: e.target.checked ? ((p.type || p.role) === 'lawyer' ? 'lawyer' : 'expat') : undefined }))} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                  <span className="ml-2 text-sm text-gray-700">Marquer comme Early Provider</span>
                </label>
                {editFormData.isEarlyProvider && (
                  <div className="mt-2 p-2 bg-blue-100 rounded text-sm text-blue-800">
                    {(editFormData.type || editFormData.role) === 'lawyer' ? '🏷️ Early Lawyer' : '🏷️ Early Expat'}
                  </div>
                )}
              </div>

              {/* Options de visibilité */}
              <div className="flex items-center space-x-6 py-2">
                <label className="flex items-center">
                  <input type="checkbox" checked={!!editFormData.isVisible} onChange={(e) => setEditFormData((p) => ({ ...p, isVisible: e.target.checked }))} className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded" />
                  <span className="ml-2 text-sm text-gray-700">Visible sur le site</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={!!editFormData.isCallable} onChange={(e) => setEditFormData((p) => ({ ...p, isCallable: e.target.checked }))} className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded" />
                  <span className="ml-2 text-sm text-gray-700">Appelable</span>
                </label>
              </div>

              {/* Boutons d'action */}
              <div className="flex justify-end space-x-3 pt-4 border-t sticky bottom-0 bg-white py-4">
                <button onClick={() => setShowEditModal(false)} disabled={isLoading} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">
                  Annuler
                </button>
                <button onClick={handleSaveProfile} disabled={isLoading} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors flex items-center">
                  {isLoading ? <Loader className="animate-spin mr-2" size={16} /> : <Save size={16} className="mr-2" />}
                  Enregistrer
                </button>
              </div>
            </div>
          )}
        </Modal>

        <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Supprimer le profil" size="small">
          {selectedProfile && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Attention</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>
                        Confirmer la suppression de :
                        <br />
                        <strong>{selectedProfile.fullName}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button onClick={() => setShowDeleteModal(false)} disabled={isLoading} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">
                  Annuler
                </button>
                <button onClick={handleDeleteProfile} disabled={isLoading} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors flex items-center">
                  {isLoading ? <Loader className="animate-spin mr-2" size={16} /> : <Trash className="mr-2" size={16} />}
                  Supprimer
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* ========== PAYOUT CONFIG MODAL ========== */}
        <Modal isOpen={showPayoutConfigModal} onClose={() => setShowPayoutConfigModal(false)} title="Configuration Payout AAA">
          <div className="space-y-6">
            {/* Default Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mode par défaut pour nouveaux profils</label>
              <select
                value={aaaPayoutConfig.defaultMode}
                onChange={(e) => saveAaaPayoutConfig({ ...aaaPayoutConfig, defaultMode: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
              >
                <option value="internal">Interne (SOS-Expat)</option>
                {aaaPayoutConfig.externalAccounts.filter(a => a.isActive).map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name} ({acc.gateway.toUpperCase()})</option>
                ))}
              </select>
            </div>

            {/* External Accounts List */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-medium text-gray-700">Comptes externes ({aaaPayoutConfig.externalAccounts.length})</h3>
                <button
                  onClick={() => setShowAddAccountModal(true)}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 flex items-center"
                >
                  <Plus size={16} className="mr-1" /> Ajouter
                </button>
              </div>

              {aaaPayoutConfig.externalAccounts.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <Wallet className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">Aucun compte externe configuré</p>
                  <p className="text-xs text-gray-400">Tous les payouts AAA resteront sur SOS-Expat</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {aaaPayoutConfig.externalAccounts.map(acc => (
                    <div key={acc.id} className={`p-4 rounded-lg border ${acc.isActive ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-300 opacity-60'}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          {acc.gateway === 'paypal' ? (
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <CreditCard className="text-blue-600" size={20} />
                            </div>
                          ) : (
                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                              <CreditCard className="text-purple-600" size={20} />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{acc.name}</p>
                            <p className="text-sm text-gray-500">{acc.gateway.toUpperCase()} • {acc.holderName}</p>
                            <p className="text-xs text-gray-400">{acc.accountId}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateExternalAccount(acc.id, { isActive: !acc.isActive })}
                            className={`px-2 py-1 text-xs rounded ${acc.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}
                          >
                            {acc.isActive ? 'Actif' : 'Inactif'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingAccount(acc);
                              setNewAccountForm(acc);
                              setShowAddAccountModal(true);
                            }}
                            className="p-1 text-gray-400 hover:text-blue-600"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Supprimer le compte "${acc.name}" ?`)) {
                                deleteExternalAccount(acc.id);
                              }
                            }}
                            className="p-1 text-gray-400 hover:text-red-600"
                          >
                            <Trash size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Dernière mise à jour: {aaaPayoutConfig.lastUpdated ? aaaPayoutConfig.lastUpdated.toLocaleString('fr-FR') : 'Jamais'}
              </p>
            </div>
          </div>
        </Modal>

        {/* ========== ADD/EDIT ACCOUNT MODAL ========== */}
        <Modal
          isOpen={showAddAccountModal}
          onClose={() => {
            setShowAddAccountModal(false);
            setEditingAccount(null);
            setNewAccountForm({ gateway: 'paypal', isActive: true });
          }}
          title={editingAccount ? 'Modifier le compte' : 'Ajouter un compte externe'}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom du compte *</label>
              <input
                type="text"
                value={newAccountForm.name || ''}
                onChange={(e) => setNewAccountForm({ ...newAccountForm, name: e.target.value })}
                placeholder="Ex: PayPal Thaïlande"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gateway *</label>
              <select
                value={newAccountForm.gateway || 'paypal'}
                onChange={(e) => setNewAccountForm({ ...newAccountForm, gateway: e.target.value as 'paypal' | 'stripe' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
              >
                <option value="paypal">PayPal</option>
                <option value="stripe">Stripe</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {newAccountForm.gateway === 'paypal' ? 'PayPal Merchant ID *' : 'Stripe Account ID *'}
              </label>
              <input
                type="text"
                value={newAccountForm.accountId || ''}
                onChange={(e) => setNewAccountForm({ ...newAccountForm, accountId: e.target.value })}
                placeholder={newAccountForm.gateway === 'paypal' ? 'XXXXXXXXXX' : 'acct_XXXXXXXXX'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email (optionnel)</label>
              <input
                type="email"
                value={newAccountForm.email || ''}
                onChange={(e) => setNewAccountForm({ ...newAccountForm, email: e.target.value })}
                placeholder="email@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Titulaire du compte *</label>
              <input
                type="text"
                value={newAccountForm.holderName || ''}
                onChange={(e) => setNewAccountForm({ ...newAccountForm, holderName: e.target.value })}
                placeholder="Prénom Nom"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pays du compte</label>
              <input
                type="text"
                value={newAccountForm.country || ''}
                onChange={(e) => setNewAccountForm({ ...newAccountForm, country: e.target.value })}
                placeholder="TH, FR, US..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="accountActive"
                checked={newAccountForm.isActive ?? true}
                onChange={(e) => setNewAccountForm({ ...newAccountForm, isActive: e.target.checked })}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
              <label htmlFor="accountActive" className="ml-2 text-sm text-gray-700">Compte actif</label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => {
                  setShowAddAccountModal(false);
                  setEditingAccount(null);
                  setNewAccountForm({ gateway: 'paypal', isActive: true });
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (editingAccount) {
                    updateExternalAccount(editingAccount.id, newAccountForm);
                    setShowAddAccountModal(false);
                    setEditingAccount(null);
                    setNewAccountForm({ gateway: 'paypal', isActive: true });
                  } else {
                    addExternalAccount();
                  }
                }}
                disabled={savingPayoutConfig}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center"
              >
                {savingPayoutConfig ? <Loader className="animate-spin mr-2" size={16} /> : <Save className="mr-2" size={16} />}
                {editingAccount ? 'Mettre à jour' : 'Ajouter'}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
};

export default AdminAaaProfiles;