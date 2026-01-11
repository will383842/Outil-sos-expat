# Assistant de Sécurisation Firebase

Assistant interactif en Node.js pour sécuriser votre projet Firebase après le retrait d'un développeur.

## Installation

```bash
cd security-audit
npm install
```

## Commandes disponibles

| Commande | Description |
|----------|-------------|
| `npm start` | Lance l'assistant interactif principal |
| `npm run audit` | Exécute l'audit de sécurité automatisé |
| `npm run guide` | Affiche le guide étape par étape |
| `npm run update-credentials` | Met à jour les credentials dans les fichiers .env |

## Structure des fichiers

```
security-audit/
├── index.js                    # Assistant interactif principal
├── security-check.js           # Script d'audit de sécurité
├── guide.js                    # Guide étape par étape
├── update-credentials.js       # Mise à jour des credentials
├── config.js                   # Configuration centrale
├── package.json
├── .gitignore
├── templates/
│   ├── credentials-template.txt  # Template pour noter les nouvelles clés
│   └── gcloud-commands.sh        # Commandes gcloud prêtes à l'emploi
├── reports/                    # Rapports d'audit générés
└── backups/                    # Backups des configurations
```

## Utilisation

### 1. Démarrer l'assistant interactif

```bash
npm start
```

L'assistant propose :
- Une **checklist interactive** pour suivre votre progression
- Des liens directs vers les consoles appropriées
- La possibilité de générer un rapport de sécurité

### 2. Lancer l'audit de sécurité

```bash
npm run audit
```

L'audit vérifie automatiquement :
- Les membres IAM du projet (si gcloud CLI est installé)
- Les service accounts et leurs clés
- Les fichiers .env et leurs variables sensibles
- Génère un rapport détaillé avec recommandations

### 3. Suivre le guide

```bash
npm run guide
```

Guide interactif avec :
- Instructions détaillées pour chaque action
- Commandes gcloud à copier-coller
- Liens vers les consoles
- Conseils de sécurité

### 4. Mettre à jour les credentials

```bash
npm run update-credentials
```

Permet de :
- Créer un backup des configurations actuelles
- Mettre à jour les clés API service par service
- Mettre à jour Firebase Functions config
- Générer un template pour noter les nouvelles clés

## Prérequis

### gcloud CLI (recommandé)

Pour un audit complet, installez gcloud CLI :
- [Guide d'installation](https://cloud.google.com/sdk/docs/install)

Après installation :
```bash
gcloud auth login
gcloud config set project sos-urgently-ac307
```

### Firebase CLI

Pour mettre à jour Firebase Functions config :
```bash
npm install -g firebase-tools
firebase login
```

## Checklist de sécurisation

1. **Accès IAM**
   - [ ] Réviser tous les membres IAM
   - [ ] Retirer l'accès du développeur
   - [ ] Vérifier les invitations en attente

2. **Service Accounts**
   - [ ] Lister tous les service accounts
   - [ ] Vérifier les clés existantes
   - [ ] Régénérer les clés compromises
   - [ ] Supprimer les anciennes clés

3. **Clés API tierces**
   - [ ] Stripe
   - [ ] PayPal
   - [ ] Twilio
   - [ ] Zoho

4. **Firebase**
   - [ ] Activer App Check
   - [ ] Réviser Security Rules
   - [ ] Vérifier Functions config

5. **Variables d'environnement**
   - [ ] Créer des backups
   - [ ] Mettre à jour les .env
   - [ ] Mettre à jour Functions config

6. **Vérification finale**
   - [ ] Tester en local
   - [ ] Déployer
   - [ ] Vérifier les logs d'audit

## Sécurité

- Les rapports et backups sont ignorés par git
- Ne commitez JAMAIS de fichiers contenant des clés
- Supprimez les templates remplis après utilisation
- Les backups sont automatiquement horodatés

## Configuration

Modifiez `config.js` pour personnaliser :
- L'ID du projet Firebase
- Les services tiers à vérifier
- Les chemins des fichiers .env
- Les URLs des consoles

## Liens utiles

- [Firebase Console](https://console.firebase.google.com/project/sos-urgently-ac307)
- [IAM & Admin](https://console.cloud.google.com/iam-admin/iam?project=sos-urgently-ac307)
- [Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts?project=sos-urgently-ac307)
- [App Check](https://console.firebase.google.com/project/sos-urgently-ac307/appcheck)
