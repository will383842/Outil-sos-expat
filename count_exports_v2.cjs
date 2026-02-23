// Count ALL exports that Firebase would deploy as Cloud Functions
// Firebase deploys anything that has __endpoint (v2) or __trigger (v1)
// But also check for CloudFunction-like shapes more thoroughly
process.env.GCLOUD_PROJECT = 'sos-urgently-ac307';
process.env.FIREBASE_CONFIG = JSON.stringify({ projectId: 'sos-urgently-ac307' });

const exp = require('./sos/firebase/functions/lib/index.js');
const keys = Object.keys(exp);

const cloudFunctions = [];
const maybeFunctions = [];
const nonFunctions = [];

for (const k of keys) {
  const v = exp[k];
  if (!v) {
    nonFunctions.push({ name: k, reason: 'null/undefined' });
    continue;
  }

  // v2 functions have __endpoint
  if (v.__endpoint) {
    cloudFunctions.push(k);
    continue;
  }

  // v1 functions have __trigger and run
  if (v.__trigger) {
    cloudFunctions.push(k);
    continue;
  }

  // v1 onCall functions: they are plain functions with .run property
  if (typeof v === 'function' && v.run && typeof v.run === 'function') {
    cloudFunctions.push(k);
    continue;
  }

  // Check for TaskQueueFunction shape
  if (typeof v === 'object' && v.taskQueueTrigger) {
    cloudFunctions.push(k);
    continue;
  }

  // Check for ScheduleFunction shape
  if (typeof v === 'object' && v.schedule) {
    cloudFunctions.push(k);
    continue;
  }

  // Check if it's a function with HTTPS trigger shape
  if (typeof v === 'function' && v.__endpoint === undefined && v.__trigger === undefined) {
    // This is a plain function, not a Cloud Function
    nonFunctions.push({ name: k, reason: `function (no __endpoint or __trigger)` });
    continue;
  }

  // Anything else
  nonFunctions.push({ name: k, reason: `${typeof v}` });
}

cloudFunctions.sort();

console.log('=== VERIFIED CLOUD FUNCTION COUNT ===');
console.log(`Total exports: ${keys.length}`);
console.log(`Cloud Functions: ${cloudFunctions.length}`);
console.log(`Non-functions: ${nonFunctions.length}`);
console.log('');

// Now compare with deployed
const fs = require('fs');
const deployed = fs.readFileSync('deployed_names.txt', 'utf8').trim().split('\n').filter(Boolean);

const codeSet = new Set(cloudFunctions);
const deployedSet = new Set(deployed);

const inCodeNotDeployed = cloudFunctions.filter(f => !deployedSet.has(f));
const deployedNotInCode = deployed.filter(f => !codeSet.has(f));
const inBoth = cloudFunctions.filter(f => deployedSet.has(f));

console.log(`=== COMPARISON ===`);
console.log(`In code AND deployed: ${inBoth.length}`);
console.log(`In code, NOT deployed: ${inCodeNotDeployed.length}`);
console.log(`Deployed, NOT in code: ${deployedNotInCode.length}`);
console.log('');

if (inCodeNotDeployed.length > 0) {
  console.log('=== IN CODE BUT NOT DEPLOYED ===');
  for (const f of inCodeNotDeployed.sort()) {
    console.log(`  ${f}`);
  }
  console.log('');
}

if (deployedNotInCode.length > 0) {
  console.log('=== DEPLOYED BUT NOT IN CODE ===');
  for (const f of deployedNotInCode.sort()) {
    console.log(`  ${f}`);
  }
  console.log('');
}

// Also check: are any non-function exports matching deployed names?
console.log('=== NON-FUNCTION EXPORTS THAT ARE DEPLOYED (BUG IN DETECTION) ===');
for (const nf of nonFunctions) {
  if (deployedSet.has(nf.name)) {
    console.log(`  ${nf.name} [${nf.reason}] — IS DEPLOYED (our detection missed it)`);
  }
}

// Write verified list
fs.writeFileSync('verified_function_names.txt', cloudFunctions.join('\n') + '\n');
console.log(`\nWrote ${cloudFunctions.length} verified function names to verified_function_names.txt`);

// Also check: what about exports that are NOT Cloud Functions but ARE in the deployed list?
// These would indicate Firebase deploys them despite not having __endpoint
console.log('\n=== FULL NON-FUNCTION EXPORTS (for review) ===');
for (const nf of nonFunctions.sort((a,b) => a.name.localeCompare(b.name))) {
  console.log(`  ${nf.name} [${nf.reason}]`);
}
