/**
 * Met à jour les templates chatter MailWizz pour ajouter le bloc viral referral
 * + bandeau amber + footer enrichi (harmonisé avec les templates provider/client)
 *
 * Variables dynamiques utilisées :
 *   [LINK]                     → lien affilié du chatter (depuis lockedRates)
 *   [COMMISSION_CLIENT_LAWYER] → commission principale ($10 par défaut, personnalisé)
 *   [COMMISSION_CLIENT_EXPAT]  → commission expat ($3 par défaut)
 *   [COMMISSION_N1]            → commission N1 filleul
 *   [UNSUBSCRIBE_URL]          → lien de désinscription HMAC
 *
 * Usage:
 *   node scripts/updateChatterTemplates.js              # dry-run (montre les changements)
 *   node scripts/updateChatterTemplates.js --apply       # applique les changements
 */

const axios = require("axios");
const { execSync } = require("child_process");

const MAILWIZZ_API_URL = "https://mail.sos-expat.com/api/index.php";
const MAILWIZZ_CUSTOMER_ID = "1";
const DRY_RUN = !process.argv.includes("--apply");

function getSecret(name) {
  if (process.env[name]) return process.env[name];
  try {
    return execSync(
      `gcloud secrets versions access latest --secret=${name} --project=sos-urgently-ac307`,
      { encoding: "utf-8" }
    ).trim();
  } catch {
    console.error(`❌ Cannot get secret: ${name}`);
    process.exit(1);
  }
}

