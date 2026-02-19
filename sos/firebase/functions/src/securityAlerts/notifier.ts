/**
 * Notifier multicanal pour alertes de sécurité SOS Expat
 * Gère l'envoi de notifications par Email, SMS, Push, In-app et Slack
 */

import { Timestamp } from 'firebase-admin/firestore';
import { db, messaging } from '../firebaseAdmin';
import {
  SecurityAlert,
  AlertSeverity,
  SecurityAlertType,
  AlertRecipient,
  AdminAlertPreferences,
} from './types';
import { defineString } from 'firebase-functions/params';

// ==========================================
// SECRETS
// ==========================================

const SLACK_SECURITY_WEBHOOK = defineString('SLACK_SECURITY_WEBHOOK_URL', { default: '' });

// ==========================================
// CONFIGURATION DES CANAUX PAR SÉVÉRITÉ
// ==========================================

export interface ChannelConfig {
  enabled: boolean;
  delay?: number;  // Délai en ms avant envoi
}

export const SEVERITY_CHANNELS: Record<AlertSeverity, Record<string, ChannelConfig>> = {
  info: {
    email: { enabled: false },
    sms: { enabled: false },
    push: { enabled: false },
    inapp: { enabled: true },
    slack: { enabled: false },
  },
  warning: {
    email: { enabled: true, delay: 5000 },
    sms: { enabled: false },
    push: { enabled: true },
    inapp: { enabled: true },
    slack: { enabled: true },
  },
  critical: {
    email: { enabled: true },
    sms: { enabled: false },  // P0 FIX: SMS disabled to reduce costs - use email/slack instead
    push: { enabled: true },
    inapp: { enabled: true },
    slack: { enabled: true },
  },
  emergency: {
    email: { enabled: true },
    sms: { enabled: false },  // P0 FIX: SMS disabled to reduce costs - use email/slack instead
    push: { enabled: true },
    inapp: { enabled: true },
    slack: { enabled: true },
  },
};

// ==========================================
// TEMPLATES DE MESSAGES
// ==========================================

interface AlertTemplates {
  subject: Record<string, string>;
  shortMessage: Record<string, string>;
  slackMessage: string;
}

