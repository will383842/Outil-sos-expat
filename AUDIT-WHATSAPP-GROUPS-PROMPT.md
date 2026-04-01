# AUDIT COMPLET — Groupes WhatsApp : chargement impossible / mauvais groupe selon user, langue, région

## CONTEXTE DU PROBLÈME

Après l'inscription, les utilisateurs voient un écran pour rejoindre un groupe WhatsApp adapté à leur rôle, langue et région. **Le système ne fonctionne pas correctement** :

**Symptômes signalés :**
- Message **"Chargement impossible, veuillez réessayer"** quand WhatsApp s'ouvre
- Les liens WhatsApp sont **invalides ou expirés** (erreur côté WhatsApp)
- L'utilisateur est redirigé vers le **mauvais groupe** (mauvaise langue ou mauvaise région)
- Certains utilisateurs ne voient **aucun groupe** et sont skip directement au dashboard
- Le **Firestore doc `admin_config/whatsapp_groups`** peut être absent ou incomplet en production
- Les liens **hardcodés dans le seed** peuvent avoir expiré depuis le 12/03/2026

---

## STACK TECHNIQUE

- **Module frontend** : `sos/src/whatsapp-groups/` (module isolé, 0 Cloud Function dependency)
- **Config Firestore** : `admin_config/whatsapp_groups` — document unique avec 68+ groupes
- **Fallback** : Si Firestore vide → seed data hardcodé (68 liens du 12/03/2026)
- **Cloud Function sync** : `syncWhatsAppInviteLinks` (HTTP webhook, Baileys → Laravel → Firebase)
- **7 rôles** : chatter, influencer, blogger, groupAdmin, client, lawyer, expat
- **9 langues** : fr, en, es, pt, de, ru, ar, zh, hi
- **7 continents** : AF, AS, EU, NA, SA, OC, ME
- **68 groupes seed** : 14 chatter (continent×FR/EN) + 54 language (6 rôles × 9 langues)

---

## ARCHITECTURE DU SYSTÈME

### Flow utilisateur
```
Inscription réussie
→ WhatsAppGroupScreen mount (props: userId, role, language, country)
→ getWhatsAppGroupsConfig() — fetch Firestore doc admin_config/whatsapp_groups
   ├─ Doc existe → utiliser les données Firestore
   ├─ Doc absent → auto-seed 68 groupes depuis WHATSAPP_GROUPS_SEED_DATA
   └─ Doc incomplet (<50% des groupes seed) → auto-heal/re-seed
→ findGroupForUser(config, role, language, country) — algorithme 9 niveaux
→ Afficher le groupe trouvé avec bouton "Rejoindre le groupe WhatsApp"
→ User clique → <a href="https://chat.whatsapp.com/XXX"> ouvre WhatsApp
→ trackWhatsAppGroupClick() — fire-and-forget
→ Auto-redirect dashboard après 8s
```

### Algorithme de résolution `findGroupForUser()` (9 niveaux de priorité)
```
1. Continent + langue exacte du user         → ex: chatter FR + pays CM (Afrique) → "Chatter Afrique FR"
2. Continent + langue déduite du pays         → ex: pays CM → langue fr → "Chatter Afrique FR"
2b. Continent + EN (lingua franca)            → ex: chatter ES en Europe → "Chatter Europe EN"
2c. Continent + FR (deuxième fallback)        → ex: chatter AR en Afrique → "Chatter Afrique FR"
3. Groupe langue du user (type "language")    → ex: influencer FR → "Influencer Français"
4. Groupe langue déduite du pays              → ex: pays BR → langue pt → "Influencer Português"
4b. Groupe EN (lingua franca, fallback)       → dernier recours langue
5. Groupe par défaut du rôle (defaultGroupIds) → configuré dans Firestore
6. Premier groupe enabled du rôle             → absolument dernier recours
```

### Données seed (68 groupes hardcodés depuis le 12/03/2026)
- **Chatters** : 14 groupes continent (7 continents × FR + EN uniquement)
- **Influencers** : 9 groupes langue
- **Bloggers** : 9 groupes langue
- **GroupAdmins** : 9 groupes langue
- **Clients** : 9 groupes langue
- **Avocats** : 9 groupes langue
- **Expatriés** : 9 groupes langue

