/**
 * Script to merge admin.json translations from locales/ into helper/ files
 * This ensures all admin translations are available in the IntlProvider
 */
const fs = require('fs');
const path = require('path');

// Mapping from locales folder names to helper file names
const LOCALE_TO_HELPER_MAP = {
  'en': 'en',
  'fr-fr': 'fr',
  'es-es': 'es',
  'de-de': 'de',
  'pt-pt': 'pt',
  'ru-ru': 'ru',
  'zh-cn': 'ch',
  'hi-in': 'hi',
  'ar-sa': 'ar'
};

const localesDir = path.join(__dirname, '..', 'src', 'locales');
const helperDir = path.join(__dirname, '..', 'src', 'helper');

let totalAdded = 0;
let totalUpdated = 0;

for (const [localeFolder, helperFile] of Object.entries(LOCALE_TO_HELPER_MAP)) {
  const adminJsonPath = path.join(localesDir, localeFolder, 'admin.json');
  const helperJsonPath = path.join(helperDir, `${helperFile}.json`);

  // Check if files exist
  if (!fs.existsSync(adminJsonPath)) {
    console.log(`⚠️  Skipping ${localeFolder}: admin.json not found`);
    continue;
  }
  if (!fs.existsSync(helperJsonPath)) {
    console.log(`⚠️  Skipping ${helperFile}: helper file not found`);
    continue;
  }

  try {
    // Read both files
    const adminData = JSON.parse(fs.readFileSync(adminJsonPath, 'utf8'));
    const helperData = JSON.parse(fs.readFileSync(helperJsonPath, 'utf8'));

    let added = 0;
    let updated = 0;

    // Merge admin translations into helper
    for (const [key, value] of Object.entries(adminData)) {
      // Skip section headers (empty string values with ===== in key)
      if (value === '' && key.includes('=====')) {
        continue;
      }

      if (!(key in helperData)) {
        helperData[key] = value;
        added++;
      } else if (helperData[key] !== value && value !== '') {
        // Update if different and not empty (prefer admin.json as source of truth)
        helperData[key] = value;
        updated++;
      }
    }

    // Sort keys alphabetically for consistency
    const sortedData = {};
    Object.keys(helperData).sort().forEach(key => {
      sortedData[key] = helperData[key];
    });

    // Write back
    fs.writeFileSync(helperJsonPath, JSON.stringify(sortedData, null, 2) + '\n', 'utf8');

    console.log(`✅ ${helperFile}.json: +${added} added, ~${updated} updated`);
    totalAdded += added;
    totalUpdated += updated;

  } catch (error) {
    console.error(`❌ Error processing ${localeFolder}:`, error.message);
  }
}

console.log('\n📊 Summary:');
console.log(`   Total keys added: ${totalAdded}`);
console.log(`   Total keys updated: ${totalUpdated}`);
console.log('\n✨ Admin translations merged successfully!');