// ── TRADUCTIONS du bloc viral ───────────────────────────────────────────────
const TRANSLATIONS = {
  FR: {
    bannerText: '💰 <strong>304M d\'expatriés + 1,4 Mrd de voyageurs</strong> ont besoin d\'aide !',
    bannerCta: 'Gagne [COMMISSION_CLIENT_LAWYER] par appel →',
    bannerEmailSubject: '%F0%9F%8C%8D%20Un%20service%20qui%20va%20t%27aider',
    bannerEmailBody: 'Salut%20%21%20En%20tant%20qu%27expatri%C3%A9%2C%20tu%20dois%20conna%C3%AEtre%20%C3%A7a%20%3A%20',
    viralTitle: '💰 GAGNE DE L\'ARGENT À VIE',
    statExpats: 'EXPATRIÉS',
    statCountries: 'PAYS',
    statPerCall: 'PAR APPEL',
    mainMsg: 'Chaque utilisation de ton lien = <strong style="color:#10B981;">[COMMISSION_CLIENT_LAWYER] par appel</strong>',
    subMsg: '🔥 Commissions en USD • À vie • Sans limite',
    shareWa: '%F0%9F%9A%80%20D%C3%A9couvre%20SOS-Expat%20%21%20Aide%20pour%20expatri%C3%A9s%20%2B%20voyageurs.%20Utilise%20mon%20lien%20et%20je%20gagne%20[COMMISSION_CLIENT_LAWYER]%20par%20appel%20%3A%20',
    shareFb: '%F0%9F%8C%8D%20304%20millions%20d%27expatri%C3%A9s%20dans%20le%20monde.%20Ulixai%20les%20aide%20tous.%20Rejoins-nous%20!',
    shareTw: '%F0%9F%9A%80%20SOS-Expat%20%3A%20aide%20pour%20304M%20expatri%C3%A9s%20%2B%201%2C4Mrd%20voyageurs.%20Essaie%20%3A',
    shareEmailSubject: '%F0%9F%8C%8D%20SOS-Expat%20-%20Aide%20pour%20expatri%C3%A9s',
    shareEmailBody: 'Salut%20%21%0A%0AJe%20te%20recommande%20SOS-Expat%2C%20une%20plateforme%20qui%20aide%20les%20expatri%C3%A9s%20et%20voyageurs%20dans%20197%20pays.%0A%0AInscris-toi%20avec%20mon%20lien%20%3A%20',
    linkLabel: '📋 TON LIEN UNIQUE (clique pour copier)',
    unsubLabel: 'Se d\u00e9sinscrire',
  },
  EN: {
    bannerText: '💰 <strong>304M expats + 1.4B travelers</strong> need help!',
    bannerCta: 'Earn [COMMISSION_CLIENT_LAWYER] per call →',
    bannerEmailSubject: '%F0%9F%8C%8D%20A%20service%20that%20will%20help%20you',
    bannerEmailBody: 'Hey%20%21%20As%20an%20expat%2C%20you%20should%20know%20about%20this%3A%20',
    viralTitle: '💰 EARN MONEY FOR LIFE',
    statExpats: 'EXPATS',
    statCountries: 'COUNTRIES',
    statPerCall: 'PER CALL',
    mainMsg: 'Every use of your link = <strong style="color:#10B981;">[COMMISSION_CLIENT_LAWYER] per call</strong>',
    subMsg: '🔥 Commissions in USD • For life • No limit',
    shareWa: '%F0%9F%9A%80%20Discover%20SOS-Expat%21%20Help%20for%20expats%20%2B%20travelers.%20Use%20my%20link%20and%20I%20earn%20[COMMISSION_CLIENT_LAWYER]%20per%20call%3A%20',
    shareFb: '%F0%9F%8C%8D%20304%20million%20expats%20worldwide.%20Ulixai%20helps%20them%20all.%20Join%20us!',
    shareTw: '%F0%9F%9A%80%20SOS-Expat%3A%20help%20for%20304M%20expats%20%2B%201.4B%20travelers.%20Try%3A',
    shareEmailSubject: '%F0%9F%8C%8D%20SOS-Expat%20-%20Help%20for%20expats',
    shareEmailBody: 'Hey%21%0A%0AI%20recommend%20SOS-Expat%2C%20a%20platform%20helping%20expats%20and%20travelers%20in%20197%20countries.%0A%0ASign%20up%20with%20my%20link%3A%20',
    linkLabel: '📋 YOUR UNIQUE LINK (click to copy)',
    unsubLabel: 'Unsubscribe',
  },
  ES: {
    bannerText: '💰 <strong>304M de expatriados + 1,4 Mrd de viajeros</strong> necesitan ayuda!',
    bannerCta: 'Gana [COMMISSION_CLIENT_LAWYER] por llamada →',
    bannerEmailSubject: '%F0%9F%8C%8D%20Un%20servicio%20que%20te%20ayudar%C3%A1',
    bannerEmailBody: '%C2%A1Hola%21%20Como%20expatriado%2C%20debes%20conocer%20esto%3A%20',
    viralTitle: '💰 GANA DINERO DE POR VIDA',
    statExpats: 'EXPATRIADOS',
    statCountries: 'PA\u00cdSES',
    statPerCall: 'POR LLAMADA',
    mainMsg: 'Cada uso de tu enlace = <strong style="color:#10B981;">[COMMISSION_CLIENT_LAWYER] por llamada</strong>',
    subMsg: '🔥 Comisiones en USD • De por vida • Sin l\u00edmite',
    shareWa: '%F0%9F%9A%80%20Descubre%20SOS-Expat%21%20Ayuda%20para%20expatriados.%20Usa%20mi%20enlace%3A%20',
    shareFb: '%F0%9F%8C%8D%20304%20millones%20de%20expatriados.%20Ulixai%20los%20ayuda.%20%C3%9Anete!',
    shareTw: '%F0%9F%9A%80%20SOS-Expat%3A%20ayuda%20para%20304M%20expatriados.%20Prueba%3A',
    shareEmailSubject: '%F0%9F%8C%8D%20SOS-Expat%20-%20Ayuda%20para%20expatriados',
    shareEmailBody: '%C2%A1Hola%21%0A%0ATe%20recomiendo%20SOS-Expat.%0AInscr%C3%ADbete%20con%20mi%20enlace%3A%20',
    linkLabel: '📋 TU ENLACE \u00daNICO (haz clic para copiar)',
    unsubLabel: 'Darse de baja',
  },
  DE: {
    bannerText: '💰 <strong>304M Expats + 1,4 Mrd Reisende</strong> brauchen Hilfe!',
    bannerCta: 'Verdiene [COMMISSION_CLIENT_LAWYER] pro Anruf →',
    bannerEmailSubject: '%F0%9F%8C%8D%20Ein%20Service%20der%20dir%20hilft',
    bannerEmailBody: 'Hallo%21%20Als%20Expat%20solltest%20du%20das%20kennen%3A%20',
    viralTitle: '💰 VERDIENE GELD F\u00dcR IMMER',
    statExpats: 'EXPATS',
    statCountries: 'L\u00c4NDER',
    statPerCall: 'PRO ANRUF',
    mainMsg: 'Jede Nutzung deines Links = <strong style="color:#10B981;">[COMMISSION_CLIENT_LAWYER] pro Anruf</strong>',
    subMsg: '🔥 Provisionen in USD • Lebenslang • Ohne Limit',
    shareWa: '%F0%9F%9A%80%20Entdecke%20SOS-Expat%21%20Hilfe%20f%C3%BCr%20Expats.%20Nutze%20meinen%20Link%3A%20',
    shareFb: '%F0%9F%8C%8D%20304%20Millionen%20Expats%20weltweit.%20Ulixai%20hilft%20allen!',
    shareTw: '%F0%9F%9A%80%20SOS-Expat%3A%20Hilfe%20f%C3%BCr%20304M%20Expats.%20Probiere%3A',
    shareEmailSubject: '%F0%9F%8C%8D%20SOS-Expat%20-%20Hilfe%20f%C3%BCr%20Expats',
    shareEmailBody: 'Hallo%21%0A%0AIch%20empfehle%20SOS-Expat.%0ARegistriere%20dich%20mit%20meinem%20Link%3A%20',
    linkLabel: '📋 DEIN EINZIGARTIGER LINK (zum Kopieren klicken)',
    unsubLabel: 'Abmelden',
  },
  PT: {
    bannerText: '💰 <strong>304M de expatriados + 1,4 Mrd de viajantes</strong> precisam de ajuda!',
    bannerCta: 'Ganhe [COMMISSION_CLIENT_LAWYER] por chamada →',
    bannerEmailSubject: '%F0%9F%8C%8D%20Um%20servi%C3%A7o%20que%20vai%20te%20ajudar',
    bannerEmailBody: 'Oi%21%20Como%20expatriado%2C%20voc%C3%AA%20precisa%20conhecer%3A%20',
    viralTitle: '💰 GANHE DINHEIRO PARA SEMPRE',
    statExpats: 'EXPATRIADOS',
    statCountries: 'PA\u00cdSES',
    statPerCall: 'POR CHAMADA',
    mainMsg: 'Cada uso do seu link = <strong style="color:#10B981;">[COMMISSION_CLIENT_LAWYER] por chamada</strong>',
    subMsg: '🔥 Comiss\u00f5es em USD • Para sempre • Sem limite',
    shareWa: '%F0%9F%9A%80%20Descubra%20SOS-Expat%21%20Ajuda%20para%20expatriados.%20Use%20meu%20link%3A%20',
    shareFb: '%F0%9F%8C%8D%20304%20milh%C3%B5es%20de%20expatriados.%20Ulixai%20ajuda%20todos!',
    shareTw: '%F0%9F%9A%80%20SOS-Expat%3A%20ajuda%20para%20304M%20expatriados.%20Experimente%3A',
    shareEmailSubject: '%F0%9F%8C%8D%20SOS-Expat%20-%20Ajuda%20para%20expatriados',
    shareEmailBody: 'Oi%21%0A%0ARecomendo%20SOS-Expat.%0AInscreva-se%20com%20meu%20link%3A%20',
    linkLabel: '📋 SEU LINK \u00daNICO (clique para copiar)',
    unsubLabel: 'Cancelar inscri\u00e7\u00e3o',
  },
  RU: {
    bannerText: '💰 <strong>304M \u044d\u043a\u0441\u043f\u0430\u0442\u043e\u0432 + 1,4 \u043c\u043b\u0440\u0434 \u043f\u0443\u0442\u0435\u0448\u0435\u0441\u0442\u0432\u0435\u043d\u043d\u0438\u043a\u043e\u0432</strong> \u043d\u0443\u0436\u0434\u0430\u044e\u0442\u0441\u044f \u0432 \u043f\u043e\u043c\u043e\u0449\u0438!',
    bannerCta: '\u0417\u0430\u0440\u0430\u0431\u043e\u0442\u0430\u0439 [COMMISSION_CLIENT_LAWYER] \u0437\u0430 \u0437\u0432\u043e\u043d\u043e\u043a →',
    bannerEmailSubject: '%F0%9F%8C%8D%20SOS-Expat',
    bannerEmailBody: '%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82%21%20%D0%9F%D0%BE%D0%BF%D1%80%D0%BE%D0%B1%D1%83%D0%B9%3A%20',
    viralTitle: '💰 \u0417\u0410\u0420\u0410\u0411\u0410\u0422\u042B\u0412\u0410\u0419 \u0412\u0421\u0415\u0413\u0414\u0410',
    statExpats: '\u042d\u041a\u0421\u041f\u0410\u0422\u042b',
    statCountries: '\u0421\u0422\u0420\u0410\u041d',
    statPerCall: '\u0417\u0410 \u0417\u0412\u041e\u041d\u041e\u041a',
    mainMsg: '\u041a\u0430\u0436\u0434\u043e\u0435 \u0438\u0441\u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u043d\u0438\u0435 \u0442\u0432\u043e\u0435\u0439 \u0441\u0441\u044b\u043b\u043a\u0438 = <strong style="color:#10B981;">[COMMISSION_CLIENT_LAWYER] \u0437\u0430 \u0437\u0432\u043e\u043d\u043e\u043a</strong>',
    subMsg: '🔥 \u041a\u043e\u043c\u0438\u0441\u0441\u0438\u0438 \u0432 USD \u2022 \u041d\u0430\u0432\u0441\u0435\u0433\u0434\u0430 \u2022 \u0411\u0435\u0437 \u043b\u0438\u043c\u0438\u0442\u0430',
    shareWa: '%F0%9F%9A%80%20SOS-Expat%20%E2%80%94%20%D0%BF%D0%BE%D0%BC%D0%BE%D1%89%D1%8C%20%D1%8D%D0%BA%D1%81%D0%BF%D0%B0%D1%82%D0%B0%D0%BC.%20%D0%9C%D0%BE%D1%8F%20%D1%81%D1%81%D1%8B%D0%BB%D0%BA%D0%B0%3A%20',
    shareFb: '%F0%9F%8C%8D%20304M%20%D1%8D%D0%BA%D1%81%D0%BF%D0%B0%D1%82%D0%BE%D0%B2.%20Ulixai%20%D0%BF%D0%BE%D0%BC%D0%BE%D0%B3%D0%B0%D0%B5%D1%82!',
    shareTw: '%F0%9F%9A%80%20SOS-Expat%3A%20%D0%BF%D0%BE%D0%BC%D0%BE%D1%89%D1%8C%20304M%20%D1%8D%D0%BA%D1%81%D0%BF%D0%B0%D1%82%D0%B0%D0%BC.',
    shareEmailSubject: '%F0%9F%8C%8D%20SOS-Expat',
    shareEmailBody: '%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82%21%0A%D0%A0%D0%B5%D0%BA%D0%BE%D0%BC%D0%B5%D0%BD%D0%B4%D1%83%D1%8E%20SOS-Expat.%0A%D0%A1%D1%81%D1%8B%D0%BB%D0%BA%D0%B0%3A%20',
    linkLabel: '📋 \u0422\u0412\u041e\u042f \u0423\u041d\u0418\u041a\u0410\u041b\u042c\u041d\u0410\u042f \u0421\u0421\u042b\u041b\u041a\u0410',
    unsubLabel: '\u041e\u0442\u043f\u0438\u0441\u0430\u0442\u044c\u0441\u044f',
  },
  AR: {
    bannerText: '💰 <strong>304 \u0645\u0644\u064a\u0648\u0646 \u0645\u063a\u062a\u0631\u0628 + 1.4 \u0645\u0644\u064a\u0627\u0631 \u0645\u0633\u0627\u0641\u0631</strong> \u0628\u062d\u0627\u062c\u0629 \u0644\u0644\u0645\u0633\u0627\u0639\u062f\u0629!',
    bannerCta: '\u0627\u0631\u0628\u062d [COMMISSION_CLIENT_LAWYER] \u0644\u0643\u0644 \u0645\u0643\u0627\u0644\u0645\u0629 →',
    bannerEmailSubject: '%F0%9F%8C%8D%20SOS-Expat',
    bannerEmailBody: '%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%21%20%D8%AC%D8%B1%D8%A8%3A%20',
    viralTitle: '💰 \u0627\u0631\u0628\u062d \u0645\u0627\u0644\u0627\u064b \u0645\u062f\u0649 \u0627\u0644\u062d\u064a\u0627\u0629',
    statExpats: '\u0645\u063a\u062a\u0631\u0628',
    statCountries: '\u062f\u0648\u0644\u0629',
    statPerCall: '\u0644\u0643\u0644 \u0645\u0643\u0627\u0644\u0645\u0629',
    mainMsg: '\u0643\u0644 \u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0644\u0631\u0627\u0628\u0637\u0643 = <strong style="color:#10B981;">[COMMISSION_CLIENT_LAWYER] \u0644\u0643\u0644 \u0645\u0643\u0627\u0644\u0645\u0629</strong>',
    subMsg: '🔥 \u0639\u0645\u0648\u0644\u0627\u062a \u0628\u0627\u0644\u062f\u0648\u0644\u0627\u0631 \u2022 \u0645\u062f\u0649 \u0627\u0644\u062d\u064a\u0627\u0629 \u2022 \u0628\u062f\u0648\u0646 \u062d\u062f\u0648\u062f',
    shareWa: '%F0%9F%9A%80%20SOS-Expat%20%E2%80%94%20%D9%85%D8%B3%D8%A7%D8%B9%D8%AF%D8%A9%20%D9%84%D9%84%D9%85%D8%BA%D8%AA%D8%B1%D8%A8%D9%8A%D9%86.%20%D8%B1%D8%A7%D8%A8%D8%B7%D9%8A%3A%20',
    shareFb: '%F0%9F%8C%8D%20304M%20%D9%85%D8%BA%D8%AA%D8%B1%D8%A8.%20Ulixai%20%D9%8A%D8%B3%D8%A7%D8%B9%D8%AF%D9%87%D9%85!',
    shareTw: '%F0%9F%9A%80%20SOS-Expat%3A%20%D9%85%D8%B3%D8%A7%D8%B9%D8%AF%D8%A9%20304M%20%D9%85%D8%BA%D8%AA%D8%B1%D8%A8.',
    shareEmailSubject: '%F0%9F%8C%8D%20SOS-Expat',
    shareEmailBody: '%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%21%0A%D8%A3%D9%88%D8%B5%D9%8A%20%D8%A8%D9%80SOS-Expat.%0A%D8%B1%D8%A7%D8%A8%D8%B7%3A%20',
    linkLabel: '📋 \u0631\u0627\u0628\u0637\u0643 \u0627\u0644\u0641\u0631\u064a\u062f',
    unsubLabel: '\u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643',
  },
  HI: {
    bannerText: '💰 <strong>304M \u092a\u094d\u0930\u0935\u093e\u0938\u0940 + 1.4B \u092f\u093e\u0924\u094d\u0930\u0940</strong> \u0915\u094b \u092e\u0926\u0926 \u091a\u093e\u0939\u093f\u090f!',
    bannerCta: '\u092a\u094d\u0930\u0924\u093f \u0915\u0949\u0932 [COMMISSION_CLIENT_LAWYER] \u0915\u092e\u093e\u0913 →',
    bannerEmailSubject: '%F0%9F%8C%8D%20SOS-Expat',
    bannerEmailBody: '%E0%A4%A8%E0%A4%AE%E0%A4%B8%E0%A5%8D%E0%A4%A4%E0%A5%87%21%20%E0%A4%AF%E0%A4%B9%20%E0%A4%A6%E0%A5%87%E0%A4%96%E0%A5%87%E0%A4%82%3A%20',
    viralTitle: '💰 \u091c\u0940\u0935\u0928 \u092d\u0930 \u0915\u092e\u093e\u0913',
    statExpats: '\u092a\u094d\u0930\u0935\u093e\u0938\u0940',
    statCountries: '\u0926\u0947\u0936',
    statPerCall: '\u092a\u094d\u0930\u0924\u093f \u0915\u0949\u0932',
    mainMsg: '\u0906\u092a\u0915\u0947 \u0932\u093f\u0902\u0915 \u0915\u093e \u0939\u0930 \u0909\u092a\u092f\u094b\u0917 = <strong style="color:#10B981;">[COMMISSION_CLIENT_LAWYER] \u092a\u094d\u0930\u0924\u093f \u0915\u0949\u0932</strong>',
    subMsg: '🔥 USD \u092e\u0947\u0902 \u0915\u092e\u0940\u0936\u0928 \u2022 \u091c\u0940\u0935\u0928 \u092d\u0930 \u2022 \u0915\u094b\u0908 \u0938\u0940\u092e\u093e \u0928\u0939\u0940\u0902',
    shareWa: '%F0%9F%9A%80%20SOS-Expat%20%E2%80%94%20%E0%A4%AA%E0%A5%8D%E0%A4%B0%E0%A4%B5%E0%A4%BE%E0%A4%B8%E0%A4%BF%E0%A4%AF%E0%A5%8B%E0%A4%82%20%E0%A4%95%E0%A5%87%20%E0%A4%B2%E0%A4%BF%E0%A4%8F.%20%E0%A4%AE%E0%A5%87%E0%A4%B0%E0%A4%BE%20%E0%A4%B2%E0%A4%BF%E0%A4%82%E0%A4%95%3A%20',
    shareFb: '%F0%9F%8C%8D%20304M%20%E0%A4%AA%E0%A5%8D%E0%A4%B0%E0%A4%B5%E0%A4%BE%E0%A4%B8%E0%A5%80.%20Ulixai%20%E0%A4%AE%E0%A4%A6%E0%A4%A6%20%E0%A4%95%E0%A4%B0%E0%A4%A4%E0%A4%BE%20%E0%A4%B9%E0%A5%88!',
    shareTw: '%F0%9F%9A%80%20SOS-Expat%3A%20304M%20%E0%A4%AA%E0%A5%8D%E0%A4%B0%E0%A4%B5%E0%A4%BE%E0%A4%B8%E0%A4%BF%E0%A4%AF%E0%A5%8B%E0%A4%82%20%E0%A4%95%E0%A5%87%20%E0%A4%B2%E0%A4%BF%E0%A4%8F.',
    shareEmailSubject: '%F0%9F%8C%8D%20SOS-Expat',
    shareEmailBody: '%E0%A4%A8%E0%A4%AE%E0%A4%B8%E0%A5%8D%E0%A4%A4%E0%A5%87%21%0ASOS-Expat%20%E0%A4%86%E0%A4%9C%E0%A4%BC%E0%A4%AE%E0%A4%BE%E0%A4%8F%E0%A4%82.%0A%E0%A4%B2%E0%A4%BF%E0%A4%82%E0%A4%95%3A%20',
    linkLabel: '📋 \u0906\u092a\u0915\u093e \u0905\u0928\u094b\u0916\u093e \u0932\u093f\u0902\u0915',
    unsubLabel: '\u0938\u0926\u0938\u094d\u092f\u0924\u093e \u0930\u0926\u094d\u0926 \u0915\u0930\u0947\u0902',
  },
  ZH: {
    bannerText: '💰 <strong>3.04\u4ebf\u4fa8\u6c11 + 14\u4ebf\u65c5\u884c\u8005</strong>\u9700\u8981\u5e2e\u52a9\uff01',
    bannerCta: '\u6bcf\u901a\u7535\u8bdd\u8d5a [COMMISSION_CLIENT_LAWYER] →',
    bannerEmailSubject: '%F0%9F%8C%8D%20SOS-Expat',
    bannerEmailBody: '%E4%BD%A0%E5%A5%BD%EF%BC%81%E8%AF%95%E8%AF%95%E8%BF%99%E4%B8%AA%EF%BC%9A%20',
    viralTitle: '💰 \u7ec8\u8eab\u8d5a\u94b1',
    statExpats: '\u4fa8\u6c11',
    statCountries: '\u56fd\u5bb6',
    statPerCall: '\u6bcf\u901a\u7535\u8bdd',
    mainMsg: '\u6bcf\u6b21\u4f7f\u7528\u4f60\u7684\u94fe\u63a5 = <strong style="color:#10B981;">[COMMISSION_CLIENT_LAWYER] \u6bcf\u901a\u7535\u8bdd</strong>',
    subMsg: '🔥 \u7f8e\u5143\u4f63\u91d1 \u2022 \u7ec8\u8eab \u2022 \u65e0\u9650\u5236',
    shareWa: '%F0%9F%9A%80%20SOS-Expat%20%E2%80%94%20%E5%B8%AE%E5%8A%A9%E4%BE%A8%E6%B0%91%E3%80%82%E6%88%91%E7%9A%84%E9%93%BE%E6%8E%A5%EF%BC%9A%20',
    shareFb: '%F0%9F%8C%8D%203.04%E4%BA%BF%E4%BE%A8%E6%B0%91%E3%80%82Ulixai%E5%B8%AE%E5%8A%A9%E4%BB%96%E4%BB%AC!',
    shareTw: '%F0%9F%9A%80%20SOS-Expat%EF%BC%9A%E5%B8%AE%E5%8A%A93.04%E4%BA%BF%E4%BE%A8%E6%B0%91%E3%80%82',
    shareEmailSubject: '%F0%9F%8C%8D%20SOS-Expat',
    shareEmailBody: '%E4%BD%A0%E5%A5%BD%EF%BC%81%0A%E6%8E%A8%E8%8D%90SOS-Expat%E3%80%82%0A%E9%93%BE%E6%8E%A5%EF%BC%9A%20',
    linkLabel: '📋 \u4f60\u7684\u4e13\u5c5e\u94fe\u63a5',
    unsubLabel: '\u53d6\u6d88\u8ba2\u9605',
  },
};

