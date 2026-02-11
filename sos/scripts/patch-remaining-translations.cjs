/**
 * Patch remaining missing translations across 7 non-fr/en language files.
 */
const fs = require("fs");
const path = require("path");

const HELPER_DIR = path.join(__dirname, "..", "src", "helper");

// All remaining missing translations by language
const patches = {
  // === COMMON across multiple languages ===
  // blogger.dashboard
  "blogger.dashboard.top10": {
    es: "Top 10 mensual",
    de: "Monatliche Top 10",
    ru: "Топ 10 за месяц",
    pt: "Top 10 mensal",
    ch: "月度前10名",
    ar: "أفضل 10 شهريًا",
    hi: "मासिक शीर्ष 10",
  },
  "blogger.dashboard.totalClients": {
    es: "Total: {total}",
    de: "Gesamt: {total}",
    ru: "Всего: {total}",
    pt: "Total: {total}",
    ch: "总计：{total}",
    ar: "المجموع: {total}",
    hi: "कुल: {total}",
  },

  // blogger.example.*
  "blogger.example.nomad.text": {
    es: "Guía Visa Digital Nomad España 2026",
    de: "Leitfaden Digital Nomad Visum Spanien 2026",
    ru: "Гид по визе цифрового кочевника в Испании 2026",
    pt: "Guia Visto Digital Nomad Espanha 2026",
    ch: "2026年西班牙数字游民签证指南",
    ar: "دليل تأشيرة الرحالة الرقمي إسبانيا 2026",
    hi: "स्पेन डिजिटल नोमैड वीज़ा गाइड 2026",
  },
  "blogger.example.nomad.type": {
    es: "Digital Nomad:",
    de: "Digital Nomad:",
    ru: "Цифровой кочевник:",
    pt: "Digital Nomad:",
    ch: "数字游民：",
    ar: "الرحالة الرقمي:",
    hi: "डिजिटल नोमैड:",
  },
  "blogger.example.photo.text": {
    es: "Permiso de fotografía en Marruecos: lo que necesitas",
    de: "Fotogenehmigung in Marokko: Was Sie brauchen",
    ru: "Разрешение на фотосъёмку в Марокко: что нужно",
    pt: "Licença de fotografia no Marrocos: o que precisa",
    ch: "摩洛哥摄影许可：您需要了解的",
    ar: "تصريح التصوير في المغرب: ما تحتاجه",
    hi: "मोरक्को में फोटो परमिट: आपको क्या चाहिए",
  },
  "blogger.example.photo.type": {
    es: "Blog de fotografía:",
    de: "Fotoblog:",
    ru: "Фотоблог:",
    pt: "Blog de fotografia:",
    ch: "摄影博客：",
    ar: "مدونة تصوير:",
    hi: "फोटो ब्लॉग:",
  },
  "blogger.example.travel.text": {
    es: "Qué hacer si pierdes tu pasaporte en Tailandia",
    de: "Was tun, wenn Sie Ihren Reisepass in Thailand verlieren",
    ru: "Что делать, если вы потеряли паспорт в Таиланде",
    pt: "O que fazer se perder o passaporte na Tailândia",
    ch: "在泰国丢失护照怎么办",
    ar: "ماذا تفعل إذا فقدت جواز سفرك في تايلاند",
    hi: "थाईलैंड में पासपोर्ट खो जाए तो क्या करें",
  },
  "blogger.example.travel.type": {
    es: "Blog de viajes:",
    de: "Reiseblog:",
    ru: "Блог о путешествиях:",
    pt: "Blog de viagens:",
    ch: "旅行博客：",
    ar: "مدونة سفر:",
    hi: "यात्रा ब्लॉग:",
  },
  "blogger.example.vacation.text": {
    es: "Visa turística Bali: cómo extender tu estancia",
    de: "Touristenvisum Bali: So verlängern Sie Ihren Aufenthalt",
    ru: "Туристическая виза на Бали: как продлить пребывание",
    pt: "Visto turístico Bali: como prolongar a estadia",
    ch: "巴厘岛旅游签证：如何延长逗留时间",
    ar: "تأشيرة سياحية بالي: كيف تمدد إقامتك",
    hi: "बाली टूरिस्ट वीज़ा: अपना प्रवास कैसे बढ़ाएं",
  },
  "blogger.example.vacation.type": {
    es: "Blog de vacaciones:",
    de: "Urlaubsblog:",
    ru: "Блог об отпуске:",
    pt: "Blog de férias:",
    ch: "度假博客：",
    ar: "مدونة عطلات:",
    hi: "छुट्टी ब्लॉग:",
  },

  // blogger.register.*
  "blogger.register.error.acknowledgment": {
    ch: "您必须确认博主角色是永久性的",
    ar: "يجب أن تقر بأن دور المدون دائم",
    hi: "आपको स्वीकार करना होगा कि ब्लॉगर की भूमिका स्थायी है",
  },
  "blogger.register.roleConflict.button": {
    ch: "前往我的仪表板",
    ar: "الذهاب إلى لوحة التحكم",
    hi: "मेरे डैशबोर्ड पर जाएं",
  },
  "blogger.register.roleConflict.message": {
    ch: "您已注册为{role}。每个帐户只能有一个角色。",
    ar: "أنت مسجل بالفعل كـ {role}. يمكن لكل حساب أن يكون له دور واحد فقط.",
    hi: "आप पहले से {role} के रूप में पंजीकृत हैं। प्रत्येक खाते में केवल एक भूमिका हो सकती है।",
  },
  "blogger.register.roleConflict.title": {
    ch: "注册不被允许",
    ar: "التسجيل غير مسموح",
    hi: "पंजीकरण की अनुमति नहीं है",
  },
  "blogger.register.warning.message": {
    ch: "成为博主合作伙伴后，您将无法成为Chatter或Influencer。此选择是永久性的。",
    ar: "بأن تصبح مدونًا شريكًا، لن تتمكن من أن تصبح Chatter أو Influencer. هذا الاختيار دائم.",
    hi: "ब्लॉगर पार्टनर बनने पर, आप Chatter या Influencer नहीं बन पाएंगे। यह चुनाव स्थायी है।",
  },
  "blogger.register.warning.title": {
    ch: "重要：永久角色",
    ar: "مهم: دور دائم",
    hi: "महत्वपूर्ण: स्थायी भूमिका",
  },

  // blogger.tools.*
  "blogger.tools.clientLink": {
    ru: "Клиентская ссылка",
  },
  "blogger.tools.links": {
    ru: "Ваши партнёрские ссылки",
  },
  "blogger.tools.qrCodes": {
    ru: "QR-коды",
  },
  "blogger.tools.recruitLink": {
    ru: "Партнёрская ссылка",
  },
  "blogger.tools.subtitle": {
    ru: "Виджеты, ссылки и QR-коды с вашим партнёрским кодом",
  },
  "blogger.tools.title": {
    ru: "Рекламные инструменты",
  },

  // chatter.hero.cta
  "chatter.hero.cta": {
    es: "Empieza a ganar ahora - Es gratis",
    de: "Jetzt verdienen - Kostenlos",
    ar: "ابدأ الكسب الآن - مجانًا",
    pt: "Comece a ganhar agora - É grátis",
  },

  // form.*
  "form.blogCountry": {
    ru: "Целевая страна",
  },
  "form.blogCountry.placeholder": {
    ru: "Целевая аудитория",
  },
  "form.blogDescription": {
    ru: "Описание блога",
  },
  "form.blogDescription.placeholder": {
    ru: "Опишите ваш блог и его аудиторию...",
  },
  "form.blogLanguage": {
    ru: "Язык блога",
  },
  "form.blogName": {
    ru: "Название блога",
  },
  "form.blogName.placeholder": {
    ru: "Мой Супер Блог",
  },
  "form.blogTheme": {
    ru: "Тема",
  },
  "form.blogTraffic": {
    ru: "Приблизительный ежемесячный трафик",
  },
  "form.blogUrl": {
    ru: "URL блога",
  },
  "form.error.emailInvalid": {
    ru: "Пожалуйста, введите действительный email",
  },
  "form.error.required": {
    ru: "Это поле обязательно",
  },
  "form.error.urlInvalid": {
    ru: "Пожалуйста, введите действительный URL",
  },
  "form.search.country": {
    ru: "Поиск...",
  },

  // influencer.dashboard.*
  "influencer.dashboard.actions.referrals": {
    ch: "查看我的推荐人",
    ar: "عرض إحالاتي",
    hi: "मेरे रेफरल देखें",
  },
  "influencer.dashboard.actions.title": {
    ch: "快速操作",
    ar: "إجراءات سريعة",
    hi: "त्वरित कार्य",
  },
  "influencer.dashboard.actions.tools": {
    ch: "推广工具",
    ar: "أدوات ترويجية",
    hi: "प्रचार उपकरण",
  },
  "influencer.dashboard.actions.withdraw": {
    ch: "请求提现",
    ar: "طلب سحب",
    hi: "निकासी अनुरोध करें",
  },
  "influencer.dashboard.commissions.empty": {
    ch: "还没有佣金。分享您的链接开始赚取！",
    ar: "لا توجد عمولات بعد. شارك رابطك لتبدأ!",
    hi: "अभी तक कोई कमीशन नहीं। कमाई शुरू करने के लिए अपना लिंक साझा करें!",
  },
  "influencer.dashboard.commissions.title": {
    ch: "最近佣金",
    ar: "آخر العمولات",
    hi: "हाल के कमीशन",
  },
  "influencer.dashboard.commissions.viewAll": {
    ch: "查看全部",
    ar: "عرض الكل",
    hi: "सभी देखें",
  },
  "influencer.dashboard.info.client": {
    ch: "每位推荐客户",
    ar: "لكل عميل محال",
    hi: "प्रति संदर्भित ग्राहक",
  },
  "influencer.dashboard.info.title": {
    ch: "您的佣金",
    ar: "عمولاتك",
    hi: "आपके कमीशन",
  },
  "influencer.dashboard.links.title": {
    ch: "您的推荐链接",
    ar: "روابط الإحالة الخاصة بك",
    hi: "आपके रेफरल लिंक",
  },
  "influencer.dashboard.stats.recruits": {
    ch: "招募的服务商",
    ar: "مقدمو الخدمات المُجنّدون",
    hi: "भर्ती किए गए सेवा प्रदाता",
  },

  // influencer.hero/register/social/stats/sticky
  "influencer.hero.earn": {
    ch: "赚取",
    ar: "اربح",
  },
  "influencer.hero.perClient": {
    ch: "每位推荐客户",
    ar: "لكل عميل محال",
  },
  "influencer.register.roleConflict.button": {
    ch: "前往我的仪表板",
    ar: "الذهاب إلى لوحة التحكم",
    hi: "मेरे डैशबोर्ड पर जाएं",
  },
  "influencer.register.roleConflict.message": {
    ch: "您已注册为{role}。每个帐户只能有一个角色。",
    ar: "أنت مسجل بالفعل كـ {role}. يمكن لكل حساب أن يكون له دور واحد فقط.",
    hi: "आप पहले से {role} के रूप में पंजीकृत हैं। प्रत्येक खाते में केवल एक भूमिका हो सकती है।",
  },
  "influencer.register.roleConflict.title": {
    ch: "注册不被允许",
    ar: "التسجيل غير مسموح",
    hi: "पंजीकरण की अनुमति नहीं है",
  },
  "influencer.social.title": {
    ch: "影响者每天都在赚钱",
    ar: "المؤثرون يكسبون كل يوم",
  },
  "influencer.stats.countries": {
    ch: "国家",
    ar: "الدول",
  },
  "influencer.stats.influencers": {
    ch: "活跃影响者",
    ar: "المؤثرون النشطون",
  },
  "influencer.stats.paid": {
    ch: "本月已支付",
    ar: "المدفوع هذا الشهر",
  },
  "influencer.sticky.cta": {
    ch: "10$/客户 - 免费开始",
    ar: "10$/عميل - ابدأ مجانًا",
  },

  // testy.cta.countries150
  "testy.cta.countries150": {
    ru: "197+ стран покрыто",
    ch: "覆盖197+个国家",
    ar: "أكثر من 197 دولة مغطاة",
    hi: "197+ देश कवर किए गए",
  },
};

