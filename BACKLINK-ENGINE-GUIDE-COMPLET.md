# 🔗 Backlink Engine - Guide Complet

**Application déployée** : https://backlinks.life-expat.com
**Login** : williamsjullin@gmail.com
**Mot de passe** : MJMJsblanc19522008/*%$

---

## ✅ STATUT : APPLICATION FONCTIONNELLE

Tous les bugs ont été corrigés. L'application est prête à l'emploi !

---

## 📖 QU'EST-CE QUE BACKLINK ENGINE ?

Backlink Engine est un **système d'automatisation de netlinking** pour obtenir des backlinks de qualité vers vos contenus. C'est comme MailWizz pour le cold emailing, mais spécialisé pour le linkbuilding.

### Workflow complet :

```
PROSPECTS → ENRICHISSEMENT → CAMPAGNES → RÉPONSES → BACKLINKS OBTENUS → VÉRIFICATION
```

---

## 1️⃣ PROSPECTS - Sites web à contacter

**C'est quoi ?**
Base de données de sites web potentiels pour obtenir des backlinks.

**Comment les alimenter ?**
- ✅ Import CSV (bulk) via `/import`
- ✅ Ajout manuel rapide via `/quick-add`
- ✅ API d'ingestion `/api/ingest` (pour scrapers externes)
- ✅ Futur : Scraper automatique intégré

**Statuts d'un prospect :**
```
NEW
  ↓ (enrichissement auto)
ENRICHING
  ↓
READY_TO_CONTACT
  ↓ (ajout à une campagne)
CONTACTED_EMAIL
  ↓
REPLIED (intéressé)
  ↓
NEGOTIATING
  ↓
WON (accord obtenu)
  ↓
LINK_PENDING (en attente de placement)
  ↓
LINK_VERIFIED (backlink actif ✅)
```

**Champs clés :**
- `domain` : example.com (unique)
- `status` : Statut actuel
- `score` : 0-100 (qualité globale)
- `tier` : 1, 2 ou 3 (1 = premium)
- `category` : blogger, influencer, media, agency, corporate...
- `language` : fr, en, de, es, pt...
- `country` : FR, DE, ES...
- `mozDa` : Domain Authority Moz (0-100)
- `contactFormUrl` : URL du formulaire de contact détecté
- `hasCaptcha` : true/false (formulaire avec CAPTCHA)

---

## 2️⃣ ASSETS (RESOURCES LINKABLES) - Vos contenus

**C'est quoi ?**
Vos contenus à promouvoir pour obtenir des backlinks. C'est ce que vous allez proposer aux prospects.

**Types d'assets :**
- `blog-post` : Article de blog
- `guide` : Guide complet
- `tool` : Outil interactif
- `infographic` : Infographie
- `video` : Vidéo
- `calculator` : Calculateur
- `template` : Modèle téléchargeable

**Exemple concret pour SOS Expat :**

| Type | Titre | URL |
|------|-------|-----|
| guide | Guide complet expatriation France | https://sos-expat.com/guides/expatriation-france |
| tool | Calculateur coût de la vie | https://sos-expat.com/tools/cout-vie |
| template | Checklist déménagement international | https://sos-expat.com/templates/checklist |

**Pourquoi c'est important ?**
Quand vous contactez un prospect, vous ne demandez pas juste un lien. Vous proposez une **ressource de valeur** qu'ils peuvent citer/lier dans leur contenu.

---

## 3️⃣ TEMPLATES - Modèles d'emails personnalisés

**C'est quoi ?**
Templates d'emails pour automatiser l'outreach. Chaque template est personnalisé selon :
- **Langue** (fr, en, de...)
- **Purpose** (objectif du message)
- **Formality** (niveau de formalité)

**Variables disponibles :**
```
{{domain}}          → example.com
{{contactName}}     → Marie Dupont
{{siteName}}        → Blog de Marie
{{assetUrl}}        → https://sos-expat.com/guides/expatriation-france
{{assetTitle}}      → Guide complet expatriation France
{{backlinkUrl}}     → https://sos-expat.com (URL à linker)
{{yourName}}        → William Jullin (configuré dans Settings)
{{yourCompany}}     → SOS Expat (configuré dans Settings)
{{yourWebsite}}     → https://sos-expat.com (configuré dans Settings)
```

**Types de templates (Purpose) :**
- `INITIAL_OUTREACH` : Premier contact
- `FOLLOW_UP` : Relance si pas de réponse (J+3, J+7)
- `RECONTACT` : Re-contact après 6 mois (prospects perdus)
- `THANK_YOU` : Remerciement après acceptation
- `NEGOTIATION` : Négociation (tarif, conditions)

**Niveaux de formalité :**
- `formal` : Formel (Monsieur/Madame, vouvoiement strict)
  - *"Monsieur, Je vous prie d'agréer..."*
- `semi-formal` : Semi-formel (Bonjour + prénom, vouvoiement)
  - *"Bonjour Marie, Cordialement"*
- `informal` : Informel (tutoiement, décontracté)
  - *"Salut Marie, À bientôt"*

**Exemple de template INITIAL_OUTREACH (fr, semi-formal) :**
```
Objet : Proposition de collaboration - {{siteName}}

Bonjour {{contactName}},

Je suis tombé sur votre site {{domain}} et j'ai beaucoup apprécié
votre article sur l'expatriation.

Nous venons de publier un guide complet sur {{assetTitle}} qui pourrait
intéresser vos lecteurs : {{assetUrl}}

Seriez-vous intéressé(e) pour y faire référence dans un de vos prochains
articles ?

Bien cordialement,
{{yourName}}
{{yourCompany}} - {{yourWebsite}}
```

---

## 4️⃣ CAMPAGNES - Automation d'outreach

**C'est quoi ?**
Campagnes automatisées pour contacter des prospects en masse selon des critères précis.

**Configuration d'une campagne :**
- `name` : Nom (ex: "Q1 2026 - Bloggers FR")
- `language` : Langue cible (fr, en, de...)
- `targetTier` : Niveau ciblé (1, 2, 3 ou "tous")
- `targetCountry` : Pays ciblé (FR, DE, ES ou "tous")
- `targetCategory` : Catégorie (blogger, media... ou "tous")
- `mailwizzListUid` : ID de la liste MailWizz (optionnel)

**Auto-enrollment (inscription automatique) :**

Tous les **10 minutes**, un worker BullMQ vérifie les prospects avec :
- `status = READY_TO_CONTACT`
- Pas encore inscrits dans une campagne

Il les inscrit automatiquement dans les campagnes correspondant à leurs critères (langue, pays, tier).

**Exemple :**
```
Campagne : "Q1 2026 - Bloggers FR"
- language = "fr"
- targetTier = 1
- targetCategory = "blogger"

→ Tous les prospects FR, tier 1, blogger, avec status READY_TO_CONTACT
  sont automatiquement inscrits dans cette campagne.
```

**Intégration MailWizz :**
1. Les contacts sont synchronisés avec MailWizz (plateforme d'emailing)
2. MailWizz gère l'envoi des emails selon les templates et séquences
3. Les réponses sont détectées via IMAP (toutes les 5 min)
4. Une IA catégorise automatiquement les réponses

---

## 5️⃣ RÉPONSES (REPLIES) - Analyse automatique des réponses

**C'est quoi ?**
Emails reçus des prospects, analysés et catégorisés **automatiquement par IA** (GPT-4o-mini).

**Catégories auto-détectées :**

| Catégorie | Emoji | Signification | Action recommandée |
|-----------|-------|---------------|-------------------|
| INTERESTED | 🎉 | Prospect intéressé | Envoyer détails et conditions |
| NOT_INTERESTED | ❌ | Refus poli | Marquer LOST, suggérer recontact dans 6 mois |
| ASKING_PRICE | 💰 | Demande de tarif | Envoyer grille tarifaire |
| ASKING_QUESTIONS | 💬 | Questions diverses | Répondre aux questions |
| ALREADY_LINKED | 🔗 | Lien déjà existant | Vérifier et créer le backlink manuellement |
| OUT_OF_OFFICE | 📅 | Absence bureau | Relancer dans 2 semaines |
| BOUNCE | ⚠️ | Email invalide | Marquer contact invalide, chercher nouvel email |
| UNSUBSCRIBE | 🚫 | Désabonnement | Opt-out immédiat + ajouter à suppression list |
| SPAM | 🗑️ | Spam/insulte | Ignorer et blacklister |
| OTHER | 🤷 | Autre | Traiter manuellement |

**Champs d'une réponse :**
- `summary` : Résumé IA de la réponse (1-2 phrases)
- `fullText` : Texte complet de l'email
- `confidence` : Niveau de confiance de l'IA (0-100%)
- `suggestedAction` : Action recommandée par l'IA
- `isHandled` : Marqué comme traité (true/false)

**Workflow :**
1. Email reçu → Détecté par IMAP worker (toutes les 5 min)
2. IA analyse le contenu → Catégorise automatiquement
3. Génère résumé + action recommandée
4. Affiche dans `/replies` avec pastille de couleur
5. Utilisateur clique "Marquer traité" après action

---

## 6️⃣ BACKLINKS - Liens obtenus

**C'est quoi ?**
Liens pointant vers vos contenus (assets) sur des sites tiers.

**Champs clés :**
- `prospectId` : ID du site qui héberge le lien
- `assetId` : ID de votre contenu linké
- `sourceUrl` : Page où se trouve le lien
- `targetUrl` : URL de votre contenu (ex: https://sos-expat.com/guides/france)
- `anchorText` : Texte d'ancre du lien (ex: "guide expatriation")
- `linkType` : dofollow, nofollow, sponsored, ugc, mixed
- `isLive` : Lien actif (true) ou perdu (false)
- `firstSeenAt` : Date de première détection
- `lastVerifiedAt` : Date de dernière vérification
- `lostAt` : Date de perte du lien (si applicable)

**Vérification automatique :**

Un worker BullMQ vérifie **tous les dimanches à 2h00 UTC** si les backlinks sont toujours présents :
1. Récupère la page source (sourceUrl)
2. Vérifie la présence du lien vers targetUrl
3. Met à jour `isLive` et `lastVerifiedAt`
4. Si perdu : enregistre `lostAt` et envoie notification Telegram (optionnel)

---

## 7️⃣ RECONTACT - Re-contact automatique

**C'est quoi ?**
Suggestions de re-contact pour prospects non répondus après X mois.

**Critères (configurables dans Settings) :**
- **Délai minimum** : 6 mois par défaut
- **Score minimum** : 50/100 par défaut
- **Maximum de recontacts** : 3 fois par défaut

**Logique :**
Les prospects avec :
- `status = LOST` ou `NOT_INTERESTED`
- Dernièr contact > 6 mois
- `score >= 50`
- Nombre de recontacts < 3

→ Apparaissent dans `/recontact` comme suggestions.

**Workflow :**
1. Page `/recontact` affiche les suggestions
2. Cliquer "Re-contacter" inscrit le prospect dans une campagne de type RECONTACT
3. Template RECONTACT est utilisé (plus doux, reconnaît le contact précédent)

---

## 🛠️ PARAMÈTRES (SETTINGS)

### 1. Configuration Outreach (Variables globales)

Utilisées dans tous les templates :
- `yourName` : Votre nom (ex: William Jullin)
- `yourCompany` : Votre entreprise (ex: SOS Expat)
- `yourWebsite` : Votre site (ex: https://sos-expat.com)
- `contactEmail` : Email de contact (ex: contact@sos-expat.com)
- `contactPhone` : Téléphone (ex: +33 6 12 34 56 78)

### 2. Configuration MailWizz

Pour l'envoi automatique d'emails :
- `apiUrl` : URL de l'API MailWizz (ex: https://mailwizz.com/api)
- `apiKey` : Clé API MailWizz
- `listUids` : IDs des listes par langue
  ```
  fr=abc123
  en=def456
  de=ghi789
  ```

### 3. Configuration IMAP (Détection des réponses)

- `host` : Serveur IMAP (ex: imap.gmail.com)
- `port` : Port (993 pour SSL/TLS)
- `user` : Email (ex: replies@life-expat.com)
- `pass` : Mot de passe ou app password

### 4. Scoring (Seuils de qualité)

- `minScoreForContact` : Score minimum pour contacter (défaut : 40)
- `minDaForContact` : DA minimum pour contacter (défaut : 10)
- `neighborhoodThreshold` : Seuil de voisinage de liens (défaut : 30)

### 5. Recontact

- `delayMonths` : Délai avant recontact (défaut : 6 mois)
- `maxRecontacts` : Nombre max de recontacts (défaut : 3)
- `minScoreForRecontact` : Score min pour recontact (défaut : 50)

### 6. IA (OpenAI GPT-4o-mini)

- `enabled` : Activer l'IA (true/false)
- `provider` : openai (seul supporté actuellement)
- `apiKey` : Clé API OpenAI (sk-...)

### 7. Notifications Telegram

Recevez des alertes en temps réel :
- `enabled` : Activer les notifications
- `botToken` : Token du bot Telegram (obtenu via @BotFather)
- `chatId` : ID du chat Telegram (obtenu via @userinfobot)
- **Événements à notifier :**
  - ✅ Prospect intéressé (INTERESTED)
  - ✅ Deal conclu (WON)
  - ✅ Backlink perdu (isLive false)
  - Backlink vérifié (optionnel, peut être bruyant)

**Comment configurer Telegram :**
1. Créer un bot avec @BotFather → Obtenir bot token
2. Démarrer conversation avec votre bot
3. Envoyer message à @userinfobot → Obtenir votre chat ID
4. Sauvegarder et cliquer "Envoyer Test" pour vérifier

---

## 📊 REPORTS - Tableaux de bord

**Graphiques disponibles :**

1. **Backlinks par mois** (Line chart)
   - Évolution du nombre de backlinks obtenus chaque mois
   - Permet de voir la croissance de votre netlinking

2. **Pipeline funnel** (Bar chart)
   - Répartition des prospects par statut
   - Visualise le tunnel de conversion

3. **Taux de réponse par campagne** (Bar chart)
   - % de réponses par campagne
   - Identifie les campagnes les plus performantes

4. **Prospects par source** (Pie chart)
   - Répartition : manual, csv_import, scraper
   - Identifie les sources les plus efficaces

5. **Prospects par pays** (Horizontal bar chart)
   - Top 20 pays
   - Identifie les marchés prioritaires

**Métriques globales :**
- Total prospects
- Total backlinks
- Backlinks actifs (isLive = true)
- Total campagnes
- Total réponses
- Total gagnés (WON status)

---

## 🤖 WORKERS AUTOMATIQUES (BullMQ)

### 1. Enrichment Worker
**Fréquence** : Toutes les 5 minutes
**Rôle** : Enrichit les nouveaux prospects
- Détecte la langue via franc + HTML lang attribute
- Calcule le score de qualité
- Récupère le DA Moz (si API configurée)
- Détecte le formulaire de contact
- Passe le status de NEW → ENRICHING → READY_TO_CONTACT

### 2. Auto-Enrollment Worker
**Fréquence** : Toutes les 10 minutes
**Rôle** : Inscrit automatiquement les prospects dans les campagnes
- Cherche prospects avec status = READY_TO_CONTACT
- Trouve la meilleure campagne correspondante (langue, tier, pays, catégorie)
- Crée l'enrollment (inscription)
- Crée un event "ENROLLED"

### 3. Outreach Worker
**Fréquence** : À la demande (retry-failed jobs toutes les heures)
**Rôle** : Synchronise les contacts avec MailWizz
- Ajoute/met à jour les subscribers dans MailWizz
- Gère les échecs et retry automatique
- Enregistre les subscriber UIDs

### 4. Reply Worker
**Fréquence** : Toutes les 5 minutes
**Rôle** : Détecte et catégorise les réponses
- Se connecte à IMAP
- Récupère les nouveaux emails
- Envoie à l'IA pour analyse
- Catégorise et génère résumé + action
- Crée un event "REPLY_CLASSIFIED"
- Met à jour le status du prospect

### 5. Verification Worker
**Fréquence** : Tous les dimanches à 2h00 UTC (backlinks) et 3h00 UTC (link loss)
**Rôle** : Vérifie que les backlinks sont toujours présents
- Récupère la page source
- Vérifie la présence du lien
- Met à jour isLive et lastVerifiedAt
- Si perdu : enregistre lostAt et envoie notification Telegram

### 6. Reporting Worker
**Fréquence** : Tous les jours à 23h59 UTC
**Rôle** : Génère les rapports et statistiques quotidiennes
- Agrège les données de la journée
- Calcule les métriques
- Prépare les graphiques pour la page /reports

---

## 🚀 WORKFLOW COMPLET - EXEMPLE PRATIQUE

### Cas d'usage : Obtenir un backlink pour un guide SOS Expat

#### Étape 1 : Créer un asset
```
Page : /assets
Action : Cliquer "+ Nouvelle Ressource"

Champs :
- Titre : Guide complet expatriation France
- Type : guide
- URL : https://sos-expat.com/guides/expatriation-france
- Publié : ✓
```

#### Étape 2 : Importer des prospects
```
Page : /import
Action : Upload CSV avec colonnes : domain, email, name

Exemple CSV :
domain,email,name
blog-expatrie.fr,contact@blog-expatrie.fr,Marie Dupont
vie-a-letranger.com,hello@vie-a-letranger.com,Pierre Martin
```

#### Étape 3 : Enrichissement automatique
```
Les prospects passent automatiquement :
NEW → ENRICHING (worker détecte langue, score, DA) → READY_TO_CONTACT
```

#### Étape 4 : Créer une campagne
```
Page : /campaigns
Action : "+ Nouvelle Campagne"

Champs :
- Nom : Q1 2026 - Bloggers FR
- Langue : Français (fr)
- Target Tier : Tous
- Target Country : FR
```

#### Étape 5 : Auto-enrollment
```
Worker auto-enrollment (toutes les 10 min) :
- Trouve les prospects FR avec status = READY_TO_CONTACT
- Les inscrit automatiquement dans "Q1 2026 - Bloggers FR"
- Change leur status → CONTACTED_EMAIL
```

#### Étape 6 : MailWizz envoie les emails
```
MailWizz (externe) :
- Récupère les nouveaux subscribers
- Envoie le template INITIAL_OUTREACH personnalisé
- J+3 : Envoie FOLLOW_UP si pas de réponse
- J+7 : Envoie FOLLOW_UP #2 si pas de réponse
```

#### Étape 7 : Réception et analyse des réponses
```
Reply Worker (toutes les 5 min) :
- Se connecte à IMAP (replies@life-expat.com)
- Détecte nouvel email de blog-expatrie.fr
- IA analyse : "Bonjour, oui je suis intéressé, quel est le tarif ?"
- Catégorise : ASKING_PRICE
- Résumé : "Prospect intéressé, demande le tarif"
- Action : "Envoyer la grille tarifaire"
- Change status prospect → REPLIED
```

#### Étape 8 : Négociation et accord
```
Vous (manuellement) :
- Consultez /replies
- Voyez la réponse catégorisée ASKING_PRICE
- Répondez à Marie avec votre tarif
- Marie accepte !
- Mettez à jour le prospect : status → WON
```

#### Étape 9 : Placement du lien
```
Marie place le lien sur son blog.

Vous (manuellement) :
- Allez sur /backlinks
- Cliquez "+ Nouveau Backlink"
- Champs :
  - Prospect : blog-expatrie.fr
  - Asset : Guide complet expatriation France
  - Source URL : https://blog-expatrie.fr/article-mentionnant-guide
  - Target URL : https://sos-expat.com/guides/expatriation-france
  - Anchor Text : guide expatriation
  - Link Type : dofollow
```

#### Étape 10 : Vérification automatique
```
Verification Worker (dimanche 2h00) :
- Récupère https://blog-expatrie.fr/article-mentionnant-guide
- Vérifie la présence du lien vers sos-expat.com/guides/expatriation-france
- Si présent : isLive = true, lastVerifiedAt = now
- Si absent : isLive = false, lostAt = now, notification Telegram
```

---

## 🎯 BONNES PRATIQUES

### 1. Scoring des prospects
- **Tier 1** (90-100) : Sites premium (gros médias, DA > 60)
- **Tier 2** (60-89) : Sites bons (blogs établis, DA 30-60)
- **Tier 3** (40-59) : Sites acceptables (petits blogs, DA < 30)
- < 40 : Ne pas contacter

### 2. Templates efficaces
- **Personnalisez** : Mentionnez un article spécifique du prospect
- **Apportez de la valeur** : Proposez une ressource utile, pas juste "link moi"
- **Soyez bref** : 3-4 paragraphes maximum
- **Call-to-action clair** : "Seriez-vous intéressé ?"

### 3. Campagnes
- **Une campagne par segment** : "Bloggers FR Q1", "Media DE Q1", etc.
- **Ne surchargez pas** : Max 50-100 prospects par campagne
- **Testez A/B** : Créez 2 campagnes avec templates différents, comparez les taux de réponse

### 4. Gestion des réponses
- **Traitez rapidement** : Répondez dans les 24h max
- **Marquez "Traité"** : Pour garder /replies propre
- **Notez les insights** : Utilisez les events pour tracer l'historique

### 5. Suivi des backlinks
- **Vérifiez manuellement** : Ne comptez pas QUE sur le worker
- **Contactez si perdu** : Si backlink perdu, demandez poliment pourquoi
- **Diversifiez les anchors** : Variez les textes d'ancre

---

## 🐛 BUGS CORRIGÉS

### ✅ Bug #1 : Pages Settings et Reports blanches
**Cause** : Le backend retournait uniquement une session cookie, pas de token JWT. Le frontend attendait un token.
**Solution** : Ajout du champ `token` dans la réponse de `/api/auth/login`.

**Commit** : `e21e8e4` - "fix(auth): add token field to login response schema"

---

## 💡 AMÉLIORATIONS FUTURES

### Court terme (1-2 semaines)
- [ ] Scraper automatique intégré (Puppeteer)
- [ ] Détection auto des emails via Hunter.io
- [ ] Tableau de bord metrics (KPIs en temps réel)
- [ ] Export CSV des backlinks

### Moyen terme (1 mois)
- [ ] Gestion multi-utilisateurs (team)
- [ ] Webhooks pour intégrations tierces
- [ ] Templates AI-generated (GPT-4)
- [ ] A/B testing de templates

### Long terme (3+ mois)
- [ ] Chrome extension pour quick-add
- [ ] Mobile app (React Native)
- [ ] Marketplace de templates
- [ ] Intégration Zapier/Make

---

## 📝 SUPPORT ET CONTACT

**Documentation** : Ce fichier
**Bugs** : Contactez williamsjullin@gmail.com
**Améliorations** : Suggérez vos idées !

---

**Dernière mise à jour** : 2026-02-15
**Version** : 1.0.0 - Production Ready ✅
