# ANALYSE COMPLÈTE DES DÉPENDANCES - SOS EXPAT PROJECT

**Date**: 14 février 2026  
**Status**: Analyse complète terminée

---

## Documents à Lire

### 1. RESUME-DEPENDANCES.txt (10 min)
Vous êtes pressé? Commencez par celui-ci.
- Vue d'ensemble de la santé
- Actions urgentes
- Packages gelés
- Timeline
- Commandes rapides

### 2. INDEX-ANALYSE-DEPENDANCES.md (5 min)
Guide de navigation des documents.
- Quoi lire selon votre besoin
- Matrix de risque
- Fichiers par utilisation

### 3. ANALYSE-DEPENDANCES.md (30 min)
Document principal détaillé.
- Analyse complète
- Versions critiques
- État des mises à jour
- Conflits et risques
- Recommandations

### 4. DEPENDANCES-DETAIL.md (Reference)
Chercher un package spécifique.
- Index détaillé de 40+ packages
- Versions, risques, notes

### 5. PLAN-MIGRATIONS-DEPENDANCES.md (Planning)
Pour planifier les upgrades.
- Week 1 actions
- Février updates
- Q1/Q2/Q3 sprints
- Commandes pour chaque phase

### 6. COMMANDES-DEPENDANCES.sh (Exécution)
Script d'automatisation.
```bash
bash COMMANDES-DEPENDANCES.sh         # Menu interactif
bash COMMANDES-DEPENDANCES.sh status  # Vérifier status
bash COMMANDES-DEPENDANCES.sh sentry  # Update Sentry
```

---

## Actions à Faire Cette Semaine (1 HEURE)

```bash
# 1. Aller dans le répertoire sos
cd sos

# 2. Update Sentry (sécurité)
npm update @sentry/react @sentry/node

# 3. Update Zod
npm update zod

# 4. Vérifier la compilation
npm run typecheck
npm run build

# 5. Vérifier les tests
npm run test:run

# 6. Committer
git add package.json package-lock.json
git commit -m "chore(deps): update sentry and zod patches"
```

**Risque**: TRÈS BAS
**Effort**: 1 heure
**Impact**: Sécurité améliorée

---

## Packages à NE PAS UPGRADER

```
stripe@14.25.0 (latest: 20.3.1)
  Raison: Paiements en production
  Plan: Q2 2026 (2 weeks full audit required)

twilio@4.23.0 (latest: 5.12.1)
  Raison: Infrastructure d'appels en production
  Plan: Q3 2026 (2-3 weeks full audit required)

@stripe/stripe-js@7.9.0
@stripe/react-stripe-js@3.10.0
  Raison: Composants paiement en production
  Plan: Q2 2026 (avec backend)
```

**CES PACKAGES SONT GELÉS INTENTIONNELLEMENT**

---

## Timeline Résumé

| Période | Action | Effort | Risque |
|---------|--------|--------|--------|
| **Cette semaine** | Sentry + Zod patches | 1h | Très bas |
| **Février 2026** | Firebase minor + UI | 4-5h | Bas |
| **Q1 2026** | Firebase major sprint | 3-4 days | Moyen |
| **Q2 2026** | Stripe audit | 2 weeks | Très haut |
| **Q3 2026** | Twilio audit | 2-3 weeks | Très haut |
| **Q4 2026** | React 19 + Vite 7 | 3-4 weeks | Moyen |

---

## Santé Globale

**Score**: 75/100 (Modérée-Bonne)

**Bon**:
- React 18.3.1 stable
- TypeScript à jour
- Pas de vulnérabilités critiques
- Firebase synchronisé

**À Attention**:
- Stripe/Twilio volontairement gelés
- Firebase 1 majeure en retard
- Plusieurs majeures disponibles (React 19, Vite 7, etc.)

---

## Dépendances Critiques

