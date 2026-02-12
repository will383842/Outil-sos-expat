#!/usr/bin/env node
/**
 * Script pour ajouter toutes les traductions admin manquantes
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = __dirname;

// Toutes les traductions par langue
const translations = {
  'fr-fr': {
    "admin.bloggers.fixedCommissionsDesc": "10$ par appel référé • 5$ par partenaire • Pas de bonus ni de niveaux",
    "admin.chatterConfig.clientCommission": "Commission par appel référé (cents)",
    "admin.chatterConfig.clientCommission.desc": "Commission fixe pour chaque client qui effectue un appel payant",
    "admin.chatterConfig.recruitmentCommission": "Commission par partenaire (cents)",
    "admin.chatterConfig.recruitmentCommission.desc": "Commission pour chaque appel reçu par un partenaire (6 mois)",
    "admin.chatterConfig.recruiterBonus": "Bonus partenaire automatique",
    "admin.chatterConfig.recruiterBonus.desc": "$50 automatiquement versés au partenaire quand son filleul atteint $500 de commissions.",
    "admin.chatterConfig.recruitmentDuration": "Durée du lien partenaires (mois)",
    "admin.chatterConfig.recruitmentDuration.desc": "Période pendant laquelle les commissions partenaires sont versées",
    "admin.config.recruitCommission": "Commission partenaire",
    "admin.config.recruitWindow": "Fenêtre partenaires (mois)",
    "admin.config.recruitWindowHelp": "Durée de suivi des partenaires"
  },
  'en': {
    "admin.bloggers.fixedCommissionsDesc": "$10 per call referred • $5 per partner • No bonuses or levels",
    "admin.chatterConfig.clientCommission": "Commission per call referred (cents)",
    "admin.chatterConfig.clientCommission.desc": "Fixed commission for each client who makes a paid call",
    "admin.chatterConfig.recruitmentCommission": "Commission per partner (cents)",
    "admin.chatterConfig.recruitmentCommission.desc": "Commission for each call received by a partner (6 months)",
    "admin.chatterConfig.recruiterBonus": "Automatic partner bonus",
    "admin.chatterConfig.recruiterBonus.desc": "$50 automatically paid to the partner when their recruit reaches $500 in commissions.",
    "admin.chatterConfig.recruitmentDuration": "Partner link duration (months)",
    "admin.chatterConfig.recruitmentDuration.desc": "Period during which partner commissions are paid",
    "admin.config.recruitCommission": "Partner commission",
    "admin.config.recruitWindow": "Partner window (months)",
    "admin.config.recruitWindowHelp": "Partner tracking duration"
  },
  'es-es': {
    "admin.bloggers.fixedCommissionsDesc": "$10 por llamada referida • $5 por socio • Sin bonos ni niveles",
    "admin.chatterConfig.clientCommission": "Comisión por llamada referida (centavos)",
    "admin.chatterConfig.clientCommission.desc": "Comisión fija por cada cliente que realiza una llamada de pago",
    "admin.chatterConfig.recruitmentCommission": "Comisión por socio (centavos)",
    "admin.chatterConfig.recruitmentCommission.desc": "Comisión por cada llamada recibida por un socio (6 meses)",
    "admin.chatterConfig.recruiterBonus": "Bono automático de socio",
    "admin.chatterConfig.recruiterBonus.desc": "$50 pagados automáticamente al socio cuando su recluta alcanza $500 en comisiones.",
    "admin.chatterConfig.recruitmentDuration": "Duración del enlace de socios (meses)",
    "admin.chatterConfig.recruitmentDuration.desc": "Período durante el cual se pagan las comisiones de socios",
    "admin.config.recruitCommission": "Comisión de socio",
    "admin.config.recruitWindow": "Ventana de socios (meses)",
    "admin.config.recruitWindowHelp": "Duración del seguimiento de socios"
  },
  'de-de': {
    "admin.bloggers.fixedCommissionsDesc": "$10 pro Anruf • $5 pro Partner • Keine Boni oder Stufen",
    "admin.chatterConfig.clientCommission": "Provision pro Anruf (Cent)",
    "admin.chatterConfig.clientCommission.desc": "Feste Provision für jeden Kunden, der einen bezahlten Anruf tätigt",
    "admin.chatterConfig.recruitmentCommission": "Provision pro Partner (Cent)",
    "admin.chatterConfig.recruitmentCommission.desc": "Provision für jeden Anruf eines Partners (6 Monate)",
    "admin.chatterConfig.recruiterBonus": "Automatischer Partner-Bonus",
    "admin.chatterConfig.recruiterBonus.desc": "$50 automatisch an den Partner gezahlt, wenn sein Recruit $500 an Provisionen erreicht.",
    "admin.chatterConfig.recruitmentDuration": "Partner-Link-Dauer (Monate)",
    "admin.chatterConfig.recruitmentDuration.desc": "Zeitraum, in dem Partner-Provisionen gezahlt werden",
    "admin.config.recruitCommission": "Partner-Provision",
    "admin.config.recruitWindow": "Partner-Fenster (Monate)",
    "admin.config.recruitWindowHelp": "Partner-Tracking-Dauer"
  },
  'pt-pt': {
    "admin.bloggers.fixedCommissionsDesc": "$10 por chamada referida • $5 por parceiro • Sem bônus ou níveis",
    "admin.chatterConfig.clientCommission": "Comissão por chamada referida (centavos)",
    "admin.chatterConfig.clientCommission.desc": "Comissão fixa para cada cliente que faz uma chamada paga",
    "admin.chatterConfig.recruitmentCommission": "Comissão por parceiro (centavos)",
    "admin.chatterConfig.recruitmentCommission.desc": "Comissão por cada chamada recebida por um parceiro (6 meses)",
    "admin.chatterConfig.recruiterBonus": "Bônus automático de parceiro",
    "admin.chatterConfig.recruiterBonus.desc": "$50 pagos automaticamente ao parceiro quando seu recruta atinge $500 em comissões.",
    "admin.chatterConfig.recruitmentDuration": "Duração do link de parceiros (meses)",
    "admin.chatterConfig.recruitmentDuration.desc": "Período durante o qual as comissões de parceiros são pagas",
    "admin.config.recruitCommission": "Comissão de parceiro",
    "admin.config.recruitWindow": "Janela de parceiros (meses)",
    "admin.config.recruitWindowHelp": "Duração de rastreamento de parceiros"
  },
  'ru-ru': {
    "admin.bloggers.fixedCommissionsDesc": "$10 за звонок • $5 за партнера • Без бонусов или уровней",
    "admin.chatterConfig.clientCommission": "Комиссия за звонок (центы)",
    "admin.chatterConfig.clientCommission.desc": "Фиксированная комиссия за каждого клиента, совершившего платный звонок",
    "admin.chatterConfig.recruitmentCommission": "Комиссия за партнера (центы)",
    "admin.chatterConfig.recruitmentCommission.desc": "Комиссия за каждый звонок партнера (6 месяцев)",
    "admin.chatterConfig.recruiterBonus": "Автоматический бонус партнера",
    "admin.chatterConfig.recruiterBonus.desc": "$50 автоматически выплачивается партнеру, когда его recruit достигает $500 комиссий.",
    "admin.chatterConfig.recruitmentDuration": "Длительность ссылки партнера (месяцы)",
    "admin.chatterConfig.recruitmentDuration.desc": "Период, в течение которого выплачиваются комиссии партнеров",
    "admin.config.recruitCommission": "Комиссия партнера",
    "admin.config.recruitWindow": "Окно партнеров (месяцы)",
    "admin.config.recruitWindowHelp": "Продолжительность отслеживания партнеров"
  },
  'zh-cn': {
    "admin.bloggers.fixedCommissionsDesc": "每次推荐电话$10 • 每个合作伙伴$5 • 无奖金或等级",
    "admin.chatterConfig.clientCommission": "每次推荐电话佣金（美分）",
    "admin.chatterConfig.clientCommission.desc": "每位进行付费通话的客户的固定佣金",
    "admin.chatterConfig.recruitmentCommission": "每个合作伙伴佣金（美分）",
    "admin.chatterConfig.recruitmentCommission.desc": "合作伙伴接到的每次电话佣金（6个月）",
    "admin.chatterConfig.recruiterBonus": "自动合作伙伴奖金",
    "admin.chatterConfig.recruiterBonus.desc": "当其招募人达到$500佣金时，自动向合作伙伴支付$50。",
    "admin.chatterConfig.recruitmentDuration": "合作伙伴链接持续时间（月）",
    "admin.chatterConfig.recruitmentDuration.desc": "支付合作伙伴佣金的期限",
    "admin.config.recruitCommission": "合作伙伴佣金",
    "admin.config.recruitWindow": "合作伙伴窗口（月）",
    "admin.config.recruitWindowHelp": "合作伙伴跟踪持续时间"
  },
  'hi-in': {
    "admin.bloggers.fixedCommissionsDesc": "प्रति कॉल $10 • प्रति साझेदार $5 • कोई बोनस या स्तर नहीं",
    "admin.chatterConfig.clientCommission": "प्रति कॉल कमीशन (सेंट)",
    "admin.chatterConfig.clientCommission.desc": "प्रत्येक ग्राहक के लिए निश्चित कमीशन जो भुगतान कॉल करता है",
    "admin.chatterConfig.recruitmentCommission": "प्रति साझेदार कमीशन (सेंट)",
    "admin.chatterConfig.recruitmentCommission.desc": "साझेदार द्वारा प्राप्त प्रत्येक कॉल के लिए कमीशन (6 महीने)",
    "admin.chatterConfig.recruiterBonus": "स्वचालित साझेदार बोनस",
    "admin.chatterConfig.recruiterBonus.desc": "जब उनका recruit $500 कमीशन तक पहुंचता है तो साझेदार को स्वचालित रूप से $50 का भुगतान किया जाता है।",
    "admin.chatterConfig.recruitmentDuration": "साझेदार लिंक अवधि (महीने)",
    "admin.chatterConfig.recruitmentDuration.desc": "वह अवधि जिसके दौरान साझेदार कमीशन का भुगतान किया जाता है",
    "admin.config.recruitCommission": "साझेदार कमीशन",
    "admin.config.recruitWindow": "साझेदार विंडो (महीने)",
    "admin.config.recruitWindowHelp": "साझेदार ट्रैकिंग अवधि"
  },
  'ar-sa': {
    "admin.bloggers.fixedCommissionsDesc": "10 دولارات لكل مكالمة • 5 دولارات لكل شريك • لا توجد مكافآت أو مستويات",
    "admin.chatterConfig.clientCommission": "عمولة لكل مكالمة (سنت)",
    "admin.chatterConfig.clientCommission.desc": "عمولة ثابتة لكل عميل يجري مكالمة مدفوعة",
    "admin.chatterConfig.recruitmentCommission": "عمولة لكل شريك (سنت)",
    "admin.chatterConfig.recruitmentCommission.desc": "عمولة لكل مكالمة يتلقاها شريك (6 أشهر)",
    "admin.chatterConfig.recruiterBonus": "مكافأة شريك تلقائية",
    "admin.chatterConfig.recruiterBonus.desc": "يتم دفع 50 دولارًا تلقائيًا للشريك عندما يصل المجند إلى 500 دولار من العمولات.",
    "admin.chatterConfig.recruitmentDuration": "مدة رابط الشريك (أشهر)",
    "admin.chatterConfig.recruitmentDuration.desc": "الفترة التي يتم خلالها دفع عمولات الشريك",
    "admin.config.recruitCommission": "عمولة الشريك",
    "admin.config.recruitWindow": "نافذة الشريك (أشهر)",
    "admin.config.recruitWindowHelp": "مدة تتبع الشريك"
  }
};

// Fonction pour mettre à jour un fichier JSON
function updateJsonFile(lang, newTranslations) {
  const filePath = path.join(LOCALES_DIR, lang, 'common.json');

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    let added = 0;

    for (const [key, value] of Object.entries(newTranslations)) {
      if (!data[key]) {
        data[key] = value;
        added++;
      }
    }

    if (added > 0) {
      // Trier les clés alphabétiquement
      const sortedData = Object.keys(data).sort().reduce((acc, key) => {
        acc[key] = data[key];
        return acc;
      }, {});

      fs.writeFileSync(filePath, JSON.stringify(sortedData, null, 2) + '\n', 'utf8');
      return added;
    }

    return 0;
  } catch (error) {
    console.error(`Erreur lors de la mise à jour de ${filePath}:`, error.message);
    return 0;
  }
}

// Main
let totalAdded = 0;

for (const [lang, newTranslations] of Object.entries(translations)) {
  const count = updateJsonFile(lang, newTranslations);
  if (count > 0) {
    console.log(`✅ ${lang}: ${count} clés ajoutées`);
    totalAdded += count;
  } else {
    console.log(`ℹ️  ${lang}: déjà à jour`);
  }
}

console.log(`\n🎉 Total: ${totalAdded} nouvelles traductions ajoutées sur 9 langues`);