// ── HTML BUILDERS ───────────────────────────────────────────────────────────

function buildAmberBanner(t) {
  return `<tr><td style="background:linear-gradient(90deg,#F59E0B 0%,#D97706 100%);padding:15px 20px;text-align:center;">
<p style="color:#ffffff;font-size:14px;font-weight:600;margin:0;">${t.bannerText} <a href="mailto:?subject=${t.bannerEmailSubject}&body=${t.bannerEmailBody}[LINK]" style="color:#ffffff;text-decoration:underline;font-weight:700;">${t.bannerCta}</a></p>
</td></tr>`;
}

function buildViralBlock(t) {
  return `<tr><td style="padding:0 40px 30px 40px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:linear-gradient(135deg,#1F2937 0%,#374151 100%);border-radius:16px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#F59E0B 0%,#D97706 100%);padding:20px;text-align:center;">
<p style="color:#ffffff;font-size:24px;font-weight:800;margin:0;text-shadow:0 2px 4px rgba(0,0,0,0.2);">${t.viralTitle}</p>
</td></tr>
<tr><td style="padding:25px 20px 15px 20px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr>
<td style="width:33%;text-align:center;padding:10px;"><p style="color:#F59E0B;font-size:28px;font-weight:800;margin:0;">304M</p><p style="color:#9CA3AF;font-size:11px;margin:5px 0 0 0;">${t.statExpats}</p></td>
<td style="width:33%;text-align:center;padding:10px;border-left:1px solid #4B5563;border-right:1px solid #4B5563;"><p style="color:#F59E0B;font-size:28px;font-weight:800;margin:0;">197</p><p style="color:#9CA3AF;font-size:11px;margin:5px 0 0 0;">${t.statCountries}</p></td>
<td style="width:33%;text-align:center;padding:10px;"><p style="color:#10B981;font-size:28px;font-weight:800;margin:0;">[COMMISSION_CLIENT_LAWYER]</p><p style="color:#9CA3AF;font-size:11px;margin:5px 0 0 0;">${t.statPerCall}</p></td>
</tr>
</table>
</td></tr>
<tr><td style="padding:0 20px 20px 20px;text-align:center;">
<p style="color:#ffffff;font-size:16px;line-height:1.6;margin:0 0 5px 0;">${t.mainMsg}</p>
<p style="color:#F59E0B;font-size:14px;font-weight:600;margin:0;">${t.subMsg}</p>
</td></tr>
<tr><td style="padding:0 20px 20px 20px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr>
<td style="width:25%;padding:5px;"><a href="https://wa.me/?text=${t.shareWa}[LINK]" style="display:block;background-color:#25D366;border-radius:12px;padding:15px 10px;text-align:center;text-decoration:none;"><img src="https://cdn-icons-png.flaticon.com/512/733/733585.png" alt="WhatsApp" width="28" style="display:block;margin:0 auto 5px auto;"><span style="color:#ffffff;font-size:11px;font-weight:600;">WhatsApp</span></a></td>
<td style="width:25%;padding:5px;"><a href="https://www.facebook.com/sharer/sharer.php?u=[LINK]&quote=${t.shareFb}" style="display:block;background-color:#1877F2;border-radius:12px;padding:15px 10px;text-align:center;text-decoration:none;"><img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" alt="Facebook" width="28" style="display:block;margin:0 auto 5px auto;"><span style="color:#ffffff;font-size:11px;font-weight:600;">Facebook</span></a></td>
<td style="width:25%;padding:5px;"><a href="https://twitter.com/intent/tweet?text=${t.shareTw}&url=[LINK]&hashtags=expatlife,SOSExpat" style="display:block;background-color:#000000;border-radius:12px;padding:15px 10px;text-align:center;text-decoration:none;"><img src="https://cdn-icons-png.flaticon.com/512/5969/5969020.png" alt="X" width="28" style="display:block;margin:0 auto 5px auto;"><span style="color:#ffffff;font-size:11px;font-weight:600;">X / Twitter</span></a></td>
<td style="width:25%;padding:5px;"><a href="mailto:?subject=${t.shareEmailSubject}&body=${t.shareEmailBody}[LINK]" style="display:block;background-color:#6B7280;border-radius:12px;padding:15px 10px;text-align:center;text-decoration:none;"><img src="https://cdn-icons-png.flaticon.com/512/732/732200.png" alt="Email" width="28" style="display:block;margin:0 auto 5px auto;"><span style="color:#ffffff;font-size:11px;font-weight:600;">Email</span></a></td>
</tr>
</table>
</td></tr>
<tr><td style="padding:0 20px 20px 20px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#111827;border-radius:8px;border:2px dashed #F59E0B;">
<tr><td style="padding:15px;text-align:center;">
<p style="color:#9CA3AF;font-size:12px;margin:0 0 8px 0;">${t.linkLabel}</p>
<a href="[LINK]" style="color:#F59E0B;font-size:14px;font-weight:700;text-decoration:none;word-break:break-all;">[LINK]</a>
</td></tr>
</table>
</td></tr>
</table>
</td></tr>`;
}

