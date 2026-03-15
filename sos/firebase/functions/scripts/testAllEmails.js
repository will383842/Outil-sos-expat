/**
 * Script complet de test des emails — MailWizz + Zoho SMTP
 *
 * Usage:
 *   node scripts/testAllEmails.js
 *
 * Envoie des emails de test via les deux systèmes pour vérifier:
 *   1. Encodage UTF-8 (accents français, emojis, caractères spéciaux)
 *   2. Rendu HTML (structure, layout, CTA buttons)
 *   3. Variables MailWizz (remplacement correct des [VARIABLE])
 *   4. Zoho SMTP (charset, headers, footer unsubscribe)
 */

const nodemailer = require("nodemailer");
const axios = require("axios");
const { execSync } = require("child_process");

// ── CONFIG ──────────────────────────────────────────────────────────────────
const TEST_EMAIL = "williamsjullin@gmail.com";

const MAILWIZZ_API_URL = "https://mail.sos-expat.com/api/index.php";
const MAILWIZZ_CUSTOMER_ID = "1";

// ── SECRETS (from gcloud) ───────────────────────────────────────────────────
function getSecret(name) {
  if (process.env[name]) return process.env[name];
  try {
    return execSync(
      `gcloud secrets versions access latest --secret=${name} --project=sos-urgently-ac307`,
      { encoding: "utf-8" }
    ).trim();
  } catch {
    console.error(`❌ Cannot get secret: ${name}`);
    process.exit(1);
  }
}

// ── MAILWIZZ ────────────────────────────────────────────────────────────────
const templateCache = new Map();

async function refreshMailwizzCache(apiKey) {
  let page = 1;
  let totalPages = 1;
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
  console.log(`📦 MailWizz cache: ${templateCache.size} templates\n`);
}

function convertTemplateName(code) {
  let name = code;
  name = name.replace(/^TR_PRO_/, "transactional-provider-");
  name = name.replace(/^TR_CLI_/, "transactional-client-");
  name = name.replace(/^TR_CHAT_/, "transactional-chatter-");
  name = name.replace(/_([A-Z]{2})$/, " [$1]");
  return name;
}

