# Scripts de Traduction Chatter

Ce dossier contient tous les scripts nécessaires pour gérer les traductions du module Chatter dans 9 langues.

## Scripts Disponibles

### 1. Vérification
```bash
node verify-chatter-translations.cjs
```
Vérifie que toutes les traductions Chatter sont présentes dans toutes les langues.
- ✅ Retourne 0 si toutes les traductions sont présentes
- ❌ Retourne 1 si des traductions manquent

### 2. Ajout de Traductions (Complet)
```bash
node add-all-chatter-translations.cjs
```
Ajoute 161 traductions Chatter dans les 9 langues.

### 3. Ajout de Traductions (Restantes)
```bash
node add-remaining-chatter-translations.cjs
```
Ajoute les 41 traductions Chatter manquantes.

### 4. Utilitaires
```bash
node find-remaining-keys.cjs
```
Liste les clés de traduction encore manquantes.

## Statut Actuel

✅ **100% COMPLET** - Toutes les 202 traductions Chatter sont présentes dans les 9 langues.

## Langues Supportées

| Code | Langue | Fichier |
|------|--------|---------|
| `fr` | Français | `sos/src/helper/fr.json` |
| `en` | Anglais | `sos/src/helper/en.json` |
| `es` | Espagnol | `sos/src/helper/es.json` |
| `de` | Allemand | `sos/src/helper/de.json` |
| `ru` | Russe | `sos/src/helper/ru.json` |
| `pt` | Portugais | `sos/src/helper/pt.json` |
| `ch` | Chinois | `sos/src/helper/ch.json` |
| `hi` | Hindi | `sos/src/helper/hi.json` |
| `ar` | Arabe | `sos/src/helper/ar.json` |

## Structure des Traductions

Toutes les clés Chatter suivent le format: `chatter.[category].[key]`

### Catégories Principales

- `chatter.affiliateCode*` - Codes d'affiliation
- `chatter.alerts.*` - Alertes et notifications
- `chatter.aria.*` - Labels d'accessibilité
- `chatter.balance.*` - Soldes et finances (dans fichiers existants)
- `chatter.badges` - Badges et gamification
- `chatter.calc.*` - Calculateur de gains
- `chatter.commissions.*` - Commissions
- `chatter.content.*` - Création de contenu
- `chatter.dashboard.*` - Interface dashboard
- `chatter.hero.*` - Sections hero
- `chatter.insights.*` - Statistiques
- `chatter.leaderboard.*` - Classements
- `chatter.payments.*` - Méthodes de paiement
- `chatter.piggyBank.*` - Tirelire (bonus verrouillé)
- `chatter.posts.*` - Publications de contenu
- `chatter.provider.*` - Programme prestataire
- `chatter.referrals.*` - Parrainages et équipe
- `chatter.register.*` - Inscription et erreurs
- `chatter.schema.*` - SEO Schema.org
- `chatter.stats.*` - Statistiques diverses
- `chatter.suspended.*` - Compte suspendu
- `chatter.tier.*` - Paliers et progression
- `chatter.tour.*` - Visite guidée
- `chatter.training.*` - Formation

## Workflow de Traduction

### Ajouter de Nouvelles Traductions

1. **Identifier les clés manquantes**
   ```bash
   # Dans le code source
   grep -r "t('chatter\." sos/src/pages/Chatter/
   ```

2. **Créer les traductions**
   ```javascript
   const newTranslations = {
     "chatter.new.key": {
       fr: "Texte français",
       en: "English text",
       es: "Texto español",
       de: "Deutscher Text",
       ru: "Русский текст",
       pt: "Texto português",
       ch: "中文文本",
       hi: "हिंदी पाठ",
       ar: "النص العربي"
     }
   };
   ```

3. **Ajouter aux fichiers JSON**
   ```javascript
   const fs = require('fs');
   const path = require('path');

   languages.forEach(lang => {
     const filePath = path.join('sos/src/helper', `${lang}.json`);
     const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
     data['chatter.new.key'] = newTranslations['chatter.new.key'][lang];

     // Trier et sauvegarder
     const sorted = Object.keys(data).sort().reduce((acc, key) => {
       acc[key] = data[key];
       return acc;
     }, {});

     fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
   });
   ```

4. **Vérifier**
   ```bash
   node verify-chatter-translations.cjs
   ```

## Bonnes Pratiques

### 1. Cohérence
- Utilisez le même ton dans toute la langue
- Respectez les conventions linguistiques (vouvoiement/tutoiement)
- Maintenez la cohérence terminologique

### 2. Variables
- Préservez toujours les variables dynamiques: `{count}`, `{amount}`, `{total}`, etc.
- Exemple: `"{count} jours restants"` → `"{count} days remaining"`

### 3. Formatage
- Tous les fichiers JSON doivent être triés alphabétiquement
- Indentation: 2 espaces
- Encodage: UTF-8
- Fin de ligne: `\n`

### 4. Validation
- Vérifiez la syntaxe JSON
- Testez dans l'application
- Validez avec des locuteurs natifs si possible

## Modules de Traductions

Les traductions sont organisées en modules pour faciliter la maintenance:

### Part 1 (28 clés)
- Codes d'affiliation
- Alertes
- ARIA
- Soldes
- Badges
- Calculateur (partiel)
- Commissions
- Contenu (badge uniquement)

### Part 2 (72 clés)
- Paiements
- Posts et publications
- Programme prestataire

### Part 3 (61 clés)
- Parrainages et équipe
- Inscription et erreurs
- SEO et Schema.org
- Statistiques
- Formation
- Suspension

### Remaining (41 clés)
- Contenu (détails)
- Dashboard
- Hero
- Leaderboard (détails)
- Informations générales

## Dépannage

### Traduction manquante dans une langue
```bash
# Identifier la clé manquante
node find-remaining-keys.cjs

# Vérifier dans le fichier JSON
node -e "const fs = require('fs'); const data = JSON.parse(fs.readFileSync('sos/src/helper/fr.json', 'utf8')); console.log(data['chatter.key.here']);"
```

### JSON invalide
```bash
# Valider la syntaxe
node -e "JSON.parse(require('fs').readFileSync('sos/src/helper/fr.json', 'utf8'))"
```

### Fichier non trié
```javascript
const fs = require('fs');
const filePath = 'sos/src/helper/fr.json';
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const sorted = Object.keys(data).sort().reduce((acc, key) => {
  acc[key] = data[key];
  return acc;
}, {});
fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
```

## Rapports Disponibles

- `CHATTER_MISSING_KEYS.json` - Liste des clés manquantes (source)
- `CHATTER_TRANSLATIONS_ADDED_REPORT.md` - Rapport d'ajout détaillé
- `CHATTER_TRANSLATIONS_COMPLETE.md` - Rapport final complet

## Historique

- **2026-02-13**: Ajout des 202 traductions Chatter manquantes (100% complet)
  - Étape 1: 161 traductions (1 446 au total)
  - Étape 2: 41 traductions (369 au total)
  - Total: 1 815 traductions ajoutées

## Contact

Pour toute question sur les traductions Chatter, consultez:
1. Ce README
2. Les rapports de traduction
3. Le code source dans `sos/src/pages/Chatter/`
