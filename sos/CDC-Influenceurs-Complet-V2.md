# CAHIER DES CHARGES COMPLET
## Mise à jour du Programme Influenceurs SOS-Expat
### Ajout : Codes Promo Vocaux & Ressources Podcasters

**Version 2.0**

---

## TABLE DES MATIÈRES

1. Vue d'ensemble du programme Influenceurs
2. Les différents types d'influenceurs et leurs outils
3. Outils existants (rappel)
4. NOUVEAU : Système de Codes Promo Vocaux
5. NOUVEAU : Ressources Podcasters
6. Modification de l'inscription Influenceur
7. Dashboard Influenceur mis à jour
8. Tracking & Attribution (garantie zéro perte)
9. Console Admin - Ajouts
10. Sécurité
11. Migration & Déploiement
12. Récapitulatif des livrables

---

## 1. VUE D'ENSEMBLE DU PROGRAMME INFLUENCEURS

### 1.1 Rappel du programme

Le programme Influenceurs permet à des personnes ayant une audience (admins de groupes, créateurs de contenu) de promouvoir SOS-Expat et de toucher des commissions sur les clients qu'ils apportent.

### 1.2 Commissions

| Type | Montant | Durée |
|------|---------|-------|
| Commission par client | 10$ | Par appel |
| Commission recrutement prestataire | 5$ par appel du prestataire | 6 mois |
| Remise offerte aux clients | 5% | Automatique via lien affilié |

### 1.3 Ce qui change avec cette mise à jour

Ajout de deux nouvelles fonctionnalités pour mieux servir les créateurs audio/vidéo :

- **Codes Promo Vocaux** : un code personnalisé facile à dire à l'oral
- **Ressources Podcasters** : scripts et textes prêts à l'emploi

---

## 2. LES DIFFÉRENTS TYPES D'INFLUENCEURS ET LEURS OUTILS

### 2.1 Constat

Le programme Influenceurs regroupe des profils très différents qui n'ont pas les mêmes besoins :

| Type | Exemple | Comment ils promeuvent |
|------|---------|------------------------|
| Admin groupe Facebook | Groupe "Expatriés en Thaïlande" (50K membres) | Post avec lien dans le groupe |
| Admin forum | Forum-expat.com, section Asie | Signature, posts, bannière |
| YouTubeur | Chaîne voyage/expat | Mention orale + lien description |
| Podcaster | Podcast "Expat Stories" | Mention orale + show notes |
| TikTokeur | Compte conseils expat | Mention orale + lien bio |
| Instagrammeur | Compte lifestyle expat | Story/post + lien bio |

### 2.2 Outils par type d'influenceur

Tous les influenceurs ont accès à tous les outils, mais certains sont plus pertinents selon leur activité :

| Outil | Admin groupe/forum | YouTubeur | Podcaster | TikTokeur |
|-------|-------------------|-----------|-----------|-----------|
| Lien affilié /ref/i/CODE | ✅ Principal | ✅ Description | ✅ Show notes | ✅ Bio |
| Widgets & Bannières | ✅ Très utile | ❌ Pas utile | ❌ Pas utile | ❌ Pas utile |
| Code Promo Vocal | ❌ Pas utile | ✅ À l'oral | ✅ À l'oral | ✅ À l'oral |
| Scripts audio | ❌ Pas utile | ✅ Utile | ✅ Essentiel | ✅ Utile |
| Texte show notes | ❌ Pas utile | ✅ Utile | ✅ Essentiel | ❌ Pas utile |

### 2.3 Principe d'organisation du dashboard

Le dashboard Influenceur présente TOUS les outils, organisés par usage :

- **Section "Lien Affilié"** → Pour tous
- **Section "Widgets & Bannières"** → Pour admins groupes/forums
- **Section "Code Promo Vocal"** → Pour créateurs audio/vidéo (NOUVEAU)
- **Section "Ressources Audio"** → Pour podcasters/YouTubeurs (NOUVEAU)

Chaque influenceur utilise ce qui lui correspond. Pas de sous-programmes séparés.

---

## 3. OUTILS EXISTANTS (RAPPEL)

### 3.1 Lien Affilié

**Format :** `sos-expat.com/ref/i/CODE`

Chaque influenceur reçoit un code unique à l'inscription (ex: X7K9).

Quand un visiteur clique sur ce lien :
- Un cookie est posé (30 jours)
- La remise 5% est appliquée automatiquement
- Toute conversion est attribuée à l'influenceur

### 3.2 Widgets & Bannières

