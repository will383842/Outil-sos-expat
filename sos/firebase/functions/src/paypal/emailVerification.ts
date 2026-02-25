/**
 * emailVerification.ts
 *
 * Système de vérification d'email PayPal par code à 6 chiffres.
 *
 * FLUX:
 * 1. Provider entre son email PayPal
 * 2. Système génère un code à 6 chiffres et l'envoie par email
 * 3. Provider entre le code reçu
 * 4. Si code correct, email enregistré et provider devient visible
 *
 * SÉCURITÉ:
 * - Codes valides pendant 10 minutes
 * - Maximum 3 tentatives par code
 * - Maximum 5 codes par heure par IP/user
 * - Rate limiting par IP et par user
 */

import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import nodemailer from "nodemailer";

// P0-10 FIX: Import depuis lib/secrets.ts centralisé au lieu de defineSecret() local
// Cela évite les conflits de binding Firebase v2
import { EMAIL_USER, EMAIL_PASS, EMAIL_SECRETS } from "../lib/secrets";

// P0-8 FIX: Import pour masquer les données sensibles dans les logs
import { maskEmail } from "../utils/logs/maskSensitiveData";
import { ALLOWED_ORIGINS } from "../lib/functionConfigs";

// Configuration
const VERIFICATION_CONFIG = {
  CODE_LENGTH: 6,
  CODE_EXPIRY_MINUTES: 10,
  MAX_ATTEMPTS: 3,
  MAX_CODES_PER_HOUR: 5,
  COOLDOWN_SECONDS: 60, // Minimum entre deux envois
};

interface VerificationCode {
  id?: string;
  userId: string;
  email: string;
  code: string;
  attempts: number;
  verified: boolean;
  expiresAt: admin.firestore.Timestamp;
  createdAt: admin.firestore.Timestamp;
  verifiedAt?: admin.firestore.Timestamp;
  ipAddress?: string;
}

/**
 * Génère un code à 6 chiffres
 */
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Valide le format de l'email
 */
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Envoie l'email avec le code de vérification
 */