const ALERT_TEMPLATES: Record<SecurityAlertType, AlertTemplates> = {
  'security.brute_force_detected': {
    subject: {
      fr: '🚨 Attaque brute force détectée',
      en: '🚨 Brute force attack detected',
      es: '🚨 Ataque de fuerza bruta detectado',
      de: '🚨 Brute-Force-Angriff erkannt',
      pt: '🚨 Ataque de força bruta detectado',
      ru: '🚨 Обнаружена атака грубой силой',
      ar: '🚨 تم اكتشاف هجوم القوة الغاشمة',
      hi: '🚨 ब्रूट फोर्स हमला पता चला',
      zh: '🚨 检测到暴力攻击',
    },
    shortMessage: {
      fr: '{attemptCount} tentatives depuis {ip} ({country})',
      en: '{attemptCount} attempts from {ip} ({country})',
      es: '{attemptCount} intentos desde {ip} ({country})',
      de: '{attemptCount} Versuche von {ip} ({country})',
      pt: '{attemptCount} tentativas de {ip} ({country})',
      ru: '{attemptCount} попыток с {ip} ({country})',
      ar: '{attemptCount} محاولات من {ip} ({country})',
      hi: '{ip} ({country}) से {attemptCount} प्रयास',
      zh: '来自 {ip} ({country}) 的 {attemptCount} 次尝试',
    },
    slackMessage: '🔐 *Brute Force Attack*\n{attemptCount} attempts from `{ip}` ({country})\nTarget: {affectedResource}',
  },
  'security.unusual_location': {
    subject: {
      fr: '🌍 Connexion depuis un nouvel emplacement',
      en: '🌍 Login from new location',
      es: '🌍 Inicio de sesión desde nueva ubicación',
      de: '🌍 Anmeldung von neuem Standort',
      pt: '🌍 Login de novo local',
      ru: '🌍 Вход с нового местоположения',
      ar: '🌍 تسجيل الدخول من موقع جديد',
      hi: '🌍 नए स्थान से लॉगिन',
      zh: '🌍 从新位置登录',
    },
    shortMessage: {
      fr: '{userName} connecté depuis {countryName} (avant: {previousCountry})',
      en: '{userName} logged in from {countryName} (was: {previousCountry})',
      es: '{userName} conectado desde {countryName} (antes: {previousCountry})',
      de: '{userName} angemeldet von {countryName} (vorher: {previousCountry})',
      pt: '{userName} conectado de {countryName} (antes: {previousCountry})',
      ru: '{userName} вошел из {countryName} (ранее: {previousCountry})',
      ar: '{userName} سجل الدخول من {countryName} (سابقًا: {previousCountry})',
      hi: '{userName} ने {countryName} से लॉगिन किया (पहले: {previousCountry})',
      zh: '{userName} 从 {countryName} 登录（之前：{previousCountry}）',
    },
    slackMessage: '🌍 *New Location Login*\nUser: {userName}\nLocation: {countryName} ({city})\nPrevious: {previousCountry}',
  },
  'security.suspicious_payment': {
    subject: {
      fr: '💳 Paiement suspect détecté',
      en: '💳 Suspicious payment detected',
      es: '💳 Pago sospechoso detectado',
      de: '💳 Verdächtige Zahlung erkannt',
      pt: '💳 Pagamento suspeito detectado',
      ru: '💳 Обнаружен подозрительный платеж',
      ar: '💳 تم اكتشاف دفع مشبوه',
      hi: '💳 संदिग्ध भुगतान पता चला',
      zh: '💳 检测到可疑付款',
    },
    shortMessage: {
      fr: '{amount} {currency} - Score de risque: {riskScore}%',
      en: '{amount} {currency} - Risk score: {riskScore}%',
      es: '{amount} {currency} - Puntuación de riesgo: {riskScore}%',
      de: '{amount} {currency} - Risikobewertung: {riskScore}%',
      pt: '{amount} {currency} - Pontuação de risco: {riskScore}%',
      ru: '{amount} {currency} - Оценка риска: {riskScore}%',
      ar: '{amount} {currency} - درجة المخاطر: {riskScore}%',
      hi: '{amount} {currency} - जोखिम स्कोर: {riskScore}%',
      zh: '{amount} {currency} - 风险评分：{riskScore}%',
    },
    slackMessage: '💳 *Suspicious Payment*\nAmount: {amount} {currency}\nRisk Score: {riskScore}%\nUser: {userEmail}\nFactors: {riskFactors}',
  },
  'security.mass_account_creation': {
    subject: {
      fr: '👥 Création massive de comptes détectée',
      en: '👥 Mass account creation detected',
      es: '👥 Creación masiva de cuentas detectada',
      de: '👥 Massenhafte Kontoerstellung erkannt',
      pt: '👥 Criação em massa de contas detectada',
      ru: '👥 Обнаружено массовое создание аккаунтов',
      ar: '👥 تم اكتشاف إنشاء حسابات جماعية',
      hi: '👥 बड़े पैमाने पर खाता निर्माण का पता चला',
      zh: '👥 检测到大规模账户创建',
    },
    shortMessage: {
      fr: '{accountCount} comptes créés en {timeWindow} depuis {ip}',
      en: '{accountCount} accounts created in {timeWindow} from {ip}',
      es: '{accountCount} cuentas creadas en {timeWindow} desde {ip}',
      de: '{accountCount} Konten in {timeWindow} von {ip} erstellt',
      pt: '{accountCount} contas criadas em {timeWindow} de {ip}',
      ru: '{accountCount} аккаунтов создано за {timeWindow} с {ip}',
      ar: '{accountCount} حسابات تم إنشاؤها في {timeWindow} من {ip}',
      hi: '{ip} से {timeWindow} में {accountCount} खाते बनाए गए',
      zh: '在 {timeWindow} 内从 {ip} 创建了 {accountCount} 个账户',
    },
    slackMessage: '👥 *Mass Account Creation*\n{accountCount} accounts from `{ip}` in {timeWindow}',
  },
  'security.api_abuse': {
    subject: {
      fr: '⚡ Abus API détecté',
      en: '⚡ API abuse detected',
      es: '⚡ Abuso de API detectado',
      de: '⚡ API-Missbrauch erkannt',
      pt: '⚡ Abuso de API detectado',
      ru: '⚡ Обнаружено злоупотребление API',
      ar: '⚡ تم اكتشاف إساءة استخدام API',
      hi: '⚡ API दुरुपयोग का पता चला',
      zh: '⚡ 检测到 API 滥用',
    },
    shortMessage: {
      fr: '{requestCount} requêtes sur {endpoint} depuis {ip}',
      en: '{requestCount} requests to {endpoint} from {ip}',
      es: '{requestCount} solicitudes a {endpoint} desde {ip}',
      de: '{requestCount} Anfragen an {endpoint} von {ip}',
      pt: '{requestCount} solicitações para {endpoint} de {ip}',
      ru: '{requestCount} запросов к {endpoint} с {ip}',
      ar: '{requestCount} طلبات إلى {endpoint} من {ip}',
      hi: '{ip} से {endpoint} पर {requestCount} अनुरोध',
      zh: '从 {ip} 向 {endpoint} 发送了 {requestCount} 个请求',
    },
    slackMessage: '⚡ *API Abuse*\n{requestCount} requests to `{endpoint}` from `{ip}`\nType: {attackType}',
  },
  'security.data_breach_attempt': {
    subject: {
      fr: '🔴 ALERTE: Tentative de violation de données',
      en: '🔴 ALERT: Data breach attempt',
      es: '🔴 ALERTA: Intento de violación de datos',
      de: '🔴 WARNUNG: Datenverletzungsversuch',
      pt: '🔴 ALERTA: Tentativa de violação de dados',
      ru: '🔴 ВНИМАНИЕ: Попытка утечки данных',
      ar: '🔴 تنبيه: محاولة اختراق البيانات',
      hi: '🔴 अलर्ट: डेटा उल्लंघन का प्रयास',
      zh: '🔴 警报：数据泄露尝试',
    },
    shortMessage: {
      fr: 'Attaque {attackType} sur {affectedResource}',
      en: '{attackType} attack on {affectedResource}',
      es: 'Ataque {attackType} en {affectedResource}',
      de: '{attackType}-Angriff auf {affectedResource}',
      pt: 'Ataque {attackType} em {affectedResource}',
      ru: 'Атака {attackType} на {affectedResource}',
      ar: 'هجوم {attackType} على {affectedResource}',
      hi: '{affectedResource} पर {attackType} हमला',
      zh: '对 {affectedResource} 的 {attackType} 攻击',
    },
    slackMessage: '🔴 *DATA BREACH ATTEMPT*\nAttack Type: {attackType}\nTarget: {affectedResource}\nSource IP: `{ip}`\nUser: {userEmail}',
  },
  'security.admin_action_required': {
    subject: {
      fr: '⚠️ Action administrateur requise',
      en: '⚠️ Admin action required',
      es: '⚠️ Acción de administrador requerida',
      de: '⚠️ Admin-Aktion erforderlich',
      pt: '⚠️ Ação de administrador necessária',
      ru: '⚠️ Требуется действие администратора',
      ar: '⚠️ مطلوب إجراء المسؤول',
      hi: '⚠️ व्यवस्थापक कार्रवाई आवश्यक',
      zh: '⚠️ 需要管理员操作',
    },
    shortMessage: {
      fr: 'Action requise: {issueType}',
      en: 'Action needed: {issueType}',
      es: 'Acción necesaria: {issueType}',
      de: 'Aktion erforderlich: {issueType}',
      pt: 'Ação necessária: {issueType}',
      ru: 'Требуется действие: {issueType}',
      ar: 'الإجراء المطلوب: {issueType}',
      hi: 'कार्रवाई की जरूरत: {issueType}',
      zh: '需要采取行动：{issueType}',
    },
    slackMessage: '⚠️ *Admin Action Required*\nIssue: {issueType}\nResource: {affectedResource}',
  },
  'security.system_critical': {
    subject: {
      fr: '🚨 CRITIQUE: Problème système',
      en: '🚨 CRITICAL: System issue',
      es: '🚨 CRÍTICO: Problema del sistema',
      de: '🚨 KRITISCH: Systemproblem',
      pt: '🚨 CRÍTICO: Problema do sistema',
      ru: '🚨 КРИТИЧНО: Системная проблема',
      ar: '🚨 حرج: مشكلة في النظام',
      hi: '🚨 महत्वपूर्ण: सिस्टम समस्या',
      zh: '🚨 严重：系统问题',
    },
    shortMessage: {
      fr: '{systemName}: {issueType} (erreurs: {errorRate}%)',
      en: '{systemName}: {issueType} (errors: {errorRate}%)',
      es: '{systemName}: {issueType} (errores: {errorRate}%)',
      de: '{systemName}: {issueType} (Fehler: {errorRate}%)',
      pt: '{systemName}: {issueType} (erros: {errorRate}%)',
      ru: '{systemName}: {issueType} (ошибок: {errorRate}%)',
      ar: '{systemName}: {issueType} (أخطاء: {errorRate}%)',
      hi: '{systemName}: {issueType} (त्रुटियां: {errorRate}%)',
      zh: '{systemName}：{issueType}（错误率：{errorRate}%）',
    },
    slackMessage: '🚨 *SYSTEM CRITICAL*\nSystem: {systemName}\nIssue: {issueType}\nError Rate: {errorRate}%\nLatency: {latencyMs}ms',
  },
  'security.impossible_travel': {
    subject: {
      fr: '✈️ Voyage impossible détecté',
      en: '✈️ Impossible travel detected',
      es: '✈️ Viaje imposible detectado',
      de: '✈️ Unmögliche Reise erkannt',
      pt: '✈️ Viagem impossível detectada',
      ru: '✈️ Обнаружено невозможное перемещение',
      ar: '✈️ تم اكتشاف سفر مستحيل',
      hi: '✈️ असंभव यात्रा का पता चला',
      zh: '✈️ 检测到不可能的旅行',
    },
    shortMessage: {
      fr: '{userName}: {previousCountry} → {countryName} ({distanceKm} km)',
      en: '{userName}: {previousCountry} → {countryName} ({distanceKm} km)',
      es: '{userName}: {previousCountry} → {countryName} ({distanceKm} km)',
      de: '{userName}: {previousCountry} → {countryName} ({distanceKm} km)',
      pt: '{userName}: {previousCountry} → {countryName} ({distanceKm} km)',
      ru: '{userName}: {previousCountry} → {countryName} ({distanceKm} км)',
      ar: '{userName}: {previousCountry} → {countryName} ({distanceKm} كم)',
      hi: '{userName}: {previousCountry} → {countryName} ({distanceKm} किमी)',
      zh: '{userName}：{previousCountry} → {countryName}（{distanceKm} 公里）',
    },
    slackMessage: '✈️ *Impossible Travel*\nUser: {userName}\nRoute: {previousCountry} → {countryName}\nDistance: {distanceKm} km',
  },
  'security.multiple_sessions': {
    subject: {
      fr: '👤 Sessions multiples détectées',
      en: '👤 Multiple sessions detected',
      es: '👤 Sesiones múltiples detectadas',
      de: '👤 Mehrere Sitzungen erkannt',
      pt: '👤 Várias sessões detectadas',
      ru: '👤 Обнаружено несколько сеансов',
      ar: '👤 تم اكتشاف جلسات متعددة',
      hi: '👤 एकाधिक सत्र पता चला',
      zh: '👤 检测到多个会话',
    },
    shortMessage: {
      fr: '{userName} connecté depuis {attemptCount} appareils',
      en: '{userName} logged in from {attemptCount} devices',
      es: '{userName} conectado desde {attemptCount} dispositivos',
      de: '{userName} von {attemptCount} Geräten angemeldet',
      pt: '{userName} conectado de {attemptCount} dispositivos',
      ru: '{userName} вошел с {attemptCount} устройств',
      ar: '{userName} سجل الدخول من {attemptCount} أجهزة',
      hi: '{userName} {attemptCount} डिवाइस से लॉगिन',
      zh: '{userName} 从 {attemptCount} 个设备登录',
    },
    slackMessage: '👤 *Multiple Sessions*\nUser: {userName}\nDevices: {attemptCount}',
  },
  'security.card_testing': {
    subject: {
      fr: '💳 Test de carte détecté',
      en: '💳 Card testing detected',
      es: '💳 Prueba de tarjeta detectada',
      de: '💳 Kartentests erkannt',
      pt: '💳 Teste de cartão detectado',
      ru: '💳 Обнаружено тестирование карты',
      ar: '💳 تم اكتشاف اختبار البطاقة',
      hi: '💳 कार्ड परीक्षण का पता चला',
      zh: '💳 检测到卡测试',
    },
    shortMessage: {
      fr: '{attemptCount} tentatives depuis {ip}',
      en: '{attemptCount} attempts from {ip}',
      es: '{attemptCount} intentos desde {ip}',
      de: '{attemptCount} Versuche von {ip}',
      pt: '{attemptCount} tentativas de {ip}',
      ru: '{attemptCount} попыток с {ip}',
      ar: '{attemptCount} محاولات من {ip}',
      hi: '{ip} से {attemptCount} प्रयास',
      zh: '来自 {ip} 的 {attemptCount} 次尝试',
    },
    slackMessage: '💳 *Card Testing*\n{attemptCount} failed payment attempts from `{ip}`',
  },
  'security.promo_abuse': {
    subject: {
      fr: '🎟️ Abus de code promo détecté',
      en: '🎟️ Promo code abuse detected',
      es: '🎟️ Abuso de código promocional detectado',
      de: '🎟️ Promo-Code-Missbrauch erkannt',
      pt: '🎟️ Abuso de código promocional detectado',
      ru: '🎟️ Обнаружено злоупотребление промокодом',
      ar: '🎟️ تم اكتشاف إساءة استخدام الرمز الترويجي',
      hi: '🎟️ प्रोमो कोड दुरुपयोग का पता चला',
      zh: '🎟️ 检测到促销代码滥用',
    },
    shortMessage: {
      fr: 'Abus détecté depuis {ip} ({attemptCount} utilisations)',
      en: 'Abuse detected from {ip} ({attemptCount} uses)',
      es: 'Abuso detectado desde {ip} ({attemptCount} usos)',
      de: 'Missbrauch von {ip} erkannt ({attemptCount} Nutzungen)',
      pt: 'Abuso detectado de {ip} ({attemptCount} usos)',
      ru: 'Обнаружено злоупотребление с {ip} ({attemptCount} использований)',
      ar: 'تم اكتشاف إساءة من {ip} ({attemptCount} استخدامات)',
      hi: '{ip} से दुरुपयोग पता चला ({attemptCount} उपयोग)',
      zh: '从 {ip} 检测到滥用（{attemptCount} 次使用）',
    },
    slackMessage: '🎟️ *Promo Code Abuse*\n{attemptCount} uses from `{ip}`',
  },
  'security.sql_injection': {
    subject: {
      fr: '💉 Injection SQL détectée',
      en: '💉 SQL injection detected',
      es: '💉 Inyección SQL detectada',
      de: '💉 SQL-Injection erkannt',
      pt: '💉 Injeção SQL detectada',
      ru: '💉 Обнаружена SQL-инъекция',
      ar: '💉 تم اكتشاف حقن SQL',
      hi: '💉 SQL इंजेक्शन का पता चला',
      zh: '💉 检测到 SQL 注入',
    },
    shortMessage: {
      fr: 'Injection sur {endpoint} depuis {ip}',
      en: 'Injection on {endpoint} from {ip}',
      es: 'Inyección en {endpoint} desde {ip}',
      de: 'Injection auf {endpoint} von {ip}',
      pt: 'Injeção em {endpoint} de {ip}',
      ru: 'Инъекция на {endpoint} с {ip}',
      ar: 'حقن على {endpoint} من {ip}',
      hi: '{ip} से {endpoint} पर इंजेक्शन',
      zh: '从 {ip} 向 {endpoint} 进行注入',
    },
    slackMessage: '💉 *SQL Injection Attempt*\nEndpoint: `{endpoint}`\nSource: `{ip}`',
  },
  'security.xss_attempt': {
    subject: {
      fr: '🔓 Tentative XSS détectée',
      en: '🔓 XSS attempt detected',
      es: '🔓 Intento de XSS detectado',
      de: '🔓 XSS-Versuch erkannt',
      pt: '🔓 Tentativa de XSS detectada',
      ru: '🔓 Обнаружена попытка XSS',
      ar: '🔓 تم اكتشاف محاولة XSS',
      hi: '🔓 XSS प्रयास का पता चला',
      zh: '🔓 检测到 XSS 尝试',
    },
    shortMessage: {
      fr: 'XSS sur {endpoint} depuis {ip}',
      en: 'XSS on {endpoint} from {ip}',
      es: 'XSS en {endpoint} desde {ip}',
      de: 'XSS auf {endpoint} von {ip}',
      pt: 'XSS em {endpoint} de {ip}',
      ru: 'XSS на {endpoint} с {ip}',
      ar: 'XSS على {endpoint} من {ip}',
      hi: '{ip} से {endpoint} पर XSS',
      zh: '从 {ip} 向 {endpoint} 进行 XSS',
    },
    slackMessage: '🔓 *XSS Attempt*\nEndpoint: `{endpoint}`\nSource: `{ip}`',
  },
  'security.rate_limit_exceeded': {
    subject: {
      fr: '⏱️ Limite de requêtes dépassée',
      en: '⏱️ Rate limit exceeded',
      es: '⏱️ Límite de solicitudes excedido',
      de: '⏱️ Rate Limit überschritten',
      pt: '⏱️ Limite de taxa excedido',
      ru: '⏱️ Превышен лимит запросов',
      ar: '⏱️ تم تجاوز حد المعدل',
      hi: '⏱️ दर सीमा पार हो गई',
      zh: '⏱️ 超出速率限制',
    },
    shortMessage: {
      fr: '{requestCount} requêtes depuis {ip}',
      en: '{requestCount} requests from {ip}',
      es: '{requestCount} solicitudes desde {ip}',
      de: '{requestCount} Anfragen von {ip}',
      pt: '{requestCount} solicitações de {ip}',
      ru: '{requestCount} запросов с {ip}',
      ar: '{requestCount} طلبات من {ip}',
      hi: '{ip} से {requestCount} अनुरोध',
      zh: '来自 {ip} 的 {requestCount} 个请求',
    },
    slackMessage: '⏱️ *Rate Limit Exceeded*\n{requestCount} requests from `{ip}` to `{endpoint}`',
  },
};

