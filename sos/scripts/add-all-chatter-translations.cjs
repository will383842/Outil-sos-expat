#!/usr/bin/env node
/**
 * Script pour ajouter 202 traductions Chatter manquantes dans 9 langues
 * Usage: node add-all-chatter-translations.cjs
 */

const fs = require('fs');
const path = require('path');

// Chemins des fichiers
const helperDir = path.join(__dirname, '..', 'src', 'helper');

// Langues supportées
const languages = ['fr', 'en', 'es', 'de', 'ru', 'pt', 'ch', 'hi', 'ar'];

// Import des 3 parties de traductions
const translationsPart2 = require('./chatter-translations-part2.cjs');
const translationsPart3 = require('./chatter-translations-part3.cjs');

// Partie 1 des traductions (intégrée directement)
const translationsPart1 = {
  "chatter.affiliateCodeClient": {
    fr: "Code affiliation client",
    en: "Client affiliate code",
    es: "Código de afiliación de cliente",
    de: "Kundenaffiliate-Code",
    ru: "Код партнера клиента",
    pt: "Código de afiliação de cliente",
    ch: "客户联盟代码",
    hi: "ग्राहक संबद्ध कोड",
    ar: "رمز الانتساب للعميل"
  },
  "chatter.affiliateCodeRecruitment": {
    fr: "Code affiliation recrutement",
    en: "Recruitment affiliate code",
    es: "Código de afiliación de reclutamiento",
    de: "Rekrutierungs-Affiliate-Code",
    ru: "Код партнера для рекрутинга",
    pt: "Código de afiliação de recrutamento",
    ch: "招募联盟代码",
    hi: "भर्ती संबद्ध कोड",
    ar: "رمز الانتساب للتوظيف"
  },
  "chatter.alerts.inactive": {
    fr: "Inactif",
    en: "Inactive",
    es: "Inactivo",
    de: "Inaktiv",
    ru: "Неактивен",
    pt: "Inativo",
    ch: "不活跃",
    hi: "निष्क्रिय",
    ar: "غير نشط"
  },
  "chatter.alerts.inactiveCount": {
    fr: "{count} membre(s) inactif(s)",
    en: "{count} inactive member(s)",
    es: "{count} miembro(s) inactivo(s)",
    de: "{count} inaktive(s) Mitglied(er)",
    ru: "{count} неактивных участников",
    pt: "{count} membro(s) inativo(s)",
    ch: "{count} 个不活跃成员",
    hi: "{count} निष्क्रिय सदस्य",
    ar: "{count} عضو غير نشط"
  },
  "chatter.alerts.motivate": {
    fr: "Motivez votre équipe",
    en: "Motivate your team",
    es: "Motiva a tu equipo",
    de: "Motivieren Sie Ihr Team",
    ru: "Мотивируйте свою команду",
    pt: "Motive sua equipe",
    ch: "激励您的团队",
    hi: "अपनी टीम को प्रेरित करें",
    ar: "حفز فريقك"
  },
  "chatter.alerts.teamTitle": {
    fr: "Alertes d'équipe",
    en: "Team alerts",
    es: "Alertas del equipo",
    de: "Team-Benachrichtigungen",
    ru: "Командные уведомления",
    pt: "Alertas da equipe",
    ch: "团队提醒",
    hi: "टीम अलर्ट",
    ar: "تنبيهات الفريق"
  },
  "chatter.aria.cta.final": {
    fr: "Commencez maintenant - Inscrivez-vous gratuitement en tant que Chatter",
    en: "Start now - Sign up for free as a Chatter",
    es: "Comienza ahora - Regístrate gratis como Chatter",
    de: "Jetzt starten - Kostenlos als Chatter anmelden",
    ru: "Начните сейчас - зарегистрируйтесь бесплатно как Chatter",
    pt: "Comece agora - Inscreva-se gratuitamente como Chatter",
    ch: "立即开始 - 免费注册成为 Chatter",
    hi: "अभी शुरू करें - Chatter के रूप में निःशुल्क साइन अप करें",
    ar: "ابدأ الآن - سجل مجانًا كـ Chatter"
  },
  "chatter.aria.cta.sticky": {
    fr: "Rejoignez-nous maintenant - Inscription gratuite",
    en: "Join us now - Free registration",
    es: "Únete ahora - Registro gratuito",
    de: "Jetzt beitreten - Kostenlose Registrierung",
    ru: "Присоединяйтесь сейчас - бесплатная регистрация",
    pt: "Junte-se a nós agora - Registro gratuito",
    ch: "立即加入 - 免费注册",
    hi: "अभी शामिल हों - मुफ्त पंजीकरण",
    ar: "انضم إلينا الآن - تسجيل مجاني"
  },
  "chatter.aria.cta.team": {
    fr: "Construisez votre équipe - Inscrivez-vous maintenant",
    en: "Build your team - Sign up now",
    es: "Construye tu equipo - Regístrate ahora",
    de: "Bauen Sie Ihr Team auf - Jetzt anmelden",
    ru: "Создайте свою команду - зарегистрируйтесь сейчас",
    pt: "Construa sua equipe - Inscreva-se agora",
    ch: "建立您的团队 - 立即注册",
    hi: "अपनी टीम बनाएं - अभी साइन अप करें",
    ar: "ابنِ فريقك - سجل الآن"
  },
  "chatter.aria.faq.toggle": {
    fr: "Afficher/masquer la réponse",
    en: "Show/hide answer",
    es: "Mostrar/ocultar respuesta",
    de: "Antwort anzeigen/verbergen",
    ru: "Показать/скрыть ответ",
    pt: "Mostrar/ocultar resposta",
    ch: "显示/隐藏答案",
    hi: "उत्तर दिखाएं/छिपाएं",
    ar: "إظهار/إخفاء الإجابة"
  },
  "chatter.availableBalance": {
    fr: "Solde disponible",
    en: "Available balance",
    es: "Saldo disponible",
    de: "Verfügbares Guthaben",
    ru: "Доступный баланс",
    pt: "Saldo disponível",
    ch: "可用余额",
    hi: "उपलब्ध शेष राशि",
    ar: "الرصيد المتاح"
  },
  "chatter.badges": {
    fr: "Badges",
    en: "Badges",
    es: "Insignias",
    de: "Abzeichen",
    ru: "Значки",
    pt: "Distintivos",
    ch: "徽章",
    hi: "बैज",
    ar: "الشارات"
  },
  "chatter.bestRank": {
    fr: "Meilleur classement",
    en: "Best rank",
    es: "Mejor clasificación",
    de: "Beste Platzierung",
    ru: "Лучший рейтинг",
    pt: "Melhor classificação",
    ch: "最佳排名",
    hi: "सर्वश्रेष्ठ रैंक",
    ar: "أفضل تصنيف"
  },
  "chatter.bestStreak": {
    fr: "Meilleure série",
    en: "Best streak",
    es: "Mejor racha",
    de: "Beste Serie",
    ru: "Лучшая серия",
    pt: "Melhor sequência",
    ch: "最佳连胜",
    hi: "सर्वश्रेष्ठ स्ट्रीक",
    ar: "أفضل سلسلة"
  },
  "chatter.calc.calls": {
    fr: "appels",
    en: "calls",
    es: "llamadas",
    de: "Anrufe",
    ru: "звонков",
    pt: "chamadas",
    ch: "通话",
    hi: "कॉल",
    ar: "مكالمات"
  },
  "chatter.calc.example.badge": {
    fr: "Exemple Concret",
    en: "Real Example",
    es: "Ejemplo Real",
    de: "Reales Beispiel",
    ru: "Реальный пример",
    pt: "Exemplo Real",
    ch: "实际示例",
    hi: "वास्तविक उदाहरण",
    ar: "مثال حقيقي"
  },
  "chatter.calc.example.bonus": {
    fr: "Bonus mensuel (Top 3)",
    en: "Monthly bonus (Top 3)",
    es: "Bonificación mensual (Top 3)",
    de: "Monatlicher Bonus (Top 3)",
    ru: "Ежемесячный бонус (Топ-3)",
    pt: "Bônus mensal (Top 3)",
    ch: "月度奖金（前 3 名）",
    hi: "मासिक बोनस (शीर्ष 3)",
    ar: "مكافأة شهرية (أفضل 3)"
  },
  "chatter.calc.example.direct": {
    fr: "Gains directs",
    en: "Direct earnings",
    es: "Ganancias directas",
    de: "Direkte Einnahmen",
    ru: "Прямые доходы",
    pt: "Ganhos diretos",
    ch: "直接收入",
    hi: "प्रत्यक्ष कमाई",
    ar: "أرباح مباشرة"
  },
  "chatter.calc.example.note": {
    fr: "* Résultats basés sur des performances moyennes",
    en: "* Results based on average performance",
    es: "* Resultados basados en rendimiento promedio",
    de: "* Ergebnisse basierend auf durchschnittlicher Leistung",
    ru: "* Результаты основаны на средней производительности",
    pt: "* Resultados baseados em desempenho médio",
    ch: "* 结果基于平均表现",
    hi: "* परिणाम औसत प्रदर्शन पर आधारित",
    ar: "* النتائج بناءً على الأداء المتوسط"
  },
  "chatter.calc.example.onetime": {
    fr: "Bonus ponctuels",
    en: "One-time bonuses",
    es: "Bonos únicos",
    de: "Einmalige Boni",
    ru: "Единовременные бонусы",
    pt: "Bônus únicos",
    ch: "一次性奖金",
    hi: "एक बार का बोनस",
    ar: "مكافآت لمرة واحدة"
  },
  "chatter.calc.example.team": {
    fr: "Revenus d'équipe",
    en: "Team earnings",
    es: "Ganancias de equipo",
    de: "Team-Einnahmen",
    ru: "Командные доходы",
    pt: "Ganhos da equipe",
    ch: "团队收入",
    hi: "टीम की कमाई",
    ar: "أرباح الفريق"
  },
  "chatter.calc.example.title": {
    fr: "Votre Potentiel de Gains",
    en: "Your Earning Potential",
    es: "Tu Potencial de Ganancias",
    de: "Ihr Verdienstpotenzial",
    ru: "Ваш потенциал заработка",
    pt: "Seu Potencial de Ganhos",
    ch: "您的收入潜力",
    hi: "आपकी कमाई की क्षमता",
    ar: "إمكانات أرباحك"
  },
  "chatter.calc.example.total": {
    fr: "Total mensuel estimé",
    en: "Estimated monthly total",
    es: "Total mensual estimado",
    de: "Geschätzter monatlicher Gesamtbetrag",
    ru: "Предполагаемая месячная сумма",
    pt: "Total mensal estimado",
    ch: "预计每月总额",
    hi: "अनुमानित मासिक कुल",
    ar: "الإجمالي الشهري المقدر"
  },
  "chatter.commissions.clientCall": {
    fr: "Commission par appel client",
    en: "Commission per client call",
    es: "Comisión por llamada de cliente",
    de: "Provision pro Kundenanruf",
    ru: "Комиссия за звонок клиента",
    pt: "Comissão por chamada de cliente",
    ch: "每个客户通话佣金",
    hi: "प्रति ग्राहक कॉल कमीशन",
    ar: "عمولة لكل مكالمة عميل"
  },
  "chatter.commissions.n1Call": {
    fr: "Commission par appel N1",
    en: "Commission per N1 call",
    es: "Comisión por llamada N1",
    de: "Provision pro N1-Anruf",
    ru: "Комиссия за звонок N1",
    pt: "Comissão por chamada N1",
    ch: "每个 N1 通话佣金",
    hi: "प्रति N1 कॉल कमीशन",
    ar: "عمولة لكل مكالمة N1"
  },
  "chatter.commissions.n2Call": {
    fr: "Commission par appel N2",
    en: "Commission per N2 call",
    es: "Comisión por llamada N2",
    de: "Provision pro N2-Anruf",
    ru: "Комиссия за звонок N2",
    pt: "Comissão por chamada N2",
    ch: "每个 N2 通话佣金",
    hi: "प्रति N2 कॉल कमीशन",
    ar: "عمولة لكل مكالمة N2"
  },
  "chatter.commissions.rates": {
    fr: "Taux de commission",
    en: "Commission rates",
    es: "Tasas de comisión",
    de: "Provisionssätze",
    ru: "Ставки комиссии",
    pt: "Taxas de comissão",
    ch: "佣金率",
    hi: "कमीशन दरें",
    ar: "معدلات العمولة"
  },
  "chatter.content.badge": {
    fr: "Créateur de Contenu",
    en: "Content Creator",
    es: "Creador de Contenido",
    de: "Content-Ersteller",
    ru: "Создатель контента",
    pt: "Criador de Conteúdo",
    ch: "内容创作者",
    hi: "सामग्री निर्माता",
    ar: "منشئ محتوى"
  }
};

