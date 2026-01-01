/**
 * Script pour vérifier la configuration du compte Stripe plateforme
 * Exécuter avec: node scripts/check-stripe-platform.cjs
 *
 * Nécessite: STRIPE_SECRET_KEY_LIVE dans l'environnement
 */

require('dotenv').config({ path: './firebase/functions/.env .production' });

const Stripe = require('stripe');

async function checkPlatformAccount() {
  const secretKey = process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    console.error('❌ STRIPE_SECRET_KEY_LIVE non défini');
    console.log('\n📝 Pour exécuter ce script:');
    console.log('   STRIPE_SECRET_KEY_LIVE=sk_live_xxx node scripts/check-stripe-platform.cjs');
    return;
  }

  const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' });

  try {
    console.log('🔍 Récupération des informations du compte plateforme...\n');

    // Récupérer le compte plateforme
    const account = await stripe.accounts.retrieve();

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                 COMPTE STRIPE PLATEFORME SOS-EXPAT            ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log(`📋 Account ID:        ${account.id}`);
    console.log(`🏢 Business Name:     ${account.business_profile?.name || 'N/A'}`);
    console.log(`🌍 Country:           ${account.country}`);
    console.log(`💰 Default Currency:  ${(account.default_currency || 'N/A').toUpperCase()}`);
    console.log(`📧 Email:             ${account.email || 'N/A'}`);

    console.log('\n─── CAPACITÉS ───────────────────────────────────────────────────');
    console.log(`✅ Charges enabled:   ${account.charges_enabled}`);
    console.log(`✅ Payouts enabled:   ${account.payouts_enabled}`);
    console.log(`✅ Details submitted: ${account.details_submitted}`);

    // Récupérer les paramètres de paiement
    console.log('\n─── DEVISES SUPPORTÉES ──────────────────────────────────────────');

    // Vérifier les capacités
    const capabilities = account.capabilities || {};
    console.log(`💳 Card payments:     ${capabilities.card_payments || 'N/A'}`);
    console.log(`💸 Transfers:         ${capabilities.transfers || 'N/A'}`);

    // Récupérer les balances
    const balance = await stripe.balance.retrieve();

    console.log('\n─── BALANCES ACTUELLES ──────────────────────────────────────────');

    if (balance.available && balance.available.length > 0) {
      console.log('\n💰 Available balances:');
      balance.available.forEach(b => {
        console.log(`   ${b.currency.toUpperCase()}: ${(b.amount / 100).toFixed(2)} ${b.currency.toUpperCase()}`);
      });
    }

    if (balance.pending && balance.pending.length > 0) {
      console.log('\n⏳ Pending balances:');
      balance.pending.forEach(b => {
        console.log(`   ${b.currency.toUpperCase()}: ${(b.amount / 100).toFixed(2)} ${b.currency.toUpperCase()}`);
      });
    }

    // Récupérer les External Accounts (bank accounts)
    console.log('\n─── COMPTES BANCAIRES LIÉS ──────────────────────────────────────');

    const bankAccounts = await stripe.accounts.listExternalAccounts(account.id, {
      object: 'bank_account',
      limit: 10
    });

    if (bankAccounts.data.length === 0) {
      console.log('   Aucun compte bancaire trouvé');
    } else {
      bankAccounts.data.forEach((bank, i) => {
        console.log(`\n   🏦 Compte ${i + 1}:`);
        console.log(`      Bank: ${bank.bank_name || 'N/A'}`);
        console.log(`      Currency: ${bank.currency.toUpperCase()}`);
        console.log(`      Country: ${bank.country}`);
        console.log(`      Last 4: ****${bank.last4}`);
        console.log(`      Default: ${bank.default_for_currency ? '✅ Oui' : '❌ Non'}`);
      });
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('                         RECOMMANDATIONS                        ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const currencies = new Set(balance.available?.map(b => b.currency) || []);

    if (currencies.has('eur') && currencies.has('usd')) {
      console.log('✅ Multi-devises activé: EUR et USD disponibles');
    } else if (currencies.has('eur') && !currencies.has('usd')) {
      console.log('⚠️  Seul EUR est disponible');
      console.log('   → Ajouter un compte bancaire USD pour éviter les frais FX sur les commissions USD');
    } else if (!currencies.has('eur') && currencies.has('usd')) {
      console.log('⚠️  Seul USD est disponible');
      console.log('   → Ajouter un compte bancaire EUR pour éviter les frais FX sur les commissions EUR');
    }

    console.log('\n📌 Pour configurer multi-devises:');
    console.log('   1. Dashboard → Settings → Payouts');
    console.log('   2. Add bank account dans chaque devise (EUR et USD)');
    console.log('   3. Activer "Receive payouts in multiple currencies"');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

checkPlatformAccount();