// Process each language file
const langs = ["es", "de", "ru", "pt", "ch", "ar", "hi"];

for (const lang of langs) {
  const filePath = path.join(HELPER_DIR, `${lang}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  let added = 0;
  for (const [key, translations] of Object.entries(patches)) {
    if (translations[lang] && !data[key]) {
      data[key] = translations[lang];
      added++;
    }
  }

  // Sort keys
  const sorted = {};
  for (const k of Object.keys(data).sort()) {
    sorted[k] = data[k];
  }

  fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2) + "\n", "utf-8");

  const finalKeys = Object.keys(sorted).length;
  console.log(`${lang}.json: added ${added} keys → ${finalKeys} total`);
}

// Final gap check
const fr = JSON.parse(
  fs.readFileSync(path.join(HELPER_DIR, "fr.json"), "utf-8")
);
const frNonAdmin = Object.keys(fr).filter((k) => !k.startsWith("admin."));

console.log("\n=== Final gap check ===");
for (const lang of langs) {
  const data = JSON.parse(
    fs.readFileSync(path.join(HELPER_DIR, `${lang}.json`), "utf-8")
  );
  const langKeys = new Set(Object.keys(data));
  const missing = frNonAdmin.filter((k) => !langKeys.has(k));
  console.log(`${lang}: ${missing.length} still missing`);
  if (missing.length > 0 && missing.length <= 5) {
    missing.forEach((k) => console.log(`  ${k}`));
  }
}
