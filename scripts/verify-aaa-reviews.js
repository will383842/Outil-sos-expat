/**
 * Script de vérification APPROFONDIE des avis AAA
 * Vérifie:
 * 1. reviewCount cohérent entre sos_profiles, users, ui_profile_cards
 * 2. reviewCount = nombre réel de reviews dans la collection reviews
 * 3. Aucun doublon de commentaire au sein d'un même profil
 * 4. Toutes les dates d'avis sont APRÈS la date d'inscription
 * 5. Tous les profils ont un nombre d'avis DIFFÉRENT
 * 6. Ratings valides (entre 1 et 5)
 * 7. Aucun champ manquant dans les reviews
 */

const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.join(__dirname, '..', 'serviceAccount.json'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'sos-urgently-ac307'
});
const db = admin.firestore();

async function verify() {
  console.log('='.repeat(70));
  console.log(' VÉRIFICATION APPROFONDIE DES AVIS AAA');
  console.log('='.repeat(70));

  let errors = 0;
  let warnings = 0;

  // 1. Charger tous les profils AAA
  const profilesSnap = await db.collection('sos_profiles').where('isAAA', '==', true).get();
  let docs = profilesSnap.docs;
  if (docs.length === 0) {
    const fallback = await db.collection('sos_profiles').where('isTestProfile', '==', true).get();
    docs = fallback.docs;
  }
  console.log(`\n📋 ${docs.length} profils AAA trouvés\n`);

  const allReviewCounts = [];
  const allCommentsGlobal = new Map(); // comment -> [profileNames]
  let totalReviewsInDb = 0;

  for (const profileDoc of docs) {
    const profile = profileDoc.data();
    const uid = profileDoc.id;
    const fullName = profile.fullName || `${profile.firstName} ${profile.lastName}`;
    const profileErrors = [];
    const profileWarnings = [];

    // === CHECK 1: reviewCount dans sos_profiles ===
    const sosReviewCount = profile.reviewCount;
    if (sosReviewCount === undefined || sosReviewCount === null) {
      profileErrors.push(`sos_profiles.reviewCount MANQUANT`);
    }

    // === CHECK 2: reviewCount dans users ===
    let usersReviewCount = null;
    try {
      const userDoc = await db.collection('users').doc(uid).get();
      if (userDoc.exists) {
        usersReviewCount = userDoc.data().reviewCount;
        if (usersReviewCount !== sosReviewCount) {
          profileErrors.push(`DÉSYNC users.reviewCount=${usersReviewCount} vs sos_profiles.reviewCount=${sosReviewCount}`);
        }
      } else {
        profileWarnings.push(`Document users/${uid} n'existe pas`);
      }
    } catch (e) {
      profileWarnings.push(`Erreur lecture users/${uid}: ${e.message}`);
    }

    // === CHECK 3: reviewCount dans ui_profile_cards ===
    let cardReviewCount = null;
    try {
      const cardDoc = await db.collection('ui_profile_cards').doc(uid).get();
      if (cardDoc.exists) {
        cardReviewCount = cardDoc.data().reviewCount;
        if (cardReviewCount !== sosReviewCount) {
          profileErrors.push(`DÉSYNC ui_profile_cards.reviewCount=${cardReviewCount} vs sos_profiles.reviewCount=${sosReviewCount}`);
        }
      } else {
        profileWarnings.push(`Document ui_profile_cards/${uid} n'existe pas`);
      }
    } catch (e) {
      profileWarnings.push(`Erreur lecture ui_profile_cards/${uid}: ${e.message}`);
    }

    // === CHECK 4: Nombre RÉEL de reviews dans la collection ===
    const reviewsSnap = await db.collection('reviews').where('providerId', '==', uid).get();
    const actualCount = reviewsSnap.size;
    totalReviewsInDb += actualCount;

    if (actualCount !== sosReviewCount) {
      profileErrors.push(`MISMATCH reviews réels=${actualCount} vs sos_profiles.reviewCount=${sosReviewCount}`);
    }

    // === CHECK 5: Pas de commentaires en doublon intra-profil ===
    const commentsInProfile = [];
    const duplicatesInProfile = [];
    const reviewDates = [];

    for (const reviewDoc of reviewsSnap.docs) {
      const review = reviewDoc.data();

      // Collecter commentaire
      if (commentsInProfile.includes(review.comment)) {
        duplicatesInProfile.push(review.comment.substring(0, 50));
      }
      commentsInProfile.push(review.comment);

      // Tracking global des commentaires
      if (!allCommentsGlobal.has(review.comment)) {
        allCommentsGlobal.set(review.comment, []);
      }
      allCommentsGlobal.get(review.comment).push(fullName);

      // === CHECK 6: Champs requis ===
      const requiredFields = ['providerId', 'clientId', 'clientName', 'clientCountry', 'rating', 'comment', 'isPublic', 'status', 'serviceType', 'createdAt'];
      for (const field of requiredFields) {
        if (review[field] === undefined || review[field] === null) {
          profileErrors.push(`Review ${reviewDoc.id}: champ "${field}" MANQUANT`);
        }
      }

      // === CHECK 7: Rating valide ===
      if (review.rating < 1 || review.rating > 5) {
        profileErrors.push(`Review ${reviewDoc.id}: rating invalide = ${review.rating}`);
      }

      // === CHECK 8: Date d'avis APRÈS inscription ===
      let reviewDate = null;
      if (review.createdAt && review.createdAt.toDate) {
        reviewDate = review.createdAt.toDate();
      }
      if (reviewDate) {
        reviewDates.push(reviewDate);
      }
    }

    if (duplicatesInProfile.length > 0) {
      profileErrors.push(`${duplicatesInProfile.length} DOUBLON(S) de commentaire: "${duplicatesInProfile[0]}..."`);
    }

    // Vérifier dates après inscription
    let createdAt = null;
    if (profile.createdAt && profile.createdAt.toDate) {
      createdAt = profile.createdAt.toDate();
    }
    if (createdAt && reviewDates.length > 0) {
      const reviewsBeforeRegistration = reviewDates.filter(d => d < createdAt);
      if (reviewsBeforeRegistration.length > 0) {
        profileErrors.push(`${reviewsBeforeRegistration.length} avis AVANT la date d'inscription (${createdAt.toISOString().split('T')[0]})`);
        // Montrer la plus ancienne
        const earliest = new Date(Math.min(...reviewsBeforeRegistration.map(d => d.getTime())));
        profileErrors.push(`   Plus ancien avis: ${earliest.toISOString().split('T')[0]}`);
      }
    }

    // === CHECK 9: Rating du profil valide ===
    if (profile.rating < 1 || profile.rating > 5) {
      profileErrors.push(`Rating profil invalide: ${profile.rating}`);
    }

    // Stocker pour check unicité
    allReviewCounts.push({ name: fullName, count: sosReviewCount });

    // Afficher résultat par profil
    if (profileErrors.length > 0) {
      console.log(`❌ ${fullName} (${uid.substring(0, 15)}...) — ${actualCount} avis`);
      profileErrors.forEach(e => { console.log(`   ❌ ${e}`); errors++; });
      profileWarnings.forEach(w => { console.log(`   ⚠️  ${w}`); warnings++; });
    } else if (profileWarnings.length > 0) {
      console.log(`⚠️  ${fullName} — ${actualCount} avis — OK mais warnings`);
      profileWarnings.forEach(w => { console.log(`   ⚠️  ${w}`); warnings++; });
    } else {
      console.log(`✅ ${fullName} — ${actualCount} avis — rating: ${profile.rating} — OK`);
    }

    await new Promise(r => setTimeout(r, 30));
  }

  // === CHECK 10: Tous les reviewCounts sont-ils DIFFÉRENTS ? ===
  console.log('\n' + '─'.repeat(70));
  console.log(' CHECK UNICITÉ DES NOMBRES D\'AVIS');
  console.log('─'.repeat(70));

  const countMap = new Map();
  for (const { name, count } of allReviewCounts) {
    if (!countMap.has(count)) countMap.set(count, []);
    countMap.get(count).push(name);
  }

  const duplicateCounts = [...countMap.entries()].filter(([, names]) => names.length > 1);
  if (duplicateCounts.length === 0) {
    console.log('✅ Tous les profils ont un nombre d\'avis UNIQUE');
  } else {
    console.log(`⚠️  ${duplicateCounts.length} nombre(s) d'avis partagé(s):`);
    for (const [count, names] of duplicateCounts) {
      console.log(`   ${count} avis → ${names.join(', ')}`);
      warnings++;
    }
  }

  // Distribution des counts
  const counts = allReviewCounts.map(x => x.count).sort((a, b) => a - b);
  console.log(`\n📊 Distribution: min=${counts[0]}, max=${counts[counts.length - 1]}, médiane=${counts[Math.floor(counts.length / 2)]}`);
  console.log(`   Valeurs: ${counts.join(', ')}`);

  // === CHECK 11: Doublons de commentaires inter-profils ===
  console.log('\n' + '─'.repeat(70));
  console.log(' CHECK DOUBLONS COMMENTAIRES INTER-PROFILS');
  console.log('─'.repeat(70));

  const globalDuplicates = [...allCommentsGlobal.entries()].filter(([, profiles]) => profiles.length > 1);
  const uniqueComments = allCommentsGlobal.size;
  console.log(`   Commentaires uniques utilisés: ${uniqueComments}`);
  console.log(`   Total avis en base: ${totalReviewsInDb}`);

  if (globalDuplicates.length > 0) {
    // C'est attendu car 120 commentaires < 1159 avis, donc recyclage
    const maxReuse = Math.max(...globalDuplicates.map(([, p]) => p.length));
    console.log(`   Commentaires réutilisés entre profils: ${globalDuplicates.length} (max ${maxReuse}x)`);
    console.log(`   ℹ️  C'est normal car 120 commentaires < ${totalReviewsInDb} avis`);
  } else {
    console.log('✅ Aucun commentaire réutilisé entre profils');
  }

  // Vérifier doublons INTRA-profil (le plus important)
  let intraProfileDuplicates = 0;
  for (const profileDoc of docs) {
    const uid = profileDoc.id;
    const reviewsSnap = await db.collection('reviews').where('providerId', '==', uid).get();
    const comments = reviewsSnap.docs.map(d => d.data().comment);
    const uniqueInProfile = new Set(comments);
    if (uniqueInProfile.size < comments.length) {
      intraProfileDuplicates++;
      const fullName = profileDoc.data().fullName;
      console.log(`   ❌ DOUBLON INTRA-PROFIL: ${fullName} — ${comments.length} avis mais ${uniqueInProfile.size} uniques`);
      errors++;
    }
  }
  if (intraProfileDuplicates === 0) {
    console.log('✅ Aucun doublon de commentaire AU SEIN d\'un même profil');
  }

  // === RÉSUMÉ FINAL ===
  console.log('\n' + '='.repeat(70));
  console.log(' RÉSUMÉ FINAL');
  console.log('='.repeat(70));
  console.log(`   Profils vérifiés: ${docs.length}`);
  console.log(`   Avis en base: ${totalReviewsInDb}`);
  console.log(`   Erreurs: ${errors}`);
  console.log(`   Warnings: ${warnings}`);

  if (errors === 0) {
    console.log('\n🎉 TOUT EST PARFAIT — aucune erreur détectée !');
  } else {
    console.log(`\n⚠️  ${errors} ERREUR(S) DÉTECTÉE(S) — à corriger !`);
  }
  console.log('='.repeat(70));

  process.exit(errors > 0 ? 1 : 0);
}

verify().catch(err => {
  console.error('❌ Erreur fatale:', err);
  process.exit(1);
});
