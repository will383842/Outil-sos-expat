#!/usr/bin/env node
/**
 * validate-stripe-countries-sync.cjs
 *
 * P1-4 FIX: Validates that Stripe supported countries lists are identical
 * across frontend and backend to prevent desynchronization.
 *
 * Files checked:
 * 1. sos/src/components/registration/shared/stripeCountries.ts (frontend)
 * 2. sos/firebase/functions/src/lib/paymentCountries.ts (backend)
 * 3. sos/src/hooks/usePaymentGateway.ts (frontend hook - PayPal-only list)
 *
 * Usage: node scripts/validate-stripe-countries-sync.cjs
 * Add to CI or pre-commit hook.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// Extract country codes from a Set definition in a TS file
function extractCountryCodes(filePath, setName) {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Find the Set definition
  const setRegex = new RegExp(
    `(?:export\\s+)?(?:const|let|var)\\s+${setName}\\s*[:=]\\s*new\\s+Set\\s*\\(\\s*\\[([\\s\\S]*?)\\]\\s*\\)`,
    'm'
  );
  const match = content.match(setRegex);
  if (!match) {
    throw new Error(`Could not find Set "${setName}" in ${filePath}`);
  }

  // Extract all quoted country codes
  const codes = [];
  const codeRegex = /['"]([A-Z]{2})['"]/g;
  let codeMatch;
  while ((codeMatch = codeRegex.exec(match[1])) !== null) {
    codes.push(codeMatch[1]);
  }

  return new Set(codes);
}

function main() {
  console.log('🔍 Validating Stripe countries synchronization...\n');

  const files = {
    frontend: path.join(ROOT, 'src/components/registration/shared/stripeCountries.ts'),
    backend: path.join(ROOT, 'firebase/functions/src/lib/paymentCountries.ts'),
  };

  let hasErrors = false;

  // Check files exist
  for (const [label, filePath] of Object.entries(files)) {
    if (!fs.existsSync(filePath)) {
      console.error(`❌ ${label} file not found: ${filePath}`);
      hasErrors = true;
    }
  }
  if (hasErrors) process.exit(1);

  // Extract Stripe countries from both files
  const frontendStripe = extractCountryCodes(files.frontend, 'STRIPE_SUPPORTED_COUNTRIES');
  const backendStripe = extractCountryCodes(files.backend, 'STRIPE_SUPPORTED_COUNTRIES');

  console.log(`  Frontend (stripeCountries.ts): ${frontendStripe.size} countries`);
  console.log(`  Backend  (paymentCountries.ts): ${backendStripe.size} countries`);

  // Compare
  const onlyInFrontend = [...frontendStripe].filter(c => !backendStripe.has(c));
  const onlyInBackend = [...backendStripe].filter(c => !frontendStripe.has(c));

  if (onlyInFrontend.length === 0 && onlyInBackend.length === 0) {
    console.log('\n✅ Stripe countries lists are IDENTICAL across frontend and backend.');
  } else {
    hasErrors = true;
    console.error('\n❌ DESYNCHRONIZATION DETECTED!\n');

    if (onlyInFrontend.length > 0) {
      console.error(`  Countries ONLY in frontend: ${onlyInFrontend.join(', ')}`);
      console.error(`  → Add these to: firebase/functions/src/lib/paymentCountries.ts`);
    }

    if (onlyInBackend.length > 0) {
      console.error(`  Countries ONLY in backend: ${onlyInBackend.join(', ')}`);
      console.error(`  → Add these to: src/components/registration/shared/stripeCountries.ts`);
    }
  }

  // Also check usePaymentGateway.ts has PAYPAL_ONLY_COUNTRIES matching backend
  const hookPath = path.join(ROOT, 'src/hooks/usePaymentGateway.ts');
  if (fs.existsSync(hookPath)) {
    try {
      const hookPaypal = extractCountryCodes(hookPath, 'PAYPAL_ONLY_COUNTRIES');
      const backendPaypal = extractCountryCodes(files.backend, 'PAYPAL_ONLY_COUNTRIES');

      console.log(`\n  Hook PayPal-only (usePaymentGateway.ts): ${hookPaypal.size} countries`);
      console.log(`  Backend PayPal-only (paymentCountries.ts): ${backendPaypal.size} countries`);

      const onlyInHook = [...hookPaypal].filter(c => !backendPaypal.has(c));
      const onlyInBackendPaypal = [...backendPaypal].filter(c => !hookPaypal.has(c));

      if (onlyInHook.length === 0 && onlyInBackendPaypal.length === 0) {
        console.log('\n✅ PayPal-only countries lists are IDENTICAL across hook and backend.');
      } else {
        hasErrors = true;
        console.error('\n❌ PAYPAL-ONLY DESYNCHRONIZATION DETECTED!\n');
        if (onlyInHook.length > 0) {
          console.error(`  Countries ONLY in hook: ${onlyInHook.join(', ')}`);
        }
        if (onlyInBackendPaypal.length > 0) {
          console.error(`  Countries ONLY in backend: ${onlyInBackendPaypal.join(', ')}`);
        }
      }
    } catch (e) {
      console.warn(`  ⚠️ Could not validate hook PayPal list: ${e.message}`);
    }
  }

  console.log('');
  process.exit(hasErrors ? 1 : 0);
}

main();