---

## FICHIERS À AUDITER

### Module WhatsApp Groups (`sos/src/whatsapp-groups/`)
| Fichier | Lignes | Rôle |
|---------|--------|------|
| `types.ts` | 241 | Types, COUNTRY_TO_LANGUAGE (163 pays), COUNTRY_TO_CONTINENT (200+ pays), ALL_CONTINENTS, SUPPORTED_LANGUAGES |
| `whatsappGroupsService.ts` | 316 | **SERVICE PRINCIPAL** : getWhatsAppGroupsConfig(), findGroupForUser(), trackWhatsAppGroupClick(), autoSeedIfNeeded() |
| `WhatsAppGroupScreen.tsx` | 319 | **ÉCRAN POST-INSCRIPTION** : loading/invitation/success states, deep link `<a href>`, countdown 8s |
| `WhatsAppBanner.tsx` | 106 | Banner dashboard (pour users ayant skip l'écran WhatsApp) |
| `seedWhatsAppGroups.ts` | 223 | **68 LIENS HARDCODÉS** : WHATSAPP_GROUPS_SEED_DATA, buildConfigFromSeedData(), transformGroup() |
| `AdminWhatsAppGroups.tsx` | 605 | Admin UI gestion des groupes |
| `AdminWhatsAppSupervision.tsx` | 500+ | Admin UI gestion des managers |
| `index.ts` | 52 | Barrel exports |

### Cloud Function
| Fichier | Rôle |
|---------|------|
| `sos/firebase/functions/src/whatsapp/syncInviteLinks.ts` (~300 lignes) | HTTP webhook : Baileys → Laravel → Firestore. Met à jour les liens. Protégé par `SOS_SYNC_API_KEY`. |

### Intégrations (pages d'inscription)
| Fichier | Comment il utilise WhatsAppGroupScreen |
|---------|---------------------------------------|
| `sos/src/pages/Chatter/ChatterRegister.tsx` | `<WhatsAppGroupScreen userId={user.uid} role="chatter" language={lang} country={country} onContinue={...} />` |
| `sos/src/pages/Influencer/InfluencerRegister.tsx` | Idem avec `role="influencer"` |
| `sos/src/pages/Blogger/BloggerRegister.tsx` | Idem avec `role="blogger"` |
| `sos/src/pages/GroupAdmin/GroupAdminRegister.tsx` | Idem avec `role="groupAdmin"` |
| `sos/src/pages/RegisterClient.tsx` | Idem avec `role="client"` |
| `sos/src/pages/RegisterLawyer.tsx` | Idem avec `role="lawyer"` |
| `sos/src/pages/RegisterExpat.tsx` | Idem avec `role="expat"` |

### Config & Rules
| Fichier | Rôle |
|---------|------|
| `sos/firestore.rules` (L.484) | `allow read: if docId == 'whatsapp_groups'` — lecture publique pour les authentifiés |
| `sos/src/helper/fr.json` | Traductions FR (whatsapp.*) |
| `sos/src/helper/en.json` | Traductions EN (whatsapp.*) |

---

## HYPOTHÈSES DE BUGS PRIORITAIRES

### HYPOTHÈSE 1 — Liens WhatsApp expirés dans le seed
**Sévérité : P0 (probablement le bug principal)**
- Les 68 liens sont hardcodés depuis le **12/03/2026** (il y a 7 jours)
- Les liens WhatsApp `https://chat.whatsapp.com/XXX` **expirent** si le groupe est supprimé, le lien est révoqué, ou le groupe est plein
- **Le message "Chargement impossible, veuillez réessayer"** est un message WhatsApp natif quand le lien est invalide
- **Vérification nécessaire** : Tester CHACUN des 68 liens pour voir s'ils sont encore valides
- **Question** : Le `syncWhatsAppInviteLinks` Cloud Function met-il à jour les liens automatiquement ? Est-il configuré en production ?

### HYPOTHÈSE 2 — Firestore doc absent en production
**Sévérité : P0**
- Si `admin_config/whatsapp_groups` n'existe pas, le code fait un auto-seed
- **MAIS** : l'auto-seed fait un `setDoc` qui nécessite que le user authentifié ait les permissions d'écriture sur `admin_config`
- **Firestore rules** : `allow read: if docId == 'whatsapp_groups'` — mais quelle est la rule pour **write** ? Si seuls les admins peuvent écrire, l'auto-seed échoue silencieusement pour les users normaux
- Le fallback `buildConfigFromSeedData()` retourne les données en mémoire → les liens sont ceux du seed (potentiellement expirés)

### HYPOTHÈSE 3 — Mauvais paramètres passés au WhatsAppGroupScreen
**Sévérité : P1**
- Le `country` passé en prop vient de `registrationData?.country` (set lors de la soumission du formulaire)
- **Question** : Le code pays est-il au bon format ? Le `findGroupForUser` attend un code ISO 2 lettres en MAJUSCULES (`"FR"`, `"CM"`), mais le form envoie-t-il `"fr"`, `"france"`, ou `"FR"` ?
- Le `language` vient de `registrationData?.language` — est-ce `"fr"`, `"ch"` (pour chinois), ou autre ?

### HYPOTHÈSE 4 — Mapping COUNTRY_TO_LANGUAGE incomplet
**Sévérité : P1**
- Le mapping couvre ~163 pays mais il y a 195+ pays dans le monde
- Si le pays de l'utilisateur n'est PAS dans le mapping, `countryLang` est `undefined`
- Les niveaux 2, 4 du fallback ne fonctionnent pas → fallback vers EN ou premier groupe
- **Exemples potentiels manquants** : certains petits pays, territoires d'outre-mer

### HYPOTHÈSE 5 — Mapping COUNTRY_TO_CONTINENT incomplet
**Sévérité : P1**
- Si le pays n'est pas dans COUNTRY_TO_CONTINENT, `continent` est `undefined`
- Les niveaux 1, 2, 2b, 2c ne fonctionnent pas → fallback directement au niveau 3 (langue)
- Pour les chatters (qui ont des groupes continent), cela signifie qu'ils tombent dans un groupe langue au lieu d'un groupe continent

### HYPOTHÈSE 6 — Le type "langue" dans le seed vs "language" dans le code
**Sévérité : P1**
- Le seed utilise `type: "langue"` (français) pour les groupes non-continent
- La transformation `transformGroup` convertit `"langue" → "language"`
- **MAIS** : si le `syncInviteLinks` Cloud Function écrit directement `type: "langue"` dans Firestore sans passer par `transformGroup`, le `findGroupForUser` ne trouvera AUCUN match car il cherche `type === 'language'`

### HYPOTHÈSE 7 — Chatters : seulement FR/EN dans les groupes continent
**Sévérité : P2**
- Les chatters ont 14 groupes continent : 7 continents × FR + EN uniquement
- Un chatter hispanophone en Amérique du Sud → pas de groupe "Chatter SA ES"
- Le fallback irait : 2b (continent + EN) → "Chatter SA EN"
- **Pas un bug**, mais l'utilisateur peut être surpris d'être dans un groupe EN

### HYPOTHÈSE 8 — Auto-redirect 8s trop rapide
**Sévérité : P2**
- Après le clic "Rejoindre le groupe WhatsApp", un countdown de 8s démarre
- Si WhatsApp met plus de 8s à ouvrir (réseau lent, app non installée), le user est redirigé au dashboard avant d'avoir pu rejoindre
- Le message "veuillez réessayer" pourrait être lié à ce timing

### HYPOTHÈSE 9 — Deep link mobile non fonctionnel
**Sévérité : P1**
- Le code utilise `<a href="https://chat.whatsapp.com/XXX">` avec `rel="noopener noreferrer"`
- Sur mobile iOS/Android, ce lien devrait ouvrir l'app WhatsApp via deep link
- **MAIS** : Si WhatsApp n'est pas installé, le lien ouvre un navigateur web → page WhatsApp Web qui affiche "Chargement impossible"
- Si l'app WhatsApp est installée mais le lien est invalide → WhatsApp affiche "Ce lien d'invitation a été révoqué"

### HYPOTHÈSE 10 — `getWhatsAppGroupsConfig()` échoue silencieusement
**Sévérité : P1**
- Si Firestore est inaccessible (réseau lent, cache corrompu), le catch retourne `buildConfigFromSeedData()`
- L'erreur est loggée dans la console mais l'utilisateur ne voit rien
- Les liens retournés sont ceux du seed (potentiellement expirés)

---

## INSTRUCTIONS POUR LES 50 AGENTS IA

### GROUPE A — Validation des 68 liens WhatsApp (10 agents)
**Agents A1-A10** : Vérifier CHAQUE lien WhatsApp
- A1-A2 : Vérifier les 14 liens Chatter continent (AF×FR, AF×EN, AS×FR, AS×EN, EU×FR, EU×EN, NA×FR, NA×EN, SA×FR, SA×EN, OC×FR, OC×EN, ME×FR, ME×EN)
- A3-A4 : Vérifier les 9 liens Influencer + 9 liens Blogger
- A5-A6 : Vérifier les 9 liens GroupAdmin + 9 liens Client
- A7-A8 : Vérifier les 9 liens Avocat + 9 liens Expatrié
- A9-A10 : Synthèse — combien de liens sont valides/invalides/expirés ? Le seed doit-il être mis à jour ?

**Méthode de vérification** : Faire un HTTP HEAD/GET sur chaque URL `https://chat.whatsapp.com/XXX` et vérifier le status code (200 = valide, 404 = expiré, redirect = révoqué)

### GROUPE B — Algorithme de résolution `findGroupForUser()` (8 agents)
**Agents B1-B8** : Tester l'algorithme avec des cas réels
- B1-B2 : Tester pour **Chatter** avec 20 combinaisons pays/langue différentes (FR/CM, EN/US, ES/MX, AR/SA, ZH/CN, HI/IN, DE/DE, PT/BR, RU/RU, etc.)
- B3-B4 : Tester pour **Influencer** et **Blogger** (même combinaisons)
- B5-B6 : Tester pour **GroupAdmin** et **Client** (même combinaisons)
- B7-B8 : Tester pour **Avocat** et **Expatrié** + cas edge : pays absent du mapping (ex: Kosovo "XK", Soudan du Sud "SS", Timor-Leste "TL")

**Pour chaque test, tracer** :
- Input : role, language, country
- continent résolu : COUNTRY_TO_CONTINENT[country]
- countryLang résolu : COUNTRY_TO_LANGUAGE[country]
- Quel niveau de fallback est atteint (1-6) ?
- Groupe retourné : id, name, link, language
- Le groupe est-il pertinent pour l'utilisateur ?

### GROUPE C — Firestore & Permissions (6 agents)
**Agents C1-C6** : Audit Firestore
- C1 : **Firestore rules** pour `admin_config/whatsapp_groups` — qui peut lire ? Qui peut écrire ? L'auto-seed fonctionne-t-il pour un user non-admin ?
- C2 : **État du document en production** — Le doc existe-t-il ? Combien de groupes actifs ? Les liens sont-ils à jour ?
- C3 : **`syncInviteLinks` Cloud Function** — Est-elle déployée ? Est-elle appelée régulièrement ? Le `SOS_SYNC_API_KEY` est-il configuré ?
- C4 : **Auto-seed vs auto-heal** — La logique `enabledCount < seedEnabledCount * 0.5` est-elle correcte ? Que se passe-t-il si un admin désactive volontairement 40% des groupes ?
- C5 : **Tracking** — `trackWhatsAppGroupClick` écrit dans la collection du rôle (chatters/, influencers/, etc.). Les rules Firestore autorisent-elles cette écriture ?
- C6 : **Cache Firestore** — Le `getDoc` utilise-t-il le cache IndexedDB ? Si oui, un vieux cache pourrait retourner des liens périmés

### GROUPE D — WhatsAppGroupScreen UX (6 agents)
**Agents D1-D6** : Audit de l'écran
- D1-D2 : **État loading** — Combien de temps dure-t-il ? Le `getWhatsAppGroupsConfig()` est-il lent (Firestore fetch) ?
- D3-D4 : **Cas "pas de groupe trouvé"** — Si `findGroupForUser` retourne `null`, le `useEffect` appelle `onContinue()` immédiatement → l'user ne voit JAMAIS l'écran WhatsApp. Est-ce intentionnel ? L'user est-il informé ?
- D5-D6 : **Deep link mobile** — Le `<a href>` ouvre-t-il WhatsApp ou le navigateur ? Que se passe-t-il si WhatsApp n'est pas installé ? Le `target` attribut est absent — est-ce intentionnel ?

### GROUPE E — Intégrations dans les pages d'inscription (6 agents)
**Agents E1-E6** : Audit de chaque page d'inscription
- E1 : **ChatterRegister.tsx** — Le `language` et `country` passés au WhatsAppGroupScreen viennent-ils du formulaire (`registrationData`) ou du profil user ? Sont-ils au bon format (ISO code) ?
- E2 : **InfluencerRegister.tsx** — Même vérification
- E3 : **BloggerRegister.tsx** — Même vérification (page de 1149 lignes, form inline)
- E4 : **GroupAdminRegister.tsx** — Même vérification
- E5 : **RegisterClient.tsx** — Le client a-t-il `country` et `language` dans son formulaire d'inscription ? Sinon, quelles valeurs sont passées ?
- E6 : **RegisterLawyer.tsx / RegisterExpat.tsx** — Les providers passent-ils leur `country` et `language` correctement ?

### GROUPE F — Mapping pays/langue/continent (6 agents)
**Agents F1-F6** : Audit des tables de mapping
- F1-F2 : **COUNTRY_TO_LANGUAGE** — Vérifier l'exhaustivité. Lister TOUS les pays ISO 3166-1 alpha-2 manquants. Vérifier que les mappings sont corrects (ex: `UA: 'en'` pour Ukraine → devrait être `uk` ou `en` ?)
- F3-F4 : **COUNTRY_TO_CONTINENT** — Vérifier l'exhaustivité. Lister les pays manquants. Vérifier les mappings controversés (ex: Russie en EU, Turquie en ME)
- F5-F6 : **Cas "ch" vs "zh"** — Le code normalise `ch → zh` dans `findGroupForUser`. Mais les pages d'inscription passent-elles `"ch"` ou `"zh"` ? Les traductions i18n utilisent quel code ?

### GROUPE G — Cloud Function `syncInviteLinks` (4 agents)
**Agents G1-G4** : Audit du sync
- G1 : **Architecture** : Baileys (WhatsApp) → Laravel (MySQL) → Firebase Function → Firestore. Chaque étape est-elle fonctionnelle ?
- G2 : **Le seed hardcodé dans la Cloud Function** vs **le seed hardcodé dans le frontend** — sont-ils identiques ? Y a-t-il des divergences ?
- G3 : **La Cloud Function ne re-enable JAMAIS les groupes désactivés** — Est-ce correct ? Si un admin désactive un groupe puis le sync met à jour le lien, le groupe reste désactivé
- G4 : **Fréquence d'appel** — Le sync est-il appelé par un cron ? Manuellement ? Jamais ? Si jamais, les liens ne sont jamais mis à jour

### GROUPE H — Admin UI & Configuration (4 agents)
**Agents H1-H4** : Audit de l'interface admin
- H1-H2 : **AdminWhatsAppGroups.tsx** — L'admin peut-il mettre à jour les liens facilement ? Le save fonctionne-t-il ? La validation `must start with https://chat.whatsapp.com/` est-elle correcte ?
- H3-H4 : **AdminWhatsAppSupervision.tsx** — Les managers sont-ils assignés correctement ? Le système de supervision est-il utilisé ?

---

## CAS DE TEST PRIORITAIRES

### Test 1 — Chatter francophone au Cameroun
```
Input: role="chatter", language="fr", country="CM"
Expected: continent=AF, countryLang=fr → Niveau 1 → "Chatter 🌍 Afrique 🇫🇷"
Link: https://chat.whatsapp.com/BYgasir1XX8F07kCDU4qC8
```

### Test 2 — Influencer hispanophone au Mexique
```
Input: role="influencer", language="es", country="MX"
Expected: pas de groupe continent pour influencer → Niveau 3 → "Influencer Español 🇪🇸"
Link: https://chat.whatsapp.com/IPnhUIprj4OIMebCRUkgNn
```

### Test 3 — Client arabophone en Arabie Saoudite
```
Input: role="client", language="ar", country="SA"
Expected: Niveau 3 → "Client Al-Arabiyya 🇸🇦"
Link: https://chat.whatsapp.com/Egwdyu1Pw4gFIIZ31gXEkJ
```

### Test 4 — Chatter germanophone en Allemagne
```
Input: role="chatter", language="de", country="DE"
Expected: continent=EU, lang=de, PAS de groupe continent DE
→ Niveau 2b → "Chatter 🇪🇺 Europe 🇬🇧" (fallback EN)
⚠️ L'user attend un groupe DE mais reçoit EN
```

### Test 5 — Blogueur chinois en Chine
```
Input: role="blogger", language="ch", country="CN"
Expected: lang normalisé ch→zh → Niveau 3 → "Blogger Zhongwen 🇨🇳"
Link: https://chat.whatsapp.com/HgFNzqjYLWqH5jBZhCAmEb
⚠️ WhatsApp est BLOQUÉ en Chine (VPN requis) → le lien ne fonctionnera jamais
```

### Test 6 — Expat dans un pays non mappé (Kosovo)
```
Input: role="expat", language="en", country="XK"
Expected: continent=undefined, countryLang=undefined
→ Niveau 3 → "Expatrié Aidant English 🇬🇧"
✅ Le fallback fonctionne
```

### Test 7 — GroupAdmin sans country
```
Input: role="groupAdmin", language="fr", country=""
Expected: continent=undefined, countryLang=undefined
→ Niveau 3 → "Group Admin Français 🇫🇷"
✅ Le fallback fonctionne
```

---

## FORMAT DE SORTIE ATTENDU

```markdown
## Agent [ID] — [Domaine]

### Findings

#### [P0/P1/P2/P3] — [Titre du bug/problème]
- **Fichier** : `chemin/fichier.ts:ligne`
- **Description** : Description précise
- **Impact** : Quels utilisateurs sont affectés (rôle, langue, pays)
- **Preuve** : Code ou donnée problématique
- **Solution** : Correction proposée
- **Tests** : Comment vérifier le fix

### Liens WhatsApp vérifiés (pour Groupe A uniquement)
| ID | Lien | Status | Commentaire |
|----|------|--------|-------------|
| chatter_af_fr | https://chat.whatsapp.com/XXX | ✅/❌ | Valide/Expiré/Révoqué |
```

---

## CHECKLIST FINALE

- [ ] Les 68 liens WhatsApp seed sont vérifiés (valides/expirés)
- [ ] Le document Firestore `admin_config/whatsapp_groups` existe en production
- [ ] Les Firestore rules autorisent la lecture pour les users authentifiés
- [ ] L'auto-seed fonctionne si le document est absent (permissions d'écriture ?)
- [ ] `findGroupForUser()` retourne le bon groupe pour chaque combinaison rôle/langue/pays
- [ ] Le code pays est passé en ISO 2 lettres MAJUSCULES au WhatsAppGroupScreen
- [ ] Le code langue est cohérent ("ch" vs "zh" traité correctement)
- [ ] COUNTRY_TO_LANGUAGE couvre tous les pays possibles du formulaire d'inscription
- [ ] COUNTRY_TO_CONTINENT couvre tous les pays possibles
- [ ] Le deep link `<a href>` ouvre WhatsApp sur mobile (pas le navigateur)
- [ ] Le cas "WhatsApp non installé" est géré (message d'erreur ou fallback)
- [ ] Le countdown 8s ne coupe pas l'utilisateur avant qu'il ait rejoint
- [ ] Le `syncInviteLinks` Cloud Function est déployé et appelé régulièrement
- [ ] Les types "langue" vs "language" sont cohérents entre Firestore et le frontend
- [ ] Le tracking `trackWhatsAppGroupClick` fonctionne (permissions Firestore)
- [ ] L'admin UI permet de mettre à jour les liens facilement
- [ ] Les 9 fichiers i18n ont toutes les clés `whatsapp.*` traduites
- [ ] Le WhatsAppBanner.tsx fonctionne sur les dashboards (pour rattraper les users ayant skip)
