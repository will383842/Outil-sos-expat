// Copy _headers file from public to dist (needed for Cloudflare Pages)
const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, '..', 'public', '_headers');
const destFile = path.join(__dirname, '..', 'dist', '_headers');

try {
  // Check if source file exists
  if (!fs.existsSync(sourceFile)) {
    console.error('❌ Error: public/_headers not found');
    process.exit(1);
  }

  // Copy the file
  fs.copyFileSync(sourceFile, destFile);
  console.log('✅ Copied _headers to dist/');
} catch (error) {
  console.error('❌ Error copying _headers:', error.message);
  process.exit(1);
}
