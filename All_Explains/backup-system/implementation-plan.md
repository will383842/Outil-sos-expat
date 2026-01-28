# PLAN D'IMPLEMENTATION - SYSTEME DE BACKUP SOS EXPAT

**Date:** 2026-01-11
**Projet:** sos-urgently-ac307
**Version:** 1.0

---

## RESUME

Ce plan detaille les etapes pour combler les lacunes identifiees dans l'audit. Le systeme existant couvre deja 85% des besoins. Ce plan se concentre sur les 15% restants.

| Phase | Objectif | Duree Estimee |
|-------|----------|---------------|
| Phase A | Actions Immediates (P0) | Jour 1 |
| Phase B | Actions Urgentes (P1) | Jours 2-3 |
| Phase C | Ameliorations (P2) | Semaine 1-2 |
| Phase D | Optimisations (P3) | Mois 1 |

---

## PHASE A: ACTIONS IMMEDIATES (P0)

### A1. Export et Versioning des Regles de Securite

**Objectif:** Sauvegarder firestore.rules et storage.rules dans Git

**Etapes:**

1. **Exporter les regles Firestore actuelles**
   ```bash
   cd C:\Users\willi\Documents\Projets\VS_CODE\sos-expat-project\sos
   firebase firestore:rules:get > firestore.rules
   ```

2. **Exporter les regles Storage actuelles**
   ```bash
   firebase storage:rules:get > storage.rules
   ```

3. **Verifier les fichiers generes**
   ```bash
   cat firestore.rules
   cat storage.rules
   ```

4. **Commiter dans Git**
   ```bash
   git add firestore.rules storage.rules
   git commit -m "feat(security): Add Firebase security rules to version control"
   git push
   ```

**Verification:**
- [ ] firestore.rules existe et contient les regles
- [ ] storage.rules existe et contient les regles
- [ ] Fichiers commites dans Git

**Risque si non fait:** CRITIQUE - Perte totale du controle d'acces en cas d'incident

---

### A2. Verification et Creation du Bucket DR

**Objectif:** S'assurer que le bucket de disaster recovery existe

**Etapes:**

1. **Verifier l'existence du bucket**
   ```bash
   gsutil ls -b gs://sos-expat-backup-dr
   ```

2. **Si le bucket n'existe pas, le creer**
   ```bash
   # Creer le bucket en europe-west3 (Frankfurt)
   gsutil mb -l europe-west3 -c standard gs://sos-expat-backup-dr

   # Configurer les permissions
   gsutil iam ch serviceAccount:sos-urgently-ac307@appspot.gserviceaccount.com:objectAdmin gs://sos-expat-backup-dr
   ```

3. **Configurer la politique de lifecycle**
   ```bash
   # Creer le fichier lifecycle-config.json
   cat > lifecycle-config.json << 'EOF'
   {
     "rule": [
       {
         "action": {"type": "Delete"},
         "condition": {"age": 90}
       }
     ]
   }
   EOF

   # Appliquer la configuration
   gsutil lifecycle set lifecycle-config.json gs://sos-expat-backup-dr
   ```

4. **Tester l'acces en ecriture**
   ```bash
   echo "test" | gsutil cp - gs://sos-expat-backup-dr/test-access.txt
   gsutil rm gs://sos-expat-backup-dr/test-access.txt
   ```

**Verification:**
- [ ] Bucket existe
- [ ] Permissions correctes
- [ ] Lifecycle configure
- [ ] Test d'ecriture reussi

---

## PHASE B: ACTIONS URGENTES (P1)

### B1. Backup Securise des Secrets

**Objectif:** Sauvegarder toutes les cles API et configurations sensibles

**Etapes:**

1. **Exporter la configuration Firebase Functions**
   ```bash
   cd C:\Users\willi\Documents\Projets\VS_CODE\sos-expat-project\sos
   firebase functions:config:get > .firebase-config.json
   ```

2. **Creer un backup chiffre**
   ```bash
   # Generer une cle de chiffrement forte
   # IMPORTANT: Sauvegarder cette cle dans un gestionnaire de mots de passe!

   # Chiffrer le fichier
   openssl enc -aes-256-cbc -salt -pbkdf2 \
     -in .firebase-config.json \
     -out secrets-backup-$(date +%Y%m%d).enc

   # Supprimer le fichier non chiffre
   rm .firebase-config.json
   ```

3. **Uploader vers bucket securise**
   ```bash
   gsutil cp secrets-backup-*.enc gs://sos-expat-backup-dr/secrets/
   ```

