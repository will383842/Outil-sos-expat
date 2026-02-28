/**
 * Zoho SMTP Email Provider
 *
 * P1 FIX (2026-02-28): Added List-Unsubscribe header (RFC 8058) and
 * unsubscribe footer to all non-transactional emails for CAN-SPAM/RGPD compliance.
 *
 * P1 FIX (2026-02-28): Added email deliverability guard — checks
 * emailBounced / unsubscribed / emailStatus before sending.
 */

import nodemailer from "nodemailer";
import crypto from "crypto";
import * as admin from "firebase-admin";
import { EMAIL_USER, EMAIL_PASS } from "../../../lib/secrets";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const UNSUBSCRIBE_FUNCTION_URL =
  "https://europe-west1-sos-urgently-ac307.cloudfunctions.net/emailUnsubscribe";

/** Subjects containing these keywords are pure transactional — no unsubscribe footer */
const TRANSACTIONAL_KEYWORDS = [
  "reset",
  "mot de passe",
  "password",
  "vérification",
  "verification",
  "code",
  "confirmer",
  "confirm",
  "sécurité",
  "security",
  "alerte critique",
  "critical alert",
];

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface SendZohoOptions {
  /** Skip adding unsubscribe footer + header (e.g. password reset) */
  skipUnsubscribeFooter?: boolean;
  /** Skip checking emailBounced/unsubscribed in Firestore */
  skipDeliverabilityCheck?: boolean;
  /** Language code for localized unsubscribe label (fr, en, es, de, pt, ru, ar, hi, ch) */
  lang?: string;
}

// ---------------------------------------------------------------------------
// Unsubscribe token helpers (HMAC-SHA256, URL-safe)
// ---------------------------------------------------------------------------

