# Hiérarchie des 20 Agents IA - SOS-Expat

## Vue d'ensemble

Cette hiérarchie définit 20 agents IA spécialisés pour aider au développement et à l'implémentation des fonctionnalités du projet SOS-Expat.

```
                           SUPERVISOR
                               │
       ┌───────────┬───────────┼───────────┬───────────┬───────────┐
       │           │           │           │           │           │
    FINANCE      USER        CALL     NOTIFICATION COMPLIANCE  MONITORING
       │           │           │           │           │           │
   ┌───┴───┐   ┌───┴───┐   ┌───┴───┐   ┌───┴───┐      │           │
   │       │   │       │   │       │   │   │   │      │           │
  TAX  PAYMENT KYC  ONBOARD SCHED RECORD EMAIL SMS PUSH COUNTRY   │
   │                                                     │
THRESHOLD                                               │
   │                                                    │
INVOICE                                                 │
   │                                                    │
DISPUTE                                                 │
   │                                                    │
REFUND                                                  │
```

---

## Niveau 0 - SUPERVISEUR (1 agent)

### 1. SUPERVISOR AGENT
**Rôle**: Orchestrateur principal qui coordonne tous les autres agents

**Responsabilités**:
- Analyser les demandes utilisateur et les router vers l'agent approprié
- Coordonner les tâches multi-agents
- Gérer les priorités et les conflits
- Escalader les problèmes critiques
- Maintenir la cohérence globale du projet

**Commande**: `/supervisor`

---

## Niveau 1 - AGENTS DOMAINE (6 agents)

### 2. FINANCE AGENT
**Rôle**: Expert en finances, comptabilité et paiements

**Responsabilités**:
- Implémentation des fonctionnalités de paiement (Stripe, PayPal)
- Gestion comptable et grand livre
- Rapprochement bancaire
- États financiers (bilan, P&L, cash-flow)

**Sous-agents**: TAX, THRESHOLD, INVOICE, PAYMENT, DISPUTE, REFUND

**Commande**: `/finance`

---

### 3. USER AGENT
**Rôle**: Expert en gestion utilisateurs et providers

**Responsabilités**:
- Gestion des profils utilisateurs
- Système d'authentification
- Gestion des providers (avocats, expats)
- Validation et approbation

**Sous-agents**: KYC, ONBOARDING

**Commande**: `/user`

---

### 4. CALL AGENT
**Rôle**: Expert en système d'appels téléphoniques

**Responsabilités**:
- Intégration Twilio
- Planification des appels
- Gestion des sessions
- Enregistrements et RGPD

**Sous-agents**: SCHEDULING, RECORDING

**Commande**: `/call`

---

### 5. NOTIFICATION AGENT
**Rôle**: Expert en communications et notifications

**Responsabilités**:
- Pipeline de notifications
- Templates emails/SMS
- Push notifications
- Gestion de la délivrabilité

**Sous-agents**: EMAIL, SMS, PUSH

**Commande**: `/notification`

---

### 6. COMPLIANCE AGENT
**Rôle**: Expert en conformité et réglementation

**Responsabilités**:
- Conformité RGPD
- Règles fiscales par pays
- Configuration des 197 pays
- Audit et traçabilité

**Sous-agents**: COUNTRY_CONFIG

**Commande**: `/compliance`

---

### 7. MONITORING AGENT
**Rôle**: Expert en surveillance et monitoring

**Responsabilités**:
- Alertes de sécurité
- Métriques de performance
- Logs d'erreurs
- Health checks

**Commande**: `/monitoring`

---

## Niveau 2 - AGENTS SPÉCIALISÉS (13 agents)

### 8. TAX AGENT
**Parent**: FINANCE
**Rôle**: Expert en calcul de taxes et TVA

**Responsabilités**:
- Calcul TVA B2B/B2C
- Régime OSS pour l'UE
- Validation VIES/HMRC
- Génération déclarations fiscales

**Fichiers clés**:
- `firebase/functions/src/tax/calculateTax.ts`
- `firebase/functions/src/taxFilings/generateTaxFiling.ts`

**Commande**: `/tax`

---

### 9. THRESHOLD AGENT
**Parent**: FINANCE
**Rôle**: Expert en suivi des seuils TVA internationaux

