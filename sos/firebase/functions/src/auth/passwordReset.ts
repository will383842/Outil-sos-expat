/**
 * Custom Password Reset Email Function
 *
 * Sends branded, translated password reset emails via Zoho SMTP
 * instead of Firebase's default generic template.
 *
 * Supports: FR and EN (fallback to EN for other languages)
 * Brand colors: Red (#dc2626 → #b91c1c)
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import nodemailer from "nodemailer";
import { EMAIL_USER, EMAIL_PASS } from "../utils/secrets";

// Email templates for password reset - Fun & friendly tone with SOS Expat red branding
const templates = {
  fr: {
    subject: "Oups, mot de passe oublié ? On t'aide ! 🔑 - SOS Expat",
    html: (resetLink: string, firstName?: string) => `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Réinitialisation de mot de passe</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #fef2f2;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 20px rgba(220, 38, 38, 0.15);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 25px; text-align: center; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 800;">SOS Expat</h1>
              <p style="margin: 12px 0 0; color: rgba(255,255,255,0.95); font-size: 15px;">Ton allié pour l'expatriation 🌍</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 25px; color: #1f2937; font-size: 26px; font-weight: 700;">
                ${firstName ? `Hey ${firstName} ! 👋` : "Hey ! 👋"}
              </h2>

              <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.7;">
                Pas de panique, ça arrive aux meilleurs d'entre nous ! 😅
              </p>

              <p style="margin: 0 0 25px; color: #4b5563; font-size: 16px; line-height: 1.7;">
                Tu as demandé à réinitialiser ton mot de passe SOS Expat.
                Clique sur le bouton ci-dessous et c'est reparti ! 🚀
              </p>

              <table role="presentation" style="width: 100%; margin: 35px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetLink}"
                       style="display: inline-block; padding: 18px 45px; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: #ffffff; text-decoration: none; font-size: 17px; font-weight: 700; border-radius: 10px; box-shadow: 0 6px 20px rgba(220, 38, 38, 0.35); transition: transform 0.2s;">
                      🔐 Créer un nouveau mot de passe
                    </a>
                  </td>
                </tr>
              </table>

              <div style="background-color: #fef3c7; border-radius: 10px; padding: 16px 20px; margin: 25px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                  ⏰ <strong>Petit rappel :</strong> Ce lien expire dans <strong>1 heure</strong>.
                  Après ça, il faudra en demander un nouveau !
                </p>
              </div>

              <p style="margin: 0 0 15px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Tu n'as pas fait cette demande ? Pas de souci, ignore simplement cet email.
                Ton mot de passe actuel reste intact ! 🔒
              </p>

              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6;">
                Le bouton ne marche pas ? Copie-colle ce lien dans ton navigateur :<br>
                <a href="${resetLink}" style="color: #dc2626; word-break: break-all;">${resetLink}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #fef2f2; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="margin: 0 0 12px; color: #6b7280; font-size: 14px;">
                Une question ? On est là ! 💬
                <a href="https://sos-expat.com/contact" style="color: #dc2626; text-decoration: none; font-weight: 600;">Contacte-nous</a>
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} SOS Expat • Fait avec ❤️ pour les expatriés
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    text: (resetLink: string, firstName?: string) => `
${firstName ? `Hey ${firstName} ! 👋` : "Hey ! 👋"}

Pas de panique, ça arrive aux meilleurs d'entre nous ! 😅

Tu as demandé à réinitialiser ton mot de passe SOS Expat.
Clique sur ce lien et c'est reparti :

${resetLink}

⏰ Ce lien expire dans 1 heure !

Tu n'as pas fait cette demande ? Ignore simplement cet email, ton mot de passe reste intact.

---
SOS Expat • Ton allié pour l'expatriation 🌍
https://sos-expat.com
    `,
  },
  en: {
    subject: "Oops, forgot your password? We got you! 🔑 - SOS Expat",
    html: (resetLink: string, firstName?: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #fef2f2;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 20px rgba(220, 38, 38, 0.15);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 25px; text-align: center; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 800;">SOS Expat</h1>
              <p style="margin: 12px 0 0; color: rgba(255,255,255,0.95); font-size: 15px;">Your expat buddy worldwide 🌍</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 25px; color: #1f2937; font-size: 26px; font-weight: 700;">
                ${firstName ? `Hey ${firstName}! 👋` : "Hey there! 👋"}
              </h2>

              <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.7;">
                No worries, it happens to the best of us! 😅
              </p>

              <p style="margin: 0 0 25px; color: #4b5563; font-size: 16px; line-height: 1.7;">
                You asked to reset your SOS Expat password.
                Just click the button below and you're good to go! 🚀
              </p>

              <table role="presentation" style="width: 100%; margin: 35px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetLink}"
                       style="display: inline-block; padding: 18px 45px; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: #ffffff; text-decoration: none; font-size: 17px; font-weight: 700; border-radius: 10px; box-shadow: 0 6px 20px rgba(220, 38, 38, 0.35); transition: transform 0.2s;">
                      🔐 Create a new password
                    </a>
                  </td>
                </tr>
              </table>

              <div style="background-color: #fef3c7; border-radius: 10px; padding: 16px 20px; margin: 25px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                  ⏰ <strong>Quick heads up:</strong> This link expires in <strong>1 hour</strong>.
                  After that, you'll need to request a new one!
                </p>
              </div>

              <p style="margin: 0 0 15px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Didn't request this? No problem, just ignore this email.
                Your current password stays safe and sound! 🔒
              </p>

              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6;">
                Button not working? Copy and paste this link in your browser:<br>
                <a href="${resetLink}" style="color: #dc2626; word-break: break-all;">${resetLink}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #fef2f2; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="margin: 0 0 12px; color: #6b7280; font-size: 14px;">
                Got questions? We're here! 💬
                <a href="https://sos-expat.com/contact" style="color: #dc2626; text-decoration: none; font-weight: 600;">Contact us</a>
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} SOS Expat • Made with ❤️ for expats
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    text: (resetLink: string, firstName?: string) => `
${firstName ? `Hey ${firstName}! 👋` : "Hey there! 👋"}

No worries, it happens to the best of us! 😅

You asked to reset your SOS Expat password.
Click this link and you're good to go:

${resetLink}

⏰ This link expires in 1 hour!

Didn't request this? Just ignore this email, your password stays safe.

---
SOS Expat • Your expat buddy worldwide 🌍
https://sos-expat.com
    `,
  },
};

// Resolve language to FR or EN (fallback to EN)
function resolveLanguage(lang?: string): "fr" | "en" {
  if (!lang) return "en";
  const normalized = lang.toLowerCase();
  return normalized.startsWith("fr") ? "fr" : "en";
}

/**
 * Send custom password reset email
 *
 * This function:
 * 1. Generates a password reset link via Firebase Admin
 * 2. Sends a branded, translated email via Zoho SMTP
 * 3. Returns success (even if email doesn't exist, for security)
 */
