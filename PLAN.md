# Plan: Corrections Prioritaires + Commissions sur Paiement Recu

## Contexte
L'audit a identifie 4 bugs P0 critiques et 8 P1 majeurs. L'utilisateur demande:
1. Corriger toutes les priorites
2. Les commissions ne doivent etre creditees que lorsque SOS Expat a recu l'argent

## Constat actuel - Verification de paiement par trigger

| Systeme | Trigger | Verifie `isPaid`? | Collection | Status |
|---------|---------|-------------------|------------|--------|
| Chatter | `chatterOnCallCompleted` | ✅ `isPaid === true` | `call_sessions` | OK |
| Blogger | `bloggerOnCallSessionCompleted` | ❌ `paymentStatus === "paid"` (champ inexistant!) | `call_sessions` | BUG |
| Influencer | `influencerOnCallCompleted` | ❌ Aucune verification | `call_sessions` | BUG |
| GroupAdmin | `onCallCompletedGroupAdmin` | ❌ Aucune verification + mauvaise collection | `calls` ❌ | DOUBLE BUG |

Le champ `isPaid: true` est positionne par les webhooks Stripe/PayPal UNIQUEMENT quand le paiement est **capture** (argent recu sur le compte SOS Expat). C'est donc le bon champ a utiliser.

---

## Etape 1: Fix GroupAdmin - Mauvaise collection + isPaid (P0 #1 + Commission)

**Fichier**: `sos/firebase/functions/src/groupAdmin/triggers/onCallCompleted.ts`

Changements:
- `document: "calls/{callId}"` → `document: "call_sessions/{sessionId}"`
- Mettre a jour l'interface `CallDocument` → `CallSession` pour correspondre a la structure reelle (ajouter `isPaid`, `duration`, adapter les noms de champs)
- Ajouter la condition: `afterData.status === "completed" && afterData.isPaid === true`
- Adapter les references: `event.params.callId` → `event.params.sessionId`
- Mettre a jour les `callRef` pour pointer vers `call_sessions`

## Etape 2: Fix Influencer - Ajouter verification isPaid (Commission)

**Fichier**: `sos/firebase/functions/src/influencer/triggers/onCallCompleted.ts`

Changements:
- Ajouter `isPaid?: boolean` a l'interface `CallSession`
- Changer la condition de declenchement de:
  ```
  beforeData.status === afterData.status || afterData.status !== "completed"
  ```
  vers:
  ```
  const wasNotPaid = beforeData.status !== "completed" || !beforeData.isPaid;
  const isNowPaid = afterData.status === "completed" && afterData.isPaid === true;
  if (!wasNotPaid || !isNowPaid) return;
  ```

## Etape 3: Fix Blogger - Corriger le champ de verification (Commission)

**Fichier**: `sos/firebase/functions/src/blogger/triggers/onCallCompleted.ts`

Changements:
- Le trigger verifie `paymentStatus === "paid"` mais ce champ n'est JAMAIS ecrit. Le vrai champ est `isPaid: true`
- Changer les lignes 223-224:
  ```
  before.paymentStatus !== "paid"  →  before.status !== "completed" || !before.isPaid
  after.paymentStatus === "paid"   →  after.status === "completed" && after.isPaid === true
  ```

## Etape 4: Ajouter validation minCallDuration dans les 4 triggers (P0 #4)

**Fichiers**: Les 4 triggers `onCallCompleted.ts`

Le systeme Global (affiliate/) a deja `minCallDuration: 120` (2 min) configure et valide dans `commissionCalculator.ts`. Les 4 systemes specifiques ne le verifient pas.

Changements dans chaque trigger, AVANT la creation de commission:
```typescript
// Minimum call duration check (prevent 1-second call fraud)
const MIN_CALL_DURATION_SECONDS = 120; // 2 minutes, same as global affiliate system
if (!session.duration || session.duration < MIN_CALL_DURATION_SECONDS) {
  logger.warn("[trigger] Call too short for commission", {
    sessionId, duration: session.duration, minimum: MIN_CALL_DURATION_SECONDS
  });
  return;
}
```

