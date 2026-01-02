import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { gunzipSync } from 'zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Update Service Worker cache version with build timestamp
function updateServiceWorkerVersion() {
  const swPath = path.join(PROJECT_ROOT, 'dist', 'sw.js');

  if (!fs.existsSync(swPath)) {
    console.log('⚠️  sw.js not found in dist/');
    return;
  }

  const buildTimestamp = Date.now().toString(36); // Short unique identifier
  let swContent = fs.readFileSync(swPath, 'utf-8');

  // Replace placeholder with actual build timestamp
  swContent = swContent.replace('__BUILD_TIMESTAMP__', `v${buildTimestamp}`);

  fs.writeFileSync(swPath, swContent);
  console.log(`✅ Updated sw.js cache version to v${buildTimestamp}`);
}

updateServiceWorkerVersion();

const sourceDir = path.join(PROJECT_ROOT, 'src', 'multilingual-system', 'sitemaps');
const distDir = path.join(PROJECT_ROOT, 'dist', 'sitemaps');

if (!fs.existsSync(sourceDir)) {
  console.log('⚠️  No sitemaps found in src/multilingual-system/sitemaps/');
  process.exit(0);
}

function copyRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);

      // Create uncompressed version for sitemap_index.xml
      if (entry.name === 'sitemap-index.xml.gz') {
        const uncompressedPath = path.join(dest, 'sitemap-index.xml');
        const gzippedContent = fs.readFileSync(srcPath);
        const uncompressedContent = gunzipSync(gzippedContent);
        fs.writeFileSync(uncompressedPath, uncompressedContent);
        console.log(`✅ Created uncompressed: ${uncompressedPath}`);
      }
    }
  }
}

copyRecursive(sourceDir, distDir);
console.log(`✅ Copied sitemaps from ${sourceDir} to ${distDir}`);
