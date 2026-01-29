# CAHIER DES CHARGES COMPLET
## Programme Partenaires Influenceurs SOS-Expat

**Version :** 1.0  
**Date :** 29 janvier 2026  
**Projet :** Système d'affiliation pour Admins de groupes, Forums et Influenceurs

---

# TABLE DES MATIÈRES

1. [Vue d'ensemble du programme](#1-vue-densemble-du-programme)
2. [Différences Chatters vs Influenceurs](#2-différences-chatters-vs-influenceurs)
3. [Gestion des rôles utilisateurs](#3-gestion-des-rôles-utilisateurs)
4. [Landing Page Influenceurs](#4-landing-page-influenceurs)
5. [Processus d'inscription](#5-processus-dinscription)
6. [Dashboard Influenceur](#6-dashboard-influenceur)
7. [Système de tracking et affiliation](#7-système-de-tracking-et-affiliation)
8. [Système de commissions](#8-système-de-commissions)
9. [Système de paiements](#9-système-de-paiements)
10. [Gamification](#10-gamification)
11. [Console Administration - Onglet Influenceurs](#11-console-administration---onglet-influenceurs)
12. [Système de notifications](#12-système-de-notifications)
13. [Multilingue (9 langues)](#13-multilingue-9-langues)
14. [Sécurité et anti-fraude](#14-sécurité-et-anti-fraude)
15. [Aspects légaux](#15-aspects-légaux)
16. [Structure base de données](#16-structure-base-de-données)
17. [Estimation du développement](#17-estimation-du-développement)

---

# 1. VUE D'ENSEMBLE DU PROGRAMME

## 1.1 Objectif

Créer un programme d'affiliation destiné aux administrateurs de groupes Facebook, forums, et influenceurs (YouTube, TikTok, Instagram) pour promouvoir SOS-Expat auprès de leurs communautés d'expatriés.

## 1.2 Cibles du programme

| Cible | Description | Exemples |
|-------|-------------|----------|
| Admins groupes Facebook | Administrateurs de groupes d'expatriés | "Français en Thaïlande", "Expats Dubai" |
| Admins pages Facebook | Gestionnaires de pages thématiques | Pages d'information expatriation |
| Admins forums | Modérateurs de forums d'expatriation | Forum-expat.com, forums locaux |
| YouTubeurs | Créateurs de contenu vidéo | Chaînes expatriation, voyage, lifestyle |
| TikTokeurs | Créateurs de contenu court | Conseils expat, vie à l'étranger |
| Instagrammeurs | Influenceurs photo/story | Comptes voyage et expatriation |
| Blogueurs | Propriétaires de sites web | Blogs sur l'expatriation par pays |

## 1.3 Proposition de valeur

### Pour l'Influenceur
- 10$ par client qui utilise SOS-Expat via son lien
- 5$ sur chaque appel reçu par les prestataires recrutés (pendant 6 mois)
- Programme de fidélité avec niveaux et bonus
- Top 10 mensuel avec récompenses
- Paiement automatique (PayPal, Wise, Mobile Money)
- Aucun investissement requis

### Pour les membres de sa communauté
- 5% de remise automatique sur toutes les prestations
- Accès à SOS-Expat avec un avantage exclusif
- Sentiment d'appartenance à une communauté privilégiée

### Pour SOS-Expat
- Acquisition de clients à coût maîtrisé (paiement à la performance)
- Accès à des communautés pré-qualifiées d'expatriés
- Crédibilité par l'endorsement d'influenceurs reconnus
- Scalabilité internationale massive
- Constitution d'une base de données des communautés d'expatriés

## 1.4 Modèle économique

| Type de commission | Montant | Déclencheur |
|-------------------|---------|-------------|
| Commission Client | 10$ | Paiement reçu par SOS-Expat |
| Commission Recrutement | 5$ par appel | Chaque appel reçu par un prestataire recruté (pendant 6 mois) |
| Remise Client | -5% | Automatique via le lien influenceur |

## 1.5 Charte graphique SOS-Expat

Tous les widgets, bannières et éléments visuels doivent respecter la charte graphique SOS-Expat.

### Couleurs principales

| Couleur | Code hex | Usage |
|---------|----------|-------|
| **Rouge SOS-Expat** | #DC2626 | **Couleur principale - OBLIGATOIRE** |
| Rouge foncé | #B91C1C | Hover, dégradés, accents |
| Rouge clair | #EF4444 | Variante légère |
| Blanc | #FFFFFF | Fonds, textes sur rouge |
| Noir | #1F2937 | Textes principaux |
| Gris | #6B7280 | Textes secondaires |

### Règles obligatoires

1. **Le rouge (#DC2626) est TOUJOURS la couleur dominante** sur tous les widgets et bannières
2. Le logo SOS-Expat doit être visible sur chaque élément
3. Contraste suffisant pour la lisibilité :
   - Texte blanc sur fond rouge
   - Texte noir sur fond blanc
4. Les boutons d'action (CTA) sont TOUJOURS en rouge
5. Les dégradés utilisent uniquement des variantes de rouge (#DC2626 → #B91C1C)

### Exemple de bouton CTA conforme

```html
<a href="..." style="background: linear-gradient(135deg, #DC2626, #B91C1C); color: white; padding: 14px 28px; border-radius: 8px;">
  🆘 Trouver un expert (-5%)
</a>
```

### Éléments visuels

- **Icône principale** : 🆘 (emoji SOS)
- **Police** : Sans-serif (Arial, Helvetica, système)
- **Coins** : Arrondis (8-12px de rayon)
- **Ombres** : Douces et subtiles

---

# 2. DIFFÉRENCES CHATTERS VS INFLUENCEURS

## 2.1 Tableau comparatif complet

| Aspect | Chatters | Influenceurs |
|--------|----------|--------------|
| **Profil cible** | Personnes motivées cherchant revenus complémentaires | Admins groupes, YouTubeurs, TikTokeurs, Instagrammeurs, blogueurs |
| **Effort requis** | Actif (poster, répondre, recruter) | Passif (poser le lien, l'audience fait le reste) |
| **Audience** | Doit aller chercher les clients | Audience déjà existante |
| **Inscription** | Quiz + Formation obligatoires | Directe (Landing page explicative) |
| **Téléphone requis** | Non | Non |
| **Quiz** | Oui (5 questions, 80% requis) | Non |
| **Formation** | Oui (obligatoire) | Non (Landing page suffit) |
| **Lien affilié** | `/ref/c/CODE` | `/ref/i/CODE` |
| **Remise client** | 0% | 5% automatique |
| **Commission appel client** | 10$ | 10$ |
| **Commission recrutement** | 5$ sur chaque appel reçu par les prestataires recrutés (6 mois) | 5$ sur chaque appel reçu par les prestataires recrutés (6 mois) |
| **Gamification** | Oui | Oui |
| **Niveaux et badges** | Oui | Oui |
| **Top 10 mensuel** | Oui (séparé) | Oui (séparé) |
| **Bonus Top 3** | Oui | Oui |
| **Journal des posts** | Oui (obligatoire) | Non |
| **Base groupes/forums** | Oui | Non (info à l'inscription) |
| **Zoom obligatoire** | Optionnel/Obligatoire | Non |
| **Infos communauté** | Pays de couverture (1-5) | URL + Nom + Langue + Pays + Thème |
| **Vérification** | Quiz automatique | Déclaratif |

## 2.2 Parcours utilisateur comparé

### Parcours Chatter
```
Inscription → Email → Quiz (3 min) → Formation (5 min) → Dashboard
Total : ~11 minutes avant accès
```

### Parcours Influenceur
```
Inscription → Email → Dashboard
Total : ~4 minutes avant accès (immédiat après email)
```

---

# 3. GESTION DES RÔLES UTILISATEURS

## 3.1 Règle fondamentale

**UN UTILISATEUR = UN SEUL RÔLE (exclusif)**

Un compte ne peut pas cumuler plusieurs rôles partenaires simultanément.

## 3.2 Les 4 rôles du système

| Rôle | Description | Dashboard | Peut devenir |
|------|-------------|-----------|--------------|
| **Client** | Utilise SOS-Expat pour trouver un prestataire | Dashboard Client | Chatter, Influenceur |
| **Prestataire** | Avocat, notaire, expert qui reçoit des appels | Dashboard Prestataire | Aucun (interdit) |
| **Chatter** | Programme d'affiliation actif | Dashboard Chatter | Influenceur (via support) |
| **Influenceur** | Admin groupe, créateur avec audience | Dashboard Influenceur | Chatter (via support) |

## 3.3 Restrictions de changement de rôle

### Prestataire → Chatter/Influenceur
- **INTERDIT** : Conflit d'intérêt
- Un prestataire ne peut pas être affilié

### Client → Chatter/Influenceur
- **AUTORISÉ** : À tout moment
- Parcours d'inscription standard du programme choisi

### Chatter ↔ Influenceur
- **AUTORISÉ** : Via support uniquement
- Conditions :
  - Solde doit être à 0$ (tout retiré)
  - Aucune commission en attente de validation
  - Demande via formulaire support
  - Validation par un administrateur
  - Ancien historique archivé (statistiques conservées)

## 3.4 Vérifications à l'inscription

Lors de l'inscription en tant qu'Influenceur, le système doit vérifier :
- L'email n'est pas déjà utilisé par un compte existant
- Si l'utilisateur existe déjà :
  - Refuser si rôle = "prestataire"
  - Refuser si rôle = "chatter" (proposer de contacter le support)
  - Autoriser si rôle = "client" (upgrade du compte)

## 3.5 Messages d'erreur

### Si l'utilisateur est déjà Prestataire
```
⚠️ Inscription impossible

Votre compte est enregistré comme Prestataire sur SOS-Expat.
Un prestataire ne peut pas participer au programme d'affiliation
pour des raisons de conflit d'intérêt.

[Retour à l'accueil]
```

### Si l'utilisateur est déjà Chatter
```
⚠️ Vous êtes déjà inscrit comme Chatter

Un compte ne peut avoir qu'un seul rôle partenaire.

Si vous souhaitez devenir Influenceur à la place :
1. Retirez votre solde disponible
2. Attendez la validation des commissions en cours
3. Contactez le support pour demander le changement

[Contacter le support]    [Retour au dashboard Chatter]
```

---

# 4. LANDING PAGE INFLUENCEURS

## 4.1 Objectif de la page

Expliquer clairement le fonctionnement du programme et convaincre les influenceurs de s'inscrire. Cette page remplace le quiz et la formation des Chatters.

## 4.2 Structure de la Landing Page

### Section 1 : Hero / Accroche

**Titre principal :** "PROGRAMME PARTENAIRES SOS-EXPAT"

**Sous-titre :** "Monétisez votre communauté d'expatriés"

**Accroche :**
- Vous êtes admin d'un groupe Facebook ?
- Vous avez une chaîne YouTube sur l'expatriation ?
- Vous gérez un forum de Français à l'étranger ?

**Call-to-action principal :** "CRÉER MON COMPTE GRATUITEMENT"

### Section 2 : Comment ça marche (4 étapes)

| Étape | Titre | Description |
|-------|-------|-------------|
| 1 | Inscrivez-vous | Créez votre compte gratuitement en 2 minutes |
| 2 | Obtenez votre lien unique | Un lien personnalisé avec -5% pour vos membres |
| 3 | Partagez avec votre communauté | En description, en post épinglé, en story... |
| 4 | Gagnez à chaque conversion | 10$ par client + 5$ sur chaque appel reçu par vos prestataires recrutés |

### Section 3 : Vos avantages (3 blocs)

| Avantage | Montant | Description |
|----------|---------|-------------|
| Commission Client | 10$ | Par client qui utilise SOS-Expat |
| Commission Recrutement | 5$ | Sur chaque appel reçu par vos prestataires recrutés (pendant 6 mois) |
| Remise Membres | -5% | Automatique pour tous vos membres |

### Section 4 : Programme de fidélité

**Explication :** "Plus vous convertissez, plus vous gagnez !"

| Niveau | Nom | Conversions | Bonus |
|--------|-----|-------------|-------|
| ⭐ | Apprenti | 0-10 | Commissions standard |
| ⭐⭐ | Confirmé | 11-50 | +5% bonus |
| ⭐⭐⭐ | Expert | 51-200 | +10% bonus |
| ⭐⭐⭐⭐ | Ambassadeur | 201-500 | +15% bonus |
| ⭐⭐⭐⭐⭐ | Élite | 500+ | +20% bonus |

**Mention :** "Débloquez des badges et atteignez le Top 10 mensuel !"

### Section 5 : Paiement simple

- PayPal, Wise ou Mobile Money
- Retirez dès 50$ de gains
- Paiement automatique sous 48h

### Section 6 : Call-to-action final

**Bouton principal :** "CRÉER MON COMPTE GRATUITEMENT"

**Lien secondaire :** "Déjà inscrit ? Se connecter"

## 4.3 Éléments visuels requis

- Icônes pour chaque étape et avantage
- Illustrations ou photos d'influenceurs
- Badges de niveaux visuels
- Logos des méthodes de paiement (PayPal, Wise, Mobile Money)
- Témoignages d'influenceurs (si disponibles)

## 4.4 Version multilingue

La Landing Page doit être disponible dans les 9 langues :
- Français, Anglais, Allemand, Russe, Chinois, Espagnol, Portugais, Arabe, Hindi

Détection automatique de la langue selon :
1. Paramètre URL (?lang=en)
2. Préférence navigateur
3. Défaut : Français

---

# 5. PROCESSUS D'INSCRIPTION

## 5.1 Formulaire d'inscription

### Champs - Informations personnelles

| Champ | Type | Obligatoire | Validation |
|-------|------|-------------|------------|
| Nom complet | Texte | Oui | Min 2 caractères, max 255 |
| Email | Email | Oui | Format email valide, unique dans la base |
| Mot de passe | Password | Oui | Min 8 caractères, 1 majuscule, 1 chiffre |
| Confirmer mot de passe | Password | Oui | Doit correspondre au mot de passe |
| Langue de l'interface | Select | Oui | 9 langues disponibles |

### Champs - Informations communauté

| Champ | Type | Obligatoire | Validation | Options/Notes |
|-------|------|-------------|------------|---------------|
| Plateforme | Select | Oui | - | Groupe Facebook, Page Facebook, YouTube, TikTok, Instagram, Blog/Site web, Forum, Autre |
| URL de la communauté | URL | Oui | Format URL valide | Doit commencer par http:// ou https:// |
| Nom de la communauté | Texte | Oui | Min 2, max 255 caractères | Ex: "Français en Thaïlande" |
| Nombre de membres/abonnés | Nombre | Oui | Min 100 | Entier positif |
| Langue de la communauté | Select | Oui | - | 9 langues disponibles |
| Pays ciblé | Select | Oui | - | 197 pays + option "Général (tous pays)" |
| Thématique | Texte libre | Oui | Min 2, max 255 caractères | Ex: "Expatriation, Juridique, Lifestyle" |

### Champs - Paiement

| Champ | Type | Obligatoire | Validation | Options/Notes |
|-------|------|-------------|------------|---------------|
| Méthode de paiement | Select | Oui | - | PayPal, Wise, Mobile Money |
| Détails paiement | Texte | Oui | Max 500 caractères | Email PayPal, IBAN Wise, numéro Mobile Money |

### Champs - Acceptations

| Champ | Type | Obligatoire | Notes |
|-------|------|-------------|-------|
| Accepte CGU | Checkbox | Oui | Lien vers les Conditions Générales |
| Certifie propriété | Checkbox | Oui | "Je certifie être admin/propriétaire de cette communauté" |

## 5.2 Flux d'inscription

```
1. Accès à la Landing Page
   ↓
2. Clic sur "Créer mon compte"
   ↓
3. Affichage du formulaire d'inscription
   ↓
4. Remplissage du formulaire
   ↓
5. Validation côté client (JavaScript)
   ↓
6. Soumission du formulaire
   ↓
7. Validation côté serveur
   ├── Si email existe déjà → Message d'erreur
   ├── Si données invalides → Affichage des erreurs
   └── Si OK → Création du compte
       ↓
8. Envoi email de vérification
   ↓
9. Page "Vérifiez votre email"
   ↓
10. Clic sur le lien dans l'email
    ↓
11. Vérification de l'email
    ↓
12. Redirection vers le Dashboard Influenceur
    ↓
13. Message de bienvenue + Lien affilié généré
```

## 5.3 Email de vérification

**Objet :** "Bienvenue dans le Programme Partenaires SOS-Expat - Confirmez votre email"

**Contenu :**
- Salutation personnalisée avec le nom
- Explication du programme
- Bouton "Confirmer mon email"
- Lien de secours en texte
- Rappel des avantages
- Contact support

**Expiration :** 24 heures

**Action si expiré :** Possibilité de renvoyer l'email depuis la page de connexion

## 5.4 Génération du code affilié

À la création du compte, générer automatiquement :
- Code affilié client unique (ex: `JEAN456`)
- Format : Prénom en majuscules + 3 chiffres aléatoires
- Vérification de l'unicité avant attribution
- Si collision : regénérer jusqu'à obtenir un code unique

---

# 6. DASHBOARD INFLUENCEUR

## 6.1 Vue d'ensemble

Le dashboard doit être :
- Mobile-first (responsive)
- Disponible dans les 9 langues
- Gamifié et motivant
- Simple et épuré (moins complexe que le dashboard Chatter)

## 6.2 Menu de navigation

| Icône | Section | Description |
|-------|---------|-------------|
| 🏠 | Accueil | Vue d'ensemble, tirelire, stats rapides |
| 📊 | Mes Gains | Détail des gains, historique, graphiques |
| 👥 | Mes Filleuls | Prestataires recrutés |
| 🏆 | Classement | Top 10 mensuel |
| 💰 | Paiements | Demandes de retrait, historique |
| 🎨 | Outils Promo | Bannières, widgets, codes, QR |
| 👤 | Profil | Informations personnelles et communauté |

## 6.3 Section Accueil

### 6.3.1 En-tête personnalisé

- Message de bienvenue : "Bonjour, [Prénom] ! 👋"
- Nom de la communauté : "[Nom du groupe] 📘"
- Niveau actuel avec étoiles : "Niveau: Expert ⭐⭐⭐"

### 6.3.2 Bloc Tirelire

**Élément principal :** Solde disponible en grand format
- Icône tirelire
- Montant en dollars : "$1,247.50"
- Bouton "Retirer 💸"

**Conditions d'affichage du bouton Retirer :**
- Visible si solde ≥ seuil minimum (50$)
- Grisé sinon avec message "Minimum 50$ requis"

### 6.3.3 Indicateurs rapides

| Indicateur | Description | Exemple |
|------------|-------------|---------|
| Streak | Jours consécutifs avec au moins 1 conversion | "🔥 Streak: 45 jours" |
| Gains du mois | Total des gains depuis le 1er du mois | "📊 Ce mois: $534.00" |
| Rang mensuel | Position dans le classement | "🎯 Rang: #2 / 156" |

### 6.3.4 Bloc Lien Affilié Client

- Titre : "🔗 Mon Lien Affilié"
- Sous-titre : "Vos membres bénéficient de -5%"
- Affichage du lien complet : `sos-expat.com/ref/i/JEAN456`
- Boutons d'action :
  - [Copier] : Copie le lien dans le presse-papier + feedback visuel
  - [Partager] : Ouvre le menu de partage natif (mobile) ou options de partage
  - [QR Code] : Affiche/télécharge le QR Code du lien
- Statistiques sous le lien :
  - Nombre de clics total
  - Nombre de conversions
  - Taux de conversion

### 6.3.5 Bloc Lien Recrutement

- Titre : "🎓 Lien Recrutement Prestataires"
- Affichage du lien : `sos-expat.com/ref/r/JEAN456`
- Boutons : [Copier] [Partager]
- Statistiques :
  - Nombre de prestataires recrutés
  - Gains générés par les filleuls

### 6.3.6 Aperçu Top 10

- Liste des 5 premiers du classement
- Position de l'influenceur mise en évidence si dans le top 10
- Indicateur de progression (↑ monté, ↓ descendu, = stable)
- Lien "Voir le classement complet →"

## 6.4 Section Mes Gains

### 6.4.1 Résumé financier

| Bloc | Description |
|------|-------------|
| Gains totaux | Somme de toutes les commissions depuis l'inscription |
| En attente de validation | Commissions créées mais pas encore validées (7-14 jours) |
| Disponible pour retrait | Commissions validées et retirables |
| Déjà retiré | Total des paiements effectués |

### 6.4.2 Répartition par type

- Graphique circulaire ou barres :
  - Commissions Client (10$)
  - Commissions Recrutement (5$)
  - Bonus (Top 3, niveau, etc.)

### 6.4.3 Historique des commissions

**Tableau avec colonnes :**
| Date | Type | Source | Montant base | Bonus | Montant final | Statut |
|------|------|--------|--------------|-------|---------------|--------|

**Types de commission :**
- Client : "Appel client #12345"
- Recrutement : "Appel via [Nom Prestataire]"

**Statuts possibles :**
- 🟡 En attente : Commission créée, en cours de validation
- 🟢 Validé : Prêt pour retrait
- 🔵 Payé : Déjà retiré
- 🔴 Annulé : Fraude détectée ou annulation

**Filtres disponibles :**
- Par période : Ce mois, mois dernier, 3 derniers mois, cette année, tout
- Par type : Tous, Client, Recrutement
- Par statut : Tous, En attente, Validé, Payé, Annulé

### 6.4.4 Graphiques d'évolution

- Graphique linéaire des gains par mois (12 derniers mois)
- Possibilité de basculer entre : Gains, Conversions, Clics

## 6.5 Section Mes Filleuls

### 6.5.1 Statistiques globales

| Indicateur | Description |
|------------|-------------|
| Total filleuls | Nombre de prestataires recrutés |
| Filleuls actifs | Prestataires ayant reçu au moins 1 appel ce mois |
| Gains générés | Total des commissions via les filleuls |

### 6.5.2 Liste des prestataires recrutés

**Tableau avec colonnes :**
| Prestataire | Spécialité | Date recrutement | Appels reçus | Mes gains | Statut |

**Informations par filleul :**
- Nom/Prénom (anonymisé partiellement si nécessaire)
- Spécialité (Avocat, Notaire, etc.)
- Pays d'exercice
- Date de recrutement
- Nombre d'appels reçus (total)
- Gains générés pour l'influenceur
- Statut de l'affiliation

**Note importante :** Ne PAS afficher la date d'expiration des 6 mois. L'information est dans les CGU mais pas visible dans le dashboard.

**Statuts possibles :**
- 🟢 Actif : Commission sur les appels en cours
- ⚫ Expiré : 6 mois écoulés (mais ne pas afficher explicitement)

## 6.6 Section Classement (Top 10)

### 6.6.1 Classement mensuel

**Affichage :**
- Mois en cours : "Janvier 2026"
- Position de l'influenceur : "Vous êtes #2 sur 156 influenceurs"

**Top 10 avec détails :**
| Position | Influenceur | Gains du mois | Évolution |
|----------|-------------|---------------|-----------|
| 🥇 | Sarah L. | $2,140 | ↑ +3 |
| 🥈 | **➤ VOUS** | $1,247 | ↑ +1 |
| 🥉 | Marc D. | $987 | ↓ -2 |
| 4 | ... | ... | ... |

**Mise en évidence :** La ligne de l'influenceur connecté est surlignée

### 6.6.2 Bonus Top 3

Affichage des bonus en jeu :
| Position | Bonus |
|----------|-------|
| 🥇 Top 1 | x2 sur les gains du mois |
| 🥈 Top 2 | +50% sur les gains du mois |
| 🥉 Top 3 | +25% sur les gains du mois |

### 6.6.3 Historique des classements

- Archive des classements des mois précédents
- Position de l'influenceur chaque mois
- Badges gagnés (Top 10, Top 3)

## 6.7 Section Paiements

### 6.7.1 Demande de retrait

**Conditions pour retirer :**
- Solde disponible ≥ seuil minimum (50$)
- Aucune demande de retrait en cours
- Méthode de paiement configurée

**Formulaire de demande :**
| Champ | Type | Notes |
|-------|------|-------|
| Montant à retirer | Input + bouton "Tout" | Min 50$, max = solde disponible |
| Méthode de paiement | Affichage | Méthode configurée dans le profil |
| Détails paiement | Affichage | Email PayPal, etc. |

**Bouton :** "Demander le retrait"

**Confirmation :** Modal de confirmation avant validation

### 6.7.2 Historique des retraits

**Tableau avec colonnes :**
| Date demande | Montant | Méthode | Statut | Date paiement | Référence |
|--------------|---------|---------|--------|---------------|-----------|

**Statuts possibles :**
- 🟡 En attente : Demande soumise
- 🔄 En traitement : Paiement en cours
- 🟢 Payé : Paiement effectué
- 🔴 Échoué : Erreur de paiement (avec raison)

### 6.7.3 Informations de paiement

Rappel de la méthode configurée avec lien vers le profil pour modifier.

## 6.8 Section Profil

### 6.8.1 Informations personnelles

| Champ | Modifiable |
|-------|------------|
| Nom complet | Oui |
| Email | Non (ou avec re-vérification) |
| Mot de passe | Oui (via formulaire dédié) |
| Langue de l'interface | Oui |

### 6.8.2 Informations communauté

| Champ | Modifiable |
|-------|------------|
| Plateforme | Oui |
| URL de la communauté | Oui |
| Nom de la communauté | Oui |
| Nombre de membres | Oui |
| Langue de la communauté | Oui |
| Pays ciblé | Oui |
| Thématique | Oui |

### 6.8.3 Informations de paiement

| Champ | Modifiable |
|-------|------------|
| Méthode de paiement | Oui |
| Détails paiement | Oui |

### 6.8.4 Mon code affilié

- Affichage du code : `JEAN456`
- Information : "Ce code est permanent et ne peut pas être modifié"

### 6.8.5 Statistiques du compte

- Date d'inscription
- Niveau actuel
- Nombre de conversions total
- Gains totaux depuis l'inscription

### 6.8.6 Actions du compte

- Télécharger mes données (export RGPD)
- Supprimer mon compte (avec avertissements)

## 6.9 Section Outils Promotionnels

Cette section est une **page dédiée** dans le dashboard permettant aux influenceurs d'accéder à tous les outils visuels et codes pour promouvoir SOS-Expat sur leurs différents supports.

### 6.9.1 Organisation de la page

La page est organisée par **type de support** avec pour chacun **plusieurs choix de widgets** (différents designs, styles, couleurs).

```
OUTILS PROMOTIONNELS
├── 📷 Bannières & Images
│   ├── Bannières horizontales (plusieurs designs)
│   ├── Bannières carrées (plusieurs designs)
│   ├── Posts réseaux sociaux (plusieurs designs)
│   └── Stories (plusieurs designs)
├── 💻 Codes à intégrer
│   ├── HTML
│   ├── BBCode (forums)
│   └── Markdown
├── 🧩 Widgets interactifs
│   ├── Widget recherche (plusieurs styles)
│   └── Widget bouton (plusieurs styles)
├── 📝 Textes prêts à l'emploi
│   └── Par langue (9 langues)
└── 📲 QR Code
    └── Téléchargement multi-formats
```

### 6.9.2 Bannières & Images

#### Types de bannières disponibles

| Type | Dimensions | Usage | Nombre de designs |
|------|------------|-------|-------------------|
| Bannière large | 970×90 px | Header sites web | 3-5 designs |
| Bannière standard | 728×90 px | Sites, forums | 3-5 designs |
| Bannière moyenne | 468×60 px | Sites, signatures | 3-5 designs |
| Rectangle moyen | 300×250 px | Sidebars | 3-5 designs |
| Carré | 300×300 px | Sidebars, posts | 3-5 designs |
| Skyscraper | 160×600 px | Sidebars verticales | 3-5 designs |
| Post Facebook/LinkedIn | 1200×630 px | Publications | 3-5 designs |
| Post Instagram | 1080×1080 px | Feed Instagram | 3-5 designs |
| Story verticale | 1080×1920 px | Stories Instagram/TikTok | 3-5 designs |
| Miniature YouTube | 1280×720 px | Vidéos YouTube | 3-5 designs |
| Signature email | 600×100 px | Signatures email | 3-5 designs |

#### Fonctionnalités de la section Bannières

**Affichage :**
- Grille de miniatures avec aperçu de chaque design
- Filtre par type/dimension
- Filtre par style (moderne, classique, coloré, minimaliste)

**Pour chaque bannière :**
- Aperçu en taille réelle (zoom)
- Le code affilié de l'influenceur est automatiquement intégré
- **Toutes les bannières respectent la charte graphique rouge SOS-Expat**
- Téléchargement en PNG (fond transparent)
- Téléchargement en JPG (fond opaque)
- Bouton "Copier le lien direct de l'image"

**Actions groupées :**
- "Télécharger tout en ZIP" (toutes les bannières d'un type)
- "Télécharger ma sélection" (cocher plusieurs bannières)

#### Personnalisation des bannières (optionnel)

Si activé par l'admin, l'influenceur peut personnaliser certains éléments :
- Nom de sa communauté affiché sur la bannière
- Choix parmi plusieurs couleurs d'accent
- Avec ou sans son code affilié visible

### 6.9.3 Codes à intégrer

L'influenceur peut copier des codes prêts à l'emploi pour intégrer les bannières sur ses supports.

#### Sélecteurs

| Sélecteur | Options |
|-----------|---------|
| Format du code | HTML, BBCode, Markdown |
| Bannière | Liste déroulante de toutes les bannières |
| Style du lien | Image seule, Image + texte, Bouton |

#### Types de codes générés

**HTML - Image simple**
```html
<a href="https://sos-expat.com/ref/i/[CODE]" target="_blank" rel="noopener">
  <img src="https://sos-expat.com/assets/widgets/[ID_BANNER].png" 
       alt="SOS-Expat - Experts pour expatriés" 
       width="728" height="90">
</a>
```

**HTML - Image avec texte**
```html
<div style="text-align:center;">
  <a href="https://sos-expat.com/ref/i/[CODE]" target="_blank" rel="noopener">
    <img src="https://sos-expat.com/assets/widgets/[ID_BANNER].png" 
         alt="SOS-Expat" width="300" height="250">
  </a>
  <p style="font-size:12px;">Bénéficiez de -5% avec mon lien partenaire</p>
</div>
```

**HTML - Bouton stylé**
```html
<a href="https://sos-expat.com/ref/i/[CODE]" 
   style="display:inline-block; padding:14px 28px; background:linear-gradient(135deg, #DC2626, #B91C1C); color:white; text-decoration:none; border-radius:8px; font-weight:bold; font-family:Arial, sans-serif; box-shadow:0 4px 6px rgba(0,0,0,0.1);">
  🆘 Trouver un expert expatrié (-5%)
</a>
```

**BBCode - Pour forums**
```
[url=https://sos-expat.com/ref/i/[CODE]][img]https://sos-expat.com/assets/widgets/[ID_BANNER].png[/img][/url]
```

**BBCode - Avec texte**
```
[center]
[url=https://sos-expat.com/ref/i/[CODE]][img]https://sos-expat.com/assets/widgets/[ID_BANNER].png[/img][/url]
[size=10]Bénéficiez de -5% avec mon lien partenaire[/size]
[/center]
```

**Markdown - Pour Reddit, GitHub, etc.**
```markdown
[![SOS-Expat - Experts pour expatriés](https://sos-expat.com/assets/widgets/[ID_BANNER].png)](https://sos-expat.com/ref/i/[CODE])
```

#### Interface de la section

```
┌─────────────────────────────────────────────────────────────────┐
│  💻 CODE À INTÉGRER                                            │
│                                                                 │
│  Format :    [HTML ▼]                                          │
│  Bannière :  [728x90 - Design Rouge SOS-Expat ▼]               │
│  Style :     [● Image seule ○ Image + texte ○ Bouton]         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ <a href="https://sos-expat.com/ref/i/JEAN456"          │   │
│  │    target="_blank" rel="noopener">                      │   │
│  │   <img src="https://sos-expat.com/assets/widgets/      │   │
│  │        banner-728x90-red.png"                           │   │
│  │        alt="SOS-Expat" width="728" height="90">         │   │
│  │ </a>                                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [📋 Copier le code]                    [👁️ Prévisualiser]    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.9.4 Widgets interactifs (iframe)

Des widgets plus avancés que l'influenceur peut intégrer sur son site ou forum.

#### Types de widgets interactifs

| Widget | Description | Dimensions | Designs |
|--------|-------------|------------|---------|
| Widget Recherche | Mini-formulaire de recherche d'expert | 300×400 px | 3-5 styles |
| Widget Recherche Large | Formulaire de recherche horizontal | 600×200 px | 3-5 styles |
| Widget Bouton | Bouton animé avec compteur ou effet | 200×60 px | 5-8 styles |
| Widget Card | Carte d'information avec CTA | 350×450 px | 3-5 styles |
| Widget Floating | Bouton flottant (coin de page) | 60×60 px | 3-5 styles |

#### Contenu du Widget Recherche

- Logo SOS-Expat
- Titre : "Besoin d'un expert à l'étranger ?"
- Champ : "Dans quel pays êtes-vous ?"
- Champ : "Type d'expert recherché" (Avocat, Notaire, etc.)
- Bouton : "Trouver un expert (-5%)"
- Mention : "Via [Nom de la communauté]"
- Lien affilié intégré automatiquement

#### Personnalisation des widgets

L'influenceur peut personnaliser :
- Style/thème (clair, sombre, coloré)
- Couleur principale (parmi une palette)
- Afficher ou non le nom de sa communauté
- Langue du widget

#### Code d'intégration

```html
<!-- Widget SOS-Expat Recherche -->
<iframe 
  src="https://sos-expat.com/widget/search/[CODE]?theme=light&color=red&lang=fr" 
  width="300" 
  height="400" 
  frameborder="0"
  style="border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.1);">
</iframe>
```

```html
<!-- Widget SOS-Expat Bouton Flottant -->
<script src="https://sos-expat.com/widget/floating/[CODE].js" 
        data-position="bottom-right" 
        data-color="red"
        async>
</script>
```

#### Interface de la section

```
┌─────────────────────────────────────────────────────────────────┐
│  🧩 WIDGETS INTERACTIFS                                        │
│                                                                 │
│  Intégrez des widgets dynamiques sur votre site ou forum.      │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  WIDGET RECHERCHE                                               │
│                                                                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐              │
│  │ Style 1 │ │ Style 2 │ │ Style 3 │ │ Style 4 │              │
│  │ Moderne │ │ Classic │ │ Sombre  │ │ Coloré  │              │
│  │  [✓]    │ │  [ ]    │ │  [ ]    │ │  [ ]    │              │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘              │
│                                                                 │
│  Personnalisation :                                             │
│  Couleur : [Rouge SOS-Expat ▼]  Langue : [Français ▼]          │
│  ☑️ Afficher le nom de ma communauté                           │
│                                                                 │
│  [👁️ Prévisualiser]                                            │
│                                                                 │
│  Code d'intégration :                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ <iframe src="https://sos-expat.com/widget/search/       │   │
│  │   JEAN456?theme=modern&color=red&lang=fr"               │   │
│  │   width="300" height="400" frameborder="0"></iframe>    │   │
│  └─────────────────────────────────────────────────────────┘   │
│  [📋 Copier le code]                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.9.5 Textes prêts à l'emploi

Des textes pré-rédigés dans les 9 langues pour les bios, descriptions, posts.

#### Types de textes

| Type | Usage | Longueur |
|------|-------|----------|
| Bio courte | Instagram, TikTok, Twitter | ~100 caractères |
| Bio longue | YouTube, Facebook | ~250 caractères |
| Post promotionnel | Publications réseaux | ~500 caractères |
| Description groupe | Description de groupe | ~300 caractères |
| Message de bienvenue | Message aux nouveaux membres | ~400 caractères |

#### Exemple de textes (Français)

**Bio courte :**
```
🆘 Besoin d'aide à l'étranger ? Avocat, notaire, expert...
-5% avec mon lien → sos-expat.com/ref/i/JEAN456
```

**Bio longue :**
```
🆘 SOS-Expat : La plateforme qui connecte les expatriés avec des avocats, notaires et experts dans 197 pays.

✅ Réponse en moins de 5 minutes
✅ Experts francophones vérifiés
✅ -5% sur toutes les prestations avec mon lien partenaire

👉 sos-expat.com/ref/i/JEAN456
```

**Post promotionnel :**
```
🌍 À tous les expatriés de notre communauté !

Vous avez besoin d'un avocat, notaire ou expert dans votre pays d'accueil ?

J'ai découvert SOS-Expat, une plateforme qui vous connecte avec des professionnels francophones vérifiés dans 197 pays. Réponse en moins de 5 minutes !

En tant que membre de [Nom Communauté], vous bénéficiez de -5% sur toutes les prestations avec ce lien :
👉 sos-expat.com/ref/i/JEAN456

N'hésitez pas si vous avez des questions ! 🙌
```

#### Disponibilité par langue

Chaque texte est disponible dans les 9 langues :
- 🇫🇷 Français
- 🇬🇧 Anglais
- 🇩🇪 Allemand
- 🇷🇺 Russe
- 🇨🇳 Chinois
- 🇪🇸 Espagnol
- 🇵🇹 Portugais
- 🇸🇦 Arabe
- 🇮🇳 Hindi

#### Interface de la section

```
┌─────────────────────────────────────────────────────────────────┐
│  📝 TEXTES PRÊTS À L'EMPLOI                                    │
│                                                                 │
│  Type de texte : [Bio longue ▼]                                │
│  Langue :        [Français ▼]                                   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🆘 SOS-Expat : La plateforme qui connecte les          │   │
│  │ expatriés avec des avocats, notaires et experts dans   │   │
│  │ 197 pays.                                               │   │
│  │                                                         │   │
│  │ ✅ Réponse en moins de 5 minutes                        │   │
│  │ ✅ Experts francophones vérifiés                        │   │
│  │ ✅ -5% sur toutes les prestations avec mon lien         │   │
│  │                                                         │   │
│  │ 👉 sos-expat.com/ref/i/JEAN456                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Caractères : 247/300                                          │
│                                                                 │
│  [📋 Copier le texte]                                          │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  💡 Ce texte est personnalisé avec votre lien affilié.         │
│     Le nom de votre communauté peut être ajouté avec [Nom].    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.9.6 QR Code

QR Code personnalisé redirigeant vers le lien affilié de l'influenceur.

#### Options de téléchargement

| Format | Usage |
|--------|-------|
| PNG Small (200×200 px) | Web, réseaux sociaux |
| PNG Medium (500×500 px) | Présentations |
| PNG Large (1000×1000 px) | Impression |
| SVG | Scalable, impression haute qualité |
| PDF | Impression directe |

#### Options de personnalisation

- Avec ou sans logo SOS-Expat au centre
- Couleur du QR Code (noir par défaut, rouge SOS-Expat, couleur personnalisée)
- Avec ou sans cadre
- Avec ou sans texte sous le QR ("Scannez pour -5%")

#### Interface de la section

```
┌─────────────────────────────────────────────────────────────────┐
│  📲 QR CODE                                                    │
│                                                                 │
│  Votre QR Code personnalisé redirige vers :                    │
│  sos-expat.com/ref/i/JEAN456                                   │
│                                                                 │
│          ┌───────────────┐                                     │
│          │ ▄▄▄▄▄▄▄▄▄▄▄▄ │                                     │
│          │ █          █ │                                     │
│          │ █  QR CODE  █ │                                     │
│          │ █   [LOGO]  █ │                                     │
│          │ █          █ │                                     │
│          │ ▀▀▀▀▀▀▀▀▀▀▀▀ │                                     │
│          └───────────────┘                                     │
│                                                                 │
│  Style :                                                        │
│  [● Avec logo ○ Sans logo]                                     │
│  Couleur : [Noir ▼]                                            │
│  [☑️ Ajouter un cadre]                                         │
│  [☑️ Ajouter texte "Scannez pour -5%"]                         │
│                                                                 │
│  Télécharger :                                                  │
│  [PNG Small] [PNG Medium] [PNG Large] [SVG] [PDF]              │
│                                                                 │
│  💡 Idéal pour : flyers, cartes de visite, présentations,      │
│     vidéos, événements                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.9.7 Navigation de la page Outils Promotionnels

La page utilise soit :
- Des onglets horizontaux en haut
- Un menu latéral (sur desktop)
- Un accordéon (sur mobile)

```
┌─────────────────────────────────────────────────────────────────┐
│  🎨 OUTILS PROMOTIONNELS                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [📷 Bannières] [💻 Codes] [🧩 Widgets] [📝 Textes] [📲 QR]   │
│       ────────                                                  │
│                                                                 │
│  ... contenu de l'onglet sélectionné ...                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

# 7. SYSTÈME DE TRACKING ET AFFILIATION

## 7.1 Structure des liens

### 7.1.1 Lien Client Influenceur

**Format :** `https://sos-expat.com/ref/i/[CODE]`

**Exemple :** `https://sos-expat.com/ref/i/JEAN456`

**Paramètres encodés :**
- Type : Influenceur (i)
- Code affilié
- Remise automatique : 5%

### 7.1.2 Lien Recrutement

**Format :** `https://sos-expat.com/ref/r/[CODE]`

**Exemple :** `https://sos-expat.com/ref/r/JEAN456`

**Usage :** Pour recruter des prestataires (avocats, notaires, experts)

### 7.1.3 Différence avec les Chatters

| Type de lien | Chatter | Influenceur |
|--------------|---------|-------------|
| Client | `/ref/c/CODE` (0% remise) | `/ref/i/CODE` (5% remise) |
| Recrutement | `/ref/r/CODE` | `/ref/r/CODE` (identique) |

## 7.2 Système de cookies

### 7.2.1 Cookie de tracking

**À l'arrivée sur un lien affilié :**
- Installation d'un cookie de tracking
- Durée de vie : 30 jours
- Contenu :
  - `partner_type` : "influencer"
  - `partner_id` : ID de l'influenceur
  - `partner_code` : Code affilié
  - `discount` : 5 (pourcentage de remise)
  - `timestamp` : Date/heure du clic
  - `source_url` : URL de provenance (referer)

### 7.2.2 Règle d'attribution

**Dernier clic gagne :** Si un client clique sur plusieurs liens affiliés différents, c'est le dernier lien cliqué qui est attribué.

**Cas particulier Chatter vs Influenceur :**
- Client clique sur lien Chatter (0% remise)
- Puis clique sur lien Influenceur (5% remise)
- → L'Influenceur est attribué et le client a 5% de remise

## 7.3 Flux de conversion Client

```
1. Client clique sur lien Influenceur
   ↓
2. Cookie installé (30 jours)
   ↓
3. Client navigue sur SOS-Expat
   ↓
4. Client contacte un prestataire
   ↓
5. Prestation effectuée
   ↓
6. Client paie SOS-Expat (avec -5% remise)
   ↓
7. Commission Influenceur créée (statut: "En attente")
   ↓
8. Délai de validation (7-14 jours)
   ↓
9. Commission validée (statut: "Disponible")
   ↓
10. Influenceur peut retirer
```

## 7.4 Flux de conversion Recrutement

```
1. Prestataire clique sur lien de recrutement
   ↓
2. Cookie installé
   ↓
3. Prestataire s'inscrit sur SOS-Expat
   ↓
4. Prestataire validé et actif
   ↓
5. Attribution à l'Influenceur (filleul créé)
   ↓
6. À CHAQUE appel reçu par ce prestataire :
   ├── Commission de 5$ créée pour l'Influenceur
   └── Pendant les 6 mois suivant l'inscription
   ↓
7. Après 6 mois : Plus de commission sur ce filleul
```

## 7.5 Statistiques de tracking

### Métriques collectées par lien

| Métrique | Description |
|----------|-------------|
| Clics | Nombre de clics sur le lien |
| Visiteurs uniques | Nombre de visiteurs distincts (IP + cookies) |
| Inscriptions | Clients ou prestataires inscrits via le lien |
| Conversions | Paiements effectués |
| Taux de conversion | Conversions / Clics |
| Revenus générés | Montant total des commissions |

### Données collectées par clic

| Donnée | Usage |
|--------|-------|
| IP (anonymisée) | Anti-fraude, géolocalisation |
| User-Agent | Détection appareil/navigateur |
| Referer | Source du clic |
| Timestamp | Horodatage |
| Pays (géoloc) | Statistiques géographiques |

## 7.6 Domaines de redirection (protection)

### Problématique
Si le domaine principal `sos-expat.com` est blacklisté par Facebook ou Reddit à cause de spam, tout le système d'affiliation est impacté.

### Solution : Domaines de redirection

**Domaine principal :** `go.sosxp.co`
**Domaines backup :** 
- `link.expat-help.co`
- `ref.expatsos.co`
- `get.xpathelp.co`

### Fonctionnement

```
Lien affiché : go.sosxp.co/JEAN456
       ↓
Redirection 301 vers : sos-expat.com/ref/i/JEAN456
       ↓
Cookie installé sur sos-expat.com
```

### Avantages
- Le domaine principal reste protégé
- Si un domaine court est banni, on bascule sur un autre
- Les liens existants peuvent être redirigés

### Gestion admin
- Monitoring automatique des domaines (détection de bannissement)
- Switch automatique vers le domaine backup
- Alerte admin en cas de problème

---

# 8. SYSTÈME DE COMMISSIONS

## 8.1 Types de commissions

### 8.1.1 Commission Client

| Paramètre | Valeur |
|-----------|--------|
| Montant de base | 10$ |
| Déclencheur | Paiement reçu par SOS-Expat |
| Conditions | Cookie valide (< 30 jours) |
| Délai validation | 7-14 jours |

### 8.1.2 Commission Recrutement

| Paramètre | Valeur |
|-----------|--------|
| Montant | 5$ par appel |
| Déclencheur | Chaque appel reçu par un prestataire recruté |
| Durée | Pendant 6 mois après inscription du prestataire |
| Délai validation | 7-14 jours |

**Note :** Les 6 mois ne sont pas affichés dans le dashboard, uniquement dans les CGU.

## 8.2 Cycle de vie d'une commission

```
┌──────────────┐
│   CRÉÉE      │  Commission enregistrée après paiement
└──────┬───────┘
       ↓
┌──────────────┐
│  EN ATTENTE  │  Vérification anti-fraude (7-14 jours)
└──────┬───────┘
       ↓
   ┌───┴───┐
   ↓       ↓
┌──────┐ ┌──────────┐
│VALIDÉ│ │ ANNULÉ   │  Si fraude détectée ou remboursement
└──┬───┘ └──────────┘
   ↓
┌──────────────┐
│ DISPONIBLE   │  Peut être retiré par l'influenceur
└──────┬───────┘
       ↓
┌──────────────┐
│    PAYÉ      │  Retrait effectué
└──────────────┘
```

## 8.3 Calcul des commissions avec bonus

### Formule
```
Commission finale = Montant de base × Bonus niveau × Bonus Top 3
```

### Exemple
- Montant de base : 10$
- Niveau Expert : +10% (×1.10)
- Top 2 du mois : +50% (×1.50)
- **Commission finale : 10 × 1.10 × 1.50 = 16.50$**

## 8.4 Bonus de niveau

| Niveau | Conversions requises | Multiplicateur |
|--------|---------------------|----------------|
| Apprenti | 0-10 | ×1.00 |
| Confirmé | 11-50 | ×1.05 |
| Expert | 51-200 | ×1.10 |
| Ambassadeur | 201-500 | ×1.15 |
| Élite | 500+ | ×1.20 |

## 8.5 Bonus Top 3 mensuel

| Position | Multiplicateur | Application |
|----------|----------------|-------------|
| Top 1 | ×2.00 | Sur tous les gains du mois |
| Top 2 | ×1.50 | Sur tous les gains du mois |
| Top 3 | ×1.25 | Sur tous les gains du mois |

**Application :** Les bonus Top 3 sont calculés et appliqués en fin de mois sur toutes les commissions du mois.

## 8.6 Remise client de 5%

### Fonctionnement
- Automatique : détectée via le cookie influenceur
- Appliquée sur le montant total de la facture
- Visible pour le client lors du paiement

### Exemple
```
Prestation : 200€
Remise 5% : -10€
Le client paie : 190€
SOS-Expat reçoit : 190€
Commission influenceur : 10$
```

### Qui absorbe la remise ?
SOS-Expat absorbe la remise de 5%. L'influenceur touche sa commission complète.

---

# 9. SYSTÈME DE PAIEMENTS

## 9.1 Méthodes de paiement disponibles

| Méthode | Couverture | Automatisation | Frais approximatifs |
|---------|------------|----------------|---------------------|
| PayPal | International | 100% auto (API Payouts) | ~2-3% |
| Wise | Europe, US, nombreux pays | 100% auto (API Business) | ~0.5-1% |
| Mobile Money | Afrique (M-Pesa, Orange Money, MTN) | 100% auto (Flutterwave) | ~1-2% |

## 9.2 Configuration par influenceur

Chaque influenceur choisit UNE méthode de paiement principale et fournit les détails correspondants :

| Méthode | Détails requis |
|---------|----------------|
| PayPal | Adresse email PayPal |
| Wise | Email Wise ou IBAN |
| Mobile Money | Numéro de téléphone + Pays + Provider (M-Pesa, Orange, MTN) |

## 9.3 Seuil minimum de retrait

**Seuil recommandé : 50$**

Justification :
- Assez bas pour motiver les nouveaux influenceurs
- Assez haut pour limiter les coûts de transaction
- Standard dans l'industrie de l'affiliation

## 9.4 Processus de retrait

### 9.4.1 Demande de retrait

```
1. Influenceur accède à la section Paiements
   ↓
2. Vérifie que le solde ≥ 50$
   ↓
3. Clique sur "Demander un retrait"
   ↓
4. Saisit le montant (ou "Tout")
   ↓
5. Confirme la demande
   ↓
6. Demande enregistrée (statut: "En attente")
```

### 9.4.2 Traitement du paiement

```
1. Demande reçue
   ↓
2. Vérification automatique :
   ├── Solde suffisant ?
   ├── Méthode de paiement valide ?
   ├── Pas de fraude détectée ?
   └── Compte en règle ?
   ↓
3. Si OK : Paiement déclenché via l'API
   ↓
4. Confirmation de l'API
   ↓
5. Mise à jour du statut : "Payé"
   ↓
6. Notification à l'influenceur
```

### 9.4.3 Délai de traitement

| Méthode | Délai habituel |
|---------|----------------|
| PayPal | Instantané à 24h |
| Wise | 1-3 jours ouvrés |
| Mobile Money | Instantané à quelques heures |

## 9.5 Gestion des erreurs de paiement

### Causes possibles
- Email PayPal invalide
- Compte Wise non vérifié
- Numéro Mobile Money incorrect
- Limites de réception atteintes
- Restrictions pays

### Actions
1. Paiement marqué comme "Échoué"
2. Notification à l'influenceur avec la raison
3. Solde recrédité
4. Demande de mise à jour des informations de paiement
5. Possibilité de redemander le retrait

## 9.6 Traçabilité

Pour chaque paiement effectué, conserver :
- Date et heure de la demande
- Date et heure du traitement
- Montant demandé
- Montant payé (après frais éventuels)
- Méthode utilisée
- Référence de transaction (de l'API)
- Statut final

---

# 10. GAMIFICATION

## 10.1 Système de niveaux

### 10.1.1 Définition des niveaux

| Niveau | Nom | Icône | Conversions | Bonus |
|--------|-----|-------|-------------|-------|
| 1 | Apprenti | ⭐ | 0-10 | +0% |
| 2 | Confirmé | ⭐⭐ | 11-50 | +5% |
| 3 | Expert | ⭐⭐⭐ | 51-200 | +10% |
| 4 | Ambassadeur | ⭐⭐⭐⭐ | 201-500 | +15% |
| 5 | Élite | ⭐⭐⭐⭐⭐ | 500+ | +20% |

### 10.1.2 Calcul des conversions

Comptabiliser toutes les conversions validées :
- Commissions Client (chaque paiement = 1 conversion)
- Ne PAS compter les recrutements de prestataires

### 10.1.3 Montée de niveau

- Automatique dès que le seuil est atteint
- Notification à l'influenceur
- Badge débloqué
- Célébration visuelle dans le dashboard

### 10.1.4 Descente de niveau

- **Pas de descente** : Une fois un niveau atteint, il est conservé

## 10.2 Système de badges

### 10.2.1 Badges de conversion

| Badge | Nom | Condition | Icône |
|-------|-----|-----------|-------|
| first_conversion | Première conversion | 1ère commission client validée | 🎯 |
| ten_conversions | Décollage | 10 conversions | 🚀 |
| fifty_conversions | Vélocité | 50 conversions | ⚡ |
| hundred_conversions | Centurion | 100 conversions | 💯 |
| fivehundred_conversions | Légende | 500 conversions | 🏆 |

### 10.2.2 Badges de gains

| Badge | Nom | Condition | Icône |
|-------|-----|-----------|-------|
| hundred_dollars | Première centaine | 100$ gagnés | 💵 |
| fivehundred_dollars | Demi-millier | 500$ gagnés | 💰 |
| thousand_dollars | Millionnaire | 1000$ gagnés | 💎 |
| fivethousand_dollars | Fortune | 5000$ gagnés | 👑 |

### 10.2.3 Badges de recrutement

| Badge | Nom | Condition | Icône |
|-------|-----|-----------|-------|
| first_referral | Premier filleul | 1er prestataire recruté | 👤 |
| ten_referrals | Recruteur | 10 prestataires recrutés | 👥 |
| fifty_referrals | Chasseur de têtes | 50 prestataires recrutés | 🎯 |

### 10.2.4 Badges de streak

| Badge | Nom | Condition | Icône |
|-------|-----|-----------|-------|
| week_streak | Semaine de feu | 7 jours consécutifs avec conversion | 🔥 |
| month_streak | Mois infernal | 30 jours consécutifs avec conversion | 🌟 |
| quarter_streak | Trimestre légendaire | 90 jours consécutifs avec conversion | ⭐ |

### 10.2.5 Badges de classement

| Badge | Nom | Condition | Icône |
|-------|-----|-----------|-------|
| top_ten | Top 10 | Atteindre le Top 10 mensuel | 🏅 |
| top_three | Podium | Atteindre le Top 3 mensuel | 🥉 |
| top_one | Champion | Atteindre la 1ère place mensuelle | 🥇 |
| three_top_ten | Régulier | Top 10 pendant 3 mois | 🎖️ |

### 10.2.6 Badges spécifiques Influenceurs

| Badge | Nom | Condition | Icône |
|-------|-----|-----------|-------|
| audience_10k | Communauté 10K | Audience déclarée ≥ 10,000 | 📺 |
| audience_50k | Communauté 50K | Audience déclarée ≥ 50,000 | 📺 |
| audience_100k | Méga Communauté | Audience déclarée ≥ 100,000 | 📺 |

## 10.3 Système de streak

### 10.3.1 Définition

Un "streak" est une série de jours consécutifs pendant lesquels l'influenceur a généré au moins une conversion.

### 10.3.2 Calcul

- Incrémenté chaque jour à minuit si au moins 1 conversion dans les 24h
- Remis à 0 si aucune conversion pendant une journée complète

### 10.3.3 Affichage

- Compteur de jours dans le dashboard
- Icône flamme 🔥
- Animation spéciale aux paliers (7, 30, 90, 365 jours)

## 10.4 Top 10 mensuel

### 10.4.1 Classement

- Basé sur les gains du mois en cours
- Mis à jour en temps réel
- Réinitialisé le 1er de chaque mois à minuit

### 10.4.2 Récompenses

| Position | Bonus |
|----------|-------|
| 🥇 Top 1 | ×2 sur tous les gains du mois |
| 🥈 Top 2 | ×1.50 sur tous les gains du mois |
| 🥉 Top 3 | ×1.25 sur tous les gains du mois |

### 10.4.3 Attribution des bonus

- Calcul automatique le dernier jour du mois à 23h59
- Application du multiplicateur sur toutes les commissions du mois
- Création d'une commission "Bonus Top X" si nécessaire
- Notification aux gagnants

### 10.4.4 Classements séparés

**Important :** Les Chatters et Influenceurs ont des classements SÉPARÉS.
- Top 10 Chatters
- Top 10 Influenceurs

Justification : Les dynamiques sont différentes (effort actif vs audience passive).

## 10.5 Célébrations et animations

### 10.5.1 Événements déclencheurs

| Événement | Animation |
|-----------|-----------|
| Première conversion | Confettis + message de félicitations |
| Montée de niveau | Animation d'étoiles + nouveau badge |
| Badge débloqué | Pop-up avec le badge + explication |
| Entrée dans le Top 10 | Notification spéciale + effet visuel |
| Nouveau record de streak | Animation flamme |

### 10.5.2 Notifications push (si PWA activée)

- Badge débloqué
- Nouvelle commission
- Montée de niveau
- Entrée/sortie du Top 10

---

# 11. CONSOLE ADMINISTRATION - ONGLET INFLUENCEURS

## 11.1 Vue d'ensemble du module admin

Le module Influenceurs dans la console d'administration permet de gérer tous les aspects du programme partenaires influenceurs.

### Structure du menu Admin Influenceurs

```
📺 INFLUENCEURS
├── 📊 Dashboard
├── 👥 Liste des Influenceurs
├── 🌍 Par Pays
├── 🗣️ Par Langue
├── 💰 Finances
├── 🏆 Gamification
├── 🎨 Widgets & Outils Promo
│   ├── Bannières
│   ├── Widgets interactifs
│   ├── Textes promotionnels
│   └── Configuration
└── ⚙️ Configuration
```

## 11.2 Dashboard Influenceurs (Admin)

### 11.2.1 KPIs principaux

| KPI | Description | Affichage |
|-----|-------------|-----------|
| Total Influenceurs | Nombre d'influenceurs inscrits | Nombre + évolution |
| Influenceurs actifs | Ayant généré au moins 1 conversion ce mois | Nombre + % |
| Commissions versées | Total des paiements effectués | Montant + évolution |
| Commissions en attente | Total des commissions non encore payées | Montant |
| Conversions ce mois | Nombre de conversions ce mois | Nombre + évolution |
| CA généré | Chiffre d'affaires généré par les influenceurs | Montant |
| Taux de conversion moyen | Conversions / Clics | Pourcentage |
| Audience totale | Somme des audiences déclarées | Nombre |

### 11.2.2 Graphiques

| Graphique | Type | Période |
|-----------|------|---------|
| Évolution des inscriptions | Ligne | 12 derniers mois |
| Évolution des conversions | Ligne | 12 derniers mois |
| Répartition par plateforme | Camembert | Actuel |
| Répartition par langue | Barres | Actuel |
| Top 5 pays | Barres horizontales | Actuel |

### 11.2.3 Alertes et notifications

| Alerte | Condition | Action |
|--------|-----------|--------|
| Nouvel influenceur | Inscription dans les 24h | Lien vers le profil |
| Paiement en attente | Demande de retrait non traitée | Lien vers les finances |
| Gros influenceur | Audience > 100K | Mise en avant |
| Inactivité | Pas de conversion depuis 30 jours | Liste des concernés |

## 11.3 Liste des Influenceurs

### 11.3.1 Tableau principal

**Colonnes :**
| Colonne | Description |
|---------|-------------|
| ID | Identifiant unique |
| Nom | Nom complet |
| Communauté | Icône plateforme + Nom |
| Membres | Nombre de membres/abonnés |
| Langue | Drapeau + code langue |
| Pays | Drapeau + code pays |
| Thématique | Texte libre |
| Niveau | Étoiles |
| Conversions | Nombre total |
| Gains | Total des gains |
| Statut | Actif/Suspendu/Bloqué |
| Inscrit le | Date |
| Actions | Boutons |

### 11.3.2 Filtres disponibles

| Filtre | Type | Options |
|--------|------|---------|
| Plateforme | Select multiple | Facebook Group, Facebook Page, YouTube, TikTok, Instagram, Blog, Forum, Autre |
| Langue | Select multiple | 9 langues |
| Pays | Select multiple | 197 pays + Général |
| Statut | Select | Tous, Actif, Suspendu, Bloqué |
| Niveau | Select multiple | 1-5 |
| Audience | Range | Min - Max membres |
| Date inscription | Date range | Du - Au |
| Thématique | Recherche texte | Champ libre |

### 11.3.3 Recherche

- Par nom
- Par email
- Par nom de communauté
- Par code affilié

### 11.3.4 Actions de masse

| Action | Description |
|--------|-------------|
| Exporter CSV | Exporte la sélection ou tout |
| Suspendre | Suspend les comptes sélectionnés |
| Activer | Réactive les comptes sélectionnés |
| Envoyer email | Email groupé aux sélectionnés |

### 11.3.5 Actions individuelles

| Action | Description |
|--------|-------------|
| Voir | Ouvre le profil détaillé |
| Modifier | Édite les informations |
| Suspendre | Suspend temporairement |
| Bloquer | Bloque définitivement |
| Connexion en tant que | Accède au dashboard de l'influenceur |

## 11.4 Profil détaillé Influenceur (Admin)

### 11.4.1 Informations personnelles

| Champ | Modifiable admin |
|-------|------------------|
| Nom complet | Oui |
| Email | Oui (attention) |
| Langue interface | Oui |
| Date inscription | Non |
| Dernière connexion | Non |
| Statut | Oui |

### 11.4.2 Informations communauté

| Champ | Modifiable admin |
|-------|------------------|
| Plateforme | Oui |
| URL | Oui |
| Nom communauté | Oui |
| Membres | Oui |
| Langue communauté | Oui |
| Pays | Oui |
| Thématique | Oui |

### 11.4.3 Lien affilié

| Information | Affichage |
|-------------|-----------|
| Code | Ex: JEAN456 |
| Lien client | sos-expat.com/ref/i/JEAN456 |
| Lien recrutement | sos-expat.com/ref/r/JEAN456 |
| QR Code | Image + téléchargement |

### 11.4.4 Statistiques de performance

| Statistique | Valeur |
|-------------|--------|
| Clics totaux | Nombre |
| Conversions client | Nombre |
| Taux de conversion | Pourcentage |
| Prestataires recrutés | Nombre |
| Gains totaux | Montant |
| Gains en attente | Montant |
| Gains disponibles | Montant |
| Niveau actuel | Nom + étoiles |
| Position Top 10 | Rang actuel |

### 11.4.5 Onglets du profil

| Onglet | Contenu |
|--------|---------|
| Commissions | Historique de toutes les commissions |
| Filleuls | Liste des prestataires recrutés |
| Paiements | Historique des retraits |
| Badges | Badges obtenus avec dates |
| Activité | Log des actions (connexions, modifications) |
| Notes admin | Zone de texte pour notes internes |

### 11.4.6 Actions disponibles

| Action | Description |
|--------|-------------|
| Modifier | Éditer les informations |
| Suspendre | Désactiver temporairement le compte |
| Bloquer | Désactiver définitivement |
| Réinitialiser mot de passe | Envoie un email de reset |
| Connexion en tant que | Accéder au dashboard |
| Supprimer | Suppression complète (avec confirmation) |

## 11.5 Vue par Pays

### 11.5.1 Affichage par défaut

Liste des pays triés par nombre d'influenceurs décroissant.

Pour chaque pays :
- Drapeau + Nom du pays
- Nombre d'influenceurs
- Audience totale
- Gains totaux générés
- Bouton "Voir détails"

### 11.5.2 Cas spécial "Général"

Le pays "Général (tous pays)" est affiché en premier.

### 11.5.3 Détail d'un pays

En cliquant sur un pays, afficher :
- Liste des influenceurs de ce pays
- Répartition par langue
- Répartition par plateforme
- Statistiques de performance

### 11.5.4 Indicateurs de couverture

| Indicateur | Signification |
|------------|---------------|
| 🟢 Bien couvert | > 5 influenceurs |
| 🟡 À renforcer | 1-5 influenceurs |
| 🔴 Non couvert | 0 influenceur |

### 11.5.5 Carte mondiale (optionnel)

- Carte interactive
- Couleur des pays selon le nombre d'influenceurs
- Clic sur un pays = détail

## 11.6 Vue par Langue

### 11.6.1 Affichage par défaut

Liste des 9 langues triées par nombre d'influenceurs décroissant.

Pour chaque langue :
- Drapeau + Nom de la langue
- Nombre d'influenceurs
- Pourcentage du total
- Audience totale
- Gains totaux générés
- Bouton "Voir détails"

### 11.6.2 Détail d'une langue

En cliquant sur une langue, afficher :
- Liste des influenceurs de cette langue
- Répartition par pays
- Répartition par plateforme
- Top 5 des influenceurs de cette langue

### 11.6.3 Alertes de couverture

Mise en avant des langues sous-représentées :
- "⚠️ Hindi : 0 influenceur - À recruter"
- "⚠️ Chinois : 1 influenceur - À renforcer"

## 11.7 Finances Influenceurs

### 11.7.1 Résumé financier

| Indicateur | Description |
|------------|-------------|
| CA total généré | Somme des prestations via influenceurs |
| Commissions totales | Somme de toutes les commissions |
| Commissions payées | Total déjà versé |
| Commissions en attente | En cours de validation |
| Commissions disponibles | Validées, non retirées |
| Coût moyen acquisition | Commission moyenne par client |

### 11.7.2 Demandes de retrait

**Tableau des demandes en attente :**
| Colonne | Description |
|---------|-------------|
| Date | Date de la demande |
| Influenceur | Nom + lien profil |
| Montant | Montant demandé |
| Méthode | PayPal/Wise/Mobile Money |
| Détails | Email ou numéro |
| Statut | En attente/En traitement |
| Actions | Traiter/Rejeter |

**Actions :**
- Traiter : Lance le paiement via l'API
- Traiter manuellement : Marque comme payé (paiement hors système)
- Rejeter : Refuse avec motif (recrédite le solde)

### 11.7.3 Historique des paiements

**Tableau avec filtres :**
| Colonne | Description |
|---------|-------------|
| Date | Date du paiement |
| Influenceur | Nom |
| Montant | Montant payé |
| Méthode | PayPal/Wise/Mobile Money |
| Référence | ID transaction |
| Statut | Payé/Échoué |

**Filtres :**
- Par période
- Par méthode
- Par influenceur
- Par statut

### 11.7.4 Rapports financiers

| Rapport | Contenu |
|---------|---------|
| Mensuel | Synthèse des commissions et paiements du mois |
| Par influenceur | Performance financière par influenceur |
| Par pays | Revenus générés par pays |
| Par langue | Revenus générés par langue |
| Export comptable | CSV pour intégration comptabilité |

## 11.8 Gamification (Admin)

### 11.8.1 Top 10 mensuel

**Affichage du classement actuel :**
- Mois sélectionnable (historique)
- Top 10 avec détails (nom, communauté, gains)
- Bonus à attribuer

**Actions :**
- Forcer l'attribution des bonus (normalement automatique)
- Exclure un influenceur du classement (cas de fraude)

### 11.8.2 Gestion des niveaux

**Configuration des seuils :**
| Niveau | Seuil modifiable | Bonus modifiable |
|--------|------------------|------------------|
| Apprenti | 0-X | +Y% |
| Confirmé | X-X | +Y% |
| Expert | X-X | +Y% |
| Ambassadeur | X-X | +Y% |
| Élite | X+ | +Y% |

### 11.8.3 Gestion des badges

**Liste des badges :**
- Nom et icône
- Condition d'obtention
- Nombre d'influenceurs ayant ce badge
- Activer/Désactiver le badge

**Attribution manuelle :**
- Possibilité d'attribuer un badge manuellement à un influenceur (cas exceptionnels)

## 11.9 Configuration Influenceurs

### 11.9.1 Paramètres généraux

| Paramètre | Type | Valeur par défaut |
|-----------|------|-------------------|
| Commission client | Montant | 10$ |
| Commission recrutement | Montant | 5$ |
| Remise client | Pourcentage | 5% |
| Durée cookie | Jours | 30 |
| Durée affiliation recrutement | Mois | 6 |
| Seuil minimum retrait | Montant | 50$ |
| Délai validation commission | Jours | 7-14 |

### 11.9.2 Paramètres de paiement

| Paramètre | Type | Options |
|-----------|------|---------|
| PayPal activé | Boolean | Oui/Non |
| Wise activé | Boolean | Oui/Non |
| Mobile Money activé | Boolean | Oui/Non |
| Providers Mobile Money | Multi-select | M-Pesa, Orange Money, MTN, Airtel |
| Paiement automatique | Boolean | Oui/Non |

### 11.9.3 Paramètres de gamification

| Paramètre | Type |
|-----------|------|
| Bonus Top 1 | Multiplicateur |
| Bonus Top 2 | Multiplicateur |
| Bonus Top 3 | Multiplicateur |
| Seuils de niveau | Tableau |
| Bonus par niveau | Tableau |

## 11.10 Gestion des Widgets et Outils Promotionnels (Admin)

Cette section permet aux administrateurs de créer, modifier et gérer tous les widgets et outils promotionnels mis à disposition des influenceurs.

### 11.10.1 Vue d'ensemble du module

```
GESTION DES WIDGETS
├── 📷 Bannières & Images
│   ├── Liste des bannières
│   ├── Ajouter une bannière
│   └── Catégories/Dimensions
├── 🧩 Widgets Interactifs
│   ├── Liste des widgets
│   ├── Configurer les widgets
│   └── Styles/Thèmes
├── 📝 Textes Promotionnels
│   ├── Liste des textes
│   ├── Ajouter/Modifier
│   └── Traductions
└── ⚙️ Configuration générale
    ├── Couleurs disponibles
    └── Options de personnalisation
```

### 11.10.2 Gestion des Bannières

#### Liste des bannières

**Tableau principal :**

| Colonne | Description |
|---------|-------------|
| Aperçu | Miniature de la bannière |
| Nom | Nom interne de la bannière |
| Dimensions | Largeur × Hauteur |
| Catégorie | Type (Header, Sidebar, Social, etc.) |
| Style | Moderne, Classique, Coloré, etc. |
| Statut | Actif / Inactif |
| Téléchargements | Nombre de fois téléchargée |
| Actions | Modifier, Dupliquer, Désactiver, Supprimer |

**Filtres :**
- Par catégorie/dimension
- Par style
- Par statut
- Recherche par nom

#### Ajouter/Modifier une bannière

**Formulaire :**

| Champ | Type | Description |
|-------|------|-------------|
| Nom interne | Texte | Nom pour identification (non visible influenceurs) |
| Catégorie | Select | Header, Sidebar, Social Post, Story, Email, etc. |
| Dimensions | Select ou Custom | Largeur × Hauteur en pixels |
| Style | Select | Moderne Rouge, Classique Rouge, Dégradé Rouge, Minimaliste, Sombre Rouge |
| Fichier PNG | Upload | Image avec fond transparent |
| Fichier JPG | Upload | Image avec fond opaque (optionnel) |
| Zone code affilié | Coordonnées | Position X, Y où insérer le code (si dynamique) |
| Zone nom communauté | Coordonnées | Position X, Y où insérer le nom (si dynamique) |
| Ordre d'affichage | Nombre | Position dans la liste pour les influenceurs |
| Statut | Toggle | Actif / Inactif |

**Options avancées :**
- Permettre personnalisation couleur : Oui/Non
- Permettre ajout nom communauté : Oui/Non
- Bannière mise en avant : Oui/Non

#### Catégories de bannières

L'admin peut gérer les catégories :

| Catégorie | Dimensions standards | Description |
|-----------|---------------------|-------------|
| Header Large | 970×90 | Bannière en-tête large |
| Header Standard | 728×90 | Bannière en-tête standard |
| Header Medium | 468×60 | Bannière moyenne |
| Sidebar Rectangle | 300×250 | Rectangle sidebar |
| Sidebar Carré | 300×300 | Carré sidebar |
| Sidebar Vertical | 160×600 | Skyscraper vertical |
| Post Facebook | 1200×630 | Publication Facebook/LinkedIn |
| Post Instagram | 1080×1080 | Publication Instagram carrée |
| Story | 1080×1920 | Story verticale |
| YouTube Thumbnail | 1280×720 | Miniature vidéo |
| Email Signature | 600×100 | Signature email |

**Actions sur les catégories :**
- Ajouter une catégorie
- Modifier les dimensions
- Réorganiser l'ordre
- Désactiver une catégorie

### 11.10.3 Gestion des Widgets Interactifs

#### Liste des widgets

**Tableau :**

| Colonne | Description |
|---------|-------------|
| Aperçu | Capture du widget |
| Nom | Nom du widget |
| Type | Recherche, Bouton, Card, Floating |
| Dimensions | Taille par défaut |
| Personnalisable | Oui/Non |
| Statut | Actif/Inactif |
| Utilisations | Nombre d'influenceurs l'utilisant |
| Actions | Configurer, Désactiver |

#### Configuration d'un widget

**Paramètres du Widget Recherche :**

| Paramètre | Type | Description |
|-----------|------|-------------|
| Titre | Texte (9 langues) | "Besoin d'un expert à l'étranger ?" |
| Sous-titre | Texte (9 langues) | Optionnel |
| Placeholder pays | Texte (9 langues) | "Dans quel pays êtes-vous ?" |
| Placeholder expert | Texte (9 langues) | "Type d'expert recherché" |
| Texte bouton | Texte (9 langues) | "Trouver un expert (-5%)" |
| Afficher nom communauté | Boolean | Oui/Non |
| Liste des experts | Multi-select | Avocat, Notaire, Comptable, etc. |
| Dimensions | Nombre | Largeur × Hauteur |

**Styles disponibles :**

Tous les styles utilisent le **rouge SOS-Expat (#DC2626)** comme couleur d'accent principale (boutons, éléments clés).

| Style | Description | Bouton CTA |
|-------|-------------|------------|
| Modern Light | Fond blanc, coins arrondis, ombres douces | Rouge #DC2626 |
| Modern Dark | Fond sombre (#1F2937), coins arrondis, accents rouges | Rouge #DC2626 |
| Classic | Bordures classiques, fond blanc, touches rouges | Rouge #DC2626 |
| Vibrant | Dégradé rouge (#DC2626 → #B91C1C), style énergique | Rouge dégradé |
| Minimal | Ultra épuré, fond blanc, bouton rouge | Rouge #DC2626 |

Pour chaque style, l'admin peut définir :
- Couleurs de fond (blanc, gris clair, sombre)
- Couleurs de texte (noir, blanc, gris)
- **Couleur du bouton : TOUJOURS Rouge SOS-Expat par défaut**
- Rayon des coins
- Ombres
- Police

#### Gestion des thèmes de couleur

L'admin définit les couleurs que les influenceurs peuvent choisir.

**Couleur principale de la charte SOS-Expat : ROUGE**

| Nom couleur | Code hex | Aperçu | Note |
|-------------|----------|--------|------|
| **Rouge SOS-Expat** | #DC2626 | 🔴 | **COULEUR PAR DÉFAUT** |
| Rouge foncé | #B91C1C | 🔴 | Variante sombre |
| Rouge clair | #EF4444 | 🔴 | Variante claire |
| Noir | #1F2937 | ⚫ | Textes, contrastes |
| Blanc | #FFFFFF | ⚪ | Fonds, textes sur rouge |
| Gris | #6B7280 | 🔘 | Éléments secondaires |

**Règles de la charte graphique SOS-Expat :**
- Le rouge (#DC2626) est TOUJOURS la couleur principale/prédominante
- Les widgets et bannières doivent respecter cette charte
- Le logo SOS-Expat doit toujours être visible
- Contraste suffisant pour la lisibilité (texte blanc sur rouge, texte noir sur blanc)

**Actions :**
- Ajouter une couleur secondaire
- Modifier une couleur secondaire
- La couleur rouge SOS-Expat ne peut pas être supprimée ou désactivée
- Désactiver une couleur secondaire

### 11.10.4 Gestion des Textes Promotionnels

#### Liste des textes

**Tableau :**

| Colonne | Description |
|---------|-------------|
| Type | Bio courte, Bio longue, Post, etc. |
| Nom | Nom interne |
| Aperçu | Début du texte |
| Langues | Langues traduites (9/9) |
| Caractères | Longueur max |
| Statut | Actif/Inactif |
| Utilisations | Nombre de copies |
| Actions | Modifier, Dupliquer, Supprimer |

#### Ajouter/Modifier un texte

**Formulaire :**

| Champ | Type | Description |
|-------|------|-------------|
| Nom interne | Texte | Pour identification admin |
| Type | Select | Bio courte, Bio longue, Post, Message bienvenue |
| Longueur max recommandée | Nombre | En caractères |
| Variables disponibles | Info | [CODE], [LIEN], [NOM_COMMUNAUTE] |

**Zone de texte par langue :**

Pour chaque langue (9), un champ texte avec :
- Compteur de caractères
- Prévisualisation avec variables remplacées
- Indicateur de traduction manquante

**Variables dynamiques :**

| Variable | Remplacée par |
|----------|---------------|
| `[CODE]` | Code affilié de l'influenceur (ex: JEAN456) |
| `[LIEN]` | Lien complet (ex: sos-expat.com/ref/i/JEAN456) |
| `[NOM_COMMUNAUTE]` | Nom de la communauté de l'influenceur |
| `[REMISE]` | Pourcentage de remise (ex: 5%) |

**Exemple de texte avec variables :**
```
🆘 Besoin d'aide à l'étranger ? Avocat, notaire, expert...
-[REMISE] avec mon lien → [LIEN]
```

### 11.10.5 Configuration générale des outils

#### Options de personnalisation

L'admin définit ce que les influenceurs peuvent personnaliser :

| Option | Activer/Désactiver |
|--------|-------------------|
| Choix de la couleur des widgets | ☑️ Activé |
| Ajout du nom de communauté sur bannières | ☑️ Activé |
| Choix du style de widget | ☑️ Activé |
| QR Code avec logo personnalisé | ☐ Désactivé |
| Texte personnalisé sur QR Code | ☑️ Activé |

#### Statistiques des outils

Dashboard des statistiques :

| Métrique | Description |
|----------|-------------|
| Bannières téléchargées | Total et par type |
| Widgets intégrés | Nombre de widgets actifs |
| Codes copiés | Nombre de copies HTML/BBCode |
| QR Codes générés | Total des téléchargements |

**Graphiques :**
- Top 10 des bannières les plus téléchargées
- Répartition par type de widget
- Évolution des téléchargements dans le temps

### 11.10.6 Import/Export des ressources

#### Export

- Exporter toutes les bannières (ZIP)
- Exporter les textes (CSV avec toutes les langues)
- Exporter la configuration des widgets (JSON)

#### Import

- Import en masse de bannières (ZIP avec fichier CSV de métadonnées)
- Import de textes traduits (CSV)
- Import de configuration (JSON)

### 11.10.7 Interface Admin - Aperçu

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🎨 GESTION DES WIDGETS                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [📷 Bannières] [🧩 Widgets] [📝 Textes] [⚙️ Config]                       │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  📷 BANNIÈRES                                        [+ Ajouter] [Import]  │
│                                                                             │
│  Filtres: [Catégorie ▼] [Style ▼] [Statut ▼]        🔍 [Rechercher...]    │
│                                                                             │
│  ┌───────┬─────────────────────┬────────────┬──────────┬────────┬────────┐ │
│  │ Aperçu│ Nom                 │ Dimensions │ Style    │ Statut │ Actions│ │
│  ├───────┼─────────────────────┼────────────┼──────────┼────────┼────────┤ │
│  │ [img] │ Header Moderne Bleu │ 728×90     │ Moderne  │ 🟢 Actif│ ✏️ 🗑️ │ │
│  ├───────┼─────────────────────┼────────────┼──────────┼────────┼────────┤ │
│  │ [img] │ Header Classic      │ 728×90     │ Classique│ 🟢 Actif│ ✏️ 🗑️ │ │
│  ├───────┼─────────────────────┼────────────┼──────────┼────────┼────────┤ │
│  │ [img] │ Sidebar Coloré      │ 300×250    │ Coloré   │ 🟡 Inactif│ ✏️ 🗑️│ │
│  ├───────┼─────────────────────┼────────────┼──────────┼────────┼────────┤ │
│  │ [img] │ Post Instagram Dark │ 1080×1080  │ Sombre   │ 🟢 Actif│ ✏️ 🗑️ │ │
│  └───────┴─────────────────────┴────────────┴──────────┴────────┴────────┘ │
│                                                                             │
│  Affichage 1-10 sur 47 bannières                    [< Préc] [Suiv >]      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ✏️ MODIFIER BANNIÈRE                                          [Enregistrer]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Nom interne *                                                              │
│  [Header Moderne Bleu_________________________________]                     │
│                                                                             │
│  Catégorie *                    Dimensions                                  │
│  [Header Standard ▼]            [728] × [90] px                            │
│                                                                             │
│  Style *                        Ordre d'affichage                          │
│  [Moderne ▼]                    [1___]                                     │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  FICHIERS                                                                   │
│                                                                             │
│  PNG (fond transparent) *       JPG (fond opaque)                          │
│  [banner-header-modern.png]     [Aucun fichier]                            │
│  [Remplacer]                    [Uploader]                                  │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  APERÇU                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    [ Bannière 728×90 ]                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  OPTIONS                                                                    │
│  ☑️ Permettre personnalisation couleur                                     │
│  ☑️ Permettre ajout nom communauté                                         │
│  ☐ Bannière mise en avant (affichée en premier)                           │
│                                                                             │
│  Statut : [● Actif ○ Inactif]                                             │
│                                                                             │
│  [Annuler]                                              [Enregistrer]      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 12. SYSTÈME DE NOTIFICATIONS

## 12.1 Types de notifications

### 12.1.1 Notifications pour les Influenceurs

| Événement | Canal | Message |
|-----------|-------|---------|
| Inscription réussie | Email + Dashboard | Bienvenue dans le programme ! |
| Nouvelle commission créée | Dashboard | Vous avez gagné X$ |
| Commission validée | Dashboard | X$ disponible pour retrait |
| Paiement effectué | Email + Dashboard | Paiement de X$ effectué |
| Paiement échoué | Email + Dashboard | Erreur de paiement - Action requise |
| Montée de niveau | Dashboard | Félicitations ! Niveau X atteint |
| Badge débloqué | Dashboard | Nouveau badge : X |
| Entrée Top 10 | Dashboard | Vous êtes dans le Top 10 ! |
| Fin de mois (Top 3) | Email + Dashboard | Bonus Top X attribué |
| Nouveau filleul | Dashboard | Nouveau prestataire recruté |
| Inactivité 30 jours | Email | On ne vous voit plus... |

### 12.1.2 Notifications pour les Admins

| Événement | Canal | Message |
|-----------|-------|---------|
| Nouvel influenceur | Dashboard Admin | Nouvelle inscription : X |
| Demande de retrait | Dashboard Admin | Demande de retrait : X$ par Y |
| Gros influenceur | Dashboard Admin | Influenceur 100K+ inscrit |
| Fraude détectée | Email + Dashboard | Alerte fraude : X |

## 12.2 Canaux de notification

### 12.2.1 Dashboard (in-app)

- Icône cloche avec badge compteur
- Liste des notifications récentes
- Marquer comme lu
- Tout marquer comme lu
- Historique complet

### 12.2.2 Email

- Templates HTML responsive
- Disponibles en 9 langues
- Lien de désinscription
- Conformité RGPD

### 12.2.3 Push (PWA)

Si l'application est installée en PWA :
- Notifications push natives
- Paramétrable par l'utilisateur

## 12.3 Préférences de notification

L'influenceur peut configurer :
| Type | Email | Dashboard | Push |
|------|-------|-----------|------|
| Commissions | Oui/Non | Toujours | Oui/Non |
| Paiements | Toujours | Toujours | Oui/Non |
| Gamification | Oui/Non | Toujours | Oui/Non |
| Actualités | Oui/Non | Oui/Non | Oui/Non |

---

# 13. MULTILINGUE (9 LANGUES)

## 13.1 Langues supportées

| Code | Langue | Drapeau |
|------|--------|---------|
| fr | Français | 🇫🇷 |
| en | Anglais | 🇬🇧 |
| de | Allemand | 🇩🇪 |
| ru | Russe | 🇷🇺 |
| zh | Chinois | 🇨🇳 |
| es | Espagnol | 🇪🇸 |
| pt | Portugais | 🇵🇹 |
| ar | Arabe | 🇸🇦 |
| hi | Hindi | 🇮🇳 |

## 13.2 Éléments à traduire

### 13.2.1 Frontend Influenceur

| Élément | Fichier/Section |
|---------|-----------------|
| Landing Page | Tous les textes, CTA, FAQ |
| Formulaire inscription | Labels, placeholders, erreurs |
| Dashboard | Menus, titres, labels, messages |
| Emails | Templates complets |
| Notifications | Messages |
| CGU | Document complet |

### 13.2.2 Console Admin

La console admin peut rester en français uniquement (utilisateurs internes).

## 13.3 Gestion des traductions

### 13.3.1 Fichiers de traduction

- Un fichier JSON par langue
- Clés identiques dans tous les fichiers
- Fallback sur le français si traduction manquante

### 13.3.2 Sélection de la langue

**Pour l'influenceur :**
1. Langue choisie à l'inscription
2. Modifiable dans le profil
3. Stockée en base de données

**Pour les visiteurs (landing page) :**
1. Paramètre URL (?lang=en)
2. Détection navigateur
3. Défaut : français

## 13.4 Spécificités par langue

### 13.4.1 Arabe (ar)

- Direction RTL (Right-to-Left)
- Adaptation du layout
- Polices spécifiques

### 13.4.2 Chinois (zh)

- Caractères simplifiés
- Polices spécifiques
- Pas d'espaces entre les mots

### 13.4.3 Hindi (hi)

- Script Devanagari
- Polices spécifiques

## 13.5 Formats localisés

| Élément | Localisation |
|---------|--------------|
| Dates | Format local (JJ/MM/AAAA vs MM/DD/YYYY) |
| Nombres | Séparateurs locaux (1,000.00 vs 1 000,00) |
| Devises | Toujours en USD ($) pour simplifier |

---

# 14. SÉCURITÉ ET ANTI-FRAUDE

## 14.1 Types de fraude potentielle

| Type | Description | Risque |
|------|-------------|--------|
| Auto-parrainage | Influenceur utilise son propre lien | Moyen |
| Faux clics | Génération artificielle de clics | Faible (pas de commission au clic) |
| Faux compte prestataire | Création de faux prestataires | Moyen |
| Collusion | Entente entre influenceur et client | Faible |
| Multi-comptes | Plusieurs comptes influenceur | Moyen |

## 14.2 Mécanismes de protection

### 14.2.1 Protection de base

| Mécanisme | Description |
|-----------|-------------|
| Cookie 30 jours | Durée limitée d'attribution |
| Commission au paiement | Pas de commission sans argent reçu |
| Délai de validation | 7-14 jours pour vérification |
| Email unique | Un seul compte par email |

### 14.2.2 Détection automatique

| Signal | Action |
|--------|--------|
| Même IP influenceur et client | Alerte admin |
| Taux de conversion anormalement élevé | Alerte admin |
| Conversions groupées suspectes | Alerte admin |
| Prestataires recrutés sans activité | Surveillance |

### 14.2.3 Vérifications manuelles

Pour les gros montants ou les cas suspects :
- Vérification de l'URL de la communauté
- Contrôle de cohérence (audience déclarée vs réelle)
- Analyse des patterns de conversion

## 14.3 Actions en cas de fraude

| Niveau | Action |
|--------|--------|
| Suspicion | Gel des commissions + investigation |
| Fraude confirmée légère | Annulation des commissions + avertissement |
| Fraude confirmée grave | Blocage du compte + annulation de tout |
| Récidive | Blocage définitif + blacklist email |

## 14.4 Protection des données

### 14.4.1 Données personnelles

- Chiffrement des mots de passe (bcrypt)
- Chiffrement des données de paiement
- Accès restreint aux données sensibles
- Logs d'accès

### 14.4.2 Conformité RGPD

- Consentement explicite
- Droit d'accès aux données
- Droit de suppression
- Export des données
- Politique de confidentialité

---

# 15. ASPECTS LÉGAUX

## 15.1 Conditions Générales Influenceurs

### Structure du document

1. **Définitions**
   - Influenceur
   - Lien Affilié
   - Commission
   - Conversion
   - Filleul

2. **Inscription et éligibilité**
   - Âge minimum : 18 ans
   - Propriété/admin de la communauté déclarée
   - Informations véridiques

3. **Fonctionnement du programme**
   - Description des liens affiliés
   - Mécanisme de tracking (cookies 30 jours)
   - Remise de 5% pour les clients

4. **Rémunération**
   - Commission Client : 10$ par paiement reçu
   - Commission Recrutement : 5$ sur chaque appel reçu par les prestataires recrutés
   - Durée de l'affiliation recrutement : 6 mois (MENTIONNÉ ICI)
   - Bonus de niveau
   - Bonus Top 3 mensuel

5. **Paiement**
   - Seuil minimum : 50$
   - Méthodes : PayPal, Wise, Mobile Money
   - Délai de traitement
   - Frais à la charge de l'influenceur

6. **Obligations de l'Influenceur**
   - Ne pas spammer
   - Ne pas créer de faux témoignages
   - Respecter les règles des plateformes tierces
   - Ne pas dénigrer SOS-Expat

7. **Suspension et résiliation**
   - Motifs de suspension
   - Procédure
   - Sort des commissions en cas de suspension

8. **Propriété intellectuelle**
   - Utilisation de la marque SOS-Expat
   - Contenus autorisés

9. **Limitation de responsabilité**

10. **Données personnelles (RGPD)**
    - Données collectées
    - Finalités
    - Durée de conservation
    - Droits de l'influenceur

11. **Modification des conditions**
    - Notification préalable
    - Acceptation tacite

12. **Loi applicable et juridiction**
    - Droit estonien (entreprise enregistrée en Estonie)

## 15.2 Mentions légales Landing Page

- Identité de l'entreprise (SOS-Expat, Estonie)
- Coordonnées de contact
- Hébergeur
- Conditions d'utilisation
- Politique de confidentialité

## 15.3 Conformité fiscale

- Chaque influenceur est responsable de ses déclarations fiscales
- SOS-Expat ne prélève pas d'impôt à la source
- Mention dans les CGU

---

# 16. STRUCTURE BASE DE DONNÉES

## 16.1 Tables principales

### Table `users` (mise à jour)

| Champ | Type | Description |
|-------|------|-------------|
| id | INT (PK) | Identifiant unique |
| email | VARCHAR (unique) | Email |
| password | VARCHAR | Mot de passe hashé |
| name | VARCHAR | Nom complet |
| role | ENUM | 'client', 'prestataire', 'chatter', 'influencer' |
| language | ENUM | Langue de l'interface |
| email_verified_at | TIMESTAMP | Date de vérification email |
| created_at | TIMESTAMP | Date de création |
| updated_at | TIMESTAMP | Date de mise à jour |

### Table `influencer_profiles`

| Champ | Type | Description |
|-------|------|-------------|
| id | INT (PK) | Identifiant unique |
| user_id | INT (FK unique) | Lien vers users |
| affiliate_code_client | VARCHAR (unique) | Code affilié client |
| affiliate_code_recruitment | VARCHAR (unique) | Code affilié recrutement |
| status | ENUM | 'active', 'suspended', 'blocked' |
| platform | ENUM | Type de plateforme |
| platform_url | VARCHAR | URL de la communauté |
| community_name | VARCHAR | Nom de la communauté |
| audience_size | INT | Nombre de membres |
| community_language | ENUM | Langue de la communauté |
| community_country | VARCHAR | Code pays (null = général) |
| community_theme | VARCHAR | Thématique |
| level | INT | Niveau (1-5) |
| current_month_bonus_multiplier | DECIMAL | Multiplicateur bonus en cours |
| payment_method | ENUM | 'paypal', 'wise', 'mobile_money' |
| payment_details | JSON | Détails du paiement |
| total_earnings | DECIMAL | Gains totaux |
| pending_balance | DECIMAL | En attente de validation |
| available_balance | DECIMAL | Disponible pour retrait |
| current_streak | INT | Jours de streak actuel |
| longest_streak | INT | Record de streak |
| last_conversion_at | TIMESTAMP | Dernière conversion |
| terms_accepted_at | TIMESTAMP | Date acceptation CGU |
| created_at | TIMESTAMP | Date de création |
| updated_at | TIMESTAMP | Date de mise à jour |

### Table `partner_commissions`

| Champ | Type | Description |
|-------|------|-------------|
| id | INT (PK) | Identifiant unique |
| user_id | INT (FK) | Influenceur ou Chatter |
| partner_type | ENUM | 'chatter', 'influencer' |
| type | ENUM | 'client_call', 'recruitment' |
| source_id | INT | ID de l'appel ou du prestataire |
| source_description | VARCHAR | Description lisible |
| amount_base | DECIMAL | Montant de base (10$ ou 5$) |
| level_bonus_multiplier | DECIMAL | Bonus de niveau |
| top3_bonus_multiplier | DECIMAL | Bonus Top 3 |
| amount_final | DECIMAL | Montant final calculé |
| status | ENUM | 'pending', 'validated', 'available', 'paid', 'cancelled' |
| fraud_check_passed | BOOLEAN | Vérification anti-fraude |
| fraud_check_notes | TEXT | Notes de vérification |
| validated_at | TIMESTAMP | Date de validation |
| available_at | TIMESTAMP | Date de disponibilité |
| paid_at | TIMESTAMP | Date de paiement |
| created_at | TIMESTAMP | Date de création |

### Table `partner_referrals` (filleuls)

| Champ | Type | Description |
|-------|------|-------------|
| id | INT (PK) | Identifiant unique |
| influencer_user_id | INT (FK) | Influenceur recruteur |
| prestataire_user_id | INT (FK) | Prestataire recruté |
| status | ENUM | 'active', 'expired' |
| calls_count | INT | Nombre d'appels reçus |
| commissions_generated | DECIMAL | Total des commissions générées |
| expires_at | TIMESTAMP | Date d'expiration (6 mois) |
| created_at | TIMESTAMP | Date de recrutement |

### Table `partner_badges`

| Champ | Type | Description |
|-------|------|-------------|
| id | INT (PK) | Identifiant unique |
| user_id | INT (FK) | Influenceur ou Chatter |
| badge_code | VARCHAR | Code du badge |
| unlocked_at | TIMESTAMP | Date d'obtention |
| created_at | TIMESTAMP | Date de création |

### Table `partner_withdrawals`

| Champ | Type | Description |
|-------|------|-------------|
| id | INT (PK) | Identifiant unique |
| user_id | INT (FK) | Influenceur ou Chatter |
| amount | DECIMAL | Montant demandé |
| payment_method | ENUM | Méthode de paiement |
| payment_details | JSON | Détails du paiement |
| status | ENUM | 'pending', 'processing', 'completed', 'failed' |
| failure_reason | VARCHAR | Raison de l'échec si applicable |
| processed_at | TIMESTAMP | Date de traitement |
| transaction_reference | VARCHAR | Référence de transaction API |
| created_at | TIMESTAMP | Date de demande |

### Table `partner_clicks`

| Champ | Type | Description |
|-------|------|-------------|
| id | INT (PK) | Identifiant unique |
| user_id | INT (FK) | Influenceur ou Chatter |
| partner_type | ENUM | 'chatter', 'influencer' |
| link_type | ENUM | 'client', 'recruitment' |
| ip_address | VARCHAR | IP (anonymisée) |
| user_agent | VARCHAR | User-Agent |
| referer | VARCHAR | URL de provenance |
| country_code | VARCHAR | Pays détecté |
| converted | BOOLEAN | A mené à une conversion |
| converted_at | TIMESTAMP | Date de conversion |
| created_at | TIMESTAMP | Date du clic |

### Table `partner_notifications`

| Champ | Type | Description |
|-------|------|-------------|
| id | INT (PK) | Identifiant unique |
| user_id | INT (FK) | Destinataire |
| type | VARCHAR | Type de notification |
| title | VARCHAR | Titre |
| message | TEXT | Message |
| data | JSON | Données additionnelles |
| read_at | TIMESTAMP | Date de lecture |
| created_at | TIMESTAMP | Date de création |

### Table `monthly_rankings`

| Champ | Type | Description |
|-------|------|-------------|
| id | INT (PK) | Identifiant unique |
| year | INT | Année |
| month | INT | Mois |
| partner_type | ENUM | 'chatter', 'influencer' |
| user_id | INT (FK) | Participant |
| rank | INT | Position |
| earnings | DECIMAL | Gains du mois |
| bonus_applied | DECIMAL | Bonus appliqué |
| created_at | TIMESTAMP | Date de création |

### Table `influencer_settings` (configuration admin)

| Champ | Type | Description |
|-------|------|-------------|
| key | VARCHAR (PK) | Clé du paramètre |
| value | TEXT | Valeur |
| description | VARCHAR | Description |
| updated_at | TIMESTAMP | Date de mise à jour |
| updated_by | INT (FK) | Admin ayant modifié |

### Table `widget_banners` (bannières promotionnelles)

| Champ | Type | Description |
|-------|------|-------------|
| id | INT (PK) | Identifiant unique |
| name | VARCHAR | Nom interne |
| category_id | INT (FK) | Catégorie de bannière |
| style | ENUM | 'modern', 'classic', 'colorful', 'minimal', 'dark' |
| width | INT | Largeur en pixels |
| height | INT | Hauteur en pixels |
| file_png | VARCHAR | Chemin fichier PNG |
| file_jpg | VARCHAR | Chemin fichier JPG (optionnel) |
| allow_color_customization | BOOLEAN | Personnalisation couleur autorisée |
| allow_community_name | BOOLEAN | Ajout nom communauté autorisé |
| is_featured | BOOLEAN | Mise en avant |
| display_order | INT | Ordre d'affichage |
| status | ENUM | 'active', 'inactive' |
| download_count | INT | Nombre de téléchargements |
| created_at | TIMESTAMP | Date de création |
| updated_at | TIMESTAMP | Date de mise à jour |

### Table `widget_banner_categories` (catégories de bannières)

| Champ | Type | Description |
|-------|------|-------------|
| id | INT (PK) | Identifiant unique |
| name | VARCHAR | Nom de la catégorie |
| slug | VARCHAR | Identifiant URL |
| default_width | INT | Largeur par défaut |
| default_height | INT | Hauteur par défaut |
| description | VARCHAR | Description |
| display_order | INT | Ordre d'affichage |
| status | ENUM | 'active', 'inactive' |
| created_at | TIMESTAMP | Date de création |

### Table `widget_interactive` (widgets interactifs)

| Champ | Type | Description |
|-------|------|-------------|
| id | INT (PK) | Identifiant unique |
| name | VARCHAR | Nom du widget |
| type | ENUM | 'search', 'search_large', 'button', 'card', 'floating' |
| default_width | INT | Largeur par défaut |
| default_height | INT | Hauteur par défaut |
| config | JSON | Configuration du widget (textes, options) |
| available_styles | JSON | Styles disponibles |
| allow_color_customization | BOOLEAN | Personnalisation couleur |
| allow_community_name | BOOLEAN | Affichage nom communauté |
| status | ENUM | 'active', 'inactive' |
| usage_count | INT | Nombre d'influenceurs utilisant ce widget |
| created_at | TIMESTAMP | Date de création |
| updated_at | TIMESTAMP | Date de mise à jour |

### Table `widget_interactive_styles` (styles des widgets)

| Champ | Type | Description |
|-------|------|-------------|
| id | INT (PK) | Identifiant unique |
| widget_id | INT (FK) | Widget associé |
| name | VARCHAR | Nom du style |
| slug | VARCHAR | Identifiant |
| css_config | JSON | Configuration CSS (couleurs, bordures, etc.) |
| preview_image | VARCHAR | Chemin image de prévisualisation |
| is_default | BOOLEAN | Style par défaut |
| display_order | INT | Ordre d'affichage |
| status | ENUM | 'active', 'inactive' |
| created_at | TIMESTAMP | Date de création |

### Table `widget_colors` (couleurs disponibles)

| Champ | Type | Description |
|-------|------|-------------|
| id | INT (PK) | Identifiant unique |
| name | VARCHAR | Nom de la couleur |
| hex_code | VARCHAR(7) | Code hexadécimal (#DC2626 = rouge SOS-Expat) |
| is_default | BOOLEAN | Couleur par défaut |
| display_order | INT | Ordre d'affichage |
| status | ENUM | 'active', 'inactive' |
| created_at | TIMESTAMP | Date de création |

### Table `widget_texts` (textes promotionnels)

| Champ | Type | Description |
|-------|------|-------------|
| id | INT (PK) | Identifiant unique |
| name | VARCHAR | Nom interne |
| type | ENUM | 'bio_short', 'bio_long', 'post', 'welcome', 'description' |
| max_length | INT | Longueur max recommandée |
| content_fr | TEXT | Contenu français |
| content_en | TEXT | Contenu anglais |
| content_de | TEXT | Contenu allemand |
| content_ru | TEXT | Contenu russe |
| content_zh | TEXT | Contenu chinois |
| content_es | TEXT | Contenu espagnol |
| content_pt | TEXT | Contenu portugais |
| content_ar | TEXT | Contenu arabe |
| content_hi | TEXT | Contenu hindi |
| display_order | INT | Ordre d'affichage |
| status | ENUM | 'active', 'inactive' |
| copy_count | INT | Nombre de copies |
| created_at | TIMESTAMP | Date de création |
| updated_at | TIMESTAMP | Date de mise à jour |

### Table `widget_downloads_log` (log des téléchargements)

| Champ | Type | Description |
|-------|------|-------------|
| id | INT (PK) | Identifiant unique |
| user_id | INT (FK) | Influenceur |
| widget_type | ENUM | 'banner', 'qrcode', 'text', 'code' |
| widget_id | INT | ID du widget téléchargé |
| format | VARCHAR | Format téléchargé (png, jpg, svg, html, bbcode) |
| created_at | TIMESTAMP | Date du téléchargement |

## 16.2 Index recommandés

| Table | Index | Colonnes |
|-------|-------|----------|
| influencer_profiles | idx_status | status |
| influencer_profiles | idx_language | community_language |
| influencer_profiles | idx_country | community_country |
| influencer_profiles | idx_platform | platform |
| partner_commissions | idx_user_status | user_id, status |
| partner_commissions | idx_created | created_at |
| partner_clicks | idx_user_date | user_id, created_at |
| partner_referrals | idx_influencer | influencer_user_id |
| partner_referrals | idx_expires | expires_at |
| monthly_rankings | idx_period | year, month, partner_type |
| widget_banners | idx_category | category_id |
| widget_banners | idx_status | status |
| widget_texts | idx_type | type |
| widget_downloads_log | idx_user | user_id |
| widget_downloads_log | idx_date | created_at |

## 16.3 Résumé des tables

| Catégorie | Tables | Description |
|-----------|--------|-------------|
| Utilisateurs | users, influencer_profiles | Comptes et profils |
| Commissions | partner_commissions, partner_referrals | Gains et filleuls |
| Gamification | partner_badges, monthly_rankings | Badges et classements |
| Paiements | partner_withdrawals | Retraits |
| Tracking | partner_clicks | Clics et conversions |
| Notifications | partner_notifications | Alertes et messages |
| Widgets | widget_banners, widget_banner_categories, widget_interactive, widget_interactive_styles, widget_colors, widget_texts, widget_downloads_log | Outils promotionnels |
| Configuration | influencer_settings | Paramètres système |

**Total : 17 tables**

---

# 17. ESTIMATION DU DÉVELOPPEMENT

## 17.1 Modules et temps estimés

| Module | Temps estimé | Priorité |
|--------|--------------|----------|
| Base de données + migrations | 1 jour | 1 |
| Landing Page (9 langues) | 1-2 jours | 1 |
| Formulaire inscription | 1 jour | 1 |
| Système de tracking (cookies, liens) | 1-2 jours | 1 |
| Dashboard Influenceur (hors widgets) | 3-4 jours | 1 |
| Système de commissions | 2 jours | 1 |
| Console Admin - Liste Influenceurs | 2 jours | 2 |
| Console Admin - Vues Pays/Langue | 1 jour | 2 |
| Console Admin - Finances | 1-2 jours | 2 |
| Gamification (niveaux, badges, streak) | 2 jours | 2 |
| Top 10 mensuel + bonus | 1 jour | 2 |
| Intégration paiements (PayPal, Wise, Flutterwave) | 2-3 jours | 2 |
| **Page Outils Promotionnels (Dashboard)** | 2-3 jours | 2 |
| **Gestion des Widgets (Admin)** | 3-4 jours | 2 |
| **Génération dynamique bannières/QR** | 1-2 jours | 2 |
| **Widgets interactifs (iframe)** | 2-3 jours | 3 |
| Système de notifications | 1 jour | 3 |
| Multilingue (traductions) | 2-3 jours | 3 |
| Tests et ajustements | 2 jours | 3 |

## 17.2 Total estimé

**Total : 28-38 jours de développement**

(Ajout de 8-12 jours pour le système de widgets complet)

## 17.3 Phases recommandées

### Phase 1 - MVP (10-12 jours)
- Base de données
- Landing Page (français + anglais)
- Inscription
- Dashboard basique (sans widgets)
- Tracking et commissions
- Console Admin basique

### Phase 2 - Complet (12-16 jours)
- Gamification complète
- Paiements automatiques
- Console Admin complète
- **Page Outils Promotionnels basique (bannières statiques, QR Code, textes)**
- **Gestion des Widgets (Admin)**
- Multilingue (9 langues)

### Phase 3 - Avancé (6-10 jours)
- **Widgets interactifs (iframe)**
- **Personnalisation avancée des bannières**
- Notifications avancées
- Rapports et analytics
- Optimisations UX
- Tests et corrections

## 17.4 Détail du développement Widgets

### Phase 2 - Widgets basiques

| Sous-module | Temps | Description |
|-------------|-------|-------------|
| Page Outils Promotionnels | 2-3 jours | Interface avec onglets, affichage des bannières/textes |
| Admin - CRUD Bannières | 1-2 jours | Liste, ajout, modification, suppression |
| Admin - CRUD Textes | 1 jour | Gestion des textes avec traductions |
| Admin - Configuration | 0.5 jour | Couleurs, options de personnalisation |
| Génération QR Code dynamique | 0.5 jour | API de génération avec options |
| Génération codes (HTML, BBCode, MD) | 0.5 jour | Templates avec variables |

### Phase 3 - Widgets avancés

| Sous-module | Temps | Description |
|-------------|-------|-------------|
| Widget Recherche (iframe) | 1-2 jours | Mini-formulaire intégrable |
| Widget Bouton/Floating | 1 jour | Widgets JS légers |
| Personnalisation en temps réel | 1-2 jours | Preview live des personnalisations |
| Admin - Gestion styles widgets | 1 jour | Configuration des styles/thèmes |
| Statistiques widgets | 0.5 jour | Tracking des téléchargements/utilisations |

## 17.5 Dépendances avec le système Chatters

Si le système Chatters est développé en premier, les éléments suivants seront réutilisables :
- Table `partner_commissions` (commune)
- Table `partner_badges` (commune)
- Table `partner_withdrawals` (commune)
- Logique de gamification
- Intégration paiements
- Système de notifications
- **Tables widgets** (peuvent être partagées avec les Chatters)

**Gain estimé si Chatters fait avant : 5-7 jours**

## 17.6 Ressources graphiques nécessaires

Pour le système de widgets, il faudra prévoir :

| Ressource | Quantité | Responsable |
|-----------|----------|-------------|
| Bannières 728×90 | 3-5 designs | Designer |
| Bannières 300×250 | 3-5 designs | Designer |
| Bannières 300×300 | 3-5 designs | Designer |
| Posts Social 1200×630 | 3-5 designs | Designer |
| Posts Instagram 1080×1080 | 3-5 designs | Designer |
| Stories 1080×1920 | 3-5 designs | Designer |
| Signatures email 600×100 | 3-5 designs | Designer |
| Maquettes widgets interactifs | 3-5 styles | Designer |

**⚠️ IMPORTANT - Charte graphique à respecter :**

Tous les éléments graphiques doivent respecter la charte SOS-Expat :

| Élément | Spécification |
|---------|---------------|
| **Couleur principale** | Rouge #DC2626 (OBLIGATOIRE et dominant) |
| Couleur secondaire | Rouge foncé #B91C1C (dégradés, hover) |
| Fond principal | Blanc #FFFFFF |
| Textes | Noir #1F2937 ou Blanc sur fond rouge |
| Dégradés | Uniquement rouge (#DC2626 → #B91C1C) |
| Logo | SOS-Expat visible sur chaque élément |
| Boutons CTA | Toujours en rouge avec texte blanc |

**Estimation design : 3-5 jours de travail graphique (en parallèle du développement)**

---

# ANNEXES

## Annexe A : Liste des plateformes

| Code | Libellé | Icône |
|------|---------|-------|
| facebook_group | Groupe Facebook | 📘 |
| facebook_page | Page Facebook | 📄 |
| youtube | YouTube | 📺 |
| tiktok | TikTok | 📱 |
| instagram | Instagram | 📷 |
| blog | Blog / Site web | 🌐 |
| forum | Forum | 💬 |
| other | Autre | 🔗 |

## Annexe B : Liste des pays

197 pays disponibles + option "Général (tous pays)".

Format : Code ISO 3166-1 alpha-2 (FR, US, TH, etc.)

## Annexe C : Méthodes de paiement Mobile Money

| Provider | Pays couverts |
|----------|---------------|
| M-Pesa | Kenya, Tanzania, Mozambique, DRC, Ghana, Egypt, Lesotho |
| Orange Money | Sénégal, Côte d'Ivoire, Mali, Burkina Faso, Cameroun, Madagascar |
| MTN MoMo | Ghana, Uganda, Cameroun, Rwanda, Bénin, Côte d'Ivoire, Congo |
| Airtel Money | Kenya, Uganda, Tanzania, Rwanda, DRC, Madagascar, Malawi |

## Annexe D : Glossaire

| Terme | Définition |
|-------|------------|
| Influenceur | Participant au programme partenaires (admin groupe, créateur de contenu) |
| Chatter | Participant au programme d'affiliation actif |
| Conversion | Paiement d'un client via un lien affilié |
| Filleul | Prestataire recruté via un lien de recrutement |
| Commission | Rémunération versée à l'influenceur |
| Streak | Série de jours consécutifs avec conversion |
| Top 10 | Classement mensuel des meilleurs influenceurs |

---

**Fin du cahier des charges**

*Document rédigé le 29 janvier 2026*
*Version 1.0*
