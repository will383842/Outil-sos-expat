/**
 * Script de synchronisation des compteurs d'avis (reviewCount)
 * =============================================================
 *
 * Ce script recalcule le reviewCount de chaque profil en comptant
 * les vrais avis publiés dans la collection 'reviews'.
 *
 * Problème résolu: Le compteur affiché ("X avis") ne correspondait pas
 * au nombre d'avis réellement visibles car les filtres étaient incohérents.
 *
 * Usage depuis la console du navigateur (dans l'admin):
 *   import { syncAllReviewCounts, previewReviewCountSync } from './scripts/syncReviewCounts';
 *
 *   // D'abord prévisualiser les changements
 *   await previewReviewCountSync();
 *
 *   // Puis exécuter la synchronisation
 *   await syncAllReviewCounts();
 *
 *   // Pour synchroniser un seul profil
 *   await syncOneProfileReviewCount('providerId');
 */

import { collection, getDocs, doc, updateDoc, query, where, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';

// =============================================
// TYPES
// =============================================

interface SyncResult {
  providerId: string;
  providerName: string;
  oldCount: number;
  newCount: number;
  difference: number;
}

interface SyncSummary {
  total: number;
  updated: number;
  unchanged: number;
  errors: number;
  results: SyncResult[];
}

// =============================================
// FONCTIONS UTILITAIRES
// =============================================

/**
 * Compte les avis publiés pour un prestataire donné
 * Utilise les mêmes filtres que getProviderReviews et recalculateProviderStats
 */
async function countPublishedReviews(providerId: string): Promise<number> {
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
 * Calcule aussi la moyenne des notes pour mise à jour cohérente
 */
async function calculateReviewStats(providerId: string): Promise<{ count: number; rating: number }> {
  const reviewsCol = collection(db, 'reviews');
  const q = query(
    reviewsCol,
    where('providerId', '==', providerId),
    where('status', '==', 'published'),
    where('isPublic', '==', true)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return { count: 0, rating: 0 };
  }

  let totalRating = 0;
  let validRatings = 0;

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const rating = data.rating;
    if (typeof rating === 'number' && rating >= 1 && rating <= 5) {
      totalRating += rating;
      validRatings++;
    }
  });

  return {
    count: snapshot.size,
    rating: validRatings > 0 ? totalRating / validRatings : 0
  };
}

// =============================================
// PREVIEW (DRY RUN)
// =============================================

/**
 * Prévisualise les changements sans modifier la base de données
 */
export async function previewReviewCountSync(): Promise<SyncSummary> {
  console.log('========================================');
  console.log('PREVIEW: Synchronisation des reviewCount');
  console.log('========================================\n');

  const results: SyncResult[] = [];
  let updated = 0;
  let unchanged = 0;
  let errors = 0;

  // Récupérer tous les profils sos_profiles
  const profilesCol = collection(db, 'sos_profiles');
  const profilesSnapshot = await getDocs(profilesCol);

  console.log(`Total de profils trouvés: ${profilesSnapshot.size}\n`);

  for (const profileDoc of profilesSnapshot.docs) {
    try {
      const data = profileDoc.data();
      const providerId = profileDoc.id;
      const providerName = data.fullName || data.displayName || providerId;
      const oldCount = typeof data.reviewCount === 'number' ? data.reviewCount : 0;

      // Compter les vrais avis
      const newCount = await countPublishedReviews(providerId);
      const difference = newCount - oldCount;

      if (difference !== 0) {
        updated++;
        const emoji = difference > 0 ? '📈' : '📉';
        console.log(`${emoji} ${providerName}: ${oldCount} → ${newCount} (${difference > 0 ? '+' : ''}${difference})`);

        results.push({
          providerId,
          providerName,
          oldCount,
          newCount,
          difference
        });
      } else {
        unchanged++;
      }
    } catch (error) {
      errors++;
      console.error(`❌ Erreur pour ${profileDoc.id}:`, error);
    }
  }

  console.log('\n========================================');
  console.log('RÉSUMÉ PREVIEW');
  console.log('========================================');
  console.log(`Total profils: ${profilesSnapshot.size}`);
  console.log(`À mettre à jour: ${updated}`);
  console.log(`Déjà corrects: ${unchanged}`);
  console.log(`Erreurs: ${errors}`);
  console.log('========================================\n');

  if (updated > 0) {
    console.log('⚠️  Exécutez syncAllReviewCounts() pour appliquer les changements');
  } else {
    console.log('✅ Tous les compteurs sont déjà synchronisés!');
  }

  return {
    total: profilesSnapshot.size,
    updated,
    unchanged,
    errors,
    results
  };
}

// =============================================
// SYNCHRONISATION COMPLÈTE
// =============================================

/**
 * Synchronise tous les reviewCount de tous les profils
 */
