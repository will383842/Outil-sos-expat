#!/usr/bin/env node
/**
 * Script pour ajouter les 41 traductions Chatter restantes
 * Usage: node add-remaining-chatter-translations.cjs
 */

const fs = require('fs');
const path = require('path');

const helperDir = path.join(__dirname, '..', 'src', 'helper');
const languages = ['fr', 'en', 'es', 'de', 'ru', 'pt', 'ch', 'hi', 'ar'];

// Les 41 traductions manquantes restantes
const remainingTranslations = {
  "chatter.content.blog": {
    fr: "Rédigez des articles de blog pour référencer SOS-Expat et gagnez jusqu'à 150$ par article approuvé.",
    en: "Write blog articles to reference SOS-Expat and earn up to $150 per approved article.",
    es: "Escribe artículos de blog para referenciar SOS-Expat y gana hasta $150 por artículo aprobado.",
    de: "Verfassen Sie Blog-Artikel, um SOS-Expat zu erwähnen und verdienen Sie bis zu 150$ pro genehmigtem Artikel.",
    ru: "Пишите статьи в блог, ссылаясь на SOS-Expat, и зарабатывайте до $150 за одобренную статью.",
    pt: "Escreva artigos de blog para referenciar SOS-Expat e ganhe até $150 por artigo aprovado.",
    ch: "撰写博客文章推荐 SOS-Expat，每篇获批文章可赚取高达 150 美元。",
    hi: "SOS-Expat को संदर्भित करने के लिए ब्लॉग लेख लिखें और प्रति स्वीकृत लेख $150 तक कमाएं।",
    ar: "اكتب مقالات مدونة للإشارة إلى SOS-Expat واكسب ما يصل إلى 150 دولارًا لكل مقالة معتمدة."
  },
  "chatter.content.blog.name": {
    fr: "Blog",
    en: "Blog",
    es: "Blog",
    de: "Blog",
    ru: "Блог",
    pt: "Blog",
    ch: "博客",
    hi: "ब्लॉग",
    ar: "مدونة"
  },
  "chatter.content.instagram": {
    fr: "Partagez des stories ou posts Instagram avec votre lien et gagnez 50$ par publication approuvée.",
    en: "Share Instagram stories or posts with your link and earn $50 per approved publication.",
    es: "Comparte historias o publicaciones de Instagram con tu enlace y gana $50 por publicación aprobada.",
    de: "Teilen Sie Instagram-Stories oder -Posts mit Ihrem Link und verdienen Sie 50$ pro genehmigter Veröffentlichung.",
    ru: "Делитесь историями или постами в Instagram со своей ссылкой и зарабатывайте $50 за одобренную публикацию.",
    pt: "Compartilhe stories ou posts no Instagram com seu link e ganhe $50 por publicação aprovada.",
    ch: "在 Instagram 上分享故事或帖子并附上您的链接，每个获批发布可赚取 50 美元。",
    hi: "अपने लिंक के साथ Instagram स्टोरी या पोस्ट शेयर करें और प्रति स्वीकृत प्रकाशन $50 कमाएं।",
    ar: "شارك قصص أو منشورات Instagram مع رابطك واكسب 50 دولارًا لكل منشور معتمد."
  },
  "chatter.content.note": {
    fr: "Toutes les publications sont vérifiées avant validation des gains.",
    en: "All publications are verified before earnings validation.",
    es: "Todas las publicaciones se verifican antes de validar las ganancias.",
    de: "Alle Veröffentlichungen werden vor der Bestätigung der Einnahmen überprüft.",
    ru: "Все публикации проверяются перед подтверждением заработка.",
    pt: "Todas as publicações são verificadas antes da validação dos ganhos.",
    ch: "所有发布在收益验证前都会经过审核。",
    hi: "कमाई सत्यापन से पहले सभी प्रकाशनों की जांच की जाती है।",
    ar: "يتم التحقق من جميع المنشورات قبل التحقق من الأرباح."
  },
  "chatter.content.subtitle": {
    fr: "Gagnez de l'argent en créant du contenu sur les réseaux sociaux",
    en: "Earn money by creating content on social media",
    es: "Gana dinero creando contenido en redes sociales",
    de: "Verdienen Sie Geld durch Erstellen von Inhalten in sozialen Medien",
    ru: "Зарабатывайте деньги, создавая контент в социальных сетях",
    pt: "Ganhe dinheiro criando conteúdo nas redes sociais",
    ch: "通过在社交媒体上创建内容赚钱",
    hi: "सोशल मीडिया पर सामग्री बनाकर पैसे कमाएं",
    ar: "اكسب المال من خلال إنشاء محتوى على وسائل التواصل الاجتماعي"
  },
  "chatter.content.tiktok": {
    fr: "Créez des vidéos TikTok mentionnant SOS-Expat et gagnez 75$ par vidéo approuvée.",
    en: "Create TikTok videos mentioning SOS-Expat and earn $75 per approved video.",
    es: "Crea videos de TikTok mencionando SOS-Expat y gana $75 por video aprobado.",
    de: "Erstellen Sie TikTok-Videos, die SOS-Expat erwähnen, und verdienen Sie 75$ pro genehmigtem Video.",
    ru: "Создавайте видео TikTok с упоминанием SOS-Expat и зарабатывайте $75 за одобренное видео.",
    pt: "Crie vídeos TikTok mencionando SOS-Expat e ganhe $75 por vídeo aprovado.",
    ch: "创建提及 SOS-Expat 的 TikTok 视频，每个获批视频可赚取 75 美元。",
    hi: "SOS-Expat का उल्लेख करते हुए TikTok वीडियो बनाएं और प्रति स्वीकृत वीडियो $75 कमाएं।",
    ar: "أنشئ مقاطع فيديو TikTok تذكر SOS-Expat واكسب 75 دولارًا لكل فيديو معتمد."
  },
  "chatter.content.title": {
    fr: "Gagnez avec du Contenu",
    en: "Earn with Content",
    es: "Gana con Contenido",
    de: "Verdienen Sie mit Inhalten",
    ru: "Зарабатывайте с контентом",
    pt: "Ganhe com Conteúdo",
    ch: "通过内容赚钱",
    hi: "सामग्री के साथ कमाएं",
    ar: "اكسب من خلال المحتوى"
  },
  "chatter.content.youtube": {
    fr: "Publiez des vidéos YouTube avec votre lien d'affiliation et gagnez 100$ par vidéo approuvée.",
    en: "Publish YouTube videos with your affiliate link and earn $100 per approved video.",
    es: "Publica videos de YouTube con tu enlace de afiliado y gana $100 por video aprobado.",
    de: "Veröffentlichen Sie YouTube-Videos mit Ihrem Affiliate-Link und verdienen Sie 100$ pro genehmigtem Video.",
    ru: "Публикуйте видео на YouTube со своей партнерской ссылкой и зарабатывайте $100 за одобренное видео.",
    pt: "Publique vídeos no YouTube com seu link de afiliado e ganhe $100 por vídeo aprovado.",
    ch: "发布带有您联盟链接的 YouTube 视频，每个获批视频可赚取 100 美元。",
    hi: "अपने संबद्ध लिंक के साथ YouTube वीडियो प्रकाशित करें और प्रति स्वीकृत वीडियो $100 कमाएं।",
    ar: "انشر مقاطع فيديو YouTube مع رابط الإحالة الخاص بك واكسب 100 دولار لكل فيديو معتمد."
  },
  "chatter.createdAt": {
    fr: "Date d'inscription",
    en: "Registration date",
    es: "Fecha de registro",
    de: "Registrierungsdatum",
    ru: "Дата регистрации",
    pt: "Data de registro",
    ch: "注册日期",
    hi: "पंजीकरण तिथि",
    ar: "تاريخ التسجيل"
  },
  "chatter.currentMonthRank": {
    fr: "Classement du mois",
    en: "Month ranking",
    es: "Clasificación del mes",
    de: "Monats-Rangliste",
    ru: "Рейтинг месяца",
    pt: "Classificação do mês",
    ch: "月度排名",
    hi: "महीने की रैंकिंग",
    ar: "تصنيف الشهر"
  },
  "chatter.currentStreak": {
    fr: "Série actuelle",
    en: "Current streak",
    es: "Racha actual",
    de: "Aktuelle Serie",
    ru: "Текущая серия",
    pt: "Sequência atual",
    ch: "当前连胜",
    hi: "वर्तमान स्ट्रीक",
    ar: "السلسلة الحالية"
  },
  "chatter.dashboard.startSharing": {
    fr: "Commencer à partager",
    en: "Start sharing",
    es: "Comenzar a compartir",
    de: "Beginnen Sie zu teilen",
    ru: "Начать делиться",
    pt: "Começar a compartilhar",
    ch: "开始分享",
    hi: "शेयर करना शुरू करें",
    ar: "ابدأ المشاركة"
  },
  "chatter.dashboard.startSharing.aria": {
    fr: "Commencez à partager vos liens d'affiliation",
    en: "Start sharing your affiliate links",
    es: "Comienza a compartir tus enlaces de afiliado",
    de: "Beginnen Sie, Ihre Affiliate-Links zu teilen",
    ru: "Начните делиться своими партнерскими ссылками",
    pt: "Comece a compartilhar seus links de afiliado",
    ch: "开始分享您的联盟链接",
    hi: "अपने संबद्ध लिंक साझा करना शुरू करें",
    ar: "ابدأ بمشاركة روابط الإحالة الخاصة بك"
  },
  "chatter.dashboard.viewAllCommissions": {
    fr: "Voir toutes mes commissions",
    en: "View all my commissions",
    es: "Ver todas mis comisiones",
    de: "Alle meine Provisionen anzeigen",
    ru: "Посмотреть все мои комиссии",
    pt: "Ver todas as minhas comissões",
    ch: "查看我的所有佣金",
    hi: "मेरे सभी कमीशन देखें",
    ar: "عرض جميع عمولاتي"
  },
  "chatter.firstName": {
    fr: "Prénom",
    en: "First name",
    es: "Nombre",
    de: "Vorname",
    ru: "Имя",
    pt: "Nome",
    ch: "名字",
    hi: "पहला नाम",
    ar: "الاسم الأول"
  },
  "chatter.hero.become": {
    fr: "Devenez Chatter SOS-Expat",
    en: "Become a SOS-Expat Chatter",
    es: "Conviértete en Chatter de SOS-Expat",
    de: "Werden Sie SOS-Expat Chatter",
    ru: "Станьте Chatter SOS-Expat",
    pt: "Torne-se um Chatter SOS-Expat",
    ch: "成为 SOS-Expat Chatter",
    hi: "SOS-Expat Chatter बनें",
    ar: "كن Chatter في SOS-Expat"
  },
  "chatter.hero.become.sub": {
    fr: "Gagnez de l'argent en partageant nos services",
    en: "Earn money by sharing our services",
    es: "Gana dinero compartiendo nuestros servicios",
    de: "Verdienen Sie Geld durch Teilen unserer Dienste",
    ru: "Зарабатывайте деньги, делясь нашими услугами",
    pt: "Ganhe dinheiro compartilhando nossos serviços",
    ch: "通过分享我们的服务赚钱",
    hi: "हमारी सेवाओं को साझा करके पैसे कमाएं",
    ar: "اكسب المال من خلال مشاركة خدماتنا"
  },
  "chatter.id": {
    fr: "ID",
    en: "ID",
    es: "ID",
    de: "ID",
    ru: "ID",
    pt: "ID",
    ch: "ID",
    hi: "ID",
    ar: "المعرّف"
  },
  "chatter.insights.title": {
    fr: "Statistiques",
    en: "Insights",
    es: "Estadísticas",
    de: "Statistiken",
    ru: "Статистика",
    pt: "Estatísticas",
    ch: "统计信息",
    hi: "आंकड़े",
    ar: "الإحصائيات"
  },
  "chatter.landing.seo.ogDescription": {
    fr: "Gagnez de l'argent en partageant SOS-Expat avec votre réseau. Commissions attractives, revenus passifs d'équipe et bonus mensuels.",
    en: "Earn money by sharing SOS-Expat with your network. Attractive commissions, passive team income and monthly bonuses.",
    es: "Gana dinero compartiendo SOS-Expat con tu red. Comisiones atractivas, ingresos pasivos de equipo y bonos mensuales.",
    de: "Verdienen Sie Geld, indem Sie SOS-Expat mit Ihrem Netzwerk teilen. Attraktive Provisionen, passives Team-Einkommen und monatliche Boni.",
    ru: "Зарабатывайте деньги, делясь SOS-Expat со своей сетью. Привлекательные комиссии, пассивный доход от команды и ежемесячные бонусы.",
    pt: "Ganhe dinheiro compartilhando SOS-Expat com sua rede. Comissões atraentes, renda passiva da equipe e bônus mensais.",
    ch: "通过与您的网络分享 SOS-Expat 赚钱。诱人的佣金、团队被动收入和每月奖金。",
    hi: "अपने नेटवर्क के साथ SOS-Expat साझा करके पैसे कमाएं। आकर्षक कमीशन, टीम निष्क्रिय आय और मासिक बोनस।",
    ar: "اكسب المال من خلال مشاركة SOS-Expat مع شبكتك. عمولات جذابة ودخل سلبي من الفريق ومكافآت شهرية."
  },
  "chatter.leaderboard.bonus.top1": {
    fr: "1er place : 500$",
    en: "1st place: $500",
    es: "1er lugar: $500",
    de: "1. Platz: 500$",
    ru: "1-е место: $500",
    pt: "1º lugar: $500",
    ch: "第一名：500 美元",
    hi: "पहला स्थान: $500",
    ar: "المركز الأول: 500 دولار"
  },
  "chatter.leaderboard.bonus.top2": {
    fr: "2ème place : 300$",
    en: "2nd place: $300",
    es: "2º lugar: $300",
    de: "2. Platz: 300$",
    ru: "2-е место: $300",
    pt: "2º lugar: $300",
    ch: "第二名：300 美元",
    hi: "दूसरा स्थान: $300",
    ar: "المركز الثاني: 300 دولار"
  },
  "chatter.leaderboard.bonus.top3": {
    fr: "3ème place : 200$",
    en: "3rd place: $200",
    es: "3er lugar: $200",
    de: "3. Platz: 200$",
    ru: "3-е место: $200",
    pt: "3º lugar: $200",
    ch: "第三名：200 美元",
    hi: "तीसरा स्थान: $200",
    ar: "المركز الثالث: 200 دولار"
  },
  "chatter.leaderboard.bonusEligible": {
    fr: "Éligible au bonus",
    en: "Eligible for bonus",
    es: "Elegible para bono",
    de: "Berechtigt für Bonus",
    ru: "Право на бонус",
    pt: "Elegível para bônus",
    ch: "有资格获得奖金",
    hi: "बोनस के लिए पात्र",
    ar: "مؤهل للمكافأة"
  },
  "chatter.leaderboard.bonusTitle": {
    fr: "Bonus mensuels",
    en: "Monthly bonuses",
    es: "Bonos mensuales",
    de: "Monatliche Boni",
    ru: "Ежемесячные бонусы",
    pt: "Bônus mensais",
    ch: "每月奖金",
    hi: "मासिक बोनस",
    ar: "مكافآت شهرية"
  },
  "chatter.leaderboard.daysRemaining": {
    fr: "{count} jours restants",
    en: "{count} days remaining",
    es: "{count} días restantes",
    de: "{count} Tage verbleibend",
    ru: "Осталось {count} дней",
    pt: "{count} dias restantes",
    ch: "剩余 {count} 天",
    hi: "{count} दिन शेष",
    ar: "{count} أيام متبقية"
  },
  "chatter.leaderboard.monthlyReset": {
    fr: "Réinitialisation mensuelle",
    en: "Monthly reset",
    es: "Reinicio mensual",
    de: "Monatliche Zurücksetzung",
    ru: "Ежемесячный сброс",
    pt: "Reinicialização mensal",
    ch: "每月重置",
    hi: "मासिक रीसेट",
    ar: "إعادة تعيين شهرية"
  },
  "chatter.leaderboard.monthlyResetDesc": {
    fr: "Le classement est réinitialisé chaque mois",
    en: "Rankings are reset every month",
    es: "Las clasificaciones se reinician cada mes",
    de: "Rankings werden jeden Monat zurückgesetzt",
    ru: "Рейтинги сбрасываются каждый месяц",
    pt: "As classificações são reiniciadas todo mês",
    ch: "排名每月重置",
    hi: "रैंकिंग हर महीने रीसेट होती है",
    ar: "يتم إعادة تعيين التصنيفات كل شهر"
  },
  "chatter.leaderboard.motivational": {
    fr: "Montez dans le classement !",
    en: "Climb the rankings!",
    es: "¡Sube en la clasificación!",
    de: "Steigen Sie in der Rangliste auf!",
    ru: "Поднимайтесь в рейтинге!",
    pt: "Suba na classificação!",
    ch: "攀登排名！",
    hi: "रैंकिंग में चढ़ें!",
    ar: "اصعد في التصنيفات!"
  },
  "chatter.leaderboard.motivationalSub": {
    fr: "Plus vous partagez, plus vous gagnez",
    en: "The more you share, the more you earn",
    es: "Cuanto más compartes, más ganas",
    de: "Je mehr Sie teilen, desto mehr verdienen Sie",
    ru: "Чем больше делитесь, тем больше зарабатываете",
    pt: "Quanto mais você compartilha, mais você ganha",
    ch: "分享越多，赚得越多",
    hi: "आप जितना अधिक साझा करते हैं, उतना अधिक कमाते हैं",
    ar: "كلما شاركت أكثر، كلما ربحت أكثر"
  },
  "chatter.leaderboard.otherRankings": {
    fr: "Autres classements",
    en: "Other rankings",
    es: "Otras clasificaciones",
    de: "Andere Rankings",
    ru: "Другие рейтинги",
    pt: "Outras classificações",
    ch: "其他排名",
    hi: "अन्य रैंकिंग",
    ar: "تصنيفات أخرى"
  },
  "chatter.leaderboard.outOf": {
    fr: "sur {total}",
    en: "out of {total}",
    es: "de {total}",
    de: "von {total}",
    ru: "из {total}",
    pt: "de {total}",
    ch: "共 {total}",
    hi: "{total} में से",
    ar: "من أصل {total}"
  },
  "chatter.leaderboard.previousWinners": {
    fr: "Gagnants précédents",
    en: "Previous winners",
    es: "Ganadores anteriores",
    de: "Frühere Gewinner",
    ru: "Предыдущие победители",
    pt: "Vencedores anteriores",
    ch: "以前的获胜者",
    hi: "पिछले विजेता",
    ar: "الفائزون السابقون"
  },
  "chatter.leaderboard.resetInfo": {
    fr: "Le classement se réinitialise le 1er de chaque mois",
    en: "Rankings reset on the 1st of each month",
    es: "Las clasificaciones se reinician el 1 de cada mes",
    de: "Rankings werden am 1. jedes Monats zurückgesetzt",
    ru: "Рейтинги сбрасываются 1-го числа каждого месяца",
    pt: "As classificações são reiniciadas no dia 1 de cada mês",
    ch: "排名在每月 1 日重置",
    hi: "रैंकिंग हर महीने की 1 तारीख को रीसेट होती है",
    ar: "يتم إعادة تعيين التصنيفات في الأول من كل شهر"
  },
  "chatter.leaderboard.teamCalls": {
    fr: "Appels d'équipe",
    en: "Team calls",
    es: "Llamadas de equipo",
    de: "Team-Anrufe",
    ru: "Командные звонки",
    pt: "Chamadas da equipe",
    ch: "团队通话",
    hi: "टीम कॉल",
    ar: "مكالمات الفريق"
  },
  "chatter.leaderboard.teamCompetition": {
    fr: "Compétition d'équipe",
    en: "Team competition",
    es: "Competencia de equipo",
    de: "Team-Wettbewerb",
    ru: "Командное соревнование",
    pt: "Competição de equipe",
    ch: "团队竞赛",
    hi: "टीम प्रतियोगिता",
    ar: "منافسة الفريق"
  },
  "chatter.leaderboard.teamCompetitionDesc": {
    fr: "Classement basé sur les appels générés par votre équipe",
    en: "Rankings based on calls generated by your team",
    es: "Clasificación basada en llamadas generadas por tu equipo",
    de: "Rankings basierend auf von Ihrem Team generierten Anrufen",
    ru: "Рейтинг на основе звонков, созданных вашей командой",
    pt: "Classificação baseada em chamadas geradas por sua equipe",
    ch: "根据您的团队生成的通话进行排名",
    hi: "आपकी टीम द्वारा उत्पन्न कॉल के आधार पर रैंकिंग",
    ar: "التصنيفات بناءً على المكالمات التي أنشأها فريقك"
  },
  "chatter.leaderboard.top3congrats": {
    fr: "Félicitations ! Vous êtes dans le Top 3",
    en: "Congratulations! You're in the Top 3",
    es: "¡Felicitaciones! Estás en el Top 3",
    de: "Herzlichen Glückwunsch! Sie sind in den Top 3",
    ru: "Поздравляем! Вы в Топ-3",
    pt: "Parabéns! Você está no Top 3",
    ch: "恭喜！您进入了前 3 名",
    hi: "बधाई हो! आप शीर्ष 3 में हैं",
    ar: "تهانينا! أنت ضمن أفضل 3"
  },
  "chatter.leaderboard.viewIndividual": {
    fr: "Voir classement individuel",
    en: "View individual ranking",
    es: "Ver clasificación individual",
    de: "Individuelle Rangliste anzeigen",
    ru: "Посмотреть индивидуальный рейтинг",
    pt: "Ver classificação individual",
    ch: "查看个人排名",
    hi: "व्यक्तिगत रैंकिंग देखें",
    ar: "عرض التصنيف الفردي"
  },
  "chatter.leaderboard.viewTeam": {
    fr: "Voir classement d'équipe",
    en: "View team ranking",
    es: "Ver clasificación de equipo",
    de: "Team-Rangliste anzeigen",
    ru: "Посмотреть командный рейтинг",
    pt: "Ver classificação da equipe",
    ch: "查看团队排名",
    hi: "टीम रैंकिंग देखें",
    ar: "عرض تصنيف الفريق"
  },
  "chatter.level": {
    fr: "Niveau",
    en: "Level",
    es: "Nivel",
    de: "Level",
    ru: "Уровень",
    pt: "Nível",
    ch: "等级",
    hi: "स्तर",
    ar: "المستوى"
  }
};

console.log('🚀 Ajout des 41 traductions Chatter restantes...\n');

function loadJSON(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(content);
}

function saveJSON(filePath, data) {
  const sorted = Object.keys(data).sort().reduce((acc, key) => {
    acc[key] = data[key];
    return acc;
  }, {});
  fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
}

let totalAdded = 0;

languages.forEach(lang => {
  const filePath = path.join(helperDir, `${lang}.json`);
  const langData = loadJSON(filePath);
  let added = 0;

  Object.keys(remainingTranslations).forEach(key => {
    if (!langData[key] && remainingTranslations[key][lang]) {
      langData[key] = remainingTranslations[key][lang];
      added++;
      totalAdded++;
    }
  });

  saveJSON(filePath, langData);
  console.log(`✅ ${lang.toUpperCase()}: ${added} traductions ajoutées`);
});

console.log(`\n✨ Total: ${totalAdded} traductions ajoutées avec succès !`);
