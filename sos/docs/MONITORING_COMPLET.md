# Système de Monitoring Complet - SOS-Expat

Ce document décrit l'ensemble du système de monitoring qui protège votre business 24/7.

## Architecture Globale

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SYSTÈME DE MONITORING SOS-EXPAT                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────┐     ┌───────────────────┐     ┌──────────────────┐  │
│  │   ERREURS         │     │   PAIEMENTS       │     │   FONCTIONNEL    │  │
│  │   (Temps réel)    │     │   (4h)            │     │   (4h / 12h)     │  │
│  │                   │     │                   │     │                  │  │
│  │ • Sentry          │     │ • Stripe          │     │ • Funnels        │  │
│  │ • Error logs      │     │ • PayPal          │     │ • Formulaires    │  │
│  │ • Error boundary  │     │ • Twilio          │     │ • Tracking       │  │
│  └─────────┬─────────┘     └─────────┬─────────┘     └────────┬─────────┘  │
│            │                         │                        │            │
│            └─────────────────────────┼────────────────────────┘            │
│                                      │                                     │
│                          ┌───────────▼───────────┐                         │
│                          │   ALERTES UNIFIÉES    │                         │
│                          │   system_alerts       │                         │
│                          └───────────┬───────────┘                         │
│                                      │                                     │
│            ┌─────────────────────────┼─────────────────────────┐           │
│            │                         │                         │           │
│     ┌──────▼──────┐          ┌───────▼───────┐         ┌───────▼───────┐   │
│     │    EMAIL    │          │    SLACK      │         │   DASHBOARD   │   │
│     │             │          │               │         │   ADMIN       │   │
│     └─────────────┘          └───────────────┘         └───────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 1. Monitoring des Erreurs (Temps Réel)

### Sentry (Frontend + Backend)
- **Frontend**: `sos/src/config/sentry.ts`
- **Backend**: `sos/firebase/functions/src/config/sentry.ts`

**Fonctionnalités:**
- Capture automatique de toutes les exceptions
- Session replay (10% normal, 100% si erreur)
- Performance monitoring (10% sampling)
- Contexte utilisateur (rôle, ID)

### Error Logs Firestore
- **Collection**: `error_logs`
- **TTL**: 30 jours
- **Sévérités**: info, low, medium, high, critical

### Actions en cas d'alerte erreur:
1. Consulter Sentry pour le stack trace complet
2. Vérifier la collection `error_logs` pour le contexte
3. Identifier le `correlationId` pour tracer la requête

---

## 2. Monitoring des Paiements (Toutes les 4h)

### Fichier: `monitoring/paymentMonitoring.ts`

**Ce qui est surveillé:**

| Métrique | Seuil | Action |
|----------|-------|--------|
| Échecs Stripe/heure | > 3 | Alert CRITICAL |
| Paiements non capturés > 6h | > 5 | Alert CRITICAL |
| Échecs PayPal/heure | > 3 | Alert CRITICAL |
| Payouts pending > 24h | > 5 | Alert WARNING |
| Payouts échoués | > 0 | Alert EMERGENCY |
| Appels échoués/heure | > 5 | Alert CRITICAL |
| Sessions orphelines | > 10 | Alert WARNING |
| Taux de capture | < 90% | Alert WARNING |

### Actions en cas d'alerte paiement:

**Stripe Failed Payments:**
1. Vérifier le dashboard Stripe pour les détails
2. Analyser les codes d'erreur (card_declined, insufficient_funds, etc.)
3. Si systémique, vérifier l'intégration Stripe

**PayPal Payouts Failed:**
1. Se connecter à PayPal Business
2. Vérifier les payouts bloqués
3. Contacter PayPal si nécessaire

**Sessions Orphelines:**
1. Vérifier les call_sessions avec status 'pending' ou 'scheduled'
2. Identifier si c'est un problème Twilio ou de logique

---

## 3. Monitoring Fonctionnel (4h critiques, 12h complet)

