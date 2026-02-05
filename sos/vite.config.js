import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import { visualizer } from 'rollup-plugin-visualizer'
import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'path'
import fs from 'fs'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const USE_EMULATORS = String(env.VITE_USE_EMULATORS).toLowerCase() === 'true'
  const PROJECT_ID = env.VITE_FIREBASE_PROJECT_ID || 'sos-urgently-ac307'
  const REGION = env.VITE_FUNCTIONS_REGION || 'europe-west1'
  const isAnalyze = mode === 'analyze'

  const target = USE_EMULATORS
    ? `http://127.0.0.1:5001/${PROJECT_ID}/${REGION}`
    : `https://${REGION}-${PROJECT_ID}.cloudfunctions.net`

  return {
    plugins: [
      react(),
      wasm(),
      // Bundle analyzer - activé avec: npm run analyze
      isAnalyze && visualizer({
        open: true,
        filename: 'dist/bundle-stats.html',
        gzipSize: true,
        brotliSize: true,
        template: 'treemap', // ou 'sunburst', 'network'
      }),
      // Plugin pour injecter BUILD_TIMESTAMP dans le Service Worker
      {
        name: 'inject-sw-timestamp',
        closeBundle() {
          const swPath = resolve(__dirname, 'dist', 'sw.js')
          const fmswPath = resolve(__dirname, 'dist', 'firebase-messaging-sw.js')
          const timestamp = Date.now().toString()

          // Inject timestamp in sw.js
          if (fs.existsSync(swPath)) {
            let content = fs.readFileSync(swPath, 'utf-8')
            content = content.replace(/'__BUILD_TIMESTAMP__'/g, `'${timestamp}'`)
            fs.writeFileSync(swPath, content)
            console.log(`✅ Injected BUILD_TIMESTAMP (${timestamp}) into sw.js`)
          }

          // Also inject in firebase-messaging-sw.js if it exists
          if (fs.existsSync(fmswPath)) {
            let content = fs.readFileSync(fmswPath, 'utf-8')
            content = content.replace(/'__BUILD_TIMESTAMP__'/g, `'${timestamp}'`)
            fs.writeFileSync(fmswPath, content)
            console.log(`✅ Injected BUILD_TIMESTAMP (${timestamp}) into firebase-messaging-sw.js`)
          }
        }
      },
      // Custom plugin to handle SPA routing in dev server
      {
        name: 'spa-fallback',
        configureServer(server) {
          return () => {
            server.middlewares.use((req, res, next) => {
              // Skip if it's a file request (has extension) or API request
              if (!req.url) {
                return next();
              }

              // Skip static assets, API calls, and files with extensions
              if (
                req.url.startsWith('/api') ||
                req.url.startsWith('/src') ||
                req.url.startsWith('/node_modules') ||
                /\.\w+$/.test(req.url) ||
                req.url.includes('.')
              ) {
                return next();
              }

              // For all other routes (SPA routes), serve index.html
              req.url = '/index.html';
              next();
            });
          };
        },
      },
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
      // Ensure React is resolved correctly
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-helmet-async',
      ],
      exclude: [
        'firebase',
        'firebase/app',
        'firebase/auth',
        'firebase/firestore',
        'firebase/functions',
        'firebase/storage',
        'firebase/analytics',
      ],
      esbuildOptions: {
        target: 'esnext',
        jsx: 'automatic',
      },
    },
    build: {
      // ES2019 pour compatibilité avec react-snap (Puppeteer/Chromium ancien)
      // Évite les erreurs "Unexpected token '.' " avec optional chaining (?.)
      target: 'es2019',
      // Minification avec terser pour réduire la taille du bundle
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,   // Production: supprime tous les console.log
          drop_debugger: true,  // Supprime debugger
          passes: 2,           // 2 passes pour meilleure compression
        },
        mangle: true,
        format: {
          comments: false,     // Supprime les commentaires
        },
      },
      // Génère les sourcemaps uniquement si nécessaire
      sourcemap: false,
      commonjsOptions: {
        include: [/node_modules/],
        transformMixedEsModules: true,
      },
      rollupOptions: {
        output: {
          // Code splitting sécurisé - évite la duplication de React
          manualChunks: (id) => {
            // React et ses dépendances DOIVENT rester ensemble
            // @emotion doit aussi être avec React car recharts et autres en dépendent
            // Evite les dépendances circulaires entre chunks
            if (id.includes('node_modules/react') ||
                id.includes('node_modules/react-dom') ||
                id.includes('node_modules/scheduler') ||
                id.includes('node_modules/react-router') ||
                id.includes('node_modules/react-intl') ||
                id.includes('recharts') ||
                id.includes('@formatjs') ||
                id.includes('@emotion')) {
              return 'vendor-react';
            }

            // Firebase - gros module, rarement changé
            if (id.includes('node_modules/firebase') ||
                id.includes('node_modules/@firebase')) {
              return 'vendor-firebase';
            }

            // Maps/Leaflet - chargé uniquement sur pages avec cartes
            if (id.includes('leaflet') || id.includes('react-leaflet')) {
              return 'vendor-maps';
            }

            // Stripe - chargé uniquement pour paiements
            if (id.includes('@stripe') || id.includes('stripe')) {
              return 'vendor-stripe';
            }

            // MUI - Material UI (admin seulement)
            if (id.includes('@mui')) {
              return 'vendor-mui';
            }

            // PDF generation - chargé uniquement quand nécessaire
            if (id.includes('jspdf') || id.includes('html2canvas')) {
              return 'vendor-pdf';
            }

            // Phone number parsing - assez gros
            if (id.includes('libphonenumber') || id.includes('google-libphonenumber')) {
              return 'vendor-phone';
            }

            // D3 utilities for charts (recharts dependencies, no React needed)
            if (id.includes('d3-')) {
              return 'vendor-d3';
            }

            // Autres librairies UI (lucide, etc)
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }

            // Date utilities
            if (id.includes('date-fns')) {
              return 'vendor-date';
            }
          },
        },
      },
    },
    server: {
      port: 5174, // SOS sur 5174, Outil sur 5173
      strictPort: true, // Fail if port is already in use
      // allowedHosts: 'https://unbluffing-unraptured-lynna.ngrok-free.app/',
      allowedHosts: [
        'unbluffing-unraptured-lynna.ngrok-free.app',
        '.ngrok-free.app',  // Wildcard for all ngrok-free.app subdomains
        '.ngrok.io',        // Wildcard for all ngrok.io subdomains
      ],
      cors: {
        origin: true,
        credentials: true,
      },
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
        }
      },
      // Configure middleware to serve index.html for all routes (SPA routing)
      middlewareMode: false,
    },
    preview: {
      // Serve index.html for all routes in preview mode (production build)
      // This ensures client-side routing works when deployed
    },
  }
})