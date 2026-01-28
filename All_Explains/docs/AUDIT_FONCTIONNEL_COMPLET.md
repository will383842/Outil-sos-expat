# AUDIT FONCTIONNEL COMPLET - SOS-EXPAT
## Analyse Exhaustive des Interfaces Multi-Roles

**Date:** 18 Decembre 2025
**Version:** 1.1
**Statut:** CORRIGE

---

## :white_check_mark: CORRECTIONS APPLIQUEES (18/12/2025)

### PHASE 0 - Corrections Urgentes

| Correction | Fichier | Statut |
|------------|---------|--------|
| Faille IDOR corrigee | `DossierDetail.tsx` | :white_check_mark: FAIT |
| Dashboard filtre par provider | `Dashboard.tsx` | :white_check_mark: FAIT |
| Messages filtre par provider | `Messages.tsx` | :white_check_mark: FAIT |
| TestIA protege admin-only | `AppAdmin.tsx` | :white_check_mark: FAIT |
| Routes admin protegees | `AppAdmin.tsx` | :white_check_mark: FAIT |

### Details des Corrections

**1. DossierDetail.tsx** - Verification d'acces ajoutee:
```typescript
// Avant: getDoc sans verification
// Apres: Verification que booking.providerId appartient aux providers lies
if (!isAdmin && bookingData.providerId) {
  const hasAccess = linkedProviders.some(p => p.id === bookingData.providerId);
  if (!hasAccess) {
    setError("Acces refuse - Ce dossier ne vous appartient pas");
    return;
  }
}
```

**2. Dashboard.tsx** - Filtrage par activeProvider:
- Admin voit toutes les stats globales
- Prestataire voit uniquement SES stats
- Section "Prestataires" masquee pour non-admins

**3. Messages.tsx** - Filtrage par activeProvider:
- Requete avec `where("providerId", "==", activeProvider.id)`
- Admin voit toutes les conversations
- Prestataire voit uniquement SES conversations

**4. AppAdmin.tsx** - Protection des routes:
- TestIA deplace dans `adminOnlyNavItems`
- Routes admin protegees avec redirection si non-admin
- Prestataires, GestionAcces, Utilisateurs, Pays, Parametres, TestIA = admin-only

---

## RESUME EXECUTIF

### Vue d'ensemble

L'application SOS-Expat utilise une **architecture mono-interface** avec des vues conditionnelles basees sur les roles, plutot que 3 interfaces physiquement separees:

| Interface Supposee | Realite Technique |
|-------------------|-------------------|
| Console Administration | `/admin/*` avec `isAdmin = true` |
| Dashboard Prestataire Standard | `/admin/*` avec `isProvider = true` + 1 prestataire lie |
| Dashboard Prestataire Luxe | `/admin/*` avec `isProvider = true` + N prestataires lies (multi-comptes) |

### Metriques Cles

| Metrique | Valeur |
|----------|--------|
| Total pages analysees | 11 |
| Total fonctionnalites | 67 |
| Problemes CRITIQUES | 12 |
| Problemes ELEVES | 8 |
| Problemes MOYENS | 15 |
| Fonctionnalites mal placees | 7 |
| Fonctionnalites manquantes | 14 |

### Verdict Global

**ETAT DE LA SECURITE:** :warning: **PREOCCUPANT**

- Firestore Rules = **SOLIDES** (8/10)
- Protection Frontend = **INSUFFISANTE** (4/10)
- Separation fonctionnelle = **FLOUE** (5/10)
- UX/Clarte des roles = **MEDIOCRE** (4/10)

---

## PARTIE 1: DECOUVERTE GLOBALE

### 1.1 Architecture Actuelle

