/**
 * Custom Password Reset Email Function
 *
 * Sends branded, translated password reset emails via Zoho SMTP
 * instead of Firebase's default generic template.
 *
 * Supports: FR, EN, ES, PT, DE, RU, AR, HI, CH (9 languages)
 * Brand colors: Red (#dc2626 → #b91c1c)
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import nodemailer from "nodemailer";
// P0 FIX: Import secrets from centralized secrets.ts - NEVER call defineSecret() here!
import { EMAIL_USER, EMAIL_PASS } from "../lib/secrets";
import { ALLOWED_ORIGINS } from "../lib/functionConfigs";

type SupportedLanguage = 'fr' | 'en' | 'es' | 'pt' | 'de' | 'ru' | 'ar' | 'hi' | 'ch';

/** Escape HTML special characters to prevent XSS in email templates */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

interface PasswordResetTemplate {
  subject: string;
  html: (resetLink: string, firstName?: string) => string;
  text: (resetLink: string, firstName?: string) => string;
}

// Email templates for password reset - Fun & friendly tone with SOS Expat red branding
const templates: Record<SupportedLanguage, PasswordResetTemplate> = {
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
  es: {
    subject: "¡Ups, olvidaste tu contraseña? ¡Te ayudamos! 🔑 - SOS Expat",
    html: (resetLink: string, firstName?: string) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restablecer contraseña</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #fef2f2;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 20px rgba(220, 38, 38, 0.15);">
          <tr>
            <td style="padding: 40px 40px 25px; text-align: center; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 800;">SOS Expat</h1>
              <p style="margin: 12px 0 0; color: rgba(255,255,255,0.95); font-size: 15px;">Tu aliado para la expatriación 🌍</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 25px; color: #1f2937; font-size: 26px; font-weight: 700;">
                ${firstName ? `¡Hola ${firstName}! 👋` : "¡Hola! 👋"}
              </h2>
              <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.7;">
                ¡No te preocupes, le pasa a los mejores! 😅
              </p>
              <p style="margin: 0 0 25px; color: #4b5563; font-size: 16px; line-height: 1.7;">
                Has solicitado restablecer tu contraseña de SOS Expat.
                Haz clic en el botón de abajo ¡y listo! 🚀
              </p>
              <table role="presentation" style="width: 100%; margin: 35px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetLink}" style="display: inline-block; padding: 18px 45px; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: #ffffff; text-decoration: none; font-size: 17px; font-weight: 700; border-radius: 10px; box-shadow: 0 6px 20px rgba(220, 38, 38, 0.35);">
                      🔐 Crear una nueva contraseña
                    </a>
                  </td>
                </tr>
              </table>
              <div style="background-color: #fef3c7; border-radius: 10px; padding: 16px 20px; margin: 25px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                  ⏰ <strong>Recordatorio:</strong> Este enlace caduca en <strong>1 hora</strong>.
                </p>
              </div>
              <p style="margin: 0 0 15px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                ¿No hiciste esta solicitud? No hay problema, simplemente ignora este correo.
                ¡Tu contraseña actual permanece segura! 🔒
              </p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6;">
                ¿El botón no funciona? Copia y pega este enlace en tu navegador:<br>
                <a href="${resetLink}" style="color: #dc2626; word-break: break-all;">${resetLink}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px; background-color: #fef2f2; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="margin: 0 0 12px; color: #6b7280; font-size: 14px;">
                ¿Preguntas? ¡Estamos aquí! 💬
                <a href="https://sos-expat.com/contact" style="color: #dc2626; text-decoration: none; font-weight: 600;">Contáctanos</a>
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} SOS Expat • Hecho con ❤️ para expatriados
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
${firstName ? `¡Hola ${firstName}! 👋` : "¡Hola! 👋"}

¡No te preocupes, le pasa a los mejores! 😅

Has solicitado restablecer tu contraseña de SOS Expat.
Haz clic en este enlace:

${resetLink}

⏰ Este enlace caduca en 1 hora.

¿No hiciste esta solicitud? Ignora este correo, tu contraseña permanece segura.

---
SOS Expat • Tu aliado para la expatriación 🌍
https://sos-expat.com
    `,
  },
  pt: {
    subject: "Ops, esqueceu sua senha? Nós te ajudamos! 🔑 - SOS Expat",
    html: (resetLink: string, firstName?: string) => `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redefinir senha</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #fef2f2;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 20px rgba(220, 38, 38, 0.15);">
          <tr>
            <td style="padding: 40px 40px 25px; text-align: center; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 800;">SOS Expat</h1>
              <p style="margin: 12px 0 0; color: rgba(255,255,255,0.95); font-size: 15px;">Seu aliado na expatriação 🌍</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 25px; color: #1f2937; font-size: 26px; font-weight: 700;">
                ${firstName ? `Oi ${firstName}! 👋` : "Oi! 👋"}
              </h2>
              <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.7;">
                Não se preocupe, acontece com os melhores! 😅
              </p>
              <p style="margin: 0 0 25px; color: #4b5563; font-size: 16px; line-height: 1.7;">
                Você pediu para redefinir sua senha do SOS Expat.
                Clique no botão abaixo e pronto! 🚀
              </p>
              <table role="presentation" style="width: 100%; margin: 35px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetLink}" style="display: inline-block; padding: 18px 45px; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: #ffffff; text-decoration: none; font-size: 17px; font-weight: 700; border-radius: 10px; box-shadow: 0 6px 20px rgba(220, 38, 38, 0.35);">
                      🔐 Criar uma nova senha
                    </a>
                  </td>
                </tr>
              </table>
              <div style="background-color: #fef3c7; border-radius: 10px; padding: 16px 20px; margin: 25px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                  ⏰ <strong>Lembrete:</strong> Este link expira em <strong>1 hora</strong>.
                </p>
              </div>
              <p style="margin: 0 0 15px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Não fez essa solicitação? Sem problemas, apenas ignore este email.
                Sua senha atual permanece segura! 🔒
              </p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6;">
                O botão não funciona? Copie e cole este link no seu navegador:<br>
                <a href="${resetLink}" style="color: #dc2626; word-break: break-all;">${resetLink}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px; background-color: #fef2f2; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="margin: 0 0 12px; color: #6b7280; font-size: 14px;">
                Dúvidas? Estamos aqui! 💬
                <a href="https://sos-expat.com/contact" style="color: #dc2626; text-decoration: none; font-weight: 600;">Fale conosco</a>
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} SOS Expat • Feito com ❤️ para expatriados
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
${firstName ? `Oi ${firstName}! 👋` : "Oi! 👋"}

