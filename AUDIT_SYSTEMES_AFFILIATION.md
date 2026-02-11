# AUDIT COMPLET - Systemes d'Affiliation SOS Expat

**Date**: 11 Fevrier 2026
**Methode**: Analyse statique par 31 agents IA specialises, organises en 3 vagues
**Scope**: Backend (Firebase Functions) + Frontend (React/Vite) + Firestore Rules + i18n + Telegram
**Mode**: Lecture seule (aucun fichier modifie)

---

## TABLE DES MATIERES

1. [Resume Executif](#1-resume-executif)
2. [Architecture Globale](#2-architecture-globale)
3. [Analyse par Systeme](#3-analyse-par-systeme)
   - 3.1 Chatter
   - 3.2 Influencer
   - 3.3 Blogger
   - 3.4 GroupAdmin
   - 3.5 Systeme Global (affiliate/)
4. [Analyse Transversale](#4-analyse-transversale)
   - 4.1 Paiements centralises
   - 4.2 Securite & Firestore Rules
   - 4.3 Anti-fraude
   - 4.4 Telegram
   - 4.5 i18n
   - 4.6 Modele de donnees
5. [Points Positifs](#5-points-positifs)
6. [Points Negatifs (Priorises)](#6-points-negatifs-priorises)
7. [Recommandations](#7-recommandations)

---

## 1. RESUME EXECUTIF

Le projet SOS Expat comprend **5 systemes d'affiliation** independants qui coexistent dans une meme base de code Firebase Functions. L'architecture est globalement solide, avec un systeme de paiement centralise, des transactions atomiques pour les mises a jour de soldes, et un suivi d'audit complet. Cependant, l'audit a revele **3 bugs critiques (P0)** dont un qui empeche silencieusement les commissions GroupAdmin de fonctionner, **8 problemes majeurs (P1)**, et **12 ameliorations recommandees (P2)**.

**Verdict global**: Le systeme Chatter est le plus mature et le mieux protege. Le systeme Global (affiliate/) est le plus proprement architecture. Les systemes Blogger et GroupAdmin necessitent une attention urgente en matiere de securite anti-fraude et de correction de la collection Firestore.

---

## 2. ARCHITECTURE GLOBALE

```
sos/firebase/functions/src/
|-- chatter/          # Systeme Chatter (le plus complexe, MLM multi-niveau)
|-- influencer/       # Systeme Influencer (niveaux + bonus)
|-- blogger/          # Systeme Blogger (le plus simple, taux fixes)
|-- groupAdmin/       # Systeme GroupAdmin (communautes/groupes)
|-- affiliate/        # Systeme Global (architecture moderne, Wise)
|-- payment/          # Paiement centralise (Wise, Flutterwave, PayPal)
|-- telegram/         # Integration Telegram (onboarding + confirmation retrait)
|-- lib/secrets.ts    # Gestion centralisee des secrets (843 lignes)
|-- monitoring/       # Alertes critiques
```

### Collections Firestore par systeme

| Systeme    | Profils            | Commissions                 | Retraits                  | Trigger Collection   |
|------------|--------------------|-----------------------------|---------------------------|----------------------|
| Chatter    | `chatters`         | `chatter_commissions`       | `payment_withdrawals`     | `call_sessions`      |
| Influencer | `influencers`      | `influencer_commissions`    | `payment_withdrawals`     | `call_sessions`      |
| Blogger    | `bloggers`         | `blogger_commissions`       | `payment_withdrawals`     | `call_sessions`      |
| GroupAdmin | `group_admins`     | `groupadmin_commissions`    | `payment_withdrawals`     | **`calls`** (!)      |
| Global     | `users` (champs)   | `affiliate_commissions`     | `affiliate_payouts`       | `call_sessions`      |

### Structure des commissions

| Systeme    | Par appel client | Recrutement | Multi-niveau | Bonus           |
|------------|-----------------|-------------|--------------|-----------------|
| Chatter    | $10             | $5 (apres $50 gains) | Oui (N1=$1, N2=$0.50) | Activation $5, Flash, Streak |
| Influencer | $10             | $5 (apres $50 gains) | Non          | Niveau (1.0x-1.5x), Top3, Streak |
| Blogger    | $10             | $5          | Non          | Aucun           |
| GroupAdmin | $10             | $5          | Non          | Aucun           |
| Global     | Configurable    | Configurable| Non          | Configurable    |

---

## 3. ANALYSE PAR SYSTEME

### 3.1 CHATTER (le plus mature)

**Fichiers**: ~50 fichiers, ~20 000+ lignes
**Collection trigger**: `call_sessions/{sessionId}`

#### Points Positifs
- Systeme MLM complet a 3 niveaux (client -> N1 -> N2) avec propagation correcte
- Anti-fraude robuste: 250+ domaines email jetables, hashing IP, detection circulaire, detection signup rapide
- 6 types de commission par appel (client_call, n1_call, n2_call, activation_bonus, n1_recruit_bonus, provider_call)
- Bonus d'activation uniquement apres le 2e appel (anti-fraude)
- Systeme de tiers (Bronze/Silver/Gold) avec verification hebdomadaire
- Challenges hebdomadaires avec leaderboard
- Protection contre les referrals circulaires (A->B->A)
- Config cache avec TTL 5 minutes

#### Points Negatifs
- Complexite extreme: 50+ fichiers, risque de regression eleve
- Fonctions helper de config dupliquees (`getClientCallCommission`, `getN1CallCommission`, etc.) au lieu d'un accces direct
- Le statut `"banned"` est utilise (vs `"blocked"` dans Blogger/GroupAdmin)
- `antiFraud.ts` et `chatterFraudDetection.ts` et `chatterReferralFraudService.ts` = 3 fichiers de fraude avec chevauchement

---

### 3.2 INFLUENCER (bien structure)

**Fichiers**: ~28 fichiers
**Collection trigger**: `call_sessions/{sessionId}`

#### Points Positifs
- Systeme de niveaux (Bronze 1.0x -> Diamond 1.5x) bien implemente
- Top 3 mensuel avec multiplicateurs (2.0x, 1.5x, 1.15x)
- Frozen rates au moment de l'inscription (capturedRates) - equitable
- Module de formation avec quiz (5 modules)
- Migration V2 avec script defile
- Config centralisee et cachee

#### Points Negatifs
- **[P0] Race condition sur les retraits**: `createWithdrawalRequest()` lit le solde en dehors de la transaction (ligne 63-95) puis le decremente a l'interieur (ligne 148-158). Entre la verification et l'execution, un autre retrait peut passer.
  ```
  // Ligne 63: Lecture HORS transaction
  const influencerDoc = await db.collection("influencers").doc(influencerId).get();
  // Ligne 95: Verification HORS transaction
  if (withdrawAmount > influencer.availableBalance) { ... }
  // Ligne 148: Transaction qui ne re-verifie PAS le solde
  await db.runTransaction(async (transaction) => {
    transaction.update(influencerRef, { availableBalance: FieldValue.increment(-withdrawAmount) });
  });
  ```
- Le service de retrait legacy (`influencerWithdrawalService.ts`) est marque `@deprecated` mais toujours present et potentiellement appelable
- `monthlyTop3Rewards` n'a pas de mecanisme de retry (si echec le 1er, attend le mois suivant)

---

### 3.3 BLOGGER (le plus simple)

**Fichiers**: ~24 fichiers, ~4 500 lignes
**Collection trigger**: `call_sessions/{sessionId}`

#### Points Positifs
- Architecture la plus simple et la plus maintenable
- Taux fixes ($10 client, $5 recrutement) = pas d'ambiguite
- Systeme de ressources exclusives (articles, templates, textes de copie)
- Role definitif (ne peut pas changer de type d'affilie) = pas de conflits

#### Points Negatifs
- **ZERO anti-fraude**: aucune detection de domaine email jetable, IP, pattern suspect
- Utilise `"blocked"` au lieu de `"banned"` (inconsistance avec Chatter/Influencer)
- Pas de systeme de recrutement multi-niveau
- Pas de module Telegram pour confirmation de retrait (passe directement par le systeme centralise)

---

### 3.4 GROUPADMIN (bug critique)

**Fichiers**: ~29 fichiers
**Collection trigger**: **`calls/{callId}`** (INCORRECT)

#### Points Positifs
- Systeme de verification de groupes (moderation manuelle)
- Gestion de posts avec cycle de vie (draft -> published -> expired)
- Flow de retrait le plus robuste avec confirmation Telegram + auto-rollback
- Systeme de referrals avec leaderboard

#### Points Negatifs
- **[P0] CRITIQUE - Mauvaise collection Firestore**: Le trigger `onCallCompletedGroupAdmin` ecoute `"calls/{callId}"` (ligne 36 de `onCallCompleted.ts`) alors que `TwilioCallManager` ecrit **exclusivement** dans `"call_sessions"`. Les 4 autres systemes ecoutent tous `"call_sessions/{sessionId}"`. **Resultat: les commissions GroupAdmin par appel ne se declenchent JAMAIS en production.**
  ```typescript
  // groupAdmin/triggers/onCallCompleted.ts:36
  document: "calls/{callId}"    // <-- INCORRECT, devrait etre "call_sessions/{sessionId}"

  // Tous les autres systemes:
  document: "call_sessions/{sessionId}"  // <-- CORRECT
  ```
  Seul le fichier `emailMarketing/generate-test-data.ts` ecrit dans `calls` (donnees de test).
- **ZERO anti-fraude** (comme Blogger)
- Utilise `"blocked"` au lieu de `"banned"`

---

### 3.5 SYSTEME GLOBAL (affiliate/)

**Fichiers**: ~28 fichiers
**Collection trigger**: `call_sessions/{sessionId}`

#### Points Positifs
- Architecture la plus propre et la plus moderne
- Types bien definis et exportes (`AffiliateConfig`, `CapturedRates`, etc.)
- Anti-fraude integre: detection IP, email jetable, fingerprint, patterns suspects, Levenshtein similarity
- Score de risque (0-100) avec auto-flagging a 80+
- Integration Wise native (quote, transfer, recipient, webhook)
- Cryptage AES-256-GCM des details bancaires
- Lifecycle de commission complet: pending -> available -> paid -> cancelled
- Hold period configurable avant disponibilite
- Scheduled function pour liberer les commissions en hold

#### Points Negatifs
- Coexiste avec 4 autres systemes de commission sans interface commune
- Le `requestWithdrawal` global et les retraits par type sont des chemins paralleles
- La detection de fraude est plus legere que celle du Chatter (8 domaines bloques vs 250+)
- Pas de confirmation Telegram sur les retraits (seulement Wise direct)

---

## 4. ANALYSE TRANSVERSALE

### 4.1 Paiements Centralises (`payment/`)

#### Points Positifs
- 3 fournisseurs: Wise (virement bancaire), Flutterwave (mobile money Afrique), PayPal
- Mode hybride: automatique pour <=500$, manuel au-dessus
- Verification de signature webhook (comparaison timing-safe)
- Audit trail complet: chaque etape enregistree dans `payment_audit_log`
- Statut detaille: pending -> validating -> approved -> queued -> processing -> sent -> completed
- PaymentRouter intelligent qui selectionne le fournisseur optimal

#### Points Negatifs
- **[P1] Limites quotidiennes/mensuelles configurees mais NON appliquees**: Le code definit `dailyLimit` et `monthlyLimit` dans les types mais aucune verification n'est faite avant d'approuver un retrait
- **[P1] Flutterwave sans idempotency**: Pas de cle d'idempotence dans les appels API, risque de transferts doubles si retry
- **[P1] PayPal**: Le provider `paypalProvider.ts` est nouveau (non-tracke dans git), a verifier s'il est completement integre

### 4.2 Securite & Firestore Rules

#### Points Positifs
- Les champs de solde (`availableBalance`, `totalEarnings`, etc.) sont proteges en ecriture cote client
- Cloud Functions = seule source de verite pour les operations financieres
- Acceptation des termes RGPD/eIDAS trackee

#### Points Negatifs
- **[P1] Pas de validation du montant de retrait dans les regles Firestore**: La creation de `payment_withdrawals` autorise l'ecriture client mais ne valide pas que `amount > 0` ou `amount <= availableBalance` au niveau des regles
- **[P1] Pas de rate limiting au niveau Firestore**: Un client malveillant pourrait spammer des demandes de retrait
- Les regles autorisent la creation de withdrawals par le client sans verification de coherence

### 4.3 Anti-Fraude (Comparaison)

| Mesure                        | Chatter | Influencer | Blogger | GroupAdmin | Global |
|-------------------------------|---------|------------|---------|------------|--------|
| Domaines email jetables       | 250+    | Non        | Non     | Non        | 8      |
| Detection meme IP             | Oui     | Non        | Non     | Non        | Oui    |
| Referral circulaire           | Oui     | Non        | Non     | Non        | Non    |
| Signup rapide                 | Oui     | Non        | Non     | Non        | Oui    |
| Device fingerprint            | Non     | Non        | Non     | Non        | Oui    |
| Hashing IP (confidentialite)  | SHA-256 | Non        | Non     | Non        | Masking|
| Score de risque               | Non     | Non        | Non     | Non        | 0-100  |
| Auto-flag/suspend             | Non     | Non        | Non     | Non        | Oui    |
| Email pattern (Levenshtein)   | Non     | Non        | Non     | Non        | Oui    |

**Conclusion**: Seuls Chatter et Global ont une protection anti-fraude. **Influencer, Blogger et GroupAdmin sont completement non-proteges.**

### 4.4 Telegram

#### Points Positifs
- Deep link onboarding avec capture du vrai `telegram_id` (pas juste un boolean)
- Confirmation de retrait avec clavier inline et expiration 15 minutes
- Cleanup automatique toutes les 5 minutes des confirmations expirees
- Bot unique pour les 4 types d'affilie
- Bonus $50 au tirelire a la connexion Telegram (verrouille jusqu'a $150 de commissions)

#### Points Negatifs
- **[P2]** Le bot n'a pas de rate limiting pour les messages entrants
- **[P2]** Si le bot est down pendant le cleanup, les confirmations expirees restent en base

### 4.5 Internationalisation (i18n)

#### Points Positifs
- 9 langues supportees (fr, en, es, de, pt, ru, zh, hi, ar)
- Structure JSON par langue avec cles imbriquees
- Systeme multilingual avec routing par locale

#### Points Negatifs
- **[P2]** Des cles mortes existent (scripts de nettoyage `find-dead-i18n-keys.cjs` et `cleanup-dead-i18n-keys.cjs` sont presents mais non-integres au CI)
- **[P2]** Certaines traductions manquantes dans des langues secondaires (fichier `missing_keys.json` existe)

### 4.6 Modele de Donnees

#### Points Positifs
- Tous les montants en centimes (USD) de maniere coherente
- Timestamps Firestore utilises uniformement dans le backend
- IDs de documents coherents (UID Firebase ou auto-generated)

#### Points Negatifs
- **[P1] Inconsistance "banned" vs "blocked"**: Chatter et Influencer utilisent `"banned"`, Blogger et GroupAdmin utilisent `"blocked"`. Le systeme Global utilise `"suspended"/"flagged"`.
  ```
  Chatter:    "active" | "inactive" | "suspended" | "banned"
  Influencer: "active" | "inactive" | "suspended" | "banned"
  Blogger:    "active" | "inactive" | "suspended" | "blocked"
  GroupAdmin:  "active" | "inactive" | "suspended" | "blocked"
  Global:     "active" | "suspended" | "flagged"
  ```
- **[P1] Blocage de role asymetrique**: Chatter ne bloque pas l'inscription Influencer, mais Influencer bloque l'inscription Chatter. Un utilisateur pourrait etre les deux simultanement dans un sens mais pas l'autre.
- **[P2]** 5 collections de commissions separees sans interface commune (impossible de voir les gains totaux d'un utilisateur multi-role)

---

## 5. POINTS POSITIFS (Consolides)

### Architecture
1. **Systeme de paiement centralise** - Un seul module `payment/` gere tous les retraits, tous les fournisseurs
2. **Transactions atomiques** - Toutes les mises a jour de solde utilisent `db.runTransaction()` ou `FieldValue.increment()`
3. **Separation claire des responsabilites** - Chaque type d'affilie a son module isole
4. **Config dynamique** - Chaque systeme a sa configuration Firestore modifiable sans redeploiement
5. **Cache intelligent** - TTL 5 minutes pour eviter les lectures Firestore repetitives

### Securite
6. **Soldes proteges** - Les champs financiers sont immutables cote client (Firestore rules)
7. **Cloud Functions = source de verite** - Aucune operation financiere n'est faite cote client
8. **Secrets centralises** - `secrets.ts` (843 lignes) gere tous les secrets Firebase en un point unique
9. **Anti-fraude Chatter** - Le systeme le plus complet avec 250+ domaines bloques, IP hashing, detection circulaire
10. **Cryptage AES-256-GCM** - Details bancaires dans le systeme Global

### UX & Operations
11. **Telegram double usage** - Onboarding + confirmation de securite pour les retraits
12. **Audit trail complet** - Chaque operation de paiement est loguee avec horodatage
13. **9 langues** - Support international etendu
14. **Tirelire (piggy bank)** - Mechanique de retention intelligente ($50 bonus verrouille jusqu'a $150 gains)
15. **Frozen rates** - Les taux de commission sont captures a l'inscription (equitable pour les affilies)

### Code Quality
16. **TypeScript strict** - Types bien definis pour chaque systeme
17. **Lifecycle de commission standardise** - pending -> validated/available -> paid
18. **Error logging structure** - `logger.error()` avec contexte dans tous les modules
19. **Migration scripts** - Scripts CJS pour les migrations de donnees
20. **Scheduled functions** - Nettoyage automatique, liberation de commissions, verification d'inactivite

---

## 6. POINTS NEGATIFS (Priorises)

### P0 - CRITIQUE (a corriger immediatement)

| # | Probleme | Systeme | Fichier | Impact |
|---|----------|---------|---------|--------|
| 1 | **GroupAdmin ecoute la mauvaise collection** | GroupAdmin | `groupAdmin/triggers/onCallCompleted.ts:36` | Les commissions GroupAdmin par appel client **ne se declenchent JAMAIS**. Le trigger ecoute `"calls/{callId}"` mais TwilioCallManager ecrit dans `"call_sessions"`. |
| 2 | **Race condition sur les retraits Influencer** | Influencer | `influencer/services/influencerWithdrawalService.ts:63-158` | Le solde est verifie hors transaction puis decremente dans la transaction. Deux retraits simultanes peuvent aboutir a un solde negatif. |
| 3 | **Aucune anti-fraude pour Influencer/Blogger/GroupAdmin** | Multi | N/A | Seul Chatter et Global ont une detection de fraude. Les 3 autres systemes acceptent n'importe quelle inscription sans verification. |
| 4 | **Duree minimale d'appel NON validee** | Multi | `*/triggers/onCallCompleted.ts` | `minCallDuration` est configure mais **jamais verifie** lors de la creation de commission. Un appel de 1 seconde genere une commission complete de $10. Faille exploitable pour fraude massive. |

### P1 - MAJEUR (a corriger dans le sprint en cours)

| # | Probleme | Systeme | Detail |
|---|----------|---------|--------|
| 5 | Limites quotidiennes/mensuelles non appliquees | Payment | `dailyLimit` et `monthlyLimit` definis dans les types mais jamais verifies avant approbation |
| 6 | Flutterwave sans idempotency | Payment | Pas de cle d'idempotence, risque de transferts doubles |
| 7 | Montant de retrait non valide dans Firestore rules | Security | Un client peut creer un withdrawal avec `amount: -1000` |
| 8 | Pas de rate limiting Firestore | Security | Spam possible de demandes de retrait |
| 9 | Inconsistance "banned" vs "blocked" | Data Model | 3 terminologies differentes entre 5 systemes |
| 10 | Blocage de role asymetrique | Registration | Chatter ne bloque pas Influencer mais Influencer bloque Chatter |
| 11 | Service de retrait legacy Influencer non supprime | Influencer | `@deprecated` mais toujours present et importable |
| 12 | Top 3 mensuel sans retry | Influencer | Si `monthlyTop3Rewards` echoue, les bonus sont perdus jusqu'au mois suivant |

### P2 - AMELIORATION (backlog)

| # | Probleme | Systeme | Detail |
|---|----------|---------|--------|
| 12 | Pas de vue consolidee multi-role | Data Model | 5 collections separees, impossible de voir les gains totaux |
| 13 | Cles i18n mortes | i18n | Scripts de nettoyage existent mais non-integres au CI |
| 14 | Traductions manquantes | i18n | `missing_keys.json` identifie des lacunes |
| 15 | Telegram bot sans rate limiting | Telegram | Messages entrants non limites |
| 16 | Duplication anti-fraude Chatter | Chatter | 3 fichiers de fraude avec chevauchement |
| 17 | 5 systemes de commission coexistants | Architecture | Maintenance et coherence difficiles |
| 18 | Detection de fraude Global trop legere | Global | 8 domaines vs 250+ dans Chatter |
| 19 | Cleanup Telegram fragile | Telegram | Si le cron echoue, confirmations expirees restent |
| 20 | Config helpers dupliques | Chatter | Wrappers inutiles autour de la config |
| 21 | Pas de tests automatises visibles | Testing | Repertoire `__tests__/` quasi-vide |
| 22 | Pas de CI/CD pour les Functions | DevOps | Deploiement manuel `firebase deploy --only functions` |
| 23 | PayPal provider a verifier | Payment | `paypalProvider.ts` non-tracke dans git |

---

## 7. RECOMMANDATIONS

### Urgentes (cette semaine)

**R1. Corriger le trigger GroupAdmin** (P0 #1)
```typescript
// groupAdmin/triggers/onCallCompleted.ts:36
// AVANT:
document: "calls/{callId}"
// APRES:
document: "call_sessions/{sessionId}"
```
Adapter aussi l'interface `CallDocument` pour matcher la structure de `call_sessions` et verifier les noms de champs (`groupAdminAffiliateCode` -> verifier qu'il existe sur les call_sessions).

**R2. Securiser le retrait Influencer** (P0 #2)
```typescript
// Deplacer la verification de solde DANS la transaction:
await db.runTransaction(async (transaction) => {
  const influencerDoc = await transaction.get(influencerRef);
  const influencer = influencerDoc.data();
  if (withdrawAmount > influencer.availableBalance) {
    throw new Error("Insufficient balance");
  }
  transaction.update(influencerRef, {
    availableBalance: FieldValue.increment(-withdrawAmount),
    pendingWithdrawalId: withdrawalRef.id,
  });
  transaction.set(withdrawalRef, withdrawal);
});
```

**R3. Valider la duree minimale d'appel** (P0 #4)
Dans chaque `onCallCompleted` trigger, ajouter avant la creation de commission:
```typescript
const config = await getConfigCached();
if (session.duration < config.minCallDuration) {
  logger.warn("Call too short for commission", { sessionId, duration: session.duration, min: config.minCallDuration });
  return; // Pas de commission
}
```
Valeur recommandee: 30-60 secondes minimum.

**R4. Etendre l'anti-fraude** (P0 #3)
- Option A (rapide): Importer `checkReferralFraud()` du systeme Global dans les registrations Influencer/Blogger/GroupAdmin
- Option B (meilleure): Creer un middleware anti-fraude commun appele par tous les systemes d'inscription

### Court terme (2 semaines)

**R5. Appliquer les limites de retrait** (P1 #5)
Ajouter dans `approveWithdrawal.ts`:
```typescript
const todayTotal = await getDailyWithdrawalTotal(userId);
if (todayTotal + amount > config.dailyLimit) throw new Error("Daily limit exceeded");
```

**R6. Ajouter l'idempotency Flutterwave** (P1 #6)
Utiliser le `withdrawalId` comme cle d'idempotence dans les headers Flutterwave.

**R7. Renforcer les Firestore rules** (P1 #7-8)
```
match /payment_withdrawals/{id} {
  allow create: if request.auth != null
    && request.resource.data.amount > 0
    && request.resource.data.userId == request.auth.uid;
}
```

**R8. Unifier la terminologie de statut** (P1 #9)
Choisir `"banned"` ou `"blocked"` et migrer tous les systemes vers le meme terme.

**R9. Corriger le blocage de role symetrique** (P1 #10)
Si un utilisateur est Chatter, il ne peut pas etre Influencer, et vice versa.

### Moyen terme (1 mois)

**R10. Supprimer le service legacy Influencer** (P1 #11)
Supprimer `influencerWithdrawalService.ts` et toutes ses references.

**R11. Ajouter retry pour Top 3** (P1 #12)
Ajouter un champ `lastTop3RewardDate` et re-executer si le mois precedent n'a pas ete traite.

**R12. Creer une vue consolidee** (P2)
Ajouter un champ `totalAffiliateEarnings` sur le document `users/{uid}` mis a jour par chaque systeme.

**R13. Integrer le nettoyage i18n au CI** (P2)
Ajouter `node scripts/find-dead-i18n-keys.cjs` comme etape de validation dans le pipeline.

### Long terme (3 mois)

**R14. Converger vers un systeme unique**
Les 5 systemes partagent 80% de logique commune (commission, retrait, recrutement). Considerer une refactorisation vers un systeme configurable unique avec des "plugins" par type d'affilie.

**R15. CI/CD pour Firebase Functions**
Mettre en place GitHub Actions pour:
- Build TypeScript automatique
- Tests unitaires
- Deploiement automatique en staging
- Deploiement manuel en production

**R16. Tests automatises**
Le repertoire `__tests__/` est quasi-vide. Objectif: 80% de couverture sur les services financiers critiques (commissions, retraits, anti-fraude).

---

## ANNEXE: Fichiers Cles par Systeme

### Chatter
- `chatter/triggers/onCallCompleted.ts` - Commission par appel (6 types)
- `chatter/callables/registerChatter.ts` - Inscription + generation codes
- `chatter/antiFraud.ts` - Detection fraude (250+ domaines)
- `chatter/services/chatterCommissionService.ts` - Creation/validation commissions
- `chatter/callables/telegramOnboarding.ts` - Onboarding Telegram

### Influencer
- `influencer/triggers/onCallCompleted.ts` - Commission par appel ($10 + bonus niveau)
- `influencer/callables/registerInfluencer.ts` - Inscription avec frozen rates
- `influencer/services/influencerCommissionService.ts` - Commissions avec multiplicateurs
- `influencer/services/influencerWithdrawalService.ts` - [DEPRECATED] Retraits legacy
- `influencer/scheduled/monthlyTop3Rewards.ts` - Bonus Top 3 mensuel

### Blogger
- `blogger/triggers/onCallCompleted.ts` - Commission fixe $10
- `blogger/callables/registerBlogger.ts` - Inscription (role definitif)
- `blogger/callables/articles.ts` - Systeme de ressources exclusives

### GroupAdmin
- `groupAdmin/triggers/onCallCompleted.ts` - **BUG: ecoute "calls" au lieu de "call_sessions"**
- `groupAdmin/callables/registerGroupAdmin.ts` - Inscription + verification groupe
- `groupAdmin/services/groupAdminCommissionService.ts` - Commissions
- `groupAdmin/services/groupAdminWithdrawalService.ts` - Retraits avec Telegram confirm

### Global (affiliate/)
- `affiliate/triggers/onCallCompleted.ts` - Commission configurable
- `affiliate/triggers/onUserCreated.ts` - Attribution a l'inscription
- `affiliate/utils/fraudDetection.ts` - Anti-fraude avec scoring
- `affiliate/services/commissionService.ts` - Service de commission
- `affiliate/wise/` - Integration Wise complete (client, quote, transfer, recipient)
- `affiliate/webhooks/wiseWebhook.ts` - Webhook Wise

### Transversal
- `payment/` - Systeme de paiement centralise (Wise, Flutterwave, PayPal)
- `telegram/withdrawalConfirmation.ts` - Confirmation de retrait
- `telegram/cleanupExpiredConfirmations.ts` - Nettoyage auto
- `lib/secrets.ts` - Gestion centralisee des secrets (843 lignes)
- `monitoring/criticalAlerts.ts` - Alertes critiques

---

*Rapport genere par une equipe de 31 agents IA specialises, analysant le code source en lecture seule.*
*Aucun fichier n'a ete modifie durant cet audit.*
