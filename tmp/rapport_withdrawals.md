# AUDIT COMPLET — WITHDRAWALS & PAYOUTS SOS-EXPAT

**Date**: 2026-02-27
**Auditeur**: Claude Opus 4.6
**Périmètre**: Tous les rôles — prestataires + affiliés

---

## 1. ARCHITECTURE GLOBALE

### Deux systèmes de paiement distincts

| Système | Rôles | Mécanisme | Collections |
|---------|-------|-----------|-------------|
| **Stripe Connect** (automatique) | Provider, Lawyer, ExpatHelper | Transfert automatique après capture paiement | `payments`, `transfers`, `pending_transfers` |
| **Withdrawals manuels** (Wise/Flutterwave) | Chatter, Influencer, Blogger, GroupAdmin, Affiliate | Demande → Telegram 2FA → Admin/Auto → Wise/Flutterwave | `payment_withdrawals`, `payment_methods` |

---

## 2. FLUX RÉEL PAR RÔLE

### 2A. PRESTATAIRES (Provider / Lawyer / ExpatHelper)

**Pas de retrait manuel** — paiement 100% automatique via Stripe Connect.

```
Client paie 50€ → Stripe capture →
  SI KYC ✓ → Destination Charge → Transfert auto (net ~44€) → Compte bancaire provider (1-3j)
  SI KYC ✗ → Escrow plateforme → pending_transfers (status: pending_kyc) →
             KYC complété → webhook account.updated → Transfert auto
```

- **Frais Stripe**: ~2.9% + 0.30€ (déduits du prestataire)
- **Commission SOS**: Configurable (ex: 5€/appel)
- **PayPal**: Alternative pour pays non-Stripe (payout automatique aussi)
- **AAA profiles**: Mode interne (pas de transfert) ou externe (compte consolidé)

### 2B. CHATTER / INFLUENCER / BLOGGER

**Flux centralisé** via `paymentService.createWithdrawalRequest()` :

```
1. Frontend appelle requestWithdrawal (us-central1)
2. Validation: auth, status active, solde suffisant, pas de pending, minimum $30
3. savePaymentMethod() → payment_methods (chiffré AES-256-GCM)
4. createWithdrawalRequest() → payment_withdrawals (transaction atomique)
   - Calcul fee: amount + $3 = totalDebited
   - Déduction: availableBalance -= totalDebited
   - Vérification double pending dans la transaction
5. sendWithdrawalConfirmation() → Telegram 2FA (inline keyboard)
   - Si Telegram échoue → cancelWithdrawal() → balance restaurée
6. Trigger onWithdrawalCreated: notification + queue auto si eligible
7. Si mode hybrid/automatic: processAutomaticPayments (cron 15min) →
   PaymentRouter → Wise/Flutterwave
8. Webhook Wise: état → completed/failed
9. Trigger onWithdrawalStatusChanged: notifications + stats + cleanup
```

**Montant minimum**: $30 (3000 cents)
**Frais SOS**: $3 fixe par retrait (configurable `admin_config/fees`)
**Providers de paiement**: Wise (virement bancaire), Flutterwave (Mobile Money Afrique)
**2FA**: Telegram obligatoire (confirmation dans 5 minutes)

### 2C. GROUPADMIN

**Flux semi-indépendant** — crée directement dans `payment_withdrawals` SANS passer par `paymentService.createWithdrawalRequest()` :

```
1. requestGroupAdminWithdrawal (us-central1)
2. Validation + Telegram check
3. savePaymentMethod() via paymentService
4. Transaction atomique:
   - Re-read group_admins doc
   - Check pending dans payment_withdrawals
   - Sélection commissions (group_admin_commissions status=available)
   - Création withdrawal dans payment_withdrawals
   - Commissions → status "paid"
   - availableBalance -= input.amount
5. Telegram 2FA
   - Si échec → revert transaction (delete withdrawal, restore commissions, restore balance)
```