function buildRichFooter(t) {
  return `<tr><td style="background:linear-gradient(135deg,#fef2f2 0%,#fff7ed 100%);padding:28px 20px;text-align:center;">
<table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto 20px auto;">
<tr>
<td style="padding:0 8px;"><a href="https://www.facebook.com/profile.php?id=61575873886727" style="display:inline-block;width:38px;height:38px;line-height:38px;background:#dc2626;border-radius:50%;text-align:center;"><img alt="Facebook" src="https://cdn-icons-png.flaticon.com/512/733/733547.png" width="18" style="vertical-align:middle;"/></a></td>
<td style="padding:0 8px;"><a href="https://www.instagram.com/ulixai_officiel/" style="display:inline-block;width:38px;height:38px;line-height:38px;background:#dc2626;border-radius:50%;text-align:center;"><img alt="Instagram" src="https://cdn-icons-png.flaticon.com/512/733/733558.png" width="18" style="vertical-align:middle;"/></a></td>
<td style="padding:0 8px;"><a href="https://www.linkedin.com/in/williams-j-472736383/" style="display:inline-block;width:38px;height:38px;line-height:38px;background:#dc2626;border-radius:50%;text-align:center;"><img alt="LinkedIn" src="https://cdn-icons-png.flaticon.com/512/733/733561.png" width="18" style="vertical-align:middle;"/></a></td>
</tr>
</table>
<p style="color:#1f2937;font-size:15px;margin:0 0 4px 0;font-weight:700;">SOS-Expat.com <span style="color:#dc2626;">\u2764\uFE0F</span> by Ulixai</p>
<p style="color:#6b7280;font-size:12px;margin:0 0 12px 0;">World'Expats O\u00dc - Estonie</p>
<p style="color:#9ca3af;font-size:10px;margin:0;">\u00a9 2026 World'Expats O\u00dc \u2014 Will d'Ulixai</p>
<p style="margin:0;"><a href="[UNSUBSCRIBE_URL]" style="color:#9ca3af;font-size:11px;text-decoration:underline;">${t.unsubLabel}</a></p>
</td></tr>`;
}

