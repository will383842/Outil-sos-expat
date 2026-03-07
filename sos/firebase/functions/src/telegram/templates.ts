/**
 * Telegram Notification Templates — i18n (9 languages)
 *
 * Templates use Mustache-style placeholders ({{VARIABLE}}) that are
 * replaced with actual values when sending notifications.
 *
 * Supported languages: fr, en, es, de, pt, ru, zh, hi, ar
 */

// ============================================================================
// TYPES
// ============================================================================

export type TelegramEventType =
  | 'new_registration'
  | 'call_completed'
  | 'payment_received'
  | 'daily_report'
  | 'new_provider'
  | 'new_contact_message'
  | 'negative_review'
  | 'security_alert'
  | 'withdrawal_request'
  | 'captain_application';

export type SupportedLanguage = 'fr' | 'en' | 'es' | 'de' | 'pt' | 'ru' | 'zh' | 'hi' | 'ar';

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['fr', 'en', 'es', 'de', 'pt', 'ru', 'zh', 'hi', 'ar'];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'fr';

export interface NotificationTemplate {
  template: string;
  description: string;
}

export interface TelegramNotificationConfig {
  enabled: boolean;
  botTokenSecretName: string;
  defaultChatId: string;
  notifyNewRegistration: boolean;
  notifyCallCompleted: boolean;
  notifyPaymentReceived: boolean;
  notifyDailyReport: boolean;
  dailyReportHour: number;
  updatedAt: string;
  updatedBy: string;
}

// ============================================================================
// i18n TEMPLATES — 9 languages
// ============================================================================

type I18nTemplates = Record<SupportedLanguage, Record<TelegramEventType, NotificationTemplate>>;