Éléments visuels que l'influenceur peut intégrer sur son site/groupe :

#### Types de widgets disponibles

| Widget | Dimensions | Usage |
|--------|------------|-------|
| Bannière horizontale | 728x90 px | Header de forum, signature |
| Bannière carrée | 300x250 px | Sidebar de groupe |
| Bouton CTA | 200x60 px | Intégration dans un post |
| Widget interactif | 300x400 px | Avec sélecteur de pays/service |

#### Code d'intégration

Chaque widget génère un code HTML/iframe que l'influenceur copie-colle :

```html
<iframe src="sos-expat.com/widget/banner?ref=CODE" width="728" height="90"></iframe>
```

Le lien affilié est automatiquement inclus dans le widget.

### 3.3 QR Code

QR Code personnalisé pointant vers le lien affilié.

Utile pour : événements physiques, flyers, cartes de visite.

---

## 4. NOUVEAU : SYSTÈME DE CODES PROMO VOCAUX

### 4.1 Problème à résoudre

Les créateurs audio/vidéo (YouTubeurs, podcasters, TikTokeurs) qui mentionnent SOS-Expat à l'oral ne peuvent pas dicter un lien technique comme « sos-expat.com/ref/i/X7K9 ».

C'est imprononçable et l'auditeur ne peut pas le retenir.

### 4.2 Solution

Permettre à chaque influenceur de créer un code promo personnalisé, court et mémorisable (ex: « SOS-NOMADE »), qui redirige vers son lien affilié.

### 4.3 Comment ça marche

1. L'influenceur crée son code dans le dashboard (ex: SOS-NOMADE)
2. Dans sa vidéo/podcast, il dit : « Utilisez le code SOS-NOMADE sur sos-expat.com »
3. L'auditeur tape : `sos-expat.com/go/SOS-NOMADE`
4. Le système redirige, pose le cookie, et la commission est attribuée

### 4.4 Flux technique détaillé

| Étape | Action | Détail |
|-------|--------|--------|
| 1 | Utilisateur tape l'URL | `sos-expat.com/go/SOS-NOMADE` |
| 2 | Serveur cherche le code | `SELECT * FROM promo_codes WHERE code = 'SOS-NOMADE'` |
| 3 | Code trouvé | Récupère user_id de l'influenceur |
| 4 | Pose le cookie | Même cookie que /ref/i/ (affiliate_id, 30 jours) |
| 5 | Log le clic | `INSERT INTO affiliate_clicks` |
| 6 | Incrémente compteur | `UPDATE promo_codes SET clicks_count + 1` |
| 7 | Redirige | 302 vers homepage ou landing définie |

### 4.5 Pourquoi /go/ ?

Le préfixe `/go/` évite les conflits avec les autres routes (`/about`, `/contact`, `/ref/`, etc.).

### 4.6 Base de données

#### Nouvelle table : promo_codes

| Champ | Type | Description |
|-------|------|-------------|
| id | UUID | Identifiant unique |
| code | VARCHAR(20) | Le code promo (unique, indexé) |
| user_id | UUID | FK vers l'influenceur |
| redirect_url | VARCHAR(255) | URL de destination (défaut: homepage) |
| status | ENUM | active / inactive |
| created_at | TIMESTAMP | Date de création |
| updated_at | TIMESTAMP | Dernière modification |
| clicks_count | INTEGER | Compteur de clics |

#### Contraintes

- `code` : UNIQUE, NOT NULL, INDEX
- `user_id` : FK vers users(id), ON DELETE CASCADE
- Un influenceur = maximum 1 code actif

### 4.7 API Backend

#### Route publique : GET /go/:code

Accessible sans authentification. Redirige vers le lien affilié.

Si code inexistant → Page 404 avec message « Code invalide »

#### Routes authentifiées (influenceur connecté)

| Méthode | Route | Action |
|---------|-------|--------|
| POST | /api/influencer/promo-code | Créer ou modifier son code |
| GET | /api/influencer/promo-code | Récupérer son code actuel |
| DELETE | /api/influencer/promo-code | Désactiver son code |

### 4.8 Validation du code

| Règle | Validation | Message d'erreur |
|-------|------------|------------------|
| Longueur | 5-20 caractères | Le code doit contenir entre 5 et 20 caractères |
| Caractères | A-Z, 0-9, tirets | Seuls lettres, chiffres et tirets autorisés |
| Format | Pas d'espaces, majuscules auto | Les espaces ne sont pas autorisés |
| Unicité | Pas déjà pris | Ce code est déjà utilisé |
| Liste noire | Mots réservés bloqués | Ce code n'est pas disponible |
| Tirets | Pas en début/fin | Format invalide |