**Différences vs chatter/influencer/blogger**:
- ⚠️ PAS de frais $3 (totalDebited et withdrawalFee absents)
- Sélection de commissions individuelles (group_admin_commissions)
- Rollback des commissions sur échec permanent

### 2D. AFFILIATE

**Flux le plus indépendant** — gestion propre des commissions :

```
1. affiliate/requestWithdrawal (us-central1)
2. Validations: auth, affiliateCode, telegramId, pendingPayoutId, bankDetails
3. Checks mensuels: maxWithdrawalsPerMonth, maxAmountPerMonth
4. Sélection commissions (affiliate_commissions status=available)
5. Transaction atomique:
   - Re-read users doc (balance + pendingPayoutId)
   - Re-verify chaque commission status="available"
   - Création withdrawal dans payment_withdrawals
   - Commissions → status "paid" + payoutId
   - availableBalance -= actualAmount (FieldValue.increment)
   - pendingPayoutId = withdrawalRef.id
6. Telegram 2FA
   - Si échec → revert (delete withdrawal, restore commissions, restore balance)
```

**Différences vs autres rôles**:
- ⚠️ PAS de frais $3
- Balance sur `users/{userId}` (pas de collection séparée)
- Field `pendingPayoutId` (pas `pendingWithdrawalId`)
- Limites mensuelles (nombre + montant)
- Admin processe manuellement (isAutomatic: false)

---

## 3. TABLEAU DES FRAIS

| Frais | Montant | Qui paie | Configurable | Fichier config |
|-------|---------|----------|------------|----------------|
| **Withdrawal fee SOS** | $3 fixe | Chatter/Influencer/Blogger | ✅ `admin_config/fees` | `feeCalculationService.ts` |
| **Withdrawal fee SOS** | $0 | GroupAdmin/Affiliate | ❌ (non appliqué) | — |
| **Wise transfer fee** | Variable (~$1-5) | Déduit du montant envoyé | ❌ (Wise fixe) | — |
| **Flutterwave fee** | Variable | Déduit du montant envoyé | ❌ (Flutterwave fixe) | — |
| **Stripe processing** | ~2.9% + $0.30 | Provider (déduit du paiement) | ✅ `admin_config/fees` | `feeCalculationService.ts` |
| **Minimum retrait** | $30 | — | ✅ `payment_config` | `paymentService.ts` |

---

## 4. SÉCURITÉ FINANCIÈRE — ANALYSE DÉTAILLÉE

### 4.1 Atomicité des soldes

| Opération | Atomique ? | Méthode | Fichier |
|-----------|-----------|---------|---------|
| Déduction balance (chatter/influencer/blogger) | ✅ | Transaction Firestore + `currentBalance - amount` | `paymentService.ts:1484` |
| Déduction balance (groupAdmin) | ✅ | Transaction + `FieldValue.increment(-amount)` | `groupAdmin/requestWithdrawal.ts:295` |
| Déduction balance (affiliate) | ✅ | Transaction + `FieldValue.increment(-amount)` | `affiliate/requestWithdrawal.ts:333` |
| Refund sur cancel | ✅ | Transaction + `currentBalance + refundAmount` | `paymentService.ts:697` |
| Refund sur reject | ✅ | Transaction + `currentBalance + refundAmount` | `paymentService.ts:814` |
| Refund sur fail permanent | ✅ | Transaction + `currentBalance + refundAmount` | `paymentService.ts:1131` |
| Refund auto (processAutomatic) | ⚠️ | `FieldValue.increment()` HORS transaction | `processAutomaticPayments.ts:81` |

### 4.2 Double withdrawal impossible ?

- ✅ **Chatter/Influencer/Blogger**: Vérification `pendingWithdrawalId` + query `payment_withdrawals` status in [...pending states] dans la MÊME transaction
- ✅ **GroupAdmin**: Double check (`pendingWithdrawalId` + query `payment_withdrawals`) dans la transaction
- ✅ **Affiliate**: Check `pendingPayoutId` + re-verify commissions dans la transaction
- ✅ **Webhook Wise**: Idempotency check via `processed_webhook_events/{key}` (30 jours TTL)

