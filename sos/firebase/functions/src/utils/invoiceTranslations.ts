/**
 * Invoice Translations - Multilingual Support (9 languages)
 *
 * Provides translations for invoice generation in all supported languages:
 * FR, EN, ES, DE, PT, RU, ZH, HI, AR
 *
 * Used by: generateInvoice.ts
 */

export type SupportedLocale = 'fr' | 'en' | 'es' | 'de' | 'pt' | 'ru' | 'zh' | 'hi' | 'ar';

export interface InvoiceTranslations {
  // Document title
  documentTitle: string;
  platformInvoiceTitle: string;
  providerInvoiceTitle: string;

  // Header
  invoiceNumber: string;
  date: string;

  // Parties
  issuer: string;
  client: string;

  // Company info
  companyName: string;
  platformDescription: string;

  // Table headers
  description: string;
  amount: string;
  total: string;

  // Line items
  platformFeeDescription: string;
  consultationDescription: string;

  // Footer
  thankYouMessage: string;
  legalNotice: string;
  validWithoutSignature: string;

  // Email subject
  emailSubject: string;
  // Email body
  emailBody: string;
  emailCallToAction: string;

  // M1 AUDIT FIX: Credit note (facture d'avoir) translations
  creditNoteTitle: string;
  creditNoteNumber: string;
  creditNoteDescription: string;
  originalInvoiceRef: string;
  refundReasonLabel: string;
  creditNoteFooter: string;
  creditNoteEmailSubject: string;
  creditNoteEmailBody: string;
}

