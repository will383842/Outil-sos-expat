/**
 * Add Blogger-to-Blogger Recruitment Translations
 *
 * Adds all necessary translation keys for the new blogger recruitment feature
 * across all 9 supported languages (fr, en, es, de, pt, ru, ch, hi, ar)
 */

const fs = require('fs');
const path = require('path');

const TRANSLATIONS = {
  fr: {
    'blogger.menu.bloggerRecruitment': 'Parrainage blogueurs',
    'blogger.bloggerRecruitment.title': 'Parrainez des Blogueurs',
    'blogger.bloggerRecruitment.subtitle': 'Gagnez $50 quand vos filleuls atteignent $200 de commissions',
    'blogger.bloggerRecruitment.howItWorks.title': 'Comment ça marche ?',
    'blogger.bloggerRecruitment.howItWorks.step1': 'Partagez votre lien de parrainage avec d\'autres blogueurs',
    'blogger.bloggerRecruitment.howItWorks.step2': 'Quand ils s\'inscrivent avec votre lien, ils deviennent vos filleuls',
    'blogger.bloggerRecruitment.howItWorks.step3': 'Dès qu\'un filleul atteint $200 en commissions directes (clients référés), vous recevez un bonus de $50 !',
    'blogger.bloggerRecruitment.howItWorks.note': 'Seules les commissions directes (clients référés par le blogueur filleul) comptent pour atteindre le seuil de $200. Le bonus de $50 est payé une seule fois par filleul.',
    'blogger.bloggerRecruitment.linkTitle': 'Votre lien de parrainage',
    'blogger.bloggerRecruitment.stats.total': 'Total filleuls',
    'blogger.bloggerRecruitment.stats.active': 'Actifs (6 mois)',
    'blogger.bloggerRecruitment.stats.bonusesPaid': 'Bonus payés',
    'blogger.bloggerRecruitment.stats.totalEarned': 'Total gagné',
    'blogger.bloggerRecruitment.table.blogger': 'Blogueur',
    'blogger.bloggerRecruitment.table.joined': 'Inscrit le',
    'blogger.bloggerRecruitment.table.progress': 'Progression',
    'blogger.bloggerRecruitment.table.earnings': 'Ses gains',
    'blogger.bloggerRecruitment.table.bonus': 'Bonus $50',
    'blogger.bloggerRecruitment.bonusPaid': 'Payé',
    'blogger.bloggerRecruitment.bonusPending': 'En cours',
    'blogger.bloggerRecruitment.windowExpired': 'Expiré',
    'blogger.bloggerRecruitment.empty': 'Vous n\'avez pas encore parrainé de blogueur',
    'blogger.bloggerRecruitment.emptyHint': 'Partagez votre lien de parrainage avec d\'autres blogueurs pour commencer à gagner des bonus de $50 !',
  },
  en: {
    'blogger.menu.bloggerRecruitment': 'Blogger Referrals',
    'blogger.bloggerRecruitment.title': 'Refer Bloggers',
    'blogger.bloggerRecruitment.subtitle': 'Earn $50 when your referrals reach $200 in commissions',
    'blogger.bloggerRecruitment.howItWorks.title': 'How it works?',
    'blogger.bloggerRecruitment.howItWorks.step1': 'Share your referral link with other bloggers',
    'blogger.bloggerRecruitment.howItWorks.step2': 'When they sign up with your link, they become your referrals',
    'blogger.bloggerRecruitment.howItWorks.step3': 'As soon as a referral reaches $200 in direct commissions (referred clients), you receive a $50 bonus!',
    'blogger.bloggerRecruitment.howItWorks.note': 'Only direct commissions (clients referred by the recruited blogger) count towards the $200 threshold. The $50 bonus is paid once per referral.',
    'blogger.bloggerRecruitment.linkTitle': 'Your referral link',
    'blogger.bloggerRecruitment.stats.total': 'Total referrals',
    'blogger.bloggerRecruitment.stats.active': 'Active (6 months)',
    'blogger.bloggerRecruitment.stats.bonusesPaid': 'Bonuses paid',
    'blogger.bloggerRecruitment.stats.totalEarned': 'Total earned',
    'blogger.bloggerRecruitment.table.blogger': 'Blogger',
    'blogger.bloggerRecruitment.table.joined': 'Joined on',
    'blogger.bloggerRecruitment.table.progress': 'Progress',
    'blogger.bloggerRecruitment.table.earnings': 'Their earnings',
    'blogger.bloggerRecruitment.table.bonus': '$50 Bonus',
    'blogger.bloggerRecruitment.bonusPaid': 'Paid',
    'blogger.bloggerRecruitment.bonusPending': 'Pending',
    'blogger.bloggerRecruitment.windowExpired': 'Expired',
    'blogger.bloggerRecruitment.empty': 'You haven\'t referred any blogger yet',
    'blogger.bloggerRecruitment.emptyHint': 'Share your referral link with other bloggers to start earning $50 bonuses!',
  },
  es: {
    'blogger.menu.bloggerRecruitment': 'Referidos blogueros',
    'blogger.bloggerRecruitment.title': 'Refiere Blogueros',
    'blogger.bloggerRecruitment.subtitle': 'Gana $50 cuando tus referidos alcancen $200 en comisiones',
    'blogger.bloggerRecruitment.howItWorks.title': '¿Cómo funciona?',
    'blogger.bloggerRecruitment.howItWorks.step1': 'Comparte tu enlace de referido con otros blogueros',
    'blogger.bloggerRecruitment.howItWorks.step2': 'Cuando se registren con tu enlace, se convierten en tus referidos',
    'blogger.bloggerRecruitment.howItWorks.step3': 'Tan pronto como un referido alcance $200 en comisiones directas (clientes referidos), recibes un bono de $50!',
    'blogger.bloggerRecruitment.howItWorks.note': 'Solo las comisiones directas (clientes referidos por el bloguero reclutado) cuentan para alcanzar el umbral de $200. El bono de $50 se paga una vez por referido.',
    'blogger.bloggerRecruitment.linkTitle': 'Tu enlace de referido',
    'blogger.bloggerRecruitment.stats.total': 'Total referidos',
    'blogger.bloggerRecruitment.stats.active': 'Activos (6 meses)',
    'blogger.bloggerRecruitment.stats.bonusesPaid': 'Bonos pagados',
    'blogger.bloggerRecruitment.stats.totalEarned': 'Total ganado',
    'blogger.bloggerRecruitment.table.blogger': 'Bloguero',
    'blogger.bloggerRecruitment.table.joined': 'Se unió el',
    'blogger.bloggerRecruitment.table.progress': 'Progreso',
    'blogger.bloggerRecruitment.table.earnings': 'Sus ganancias',
    'blogger.bloggerRecruitment.table.bonus': 'Bono $50',
    'blogger.bloggerRecruitment.bonusPaid': 'Pagado',
    'blogger.bloggerRecruitment.bonusPending': 'Pendiente',
    'blogger.bloggerRecruitment.windowExpired': 'Expirado',
    'blogger.bloggerRecruitment.empty': 'Aún no has referido ningún bloguero',
    'blogger.bloggerRecruitment.emptyHint': '¡Comparte tu enlace de referido con otros blogueros para empezar a ganar bonos de $50!',
  },
  de: {
    'blogger.menu.bloggerRecruitment': 'Blogger-Empfehlungen',
    'blogger.bloggerRecruitment.title': 'Blogger Empfehlen',
    'blogger.bloggerRecruitment.subtitle': 'Verdienen Sie $50, wenn Ihre Empfehlungen $200 an Provisionen erreichen',
    'blogger.bloggerRecruitment.howItWorks.title': 'Wie funktioniert es?',
    'blogger.bloggerRecruitment.howItWorks.step1': 'Teilen Sie Ihren Empfehlungslink mit anderen Bloggern',
    'blogger.bloggerRecruitment.howItWorks.step2': 'Wenn sie sich mit Ihrem Link anmelden, werden sie Ihre Empfehlungen',
    'blogger.bloggerRecruitment.howItWorks.step3': 'Sobald eine Empfehlung $200 an direkten Provisionen (empfohlene Kunden) erreicht, erhalten Sie einen Bonus von $50!',
    'blogger.bloggerRecruitment.howItWorks.note': 'Nur direkte Provisionen (Kunden, die vom geworbenen Blogger empfohlen wurden) zählen für die Schwelle von $200. Der $50-Bonus wird einmal pro Empfehlung gezahlt.',
    'blogger.bloggerRecruitment.linkTitle': 'Ihr Empfehlungslink',
    'blogger.bloggerRecruitment.stats.total': 'Gesamt Empfehlungen',
    'blogger.bloggerRecruitment.stats.active': 'Aktiv (6 Monate)',
    'blogger.bloggerRecruitment.stats.bonusesPaid': 'Boni bezahlt',
    'blogger.bloggerRecruitment.stats.totalEarned': 'Gesamt verdient',
    'blogger.bloggerRecruitment.table.blogger': 'Blogger',
    'blogger.bloggerRecruitment.table.joined': 'Beigetreten am',
    'blogger.bloggerRecruitment.table.progress': 'Fortschritt',
    'blogger.bloggerRecruitment.table.earnings': 'Ihre Einnahmen',
    'blogger.bloggerRecruitment.table.bonus': '$50 Bonus',
    'blogger.bloggerRecruitment.bonusPaid': 'Bezahlt',
    'blogger.bloggerRecruitment.bonusPending': 'Ausstehend',
    'blogger.bloggerRecruitment.windowExpired': 'Abgelaufen',
    'blogger.bloggerRecruitment.empty': 'Sie haben noch keinen Blogger empfohlen',
    'blogger.bloggerRecruitment.emptyHint': 'Teilen Sie Ihren Empfehlungslink mit anderen Bloggern, um $50-Boni zu verdienen!',
  },
  pt: {
    'blogger.menu.bloggerRecruitment': 'Indicações de bloggers',
    'blogger.bloggerRecruitment.title': 'Indicar Bloggers',
    'blogger.bloggerRecruitment.subtitle': 'Ganhe $50 quando suas indicações atingirem $200 em comissões',
    'blogger.bloggerRecruitment.howItWorks.title': 'Como funciona?',
    'blogger.bloggerRecruitment.howItWorks.step1': 'Compartilhe seu link de indicação com outros bloggers',
    'blogger.bloggerRecruitment.howItWorks.step2': 'Quando eles se cadastrarem com seu link, eles se tornam suas indicações',
    'blogger.bloggerRecruitment.howItWorks.step3': 'Assim que uma indicação atingir $200 em comissões diretas (clientes indicados), você recebe um bônus de $50!',
    'blogger.bloggerRecruitment.howItWorks.note': 'Apenas comissões diretas (clientes indicados pelo blogger recrutado) contam para o limite de $200. O bônus de $50 é pago uma vez por indicação.',
    'blogger.bloggerRecruitment.linkTitle': 'Seu link de indicação',
    'blogger.bloggerRecruitment.stats.total': 'Total de indicações',
    'blogger.bloggerRecruitment.stats.active': 'Ativos (6 meses)',
    'blogger.bloggerRecruitment.stats.bonusesPaid': 'Bônus pagos',
    'blogger.bloggerRecruitment.stats.totalEarned': 'Total ganho',
    'blogger.bloggerRecruitment.table.blogger': 'Blogger',
    'blogger.bloggerRecruitment.table.joined': 'Cadastrado em',
    'blogger.bloggerRecruitment.table.progress': 'Progresso',
    'blogger.bloggerRecruitment.table.earnings': 'Seus ganhos',
    'blogger.bloggerRecruitment.table.bonus': 'Bônus $50',
    'blogger.bloggerRecruitment.bonusPaid': 'Pago',
    'blogger.bloggerRecruitment.bonusPending': 'Pendente',
    'blogger.bloggerRecruitment.windowExpired': 'Expirado',
    'blogger.bloggerRecruitment.empty': 'Você ainda não indicou nenhum blogger',
    'blogger.bloggerRecruitment.emptyHint': 'Compartilhe seu link de indicação com outros bloggers para começar a ganhar bônus de $50!',
  },
  ru: {
    'blogger.menu.bloggerRecruitment': 'Рефералы блогеров',
    'blogger.bloggerRecruitment.title': 'Приглашайте Блогеров',
    'blogger.bloggerRecruitment.subtitle': 'Зарабатывайте $50, когда ваши рефералы достигнут $200 комиссий',
    'blogger.bloggerRecruitment.howItWorks.title': 'Как это работает?',
    'blogger.bloggerRecruitment.howItWorks.step1': 'Поделитесь своей реферальной ссылкой с другими блогерами',
    'blogger.bloggerRecruitment.howItWorks.step2': 'Когда они зарегистрируются по вашей ссылке, они станут вашими рефералами',
    'blogger.bloggerRecruitment.howItWorks.step3': 'Как только реферал достигнет $200 прямых комиссий (рекомендованные клиенты), вы получите бонус $50!',
    'blogger.bloggerRecruitment.howItWorks.note': 'Только прямые комиссии (клиенты, рекомендованные привлеченным блогером) учитываются для порога в $200. Бонус $50 выплачивается один раз за реферала.',
    'blogger.bloggerRecruitment.linkTitle': 'Ваша реферальная ссылка',
    'blogger.bloggerRecruitment.stats.total': 'Всего рефералов',
    'blogger.bloggerRecruitment.stats.active': 'Активные (6 месяцев)',
    'blogger.bloggerRecruitment.stats.bonusesPaid': 'Бонусов выплачено',
    'blogger.bloggerRecruitment.stats.totalEarned': 'Всего заработано',
    'blogger.bloggerRecruitment.table.blogger': 'Блогер',
    'blogger.bloggerRecruitment.table.joined': 'Присоединился',
    'blogger.bloggerRecruitment.table.progress': 'Прогресс',
    'blogger.bloggerRecruitment.table.earnings': 'Их заработок',
    'blogger.bloggerRecruitment.table.bonus': 'Бонус $50',
    'blogger.bloggerRecruitment.bonusPaid': 'Оплачено',
    'blogger.bloggerRecruitment.bonusPending': 'В ожидании',
    'blogger.bloggerRecruitment.windowExpired': 'Истек',
    'blogger.bloggerRecruitment.empty': 'Вы еще не пригласили ни одного блогера',
    'blogger.bloggerRecruitment.emptyHint': 'Поделитесь своей реферальной ссылкой с другими блогерами, чтобы начать зарабатывать бонусы $50!',
  },
  ch: {
    'blogger.menu.bloggerRecruitment': '博主推荐',
    'blogger.bloggerRecruitment.title': '推荐博主',
    'blogger.bloggerRecruitment.subtitle': '当您的推荐人佣金达到$200时赚取$50',
    'blogger.bloggerRecruitment.howItWorks.title': '如何运作？',
    'blogger.bloggerRecruitment.howItWorks.step1': '与其他博主分享您的推荐链接',
    'blogger.bloggerRecruitment.howItWorks.step2': '当他们通过您的链接注册时，他们成为您的推荐人',
    'blogger.bloggerRecruitment.howItWorks.step3': '一旦推荐人直接佣金（推荐客户）达到$200，您将获得$50奖金！',
    'blogger.bloggerRecruitment.howItWorks.note': '只有直接佣金（被招募博主推荐的客户）才计入$200门槛。$50奖金每个推荐人支付一次。',
    'blogger.bloggerRecruitment.linkTitle': '您的推荐链接',
    'blogger.bloggerRecruitment.stats.total': '总推荐人数',
    'blogger.bloggerRecruitment.stats.active': '活跃（6个月）',
    'blogger.bloggerRecruitment.stats.bonusesPaid': '已支付奖金',
    'blogger.bloggerRecruitment.stats.totalEarned': '总收入',
    'blogger.bloggerRecruitment.table.blogger': '博主',
    'blogger.bloggerRecruitment.table.joined': '加入日期',
    'blogger.bloggerRecruitment.table.progress': '进度',
    'blogger.bloggerRecruitment.table.earnings': '他们的收入',
    'blogger.bloggerRecruitment.table.bonus': '$50奖金',
    'blogger.bloggerRecruitment.bonusPaid': '已支付',
    'blogger.bloggerRecruitment.bonusPending': '待处理',
    'blogger.bloggerRecruitment.windowExpired': '已过期',
    'blogger.bloggerRecruitment.empty': '您还没有推荐任何博主',
    'blogger.bloggerRecruitment.emptyHint': '与其他博主分享您的推荐链接，开始赚取$50奖金！',
  },
  hi: {
    'blogger.menu.bloggerRecruitment': 'ब्लॉगर रेफरल',
    'blogger.bloggerRecruitment.title': 'ब्लॉगर्स को रेफर करें',
    'blogger.bloggerRecruitment.subtitle': 'जब आपके रेफरल $200 कमीशन तक पहुंचें तो $50 कमाएं',
    'blogger.bloggerRecruitment.howItWorks.title': 'यह कैसे काम करता है?',
    'blogger.bloggerRecruitment.howItWorks.step1': 'अपनी रेफरल लिंक अन्य ब्लॉगर्स के साथ साझा करें',
    'blogger.bloggerRecruitment.howItWorks.step2': 'जब वे आपकी लिंक से साइन अप करें, वे आपके रेफरल बन जाते हैं',
    'blogger.bloggerRecruitment.howItWorks.step3': 'जैसे ही कोई रेफरल $200 डायरेक्ट कमीशन (रेफर किए गए ग्राहक) तक पहुंचता है, आपको $50 बोनस मिलता है!',
    'blogger.bloggerRecruitment.howItWorks.note': 'केवल डायरेक्ट कमीशन (भर्ती किए गए ब्लॉगर द्वारा रेफर किए गए ग्राहक) $200 सीमा के लिए गिने जाते हैं। $50 बोनस प्रति रेफरल एक बार दिया जाता है।',
    'blogger.bloggerRecruitment.linkTitle': 'आपकी रेफरल लिंक',
    'blogger.bloggerRecruitment.stats.total': 'कुल रेफरल',
    'blogger.bloggerRecruitment.stats.active': 'सक्रिय (6 महीने)',
    'blogger.bloggerRecruitment.stats.bonusesPaid': 'बोनस भुगतान किए गए',
    'blogger.bloggerRecruitment.stats.totalEarned': 'कुल कमाया',
    'blogger.bloggerRecruitment.table.blogger': 'ब्लॉगर',
    'blogger.bloggerRecruitment.table.joined': 'शामिल हुआ',
    'blogger.bloggerRecruitment.table.progress': 'प्रगति',
    'blogger.bloggerRecruitment.table.earnings': 'उनकी कमाई',
    'blogger.bloggerRecruitment.table.bonus': '$50 बोनस',
    'blogger.bloggerRecruitment.bonusPaid': 'भुगतान किया गया',
    'blogger.bloggerRecruitment.bonusPending': 'लंबित',
    'blogger.bloggerRecruitment.windowExpired': 'समाप्त',
    'blogger.bloggerRecruitment.empty': 'आपने अभी तक किसी ब्लॉगर को रेफर नहीं किया है',
    'blogger.bloggerRecruitment.emptyHint': '$50 बोनस कमाना शुरू करने के लिए अन्य ब्लॉगर्स के साथ अपनी रेफरल लिंक साझा करें!',
  },
  ar: {
    'blogger.menu.bloggerRecruitment': 'إحالات المدونين',
    'blogger.bloggerRecruitment.title': 'إحالة المدونين',
    'blogger.bloggerRecruitment.subtitle': 'اكسب 50 دولارًا عندما تصل إحالاتك إلى 200 دولار من العمولات',
    'blogger.bloggerRecruitment.howItWorks.title': 'كيف يعمل؟',
    'blogger.bloggerRecruitment.howItWorks.step1': 'شارك رابط الإحالة الخاص بك مع مدونين آخرين',
    'blogger.bloggerRecruitment.howItWorks.step2': 'عندما يقومون بالتسجيل باستخدام رابطك، يصبحون إحالاتك',
    'blogger.bloggerRecruitment.howItWorks.step3': 'بمجرد أن تصل الإحالة إلى 200 دولار في العمولات المباشرة (العملاء المحالين)، تحصل على مكافأة 50 دولارًا!',
    'blogger.bloggerRecruitment.howItWorks.note': 'فقط العمولات المباشرة (العملاء المحالون من قبل المدون المُجند) تُحتسب نحو عتبة 200 دولار. يتم دفع مكافأة 50 دولارًا مرة واحدة لكل إحالة.',
    'blogger.bloggerRecruitment.linkTitle': 'رابط الإحالة الخاص بك',
    'blogger.bloggerRecruitment.stats.total': 'إجمالي الإحالات',
    'blogger.bloggerRecruitment.stats.active': 'نشط (6 أشهر)',
    'blogger.bloggerRecruitment.stats.bonusesPaid': 'المكافآت المدفوعة',
    'blogger.bloggerRecruitment.stats.totalEarned': 'إجمالي المكاسب',
    'blogger.bloggerRecruitment.table.blogger': 'المدون',
    'blogger.bloggerRecruitment.table.joined': 'انضم في',
    'blogger.bloggerRecruitment.table.progress': 'التقدم',
    'blogger.bloggerRecruitment.table.earnings': 'أرباحهم',
    'blogger.bloggerRecruitment.table.bonus': 'مكافأة 50 دولار',
    'blogger.bloggerRecruitment.bonusPaid': 'مدفوع',
    'blogger.bloggerRecruitment.bonusPending': 'قيد الانتظار',
    'blogger.bloggerRecruitment.windowExpired': 'منتهي الصلاحية',
    'blogger.bloggerRecruitment.empty': 'لم تقم بإحالة أي مدون بعد',
    'blogger.bloggerRecruitment.emptyHint': 'شارك رابط الإحالة الخاص بك مع مدونين آخرين لبدء كسب مكافآت 50 دولارًا!',
  },
};

