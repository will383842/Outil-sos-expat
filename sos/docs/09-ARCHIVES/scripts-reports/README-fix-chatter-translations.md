# Script fix-chatter-translations.cjs

## Objectif

Ce script extrait automatiquement tous les messages i18n (FormattedMessage) du fichier `ChatterLanding.tsx` et les ajoute/met à jour dans les 9 fichiers de traduction de l'application.

## Langues supportées

- 🇫🇷 Français (fr)
- 🇬🇧 Anglais (en)
- 🇪🇸 Espagnol (es)
- 🇩🇪 Allemand (de)
- 🇷🇺 Russe (ru)
- 🇵🇹 Portugais (pt)
- 🇨🇳 Chinois (ch)
- 🇮🇳 Hindi (hi)
- 🇸🇦 Arabe (ar)

## Fonctionnement

### 1. Extraction automatique

Le script analyse `ChatterLanding.tsx` et extrait tous les messages au format :
- `<FormattedMessage id="..." defaultMessage="..." />`
- `intl.formatMessage({ id: '...', defaultMessage: '...' })`

### 2. Traductions manuelles

Le script contient un dictionnaire `TRANSLATIONS` avec 95 traductions manuelles professionnelles pour toutes les clés principales :
- SEO (title, description, OG)
- Hero Section (titre, sources de revenus)
- Revenue Section (3 façons de gagner)
- Proof Section (témoignages, statistiques)
- Success Stories (histoires de réussite détaillées)
- Agency Section (modèle d'agence, calculateur)
- Risk Section (zéro risque)
- FAQ Section
- CTA Final (appels à l'action)

### 3. Mise à jour intelligente

Le script :
- ✅ Ajoute les nouvelles clés manquantes
- ✅ Met à jour les clés avec traductions manuelles
- ✅ Préserve les traductions existantes non manuelles
- ✅ Trie les clés alphabétiquement
- ✅ Formate le JSON proprement (2 espaces)

## Usage

```bash
# Depuis la racine du projet
node sos/scripts/fix-chatter-translations.cjs
```

## Exemple de sortie

```
🚀 Fix Chatter Translations

============================================================
📖 Lecture de .../ChatterLanding.tsx...
✅ 95 messages extraits

📚 Mise à jour des fichiers de traduction...

📝 Mise à jour de fr.json...
  ✅ 0 clés ajoutées, 95 mises à jour, 0 inchangées

📝 Mise à jour de en.json...
  ✅ 0 clés ajoutées, 95 mises à jour, 0 inchangées

[...]

============================================================
✅ TERMINÉ !
```

## Fichiers modifiés

- `sos/src/helper/fr.json`
- `sos/src/helper/en.json`
- `sos/src/helper/es.json`
- `sos/src/helper/de.json`
- `sos/src/helper/ru.json`
- `sos/src/helper/pt.json`
- `sos/src/helper/ch.json`
- `sos/src/helper/ar.json`
- `sos/src/helper/hi.json`

## Traductions couvertes

### ✅ 100% traduites (95 clés)

Toutes les clés de `ChatterLanding` ont des traductions professionnelles dans les 9 langues :

- `chatter.landing.seo.*` (SEO meta)
- `chatter.landing.hero.*` (Hero section)
- `chatter.landing.revenue.*` (3 sources de revenus)
- `chatter.landing.source1.*` (Appels directs)
- `chatter.landing.source2.*` (Équipe MLM)
- `chatter.landing.source3.*` (Partenaires)
- `chatter.landing.proof.*` (Preuve sociale)
- `chatter.landing.success.*` (Success stories)
- `chatter.landing.agency.*` (Modèle agence)
- `chatter.landing.calc.*` (Calculateur)
- `chatter.landing.risk.*` (Zéro risque)
- `chatter.landing.payment.*` (Paiements)
- `chatter.faq.*` (FAQ)
- `chatter.landing.cta.*` (CTA)
- `chatter.landing.recap.*` (Récap)
- `chatter.aria.*` (Accessibilité)

## Notes techniques

### Échappement des apostrophes

Le script utilise des double quotes pour toutes les chaînes contenant des apostrophes afin d'éviter les problèmes d'échappement JSON :

```javascript
// ✅ Correct
'chatter.landing.quote': {
  fr: "J'ai quitté mon job",  // Double quotes
}

// ❌ Incorrect (génère "J" dans le JSON)
'chatter.landing.quote': {
  fr: 'J\'ai quitté mon job',  // Single quotes + escape
}
```

### Tri alphabétique

Les clés sont automatiquement triées alphabétiquement dans chaque fichier JSON pour faciliter la maintenance.

### Détection intelligente

Le script détecte et remplace :
- Les clés préfixées `[AUTO]` (traductions automatiques à corriger)
- Les traductions obsolètes
- Les traductions manquantes

## Maintenance

### Ajouter de nouvelles traductions

1. Ajouter les clés dans `ChatterLanding.tsx` avec `defaultMessage` en français
2. Ajouter les traductions dans le dictionnaire `TRANSLATIONS` du script
3. Exécuter le script

### Mettre à jour une traduction existante

1. Modifier la valeur dans le dictionnaire `TRANSLATIONS`
2. Exécuter le script (force la mise à jour)

## Vérification

Après exécution, vérifier qu'il ne reste aucune clé `[AUTO]` :

```bash
grep -r "\[AUTO\]" sos/src/helper/*.json
# Doit retourner 0 résultat
```

## Qualité des traductions

- **Français** : Source (defaultMessage du TSX)
- **Autres langues** : Traductions professionnelles adaptées culturellement
  - Anglais : US English
  - Espagnol : Espagnol international
  - Allemand : Allemand formel
  - Russe : Russe moderne
  - Portugais : Portugais international
  - Chinois : Chinois simplifié
  - Hindi : Hindi standard
  - Arabe : Arabe standard moderne

## Next steps

Pour ajouter un nouveau composant i18n :

1. Créer le composant avec `<FormattedMessage id="..." defaultMessage="..." />`
2. Ajouter les traductions dans le dictionnaire du script
3. Exécuter le script

Le pattern peut être réutilisé pour d'autres composants (Influencer, Blogger, etc.).
