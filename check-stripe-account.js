const Stripe = require('stripe');

// Use your Stripe secret key (you may need to set this)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_LIVE || 'sk_live_YOUR_KEY');

async function checkAccount() {
  const accountId = 'acct_1SY6uoRUfeOTua85';

  try {
    const account = await stripe.accounts.retrieve(accountId);

    console.log('=== STRIPE CONNECT ACCOUNT ===');
    console.log('  ID:', account.id);
    console.log('  charges_enabled:', account.charges_enabled);
    console.log('  payouts_enabled:', account.payouts_enabled);
    console.log('  details_submitted:', account.details_submitted);
    console.log('  type:', account.type);
    console.log('  country:', account.country);

    if (account.requirements) {
      console.log('\n=== REQUIREMENTS ===');
      console.log('  currently_due:', account.requirements.currently_due?.length || 0, 'items');
      if (account.requirements.currently_due?.length) {
        account.requirements.currently_due.forEach(req => console.log('    -', req));
      }
      console.log('  eventually_due:', account.requirements.eventually_due?.length || 0, 'items');
      console.log('  disabled_reason:', account.requirements.disabled_reason || 'none');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkAccount();