export function generateUnsubscribeToken(email: string, secret: string): string {
  const payload = Buffer.from(email).toString("base64url");
  const sig = crypto
    .createHmac("sha256", secret)
    .update(email)
    .digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyUnsubscribeToken(
  token: string,
  secret: string
): string | null {
  const dot = token.indexOf(".");
  if (dot < 1) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  try {
    const email = Buffer.from(payload, "base64url").toString("utf8");
    const expected = crypto
      .createHmac("sha256", secret)
      .update(email)
      .digest("base64url");
    if (sig.length !== expected.length) return null;
    if (
      !crypto.timingSafeEqual(Buffer.from(sig, "utf8"), Buffer.from(expected, "utf8"))
    )
      return null;
    return email;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Deliverability guard
// ---------------------------------------------------------------------------

/**
 * Check if the recipient email is deliverable (not bounced / not unsubscribed).
 * Returns `true` if we should send, `false` to skip.
 */
async function isEmailDeliverable(email: string): Promise<boolean> {
  try {
    const db = admin.firestore();
    const snap = await db
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (snap.empty) return true; // Unknown user → allow send

    const data = snap.docs[0].data();
    if (data.emailBounced === true) {
      console.log(`[sendZoho] SKIP: email bounced for ${email.slice(0, 4)}***`);
      return false;
    }
    if (data.unsubscribed === true) {
      console.log(`[sendZoho] SKIP: user unsubscribed ${email.slice(0, 4)}***`);
      return false;
    }
    if (data.emailStatus === "invalid") {
      console.log(`[sendZoho] SKIP: emailStatus=invalid for ${email.slice(0, 4)}***`);
      return false;
    }
    return true;
  } catch (err) {
    // Non-blocking: if Firestore fails, allow send to avoid losing emails
    console.warn("[sendZoho] deliverability check failed (allowing send):", err);
    return true;
  }
}

// ---------------------------------------------------------------------------
// Unsubscribe footer
// ---------------------------------------------------------------------------

function isTransactionalSubject(subject: string): boolean {
  const lower = subject.toLowerCase();
  return TRANSACTIONAL_KEYWORDS.some((kw) => lower.includes(kw));
}

const UNSUBSCRIBE_LABELS: Record<string, string> = {
  fr: "Se d\u00e9sabonner",
  en: "Unsubscribe",
  es: "Darse de baja",
  de: "Abmelden",
  pt: "Cancelar inscri\u00e7\u00e3o",
  ru: "\u041E\u0442\u043F\u0438\u0441\u0430\u0442\u044C\u0441\u044F",
  ar: "\u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0627\u0634\u0442\u0631\u0627\u0643",
  hi: "\u0938\u0926\u0938\u094D\u092F\u0924\u093E \u0930\u0926\u094D\u0926 \u0915\u0930\u0947\u0902",
  ch: "\u53D6\u6D88\u8BA2\u9605",
};

function buildUnsubscribeFooter(unsubscribeUrl: string, lang?: string): string {
  const label = UNSUBSCRIBE_LABELS[lang || "en"] || UNSUBSCRIBE_LABELS.en;
  return `
    <div style="text-align:center;margin-top:30px;padding-top:20px;border-top:1px solid #e5e7eb;">
      <p style="color:#9ca3af;font-size:11px;line-height:1.5;">
        <a href="${unsubscribeUrl}" style="color:#9ca3af;text-decoration:underline;">${label}</a>
        &nbsp;|&nbsp;
        <a href="https://sos-expat.com" style="color:#9ca3af;text-decoration:underline;">sos-expat.com</a>
      </p>
      <p style="color:#d1d5db;font-size:10px;">WorldExpat O\u00dc &mdash; Tallinn, Estonia</p>
    </div>`;
}

function injectFooter(html: string, footer: string): string {
  // Try to insert before </body>
  if (html.includes("</body>")) {
    return html.replace("</body>", `${footer}</body>`);
  }
  // Otherwise append
  return html + footer;
}

// ---------------------------------------------------------------------------
// Main send function
// ---------------------------------------------------------------------------

export async function sendZoho(
  to: string,
  subject: string,
  html: string,
  text?: string,
  options?: SendZohoOptions
): Promise<string> {
  const secret = EMAIL_PASS.value();
  const sender = EMAIL_USER.value();

  // ── P1 FIX: Deliverability guard ──
  if (!options?.skipDeliverabilityCheck) {
    const deliverable = await isEmailDeliverable(to);
    if (!deliverable) {
      console.log(`[sendZoho] Email to ${to.slice(0, 4)}*** skipped (not deliverable)`);
      return "SKIPPED_NOT_DELIVERABLE";
    }
  }

  // ── P1 FIX: Unsubscribe footer + header ──
  const shouldAddFooter =
    !options?.skipUnsubscribeFooter && !isTransactionalSubject(subject);

  let finalHtml = html;
  let unsubscribeUrl = "";

  if (shouldAddFooter) {
    const token = generateUnsubscribeToken(to, secret);
    unsubscribeUrl = `${UNSUBSCRIBE_FUNCTION_URL}?token=${token}`;
    finalHtml = injectFooter(html, buildUnsubscribeFooter(unsubscribeUrl, options?.lang));
  }

  // ── SMTP Transport ──
  const transporter = nodemailer.createTransport({
    host: "smtp.zoho.eu",
    port: 465,
    secure: true,
    auth: { user: sender, pass: secret },
    // P1 FIX: Explicit SMTP timeouts to prevent function from hanging indefinitely
    connectionTimeout: 10000, // 10s to establish TCP connection
    greetingTimeout: 10000,   // 10s for SMTP greeting
    socketTimeout: 30000,     // 30s per socket operation (send)
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mailOptions: Record<string, any> = {
    from: `"SOS Expat" <${sender}>`,
    to,
    subject,
    html: finalHtml,
    text,
  };

  // P1 FIX: RFC 8058 List-Unsubscribe headers
  if (shouldAddFooter && unsubscribeUrl) {
    mailOptions.headers = {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    };
  }

  const info = await transporter.sendMail(mailOptions);
  return info.messageId as string;
}
