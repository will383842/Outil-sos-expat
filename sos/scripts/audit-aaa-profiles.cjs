/**
 * Audit AAA Profiles - Vérifie la cohérence entre users et sos_profiles
 *
 * Usage:
 *   node scripts/audit-aaa-profiles.cjs              # Audit seul (dry-run)
 *   node scripts/audit-aaa-profiles.cjs --fix        # Audit + création des users manquants
 */

const admin = require('firebase-admin');
const path = require('path');

// Auth via Firebase CLI credentials
const credPath = path.join(
  process.env.APPDATA || process.env.HOME,
  'firebase',
  'williamsjullin_gmail_com_application_default_credentials.json'
);
process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;

admin.initializeApp({ projectId: 'sos-urgently-ac307' });
const db = admin.firestore();

const FIX_MODE = process.argv.includes('--fix');

async function auditAaaProfiles() {
  console.log('=== AUDIT COMPLET DES PROFILS AAA ===');
  console.log(`Mode: ${FIX_MODE ? '🔧 FIX (va créer les documents manquants)' : '🔍 AUDIT SEUL (dry-run)'}\n`);

  // ── 1. Récupérer TOUS les sos_profiles AAA ──
  console.log('1. Chargement des sos_profiles AAA...');

  // Query 1: uid starts with aaa_
  const q1 = await db.collection('sos_profiles')
    .where('uid', '>=', 'aaa_')
    .where('uid', '<', 'aab')
    .get();

  // Query 2: isAAA === true (certains profils ont le flag mais pas le prefix)
  const q2 = await db.collection('sos_profiles')
    .where('isAAA', '==', true)
    .get();

  // Dédupliquer
  const sosProfilesMap = new Map();
  q1.docs.forEach(doc => sosProfilesMap.set(doc.id, doc.data()));
  q2.docs.forEach(doc => sosProfilesMap.set(doc.id, doc.data()));

  console.log(`   Trouvés: ${sosProfilesMap.size} profils AAA dans sos_profiles\n`);

  // ── 2. Récupérer TOUS les users AAA ──
  console.log('2. Chargement des users AAA...');

  const u1 = await db.collection('users')
    .where('uid', '>=', 'aaa_')
    .where('uid', '<', 'aab')
    .get();

  const u2 = await db.collection('users')
    .where('isAAA', '==', true)
    .get();

  const usersMap = new Map();
  u1.docs.forEach(doc => usersMap.set(doc.id, doc.data()));
  u2.docs.forEach(doc => usersMap.set(doc.id, doc.data()));

  console.log(`   Trouvés: ${usersMap.size} profils AAA dans users\n`);

  // ── 3. Vérifier la cohérence ──
  console.log('3. Vérification de cohérence...\n');

  const issues = {
    missingUsers: [],       // sos_profiles sans users
    missingProfiles: [],    // users sans sos_profiles
    statusMismatch: [],     // Différences de statut
    missingFields: [],      // Champs critiques manquants
  };

  // 3a. sos_profiles sans document users correspondant
  for (const [uid, profile] of sosProfilesMap) {
    const userDoc = usersMap.get(uid);

    if (!userDoc) {
      issues.missingUsers.push({
        uid,
        email: profile.email || 'N/A',
        fullName: profile.fullName || profile.displayName || 'N/A',
        type: profile.type || 'N/A',
        country: profile.country || 'N/A',
        isOnline: profile.isOnline || false,
      });
      continue;
    }

    // 3b. Vérifier la cohérence des champs critiques
    if (profile.email && userDoc.email && profile.email !== userDoc.email) {
      issues.statusMismatch.push({
        uid,
        field: 'email',
        sosProfiles: profile.email,
        users: userDoc.email,
      });
    }

    if (profile.type && userDoc.role && profile.type !== userDoc.role) {
      issues.statusMismatch.push({
        uid,
        field: 'type/role',
        sosProfiles: profile.type,
        users: userDoc.role,
      });
    }

    // Vérifier les champs critiques dans users
    const criticalFields = ['email', 'role', 'firstName', 'lastName'];
    for (const field of criticalFields) {
      if (!userDoc[field]) {
        issues.missingFields.push({ uid, collection: 'users', field, email: userDoc.email || profile.email });
      }
    }

    // Vérifier les champs critiques dans sos_profiles
    const criticalSosFields = ['type', 'fullName', 'email'];
    for (const field of criticalSosFields) {
      if (!profile[field]) {
        issues.missingFields.push({ uid, collection: 'sos_profiles', field, email: profile.email || userDoc.email });
      }
    }
  }

  // 3c. users sans sos_profiles correspondant
  for (const [uid, user] of usersMap) {
    if (!sosProfilesMap.has(uid)) {
      issues.missingProfiles.push({
        uid,
        email: user.email || 'N/A',
        fullName: user.fullName || user.displayName || 'N/A',
        role: user.role || 'N/A',
      });
    }
  }

  // ── 4. Rapport ──
  console.log('════════════════════════════════════════');
  console.log('         RAPPORT D\'AUDIT AAA');
  console.log('════════════════════════════════════════\n');

  console.log(`Total sos_profiles AAA: ${sosProfilesMap.size}`);
  console.log(`Total users AAA:        ${usersMap.size}`);
  console.log('');

  // 4a. sos_profiles SANS users (CRITIQUE)
  if (issues.missingUsers.length > 0) {
    console.log(`❌ CRITIQUE: ${issues.missingUsers.length} sos_profiles SANS document users:`);
    console.log('   (Ces profils ne pourront PAS recevoir de paiements Stripe, ni changer de statut busy/available)\n');
    for (const p of issues.missingUsers) {
      console.log(`   🔴 ${p.uid}`);
      console.log(`      Nom: ${p.fullName} | Email: ${p.email}`);
      console.log(`      Type: ${p.type} | Pays: ${p.country} | En ligne: ${p.isOnline}`);
      console.log('');
    }
  } else {
    console.log('✅ Tous les sos_profiles AAA ont un document users correspondant');
  }

  // 4b. users SANS sos_profiles (WARNING)
  if (issues.missingProfiles.length > 0) {
    console.log(`⚠️  WARNING: ${issues.missingProfiles.length} users SANS document sos_profiles:`);
    console.log('   (Ces profils ne seront PAS visibles sur la carte/recherche)\n');
    for (const p of issues.missingProfiles) {
      console.log(`   🟡 ${p.uid}`);
      console.log(`      Nom: ${p.fullName} | Email: ${p.email} | Role: ${p.role}`);
    }
    console.log('');
  } else {
    console.log('✅ Tous les users AAA ont un document sos_profiles correspondant');
  }

  // 4c. Différences de statut
  if (issues.statusMismatch.length > 0) {
    console.log(`⚠️  ${issues.statusMismatch.length} incohérences de données entre collections:`);
    for (const m of issues.statusMismatch) {
      console.log(`   🟡 ${m.uid}: ${m.field} → sos_profiles="${m.sosProfiles}" vs users="${m.users}"`);
    }
    console.log('');
  }

  // 4d. Champs manquants
  if (issues.missingFields.length > 0) {
    console.log(`⚠️  ${issues.missingFields.length} champs critiques manquants:`);
    for (const f of issues.missingFields) {
      console.log(`   🟡 ${f.uid} (${f.email}): ${f.collection}.${f.field} manquant`);
    }
    console.log('');
  }

  // ── 5. Fix automatique si --fix ──
  if (FIX_MODE && issues.missingUsers.length > 0) {
    console.log('\n🔧 === CORRECTION AUTOMATIQUE ===\n');

    let fixed = 0;
    let errors = 0;

    for (const missing of issues.missingUsers) {
      const profile = sosProfilesMap.get(missing.uid);
      if (!profile) continue;

      // Construire le document users à partir du sos_profiles
      const userDoc = {
        uid: missing.uid,
        email: profile.email || '',
        emailLower: (profile.email || '').toLowerCase(),
        firstName: profile.firstName || profile.fullName?.split(' ')[0] || '',
        lastName: profile.lastName || profile.fullName?.split(' ').slice(1).join(' ') || '',
        fullName: profile.fullName || profile.displayName || '',
        displayName: profile.displayName || profile.fullName || '',
        phone: profile.phone || '',
        phoneCountryCode: profile.phoneCountryCode || '',
        role: profile.type || 'lawyer',
        type: profile.type || 'lawyer',
        country: profile.country || '',
        currentCountry: profile.currentCountry || profile.country || '',
        countryName: profile.countryName || '',
        languages: profile.languages || [],
        languagesSpoken: profile.languagesSpoken || profile.languages || [],
        preferredLanguage: profile.preferredLanguage || 'fr',
        profilePhoto: profile.profilePhoto || profile.photoURL || '',
        photoURL: profile.photoURL || profile.profilePhoto || '',
        bio: profile.bio || '',
        gender: profile.gender || '',
        rating: profile.rating || 5.0,
        averageRating: profile.averageRating || profile.rating || 5.0,
        reviewCount: profile.reviewCount || 0,
        totalCalls: profile.totalCalls || 0,
        isActive: profile.isActive !== false,
        isApproved: profile.isApproved !== false,
        isVerified: profile.isVerified !== false,
        isOnline: profile.isOnline || false,
        isVisible: profile.isVisible || false,
        isVisibleOnMap: profile.isVisibleOnMap || false,
        isCallable: profile.isCallable || false,
        isSOS: profile.isSOS !== false,
        availability: profile.availability || 'offline',
        approvalStatus: profile.approvalStatus || 'approved',
        // AAA specific
        isAAA: true,
        isTestProfile: true,
        createdByAdmin: true,
        kycDelegated: true,
        kycStatus: 'not_required',
        forcedAIAccess: true,
        hasActiveSubscription: true,
        subscriptionStatus: 'active',
        aaaPayoutMode: profile.aaaPayoutMode || 'internal',
        // Timestamps
        createdAt: profile.createdAt || admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        // Lawyer specific
        ...(profile.type === 'lawyer' ? {
          specialties: profile.specialties || [],
          practiceCountries: profile.practiceCountries || [],
          yearsOfExperience: profile.yearsOfExperience || 0,
          barNumber: profile.barNumber || '',
        } : {}),
        // Expat specific
        ...(profile.type === 'expat' ? {
          helpTypes: profile.helpTypes || [],
          residenceCountry: profile.residenceCountry || profile.country || '',
          yearsAsExpat: profile.yearsAsExpat || 0,
        } : {}),
        // Stripe/PayPal
        ...(profile.stripeAccountId ? { stripeAccountId: profile.stripeAccountId } : {}),
        ...(profile.paypalMerchantId ? { paypalMerchantId: profile.paypalMerchantId } : {}),
      };

      try {
        await db.collection('users').doc(missing.uid).set(userDoc);
        console.log(`   ✅ Créé users/${missing.uid} (${missing.fullName})`);
        fixed++;
      } catch (err) {
        console.error(`   ❌ Erreur pour ${missing.uid}: ${err.message}`);
        errors++;
      }
    }

    console.log(`\n🔧 Résultat: ${fixed} créés, ${errors} erreurs`);
  }

  // ── Résumé final ──
  const totalIssues = issues.missingUsers.length + issues.missingProfiles.length +
                      issues.statusMismatch.length + issues.missingFields.length;

  if (totalIssues === 0) {
    console.log('\n✅ ✅ ✅ TOUS LES PROFILS AAA SONT PARFAITS ! ✅ ✅ ✅');
  } else {
    console.log(`\n📊 Total: ${totalIssues} problèmes détectés`);
    if (!FIX_MODE && issues.missingUsers.length > 0) {
      console.log(`\n💡 Pour corriger automatiquement, relancez avec: node scripts/audit-aaa-profiles.cjs --fix`);
    }
  }

  process.exit(0);
}

auditAaaProfiles().catch(err => {
  console.error('Erreur fatale:', err);
  process.exit(1);
});