### 4.3 Solde négatif possible ?

- ✅ Chatter/Influencer/Blogger: `if (currentBalance < amount) throw 'Insufficient balance'` dans la transaction
- ✅ GroupAdmin: `if (input.amount > groupAdmin.availableBalance) throw` dans la transaction
- ✅ Affiliate: `if (freshBalance < actualAmount) throw` dans la transaction
- ✅ Providers: Stripe ne transfère que ce qui a été capturé — pas de solde négatif possible

### 4.4 Double payout impossible ?

- ✅ `processWithdrawal()`: Transaction atomique vérifie status = `approved`/`queued` avant de passer à `processing`
- ✅ `processAutomaticPayments`: Même vérification atomique avant processing
- ✅ Webhook Wise: Idempotency + skip si status inchangé

---

## 5. PROBLÈMES IDENTIFIÉS PAR PRIORITÉ

### 🔴 P1 — CRITIQUE (risque financier direct)

#### P1-1: Affiliate — `pendingPayoutId` jamais nettoyé (BLOQUANT)

**Impact**: Après le premier retrait (success OU échec), l'affiliate ne peut PLUS jamais créer de retrait.

**Cause racine**: Deux problèmes cumulés :
1. `clearPendingWithdrawalId()` dans `onWithdrawalStatusChanged.ts:404` utilise `getUserCollection('affiliate')` qui retourne `'affiliates'` — mais la donnée est dans `users/{userId}`
2. Le champ s'appelle `pendingPayoutId` (affiliate) mais le cleanup cherche `pendingWithdrawalId`

**Fichiers**:
- `payment/triggers/onWithdrawalStatusChanged.ts:370-377` — `getUserCollection()` retourne `affiliates` au lieu de `users`
- `payment/triggers/onWithdrawalStatusChanged.ts:420` — Cherche `pendingWithdrawalId` au lieu de `pendingPayoutId`
- `affiliate/callables/requestWithdrawal.ts:335` — Écrit `pendingPayoutId`

**Fix**: Dans `getUserCollection()`, ajouter `case 'affiliate': return 'users';` et dans `clearPendingWithdrawalId()`, gérer le champ `pendingPayoutId` pour les affiliates.

---

#### P1-2: Affiliate — commissions pas rollback sur échec permanent

**Impact**: Si un retrait affiliate échoue définitivement (max retries), les commissions restent en status `paid` et le solde est restauré. L'affiliate retrouve son `availableBalance` mais les commissions individuelles ne repassent pas à `available`. Résultat : le solde affiché ne correspond pas aux commissions disponibles, et les prochains retraits peuvent échouer.

**Cause racine**: `onWithdrawalStatusChanged.ts:447-500` ne rollback que `group_admin_commissions`. Aucun rollback pour `affiliate_commissions`.

**Fix**: Ajouter `rollbackAffiliateCommissions()` similaire à `rollbackGroupAdminCommissions()`, qui query `affiliate_commissions` par `payoutId == withdrawal.id` et restore status `available`.

---

#### P1-3: Refund partiel — frais $3 non remboursés sur certains chemins d'échec

**Impact**: Quand un retrait chatter/influencer/blogger échoue définitivement via `processAutomaticPayments` ou `processWithdrawal()`, seul `withdrawal.amount` est remboursé (pas `totalDebited`). L'utilisateur perd $3.

**Fichiers**:
- `processAutomaticPayments.ts:81` — `FieldValue.increment(withdrawal.amount)` ← devrait être `withdrawal.totalDebited || withdrawal.amount`
- `paymentService.ts:959` — `this.refundUserBalance(withdrawal.userId, withdrawal.userType, withdrawal.amount)` ← idem

**Comparaison**: `failWithdrawal()` (ligne 1130), `rejectWithdrawal()` (ligne 812), et `cancelWithdrawal()` (ligne 695) utilisent correctement `withdrawal.totalDebited || withdrawal.amount`.

