// Script temporaire pour vérifier les slugs invalides
const admin = require('firebase-admin');

// Pattern pour détecter les locales invalides
const VALID_LOCALES = [
  'fr-fr', 'en-us', 'es-es', 'de-de', 'ru-ru', 'pt-pt', 'zh-cn', 'ar-sa', 'hi-in'
];

async function checkInvalidSlugs() {
  try {
    admin.initializeApp();
    const db = admin.firestore();
    
    const snapshot = await db.collection('sos_profiles')
      .where('isVisible', '==', true)
      .limit(100)
      .get();
    
    console.log(`Vérification de ${snapshot.docs.length} profils...`);
    
    let invalidCount = 0;
    const issues = [];
    
    snapshot.docs.forEach(doc => {
      const profile = doc.data();
      const slugs = profile.slugs;
      
      if (slugs && typeof slugs === 'object') {
        Object.entries(slugs).forEach(([lang, slug]) => {
          // Vérifier si le slug commence par une locale invalide
          const slugStr = String(slug);
          const localeMatch = slugStr.match(/^([a-z]{2}-[A-Z]{2}|[a-z]{2}-[a-z]{2})\//);
          
          if (localeMatch) {
            const locale = localeMatch[1];
            if (!VALID_LOCALES.includes(locale.toLowerCase())) {
              invalidCount++;
              issues.push({
                profileId: doc.id,
                lang,
                slug: slugStr,
                invalidLocale: locale
              });
            }
          }
          
          // Vérifier les doubles locales
          if (slugStr.match(/^[a-z]{2}-[a-z]{2}\/[a-z]{2}\//)) {
            invalidCount++;
            issues.push({
              profileId: doc.id,
              lang,
              slug: slugStr,
              issue: 'DOUBLE_LOCALE'
            });
          }
        });
      }
    });
    
    console.log(`\n❌ Trouvé ${invalidCount} slugs invalides sur ${snapshot.docs.length} profils`);
    console.log('\nExemples:');
    issues.slice(0, 10).forEach(issue => {
      console.log(`- Profile ${issue.profileId} (${issue.lang}): ${issue.slug}`);
      if (issue.invalidLocale) console.log(`  → Locale invalide: ${issue.invalidLocale}`);
      if (issue.issue) console.log(`  → Problème: ${issue.issue}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Erreur:', error);
    process.exit(1);
  }
}

checkInvalidSlugs();
