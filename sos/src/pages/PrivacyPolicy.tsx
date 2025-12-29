import React, { useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import {
  Shield,
  Eye,
  Lock,
  Users,
  Check,
  Globe,
  Clock,
  Languages,
} from "lucide-react";
import Layout from "../components/layout/Layout";
import { useApp } from "../contexts/AppContext";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useIntl } from "react-intl";

interface PrivacySection {
  icon: React.ComponentType<{ className?: string }>;
  titleKey: keyof TranslationUnit;
  contentKey: keyof TranslationUnit;
}

type TranslationUnit = {
  title: string;
  subtitle: string;
  lastUpdated: string;
  dataCollection: string;
  dataProtection: string;
  dataSharing: string;
  yourRights: string;
  contact: string;
  dataCollectionContent: string;
  dataProtectionContent: string;
  dataSharingContent: string;
  rights: string[];
  contactContent: string;
  features: string[];
  contactCta: string;
  editHint: string;
};

type Translations = {
  fr: TranslationUnit;
  en: TranslationUnit;
  es: TranslationUnit;
  de: TranslationUnit;
  ru: TranslationUnit;
  hi: TranslationUnit;
  pt: TranslationUnit;
  ch: TranslationUnit;
  ar: TranslationUnit;
};

const PrivacyPolicy: React.FC = () => {
  const intl = useIntl();
  const { language } = useApp();

  // --- State (business logic preserved) ---
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Local toggle without changing global app language
  const [selectedLanguage, setSelectedLanguage] = useState<

    "fr" | "en" | "es" | "de" | "ru" | "hi" | "pt" | "ch" | "ar"
  >(
    (language as
      | "fr"
      | "en"
      | "es"
      | "de"
      | "ru"
      | "hi"
      | "pt"
      | "ch"
      | "ar") || "fr"
  );

  useEffect(() => {
    if (language)
      setSelectedLanguage(
        language as "fr" | "en" | "es" | "de" | "ru" | "hi" | "pt" | "ch" | "ar"
      );
  }, [language]);

  // --- Static texts / i18n ---
  const texts: Translations = useMemo(
    () => ({
      fr: {
        title: "Politique de confidentialité",
        subtitle: "Votre vie privée est notre priorité",
        lastUpdated: "Version 2.2 – Dernière mise à jour : 16 juin 2025",
        dataCollection: "Collecte des données",
        dataProtection: "Protection des données",
        dataSharing: "Partage des données",
        yourRights: "Vos droits",
        contact: "Contact",
        dataCollectionContent:
          "Nous collectons uniquement les informations nécessaires pour fournir nos services d'assistance. Cela inclut vos informations de contact, des métadonnées techniques (appels, messagerie) et les détails indispensables à votre demande.",
        dataProtectionContent:
          "Vos données sont chiffrées en transit et au repos lorsque c'est possible et stockées de manière sécurisée. Des mesures techniques et organisationnelles sont mises en œuvre pour prévenir tout accès non autorisé.",
        dataSharingContent:
          "Nous ne vendons jamais vos données personnelles. Nous partageons uniquement les informations nécessaires avec des prestataires vérifiés (paiements, téléphonie, hébergement) pour fournir le service demandé.",
        rights: [
          "Droit d'accès à vos données",
          "Droit de rectification",
          "Droit à l'effacement (dans les limites légales)",
          "Droit à la portabilité",
          "Droit d’opposition et de limitation",
        ],
        contactContent:
          "Pour toute question ou pour exercer vos droits, utilisez le formulaire dédié ci-dessous.",
        features: [
          "Chiffrement",
          "Transparence",
          "Contrôle utilisateur",
          "Pas de revente de données",
        ],
        contactCta: "Formulaire de contact",
        editHint: "Document éditable depuis la console admin (FR/EN)",
      },
      en: {
        title: "Privacy Policy",
        subtitle: "Your privacy is our priority",
        lastUpdated: "Version 2.2 – Last updated: 16 June 2025",
        dataCollection: "Data Collection",
        dataProtection: "Data Protection",
        dataSharing: "Data Sharing",
        yourRights: "Your Rights",
        contact: "Contact",
        dataCollectionContent:
          "We collect only the information needed to deliver our assistance services. This includes your contact details, technical metadata (calls, messaging) and details strictly required for your request.",
        dataProtectionContent:
          "Your data is encrypted in transit and at rest where possible and stored securely. We apply technical and organizational measures to prevent unauthorized access.",
        dataSharingContent:
          "We never sell your personal data. We only share information necessary with vetted providers (payments, telephony, hosting) to deliver the requested service.",
        rights: [
          "Right of access",
          "Right to rectification",
          "Right to erasure (within legal limits)",
          "Right to data portability",
          "Right to object and restrict",
        ],
        contactContent:
          "For questions or to exercise your rights, please use the form below.",
        features: [
          "Encryption",
          "Transparency",
          "User control",
          "No data resale",
        ],
        contactCta: "Contact form",
        editHint: "Document editable from the admin console (EN/FR)",
      },
      es: {
        title: "Política de privacidad",
        subtitle: "Tu privacidad es nuestra prioridad",
        lastUpdated: "Versión 2.2 – Última actualización: 16 de junio de 2025",
        dataCollection: "Recopilación de datos",
        dataProtection: "Protección de datos",
        dataSharing: "Compartir datos",
        yourRights: "Tus derechos",
        contact: "Contacto",
        dataCollectionContent:
          "Solo recopilamos la información necesaria para proporcionar nuestros servicios de asistencia. Esto incluye tus datos de contacto, metadatos técnicos (llamadas, mensajería) y detalles estrictamente necesarios para tu solicitud.",
        dataProtectionContent:
          "Tus datos están cifrados en tránsito y en reposo cuando es posible y almacenados de forma segura. Aplicamos medidas técnicas y organizativas para prevenir accesos no autorizados.",
        dataSharingContent:
          "Nunca vendemos tus datos personales. Solo compartimos información necesaria con proveedores verificados (pagos, telefonía, alojamiento) para entregar el servicio solicitado.",
        rights: [
          "Derecho de acceso",
          "Derecho de rectificación",
          "Derecho al olvido (dentro de los límites legales)",
          "Derecho a la portabilidad de datos",
          "Derecho a objetar y restringir",
        ],
        contactContent:
          "Para preguntas o ejercer tus derechos, utiliza el formulario a continuación.",
        features: [
          "Cifrado",
          "Transparencia",
          "Control del usuario",
          "Sin reventa de datos",
        ],
        contactCta: "Formulario de contacto",
        editHint: "Documento editable desde la consola de administración (ES)",
      },
      de: {
        title: "Datenschutzerklärung",
        subtitle: "Ihre Privatsphäre ist unsere Priorität",
        lastUpdated: "Version 2.2 – Letzte Aktualisierung: 16. Juni 2025",
        dataCollection: "Datenerfassung",
        dataProtection: "Datenschutz",
        dataSharing: "Datenweitergabe",
        yourRights: "Ihre Rechte",
        contact: "Kontakt",
        dataCollectionContent:
          "Wir erfassen nur die notwendigen Informationen zur Bereitstellung unserer Dienste. Dazu gehören Ihre Kontaktdaten, technische Metadaten (Anrufe, Nachrichten) und Details, die für Ihre Anfrage erforderlich sind.",
        dataProtectionContent:
          "Ihre Daten werden während der Übertragung und im Ruhezustand verschlüsselt und sicher gespeichert. Wir setzen technische und organisatorische Maßnahmen ein, um unbefugten Zugriff zu verhindern.",
        dataSharingContent:
          "Wir verkaufen niemals Ihre persönlichen Daten. Wir geben nur die notwendigen Informationen an geprüfte Anbieter weiter (Zahlungen, Telefonie, Hosting), um den angeforderten Service bereitzustellen.",
        rights: [
          "Recht auf Zugang",
          "Recht auf Berichtigung",
          "Recht auf Löschung (innerhalb gesetzlicher Grenzen)",
          "Recht auf Datenübertragbarkeit",
          "Recht auf Widerspruch und Einschränkung",
        ],
        contactContent:
          "Bei Fragen oder zur Ausübung Ihrer Rechte nutzen Sie bitte das Formular unten.",
        features: [
          "Verschlüsselung",
          "Transparenz",
          "Benutzerkontrolle",
          "Kein Datenverkauf",
        ],
        contactCta: "Kontaktformular",
        editHint: "Dokument bearbeitbar über die Admin-Konsole (DE)",
      },
      ru: {
        title: "Политика конфиденциальности",
        subtitle: "Ваша конфиденциальность — наш приоритет",
        lastUpdated: "Версия 2.2 – Последнее обновление: 16 июня 2025",
        dataCollection: "Сбор данных",
        dataProtection: "Защита данных",
        dataSharing: "Обмен данными",
        yourRights: "Ваши права",
        contact: "Контакт",
        dataCollectionContent:
          "Мы собираем только необходимую информацию для предоставления наших услуг. Это включает ваши контактные данные, технические метаданные (звонки, сообщения) и детали, необходимые для вашего запроса.",
        dataProtectionContent:
          "Ваши данные зашифрованы при передаче и хранении и надежно защищены. Мы применяем технические и организационные меры для предотвращения несанкционированного доступа.",
        dataSharingContent:
          "Мы никогда не продаем ваши личные данные. Мы делимся только необходимой информацией с проверенными поставщиками (платежи, телефония, хостинг) для предоставления запрошенной услуги.",
        rights: [
          "Право на доступ",
          "Право на исправление",
          "Право на удаление (в пределах законных ограничений)",
          "Право на переносимость данных",
          "Право на возражение и ограничение",
        ],
        contactContent:
          "По вопросам или для реализации своих прав воспользуйтесь формой ниже.",
        features: [
          "Шифрование",
          "Прозрачность",
          "Контроль пользователя",
          "Без перепродажи данных",
        ],
        contactCta: "Контактная форма",
        editHint: "Документ редактируется через консоль администратора (RU)",
      },

      pt: {
        title: "Política de Privacidade",
        subtitle: "Sua privacidade é nossa prioridade",
        lastUpdated: "Versão 2.2 – Última atualização: 16 de junho de 2025",
        dataCollection: "Coleta de dados",
        dataProtection: "Proteção de dados",
        dataSharing: "Compartilhamento de dados",
        yourRights: "Seus direitos",
        contact: "Contato",
        dataCollectionContent:
          "Coletamos apenas as informações necessárias para fornecer nossos serviços. Isso inclui seus dados de contato, metadados técnicos (chamadas, mensagens) e detalhes necessários para sua solicitação.",
        dataProtectionContent:
          "Seus dados são criptografados em trânsito e armazenamento e protegidos com segurança. Aplicamos medidas técnicas e organizacionais para evitar acesso não autorizado.",
        dataSharingContent:
          "Nunca vendemos seus dados pessoais. Compartilhamos apenas as informações necessárias com fornecedores verificados (pagamentos, telefonia, hospedagem) para fornecer o serviço solicitado.",
        rights: [
          "Direito de acesso",
          "Direito de retificação",
          "Direito de exclusão (dentro das limitações legais)",
          "Direito de portabilidade de dados",
          "Direito de oposição e limitação",
        ],
        contactContent:
          "Para perguntas ou para exercer seus direitos, use o formulário abaixo.",
        features: [
          "Criptografia",
          "Transparência",
          "Controle do usuário",
          "Sem revenda de dados",
        ],
        contactCta: "Formulário de contato",
        editHint: "Documento editável no console do administrador (PT)",
      },
      hi: {
        title: "गोपनीयता नीति",
        subtitle: "आपकी गोपनीयता हमारी प्राथमिकता है",
        lastUpdated: "संस्करण 2.2 – अंतिम अपडेट: 16 जून 2025",
        dataCollection: "डेटा संग्रह",
        dataProtection: "डेटा सुरक्षा",
        dataSharing: "डेटा साझाकरण",
        yourRights: "आपके अधिकार",
        contact: "संपर्क",
        dataCollectionContent:
          "हम केवल हमारी सेवाएं प्रदान करने के लिए आवश्यक जानकारी एकत्र करते हैं। इसमें आपके संपर्क विवरण, तकनीकी मेटाडेटा (कॉल, मैसेजिंग) और आपके अनुरोध के लिए आवश्यक विवरण शामिल हैं।",
        dataProtectionContent:
          "आपका डेटा ट्रांज़िट और स्टोरेज में एन्क्रिप्ट किया गया है और सुरक्षित रूप से संग्रहीत है। हम अनधिकृत पहुंच को रोकने के लिए तकनीकी और संगठनात्मक उपाय लागू करते हैं।",
        dataSharingContent:
          "हम कभी भी आपके व्यक्तिगत डेटा को नहीं बेचते। हम केवल आवश्यक जानकारी सत्यापित प्रदाताओं (भुगतान, टेलीफोनी, होस्टिंग) के साथ साझा करते हैं ताकि सेवा प्रदान की जा सके।",
        rights: [
          "पहुंच का अधिकार",
          "सुधार का अधिकार",
          "हटाने का अधिकार (कानूनी सीमाओं के भीतर)",
          "डेटा पोर्टेबिलिटी का अधिकार",
          "आपत्ति और प्रतिबंध का अधिकार",
        ],
        contactContent:
          "प्रश्नों के लिए या अपने अधिकारों का प्रयोग करने के लिए, कृपया नीचे दिए गए फॉर्म का उपयोग करें।",
        features: [
          "एन्क्रिप्शन",
          "पारदर्शिता",
          "उपयोगकर्ता नियंत्रण",
          "डेटा पुनर्विक्रय नहीं",
        ],
        contactCta: "संपर्क फॉर्म",
        editHint: "एडमिन कंसोल से संपादन योग्य दस्तावेज़ (HI)",
      },

      ar: {
        title: "سياسة الخصوصية",
        subtitle: "خصوصيتك هي أولويتنا",
        lastUpdated: "الإصدار 2.2 – آخر تحديث: 16 يونيو 2025",
        dataCollection: "جمع البيانات",
        dataProtection: "حماية البيانات",
        dataSharing: "مشاركة البيانات",
        yourRights: "حقوقك",
        contact: "اتصل",
        dataCollectionContent:
          "نجمع فقط المعلومات الضرورية لتقديم خدمات المساعدة لدينا. يتضمن ذلك معلومات الاتصال الخاصة بك، البيانات الوصفية التقنية (المكالمات، الرسائل) والتفاصيل الضرورية لطلبك.",
        dataProtectionContent:
          "يتم تشفير بياناتك أثناء النقل والتخزين عند الإمكان ويتم تخزينها بشكل آمن. يتم تنفيذ تدابير تقنية وتنظيمية لمنع أي وصول غير مصرح به.",
        dataSharingContent:
          "لا نبيع بياناتك الشخصية أبداً. نشارك فقط المعلومات الضرورية مع مقدمي خدمات معروفين (المدفوعات، الهاتف، الاستضافة) لتقديم الخدمة المطلوبة.",
        rights: [
          "الحق في الوصول إلى بياناتك",
          "الحق في التصحيح",
          "الحق في الحذف (ضمن الحدود القانونية)",
          "حق نقل البيانات",
          "الحق في الاعتراض والحد",
        ],
        contactContent:
          "لأي استفسارات أو لممارسة حقوقك، استخدم النموذج المخصص أدناه.",
        features: [
          "التشفير",
          "الشفافية",
          "التحكم من قبل المستخدم",
          "عدم إعادة بيع البيانات",
        ],
        contactCta: "نموذج الاتصال",
        editHint: "مستند قابل للتحرير من وحدة التحكم الإدارية (FR/EN/AR)",
      },

      ch: {
        title: "隐私政策",
        subtitle: "您的隐私是我们的优先事项",
        lastUpdated: "版本 2.2 – 最后更新：2025年6月16日",
        dataCollection: "数据收集",
        dataProtection: "数据保护",
        dataSharing: "数据共享",
        yourRights: "您的权利",
        contact: "联系方式",
        dataCollectionContent:
          "我们仅收集提供协助服务所需的信息。这包括您的联系方式、技术元数据（通话、消息）以及处理您的请求所必需的详细信息。",
        dataProtectionContent:
          "您的数据在传输和存储时（在可能的情况下）均经过加密并安全保存。我们采取技术和组织措施以防止未经授权的访问。",
        dataSharingContent:
          "我们绝不会出售您的个人数据。我们仅与经过审核的服务提供商（支付、通信、托管）共享提供所请求服务所必需的信息。",
        rights: [
          "访问权",
          "更正权",
          "删除权（在法律允许范围内）",
          "数据可携权",
          "反对与限制处理权",
        ],
        contactContent:
          "如有疑问或希望行使您的权利，请使用下方的表单。",
        features: [
          "数据加密",
          "透明性",
          "用户控制",
          "不转售数据",
        ],
        contactCta: "联系表单",
        editHint: "可从管理控制台编辑文档（英文/法文）",
      }
    }),

    []
  );

  const t = texts[selectedLanguage];

  const privacySections: PrivacySection[] = useMemo(
    () => [
      {
        icon: Eye,
        titleKey: "dataCollection",
        contentKey: "dataCollectionContent",
      },
      {
        icon: Lock,
        titleKey: "dataProtection",
        contentKey: "dataProtectionContent",
      },
      {
        icon: Users,
        titleKey: "dataSharing",
        contentKey: "dataSharingContent",
      },
    ],
    []
  );

  // --- Firestore fetch (unchanged business logic) ---
  useEffect(() => {
    const fetchPrivacyPolicy = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const q = query(
          collection(db, "legal_documents"),
          where("type", "==", "privacy"),
          where("language", "==", selectedLanguage),
          where("isActive", "==", true),
          orderBy("updatedAt", "desc"),
          limit(1)
        );

        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          const docData = doc.data() as { content?: string };
          setContent(docData.content || "");
        } else {
          setContent("");
        }
      } catch (err) {
        console.error("Error fetching privacy policy:", err);
        setError(
          selectedLanguage === "fr" ? "Échec du chargement" : "Failed to load"
        );
        setContent("");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrivacyPolicy();
  }, [selectedLanguage]);

  const handleLanguageChange = (
    newLang: "fr" | "en" | "es" | "de" | "ru" | "hi" | "ch"
  ) => {
    setSelectedLanguage(newLang);
  };

  // ----- Markdown → UI (design only) -----
  const parseMarkdownContent = (text: string) => {
    const lines = text.split("\n");
    const elements: JSX.Element[] = [];
    let key = 0;

    for (const raw of lines) {
      const line = raw ?? "";
      if (!line.trim()) continue;

      if (line.trim() === "---") {
        elements.push(
          <hr key={key++} className="my-8 border-t-2 border-gray-200" />
        );
        continue;
      }

      if (line.startsWith("# ")) {
        elements.push(
          <h1
            key={key++}
            className="text-3xl sm:text-4xl font-black text-gray-900 mb-6 mt-8 border-b-2 border-blue-500 pb-4"
          >
            {line.substring(2).replace(/\*\*/g, "")}
          </h1>
        );
        continue;
      }

      if (line.startsWith("## ")) {
        const title = line.substring(3).trim();
        const match = title.match(/^(\d+)\.\s*(.*)$/);
        if (match) {
          elements.push(
            <h2
              id={`section-${match[1]}`}
              key={key++}
              className="scroll-mt-28 text-xl sm:text-2xl font-bold text-gray-900 mt-10 mb-6 flex items-center gap-3"
            >
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold shadow-lg">
                {match[1]}
              </span>
              <span>{match[2].replace(/\*\*/g, "")}</span>
            </h2>
          );
        } else {
          elements.push(
            <h2
              key={key++}
              className="text-xl sm:text-2xl font-bold text-gray-900 mt-10 mb-6"
            >
              {title.replace(/\*\*/g, "")}
            </h2>
          );
        }
        continue;
      }

      if (line.startsWith("### ")) {
        elements.push(
          <h3
            key={key++}
            className="text-lg font-bold text-gray-800 mt-6 mb-4 border-l-4 border-blue-500 pl-4"
          >
            {line.substring(4).replace(/\*\*/g, "")}
          </h3>
        );
        continue;
      }

      // Numbered points (2.1, 3.2, etc.)
      const numbered = line.match(/^(\d+\.\d+\.?)\s+(.*)$/);
      if (numbered) {
        const num = numbered[1];
        const inner = numbered[2].replace(
          /\*\*(.*?)\*\*/g,
          '<strong class="font-semibold text-gray-900">$1</strong>'
        );
        elements.push(
          <div
            key={key++}
            className="bg-gray-50 border-l-4 border-blue-500 rounded-r-xl p-5 my-4 hover:bg-gray-100 transition-colors"
          >
            <p className="text-gray-800 leading-relaxed">
              <span className="font-bold text-blue-600 mr-2">{num}</span>
              <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(inner) }} />
            </p>
          </div>
        );
        continue;
      }

      // SPECIAL: contact line -> nice card WITHOUT raw URL & without extra heading
      if (
        line.toLowerCase().includes("https://sos-expat.com/contact") ||
        line.toLowerCase().includes("/contact")
      ) {
        elements.push(
          <div
            key={key++}
            className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 sm:p-8 my-8 shadow-lg"
            role="group"
            aria-label="Contact"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
                <Globe className="w-5 h-5" />
              </span>
              <span className="font-semibold text-gray-900">{t.contact}</span>
            </div>
            <p className="text-gray-800 leading-relaxed mb-5">
              {t.contactContent}
            </p>
            <a
              href="https://sos-expat.com/contact"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-semibold transition-all hover:scale-105 hover:shadow-lg"
            >
              <Globe className="w-5 h-5" />
              {t.contactCta}
            </a>
          </div>
        );
        continue;
      }

      if (line.startsWith("**") && line.endsWith("**")) {
        elements.push(
          <div
            key={key++}
            className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 my-6"
          >
            <p className="font-bold text-gray-900 text-lg">
              {line.slice(2, -2)}
            </p>
          </div>
        );
        continue;
      }

      const formatted = line
        .replace(
          /\*\*(.*?)\*\*/g,
          '<strong class="font-semibold text-gray-900">$1</strong>'
        )
        .replace(/\*([^*]+)\*/g, '<em class="italic text-gray-700">$1</em>');

      elements.push(
        <p
          key={key++}
          className="mb-4 text-gray-800 leading-relaxed text-base"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formatted) }}
        />
      );
    }

    return elements;
  };

  const defaultHi = `
# ${t.title}

**${t.lastUpdated}**

---

## 1. ${t.dataCollection}
हम केवल **सख्ती से आवश्यक** डेटा एकत्र करते हैं ताकि हमारी सेवाएं प्रदान की जा सकें (संपर्क विवरण, तकनीकी मेटाडेटा, अनुरोध विवरण)।

## 2. ${t.dataProtection}
**ट्रांज़िट** और **स्टोरेज** में एन्क्रिप्शन जहां संभव हो। मजबूत तकनीकी और संगठनात्मक सुरक्षा उपाय।

## 3. ${t.dataSharing}
कोई **डेटा पुनर्विक्रय** नहीं। सेवा प्रदान करने के लिए **सत्यापित** प्रोसेसर के साथ सीमित साझाकरण।

## 4. ${t.yourRights}
- ${t.rights[0]}
- ${t.rights[1]}
- ${t.rights[2]}
- ${t.rights[3]}
- ${t.rights[4]}

---

## 5. ${t.contact}
https://sos-expat.com/contact
`;

  // --- Default bilingual content (shown if no Firestore content) ---
  const defaultFr = `
# Politique de confidentialité

**${t.lastUpdated}**

---

## 1. ${t.dataCollection}
Nous collectons les **données strictement nécessaires** à la fourniture de nos services (coordonnées, métadonnées techniques, détails de la demande).

## 2. ${t.dataProtection}
Chiffrement **en transit** et **au repos** lorsque possible. Mesures techniques et organisationnelles renforcées.

## 3. ${t.dataSharing}
Aucun **commerce des données**. Partage limité à des prestataires **vérifiés** pour l'exécution du service.

## 4. ${t.yourRights}
- ${t.rights[0]}
- ${t.rights[1]}
- ${t.rights[2]}
- ${t.rights[3]}
- ${t.rights[4]}

---

## 5. ${t.contact}
https://sos-expat.com/contact
`;

  const defaultEn = `
# ${t.title}

**${t.lastUpdated}**

---

## 1. ${t.dataCollection}
We only collect **strictly necessary** data to deliver our services (contact details, technical metadata, request details).

## 2. ${t.dataProtection}
Encryption **in transit** and **at rest** where possible. Strong technical and organizational safeguards.

## 3. ${t.dataSharing}
No **data resale**. Limited sharing with **vetted** processors to provide the service.

## 4. ${t.yourRights}
- ${t.rights[0]}
- ${t.rights[1]}
- ${t.rights[2]}
- ${t.rights[3]}
- ${t.rights[4]}

---

## 5. ${t.contact}
https://sos-expat.com/contact
`;

