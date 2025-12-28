// ===================================================================
// SCRIPT DE MIGRATION FIRESTORE
// À exécuter UNE SEULE FOIS pour mettre à jour les prestataires existants
// ===================================================================

import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

async function migrateExistingProviders() {
  console.log('Starting migration...');

  try {
    // 1. Mettre à jour sos_profiles
    const profilesSnapshot = await db
      .collection('sos_profiles')
      .where('type', 'in', ['lawyer', 'expat'])
      .get();

    console.log(`Found ${profilesSnapshot.size} profiles to update`);

    const batch = db.batch();
    let count = 0;

    for (const doc of profilesSnapshot.docs) {
      const data = doc.data();
      
      // Ajouter les nouveaux champs si non existants
      const updates: any = {};
      
      if (data.isOnline === undefined) {
        updates.isOnline = false; // HORS LIGNE PAR DÉFAUT
      }
      
      if (data.availability === undefined) {
        updates.availability = 'offline';
      }
      
      if (data.autoOfflineEnabled === undefined) {
        updates.autoOfflineEnabled = true;
      }
      
      if (data.inactivityTimeoutMinutes === undefined) {
        updates.inactivityTimeoutMinutes = 60;
      }
      
      if (data.lastActivity === undefined) {
        updates.lastActivity = admin.firestore.Timestamp.now();
      }
      
      if (data.lastActivityCheck === undefined) {
        updates.lastActivityCheck = admin.firestore.Timestamp.now();
      }
      
      if (data.lastStatusChange === undefined) {
        updates.lastStatusChange = admin.firestore.Timestamp.now();
      }

      if (Object.keys(updates).length > 0) {
        batch.update(doc.ref, updates);
        count++;
      }

      // Firestore batch limit = 500
      if (count === 500) {
        await batch.commit();
        console.log(`Committed batch of ${count} updates`);
        count = 0;
      }
    }

    if (count > 0) {
      await batch.commit();
      console.log(`Committed final batch of ${count} updates`);
    }

    // 2. Mettre à jour users
    const usersSnapshot = await db
      .collection('users')
      .where('type', 'in', ['lawyer', 'expat'])
      .get();

    console.log(`Found ${usersSnapshot.size} users to update`);

    const userBatch = db.batch();
    let userCount = 0;

    for (const doc of usersSnapshot.docs) {
      const data = doc.data();
      
      const updates: any = {};
      
      if (data.isOnline === undefined) {
        updates.isOnline = false;
      }
      
      if (data.availability === undefined) {
        updates.availability = 'offline';
      }
      
      if (data.autoOfflineEnabled === undefined) {
        updates.autoOfflineEnabled = true;
      }
      
      if (data.inactivityTimeoutMinutes === undefined) {
        updates.inactivityTimeoutMinutes = 60;
      }
      
      if (data.lastActivity === undefined) {
        updates.lastActivity = admin.firestore.Timestamp.now();
      }
      
      if (data.lastActivityCheck === undefined) {
        updates.lastActivityCheck = admin.firestore.Timestamp.now();
      }
      
      if (data.lastStatusChange === undefined) {
        updates.lastStatusChange = admin.firestore.Timestamp.now();
      }

      if (Object.keys(updates).length > 0) {
        userBatch.update(doc.ref, updates);
        userCount++;
      }

      if (userCount === 500) {
        await userBatch.commit();
        console.log(`Committed user batch of ${userCount} updates`);
        userCount = 0;
      }
    }

    if (userCount > 0) {
      await userBatch.commit();
      console.log(`Committed final user batch of ${userCount} updates`);
    }

    console.log('✅ Migration completed successfully!');
    console.log(`Total profiles updated: ${profilesSnapshot.size}`);
    console.log(`Total users updated: ${usersSnapshot.size}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Exécuter la migration
migrateExistingProviders()
  .then(() => {
    console.log('Migration finished');
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration error:', error);
    process.exit(1);
  });

// ===================================================================
// POUR EXÉCUTER CE SCRIPT :
// ===================================================================
// 1. Sauvegarder ce fichier comme : migrate-providers.ts
// 2. Compiler : npx tsc migrate-providers.ts
// 3. Exécuter : node migrate-providers.js
// ===================================================================
