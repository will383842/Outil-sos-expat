# Deploying Firebase Functions

## ✅ Function Status

The `updateProviderTranslation` function is:
- ✅ Exported from `firebase/functions/src/index.ts` (line 5148)
- ✅ Configured with region: `europe-west1`
- ✅ Project: `sos-urgently-ac307`

## 🔄 Do You Need to Redeploy?

**YES!** After making any changes to Firebase Functions, you **MUST redeploy** for the changes to take effect.

Firebase Functions run in the cloud, so local code changes won't affect the deployed version until you deploy.

## 📦 How to Deploy

### Option 1: Deploy All Functions (Recommended - using npx)
```bash
cd /home/peregrine-it/my-project/new-project/sos
npx firebase-tools deploy --only functions
```

### Option 2: Deploy Only updateProviderTranslation (Recommended)
```bash
cd /home/peregrine-it/my-project/new-project/sos
npx firebase-tools deploy --only functions:updateProviderTranslation
```

### Option 3: Using npm script (from functions directory)
```bash
cd /home/peregrine-it/my-project/new-project/sos/firebase/functions
npm run deploy
```

### Option 4: If Firebase CLI is in PATH
```bash
cd /home/peregrine-it/my-project/new-project/sos
firebase deploy --only functions:updateProviderTranslation
```

## 🔍 Check Deployment Status

### View deployed functions:
```bash
npx firebase-tools functions:list
```

### Check specific function:
```bash
npx firebase-tools functions:describe updateProviderTranslation
```

### View logs (to verify it's working):
```bash
npx firebase-tools functions:log --only updateProviderTranslation
```

## ⚠️ Important Notes

1. **Build Process**: The `firebase.json` has a `predeploy` hook that:
   - Runs `npm ci` to install dependencies
   - Runs `npm run build` to compile TypeScript
   - This happens automatically before deployment

2. **Deployment Time**: 
   - First deployment: ~2-5 minutes
   - Subsequent deployments: ~1-3 minutes
   - The function will be temporarily unavailable during deployment

3. **Testing After Deployment**:
   - Wait for deployment to complete
   - Check Firebase Console → Functions
   - Test by updating a provider profile in Dashboard
   - Check logs to verify the function is called

## 🚀 Quick Deploy Command

```bash
# From project root (using npx)
cd /home/peregrine-it/my-project/new-project/sos && npx firebase-tools deploy --only functions:updateProviderTranslation
```

## 📝 Deployment Checklist

- [ ] Code changes are saved
- [ ] TypeScript compiles without errors (`npm run build` in functions directory)
- [ ] Function is exported in `index.ts`
- [ ] Run deployment command
- [ ] Wait for deployment to complete
- [ ] Verify in Firebase Console
- [ ] Test the function by updating a provider profile
- [ ] Check logs to confirm it's working
