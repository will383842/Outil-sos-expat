/**
 * PWA Icons Generator Script
 *
 * Generates all required PWA icons from a source SVG
 * Run with: node scripts/generate-pwa-icons.js
 *
 * Requirements: sharp (npm install sharp)
 */

const fs = require('fs');
const path = require('path');

// Try to use sharp if available, otherwise create placeholder SVGs
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('Sharp not installed. Creating SVG placeholders instead.');
  console.log('To generate PNG icons, run: npm install sharp && node scripts/generate-pwa-icons.js');
}

const ICONS_DIR = path.join(__dirname, '../public/icons');
const SOURCE_SVG = path.join(__dirname, '../public/sos-favicon.svg');

// Icon sizes configuration
const ICON_SIZES = [
  // Standard PWA icons
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 48, name: 'icon-48x48.png' },
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 256, name: 'icon-256x256.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' },

  // Apple touch icons
  { size: 76, name: 'apple-touch-icon-76x76.png' },
  { size: 120, name: 'apple-touch-icon-120x120.png' },
  { size: 152, name: 'apple-touch-icon-152x152.png' },
  { size: 180, name: 'apple-touch-icon-180x180.png' },
  { size: 180, name: 'apple-touch-icon.png' }, // Default

  // Maskable icons (with padding)
  { size: 192, name: 'icon-192x192-maskable.png', maskable: true },
  { size: 512, name: 'icon-512x512-maskable.png', maskable: true },
];

// SOS Expats brand colors
const BRAND_COLOR = '#DC2626';
const BACKGROUND_COLOR = '#FFFFFF';

// Generate SVG icon content
function generateSVGIcon(size, maskable = false) {
  const padding = maskable ? size * 0.1 : 0;
  const innerSize = size - (padding * 2);
  const center = size / 2;
  const radius = innerSize * 0.4;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  ${maskable ? `<rect width="${size}" height="${size}" fill="${BACKGROUND_COLOR}"/>` : ''}
  <circle cx="${center}" cy="${center}" r="${radius}" fill="${BRAND_COLOR}"/>
  <text x="${center}" y="${center + radius * 0.35}"
        text-anchor="middle"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="${innerSize * 0.4}"
        font-weight="bold"
        fill="white">SOS</text>
</svg>`;
}

async function generateIcons() {
  console.log('PWA Icons Generator');
  console.log('===================\n');

  // Ensure icons directory exists
  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
    console.log(`Created directory: ${ICONS_DIR}`);
  }

  if (sharp && fs.existsSync(SOURCE_SVG)) {
    // Generate PNG icons from source SVG using sharp
    console.log('Generating PNG icons from source SVG...\n');

    for (const { size, name, maskable } of ICON_SIZES) {
      try {
        const outputPath = path.join(ICONS_DIR, name);

        if (maskable) {
          // For maskable icons, add background padding
          const padding = Math.round(size * 0.1);
          await sharp(SOURCE_SVG)
            .resize(size - padding * 2, size - padding * 2)
            .extend({
              top: padding,
              bottom: padding,
              left: padding,
              right: padding,
              background: BACKGROUND_COLOR
            })
            .png()
            .toFile(outputPath);
        } else {
          await sharp(SOURCE_SVG)
            .resize(size, size)
            .png()
            .toFile(outputPath);
        }

        console.log(`  ✅ ${name} (${size}x${size})`);
      } catch (err) {
        console.error(`  ❌ ${name}: ${err.message}`);
      }
    }
  } else {
    // Create SVG placeholders
    console.log('Creating SVG icon placeholders...\n');
    console.log('Note: Install sharp for PNG generation: npm install sharp\n');

    for (const { size, name, maskable } of ICON_SIZES) {
      const svgName = name.replace('.png', '.svg');
      const outputPath = path.join(ICONS_DIR, svgName);
      const svgContent = generateSVGIcon(size, maskable);

      fs.writeFileSync(outputPath, svgContent);
      console.log(`  ✅ ${svgName} (${size}x${size})`);
    }

    // Also create a master SVG that can be used
    const masterSvg = generateSVGIcon(512, false);
    fs.writeFileSync(path.join(ICONS_DIR, 'icon.svg'), masterSvg);
    console.log('  ✅ icon.svg (master)');
  }

  // Generate browserconfig.xml for Windows tiles
  const browserConfig = `<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
  <msapplication>
    <tile>
      <square70x70logo src="/icons/icon-72x72.png"/>
      <square150x150logo src="/icons/icon-144x144.png"/>
      <square310x310logo src="/icons/icon-384x384.png"/>
      <TileColor>${BRAND_COLOR}</TileColor>
    </tile>
  </msapplication>
</browserconfig>`;

  fs.writeFileSync(path.join(__dirname, '../public/browserconfig.xml'), browserConfig);
  console.log('\n  ✅ browserconfig.xml');

  // Generate safari-pinned-tab.svg
  const safariPinnedTab = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="8" cy="8" r="7" fill="black"/>
  <text x="8" y="11" text-anchor="middle" font-family="system-ui" font-size="6" font-weight="bold" fill="white">SOS</text>
</svg>`;

  fs.writeFileSync(path.join(ICONS_DIR, 'safari-pinned-tab.svg'), safariPinnedTab);
  console.log('  ✅ safari-pinned-tab.svg');

  console.log('\n✅ Icon generation complete!');
  console.log(`\nIcons saved to: ${ICONS_DIR}`);
}

generateIcons().catch(console.error);
