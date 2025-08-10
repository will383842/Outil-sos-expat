import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

// Configuration Firebase - SOS Expat
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "your-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "outils-sos-expat.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "outils-sos-expat",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "outils-sos-expat.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "your-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'europe-west1'); // Région européenne pour SOS Expats
export const storage = getStorage(app);

// Log pour confirmer l'initialisation
console.log('🔥 Firebase initialisé pour SOS Expat');

export default app;