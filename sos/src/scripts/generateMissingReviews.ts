/**
 * Script de génération des avis manquants
 * ========================================
 *
 * Ce script génère les avis manquants pour que le nombre d'avis réels
 * corresponde au reviewCount affiché dans les profils.
 *
 * Usage depuis la console du navigateur (dans l'admin):
 *   import { previewMissingReviews, generateMissingReviews, generateMissingReviewsForOne } from './scripts/generateMissingReviews';
 *
 *   // D'abord prévisualiser ce qui sera généré
 *   await previewMissingReviews();
 *
 *   // Puis générer les avis manquants
 *   await generateMissingReviews();
 *
 *   // Pour un seul profil
 *   await generateMissingReviewsForOne('providerId');
 */

import {
  collection, getDocs, doc, addDoc, getDoc, query, where,
  Timestamp, serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Import des traductions pour les commentaires
import aaaTranslationsFr from '../helper/aaaprofiles/admin_aaa_fr.json';
import aaaTranslationsEn from '../helper/aaaprofiles/admin_aaa_en.json';
import aaaTranslationsEs from '../helper/aaaprofiles/admin_aaa_es.json';
import aaaTranslationsDe from '../helper/aaaprofiles/admin_aaa_de.json';

// Import des données de pays pour les noms
import { getNamesByCountry } from '../data/names-by-country';
import { countriesData } from '../data/countries';

// =============================================
// TYPES
// =============================================

interface ProfileToFix {
  id: string;
  fullName: string;
  type: 'lawyer' | 'expat';
  country: string;
  languages: string[];
  existingReviews: number;
  expectedReviews: number;
  missingReviews: number;
  createdAt: Date;
}

interface GenerationResult {
  profileId: string;
  profileName: string;
  generated: number;
  errors: number;
}

interface GenerationSummary {
  totalProfiles: number;
  profilesNeedingReviews: number;
  totalReviewsGenerated: number;
  errors: number;
  results: GenerationResult[];
}

// =============================================
// CONFIGURATION
// =============================================

const TRANSLATIONS_MAP: Record<string, any> = {
  fr: aaaTranslationsFr,
  en: aaaTranslationsEn,
  es: aaaTranslationsEs,
  de: aaaTranslationsDe,
};

const LANGUAGE_TO_I18N: Record<string, string> = {
  'Français': 'fr', 'French': 'fr', 'fr': 'fr',
  'English': 'en', 'Anglais': 'en', 'en': 'en',
  'Español': 'es', 'Spanish': 'es', 'Espagnol': 'es', 'es': 'es',
  'Deutsch': 'de', 'German': 'de', 'Allemand': 'de', 'de': 'de',
};

// Catégories de longueur pour les commentaires
const REVIEW_CATEGORIES = ['veryShort', 'short', 'medium', 'long', 'veryLong'] as const;
const REVIEWS_PER_CATEGORY = 80;

// Cache des commentaires déjà utilisés pour ce run
const usedCommentKeys = new Set<string>();

// =============================================
// FONCTIONS UTILITAIRES
// =============================================

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Génère une note réaliste (distribution vers les bonnes notes)
 */
function generateRealisticRating(): number {
  const rand = Math.random();
  if (rand < 0.50) return 5;      // 50% de 5 étoiles
  if (rand < 0.80) return 4;      // 30% de 4 étoiles
  if (rand < 0.92) return 4.5;    // 12% de 4.5 étoiles
  if (rand < 0.97) return 3.5;    // 5% de 3.5 étoiles
  return 3;                        // 3% de 3 étoiles
}

/**
 * Obtient un commentaire unique pour un avis
 */
function getUniqueComment(profileLanguages: string[], providerId: string): { key: string; text: string } {
  // Déterminer la langue du commentaire
  let lang = 'fr';
  for (const profileLang of profileLanguages) {
    if (LANGUAGE_TO_I18N[profileLang]) {
      lang = LANGUAGE_TO_I18N[profileLang];
      break;
    }
  }

  const translations = TRANSLATIONS_MAP[lang] || TRANSLATIONS_MAP['fr'];
  const reviews = translations?.admin?.aaa?.reviews;

  if (!reviews) {
    // Fallback: commentaire générique
    return { key: 'generic', text: 'Excellent service, très professionnel !' };
  }

  // Essayer de trouver un commentaire non utilisé
  let attempts = 0;
  const maxAttempts = 500;

  while (attempts < maxAttempts) {
    const category = randomChoice([...REVIEW_CATEGORIES]);
    const index = randomInt(1, REVIEWS_PER_CATEGORY);
    const key = `${lang}_${category}_${index}_${providerId}`;

    if (!usedCommentKeys.has(key)) {
      usedCommentKeys.add(key);
      const text = reviews[category]?.[String(index)];
      if (text) {
        return { key: `admin.aaa.reviews.${category}.${index}`, text };
      }
    }
    attempts++;
  }

  // Fallback si tous les commentaires sont utilisés
  const fallbackTexts = [
    'Service excellent et professionnel.',
    'Très satisfait de l\'accompagnement.',
    'Je recommande vivement.',
    'Aide précieuse et rapide.',
    'Très bonne expérience.',
    'Conseils clairs et utiles.',
    'Réactif et compétent.',
    'Super service !',
    'Parfait pour les expats.',
    'Merci beaucoup !'
  ];

  return {
    key: `fallback_${Date.now()}_${Math.random()}`,
    text: randomChoice(fallbackTexts)
  };
}

/**
 * Génère un prénom de client aléatoire
 */
function getRandomClientName(profileCountry: string): { name: string; country: string } {
  // Liste de codes pays pour les clients
  const clientCountryCodes = ['FR', 'US', 'GB', 'DE', 'ES', 'IT', 'CA', 'AU', 'BE', 'CH'];
  const countryCode = randomChoice(clientCountryCodes);

  // Trouver le nom du pays
  const countryData = countriesData.find(c => c.code === countryCode);
  const clientCountry = countryData?.nameEn || 'France';

  try {
    const names = getNamesByCountry(countryCode);
    const gender = Math.random() > 0.5 ? 'male' : 'female';
    const firstNames = names?.[gender] || ['Jean', 'Marie', 'Pierre', 'Sophie'];
    return { name: randomChoice(firstNames), country: clientCountry };
  } catch {
    const fallbackNames = ['Alex', 'Sam', 'Chris', 'Jordan', 'Morgan', 'Taylor', 'Casey', 'Riley'];
    return { name: randomChoice(fallbackNames), country: clientCountry };
  }
}

/**
 * Génère une date réaliste pour un avis (entre la création du profil et maintenant)
 */
function generateReviewDate(profileCreatedAt: Date, reviewIndex: number, totalReviews: number): Date {
  const now = new Date();
  const daysSinceCreation = Math.floor((now.getTime() - profileCreatedAt.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceCreation <= 0) {
    return new Date(now.getTime() - randomInt(1, 30) * 24 * 60 * 60 * 1000);
  }

  // Distribuer les avis sur la période depuis la création
  const daysOffset = Math.floor((reviewIndex / totalReviews) * daysSinceCreation);
  const jitter = randomInt(-3, 3); // Ajouter un peu de variation
  const reviewDate = new Date(profileCreatedAt.getTime() + (daysOffset + jitter) * 24 * 60 * 60 * 1000);

  // S'assurer que la date n'est pas dans le futur
  return reviewDate > now ? new Date(now.getTime() - randomInt(1, 7) * 24 * 60 * 60 * 1000) : reviewDate;
}

// =============================================
// FONCTIONS PRINCIPALES
// =============================================

/**
 * Compte les avis existants pour un profil
 */
async function countExistingReviews(providerId: string): Promise<number> {
  const reviewsCol = collection(db, 'reviews');
  const q = query(
    reviewsCol,
    where('providerId', '==', providerId),
    where('status', '==', 'published'),
    where('isPublic', '==', true)
  );
  const snapshot = await getDocs(q);
  return snapshot.size;
}

/**
 * Récupère tous les profils qui ont besoin d'avis supplémentaires
 */
async function getProfilesNeedingReviews(): Promise<ProfileToFix[]> {
  const profiles: ProfileToFix[] = [];
  const profilesCol = collection(db, 'sos_profiles');
  const snapshot = await getDocs(profilesCol);

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const expectedReviews = typeof data.reviewCount === 'number' ? data.reviewCount : 0;

    if (expectedReviews <= 0) continue;

    const existingReviews = await countExistingReviews(docSnap.id);
    const missingReviews = expectedReviews - existingReviews;

    if (missingReviews > 0) {
      // Déterminer la date de création
      let createdAt = new Date();
      if (data.createdAt?.toDate) {
        createdAt = data.createdAt.toDate();
      } else if (data.createdAt?.seconds) {
        createdAt = new Date(data.createdAt.seconds * 1000);
      } else if (typeof data.createdAt === 'number') {
        createdAt = new Date(data.createdAt);
      }

      // Déterminer le type
      const type = data.type === 'lawyer' || data.role === 'lawyer' ? 'lawyer' : 'expat';

      // Récupérer les langues
      let languages: string[] = [];
      if (Array.isArray(data.languages)) {
        languages = data.languages;
      } else if (Array.isArray(data.languagesSpoken)) {
        languages = data.languagesSpoken;
      }

      profiles.push({
        id: docSnap.id,
        fullName: data.fullName || data.displayName || docSnap.id,
        type,
        country: data.country || data.residenceCountry || 'Unknown',
        languages,
        existingReviews,
        expectedReviews,
        missingReviews,
        createdAt
      });
    }
  }

  return profiles;
}

/**
 * Prévisualise les avis à générer
 */
export async function previewMissingReviews(): Promise<{ profiles: ProfileToFix[]; totalMissing: number }> {
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

  // Grouper par type
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

  console.log('\n========================================');
  console.log('⚠️  Exécutez generateMissingReviews() pour créer les avis');
  console.log('========================================\n');

  return { profiles, totalMissing };
}

/**
 * Génère les avis manquants pour tous les profils
 */
export async function generateMissingReviews(): Promise<GenerationSummary> {
  console.log('========================================');
  console.log('GÉNÉRATION: Avis manquants');
  console.log('========================================\n');

  // Reset du cache des commentaires utilisés
  usedCommentKeys.clear();

  const profiles = await getProfilesNeedingReviews();
  const results: GenerationResult[] = [];
  let totalGenerated = 0;
  let totalErrors = 0;

  if (profiles.length === 0) {
    console.log('✅ Aucun profil n\'a besoin d\'avis supplémentaires!');
    return {
      totalProfiles: 0,
      profilesNeedingReviews: 0,
      totalReviewsGenerated: 0,
      errors: 0,
      results: []
    };
  }

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
        // Générer les données de l'avis
        const rating = generateRealisticRating();
        const { key: commentKey, text: comment } = getUniqueComment(profile.languages, profile.id);
        const { name: clientName, country: clientCountry } = getRandomClientName(profile.country);
        const reviewDate = generateReviewDate(
          profile.createdAt,
          profile.existingReviews + j,
          profile.expectedReviews
        );
        const serviceType = profile.type === 'lawyer' ? 'lawyer_call' : 'expat_call';

        // Créer l'avis dans Firestore
        await addDoc(collection(db, 'reviews'), {
          providerId: profile.id,
          clientId: `generated_client_${Date.now()}_${j}`,
          clientName,
          clientCountry,
          rating,
          comment,
          commentKey,
          isPublic: true,
          status: 'published',
          serviceType,
          createdAt: Timestamp.fromDate(reviewDate),
          helpfulVotes: randomInt(0, 15),
          verified: true,
          generatedAt: serverTimestamp() // Marquer comme généré
        });

        generated++;
        totalGenerated++;

        // Progress log tous les 5 avis
        if ((j + 1) % 5 === 0) {
          console.log(`   ... ${j + 1}/${profile.missingReviews} avis créés`);
        }

      } catch (error) {
        errors++;
        totalErrors++;
        console.error(`   ❌ Erreur avis #${j + 1}:`, error);
      }

      // Petite pause pour ne pas surcharger Firestore
      if (j % 10 === 9) {
        await new Promise(r => setTimeout(r, 100));
      }
    }

    const emoji = errors === 0 ? '✅' : '⚠️';
    console.log(`   ${emoji} ${generated} avis créés${errors > 0 ? `, ${errors} erreurs` : ''}`);

    results.push({
      profileId: profile.id,
      profileName: profile.fullName,
      generated,
      errors
    });
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

  return {
    totalProfiles: profiles.length,
    profilesNeedingReviews: profiles.length,
    totalReviewsGenerated: totalGenerated,
    errors: totalErrors,
    results
  };
}