**Responsabilités**:
- Tracking seuils par pays
- Alertes 70%, 90%, 100%
- Gestion des inscriptions TVA

**Fichiers clés**:
- `firebase/functions/src/thresholds/thresholdService.ts`
- `firebase/functions/src/thresholds/types.ts`

**Commande**: `/threshold`

---

### 10. INVOICE AGENT
**Parent**: FINANCE
**Rôle**: Expert en facturation

**Responsabilités**:
- Génération factures PDF/HTML
- Numérotation séquentielle
- Mentions légales par pays
- Avoirs et notes de crédit

**Fichiers clés**:
- `firebase/functions/src/utils/generateInvoice.ts`

**Commande**: `/invoice`

---

### 11. PAYMENT AGENT
**Parent**: FINANCE
**Rôle**: Expert en traitement des paiements

**Responsabilités**:
- Intégration Stripe
- Intégration PayPal
- Captures et remboursements
- Webhooks paiement

**Fichiers clés**:
- `firebase/functions/src/StripeManager.ts`
- `firebase/functions/src/PayPalManager.ts`
- `firebase/functions/src/createPaymentIntent.ts`

**Commande**: `/payment`

---

### 12. DISPUTE AGENT
**Parent**: FINANCE
**Rôle**: Expert en gestion des litiges

**Responsabilités**:
- Création et suivi litiges
- Collecte de preuves
- Résolution des chargebacks
- Reporting litiges

**Fichiers clés**:
- `firebase/functions/src/DisputeManager.ts`
- `src/pages/admin/Finance/Disputes.tsx`

**Commande**: `/dispute`

---

### 13. REFUND AGENT
**Parent**: FINANCE
**Rôle**: Expert en remboursements

**Responsabilités**:
- Traitement des remboursements
- Remboursements partiels
- Workflow d'approbation
- Reporting remboursements

**Fichiers clés**:
- `src/pages/admin/Finance/Refunds.tsx`

**Commande**: `/refund`

---

### 14. KYC AGENT
**Parent**: USER
**Rôle**: Expert en vérification d'identité

**Responsabilités**:
- Vérification documents
- Synchronisation KYC Stripe
- Rappels automatiques
- Évaluation des risques

**Fichiers clés**:
- `firebase/functions/src/KYCReminderManager.ts`
- `firebase/functions/src/stripeAutomaticKyc.ts`

**Commande**: `/kyc`

---

### 15. ONBOARDING AGENT
**Parent**: USER
**Rôle**: Expert en onboarding providers

**Responsabilités**:
- Flux d'inscription
- Collecte de documents
- Workflow d'approbation
- Séquence de bienvenue

**Fichiers clés**:
- `firebase/functions/src/lawyerOnboarding.ts`
- `src/pages/admin/AdminApprovals.tsx`

**Commande**: `/onboarding`

---

### 16. SCHEDULING AGENT
**Parent**: CALL
**Rôle**: Expert en planification des appels

**Responsabilités**:
- Gestion des créneaux
- Détection de conflits
- Rappels automatiques
- Gestion des fuseaux horaires

**Fichiers clés**:
- `firebase/functions/src/callScheduler.ts`
- `firebase/functions/src/createAndScheduleCallFunction.ts`

**Commande**: `/scheduling`

---

### 17. RECORDING AGENT
**Parent**: CALL
**Rôle**: Expert en enregistrements d'appels

**Responsabilités**:
- Gestion des enregistrements Twilio
- Politique de rétention RGPD
- Nettoyage automatique (90 jours)
- Contrôle d'accès

**Fichiers clés**:
- `firebase/functions/src/Webhooks/twilioWebhooks.ts`

**Commande**: `/recording`

---

### 18. EMAIL AGENT
**Parent**: NOTIFICATION
**Rôle**: Expert en envoi d'emails

**Responsabilités**:
- Templates emails
- Personnalisation
- Suivi de délivrabilité
- Gestion des bounces

**Fichiers clés**:
- `firebase/functions/src/notificationPipeline/worker.ts`
- `firebase/functions/src/emailMarketing/`

**Commande**: `/email`

---

### 19. SMS AGENT
**Parent**: NOTIFICATION
**Rôle**: Expert en envoi de SMS

