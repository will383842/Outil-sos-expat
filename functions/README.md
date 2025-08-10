# SOS Expat — Functions

## Secrets
```bash
firebase functions:secrets:set OPENAI_API_KEY
firebase functions:secrets:set SOS_PLATFORM_API_KEY
firebase functions:secrets:set ADMIN_API_KEY
```
- La plateforme appelle `POST /ingestBooking` avec l'en-tête `x-api-key: <SOS_PLATFORM_API_KEY>`.

## IA (arrière-plan)
- `aiOnBookingCreated` : génère une réponse IA lors de la création d'un booking assigné.
- `aiOnUserMessage` : répond aux nouveaux messages utilisateur.

## Rôles (custom claims)
Endpoint protégé pour attribuer un rôle :
```bash
curl -X POST https://<APP>.web.app/adminSetRole -H "x-api-key: <ADMIN_API_KEY>" -H "Content-Type: application/json" -d '{"uid":"<UID>","role":"provider"}'
```