### 4.9 Liste noire de codes réservés

Codes bloqués : `ADMIN`, `SUPPORT`, `HELP`, `SOS-EXPAT`, `SOSEXPAT`, `OFFICIAL`, `STAFF`, `TEAM`, `CONTACT`, `INFO`, `TEST`, `NULL`, `UNDEFINED`, `API`, `WWW`, `APP`, `MOBILE`, `WEB`, `LOGIN`, `SIGNUP`, `REGISTER`, `DASHBOARD`, `ACCOUNT`, `SETTINGS`, `PROFILE`, `PASSWORD`

---

## 5. NOUVEAU : RESSOURCES PODCASTERS

### 5.1 Objectif

Fournir aux créateurs audio/vidéo des ressources prêtes à l'emploi pour mentionner SOS-Expat de manière professionnelle et efficace.

### 5.2 Scripts de mention

3 formats selon la durée souhaitée :

#### Script 15 secondes

> « Si vous avez besoin d'aide à l'étranger - avocat, notaire, traducteur - allez sur SOS-Expat point com avec mon code [CODE]. Vous aurez 5% de réduction. »

#### Script 30 secondes

> « Petite parenthèse pour vous parler de SOS-Expat, le service que j'utilise quand j'ai besoin d'un professionnel à l'étranger. Avocat, comptable, traducteur assermenté... Ils ont des experts dans plus de 190 pays. Si vous êtes expatrié ou voyageur, gardez ça dans un coin. Allez sur SOS-Expat point com avec mon code [CODE] pour avoir 5% de réduction. »

#### Script 60 secondes

> « Je voulais vous parler d'un service que j'aurais aimé connaître plus tôt : SOS-Expat. C'est une plateforme qui vous met en relation avec des professionnels locaux partout dans le monde - avocats, notaires, comptables, traducteurs assermentés, experts en immigration. Que vous soyez expatrié, nomade digital, ou simplement en voyage et que vous ayez un pépin administratif ou juridique, vous pouvez appeler un expert local qui parle votre langue en quelques minutes. Personnellement, ça m'a sauvé la mise plusieurs fois. Si ça vous intéresse, allez sur SOS-Expat point com et utilisez mon code [CODE] pour avoir 5% de réduction sur votre premier appel. Le lien est dans la description. »

### 5.3 Langues disponibles

Les scripts sont disponibles dans les 9 langues SOS-Expat :

Français, Anglais, Espagnol, Portugais, Allemand, Italien, Néerlandais, Russe, Chinois

### 5.4 Texte pour Show Notes / Description vidéo

Texte pré-formaté à copier-coller :

```
🌍 SOS-Expat - Besoin d'un avocat, notaire ou expert à l'étranger ?
Trouvez un professionnel local en quelques minutes.
🔗 [LIEN AFFILIÉ]
🎁 Code promo : [CODE] (-5% sur votre premier appel)
```

### 5.5 Tips & Bonnes pratiques

Conseils affichés dans le dashboard :

- Mentionnez le code au début ET à la fin de l'épisode/vidéo
- Utilisez un code facile à retenir et à épeler
- Racontez une anecdote personnelle si vous avez utilisé le service
- Mettez toujours le lien dans la description/show notes
- Répétez le code lentement pour que l'auditeur puisse le noter
- Épeler le code si nécessaire : « S-O-S tiret NOMADE »

---

## 6. MODIFICATION DE L'INSCRIPTION INFLUENCEUR

### 6.1 Nouveau champ : Type de plateforme

Modifier le formulaire d'inscription pour inclure « Podcast » :

- YouTube
- TikTok
- Instagram
- Facebook (groupe/page)
- Twitter/X
- Forum
- **Podcast** ← NOUVEAU
- Blog/Site web
- Autre

(Choix multiple autorisé)

### 6.2 Champs conditionnels

**Si « Podcast » sélectionné, afficher :**
- Label : « Lien vers votre podcast »
- Placeholder : « Spotify, Apple Podcasts, etc. »
- Validation : URL valide (optionnel)

**Si « YouTube » sélectionné, afficher :**
- Label : « Lien vers votre chaîne »
- Validation : URL YouTube valide

### 6.3 Base de données

Ajouter colonne `platform_types` (JSONB) si inexistante :

Exemple : `["youtube", "podcast", "instagram"]`

---