```
src/
├── admin/
│   ├── AppAdmin.tsx          # Routeur principal + navigation conditionnelle
│   ├── pages/
│   │   ├── Dashboard.tsx     # Stats globales (PROBLEME: pas de filtrage)
│   │   ├── Dossiers.tsx      # Liste bookings (filtrage par activeProvider)
│   │   ├── DossierDetail.tsx # Detail + Chat IA (FAILLE: IDOR)
│   │   ├── Messages.tsx      # Historique conversations (PROBLEME: pas de filtrage)
│   │   ├── Prestataires.tsx  # [ADMIN ONLY] Gestion acces providers
│   │   ├── GestionAcces.tsx  # [ADMIN ONLY] Liaison users/providers
│   │   ├── Utilisateurs.tsx  # [ADMIN ONLY] Gestion equipe
│   │   ├── pays.tsx          # [ADMIN ONLY] Config pays (READ-ONLY)
│   │   ├── Parametres.tsx    # [ADMIN ONLY] Hub configuration
│   │   ├── MesPrestataires.tsx # Multi-comptes gestion
│   │   └── TestIA.tsx        # [ADMIN ONLY] Test IA (FAILLE: pas de protection)
│   └── sections/
│       └── AISettings.tsx    # [ADMIN ONLY] Config prompts IA
└── contexts/
    ├── AuthContext.tsx       # Detection admin/provider via email/claims
    ├── ProviderContext.tsx   # Multi-comptes + activeProvider
    └── SubscriptionContext.tsx # Verification abonnement
```

### 1.2 Flux d'Authentification

```
1. Login Google SSO (/auth)
         ↓
2. Firebase Auth (onAuthStateChanged)
         ↓
3. AuthContext detecte:
   - isAdmin? (custom claims OU Firestore users/{uid}.role)
   - isProvider? (email match dans collection providers)
         ↓
4. SubscriptionContext verifie:
   - hasActiveSubscription? (active/trialing/past_due)
   - hasAllowedRole? (lawyer/expat/admin/etc.)
         ↓
5. ProviderContext charge:
   - linkedProviderIds (multi-comptes)
   - activeProvider (prestataire actif)
         ↓
6. ProtectedRoute valide tous les criteres
         ↓
7. AppAdmin affiche navigation conditionnelle
```

### 1.3 Roles Detectes

| Role | Source | Acces |
|------|--------|-------|
| `admin` | Custom Claims / Firestore | Toutes pages |
| `superadmin` | Custom Claims / Firestore | Toutes pages |
| `lawyer` | SubscriptionContext | Pages prestataire |
| `expat` | SubscriptionContext | Pages prestataire |
| `provider` | Alias generique | Pages prestataire |
| `avocat` | Alias francais | Pages prestataire |
| `expat_aidant` | Alias francais | Pages prestataire |

---

## PARTIE 2: INVENTAIRE COMPLET DES FONCTIONNALITES

### 2.1 PAGES ADMIN-ONLY (Accessibles uniquement si isAdmin=true)

#### A. Prestataires.tsx (`/admin/prestataires`)

| # | Fonctionnalite | Type | Legitimite | Probleme |
|---|----------------|------|------------|----------|
| 1 | Lister tous les prestataires | Vue | :white_check_mark: Admin | Aucun filtrage |
| 2 | Toggle acces outil (hasToolAccess) | Action | :white_check_mark: Admin | Pas d'audit log |
| 3 | Ajouter prestataire manuellement | Modal | :warning: Risque | ID aleatoire, pas de validation |
| 4 | Rechercher par nom/email/pays | Filtre | :white_check_mark: Admin | - |
| 5 | Filtrer par type (avocat/expat) | Filtre | :white_check_mark: Admin | - |
| 6 | Filtrer par acces (avec/sans) | Filtre | :white_check_mark: Admin | - |
| 7 | Stats dashboard (total, types, acces) | Vue | :white_check_mark: Admin | - |

#### B. GestionAcces.tsx (`/admin/gestion-acces`)

| # | Fonctionnalite | Type | Legitimite | Probleme |
|---|----------------|------|------------|----------|
| 8 | Lister tous les utilisateurs | Vue | :white_check_mark: Admin | - |
| 9 | Ajouter utilisateur (par Firebase UID) | Modal | :warning: Risque | UID non valide |
| 10 | Modifier providers lies | Expansion | :white_check_mark: Admin | - |
| 11 | Supprimer utilisateur | Action | :white_check_mark: Admin | Pas de cascade |
| 12 | Stats (users, providers, liaisons) | Vue | :white_check_mark: Admin | - |

#### C. Utilisateurs.tsx (`/admin/utilisateurs`)

| # | Fonctionnalite | Type | Legitimite | Probleme |
|---|----------------|------|------------|----------|
| 13 | Lister tous les users | Vue | :white_check_mark: Admin | - |
| 14 | Changer role (admin/agent/provider) | Menu | :white_check_mark: Admin | Pas de protection self |
| 15 | Supprimer utilisateur | Action | :white_check_mark: Admin | Admin peut supprimer admin |
| 16 | Rechercher par email/nom | Filtre | :white_check_mark: Admin | - |