export const I18N_TEMPLATES: I18nTemplates = {
  // ==================== FRENCH ====================
  fr: {
    new_registration: {
      template: `🆕 *Nouvelle inscription*

👤 Rôle: {{ROLE}}
📧 Email: {{EMAIL}}
📱 Téléphone: {{PHONE}}
🌍 Pays: {{COUNTRY}}
📅 {{DATE}} à {{TIME}}`,
      description: 'Notification lors d\'une nouvelle inscription',
    },
    call_completed: {
      template: `📞 *Appel terminé*

👤 Client: {{CLIENT_NAME}}
🎯 Prestataire: {{PROVIDER_NAME}} ({{PROVIDER_TYPE}})
⏱️ Durée: {{DURATION_MINUTES}} min
📅 {{DATE}} à {{TIME}}`,
      description: 'Notification lorsqu\'un appel est terminé',
    },
    payment_received: {
      template: `💰 *Paiement reçu*

💵 CA Total: {{TOTAL_AMOUNT}}€
🏢 Commission SOS Expat: {{COMMISSION_AMOUNT}}€
📅 {{DATE}} à {{TIME}}`,
      description: 'Notification lors de la réception d\'un paiement',
    },
    daily_report: {
      template: `📊 *Rapport quotidien — {{DATE}}*

💰 *Chiffre d'affaires*
   CA Total: {{DAILY_CA}}€
   Commission SOS Expat: {{DAILY_COMMISSION}}€

📈 *Activité du jour*
   📝 Inscriptions: {{REGISTRATION_COUNT}}
   📞 Appels: {{CALL_COUNT}}

🕐 Généré à {{TIME}} (Paris)`,
      description: 'Rapport quotidien avec les statistiques',
    },
    new_provider: {
      template: `👨‍⚖️ *Nouveau prestataire*

👤 {{PROVIDER_NAME}}
🎯 Type: {{PROVIDER_TYPE}}
📧 {{EMAIL}}
📱 {{PHONE}}
🌍 {{COUNTRY}}

⏳ En attente de validation
📅 {{DATE}} à {{TIME}}`,
      description: 'Notification lors de l\'inscription d\'un nouveau prestataire',
    },
    new_contact_message: {
      template: `📩 *Nouveau message contact*

👤 De: {{SENDER_NAME}}
📧 {{SENDER_EMAIL}}
📝 Sujet: {{SUBJECT}}

💬 {{MESSAGE_PREVIEW}}

📅 {{DATE}} à {{TIME}}`,
      description: 'Notification lors de la réception d\'un message contact',
    },
    negative_review: {
      template: `⚠️ *Avis négatif reçu*

⭐ Note: {{RATING}}/5
👤 Client: {{CLIENT_NAME}}
🎯 Prestataire: {{PROVIDER_NAME}}

💬 {{COMMENT_PREVIEW}}

📅 {{DATE}} à {{TIME}}`,
      description: 'Notification lorsqu\'un prestataire reçoit un avis négatif',
    },
    security_alert: {
      template: `🔐 *Alerte sécurité*

🚨 Type: {{ALERT_TYPE}}
👤 Compte: {{USER_EMAIL}}
🌍 Localisation: {{COUNTRY}}
🔗 IP: {{IP_ADDRESS}}

📋 {{DETAILS}}

📅 {{DATE}} à {{TIME}}`,
      description: 'Notification lors de la détection d\'une activité suspecte',
    },
    withdrawal_request: {
      template: `💳 *Demande de retrait*

👤 {{USER_NAME}} ({{USER_TYPE}})
💰 Montant: {{AMOUNT}}€
🏦 Via: {{PAYMENT_METHOD}}

📅 {{DATE}} à {{TIME}}`,
      description: 'Notification lors d\'une demande de retrait',
    },
    captain_application: {
      template: `\u{1F451} *Candidature Captain Chatter*

\u{1F464} {{CANDIDATE_NAME}}
\u{1F4F1} WhatsApp: {{WHATSAPP}}
\u{1F30D} Pays: {{COUNTRY}}
\u{1F4CE} CV: {{HAS_CV}}

\u{1F4AC} {{MOTIVATION_PREVIEW}}

\u{1F4C5} {{DATE}} \u00e0 {{TIME}}`,
      description: 'Notification lors d\'une candidature Captain Chatter',
    },
  },

  // ==================== ENGLISH ====================
  en: {
    new_registration: {
      template: `🆕 *New Registration*

👤 Role: {{ROLE}}
📧 Email: {{EMAIL}}
📱 Phone: {{PHONE}}
🌍 Country: {{COUNTRY}}
📅 {{DATE}} at {{TIME}}`,
      description: 'Notification when a new user registers',
    },
    call_completed: {
      template: `📞 *Call Completed*

👤 Client: {{CLIENT_NAME}}
🎯 Provider: {{PROVIDER_NAME}} ({{PROVIDER_TYPE}})
⏱️ Duration: {{DURATION_MINUTES}} min
📅 {{DATE}} at {{TIME}}`,
      description: 'Notification when a call is completed',
    },
    payment_received: {
      template: `💰 *Payment Received*

💵 Total Revenue: {{TOTAL_AMOUNT}}€
🏢 SOS Expat Commission: {{COMMISSION_AMOUNT}}€
📅 {{DATE}} at {{TIME}}`,
      description: 'Notification when a payment is received',
    },
    daily_report: {
      template: `📊 *Daily Report — {{DATE}}*

💰 *Revenue*
   Total Revenue: {{DAILY_CA}}€
   SOS Expat Commission: {{DAILY_COMMISSION}}€

📈 *Today's Activity*
   📝 Registrations: {{REGISTRATION_COUNT}}
   📞 Calls: {{CALL_COUNT}}

🕐 Generated at {{TIME}} (Paris)`,
      description: 'Daily report with statistics',
    },
    new_provider: {
      template: `👨‍⚖️ *New Provider*

👤 {{PROVIDER_NAME}}
🎯 Type: {{PROVIDER_TYPE}}
📧 {{EMAIL}}
📱 {{PHONE}}
🌍 {{COUNTRY}}

⏳ Awaiting validation
📅 {{DATE}} at {{TIME}}`,
      description: 'Notification when a new provider registers',
    },
    new_contact_message: {
      template: `📩 *New Contact Message*

👤 From: {{SENDER_NAME}}
📧 {{SENDER_EMAIL}}
📝 Subject: {{SUBJECT}}

💬 {{MESSAGE_PREVIEW}}

📅 {{DATE}} at {{TIME}}`,
      description: 'Notification when a contact message is received',
    },
    negative_review: {
      template: `⚠️ *Negative Review Received*

⭐ Rating: {{RATING}}/5
👤 Client: {{CLIENT_NAME}}
🎯 Provider: {{PROVIDER_NAME}}

💬 {{COMMENT_PREVIEW}}

📅 {{DATE}} at {{TIME}}`,
      description: 'Notification when a provider receives a negative review',
    },
    security_alert: {
      template: `🔐 *Security Alert*

🚨 Type: {{ALERT_TYPE}}
👤 Account: {{USER_EMAIL}}
🌍 Location: {{COUNTRY}}
🔗 IP: {{IP_ADDRESS}}

📋 {{DETAILS}}

📅 {{DATE}} at {{TIME}}`,
      description: 'Notification when suspicious activity is detected',
    },
    withdrawal_request: {
      template: `💳 *Withdrawal Request*

👤 {{USER_NAME}} ({{USER_TYPE}})
💰 Amount: {{AMOUNT}}€
🏦 Via: {{PAYMENT_METHOD}}

📅 {{DATE}} at {{TIME}}`,
      description: 'Notification when a withdrawal is requested',
    },
    captain_application: {
      template: `\u{1F451} *Captain Chatter Application*

\u{1F464} {{CANDIDATE_NAME}}
\u{1F4F1} WhatsApp: {{WHATSAPP}}
\u{1F30D} Country: {{COUNTRY}}
\u{1F4CE} CV: {{HAS_CV}}

\u{1F4AC} {{MOTIVATION_PREVIEW}}

\u{1F4C5} {{DATE}} at {{TIME}}`,
      description: 'Notification when a Captain Chatter application is received',
    },
  },

  // ==================== SPANISH ====================
  es: {
    new_registration: {
      template: `🆕 *Nueva inscripción*

👤 Rol: {{ROLE}}
📧 Email: {{EMAIL}}
📱 Teléfono: {{PHONE}}
🌍 País: {{COUNTRY}}
📅 {{DATE}} a las {{TIME}}`,
      description: 'Notificación de nueva inscripción',
    },
    call_completed: {
      template: `📞 *Llamada completada*

👤 Cliente: {{CLIENT_NAME}}
🎯 Proveedor: {{PROVIDER_NAME}} ({{PROVIDER_TYPE}})
⏱️ Duración: {{DURATION_MINUTES}} min
📅 {{DATE}} a las {{TIME}}`,
      description: 'Notificación de llamada completada',
    },
    payment_received: {
      template: `💰 *Pago recibido*

💵 Ingresos totales: {{TOTAL_AMOUNT}}€
🏢 Comisión SOS Expat: {{COMMISSION_AMOUNT}}€
📅 {{DATE}} a las {{TIME}}`,
      description: 'Notificación de pago recibido',
    },
    daily_report: {
      template: `📊 *Informe diario — {{DATE}}*

💰 *Ingresos*
   Total: {{DAILY_CA}}€
   Comisión SOS Expat: {{DAILY_COMMISSION}}€

📈 *Actividad del día*
   📝 Inscripciones: {{REGISTRATION_COUNT}}
   📞 Llamadas: {{CALL_COUNT}}

🕐 Generado a las {{TIME}} (París)`,
      description: 'Informe diario con estadísticas',
    },
    new_provider: {
      template: `👨‍⚖️ *Nuevo proveedor*

👤 {{PROVIDER_NAME}}
🎯 Tipo: {{PROVIDER_TYPE}}
📧 {{EMAIL}}
📱 {{PHONE}}
🌍 {{COUNTRY}}

⏳ Pendiente de validación
📅 {{DATE}} a las {{TIME}}`,
      description: 'Notificación de nuevo proveedor',
    },
    new_contact_message: {
      template: `📩 *Nuevo mensaje de contacto*

👤 De: {{SENDER_NAME}}
📧 {{SENDER_EMAIL}}
📝 Asunto: {{SUBJECT}}

💬 {{MESSAGE_PREVIEW}}

📅 {{DATE}} a las {{TIME}}`,
      description: 'Notificación de nuevo mensaje de contacto',
    },
    negative_review: {
      template: `⚠️ *Reseña negativa*

⭐ Nota: {{RATING}}/5
👤 Cliente: {{CLIENT_NAME}}
🎯 Proveedor: {{PROVIDER_NAME}}

💬 {{COMMENT_PREVIEW}}

📅 {{DATE}} a las {{TIME}}`,
      description: 'Notificación de reseña negativa',
    },
    security_alert: {
      template: `🔐 *Alerta de seguridad*

🚨 Tipo: {{ALERT_TYPE}}
👤 Cuenta: {{USER_EMAIL}}
🌍 Ubicación: {{COUNTRY}}
🔗 IP: {{IP_ADDRESS}}

📋 {{DETAILS}}

📅 {{DATE}} a las {{TIME}}`,
      description: 'Notificación de actividad sospechosa',
    },
    withdrawal_request: {
      template: `💳 *Solicitud de retiro*

👤 {{USER_NAME}} ({{USER_TYPE}})
💰 Monto: {{AMOUNT}}€
🏦 Vía: {{PAYMENT_METHOD}}

📅 {{DATE}} a las {{TIME}}`,
      description: 'Notificación de solicitud de retiro',
    },
    captain_application: {
      template: `\u{1F451} *Candidatura Captain Chatter*

\u{1F464} {{CANDIDATE_NAME}}
\u{1F4F1} WhatsApp: {{WHATSAPP}}
\u{1F30D} Pa\u00eds: {{COUNTRY}}
\u{1F4CE} CV: {{HAS_CV}}

\u{1F4AC} {{MOTIVATION_PREVIEW}}

\u{1F4C5} {{DATE}} a las {{TIME}}`,
      description: 'Notificaci\u00f3n de candidatura Captain Chatter',
    },
  },

  // ==================== GERMAN ====================
  de: {
    new_registration: {
      template: `🆕 *Neue Anmeldung*

👤 Rolle: {{ROLE}}
📧 E-Mail: {{EMAIL}}
📱 Telefon: {{PHONE}}
🌍 Land: {{COUNTRY}}
📅 {{DATE}} um {{TIME}}`,
      description: 'Benachrichtigung bei neuer Anmeldung',
    },
    call_completed: {
      template: `📞 *Anruf beendet*

👤 Kunde: {{CLIENT_NAME}}
🎯 Anbieter: {{PROVIDER_NAME}} ({{PROVIDER_TYPE}})
⏱️ Dauer: {{DURATION_MINUTES}} Min.
📅 {{DATE}} um {{TIME}}`,
      description: 'Benachrichtigung bei beendetem Anruf',
    },
    payment_received: {
      template: `💰 *Zahlung erhalten*

💵 Gesamtumsatz: {{TOTAL_AMOUNT}}€
🏢 SOS Expat Provision: {{COMMISSION_AMOUNT}}€
📅 {{DATE}} um {{TIME}}`,
      description: 'Benachrichtigung bei Zahlungseingang',
    },
    daily_report: {
      template: `📊 *Tagesbericht — {{DATE}}*

💰 *Umsatz*
   Gesamt: {{DAILY_CA}}€
   SOS Expat Provision: {{DAILY_COMMISSION}}€

📈 *Tagesaktivität*
   📝 Anmeldungen: {{REGISTRATION_COUNT}}
   📞 Anrufe: {{CALL_COUNT}}

🕐 Erstellt um {{TIME}} (Paris)`,
      description: 'Tagesbericht mit Statistiken',
    },
    new_provider: {
      template: `👨‍⚖️ *Neuer Anbieter*

👤 {{PROVIDER_NAME}}
🎯 Typ: {{PROVIDER_TYPE}}
📧 {{EMAIL}}
📱 {{PHONE}}
🌍 {{COUNTRY}}

⏳ Wartet auf Validierung
📅 {{DATE}} um {{TIME}}`,
      description: 'Benachrichtigung bei neuem Anbieter',
    },
    new_contact_message: {
      template: `📩 *Neue Kontaktnachricht*

👤 Von: {{SENDER_NAME}}
📧 {{SENDER_EMAIL}}
📝 Betreff: {{SUBJECT}}

💬 {{MESSAGE_PREVIEW}}

📅 {{DATE}} um {{TIME}}`,
      description: 'Benachrichtigung bei neuer Kontaktnachricht',
    },
    negative_review: {
      template: `⚠️ *Negative Bewertung*

⭐ Bewertung: {{RATING}}/5
👤 Kunde: {{CLIENT_NAME}}
🎯 Anbieter: {{PROVIDER_NAME}}

💬 {{COMMENT_PREVIEW}}

📅 {{DATE}} um {{TIME}}`,
      description: 'Benachrichtigung bei negativer Bewertung',
    },
    security_alert: {
      template: `🔐 *Sicherheitswarnung*

🚨 Typ: {{ALERT_TYPE}}
👤 Konto: {{USER_EMAIL}}
🌍 Standort: {{COUNTRY}}
🔗 IP: {{IP_ADDRESS}}

📋 {{DETAILS}}

📅 {{DATE}} um {{TIME}}`,
      description: 'Benachrichtigung bei verdächtiger Aktivität',
    },
    withdrawal_request: {
      template: `💳 *Auszahlungsantrag*

👤 {{USER_NAME}} ({{USER_TYPE}})
💰 Betrag: {{AMOUNT}}€
🏦 Über: {{PAYMENT_METHOD}}

📅 {{DATE}} um {{TIME}}`,
      description: 'Benachrichtigung bei Auszahlungsantrag',
    },
    captain_application: {
      template: `\u{1F451} *Captain Chatter Bewerbung*

\u{1F464} {{CANDIDATE_NAME}}
\u{1F4F1} WhatsApp: {{WHATSAPP}}
\u{1F30D} Land: {{COUNTRY}}
\u{1F4CE} CV: {{HAS_CV}}

\u{1F4AC} {{MOTIVATION_PREVIEW}}

\u{1F4C5} {{DATE}} um {{TIME}}`,
      description: 'Benachrichtigung bei Captain Chatter Bewerbung',
    },
  },

  // ==================== PORTUGUESE ====================
  pt: {
    new_registration: {
      template: `🆕 *Nova inscrição*

👤 Função: {{ROLE}}
📧 Email: {{EMAIL}}
📱 Telefone: {{PHONE}}
🌍 País: {{COUNTRY}}
📅 {{DATE}} às {{TIME}}`,
      description: 'Notificação de nova inscrição',
    },
    call_completed: {
      template: `📞 *Chamada concluída*

👤 Cliente: {{CLIENT_NAME}}
🎯 Prestador: {{PROVIDER_NAME}} ({{PROVIDER_TYPE}})
⏱️ Duração: {{DURATION_MINUTES}} min
📅 {{DATE}} às {{TIME}}`,
      description: 'Notificação de chamada concluída',
    },
    payment_received: {
      template: `💰 *Pagamento recebido*

💵 Receita total: {{TOTAL_AMOUNT}}€
🏢 Comissão SOS Expat: {{COMMISSION_AMOUNT}}€
📅 {{DATE}} às {{TIME}}`,
      description: 'Notificação de pagamento recebido',
    },
    daily_report: {
      template: `📊 *Relatório diário — {{DATE}}*

💰 *Receita*
   Total: {{DAILY_CA}}€
   Comissão SOS Expat: {{DAILY_COMMISSION}}€

📈 *Atividade do dia*
   📝 Inscrições: {{REGISTRATION_COUNT}}
   📞 Chamadas: {{CALL_COUNT}}

🕐 Gerado às {{TIME}} (Paris)`,
      description: 'Relatório diário com estatísticas',
    },
    new_provider: {
      template: `👨‍⚖️ *Novo prestador*

👤 {{PROVIDER_NAME}}
🎯 Tipo: {{PROVIDER_TYPE}}
📧 {{EMAIL}}
📱 {{PHONE}}
🌍 {{COUNTRY}}

⏳ Aguardando validação
📅 {{DATE}} às {{TIME}}`,
      description: 'Notificação de novo prestador',
    },
    new_contact_message: {
      template: `📩 *Nova mensagem de contato*

👤 De: {{SENDER_NAME}}
📧 {{SENDER_EMAIL}}
📝 Assunto: {{SUBJECT}}

💬 {{MESSAGE_PREVIEW}}

📅 {{DATE}} às {{TIME}}`,
      description: 'Notificação de nova mensagem de contato',
    },
    negative_review: {
      template: `⚠️ *Avaliação negativa*

⭐ Nota: {{RATING}}/5
👤 Cliente: {{CLIENT_NAME}}
🎯 Prestador: {{PROVIDER_NAME}}

💬 {{COMMENT_PREVIEW}}

📅 {{DATE}} às {{TIME}}`,
      description: 'Notificação de avaliação negativa',
    },
    security_alert: {
      template: `🔐 *Alerta de segurança*

🚨 Tipo: {{ALERT_TYPE}}
👤 Conta: {{USER_EMAIL}}
🌍 Localização: {{COUNTRY}}
🔗 IP: {{IP_ADDRESS}}

📋 {{DETAILS}}

📅 {{DATE}} às {{TIME}}`,
      description: 'Notificação de atividade suspeita',
    },
    withdrawal_request: {
      template: `💳 *Pedido de saque*

👤 {{USER_NAME}} ({{USER_TYPE}})
💰 Valor: {{AMOUNT}}€
🏦 Via: {{PAYMENT_METHOD}}

📅 {{DATE}} às {{TIME}}`,
      description: 'Notifica\u00e7\u00e3o de pedido de saque',
    },
    captain_application: {
      template: `\u{1F451} *Candidatura Captain Chatter*

\u{1F464} {{CANDIDATE_NAME}}
\u{1F4F1} WhatsApp: {{WHATSAPP}}
\u{1F30D} Pa\u00eds: {{COUNTRY}}
\u{1F4CE} CV: {{HAS_CV}}

\u{1F4AC} {{MOTIVATION_PREVIEW}}

\u{1F4C5} {{DATE}} \u00e0s {{TIME}}`,
      description: 'Notifica\u00e7\u00e3o de candidatura Captain Chatter',
    },
  },

  // ==================== RUSSIAN ====================
  ru: {
    new_registration: {
      template: `🆕 *Новая регистрация*

👤 Роль: {{ROLE}}
📧 Email: {{EMAIL}}
📱 Телефон: {{PHONE}}
🌍 Страна: {{COUNTRY}}
📅 {{DATE}} в {{TIME}}`,
      description: 'Уведомление о новой регистрации',
    },
    call_completed: {
      template: `📞 *Звонок завершён*

👤 Клиент: {{CLIENT_NAME}}
🎯 Провайдер: {{PROVIDER_NAME}} ({{PROVIDER_TYPE}})
⏱️ Длительность: {{DURATION_MINUTES}} мин
📅 {{DATE}} в {{TIME}}`,
      description: 'Уведомление о завершённом звонке',
    },
    payment_received: {
      template: `💰 *Платёж получен*

💵 Общая выручка: {{TOTAL_AMOUNT}}€
🏢 Комиссия SOS Expat: {{COMMISSION_AMOUNT}}€
📅 {{DATE}} в {{TIME}}`,
      description: 'Уведомление о полученном платеже',
    },
    daily_report: {
      template: `📊 *Ежедневный отчёт — {{DATE}}*

💰 *Выручка*
   Итого: {{DAILY_CA}}€
   Комиссия SOS Expat: {{DAILY_COMMISSION}}€

📈 *Активность за день*
   📝 Регистрации: {{REGISTRATION_COUNT}}
   📞 Звонки: {{CALL_COUNT}}

🕐 Сформировано в {{TIME}} (Париж)`,
      description: 'Ежедневный отчёт со статистикой',
    },
    new_provider: {
      template: `👨‍⚖️ *Новый провайдер*

👤 {{PROVIDER_NAME}}
🎯 Тип: {{PROVIDER_TYPE}}
📧 {{EMAIL}}
📱 {{PHONE}}
🌍 {{COUNTRY}}

⏳ Ожидает проверки
📅 {{DATE}} в {{TIME}}`,
      description: 'Уведомление о новом провайдере',
    },
    new_contact_message: {
      template: `📩 *Новое сообщение*

👤 От: {{SENDER_NAME}}
📧 {{SENDER_EMAIL}}
📝 Тема: {{SUBJECT}}

💬 {{MESSAGE_PREVIEW}}

📅 {{DATE}} в {{TIME}}`,
      description: 'Уведомление о новом сообщении',
    },
    negative_review: {
      template: `⚠️ *Негативный отзыв*

⭐ Оценка: {{RATING}}/5
👤 Клиент: {{CLIENT_NAME}}
🎯 Провайдер: {{PROVIDER_NAME}}

💬 {{COMMENT_PREVIEW}}

📅 {{DATE}} в {{TIME}}`,
      description: 'Уведомление о негативном отзыве',
    },
    security_alert: {
      template: `🔐 *Предупреждение безопасности*

🚨 Тип: {{ALERT_TYPE}}
👤 Аккаунт: {{USER_EMAIL}}
🌍 Местоположение: {{COUNTRY}}
🔗 IP: {{IP_ADDRESS}}

📋 {{DETAILS}}

📅 {{DATE}} в {{TIME}}`,
      description: 'Уведомление о подозрительной активности',
    },
    withdrawal_request: {
      template: `💳 *Запрос на вывод*

👤 {{USER_NAME}} ({{USER_TYPE}})
💰 Сумма: {{AMOUNT}}€
🏦 Через: {{PAYMENT_METHOD}}

📅 {{DATE}} в {{TIME}}`,
      description: '\u0423\u0432\u0435\u0434\u043e\u043c\u043b\u0435\u043d\u0438\u0435 \u043e \u0437\u0430\u043f\u0440\u043e\u0441\u0435 \u043d\u0430 \u0432\u044b\u0432\u043e\u0434 \u0441\u0440\u0435\u0434\u0441\u0442\u0432',
    },
    captain_application: {
      template: `\u{1F451} *\u0417\u0430\u044f\u0432\u043a\u0430 Captain Chatter*

\u{1F464} {{CANDIDATE_NAME}}
\u{1F4F1} WhatsApp: {{WHATSAPP}}
\u{1F30D} \u0421\u0442\u0440\u0430\u043d\u0430: {{COUNTRY}}
\u{1F4CE} CV: {{HAS_CV}}

\u{1F4AC} {{MOTIVATION_PREVIEW}}

\u{1F4C5} {{DATE}} \u0432 {{TIME}}`,
      description: '\u0423\u0432\u0435\u0434\u043e\u043c\u043b\u0435\u043d\u0438\u0435 \u043e \u0437\u0430\u044f\u0432\u043a\u0435 Captain Chatter',
    },
  },

  // ==================== CHINESE ====================
  zh: {
    new_registration: {
      template: `🆕 *新用户注册*

👤 角色: {{ROLE}}
📧 邮箱: {{EMAIL}}
📱 电话: {{PHONE}}
🌍 国家: {{COUNTRY}}
📅 {{DATE}} {{TIME}}`,
      description: '新用户注册通知',
    },
    call_completed: {
      template: `📞 *通话结束*

👤 客户: {{CLIENT_NAME}}
🎯 服务商: {{PROVIDER_NAME}} ({{PROVIDER_TYPE}})
⏱️ 时长: {{DURATION_MINUTES}} 分钟
📅 {{DATE}} {{TIME}}`,
      description: '通话完成通知',
    },
    payment_received: {
      template: `💰 *收到付款*

💵 总收入: {{TOTAL_AMOUNT}}€
🏢 SOS Expat 佣金: {{COMMISSION_AMOUNT}}€
📅 {{DATE}} {{TIME}}`,
      description: '收到付款通知',
    },
    daily_report: {
      template: `📊 *每日报告 — {{DATE}}*

💰 *收入*
   总计: {{DAILY_CA}}€
   SOS Expat 佣金: {{DAILY_COMMISSION}}€

📈 *今日活动*
   📝 注册: {{REGISTRATION_COUNT}}
   📞 通话: {{CALL_COUNT}}

🕐 生成于 {{TIME}} (巴黎)`,
      description: '每日统计报告',
    },
    new_provider: {
      template: `👨‍⚖️ *新服务商*

👤 {{PROVIDER_NAME}}
🎯 类型: {{PROVIDER_TYPE}}
📧 {{EMAIL}}
📱 {{PHONE}}
🌍 {{COUNTRY}}

⏳ 等待验证
📅 {{DATE}} {{TIME}}`,
      description: '新服务商注册通知',
    },
    new_contact_message: {
      template: `📩 *新联系消息*

👤 发件人: {{SENDER_NAME}}
📧 {{SENDER_EMAIL}}
📝 主题: {{SUBJECT}}

💬 {{MESSAGE_PREVIEW}}

📅 {{DATE}} {{TIME}}`,
      description: '新联系消息通知',
    },
    negative_review: {
      template: `⚠️ *差评*

⭐ 评分: {{RATING}}/5
👤 客户: {{CLIENT_NAME}}
🎯 服务商: {{PROVIDER_NAME}}

💬 {{COMMENT_PREVIEW}}

📅 {{DATE}} {{TIME}}`,
      description: '差评通知',
    },
    security_alert: {
      template: `🔐 *安全警报*

🚨 类型: {{ALERT_TYPE}}
👤 账户: {{USER_EMAIL}}
🌍 位置: {{COUNTRY}}
🔗 IP: {{IP_ADDRESS}}

📋 {{DETAILS}}

📅 {{DATE}} {{TIME}}`,
      description: '可疑活动警报',
    },
    withdrawal_request: {
      template: `💳 *提现请求*

👤 {{USER_NAME}} ({{USER_TYPE}})
💰 金额: {{AMOUNT}}€
🏦 通过: {{PAYMENT_METHOD}}

📅 {{DATE}} {{TIME}}`,
      description: '\u63d0\u73b0\u8bf7\u6c42\u901a\u77e5',
    },
    captain_application: {
      template: `\u{1F451} *Captain Chatter \u7533\u8bf7*

\u{1F464} {{CANDIDATE_NAME}}
\u{1F4F1} WhatsApp: {{WHATSAPP}}
\u{1F30D} \u56fd\u5bb6: {{COUNTRY}}
\u{1F4CE} CV: {{HAS_CV}}

\u{1F4AC} {{MOTIVATION_PREVIEW}}

\u{1F4C5} {{DATE}} {{TIME}}`,
      description: 'Captain Chatter \u7533\u8bf7\u901a\u77e5',
    },
  },

  // ==================== HINDI ====================
  hi: {
    new_registration: {
      template: `🆕 *नया पंजीकरण*

👤 भूमिका: {{ROLE}}
📧 ईमेल: {{EMAIL}}
📱 फ़ोन: {{PHONE}}
🌍 देश: {{COUNTRY}}
📅 {{DATE}} {{TIME}} पर`,
      description: 'नए पंजीकरण की सूचना',
    },
    call_completed: {
      template: `📞 *कॉल पूरी हुई*

👤 ग्राहक: {{CLIENT_NAME}}
🎯 प्रदाता: {{PROVIDER_NAME}} ({{PROVIDER_TYPE}})
⏱️ अवधि: {{DURATION_MINUTES}} मिनट
📅 {{DATE}} {{TIME}} पर`,
      description: 'कॉल पूरी होने की सूचना',
    },
    payment_received: {
      template: `💰 *भुगतान प्राप्त*

💵 कुल राजस्व: {{TOTAL_AMOUNT}}€
🏢 SOS Expat कमीशन: {{COMMISSION_AMOUNT}}€
📅 {{DATE}} {{TIME}} पर`,
      description: 'भुगतान प्राप्त होने की सूचना',
    },
    daily_report: {
      template: `📊 *दैनिक रिपोर्ट — {{DATE}}*

💰 *राजस्व*
   कुल: {{DAILY_CA}}€
   SOS Expat कमीशन: {{DAILY_COMMISSION}}€

📈 *आज की गतिविधि*
   📝 पंजीकरण: {{REGISTRATION_COUNT}}
   📞 कॉल: {{CALL_COUNT}}

🕐 {{TIME}} पर बनाया गया (पेरिस)`,
      description: 'दैनिक सांख्यिकी रिपोर्ट',
    },
    new_provider: {
      template: `👨‍⚖️ *नया प्रदाता*

👤 {{PROVIDER_NAME}}
🎯 प्रकार: {{PROVIDER_TYPE}}
📧 {{EMAIL}}
📱 {{PHONE}}
🌍 {{COUNTRY}}

⏳ सत्यापन की प्रतीक्षा
📅 {{DATE}} {{TIME}} पर`,
      description: 'नए प्रदाता की सूचना',
    },
    new_contact_message: {
      template: `📩 *नया संपर्क संदेश*

👤 प्रेषक: {{SENDER_NAME}}
📧 {{SENDER_EMAIL}}
📝 विषय: {{SUBJECT}}

💬 {{MESSAGE_PREVIEW}}

📅 {{DATE}} {{TIME}} पर`,
      description: 'नए संपर्क संदेश की सूचना',
    },
    negative_review: {
      template: `⚠️ *नकारात्मक समीक्षा*

⭐ रेटिंग: {{RATING}}/5
👤 ग्राहक: {{CLIENT_NAME}}
🎯 प्रदाता: {{PROVIDER_NAME}}

💬 {{COMMENT_PREVIEW}}

📅 {{DATE}} {{TIME}} पर`,
      description: 'नकारात्मक समीक्षा की सूचना',
    },
    security_alert: {
      template: `🔐 *सुरक्षा चेतावनी*

🚨 प्रकार: {{ALERT_TYPE}}
👤 खाता: {{USER_EMAIL}}
🌍 स्थान: {{COUNTRY}}
🔗 IP: {{IP_ADDRESS}}

📋 {{DETAILS}}

📅 {{DATE}} {{TIME}} पर`,
      description: 'संदिग्ध गतिविधि की चेतावनी',
    },
    withdrawal_request: {
      template: `💳 *निकासी अनुरोध*

👤 {{USER_NAME}} ({{USER_TYPE}})
💰 राशि: {{AMOUNT}}€
🏦 माध्यम: {{PAYMENT_METHOD}}

📅 {{DATE}} {{TIME}} पर`,
      description: '\u0928\u093f\u0915\u093e\u0938\u0940 \u0905\u0928\u0941\u0930\u094b\u0927 \u0915\u0940 \u0938\u0942\u091a\u0928\u093e',
    },
    captain_application: {
      template: `\u{1F451} *Captain Chatter \u0906\u0935\u0947\u0926\u0928*

\u{1F464} {{CANDIDATE_NAME}}
\u{1F4F1} WhatsApp: {{WHATSAPP}}
\u{1F30D} \u0926\u0947\u0936: {{COUNTRY}}
\u{1F4CE} CV: {{HAS_CV}}

\u{1F4AC} {{MOTIVATION_PREVIEW}}

\u{1F4C5} {{DATE}} {{TIME}} \u092a\u0930`,
      description: 'Captain Chatter \u0906\u0935\u0947\u0926\u0928 \u0915\u0940 \u0938\u0942\u091a\u0928\u093e',
    },
  },

  // ==================== ARABIC ====================
  ar: {
    new_registration: {
      template: `🆕 *تسجيل جديد*

👤 الدور: {{ROLE}}
📧 البريد: {{EMAIL}}
📱 الهاتف: {{PHONE}}
🌍 البلد: {{COUNTRY}}
📅 {{DATE}} الساعة {{TIME}}`,
      description: 'إشعار تسجيل جديد',
    },
    call_completed: {
      template: `📞 *مكالمة مكتملة*

👤 العميل: {{CLIENT_NAME}}
🎯 المزود: {{PROVIDER_NAME}} ({{PROVIDER_TYPE}})
⏱️ المدة: {{DURATION_MINUTES}} دقيقة
📅 {{DATE}} الساعة {{TIME}}`,
      description: 'إشعار مكالمة مكتملة',
    },
    payment_received: {
      template: `💰 *تم استلام الدفعة*

💵 إجمالي الإيرادات: {{TOTAL_AMOUNT}}€
🏢 عمولة SOS Expat: {{COMMISSION_AMOUNT}}€
📅 {{DATE}} الساعة {{TIME}}`,
      description: 'إشعار استلام دفعة',
    },
    daily_report: {
      template: `📊 *التقرير اليومي — {{DATE}}*

💰 *الإيرادات*
   الإجمالي: {{DAILY_CA}}€
   عمولة SOS Expat: {{DAILY_COMMISSION}}€

📈 *نشاط اليوم*
   📝 التسجيلات: {{REGISTRATION_COUNT}}
   📞 المكالمات: {{CALL_COUNT}}

🕐 تم الإنشاء الساعة {{TIME}} (باريس)`,
      description: 'تقرير يومي بالإحصائيات',
    },
    new_provider: {
      template: `👨‍⚖️ *مزود جديد*

👤 {{PROVIDER_NAME}}
🎯 النوع: {{PROVIDER_TYPE}}
📧 {{EMAIL}}
📱 {{PHONE}}
🌍 {{COUNTRY}}

⏳ في انتظار التحقق
📅 {{DATE}} الساعة {{TIME}}`,
      description: 'إشعار مزود جديد',
    },
    new_contact_message: {
      template: `📩 *رسالة اتصال جديدة*

👤 من: {{SENDER_NAME}}
📧 {{SENDER_EMAIL}}
📝 الموضوع: {{SUBJECT}}

💬 {{MESSAGE_PREVIEW}}

📅 {{DATE}} الساعة {{TIME}}`,
      description: 'إشعار رسالة اتصال جديدة',
    },
    negative_review: {
      template: `⚠️ *تقييم سلبي*

⭐ التقييم: {{RATING}}/5
👤 العميل: {{CLIENT_NAME}}
🎯 المزود: {{PROVIDER_NAME}}

💬 {{COMMENT_PREVIEW}}

📅 {{DATE}} الساعة {{TIME}}`,
      description: 'إشعار تقييم سلبي',
    },
    security_alert: {
      template: `🔐 *تنبيه أمني*

🚨 النوع: {{ALERT_TYPE}}
👤 الحساب: {{USER_EMAIL}}
🌍 الموقع: {{COUNTRY}}
🔗 IP: {{IP_ADDRESS}}

📋 {{DETAILS}}

📅 {{DATE}} الساعة {{TIME}}`,
      description: 'تنبيه نشاط مشبوه',
    },
    withdrawal_request: {
      template: `💳 *طلب سحب*

👤 {{USER_NAME}} ({{USER_TYPE}})
💰 المبلغ: {{AMOUNT}}€
🏦 عبر: {{PAYMENT_METHOD}}

📅 {{DATE}} الساعة {{TIME}}`,
      description: 'إشعار طلب سحب',
    },
    captain_application: {
      template: `\u{1F451} *\u0637\u0644\u0628 Captain Chatter*

\u{1F464} {{CANDIDATE_NAME}}
\u{1F4F1} WhatsApp: {{WHATSAPP}}
\u{1F30D} \u0627\u0644\u0628\u0644\u062f: {{COUNTRY}}
\u{1F4CE} CV: {{HAS_CV}}

\u{1F4AC} {{MOTIVATION_PREVIEW}}

\u{1F4C5} {{DATE}} \u0627\u0644\u0633\u0627\u0639\u0629 {{TIME}}`,
      description: '\u0625\u0634\u0639\u0627\u0631 \u0637\u0644\u0628 Captain Chatter',
    },
  },
};