## 7. DASHBOARD INFLUENCEUR MIS À JOUR

### 7.1 Structure du dashboard

Le dashboard est organisé en sections. Voici l'ordre :

1. Résumé (stats clés)
2. Lien Affilié
3. **Code Promo Vocal** ← NOUVEAU
4. Widgets & Bannières
5. **Ressources Audio** ← NOUVEAU
6. QR Code
7. Statistiques détaillées
8. Historique des paiements

### 7.2 Section « Code Promo Vocal » (NOUVEAU)

#### État : Pas de code créé

- **Titre :** « Code Promo Vocal »
- **Icône :** microphone 🎙️
- **Description :** « Créez un code facile à prononcer pour vos vidéos et podcasts »
- **Champ input** avec placeholder « Ex: SOS-NOMADE »
- **Validation en temps réel** (disponibilité)
- **Bouton** « Créer mon code »
- **Note :** « 5-20 caractères, lettres, chiffres et tirets »

#### État : Code actif

- Affichage du code en grand : **SOS-NOMADE**
- URL complète : `sos-expat.com/go/SOS-NOMADE`
- Bouton copier (clipboard)
- Mini-stat : « X clics ce mois »
- Bouton « Modifier »
- Bouton « Désactiver » (avec confirmation)

#### Validation en temps réel

Pendant la saisie :
- ✅ Vert : « Ce code est disponible »
- ❌ Rouge : « Ce code est déjà pris »
- ⏳ Gris : « Vérification... »

#### Avertissement au changement

Si modification d'un code existant :

> « Attention : votre ancien code ne fonctionnera plus. Les personnes qui l'utilisent verront une erreur. Continuer ? »

### 7.3 Section « Ressources Audio » (NOUVEAU)

- Sélecteur de langue (9 langues)
- 3 onglets : Script 15s / Script 30s / Script 60s
- Texte affiché avec bouton « Copier »
- Le `[CODE]` est automatiquement remplacé par le code de l'influenceur
- Section « Texte pour description » avec bouton copier
- Section « Tips » (conseils)

### 7.4 Section « Statistiques » mise à jour

Ajouter la distinction lien vs code promo :

| Métrique | Description |
|----------|-------------|
| Clics lien affilié | Via /ref/i/CODE |
| Clics code promo | Via /go/CODE |
| Total clics | Somme |
| Conversions | Clients |
| Taux conversion | Conversions / Clics |
| Commissions | Montant total |

**Graphique avec filtre :**
- Tous les clics
- Lien affilié uniquement
- Code promo uniquement

---

## 8. TRACKING & ATTRIBUTION

### 8.1 Principe fondamental

Le code promo vocal utilise **EXACTEMENT** le même système de tracking que le lien affilié. Aucune modification du moteur d'attribution.

### 8.2 Cookie identique

| Propriété | Valeur |
|-----------|--------|
| Nom | affiliate_ref |
| Contenu | { user_id, source, code, timestamp } |
| Durée | 30 jours |
| Domaine | .sos-expat.com |
| HttpOnly | Oui |
| Secure | Oui |
| SameSite | Lax |

### 8.3 Champ source

Seule différence : le champ `source` dans le cookie et les logs :

- `source = 'affiliate_link'` → clic sur /ref/i/:code
- `source = 'promo_code'` → clic sur /go/:code
- `source = 'widget'` → clic sur widget intégré

### 8.4 Garantie zéro perte

Le système existant n'est pas modifié. Le code promo est un « raccourci » qui :

1. Résout le code → user_id
2. Appelle la même fonction `setAffiliateTracking()`
3. Redirige l'utilisateur

**Même cookie, même attribution, même commission.**

### 8.5 Tableau récapitulatif

