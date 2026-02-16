# 🧪 Backlink Engine - Guide de Tests Manuels

**Date** : 2026-02-15
**Objectif** : Vérifier que toutes les fonctionnalités sont opérationnelles

---

## 🚀 DÉMARRAGE

### Backend
```bash
cd backlink-engine
npm install
npm run build
npm run dev
# → Serveur sur http://localhost:3000
```

### Frontend
```bash
cd backlink-engine/frontend
npm install
npm run dev
# → Application sur http://localhost:5173
```

### Vérifier que tout compile
```bash
# Backend
cd backlink-engine
npm run type-check
# → Doit afficher : ✓ (aucune erreur)

# Frontend
cd backlink-engine/frontend
npm run build
# → Doit afficher : ✓ built in X.XXs
```

---

## 📋 TESTS PAR FONCTIONNALITÉ

### TEST 1 : Système de Tags - Page /tags ✅

**Objectif** : Vérifier que le CRUD des tags fonctionne

#### 1.1 - Créer un tag
1. ✅ Aller sur http://localhost:5173/tags
2. ✅ Cliquer sur "➕ Créer un tag"
3. ✅ Remplir le formulaire :
   - Name : `tech_saas`
   - Label : `Tech SaaS`
   - Category : `Industry`
   - Color : Choisir bleu (#3B82F6)
   - Description : `Startups SaaS et technologie`
4. ✅ Cliquer "💾 Créer"
5. ✅ **VÉRIFIER** :
   - Toast de succès apparaît
   - Le tag apparaît dans la liste
   - Badge bleu avec "Tech SaaS"
   - Stats d'utilisation : 0 prospects, 0 campagnes

#### 1.2 - Modifier un tag
1. ✅ Cliquer sur "✏️ Modifier" sur le tag créé
2. ✅ Changer la description : `SaaS B2B et solutions technologiques`
3. ✅ Cliquer "💾 Sauvegarder"
4. ✅ **VÉRIFIER** :
   - Toast de succès
   - Description mise à jour dans la liste

#### 1.3 - Filtrer par catégorie
1. ✅ Cliquer sur le filtre "📂 Toutes les catégories"
2. ✅ Sélectionner "Industry"
3. ✅ **VÉRIFIER** :
   - Seuls les tags de catégorie "Industry" sont affichés
   - Le tag "Tech SaaS" est visible

#### 1.4 - Tenter de supprimer (protection)
1. ✅ Assigner le tag à un prospect (voir TEST 2)
2. ✅ Revenir sur /tags
3. ✅ Cliquer "🗑️ Supprimer" sur le tag "Tech SaaS"
4. ✅ **VÉRIFIER** :
   - Message d'erreur : "Ce tag est utilisé par X prospects et X campagnes"
   - Le tag n'est PAS supprimé

#### 1.5 - Supprimer un tag non utilisé
1. ✅ Créer un nouveau tag temporaire : `test_delete`
2. ✅ Cliquer "🗑️ Supprimer" immédiatement
3. ✅ **VÉRIFIER** :
   - Toast de succès
   - Le tag disparaît de la liste

---

### TEST 2 : Tags dans Liste Prospects ✅

**Objectif** : Vérifier l'affichage et le filtrage des tags

#### 2.1 - Voir les tags dans la liste
1. ✅ Aller sur http://localhost:5173/prospects
2. ✅ **VÉRIFIER** :
   - Colonne "🏷️ Tags" présente dans la table
   - Les prospects avec tags affichent des badges colorés
   - Maximum 3 tags affichés
   - Si plus de 3 tags : compteur "+X" affiché

#### 2.2 - Filtrer par tag
1. ✅ Cliquer sur le dropdown "🏷️ Tous les tags"
2. ✅ **VÉRIFIER** :
   - Liste de tous les tags créés
   - Le tag "Tech SaaS" est présent
3. ✅ Sélectionner "Tech SaaS"
4. ✅ **VÉRIFIER** :
   - Liste filtrée : seuls les prospects avec le tag "Tech SaaS" apparaissent
   - Pagination mise à jour
   - Nombre total mis à jour

#### 2.3 - Tooltip des tags
1. ✅ Survoler un badge de tag
2. ✅ **VÉRIFIER** :
   - Tooltip apparaît avec la description du tag
   - Si pas de description : affiche le label

---

### TEST 3 : Édition Tags dans Prospect Détail ✅

**Objectif** : Vérifier l'assignation/désassignation de tags

#### 3.1 - Voir les tags actuels
1. ✅ Aller sur /prospects
2. ✅ Cliquer sur un prospect
3. ✅ Scroller jusqu'à la section "🏷️ Tags"
4. ✅ **VÉRIFIER** :
   - Section "🏷️ Tags" présente
   - Tags actuels affichés (badges colorés)
   - Bouton "✏️ Modifier" visible

#### 3.2 - Modifier les tags
1. ✅ Cliquer "✏️ Modifier"
2. ✅ **VÉRIFIER** :
   - Modal s'ouvre
   - Liste de tous les tags disponibles (checkbox)
   - Tags actuels déjà cochés
   - Compteur de tags sélectionnés affiché
3. ✅ Cocher le tag "Tech SaaS"
4. ✅ Cocher un autre tag (ex: "Premium")
5. ✅ **VÉRIFIER** :
   - Compteur se met à jour en temps réel
6. ✅ Cliquer "💾 Sauvegarder"
7. ✅ **VÉRIFIER** :
   - Toast de succès : "✅ Tags mis à jour !"
   - Modal se ferme automatiquement
   - Les nouveaux tags apparaissent immédiatement
   - Badges colorés corrects

#### 3.3 - Désassigner des tags
1. ✅ Cliquer "✏️ Modifier" à nouveau
2. ✅ Décocher "Tech SaaS"
3. ✅ Cliquer "💾 Sauvegarder"
4. ✅ **VÉRIFIER** :
   - Toast de succès
   - Le tag "Tech SaaS" a disparu de la liste

#### 3.4 - Vérifier la mise à jour dans /tags
1. ✅ Retourner sur /tags
2. ✅ **VÉRIFIER** :
   - Stats d'utilisation mises à jour
   - "Tech SaaS" : 0 prospects (si désassigné) ou 1 prospect (si assigné)

---

### TEST 4 : MessageTemplates - Interface de Base ✅

**Objectif** : Vérifier l'éditeur de templates

#### 4.1 - Navigation
1. ✅ Aller sur http://localhost:5173/message-templates
2. ✅ **VÉRIFIER** :
   - Page charge correctement
   - Titre : "📧 Templates de messages"
   - Description présente

#### 4.2 - Sélecteurs langue et catégorie
1. ✅ Cliquer sur dropdown "🌍 Langue"
2. ✅ **VÉRIFIER** :
   - 9 langues affichées avec drapeaux :
     - 🇫🇷 Français
     - 🇬🇧 English
     - 🇪🇸 Español
     - 🇩🇪 Deutsch
     - 🇵🇹 Português
     - 🇷🇺 Русский
     - 🇸🇦 العربية
     - 🇨🇳 中文
     - 🇮🇳 हिन्दी
3. ✅ Sélectionner "🇫🇷 Français"
4. ✅ Cliquer sur dropdown "🏷️ Catégorie"
5. ✅ **VÉRIFIER** :
   - 8 catégories affichées :
     - 📝 Général (défaut)
     - 📰 Blogueur
     - 📺 Média
     - ✨ Influenceur
     - 🤝 Association
     - 💼 Partenaire
     - 🏢 Agence
     - 🏛️ Corporate

#### 4.3 - Créer un template
1. ✅ Sélectionner : Français + Blogueur
2. ✅ **VÉRIFIER** :
   - Indicateur : "➕ Nouveau template (sera créé à la sauvegarde)"
3. ✅ Remplir le sujet :
   ```
   💰 Opportunité de partenariat avec {yourCompany}
   ```
4. ✅ Remplir le corps :
   ```
   Bonjour,

   Je suis {yourName}, responsable partenariats chez {yourCompany}.

   J'ai découvert {siteName} et je trouve votre contenu de grande qualité.

   Nous proposons un programme d'affiliation avec :
   ✅ 30% de commission récurrente
   ✅ Cookie 90 jours
   ✅ Dashboard dédié

   Seriez-vous intéressé(e) ?

   Cordialement,
   {yourName}
   {yourCompany}
   {yourWebsite}
   ```
5. ✅ **VÉRIFIER** :
   - Compteur de caractères s'affiche
   - Sujet : X / 200 caractères
   - Corps : X / 5000 caractères

#### 4.4 - Aperçu en temps réel
1. ✅ Regarder la section "👁️ Aperçu" à droite
2. ✅ **VÉRIFIER** :
   - Variables remplacées automatiquement :
     - {siteName} → "MonBlog"
     - {yourName} → "Jean Dupont"
     - {yourCompany} → "SOS Expat"
     - {yourWebsite} → "https://sos-expat.com"
   - Mise à jour en temps réel lors de la saisie

#### 4.5 - Insertion de variables
1. ✅ Positionner le curseur dans le corps du message
2. ✅ Cliquer sur le bouton "{siteName}"
3. ✅ **VÉRIFIER** :
   - La variable {siteName} est insérée à la position du curseur
4. ✅ Répéter pour les autres variables

#### 4.6 - Copier le message
1. ✅ Cliquer sur "📋 Copier"
2. ✅ **VÉRIFIER** :
   - Toast : "📋 Message copié dans le presse-papier !"
   - Bouton devient vert : "✅ Copié !"
   - Après 2 secondes, revient à "📋 Copier"
3. ✅ Coller (Ctrl+V) dans un éditeur de texte
4. ✅ **VÉRIFIER** :
   - Le sujet ET le corps sont collés
   - Variables remplacées par les exemples

#### 4.7 - Sauvegarder le template
1. ✅ Cliquer "💾 Sauvegarder"
2. ✅ **VÉRIFIER** :
   - Bouton devient "💾 Sauvegarde..." pendant l'envoi
   - Toast : "✅ Template sauvegardé avec succès !"
   - Indicateur change : "✅ Template existant (modifié le JJ/MM/AAAA)"

---

### TEST 5 : Auto-remplissage Intelligent ✅

**Objectif** : Vérifier la sélection automatique de templates

#### 5.1 - Prérequis
1. ✅ Créer plusieurs templates :
   - FR + Blogueur ✅
   - FR + Général ✅
   - EN + Blogueur ✅
   - EN + Général ✅
2. ✅ Avoir des prospects avec différentes langues/catégories

#### 5.2 - Auto-remplir depuis un prospect FR blogger
1. ✅ Aller sur /message-templates
2. ✅ Scroller jusqu'à "🤖 Auto-remplissage intelligent"
3. ✅ **VÉRIFIER** :
   - Section bien visible (fond bleu/indigo)
   - Dropdown de prospects présent
   - Bouton "🚀 Auto-remplir" désactivé (grisé)
4. ✅ Cliquer sur le dropdown
5. ✅ **VÉRIFIER** :
   - Liste des prospects affichée
   - Format : "domain.com (langue - catégorie)"
   - Ex: "blog-expat.fr (fr - blogger)"
6. ✅ Sélectionner un prospect FR + blogger
7. ✅ **VÉRIFIER** :
   - Bouton "🚀 Auto-remplir" activé (bleu)
8. ✅ Cliquer "🚀 Auto-remplir"
9. ✅ **VÉRIFIER** :
   - Toast : "✅ Template auto-sélectionné pour domain.com !"
   - Langue sélectionnée automatiquement : Français
   - Catégorie sélectionnée automatiquement : Blogueur
   - Sujet et corps chargés depuis le template FR + Blogueur
   - Scroll automatique vers le haut de la page

#### 5.3 - Auto-remplir prospect DE (fallback EN)
1. ✅ Avoir un prospect avec langue "de" (allemand)
2. ✅ NE PAS créer de template DE
3. ✅ Sélectionner le prospect allemand dans dropdown
4. ✅ Cliquer "🚀 Auto-remplir"
5. ✅ **VÉRIFIER** :
   - Toast : "✅ Template auto-sélectionné pour domain.de !"
   - Langue sélectionnée : **English** (fallback)
   - Template EN + Blogueur chargé (ou EN + Général si pas de EN + Blogueur)

#### 5.4 - Auto-remplir prospect sans template
1. ✅ Créer un prospect ZH (chinois) + Corporate
2. ✅ NE créer AUCUN template ZH
3. ✅ NE créer AUCUN template EN + Corporate
4. ✅ Sélectionner ce prospect
5. ✅ Cliquer "🚀 Auto-remplir"
6. ✅ **VÉRIFIER** :
   - Toast d'erreur : "❌ Aucun template trouvé pour ce prospect (langue: zh)"
   - Les champs restent vides

---

### TEST 6 : Matrice des Templates ✅

**Objectif** : Vérifier la visualisation et navigation

#### 6.1 - Vue d'ensemble
1. ✅ Aller sur /message-templates
2. ✅ Scroller jusqu'à "📊 Matrice des templates"
3. ✅ **VÉRIFIER** :
   - Tableau 9 lignes (langues) × 8 colonnes (catégories)
   - En-têtes lignes : 🇫🇷 Français, 🇬🇧 English, etc.
   - En-têtes colonnes : 📝 Général, 📰 Blogueur, etc.
   - Légende en bas : "💡 ✅ = Template existant | ➕ = Template manquant"

#### 6.2 - Templates existants
1. ✅ Regarder la case "FR × Blogueur"
2. ✅ **VÉRIFIER** :
   - Fond vert clair (template existe)
   - Icône ✅ au centre
   - Au survol : fond devient vert plus foncé
   - Tooltip : "Template existant - Cliquez pour éditer"

#### 6.3 - Templates manquants
1. ✅ Regarder une case sans template (ex: "DE × Média")
2. ✅ **VÉRIFIER** :
   - Fond gris clair (template manquant)
   - Icône ➕ au centre
   - Au survol : fond devient bleu clair
   - Tooltip : "Créer un template Deutsch Média"

#### 6.4 - Navigation par clic
1. ✅ Cliquer sur une case ✅ (template existant)
2. ✅ **VÉRIFIER** :
   - Scroll automatique vers le haut
   - Langue sélectionnée automatiquement
   - Catégorie sélectionnée automatiquement
   - Template chargé dans l'éditeur
3. ✅ Cliquer sur une case ➕ (template manquant)
4. ✅ **VÉRIFIER** :
   - Scroll automatique vers le haut
   - Langue sélectionnée
   - Catégorie sélectionnée
   - Éditeur vide (nouveau template)
   - Indicateur : "➕ Nouveau template"

#### 6.5 - Vérifier toutes les langues
1. ✅ Parcourir chaque ligne du tableau
2. ✅ **VÉRIFIER** :
   - 9 langues présentes :
     - 🇫🇷 Français
     - 🇬🇧 English
     - 🇪🇸 Español
     - 🇩🇪 Deutsch
     - 🇵🇹 Português
     - 🇷🇺 Русский
     - 🇸🇦 العربية
     - 🇨🇳 中文
     - 🇮🇳 हिन्दी

---

### TEST 7 : Statistiques ✅

**Objectif** : Vérifier les métriques affichées

#### 7.1 - Stats MessageTemplates
1. ✅ Aller sur /message-templates
2. ✅ Scroller jusqu'aux stats (3 cartes en bas)
3. ✅ **VÉRIFIER** :
   - **Templates totaux** : Nombre correct (compter manuellement dans matrice)
   - **Langues couvertes** : X / 9 (au moins 1 template dans X langues différentes)
   - **Templates par catégorie** : Nombre de templates avec category != null

#### 7.2 - Stats Tags
1. ✅ Aller sur /tags
2. ✅ Pour chaque tag, **VÉRIFIER** :
   - Nombre de prospects utilisant ce tag
   - Nombre de campagnes utilisant ce tag
3. ✅ Assigner un tag à un prospect
4. ✅ Rafraîchir /tags
5. ✅ **VÉRIFIER** :
   - Le compteur "Prospects" a augmenté de 1

---

## 🔍 TESTS DE RÉGRESSION

### Régression 1 : Navigation
1. ✅ Vérifier que /templates n'apparaît PLUS dans le menu
2. ✅ Vérifier que /backlinks n'apparaît PLUS dans le menu
3. ✅ Vérifier que /tags APPARAÎT dans le menu

### Régression 2 : Types TypeScript
1. ✅ Backend : `npm run type-check` → 0 erreur
2. ✅ Frontend : `npm run build` → Build réussi

### Régression 3 : Prospects API
1. ✅ GET /api/prospects → Response inclut `tags[]`
2. ✅ GET /api/prospects/:id → Response inclut `tags[]`
3. ✅ GET /api/prospects?tagId=1 → Filtrage fonctionne

---

## 📊 RÉSULTATS ATTENDUS

### Tous les tests doivent passer ✅

Si un test échoue :
1. Noter le numéro du test
2. Copier le message d'erreur exact
3. Noter les étapes pour reproduire
4. Vérifier la console navigateur (F12)
5. Vérifier les logs backend

### Problèmes connus : AUCUN ✅

---

## 🎯 CHECKLIST FINALE

Après avoir effectué tous les tests :

- [ ] ✅ Tags : CRUD complet fonctionne
- [ ] ✅ Tags : Affichage dans liste prospects
- [ ] ✅ Tags : Filtrage dans liste prospects
- [ ] ✅ Tags : Édition dans prospect détail
- [ ] ✅ MessageTemplates : Éditeur fonctionne
- [ ] ✅ MessageTemplates : Variables insérées
- [ ] ✅ MessageTemplates : Aperçu temps réel
- [ ] ✅ MessageTemplates : Copier fonctionne
- [ ] ✅ MessageTemplates : Auto-remplissage fonctionne
- [ ] ✅ MessageTemplates : Fallback EN fonctionne
- [ ] ✅ MessageTemplates : Matrice affichée
- [ ] ✅ MessageTemplates : Navigation par clic fonctionne
- [ ] ✅ Statistiques : Toutes correctes
- [ ] ✅ TypeScript : 0 erreur backend
- [ ] ✅ TypeScript : Build frontend réussi
- [ ] ✅ Navigation : /tags présent, /templates absent

---

**🎉 SI TOUS LES TESTS PASSENT : SYSTÈME 100% OPÉRATIONNEL 🎉**

*Guide de tests créé le 2026-02-15*
*Durée estimée des tests : 30-45 minutes*
