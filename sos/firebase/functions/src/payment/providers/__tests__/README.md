# Wise Provider Tests

Tests complets pour le provider de paiement international Wise (TransferWise).

## 📦 Fichiers de Tests

### `wiseProvider.test.ts`
Tests unitaires pour la classe `WiseProvider` qui gère toutes les interactions avec l'API Wise.

**Couverture** :
- ✅ Initialisation depuis Firebase Secrets
- ✅ Création de quotes (taux de change + frais)
- ✅ Création de recipients (tous types : IBAN, SWIFT, ABA, sort_code, BSB, IFSC)
- ✅ Création de transferts avec idempotency
- ✅ Funding depuis balance Wise
- ✅ Monitoring de statut (tous les états)
- ✅ Annulation de transferts
- ✅ Requêtes de balance
- ✅ Flux de paiement complet (end-to-end)
- ✅ Gestion d'erreurs (tous codes HTTP, rate limiting, retry logic)
- ✅ Authentification et sécurité

**Statistiques** :
- **~1200 lignes** de tests
- **50+ cas de tests** couvrant tous les scénarios
- **Mocks complets** pour Firebase, fetch, et secrets

### `../../affiliate/webhooks/__tests__/wiseWebhook.test.ts`
Tests unitaires pour le handler de webhooks Wise qui reçoit les événements de changement d'état des transferts.

**Couverture** :
- ✅ Vérification de signature HMAC SHA-256 (sécurité)
- ✅ Gestion des événements de changement d'état
- ✅ Mise à jour des statuts de payout
- ✅ Restauration de balance sur échec (transactions atomiques)
- ✅ Restauration des statuts de commissions
- ✅ Notifications utilisateur (email, push, in-app)
- ✅ Cas limites (events invalides, payouts introuvables)

**Statistiques** :
- **~800 lignes** de tests
- **30+ cas de tests** couvrant tous les scénarios
- **Tests de sécurité** exhaustifs

## 🚀 Exécution des Tests

### Prérequis
```bash
cd sos/firebase/functions
npm install
```

### Lancer tous les tests Wise
```bash
npm test -- wiseProvider
npm test -- wiseWebhook
```

### Lancer tous les tests payment providers
```bash
npm test -- providers
```

### Lancer avec couverture de code
```bash
npm test -- --coverage wiseProvider
```

### Lancer en mode watch (développement)
```bash
npm test -- --watch wiseProvider
```

### Lancer un test spécifique
```bash
npm test -- wiseProvider.test.ts -t "should create a quote"
```

## 📊 Structure des Tests

### Pattern de Tests Utilisé
```typescript
describe('WiseProvider', () => {
  describe('Feature Group', () => {
    it('should do something specific', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce(createMockResponse(200, mockData));

      // Act
      const result = await wiseProvider.someMethod(params);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });
  });
});
```

### Helpers Disponibles

#### `createMockResponse(status, body)`
Crée une réponse HTTP mockée pour les tests.

```typescript
const response = createMockResponse(200, { id: '123' });
mockFetch.mockResolvedValueOnce(response);
```

#### `createRateLimitResponse()`
Crée une réponse HTTP 429 avec header Retry-After.

```typescript
mockFetch.mockResolvedValueOnce(createRateLimitResponse());
```

#### `createTransferEvent(transferId, currentState, previousState)`
Crée un événement webhook Wise de changement d'état.

```typescript
const event = createTransferEvent(5001, 'outgoing_payment_sent');
```

## 🔧 Configuration Jest

Les tests utilisent Jest avec les mocks suivants :

### Mocks Globaux
- `firebase-admin/firestore` - Firestore operations
- `firebase-admin/app` - Firebase initialization
- `firebase-functions/v2` - Logger
- `../../../lib/secrets` - Firebase Secrets Manager
- `global.fetch` - HTTP requests

### Variables d'Environnement de Test
Les secrets sont mockés automatiquement :
- `WISE_API_TOKEN`: `'test-api-token'`
- `WISE_PROFILE_ID`: `'12345'`
- `WISE_MODE`: `'sandbox'`
- `WISE_WEBHOOK_SECRET`: `'test-webhook-secret'`

## 🎯 Scénarios de Tests Critiques

### 1. Flux de Paiement Complet
Test du parcours end-to-end : quote → balance check → recipient → transfer → funding

```typescript
it('should process complete payment flow successfully', async () => {
  // Mock toutes les étapes
  mockFetch
    .mockResolvedValueOnce(createMockResponse(200, mockQuote))
    .mockResolvedValueOnce(createMockResponse(200, mockBalance))
    .mockResolvedValueOnce(createMockResponse(200, mockRecipient))
    .mockResolvedValueOnce(createMockResponse(200, mockTransfer))
    .mockResolvedValueOnce(createMockResponse(200, mockFundingSuccess));

  const result = await wiseProvider.processPayment(params);

  expect(result.success).toBe(true);
  expect(mockFetch).toHaveBeenCalledTimes(5);
});
```

