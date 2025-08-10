import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../config/firebase';

// If you prefer HTTPS fetch, you can also directly call the onRequest URL after deploy.
// Here we keep a simple wrapper using fetch with emulator-friendly base URL.
export async function callChat(convId: string, message: string): Promise<string> {
  const functions = getFunctions(app, 'europe-west1');
  // Using direct fetch to avoid onCall auth complexity; replace URL after deploy.
  const base = import.meta.env.VITE_FUNCTIONS_URL_BASE || '';
  if (!base) {
    // fallback to emulator default
    console.warn('VITE_FUNCTIONS_URL_BASE is not set. Falling back to /chat (same origin proxy).');
  }
  const url = `${base}/chat`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ convId, message })
  });
  if (!res.ok) throw new Error(`Chat failed: ${res.status}`);
  const data = await res.json();
  return data.reply as string;
}
