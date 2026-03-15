/**
 * Analyse comparative des templates MailWizz
 * Vérifie : design harmonisé, sections présentes, liens, structure HTML
 */

const axios = require("axios");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const MAILWIZZ_API_URL = "https://mail.sos-expat.com/api/index.php";
const MAILWIZZ_CUSTOMER_ID = "1";

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

const templateCache = new Map();

async function refreshCache(apiKey) {
  let page = 1;
  let totalPages = 1;
  do {
    const resp = await axios.get(`${MAILWIZZ_API_URL}/templates?page=${page}&per_page=100`, {
      headers: {
        "X-MW-PUBLIC-KEY": apiKey,
        "X-MW-CUSTOMER-ID": MAILWIZZ_CUSTOMER_ID,
        "User-Agent": "SOS-Analyze/1.0",
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
}

async function fetchTemplate(apiKey, uid) {
  const resp = await axios.get(`${MAILWIZZ_API_URL}/templates/${uid}`, {
    headers: {
      "X-MW-PUBLIC-KEY": apiKey,
      "X-MW-CUSTOMER-ID": MAILWIZZ_CUSTOMER_ID,
    },
    timeout: 10000,
  });
  return resp.data?.data?.record?.content || "";
}

function analyzeHtml(html, name) {
  return {
    name,
    size: html.length,
    hasDoctype: /<!DOCTYPE/i.test(html),
    hasCharset: /<meta[^>]*charset/i.test(html),
    hasViewport: /<meta[^>]*viewport/i.test(html),
    // Design elements
    hasLogo: /logo|sos-expat.*\.(png|jpg|svg)/i.test(html),
    hasFooter: /footer|pied|unsubscribe|d[eé]sabonner/i.test(html),
    hasHeader: /header|en-t[eê]te|banner/i.test(html),
    hasCTA: /<a[^>]*style[^>]*background/i.test(html),
    // Referral section
    hasReferralSection: /GAGNE|lien unique|ton lien|your link|share.*link/i.test(html),
    hasShareButtons: /whatsapp|facebook|twitter/i.test(html),
    hasAffiliateLink: /\[LINK\]|\[AFFILIATE_LINK\]|ref\//i.test(html),
    hasCommissionInfo: /commission|\$5|\$10|par appel|per call/i.test(html),
    hasStats: /304M|197.*pays|expatri/i.test(html),
    // Links
    links: (html.match(/href="([^"]+)"/g) || []).map(m => m.replace(/href="([^"]+)"/, '$1')),
    // Colors used (main brand colors)
    colors: [...new Set((html.match(/#[0-9a-fA-F]{6}/g) || []).map(c => c.toLowerCase()))],
    // Font
    fontFamily: (html.match(/font-family:\s*([^;"]+)/i) || [null, "none"])[1].trim(),
    // Background
    bgColor: (html.match(/background(?:-color)?:\s*(#[0-9a-fA-F]{6})/i) || [null, "none"])[1],
    // Template type
    isChatter: /chatter/i.test(name),
    isProvider: /provider/i.test(name),
    isClient: /client/i.test(name),
  };
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  🔍 ANALYSE DES TEMPLATES MAILWIZZ");
  console.log("═══════════════════════════════════════════════════════════\n");

  const apiKey = getSecret("MAILWIZZ_API_KEY");
  await refreshCache(apiKey);
  console.log(`📦 ${templateCache.size} templates dans le cache\n`);

  // Templates à analyser (FR uniquement pour la comparaison design)
  const templatesToAnalyze = [
    // Provider
    "transactional-provider-call-completed [FR]",
    "transactional-provider-weekly-stats [FR]",
    "transactional-provider-monthly-stats [FR]",
    "transactional-provider-milestone [FR]",
    "transactional-provider-first-online [FR]",
    "transactional-provider-trustpilot-outreach [FR]",
    "transactional-provider-welcome [FR]",
    "transactional-provider-badge-unlocked [FR]",
    "transactional-provider-back-online [FR]",
    // Client
    "transactional-client-welcome [FR]",
    "transactional-client-call-completed [FR]",
    "transactional-client-payment-success [FR]",
    "transactional-client-payment-failed [FR]",
    "transactional-client-trustpilot-invite [FR]",
    "transactional-client-thank-you-review [FR]",
    // Chatter
    "transactional-chatter-welcome [FR]",
    "transactional-chatter-first-commission [FR]",
    "transactional-chatter-commission-earned [FR]",
    "transactional-chatter-recruit-signup [FR]",
    "transactional-chatter-withdrawal-requested [FR]",
    "transactional-chatter-withdrawal-sent [FR]",
    "transactional-chatter-withdrawal-failed [FR]",
    "transactional-chatter-milestone [FR]",
    "transactional-chatter-telegram-linked [FR]",
    "transactional-chatter-threshold-reached [FR]",
    "transactional-chatter-inactivity-reminder [FR]",
    "transactional-chatter-trustpilot-invite [FR]",
  ];

  const results = [];
  const outputDir = path.join(__dirname, "template-analysis");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  for (const name of templatesToAnalyze) {
    const uid = templateCache.get(name);
    if (!uid) {
      console.log(`  ⚠️  NOT FOUND: ${name}`);
      results.push({ name, status: "NOT_FOUND" });
      continue;
    }

    try {
      const html = await fetchTemplate(apiKey, uid);
      const analysis = analyzeHtml(html, name);
      results.push(analysis);

      // Save HTML for manual inspection
      const safeName = name.replace(/[^a-zA-Z0-9-]/g, "_").replace(/__+/g, "_");
      fs.writeFileSync(path.join(outputDir, `${safeName}.html`), html, "utf-8");

      // Console output
      const type = analysis.isChatter ? "CHAT" : analysis.isProvider ? "PRO " : "CLI ";
      const flags = [];
      if (!analysis.hasDoctype) flags.push("❌DOCTYPE");
      if (!analysis.hasCharset) flags.push("❌CHARSET");
      if (!analysis.hasReferralSection) flags.push("❌REFERRAL");
      if (!analysis.hasShareButtons) flags.push("❌SHARE");
      if (!analysis.hasAffiliateLink) flags.push("❌LINK");
      if (!analysis.hasCTA) flags.push("❌CTA");
      if (!analysis.hasFooter) flags.push("❌FOOTER");
      if (!analysis.hasLogo) flags.push("❌LOGO");

      const ok = flags.length === 0 ? "✅ ALL OK" : flags.join(" ");
      console.log(`  [${type}] ${name.replace("transactional-", "").padEnd(45)} ${(analysis.size + " bytes").padEnd(12)} ${ok}`);
    } catch (err) {
      console.log(`  ❌ ERROR: ${name}: ${err.message}`);
      results.push({ name, status: "ERROR", error: err.message });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RÉSUMÉ COMPARATIF
  // ═══════════════════════════════════════════════════════════════════════
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  📊 RÉSUMÉ COMPARATIF");
  console.log("═══════════════════════════════════════════════════════════\n");

  const valid = results.filter(r => r.size);
  const chatter = valid.filter(r => r.isChatter);
  const provider = valid.filter(r => r.isProvider);
  const client = valid.filter(r => r.isClient);

  console.log("  TAILLE (bytes) :");
  if (chatter.length) console.log(`    Chatter:  min=${Math.min(...chatter.map(r=>r.size))} max=${Math.max(...chatter.map(r=>r.size))} avg=${Math.round(chatter.reduce((s,r)=>s+r.size,0)/chatter.length)}`);
  if (provider.length) console.log(`    Provider: min=${Math.min(...provider.map(r=>r.size))} max=${Math.max(...provider.map(r=>r.size))} avg=${Math.round(provider.reduce((s,r)=>s+r.size,0)/provider.length)}`);
  if (client.length) console.log(`    Client:   min=${Math.min(...client.map(r=>r.size))} max=${Math.max(...client.map(r=>r.size))} avg=${Math.round(client.reduce((s,r)=>s+r.size,0)/client.length)}`);

  console.log("\n  SECTIONS PRÉSENTES :");
  const sections = [
    ["DOCTYPE",        r => r.hasDoctype],
    ["Charset",        r => r.hasCharset],
    ["Logo",           r => r.hasLogo],
    ["Footer",         r => r.hasFooter],
    ["CTA Button",     r => r.hasCTA],
    ["Referral §",     r => r.hasReferralSection],
    ["Share buttons",  r => r.hasShareButtons],
    ["Affiliate link", r => r.hasAffiliateLink],
    ["Commission $",   r => r.hasCommissionInfo],
    ["Stats 304M",     r => r.hasStats],
  ];

  for (const [label, test] of sections) {
    const count = valid.filter(test).length;
    const pct = Math.round(count / valid.length * 100);
    const bar = "█".repeat(Math.round(pct / 5)) + "░".repeat(20 - Math.round(pct / 5));
    console.log(`    ${label.padEnd(16)} ${bar} ${count}/${valid.length} (${pct}%)`);
  }

  // Couleurs
  console.log("\n  COULEURS UTILISÉES :");
  const allColors = {};
  valid.forEach(r => (r.colors || []).forEach(c => { allColors[c] = (allColors[c] || 0) + 1; }));
  Object.entries(allColors)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([color, count]) => {
      console.log(`    ${color} → utilisé dans ${count} templates`);
    });

  // Fonts
  console.log("\n  FONTS :");
  const allFonts = {};
  valid.forEach(r => { allFonts[r.fontFamily] = (allFonts[r.fontFamily] || 0) + 1; });
  Object.entries(allFonts).forEach(([font, count]) => {
    console.log(`    "${font}" → ${count} templates`);
  });

  // Links analysis
  console.log("\n  LIENS DANS LES TEMPLATES :");
  const brokenLinks = [];
  valid.forEach(r => {
    (r.links || []).forEach(link => {
      if (link.includes("[") && !link.includes("[UNSUBSCRIBE_TAG")) {
        // Variable link - OK
      } else if (link.startsWith("http") && !link.includes("sos-expat.com") && !link.includes("trustpilot") && !link.includes("whatsapp") && !link.includes("facebook") && !link.includes("twitter") && !link.includes("mailto") && !link.includes("mailwizz")) {
        brokenLinks.push({ template: r.name, link });
      }
    });
  });
  if (brokenLinks.length > 0) {
    console.log(`    ⚠️  ${brokenLinks.length} liens externes/suspects :`);
    brokenLinks.forEach(b => console.log(`      ${b.template}: ${b.link}`));
  } else {
    console.log("    ✅ Tous les liens semblent corrects");
  }

  console.log(`\n  📁 HTML brut sauvegardé dans: ${outputDir}`);
  console.log("     → Ouvre les fichiers .html dans un navigateur pour voir le rendu\n");

  process.exit(0);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
