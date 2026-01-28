# 🧪 TESTS DE VÉRIFICATION

## ✅ Checklist d'installation

### Phase 1 : Compilation
- [ ] `npm run build` sans erreurs TypeScript
- [ ] Aucune erreur d'import manquant

### Phase 2 : Firebase Functions
- [ ] `firebase deploy --only functions` réussi
- [ ] Functions visibles dans console Firebase :
  - checkProviderInactivity
  - updateProviderActivity
  - setProviderOffline

### Phase 3 : Tests Frontend

#### Test 1 : Inscription nouveau prestataire
1. Créer un nouveau compte lawyer ou expat
2. Ouvrir Firebase Console → Firestore
3. Vérifier dans `users` et `sos_profiles` :
   - `isOnline: false` ✓
   - `availability: 'offline'` ✓
   - `autoOfflineEnabled: true` ✓
   - `lastActivity` présent ✓

#### Test 2 : Passer en ligne
1. Se connecter avec le prestataire
2. Toggle "En ligne" dans Header ou Dashboard
3. Vérifier dans Firestore :
   - `isOnline: true` ✓
   - `availability: 'available'` ✓

#### Test 3 : Tracking d'activité
1. Rester connecté et en ligne
2. Cliquer, scroller, bouger la souris
3. Console navigateur : "Activity detected: click" ✓
4. Après 3 min : "Activity updated in Firebase" ✓
5. Vérifier dans Firestore que `lastActivity` se met à jour ✓

#### Test 4 : Rappel d'inactivité
1. Se mettre en ligne
2. NE RIEN FAIRE pendant 15 minutes
3. Vérifier :
   - Son joué ✓
   - Voix jouée ✓
   - Popup affiché ✓
4. Cliquer "Rester en ligne" → Popup se ferme ✓

#### Test 5 : Désactiver rappels
1. Dans popup, cliquer "Ne plus me rappeler aujourd'hui"
2. Attendre 15 min inactif
3. Aucun popup ne doit s'afficher ✓
4. Le lendemain, les rappels reviennent ✓

#### Test 6 : Passer hors ligne via popup
1. Attendre popup après 15 min
2. Cliquer "Passer hors ligne"
3. Vérifier Firestore :
   - `isOnline: false` ✓
   - `availability: 'offline'` ✓

#### Test 7 : Déconnexion automatique
1. Se mettre en ligne
2. NE RIEN FAIRE pendant 60 minutes
3. Vérifier que la fonction scheduled s'exécute
4. Vérifier dans Firestore :
   - `isOnline: false` ✓
   - `availability: 'offline'` ✓

#### Test 8 : Synchronisation multi-appareils
1. Se connecter sur 2 appareils (ou 2 onglets)
2. Changer le statut sur appareil 1
3. Vérifier que appareil 2 se met à jour en temps réel ✓

### Phase 4 : Tests de préférences

#### Test 9 : Désactiver son
```javascript
localStorage.setItem('soundEnabled', 'false');
```
- Attendre 15 min → Son ne doit PAS jouer ✓

#### Test 10 : Désactiver voix
```javascript
localStorage.setItem('voiceEnabled', 'false');
```
- Attendre 15 min → Voix ne doit PAS jouer ✓

#### Test 11 : Désactiver popup
```javascript
localStorage.setItem('modalEnabled', 'false');
```
- Attendre 15 min → Popup ne doit PAS s'afficher ✓

## 🐛 Debug

### Si le tracking ne fonctionne pas :
```javascript
// Dans la console navigateur
console.log('User:', user);
console.log('Is provider:', isProvider);
console.log('Is online:', isOnline);
```

### Si les Functions ne répondent pas :
```bash
firebase functions:log --only checkProviderInactivity
firebase functions:log --only updateProviderActivity
```

### Si Firestore ne se met pas à jour :
1. Vérifier les règles Firestore
2. Vérifier que l'utilisateur a les permissions
3. Vérifier la console Firebase pour erreurs

## 📊 Monitoring

### Dans Firebase Console
1. Functions → Logs → Vérifier exécutions
2. Firestore → Vérifier les mises à jour en temps réel
3. Authentication → Vérifier les utilisateurs

### Dans Console navigateur
1. Onglet Network → Vérifier les appels API
2. Onglet Console → Vérifier les logs
3. Application → LocalStorage → Vérifier les préférences

## ✅ VALIDATION FINALE

Si tous les tests passent :
- ✅ Le système est opérationnel
- ✅ Les prestataires sont hors ligne par défaut
- ✅ Le tracking fonctionne
- ✅ Les rappels fonctionnent
- ✅ La déconnexion auto fonctionne
- ✅ La synchronisation fonctionne

🎉 **SYSTÈME PRÊT EN PRODUCTION !**