export async function syncAllReviewCounts(): Promise<SyncSummary> {
  console.log('========================================');
  console.log('EXÉCUTION: Synchronisation des reviewCount');
  console.log('========================================\n');

  const results: SyncResult[] = [];
  let updated = 0;
  let unchanged = 0;
  let errors = 0;

  // Récupérer tous les profils
  const profilesCol = collection(db, 'sos_profiles');
  const profilesSnapshot = await getDocs(profilesCol);

  console.log(`Total de profils: ${profilesSnapshot.size}\n`);

  // Traiter par batches de 500 (limite Firestore)
  const batchSize = 500;
  let currentBatch = writeBatch(db);
  let batchCount = 0;
  let totalProcessed = 0;

  for (const profileDoc of profilesSnapshot.docs) {
    try {
      const data = profileDoc.data();
      const providerId = profileDoc.id;
      const providerName = data.fullName || data.displayName || providerId;
      const oldCount = typeof data.reviewCount === 'number' ? data.reviewCount : 0;

      // Calculer les nouvelles stats
      const stats = await calculateReviewStats(providerId);
      const newCount = stats.count;
      const newRating = stats.rating;
      const difference = newCount - oldCount;

      if (difference !== 0 || (newRating > 0 && data.rating !== newRating)) {
        // Mettre à jour sos_profiles
        const sosRef = doc(db, 'sos_profiles', providerId);
        currentBatch.update(sosRef, {
          reviewCount: newCount,
          ...(newRating > 0 ? { rating: newRating } : {})
        });

        // Mettre à jour users aussi
        const userRef = doc(db, 'users', providerId);
        currentBatch.update(userRef, {
          reviewCount: newCount,
          ...(newRating > 0 ? { rating: newRating } : {})
        });

        batchCount += 2; // 2 updates par profil
        updated++;

        const emoji = difference > 0 ? '📈' : (difference < 0 ? '📉' : '🔄');
        console.log(`${emoji} ${providerName}: ${oldCount} → ${newCount}`);

        results.push({
          providerId,
          providerName,
          oldCount,
          newCount,
          difference
        });

        // Commit le batch si on atteint la limite
        if (batchCount >= batchSize - 10) {
          await currentBatch.commit();
          console.log(`\n💾 Batch committé (${batchCount} opérations)\n`);
          currentBatch = writeBatch(db);
          batchCount = 0;
        }
      } else {
        unchanged++;
      }

      totalProcessed++;

      // Log de progression tous les 50 profils
      if (totalProcessed % 50 === 0) {
        console.log(`📊 Progression: ${totalProcessed}/${profilesSnapshot.size}`);
      }

    } catch (error) {
      errors++;
      console.error(`❌ Erreur pour ${profileDoc.id}:`, error);
    }
  }

  // Commit le dernier batch
  if (batchCount > 0) {
    await currentBatch.commit();
    console.log(`\n💾 Dernier batch committé (${batchCount} opérations)\n`);
  }

  console.log('\n========================================');
  console.log('RÉSUMÉ SYNCHRONISATION');
  console.log('========================================');
  console.log(`Total profils traités: ${profilesSnapshot.size}`);
  console.log(`Mis à jour: ${updated}`);
  console.log(`Déjà corrects: ${unchanged}`);
  console.log(`Erreurs: ${errors}`);
  console.log('========================================\n');

  console.log('✅ Synchronisation terminée!');

  return {
    total: profilesSnapshot.size,
    updated,
    unchanged,
    errors,
    results
  };
}

// =============================================
// SYNCHRONISATION D'UN SEUL PROFIL
// =============================================

/**
 * Synchronise le reviewCount d'un seul profil
 */
export async function syncOneProfileReviewCount(providerId: string): Promise<SyncResult | null> {
  console.log(`\n🔄 Synchronisation du profil: ${providerId}\n`);

  try {
    // Récupérer le profil actuel
    const profilesCol = collection(db, 'sos_profiles');
    const profileDoc = await getDocs(query(profilesCol, where('__name__', '==', providerId)));

    if (profileDoc.empty) {
      console.error(`❌ Profil non trouvé: ${providerId}`);
      return null;
    }

    const data = profileDoc.docs[0].data();
    const providerName = data.fullName || data.displayName || providerId;
    const oldCount = typeof data.reviewCount === 'number' ? data.reviewCount : 0;

    // Calculer les nouvelles stats
    const stats = await calculateReviewStats(providerId);
    const newCount = stats.count;
    const newRating = stats.rating;
    const difference = newCount - oldCount;

    console.log(`Nom: ${providerName}`);
    console.log(`Ancien reviewCount: ${oldCount}`);
    console.log(`Nouveau reviewCount: ${newCount}`);
    console.log(`Différence: ${difference > 0 ? '+' : ''}${difference}`);

    if (difference !== 0 || (newRating > 0 && data.rating !== newRating)) {
      // Mettre à jour sos_profiles
      const sosRef = doc(db, 'sos_profiles', providerId);
      await updateDoc(sosRef, {
        reviewCount: newCount,
        ...(newRating > 0 ? { rating: newRating } : {})
      });

      // Mettre à jour users
      const userRef = doc(db, 'users', providerId);
      await updateDoc(userRef, {
        reviewCount: newCount,
        ...(newRating > 0 ? { rating: newRating } : {})
      });

      console.log(`\n✅ Profil mis à jour!`);
    } else {
      console.log(`\n✅ Profil déjà synchronisé, aucune modification nécessaire.`);
    }

    return {
      providerId,
      providerName,
      oldCount,
      newCount,
      difference
    };

  } catch (error) {
    console.error(`❌ Erreur:`, error);
    return null;
  }
}

