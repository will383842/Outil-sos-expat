/**
 * Multilingual Welcome Email Templates
 *
 * Generates branded welcome emails for all affiliate roles (9 languages).
 * Used by onChatterCreated, onBloggerCreated, onInfluencerCreated, onGroupAdminCreated.
 */

type Lang = "fr" | "en" | "es" | "pt" | "de" | "ru" | "ar" | "hi" | "zh";
type Role = "chatter" | "blogger" | "influencer" | "groupAdmin";

interface RoleConfig {
  color: string;
  gradientFrom: string;
  gradientTo: string;
  bgLight: string;
  dashboardUrl: string;
}

const ROLE_CONFIGS: Record<Role, RoleConfig> = {
  chatter: {
    color: "#4F46E5",
    gradientFrom: "#4F46E5",
    gradientTo: "#7C3AED",
    bgLight: "#EEF2FF",
    dashboardUrl: "https://sos-expat.com/chatter/tableau-de-bord",
  },
  blogger: {
    color: "#7C3AED",
    gradientFrom: "#7C3AED",
    gradientTo: "#A855F7",
    bgLight: "#F5F3FF",
    dashboardUrl: "https://sos-expat.com/blogger/tableau-de-bord",
  },
  influencer: {
    color: "#EF4444",
    gradientFrom: "#EF4444",
    gradientTo: "#F97316",
    bgLight: "#FEF2F2",
    dashboardUrl: "https://sos-expat.com/influencer/tableau-de-bord",
  },
  groupAdmin: {
    color: "#6366F1",
    gradientFrom: "#6366F1",
    gradientTo: "#818CF8",
    bgLight: "#EEF2FF",
    dashboardUrl: "https://sos-expat.com/group-admin/dashboard",
  },
};

// ---------------------------------------------------------------------------
// Translations per role + language
// ---------------------------------------------------------------------------

interface T {
  subject: string;
  greeting: string;
  subtitle: string;
  welcomeTitle: string;
  welcomeBody: string;
  ctaLabel: string;
  commissionsTitle: string;
  commissions: string[];
  commissionsNote: string;
  tipTitle: string;
  tipBody: string;
}

