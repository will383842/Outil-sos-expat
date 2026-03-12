# Test du script fix-blogger-translations.cjs

## Test 1: Vérification initiale

```bash
node sos/scripts/fix-blogger-translations.cjs
```

**Résultat attendu**: 0 traductions manquantes

## Test 2: Simulation d'une nouvelle clé

Pour tester que le script fonctionne, vous pouvez :

1. Ajouter temporairement une nouvelle clé dans `BloggerLanding.tsx` :

```tsx
<FormattedMessage 
  id="blogger.test.newkey" 
  defaultMessage="This is a test translation" 
/>
```

2. Exécuter le script :

```bash
node sos/scripts/fix-blogger-translations.cjs
```

3. Vérifier que la clé a été ajoutée dans `en/common.json` :

```bash
grep "blogger.test.newkey" sos/src/locales/en/common.json
```

4. Vérifier que les autres langues ont le marqueur `[TO TRANSLATE]` :

```bash
grep "blogger.test.newkey" sos/src/locales/fr-fr/common.json
```

5. Nettoyer le test (supprimer la clé du TSX et des JSON)

## Test 3: Vérification de la détection des patterns

Le script détecte ces patterns :

### Pattern FormattedMessage simple
```tsx
<FormattedMessage id="blogger.hero.title" defaultMessage="Title" />
```

### Pattern intl.formatMessage
```tsx
const msg = intl.formatMessage({ 
  id: 'blogger.hero.subtitle', 
  defaultMessage: 'Subtitle' 
});
```

### Pattern avec values
```tsx
<FormattedMessage 
  id="blogger.hero.amount" 
  defaultMessage="{amount} per call"
  values={{ amount: '$10' }}
/>
```

### Pattern titleId/titleDefault
```tsx
const profiles = [
  { 
    titleId: 'blogger.profile.nomad.title',
    titleDefault: 'Digital Nomad',
    descId: 'blogger.profile.nomad.desc',
    descDefault: 'Description'
  }
];
```

### Pattern arrays
```tsx
const topics = [
  { 
    name: intl.formatMessage({ 
      id: 'blogger.topic.visa', 
      defaultMessage: 'Visa Guides' 
    })
  }
];
```

## Test 4: Vérification de la qualité des traductions

Comparer quelques traductions clés :

```bash
# blogger.hero.title dans toutes les langues
cd sos/src/locales
for lang in en fr-fr es-es de-de pt-pt ru-ru zh-cn hi-in ar-sa; do
  echo -n "$lang: "
  grep "\"blogger\.hero\.title\"" $lang/common.json | cut -d'"' -f4
done
```

## Test 5: Vérification de l'intégrité JSON

Vérifier que tous les JSON sont valides après modifications :

```bash
cd sos/src/locales
for lang in en fr-fr es-es de-de pt-pt ru-ru zh-cn hi-in ar-sa; do
  echo -n "Testing $lang... "
  node -e "JSON.parse(require('fs').readFileSync('$lang/common.json', 'utf8'))" && echo "✅ OK" || echo "❌ INVALID JSON"
done
```

## Test 6: Compter les clés par préfixe

```bash
cd sos/src/locales
echo "Clés par préfixe dans common.json (EN):"
grep -o "\"[^\"]*\"\s*:" en/common.json | cut -d'"' -f2 | cut -d'.' -f1 | sort | uniq -c | sort -rn | head -10
```

## Résultats attendus

- ✅ Toutes les langues ont exactement 328 clés `blogger.*`
- ✅ Aucune clé marquée `[TO TRANSLATE]` pour blogger
- ✅ Tous les JSON sont valides
- ✅ Les traductions sont cohérentes et professionnelles
- ✅ Le tri alphabétique est respecté

## Automatisation

Le script peut être ajouté dans un hook pre-commit ou dans la CI/CD :

```bash
# .husky/pre-commit
node sos/scripts/fix-blogger-translations.cjs
if [ $? -ne 0 ]; then
  echo "❌ Erreur: traductions manquantes détectées"
  exit 1
fi
```

## Notes

- Le script est idempotent (peut être exécuté plusieurs fois sans effet de bord)
- Les traductions existantes ne sont JAMAIS écrasées
- Le tri alphabétique facilite les merges Git
- Format JSON standardisé (2 espaces, newline finale)

---

**Status**: ✅ Tous les tests passent (2026-02-13)
