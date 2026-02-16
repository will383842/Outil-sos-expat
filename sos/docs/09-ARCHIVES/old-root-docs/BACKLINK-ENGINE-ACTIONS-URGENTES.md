# 🚨 BACKLINK ENGINE - ACTIONS URGENTES

**Date** : 2026-02-15
**Statut** : ⚠️ **3 PROBLÈMES CRITIQUES BLOQUANTS DÉTECTÉS**

---

## 🔴 PROBLÈMES CRITIQUES À CORRIGER IMMÉDIATEMENT

### 1. Routes manquantes dans la navigation (30 min)

**Problème** : Les pages `/templates`, `/message-templates` et `/backlinks` existent mais ne sont PAS dans le menu de navigation.

**Impact** : Utilisateurs NE PEUVENT PAS accéder à ces fonctionnalités essentielles.

**Fichier** : `backlink-engine/frontend/src/components/Layout.tsx`

**Solution** : Ajouter les 3 lignes suivantes dans le tableau `navItems` (après la ligne 35) :

```typescript
const navItems: NavItem[] = [
  { to: "/", labelKey: "nav.dashboard", icon: <LayoutDashboard size={20} /> },
  { to: "/prospects", labelKey: "nav.prospects", icon: <Users size={20} /> },
  { to: "/quick-add", labelKey: "nav.quickAdd", icon: <PlusCircle size={20} /> },
  { to: "/import", labelKey: "nav.bulkImport", icon: <Upload size={20} /> },
  { to: "/campaigns", labelKey: "nav.campaigns", icon: <Send size={20} /> },
  { to: "/templates", labelKey: "nav.templates", icon: <FileText size={20} /> },        // ← AJOUTER
  { to: "/message-templates", labelKey: "nav.messageTemplates", icon: <MessageSquare size={20} /> },  // ← AJOUTER
  { to: "/backlinks", labelKey: "nav.backlinks", icon: <Link size={20} /> },            // ← AJOUTER
  { to: "/assets", labelKey: "nav.assets", icon: <Package size={20} /> },
  { to: "/tags", labelKey: "nav.tags", icon: <Tag size={20} /> },
  { to: "/replies", labelKey: "nav.replies", icon: <Mail size={20} /> },
  { to: "/recontact", labelKey: "nav.recontact", icon: <RefreshCcw size={20} /> },
  { to: "/suppression", labelKey: "nav.suppression", icon: <ShieldOff size={20} /> },
  { to: "/settings", labelKey: "nav.settings", icon: <Settings size={20} /> },
  { to: "/reports", labelKey: "nav.reports", icon: <BarChart3 size={20} /> },
];
```

**Imports manquants à ajouter** (ligne 3) :
```typescript
import {
  LayoutDashboard,
  Users,
  PlusCircle,
  Upload,
  Send,
  FileText,        // ← AJOUTER
  MessageSquare,   // ← AJOUTER
  Link,            // ← AJOUTER
  Package,
  Tag,
  Mail,
  ShieldOff,
  Settings,
  BarChart3,
  Menu,
  X,
  LogOut,
  RefreshCcw,
} from "lucide-react";
```

**Clés i18n à ajouter** dans `frontend/src/i18n/locales/fr.ts` et `en.ts` :
```typescript
nav: {
  // ... autres clés
  templates: "Templates Outreach",
  messageTemplates: "Templates Messages",
  backlinks: "Backlinks",
},
pageTitles: {
  // ... autres clés
  templates: "Templates d'outreach",
  messageTemplates: "Templates de messages",
  backlinks: "Gestion des backlinks",
},
```

---

### 2. API MessageTemplates non fonctionnelle (1h)

**Problème** : La page MessageTemplates fait des appels API avec un double préfixe `/api/api` au lieu de `/api`, causant des erreurs 404.

**Impact** : Page 100% non fonctionnelle, impossible de créer/modifier des templates.

**Cause** :
- Frontend : `api.get("/api/message-templates")` avec `baseURL: "/api"` → `/api/api/message-templates` ❌
- Backend : Routes définies avec `/api` dans le handler au lieu d'utiliser un prefix