const defaultCh = `
  ${t.title}

  ${t.lastUpdated}

  1. ${t.dataCollection}

  我们仅收集为提供服务所严格必要的数据（联系方式、技术元数据、请求详情）。

  2. ${t.dataProtection}

  在可能的情况下，对数据进行传输中和静态存储时的加密。采用严格的技术和组织安全措施。

  3. ${t.dataSharing}

  不进行数据转售。仅与经过审查的处理方有限共享，以提供服务。

  4. ${t.yourRights}

  ${t.rights[0]}

  ${t.rights[1]}

  ${t.rights[2]}

  ${t.rights[3]}

  ${t.rights[4]}

  5. ${t.contact}

  https://sos-expat.com/contact
`

const defaultEs = `
# Política de Privacidad

**${t.lastUpdated}**

---

## 1. ${t.dataCollection}
Solo recopilamos los datos **estrictamente necesarios** para proporcionar nuestros servicios (datos de contacto, metadatos técnicos, detalles de la solicitud).

## 2. ${t.dataProtection}
Cifrado **en tránsito** y **en reposo** cuando sea posible. Fuertes salvaguardas técnicas y organizativas.

## 3. ${t.dataSharing}
Sin **reventa de datos**. Compartición limitada con procesadores **verificados** para proporcionar el servicio.

## 4. ${t.yourRights}
- ${t.rights[0]}
- ${t.rights[1]}
- ${t.rights[2]}
- ${t.rights[3]}
- ${t.rights[4]}

---

## 5. ${t.contact}
https://sos-expat.com/contact
`;