**Fix**: Remplacer `withdrawal.amount` par `withdrawal.totalDebited || withdrawal.amount` dans les deux fichiers.

---

### 🟡 P2 — IMPORTANT (incohérence fonctionnelle)

#### P2-1: Frais $3 non appliqués aux GroupAdmin et Affiliate

**Impact**: Chatter/Influencer/Blogger paient $3 de frais par retrait. GroupAdmin et Affiliate ne paient rien. Si c'est intentionnel, c'est OK. Sinon, c'est une perte de revenu.

**Cause**: GroupAdmin et Affiliate créent leurs withdrawals directement (sans passer par `paymentService.createWithdrawalRequest()`) et ne calculent pas de `withdrawalFee`.

**Fix (si voulu)**: Intégrer `getWithdrawalFee()` dans les callables groupAdmin et affiliate.

---

#### P2-2: Admin tools affiliate orphelins (dead code)

**Impact**: `adminProcessPayoutWise`, `adminProcessPayoutManual`, `adminRejectPayout`, `adminApprovePayout` dans `affiliate/callables/admin/processPayout.ts` lisent depuis `affiliate_payouts` collection. Mais le nouveau `requestWithdrawal` écrit dans `payment_withdrawals`. Ces fonctions ne trouvent jamais les retraits.

**Fonctions actives**: `payment/callables/admin/approveWithdrawal.ts`, `payment/callables/admin/processWithdrawal.ts`, `payment/callables/admin/rejectWithdrawal.ts` — ceux-ci fonctionnent sur `payment_withdrawals` ✅

**Fix**: Supprimer les anciennes fonctions admin affiliate OU migrer pour qu'elles lisent `payment_withdrawals`.

---

#### P2-3: Notification collection pour affiliates

**Impact**: `onWithdrawalStatusChanged.ts:121` écrit les notifications dans `${withdrawal.userType}_notifications` → `affiliate_notifications`. Cette collection existe-t-elle dans le frontend ? Le frontend affiliate utilise probablement `users/{userId}` pour les notifications, pas `affiliate_notifications`.

**Fix**: Vérifier si le frontend lit `affiliate_notifications` et aligner.

---

### 🟢 P3 — MINEUR (maintenance / monitoring)

#### P3-1: Collections legacy orphelines

Les collections suivantes ne sont plus alimentées mais contiennent potentiellement des données historiques :
- `chatter_withdrawals`
- `influencer_withdrawals`
- `blogger_withdrawals`
- `group_admin_withdrawals`
- `affiliate_payouts`

**Action**: Documenter comme deprecated. Ne PAS supprimer (données historiques).

#### P3-2: Services deprecated non supprimés

4 fichiers `*WithdrawalService.ts` marqués `@deprecated` mais toujours importables :
- `chatter/services/chatterWithdrawalService.ts`
- `influencer/services/influencerWithdrawalService.ts`
- `blogger/services/bloggerWithdrawalService.ts`
- `groupAdmin/services/groupAdminWithdrawalService.ts`

#### P3-3: Devise affichée en € pour affiliates

`affiliate/callables/requestWithdrawal.ts:133` affiche le minimum en "€" mais le système est en USD :
```typescript
`Minimum withdrawal amount is €${(settings.minimumAmount / 100).toFixed(2)}`
// Devrait être $ pas €
```
Idem ligne 178.

---

## 6. GESTION DES ÉCHECS — RÉSUMÉ