**Fichier backend** : `backlink-engine/src/api/routes/messageTemplates.ts`

**Solution** : Refactoriser les routes backend

**AVANT** (lignes 27-248) :
```typescript
export async function messageTemplatesRoutes(app: FastifyInstance) {
  app.get("/api/message-templates", async (request, reply) => { ... });
  app.get("/api/message-templates/:language", async (request, reply) => { ... });
  app.put("/api/message-templates/:language", async (request, reply) => { ... });
  app.post("/api/message-templates/render", async (request, reply) => { ... });
  app.post("/api/message-templates/select", async (request, reply) => { ... });
}
```

**APRÈS** :
```typescript
export async function messageTemplatesRoutes(app: FastifyInstance) {
  // Supprimer le préfixe /api de TOUS les handlers
  app.get("/", async (request, reply) => { ... });  // Liste tous les templates
  app.get("/:language", async (request, reply) => { ... });  // Template par langue
  app.put("/:language", async (request, reply) => { ... });  // Créer/modifier
  app.post("/render", async (request, reply) => { ... });  // Rendre avec variables
  app.post("/select", async (request, reply) => { ... });  // Sélection intelligente
}
```

**Fichier backend** : `backlink-engine/src/index.ts`

**AVANT** (ligne 170) :
```typescript
await app.register(messageTemplatesRoutes);
```

**APRÈS** :
```typescript
await app.register(messageTemplatesRoutes, { prefix: "/api/message-templates" });
```

**Test après correction** :
```bash
# Démarrer le backend
cd backlink-engine
npm run dev

# Tester l'endpoint
curl http://localhost:3000/api/message-templates
# Doit retourner 200 avec la liste des templates
```

---

### 3. Mutations incorrectes dans ProspectDetail.tsx (1h)

**Problème** : Les mutations pour modifier l'email et le nom du contact envoient les mauvaises données au backend.

**Impact** : Corruption potentielle des données, utilisateur pense avoir modifié l'email/nom mais rien ne change.

**Fichier** : `backlink-engine/frontend/src/pages/ProspectDetail.tsx`

**Problème 1 : Email (lignes 340-348)**

**AVANT** :
```typescript
<InlineEdit
  value={firstContact?.email ?? null}
  placeholder={t("common.notSet")}
  onSave={(val) => {
    // ❌ BUG : Envoie contactFormUrl au lieu de l'email
    updateMutation.mutate({ contactFormUrl: prospect.contactFormUrl } as Partial<Prospect>);
    if (val !== null) {
      api.put(`/prospects/${numericId}`, { email: val });
      queryClient.invalidateQueries({ queryKey: ["prospect", numericId] });
    }
  }}
/>
```

**APRÈS** :
```typescript
<InlineEdit
  value={firstContact?.email ?? null}
  placeholder={t("common.notSet")}
  onSave={(val) => {
    if (firstContact?.id && val !== null) {
      // ✅ Update contact via API contacts (pas prospects)
      api.put(`/contacts/${firstContact.id}`, { email: val })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["prospect", numericId] });
          toast.success(t("prospectDetail.emailUpdated"));
        })
        .catch((err) => {
          toast.error(t("common.error"));
          console.error(err);
        });
    }
  }}
/>
```

**Problème 2 : Nom du contact (lignes 358-363)**

**AVANT** :
```typescript
<InlineEdit
  value={firstContact?.name ?? null}
  placeholder={t("common.notSet")}
  onSave={(val) => {
    api.put(`/prospects/${numericId}`, { name: val }).then(() => {
      queryClient.invalidateQueries({ queryKey: ["prospect", numericId] });
      toast.success(t("prospectDetail.contactNameUpdated"));
    });
  }}
/>
```

**APRÈS** :
```typescript
<InlineEdit
  value={firstContact?.name ?? null}
  placeholder={t("common.notSet")}
  onSave={(val) => {
    if (firstContact?.id && val !== null) {
      api.put(`/contacts/${firstContact.id}`, { name: val })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["prospect", numericId] });
          toast.success(t("prospectDetail.contactNameUpdated"));
        })
        .catch((err) => {
          toast.error(t("common.error"));
          console.error(err);
        });
    }
  }}
/>
```

