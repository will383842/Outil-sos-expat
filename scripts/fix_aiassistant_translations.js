const fs = require('fs');
const path = require('path');

// 1. Ajouter les clés aux fichiers de traduction
const basePath = path.join(__dirname, '../sos/src/helper');
const langs = ['fr', 'en', 'de', 'es', 'pt', 'ru', 'hi', 'ar', 'ch'];

const newTranslations = {
  'aiAssistant.status.active': {
    fr: 'Active', en: 'Active', de: 'Aktiv', es: 'Activa', pt: 'Ativa',
    ru: 'Активная', hi: 'सक्रिय', ar: 'نشط', ch: '活跃'
  },
  'aiAssistant.status.archived': {
    fr: 'Archivée', en: 'Archived', de: 'Archiviert', es: 'Archivada', pt: 'Arquivada',
    ru: 'Архивная', hi: 'संग्रहीत', ar: 'مؤرشف', ch: '已归档'
  },
  'aiAssistant.status.expired': {
    fr: 'Expirée', en: 'Expired', de: 'Abgelaufen', es: 'Expirada', pt: 'Expirada',
    ru: 'Истекшая', hi: 'समाप्त', ar: 'منتهي', ch: '已过期'
  },
  'aiAssistant.messages': {
    fr: 'messages', en: 'messages', de: 'Nachrichten', es: 'mensajes', pt: 'mensagens',
    ru: 'сообщений', hi: 'संदेश', ar: 'رسائل', ch: '消息'
  },
  'aiAssistant.timeAgo.minutes': {
    fr: 'il y a {{count}} min', en: '{{count}} min ago', de: 'vor {{count}} Min',
    es: 'hace {{count}} min', pt: 'há {{count}} min', ru: '{{count}} мин назад',
    hi: '{{count}} मिनट पहले', ar: 'منذ {{count}} دقيقة', ch: '{{count}}分钟前'
  },
  'aiAssistant.timeAgo.hours': {
    fr: 'il y a {{count}}h', en: '{{count}}h ago', de: 'vor {{count}}h',
    es: 'hace {{count}}h', pt: 'há {{count}}h', ru: '{{count}}ч назад',
    hi: '{{count}} घंटे पहले', ar: 'منذ {{count}} ساعة', ch: '{{count}}小时前'
  },
  'aiAssistant.timeAgo.days': {
    fr: 'il y a {{count}}j', en: '{{count}}d ago', de: 'vor {{count}}T',
    es: 'hace {{count}}d', pt: 'há {{count}}d', ru: '{{count}}д назад',
    hi: '{{count}} दिन पहले', ar: 'منذ {{count}} يوم', ch: '{{count}}天前'
  },
  'aiAssistant.feature.autoBooking': {
    fr: 'Réponses automatiques aux booking', en: 'Automatic booking responses',
    de: 'Automatische Buchungsantworten', es: 'Respuestas automáticas a reservas',
    pt: 'Respostas automáticas a reservas', ru: 'Автоматические ответы на бронирования',
    hi: 'स्वचालित बुकिंग जवाब', ar: 'ردود حجز تلقائية', ch: '自动预订回复'
  },
  'aiAssistant.feature.realTimeChat': {
    fr: 'Chat IA en temps réel', en: 'Real-time AI chat',
    de: 'Echtzeit-KI-Chat', es: 'Chat IA en tiempo real',
    pt: 'Chat IA em tempo real', ru: 'ИИ-чат в реальном времени',
    hi: 'रियल-टाइम एआई चैट', ar: 'دردشة ذكاء اصطناعي في الوقت الحقيقي', ch: '实时AI聊天'
  },
  'aiAssistant.feature.webSearch': {
    fr: 'Recherche web intégrée', en: 'Integrated web search',
    de: 'Integrierte Websuche', es: 'Búsqueda web integrada',
    pt: 'Pesquisa web integrada', ru: 'Встроенный веб-поиск',
    hi: 'एकीकृत वेब खोज', ar: 'بحث ويب متكامل', ch: '集成网络搜索'
  },
  'aiAssistant.feature.contextPreserved': {
    fr: 'Contexte client préservé', en: 'Client context preserved',
    de: 'Kundenkontext erhalten', es: 'Contexto del cliente preservado',
    pt: 'Contexto do cliente preservado', ru: 'Сохранение контекста клиента',
    hi: 'ग्राहक संदर्भ संरक्षित', ar: 'الحفاظ على سياق العميل', ch: '保留客户上下文'
  },
  'aiAssistant.conversationDuration': {
    fr: 'Durée des conversations', en: 'Conversation Duration',
    de: 'Gesprächsdauer', es: 'Duración de las conversaciones',
    pt: 'Duração das conversas', ru: 'Продолжительность разговоров',
    hi: 'बातचीत की अवधि', ar: 'مدة المحادثات', ch: '对话持续时间'
  }
};