### 2. Balance Insuffisante
Test de la détection de balance insuffisante avant création du transfert.

```typescript
it('should fail if insufficient balance', async () => {
  const insufficientBalance = [{ amount: { value: 50 } }]; // Need 100

  mockFetch
    .mockResolvedValueOnce(createMockResponse(200, mockQuote))
    .mockResolvedValueOnce(createMockResponse(200, insufficientBalance));

  const result = await wiseProvider.processPayment(params);

  expect(result.success).toBe(false);
  expect(result.message).toContain('Insufficient Wise balance');
});
```

### 3. Webhook Signature Verification
Test de la vérification de signature HMAC pour la sécurité.

```typescript
it('should reject requests with invalid signature', async () => {
  const payload = createTransferEvent(5001, 'paid');
  const req = createMockRequest(payload, true, 'wrong-secret');

  await webhookHandler(req, res);

  expect(res.status).toHaveBeenCalledWith(401);
  expect(res.status(401).send).toHaveBeenCalledWith('Invalid signature');
});
```

### 4. Restauration de Balance sur Échec
Test de la transaction atomique qui restaure la balance et les commissions.

```typescript
it('should update payout to "failed" on cancelled state', async () => {
  const payload = createTransferEvent(5001, 'cancelled');

  mockQueryGet.mockResolvedValueOnce({
    docs: [{
      data: () => ({
        userId: 'user-123',
        amount: 10000,
        commissionIds: ['comm-1', 'comm-2'],
      }),
    }],
  });

  await webhookHandler(req, res);

  expect(mockRunTransaction).toHaveBeenCalled(); // Balance restoration
  expect(mockDocUpdate).toHaveBeenCalledWith(
    expect.objectContaining({ status: 'failed' })
  );
});
```

## 📈 Couverture de Code Attendue

**Objectif** : >90% de couverture pour tous les fichiers Wise

```
File                  | % Stmts | % Branch | % Funcs | % Lines |
----------------------|---------|----------|---------|---------|
wiseProvider.ts       |   95%   |   92%    |   100%  |   95%   |
wiseWebhook.ts        |   93%   |   90%    |   100%  |   93%   |
```

## 🐛 Debugging

### Activer les logs détaillés
```typescript
beforeEach(() => {
  jest.clearAllMocks();
  mockLogger.info.mockImplementation(console.log);
  mockLogger.error.mockImplementation(console.error);
});
```

### Inspecter les appels fetch
```typescript
console.log('Fetch calls:', mockFetch.mock.calls);
console.log('Fetch call 1:', JSON.parse(mockFetch.mock.calls[0][1].body));
```

### Vérifier les mocks Firestore
```typescript
console.log('DocUpdate calls:', mockDocUpdate.mock.calls);
console.log('Transaction calls:', mockRunTransaction.mock.calls);
```

## 📚 Ressources

- [Wise API Documentation](https://docs.wise.com/api-docs/api-reference)
- [Wise Webhooks Guide](https://docs.wise.com/api-docs/guides/webhooks)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Firebase Functions Testing](https://firebase.google.com/docs/functions/unit-testing)

## ✅ Checklist de Tests

Lors de l'ajout de nouvelles fonctionnalités Wise, s'assurer de tester :

- [ ] Cas de succès nominal
- [ ] Tous les codes d'erreur HTTP (401, 403, 404, 422, 429, 500, 503)
- [ ] Gestion des erreurs réseau (timeout, connection refused)
- [ ] Validation des paramètres d'entrée
- [ ] Idempotency (même requête = même résultat)
- [ ] Rate limiting et retry logic
- [ ] Tous les états de transfert possibles
- [ ] Signature webhook (valid, invalid, missing)
- [ ] Transactions atomiques Firestore
- [ ] Notifications utilisateur

## 🔒 Sécurité

### Secrets Ne Jamais Commiter
- ❌ `WISE_API_TOKEN` (production)
- ❌ `WISE_WEBHOOK_SECRET` (production)
- ✅ Utiliser des valeurs mockées dans les tests
- ✅ Secrets stockés dans Firebase Secret Manager

### Validation dans les Tests
- Vérifier que les signatures sont validées
- Vérifier que les secrets mockés ne fuient pas
- Vérifier que les données sensibles ne sont pas loggées

## 🚨 Maintenance

### Avant chaque déploiement
```bash
# Lancer tous les tests
npm test

# Vérifier la couverture
npm test -- --coverage

# Vérifier le linting
npm run lint
```

### En cas d'échec de tests
1. Vérifier les logs détaillés : `npm test -- --verbose`
2. Vérifier les mocks : sont-ils à jour avec l'API Wise ?
3. Vérifier les secrets : sont-ils bien mockés ?
4. Vérifier les types TypeScript : `npm run build`

## 📞 Support

Pour toute question ou problème avec les tests Wise :
1. Consulter la documentation Wise API
2. Vérifier les logs Firebase Functions
3. Contacter l'équipe de développement
