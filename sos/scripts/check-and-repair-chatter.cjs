/**
 * Script to check and repair a chatter account
 * Usage: node scripts/check-and-repair-chatter.cjs <email>
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', 'firebase', 'service-account.json');

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} catch (error) {
  console.error('❌ Could not load service account. Make sure firebase/service-account.json exists.');
  console.error('   Download it from Firebase Console > Project Settings > Service Accounts');
  process.exit(1);
}

const db = admin.firestore();
const auth = admin.auth();

async function checkAndRepairAccount(email) {
  console.log(`\n🔍 Checking account: ${email}\n`);

  // 1. Find user in Firebase Auth
  let authUser;
  try {
    authUser = await auth.getUserByEmail(email);
    console.log('✅ Firebase Auth user found:');
    console.log(`   UID: ${authUser.uid}`);
    console.log(`   Email: ${authUser.email}`);
    console.log(`   Email Verified: ${authUser.emailVerified}`);
    console.log(`   Created: ${authUser.metadata.creationTime}`);
  } catch (error) {
    console.error('❌ User not found in Firebase Auth:', error.message);
    return;
  }

  const uid = authUser.uid;

  // 2. Check users collection
  const userDoc = await db.collection('users').doc(uid).get();
  if (userDoc.exists) {
    const userData = userDoc.data();
    console.log('\n✅ users/{uid} document EXISTS:');
    console.log(`   Role: ${userData.role}`);
    console.log(`   telegramOnboardingCompleted: ${userData.telegramOnboardingCompleted}`);
    console.log(`   hasTelegram: ${userData.hasTelegram}`);
    console.log(`   chatterStatus: ${userData.chatterStatus}`);
  } else {
    console.log('\n❌ users/{uid} document DOES NOT EXIST');
  }

  // 3. Check chatters collection
  const chatterDoc = await db.collection('chatters').doc(uid).get();
  if (chatterDoc.exists) {
    const chatterData = chatterDoc.data();
    console.log('\n✅ chatters/{uid} document EXISTS:');
    console.log(`   Status: ${chatterData.status}`);
    console.log(`   Email: ${chatterData.email}`);
    console.log(`   Name: ${chatterData.firstName} ${chatterData.lastName}`);
    console.log(`   Country: ${chatterData.country}`);
    console.log(`   telegramOnboardingCompleted: ${chatterData.telegramOnboardingCompleted}`);
    console.log(`   hasTelegram: ${chatterData.hasTelegram}`);
  } else {
    console.log('\n❌ chatters/{uid} document DOES NOT EXIST');
  }

  // 4. Determine what needs to be repaired
  console.log('\n' + '='.repeat(50));

  if (!userDoc.exists && chatterDoc.exists) {
    console.log('🔧 DIAGNOSIS: Orphaned chatter account (users doc missing)');
    console.log('   Will create users document from chatters data');

    const chatterData = chatterDoc.data();
    const now = admin.firestore.Timestamp.now();

    // Create users document
    await db.collection('users').doc(uid).set({
      uid: uid,
      email: chatterData.email || email,
      emailLower: (chatterData.email || email).toLowerCase(),
      firstName: chatterData.firstName || '',
      lastName: chatterData.lastName || '',
      fullName: `${chatterData.firstName || ''} ${chatterData.lastName || ''}`.trim(),
      displayName: `${chatterData.firstName || ''} ${chatterData.lastName || ''}`.trim(),
      role: 'chatter',
      isChatter: true,
      chatterStatus: chatterData.status || 'pending_quiz',
      profilePhoto: chatterData.photoUrl || '/default-avatar.png',
      photoURL: chatterData.photoUrl || '/default-avatar.png',
      avatar: chatterData.photoUrl || '/default-avatar.png',
      isVerified: authUser.emailVerified,
      isVerifiedEmail: authUser.emailVerified,
      isActive: true,
      isApproved: false,
      approvalStatus: 'pending',
      isVisible: false,
      // IMPORTANT: Telegram onboarding NOT completed
      hasTelegram: false,
      telegramOnboardingCompleted: false,
      createdAt: chatterData.createdAt || now,
      updatedAt: now,
      lastLoginAt: now,
      repairedAt: now,
      repairReason: 'manual_repair_script',
    });

    console.log('\n✅ REPAIRED: Created users document');
    console.log('   telegramOnboardingCompleted: false');
    console.log('   → User will be redirected to Telegram page on login');

  } else if (!userDoc.exists && !chatterDoc.exists) {
    console.log('🔧 DIAGNOSIS: Auth account exists but no Firestore documents');
    console.log('   This user needs to complete registration');
    console.log('   Options:');
    console.log('   1. Delete auth account and let them re-register');
    console.log('   2. Create both documents manually');

  } else if (userDoc.exists) {
    const userData = userDoc.data();

    if (userData.telegramOnboardingCompleted === true) {
      console.log('ℹ️  Account is complete. User should be able to access dashboard.');
    } else if (userData.telegramOnboardingCompleted === false) {
      console.log('ℹ️  Account exists but Telegram not completed.');
      console.log('   → User will be redirected to Telegram page on login');
    } else {
      console.log('🔧 DIAGNOSIS: telegramOnboardingCompleted field missing');
      console.log('   Will add it with value: false');

      await db.collection('users').doc(uid).update({
        hasTelegram: false,
        telegramOnboardingCompleted: false,
        updatedAt: admin.firestore.Timestamp.now(),
      });

      console.log('\n✅ UPDATED: Added telegramOnboardingCompleted: false');
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('Done!\n');
}

// Get email from command line
const email = process.argv[2];

if (!email) {
  console.log('Usage: node scripts/check-and-repair-chatter.cjs <email>');
  console.log('Example: node scripts/check-and-repair-chatter.cjs williamjullin111@hotmail.fr');
  process.exit(1);
}

checkAndRepairAccount(email)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
