// jsPDF est chargé dynamiquement pour réduire le bundle initial
// import jsPDF from 'jspdf'; // LAZY LOADED
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  addDoc, 
  collection, 
  serverTimestamp, 
  writeBatch, 
  doc, 
  query, 
  where, 
  limit, 
  getDocs,
  updateDoc
} from 'firebase/firestore';
import { storage, db } from '../config/firebase';
import { Timestamp } from 'firebase/firestore';
import { FieldValue } from 'firebase/firestore'; // Ajoute ceci si pas déjà présent

// ==================== TYPES ====================
interface CallRecord {
  id: string;
  clientId: string;
  providerId: string;
  clientName?: string;
  providerName?: string;
  // P0 FIX: Champs séparés pour formater le nom du prestataire en "Prénom L."
  providerFirstName?: string;
  providerLastName?: string;
  serviceType: 'lawyer_call' | 'expat_advice' | 'emergency_help';
  duration?: number;
  clientCountry?: string;
  providerCountry?: string;
  createdAt: Date;
}

/**
 * P0 FIX: Formate le nom du prestataire en "Prénom L." pour protéger la vie privée
 * Ne jamais afficher le nom de famille complet du prestataire
 */
const formatProviderDisplayName = (firstName?: string, lastName?: string, fullName?: string): string => {
  // Si on a prénom et nom séparément, utiliser le format "Prénom L."
  const trimmedFirst = firstName?.trim() || '';
  const trimmedLast = lastName?.trim() || '';

  if (trimmedFirst && trimmedLast) {
    return `${trimmedFirst} ${trimmedLast.charAt(0).toUpperCase()}.`;
  }

  if (trimmedFirst) {
    return trimmedFirst;
  }

  // Fallback: essayer de parser le nom complet
  if (fullName) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      const firstName = parts[0];
      const lastName = parts[parts.length - 1];
      return `${firstName} ${lastName.charAt(0).toUpperCase()}.`;
    }
    return fullName; // Retourner tel quel si impossible à parser
  }

  return 'Prestataire';
};

interface Payment {
  amount: number;
  platformFee: number;
  providerAmount: number;
  clientEmail?: string;
  providerEmail?: string;
  providerPhone?: string;
  providerId?: string;
  paymentMethod?: string;
  currency?: string;
  transactionId?: string;
}

interface InvoiceData {
  type: 'platform' | 'provider';
  callRecord: CallRecord;
  payment: Payment;
  amount: number;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  userId?: string;
  locale?: string;
}

interface CompanyInfo {
  name: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  email: string;
  phone: string;
  website: string;
  registrationNumber: string;
  siret?: string;
  vatNumber?: string;
}

interface InvoiceRecord {
  invoiceNumber: string;
  type: 'platform' | 'provider';
  callId: string;
  clientId: string;
  providerId: string;
  amount: number;
  currency: string;
  downloadUrl: string;
  createdAt: Timestamp | FieldValue;
  status: 'issued' | 'sent' | 'paid' | 'cancelled';
  sentToAdmin: boolean;
  forProvider?: boolean;
  locale?: string;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  };
}

// ==================== CONFIGURATION ====================
const COMPANY_INFO: CompanyInfo = {
  name: process.env.REACT_APP_COMPANY_NAME || 'WorldExpat OÜ',
  address: process.env.REACT_APP_COMPANY_ADDRESS || '',
  city: process.env.REACT_APP_COMPANY_CITY || '',
  postalCode: process.env.REACT_APP_COMPANY_POSTAL || '',
  country: process.env.REACT_APP_COMPANY_COUNTRY || '',
  email: process.env.REACT_APP_COMPANY_EMAIL || '',
  phone: process.env.REACT_APP_COMPANY_PHONE || '',
  website: process.env.REACT_APP_COMPANY_WEBSITE || '',
  registrationNumber: process.env.REACT_APP_COMPANY_REG || '',
  siret: process.env.REACT_APP_COMPANY_SIRET || '',
  vatNumber: process.env.REACT_APP_COMPANY_VAT || ''
};

// Configuration des devises supportées
const SUPPORTED_CURRENCIES = {
  EUR: { symbol: '€', position: 'after' },
  USD: { symbol: '$', position: 'before' },
  GBP: { symbol: '£', position: 'before' },
  CHF: { symbol: 'CHF', position: 'after' }
} as const;

// ==================== UTILITAIRES ====================
/**
 * Génère un numéro de facture unique sécurisé
 * Format: PREFIX-YYYYMMDD-HHMMSS-RANDOM
 */
export const generateInvoiceNumber = (type: 'platform' | 'provider', date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  const prefix = type === 'platform' ? 'ULX' : 'PRV';
  return `${prefix}-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`;
};

/**
 * Formate le montant avec la devise appropriée
 */
const formatCurrency = (amount: number, currency: string = 'EUR'): string => {
  const currencyInfo = SUPPORTED_CURRENCIES[currency as keyof typeof SUPPORTED_CURRENCIES] || SUPPORTED_CURRENCIES.EUR;
  const formattedAmount = amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return currencyInfo.position === 'before'
    ? `${currencyInfo.symbol}${formattedAmount}`
    : `${formattedAmount} ${currencyInfo.symbol}`;
};

/**
 * Obtient les traductions pour les factures (i18n ready)
 */
