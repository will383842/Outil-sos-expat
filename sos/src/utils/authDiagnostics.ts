// src/utils/authDiagnostics.ts
// Utilitaires de diagnostic pour Firebase Auth

/**
 * Diagnostic complet de l'environnement Firebase Auth
 * À appeler dans la console: window.diagnoseFirebaseAuth()
 */
export function diagnoseFirebaseAuth() {
  console.group('🔍 Firebase Auth Diagnostic');

  // 1. Configuration Firebase
  console.log('1️⃣ Configuration Firebase:');
  console.log('  authDomain:', import.meta.env.VITE_FIREBASE_AUTH_DOMAIN);
  console.log('  projectId:', import.meta.env.VITE_FIREBASE_PROJECT_ID);
  console.log('  apiKey:', import.meta.env.VITE_FIREBASE_API_KEY ? '✅ présent' : '❌ MANQUANT');

  // 2. Domaine actuel
  console.log('\n2️⃣ Domaine actuel:');
  console.log('  origin:', window.location.origin);
  console.log('  hostname:', window.location.hostname);
  console.log('  protocol:', window.location.protocol);

  // 3. User Agent
  console.log('\n3️⃣ User Agent:');
  console.log('  ', navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isSafari = /Safari/i.test(navigator.userAgent) && !/Chrome|CriOS|FxiOS|EdgiOS/i.test(navigator.userAgent);
  const isChrome = /Chrome|CriOS/i.test(navigator.userAgent);
  console.log('  iOS:', isIOS);
  console.log('  Android:', isAndroid);
  console.log('  Safari:', isSafari);
  console.log('  Chrome:', isChrome);

  // 4. Popup support
  console.log('\n4️⃣ Support des popups:');
  try {
    const popup = window.open('', '_blank', 'width=1,height=1');
    if (popup) {
      console.log('  ✅ Popups autorisées');
      popup.close();
    } else {
      console.log('  ❌ Popups bloquées');
    }
  } catch (e) {
    console.log('  ❌ Erreur lors du test popup:', e);
  }

  // 5. LocalStorage
  console.log('\n5️⃣ LocalStorage:');
  try {
    localStorage.setItem('test', 'test');
    localStorage.removeItem('test');
    console.log('  ✅ LocalStorage disponible');
  } catch (e) {
    console.log('  ❌ LocalStorage bloqué:', e);
  }

  // 6. SessionStorage
  console.log('\n6️⃣ SessionStorage:');
  try {
    sessionStorage.setItem('test', 'test');
    sessionStorage.removeItem('test');
    console.log('  ✅ SessionStorage disponible');
  } catch (e) {
    console.log('  ❌ SessionStorage bloqué:', e);
  }

  // 7. Cookies
  console.log('\n7️⃣ Cookies:');
  console.log('  enabled:', navigator.cookieEnabled);
  console.log('  document.cookie:', document.cookie || '(vide)');

  // 8. Content Security Policy
  console.log('\n8️⃣ Content Security Policy:');
  const metaCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (metaCSP) {
    console.log('  Meta CSP:', (metaCSP as HTMLMetaElement).content);
  } else {
    console.log('  Pas de meta CSP (headers CSP uniquement)');
  }

  // 9. Firebase Auth état
  console.log('\n9️⃣ Firebase Auth:');
  import('../config/firebase').then(({ auth }) => {
    console.log('  currentUser:', auth.currentUser ? auth.currentUser.uid : 'null');
    console.log('  languageCode:', auth.languageCode);
    console.log('  tenantId:', auth.tenantId);
    console.log('  config.apiKey:', auth.config.apiKey ? '✅' : '❌');
    console.log('  config.authDomain:', auth.config.authDomain);
  });

  // 10. Réseau
  console.log('\n🔟 Réseau:');
  console.log('  online:', navigator.onLine);
  const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  if (conn) {
    console.log('  effectiveType:', conn.effectiveType);
    console.log('  downlink:', conn.downlink, 'Mbps');
    console.log('  rtt:', conn.rtt, 'ms');
  }

  console.groupEnd();

  // Test de connectivité Google
  console.group('🌐 Test de connectivité Google');
  const testUrls = [
    'https://accounts.google.com',
    'https://apis.google.com',
    'https://www.googleapis.com',
    'https://securetoken.googleapis.com',
    'https://identitytoolkit.googleapis.com',
  ];

  testUrls.forEach(url => {
    fetch(url, { method: 'HEAD', mode: 'no-cors' })
      .then(() => console.log(`  ✅ ${url}`))
      .catch(() => console.log(`  ❌ ${url}`));
  });
  console.groupEnd();

  console.log('\n💡 Pour tester l\'authentification Google, appelez:');
  console.log('   const { loginWithGoogle } = window.__authContext;');
  console.log('   await loginWithGoogle();');
}

// Exposer globalement
if (typeof window !== 'undefined') {
  (window as any).diagnoseFirebaseAuth = diagnoseFirebaseAuth;
}
