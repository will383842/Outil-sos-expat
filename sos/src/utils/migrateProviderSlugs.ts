/**
 * SCRIPT DE MIGRATION DES SLUGS PRESTATAIRES
 * ===========================================
 *
 * Ce script migre les slugs existants vers le nouveau format SEO optimise.
 *
 * NOUVEAU FORMAT: /{lang}/{role-pays}/{prenom-specialite-shortid}
 * Ex: /fr/avocat-thailande/julien-visa-k7m2p9
 *
 * AVANT: ~85 caracteres avec Firebase UID expose
 * APRES: ~45-60 caracteres avec shortId de 6 caracteres
 *
 * ACTIONS:
 * 1. Genere un shortId unique pour chaque provider (si non existant)
 * 2. Met a jour le document avec le nouveau shortId
 * 3. Genere les slugs multilingues traduits
 *
 * USAGE:
 * - Importer et executer depuis la console admin
 * - Ou executer via un script Cloud Function
 */

import { collection, getDocs, doc, updateDoc, query, where, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';
import { generateShortId, generateMultilingualSlugs } from './slugGenerator';

interface MigrationResult {
  total: number;
  migrated: number;
  skipped: number;
  errors: string[];
}

/**
 * Migre tous les providers vers le nouveau format de slug
 * @param dryRun Si true, ne fait que simuler sans modifier la DB
 * @param batchSize Nombre de documents par batch
 */
export async function migrateProviderSlugs(
  dryRun: boolean = true,
  batchSize: number = 50
): Promise<MigrationResult> {
  const result: MigrationResult = {
    total: 0,
    migrated: 0,
    skipped: 0,
    errors: [],
  };

  console.log(`\n🚀 MIGRATION DES SLUGS PRESTATAIRES`);
  console.log(`📋 Mode: ${dryRun ? 'DRY RUN (simulation)' : 'EXECUTION REELLE'}`);
  console.log(`📦 Batch size: ${batchSize}\n`);

  try {
    // Recuperer tous les providers actifs
    const providersQuery = query(
      collection(db, 'sos_profiles'),
      where('isActive', '==', true)
    );

    const snapshot = await getDocs(providersQuery);
    result.total = snapshot.size;

    console.log(`📊 Total providers a migrer: ${result.total}\n`);

    if (result.total === 0) {
      console.log('✅ Aucun provider a migrer');
      return result;
    }

    // Traiter par batches
    const docs = snapshot.docs;
    let currentBatch = writeBatch(db);
    let batchCount = 0;

    for (let i = 0; i < docs.length; i++) {
      const docSnap = docs[i];
      const data = docSnap.data();
      const providerId = docSnap.id;

      try {
        // Verifier si le provider a deja un shortId
        if (data.shortId && data.shortId.length === 6) {
          console.log(`⏭️  [${i + 1}/${result.total}] ${data.firstName || 'Unknown'} - ShortId existant: ${data.shortId}`);
          result.skipped++;
          continue;
        }

        // Generer le nouveau shortId
        const shortId = generateShortId(providerId);

        // Generer les slugs multilingues
        const role = data.type === 'lawyer' ? 'lawyer' : 'expat';
        const multilingualSlugs = generateMultilingualSlugs({
          firstName: data.firstName || 'profil',
          lastName: data.lastName || '',
          role: role,
          country: data.country || data.residenceCountry || '',
          languages: data.languages || [],
          specialties: role === 'lawyer' ? (data.specialties || []) : (data.helpTypes || []),
          uid: providerId,
        });

        console.log(`\n📝 [${i + 1}/${result.total}] ${data.firstName || 'Unknown'} ${data.lastName?.charAt(0) || ''}.`);
        console.log(`   📍 Pays: ${data.country || 'N/A'}`);
        console.log(`   👤 Type: ${role}`);
        console.log(`   🔑 UID: ${providerId}`);
        console.log(`   🆕 ShortId: ${shortId}`);
        console.log(`   🌐 Slugs:`);
        Object.entries(multilingualSlugs).forEach(([lang, slug]) => {
          console.log(`      ${lang}: ${slug} (${slug.length} chars)`);
        });

        if (!dryRun) {
          // Preparer la mise a jour
          const docRef = doc(db, 'sos_profiles', providerId);
          currentBatch.update(docRef, {
            shortId: shortId,
            slugs: multilingualSlugs,
            slugsUpdatedAt: new Date(),
          });
          batchCount++;

          // Executer le batch si plein
          if (batchCount >= batchSize) {
            console.log(`\n💾 Execution du batch (${batchCount} documents)...`);
            await currentBatch.commit();
            currentBatch = writeBatch(db);
            batchCount = 0;
          }
        }

        result.migrated++;
      } catch (err) {
        const errorMsg = `Erreur pour ${providerId}: ${err instanceof Error ? err.message : 'Unknown error'}`;
        console.error(`❌ ${errorMsg}`);
        result.errors.push(errorMsg);
      }
    }

    // Executer le dernier batch si necessaire
    if (!dryRun && batchCount > 0) {
      console.log(`\n💾 Execution du dernier batch (${batchCount} documents)...`);
      await currentBatch.commit();
    }

    // Resume
    console.log(`\n${'='.repeat(50)}`);
    console.log(`📊 RESUME DE LA MIGRATION`);
    console.log(`${'='.repeat(50)}`);
    console.log(`   Total: ${result.total}`);
    console.log(`   Migres: ${result.migrated}`);
    console.log(`   Ignores (deja migres): ${result.skipped}`);
    console.log(`   Erreurs: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.log(`\n⚠️  Erreurs rencontrees:`);
      result.errors.forEach((err, idx) => console.log(`   ${idx + 1}. ${err}`));
    }

    console.log(`\n✅ Migration ${dryRun ? '(simulation)' : ''} terminee!\n`);

  } catch (err) {
    const errorMsg = `Erreur globale: ${err instanceof Error ? err.message : 'Unknown error'}`;
    console.error(`\n❌ ${errorMsg}`);
    result.errors.push(errorMsg);
  }

  return result;
}

/**
 * Migre un seul provider par son ID
 * @param providerId ID du provider a migrer
 * @param dryRun Si true, ne fait que simuler
 */
export async function migrateOneProvider(
  providerId: string,
  dryRun: boolean = true
): Promise<{ success: boolean; shortId?: string; slugs?: Record<string, string>; error?: string }> {
  console.log(`\n🔧 Migration du provider: ${providerId}`);
  console.log(`📋 Mode: ${dryRun ? 'DRY RUN' : 'EXECUTION REELLE'}\n`);

  try {
    const docRef = doc(db, 'sos_profiles', providerId);
    const { getDoc } = await import('firebase/firestore');
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { success: false, error: 'Provider non trouve' };
    }

    const data = docSnap.data();

    // Generer le shortId
    const shortId = generateShortId(providerId);

    // Generer les slugs multilingues
    const role = data.type === 'lawyer' ? 'lawyer' : 'expat';
    const multilingualSlugs = generateMultilingualSlugs({
      firstName: data.firstName || 'profil',
      lastName: data.lastName || '',
      role: role,
      country: data.country || data.residenceCountry || '',
      languages: data.languages || [],
      specialties: role === 'lawyer' ? (data.specialties || []) : (data.helpTypes || []),
      uid: providerId,
    });

    console.log(`👤 ${data.firstName} ${data.lastName?.charAt(0) || ''}.`);
    console.log(`📍 Pays: ${data.country}`);
    console.log(`🔑 ShortId: ${shortId}`);
    console.log(`🌐 Slugs generes:`);
    Object.entries(multilingualSlugs).forEach(([lang, slug]) => {
      console.log(`   ${lang}: ${slug} (${slug.length} chars)`);
    });

    if (!dryRun) {
      await updateDoc(docRef, {
        shortId: shortId,
        slugs: multilingualSlugs,
        slugsUpdatedAt: new Date(),
      });
      console.log(`\n✅ Provider mis a jour!`);
    }

    return { success: true, shortId, slugs: multilingualSlugs };

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`❌ Erreur: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
}

/**
 * Verifie la coherence des slugs apres migration
 */
export async function verifySlugMigration(): Promise<{
  total: number;
  withShortId: number;
  withSlugs: number;
  issues: string[];
}> {
  console.log(`\n🔍 VERIFICATION DE LA MIGRATION\n`);

  const result = {
    total: 0,
    withShortId: 0,
    withSlugs: 0,
    issues: [] as string[],
  };

  try {
    const providersQuery = query(
      collection(db, 'sos_profiles'),
      where('isActive', '==', true)
    );

    const snapshot = await getDocs(providersQuery);
    result.total = snapshot.size;

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();

      if (data.shortId) {
        result.withShortId++;

        // Verifier que le shortId correspond au calcul
        const expectedShortId = generateShortId(docSnap.id);
        if (data.shortId !== expectedShortId) {
          result.issues.push(`${docSnap.id}: ShortId mismatch (${data.shortId} != ${expectedShortId})`);
        }
      }

      if (data.slugs && Object.keys(data.slugs).length > 0) {
        result.withSlugs++;
      }
    }

    console.log(`📊 Resultats:`);
    console.log(`   Total providers: ${result.total}`);
    console.log(`   Avec shortId: ${result.withShortId} (${Math.round(result.withShortId / result.total * 100)}%)`);
    console.log(`   Avec slugs: ${result.withSlugs} (${Math.round(result.withSlugs / result.total * 100)}%)`);

    if (result.issues.length > 0) {
      console.log(`\n⚠️  Problemes detectes: ${result.issues.length}`);
      result.issues.slice(0, 10).forEach(issue => console.log(`   - ${issue}`));
      if (result.issues.length > 10) {
        console.log(`   ... et ${result.issues.length - 10} autres`);
      }
    } else {
      console.log(`\n✅ Aucun probleme detecte!`);
    }

  } catch (err) {
    console.error(`❌ Erreur: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  return result;
}

// Export pour utilisation dans la console admin
export default {
  migrateProviderSlugs,
  migrateOneProvider,
  verifySlugMigration,
};