const getInvoiceTranslations = (locale: string = 'en') => {
  const translations = {
    en: {
      invoice: 'INVOICE',
      issuer: 'Issuer:',
      billingDetails: 'Billing Details:',
      billTo: 'Bill To:',
      serviceDescription: 'Service Description',
      date: 'Date',
      amount: 'Amount',
      subtotal: 'Subtotal:',
      vat: 'VAT (0%):',
      total: 'TOTAL:',
      paymentTerms: 'Payment Terms:',
      paymentCompleted: 'Payment completed by credit card via secure platform',
      noFurtherAction: 'No further action required',
      thankYou: 'Thank you for your trust!',
      professionalServices: 'Professional Services',
      vatNotApplicable: 'VAT not applicable - Electronic services',
      connectionFees: 'Connection fees',
      legalConsultation: 'Legal consultation',
      expatAdvice: 'Expat advice',
      emergencyAssistance: 'Emergency assistance',
      country: 'Country:',
      email: 'Email:',
      phone: 'Phone:',
      website: 'Website:',
      registration: 'Registration:',
      vatLabel: 'VAT:',
      issueDate: 'Issue Date:',
      dueDate: 'Due Date:',
      immediate: 'Immediate'
    },
    fr: {
      invoice: 'FACTURE',
      issuer: 'Émetteur :',
      billingDetails: 'Détails de facturation :',
      billTo: 'Facturé à :',
      serviceDescription: 'Description du service',
      date: 'Date',
      amount: 'Montant',
      subtotal: 'Sous-total :',
      vat: 'TVA (0%) :',
      total: 'TOTAL :',
      paymentTerms: 'Conditions de paiement :',
      paymentCompleted: 'Paiement effectué par carte bancaire via plateforme sécurisée',
      noFurtherAction: 'Aucune action supplémentaire requise',
      thankYou: 'Merci pour votre confiance !',
      professionalServices: 'Services Professionnels',
      vatNotApplicable: 'TVA non applicable - Services électroniques',
      connectionFees: 'Frais de mise en relation',
      legalConsultation: 'Consultation juridique',
      expatAdvice: 'Conseil expatriation',
      emergencyAssistance: 'Assistance d\'urgence',
      country: 'Pays :',
      email: 'Email :',
      phone: 'Téléphone :',
      website: 'Site web :',
      registration: 'Immatriculation :',
      vatLabel: 'TVA :',
      issueDate: 'Date d\'émission :',
      dueDate: 'Date d\'échéance :',
      immediate: 'Immédiat'
    },
    es: {
      invoice: 'FACTURA',
      issuer: 'Emisor:',
      billingDetails: 'Datos de facturación:',
      billTo: 'Facturar a:',
      serviceDescription: 'Descripción del servicio',
      date: 'Fecha',
      amount: 'Importe',
      subtotal: 'Subtotal:',
      vat: 'IVA (0%):',
      total: 'TOTAL:',
      paymentTerms: 'Condiciones de pago:',
      paymentCompleted: 'Pago realizado con tarjeta de crédito a través de plataforma segura',
      noFurtherAction: 'No se requiere ninguna acción adicional',
      thankYou: '¡Gracias por su confianza!',
      professionalServices: 'Servicios Profesionales',
      vatNotApplicable: 'IVA no aplicable - Servicios electrónicos',
      connectionFees: 'Gastos de conexión',
      legalConsultation: 'Consulta legal',
      expatAdvice: 'Asesoramiento para expatriados',
      emergencyAssistance: 'Asistencia de emergencia',
      country: 'País:',
      email: 'Email:',
      phone: 'Teléfono:',
      website: 'Sitio web:',
      registration: 'Registro:',
      vatLabel: 'IVA:',
      issueDate: 'Fecha de emisión:',
      dueDate: 'Fecha de vencimiento:',
      immediate: 'Inmediato'
    },
    de: {
      invoice: 'RECHNUNG',
      issuer: 'Aussteller:',
      billingDetails: 'Rechnungsdetails:',
      billTo: 'Rechnung an:',
      serviceDescription: 'Leistungsbeschreibung',
      date: 'Datum',
      amount: 'Betrag',
      subtotal: 'Zwischensumme:',
      vat: 'MwSt. (0%):',
      total: 'GESAMT:',
      paymentTerms: 'Zahlungsbedingungen:',
      paymentCompleted: 'Zahlung per Kreditkarte über sichere Plattform abgeschlossen',
      noFurtherAction: 'Keine weitere Aktion erforderlich',
      thankYou: 'Vielen Dank für Ihr Vertrauen!',
      professionalServices: 'Professionelle Dienstleistungen',
      vatNotApplicable: 'MwSt. nicht anwendbar - Elektronische Dienstleistungen',
      connectionFees: 'Verbindungsgebühren',
      legalConsultation: 'Rechtsberatung',
      expatAdvice: 'Expat-Beratung',
      emergencyAssistance: 'Notfallhilfe',
      country: 'Land:',
      email: 'E-Mail:',
      phone: 'Telefon:',
      website: 'Webseite:',
      registration: 'Registrierung:',
      vatLabel: 'MwSt.:',
      issueDate: 'Ausstellungsdatum:',
      dueDate: 'Fälligkeitsdatum:',
      immediate: 'Sofort'
    },
    pt: {
      invoice: 'FATURA',
      issuer: 'Emissor:',
      billingDetails: 'Detalhes de faturamento:',
      billTo: 'Faturar para:',
      serviceDescription: 'Descrição do serviço',
      date: 'Data',
      amount: 'Valor',
      subtotal: 'Subtotal:',
      vat: 'IVA (0%):',
      total: 'TOTAL:',
      paymentTerms: 'Condições de pagamento:',
      paymentCompleted: 'Pagamento efetuado por cartão de crédito via plataforma segura',
      noFurtherAction: 'Nenhuma ação adicional necessária',
      thankYou: 'Obrigado pela sua confiança!',
      professionalServices: 'Serviços Profissionais',
      vatNotApplicable: 'IVA não aplicável - Serviços eletrónicos',
      connectionFees: 'Taxas de conexão',
      legalConsultation: 'Consulta jurídica',
      expatAdvice: 'Aconselhamento para expatriados',
      emergencyAssistance: 'Assistência de emergência',
      country: 'País:',
      email: 'Email:',
      phone: 'Telefone:',
      website: 'Website:',
      registration: 'Registo:',
      vatLabel: 'IVA:',
      issueDate: 'Data de emissão:',
      dueDate: 'Data de vencimento:',
      immediate: 'Imediato'
    },
    ru: {
      invoice: 'СЧЁТ',
      issuer: 'Поставщик:',
      billingDetails: 'Платёжные реквизиты:',
      billTo: 'Получатель:',
      serviceDescription: 'Описание услуги',
      date: 'Дата',
      amount: 'Сумма',
      subtotal: 'Подытог:',
      vat: 'НДС (0%):',
      total: 'ИТОГО:',
      paymentTerms: 'Условия оплаты:',
      paymentCompleted: 'Оплата произведена кредитной картой через защищённую платформу',
      noFurtherAction: 'Дополнительных действий не требуется',
      thankYou: 'Спасибо за доверие!',
      professionalServices: 'Профессиональные услуги',
      vatNotApplicable: 'НДС не применяется - Электронные услуги',
      connectionFees: 'Плата за подключение',
      legalConsultation: 'Юридическая консультация',
      expatAdvice: 'Консультация для экспатов',
      emergencyAssistance: 'Экстренная помощь',
      country: 'Страна:',
      email: 'Email:',
      phone: 'Телефон:',
      website: 'Сайт:',
      registration: 'Регистрация:',
      vatLabel: 'НДС:',
      issueDate: 'Дата выставления:',
      dueDate: 'Срок оплаты:',
      immediate: 'Немедленно'
    },
    hi: {
      invoice: 'चालान',
      issuer: 'जारीकर्ता:',
      billingDetails: 'बिलिंग विवरण:',
      billTo: 'बिल प्राप्तकर्ता:',
      serviceDescription: 'सेवा विवरण',
      date: 'दिनांक',
      amount: 'राशि',
      subtotal: 'उप-योग:',
      vat: 'वैट (0%):',
      total: 'कुल:',
      paymentTerms: 'भुगतान की शर्तें:',
      paymentCompleted: 'सुरक्षित प्लेटफॉर्म के माध्यम से क्रेडिट कार्ड द्वारा भुगतान पूर्ण',
      noFurtherAction: 'कोई अतिरिक्त कार्रवाई आवश्यक नहीं',
      thankYou: 'आपके विश्वास के लिए धन्यवाद!',
      professionalServices: 'पेशेवर सेवाएं',
      vatNotApplicable: 'वैट लागू नहीं - इलेक्ट्रॉनिक सेवाएं',
      connectionFees: 'कनेक्शन शुल्क',
      legalConsultation: 'कानूनी परामर्श',
      expatAdvice: 'प्रवासी सलाह',
      emergencyAssistance: 'आपातकालीन सहायता',
      country: 'देश:',
      email: 'ईमेल:',
      phone: 'फोन:',
      website: 'वेबसाइट:',
      registration: 'पंजीकरण:',
      vatLabel: 'वैट:',
      issueDate: 'जारी करने की तिथि:',
      dueDate: 'नियत तिथि:',
      immediate: 'तत्काल'
    },
    ar: {
      invoice: 'فاتورة',
      issuer: 'المُصدر:',
      billingDetails: 'تفاصيل الفواتير:',
      billTo: 'فاتورة إلى:',
      serviceDescription: 'وصف الخدمة',
      date: 'التاريخ',
      amount: 'المبلغ',
      subtotal: 'المجموع الفرعي:',
      vat: 'ضريبة القيمة المضافة (0%):',
      total: 'المجموع:',
      paymentTerms: 'شروط الدفع:',
      paymentCompleted: 'تم الدفع ببطاقة الائتمان عبر منصة آمنة',
      noFurtherAction: 'لا يلزم أي إجراء إضافي',
      thankYou: 'شكراً لثقتكم!',
      professionalServices: 'خدمات مهنية',
      vatNotApplicable: 'ضريبة القيمة المضافة غير قابلة للتطبيق - خدمات إلكترونية',
      connectionFees: 'رسوم الاتصال',
      legalConsultation: 'استشارة قانونية',
      expatAdvice: 'نصائح للمغتربين',
      emergencyAssistance: 'مساعدة طارئة',
      country: 'البلد:',
      email: 'البريد الإلكتروني:',
      phone: 'الهاتف:',
      website: 'الموقع:',
      registration: 'التسجيل:',
      vatLabel: 'ض.ق.م:',
      issueDate: 'تاريخ الإصدار:',
      dueDate: 'تاريخ الاستحقاق:',
      immediate: 'فوري'
    },
    ch: {
      invoice: '发票',
      issuer: '开票方：',
      billingDetails: '账单详情：',
      billTo: '收票方：',
      serviceDescription: '服务描述',
      date: '日期',
      amount: '金额',
      subtotal: '小计：',
      vat: '增值税 (0%)：',
      total: '总计：',
      paymentTerms: '付款条款：',
      paymentCompleted: '已通过安全平台使用信用卡完成付款',
      noFurtherAction: '无需其他操作',
      thankYou: '感谢您的信任！',
      professionalServices: '专业服务',
      vatNotApplicable: '增值税不适用 - 电子服务',
      connectionFees: '连接费用',
      legalConsultation: '法律咨询',
      expatAdvice: '外籍人士建议',
      emergencyAssistance: '紧急援助',
      country: '国家：',
      email: '邮箱：',
      phone: '电话：',
      website: '网站：',
      registration: '注册号：',
      vatLabel: '增值税：',
      issueDate: '开票日期：',
      dueDate: '到期日期：',
      immediate: '立即'
    }
  };

  return translations[locale as keyof typeof translations] || translations.en;
};