4. **Documenter les secrets (sans les valeurs)**

   Creer `secrets-inventory.md`:
   ```markdown
   # Inventaire des Secrets SOS-Expat

   ## Firebase Functions Config
   - stripe.secret_key - Cle API Stripe
   - stripe.webhook_secret - Secret Webhook Stripe
   - paypal.client_id - Client ID PayPal
   - paypal.client_secret - Secret PayPal
   - twilio.account_sid - SID Twilio
   - twilio.auth_token - Token Twilio
   - encryption.key - Cle de chiffrement interne
   - smtp.password - Mot de passe SMTP

   ## Localisation
   - Fichier chiffre: gs://sos-expat-backup-dr/secrets/
   - Cle de dechiffrement: [Gestionnaire de mots de passe]
   ```

**Verification:**
- [ ] Configuration exportee
- [ ] Fichier chiffre cree
- [ ] Upload vers bucket DR
- [ ] Inventaire documente
- [ ] Cle de chiffrement sauvegardee separement

---

### B2. Documentation des Integrations Externes

**Objectif:** Documenter et exporter les configurations Stripe, PayPal, Twilio

#### B2.1 Stripe

**Etapes:**

1. **Exporter via Stripe CLI**
   ```bash
   # Installer Stripe CLI si necessaire
   # https://stripe.com/docs/stripe-cli

   # Se connecter
   stripe login

   # Exporter les produits
   stripe products list --limit 100 > stripe-products.json

   # Exporter les prix
   stripe prices list --limit 100 > stripe-prices.json

   # Exporter les webhooks
   stripe webhook_endpoints list > stripe-webhooks.json
   ```

2. **Documenter la configuration Connect**
   ```markdown
   # Configuration Stripe Connect

   ## Mode
   - [ ] Test
   - [ ] Live

   ## Webhooks Configures
   - Endpoint: https://[domain]/api/stripe-webhook
   - Events:
     - payment_intent.succeeded
     - payment_intent.failed
     - customer.subscription.created
     - customer.subscription.deleted
     - [autres events]

   ## Produits
   - [Lister les produits depuis stripe-products.json]
   ```

3. **Sauvegarder**
   ```bash
   mkdir -p integrations/stripe
   mv stripe-*.json integrations/stripe/
   gsutil -m cp -r integrations/stripe gs://sos-expat-backup-dr/integrations/
   ```

#### B2.2 PayPal

**Etapes:**

1. **Documenter manuellement depuis le dashboard PayPal**

   Creer `integrations/paypal/paypal-config.md`:
   ```markdown
   # Configuration PayPal SOS-Expat

   ## Credentials
   - Client ID: [Reference - stocke dans Firebase Config]
   - Mode: Sandbox / Live

   ## Webhooks
   - URL: https://[domain]/api/paypal-webhook
   - Events actives:
     - PAYMENT.CAPTURE.COMPLETED
     - PAYMENT.CAPTURE.DENIED
     - [autres events]

   ## Configuration Partner Referrals
   - [Details si applicable]
   ```

2. **Exporter via API (optionnel)**
   ```bash
   # Via curl si vous avez les credentials
   curl -v -X GET https://api.paypal.com/v1/notifications/webhooks \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer ACCESS_TOKEN"
   ```

#### B2.3 Twilio

**Etapes:**

1. **Exporter via Twilio CLI**
   ```bash
   # Installer Twilio CLI si necessaire
   # npm install -g twilio-cli

   # Se connecter
   twilio login

   # Lister les numeros de telephone
   twilio phone-numbers:list -o json > twilio-numbers.json

   # Lister les applications TwiML
   twilio api:core:applications:list -o json > twilio-apps.json

   # Documenter les SIP domains si utilises
   twilio api:voice:v1:sip-domains:list -o json > twilio-sip.json 2>/dev/null || echo "No SIP domains"
   ```

2. **Documenter la configuration**
   ```markdown
   # Configuration Twilio SOS-Expat

   ## Numeros
   - [Liste depuis twilio-numbers.json]

   ## Applications TwiML
   - [Liste depuis twilio-apps.json]

   ## Webhooks
   - Voice URL: https://[domain]/api/twilio/voice
   - SMS URL: https://[domain]/api/twilio/sms
   - Status Callback: https://[domain]/api/twilio/status
   ```

3. **Sauvegarder**
   ```bash
   mkdir -p integrations/twilio
   mv twilio-*.json integrations/twilio/
   gsutil -m cp -r integrations/twilio gs://sos-expat-backup-dr/integrations/
   ```

**Verification:**
- [ ] Stripe: produits, prix, webhooks exportes
- [ ] PayPal: configuration documentee
- [ ] Twilio: numeros, apps, webhooks documentes
- [ ] Tous les fichiers uploades vers bucket DR

---

## PHASE C: AMELIORATIONS (P2)

### C1. Augmenter la Frequence du Backup Auth

**Objectif:** Passer de backup hebdomadaire a quotidien

