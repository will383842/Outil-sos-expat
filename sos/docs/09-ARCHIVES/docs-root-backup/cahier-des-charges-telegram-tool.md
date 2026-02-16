# Cahier des Charges - Telegram Marketing Automation Tool

**Projet** : Outil de marketing automation Telegram standalone
**Version** : 5.2
**Date** : 2026-02-06
**Stack** : Laravel 11 + PostgreSQL 16 + Tailwind CSS + Livewire/Filament

---

## 1. Vision du Projet

### 1.1 Objectif
Plateforme SaaS standalone de marketing automation via Telegram, permettant de :
- Gérer des campagnes Telegram (broadcasts, séquences automatiques, chatbots)
- Poster sur des Channels et gérer des Groupes Telegram
- Suivre les conversions depuis les publicités Facebook/Google/TikTok
- Gérer des abonnés Telegram avec tags, segments et scoring
- Automatiser des séquences cross-canal (Telegram + Email combinés)
- Fournir un dashboard analytics complet par campagne
- Se connecter à n'importe quelle plateforme externe via API REST + SDKs
- Fournir des widgets embarquables pour n'importe quel site web

### 1.2 Positionnement
Outil **indépendant** de toute plateforme existante (SOS-Expat, Ulixai, etc.), raccordable via API REST sécurisée. Équivalent open-source/self-hosted de ManyChat ou Chatfuel, mais pour Telegram.

### 1.3 Stack Technique

**Backend & Infrastructure**
| Composant | Technologie |
|---|---|
| Backend | Laravel 11, PHP 8.3 |
| Base de données | PostgreSQL 16 |
| Queue/Jobs | Laravel Queue (Redis) |
| Scheduler | Laravel Task Scheduling |
| Cache | Redis |
| WebSockets / Temps réel | Laravel Reverb (natif Laravel 11) |
| API Auth | Laravel Sanctum (tokens API) |
| Bot Telegram | Telegram Bot API via webhook |
| Email transactionnel | Brevo / SendGrid (SMTP) |
| Paiements | Stripe (cartes, SEPA) + Telegram Stars |
| Hosting | VPS Hetzner |
| CI/CD | GitHub Actions |
| i18n | Laravel Localization (9 langues) |
| Monitoring | Laravel Pulse + Sentry |

**Frontend & UI**
| Composant | Technologie |
|---|---|
| Dashboard Admin | Filament 3 (TALL stack) |
| Dashboard Client | Livewire 3 + Alpine.js + Tailwind CSS 4 |
| Composants complexes | Vue 3 (SFC) embarqués via Livewire pour flow builder, éditeur, live chat |
| Flow Builder (séquences/chatbot) | Vue Flow (basé sur D3.js) embarqué |
| Éditeur de messages riche | Tiptap 2 (basé ProseMirror) |
| Graphiques / Charts | ApexCharts (via Laravel Charts ou standalone) |
| Calendrier | FullCalendar 6 |
| Drag & Drop | SortableJS (via Alpine plugin) |
| Icônes | Heroicons 2 + Lucide Icons |
| Animations | Alpine Transition + CSS Animations |
| PWA | Workbox 7 (service worker, cache, push notifications) |
| Tests E2E | Playwright |
| Tests composants | Pest + Laravel Dusk |

