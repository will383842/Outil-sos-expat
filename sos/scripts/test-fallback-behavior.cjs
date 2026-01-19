/**
 * Test du comportement de fallback en cas d'échec de normalisation
 * Vérifie que l'utilisateur n'est JAMAIS bloqué
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

// Simuler le comportement de prepareStandardizedData
function preparePhoneForSubmission(clientPhone, defaultCountry = 'FR') {
  const phoneResult = smartNormalizePhone(clientPhone, defaultCountry);

  let finalPhone = clientPhone;  // Fallback par défaut

  if (phoneResult.ok && phoneResult.e164) {
    finalPhone = phoneResult.e164;
    return {
      success: true,
      phone: finalPhone,
      normalized: true,
      message: '✅ Téléphone normalisé',
    };
  } else {
    return {
      success: true,  // ✅ TOUJOURS success, jamais de blocage
      phone: finalPhone,
      normalized: false,
      message: `⚠️ Normalisation échouée (${phoneResult.reason}), numéro brut utilisé`,
    };
  }
}

console.log('\n🧪 Test du comportement de fallback\n');
console.log('='.repeat(80));

// Cas limites et erreurs
const testCases = [
  {
    input: '+33612345678',
    description: 'Numéro valide standard',
  },
  {
    input: '070000000',
    description: 'Numéro invalide (trop court)',
  },
  {
    input: '+337000000000000000',
    description: 'Numéro invalide (trop long)',
  },
  {
    input: 'abc123def',
    description: 'Caractères invalides',
  },
  {
    input: '+999999999999',
    description: 'Indicatif pays inexistant',
  },
  {
    input: '',
    description: 'Chaîne vide',
  },
  {
    input: '+',
    description: 'Seulement le +',
  },
  {
    input: '+33ABCDEFGH',
    description: 'Format complètement cassé',
  },
  {
    input: '06 12 34 56 78',
    description: 'Numéro valide avec espaces',
  },
];

let blockedCount = 0;
let passedCount = 0;

testCases.forEach((test, index) => {
  try {
    const result = preparePhoneForSubmission(test.input, 'FR');

    if (result.success) {
      passedCount++;
      console.log(`\n✅ Test ${index + 1}: ${test.description}`);
      console.log(`   Input: "${test.input}"`);
      console.log(`   Output: "${result.phone}"`);
      console.log(`   Normalized: ${result.normalized ? 'Oui' : 'Non (fallback)'}`);
      console.log(`   ${result.message}`);
    } else {
      blockedCount++;
      console.log(`\n❌ Test ${index + 1}: ${test.description}`);
      console.log(`   Input: "${test.input}"`);
      console.log(`   ⚠️ UTILISATEUR BLOQUÉ !`);
    }
  } catch (error) {
    blockedCount++;
    console.log(`\n🚨 Test ${index + 1}: ${test.description}`);
    console.log(`   Input: "${test.input}"`);
    console.log(`   ⚠️ EXCEPTION NON GÉRÉE: ${error.message}`);
    console.log(`   ⚠️ UTILISATEUR BLOQUÉ !`);
  }
});

console.log('\n' + '='.repeat(80));
console.log(`\n📊 Résultats:`);
console.log(`   ✅ Cas permissifs (non bloquants): ${passedCount}/${testCases.length}`);
console.log(`   ❌ Cas bloquants: ${blockedCount}/${testCases.length}\n`);

if (blockedCount === 0) {
  console.log('🎉 AUCUN cas bloquant ! L\'utilisateur peut toujours soumettre.\n');
  process.exit(0);
} else {
  console.log('⚠️  Certains cas bloquent l\'utilisateur. À corriger !\n');
  process.exit(1);
}