### Fichier: `monitoring/functionalMonitoring.ts`

**NOUVEAU** - Détecte les problèmes AVANT que les clients ne s'en plaignent.

### Funnel Inscription

| Alerte | Condition | Impact |
|--------|-----------|--------|
| Abandon élevé formulaire | > 30% drop-off | Perte nouveaux clients |
| ZÉRO inscription malgré trafic | 0 inscriptions + >10 vues page | BLOCAGE TOTAL |

### Funnel Réservation

| Alerte | Condition | Impact |
|--------|-----------|--------|
| ZÉRO réservation 48h | 0 bookings + >20 recherches | BLOCAGE CA |
| Taux échec élevé | > 40% échecs | Perte de ventes |

### Erreurs Formulaires

| Alerte | Condition | Impact |
|--------|-----------|--------|
| Taux erreur élevé | > 5% erreurs sur un formulaire | Blocage UX |

### Tracking (Meta/Google)

| Alerte | Condition | Impact |
|--------|-----------|--------|
| Meta CAPI inactif | 0 events + trafic | Optimisation pub impactée |
| Score qualité bas | < 50/100 | Ciblage moins efficace |
| Google Ads inactif | 0 conversions | Campagnes non optimisées |

### Disponibilité Prestataires

| Alerte | Condition | Impact |
|--------|-----------|--------|
| Peu de prestataires | < 3 disponibles | Clients ne trouvent pas |
| Top-rated indisponibles | > 50% des top 10 | Déception clients |

### Flux Paiement

| Alerte | Condition | Impact |
|--------|-----------|--------|
| Faible conversion checkout | < 20% checkout → paiement | Abandon au paiement |
| Pattern d'échec | Même erreur > 3x | Problème systémique |
| Commissions en retard | > 10 pending > 7 jours | Prestataires mécontents |

---

## 4. Collections Firestore

### Alertes
```
system_alerts {
  id, severity, category, title, message, metadata,
  createdAt, acknowledged, acknowledgedBy, acknowledgedAt
}

payment_alerts {
  id, severity, category, title, message, metadata,
  createdAt, resolved, resolvedAt, resolvedBy
}

functional_alerts {
  id, severity, category, title, message, impact, suggestedAction,
  metadata, createdAt, acknowledged, resolved
}
```

### Métriques
```
payment_metrics {
  timestamp, stripe{}, paypal{}, calls{}
}

functional_metrics {
  type, timestamp, period, metrics{}
}
```

### Events Frontend
```
analytics_events {
  eventType, timestamp, sessionId, userId, userRole,
  page, formName, metadata
}

form_errors {
  formName, fieldName, errorType, errorMessage,
  timestamp, sessionId, url
}
```

---

## 5. Intégration Frontend

### Utilisation dans vos composants:

```typescript
import {
  signupFunnelTracking,
  bookingFunnelTracking,
  paymentFunnelTracking,
  trackGenericFormError
} from '@/utils/functionalAnalytics';

// Inscription
signupFunnelTracking.pageView('client');
signupFunnelTracking.formStart('client');
signupFunnelTracking.formSubmit('client');
signupFunnelTracking.success(userId, 'client');
signupFunnelTracking.error('auth/email-already-in-use', 'Email déjà utilisé');

// Réservation
bookingFunnelTracking.search({ specialty: 'avocat' });
bookingFunnelTracking.providerView(providerId);
bookingFunnelTracking.start(providerId, 50, 'EUR');
bookingFunnelTracking.complete(bookingId, providerId, 50, 'EUR');

// Paiement
paymentFunnelTracking.checkoutStart(50, 'EUR');
paymentFunnelTracking.methodSelected('stripe');
paymentFunnelTracking.attempt(paymentId, 50, 'EUR', 'stripe');
paymentFunnelTracking.success(paymentId, 50, 'EUR', 'stripe');

// Erreurs formulaire
trackGenericFormError('contact_form', 'email', 'invalid', 'Email invalide');
```

### Hook pour React Hook Form:

```typescript
import { createFormErrorHandler } from '@/utils/functionalAnalytics';

const onError = createFormErrorHandler('my_form');

<form onSubmit={handleSubmit(onSubmit, onError)}>
```

---

## 6. Jobs Schedulés

| Job | Fréquence | Fonction |
|-----|-----------|----------|
| System Health Check | 1x/jour 8h | `runSystemHealthCheck` |
| Payment Health Check | 4h | `runPaymentHealthCheck` |
| Functional Full Check | 9h et 18h | `runFunctionalHealthCheck` |
| Functional Critical | 4h | `runCriticalFunctionalCheck` |
| Service Balance | 1x/jour | `checkServiceBalances` |
| Metrics Collection | 6h | `collectDailyPaymentMetrics` |

---

## 7. Notifications

### Canaux selon sévérité:

| Sévérité | Email | Slack | SMS |
|----------|-------|-------|-----|
| Warning | - | ✓ | - |
| Critical | ✓ | ✓ | - |
| Emergency | ✓ | ✓ | ✓ |

### Configuration:
- `SLACK_WEBHOOK_URL` dans les variables d'environnement
- Emails vers `contact@sos-expat.com`

---

## 8. Dashboard Admin

### API Disponibles:

```typescript
// Alertes système
getActiveAlerts()
acknowledgeAlert(alertId)
getSystemHealthSummary()

// Alertes paiement
getPaymentAlerts({ resolved: false })
resolvePaymentAlert(alertId)
getPaymentMetrics({ days: 7 })

// Alertes fonctionnelles
getFunctionalAlerts({ resolved: false })
resolveFunctionalAlert(alertId, resolution)
getFunctionalHealthSummary()
triggerFunctionalCheck({ checkType: 'all' | 'critical' | 'signup' | 'booking' | 'tracking' | 'payment' })
```

---

## 9. Checklist de Réponse aux Incidents

### Alerte EMERGENCY:

1. [ ] Lire l'alerte et comprendre l'impact
2. [ ] Vérifier si c'est un faux positif (maintenance, déploiement récent)
3. [ ] Tester manuellement le parcours affecté
4. [ ] Si confirmé: identifier la cause root
5. [ ] Corriger ou rollback
6. [ ] Résoudre l'alerte avec une note explicative
7. [ ] Post-mortem si impact significatif

### Alerte CRITICAL:

1. [ ] Vérifier dans les 2h
2. [ ] Analyser les métriques associées
3. [ ] Prendre action corrective si nécessaire
4. [ ] Résoudre avec explication

### Alerte WARNING:

1. [ ] Vérifier dans les 24h
2. [ ] Documenter si récurrent
3. [ ] Ajuster les seuils si faux positifs fréquents

---

## 10. Maintenance

### Nettoyage automatique:
- Alertes résolues > 30 jours: supprimées
- Métriques > 60 jours: supprimées
- Error logs > 30 jours: expirés (TTL)

### Ajustement des seuils:

Modifier dans les fichiers respectifs:
- `monitoring/criticalAlerts.ts` - CONFIG.THRESHOLDS
- `monitoring/paymentMonitoring.ts` - CONFIG.THRESHOLDS
- `monitoring/functionalMonitoring.ts` - CONFIG.THRESHOLDS

---

## Résumé des Protections

| Problème | Détection | Délai max |
|----------|-----------|-----------|
| Site down | Erreurs Sentry | Immédiat |
| Bug critique | Error logs | Immédiat |
| Paiements cassés | Payment monitoring | 4h |
| Inscriptions bloquées | Functional monitoring | 4h |
| Réservations impossibles | Functional monitoring | 4h |
| Tracking cassé | Functional monitoring | 12h |
| Formulaires bugués | Form errors | 12h |
| Soldes services bas | Service alerts | 24h |
| Backups en retard | Critical alerts | 24h |

**Vous êtes maintenant protégé contre les problèmes silencieux qui peuvent tuer votre business.**
