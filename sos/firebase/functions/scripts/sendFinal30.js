/**
 * Envoie 30 emails de test final — 6 Zoho + 12 Chatter MailWizz + 12 Provider/Client MailWizz
 * Chaque sujet contient un timestamp unique pour éviter le regroupement Gmail
 */
const axios = require("axios");
const { execSync } = require("child_process");
const nodemailer = require("nodemailer");

const API = "https://mail.sos-expat.com/api/index.php";
const CID = "1";
const KEY = execSync("gcloud secrets versions access latest --secret=MAILWIZZ_API_KEY --project=sos-urgently-ac307", { encoding: "utf-8" }).trim();
const EU = execSync("gcloud secrets versions access latest --secret=EMAIL_USER --project=sos-urgently-ac307", { encoding: "utf-8" }).trim();
const EP = execSync("gcloud secrets versions access latest --secret=EMAIL_PASS --project=sos-urgently-ac307", { encoding: "utf-8" }).trim();
const EMAIL = "williamsjullin@gmail.com";
const TS = Date.now().toString().slice(-6);

const cache = new Map();
async function loadCache() {
  let p = 1, tp = 1;
  do {
    const r = await axios.get(`${API}/templates?page=${p}&per_page=100`, {
      headers: { "X-MW-PUBLIC-KEY": KEY, "X-MW-CUSTOMER-ID": CID }, timeout: 15000,
    });
    for (const t of (r.data?.data?.records || [])) cache.set(t.name, t.template_uid);
    tp = r.data?.data?.total_pages || 1; p++;
  } while (p <= tp);
}

const fields = {
  EMAIL, FNAME: "Williams", LNAME: "Test Chatter",
  LINK: "https://sos-expat.com/ref/testChatter123",
  AFFILIATE_LINK: "https://sos-expat.com/ref/testChatter123",
  DASHBOARD_URL: "https://sos-expat.com/chatter/tableau-de-bord",
  COMMISSION_CLIENT_LAWYER: "$10", COMMISSION_CLIENT_EXPAT: "$3",
  COMMISSION_N1: "$1", COMMISSION_N2: "$0.50", COMMISSION_PROVIDER: "$5",
  COMMISSION_REFERRAL: "$5",
  AVAILABLE_BALANCE: "$125.50", TOTAL_EARNED: "$450", MONTHLY_EARNINGS: "$75",
  TEAM_SIZE: "8", RANK: "12", LEVEL_NAME: "Silver", CURRENT_STREAK: "5",
  LAST_COMMISSION_AMOUNT: "$10", LAST_COMMISSION_TYPE: "client_lawyer",
  NEW_RECRUIT_NAME: "Marie Dupont", WITHDRAWAL_AMOUNT: "$100",
  WITHDRAWAL_FEE: "$3", WITHDRAWAL_THRESHOLD: "$30",
  UNSUBSCRIBE_URL: "https://sos-expat.com/contact",
  TRUSTPILOT_URL: "https://www.trustpilot.com/review/sos-expat.com",
  COUNTRY: "France", LANGUAGE: "fr",
  ROLE: "lawyer", TOTAL_CALLS: "42", AVG_RATING: "4.8",
  RATING_STARS: "5", STARS: "5", NB_CALLS: "42",
  EXPERT_NAME: "Me. Dubois", CLIENT_NAME: "Jean-Fran\u00e7ois M\u00fcller",
  AMOUNT: "4500", DURATION: "15",
  COMMENT: "Tr\u00e8s bon service, merci !", REVIEW_TEXT: "Excellent !",
  CURRENCY: "EUR", REASON: "Carte expir\u00e9e",
  PROFILE_URL: "https://sos-expat.com/profile/edit",
  HELP_URL: "https://sos-expat.com/centre-aide",
  SUPPORT_URL: "https://sos-expat.com/contact",
  INVOICE_URL: "https://sos-expat.com/dashboard",
  RETRY_URL: "https://sos-expat.com/dashboard",
  KYC_URL: "https://sos-expat.com/dashboard/kyc",
  MONTH: "March", MILESTONE_TYPE: "calls", MILESTONE_VALUE: "50",
  BADGE_NAME: "Top Performer", BADGE_ICON: "\ud83c\udfc6", BADGE_DESCRIPTION: "50 appels !",
};

function convert(code) {
  return code
    .replace(/^TR_PRO_/, "transactional-provider-")
    .replace(/^TR_CLI_/, "transactional-client-")
    .replace(/^TR_CHAT_/, "transactional-chatter-")
    .replace(/_([A-Z]{2})$/, " [$1]");
}

