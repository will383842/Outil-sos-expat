# Checklist Audit Sécurité - SOS-Expat

## Préparation pour un Pentest Professionnel

Ce document prépare l'infrastructure SOS-Expat pour un audit de sécurité externe.

---

## 1. Périmètre de l'Audit

### 1.1 Applications Web

| Application | URL | Technologie | Priorité |
|-------------|-----|-------------|----------|
| App principale | sos-expat.com | React + Firebase | Critique |
| Admin panel | sos-expat.com/admin | React + Firebase | Critique |
| API Functions | europe-west1 Cloud Functions | Node.js 20 | Critique |

### 1.2 Intégrations Tierces

| Service | Type | Données sensibles |
|---------|------|-------------------|
| Stripe | Paiements | Cartes bancaires (via Stripe.js) |
| PayPal | Paiements | Comptes PayPal |
| Twilio | Communications | Numéros téléphone, enregistrements |
| Firebase Auth | Authentification | Credentials utilisateurs |
| Firestore | Base de données | Toutes données |

### 1.3 Infrastructure

- **Hébergement**: Google Cloud Platform (Firebase)
- **CDN**: Firebase Hosting (Fastly)
- **Stockage**: Cloud Storage
- **Région principale**: europe-west1

---

## 2. Checklist Pré-Audit

### 2.1 Documentation à Préparer

- [ ] Architecture système documentée
- [ ] Liste des endpoints API
- [ ] Schéma de la base de données
- [ ] Diagramme des flux de données
- [ ] Liste des rôles et permissions
- [ ] Politique de mots de passe
- [ ] Processus de gestion des incidents

### 2.2 Accès à Fournir

- [ ] Compte de test (rôle utilisateur standard)
- [ ] Compte de test (rôle provider)
- [ ] Compte de test (rôle admin - lecture seule)
- [ ] Accès aux logs (optionnel)
- [ ] Environment de staging/test

### 2.3 Exclusions à Définir

- [ ] Ne pas tester les services tiers (Stripe, Twilio, etc.)
- [ ] Ne pas effectuer de DDoS
- [ ] Ne pas exfiltrer de vraies données utilisateur
- [ ] Heures de test autorisées

---

## 3. Checklist de Sécurité Interne

### 3.1 Authentification & Autorisation

#### Firebase Auth
- [x] Email/password avec vérification
- [x] Rate limiting sur login (Firebase built-in)
- [x] Tokens JWT avec expiration courte
- [ ] MFA pour les admins (à implémenter)
- [x] Sessions révocables

#### Contrôle d'accès
- [x] Custom claims pour les rôles
- [x] Double vérification (claims + Firestore)
- [x] Règles Firestore restrictives
- [x] Vérification admin sur toutes les fonctions sensibles

### 3.2 Protection des Données

#### Chiffrement
- [x] HTTPS forcé (HSTS)
- [x] Chiffrement au repos (GCP default)
- [x] Chiffrement des numéros de téléphone (AES-256-GCM)
- [x] Tokens Stripe jamais stockés en clair
- [ ] Chiffrement des emails (à considérer)