// ── TEMPLATE INJECTION ──────────────────────────────────────────────────────

function injectIntoChatterTemplate(html, lang) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.EN;
  let result = html;

  // 1. Inject amber banner after header (after first </td></tr> of the logo row)
  const headerEndPattern = /(<tr><td style="background:linear-gradient\(145deg,#059669[^"]*\);padding:30px[^<]*<\/td><\/tr>)/;
  const headerMatch = result.match(headerEndPattern);
  if (headerMatch) {
    result = result.replace(headerMatch[0], headerMatch[0] + '\n' + buildAmberBanner(t));
  }

  // 2. Find the simple footer and replace with viral block + rich footer
  const simpleFooterPattern = /<tr><td style="background:linear-gradient\(135deg,#f0fdf4[^]*?<\/td><\/tr>\s*<\/table>/;
  const footerMatch = result.match(simpleFooterPattern);
  if (footerMatch) {
    result = result.replace(
      footerMatch[0],
      buildViralBlock(t) + '\n' + buildRichFooter(t) + '\n</table>'
    );
  }

  return result;
}

// ── MAILWIZZ API ────────────────────────────────────────────────────────────

const templateCache = new Map();

async function refreshCache(apiKey) {
  let page = 1;
  let totalPages = 1;
  do {
    const resp = await axios.get(`${MAILWIZZ_API_URL}/templates?page=${page}&per_page=100`, {
      headers: { "X-MW-PUBLIC-KEY": apiKey, "X-MW-CUSTOMER-ID": MAILWIZZ_CUSTOMER_ID, "User-Agent": "SOS-Update/1.0" },
      timeout: 15000,
    });
    const records = resp.data?.data?.records || [];
    for (const r of records) templateCache.set(r.name, r.template_uid);
    totalPages = resp.data?.data?.total_pages || 1;
    page++;
  } while (page <= totalPages);
}

