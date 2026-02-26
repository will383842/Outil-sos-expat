# Checklist Auth Manuelle — SOS-Expat
## Date : 2026-02-26

---

## Firebase Console > Authentication

- [ ] Email/Password activé
- [ ] Google Sign-In configuré avec domaine de production autorisé
- [ ] Domaines autorisés incluent : `sos-expat.com`, `app.sos-expat.com`, `localhost`
- [ ] Pas de providers inutilisés activés (Facebook, Apple, etc.)
- [ ] Phone/SMS : vérifier que reCAPTCHA est configuré

## Firebase Console > Authentication > Settings

- [ ] Email enumeration protection **activé** (Settings > User Actions)
- [ ] Password policy : minimum 8 caractères requis
- [ ] Vérifier la liste des domaines autorisés (Authorized domains)

## Firebase Console > Authentication > Users

- [ ] Vérifier qu'aucun compte admin n'a `emailVerified: false`
- [ ] Vérifier qu'aucun compte suspect (emails jetables) n'a le rôle admin

## Custom Claims

- [ ] Vérifier que `williamsjullin@gmail.com` a les claims `{ role: "admin", admin: true }`
- [ ] Vérifier que la whitelist admin dans `settings/admin_whitelist` est à jour
- [ ] Vérifier que les emails hardcodés dans `auth/setAdminClaims.ts` L15-19 sont corrects

## Endpoints HTTP (CRITIQUE)

- [ ] `diagnoseProfiles` : ajouter `verifyIdToken` + vérification admin
- [ ] `clearHelpArticles` : ajouter auth admin ou désactiver en production
- [ ] `initSingleHelpArticle` / `initHelpArticlesBatch` : ajouter auth admin
- [ ] `securityAlertAdminAction` : décoder et vérifier le Bearer token avec `verifyIdToken`
- [ ] `createSecurityAlertHttp` : valider la valeur de l'API key contre un secret stocké
- [ ] `migrateProfileSlugs` / `auditProfileSlugs` : remplacer clé hardcodée par secret

## Fonctions Admin

- [ ] `registerLocalBackup` : ajouter `assertAdmin()` (actuellement SANS vérification)
- [ ] `adminResetFAQs` : corriger `roles` → `role` (L256)
- [ ] `syncAllCustomClaims` : ajouter les rôles manquants (chatter, influencer, blogger, groupAdmin)
- [ ] Standardiser toutes les fonctions admin sur un helper unique `assertAdmin()`

## Secret Manager

- [ ] Aucun secret en dur dans le code (**VÉRIFIÉ OK**)
- [ ] Aucun secret dans `.env` commité (**VÉRIFIÉ OK** — uniquement clés publiques)
- [ ] Rotation planifiée pour secrets > 6 mois
- [ ] Désactiver les anciennes versions de secrets après rotation
- [ ] Nettoyer les ~20 secrets orphelins identifiés
- [ ] `TEST_BYPASS_VALIDATIONS` : restreindre à l'émulateur uniquement

## IAM

- [ ] Vérifier que seuls les emails autorisés ont `roles/owner`
- [ ] Ajouter un 2e owner de confiance (actuellement seul `williamsjullin@gmail.com`)
- [ ] Examiner si le Default Compute SA a besoin de `datastore.owner` + `firebase.admin`
- [ ] Examiner si `sos-urgently-ac307@appspot.gserviceaccount.com` a besoin de `roles/editor`

## Tokens & Sessions

- [ ] Ajouter `revokeRefreshTokens(uid)` lors de la suspension/bannissement
- [ ] Vérifier le statut de suspension avant les actions critiques (appels, paiements)
- [ ] Ajouter `sendEmailVerification()` après inscription Email/Password

## RGPD

- [ ] Vérifier que `userCleanupTrigger` couvre TOUTES les sous-collections
- [ ] Vérifier que `gdpr/auditTrail.ts` anonymise correctement les données
- [ ] Vérifier la retention de 3 ans de l'audit trail

---

*Checklist générée le 2026-02-26 — À parcourir manuellement dans la Firebase Console.*
