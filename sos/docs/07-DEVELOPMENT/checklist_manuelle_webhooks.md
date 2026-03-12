# Checklist Manuelle Webhooks - SOS Expat
## A verifier dans les dashboards externes
### Date: 2026-02-26

---

## STRIPE DASHBOARD
URL : https://dashboard.stripe.com/webhooks

Verifier :
- [ ] URL du webhook = `https://stripewebhook-5tfnuxa2hq-ey.a.run.app`
- [ ] Mode : LIVE (pas Test)
- [ ] Derniere livraison : statut 200 OK
- [ ] Pas d'erreurs dans l'historique des 7 derniers jours
- [ ] Signing secret = correspond a STRIPE_WEBHOOK_SECRET dans Secret Manager

Evenements a cocher dans Stripe :
- [ ] payment_intent.succeeded
- [ ] payment_intent.payment_failed
- [ ] payment_intent.canceled
- [ ] payment_intent.requires_action
- [ ] charge.dispute.created
- [ ] charge.dispute.updated
- [ ] charge.refunded
- [ ] charge.captured
- [ ] transfer.failed
- [ ] transfer.reversed
- [ ] transfer.created
- [ ] account.updated
- [ ] customer.subscription.created
- [ ] customer.subscription.updated
- [ ] customer.subscription.deleted
- [ ] customer.subscription.trial_will_end
- [ ] invoice.paid (note: pas invoice.payment_succeeded)
- [ ] invoice.payment_failed
- [ ] payout.failed

---

## PAYPAL DEVELOPER DASHBOARD
URL : https://developer.paypal.com/dashboard/applications

Verifier :
- [ ] URL du webhook = `https://paypalwebhook-5tfnuxa2hq-ey.a.run.app`
- [ ] Mode : LIVE
- [ ] Webhook ID = correspond a PAYPAL_WEBHOOK_ID dans Secret Manager
- [ ] Test de livraison : statut 200

Evenements souscrits :
- [ ] CHECKOUT.ORDER.APPROVED
- [ ] PAYMENT.CAPTURE.COMPLETED
- [ ] PAYMENT.CAPTURE.REFUNDED
- [ ] PAYMENT.CAPTURE.DENIED (RECOMMANDE - non traite dans le code actuellement)
- [ ] PAYMENT.CAPTURE.REVERSED (RECOMMANDE - non traite dans le code actuellement)

---

## TWILIO CONSOLE
URL : https://console.twilio.com/

### Pour chaque numero de telephone :
- [ ] Voice Webhook URL = `https://twiliocallwebhook-5tfnuxa2hq-ey.a.run.app`
- [ ] Methode = POST
- [ ] Status Callback URL = `https://twiliocallwebhook-5tfnuxa2hq-ey.a.run.app`

### TwiML Apps (si utilise) :
- [ ] Voice Request URL = URL correcte
- [ ] Fallback URL configuree

### Conference :
- [ ] Conference Status Callback = `https://twilioconferencewebhook-5tfnuxa2hq-ey.a.run.app`

### Recording :
- [ ] Recording Status Callback = `https://twiliorecordingwebhook-5tfnuxa2hq-ey.a.run.app`
- [ ] ATTENTION : Pas de politique de retention automatique ! Verifier la facturation recordings.

---

## WISE DASHBOARD
URL : https://wise.com/user/account#webhooks

Verifier :
- [ ] URL du webhook = `https://wisewebhook-5tfnuxa2hq-ey.a.run.app` (affiliate)
- [ ] URL du webhook payment = `https://paymentwebhookwise-5tfnuxa2hq-ey.a.run.app` (paiements)
- [ ] Secret = correspond a WISE_WEBHOOK_SECRET dans Secret Manager
- [ ] NOTE : WISE_MODE est actuellement "sandbox" - passer en "live" quand pret

Evenements :
- [ ] transfers#state-change (ou transfers#TransferStateChange)
- [ ] transfers#active-cases (ou transfers#ActiveCases)
- [ ] balances#credit

---

## FLUTTERWAVE DASHBOARD
URL : https://dashboard.flutterwave.com/dashboard/settings/webhooks

Verifier :
- [ ] URL du webhook = `https://paymentwebhookflutterwave-5tfnuxa2hq-ey.a.run.app`
- [ ] Secret hash = correspond a FLUTTERWAVE_WEBHOOK_SECRET dans Secret Manager
- [ ] NOTE : FLUTTERWAVE_MODE est actuellement "sandbox" - passer en "live" quand pret

---

## GOOGLE CLOUD TASKS
URL : https://console.cloud.google.com/cloudtasks

### europe-west3 :
- [ ] Queue `call-scheduler-queue` : RUNNING (500/s, 5 attempts) -- CONFIRME OK
- [ ] Pas de taches en echec repete

### europe-west1 :
- [ ] Queue `call-scheduler-queue` : RUNNING (20/s, 5 attempts) -- CONFIRME OK
- [ ] Queue `payout-retry-queue` : RUNNING (500/s, 100 attempts) -- CONFIRME OK
- [ ] Pas de taches en echec repete

### us-central1 :
- [ ] Queue `calls-queue` : RUNNING (500/s, 100 attempts) -- CONFIRME OK

---

## TELEGRAM BOT
URL : https://api.telegram.org/bot{TOKEN}/getWebhookInfo

- [ ] Webhook URL pointe vers `telegramChatterBotWebhook`
- [ ] Derniers messages delivres sans erreur

---

## ACTIONS CORRECTIVES RECOMMANDEES

### CRITIQUE
1. [ ] **Ajouter retention automatique recordings Twilio** - Creer une scheduled function qui supprime les recordings > X jours
2. [ ] **Implementer PAYMENT.CAPTURE.DENIED dans PayPal webhook** - Gerer les paiements refuses
3. [ ] **Utiliser timingSafeEqual pour Cloud Tasks auth** - Remplacer `===` par `crypto.timingSafeEqual()`

### IMPORTANT
4. [ ] **Passer Wise en mode live** quand pret (actuellement sandbox)
5. [ ] **Passer Flutterwave en mode live** quand pret (actuellement sandbox)
6. [ ] **Harmoniser les URLs Cloud Tasks** - Utiliser le meme format (Firebase ou project-number) partout

### OPTIONNEL
7. [ ] Implementer PAYMENT.CAPTURE.REVERSED dans PayPal webhook
8. [ ] Ajouter balances#debit et profiles#verification-state-change pour Wise
9. [ ] Auditer la securite des webhooks email marketing (Zoho/SES)

---

## RESUME AUTOMATIQUE (resultats agents A1-A19)

### Ce qui a ete verifie automatiquement :
- 17/17 fonctions webhook ACTIVE en production
- Toutes accessibles HTTP (400/401/403 selon securite)
- 8/11 URLs env vars = match exact (3 en format different mais fonctionnel)
- Signatures verifiees : Stripe, PayPal, Twilio, Wise, Flutterwave, Cloud Tasks
- Idempotence : collection `processed_webhook_events` pour tous les webhooks principaux
- DLQ + retry : en place pour subscriptions, payouts, Stripe transfers
- Memoire : toutes les fonctions critiques a 256Mi (fix deploye)
- Cloud Tasks queues : 4 queues RUNNING dans 3 regions
- Erreurs 7j : 49 crashes memoire (CORRIGES), 9 signatures Twilio invalides (rejetees OK)
- Frequence 24h : tous les webhooks actifs (77-187 appels/24h)

### Stripe : 17/17 evenements traites
### PayPal : 3/10 evenements traites (critique manquants)
### Wise : 3/5 evenements traites
### Flutterwave : 3/3 evenements traites
