// scripts/gen-firebase-config.cjs
const fs = require('fs');
const path = require('path');

// Charger les variables d'environnement depuis les fichiers .env
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...valueParts] = trimmed.split('=');
    if (key) {
      env[key.trim()] = valueParts.join('=').trim();
    }
  });
  return env;
}

// Charger dans l'ordre de priorité (le dernier écrase les précédents)
const rootDir = path.join(__dirname, '..');
const envFiles = [
  path.join(rootDir, '.env'),
  path.join(rootDir, '.env.local'),
  path.join(rootDir, '.env.development'),
  path.join(rootDir, '.env.development.local'),
];

let env = { ...process.env };
envFiles.forEach(file => {
  env = { ...env, ...loadEnvFile(file) };
});

const cfg = {
  apiKey: env.VITE_FIREBASE_API_KEY || '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: env.VITE_FIREBASE_APP_ID || '',
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || ''
};

// Vérifier que les valeurs essentielles sont présentes
if (!cfg.apiKey || !cfg.projectId) {
  console.warn('⚠️ Firebase config is incomplete. Check your .env.local file.');
}

const out = path.join(__dirname, '..', 'public', 'firebase-config.js');
fs.writeFileSync(out, 'self.__FIREBASE_CONFIG__ = ' + JSON.stringify(cfg, null, 2) + ';\n');
console.log('Wrote', out);
console.log('Config:', {
  apiKey: cfg.apiKey ? '✅ set' : '❌ missing',
  projectId: cfg.projectId || '❌ missing',
  authDomain: cfg.authDomain ? '✅ set' : '❌ missing'
});