// ==========================================
// RÉCUPÉRATION DES DESTINATAIRES
// ==========================================

/**
 * Récupère les admins qui doivent recevoir l'alerte
 */
export async function getAlertRecipients(
  alertType: SecurityAlertType,
  severity: AlertSeverity
): Promise<AlertRecipient[]> {
  try {
    // Récupérer tous les admins avec préférences d'alerte
    const snapshot = await db.collection('admin_alert_preferences').get();
    const recipients: AlertRecipient[] = [];

    snapshot.docs.forEach((doc) => {
      const prefs = doc.data() as AdminAlertPreferences;

      // Vérifier les préférences pour ce type d'alerte
      const alertPref = prefs.preferences?.[alertType] || prefs.preferences?.['default'];

      if (!alertPref || !alertPref.enabled) {
        return; // Skip ce recipient
      }

      // Vérifier la sévérité minimale
      const severityOrder: AlertSeverity[] = ['info', 'warning', 'critical', 'emergency'];
      const minSeverityIndex = severityOrder.indexOf(alertPref.minSeverity || 'warning');
      const currentSeverityIndex = severityOrder.indexOf(severity);

      if (currentSeverityIndex < minSeverityIndex) {
        return; // Sévérité insuffisante
      }

      // Vérifier les heures silencieuses (sauf emergency)
      if (alertPref.quietHours?.enabled && severity !== 'emergency') {
        const now = new Date();
        const currentHour = now.getHours();
        const [startHour] = (alertPref.quietHours.start || '22:00').split(':').map(Number);
        const [endHour] = (alertPref.quietHours.end || '08:00').split(':').map(Number);

        const inQuietHours = startHour > endHour
          ? (currentHour >= startHour || currentHour < endHour)
          : (currentHour >= startHour && currentHour < endHour);

        if (inQuietHours && !alertPref.quietHours.exceptEmergency) {
          return;
        }
      }

      recipients.push({
        uid: prefs.uid,
        email: prefs.email,
        phone: prefs.phone,
        fcmToken: prefs.fcmToken,
        locale: 'fr', // Default, à récupérer du profil admin
      });
    });

    // Si aucun recipient configuré, utiliser les admins par défaut
    if (recipients.length === 0 && severity !== 'info') {
      const defaultAdmins = await db
        .collection('users')
        .where('role', '==', 'admin')
        .limit(5)
        .get();

      defaultAdmins.docs.forEach((doc) => {
        const data = doc.data();
        recipients.push({
          uid: doc.id,
          email: data.email,
          phone: data.phone,
          fcmToken: data.fcmToken,
          locale: data.locale || 'fr',
        });
      });
    }

    return recipients;
  } catch (error) {
    console.error('[Notifier] Error getting recipients:', error);
    return [];
  }
}