Não se preocupe, acontece com os melhores! 😅

Você pediu para redefinir sua senha do SOS Expat.
Clique neste link:

${resetLink}

⏰ Este link expira em 1 hora.

Não fez essa solicitação? Ignore este email, sua senha permanece segura.

---
SOS Expat • Seu aliado na expatriação 🌍
https://sos-expat.com
    `,
  },
  de: {
    subject: "Ups, Passwort vergessen? Wir helfen dir! 🔑 - SOS Expat",
    html: (resetLink: string, firstName?: string) => `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Passwort zurücksetzen</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #fef2f2;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 20px rgba(220, 38, 38, 0.15);">
          <tr>
            <td style="padding: 40px 40px 25px; text-align: center; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 800;">SOS Expat</h1>
              <p style="margin: 12px 0 0; color: rgba(255,255,255,0.95); font-size: 15px;">Dein Begleiter für Expats weltweit 🌍</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 25px; color: #1f2937; font-size: 26px; font-weight: 700;">
                ${firstName ? `Hallo ${firstName}! 👋` : "Hallo! 👋"}
              </h2>
              <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.7;">
                Keine Sorge, das passiert den Besten! 😅
              </p>
              <p style="margin: 0 0 25px; color: #4b5563; font-size: 16px; line-height: 1.7;">
                Du hast darum gebeten, dein SOS Expat Passwort zurückzusetzen.
                Klicke auf den Button unten und los geht's! 🚀
              </p>
              <table role="presentation" style="width: 100%; margin: 35px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetLink}" style="display: inline-block; padding: 18px 45px; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: #ffffff; text-decoration: none; font-size: 17px; font-weight: 700; border-radius: 10px; box-shadow: 0 6px 20px rgba(220, 38, 38, 0.35);">
                      🔐 Neues Passwort erstellen
                    </a>
                  </td>
                </tr>
              </table>
              <div style="background-color: #fef3c7; border-radius: 10px; padding: 16px 20px; margin: 25px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                  ⏰ <strong>Hinweis:</strong> Dieser Link läuft in <strong>1 Stunde</strong> ab.
                </p>
              </div>
              <p style="margin: 0 0 15px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Nicht angefordert? Kein Problem, ignoriere einfach diese E-Mail.
                Dein aktuelles Passwort bleibt sicher! 🔒
              </p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6;">
                Button funktioniert nicht? Kopiere diesen Link in deinen Browser:<br>
                <a href="${resetLink}" style="color: #dc2626; word-break: break-all;">${resetLink}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px; background-color: #fef2f2; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="margin: 0 0 12px; color: #6b7280; font-size: 14px;">
                Fragen? Wir sind da! 💬
                <a href="https://sos-expat.com/contact" style="color: #dc2626; text-decoration: none; font-weight: 600;">Kontaktiere uns</a>
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} SOS Expat • Mit ❤️ für Expats gemacht
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
${firstName ? `Hallo ${firstName}! 👋` : "Hallo! 👋"}