async function sendMailwizzTest(apiKey, templateCode, fields, label) {
  const templateName = convertTemplateName(templateCode);

  let uid = templateCache.get(templateName);
  if (!uid) {
    const enName = templateName.replace(/\s\[[A-Z]{2}\]$/, " [EN]");
    uid = templateCache.get(enName);
    if (uid) console.log(`    ⚠️  Fallback EN: ${enName}`);
  }
  if (!uid) {
    return { status: "TEMPLATE_NOT_FOUND", templateName };
  }

  // Fetch template HTML
  const tmplResp = await axios.get(`${MAILWIZZ_API_URL}/templates/${uid}`, {
    headers: { "X-MW-PUBLIC-KEY": apiKey, "X-MW-CUSTOMER-ID": MAILWIZZ_CUSTOMER_ID },
    timeout: 10000,
  });

  let html = tmplResp.data?.data?.record?.content || "";
  if (!html) return { status: "EMPTY_TEMPLATE" };

  // Log template size and charset detection
  const hasCharset = /<meta[^>]*charset[^>]*>/i.test(html);
  const hasDoctype = /<!DOCTYPE/i.test(html);

  // Replace variables
  let unreplacedVars = [];
  for (const [key, value] of Object.entries(fields)) {
    html = html.replace(new RegExp(`\\[${key}\\]`, "g"), value || "");
  }

  // Detect remaining unreplaced [VARIABLES]
  const remaining = html.match(/\[[A-Z_]+\]/g) || [];
  unreplacedVars = [...new Set(remaining)];

  // Extract subject
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const subject = titleMatch ? titleMatch[1].trim() : templateName;

  // Send
  const formData = new URLSearchParams();
  formData.append("email[to_email]", TEST_EMAIL);
  formData.append("email[to_name]", fields.FNAME || "Test");
  formData.append("email[from_email]", "manon@ulixai-expat.com");
  formData.append("email[from_name]", "Manon de SOS Expat");
  formData.append("email[subject]", `[TEST ${label}] ${subject}`);
  formData.append("email[body]", Buffer.from(html).toString("base64"));

  const resp = await axios.post(`${MAILWIZZ_API_URL}/transactional-emails`, formData.toString(), {
    headers: {
      "X-MW-PUBLIC-KEY": apiKey,
      "X-MW-CUSTOMER-ID": MAILWIZZ_CUSTOMER_ID,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    timeout: 15000,
  });

  return {
    status: "SENT",
    subject,
    hasDoctype,
    hasCharset,
    unreplacedVars,
    htmlSize: html.length,
    response: resp.data?.status,
  };
}

// ── ZOHO SMTP ───────────────────────────────────────────────────────────────

async function sendZohoTest(emailUser, emailPass, testName, subject, html) {
  const transporter = nodemailer.createTransport({
    host: "smtp.zoho.eu",
    port: 465,
    secure: true,
    auth: { user: emailUser, pass: emailPass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 30000,
  });

  const info = await transporter.sendMail({
    from: `"SOS Expat Test" <${emailUser}>`,
    to: TEST_EMAIL,
    subject: `[TEST ZOHO ${testName}] ${subject}`,
    html,
  });

  return { status: "SENT", messageId: info.messageId };
}

// ── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  🧪 TEST COMPLET DES EMAILS — MailWizz + Zoho SMTP");
  console.log(`  📧 Destination: ${TEST_EMAIL}`);
  console.log("═══════════════════════════════════════════════════════════\n");

  const MAILWIZZ_API_KEY = getSecret("MAILWIZZ_API_KEY");
  const EMAIL_USER = getSecret("EMAIL_USER");
  const EMAIL_PASS = getSecret("EMAIL_PASS");

  // ════════════════════════════════════════════════════════════════════════
  // PARTIE 1: ZOHO SMTP — Tests d'encodage
  // ════════════════════════════════════════════════════════════════════════
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  PARTIE 1: ZOHO SMTP — Tests d'encodage");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Test Z1: Email SANS DOCTYPE ni charset (reproduit le bug actuel)
  try {
    process.stdout.write("  Z1. SANS DOCTYPE (bug actuel)... ");
    const result = await sendZohoTest(EMAIL_USER, EMAIL_PASS, "Z1-SANS-DOCTYPE",
      "Test accents sans DOCTYPE — éàçü ❌🎉",
      `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #e53e3e;">❌ Test encodage SANS DOCTYPE</h2>
        <p>Bonjour <strong>Williams</strong>,</p>
        <p>Ceci est un test d'encodage <strong>SANS</strong> &lt;!DOCTYPE html&gt; ni &lt;meta charset&gt;.</p>
        <p>Caractères spéciaux français : <strong>é è à ç ù ê î ô û ë ï ü</strong></p>
        <p>Emojis : 🎉 ❌ ✅ 🚀 💰 ⭐ 🔑 📧</p>
        <p>Monnaie : <strong>$50.00</strong> | <strong>€45.00</strong></p>
        <p>Phrases avec accents :</p>
        <ul>
          <li>Votre retrait a été <strong>traité</strong> avec succès</li>
          <li>Réinitialisation de votre mot de passe sécurisé</li>
          <li>Félicitations pour votre première commission !</li>
          <li>Méthode de paiement vérifiée — crédité immédiatement</li>
        </ul>
        <p style="color: #999; font-size: 12px;">— L'équipe SOS Expat</p>
      </div>`
    );
    console.log(`✅ ${result.status} (${result.messageId})`);
  } catch (err) {
    console.log(`❌ ${err.message}`);
  }

  // Test Z2: Email AVEC DOCTYPE et charset (fix proposé)
  try {
    process.stdout.write("  Z2. AVEC DOCTYPE + charset (fix)... ");
    const result = await sendZohoTest(EMAIL_USER, EMAIL_PASS, "Z2-AVEC-DOCTYPE",
      "Test accents AVEC DOCTYPE — éàçü ✅🎉",
      `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test encodage AVEC DOCTYPE</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;">
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #276749;">✅ Test encodage AVEC DOCTYPE</h2>
    <p>Bonjour <strong>Williams</strong>,</p>
    <p>Ceci est un test d'encodage <strong>AVEC</strong> &lt;!DOCTYPE html&gt; et &lt;meta charset=UTF-8&gt;.</p>
    <p>Caractères spéciaux français : <strong>é è à ç ù ê î ô û ë ï ü</strong></p>
    <p>Emojis : 🎉 ❌ ✅ 🚀 💰 ⭐ 🔑 📧</p>
    <p>Monnaie : <strong>$50.00</strong> | <strong>€45.00</strong></p>
    <p>Phrases avec accents :</p>
    <ul>
      <li>Votre retrait a été <strong>traité</strong> avec succès</li>
      <li>Réinitialisation de votre mot de passe sécurisé</li>
      <li>Félicitations pour votre première commission !</li>
      <li>Méthode de paiement vérifiée — crédité immédiatement</li>
    </ul>
    <p>
      <a href="https://sos-expat.com/dashboard"
         style="display:inline-block;background:#276749;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
        Voir mon tableau de bord
      </a>
    </p>
    <p style="color: #999; font-size: 12px;">— L'équipe SOS Expat</p>
  </div>
</body>
</html>`
    );
    console.log(`✅ ${result.status} (${result.messageId})`);
  } catch (err) {
    console.log(`❌ ${err.message}`);
  }

  // Test Z3: Email type "retrait échoué" (reproduit le vrai email)
  try {
    process.stdout.write("  Z3. Retrait échoué (vrai template)... ");
    const result = await sendZohoTest(EMAIL_USER, EMAIL_PASS, "Z3-RETRAIT",
      "Votre retrait de $50.00 n'a pas pu être traité",
      `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #e53e3e;">❌ Retrait échoué</h2>
        <p>Bonjour Williams,</p>
        <p>Malheureusement, votre retrait de <strong>$50.00</strong> n'a pas pu être traité.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; color: #666;">Montant :</td><td style="padding: 8px;"><strong>$50.00</strong></td></tr>
          <tr><td style="padding: 8px; color: #666;">Méthode :</td><td style="padding: 8px;">PayPal</td></tr>
          <tr><td style="padding: 8px; color: #666;">Raison :</td><td style="padding: 8px; color: #e53e3e;">Erreur de vérification</td></tr>
        </table>
        <p style="color: #276749; font-weight: bold;">✅ Votre solde a été restauré automatiquement.</p>
        <p>
          <a href="https://sos-expat.com/chatter/payments"
             style="display: inline-block; background: #e53e3e; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Réessayer le retrait
          </a>
        </p>
        <p>Si le problème persiste, contactez notre support.</p>
        <p style="color: #999; font-size: 12px;">— L'équipe SOS Expat</p>
      </div>`
    );
    console.log(`✅ ${result.status} (${result.messageId})`);
  } catch (err) {
    console.log(`❌ ${err.message}`);
  }

  // Test Z4: Langues non-latines (Arabe, Russe, Hindi, Chinois)
  try {
    process.stdout.write("  Z4. Multi-langues (AR/RU/HI/ZH)... ");
    const result = await sendZohoTest(EMAIL_USER, EMAIL_PASS, "Z4-MULTILANG",
      "Test multi-langues — العربية Русский हिन्दी 中文",
      `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;">
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2>🌍 Test multi-langues</h2>
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:8px;font-weight:bold;">Français :</td><td style="padding:8px;">Félicitations ! Votre retrait a été traité avec succès.</td></tr>
      <tr><td style="padding:8px;font-weight:bold;">العربية :</td><td style="padding:8px;direction:rtl;text-align:right;">تهانينا! تمت معالجة سحبك بنجاح.</td></tr>
      <tr><td style="padding:8px;font-weight:bold;">Русский :</td><td style="padding:8px;">Поздравляем! Ваш вывод был успешно обработан.</td></tr>
      <tr><td style="padding:8px;font-weight:bold;">हिन्दी :</td><td style="padding:8px;">बधाई हो! आपकी निकासी सफलतापूर्वक संसाधित हो गई है।</td></tr>
      <tr><td style="padding:8px;font-weight:bold;">中文 :</td><td style="padding:8px;">恭喜！您的提款已成功处理。</td></tr>
      <tr><td style="padding:8px;font-weight:bold;">Deutsch :</td><td style="padding:8px;">Herzlichen Glückwunsch! Ihre Auszahlung wurde erfolgreich verarbeitet.</td></tr>
      <tr><td style="padding:8px;font-weight:bold;">Português :</td><td style="padding:8px;">Parabéns! O seu saque foi processado com sucesso.</td></tr>
    </table>
  </div>
</body>
</html>`
    );
    console.log(`✅ ${result.status} (${result.messageId})`);
  } catch (err) {
    console.log(`❌ ${err.message}`);
  }

  // ════════════════════════════════════════════════════════════════════════
  // PARTIE 2: MAILWIZZ — Tests de templates transactionnels
  // ════════════════════════════════════════════════════════════════════════
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  PARTIE 2: MAILWIZZ — Tests de templates transactionnels");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  await refreshMailwizzCache(MAILWIZZ_API_KEY);

  // Fields communs (simule l'ANCIEN comportement: juste FNAME)
  const minimalFields = {
    EMAIL: TEST_EMAIL,
    FNAME: "Williams",
  };

  // Fields complets (simule le NOUVEAU comportement: 60+ champs)
  const fullProviderFields = {
    EMAIL: TEST_EMAIL,
    FNAME: "Williams",
    LNAME: "Test Provider",
    ROLE: "lawyer",
    PAYMENT_METHOD: "stripe",
    ACTIVITY_STATUS: "active",
    KYC_STATUS: "kyc_verified",
    PAYPAL_STATUS: "paypal_ok",
    IS_ONLINE: "online",
    ACCOUNT_STATUS: "normal",
    LANGUAGE: "fr",
    PROFILE_STATUS: "profile_complete",
    VIP_STATUS: "no",
    IS_BLOCKED: "no",
    PAYMENT_TYPE: "stripe",
    PROVIDER_TYPE: "lawyer",
    PHONE: "+33612345678",
    COUNTRY: "France",
    ROLE_NAME: "lawyer",
    PROFILE_COMPLETION: "100%",
    CREATED_AT: "2025-06-15T10:00:00.000Z",
    LAST_LOGIN: "2026-03-14T08:30:00.000Z",
    LAST_ACTIVITY: "2026-03-14T08:30:00.000Z",
    AFFILIATE_LINK: "https://sos-expat.com/ref/testUser123",
    PROFILE_URL: "https://sos-expat.com/profile/edit",
    DASHBOARD_URL: "https://sos-expat.com/dashboard",
    TRUSTPILOT_URL: "https://www.trustpilot.com/review/sos-expat.com",
    HELP_URL: "https://sos-expat.com/centre-aide",
    ARTICLE_URL: "https://sos-expat.com/centre-aide",
    KYC_URL: "https://sos-expat.com/dashboard/kyc",
    INVOICE_URL: "https://sos-expat.com/dashboard",
    RETRY_URL: "https://sos-expat.com/dashboard",
    SUPPORT_URL: "https://sos-expat.com/contact",
    UNSUBSCRIBE_URL: "https://sos-expat.com/contact",
    TOTAL_CALLS: "42",
    TOTAL_EARNINGS: "126000",
    AVG_RATING: "4.8",
    MISSED_CALLS: "2",
    WEEKLY_CALLS: "7",
    WEEKLY_EARNINGS: "21000",
    MONTHLY_CALLS: "28",
    MONTHLY_EARNINGS: "84000",
    RATING_STARS: "5",
    STARS: "5",
    THRESHOLD: "50",
    NB_CALLS: "42",
    TOTAL_CLIENTS: "35",
    ONLINE_HOURS: "120",
    CALLS_TREND: "+15%",
    EARNINGS_TREND: "+20%",
    AVG_DURATION: "12",
    MONTH: "March",
    EXPERT_NAME: "Williams Test",
    CLIENT_NAME: "Jean-François Müller",
    AMOUNT: "4500",
    DURATION: "15",
    RATING: "5",
    COMMENT: "Très bon service, merci !",
    REASON: "",
    SERVICE: "Consultation juridique",
    CATEGORY: "Immigration",
    CURRENCY: "EUR",
    REVIEW_TEXT: "Excellent ! Très professionnel et à l'écoute.",
    YEARS: "1",
    STRIPE_ACCOUNT_ID: "",
    PAYPAL_EMAIL: "",
    MILESTONE_TYPE: "",
    MILESTONE_VALUE: "",
    BADGE_NAME: "",
    BADGE_ICON: "",
    BADGE_DESCRIPTION: "",
    REFERRAL_NAME: "",
    BONUS_AMOUNT: "",
    POTENTIAL_EARNINGS: "0",
    COMMISSION_REFERRAL: "$5",
    AVG_EARNING_PER_CALL: "$30",
  };

  const fullChatterFields = {
    EMAIL: TEST_EMAIL,
    FNAME: "Williams",
    LNAME: "Test Chatter",
    LINK: "https://sos-expat.com/ref/testChatter123",
    DASHBOARD_URL: "https://sos-expat.com/chatter/tableau-de-bord",
    QR_CODE_URL: "https://sos-expat.com/ref/testChatter123",
    COMMISSION_CLIENT_LAWYER: "$10",
    COMMISSION_CLIENT_EXPAT: "$3",
    COMMISSION_N1: "$1",
    COMMISSION_N2: "$0.50",
    COMMISSION_PROVIDER: "$5",
    AVAILABLE_BALANCE: "$125.50",
    TOTAL_EARNED: "$450",
    MONTHLY_EARNINGS: "$75",
    TEAM_SIZE: "8",
    RANK: "12",
    LEVEL_NAME: "Silver",
    CURRENT_STREAK: "5",
    LAST_COMMISSION_AMOUNT: "$10",
    LAST_COMMISSION_TYPE: "client_lawyer",
    NEW_RECRUIT_NAME: "Marie Dupont",
    WITHDRAWAL_AMOUNT: "$100",
    WITHDRAWAL_FEE: "$3",
    WITHDRAWAL_THRESHOLD: "$30",
    DAYS_SINCE_REGISTRATION: "45",
    AVG_EARNINGS_PER_DAY: "$10",
    PROJECTED_3_RECRUITS: "$15",
    PROJECTED_10_RECRUITS: "$50",
    INACTIVE_RECRUIT_NAME: "",
    INACTIVE_RECRUIT_DAYS: "",
    UNSUBSCRIBE_URL: "https://sos-expat.com/contact",
    TRUSTPILOT_URL: "https://www.trustpilot.com/review/sos-expat.com",
    COUNTRY: "France",
    LANGUAGE: "fr",
  };

  // Templates MailWizz à tester
  const mailwizzTests = [
    // ── Provider templates (FR) ──
    { code: "TR_PRO_call-completed_FR",       fields: fullProviderFields, label: "M1" },
    { code: "TR_PRO_weekly-stats_FR",          fields: fullProviderFields, label: "M2" },
    { code: "TR_PRO_monthly-stats_FR",         fields: fullProviderFields, label: "M3" },
    { code: "TR_PRO_milestone_FR",             fields: { ...fullProviderFields, MILESTONE_TYPE: "calls", MILESTONE_VALUE: "50" }, label: "M4" },
    { code: "TR_PRO_first-online_FR",          fields: fullProviderFields, label: "M5" },
    { code: "TR_PRO_trustpilot-outreach_FR",   fields: fullProviderFields, label: "M6" },
    // ── Client templates (FR) ──
    { code: "TR_CLI_welcome_FR",               fields: fullProviderFields, label: "M7" },
    { code: "TR_CLI_call-completed_FR",        fields: fullProviderFields, label: "M8" },
    { code: "TR_CLI_payment-success_FR",       fields: { ...fullProviderFields, AMOUNT: "4500", CURRENCY: "EUR" }, label: "M9" },
    { code: "TR_CLI_payment-failed_FR",        fields: { ...fullProviderFields, REASON: "Carte expirée" }, label: "M10" },
    { code: "TR_CLI_trustpilot-invite_FR",     fields: fullProviderFields, label: "M11" },
    { code: "TR_CLI_thank-you-review_FR",      fields: fullProviderFields, label: "M12" },
    // ── Chatter templates (FR) ──
    { code: "TR_CHAT_welcome_FR",              fields: fullChatterFields, label: "M13" },
    { code: "TR_CHAT_first-commission_FR",     fields: fullChatterFields, label: "M14" },
    { code: "TR_CHAT_commission-earned_FR",    fields: fullChatterFields, label: "M15" },
    { code: "TR_CHAT_recruit-signup_FR",       fields: fullChatterFields, label: "M16" },
    { code: "TR_CHAT_withdrawal-requested_FR", fields: fullChatterFields, label: "M17" },
    { code: "TR_CHAT_withdrawal-sent_FR",      fields: fullChatterFields, label: "M18" },
    { code: "TR_CHAT_withdrawal-failed_FR",    fields: fullChatterFields, label: "M19" },
    { code: "TR_CHAT_milestone_FR",            fields: fullChatterFields, label: "M20" },
    { code: "TR_CHAT_telegram-linked_FR",      fields: fullChatterFields, label: "M21" },
    { code: "TR_CHAT_threshold-reached_FR",    fields: fullChatterFields, label: "M22" },
    { code: "TR_CHAT_inactivity-reminder_FR",  fields: fullChatterFields, label: "M23" },
    { code: "TR_CHAT_trustpilot-invite_FR",    fields: fullChatterFields, label: "M24" },
    // ── Provider templates (EN) — spot check ──
    { code: "TR_PRO_call-completed_EN",        fields: fullProviderFields, label: "M25" },
    { code: "TR_CHAT_welcome_EN",              fields: fullChatterFields, label: "M26" },
  ];

  const results = [];
  for (const test of mailwizzTests) {
    process.stdout.write(`  ${test.label}. ${test.code}... `);
    try {
      const result = await sendMailwizzTest(MAILWIZZ_API_KEY, test.code, test.fields, test.label);
      if (result.status === "SENT") {
        let warnings = [];
        if (!result.hasDoctype) warnings.push("NO DOCTYPE");
        if (!result.hasCharset) warnings.push("NO CHARSET");
        if (result.unreplacedVars.length > 0) warnings.push(`UNREPLACED: ${result.unreplacedVars.join(", ")}`);

        const warnStr = warnings.length > 0 ? ` ⚠️  ${warnings.join(" | ")}` : "";
        console.log(`✅ SENT (${result.htmlSize} bytes)${warnStr}`);
      } else {
        console.log(`⚠️  ${result.status} (${result.templateName || ""})`);
      }
      results.push({ code: test.code, label: test.label, ...result });
    } catch (err) {
      console.log(`❌ ERROR: ${err.message}`);
      results.push({ code: test.code, label: test.label, status: "ERROR", error: err.message });
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // RÉSUMÉ
  // ════════════════════════════════════════════════════════════════════════
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  📊 RÉSUMÉ");
  console.log("═══════════════════════════════════════════════════════════\n");

  const sent = results.filter(r => r.status === "SENT").length;
  const notFound = results.filter(r => r.status === "TEMPLATE_NOT_FOUND").length;
  const errors = results.filter(r => r.status === "ERROR").length;
  const noDoctype = results.filter(r => r.status === "SENT" && !r.hasDoctype).length;
  const noCharset = results.filter(r => r.status === "SENT" && !r.hasCharset).length;
  const withUnreplaced = results.filter(r => r.status === "SENT" && r.unreplacedVars?.length > 0);

  console.log(`  MailWizz: ✅ ${sent} envoyés | ⚠️  ${notFound} templates manquants | ❌ ${errors} erreurs`);
  console.log(`  Zoho:     4 emails de test envoyés\n`);

  if (noDoctype > 0) {
    console.log(`  🔴 ${noDoctype} templates MailWizz SANS <!DOCTYPE> :`);
    results.filter(r => r.status === "SENT" && !r.hasDoctype).forEach(r => {
      console.log(`     - ${r.code}`);
    });
    console.log();
  }

  if (noCharset > 0) {
    console.log(`  🔴 ${noCharset} templates MailWizz SANS <meta charset> :`);
    results.filter(r => r.status === "SENT" && !r.hasCharset).forEach(r => {
      console.log(`     - ${r.code}`);
    });
    console.log();
  }

  if (withUnreplaced.length > 0) {
    console.log(`  🟡 ${withUnreplaced.length} templates avec variables non remplacées :`);
    withUnreplaced.forEach(r => {
      console.log(`     - ${r.code}: ${r.unreplacedVars.join(", ")}`);
    });
    console.log();
  }

  if (notFound > 0) {
    console.log(`  📝 Templates à créer dans MailWizz :`);
    results.filter(r => r.status === "TEMPLATE_NOT_FOUND").forEach(r => {
      console.log(`     - ${r.templateName || r.code}`);
    });
    console.log();
  }

  console.log(`  📧 Vérifie ta boîte ${TEST_EMAIL} pour comparer les rendus !`);
  console.log(`     → Zoho Z1 (sans DOCTYPE) vs Z2 (avec DOCTYPE) → vois-tu une différence ?`);
  console.log(`     → MailWizz M1-M26 → repère ceux avec un rendu cassé`);
  console.log();

  process.exit(0);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
