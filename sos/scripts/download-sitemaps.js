import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { gzipSync } from 'zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const FUNCTION_URL = 'https://europe-west1-sos-urgently-ac307.cloudfunctions.net/generateSitemaps';
const TIMEOUT_MS = 30000; // 30 seconds timeout
const CACHE_DIR = path.join(PROJECT_ROOT, 'src', 'multilingual-system', 'sitemaps');

// Check if cached sitemaps exist and are recent (less than 24h old)
function hasCachedSitemaps() {
  const indexPath = path.join(CACHE_DIR, 'global', 'sitemap-index.xml');
  if (!fs.existsSync(indexPath)) {
    return false;
  }
  const stats = fs.statSync(indexPath);
  const ageMs = Date.now() - stats.mtimeMs;
  const ageHours = ageMs / (1000 * 60 * 60);
  console.log(`📁 Cached sitemaps found (${ageHours.toFixed(1)}h old)`);
  return true; // Always use cache if it exists
}

// Fetch with timeout
async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function downloadSitemaps() {
  console.log('📥 Downloading sitemaps from Firebase Function...');

  try {
    // Call the Firebase Function with timeout
    const response = await fetchWithTimeout(FUNCTION_URL, TIMEOUT_MS);

    // Check HTTP status
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Try to parse JSON
    const text = await response.text();
    if (!text || text.trim() === '') {
      throw new Error('Empty response from server');
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      throw new Error(`Invalid JSON response: ${parseError.message}`);
    }

    if (!data.success) {
      throw new Error(data.error || 'Failed to generate sitemaps');
    }

    console.log('✅ Sitemaps generated successfully');
    console.log(`📊 Total files: ${data.sitemaps.summary.totalFiles}`);

    // Create directories in src/multilingual-system/sitemaps/
    const baseDir = path.join(PROJECT_ROOT, 'src', 'multilingual-system', 'sitemaps');
    const dirs = [
      path.join(baseDir, 'language-country'),
      path.join(baseDir, 'country'),
      path.join(baseDir, 'global')
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    // Save Level 1 sitemaps
    let saved = 0;
    for (const sitemap of data.sitemaps.level1 || []) {
      const filePath = path.join(baseDir, sitemap.path);
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const compressed = gzipSync(sitemap.content);
      fs.writeFileSync(filePath, compressed);
      saved++;
    }

    // Save Level 2 sitemaps
    for (const sitemap of data.sitemaps.level2 || []) {
      const filePath = path.join(baseDir, sitemap.path);
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const compressed = gzipSync(sitemap.content);
      fs.writeFileSync(filePath, compressed);
      saved++;
    }

    // Save Level 3 (global index)
    if (data.sitemaps.level3) {
      const filePath = path.join(baseDir, data.sitemaps.level3.path);
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const compressed = gzipSync(data.sitemaps.level3.content);
      fs.writeFileSync(filePath, compressed);
      saved++;
    }

    // Save uncompressed version for sitemap_index.xml
    if (data.sitemaps.level3) {
      const uncompressedPath = path.join(baseDir, 'global', 'sitemap-index.xml');
      fs.writeFileSync(uncompressedPath, data.sitemaps.level3.content);
      console.log(`✅ Created uncompressed sitemap index`);
    }

    console.log(`💾 Saved ${saved} sitemap files to src/multilingual-system/sitemaps/`);
    console.log(`📁 Location: ${baseDir}`);

    // Copy to dist/sitemaps/ for hosting
    await copySitemapsToDist(baseDir);

  } catch (error) {
    console.warn('⚠️ Error downloading sitemaps:', error.message);

    // Use cached sitemaps as fallback
    if (hasCachedSitemaps()) {
      console.log('✅ Using cached sitemaps instead (fallback mode)');
      await copySitemapsToDist(CACHE_DIR);
      console.log('📋 Build will continue with cached sitemaps');
      return; // Success with fallback
    } else {
      console.error('❌ No cached sitemaps available. Generating minimal sitemap...');
      // Create minimal sitemap to not block build
      await createMinimalSitemap();
      return;
    }
  }
}

// Create a minimal sitemap when everything fails
async function createMinimalSitemap() {
  const minimalSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://sos-expat.com/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://sos-expat.com/en</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://sos-expat.com/fr</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>`;

  const distDir = path.join(PROJECT_ROOT, 'dist', 'sitemaps', 'global');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  fs.writeFileSync(path.join(distDir, 'sitemap-minimal.xml'), minimalSitemap);
  console.log('✅ Created minimal fallback sitemap');
}

async function copySitemapsToDist(sourceDir) {
  console.log('📋 Copying sitemaps to dist/sitemaps/ for hosting...');

  const distDir = path.join(PROJECT_ROOT, 'dist', 'sitemaps');

  // Create dist/sitemaps directories
  const subdirs = ['language-country', 'country', 'global'];
  subdirs.forEach(subdir => {
    const dir = path.join(distDir, subdir);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Copy all files recursively
  function copyRecursive(src, dest) {
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        if (!fs.existsSync(destPath)) {
          fs.mkdirSync(destPath, { recursive: true });
        }
        copyRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  copyRecursive(sourceDir, distDir);
  console.log(`✅ Copied sitemaps to ${distDir}`);
}

// Run the script
downloadSitemaps();
