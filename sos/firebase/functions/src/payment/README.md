# Systeme de Paiement Centralise

## Vue d'ensemble

Le systeme de paiement centralise de SOS-Expat gere les retraits pour tous les types d'utilisateurs (Chatters, Influenceurs, Bloggers) avec support de deux fournisseurs de paiement:

- **Wise** : Virements bancaires internationaux (170+ pays)
- **Flutterwave** : Mobile Money pour l'Afrique (zone FCFA et autres pays africains)

### Caracteristiques principales

- Support double fournisseur (Wise + Flutterwave)
- Modes de paiement manuel et automatique
- Suivi professionnel avec piste d'audit complete
- Support de 170+ pays dans le monde
- Interface d'administration complete
- Webhooks pour mise a jour en temps reel

---

## Architecture

### Structure des dossiers

```
payment/
|-- config/
|   |-- countriesConfig.ts    # Configuration des pays supportes
|   |-- mobileMoneyConfig.ts  # Configuration Mobile Money
|
|-- providers/
|   |-- wiseProvider.ts       # Integration API Wise
|   |-- flutterwaveProvider.ts # Integration API Flutterwave
|
|-- services/
|   |-- paymentService.ts     # Service principal de paiement
|   |-- paymentRouter.ts      # Routeur intelligent des paiements
|   |-- trackingService.ts    # Service de suivi et audit
|
|-- callables/
|   |-- savePaymentMethod.ts     # Sauvegarder methode de paiement
|   |-- getPaymentMethods.ts     # Obtenir methodes de paiement
|   |-- requestWithdrawal.ts     # Demander un retrait
|   |-- cancelWithdrawal.ts      # Annuler un retrait
|   |-- getWithdrawalStatus.ts   # Statut d'un retrait
|   |-- getWithdrawalHistory.ts  # Historique des retraits
|   |-- admin/                   # Fonctions admin
|       |-- getPaymentConfig.ts
|       |-- updatePaymentConfig.ts
|       |-- getPendingWithdrawals.ts
|       |-- approveWithdrawal.ts
|       |-- rejectWithdrawal.ts
|       |-- processWithdrawal.ts
|       |-- getPaymentStats.ts
|       |-- getAuditLogs.ts
|       |-- exportWithdrawals.ts
|
|-- triggers/
|   |-- onWithdrawalCreated.ts       # Trigger creation retrait
|   |-- onWithdrawalStatusChanged.ts # Trigger changement statut
|   |-- processAutomaticPayments.ts  # Traitement automatique
|   |-- webhookWise.ts               # Webhook Wise
|   |-- webhookFlutterwave.ts        # Webhook Flutterwave
|
|-- types/
|   |-- index.ts              # Types TypeScript
|
|-- index.ts                  # Export principal
```

---

## Types d'utilisateurs

Le systeme supporte trois types d'utilisateurs pouvant demander des retraits:

| Type | Collection Firestore | Description |
|------|---------------------|-------------|
| `chatter` | `chatters` | Moderateurs de chat |
| `influencer` | `influencers` | Influenceurs partenaires |
| `blogger` | `bloggers` | Createurs de contenu |

---

## Fournisseurs de paiement

### Wise (Virements bancaires)

#### Pays supportes

Wise supporte les virements bancaires vers 150+ pays incluant:

**Europe**
- France, Allemagne, Espagne, Italie, Royaume-Uni, Belgique, Pays-Bas, Portugal, Suisse, Autriche, Luxembourg, et tous les pays de l'UE/EEE

**Amerique du Nord**
- Etats-Unis, Canada, Mexique

**Amerique Latine**
- Bresil, Argentine, Chili, Colombie, Perou, et plus

**Asie**
- Japon, Coree du Sud, Chine, Hong Kong, Singapour, Malaisie, Thailande, Vietnam, Indonesie, Philippines, Inde, Pakistan, Bangladesh, Sri Lanka, et plus

**Moyen-Orient**
- Emirats Arabes Unis, Arabie Saoudite, Qatar, Koweit, Bahrein, Oman, Israel, Jordanie, Liban, Turquie, Egypte, Maroc, Algerie, Tunisie

**Oceanie**
- Australie, Nouvelle-Zelande, Fidji, et plus

#### Fonctionnement

1. **Creation d'un devis** : Obtention du taux de change et des frais
2. **Creation du destinataire** : Enregistrement des coordonnees bancaires
3. **Creation du transfert** : Liaison devis + destinataire
4. **Financement** : Debit du solde Wise
5. **Suivi** : Mise a jour via webhooks