| Scénario | Balance restaurée ? | Commissions rollback ? | Notification user ? | Retry ? |
|----------|--------------------|-----------------------|--------------------|---------|
| Cancel par user (pending) | ✅ totalDebited | N/A (pas de commissions marquées) | ✅ notification | — |
| Reject par admin | ✅ totalDebited | ✅ GroupAdmin only | ✅ notification | — |
| Fail (retries restants) | ❌ (en attente retry) | ❌ (en attente) | ✅ email + Telegram | ✅ auto (cron 15min) |
| Fail permanent (max retries) | ⚠️ amount seulement (P1-3) | ✅ GroupAdmin / ❌ Affiliate (P1-2) | ✅ email + Telegram | ❌ |
| Telegram fail | ✅ annulé immédiatement | ✅ pour affiliate/groupAdmin | ❌ (throw avant notification) | — |
| Wise bounce/refund (webhook) | Via onStatusChanged → fail | GroupAdmin only | ✅ email + Telegram | — |

---

## 7. DEVISES

- **Système interne**: Tout en USD (cents)
- **Conversion**: Wise gère la conversion USD → devise cible automatiquement
- **THB/VND**: Supportés via Wise (si le pays est dans les pays supportés par Wise)
- **Mobile Money Afrique**: XOF, GHS, KES, UGX, TZS, etc. via Flutterwave
- **Frontend**: Affiche en $ (USD)

---

## 8. PARAMÉTRAGE ADMIN (sans redéploiement)

| Paramètre | Collection | Champ | Valeur par défaut |
|-----------|-----------|-------|-------------------|
| Mode de paiement | `payment_config/payment_config` | `paymentMode` | `hybrid` |
| Seuil auto | `payment_config/payment_config` | `autoPaymentThreshold` | $500 |
| Minimum retrait | `payment_config/payment_config` | `minimumWithdrawal` | $30 |
| Maximum retrait | `payment_config/payment_config` | `maximumWithdrawal` | $5,000 |
| Limite journalière | `payment_config/payment_config` | `dailyLimit` | $5,000 |
| Limite mensuelle | `payment_config/payment_config` | `monthlyLimit` | $20,000 |
| Max retries | `payment_config/payment_config` | `maxRetries` | 3 |
| Frais retrait | `admin_config/fees` | `withdrawalFees.fixedFee` | $3 |
| Wise activé | `payment_config/payment_config` | `wiseEnabled` | true |
| Flutterwave activé | `payment_config/payment_config` | `flutterwaveEnabled` | true |
| Notifications admin | `payment_config/payment_config` | `adminEmails` | [] |

---

## 9. CHECKLIST MANUELLE POST-AUDIT

### Wise
- [ ] Vérifier que `WISE_API_TOKEN` et `WISE_WEBHOOK_SECRET` sont configurés dans Google Cloud Secrets
- [ ] Vérifier que le webhook Wise pointe vers `https://<region>-sos-urgently-ac307.cloudfunctions.net/paymentWebhookWise`
- [ ] Tester un micro-virement ($1) pour valider le flux complet
- [ ] Vérifier le solde Wise suffisant pour les payouts

### Stripe Connect (Providers)
- [ ] Vérifier que les providers avec KYC complété reçoivent bien leurs transferts automatiques
- [ ] Vérifier les `pending_transfers` status=`pending_kyc` — combien en attente ?
- [ ] Vérifier que le webhook `account.updated` déclenche bien `processPendingTransfersForProvider`

### Flutterwave (Mobile Money)
- [ ] Vérifier que `FLUTTERWAVE_SECRET_KEY` est configuré
- [ ] Vérifier le webhook Flutterwave
- [ ] Tester un payout Mobile Money ($1) pour valider

### Monitoring
- [ ] Alerter si `payment_withdrawals` avec status `failed` et `retryCount >= maxRetries` > 0
- [ ] Alerter si `pending_transfers` avec status `pending_kyc` depuis > 30 jours
- [ ] Vérifier les logs Cloud Functions pour erreurs `[processAutomaticPayments]` et `[webhookWise]`

---

## 10. CORRECTIONS PROPOSÉES

### P1-1: Fix pendingPayoutId affiliate (BLOQUANT)

**Fichier**: `sos/firebase/functions/src/payment/triggers/onWithdrawalStatusChanged.ts`

