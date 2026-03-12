# Configuration Meta Conversions API (CAPI)

Ce guide explique comment configurer le Meta Conversions API (CAPI) pour SOS Expat afin d'ameliorer le tracking des conversions et contourner les limitations des navigateurs (ITP, bloqueurs de pubs).

## Table des matieres

1. [Obtenir le Token CAPI](#1-obtenir-le-token-capi)
2. [Configurer Firebase Secret](#2-configurer-firebase-secret)
3. [Deployer les fonctions](#3-deployer-les-fonctions)
4. [Tester l'integration](#4-tester-lintegration)
5. [Verification](#5-verification)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Obtenir le Token CAPI

### Prerequis

- Acces administrateur au Meta Business Suite
- Pixel Meta configure (ID: `1887073768568784`)

### Etapes

1. **Acceder au Events Manager**
   - Aller sur [Meta Business Suite](https://business.facebook.com/)
   - Naviguer vers **Events Manager** dans le menu lateral

2. **Selectionner le Pixel**
   - Cliquer sur le Pixel SOS Expat (ID: `1887073768568784`)
   - Verifier que vous avez les permissions d'administration

3. **Acceder aux parametres CAPI**
   - Cliquer sur **Settings** (Parametres)
   - Trouver la section **Conversions API**

4. **Generer le Access Token**
   - Cliquer sur **Generate Access Token**
   - Accepter les permissions demandees
   - Le token sera affiche une seule fois

5. **Copier le token**
   - Le token commence par `EAA...`
   - **IMPORTANT**: Copiez-le immediatement et stockez-le de maniere securisee
   - Ce token n'expire pas mais peut etre revoque

### Securite du Token

- Ne jamais commiter le token dans le code source
- Ne pas le partager dans des canaux non securises
- Utiliser uniquement Firebase Secrets pour le stockage

---

## 2. Configurer Firebase Secret

### Prerequis

- Firebase CLI installe (`npm install -g firebase-tools`)
- Connexion a Firebase (`firebase login`)
- Projet Firebase selectionne

### Definir le secret

```bash
# Definir le secret META_CAPI_TOKEN
firebase functions:secrets:set META_CAPI_TOKEN
```

Quand le prompt apparait:
```
? Enter a value for META_CAPI_TOKEN: [coller le token EAA... ici]
```

### Verifier la configuration

```bash
# Verifier que le secret est configure
firebase functions:secrets:access META_CAPI_TOKEN
```

Le token devrait s'afficher (masque partiellement pour des raisons de securite).

### Lister tous les secrets

```bash
# Voir tous les secrets configures
firebase functions:secrets:list
```

Vous devriez voir `META_CAPI_TOKEN` dans la liste.

---

## 3. Deployer les fonctions

### Naviguer vers le dossier functions

```bash
cd sos/firebase/functions
```

### Installer les dependances (si necessaire)

```bash
npm install
```

### Deployer les fonctions

```bash
npm run deploy
```

Ou deployer uniquement les fonctions specifiques:

```bash
firebase deploy --only functions:trackMetaEvent
```

### Verifier le deploiement

```bash
# Voir les logs des fonctions
firebase functions:log
```

---

## 4. Tester l'integration

### Activer le mode test

1. Aller dans **Events Manager**
2. Selectionner le Pixel `1887073768568784`
3. Cliquer sur **Test Events** dans le menu lateral

### Generer un Test Event Code

1. Dans l'onglet **Test Events**
2. Cliquer sur **Confirm your server's events**
3. Un code de test sera genere (ex: `TEST12345`)

### Utiliser le Test Code

Le test code peut etre ajoute dans les appels CAPI pour verification:

```javascript
// Exemple d'appel avec test_event_code
const eventData = {
  event_name: 'Purchase',
  event_time: Math.floor(Date.now() / 1000),
  user_data: {
    em: hashedEmail,
    ph: hashedPhone
  },
  custom_data: {
    value: 99.99,
    currency: 'EUR'
  },
  test_event_code: 'TEST12345' // Uniquement pour les tests
};
```

### Envoyer des evenements de test

1. Declencher des actions sur le site (inscription, achat, etc.)
2. Observer les evenements dans l'onglet **Test Events**
3. Verifier que les evenements CAPI apparaissent

---

## 5. Verification

### Verifier dans Events Manager

1. Aller dans **Events Manager > Overview**
2. Observer les graphiques d'evenements
3. Verifier la colonne **Connection Method**:
   - `Browser` = Pixel JavaScript
   - `Server` = Conversions API
   - `Both` = Deduplication reussie

### Comparer Pixel vs CAPI

| Metrique | Pixel | CAPI | Status |
|----------|-------|------|--------|
| PageView | X | X | OK |
| ViewContent | X | X | OK |
| InitiateCheckout | X | X | OK |
| Purchase | X | X | OK |

### Verifier la deduplication

La deduplication fonctionne grace au `event_id`:

```javascript
// Le meme event_id doit etre envoye cote client ET serveur
const eventId = generateUniqueId();

// Cote client (Pixel)
fbq('track', 'Purchase', {...}, {eventID: eventId});

// Cote serveur (CAPI)
{
  event_name: 'Purchase',
  event_id: eventId,  // Meme ID
  ...
}
```

### Score de qualite des evenements

- Aller dans **Events Manager > Data Sources**
- Cliquer sur le Pixel
- Verifier le **Event Match Quality** score
- Objectif: > 6.0 pour une bonne qualite

---

## 6. Troubleshooting

### Le token ne fonctionne pas

```bash
# Verifier que le secret est bien defini
firebase functions:secrets:access META_CAPI_TOKEN

# Regenerer le token si necessaire dans Events Manager
```

### Les evenements n'apparaissent pas

1. **Verifier les logs Firebase**
   ```bash
   firebase functions:log --only trackMetaEvent
   ```

2. **Verifier l'endpoint Meta**
   - URL: `https://graph.facebook.com/v18.0/1887073768568784/events`
   - Methode: POST
   - Headers: `Authorization: Bearer <TOKEN>`

3. **Verifier le format des donnees**
   - `event_time` doit etre en timestamp Unix (secondes)
   - Les donnees utilisateur doivent etre hashees en SHA256

### Erreurs courantes

| Erreur | Cause | Solution |
|--------|-------|----------|
| `Invalid OAuth access token` | Token invalide ou expire | Regenerer le token |
| `Invalid parameter` | Format de donnees incorrect | Verifier le schema JSON |
| `Rate limit exceeded` | Trop de requetes | Implementer un backoff |
| `Deduplication failed` | event_id manquant | Ajouter event_id unique |

### Logs de debug

Pour activer les logs detailles:

```javascript
// Dans la fonction Cloud
console.log('CAPI Event:', JSON.stringify(eventData, null, 2));
console.log('Response:', JSON.stringify(response.data, null, 2));
```

---

## Ressources

- [Documentation officielle Meta CAPI](https://developers.facebook.com/docs/marketing-api/conversions-api)
- [Guide de deduplication](https://developers.facebook.com/docs/marketing-api/conversions-api/deduplicate-pixel-and-server-events)
- [Event Match Quality](https://www.facebook.com/business/help/765081237991954)
- [Firebase Secrets](https://firebase.google.com/docs/functions/config-env#secret-manager)

---

## Changelog

| Date | Version | Description |
|------|---------|-------------|
| 2025-01 | 1.0 | Creation initiale du guide |
