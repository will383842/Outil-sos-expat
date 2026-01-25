# Checklist de Test - Dashboard Multi-Prestataires

## 1. Vérifications Firestore (Console Firebase)

### Collection `users`
- [ ] Vérifier que les 4 comptes multi-prestataires ont `linkedProviderIds` non vide
- [ ] Vérifier si le champ `isMultiProvider: true` existe (sinon, l'ajouter)
- [ ] Compter le nombre total de documents dans `users`

### Collection `sos_profiles`
- [ ] Vérifier que chaque ID dans `linkedProviderIds` existe dans `sos_profiles`
- [ ] Sinon, vérifier dans la collection `providers`

### Collection `booking_requests`
- [ ] Vérifier que des booking_requests existent avec les bons `providerId`

## 2. Tests Frontend (Dev local)

```bash
cd sos
npm run dev
```

### Dashboard Multi-Prestataires
- [ ] Ouvrir http://localhost:5173/multi-dashboard
- [ ] Entrer le mot de passe
- [ ] Vérifier que le compteur "Comptes" affiche 4 (pas 105)
- [ ] Vérifier que le compteur "Prestataires" affiche le total réel
- [ ] Tester les filtres (Tous / En attente / Actifs)
- [ ] Tester le toggle vue condensée/détaillée
- [ ] Tester le sélecteur rapide de compte dans le header
- [ ] Cliquer sur "Ouvrir la Conversation" et vérifier la redirection

## 3. Tests Cloud Functions

```bash
cd Outil-sos-expat/functions
npm run build
firebase emulators:start --only functions
```

- [ ] Tester `getMultiDashboardData` avec un token valide
- [ ] Vérifier les logs pour voir le nombre de comptes chargés
- [ ] Tester `generateMultiDashboardOutilToken` avec un bookingId

## 4. Tests Outil IA

```bash
cd Outil-sos-expat
npm run dev
```

- [ ] Ouvrir une URL avec `?token=xxx&redirect=/dashboard/conversation/xxx`
- [ ] Vérifier que la redirection fonctionne après authentification
- [ ] Vérifier que la page de conversation s'affiche correctement

## 5. Déploiement

### Cloud Functions
```bash
cd Outil-sos-expat/functions
npm run deploy -- --only functions:getMultiDashboardData,functions:generateMultiDashboardOutilToken
```

### Frontend SOS
```bash
cd sos
npm run build && firebase deploy --only hosting
```

### Frontend Outil IA
```bash
cd Outil-sos-expat
npm run build && firebase deploy --only hosting
```

## 6. Vérification Post-Déploiement

- [ ] Tester en production avec les vraies données
- [ ] Vérifier les logs Firebase Functions
- [ ] Monitorer les erreurs dans la console

---

## Notes

- Si le comptage est toujours incorrect, vérifier les logs avec:
  ```
  firebase functions:log --only getMultiDashboardData
  ```

- Si les prestataires ne s'affichent pas, vérifier les warnings:
  ```
  [getMultiDashboardData] Provider not found in any collection
  ```