function getTranslations(role: Role, lang: Lang, firstName: string): T {
  // Commission structures
  const chatterCommissions: Record<Lang, string[]> = {
    fr: ["<strong>10$/appel</strong> pour chaque client que tu apportes", "<strong>1$/appel</strong> pour les appels de tes filleuls N1", "<strong>0.50$/appel</strong> pour les appels de tes filleuls N2", "<strong>5$/activation</strong> quand ton filleul fait son 2e appel"],
    en: ["<strong>$10/call</strong> for every client you bring", "<strong>$1/call</strong> for your N1 referrals' calls", "<strong>$0.50/call</strong> for your N2 referrals' calls", "<strong>$5/activation</strong> when your referral makes their 2nd call"],
    es: ["<strong>$10/llamada</strong> por cada cliente que traigas", "<strong>$1/llamada</strong> por las llamadas de tus referidos N1", "<strong>$0.50/llamada</strong> por las llamadas de tus referidos N2", "<strong>$5/activaci\u00f3n</strong> cuando tu referido haga su 2\u00aa llamada"],
    pt: ["<strong>$10/chamada</strong> para cada cliente que voc\u00ea trazer", "<strong>$1/chamada</strong> para chamadas dos seus indicados N1", "<strong>$0.50/chamada</strong> para chamadas dos seus indicados N2", "<strong>$5/ativa\u00e7\u00e3o</strong> quando seu indicado fizer a 2\u00aa chamada"],
    de: ["<strong>$10/Anruf</strong> f\u00fcr jeden Kunden, den du mitbringst", "<strong>$1/Anruf</strong> f\u00fcr Anrufe deiner N1-Empfehlungen", "<strong>$0.50/Anruf</strong> f\u00fcr Anrufe deiner N2-Empfehlungen", "<strong>$5/Aktivierung</strong> wenn dein Empfohlener seinen 2. Anruf t\u00e4tigt"],
    ru: ["<strong>$10/\u0437\u0432\u043e\u043d\u043e\u043a</strong> \u0437\u0430 \u043a\u0430\u0436\u0434\u043e\u0433\u043e \u043a\u043b\u0438\u0435\u043d\u0442\u0430", "<strong>$1/\u0437\u0432\u043e\u043d\u043e\u043a</strong> \u043e\u0442 \u0432\u0430\u0448\u0438\u0445 \u0440\u0435\u0444\u0435\u0440\u0430\u043b\u043e\u0432 N1", "<strong>$0.50/\u0437\u0432\u043e\u043d\u043e\u043a</strong> \u043e\u0442 \u0432\u0430\u0448\u0438\u0445 \u0440\u0435\u0444\u0435\u0440\u0430\u043b\u043e\u0432 N2", "<strong>$5/\u0430\u043a\u0442\u0438\u0432\u0430\u0446\u0438\u044f</strong> \u043a\u043e\u0433\u0434\u0430 \u0440\u0435\u0444\u0435\u0440\u0430\u043b \u0441\u0434\u0435\u043b\u0430\u0435\u0442 2-\u0439 \u0437\u0432\u043e\u043d\u043e\u043a"],
    ar: ["<strong>10$/\u0645\u0643\u0627\u0644\u0645\u0629</strong> \u0644\u0643\u0644 \u0639\u0645\u064a\u0644 \u062a\u062c\u0644\u0628\u0647", "<strong>1$/\u0645\u0643\u0627\u0644\u0645\u0629</strong> \u0645\u0646 \u0625\u062d\u0627\u0644\u0627\u062a\u0643 N1", "<strong>0.50$/\u0645\u0643\u0627\u0644\u0645\u0629</strong> \u0645\u0646 \u0625\u062d\u0627\u0644\u0627\u062a\u0643 N2", "<strong>5$/\u062a\u0641\u0639\u064a\u0644</strong> \u0639\u0646\u062f\u0645\u0627 \u064a\u062c\u0631\u064a \u0627\u0644\u0645\u062d\u0627\u0644 \u0645\u0643\u0627\u0644\u0645\u062a\u0647 \u0627\u0644\u062b\u0627\u0646\u064a\u0629"],
    hi: ["<strong>$10/\u0915\u0949\u0932</strong> \u0939\u0930 \u0915\u094d\u0932\u093e\u0907\u0902\u091f \u0915\u0947 \u0932\u093f\u090f \u091c\u094b \u0906\u092a \u0932\u093e\u090f\u0902", "<strong>$1/\u0915\u0949\u0932</strong> \u0906\u092a\u0915\u0947 N1 \u0930\u0947\u092b\u0930\u0932\u094d\u0938 \u0915\u0940 \u0915\u0949\u0932\u094d\u0938 \u0915\u0947 \u0932\u093f\u090f", "<strong>$0.50/\u0915\u0949\u0932</strong> \u0906\u092a\u0915\u0947 N2 \u0930\u0947\u092b\u0930\u0932\u094d\u0938 \u0915\u0940 \u0915\u0949\u0932\u094d\u0938 \u0915\u0947 \u0932\u093f\u090f", "<strong>$5/\u0938\u0915\u094d\u0930\u093f\u092f\u0924\u093e</strong> \u091c\u092c \u0906\u092a\u0915\u093e \u0930\u0947\u092b\u0930\u0932 \u0926\u0942\u0938\u0930\u0940 \u0915\u0949\u0932 \u0915\u0930\u0947"],
    zh: ["<strong>$10/\u901a\u8bdd</strong> \u6bcf\u4e2a\u60a8\u5e26\u6765\u7684\u5ba2\u6237", "<strong>$1/\u901a\u8bdd</strong> \u60a8\u7684N1\u63a8\u8350\u4eba\u7684\u901a\u8bdd", "<strong>$0.50/\u901a\u8bdd</strong> \u60a8\u7684N2\u63a8\u8350\u4eba\u7684\u901a\u8bdd", "<strong>$5/\u6fc0\u6d3b</strong> \u5f53\u63a8\u8350\u4eba\u8fdb\u884c\u7b2c2\u6b21\u901a\u8bdd\u65f6"],
  };

  const bloggerCommissions: Record<Lang, string[]> = {
    fr: ["<strong>10$/appel</strong> \u2014 chaque visiteur qui appelle via ton widget", "<strong>5$/appel</strong> \u2014 pour chaque appel des prestataires que tu recrutes"],
    en: ["<strong>$10/call</strong> \u2014 every visitor who calls via your widget", "<strong>$5/call</strong> \u2014 for every call from providers you recruit"],
    es: ["<strong>$10/llamada</strong> \u2014 cada visitante que llame con tu widget", "<strong>$5/llamada</strong> \u2014 por cada llamada de proveedores que reclutes"],
    pt: ["<strong>$10/chamada</strong> \u2014 cada visitante que liga pelo widget", "<strong>$5/chamada</strong> \u2014 por cada chamada dos prestadores que recrutar"],
    de: ["<strong>$10/Anruf</strong> \u2014 jeder Besucher, der \u00fcber dein Widget anruft", "<strong>$5/Anruf</strong> \u2014 f\u00fcr jeden Anruf von Anbietern, die du rekrutierst"],
    ru: ["<strong>$10/\u0437\u0432\u043e\u043d\u043e\u043a</strong> \u2014 \u043a\u0430\u0436\u0434\u044b\u0439 \u043f\u043e\u0441\u0435\u0442\u0438\u0442\u0435\u043b\u044c \u0447\u0435\u0440\u0435\u0437 \u0432\u0430\u0448 \u0432\u0438\u0434\u0436\u0435\u0442", "<strong>$5/\u0437\u0432\u043e\u043d\u043e\u043a</strong> \u2014 \u043e\u0442 \u043f\u0440\u043e\u0432\u0430\u0439\u0434\u0435\u0440\u043e\u0432, \u043a\u043e\u0442\u043e\u0440\u044b\u0445 \u0432\u044b \u043f\u0440\u0438\u0432\u043b\u0435\u043a\u043b\u0438"],
    ar: ["<strong>10$/\u0645\u0643\u0627\u0644\u0645\u0629</strong> \u2014 \u0643\u0644 \u0632\u0627\u0626\u0631 \u064a\u062a\u0635\u0644 \u0639\u0628\u0631 \u0627\u0644\u0648\u064a\u062c\u062a", "<strong>5$/\u0645\u0643\u0627\u0644\u0645\u0629</strong> \u2014 \u0645\u0646 \u0645\u0642\u062f\u0645\u064a \u0627\u0644\u062e\u062f\u0645\u0627\u062a \u0627\u0644\u0630\u064a\u0646 \u062a\u062c\u0646\u062f\u0647\u0645"],
    hi: ["<strong>$10/\u0915\u0949\u0932</strong> \u2014 \u0939\u0930 \u0935\u093f\u091c\u093c\u093f\u091f\u0930 \u091c\u094b \u0935\u093f\u091c\u0947\u091f \u0938\u0947 \u0915\u0949\u0932 \u0915\u0930\u0947", "<strong>$5/\u0915\u0949\u0932</strong> \u2014 \u0906\u092a\u0915\u0947 \u0930\u093f\u0915\u094d\u0930\u0942\u091f \u092a\u094d\u0930\u0926\u093e\u0924\u093e\u0913\u0902 \u0915\u0940 \u0915\u0949\u0932\u094d\u0938 \u0915\u0947 \u0932\u093f\u090f"],
    zh: ["<strong>$10/\u901a\u8bdd</strong> \u2014 \u6bcf\u4e2a\u901a\u8fc7\u60a8\u7684\u5c0f\u7ec4\u4ef6\u62e8\u6253\u7684\u8bbf\u5ba2", "<strong>$5/\u901a\u8bdd</strong> \u2014 \u60a8\u62db\u52df\u7684\u670d\u52a1\u63d0\u4f9b\u8005\u7684\u6bcf\u6b21\u901a\u8bdd"],
  };

  const influencerCommissions: Record<Lang, string[]> = bloggerCommissions; // Same structure

  const groupAdminCommissions: Record<Lang, string[]> = {
    fr: ["<strong>10$/appel</strong> \u2014 chaque membre qui appelle via ton lien", "<strong>5$/admin recrut\u00e9</strong> \u2014 quand un admin que tu recrutes atteint 50$ de gains"],
    en: ["<strong>$10/call</strong> \u2014 every member who calls via your link", "<strong>$5/recruited admin</strong> \u2014 when an admin you recruit reaches $50 earnings"],
    es: ["<strong>$10/llamada</strong> \u2014 cada miembro que llame con tu enlace", "<strong>$5/admin reclutado</strong> \u2014 cuando un admin reclutado alcance $50"],
    pt: ["<strong>$10/chamada</strong> \u2014 cada membro que ligar pelo seu link", "<strong>$5/admin recrutado</strong> \u2014 quando um admin recrutado atingir $50"],
    de: ["<strong>$10/Anruf</strong> \u2014 jedes Mitglied, das \u00fcber deinen Link anruft", "<strong>$5/rekrutierter Admin</strong> \u2014 wenn ein rekrutierter Admin $50 erreicht"],
    ru: ["<strong>$10/\u0437\u0432\u043e\u043d\u043e\u043a</strong> \u2014 \u043a\u0430\u0436\u0434\u044b\u0439 \u0443\u0447\u0430\u0441\u0442\u043d\u0438\u043a \u0447\u0435\u0440\u0435\u0437 \u0432\u0430\u0448\u0443 \u0441\u0441\u044b\u043b\u043a\u0443", "<strong>$5/\u0440\u0435\u043a\u0440\u0443\u0442</strong> \u2014 \u043a\u043e\u0433\u0434\u0430 \u0440\u0435\u043a\u0440\u0443\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u043d\u044b\u0439 \u0430\u0434\u043c\u0438\u043d \u0434\u043e\u0441\u0442\u0438\u0433\u043d\u0435\u0442 $50"],
    ar: ["<strong>10$/\u0645\u0643\u0627\u0644\u0645\u0629</strong> \u2014 \u0643\u0644 \u0639\u0636\u0648 \u064a\u062a\u0635\u0644 \u0639\u0628\u0631 \u0631\u0627\u0628\u0637\u0643", "<strong>5$/\u0645\u0634\u0631\u0641 \u0645\u062c\u0646\u062f</strong> \u2014 \u0639\u0646\u062f\u0645\u0627 \u064a\u0635\u0644 \u0645\u0634\u0631\u0641 \u062c\u0646\u062f\u062a\u0647 \u0625\u0644\u0649 50$"],
    hi: ["<strong>$10/\u0915\u0949\u0932</strong> \u2014 \u0939\u0930 \u0938\u0926\u0938\u094d\u092f \u091c\u094b \u0906\u092a\u0915\u0947 \u0932\u093f\u0902\u0915 \u0938\u0947 \u0915\u0949\u0932 \u0915\u0930\u0947", "<strong>$5/\u0930\u093f\u0915\u094d\u0930\u0942\u091f</strong> \u2014 \u091c\u092c \u0930\u093f\u0915\u094d\u0930\u0942\u091f \u090f\u0921\u092e\u093f\u0928 $50 \u092a\u0930 \u092a\u0939\u0941\u0901\u091a\u0947"],
    zh: ["<strong>$10/\u901a\u8bdd</strong> \u2014 \u6bcf\u4e2a\u901a\u8fc7\u60a8\u94fe\u63a5\u62e8\u6253\u7684\u6210\u5458", "<strong>$5/\u62db\u52df\u7ba1\u7406\u5458</strong> \u2014 \u5f53\u62db\u52df\u7684\u7ba1\u7406\u5458\u8fbe\u5230$50\u6536\u5165\u65f6"],
  };

  const commissionMap: Record<Role, Record<Lang, string[]>> = {
    chatter: chatterCommissions,
    blogger: bloggerCommissions,
    influencer: influencerCommissions,
    groupAdmin: groupAdminCommissions,
  };

  // Common translations
  const t: Record<Lang, Omit<T, "commissions" | "commissionsNote">> = {
    fr: { subject: "", greeting: `Salut ${firstName} !`, subtitle: "", welcomeTitle: "", welcomeBody: "", ctaLabel: "Mon tableau de bord \u2192", commissionsTitle: "\ud83d\udcb0 Tes commissions", tipTitle: "\ud83d\udca1 Astuce pour d\u00e9marrer", tipBody: "" },
    en: { subject: "", greeting: `Hey ${firstName}!`, subtitle: "", welcomeTitle: "", welcomeBody: "", ctaLabel: "My dashboard \u2192", commissionsTitle: "\ud83d\udcb0 Your commissions", tipTitle: "\ud83d\udca1 Getting started tip", tipBody: "" },
    es: { subject: "", greeting: `\u00a1Hola ${firstName}!`, subtitle: "", welcomeTitle: "", welcomeBody: "", ctaLabel: "Mi panel \u2192", commissionsTitle: "\ud83d\udcb0 Tus comisiones", tipTitle: "\ud83d\udca1 Consejo para empezar", tipBody: "" },
    pt: { subject: "", greeting: `Ol\u00e1 ${firstName}!`, subtitle: "", welcomeTitle: "", welcomeBody: "", ctaLabel: "Meu painel \u2192", commissionsTitle: "\ud83d\udcb0 Suas comiss\u00f5es", tipTitle: "\ud83d\udca1 Dica para come\u00e7ar", tipBody: "" },
    de: { subject: "", greeting: `Hallo ${firstName}!`, subtitle: "", welcomeTitle: "", welcomeBody: "", ctaLabel: "Mein Dashboard \u2192", commissionsTitle: "\ud83d\udcb0 Deine Provisionen", tipTitle: "\ud83d\udca1 Starttipp", tipBody: "" },
    ru: { subject: "", greeting: `\u041f\u0440\u0438\u0432\u0435\u0442 ${firstName}!`, subtitle: "", welcomeTitle: "", welcomeBody: "", ctaLabel: "\u041c\u043e\u044f \u043f\u0430\u043d\u0435\u043b\u044c \u2192", commissionsTitle: "\ud83d\udcb0 \u0412\u0430\u0448\u0438 \u043a\u043e\u043c\u0438\u0441\u0441\u0438\u0438", tipTitle: "\ud83d\udca1 \u0421\u043e\u0432\u0435\u0442 \u0434\u043b\u044f \u0441\u0442\u0430\u0440\u0442\u0430", tipBody: "" },
    ar: { subject: "", greeting: `\u0645\u0631\u062d\u0628\u0627 ${firstName}!`, subtitle: "", welcomeTitle: "", welcomeBody: "", ctaLabel: "\u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645 \u2192", commissionsTitle: "\ud83d\udcb0 \u0639\u0645\u0648\u0644\u0627\u062a\u0643", tipTitle: "\ud83d\udca1 \u0646\u0635\u064a\u062d\u0629 \u0644\u0644\u0628\u062f\u0627\u064a\u0629", tipBody: "" },
    hi: { subject: "", greeting: `\u0939\u0947 ${firstName}!`, subtitle: "", welcomeTitle: "", welcomeBody: "", ctaLabel: "\u092e\u0947\u0930\u093e \u0921\u0948\u0936\u092c\u094b\u0930\u094d\u0921 \u2192", commissionsTitle: "\ud83d\udcb0 \u0906\u092a\u0915\u0940 \u0915\u092e\u0940\u0936\u0928", tipTitle: "\ud83d\udca1 \u0936\u0941\u0930\u0942 \u0915\u0930\u0928\u0947 \u0915\u0940 \u091f\u093f\u092a", tipBody: "" },
    zh: { subject: "", greeting: `\u4f60\u597d ${firstName}\uff01`, subtitle: "", welcomeTitle: "", welcomeBody: "", ctaLabel: "\u6211\u7684\u63a7\u5236\u9762\u677f \u2192", commissionsTitle: "\ud83d\udcb0 \u4f63\u91d1", tipTitle: "\ud83d\udca1 \u5165\u95e8\u63d0\u793a", tipBody: "" },
  };

  // Role-specific translations
  const roleTexts: Record<Role, Record<Lang, { subject: string; subtitle: string; welcomeTitle: string; welcomeBody: string; commissionsNote: string; tipBody: string }>> = {
    chatter: {
      fr: { subject: "Bienvenue chez SOS-Expat Chatters ! \ud83c\udf89", subtitle: "Tu fais partie de l'\u00e9quipe SOS-Expat Chatters", welcomeTitle: "\ud83c\udf89 Bienvenue dans l'\u00e9quipe !", welcomeBody: "Ton compte est actif ! Partage ton lien dans les groupes Facebook d'expatri\u00e9s et commence \u00e0 gagner des commissions.", commissionsNote: "Bonus paliers : 15$, 35$, 90$, 250$, 600$ !", tipBody: "Rejoins les groupes Facebook d'expatri\u00e9s et aide les membres qui ont des questions juridiques. Chaque mise en relation = une commission !" },
      en: { subject: "Welcome to SOS-Expat Chatters! \ud83c\udf89", subtitle: "You're now part of the SOS-Expat Chatters team", welcomeTitle: "\ud83c\udf89 Welcome to the team!", welcomeBody: "Your account is active! Share your link in expat Facebook groups and start earning commissions.", commissionsNote: "Tier bonuses: $15, $35, $90, $250, $600!", tipBody: "Join expat Facebook groups and help members with legal questions. Every referral = a commission!" },
      es: { subject: "\u00a1Bienvenido a SOS-Expat Chatters! \ud83c\udf89", subtitle: "Ahora eres parte del equipo", welcomeTitle: "\ud83c\udf89 \u00a1Bienvenido al equipo!", welcomeBody: "Tu cuenta est\u00e1 activa. Comparte tu enlace en grupos de Facebook de expatriados.", commissionsNote: "\u00a1Bonos por niveles: $15, $35, $90, $250, $600!", tipBody: "\u00danete a grupos de Facebook de expatriados y ayuda con preguntas legales. \u00a1Cada referido = una comisi\u00f3n!" },
      pt: { subject: "Bem-vindo ao SOS-Expat Chatters! \ud83c\udf89", subtitle: "Voc\u00ea agora faz parte da equipe", welcomeTitle: "\ud83c\udf89 Bem-vindo \u00e0 equipe!", welcomeBody: "Sua conta est\u00e1 ativa! Compartilhe seu link em grupos de Facebook de expatriados.", commissionsNote: "B\u00f4nus por n\u00edveis: $15, $35, $90, $250, $600!", tipBody: "Entre em grupos de expatriados no Facebook e ajude com quest\u00f5es jur\u00eddicas." },
      de: { subject: "Willkommen bei SOS-Expat Chatters! \ud83c\udf89", subtitle: "Du bist jetzt Teil des Teams", welcomeTitle: "\ud83c\udf89 Willkommen im Team!", welcomeBody: "Dein Konto ist aktiv! Teile deinen Link in Expat-Facebook-Gruppen.", commissionsNote: "Stufenboni: $15, $35, $90, $250, $600!", tipBody: "Tritt Expat-Facebook-Gruppen bei und hilf bei rechtlichen Fragen." },
      ru: { subject: "\u0414\u043e\u0431\u0440\u043e \u043f\u043e\u0436\u0430\u043b\u043e\u0432\u0430\u0442\u044c \u0432 SOS-Expat Chatters! \ud83c\udf89", subtitle: "\u0412\u044b \u0442\u0435\u043f\u0435\u0440\u044c \u0447\u0430\u0441\u0442\u044c \u043a\u043e\u043c\u0430\u043d\u0434\u044b", welcomeTitle: "\ud83c\udf89 \u0414\u043e\u0431\u0440\u043e \u043f\u043e\u0436\u0430\u043b\u043e\u0432\u0430\u0442\u044c!", welcomeBody: "\u0412\u0430\u0448 \u0430\u043a\u043a\u0430\u0443\u043d\u0442 \u0430\u043a\u0442\u0438\u0432\u0435\u043d! \u041f\u043e\u0434\u0435\u043b\u0438\u0442\u0435\u0441\u044c \u0441\u0441\u044b\u043b\u043a\u043e\u0439 \u0432 \u0433\u0440\u0443\u043f\u043f\u0430\u0445 Facebook.", commissionsNote: "\u0411\u043e\u043d\u0443\u0441\u044b: $15, $35, $90, $250, $600!", tipBody: "\u041f\u0440\u0438\u0441\u043e\u0435\u0434\u0438\u043d\u044f\u0439\u0442\u0435\u0441\u044c \u043a \u0433\u0440\u0443\u043f\u043f\u0430\u043c \u044d\u043a\u0441\u043f\u0430\u0442\u043e\u0432 \u0438 \u043f\u043e\u043c\u043e\u0433\u0430\u0439\u0442\u0435 \u0441 \u044e\u0440\u0438\u0434\u0438\u0447\u0435\u0441\u043a\u0438\u043c\u0438 \u0432\u043e\u043f\u0440\u043e\u0441\u0430\u043c\u0438." },
      ar: { subject: "\u0645\u0631\u062d\u0628\u0627 \u0628\u0643 \u0641\u064a SOS-Expat Chatters! \ud83c\udf89", subtitle: "\u0623\u0646\u062a \u0627\u0644\u0622\u0646 \u062c\u0632\u0621 \u0645\u0646 \u0627\u0644\u0641\u0631\u064a\u0642", welcomeTitle: "\ud83c\udf89 \u0645\u0631\u062d\u0628\u0627 \u0628\u0643!", welcomeBody: "\u062d\u0633\u0627\u0628\u0643 \u0646\u0634\u0637! \u0634\u0627\u0631\u0643 \u0631\u0627\u0628\u0637\u0643 \u0641\u064a \u0645\u062c\u0645\u0648\u0639\u0627\u062a \u0627\u0644\u0645\u063a\u062a\u0631\u0628\u064a\u0646.", commissionsNote: "\u0645\u0643\u0627\u0641\u0622\u062a: 15$, 35$, 90$, 250$, 600$!", tipBody: "\u0627\u0646\u0636\u0645 \u0644\u0645\u062c\u0645\u0648\u0639\u0627\u062a \u0627\u0644\u0645\u063a\u062a\u0631\u0628\u064a\u0646 \u0648\u0633\u0627\u0639\u062f \u0641\u064a \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064a\u0629." },
      hi: { subject: "SOS-Expat Chatters \u092e\u0947\u0902 \u0906\u092a\u0915\u093e \u0938\u094d\u0935\u093e\u0917\u0924 \u0939\u0948! \ud83c\udf89", subtitle: "\u0906\u092a \u0905\u092c \u091f\u0940\u092e \u0915\u093e \u0939\u093f\u0938\u094d\u0938\u093e \u0939\u0948\u0902", welcomeTitle: "\ud83c\udf89 \u091f\u0940\u092e \u092e\u0947\u0902 \u0938\u094d\u0935\u093e\u0917\u0924 \u0939\u0948!", welcomeBody: "\u0906\u092a\u0915\u093e \u0916\u093e\u0924\u093e \u0938\u0915\u094d\u0930\u093f\u092f \u0939\u0948! \u090f\u0915\u094d\u0938\u092a\u0948\u091f Facebook \u0917\u094d\u0930\u0941\u092a\u094d\u0938 \u092e\u0947\u0902 \u0905\u092a\u0928\u093e \u0932\u093f\u0902\u0915 \u0936\u0947\u092f\u0930 \u0915\u0930\u0947\u0902\u0964", commissionsNote: "\u091f\u093f\u092f\u0930 \u092c\u094b\u0928\u0938: $15, $35, $90, $250, $600!", tipBody: "\u090f\u0915\u094d\u0938\u092a\u0948\u091f Facebook \u0917\u094d\u0930\u0941\u092a\u094d\u0938 \u092e\u0947\u0902 \u0936\u093e\u092e\u093f\u0932 \u0939\u094b\u0902 \u0914\u0930 \u0915\u093e\u0928\u0942\u0928\u0940 \u0938\u0935\u093e\u0932\u094b\u0902 \u092e\u0947\u0902 \u092e\u0926\u0926 \u0915\u0930\u0947\u0902\u0964" },
      zh: { subject: "\u6b22\u8fce\u52a0\u5165SOS-Expat Chatters\uff01\ud83c\udf89", subtitle: "\u60a8\u73b0\u5728\u662f\u56e2\u961f\u7684\u4e00\u5458", welcomeTitle: "\ud83c\udf89 \u6b22\u8fce\u52a0\u5165\uff01", welcomeBody: "\u60a8\u7684\u8d26\u6237\u5df2\u6fc0\u6d3b\uff01\u5728\u5916\u7c4dFacebook\u7fa4\u7ec4\u5206\u4eab\u60a8\u7684\u94fe\u63a5\u3002", commissionsNote: "\u9636\u68af\u5956\u91d1\uff1a$15, $35, $90, $250, $600\uff01", tipBody: "\u52a0\u5165\u5916\u7c4dFacebook\u7fa4\u7ec4\uff0c\u5e2e\u52a9\u89e3\u7b54\u6cd5\u5f8b\u95ee\u9898\u3002" },
    },
    blogger: {
      fr: { subject: "Ton blog va rapporter gros ! \ud83d\ude80", subtitle: "Ton blog va devenir une machine \u00e0 commissions !", welcomeTitle: "\u2728 Bienvenue dans le programme Blogueurs !", welcomeBody: "Ton compte est activ\u00e9 ! Direction ton tableau de bord pour r\u00e9cup\u00e9rer ton widget et tes ressources.", commissionsNote: "Le widget s'int\u00e8gre en 2 minutes. Copier-coller et c'est parti !", tipBody: "Place le widget dans tes articles qui parlent d'expatriation ou de vie \u00e0 l'\u00e9tranger. C'est l\u00e0 que tes lecteurs en ont le plus besoin !" },
      en: { subject: "Your blog is about to earn big! \ud83d\ude80", subtitle: "Your blog is about to become a commission machine!", welcomeTitle: "\u2728 Welcome to the Bloggers program!", welcomeBody: "Your account is active! Head to your dashboard to get your widget and resources.", commissionsNote: "The widget integrates in 2 minutes. Copy-paste and go!", tipBody: "Place the widget in your expat or living-abroad articles. That's where your readers need it most!" },
      es: { subject: "\u00a1Tu blog va a generar ingresos! \ud83d\ude80", subtitle: "\u00a1Tu blog se convertir\u00e1 en una m\u00e1quina de comisiones!", welcomeTitle: "\u2728 \u00a1Bienvenido al programa de Bloggers!", welcomeBody: "Tu cuenta est\u00e1 activa. Ve a tu panel para obtener tu widget.", commissionsNote: "\u00a1El widget se integra en 2 minutos!", tipBody: "Coloca el widget en tus art\u00edculos sobre expatriaci\u00f3n." },
      pt: { subject: "Seu blog vai gerar renda! \ud83d\ude80", subtitle: "Seu blog vai virar uma m\u00e1quina de comiss\u00f5es!", welcomeTitle: "\u2728 Bem-vindo ao programa Bloggers!", welcomeBody: "Sua conta est\u00e1 ativa! V\u00e1 ao painel para pegar seu widget.", commissionsNote: "O widget \u00e9 integrado em 2 minutos!", tipBody: "Coloque o widget nos seus artigos sobre expatria\u00e7\u00e3o." },
      de: { subject: "Dein Blog wird gro\u00df verdienen! \ud83d\ude80", subtitle: "Dein Blog wird zur Provisionsmaschine!", welcomeTitle: "\u2728 Willkommen im Blogger-Programm!", welcomeBody: "Dein Konto ist aktiv! Hol dir dein Widget im Dashboard.", commissionsNote: "Das Widget l\u00e4sst sich in 2 Minuten integrieren!", tipBody: "Platziere das Widget in Expat-Artikeln. Dort brauchen es deine Leser am meisten!" },
      ru: { subject: "\u0412\u0430\u0448 \u0431\u043b\u043e\u0433 \u0431\u0443\u0434\u0435\u0442 \u0437\u0430\u0440\u0430\u0431\u0430\u0442\u044b\u0432\u0430\u0442\u044c! \ud83d\ude80", subtitle: "\u0412\u0430\u0448 \u0431\u043b\u043e\u0433 \u0441\u0442\u0430\u043d\u0435\u0442 \u043c\u0430\u0448\u0438\u043d\u043e\u0439 \u043a\u043e\u043c\u0438\u0441\u0441\u0438\u0439!", welcomeTitle: "\u2728 \u0414\u043e\u0431\u0440\u043e \u043f\u043e\u0436\u0430\u043b\u043e\u0432\u0430\u0442\u044c!", welcomeBody: "\u0412\u0430\u0448 \u0430\u043a\u043a\u0430\u0443\u043d\u0442 \u0430\u043a\u0442\u0438\u0432\u0435\u043d! \u041f\u043e\u043b\u0443\u0447\u0438\u0442\u0435 \u0432\u0438\u0434\u0436\u0435\u0442 \u0432 \u043f\u0430\u043d\u0435\u043b\u0438.", commissionsNote: "\u0412\u0438\u0434\u0436\u0435\u0442 \u0438\u043d\u0442\u0435\u0433\u0440\u0438\u0440\u0443\u0435\u0442\u0441\u044f \u0437\u0430 2 \u043c\u0438\u043d\u0443\u0442\u044b!", tipBody: "\u0420\u0430\u0437\u043c\u0435\u0441\u0442\u0438\u0442\u0435 \u0432\u0438\u0434\u0436\u0435\u0442 \u0432 \u0441\u0442\u0430\u0442\u044c\u044f\u0445 \u043e\u0431 \u044d\u043a\u0441\u043f\u0430\u0442\u0440\u0438\u0430\u0446\u0438\u0438." },
      ar: { subject: "\u0645\u062f\u0648\u0646\u062a\u0643 \u0633\u062a\u062d\u0642\u0642 \u0623\u0631\u0628\u0627\u062d\u0627! \ud83d\ude80", subtitle: "\u0645\u062f\u0648\u0646\u062a\u0643 \u0633\u062a\u0635\u0628\u062d \u0622\u0644\u0629 \u0639\u0645\u0648\u0644\u0627\u062a!", welcomeTitle: "\u2728 \u0645\u0631\u062d\u0628\u0627 \u0628\u0643!", welcomeBody: "\u062d\u0633\u0627\u0628\u0643 \u0646\u0634\u0637! \u0627\u062d\u0635\u0644 \u0639\u0644\u0649 \u0627\u0644\u0648\u064a\u062c\u062a \u0645\u0646 \u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645.", commissionsNote: "\u0627\u0644\u0648\u064a\u062c\u062a \u064a\u062a\u0643\u0627\u0645\u0644 \u0641\u064a \u062f\u0642\u064a\u0642\u062a\u064a\u0646!", tipBody: "\u0636\u0639 \u0627\u0644\u0648\u064a\u062c\u062a \u0641\u064a \u0645\u0642\u0627\u0644\u0627\u062a\u0643 \u0639\u0646 \u0627\u0644\u0627\u063a\u062a\u0631\u0627\u0628." },
      hi: { subject: "\u0906\u092a\u0915\u093e \u092c\u094d\u0932\u0949\u0917 \u0915\u092e\u093e\u0908 \u0915\u0930\u0947\u0917\u093e! \ud83d\ude80", subtitle: "\u0906\u092a\u0915\u093e \u092c\u094d\u0932\u0949\u0917 \u0915\u092e\u0940\u0936\u0928 \u092e\u0936\u0940\u0928 \u092c\u0928\u0947\u0917\u093e!", welcomeTitle: "\u2728 \u092c\u094d\u0932\u0949\u0917\u0930 \u092a\u094d\u0930\u094b\u0917\u094d\u0930\u093e\u092e \u092e\u0947\u0902 \u0938\u094d\u0935\u093e\u0917\u0924!", welcomeBody: "\u0906\u092a\u0915\u093e \u0916\u093e\u0924\u093e \u0938\u0915\u094d\u0930\u093f\u092f \u0939\u0948! \u0921\u0948\u0936\u092c\u094b\u0930\u094d\u0921 \u0938\u0947 \u0935\u093f\u091c\u0947\u091f \u092a\u094d\u0930\u093e\u092a\u094d\u0924 \u0915\u0930\u0947\u0902\u0964", commissionsNote: "\u0935\u093f\u091c\u0947\u091f 2 \u092e\u093f\u0928\u091f \u092e\u0947\u0902 \u0907\u0902\u091f\u0940\u0917\u094d\u0930\u0947\u091f \u0939\u094b\u0924\u093e \u0939\u0948!", tipBody: "\u0905\u092a\u0928\u0947 \u090f\u0915\u094d\u0938\u092a\u0948\u091f \u0932\u0947\u0916\u094b\u0902 \u092e\u0947\u0902 \u0935\u093f\u091c\u0947\u091f \u0930\u0916\u0947\u0902\u0964" },
      zh: { subject: "\u60a8\u7684\u535a\u5ba2\u5c06\u4ea7\u751f\u6536\u5165\uff01\ud83d\ude80", subtitle: "\u60a8\u7684\u535a\u5ba2\u5c06\u6210\u4e3a\u4f63\u91d1\u673a\u5668\uff01", welcomeTitle: "\u2728 \u6b22\u8fce\u52a0\u5165\u535a\u5ba2\u8ba1\u5212\uff01", welcomeBody: "\u60a8\u7684\u8d26\u6237\u5df2\u6fc0\u6d3b\uff01\u4ece\u63a7\u5236\u9762\u677f\u83b7\u53d6\u60a8\u7684\u5c0f\u7ec4\u4ef6\u3002", commissionsNote: "\u5c0f\u7ec4\u4ef6\u53ea\u9700\u4e24\u5206\u949f\u5373\u53ef\u96c6\u6210\uff01", tipBody: "\u5c06\u5c0f\u7ec4\u4ef6\u653e\u5728\u60a8\u7684\u5916\u7c4d\u6587\u7ae0\u4e2d\u3002" },
    },
    influencer: {
      fr: { subject: "Bienvenue dans la team SOS-Expat ! \ud83d\ude80", subtitle: "Bienvenue dans l'aventure SOS-Expat Influenceurs !", welcomeTitle: "\ud83d\ude80 Tu es officiellement dans la team !", welcomeBody: "Ton compte est actif et pr\u00eat. Ton lien d'affiliation unique est dans ton tableau de bord.", commissionsNote: "Pas de limite, pas de plafond. Plus tu partages, plus \u00e7a tombe !", tipBody: "Partage ton lien dans ta bio, tes stories ou tes publications. Les expatri\u00e9s ont besoin d'aide \u2014 et toi tu as LA solution !" },
      en: { subject: "Welcome to team SOS-Expat! \ud83d\ude80", subtitle: "Welcome to the SOS-Expat Influencers adventure!", welcomeTitle: "\ud83d\ude80 You're officially on the team!", welcomeBody: "Your account is active. Your unique affiliate link is in your dashboard.", commissionsNote: "No limits, no cap. The more you share, the more you earn!", tipBody: "Share your link in your bio, stories or posts. Expats need help \u2014 and you have THE solution!" },
      es: { subject: "\u00a1Bienvenido al equipo SOS-Expat! \ud83d\ude80", subtitle: "\u00a1Bienvenido a la aventura SOS-Expat Influencers!", welcomeTitle: "\ud83d\ude80 \u00a1Est\u00e1s en el equipo!", welcomeBody: "Tu cuenta est\u00e1 activa. Tu enlace est\u00e1 en tu panel.", commissionsNote: "\u00a1Sin l\u00edmites! Cuanto m\u00e1s compartes, m\u00e1s ganas.", tipBody: "Comparte tu enlace en tu bio, stories o publicaciones." },
      pt: { subject: "Bem-vindo \u00e0 equipe SOS-Expat! \ud83d\ude80", subtitle: "Bem-vindo \u00e0 aventura SOS-Expat Influencers!", welcomeTitle: "\ud83d\ude80 Voc\u00ea est\u00e1 na equipe!", welcomeBody: "Sua conta est\u00e1 ativa. Seu link est\u00e1 no painel.", commissionsNote: "Sem limites! Quanto mais compartilha, mais ganha.", tipBody: "Compartilhe seu link na bio, stories ou publica\u00e7\u00f5es." },
      de: { subject: "Willkommen im Team SOS-Expat! \ud83d\ude80", subtitle: "Willkommen beim SOS-Expat Influencer-Abenteuer!", welcomeTitle: "\ud83d\ude80 Du bist offiziell im Team!", welcomeBody: "Dein Konto ist aktiv. Dein Affiliate-Link ist im Dashboard.", commissionsNote: "Keine Grenzen! Je mehr du teilst, desto mehr verdienst du.", tipBody: "Teile deinen Link in deiner Bio, Stories oder Posts." },
      ru: { subject: "\u0414\u043e\u0431\u0440\u043e \u043f\u043e\u0436\u0430\u043b\u043e\u0432\u0430\u0442\u044c \u0432 SOS-Expat! \ud83d\ude80", subtitle: "\u0414\u043e\u0431\u0440\u043e \u043f\u043e\u0436\u0430\u043b\u043e\u0432\u0430\u0442\u044c \u0432 SOS-Expat Influencers!", welcomeTitle: "\ud83d\ude80 \u0412\u044b \u0432 \u043a\u043e\u043c\u0430\u043d\u0434\u0435!", welcomeBody: "\u0412\u0430\u0448 \u0430\u043a\u043a\u0430\u0443\u043d\u0442 \u0430\u043a\u0442\u0438\u0432\u0435\u043d. \u0412\u0430\u0448\u0430 \u0441\u0441\u044b\u043b\u043a\u0430 \u0432 \u043f\u0430\u043d\u0435\u043b\u0438.", commissionsNote: "\u0411\u0435\u0437 \u043e\u0433\u0440\u0430\u043d\u0438\u0447\u0435\u043d\u0438\u0439! \u0427\u0435\u043c \u0431\u043e\u043b\u044c\u0448\u0435 \u0434\u0435\u043b\u0438\u0442\u0435\u0441\u044c, \u0442\u0435\u043c \u0431\u043e\u043b\u044c\u0448\u0435 \u0437\u0430\u0440\u0430\u0431\u0430\u0442\u044b\u0432\u0430\u0435\u0442\u0435.", tipBody: "\u041f\u043e\u0434\u0435\u043b\u0438\u0442\u0435\u0441\u044c \u0441\u0441\u044b\u043b\u043a\u043e\u0439 \u0432 \u0431\u0438\u043e, \u0441\u0442\u043e\u0440\u0438\u0437 \u0438\u043b\u0438 \u043f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u044f\u0445." },
      ar: { subject: "\u0645\u0631\u062d\u0628\u0627 \u0628\u0643 \u0641\u064a SOS-Expat! \ud83d\ude80", subtitle: "\u0645\u0631\u062d\u0628\u0627 \u0628\u0643 \u0641\u064a \u0645\u063a\u0627\u0645\u0631\u0629 SOS-Expat!", welcomeTitle: "\ud83d\ude80 \u0623\u0646\u062a \u0641\u064a \u0627\u0644\u0641\u0631\u064a\u0642!", welcomeBody: "\u062d\u0633\u0627\u0628\u0643 \u0646\u0634\u0637. \u0631\u0627\u0628\u0637\u0643 \u0641\u064a \u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645.", commissionsNote: "\u0628\u062f\u0648\u0646 \u062d\u062f\u0648\u062f! \u0643\u0644\u0645\u0627 \u0634\u0627\u0631\u0643\u062a \u0623\u0643\u062b\u0631\u060c \u0643\u0633\u0628\u062a \u0623\u0643\u062b\u0631.", tipBody: "\u0634\u0627\u0631\u0643 \u0631\u0627\u0628\u0637\u0643 \u0641\u064a \u0627\u0644\u0628\u0627\u064a\u0648 \u0623\u0648 \u0627\u0644\u0633\u062a\u0648\u0631\u064a \u0623\u0648 \u0627\u0644\u0645\u0646\u0634\u0648\u0631\u0627\u062a." },
      hi: { subject: "SOS-Expat \u091f\u0940\u092e \u092e\u0947\u0902 \u0938\u094d\u0935\u093e\u0917\u0924! \ud83d\ude80", subtitle: "SOS-Expat Influencers \u092e\u0947\u0902 \u0938\u094d\u0935\u093e\u0917\u0924!", welcomeTitle: "\ud83d\ude80 \u0906\u092a \u091f\u0940\u092e \u092e\u0947\u0902 \u0939\u0948\u0902!", welcomeBody: "\u0906\u092a\u0915\u093e \u0916\u093e\u0924\u093e \u0938\u0915\u094d\u0930\u093f\u092f \u0939\u0948\u0964 \u0906\u092a\u0915\u093e \u0932\u093f\u0902\u0915 \u0921\u0948\u0936\u092c\u094b\u0930\u094d\u0921 \u092e\u0947\u0902 \u0939\u0948\u0964", commissionsNote: "\u0915\u094b\u0908 \u0938\u0940\u092e\u093e \u0928\u0939\u0940\u0902! \u091c\u093f\u0924\u0928\u093e \u0936\u0947\u092f\u0930 \u0915\u0930\u0947\u0902\u0917\u0947, \u0909\u0924\u0928\u093e \u0915\u092e\u093e\u090f\u0902\u0917\u0947\u0964", tipBody: "\u0905\u092a\u0928\u0940 \u092c\u093e\u092f\u094b, \u0938\u094d\u091f\u094b\u0930\u0940\u091c \u092f\u093e \u092a\u094b\u0938\u094d\u091f\u094d\u0938 \u092e\u0947\u0902 \u0932\u093f\u0902\u0915 \u0936\u0947\u092f\u0930 \u0915\u0930\u0947\u0902\u0964" },
      zh: { subject: "\u6b22\u8fce\u52a0\u5165SOS-Expat\uff01\ud83d\ude80", subtitle: "\u6b22\u8fce\u52a0\u5165SOS-Expat\u7f51\u7ea2\u8ba1\u5212\uff01", welcomeTitle: "\ud83d\ude80 \u60a8\u5df2\u52a0\u5165\u56e2\u961f\uff01", welcomeBody: "\u60a8\u7684\u8d26\u6237\u5df2\u6fc0\u6d3b\u3002\u60a8\u7684\u94fe\u63a5\u5728\u63a7\u5236\u9762\u677f\u4e2d\u3002", commissionsNote: "\u6ca1\u6709\u9650\u5236\uff01\u5206\u4eab\u8d8a\u591a\uff0c\u6536\u5165\u8d8a\u591a\u3002", tipBody: "\u5728\u60a8\u7684\u7b80\u4ecb\u3001\u6545\u4e8b\u6216\u5e16\u5b50\u4e2d\u5206\u4eab\u60a8\u7684\u94fe\u63a5\u3002" },
    },
    groupAdmin: {
      fr: { subject: "Ton groupe va rapporter ! \ud83c\udfc6", subtitle: "Ton groupe va devenir ta source de revenus !", welcomeTitle: "\ud83c\udfc6 Bienvenue dans le programme Group Admin !", welcomeBody: "Ton compte est pr\u00eat ! Tu as maintenant acc\u00e8s \u00e0 ton lien d'affiliation et ton code de recrutement.", commissionsNote: "Plus ton groupe est actif, plus tes revenus sont r\u00e9guliers !", tipBody: "\u00c9pingle ton lien d'affiliation en haut de ton groupe. Quand un membre pose une question juridique, recommande SOS-Expat !" },
      en: { subject: "Your group is going to earn! \ud83c\udfc6", subtitle: "Your group is about to become your income source!", welcomeTitle: "\ud83c\udfc6 Welcome to the Group Admin program!", welcomeBody: "Your account is ready! You now have access to your affiliate link and recruitment code.", commissionsNote: "The more active your group, the more consistent your earnings!", tipBody: "Pin your affiliate link at the top of your group. When a member asks a legal question, recommend SOS-Expat!" },
      es: { subject: "\u00a1Tu grupo va a generar ingresos! \ud83c\udfc6", subtitle: "\u00a1Tu grupo se convertir\u00e1 en tu fuente de ingresos!", welcomeTitle: "\ud83c\udfc6 \u00a1Bienvenido al programa Group Admin!", welcomeBody: "Tu cuenta est\u00e1 lista. Ya tienes tu enlace y c\u00f3digo de reclutamiento.", commissionsNote: "\u00a1Cuanto m\u00e1s activo tu grupo, m\u00e1s consistentes tus ingresos!", tipBody: "Fija tu enlace en la parte superior de tu grupo." },
      pt: { subject: "Seu grupo vai gerar renda! \ud83c\udfc6", subtitle: "Seu grupo vai virar sua fonte de renda!", welcomeTitle: "\ud83c\udfc6 Bem-vindo ao programa Group Admin!", welcomeBody: "Sua conta est\u00e1 pronta. Voc\u00ea tem acesso ao seu link e c\u00f3digo.", commissionsNote: "Quanto mais ativo o grupo, mais consistentes os ganhos!", tipBody: "Fixe seu link no topo do grupo." },
      de: { subject: "Deine Gruppe wird verdienen! \ud83c\udfc6", subtitle: "Deine Gruppe wird zur Einkommensquelle!", welcomeTitle: "\ud83c\udfc6 Willkommen beim Group Admin-Programm!", welcomeBody: "Dein Konto ist bereit! Du hast jetzt Zugang zu deinem Link und Code.", commissionsNote: "Je aktiver deine Gruppe, desto stabiler deine Einnahmen!", tipBody: "Pinne deinen Affiliate-Link oben in deiner Gruppe." },
      ru: { subject: "\u0412\u0430\u0448\u0430 \u0433\u0440\u0443\u043f\u043f\u0430 \u0431\u0443\u0434\u0435\u0442 \u0437\u0430\u0440\u0430\u0431\u0430\u0442\u044b\u0432\u0430\u0442\u044c! \ud83c\udfc6", subtitle: "\u0412\u0430\u0448\u0430 \u0433\u0440\u0443\u043f\u043f\u0430 \u2014 \u0432\u0430\u0448 \u0438\u0441\u0442\u043e\u0447\u043d\u0438\u043a \u0434\u043e\u0445\u043e\u0434\u0430!", welcomeTitle: "\ud83c\udfc6 \u0414\u043e\u0431\u0440\u043e \u043f\u043e\u0436\u0430\u043b\u043e\u0432\u0430\u0442\u044c!", welcomeBody: "\u0412\u0430\u0448 \u0430\u043a\u043a\u0430\u0443\u043d\u0442 \u0433\u043e\u0442\u043e\u0432! \u0412\u0430\u0448\u0430 \u0441\u0441\u044b\u043b\u043a\u0430 \u0438 \u043a\u043e\u0434 \u0432 \u043f\u0430\u043d\u0435\u043b\u0438.", commissionsNote: "\u0427\u0435\u043c \u0430\u043a\u0442\u0438\u0432\u043d\u0435\u0435 \u0433\u0440\u0443\u043f\u043f\u0430, \u0442\u0435\u043c \u0441\u0442\u0430\u0431\u0438\u043b\u044c\u043d\u0435\u0435 \u0434\u043e\u0445\u043e\u0434!", tipBody: "\u0417\u0430\u043a\u0440\u0435\u043f\u0438\u0442\u0435 \u0441\u0441\u044b\u043b\u043a\u0443 \u0432\u0432\u0435\u0440\u0445\u0443 \u0433\u0440\u0443\u043f\u043f\u044b." },
      ar: { subject: "\u0645\u062c\u0645\u0648\u0639\u062a\u0643 \u0633\u062a\u062d\u0642\u0642 \u0623\u0631\u0628\u0627\u062d\u0627! \ud83c\udfc6", subtitle: "\u0645\u062c\u0645\u0648\u0639\u062a\u0643 \u0633\u062a\u0635\u0628\u062d \u0645\u0635\u062f\u0631 \u062f\u062e\u0644\u0643!", welcomeTitle: "\ud83c\udfc6 \u0645\u0631\u062d\u0628\u0627 \u0628\u0643!", welcomeBody: "\u062d\u0633\u0627\u0628\u0643 \u062c\u0627\u0647\u0632! \u0631\u0627\u0628\u0637\u0643 \u0648\u0643\u0648\u062f\u0643 \u0641\u064a \u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645.", commissionsNote: "\u0643\u0644\u0645\u0627 \u0643\u0627\u0646\u062a \u0645\u062c\u0645\u0648\u0639\u062a\u0643 \u0623\u0643\u062b\u0631 \u0646\u0634\u0627\u0637\u0627\u064b\u060c \u0632\u0627\u062f \u062f\u062e\u0644\u0643!", tipBody: "\u062b\u0628\u062a \u0631\u0627\u0628\u0637\u0643 \u0641\u064a \u0623\u0639\u0644\u0649 \u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0629." },
      hi: { subject: "\u0906\u092a\u0915\u093e \u0917\u094d\u0930\u0941\u092a \u0915\u092e\u093e\u0908 \u0915\u0930\u0947\u0917\u093e! \ud83c\udfc6", subtitle: "\u0906\u092a\u0915\u093e \u0917\u094d\u0930\u0941\u092a \u0906\u092a\u0915\u0940 \u0906\u092f \u0915\u093e \u0938\u094d\u0930\u094b\u0924 \u092c\u0928\u0947\u0917\u093e!", welcomeTitle: "\ud83c\udfc6 Group Admin \u092a\u094d\u0930\u094b\u0917\u094d\u0930\u093e\u092e \u092e\u0947\u0902 \u0938\u094d\u0935\u093e\u0917\u0924!", welcomeBody: "\u0906\u092a\u0915\u093e \u0916\u093e\u0924\u093e \u0924\u0948\u092f\u093e\u0930 \u0939\u0948! \u0906\u092a\u0915\u093e \u0932\u093f\u0902\u0915 \u0914\u0930 \u0915\u094b\u0921 \u0921\u0948\u0936\u092c\u094b\u0930\u094d\u0921 \u092e\u0947\u0902 \u0939\u0948\u0964", commissionsNote: "\u0917\u094d\u0930\u0941\u092a \u091c\u093f\u0924\u0928\u093e \u0938\u0915\u094d\u0930\u093f\u092f, \u0906\u092f \u0909\u0924\u0928\u0940 \u0938\u094d\u0925\u093f\u0930!", tipBody: "\u0905\u092a\u0928\u093e \u0932\u093f\u0902\u0915 \u0917\u094d\u0930\u0941\u092a \u0915\u0947 \u0936\u0940\u0930\u094d\u0937 \u092a\u0930 \u092a\u093f\u0928 \u0915\u0930\u0947\u0902\u0964" },
      zh: { subject: "\u60a8\u7684\u7fa4\u7ec4\u5c06\u4ea7\u751f\u6536\u5165\uff01\ud83c\udfc6", subtitle: "\u60a8\u7684\u7fa4\u7ec4\u5c06\u6210\u4e3a\u6536\u5165\u6765\u6e90\uff01", welcomeTitle: "\ud83c\udfc6 \u6b22\u8fce\u52a0\u5165\u7fa4\u7ec4\u7ba1\u7406\u5458\u8ba1\u5212\uff01", welcomeBody: "\u60a8\u7684\u8d26\u6237\u5df2\u51c6\u5907\u5c31\u7eea\uff01\u60a8\u7684\u94fe\u63a5\u548c\u4ee3\u7801\u5728\u63a7\u5236\u9762\u677f\u4e2d\u3002", commissionsNote: "\u7fa4\u7ec4\u8d8a\u6d3b\u8dc3\uff0c\u6536\u5165\u8d8a\u7a33\u5b9a\uff01", tipBody: "\u5c06\u60a8\u7684\u94fe\u63a5\u7f6e\u9876\u5230\u7fa4\u7ec4\u9876\u90e8\u3002" },
    },
  };

  const base = t[lang] || t.fr;
  const roleText = roleTexts[role]?.[lang] || roleTexts[role].fr;
  const commissions = commissionMap[role]?.[lang] || commissionMap[role].fr;

  return {
    ...base,
    subject: roleText.subject,
    subtitle: roleText.subtitle,
    welcomeTitle: roleText.welcomeTitle,
    welcomeBody: roleText.welcomeBody,
    commissions,
    commissionsNote: roleText.commissionsNote,
    tipTitle: base.tipTitle,
    tipBody: roleText.tipBody,
  };
}

