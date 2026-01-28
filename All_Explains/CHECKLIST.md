# ✅ CHECKLIST D'INSTALLATION

Cochez au fur et à mesure de votre progression.

## 📋 PHASE 1 : PRÉPARATION

- [ ] J'ai extrait le dossier `online-offline-system`
- [ ] J'ai lu `START_HERE.md`
- [ ] J'ai choisi mon guide (DEMARRAGE_RAPIDE ou README_INSTALLATION)
- [ ] J'ai mon projet Firebase ouvert
- [ ] J'ai un backup de mon code actuel ⚠️

## 📦 PHASE 2 : COPIE DES FICHIERS

### Frontend
- [ ] `src/config/providerActivityConfig.ts`
- [ ] `src/types/providerActivity.ts`
- [ ] `src/hooks/useProviderActivityTracker.ts`
- [ ] `src/hooks/useProviderReminderSystem.ts`
- [ ] `src/components/providers/ProviderOnlineManager.tsx`

### Backend
- [ ] `functions/src/callables/updateProviderActivity.ts`
- [ ] `functions/src/callables/setProviderOffline.ts`
- [ ] `functions/src/scheduled/checkProviderInactivity.ts`

## ✏️ PHASE 3 : MODIFICATIONS

- [ ] **provider.ts** : Ajouté 5 champs (lastActivity, etc.)
- [ ] **types.ts** : Ajouté 5 champs dans User
- [ ] **AuthContext.tsx** : isOnline: false par défaut
- [ ] **Dashboard.tsx** : Wrapper avec ProviderOnlineManager
- [ ] **functions/index.ts** : Exporté 3 nouvelles functions

## 🔨 PHASE 4 : COMPILATION

- [ ] `npm run build` → Aucune erreur TypeScript
- [ ] Aucun import manquant
- [ ] Aucune erreur de type

## 🚀 PHASE 5 : DÉPLOIEMENT

- [ ] `firebase deploy --only functions`
- [ ] Déploiement réussi (3 functions)
- [ ] Vérifié dans Firebase Console :
  - [ ] checkProviderInactivity visible
  - [ ] updateProviderActivity visible
  - [ ] setProviderOffline visible

## 🧪 PHASE 6 : TESTS BASIQUES

### Test 1 : Nouveau prestataire
- [ ] Créé nouveau compte prestataire
- [ ] Vérifié dans Firestore :
  - [ ] `isOnline: false`
  - [ ] `availability: 'offline'`
  - [ ] `autoOfflineEnabled: true`
  - [ ] `lastActivity` présent

### Test 2 : Mise en ligne
- [ ] Cliqué toggle "En ligne"
- [ ] Vérifié dans Firestore :
  - [ ] `isOnline: true`
  - [ ] `availability` changé

### Test 3 : Tracking activité
- [ ] Connecté en tant que prestataire
- [ ] Mis en ligne
- [ ] Cliqué, scrollé dans le dashboard
- [ ] Vérifié console : "Activity detected"
- [ ] Attendu 3 minutes
- [ ] Vérifié console : "Activity updated in Firebase"
- [ ] Vérifié Firestore : `lastActivity` mis à jour

### Test 4 : Rappel inactivité (si temps)
- [ ] Resté en ligne sans bouger 15 minutes
- [ ] Son joué ✓
- [ ] Popup affiché ✓
- [ ] Cliqué "Rester en ligne"
- [ ] Popup fermé ✓

## 🎯 PHASE 7 : VALIDATION FINALE

- [ ] Nouveau prestataire = hors ligne ✓
- [ ] Toggle fonctionne ✓
- [ ] Tracking fonctionne ✓
- [ ] Pas d'erreurs console ✓
- [ ] Pas d'erreurs Firebase ✓

## 📊 OPTIONNEL : MIGRATION DONNÉES

Si vous avez des prestataires existants :
- [ ] Compilé `migrate-providers.ts`
- [ ] Exécuté le script
- [ ] Vérifié logs : X providers updated
- [ ] Vérifié Firestore : Nouveaux champs ajoutés

## ✅ COMPLÉTION

**Date d'installation** : _______________

**Tout fonctionne** : ☐ OUI  ☐ NON

**Notes** :
_________________________________________________
_________________________________________________
_________________________________________________

## 🎉 FÉLICITATIONS !

Si toutes les cases sont cochées, votre système est opérationnel !

Les prestataires peuvent maintenant :
✅ Se mettre en ligne/hors ligne
✅ Être trackés automatiquement
✅ Recevoir des rappels après inactivité
✅ Être déconnectés automatiquement après 60 min

---

**Prochaine étape recommandée** :
→ Tester en situation réelle avec quelques prestataires beta
→ Monitorer les logs Firebase pendant 24h
→ Ajuster les délais si nécessaire dans `providerActivityConfig.ts`

**Support** :
En cas de problème → `TESTS_VERIFICATION.md` section Debug