// ==========================================
// INTERPOLATION DES MESSAGES
// ==========================================

function interpolateMessage(template: string, context: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = context[key];
    if (value === undefined || value === null) {
      return match;
    }
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return String(value);
  });
}

// ==========================================
// ENVOI EMAIL
// ==========================================

async function sendEmailNotification(
  alert: SecurityAlert,
  recipient: AlertRecipient
): Promise<boolean> {
  const templates = ALERT_TEMPLATES[alert.type];
  if (!templates) return false;

  const locale = recipient.locale || 'fr';
  const subject = templates.subject[locale] || templates.subject['en'];
  const shortMessage = templates.shortMessage[locale] || templates.shortMessage['en'];

  const body = interpolateMessage(shortMessage, alert.context);

  try {
    // Créer un message_event pour l'email
    await db.collection('message_events').add({
      eventId: `security.alert.${alert.type}`,
      recipientId: recipient.uid,
      recipientType: 'admin',
      recipientEmail: recipient.email,
      locale,
      data: {
        alertId: alert.id,
        alertType: alert.type,
        severity: alert.severity,
        subject,
        body,
        context: alert.context,
        timestamp: alert.createdAt,
      },
      channels: ['email'],
      status: 'pending',
      createdAt: Timestamp.now(),
    });

    return true;
  } catch (error) {
    console.error('[Notifier] Email error:', error);
    return false;
  }
}

