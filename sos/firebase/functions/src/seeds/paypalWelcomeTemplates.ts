/**
 * Script de seed pour les templates de bienvenue PayPal
 *
 * Templates en 9 langues: fr, en, es, pt, de, ru, zh, ar, hi
 * 🎨 Aux couleurs SOS Expat avec un ton fun et sympa !
 *
 * Exécuter avec:
 * npx ts-node src/seeds/paypalWelcomeTemplates.ts
 *
 * Ou déployer la fonction initPayPalWelcomeTemplates et l'appeler
 */

import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";

// =============================================================================
// EMAIL STYLES - COULEURS SOS EXPAT 🎨
// =============================================================================

const EMAIL_STYLES = `
  body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.7; color: #0f172a; margin: 0; padding: 0; background: #f8fafc; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #3b82f6 100%); color: white; padding: 35px 25px; text-align: center; border-radius: 16px 16px 0 0; }
  .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
  .header .emoji { font-size: 48px; margin-bottom: 15px; display: block; }
  .header .subtitle { opacity: 0.95; margin-top: 12px; font-size: 17px; font-weight: 400; }
  .content { background: #ffffff; padding: 35px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
  .greeting { font-size: 20px; color: #2563eb; margin-bottom: 20px; }
  .btn { display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white !important; padding: 16px 40px; text-decoration: none; border-radius: 50px; margin: 25px 0; font-weight: 600; font-size: 17px; box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3); transition: transform 0.2s; }
  .btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4); }
  .steps { background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #2563eb; }
  .steps h3 { margin-top: 0; color: #1d4ed8; font-size: 18px; display: flex; align-items: center; gap: 8px; }
  .steps ol { padding-left: 20px; margin: 15px 0 0 0; }
  .steps li { margin: 12px 0; color: #334155; }
  .steps li::marker { color: #2563eb; font-weight: bold; }
  .highlight { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 20px; border-radius: 12px; margin: 25px 0; text-align: center; }
  .highlight strong { color: #92400e; font-size: 18px; }
  .fun-fact { background: #f0fdf4; border: 2px dashed #22c55e; padding: 15px 20px; border-radius: 12px; margin: 20px 0; }
  .fun-fact .icon { font-size: 24px; margin-right: 10px; }
  .footer { text-align: center; color: #64748b; font-size: 13px; margin-top: 25px; padding: 25px; }
  .footer .brand { font-weight: 700; color: #2563eb; font-size: 16px; }
  .social-proof { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; font-style: italic; color: #475569; border-left: 3px solid #22c55e; }
`;

// =============================================================================
// TEMPLATES PAR LANGUE - TON FUN ET SYMPA 🎉
// =============================================================================