#### GDPR
- [x] Audit trail des accès aux données
- [x] Export de données utilisateur
- [x] Suppression de compte (droit à l'oubli)
- [x] Consentements traçables
- [x] Rétention des données définie

### 3.3 Sécurité des API

#### Cloud Functions
- [x] Validation des entrées
- [x] Rate limiting (Firebase App Check)
- [x] CORS configuré
- [x] Erreurs génériques (pas de stack traces)
- [ ] Input sanitization renforcée

#### Webhooks
- [x] Vérification signature Stripe
- [x] Vérification signature Twilio
- [x] Idempotence des handlers
- [x] DLQ pour les échecs

### 3.4 Sécurité Frontend

#### Headers HTTP
- [x] Content-Security-Policy
- [x] X-Content-Type-Options: nosniff
- [x] X-Frame-Options: SAMEORIGIN
- [x] X-XSS-Protection
- [x] Referrer-Policy
- [x] Strict-Transport-Security
- [x] Permissions-Policy

#### Protection XSS/CSRF
- [x] React échappe automatiquement
- [x] Pas de dangerouslySetInnerHTML
- [x] Tokens CSRF (Firebase handles)
- [ ] Sanitization des inputs utilisateur

### 3.5 Gestion des Secrets

#### Variables d'Environnement
- [x] Firebase Secrets pour les clés sensibles
- [x] Pas de secrets dans le code
- [x] Pas de secrets dans les logs
- [x] Rotation des clés possible

#### Clés API
- [ ] Rotation régulière Stripe API key
- [ ] Rotation régulière Twilio credentials
- [ ] Rotation clé de chiffrement (procédure documentée)

### 3.6 Logging & Monitoring

#### Logs
- [x] Logs d'authentification
- [x] Logs d'accès admin
- [x] Logs d'erreurs
- [x] Audit trail GDPR
- [ ] Détection d'anomalies automatique

#### Alertes
- [x] Alertes sur échecs webhook
- [x] Alertes sur erreurs critiques
- [x] Alertes sur disputes
- [ ] Alertes sur tentatives de brute force

---

## 4. Vulnérabilités OWASP Top 10 (2021)

### A01:2021 - Broken Access Control
- [x] Vérification des permissions côté serveur
- [x] Principe du moindre privilège
- [x] Règles Firestore restrictives
- [ ] Test de bypass de permissions

### A02:2021 - Cryptographic Failures
- [x] TLS 1.2+ forcé
- [x] Algorithmes modernes (AES-256-GCM)
- [x] Pas de données sensibles en clair
- [ ] Audit des algorithmes utilisés

### A03:2021 - Injection
- [x] Requêtes Firestore paramétrées
- [x] Pas de SQL direct
- [ ] Validation stricte des entrées
- [ ] Test d'injection NoSQL

### A04:2021 - Insecure Design
- [x] Architecture documentée
- [x] Threat modeling basique
- [ ] Revue de sécurité du design

### A05:2021 - Security Misconfiguration
- [x] Headers de sécurité configurés
- [x] Pas de fonctionnalités inutiles
- [ ] Scan de configuration automatisé

### A06:2021 - Vulnerable Components
- [ ] Audit npm des dépendances
- [ ] Mise à jour régulière
- [ ] Politique de patching

### A07:2021 - Identification and Authentication Failures
- [x] Firebase Auth robuste
- [x] Tokens JWT sécurisés
- [ ] MFA pour admins
- [ ] Politique de mots de passe renforcée

### A08:2021 - Software and Data Integrity Failures
- [x] Vérification signatures webhooks
- [ ] Intégrité des builds CI/CD
- [ ] SRI pour les ressources externes

### A09:2021 - Security Logging and Monitoring Failures
- [x] Logging complet
- [x] Alertes configurées
- [ ] SIEM intégré
- [ ] Rétention des logs sécurisée

### A10:2021 - Server-Side Request Forgery (SSRF)
- [ ] Validation des URLs
- [ ] Pas de fetch sur URLs utilisateur
- [ ] Whitelist des domaines externes

---

## 5. Tests Recommandés

### 5.1 Tests Automatisés

```bash
# Audit des dépendances npm
npm audit

# Scan de sécurité des dépendances
npx snyk test

# Analyse statique du code
npx eslint --ext .ts,.tsx src/ --rule 'security/*'
```

### 5.2 Tests Manuels

| Test | Outil suggéré | Priorité |
|------|---------------|----------|
| Scan de vulnérabilités | OWASP ZAP | Haute |
| Test d'authentification | Burp Suite | Haute |
| Test d'injection | SQLMap (NoSQL variant) | Haute |
| Test XSS | XSS Hunter | Moyenne |
| Test CSRF | Burp Suite | Moyenne |
| Scan SSL/TLS | SSL Labs | Basse |

### 5.3 Scénarios de Test Prioritaires

1. **Escalade de privilèges**
   - Un utilisateur peut-il accéder aux fonctions admin ?
   - Un provider peut-il modifier les données d'un autre provider ?

2. **Bypass d'authentification**
   - Les endpoints API sont-ils protégés sans token ?
   - Les règles Firestore bloquent-elles l'accès direct ?

3. **Fuite de données**
   - Les erreurs exposent-elles des informations sensibles ?
   - Les logs contiennent-ils des données personnelles ?

4. **Intégrité des paiements**
   - Peut-on modifier le montant d'un paiement ?
   - Les webhooks peuvent-ils être forgés ?

---

## 6. Rapport d'Audit Attendu

### 6.1 Format du Rapport

Le rapport de pentest devra inclure :

1. **Executive Summary** (pour la direction)
2. **Méthodologie utilisée**
3. **Vulnérabilités trouvées** avec :
   - Sévérité (CVSS)
   - Description détaillée
   - Preuve de concept
   - Recommandations de correction
4. **Points positifs** (bonnes pratiques observées)
5. **Recommandations générales**

### 6.2 Classification des Vulnérabilités

| Sévérité | CVSS | Délai de correction |
|----------|------|---------------------|
| Critique | 9.0-10.0 | 24-48 heures |
| Haute | 7.0-8.9 | 7 jours |
| Moyenne | 4.0-6.9 | 30 jours |
| Basse | 0.1-3.9 | 90 jours |
| Info | N/A | À discrétion |

---

## 7. Contacts Sécurité

### Équipe Interne

| Rôle | Contact |
|------|---------|
| Security Lead | contact@sos-expat.com |
| CTO | contact@sos-expat.com |
| DevOps | contact@sos-expat.com |

### Reporting Vulnérabilités

- Email: contact@sos-expat.com
- Programme Bug Bounty: À définir

---

## 8. Actions Post-Audit

### 8.1 Processus de Remédiation

1. Recevoir le rapport
2. Trier par sévérité
3. Assigner les corrections
4. Implémenter les fixes
5. Vérifier les corrections
6. Demander un re-test si nécessaire

### 8.2 Amélioration Continue

- [ ] Programmer un audit annuel
- [ ] Mettre à jour ce document
- [ ] Former l'équipe aux bonnes pratiques
- [ ] Intégrer les tests de sécurité dans CI/CD

---

*Dernière mise à jour: Décembre 2024*
*Version: 1.0*