#### D. Pays.tsx (`/admin/pays`)

| # | Fonctionnalite | Type | Legitimite | Probleme |
|---|----------------|------|------------|----------|
| 17 | Lister configurations pays | Vue | :white_check_mark: Admin | READ-ONLY |
| 18 | - | - | - | Pas d'edition possible |

#### E. Parametres.tsx + AISettings.tsx (`/admin/parametres`)

| # | Fonctionnalite | Type | Legitimite | Probleme |
|---|----------------|------|------------|----------|
| 19 | Toggle IA globalement | Toggle | :white_check_mark: Admin | - |
| 20 | Activer reponse auto booking | Toggle | :white_check_mark: Admin | - |
| 21 | Activer reponse auto message | Toggle | :white_check_mark: Admin | - |
| 22 | Choisir modele LLM | Dropdown | :white_check_mark: Admin | - |
| 23 | Tuner temperature | Slider | :white_check_mark: Admin | - |
| 24 | Tuner max tokens | Input | :white_check_mark: Admin | - |
| 25 | Editer prompt Avocat | Textarea | :warning: CRITIQUE | Impact immediat, pas de test |
| 26 | Editer prompt Expert | Textarea | :warning: CRITIQUE | Impact immediat, pas de test |
| 27 | Reinitialiser prompts | Bouton | :white_check_mark: Admin | - |

#### F. TestIA.tsx (`/admin/test-ia`)

| # | Fonctionnalite | Type | Legitimite | Probleme |
|---|----------------|------|------------|----------|
| 28 | Tester IA avec contexte simule | Form | :white_check_mark: Admin | **FAILLE: Pas de verif role** |
| 29 | Tests rapides predefinis | Boutons | :white_check_mark: Admin | - |
| 30 | Voir metadata debug | Toggle | :white_check_mark: Admin | - |
| 31 | Reset conversation | Bouton | :white_check_mark: Admin | - |

---

### 2.2 PAGES PRESTATAIRE (Accessibles si isProvider=true ou isAdmin=true)

#### A. Dashboard.tsx (`/admin`)

| # | Fonctionnalite | Type | Legitimite | Probleme |
|---|----------------|------|------------|----------|
| 32 | Stats globales dossiers | Vue | :x: **MAL PLACE** | Voit TOUS les dossiers |
| 33 | Stats globales prestataires | Vue | :x: **MAL PLACE** | Voit TOUS les prestataires |
| 34 | Stats revenus totaux | Vue | :x: **MAL PLACE** | Expose donnees financieres |
| 35 | Liste 5 derniers dossiers | Vue | :x: **MAL PLACE** | Pas de filtrage provider |

**:red_circle: CRITIQUE:** Cette page affiche des donnees GLOBALES aux prestataires. Devrait etre admin-only OU filtrer par activeProvider.

#### B. Dossiers.tsx (`/admin/dossiers`)

| # | Fonctionnalite | Type | Legitimite | Probleme |
|---|----------------|------|------------|----------|
| 36 | Lister dossiers (filtres par provider) | Vue | :white_check_mark: OK | Filtre OK si activeProvider |
| 37 | Rechercher par titre/client/pays | Filtre | :white_check_mark: OK | - |
| 38 | Filtrer par statut | Dropdown | :white_check_mark: OK | - |
| 39 | Filtrer par type | Dropdown | :white_check_mark: OK | - |
| 40 | Ouvrir detail dossier | Navigation | :white_check_mark: OK | - |
| 41 | Pagination (charger plus) | Action | :white_check_mark: OK | - |

:white_check_mark: Cette page est **correctement implementee** avec filtrage par activeProvider.

#### C. DossierDetail.tsx (`/admin/dossier/:id`)

| # | Fonctionnalite | Type | Legitimite | Probleme |
|---|----------------|------|------------|----------|
| 42 | Voir infos client | Vue | :white_check_mark: Presta | **FAILLE IDOR: pas de verif** |
| 43 | Voir historique chat IA | Vue | :white_check_mark: Presta | IDOR |
| 44 | Demarrer appel (pending→in_progress) | Bouton | :white_check_mark: Presta | IDOR |
| 45 | Terminer dossier (→completed) | Bouton | :white_check_mark: Presta | IDOR |
| 46 | Annuler dossier (→cancelled) | Bouton | :white_check_mark: Presta | IDOR |
| 47 | Reouvrir dossier (→in_progress) | Bouton | :white_check_mark: Presta | IDOR |
| 48 | Envoyer message a l'IA | Textarea | :white_check_mark: Presta | IDOR |
| 49 | Copier reponse IA | Bouton | :white_check_mark: Presta | - |

