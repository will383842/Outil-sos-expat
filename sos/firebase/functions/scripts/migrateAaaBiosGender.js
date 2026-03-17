/**
 * Script de migration pour corriger les bios genrées des profils AAA féminins
 * + ajouter successRate aux profils qui n'en ont pas
 *
 * Usage:
 *   cd sos/firebase/functions
 *   node scripts/migrateAaaBiosGender.js --dry-run
 *   node scripts/migrateAaaBiosGender.js --execute
 */

const admin = require('firebase-admin');
const path = require('path');

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'sos-urgently-ac307' });
}
const db = admin.firestore();

// Load French bio templates
const frTranslations = require(path.join(__dirname, '../../../src/helper/aaaprofiles/admin_aaa_fr.json'));

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function interpolateBio(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] || '');
}

async function migrate(dryRun = true) {
  console.log(`\n🔧 Migration AAA Bios Gender - ${dryRun ? 'DRY RUN' : '⚠️  EXÉCUTION RÉELLE'}`);
  console.log('='.repeat(60));

  // 1. Load all AAA profiles
  const snapshot = await db.collection('sos_profiles').where('isAAA', '==', true).get();
  console.log(`\n📋 Found ${snapshot.size} AAA profiles`);

  // 2. Build template pools
  const allLangs = ['fr', 'en', 'es', 'de', 'pt', 'ru', 'zh', 'ar', 'hi'];
  const translationFiles = { fr: frTranslations };
  for (const lang of allLangs) {
    if (lang === 'fr') continue;
    try {
      translationFiles[lang] = require(path.join(__dirname, `../../../src/helper/aaaprofiles/admin_aaa_${lang}.json`));
    } catch { /* skip */ }
  }

  const bioTemplates = { lawyer: {}, expat: {} };
  for (const role of ['lawyer', 'expat']) {
    for (const lang of allLangs) {
      const t = translationFiles[lang];
      if (!t) continue;
      const bioSection = t?.admin?.aaa?.bio?.[role];
      if (!bioSection) continue;
      // French has male/female structure
      if (bioSection.female && typeof bioSection.female === 'object') {
        bioTemplates[role][`${lang}_female`] = Object.values(bioSection.female);
        bioTemplates[role][`${lang}_male`] = Object.values(bioSection.male || bioSection);
      } else {
        // Other langs: same templates for both genders
        bioTemplates[role][`${lang}_female`] = Object.values(bioSection);
        bioTemplates[role][`${lang}_male`] = Object.values(bioSection);
      }
    }
  }

  // 3. Collect ALL existing bios to track uniqueness
  const usedBios = {}; // key: role_lang -> Set of template indices
  const allProfiles = [];

  for (const d of snapshot.docs) {
    const data = d.data();
    allProfiles.push({ id: d.id, ...data });
  }

  // 4. Identify profiles needing fixes
  const femaleToFix = [];
  const needSuccessRate = [];
  const noGender = [];

  for (const p of allProfiles) {
    const role = p.type || p.role || 'lawyer';
    const gender = p.gender;

    // Check successRate
    if (p.successRate === undefined || p.successRate === null) {
      needSuccessRate.push(p);
    }

    if (!gender) {
      noGender.push(p);
      continue;
    }

    if (gender === 'female') {
      const bioFr = typeof p.bio === 'object' ? p.bio?.fr : p.bio;
      if (!bioFr) {
        femaleToFix.push(p);
        continue;
      }
      // Check for masculine patterns in French bio
      const hasMasculine =
        (/\bAvocat\b/.test(bioFr) && !/\bAvocate\b/.test(bioFr)) ||
        (/\bspécialisé\b/.test(bioFr) && !/\bspécialisée\b/.test(bioFr)) ||
        (/\bExpatrié\b/.test(bioFr) && !/\bExpatriée\b/.test(bioFr)) ||
        (/\bbasé\b/.test(bioFr) && !/\bbasée\b/.test(bioFr)) ||
        (/\bExpert\b/.test(bioFr) && !/\bExperte\b/.test(bioFr)) ||
        (/\bétabli\b/.test(bioFr) && !/\bétablie\b/.test(bioFr)) ||
        (/\bProfessionnel\b/.test(bioFr) && !/\bProfessionnelle\b/.test(bioFr)) ||
        (/\binstallé\b/.test(bioFr) && !/\binstallée\b/.test(bioFr));

      if (hasMasculine) {
        femaleToFix.push(p);
      }
    }
  }

  console.log(`\n📊 Résultats:`);
  console.log(`   Profils féminins avec bio masculine: ${femaleToFix.length}`);
  console.log(`   Profils sans successRate: ${needSuccessRate.length}`);
  console.log(`   Profils sans genre défini: ${noGender.length}`);

  if (noGender.length > 0 && noGender.length <= 20) {
    noGender.forEach(p => console.log(`   ⚠️  Sans genre: ${p.id} (${p.fullName})`));
  }

  if (dryRun) {
    femaleToFix.forEach(p => console.log(`   👩 Bio à corriger: ${p.id} (${p.fullName}) [${p.type || p.role}]`));
    console.log(`\n🔍 DRY RUN terminé. Lancez avec --execute pour appliquer.`);
    return;
  }

  // 5. Track used bio indices per role+lang (from profiles NOT being fixed)
  const usedIndices = {};
  for (const p of allProfiles) {
    if (femaleToFix.find(f => f.id === p.id)) continue; // Skip profiles being regenerated
    const role = p.type || p.role || 'lawyer';
    const bio = p.bio;
    if (!bio || typeof bio !== 'object') continue;
    const gender = p.gender || 'male';
    for (const lang of allLangs) {
      const bioText = bio[lang];
      if (!bioText) continue;
      const key = `${role}_${lang}_${gender}`;
      if (!usedIndices[key]) usedIndices[key] = new Set();
      const templates = bioTemplates[role]?.[`${lang}_${gender}`];
      if (templates) {
        // Check raw template match (before interpolation, can't match exactly, so skip)
      }
    }
  }

  // 6. Fix female bios
  let bioFixed = 0;
  for (const profile of femaleToFix) {
    const role = (profile.type || profile.role || 'lawyer');
    const newBio = {};

    for (const lang of allLangs) {
      const templates = bioTemplates[role]?.[`${lang}_female`];
      if (!templates || templates.length === 0) continue;

      const key = `${role}_${lang}_female`;
      if (!usedIndices[key]) usedIndices[key] = new Set();

      // Find unused template
      let idx = -1;
      const shuffled = [...Array(templates.length).keys()].sort(() => Math.random() - 0.5);
      for (const candidate of shuffled) {
        if (!usedIndices[key].has(candidate)) {
          idx = candidate;
          break;
        }
      }
      if (idx === -1) idx = shuffled[0]; // All used, allow duplicate

      usedIndices[key].add(idx);

      const specialtiesText = (profile.specialties || profile.helpTypes || []).join(', ');
      newBio[lang] = interpolateBio(templates[idx], {
        specialties: specialtiesText,
        help: specialtiesText,
        services: specialtiesText,
        country: profile.country || '',
        experience: profile.yearsOfExperience || profile.yearsAsExpat || 5,
      });
    }

    try {
      await db.collection('sos_profiles').doc(profile.id).update({ bio: newBio });
      await db.collection('users').doc(profile.id).update({ bio: newBio });
      bioFixed++;
      console.log(`   ✅ Bio fixée: ${profile.id} (${profile.fullName})`);
    } catch (e) {
      console.error(`   ❌ Erreur: ${profile.id}:`, e.message);
    }
  }

  // 7. Fix successRate
  let srFixed = 0;
  for (const profile of needSuccessRate) {
    const sr = randomInt(90, 100);
    const tc = profile.totalCalls || 0;
    const sc = Math.round(tc * sr / 100);
    try {
      await db.collection('sos_profiles').doc(profile.id).update({ successRate: sr, successfulCalls: sc });
      await db.collection('users').doc(profile.id).update({ successRate: sr, successfulCalls: sc });
      srFixed++;
    } catch (e) {
      console.error(`   ❌ SuccessRate erreur: ${profile.id}:`, e.message);
    }
  }

  console.log(`\n✅ Migration terminée!`);
  console.log(`   Bios corrigées: ${bioFixed}/${femaleToFix.length}`);
  console.log(`   SuccessRate ajouté: ${srFixed}/${needSuccessRate.length}`);
}

// Parse CLI args
const args = process.argv.slice(2);
const dryRun = !args.includes('--execute');
migrate(dryRun).catch(e => { console.error('❌ Fatal:', e); process.exit(1); });
