/**
 * PWA Icon Generator Script - Outil SOS Expat Pro
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

// OG Image SVG template (1200x630)
const OG_IMAGE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#DC2626"/>
      <stop offset="100%" style="stop-color:#991B1B"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="600" cy="250" r="80" fill="rgba(255,255,255,0.15)"/>
  <path d="M600 190 C555 190 520 225 520 270 C520 315 555 350 600 350 C645 350 680 315 680 270 C680 225 645 190 600 190 M590 330 C555 325 530 300 530 270 C530 262 532 255 535 248 L570 280 L570 290 C570 300 578 308 588 308 L590 330 M635 325 C632 320 625 315 618 315 L608 315 L608 295 C608 290 604 286 599 286 L564 286 L564 268 L582 268 C587 268 591 264 591 259 L591 241 L609 241 C619 241 627 233 627 223 L627 220 C648 230 662 249 662 270 C662 295 652 315 635 325" fill="white"/>
  <text x="600" y="430" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="56" font-weight="700" fill="white">SOS Expats Pro</text>
  <text x="600" y="490" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="28" fill="rgba(255,255,255,0.9)">Espace Prestataires - Assistant IA</text>
  <text x="600" y="580" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="20" fill="rgba(255,255,255,0.7)">app.sosexpats.com</text>
</svg>`;

// Twitter Image SVG template (1200x675 for summary_large_image)
const TWITTER_IMAGE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
  <defs>
    <linearGradient id="bg2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#DC2626"/>
      <stop offset="100%" style="stop-color:#991B1B"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="675" fill="url(#bg2)"/>
  <circle cx="600" cy="270" r="80" fill="rgba(255,255,255,0.15)"/>
  <path d="M600 210 C555 210 520 245 520 290 C520 335 555 370 600 370 C645 370 680 335 680 290 C680 245 645 210 600 210 M590 350 C555 345 530 320 530 290 C530 282 532 275 535 268 L570 300 L570 310 C570 320 578 328 588 328 L590 350 M635 345 C632 340 625 335 618 335 L608 335 L608 315 C608 310 604 306 599 306 L564 306 L564 288 L582 288 C587 288 591 284 591 279 L591 261 L609 261 C619 261 627 253 627 243 L627 240 C648 250 662 269 662 290 C662 315 652 335 635 345" fill="white"/>
  <text x="600" y="460" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="56" font-weight="700" fill="white">SOS Expats Pro</text>
  <text x="600" y="520" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="28" fill="rgba(255,255,255,0.9)">Espace Prestataires - Assistant IA</text>
  <text x="600" y="620" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="20" fill="rgba(255,255,255,0.7)">app.sosexpats.com</text>
</svg>`;

async function generateIcons() {
  console.log('🎨 Generating PWA icons for Outil SOS Expat Pro...\n');

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
          .resize(innerSize, innerSize, { fit: 'contain', background: { r: 239, g: 68, b: 68, alpha: 1 } })
          .extend({
            top: padding,
            bottom: padding,
            left: padding,
            right: padding,
            background: { r: 239, g: 68, b: 68, alpha: 1 } // Red #EF4444
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
  <rect width="32" height="32" rx="6" fill="#DC2626"/>
  <path d="M16 8 C12 8 9 11 9 15 C9 19 12 22 16 22 C20 22 23 19 23 15 C23 11 20 8 16 8 M15 20 C12 19.5 10 17 10 15 C10 14 10.2 13 10.6 12 L14 16 L14 17 C14 18 15 19 16 19 L15 20 M19 19 C18.5 18 18 17.5 17 17.5 L16 17.5 L16 15.5 C16 15 15.5 14.5 15 14.5 L12 14.5 L12 13 L13.5 13 C14 13 14.5 12.5 14.5 12 L14.5 10.5 L16 10.5 C17 10.5 18 9.5 18 8.5 L18 8.3 C20 9 21.5 11 21.5 15 C21.5 17 20.5 18.5 19 19" fill="white"/>
</svg>`;

  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.svg'), faviconSvg);
  console.log('✅ Generated: favicon.svg');

  // Generate favicon.ico (using 32x32 PNG as ICO)
  // Note: This creates a PNG that browsers will accept as favicon
  try {
    await sharp(SOURCE_ICON)
      .resize(32, 32)
      .png()
      .toFile(path.join(PUBLIC_DIR, 'favicon.ico'));
    console.log('✅ Generated: favicon.ico (32x32)');
  } catch (error) {
    console.error('❌ Failed: favicon.ico', error.message);
  }

  // Generate OG Image (1200x630)
  try {
    await sharp(Buffer.from(OG_IMAGE_SVG))
      .png()
      .toFile(path.join(ICONS_DIR, 'og-image.png'));
    console.log('✅ Generated: og-image.png (1200x630)');
  } catch (error) {
    console.error('❌ Failed: og-image.png', error.message);
  }

  // Generate Twitter Image (1200x675)
  try {
    await sharp(Buffer.from(TWITTER_IMAGE_SVG))
      .png()
      .toFile(path.join(ICONS_DIR, 'twitter-image.png'));
    console.log('✅ Generated: twitter-image.png (1200x675)');
  } catch (error) {
    console.error('❌ Failed: twitter-image.png', error.message);
  }

  console.log('\n🎉 Icon generation complete!');
}

generateIcons().catch(console.error);