const defaultDe = `
# Datenschutzerklärung

**${t.lastUpdated}**

---

## 1. ${t.dataCollection}
Wir erheben nur **streng notwendige** Daten zur Erbringung unserer Dienstleistungen (Kontaktdaten, technische Metadaten, Anfragedetails).

## 2. ${t.dataProtection}
Verschlüsselung **während der Übertragung** und **im Ruhezustand** wo möglich. Starke technische und organisatorische Schutzmaßnahmen.

## 3. ${t.dataSharing}
Kein **Datenverkauf**. Begrenzte Weitergabe an **geprüfte** Auftragsverarbeiter zur Serviceerbringung.

## 4. ${t.yourRights}
- ${t.rights[0]}
- ${t.rights[1]}
- ${t.rights[2]}
- ${t.rights[3]}
- ${t.rights[4]}

---

## 5. ${t.contact}
https://sos-expat.com/contact
`;

const defaultPt = `
# Política de Privacidade

**${t.lastUpdated}**

---

## 1. ${t.dataCollection}
Coletamos apenas os dados **estritamente necessários** para fornecer nossos serviços (dados de contato, metadados técnicos, detalhes da solicitação).

## 2. ${t.dataProtection}
Criptografia **em trânsito** e **em repouso** quando possível. Fortes salvaguardas técnicas e organizacionais.

## 3. ${t.dataSharing}
Sem **revenda de dados**. Compartilhamento limitado com processadores **verificados** para fornecer o serviço.

## 4. ${t.yourRights}
- ${t.rights[0]}
- ${t.rights[1]}
- ${t.rights[2]}
- ${t.rights[3]}
- ${t.rights[4]}

---

## 5. ${t.contact}
https://sos-expat.com/contact
`;

