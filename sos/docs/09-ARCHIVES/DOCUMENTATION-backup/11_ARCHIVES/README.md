# Archives - Documentation Obsolete

> **Note**: Ce dossier contient la documentation archivee pour reference historique.
> Ces fichiers ne sont plus maintenus activement.

---

## Fichiers Sources Originaux

Les fichiers suivants ont ete consolides dans la nouvelle structure:

### Depuis `All_Explains/`

| Fichier Original | Migre Vers |
|------------------|------------|
| `DOCUMENTATION_COMPLETE_SOS_EXPAT.md` | Multiple sections |
| `START_HERE.md` | `01_GETTING_STARTED/` |
| `DEMARRAGE_RAPIDE.md` | `01_GETTING_STARTED/INSTALLATION.md` |
| `SETUP.md` | `01_GETTING_STARTED/CONFIGURATION.md` |
| `CHECKLIST.md` | `01_GETTING_STARTED/CHECKLIST.md` |
| `ARCHITECTURE.md` | `02_ARCHITECTURE/OVERVIEW.md` |
| `SYSTEME_PAIEMENT_COMPLET.md` | `05_PAYMENTS/OVERVIEW.md` |
| `CDC_SYSTEME_AFFILIATION.md` | `06_AFFILIATION/CDC.md` |
| `RAPPORT_AUDIT_*.md` | `10_AUDITS/` |

### Depuis `sos/docs/`

| Fichier Original | Migre Vers |
|------------------|------------|
| `DISASTER_RECOVERY.md` | `08_OPERATIONS/DISASTER_RECOVERY.md` |
| `MONITORING_COMPLET.md` | `08_OPERATIONS/MONITORING.md` |
| `SECURITY_AUDIT_CHECKLIST.md` | `07_SECURITY/CHECKLIST.md` |
| `FIRESTORE_RULES_AUDIT.md` | `07_SECURITY/FIRESTORE_RULES.md` |

### Depuis `backup-system/`

| Fichier Original | Migre Vers |
|------------------|------------|
| `audit-report.md` | `08_OPERATIONS/BACKUP.md` |
| `disaster-recovery-runbook.md` | `08_OPERATIONS/DISASTER_RECOVERY.md` |
| `implementation-plan.md` | `08_OPERATIONS/BACKUP.md` |

---

## Fichiers Obsoletes (A Supprimer)

Les fichiers suivants sont obsoletes et peuvent etre supprimes:

### Systeme Deprecie

```
sos/online-offline-system-DEPRECATED/
├── INDEX.md
├── MODIFICATIONS_*.txt (5 fichiers)
├── migrate-providers.ts
└── functions/ & src/
```

**Raison**: Remplace par l'implementation actuelle dans `sos/src/`

### Fichiers Temporaires

```
sos/firebase.old.json          # Ancienne config
sos/temp-users.json            # Donnees temporaires
sos/lint_output.txt            # Output de test
sos/failed_functions.txt       # Log d'erreurs
sos/nul                        # Fichier Windows vide
```

### Doublons

```
ANALYSE_SYSTEME_AFFILIATION_V2.md  # Doublon du CDC
```

---

## Procedure de Nettoyage

Une fois la migration validee, executer:

```bash
# Supprimer l'ancien dossier All_Explains (apres backup)
rm -rf All_Explains/

# Supprimer le systeme deprecie
rm -rf sos/online-offline-system-DEPRECATED/

# Supprimer les fichiers temporaires
rm -f sos/firebase.old.json
rm -f sos/temp-users.json
rm -f sos/lint_output.txt
rm -f sos/failed_functions.txt
rm -f sos/nul

# Supprimer les doublons a la racine
rm -f ANALYSE_SYSTEME_AFFILIATION_V2.md
```

---

## Conservation

Certains fichiers sont conserves pour reference:

- `CDC_SYSTEME_AFFILIATION_SOS_EXPAT.md` - CDC original (reference)
- Anciens audits (historique)

---

*Archive creee le 27 Janvier 2026*
