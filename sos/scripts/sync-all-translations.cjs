// Sync translations from locales to helper (EN and FR only)
const fs = require('fs');
const path = require('path');

const LOCALE_TO_HELPER_MAP = {
  'en': 'en',
  'fr-fr': 'fr'
};

const localesDir = path.join(__dirname, '..', 'src', 'locales');
const helperDir = path.join(__dirname, '..', 'src', 'helper');

console.log('Synchronizing translations...\n');

let totalAdded = 0;
let totalUpdated = 0;

for (const [localeFolder, helperFile] of Object.entries(LOCALE_TO_HELPER_MAP)) {
  const adminJsonPath = path.join(localesDir, localeFolder, 'admin.json');
  const helperJsonPath = path.join(helperDir, helperFile + '.json');

  if (!fs.existsSync(adminJsonPath)) {
    console.log('[SKIP] ' + localeFolder + '/admin.json not found');
    continue;
  }
  if (!fs.existsSync(helperJsonPath)) {
    console.log('[SKIP] helper/' + helperFile + '.json not found');
    continue;
  }

  try {
    const adminData = JSON.parse(fs.readFileSync(adminJsonPath, 'utf8'));
    const helperData = JSON.parse(fs.readFileSync(helperJsonPath, 'utf8'));

    let added = 0;
    let updated = 0;

    for (const [key, value] of Object.entries(adminData)) {
      if (value === '' && key.includes('=====')) continue;
      if (value === '') continue;

      if (!(key in helperData)) {
        helperData[key] = value;
        added++;
      } else if (helperData[key] !== value) {
        helperData[key] = value;
        updated++;
      }
    }

    const sortedData = {};
    Object.keys(helperData).sort().forEach(function(key) {
      sortedData[key] = helperData[key];
    });

    fs.writeFileSync(helperJsonPath, JSON.stringify(sortedData, null, 2) + '\n', 'utf8');
    console.log('[OK] ' + helperFile + '.json: +' + added + ' added, ~' + updated + ' updated');
    totalAdded += added;
    totalUpdated += updated;

  } catch (error) {
    console.error('[ERROR] ' + localeFolder + ': ' + error.message);
  }
}

console.log('\nTotal: +' + totalAdded + ' added, ~' + totalUpdated + ' updated');
console.log('Done!\n');