| Point d'entrée | Route | Cookie | Attribution |
|----------------|-------|--------|-------------|
| Lien affilié | /ref/i/CODE | ✅ Identique | ✅ Identique |
| Code promo | /go/CODE | ✅ Identique | ✅ Identique |
| Widget | /widget/*?ref=CODE | ✅ Identique | ✅ Identique |

---

## 9. CONSOLE ADMIN - AJOUTS

### 9.1 Liste des Influenceurs

Nouvelles colonnes dans le tableau :

- Colonne « Plateformes » : icônes des plateformes déclarées
- Colonne « Code Promo » : affiche le code ou « - »

### 9.2 Nouveaux filtres

- Filtre « Plateforme » : YouTube, Podcast, Facebook, etc.
- Filtre « A un code promo » : Oui / Non

### 9.3 Vue détaillée Influenceur

Nouvelle section « Code Promo » dans la fiche :

- Code actuel
- Date de création
- Nombre de clics total
- Historique des codes (si changé)
- Action : Désactiver le code

### 9.4 Gestion des codes réservés

Nouvelle page admin : « Codes Promo Réservés »

- Liste des codes bloqués
- Ajouter un code à la liste noire
- Supprimer un code de la liste

### 9.5 Stats globales

Nouveaux KPIs dans le dashboard admin :

- Nombre d'influenceurs avec code promo actif
- Répartition clics : lien vs code promo vs widget
- Top 10 codes promo les plus utilisés

---

## 10. SÉCURITÉ

### 10.1 Rate limiting

Route /go/:code :

- 60 requêtes/minute par IP
- 1000 requêtes/heure par IP
- Au-delà : 429 Too Many Requests

### 10.2 Protection contre les abus

- Un influenceur = 1 seul code actif
- Maximum 3 changements de code par mois
- Admin peut désactiver un code à tout moment
- Logs de tous les changements

### 10.3 Validation stricte

- Échapper tous les caractères spéciaux
- Conversion systématique en majuscules côté serveur
- Vérification injection SQL/XSS
- Sanitization avant stockage

### 10.4 Monitoring

Alertes automatiques si :

- Code avec > 1000 clics/jour (possible bot)
- Taux de conversion anormalement bas (< 0.1%)
- Multiples créations/suppressions de codes

---

## 11. MIGRATION & DÉPLOIEMENT

### 11.1 Script de migration SQL

```sql
-- 1. Créer la table promo_codes
CREATE TABLE promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  redirect_url VARCHAR(255) DEFAULT '/',
  status VARCHAR(10) DEFAULT 'active',
  clicks_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Index pour recherche rapide
CREATE INDEX idx_promo_codes_code ON promo_codes(code);

-- 3. Ajouter colonne platform_types si inexistante
ALTER TABLE users ADD COLUMN IF NOT EXISTS platform_types JSONB;

-- 4. Table des codes bloqués
CREATE TABLE blocked_promo_codes (
  code VARCHAR(20) PRIMARY KEY
);

INSERT INTO blocked_promo_codes (code) VALUES 
('ADMIN'), ('SUPPORT'), ('HELP'), ('SOS-EXPAT'), ('SOSEXPAT'),
('OFFICIAL'), ('STAFF'), ('TEAM'), ('CONTACT'), ('INFO'),
('TEST'), ('NULL'), ('UNDEFINED'), ('API'), ('WWW'),
('APP'), ('MOBILE'), ('WEB'), ('LOGIN'), ('SIGNUP'),
('REGISTER'), ('DASHBOARD'), ('ACCOUNT'), ('SETTINGS'), ('PROFILE'), ('PASSWORD');
```

### 11.2 Étapes de déploiement

1. Déployer migrations en staging
2. Déployer backend (nouvelle route /go/:code)
3. Déployer frontend (dashboard modifié)
4. Tests complets en staging
5. Déployer en production
6. Email aux influenceurs existants

### 11.3 Rollback

En cas de problème :

- La route /go/ peut être désactivée sans impact sur /ref/i/
- Les données promo_codes peuvent être conservées
- Retour arrière frontend instantané

---

## 12. RÉCAPITULATIF DES LIVRABLES

| Livrable | Priorité | Estimation |
|----------|----------|------------|
| Table promo_codes + migration | Haute | 0.5 jour |
| Route GET /go/:code | Haute | 0.5 jour |
| API CRUD promo-code | Haute | 1 jour |
| Dashboard - Section Code Promo | Haute | 1 jour |
| Dashboard - Ressources Audio | Moyenne | 1 jour |
| Scripts 9 langues (traduction) | Moyenne | 1 jour |
| Stats enrichies (source) | Moyenne | 0.5 jour |
| Modification inscription | Basse | 0.5 jour |
| Console Admin - ajouts | Basse | 1 jour |
| Tests & QA | Haute | 1.5 jour |
| Documentation | Basse | 0.5 jour |
| **TOTAL** | | **9 jours** |

### Priorités

- **Phase 1 (MVP)** : Table + Route /go/ + Dashboard Code Promo → 3 jours
- **Phase 2** : Ressources Audio + Scripts traduits → 2 jours
- **Phase 3** : Admin + Stats enrichies + Inscription → 2.5 jours
- **Phase 4** : Tests + Doc + Déploiement → 1.5 jour

---

*— Fin du cahier des charges —*
