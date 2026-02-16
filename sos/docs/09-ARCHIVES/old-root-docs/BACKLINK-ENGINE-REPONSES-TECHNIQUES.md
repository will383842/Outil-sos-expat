# Backlink Engine - Réponses aux Questions Techniques

## 1️⃣ DÉDUPLICATION - CSV et Scraping

### ✅ OUI, déduplication automatique !

**Code source** : `src/services/ingestion/ingestService.ts` (lignes 90-122)

```typescript
// Vérifie si le domaine existe déjà
const existing = await prisma.prospect.findUnique({
  where: { domain },
});

if (existing) {
  return {
    status: "duplicate",
    prospectId: existing.id,
    existingStatus: existing.status,
  };
}
```

**Comportement :**
- ✅ **Import CSV** : Les doublons sont détectés et ignorés
- ✅ **Scraping** : Pareil, doublons ignorés
- ✅ **Manual add** : Pareil
- 📝 **Bonus** : Si une nouvelle `sourceUrl` est trouvée pour un domaine existant, elle est ajoutée (mais pas de duplicate prospect)

**Résultat d'import :**
```json
{
  "total": 100,
  "created": 75,
  "duplicates": 23,
  "errors": 2,
  "details": [...]
}
```

**Conclusion** : Vous pouvez importer le même CSV 10 fois, aucun doublon ne sera créé. ✅

---

## 2️⃣ TEMPLATES & CAMPAGNES - DEUX SYSTÈMES DISTINCTS

### 🚨 ATTENTION : Confusion dans la doc !

Il y a **2 types de templates complètement différents** :

### A. OutreachTemplates (`/templates`) - POUR MAILWIZZ (emails auto)

**Page** : `/templates`
**Backend** : `src/api/routes/templates.ts`
**Usage** : Emails automatiques via MailWizz

**Champs :**
- `name` : Nom du template
- `language` : fr, en, de...
- `purpose` : INITIAL_OUTREACH, FOLLOW_UP, RECONTACT, THANK_YOU, NEGOTIATION
- `subject` : Sujet de l'email
- `body` : Corps de l'email
- `formalityLevel` : formal, semi-formal, informal
- `culturalNotes` : Notes culturelles (ex: "En Allemagne, toujours utiliser Herr/Frau")

**Variables disponibles :**
```
{{domain}}
{{contactName}}
{{siteName}}
{{assetUrl}}
{{assetTitle}}
{{backlinkUrl}}
```

**Workflow :**
1. Vous créez une campagne "Bloggers FR Q1"
2. Prospects inscrits automatiquement → MailWizz
3. MailWizz envoie les emails selon les OutreachTemplates
4. Séquence auto : INITIAL_OUTREACH (J0) → FOLLOW_UP (J+3) → FOLLOW_UP (J+7)

---

### B. MessageTemplates (`/message-templates`) - POUR FORMULAIRES DE CONTACT (manuel)

**Page** : `/message-templates` (existe dans le code !)
**Backend** : `src/api/routes/messageTemplates.ts`
**Frontend** : `src/pages/MessageTemplates.tsx`
**Usage** : Formulaires de contact (copier/coller manuel)

**Champs :**
- `language` : fr, en, de...
- `category` : null (général), blogger, media, influencer, association...
- `subject` : Sujet du message
- `body` : Corps du message
- `isDefault` : Template par défaut pour cette langue

**Variables disponibles :**
```
{siteName}
{yourName}
{yourCompany}
{yourWebsite}
```

**Workflow :**
1. Vous préparez vos templates pour chaque langue/catégorie
2. Prospect avec formulaire de contact → Vous allez sur `/message-templates`
3. Sélectionnez langue (fr) et catégorie (blogger)
4. Template s'affiche pré-rempli avec variables remplacées
5. ❌ **PROBLÈME** : Pas de bouton "Copier" visible ! Il faut Ctrl+C manuel

---

### 📊 RÉCAPITULATIF - Quand utiliser quoi ?