**:red_circle: CRITIQUE IDOR:** Aucune verification que `booking.providerId === activeProvider.id`. Un prestataire peut acceder a N'IMPORTE QUEL dossier par son ID.

#### D. Messages.tsx (`/admin/messages`)

| # | Fonctionnalite | Type | Legitimite | Probleme |
|---|----------------|------|------------|----------|
| 50 | Lister toutes les conversations | Vue | :x: **MAL PLACE** | TOUTES les conversations |
| 51 | Stats conversations/reponses IA | Vue | :x: **MAL PLACE** | Stats globales |
| 52 | Rechercher par client/booking | Filtre | :x: **MAL PLACE** | Recherche globale |
| 53 | Ouvrir conversation | Navigation | :white_check_mark: OK | - |

**:red_circle: CRITIQUE:** Affiche TOUTES les conversations de TOUS les prestataires. Donnees sensibles exposees.

#### E. MesPrestataires.tsx (`/admin/mes-prestataires`)

| # | Fonctionnalite | Type | Legitimite | Probleme |
|---|----------------|------|------------|----------|
| 54 | Lister ses prestataires lies | Vue | :white_check_mark: OK | - |
| 55 | Ajouter un prestataire | Modal | :white_check_mark: OK | Pas de verification droits |
| 56 | Retirer un prestataire | Bouton | :white_check_mark: OK | - |
| 57 | Definir prestataire actif | Bouton | :white_check_mark: OK | - |
| 58 | Rechercher prestataires disponibles | Input | :white_check_mark: OK | - |

:white_check_mark: Cette page est **correctement implementee** pour la gestion multi-comptes.

---

### 2.3 MATRICE DE SEPARATION FONCTIONNELLE

```
+================================+=========+=============+=============+
| FONCTIONNALITE                 | ACTUEL  | RECOMMANDE  | PRIORITE    |
+================================+=========+=============+=============+
| Stats GLOBALES plateforme      | Tous    | Admin ONLY  | :red_circle: P0        |
| Stats PROPRES au prestataire   | -       | Prestataire | :red_circle: P0        |
| Voir TOUS les dossiers         | Tous    | Admin ONLY  | :red_circle: P0        |
| Voir SES dossiers              | OK      | Prestataire | :white_check_mark:         |
| Detail dossier (avec verif)    | Tous    | Prestataire | :red_circle: P0        |
| TOUTES les conversations       | Tous    | Admin ONLY  | :red_circle: P0        |
| SES conversations              | -       | Prestataire | :red_circle: P0        |
| Gestion prestataires           | Admin   | Admin ONLY  | :white_check_mark:         |
| Gestion acces                  | Admin   | Admin ONLY  | :white_check_mark:         |
| Gestion utilisateurs           | Admin   | Admin ONLY  | :white_check_mark:         |
| Configuration IA               | Admin   | Admin ONLY  | :white_check_mark:         |
| Test IA                        | Tous?   | Admin ONLY  | :red_circle: P0        |
| Multi-comptes (switch)         | OK      | Prestataire | :white_check_mark:         |
+================================+=========+=============+=============+
```

---

## PARTIE 3: PROBLEMES CRITIQUES IDENTIFIES

### 3.1 FAILLES DE SECURITE

#### :red_circle: CRITIQUE-1: IDOR sur DossierDetail.tsx

**Description:** Un prestataire peut acceder a n'importe quel dossier par URL directe.

**Code problematique:**
```typescript
// src/admin/pages/DossierDetail.tsx (ligne 651-657)
const docRef = doc(db, "bookings", id);
const docSnap = await getDoc(docRef);
// PAS DE VERIFICATION: booking.providerId === activeProvider.id
```

**Impact:**
- Lecture donnees clients d'autres prestataires
- Modification du statut de dossiers non-autorises
- Envoi de messages sur dossiers non-autorises

**Mitigation Existante:** Firestore Rules bloquent (mais frontend devrait aussi verifier)