```typescript
// Dans getUserCollection():
function getUserCollection(userType: PaymentUserType): string {
  switch (userType) {
    case 'chatter': return 'chatters';
    case 'influencer': return 'influencers';
    case 'blogger': return 'bloggers';
    case 'group_admin': return 'group_admins';
    case 'affiliate': return 'users';       // ← FIX: affiliate balance is on users
    default: return `${userType}s`;
  }
}

// Dans clearPendingWithdrawalId():
async function clearPendingWithdrawalId(...) {
  // ...
  const pendingField = withdrawal.userType === 'affiliate'
    ? 'pendingPayoutId'
    : 'pendingWithdrawalId';

  if (userData[pendingField] === withdrawal.id) {
    await userRef.update({
      [pendingField]: null,
      updatedAt: Timestamp.now(),
    });
  }
}
```

### P1-2: Fix rollback commissions affiliate

**Fichier**: `sos/firebase/functions/src/payment/triggers/onWithdrawalStatusChanged.ts`

Ajouter `rollbackAffiliateCommissions()` similaire à `rollbackGroupAdminCommissions()`:
```typescript
async function rollbackAffiliateCommissions(withdrawal: WithdrawalRequest): Promise<void> {
  if (withdrawal.userType !== "affiliate") return;

  const db = getFirestore();
  const commissionsSnapshot = await db
    .collection("affiliate_commissions")
    .where("payoutId", "==", withdrawal.id)
    .where("status", "==", "paid")
    .get();

  if (commissionsSnapshot.empty) return;

  const batch = db.batch();
  const now = Timestamp.now();
  for (const doc of commissionsSnapshot.docs) {
    batch.update(doc.ref, {
      status: "available",
      payoutId: null,
      paidAt: null,
      rolledBackAt: now,
      rolledBackReason: `Withdrawal ${withdrawal.id} permanently failed`,
      updatedAt: now,
    });
  }
  await batch.commit();
}
```

Appeler aux mêmes endroits que `rollbackGroupAdminCommissions()` (lignes 543-548).

### P1-3: Fix refund totalDebited

**Fichier 1**: `sos/firebase/functions/src/payment/triggers/processAutomaticPayments.ts`

```diff
- availableBalance: FieldValue.increment(withdrawal.amount),
+ availableBalance: FieldValue.increment(withdrawal.totalDebited || withdrawal.amount),
```

**Fichier 2**: `sos/firebase/functions/src/payment/services/paymentService.ts` (processWithdrawal ~ligne 959)

```diff
- await this.refundUserBalance(withdrawal.userId, withdrawal.userType, withdrawal.amount);
+ await this.refundUserBalance(withdrawal.userId, withdrawal.userType, withdrawal.totalDebited || withdrawal.amount);
```

### P3-3: Fix symbole devise affiliate

**Fichier**: `sos/firebase/functions/src/affiliate/callables/requestWithdrawal.ts`

```diff
- `Minimum withdrawal amount is €${(settings.minimumAmount / 100).toFixed(2)}`
+ `Minimum withdrawal amount is $${(settings.minimumAmount / 100).toFixed(2)}`
```

Idem pour les messages de limites mensuelles (lignes 133, 178, 213).

---

## 11. RÉSUMÉ EXÉCUTIF

Le système de withdrawals est **globalement bien architecturé** :
- Transactions Firestore atomiques pour toutes les opérations de balance
- Encryption AES-256-GCM des données bancaires sensibles
- Telegram 2FA obligatoire
- Idempotency sur les webhooks Wise
- Audit trail complet (statusHistory, payment_audit_logs)
- Retry logic avec backoff exponentiel
- Auto-processing via cron 15min (mode hybrid)

**3 bugs P1 critiques** affectent les affiliates et le remboursement des frais. Les affiliates sont actuellement **bloqués après leur premier retrait** (P1-1 est un bloquant production).

Les prestataires (providers) sont payés automatiquement via Stripe Connect sans aucun bug identifié.

---

*Rapport généré le 2026-02-27 — Audit code source uniquement (pas de tests en production)*