// ============================================================================
// BACKWARD COMPATIBILITY — DEFAULT_TEMPLATES (French)
// ============================================================================

/**
 * Default templates = French templates (backward compat)
 */
export const DEFAULT_TEMPLATES: Record<TelegramEventType, NotificationTemplate> = I18N_TEMPLATES.fr;

/**
 * Get template for a given language, with fallback to French then English
 */
export function getLocalizedTemplate(
  lang: string | undefined,
  eventId: TelegramEventType
): NotificationTemplate {
  const raw = (lang || 'fr').substring(0, 2).toLowerCase();
  // Normalize: pipeline uses 'ch' for Chinese, but templates use 'zh'
  const normalizedLang = (raw === 'ch' ? 'zh' : raw) as SupportedLanguage;
  const templates = I18N_TEMPLATES[normalizedLang] || I18N_TEMPLATES.fr;
  return templates[eventId] || I18N_TEMPLATES.fr[eventId];
}

// ============================================================================
// TEMPLATE VARIABLES (unchanged — language-agnostic)
// ============================================================================

export const TEMPLATE_VARIABLES: Record<TelegramEventType, string[]> = {
  new_registration: ['ROLE', 'EMAIL', 'PHONE', 'COUNTRY', 'DATE', 'TIME'],
  call_completed: ['CLIENT_NAME', 'PROVIDER_NAME', 'PROVIDER_TYPE', 'DURATION_MINUTES', 'DATE', 'TIME'],
  payment_received: ['TOTAL_AMOUNT', 'COMMISSION_AMOUNT', 'DATE', 'TIME'],
  daily_report: ['DATE', 'DAILY_CA', 'DAILY_COMMISSION', 'REGISTRATION_COUNT', 'CALL_COUNT', 'TIME'],
  new_provider: ['PROVIDER_NAME', 'PROVIDER_TYPE', 'EMAIL', 'PHONE', 'COUNTRY', 'DATE', 'TIME'],
  new_contact_message: ['SENDER_NAME', 'SENDER_EMAIL', 'SUBJECT', 'MESSAGE_PREVIEW', 'DATE', 'TIME'],
  negative_review: ['CLIENT_NAME', 'PROVIDER_NAME', 'RATING', 'COMMENT_PREVIEW', 'DATE', 'TIME'],
  security_alert: ['ALERT_TYPE', 'USER_EMAIL', 'IP_ADDRESS', 'COUNTRY', 'DETAILS', 'DATE', 'TIME'],
  withdrawal_request: ['USER_NAME', 'USER_TYPE', 'AMOUNT', 'PAYMENT_METHOD', 'DATE', 'TIME'],
  captain_application: ['CANDIDATE_NAME', 'WHATSAPP', 'COUNTRY', 'MOTIVATION_PREVIEW', 'HAS_CV', 'DATE', 'TIME'],
};

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

export const DEFAULT_CONFIG: Omit<TelegramNotificationConfig, 'updatedAt' | 'updatedBy'> = {
  enabled: true,
  botTokenSecretName: 'TELEGRAM_BOT_TOKEN',
  defaultChatId: '',
  notifyNewRegistration: true,
  notifyCallCompleted: true,
  notifyPaymentReceived: true,
  notifyDailyReport: true,
  dailyReportHour: 21,
};
