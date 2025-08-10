import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()], // Simple et efficace
  // 🔧 Support natif ES2022 pour optional chaining + fix deadlock
  esbuild: {
    target: 'es2022',
    keepNames: true, // 🔧 Évite le deadlock ESBuild
  },
  // ⚡ Gardé de votre config originale
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  // 🌐 Gardé de votre config originale  
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/chat': {
        target: 'http://127.0.0.1:5001/outils-sos-expat/europe-west1',
        changeOrigin: true,
      },
      '/ingestBooking': {
        target: 'http://127.0.0.1:5001/outils-sos-expat/europe-west1',
        changeOrigin: true,
      }
    },
  },
  // 🏗️ Build avec votre chunking + ES2022
  build: {
    target: 'es2022', // IMPORTANT : même target
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/functions'],
          ui: ['lucide-react', 'date-fns'],
        },
      },
    },
  },
});