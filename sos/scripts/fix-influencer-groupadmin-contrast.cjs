#!/usr/bin/env node
/**
 * Fix Influencer & GroupAdmin Design Contrast Issues
 *
 * Applies same fixes as Blogger:
 * - Dashboard pages (light + dark): gray-500 → gray-700, gray-400 → gray-600
 * - Landing pages (dark only): gray-400 → gray-300, gray-500 → gray-400
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// Files to fix
const DASHBOARD_PAGES = [
  // Influencer Dashboard
  'src/pages/Influencer/InfluencerDashboard.tsx',
  'src/pages/Influencer/InfluencerEarnings.tsx',
  'src/pages/Influencer/InfluencerLeaderboard.tsx',
  'src/pages/Influencer/InfluencerPayments.tsx',
  'src/pages/Influencer/InfluencerProfile.tsx',
  'src/pages/Influencer/InfluencerPromoTools.tsx',
  'src/pages/Influencer/InfluencerReferrals.tsx',
  'src/pages/Influencer/InfluencerResources.tsx',
  'src/pages/Influencer/InfluencerSuspended.tsx',
  'src/components/Influencer/Layout/InfluencerDashboardLayout.tsx',
  'src/components/Influencer/Cards/InfluencerBalanceCard.tsx',
  'src/components/Influencer/Cards/InfluencerEarningsBreakdownCard.tsx',
  'src/components/Influencer/Cards/InfluencerLevelCard.tsx',
  'src/components/Influencer/Cards/InfluencerLiveActivityFeed.tsx',
  'src/components/Influencer/Cards/InfluencerQuickStatsCard.tsx',
  'src/components/Influencer/Cards/InfluencerStatsCard.tsx',
  'src/components/Influencer/Cards/InfluencerTeamCard.tsx',
  'src/components/Influencer/Forms/InfluencerWithdrawalForm.tsx',
  'src/components/Influencer/Links/InfluencerAffiliateLinks.tsx',
  'src/components/Influencer/Cards/InfluencerMotivationWidget.tsx',

  // GroupAdmin Dashboard
  'src/pages/GroupAdmin/GroupAdminDashboard.tsx',
  'src/pages/GroupAdmin/GroupAdminLeaderboard.tsx',
  'src/pages/GroupAdmin/GroupAdminPayments.tsx',
  'src/pages/GroupAdmin/GroupAdminPosts.tsx',
  'src/pages/GroupAdmin/GroupAdminProfile.tsx',
  'src/pages/GroupAdmin/GroupAdminReferrals.tsx',
  'src/pages/GroupAdmin/GroupAdminResources.tsx',
  'src/pages/GroupAdmin/GroupAdminSuspended.tsx',
  'src/components/GroupAdmin/Layout/GroupAdminDashboardLayout.tsx',
];

const LANDING_PAGES = [
  'src/pages/Influencer/InfluencerLanding.tsx',
  'src/pages/Influencer/InfluencerRegister.tsx',
  'src/components/Influencer/Forms/InfluencerRegisterForm.tsx',
  'src/pages/GroupAdmin/GroupAdminLanding.tsx',
  'src/pages/GroupAdmin/GroupAdminRegister.tsx',
  'src/components/GroupAdmin/Forms/GroupAdminRegisterForm.tsx',
];

// Dashboard fixes (light + dark mode)
const DASHBOARD_REPLACEMENTS = [
  { from: /text-gray-500 dark:text-gray-400/g, to: 'text-gray-700 dark:text-gray-300' },
  { from: /text-xs text-gray-500(?! dark)/g, to: 'text-xs text-gray-600 dark:text-gray-400' },
  { from: /text-sm text-gray-500(?! dark)/g, to: 'text-sm text-gray-700 dark:text-gray-300' },
  { from: /text-xs font-medium text-gray-500 uppercase/g, to: 'text-xs font-medium text-gray-700 dark:text-gray-300 uppercase' },
  { from: /text-sm font-medium text-gray-700 dark:text-gray-300/g, to: 'text-sm font-semibold text-gray-900 dark:text-white' },
];

// Landing fixes (dark mode only)
const LANDING_REPLACEMENTS = [
  { from: /(?<!dark:)text-gray-400(?! dark)/g, to: 'text-gray-300' },
  { from: /(?<!dark:)text-gray-500(?! dark)/g, to: 'text-gray-400' },
  { from: /text-white\/80/g, to: 'text-white/90' },
  { from: /text-white\/70/g, to: 'text-white/90' },
  { from: /bg-white\/5(?! \|)/g, to: 'bg-white/10' },
];

let totalChanges = 0;
let filesModified = 0;

function fixFile(filePath, replacements, type) {
  const fullPath = path.join(ROOT, filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Skipped (not found): ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  let fileChanges = 0;

  replacements.forEach(({ from, to }) => {
    const matches = content.match(from);
    if (matches) {
      content = content.replace(from, to);
      modified = true;
      fileChanges += matches.length;
    }
  });

  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ ${type.padEnd(10)} ${filePath.split('/').pop().padEnd(40)} (${fileChanges} changes)`);
    filesModified++;
    totalChanges += fileChanges;
  }
}

console.log('🎨 Fixing Influencer & GroupAdmin Design Contrast\n');

console.log('📱 Dashboard Pages (light + dark mode):');
DASHBOARD_PAGES.forEach(file => fixFile(file, DASHBOARD_REPLACEMENTS, 'Dashboard'));

console.log('\n🌟 Landing Pages (dark mode only):');
LANDING_PAGES.forEach(file => fixFile(file, LANDING_REPLACEMENTS, 'Landing'));

console.log(`\n✅ Done! ${filesModified} files modified, ${totalChanges} total changes`);
