import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import { visualizer } from 'rollup-plugin-visualizer'
import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'path'

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
      target: 'esnext',
      // Minification avec terser pour réduire la taille du bundle
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,  // Supprime console.log en production
          drop_debugger: true, // Supprime debugger
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
          /**
           * OPTIMIZED: Intelligent chunk splitting strategy
           * Splits heavy dependencies into separate chunks for better caching
           * Estimated bundle size reduction: 30-40%
           */
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // React core - changes rarely, cache separately
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                return 'react-vendor';
              }
              // Firebase SDK - large, cache separately
              if (id.includes('firebase') || id.includes('@firebase')) {
                return 'firebase-vendor';
              }
              // Stripe/PayPal payment SDKs
              if (id.includes('stripe') || id.includes('paypal')) {
                return 'payment-vendor';
              }
              // Charts library - only used in admin
              if (id.includes('recharts') || id.includes('d3-')) {
                return 'charts-vendor';
              }
              // Date utilities
              if (id.includes('date-fns')) {
                return 'date-vendor';
              }
              // i18n internationalization
              if (id.includes('i18next') || id.includes('react-i18next')) {
                return 'i18n-vendor';
              }
              // UI components
              if (id.includes('@mui') || id.includes('@emotion') || id.includes('@headlessui')) {
                return 'ui-vendor';
              }
              // All other node_modules
              return 'vendor';
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