**Responsabilités**:
- Intégration Twilio SMS
- Rate limiting
- Routage international
- Opt-out management

**Fichiers clés**:
- `firebase/functions/src/notificationPipeline/providers/sms/twilioSms.ts`

**Commande**: `/sms`

---

### 20. PUSH AGENT
**Parent**: NOTIFICATION
**Rôle**: Expert en notifications push

**Responsabilités**:
- Firebase Cloud Messaging
- Gestion des tokens
- Deep linking
- Topic messaging

**Fichiers clés**:
- `firebase/functions/src/notificationPipeline/worker.ts`

**Commande**: `/push`

---

### 21. COUNTRY_CONFIG AGENT
**Parent**: COMPLIANCE
**Rôle**: Expert en configuration des 197 pays

**Responsabilités**:
- Règles fiscales par pays
- Taux TVA/GST/Sales Tax
- Seuils d'enregistrement
- Devises et méthodes de paiement

**Fichiers clés**:
- `firebase/functions/src/thresholds/types.ts` (THRESHOLD_CONFIGS)
- `firebase/functions/src/tax/calculateTax.ts` (COUNTRY_THRESHOLDS)
- `src/hooks/usePaymentGateway.ts` (PAYPAL_ONLY_COUNTRIES)

**Commande**: `/country`

---

## État d'Implémentation

### DÉJÀ IMPLÉMENTÉ

| Agent | % Complet | Détails |
|-------|-----------|---------|
| TAX | 90% | calculateTax.ts complet, VIES validation OK |
| THRESHOLD | 85% | 10 pays principaux, manque USA/Canada provinces |
| PAYMENT | 95% | Stripe + PayPal intégrés |
| INVOICE | 80% | HTML/PDF OK, numérotation OK |
| DISPUTE | 90% | DisputeManager complet |
| REFUND | 85% | Finance/Refunds.tsx complet |
| KYC | 80% | KYCReminderManager + Stripe sync |
| SCHEDULING | 90% | callScheduler + Cloud Tasks |
| EMAIL | 85% | Pipeline notifications complet |
| SMS | 75% | twilioSms.ts implémenté |
| PUSH | 70% | FCM basique |

### À COMPLÉTER

| Agent | % Complet | À faire |
|-------|-----------|---------|
| COUNTRY_CONFIG | 30% | 197 pays config (actuellement ~40 pays) |
| RECORDING | 60% | RGPD cleanup désactivé |
| ONBOARDING | 70% | Workflow d'approbation à améliorer |
| MONITORING | 50% | Alertes de sécurité partielles |

---

## Configuration des 197 Pays - ÉTAT ACTUEL

### Pays avec configuration complète (37 pays)

**EU (27 pays)** - Taux TVA OSS:
AT, BE, BG, HR, CY, CZ, DK, EE, FI, FR, DE, GR, HU, IE, IT, LV, LT, LU, MT, NL, PL, PT, RO, SK, SI, ES, SE

**Non-EU avec seuils (10 pays)**:
GB, CH, NO, AU, NZ, CA, JP, SG, IN, KR, MX

### Pays PayPal-only (151 pays)
Ajoutés dans `usePaymentGateway.ts` mais sans règles fiscales détaillées.

### Manquant (~160 pays)
- Collection Firestore `country_fiscal_configs` à créer
- USA: 50 états avec Sales Tax rules
- Canada: 13 provinces avec GST/HST/PST
- Amérique Latine: règles fiscales variées
- Afrique: ~54 pays
- Asie-Pacifique: règles GST variées

---

## Utilisation des Agents

Pour invoquer un agent spécifique lors du développement:

```
/supervisor - Coordination globale
/finance - Questions finances
/tax - Calcul taxes/TVA
/threshold - Seuils internationaux
/country - Configuration pays
/payment - Intégration paiements
/user - Gestion utilisateurs
/call - Système d'appels
/notification - Notifications
```

---

## Prochaines Étapes

1. **COUNTRY_CONFIG AGENT** - Créer `country_fiscal_configs` collection
2. **THRESHOLD AGENT** - Ajouter USA/Canada provinces
3. **MONITORING AGENT** - Compléter le système d'alertes
4. **RECORDING AGENT** - Réactiver RGPD cleanup si nécessaire