// ---------------------------------------------------------------------------
// HTML Generator
// ---------------------------------------------------------------------------

export function generateWelcomeEmail(
  role: Role,
  firstName: string,
  language: string
): { subject: string; html: string; text: string } {
  const raw = language?.toLowerCase().slice(0, 2) || "fr";
  const lang = (raw === "ch" ? "zh" : raw) as Lang;
  const cfg = ROLE_CONFIGS[role];
  const t = getTranslations(role, lang, firstName);
  const year = new Date().getFullYear();

  const commissionsHtml = t.commissions
    .map((c) => `<li>${c}</li>`)
    .join("\n            ");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.subject}</title>
</head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;">
  <div style="text-align:center;margin-bottom:30px;">
    <h1 style="color:${cfg.color};margin-bottom:10px;">${t.greeting}</h1>
    <p style="font-size:18px;color:#666;">${t.subtitle}</p>
  </div>

  <div style="background:linear-gradient(135deg,${cfg.gradientFrom} 0%,${cfg.gradientTo} 100%);color:white;padding:25px;border-radius:12px;margin-bottom:25px;">
    <h2 style="margin-top:0;">${t.welcomeTitle}</h2>
    <p>${t.welcomeBody}</p>
    <div style="text-align:center;margin-top:20px;">
      <a href="${cfg.dashboardUrl}" style="display:inline-block;background:white;color:${cfg.color};padding:12px 30px;border-radius:8px;text-decoration:none;font-weight:bold;">${t.ctaLabel}</a>
    </div>
  </div>

  <div style="background:${cfg.bgLight};padding:20px;border-radius:12px;margin-bottom:25px;">
    <h3 style="color:${cfg.color};margin-top:0;">${t.commissionsTitle}</h3>
    <ul style="padding-left:20px;">
            ${commissionsHtml}
    </ul>
    <p style="margin-bottom:0;font-style:italic;">${t.commissionsNote}</p>
  </div>

  <div style="background:#FEF3C7;padding:20px;border-radius:12px;margin-bottom:25px;">
    <h3 style="color:#92400E;margin-top:0;">${t.tipTitle}</h3>
    <p style="margin-bottom:0;">${t.tipBody}</p>
  </div>

  <div style="text-align:center;margin-top:30px;padding-top:20px;border-top:1px solid #E5E7EB;">
    <p style="color:#999;font-size:12px;">\u00a9 ${year} SOS-Expat \u2014 WorldExpat O\u00dc</p>
  </div>
</body>
</html>`;

  const commissionsText = t.commissions
    .map((c) => `- ${c.replace(/<[^>]+>/g, "")}`)
    .join("\n");

  const text = `${t.greeting}

${t.subtitle}

${t.welcomeTitle}
${t.welcomeBody}

${cfg.dashboardUrl}

${t.commissionsTitle}
${commissionsText}
${t.commissionsNote}

${t.tipTitle}
${t.tipBody}

\u00a9 ${year} SOS-Expat \u2014 WorldExpat O\u00dc`;

  return { subject: t.subject, html, text };
}
