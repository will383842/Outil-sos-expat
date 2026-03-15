// Backfill existing chatters to MailWizz onboarding list — with ALL fields
const admin = require('firebase-admin');
if (admin.apps.length === 0) admin.initializeApp({ projectId: 'sos-urgently-ac307', credential: admin.credential.applicationDefault() });
const db = admin.firestore();
const axios = require('axios');

const MAILWIZZ_API_URL = 'https://mail.sos-expat.com/api/index.php';
const MAILWIZZ_API_KEY = '37956aded598e572689807f5d55c88eae1a0cb26';
const MAILWIZZ_LIST_UID = 'yr810av4z5275'; // Chatter onboarding list

function formatUsd(cents) {
  if (!cents || cents === 0) return "$0";
  const dollars = cents / 100;
  return dollars % 1 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

function mapChatterFields(d, chatterId) {
  const rates = d.lockedRates || d.commissionRates || {};
  const createdAt = d.createdAt ? d.createdAt.toDate() : null;
  const daysSinceReg = createdAt ? Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const totalEarnedCents = d.totalEarned || 0;
  const avgCommPerRecruit = d.avgCommissionPerRecruit || 500;

  return {
    EMAIL: d.email || '',
    FNAME: d.firstName || (d.name ? d.name.split(' ')[0] : ''),
    LNAME: d.lastName || (d.name ? d.name.split(' ').slice(1).join(' ') : ''),
    COUNTRY: d.country || '',
    LANGUAGE: (d.language || d.preferredLanguage || 'en').toLowerCase(),
    CHATTER_STATUS: 'inscrit',
    IS_SENEGAL: d.country === 'SN' ? 'yes' : 'no',
    LINK: d.affiliateLink || `https://sos-expat.com/ref/${chatterId}`,
    DASHBOARD_URL: 'https://sos-expat.com/chatter/dashboard',
    QR_CODE_URL: d.qrCodeUrl || `https://sos-expat.com/qr/${chatterId}`,
    COMMISSION_CLIENT_LAWYER: formatUsd(rates.commissionClientLawyer || rates.client_lawyer || 1000),
    COMMISSION_CLIENT_EXPAT: formatUsd(rates.commissionClientExpat || rates.client_expat || 300),
    COMMISSION_N1: formatUsd(rates.commissionN1 || rates.n1_call || 100),
    COMMISSION_N2: formatUsd(rates.commissionN2 || rates.n2_call || 50),
    COMMISSION_PROVIDER: formatUsd(rates.commissionProvider || rates.provider_call || 500),
    AVAILABLE_BALANCE: formatUsd(d.availableBalance || 0),
    TOTAL_EARNED: formatUsd(d.totalEarned || 0),
    MONTHLY_EARNINGS: formatUsd(d.monthlyEarnings || 0),
    TEAM_SIZE: (d.teamSize || d.totalRecruits || 0).toString(),
    RANK: (d.rank || d.leaderboardPosition || '-').toString(),
    LEVEL_NAME: d.levelName || d.tier || 'Starter',
    CURRENT_STREAK: (d.currentStreak || d.streak || 0).toString(),
    DAYS_SINCE_REGISTRATION: daysSinceReg.toString(),
    AVG_EARNINGS_PER_DAY: daysSinceReg > 0 ? formatUsd(Math.round(totalEarnedCents / daysSinceReg)) : '$0',
    PROJECTED_3_RECRUITS: formatUsd(avgCommPerRecruit * 3),
    PROJECTED_10_RECRUITS: formatUsd(avgCommPerRecruit * 10),
  };
}

async function subscribeChatter(fields) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) {
    params.append(key, value);
  }

  const resp = await axios.post(
    MAILWIZZ_API_URL + '/lists/' + MAILWIZZ_LIST_UID + '/subscribers',
    params.toString(),
    {
      headers: {
        'X-MW-PUBLIC-KEY': MAILWIZZ_API_KEY,
        'X-MW-CUSTOMER-ID': '2',
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    }
  );
  return resp.data;
}

async function updateSubscriber(subscriberUid, fields) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) {
    params.append(key, value);
  }

  await axios.put(
    MAILWIZZ_API_URL + '/lists/' + MAILWIZZ_LIST_UID + '/subscribers/' + subscriberUid,
    params.toString(),
    {
      headers: {
        'X-MW-PUBLIC-KEY': MAILWIZZ_API_KEY,
        'X-MW-CUSTOMER-ID': '2',
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    }
  );
}

async function searchSubscriber(email) {
  const resp = await axios.get(
    MAILWIZZ_API_URL + '/lists/' + MAILWIZZ_LIST_UID + '/subscribers/search-by-email?EMAIL=' + encodeURIComponent(email),
    {
      headers: {
        'X-MW-PUBLIC-KEY': MAILWIZZ_API_KEY,
        'X-MW-CUSTOMER-ID': '2',
      }
    }
  );
  // API returns either { data: { subscriber_uid, ... } } or { data: { records: [...] } }
  const data = resp.data?.data;
  if (!data) return null;
  if (data.subscriber_uid) return data.subscriber_uid;
  const records = data.records || [];
  return records.length > 0 ? records[0].subscriber_uid : null;
}

async function run() {
  const snap = await db.collection('chatters').get();
  console.log('Total chatters found:', snap.size);

  let created = 0, updated = 0, skipped = 0, errors = 0;

  for (const doc of snap.docs) {
    const d = doc.data();
    if (!d.email) { skipped++; continue; }

    const fields = mapChatterFields(d, doc.id);

    try {
      // Check if already exists → update with real data
      const existingUid = await searchSubscriber(d.email);
      if (existingUid) {
        await updateSubscriber(existingUid, fields);
        updated++;
      } else {
        await subscribeChatter(fields);
        created++;
      }
      const total = created + updated;
      if (total % 10 === 0) console.log(`  Progress: ${total} (${created} created, ${updated} updated)`);
    } catch (e) {
      const errData = e.response ? JSON.stringify(e.response.data) : e.message;
      errors++;
      console.error('  Error for', d.email.slice(0, 4) + '***:', errData);
    }
  }

  console.log('\n=== BACKFILL COMPLETE ===');
  console.log({ created, updated, skipped, errors, total: snap.size });
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