**Fichier:** `sos/firebase/functions/src/scheduled/backupAuth.ts`

**Modification:**

```typescript
// AVANT
export const weeklyAuthBackup = onSchedule(
  {
    schedule: '0 3 * * 0', // Dimanche 03:00
    timeZone: 'Europe/Paris',
    // ...
  },
  async () => { /* ... */ }
);

// APRES
export const dailyAuthBackup = onSchedule(
  {
    schedule: '0 3 * * *', // Tous les jours a 03:00
    timeZone: 'Europe/Paris',
    // ...
  },
  async () => { /* ... */ }
);
```

**Etapes:**

1. Modifier le fichier `backupAuth.ts`
2. Renommer la fonction exportee si necessaire
3. Mettre a jour les imports dans `index.ts`
4. Deployer:
   ```bash
   cd sos/firebase/functions
   npm run build
   firebase deploy --only functions:dailyAuthBackup
   ```

**Verification:**
- [ ] Schedule modifie
- [ ] Fonction deployee
- [ ] Premier backup quotidien execute
- [ ] Logs dans system_logs

---

### C2. Creer le Runbook de Disaster Recovery

**Objectif:** Document unique avec toutes les procedures de restauration

**Fichier:** `backup-system/disaster-recovery-runbook.md`

**Contenu:**

```markdown
# RUNBOOK DISASTER RECOVERY - SOS EXPAT

## CONTACTS D'URGENCE

| Role | Nom | Contact |
|------|-----|---------|
| Admin Principal | [Nom] | [Email/Tel] |
| Support Firebase | - | https://firebase.google.com/support |
| Support Stripe | - | https://support.stripe.com |
| Support Twilio | - | https://support.twilio.com |

## PROCEDURE DE RESTAURATION COMPLETE

### Etape 1: Evaluation
1. Identifier l'etendue de l'incident
2. Determiner le point de restauration (quel backup utiliser)
3. Notifier l'equipe

### Etape 2: Restauration Firestore
1. Acceder a l'interface admin ou utiliser gcloud
2. Lister les backups disponibles:
   ```bash
   gcloud firestore operations list
   ```
3. Restaurer:
   ```bash
   gcloud firestore import gs://sos-urgently-ac307.firebasestorage.app/scheduled-backups/morning/backup-TIMESTAMP
   ```

### Etape 3: Restauration Auth
1. Telecharger le backup Auth:
   ```bash
   gsutil cp gs://sos-urgently-ac307.firebasestorage.app/auth_backups/auth_backup_YYYY-MM-DD.json ./
   ```
2. Utiliser la fonction adminRestoreAuth via l'interface admin

### Etape 4: Restauration Storage (si necessaire)
1. Copier depuis le bucket DR:
   ```bash
   gsutil -m cp -r gs://sos-expat-backup-dr/storage-backup/* gs://sos-urgently-ac307.firebasestorage.app/
   ```

### Etape 5: Verification Post-Restauration
- [ ] Users peuvent se connecter
- [ ] Donnees Firestore visibles
- [ ] Paiements fonctionnels
- [ ] Appels Twilio operationnels

## TEMPS ESTIMES (RTO)

| Operation | Temps |
|-----------|-------|
| Firestore restore | 15-30 min |
| Auth restore | 5-10 min |
| Storage restore | 30-60 min |
| Verification | 30 min |
| **TOTAL** | **1-2 heures** |
```

**Verification:**
- [ ] Runbook cree
- [ ] Contacts mis a jour
- [ ] Procedures testees
- [ ] Document accessible a l'equipe

---

### C3. Exporter les Index Firestore

**Objectif:** S'assurer que firestore.indexes.json est a jour

**Etapes:**

1. **Exporter les index actuels**
   ```bash
   cd sos
   firebase firestore:indexes > firestore.indexes.json
   ```

2. **Verifier et commiter**
   ```bash
   git diff firestore.indexes.json
   git add firestore.indexes.json
   git commit -m "chore(firestore): Update indexes"
   ```

**Verification:**
- [ ] Index exportes
- [ ] Fichier commite

---

## PHASE D: OPTIMISATIONS (P3)

### D1. Exporter Configuration Cloud Tasks/Scheduler

**Objectif:** Documenter les queues et jobs GCP

**Etapes:**

1. **Exporter Cloud Tasks Queues**
   ```bash
   gcloud tasks queues list --format=json > gcp-config/cloud-tasks-queues.json
   ```

2. **Exporter Cloud Scheduler Jobs**
   ```bash
   gcloud scheduler jobs list --format=json > gcp-config/cloud-scheduler-jobs.json
   ```

3. **Documenter IAM Roles**
   ```bash
   gcloud projects get-iam-policy sos-urgently-ac307 --format=json > gcp-config/iam-policy.json
   ```