### Frontend
- **react**: 18.3.1 (stable, rester jusqu'à Q3)
- **firebase**: 12.7.0 (upgrade à 12.9.0 en février)
- **libphonenumber-js**: 1.12.33 (upgrade safe)
- **@sentry/react**: 10.34.0 (upgrade URGENT cette semaine)

### Backend
- **firebase-admin**: 12.7.0 (upgrade Q1 sprint)
- **firebase-functions**: 7.0.5 (upgrade Q1 sprint)
- **stripe**: 14.25.0 (GELÉ, audit Q2)
- **twilio**: 4.23.0 (GELÉ, audit Q3)

---

## Commandes Rapides

```bash
# Vérifier packages outdated
npm outdated

# Audit sécurité
npm audit

# Versions critiques
npm list firebase firebase-admin firebase-functions
npm list stripe twilio

# TypeScript
npm run typecheck

# Build
npm run build

# Tests
npm run test:run
npm run test:e2e

# Deploy
firebase deploy --only functions
```

---

## Questions Fréquentes

**Q: Puis-je upgrader Stripe?**  
R: Non. C'est gelé intentionnellement. Q2 2026 avec audit complet.

**Q: Puis-je upgrader Twilio?**  
R: Non. C'est gelé intentionnellement. Q3 2026 avec audit complet.

**Q: Puis-je upgrader React à 19?**  
R: Non. Rester sur 18 jusqu'à Q3 2026. React 19 nécessite refactoring majeur.

**Q: Dois-je upgrader Sentry maintenant?**  
R: Oui! C'est sécurité. À faire cette semaine.

**Q: Quand upgrader Firebase?**  
R: Minor (12.9.0) en février. Major (13.x) en Q1 2026 sprint.

**Q: Comment savoir si une upgrade est safe?**  
R: Lire DEPENDANCES-DETAIL.md et chercher "Upgrade: Safe" ou "Risk: Low"

---

## Responsabilités

**Maintenance Hebdomadaire**:
- npm outdated
- npm audit

**Q1 Sprint Owner (Firebase)**:
- À définir
- Compétences: Firestore, Cloud Functions

**Q2 Sprint Owner (Stripe)**:
- À définir
- Compétences: Stripe API, Webhooks, Tests

**Q3 Sprint Owner (Twilio)**:
- À définir
- Compétences: Twilio API, Call testing, TwiML

---

## Fichiers Disponibles

| Fichier | Contenu | Temps |
|---------|---------|-------|
| RESUME-DEPENDANCES.txt | Vue d'ensemble | 10 min |
| INDEX-ANALYSE-DEPENDANCES.md | Guide de navigation | 5 min |
| ANALYSE-DEPENDANCES.md | Analyse complète | 30 min |
| DEPENDANCES-DETAIL.md | Détails packages | Reference |
| PLAN-MIGRATIONS-DEPENDANCES.md | Timelines & phases | Planning |
| COMMANDES-DEPENDANCES.sh | Automatisation | Exécution |

---

## Prochaines Étapes

1. **Maintenant**: Lire RESUME-DEPENDANCES.txt (10 min)
2. **Maintenant**: Lire INDEX-ANALYSE-DEPENDANCES.md (5 min)
3. **Cette semaine**: Exécuter les updates (1 h)
   ```bash
   cd sos
   npm update @sentry/react @sentry/node zod
   npm run build && npm run test:run
   ```
4. **Février**: Suivre PLAN-MIGRATIONS-DEPENDANCES.md
5. **Q1/Q2/Q3**: Planifier sprints critiques

---

## Support

Pour questions sur:
- **Dépendances générales**: Consulter ANALYSE-DEPENDANCES.md
- **Un package spécifique**: Consulter DEPENDANCES-DETAIL.md
- **Planning d'upgrade**: Consulter PLAN-MIGRATIONS-DEPENDANCES.md
- **Exécution d'upgrade**: Consulter PLAN-MIGRATIONS-DEPENDANCES.md + COMMANDES-DEPENDANCES.sh

---

**Généré**: 2026-02-14  
**Révision**: 1.0  
**Langue**: Français (en accord avec les préférences du projet)

---

Prêt à démarrer? Lire **RESUME-DEPENDANCES.txt** maintenant!
