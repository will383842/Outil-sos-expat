#!/bin/bash

echo "🔧 Fixing registration bugs..."

# Fix #1: sanitizeEmail → sanitizeEmailFinal
echo "📝 Fix #1: Replacing sanitizeEmail() with sanitizeEmailFinal()..."

# ClientRegisterForm.tsx
sed -i 's/sanitizeEmail(form\.email)/sanitizeEmailFinal(form.email)/g' \
  src/components/registration/client/ClientRegisterForm.tsx

# ExpatRegisterForm.tsx
sed -i 's/sanitizeEmail(form\.email)/sanitizeEmailFinal(form.email)/g' \
  src/components/registration/expat/ExpatRegisterForm.tsx

# LawyerRegisterForm.tsx
sed -i 's/sanitizeEmail(form\.email)/sanitizeEmailFinal(form.email)/g' \
  src/components/registration/lawyer/LawyerRegisterForm.tsx

echo "✅ Fix #1 done: sanitizeEmail replaced in 3 files"

# Fix #2: functionsWest2 imports
echo "📝 Fix #2: Fixing functionsWest2 imports..."

# useGroupAdmin.ts
sed -i "s/from 'firebase\/functionsWest2'/from 'firebase\/functions'/" \
  src/hooks/useGroupAdmin.ts
sed -i 's/functionsWest2West2/functionsWest2/g' \
  src/hooks/useGroupAdmin.ts

# useGroupAdminPosts.ts
sed -i "s/from 'firebase\/functionsWest2'/from 'firebase\/functions'/" \
  src/hooks/useGroupAdminPosts.ts
sed -i 's/functionsWest2West2/functionsWest2/g' \
  src/hooks/useGroupAdminPosts.ts

# useGroupAdminResources.ts
sed -i "s/from 'firebase\/functionsWest2'/from 'firebase\/functions'/" \
  src/hooks/useGroupAdminResources.ts
sed -i 's/functionsWest2West2/functionsWest2/g' \
  src/hooks/useGroupAdminResources.ts

# useGroupAdminWithdrawal.ts (probable)
if [ -f "src/hooks/useGroupAdminWithdrawal.ts" ]; then
  sed -i "s/from 'firebase\/functionsWest2'/from 'firebase\/functions'/" \
    src/hooks/useGroupAdminWithdrawal.ts
  sed -i 's/functionsWest2West2/functionsWest2/g' \
    src/hooks/useGroupAdminWithdrawal.ts
fi

echo "✅ Fix #2 done: functionsWest2 imports fixed"

echo ""
echo "🎉 All fixes applied!"
echo "📝 Modified files:"
echo "   - src/components/registration/client/ClientRegisterForm.tsx"
echo "   - src/components/registration/expat/ExpatRegisterForm.tsx"
echo "   - src/components/registration/lawyer/LawyerRegisterForm.tsx"
echo "   - src/hooks/useGroupAdmin.ts"
echo "   - src/hooks/useGroupAdminPosts.ts"
echo "   - src/hooks/useGroupAdminResources.ts"
echo ""
echo "🧪 Testing build..."
npm run build

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Build successful!"
  echo ""
  echo "📋 Next steps:"
  echo "   1. Review changes: git diff"
  echo "   2. Test manually: npm run dev"
  echo "   3. Commit: git add -A && git commit -m 'fix(registration): correct imports'"
  echo "   4. Push: git push"
else
  echo ""
  echo "❌ Build failed. Check errors above."
  exit 1
fi