#### Details bancaires requis

Les champs requis varient selon le pays:

| Type | Champs requis | Pays |
|------|--------------|------|
| IBAN | `iban` | Europe, Moyen-Orient |
| ABA | `routingNumber`, `accountNumber` | Etats-Unis |
| Sort Code | `sortCode`, `accountNumber` | Royaume-Uni |
| BSB | `bsb`, `accountNumber` | Australie |
| IFSC | `ifsc`, `accountNumber` | Inde |
| SWIFT/BIC | `swiftBic`, `accountNumber` | International |

#### Integration API

```typescript
// Exemple d'utilisation
const wise = WiseProvider.fromSecrets();

const result = await wise.processPayment({
  withdrawalId: 'wd_123',
  amount: 10000, // $100.00 en cents
  sourceCurrency: 'USD',
  targetCurrency: 'EUR',
  recipient: {
    type: 'bank_transfer',
    accountHolderName: 'Jean Dupont',
    iban: 'FR7630006000011234567890189',
    country: 'FR',
    currency: 'EUR',
  },
  reference: 'SOS-Expat Retrait',
});
```

---

### Flutterwave (Mobile Money)

#### Pays supportes

Flutterwave supporte le Mobile Money dans 40+ pays africains:

**Zone FCFA - Afrique de l'Ouest (XOF)**
- Senegal, Cote d'Ivoire, Mali, Burkina Faso, Benin, Togo, Niger, Guinee

**Zone FCFA - Afrique Centrale (XAF)**
- Cameroun, Gabon, Congo, Tchad, Centrafrique, Guinee Equatoriale

**Autres pays africains**
- Nigeria (NGN), Ghana (GHS), Kenya (KES), Tanzanie (TZS), Ouganda (UGX), Rwanda (RWF), Zambie (ZMW), Afrique du Sud (ZAR), et plus

#### Operateurs Mobile Money supportes

| Operateur | Pays |
|-----------|------|
| Orange Money | Senegal, Cote d'Ivoire, Mali, Cameroun, Burkina Faso, Guinee, Niger |
| Wave | Senegal, Cote d'Ivoire, Mali, Burkina Faso |
| MTN MoMo | Ghana, Ouganda, Cameroun, Cote d'Ivoire, Rwanda, Benin |
| M-Pesa | Kenya, Tanzanie |
| Airtel Money | Kenya, Ouganda, Tanzanie, Rwanda, Gabon, Congo, Tchad |
| Moov Money | Cote d'Ivoire, Benin, Togo |
| Free Money | Senegal |
| T-Money | Togo |
| Flooz | Togo, Benin |

#### Fonctionnement

1. **Validation du numero** : Verification du format selon le pays/operateur
2. **Calcul des frais** : Obtention des frais de transfert
3. **Creation du transfert** : Envoi vers le compte mobile money
4. **Confirmation** : Mise a jour via webhook

#### Integration API

```typescript
// Exemple d'utilisation
const flutterwave = createFlutterwaveProvider();

const result = await flutterwave.processPayment({
  withdrawalId: 'wd_456',
  amount: 50000, // 50,000 XOF
  currency: 'XOF',
  recipient: {
    type: 'mobile_money',
    provider: 'orange_money',
    phoneNumber: '+221771234567',
    country: 'SN',
    accountName: 'Mamadou Diallo',
    currency: 'XOF',
  },
  reference: 'ref_456',
  narration: 'Retrait SOS-Expat',
});
```

---

## Flux de paiement

### Cycle de vie d'un retrait

```
[1] PENDING      -> Demande soumise par l'utilisateur
[2] VALIDATING   -> Verification en cours
[3] APPROVED     -> Approuve par admin (mode manuel)
[4] QUEUED       -> En file d'attente pour traitement
[5] PROCESSING   -> Traitement par le fournisseur
[6] SENT         -> Envoye, en attente de confirmation
[7] COMPLETED    -> Termine avec succes

Etats alternatifs:
- FAILED        -> Echec (peut etre reessaye)
- REJECTED      -> Rejete par admin
- CANCELLED     -> Annule par l'utilisateur
```

### Diagramme de flux

```
Utilisateur                  Systeme                    Admin
     |                          |                         |
     |-- [Demande retrait] ---->|                         |
     |                          |-- Validation            |
     |                          |                         |
     |        [Mode Manuel] ----|-- Notification -------->|
     |                          |<-- [Approuve/Rejete] ---|
     |                          |                         |
     |        [Mode Auto]  -----|-- Traitement auto       |
     |                          |                         |
     |                          |-- Envoi fournisseur     |
     |                          |                         |
     |                          |<-- [Webhook] -----------|
     |                          |                         |
     |<-- [Notification] -------|                         |
```