Pour Chatter: ajouter apres la ligne 113 (apres `const config = await getChatterConfigCached()`)
Pour Influencer: ajouter apres la ligne 92 (apres `const config = await getInfluencerConfigCached()`)
Pour Blogger: ajouter dans `checkBloggerClientReferral` apres la verification config (ligne 38)
Pour GroupAdmin: ajouter apres la verification du status (ligne 119)

## Etape 5: Anti-fraude pour Influencer/Blogger/GroupAdmin (P0 #3)

**Fichiers a modifier**:
- `sos/firebase/functions/src/influencer/callables/registerInfluencer.ts`
- `sos/firebase/functions/src/blogger/callables/registerBlogger.ts`
- `sos/firebase/functions/src/groupAdmin/callables/registerGroupAdmin.ts`

**Fichier source**: `sos/firebase/functions/src/affiliate/utils/fraudDetection.ts` (deja existant, utilise par le systeme Global)

Changements dans chaque fichier de registration:
1. Importer `checkReferralFraud` depuis `../../affiliate/utils/fraudDetection`
2. Ajouter l'appel AVANT la creation du profil:
```typescript
const fraudResult = await checkReferralFraud(
  referredById || "direct",
  email,
  request.rawRequest?.ip || null,
  null // deviceFingerprint
);
if (!fraudResult.allowed) {
  throw new HttpsError('permission-denied', fraudResult.blockReason || 'Registration blocked');
}
```

## Etape 6: Fix race condition retrait Influencer legacy (P0 #2)

**Fichier**: `sos/firebase/functions/src/influencer/services/influencerWithdrawalService.ts`

Ce service est marque `@deprecated` mais toujours present. Le service centralise (`paymentService.ts`) fait deja correctement les verifications dans la transaction.

Solution: Verifier si le legacy service est encore appele quelque part. S'il ne l'est pas, ajouter un commentaire fort. S'il l'est encore, deplacer la lecture du solde dans la transaction:
```typescript
await db.runTransaction(async (transaction) => {
  const influencerRef = db.collection("influencers").doc(influencerId);
  const influencerDoc = await transaction.get(influencerRef);
  const influencer = influencerDoc.data() as Influencer;

  // Validate balance INSIDE transaction
  if (withdrawAmount > influencer.availableBalance) {
    throw new Error("Insufficient balance");
  }

  // Create withdrawal + deduct balance atomically
  transaction.set(withdrawalRef, withdrawal);
  transaction.update(influencerRef, {
    availableBalance: FieldValue.increment(-withdrawAmount),
    pendingWithdrawalId: withdrawalRef.id,
  });
});
```

## Etape 7: Build et validation TypeScript

- `cd sos/firebase/functions && rm -rf lib && npm run build`
- Verifier qu'il n'y a pas d'erreurs de compilation
- Corriger les imports si necessaire

---

## Resume des fichiers modifies

| # | Fichier | Changement |
|---|---------|------------|
| 1 | `groupAdmin/triggers/onCallCompleted.ts` | Collection, isPaid, minDuration |
| 2 | `influencer/triggers/onCallCompleted.ts` | isPaid, minDuration |
| 3 | `blogger/triggers/onCallCompleted.ts` | isPaid (fix champ), minDuration |
| 4 | `chatter/triggers/onCallCompleted.ts` | minDuration (isPaid deja OK) |
| 5 | `influencer/callables/registerInfluencer.ts` | Anti-fraude |
| 6 | `blogger/callables/registerBlogger.ts` | Anti-fraude |
| 7 | `groupAdmin/callables/registerGroupAdmin.ts` | Anti-fraude |
| 8 | `influencer/services/influencerWithdrawalService.ts` | Race condition |

## Ce qui n'est PAS dans ce plan (P1/P2, a faire ensuite)
- Limites quotidiennes/mensuelles de retrait
- Idempotency Flutterwave
- Terminologie banned/blocked
- Role blocking symetrique
- Suppression service legacy
- Tests automatises
