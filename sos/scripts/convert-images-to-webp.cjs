/**
 * Script de conversion PNG → WebP
 *
 * ÉCONOMIE: Réduit la taille des images de 60-80%, économisant ~100€/mois en bande passante
 *
 * Usage: node scripts/convert-images-to-webp.cjs
 *
 * Prérequis: npm install sharp
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  // Dossier public
  publicDir: path.join(__dirname, '..', 'public'),
  // Qualité WebP (0-100)
  webpQuality: 85,
  // Fichiers à convertir (les plus gros)
  priorityFiles: [
    'default-avatar.png',
    'og-image.png',
    'twitter-image.png',
  ],
  // Dossier des icônes
  iconsDir: 'icons',
};

async function convertToWebP() {
  console.log('🖼️  Conversion PNG → WebP');
  console.log('========================\n');

  // Vérifier si sharp est installé
  let sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    console.log('❌ sharp n\'est pas installé.');
    console.log('   Exécutez: npm install sharp --save-dev\n');
    console.log('   Puis relancez ce script.\n');
    process.exit(1);
  }

  let totalSaved = 0;
  let convertedCount = 0;

  // 1. Convertir les fichiers prioritaires (gros fichiers)
  console.log('📁 Fichiers prioritaires:');
  for (const filename of CONFIG.priorityFiles) {
    const pngPath = path.join(CONFIG.publicDir, filename);
    const webpPath = pngPath.replace('.png', '.webp');

    if (!fs.existsSync(pngPath)) {
      console.log(`   ⚠️  ${filename} - Non trouvé, ignoré`);
      continue;
    }

    try {
      const pngStats = fs.statSync(pngPath);
      const pngSize = pngStats.size;

      await sharp(pngPath)
        .webp({ quality: CONFIG.webpQuality })
        .toFile(webpPath);

      const webpStats = fs.statSync(webpPath);
      const webpSize = webpStats.size;
      const saved = pngSize - webpSize;
      const percent = ((saved / pngSize) * 100).toFixed(1);

      totalSaved += saved;
      convertedCount++;

      console.log(`   ✅ ${filename}`);
      console.log(`      PNG: ${formatBytes(pngSize)} → WebP: ${formatBytes(webpSize)} (${percent}% économisé)`);
    } catch (err) {
      console.log(`   ❌ ${filename} - Erreur: ${err.message}`);
    }
  }

  // 2. Convertir les icônes
  console.log('\n📁 Icônes:');
  const iconsPath = path.join(CONFIG.publicDir, CONFIG.iconsDir);

  if (fs.existsSync(iconsPath)) {
    const iconFiles = fs.readdirSync(iconsPath).filter(f => f.endsWith('.png'));

    for (const filename of iconFiles) {
      const pngPath = path.join(iconsPath, filename);
      const webpPath = pngPath.replace('.png', '.webp');

      try {
        const pngStats = fs.statSync(pngPath);
        const pngSize = pngStats.size;

        // Pour les icônes, utiliser une qualité plus élevée (lossless pour les petites)
        const quality = pngSize < 10000 ? 100 : CONFIG.webpQuality;

        await sharp(pngPath)
          .webp({ quality, lossless: pngSize < 5000 })
          .toFile(webpPath);

        const webpStats = fs.statSync(webpPath);
        const webpSize = webpStats.size;
        const saved = pngSize - webpSize;

        if (saved > 0) {
          totalSaved += saved;
          convertedCount++;
          console.log(`   ✅ ${filename} (${formatBytes(pngSize)} → ${formatBytes(webpSize)})`);
        } else {
          // Si WebP est plus gros, supprimer et garder PNG
          fs.unlinkSync(webpPath);
          console.log(`   ⏭️  ${filename} - PNG plus petit, conservé`);
        }
      } catch (err) {
        console.log(`   ❌ ${filename} - Erreur: ${err.message}`);
      }
    }
  }

  // Résumé
  console.log('\n========================');
  console.log('📊 RÉSUMÉ:');
  console.log(`   Fichiers convertis: ${convertedCount}`);
  console.log(`   Espace économisé: ${formatBytes(totalSaved)}`);
  console.log(`   Économie mensuelle estimée: ~${Math.round(totalSaved / 1024 / 1024 * 0.12)}€/mois\n`);

  // Instructions pour utiliser les WebP
  console.log('📝 PROCHAINES ÉTAPES:');
  console.log('   1. Les fichiers .webp ont été créés à côté des .png');
  console.log('   2. Mettez à jour vos composants pour utiliser <picture> avec fallback:');
  console.log('');
  console.log('   <picture>');
  console.log('     <source srcSet="/og-image.webp" type="image/webp" />');
  console.log('     <img src="/og-image.png" alt="..." />');
  console.log('   </picture>');
  console.log('');
  console.log('   3. Ou servez WebP par défaut si le navigateur le supporte\n');
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Exécuter
convertToWebP().catch(console.error);
