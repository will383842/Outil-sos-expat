/**
 * Email Unsubscribe HTTP Endpoint
 *
 * Handles one-click unsubscribe (RFC 8058) and GET-based unsubscribe from email links.
 * Updates Firestore user document and stops MailWizz autoresponders.
 *
 * URL: https://europe-west1-sos-urgently-ac307.cloudfunctions.net/emailUnsubscribe
 */

import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";
import { EMAIL_PASS, EMAIL_SECRETS } from "../lib/secrets";
import { verifyUnsubscribeToken } from "../notificationPipeline/providers/email/zohoSmtp";

// ---------------------------------------------------------------------------
// HTML Templates (multilingual)
// ---------------------------------------------------------------------------

const TRANSLATIONS: Record<string, { title: string; message: string; back: string; errorTitle: string; errorMsg: string; alreadyTitle: string; alreadyMsg: string }> = {
  fr: {
    title: "D\u00e9sabonnement confirm\u00e9",
    message: "Vous ne recevrez plus d'emails marketing de SOS Expat. Les emails transactionnels (r\u00e9initialisation de mot de passe, factures) continueront d'\u00eatre envoy\u00e9s.",
    back: "Retour au site",
    errorTitle: "Lien invalide",
    errorMsg: "Ce lien de d\u00e9sabonnement est invalide ou a expir\u00e9. Veuillez contacter support@sos-expat.com.",
    alreadyTitle: "D\u00e9j\u00e0 d\u00e9sabonn\u00e9",
    alreadyMsg: "Vous \u00eates d\u00e9j\u00e0 d\u00e9sabonn\u00e9 des emails marketing.",
  },
  en: {
    title: "Unsubscribed Successfully",
    message: "You will no longer receive marketing emails from SOS Expat. Transactional emails (password reset, invoices) will continue to be sent.",
    back: "Back to website",
    errorTitle: "Invalid Link",
    errorMsg: "This unsubscribe link is invalid or has expired. Please contact support@sos-expat.com.",
    alreadyTitle: "Already Unsubscribed",
    alreadyMsg: "You are already unsubscribed from marketing emails.",
  },
  es: {
    title: "Cancelaci\u00f3n confirmada",
    message: "Ya no recibir\u00e1 correos de marketing de SOS Expat.",
    back: "Volver al sitio",
    errorTitle: "Enlace inv\u00e1lido",
    errorMsg: "Este enlace es inv\u00e1lido. Contacte support@sos-expat.com.",
    alreadyTitle: "Ya cancelado",
    alreadyMsg: "Ya est\u00e1 dado de baja.",
  },
  de: {
    title: "Abmeldung best\u00e4tigt",
    message: "Sie erhalten keine Marketing-E-Mails mehr von SOS Expat.",
    back: "Zur\u00fcck zur Website",
    errorTitle: "Ung\u00fcltiger Link",
    errorMsg: "Dieser Abmeldelink ist ung\u00fcltig. Kontaktieren Sie support@sos-expat.com.",
    alreadyTitle: "Bereits abgemeldet",
    alreadyMsg: "Sie sind bereits abgemeldet.",
  },
  pt: {
    title: "Cancelamento confirmado",
    message: "Voc\u00ea n\u00e3o receber\u00e1 mais e-mails de marketing da SOS Expat.",
    back: "Voltar ao site",
    errorTitle: "Link inv\u00e1lido",
    errorMsg: "Este link \u00e9 inv\u00e1lido. Entre em contato com support@sos-expat.com.",
    alreadyTitle: "J\u00e1 cancelado",
    alreadyMsg: "Voc\u00ea j\u00e1 est\u00e1 desinscrito.",
  },
  ru: {
    title: "\u041e\u0442\u043f\u0438\u0441\u043a\u0430 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0430",
    message: "\u0412\u044b \u0431\u043e\u043b\u044c\u0448\u0435 \u043d\u0435 \u0431\u0443\u0434\u0435\u0442\u0435 \u043f\u043e\u043b\u0443\u0447\u0430\u0442\u044c \u043c\u0430\u0440\u043a\u0435\u0442\u0438\u043d\u0433\u043e\u0432\u044b\u0435 \u043f\u0438\u0441\u044c\u043c\u0430 \u043e\u0442 SOS Expat.",
    back: "\u0412\u0435\u0440\u043d\u0443\u0442\u044c\u0441\u044f \u043d\u0430 \u0441\u0430\u0439\u0442",
    errorTitle: "\u041d\u0435\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0442\u0435\u043b\u044c\u043d\u0430\u044f \u0441\u0441\u044b\u043b\u043a\u0430",
    errorMsg: "\u042d\u0442\u0430 \u0441\u0441\u044b\u043b\u043a\u0430 \u043d\u0435\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0442\u0435\u043b\u044c\u043d\u0430. \u0421\u0432\u044f\u0436\u0438\u0442\u0435\u0441\u044c \u0441 support@sos-expat.com.",
    alreadyTitle: "\u0423\u0436\u0435 \u043e\u0442\u043f\u0438\u0441\u0430\u043d\u044b",
    alreadyMsg: "\u0412\u044b \u0443\u0436\u0435 \u043e\u0442\u043f\u0438\u0441\u0430\u043d\u044b \u043e\u0442 \u043c\u0430\u0440\u043a\u0435\u0442\u0438\u043d\u0433\u043e\u0432\u044b\u0445 \u043f\u0438\u0441\u0435\u043c.",
  },
  ar: {
    title: "\u062a\u0645 \u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643",
    message: "\u0644\u0646 \u062a\u062a\u0644\u0642\u0649 \u0628\u0639\u062f \u0627\u0644\u0622\u0646 \u0631\u0633\u0627\u0626\u0644 \u062a\u0633\u0648\u064a\u0642\u064a\u0629 \u0645\u0646 SOS Expat.",
    back: "\u0627\u0644\u0639\u0648\u062f\u0629 \u0625\u0644\u0649 \u0627\u0644\u0645\u0648\u0642\u0639",
    errorTitle: "\u0631\u0627\u0628\u0637 \u063a\u064a\u0631 \u0635\u0627\u0644\u062d",
    errorMsg: "\u0647\u0630\u0627 \u0627\u0644\u0631\u0627\u0628\u0637 \u063a\u064a\u0631 \u0635\u0627\u0644\u062d. \u062a\u0648\u0627\u0635\u0644 \u0645\u0639 support@sos-expat.com.",
    alreadyTitle: "\u062a\u0645 \u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643 \u0645\u0633\u0628\u0642\u0627\u064b",
    alreadyMsg: "\u0623\u0646\u062a \u0628\u0627\u0644\u0641\u0639\u0644 \u063a\u064a\u0631 \u0645\u0634\u062a\u0631\u0643.",
  },
  hi: {
    title: "\u0938\u0926\u0938\u094d\u092f\u0924\u093e \u0930\u0926\u094d\u0926 \u0915\u0940 \u0917\u0908",
    message: "\u0906\u092a\u0915\u094b \u0905\u092c SOS Expat \u0938\u0947 \u092e\u093e\u0930\u094d\u0915\u0947\u091f\u093f\u0902\u0917 \u0908\u092e\u0947\u0932 \u0928\u0939\u0940\u0902 \u092e\u093f\u0932\u0947\u0902\u0917\u0947\u0964",
    back: "\u0935\u0947\u092c\u0938\u093e\u0907\u091f \u092a\u0930 \u0935\u093e\u092a\u0938 \u091c\u093e\u090f\u0902",
    errorTitle: "\u0905\u092e\u093e\u0928\u094d\u092f \u0932\u093f\u0902\u0915",
    errorMsg: "\u092f\u0939 \u0932\u093f\u0902\u0915 \u0905\u092e\u093e\u0928\u094d\u092f \u0939\u0948\u0964 support@sos-expat.com \u0938\u0947 \u0938\u0902\u092a\u0930\u094d\u0915 \u0915\u0930\u0947\u0902\u0964",
    alreadyTitle: "\u092a\u0939\u0932\u0947 \u0938\u0947 \u0930\u0926\u094d\u0926",
    alreadyMsg: "\u0906\u092a \u092a\u0939\u0932\u0947 \u0938\u0947 \u0939\u0940 \u0938\u0926\u0938\u094d\u092f\u0924\u093e \u0930\u0926\u094d\u0926 \u0915\u0930 \u091a\u0941\u0915\u0947 \u0939\u0948\u0902\u0964",
  },
  ch: {
    title: "\u53d6\u6d88\u8ba2\u9605\u6210\u529f",
    message: "\u60a8\u5c06\u4e0d\u518d\u6536\u5230 SOS Expat \u7684\u8425\u9500\u90ae\u4ef6\u3002",
    back: "\u8fd4\u56de\u7f51\u7ad9",
    errorTitle: "\u94fe\u63a5\u65e0\u6548",
    errorMsg: "\u6b64\u94fe\u63a5\u65e0\u6548\u3002\u8bf7\u8054\u7cfb support@sos-expat.com\u3002",
    alreadyTitle: "\u5df2\u53d6\u6d88\u8ba2\u9605",
    alreadyMsg: "\u60a8\u5df2\u53d6\u6d88\u8ba2\u9605\u8425\u9500\u90ae\u4ef6\u3002",
  },
};

