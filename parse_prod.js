const { execSync } = require('child_process');
const fs = require('fs');

const raw = execSync('firebase functions:list --project sos-urgently-ac307 2>&1', {encoding:'utf8', maxBuffer: 10*1024*1024});
const clean = raw.replace(/\x1b\[[0-9;]*m/g, '');
const lines = clean.split('\n');
const funcs = [];
for (const line of lines) {
  if (line.indexOf('│') === -1 || line.indexOf('──') !== -1 || line.indexOf('Function') !== -1) continue;
  const parts = line.split('│').map(s => s.trim()).filter(Boolean);
  if (parts.length >= 4 && parts[0] && !['callable','scheduled','https','event','v1','v2'].includes(parts[0])) {
    funcs.push({ name: parts[0], version: parts[1], trigger: parts[2], region: parts[3], memory: parts[4], runtime: parts[5] });
  }
}

const names = funcs.map(f => f.name).sort();
fs.writeFileSync('/tmp/prod_final.txt', names.join('\n') + '\n');
fs.writeFileSync('/tmp/prod_full.json', JSON.stringify(funcs, null, 2));

console.log('Total: ' + funcs.length);
console.log('\nBy region:');
const byRegion = {};
funcs.forEach(f => { byRegion[f.region] = (byRegion[f.region]||0)+1; });
Object.entries(byRegion).sort((a,b)=>b[1]-a[1]).forEach(([r,c]) => console.log('  ' + r + ': ' + c));

console.log('\nBy trigger:');
const byTrigger = {};
funcs.forEach(f => { byTrigger[f.trigger] = (byTrigger[f.trigger]||0)+1; });
Object.entries(byTrigger).sort((a,b)=>b[1]-a[1]).forEach(([t,c]) => console.log('  ' + t + ': ' + c));

// Now compare with bundle
const bundleModule = require('./sos/firebase/functions/lib/index.js');
const bundleKeys = Object.keys(bundleModule).sort();
const nonFunctions = new Set(['CACHE_TTL_DAYS','COUNTRY_THRESHOLDS','DEFAULT_GRACE_PERIOD_DAYS','DEFAULT_TRIAL_CONFIG','EMAIL_PASS','EMAIL_USER','ENCRYPTION_KEY','EU_COUNTRIES','EU_VAT_RATES','FAIR_USE_LIMIT','INVOICE_MENTIONS','OSS_THRESHOLD_EUR','OUTIL_API_KEY','OUTIL_SYNC_API_KEY','PAYPAL_CLIENT_ID','PAYPAL_CLIENT_SECRET','PAYPAL_MODE','PAYPAL_PARTNER_ID','PAYPAL_PLATFORM_MERCHANT_ID','PAYPAL_REMINDER_CONFIG','PAYPAL_WEBHOOK_ID','PayPalReminderManager','REFUND_CONFIG','RefundManager','SELLER_COUNTRY','SELLER_VAT_RATE','STRIPE_CONNECT_WEBHOOK_SECRET_LIVE','STRIPE_CONNECT_WEBHOOK_SECRET_TEST','STRIPE_MODE','STRIPE_SECRET_KEY_LIVE','STRIPE_SECRET_KEY_TEST','STRIPE_WEBHOOK_SECRET_LIVE','STRIPE_WEBHOOK_SECRET_TEST','SUBSCRIPTION_STATUSES','SUBSCRIPTION_TIERS','TASKS_AUTH_SECRET','TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_PHONE_NUMBER','UNCLAIMED_FUNDS_CONFIG','VAT_CACHE_COLLECTION','isEUCountry','isEligibleForReverseCharge','isUkCountry','isValidSubscriptionStatus','isValidSubscriptionTier','createApiAccessLogger','calculateTax','calculateTaxForTransaction','checkReverseCharge','getStripe','getStripeConnectWebhookSecret']);
const bundleFunctions = bundleKeys.filter(k => !nonFunctions.has(k));

const prodSet = new Set(names);
const bundleSet = new Set(bundleFunctions);

const toDeploy = bundleFunctions.filter(f => !prodSet.has(f)).sort();
const zombies = names.filter(f => !bundleSet.has(f)).sort();
const inBoth = names.filter(f => bundleSet.has(f));

console.log('\n=== COMPARISON ===');
console.log('Bundle functions: ' + bundleFunctions.length);
console.log('Prod functions: ' + names.length);
console.log('In both: ' + inBoth.length);
console.log('To deploy (in bundle, not in prod): ' + toDeploy.length);
console.log('Zombies (in prod, not in bundle): ' + zombies.length);

console.log('\n=== TO DEPLOY (' + toDeploy.length + ') ===');
toDeploy.forEach(f => console.log('  ' + f));

console.log('\n=== ZOMBIES (' + zombies.length + ') ===');
zombies.forEach(f => console.log('  ' + f));

// For each function to deploy, determine its type from the bundle
console.log('\n=== TO DEPLOY - DETAILS ===');
toDeploy.forEach(f => {
  const fn = bundleModule[f];
  let type = 'unknown';
  if (fn && fn.__endpoint) {
    const ep = fn.__endpoint;
    if (ep.callableTrigger) type = 'callable';
    else if (ep.httpsTrigger) type = 'https';
    else if (ep.scheduleTrigger) type = 'scheduled';
    else if (ep.eventTrigger) type = 'event: ' + (ep.eventTrigger.eventType || 'unknown');
    else if (ep.taskQueueTrigger) type = 'taskQueue';
  } else if (fn && fn.run) {
    type = 'v2-function';
  }
  const region = fn && fn.__endpoint && fn.__endpoint.region ? fn.__endpoint.region : 'default';
  console.log('  ' + f + ' | type=' + type + ' | region=' + region);
});
