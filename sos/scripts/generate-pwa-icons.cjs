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

// Screenshot SVG templates for PWA install prompt
// Narrow format (mobile) - 540x720
const SCREENSHOT_NARROW_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="540" height="720" viewBox="0 0 540 720">
  <defs>
    <linearGradient id="bgNarrow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#DC2626"/>
      <stop offset="100%" style="stop-color:#991B1B"/>
    </linearGradient>
  </defs>
  <rect width="540" height="720" fill="url(#bgNarrow)"/>
  <!-- Status bar simulation -->
  <rect width="540" height="44" fill="rgba(0,0,0,0.2)"/>
  <!-- App content area -->
  <rect x="20" y="64" width="500" height="636" rx="16" fill="white"/>
  <!-- Logo circle -->
  <circle cx="270" cy="180" r="50" fill="#DC2626"/>
  <path d="M270 150 C245 150 225 170 225 195 C225 220 245 240 270 240 C295 240 315 220 315 195 C315 170 295 150 270 150 M260 225 C235 222 215 205 215 185 C215 180 217 175 220 170 L245 195 L245 205 C245 212 252 218 260 218 L260 225 M295 222 C290 217 285 214 280 214 L273 214 L273 200 C273 196 270 193 267 193 L245 193 L245 180 L257 180 C260 180 263 177 263 174 L263 165 L275 165 C282 165 288 159 288 152 L288 150 C302 158 312 172 312 190 C312 207 305 218 295 222" fill="white"/>
  <!-- Title -->
  <text x="270" y="290" text-anchor="middle" font-family="system-ui, sans-serif" font-size="28" font-weight="700" fill="#1F2937">SOS Expat</text>
  <text x="270" y="325" text-anchor="middle" font-family="system-ui, sans-serif" font-size="16" fill="#6B7280">Assistance Expatriés 24/7</text>
  <!-- Feature cards -->
  <rect x="40" y="360" width="460" height="80" rx="12" fill="#FEF2F2"/>
  <text x="60" y="405" font-family="system-ui, sans-serif" font-size="16" font-weight="600" fill="#DC2626">🚨 Urgence Juridique</text>
  <text x="60" y="425" font-family="system-ui, sans-serif" font-size="13" fill="#6B7280">Assistance immédiate 24h/24</text>
  <rect x="40" y="455" width="460" height="80" rx="12" fill="#FEF2F2"/>
  <text x="60" y="500" font-family="system-ui, sans-serif" font-size="16" font-weight="600" fill="#DC2626">👨‍⚖️ Consultation Expert</text>
  <text x="60" y="520" font-family="system-ui, sans-serif" font-size="13" fill="#6B7280">Avocats spécialisés expatriation</text>
  <rect x="40" y="550" width="460" height="80" rx="12" fill="#FEF2F2"/>
  <text x="60" y="595" font-family="system-ui, sans-serif" font-size="16" font-weight="600" fill="#DC2626">🌍 197 Pays Couverts</text>
  <text x="60" y="615" font-family="system-ui, sans-serif" font-size="13" fill="#6B7280">Réseau international d'experts</text>
  <!-- Bottom nav simulation -->
  <rect x="20" y="650" width="500" height="50" rx="0 0 16 16" fill="#F9FAFB"/>