Keine Sorge, das passiert den Besten! 😅

Du hast darum gebeten, dein SOS Expat Passwort zurückzusetzen.
Klicke auf diesen Link:

${resetLink}

⏰ Dieser Link läuft in 1 Stunde ab.

Nicht angefordert? Ignoriere diese E-Mail, dein Passwort bleibt sicher.

---
SOS Expat • Dein Begleiter für Expats weltweit 🌍
https://sos-expat.com
    `,
  },
  ru: {
    subject: "Упс, забыли пароль? Мы поможем! 🔑 - SOS Expat",
    html: (resetLink: string, firstName?: string) => `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Сброс пароля</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #fef2f2;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 20px rgba(220, 38, 38, 0.15);">
          <tr>
            <td style="padding: 40px 40px 25px; text-align: center; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 800;">SOS Expat</h1>
              <p style="margin: 12px 0 0; color: rgba(255,255,255,0.95); font-size: 15px;">Ваш помощник для экспатов по всему миру 🌍</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 25px; color: #1f2937; font-size: 26px; font-weight: 700;">
                ${firstName ? `Привет, ${firstName}! 👋` : "Привет! 👋"}
              </h2>
              <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.7;">
                Не волнуйтесь, это случается с лучшими из нас! 😅
              </p>
              <p style="margin: 0 0 25px; color: #4b5563; font-size: 16px; line-height: 1.7;">
                Вы запросили сброс пароля SOS Expat.
                Нажмите кнопку ниже и готово! 🚀
              </p>
              <table role="presentation" style="width: 100%; margin: 35px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetLink}" style="display: inline-block; padding: 18px 45px; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: #ffffff; text-decoration: none; font-size: 17px; font-weight: 700; border-radius: 10px; box-shadow: 0 6px 20px rgba(220, 38, 38, 0.35);">
                      🔐 Создать новый пароль
                    </a>
                  </td>
                </tr>
              </table>
              <div style="background-color: #fef3c7; border-radius: 10px; padding: 16px 20px; margin: 25px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                  ⏰ <strong>Напоминание:</strong> Эта ссылка действительна <strong>1 час</strong>.
                </p>
              </div>
              <p style="margin: 0 0 15px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Не запрашивали? Без проблем, просто проигнорируйте это письмо.
                Ваш текущий пароль остаётся в безопасности! 🔒
              </p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6;">
                Кнопка не работает? Скопируйте эту ссылку в браузер:<br>
                <a href="${resetLink}" style="color: #dc2626; word-break: break-all;">${resetLink}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px; background-color: #fef2f2; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="margin: 0 0 12px; color: #6b7280; font-size: 14px;">
                Вопросы? Мы здесь! 💬
                <a href="https://sos-expat.com/contact" style="color: #dc2626; text-decoration: none; font-weight: 600;">Свяжитесь с нами</a>
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} SOS Expat • Сделано с ❤️ для экспатов
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
${firstName ? `Привет, ${firstName}! 👋` : "Привет! 👋"}