---

## Configuration

### Parametres de configuration

La configuration est stockee dans Firestore sous `config/payment_config`:

```typescript
interface PaymentConfig {
  // Mode de traitement
  paymentMode: 'manual' | 'automatic' | 'hybrid';
  autoPaymentThreshold: number; // Seuil mode hybride (cents)

  // Limites
  minimumWithdrawal: number;    // Montant minimum (cents)
  maximumWithdrawal: number;    // Montant maximum (cents)
  dailyLimit: number;           // Limite journaliere (cents)
  monthlyLimit: number;         // Limite mensuelle (cents)

  // Timing
  validationPeriodDays: number; // Jours avant premier retrait
  autoPaymentDelayHours: number; // Delai avant traitement auto

  // Retry
  maxRetries: number;           // Tentatives max
  retryDelayMinutes: number;    // Delai entre tentatives

  // Notifications
  notifyOnRequest: boolean;
  notifyOnCompletion: boolean;
  notifyOnFailure: boolean;
  adminEmails: string[];

  // Fournisseurs
  wiseEnabled: boolean;
  flutterwaveEnabled: boolean;
}
```

### Valeurs par defaut

```typescript
const DEFAULT_CONFIG = {
  paymentMode: 'hybrid',
  autoPaymentThreshold: 50000,    // $500

  minimumWithdrawal: 1000,        // $10
  maximumWithdrawal: 500000,      // $5,000
  dailyLimit: 500000,             // $5,000/jour
  monthlyLimit: 2000000,          // $20,000/mois

  validationPeriodDays: 7,
  autoPaymentDelayHours: 24,

  maxRetries: 3,
  retryDelayMinutes: 60,

  notifyOnRequest: true,
  notifyOnCompletion: true,
  notifyOnFailure: true,
  adminEmails: [],

  wiseEnabled: true,
  flutterwaveEnabled: true,
};
```

### Modes de paiement

| Mode | Description |
|------|-------------|
| `manual` | Tous les retraits necessitent approbation admin |
| `automatic` | Tous les retraits sont traites automatiquement |
| `hybrid` | Auto sous le seuil, manuel au-dessus |

---

## Reference API

### Fonctions utilisateur (Callables)

#### `savePaymentMethod`

Sauvegarde une methode de paiement pour un utilisateur.

**Entree:**
```typescript
{
  details: BankTransferDetails | MobileMoneyDetails;
  setAsDefault?: boolean;
}
```

**Sortie:**
```typescript
{
  success: true;
  method: UserPaymentMethod;
}
```

---

#### `getPaymentMethods`

Recupere les methodes de paiement d'un utilisateur.