</svg>`;

// Wide format (desktop) - 720x540
const SCREENSHOT_WIDE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="540" viewBox="0 0 720 540">
  <defs>
    <linearGradient id="bgWide" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#DC2626"/>
      <stop offset="100%" style="stop-color:#991B1B"/>
    </linearGradient>
  </defs>
  <rect width="720" height="540" fill="url(#bgWide)"/>
  <!-- Browser chrome simulation -->
  <rect width="720" height="40" fill="#F3F4F6"/>
  <circle cx="20" cy="20" r="6" fill="#EF4444"/>
  <circle cx="40" cy="20" r="6" fill="#F59E0B"/>
  <circle cx="60" cy="20" r="6" fill="#10B981"/>
  <rect x="100" y="12" width="520" height="16" rx="4" fill="white"/>
  <!-- Main content -->
  <rect x="20" y="60" width="680" height="460" rx="8" fill="white"/>
  <!-- Sidebar -->
  <rect x="20" y="60" width="180" height="460" fill="#F9FAFB"/>
  <!-- Logo in sidebar -->
  <circle cx="110" cy="120" r="35" fill="#DC2626"/>
  <text x="110" y="180" text-anchor="middle" font-family="system-ui, sans-serif" font-size="16" font-weight="700" fill="#1F2937">SOS Expat</text>
  <!-- Nav items -->
  <rect x="30" y="210" width="160" height="36" rx="6" fill="#FEE2E2"/>
  <text x="50" y="234" font-family="system-ui, sans-serif" font-size="13" fill="#DC2626">🏠 Accueil</text>
  <text x="50" y="274" font-family="system-ui, sans-serif" font-size="13" fill="#6B7280">🚨 Urgence</text>
  <text x="50" y="314" font-family="system-ui, sans-serif" font-size="13" fill="#6B7280">👨‍⚖️ Consultation</text>
  <text x="50" y="354" font-family="system-ui, sans-serif" font-size="13" fill="#6B7280">📄 Documents</text>
  <!-- Main content area -->
  <text x="220" y="100" font-family="system-ui, sans-serif" font-size="24" font-weight="700" fill="#1F2937">Bienvenue sur SOS Expat</text>
  <text x="220" y="130" font-family="system-ui, sans-serif" font-size="14" fill="#6B7280">Assistance juridique pour expatriés dans 197 pays</text>
  <!-- Stats cards -->
  <rect x="220" y="160" width="150" height="90" rx="8" fill="#FEF2F2"/>
  <text x="295" y="200" text-anchor="middle" font-family="system-ui, sans-serif" font-size="28" font-weight="700" fill="#DC2626">24/7</text>
  <text x="295" y="225" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="#6B7280">Disponibilité</text>
  <rect x="385" y="160" width="150" height="90" rx="8" fill="#FEF2F2"/>
  <text x="460" y="200" text-anchor="middle" font-family="system-ui, sans-serif" font-size="28" font-weight="700" fill="#DC2626">197</text>
  <text x="460" y="225" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="#6B7280">Pays couverts</text>
  <rect x="550" y="160" width="130" height="90" rx="8" fill="#FEF2F2"/>
  <text x="615" y="200" text-anchor="middle" font-family="system-ui, sans-serif" font-size="28" font-weight="700" fill="#DC2626">500+</text>
  <text x="615" y="225" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="#6B7280">Experts</text>
  <!-- CTA Button -->
  <rect x="220" y="280" width="200" height="44" rx="8" fill="#DC2626"/>
  <text x="320" y="308" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" font-weight="600" fill="white">Demander une assistance</text>
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

  // Generate screenshots for PWA install prompt
  console.log('\n📸 Generating PWA screenshots...');

  try {
    // Narrow screenshot (mobile) - 540x720
    await sharp(Buffer.from(SCREENSHOT_NARROW_SVG))
      .png()
      .toFile(path.join(SCREENSHOTS_DIR, 'screenshot-narrow.png'));
    console.log('✅ Generated: screenshots/screenshot-narrow.png (540x720)');

    // Wide screenshot (desktop) - 720x540
    await sharp(Buffer.from(SCREENSHOT_WIDE_SVG))
      .png()
      .toFile(path.join(SCREENSHOTS_DIR, 'screenshot-wide.png'));
    console.log('✅ Generated: screenshots/screenshot-wide.png (720x540)');

  } catch (error) {
    console.error('❌ Failed to generate screenshots:', error.message);
  }

  console.log('\n🎉 Icon generation complete!');
  console.log('\n📋 Next steps:');
  console.log('   1. Review generated icons in public/ and public/icons/');
  console.log('   2. Review screenshots in public/screenshots/');
  console.log('   3. Run: npm run build');
}

// Create screenshots directory if needed
const SCREENSHOTS_DIR = path.join(PUBLIC_DIR, 'screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  console.log('📁 Created screenshots directory');
}

generateIcons().catch(console.error);