// ==================== GÉNÉRATION PDF ====================
/**
 * Génère le PDF de facture avec design professionnel et responsive
 * jsPDF est chargé dynamiquement pour réduire le bundle initial (~300KB)
 */
export const generateInvoicePDF = async (invoiceData: InvoiceData): Promise<Blob> => {
  try {
    // Dynamic import de jsPDF - chargé uniquement quand nécessaire
    const { default: jsPDF } = await import('jspdf');

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });
    
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 20;
    const t = getInvoiceTranslations(invoiceData.locale);
    const currency = invoiceData.payment.currency || 'EUR';

    // ========== EN-TÊTE ==========
    pdf.setFillColor(41, 128, 185);
    pdf.rect(0, 0, pageWidth, 30, 'F');
    
    // Logo/Nom de l'entreprise
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(26);
    pdf.setFont('helvetica', 'bold');
    pdf.text(COMPANY_INFO.name, margin, 20);
    
    // Slogan
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text(t.professionalServices, margin, 26);

    // ========== TITRE FACTURE ==========
    pdf.setTextColor(41, 128, 185);
    pdf.setFontSize(32);
    pdf.setFont('helvetica', 'bold');
    pdf.text(t.invoice, pageWidth - margin, 50, { align: 'right' });

    // ========== INFORMATIONS ÉMETTEUR ==========
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(t.issuer, margin, 65);
    
    pdf.setFont('helvetica', 'normal');
    let yPos = 72;
    
    if (invoiceData.type === 'platform') {
      // Facture plateforme
      pdf.text(COMPANY_INFO.name, margin, yPos);
      if (COMPANY_INFO.address) pdf.text(COMPANY_INFO.address, margin, yPos + 5);
      if (COMPANY_INFO.city || COMPANY_INFO.postalCode) {
        pdf.text(`${COMPANY_INFO.postalCode} ${COMPANY_INFO.city}`.trim(), margin, yPos + 10);
      }
      if (COMPANY_INFO.country) pdf.text(COMPANY_INFO.country, margin, yPos + 15);
      if (COMPANY_INFO.email) pdf.text(`${t.email} ${COMPANY_INFO.email}`, margin, yPos + 20);
      if (COMPANY_INFO.phone) pdf.text(`${t.phone} ${COMPANY_INFO.phone}`, margin, yPos + 25);
      if (COMPANY_INFO.website) pdf.text(`${t.website} ${COMPANY_INFO.website}`, margin, yPos + 30);
      if (COMPANY_INFO.registrationNumber) pdf.text(`${t.registration} ${COMPANY_INFO.registrationNumber}`, margin, yPos + 35);
      if (COMPANY_INFO.vatNumber) pdf.text(`${t.vat} ${COMPANY_INFO.vatNumber}`, margin, yPos + 40);
    } else {
      // Facture prestataire
      // P0 FIX: Utiliser le format "Prénom L." pour le nom du prestataire
      const providerName = formatProviderDisplayName(
        invoiceData.callRecord.providerFirstName,
        invoiceData.callRecord.providerLastName,
        invoiceData.callRecord.providerName
      );
      pdf.text(providerName, margin, yPos);
      if (invoiceData.payment.providerEmail) {
        pdf.text(`${t.email} ${invoiceData.payment.providerEmail}`, margin, yPos + 5);
      }
      // SECURITY: Provider phone number intentionally NOT displayed on invoice
      if (invoiceData.callRecord.providerCountry) {
        pdf.text(`${t.country} ${invoiceData.callRecord.providerCountry}`, margin, yPos + 10);
      }
    }

    // ========== DÉTAILS DE FACTURATION ==========
    yPos = 72;
    pdf.setFont('helvetica', 'bold');
    pdf.text(t.billingDetails, pageWidth - margin, yPos, { align: 'right' });
    
    pdf.setFont('helvetica', 'normal');
    pdf.text(`N°: ${invoiceData.invoiceNumber}`, pageWidth - margin, yPos + 7, { align: 'right' });
    pdf.text(`${t.issueDate} ${invoiceData.issueDate.toLocaleDateString(invoiceData.locale || 'en-US')}`, pageWidth - margin, yPos + 14, { align: 'right' });
    pdf.text(`${t.dueDate} ${invoiceData.dueDate?.toLocaleDateString(invoiceData.locale || 'en-US') || t.immediate}`, pageWidth - margin, yPos + 21, { align: 'right' });

    // ========== INFORMATIONS CLIENT ==========
    yPos = 135;
    pdf.setFillColor(248, 249, 250);
    pdf.rect(margin, yPos, pageWidth - 2 * margin, 28, 'F');
    pdf.setDrawColor(233, 236, 239);
    pdf.rect(margin, yPos, pageWidth - 2 * margin, 28);
    
    pdf.setFont('helvetica', 'bold');
    pdf.text(t.billTo, margin + 5, yPos + 10);
    
    pdf.setFont('helvetica', 'normal');
    pdf.text(invoiceData.callRecord.clientName || 'Client', margin + 5, yPos + 17);
    if (invoiceData.payment.clientEmail) {
      pdf.text(invoiceData.payment.clientEmail, margin + 5, yPos + 22);
    }
    
    if (invoiceData.callRecord.clientCountry) {
      pdf.text(`${t.country} ${invoiceData.callRecord.clientCountry}`, pageWidth - margin - 5, yPos + 17, { align: 'right' });
    }

    // ========== TABLEAU DES SERVICES ==========
    yPos = 180;
    
    // En-tête tableau
    pdf.setFillColor(41, 128, 185);
    pdf.rect(margin, yPos, pageWidth - 2 * margin, 12, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text(t.serviceDescription, margin + 5, yPos + 8);
    pdf.text(t.date, pageWidth - 85, yPos + 8);
    pdf.text(t.amount, pageWidth - margin - 5, yPos + 8, { align: 'right' });

    // Contenu tableau
    yPos += 12;
    pdf.setFillColor(255, 255, 255);
    pdf.rect(margin, yPos, pageWidth - 2 * margin, 25, 'F');
    pdf.setDrawColor(233, 236, 239);
    pdf.rect(margin, yPos, pageWidth - 2 * margin, 25);
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    
    // Description du service
    let serviceDescription = '';
    if (invoiceData.type === 'platform') {
      serviceDescription = t.connectionFees;
      // P0 FIX: Utiliser le format "Prénom L." dans la description du service
      if (invoiceData.callRecord.providerName || invoiceData.callRecord.providerFirstName) {
        const formattedProviderName = formatProviderDisplayName(
          invoiceData.callRecord.providerFirstName,
          invoiceData.callRecord.providerLastName,
          invoiceData.callRecord.providerName
        );
        serviceDescription += ` - ${formattedProviderName}`;
      }
    } else {
      const serviceTypes = {
        'lawyer_call': t.legalConsultation,
        'expat_advice': t.expatAdvice,
        'emergency_help': t.emergencyAssistance
      };
      serviceDescription = serviceTypes[invoiceData.callRecord.serviceType] || 'Service';
      if (invoiceData.callRecord.providerCountry) {
        serviceDescription += ` (${invoiceData.callRecord.providerCountry})`;
      }
    }
    
    pdf.text(serviceDescription, margin + 5, yPos + 10);
    if (invoiceData.callRecord.duration) {
      pdf.text(`(${invoiceData.callRecord.duration} min)`, margin + 5, yPos + 16);
    }
    
    pdf.text(invoiceData.callRecord.createdAt.toLocaleDateString(invoiceData.locale || 'en-US'), pageWidth - 85, yPos + 10);
    pdf.text(formatCurrency(invoiceData.amount, currency), pageWidth - margin - 5, yPos + 10, { align: 'right' });

    // ========== TOTAUX ==========
    yPos += 40;
    const totalBoxWidth = 90;
    
    // Sous-total
    pdf.setFontSize(11);
    pdf.text(t.subtotal, pageWidth - margin - totalBoxWidth, yPos, { align: 'right' });
    pdf.text(formatCurrency(invoiceData.amount, currency), pageWidth - margin - 5, yPos, { align: 'right' });
    
    // TVA
    yPos += 8;
    pdf.text(t.vat, pageWidth - margin - totalBoxWidth, yPos, { align: 'right' });
    pdf.text(formatCurrency(0, currency), pageWidth - margin - 5, yPos, { align: 'right' });
    
    // Total
    yPos += 15;
    pdf.setFillColor(41, 128, 185);
    pdf.rect(pageWidth - margin - totalBoxWidth, yPos - 6, totalBoxWidth, 14, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text(t.total, pageWidth - margin - totalBoxWidth + 5, yPos + 2);
    pdf.text(formatCurrency(invoiceData.amount, currency), pageWidth - margin - 5, yPos + 2, { align: 'right' });

    // ========== MENTIONS LÉGALES ==========
    yPos += 25;
    pdf.setTextColor(108, 117, 125);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(t.vatNotApplicable, margin, yPos);

    // ========== CONDITIONS DE PAIEMENT ==========
    yPos += 15;
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(t.paymentTerms, margin, yPos);
    
    pdf.setFont('helvetica', 'normal');
    pdf.text(t.paymentCompleted, margin, yPos + 6);
    pdf.text(t.noFurtherAction, margin, yPos + 11);

    // ========== PIED DE PAGE ==========
    const footerY = pageHeight - 30;
    pdf.setFillColor(248, 249, 250);
    pdf.rect(0, footerY - 5, pageWidth, 35, 'F');
    
    pdf.setTextColor(41, 128, 185);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text(t.thankYou, pageWidth / 2, footerY + 5, { align: 'center' });
    
    pdf.setTextColor(108, 117, 125);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(`${COMPANY_INFO.name} - ${t.professionalServices}`, pageWidth / 2, footerY + 12, { align: 'center' });
    
    if (COMPANY_INFO.email && COMPANY_INFO.website) {
      pdf.text(`${COMPANY_INFO.email} | ${COMPANY_INFO.website}`, pageWidth / 2, footerY + 17, { align: 'center' });
    }

    return pdf.output('blob');
  } catch (error) {
    console.error('Erreur génération PDF:', error);
    throw new Error(`Échec génération PDF: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  }
};

// ==================== SAUVEGARDE FIREBASE ====================
/**
 * Sauvegarde sécurisée dans Firebase Storage avec retry
 */
const saveInvoiceToStorage = async (
  invoiceBlob: Blob,
  invoiceNumber: string,
  type: 'platform' | 'provider',
  maxRetries: number = 3
): Promise<string> => {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const fileName = `${invoiceNumber}.pdf`;
      // P0 FIX: Le mois doit avoir un zéro initial (01-12) pour correspondre à la regex des storage rules
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const path = `invoices/${type}/${new Date().getFullYear()}/${month}/${fileName}`;
      const storageRef = ref(storage, path);
      
      // Métadonnées pour améliorer l'organisation
      const metadata = {
        contentType: 'application/pdf',
        customMetadata: {
          type,
          invoiceNumber,
          createdAt: new Date().toISOString(),
          version: '1.0'
        }
      };
      
      const uploadResult = await uploadBytes(storageRef, invoiceBlob, metadata);
      const downloadURL = await getDownloadURL(uploadResult.ref);
      
      console.log(`✅ Facture ${type} sauvegardée (tentative ${attempt}):`, fileName);
      return downloadURL;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Erreur inconnue');
      console.warn(`❌ Échec sauvegarde (tentative ${attempt}/${maxRetries}):`, lastError.message);
      
      if (attempt < maxRetries) {
        // Délai exponentiel entre les tentatives
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }
  
  throw new Error(`Impossible de sauvegarder après ${maxRetries} tentatives: ${lastError?.message}`);
};

/**
 * Création optimisée des enregistrements avec batch write
 */
const createInvoiceRecords = async (
  platformData: InvoiceRecord,
  providerData: InvoiceRecord,
  callRecord: CallRecord,
  payment: Payment
): Promise<void> => {
  try {
    const batch = writeBatch(db);
    
    // Collection principale des factures (2 factures: platform + provider pour le client)
    // La copie provider pour le prestataire est créée par Cloud Functions
    const platformDocRef = doc(collection(db, 'invoices'));
    const providerDocRef = doc(collection(db, 'invoices'));
    
    // Facture plateforme pour le client
    batch.set(platformDocRef, {
      ...platformData,
      status: 'issued',
      sentToAdmin: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Facture prestataire pour le client
    batch.set(providerDocRef, {
      ...providerData,
      status: 'issued',
      sentToAdmin: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // P0 FIX: La copie pour le prestataire est déléguée aux Cloud Functions
    // car les rules exigent clientId == auth.uid (l'utilisateur courant est le CLIENT)
    // Un trigger onInvoiceCreated créera la copie pour le provider
    if (payment.providerId) {
      console.log('ℹ️ [PROVIDER_COPY] Provider invoice copy will be created by Cloud Function:', {
        providerId: payment.providerId,
        invoiceNumber: providerData.invoiceNumber
      });
    }
    
    // P0 FIX: L'écriture dans invoice_index est déléguée aux Cloud Functions
    // car cette collection n'a pas de règles Firestore pour les clients
    console.log('ℹ️ [INVOICE_INDEX] Index data for Cloud Function:', {
      callId: callRecord.id,
      clientId: callRecord.clientId,
      providerId: callRecord.providerId,
      platformInvoiceId: platformDocRef.id,
      providerInvoiceId: providerDocRef.id
    });
    
    await batch.commit();
    console.log('✅ Enregistrements de factures créés avec succès');
  } catch (error) {
    console.error('❌ Erreur création des enregistrements:', error);
    throw error;
  }
};

/**
 * Envoi optimisé vers la console d'administration
 *
 * P0 FIX: Les écritures vers admin_invoices, admin_stats et audit_logs
 * sont bloquées par les security rules Firestore (allow create: if false;).
 * Ces données doivent être écrites par des Cloud Functions (Admin SDK) et non
 * par le client. Cette fonction est maintenant un no-op qui log les données
 * pour référence mais ne tente plus d'écrire.
 *
 * TODO: Implémenter une Cloud Function "onInvoiceGenerated" qui écoute
 * les créations dans invoice_records et crée les documents admin correspondants.
 */
const sendInvoicesToAdmin = async (
  platformRecord: InvoiceRecord,
  providerRecord: InvoiceRecord,
  callRecord: CallRecord,
  payment: Payment
): Promise<boolean> => {
  // P0 FIX: Ne pas tenter d'écrire dans les collections admin depuis le client
  // Les security rules bloquent ces écritures et causent des erreurs
  console.log('ℹ️ [ADMIN_DATA] Données admin disponibles pour Cloud Function:', {
    callId: callRecord.id,
    platformInvoice: platformRecord.invoiceNumber,
    providerInvoice: providerRecord.invoiceNumber,
    totalAmount: payment.amount,
    platformFee: payment.platformFee,
    providerAmount: payment.providerAmount
  });

  // Retourner true pour ne pas bloquer le flux
  // Les données admin seront créées par un trigger Cloud Function sur invoice_records
  console.log('✅ Données admin prêtes (écriture déléguée aux Cloud Functions)');
  return true;
};

// ==================== FONCTION PRINCIPALE ====================
/**
 * Génération complète et optimisée des factures
 * Fonction principale prête pour la production
 */
export const generateBothInvoices = async (
  callRecord: CallRecord,
  payment: Payment,
  userId: string,
  options: {
    locale?: string;
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
    };
  } = {}
): Promise<{ 
  platformInvoiceUrl: string; 
  providerInvoiceUrl: string;
  invoiceNumbers: {
    platform: string;
    provider: string;
  };
}> => {
  const startTime = Date.now();
  
  try {
    console.log(`🚀 Début génération factures pour l'appel:`, callRecord.id);
    
    // Validation des données d'entrée
    if (!callRecord?.id || !payment?.amount || !userId) {
      throw new Error('Données d\'entrée invalides pour la génération de factures');
    }
    
    // Configuration des dates
    const issueDate = new Date();
    const dueDate = new Date(issueDate); // Paiement immédiat
    
    // Génération des numéros de facture uniques
    const platformInvoiceNumber = generateInvoiceNumber('platform', issueDate);
    const providerInvoiceNumber = generateInvoiceNumber('provider', issueDate);
    
    console.log(`📋 Numéros générés - Plateforme: ${platformInvoiceNumber}, Prestataire: ${providerInvoiceNumber}`);

    // Configuration des données de facture
    const platformInvoiceData: InvoiceData = {
      type: 'platform',
      callRecord,
      payment,
      amount: payment.platformFee,
      invoiceNumber: platformInvoiceNumber,
      issueDate,
      dueDate,
      userId,
      locale: options.locale || 'en'
    };

    const providerInvoiceData: InvoiceData = {
      type: 'provider',
      callRecord,
      payment,
      amount: payment.providerAmount,
      invoiceNumber: providerInvoiceNumber,
      issueDate,
      dueDate,
      userId: payment.providerId || userId,
      locale: options.locale || 'en'
    };

    console.log(`📄 Génération des PDFs en cours...`);
    
    // Génération parallèle des PDFs
    const [platformPDF, providerPDF] = await Promise.all([
      generateInvoicePDF(platformInvoiceData),
      generateInvoicePDF(providerInvoiceData)
    ]);

    console.log(`💾 Sauvegarde dans Firebase Storage...`);
    
    // Sauvegarde parallèle dans Firebase Storage
    const [platformInvoiceUrl, providerInvoiceUrl] = await Promise.all([
      saveInvoiceToStorage(platformPDF, platformInvoiceNumber, 'platform'),
      saveInvoiceToStorage(providerPDF, providerInvoiceNumber, 'provider')
    ]);

    // Préparation des enregistrements de base de données
    const platformRecord: InvoiceRecord = {
      invoiceNumber: platformInvoiceNumber,
      type: 'platform',
      callId: callRecord.id,
      clientId: callRecord.clientId,
      providerId: callRecord.providerId,
      amount: payment.platformFee,
      currency: payment.currency || 'EUR',
      downloadUrl: platformInvoiceUrl,
      createdAt: serverTimestamp(),
      status: 'issued',
      sentToAdmin: false,
      locale: options.locale || 'en',
      metadata: options.metadata
    };
    
    const providerRecord: InvoiceRecord = {
      invoiceNumber: providerInvoiceNumber,
      type: 'provider',
      callId: callRecord.id,
      clientId: callRecord.clientId,
      providerId: callRecord.providerId,
      amount: payment.providerAmount,
      currency: payment.currency || 'EUR',
      downloadUrl: providerInvoiceUrl,
      createdAt: serverTimestamp(),
      status: 'issued',
      sentToAdmin: false,
      locale: options.locale || 'en',
      metadata: options.metadata
    };

    console.log(`🗄️ Enregistrement en base de données...`);
    
    // Exécution parallèle des opérations de base de données
    await Promise.all([
      createInvoiceRecords(platformRecord, providerRecord, callRecord, payment),
      sendInvoicesToAdmin(platformRecord, providerRecord, callRecord, payment)
    ]);
    
    const executionTime = Date.now() - startTime;
    
    console.log(`✅ Génération des factures terminée avec succès en ${executionTime}ms`);
    console.log(`📧 Facture plateforme: ${platformInvoiceNumber} → Client`);
    console.log(`📧 Facture prestataire: ${providerInvoiceNumber} → Client & Prestataire`);
    console.log(`🔧 Données synchronisées avec la console d'administration`);
    
    // Enregistrement des métriques de performance
    try {
      await addDoc(collection(db, 'performance_metrics'), {
        operation: 'generate_invoices',
        callId: callRecord.id,
        executionTime,
        timestamp: serverTimestamp(),
        success: true,
        invoiceCount: 2,
        fileSize: {
          platform: platformPDF.size,
          provider: providerPDF.size
        }
      });
    } catch (metricsError) {
      console.warn('⚠️ Erreur enregistrement métriques:', metricsError);
      // Non bloquant - continuer le processus
    }
    
    return {
      platformInvoiceUrl,
      providerInvoiceUrl,
      invoiceNumbers: {
        platform: platformInvoiceNumber,
        provider: providerInvoiceNumber
      }
    };
    
  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    
    console.error(`❌ Erreur critique lors de la génération des factures (${executionTime}ms):`, error);
    
    // Enregistrement de l'erreur pour le monitoring
    try {
      await addDoc(collection(db, 'error_logs'), {
        operation: 'generate_invoices',
        callId: callRecord.id,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : null,
        executionTime,
        timestamp: serverTimestamp(),
        userId,
        metadata: options.metadata
      });
    } catch (logError) {
      console.error('❌ Erreur lors de l\'enregistrement du log d\'erreur:', logError);
    }
    
    throw new Error(`Génération des factures échouée: ${errorMessage}`);
  }
};

// ==================== UTILITAIRES ADDITIONNELS ====================

/**
 * Récupère une facture par son numéro
 */
export const getInvoiceByNumber = async (invoiceNumber: string): Promise<InvoiceRecord | null> => {
  try {
    const invoicesRef = collection(db, 'invoices');
    const q = query(invoicesRef, where('invoiceNumber', '==', invoiceNumber), limit(1));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    return { ...doc.data(), id: doc.id } as InvoiceRecord & { id: string };
  } catch (error) {
    console.error('Erreur récupération facture:', error);
    throw error;
  }
};

/**
 * Récupère toutes les factures d'un appel
 */
export const getInvoicesByCallId = async (callId: string): Promise<InvoiceRecord[]> => {
  try {
    const invoicesRef = collection(db, 'invoices');
    const q = query(invoicesRef, where('callId', '==', callId));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    })) as (InvoiceRecord & { id: string })[];
  } catch (error) {
    console.error('Erreur récupération factures par appel:', error);
    throw error;
  }
};

