/**
 * PWA Icon Generator Script - Dashboard Multiprestataire
 * Generates all required PWA icons from the base 512x512 icon
 *
 * Usage: node scripts/generate-pwa-icons.cjs
 *
 * Prerequisites: npm install sharp (if not already installed)
 */

const fs = require('fs');
const path = require('path');

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('⚠️  Sharp not installed. Install it with: npm install sharp --save-dev');
  console.log('   Then run this script again.');
  process.exit(0);
}

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const ICONS_DIR = path.join(PUBLIC_DIR, 'icons');
const SOURCE_ICON = path.join(ICONS_DIR, 'icon-512x512.png');

// Icons to generate
const ICONS_CONFIG = [
  // PWA standard icons
  { name: 'icon-48x48.png', size: 48, dest: ICONS_DIR },
  { name: 'icon-72x72.png', size: 72, dest: ICONS_DIR },
  { name: 'icon-96x96.png', size: 96, dest: ICONS_DIR },
  { name: 'icon-128x128.png', size: 128, dest: ICONS_DIR },
  { name: 'icon-144x144.png', size: 144, dest: ICONS_DIR },
  { name: 'icon-152x152.png', size: 152, dest: ICONS_DIR },
  { name: 'icon-192x192.png', size: 192, dest: ICONS_DIR },
  { name: 'icon-256x256.png', size: 256, dest: ICONS_DIR },
  { name: 'icon-384x384.png', size: 384, dest: ICONS_DIR },

  // Maskable icons (with safe zone padding)
  { name: 'icon-192x192-maskable.png', size: 192, dest: ICONS_DIR, maskable: true },
  { name: 'icon-512x512-maskable.png', size: 512, dest: ICONS_DIR, maskable: true },

  // Apple Touch Icons
  { name: 'apple-touch-icon.png', size: 180, dest: ICONS_DIR },
  { name: 'apple-touch-icon-180x180.png', size: 180, dest: ICONS_DIR },
  { name: 'apple-touch-icon-152x152.png', size: 152, dest: ICONS_DIR },
  { name: 'apple-touch-icon-120x120.png', size: 120, dest: ICONS_DIR },
  { name: 'apple-touch-icon-76x76.png', size: 76, dest: ICONS_DIR },

  // Favicons
  { name: 'favicon-32x32.png', size: 32, dest: ICONS_DIR },
  { name: 'favicon-16x16.png', size: 16, dest: ICONS_DIR },
];

async function generateIcons() {
  console.log('🎨 Generating PWA icons for Dashboard Multiprestataire...\n');

  if (!fs.existsSync(SOURCE_ICON)) {
    console.error('❌ Source icon not found:', SOURCE_ICON);
    console.log('   Please add icon-512x512.png to public/icons/');
    process.exit(1);
  }

  for (const config of ICONS_CONFIG) {
    const outputPath = path.join(config.dest, config.name);

    try {
      let pipeline = sharp(SOURCE_ICON);

      if (config.maskable) {
        // Add padding for maskable icons (10% safe zone)
        const padding = Math.round(config.size * 0.1);
        const innerSize = config.size - (padding * 2);

        pipeline = pipeline
          .resize(innerSize, innerSize, { fit: 'contain', background: { r: 124, g: 58, b: 237, alpha: 1 } })
          .extend({
            top: padding,
            bottom: padding,
            left: padding,
            right: padding,
            background: { r: 124, g: 58, b: 237, alpha: 1 } // Violet #7C3AED
          });
      } else {
        pipeline = pipeline.resize(config.size, config.size, { fit: 'contain' });
      }

      await pipeline.png().toFile(outputPath);
      console.log(`✅ Generated: ${config.name} (${config.size}x${config.size})`);
    } catch (error) {
      console.error(`❌ Failed: ${config.name}`, error.message);
    }
  }

  // Generate SVG favicon
  const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#7C3AED"/>
  <path d="M16 6 L26 24 H6 Z" fill="none" stroke="white" stroke-width="2"/>
  <text x="16" y="21" text-anchor="middle" fill="white" font-family="Arial" font-weight="bold" font-size="4">M</text>
</svg>`;

  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.svg'), faviconSvg);
  console.log('✅ Generated: favicon.svg');

  console.log('\n🎉 Icon generation complete!');
}

generateIcons().catch(console.error);
