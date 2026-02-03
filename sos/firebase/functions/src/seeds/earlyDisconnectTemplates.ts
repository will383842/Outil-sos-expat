/**
 * Templates de notification pour les remboursements suite à une déconnexion anticipée
 *
 * Événements couverts:
 * - call.refund.early_disconnect: Notification au CLIENT qu'il a été remboursé
 * - call.failed.early_disconnect.provider: Notification au PRESTATAIRE que l'appel a échoué
 *
 * Exécuter avec:
 * npx ts-node src/seeds/earlyDisconnectTemplates.ts
 *
 * Ou déployer la fonction initEarlyDisconnectTemplates et l'appeler
 */

import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";

// =====================================================
// TEMPLATES PAR LANGUE
// =====================================================

// Variables disponibles:
// {{AMOUNT}} - Montant remboursé (ex: "15,00 €")
// {{PROVIDER_NAME}} - Nom du prestataire
// {{CLIENT_NAME}} - Nom du client
// {{REASON}} - Raison de l'échec (optionnel)

const TEMPLATES: Record<string, {
  "call.refund.early_disconnect": any;
  "call.failed.early_disconnect.provider": any;
}> = {
  // =====================================================
  // ENGLISH
  // =====================================================
  en: {
    "call.refund.early_disconnect": {
      _meta: {
        description: "Client notification - Refund for early disconnection",
        category: "payment",
      },
      channels: {
        email: true,
        push: true,
        inapp: true,
        sms: false,
      },
      email: {
        subject: "Your payment has been refunded - Call ended early",
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .refund-box { background: #ecfdf5; border: 1px solid #a7f3d0; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
    .refund-amount { font-size: 24px; font-weight: bold; color: #059669; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Payment Refunded</h1>
    </div>
    <div class="content">
      <p>Hello,</p>

      <p>Your recent call was disconnected before the minimum duration required for billing (60 seconds with both parties connected).</p>

      <div class="refund-box">
        <p>Refunded amount:</p>
        <p class="refund-amount">{{AMOUNT}}</p>
      </div>

      <p>The refund has been automatically processed and will appear on your account within 5-10 business days, depending on your bank.</p>

      <p>If you'd like to try again, you can book a new call with a provider at any time.</p>

      <p>Best regards,<br>The SOS Expat Team</p>
    </div>
    <div class="footer">
      <p>SOS Expat - Connecting Expatriates Worldwide</p>
    </div>
  </div>
</body>
</html>
        `,
        text: `Hello,

Your recent call was disconnected before the minimum duration required for billing.

Refunded amount: {{AMOUNT}}

The refund has been automatically processed and will appear on your account within 5-10 business days.

Best regards,
The SOS Expat Team`,
      },
      push: {
        title: "Payment refunded",
        body: "Your payment of {{AMOUNT}} has been refunded due to early disconnection.",
        deeplink: "/dashboard/payments",
      },
      inapp: {
        title: "Payment refunded",
        body: "Your payment of {{AMOUNT}} has been refunded. The call ended before the minimum required duration.",
      },
    },
    "call.failed.early_disconnect.provider": {
      _meta: {
        description: "Provider notification - Call failed due to early disconnection",
        category: "call",
      },
      channels: {
        email: true,
        push: true,
        inapp: true,
        sms: true,
      },
      email: {
        subject: "Call ended early - No charge applied",
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .info-box { background: #fef3c7; border: 1px solid #fcd34d; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Call Ended Early</h1>
    </div>
    <div class="content">
      <p>Hello,</p>

      <p>A recent call was disconnected before the minimum duration of 60 seconds with both parties connected.</p>

      <div class="info-box">
        <p><strong>What happened:</strong> The call ended before the billing threshold was reached. The client has been automatically refunded and no payment will be processed for this call.</p>
      </div>

      <p>You remain available for new client requests. If you experience connection issues, please check your phone signal and try again.</p>

      <p>Best regards,<br>The SOS Expat Team</p>
    </div>
    <div class="footer">
      <p>SOS Expat - Connecting Expatriates Worldwide</p>
    </div>
  </div>
</body>
</html>
        `,
        text: `Hello,

A recent call was disconnected before the minimum duration of 60 seconds.

The client has been automatically refunded and no payment will be processed for this call.

You remain available for new client requests.

Best regards,
The SOS Expat Team`,
      },
      sms: {
        text: "SOS Expat: A call ended early (< 60s). Client refunded, no payment for this call. You're still available for new requests.",
      },
      push: {
        title: "Call ended early",
        body: "A call was disconnected early. Client refunded, no charge applied.",
        deeplink: "/dashboard/calls",
      },
      inapp: {
        title: "Call ended early",
        body: "A recent call ended before the 60-second minimum. The client was refunded automatically.",
      },
    },
  },

  // =====================================================
  // FRENCH
  // =====================================================
  fr: {
    "call.refund.early_disconnect": {
      _meta: {
        description: "Notification client - Remboursement pour déconnexion anticipée",
        category: "payment",
      },
      channels: {
        email: true,
        push: true,
        inapp: true,
        sms: false,
      },
      email: {
        subject: "Votre paiement a été remboursé - Appel interrompu",
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .refund-box { background: #ecfdf5; border: 1px solid #a7f3d0; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
    .refund-amount { font-size: 24px; font-weight: bold; color: #059669; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Paiement remboursé</h1>
    </div>
    <div class="content">
      <p>Bonjour,</p>

      <p>Votre appel récent a été interrompu avant la durée minimale requise pour la facturation (60 secondes avec les deux parties connectées).</p>

      <div class="refund-box">
        <p>Montant remboursé :</p>
        <p class="refund-amount">{{AMOUNT}}</p>
      </div>

      <p>Le remboursement a été traité automatiquement et apparaîtra sur votre compte sous 5 à 10 jours ouvrés, selon votre banque.</p>

      <p>Si vous souhaitez réessayer, vous pouvez réserver un nouvel appel avec un prestataire à tout moment.</p>

      <p>Cordialement,<br>L'équipe SOS Expat</p>
    </div>
    <div class="footer">
      <p>SOS Expat - Connecter les Expatriés du Monde Entier</p>
    </div>
  </div>
</body>
</html>
        `,
        text: `Bonjour,

Votre appel récent a été interrompu avant la durée minimale requise pour la facturation.

Montant remboursé : {{AMOUNT}}

Le remboursement a été traité automatiquement et apparaîtra sur votre compte sous 5 à 10 jours ouvrés.

Cordialement,
L'équipe SOS Expat`,
      },
      push: {
        title: "Paiement remboursé",
        body: "Votre paiement de {{AMOUNT}} a été remboursé suite à une déconnexion anticipée.",
        deeplink: "/dashboard/payments",
      },
      inapp: {
        title: "Paiement remboursé",
        body: "Votre paiement de {{AMOUNT}} a été remboursé. L'appel s'est terminé avant la durée minimale requise.",
      },
    },
    "call.failed.early_disconnect.provider": {
      _meta: {
        description: "Notification prestataire - Appel échoué pour déconnexion anticipée",
        category: "call",
      },
      channels: {
        email: true,
        push: true,
        inapp: true,
        sms: true,
      },
      email: {
        subject: "Appel interrompu - Aucun frais appliqué",
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .info-box { background: #fef3c7; border: 1px solid #fcd34d; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Appel interrompu</h1>
    </div>
    <div class="content">
      <p>Bonjour,</p>

      <p>Un appel récent a été interrompu avant la durée minimale de 60 secondes avec les deux parties connectées.</p>

      <div class="info-box">
        <p><strong>Ce qui s'est passé :</strong> L'appel s'est terminé avant le seuil de facturation. Le client a été automatiquement remboursé et aucun paiement ne sera traité pour cet appel.</p>
      </div>

      <p>Vous restez disponible pour de nouvelles demandes de clients. Si vous rencontrez des problèmes de connexion, veuillez vérifier votre signal téléphonique.</p>

      <p>Cordialement,<br>L'équipe SOS Expat</p>
    </div>
    <div class="footer">
      <p>SOS Expat - Connecter les Expatriés du Monde Entier</p>
    </div>
  </div>
</body>
</html>
        `,
        text: `Bonjour,

Un appel récent a été interrompu avant la durée minimale de 60 secondes.

Le client a été automatiquement remboursé et aucun paiement ne sera traité pour cet appel.

Vous restez disponible pour de nouvelles demandes.

Cordialement,
L'équipe SOS Expat`,
      },
      sms: {
        text: "SOS Expat: Un appel s'est terminé trop tôt (< 60s). Client remboursé, pas de paiement. Vous restez disponible.",
      },
      push: {
        title: "Appel interrompu",
        body: "Un appel s'est terminé trop tôt. Client remboursé, aucun frais.",
        deeplink: "/dashboard/calls",
      },
      inapp: {
        title: "Appel interrompu",
        body: "Un appel récent s'est terminé avant les 60 secondes minimales. Le client a été remboursé automatiquement.",
      },
    },
  },

  // =====================================================
  // SPANISH
  // =====================================================
  es: {
    "call.refund.early_disconnect": {
      _meta: {
        description: "Notificación al cliente - Reembolso por desconexión anticipada",
        category: "payment",
      },
      channels: {
        email: true,
        push: true,
        inapp: true,
        sms: false,
      },
      email: {
        subject: "Su pago ha sido reembolsado - Llamada interrumpida",
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .refund-box { background: #ecfdf5; border: 1px solid #a7f3d0; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
    .refund-amount { font-size: 24px; font-weight: bold; color: #059669; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Pago reembolsado</h1>
    </div>
    <div class="content">
      <p>Hola,</p>

      <p>Su llamada reciente se desconectó antes de la duración mínima requerida para la facturación (60 segundos con ambas partes conectadas).</p>

      <div class="refund-box">
        <p>Monto reembolsado:</p>
        <p class="refund-amount">{{AMOUNT}}</p>
      </div>

      <p>El reembolso se ha procesado automáticamente y aparecerá en su cuenta en un plazo de 5 a 10 días hábiles, según su banco.</p>

      <p>Si desea intentarlo de nuevo, puede reservar una nueva llamada con un proveedor en cualquier momento.</p>

      <p>Saludos cordiales,<br>El equipo de SOS Expat</p>
    </div>
    <div class="footer">
      <p>SOS Expat - Conectando Expatriados en Todo el Mundo</p>
    </div>
  </div>
</body>
</html>
        `,
        text: `Hola,

Su llamada reciente se desconectó antes de la duración mínima requerida para la facturación.

Monto reembolsado: {{AMOUNT}}

El reembolso se ha procesado automáticamente y aparecerá en su cuenta en un plazo de 5 a 10 días hábiles.

Saludos cordiales,
El equipo de SOS Expat`,
      },
      push: {
        title: "Pago reembolsado",
        body: "Su pago de {{AMOUNT}} ha sido reembolsado debido a una desconexión anticipada.",
        deeplink: "/dashboard/payments",
      },
      inapp: {
        title: "Pago reembolsado",
        body: "Su pago de {{AMOUNT}} ha sido reembolsado. La llamada terminó antes de la duración mínima requerida.",
      },
    },
    "call.failed.early_disconnect.provider": {
      _meta: {
        description: "Notificación al proveedor - Llamada fallida por desconexión anticipada",
        category: "call",
      },
      channels: {
        email: true,
        push: true,
        inapp: true,
        sms: true,
      },
      email: {
        subject: "Llamada interrumpida - Sin cargo aplicado",
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .info-box { background: #fef3c7; border: 1px solid #fcd34d; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Llamada interrumpida</h1>
    </div>
    <div class="content">
      <p>Hola,</p>

      <p>Una llamada reciente se desconectó antes de la duración mínima de 60 segundos con ambas partes conectadas.</p>

      <div class="info-box">
        <p><strong>Qué sucedió:</strong> La llamada terminó antes del umbral de facturación. El cliente ha sido reembolsado automáticamente y no se procesará ningún pago por esta llamada.</p>
      </div>

      <p>Permanece disponible para nuevas solicitudes de clientes. Si experimenta problemas de conexión, verifique su señal telefónica.</p>

      <p>Saludos cordiales,<br>El equipo de SOS Expat</p>
    </div>
    <div class="footer">
      <p>SOS Expat - Conectando Expatriados en Todo el Mundo</p>
    </div>
  </div>
</body>
</html>
        `,
        text: `Hola,

Una llamada reciente se desconectó antes de la duración mínima de 60 segundos.

El cliente ha sido reembolsado automáticamente y no se procesará ningún pago por esta llamada.

Permanece disponible para nuevas solicitudes.

Saludos cordiales,
El equipo de SOS Expat`,
      },
      sms: {
        text: "SOS Expat: Una llamada terminó antes (< 60s). Cliente reembolsado, sin pago. Sigue disponible para solicitudes.",
      },
      push: {
        title: "Llamada interrumpida",
        body: "Una llamada terminó antes de tiempo. Cliente reembolsado, sin cargo.",
        deeplink: "/dashboard/calls",
      },
      inapp: {
        title: "Llamada interrumpida",
        body: "Una llamada reciente terminó antes de los 60 segundos mínimos. El cliente fue reembolsado automáticamente.",
      },
    },
  },

  // =====================================================
  // GERMAN
  // =====================================================
  de: {
    "call.refund.early_disconnect": {
      _meta: {
        description: "Kundenbenachrichtigung - Erstattung bei vorzeitiger Trennung",
        category: "payment",
      },
      channels: {
        email: true,
        push: true,
        inapp: true,
        sms: false,
      },
      email: {
        subject: "Ihre Zahlung wurde erstattet - Anruf vorzeitig beendet",
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .refund-box { background: #ecfdf5; border: 1px solid #a7f3d0; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
    .refund-amount { font-size: 24px; font-weight: bold; color: #059669; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Zahlung erstattet</h1>
    </div>
    <div class="content">
      <p>Hallo,</p>

      <p>Ihr kürzlicher Anruf wurde vor der für die Abrechnung erforderlichen Mindestdauer (60 Sekunden mit beiden verbundenen Parteien) getrennt.</p>

      <div class="refund-box">
        <p>Erstatteter Betrag:</p>
        <p class="refund-amount">{{AMOUNT}}</p>
      </div>

      <p>Die Erstattung wurde automatisch verarbeitet und erscheint innerhalb von 5-10 Werktagen auf Ihrem Konto, je nach Bank.</p>

      <p>Wenn Sie es erneut versuchen möchten, können Sie jederzeit einen neuen Anruf mit einem Anbieter buchen.</p>

      <p>Mit freundlichen Grüßen,<br>Das SOS Expat Team</p>
    </div>
    <div class="footer">
      <p>SOS Expat - Expatriates weltweit verbinden</p>
    </div>
  </div>
</body>
</html>
        `,
        text: `Hallo,

Ihr kürzlicher Anruf wurde vor der für die Abrechnung erforderlichen Mindestdauer getrennt.

Erstatteter Betrag: {{AMOUNT}}

Die Erstattung wurde automatisch verarbeitet und erscheint innerhalb von 5-10 Werktagen auf Ihrem Konto.

Mit freundlichen Grüßen,
Das SOS Expat Team`,
      },
      push: {
        title: "Zahlung erstattet",
        body: "Ihre Zahlung von {{AMOUNT}} wurde aufgrund vorzeitiger Trennung erstattet.",
        deeplink: "/dashboard/payments",
      },
      inapp: {
        title: "Zahlung erstattet",
        body: "Ihre Zahlung von {{AMOUNT}} wurde erstattet. Der Anruf endete vor der erforderlichen Mindestdauer.",
      },
    },
    "call.failed.early_disconnect.provider": {
      _meta: {
        description: "Anbieterbenachrichtigung - Anruf fehlgeschlagen wegen vorzeitiger Trennung",
        category: "call",
      },
      channels: {
        email: true,
        push: true,
        inapp: true,
        sms: true,
      },
      email: {
        subject: "Anruf vorzeitig beendet - Keine Gebühr erhoben",
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .info-box { background: #fef3c7; border: 1px solid #fcd34d; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Anruf vorzeitig beendet</h1>
    </div>
    <div class="content">
      <p>Hallo,</p>

      <p>Ein kürzlicher Anruf wurde vor der Mindestdauer von 60 Sekunden mit beiden verbundenen Parteien getrennt.</p>

      <div class="info-box">
        <p><strong>Was passiert ist:</strong> Der Anruf endete vor dem Abrechnungsschwellenwert. Der Kunde wurde automatisch erstattet und für diesen Anruf wird keine Zahlung verarbeitet.</p>
      </div>

      <p>Sie bleiben für neue Kundenanfragen verfügbar. Wenn Sie Verbindungsprobleme haben, überprüfen Sie bitte Ihr Telefonsignal.</p>

      <p>Mit freundlichen Grüßen,<br>Das SOS Expat Team</p>
    </div>
    <div class="footer">
      <p>SOS Expat - Expatriates weltweit verbinden</p>
    </div>
  </div>
</body>
</html>
        `,
        text: `Hallo,

Ein kürzlicher Anruf wurde vor der Mindestdauer von 60 Sekunden getrennt.

Der Kunde wurde automatisch erstattet und für diesen Anruf wird keine Zahlung verarbeitet.

Sie bleiben für neue Anfragen verfügbar.

Mit freundlichen Grüßen,
Das SOS Expat Team`,
      },
      sms: {
        text: "SOS Expat: Ein Anruf endete früh (< 60s). Kunde erstattet, keine Zahlung. Sie bleiben verfügbar.",
      },
      push: {
        title: "Anruf vorzeitig beendet",
        body: "Ein Anruf wurde früh getrennt. Kunde erstattet, keine Gebühr.",
        deeplink: "/dashboard/calls",
      },
      inapp: {
        title: "Anruf vorzeitig beendet",
        body: "Ein kürzlicher Anruf endete vor den 60 Sekunden Minimum. Der Kunde wurde automatisch erstattet.",
      },
    },
  },

  // =====================================================
  // PORTUGUESE
  // =====================================================
  pt: {
    "call.refund.early_disconnect": {
      _meta: {
        description: "Notificação ao cliente - Reembolso por desconexão antecipada",
        category: "payment",
      },
      channels: {
        email: true,
        push: true,
        inapp: true,
        sms: false,
      },
      email: {
        subject: "Seu pagamento foi reembolsado - Chamada interrompida",
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .refund-box { background: #ecfdf5; border: 1px solid #a7f3d0; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
    .refund-amount { font-size: 24px; font-weight: bold; color: #059669; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Pagamento reembolsado</h1>
    </div>
    <div class="content">
      <p>Olá,</p>

      <p>Sua chamada recente foi desconectada antes da duração mínima necessária para faturamento (60 segundos com ambas as partes conectadas).</p>

      <div class="refund-box">
        <p>Valor reembolsado:</p>
        <p class="refund-amount">{{AMOUNT}}</p>
      </div>

      <p>O reembolso foi processado automaticamente e aparecerá em sua conta dentro de 5 a 10 dias úteis, dependendo do seu banco.</p>

      <p>Se quiser tentar novamente, você pode agendar uma nova chamada com um prestador a qualquer momento.</p>

      <p>Atenciosamente,<br>A equipe SOS Expat</p>
    </div>
    <div class="footer">
      <p>SOS Expat - Conectando Expatriados no Mundo Todo</p>
    </div>
  </div>
</body>
</html>
        `,
        text: `Olá,

Sua chamada recente foi desconectada antes da duração mínima necessária para faturamento.

Valor reembolsado: {{AMOUNT}}

O reembolso foi processado automaticamente e aparecerá em sua conta dentro de 5 a 10 dias úteis.

Atenciosamente,
A equipe SOS Expat`,
      },
      push: {
        title: "Pagamento reembolsado",
        body: "Seu pagamento de {{AMOUNT}} foi reembolsado devido a uma desconexão antecipada.",
        deeplink: "/dashboard/payments",
      },
      inapp: {
        title: "Pagamento reembolsado",
        body: "Seu pagamento de {{AMOUNT}} foi reembolsado. A chamada terminou antes da duração mínima necessária.",
      },
    },
    "call.failed.early_disconnect.provider": {
      _meta: {
        description: "Notificação ao prestador - Chamada falhou por desconexão antecipada",
        category: "call",
      },
      channels: {
        email: true,
        push: true,
        inapp: true,
        sms: true,
      },
      email: {
        subject: "Chamada interrompida - Nenhuma cobrança aplicada",
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .info-box { background: #fef3c7; border: 1px solid #fcd34d; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Chamada interrompida</h1>
    </div>
    <div class="content">
      <p>Olá,</p>

      <p>Uma chamada recente foi desconectada antes da duração mínima de 60 segundos com ambas as partes conectadas.</p>

      <div class="info-box">
        <p><strong>O que aconteceu:</strong> A chamada terminou antes do limite de faturamento. O cliente foi reembolsado automaticamente e nenhum pagamento será processado para esta chamada.</p>
      </div>

      <p>Você permanece disponível para novas solicitações de clientes. Se tiver problemas de conexão, verifique o sinal do seu telefone.</p>

      <p>Atenciosamente,<br>A equipe SOS Expat</p>
    </div>
    <div class="footer">
      <p>SOS Expat - Conectando Expatriados no Mundo Todo</p>
    </div>
  </div>
</body>
</html>
        `,
        text: `Olá,

Uma chamada recente foi desconectada antes da duração mínima de 60 segundos.

O cliente foi reembolsado automaticamente e nenhum pagamento será processado para esta chamada.

Você permanece disponível para novas solicitações.

Atenciosamente,
A equipe SOS Expat`,
      },
      sms: {
        text: "SOS Expat: Uma chamada terminou cedo (< 60s). Cliente reembolsado, sem pagamento. Você continua disponível.",
      },
      push: {
        title: "Chamada interrompida",
        body: "Uma chamada terminou cedo. Cliente reembolsado, sem cobrança.",
        deeplink: "/dashboard/calls",
      },
      inapp: {
        title: "Chamada interrompida",
        body: "Uma chamada recente terminou antes dos 60 segundos mínimos. O cliente foi reembolsado automaticamente.",
      },
    },
  },

  // =====================================================
  // RUSSIAN
  // =====================================================
  ru: {
    "call.refund.early_disconnect": {
      _meta: {
        description: "Уведомление клиенту - Возврат за преждевременное отключение",
        category: "payment",
      },
      channels: {
        email: true,
        push: true,
        inapp: true,
        sms: false,
      },
      email: {
        subject: "Ваш платеж возвращен - Звонок прерван",
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .refund-box { background: #ecfdf5; border: 1px solid #a7f3d0; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
    .refund-amount { font-size: 24px; font-weight: bold; color: #059669; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Платеж возвращен</h1>
    </div>
    <div class="content">
      <p>Здравствуйте,</p>

      <p>Ваш недавний звонок был прерван до минимальной продолжительности, необходимой для выставления счета (60 секунд с обеими подключенными сторонами).</p>

      <div class="refund-box">
        <p>Сумма возврата:</p>
        <p class="refund-amount">{{AMOUNT}}</p>
      </div>

      <p>Возврат был обработан автоматически и появится на вашем счете в течение 5-10 рабочих дней, в зависимости от вашего банка.</p>

      <p>Если вы хотите попробовать снова, вы можете забронировать новый звонок с поставщиком в любое время.</p>

      <p>С уважением,<br>Команда SOS Expat</p>
    </div>
    <div class="footer">
      <p>SOS Expat - Объединяем экспатов по всему миру</p>
    </div>
  </div>
</body>
</html>
        `,
        text: `Здравствуйте,

Ваш недавний звонок был прерван до минимальной продолжительности, необходимой для выставления счета.

Сумма возврата: {{AMOUNT}}

Возврат был обработан автоматически и появится на вашем счете в течение 5-10 рабочих дней.

С уважением,
Команда SOS Expat`,
      },
      push: {
        title: "Платеж возвращен",
        body: "Ваш платеж {{AMOUNT}} был возвращен из-за преждевременного отключения.",
        deeplink: "/dashboard/payments",
      },
      inapp: {
        title: "Платеж возвращен",
        body: "Ваш платеж {{AMOUNT}} был возвращен. Звонок завершился до минимальной требуемой продолжительности.",
      },
    },
    "call.failed.early_disconnect.provider": {
      _meta: {
        description: "Уведомление поставщику - Звонок не удался из-за преждевременного отключения",
        category: "call",
      },
      channels: {
        email: true,
        push: true,
        inapp: true,
        sms: true,
      },
      email: {
        subject: "Звонок прерван - Оплата не взимается",
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .info-box { background: #fef3c7; border: 1px solid #fcd34d; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Звонок прерван</h1>
    </div>
    <div class="content">
      <p>Здравствуйте,</p>

      <p>Недавний звонок был прерван до минимальной продолжительности в 60 секунд с обеими подключенными сторонами.</p>

      <div class="info-box">
        <p><strong>Что произошло:</strong> Звонок завершился до порога выставления счета. Клиенту был автоматически возвращен платеж, и оплата за этот звонок не будет обработана.</p>
      </div>

      <p>Вы остаетесь доступны для новых запросов клиентов. Если у вас проблемы с подключением, проверьте сигнал телефона.</p>

      <p>С уважением,<br>Команда SOS Expat</p>
    </div>
    <div class="footer">
      <p>SOS Expat - Объединяем экспатов по всему миру</p>
    </div>
  </div>
</body>
</html>
        `,
        text: `Здравствуйте,

Недавний звонок был прерван до минимальной продолжительности в 60 секунд.

Клиенту был автоматически возвращен платеж, и оплата за этот звонок не будет обработана.

Вы остаетесь доступны для новых запросов.

С уважением,
Команда SOS Expat`,
      },
      sms: {
        text: "SOS Expat: Звонок завершился рано (< 60с). Клиенту возвращен платеж. Вы по-прежнему доступны.",
      },
      push: {
        title: "Звонок прерван",
        body: "Звонок завершился рано. Клиенту возвращен платеж, оплата не взимается.",
        deeplink: "/dashboard/calls",
      },
      inapp: {
        title: "Звонок прерван",
        body: "Недавний звонок завершился до 60 секунд минимума. Клиенту был автоматически возвращен платеж.",
      },
    },
  },

  // =====================================================
  // ARABIC
  // =====================================================
  ar: {
    "call.refund.early_disconnect": {
      _meta: {
        description: "إشعار العميل - استرداد بسبب قطع الاتصال المبكر",
        category: "payment",
      },
      channels: {
        email: true,
        push: true,
        inapp: true,
        sms: false,
      },
      email: {
        subject: "تم استرداد دفعتك - انتهت المكالمة مبكراً",
        html: `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.8; color: #333; direction: rtl; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .refund-box { background: #ecfdf5; border: 1px solid #a7f3d0; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
    .refund-amount { font-size: 24px; font-weight: bold; color: #059669; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>تم استرداد الدفع</h1>
    </div>
    <div class="content">
      <p>مرحباً،</p>

      <p>تم قطع مكالمتك الأخيرة قبل الحد الأدنى للمدة المطلوبة للفوترة (60 ثانية مع اتصال الطرفين).</p>

      <div class="refund-box">
        <p>المبلغ المسترد:</p>
        <p class="refund-amount">{{AMOUNT}}</p>
      </div>

      <p>تمت معالجة الاسترداد تلقائياً وسيظهر في حسابك خلال 5-10 أيام عمل، حسب البنك الخاص بك.</p>

      <p>إذا كنت ترغب في المحاولة مرة أخرى، يمكنك حجز مكالمة جديدة مع مقدم خدمة في أي وقت.</p>

      <p>مع أطيب التحيات،<br>فريق SOS Expat</p>
    </div>
    <div class="footer">
      <p>SOS Expat - ربط المغتربين حول العالم</p>
    </div>
  </div>
</body>
</html>
        `,
        text: `مرحباً،

تم قطع مكالمتك الأخيرة قبل الحد الأدنى للمدة المطلوبة للفوترة.

المبلغ المسترد: {{AMOUNT}}

تمت معالجة الاسترداد تلقائياً وسيظهر في حسابك خلال 5-10 أيام عمل.

مع أطيب التحيات،
فريق SOS Expat`,
      },
      push: {
        title: "تم استرداد الدفع",
        body: "تم استرداد دفعتك بقيمة {{AMOUNT}} بسبب قطع الاتصال المبكر.",
        deeplink: "/dashboard/payments",
      },
      inapp: {
        title: "تم استرداد الدفع",
        body: "تم استرداد دفعتك بقيمة {{AMOUNT}}. انتهت المكالمة قبل الحد الأدنى المطلوب للمدة.",
      },
    },
    "call.failed.early_disconnect.provider": {
      _meta: {
        description: "إشعار مقدم الخدمة - فشلت المكالمة بسبب قطع الاتصال المبكر",
        category: "call",
      },
      channels: {
        email: true,
        push: true,
        inapp: true,
        sms: true,
      },
      email: {
        subject: "انتهت المكالمة مبكراً - لم يتم تطبيق أي رسوم",
        html: `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.8; color: #333; direction: rtl; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .info-box { background: #fef3c7; border: 1px solid #fcd34d; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>انتهت المكالمة مبكراً</h1>
    </div>
    <div class="content">
      <p>مرحباً،</p>

      <p>تم قطع مكالمة أخيرة قبل الحد الأدنى للمدة وهو 60 ثانية مع اتصال الطرفين.</p>

      <div class="info-box">
        <p><strong>ما حدث:</strong> انتهت المكالمة قبل عتبة الفوترة. تم استرداد المبلغ للعميل تلقائياً ولن تتم معالجة أي دفع لهذه المكالمة.</p>
      </div>

      <p>أنت لا تزال متاحاً لطلبات العملاء الجديدة. إذا واجهت مشاكل في الاتصال، يرجى التحقق من إشارة هاتفك.</p>

      <p>مع أطيب التحيات،<br>فريق SOS Expat</p>
    </div>
    <div class="footer">
      <p>SOS Expat - ربط المغتربين حول العالم</p>
    </div>
  </div>
</body>
</html>
        `,
        text: `مرحباً،

تم قطع مكالمة أخيرة قبل الحد الأدنى للمدة وهو 60 ثانية.

تم استرداد المبلغ للعميل تلقائياً ولن تتم معالجة أي دفع لهذه المكالمة.

أنت لا تزال متاحاً للطلبات الجديدة.

مع أطيب التحيات،
فريق SOS Expat`,
      },
      sms: {
        text: "SOS Expat: انتهت مكالمة مبكراً (< 60 ث). تم استرداد المبلغ للعميل. أنت لا تزال متاحاً.",
      },
      push: {
        title: "انتهت المكالمة مبكراً",
        body: "انتهت مكالمة مبكراً. تم استرداد المبلغ للعميل، لا رسوم.",
        deeplink: "/dashboard/calls",
      },
      inapp: {
        title: "انتهت المكالمة مبكراً",
        body: "انتهت مكالمة أخيرة قبل 60 ثانية الدنيا. تم استرداد المبلغ للعميل تلقائياً.",
      },
    },
  },

  // =====================================================
  // HINDI
  // =====================================================
  hi: {
    "call.refund.early_disconnect": {
      _meta: {
        description: "ग्राहक अधिसूचना - जल्दी डिस्कनेक्ट के लिए रिफंड",
        category: "payment",
      },
      channels: {
        email: true,
        push: true,
        inapp: true,
        sms: false,
      },
      email: {
        subject: "आपका भुगतान वापस कर दिया गया है - कॉल जल्दी समाप्त हुई",
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .refund-box { background: #ecfdf5; border: 1px solid #a7f3d0; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
    .refund-amount { font-size: 24px; font-weight: bold; color: #059669; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>भुगतान वापस किया गया</h1>
    </div>
    <div class="content">
      <p>नमस्ते,</p>

      <p>आपकी हाल की कॉल बिलिंग के लिए आवश्यक न्यूनतम अवधि (दोनों पक्षों के जुड़े रहते 60 सेकंड) से पहले डिस्कनेक्ट हो गई।</p>

      <div class="refund-box">
        <p>वापस की गई राशि:</p>
        <p class="refund-amount">{{AMOUNT}}</p>
      </div>

      <p>रिफंड स्वचालित रूप से प्रोसेस किया गया है और आपके बैंक के आधार पर 5-10 व्यावसायिक दिनों में आपके खाते में दिखाई देगा।</p>

      <p>यदि आप पुनः प्रयास करना चाहते हैं, तो आप किसी भी समय एक प्रदाता के साथ नई कॉल बुक कर सकते हैं।</p>

      <p>सादर,<br>SOS Expat टीम</p>
    </div>
    <div class="footer">
      <p>SOS Expat - दुनिया भर में प्रवासियों को जोड़ना</p>
    </div>
  </div>
</body>
</html>
        `,
        text: `नमस्ते,

आपकी हाल की कॉल बिलिंग के लिए आवश्यक न्यूनतम अवधि से पहले डिस्कनेक्ट हो गई।

वापस की गई राशि: {{AMOUNT}}

रिफंड स्वचालित रूप से प्रोसेस किया गया है और 5-10 व्यावसायिक दिनों में आपके खाते में दिखाई देगा।

सादर,
SOS Expat टीम`,
      },
      push: {
        title: "भुगतान वापस किया गया",
        body: "जल्दी डिस्कनेक्ट के कारण आपका {{AMOUNT}} का भुगतान वापस कर दिया गया है।",
        deeplink: "/dashboard/payments",
      },
      inapp: {
        title: "भुगतान वापस किया गया",
        body: "आपका {{AMOUNT}} का भुगतान वापस कर दिया गया है। कॉल न्यूनतम आवश्यक अवधि से पहले समाप्त हो गई।",
      },
    },
    "call.failed.early_disconnect.provider": {
      _meta: {
        description: "प्रदाता अधिसूचना - जल्दी डिस्कनेक्ट के कारण कॉल विफल",
        category: "call",
      },
      channels: {
        email: true,
        push: true,
        inapp: true,
        sms: true,
      },
      email: {
        subject: "कॉल जल्दी समाप्त हुई - कोई शुल्क नहीं लगाया गया",
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .info-box { background: #fef3c7; border: 1px solid #fcd34d; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>कॉल जल्दी समाप्त हुई</h1>
    </div>
    <div class="content">
      <p>नमस्ते,</p>

      <p>एक हाल की कॉल दोनों पक्षों के जुड़े रहते 60 सेकंड की न्यूनतम अवधि से पहले डिस्कनेक्ट हो गई।</p>

      <div class="info-box">
        <p><strong>क्या हुआ:</strong> कॉल बिलिंग सीमा से पहले समाप्त हो गई। ग्राहक को स्वचालित रूप से रिफंड कर दिया गया है और इस कॉल के लिए कोई भुगतान प्रोसेस नहीं किया जाएगा।</p>
      </div>

      <p>आप नए ग्राहक अनुरोधों के लिए उपलब्ध रहते हैं। यदि आपको कनेक्शन समस्याएं हैं, तो कृपया अपने फोन सिग्नल की जांच करें।</p>

      <p>सादर,<br>SOS Expat टीम</p>
    </div>
    <div class="footer">
      <p>SOS Expat - दुनिया भर में प्रवासियों को जोड़ना</p>
    </div>
  </div>
</body>
</html>
        `,
        text: `नमस्ते,

एक हाल की कॉल 60 सेकंड की न्यूनतम अवधि से पहले डिस्कनेक्ट हो गई।

ग्राहक को स्वचालित रूप से रिफंड कर दिया गया है और इस कॉल के लिए कोई भुगतान प्रोसेस नहीं किया जाएगा।

आप नए अनुरोधों के लिए उपलब्ध रहते हैं।

सादर,
SOS Expat टीम`,
      },
      sms: {
        text: "SOS Expat: कॉल जल्दी समाप्त (< 60s)। ग्राहक को रिफंड, कोई भुगतान नहीं। आप उपलब्ध हैं।",
      },
      push: {
        title: "कॉल जल्दी समाप्त हुई",
        body: "एक कॉल जल्दी डिस्कनेक्ट हो गई। ग्राहक को रिफंड, कोई शुल्क नहीं।",
        deeplink: "/dashboard/calls",
      },
      inapp: {
        title: "कॉल जल्दी समाप्त हुई",
        body: "एक हाल की कॉल 60 सेकंड न्यूनतम से पहले समाप्त हो गई। ग्राहक को स्वचालित रूप से रिफंड कर दिया गया।",
      },
    },
  },

  // =====================================================
  // CHINESE
  // =====================================================
  ch: {
    "call.refund.early_disconnect": {
      _meta: {
        description: "客户通知 - 提前断开连接退款",
        category: "payment",
      },
      channels: {
        email: true,
        push: true,
        inapp: true,
        sms: false,
      },
      email: {
        subject: "您的付款已退还 - 通话提前结束",
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .refund-box { background: #ecfdf5; border: 1px solid #a7f3d0; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
    .refund-amount { font-size: 24px; font-weight: bold; color: #059669; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>付款已退还</h1>
    </div>
    <div class="content">
      <p>您好，</p>

      <p>您最近的通话在达到计费所需的最短时长（双方连接60秒）之前断开了。</p>

      <div class="refund-box">
        <p>退款金额：</p>
        <p class="refund-amount">{{AMOUNT}}</p>
      </div>

      <p>退款已自动处理，将在5-10个工作日内显示在您的账户中，具体取决于您的银行。</p>

      <p>如果您想再次尝试，可以随时与服务提供商预约新的通话。</p>

      <p>此致，<br>SOS Expat团队</p>
    </div>
    <div class="footer">
      <p>SOS Expat - 连接全球侨民</p>
    </div>
  </div>
</body>
</html>
        `,
        text: `您好，

您最近的通话在达到计费所需的最短时长之前断开了。

退款金额：{{AMOUNT}}

退款已自动处理，将在5-10个工作日内显示在您的账户中。

此致，
SOS Expat团队`,
      },
      push: {
        title: "付款已退还",
        body: "由于提前断开连接，您的{{AMOUNT}}付款已退还。",
        deeplink: "/dashboard/payments",
      },
      inapp: {
        title: "付款已退还",
        body: "您的{{AMOUNT}}付款已退还。通话在达到所需最短时长之前结束。",
      },
    },
    "call.failed.early_disconnect.provider": {
      _meta: {
        description: "服务提供商通知 - 通话因提前断开而失败",
        category: "call",
      },
      channels: {
        email: true,
        push: true,
        inapp: true,
        sms: true,
      },
      email: {
        subject: "通话提前结束 - 未收取费用",
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .info-box { background: #fef3c7; border: 1px solid #fcd34d; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>通话提前结束</h1>
    </div>
    <div class="content">
      <p>您好，</p>

      <p>最近一次通话在双方连接60秒的最短时长之前断开了。</p>

      <div class="info-box">
        <p><strong>发生了什么：</strong>通话在达到计费门槛之前结束。客户已自动获得退款，此通话不会处理任何付款。</p>
      </div>

      <p>您仍可接受新的客户请求。如果您遇到连接问题，请检查您的手机信号。</p>

      <p>此致，<br>SOS Expat团队</p>
    </div>
    <div class="footer">
      <p>SOS Expat - 连接全球侨民</p>
    </div>
  </div>
</body>
</html>
        `,
        text: `您好，

最近一次通话在60秒最短时长之前断开了。

客户已自动获得退款，此通话不会处理任何付款。

您仍可接受新的请求。

此致，
SOS Expat团队`,
      },
      sms: {
        text: "SOS Expat：通话提前结束（< 60秒）。客户已退款，无需付款。您仍可接单。",
      },
      push: {
        title: "通话提前结束",
        body: "一次通话提前断开。客户已退款，未收取费用。",
        deeplink: "/dashboard/calls",
      },
      inapp: {
        title: "通话提前结束",
        body: "最近一次通话在60秒最短时长之前结束。客户已自动获得退款。",
      },
    },
  },
};

/**
 * Fonction Cloud callable pour initialiser les templates de déconnexion anticipée
 * À appeler une fois lors du setup
 */
export const initEarlyDisconnectTemplates = onCall(
  {
    region: "europe-west1",
  },
  async (request) => {
    // Vérifier l'authentification admin
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const db = admin.firestore();
    const userDoc = await db.collection("users").doc(request.auth.uid).get();
    const userData = userDoc.data();

    if (!userData?.role || !["admin", "dev"].includes(userData.role)) {
      throw new HttpsError("permission-denied", "Only admins can initialize templates");
    }

    const batch = db.batch();
    let templateCount = 0;

    // Ajouter templates pour chaque langue
    for (const [lang, templates] of Object.entries(TEMPLATES)) {
      for (const [eventId, template] of Object.entries(templates)) {
        const ref = db.collection("message_templates").doc(lang).collection("items").doc(eventId);
        batch.set(ref, template, { merge: true });
        templateCount++;
      }
    }

    await batch.commit();

    return {
      success: true,
      message: "Early disconnect notification templates initialized",
      languages: Object.keys(TEMPLATES),
      templatesPerLanguage: 2,
      totalTemplates: templateCount,
    };
  }
);

// Export pour utilisation dans d'autres scripts
export { TEMPLATES as EARLY_DISCONNECT_TEMPLATES };