export const INVOICE_TRANSLATIONS: Record<SupportedLocale, InvoiceTranslations> = {
  // ============================================================================
  // FRENCH
  // ============================================================================
  fr: {
    documentTitle: 'Facture',
    platformInvoiceTitle: 'Facture de mise en relation',
    providerInvoiceTitle: 'Facture prestataire',
    invoiceNumber: 'Facture N°',
    date: 'Date',
    issuer: 'ÉMETTEUR',
    client: 'CLIENT',
    companyName: 'SOS Expat',
    platformDescription: 'SOS Expat SAS<br>Service de mise en relation',
    description: 'Description',
    amount: 'Montant',
    total: 'TOTAL',
    platformFeeDescription: 'Frais de mise en relation',
    consultationDescription: 'Prestation de conseil',
    thankYouMessage: 'Merci pour votre confiance.',
    legalNotice: 'SOS Expat SAS - Service de mise en relation entre expatriés et professionnels',
    validWithoutSignature: 'Document généré automatiquement - Valide sans signature',
    emailSubject: 'Votre facture SOS Expat',
    emailBody: 'Bonjour,<br><br>Veuillez trouver ci-joint votre facture pour votre consultation avec SOS Expat.<br><br>Cordialement,<br>L\'équipe SOS Expat',
    emailCallToAction: 'Télécharger la facture',
    creditNoteTitle: 'Avoir',
    creditNoteNumber: 'Avoir N°',
    creditNoteDescription: 'Annulation de frais de mise en relation',
    originalInvoiceRef: 'Ref. facture originale',
    refundReasonLabel: 'Motif',
    creditNoteFooter: 'Ce document annule et remplace partiellement ou totalement la facture originale.',
    creditNoteEmailSubject: 'Votre avoir SOS Expat',
    creditNoteEmailBody: 'Bonjour,<br><br>Suite a votre remboursement, veuillez trouver ci-joint votre avoir.<br><br>Cordialement,<br>L\'equipe SOS Expat',
  },

  // ============================================================================
  // ENGLISH
  // ============================================================================
  en: {
    documentTitle: 'Invoice',
    platformInvoiceTitle: 'Connection Service Invoice',
    providerInvoiceTitle: 'Provider Invoice',
    invoiceNumber: 'Invoice No.',
    date: 'Date',
    issuer: 'ISSUER',
    client: 'CLIENT',
    companyName: 'SOS Expat',
    platformDescription: 'SOS Expat SAS<br>Connection service',
    description: 'Description',
    amount: 'Amount',
    total: 'TOTAL',
    platformFeeDescription: 'Connection service fee',
    consultationDescription: 'Consulting service',
    thankYouMessage: 'Thank you for your trust.',
    legalNotice: 'SOS Expat SAS - Connection service between expats and professionals',
    validWithoutSignature: 'Automatically generated document - Valid without signature',
    emailSubject: 'Your SOS Expat Invoice',
    emailBody: 'Hello,<br><br>Please find attached your invoice for your consultation with SOS Expat.<br><br>Best regards,<br>The SOS Expat team',
    emailCallToAction: 'Download invoice',
    creditNoteTitle: 'Credit Note',
    creditNoteNumber: 'Credit Note No.',
    creditNoteDescription: 'Cancellation of connection service fee',
    originalInvoiceRef: 'Original invoice ref.',
    refundReasonLabel: 'Reason',
    creditNoteFooter: 'This document partially or fully cancels and replaces the original invoice.',
    creditNoteEmailSubject: 'Your SOS Expat Credit Note',
    creditNoteEmailBody: 'Hello,<br><br>Following your refund, please find attached your credit note.<br><br>Best regards,<br>The SOS Expat team',
  },

  // ============================================================================
  // SPANISH
  // ============================================================================
  es: {
    documentTitle: 'Factura',
    platformInvoiceTitle: 'Factura de servicio de conexión',
    providerInvoiceTitle: 'Factura del proveedor',
    invoiceNumber: 'Factura N°',
    date: 'Fecha',
    issuer: 'EMISOR',
    client: 'CLIENTE',
    companyName: 'SOS Expat',
    platformDescription: 'SOS Expat SAS<br>Servicio de conexión',
    description: 'Descripción',
    amount: 'Importe',
    total: 'TOTAL',
    platformFeeDescription: 'Tarifa de servicio de conexión',
    consultationDescription: 'Servicio de consultoría',
    thankYouMessage: 'Gracias por su confianza.',
    legalNotice: 'SOS Expat SAS - Servicio de conexión entre expatriados y profesionales',
    validWithoutSignature: 'Documento generado automáticamente - Válido sin firma',
    emailSubject: 'Su factura de SOS Expat',
    emailBody: 'Hola,<br><br>Adjunto encontrará su factura para su consulta con SOS Expat.<br><br>Atentamente,<br>El equipo SOS Expat',
    emailCallToAction: 'Descargar factura',
    creditNoteTitle: 'Nota de credito',
    creditNoteNumber: 'Nota de credito N°',
    creditNoteDescription: 'Anulacion de tarifa de servicio de conexion',
    originalInvoiceRef: 'Ref. factura original',
    refundReasonLabel: 'Motivo',
    creditNoteFooter: 'Este documento anula parcial o totalmente la factura original.',
    creditNoteEmailSubject: 'Su nota de credito SOS Expat',
    creditNoteEmailBody: 'Hola,<br><br>Tras su reembolso, adjunto encontrara su nota de credito.<br><br>Atentamente,<br>El equipo SOS Expat',
  },

  // ============================================================================
  // GERMAN
  // ============================================================================
  de: {
    documentTitle: 'Rechnung',
    platformInvoiceTitle: 'Vermittlungsdienstleistung Rechnung',
    providerInvoiceTitle: 'Dienstleister Rechnung',
    invoiceNumber: 'Rechnungs-Nr.',
    date: 'Datum',
    issuer: 'AUSSTELLER',
    client: 'KUNDE',
    companyName: 'SOS Expat',
    platformDescription: 'SOS Expat SAS<br>Vermittlungsdienstleistung',
    description: 'Beschreibung',
    amount: 'Betrag',
    total: 'GESAMT',
    platformFeeDescription: 'Vermittlungsgebühr',
    consultationDescription: 'Beratungsdienstleistung',
    thankYouMessage: 'Vielen Dank für Ihr Vertrauen.',
    legalNotice: 'SOS Expat SAS - Vermittlungsdienstleistung zwischen Expatriates und Fachleuten',
    validWithoutSignature: 'Automatisch generiertes Dokument - Gültig ohne Unterschrift',
    emailSubject: 'Ihre SOS Expat Rechnung',
    emailBody: 'Hallo,<br><br>Im Anhang finden Sie Ihre Rechnung für Ihre Beratung mit SOS Expat.<br><br>Mit freundlichen Grüßen,<br>Das SOS Expat Team',
    emailCallToAction: 'Rechnung herunterladen',
    creditNoteTitle: 'Gutschrift',
    creditNoteNumber: 'Gutschrift Nr.',
    creditNoteDescription: 'Stornierung der Vermittlungsgebuhr',
    originalInvoiceRef: 'Ref. Originalrechnung',
    refundReasonLabel: 'Grund',
    creditNoteFooter: 'Dieses Dokument storniert die Originalrechnung teilweise oder vollstandig.',
    creditNoteEmailSubject: 'Ihre SOS Expat Gutschrift',
    creditNoteEmailBody: 'Hallo,<br><br>Nach Ihrer Erstattung finden Sie im Anhang Ihre Gutschrift.<br><br>Mit freundlichen Grussen,<br>Das SOS Expat Team',
  },

  // ============================================================================
  // PORTUGUESE
  // ============================================================================
  pt: {
    documentTitle: 'Fatura',
    platformInvoiceTitle: 'Fatura de serviço de conexão',
    providerInvoiceTitle: 'Fatura do provedor',
    invoiceNumber: 'Fatura N°',
    date: 'Data',
    issuer: 'EMISSOR',
    client: 'CLIENTE',
    companyName: 'SOS Expat',
    platformDescription: 'SOS Expat SAS<br>Serviço de conexão',
    description: 'Descrição',
    amount: 'Valor',
    total: 'TOTAL',
    platformFeeDescription: 'Taxa de serviço de conexão',
    consultationDescription: 'Serviço de consultoria',
    thankYouMessage: 'Obrigado pela sua confiança.',
    legalNotice: 'SOS Expat SAS - Serviço de conexão entre expatriados e profissionais',
    validWithoutSignature: 'Documento gerado automaticamente - Válido sem assinatura',
    emailSubject: 'Sua fatura SOS Expat',
    emailBody: 'Olá,<br><br>Segue em anexo sua fatura para sua consulta com SOS Expat.<br><br>Atenciosamente,<br>A equipe SOS Expat',
    emailCallToAction: 'Baixar fatura',
    creditNoteTitle: 'Nota de credito',
    creditNoteNumber: 'Nota de credito N°',
    creditNoteDescription: 'Cancelamento da taxa de servico de conexao',
    originalInvoiceRef: 'Ref. fatura original',
    refundReasonLabel: 'Motivo',
    creditNoteFooter: 'Este documento cancela parcial ou totalmente a fatura original.',
    creditNoteEmailSubject: 'Sua nota de credito SOS Expat',
    creditNoteEmailBody: 'Ola,<br><br>Apos seu reembolso, segue em anexo sua nota de credito.<br><br>Atenciosamente,<br>A equipe SOS Expat',
  },

  // ============================================================================
  // RUSSIAN
  // ============================================================================
  ru: {
    documentTitle: 'Счет',
    platformInvoiceTitle: 'Счет за услуги по подключению',
    providerInvoiceTitle: 'Счет поставщика',
    invoiceNumber: 'Счет №',
    date: 'Дата',
    issuer: 'ЭМИТЕНТ',
    client: 'КЛИЕНТ',
    companyName: 'SOS Expat',
    platformDescription: 'SOS Expat SAS<br>Услуги по подключению',
    description: 'Описание',
    amount: 'Сумма',
    total: 'ИТОГО',
    platformFeeDescription: 'Плата за услуги подключения',
    consultationDescription: 'Консультационные услуги',
    thankYouMessage: 'Спасибо за ваше доверие.',
    legalNotice: 'SOS Expat SAS - Услуга подключения между экспатриантами и профессионалами',
    validWithoutSignature: 'Автоматически созданный документ - Действителен без подписи',
    emailSubject: 'Ваш счет SOS Expat',
    emailBody: 'Здравствуйте,<br><br>Пожалуйста, найдите в приложении ваш счет за консультацию с SOS Expat.<br><br>С уважением,<br>Команда SOS Expat',
    emailCallToAction: 'Скачать счет',
    creditNoteTitle: 'Кредитная нота',
    creditNoteNumber: 'Кредитная нота №',
    creditNoteDescription: 'Отмена платы за услуги подключения',
    originalInvoiceRef: 'Реф. оригинального счета',
    refundReasonLabel: 'Причина',
    creditNoteFooter: 'Этот документ частично или полностью отменяет и заменяет оригинальный счет.',
    creditNoteEmailSubject: 'Ваша кредитная нота SOS Expat',
    creditNoteEmailBody: 'Здравствуйте,<br><br>После вашего возврата, пожалуйста, найдите прилагаемую кредитную ноту.<br><br>С уважением,<br>Команда SOS Expat',
  },

  // ============================================================================
  // CHINESE (Simplified)
  // ============================================================================
  zh: {
    documentTitle: '发票',
    platformInvoiceTitle: '连接服务发票',
    providerInvoiceTitle: '服务商发票',
    invoiceNumber: '发票号',
    date: '日期',
    issuer: '发行方',
    client: '客户',
    companyName: 'SOS Expat',
    platformDescription: 'SOS Expat SAS<br>连接服务',
    description: '描述',
    amount: '金额',
    total: '总计',
    platformFeeDescription: '连接服务费',
    consultationDescription: '咨询服务',
    thankYouMessage: '感谢您的信任。',
    legalNotice: 'SOS Expat SAS - 侨民与专业人士之间的连接服务',
    validWithoutSignature: '自动生成的文档 - 无需签名即有效',
    emailSubject: '您的 SOS Expat 发票',
    emailBody: '您好，<br><br>请查收附件中您与 SOS Expat 咨询的发票。<br><br>此致敬礼，<br>SOS Expat 团队',
    emailCallToAction: '下载发票',
    creditNoteTitle: '贷项通知单',
    creditNoteNumber: '贷项通知单号',
    creditNoteDescription: '取消连接服务费',
    originalInvoiceRef: '原始发票参考',
    refundReasonLabel: '原因',
    creditNoteFooter: '本文件部分或全部取消并替换原始发票。',
    creditNoteEmailSubject: '您的 SOS Expat 贷项通知单',
    creditNoteEmailBody: '您好，<br><br>退款完成后，请查收附件中的贷项通知单。<br><br>此致敬礼，<br>SOS Expat 团队',
  },

  // ============================================================================
  // HINDI
  // ============================================================================
  hi: {
    documentTitle: 'चालान',
    platformInvoiceTitle: 'कनेक्शन सेवा चालान',
    providerInvoiceTitle: 'प्रदाता चालान',
    invoiceNumber: 'चालान नंबर',
    date: 'तारीख',
    issuer: 'जारीकर्ता',
    client: 'ग्राहक',
    companyName: 'SOS Expat',
    platformDescription: 'SOS Expat SAS<br>कनेक्शन सेवा',
    description: 'विवरण',
    amount: 'राशि',
    total: 'कुल',
    platformFeeDescription: 'कनेक्शन सेवा शुल्क',
    consultationDescription: 'परामर्श सेवा',
    thankYouMessage: 'आपके विश्वास के लिए धन्यवाद।',
    legalNotice: 'SOS Expat SAS - प्रवासियों और पेशेवरों के बीच कनेक्शन सेवा',
    validWithoutSignature: 'स्वचालित रूप से उत्पन्न दस्तावेज़ - हस्ताक्षर के बिना मान्य',
    emailSubject: 'आपका SOS Expat चालान',
    emailBody: 'नमस्ते,<br><br>कृपया SOS Expat के साथ आपके परामर्श के लिए संलग्न चालान देखें।<br><br>सादर,<br>SOS Expat टीम',
    emailCallToAction: 'चालान डाउनलोड करें',
    creditNoteTitle: 'क्रेडिट नोट',
    creditNoteNumber: 'क्रेडिट नोट नंबर',
    creditNoteDescription: 'कनेक्शन सेवा शुल्क रद्द',
    originalInvoiceRef: 'मूल चालान संदर्भ',
    refundReasonLabel: 'कारण',
    creditNoteFooter: 'यह दस्तावेज़ आंशिक या पूर्ण रूप से मूल चालान को रद्द करता है।',
    creditNoteEmailSubject: 'आपका SOS Expat क्रेडिट नोट',
    creditNoteEmailBody: 'नमस्ते,<br><br>आपके रिफंड के बाद, कृपया संलग्न क्रेडिट नोट देखें।<br><br>सादर,<br>SOS Expat टीम',
  },

  // ============================================================================
  // ARABIC
  // ============================================================================
  ar: {
    documentTitle: 'فاتورة',
    platformInvoiceTitle: 'فاتورة خدمة الاتصال',
    providerInvoiceTitle: 'فاتورة مقدم الخدمة',
    invoiceNumber: 'رقم الفاتورة',
    date: 'التاريخ',
    issuer: 'المُصدِر',
    client: 'العميل',
    companyName: 'SOS Expat',
    platformDescription: 'SOS Expat SAS<br>خدمة الاتصال',
    description: 'الوصف',
    amount: 'المبلغ',
    total: 'الإجمالي',
    platformFeeDescription: 'رسوم خدمة الاتصال',
    consultationDescription: 'خدمة استشارية',
    thankYouMessage: 'شكراً لثقتكم.',
    legalNotice: 'SOS Expat SAS - خدمة الاتصال بين المغتربين والمهنيين',
    validWithoutSignature: 'وثيقة تم إنشاؤها تلقائياً - صالحة بدون توقيع',
    emailSubject: 'فاتورتك من SOS Expat',
    emailBody: 'مرحباً،<br><br>يرجى العثور على فاتورتك المرفقة لاستشارتك مع SOS Expat.<br><br>مع أطيب التحيات،<br>فريق SOS Expat',
    emailCallToAction: 'تحميل الفاتورة',
    creditNoteTitle: 'إشعار دائن',
    creditNoteNumber: 'رقم إشعار الدائن',
    creditNoteDescription: 'إلغاء رسوم خدمة الاتصال',
    originalInvoiceRef: 'مرجع الفاتورة الأصلية',
    refundReasonLabel: 'السبب',
    creditNoteFooter: 'هذا المستند يلغي جزئياً أو كلياً الفاتورة الأصلية.',
    creditNoteEmailSubject: 'إشعار الدائن الخاص بك من SOS Expat',
    creditNoteEmailBody: 'مرحباً،<br><br>بعد استرداد أموالك، يرجى العثور على إشعار الدائن المرفق.<br><br>مع أطيب التحيات،<br>فريق SOS Expat',
  },
};