// ==========================================
// ENVOI SMS
// ==========================================

async function sendSmsNotification(
  alert: SecurityAlert,
  recipient: AlertRecipient
): Promise<boolean> {
  if (!recipient.phone) return false;

  const templates = ALERT_TEMPLATES[alert.type];
  if (!templates) return false;

  const locale = recipient.locale || 'fr';
  const subject = templates.subject[locale] || templates.subject['en'];
  const shortMessage = templates.shortMessage[locale] || templates.shortMessage['en'];

  const smsText = `SOS Expat: ${subject}\n${interpolateMessage(shortMessage, alert.context)}`;

  try {
    // Utiliser Twilio via le pipeline de notifications
    await db.collection('message_events').add({
      eventId: `security.alert.${alert.type}`,
      recipientId: recipient.uid,
      recipientType: 'admin',
      recipientPhone: recipient.phone,
      locale,
      data: {
        alertId: alert.id,
        alertType: alert.type,
        severity: alert.severity,
        text: smsText,
      },
      channels: ['sms'],
      status: 'pending',
      createdAt: Timestamp.now(),
    });

    return true;
  } catch (error) {
    console.error('[Notifier] SMS error:', error);
    return false;
  }
}

// ==========================================
// ENVOI PUSH
// ==========================================

async function sendPushNotification(
  alert: SecurityAlert,
  recipient: AlertRecipient
): Promise<boolean> {
  if (!recipient.fcmToken) return false;

  const templates = ALERT_TEMPLATES[alert.type];
  if (!templates) return false;

  const locale = recipient.locale || 'fr';
  const title = templates.subject[locale] || templates.subject['en'];
  const body = interpolateMessage(
    templates.shortMessage[locale] || templates.shortMessage['en'],
    alert.context
  );

  try {
    await messaging.send({
      token: recipient.fcmToken,
      notification: {
        title,
        body,
      },
      data: {
        alertId: alert.id,
        alertType: alert.type,
        severity: alert.severity,
        click_action: 'OPEN_SECURITY_ALERTS',
      },
      android: {
        priority: alert.severity === 'emergency' ? 'high' : 'normal',
        notification: {
          channelId: 'security_alerts',
          priority: alert.severity === 'emergency' ? 'max' : 'high',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: alert.severity === 'emergency' ? 'critical.caf' : 'default',
            badge: 1,
          },
        },
      },
    });

    return true;
  } catch (error) {
    console.error('[Notifier] Push error:', error);
    return false;
  }
}