Не волнуйтесь, это случается с лучшими из нас! 😅

Вы запросили сброс пароля SOS Expat.
Перейдите по этой ссылке:

${resetLink}

⏰ Ссылка действительна 1 час.

Не запрашивали? Проигнорируйте это письмо, ваш пароль в безопасности.

---
SOS Expat • Ваш помощник для экспатов 🌍
https://sos-expat.com
    `,
  },
  ar: {
    subject: "عفواً، نسيت كلمة المرور؟ نحن هنا للمساعدة! 🔑 - SOS Expat",
    html: (resetLink: string, firstName?: string) => `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>إعادة تعيين كلمة المرور</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #fef2f2; direction: rtl;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 20px rgba(220, 38, 38, 0.15);">
          <tr>
            <td style="padding: 40px 40px 25px; text-align: center; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 800;">SOS Expat</h1>
              <p style="margin: 12px 0 0; color: rgba(255,255,255,0.95); font-size: 15px;">رفيقك للمغتربين حول العالم 🌍</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 25px; color: #1f2937; font-size: 26px; font-weight: 700;">
                ${firstName ? `مرحباً ${firstName}! 👋` : "مرحباً! 👋"}
              </h2>
              <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.7;">
                لا تقلق، هذا يحدث لأفضلنا! 😅
              </p>
              <p style="margin: 0 0 25px; color: #4b5563; font-size: 16px; line-height: 1.7;">
                لقد طلبت إعادة تعيين كلمة مرور SOS Expat.
                انقر على الزر أدناه وانطلق! 🚀
              </p>
              <table role="presentation" style="width: 100%; margin: 35px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetLink}" style="display: inline-block; padding: 18px 45px; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: #ffffff; text-decoration: none; font-size: 17px; font-weight: 700; border-radius: 10px; box-shadow: 0 6px 20px rgba(220, 38, 38, 0.35);">
                      🔐 إنشاء كلمة مرور جديدة
                    </a>
                  </td>
                </tr>
              </table>
              <div style="background-color: #fef3c7; border-radius: 10px; padding: 16px 20px; margin: 25px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                  ⏰ <strong>تذكير:</strong> هذا الرابط صالح لمدة <strong>ساعة واحدة</strong>.
                </p>
              </div>
              <p style="margin: 0 0 15px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                لم تطلب هذا؟ لا مشكلة، تجاهل هذا البريد الإلكتروني.
                كلمة المرور الحالية تبقى آمنة! 🔒
              </p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6;">
                الزر لا يعمل؟ انسخ هذا الرابط في متصفحك:<br>
                <a href="${resetLink}" style="color: #dc2626; word-break: break-all;">${resetLink}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px; background-color: #fef2f2; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="margin: 0 0 12px; color: #6b7280; font-size: 14px;">
                أسئلة؟ نحن هنا! 💬
                <a href="https://sos-expat.com/contact" style="color: #dc2626; text-decoration: none; font-weight: 600;">تواصل معنا</a>
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} SOS Expat • صنع بـ ❤️ للمغتربين
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
${firstName ? `مرحباً ${firstName}! 👋` : "مرحباً! 👋"}

لا تقلق، هذا يحدث لأفضلنا! 😅

لقد طلبت إعادة تعيين كلمة مرور SOS Expat.
انقر على هذا الرابط:

${resetLink}

⏰ هذا الرابط صالح لمدة ساعة واحدة.

لم تطلب هذا؟ تجاهل هذا البريد، كلمة المرور تبقى آمنة.

