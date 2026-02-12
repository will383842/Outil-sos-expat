#!/usr/bin/env node
/**
 * Quick verification script to ensure all translations are 100% complete
 * Run this before committing translation changes
 */

const fs = require('fs');
const path = require('path');

const languages = ['fr-fr', 'en', 'es-es', 'de-de', 'pt-pt', 'ru-ru', 'zh-cn', 'hi-in', 'ar-sa'];
const sections = ['influencer', 'blogger', 'groupadmin'];

console.log('🔍 Verifying translation completeness...\n');

// Load all translations
const translations = {};
languages.forEach(lang => {
  const filePath = path.join(__dirname, lang, 'common.json');
  translations[lang] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
});

// Count keys per section per language
const counts = {};
languages.forEach(lang => {
  counts[lang] = {};
  sections.forEach(section => {
    counts[lang][section] = Object.keys(translations[lang]).filter(k => k.startsWith(section + '.')).length;
  });
});

// Find max count per section (should be the same across all languages)
const maxCounts = {};
sections.forEach(section => {
  maxCounts[section] = Math.max(...languages.map(lang => counts[lang][section]));
});

// Check for discrepancies
let allGood = true;
let issues = [];

sections.forEach(section => {
  const expected = maxCounts[section];

  languages.forEach(lang => {
    const actual = counts[lang][section];
    if (actual !== expected) {
      allGood = false;
      issues.push(`❌ ${lang} ${section}: ${actual}/${expected} (missing ${expected - actual})`);
    }
  });
});

// Check for review markers
let markerCount = 0;
languages.forEach(lang => {
  const content = JSON.stringify(translations[lang]);
  const matches = (content.match(/NEEDS REVIEW/g) || []).length;
  markerCount += matches;
  if (matches > 0) {
    allGood = false;
    issues.push(`⚠️  ${lang}: ${matches} "[NEEDS REVIEW]" markers found`);
  }
});

// Check for empty values
languages.forEach(lang => {
  Object.keys(translations[lang]).forEach(key => {
    const value = translations[lang][key];
    if (value === '' || value === null || value === undefined) {
      allGood = false;
      issues.push(`❌ ${lang}: Empty value for key "${key}"`);
    }
  });
});

// Display results
if (allGood) {
  console.log('✅ ALL CHECKS PASSED!\n');
  console.log('Translation Status:');
  sections.forEach(section => {
    console.log(`  ${section}: ${maxCounts[section]} keys in all 9 languages`);
  });
  console.log('');
  console.log('  ✓ No missing keys');
  console.log('  ✓ No review markers');
  console.log('  ✓ No empty values');
  console.log('');
  console.log('🎉 Ready for production!');
  process.exit(0);
} else {
  console.log('❌ ISSUES FOUND:\n');
  issues.forEach(issue => console.log(issue));
  console.log('');
  console.log('🔧 Run fix scripts:');
  console.log('  1. node find-missing.cjs');
  console.log('  2. node smart-translate.cjs');
  console.log('  3. node fix-review-markers.cjs');
  console.log('');
  process.exit(1);
}