**Fix Recommande:**
```typescript
if (booking.providerId !== activeProvider?.id && !isAdmin) {
  navigate('/admin/dossiers');
  toast.error("Acces non autorise");
  return;
}
```

---

#### :red_circle: CRITIQUE-2: Dashboard affiche stats GLOBALES

**Description:** La page Dashboard affiche les statistiques de TOUS les dossiers/prestataires.

**Code problematique:**
```typescript
// src/admin/pages/Dashboard.tsx (ligne 172-186)
query(collection(db, "bookings"))  // PAS DE WHERE activeProvider
query(collection(db, "sos_profiles"))  // PAS DE FILTRE
```

**Impact:**
- Prestataire voit revenus de la plateforme entiere
- Prestataire voit nombre de concurrents
- Fuite de donnees commerciales sensibles

**Fix Recommande:**
```typescript
// Pour prestataires: filtrer par activeProvider
if (activeProvider?.id) {
  query(collection(db, "bookings"), where("providerId", "==", activeProvider.id))
} else if (isAdmin) {
  query(collection(db, "bookings"))  // Admin voit tout
}
```

---

#### :red_circle: CRITIQUE-3: Messages.tsx affiche TOUTES les conversations

**Description:** La page Messages affiche l'historique de TOUTES les conversations.

**Code problematique:**
```typescript
// src/admin/pages/Messages.tsx (ligne 158-162)
query(collection(db, "conversations"), orderBy("updatedAt", "desc"), limit(50))
// PAS DE where("providerId", "==", activeProvider.id)
```

**Impact:**
- Acces aux conversations clients/IA d'autres prestataires
- Donnees medicales/legales/personnelles exposees
- Violation potentielle RGPD

**Fix Recommande:**
```typescript
if (activeProvider?.id) {
  query(collection(db, "conversations"),
    where("providerId", "==", activeProvider.id),
    orderBy("updatedAt", "desc"),
    limit(50)
  )
}
```

---

#### :red_circle: CRITIQUE-4: TestIA.tsx accessible sans verification role

**Description:** La page de test IA est accessible a tous les utilisateurs connectes.

**Impact:**
- Cout API (OpenAI/Claude) non controle
- Exposition des metadata internes
- Pas de rate limiting

**Fix Recommande:**
```typescript
// Dans AppAdmin.tsx, envelopper la route
{isAdmin && <Route path="test-ia" element={<TestIA />} />}
```

---

### 3.2 PROBLEMES D'ARCHITECTURE

#### :warning: ARCHI-1: Pas de separation physique des interfaces

**Probleme:** Une seule interface avec navigation conditionnelle.

**Consequence:**
- Difficulte de maintenance
- Risque d'exposer des pages admin par erreur
- UX confuse (prestataire voit des pages vides ou erreurs)

**Recommandation:**
```
/admin/*        → Console Admin (isAdmin only)
/dashboard/*    → Espace Prestataire (isProvider only)
```

---

#### :warning: ARCHI-2: Pas d'audit logs

**Probleme:** Aucune trace des actions administratives.

**Actions non tracees:**
- Qui a active/desactive un prestataire ?
- Qui a change le role d'un utilisateur ?
- Qui a modifie les prompts IA ?
- Qui a accede a quel dossier ?

**Recommandation:** Collection `auditLogs` avec:
```typescript
{
  userId: string,
  action: "activate_provider" | "change_role" | "update_prompt" | ...,
  targetId: string,
  timestamp: Timestamp,
  details: object
}
```

---

#### :warning: ARCHI-3: Prompts IA sans versioning

**Probleme:** Modification des prompts systeme sans historique.

**Impact:**
- Impossible de rollback en cas de probleme
- Pas de test avant deploiement
- Impact immediat sur tous les clients

**Recommandation:**
```typescript
// Collection promptVersions
{
  type: "lawyer" | "expert",
  content: string,
  version: number,
  createdBy: string,
  createdAt: Timestamp,
  isActive: boolean
}
```

---

## PARTIE 4: ARCHITECTURE FONCTIONNELLE CIBLE