// =============================================
// MIGRATION: FIX REVIEWS SANS isPublic
// =============================================

/**
 * Migre tous les avis publiés pour ajouter isPublic: true
 * Résout le problème des anciens avis qui ne s'affichent pas
 */
export async function migrateReviewsAddIsPublic(): Promise<{ fixed: number; alreadyOk: number; errors: number }> {
  console.log('========================================');
  console.log('MIGRATION: Ajout isPublic aux reviews publiées');
  console.log('========================================\n');

  const reviewsCol = collection(db, 'reviews');

  // Récupérer tous les avis avec status="published"
  const q = query(reviewsCol, where('status', '==', 'published'));
  const snapshot = await getDocs(q);

  console.log(`Total d'avis publiés trouvés: ${snapshot.size}\n`);

  let fixed = 0;
  let alreadyOk = 0;
  let errors = 0;

  const batchSize = 500;
  let currentBatch = writeBatch(db);
  let batchCount = 0;

  for (const reviewDoc of snapshot.docs) {
    try {
      const data = reviewDoc.data();

      // Vérifier si isPublic est manquant ou false
      if (data.isPublic !== true) {
        const reviewRef = doc(db, 'reviews', reviewDoc.id);
        currentBatch.update(reviewRef, {
          isPublic: true,
          // Ajouter aussi publishedAt si manquant
          ...(data.publishedAt ? {} : { publishedAt: data.createdAt || new Date() })
        });
        batchCount++;
        fixed++;

        const providerInfo = data.providerId || data.providerUid || 'unknown';
        console.log(`✅ Fixed: ${reviewDoc.id} (provider: ${providerInfo})`);

        // Commit si on atteint la limite
        if (batchCount >= batchSize) {
          await currentBatch.commit();
          console.log(`\n💾 Batch committé (${batchCount} opérations)\n`);
          currentBatch = writeBatch(db);
          batchCount = 0;
        }
      } else {
        alreadyOk++;
      }
    } catch (error) {
      errors++;
      console.error(`❌ Erreur pour ${reviewDoc.id}:`, error);
    }
  }

  // Commit le dernier batch
  if (batchCount > 0) {
    await currentBatch.commit();
    console.log(`\n💾 Dernier batch committé (${batchCount} opérations)\n`);
  }

  console.log('\n========================================');
  console.log('RÉSUMÉ MIGRATION');
  console.log('========================================');
  console.log(`Total avis publiés: ${snapshot.size}`);
  console.log(`Corrigés (isPublic ajouté): ${fixed}`);
  console.log(`Déjà corrects: ${alreadyOk}`);
  console.log(`Erreurs: ${errors}`);
  console.log('========================================\n');

  if (fixed > 0) {
    console.log('⚠️  Exécutez maintenant syncAllReviewCounts() pour recalculer les stats des profils');
  }

  return { fixed, alreadyOk, errors };
}

/**
 * Prévisualise la migration sans modifier
 */
export async function previewMigrateReviews(): Promise<{ toFix: number; alreadyOk: number }> {
  console.log('========================================');
  console.log('PREVIEW: Migration isPublic');
  console.log('========================================\n');

  const reviewsCol = collection(db, 'reviews');
  const q = query(reviewsCol, where('status', '==', 'published'));
  const snapshot = await getDocs(q);

  let toFix = 0;
  let alreadyOk = 0;

  for (const reviewDoc of snapshot.docs) {
    const data = reviewDoc.data();
    if (data.isPublic !== true) {
      toFix++;
      const providerInfo = data.providerId || data.providerUid || 'unknown';
      console.log(`🔧 À corriger: ${reviewDoc.id} (provider: ${providerInfo})`);
    } else {
      alreadyOk++;
    }
  }

  console.log('\n========================================');
  console.log(`À corriger: ${toFix}`);
  console.log(`Déjà OK: ${alreadyOk}`);
  console.log('========================================\n');

  if (toFix > 0) {
    console.log('⚠️  Exécutez migrateReviewsAddIsPublic() pour appliquer les corrections');
  } else {
    console.log('✅ Tous les avis publiés ont déjà isPublic: true');
  }

  return { toFix, alreadyOk };
}

// =============================================
// EXPORT POUR UTILISATION DANS L'ADMIN
// =============================================

// Expose les fonctions globalement pour la console
if (typeof window !== 'undefined') {
  (window as any).previewReviewCountSync = previewReviewCountSync;
  (window as any).syncAllReviewCounts = syncAllReviewCounts;
  (window as any).syncOneProfileReviewCount = syncOneProfileReviewCount;
  (window as any).previewMigrateReviews = previewMigrateReviews;
  (window as any).migrateReviewsAddIsPublic = migrateReviewsAddIsPublic;
}
