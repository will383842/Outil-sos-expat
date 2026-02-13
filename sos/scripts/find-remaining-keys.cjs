const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'CHATTER_MISSING_KEYS.json'), 'utf8'));
const fr = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'helper', 'fr.json'), 'utf8'));

const missing = data.missingInAllLanguages.filter(k => !fr[k]);

console.log('Clés encore manquantes (' + missing.length + '):');
missing.forEach(k => console.log(k));
