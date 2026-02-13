#!/usr/bin/env node
/**
 * Fix Remaining Contrast Issues - Correction finale intelligente
 *
 * Stratégie:
 * 1. Dashboard pages: tous les gray-xxx doivent avoir dark:
 * 2. Landing pages (dark only): gray-300 est OK MAIS doit être contextualisé
 * 3. Chatter: traiter séparément (beaucoup de problèmes)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// Détecte si un fichier est dark-mode only
function isDarkModeOnly(content, filename) {
  return (
    /className="[^"]*bg-black[^"]*"/.test(content) ||
    /className="[^"]*bg-gradient-to-\w+ from-\w+-\d+ via-\w+-\d+ to-black/.test(content) ||
    filename.includes('Landing.tsx') ||
    filename.includes('Register.tsx') ||
    filename.includes('RegisterForm.tsx')
  );
}

// Fix patterns pour dashboard (light + dark)
function fixDashboardPage(content, filename) {
  let fixed = content;
  let changes = 0;

  // Pattern 1: text-gray-400 sans dark: → text-gray-600 dark:text-gray-400
  const gray400Pattern = /className="([^"]*)text-gray-400(?!\s+dark:)([^"]*)"/g;
  fixed = fixed.replace(gray400Pattern, (match, before, after) => {
    changes++;
    // Si déjà dark:text-gray-400 ailleurs dans la className, skip
    if (before.includes('dark:text-gray-400') || after.includes('dark:text-gray-400')) {
      return match;
    }
    return `className="${before}text-gray-600 dark:text-gray-400${after}"`;
  });

  // Pattern 2: text-gray-500 sans dark: → text-gray-700 dark:text-gray-300
  const gray500Pattern = /className="([^"]*)text-gray-500(?!\s+dark:)([^"]*)"/g;
  fixed = fixed.replace(gray500Pattern, (match, before, after) => {
    changes++;
    if (before.includes('dark:text-gray-') || after.includes('dark:text-gray-')) {
      return match;
    }
    return `className="${before}text-gray-700 dark:text-gray-300${after}"`;
  });

  // Pattern 3: text-gray-300 sans dark: sur dashboard (ERREUR) → text-gray-700 dark:text-gray-300
  if (!isDarkModeOnly(content, filename)) {
    const gray300Pattern = /className="([^"]*)text-gray-300(?!\s+dark:)([^"]*)"/g;
    fixed = fixed.replace(gray300Pattern, (match, before, after) => {
      changes++;
      return `className="${before}text-gray-700 dark:text-gray-300${after}"`;
    });
  }

  return { content: fixed, changes };
}

// Fix patterns pour landing (dark only)
function fixLandingPage(content) {
  let fixed = content;
  let changes = 0;

  // Pattern 1: text-white/60 → text-white/80 (meilleur contraste)
  fixed = fixed.replace(/text-white\/60/g, () => {
    changes++;
    return 'text-white/80';
  });

  // Pattern 2: bg-white/5 → bg-white/10 (sauf dans pipes |)
  fixed = fixed.replace(/bg-white\/5(?!\s*\||\/)/g, () => {
    changes++;
    return 'bg-white/10';
  });

  // Pattern 3: text-gray-500 sur dark → text-gray-400 (déjà fait normalement)
  // Pattern 4: text-gray-400 sur dark → text-gray-300 (déjà fait normalement)

  return { content: fixed, changes };
}

// Files to fix
const FILES_TO_FIX = {
  blogger: [
    'src/pages/Blogger/BloggerDashboard.tsx',
    'src/pages/Blogger/BloggerEarnings.tsx',
    'src/pages/Blogger/BloggerLanding.tsx',
    'src/pages/Blogger/BloggerLeaderboard.tsx',
    'src/pages/Blogger/BloggerPayments.tsx',
    'src/pages/Blogger/BloggerProfile.tsx',
    'src/pages/Blogger/BloggerReferrals.tsx',
    'src/pages/Blogger/BloggerResources.tsx',
    'src/components/Blogger/Layout/BloggerDashboardLayout.tsx',
  ],
  influencer: [
    'src/pages/Influencer/InfluencerDashboard.tsx',
    'src/pages/Influencer/InfluencerEarnings.tsx',
    'src/pages/Influencer/InfluencerLanding.tsx',
    'src/pages/Influencer/InfluencerRegister.tsx',
    'src/pages/Influencer/InfluencerLeaderboard.tsx',
    'src/pages/Influencer/InfluencerPayments.tsx',
    'src/pages/Influencer/InfluencerProfile.tsx',
    'src/pages/Influencer/InfluencerReferrals.tsx',
    'src/pages/Influencer/InfluencerResources.tsx',
    'src/pages/Influencer/InfluencerPromoTools.tsx',
    'src/components/Influencer/Layout/InfluencerDashboardLayout.tsx',
    'src/components/Influencer/Cards/InfluencerBalanceCard.tsx',
    'src/components/Influencer/Cards/InfluencerEarningsBreakdownCard.tsx',
    'src/components/Influencer/Cards/InfluencerLevelCard.tsx',
    'src/components/Influencer/Cards/InfluencerQuickStatsCard.tsx',
    'src/components/Influencer/Cards/InfluencerStatsCard.tsx',
    'src/components/Influencer/Cards/InfluencerTeamCard.tsx',
    'src/components/Influencer/Forms/InfluencerRegisterForm.tsx',
    'src/components/Influencer/Forms/InfluencerWithdrawalForm.tsx',
  ],
  groupAdmin: [
    'src/pages/GroupAdmin/GroupAdminDashboard.tsx',
    'src/pages/GroupAdmin/GroupAdminLanding.tsx',
    'src/pages/GroupAdmin/GroupAdminRegister.tsx',
    'src/pages/GroupAdmin/GroupAdminLeaderboard.tsx',
    'src/pages/GroupAdmin/GroupAdminPayments.tsx',
    'src/pages/GroupAdmin/GroupAdminPosts.tsx',
    'src/pages/GroupAdmin/GroupAdminProfile.tsx',
    'src/pages/GroupAdmin/GroupAdminReferrals.tsx',
    'src/pages/GroupAdmin/GroupAdminResources.tsx',
    'src/components/GroupAdmin/Layout/GroupAdminDashboardLayout.tsx',
    'src/components/GroupAdmin/Forms/GroupAdminRegisterForm.tsx',
  ],
  chatter: [
    'src/pages/Chatter/ChatterDashboard.tsx',
    'src/pages/Chatter/ChatterLanding.tsx',
    'src/pages/Chatter/ChatterRegister.tsx',
    'src/components/Chatter/Layout/ChatterDashboardLayout.tsx',
  ],
};

let totalFiles = 0;
let totalChanges = 0;

console.log('🔧 Fixing Remaining Contrast Issues\n');

Object.entries(FILES_TO_FIX).forEach(([role, files]) => {
  console.log(`\n${role.toUpperCase()}:`);
  console.log('─'.repeat(60));

  files.forEach(file => {
    const fullPath = path.join(ROOT, file);

    if (!fs.existsSync(fullPath)) {
      console.log(`  ⚠️  Skipped: ${file.split('/').pop()}`);
      return;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const filename = path.basename(fullPath);
    const isDark = isDarkModeOnly(content, filename);

    let result;
    if (isDark) {
      result = fixLandingPage(content);
    } else {
      result = fixDashboardPage(content, filename);
    }

    if (result.changes > 0) {
      fs.writeFileSync(fullPath, result.content, 'utf8');
      const type = isDark ? 'Landing' : 'Dashboard';
      console.log(`  ✅ ${type.padEnd(10)} ${filename.padEnd(35)} (${result.changes} fixes)`);
      totalFiles++;
      totalChanges += result.changes;
    }
  });
});

console.log(`\n${'═'.repeat(60)}`);
console.log(`✅ Done! ${totalFiles} files fixed, ${totalChanges} total fixes\n`);