// ==========================================
// ENVOI IN-APP
// ==========================================

async function sendInAppNotification(
  alert: SecurityAlert,
  recipient: AlertRecipient
): Promise<boolean> {
  const templates = ALERT_TEMPLATES[alert.type];
  if (!templates) return false;

  const locale = recipient.locale || 'fr';
  const title = templates.subject[locale] || templates.subject['en'];
  const body = interpolateMessage(
    templates.shortMessage[locale] || templates.shortMessage['en'],
    alert.context
  );

  try {
    await db.collection('notifications').add({
      userId: recipient.uid,
      type: 'security_alert',
      title,
      body,
      data: {
        alertId: alert.id,
        alertType: alert.type,
        severity: alert.severity,
      },
      read: false,
      createdAt: Timestamp.now(),
    });

    return true;
  } catch (error) {
    console.error('[Notifier] In-app error:', error);
    return false;
  }
}

// ==========================================
// ENVOI SLACK
// ==========================================

async function sendSlackNotification(alert: SecurityAlert): Promise<boolean> {
  const webhookUrl = SLACK_SECURITY_WEBHOOK.value();
  if (!webhookUrl) return false;

  const templates = ALERT_TEMPLATES[alert.type];
  if (!templates) return false;

  const message = interpolateMessage(templates.slackMessage, alert.context);

  const severityEmoji = {
    info: 'ℹ️',
    warning: '⚠️',
    critical: '🔴',
    emergency: '🚨',
  };

  const severityColor = {
    info: '#36a64f',
    warning: '#ffcc00',
    critical: '#ff6600',
    emergency: '#ff0000',
  };

  const payload = {
    attachments: [
      {
        color: severityColor[alert.severity],
        pretext: `${severityEmoji[alert.severity]} *Security Alert - ${alert.severity.toUpperCase()}*`,
        text: message,
        fields: [
          {
            title: 'Alert ID',
            value: alert.id,
            short: true,
          },
          {
            title: 'Time',
            value: new Date().toISOString(),
            short: true,
          },
        ],
        footer: 'SOS Expat Security',
        footer_icon: 'https://sos-expat.com/favicon.ico',
      },
    ],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return response.ok;
  } catch (error) {
    console.error('[Notifier] Slack error:', error);
    return false;
  }
}