// Charger et mettre à jour les fichiers de traduction
langs.forEach(lang => {
  const filePath = path.join(basePath, `${lang}.json`);
  const translations = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  Object.entries(newTranslations).forEach(([key, values]) => {
    if (values[lang]) {
      translations[key] = values[lang];
    }
  });

  // Trier et sauvegarder
  const sortedKeys = Object.keys(translations).sort();
  const sorted = {};
  sortedKeys.forEach(k => sorted[k] = translations[k]);
  fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2), 'utf-8');
});

console.log('✅ Traductions AiAssistant ajoutées aux fichiers JSON');

// 2. Modifier AiAssistant/Index.tsx
const aiPath = path.join(__dirname, '../sos/src/pages/Dashboard/AiAssistant/Index.tsx');
let content = fs.readFileSync(aiPath, 'utf-8');

// Remplacer les statuts
content = content.replace(
  "{conversation.status === 'active' && (locale === 'fr' ? 'Active' : 'Active')}",
  "{conversation.status === 'active' && t('aiAssistant.status.active')}"
);
content = content.replace(
  "{conversation.status === 'archived' && (locale === 'fr' ? 'Archivée' : 'Archived')}",
  "{conversation.status === 'archived' && t('aiAssistant.status.archived')}"
);
content = content.replace(
  "{conversation.status === 'expired' && (locale === 'fr' ? 'Expirée' : 'Expired')}",
  "{conversation.status === 'expired' && t('aiAssistant.status.expired')}"
);

// Remplacer "messages"
content = content.replace(
  "{conversation.messageCount} {locale === 'fr' ? 'messages' : 'messages'}",
  "{conversation.messageCount} {t('aiAssistant.messages')}"
);

// Remplacer les features
content = content.replace(
  "{locale === 'fr' ? 'Réponses automatiques aux booking' : 'Automatic booking responses'}",
  "{t('aiAssistant.feature.autoBooking')}"
);
content = content.replace(
  "{locale === 'fr' ? 'Chat IA en temps réel' : 'Real-time AI chat'}",
  "{t('aiAssistant.feature.realTimeChat')}"
);
content = content.replace(
  "{locale === 'fr' ? 'Recherche web intégrée' : 'Integrated web search'}",
  "{t('aiAssistant.feature.webSearch')}"
);
content = content.replace(
  "{locale === 'fr' ? 'Contexte client préservé' : 'Client context preserved'}",
  "{t('aiAssistant.feature.contextPreserved')}"
);

// Remplacer la fonction getTimeAgo
const oldTimeAgoFunction = `function getTimeAgo(date: Date, locale: string): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) {
    return locale === 'fr' ? \`il y a \${diffMins} min\` : \`\${diffMins} min ago\`;
  } else if (diffHours < 24) {
    return locale === 'fr' ? \`il y a \${diffHours}h\` : \`\${diffHours}h ago\`;
  } else if (diffDays < 7) {
    return locale === 'fr' ? \`il y a \${diffDays}j\` : \`\${diffDays}d ago\`;
  } else {
    return date.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
      day: 'numeric',
      month: 'short'
    });
  }
}`;

const newTimeAgoFunction = `function getTimeAgo(date: Date, locale: string, t: (key: string, options?: { count: number }) => string): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) {
    return t('aiAssistant.timeAgo.minutes', { count: diffMins }).replace('{{count}}', String(diffMins));
  } else if (diffHours < 24) {
    return t('aiAssistant.timeAgo.hours', { count: diffHours }).replace('{{count}}', String(diffHours));
  } else if (diffDays < 7) {
    return t('aiAssistant.timeAgo.days', { count: diffDays }).replace('{{count}}', String(diffDays));
  } else {
    return date.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
      day: 'numeric',
      month: 'short'
    });
  }
}`;

content = content.replace(oldTimeAgoFunction, newTimeAgoFunction);

// Mettre à jour les appels à getTimeAgo pour passer t
content = content.replace(
  /getTimeAgo\(([^,]+),\s*locale\)/g,
  'getTimeAgo($1, locale, t)'
);

// Remplacer Durée des conversations
content = content.replace(
  "{locale === 'fr' ? 'Durée des conversations' : 'Conversation Duration'}",
  "{t('aiAssistant.conversationDuration')}"
);

fs.writeFileSync(aiPath, content, 'utf-8');
console.log('✅ AiAssistant/Index.tsx mis à jour avec les traductions');