function getTranslation(lang?: string) {
  if (lang && TRANSLATIONS[lang]) return TRANSLATIONS[lang];
  return TRANSLATIONS.fr;
}

function renderPage(
  status: "success" | "error" | "already",
  lang?: string
): string {
  const t = getTranslation(lang);
  const icon = status === "success" ? "\u2705" : status === "already" ? "\u2139\ufe0f" : "\u274c";
  const title = status === "success" ? t.title : status === "already" ? t.alreadyTitle : t.errorTitle;
  const msg = status === "success" ? t.message : status === "already" ? t.alreadyMsg : t.errorMsg;
  const color = status === "error" ? "#e53e3e" : "#4F46E5";

  return `<!DOCTYPE html>
<html lang="${lang || "fr"}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} - SOS Expat</title>
  <style>
    body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;display:flex;align-items:center;justify-content:center;min-height:100vh}
    .card{background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:480px;width:90%;padding:48px 32px;text-align:center}
    .icon{font-size:48px;margin-bottom:16px}
    h1{color:${color};font-size:24px;margin:0 0 16px}
    p{color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px}
    .btn{display:inline-block;background:${color};color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px}
    .footer{color:#9ca3af;font-size:11px;margin-top:32px}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${msg}</p>
    <a href="https://sos-expat.com" class="btn">${t.back}</a>
    <p class="footer">WorldExpat O\u00dc &mdash; support@sos-expat.com</p>
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// HTTP Cloud Function
// ---------------------------------------------------------------------------

export const emailUnsubscribe = onRequest(
  {
    region: "europe-west1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    secrets: [...EMAIL_SECRETS],
    cors: true,
  },
  async (req, res) => {
    // Accept both GET (link click) and POST (RFC 8058 one-click)
    const token =
      (req.query.token as string) ||
      (req.body?.token as string) ||
      "";
    const lang = (req.query.lang as string) || "fr";

    if (!token) {
      res.status(400).send(renderPage("error", lang));
      return;
    }

    // Verify token
    const secret = EMAIL_PASS.value();
    const email = verifyUnsubscribeToken(token, secret);

    if (!email) {
      logger.warn("[emailUnsubscribe] Invalid token", { token: token.slice(0, 20) });
      res.status(400).send(renderPage("error", lang));
      return;
    }

    try {
      const db = admin.firestore();

      // Find user by email
      const userSnap = await db
        .collection("users")
        .where("email", "==", email)
        .limit(1)
        .get();

      if (userSnap.empty) {
        logger.warn("[emailUnsubscribe] No user found for email", {
          email: email.slice(0, 4) + "***",
        });
        // Still show success to avoid email enumeration
        res.status(200).send(renderPage("success", lang));
        return;
      }

      const userDoc = userSnap.docs[0];
      const userData = userDoc.data();

      // Already unsubscribed?
      if (userData.unsubscribed === true) {
        res.status(200).send(renderPage("already", lang));
        return;
      }

      // Update user document
      await userDoc.ref.update({
        unsubscribed: true,
        unsubscribedAt: admin.firestore.FieldValue.serverTimestamp(),
        unsubscribeSource: "email_link",
      });

      // Log the unsubscribe event
      await db.collection("email_events").add({
        type: "unsubscribed",
        email,
        userId: userDoc.id,
        source: req.method === "POST" ? "one_click_rfc8058" : "email_link",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Log GDPR audit trail
      await db.collection("gdpr_audit_logs").add({
        userId: userDoc.id,
        action: "CONSENT_UPDATE",
        details: { field: "unsubscribed", oldValue: false, newValue: true, source: "email_unsubscribe_link" },
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        ipAddress: req.ip || "unknown",
      });

      logger.info("[emailUnsubscribe] User unsubscribed", {
        userId: userDoc.id,
        email: email.slice(0, 4) + "***",
        method: req.method,
      });

      res.status(200).send(renderPage("success", lang));
    } catch (err) {
      logger.error("[emailUnsubscribe] Error processing unsubscribe", { error: err });
      res.status(500).send(renderPage("error", lang));
    }
  }
);
