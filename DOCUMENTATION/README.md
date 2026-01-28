# DOCUMENTATION SOS EXPAT

> **Version**: 2.0.0
> **Date de reorganisation**: 27 Janvier 2026
> **Mainteneur**: Equipe SOS Expat

---

## Bienvenue

Cette documentation centralise toute l'information technique du projet SOS Expat.

**Point d'entree**: [INDEX PRINCIPAL](./00_INDEX/README.md)

---

## Structure

```
DOCUMENTATION/
│
├── 00_INDEX/                 # Index et navigation
│   └── README.md             # Point d'entree principal
│
├── 01_GETTING_STARTED/       # Demarrage rapide
│   ├── INSTALLATION.md       # Guide d'installation complet
│   ├── CONFIGURATION.md      # Configuration environnement
│   └── CHECKLIST.md          # Checklist pre-production
│
├── 02_ARCHITECTURE/          # Architecture technique
│   ├── OVERVIEW.md           # Vue d'ensemble
│   ├── FIRESTORE_MODEL.md    # Modele de donnees
│   └── STACK.md              # Stack technique
│
├── 03_FRONTEND/              # Frontend (sos/src)
│   ├── STRUCTURE.md          # Structure du code
│   ├── COMPONENTS.md         # Composants
│   └── I18N.md               # Systeme multilingue
│
├── 04_BACKEND/               # Backend (Cloud Functions)
│   ├── STRUCTURE.md          # Structure des functions
│   ├── API.md                # API endpoints
│   └── TRIGGERS.md           # Triggers et scheduled
│
├── 05_PAYMENTS/              # Systeme de paiement
│   ├── OVERVIEW.md           # Architecture paiements
│   ├── WORKFLOW.md           # Workflow complet
│   └── CONFIGURATION.md      # Config Stripe/PayPal
│
├── 06_AFFILIATION/           # Systeme d'affiliation
│   ├── CDC.md                # Cahier des charges
│   ├── BACKEND.md            # Implementation backend
│   ├── FRONTEND.md           # Implementation frontend
│   └── WISE.md               # Integration Wise
│
├── 07_SECURITY/              # Securite
│   ├── OVERVIEW.md           # Vue d'ensemble securite
│   ├── FIRESTORE_RULES.md    # Regles Firestore
│   ├── CHECKLIST.md          # Checklist securite
│   └── AUDIT.md              # Audit detaille
│
├── 08_OPERATIONS/            # Operations
│   ├── BACKUP.md             # Systeme de backup
│   ├── DISASTER_RECOVERY.md  # Plan DR
│   └── MONITORING.md         # Monitoring
│
├── 09_INTEGRATIONS/          # Integrations tierces
│   ├── TWILIO.md             # Appels telephoniques
│   ├── STRIPE.md             # Paiements Stripe
│   ├── PAYPAL.md             # Paiements PayPal
│   └── WISE.md               # Virements Wise
│
├── 10_AUDITS/                # Rapports d'audit
│   ├── AUDIT_GLOBAL_2026.md  # Audit global
│   ├── AUDIT_AFFILIATION.md  # Audit affiliation
│   └── AUDIT_FONCTIONNEL.md  # Audit fonctionnel
│
└── 11_ARCHIVES/              # Documentation archivee
    └── README.md             # Index des archives
```

---

## Navigation Rapide

| Je veux... | Aller a... |
|------------|------------|
| Installer le projet | [01_GETTING_STARTED/INSTALLATION.md](./01_GETTING_STARTED/INSTALLATION.md) |
| Comprendre l'architecture | [02_ARCHITECTURE/OVERVIEW.md](./02_ARCHITECTURE/OVERVIEW.md) |
| Configurer les paiements | [05_PAYMENTS/OVERVIEW.md](./05_PAYMENTS/OVERVIEW.md) |
| Implementer l'affiliation | [06_AFFILIATION/CDC.md](./06_AFFILIATION/CDC.md) |
| Verifier la securite | [07_SECURITY/OVERVIEW.md](./07_SECURITY/OVERVIEW.md) |
| Configurer Twilio | [09_INTEGRATIONS/TWILIO.md](./09_INTEGRATIONS/TWILIO.md) |
| Voir les audits | [10_AUDITS/AUDIT_GLOBAL_2026.md](./10_AUDITS/AUDIT_GLOBAL_2026.md) |

---

## Conventions

### Nommage des Fichiers

- Majuscules avec underscore: `FIRESTORE_MODEL.md`
- Dossiers numerotes: `01_GETTING_STARTED/`

### Format des Documents

- Titre H1 avec version et date
- Table des matieres pour docs > 100 lignes
- Exemples de code avec syntax highlighting
- Liens relatifs vers autres docs

### Maintenance

- Mettre a jour la date lors de modifications
- Incrementer la version pour changements majeurs
- Archiver l'ancienne version si necessaire

---

## Ancienne Documentation

L'ancienne documentation dispersee a ete consolidee ici. Les fichiers sources originaux se trouvaient dans:

- `All_Explains/` - Documentation principale (migree)
- `sos/docs/` - Documentation technique (migree)
- `Outil-sos-expat/docs/` - Documentation Outil IA (migree)
- `backup-system/` - Documentation backup (migree)
- Fichiers .md a la racine (migres)

Ces fichiers peuvent etre supprimes apres verification.

---

## Contribution

### Ajouter une Documentation

1. Identifier la section appropriee (01-11)
2. Creer le fichier avec le format standard
3. Ajouter le lien dans l'index de la section
4. Mettre a jour le README de la section si necessaire

### Mettre a Jour

1. Modifier le fichier concerne
2. Mettre a jour la date et version
3. Verifier les liens croises

---

## Contact

Pour toute question sur cette documentation:
- Ouvrir une issue sur le repo GitHub
- Contacter l'equipe technique

---

*Documentation reorganisee le 27 Janvier 2026*
