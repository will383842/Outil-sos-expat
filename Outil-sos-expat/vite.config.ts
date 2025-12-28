import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [
    react(),
    // ==========================================================================
    // PWA Configuration - Progressive Web App
    // ==========================================================================
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["sos-favicon.svg", "robots.txt", "browserconfig.xml"],
      manifest: {
        name: "SOS Expat Pro - Espace Prestataires",
        short_name: "SOS Pro",
        description: "Assistant IA et plateforme de gestion pour avocats et expatriés aidants - SOS Expat",
        theme_color: "#DC2626",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/?utm_source=pwa&utm_medium=installed",
        id: "sos-expat-pro-pwa",
        lang: "fr",
        dir: "ltr",
        categories: ["business", "productivity", "utilities"],
        prefer_related_applications: false,
        icons: [
          {
            src: "/icons/icon-48x48.png",
            sizes: "48x48",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-72x72.png",
            sizes: "72x72",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-96x96.png",
            sizes: "96x96",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-128x128.png",
            sizes: "128x128",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-144x144.png",
            sizes: "144x144",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-152x152.png",
            sizes: "152x152",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-256x256.png",
            sizes: "256x256",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-384x384.png",
            sizes: "384x384",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-192x192-maskable.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/icons/icon-512x512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        shortcuts: [
          {
            name: "Dashboard",
            short_name: "Dashboard",
            description: "Accéder au tableau de bord",
            url: "/dashboard?utm_source=pwa_shortcut",
            icons: [{ src: "/icons/icon-96x96.png", sizes: "96x96", type: "image/png" }],
          },
          {
            name: "Assistant IA",
            short_name: "IA",
            description: "Ouvrir l'assistant IA",
            url: "/chat?utm_source=pwa_shortcut",
            icons: [{ src: "/icons/icon-96x96.png", sizes: "96x96", type: "image/png" }],
          },
          {
            name: "Mes Dossiers",
            short_name: "Dossiers",
            description: "Gérer mes dossiers clients",
            url: "/dossiers?utm_source=pwa_shortcut",
            icons: [{ src: "/icons/icon-96x96.png", sizes: "96x96", type: "image/png" }],
          },
        ],
        share_target: {
          action: "/share-target",
          method: "POST",
          enctype: "multipart/form-data",
          params: {
            title: "title",
            text: "text",
            url: "url",
            files: [
              {
                name: "documents",
                accept: ["application/pdf", "image/*", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
              },
            ],
          },
        },
        display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
        launch_handler: {
          client_mode: "navigate-existing",
        },
        handle_links: "preferred",
        edge_side_panel: {
          preferred_width: 480,
        },
      },
      workbox: {
        // Cache les assets statiques
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        // Ne pas cacher les appels API d'écriture
        navigateFallbackDenylist: [/^\/api/, /^\/chat/, /^\/ingestBooking/, /^\/adminSetRole/],
        // ═══════════════════════════════════════════════════════════════════
        // PERFORMANCE: Runtime caching enrichi pour navigation quasi-instantanée
        // ═══════════════════════════════════════════════════════════════════
        runtimeCaching: [
          // ─────────────────────────────────────────────────────────────────
          // 1. FIREBASE STORAGE - Images uploadées (avatars, documents)
          // ─────────────────────────────────────────────────────────────────
          {
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "firebase-storage-images",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 jours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // ─────────────────────────────────────────────────────────────────
          // 2. IMAGES DYNAMIQUES - Toutes extensions
          // ─────────────────────────────────────────────────────────────────
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif|ico)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache",
              expiration: {
                maxEntries: 150,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 jours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // ─────────────────────────────────────────────────────────────────
          // 3. FIRESTORE API - Lectures avec fallback cache (NetworkFirst)
          // ─────────────────────────────────────────────────────────────────
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/v1\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "firestore-api-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5, // 5 minutes (données fraîches prioritaires)
              },
              networkTimeoutSeconds: 3, // Fallback sur cache si réseau > 3s
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // ─────────────────────────────────────────────────────────────────
          // 4. GOOGLE FONTS - Cache permanent
          // ─────────────────────────────────────────────────────────────────
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-stylesheets",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 an
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 an
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // ─────────────────────────────────────────────────────────────────
          // 5. CDN EXTERNES - Scripts et librairies
          // ─────────────────────────────────────────────────────────────────
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "jsdelivr-cdn-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 jours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/unpkg\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "unpkg-cdn-cache",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 jours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // ─────────────────────────────────────────────────────────────────
          // 6. GOOGLE APIS - Auth et autres services
          // ─────────────────────────────────────────────────────────────────
          {
            urlPattern: /^https:\/\/www\.googleapis\.com\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "googleapis-cache",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60, // 1 heure
              },
              networkTimeoutSeconds: 5,
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
        // Clean up old caches
        cleanupOutdatedCaches: true,
        // Skip waiting pour appliquer les mises à jour immédiatement
        skipWaiting: true,
        clientsClaim: true,
      },
      devOptions: {
        enabled: false, // Désactivé en dev pour éviter les conflits
      },
    }),
  ],
  esbuild: {
    target: "es2022",
    keepNames: true,
  },
  optimizeDeps: {
    exclude: ["lucide-react"],
  },
  server: {
    host: true,
    port: 5173,
    strictPort: false,
    open: false,
  },
  preview: {
    host: true,
    port: 4173,
  },
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          firebase: ["firebase/app", "firebase/auth", "firebase/firestore", "firebase/functions"],
          ui: ["lucide-react", "date-fns"],
          query: ["@tanstack/react-query"],
        },
      },
    },
  },
});
