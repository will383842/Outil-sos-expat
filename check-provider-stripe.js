const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'sos-urgently-ac307' });
const db = admin.firestore();

async function check() {
  // Get the specific session we know about
  const snapshot = await db.collection('call_sessions')
    .where('payment.intentId', '==', 'pi_3SqyWxDF7L3utQbN0EDLOV73')
    .get();

  if (snapshot.empty) {
    console.log('Session not found, trying to list recent payments...');
    const payments = await db.collection('payments')
      .orderBy('createdAt', 'desc')
      .limit(3)
      .get();

    payments.forEach(doc => {
      const d = doc.data();
      console.log('Payment:', doc.id);
      console.log('  Status:', d.status);
      console.log('  Provider:', d.providerId);
      console.log('  useDirectCharges:', d.useDirectCharges);
      console.log('  providerStripeAccountId:', d.providerStripeAccountId || 'N/A');
      console.log('');
    });
    process.exit(0);
  }

  const sessionDoc = snapshot.docs[0];
  const d = sessionDoc.data();
  console.log('Session:', sessionDoc.id);
  console.log('  Provider:', d.providerId);
  console.log('  Payment Status:', d.payment?.status);
  console.log('  billingDuration:', d.conference?.billingDuration, 's');

  // Get provider's Stripe account
  if (d.providerId) {
    const provider = await db.collection('users').doc(d.providerId).get();
    const providerData = provider.data();

    // Check both field names
    const stripeId = providerData?.stripeAccountId || providerData?.stripe_account_id || providerData?.stripeConnectAccountId;

    console.log('\n=== PROVIDER INFO ===');
    console.log('  stripeAccountId:', stripeId || 'NOT CONFIGURED');
    console.log('  kycStatus:', providerData?.kycStatus || 'unknown');
    console.log('  isAAA:', providerData?.isAAA);
    console.log('  kycDelegated:', providerData?.kycDelegated);

    // Also check sos_profiles for Stripe account
    const profile = await db.collection('sos_profiles').doc(d.providerId).get();
    if (profile.exists) {
      const profileData = profile.data();
      console.log('\n=== SOS_PROFILE ===');
      console.log('  stripeAccountId:', profileData?.stripeAccountId || 'N/A');
      console.log('  paymentMethod:', profileData?.paymentMethod || 'N/A');
    }
  }

  process.exit(0);
}
check().catch(e => { console.error(e); process.exit(1); });
