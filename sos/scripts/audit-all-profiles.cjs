/**
 * Audit COMPLET de TOUS les profils (AAA + vrais prestataires + clients)
 * Vérifie la cohérence entre users, sos_profiles, et Firebase Auth
 *
 * Usage:
 *   node scripts/audit-all-profiles.cjs
 */

const admin = require('firebase-admin');
const path = require('path');

const credPath = path.join(
  process.env.APPDATA || process.env.HOME,
  'firebase',
  'williamsjullin_gmail_com_application_default_credentials.json'
);
process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;

admin.initializeApp({ projectId: 'sos-urgently-ac307' });
const db = admin.firestore();

// Couleurs console
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

async function loadAllDocs(collection) {
  const docs = new Map();
  let lastDoc = null;
  const PAGE = 500;
  while (true) {
    let q = db.collection(collection).limit(PAGE);
    if (lastDoc) q = q.startAfter(lastDoc);
    const snap = await q.get();
    if (snap.empty) break;
    snap.docs.forEach(d => docs.set(d.id, d.data()));
    lastDoc = snap.docs[snap.docs.length - 1];
    if (snap.size < PAGE) break;
  }
  return docs;
}

async function auditAll() {
  console.log(`${BOLD}════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}   AUDIT COMPLET - TOUS LES PROFILS DE LA BASE${RESET}`);
  console.log(`${BOLD}════════════════════════════════════════════════════════${RESET}\n`);

  // ── 1. Charger toutes les collections ──
  console.log(`${CYAN}1. Chargement des collections...${RESET}`);

  const [allUsers, allSosProfiles, allUiCards, allUiCarousel] = await Promise.all([
    loadAllDocs('users'),
    loadAllDocs('sos_profiles'),
    loadAllDocs('ui_profile_cards'),
    loadAllDocs('ui_profile_carousel'),
  ]);

  console.log(`   users:              ${allUsers.size} documents`);
  console.log(`   sos_profiles:       ${allSosProfiles.size} documents`);
  console.log(`   ui_profile_cards:   ${allUiCards.size} documents`);
  console.log(`   ui_profile_carousel:${allUiCarousel.size} documents\n`);

  // Classifier les users
  const providers = new Map();   // lawyers + expats
  const clients = new Map();
  const multiAccounts = new Map();
  const others = new Map();

  for (const [uid, data] of allUsers) {
    const role = data.role || data.type || '';
    if (role === 'lawyer' || role === 'expat') {
      providers.set(uid, data);
    } else if (role === 'client') {
      clients.set(uid, data);
    } else if (role === 'provider' || data.isMultiProvider) {
      multiAccounts.set(uid, data);
    } else {
      others.set(uid, data);
    }
  }

  console.log(`   Classification users:`);
  console.log(`     Prestataires (lawyer/expat): ${providers.size}`);
  console.log(`     Clients:                     ${clients.size}`);
  console.log(`     Comptes multi-prestataires:   ${multiAccounts.size}`);
  console.log(`     Autres (role inconnu):        ${others.size}\n`);

  // ── 2. Audit ──
  console.log(`${CYAN}2. Vérification de cohérence...${RESET}\n`);

  const issues = {
    critical: [],  // Bloquant pour paiement/appels
    warning: [],   // Données incomplètes mais pas bloquant
    info: [],      // Observations
  };

  // ═══════════════════════════════════════
  // CHECK A: sos_profiles SANS users
  // ═══════════════════════════════════════
  let countSosWithoutUsers = 0;
  for (const [uid, profile] of allSosProfiles) {
    if (!allUsers.has(uid)) {
      countSosWithoutUsers++;
      const isAAA = uid.startsWith('aaa_') || profile.isAAA === true;
      issues.critical.push({
        type: 'SOS_WITHOUT_USERS',
        uid,
        email: profile.email || 'N/A',
        name: profile.fullName || profile.displayName || 'N/A',
        providerType: profile.type || 'N/A',
        country: profile.country || 'N/A',
        isAAA,
        isOnline: profile.isOnline || false,
        impact: 'Paiement Stripe impossible, statut busy/available cassé',
      });
    }
  }

  // ═══════════════════════════════════════
  // CHECK B: Providers (users) SANS sos_profiles
  // ═══════════════════════════════════════
  let countProvidersWithoutSos = 0;
  for (const [uid, user] of providers) {
    if (!allSosProfiles.has(uid)) {
      countProvidersWithoutSos++;
      const isAAA = uid.startsWith('aaa_') || user.isAAA === true;
      issues.critical.push({
        type: 'PROVIDER_WITHOUT_SOS',
        uid,
        email: user.email || 'N/A',
        name: user.fullName || user.displayName || 'N/A',
        role: user.role || 'N/A',
        isAAA,
        impact: 'Invisible sur la carte/recherche, pas appelable',
      });
    }
  }

  // ═══════════════════════════════════════
  // CHECK C: Cohérence des données pour CHAQUE provider
  // ═══════════════════════════════════════
  for (const [uid, profile] of allSosProfiles) {
    const user = allUsers.get(uid);
    if (!user) continue; // Déjà signalé en CHECK A

    const isAAA = uid.startsWith('aaa_') || profile.isAAA === true || user.isAAA === true;
    const label = `${uid} (${profile.email || user.email || 'N/A'})`;

    // C1: Email mismatch
    if (profile.email && user.email && profile.email.toLowerCase() !== user.email.toLowerCase()) {
      issues.warning.push({
        type: 'EMAIL_MISMATCH',
        uid, label, isAAA,
        detail: `sos_profiles.email="${profile.email}" vs users.email="${user.email}"`,
      });
    }

    // C2: Role/Type mismatch
    const sosType = profile.type || '';
    const userRole = user.role || '';
    if (sosType && userRole && sosType !== userRole) {
      issues.warning.push({
        type: 'ROLE_MISMATCH',
        uid, label, isAAA,
        detail: `sos_profiles.type="${sosType}" vs users.role="${userRole}"`,
      });
    }

    // C3: Champs critiques manquants dans sos_profiles
    const sosCritical = ['type', 'email', 'fullName'];
    for (const f of sosCritical) {
      if (!profile[f] || (typeof profile[f] === 'string' && profile[f].trim() === '')) {
        issues.warning.push({
          type: 'MISSING_FIELD_SOS',
          uid, label, isAAA,
          detail: `sos_profiles.${f} manquant`,
        });
      }
    }

    // C4: Champs critiques manquants dans users
    const userCritical = ['email', 'role', 'firstName', 'lastName'];
    for (const f of userCritical) {
      if (!user[f] || (typeof user[f] === 'string' && user[f].trim() === '')) {
        issues.warning.push({
          type: 'MISSING_FIELD_USERS',
          uid, label, isAAA,
          detail: `users.${f} manquant`,
        });
      }
    }

    // C5: Provider en ligne mais isApproved=false (ne devrait pas arriver)
    if (profile.isOnline === true && profile.isApproved === false) {
      issues.warning.push({
        type: 'ONLINE_NOT_APPROVED',
        uid, label, isAAA,
        detail: 'Provider en ligne mais non approuvé',
      });
    }

    // C6: Incohérence isOnline entre collections
    if (user.isOnline !== undefined && profile.isOnline !== undefined && user.isOnline !== profile.isOnline) {
      issues.info.push({
        type: 'ONLINE_STATUS_MISMATCH',
        uid, label, isAAA,
        detail: `users.isOnline=${user.isOnline} vs sos_profiles.isOnline=${profile.isOnline}`,
      });
    }

    // C7: Vérifier que le pays est renseigné
    if (!profile.country && !user.country) {
      issues.warning.push({
        type: 'NO_COUNTRY',
        uid, label, isAAA,
        detail: 'Aucun pays renseigné (ni users ni sos_profiles)',
      });
    }

    // C8: Vérifier les langues
    const langs = profile.languages || profile.languagesSpoken || user.languages || [];
    if (!Array.isArray(langs) || langs.length === 0) {
      issues.info.push({
        type: 'NO_LANGUAGES',
        uid, label, isAAA,
        detail: 'Aucune langue renseignée',
      });
    }

    // C9: ui_profile_cards manquant
    if (!allUiCards.has(uid)) {
      issues.info.push({
        type: 'MISSING_UI_CARD',
        uid, label, isAAA,
        detail: 'Pas de document ui_profile_cards',
      });
    }

    // C10: ui_profile_carousel manquant
    if (!allUiCarousel.has(uid)) {
      issues.info.push({
        type: 'MISSING_UI_CAROUSEL',
        uid, label, isAAA,
        detail: 'Pas de document ui_profile_carousel',
      });
    }

    // C11: Stripe/PayPal - Provider approuvé sans moyen de paiement
    if (profile.isApproved === true && !isAAA) {
      if (!profile.stripeAccountId && !profile.paypalMerchantId && !user.stripeAccountId) {
        issues.warning.push({
          type: 'NO_PAYMENT_ACCOUNT',
          uid, label, isAAA,
          detail: 'Provider approuvé sans compte Stripe ni PayPal',
        });
      }
    }
  }

  // ═══════════════════════════════════════
  // CHECK D: Users avec role inconnu
  // ═══════════════════════════════════════
  for (const [uid, user] of others) {
    issues.info.push({
      type: 'UNKNOWN_ROLE',
      uid,
      label: `${uid} (${user.email || 'N/A'})`,
      isAAA: uid.startsWith('aaa_'),
      detail: `role="${user.role || ''}" type="${user.type || ''}"`,
    });
  }

  // ── 3. Rapport ──
  console.log(`${BOLD}════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}                  RAPPORT D'AUDIT${RESET}`);
  console.log(`${BOLD}════════════════════════════════════════════════════════${RESET}\n`);

  // Stats globales
  console.log(`${BOLD}STATISTIQUES GLOBALES:${RESET}`);
  console.log(`  Total users:          ${allUsers.size}`);
  console.log(`  Total sos_profiles:   ${allSosProfiles.size}`);
  console.log(`  Prestataires (users): ${providers.size}`);
  console.log(`  Clients:              ${clients.size}`);
  console.log(`  Multi-comptes:        ${multiAccounts.size}\n`);

  // Séparer AAA vs vrais
  const critAAA = issues.critical.filter(i => i.isAAA);
  const critReal = issues.critical.filter(i => !i.isAAA);
  const warnAAA = issues.warning.filter(i => i.isAAA);
  const warnReal = issues.warning.filter(i => !i.isAAA);
  const infoAAA = issues.info.filter(i => i.isAAA);
  const infoReal = issues.info.filter(i => !i.isAAA);

  // ── CRITIQUES ──
  console.log(`${BOLD}${RED}═══ PROBLEMES CRITIQUES ═══${RESET}\n`);

  if (critReal.length > 0) {
    console.log(`${RED}${BOLD}  VRAIS PRESTATAIRES: ${critReal.length} problèmes critiques${RESET}`);
    for (const i of critReal) {
      console.log(`${RED}  🔴 [${i.type}] ${i.uid}${RESET}`);
      console.log(`     ${i.name || ''} | ${i.email} | ${i.providerType || i.role || ''} | ${i.country || ''}`);
      console.log(`     Impact: ${i.impact}`);
    }
    console.log('');
  } else {
    console.log(`${GREEN}  ✅ VRAIS PRESTATAIRES: 0 problème critique${RESET}\n`);
  }

  if (critAAA.length > 0) {
    console.log(`${RED}  PROFILS AAA: ${critAAA.length} problèmes critiques${RESET}`);
    for (const i of critAAA) {
      console.log(`${RED}  🔴 [${i.type}] ${i.uid}${RESET}`);
      console.log(`     ${i.name || ''} | ${i.email} | ${i.providerType || i.role || ''}`);
      console.log(`     Impact: ${i.impact}`);
    }
    console.log('');
  } else {
    console.log(`${GREEN}  ✅ PROFILS AAA: 0 problème critique${RESET}\n`);
  }

  // ── WARNINGS ──
  console.log(`${BOLD}${YELLOW}═══ WARNINGS ═══${RESET}\n`);

  if (warnReal.length > 0) {
    console.log(`${YELLOW}  VRAIS PRESTATAIRES: ${warnReal.length} warnings${RESET}`);
    // Grouper par type
    const grouped = {};
    for (const w of warnReal) {
      if (!grouped[w.type]) grouped[w.type] = [];
      grouped[w.type].push(w);
    }
    for (const [type, items] of Object.entries(grouped)) {
      console.log(`${YELLOW}   [${type}] x${items.length}:${RESET}`);
      for (const w of items.slice(0, 10)) {
        console.log(`     🟡 ${w.label}: ${w.detail}`);
      }
      if (items.length > 10) console.log(`     ... et ${items.length - 10} de plus`);
    }
    console.log('');
  } else {
    console.log(`${GREEN}  ✅ VRAIS PRESTATAIRES: 0 warning${RESET}\n`);
  }

  if (warnAAA.length > 0) {
    console.log(`${YELLOW}  PROFILS AAA: ${warnAAA.length} warnings${RESET}`);
    const grouped = {};
    for (const w of warnAAA) {
      if (!grouped[w.type]) grouped[w.type] = [];
      grouped[w.type].push(w);
    }
    for (const [type, items] of Object.entries(grouped)) {
      console.log(`${YELLOW}   [${type}] x${items.length}:${RESET}`);
      for (const w of items.slice(0, 5)) {
        console.log(`     🟡 ${w.label}: ${w.detail}`);
      }
      if (items.length > 5) console.log(`     ... et ${items.length - 5} de plus`);
    }
    console.log('');
  } else {
    console.log(`${GREEN}  ✅ PROFILS AAA: 0 warning${RESET}\n`);
  }

  // ── INFO ──
  console.log(`${BOLD}${CYAN}═══ INFO ═══${RESET}\n`);

  if (infoReal.length > 0) {
    console.log(`${CYAN}  VRAIS PRESTATAIRES: ${infoReal.length} observations${RESET}`);
    const grouped = {};
    for (const i of infoReal) {
      if (!grouped[i.type]) grouped[i.type] = [];
      grouped[i.type].push(i);
    }
    for (const [type, items] of Object.entries(grouped)) {
      console.log(`   [${type}] x${items.length}`);
      if (items.length <= 3) {
        for (const it of items) console.log(`     ℹ️  ${it.label}: ${it.detail}`);
      }
    }
    console.log('');
  } else {
    console.log(`${GREEN}  ✅ VRAIS PRESTATAIRES: 0 observation${RESET}\n`);
  }

  if (infoAAA.length > 0) {
    console.log(`${CYAN}  PROFILS AAA: ${infoAAA.length} observations${RESET}`);
    const grouped = {};
    for (const i of infoAAA) {
      if (!grouped[i.type]) grouped[i.type] = [];
      grouped[i.type].push(i);
    }
    for (const [type, items] of Object.entries(grouped)) {
      console.log(`   [${type}] x${items.length}`);
    }
    console.log('');
  } else {
    console.log(`${GREEN}  ✅ PROFILS AAA: 0 observation${RESET}\n`);
  }

  // ── RÉSUMÉ FINAL ──
  console.log(`${BOLD}════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}                 RÉSUMÉ FINAL${RESET}`);
  console.log(`${BOLD}════════════════════════════════════════════════════════${RESET}\n`);

  const totalCrit = issues.critical.length;
  const totalWarn = issues.warning.length;
  const totalInfo = issues.info.length;

  console.log(`  ${totalCrit === 0 ? GREEN + '✅' : RED + '❌'} Critiques:     ${totalCrit}${RESET} (${critReal.length} vrais, ${critAAA.length} AAA)`);
  console.log(`  ${totalWarn === 0 ? GREEN + '✅' : YELLOW + '⚠️ '} Warnings:      ${totalWarn}${RESET} (${warnReal.length} vrais, ${warnAAA.length} AAA)`);
  console.log(`  ℹ️  Informations: ${totalInfo} (${infoReal.length} vrais, ${infoAAA.length} AAA)`);

  if (totalCrit === 0 && totalWarn === 0) {
    console.log(`\n${GREEN}${BOLD}🎉 TOUS LES PROFILS SONT PARFAITS ! 🎉${RESET}`);
  } else if (totalCrit === 0) {
    console.log(`\n${GREEN}${BOLD}✅ Aucun problème critique — les paiements et appels fonctionneront pour tous les profils.${RESET}`);
    console.log(`${YELLOW}   Les warnings sont des données incomplètes non-bloquantes.${RESET}`);
  } else {
    console.log(`\n${RED}${BOLD}❌ ${totalCrit} problème(s) critique(s) à corriger !${RESET}`);
  }

  console.log('');
  process.exit(0);
}

auditAll().catch(err => {
  console.error('Erreur fatale:', err);
  process.exit(1);
});