// ==========================================
// ORCHESTRATEUR PRINCIPAL
// ==========================================

export interface NotificationResult {
  email: { sent: number; failed: number };
  sms: { sent: number; failed: number };
  push: { sent: number; failed: number };
  inapp: { sent: number; failed: number };
  slack: boolean;
}

/**
 * Envoie les notifications pour une alerte de sécurité
 */
export async function sendSecurityAlertNotifications(
  alert: SecurityAlert
): Promise<NotificationResult> {
  const result: NotificationResult = {
    email: { sent: 0, failed: 0 },
    sms: { sent: 0, failed: 0 },
    push: { sent: 0, failed: 0 },
    inapp: { sent: 0, failed: 0 },
    slack: false,
  };

  // Récupérer la configuration des canaux pour cette sévérité
  const channelConfig = SEVERITY_CHANNELS[alert.severity];

  // Récupérer les destinataires
  const recipients = await getAlertRecipients(alert.type, alert.severity);

  console.log(`[Notifier] Sending ${alert.severity} alert ${alert.id} to ${recipients.length} recipients`);

  // Envoi en parallèle pour chaque canal
  const promises: Promise<void>[] = [];

  for (const recipient of recipients) {
    // Email
    if (channelConfig.email.enabled) {
      promises.push(
        sendEmailNotification(alert, recipient).then((success) => {
          if (success) result.email.sent++;
          else result.email.failed++;
        })
      );
    }

    // SMS (DISABLED to reduce Twilio costs - was critical and emergency only)
    if (channelConfig.sms.enabled && recipient.phone) {
      console.log(`📱 [SecurityAlert SMS] ⚠️ SMS would be sent but channel is DISABLED`);
      console.log(`📱 [SecurityAlert SMS]   alertId: ${alert.id}`);
      console.log(`📱 [SecurityAlert SMS]   severity: ${alert.severity}`);
      console.log(`📱 [SecurityAlert SMS]   recipient: ${recipient.phone?.substring(0, 6)}***`);
      promises.push(
        sendSmsNotification(alert, recipient).then((success) => {
          if (success) result.sms.sent++;
          else result.sms.failed++;
        })
      );
    } else if (recipient.phone) {
      console.log(`📱 [SecurityAlert SMS] ❌ SMS BLOCKED (disabled in config)`);
      console.log(`📱 [SecurityAlert SMS]   alertId: ${alert.id}`);
      console.log(`📱 [SecurityAlert SMS]   severity: ${alert.severity}`);
      console.log(`📱 [SecurityAlert SMS]   channelConfig.sms.enabled: ${channelConfig.sms.enabled}`);
    }

    // Push
    if (channelConfig.push.enabled && recipient.fcmToken) {
      promises.push(
        sendPushNotification(alert, recipient).then((success) => {
          if (success) result.push.sent++;
          else result.push.failed++;
        })
      );
    }

    // In-app
    if (channelConfig.inapp.enabled) {
      promises.push(
        sendInAppNotification(alert, recipient).then((success) => {
          if (success) result.inapp.sent++;
          else result.inapp.failed++;
        })
      );
    }
  }

  // Slack (une seule notification pour tous)
  if (channelConfig.slack.enabled) {
    promises.push(
      sendSlackNotification(alert).then((success) => {
        result.slack = success;
      })
    );
  }

  await Promise.all(promises);

  // Mettre à jour l'alerte avec les notifications envoyées
  await db.collection('security_alerts').doc(alert.id).update({
    'escalation.notificationsSent': {
      email: result.email.sent > 0,
      sms: result.sms.sent > 0,
      push: result.push.sent > 0,
      inapp: result.inapp.sent > 0,
      slack: result.slack,
    },
    processed: true,
    updatedAt: Timestamp.now(),
  });

  console.log(`[Notifier] Alert ${alert.id} notifications complete:`, result);

  return result;
}