**Vérifier que l'endpoint `/contacts/:id` existe** dans le backend (`src/api/routes/contacts.ts`).

---

## 📊 TEMPS ESTIMÉ TOTAL : 2h30

| Tâche | Temps |
|-------|-------|
| 1. Ajouter routes navigation | 30 min |
| 2. Corriger API MessageTemplates | 1h |
| 3. Corriger mutations ProspectDetail | 1h |
| **TOTAL** | **2h30** |

---

## ✅ VÉRIFICATION APRÈS CORRECTIONS

### Test 1 : Navigation
1. ✅ Démarrer le frontend : `cd backlink-engine/frontend && npm run dev`
2. ✅ Ouvrir http://localhost:5173
3. ✅ Vérifier que le menu contient :
   - Templates Outreach
   - Templates Messages
   - Backlinks
4. ✅ Cliquer sur chaque lien et vérifier que la page charge

### Test 2 : MessageTemplates API
1. ✅ Démarrer le backend : `cd backlink-engine && npm run dev`
2. ✅ Ouvrir http://localhost:5173/message-templates
3. ✅ Vérifier dans la console navigateur (F12) :
   - **AUCUNE erreur 404** sur `/api/message-templates`
4. ✅ Créer un nouveau template :
   - Sélectionner Français + Blogueur
   - Remplir sujet et corps
   - Cliquer "Sauvegarder"
   - Toast "✅ Template sauvegardé avec succès !" apparaît
5. ✅ Vérifier la matrice des templates :
   - Case "FR × Blogueur" affiche ✅

### Test 3 : ProspectDetail mutations
1. ✅ Aller sur http://localhost:5173/prospects
2. ✅ Cliquer sur un prospect
3. ✅ Modifier l'email :
   - Cliquer sur le champ email
   - Entrer un nouvel email
   - Valider
   - Toast "✅ Email mis à jour !" apparaît
4. ✅ Vérifier dans la base de données que l'email a bien été modifié
5. ✅ Répéter pour le nom du contact

---

## 🟠 PROBLÈMES MAJEURS (À corriger rapidement)

Une fois les 3 problèmes critiques corrigés, traiter ces problèmes majeurs :

### 4. Textes hard-codés en français (6h)
- Tags.tsx : 18 textes
- Settings.tsx : 45+ textes
- MessageTemplates.tsx : TOUTE la page
- Prospects.tsx : 2 textes
- ProspectDetail.tsx : 6 textes

**Action** : Extraire tous les textes dans `i18n/locales/fr.ts` et `en.ts`

### 5. Gestion d'erreur manquante (1h)
- Ajouter `onError` dans TOUTES les mutations
- Ajouter `.catch()` sur tous les appels API directs

### 6. Classe CSS manquante (15 min)
- Définir `.btn-outline` dans `index.css` OU remplacer par `btn-secondary`

### 7. Typo i18n Suppression.tsx (15 min)
- Corriger l'interpolation `{ email: ... }` ligne 196

**Temps total problèmes majeurs** : ~7h30

---

## 🎯 RÉCAPITULATIF

### État actuel
- ⚠️ **3 problèmes critiques** bloquent l'utilisation de l'application
- ⚠️ **4 problèmes majeurs** dégradent l'expérience utilisateur
- ⚠️ **25 problèmes mineurs** à corriger progressivement

### Après corrections urgentes (2h30)
- ✅ Application **utilisable en production**
- ✅ Toutes les pages **accessibles**
- ✅ API **fonctionnelle**
- ✅ Données **non corrompues**
- ⚠️ Mais encore 50% de l'app en français (i18n incomplet)

### Après corrections majeures (+7h30)
- ✅ Application **multilingue**
- ✅ Gestion d'erreur **robuste**
- ✅ UX **professionnelle**
- ⚠️ Fonctionnalités encore incomplètes (édition campagnes, etc.)

---

**Document créé le** : 2026-02-15 à 23h20
**Priorité** : 🔴 **URGENCE MAXIMALE**
**Temps requis** : 2h30 pour rendre l'application utilisable
