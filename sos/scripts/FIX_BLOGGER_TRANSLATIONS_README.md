# Fix Blogger Translations Script

## Description

Script Node.js qui extrait automatiquement toutes les clés de traduction de `BloggerLanding.tsx` et vérifie/ajoute les traductions manquantes dans les 9 langues supportées.

## Langues supportées

1. 🇬🇧 English (`en`)
2. 🇫🇷 Français (`fr-fr`)
3. 🇪🇸 Español (`es-es`)
4. 🇩🇪 Deutsch (`de-de`)
5. 🇵🇹 Português (`pt-pt`)
6. 🇷🇺 Русский (`ru-ru`)
7. 🇨🇳 中文 (`zh-cn`)
8. 🇮🇳 हिन्दी (`hi-in`)
9. 🇸🇦 العربية (`ar-sa`)

## Usage

```bash
node sos/scripts/fix-blogger-translations.cjs
```

## Fonctionnalités

### 1. Extraction intelligente des clés

Le script détecte automatiquement toutes les variations de clés de traduction :

- `<FormattedMessage id="..." defaultMessage="..." />`
- `intl.formatMessage({ id: '...', defaultMessage: '...' })`
- Objets avec `titleId`, `descId`, `typeId`, `textId` et leurs `Default` correspondants
- Patterns dans les FAQs (`question`, `answer`)
- Patterns dans les arrays (`name`, `desc`)

### 2. Rapport de couverture

Affiche un rapport détaillé pour chaque langue :

```
📊 Rapport de couverture des traductions:

  ✅ en (English): 165/165 (100.0%)
  ✅ fr-fr (Français): 165/165 (100.0%)
  ⚠️  es-es (Español): 163/165 (98.8%)
      🔄 2 marquées [TO TRANSLATE]
  ...
```

### 3. Ajout automatique des traductions manquantes

- Pour **l'anglais** : utilise directement le `defaultMessage`
- Pour **les autres langues** : ajoute `[TO TRANSLATE] + defaultMessage`

### 4. Tri alphabétique

Les clés sont automatiquement triées par ordre alphabétique dans tous les fichiers JSON.

## Workflow recommandé

### Étape 1 : Vérifier la couverture

```bash
node sos/scripts/fix-blogger-translations.cjs
```

### Étape 2 : Ajouter les traductions manquantes

Si le script trouve des clés manquantes, elles sont automatiquement ajoutées avec le marqueur `[TO TRANSLATE]`.

### Étape 3 : Traduire automatiquement (si disponible)

```bash
node sos/src/locales/smart-translate.cjs
```

Ou traduire manuellement en cherchant `[TO TRANSLATE]` dans les fichiers JSON.

## Exemples de patterns détectés

### Pattern 1 : FormattedMessage simple

```tsx
<FormattedMessage id="blogger.hero.title" defaultMessage="Earn $10/call with your blog" />
```

### Pattern 2 : intl.formatMessage

```tsx
const title = intl.formatMessage({
  id: 'blogger.hero.subtitle',
  defaultMessage: 'Write articles and earn money'
});
```

### Pattern 3 : Objets avec Default

```tsx
const faqs = [
  {
    titleId: 'blogger.faq.q1',
    titleDefault: 'How does it work?',
    descId: 'blogger.faq.a1',
    descDefault: 'Write articles...'
  }
];
```

### Pattern 4 : Arrays de configuration

```tsx
const topics = articleTopics.map((topic) => ({
  name: intl.formatMessage({
    id: 'blogger.topic.visa',
    defaultMessage: 'Visa Guides'
  })
}));
```

## Fichiers modifiés

Le script modifie uniquement les fichiers `common.json` dans chaque dossier de langue :

- `sos/src/locales/en/common.json`
- `sos/src/locales/fr-fr/common.json`
- `sos/src/locales/es-es/common.json`
- `sos/src/locales/de-de/common.json`
- `sos/src/locales/pt-pt/common.json`
- `sos/src/locales/ru-ru/common.json`
- `sos/src/locales/zh-cn/common.json`
- `sos/src/locales/hi-in/common.json`
- `sos/src/locales/ar-sa/common.json`

## Sécurité

- ✅ Le script ne supprime JAMAIS de clés existantes
- ✅ Backup automatique via Git (commit avant d'exécuter)
- ✅ Tri alphabétique pour éviter les conflits de merge
- ✅ Filtrage strict sur `blogger.*` uniquement

## Rapport actuel (2026-02-13)

```
✅ 165 clés extraites de BloggerLanding.tsx
✅ 100% de couverture dans les 9 langues
✅ 0 traductions manquantes
```

## Notes

- Le script ignore les clés qui ne commencent pas par `blogger.`
- Les traductions existantes ne sont jamais écrasées
- Format JSON avec indentation 2 espaces
- Newline finale ajoutée automatiquement

## Troubleshooting

### Aucune clé détectée

Vérifiez que `BloggerLanding.tsx` existe :
```bash
ls sos/src/pages/Blogger/BloggerLanding.tsx
```

### Fichiers de langue manquants

Vérifiez la structure :
```bash
ls sos/src/locales/*/common.json
```

### Regex ne détecte pas certaines clés

Ouvrez `fix-blogger-translations.cjs` et ajoutez un nouveau pattern dans `extractTranslationKeys()`.

## Auteur

Script créé pour le projet SOS-Expat - 2026