const LANGUAGES = ['fr', 'en', 'es', 'de', 'pt', 'ru', 'ch', 'hi', 'ar'];

function addTranslations() {
  console.log('🌐 Adding blogger recruitment translations to all languages...\n');

  let totalAdded = 0;

  for (const lang of LANGUAGES) {
    const filePath = path.join(__dirname, '..', 'src', 'helper', `${lang}.json`);

    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  Skipping ${lang}.json (file not found)`);
      continue;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const translations = JSON.parse(content);

      const newKeys = TRANSLATIONS[lang];
      if (!newKeys) {
        console.warn(`⚠️  No translations defined for ${lang}`);
        continue;
      }

      let addedForLang = 0;

      for (const [key, value] of Object.entries(newKeys)) {
        if (!translations[key]) {
          translations[key] = value;
          addedForLang++;
        }
      }

      // Write back with pretty formatting
      fs.writeFileSync(filePath, JSON.stringify(translations, null, 2), 'utf8');

      console.log(`✅ ${lang.toUpperCase()}: ${addedForLang} keys added`);
      totalAdded += addedForLang;
    } catch (error) {
      console.error(`❌ Error processing ${lang}.json:`, error.message);
    }
  }

  console.log(`\n✨ Done! ${totalAdded} total keys added across all languages`);
}

addTranslations();
