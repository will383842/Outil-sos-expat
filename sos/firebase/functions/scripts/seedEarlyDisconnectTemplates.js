/**
 * Script de seed pour les templates de notification de déconnexion anticipée
 *
 * Exécuter avec:
 * cd sos/firebase/functions && node scripts/seedEarlyDisconnectTemplates.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin (uses gcloud auth or firebase login credentials)
if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'sos-urgently-ac307' });
}

const db = admin.firestore();

// Templates pour les 9 langues
const TEMPLATES = {
  // ENGLISH
  en: {
    "call.refund.early_disconnect": {
      _meta: {
        description: "Client notification - Refund for early disconnection",
        category: "payment",
      },
      channels: { email: true, push: true, inapp: true, sms: false },
      email: {
        subject: "Your payment has been refunded - Call ended early",
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#2563eb;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 8px 8px}.refund-box{background:#ecfdf5;border:1px solid #a7f3d0;padding:20px;border-radius:8px;margin:20px 0;text-align:center}.refund-amount{font-size:24px;font-weight:bold;color:#059669}.footer{text-align:center;color:#666;font-size:12px;margin-top:20px}</style></head><body><div class="container"><div class="header"><h1>Payment Refunded</h1></div><div class="content"><p>Hello,</p><p>Your recent call was disconnected before the minimum duration required for billing (60 seconds with both parties connected).</p><div class="refund-box"><p>Refunded amount:</p><p class="refund-amount">{{AMOUNT}}</p></div><p>The refund has been automatically processed and will appear on your account within 5-10 business days.</p><p>Best regards,<br>The SOS Expat Team</p></div><div class="footer"><p>SOS Expat - Connecting Expatriates Worldwide</p></div></div></body></html>`,
        text: "Hello,\n\nYour recent call was disconnected before the minimum duration required for billing.\n\nRefunded amount: {{AMOUNT}}\n\nThe refund has been automatically processed and will appear on your account within 5-10 business days.\n\nBest regards,\nThe SOS Expat Team",
      },
      push: { title: "Payment refunded", body: "Your payment of {{AMOUNT}} has been refunded due to early disconnection.", deeplink: "/dashboard/payments" },
      inapp: { title: "Payment refunded", body: "Your payment of {{AMOUNT}} has been refunded. The call ended before the minimum required duration." },
    },
    "call.failed.early_disconnect.provider": {
      _meta: { description: "Provider notification - Call failed due to early disconnection", category: "call" },
      channels: { email: true, push: true, inapp: true, sms: true },
      email: {
        subject: "Call ended early - No charge applied",
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#f59e0b;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 8px 8px}.info-box{background:#fef3c7;border:1px solid #fcd34d;padding:15px;border-radius:6px;margin:20px 0}.footer{text-align:center;color:#666;font-size:12px;margin-top:20px}</style></head><body><div class="container"><div class="header"><h1>Call Ended Early</h1></div><div class="content"><p>Hello,</p><p>A recent call was disconnected before the minimum duration of 60 seconds.</p><div class="info-box"><p><strong>What happened:</strong> The call ended before the billing threshold. The client has been automatically refunded.</p></div><p>You remain available for new client requests.</p><p>Best regards,<br>The SOS Expat Team</p></div><div class="footer"><p>SOS Expat - Connecting Expatriates Worldwide</p></div></div></body></html>`,
        text: "Hello,\n\nA recent call was disconnected before the minimum duration of 60 seconds.\n\nThe client has been automatically refunded.\n\nYou remain available for new client requests.\n\nBest regards,\nThe SOS Expat Team",
      },
      sms: { text: "SOS Expat: A call ended early (< 60s). Client refunded, no payment for this call. You're still available." },
      push: { title: "Call ended early", body: "A call was disconnected early. Client refunded, no charge applied.", deeplink: "/dashboard/calls" },
      inapp: { title: "Call ended early", body: "A recent call ended before the 60-second minimum. The client was refunded automatically." },
    },
  },

  // FRENCH
  fr: {
    "call.refund.early_disconnect": {
      _meta: { description: "Notification client - Remboursement pour déconnexion anticipée", category: "payment" },
      channels: { email: true, push: true, inapp: true, sms: false },
      email: {
        subject: "Votre paiement a été remboursé - Appel interrompu",
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#2563eb;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 8px 8px}.refund-box{background:#ecfdf5;border:1px solid #a7f3d0;padding:20px;border-radius:8px;margin:20px 0;text-align:center}.refund-amount{font-size:24px;font-weight:bold;color:#059669}.footer{text-align:center;color:#666;font-size:12px;margin-top:20px}</style></head><body><div class="container"><div class="header"><h1>Paiement remboursé</h1></div><div class="content"><p>Bonjour,</p><p>Votre appel récent a été interrompu avant la durée minimale requise pour la facturation (60 secondes avec les deux parties connectées).</p><div class="refund-box"><p>Montant remboursé :</p><p class="refund-amount">{{AMOUNT}}</p></div><p>Le remboursement a été traité automatiquement et apparaîtra sur votre compte sous 5 à 10 jours ouvrés.</p><p>Cordialement,<br>L'équipe SOS Expat</p></div><div class="footer"><p>SOS Expat - Connecter les Expatriés du Monde Entier</p></div></div></body></html>`,
        text: "Bonjour,\n\nVotre appel récent a été interrompu avant la durée minimale requise pour la facturation.\n\nMontant remboursé : {{AMOUNT}}\n\nLe remboursement a été traité automatiquement.\n\nCordialement,\nL'équipe SOS Expat",
      },
      push: { title: "Paiement remboursé", body: "Votre paiement de {{AMOUNT}} a été remboursé suite à une déconnexion anticipée.", deeplink: "/dashboard/payments" },
      inapp: { title: "Paiement remboursé", body: "Votre paiement de {{AMOUNT}} a été remboursé. L'appel s'est terminé avant la durée minimale requise." },
    },
    "call.failed.early_disconnect.provider": {
      _meta: { description: "Notification prestataire - Appel échoué pour déconnexion anticipée", category: "call" },
      channels: { email: true, push: true, inapp: true, sms: true },
      email: {
        subject: "Appel interrompu - Aucun frais appliqué",
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#f59e0b;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 8px 8px}.info-box{background:#fef3c7;border:1px solid #fcd34d;padding:15px;border-radius:6px;margin:20px 0}.footer{text-align:center;color:#666;font-size:12px;margin-top:20px}</style></head><body><div class="container"><div class="header"><h1>Appel interrompu</h1></div><div class="content"><p>Bonjour,</p><p>Un appel récent a été interrompu avant la durée minimale de 60 secondes.</p><div class="info-box"><p><strong>Ce qui s'est passé :</strong> L'appel s'est terminé avant le seuil de facturation. Le client a été automatiquement remboursé.</p></div><p>Vous restez disponible pour de nouvelles demandes.</p><p>Cordialement,<br>L'équipe SOS Expat</p></div><div class="footer"><p>SOS Expat - Connecter les Expatriés du Monde Entier</p></div></div></body></html>`,
        text: "Bonjour,\n\nUn appel récent a été interrompu avant la durée minimale de 60 secondes.\n\nLe client a été automatiquement remboursé.\n\nVous restez disponible pour de nouvelles demandes.\n\nCordialement,\nL'équipe SOS Expat",
      },
      sms: { text: "SOS Expat: Un appel s'est terminé trop tôt (< 60s). Client remboursé, pas de paiement. Vous restez disponible." },
      push: { title: "Appel interrompu", body: "Un appel s'est terminé trop tôt. Client remboursé, aucun frais.", deeplink: "/dashboard/calls" },
      inapp: { title: "Appel interrompu", body: "Un appel récent s'est terminé avant les 60 secondes minimales. Le client a été remboursé automatiquement." },
    },
  },

  // SPANISH
  es: {
    "call.refund.early_disconnect": {
      _meta: { description: "Notificación al cliente - Reembolso por desconexión anticipada", category: "payment" },
      channels: { email: true, push: true, inapp: true, sms: false },
      email: {
        subject: "Su pago ha sido reembolsado - Llamada interrumpida",
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#2563eb;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 8px 8px}.refund-box{background:#ecfdf5;border:1px solid #a7f3d0;padding:20px;border-radius:8px;margin:20px 0;text-align:center}.refund-amount{font-size:24px;font-weight:bold;color:#059669}.footer{text-align:center;color:#666;font-size:12px;margin-top:20px}</style></head><body><div class="container"><div class="header"><h1>Pago reembolsado</h1></div><div class="content"><p>Hola,</p><p>Su llamada reciente se desconectó antes de la duración mínima requerida (60 segundos).</p><div class="refund-box"><p>Monto reembolsado:</p><p class="refund-amount">{{AMOUNT}}</p></div><p>El reembolso se ha procesado automáticamente.</p><p>Saludos cordiales,<br>El equipo de SOS Expat</p></div><div class="footer"><p>SOS Expat - Conectando Expatriados</p></div></div></body></html>`,
        text: "Hola,\n\nSu llamada reciente se desconectó antes de la duración mínima requerida.\n\nMonto reembolsado: {{AMOUNT}}\n\nSaludos cordiales,\nEl equipo de SOS Expat",
      },
      push: { title: "Pago reembolsado", body: "Su pago de {{AMOUNT}} ha sido reembolsado.", deeplink: "/dashboard/payments" },
      inapp: { title: "Pago reembolsado", body: "Su pago de {{AMOUNT}} ha sido reembolsado." },
    },
    "call.failed.early_disconnect.provider": {
      _meta: { description: "Notificación al proveedor - Llamada fallida", category: "call" },
      channels: { email: true, push: true, inapp: true, sms: true },
      email: {
        subject: "Llamada interrumpida - Sin cargo aplicado",
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#f59e0b;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 8px 8px}.info-box{background:#fef3c7;border:1px solid #fcd34d;padding:15px;border-radius:6px;margin:20px 0}.footer{text-align:center;color:#666;font-size:12px;margin-top:20px}</style></head><body><div class="container"><div class="header"><h1>Llamada interrumpida</h1></div><div class="content"><p>Hola,</p><p>Una llamada reciente terminó antes de los 60 segundos mínimos.</p><div class="info-box"><p>El cliente ha sido reembolsado automáticamente.</p></div><p>Permanece disponible para nuevas solicitudes.</p><p>Saludos,<br>El equipo de SOS Expat</p></div></div></body></html>`,
        text: "Hola,\n\nUna llamada terminó antes de los 60 segundos mínimos.\n\nEl cliente ha sido reembolsado.\n\nSaludos,\nEl equipo de SOS Expat",
      },
      sms: { text: "SOS Expat: Una llamada terminó antes (< 60s). Cliente reembolsado. Sigue disponible." },
      push: { title: "Llamada interrumpida", body: "Una llamada terminó antes de tiempo. Cliente reembolsado.", deeplink: "/dashboard/calls" },
      inapp: { title: "Llamada interrumpida", body: "Una llamada terminó antes de los 60 segundos mínimos." },
    },
  },

  // GERMAN
  de: {
    "call.refund.early_disconnect": {
      _meta: { description: "Kundenbenachrichtigung - Erstattung bei vorzeitiger Trennung", category: "payment" },
      channels: { email: true, push: true, inapp: true, sms: false },
      email: {
        subject: "Ihre Zahlung wurde erstattet - Anruf vorzeitig beendet",
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#2563eb;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 8px 8px}.refund-box{background:#ecfdf5;border:1px solid #a7f3d0;padding:20px;border-radius:8px;margin:20px 0;text-align:center}.refund-amount{font-size:24px;font-weight:bold;color:#059669}.footer{text-align:center;color:#666;font-size:12px;margin-top:20px}</style></head><body><div class="container"><div class="header"><h1>Zahlung erstattet</h1></div><div class="content"><p>Hallo,</p><p>Ihr Anruf wurde vor der Mindestdauer (60 Sekunden) getrennt.</p><div class="refund-box"><p>Erstatteter Betrag:</p><p class="refund-amount">{{AMOUNT}}</p></div><p>Die Erstattung wurde automatisch verarbeitet.</p><p>Mit freundlichen Grüßen,<br>Das SOS Expat Team</p></div></div></body></html>`,
        text: "Hallo,\n\nIhr Anruf wurde vor der Mindestdauer getrennt.\n\nErstatteter Betrag: {{AMOUNT}}\n\nMit freundlichen Grüßen,\nDas SOS Expat Team",
      },
      push: { title: "Zahlung erstattet", body: "Ihre Zahlung von {{AMOUNT}} wurde erstattet.", deeplink: "/dashboard/payments" },
      inapp: { title: "Zahlung erstattet", body: "Ihre Zahlung von {{AMOUNT}} wurde erstattet." },
    },
    "call.failed.early_disconnect.provider": {
      _meta: { description: "Anbieterbenachrichtigung - Anruf fehlgeschlagen", category: "call" },
      channels: { email: true, push: true, inapp: true, sms: true },
      email: {
        subject: "Anruf vorzeitig beendet - Keine Gebühr",
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#f59e0b;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 8px 8px}.info-box{background:#fef3c7;border:1px solid #fcd34d;padding:15px;border-radius:6px;margin:20px 0}.footer{text-align:center;color:#666;font-size:12px;margin-top:20px}</style></head><body><div class="container"><div class="header"><h1>Anruf vorzeitig beendet</h1></div><div class="content"><p>Hallo,</p><p>Ein Anruf wurde vor den 60 Sekunden Minimum getrennt.</p><div class="info-box"><p>Der Kunde wurde automatisch erstattet.</p></div><p>Sie bleiben verfügbar.</p><p>Mit freundlichen Grüßen,<br>Das SOS Expat Team</p></div></div></body></html>`,
        text: "Hallo,\n\nEin Anruf wurde vor den 60 Sekunden Minimum getrennt.\n\nDer Kunde wurde erstattet.\n\nMit freundlichen Grüßen,\nDas SOS Expat Team",
      },
      sms: { text: "SOS Expat: Ein Anruf endete früh (< 60s). Kunde erstattet. Sie bleiben verfügbar." },
      push: { title: "Anruf vorzeitig beendet", body: "Ein Anruf wurde früh getrennt. Kunde erstattet.", deeplink: "/dashboard/calls" },
      inapp: { title: "Anruf vorzeitig beendet", body: "Ein Anruf endete vor den 60 Sekunden Minimum." },
    },
  },

  // PORTUGUESE
  pt: {
    "call.refund.early_disconnect": {
      _meta: { description: "Notificação ao cliente - Reembolso por desconexão antecipada", category: "payment" },
      channels: { email: true, push: true, inapp: true, sms: false },
      email: {
        subject: "Seu pagamento foi reembolsado - Chamada interrompida",
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#2563eb;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 8px 8px}.refund-box{background:#ecfdf5;border:1px solid #a7f3d0;padding:20px;border-radius:8px;margin:20px 0;text-align:center}.refund-amount{font-size:24px;font-weight:bold;color:#059669}.footer{text-align:center;color:#666;font-size:12px;margin-top:20px}</style></head><body><div class="container"><div class="header"><h1>Pagamento reembolsado</h1></div><div class="content"><p>Olá,</p><p>Sua chamada foi desconectada antes da duração mínima (60 segundos).</p><div class="refund-box"><p>Valor reembolsado:</p><p class="refund-amount">{{AMOUNT}}</p></div><p>O reembolso foi processado automaticamente.</p><p>Atenciosamente,<br>A equipe SOS Expat</p></div></div></body></html>`,
        text: "Olá,\n\nSua chamada foi desconectada antes da duração mínima.\n\nValor reembolsado: {{AMOUNT}}\n\nAtenciosamente,\nA equipe SOS Expat",
      },
      push: { title: "Pagamento reembolsado", body: "Seu pagamento de {{AMOUNT}} foi reembolsado.", deeplink: "/dashboard/payments" },
      inapp: { title: "Pagamento reembolsado", body: "Seu pagamento de {{AMOUNT}} foi reembolsado." },
    },
    "call.failed.early_disconnect.provider": {
      _meta: { description: "Notificação ao prestador - Chamada falhou", category: "call" },
      channels: { email: true, push: true, inapp: true, sms: true },
      email: {
        subject: "Chamada interrompida - Nenhuma cobrança",
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#f59e0b;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 8px 8px}.info-box{background:#fef3c7;border:1px solid #fcd34d;padding:15px;border-radius:6px;margin:20px 0}.footer{text-align:center;color:#666;font-size:12px;margin-top:20px}</style></head><body><div class="container"><div class="header"><h1>Chamada interrompida</h1></div><div class="content"><p>Olá,</p><p>Uma chamada terminou antes dos 60 segundos mínimos.</p><div class="info-box"><p>O cliente foi reembolsado automaticamente.</p></div><p>Você permanece disponível.</p><p>Atenciosamente,<br>A equipe SOS Expat</p></div></div></body></html>`,
        text: "Olá,\n\nUma chamada terminou antes dos 60 segundos mínimos.\n\nO cliente foi reembolsado.\n\nAtenciosamente,\nA equipe SOS Expat",
      },
      sms: { text: "SOS Expat: Uma chamada terminou cedo (< 60s). Cliente reembolsado. Você continua disponível." },
      push: { title: "Chamada interrompida", body: "Uma chamada terminou cedo. Cliente reembolsado.", deeplink: "/dashboard/calls" },
      inapp: { title: "Chamada interrompida", body: "Uma chamada terminou antes dos 60 segundos mínimos." },
    },
  },

  // RUSSIAN
  ru: {
    "call.refund.early_disconnect": {
      _meta: { description: "Уведомление клиенту - Возврат за преждевременное отключение", category: "payment" },
      channels: { email: true, push: true, inapp: true, sms: false },
      email: {
        subject: "Ваш платеж возвращен - Звонок прерван",
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#2563eb;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 8px 8px}.refund-box{background:#ecfdf5;border:1px solid #a7f3d0;padding:20px;border-radius:8px;margin:20px 0;text-align:center}.refund-amount{font-size:24px;font-weight:bold;color:#059669}.footer{text-align:center;color:#666;font-size:12px;margin-top:20px}</style></head><body><div class="container"><div class="header"><h1>Платеж возвращен</h1></div><div class="content"><p>Здравствуйте,</p><p>Ваш звонок был прерван до минимальной продолжительности (60 секунд).</p><div class="refund-box"><p>Сумма возврата:</p><p class="refund-amount">{{AMOUNT}}</p></div><p>Возврат был обработан автоматически.</p><p>С уважением,<br>Команда SOS Expat</p></div></div></body></html>`,
        text: "Здравствуйте,\n\nВаш звонок был прерван до минимальной продолжительности.\n\nСумма возврата: {{AMOUNT}}\n\nС уважением,\nКоманда SOS Expat",
      },
      push: { title: "Платеж возвращен", body: "Ваш платеж {{AMOUNT}} был возвращен.", deeplink: "/dashboard/payments" },
      inapp: { title: "Платеж возвращен", body: "Ваш платеж {{AMOUNT}} был возвращен." },
    },
    "call.failed.early_disconnect.provider": {
      _meta: { description: "Уведомление поставщику - Звонок не удался", category: "call" },
      channels: { email: true, push: true, inapp: true, sms: true },
      email: {
        subject: "Звонок прерван - Оплата не взимается",
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#f59e0b;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 8px 8px}.info-box{background:#fef3c7;border:1px solid #fcd34d;padding:15px;border-radius:6px;margin:20px 0}.footer{text-align:center;color:#666;font-size:12px;margin-top:20px}</style></head><body><div class="container"><div class="header"><h1>Звонок прерван</h1></div><div class="content"><p>Здравствуйте,</p><p>Звонок завершился до 60 секунд минимума.</p><div class="info-box"><p>Клиенту был возвращен платеж.</p></div><p>Вы остаетесь доступны.</p><p>С уважением,<br>Команда SOS Expat</p></div></div></body></html>`,
        text: "Здравствуйте,\n\nЗвонок завершился до 60 секунд минимума.\n\nКлиенту был возвращен платеж.\n\nС уважением,\nКоманда SOS Expat",
      },
      sms: { text: "SOS Expat: Звонок завершился рано (< 60с). Клиенту возвращен платеж. Вы доступны." },
      push: { title: "Звонок прерван", body: "Звонок завершился рано. Клиенту возвращен платеж.", deeplink: "/dashboard/calls" },
      inapp: { title: "Звонок прерван", body: "Звонок завершился до 60 секунд минимума." },
    },
  },

  // ARABIC
  ar: {
    "call.refund.early_disconnect": {
      _meta: { description: "إشعار العميل - استرداد بسبب قطع الاتصال المبكر", category: "payment" },
      channels: { email: true, push: true, inapp: true, sms: false },
      email: {
        subject: "تم استرداد دفعتك - انتهت المكالمة مبكراً",
        html: `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.8;color:#333;direction:rtl}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#2563eb;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 8px 8px}.refund-box{background:#ecfdf5;border:1px solid #a7f3d0;padding:20px;border-radius:8px;margin:20px 0;text-align:center}.refund-amount{font-size:24px;font-weight:bold;color:#059669}.footer{text-align:center;color:#666;font-size:12px;margin-top:20px}</style></head><body><div class="container"><div class="header"><h1>تم استرداد الدفع</h1></div><div class="content"><p>مرحباً،</p><p>تم قطع مكالمتك قبل الحد الأدنى للمدة (60 ثانية).</p><div class="refund-box"><p>المبلغ المسترد:</p><p class="refund-amount">{{AMOUNT}}</p></div><p>تمت معالجة الاسترداد تلقائياً.</p><p>مع أطيب التحيات،<br>فريق SOS Expat</p></div></div></body></html>`,
        text: "مرحباً،\n\nتم قطع مكالمتك قبل الحد الأدنى للمدة.\n\nالمبلغ المسترد: {{AMOUNT}}\n\nمع أطيب التحيات،\nفريق SOS Expat",
      },
      push: { title: "تم استرداد الدفع", body: "تم استرداد دفعتك بقيمة {{AMOUNT}}.", deeplink: "/dashboard/payments" },
      inapp: { title: "تم استرداد الدفع", body: "تم استرداد دفعتك بقيمة {{AMOUNT}}." },
    },
    "call.failed.early_disconnect.provider": {
      _meta: { description: "إشعار مقدم الخدمة - فشلت المكالمة", category: "call" },
      channels: { email: true, push: true, inapp: true, sms: true },
      email: {
        subject: "انتهت المكالمة مبكراً - لم يتم تطبيق أي رسوم",
        html: `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.8;color:#333;direction:rtl}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#f59e0b;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 8px 8px}.info-box{background:#fef3c7;border:1px solid #fcd34d;padding:15px;border-radius:6px;margin:20px 0}.footer{text-align:center;color:#666;font-size:12px;margin-top:20px}</style></head><body><div class="container"><div class="header"><h1>انتهت المكالمة مبكراً</h1></div><div class="content"><p>مرحباً،</p><p>انتهت مكالمة قبل 60 ثانية الدنيا.</p><div class="info-box"><p>تم استرداد المبلغ للعميل تلقائياً.</p></div><p>أنت لا تزال متاحاً.</p><p>مع أطيب التحيات،<br>فريق SOS Expat</p></div></div></body></html>`,
        text: "مرحباً،\n\nانتهت مكالمة قبل 60 ثانية الدنيا.\n\nتم استرداد المبلغ للعميل.\n\nمع أطيب التحيات،\nفريق SOS Expat",
      },
      sms: { text: "SOS Expat: انتهت مكالمة مبكراً (< 60 ث). تم استرداد المبلغ للعميل. أنت متاح." },
      push: { title: "انتهت المكالمة مبكراً", body: "انتهت مكالمة مبكراً. تم استرداد المبلغ للعميل.", deeplink: "/dashboard/calls" },
      inapp: { title: "انتهت المكالمة مبكراً", body: "انتهت مكالمة قبل 60 ثانية الدنيا." },
    },
  },

  // HINDI
  hi: {
    "call.refund.early_disconnect": {
      _meta: { description: "ग्राहक अधिसूचना - जल्दी डिस्कनेक्ट के लिए रिफंड", category: "payment" },
      channels: { email: true, push: true, inapp: true, sms: false },
      email: {
        subject: "आपका भुगतान वापस कर दिया गया है - कॉल जल्दी समाप्त हुई",
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#2563eb;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 8px 8px}.refund-box{background:#ecfdf5;border:1px solid #a7f3d0;padding:20px;border-radius:8px;margin:20px 0;text-align:center}.refund-amount{font-size:24px;font-weight:bold;color:#059669}.footer{text-align:center;color:#666;font-size:12px;margin-top:20px}</style></head><body><div class="container"><div class="header"><h1>भुगतान वापस किया गया</h1></div><div class="content"><p>नमस्ते,</p><p>आपकी कॉल न्यूनतम अवधि (60 सेकंड) से पहले डिस्कनेक्ट हो गई।</p><div class="refund-box"><p>वापस की गई राशि:</p><p class="refund-amount">{{AMOUNT}}</p></div><p>रिफंड स्वचालित रूप से प्रोसेस किया गया है।</p><p>सादर,<br>SOS Expat टीम</p></div></div></body></html>`,
        text: "नमस्ते,\n\nआपकी कॉल न्यूनतम अवधि से पहले डिस्कनेक्ट हो गई।\n\nवापस की गई राशि: {{AMOUNT}}\n\nसादर,\nSOS Expat टीम",
      },
      push: { title: "भुगतान वापस किया गया", body: "आपका {{AMOUNT}} का भुगतान वापस कर दिया गया है।", deeplink: "/dashboard/payments" },
      inapp: { title: "भुगतान वापस किया गया", body: "आपका {{AMOUNT}} का भुगतान वापस कर दिया गया है।" },
    },
    "call.failed.early_disconnect.provider": {
      _meta: { description: "प्रदाता अधिसूचना - कॉल विफल", category: "call" },
      channels: { email: true, push: true, inapp: true, sms: true },
      email: {
        subject: "कॉल जल्दी समाप्त हुई - कोई शुल्क नहीं",
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#f59e0b;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 8px 8px}.info-box{background:#fef3c7;border:1px solid #fcd34d;padding:15px;border-radius:6px;margin:20px 0}.footer{text-align:center;color:#666;font-size:12px;margin-top:20px}</style></head><body><div class="container"><div class="header"><h1>कॉल जल्दी समाप्त हुई</h1></div><div class="content"><p>नमस्ते,</p><p>एक कॉल 60 सेकंड न्यूनतम से पहले समाप्त हो गई।</p><div class="info-box"><p>ग्राहक को स्वचालित रूप से रिफंड कर दिया गया।</p></div><p>आप उपलब्ध रहते हैं।</p><p>सादर,<br>SOS Expat टीम</p></div></div></body></html>`,
        text: "नमस्ते,\n\nएक कॉल 60 सेकंड न्यूनतम से पहले समाप्त हो गई।\n\nग्राहक को रिफंड कर दिया गया।\n\nसादर,\nSOS Expat टीम",
      },
      sms: { text: "SOS Expat: कॉल जल्दी समाप्त (< 60s)। ग्राहक को रिफंड। आप उपलब्ध हैं।" },
      push: { title: "कॉल जल्दी समाप्त हुई", body: "एक कॉल जल्दी समाप्त। ग्राहक को रिफंड।", deeplink: "/dashboard/calls" },
      inapp: { title: "कॉल जल्दी समाप्त हुई", body: "एक कॉल 60 सेकंड न्यूनतम से पहले समाप्त हो गई।" },
    },
  },

  // CHINESE
  ch: {
    "call.refund.early_disconnect": {
      _meta: { description: "客户通知 - 提前断开连接退款", category: "payment" },
      channels: { email: true, push: true, inapp: true, sms: false },
      email: {
        subject: "您的付款已退还 - 通话提前结束",
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#2563eb;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 8px 8px}.refund-box{background:#ecfdf5;border:1px solid #a7f3d0;padding:20px;border-radius:8px;margin:20px 0;text-align:center}.refund-amount{font-size:24px;font-weight:bold;color:#059669}.footer{text-align:center;color:#666;font-size:12px;margin-top:20px}</style></head><body><div class="container"><div class="header"><h1>付款已退还</h1></div><div class="content"><p>您好，</p><p>您的通话在最短时长（60秒）之前断开了。</p><div class="refund-box"><p>退款金额：</p><p class="refund-amount">{{AMOUNT}}</p></div><p>退款已自动处理。</p><p>此致，<br>SOS Expat团队</p></div></div></body></html>`,
        text: "您好，\n\n您的通话在最短时长之前断开了。\n\n退款金额：{{AMOUNT}}\n\n此致，\nSOS Expat团队",
      },
      push: { title: "付款已退还", body: "您的{{AMOUNT}}付款已退还。", deeplink: "/dashboard/payments" },
      inapp: { title: "付款已退还", body: "您的{{AMOUNT}}付款已退还。" },
    },
    "call.failed.early_disconnect.provider": {
      _meta: { description: "服务提供商通知 - 通话失败", category: "call" },
      channels: { email: true, push: true, inapp: true, sms: true },
      email: {
        subject: "通话提前结束 - 未收取费用",
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#f59e0b;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 8px 8px}.info-box{background:#fef3c7;border:1px solid #fcd34d;padding:15px;border-radius:6px;margin:20px 0}.footer{text-align:center;color:#666;font-size:12px;margin-top:20px}</style></head><body><div class="container"><div class="header"><h1>通话提前结束</h1></div><div class="content"><p>您好，</p><p>一次通话在60秒最短时长之前断开了。</p><div class="info-box"><p>客户已自动获得退款。</p></div><p>您仍可接单。</p><p>此致，<br>SOS Expat团队</p></div></div></body></html>`,
        text: "您好，\n\n一次通话在60秒最短时长之前断开了。\n\n客户已自动获得退款。\n\n此致，\nSOS Expat团队",
      },
      sms: { text: "SOS Expat：通话提前结束（< 60秒）。客户已退款。您仍可接单。" },
      push: { title: "通话提前结束", body: "一次通话提前断开。客户已退款。", deeplink: "/dashboard/calls" },
      inapp: { title: "通话提前结束", body: "一次通话在60秒最短时长之前结束。" },
    },
  },
};

async function seedTemplates() {
  console.log('🚀 Starting early disconnect templates seed...\n');

  let templateCount = 0;
  const batch = db.batch();

  for (const [lang, templates] of Object.entries(TEMPLATES)) {
    console.log(`📝 Processing language: ${lang}`);

    for (const [eventId, template] of Object.entries(templates)) {
      const ref = db.collection('message_templates').doc(lang).collection('items').doc(eventId);
      batch.set(ref, template, { merge: true });
      templateCount++;
      console.log(`   ✅ ${eventId}`);
    }
  }

  console.log('\n💾 Committing batch write...');
  await batch.commit();

  console.log(`\n✅ Successfully seeded ${templateCount} templates across ${Object.keys(TEMPLATES).length} languages!`);
  console.log('\nTemplates created:');
  console.log('  - call.refund.early_disconnect (client notification)');
  console.log('  - call.failed.early_disconnect.provider (provider notification)');

  process.exit(0);
}

seedTemplates().catch((error) => {
  console.error('❌ Error seeding templates:', error);
  process.exit(1);
});