/**
 * Génère les avis manquants pour un seul profil
 */
export async function generateMissingReviewsForOne(providerId: string): Promise<GenerationResult | null> {
  console.log(`\n🔄 Génération des avis manquants pour: ${providerId}\n`);

  // Reset du cache
  usedCommentKeys.clear();

  // Récupérer le profil
  const profileDoc = await getDoc(doc(db, 'sos_profiles', providerId));

  if (!profileDoc.exists()) {
    console.error(`❌ Profil non trouvé: ${providerId}`);
    return null;
  }

  const data = profileDoc.data();
  const expectedReviews = typeof data.reviewCount === 'number' ? data.reviewCount : 0;
  const existingReviews = await countExistingReviews(providerId);
  const missingReviews = expectedReviews - existingReviews;

  console.log(`Nom: ${data.fullName || providerId}`);
  console.log(`Type: ${data.type || data.role}`);
  console.log(`Avis attendus: ${expectedReviews}`);
  console.log(`Avis existants: ${existingReviews}`);
  console.log(`Avis manquants: ${missingReviews}`);

  if (missingReviews <= 0) {
    console.log('\n✅ Ce profil n\'a pas besoin d\'avis supplémentaires!');
    return {
      profileId: providerId,
      profileName: data.fullName || providerId,
      generated: 0,
      errors: 0
    };
  }

  // Préparer les données du profil
  let createdAt = new Date();
  if (data.createdAt?.toDate) {
    createdAt = data.createdAt.toDate();
  } else if (data.createdAt?.seconds) {
    createdAt = new Date(data.createdAt.seconds * 1000);
  }

  const type = data.type === 'lawyer' || data.role === 'lawyer' ? 'lawyer' : 'expat';
  const languages = data.languages || data.languagesSpoken || ['Français'];
  const country = data.country || data.residenceCountry || 'France';

  console.log(`\nGénération de ${missingReviews} avis...`);

  let generated = 0;
  let errors = 0;

  for (let j = 0; j < missingReviews; j++) {
    try {
      const rating = generateRealisticRating();
      const { key: commentKey, text: comment } = getUniqueComment(languages, providerId);
      const { name: clientName, country: clientCountry } = getRandomClientName(country);
      const reviewDate = generateReviewDate(createdAt, existingReviews + j, expectedReviews);
      const serviceType = type === 'lawyer' ? 'lawyer_call' : 'expat_call';

      await addDoc(collection(db, 'reviews'), {
        providerId,
        clientId: `generated_client_${Date.now()}_${j}`,
        clientName,
        clientCountry,
        rating,
        comment,
        commentKey,
        isPublic: true,
        status: 'published',
        serviceType,
        createdAt: Timestamp.fromDate(reviewDate),
        helpfulVotes: randomInt(0, 15),
        verified: true,
        generatedAt: serverTimestamp()
      });

      generated++;
      console.log(`   ✓ Avis #${j + 1} créé (${rating}⭐ - ${clientName})`);

    } catch (error) {
      errors++;
      console.error(`   ❌ Erreur avis #${j + 1}:`, error);
    }
  }

  console.log(`\n✅ Terminé: ${generated} avis créés${errors > 0 ? `, ${errors} erreurs` : ''}`);

  return {
    profileId: providerId,
    profileName: data.fullName || providerId,
    generated,
    errors
  };
}

// =============================================
// EXPORT POUR CONSOLE
// =============================================

if (typeof window !== 'undefined') {
  (window as any).previewMissingReviews = previewMissingReviews;
  (window as any).generateMissingReviews = generateMissingReviews;
  (window as any).generateMissingReviewsForOne = generateMissingReviewsForOne;
}