/**
 * Get invoice translations for a specific locale
 * Falls back to English if locale is not supported
 */
export function getInvoiceTranslations(locale?: string): InvoiceTranslations {
  if (!locale) return INVOICE_TRANSLATIONS.en;

  // Normalize locale (fr-FR → fr, en-US → en)
  const normalizedLocale = locale.toLowerCase().split('-')[0] as SupportedLocale;

  return INVOICE_TRANSLATIONS[normalizedLocale] || INVOICE_TRANSLATIONS.en;
}

/**
 * Format date according to locale
 */
export function formatInvoiceDate(date: Date, locale: string): string {
  const localeMap: Record<SupportedLocale, string> = {
    fr: 'fr-FR',
    en: 'en-US',
    es: 'es-ES',
    de: 'de-DE',
    pt: 'pt-PT',
    ru: 'ru-RU',
    zh: 'zh-CN',
    hi: 'hi-IN',
    ar: 'ar-SA',
  };

  const normalizedLocale = locale.toLowerCase().split('-')[0] as SupportedLocale;
  const fullLocale = localeMap[normalizedLocale] || 'en-US';

  return date.toLocaleDateString(fullLocale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format currency according to locale
 */
export function formatInvoiceCurrency(
  amount: number,
  currency: string,
  locale: string
): string {
  const normalizedLocale = locale.toLowerCase().split('-')[0] as SupportedLocale;

  const localeMap: Record<SupportedLocale, string> = {
    fr: 'fr-FR',
    en: 'en-US',
    es: 'es-ES',
    de: 'de-DE',
    pt: 'pt-PT',
    ru: 'ru-RU',
    zh: 'zh-CN',
    hi: 'hi-IN',
    ar: 'ar-SA',
  };

  const fullLocale = localeMap[normalizedLocale] || 'en-US';

  try {
    return new Intl.NumberFormat(fullLocale, {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  } catch {
    // Fallback if currency is not supported
    return `${amount.toFixed(2)} ${currency.toUpperCase()}`;
  }
}