---
SOS Expat • رفيقك للمغتربين 🌍
https://sos-expat.com
    `,
  },
  hi: {
    subject: "उफ़, पासवर्ड भूल गए? हम मदद करेंगे! 🔑 - SOS Expat",
    html: (resetLink: string, firstName?: string) => `
<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>पासवर्ड रीसेट</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #fef2f2;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 20px rgba(220, 38, 38, 0.15);">
          <tr>
            <td style="padding: 40px 40px 25px; text-align: center; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 800;">SOS Expat</h1>
              <p style="margin: 12px 0 0; color: rgba(255,255,255,0.95); font-size: 15px;">दुनिया भर में प्रवासियों के लिए आपका साथी 🌍</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 25px; color: #1f2937; font-size: 26px; font-weight: 700;">
                ${firstName ? `नमस्ते ${firstName}! 👋` : "नमस्ते! 👋"}
              </h2>
              <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.7;">
                चिंता मत करो, यह सबसे अच्छे लोगों के साथ होता है! 😅
              </p>
              <p style="margin: 0 0 25px; color: #4b5563; font-size: 16px; line-height: 1.7;">
                आपने SOS Expat पासवर्ड रीसेट करने का अनुरोध किया है।
                नीचे दिए गए बटन पर क्लिक करें और शुरू करें! 🚀
              </p>
              <table role="presentation" style="width: 100%; margin: 35px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetLink}" style="display: inline-block; padding: 18px 45px; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: #ffffff; text-decoration: none; font-size: 17px; font-weight: 700; border-radius: 10px; box-shadow: 0 6px 20px rgba(220, 38, 38, 0.35);">
                      🔐 नया पासवर्ड बनाएं
                    </a>
                  </td>
                </tr>
              </table>
              <div style="background-color: #fef3c7; border-radius: 10px; padding: 16px 20px; margin: 25px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                  ⏰ <strong>याद रखें:</strong> यह लिंक <strong>1 घंटे</strong> में समाप्त हो जाएगा।
                </p>
              </div>
              <p style="margin: 0 0 15px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                यह अनुरोध नहीं किया? कोई बात नहीं, इस ईमेल को अनदेखा करें।
                आपका वर्तमान पासवर्ड सुरक्षित है! 🔒
              </p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6;">
                बटन काम नहीं कर रहा? इस लिंक को अपने ब्राउज़र में कॉपी करें:<br>
                <a href="${resetLink}" style="color: #dc2626; word-break: break-all;">${resetLink}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px; background-color: #fef2f2; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="margin: 0 0 12px; color: #6b7280; font-size: 14px;">
                सवाल हैं? हम यहाँ हैं! 💬
                <a href="https://sos-expat.com/contact" style="color: #dc2626; text-decoration: none; font-weight: 600;">संपर्क करें</a>
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} SOS Expat • प्रवासियों के लिए ❤️ से बनाया गया
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
${firstName ? `नमस्ते ${firstName}! 👋` : "नमस्ते! 👋"}

चिंता मत करो, यह सबसे अच्छे लोगों के साथ होता है! 😅

आपने SOS Expat पासवर्ड रीसेट करने का अनुरोध किया है।
इस लिंक पर क्लिक करें:

${resetLink}

⏰ यह लिंक 1 घंटे में समाप्त हो जाएगा।

यह अनुरोध नहीं किया? इस ईमेल को अनदेखा करें, आपका पासवर्ड सुरक्षित है।

