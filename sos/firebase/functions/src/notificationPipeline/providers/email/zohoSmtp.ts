import nodemailer from 'nodemailer';
import { EMAIL_USER, EMAIL_PASS } from '../../../utils/secrets';

export async function sendZoho(to: string, subject: string, html: string, text?: string) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.zoho.eu',
    port: 465,
    secure: true,
    auth: { user: EMAIL_USER.value(), pass: EMAIL_PASS.value() },
    // P1 FIX: Explicit SMTP timeouts to prevent function from hanging indefinitely
    connectionTimeout: 10000,  // 10s to establish TCP connection
    greetingTimeout: 10000,    // 10s for SMTP greeting
    socketTimeout: 30000,      // 30s per socket operation (send)
  });
  const info = await transporter.sendMail({
    from: `"SOS Expat" <${EMAIL_USER.value()}>`,
    to, subject, html, text
  });
  return info.messageId as string;
}
