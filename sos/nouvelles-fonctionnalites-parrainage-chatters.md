# NOUVELLES FONCTIONNALITÉS PARRAINAGE CHATTERS
## Fonctionnalités à ajouter

---

## 1. SYSTÈME DE PARRAINAGE 2 NIVEAUX

### 1.1 Structure des commissions

| Événement | Bénéficiaire | Montant |
|-----------|--------------|---------|
| Filleul N1 atteint 10$ de commissions | Parrain N1 | 1$ |
| Filleul N1 atteint 50$ de commissions | Parrain N1 | 4$ |
| Filleul N2 atteint 50$ de commissions | Parrain N1 (origine) | 2$ |
| Bonus récurrent mensuel (filleul actif ≥20$/mois) | Parrain N1 | 5% des gains du filleul |

### 1.2 Bonus paliers

Comptent uniquement les filleuls N1 ayant atteint 50$ de commissions.

| Palier | Bonus |
|--------|-------|
| 5 filleuls qualifiés | 25$ |
| 10 filleuls qualifiés | 75$ |
| 25 filleuls qualifiés | 200$ |
| 50 filleuls qualifiés | 500$ |

### 1.3 Règles

- Maximum 2 niveaux (pas plus)
- Un filleul = un seul parrain
- Parrain N2 calculé automatiquement
- Bonus paliers versés une seule fois par palier

### 1.4 Exemple

```
Alice parraine Bob (N1)
Bob parraine Carlos (N2 pour Alice)

Bob atteint 10$ → Alice reçoit 1$
Bob atteint 50$ → Alice reçoit 4$
Carlos atteint 50$ → Alice reçoit 2$, Bob reçoit 4$

Mois suivant : Bob génère 30$ → Alice reçoit 1.50$ (5%)
```

---

## 2. EARLY ADOPTER PAR PAYS

### 2.1 Principe

Les 100 premiers parrains qualifiés de chaque pays = commission parrainage +50% à vie.

### 2.2 Conditions

1. Avoir au moins 1 filleul qualifié (50$+)
2. Compteur du pays < 100

### 2.3 Avantages

- Multiplicateur 1.5x sur toutes les commissions parrainage à vie
- Badge 🏆 Pioneer [Pays]
- Listé sur page publique "/pioneers"

### 2.4 Automatisation

```
Quand un filleul atteint 50$ :
  Si parrain n'a pas early_adopter ET compteur_pays < 100 :
    → early_adopter = true
    → Incrémenter compteur pays
```

### 2.5 Affichage public

Page `/pioneers` :

```
🇸🇳 Sénégal : 53 places restantes
🇨🇮 Côte d'Ivoire : 82 places restantes
🇨🇲 Cameroun : 91 places restantes
```

---

## 3. HACKATHONS / PROMOTIONS

### 3.1 Principe

Périodes limitées avec multiplicateur sur les commissions.

### 3.2 Types

| Type | Exemple |
|------|---------|
| Week-end x2 | Commissions parrainage doublées (1x/mois) |
| Flash 24h x3 | Triple commission (1x/trimestre) |
| Lancement pays | x2 pendant 1 semaine |

### 3.3 Table promotions

| Champ | Type |
|-------|------|
| id | UUID |
| nom | string |
| date_debut | datetime |
| date_fin | datetime |
| multiplicateur | float |
| type | enum (parrainage / affiliation / tout) |
| pays | string[] (null = mondial) |
| actif | boolean |

### 3.4 Logique

```
À chaque commission :
  Si promo active ET type correspond ET pays correspond :
    montant = montant_base × multiplicateur
```

---

## 4. DASHBOARD CHATTER — NOUVELLES SECTIONS

### 4.1 Section "Mes Filleuls"

**Filleuls N1**

| Colonne | Description |
|---------|-------------|
| Prénom | Prénom du filleul |
| Pays | Drapeau + pays |
| Commissions générées | Total cumulé |
| Progression | Barre vers 10$ puis 50$ |
| Statut | 🔄 En cours / ✅ Qualifié |

**Filleuls N2**

Liste simplifiée : Prénom, Pays, Commissions, Statut

**Stats en haut**

```
Filleuls N1 : 12 (dont 5 qualifiés)
Filleuls N2 : 8 (dont 2 qualifiés)
Prochain palier : 5/10 → 75$ bonus
```

### 4.2 Section "Mes Gains Parrainage"

**Résumé**