// Fusionner toutes les traductions
const allTranslations = {
  ...translationsPart1,
  ...translationsPart2,
  ...translationsPart3
};

console.log('🚀 Démarrage du script d\'ajout des traductions Chatter...\n');

// Fonction pour charger un fichier JSON
function loadJSON(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ Erreur lors de la lecture de ${filePath}:`, error.message);
    process.exit(1);
  }
}

// Fonction pour sauvegarder un fichier JSON (trié alphabétiquement)
function saveJSON(filePath, data) {
  try {
    // Trier les clés alphabétiquement
    const sorted = Object.keys(data).sort().reduce((acc, key) => {
      acc[key] = data[key];
      return acc;
    }, {});

    fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
    return true;
  } catch (error) {
    console.error(`❌ Erreur lors de l'écriture de ${filePath}:`, error.message);
    return false;
  }
}

// Statistiques
let stats = {
  total: 0,
  success: 0,
  errors: []
};

// Traiter chaque langue
languages.forEach(lang => {
  const filePath = path.join(helperDir, `${lang}.json`);
  console.log(`\n📝 Traitement de ${lang}.json...`);

  // Charger le fichier de traduction existant
  let langData = loadJSON(filePath);
  let addedCount = 0;
  let skippedCount = 0;

  // Ajouter les traductions manquantes
  Object.keys(allTranslations).forEach(key => {
    if (allTranslations[key] && allTranslations[key][lang]) {
      // Vérifier si la clé existe déjà
      if (langData[key]) {
        skippedCount++;
      } else {
        langData[key] = allTranslations[key][lang];
        addedCount++;
        stats.total++;
      }
    } else {
      console.warn(`⚠️  Traduction manquante pour ${key} en ${lang}`);
      stats.errors.push(`${lang}: ${key}`);
    }
  });

  // Sauvegarder le fichier
  if (saveJSON(filePath, langData)) {
    console.log(`✅ ${addedCount} traductions ajoutées, ${skippedCount} déjà existantes`);
    stats.success += addedCount;
  } else {
    console.error(`❌ Erreur lors de la sauvegarde de ${lang}.json`);
  }
});

// Rapport final
console.log('\n' + '='.repeat(60));
console.log('📊 RAPPORT FINAL');
console.log('='.repeat(60));
console.log(`✅ Traductions ajoutées avec succès: ${stats.success}/${stats.total}`);
console.log(`📝 Total de clés de traduction: ${Object.keys(allTranslations).length}`);

if (stats.errors.length > 0) {
  console.log(`\n⚠️  ${stats.errors.length} erreurs détectées:`);
  stats.errors.slice(0, 10).forEach(err => console.log(`   - ${err}`));
  if (stats.errors.length > 10) {
    console.log(`   ... et ${stats.errors.length - 10} autres erreurs`);
  }
} else {
  console.log('\n✨ Toutes les traductions ont été ajoutées avec succès !');
}

console.log('\n✅ Script terminé !');
