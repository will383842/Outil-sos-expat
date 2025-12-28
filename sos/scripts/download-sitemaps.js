import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { gzipSync } from 'zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const FUNCTION_URL = 'https://europe-west1-sos-urgently-ac307.cloudfunctions.net/generateSitemaps';

async function downloadSitemaps() {
  console.log('📥 Downloading sitemaps from Firebase Function...');

  try {
    // Call the Firebase Function
    const response = await fetch(FUNCTION_URL);
    const data = await response.json();

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
    console.error('❌ Error downloading sitemaps:', error);
    process.exit(1);
  }
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
