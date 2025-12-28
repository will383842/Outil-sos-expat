#!/usr/bin/env node
// Patch protobufjs to remove postinstall script
const fs = require('fs');
const path = require('path');

const protobufjsPath = path.join(__dirname, 'node_modules', 'protobufjs', 'package.json');

if (fs.existsSync(protobufjsPath)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(protobufjsPath, 'utf8'));
    if (pkg.scripts && pkg.scripts.postinstall) {
      delete pkg.scripts.postinstall;
      fs.writeFileSync(protobufjsPath, JSON.stringify(pkg, null, 2));
      console.log('✓ Patched protobufjs: removed postinstall script');
    }
  } catch (error) {
    console.error('Error patching protobufjs:', error.message);
    process.exit(1);
  }
} else {
  console.log('⚠ protobufjs not found, skipping patch');
}