const PAYPAL_WELCOME_TEMPLATES: Record<string, any> = {
  // ==========================================================================
  // FRANÇAIS 🇫🇷
  // ==========================================================================
  fr: {
    "paypal.welcome.onboarding": {
      _meta: {
        description: "Email de bienvenue avec lien PayPal - Français (ton fun)",
        category: "paypal",
        language: "fr",
      },
      channels: {
        email: true,
        push: true,
        inapp: true,
        sms: false,
      },
      email: {
        subject: "🎉 Youpi ! Plus qu'un clic pour recevoir vos premiers clients !",
        html: `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${EMAIL_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="emoji">🎊</span>
      <h1>Bienvenue dans l'aventure SOS Expat !</h1>
      <div class="subtitle">Vous êtes à 2 minutes de commencer à aider des expatriés 🌍</div>
    </div>
    <div class="content">
      <p class="greeting">Hey {{FIRST_NAME}} ! 👋</p>

      <p>On est <strong>super contents</strong> de vous accueillir dans la famille SOS Expat ! 🎉</p>

      <p>Vous avez fait le premier pas pour aider des expatriés du monde entier. C'est génial ! Maintenant, il ne reste plus qu'une petite étape pour que les clients puissent vous trouver et vous payer. 💪</p>

      <div class="highlight">
        <strong>⚡ 2 minutes chrono !</strong><br>
        C'est le temps qu'il faut pour connecter votre PayPal et commencer l'aventure.
      </div>

      <p style="text-align: center;">
        <a href="{{PAYPAL_ONBOARDING_URL}}" class="btn">🚀 Connecter mon PayPal maintenant</a>
      </p>

      <div class="steps">
        <h3>🎯 Comment ça marche ?</h3>
        <ol>
          <li><strong>Cliquez</strong> sur le super bouton bleu ci-dessus</li>
          <li><strong>Connectez-vous</strong> à votre PayPal (ou créez-en un, c'est gratuit !)</li>
          <li><strong>Autorisez</strong> SOS Expat à vous envoyer de l'argent (la meilleure partie 😄)</li>
          <li><strong>Tada !</strong> Vous êtes visible et prêt à recevoir des demandes !</li>
        </ol>
      </div>

      <div class="fun-fact">
        <span class="icon">💡</span>
        <strong>Le saviez-vous ?</strong> Les prestataires connectés reçoivent leur première demande en moyenne sous 48h !
      </div>

      <p>Une fois connecté, votre profil sera visible par des milliers de clients potentiels du monde entier. Excitant, non ? 🌟</p>

      <p>Si vous avez la moindre question, on est là ! Répondez simplement à cet email.</p>

      <p>À très vite sur SOS Expat ! 🙌<br><strong>L'équipe SOS Expat</strong></p>

      <p style="font-size: 14px; color: #64748b; margin-top: 25px;">
        PS : N'oubliez pas de compléter votre profil avec une belle photo et une description accrocheuse. Les clients adorent ça ! 📸
      </p>
    </div>
    <div class="footer">
      <p class="brand">SOS Expat</p>
      <p>Connecter les expatriés du monde entier 🌍</p>
      <p style="margin-top: 15px; font-size: 11px; color: #94a3b8;">
        Paiements sécurisés par PayPal
      </p>
    </div>
  </div>
</body>
</html>
        `,
        text: `Hey {{FIRST_NAME}} ! 👋

On est super contents de vous accueillir dans la famille SOS Expat ! 🎉

Vous avez fait le premier pas pour aider des expatriés du monde entier. Maintenant, il reste une petite étape pour que les clients puissent vous trouver et vous payer.

⚡ 2 minutes chrono ! C'est le temps qu'il faut pour connecter votre PayPal.

👉 Connectez-vous ici : {{PAYPAL_ONBOARDING_URL}}

Comment ça marche ?
1. Cliquez sur le lien ci-dessus
2. Connectez-vous à votre PayPal
3. Autorisez SOS Expat à vous envoyer de l'argent
4. Tada ! Vous êtes visible et prêt !

💡 Le saviez-vous ? Les prestataires connectés reçoivent leur première demande en moyenne sous 48h !

À très vite sur SOS Expat ! 🙌
L'équipe SOS Expat

PS : N'oubliez pas de compléter votre profil avec une belle photo ! 📸`,
      },
      push: {
        title: "🚀 Plus qu'un clic !",
        body: "Connectez PayPal pour recevoir vos premiers clients. 2 minutes top chrono !",
        deeplink: "/dashboard/paypal-connect",
      },
      inapp: {
        title: "Connectez PayPal en 2 minutes !",
        body: "Hey ! Pour que les clients vous trouvent et vous paient, connectez votre PayPal. C'est rapide et ça vaut le coup ! 🚀",
      },
    },
  },

  // ==========================================================================
  // ANGLAIS 🇬🇧
  // ==========================================================================
  en: {
    "paypal.welcome.onboarding": {
      _meta: {
        description: "Welcome email with PayPal link - English (fun tone)",
        category: "paypal",
        language: "en",
      },
      channels: {
        email: true,
        push: true,
        inapp: true,
        sms: false,
      },
      email: {
        subject: "🎉 Woohoo! Just one click away from your first clients!",
        html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${EMAIL_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="emoji">🎊</span>
      <h1>Welcome to the SOS Expat adventure!</h1>
      <div class="subtitle">You're 2 minutes away from helping expats worldwide 🌍</div>
    </div>
    <div class="content">
      <p class="greeting">Hey {{FIRST_NAME}}! 👋</p>

      <p>We're <strong>super excited</strong> to welcome you to the SOS Expat family! 🎉</p>

      <p>You've taken the first step to help expats around the world. That's awesome! Now there's just one tiny step left so clients can find you and pay you. 💪</p>

      <div class="highlight">
        <strong>⚡ Just 2 minutes!</strong><br>
        That's all it takes to connect your PayPal and start your adventure.
      </div>

      <p style="text-align: center;">
        <a href="{{PAYPAL_ONBOARDING_URL}}" class="btn">🚀 Connect my PayPal now</a>
      </p>

      <div class="steps">
        <h3>🎯 How does it work?</h3>
        <ol>
          <li><strong>Click</strong> that awesome blue button above</li>
          <li><strong>Log in</strong> to your PayPal (or create one, it's free!)</li>
          <li><strong>Authorize</strong> SOS Expat to send you money (the best part 😄)</li>
          <li><strong>Boom!</strong> You're visible and ready for requests!</li>
        </ol>
      </div>

      <div class="fun-fact">
        <span class="icon">💡</span>
        <strong>Fun fact:</strong> Connected providers receive their first request within 48 hours on average!
      </div>

      <p>Once connected, your profile will be visible to thousands of potential clients worldwide. Exciting, right? 🌟</p>

      <p>If you have any questions, we're here! Just reply to this email.</p>

      <p>See you soon on SOS Expat! 🙌<br><strong>The SOS Expat Team</strong></p>

      <p style="font-size: 14px; color: #64748b; margin-top: 25px;">
        PS: Don't forget to complete your profile with a great photo and catchy description. Clients love that! 📸
      </p>
    </div>
    <div class="footer">
      <p class="brand">SOS Expat</p>
      <p>Connecting Expatriates Worldwide 🌍</p>
      <p style="margin-top: 15px; font-size: 11px; color: #94a3b8;">
        Secure payments by PayPal
      </p>
    </div>
  </div>
</body>
</html>
        `,
        text: `Hey {{FIRST_NAME}}! 👋

We're super excited to welcome you to the SOS Expat family! 🎉

You've taken the first step to help expats around the world. Now there's just one tiny step left so clients can find you and pay you.

⚡ Just 2 minutes! That's all it takes to connect your PayPal.

👉 Connect here: {{PAYPAL_ONBOARDING_URL}}

How does it work?
1. Click the link above
2. Log in to your PayPal
3. Authorize SOS Expat to send you money
4. Boom! You're visible and ready!

💡 Fun fact: Connected providers receive their first request within 48 hours on average!

See you soon on SOS Expat! 🙌
The SOS Expat Team

PS: Don't forget to complete your profile with a great photo! 📸`,
      },
      push: {
        title: "🚀 Just one click!",
        body: "Connect PayPal to receive your first clients. Only 2 minutes!",
        deeplink: "/dashboard/paypal-connect",
      },
      inapp: {
        title: "Connect PayPal in 2 minutes!",
        body: "Hey! So clients can find and pay you, connect your PayPal. It's quick and totally worth it! 🚀",
      },
    },
  },

  // ==========================================================================
  // ESPAGNOL 🇪🇸
  // ==========================================================================
  es: {
    "paypal.welcome.onboarding": {
      _meta: {
        description: "Email de bienvenida con enlace PayPal - Español (tono divertido)",
        category: "paypal",
        language: "es",
      },
      channels: {
        email: true,
        push: true,
        inapp: true,
        sms: false,
      },
      email: {
        subject: "🎉 ¡Genial! ¡A un clic de recibir tus primeros clientes!",
        html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${EMAIL_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="emoji">🎊</span>
      <h1>¡Bienvenido a la aventura SOS Expat!</h1>
      <div class="subtitle">Estás a 2 minutos de ayudar a expatriados de todo el mundo 🌍</div>
    </div>
    <div class="content">
      <p class="greeting">¡Hola {{FIRST_NAME}}! 👋</p>

      <p>¡Estamos <strong>súper emocionados</strong> de darte la bienvenida a la familia SOS Expat! 🎉</p>

      <p>Has dado el primer paso para ayudar a expatriados de todo el mundo. ¡Es genial! Ahora solo falta un pequeño paso para que los clientes puedan encontrarte y pagarte. 💪</p>

      <div class="highlight">
        <strong>⚡ ¡Solo 2 minutos!</strong><br>
        Es todo lo que necesitas para conectar tu PayPal y comenzar la aventura.
      </div>

      <p style="text-align: center;">
        <a href="{{PAYPAL_ONBOARDING_URL}}" class="btn">🚀 Conectar mi PayPal ahora</a>
      </p>

      <div class="steps">
        <h3>🎯 ¿Cómo funciona?</h3>
        <ol>
          <li><strong>Haz clic</strong> en ese increíble botón azul de arriba</li>
          <li><strong>Inicia sesión</strong> en tu PayPal (o crea uno, ¡es gratis!)</li>
          <li><strong>Autoriza</strong> a SOS Expat para enviarte dinero (la mejor parte 😄)</li>
          <li><strong>¡Listo!</strong> ¡Ya eres visible y estás listo para recibir solicitudes!</li>
        </ol>
      </div>

      <div class="fun-fact">
        <span class="icon">💡</span>
        <strong>¿Sabías que?</strong> ¡Los proveedores conectados reciben su primera solicitud en promedio en 48 horas!
      </div>

      <p>Una vez conectado, tu perfil será visible para miles de clientes potenciales en todo el mundo. ¿Emocionante, verdad? 🌟</p>

      <p>Si tienes alguna pregunta, ¡estamos aquí! Solo responde a este email.</p>

      <p>¡Nos vemos pronto en SOS Expat! 🙌<br><strong>El equipo de SOS Expat</strong></p>

      <p style="font-size: 14px; color: #64748b; margin-top: 25px;">
        PD: No olvides completar tu perfil con una buena foto y una descripción atractiva. ¡A los clientes les encanta! 📸
      </p>
    </div>
    <div class="footer">
      <p class="brand">SOS Expat</p>
      <p>Conectando expatriados en todo el mundo 🌍</p>
      <p style="margin-top: 15px; font-size: 11px; color: #94a3b8;">
        Pagos seguros por PayPal
      </p>
    </div>
  </div>
</body>
</html>
        `,
        text: `¡Hola {{FIRST_NAME}}! 👋

¡Estamos súper emocionados de darte la bienvenida a la familia SOS Expat! 🎉

Has dado el primer paso para ayudar a expatriados de todo el mundo. Ahora solo falta un pequeño paso para que los clientes puedan encontrarte y pagarte.

⚡ ¡Solo 2 minutos! Es todo lo que necesitas para conectar tu PayPal.

👉 Conéctate aquí: {{PAYPAL_ONBOARDING_URL}}

¿Cómo funciona?
1. Haz clic en el enlace de arriba
2. Inicia sesión en tu PayPal
3. Autoriza a SOS Expat para enviarte dinero
4. ¡Listo! ¡Ya eres visible!

💡 ¿Sabías que? ¡Los proveedores conectados reciben su primera solicitud en promedio en 48 horas!

¡Nos vemos pronto en SOS Expat! 🙌
El equipo de SOS Expat

PD: No olvides completar tu perfil con una buena foto! 📸`,
      },
      push: {
        title: "🚀 ¡Solo un clic!",
        body: "Conecta PayPal para recibir tus primeros clientes. ¡Solo 2 minutos!",
        deeplink: "/dashboard/paypal-connect",
      },
      inapp: {
        title: "¡Conecta PayPal en 2 minutos!",
        body: "¡Hola! Para que los clientes te encuentren y te paguen, conecta tu PayPal. ¡Es rápido y vale la pena! 🚀",
      },
    },
  },

  // ==========================================================================
  // PORTUGAIS 🇧🇷🇵🇹
  // ==========================================================================
  pt: {
    "paypal.welcome.onboarding": {
      _meta: {
        description: "Email de boas-vindas com link PayPal - Português (tom divertido)",
        category: "paypal",
        language: "pt",
      },
      channels: {
        email: true,
        push: true,
        inapp: true,
        sms: false,
      },
      email: {
        subject: "🎉 Oba! A um clique de receber seus primeiros clientes!",
        html: `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${EMAIL_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="emoji">🎊</span>
      <h1>Bem-vindo à aventura SOS Expat!</h1>
      <div class="subtitle">Você está a 2 minutos de ajudar expatriados do mundo todo 🌍</div>
    </div>
    <div class="content">
      <p class="greeting">E aí {{FIRST_NAME}}! 👋</p>

      <p>Estamos <strong>super animados</strong> em dar as boas-vindas à família SOS Expat! 🎉</p>

      <p>Você deu o primeiro passo para ajudar expatriados ao redor do mundo. Isso é incrível! Agora só falta um pequeno passo para que os clientes possam te encontrar e te pagar. 💪</p>

      <div class="highlight">
        <strong>⚡ Só 2 minutinhos!</strong><br>
        É tudo que você precisa para conectar seu PayPal e começar a aventura.
      </div>

      <p style="text-align: center;">
        <a href="{{PAYPAL_ONBOARDING_URL}}" class="btn">🚀 Conectar meu PayPal agora</a>
      </p>

      <div class="steps">
        <h3>🎯 Como funciona?</h3>
        <ol>
          <li><strong>Clique</strong> nesse botão azul incrível aí em cima</li>
          <li><strong>Faça login</strong> no seu PayPal (ou crie um, é grátis!)</li>
          <li><strong>Autorize</strong> o SOS Expat a te enviar dinheiro (a melhor parte 😄)</li>
          <li><strong>Pronto!</strong> Você já está visível e pronto para receber pedidos!</li>
        </ol>
      </div>

      <div class="fun-fact">
        <span class="icon">💡</span>
        <strong>Você sabia?</strong> Prestadores conectados recebem seu primeiro pedido em média em 48 horas!
      </div>

      <p>Uma vez conectado, seu perfil será visível para milhares de clientes potenciais no mundo todo. Empolgante, né? 🌟</p>

      <p>Se tiver qualquer dúvida, estamos aqui! É só responder esse email.</p>

      <p>Até logo no SOS Expat! 🙌<br><strong>A equipe SOS Expat</strong></p>

      <p style="font-size: 14px; color: #64748b; margin-top: 25px;">
        PS: Não esqueça de completar seu perfil com uma foto bacana e uma descrição chamativa. Os clientes adoram! 📸
      </p>
    </div>
    <div class="footer">
      <p class="brand">SOS Expat</p>
      <p>Conectando expatriados pelo mundo 🌍</p>
      <p style="margin-top: 15px; font-size: 11px; color: #94a3b8;">
        Pagamentos seguros pelo PayPal
      </p>
    </div>
  </div>
</body>
</html>
        `,
        text: `E aí {{FIRST_NAME}}! 👋

Estamos super animados em dar as boas-vindas à família SOS Expat! 🎉

Você deu o primeiro passo para ajudar expatriados ao redor do mundo. Agora só falta um pequeno passo para que os clientes possam te encontrar e te pagar.

⚡ Só 2 minutinhos! É tudo que você precisa para conectar seu PayPal.

👉 Conecte aqui: {{PAYPAL_ONBOARDING_URL}}

Como funciona?
1. Clique no link acima
2. Faça login no seu PayPal
3. Autorize o SOS Expat a te enviar dinheiro
4. Pronto! Você já está visível!

💡 Você sabia? Prestadores conectados recebem seu primeiro pedido em média em 48 horas!

Até logo no SOS Expat! 🙌
A equipe SOS Expat

PS: Não esqueça de completar seu perfil com uma foto bacana! 📸`,
      },
      push: {
        title: "🚀 Só mais um clique!",
        body: "Conecte o PayPal para receber seus primeiros clientes. Só 2 minutos!",
        deeplink: "/dashboard/paypal-connect",
      },
      inapp: {
        title: "Conecte o PayPal em 2 minutos!",
        body: "E aí! Para os clientes te encontrarem e pagarem, conecte seu PayPal. É rápido e vale muito a pena! 🚀",
      },
    },
  },

  // ==========================================================================
  // ALLEMAND 🇩🇪
  // ==========================================================================
  de: {
    "paypal.welcome.onboarding": {
      _meta: {
        description: "Willkommens-E-Mail mit PayPal-Link - Deutsch (lockerer Ton)",
        category: "paypal",
        language: "de",
      },
      channels: {
        email: true,
        push: true,
        inapp: true,
        sms: false,
      },
      email: {
        subject: "🎉 Super! Nur noch ein Klick bis zu deinen ersten Kunden!",
        html: `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${EMAIL_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="emoji">🎊</span>
      <h1>Willkommen beim SOS Expat Abenteuer!</h1>
      <div class="subtitle">Du bist 2 Minuten davon entfernt, Expats weltweit zu helfen 🌍</div>
    </div>
    <div class="content">
      <p class="greeting">Hey {{FIRST_NAME}}! 👋</p>

      <p>Wir sind <strong>super begeistert</strong>, dich in der SOS Expat Familie willkommen zu heißen! 🎉</p>

      <p>Du hast den ersten Schritt gemacht, um Expats auf der ganzen Welt zu helfen. Das ist großartig! Jetzt fehlt nur noch ein kleiner Schritt, damit Kunden dich finden und bezahlen können. 💪</p>

      <div class="highlight">
        <strong>⚡ Nur 2 Minuten!</strong><br>
        Das ist alles, was du brauchst, um dein PayPal zu verbinden und loszulegen.
      </div>

      <p style="text-align: center;">
        <a href="{{PAYPAL_ONBOARDING_URL}}" class="btn">🚀 Jetzt PayPal verbinden</a>
      </p>

      <div class="steps">
        <h3>🎯 Wie funktioniert's?</h3>
        <ol>
          <li><strong>Klick</strong> auf den coolen blauen Button oben</li>
          <li><strong>Melde dich</strong> bei deinem PayPal an (oder erstell eins, ist kostenlos!)</li>
          <li><strong>Autorisiere</strong> SOS Expat, dir Geld zu senden (der beste Teil 😄)</li>
          <li><strong>Fertig!</strong> Du bist sichtbar und bereit für Anfragen!</li>
        </ol>
      </div>

      <div class="fun-fact">
        <span class="icon">💡</span>
        <strong>Wusstest du?</strong> Verbundene Anbieter erhalten ihre erste Anfrage im Durchschnitt innerhalb von 48 Stunden!
      </div>

      <p>Sobald verbunden, wird dein Profil für Tausende von potenziellen Kunden weltweit sichtbar. Spannend, oder? 🌟</p>

      <p>Falls du Fragen hast, wir sind da! Antworte einfach auf diese E-Mail.</p>

      <p>Bis bald bei SOS Expat! 🙌<br><strong>Das SOS Expat Team</strong></p>

      <p style="font-size: 14px; color: #64748b; margin-top: 25px;">
        PS: Vergiss nicht, dein Profil mit einem tollen Foto und einer ansprechenden Beschreibung zu vervollständigen. Kunden lieben das! 📸
      </p>
    </div>
    <div class="footer">
      <p class="brand">SOS Expat</p>
      <p>Expats weltweit verbinden 🌍</p>
      <p style="margin-top: 15px; font-size: 11px; color: #94a3b8;">
        Sichere Zahlungen über PayPal
      </p>
    </div>
  </div>
</body>
</html>
        `,
        text: `Hey {{FIRST_NAME}}! 👋

Wir sind super begeistert, dich in der SOS Expat Familie willkommen zu heißen! 🎉

Du hast den ersten Schritt gemacht, um Expats auf der ganzen Welt zu helfen. Jetzt fehlt nur noch ein kleiner Schritt, damit Kunden dich finden und bezahlen können.

⚡ Nur 2 Minuten! Das ist alles, was du brauchst, um dein PayPal zu verbinden.

👉 Verbinde hier: {{PAYPAL_ONBOARDING_URL}}

Wie funktioniert's?
1. Klick auf den Link oben
2. Melde dich bei deinem PayPal an
3. Autorisiere SOS Expat, dir Geld zu senden
4. Fertig! Du bist sichtbar!

💡 Wusstest du? Verbundene Anbieter erhalten ihre erste Anfrage im Durchschnitt innerhalb von 48 Stunden!

Bis bald bei SOS Expat! 🙌
Das SOS Expat Team

PS: Vergiss nicht, dein Profil mit einem tollen Foto zu vervollständigen! 📸`,
      },
      push: {
        title: "🚀 Nur noch ein Klick!",
        body: "Verbinde PayPal, um deine ersten Kunden zu empfangen. Nur 2 Minuten!",
        deeplink: "/dashboard/paypal-connect",
      },
      inapp: {
        title: "PayPal in 2 Minuten verbinden!",
        body: "Hey! Damit Kunden dich finden und bezahlen können, verbinde dein PayPal. Schnell und lohnenswert! 🚀",
      },
    },
  },

  // ==========================================================================
  // RUSSE 🇷🇺
  // ==========================================================================
  ru: {
    "paypal.welcome.onboarding": {
      _meta: {
        description: "Приветственное письмо со ссылкой PayPal - Русский (дружелюбный тон)",
        category: "paypal",
        language: "ru",
      },
      channels: {
        email: true,
        push: true,
        inapp: true,
        sms: false,
      },
      email: {
        subject: "🎉 Ура! Один клик до ваших первых клиентов!",
        html: `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${EMAIL_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="emoji">🎊</span>
      <h1>Добро пожаловать в приключение SOS Expat!</h1>
      <div class="subtitle">Вы в 2 минутах от того, чтобы помогать экспатам по всему миру 🌍</div>
    </div>
    <div class="content">
      <p class="greeting">Привет, {{FIRST_NAME}}! 👋</p>

      <p>Мы <strong>очень рады</strong> приветствовать вас в семье SOS Expat! 🎉</p>

      <p>Вы сделали первый шаг, чтобы помогать экспатам по всему миру. Это круто! Теперь остался один маленький шаг, чтобы клиенты могли вас найти и заплатить. 💪</p>

      <div class="highlight">
        <strong>⚡ Всего 2 минуты!</strong><br>
        Это всё, что нужно для подключения PayPal и начала приключения.
      </div>

      <p style="text-align: center;">
        <a href="{{PAYPAL_ONBOARDING_URL}}" class="btn">🚀 Подключить PayPal сейчас</a>
      </p>

      <div class="steps">
        <h3>🎯 Как это работает?</h3>
        <ol>
          <li><strong>Нажмите</strong> на классную синюю кнопку выше</li>
          <li><strong>Войдите</strong> в свой PayPal (или создайте, это бесплатно!)</li>
          <li><strong>Разрешите</strong> SOS Expat отправлять вам деньги (лучшая часть 😄)</li>
          <li><strong>Готово!</strong> Вы видимы и готовы принимать заявки!</li>
        </ol>
      </div>

      <div class="fun-fact">
        <span class="icon">💡</span>
        <strong>Знаете ли вы?</strong> Подключённые провайдеры получают первую заявку в среднем за 48 часов!
      </div>

      <p>После подключения ваш профиль будет виден тысячам потенциальных клиентов по всему миру. Волнующе, правда? 🌟</p>

      <p>Если есть вопросы, мы здесь! Просто ответьте на это письмо.</p>

      <p>До скорой встречи на SOS Expat! 🙌<br><strong>Команда SOS Expat</strong></p>

      <p style="font-size: 14px; color: #64748b; margin-top: 25px;">
        PS: Не забудьте дополнить профиль классной фотографией и привлекательным описанием. Клиенты это любят! 📸
      </p>
    </div>
    <div class="footer">
      <p class="brand">SOS Expat</p>
      <p>Объединяем экспатов по всему миру 🌍</p>
      <p style="margin-top: 15px; font-size: 11px; color: #94a3b8;">
        Безопасные платежи через PayPal
      </p>
    </div>
  </div>
</body>
</html>
        `,
        text: `Привет, {{FIRST_NAME}}! 👋

Мы очень рады приветствовать вас в семье SOS Expat! 🎉

Вы сделали первый шаг, чтобы помогать экспатам по всему миру. Теперь остался один маленький шаг, чтобы клиенты могли вас найти и заплатить.

⚡ Всего 2 минуты! Это всё, что нужно для подключения PayPal.

👉 Подключитесь здесь: {{PAYPAL_ONBOARDING_URL}}

Как это работает?
1. Нажмите на ссылку выше
2. Войдите в свой PayPal
3. Разрешите SOS Expat отправлять вам деньги
4. Готово! Вы видимы!

💡 Знаете ли вы? Подключённые провайдеры получают первую заявку в среднем за 48 часов!

До скорой встречи на SOS Expat! 🙌
Команда SOS Expat

PS: Не забудьте дополнить профиль классной фотографией! 📸`,
      },
      push: {
        title: "🚀 Остался один клик!",
        body: "Подключите PayPal, чтобы получить первых клиентов. Только 2 минуты!",
        deeplink: "/dashboard/paypal-connect",
      },
      inapp: {
        title: "Подключите PayPal за 2 минуты!",
        body: "Привет! Чтобы клиенты вас нашли и заплатили, подключите PayPal. Быстро и оно того стоит! 🚀",
      },
    },
  },

  // ==========================================================================
  // CHINOIS 🇨🇳
  // ==========================================================================
  zh: {
    "paypal.welcome.onboarding": {
      _meta: {
        description: "欢迎邮件及PayPal链接 - 中文 (友好语气)",
        category: "paypal",
        language: "zh",
      },
      channels: {
        email: true,
        push: true,
        inapp: true,
        sms: false,
      },
      email: {
        subject: "🎉 太棒了！只需一键即可接收您的第一批客户！",
        html: `
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${EMAIL_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="emoji">🎊</span>
      <h1>欢迎加入 SOS Expat 冒险之旅！</h1>
      <div class="subtitle">只需2分钟，即可开始帮助全球外籍人士 🌍</div>
    </div>
    <div class="content">
      <p class="greeting">嗨 {{FIRST_NAME}}！👋</p>

      <p>我们<strong>非常高兴</strong>欢迎您加入 SOS Expat 大家庭！🎉</p>

      <p>您已经迈出了帮助全球外籍人士的第一步。太棒了！现在只需要一个小步骤，客户就能找到您并付款了。💪</p>

      <div class="highlight">
        <strong>⚡ 只需2分钟！</strong><br>
        连接您的 PayPal 并开始冒险之旅。
      </div>

      <p style="text-align: center;">
        <a href="{{PAYPAL_ONBOARDING_URL}}" class="btn">🚀 立即连接 PayPal</a>
      </p>

      <div class="steps">
        <h3>🎯 如何操作？</h3>
        <ol>
          <li><strong>点击</strong>上面那个很酷的蓝色按钮</li>
          <li><strong>登录</strong>您的 PayPal（或免费创建一个！）</li>
          <li><strong>授权</strong> SOS Expat 向您发送款项（最棒的部分 😄）</li>
          <li><strong>完成！</strong>您已可见，准备接收请求！</li>
        </ol>
      </div>

      <div class="fun-fact">
        <span class="icon">💡</span>
        <strong>您知道吗？</strong> 已连接的服务商平均在48小时内收到第一个请求！
      </div>

      <p>连接后，您的个人资料将对全球数千名潜在客户可见。令人兴奋，对吧？🌟</p>

      <p>如有任何问题，我们随时为您服务！只需回复此邮件。</p>

      <p>期待在 SOS Expat 与您相见！🙌<br><strong>SOS Expat 团队</strong></p>

      <p style="font-size: 14px; color: #64748b; margin-top: 25px;">
        PS：别忘了用一张好看的照片和吸引人的描述完善您的个人资料。客户们喜欢这样！📸
      </p>
    </div>
    <div class="footer">
      <p class="brand">SOS Expat</p>
      <p>连接全球外籍人士 🌍</p>
      <p style="margin-top: 15px; font-size: 11px; color: #94a3b8;">
        由 PayPal 提供安全支付
      </p>
    </div>
  </div>
</body>
</html>
        `,
        text: `嗨 {{FIRST_NAME}}！👋

我们非常高兴欢迎您加入 SOS Expat 大家庭！🎉

您已经迈出了帮助全球外籍人士的第一步。现在只需要一个小步骤，客户就能找到您并付款了。

⚡ 只需2分钟！连接您的 PayPal。

👉 在这里连接：{{PAYPAL_ONBOARDING_URL}}

如何操作？
1. 点击上面的链接
2. 登录您的 PayPal
3. 授权 SOS Expat 向您发送款项
4. 完成！您已可见！

💡 您知道吗？已连接的服务商平均在48小时内收到第一个请求！

期待在 SOS Expat 与您相见！🙌
SOS Expat 团队

PS：别忘了用一张好看的照片完善您的个人资料！📸`,
      },
      push: {
        title: "🚀 只差一步！",
        body: "连接 PayPal 接收您的第一批客户。只需2分钟！",
        deeplink: "/dashboard/paypal-connect",
      },
      inapp: {
        title: "2分钟连接 PayPal！",
        body: "嗨！为了让客户找到您并付款，请连接您的 PayPal。快速且值得！🚀",
      },
    },
  },

  // ==========================================================================
  // ARABE 🇸🇦
  // ==========================================================================
  ar: {
    "paypal.welcome.onboarding": {
      _meta: {
        description: "رسالة ترحيب مع رابط PayPal - العربية (نبرة ودية)",
        category: "paypal",
        language: "ar",
      },
      channels: {
        email: true,
        push: true,
        inapp: true,
        sms: false,
      },
      email: {
        subject: "🎉 رائع! نقرة واحدة فقط للحصول على عملائك الأوائل!",
        html: `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${EMAIL_STYLES}
    body { direction: rtl; text-align: right; }
    .steps ol { padding-right: 20px; padding-left: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="emoji">🎊</span>
      <h1>مرحباً بك في مغامرة SOS Expat!</h1>
      <div class="subtitle">أنت على بعد دقيقتين من مساعدة المغتربين حول العالم 🌍</div>
    </div>
    <div class="content">
      <p class="greeting">أهلاً {{FIRST_NAME}}! 👋</p>

      <p>نحن <strong>سعداء جداً</strong> بالترحيب بك في عائلة SOS Expat! 🎉</p>

      <p>لقد اتخذت الخطوة الأولى لمساعدة المغتربين حول العالم. هذا رائع! الآن تبقى خطوة صغيرة فقط حتى يتمكن العملاء من العثور عليك ودفع المال لك. 💪</p>

      <div class="highlight">
        <strong>⚡ دقيقتان فقط!</strong><br>
        هذا كل ما تحتاجه لربط PayPal الخاص بك وبدء المغامرة.
      </div>

      <p style="text-align: center;">
        <a href="{{PAYPAL_ONBOARDING_URL}}" class="btn">🚀 اربط PayPal الآن</a>
      </p>

      <div class="steps">
        <h3>🎯 كيف يعمل؟</h3>
        <ol>
          <li><strong>انقر</strong> على الزر الأزرق الرائع أعلاه</li>
          <li><strong>سجل دخولك</strong> إلى PayPal (أو أنشئ حساباً مجاناً!)</li>
          <li><strong>فوّض</strong> SOS Expat لإرسال المال إليك (أفضل جزء 😄)</li>
          <li><strong>انتهى!</strong> أنت مرئي وجاهز لاستقبال الطلبات!</li>
        </ol>
      </div>

      <div class="fun-fact">
        <span class="icon">💡</span>
        <strong>هل تعلم؟</strong> يتلقى مقدمو الخدمات المتصلون طلبهم الأول في المتوسط خلال 48 ساعة!
      </div>

      <p>بمجرد الاتصال، سيكون ملفك الشخصي مرئياً لآلاف العملاء المحتملين حول العالم. مثير، أليس كذلك؟ 🌟</p>

      <p>إذا كانت لديك أي أسئلة، نحن هنا! فقط رد على هذا البريد الإلكتروني.</p>

      <p>نراك قريباً على SOS Expat! 🙌<br><strong>فريق SOS Expat</strong></p>

      <p style="font-size: 14px; color: #64748b; margin-top: 25px;">
        ملاحظة: لا تنسَ إكمال ملفك الشخصي بصورة رائعة ووصف جذاب. العملاء يحبون ذلك! 📸
      </p>
    </div>
    <div class="footer">
      <p class="brand">SOS Expat</p>
      <p>ربط المغتربين حول العالم 🌍</p>
      <p style="margin-top: 15px; font-size: 11px; color: #94a3b8;">
        مدفوعات آمنة عبر PayPal
      </p>
    </div>
  </div>
</body>
</html>
        `,
        text: `أهلاً {{FIRST_NAME}}! 👋

نحن سعداء جداً بالترحيب بك في عائلة SOS Expat! 🎉

لقد اتخذت الخطوة الأولى لمساعدة المغتربين حول العالم. الآن تبقى خطوة صغيرة فقط حتى يتمكن العملاء من العثور عليك ودفع المال لك.

⚡ دقيقتان فقط! هذا كل ما تحتاجه لربط PayPal الخاص بك.

👉 اربط هنا: {{PAYPAL_ONBOARDING_URL}}

كيف يعمل؟
1. انقر على الرابط أعلاه
2. سجل دخولك إلى PayPal
3. فوّض SOS Expat لإرسال المال إليك
4. انتهى! أنت مرئي!

💡 هل تعلم؟ يتلقى مقدمو الخدمات المتصلون طلبهم الأول في المتوسط خلال 48 ساعة!

نراك قريباً على SOS Expat! 🙌
فريق SOS Expat

ملاحظة: لا تنسَ إكمال ملفك الشخصي بصورة رائعة! 📸`,
      },
      push: {
        title: "🚀 نقرة واحدة فقط!",
        body: "اربط PayPal لاستقبال عملائك الأوائل. دقيقتان فقط!",
        deeplink: "/dashboard/paypal-connect",
      },
      inapp: {
        title: "اربط PayPal في دقيقتين!",
        body: "أهلاً! لكي يجدك العملاء ويدفعوا لك، اربط PayPal الخاص بك. سريع ويستحق! 🚀",
      },
    },
  },

  // ==========================================================================
  // HINDI 🇮🇳
  // ==========================================================================
  hi: {
    "paypal.welcome.onboarding": {
      _meta: {
        description: "स्वागत ईमेल PayPal लिंक के साथ - हिंदी (मज़ेदार लहजा)",
        category: "paypal",
        language: "hi",
      },
      channels: {
        email: true,
        push: true,
        inapp: true,
        sms: false,
      },
      email: {
        subject: "🎉 बधाई हो! अपने पहले क्लाइंट पाने से बस एक क्लिक दूर!",
        html: `
<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${EMAIL_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="emoji">🎊</span>
      <h1>SOS Expat के साहसिक सफर में आपका स्वागत है!</h1>
      <div class="subtitle">आप दुनिया भर के प्रवासियों की मदद करने से बस 2 मिनट दूर हैं 🌍</div>
    </div>
    <div class="content">
      <p class="greeting">हे {{FIRST_NAME}}! 👋</p>

      <p>हम आपका SOS Expat परिवार में स्वागत करके <strong>बहुत खुश</strong> हैं! 🎉</p>

      <p>आपने दुनिया भर के प्रवासियों की मदद करने का पहला कदम उठाया है। यह शानदार है! अब बस एक छोटा सा कदम बाकी है ताकि क्लाइंट आपको ढूंढ सकें और भुगतान कर सकें। 💪</p>

      <div class="highlight">
        <strong>⚡ सिर्फ 2 मिनट!</strong><br>
        अपना PayPal कनेक्ट करने और साहसिक सफर शुरू करने के लिए बस इतना ही चाहिए।
      </div>

      <p style="text-align: center;">
        <a href="{{PAYPAL_ONBOARDING_URL}}" class="btn">🚀 अभी PayPal कनेक्ट करें</a>
      </p>

      <div class="steps">
        <h3>🎯 यह कैसे काम करता है?</h3>
        <ol>
          <li>ऊपर उस शानदार नीले बटन पर <strong>क्लिक करें</strong></li>
          <li>अपने PayPal में <strong>लॉग इन करें</strong> (या मुफ्त में एक बनाएं!)</li>
          <li>SOS Expat को आपको पैसे भेजने की <strong>अनुमति दें</strong> (सबसे अच्छा हिस्सा 😄)</li>
          <li><strong>हो गया!</strong> आप दिखाई दे रहे हैं और अनुरोध प्राप्त करने के लिए तैयार हैं!</li>
        </ol>
      </div>

      <div class="fun-fact">
        <span class="icon">💡</span>
        <strong>क्या आप जानते हैं?</strong> कनेक्टेड प्रदाताओं को औसतन 48 घंटों के भीतर अपना पहला अनुरोध मिलता है!
      </div>

      <p>कनेक्ट होने के बाद, आपकी प्रोफ़ाइल दुनिया भर के हज़ारों संभावित क्लाइंट को दिखाई देगी। रोमांचक, है ना? 🌟</p>

      <p>अगर आपके कोई सवाल हैं, तो हम यहां हैं! बस इस ईमेल का जवाब दें।</p>

      <p>जल्द ही SOS Expat पर मिलते हैं! 🙌<br><strong>SOS Expat टीम</strong></p>

      <p style="font-size: 14px; color: #64748b; margin-top: 25px;">
        PS: अपनी प्रोफ़ाइल को एक बढ़िया फोटो और आकर्षक विवरण के साथ पूरा करना न भूलें। क्लाइंट इसे पसंद करते हैं! 📸
      </p>
    </div>
    <div class="footer">
      <p class="brand">SOS Expat</p>
      <p>दुनिया भर में प्रवासियों को जोड़ना 🌍</p>
      <p style="margin-top: 15px; font-size: 11px; color: #94a3b8;">
        PayPal द्वारा सुरक्षित भुगतान
      </p>
    </div>
  </div>
</body>
</html>
        `,
        text: `हे {{FIRST_NAME}}! 👋

हम आपका SOS Expat परिवार में स्वागत करके बहुत खुश हैं! 🎉

आपने दुनिया भर के प्रवासियों की मदद करने का पहला कदम उठाया है। अब बस एक छोटा सा कदम बाकी है ताकि क्लाइंट आपको ढूंढ सकें और भुगतान कर सकें।

⚡ सिर्फ 2 मिनट! अपना PayPal कनेक्ट करने के लिए बस इतना ही चाहिए।

👉 यहां कनेक्ट करें: {{PAYPAL_ONBOARDING_URL}}

यह कैसे काम करता है?
1. ऊपर दिए गए लिंक पर क्लिक करें
2. अपने PayPal में लॉग इन करें
3. SOS Expat को आपको पैसे भेजने की अनुमति दें
4. हो गया! आप दिखाई दे रहे हैं!

💡 क्या आप जानते हैं? कनेक्टेड प्रदाताओं को औसतन 48 घंटों के भीतर अपना पहला अनुरोध मिलता है!

जल्द ही SOS Expat पर मिलते हैं! 🙌
SOS Expat टीम

PS: अपनी प्रोफ़ाइल को एक बढ़िया फोटो के साथ पूरा करना न भूलें! 📸`,
      },
      push: {
        title: "🚀 बस एक क्लिक!",
        body: "अपने पहले क्लाइंट पाने के लिए PayPal कनेक्ट करें। सिर्फ 2 मिनट!",
        deeplink: "/dashboard/paypal-connect",
      },
      inapp: {
        title: "2 मिनट में PayPal कनेक्ट करें!",
        body: "हे! ताकि क्लाइंट आपको ढूंढ सकें और भुगतान कर सकें, अपना PayPal कनेक्ट करें। तेज़ और इसके लायक! 🚀",
      },
    },
  },
};

// =============================================================================
// FONCTION DE SEED
// =============================================================================

/**
 * Initialise les templates de bienvenue PayPal dans Firestore
 * Collection: message_templates/{locale}/items/{templateId}
 */
export async function seedPayPalWelcomeTemplates(db: admin.firestore.Firestore): Promise<void> {
  console.log("🚀 Seeding PayPal welcome templates in 9 languages (SOS Expat style!)...");

  const batch = db.batch();
  let count = 0;

  for (const [locale, templates] of Object.entries(PAYPAL_WELCOME_TEMPLATES)) {
    for (const [templateId, template] of Object.entries(templates as Record<string, any>)) {
      const docRef = db
        .collection("message_templates")
        .doc(locale)
        .collection("items")
        .doc(templateId);

      batch.set(docRef, template as admin.firestore.DocumentData, { merge: true });
      count++;
      console.log(`  ✅ ${locale}/${templateId}`);
    }
  }

  await batch.commit();
  console.log(`\n🎉 Successfully seeded ${count} PayPal welcome templates with SOS Expat branding!`);
}

// =============================================================================
// CLOUD FUNCTION POUR INITIALISER LES TEMPLATES
// =============================================================================

export const initPayPalWelcomeTemplates = onCall(
  {
    region: "europe-west1",
    cors: true,
    memory: "256MiB",
    cpu: 0.083,
  },
  async (request) => {
    // Vérifier que l'utilisateur est admin
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    // Vérifier les claims admin
    const userDoc = await admin.firestore().collection("users").doc(request.auth.uid).get();
    const userData = userDoc.data();

    if (!userData?.isAdmin && !userData?.role?.includes("admin")) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    try {
      await seedPayPalWelcomeTemplates(admin.firestore());
      return {
        success: true,
        message: "PayPal welcome templates seeded successfully in 9 languages with SOS Expat branding! 🎉",
        languages: Object.keys(PAYPAL_WELCOME_TEMPLATES),
      };
    } catch (error) {
      console.error("Error seeding templates:", error);
      throw new HttpsError(
        "internal",
        `Failed to seed templates: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

// =============================================================================
// SCRIPT STANDALONE (npx ts-node)
// =============================================================================

// Permet d'exécuter directement avec: npx ts-node src/seeds/paypalWelcomeTemplates.ts
if (require.main === module) {
  // Initialiser Firebase Admin
  if (!admin.apps.length) {
    admin.initializeApp();
  }

  seedPayPalWelcomeTemplates(admin.firestore())
    .then(() => {
      console.log("\n🎉 Done! Templates are ready with SOS Expat branding!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Error:", error);
      process.exit(1);
    });
}
