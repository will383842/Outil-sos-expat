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

  // Get source image metadata
  const metadata = await sharp(SOURCE_ICON).metadata();
  const srcSize = Math.max(metadata.width || 512, metadata.height || 512);

  for (const config of ICONS_CONFIG) {
    const outputPath = path.join(config.dest, config.name);

    try {
      // 1. Create a solid red canvas at the target size
      const redCanvas = sharp({
        create: {
          width: config.size,
          height: config.size,
          channels: 3,
          background: { r: 248, g: 24, b: 40 },
        },
      }).png();

      // 2. Prepare the source: trim the edges to remove rounded corners,
      //    then resize and composite centered on the red canvas
      const logoSize = Math.round(config.size * 0.88); // 88% to leave safe margin
      const logoBuffer = await sharp(SOURCE_ICON)
        .flatten({ background: { r: 248, g: 24, b: 40 } })
        .trim({ threshold: 30 }) // Remove near-red border pixels
        .resize(logoSize, logoSize, { fit: 'contain', background: { r: 248, g: 24, b: 40 } })
        .png()
        .toBuffer();

      const offset = Math.round((config.size - logoSize) / 2);

      await redCanvas
        .composite([{ input: logoBuffer, top: offset, left: offset }])
        .png()
        .toFile(outputPath);

      console.log(`✅ Generated: ${config.name} (${config.size}x${config.size})`);
    } catch (error) {
      console.error(`❌ Failed: ${config.name}`, error.message);
    }
  }

  // Generate SVG favicon
  const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#DC2626"/>
  <path d="M16 6 L26 24 H6 Z" fill="none" stroke="white" stroke-width="2"/>
  <text x="16" y="21" text-anchor="middle" fill="white" font-family="Arial" font-weight="bold" font-size="4">M</text>
</svg>`;

  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.svg'), faviconSvg);
  console.log('✅ Generated: favicon.svg');

  console.log('\n🎉 Icon generation complete!');
}

generateIcons().catch(console.error);