export const sendCustomPasswordResetEmail = onCall(
  {
    region: "europe-west1",
    secrets: [EMAIL_USER, EMAIL_PASS],
  },
  async (request) => {
    const { email, language } = request.data as { email?: string; language?: string };

    // Validate email
    if (!email || typeof email !== "string") {
      throw new HttpsError("invalid-argument", "Email is required");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const lang = resolveLanguage(language);
    const template = templates[lang];

    try {
      // Try to get user info for personalization
      let firstName: string | undefined;
      let userExists = true;

      try {
        const userRecord = await admin.auth().getUserByEmail(normalizedEmail);
        firstName = userRecord.displayName?.split(" ")[0];
      } catch (error: any) {
        if (error.code === "auth/user-not-found") {
          userExists = false;
          // For security, we don't reveal if the email exists
          console.log(`Password reset requested for non-existent email: ${normalizedEmail.substring(0, 3)}***`);
        } else {
          throw error;
        }
      }

      // Only send email if user exists
      if (userExists) {
        // Generate password reset link
        const actionCodeSettings = {
          url: `https://sos-expat.com/${lang === "fr" ? "fr-fr" : "en-us"}/password-reset-confirm`,
          handleCodeInApp: false,
        };

        const resetLink = await admin.auth().generatePasswordResetLink(
          normalizedEmail,
          actionCodeSettings
        );

        // Create email transporter
        const transporter = nodemailer.createTransport({
          host: "smtp.zoho.eu",
          port: 465,
          secure: true,
          auth: {
            user: EMAIL_USER.value(),
            pass: EMAIL_PASS.value(),
          },
        });

        // Send email
        await transporter.sendMail({
          from: `"SOS Expat 🆘" <${EMAIL_USER.value()}>`,
          to: normalizedEmail,
          subject: template.subject,
          html: template.html(resetLink, firstName),
          text: template.text(resetLink, firstName),
        });

        console.log(`Password reset email sent to: ${normalizedEmail.substring(0, 3)}***`);
      }

      // Always return success for security (don't reveal if email exists)
      return {
        success: true,
        message: lang === "fr"
          ? "Si un compte existe avec cette adresse, tu recevras un email de réinitialisation ! 📧"
          : "If an account exists with this email, you'll receive a reset email! 📧"
      };

    } catch (error: any) {
      console.error("Error sending password reset email:", error);

      // Handle rate limiting
      if (error.code === "auth/too-many-requests") {
        throw new HttpsError(
          "resource-exhausted",
          lang === "fr"
            ? "Doucement ! 😅 Trop de tentatives. Réessaie dans quelques minutes."
            : "Easy there! 😅 Too many attempts. Try again in a few minutes."
        );
      }

      // Generic error for security
      throw new HttpsError(
        "internal",
        lang === "fr"
          ? "Oups, quelque chose s'est mal passé ! 😕 Réessaie dans un instant."
          : "Oops, something went wrong! 😕 Try again in a moment."
      );
    }
  }
);