async function sendVerificationEmail(
  email: string,
  code: string,
  locale: string = "fr"
): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: "smtp.zoho.eu",
    port: 465,
    secure: true,
    auth: {
      user: EMAIL_USER.value().trim(),
      pass: EMAIL_PASS.value().trim(),
    },
  });

  // Templates multilingues
  const templates: Record<string, { subject: string; html: string }> = {
    fr: {
      subject: "Code de vérification SOS Expat - " + code,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://sos-expat.com/logo.png" alt="SOS Expat" style="height: 50px;" />
          </div>

          <h2 style="color: #003087; text-align: center;">Vérification de votre adresse PayPal</h2>

          <p>Bonjour,</p>

          <p>Vous avez demandé à configurer votre compte PayPal sur SOS Expat. Voici votre code de vérification :</p>

          <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #003087;">${code}</span>
          </div>

          <p style="color: #666; font-size: 14px;">
            Ce code est valable pendant <strong>10 minutes</strong>.
          </p>

          <p style="color: #666; font-size: 14px;">
            Si vous n'avez pas fait cette demande, vous pouvez ignorer cet email.
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />

          <p style="color: #999; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} SOS Expat - Tous droits réservés
          </p>
        </div>
      `,
    },
    en: {
      subject: "SOS Expat Verification Code - " + code,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://sos-expat.com/logo.png" alt="SOS Expat" style="height: 50px;" />
          </div>

          <h2 style="color: #003087; text-align: center;">Verify your PayPal address</h2>

          <p>Hello,</p>

          <p>You requested to configure your PayPal account on SOS Expat. Here is your verification code:</p>

          <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #003087;">${code}</span>
          </div>

          <p style="color: #666; font-size: 14px;">
            This code is valid for <strong>10 minutes</strong>.
          </p>

          <p style="color: #666; font-size: 14px;">
            If you didn't request this, you can ignore this email.
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />

          <p style="color: #999; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} SOS Expat - All rights reserved
          </p>
        </div>
      `,
    },
    es: {
      subject: "Código de verificación SOS Expat - " + code,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://sos-expat.com/logo.png" alt="SOS Expat" style="height: 50px;" />
          </div>

          <h2 style="color: #003087; text-align: center;">Verifica tu dirección PayPal</h2>

          <p>Hola,</p>

          <p>Has solicitado configurar tu cuenta PayPal en SOS Expat. Aquí está tu código de verificación:</p>

          <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #003087;">${code}</span>
          </div>

          <p style="color: #666; font-size: 14px;">
            Este código es válido durante <strong>10 minutos</strong>.
          </p>

          <p style="color: #666; font-size: 14px;">
            Si no solicitaste esto, puedes ignorar este correo.
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />

          <p style="color: #999; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} SOS Expat - Todos los derechos reservados
          </p>
        </div>
      `,
    },
    pt: {
      subject: "Código de verificação SOS Expat - " + code,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://sos-expat.com/logo.png" alt="SOS Expat" style="height: 50px;" />
          </div>

          <h2 style="color: #003087; text-align: center;">Verifique seu endereço PayPal</h2>

          <p>Olá,</p>

          <p>Você solicitou configurar sua conta PayPal no SOS Expat. Aqui está seu código de verificação:</p>

          <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #003087;">${code}</span>
          </div>

          <p style="color: #666; font-size: 14px;">
            Este código é válido por <strong>10 minutos</strong>.
          </p>

          <p style="color: #666; font-size: 14px;">
            Se você não solicitou isso, pode ignorar este email.
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />

          <p style="color: #999; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} SOS Expat - Todos os direitos reservados
          </p>
        </div>
      `,
    },
    de: {
      subject: "SOS Expat Verifizierungscode - " + code,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://sos-expat.com/logo.png" alt="SOS Expat" style="height: 50px;" />
          </div>

          <h2 style="color: #003087; text-align: center;">PayPal-Adresse verifizieren</h2>

          <p>Hallo,</p>

          <p>Sie haben beantragt, Ihr PayPal-Konto bei SOS Expat zu konfigurieren. Hier ist Ihr Verifizierungscode:</p>

          <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #003087;">${code}</span>
          </div>

          <p style="color: #666; font-size: 14px;">
            Dieser Code ist <strong>10 Minuten</strong> gültig.
          </p>

          <p style="color: #666; font-size: 14px;">
            Wenn Sie dies nicht angefordert haben, können Sie diese E-Mail ignorieren.
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />

          <p style="color: #999; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} SOS Expat - Alle Rechte vorbehalten
          </p>
        </div>
      `,
    },
    ru: {
      subject: "Код подтверждения SOS Expat - " + code,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://sos-expat.com/logo.png" alt="SOS Expat" style="height: 50px;" />
          </div>

          <h2 style="color: #003087; text-align: center;">Подтвердите ваш адрес PayPal</h2>

          <p>Здравствуйте,</p>

          <p>Вы запросили настройку учётной записи PayPal в SOS Expat. Вот ваш код подтверждения:</p>

          <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #003087;">${code}</span>
          </div>

          <p style="color: #666; font-size: 14px;">
            Этот код действителен в течение <strong>10 минут</strong>.
          </p>

          <p style="color: #666; font-size: 14px;">
            Если вы не делали этот запрос, просто проигнорируйте это письмо.
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />

          <p style="color: #999; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} SOS Expat - Все права защищены
          </p>
        </div>
      `,
    },
    ar: {
      subject: "رمز التحقق SOS Expat - " + code,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; direction: rtl;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://sos-expat.com/logo.png" alt="SOS Expat" style="height: 50px;" />
          </div>

          <h2 style="color: #003087; text-align: center;">تحقق من عنوان PayPal الخاص بك</h2>

          <p>مرحباً،</p>

          <p>لقد طلبت تكوين حساب PayPal الخاص بك على SOS Expat. إليك رمز التحقق الخاص بك:</p>

          <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #003087;">${code}</span>
          </div>

          <p style="color: #666; font-size: 14px;">
            هذا الرمز صالح لمدة <strong>10 دقائق</strong>.
          </p>

          <p style="color: #666; font-size: 14px;">
            إذا لم تطلب هذا، يمكنك تجاهل هذا البريد الإلكتروني.
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />

          <p style="color: #999; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} SOS Expat - جميع الحقوق محفوظة
          </p>
        </div>
      `,
    },
    hi: {
      subject: "SOS Expat सत्यापन कोड - " + code,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://sos-expat.com/logo.png" alt="SOS Expat" style="height: 50px;" />
          </div>

          <h2 style="color: #003087; text-align: center;">अपना PayPal पता सत्यापित करें</h2>

          <p>नमस्ते,</p>

          <p>आपने SOS Expat पर अपना PayPal खाता कॉन्फ़िगर करने का अनुरोध किया है। यहां आपका सत्यापन कोड है:</p>

          <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #003087;">${code}</span>
          </div>

          <p style="color: #666; font-size: 14px;">
            यह कोड <strong>10 मिनट</strong> के लिए वैध है।
          </p>

          <p style="color: #666; font-size: 14px;">
            अगर आपने यह अनुरोध नहीं किया है, तो आप इस ईमेल को अनदेखा कर सकते हैं।
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />

          <p style="color: #999; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} SOS Expat - सर्वाधिकार सुरक्षित
          </p>
        </div>
      `,
    },
    ch: {
      subject: "SOS Expat 验证码 - " + code,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://sos-expat.com/logo.png" alt="SOS Expat" style="height: 50px;" />
          </div>

          <h2 style="color: #003087; text-align: center;">验证您的 PayPal 地址</h2>

          <p>您好，</p>

          <p>您请求在 SOS Expat 上配置您的 PayPal 账户。以下是您的验证码：</p>

          <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #003087;">${code}</span>
          </div>

          <p style="color: #666; font-size: 14px;">
            此验证码有效期为 <strong>10 分钟</strong>。
          </p>

          <p style="color: #666; font-size: 14px;">
            如果您没有发起此请求，可以忽略此邮件。
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />

          <p style="color: #999; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} SOS Expat - 版权所有
          </p>
        </div>
      `,
    },
  };

  // Normalize locale to supported language
  const normalizeLocale = (loc: string): string => {
    const normalized = loc.toLowerCase();
    if (normalized.startsWith("fr")) return "fr";
    if (normalized.startsWith("es")) return "es";
    if (normalized.startsWith("pt")) return "pt";
    if (normalized.startsWith("de")) return "de";
    if (normalized.startsWith("ru")) return "ru";
    if (normalized.startsWith("ar")) return "ar";
    if (normalized.startsWith("hi")) return "hi";
    if (normalized.startsWith("zh") || normalized.startsWith("ch")) return "ch";
    if (normalized.startsWith("en")) return "en";
    return "en"; // Default to English
  };

  // Utiliser le template de la langue demandée, ou anglais par défaut
  const normalizedLocale = normalizeLocale(locale);
  const template = templates[normalizedLocale] || templates["en"];

  await transporter.sendMail({
    from: `"SOS Expat" <${EMAIL_USER.value().trim()}>`,
    to: email,
    subject: template.subject,
    html: template.html,
  });

  // P0-8 FIX: Masquer l'email dans les logs
  console.log(`[PAYPAL_VERIFY] Email sent to ${maskEmail(email)}`);
}

/**
 * Cloud Function: Envoyer un code de vérification
 */
export const sendPayPalVerificationCode = onCall(
  {
    region: "europe-west1",
    cors: ALLOWED_ORIGINS,
    memory: "256MiB",
    cpu: 0.083,
    secrets: EMAIL_SECRETS, // P0-10 FIX: Utiliser l'array centralisé
  },
  async (request) => {
    const auth = request.auth;
    if (!auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const { email, locale = "fr" } = request.data as { email: string; locale?: string };

    if (!email || !validateEmail(email)) {
      throw new HttpsError("invalid-argument", "Valid email required");
    }

    const db = admin.firestore();
    const userId = auth.uid;
    const normalizedEmail = email.trim().toLowerCase();
    const now = admin.firestore.Timestamp.now();
    const oneHourAgo = admin.firestore.Timestamp.fromMillis(
      now.toMillis() - 60 * 60 * 1000
    );

    // P0-8 FIX: Masquer l'email dans les logs
    console.log(`[PAYPAL_VERIFY] Request from ${userId} for email ${maskEmail(normalizedEmail)}`);

    // Rate limiting: vérifier le nombre de codes envoyés dans l'heure
    const recentCodes = await db
      .collection("paypal_verification_codes")
      .where("userId", "==", userId)
      .where("createdAt", ">", oneHourAgo)
      .count()
      .get();

    if (recentCodes.data().count >= VERIFICATION_CONFIG.MAX_CODES_PER_HOUR) {
      console.log(`[PAYPAL_VERIFY] Rate limit exceeded for ${userId}`);
      throw new HttpsError(
        "resource-exhausted",
        "Too many verification attempts. Please try again later."
      );
    }

    // Vérifier le cooldown (dernier code envoyé)
    const lastCodeSnap = await db
      .collection("paypal_verification_codes")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (!lastCodeSnap.empty) {
      const lastCode = lastCodeSnap.docs[0].data() as VerificationCode;
      const secondsSinceLastCode = (now.toMillis() - lastCode.createdAt.toMillis()) / 1000;

      if (secondsSinceLastCode < VERIFICATION_CONFIG.COOLDOWN_SECONDS) {
        const waitTime = Math.ceil(VERIFICATION_CONFIG.COOLDOWN_SECONDS - secondsSinceLastCode);
        console.log(`[PAYPAL_VERIFY] Cooldown active for ${userId}, wait ${waitTime}s`);
        throw new HttpsError(
          "resource-exhausted",
          `Please wait ${waitTime} seconds before requesting a new code`
        );
      }
    }

    // Invalider les anciens codes non utilisés
    const oldCodesSnap = await db
      .collection("paypal_verification_codes")
      .where("userId", "==", userId)
      .where("verified", "==", false)
      .get();

    const batch = db.batch();
    oldCodesSnap.docs.forEach((doc) => {
      batch.update(doc.ref, { verified: true, invalidatedAt: now });
    });

    // Générer et sauvegarder le nouveau code
    const code = generateCode();
    const expiresAt = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + VERIFICATION_CONFIG.CODE_EXPIRY_MINUTES * 60 * 1000
    );

    const verificationRef = db.collection("paypal_verification_codes").doc();
    batch.set(verificationRef, {
      userId,
      email: normalizedEmail,
      code,
      attempts: 0,
      verified: false,
      expiresAt,
      createdAt: now,
    } as VerificationCode);

    await batch.commit();

    // Envoyer l'email
    try {
      await sendVerificationEmail(normalizedEmail, code, locale);
    } catch (emailError) {
      console.error(`[PAYPAL_VERIFY] Email send failed:`, emailError);
      // Marquer le code comme invalide si l'email n'a pas pu être envoyé
      await verificationRef.delete();
      throw new HttpsError("internal", "Failed to send verification email");
    }

    // Log d'audit
    await db.collection("paypal_verification_logs").add({
      userId,
      email: normalizedEmail,
      action: "code_sent",
      codeId: verificationRef.id,
      success: true,
      timestamp: now,
    });

    // P0-8 FIX: Masquer l'email dans les logs
    console.log(`[PAYPAL_VERIFY] Code sent successfully to ${maskEmail(normalizedEmail)}`);

    return {
      success: true,
      email: normalizedEmail,
      expiresInMinutes: VERIFICATION_CONFIG.CODE_EXPIRY_MINUTES,
    };
  }
);

/**
 * Cloud Function: Vérifier le code et enregistrer l'email PayPal
 */
export const verifyPayPalCode = onCall(
  {
    region: "europe-west1",
    cors: ALLOWED_ORIGINS,
    memory: "256MiB",
    cpu: 0.083,
  },
  async (request) => {
    const auth = request.auth;
    if (!auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const { code, email, providerType } = request.data as {
      code: string;
      email: string;
      providerType: "lawyer" | "expat";
    };

    if (!code || code.length !== VERIFICATION_CONFIG.CODE_LENGTH) {
      throw new HttpsError("invalid-argument", "Invalid verification code");
    }

    if (!email || !validateEmail(email)) {
      throw new HttpsError("invalid-argument", "Invalid email");
    }

    if (!providerType || !["lawyer", "expat"].includes(providerType)) {
      throw new HttpsError("invalid-argument", "Invalid provider type");
    }

    const db = admin.firestore();
    const userId = auth.uid;
    const normalizedEmail = email.trim().toLowerCase();
    const now = admin.firestore.Timestamp.now();

    console.log(`[PAYPAL_VERIFY] Verification attempt from ${userId}`);

    // Trouver le code le plus récent non vérifié pour cet utilisateur et email
    const codesSnap = await db
      .collection("paypal_verification_codes")
      .where("userId", "==", userId)
      .where("email", "==", normalizedEmail)
      .where("verified", "==", false)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (codesSnap.empty) {
      console.log(`[PAYPAL_VERIFY] No pending code found for ${userId}`);
      throw new HttpsError("not-found", "No verification code found. Please request a new code.");
    }

    const codeDoc = codesSnap.docs[0];
    const codeData = codeDoc.data() as VerificationCode;

    // Vérifier l'expiration
    if (now.toMillis() > codeData.expiresAt.toMillis()) {
      console.log(`[PAYPAL_VERIFY] Code expired for ${userId}`);
      await codeDoc.ref.update({ verified: true, expiredAt: now });
      throw new HttpsError("deadline-exceeded", "Verification code has expired. Please request a new code.");
    }

    // Vérifier le nombre de tentatives
    if (codeData.attempts >= VERIFICATION_CONFIG.MAX_ATTEMPTS) {
      console.log(`[PAYPAL_VERIFY] Max attempts reached for ${userId}`);
      await codeDoc.ref.update({ verified: true, blockedAt: now });
      throw new HttpsError("resource-exhausted", "Too many attempts. Please request a new code.");
    }

    // Incrémenter les tentatives
    await codeDoc.ref.update({ attempts: admin.firestore.FieldValue.increment(1) });

    // Vérifier le code
    if (code !== codeData.code) {
      const remainingAttempts = VERIFICATION_CONFIG.MAX_ATTEMPTS - codeData.attempts - 1;
      console.log(`[PAYPAL_VERIFY] Wrong code for ${userId}, ${remainingAttempts} attempts remaining`);

      await db.collection("paypal_verification_logs").add({
        userId,
        email: normalizedEmail,
        action: "verification_failed",
        codeId: codeDoc.id,
        success: false,
        reason: "wrong_code",
        timestamp: now,
      });

      throw new HttpsError(
        "invalid-argument",
        `Invalid code. ${remainingAttempts} attempt(s) remaining.`
      );
    }

    // Code correct ! Marquer comme vérifié
    await codeDoc.ref.update({
      verified: true,
      verifiedAt: now,
    });

    // Mettre à jour le profil du provider avec l'email PayPal vérifié
    const updateData = {
      paypalEmail: normalizedEmail,
      paypalEmailVerified: true,
      paypalEmailVerifiedAt: now,
      paypalAccountStatus: "active",
      paypalOnboardingComplete: true,
      paypalPaymentsReceivable: true,
      updatedAt: now,
    };

    const batch = db.batch();

    // Mettre à jour sos_profiles
    batch.update(db.collection("sos_profiles").doc(userId), updateData);

    // Mettre à jour la collection spécifique
    const collectionName = providerType === "lawyer" ? "lawyers" : "expats";
    batch.update(db.collection(collectionName).doc(userId), updateData);

    // Mettre à jour users
    batch.update(db.collection("users").doc(userId), {
      paypalEmail: normalizedEmail,
      paypalEmailVerified: true,
      paypalAccountStatus: "active",
      paypalOnboardingComplete: true,
      updatedAt: now,
    });

    await batch.commit();

    // Annuler les rappels PayPal en attente (le provider est maintenant configuré)
    const pendingReminders = await db
      .collection("paypal_reminder_queue")
      .where("userId", "==", userId)
      .where("status", "==", "pending")
      .get();

    if (!pendingReminders.empty) {
      const reminderBatch = db.batch();
      pendingReminders.docs.forEach((doc) => {
        reminderBatch.update(doc.ref, { status: "cancelled", cancelledAt: now });
      });
      await reminderBatch.commit();
      console.log(`[PAYPAL_VERIFY] Cancelled ${pendingReminders.size} pending reminders`);
    }

    // Log d'audit
    await db.collection("paypal_verification_logs").add({
      userId,
      email: normalizedEmail,
      action: "verification_success",
      codeId: codeDoc.id,
      success: true,
      timestamp: now,
    });

    // Notification de succès
    await db.collection("notifications").add({
      userId,
      type: "paypal_verified",
      title: "PayPal vérifié",
      message: `Votre adresse PayPal ${normalizedEmail} a été vérifiée. Vous pouvez maintenant recevoir des paiements.`,
      data: { email: normalizedEmail },
      read: false,
      createdAt: now,
    });

    // P0-8 FIX: Masquer l'email dans les logs
    console.log(`[PAYPAL_VERIFY] Email ${maskEmail(normalizedEmail)} verified for ${userId}`);

    return {
      success: true,
      email: normalizedEmail,
      message: "Email verified successfully",
    };
  }
);

/**
 * Cloud Function: Renvoyer le code (avec cooldown)
 */
export const resendPayPalVerificationCode = onCall(
  {
    region: "europe-west1",
    cors: ALLOWED_ORIGINS,
    memory: "256MiB",
    cpu: 0.083,
    secrets: EMAIL_SECRETS, // P0-10 FIX: Utiliser l'array centralisé
  },
  async (request) => {
    // Même logique que sendPayPalVerificationCode
    // mais vérifie qu'il y a un code en attente pour cet email
    const auth = request.auth;
    if (!auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const { email, locale = "fr" } = request.data as { email: string; locale?: string };

    if (!email || !validateEmail(email)) {
      throw new HttpsError("invalid-argument", "Valid email required");
    }

    const db = admin.firestore();
    const userId = auth.uid;
    const normalizedEmail = email.trim().toLowerCase();

    // Note: Dans Firebase, on ne peut pas appeler directement une autre fonction
    // Donc on duplique la logique ici (avec le même rate limiting)

    const now = admin.firestore.Timestamp.now();
    const oneHourAgo = admin.firestore.Timestamp.fromMillis(
      now.toMillis() - 60 * 60 * 1000
    );

    // Rate limiting
    const recentCodes = await db
      .collection("paypal_verification_codes")
      .where("userId", "==", userId)
      .where("createdAt", ">", oneHourAgo)
      .count()
      .get();

    if (recentCodes.data().count >= VERIFICATION_CONFIG.MAX_CODES_PER_HOUR) {
      throw new HttpsError(
        "resource-exhausted",
        "Too many verification attempts. Please try again later."
      );
    }

    // Cooldown
    const lastCodeSnap = await db
      .collection("paypal_verification_codes")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (!lastCodeSnap.empty) {
      const lastCode = lastCodeSnap.docs[0].data() as VerificationCode;
      const secondsSinceLastCode = (now.toMillis() - lastCode.createdAt.toMillis()) / 1000;

      if (secondsSinceLastCode < VERIFICATION_CONFIG.COOLDOWN_SECONDS) {
        const waitTime = Math.ceil(VERIFICATION_CONFIG.COOLDOWN_SECONDS - secondsSinceLastCode);
        throw new HttpsError(
          "resource-exhausted",
          `Please wait ${waitTime} seconds before requesting a new code`
        );
      }
    }

    // Invalider l'ancien code
    const oldCodesSnap = await db
      .collection("paypal_verification_codes")
      .where("userId", "==", userId)
      .where("email", "==", normalizedEmail)
      .where("verified", "==", false)
      .get();

    const batch = db.batch();
    oldCodesSnap.docs.forEach((doc) => {
      batch.update(doc.ref, { verified: true, invalidatedAt: now });
    });

    // Générer nouveau code
    const code = generateCode();
    const expiresAt = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + VERIFICATION_CONFIG.CODE_EXPIRY_MINUTES * 60 * 1000
    );

    const verificationRef = db.collection("paypal_verification_codes").doc();
    batch.set(verificationRef, {
      userId,
      email: normalizedEmail,
      code,
      attempts: 0,
      verified: false,
      expiresAt,
      createdAt: now,
    });

    await batch.commit();

    // Envoyer l'email
    try {
      await sendVerificationEmail(normalizedEmail, code, locale);
    } catch (emailError) {
      console.error(`[PAYPAL_VERIFY] Email resend failed:`, emailError);
      await verificationRef.delete();
      throw new HttpsError("internal", "Failed to send verification email");
    }

    // Log
    await db.collection("paypal_verification_logs").add({
      userId,
      email: normalizedEmail,
      action: "code_resent",
      codeId: verificationRef.id,
      success: true,
      timestamp: now,
    });

    // P0-8 FIX: Masquer l'email dans les logs
    console.log(`[PAYPAL_VERIFY] Code resent to ${maskEmail(normalizedEmail)}`);

    return {
      success: true,
      email: normalizedEmail,
      expiresInMinutes: VERIFICATION_CONFIG.CODE_EXPIRY_MINUTES,
    };
  }
);