**Design System**
| Composant | Choix |
|---|---|
| Framework CSS | Tailwind CSS 4 |
| Couleur primaire | Indigo 600 (#4F46E5) |
| Couleur accent | Amber 500 (#F59E0B) |
| Couleur succès | Emerald 500 (#10B981) |
| Couleur danger | Rose 500 (#F43F5E) |
| Typographie | Inter (sans-serif) |
| Border radius | 12px (rounded-xl) — design moderne arrondi |
| Dark mode | Oui — Tailwind `dark:` classes (toggle user) |
| Direction RTL | Tailwind RTL plugin pour l'arabe |
| Spacing scale | Tailwind default (4px base) |
| Breakpoints | sm:640 md:768 lg:1024 xl:1280 2xl:1536 |

---

## 2. Rôles et Permissions

### 2.1 Rôles

| Rôle | Description | Accès | Facturation |
|---|---|---|---|
| **Super Admin** | Administrateur de la plateforme | Console d'administration complète | N/A |
| **Admin** | Co-administrateur | Console d'administration (droits configurables) | N/A |
| **Client** | Utilisateur payant | Dashboard client + API | Abonnement mensuel/annuel |
| **Ulixai** | Plateformes internes (SOS-Expat, Ulixai, etc.) | Dashboard client + API | Gratuit (forcé par admin) |
| **Viewer** | Lecture seule (membre d'équipe client) | Dashboard client (lecture seule) | Inclus dans l'abonnement du client |

### 2.2 Permissions granulaires (RBAC)

| Permission | Super Admin | Admin | Client | Ulixai | Viewer |
|---|---|---|---|---|---|
| Gérer utilisateurs plateforme | ✅ | ✅ | ❌ | ❌ | ❌ |
| Gérer plans/abonnements | ✅ | ✅ | ❌ | ❌ | ❌ |
| Forcer gratuit un compte | ✅ | ✅ | ❌ | ❌ | ❌ |
| Voir analytics globales | ✅ | ✅ | ❌ | ❌ | ❌ |
| Gérer ses bots Telegram | ❌ | ❌ | ✅ | ✅ | ❌ |
| Créer/gérer campagnes | ❌ | ❌ | ✅ | ✅ | ❌ |
| Gérer abonnés | ❌ | ❌ | ✅ | ✅ | ❌ |
| Voir dashboard client | ❌ | ❌ | ✅ | ✅ | ✅ |
| Exporter données | ❌ | ❌ | ✅ | ✅ | ❌ |
| Gérer équipe (inviter viewers) | ❌ | ❌ | ✅ | ✅ | ❌ |
| Accès API | ❌ | ❌ | ✅ | ✅ | ❌ |

---

## 3. Système d'Abonnement et Facturation

### 3.1 Plans

| Fonctionnalité | Free | Starter | Pro | Enterprise |
|---|---|---|---|---|
| Prix mensuel | 0€ | 19€/mois | 49€/mois | 149€/mois |
| Prix annuel | 0€ | 190€/an (-17%) | 490€/an (-17%) | 1 490€/an (-17%) |
| Bots Telegram | 1 | 2 | 5 | Illimité |
| Abonnés max | 500 | 5 000 | 25 000 | Illimité |
| Messages/mois | 1 000 | 20 000 | 100 000 | Illimité |
| Campagnes actives | 3 | 15 | 50 | Illimité |
| Séquences automatiques | 1 | 5 | 20 | Illimité |
| Chatbot flows | ❌ | 3 | 15 | Illimité |
| Membres d'équipe | 1 | 3 | 10 | Illimité |
| API REST | ❌ | ✅ | ✅ | ✅ |
| Webhooks sortants | ❌ | 5 | 20 | Illimité |
| A/B Testing | ❌ | ❌ | ✅ | ✅ |
| Analytics avancées | ❌ | Basique | Complet | Complet + export |
| Support | Communauté | Email | Prioritaire | Dédié |
| Custom branding | ❌ | ❌ | ❌ | ✅ |
| Domaine personnalisé deep links | ❌ | ❌ | ✅ | ✅ |

### 3.2 Facturation

- **Moyens de paiement** : Stripe (CB, SEPA)
- **Devises supportées** : EUR, USD, GBP, CHF, XOF (FCFA), XAF (FCFA), MAD, CAD, AUD, BRL, RUB, INR, CNY (13 devises — voir §18)
- **Conversion automatique** : taux de change mis à jour quotidiennement
- **Affichage** : prix dans la devise préférée de l'utilisateur
- **Essai gratuit** : 14 jours sur plan Starter (sans CB requise)
- **Upgrade/Downgrade** : prorata calculé automatiquement
- **Factures** : génération PDF automatique, numérotation séquentielle
- **Relances** : email automatique à J-3, J-1, J0 (échéance), J+3 (impayé)
- **Suspension** : compte suspendu après 7 jours d'impayé (données conservées 30 jours)
- **UX compte suspendu** :
  - Le client est redirigé vers une **page dédiée "Compte suspendu"** à chaque connexion
  - Message clair : "Votre abonnement est inactif depuis le [date]. Vos données seront supprimées le [date + 30j]."
  - Actions disponibles : mettre à jour le moyen de paiement, régler l'impayé, contacter le support, exporter ses données
  - Accès lecture seule au dashboard (consultation des stats et abonnés, mais pas d'envoi)
  - Aucune campagne ne peut être lancée, aucune séquence ne tourne, le bot ne répond plus
  - Après paiement : réactivation automatique immédiate + email de confirmation + bot réactivé

### 3.3 Admin : Forcer Gratuit

- L'admin peut **forcer n'importe quel plan gratuitement** sur un compte
- Champ `forced_plan` : null (normal) ou nom du plan forcé
- Champ `forced_plan_reason` : raison (ex: "Plateforme interne Ulixai")
- Champ `forced_plan_expires_at` : date d'expiration (null = permanent)
- Les comptes Ulixai sont automatiquement créés avec `forced_plan = enterprise`
- Badge visible dans le dashboard admin : "Plan forcé : Enterprise (Ulixai)"

### 3.4 Programme de Parrainage Client → Client

- **Concept** : un client existant invite un autre professionnel → les deux reçoivent un avantage
- **Mécanique** :
  - Chaque client a un **lien de parrainage unique** dans son dashboard (section Paramètres)
  - Le filleul s'inscrit via ce lien → le parrain est identifié automatiquement
  - **Récompense parrain** : 1 mois gratuit sur son plan actuel (ou crédit équivalent)
  - **Récompense filleul** : 30 jours d'essai au lieu de 14 (ou 20% de réduction sur le 1er mois)
  - Cumulable : pas de limite de parrainages (un client peut parrainer 50 personnes)
- **Dashboard parrainage** (dans les paramètres client) :
  - Nombre de filleuls invités / inscrits / convertis (payants)
  - Crédits gagnés et utilisés
  - Lien de parrainage copiable + partage social (Twitter, LinkedIn, Telegram, email)
- **Admin** :
  - Vue globale des parrainages (§4.6 BI)
  - Configurer les récompenses (montant, durée, conditions)
  - Désactiver le programme si nécessaire
  - Anti-fraude : détection de comptes multiples (même IP, même email domain)

---

## 4. Console d'Administration (Super Admin / Admin)

### 4.1 Dashboard Admin Global

- **KPIs principaux** :
  - Nombre total d'utilisateurs (actifs, inactifs, suspendus)
  - MRR (Monthly Recurring Revenue)
  - ARR (Annual Recurring Revenue)
  - Churn rate (mensuel)
  - Nombre total de bots connectés
  - Nombre total d'abonnés Telegram gérés
  - Nombre total de messages envoyés (aujourd'hui, ce mois, total)
  - Nombre de campagnes actives
- **Graphiques** :
  - Courbe de revenus (MRR) sur 12 mois
  - Courbe d'inscriptions par jour/semaine/mois
  - Répartition des plans (camembert)
  - Top 10 clients par volume de messages
  - Messages envoyés par jour (barres)

### 4.2 Gestion des Utilisateurs

- **Liste des utilisateurs** avec filtres :
  - Par rôle (admin, client, ulixai, viewer)
  - Par plan (free, starter, pro, enterprise, forcé)
  - Par statut (actif, suspendu, en essai, expiré)
  - Par date d'inscription
  - Par volume d'utilisation
- **Fiche utilisateur détaillée** :
  - Informations personnelles
  - Plan actuel et historique des plans
  - Facturation et paiements
  - Bots connectés
  - Nombre d'abonnés
  - Volume de messages envoyés
  - Dernière activité
  - Logs d'audit
- **Actions admin** :
  - Modifier le rôle
  - Forcer un plan gratuitement
  - Suspendre / réactiver le compte
  - Réinitialiser le mot de passe
  - Se connecter en tant que (impersonate)
  - Supprimer le compte (soft delete)
  - Envoyer un email au client

### 4.3 Gestion des Plans, Tarifs & Abonnements

**CRUD complet sur les plans** :
- Nom, slug, description courte et longue
- Prix mensuel et annuel **par devise** (13 devises — matrice prix × devise éditable)
- Limites configurables par plan :

| Limite | Configurable |
|---|---|
| Nombre de bots | ✅ (nombre ou illimité) |
| Nombre d'abonnés max | ✅ |
| Messages par mois | ✅ |
| Campagnes actives simultanées | ✅ |
| Séquences automatiques | ✅ |
| Chatbot flows | ✅ |
| Membres d'équipe | ✅ |
| Workspaces | ✅ |
| Webhooks sortants | ✅ |
| Stockage media (MB/GB) | ✅ |
| Rate limit API (req/min) | ✅ |

- Features activées/désactivées par plan (toggle) : API REST, A/B Testing, analytics avancées, export, custom branding, white label, domaine custom
- Visibilité : public (affiché sur la page tarifs), caché (uniquement accessible via lien direct), réservé admin (attribuable uniquement par un admin)
- Ordre d'affichage sur la page tarifs
- Badge "Populaire" / "Recommandé" configurable
- Période d'essai : durée configurable par plan (0 = pas d'essai, 7, 14, 30 jours)

**Historique des prix & Grandfathering** :
- Chaque modification de prix est historisée (ancien prix, nouveau prix, date, admin qui a modifié)
- **Grandfathering** : quand un prix augmente, 3 options :
  - Appliquer immédiatement à tous les clients (au prochain renouvellement)
  - Grandfathering : les clients existants gardent l'ancien prix jusqu'à ce qu'ils changent de plan
  - Transition progressive : ancien prix pendant X mois puis nouveau prix
- Notification automatique aux clients concernés par un changement de prix (email + in-app, 30 jours avant)
- Log d'audit : qui a changé quel prix, quand, avec quelle politique de grandfathering

**Gestion des abonnements individuels** :
- **Vue par client** : plan actuel, date de début, date de renouvellement, montant, devise, moyen de paiement
- **Actions admin sur un abonnement** :
  - Changer le plan d'un client (upgrade/downgrade) avec prorata ou non
  - Annuler l'abonnement d'un client (avec raison)
  - Prolonger un essai gratuit (ex: +7 jours)
  - Forcer un plan gratuit (§3.3)
  - Appliquer un crédit (ex: compensation suite à un incident)
  - Appliquer une réduction permanente (ex: -20% à vie pour un partenaire)
  - Mettre en pause l'abonnement (gel temporaire, 1 mois max)
- **Historique par client** : tous les changements de plan, paiements, crédits, remboursements

**Remboursements et crédits** :
- **Remboursement** via Stripe :
  - Remboursement total ou partiel
  - Raison obligatoire (incident technique, insatisfaction, erreur de facturation, etc.)
  - Notification automatique au client (email de confirmation)
  - Impact sur le plan : le remboursement ne suspend pas automatiquement le plan (configurable)
- **Crédits** :
  - Crédit en devise (ex: 10€ de crédit appliqué au prochain paiement)
  - Crédit en durée (ex: 7 jours gratuits ajoutés)
  - Raison documentée
  - Visible par le client dans sa section Facturation (§5.2)
- **Avoir** : génération d'un avoir PDF (note de crédit) pour la comptabilité

**TVA / Taxes** :
- **Configuration par pays** :
  - Taux de TVA par pays (ex: France 20%, Allemagne 19%, USA 0%, Maroc 20%)
  - Exonération : entreprises avec numéro de TVA intracommunautaire (vérification VIES automatique)
  - Reverse charge pour les clients B2B UE (hors pays du vendeur)
- **Affichage** :
  - Prix HT ou TTC selon la cible (B2B = HT, B2C = TTC)
  - TVA clairement indiquée sur les factures
- **Factures** :
  - Conformes aux obligations légales (numérotation séquentielle, mentions obligatoires)
  - Téléchargeables en PDF par le client et par l'admin
  - Envoyées automatiquement par email à chaque paiement
  - Rectificatives en cas de remboursement/avoir

**Add-ons payants (extras au-delà du plan)** :
- Pour les clients qui veulent plus que ce que leur plan offre sans changer de plan :
  - **Pack abonnés supplémentaires** : +5 000 abonnés pour X€/mois
  - **Pack messages supplémentaires** : +50 000 messages pour X€/mois
  - **Pack stockage supplémentaire** : +10 GB pour X€/mois
  - **Workspace supplémentaire** : +1 workspace pour X€/mois
- Add-ons configurables par l'admin (nom, prix par devise, quantité fournie)
- Facturation : ajouté au prochain cycle de facturation
- Visible dans la section Facturation du client (§5.2)

**Coupons et promotions** :
- Code promo avec **% ou montant fixe** de réduction
- Durée : limité dans le temps (date de début/fin) ou permanent
- Nombre d'utilisations max (total et par client)
- Applicable à un ou plusieurs plans (et/ou à des add-ons)
- Restriction : première facture uniquement, ou toutes les factures, ou X premiers mois
- Code unique ou générique (ex: `WELCOME20` pour tous vs `VIP-JEAN-50` pour un client)
- Dashboard : liste des coupons (actifs, expirés, utilisés), utilisation par coupon
- Anti-abus : un coupon ne peut pas être combiné avec un autre (sauf config admin)

**Gestion des devises** :
- Taux de change : mis à jour automatiquement via API (exchangeratesapi.io ou similaire) ou manuellement par l'admin
- Fréquence de mise à jour automatique : quotidienne
- Devise par défaut par pays (mapping pays → devise)
- Override : l'admin peut fixer un taux de change manuellement pour une devise
- Arrondi : selon les conventions de la devise (0 décimales FCFA, 2 décimales EUR, etc.)

**Tableau de bord des paiements (admin)** :
- **Paiements récents** : liste paginée (client, montant, devise, statut, date, moyen de paiement)
- **Filtres** : par statut (réussi, échoué, remboursé, en attente), par plan, par devise, par période
- **Paiements échoués** : liste dédiée avec raison d'échec (carte expirée, fonds insuffisants, etc.)
  - Action : relancer le paiement, contacter le client, suspendre le compte
- **Stripe Dashboard intégré** : lien direct vers le client Stripe pour les cas complexes
- **Réconciliation** :
  - Webhook Stripe : `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`
  - Chaque événement Stripe est loggé et réconcilié avec notre base
  - Alerte si un paiement Stripe n'a pas de correspondance locale (incohérence)
- **Export comptable** : export CSV/XLSX des paiements par période (pour le comptable)

### 4.4 Monitoring Technique

- **Santé du système** :
  - Status des queues Laravel (pending, processing, failed jobs)
  - Status Redis
  - Status PostgreSQL (connexions, taille DB)
  - Latence webhook Telegram
  - Taux d'erreur API
- **Logs** :
  - Logs applicatifs (erreurs, warnings)
  - Logs de sécurité (tentatives de connexion, IP suspectes)
  - Logs d'audit (qui a fait quoi, quand)
- **Jobs en échec** :
  - Liste des jobs failed avec détails
  - Retry individuel ou en masse
  - Purge des anciens jobs

### 4.5 Paramètres Globaux

- Configuration SMTP (email transactionnel)
- Clés API Stripe
- Templates d'emails système (bienvenue, relance, suspension, etc.)
- Personnalisation de la plateforme (nom, logo, couleurs, favicon)
- Maintenance mode (message personnalisé)
- Feature flags (activer/désactiver des fonctionnalités)
- CGV, politique de confidentialité, mentions légales

### 4.6 Business Intelligence Propriétaire (Super Admin)

En tant que **propriétaires de la plateforme**, nous avons accès à TOUTES les données de TOUS les clients. Cette section concerne les outils d'analyse business réservés aux Super Admins.

**Dashboard BI Global** :
- **Revenus** :
  - MRR (Monthly Recurring Revenue) avec courbe d'évolution
  - ARR (Annual Recurring Revenue)
  - Revenu par plan (camembert : Free / Starter / Pro / Enterprise)
  - Revenu par devise (répartition géographique)
  - ARPU (Average Revenue Per User)
  - LTV (Lifetime Value) moyen par plan
  - Prévision de revenus (tendance linéaire sur 6/12 mois)
- **Clients** :
  - Total clients actifs / inactifs / suspendus / en essai
  - Taux de conversion essai → payant
  - Churn rate mensuel/annuel (avec courbe d'évolution)
  - Cohortes : rétention par mois d'inscription
  - Clients à risque de churn (inactifs depuis X jours, usage en baisse)
  - Top 20 clients par volume (messages, abonnés, revenus)
  - Distribution des clients par plan (histogramme)
  - Clients par pays/langue (carte géographique)
- **Usage plateforme** :
  - Total messages envoyés (aujourd'hui / ce mois / total historique)
  - Total abonnés Telegram gérés (tous clients confondus)
  - Total bots connectés
  - Total campagnes envoyées
  - Heures de pointe (quand la plateforme est la plus sollicitée)
  - Top sources d'acquisition des abonnés (agrégé cross-clients, anonymisé)

**Vue Globale des Subscribers (cross-clients)** :
- Nombre total de subscribers sur la plateforme
- Croissance quotidienne/hebdomadaire/mensuelle (tous clients)
- Répartition par langue (quelles langues dominent)
- Répartition par source (Facebook, Google, organique, widget, QR code)
- Taux d'engagement global (moyenne cross-clients)
- **Note** : les données sont consultables en agrégé ou par client spécifique (via impersonate)

**Alertes Business Automatiques** :
- Client qui dépasse 90% de son quota → opportunité d'upgrade
- Client inactif depuis 14 jours → risque de churn
- Client dont le paiement a échoué → relance
- Pic d'inscriptions anormal → vérifier si spam/abus
- Client qui envoie un volume inhabituel → vérifier ToS Telegram
- Revenue qui baisse de >10% sur le mois → alerte immédiate

**Export & Reporting Admin** :
- Export CSV/XLSX de toutes les données (clients, revenus, usage)
- Rapport mensuel automatique (envoyé par email aux Super Admins)
- Dashboard imprimable / PDF pour les réunions

### 4.7 Anti-Abus & Modération Plateforme

En tant que propriétaires, nous devons pouvoir détecter et gérer les abus des clients sur la plateforme.

**Détection automatique** :
- **Monitoring du contenu** : scan basique des messages envoyés (mots interdits configurables, liens suspects, patterns de spam)
- **Alertes comportementales** :
  - Client qui envoie un volume anormalement élevé (spike > 300% de la moyenne)
  - Taux de block abonnés > 10% sur une campagne → alerte immédiate
  - Client qui crée des centaines de deep links en peu de temps (bot scraping)
  - Envoi massif la nuit (heures inhabituelles pour la timezone du client)
- **Score de risque** par client (0-100) :
  - Basé sur : taux de block, plaintes, volume, ancienneté, plan
  - Tableau de bord : clients triés par score de risque décroissant
  - Seuil configurable : score > 70 → alerte, score > 90 → suspension automatique

**Politique d'utilisation acceptable (AUP)** :
- Document affiché à l'inscription (acceptation obligatoire)
- Interdit : spam, contenu illégal, phishing, harcèlement, vente de données
- Référence aux ToS Telegram (respect obligatoire)

**Workflow de modération** :
1. **Détection** : automatique (alertes) ou manuelle (signalement)
2. **Avertissement** : email au client + notification in-app avec la raison
3. **Limitation** : réduction temporaire des quotas (ex: 10 msg/jour pendant 48h)
4. **Suspension** : compte gelé, campagnes stoppées, accès lecture seule
5. **Suppression** : soft delete du compte (données conservées 30 jours pour litige)

**Logs de modération** :
- Historique de toutes les actions de modération (avertissement, limitation, suspension)
- Raison documentée pour chaque action
- Communication avec le client (emails de modération conservés)
- Appels/réclamations : le client peut contester via un formulaire

---

## 5. Dashboard Client (Client / Ulixai / Viewer)

### 5.1 Vue d'ensemble (Home)

- **KPIs** :
  - Total abonnés Telegram (actifs, inactifs, bloqués)
  - Croissance des abonnés (courbe 30 jours)
  - Messages envoyés ce mois (vs quota du plan)
  - Taux de réponse moyen (Telegram ne supporte pas le tracking d'ouverture)
  - Taux de clic moyen (liens trackés)
  - Campagnes actives
  - Prochaine campagne programmée
  - Dernière activité du bot
- **Activité récente** :
  - Fil des derniers événements (nouvel abonné, message envoyé, campagne terminée, etc.)
- **Actions rapides** :
  - Nouveau broadcast
  - Nouvelle séquence
  - Voir les abonnés
  - Paramètres du bot

### 5.2 Gestion du Plan / Facturation

- Plan actuel avec utilisation (jauges visuelles)
- Historique des factures (téléchargement PDF)
- Changer de plan (upgrade/downgrade)
- Modifier le moyen de paiement
- Appliquer un code promo
- Annuler l'abonnement

### 5.3 Vues Visuelles Intuitives

**Vue Pipeline Campagnes (Kanban drag & drop)** :
- Colonnes : Brouillon → Programmée → En cours → Terminée → Annulée
- Chaque campagne = une carte avec : nom, audience, date, mini-stats
- Drag & drop entre colonnes (ex: passer un brouillon en programmé)
- Clic sur une carte = détail complet + stats
- Filtres : par bot, par période, par tag audience

**Cartes de Campagne (vue détaillée rapide)** :
- Barre de progression visuelle (ex: ████████░░░░ 78% envoyé)
- Indicateurs inline : messages délivrés, clics (CTR%), réponses, blocks
- Boutons d'action rapide : Voir détail, Pause, Cloner
- Code couleur : vert (bon CTR), orange (moyen), rouge (problème)

**Vue Funnel par Campagne** :
- Barres horizontales décroissantes :
  - Envoyés → Délivrés → Cliqués → Réponses → Conversions
- Pourcentage et nombre à chaque étape
- Comparaison avec la moyenne des campagnes précédentes

**Radar d'Engagement (cercles concentriques)** :
- Centre = abonnés brûlants (score 76-100)
- 2e cercle = chauds (51-75)
- 3e cercle = tièdes (26-50)
- Extérieur = froids (0-25)
- Clic sur un cercle = liste filtrée des abonnés de ce niveau
- Permet de voir d'un coup d'œil la "santé" de la base d'abonnés

**Heatmap Horaire (carte de chaleur)** :
- Grille 7 jours × 24 heures
- Intensité de couleur = activité des abonnés (clics, réponses)
- Permet d'identifier les meilleurs créneaux d'envoi
- Suggestion automatique : "Vos abonnés sont les plus actifs le mardi à 18h"

**Calendrier Visuel (FullCalendar)** :
- Vue jour / semaine / mois
- Chaque campagne programmée = un bloc coloré (couleur par statut)
- Drag to reschedule : déplacer une campagne pour changer la date
- Clic = popup avec détail de la campagne
- Vue condensée du nombre de messages prévus par jour (éviter la surcharge)

**Timeline Temps Réel** :
- Fil vertical des événements en live (WebSocket) :
  - "Marie vient de s'abonner (via Facebook)" — il y a 2 min
  - "Campagne Promo Été : 5 000/10 000 envoyés" — il y a 5 min
  - "Pierre a cliqué sur le lien Offre VIP" — il y a 8 min
- Filtrable par type d'événement
- Auto-scroll avec pause au survol

### 5.4 Paramètres & Profil Client

**Profil personnel** :
- Modifier nom, prénom, avatar (upload photo)
- Modifier email (avec re-vérification)
- Modifier mot de passe (ancien + nouveau + confirmation)
- Fuseau horaire (dropdown avec détection automatique)
- Langue de l'interface (9 langues)
- Devise préférée (13 devises)

**Sécurité** :
- Activer / désactiver 2FA (TOTP avec QR code)
- Sessions actives : liste des appareils connectés (IP, navigateur, date)
- Révoquer une session individuelle ou toutes
- Historique des connexions (30 derniers jours)

**Notifications** :
- Tableau de préférences (par type de notification × par canal) :

| Notification | In-App | Email | Telegram |
|---|---|---|---|
| Campagne terminée | ✅/❌ | ✅/❌ | ✅/❌ |
| Nouveau subscriber | ✅/❌ | ✅/❌ | ✅/❌ |
| Quota proche de la limite | ✅/❌ | ✅/❌ | ✅/❌ |
| Paiement réussi/échoué | ✅/❌ | ✅/❌ | ✅/❌ |
| Rapport hebdo/mensuel | — | ✅/❌ | ✅/❌ |
| Erreur webhook | ✅/❌ | ✅/❌ | ✅/❌ |

- Connecter son Telegram personnel pour recevoir les alertes (deep link dédié)

**Gestion des Tokens API** :
- Créer un token (nom descriptif + scopes : read, write, admin)
- Liste des tokens actifs (date de création, dernière utilisation, scopes)
- Révoquer un token individuel
- Copier le token (affiché une seule fois à la création)
- Limite de tokens par plan (Starter: 2, Pro: 10, Enterprise: illimité)

**Parrainage** :
- Lien de parrainage unique (copiable)
- Statistiques : invités / inscrits / convertis / crédits gagnés
- Partage : boutons Twitter, LinkedIn, Telegram, email

**Danger Zone** :
- Exporter toutes mes données (RGPD — export complet en JSON/ZIP)
- Supprimer mon compte (confirmation par email + délai de 7 jours pour annuler)
- Conséquences affichées clairement : "Vos bots, abonnés, campagnes et données seront supprimés définitivement"

### 5.5 Support Client & Help Center

**Centre d'aide (Knowledge Base)** :
- Articles organisés par catégorie : Démarrage, Bots, Campagnes, Séquences, API, Facturation, Sécurité
- Barre de recherche full-text
- Articles en 9 langues (FR + EN prioritaires, autres progressivement)
- Éditeur Markdown côté admin (Filament) pour gérer les articles
- Suggestions contextuelles : "Besoin d'aide ?" → articles liés à la page actuelle
- Vidéos tutoriels intégrées (YouTube ou auto-hébergé)

**Système de Tickets** :
- Formulaire de contact : sujet, catégorie, description, pièces jointes (screenshots)
- Priorité automatique selon le plan :
  - Free / Starter : priorité normale (réponse sous 48h)
  - Pro : priorité haute (réponse sous 24h)
  - Enterprise : priorité critique (réponse sous 4h)
- Suivi : numéro de ticket, statut (ouvert, en cours, résolu, fermé)
- Historique : tous les tickets passés consultables par le client
- Notification : email + in-app quand une réponse est postée

**Chat in-app** (Pro et Enterprise uniquement) :
- Widget de chat en bas à droite du dashboard
- Horaires : lundi-vendredi 9h-18h (CET)
- Hors horaires : le message est converti en ticket
- Indicateur : "En ligne" / "Hors ligne"

**Côté Admin (gestion des tickets)** :
- Boîte de réception des tickets (Filament)
- Filtres : par statut, priorité, plan du client, catégorie
- Assignation à un admin
- Réponses types (templates de réponses fréquentes)
- Notes internes (invisibles pour le client)
- Métriques : temps moyen de réponse, satisfaction client, volume par catégorie

**Status Page** :
- Page publique `status.tool.com` (ou `/status`)
- Composants monitorés : API, Dashboard, Webhooks Telegram, Emails, Paiements
- Statut en temps réel : ✅ Opérationnel / ⚠️ Dégradé / ❌ Panne
- Historique des incidents (30 derniers jours)
- Abonnement aux alertes : email ou Telegram (pour les clients qui veulent être notifiés)
- Maintenance programmée : annonce à l'avance avec date et durée estimée

**Changelog & Nouveautés** :
- Page `/changelog` accessible depuis le footer et le dashboard
- Chaque entrée : date, titre, description, catégorie (nouvelle fonctionnalité / amélioration / correction)
- Badge "Nouveau" dans le dashboard quand une mise à jour est disponible
- Notification in-app optionnelle pour les nouvelles fonctionnalités majeures
- Newsletter produit : opt-in pour recevoir les nouveautés par email (mensuel)

### 5.6 Feedback & Roadmap Publique

**Tableau de suggestions (Feature Requests)** :
- Page `/feedback` accessible depuis le dashboard (lien dans le menu aide / footer)
- Le client peut **soumettre une idée** : titre + description + catégorie (nouvelle fonctionnalité, amélioration, intégration)
- Le client peut **voter** pour les idées des autres (upvote, 1 vote par idée)
- **Tri** : par nombre de votes, par date, par statut
- **Statuts** : Proposée → En étude → Planifiée → En développement → Livrée → Refusée (avec raison)
- Les clients sont **notifiés** quand une idée qu'ils ont votée change de statut

**Roadmap publique** :
- Page `/roadmap` visible par tous (clients connectés et visiteurs)
- 3 colonnes : **Planifié** (ce qu'on va faire) → **En cours** (ce qu'on développe) → **Livré** (ce qu'on a sorti récemment)
- Chaque item = lien vers l'idée d'origine (feedback) si applicable
- Pas de dates précises (éviter les engagements) → juste trimestre (Q1, Q2, etc.)

**Côté Admin** :
- Gestion des feedbacks : modérer, fusionner les doublons, changer le statut, répondre
- Statistiques : idées les plus votées, catégories les plus demandées
- Insight : comprendre ce que les clients veulent le plus pour prioriser le développement

---

## 6. Onboarding & Expérience Utilisateur (UX)

### 6.1 Wizard de Démarrage (Première Connexion)

Le client doit pouvoir envoyer sa **première campagne en moins de 10 minutes** :

**Étape 1 — Bienvenue** (30 sec)
- "Bienvenue ! Configurons votre premier bot Telegram en 5 étapes."
- Barre de progression visuelle (1/5, 2/5...)

**Étape 2 — Connecter un Bot** (2 min)
- Tutoriel interactif : "Ouvrez @BotFather sur Telegram → /newbot → Copiez le token ici"
- Vidéo inline de 30 secondes montrant la procédure
- Validation automatique du token en temps réel
- Message de succès avec preview du bot (nom, photo, username)

**Étape 3 — Importer ou Obtenir des Abonnés** (1 min)
- Option A : "J'ai déjà des abonnés" → import CSV
- Option B : "Je démarre de zéro" → générer un deep link + QR code + widget
- Option C : "Passer cette étape"

**Étape 4 — Créer un Message de Bienvenue** (2 min)
- Template pré-rempli personnalisable
- Preview device en temps réel (mockup iPhone)
- "Testez-le sur vous-même" → envoyer le message sur son propre Telegram

**Étape 5 — Première Campagne** (3 min)
- Template de campagne pré-rempli
- Choix rapide : texte seul, image + texte, ou vidéo + texte
- Preview device
- Bouton "Envoyer maintenant" ou "Programmer"

**Résultat** : après le wizard, le client a un bot connecté, un message de bienvenue, et sa première campagne envoyée ou programmée.

### 6.2 Dashboard "Aujourd'hui" (Page d'Accueil Client)

Au lieu d'un dashboard classique avec plein de graphiques, la page d'accueil montre :

- **Actions urgentes** (bandeau rouge/orange) :
  - "3 campagnes terminées à analyser"
  - "Votre quota messages est à 85%"
  - "12 abonnés inactifs depuis 30 jours"
- **Résumé rapide** (cartes) :
  - Nouveaux abonnés aujourd'hui
  - Messages envoyés aujourd'hui
  - Clics aujourd'hui
  - Prochaine campagne programmée
- **Actions rapides** (boutons) :
  - "Nouveau broadcast" (1 clic)
  - "Voir mes abonnés"
  - "Créer une séquence"
- **Activité récente** (timeline) :
  - Derniers événements en temps réel

### 6.3 Templates Prêts à l'Emploi

**Templates de Campagnes** (le client clique et adapte) :
- "Annonce produit" : image + texte + bouton CTA
- "Promotion flash" : timer + code promo + bouton
- "Newsletter hebdo" : sections + liens
- "Sondage/Feedback" : poll intégré
- "Invitation événement" : date + lieu + bouton inscription
- "Relance panier" : rappel + bouton retour
- "Message de bienvenue" : salutation + présentation + CTA

**Templates de Séquences** :
- "Onboarding nouveau client" (J+0 → J+30)
- "Nurturing lead froid" (J+0 → J+14)
- "Re-engagement inactif" (J+30 → J+45)
- "Lancement produit" (J-7 → J+3)
- "Post-achat" (J+0 → J+7)

Chaque template est disponible dans les **9 langues** de la plateforme.

### 6.4 Preview Device (Aperçu Réaliste)

- **Mockup Telegram** : aperçu fidèle du message tel qu'il apparaîtra dans l'app
- **3 modes** : iPhone, Android, Desktop
- **Temps réel** : mise à jour en live pendant l'édition
- **Test sur soi** : bouton "M'envoyer un test" (le client reçoit le message sur son propre Telegram)
- **Partager le preview** : lien de partage pour validation par un collègue

### 6.5 Sécurité des Envois

- **Confirmation avant envoi** : popup récapitulatif (nombre de destinataires, message, heure)
- **Undo / Annulation rapide** :
  - Après clic "Envoyer", délai de **30 secondes** avant le début réel de l'envoi
  - Bouton "Annuler" visible pendant ce délai
  - Si la campagne est déjà en cours, bouton "Pause" pour stopper l'envoi
  - Les messages déjà envoyés ne peuvent pas être rappelés (limitation Telegram)
- **Envoi de test obligatoire** : option pour forcer un envoi test avant tout broadcast > 1000 destinataires
- **Historique des envois** : qui a lancé quelle campagne, quand, avec quel contenu

### 6.6 Dashboard Mobile (PWA)

- **Responsive** : le dashboard client fonctionne sur mobile (Tailwind responsive)
- **PWA** : installable comme une app (manifest.json, service worker)
- **Fonctionnalités mobile** :
  - Voir les stats en temps réel
  - Recevoir des notifications push (campagne terminée, alerte quota, etc.)
  - Lancer un broadcast rapide (texte simple)
  - Voir les derniers abonnés
  - Pauser/annuler une campagne en cours
- **Hors-ligne** : affichage des dernières données en cache

---

## 7. Architecture Frontend & Design System

### 7.1 Approche Technique Frontend

**Stratégie hybride** : Livewire 3 pour 80% des pages (CRUD, dashboards, formulaires) + composants Vue 3 embarqués pour les fonctionnalités complexes nécessitant une interactivité poussée.

| Page / Fonctionnalité | Technologie | Raison |
|---|---|---|
| Dashboard home, listes, filtres | Livewire 3 + Alpine.js | CRUD standard, réactivité suffisante |
| Formulaires (campagne, bot, profil) | Livewire 3 | Validation serveur, soumission |
| Flow Builder séquences | **Vue 3 + Vue Flow** | Éditeur de nœuds drag & drop complexe |
| Flow Builder chatbot | **Vue 3 + Vue Flow** | Même éditeur, blocs différents |
| Éditeur de message riche | **Tiptap 2** (dans Livewire) | WYSIWYG avec Markdown, variables, boutons inline |
| Preview device (mockup Telegram) | **Vue 3 composant** | Rendu temps réel synchronisé avec l'éditeur |
| Live Chat inbox | **Vue 3 + Laravel Echo** | WebSocket bidirectionnel, messages temps réel |
| Calendrier des campagnes | **FullCalendar 6** (Alpine wrapper) | Vue jour/semaine/mois, drag to reschedule |
| Graphiques / Charts | **ApexCharts** | Interactifs, zoom, export, responsive |
| Tableaux de données | Livewire 3 + Alpine | Pagination serveur, tri, filtres, export |

**Intégration Vue dans Livewire** :
- Les composants Vue sont montés dans des `<div wire:ignore>` avec passage de données via props
- Communication bidirectionnelle : Livewire → Vue (via props réactifs) / Vue → Livewire (via `$dispatch`)
- Lazy loading : les composants Vue lourds (flow builder) sont chargés en `<Suspense>` avec skeleton

### 7.2 Design System & Composants UI

**Bibliothèque de composants réutilisables** (Blade + Livewire) :
- `<x-button>` : primaire, secondaire, danger, ghost, outline (5 variantes × 3 tailles)
- `<x-input>` : text, email, password, number, search, textarea (avec validation inline)
- `<x-select>` : dropdown searchable avec Alpine.js
- `<x-modal>` : modale avec backdrop, tailles S/M/L/XL/fullscreen
- `<x-card>` : carte avec header, body, footer, variantes (stat, info, action)
- `<x-badge>` : statut, tag, compteur (10 couleurs)
- `<x-table>` : tableau avec tri, sélection, pagination, actions en masse
- `<x-tabs>` : onglets horizontaux/verticaux
- `<x-dropdown>` : menu déroulant avec icônes et raccourcis clavier
- `<x-toast>` : notification toast (succès, erreur, warning, info)
- `<x-empty-state>` : état vide avec illustration et CTA
- `<x-skeleton>` : placeholder de chargement animé
- `<x-avatar>` : photo de profil avec fallback initiales
- `<x-breadcrumb>` : fil d'Ariane
- `<x-stat-card>` : carte KPI avec tendance (flèche haut/bas + %)
- `<x-progress>` : barre de progression (quota, envoi campagne)
- `<x-timeline>` : timeline verticale d'événements
- `<x-command-palette>` : palette de commandes (Ctrl+K)

### 7.3 Dark Mode

- **Toggle** : bouton dans le header (soleil/lune) + option "Auto" (suit l'OS)
- **Implémentation** : Tailwind `dark:` classes, classe `dark` sur `<html>`
- **Persistance** : sauvegardé dans `localStorage` + profil utilisateur
- **Couverture** : 100% des composants, 100% des pages
- **Filament admin** : dark mode natif intégré
- **Graphiques** : ApexCharts thème sombre automatique
- **Transitions** : transition douce entre les modes (150ms)

### 7.4 Accessibilité (WCAG 2.2 AA)

- **Navigation clavier** : tous les éléments interactifs accessibles au Tab
- **Focus visible** : outline bien visible sur tous les éléments focusés (ring-2)
- **ARIA** : labels, roles, descriptions sur tous les composants custom
- **Contrastes** : ratio minimum 4.5:1 (texte) et 3:1 (éléments UI) vérifié
- **Lecteurs d'écran** : testé avec NVDA / VoiceOver
- **Skip links** : "Aller au contenu principal" en haut de chaque page
- **Formulaires** : labels associés, messages d'erreur liés via `aria-describedby`
- **Modales** : focus trap, fermeture Escape, retour du focus à l'ouverture
- **Live regions** : `aria-live` pour les notifications et mises à jour temps réel
- **Réduction de mouvement** : `prefers-reduced-motion` respecté (désactive les animations)
- **Taille des cibles** : minimum 44x44px pour les boutons/liens (mobile)
- **Zoom** : fonctionnel jusqu'à 200% sans perte de contenu

### 7.5 Performance Frontend

- **Lazy loading** :
  - Routes : chaque page chargée à la demande (Livewire navigate)
  - Composants Vue lourds : chargés en `<Suspense>` avec skeleton
  - Images : `loading="lazy"` natif + intersection observer
- **Skeleton loaders** : sur toutes les listes et cartes de stats (pas de page blanche)
- **Virtual scrolling** : pour les listes > 500 items (abonnés, logs)
  - Bibliothèque : `vue-virtual-scroller` pour les composants Vue
  - Livewire : pagination serveur (pas de virtual scroll nécessaire)
- **Cache navigateur** :
  - Assets : hash dans le nom de fichier (cache-busting automatique via Vite)
  - API responses : cache SWR (Stale While Revalidate) pour les données peu changeantes
- **Bundle size** :
  - Tree shaking : Vite élimine le code mort
  - Compression : Brotli (priorité) + Gzip
  - Budget : < 300KB JS initial (hors composants lazy)
- **Métriques cibles** :
  - LCP (Largest Contentful Paint) : < 1.5s
  - FID (First Input Delay) : < 100ms
  - CLS (Cumulative Layout Shift) : < 0.1
  - TTI (Time to Interactive) : < 2s

### 7.6 Temps Réel (WebSockets)

- **Technologie** : Laravel Reverb (WebSocket server natif Laravel 11)
- **Client** : Laravel Echo + Pusher JS driver
- **Canaux privés** (par workspace) :
  - `private-workspace.{id}.subscribers` : nouvel abonné, désabonnement
  - `private-workspace.{id}.campaigns` : progression envoi, campagne terminée
  - `private-workspace.{id}.chat` : nouveaux messages live chat
  - `private-workspace.{id}.notifications` : alertes temps réel
- **Presence channels** : pour le live chat (voir qui est en ligne dans l'équipe)
- **Fallback** : long polling si WebSocket échoue (dégradation gracieuse)
- **Indicateur** : pastille verte "Connecté" / rouge "Déconnecté" dans le footer

### 7.7 Recherche Globale (Command Palette)

- **Raccourci** : `Ctrl+K` (ou `Cmd+K` sur Mac)
- **Recherche universelle** dans :
  - Campagnes (par nom)
  - Abonnés (par nom, username, email, Telegram ID)
  - Séquences (par nom)
  - Tags (par nom)
  - Segments (par nom)
  - Bots (par nom)
  - Pages de navigation (aller à "Abonnés", "Nouvelle campagne", etc.)
- **Actions rapides** :
  - "Nouveau broadcast" → ouvre directement le formulaire
  - "Aller aux analytics" → navigation
  - "Chercher abonné @username" → résultat direct
- **Implémentation** : index de recherche côté serveur (PostgreSQL full-text search) + debounce 300ms
- **Interface** : modale centrée avec input, résultats catégorisés, navigation clavier (flèches + Enter)

### 7.8 Raccourcis Clavier

| Raccourci | Action |
|---|---|
| `Ctrl+K` | Ouvrir la recherche globale |
| `Ctrl+N` | Nouveau broadcast |
| `Ctrl+S` | Sauvegarder (dans les éditeurs) |
| `Escape` | Fermer modale / dropdown |
| `?` | Afficher la liste des raccourcis |
| `G puis H` | Aller au dashboard Home |
| `G puis C` | Aller aux Campagnes |
| `G puis S` | Aller aux Abonnés (Subscribers) |
| `G puis A` | Aller aux Analytics |
| `G puis T` | Aller à l'Équipe (Team) |

- **Aide** : modale "Raccourcis clavier" accessible via `?` ou menu aide
- **Désactivable** : dans les paramètres utilisateur
- **Non actifs** quand un input est focused

### 7.9 SEO, AEO & Pages Publiques

- **Rendu** : Blade SSR (Server-Side Rendering natif Laravel) — pas besoin de SSR JS
- **Pages statiques** : landing page, tarifs, FAQ, CGV, blog, comparatifs
- **Meta tags** : title, description, og:image, og:title, og:description, twitter:card, canonical
- **Sitemap XML** : auto-générée via `spatie/laravel-sitemap`, un sitemap par locale (`sitemap-fr-fr.xml`, `sitemap-en-us.xml`, etc.) + sitemap index
- **Schema.org (AEO)** : JSON-LD pour SoftwareApplication, FAQPage, PricingPage, Organization, BreadcrumbList, WebSite, Article, HowTo, Review, AggregateRating, SearchAction, ContactPage, AboutPage, VideoObject
- **Performance** : pages publiques mises en cache (Laravel Page Cache)
- **i18n SEO** :
  - Format URL : `/{langue}-{pays}/{slug-traduit}` (ex: `/fr-fr/tarifs`, `/en-us/pricing`, `/es-es/precios`, `/zh-cn/jiage`, `/ar-sa/الأسعار`)
  - `hreflang` tags sur chaque page publique (9 langues + x-default)
  - Slugs traduits automatiquement : `pricing` → fr:"tarifs", es:"precios", de:"preise", etc. (même système que SOS-Expat `localeRoutes.ts`)
  - Détection de langue : timezone (80% sans API) → cache géoloc (24h) → API géoloc fallback → navigateur → défaut FR
  - Redirection legacy : `/fr/tarifs` → 301 vers `/fr-fr/tarifs`
  - Mapping langue→pays par défaut : fr→fr, en→us, es→es, de→de, ru→ru, pt→pt, zh→cn, hi→in, ar→sa
  - Pays réel par géolocalisation quand disponible : un français en Allemagne voit `/fr-de/tarifs`
- **Blog** : articles Markdown, catégories, tags, auteur, SEO automatique, Schema.org Article
- **Open Graph images** : images OG générées dynamiquement par page/langue

### 7.10 Tests Frontend

| Type | Outil | Couverture |
|---|---|---|
| Tests E2E (parcours utilisateur) | **Playwright** | Inscription, connexion, création campagne, envoi, analytics |
| Tests composants Livewire | **Pest + Livewire Testing** | Tous les composants Livewire |
| Tests navigateur | **Laravel Dusk** | Interactions complexes (dropdowns, modales) |
| Tests visuels (régression CSS) | **Playwright Screenshots** | Pages critiques (dashboard, éditeur, flow builder) |
| Tests a11y automatisés | **axe-core** (via Playwright) | Toutes les pages (WCAG 2.2 AA) |
| Lint CSS/JS | **ESLint + Prettier + Stylelint** | CI/CD automatisé |

- **CI/CD** : tous les tests lancés automatiquement sur chaque pull request
- **Coverage minimum** : 80% sur les composants Livewire, 100% sur les parcours critiques E2E

---

## 8. Gestion des Bots Telegram

### 8.1 Connexion d'un Bot

- **Ajout** : l'utilisateur colle son token BotFather
- **Validation** : vérification du token via `getMe` de l'API Telegram
- **Configuration automatique** : webhook configuré automatiquement
- **Informations affichées** :
  - Nom du bot, username, photo
  - Statut du webhook (actif/erreur)
  - Dernière activité
  - Nombre d'abonnés

### 8.2 Paramètres du Bot

- **Message de bienvenue** : message envoyé automatiquement au premier `/start`
  - Supporte texte, image, vidéo, document
  - Boutons inline (liens, callbacks)
  - Variables dynamiques : `{first_name}`, `{last_name}`, `{username}`, `{date}`
- **Commandes du bot** :
  - `/start` : message de bienvenue (personnalisable)
  - `/stop` ou `/unsubscribe` : désabonnement
  - `/help` : message d'aide (personnalisable)
  - `/lang` : changer de langue
  - `/status` : statut de l'abonnement
  - Commandes personnalisées (illimitées)
- **Menu du bot** : configuration du bouton menu (lien Mini App, commande, etc.)
- **Description du bot** : configurable depuis le dashboard (synchro BotFather)
- **Photo du bot** : uploadable depuis le dashboard

### 8.3 Gestion de Channels Telegram

- **Connexion** : lier un channel au bot (le bot doit être admin du channel)
- **Poster sur le channel** :
  - Depuis le dashboard (éditeur riche)
  - Programmé (date/heure)
  - Récurrent (quotidien, hebdomadaire)
  - Via API (depuis plateforme externe)
- **Types de posts** : texte, image, vidéo, document, sondage, album, audio
- **Signature** : ajout automatique ou non du nom du bot
- **Commentaires** : activer/désactiver les commentaires sous les posts
- **Pin** : épingler un post depuis le dashboard
- **Statistiques du channel** :
  - Nombre d'abonnés (évolution)
  - Vues par post
  - Partages
  - Réactions par post
- **RSS → Telegram** : importer automatiquement un flux RSS et le poster sur le channel
  - URL du flux RSS
  - Fréquence de vérification (5min, 15min, 30min, 1h)
  - Template du message (titre, lien, résumé)
  - Filtres par mot-clé (inclure/exclure)

### 8.4 Gestion de Groupes Telegram

- **Connexion** : lier un groupe au bot (bot admin du groupe)
- **Modération automatique** :
  - Mots interdits (liste configurable) → suppression + avertissement
  - Anti-spam : liens, forwards excessifs
  - Anti-flood : limite de messages par minute par user
  - Message de bienvenue automatique pour les nouveaux membres
  - Message de départ automatique
- **Commandes de groupe** : commandes personnalisées accessibles dans le groupe
- **Statistiques du groupe** :
  - Membres actifs / inactifs
  - Messages par jour
  - Membres les plus actifs
  - Heures de pointe d'activité
- **Forum/Topics** : gestion des topics dans les groupes forum

### 8.5 Deep Links

- **Génération de liens trackés** : `https://t.me/bot?start=PAYLOAD`
- **Payload structure** : `{source}_{campaign}_{medium}_{content}`
  - Exemple : `fb_summer2026_cpc_banner1`
- **Attribution automatique** : quand un user clique, on sait d'où il vient
- **Tableau de suivi** : conversions par deep link
- **QR Codes** : génération automatique de QR codes pour chaque deep link
- **Short links** : raccourcisseur intégré pour les liens dans les messages (tracking des clics)

### 8.6 Telegram Bot Payments

- **Paiements natifs Telegram** : le bot peut accepter des paiements directement dans Telegram
- **Providers** : Stripe, YooKassa, Sberbank, et autres (configurables)
- **Telegram Stars** : monnaie virtuelle Telegram pour les achats numériques
- **Fonctionnalités** :
  - Créer des factures (invoices) via le bot
  - Bouton "Payer" dans un message
  - Confirmation de paiement automatique
  - Webhook `pre_checkout_query` pour valider avant paiement
  - Webhook `successful_payment` pour livrer le produit/service
- **Dashboard** :
  - Liste des transactions (montant, abonné, date, statut)
  - Revenus par période (graphique)
  - Remboursements
- **Use cases** :
  - Vente de contenu premium dans le bot
  - Donations / pourboires
  - Abonnements premium via Telegram Stars
  - Paiement de services (réservation, consultation)

---

## 9. Gestion des Abonnés Telegram

### 9.1 Liste des Abonnés

- **Tableau paginé** avec colonnes :
  - Telegram ID, prénom, nom, username
  - Photo de profil (si disponible)
  - Date d'inscription
  - Source (deep link / campagne)
  - Tags
  - Segment(s)
  - Score d'engagement
  - Langue (detectée via Telegram `language_code`)
  - Statut (actif, inactif, bloqué, désabonné)
  - Dernier message reçu / envoyé
  - Nombre de messages reçus
- **Filtres avancés** :
  - Par tag (et/ou)
  - Par segment
  - Par source/campagne
  - Par date d'inscription (range)
  - Par score d'engagement (min/max)
  - Par langue
  - Par statut
  - Par activité (actif dans les X derniers jours)
- **Actions en masse** :
  - Ajouter/retirer des tags
  - Déplacer vers un segment
  - Exporter (CSV, JSON)
  - Supprimer

### 9.2 Fiche Abonné

- **Informations** :
  - Données Telegram (ID, prénom, nom, username, langue, premium)
  - Données custom (champs personnalisés)
  - Source d'acquisition (UTM, deep link, campagne)
  - Tags et segments
  - Score d'engagement
- **Timeline d'activité** :
  - Tous les messages envoyés et reçus (chronologique)
  - Événements (inscription, tag ajouté, campagne reçue, clic, etc.)
- **Actions** :
  - Envoyer un message direct
  - Ajouter/retirer des tags
  - Ajouter une note interne
  - Bloquer / débloquer

### 9.3 Tags

- **CRUD** : créer, renommer, supprimer, fusionner des tags
- **Couleurs** : chaque tag a une couleur pour identification visuelle
- **Auto-tagging** : règles automatiques (ex: si source = "fb_summer", ajouter tag "campagne-été")
- **Statistiques par tag** : nombre d'abonnés, taux d'engagement moyen

### 9.4 Segments

- **Segments dynamiques** (recalculés en temps réel) :
  - Basés sur des conditions (tags, langue, score, date, source, activité)
  - Opérateurs : ET, OU, SAUF
  - Exemples :
    - "Abonnés francophones actifs" : langue = fr ET dernière activité < 7 jours
    - "Inactifs depuis 30 jours" : dernière activité > 30 jours
    - "VIP" : score > 80 ET tag = "premium"
- **Segments statiques** : liste figée d'abonnés (importée ou sélectionnée manuellement)
- **Prévisualisation** : voir le nombre d'abonnés matchant avant de sauvegarder

### 9.5 Scoring d'Engagement

- **Score automatique** (0-100) basé sur :
  - Fréquence d'interaction avec le bot
  - Clics sur les liens
  - Réponses aux messages
  - Ancienneté
  - Réactivité (temps de réponse)
- **Poids configurables** par le client
- **Catégories automatiques** : Froid (0-25), Tiède (26-50), Chaud (51-75), Brûlant (76-100)

### 9.6 Champs Personnalisés

- **Types** : texte, nombre, date, email, téléphone, URL, liste déroulante, booléen
- **Utilisation** : dans les variables des messages (ex: `{custom.ville}`)
- **Remplissage** : via API, via chatbot flow, via import, manuellement

### 9.7 Import / Export

- **Import** :
  - CSV (mapping de colonnes)
  - JSON
  - Depuis une autre plateforme (format standard)
  - Pas d'import de Telegram IDs sans opt-in (respect ToS Telegram)
- **Import depuis concurrents** :
  - **ManyChat** : import CSV des contacts (nom, tags, champs custom) + mapping automatique
  - **ChatFuel** : import CSV des subscribers
  - **SendPulse** : import CSV des contacts Telegram
  - **Guide de migration** : documentation step-by-step pour chaque concurrent ("Comment migrer de ManyChat en 10 minutes")
  - **Note** : les Telegram chat_ids ne peuvent pas être transférés (chaque bot a ses propres chat_ids). L'import concerne les métadonnées (tags, champs custom, scores). Les abonnés devront re-/start sur le nouveau bot (deep link de migration fourni).
- **Export** :
  - CSV, JSON, XLSX
  - Filtrable (même filtres que la liste)
  - Export planifié (quotidien, hebdomadaire)
  - BOM UTF-8 pour compatibilité Excel

### 9.8 Outils de Croissance des Abonnés

- **Programme de parrainage** :
  - Chaque abonné reçoit un lien de parrainage unique
  - Quand un ami s'inscrit via ce lien, le parrain est récompensé (message personnalisé, tag "ambassadeur", etc.)
  - Classement des meilleurs parrains
  - Configurable par le client
- **Concours / Giveaway** :
  - Créer un concours ("Invitez 3 amis pour participer")
  - Tirage au sort automatique parmi les participants qualifiés
  - Annonce du gagnant via le bot
- **Contenu exclusif conditionné** :
  - "Invitez 5 amis pour débloquer le guide gratuit"
  - Vérification automatique du nombre de parrainages
- **Growth Analytics** :
  - Sources des nouveaux abonnés (graphique)
  - Taux de croissance quotidien/hebdomadaire/mensuel
  - Meilleurs canaux d'acquisition
  - Coût par abonné (si budget pub renseigné)
  - Prévision de croissance (tendance)

---

## 10. Campagnes (Broadcasts)

### 10.1 Création de Campagne

- **Nom interne** de la campagne
- **Bot** : sélection du bot émetteur
- **Audience** :
  - Tous les abonnés
  - Par segment(s)
  - Par tag(s)
  - Exclusion de tags/segments
  - Estimation du nombre de destinataires en temps réel
- **Contenu du message** :
  - **Éditeur riche** avec prévisualisation en temps réel
  - Types supportés :
    - Texte (Markdown / HTML)
    - Image + légende
    - Vidéo + légende
    - Document (PDF, etc.)
    - Audio
    - Animation (GIF)
    - Album (groupe de médias, max 10)
    - Sondage (poll)
    - Quiz
    - Localisation
    - Contact
    - Sticker
  - **Variables dynamiques** : `{first_name}`, `{last_name}`, `{username}`, `{custom.*}`
  - **Boutons inline** :
    - Bouton URL (avec tracking de clic intégré)
    - Bouton callback (déclenche une action)
    - Bouton Mini App (ouvre une web app)
  - **Prévisualisation** : rendu exact du message tel qu'il apparaîtra dans Telegram
  - **Brouillons** : sauvegarde automatique

### 10.2 Programmation

- **Envoi immédiat**
- **Envoi programmé** : date et heure précise (avec fuseau horaire)
- **Envoi intelligent** : envoyer à l'heure optimale par fuseau horaire de chaque abonné
- **Envoi récurrent** : répéter (quotidien, hebdomadaire, mensuel)
- **Throttling** : limiter le débit d'envoi (ex: max 500 messages/heure pour étaler la charge)
- **Calendar view** : vue calendrier de toutes les campagnes programmées (jour, semaine, mois)
- **Frequency capping** : limiter le nombre de messages qu'un abonné reçoit (ex: max 3/semaine, max 10/mois)
  - Configurable globalement et par campagne
  - Si un abonné a atteint son cap, le message est reporté ou annulé
  - Priorité par campagne (les campagnes prioritaires passent malgré le cap)

**Gestion des Fuseaux Horaires** :
- **Stockage** : toutes les dates/heures stockées en **UTC** en base de données
- **Fuseau du workspace** : configurable dans les paramètres (ex: Europe/Paris, America/New_York)
- **Fuseau de l'abonné** : détecté via `language_code` Telegram → mapping langue → timezone probable (affinable via champ custom)
- **Affichage** : toutes les dates/heures affichées dans le fuseau du workspace (sauf mention contraire)
- **Programmation** : le client programme dans son fuseau → conversion UTC automatique
- **Envoi intelligent par timezone** : si activé, l'outil envoie à l'heure locale de chaque abonné (ex: "envoyer à 9h locale" → un Parisien reçoit à 9h CET, un New-Yorkais à 9h EST)
- **Gestion des DST** (heure d'été/hiver) : librairie `Carbon` gère automatiquement les changements d'heure

### 10.3 Clonage et Templates

- **Cloner une campagne** : dupliquer une campagne existante (contenu, audience, paramètres)
- **Sauvegarder comme template** : enregistrer une campagne comme modèle réutilisable
- **Bibliothèque de templates** :
  - Templates créés par le client
  - Templates pré-faits par la plateforme (onboarding, promo, relance, etc.)
  - Catégorisés par type (notification, promotion, éducation, relance)
- **Content approval workflow** (pour les équipes) :
  - Statut : brouillon → en revue → approuvé → programmé
  - Un éditeur crée, un admin d'équipe approuve
  - Commentaires sur le brouillon
  - Historique des révisions

### 10.4 A/B Testing (Adapté Telegram)

- **Variantes** : jusqu'à 5 variantes de message
- **Ce qui peut varier** : texte, image/vidéo, boutons, ordre des éléments, heure d'envoi
- **Split** : pourcentage d'audience par variante (ex: 20% A, 20% B, 60% gagnant)
- **Critères de victoire** (spécifiques Telegram — pas d'open rate possible) :
  - ✅ Taux de clic (liens trackés + boutons callback)
  - ✅ Taux de réponse (nombre de réponses/réactions)
  - ✅ Taux de réaction (emojis)
  - ✅ Taux de conversion (objectif custom via API)
  - ✅ Taux de désabonnement (block bot)
  - ❌ Taux d'ouverture (impossible sur Telegram — pas de pixel tracking)
- **Durée du test** : configurable (ex: 4h puis envoi automatique du gagnant au reste)
- **Résultats** : tableau comparatif des variantes avec intervalle de confiance statistique
- **Recommandation automatique** : "La variante B a 95% de chances d'être meilleure"

### 10.5 Suivi de Campagne

- **Statuts** : brouillon, programmée, en cours, terminée, annulée
- **Métriques en temps réel** :
  - Messages envoyés / en file d'attente
  - Messages délivrés (succès)
  - Messages échoués (bot bloqué, user supprimé, etc.)
  - Taux de délivrabilité
  - Clics sur les liens (par bouton)
  - Taux de clic (CTR)
  - Réponses reçues
  - Désabonnements déclenchés
  - Temps moyen de lecture (estimé)
- **Timeline** : progression minute par minute de l'envoi
- **Graphiques** :
  - Clics par heure/jour
  - Répartition géographique (par langue)
  - Engagement par segment

---

## 11. Media Library, Variables Globales & Blacklist

### 11.1 Media Library (Banque de Médias)

- **Upload centralisé** : images, vidéos, documents, audio, GIFs
- **Organisation** : dossiers, tags, recherche par nom
- **Réutilisation** : sélectionner un média depuis n'importe quel éditeur de message
- **Métadonnées** : nom, description, dimensions, poids, date d'upload
- **Prévisualisation** : aperçu inline dans la bibliothèque
- **Limites** :
  - Images : 10 MB max
  - Vidéos : 50 MB max (2 GB via Local Bot API si configuré)
  - Documents : 50 MB max
- **Quota de stockage** : selon le plan (500 MB free, 5 GB starter, 25 GB pro, illimité enterprise)
- **Upload avancé** :
  - Chunked upload pour les fichiers > 5 MB (reprise en cas de coupure réseau)
  - Barre de progression en temps réel
  - Drag & drop depuis le bureau
  - Copier-coller d'images depuis le presse-papier
  - Compression automatique des images (WebP, qualité configurable)
  - Génération automatique de miniatures (thumbnails)

### 11.2 Variables Globales

- **Variables de compte** (disponibles dans tous les messages) :
  - `{bot.name}` : nom du bot
  - `{bot.username}` : @username du bot
  - `{company.name}` : nom de l'entreprise
  - `{company.url}` : site web
  - `{company.support_email}` : email support
  - `{unsubscribe_link}` : lien de désabonnement
  - Variables personnalisées illimitées (ex: `{global.promo_code}`, `{global.event_date}`)
- **Variables d'abonné** :
  - `{first_name}`, `{last_name}`, `{username}`, `{telegram_id}`
  - `{language}`, `{signup_date}`, `{source}`, `{score}`
  - `{custom.*}` : tous les champs personnalisés
- **Variables de campagne** :
  - `{campaign.name}`, `{campaign.date}`
- **Contenu conditionnel inline** :
  - Syntaxe : `{if tag:vip}Message VIP{else}Message standard{endif}`
  - Conditions : tag, segment, langue, champ custom, score
  - Permet de personnaliser un seul message pour plusieurs audiences

### 11.3 Blacklist Globale

- **Liste noire** : Telegram IDs qui ne doivent jamais être contactés
- **Sources** : ajout manuel, import CSV, automatique (trop de blocks)
- **Vérification** : chaque envoi vérifie la blacklist avant d'envoyer
- **Raison** : champ raison pour chaque entrée (RGPD, plainte, spam, etc.)
- **Export** : exportable pour compliance

---

## 12. Séquences Automatiques & Cross-Canal (Drip Campaigns)

### 12.1 Création de Séquence

- **Nom** de la séquence
- **Déclencheur d'entrée** :
  - Nouvel abonné (premier /start)
  - Tag ajouté
  - Segment rejoint
  - Événement API (webhook entrant)
  - Date anniversaire (champ personnalisé)
  - Clic sur un lien spécifique
  - Réponse contenant un mot-clé
- **Conditions de sortie** :
  - Tag ajouté/retiré
  - Achat effectué (via API)
  - Objectif atteint
  - Désabonnement
  - Manuellement retiré

### 12.2 Éditeur Visuel de Séquence (Flow Builder)

- **Interface drag & drop**
- **Blocs disponibles** :
  - **Message Telegram** : envoyer un message Telegram (tous types supportés)
  - **Email** : envoyer un email (si adresse email connue) — **cross-canal**
  - **Post Channel** : poster sur un channel Telegram — **cross-canal**
  - **Délai** : attendre X minutes/heures/jours
  - **Attendre événement** : attendre qu'un événement se produise (clic, réponse, achat)
  - **Condition** : if/else basé sur (tag, segment, score, champ custom, langue, canal, etc.)
  - **Action** : ajouter/retirer tag, mettre à jour champ custom, envoyer webhook, noter dans CRM
  - **Split A/B** : diviser le flux en variantes
  - **Objectif** : marquer la séquence comme "convertie"
  - **Goto** : revenir à un bloc précédent (boucles)
  - **Fin** : terminer la séquence
- **Cross-canal Telegram + Email** :
  - Une même séquence peut alterner entre messages Telegram et emails
  - Exemple : J+0 Telegram → J+1 Email → J+3 Telegram
  - Fallback : si l'abonné a bloqué le bot, envoyer par email à la place
  - Condition de canal : "si email connu" → email, sinon Telegram
- **Prévisualisation** : simuler le parcours d'un abonné fictif avec timeline visuelle

### 12.3 Exemples de Séquences

**Onboarding Chatter (SOS-Expat)** :
```
J+0 (immédiat) : "Bienvenue {first_name} ! Votre inscription est confirmée."
J+0 (+5min)    : "Voici votre lien d'affiliation unique : {affiliate_link}"
J+1            : "Voici 3 astuces pour commencer à gagner dès aujourd'hui"
J+3            : IF score < 20 → "Besoin d'aide ? Voici notre tutoriel vidéo"
                 ELSE → "Bravo ! Vous avez déjà {referrals} parrainages"
J+7            : "Astuce pro : rejoignez ces groupes Facebook pour trouver des clients"
J+14           : IF conversions = 0 → "Ne lâchez pas ! Voici l'histoire de Marie qui gagne 5000$/mois"
                 ELSE → "Félicitations pour vos {conversions} conversions !"
J+30           : "Votre premier mois : {revenue}$ gagnés. Voici comment doubler ce chiffre."
```

### 12.4 Suivi des Séquences

- Nombre d'abonnés dans chaque étape
- Taux de complétion
- Taux de conversion (objectif atteint)
- Drop-off par étape (où les gens décrochent)
- Temps moyen pour compléter la séquence

### 12.5 Re-engagement Automatique

- **Détection d'inactivité** : abonné n'a pas interagi depuis X jours (configurable)
- **Séquence de re-engagement** : déclenchée automatiquement
  - Exemple : J+30 inactif → "Vous nous manquez !" → J+37 → "Dernière offre avant suppression" → J+45 → suppression auto
- **Win-back** : abonnés qui ont bloqué le bot puis reviennent → séquence spéciale
- **Nettoyage automatique** : supprimer les abonnés inactifs après X jours (configurable)
- **Statistiques** : taux de réactivation, meilleur message de re-engagement

---

## 13. Chatbot / Auto-Réponses

### 13.1 Auto-Réponses par Mot-clé

- **Règles** : SI le message contient "X" → répondre "Y"
- **Match** : exact, contient, commence par, regex
- **Priorité** : ordre d'exécution configurable
- **Actions associées** : répondre + ajouter tag + déclencher séquence
- **Fallback** : message par défaut si aucune règle ne matche

### 13.2 Chatbot Flows (Conversations guidées)

- **Éditeur visuel** (drag & drop, similaire aux séquences)
- **Blocs** :
  - **Message** : texte, image, vidéo avec boutons
  - **Question** : attendre une réponse (texte libre, choix via boutons, nombre, email, etc.)
  - **Validation** : vérifier le format de la réponse
  - **Condition** : branching selon la réponse
  - **Sauvegarde** : stocker la réponse dans un champ personnalisé
  - **Action** : tag, webhook, email, notification admin
  - **Transfert** : transférer la conversation à un humain
  - **Fin** : message de conclusion
- **Templates prêts à l'emploi** :
  - Collecte de leads
  - FAQ interactive
  - Sondage de satisfaction
  - Quiz/questionnaire
  - Prise de rendez-vous
  - Support client (triage)

### 13.3 Live Chat (Conversation Humaine)

- **Boîte de réception** : liste des conversations actives
- **Prise en main** : un admin/opérateur peut reprendre une conversation du bot
- **Indicateur** : "Bot" ou "Humain" affiché pour chaque conversation
- **Notes internes** : ajouter des notes invisibles pour le subscriber
- **Assignation** : assigner une conversation à un membre de l'équipe
- **Réponses rapides** : templates de réponses préenregistrées

---

## 14. Tracking UTM et Attribution

### 14.1 Sources de Trafic

- **UTM Parameters** : `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`
- **Deep Links Telegram** : payload encodé dans le lien `/start`
- **Attribution** : chaque abonné est tagué avec sa source
- **Intégration Facebook Ads** :
  - Pixel de conversion (optionnel, via API Conversions)
  - Mapping campagne FB → deep link Telegram
  - Coût par acquisition (CPA) si le client renseigne le budget

### 14.2 Dashboard Attribution

- **Tableau** : abonnés par source (Facebook, Google, TikTok, organique, etc.)
- **Funnel** : impression → clic → inscription Telegram → 1er message → conversion
- **ROI par campagne** : si budget renseigné, calcul du ROI automatique
- **Cohort analysis** : rétention par cohorte d'acquisition (semaine/mois)

---

## 15. Intégrations, API REST & SDKs

### 15.1 API REST

- **Authentication** : Bearer token (Sanctum)
- **Rate limiting** : configurable par plan (ex: 100 req/min starter, 1000 req/min pro)
- **Endpoints principaux** :

**Abonnés**
  - `POST /api/v1/subscribers` : créer/mettre à jour un abonné (depuis plateforme externe)
  - `GET /api/v1/subscribers` : lister les abonnés (filtres, pagination)
  - `GET /api/v1/subscribers/{id}` : détail d'un abonné
  - `PATCH /api/v1/subscribers/{id}` : mettre à jour (tags, champs custom)
  - `DELETE /api/v1/subscribers/{id}` : supprimer
  - `POST /api/v1/subscribers/{id}/tags` : ajouter des tags
  - `DELETE /api/v1/subscribers/{id}/tags/{tag}` : retirer un tag
  - `POST /api/v1/subscribers/{id}/message` : envoyer un message direct

**Campagnes**
  - `POST /api/v1/campaigns` : créer une campagne
  - `GET /api/v1/campaigns` : lister
  - `GET /api/v1/campaigns/{id}` : détail + stats
  - `POST /api/v1/campaigns/{id}/send` : lancer l'envoi
  - `POST /api/v1/campaigns/{id}/cancel` : annuler

**Séquences**
  - `POST /api/v1/sequences/{id}/enroll` : inscrire un abonné dans une séquence
  - `POST /api/v1/sequences/{id}/unenroll` : désinscrire

**Tags & Segments**
  - CRUD complet

**Batch Operations**
  - `POST /api/v1/batch/subscribers/tags` : ajouter/retirer des tags à plusieurs abonnés
  - `POST /api/v1/batch/subscribers/message` : envoyer un message à une liste d'IDs
  - `POST /api/v1/batch/subscribers/delete` : supprimer plusieurs abonnés
  - `POST /api/v1/batch/subscribers/import` : import massif (async, retourne un job ID)
  - `GET /api/v1/batch/jobs/{id}` : statut d'un job batch (pending, processing, completed, failed)
  - Limite : 10 000 items par requête batch
  - Traitement asynchrone via queue (résultat récupérable via polling ou webhook)

**Événements**
  - `POST /api/v1/events` : envoyer un événement custom (déclenche des automations)

**Analytics**
  - `GET /api/v1/analytics/subscribers` : stats abonnés
  - `GET /api/v1/analytics/campaigns/{id}` : stats campagne
  - `GET /api/v1/analytics/overview` : KPIs globaux

**Webhooks sortants**
  - `POST /api/v1/webhooks` : configurer un webhook sortant
  - Événements déclencheurs :
    - `subscriber.created` : nouvel abonné
    - `subscriber.unsubscribed` : désabonnement
    - `subscriber.tagged` : tag ajouté
    - `campaign.sent` : campagne envoyée
    - `campaign.clicked` : clic sur un lien
    - `sequence.completed` : séquence terminée
    - `chatbot.completed` : flow chatbot terminé
    - `payment.received` : paiement reçu (si bot payments)
  - **Retry strategy (webhooks sortants)** :
    - Retry automatique en cas d'échec (HTTP 5xx ou timeout)
    - Backoff exponentiel : 1min, 5min, 30min, 2h, 12h (5 tentatives max)
    - Après 5 échecs : webhook désactivé + notification email au client
    - Dashboard : historique des tentatives (status, response code, durée)
    - Bouton "Retry maintenant" pour relancer manuellement
  - **Signature HMAC** : chaque webhook est signé (header `X-Signature-256`) pour vérification côté client
- **Événements supplémentaires (webhooks sortants)** :
  - `subscriber.updated` : champ modifié (tags, custom fields, score)
  - `message.failed` : échec d'envoi (bot bloqué, user supprimé, rate limit)
  - `bot.error` : erreur webhook Telegram (timeout, 429, 500)
  - `quota.warning` : client à 80% / 90% / 100% de son quota
  - `sequence.enrolled` : abonné inscrit dans une séquence
  - `chatbot.message_received` : message reçu dans un flow chatbot
- **Versioning** :
  - Version actuelle : `v1` — URL : `/api/v1/...`
  - Rétrocompatibilité : versions anciennes disponibles 12 mois après dépréciation
  - Headers dépréciation : `X-API-Deprecated` et `X-API-Sunset-Date`
  - Changelog et guide de migration fournis à chaque version majeure

**Rate Limits par Plan** :

| Plan | Requêtes API / min | Requêtes API / jour | Webhooks sortants | Batch items / requête |
|---|---|---|---|---|
| Free | ❌ (pas d'API) | ❌ | ❌ | ❌ |
| Starter | 60 | 10 000 | 5 endpoints | 1 000 |
| Pro | 300 | 100 000 | 20 endpoints | 5 000 |
| Enterprise | 1 000 | Illimité | Illimité | 10 000 |

- **Headers de réponse** : `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- **Dépassement** : HTTP 429 (Too Many Requests) avec header `Retry-After`
- **Burst** : tolérance de 2x la limite pendant 10 secondes (pour les pics ponctuels)

### 15.2 Documentation API

- **Swagger / OpenAPI 3.0** auto-générée
- **Page dédiée** accessible depuis le dashboard
- **Exemples** en cURL, JavaScript, PHP, Python
- **Sandbox** : environnement de test avec bot de démo

### 15.3 Webhooks Entrants

- **Endpoint dédié par client** : `POST /webhook/{client_token}`
- **Payload flexible** : JSON avec mapping configurable
- **Actions déclenchées** : créer abonné, ajouter tag, inscrire en séquence, envoyer message
- **Logs** : historique des webhooks reçus (payload, status, erreur)
- **Outil de débogage webhooks** :
  - Bouton **"Envoyer un webhook test"** pour chaque webhook configuré (sortant et entrant)
  - Affiche la requête envoyée (headers, body) et la réponse reçue (status code, body, durée)
  - Replay : rejouer un webhook passé (depuis les logs) pour re-tester
  - Inspection : vu détaillée de chaque tentative (timestamp, status, response, retry count)

### 15.4 SDKs & Bibliothèques Client

- **SDK PHP** (Composer) : `composer require telegram-tool/php-sdk`
- **SDK JavaScript/Node.js** (npm) : `npm install @telegram-tool/sdk`
- **SDK Python** (pip) : `pip install telegram-tool`
- **Chaque SDK fournit** :
  - Authentification automatique (token API)
  - Toutes les méthodes API typées
  - Gestion des erreurs et retry
  - Exemples d'intégration
- **Extraits de code** : copier-coller depuis le dashboard pour chaque endpoint
- **Postman Collection** : importable en un clic

### 15.5 Widgets Embarquables (Sites Web)

- **Widget "Rejoindre Telegram"** :
  - Code JavaScript à coller sur n'importe quel site web
  - Popup, slide-in, barre fixe, ou bouton flottant
  - Design personnalisable (couleurs, texte, position)
  - Deep link intégré avec tracking UTM automatique
  - Responsive mobile
  - Exemple : `<script src="https://tool.com/widget.js" data-bot="mybot" data-campaign="website"></script>`
- **Widget QR Code** :
  - QR code embarquable qui pointe vers le bot avec tracking
  - Personnalisable (couleur, logo au centre)
  - Format : PNG, SVG, PDF
- **Landing page Telegram** :
  - Mini landing page hébergée par la plateforme
  - URL : `https://tool.com/join/mon-bot`
  - Personnalisable (titre, description, image, CTA)
  - Tracking UTM intégré

### 15.6 Raccordement d'une Plateforme Externe (Flux Complet)

Guide concret pour connecter **n'importe quelle plateforme** (SOS-Expat, e-commerce, SaaS, WordPress, app mobile...) :

**Étape 1 — Le client connecte son bot dans le dashboard de l'outil** :
- Colle le token BotFather → l'outil configure le webhook automatiquement
- Le bot est prêt, le client n'a rien d'autre à faire côté Telegram

**Étape 2 — La plateforme externe crée un abonné via l'API** :
- Au moment de l'inscription d'un utilisateur sur la plateforme (ex: nouveau Chatter sur SOS-Expat)
- `POST /api/v1/subscribers` avec `external_id` (UID de la plateforme), tags, champs custom
- L'outil retourne un **deep link unique** (`https://t.me/Bot?start=link_xxx`) + un **QR code**

**Étape 3 — La plateforme affiche le bouton "Connecter Telegram"** :
- Bouton avec le deep link ou QR code sur la page de la plateforme
- L'utilisateur clique → Telegram s'ouvre → il appuie sur "Start"

**Étape 4 — L'outil capture automatiquement le chat_id** :
- Le bot reçoit le `/start` avec le payload (géré entièrement par l'outil)
- L'outil lie le `chat_id` Telegram au subscriber (`external_id`)
- L'outil envoie le message de bienvenue
- L'outil déclenche la séquence d'onboarding si configurée

**Étape 5 — L'outil notifie la plateforme via webhook sortant** :
- `POST` vers l'URL webhook de la plateforme :
```json
{
  "event": "subscriber.linked",
  "data": {
    "external_id": "uid_firebase_du_chatter",
    "telegram_id": 987654321,
    "username": "@marie_dupont",
    "first_name": "Marie",
    "linked_at": "2026-02-06T14:30:00Z"
  }
}
```
- La plateforme stocke le `telegram_id` dans sa propre base de données
- **Le bot, les deep links, la capture du chat_id, les campagnes = tout est géré par l'outil**
- **La plateforme externe n'a qu'à faire : 1 appel API + 1 webhook listener**

**Résumé des responsabilités** :

| Tâche | Qui la gère ? |
|---|---|
| Créer/gérer le bot Telegram | L'Outil |
| Recevoir les `/start` et capturer les `chat_id` | L'Outil |
| Générer les deep links et QR codes | L'Outil |
| Envoyer les messages et campagnes | L'Outil |
| Gérer les séquences automatiques | L'Outil |
| Tracker les clics et conversions | L'Outil |
| Stocker le `telegram_id` dans sa propre DB | La Plateforme Externe |
| Afficher le bouton "Connecter Telegram" à l'utilisateur | La Plateforme Externe |
| Appeler l'API pour créer un subscriber | La Plateforme Externe |
| Recevoir le webhook de confirmation | La Plateforme Externe |

### 15.7 Intégrations Natives (futures)

- Zapier (via API)
- n8n (via webhooks)
- Make/Integromat (via API)
- Facebook Conversions API
- Google Analytics (événements)
- Stripe (sync abonnements)

---

## 16. Analytics, Reporting & Deliverability

### 16.1 Dashboard Analytics Client

- **Vue d'ensemble** :
  - Courbe de croissance des abonnés (30/60/90 jours)
  - Messages envoyés par jour
  - Taux d'engagement global
  - Top campagnes (par CTR)
  - Top séquences (par conversion)
  - Abonnés les plus engagés

- **Analytics par campagne** :
  - Funnel : envoyés → délivrés → lus → cliqués → convertis
  - Heatmap horaire (quand les abonnés cliquent)
  - Performance par segment
  - Performance par langue
  - Comparaison entre campagnes

- **Analytics par séquence** :
  - Funnel par étape
  - Drop-off entre chaque étape
  - Temps moyen entre les étapes
  - Taux de conversion global

- **Analytics abonnés** :
  - Distribution des scores d'engagement
  - Répartition par langue
  - Répartition par source d'acquisition
  - Rétention (courbe de survie)
  - Cohorte par semaine/mois d'inscription

### 16.2 Rapports

- **Rapports pré-définis** :
  - Rapport mensuel (envoyé par email)
  - Rapport de campagne (PDF exportable)
  - Rapport de croissance
  - Rapport d'engagement
- **Rapports personnalisés** :
  - Sélection des métriques
  - Période personnalisable
  - Filtres (bot, segment, tag, source)
  - Export CSV, PDF, XLSX
- **Rapports planifiés** :
  - Fréquence : quotidien, hebdomadaire, mensuel
  - Destinataires : email ou Telegram (méta !)
  - Format : PDF ou CSV

### 16.3 Deliverability Monitoring (Santé des Envois)

- **Tableau de bord deliverability** :
  - Taux de délivrabilité global (% de messages réellement reçus)
  - Taux de block (% d'abonnés qui ont bloqué le bot)
  - Taux d'erreur API Telegram (timeouts, 429, 400, etc.)
  - Évolution sur 7/30/90 jours (graphique)
- **Alertes automatiques** :
  - Si taux de block > 5% → alerte email + notification
  - Si taux d'erreur API > 2% → alerte
  - Si webhook Telegram down → alerte immédiate
- **Diagnostic par campagne** :
  - Détail erreur par erreur (bot bloqué, user supprimé, chat introuvable, etc.)
  - Suggestions d'amélioration (trop de messages ? contenu inadapté ?)
- **Score de santé du bot** (0-100) :
  - Basé sur : taux de block, taux d'erreur, taux de réponse, croissance abonnés
  - Recommandations automatiques pour améliorer le score

### 16.4 Analytics Polls & Quiz

- **Résultats de sondages** :
  - Répartition des votes (graphique camembert/barres)
  - Nombre total de participants
  - Filtre par segment/tag
  - Évolution dans le temps
- **Résultats de quiz** :
  - Score moyen
  - Taux de bonnes réponses par question
  - Classement des participants
  - Export des résultats

### 16.5 Tracking des Réactions

- **Réactions emoji** aux messages du bot :
  - Comptage par emoji (👍, ❤️, 🔥, etc.)
  - Taux de réaction par message/campagne
  - Top messages par réactions
  - Tendance des réactions dans le temps
- **Utilisation** : indicateur d'engagement complémentaire au CTR

---

## 17. Multilingue (i18n)

### 17.1 Langues de la Plateforme (Navigation / UI)

| # | Langue | Code | Direction |
|---|---|---|---|
| 1 | Français | `fr` | LTR |
| 2 | English | `en` | LTR |
| 3 | Español | `es` | LTR |
| 4 | Deutsch | `de` | LTR |
| 5 | Português | `pt` | LTR |
| 6 | Русский | `ru` | LTR |
| 7 | 中文 | `zh` | LTR |
| 8 | हिन्दी | `hi` | LTR |
| 9 | العربية | `ar` | RTL |

- **Détection automatique** (multi-méthode, par priorité) :
  1. Préférence sauvée (localStorage / profil utilisateur)
  2. Timezone navigateur (80% des cas, ZERO appel API, 170+ timezones IANA → pays → langue)
  3. Cache géolocalisation (24h localStorage)
  4. APIs géolocalisation fallback (geojs.io → ipapi.co → ip-api.com, timeout 1.5s)
  5. Langue navigateur (`navigator.languages`)
  6. Défaut : FR
- **Sélecteur de langue** : accessible partout dans le UI (dropdown dans le header + footer)
- **Persistance** : sauvegardée dans le profil utilisateur + localStorage
- **RTL** : support complet pour l'arabe (Tailwind RTL plugin, direction auto)
- **Dates et nombres** : format localisé (ex: 1 234,56 en FR vs 1,234.56 en EN)
- **Pluralisation** : gestion des pluriels selon les règles de chaque langue (Laravel trans_choice)

**Couverture traduction** :

| Élément | 9 langues ? |
|---|---|
| Navigation / UI (menus, boutons, labels) | Oui |
| Messages d'erreur et validation | Oui |
| Emails transactionnels (bienvenue, facture, relance...) | Oui |
| Site vitrine (landing, tarifs, FAQ, CGV, blog) | Oui |
| Documentation API (Swagger) | FR + EN uniquement |
| Console admin (Filament) | FR + EN (les admins sont internes) |
| Templates de campagnes prêts à l'emploi | Oui (9 langues) |
| Notifications in-app | Oui |

**Gestion des traductions** :
- **Fichiers** : Laravel lang files (JSON) — un fichier par langue
- **Organisation** : par module (auth.json, dashboard.json, campaigns.json, emails.json, landing.json, etc.)
- **Processus** : FR et EN rédigés en interne, 7 autres langues via traducteurs professionnels ou IA + relecture
- **Mise à jour** : quand une clé FR/EN est modifiée, les autres langues sont flaggées "à retraduire"
- **Fallback** : si une clé manque dans une langue → affichage en anglais (jamais de clé brute)
- **Variables dans les traductions** : support des paramètres Laravel `:name`, `:count`, etc.

### 17.2 Routing Multilingue & Slugs Traduits (Pages Publiques)

**Architecture inspirée de SOS-Expat** (`multilingual-system/`) — adaptée côté Laravel Blade SSR.

**Format URL** : `/{langue}-{pays}/{slug-traduit}`
- Exemples : `/fr-fr/tarifs`, `/en-us/pricing`, `/es-es/precios`, `/de-de/preise`, `/zh-cn/jiage`, `/ar-sa/الأسعار`
- Le pays est détecté par géolocation : un français en Allemagne voit `/fr-de/tarifs`
- Fallback pays : mapping langue→pays par défaut (fr→fr, en→us, es→es, de→de, ru→ru, pt→pt, zh→cn, hi→in, ar→sa)

**Slugs traduits** (config Laravel `config/routes-translations.php`) :

| Clé route | FR | EN | ES | DE | AR |
|---|---|---|---|---|---|
| pricing | tarifs | pricing | precios | preise | الأسعار |
| features | fonctionnalites | features | funcionalidades | funktionen | الميزات |
| faq | faq | faq | preguntas-frecuentes | faq | الأسئلة-الشائعة |
| blog | blog | blog | blog | blog | المدونة |
| contact | contact | contact | contacto | kontakt | اتصل-بنا |
| privacy | confidentialite | privacy-policy | privacidad | datenschutz | الخصوصية |
| terms | conditions-generales | terms-of-service | terminos | nutzungsbedingungen | الشروط |
| about | a-propos | about | sobre-nosotros | ueber-uns | من-نحن |
| register | inscription | register | registro | registrierung | التسجيل |
| login | connexion | login | iniciar-sesion | anmeldung | تسجيل-الدخول |
| status | statut | status | estado | status | الحالة |
| changelog | mises-a-jour | changelog | registro-cambios | aenderungsprotokoll | سجل-التغييرات |
| compare | comparatif | compare | comparar | vergleich | مقارنة |
| help | aide | help | ayuda | hilfe | المساعدة |
| roadmap | feuille-de-route | roadmap | hoja-de-ruta | roadmap | خارطة-الطريق |

**Composants Laravel** :
- `config/routes-translations.php` : mapping complet clés → slugs × 9 langues
- `config/locales.php` : langues supportées, mapping langue→pays, métadonnées
- `app/Services/LanguageDetectionService.php` : détection timezone + géoloc + navigateur
- `app/Http/Middleware/SetLocale.php` : parse l'URL, redirige si legacy (`/fr/tarifs` → `/fr-fr/tarifs`)
- `resources/views/components/seo/hreflang-tags.blade.php` : génère les 9 balises hreflang + x-default
- `resources/views/components/seo/canonical.blade.php` : URL canonique avec locale
- `app/Console/Commands/GenerateSitemaps.php` : génère un sitemap par locale + sitemap index

**Hreflang tags** (sur chaque page publique) :
```html
<link rel="alternate" hreflang="fr" href="https://app.example.com/fr-fr/tarifs" />
<link rel="alternate" hreflang="en" href="https://app.example.com/en-us/pricing" />
<link rel="alternate" hreflang="es" href="https://app.example.com/es-es/precios" />
<link rel="alternate" hreflang="de" href="https://app.example.com/de-de/preise" />
<link rel="alternate" hreflang="pt" href="https://app.example.com/pt-pt/precos" />
<link rel="alternate" hreflang="ru" href="https://app.example.com/ru-ru/tseny" />
<link rel="alternate" hreflang="zh-Hans" href="https://app.example.com/zh-cn/jiage" />
<link rel="alternate" hreflang="hi" href="https://app.example.com/hi-in/mulya" />
<link rel="alternate" hreflang="ar" href="https://app.example.com/ar-sa/الأسعار" />
<link rel="alternate" hreflang="x-default" href="https://app.example.com/en-us/pricing" />
```

**Scope** : Uniquement les pages publiques (landing, pricing, blog, FAQ, légal, comparatifs, roadmap, etc.). Le dashboard authentifié n'utilise PAS de slugs traduits.

### 17.3 Contenu des Messages Telegram (Multi-langue)

- **Message par langue** : chaque campagne/séquence peut avoir des variantes par langue
- **Détection** : basée sur le `language_code` Telegram de l'abonné
- **Fallback** : si pas de variante dans la langue de l'abonné → langue par défaut du bot
- **Variables** : identiques dans toutes les langues
- **Aide à la traduction** : bouton "Traduire automatiquement" (via API de traduction) avec relecture manuelle
- **Preview par langue** : dans l'éditeur, switcher entre les langues pour vérifier chaque variante

---

## 18. Multi-Devise

### 18.1 Devises Supportées

| Devise | Code | Symbole | Région |
|---|---|---|---|
| Euro | EUR | € | Europe |
| US Dollar | USD | $ | International |
| Livre Sterling | GBP | £ | UK |
| Franc Suisse | CHF | CHF | Suisse |
| Franc CFA (BCEAO) | XOF | FCFA | Afrique de l'Ouest |
| Franc CFA (BEAC) | XAF | FCFA | Afrique Centrale |
| Dirham Marocain | MAD | MAD | Maroc |
| Dollar Canadien | CAD | C$ | Canada |
| Dollar Australien | AUD | A$ | Australie |
| Real Brésilien | BRL | R$ | Brésil |
| Rouble Russe | RUB | ₽ | Russie |
| Roupie Indienne | INR | ₹ | Inde |
| Yuan Chinois | CNY | ¥ | Chine |

### 18.2 Fonctionnement

- **Affichage** : prix affichés dans la devise préférée de l'utilisateur
- **Facturation** : Stripe gère la conversion au moment du paiement
- **Taux de change** : mis à jour automatiquement (API externe) ou manuellement par l'admin
- **Arrondi** : selon les conventions de la devise (0 décimales pour FCFA, 2 pour EUR, etc.)

---

## 19. Sécurité

### 19.1 Authentification

- **Inscription** : email + mot de passe (validation email obligatoire)
- **Connexion** : email + mot de passe
- **2FA** : TOTP (Google Authenticator, Authy) — optionnel mais recommandé
  - **Codes de récupération** : 8 codes à usage unique générés à l'activation du 2FA
  - Le client doit les sauvegarder (affichés une seule fois, téléchargeables en fichier texte)
  - Si l'appareil 2FA est perdu → connexion via un code de récupération
  - Si tous les codes sont utilisés → contacter le support avec vérification d'identité (email + pièce d'identité)
  - Régénération des codes possible depuis les paramètres (§5.4) si connecté
- **OAuth** : Google, GitHub (optionnel, phase future)
- **Sessions** : expiration configurable, révocation individuelle ou globale
- **Brute force** : rate limiting sur le login (5 tentatives puis lockout 15 min)
- **Mots de passe** : minimum 8 caractères, bcrypt hashing

### 19.2 API

- **Tokens Sanctum** : générés par l'utilisateur, révocables
- **Scopes** : permissions granulaires par token (read, write, admin)
- **Rate limiting** : par token, configurable par plan
- **IP whitelist** : optionnel, restreindre les tokens à certaines IPs
- **HTTPS** : obligatoire pour toutes les requêtes API

### 19.3 Protection des Données

- **Chiffrement** : données sensibles (tokens Telegram) chiffrées en base (AES-256)
- **RGPD** :
  - Export des données personnelles (droit d'accès)
  - Suppression du compte et de toutes les données (droit à l'oubli)
  - Consentement explicite à l'inscription
  - DPA (Data Processing Agreement) disponible
- **Backup** : sauvegarde quotidienne automatique de la base PostgreSQL
- **Audit log** : toutes les actions sensibles sont loguées (qui, quoi, quand, IP)

### 19.4 Infrastructure

- **CSRF** : protection Laravel native
- **XSS** : Blade auto-escaping + CSP headers
- **SQL Injection** : Eloquent ORM paramétré
- **CORS** : configuration stricte (origins autorisées)
- **Headers sécurité** : HSTS, X-Frame-Options, X-Content-Type-Options, etc.
- **Dépendances** : Composer audit automatisé dans CI/CD

### 19.5 Rétention des Données & Archivage

**Politique de rétention** :

| Donnée | Rétention | Après expiration |
|---|---|---|
| Compte actif (abonnement en cours) | Illimitée | — |
| Compte suspendu (impayé) | 30 jours | Données supprimées (soft delete → hard delete) |
| Compte supprimé par le client | 7 jours (délai d'annulation) + 30 jours de grâce | Suppression définitive |
| Analytics par campagne | 24 mois glissants | Agrégées (totaux conservés, détails supprimés) |
| Logs d'audit | 12 mois | Archivés (stockage froid), consultables sur demande |
| Logs applicatifs (erreurs, debug) | 90 jours | Supprimés |
| Media Library (fichiers uploadés) | Tant que le compte est actif | Supprimés avec le compte |
| Messages Telegram (historique chat) | 12 mois | Purgés automatiquement |
| Webhooks logs (tentatives entrantes/sortantes) | 30 jours | Supprimés |
| Backups base de données | 30 jours (rétention glissante) | Remplacés par les nouveaux backups |

**Archivage des campagnes** :
- Les campagnes terminées depuis > 6 mois sont automatiquement **archivées** (séparées des campagnes actives)
- Archivées = consultables en lecture seule (stats, contenu) mais n'apparaissent plus dans les listes principales
- Bouton "Voir les archives" dans la section Campagnes
- Le client peut manuellement archiver/désarchiver une campagne
- Les campagnes archivées **ne comptent pas** dans le quota de "campagnes actives" du plan

**Downgrade de plan** :
- Si le client downgrade et dépasse les limites du nouveau plan :
  - Les bots excédentaires sont **désactivés** (pas supprimés) — le client choisit lesquels garder
  - Les abonnés excédentaires ne sont pas supprimés, mais l'envoi de messages est bloqué jusqu'à repassage sous le seuil
  - Les médias excédentaires : avertissement + 30 jours pour supprimer manuellement, sinon les plus anciens sont purgés
  - Les workspaces excédentaires sont gelés (lecture seule)

**Export avant suppression** :
- Avant toute suppression de compte, un export complet est proposé (ZIP : subscribers CSV, campaigns JSON, analytics CSV, media)
- Email envoyé 7 jours avant la suppression effective avec lien de téléchargement

---

## 20. Emails Transactionnels

### 20.1 Emails Système (Plateforme)

| Email | Déclencheur |
|---|---|
| Bienvenue | Inscription |
| Vérification email | Inscription |
| Mot de passe oublié | Demande de reset |
| Changement de mot de passe | Confirmation |
| Facture | Paiement réussi |
| Échéance proche | J-3 avant renouvellement |
| Paiement échoué | Échec de paiement |
| Compte suspendu | Après 7 jours d'impayé |
| Compte réactivé | Paiement reçu après suspension |
| Rapport hebdomadaire | Chaque lundi (opt-in) |
| Rapport mensuel | Premier du mois (opt-in) |
| Nouveau membre d'équipe | Invitation envoyée |
| Alerte quota | 80% / 90% / 100% du quota atteint |
| Alerte sécurité | Nouvelle connexion depuis IP inconnue |

**Séquence d'Onboarding Email (Nurturing)** :
Emails automatiques pour accompagner les nouveaux clients et les convertir en payants :

| Timing | Sujet | Objectif |
|---|---|---|
| J+0 (immédiat) | "Bienvenue ! Votre bot est prêt" | Confirmer l'inscription, lien vers le wizard |
| J+1 | "3 astuces pour vos 100 premiers abonnés" | Aider à obtenir les premiers subscribers |
| J+3 | "Votre première campagne en 2 minutes" | Pousser à envoyer le premier broadcast |
| J+7 | "Créez une séquence qui travaille pour vous" | Découvrir les automations |
| J+10 | "Vos stats de la première semaine" | Montrer la valeur (résumé personnalisé) |
| J+12 (si Free/Essai) | "Débloquez les analytics avancées — Upgrade" | Inciter à passer payant |
| J+14 (fin d'essai) | "Votre essai se termine demain" | Urgence conversion |
| J+15 (essai expiré) | "Votre essai est terminé — 20% de réduction aujourd'hui" | Dernière chance |
| J+30 (si toujours Free) | "Vos abonnés vous attendent" | Re-engagement |
| J+60 (si inactif) | "On peut vous aider ?" | Dernier email avant désactivation |

- Chaque email est **personnalisé** (nom, stats réelles du client, nom du bot)
- **Désactivation** : le client peut se désinscrire de la séquence (lien en bas de chaque email)
- **Conditions** : si le client a déjà upgradé, les emails de conversion sont automatiquement stoppés
- **Templates configurables** par l'admin (§20.2)

### 20.2 Templates

- Tous les emails sont **personnalisables** par l'admin
- **Variables dynamiques** : `{user.name}`, `{plan.name}`, `{invoice.amount}`, etc.
- **Design** : template HTML responsive avec le branding de la plateforme
- **Langue** : email envoyé dans la langue de l'utilisateur

---

## 21. Notifications

### 21.1 Notifications In-App

- Cloche de notifications dans le dashboard
- Notifications pour :
  - Campagne terminée
  - Séquence terminée
  - Quota proche de la limite
  - Nouveau membre d'équipe
  - Paiement réussi/échoué
  - Erreur webhook
  - Nouveau subscriber marquant (1000ème, etc.)

### 21.2 Notifications par Email (Opt-in)

- Même liste que ci-dessus
- Configurable individuellement par l'utilisateur

### 21.3 Notifications Telegram (Meta)

- Le client peut recevoir des notifications de la plateforme **via Telegram**
- Connecter son propre Telegram pour recevoir les alertes
- Pratique pour les alertes en temps réel (campagne terminée, nouveau subscriber, etc.)

---

## 22. Gestion d'Équipe & Multi-Workspace

### 22.1 Membres

- **Invitation** par email
- **Rôle** : Admin d'équipe, Éditeur, Viewer
- **Permissions par membre** :
  - Gérer les campagnes
  - Gérer les abonnés
  - Voir les analytics
  - Gérer les bots
  - Gérer la facturation
- **Limite** : selon le plan (1, 3, 10, illimité)

### 22.2 Journal d'Activité

- Historique de qui a fait quoi dans l'équipe
- Filtrable par membre, par type d'action, par date

### 22.3 Multi-Workspace (Agences)

- **Concept** : un seul compte peut gérer **plusieurs espaces de travail** (workspaces)
- **Use case** : une agence marketing qui gère les campagnes Telegram de plusieurs clients
- **Fonctionnement** :
  - Chaque workspace a ses propres bots, abonnés, campagnes, analytics
  - Les données sont **totalement isolées** entre workspaces
  - Switch rapide entre workspaces (dropdown dans le header)
  - Facturation centralisée (un seul abonnement pour tous les workspaces)
- **Limites par plan** :
  - Starter : 1 workspace
  - Pro : 5 workspaces
  - Enterprise : illimité
- **Rapports multi-workspace** : vue consolidée de tous les workspaces (pour le propriétaire)

### 22.4 White Label / Custom Branding (Enterprise)

Réservé au plan Enterprise, le white label permet au client de présenter la plateforme sous sa propre marque.

**Personnalisation visuelle** :
- Logo personnalisé (remplace le logo de la plateforme dans le dashboard)
- Couleurs : couleur primaire, accent, favicon personnalisés
- Nom de l'application personnalisé (affiché dans le header, les onglets, les emails)
- Page de connexion brandée (logo du client, couleurs, message d'accueil)

**Domaine personnalisé** :
- Dashboard accessible via le domaine du client : `app.client.com` (CNAME vers notre infra)
- Deep links Telegram sous le domaine du client : `t.me/ClientBot?start=...` (le bot est déjà au nom du client)
- Landing pages hébergées sous le domaine du client : `join.client.com/mon-bot`
- Certificat SSL automatique (Let's Encrypt)

**Emails brandés** :
- Emails transactionnels envoyés depuis le domaine du client (SMTP configurable ou sous-domaine)
- Template d'email avec le branding du client (logo, couleurs, footer)
- Adresse d'expéditeur : `noreply@client.com`

**Suppression de notre marque** :
- Badge "Powered by [Notre Marque]" supprimable (option Enterprise)
- Aucune mention de notre plateforme visible par les utilisateurs finaux du client
- Widgets embarquables sous la marque du client

**Limites** :
- La console d'administration (§4) reste sous notre marque (c'est notre outil interne)
- Le white label concerne uniquement le dashboard client, les emails, les pages publiques et les widgets
- Configuration par workspace (un client Enterprise peut avoir un branding différent par workspace)

---

## 23. Pages Publiques

### 23.1 Site Vitrine (Marketing) — Faire Connaître l'Outil

Le site vitrine est la **porte d'entrée** pour acquérir de nouveaux clients. Il doit être rapide, beau, convaincant et optimisé SEO. Multilingue (9 langues).

**Page d'accueil (Landing Page)** :
- **Hero section** :
  - Titre accrocheur : proposition de valeur en une phrase
  - Sous-titre : explication en 2 lignes de ce que fait l'outil
  - CTA principal : "Essai gratuit 14 jours" (bouton proéminent)
  - CTA secondaire : "Voir la démo"
  - Illustration / screenshot animé du dashboard
  - Badge de confiance : "Aucune carte bancaire requise"
- **Section "Comment ça marche"** (3 étapes visuelles) :
  1. Connectez votre bot Telegram (icône + description)
  2. Importez ou obtenez des abonnés (icône + description)
  3. Lancez vos campagnes (icône + description)
- **Section fonctionnalités** (grille de cartes avec icônes) :
  - Broadcasts & programmation
  - Séquences automatiques (flow builder)
  - Chatbot / auto-réponses
  - Segments & tags intelligents
  - A/B Testing
  - Analytics en temps réel
  - API REST & webhooks
  - Channels & groupes
  - Multi-langue & multi-devise
  - Chaque carte : titre, icône, description courte, lien "En savoir plus"
- **Section "Intégrez avec votre stack"** :
  - Logos des technologies compatibles : WordPress, Shopify, Laravel, React, Node.js, Python, Zapier, n8n
  - "Compatible avec n'importe quelle plateforme via API REST + SDKs"
  - Extrait de code (3 lignes) montrant la simplicité de l'API
- **Section social proof** :
  - Compteurs animés : "X messages envoyés", "X bots connectés", "X pays"
  - Témoignages clients (photo, nom, entreprise, citation)
  - Logos clients (quand disponibles)
  - Note moyenne / avis (quand disponibles)
- **Section comparaison** :
  - Tableau "Nous vs ManyChat vs Chatfuel vs SendPulse"
  - Avantages : 100% gratuit Telegram API, pas de frais par message, multi-langue natif
- **Section CTA final** :
  - "Prêt à automatiser votre Telegram ?"
  - Bouton "Commencer gratuitement"
  - "14 jours d'essai · Aucune CB requise · Annulation en 1 clic"
- **Footer** :
  - Liens : Fonctionnalités, Tarifs, API, Blog, Support, CGV, Confidentialité, Mentions légales
  - Sélecteur de langue (9 langues)
  - Réseaux sociaux (Twitter/X, LinkedIn, Telegram channel)
  - "Made with ❤️ by [Nom de l'entreprise]"

**Page Tarifs (Pricing)** :
- Comparaison visuelle des 4 plans (Free / Starter / Pro / Enterprise) en colonnes
- Toggle mensuel / annuel (avec badge "-17% annuel")
- Mise en avant du plan recommandé (Pro) avec bordure colorée
- Bouton CTA par plan : "Commencer" / "Essai gratuit" / "Nous contacter"
- Section "Questions fréquentes sur les tarifs" (accordion)
- Badge devises : affichage dans la devise détectée (ou sélectionnable)
- Garantie : "Satisfait ou remboursé 30 jours"
- Section "Entreprise / Volume" : formulaire de contact pour devis sur mesure

**Page Fonctionnalités (Features)** :
- Une sous-page détaillée par grande fonctionnalité :
  - `/features/broadcasts` — Campagnes & broadcasts
  - `/features/automation` — Séquences automatiques
  - `/features/chatbot` — Chatbot & auto-réponses
  - `/features/analytics` — Analytics & reporting
  - `/features/api` — API, SDKs & intégrations
  - `/features/channels` — Channels & groupes
- Chaque page : captures d'écran, description détaillée, CTA "Essayer gratuitement"

**Page Intégrations** :
- Liste de toutes les intégrations (API, SDKs, webhooks, Zapier, n8n, widgets)
- Guide rapide par plateforme : "Comment connecter Telegram à votre WordPress / Shopify / Laravel / etc."
- Lien vers la documentation API

**FAQ** :
- Questions organisées par catégorie : Général, Tarifs, Technique, Sécurité, Telegram
- Schema.org FAQPage pour le SEO
- Accordion interactif
- Barre de recherche dans la FAQ

**Blog (SEO / Content Marketing)** :
- Articles Markdown avec éditeur admin (Filament)
- Catégories : Tutoriels, Bonnes pratiques, Études de cas, Actualités Telegram, Comparatifs
- Auteur, date, temps de lecture estimé
- Tags et articles liés
- Partage social (Twitter, LinkedIn, Telegram)
- Newsletter : inscription pour recevoir les nouveaux articles
- SEO : title, meta description, og:image, JSON-LD Article, sitemap
- Objectif : 2-4 articles/mois pour le référencement naturel
- Exemples d'articles :
  - "10 astuces pour augmenter votre taux de clic sur Telegram"
  - "Telegram vs WhatsApp Business : quel canal choisir en 2026 ?"
  - "Comment créer une séquence d'onboarding qui convertit"
  - "Guide complet : connecter votre Shopify à Telegram en 5 minutes"

**Pages légales** :
- CGV (Conditions Générales de Vente)
- Politique de confidentialité (RGPD compliant)
- Mentions légales
- DPA (Data Processing Agreement) téléchargeable
- Politique de cookies (bandeau cookie consent)
- Toutes en 9 langues

**Démo interactive** :
- Page `/demo` avec un bot de démonstration en sandbox
- Le visiteur peut tester l'envoi d'un message, voir le dashboard avec des données fictives
- Pas besoin de créer un compte
- Objectif : montrer la puissance de l'outil avant l'inscription

**Page Contact & Démo** :
- **Page `/contact`** :
  - Formulaire : nom, email, entreprise, objet (dropdown : question générale, partenariat, presse, Enterprise), message
  - Informations de contact : email support, réseaux sociaux
  - Carte géographique (si bureau physique) ou mention "100% remote"
- **Booking Démo Enterprise** :
  - Intégration Calendly (ou équivalent) : le prospect Enterprise peut réserver un créneau de 30 min
  - Accessible depuis la page Tarifs (bouton "Nous contacter" du plan Enterprise) et la page Contact
  - Confirmation automatique par email + rappel 1h avant
- **Formulaire "Devis sur mesure"** (Enterprise) :
  - Nombre de subscribers estimé, volume de messages, besoins spécifiques (white label, SLA, support dédié)
  - Notification aux Super Admins (email + Telegram)

**SEO Technique** :
- SSR Blade (rendu serveur, pas de SPA pour les pages publiques)
- Sitemap XML auto-générée (spatie/laravel-sitemap)
- URLs localisées avec slugs traduits : `/fr-fr/tarifs`, `/en-us/pricing`, `/es-es/precios`, `/de-de/preise`, `/zh-cn/jiage`...
- Balises `hreflang` pour chaque page × chaque langue
- Schema.org : SoftwareApplication, FAQPage, PricingTable, Article, Organization
- Open Graph + Twitter Cards pour le partage social
- Core Web Vitals optimisés (LCP < 1.5s)
- Compression Brotli + cache agressif sur pages statiques

### 23.2 Pages Auth

- **Inscription** : email + mot de passe + sélection langue + devise préférée
- **Connexion** : email + mot de passe (+ 2FA si activé)
- **Mot de passe oublié** : email de reset avec lien sécurisé (expire en 1h)
- **Vérification email** : page de confirmation après clic sur le lien
- **Invitation d'équipe** : accepter l'invitation + créer son compte (pré-rempli)
- **Design** : cohérent avec le site vitrine, logo, couleurs, dark mode
- **Social login** (phase future) : Google, GitHub

---

## 24. Mini App Telegram (Phase Future)

### 24.1 Concept

- Application web intégrée directement dans Telegram
- Accessible via le bouton menu du bot
- Permet aux abonnés de :
  - Voir leur profil / statut
  - Gérer leurs préférences de notification
  - Accéder à du contenu exclusif
  - Effectuer des achats (Telegram Stars)
  - Participer à des quiz/sondages interactifs

### 24.2 Use Cases

- **SOS-Expat Chatter** : mini app pour voir ses gains, son lien d'affiliation, ses stats
- **E-commerce** : catalogue produits + achat dans Telegram
- **Événements** : inscription + QR code du billet

---

## 25. Phases de Développement

### Phase 1 — MVP (5-7 semaines)

**Backend & Infrastructure**
- [ ] Setup projet Laravel 11 + PostgreSQL 16 + Redis + Vite
- [ ] Architecture multi-tenant : global scope `workspace_id` sur toutes les tables + RLS PostgreSQL (§26.6)
- [ ] Authentification (inscription, login, 2FA TOTP, email verification)
- [ ] Rôles et permissions RBAC (super admin, admin, client, ulixai, viewer)
- [ ] Connexion bot Telegram (token + webhook + validation getMe)
- [ ] Gestion des abonnés (liste paginée, tags, import/export CSV)
- [ ] Deep links avec tracking UTM + génération QR codes
- [ ] Broadcasts simples (texte, image, boutons inline)
- [ ] Programmation d'envoi (date/heure + gestion des fuseaux horaires UTC, §10.2)
- [ ] Media Library avec chunked upload + compression images
- [ ] Variables globales + variables abonnés + contenu conditionnel
- [ ] Système d'abonnement Stripe : plans CRUD, prix par devise, facturation, prorata, forcer gratuit (§4.3)
- [ ] TVA/taxes par pays + vérification VIES + factures PDF conformes (§4.3)
- [ ] API REST v1 (endpoints abonnés + campagnes + tags + rate limiting par plan)
- [ ] Webhooks entrants (endpoint par client + mapping JSON)
- [ ] Blacklist globale
- [ ] Emails transactionnels : bienvenue, vérification, facture, relance paiement (§20)
- [ ] Multilingue backend (FR + EN)
- [ ] Déploiement : staging + production (Hetzner VPS + GitHub Actions CI/CD, §26.7)

**Frontend & UI**
- [ ] Design System : bibliothèque de composants Blade/Livewire (boutons, inputs, modales, tables, cards, badges, toasts, skeleton loaders)
- [ ] Console admin Filament 3 :
  - [ ] Dashboard admin global (KPIs, graphiques, §4.1)
  - [ ] Gestion utilisateurs (liste, fiche, actions admin, §4.2)
  - [ ] Gestion plans/tarifs/prix par devise (CRUD complet, §4.3)
  - [ ] Gestion coupons et promotions (§4.3)
  - [ ] Tableau de bord paiements (liste, filtres, paiements échoués, §4.3)
  - [ ] Monitoring technique (queues, Redis, PostgreSQL, §4.4)
  - [ ] Paramètres globaux (SMTP, Stripe, templates emails, §4.5)
- [ ] Dashboard client Livewire 3 (home KPIs, liste campagnes, abonnés)
- [ ] Page paramètres client : profil, sécurité 2FA, sessions, notifications, tokens API, danger zone (§5.4)
- [ ] Page facturation client : plan actuel, jauges quotas, factures PDF, upgrade/downgrade (§5.2)
- [ ] Éditeur de message Tiptap 2 (WYSIWYG, variables, boutons inline, preview)
- [ ] ApexCharts : graphiques de base (courbe abonnés, barres messages/jour)
- [ ] FullCalendar 6 : calendrier des campagnes programmées
- [ ] Dark mode (toggle + persistance localStorage + profil)
- [ ] Responsive mobile (Tailwind breakpoints)
- [ ] Pages publiques SSR Blade (landing, tarifs, inscription, connexion, CGV, confidentialité)

### Phase 2 — Automation, Analytics & Cross-Canal (4-5 semaines)

**Backend**
- [ ] Séquences automatiques (modèle de données, déclencheurs, conditions)
- [ ] Cross-canal : Telegram + Email dans une même séquence
- [ ] Auto-réponses par mot-clé (exact, contient, regex)
- [ ] Segments dynamiques (recalcul temps réel)
- [ ] Scoring d'engagement automatique (0-100)
- [ ] Frequency capping (global + par campagne)
- [ ] Re-engagement automatique des inactifs
- [ ] A/B Testing campagnes (jusqu'à 5 variantes, victoire automatique)
- [ ] Clonage de campagnes + sauvegarde comme template
- [ ] Webhooks sortants + retry backoff exponentiel + signature HMAC + tous événements (§15.1)
- [ ] Analytics avancées (funnels, cohortes, heatmaps horaires)
- [ ] Deliverability monitoring + score de santé bot
- [ ] Notifications (in-app + email + Telegram)
- [ ] Multilingue complet (9 langues)
- [ ] Multi-devise (13 devises, taux de change auto)
- [ ] Batch API (tags en masse, messages en masse, import async)
- [ ] Add-ons payants : packs abonnés/messages/stockage supplémentaires (§4.3)
- [ ] Remboursements et crédits Stripe + avoirs PDF (§4.3)
- [ ] Knowledge base / help center : articles par catégorie, recherche, 9 langues (§5.5)
- [ ] Système de tickets support (formulaire, priorité par plan, suivi statut, §5.5)
- [ ] Import depuis concurrents (ManyChat, ChatFuel, SendPulse — CSV + guide migration, §9.7)

**Frontend**
- [ ] **Vue Flow** : flow builder visuel drag & drop pour séquences (composant Vue 3 embarqué dans Livewire)
- [ ] Preview device Telegram (mockup iPhone/Android/Desktop temps réel)
- [ ] Command palette (Ctrl+K) : recherche globale + actions rapides
- [ ] Raccourcis clavier (Ctrl+N, G+H, G+C, etc.)
- [ ] Virtual scrolling pour listes > 500 items
- [ ] Wizard d'onboarding (5 étapes, première campagne en < 10 min)
- [ ] Templates prêts à l'emploi (campagnes + séquences, 9 langues)
- [ ] Dashboard "Aujourd'hui" (actions urgentes, résumé rapide, timeline)
- [ ] Undo/Pause envoi (délai 30 sec + bouton annuler)
- [ ] Vues visuelles : pipeline Kanban, cartes campagne, funnel, radar engagement, heatmap horaire (§5.3)
- [ ] Console admin : gestion remboursements/crédits, add-ons, historique prix (§4.3)
- [ ] Console admin : boîte de réception tickets support, assignation, réponses types (§5.5)
- [ ] Centre d'aide client : navigation articles, recherche, suggestions contextuelles (§5.5)
- [ ] Tests E2E Playwright (parcours inscription → première campagne)

### Phase 3 — Chatbot, Live Chat, Channels & Groupes (4-5 semaines)

**Backend**
- [ ] Chatbot flows (modèle de données, validation, sauvegarde réponses)
- [ ] Live chat : WebSockets via Laravel Reverb (messages temps réel)
- [ ] Gestion de Channels Telegram (posting, programmation, stats, RSS auto)
- [ ] Gestion de Groupes Telegram (modération auto, anti-spam, stats)
- [ ] Content approval workflow (brouillon → revue → approuvé)
- [ ] Telegram Bot Payments (Stripe, Telegram Stars, factures)
- [ ] Analytics polls/quiz + tracking réactions emoji
- [ ] Champs personnalisés avancés (8 types)
- [ ] Rapports PDF/XLSX exportables + rapports planifiés
- [ ] Gestion d'équipe complète (invitation, rôles, journal d'activité)
- [ ] Multi-workspace isolé (agences, facturation centralisée)
- [ ] Documentation API Swagger/OpenAPI 3.0 auto-générée
- [ ] Anti-abus & modération : détection automatique spam, score de risque, workflow avertissement/limitation/suspension (§4.7)
- [ ] Business Intelligence propriétaire : dashboard BI cross-clients, revenus, cohortes, alertes business (§4.6)
- [ ] Status page publique : composants monitorés, historique incidents, abonnement alertes (§5.5)
- [ ] Changelog : entrées datées, badge "Nouveau" dans le dashboard (§5.5)
- [ ] Chat in-app support (Pro/Enterprise) : widget, horaires, conversion en ticket hors horaires (§5.5)
- [ ] Rétention des données : archivage campagnes > 6 mois, gestion downgrade, export avant suppression (§19.5)
- [ ] Politique d'utilisation acceptable (AUP) : document + validation inscription (§4.7)

**Frontend**
- [ ] **Vue Flow** : flow builder chatbot (blocs question/condition/sauvegarde/transfert)
- [ ] Live chat inbox Vue 3 + Laravel Echo (conversations temps réel, présence)
- [ ] Éditeur de posts channel (programmation, récurrence, éditeur riche)
- [ ] Dashboard modération groupes (mots interdits, stats membres)
- [ ] Rapports PDF : génération et preview dans le dashboard
- [ ] Console admin : dashboard BI propriétaire avec graphiques (revenus, cohortes, carte géo, §4.6)
- [ ] Console admin : module anti-abus (score de risque, logs modération, actions, §4.7)
- [ ] Status page frontend (composants, statut temps réel, historique, §5.5)
- [ ] Page changelog publique (§5.5)
- [ ] Tests Playwright : chatbot flow creation, live chat, channel posting
- [ ] Tests a11y automatisés (axe-core via Playwright)

### Phase 4 — Scale, SDKs, PWA & Premium (3-4 semaines)

**Backend & API**
- [ ] SDKs clients (PHP, JavaScript/Node.js, Python)
- [ ] Widgets embarquables (JS popup, QR code, landing page hébergée)
- [ ] Postman Collection exportable
- [ ] Mini App Telegram (profil abonné, préférences, contenu exclusif)
- [ ] Intégrations natives (Zapier, n8n, Make, Facebook Conversions API, Google Analytics)
- [ ] White label Enterprise complet : domaine custom, emails brandés, suppression marque (§22.4)
- [ ] OAuth (Google, GitHub)
- [ ] Programme de parrainage client → client : lien unique, crédits, anti-fraude (§3.4)
- [ ] Sandbox API : environnement isolé par client, données fictives, reset (§26.7)
- [ ] API versioning (v1 stable, dépréciation headers)
- [ ] Performance : optimisation queues, caching agressif, read replicas
- [ ] Tests de charge (30 msg/sec minimum)

**Frontend & UX**
- [ ] PWA complète (manifest, service worker Workbox 7, push notifications, cache offline)
- [ ] Blog SEO (articles Markdown, 9 langues, JSON-LD, sitemap, hreflang)
- [ ] Page contact + booking démo Calendly Enterprise (§23.1)
- [ ] Dashboard parrainage client (lien, stats filleuls, crédits, partage social, §5.4)
- [ ] Console admin : white label config par client Enterprise (§22.4)
- [ ] Démo interactive publique : sandbox visiteur sans inscription (§23.1)
- [ ] Audit accessibilité WCAG 2.2 AA complet (NVDA, VoiceOver)
- [ ] Audit performance (Core Web Vitals : LCP < 1.5s, FID < 100ms, CLS < 0.1)
- [ ] Tests visuels régression (Playwright screenshots pages critiques)
- [ ] Documentation utilisateur in-app (tooltips, page aide, tutoriels interactifs)

---

## 26. Contraintes Techniques

### 26.1 Performance
- Temps de réponse API : < 200ms (P95)
- Envoi broadcast : min 30 messages/seconde
- Dashboard : chargement < 2 secondes
- Queue : aucun job en attente > 5 minutes

### 26.2 Disponibilité
- SLA cible : 99.9% uptime
- Monitoring : healthcheck endpoint + alertes
- Graceful degradation : si Redis tombe, fallback sur database queue

### 26.3 Scalabilité
- Architecture stateless (scaling horizontal possible)
- Queue workers séparés (scale indépendant)
- PostgreSQL : read replicas si nécessaire
- Redis cluster si nécessaire

### 26.4 Compatibilité Navigateurs
- Chrome, Firefox, Safari, Edge (2 dernières versions)
- Mobile : responsive (Tailwind)
- Pas besoin de support IE

### 26.5 Respect des ToS Telegram
- Opt-in obligatoire (user doit envoyer /start)
- Pas d'import de Telegram IDs sans consentement
- Pas de spam (contenu de valeur uniquement)
- Unsubscribe facile (/stop)
- Rate limiting respecté (30 msg/s standard)

### 26.6 Architecture Multi-Tenant

- **Approche** : shared database avec colonne `workspace_id` sur toutes les tables tenant-aware
- **Isolation** :
  - Chaque requête Eloquent est automatiquement scopée par `workspace_id` (global scope Laravel)
  - Un client ne peut JAMAIS accéder aux données d'un autre client (même via API)
  - Tests automatisés pour vérifier l'isolation (tentative d'accès cross-tenant → 403)
- **PostgreSQL Row Level Security (RLS)** : couche de sécurité supplémentaire en base de données (failsafe si le scope applicatif échoue)
- **Indexes** : tous les indexes incluent `workspace_id` comme première colonne (performance)
- **Tables globales** (non tenant-scoped) :
  - `users` (comptes utilisateurs)
  - `plans` (plans d'abonnement)
  - `subscriptions` (abonnements Stripe)
  - `global_settings` (paramètres admin)
- **Tables tenant-scoped** (avec `workspace_id`) :
  - `bots`, `subscribers`, `campaigns`, `sequences`, `chatbot_flows`, `tags`, `segments`, `media`, `messages`, `analytics_*`, `webhooks`, `audit_logs`
- **Migration** : possibilité future de passer en database-per-tenant si besoin de scaling (schema identique, changement de connexion)

### 26.7 Environnements

| Environnement | Usage | URL | Base de données |
|---|---|---|---|
| **Local** | Développement | `localhost:8000` | PostgreSQL local |
| **Staging** | Tests / QA / Preview | `staging.tool.com` | PostgreSQL staging (données anonymisées) |
| **Production** | Clients réels | `app.tool.com` | PostgreSQL production |

- **Staging** :
  - Déploiement automatique sur chaque PR mergée dans `develop` (GitHub Actions)
  - Données : copie anonymisée de la production (noms, emails, tokens remplacés par des fakes)
  - Bot Telegram de test (token BotFather dédié au staging)
  - Stripe en mode test (pas de vrais paiements)
  - Accès : équipe interne uniquement (auth basique ou VPN)
- **Sandbox API** (pour les développeurs clients) :
  - Environnement isolé avec un bot de démonstration et des données fictives
  - Le client peut tester ses intégrations API sans affecter sa production
  - Même endpoints que la production mais préfixés `/sandbox/api/v1/...`
  - Réinitialisable à tout moment par le client (bouton "Reset sandbox")
- **Seeds / Fixtures** :
  - Script `php artisan db:seed` pour générer des données de démo (bots, subscribers, campagnes, analytics)
  - Utilisé en local et staging
  - Données réalistes (noms, dates, métriques) pour tester l'UX
- **Feature Flags** :
  - Déploiement progressif des nouvelles fonctionnalités (activées en staging → puis en production pour X% des clients → puis globalement)
  - Librairie : Laravel Pennant (natif Laravel 11)
  - Configurable dans la console admin (§4.5)

---

## 27. Livrables

| Livrable | Format |
|---|---|
| Code source (backend + frontend) | Repository Git (monorepo) |
| Documentation technique | Markdown dans le repo |
| Documentation API | Swagger / OpenAPI 3.0 auto-générée |
| SDKs clients | PHP (Composer), JS (npm), Python (pip) |
| Postman Collection | JSON importable |
| Guide d'installation | README.md + Docker Compose |
| Guide utilisateur | In-app (tooltips, page aide, tutoriels interactifs) |
| Knowledge base / Help center | Articles par catégorie, 9 langues (§5.5) |
| Design System | Storybook-like : démo composants Blade/Livewire |
| Tests backend | PHPUnit (unitaires) + Pest (feature tests) |
| Tests frontend | Playwright (E2E) + Laravel Dusk + axe-core (a11y) |
| CI/CD | GitHub Actions (lint, tests, build, deploy) |
| Monitoring | Laravel Pulse + Sentry (erreurs + performance) |
| Status page | Page publique avec composants monitorés (§5.5) |
| Backups | Script automatisé PostgreSQL (quotidien, rétention 30j) |
| Environnement staging | Staging complet avec données anonymisées (§26.7) |
| Sandbox API | Environnement test isolé par client développeur (§26.7) |
| Site vitrine multilingue | Landing, tarifs, features, FAQ, blog, légales — 9 langues (§23) |
| Guide de migration concurrents | Documentation ManyChat/ChatFuel/SendPulse → notre outil (§9.7) |
| Politique AUP | Document "Acceptable Use Policy" (§4.7) |
| Pages légales | CGV, confidentialité, mentions légales, DPA, cookies — 9 langues (§23.1) |

---

*Document généré le 2026-02-06. Version 5.2 — Cahier des charges complet et exhaustif : 27 sections, ~120 sous-sections, 2500 lignes, 117 tâches de développement réparties en 4 phases, 21 livrables.*
