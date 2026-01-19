/**
 * Test de détection automatique du pays depuis le numéro
 * Simule le cas où l'utilisateur sélectionne le MAUVAIS pays dans le dropdown
 */

const { parsePhoneNumberFromString } = require('libphonenumber-js');

function smartNormalizePhone(input, selectedCountry = 'FR') {
  let phone = (input || '').trim();
  if (!phone) return { ok: false, e164: null, reason: 'empty' };

  phone = phone.replace(/[\s\-.()/]/g, '');

  if (phone.startsWith('00') && phone.length > 4) {
    phone = '+' + phone.slice(2);
  }

  let parsed;

  if (phone.startsWith('+')) {
    parsed = parsePhoneNumberFromString(phone);
  } else {
    parsed = parsePhoneNumberFromString(phone, selectedCountry);
    if (!parsed && phone.length > 10 && /^[1-9]\d+$/.test(phone)) {
      parsed = parsePhoneNumberFromString('+' + phone);
    }
  }

  if (!parsed || !parsed.isValid()) {
    return { ok: false, e164: null, reason: parsed ? 'invalid' : 'parse_failed' };
  }

  const e164 = parsed.number;

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

console.log('\n🧪 Test de détection automatique du pays\n');
console.log('='.repeat(80));

// Cas où l'utilisateur sélectionne le MAUVAIS pays dans le dropdown
const testCases = [
  {
    input: '+33612345678',
    selectedCountry: 'FR',
    expectedCountry: 'FR',
    description: 'Numéro français avec pays correct',
  },
  {
    input: '+33612345678',
    selectedCountry: 'GB', // ❌ Mauvais pays sélectionné
    expectedCountry: 'FR',
    description: 'Numéro français mais UK sélectionné (devrait détecter FR)',
  },
  {
    input: '+447911123456',
    selectedCountry: 'FR', // ❌ Mauvais pays sélectionné
    expectedCountry: 'GB',
    description: 'Numéro UK mais France sélectionnée (devrait détecter GB)',
  },
  {
    input: '+12125551234',
    selectedCountry: 'FR', // ❌ Mauvais pays sélectionné
    expectedCountry: 'US',
    description: 'Numéro US mais France sélectionnée (devrait détecter US)',
  },
  {
    input: '0612345678',
    selectedCountry: 'FR',
    expectedCountry: 'FR',
    description: 'Numéro national français avec pays correct',
  },
  {
    input: '0612345678',
    selectedCountry: 'GB', // ❌ Mauvais pays sélectionné
    expectedCountry: null, // Devrait échouer ou utiliser GB par défaut
    description: 'Numéro national avec mauvais pays (ambiguë)',
  },
];

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  // Simuler le comportement de react-phone-input-2
  // Quand l'utilisateur tape un numéro avec +, react-phone-input-2 le retire
  let simulatedInput = test.input;
  if (test.input.startsWith('+')) {
    // react-phone-input-2 retire le +
    simulatedInput = test.input.slice(1);
  }

  // Ajouter le + comme le fait IntlPhoneInput
  const valueWithPlus = '+' + simulatedInput;

  // Essayer de détecter le pays depuis le numéro (comme dans ma correction)
  const parsed = parsePhoneNumberFromString(valueWithPlus);
  const detectedCountry = parsed?.country || test.selectedCountry;

  // Normaliser avec le pays détecté
  const result = smartNormalizePhone(valueWithPlus, detectedCountry);

  const success = result.ok && (
    test.expectedCountry === null ||
    result.country === test.expectedCountry
  );

  if (success) {
    passed++;
    console.log(`\n✅ Test ${index + 1}: ${test.description}`);
    console.log(`   Input: "${test.input}"`);
    console.log(`   Pays sélectionné (dropdown): ${test.selectedCountry}`);
    console.log(`   Pays détecté: ${detectedCountry}`);
    console.log(`   Output E.164: ${result.e164}`);
    console.log(`   Pays final: ${result.country}`);
  } else {
    failed++;
    console.log(`\n❌ Test ${index + 1}: ${test.description}`);
    console.log(`   Input: "${test.input}"`);
    console.log(`   Pays sélectionné (dropdown): ${test.selectedCountry}`);
    console.log(`   Pays détecté: ${detectedCountry}`);
    console.log(`   Expected country: ${test.expectedCountry}`);
    console.log(`   Got: ${result.country}`);
    console.log(`   Output: ${result.e164 || result.reason}`);
  }
});

console.log('\n' + '='.repeat(80));
console.log(`\n📊 Résultats: ${passed} réussis, ${failed} échoués sur ${testCases.length} tests\n`);

if (failed === 0) {
  console.log('🎉 La détection automatique du pays fonctionne parfaitement !\n');
  process.exit(0);
} else {
  console.log('⚠️  Certains tests ont échoué.\n');
  process.exit(1);
}
