# Rôles SOS-Expat — Documentation complète
## Date : 2026-02-26

---

## Matrice Rôles × Claims × Collections × Fonctions

### Rôle : `client`
| Aspect | Détail |
|--------|--------|
| **Claim Firebase** | `{ role: "client" }` |
| **Collections Firestore** | `users/{uid}` |
| **Inscription** | `createUserWithEmailAndPassword` ou Google OAuth → `createUserDocument` |
| **Auto-approbation** | OUI |
| **Vérification email** | NON (manquant) |
| **KYC** | NON |
| **Security Rule** | `isClient()` via `request.auth.token.role == 'client'` |
| **Fonctions autorisées** | `createAndScheduleCallHTTPS`, `createPaymentIntent`, profil lecture |

### Rôle : `lawyer`
| Aspect | Détail |
|--------|--------|
| **Claim Firebase** | `{ role: "lawyer" }` |
| **Collections Firestore** | `users/{uid}`, `sos_profiles/{uid}` (`providerType: "lawyer"`) |
| **Inscription** | `createUserDocument` + `completeLawyerOnboarding` |
| **Auto-approbation** | NON (pending → admin valide) |
| **KYC** | OUI (Stripe Express onboarding) |
| **Security Rule** | `isProvider()` via `request.auth.token.role == 'lawyer'` |
| **Fonctions autorisées** | Gestion profil, disponibilité, retrait, KYC |

### Rôle : `expat` (aidant expatrié)
| Aspect | Détail |
|--------|--------|
| **Claim Firebase** | `{ role: "expat" }` |
| **Collections Firestore** | `users/{uid}`, `sos_profiles/{uid}` (`providerType: "expat"`) |
| **Inscription** | `createUserDocument` |
| **Auto-approbation** | NON (pending → admin valide) |
| **KYC** | OUI (Stripe Express) |
| **Security Rule** | `isProvider()` via `request.auth.token.role == 'expat'` |
| **Fonctions autorisées** | Identique à lawyer |
| **Note** | `expatHelper` n'existe PAS comme rôle distinct — c'est `expat` |

### Rôle : `chatter`
| Aspect | Détail |
|--------|--------|
| **Claim Firebase** | `{ role: "chatter" }` (via `syncRoleClaims`) |
| **Collections Firestore** | `users/{uid}`, `chatters/{uid}` |
| **Inscription** | `registerChatter` (onCall, pré-authentifié) |
| **Auto-approbation** | OUI (status="active" immédiat) |
| **KYC** | NON |
| **Security Rule** | `isActiveChatter()` via Firestore lookup `chatters/{uid}.status == 'active'` |
| **Fonctions autorisées** | Dashboard chatter, retraits, formation |

### Rôle : `influencer`
| Aspect | Détail |
|--------|--------|
| **Claim Firebase** | `{ role: "influencer" }` (via `syncRoleClaims`) |
| **Collections Firestore** | `users/{uid}`, `influencers/{uid}` |
| **Inscription** | `registerInfluencer` (onCall, pré-authentifié) |
| **Auto-approbation** | OUI |
| **KYC** | NON |
| **Security Rule** | `isActiveInfluencer()` via Firestore lookup |
| **Fonctions autorisées** | Dashboard influencer, tracking, commissions, retraits |

### Rôle : `blogger`
| Aspect | Détail |
|--------|--------|
| **Claim Firebase** | `{ role: "blogger" }` (via `syncRoleClaims`) |
| **Collections Firestore** | `users/{uid}`, `bloggers/{uid}` |
| **Inscription** | `registerBlogger` (onCall, pré-authentifié) |
| **Auto-approbation** | OUI |
| **KYC** | NON |
| **Security Rule** | `isActiveBlogger()` via Firestore lookup |
| **Fonctions autorisées** | Dashboard blogger, articles, rankings, retraits |

### Rôle : `groupAdmin`
| Aspect | Détail |
|--------|--------|
| **Claim Firebase** | `{ role: "groupAdmin" }` (via `syncRoleClaims`) |
| **Collections Firestore** | `users/{uid}`, `group_admins/{uid}` |
| **Inscription** | `registerGroupAdmin` (onCall, pré-authentifié) |
| **Auto-approbation** | OUI |
| **KYC** | NON |
| **Security Rule** | `isActiveGroupAdmin()` via Firestore lookup |
| **Fonctions autorisées** | Dashboard group admin, posts, recrutements, retraits |

### Rôle : `admin`
| Aspect | Détail |
|--------|--------|
| **Claim Firebase** | `{ role: "admin", admin: true }` |
| **Collections Firestore** | `users/{uid}` (`role: "admin"`, `isAdmin: true`) |
| **Inscription** | `bootstrapFirstAdmin` (whitelist email) ou `initializeAdminClaims` (par admin existant) |
| **Whitelist** | Firestore `settings/admin_whitelist` + fallback hardcodé |
| **Security Rule** | `isAdmin()` via claims + Firestore fallback |
| **Fonctions autorisées** | TOUTES (200+ fonctions admin) |

### Rôle : `agency_manager`
| Aspect | Détail |
|--------|--------|
| **Claim Firebase** | **AUCUN** |
| **Collections Firestore** | `users/{uid}` (`role: "agency_manager"`, `linkedProviderIds`) |
| **Inscription** | Créé par admin |
| **Security Rule** | `isAgencyManager()` via Firestore lookup uniquement |
| **Fonctions autorisées** | Dashboard multi-prestataire, lecture statuts providers liés |

---

## Schéma de vérification des rôles

```
Requête entrante
     │
     ▼
[Fonction onCall ?]──YES──▶ Vérifie context.auth (✅ OK partout)
     │                           │
     │                           ▼
     │                    [Rôle requis ?]──YES──▶ assertAdmin() ou claims check
     │                           │
     │                           NO──▶ Tout utilisateur authentifié
     │
     NO
     │
     ▼
[Fonction onRequest ?]──▶ ⚠️ CERTAINES SANS AUTH (voir C1)
     │
     ▼
[Webhook externe ?]──▶ Vérification signature (Stripe/Twilio/PayPal/Wise)
     │
     ▼
[Trigger Firestore ?]──▶ Pas d'auth (déclenché par le système)
     │
     ▼
[Scheduled ?]──▶ Pas d'auth (exécuté par Cloud Scheduler)
```

---

## Inconsistances détectées

| # | Inconsistance | Impact |
|---|---------------|--------|
| 1 | Claims affiliés définis par `syncRoleClaims` mais **non utilisés** dans les security rules (les rules utilisent Firestore lookup) | Faible — les rules sont plus strictes |
| 2 | `agency_manager` n'a aucun claim | Faible — vérifié par Firestore |
| 3 | Rôle unique (string) — pas de multi-rôles | Un user ne peut être lawyer ET chatter |
| 4 | Claims non révoqués quand un affilié est banni | Élevé — token valide 1h après ban |

---

*Documentation générée le 2026-02-26*
