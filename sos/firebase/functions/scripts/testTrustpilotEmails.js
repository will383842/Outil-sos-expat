/**
 * Script to test Trustpilot outreach emails
 * Run: node scripts/testTrustpilotEmails.js
 *
 * Sends test emails for all scenarios to williamsjullin@gmail.com
 * Uses Firebase Admin SDK directly (no need for auth token)
 */

const admin = require("firebase-admin");

// Initialize with default credentials (ADC)
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "sos-urgently-ac307",
  });
}

const db = admin.firestore();

// MailWizz config — loaded from env or hardcoded for test
const MAILWIZZ_API_URL = process.env.MAILWIZZ_API_URL || "https://mail.sos-expat.com/api/index.php";
const MAILWIZZ_LIST_UID = process.env.MAILWIZZ_LIST_UID || "yl089ehqpgb96";
const MAILWIZZ_CUSTOMER_ID = process.env.MAILWIZZ_CUSTOMER_ID || "1";

const TEST_EMAIL = "williamsjullin@gmail.com";
const TRUSTPILOT_URL = "https://www.trustpilot.com/review/sos-expat.com";

async function getApiKey() {
  // Try env first, then Firebase Secret Manager
  if (process.env.MAILWIZZ_API_KEY) return process.env.MAILWIZZ_API_KEY;

  // Use gcloud to fetch secret
  const { execSync } = require("child_process");
  try {
    const key = execSync(
      'gcloud secrets versions access latest --secret=MAILWIZZ_API_KEY --project=sos-urgently-ac307',
      { encoding: "utf-8" }
    ).trim();
    return key;
  } catch {
    console.error("❌ Cannot get MAILWIZZ_API_KEY. Set it as env var or ensure gcloud is configured.");
    process.exit(1);
  }
}

// Template UID cache
const templateCache = new Map();

async function refreshCache(apiKey) {
  let page = 1;
  let totalPages = 1;
  const axios = require("axios");

  do {
    const resp = await axios.get(`${MAILWIZZ_API_URL}/templates?page=${page}&per_page=100`, {
      headers: {
        "X-MW-PUBLIC-KEY": apiKey,
        "X-MW-CUSTOMER-ID": MAILWIZZ_CUSTOMER_ID,
        "User-Agent": "SOS-Test/1.0",
      },
      timeout: 15000,
    });
    const records = resp.data?.data?.records || [];
    for (const r of records) {
      templateCache.set(r.name, r.template_uid);
    }
    totalPages = resp.data?.data?.total_pages || 1;
    page++;
  } while (page <= totalPages);

  console.log(`📦 Cache loaded: ${templateCache.size} templates`);
}

function convertTemplateName(code) {
  let name = code;
  name = name.replace(/^TR_PRO_/, "transactional-provider-");
  name = name.replace(/^TR_CLI_/, "transactional-client-");
  name = name.replace(/^TR_CHAT_/, "transactional-chatter-");
  name = name.replace(/_([A-Z]{2})$/, " [$1]");
  return name;
}