async function sendMW(code, label) {
  const name = convert(code);
  const uid = cache.get(name);
  if (!uid) { console.log(`  \u26a0\ufe0f  NOT FOUND: ${name}`); return; }

  const tmpl = await axios.get(`${API}/templates/${uid}`, {
    headers: { "X-MW-PUBLIC-KEY": KEY, "X-MW-CUSTOMER-ID": CID }, timeout: 10000,
  });
  let html = tmpl.data?.data?.record?.content || "";
  if (!html || html.length < 100) { console.log(`  \u274c EMPTY: ${name} (${html.length}b)`); return; }

  for (const [k, v] of Object.entries(fields)) {
    html = html.replace(new RegExp(`\\[${k}\\]`, "g"), v || "");
  }

  const titleM = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const subject = titleM ? titleM[1].trim() : name;
  const bodyB64 = Buffer.from(html).toString("base64");

  const fd = new URLSearchParams();
  fd.append("email[to_email]", EMAIL);
  fd.append("email[to_name]", "Williams");
  fd.append("email[from_email]", "manon@ulixai-expat.com");
  fd.append("email[from_name]", "Manon de SOS Expat");
  fd.append("email[subject]", `[V3-${TS} ${label}] ${subject}`);
  fd.append("email[body]", bodyB64);

  await axios.post(`${API}/transactional-emails`, fd.toString(), {
    headers: { "X-MW-PUBLIC-KEY": KEY, "X-MW-CUSTOMER-ID": CID, "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 15000,
  });
  console.log(`  \u2705 MW ${label}: ${code} (${html.length}b)`);
}

async function sendZoho(label, subject, html) {
  const transporter = nodemailer.createTransport({
    host: "smtp.zoho.eu", port: 465, secure: true,
    auth: { user: EU, pass: EP },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 30000,
  });
  await transporter.sendMail({
    from: `"SOS Expat" <${EU}>`,
    to: EMAIL,
    subject: `[V3-${TS} ${label}] ${subject}`,
    html,
  });
  console.log(`  \u2705 ZOHO ${label}: ${subject.substring(0, 40)}`);
}

async function main() {
  console.log(`\n\u2550 30 EMAILS DE TEST FINAL \u2014 Timestamp: ${TS}`);
  console.log(`\u2550 Cherche dans Gmail: V3-${TS}\n`);

  await loadCache();
  console.log(`\ud83d\udce6 ${cache.size} templates\n`);

  // ── ZOHO (6) ──
  console.log("\u2501 ZOHO SMTP (6 emails) \u2501");
  await sendZoho("Z1", "Retrait \u00e9chou\u00e9 sans DOCTYPE", `<div style="font-family:Arial;max-width:600px;margin:0 auto;padding:20px;"><h2 style="color:#e53e3e;">\u274c Retrait \u00e9chou\u00e9</h2><p>Bonjour Williams,</p><p>Votre retrait de <strong>$50.00</strong> n'a pas pu \u00eatre trait\u00e9.</p><p>M\u00e9thode : PayPal | Raison : Erreur de v\u00e9rification</p><p style="color:#276749;font-weight:bold;">\u2705 Solde restaur\u00e9.</p><p style="color:#999;font-size:12px;">\u2014 L'\u00e9quipe SOS Expat</p></div>`);
  await sendZoho("Z2", "Retrait approuv\u00e9 avec DOCTYPE", `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f9fafb;"><div style="font-family:Arial;max-width:600px;margin:0 auto;padding:20px;"><h2 style="color:#2b6cb0;">\u2705 Retrait approuv\u00e9</h2><p>Bonjour Williams,</p><p>Votre retrait de <strong>$100.00</strong> a \u00e9t\u00e9 approuv\u00e9.</p><table style="width:100%;border-collapse:collapse;margin:16px 0;"><tr><td style="padding:8px;color:#666;">Montant :</td><td style="padding:8px;"><strong>$100.00</strong></td></tr><tr><td style="padding:8px;color:#666;">M\u00e9thode :</td><td style="padding:8px;">PayPal</td></tr></table><a href="https://sos-expat.com/chatter/payments" style="display:inline-block;background:#2b6cb0;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Suivre mon retrait</a><p style="color:#999;font-size:12px;">\u2014 L'\u00e9quipe SOS Expat</p></div></body></html>`);
  await sendZoho("Z3", "Bienvenue + accents \ud83c\udf89", `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><div style="font-family:Arial;max-width:600px;margin:0 auto;padding:20px;"><h2>\ud83c\udf89 Bienvenue Williams !</h2><p>F\u00e9licitations ! Caract\u00e8res : \u00e9\u00e8\u00e0\u00e7\u00f9\u00ea\u00ee\u00f4\u00fb\u00eb\u00ef\u00fc</p><p>Emojis : \ud83c\udf89\u274c\u2705\ud83d\ude80\ud83d\udcb0\u2b50\ud83d\udd11</p><p>$50.00 | \u20ac45.00</p></div></body></html>`);
  await sendZoho("Z4", "Multi-langues AR/RU/HI/ZH", `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><div style="font-family:Arial;max-width:600px;margin:0 auto;padding:20px;"><h2>\ud83c\udf0d Multi-langues</h2><p><b>FR:</b> F\u00e9licitations ! Trait\u00e9 avec succ\u00e8s.</p><p><b>AR:</b> \u062a\u0647\u0627\u0646\u064a\u0646\u0627! \u062a\u0645\u062a \u0645\u0639\u0627\u0644\u062c\u0629 \u0633\u062d\u0628\u0643.</p><p><b>RU:</b> \u041f\u043e\u0437\u0434\u0440\u0430\u0432\u043b\u044f\u0435\u043c!</p><p><b>HI:</b> \u092c\u0927\u093e\u0908 \u0939\u094b!</p><p><b>ZH:</b> \u606d\u559c\uff01</p></div></body></html>`);
  await sendZoho("Z5", "R\u00e9ponse admin inbox", `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><div style="font-family:Arial;max-width:600px;margin:0 auto;padding:20px;"><h2>\ud83d\udce8 R\u00e9ponse \u00e0 votre message</h2><p>Bonjour Williams,</p><div style="background:#f0fdf4;border-left:4px solid #059669;padding:16px;margin:16px 0;"><p>Votre demande a \u00e9t\u00e9 trait\u00e9e. Le probl\u00e8me est r\u00e9solu.</p></div><p>Cordialement, <strong>L'\u00e9quipe SOS Expat</strong></p></div></body></html>`);
  await sendZoho("Z6", "KYC V\u00e9rifi\u00e9 \u2705", `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><div style="font-family:Arial;max-width:600px;margin:0 auto;padding:20px;"><h2 style="color:#059669;">\u2705 KYC V\u00e9rifi\u00e9</h2><p>Bonjour Williams, votre identit\u00e9 a \u00e9t\u00e9 v\u00e9rifi\u00e9e avec succ\u00e8s.</p><a href="https://sos-expat.com/dashboard" style="display:inline-block;background:#059669;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;">Voir mon dashboard</a></div></body></html>`);

  console.log("");

  // ── MAILWIZZ CHATTER (12) ──
  console.log("\u2501 MAILWIZZ CHATTER - templates mis \u00e0 jour (12 emails) \u2501");
  await sendMW("TR_CHAT_first-commission_FR", "C01");
  await sendMW("TR_CHAT_commission-earned_FR", "C02");
  await sendMW("TR_CHAT_recruit-signup_FR", "C03");
  await sendMW("TR_CHAT_withdrawal-requested_FR", "C04");
  await sendMW("TR_CHAT_withdrawal-sent_FR", "C05");
  await sendMW("TR_CHAT_withdrawal-failed_FR", "C06");
  await sendMW("TR_CHAT_milestone_FR", "C07");
  await sendMW("TR_CHAT_telegram-linked_FR", "C08");
  await sendMW("TR_CHAT_threshold-reached_FR", "C09");
  await sendMW("TR_CHAT_welcome_FR", "C10");
  await sendMW("TR_CHAT_trustpilot-invite_FR", "C11");
  await sendMW("TR_CHAT_commission-earned_EN", "C12-EN");

  console.log("");

  // ── MAILWIZZ PROVIDER/CLIENT (12) ──
  console.log("\u2501 MAILWIZZ PROVIDER/CLIENT (12 emails) \u2501");
  await sendMW("TR_PRO_call-completed_FR", "P01");
  await sendMW("TR_PRO_weekly-stats_FR", "P02");
  await sendMW("TR_PRO_milestone_FR", "P03");
  await sendMW("TR_PRO_first-online_FR", "P04");
  await sendMW("TR_PRO_welcome_FR", "P05");
  await sendMW("TR_PRO_trustpilot-outreach_FR", "P06");
  await sendMW("TR_CLI_welcome_FR", "P07");
  await sendMW("TR_CLI_call-completed_FR", "P08");
  await sendMW("TR_CLI_payment-success_FR", "P09");
  await sendMW("TR_CLI_payment-failed_FR", "P10");
  await sendMW("TR_CLI_trustpilot-invite_FR", "P11");
  await sendMW("TR_CLI_thank-you-review_FR", "P12");

  console.log(`\n\u2550 TERMIN\u00c9 ! 30 emails envoy\u00e9s.`);
  console.log(`\u2550 Cherche dans Gmail: V3-${TS}\n`);
}

main().catch((e) => { console.error("FATAL:", e.response?.data || e.message); process.exit(1); });
