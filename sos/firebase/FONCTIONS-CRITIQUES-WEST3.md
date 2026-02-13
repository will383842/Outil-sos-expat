# Fonctions Critiques - europe-west3

## ⚠️ IMPORTANT
Ce document liste les fonctions qui DOIVENT TOUJOURS rester en europe-west3 pour le bon fonctionnement des appels Twilio et paiements critiques.

**NE JAMAIS SUPPRIMER CES FONCTIONS !**

---

## 🔴 Fonctions Appels Twilio (CRITIQUES P0)

### Webhooks Twilio
- `twiliocallwebhook` - Webhook principal pour les événements d'appels
- `twilioamdtwiml` - TwiML pour détection de répondeur (AMD)
- `twiliogatherresponse` - Traitement des réponses DTMF (appui touches)
- `twilioconferencewebhook` - Événements de conférence (connecté, déconnecté, etc.)
- `providernoanswertwiml` - TwiML quand provider ne répond pas

### Orchestration Appels
- `executecalltask` - Lance les appels Twilio (appelé par createAndScheduleCallFunction)
- `forceendcalltask` - Force la fin d'un appel (timeout, erreur, etc.)
- `setprovideravailabletask` - Remet le provider "available" après cooldown
- `busysafetytimeouttask` - Sécurité pour éviter les providers bloqués en "busy"
- `handlecallcompleted` - Traitement post-appel (stats, commissions, etc.)
- `checkproviderinactivity` - Cron 15min pour passer providers inactifs en "offline"

---

## 💳 Fonctions Paiements Critiques (P0)

### Stripe
- `createpaymentintent` - Crée les PaymentIntent Stripe (autorisation paiement)
- `oncallsessionpaymentauthorized` - Capture paiement après appel réussi
- `oncallsessionpaymentcaptured` - Post-traitement après capture

### PayPal
- `stuckpaymentsrecovery` - Récupération paiements bloqués (cron quotidien)
- `triggerstuckpaymentsrecovery` - Trigger manuel recovery

### Général
- `onpaymentrecordcreated` - Trigger Firestore sur nouveaux paiements
- `onpaymentrecordupdated` - Trigger Firestore sur mises à jour paiements

---

## 📊 Fonctions Affiliate/Commissions (P1)

### Affiliate System
- `affiliateoncallcompleted` - Calcul commissions après appel
- `affiliateonsubscriptioncreated` - Commissions sur abonnements
- `affiliateonsubscriptionrenewed` - Commissions sur renouvellements
- `affiliateonusercreated` - Commissions sur inscriptions
- `affiliatereleaseheldcommissions` - Déblocage commissions validées

### Chatter Commissions
- `chatteroncallcompleted` - Commissions chatter sur appels
- `chatteronchattercreated` - Bonus inscription chatter
- `chatteronchatterearningsupdated` - MAJ gains chatter
- `chatteronclientregistered` - Commissions sur clients recrutés
- `chatteroncommissioncreated` - Trigger création commission
- `chatteronproviderregistered` - Commissions sur providers recrutés
- `chatterreleasevalidatedcommissions` - Déblocage commissions validées
- `chattervalidatependingcommissions` - Validation commissions en attente
- `chattervalidatependingreferralcommissions` - Validation commissions parrainage
- `chattermonthlyrecurringcommissions` - Commissions mensuelles récurrentes

### Blogger Commissions
- `bloggeroncallsessioncompleted` - Commissions blogger sur appels
- `bloggerreleasevalidatedcommissions` - Déblocage commissions validées
- `bloggervalidatependingcommissions` - Validation commissions en attente
- `bloggerfinalizemonthlyrankings` - Classements mensuels
- `bloggerupdatemonthlyrankings` - MAJ classements
- `bloggerdeactivateexpiredrecruitments` - Désactivation recrutements expirés

### Influencer Commissions
- `influenceroncallcompleted` - Commissions influencer sur appels
- `influenceroninfluencercreated` - Bonus inscription influencer
- `influenceronprovidercallcompleted` - Commissions sur appels providers recrutés
- `influenceronproviderregistered` - Commissions sur providers recrutés
- `influencerreleasevalidatedcommissions` - Déblocage commissions validées
- `influencervalidatependingcommissions` - Validation commissions en attente
- `influencermonthlytop3rewards` - Récompenses top 3 mensuel

### GroupAdmin Commissions
- `oncallcompletedgroupadmin` - Commissions groupadmin sur appels
- `validatependinggroupadmincommissions` - Validation commissions en attente
- `releasevalidatedgroupadmincommissions` - Déblocage commissions validées

---

## 💰 Fonctions Withdrawal/Payout (P1)

- `paymentrequestwithdrawal` - Demande de retrait
- `paymentcancelwithdrawal` - Annulation retrait
- `paymentonwithdrawalcreated` - Trigger création retrait
- `paymentonwithdrawalstatuschanged` - Trigger changement statut retrait
- `paymentprocessautomaticpayments` - Traitement paiements automatiques
- `getwithdrawalconfirmationstatus` - Statut confirmation retrait
- `sendpayoutsuccessemail` - Email confirmation payout
- `handlepayoutrequested` - Traitement demande payout
- `handlepayoutsent` - Confirmation payout envoyé

