/**
 * Postbuild script - runs after vite build
 * Skips react-snap on Cloudflare Pages (no Chrome available)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Copy index.html to 404.html for Cloudflare Pages SPA routing
// Cloudflare Pages serves 404.html for any route that doesn't match a file
const distDir = path.join(__dirname, '..', 'dist');
const indexPath = path.join(distDir, 'index.html');
const notFoundPath = path.join(distDir, '404.html');

if (fs.existsSync(indexPath)) {
  fs.copyFileSync(indexPath, notFoundPath);
  console.log('✅ Copied index.html to 404.html for SPA routing');
}

// Copy sitemaps
console.log('Copying sitemaps to dist...');
execSync('node scripts/copy-sitemaps-to-dist.js', { stdio: 'inherit' });

// Check if we're on Cloudflare Pages (CF_PAGES env var is set)
const isCloudflarePages = process.env.CF_PAGES === '1' || process.env.CF_PAGES === 'true';

if (isCloudflarePages) {
  console.log('Skipping react-snap on Cloudflare Pages (no Chrome available)');
} else {
  console.log('Running react-snap for pre-rendering...');
  try {
    execSync('react-snap', { stdio: 'inherit' });
  } catch (error) {
    console.warn('react-snap failed (this is OK on CI/Cloudflare):', error.message);
    // Don't fail the build if react-snap fails - SSR handles this
  }
}

console.log('Postbuild complete!');