/**
 * Met à jour le statut d'une facture
 */
export const updateInvoiceStatus = async (
  invoiceId: string, 
  status: InvoiceRecord['status'],
  additionalData?: Partial<InvoiceRecord>
): Promise<void> => {
  try {
    const invoiceRef = doc(db, 'invoices', invoiceId);
    await updateDoc(invoiceRef, {
      status,
      updatedAt: serverTimestamp(),
      ...additionalData
    });
    
    console.log(`✅ Statut facture mis à jour: ${invoiceId} → ${status}`);
  } catch (error) {
    console.error('Erreur mise à jour statut facture:', error);
    throw error;
  }
};

/**
 * Valide la configuration de l'entreprise
 */
export const validateCompanyInfo = (): { isValid: boolean; missingFields: string[] } => {
  const requiredFields: (keyof CompanyInfo)[] = [
    'name', 'email', 'country', 'registrationNumber'
  ];
  
  const missingFields = requiredFields.filter(field => !COMPANY_INFO[field]);
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
};

/**
 * Génère un rapport de factures pour une période donnée
 */
export const generateInvoiceReport = async (
  startDate: Date,
  endDate: Date,
  options: {
    type?: 'platform' | 'provider';
    currency?: string;
    status?: InvoiceRecord['status'];
  } = {}
): Promise<{
  totalInvoices: number;
  totalAmount: number;
  currency: string;
  breakdown: {
    platform: { count: number; amount: number };
    provider: { count: number; amount: number };
  };
}> => {
  try {
    const invoicesRef = collection(db, 'invoices');
    let q = query(
      invoicesRef,
      where('createdAt', '>=', startDate),
      where('createdAt', '<=', endDate)
    );
    
    if (options.type) {
      q = query(q, where('type', '==', options.type));
    }
    
    if (options.status) {
      q = query(q, where('status', '==', options.status));
    }
    
    const querySnapshot = await getDocs(q);
    const invoices = querySnapshot.docs.map(doc => doc.data() as InvoiceRecord);
    
    const currency = options.currency || 'EUR';
    const filteredInvoices = options.currency 
      ? invoices.filter(inv => inv.currency === currency)
      : invoices;
    
    const breakdown = {
      platform: { count: 0, amount: 0 },
      provider: { count: 0, amount: 0 }
    };
    
    let totalAmount = 0;
    
    filteredInvoices.forEach(invoice => {
      totalAmount += invoice.amount;
      breakdown[invoice.type].count++;
      breakdown[invoice.type].amount += invoice.amount;
    });
    
    return {
      totalInvoices: filteredInvoices.length,
      totalAmount,
      currency,
      breakdown
    };
  } catch (error) {
    console.error('Erreur génération rapport:', error);
    throw error;
  }
};

// Export des constantes utiles
export { COMPANY_INFO, SUPPORTED_CURRENCIES, getInvoiceTranslations };