```
Total parrainage : 347$
├── Seuils atteints : 89$
├── Bonus récurrent : 123$
├── Bonus paliers : 100$
└── Early adopter (+50%) : 35$
```

**Historique**

| Date | Type | Filleul | Montant |
|------|------|---------|---------|
| 15/01 | Seuil 50$ | Bob | 4$ |
| 01/01 | Récurrent | Bob | 1.50$ |

### 4.3 Section "Mon Statut"

- Badge Pioneer si applicable
- Progression vers paliers (barre visuelle)
- Rang dans leaderboards

### 4.4 Section "Parrainer"

- Lien : `sos-expat.com/join/c/CODE`
- QR code
- Boutons partage : WhatsApp, Telegram, Facebook
- Messages prêts à copier (9 langues)
- Visuels à télécharger

---

## 5. GAMIFICATION

### 5.1 Leaderboards

- Top 10 mondial
- Top 10 par pays
- Top 10 par langue
- Top 10 parrains (filleuls qualifiés)

### 5.2 Badges

**Gains**

| Badge | Condition |
|-------|-----------|
| 🥉 Bronze | 50$+ |
| 🥈 Argent | 200$+ |
| 🥇 Or | 500$+ |
| 💎 Platine | 1000$+ |
| 👑 Diamant | 2500$+ |

**Spéciaux**

| Badge | Condition |
|-------|-----------|
| 🏆 Pioneer | Early adopter pays |
| 🎓 Mentor | 10+ filleuls qualifiés |
| ⭐ Star | Top 10 mondial du mois |

### 5.3 Challenges pays

```
🏁 Premier pays à 100 chatters actifs = 500$ partagés

🇸🇳 Sénégal : 67/100
🇨🇮 Côte d'Ivoire : 54/100
```

---

## 6. KIT VIRAL MULTILINGUE

### 6.1 Éléments fournis

- Lien parrainage : `sos-expat.com/join/c/CODE`
- Lien affiliation : `sos-expat.com/ref/c/CODE`
- QR codes
- Messages WhatsApp/Telegram (3 versions × 9 langues)
- Visuels (story, carré, bannière)

### 6.2 Messages types (FR)

**Court**

```
Salut ! Je gagne de l'argent en aidant des expatriés à trouver des experts. C'est 100% gratuit. Rejoins-moi 👉 [lien]
```

**Détaillé**

```
Hey ! Tu connais SOS-Expat ? Je suis devenu "Chatter" et je gagne une commission à chaque fois que j'aide un expat à trouver un avocat.

C'est gratuit, tu partages juste dans tes groupes. Inscris-toi : [lien]
```

**Preuve sociale**

```
J'ai gagné [X]$ ce mois en aidant des Français à l'étranger 🌍
C'est gratuit, 5 min/jour. Tu veux essayer ? [lien]
```

### 6.3 Visuels personnalisés

Génération auto avec : prénom, pays, gains du mois, QR code

---

## 7. ÉLÉMENTS ANTI-ARNAQUE

### 7.1 Landing page

**Titre**

> "Gagne de l'argent en aidant des expatriés"

**Mentions obligatoires**

- ✅ 100% gratuit, aucun investissement
- ✅ Tu gagnes en aidant de vrais clients
- ✅ Le parrainage est un bonus, pas l'activité principale

### 7.2 FAQ

**Est-ce du MLM ?**

> Non. Tu gagnes principalement en aidant des clients réels. Le parrainage est limité à 2 niveaux et c'est un bonus. Tu n'as rien à payer.

**Dois-je recruter ?**

> Non. Tu peux gagner uniquement en aidant des clients, sans jamais parrainer.

### 7.3 Dashboard transparent

```
💰 Mes gains : 523$
├── Affiliation (clients) : 410$ (78%)
├── Parrainage : 113$ (22%)
```

### 7.4 Limites anti-abus

| Règle | Description |
|-------|-------------|
| Max 2 niveaux | Pas de N3, N4 |
| Ratio parrainage | Alerte si > 50%, blocage si > 70% |
| Auto-parrainage | Impossible (vérif email/tél/IP) |
| Cercles | Détection A → B → A |
| Comptes multiples | Détection IP/device/tél |

---

## 8. CONSOLE ADMIN — AJOUTS

### 8.1 Vue Parrainage

- Stats globales : filleuls totaux, qualifiés, commissions versées
- Arbre de parrainage par chatter
- Recherche chatter → voir filleuls, parrain, commissions

### 8.2 Vue Early Adopters

