# 🏷️ Backlink Engine - Tags & Templates Multi-langues

**Date** : 2026-02-15
**Contexte** : Implémentation complète du système de tags et templates intelligents

---

## ✅ TRAVAUX TERMINÉS

### 1️⃣ **Service de sélection intelligente des templates de formulaires** ✅

**Fichier créé** : `src/services/outreach/messageTemplateSelector.ts`

**Fonctionnalités** :
```typescript
selectMessageTemplate(language, {
  prospectTags: [1, 2, 3],
  prospectCategory: "blogger",
  preferredCategory: "media"
})
```

**Stratégie de sélection** (dans l'ordre) :
1. 🏷️ **Catégorie + Langue exacte** : blogger + fr
2. 📝 **Template général pour la langue** : null + fr
3. 🇬🇧 **Fallback anglais avec catégorie** : blogger + en
4. 🇬🇧 **Fallback anglais général** : null + en
5. 🌍 **N'importe quel template dans la langue** (last resort)
6. ❌ **Erreur** : Aucun template trouvé

**Fonction helper** :
```typescript
replaceTemplateVariables(template, {
  siteName: "MonBlog",
  yourName: "Jean Dupont",
  yourCompany: "SOS Expat",
  yourWebsite: "https://sos-expat.com"
})
```

---

### 2️⃣ **Types TypeScript pour Tags** ✅

**Fichier modifié** : `frontend/src/types/index.ts`

**Nouveaux types** :
```typescript
export type TagCategory = "industry" | "priority" | "status" | "geo" | "quality" | "other";

export interface Tag {
  id: number;
  name: string;
  label: string;
  description?: string;
  color: string;
  category: TagCategory;
  isAutoTag: boolean;
  createdAt: string;
}

export interface ProspectTag {
  prospectId: number;
  tagId: number;
  tag: Tag;
  assignedBy: string;
  createdAt: string;
}
```

**Ajout au type Prospect** :
```typescript
export interface Prospect {
  // ... (autres champs)
  tags?: ProspectTag[];  // ← NOUVEAU
}
```

---

## 🎯 SYSTÈME COMPLET : OutreachTemplates vs MessageTemplates

### 📧 **OutreachTemplates** (Emails MailWizz) - ✅ DÉJÀ COMPLET

**Fichier** : `src/services/outreach/templateSelector.ts`

**Utilisation** :
```typescript
const template = await selectTemplate("fr", "INITIAL_OUTREACH", {
  prospectTags: [1, 2, 3],
  campaignTags: [4, 5]
});
```

**Stratégie** :
1. 🏷️ **Tags en priorité** (score par nombre de tags correspondants)
2. 🌍 **Langue exacte**
3. 🇬🇧 **Fallback anglais**
4. 📊 **Tri par taux de réponse** (replyRate)

**Variables disponibles** :
```
{{domain}}
{{contactName}}
{{siteName}}
{{assetUrl}}
{{assetTitle}}
{{backlinkUrl}}
```

**Purposes supportés** :
- INITIAL_OUTREACH
- FOLLOW_UP
- RECONTACT
- THANK_YOU
- NEGOTIATION

---

### 📝 **MessageTemplates** (Formulaires de contact) - ✅ NOUVEAU

**Fichier** : `src/services/outreach/messageTemplateSelector.ts`

**Utilisation** :
```typescript
const template = await selectMessageTemplate("fr", {
  prospectCategory: "blogger",
  prospectTags: [1, 2, 3]
});

const { subject, body } = replaceTemplateVariables(template, {
  siteName: prospect.domain,
  yourName: "William",
  yourCompany: "SOS Expat",
  yourWebsite: "https://sos-expat.com"
});
```

**Variables disponibles** :
```
{siteName}
{yourName}
{yourCompany}
{yourWebsite}
```

**Catégories supportées** :
- `null` (général)
- `blogger`
- `media`
- `influencer`
- `association`
- `partner`
- `agency`
- `corporate`

---

## 🌍 SUPPORT MULTI-LANGUES

### Langues supportées (9 langues)

```typescript
enum Language {
  fr = "Français",
  en = "English",
  es = "Español",
  de = "Deutsch",
  pt = "Português",
  ru = "Русский",
  ar = "العربية",
  zh = "中文",
  hi = "हिन्दी"
}
```

### Fallback automatique sur l'anglais ✅

**Pour les OutreachTemplates** :
```typescript
// Prospect langue: de (Allemand)
// Pas de template en allemand → Utilise template en anglais
selectTemplate("de", "INITIAL_OUTREACH")
  → Fallback sur "en" automatiquement
```

**Pour les MessageTemplates** :
```typescript
// Prospect langue: zh (Chinois)
// Pas de template en chinois → Utilise template en anglais
selectMessageTemplate("zh", { prospectCategory: "blogger" })
  → Fallback sur "en" automatiquement
```

---

## 🏷️ SYSTÈME DE TAGS

### Backend - Déjà complet ✅

**API Routes** :
- `GET /api/tags` - Liste tous les tags
- `GET /api/tags/:id` - Détail d'un tag
- `POST /api/tags` - Créer un tag
- `PATCH /api/tags/:id` - Modifier un tag
- `DELETE /api/tags/:id` - Supprimer un tag (si non utilisé)
- `POST /api/tags/prospects/:prospectId` - Assigner tags à un prospect
- `POST /api/tags/campaigns/:campaignId` - Assigner tags à une campagne

**Modèle Prisma** :
```prisma
model Tag {
  id          Int         @id @default(autoincrement())
  name        String      @unique // "assurance_sante"
  label       String      // "Assurance Santé"
  description String?
  color       String      @default("#3B82F6") // Hex color
  category    TagCategory @default(other)
  isAutoTag   Boolean     @default(false)

  prospects   ProspectTag[]
  campaigns   CampaignTag[]
  templates   TemplateTag[]
}

model ProspectTag {
  prospectId Int
  tagId      Int
  assignedBy String   @default("auto") // "user:{userId}", "enrichment", "manual"
  createdAt  DateTime @default(now())

  prospect Prospect @relation(...)
  tag      Tag      @relation(...)

  @@id([prospectId, tagId])
}
```

### Frontend - Page /tags créée ✅

**Fichier** : `frontend/src/pages/Tags.tsx`

**Fonctionnalités** :
- ✅ CRUD complet (Create, Read, Update, Delete)
- ✅ Catégories : Industry, Priority, Status, Geo, Quality, Other
- ✅ Color picker + 8 presets
- ✅ Description optionnelle
- ✅ Tags automatiques (isAutoTag)
- ✅ Statistiques d'utilisation :
  - Nombre de prospects utilisant ce tag
  - Nombre de campagnes utilisant ce tag
- ✅ Filtre par catégorie
- ✅ Protection anti-suppression (tag en cours d'utilisation)
- ✅ Validation du nom (lowercase + alphanumeric + underscores)

---

## 📋 TÂCHES RESTANTES

### #13 - Affichage des tags dans la liste prospects ⏳ EN COURS
**Statut** : Types ajoutés ✅, API à modifier ⏸️, UI à créer ⏸️

**À faire** :
1. ✅ Ajouter `tags?: ProspectTag[]` au type Prospect
2. ⏸️ Modifier `/api/prospects` pour inclure `include: { tags: { include: { tag: true } } }`
3. ⏸️ Ajouter colonne "Tags" dans `Prospects.tsx`
4. ⏸️ Afficher badges colorés pour chaque tag
5. ⏸️ Ajouter filtre par tags

**Temps estimé** : 1h restant

---

### #14 - Édition des tags dans ProspectDetail ⏸️ À FAIRE

**À faire** :
1. Section "🏷️ Tags" dans la page prospect
2. Liste des tags actuels (badges colorés)
3. Bouton "✏️ Modifier les tags"
4. Modal avec multi-select de tous les tags disponibles
5. Appel `POST /api/tags/prospects/:prospectId` avec `{ tagIds: [1, 2, 3] }`
6. Rafraîchir les données après modification

**Temps estimé** : 1h30

---

### #15 - Améliorer MessageTemplates ⏸️ À FAIRE

**À faire** :
1. Intégrer `messageTemplateSelector.ts` dans la page
2. Ajouter bouton "🤖 Auto-remplir selon prospect" :
   - Sélectionner un prospect depuis une dropdown
   - Récupérer langue, catégorie, tags du prospect
   - Appeler `selectMessageTemplate()`
   - Pré-remplir le formulaire automatiquement
3. Ajouter tableau récapitulatif :
   - Matrice 9 langues × 8 catégories = 72 combinaisons
   - Indicateur vert/gris si template existe
   - Clic sur une case → édite ce template
4. Statistiques :
   - Templates créés / Total possible
   - Langues couvertes
   - Templates par catégorie

**Temps estimé** : 2h

---

## 🔄 WORKFLOW COMPLET

### Scénario 1 : Prospect avec email → MailWizz (automatique)

```
1. Import prospect : blog-expatrie.fr (langue: fr, catégorie: blogger)
2. Enrichissement → Assigne tags automatiques : ["expat", "france"]
3. Ajout manuel de tags : ["premium", "priority_high"]
4. Création de campagne : "Bloggers FR Q1 2026"
5. Auto-enrollment :
   - Appelle selectTemplate("fr", "INITIAL_OUTREACH", {
       prospectTags: [expat, france, premium, priority_high],
       campaignTags: [blogging, expatriation]
     })
   - Sélectionne le meilleur template (max matching tags + meilleur replyRate)
   - Inscrit dans liste MailWizz FR
6. MailWizz envoie emails automatiquement :
   - J0 : INITIAL_OUTREACH
   - J+3 : FOLLOW_UP (si pas de réponse)
   - J+7 : FOLLOW_UP (si toujours pas de réponse)
```

### Scénario 2 : Prospect sans email → Formulaire de contact (manuel)

```
1. Prospect : blog-voyage-allemagne.de (langue: de, catégorie: blogger)
2. Pas d'email public → contactFormUrl détecté
3. Tags : ["germany", "travel", "premium"]
4. Sur /prospects → Clic "📝 Remplir formulaire de contact"
5. Modal s'ouvre :
   - Appelle selectMessageTemplate("de", {
       prospectCategory: "blogger",
       prospectTags: [germany, travel, premium]
     })
   - Pas de template en allemand → Fallback sur "en"
   - Remplace variables : {siteName} → "Blog Voyage Allemagne"
   - Affiche le message pré-rempli
6. Clic "📋 Copier le message"
7. Clic "🔗 Ouvrir le formulaire" → Nouvel onglet
8. Ctrl+V dans le formulaire
9. Envoyer
10. Retour sur /prospects → Marque prospect comme CONTACTED_MANUAL
```

---

## 🧪 TESTS

### Test 1 : Sélection de template email (OutreachTemplate)

```bash
# Dans Prisma Studio ou via API
# 1. Créer un prospect
{
  "domain": "blog-expatrie.fr",
  "language": "fr",
  "category": "blogger"
}

# 2. Assigner des tags
POST /api/tags/prospects/123
{ "tagIds": [1, 2, 3] } # assurance_sante, premium, france

# 3. Tester la sélection
const template = await selectTemplate("fr", "INITIAL_OUTREACH", {
  prospectTags: [1, 2, 3]
});
// → Doit retourner le template FR avec le plus de tags correspondants
```

### Test 2 : Sélection de template formulaire (MessageTemplate)

```bash
# 1. Créer des templates
- fr + null (général)
- fr + blogger
- en + null (général)
- en + blogger

# 2. Tester la sélection
const template = await selectMessageTemplate("de", {
  prospectCategory: "blogger"
});
// → Doit fallback sur "en + blogger" (pas de "de")

const { subject, body } = replaceTemplateVariables(template, {
  siteName: "MonBlog.de",
  yourName: "William",
  yourCompany: "SOS Expat",
  yourWebsite: "https://sos-expat.com"
});
// → Variables remplacées correctement
```

---

## 🚀 PROCHAINES ÉTAPES

1. ✅ Types TypeScript créés
2. ✅ Service `messageTemplateSelector.ts` créé
3. ⏸️ Modifier API `/api/prospects` pour inclure les tags
4. ⏸️ Afficher tags dans liste prospects
5. ⏸️ Éditer tags dans prospect détail
6. ⏸️ Améliorer MessageTemplates avec auto-sélection

**Temps total restant** : ~4h30

---

*Document généré automatiquement le 2026-02-15*
