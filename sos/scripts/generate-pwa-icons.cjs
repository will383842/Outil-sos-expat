/**
 * PWA Icon Generator Script
 * Generates all required PWA icons from the base 512x512 icon
 *
 * Usage: node scripts/generate-pwa-icons.cjs
 *
 * Prerequisites: npm install sharp (if not already installed)
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('⚠️  Sharp not installed. Install it with: npm install sharp --save-dev');
  console.log('   Then run this script again.');
  console.log('\n📋 Manual alternative: Use an online tool like https://realfavicongenerator.net');
  console.log('   Upload your 512x512 icon and download all sizes.\n');
  process.exit(0);
}

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const ICONS_DIR = path.join(PUBLIC_DIR, 'icons');
const SOURCE_ICON = path.join(ICONS_DIR, 'icon-512x512.png');

// Icons to generate
const ICONS_CONFIG = [
  // Apple Touch Icons
  { name: 'apple-touch-icon.png', size: 180, dest: PUBLIC_DIR },
  { name: 'apple-touch-icon-180x180.png', size: 180, dest: PUBLIC_DIR },
  { name: 'apple-touch-icon-152x152.png', size: 152, dest: PUBLIC_DIR },
  { name: 'apple-touch-icon-120x120.png', size: 120, dest: PUBLIC_DIR },

  // Favicons (PNG)
  { name: 'favicon-32x32.png', size: 32, dest: PUBLIC_DIR },
  { name: 'favicon-16x16.png', size: 16, dest: PUBLIC_DIR },

  // Shortcut icons
  { name: 'shortcut-urgence.png', size: 96, dest: ICONS_DIR },
  { name: 'shortcut-consultation.png', size: 96, dest: ICONS_DIR },
  { name: 'shortcut-documents.png', size: 96, dest: ICONS_DIR },

  // Badge icon (for notifications)
  { name: 'icon-72x72.png', size: 72, dest: ICONS_DIR, skipIfExists: true },

  // Missing standard sizes
  { name: 'icon-128x128.png', size: 128, dest: ICONS_DIR },
];

// SVG Favicon template (red SOS theme)
const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#dc2626"/>
  <path d="M16 6 L26 24 H6 Z" fill="none" stroke="white" stroke-width="2"/>
  <text x="16" y="21" text-anchor="middle" fill="white" font-family="Arial" font-weight="bold" font-size="4">!</text>
</svg>`;

const FAVICON_DARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#b91c1c"/>
  <path d="M16 6 L26 24 H6 Z" fill="none" stroke="white" stroke-width="2"/>
  <text x="16" y="21" text-anchor="middle" fill="white" font-family="Arial" font-weight="bold" font-size="4">!</text>
</svg>`;

async function generateIcons() {
  console.log('🎨 Generating PWA icons...\n');

  // Check source icon exists
  if (!fs.existsSync(SOURCE_ICON)) {
    console.error('❌ Source icon not found:', SOURCE_ICON);
    process.exit(1);
  }

  // Generate PNG icons
  for (const config of ICONS_CONFIG) {
    const outputPath = path.join(config.dest, config.name);

    if (config.skipIfExists && fs.existsSync(outputPath)) {
      console.log(`⏭️  Skipping (exists): ${config.name}`);
      continue;
    }

    try {
      await sharp(SOURCE_ICON)
        .resize(config.size, config.size, {
          fit: 'contain',
          background: { r: 220, g: 38, b: 38, alpha: 1 } // Red background
        })
        .png()
        .toFile(outputPath);

      console.log(`✅ Generated: ${config.name} (${config.size}x${config.size})`);
    } catch (error) {
      console.error(`❌ Failed: ${config.name}`, error.message);
    }
  }

  // Generate SVG favicons
  const faviconSvgPath = path.join(PUBLIC_DIR, 'favicon.svg');
  const faviconDarkSvgPath = path.join(PUBLIC_DIR, 'favicon-dark.svg');

  fs.writeFileSync(faviconSvgPath, FAVICON_SVG);
  console.log('✅ Generated: favicon.svg');

  fs.writeFileSync(faviconDarkSvgPath, FAVICON_DARK_SVG);
  console.log('✅ Generated: favicon-dark.svg');

  console.log('\n🎉 Icon generation complete!');
  console.log('\n📋 Next steps:');
  console.log('   1. Review generated icons in public/ and public/icons/');
  console.log('   2. Generate screenshots manually (390x844 mobile, 1280x720 desktop)');
  console.log('   3. Run: npm run build');
}

// Create screenshots directory if needed
const SCREENSHOTS_DIR = path.join(PUBLIC_DIR, 'screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  console.log('📁 Created screenshots directory');
}

generateIcons().catch(console.error);
