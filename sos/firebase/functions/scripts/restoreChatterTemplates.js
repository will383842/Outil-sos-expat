/**
 * Phase 1: Restaure les templates FR depuis les backups locaux
 * Phase 2: Reconstruit les templates autres langues depuis FR + traductions
 *
 * IMPORTANT: template[content] DOIT être en base64
 *
 * Usage:
 *   node scripts/restoreChatterTemplates.js              # dry-run
 *   node scripts/restoreChatterTemplates.js --apply       # applique
 */

const axios = require("axios");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const API = "https://mail.sos-expat.com/api/index.php";
const CID = "1";
const DRY = !process.argv.includes("--apply");
const DELAY = 500;

function getSecret(n) {
  if (process.env[n]) return process.env[n];
  return execSync(`gcloud secrets versions access latest --secret=${n} --project=sos-urgently-ac307`, { encoding: "utf-8" }).trim();
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Template cache ──────────────────────────────────────────────────────────
const cache = new Map();

async function loadCache(key) {
  let p = 1, tp = 1;
  do {
    const r = await axios.get(`${API}/templates?page=${p}&per_page=100`, {
      headers: { "X-MW-PUBLIC-KEY": key, "X-MW-CUSTOMER-ID": CID }, timeout: 15000,
    });
    for (const t of (r.data?.data?.records || [])) cache.set(t.name, t.template_uid);
    tp = r.data?.data?.total_pages || 1;
    p++;
  } while (p <= tp);
}

async function putTemplate(key, uid, name, html) {
  const fd = new URLSearchParams();
  fd.append("template[name]", name);
  fd.append("template[content]", Buffer.from(html).toString("base64"));
  await axios.put(`${API}/templates/${uid}`, fd.toString(), {
    headers: { "X-MW-PUBLIC-KEY": key, "X-MW-CUSTOMER-ID": CID, "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 15000,
  });
}

async function getTemplateSize(key, uid) {
  const r = await axios.get(`${API}/templates/${uid}`, {
    headers: { "X-MW-PUBLIC-KEY": key, "X-MW-CUSTOMER-ID": CID }, timeout: 10000,
  });
  return (r.data?.data?.record?.content || "").length;
}

// ── Translations per slug ───────────────────────────────────────────────────
// Each slug has: title, preheader, bodyLines[], detailLabels{}, ctaText
const T = {
  "first-commission": {
    FR: { title: "Premi\u00e8re commission !", preheader: "\ud83d\udcb0 [FNAME], ta premi\u00e8re commission de [LAST_COMMISSION_AMOUNT] vient d'etre creditee !", h1: "\ud83d\udcb0 Premi\u00e8re commission !", body: "[FNAME], f\u00e9licitations ! Ta toute premi\u00e8re commission vient d'etre ajoutee a ton solde !", body2: "C'est le debut d'une belle aventure. Continue a partager ton lien pour generer encore plus de commissions !", cta: "Voir mon dashboard", labels: { amount: "Montant", type: "Type" } },
    EN: { title: "First commission!", preheader: "\ud83d\udcb0 [FNAME], your first commission of [LAST_COMMISSION_AMOUNT] has been credited!", h1: "\ud83d\udcb0 First commission!", body: "[FNAME], congratulations! Your very first commission has been added to your balance!", body2: "This is the beginning of a great adventure. Keep sharing your link to generate more commissions!", cta: "See my dashboard", labels: { amount: "Amount", type: "Type" } },
    ES: { title: "\u00a1Primera comisi\u00f3n!", preheader: "\ud83d\udcb0 [FNAME], tu primera comisi\u00f3n de [LAST_COMMISSION_AMOUNT] ha sido acreditada!", h1: "\ud83d\udcb0 \u00a1Primera comisi\u00f3n!", body: "[FNAME], \u00a1felicidades! Tu primera comisi\u00f3n ha sido a\u00f1adida a tu saldo!", body2: "\u00a1Este es el inicio de una gran aventura! Sigue compartiendo tu enlace para generar m\u00e1s comisiones.", cta: "Ver mi dashboard", labels: { amount: "Monto", type: "Tipo" } },
    DE: { title: "Erste Provision!", preheader: "\ud83d\udcb0 [FNAME], deine erste Provision von [LAST_COMMISSION_AMOUNT] wurde gutgeschrieben!", h1: "\ud83d\udcb0 Erste Provision!", body: "[FNAME], herzlichen Gl\u00fcckwunsch! Deine allererste Provision wurde deinem Guthaben hinzugef\u00fcgt!", body2: "Das ist der Beginn eines gro\u00dfen Abenteuers. Teile weiter deinen Link!", cta: "Mein Dashboard", labels: { amount: "Betrag", type: "Typ" } },
    PT: { title: "Primeira comiss\u00e3o!", preheader: "\ud83d\udcb0 [FNAME], sua primeira comiss\u00e3o de [LAST_COMMISSION_AMOUNT] foi creditada!", h1: "\ud83d\udcb0 Primeira comiss\u00e3o!", body: "[FNAME], parab\u00e9ns! Sua primeira comiss\u00e3o foi adicionada ao seu saldo!", body2: "Este \u00e9 o in\u00edcio de uma grande aventura. Continue compartilhando seu link!", cta: "Ver meu painel", labels: { amount: "Montante", type: "Tipo" } },
    RU: { title: "\u041f\u0435\u0440\u0432\u0430\u044f \u043a\u043e\u043c\u0438\u0441\u0441\u0438\u044f!", preheader: "\ud83d\udcb0 [FNAME], \u0432\u0430\u0448\u0430 \u043f\u0435\u0440\u0432\u0430\u044f \u043a\u043e\u043c\u0438\u0441\u0441\u0438\u044f [LAST_COMMISSION_AMOUNT] \u0437\u0430\u0447\u0438\u0441\u043b\u0435\u043d\u0430!", h1: "\ud83d\udcb0 \u041f\u0435\u0440\u0432\u0430\u044f \u043a\u043e\u043c\u0438\u0441\u0441\u0438\u044f!", body: "[FNAME], \u043f\u043e\u0437\u0434\u0440\u0430\u0432\u043b\u044f\u0435\u043c! \u0412\u0430\u0448\u0430 \u043f\u0435\u0440\u0432\u0430\u044f \u043a\u043e\u043c\u0438\u0441\u0441\u0438\u044f \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u0430!", body2: "\u041f\u0440\u043e\u0434\u043e\u043b\u0436\u0430\u0439\u0442\u0435 \u0434\u0435\u043b\u0438\u0442\u044c\u0441\u044f \u0441\u0441\u044b\u043b\u043a\u043e\u0439!", cta: "\u041c\u043e\u0439 \u0434\u0430\u0448\u0431\u043e\u0440\u0434", labels: { amount: "\u0421\u0443\u043c\u043c\u0430", type: "\u0422\u0438\u043f" } },
    AR: { title: "\u0639\u0645\u0648\u0644\u0629 \u0623\u0648\u0644\u0649!", preheader: "\ud83d\udcb0 [FNAME] \u062a\u0645 \u0625\u0636\u0627\u0641\u0629 \u0639\u0645\u0648\u0644\u062a\u0643 \u0627\u0644\u0623\u0648\u0644\u0649 [LAST_COMMISSION_AMOUNT]!", h1: "\ud83d\udcb0 \u0639\u0645\u0648\u0644\u0629 \u0623\u0648\u0644\u0649!", body: "[FNAME]\u060c \u062a\u0647\u0627\u0646\u064a\u0646\u0627! \u062a\u0645 \u0625\u0636\u0627\u0641\u0629 \u0639\u0645\u0648\u0644\u062a\u0643 \u0627\u0644\u0623\u0648\u0644\u0649 \u0625\u0644\u0649 \u0631\u0635\u064a\u062f\u0643!", body2: "\u0627\u0633\u062a\u0645\u0631 \u0641\u064a \u0645\u0634\u0627\u0631\u0643\u0629 \u0631\u0627\u0628\u0637\u0643!", cta: "\u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645", labels: { amount: "\u0627\u0644\u0645\u0628\u0644\u063a", type: "\u0627\u0644\u0646\u0648\u0639" } },
    HI: { title: "\u092a\u0939\u0932\u093e \u0915\u092e\u0940\u0936\u0928!", preheader: "\ud83d\udcb0 [FNAME] \u0906\u092a\u0915\u093e \u092a\u0939\u0932\u093e \u0915\u092e\u0940\u0936\u0928 [LAST_COMMISSION_AMOUNT] \u091c\u092e\u093e \u0939\u094b \u0917\u092f\u093e!", h1: "\ud83d\udcb0 \u092a\u0939\u0932\u093e \u0915\u092e\u0940\u0936\u0928!", body: "[FNAME], \u092c\u0927\u093e\u0908! \u0906\u092a\u0915\u093e \u092a\u0939\u0932\u093e \u0915\u092e\u0940\u0936\u0928 \u0906\u092a\u0915\u0947 \u0936\u0947\u0937 \u092e\u0947\u0902 \u091c\u094b\u0921\u093c\u093e \u0917\u092f\u093e!", body2: "\u0905\u092a\u0928\u093e \u0932\u093f\u0902\u0915 \u0938\u093e\u091d\u093e \u0915\u0930\u0924\u0947 \u0930\u0939\u0947\u0902!", cta: "\u092e\u0947\u0930\u093e \u0921\u0948\u0936\u092c\u094b\u0930\u094d\u0921", labels: { amount: "\u0930\u093e\u0936\u093f", type: "\u092a\u094d\u0930\u0915\u093e\u0930" } },
    ZH: { title: "\u7b2c\u4e00\u7b14\u4f63\u91d1\uff01", preheader: "\ud83d\udcb0 [FNAME] \u60a8\u7684\u7b2c\u4e00\u7b14\u4f63\u91d1 [LAST_COMMISSION_AMOUNT] \u5df2\u5165\u8d26\uff01", h1: "\ud83d\udcb0 \u7b2c\u4e00\u7b14\u4f63\u91d1\uff01", body: "[FNAME]\uff0c\u606d\u559c\uff01\u60a8\u7684\u7b2c\u4e00\u7b14\u4f63\u91d1\u5df2\u6dfb\u52a0\u5230\u60a8\u7684\u4f59\u989d\uff01", body2: "\u7ee7\u7eed\u5206\u4eab\u60a8\u7684\u94fe\u63a5\uff01", cta: "\u6211\u7684\u4eea\u8868\u677f", labels: { amount: "\u91d1\u989d", type: "\u7c7b\u578b" } },
  },
};

// ── Generate HTML from a slug's FR backup, adapting text for target language ──
function adaptFrTemplate(frHtml, slug, lang, texts) {
  if (lang === "FR") return frHtml;

  const frTexts = T[slug]?.FR;
  if (!frTexts || !texts) return frHtml; // fallback: use FR as-is

  let html = frHtml;
  // Replace lang attribute
  html = html.replace(/lang="fr"/i, `lang="${lang.toLowerCase()}"`);
  // Replace <title>
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${texts.title}</title>`);
  // Replace preheader
  const preheaderRe = /(<div style="display:none[^>]*>)[^<]*(&nbsp;)/i;
  html = html.replace(preheaderRe, `$1${texts.preheader}$2`);
  // Replace h1
  html = html.replace(/<h1[^>]*>[^<]*<\/h1>/i, (match) => match.replace(/>.*</, `>${texts.h1}<`));
  // Replace first body paragraph (after h1)
  const bodyParaRe = /(<p style="color:#4B5563;font-size:15px;line-height:1\.7;margin-bottom:20px;">)[^<]*/;
  html = html.replace(bodyParaRe, `$1${texts.body}`);
  // Replace second body paragraph (before CTA)
  if (texts.body2) {
    // Find second paragraph with same style
    let count = 0;
    html = html.replace(/(<p style="color:#4B5563;font-size:15px;line-height:1\.7;margin-bottom:20px;">)([^<]*)/g, (match, p1, p2) => {
      count++;
      if (count === 2) return `${p1}${texts.body2}`;
      return match;
    });
  }
  // Replace CTA button text
  if (texts.cta) {
    html = html.replace(/(style="[^"]*background-color:#059669[^"]*">)[^<]*/i, `$1${texts.cta}`);
  }
  // Replace detail labels
  if (texts.labels) {
    if (texts.labels.amount) {
      html = html.replace(/Montant\s*:/g, `${texts.labels.amount} :`);
    }
    if (texts.labels.type) {
      html = html.replace(/Type\s*:/g, `${texts.labels.type} :`);
    }
  }
  // Replace footer
  html = html.replace(/Se desabonner|Se d\u00e9sabonner|Se d\u00e9sinscrire/g, getUnsubLabel(lang));

  return html;
}

function getUnsubLabel(lang) {
  const labels = { FR:"Se d\u00e9sinscrire", EN:"Unsubscribe", ES:"Darse de baja", DE:"Abmelden", PT:"Cancelar inscri\u00e7\u00e3o", RU:"\u041e\u0442\u043f\u0438\u0441\u0430\u0442\u044c\u0441\u044f", AR:"\u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643", HI:"\u0938\u0926\u0938\u094d\u092f\u0924\u093e \u0930\u0926\u094d\u0926 \u0915\u0930\u0947\u0902", ZH:"\u53d6\u6d88\u8ba2\u9605" };
  return labels[lang] || labels.EN;
}

// ── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  🔧 RESTAURATION TEMPLATES CHATTER");
  console.log(`  Mode: ${DRY ? "🔍 DRY RUN" : "🚀 APPLY"}`);
  console.log("═══════════════════════════════════════════════════════════\n");

  const key = getSecret("MAILWIZZ_API_KEY");
  await loadCache(key);
  console.log(`📦 ${cache.size} templates\n`);

  const SLUGS = [
    "first-commission", "commission-earned", "recruit-signup",
    "withdrawal-requested", "withdrawal-sent", "withdrawal-failed",
    "milestone", "telegram-linked", "threshold-reached",
  ];
  const LANGS = ["FR", "EN", "ES", "DE", "PT", "RU", "AR", "HI", "ZH"];
  const backupDir = path.join(__dirname, "template-analysis");

  let restored = 0, failed = 0, skipped = 0;

  for (const slug of SLUGS) {
    // Load FR backup
    const frFile = path.join(backupDir, `transactional-chatter-${slug}_FR_.html`);
    if (!fs.existsSync(frFile)) {
      console.log(`  ❌ NO BACKUP: ${slug}`);
      failed += LANGS.length;
      continue;
    }
    const frHtml = fs.readFileSync(frFile, "utf-8");

    for (const lang of LANGS) {
      const name = `transactional-chatter-${slug} [${lang}]`;
      const uid = cache.get(name);
      if (!uid) {
        console.log(`  ⚠️  NOT FOUND: ${name}`);
        skipped++;
        continue;
      }

      // Check current state
      const currentSize = await getTemplateSize(key, uid);
      if (currentSize > 3000) {
        console.log(`  ⏭️  OK (${currentSize}b): ${name}`);
        skipped++;
        continue;
      }

      // Generate content for this language
      const texts = T[slug]?.[lang];
      const html = adaptFrTemplate(frHtml, slug, lang, texts);

      if (DRY) {
        console.log(`  🔍 WOULD RESTORE: ${name} (${currentSize} → ${html.length} bytes)`);
      } else {
        try {
          await putTemplate(key, uid, name, html);
          // Verify
          const newSize = await getTemplateSize(key, uid);
          if (newSize > 3000) {
            console.log(`  ✅ RESTORED: ${name} (${currentSize} → ${newSize} bytes)`);
          } else {
            console.log(`  ⚠️  PARTIAL: ${name} (${currentSize} → ${newSize} bytes)`);
          }
          await wait(DELAY);
        } catch (err) {
          console.log(`  ❌ ERROR: ${name}: ${err.message}`);
          failed++;
          continue;
        }
      }
      restored++;
    }
  }

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log(`  📊 ${DRY ? "Would restore" : "Restored"}: ${restored} | Skipped (OK): ${skipped} | Failed: ${failed}`);
  if (DRY) console.log("  👉 node scripts/restoreChatterTemplates.js --apply");
  console.log("═══════════════════════════════════════════════════════════\n");
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
