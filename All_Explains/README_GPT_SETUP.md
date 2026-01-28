

---

# Déploiement complet (Functions + Règles)

## Prérequis
- Firebase CLI `npm i -g firebase-tools`
- Projet Firebase créé (Firestore en mode prod)
- Node 20

## Configuration
1. Copier `.env.example` et renseigner les variables frontend.
2. Définir les **secrets** des Functions :
```
cd functions
firebase functions:secrets:set OPENAI_API_KEY
firebase functions:secrets:set SOS_WEBHOOK_SECRET
firebase functions:secrets:set TWILIO_ACCOUNT_SID
firebase functions:secrets:set TWILIO_AUTH_TOKEN
firebase functions:secrets:set TWILIO_WHATSAPP_FROM
```

## Déploiement
```
# À la racine du projet
firebase deploy --only firestore:rules,firestore:indexes
cd functions && npm i && npm run deploy
# Build + deploy UI (selon votre pipeline)
cd .. && npm i && npm run build
firebase deploy --only hosting
```

## Webhooks SOS Expat
- URL ingestion : `https://europe-west1-<project-id>.cloudfunctions.net/ingestBooking`
- Header requis : `x-sos-signature: ${SOS_WEBHOOK_SECRET}`
- Payload JSON minimal :
```json
{
  "bookingId": "bk_123",
  "providerId": "user_abc",
  "countryCode": "FR",
  "client": { "firstName": "Alice", "phone": "+33600000000", "language": "fr" },
  "title": "Demande titre de séjour",
  "description": "Renouvellement carte de séjour à Paris",
  "language": "fr"
}
```

## Tests locaux (émulateur)
```
firebase emulators:start --only functions,firestore,hosting
```

_Mis à jour le 2025-08-10._

## Sécurité (headers Hosting)
- Ajout d’en-têtes HSTS, X-Content-Type-Options, X-Frame-Options, Permissions-Policy, COOP/CORP.

## Rate limiting & modération
- `functions/src/rateLimiter.ts` : limite/h fenêtre par conversation ou prestataire.
- `functions/src/moderation.ts` : modération OpenAI (optionnelle), fallback simple.
- Intégrées dans `/chat` et `/ingestBooking`.

## Nettoyage programmé
- `functions/src/scheduled.ts` : `cleanupOldConversations` quotidien (02:00). Configurez `RETENTION_DAYS` en env.

## Dark mode & design system
- `darkMode: 'class'` activé dans Tailwind.
- `src/components/Layout/ThemeToggle.tsx` : switch sombre/clair persistant.

## CI
- `.github/workflows/ci.yml` : build front + functions sur chaque PR/Push.