---
SOS Expat • प्रवासियों के लिए आपका साथी 🌍
https://sos-expat.com
    `,
  },
  ch: {
    subject: "糟糕，忘记密码了？我们来帮您！🔑 - SOS Expat",
    html: (resetLink: string, firstName?: string) => `
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>重置密码</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #fef2f2;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 20px rgba(220, 38, 38, 0.15);">
          <tr>
            <td style="padding: 40px 40px 25px; text-align: center; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 800;">SOS Expat</h1>
              <p style="margin: 12px 0 0; color: rgba(255,255,255,0.95); font-size: 15px;">您的全球外籍人士助手 🌍</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 25px; color: #1f2937; font-size: 26px; font-weight: 700;">
                ${firstName ? `您好 ${firstName}！👋` : "您好！👋"}
              </h2>
              <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.7;">
                别担心，这种事每个人都会遇到！😅
              </p>
              <p style="margin: 0 0 25px; color: #4b5563; font-size: 16px; line-height: 1.7;">
                您请求重置 SOS Expat 密码。
                点击下面的按钮即可开始！🚀
              </p>
              <table role="presentation" style="width: 100%; margin: 35px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetLink}" style="display: inline-block; padding: 18px 45px; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: #ffffff; text-decoration: none; font-size: 17px; font-weight: 700; border-radius: 10px; box-shadow: 0 6px 20px rgba(220, 38, 38, 0.35);">
                      🔐 创建新密码
                    </a>
                  </td>
                </tr>
              </table>
              <div style="background-color: #fef3c7; border-radius: 10px; padding: 16px 20px; margin: 25px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                  ⏰ <strong>提醒：</strong>此链接将在 <strong>1小时</strong>后失效。
                </p>
              </div>
              <p style="margin: 0 0 15px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                没有发起此请求？没关系，请忽略此邮件。
                您当前的密码仍然安全！🔒
              </p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6;">
                按钮不起作用？请将此链接复制到浏览器：<br>
                <a href="${resetLink}" style="color: #dc2626; word-break: break-all;">${resetLink}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px; background-color: #fef2f2; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="margin: 0 0 12px; color: #6b7280; font-size: 14px;">
                有问题？我们随时为您服务！💬
                <a href="https://sos-expat.com/contact" style="color: #dc2626; text-decoration: none; font-weight: 600;">联系我们</a>
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} SOS Expat • 用 ❤️ 为外籍人士打造
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
${firstName ? `您好 ${firstName}！👋` : "您好！👋"}

别担心，这种事每个人都会遇到！😅

您请求重置 SOS Expat 密码。
请点击此链接：

${resetLink}

⏰ 此链接将在1小时后失效。

没有发起此请求？请忽略此邮件，您的密码仍然安全。

---
SOS Expat • 您的全球外籍人士助手 🌍
https://sos-expat.com
    `,
  },
};

// Resolve language to one of the 9 supported languages (fallback to EN)
function resolveLanguage(lang?: string): SupportedLanguage {
  if (!lang) return "en";
  const normalized = lang.toLowerCase();

  // Map language codes to supported languages
  if (normalized.startsWith("fr")) return "fr";
  if (normalized.startsWith("es")) return "es";
  if (normalized.startsWith("pt")) return "pt";
  if (normalized.startsWith("de")) return "de";
  if (normalized.startsWith("ru")) return "ru";
  if (normalized.startsWith("ar")) return "ar";
  if (normalized.startsWith("hi")) return "hi";
  if (normalized.startsWith("zh") || normalized.startsWith("ch")) return "ch";
  if (normalized.startsWith("en")) return "en";

  // Default fallback to English
  return "en";
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
    cors: ALLOWED_ORIGINS,
    memory: "256MiB",
    cpu: 0.083,
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
        const rawFirstName = userRecord.displayName?.split(" ")[0];
        firstName = rawFirstName ? escapeHtml(rawFirstName) : undefined;
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
        // Map language to URL locale
        const urlLocaleMap: Record<SupportedLanguage, string> = {
          fr: "fr-fr",
          en: "en-us",
          es: "es-es",
          pt: "pt-pt",
          de: "de-de",
          ru: "ru-ru",
          ar: "ar-sa",
          hi: "hi-in",
          ch: "zh-cn",
        };
        const urlLocale = urlLocaleMap[lang] || "en-us";

        // Generate password reset link
        const actionCodeSettings = {
          url: `https://sos-expat.com/${urlLocale}/password-reset-confirm`,
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
          // P1 FIX: Explicit SMTP timeouts to prevent function from hanging indefinitely
          connectionTimeout: 10000,  // 10s to establish TCP connection
          greetingTimeout: 10000,    // 10s for SMTP greeting
          socketTimeout: 30000,      // 30s per socket operation (send)
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