| Situation | Système à utiliser | Automatique ? |
|-----------|-------------------|---------------|
| Prospect avec email valide | **OutreachTemplates** + MailWizz | ✅ OUI (auto) |
| Prospect avec formulaire de contact | **MessageTemplates** (copier/coller) | ❌ NON (manuel) |
| Prospect avec email invalide | **MessageTemplates** (formulaire) | ❌ NON (manuel) |
| Campagne de masse (100+ prospects) | **OutreachTemplates** + MailWizz | ✅ OUI (auto) |

---

### 🔗 MAILWIZZ vs FORMULAIRES - TOTALEMENT INDÉPENDANTS

**Vous avez raison !** Ce sont 2 canaux complètement séparés :

#### Canal 1 : MailWizz (emails directs)
- Prospect doit avoir un email valide
- Emails envoyés automatiquement par MailWizz
- Séquences automatiques (follow-ups)
- Réponses détectées via IMAP
- Worker "Outreach" synchronise avec MailWizz
- ✅ **Automatique**

#### Canal 2 : Formulaires de contact
- Prospect a un formulaire de contact (pas d'email visible)
- Vous remplissez le formulaire manuellement
- Copier/coller depuis MessageTemplates
- Aucune détection de réponse (ils répondent à votre email perso)
- ❌ **Manuel**

**Statistiques (estimation) :**
- ~30% des prospects ont un email public valide → MailWizz
- ~70% ont seulement un formulaire de contact → Manuel

---

## 3️⃣ DÉTECTION AUTOMATIQUE DES BACKLINKS PLACÉS

### ❌ NON, PAS DE DÉTECTION AUTO DES NOUVEAUX BACKLINKS !

**Ce qui existe actuellement :**
- ✅ Vérification des backlinks **déjà enregistrés** (dimanche 2h00)
- ❌ Détection de **nouveaux** backlinks placés

**Problème pour 200 prospects/jour :**
Vous avez totalement raison, c'est **INGÉRABLE MANUELLEMENT** !

**Workflow actuel (manuel) :**
1. Prospect répond "OK j'ai placé le lien"
2. Vous allez sur son site manuellement
3. Vous cherchez l'article où il a placé le lien
4. Vous copiez l'URL de la page
5. Vous allez sur `/backlinks` → "+ Nouveau Backlink"
6. Vous remplissez :
   - Prospect : blog-expatrie.fr
   - Asset : Guide expatriation
   - Source URL : https://blog-expatrie.fr/article-123
   - Target URL : https://sos-expat.com/guides/france
   - Anchor Text : guide expatriation
   - Link Type : dofollow

**Temps estimé** : 2-3 minutes par backlink

**Pour 200 prospects/jour → 20 backlinks/jour → 40-60 min/jour** 😱

---

### 💡 SOLUTIONS POSSIBLES

#### Solution 1 : Semi-automatique (RECOMMANDÉ)
**Ajout d'une fonctionnalité "Backlink Detector"**

Quand un prospect répond "OK j'ai placé le lien" :
1. Marquez le prospect comme WON
2. Un worker crawle automatiquement toutes les pages du site
3. Cherche les liens vers vos domaines (sos-expat.com, life-expat.com...)
4. **Suggère** les backlinks trouvés dans une liste
5. Vous validez en 1 clic (ou rejetez)

**Temps gagné** : 2 min → 10 secondes ⚡

**Implémentation** :
- Nouveau worker : `backlinkDetectorWorker.ts`
- Crawl avec Cheerio (déjà installé)
- Stocke les suggestions dans `suggested_backlinks` table
- Page `/backlinks/suggestions` pour valider

#### Solution 2 : Entièrement manuelle avec aide
**Ajout d'un bouton "Ajouter depuis URL"**

Sur la page prospect WON :
1. Bouton "🔍 Détecter backlinks"
2. Vous collez l'URL de l'article
3. Le système crawle JUSTE cette page
4. Détecte automatiquement :
   - Target URL (vos liens trouvés)
   - Anchor Text
   - Link Type (dofollow/nofollow)
5. Pré-remplit le formulaire
6. Vous validez

**Temps gagné** : 2 min → 30 secondes

#### Solution 3 : Automatique complet (OVERKILL pour début)
**Crawler continu de tous les prospects WON**

- Worker tourne 24/7
- Crawle tous les sites des prospects WON toutes les semaines
- Détecte automatiquement les nouveaux backlinks
- Les ajoute directement (confiance totale)

**Risque** : Faux positifs, charge serveur élevée

---

### 🎯 MA RECOMMANDATION

**Pour démarrer (maintenant) :**
- Utilisez le système manuel actuel
- Focus sur 10-20 prospects premium par jour (pas 200)
- Qualité > Quantité

**Court terme (2 semaines) :**
- J'implémente la Solution 2 (bouton "Détecter backlinks depuis URL")
- Temps divisé par 4

**Moyen terme (1 mois) :**
- J'implémente la Solution 1 (détection auto + suggestions)
- Quasi automatique

**Voulez-vous que j'implémente la Solution 2 maintenant ?** (2h de dev)

---

## 4️⃣ ENROLLMENT SANS MAILWIZZ - MISE EN ATTENTE

### ✅ OUI, système de "dry-run" intégré !

**Code source** : `src/services/mailwizz/config.ts`

```typescript
export async function isMailwizzReady(): Promise<boolean> {
  const config = await getMailwizzConfig();

  return (
    config.enabled === true &&
    config.dryRun === false &&
    !!config.apiUrl &&
    !!config.apiKey
  );
}
```

**3 modes disponibles :**

### Mode 1 : MailWizz désactivé
```
Settings → MailWizz → enabled: false
```

**Comportement :**
- Enrollments créés normalement
- Statut prospect : CONTACTED_EMAIL
- ❌ Aucun email envoyé
- ⏸️ **En attente** jusqu'à activation

### Mode 2 : MailWizz dry-run (RECOMMANDÉ pour début)
```
Settings → MailWizz → enabled: true, dryRun: true
```

**Comportement :**
- Enrollments créés normalement
- Statut prospect : CONTACTED_EMAIL
- ✅ Synchronisation avec MailWizz (ajoute subscribers)
- ❌ Aucun email réellement envoyé
- 📝 Logs : "DRY RUN - Would have sent email to..."

**Avantage** : Vous préparez tout, quand vous êtes prêt → dryRun: false

### Mode 3 : MailWizz actif (production)
```
Settings → MailWizz → enabled: true, dryRun: false
```

**Comportement :**
- ✅ Emails envoyés réellement
- ✅ Séquences automatiques

---

### 🔥 WARMUP MAILWIZZ

**Question** : MailWizz peut gérer le warmup ?

**Réponse** : ✅ OUI, MailWizz a un système de warmup intégré !

**Dans MailWizz (externe) :**
1. Settings → Sending → Delivery servers
2. Ajoutez votre serveur SMTP (ex: SendGrid, Mailgun, Gmail)
3. Configurez le warmup :
   - **Warmup enabled** : Yes
   - **Start with** : 50 emails/day
   - **Increase by** : 10 emails/day
   - **Maximum** : 500 emails/day
   - **Duration** : 30 days

**Exemple de progression :**
```
Jour 1  : 50 emails
Jour 2  : 60 emails
Jour 3  : 70 emails
...
Jour 30 : 500 emails (max atteint)
```

**IMPORTANT** : Backlink Engine ne gère PAS le warmup, c'est MailWizz qui le fait.

---

### 🎯 WORKFLOW RECOMMANDÉ POUR DÉMARRER

#### Semaine 1-2 : Préparation (sans MailWizz)
```
1. Importez vos premiers prospects (CSV)
2. Créez vos templates (OutreachTemplates)
3. Créez vos campagnes
4. Settings → MailWizz → enabled: false
5. Testez l'auto-enrollment (prospects inscrits mais emails non envoyés)
```

#### Semaine 3 : Configuration MailWizz
```
1. Installez MailWizz (serveur séparé ou cloud)
2. Configurez SMTP avec warmup (50 emails/jour)
3. Créez les listes dans MailWizz (fr, en, de...)
4. Backlink Engine → Settings → MailWizz :
   - apiUrl: https://mailwizz.votredomaine.com/api
   - apiKey: votre_clé_api
   - listUids: fr=abc123, en=def456
   - enabled: true
   - dryRun: true (TEST d'abord)
5. Vérifiez que les subscribers sont bien ajoutés dans MailWizz
```

#### Semaine 4 : Lancement
```
1. Settings → MailWizz → dryRun: false
2. MailWizz commence à envoyer (50 emails/jour max au début)
3. Warmup automatique (géré par MailWizz)
4. Monitoring quotidien
```

---

## 5️⃣ TEMPLATES POUR FORMULAIRES - COPIER/COLLER RAPIDE

### 🚨 PROBLÈME ACTUEL

La page `/message-templates` existe mais **pas de bouton "Copier" visible** !

**Workflow actuel (PÉNIBLE) :**
1. Allez sur `/message-templates`
2. Sélectionnez langue (fr) et catégorie (blogger)
3. Template s'affiche
4. **Ctrl+A → Ctrl+C** (manuel)
5. Allez sur le formulaire du prospect
6. **Ctrl+V**

**Problème** : Pas ergonomique pour 50 formulaires/jour

---

### 💡 SOLUTION - Amélioration UX

**J'ajoute (1h de dev) :**

#### 1. Bouton "Copier le corps" avec feedback visuel
```
[📋 Copier le corps] → Clic → ✅ Copié !
```

#### 2. Extension Chrome (futur)
- Détecte automatiquement les formulaires de contact
- Bouton "Remplir avec template Backlink Engine"
- Pré-remplit tous les champs
- 1 clic au lieu de copier/coller

#### 3. Intégration directe dans la page prospect
**Page `/prospects/:id` :**
```
┌─────────────────────────────────────┐
│ Prospect: blog-expatrie.fr          │
│ Status: READY_TO_CONTACT            │
│ Contact: Formulaire                 │
│                                     │
│ [📧 Contacter via MailWizz]        │
│ [📝 Remplir formulaire de contact] │ ← NOUVEAU
│                                     │
│ → Ouvre modal avec :                │
│   - Template pré-rempli             │
│   - Bouton "Copier le message"      │
│   - Lien direct vers le formulaire  │
└─────────────────────────────────────┘
```

**Workflow optimisé :**
1. Page prospect → Clic "Remplir formulaire"
2. Modal s'ouvre avec template pré-rempli
3. Clic "Copier le message" (auto-copie)
4. Clic "Ouvrir le formulaire" (nouvel onglet)
5. Ctrl+V dans le formulaire
6. Envoyer

**Temps** : 30 secondes au lieu de 2 minutes

---

## 📊 RÉSUMÉ COMPLET

| Question | Réponse courte | Détails |
|----------|---------------|---------|
| **Déduplication CSV** | ✅ OUI | Automatique sur le champ `domain` |
| **Templates précis** | ⚠️ 2 systèmes | OutreachTemplates (MailWizz) + MessageTemplates (formulaires) |
| **MailWizz vs Formulaires** | ✅ Indépendants | 2 canaux séparés (auto vs manuel) |
| **Détection auto backlinks** | ❌ NON | Seulement vérification des existants |
| **Enrollment sans MailWizz** | ✅ OUI | Mode dry-run ou disabled |
| **Warmup MailWizz** | ✅ OUI | Géré par MailWizz (pas Backlink Engine) |
| **Templates formulaires** | ⚠️ Basique | Existe mais pas de bouton copier |

---

## 🚀 ACTIONS RECOMMANDÉES

### Immédiat (vous)
1. ✅ Testez l'import CSV → Vérifiez la déduplication
2. ✅ Créez vos premiers MessageTemplates (formulaires)
3. ✅ Créez vos OutreachTemplates (MailWizz)
4. ✅ Importez 10-20 prospects tests

### Court terme (moi - 3h de dev)
1. 🔧 Ajouter bouton "Copier" dans MessageTemplates
2. 🔧 Implémenter "Détecter backlinks depuis URL"
3. 🔧 Ajouter modal "Remplir formulaire" dans page prospect

### Moyen terme (2 semaines)
1. 🔧 Backlink detector automatique avec suggestions
2. 🔧 Extension Chrome pour formulaires
3. 🔧 Warmup monitoring intégré

---

**Voulez-vous que je commence par les améliorations court terme ?**
