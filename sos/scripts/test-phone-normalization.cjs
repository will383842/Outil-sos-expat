/**
 * Script de test pour vérifier la normalisation des numéros de téléphone
 * Usage: node scripts/test-phone-normalization.cjs
 */

const { parsePhoneNumberFromString } = require('libphonenumber-js');

/**
 * Réplication de smartNormalizePhone pour les tests
 */
function smartNormalizePhone(input, selectedCountry = 'FR') {
  // 1. Nettoyer l'entrée
  let phone = (input || '').trim();

  if (!phone) {
    return { ok: false, e164: null, reason: 'empty' };
  }

  // 2. Supprimer tous les caractères de formatage
  phone = phone.replace(/[\s\-.()/]/g, '');

  // 3. Gérer le préfixe international "00" → "+"
  if (phone.startsWith('00') && phone.length > 4) {
    phone = '+' + phone.slice(2);
  }

  // 4. Essayer de parser le numéro
  let parsed;

  // 4a. Si le numéro commence par +, parser directement
  if (phone.startsWith('+')) {
    parsed = parsePhoneNumberFromString(phone);
  }
  // 4b. Sinon, utiliser le pays sélectionné comme contexte
  else {
    parsed = parsePhoneNumberFromString(phone, selectedCountry);

    // 4c. Si ça échoue et que le numéro est assez long, essayer avec un +
    if (!parsed && phone.length > 10 && /^[1-9]\d+$/.test(phone)) {
      parsed = parsePhoneNumberFromString('+' + phone);
    }
  }

  // 5. Vérifier si le parsing a réussi
  if (!parsed) {
    return { ok: false, e164: null, reason: 'parse_failed' };
  }

  // 6. Vérifier si le numéro est valide
  if (!parsed.isValid()) {
    return { ok: false, e164: null, reason: 'invalid' };
  }

  // 7. Extraire le format E.164
  const e164 = parsed.number;

  // 8. Validation finale
  if (!/^\+[1-9]\d{6,14}$/.test(e164)) {
    return { ok: false, e164: null, reason: 'length' };
  }

  return {
    ok: true,
    e164,
    country: parsed.country,
    nationalNumber: parsed.nationalNumber,
  };
}

// Test cases - tous les formats que l'utilisateur a mentionnés
const testCases = [
  // France
  { input: '0612345678', country: 'FR', expected: '+33612345678', description: 'France - format national avec 0' },
  { input: '612345678', country: 'FR', expected: '+33612345678', description: 'France - format national sans 0' },
  { input: '+33612345678', country: 'FR', expected: '+33612345678', description: 'France - format international avec +' },
  { input: '0033612345678', country: 'FR', expected: '+33612345678', description: 'France - format international avec 00' },
  { input: '33612345678', country: 'FR', expected: '+33612345678', description: 'France - format international sans +' },
  { input: '06 12 34 56 78', country: 'FR', expected: '+33612345678', description: 'France - avec espaces' },
  { input: '06-12-34-56-78', country: 'FR', expected: '+33612345678', description: 'France - avec tirets' },

  // UK
  { input: '07911123456', country: 'GB', expected: '+447911123456', description: 'UK - format national avec 0' },
  { input: '+447911123456', country: 'GB', expected: '+447911123456', description: 'UK - format international avec +' },
  { input: '00447911123456', country: 'GB', expected: '+447911123456', description: 'UK - format international avec 00' },

  // US
  { input: '2125551234', country: 'US', expected: '+12125551234', description: 'US - format national sans 1' },
  { input: '+12125551234', country: 'US', expected: '+12125551234', description: 'US - format international avec +' },
  { input: '001 212 555 1234', country: 'US', expected: '+12125551234', description: 'US - format international avec 00 et espaces' },

  // Espagne
  { input: '612345678', country: 'ES', expected: '+34612345678', description: 'Espagne - format national' },
  { input: '+34612345678', country: 'ES', expected: '+34612345678', description: 'Espagne - format international' },

  // Allemagne
  { input: '01701234567', country: 'DE', expected: '+491701234567', description: 'Allemagne - format national avec 0' },
  { input: '+491701234567', country: 'DE', expected: '+491701234567', description: 'Allemagne - format international' },

  // Tests de cas limites
  { input: '070000000', country: 'FR', expected: null, description: 'France - numéro invalide (trop court)' },
  { input: '+337000000000000000', country: 'FR', expected: null, description: 'France - numéro invalide (trop long)' },
  { input: '', country: 'FR', expected: null, description: 'Chaîne vide' },
  { input: 'abc123', country: 'FR', expected: null, description: 'Caractères invalides' },
];

console.log('\n🧪 Test de normalisation des numéros de téléphone\n');
console.log('='.repeat(80));

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  const result = smartNormalizePhone(test.input, test.country);
  const success = result.e164 === test.expected;

  if (success) {
    passed++;
    console.log(`\n✅ Test ${index + 1}: ${test.description}`);
    console.log(`   Input: "${test.input}" (${test.country})`);
    console.log(`   Output: ${result.e164}`);
  } else {
    failed++;
    console.log(`\n❌ Test ${index + 1}: ${test.description}`);
    console.log(`   Input: "${test.input}" (${test.country})`);
    console.log(`   Expected: ${test.expected}`);
    console.log(`   Got: ${result.e164}`);
    console.log(`   Reason: ${result.reason || 'N/A'}`);
  }
});

console.log('\n' + '='.repeat(80));
console.log(`\n📊 Résultats: ${passed} réussis, ${failed} échoués sur ${testCases.length} tests\n`);

if (failed === 0) {
  console.log('🎉 Tous les tests sont passés avec succès !\n');
  process.exit(0);
} else {
  console.log('⚠️  Certains tests ont échoué. Veuillez vérifier la logique de normalisation.\n');
  process.exit(1);
}