### 4.1 STRUCTURE RECOMMANDEE

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CONSOLE ADMINISTRATION                        │
│                         (/admin/*)                                   │
│                    isAdmin = true UNIQUEMENT                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │   UTILISATEURS   │  │   PRESTATAIRES   │  │   CONFIGURATION  │  │
│  │                  │  │                  │  │                  │  │
│  │ • Gestion equipe │  │ • Activation     │  │ • Parametres IA  │  │
│  │ • Roles (admin/  │  │ • Liaison users  │  │ • Prompts        │  │
│  │   agent)         │  │ • Ajout manuel   │  │ • Modele LLM     │  │
│  │ • Permissions    │  │ • Statistiques   │  │ • Pays           │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │    ANALYTICS     │  │    MODERATION    │  │      OUTILS      │  │
│  │                  │  │                  │  │                  │  │
│  │ • Stats globales │  │ • Tous dossiers  │  │ • Test IA        │  │
│  │ • Revenus        │  │ • Conversations  │  │ • Audit logs     │  │
│  │ • KPIs           │  │ • Support        │  │ • Maintenance    │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      ESPACE PRESTATAIRE                              │
│                       (/dashboard/*)                                 │
│                   isProvider = true + activeProvider                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ [SWITCHER] Prestataire actif: Cabinet Dupont ▼              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │   MON TABLEAU    │  │   MES DOSSIERS   │  │  MES MESSAGES    │  │
│  │   DE BORD        │  │                  │  │                  │  │
│  │                  │  │ • Liste filtree  │  │ • Conversations  │  │
│  │ • Mes stats      │  │ • Detail dossier │  │   (mes clients)  │  │
│  │ • Mes dossiers   │  │ • Chat IA        │  │ • Historique     │  │
│  │ • Mes revenus    │  │ • Actions        │  │                  │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐                        │
│  │  MON PROFIL      │  │ MES PRESTATAIRES │                        │
│  │                  │  │ (Multi-comptes)  │                        │
│  │ • Informations   │  │                  │                        │
│  │ • Specialites    │  │ • Ajouter compte │                        │
│  │ • Parametres     │  │ • Switch         │                        │
│  └──────────────────┘  └──────────────────┘                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 NAVIGATION RECOMMANDEE

#### Console Admin
```
/admin
├── /admin/dashboard      → Stats GLOBALES plateforme
├── /admin/utilisateurs   → Gestion equipe
├── /admin/prestataires   → Gestion acces prestataires
├── /admin/gestion-acces  → Liaison users/providers
├── /admin/dossiers       → TOUS les dossiers (moderation)
├── /admin/messages       → TOUTES les conversations (moderation)
├── /admin/parametres     → Configuration IA + Pays
├── /admin/audit          → [NOUVEAU] Logs d'audit
└── /admin/test-ia        → Test IA (debug)
```

#### Espace Prestataire
```
/dashboard
├── /dashboard            → MON tableau de bord (stats perso)
├── /dashboard/dossiers   → MES dossiers
├── /dashboard/dossier/:id → Detail dossier (avec verif providerId)
├── /dashboard/messages   → MES conversations
├── /dashboard/profil     → [NOUVEAU] Mon profil prestataire
└── /dashboard/comptes    → Gestion multi-comptes
```

### 4.3 REGLES DE SEPARATION

#### PRINCIPE 1: Isolation des Donnees
```
ADMIN voit:        TOUT (global)
PRESTATAIRE voit:  UNIQUEMENT ses donnees (activeProvider)
```

#### PRINCIPE 2: Actions Administratives
```
ADMIN peut:        Creer/modifier/supprimer utilisateurs, prestataires, config
PRESTATAIRE peut:  Gerer SES dossiers, SES messages, SON profil
```

#### PRINCIPE 3: Verification Double
```
1. Frontend: Verifier activeProvider.id === booking.providerId
2. Backend: Firestore Rules valident isAssignedProvider()
```

---

## PARTIE 5: PLAN D'ACTION PRIORISE

### PHASE 0: CORRECTIONS URGENTES (Semaine 1)

| # | Action | Fichier | Impact | Effort |
|---|--------|---------|--------|--------|
| 1 | Ajouter verif providerId dans DossierDetail | DossierDetail.tsx | :red_circle: Securite | 2h |
| 2 | Filtrer Dashboard par activeProvider | Dashboard.tsx | :red_circle: Securite | 3h |
| 3 | Filtrer Messages par activeProvider | Messages.tsx | :red_circle: Securite | 2h |
| 4 | Proteger TestIA avec verif isAdmin | AppAdmin.tsx | :red_circle: Securite | 30min |

### PHASE 1: SEPARATION INTERFACES (Semaines 2-3)

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 5 | Creer routes separees /dashboard/* | :warning: Architecture | 4h |
| 6 | Migrer pages prestataire vers /dashboard | :warning: Architecture | 8h |
| 7 | Ajouter middleware verif role par route | :warning: Securite | 4h |
| 8 | Creer Dashboard prestataire avec stats perso | :white_check_mark: UX | 6h |

### PHASE 2: AMELIORATIONS (Semaines 4-6)

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 9 | Implementer audit logs | :warning: Conformite | 8h |
| 10 | Ajouter versioning prompts IA | :warning: Securite | 6h |
| 11 | Creer page profil prestataire | :white_check_mark: UX | 4h |
| 12 | Ajouter confirmations actions critiques | :white_check_mark: UX | 3h |
| 13 | Implementer rate limiting frontend | :white_check_mark: Perf | 4h |

### PHASE 3: NOUVELLES FONCTIONNALITES (Mois 2-3)

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 14 | Dashboard analytics admin avance | :white_check_mark: Business | 16h |
| 15 | Notifications temps reel | :white_check_mark: UX | 12h |
| 16 | Export donnees prestataire | :white_check_mark: Conformite | 8h |
| 17 | Mode test prompts IA avant deploy | :warning: Securite | 8h |

---

## PARTIE 6: METRIQUES DE SUCCES

### KPIs Securite
- [ ] 0 IDOR possible (tous les acces verifies)
- [ ] 0 fuite de donnees entre prestataires
- [ ] 100% des actions admin tracees

### KPIs UX
- [ ] Temps de navigation vers fonctionnalite < 3 clics
- [ ] 0 page d'erreur "acces refuse" (navigation adaptee au role)
- [ ] Satisfaction prestataire > 4/5

### KPIs Architecture
- [ ] Separation claire /admin vs /dashboard
- [ ] Tests unitaires sur toutes les verifications de role
- [ ] Documentation a jour

---

## ANNEXES

### A. Liste Complete des Fichiers Analyses

| Fichier | Lignes | Problemes |
|---------|--------|-----------|
| src/admin/AppAdmin.tsx | 296 | Navigation conditionnelle correcte |
| src/admin/pages/Dashboard.tsx | ~200 | :red_circle: Pas de filtrage |
| src/admin/pages/Dossiers.tsx | ~450 | :white_check_mark: Filtrage OK |
| src/admin/pages/DossierDetail.tsx | ~850 | :red_circle: IDOR |
| src/admin/pages/Messages.tsx | ~350 | :red_circle: Pas de filtrage |
| src/admin/pages/Prestataires.tsx | ~400 | :warning: ID aleatoire |
| src/admin/pages/GestionAcces.tsx | ~350 | :warning: UID non valide |
| src/admin/pages/Utilisateurs.tsx | ~300 | :warning: Pas de protection self |
| src/admin/pages/pays.tsx | ~100 | READ-ONLY |
| src/admin/pages/Parametres.tsx | ~50 | Hub OK |
| src/admin/sections/AISettings.tsx | ~550 | :warning: Pas de versioning |
| src/admin/pages/MesPrestataires.tsx | ~200 | :white_check_mark: OK |
| src/admin/pages/TestIA.tsx | ~500 | :red_circle: Pas de verif role |
| src/contexts/AuthContext.tsx | ~250 | :white_check_mark: OK |
| src/contexts/ProviderContext.tsx | ~245 | :white_check_mark: OK |
| src/contexts/SubscriptionContext.tsx | ~200 | :white_check_mark: OK |
| firestore.rules | 279 | :white_check_mark: Solides |

### B. Glossaire

| Terme | Definition |
|-------|------------|
| **activeProvider** | Prestataire actuellement selectionne (multi-comptes) |
| **linkedProviderIds** | Liste des IDs prestataires lies a un utilisateur |
| **IDOR** | Insecure Direct Object Reference (acces non autorise par ID) |
| **Custom Claims** | Donnees JWT Firebase pour verification role |
| **isAdmin** | Boolean indiquant si l'utilisateur est administrateur |
| **isProvider** | Boolean indiquant si l'utilisateur est prestataire |
| **hasAllowedRole** | Boolean indiquant si le role est dans ALLOWED_ROLES |

---

**Rapport genere par:** Agent 0 - Architecte Fonctionnel en Chef
**Agents contributeurs:** Agent 2, Agent 7, Agent 12
**Date de generation:** 18 Decembre 2025
**Version:** 1.0
