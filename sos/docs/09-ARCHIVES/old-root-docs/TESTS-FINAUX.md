# 🧪 TESTS MANUELS FINAUX - À EFFECTUER

## ⚠️ IMPORTANT
Les tests automatiques ont tous passé (9/9) ✅
Il reste à tester manuellement sur les vraies pages d'inscription.

---

## 📝 Test 1: Inscription Avocat (RegisterLawyer)

### Étapes:
1. **Ouvrir navigation privée** (Ctrl+Shift+N dans Chrome)
   - *Raison: Éviter le cache navigateur*

2. **Aller sur la page d'inscription avocat:**
   - URL locale dev: `http://localhost:5173/register-lawyer`
   - URL production: `https://sos-expat.com/register-lawyer`

3. **Remplir le formulaire:**
   - Email, mot de passe, nom, prénom
   - Pays, ville, langue
   - Type de droit, expérience
   - Bio (min 100 caractères)

4. **📸 UPLOAD PHOTO DE PROFIL:**
   - Cliquer sur "Prendre une photo" ou "Galerie"
   - Sélectionner une image **< 5MB**
   - **Recadrer l'image** dans le modal

5. **✅ VÉRIFICATIONS:**
   - [ ] L'image s'upload correctement (barre de progression)
   - [ ] **CRITIQUE:** L'aperçu s'affiche SANS erreur 403
   - [ ] Pas d'erreur dans la console (F12)
   - [ ] Le bouton "Remplacer l'image" fonctionne
   - [ ] Le bouton "Supprimer l'image" fonctionne

6. **Soumettre le formulaire**
   - [ ] L'inscription se termine sans erreur
   - [ ] Redirection vers Telegram ou Dashboard

### 🐛 Si erreur 403 persiste:
```bash
# Vider le cache navigateur (Ctrl+Shift+R)
# OU Vérifier que les règles sont déployées:
cd sos && firebase deploy --only storage
```

---

## 📝 Test 2: Inscription Expatrié Aidant (RegisterExpat)

### Étapes:
1. **Ouvrir navigation privée** (Ctrl+Shift+N)

2. **Aller sur la page d'inscription expatrié:**
   - URL locale dev: `http://localhost:5173/register-expat`
   - URL production: `https://sos-expat.com/register-expat`

3. **Remplir le formulaire:**
   - Email, mot de passe, nom, prénom
   - Pays, ville, langue
   - Types d'aide proposés (multiselect)
   - Bio (min 100 caractères)

4. **📸 UPLOAD PHOTO DE PROFIL:**
   - Cliquer sur "Prendre une photo" ou "Galerie"
   - Sélectionner une image **< 5MB**
   - **Recadrer l'image** dans le modal

5. **✅ VÉRIFICATIONS:**
   - [ ] L'image s'upload correctement
   - [ ] **CRITIQUE:** L'aperçu s'affiche SANS erreur 403
   - [ ] Pas d'erreur dans la console (F12)
   - [ ] Les boutons de remplacement/suppression fonctionnent

6. **Soumettre le formulaire**
   - [ ] L'inscription se termine sans erreur
   - [ ] Redirection correcte

---

## 📝 Test 3: Sécurité - Fichier Trop Grand

### Étapes:
1. Sur n'importe quelle page d'inscription (avocat/expatrié)
2. Essayer d'uploader une image **> 5MB**

### ✅ RÉSULTAT ATTENDU:
- [ ] Upload bloqué
- [ ] Message d'erreur clair: "L'image ne doit pas dépasser 5MB"
- [ ] Pas d'erreur 403 (bloqué avant l'upload)

---

## 📝 Test 4: Sécurité - Format Invalide

### Étapes:
1. Sur n'importe quelle page d'inscription
2. Essayer d'uploader un fichier PDF, Word, ou autre

### ✅ RÉSULTAT ATTENDU:
- [ ] Sélecteur de fichier n'affiche que les images
- [ ] Si contournement: message "Format non supporté"
- [ ] Formats acceptés: JPG, PNG, WEBP, GIF, HEIC

---

## 📝 Test 5: Vérification Console (DevTools)

### Étapes:
1. Ouvrir DevTools (F12)
2. Onglet "Console"
3. Effectuer un upload de photo

### ✅ VÉRIFICATIONS:
- [ ] Pas d'erreur rouge dans la console
- [ ] Logs attendus:
  ```
  🔄 Starting image upload and optimization...
  📊 Image optimized: XXkB → XXkB
  📁 Upload path: registration_temp/...
  📈 Upload progress: 100%
  ✅ Upload successful: https://firebasestorage...
  ```
- [ ] **PAS de:** `GET ... 403 (Forbidden)`

---

## 🔍 Vérification dans Firebase Console

### Étapes:
1. Aller sur [Firebase Console](https://console.firebase.google.com/project/sos-urgently-ac307/storage)
2. Naviguer vers `registration_temp/`

### ✅ VÉRIFICATIONS:
- [ ] Les images uploadées sont bien présentes
- [ ] Les noms de fichiers sont aléatoires (UUID)
- [ ] Les URLs fonctionnent (clic → aperçu dans navigateur)

---

## 📊 RÉSULTATS ATTENDUS

### ✅ SI TOUT FONCTIONNE:
- Upload fluide, aperçu immédiat
- Pas d'erreur 403
- Inscription complète sans blocage
- Photos visibles dans Firebase Storage

### ❌ SI PROBLÈME PERSISTE:
1. Vérifier que les règles sont déployées:
   ```bash
   cd sos && firebase deploy --only storage
   ```

2. Vérifier dans Firebase Console → Storage → Rules que les règles contiennent:
   ```
   match /registration_temp/{fileName} {
     allow read: if true;
   ```

3. Vider le cache CDN Cloudflare (si en production)

4. Vérifier les logs navigateur (F12 → Network → filtrer "403")

---

## 📋 CHECKLIST FINALE

Avant de marquer ce fix comme "TERMINÉ":
- [ ] Test 1: Inscription avocat OK
- [ ] Test 2: Inscription expatrié OK
- [ ] Test 3: Fichier > 5MB bloqué
- [ ] Test 4: Format invalide bloqué
- [ ] Test 5: Console sans erreur 403
- [ ] Vérification Firebase Console OK

**Status:** 🟡 EN ATTENTE DE TESTS MANUELS

---

**Créé le:** 2026-02-14
**Auteur:** Claude Code Assistant
**Fichier de référence:** `sos/VERIFICATION-STORAGE-FIX.md`
