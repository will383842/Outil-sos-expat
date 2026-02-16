# Backlink Engine - Documentation Fonctionnelle

**Date** : 2026-02-15
**Déployé sur** : https://backlinks.life-expat.com
**Login** : williamsjullin@gmail.com / MJMJsblanc19522008/*%$

---

## 📋 STATUT ACTUEL - TEST EN DIRECT

### Pages Fonctionnelles ✅
- **Login** : ✅ Fonctionne parfaitement
- **Dashboard** : ✅ À tester
- **Prospects** : ✅ À tester
- **Campagnes** : ✅ À tester
- **Templates** : ✅ À tester
- **Assets** (Resources Linkables) : ✅ À tester
- **Backlinks** : ✅ À tester
- **Réponses** (Replies) : ✅ À tester
- **Recontact** : ✅ À tester

### Pages avec Problèmes ⚠️
- **Paramètres** (Settings) : ⚠️ Page blanche (erreur 401)
- **Reports** : ⚠️ Page blanche (erreur 401)

---

## 🔍 WORKFLOW BACKLINK ENGINE

### 1️⃣ PROSPECTS - Sites web à contacter
**C'est quoi ?** Base de données de sites web potentiels pour obtenir des backlinks.

**Comment sont-ils alimentés ?**
- Import CSV (bulk)
- Ajout manuel (quick-add)
- API d'ingestion (`/api/ingest`)
- Scraper automatique

**Champs clés :**
- `domain` : Nom de domaine unique
- `status` : Statut du prospect (NEW → CONTACTED → REPLIED → WON → LINK_VERIFIED)
- `score` : Score de qualité (0-100)
- `tier` : Niveau (1 = premium, 2 = bon, 3 = acceptable)
- `category` : Type (blogger, influencer, media, agency, etc.)
- `language` : Langue du site (fr, en, de, es, etc.)
- `country` : Pays (FR, DE, ES, etc.)
- `mozDa` : Domain Authority Moz
- `contactFormUrl` : URL du formulaire de contact détecté

**Statuts disponibles :**
```
NEW → ENRICHING → READY_TO_CONTACT → CONTACTED_EMAIL → REPLIED →
NEGOTIATING → WON → LINK_PENDING → LINK_VERIFIED → LINK_LOST
```

---

### 2️⃣ ASSETS (Resources Linkables)
**C'est quoi ?** Vos contenus à promouvoir pour obtenir des backlinks.

**Types d'assets :**
- `blog-post` : Article de blog
- `guide` : Guide complet
- `tool` : Outil interactif
- `infographic` : Infographie
- `video` : Vidéo
- `calculator` : Calculateur
- `template` : Modèle téléchargeable

**Exemple concret pour SOS Expat :**
- "Guide complet pour s'expatrier en France" (https://sos-expat.com/guides/expatriation-france)
- "Calculateur de coût de la vie" (https://sos-expat.com/tools/cout-vie)
- "Checklist déménagement international" (https://sos-expat.com/templates/checklist)

**Utilisation :** Quand vous contactez un prospect, vous proposez un lien vers un de vos assets.

---

### 3️⃣ TEMPLATES - Modèles d'emails
**C'est quoi ?** Templates personnalisés pour automatiser l'outreach.

**Variables disponibles :**
- `{{domain}}` : Nom du site prospect
- `{{contactName}}` : Nom du contact
- `{{siteName}}` : Nom du site prospect
- `{{assetUrl}}` : URL de votre contenu
- `{{assetTitle}}` : Titre de votre contenu
- `{{backlinkUrl}}` : URL demandée pour le backlink
- `{{yourName}}` : Votre nom (configuré dans Settings)
- `{{yourCompany}}` : Votre entreprise (configuré dans Settings)
- `{{yourWebsite}}` : Votre site web (configuré dans Settings)

**Types de templates (Purpose) :**
- `INITIAL_OUTREACH` : Premier contact
- `FOLLOW_UP` : Relance si pas de réponse
- `RECONTACT` : Re-contact après 6 mois
- `THANK_YOU` : Remerciement après acceptation
- `NEGOTIATION` : Négociation (tarif, conditions)

**Formality Level :**
- `formal` : Formel (Monsieur, Madame, Je vous prie d'agréer...)
- `semi-formal` : Semi-formel (Bonjour [Prénom], Cordialement)
- `informal` : Informel (Salut, À bientôt)

---

### 4️⃣ CAMPAGNES - Automation d'outreach
**C'est quoi ?** Campagnes automatisées pour contacter des prospects en masse.

**Configuration d'une campagne :**
- `name` : Nom de la campagne (ex: "Q1 French Bloggers")
- `language` : Langue cible (fr, en, de...)
- `targetTier` : Niveau ciblé (1, 2, 3 ou "tous")
- `targetCountry` : Pays ciblé (FR, DE, ES ou "tous")
- `targetCategory` : Catégorie ciblée (blogger, media, etc. ou "tous")

**Enrollment automatique :**
Les prospects avec `status = READY_TO_CONTACT` sont automatiquement ajoutés aux campagnes correspondant à leurs critères (langue, pays, tier).

**Intégration MailWizz :**
- Les contacts sont synchronisés avec MailWizz (plateforme d'emailing)
- MailWizz gère l'envoi des emails selon les templates
- Les réponses sont détectées via IMAP et catégorisées par IA

---

### 5️⃣ BACKLINKS - Liens obtenus
**C'est quoi ?** Liens pointant vers vos contenus sur des sites tiers.

**Champs clés :**
- `targetUrl` : URL de votre contenu (asset)
- `anchorText` : Texte d'ancre du lien
- `linkType` : Type (dofollow, nofollow, sponsored, ugc, mixed)
- `isLive` : Lien actif ou perdu
- `firstSeenAt` : Date de première détection
- `lastVerifiedAt` : Date de dernière vérification
- `lostAt` : Date de perte du lien (si applicable)

**Vérification automatique :**
Un worker BullMQ vérifie périodiquement si les backlinks sont toujours présents.

---

### 6️⃣ RÉPONSES (Replies)
**C'est quoi ?** Emails reçus des prospects, analysés automatiquement par IA.

**Catégories auto-détectées :**
- `INTERESTED` 🎉 : Prospect intéressé (action : envoyer détails)
- `NOT_INTERESTED` ❌ : Refus (action : marquer perdu)
- `ASKING_PRICE` 💰 : Demande de tarif (action : envoyer grille tarifaire)
- `ASKING_QUESTIONS` 💬 : Questions (action : répondre)
- `ALREADY_LINKED` 🔗 : Lien déjà existant (vérifier)
- `OUT_OF_OFFICE` 📅 : Absence (relancer plus tard)
- `BOUNCE` ⚠️ : Email invalide (marquer contact invalide)
- `UNSUBSCRIBE` 🚫 : Désabonnement (opt-out immédiat)
- `SPAM` 🗑️ : Spam (ignorer)
- `OTHER` 🤷 : Autre (traiter manuellement)

**Champs :**
- `summary` : Résumé IA de la réponse
- `fullText` : Texte complet
- `confidence` : Niveau de confiance de l'IA (0-100%)
- `suggestedAction` : Action recommandée par l'IA

---

### 7️⃣ RECONTACT - Re-contact automatique
**C'est quoi ?** Suggestions de re-contact pour prospects non répondus.

**Critères :**
- Délai minimum : 6 mois (configurable dans Settings)
- Score minimum : 50/100 (configurable)
- Maximum de recontacts : 3 fois (configurable)

**Logique :**
Les prospects avec `status = LOST` ou `NOT_INTERESTED` depuis > 6 mois et `score >= 50` sont suggérés pour recontact.

---

## 🛠️ PARAMÈTRES (Settings)

### Configuration Outreach
Variables globales utilisées dans les templates :
- `yourName` : Votre nom
- `yourCompany` : Votre entreprise (ex: SOS Expat)
- `yourWebsite` : Votre site (ex: https://sos-expat.com)
- `contactEmail` : Email de contact
- `contactPhone` : Téléphone

### Configuration MailWizz
- `apiUrl` : URL de l'API MailWizz
- `apiKey` : Clé API
- `listUids` : IDs des listes par langue (fr=abc123, en=def456...)

### Configuration IMAP (Détection des réponses)
- `host` : Serveur IMAP (ex: imap.gmail.com)
- `port` : Port (993 pour SSL)
- `user` : Email
- `pass` : Mot de passe

### Scoring (Seuils de qualité)
- `minScoreForContact` : Score minimum pour contacter (défaut : 40)
- `minDaForContact` : DA minimum (défaut : 10)
- `neighborhoodThreshold` : Seuil de voisinage de liens (défaut : 30)

### Recontact
- `delayMonths` : Délai avant recontact (défaut : 6 mois)
- `maxRecontacts` : Nombre max de recontacts (défaut : 3)
- `minScoreForRecontact` : Score min pour recontact (défaut : 50)

### IA (OpenAI GPT-4o-mini)
- `enabled` : Activer l'IA
- `provider` : Fournisseur (openai)
- `apiKey` : Clé API OpenAI

### Notifications Telegram
- `enabled` : Activer les notifications
- `botToken` : Token du bot Telegram
- `chatId` : ID du chat Telegram
- `events` : Événements à notifier :
  - Prospect intéressé
  - Deal conclu
  - Backlink perdu
  - Backlink vérifié

---

## 📊 REPORTS - Tableaux de bord

### Graphiques disponibles :
1. **Backlinks par mois** (Line chart)
2. **Pipeline funnel** (Bar chart - statuts des prospects)
3. **Taux de réponse par campagne** (Bar chart)
4. **Prospects par source** (Pie chart)
5. **Prospects par pays** (Horizontal bar chart)

### Métriques :
- Total prospects
- Total backlinks
- Backlinks actifs
- Total campagnes
- Total réponses
- Total gagnés (WON)

---

## 🤖 WORKERS AUTOMATIQUES (BullMQ)

### 1. Enrichment Worker
**Fréquence :** Toutes les 5 minutes
**Rôle :** Enrichit les nouveaux prospects (détection langue, score, DA, etc.)

### 2. Auto-Enrollment Worker
**Fréquence :** Toutes les 10 minutes
**Rôle :** Inscrit automatiquement les prospects READY_TO_CONTACT dans les campagnes

### 3. Outreach Worker
**Rôle :** Synchronise les contacts avec MailWizz

### 4. Reply Worker
**Fréquence :** Toutes les 5 minutes
**Rôle :** Vérifie les nouveaux emails IMAP et les catégorise via IA

### 5. Verification Worker
**Fréquence :** Quotidien
**Rôle :** Vérifie que les backlinks sont toujours présents

### 6. Reporting Worker
**Rôle :** Génère les rapports et statistiques

---

## 🚨 BUGS À CORRIGER

### ⚠️ Pages blanches (Settings & Reports)
**Cause probable :** Erreur 401 non gérée côté frontend
**Solution :** Ajouter gestion d'erreur dans les composants React

---

## ✅ À FAIRE

- [ ] Corriger pages blanches Settings et Reports
- [ ] Tester toutes les fonctionnalités déployées
- [ ] Vérifier l'UX et la logique métier
- [ ] Documenter chaque fonctionnalité testée