const defaultRu = `
# Политика конфиденциальности

**${t.lastUpdated}**

---

## 1. ${t.dataCollection}
Мы собираем только **строго необходимые** данные для предоставления наших услуг (контактные данные, технические метаданные, детали запроса).

## 2. ${t.dataProtection}
Шифрование **при передаче** и **при хранении** где возможно. Строгие технические и организационные меры защиты.

## 3. ${t.dataSharing}
Никакой **перепродажи данных**. Ограниченный обмен с **проверенными** обработчиками для предоставления услуги.

## 4. ${t.yourRights}
- ${t.rights[0]}
- ${t.rights[1]}
- ${t.rights[2]}
- ${t.rights[3]}
- ${t.rights[4]}

---

## 5. ${t.contact}
https://sos-expat.com/contact
`;

const defaultAr = `
# سياسة الخصوصية

**${t.lastUpdated}**

---

## 1. ${t.dataCollection}
نجمع فقط البيانات **الضرورية للغاية** لتقديم خدماتنا (بيانات الاتصال، البيانات الوصفية التقنية، تفاصيل الطلب).

## 2. ${t.dataProtection}
تشفير **أثناء النقل** و**أثناء التخزين** حيثما أمكن. إجراءات حماية تقنية وتنظيمية قوية.

## 3. ${t.dataSharing}
لا **إعادة بيع للبيانات**. مشاركة محدودة مع معالجين **معتمدين** لتقديم الخدمة.

## 4. ${t.yourRights}
- ${t.rights[0]}
- ${t.rights[1]}
- ${t.rights[2]}
- ${t.rights[3]}
- ${t.rights[4]}

---

## 5. ${t.contact}
https://sos-expat.com/contact
`;

  // const defaultContent = selectedLanguage === "fr" ? defaultFr : defaultEn;

  const defaultContent =
  selectedLanguage === "fr"
    ? defaultFr
    : selectedLanguage === "es"
    ? defaultEs
    : selectedLanguage === "de"
    ? defaultDe
    : selectedLanguage === "ru"
    ? defaultRu
    : selectedLanguage === "pt"
    ? defaultPt
    : selectedLanguage === "ar"
    ? defaultAr
    : selectedLanguage === "hi"
    ? defaultHi
    : selectedLanguage === "ch"
    ? defaultCh
    : defaultEn;

  return (
    <Layout>
      <main className="min-h-screen bg-gray-950">
        {/* HERO */}
        <section className="relative pt-20 pb-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-indigo-500/10" />
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 max-w-6xl mx-auto px-6">
            {/* Top bar: last updated + language toggle */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
              <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-full pl-5 pr-4 py-2.5 border border-white/20 text-white">
                <Clock className="w-4 h-4 text-indigo-300" />
                <span className="text-sm font-semibold">{t.lastUpdated}</span>
              </div>

              {/* <div className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm p-1">
                <button
                  type="button"
                  onClick={() => handleLanguageChange("fr")}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    selectedLanguage === "fr"
                      ? "bg-white text-gray-900"
                      : "text-white hover:bg-white/10"
                  }`}
                  aria-pressed={selectedLanguage === "fr"}
                >
                  <Languages className="w-4 h-4" />
                  FR
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageChange("en")}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    selectedLanguage === "en"
                      ? "bg-white text-gray-900"
                      : "text-white hover:bg-white/10"
                  }`}
                  aria-pressed={selectedLanguage === "en"}
                >
                  <Languages className="w-4 h-4" />
                  EN
                </button>
              </div> */}
            </div>

            <header className="text-center">
              <div className="flex justify-center mb-6">
                <div className="flex items-center justify-center w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20">
                  <Shield className="w-12 h-12 text-white" />
                </div>
              </div>

              <h1 className="text-4xl sm:text-6xl font-black mb-4 leading-tight">
                <span className="bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent">
                  {t.title}
                </span>
              </h1>
              <p className="text-lg sm:text-2xl text-gray-300 max-w-3xl mx-auto">
                {t.subtitle}
              </p>

              {/* Feature chips */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-white/90">
                {[
                  {
                    icon: <Lock className="w-6 h-6" />,
                    text: t.features[0],
                    gradient: "from-emerald-500 to-green-500",
                  },
                  {
                    icon: <Check className="w-6 h-6" />,
                    text: t.features[1],
                    gradient: "from-blue-500 to-indigo-500",
                  },
                  {
                    icon: <Users className="w-6 h-6" />,
                    text: t.features[2],
                    gradient: "from-yellow-500 to-orange-500",
                  },
                  {
                    icon: <Globe className="w-6 h-6" />,
                    text: t.features[3],
                    gradient: "from-purple-500 to-pink-500",
                  },
                ].map((f, i) => (
                  <div
                    key={i}
                    className="group flex items-center gap-3 p-5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-[1.01]"
                  >
                    <span
                      className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r ${f.gradient} text-white`}
                    >
                      {f.icon}
                    </span>
                    <span className="font-semibold">{f.text}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex items-center justify-center">
                <a
                  href="https://sos-expat.com/contact"
                  className="group inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold border-2 border-blue-400/50 hover:scale-105 transition-all"
                >
                  <Globe className="w-5 h-5" />
                  <span>{t.contactCta}</span>
                </a>
              </div>
            </header>
          </div>
        </section>

        {/* CONTENT */}
        <section className="py-12 bg-gradient-to-b from-white to-gray-50">
          <div className="max-w-5xl mx-auto px-6">
            <article className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-10 shadow-sm">
              {isLoading ? (
                <div className="space-y-4" aria-live="polite" aria-busy="true">
                  <div className="h-8 w-2/3 bg-gray-200 rounded-xl animate-pulse" />
                  <div className="h-6 w-1/2 bg-gray-200 rounded-xl animate-pulse" />
                  <div className="h-5 w-full bg-gray-200 rounded-xl animate-pulse" />
                  <div className="h-5 w-11/12 bg-gray-200 rounded-xl animate-pulse" />
                  <div className="h-5 w-10/12 bg-gray-200 rounded-xl animate-pulse" />
                  <div className="h-5 w-9/12 bg-gray-200 rounded-xl animate-pulse" />
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-red-600 mb-4">{error}</p>
                  <p className="text-gray-600">
                    {selectedLanguage === "fr"
                      ? "Affichage du contenu par défaut"
                      : "Showing default content"}
                  </p>
                </div>
              ) : (
                <div className="prose max-w-none">
                  {content ? (
                    <div>{parseMarkdownContent(content)}</div>
                  ) : (
                    <div>{parseMarkdownContent(defaultContent)}</div>
                  )}
                </div>
              )}

              {/* Hint admin */}
              <p className="mt-6 text-sm text-gray-500 flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                {t.editHint}
              </p>
            </article>

            {/* Quick sections (static summary) */}
            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
              {privacySections.map((section, idx) => {
                const Icon = section.icon;
                return (
                  <div
                    key={idx}
                    className="p-6 rounded-2xl border border-gray-200 bg-white shadow-sm"
                  >
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white mb-4">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">
                      {t[section.titleKey] as string}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {t[section.contentKey] as string}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
};

export default PrivacyPolicy;