4. **Sauvegarder**
   ```bash
   mkdir -p gcp-config
   gsutil -m cp -r gcp-config gs://sos-expat-backup-dr/gcp-config/
   git add gcp-config/
   git commit -m "docs(gcp): Add GCP configuration exports"
   ```

**Verification:**
- [ ] Cloud Tasks exportes
- [ ] Cloud Scheduler exportes
- [ ] IAM documente
- [ ] Fichiers versionnes

---

### D2. Script d'Automatisation de l'Export des Regles

**Objectif:** Automatiser l'export hebdomadaire des regles de securite

**Fichier:** `sos/firebase/functions/src/scheduled/exportSecurityRules.ts`

```typescript
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

const BUCKET = 'sos-urgently-ac307.firebasestorage.app';

export const weeklySecurityRulesExport = onSchedule(
  {
    schedule: '0 0 * * 0', // Dimanche minuit
    timeZone: 'Europe/Paris',
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async () => {
    const bucket = getStorage().bucket(BUCKET);
    const db = getFirestore();
    const timestamp = new Date().toISOString().split('T')[0];

    try {
      // Note: L'export des regles via API n'est pas directement supporte
      // Ce script sert de rappel/log pour export manuel

      await db.collection('system_logs').add({
        type: 'security_rules_reminder',
        message: 'Rappel: Verifier que les regles de securite sont versionnees',
        timestamp: new Date(),
        action_required: 'Executer firebase firestore:rules:get et storage:rules:get',
      });

      logger.info('Security rules export reminder logged');
    } catch (error) {
      logger.error('Failed to log security rules reminder:', error);
    }
  }
);
```

**Verification:**
- [ ] Script cree
- [ ] Deploye
- [ ] Rappels generes

---

### D3. Dashboard de Monitoring Unifie

**Objectif:** Vue unique de l'etat des backups

**Option 1: Page Admin dans l'application**

Creer une page `/admin/backup-status` qui affiche:
- Dernier backup Firestore (morning, midday, evening)
- Dernier backup Auth
- Dernier backup DR
- Dernier test de restauration
- Alertes actives

**Option 2: Cloud Monitoring Dashboard**

```bash
# Creer un dashboard via gcloud
gcloud monitoring dashboards create --config-from-file=monitoring-dashboard.json
```

**Verification:**
- [ ] Dashboard cree
- [ ] Metriques visibles
- [ ] Alertes configurees

---

## CALENDRIER DE MISE EN OEUVRE

| Jour | Phase | Actions |
|------|-------|---------|
| J+0 | A | Export regles, verification bucket DR |
| J+1 | B | Export secrets, documentation Stripe |
| J+2 | B | Documentation PayPal, Twilio |
| J+7 | C | Modification frequence Auth backup |
| J+7 | C | Creation runbook DR |
| J+14 | C | Export indexes, tests |
| J+30 | D | Export GCP config |
| J+30 | D | Script automatisation |
| J+30 | D | Dashboard monitoring |

---

## CHECKLIST FINALE

### Phase A (Immediat)
- [ ] firestore.rules exporte et versionne
- [ ] storage.rules exporte et versionne
- [ ] Bucket DR verifie/cree
- [ ] Test acces bucket DR

### Phase B (48h)
- [ ] Secrets exportes et chiffres
- [ ] Inventaire secrets documente
- [ ] Stripe config exportee
- [ ] PayPal config documentee
- [ ] Twilio config exportee

### Phase C (2 semaines)
- [ ] Auth backup quotidien actif
- [ ] Runbook DR cree
- [ ] Index Firestore exportes
- [ ] Premier test restauration complete

### Phase D (1 mois)
- [ ] GCP config exportee
- [ ] Script automatisation deploye
- [ ] Dashboard monitoring operationnel
- [ ] Documentation complete

---

## METRIQUES DE SUCCES

| Metrique | Avant | Cible | Apres |
|----------|-------|-------|-------|
| Couverture backup | 85% | 98% | - |
| RPO Firestore | 8h | 8h | - |
| RPO Auth | 7j | 24h | - |
| RTO estime | 2h | 1h | - |
| Documentation | 60% | 95% | - |
| Tests DR | Mensuel | Mensuel | - |

---

## NOTES IMPORTANTES

1. **Ne pas stocker de secrets en clair** - Toujours chiffrer avant stockage
2. **Tester les restaurations** - Un backup non teste ne vaut rien
3. **Documenter les changements** - Mettre a jour ce plan apres chaque modification
4. **Alertes** - S'assurer que les alertes d'echec arrivent bien
5. **Rotation des cles** - Prevoir une rotation reguliere des secrets

---

**Document genere:** 2026-01-11
**Version:** 1.0
**Statut:** EN ATTENTE DE VALIDATION POUR PHASE 2