async function fetchTemplate(apiKey, uid) {
  const resp = await axios.get(`${MAILWIZZ_API_URL}/templates/${uid}`, {
    headers: { "X-MW-PUBLIC-KEY": apiKey, "X-MW-CUSTOMER-ID": MAILWIZZ_CUSTOMER_ID },
    timeout: 10000,
  });
  return resp.data?.data?.record || {};
}

async function updateTemplate(apiKey, uid, name, content) {
  const formData = new URLSearchParams();
  formData.append("template[name]", name);
  // CRITICAL: MailWizz API requires base64-encoded HTML content
  formData.append("template[content]", Buffer.from(content).toString("base64"));

  const resp = await axios.put(`${MAILWIZZ_API_URL}/templates/${uid}`, formData.toString(), {
    headers: {
      "X-MW-PUBLIC-KEY": apiKey,
      "X-MW-CUSTOMER-ID": MAILWIZZ_CUSTOMER_ID,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    timeout: 15000,
  });
  return resp.data;
}

// ── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  🔧 MISE À JOUR TEMPLATES CHATTER — Bloc viral referral");
  console.log(`  Mode: ${DRY_RUN ? "🔍 DRY RUN (--apply pour appliquer)" : "🚀 APPLICATION RÉELLE"}`);
  console.log("═══════════════════════════════════════════════════════════\n");

  const apiKey = getSecret("MAILWIZZ_API_KEY");
  await refreshCache(apiKey);
  console.log(`📦 ${templateCache.size} templates\n`);

  const CHATTER_SLUGS = [
    "first-commission",
    "commission-earned",
    "recruit-signup",
    "withdrawal-requested",
    "withdrawal-sent",
    "withdrawal-failed",
    "milestone",
    "telegram-linked",
    "threshold-reached",
    "trustpilot-invite",
  ];

  const LANGUAGES = ["FR", "EN", "ES", "DE", "PT", "RU", "AR", "HI", "ZH"];

  let updated = 0;
  let skipped = 0;
  let notFound = 0;
  let errors = 0;

  for (const slug of CHATTER_SLUGS) {
    for (const lang of LANGUAGES) {
      const name = `transactional-chatter-${slug} [${lang}]`;
      const uid = templateCache.get(name);

      if (!uid) {
        console.log(`  ⚠️  NOT FOUND: ${name}`);
        notFound++;
        continue;
      }

      try {
        const record = await fetchTemplate(apiKey, uid);
        const originalHtml = record.content || "";

        // Skip if already has viral block
        if (/GAGNE DE L'ARGENT|EARN MONEY FOR LIFE|GANA DINERO|VERDIENE GELD|GANHE DINHEIRO|\u0417\u0410\u0420\u0410\u0411\u0410\u0422\u042b\u0412\u0410\u0419|\u0627\u0631\u0628\u062d \u0645\u0627\u0644\u0627|\u091c\u0940\u0935\u0928 \u092d\u0930|\u7ec8\u8eab\u8d5a\u94b1/i.test(originalHtml)) {
          console.log(`  ⏭️  SKIP (already has viral): ${name}`);
          skipped++;
          continue;
        }

        const newHtml = injectIntoChatterTemplate(originalHtml, lang);

        if (newHtml === originalHtml) {
          console.log(`  ⏭️  SKIP (no change): ${name}`);
          skipped++;
          continue;
        }

        const sizeDiff = newHtml.length - originalHtml.length;

        if (DRY_RUN) {
          console.log(`  🔍 WOULD UPDATE: ${name} (${originalHtml.length} → ${newHtml.length} bytes, +${sizeDiff})`);
          updated++;
        } else {
          await updateTemplate(apiKey, uid, record.name || name, newHtml);
          console.log(`  ✅ UPDATED: ${name} (${originalHtml.length} → ${newHtml.length} bytes, +${sizeDiff})`);
          updated++;
          // Rate limit
          await new Promise(r => setTimeout(r, 500));
        }
      } catch (err) {
        console.log(`  ❌ ERROR: ${name}: ${err.message}`);
        errors++;
      }
    }
  }

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  📊 RÉSUMÉ");
  console.log("═══════════════════════════════════════════════════════════\n");
  console.log(`  ${DRY_RUN ? "Serait mis à jour" : "Mis à jour"}: ${updated}`);
  console.log(`  Déjà OK / pas de changement: ${skipped}`);
  console.log(`  Templates non trouvés: ${notFound}`);
  console.log(`  Erreurs: ${errors}`);

  if (DRY_RUN && updated > 0) {
    console.log(`\n  👉 Pour appliquer: node scripts/updateChatterTemplates.js --apply`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