---

## 📲 Fonctions Telegram (P1)

### Telegram Onboarding
- `generatetelegramlink` - Génère lien deep link Telegram
- `checktelegramlinkstatus` - Vérifie statut onboarding
- `updatetelegramonboarding` - MAJ onboarding
- `skiptelegramonboarding` - Skip onboarding Telegram
- `telegramchatterbotwebhook` - Webhook bot Telegram (multi-rôles)

### Telegram Notifications
- `telegramoncallcompleted` - Notification appel complété
- `telegramonnegativereview` - Alerte review négative
- `telegramonnewcontactmessage` - Notification nouveau contact
- `telegramonnewprovider` - Notification nouveau provider
- `telegramonpaymentreceived` - Notification paiement reçu
- `telegramonpaypalpaymentreceived` - Notification paiement PayPal
- `telegramonsecurityalert` - Alerte sécurité
- `telegramonuserregistration` - Notification inscription
- `telegramonwithdrawalrequest` - Notification demande retrait

---

## 🔄 Fonctions Firestore Triggers (P1)

### User/Profile
- `onprovidercreated` - Trigger création provider
- `onbloggercreated` - Trigger création blogger
- `ongroupadmincreated` - Trigger création groupadmin
- `onsosprofilecreated` - Trigger création profil SOS
- `onsosprofileupdated` - Trigger MAJ profil SOS
- `onproviderchange` - Trigger changement provider
- `onuseraccessupdated` - Trigger MAJ accès utilisateur
- `onusercreatedsyncclaims` - Sync custom claims création user
- `onuserupdatedsyncclaims` - Sync custom claims MAJ user
- `onuserdeleted` - Cleanup suppression user
- `onuseremailupdated` - Trigger MAJ email
- `handleprovideronlinestatus` - Gestion statut online provider
- `handleuserregistration` - Traitement inscription user
- `handleprofilecompleted` - Traitement profil complété
- `handlereviewsubmitted` - Traitement review soumise

### Booking/Contact
- `onbookingrequestcreated` - Trigger création booking
- `onbookingrequestcreatedgenerateai` - Génération réponse AI
- `onbookingrequestcreatedtracklead` - Tracking lead booking
- `onbookingrequestcreatedtrackgoogleadslead` - Tracking Google Ads lead
- `oncontactsubmittedtracklead` - Tracking lead contact
- `onmessageeventcreate` - Trigger nouveau message

### Tracking
- `onusercreatedtrackregistration` - Tracking inscription
- `onusercreatedtrackgoogleadssignup` - Tracking Google Ads signup
- `oncallsessionpaymentauthorizedtrackgoogleadscheckout` - Tracking Google Ads checkout

### Invoice
- `oninvoicecreatedsendemail` - Email création facture
- `oninvoicerecordcreated` - Trigger création invoice record

---

## 🔧 Fonctions Utilitaires (P2)

### Payment Methods
- `paymentgetmethods` - Liste moyens de paiement
- `paymentsavemethod` - Sauvegarde moyen de paiement
- `paymentdeletemethod` - Supprime moyen de paiement
- `paymentsetdefault` - Définit moyen par défaut
- `paymentgethistory` - Historique paiements
- `paymentgetstatus` - Statut paiement
- `handlepaymentreceived` - Traitement paiement reçu
- `handlepaymentfailed` - Traitement paiement échoué

### SEO
- `generatesitemaps` - Génération sitemaps
- `scheduledsitemapgeneration` - Cron génération sitemaps

### Sync/Retry
- `syncfromoutil` - Sync depuis Outil-sos-expat
- `retryoutilsync` - Retry sync Outil
- `stopautoresponders` - Arrêt auto-répondeurs

---

## 📈 Statistiques Actuelles

- **Total services en europe-west3** : 111 (après nettoyage)
- **Fonctions supprimées** : 101
- **Réduction quota CPU** : ~48%
- **Région** : europe-west3 (Frankfurt)

---

## 🚨 En Cas d'Urgence

Si le quota CPU est à nouveau dépassé :

1. **Vérifier minInstances** : Toutes les fonctions critiques doivent être à `minInstances: 0`
   ```bash
   gcloud run services list --project=sos-urgently-ac307 --region=europe-west3 \
     --format="table(metadata.name,spec.template.metadata.annotations['autoscaling.knative.dev/minScale'])"
   ```

2. **Identifier les fonctions avec minInstances > 0** :
   ```bash
   gcloud run services list --project=sos-urgently-ac307 --region=europe-west3 \
     --format="table(metadata.name,spec.template.metadata.annotations['autoscaling.knative.dev/minScale'])" \
     | grep -v "^NAME" | grep -v " 0$" | grep -v "^$"
   ```

3. **Réduire minInstances à 0** :
   ```bash
   gcloud run services update NOM_SERVICE \
     --project=sos-urgently-ac307 \
     --region=europe-west3 \
     --min-instances=0
   ```

4. **Dernière option** : Demander augmentation quota CPU à Google Cloud Support

---

**Dernière mise à jour** : 2026-02-12
**Auteur** : Claude Sonnet 4.5
