// esbuild.config.js - Configuration pour bundler Firebase Functions
// Reduit la taille de deploiement de 445MB a ~10-20MB

const esbuild = require('esbuild');
const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';

// Modules qui ne peuvent pas etre bundles (binaires natifs ou problematiques)
const externalModules = [
  // Binaires natifs - DOIVENT rester externes
  '@sparticuz/chromium',
  'puppeteer-core',

  // Firebase - deja optimise, evite les problemes de bundling
  'firebase-admin',
  'firebase-functions',

  // Google APIs - trop volumineux pour bundler (115MB), garde en externe
  'googleapis',
  '@google-cloud/tasks',
  '@google-cloud/storage',
  '@google-cloud/firestore',

  // Modules avec binaires natifs ou problematiques
  'sharp',
  'canvas',

  // Node.js built-ins
  'path',
  'fs',
  'os',
  'crypto',
  'stream',
  'buffer',
  'util',
  'events',
  'http',
  'https',
  'url',
  'zlib',
  'net',
  'tls',
  'dns',
  'child_process',
  'cluster',
  'dgram',
  'readline',
  'repl',
  'tty',
  'v8',
  'vm',
  'worker_threads',
  'async_hooks',
  'perf_hooks',
  'trace_events',
  'inspector',
];

async function build() {
  try {
    const result = await esbuild.build({
      entryPoints: ['src/index.ts'],
      bundle: true,
      platform: 'node',
      target: 'node20',
      outfile: 'lib/index.js',
      format: 'cjs',

      // Externaliser les modules problematiques
      external: externalModules,

      // Optimisations
      minify: isProduction,
      sourcemap: true,
      treeShaking: true,

      // Gestion des conditions d'import
      conditions: ['node', 'import', 'require'],
      mainFields: ['main', 'module'],

      // Resolution des modules
      resolveExtensions: ['.ts', '.js', '.json'],

      // Plugins pour gerer les cas speciaux
      plugins: [
        {
          name: 'resolve-firebase-functions',
          setup(build) {
            // S'assurer que firebase-functions/v2 est bien resolu
            build.onResolve({ filter: /^firebase-functions/ }, args => {
              return { external: true };
            });
          },
        },
      ],

      // Definitions pour l'environnement
      define: {
        'process.env.NODE_ENV': isProduction ? '"production"' : '"development"',
      },

      // Banner pour compatibilite
      banner: {
        js: '/* Bundled with esbuild - SOS Expat Firebase Functions */',
      },

      // Metabuild info
      metafile: true,
      logLevel: 'info',
    });

    // Afficher les statistiques
    const text = await esbuild.analyzeMetafile(result.metafile, {
      verbose: false,
    });
    console.log('\n📦 Bundle Analysis:');
    console.log(text);

    // Calculer la taille totale
    const fs = require('fs');
    const stats = fs.statSync('lib/index.js');
    const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`\n✅ Bundle size: ${fileSizeInMB} MB`);
    console.log('✅ Build completed successfully!');

  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

// Mode watch pour le developpement
async function watch() {
  const ctx = await esbuild.context({
    entryPoints: ['src/index.ts'],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outfile: 'lib/index.js',
    format: 'cjs',
    external: externalModules,
    sourcemap: true,
    plugins: [
      {
        name: 'resolve-firebase-functions',
        setup(build) {
          build.onResolve({ filter: /^firebase-functions/ }, args => {
            return { external: true };
          });
        },
      },
    ],
    logLevel: 'info',
  });

  await ctx.watch();
  console.log('👀 Watching for changes...');
}

// CLI
const args = process.argv.slice(2);
if (args.includes('--watch')) {
  watch();
} else {
  build();
}