- Compteurs par pays
- Liste pioneers par pays
- Ajuster quota manuellement

### 8.3 Vue Promotions

- Créer/modifier/supprimer hackathons
- Calendrier des promos
- Stats par promo

### 8.4 Vue Anti-fraude

**Alertes auto**

- Ratio parrainage > 70%
- Auto-parrainage (même IP)
- Cercles détectés
- Comptes multiples

**Actions** : voir détail, bloquer, valider, bannir

---

## 9. BASE DE DONNÉES

### 9.1 Modifications table `chatters`

```sql
ALTER TABLE chatters ADD COLUMN parrain_id UUID REFERENCES chatters(id);
ALTER TABLE chatters ADD COLUMN parrain_niveau2_id UUID REFERENCES chatters(id);
ALTER TABLE chatters ADD COLUMN early_adopter BOOLEAN DEFAULT FALSE;
ALTER TABLE chatters ADD COLUMN early_adopter_country VARCHAR(2);
ALTER TABLE chatters ADD COLUMN early_adopter_date TIMESTAMP;
```

### 9.2 Table `commissions_parrainage`

```sql
CREATE TABLE commissions_parrainage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chatter_id UUID NOT NULL REFERENCES chatters(id),
  filleul_id UUID NOT NULL REFERENCES chatters(id),
  niveau INTEGER NOT NULL CHECK (niveau IN (1, 2)),
  type VARCHAR(20) NOT NULL CHECK (type IN ('seuil_10', 'seuil_50', 'recurrent', 'bonus_palier')),
  montant DECIMAL(10,2) NOT NULL,
  montant_base DECIMAL(10,2) NOT NULL,
  multiplicateur DECIMAL(3,2) DEFAULT 1.0,
  promo_id UUID REFERENCES promotions(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 9.3 Table `promotions`

```sql
CREATE TABLE promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom VARCHAR(100) NOT NULL,
  date_debut TIMESTAMP NOT NULL,
  date_fin TIMESTAMP NOT NULL,
  multiplicateur DECIMAL(3,2) NOT NULL DEFAULT 2.0,
  type VARCHAR(20) NOT NULL CHECK (type IN ('parrainage', 'affiliation', 'tout')),
  pays TEXT[],
  actif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 9.4 Table `early_adopter_compteurs`

```sql
CREATE TABLE early_adopter_compteurs (
  pays VARCHAR(2) PRIMARY KEY,
  compteur INTEGER DEFAULT 0,
  quota INTEGER DEFAULT 100
);
```

### 9.5 Table `bonus_paliers_historique`

```sql
CREATE TABLE bonus_paliers_historique (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chatter_id UUID NOT NULL REFERENCES chatters(id),
  palier INTEGER NOT NULL CHECK (palier IN (5, 10, 25, 50)),
  montant DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(chatter_id, palier)
);
```

### 9.6 Table `alertes_fraude`

```sql
CREATE TABLE alertes_fraude (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chatter_id UUID NOT NULL REFERENCES chatters(id),
  type VARCHAR(30) NOT NULL,
  details JSONB,
  statut VARCHAR(20) DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 10. CHECKLIST IMPLÉMENTATION

| Fonctionnalité | Priorité | Estimation |
|----------------|----------|------------|
| Champs parrain_id + N2 | Haute | 0.5j |
| Table commissions_parrainage | Haute | 0.5j |
| Commission seuil 10$ | Haute | 0.5j |
| Commission seuil 50$ + N2 | Haute | 1j |
| Batch mensuel 5% récurrent | Haute | 1j |
| Bonus paliers auto | Haute | 1j |
| Dashboard "Mes Filleuls" | Haute | 1.5j |
| Dashboard "Mes Gains Parrainage" | Haute | 1j |
| Section "Parrainer" + kit viral | Haute | 1j |
| Éléments anti-arnaque | Haute | 1j |
| Early Adopter | Moyenne | 1.5j |
| Table promotions + hackathons | Moyenne | 1j |
| Multiplicateur promos | Moyenne | 0.5j |
| Leaderboards | Moyenne | 1.5j |
| Badges | Moyenne | 1j |
| Console admin parrainage | Moyenne | 2j |
| Console admin promos | Moyenne | 1j |
| Challenges pays | Basse | 1j |
| Visuels personnalisés auto | Basse | 1.5j |
| Console admin anti-fraude | Basse | 1.5j |
| Messages 9 langues | Basse | 2j |
| **TOTAL** | | **22.5j** |

---

*— Fin du document —*
