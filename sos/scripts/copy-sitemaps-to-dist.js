import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { gunzipSync } from 'zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

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