async function sendTestEmail(apiKey, templateCode, fields) {
  const axios = require("axios");
  const templateName = convertTemplateName(templateCode);

  // Get UID
  let uid = templateCache.get(templateName);
  if (!uid) {
    // Try EN fallback
    const enName = templateName.replace(/\s\[[A-Z]{2}\]$/, " [EN]");
    uid = templateCache.get(enName);
    if (uid) {
      console.log(`  ⚠️ Fallback to EN: ${enName}`);
    }
  }

  if (!uid) {
    return { status: "TEMPLATE_NOT_FOUND", templateName };
  }

  // Fetch template HTML
  const tmplResp = await axios.get(`${MAILWIZZ_API_URL}/templates/${uid}`, {
    headers: {
      "X-MW-PUBLIC-KEY": apiKey,
      "X-MW-CUSTOMER-ID": MAILWIZZ_CUSTOMER_ID,
    },
    timeout: 10000,
  });

  let html = tmplResp.data?.data?.record?.content || "";
  if (!html) return { status: "EMPTY_TEMPLATE" };

  // Replace variables FIRST (so subject also gets rendered)
  for (const [key, value] of Object.entries(fields)) {
    html = html.replace(new RegExp(`\\[${key}\\]`, "g"), value || "");
  }

  // Extract subject AFTER variable replacement
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const subject = titleMatch ? titleMatch[1].trim() : templateName;

  // Send
  const formData = new URLSearchParams();
  formData.append("email[to_email]", TEST_EMAIL);
  formData.append("email[to_name]", fields.FNAME || "Test");
  formData.append("email[from_email]", "manon@ulixai-expat.com");
  formData.append("email[from_name]", "Manon de SOS Expat");
  formData.append("email[subject]", `[TEST] ${subject}`);
  formData.append("email[body]", Buffer.from(html).toString("base64"));

  const resp = await axios.post(`${MAILWIZZ_API_URL}/transactional-emails`, formData.toString(), {
    headers: {
      "X-MW-PUBLIC-KEY": apiKey,
      "X-MW-CUSTOMER-ID": MAILWIZZ_CUSTOMER_ID,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    timeout: 15000,
  });

  return { status: "SENT", subject, response: resp.data?.status };
}

async function main() {
  console.log(`\n🧪 Trustpilot Outreach Email Test`);
  console.log(`📧 Destination: ${TEST_EMAIL}\n`);

  const apiKey = await getApiKey();
  await refreshCache(apiKey);

  const scenarios = [
    {
      name: "1. Client Trustpilot Invite (FR) — EXISTING",
      template: "TR_CLI_trustpilot-invite_FR",
      fields: {
        EMAIL: TEST_EMAIL, FNAME: "Williams", LNAME: "Test Client",
        TRUSTPILOT_URL, RATING_STARS: "5", COUNTRY: "France",
      },
    },
    {
      name: "2. Client Trustpilot Invite (EN) — EXISTING",
      template: "TR_CLI_trustpilot-invite_EN",
      fields: {
        EMAIL: TEST_EMAIL, FNAME: "Williams", LNAME: "Test Client",
        TRUSTPILOT_URL, RATING_STARS: "4", COUNTRY: "France",
      },
    },
    {
      name: "3. Chatter Trustpilot Invite (FR) — NEW",
      template: "TR_CHAT_trustpilot-invite_FR",
      fields: {
        EMAIL: TEST_EMAIL, FNAME: "Williams", LNAME: "Test Chatter",
        TRUSTPILOT_URL, LINK: "https://sos-expat.com/ref/test123",
        AVAILABLE_BALANCE: "$125", TOTAL_EARNED: "$450",
        TEAM_SIZE: "8", LEVEL_NAME: "Silver",
        COMMISSION_CLIENT_LAWYER: "$10", COMMISSION_CLIENT_EXPAT: "$3",
      },
    },
    {
      name: "4. Chatter Trustpilot Invite (EN) — NEW",
      template: "TR_CHAT_trustpilot-invite_EN",
      fields: {
        EMAIL: TEST_EMAIL, FNAME: "Williams", LNAME: "Test Chatter",
        TRUSTPILOT_URL, LINK: "https://sos-expat.com/ref/test123",
        AVAILABLE_BALANCE: "$125", TOTAL_EARNED: "$450",
        TEAM_SIZE: "8", LEVEL_NAME: "Silver",
      },
    },
    {
      name: "5. Provider Trustpilot Outreach (FR) — NEW",
      template: "TR_PRO_trustpilot-outreach_FR",
      fields: {
        EMAIL: TEST_EMAIL, FNAME: "Williams", LNAME: "Test Avocat",
        TRUSTPILOT_URL, TOTAL_CALLS: "15", NB_CALLS: "15",
        AVG_RATING: "4.8", STARS: "5", RATING_STARS: "5",
        COUNTRY: "France", ROLE: "lawyer",
        DASHBOARD_URL: "https://sos-expat.com/dashboard",
      },
    },
    {
      name: "6. Provider Trustpilot Outreach (EN) — NEW",
      template: "TR_PRO_trustpilot-outreach_EN",
      fields: {
        EMAIL: TEST_EMAIL, FNAME: "Williams", LNAME: "Test Lawyer",
        TRUSTPILOT_URL, TOTAL_CALLS: "15", NB_CALLS: "15",
        AVG_RATING: "4.8", STARS: "5", RATING_STARS: "5",
        COUNTRY: "France", ROLE: "lawyer",
        DASHBOARD_URL: "https://sos-expat.com/dashboard",
      },
    },
  ];

  const results = [];
  for (const s of scenarios) {
    process.stdout.write(`  ${s.name}... `);
    try {
      const result = await sendTestEmail(apiKey, s.template, s.fields);
      if (result.status === "SENT") {
        console.log(`✅ SENT (subject: "${result.subject}")`);
      } else {
        console.log(`⚠️ ${result.status} (${result.templateName || ""})`);
      }
      results.push({ ...s, result });
    } catch (err) {
      console.log(`❌ ERROR: ${err.message}`);
      results.push({ ...s, result: { status: "ERROR", error: err.message } });
    }
  }

  console.log(`\n📊 Results:`);
  const sent = results.filter(r => r.result.status === "SENT").length;
  const notFound = results.filter(r => r.result.status === "TEMPLATE_NOT_FOUND").length;
  const errors = results.filter(r => r.result.status === "ERROR").length;
  console.log(`  ✅ Sent: ${sent}`);
  console.log(`  ⚠️ Template not found: ${notFound}`);
  console.log(`  ❌ Errors: ${errors}`);

  if (notFound > 0) {
    console.log(`\n📝 Templates à créer dans MailWizz:`);
    for (const r of results.filter(r => r.result.status === "TEMPLATE_NOT_FOUND")) {
      console.log(`  - ${r.result.templateName}`);
    }
  }

  console.log(`\n✅ Check ${TEST_EMAIL} inbox for test emails!`);
  process.exit(0);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
