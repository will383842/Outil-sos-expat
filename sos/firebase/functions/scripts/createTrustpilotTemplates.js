/**
 * Create Trustpilot outreach templates in MailWizz
 * Run: node scripts/createTrustpilotTemplates.js
 */

const axios = require("axios");
const { execSync } = require("child_process");

const API_URL = "https://mail.sos-expat.com/api/index.php";
const CUSTOMER_ID = "1";

async function getApiKey() {
  if (process.env.MAILWIZZ_API_KEY) return process.env.MAILWIZZ_API_KEY;
  return execSync(
    "gcloud secrets versions access latest --secret=MAILWIZZ_API_KEY --project=sos-urgently-ac307",
    { encoding: "utf-8" }
  ).trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared components
// ─────────────────────────────────────────────────────────────────────────────

const HEAD = (lang, title, preheader) => `<!DOCTYPE html>
<html lang="${lang}" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 0; }
    .email-container { max-width: 600px; margin: 0 auto; }
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5;">
  <div style="display: none; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: #f4f4f5;">
    ${preheader}
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>`;

const HEADER_BANNER = `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f5;">
  <tr>
    <td style="padding: 20px 0;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" class="email-container" style="margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(145deg,#EF4444 0%,#DC2626 40%,#B91C1C 100%);padding:45px 40px;text-align:center;">
            <img src="https://sos-expat.com/icons/icon-512x512.png" alt="SOS-Expat" width="120" style="display: inline-block;">
            <p style="color: #ffffff; font-size: 12px; margin-top: 10px; opacity: 0.9;">by Ulixai</p>
          </td>
        </tr>`;

const FOOTER = (unsubText) => `
        <!-- Footer -->
        <tr>
          <td style="background: linear-gradient(135deg, #fef2f2 0%, #fff7ed 100%); padding: 28px 20px; text-align: center;">
            <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin: 0 auto 20px auto;">
              <tr>
                <td style="padding: 0 8px;">
                  <a href="https://www.facebook.com/profile.php?id=61575873886727" style="display:inline-block;width:38px;height:38px;line-height:38px;background:#dc2626;border-radius:50%;text-align:center;">
                    <img alt="Facebook" src="https://cdn-icons-png.flaticon.com/512/733/733547.png" width="18" style="vertical-align:middle;" />
                  </a>
                </td>
                <td style="padding: 0 8px;">
                  <a href="https://www.instagram.com/ulixai_officiel/" style="display:inline-block;width:38px;height:38px;line-height:38px;background:#dc2626;border-radius:50%;text-align:center;">
                    <img alt="Instagram" src="https://cdn-icons-png.flaticon.com/512/733/733558.png" width="18" style="vertical-align:middle;" />
                  </a>
                </td>
                <td style="padding: 0 8px;">
                  <a href="https://www.linkedin.com/in/williams-j-472736383/" style="display:inline-block;width:38px;height:38px;line-height:38px;background:#dc2626;border-radius:50%;text-align:center;">
                    <img alt="LinkedIn" src="https://cdn-icons-png.flaticon.com/512/733/733561.png" width="18" style="vertical-align:middle;" />
                  </a>
                </td>
              </tr>
            </table>
            <p style="color: #1f2937; font-size: 15px; margin: 0 0 4px 0; font-weight: 700;">SOS-Expat.com <span style="color: #dc2626;">&#10084;&#65039;</span> by Ulixai</p>
            <p style="color: #6b7280; font-size: 12px; margin: 0 0 12px 0;">World'Expats O&Uuml; - Estonie</p>
            <p style="color: #9ca3af; font-size: 10px; margin: 0;">&copy; 2026 World'Expats O&Uuml; &mdash; Will d'Ulixai</p>
            <p style="margin:0;"><a href="[UNSUBSCRIBE_URL]" style="color:#9ca3af;font-size:11px;text-decoration:underline;">${unsubText}</a></p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

const TRUSTPILOT_BLOCK = `
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 30px;">
                <tr>
                  <td style="background-color: #00B67A; padding: 25px; border-radius: 12px; text-align: center;">
                    <p style="color: #ffffff; font-size: 32px; margin: 0 0 10px 0;">&#11088;&#11088;&#11088;&#11088;&#11088;</p>
                    <p style="color: #ffffff; font-size: 18px; font-weight: 600; margin: 0;">Trustpilot</p>
                  </td>
                </tr>
              </table>`;

const CTA_BUTTON = (text) => `
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center;">
                    <a href="[TRUSTPILOT_URL]" style="display: inline-block; padding: 18px 40px; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px; background-color: #00B67A; color: #ffffff;">
                      &#11088; ${text}
                    </a>
                  </td>
                </tr>
              </table>`;

// ─────────────────────────────────────────────────────────────────────────────
// Template 1: Chatter Trustpilot Invite FR
// ─────────────────────────────────────────────────────────────────────────────

const CHATTER_FR = HEAD("fr", "Hey [FNAME], un petit coup de pouce ?", "&#127775; Tu fais partie de l'aventure SOS-Expat ! Partage ton exp\u00e9rience sur Trustpilot")
+ HEADER_BANNER
+ `
        <!-- Fun Stats Banner -->
        <tr>
          <td style="background:linear-gradient(90deg,#8B5CF6 0%,#6D28D9 100%);padding:15px 20px;text-align:center;">
            <p style="color:#ffffff;font-size:14px;font-weight:600;margin:0;">&#128640; Tu as d&eacute;j&agrave; g&eacute;n&eacute;r&eacute; <strong>[TOTAL_EARNED]</strong> de commissions ! Team de <strong>[TEAM_SIZE]</strong> membres &#128170;</p>
          </td>
        </tr>

        <!-- Content -->
        <tr>
          <td class="mobile-padding" style="padding: 40px;">

            <h1 style="color: #1F2937; font-size: 26px; font-weight: 700; margin-bottom: 20px; line-height: 1.3;">
              &#128075; Salut [FNAME], t'as 2 min ?
            </h1>

            <p style="color: #4B5563; font-size: 16px; line-height: 1.7; margin-bottom: 15px;">
              Tu fais partie de la <strong>team SOS-Expat</strong> et franchement, on est trop contents de t'avoir ! &#127881;
            </p>

            <p style="color: #4B5563; font-size: 16px; line-height: 1.7; margin-bottom: 15px;">
              En tant que chatter actif (niveau <strong>[LEVEL_NAME]</strong> &#128293;), ton avis compte &eacute;norm&eacute;ment pour nous. Un petit avis Trustpilot, &ccedil;a prend 2 min et &ccedil;a nous aide &agrave; grandir comme jamais !
            </p>

            <p style="color: #4B5563; font-size: 16px; line-height: 1.7; margin-bottom: 25px;">
              Plus on a d'avis, plus on attire de clients... et plus <strong>tes commissions augmentent</strong> ! C'est du win-win &#129309;
            </p>

            <!-- Achievement Card -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 25px; border: 2px solid #E5E7EB; border-radius: 12px; overflow: hidden;">
              <tr>
                <td style="background:linear-gradient(135deg,#F3E8FF 0%,#EDE9FE 100%);padding:20px;text-align:center;">
                  <p style="color:#6D28D9;font-size:13px;font-weight:600;margin:0 0 8px 0;">&#127942; TES STATS DE CHATTER</p>
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                      <td style="width:33%;text-align:center;padding:8px;">
                        <p style="color:#6D28D9;font-size:22px;font-weight:800;margin:0;">[TOTAL_EARNED]</p>
                        <p style="color:#7C3AED;font-size:11px;margin:4px 0 0 0;">Gagn&eacute;s</p>
                      </td>
                      <td style="width:33%;text-align:center;padding:8px;border-left:1px solid #DDD6FE;border-right:1px solid #DDD6FE;">
                        <p style="color:#6D28D9;font-size:22px;font-weight:800;margin:0;">[TEAM_SIZE]</p>
                        <p style="color:#7C3AED;font-size:11px;margin:4px 0 0 0;">Recrues</p>
                      </td>
                      <td style="width:33%;text-align:center;padding:8px;">
                        <p style="color:#6D28D9;font-size:22px;font-weight:800;margin:0;">[LEVEL_NAME]</p>
                        <p style="color:#7C3AED;font-size:11px;margin:4px 0 0 0;">Niveau</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

${TRUSTPILOT_BLOCK}
${CTA_BUTTON("Laisser un avis Trustpilot")}

            <p style="color: #6B7280; font-size: 14px; text-align: center; margin-top: 20px;">
              Promis, c'est rapide et &ccedil;a fait toute la diff&eacute;rence ! &#128591;
            </p>

          </td>
        </tr>`
+ FOOTER("Se d\u00e9sinscrire");


// ─────────────────────────────────────────────────────────────────────────────
// Template 2: Chatter Trustpilot Invite EN
// ─────────────────────────────────────────────────────────────────────────────

const CHATTER_EN = HEAD("en", "Hey [FNAME], got 2 minutes?", "&#127775; You're part of the SOS-Expat crew! Share your experience on Trustpilot")
+ HEADER_BANNER
+ `
        <!-- Fun Stats Banner -->
        <tr>
          <td style="background:linear-gradient(90deg,#8B5CF6 0%,#6D28D9 100%);padding:15px 20px;text-align:center;">
            <p style="color:#ffffff;font-size:14px;font-weight:600;margin:0;">&#128640; You've already earned <strong>[TOTAL_EARNED]</strong> in commissions! Team of <strong>[TEAM_SIZE]</strong> &#128170;</p>
          </td>
        </tr>

        <!-- Content -->
        <tr>
          <td class="mobile-padding" style="padding: 40px;">

            <h1 style="color: #1F2937; font-size: 26px; font-weight: 700; margin-bottom: 20px; line-height: 1.3;">
              &#128075; Hey [FNAME], got 2 minutes?
            </h1>

            <p style="color: #4B5563; font-size: 16px; line-height: 1.7; margin-bottom: 15px;">
              You're part of the <strong>SOS-Expat crew</strong> and honestly, we're so glad to have you! &#127881;
            </p>

            <p style="color: #4B5563; font-size: 16px; line-height: 1.7; margin-bottom: 15px;">
              As an active chatter (<strong>[LEVEL_NAME]</strong> level &#128293;), your opinion matters a ton. A quick Trustpilot review takes 2 min and helps us grow like crazy!
            </p>

            <p style="color: #4B5563; font-size: 16px; line-height: 1.7; margin-bottom: 25px;">
              More reviews = more clients = <strong>more commissions for you</strong>! It's a win-win &#129309;
            </p>

            <!-- Achievement Card -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 25px; border: 2px solid #E5E7EB; border-radius: 12px; overflow: hidden;">
              <tr>
                <td style="background:linear-gradient(135deg,#F3E8FF 0%,#EDE9FE 100%);padding:20px;text-align:center;">
                  <p style="color:#6D28D9;font-size:13px;font-weight:600;margin:0 0 8px 0;">&#127942; YOUR CHATTER STATS</p>
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                      <td style="width:33%;text-align:center;padding:8px;">
                        <p style="color:#6D28D9;font-size:22px;font-weight:800;margin:0;">[TOTAL_EARNED]</p>
                        <p style="color:#7C3AED;font-size:11px;margin:4px 0 0 0;">Earned</p>
                      </td>
                      <td style="width:33%;text-align:center;padding:8px;border-left:1px solid #DDD6FE;border-right:1px solid #DDD6FE;">
                        <p style="color:#6D28D9;font-size:22px;font-weight:800;margin:0;">[TEAM_SIZE]</p>
                        <p style="color:#7C3AED;font-size:11px;margin:4px 0 0 0;">Recruits</p>
                      </td>
                      <td style="width:33%;text-align:center;padding:8px;">
                        <p style="color:#6D28D9;font-size:22px;font-weight:800;margin:0;">[LEVEL_NAME]</p>
                        <p style="color:#7C3AED;font-size:11px;margin:4px 0 0 0;">Level</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

${TRUSTPILOT_BLOCK}
${CTA_BUTTON("Leave a Trustpilot Review")}

            <p style="color: #6B7280; font-size: 14px; text-align: center; margin-top: 20px;">
              It's quick and it makes a HUGE difference! &#128591;
            </p>

          </td>
        </tr>`
+ FOOTER("Unsubscribe");


// ─────────────────────────────────────────────────────────────────────────────
// Template 3: Provider Trustpilot Outreach FR
// ─────────────────────────────────────────────────────────────────────────────

const PROVIDER_FR = HEAD("fr", "[FNAME], vos clients vous adorent !", "&#11088; [TOTAL_CALLS] appels r\u00e9alis\u00e9s ! Partagez votre exp\u00e9rience de prestataire sur Trustpilot")
+ HEADER_BANNER
+ `
        <!-- Stats Banner -->
        <tr>
          <td style="background:linear-gradient(90deg,#0EA5E9 0%,#0284C7 100%);padding:15px 20px;text-align:center;">
            <p style="color:#ffffff;font-size:14px;font-weight:600;margin:0;">&#128222; <strong>[TOTAL_CALLS] appels</strong> r&eacute;alis&eacute;s &bull; Note moyenne : <strong>[AVG_RATING]</strong>&#11088;</p>
          </td>
        </tr>

        <!-- Content -->
        <tr>
          <td class="mobile-padding" style="padding: 40px;">

            <h1 style="color: #1F2937; font-size: 26px; font-weight: 700; margin-bottom: 20px; line-height: 1.3;">
              &#127775; Bravo [FNAME], vos clients vous adorent !
            </h1>

            <p style="color: #4B5563; font-size: 16px; line-height: 1.7; margin-bottom: 15px;">
              Avec <strong>[TOTAL_CALLS] appels r&eacute;alis&eacute;s</strong> sur SOS-Expat, vous avez d&eacute;j&agrave; aid&eacute; de nombreux expatri&eacute;s. Chapeau ! &#127913;
            </p>

            <p style="color: #4B5563; font-size: 16px; line-height: 1.7; margin-bottom: 15px;">
              En tant que prestataire exp&eacute;riment&eacute;, <strong>votre t&eacute;moignage a une valeur immense</strong>. Un avis sur Trustpilot permet &agrave; d'autres professionnels de d&eacute;couvrir la plateforme et &agrave; de nouveaux clients de vous trouver !
            </p>

            <p style="color: #4B5563; font-size: 16px; line-height: 1.7; margin-bottom: 25px;">
              Plus d'avis = plus de visibilit&eacute; = <strong>plus de clients pour vous</strong> &#128200;
            </p>

            <!-- Provider Stats Card -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 25px; border: 2px solid #E5E7EB; border-radius: 12px; overflow: hidden;">
              <tr>
                <td style="background:linear-gradient(135deg,#EFF6FF 0%,#DBEAFE 100%);padding:20px;text-align:center;">
                  <p style="color:#1D4ED8;font-size:13px;font-weight:600;margin:0 0 8px 0;">&#128188; VOTRE IMPACT SUR SOS-EXPAT</p>
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                      <td style="width:33%;text-align:center;padding:8px;">
                        <p style="color:#1D4ED8;font-size:28px;font-weight:800;margin:0;">[TOTAL_CALLS]</p>
                        <p style="color:#3B82F6;font-size:11px;margin:4px 0 0 0;">Appels</p>
                      </td>
                      <td style="width:33%;text-align:center;padding:8px;border-left:1px solid #BFDBFE;border-right:1px solid #BFDBFE;">
                        <p style="color:#1D4ED8;font-size:28px;font-weight:800;margin:0;">[AVG_RATING]</p>
                        <p style="color:#3B82F6;font-size:11px;margin:4px 0 0 0;">Note &#11088;</p>
                      </td>
                      <td style="width:33%;text-align:center;padding:8px;">
                        <p style="color:#1D4ED8;font-size:28px;font-weight:800;margin:0;">Top</p>
                        <p style="color:#3B82F6;font-size:11px;margin:4px 0 0 0;">Prestataire</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

${TRUSTPILOT_BLOCK}
${CTA_BUTTON("Partager mon exp&eacute;rience")}

            <p style="color: #6B7280; font-size: 14px; text-align: center; margin-top: 20px;">
              2 minutes pour aider la communaut&eacute; &#128591;
            </p>

          </td>
        </tr>`
+ FOOTER("Se d\u00e9sinscrire");


// ─────────────────────────────────────────────────────────────────────────────
// Template 4: Provider Trustpilot Outreach EN
// ─────────────────────────────────────────────────────────────────────────────

const PROVIDER_EN = HEAD("en", "[FNAME], your clients love you!", "&#11088; [TOTAL_CALLS] calls completed! Share your provider experience on Trustpilot")
+ HEADER_BANNER
+ `
        <!-- Stats Banner -->
        <tr>
          <td style="background:linear-gradient(90deg,#0EA5E9 0%,#0284C7 100%);padding:15px 20px;text-align:center;">
            <p style="color:#ffffff;font-size:14px;font-weight:600;margin:0;">&#128222; <strong>[TOTAL_CALLS] calls</strong> completed &bull; Average rating: <strong>[AVG_RATING]</strong>&#11088;</p>
          </td>
        </tr>

        <!-- Content -->
        <tr>
          <td class="mobile-padding" style="padding: 40px;">

            <h1 style="color: #1F2937; font-size: 26px; font-weight: 700; margin-bottom: 20px; line-height: 1.3;">
              &#127775; Amazing [FNAME], your clients love you!
            </h1>

            <p style="color: #4B5563; font-size: 16px; line-height: 1.7; margin-bottom: 15px;">
              With <strong>[TOTAL_CALLS] calls completed</strong> on SOS-Expat, you've already helped so many expats. Hats off to you! &#127913;
            </p>

            <p style="color: #4B5563; font-size: 16px; line-height: 1.7; margin-bottom: 15px;">
              As an experienced provider, <strong>your testimonial is incredibly valuable</strong>. A Trustpilot review helps other professionals discover the platform and brings new clients to you!
            </p>

            <p style="color: #4B5563; font-size: 16px; line-height: 1.7; margin-bottom: 25px;">
              More reviews = more visibility = <strong>more clients for you</strong> &#128200;
            </p>

            <!-- Provider Stats Card -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 25px; border: 2px solid #E5E7EB; border-radius: 12px; overflow: hidden;">
              <tr>
                <td style="background:linear-gradient(135deg,#EFF6FF 0%,#DBEAFE 100%);padding:20px;text-align:center;">
                  <p style="color:#1D4ED8;font-size:13px;font-weight:600;margin:0 0 8px 0;">&#128188; YOUR IMPACT ON SOS-EXPAT</p>
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                      <td style="width:33%;text-align:center;padding:8px;">
                        <p style="color:#1D4ED8;font-size:28px;font-weight:800;margin:0;">[TOTAL_CALLS]</p>
                        <p style="color:#3B82F6;font-size:11px;margin:4px 0 0 0;">Calls</p>
                      </td>
                      <td style="width:33%;text-align:center;padding:8px;border-left:1px solid #BFDBFE;border-right:1px solid #BFDBFE;">
                        <p style="color:#1D4ED8;font-size:28px;font-weight:800;margin:0;">[AVG_RATING]</p>
                        <p style="color:#3B82F6;font-size:11px;margin:4px 0 0 0;">Rating &#11088;</p>
                      </td>
                      <td style="width:33%;text-align:center;padding:8px;">
                        <p style="color:#1D4ED8;font-size:28px;font-weight:800;margin:0;">Top</p>
                        <p style="color:#3B82F6;font-size:11px;margin:4px 0 0 0;">Provider</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

${TRUSTPILOT_BLOCK}
${CTA_BUTTON("Share my experience")}

            <p style="color: #6B7280; font-size: 14px; text-align: center; margin-top: 20px;">
              2 minutes to help the community &#128591;
            </p>

          </td>
        </tr>`
+ FOOTER("Unsubscribe");


// ─────────────────────────────────────────────────────────────────────────────
// Create templates via MailWizz API
// ─────────────────────────────────────────────────────────────────────────────

const TEMPLATES = [
  { name: "transactional-chatter-trustpilot-invite [FR]", html: CHATTER_FR },
  { name: "transactional-chatter-trustpilot-invite [EN]", html: CHATTER_EN },
  { name: "transactional-provider-trustpilot-outreach [FR]", html: PROVIDER_FR },
  { name: "transactional-provider-trustpilot-outreach [EN]", html: PROVIDER_EN },
];

async function createTemplate(apiKey, name, html) {
  const formData = new URLSearchParams();
  formData.append("template[name]", name);
  // MailWizz API requires base64-encoded HTML content
  formData.append("template[content]", Buffer.from(html).toString("base64"));

  const resp = await axios.post(`${API_URL}/templates`, formData.toString(), {
    headers: {
      "X-MW-PUBLIC-KEY": apiKey,
      "X-MW-CUSTOMER-ID": CUSTOMER_ID,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    timeout: 30000,
  });

  return resp.data;
}

async function main() {
  console.log("\n🎨 Creating Trustpilot email templates in MailWizz\n");

  const apiKey = await getApiKey();
  let created = 0;

  for (const tmpl of TEMPLATES) {
    process.stdout.write(`  Creating "${tmpl.name}"... `);
    try {
      const result = await createTemplate(apiKey, tmpl.name, tmpl.html);
      if (result?.status === "success") {
        console.log(`✅ Created (UID: ${result.template_uid})`);
        created++;
      } else {
        console.log(`⚠️ Response:`, JSON.stringify(result));
      }
    } catch (err) {
      const respData = err.response?.data;
      console.log(`❌ ${respData ? JSON.stringify(respData) : err.message}`);
    }
  }

  console.log(`\n📊 Created: ${created}/${TEMPLATES.length} templates`);

  if (created === TEMPLATES.length) {
    console.log(`\n✅ All templates created! Now run:\n   node scripts/testTrustpilotEmails.js\n`);
  }
}

main().catch(err => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
