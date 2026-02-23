// Count all exports from compiled index.js
process.env.GCLOUD_PROJECT = 'sos-urgently-ac307';
process.env.FIREBASE_CONFIG = JSON.stringify({ projectId: 'sos-urgently-ac307' });
const exp = require('./sos/firebase/functions/lib/index.js');
const keys = Object.keys(exp);

// Categorize exports
const cloudFunctions = [];
const nonFunctions = [];

for (const k of keys) {
  const v = exp[k];
  if (v && typeof v === 'object' && v.__endpoint) {
    cloudFunctions.push(k);
  } else if (v && typeof v === 'function' && v.__endpoint) {
    cloudFunctions.push(k);
  } else if (v && typeof v === 'object' && v.run && v.__trigger) {
    // v1 functions
    cloudFunctions.push(k);
  } else {
    nonFunctions.push(k);
  }
}

cloudFunctions.sort();
nonFunctions.sort();

console.log('=== TOTAL EXPORTS from index.js ===');
console.log('Total keys:', keys.length);
console.log('Cloud Functions (with __endpoint or __trigger):', cloudFunctions.length);
console.log('Non-function exports:', nonFunctions.length);
console.log('');
console.log('=== NON-FUNCTION EXPORTS ===');
for (const n of nonFunctions) {
  const v = exp[n];
  console.log(`  ${n} [${typeof v}]`);
}
console.log('');
console.log('=== ALL CLOUD FUNCTION NAMES ===');

// Write to file
const fs = require('fs');
fs.writeFileSync('verified_function_names.txt', cloudFunctions.join('\n') + '\n');
console.log(`Wrote ${cloudFunctions.length} function names to verified_function_names.txt`);