**Entree:** Aucune (utilise l'auth)

**Sortie:**
```typescript
{
  success: true;
  methods: UserPaymentMethod[];
}
```

---

#### `requestWithdrawal`

Cree une nouvelle demande de retrait.

**Entree:**
```typescript
{
  amount: number;           // Montant en cents
  paymentMethodId: string;  // ID methode de paiement
}
```

**Sortie:**
```typescript
{
  success: true;
  withdrawal: WithdrawalRequest;
}
```

---

#### `cancelWithdrawal`

Annule un retrait en attente.

**Entree:**
```typescript
{
  withdrawalId: string;
  reason?: string;
}
```

**Sortie:**
```typescript
{
  success: true;
}
```

---

#### `getWithdrawalStatus`

Recupere le statut d'un retrait avec timeline de suivi.

**Entree:**
```typescript
{
  withdrawalId: string;
}
```

**Sortie:**
```typescript
{
  success: true;
  withdrawal: WithdrawalRequest;
  tracking: PaymentTrackingSummary;
}
```

---

#### `getWithdrawalHistory`

Recupere l'historique des retraits.

**Entree:**
```typescript
{
  limit?: number;
  status?: WithdrawalStatus[];
}
```

**Sortie:**
```typescript
{
  success: true;
  withdrawals: WithdrawalRequest[];
}
```

---

### Fonctions admin (Callables)

#### `adminGetPaymentConfig`

Recupere la configuration du systeme de paiement.

**Sortie:**
```typescript
{
  success: true;
  config: PaymentConfig;
}
```

---

#### `adminUpdatePaymentConfig`

Met a jour la configuration.

**Entree:**
```typescript
{
  updates: Partial<PaymentConfig>;
}
```

**Sortie:**
```typescript
{
  success: true;
  config: PaymentConfig;
}
```

---

#### `adminGetPendingWithdrawals`

Recupere les retraits en attente.

**Entree:**
```typescript
{
  userType?: PaymentUserType;
  limit?: number;
}
```

**Sortie:**
```typescript
{
  success: true;
  withdrawals: WithdrawalRequest[];
}
```

---

#### `adminApproveWithdrawal`

Approuve un retrait pour traitement.

**Entree:**
```typescript
{
  withdrawalId: string;
}
```

**Sortie:**
```typescript
{
  success: true;
}
```

---

#### `adminRejectWithdrawal`

Rejette un retrait avec motif.

**Entree:**
```typescript
{
  withdrawalId: string;
  reason: string;
}
```

**Sortie:**
```typescript
{
  success: true;
}
```

---

#### `adminProcessWithdrawal`

Declenche le traitement effectif d'un retrait.

**Entree:**
```typescript
{
  withdrawalId: string;
}
```

**Sortie:**
```typescript
{
  success: boolean;
  transactionId?: string;
  status: string;
  message?: string;
}
```

---

#### `adminGetPaymentStats`

Recupere les statistiques pour le dashboard.

**Entree:**
```typescript
{
  period?: 'today' | 'week' | 'month' | 'all';
}
```

**Sortie:**
```typescript
{
  success: true;
  stats: {
    totalWithdrawals: number;
    pendingCount: number;
    processingCount: number;
    completedCount: number;
    failedCount: number;
    totalAmountProcessed: number;
    totalAmountPending: number;
    averageProcessingTime: number;
    successRate: number;
    byProvider: Record<string, { count: number; amount: number }>;
    byUserType: Record<string, { count: number; amount: number }>;
  };
}
```

---

#### `adminGetAuditLogs`

Recupere les logs d'audit.

**Entree:**
```typescript
{
  withdrawalId?: string;
  limit?: number;
  eventTypes?: AuditEventType[];
  fromDate?: string;
  toDate?: string;
}
```

**Sortie:**
```typescript
{
  success: true;
  logs: AuditLogEntry[];
}
```

---

#### `adminExportWithdrawals`

Exporte les retraits en CSV.

**Entree:**
```typescript
{
  fromDate: string;
  toDate: string;
  status?: WithdrawalStatus[];
  userType?: PaymentUserType;
}
```

**Sortie:**
```typescript
{
  success: true;
  csvData: string;
}
```

---

## Webhooks

### Webhook Wise

**Endpoint:** `POST /paymentWebhookWise`

**Region:** `europe-west1`

**Verification:** HMAC-SHA256 via header `x-signature-sha256`

**Evenements geres:**
- `transfers#state-change` - Changement de statut du transfert

**Mapping des statuts:**

| Statut Wise | Statut interne |
|-------------|----------------|
| `incoming_payment_waiting` | `processing` |
| `incoming_payment_initiated` | `processing` |
| `processing` | `processing` |
| `funds_converted` | `processing` |
| `outgoing_payment_sent` | `completed` |
| `cancelled` | `cancelled` |
| `funds_refunded` | `failed` |
| `bounced_back` | `failed` |
| `charged_back` | `failed` |

---

### Webhook Flutterwave

**Endpoint:** `POST /paymentWebhookFlutterwave`

**Region:** `europe-west1`

**Verification:** Comparaison du header `verif-hash` avec le secret

**Evenements geres:**
- `transfer.completed` - Transfert termine
- `transfer.failed` - Transfert echoue
- `transfer.reversed` - Transfert inverse

**Mapping des statuts:**

| Statut Flutterwave | Statut interne |
|--------------------|----------------|
| `NEW` | `processing` |
| `PENDING` | `processing` |
| `SUCCESSFUL` | `completed` |
| `FAILED` | `failed` |

---

## Suivi et audit

### Historique des statuts

Chaque retrait maintient un historique complet:

```typescript
interface StatusHistoryEntry {
  status: WithdrawalStatus;
  timestamp: string;       // ISO 8601
  actor?: string;          // ID de l'acteur
  actorType: 'user' | 'admin' | 'system';
  note?: string;           // Note explicative
  metadata?: Record<string, unknown>;
}
```

### Logs d'audit

Tous les evenements sont enregistres dans `payment_audit_logs`:

```typescript
interface AuditLogEntry {
  id: string;
  withdrawalId: string;
  timestamp: string;
  eventType: AuditEventType;
  actor: string;
  actorType: 'user' | 'admin' | 'system' | 'provider';
  previousStatus?: WithdrawalStatus;
  newStatus?: WithdrawalStatus;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}
```

### Types d'evenements

| Type | Description |
|------|-------------|
| `withdrawal_created` | Retrait cree |
| `withdrawal_approved` | Retrait approuve |
| `withdrawal_rejected` | Retrait rejete |
| `withdrawal_processing` | Traitement demarre |
| `withdrawal_sent` | Paiement envoye |
| `withdrawal_completed` | Retrait termine |
| `withdrawal_failed` | Echec du retrait |
| `withdrawal_cancelled` | Retrait annule |
| `withdrawal_retry` | Nouvelle tentative |
| `provider_callback` | Callback fournisseur |
| `status_check` | Verification de statut |
| `admin_note_added` | Note admin ajoutee |
| `payment_method_saved` | Methode sauvegardee |
| `payment_method_deleted` | Methode supprimee |

### Suivi utilisateur

Timeline visuelle pour l'interface utilisateur:

```typescript
interface PaymentTrackingSummary {
  withdrawalId: string;
  currentStatus: WithdrawalStatus;
  statusLabel: string;        // En francais
  statusDescription: string;  // Description complete
  progress: number;           // 0-100%
  estimatedCompletion?: string;
  timeline: TrackingTimelineItem[];
}
```

---

## Securite

### Gestion des secrets

Les secrets sont geres via Firebase Secret Manager:

| Secret | Description |
|--------|-------------|
| `WISE_API_TOKEN` | Token API Wise |
| `WISE_PROFILE_ID` | ID profil Wise |
| `WISE_WEBHOOK_SECRET` | Secret webhook Wise |
| `WISE_MODE` | Mode (sandbox/live) |
| `FLUTTERWAVE_SECRET_KEY` | Cle secrete Flutterwave |
| `FLUTTERWAVE_PUBLIC_KEY` | Cle publique Flutterwave |
| `FLUTTERWAVE_WEBHOOK_SECRET` | Secret webhook Flutterwave |
| `FLUTTERWAVE_MODE` | Mode (sandbox/production) |

### Verification des webhooks

**Wise:** Signature HMAC-SHA256 verifiee avec timing-safe comparison

**Flutterwave:** Comparaison du hash de verification avec le secret

### Controle d'acces

- **Utilisateurs:** Acces uniquement a leurs propres donnees
- **Admins:** Verification des claims `admin: true` ou `role: 'admin'`
- **Systeme:** Actions automatiques tracees avec `actorType: 'system'`

### Validation des donnees

- Validation des montants (min/max)
- Verification du solde disponible
- Validation des formats (IBAN, numeros de telephone)
- Detection des pays sous sanctions

---

## Collections Firestore

| Collection | Description |
|------------|-------------|
| `payment_withdrawals` | Demandes de retrait |
| `payment_methods` | Methodes de paiement utilisateur |
| `payment_config` | Configuration systeme |
| `payment_audit_logs` | Logs d'audit |
| `payment_webhook_logs` | Logs des webhooks |
| `admin_alerts` | Alertes admin |
| `notifications` | Notifications utilisateur |

---

## Deploiement

### Variables d'environnement

Configurer les secrets dans Firebase:

```bash
# Wise
firebase functions:secrets:set WISE_API_TOKEN
firebase functions:secrets:set WISE_PROFILE_ID
firebase functions:secrets:set WISE_WEBHOOK_SECRET
firebase functions:secrets:set WISE_MODE

# Flutterwave
firebase functions:secrets:set FLUTTERWAVE_SECRET_KEY
firebase functions:secrets:set FLUTTERWAVE_PUBLIC_KEY
firebase functions:secrets:set FLUTTERWAVE_WEBHOOK_SECRET
firebase functions:secrets:set FLUTTERWAVE_MODE
```

### Region

Toutes les fonctions sont deployees dans `europe-west1` pour conformite GDPR.

### Configuration webhooks

**Wise:**
```
URL: https://europe-west1-{project-id}.cloudfunctions.net/paymentWebhookWise
Events: transfers#state-change
```

**Flutterwave:**
```
URL: https://europe-west1-{project-id}.cloudfunctions.net/paymentWebhookFlutterwave
Secret Hash: [Configurer dans dashboard Flutterwave]
```

---

## Support

Pour toute question ou probleme:
- Verifier les logs dans Firebase Console
- Consulter les logs d'audit dans Firestore
- Contacter l'equipe technique
