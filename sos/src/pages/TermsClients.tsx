import React, { useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { Link } from "react-router-dom";
import {
  FileText,
  Users,
  Shield,
  Check,
  Globe,
  Clock,
  Languages,
  Sparkles,
  CreditCard,
  Phone,
  DollarSign,
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

const TermsClients: React.FC = () => {
  const { language } = useApp();

  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedLanguage, setSelectedLanguage] = useState<
    "fr" | "en" | "es" | "de" | "ru" | "hi" | "pt" | "ch" | "ar"
  >((language as "fr" | "en" | "es" | "de" | "ru" | "hi" | "pt" | "ch" | "ar") || "fr");

  // Reste aligné avec la langue globale si elle change
  useEffect(() => {
    if (language)
      setSelectedLanguage(language as "fr" | "en" | "es" | "de" | "ru" | "hi" | "pt" | "ch" | "ar");
  }, [language]);

  // Récupération du dernier document actif depuis Firestore (type: "terms")
  useEffect(() => {
    const fetchTerms = async () => {
      try {
        setIsLoading(true);
        const q = query(
          collection(db, "legal_documents"),
          where("type", "==", "terms"),
          where("language", "==", selectedLanguage),
          where("isActive", "==", true),
          orderBy("updatedAt", "desc"),
          limit(1)
        );

        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          setContent((doc.data() as { content: string }).content);
        } else {
          setContent("");
        }
      } catch (error) {
        console.error("Error fetching terms:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTerms();
  }, [selectedLanguage]);

  // Traductions UI
  const translations = {
    fr: {
      title: "CGU Clients",
      subtitle: "Conditions générales d'utilisation pour les clients",
      lastUpdated: "Version 2.2 – Dernière mise à jour : 16 juin 2025",
      loading: "Chargement...",
      languageToggle: "Changer de langue",
      keyFeatures: "Points clés",
      features: [
        "Paiement sécurisé",
        "Remboursement si pas de mise en relation",
        "3 tentatives d’appel",
        "Prestataires vérifiés",
      ],
      anchorTitle: "Sommaire",
      editHint: "Document éditable depuis la console admin",
      heroBadge: "Nouveau — Conditions mises à jour",
      contactUs: "Nous contacter",
      contactForm: "Formulaire de contact",
      readyToUse: "Prêt à utiliser SOS Expat ?",
      readySubtitle:
        "Réservez un appel avec un avocat ou un aidant en quelques minutes, partout dans le monde.",
      seeHowItWorks: "Voir comment ça marche",
    },
    en: {
      title: "Client Terms",
      subtitle: "General terms of use for customers",
      lastUpdated: "Version 2.2 – Last updated: 16 June 2025",
      loading: "Loading...",
      languageToggle: "Switch language",
      keyFeatures: "Key features",
      features: [
        "Secure payment",
        "Refund if no connection",
        "3 call attempts",
        "Verified providers",
      ],
      anchorTitle: "Overview",
      editHint: "Document editable from the admin console",
      heroBadge: "New — Terms updated",
      contactUs: "Contact us",
      contactForm: "Contact Form",
      readyToUse: "Ready to use SOS Expat?",
      readySubtitle:
        "Book a call with a lawyer or a helper in minutes, anywhere in the world.",
      seeHowItWorks: "See how it works",
    },
    es: {
      title: "Términos del Cliente",
      subtitle: "Condiciones generales de uso para clientes",
      lastUpdated: "Versión 2.2 – Última actualización: 16 de junio de 2025",
      loading: "Cargando...",
      languageToggle: "Cambiar idioma",
      keyFeatures: "Características clave",
      features: [
        "Pago seguro",
        "Reembolso si no hay conexión",
        "3 intentos de llamada",
        "Proveedores verificados",
      ],
      anchorTitle: "Resumen",
      editHint: "Documento editable desde la consola de administración",
      heroBadge: "Nuevo — Términos actualizados",
      contactUs: "Contáctanos",
      contactForm: "Formulario de contacto",
      readyToUse: "¿Listo para usar SOS Expat?",
      readySubtitle:
        "Reserve una llamada con un abogado o un ayudante en minutos, en cualquier parte del mundo.",
      seeHowItWorks: "Ver cómo funciona",
    },
    de: {
      title: "Kundenbedingungen",
      subtitle: "Allgemeine Nutzungsbedingungen für Kunden",
      lastUpdated: "Version 2.2 – Letzte Aktualisierung: 16. Juni 2025",
      loading: "Wird geladen...",
      languageToggle: "Sprache wechseln",
      keyFeatures: "Wichtige Merkmale",
      features: [
        "Sichere Zahlung",
        "Rückerstattung bei fehlender Verbindung",
        "3 Anrufversuche",
        "Verifizierte Anbieter",
      ],
      anchorTitle: "Übersicht",
      editHint: "Dokument bearbeitbar über die Admin-Konsole",
      heroBadge: "Neu — Bedingungen aktualisiert",
      contactUs: "Kontaktieren Sie uns",
      contactForm: "Kontaktformular",
      readyToUse: "Bereit, SOS Expat zu nutzen?",
      readySubtitle:
        "Buchen Sie in wenigen Minuten ein Gespräch mit einem Anwalt oder Helfer, überall auf der Welt.",
      seeHowItWorks: "Wie es funktioniert",
    },
    ru: {
      title: "Условия для клиентов",
      subtitle: "Общие условия использования для клиентов",
      lastUpdated: "Версия 2.2 – Последнее обновление: 16 июня 2025",
      loading: "Загрузка...",
      languageToggle: "Сменить язык",
      keyFeatures: "Ключевые особенности",
      features: [
        "Безопасная оплата",
        "Возврат, если нет связи",
        "3 попытки звонка",
        "Проверенные поставщики",
      ],
      anchorTitle: "Обзор",
      editHint: "Документ редактируется через консоль администратора",
      heroBadge: "Новое — Условия обновлены",
      contactUs: "Свяжитесь с нами",
      contactForm: "Контактная форма",
      readyToUse: "Готовы использовать SOS Expat?",
      readySubtitle:
        "Забронируйте звонок с юристом или помощником за несколько минут, в любой точке мира.",
      seeHowItWorks: "Как это работает",
    },
    hi: {
      title: "ग्राहक शर्तें",
      subtitle: "ग्राहकों के लिए सामान्य उपयोग की शर्तें",
      lastUpdated: "संस्करण 2.2 – अंतिम अपडेट: 16 जून 2025",
      loading: "लोड हो रहा है...",
      languageToggle: "भाषा बदलें",
      keyFeatures: "मुख्य विशेषताएं",
      features: [
        "सुरक्षित भुगतान",
        "कोई संपर्क नहीं होने पर रिफंड",
        "3 कॉल प्रयास",
        "सत्यापित प्रदाता",
      ],
      anchorTitle: "सारांश",
      editHint: "एडमिन कंसोल से संपादन योग्य दस्तावेज़",
      heroBadge: "नया — शर्तें अपडेट की गईं",
      contactUs: "हमसे संपर्क करें",
      contactForm: "संपर्क फॉर्म",
      readyToUse: "SOS Expat का उपयोग करने के लिए तैयार हैं?",
      readySubtitle:
        "दुनिया में कहीं भी, मिनटों में एक वकील या सहायक के साथ कॉल बुक करें।",
      seeHowItWorks: "यह कैसे काम करता है देखें",
    },
    pt: {
      title: "Termos do Cliente",
      subtitle: "Condições gerais de uso para clientes",
      lastUpdated: "Versão 2.2 – Última atualização: 16 de junho de 2025",
      loading: "Carregando...",
      languageToggle: "Mudar idioma",
      keyFeatures: "Características principais",
      features: [
        "Pagamento seguro",
        "Reembolso se não houver conexão",
        "3 tentativas de chamada",
        "Provedores verificados",
      ],
      anchorTitle: "Resumo",
      editHint: "Documento editável no console do administrador",
      heroBadge: "Novo — Termos atualizados",
      contactUs: "Entre em contato conosco",
      contactForm: "Formulário de contato",
      readyToUse: "Pronto para usar o SOS Expat?",
      readySubtitle:
        "Reserve uma chamada com um advogado ou assistente em minutos, em qualquer lugar do mundo.",
      seeHowItWorks: "Veja como funciona",
    },
    ar: {
      title: "شروط العملاء",
      subtitle: "الشروط العامة للعملاء",
      lastUpdated: "الإصدار 2.2 – آخر تحديث: 16 يونيو 2025",
      loading: "جارٍ التحميل...",
      languageToggle: "غيّر اللغة",
      keyFeatures: "الميزات الرئيسية",
      features: [
        "الدفع الآمن",
        "استرداد إذا لم تكن هناك اتصال",
        "3 محاولات اتصال",
        "موفرون مُتحققون",
      ],
      anchorTitle: "نظرة عامة",
      editHint: "مستند قابل للتحرير من وحدة التحكم الإدارية",
      heroBadge: "جديد — تم تحديث الشروط",
      contactUs: "اتصل بنا",
      contactForm: "نموذج الاتصال",
      readyToUse: "هل أنت مستعد لاستخدام SOS Expat؟",
      readySubtitle:
        "احجز مكالمة مع محام أو مساعد في دقائق، في أي مكان في العالم.",
      seeHowItWorks: "انظر كيف يعمل",
    },
    ch: {
      title: "客户条款",
      subtitle: "客户通用使用条款",
      lastUpdated: "版本 2.2 – 最后更新：2025年6月16日",
      loading: "加载中...",
      languageToggle: "切换语言",
      keyFeatures: "主要功能",
      features: [
        "安全支付",
        "无法连接可退款",
        "最多 3 次呼叫尝试",
        "已验证服务提供者",
      ],
      anchorTitle: "概览",
      editHint: "可从管理控制台编辑文档",
      heroBadge: "新内容 — 条款已更新",
      contactUs: "联系我们",
      contactForm: "联系表单",
      readyToUse: "准备好使用 SOS Expat 吗？",
      readySubtitle:
        "几分钟内即可与律师或助手预约通话，无论您身在世界何处。",
      seeHowItWorks: "查看使用方式",
    },
  };

  const t = translations[selectedLanguage];

  const handleLanguageChange = (
    newLang: "fr" | "en" | "es" | "de" | "ru" | "hi" | "pt" | "ch" | "ar"
  ) => {
    setSelectedLanguage(newLang);
  };

  // ------- Parser Markdown (aligné avec TermsExpats / TermsLawyers) -------
  const parseMarkdownContent = (text: string) => {
    const lines = text.split("\n");
    const elements: JSX.Element[] = [];
    let currentIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.trim() === "") continue;

      // Séparateur
      if (line.trim() === "---") {
        elements.push(
          <hr
            key={currentIndex++}
            className="my-8 border-t-2 border-gray-200"
          />
        );
        continue;
      }

      // H1
      if (line.startsWith("# ")) {
        const title = line.substring(2).replace(/\*\*/g, "");
        elements.push(
          <h1
            key={currentIndex++}
            className="text-3xl sm:text-4xl font-black text-gray-900 mb-6 mt-8 border-b-2 border-red-500 pb-4"
          >
            {title}
          </h1>
        );
        continue;
      }

      // H2 (avec numéro optionnel)
      if (line.startsWith("## ")) {
        const title = line.substring(3).trim();
        const match = title.match(/^(\d+)\.\s*(.*)$/);
        if (match) {
          elements.push(
            <h2
              id={`section-${match[1]}`}
              key={currentIndex++}
              className="scroll-mt-28 text-xl sm:text-2xl font-bold text-gray-900 mt-10 mb-6 flex items-center gap-3"
            >
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 text-white text-sm font-bold shadow-lg">
                {match[1]}
              </span>
              <span>{match[2].replace(/\*\*/g, "")}</span>
            </h2>
          );
        } else {
          elements.push(
            <h2
              key={currentIndex++}
              className="text-xl sm:text-2xl font-bold text-gray-900 mt-10 mb-6"
            >
              {title.replace(/\*\*/g, "")}
            </h2>
          );
        }
        continue;
      }

      // H3
      if (line.startsWith("### ")) {
        const subtitle = line.substring(4).replace(/\*\*/g, "");
        elements.push(
          <h3
            key={currentIndex++}
            className="text-lg font-bold text-gray-800 mt-6 mb-4 border-l-4 border-blue-500 pl-4"
          >
            {subtitle}
          </h3>
        );
        continue;
      }

      // Points numérotés 1.1 / 2.4 / …
      const numberedMatch = line.match(/^(\d+\.\d+\.?)\s+(.*)$/);
      if (numberedMatch) {
        const number = numberedMatch[1];
        const inner = numberedMatch[2];
        const formatted = inner.replace(
          /\*\*(.*?)\*\*/g,
          '<strong class="font-semibold text-gray-900">$1</strong>'
        );
        elements.push(
          <div
            key={currentIndex++}
            className="bg-gray-50 border-l-4 border-red-500 rounded-r-xl p-5 my-4 hover:bg-gray-100 transition-colors duration-200"
          >
            <p className="text-gray-800 leading-relaxed">
              <span className="font-bold text-red-600 mr-2">{number}</span>
              <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formatted) }} />
            </p>
          </div>
        );
        continue;
      }

      // Ligne entièrement en gras
      if (line.startsWith("**") && line.endsWith("**")) {
        const boldText = line.slice(2, -2);
        elements.push(
          <div
            key={currentIndex++}
            className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 my-6"
          >
            <p className="font-bold text-gray-900 text-lg">{boldText}</p>
          </div>
        );
        continue;
      }

      // Bloc contact spécial
      if (
        line.toLowerCase().includes("contact form") ||
        line.toLowerCase().includes("formulaire de contact") ||
        line.toLowerCase().includes("https://sos-expat.com/contact")
      ) {
        elements.push(
          <div
            key={currentIndex++}
            className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-8 my-8 shadow-lg"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold shadow-lg">
                15
              </span>
              {selectedLanguage === "fr" ? "Contact" : "Contact"}
            </h3>
            <p className="text-gray-800 leading-relaxed mb-6 text-lg">{line}</p>
            <a
              href="https://sos-expat.com/contact"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
              {t.contactForm}
            </a>
          </div>
        );
        continue;
      }

      // Paragraphe normal
      if (line.trim()) {
        const formattedLine = line
          .replace(
            /\*\*(.*?)\*\*/g,
            '<strong class="font-semibold text-gray-900">$1</strong>'
          )
          .replace(/\*([^*]+)\*/g, '<em class="italic text-gray-700">$1</em>');
        elements.push(
          <p
            key={currentIndex++}
            className="mb-4 text-gray-800 leading-relaxed text-base"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formattedLine) }}
          />
        );
      }
    }

    return elements;
  };

  // --------- Contenu par défaut (bilingue, selon la langue) ----------


  const defaultHi = `
# सामान्य सेवा शर्तें – ग्राहक (वैश्विक)

**SOS Expat द्वारा WorldExpat OÜ** (आगे “प्लेटफ़ॉर्म”, “SOS”, “हम”)

**संस्करण 2.2 – अंतिम अद्यतन: 16 जून 2025**

---

## 1. उद्देश्य और क्षेत्र

1.1. ये सामान्य सेवा शर्तें (“T&C”) उस प्लेटफ़ॉर्म के उपयोग को नियंत्रित करती हैं जहाँ कोई भी व्यक्ति या संस्था खाता बनाकर सेवाएँ बुक करती है (आगे “ग्राहक”)।

1.2. **SOS Expat की भूमिका।** SOS Expat एक प्लेटफ़ॉर्म है जो (i) स्वतंत्र वकीलों (“वकील”) और/या (ii) स्वतंत्र Expat सहायक (“सहायक”) से कनेक्शन प्रदान करता है। SOS Expat कोई वकील फर्म नहीं है, कोई कानूनी, चिकित्सा, कर या विनियमित सलाह नहीं देता, और ग्राहक और सेवा प्रदाता (वकील/सहायक) के बीच कोई अनुबंध पक्ष नहीं है।

1.3. **इलेक्ट्रॉनिक सहमति (Click-wrap).** “स्वीकार करें” पर क्लिक करना या प्लेटफ़ॉर्म का उपयोग करना इन T&C की स्वीकृति का संकेत है। SOS तकनीकी रिकॉर्ड रख सकता है (टाइमस्टैम्प, आईडी)।

1.4. **परिवर्तन।** हम T&C और/या शुल्क समय-समय पर प्लेटफ़ॉर्म पर प्रकाशित करके बदल सकते हैं। लगातार उपयोग का अर्थ है सहमति।

---

## 2. खाते, अनुपालन और उपयोग

2.1. **आयु और क्षमता।** ग्राहक पुष्टि करता है कि वह कम से कम 18 वर्ष का है और कानूनी रूप से सक्षम है। यदि ग्राहक एक संस्था है, तो उपयोगकर्ता प्रमाणित करता है कि वह संस्था को बाध्य करने के लिए सक्षम है।

2.2. **सटीक जानकारी।** प्रदान की गई जानकारी (पहचान, संपर्क विवरण, देश, अनुरोध का उद्देश्य) सही और अद्यतन होनी चाहिए।

2.3. **उचित उपयोग।** ग्राहक प्लेटफ़ॉर्म का अवैध या दुरुपयोग के लिए उपयोग नहीं कर सकता। प्लेटफ़ॉर्म को आपातकालीन चिकित्सा या जीवन-धमकाने वाली स्थिति के लिए नहीं उपयोग किया जाना चाहिए।

2.4. **उपलब्धता।** प्लेटफ़ॉर्म “जैसा उपलब्ध है” आधार पर है; निरंतर उपलब्धता की कोई गारंटी नहीं है (रखरखाव, तकनीकी समस्याएं, FORCE MAJEURE)।

---

## 3. प्लेटफ़ॉर्म पर बुक की जाने वाली सेवाओं का प्रकार

3.1. **कानूनी परामर्श।** संक्षिप्त परामर्श (उदा., 20 मिनट)। वकील अपने सुझावों और पेशेवर/कानूनी नियमों के लिए पूरी तरह जिम्मेदार है।

3.2. **सहायक सेवाएँ।** गैर-योग्य सहायता (व्यावहारिक मदद, अनौपचारिक अनुवाद, स्थानीय संपर्क आदि)। कानूनी, चिकित्सा या विनियमित सलाह केवल लाइसेंस प्राप्त पेशेवर द्वारा दी जाएगी।

3.3. **कोई गारंटी नहीं।** SOS परिणाम, गुणवत्ता, उपयुक्तता या उपलब्धता के लिए कोई गारंटी नहीं देता।

---

## 4. मूल्य, मुद्रा और Vermittlungsgebühr (मध्यस्थता शुल्क)

4.1. **मूल्य।** बुकिंग पर कुल मूल्य में शामिल है: (i) सेवा प्रदाता का शुल्क और (ii) SOS की Vermittlungsgebühr।

4.2. **स्थिर Vermittlungsgebühr।** 19 € (EUR) या 25 $ (USD) प्रति मध्यस्थता (करों के बिना), कुल मूल्य में शामिल। SOS भविष्य में शुल्क बदल सकता है।

4.3. **मुद्रा और रूपांतरण।** कीमतें विभिन्न मुद्राओं में दिखाई जा सकती हैं। भुगतान प्रदाता के विनिमय शुल्क लागू हो सकते हैं।

4.4. **कर।** प्रदर्शित कीमतों में VAT या लागू कर शामिल हो सकते हैं। सेवा प्रदाता अपने कर दायित्व के लिए स्वयं जिम्मेदार हैं।

---

## 5. बुकिंग, कॉल और संपर्क प्रयास

5.1. **“मध्यस्थता” की परिभाषा।** मध्यस्थता तब पूरी मानी जाएगी जब: (a) ग्राहक और सेवा प्रदाता का संपर्क विवरण साझा किया गया और/या (b) कॉल/मैसेज/वीडियो चैनल प्लेटफ़ॉर्म पर खुल गया और/या (c) सेवा प्रदाता ग्राहक के अनुरोध को स्वीकार करता है।

5.2. **कॉल प्रयास।** तुरंत कॉल पर प्लेटफ़ॉर्म 15 मिनट में अधिकतम तीन (3) प्रयास करेगा।

5.3. **सेवा प्रदाता अनुपलब्ध।** यदि मध्यस्थता असफल होती है, बुकिंग रद्द होगी और ग्राहक को पूर्ण रिफंड मिलेगा।

5.4. **ग्राहक उत्तर नहीं देता।** यदि मध्यस्थता हो गई है लेकिन कोई संचार नहीं हुआ, तो भुगतान वापस नहीं किया जाएगा।

5.5. **कनेक्शन गुणवत्ता।** ग्राहक को पर्याप्त नेटवर्क और संगत उपकरण का उपयोग करना होगा। SOS कनेक्शन समस्याओं के लिए जिम्मेदार नहीं है।

---

## 6. वापसी अधिकार (उपभोक्ता) और तात्कालिक सेवा

6.1. **सूचना।** यदि ग्राहक उपभोक्ता है और राष्ट्रीय कानून वापसी अधिकार देता है, तो इसे वैध अवधि में लागू किया जा सकता है, सिवाय तत्काल सेवा की मांग के।

6.2. **वापसी का त्याग।** तत्काल या नियोजित कॉल बुक करने पर वापसी अधिकार समाप्त हो जाता है। पहले से दी गई सेवा के लिए भुगतान किया जाएगा।

6.3. **प्रपत्र।** प्लेटफ़ॉर्म ग्राहक की स्पष्ट सहमति दर्ज करता है।

---

## 7. भुगतान, सुरक्षा और रिफंड

7.1. **सिंगल पेमेंट और वितरण।** ग्राहक एक कुल राशि का भुगतान करता है। SOS Vermittlungsgebühr काटकर शेष सेवा प्रदाता को देता है।

7.2. **सुरक्षा।** भुगतान बाहरी प्रदाता के माध्यम से होते हैं। KYC/AML जांच हो सकती है।

7.3. **भुगतान विवाद।** SOS केवल आवश्यक डेटा भुगतान प्रदाता को देगा।

7.4. **मुआवजा।** रिफंड में सेवा प्रदाता की राशि काटी जा सकती है।

---

## 8. रद्दीकरण और रिफंड

8.1. **सिद्धांत।** मध्यस्थता शुल्क लौटाया नहीं जाएगा। सेवा प्रदाता शुल्क सेवा शुरू होने के बाद नहीं लौटाया जाएगा।

8.2. **ग्राहक द्वारा पूर्व रद्दीकरण।** पूर्ण रिफंड।

8.3. **सेवा प्रदाता द्वारा रद्द।** पूर्ण रिफंड। SOS विकल्प सेवा प्रदाता सुझा सकता है।

8.4. **SOS तकनीकी समस्या।** SOS वैधानिक रूप से रिफंड या क्रेडिट प्रदान कर सकता है।

---

## 9. व्यवहार, सुरक्षा और सामग्री

9.1. **सम्मान।** ग्राहक को सम्मानजनक व्यवहार करना चाहिए और अवैध रिकॉर्डिंग/साझा नहीं करनी चाहिए।

9.2. **प्रदान की गई सामग्री।** सामग्री सही, कानूनी और सटीक होनी चाहिए। ग्राहक SOS और सेवा प्रदाता को किसी दावे से मुक्त रखेगा।

9.3. **शिकायत।** दुरुपयोग प्लेटफ़ॉर्म पर रिपोर्ट किया जा सकता है।

---

## 10. व्यक्तिगत डेटा

10.1. **भूमिकाएँ।** डेटा के संदर्भ में SOS और सेवा प्रदाता स्वतंत्र डेटा नियंत्रक हैं।

10.2. **कानूनी आधार।** अनुबंध पूरा करना, वैध हित (सुरक्षा, धोखाधड़ी रोकथाम), कानूनी दायित्व, सहमति।

10.3. **अंतरराष्ट्रीय ट्रांसफर।** सुरक्षित ट्रांसफर संभव।

10.4. **अधिकार और संपर्क।** प्लेटफ़ॉर्म के संपर्क फ़ॉर्म के माध्यम से।

10.5. **सुरक्षा।** उचित तकनीकी और संगठनात्मक उपाय; डेटा उल्लंघन की सूचना कानून अनुसार।

10.6. **DSA अनुपालन।** प्लेटफ़ॉर्म **विनियम (EU) 2022/2065 (डिजिटल सेवा अधिनियम)** के अर्थ में एक **मध्यस्थ सेवा** के रूप में कार्य करता है। SOS Expat अवैध सामग्री की रिपोर्टिंग के लिए तंत्र लागू करता है और DSA के अनुसार सक्षम अधिकारियों के साथ सहयोग करता है।

---

## 11. बौद्धिक संपदा

प्लेटफ़ॉर्म, ट्रेडमार्क, लोगो, डेटाबेस और सामग्री सुरक्षित हैं। कोई अधिकार ग्राहक को नहीं दिए जाते।

---

## 12. उत्तरदायित्व

12.1. **स्वतंत्र सेवा प्रदाता।** ग्राहक मानता है कि वकील और सहायक स्वतंत्र हैं। SOS किसी सलाह/सेवा या परिणाम के लिए जिम्मेदार नहीं है।

12.2. **सीमित उत्तरदायित्व।** SOS की अधिकतम उत्तरदायित्व राशि उस बुकिंग के लिए ग्राहक द्वारा भुगतान की गई कुल राशि तक सीमित है।

12.3. **कोई गारंटी नहीं।** SOS लगातार प्लेटफ़ॉर्म संचालन या त्रुटि-रहित सेवा की गारंटी नहीं देता।

---

## 13. लागू कानून और विवाद समाधान

13.1. **सामग्री कानून।** सेवा के देश का कानून लागू होगा। अतिरिक्त रूप से, व्याख्या और रिक्तियों के लिए एस्टोनियाई कानून।

13.2. **ICC मध्यस्थता / B2C विकल्प।**

* **B2B ग्राहक:** ICC मध्यस्थता, स्थान: Tallinn, भाषा: फ्रेंच।
* **उपभोक्ता:** ICC या राष्ट्रीय न्यायालय।

13.3. **एस्टोनियाई न्यायालय।** असंबद्ध विवाद, आदेश और आपात उपायों के लिए।

13.4. **समूह दावे का त्याग।** समूह/समानित दावे निषिद्ध, जब तक कानून न कहे।

---

## 14. समाप्ति/निलंबन और अन्य

14.1. **निलंबन।** धोखाधड़ी, उल्लंघन या कानूनी जोखिम पर SOS खाता निलंबित कर सकता है।

14.2. **पूर्णता।** T&C प्लेटफ़ॉर्म उपयोग के लिए संपूर्ण समझौता है।

14.3. **भाषा।** अनुवाद संभव; व्याख्या में फ्रेंच संस्करण सर्वोच्च।

14.4. **अंश-अमान्यता।** एक खंड अमान्य होने पर बाकी वैध रहेंगे।

14.5. **त्याग।** किसी अधिकार का उपयोग न करना त्याग नहीं है।

---

## 15. संपर्क

**संपर्क फ़ॉर्म (सहायता और कानूनी पूछताछ)**: **https://sos-expat.com/contact**
`;

  const defaultFr = `
# Conditions Générales – Clients (Global)

**SOS Expat d’WorldExpat OÜ** (la « Plateforme », « SOS », « nous »)

**Version 2.2 – Dernière mise à jour : 16 juin 2025**

---

## 1. Objet et champ d’application

1.1. Les présentes conditions générales (« CGV ») régissent l’utilisation de la Plateforme par toute personne physique ou morale qui crée un compte client et réserve un service via la Plateforme (le « Client »).

1.2. **Rôle de SOS Expat.** SOS Expat est une plateforme de mise en relation : (i) avec des avocats indépendants (« Avocats »), et/ou (ii) avec des expatriés aidants indépendants (« Aidants »). SOS Expat n'est pas un cabinet d’avocats, ne fournit aucun conseil juridique, médical, fiscal ou réglementé, et n’est pas partie au contrat de prestation conclu entre le Client et le prestataire (Avocat/Aidant).

1.3. **Acceptation électronique (click-wrap).** En cochant la case d’acceptation et/ou en utilisant la Plateforme, le Client accepte les présentes CGV (signature électronique). SOS peut conserver des preuves techniques (horodatage, identifiants).

1.4. **Modifications.** Nous pouvons mettre à jour les CGV et/ou les tarifs/frais avec effet prospectif par publication sur la Plateforme. La poursuite d’usage vaut acceptation.

---

## 2. Comptes, éligibilité et usage

2.1. **Âge et capacité.** Le Client déclare avoir 18 ans révolus et la capacité juridique. Pour les personnes morales, l’utilisateur déclare être habilité à engager la société.

2.2. **Exactitude des informations.** Les informations fournies (identité, moyens de contact, pays, objet de la demande) doivent être exactes et à jour.

2.3. **Usage conforme.** Le Client s’interdit toute utilisation illicite ou abusive (fraude, contenu illégal, harcèlement, atteinte aux droits de tiers, détournement des flux de paiement, etc.). Aucun usage pour des situations médicales ou vitales d’urgence ; SOS n’est pas un service d’urgence.

2.4. **Disponibilité.** La Plateforme est fournie « en l’état » : aucune disponibilité ininterrompue n’est garantie (maintenance, incidents, force majeure).

---

## 3. Nature des services réservables

3.1. **Appels avec Avocats.** Consultations courtes d’orientation (par ex. 20 minutes). L’Avocat demeure seul responsable de ses conseils et du respect de sa déontologie/lois locales.

3.2. **Appels avec Aidants.** Aide non réglementée (orientation pratique, traduction informelle, contacts locaux…). Aucun conseil juridique/médical/réglementé sans licence locale adéquate.

3.3. **Aucune garantie.** Nous ne garantissons ni l’issue, ni la qualité, ni l’adéquation à un besoin particulier, ni la disponibilité des prestataires.

---

## 4. Prix, devises et frais de mise en relation

4.1. **Affichage des prix.** Le prix total affiché au moment de la réservation inclut : (i) la rémunération du prestataire (Avocat/Aidant) fixée selon l’offre présentée, et (ii) les frais de mise en relation dus à SOS (forfait).

4.2. **Frais de mise en relation (forfait).** 19 € (EUR) ou 25 $ (USD) par mise en relation (hors taxes), intégrés dans le prix total. SOS peut modifier ce forfait et/ou publier des barèmes locaux par pays/devise avec effet prospectif.

4.3. **Devises & conversion.** Les prix peuvent être proposés en plusieurs devises. Des frais/taux de change du prestataire de paiement peuvent s’appliquer.

4.4. **Taxes.** Les prix affichés incluent, le cas échéant, la TVA ou taxes applicables sur les frais de mise en relation. Les Prestataires demeurent responsables de leurs propres obligations fiscales.

---

## 5. Réservation, appel et tentatives de contact

5.1. **Définition de « mise en relation ».** Est réputée intervenue : (a) la transmission des coordonnées Client–Prestataire, et/ou (b) l’ouverture par la Plateforme d’un canal d’appel/messagerie/visio, et/ou (c) l’acceptation par le Prestataire d’une demande du Client.

5.2. **Tentatives d’appel.** En cas d’appel immédiat : la Plateforme effectue jusqu’à trois (3) tentatives sur une fenêtre d’environ 15 minutes (sauf indication différente in-app).

5.3. **Indisponibilité du prestataire.** Si aucune mise en relation n’a pu être réalisée après les tentatives, la réservation est annulée et le Client est remboursé intégralement du prix total payé.

5.4. **Non-réponse du Client.** Si la mise en relation a eu lieu (au sens 5.1) mais que le Client n’aboutit pas à un échange effectif (non-réponse, occupation, refus, arrêt prématuré), le paiement demeure dû et non remboursable.

5.5. **Qualité de la communication.** Le Client doit se trouver en zone de couverture suffisante et utiliser un équipement compatible. SOS n’est pas responsable des coupures/réseaux tiers.

---

## 6. Droit de rétractation (consommateurs) & exécution immédiate

6.1. **Information.** Si le Client est consommateur et la loi impérative locale prévoit un droit de rétractation, celui-ci peut s’exercer dans les délais légaux sauf si le Client demande l’exécution immédiate du service.

6.2. **Renonciation.** En réservant un appel immédiat ou programmé avant l’expiration du délai légal, le Client demande l’exécution immédiate et reconnaît que, une fois la prestation pleinement exécutée, il perd son droit de rétractation. En cas d’exécution partielle avant rétractation, le Client doit payer la partie déjà fournie et les frais de mise en relation, non remboursables.

6.3. **Formalisme.** La Plateforme recueille l’acceptation explicite de ces points lors de la réservation, lorsque requis.

---

## 7. Paiement, sécurité, rétrofacturations

7.1. **Paiement unique & répartition.** Le Client règle un paiement unique via la Plateforme couvrant (i) la part Prestataire et (ii) les frais de mise en relation. SOS (ou son prestataire de paiement) encaisse, déduit ses frais, puis reverse le solde au Prestataire.

7.2. **Sécurité.** Les paiements transitent par des prestataires de paiement tiers. Des contrôles KYC/LCB-FT peuvent s’appliquer.

7.3. **Rétrofacturations/contestation.** En cas de litige de paiement, SOS peut transmettre au prestataire de paiement les données strictement nécessaires et suspendre des services/paiements liés.

7.4. **Compensation.** Si un remboursement est accordé au Client, la part correspondante est prélevée sur le prestataire concerné ; SOS peut compenser sur ses paiements futurs.

---

## 8. Annulations et remboursements

8.1. **Général.** Sauf dispositions légales impératives :
- les frais de mise en relation sont non remboursables dès la mise en relation (5.1) ;
- la part Prestataire est non remboursable une fois la prestation commencée, sauf geste commercial du Prestataire.

8.2. **Annulation par le Client avant mise en relation.** Remboursement intégral.

8.3. **Annulation par le Prestataire.** Remboursement intégral. SOS peut proposer un re-routing vers un autre prestataire disponible.

8.4. **Cas techniques imputables à SOS.** Remboursement ou re-crédit à la discrétion de SOS, dans la mesure permise par la loi.

---

## 9. Comportements, sécurité et contenus

9.1. **Respect.** Le Client s’engage à un comportement respectueux, à ne pas enregistrer ni diffuser l’échange sans consentement légalement requis, et à ne pas solliciter d’actes illégaux.

9.2. **Contenus fournis.** Les informations transmises doivent être loyales, exactes et licites. Le Client garantit SOS et le Prestataire contre toute réclamation liée à des contenus illégaux qu’il fournirait.

9.3. **Signalement.** Tout abus peut être signalé via le formulaire de contact.

---

## 10. Données personnelles

10.1. **Rôles.** Pour les données strictement nécessaires à la mise en relation, SOS et le Prestataire agissent chacun en responsable de traitement pour leurs finalités propres.

10.2. **Bases & finalités.** Exécution du contrat (réservation), intérêts légitimes (sécurité, prévention de la fraude, amélioration), compliance (LCB-FT/sanctions) et consentement si requis.

10.3. **Transferts internationaux** possibles avec garanties appropriées.

10.4. **Droits & contact.** Exercice via le formulaire de contact de la Plateforme.

10.5. **Sécurité.** Mesures techniques/organisationnelles raisonnables ; notification des violations requises par la loi.

10.6. **Conformité DSA.** La Plateforme agit en tant que **service intermédiaire** au sens du **Règlement (UE) 2022/2065 (Digital Services Act)**. SOS Expat met en œuvre des mécanismes de signalement des contenus illicites et coopère avec les autorités compétentes conformément au DSA.

---

## 11. Propriété intellectuelle

La Plateforme, ses marques, logos, bases de données et contenus sont protégés. Aucun droit n’est cédé au Client. L’usage est strictement limité à un accès personnel conformément aux CGV.

---

## 12. Responsabilité

12.1. **Prestataires indépendants.** Le Client reconnaît que les Avocats et Aidants sont indépendants. SOS n’est pas responsable des conseils/services fournis ni de leur résultat.

12.2. **Limitations.** Dans la mesure permise par la loi, la responsabilité de SOS pour un dommage direct prouvé est limitée au prix total payé par le Client pour la réservation concernée. SOS n’est pas responsable des dommages indirects/spéciaux/consécutifs (perte de chance, de profits, d’image, etc.), dans la mesure permise.

12.3. **Aucune garantie.** SOS ne garantit pas la disponibilité continue de la Plateforme ni l’absence d’erreurs.

---

## 13. Droit applicable, règlement des litiges et tribunaux compétents

13.1. **Droit matériel.** Pour chaque service couvrant un pays donné, la relation SOS–Client est régie par les lois du pays d’intervention sans priver le Client consommateur de ses droits impératifs de résidence. À titre supplétif, le droit estonien régit l’interprétation/validité des CGV et toute question non régie par ce droit local.

13.2. **Arbitrage CCI (option consommateur) / obligatoire non-consommateur.**
- **Client non-consommateur (B2B)** : arbitrage CCI obligatoire, siège : Tallinn (Estonie), langue : français, droit matériel selon 13.1, procédure confidentielle.
- **Client consommateur** : option de recourir à l’arbitrage CCI (mêmes modalités) ou aux juridictions compétentes en vertu des lois impératives applicables.

13.3. **Compétence des tribunaux estoniens (Tallinn).** Pour toute demande non arbitrable, l’exécution des sentences ou les mesures urgentes, compétence exclusive des tribunaux d’Estonie (Tallinn), sans préjudice des droits impératifs du consommateur.

13.4. **Renonciation aux actions collectives (dans la mesure permise).** Toute action collective/de groupe/représentative est exclue, sauf si la loi impérative du lieu de résidence du consommateur en dispose autrement.

---

## 14. Résiliation/suspension et divers

14.1. **Suspension.** SOS peut suspendre/fermer le compte en cas de fraude, non-conformité, abus ou risque juridique.

14.2. **Intégralité.** Les CGV constituent l’accord complet entre SOS et le Client pour l’usage de la Plateforme.

14.3. **Langues.** Des traductions peuvent être fournies ; le français prévaut pour l’interprétation.

14.4. **Nullité partielle.** Si une stipulation est nulle/inapplicable, le reste demeure en vigueur ; elle pourra être remplacée par une clause valide d’effet équivalent.

14.5. **Non-renonciation.** Le fait de ne pas exercer un droit n’emporte pas renonciation.

---

## 15. Contact

**Formulaire de contact (support & demandes légales)** : **https://sos-expat.com/contact**
`;

  const defaultEn = `
# Terms and Conditions – Clients (Global)

**SOS Expat of WorldExpat OÜ** (the “Platform,” “SOS,” “we”)

**Version 2.2 – Last updated: June 16, 2025**

---

## 1. Purpose and Scope

1.1. These general terms and conditions (“T&Cs”) govern the use of the Platform by any individual or legal entity who creates a client account and books a service via the Platform (the “Client”).

1.2. **Role of SOS Expat.** SOS Expat is a connection platform: (i) with independent lawyers (“Lawyers”), and/or (ii) with independent expat helpers (“Helpers”). SOS Expat is not a law firm, does not provide legal, medical, tax, or regulated advice, and is not a party to the service contract concluded between the Client and the provider (Lawyer/Helper).

1.3. **Electronic Acceptance (click-wrap).** By checking the acceptance box and/or using the Platform, the Client accepts these T&Cs (electronic signature). SOS may retain technical evidence (timestamp, identifiers).

1.4. **Changes.** We may update the T&Cs and/or fees with prospective effect by posting on the Platform. Continued use constitutes acceptance.

---

## 2. Accounts, Eligibility, and Use

2.1. **Age and Capacity.** The Client declares they are at least 18 years old and legally competent. For legal entities, the user declares they are authorized to bind the company.

2.2. **Accuracy of Information.** Information provided (identity, contact methods, country, purpose of request) must be accurate and up-to-date.

2.3. **Proper Use.** The Client shall not engage in any unlawful or abusive use (fraud, illegal content, harassment, infringement of third-party rights, payment diversion, etc.). No use for medical or life-threatening emergencies; SOS is not an emergency service.

2.4. **Availability.** The Platform is provided “as-is”: uninterrupted availability is not guaranteed (maintenance, incidents, force majeure).

---

## 3. Nature of Bookable Services

3.1. **Calls with Lawyers.** Short orientation consultations (e.g., 20 minutes). The Lawyer remains solely responsible for their advice and compliance with professional ethics/local laws.

3.2. **Calls with Helpers.** Unregulated assistance (practical guidance, informal translation, local contacts…). No legal/medical/regulated advice without appropriate local license.

3.3. **No Guarantee.** We do not guarantee outcome, quality, suitability for specific needs, or provider availability.

---

## 4. Prices, Currencies, and Connection Fees

4.1. **Price Display.** The total price shown at booking includes: (i) the provider’s fee (Lawyer/Helper) as per the presented offer, and (ii) the connection fee due to SOS (flat fee).

4.2. **Connection Fee (flat).** €19 (EUR) or $25 (USD) per connection (excluding taxes), included in the total price. SOS may modify this fee and/or publish local rates per country/currency with prospective effect.

4.3. **Currencies & Conversion.** Prices may be offered in multiple currencies. Payment provider fees/exchange rates may apply.

4.4. **Taxes.** Displayed prices include VAT or applicable taxes on the connection fee, if any. Providers remain responsible for their own tax obligations.

---

## 5. Booking, Call, and Contact Attempts

5.1. **Definition of “Connection.”** Connection occurs when: (a) Client–Provider contact information is transmitted, and/or (b) a call/messaging/video channel is opened via the Platform, and/or (c) the Provider accepts a Client request.

5.2. **Call Attempts.** For immediate calls, the Platform makes up to three (3) attempts within about 15 minutes (unless stated otherwise in-app).

5.3. **Provider Unavailability.** If no connection occurs after attempts, the booking is canceled and the Client is fully refunded.

5.4. **Client Non-Response.** If a connection occurs (per 5.1) but no effective exchange happens (no answer, busy, refusal, premature end), payment remains due and non-refundable.

5.5. **Communication Quality.** Client must be in adequate coverage area and use compatible equipment. SOS is not responsible for third-party network interruptions.

---

## 6. Right of Withdrawal (Consumers) & Immediate Execution

6.1. **Information.** If the Client is a consumer and local mandatory law provides a right of withdrawal, it may be exercised within legal deadlines unless the Client requests immediate execution.

6.2. **Waiver.** By booking an immediate or scheduled call before the legal deadline expires, the Client requests immediate execution and acknowledges that, once fully performed, the right of withdrawal is lost. For partial execution before withdrawal, the Client must pay for services already provided and the connection fee, non-refundable.

6.3. **Formality.** The Platform collects explicit acceptance of these points at booking, when required.

---

## 7. Payment, Security, Chargebacks

7.1. **Single Payment & Allocation.** The Client makes a single payment via the Platform covering (i) the Provider’s share and (ii) the connection fee. SOS (or its payment provider) collects, deducts its fees, and transfers the balance to the Provider.

7.2. **Security.** Payments are processed by third-party payment providers. KYC/AML controls may apply.

7.3. **Chargebacks/Disputes.** In case of payment dispute, SOS may provide strictly necessary data to the payment provider and suspend related services/payments.

7.4. **Compensation.** If a refund is granted to the Client, the corresponding share is deducted from the relevant provider; SOS may offset against future payments.

---

## 8. Cancellations and Refunds

8.1. **General.** Except for mandatory legal provisions:

* connection fees are non-refundable once the connection occurs (5.1);
* provider fees are non-refundable once the service starts, unless waived by the Provider.

8.2. **Client Cancellation Before Connection.** Full refund.

8.3. **Provider Cancellation.** Full refund. SOS may offer rerouting to another available provider.

8.4. **Technical Issues Attributable to SOS.** Refund or re-credit at SOS discretion, to the extent permitted by law.

---

## 9. Behavior, Security, and Content

9.1. **Respect.** Client agrees to behave respectfully, not record or share exchanges without legally required consent, and not solicit illegal acts.

9.2. **Provided Content.** Information provided must be honest, accurate, and lawful. Client indemnifies SOS and Provider against claims related to illegal content.

9.3. **Reporting.** Any abuse can be reported via the contact form.

---

## 10. Personal Data

10.1. **Roles.** For data strictly necessary for connection, SOS and the Provider act as independent controllers for their own purposes.

10.2. **Bases & Purposes.** Contract performance (booking), legitimate interests (security, fraud prevention, improvement), compliance (AML/sanctions), and consent if required.

10.3. **International Transfers** possible with appropriate safeguards.

10.4. **Rights & Contact.** Exercised via Platform contact form.

10.5. **Security.** Reasonable technical/organizational measures; breach notification as required by law.

10.6. **DSA Compliance.** The Platform operates as an **intermediary service** within the meaning of **Regulation (EU) 2022/2065 (Digital Services Act)**. SOS Expat implements mechanisms for reporting illegal content and cooperates with competent authorities in accordance with the DSA.

---

## 11. Intellectual Property

The Platform, its trademarks, logos, databases, and content are protected. No rights are transferred to the Client. Use is strictly limited to personal access per the T&Cs.

---

## 12. Liability

12.1. **Independent Providers.** Client acknowledges that Lawyers and Helpers are independent. SOS is not responsible for advice/services provided or their outcome.

12.2. **Limitations.** To the extent permitted by law, SOS’s liability for proven direct damage is limited to the total price paid by the Client for the relevant booking. SOS is not liable for indirect/special/consequential damages (loss of opportunity, profit, reputation, etc.), to the extent permitted.

12.3. **No Guarantee.** SOS does not guarantee continuous availability of the Platform or absence of errors.

---

## 13. Governing Law, Dispute Resolution, and Competent Courts

13.1. **Substantive Law.** For each service covering a given country, the SOS–Client relationship is governed by the laws of the country of intervention without depriving the consumer of mandatory residence rights. Supplementarily, Estonian law governs T&Cs interpretation/validity and issues not governed by local law.

13.2. **ICC Arbitration (Consumer Option) / Mandatory for Non-Consumer.**

* **Non-consumer Client (B2B):** ICC arbitration mandatory, seat: Tallinn (Estonia), language: French, substantive law per 13.1, confidential procedure.
* **Consumer Client:** Option to resort to ICC arbitration (same terms) or competent courts under applicable mandatory laws.

13.3. **Estonian Courts Competence (Tallinn).** For any non-arbitrable claim, enforcement of awards, or urgent measures, exclusive competence of Estonian courts (Tallinn), without prejudice to mandatory consumer rights.

13.4. **Waiver of Class Actions (where permitted).** Any collective/group/representative action is excluded, unless mandatory law of consumer residence provides otherwise.

---

## 14. Termination/Suspension and Miscellaneous

14.1. **Suspension.** SOS may suspend/close accounts in case of fraud, non-compliance, abuse, or legal risk.

14.2. **Entire Agreement.** The T&Cs constitute the entire agreement between SOS and the Client for Platform use.

14.3. **Languages.** Translations may be provided; French prevails for interpretation.

14.4. **Partial Invalidity.** If a provision is invalid/unenforceable, the rest remains in force; it may be replaced by a valid clause of equivalent effect.

14.5. **No Waiver.** Failure to exercise a right does not constitute waiver.

---

## 15. Contact

**Contact Form (Support & Legal Requests):** **[https://sos-expat.com/contact](https://sos-expat.com/contact)**
`;

  const defaultEs = `
# Condiciones Generales – Clientes (Global)

**SOS Expat de WorldExpat OÜ** (la “Plataforma”, “SOS”, “nosotros”)

**Versión 2.2 – Última actualización: 16 de junio de 2025**

---

## 1. Objeto y alcance

1.1. Estas condiciones generales (“CG”) regulan el uso de la Plataforma por cualquier persona física o jurídica que cree una cuenta de cliente y reserve un servicio a través de la Plataforma (el “Cliente”).

1.2. **Rol de SOS Expat.** SOS Expat es una plataforma de conexión: (i) con abogados independientes (“Abogados”), y/o (ii) con ayudantes expatriados independientes (“Ayudantes”). SOS Expat no es un despacho de abogados, no proporciona asesoramiento legal, médico, fiscal o regulado, y no es parte del contrato de prestación celebrado entre el Cliente y el proveedor (Abogado/Ayudante).

1.3. **Aceptación electrónica (click-wrap).** Al marcar la casilla de aceptación y/o utilizar la Plataforma, el Cliente acepta estas CG (firma electrónica). SOS puede conservar pruebas técnicas (sello de tiempo, identificadores).

1.4. **Modificaciones.** Podemos actualizar las CG y/o tarifas con efecto prospectivo mediante publicación en la Plataforma. La continuación del uso implica aceptación.

---

## 2. Cuentas, elegibilidad y uso

2.1. **Edad y capacidad.** El Cliente declara tener al menos 18 años y capacidad legal. Para personas jurídicas, el usuario declara estar autorizado para comprometer a la empresa.

2.2. **Exactitud de la información.** La información proporcionada (identidad, medios de contacto, país, objeto de la solicitud) debe ser exacta y estar actualizada.

2.3. **Uso adecuado.** El Cliente no deberá realizar ningún uso ilícito o abusivo (fraude, contenido ilegal, acoso, vulneración de derechos de terceros, desvío de pagos, etc.). No se permite el uso para situaciones médicas o de emergencia vital; SOS no es un servicio de urgencias.

2.4. **Disponibilidad.** La Plataforma se proporciona “tal cual”: no se garantiza disponibilidad continua (mantenimiento, incidentes, fuerza mayor).

---

## 3. Naturaleza de los servicios reservables

3.1. **Llamadas con Abogados.** Consultas breves de orientación (p.ej., 20 minutos). El Abogado es el único responsable de sus consejos y del cumplimiento de su ética profesional y leyes locales.

3.2. **Llamadas con Ayudantes.** Asistencia no regulada (orientación práctica, traducción informal, contactos locales…). No se proporciona asesoramiento legal, médico o regulado sin la licencia local adecuada.

3.3. **Sin garantía.** No garantizamos resultados, calidad, adecuación a necesidades específicas ni disponibilidad de los proveedores.

---

## 4. Precios, monedas y tarifas de conexión

4.1. **Visualización de precios.** El precio total mostrado al momento de la reserva incluye: (i) la remuneración del proveedor (Abogado/Ayudante) según la oferta presentada, y (ii) la tarifa de conexión debida a SOS (tarifa fija).

4.2. **Tarifa de conexión (fija).** 19 € (EUR) o 25 $ (USD) por conexión (sin impuestos), incluida en el precio total. SOS puede modificar esta tarifa y/o publicar tarifas locales por país/moneda con efecto prospectivo.

4.3. **Monedas y conversión.** Los precios pueden mostrarse en varias monedas. Pueden aplicarse comisiones/tasas de cambio del proveedor de pago.

4.4. **Impuestos.** Los precios mostrados incluyen, cuando corresponda, IVA o impuestos aplicables sobre la tarifa de conexión. Los proveedores siguen siendo responsables de sus obligaciones fiscales.

---

## 5. Reserva, llamada e intentos de contacto

5.1. **Definición de “conexión”.** Se considera realizada cuando: (a) se transmiten los datos de contacto Cliente–Proveedor, y/o (b) se abre un canal de llamada/mensajería/video a través de la Plataforma, y/o (c) el Proveedor acepta la solicitud del Cliente.

5.2. **Intentos de llamada.** En caso de llamada inmediata, la Plataforma realiza hasta tres (3) intentos en aproximadamente 15 minutos (a menos que se indique lo contrario en la app).

5.3. **Indisponibilidad del proveedor.** Si no se logra ninguna conexión tras los intentos, la reserva se cancela y el Cliente recibe un reembolso completo.

5.4. **No respuesta del Cliente.** Si se realiza la conexión (según 5.1) pero no se produce un intercambio efectivo (no contesta, ocupado, rechazo, interrupción prematura), el pago sigue siendo debido y no es reembolsable.

5.5. **Calidad de la comunicación.** El Cliente debe encontrarse en una zona con cobertura suficiente y usar un equipo compatible. SOS no se responsabiliza de interrupciones o redes de terceros.

---

## 6. Derecho de desistimiento (consumidores) y ejecución inmediata

6.1. **Información.** Si el Cliente es consumidor y la ley local imperativa prevé un derecho de desistimiento, este podrá ejercerse dentro de los plazos legales, salvo que el Cliente solicite la ejecución inmediata del servicio.

6.2. **Renuncia.** Al reservar una llamada inmediata o programada antes de que expire el plazo legal, el Cliente solicita la ejecución inmediata y reconoce que, una vez prestado el servicio por completo, pierde el derecho de desistimiento. En caso de ejecución parcial antes del desistimiento, el Cliente debe pagar la parte ya prestada y la tarifa de conexión, no reembolsable.

6.3. **Formalidad.** La Plataforma recoge la aceptación explícita de estos puntos al realizar la reserva, cuando sea necesario.

---

## 7. Pago, seguridad y contracargos

7.1. **Pago único y distribución.** El Cliente realiza un único pago a través de la Plataforma cubriendo (i) la parte del Proveedor y (ii) la tarifa de conexión. SOS (o su proveedor de pago) cobra, deduce sus comisiones y transfiere el saldo al Proveedor.

7.2. **Seguridad.** Los pagos se realizan mediante proveedores de pago externos. Pueden aplicarse controles KYC/AML.

7.3. **Contracargos/Disputas.** En caso de disputa de pago, SOS puede facilitar al proveedor de pago los datos estrictamente necesarios y suspender los servicios/pagos relacionados.

7.4. **Compensación.** Si se concede un reembolso al Cliente, la parte correspondiente se deduce del proveedor implicado; SOS puede compensar en pagos futuros.

---

## 8. Cancelaciones y reembolsos

8.1. **General.** Salvo disposiciones legales imperativas:

* Las tarifas de conexión no son reembolsables una vez realizada la conexión (5.1).
* La parte del Proveedor no es reembolsable una vez comenzado el servicio, salvo gesto comercial del Proveedor.

8.2. **Cancelación por el Cliente antes de la conexión.** Reembolso completo.

8.3. **Cancelación por el Proveedor.** Reembolso completo. SOS puede ofrecer redirigir a otro proveedor disponible.

8.4. **Problemas técnicos imputables a SOS.** Reembolso o crédito a discreción de SOS, en la medida permitida por la ley.

---

## 9. Comportamiento, seguridad y contenidos

9.1. **Respeto.** El Cliente se compromete a comportarse respetuosamente, no grabar ni difundir el intercambio sin consentimiento legal y no solicitar actos ilegales.

9.2. **Contenidos proporcionados.** La información transmitida debe ser veraz, exacta y lícita. El Cliente indemniza a SOS y al Proveedor frente a cualquier reclamación relacionada con contenidos ilegales que proporcione.

9.3. **Denuncias.** Cualquier abuso puede notificarse a través del formulario de contacto.

---

## 10. Datos personales

10.1. **Roles.** Para los datos estrictamente necesarios para la conexión, SOS y el Proveedor actúan como responsables independientes para sus propios fines.

10.2. **Bases y fines.** Ejecución del contrato (reserva), intereses legítimos (seguridad, prevención de fraude, mejora), cumplimiento normativo (AML/sanciones) y consentimiento si se requiere.

10.3. **Transferencias internacionales** posibles con garantías adecuadas.

10.4. **Derechos y contacto.** Ejercicio a través del formulario de contacto de la Plataforma.

10.5. **Seguridad.** Medidas técnicas/organizativas razonables; notificación de violaciones según la ley.

10.6. **Conformidad DSA.** La Plataforma opera como un **servicio intermediario** en el sentido del **Reglamento (UE) 2022/2065 (Ley de Servicios Digitales)**. SOS Expat implementa mecanismos para reportar contenido ilegal y coopera con las autoridades competentes de acuerdo con el DSA.

---

## 11. Propiedad intelectual

La Plataforma, sus marcas, logotipos, bases de datos y contenidos están protegidos. No se ceden derechos al Cliente. El uso se limita estrictamente a acceso personal conforme a las CG.

---

## 12. Responsabilidad

12.1. **Proveedores independientes.** El Cliente reconoce que Abogados y Ayudantes son independientes. SOS no se responsabiliza de los consejos/servicios proporcionados ni de sus resultados.

12.2. **Limitaciones.** En la medida permitida por la ley, la responsabilidad de SOS por daño directo probado se limita al precio total pagado por el Cliente para la reserva correspondiente. SOS no es responsable de daños indirectos/especiales/consecuentes (pérdida de oportunidad, beneficios, imagen, etc.), en la medida permitida.

12.3. **Sin garantía.** SOS no garantiza la disponibilidad continua de la Plataforma ni la ausencia de errores.

---

## 13. Ley aplicable, resolución de conflictos y tribunales competentes

13.1. **Derecho sustantivo.** Para cada servicio que cubra un país, la relación SOS–Cliente se rige por las leyes del país de intervención sin privar al consumidor de sus derechos imperativos de residencia. Supletoriamente, el derecho estonio rige la interpretación/validez de las CG y cualquier cuestión no regulada por la ley local.

13.2. **Arbitraje CCI (opción consumidor) / obligatorio para no consumidores.**

* **Cliente no consumidor (B2B):** arbitraje CCI obligatorio, sede: Tallinn (Estonia), idioma: francés, derecho sustantivo según 13.1, procedimiento confidencial.
* **Cliente consumidor:** opción de recurrir al arbitraje CCI (mismas condiciones) o tribunales competentes según leyes imperativas aplicables.

13.3. **Tribunales estonios (Tallinn).** Para cualquier reclamo no arbitrable, ejecución de laudos o medidas urgentes, competencia exclusiva de tribunales de Estonia (Tallinn), sin perjuicio de los derechos imperativos del consumidor.

13.4. **Renuncia a acciones colectivas (dentro de lo permitido).** Se excluye cualquier acción colectiva/de grupo/repre- sentativa, salvo que la ley imperativa del lugar de residencia del consumidor disponga lo contrario.

---

## 14. Terminación/suspensión y diversos

14.1. **Suspensión.** SOS puede suspender/cerrar la cuenta en caso de fraude, incumplimiento, abuso o riesgo legal.

14.2. **Integridad.** Las CG constituyen el acuerdo completo entre SOS y el Cliente para el uso de la Plataforma.

14.3. **Idiomas.** Pueden proporcionarse traducciones; prevalece el francés para interpretación.

14.4. **Nulidad parcial.** Si una disposición es nula/inaplicable, el resto sigue en vigor; puede sustituirse por una cláusula válida de efecto equivalente.

14.5. **No renuncia.** La falta de ejercicio de un derecho no implica renuncia.

---

## 15. Contacto

**Formulario de contacto (soporte y solicitudes legales):** **[https://sos-expat.com/contact](https://sos-expat.com/contact)**
`;

  const defaultDe = `
# Allgemeine Geschäftsbedingungen – Kunden (Global)

**SOS Expat von WorldExpat OÜ** (im Folgenden „Plattform“, „SOS“, „wir“)

**Version 2.2 – Letzte Aktualisierung: 16. Juni 2025**

---

## 1. Zweck und Anwendungsbereich

1.1. Diese Allgemeinen Geschäftsbedingungen („AGB“) regeln die Nutzung der Plattform durch jede natürliche oder juristische Person, die ein Kundenkonto erstellt und über die Plattform eine Dienstleistung bucht (im Folgenden „Kunde“).

1.2. **Rolle von SOS Expat.** SOS Expat ist eine Plattform, die (i) unabhängige Anwälte („Anwälte“) und/oder (ii) unabhängige Expat-Helfer („Helfer“) vermittelt. SOS Expat ist keine Anwaltskanzlei, bietet keine rechtliche, medizinische, steuerliche oder regulierte Beratung an und ist keine Vertragspartei zwischen Kunde und Anbieter (Anwalt/Helfer).

1.3. **Elektronische Zustimmung (Click-wrap).** Das Anklicken der Zustimmung oder die Nutzung der Plattform bedeutet die Annahme dieser AGB (elektronische Signatur). SOS kann technische Nachweise speichern (Zeitstempel, IDs).

1.4. **Änderungen.** Wir können die AGB und/oder Gebühren mit Wirkung für die Zukunft durch Veröffentlichung auf der Plattform aktualisieren. Die fortgesetzte Nutzung bedeutet Zustimmung.

---

## 2. Konten, Compliance und Nutzung

2.1. **Alter und Geschäftsfähigkeit.** Der Kunde erklärt, dass er mindestens 18 Jahre alt ist und voll geschäftsfähig ist. Bei juristischen Personen bestätigt der Nutzer, dass er befugt ist, das Unternehmen zu binden.

2.2. **Genauigkeit der Informationen.** Bereitgestellte Informationen (Identität, Kontaktdaten, Land, Zweck der Anfrage) müssen korrekt und aktuell sein.

2.3. **Richtige Nutzung.** Der Kunde darf die Plattform nicht rechtswidrig oder missbräuchlich verwenden (Betrug, rechtswidrige Inhalte, Belästigung, Verletzung von Rechten Dritter, Umgehung von Zahlungen usw.). Die Plattform darf nicht für Notfälle im medizinischen oder lebensbedrohlichen Bereich genutzt werden; SOS ist kein Notfalldienst.

2.4. **Verfügbarkeit.** Die Plattform wird „wie verfügbar“ bereitgestellt; eine durchgehende Verfügbarkeit wird nicht garantiert (Wartung, technische Probleme, höhere Gewalt).

---

## 3. Art der über die Plattform buchbaren Dienstleistungen

3.1. **Anwaltliche Beratung.** Kurze Beratungen (z. B. 20 Minuten). Der Anwalt ist allein verantwortlich für seine Ratschläge und die Einhaltung beruflicher und gesetzlicher Vorschriften.

3.2. **Helfer-Dienstleistungen.** Unqualifizierte Unterstützung (praktische Hilfe, informelle Übersetzungen, lokale Kontakte etc.). Rechts-, medizinische oder regulierte Beratung wird nur von lizenzierten Fachkräften bereitgestellt.

3.3. **Keine Garantie.** Wir übernehmen keine Garantie für Ergebnisse, Qualität, Eignung für bestimmte Bedürfnisse oder Verfügbarkeit der Dienstleister.

---

## 4. Preise, Währungen und Vermittlungsgebühr

4.1. **Preisangabe.** Der Gesamtpreis bei Buchung umfasst: (i) die Vergütung des Dienstleisters (Anwalt/Helfer) laut Angebot und (ii) die Vermittlungsgebühr von SOS (fest).

4.2. **Vermittlungsgebühr (fest).** 19 € (EUR) oder 25 $ (USD) pro Vermittlung (ohne Steuern), im Gesamtpreis enthalten. SOS kann diese Gebühr ändern und/oder lokale Tarife je nach Land/Währung veröffentlichen.

4.3. **Währungen und Umrechnung.** Preise können in unterschiedlichen Währungen angezeigt werden. Gebühren/Kurse des Zahlungsanbieters können anfallen.

4.4. **Steuern.** Angezeigte Preise enthalten, sofern zutreffend, Mehrwertsteuer oder andere Steuern auf die Vermittlungsgebühr. Dienstleister sind für ihre steuerlichen Pflichten selbst verantwortlich.

---

## 5. Buchung, Anruf und Kontaktversuche

5.1. **Definition „Vermittlung“.** Eine Vermittlung gilt als durchgeführt, wenn: (a) die Kontaktdaten von Kunde und Dienstleister übermittelt wurden und/oder (b) ein Anruf-/Nachrichten-/Video-Kanal über die Plattform geöffnet wurde und/oder (c) der Dienstleister die Anfrage des Kunden akzeptiert.

5.2. **Anrufversuche.** Bei Sofortanrufen unternimmt die Plattform bis zu drei (3) Versuche innerhalb von ca. 15 Minuten (sofern in der App nicht anders angegeben).

5.3. **Nichtverfügbarkeit des Dienstleisters.** Gelingt die Vermittlung nach allen Versuchen nicht, wird die Buchung storniert und der Kunde erhält eine vollständige Rückerstattung.

5.4. **Keine Antwort des Kunden.** Wird die Vermittlung durchgeführt (5.1), aber der Austausch findet nicht statt (keine Antwort, beschäftigt, Ablehnung, vorzeitiges Beenden), bleibt die Zahlung bestehen und wird nicht zurückerstattet.

5.5. **Verbindungsqualität.** Der Kunde muss sich in einem Bereich mit ausreichender Netzabdeckung befinden und kompatible Geräte nutzen. SOS haftet nicht für Unterbrechungen oder Drittanbieter-Netze.

---

## 6. Widerrufsrecht (Verbraucher) und sofortige Ausführung

6.1. **Information.** Wenn der Kunde Verbraucher ist und nationales Recht ein Widerrufsrecht vorsieht, kann dieses innerhalb der gesetzlichen Fristen ausgeübt werden, außer bei Anforderung einer sofortigen Dienstleistung.

6.2. **Verzicht auf Widerruf.** Bei Buchung eines sofortigen oder geplanten Anrufs vor Ablauf der Widerrufsfrist gilt das Widerrufsrecht als vereinbart und erlischt nach vollständiger Erbringung der Dienstleistung. Bei teilweiser Leistungserbringung vor Widerruf zahlt der Kunde für den bereits erbrachten Teil und die Vermittlungsgebühr (nicht erstattungsfähig).

6.3. **Form.** Die Plattform dokumentiert die ausdrückliche Zustimmung des Kunden bei der Buchung, falls erforderlich.

---

## 7. Zahlung, Sicherheit und Rückerstattung

7.1. **Einzelzahlung und Verteilung.** Der Kunde zahlt eine Gesamtzahlung über die Plattform, die (i) den Anteil des Dienstleisters und (ii) die Vermittlungsgebühr abdeckt. SOS (oder Zahlungsanbieter) zieht die Gebühr ab und überweist den Rest an den Dienstleister.

7.2. **Sicherheit.** Zahlungen erfolgen über externe Zahlungsanbieter. KYC/AML-Prüfungen können erfolgen.

7.3. **Zahlungsstreitigkeiten.** Bei Streitigkeiten kann SOS dem Zahlungsanbieter nur notwendige Daten zur Verfügung stellen und Dienste/Zahlungen aussetzen.

7.4. **Entschädigung.** Bei Rückerstattungen wird der Dienstleisteranteil abgezogen; SOS kann künftige Zahlungen anrechnen.

---

## 8. Stornierung und Rückerstattung

8.1. **Grundsatz.** Mit Ausnahme zwingender gesetzlicher Bestimmungen:

* Vermittlungsgebühr wird nach erfolgter Vermittlung (5.1) nicht erstattet.
* Dienstleisteranteil wird nach Beginn der Dienstleistung nicht erstattet, außer als Kulanz.

8.2. **Stornierung durch Kunden vor Vermittlung.** Vollständige Rückerstattung.

8.3. **Stornierung durch Dienstleister.** Vollständige Rückerstattung. SOS kann einen alternativen verfügbaren Dienstleister vorschlagen.

8.4. **Technische Probleme seitens SOS.** Rückerstattung oder Gutschrift nach Ermessen von SOS, soweit gesetzlich zulässig.

---

## 9. Verhalten, Sicherheit und Inhalte

9.1. **Respekt.** Der Kunde verpflichtet sich zu respektvollem Verhalten, keine Aufzeichnungen oder Weitergabe ohne gesetzliche Zustimmung und keine Aufforderung zu rechtswidrigen Handlungen.

9.2. **Bereitgestellte Inhalte.** Informationen müssen wahr, korrekt und legal sein. Der Kunde stellt SOS und Dienstleister frei von Ansprüchen im Zusammenhang mit rechtswidrigen Inhalten.

9.3. **Beschwerden.** Missbrauch kann über das Kontaktformular gemeldet werden.

---

## 10. Persönliche Daten

10.1. **Rollen.** Für datenbezogene Zwecke agieren SOS und Dienstleister jeweils als unabhängige Verantwortliche.

10.2. **Rechtsgrundlagen und Zwecke.** Vertragserfüllung (Buchung), berechtigtes Interesse (Sicherheit, Betrugsprävention, Optimierung), gesetzliche Pflichten (AML/Sanktionen), Einwilligung falls erforderlich.

10.3. **Internationale Übertragungen.** Möglich mit angemessenen Garantien.

10.4. **Rechte und Kontakt.** Umsetzung über das Kontaktformular auf der Plattform.

10.5. **Sicherheit.** Angemessene technische und organisatorische Maßnahmen; Benachrichtigung bei Datenschutzverletzungen gemäß Gesetz.

10.6. **DSA-Konformität.** Die Plattform fungiert als **Vermittlungsdienst** im Sinne der **Verordnung (EU) 2022/2065 (Gesetz über digitale Dienste)**. SOS Expat implementiert Mechanismen zur Meldung illegaler Inhalte und kooperiert mit den zuständigen Behörden gemäß dem DSA.

---

## 11. Geistiges Eigentum

Die Plattform, Marken, Logos, Datenbanken und Inhalte sind geschützt. Keine Rechte werden auf den Kunden übertragen. Nutzung beschränkt auf persönlichen Zugang gemäß AGB.

---

## 12. Haftung

12.1. **Unabhängige Dienstleister.** Kunde erkennt an, dass Anwälte und Helfer unabhängig sind. SOS haftet nicht für Ratschläge/Dienstleistungen oder deren Ergebnisse.

12.2. **Haftungsbeschränkung.** Im gesetzlich maximal zulässigen Umfang ist die Haftung von SOS für direkten Schaden auf die vom Kunden für die jeweilige Buchung gezahlte Summe beschränkt. SOS haftet nicht für indirekte, spezielle oder Folgeschäden (entgangene Chancen, Gewinne, Reputation etc.).

12.3. **Keine Garantie.** SOS garantiert weder durchgehenden Plattformbetrieb noch Fehlerfreiheit.

---

## 13. Anwendbares Recht, Streitbeilegung und Gerichtsbarkeit

13.1. **Materielles Recht.** Für jede Dienstleistung gilt das Recht des Landes, in dem sie erbracht wird, ohne zwingende Verbraucherrechte einzuschränken. Zusätzlich gilt estnisches Recht für Auslegung und Lücken.

13.2. **ICC-Schiedsverfahren (Option für Verbraucher) / verbindlich für B2B.**

* **Kunde kein Verbraucher (B2B):** verbindliches ICC-Schiedsverfahren, Ort: Tallinn (Estland), Sprache: Französisch, materielles Recht gem. 13.1, vertrauliches Verfahren.
* **Verbraucher:** Wahl zwischen ICC-Schiedsverfahren (wie oben) oder ordentlichen Gerichten mit zwingendem Recht.

13.3. **Estnische Gerichte (Tallinn).** Für Streitigkeiten, die nicht schiedsbar sind, Vollstreckung von Schiedssprüchen oder dringende Maßnahmen – ausschließliche Zuständigkeit estnischer Gerichte (Tallinn), ohne zwingende Verbraucherrechte einzuschränken.

13.4. **Verzicht auf Sammelklagen.** Gruppen-, Sammel- oder Vertreterklagen sind ausgeschlossen, soweit nicht zwingendes Recht anderes vorsieht.

---

## 14. Kündigung/Aussetzung und Sonstiges

14.1. **Aussetzung.** SOS kann Konten bei Betrug, Verstößen gegen AGB, Missbrauch oder rechtlichem Risiko aussetzen oder schließen.

14.2. **Gesamtheit.** Die AGB bilden die vollständige Vereinbarung zwischen SOS und Kunde über die Nutzung der Plattform.

14.3. **Sprachen.** Übersetzungen möglich; bei Auslegung hat die französische Version Vorrang.

14.4. **Teilnichtigkeit.** Ist eine Bestimmung ungültig, bleiben die übrigen gültig; sie kann durch eine gültige Bestimmung mit äquivalenter Wirkung ersetzt werden.

14.5. **Verzicht.** Unterlassene Durchsetzung eines Rechts gilt nicht als Verzicht.

---

## 15. Kontakt

**Kontaktformular (Support und rechtliche Anfragen):** **[https://sos-expat.com/contact](https://sos-expat.com/contact)**
`;

  const defaultRu = `
# Общие условия – Клиенты (Глобальные)

**SOS Expat от WorldExpat OÜ** (далее — «Платформа», «SOS», «мы»)

**Версия 2.2 – Последнее обновление: 16 июня 2025 г.**

---

## 1. Цель и область применения

1.1. Настоящие общие условия («ОУ») регулируют использование Платформы любым физическим или юридическим лицом, которое создаёт учётную запись клиента и бронирует услугу через Платформу (далее — «Клиент»).

1.2. **Роль SOS Expat.** SOS Expat является платформой для соединения: (i) с независимыми юристами («Юристы») и/или (ii) с независимыми помощниками для экспатов («Помощники»). SOS Expat не является юридической фирмой, не предоставляет юридические, медицинские, налоговые или регулируемые консультации и не является стороной договора между Клиентом и поставщиком (Юрист/Помощник).

1.3. **Электронное согласие (click-wrap).** Отметка галочки согласия и/или использование Платформы означает принятие настоящих ОУ (электронная подпись). SOS может сохранять технические доказательства (метка времени, идентификаторы).

1.4. **Изменения.** Мы можем обновлять ОУ и/или тарифы с перспективным действием через публикацию на Платформе. Продолжение использования означает согласие.

---

## 2. Учётные записи, соответствие требованиям и использование

2.1. **Возраст и дееспособность.** Клиент заявляет, что ему/ей не менее 18 лет и он/она обладает полной дееспособностью. Для юридических лиц пользователь подтверждает, что имеет полномочия связывать компанию.

2.2. **Точность информации.** Предоставленная информация (личность, контактные данные, страна, цель запроса) должна быть точной и актуальной.

2.3. **Правильное использование.** Клиент не должен использовать Платформу незаконно или злоумышленно (мошенничество, незаконный контент, домогательства, нарушение прав третьих лиц, обход платежей и т.д.). Запрещено использовать для экстренных медицинских или жизненных ситуаций; SOS не является службой экстренной помощи.

2.4. **Доступность.** Платформа предоставляется «как есть»: непрерывная доступность не гарантируется (техническое обслуживание, инциденты, форс-мажор).

---

## 3. Характер услуг, доступных для бронирования

3.1. **Консультации с юристами.** Краткие консультации (например, 20 минут). Юрист несёт полную ответственность за свои советы и соблюдение профессиональной этики и местного законодательства.

3.2. **Консультации с помощниками.** Неквалифицированная поддержка (практическая помощь, неформальный перевод, контакты на месте и др.). Юридические, медицинские или регулируемые консультации предоставляются только при наличии соответствующей лицензии.

3.3. **Без гарантии.** Мы не гарантируем результаты, качество, соответствие конкретным потребностям или доступность поставщиков услуг.

---

## 4. Цены, валюты и комиссия за соединение

4.1. **Отображение цен.** Общая цена при бронировании включает: (i) вознаграждение поставщика (Юриста/Помощника) согласно предложению и (ii) комиссию SOS за соединение (фиксированная).

4.2. **Комиссия за соединение (фиксированная).** 19 € (EUR) или 25 $ (USD) за соединение (без налогов), включена в общую стоимость. SOS может изменять эту комиссию и/или публиковать местные тарифы по странам/валютам с перспективным действием.

4.3. **Валюты и конвертация.** Цены могут отображаться в разных валютах. Могут применяться комиссии/курсы обмена платёжного провайдера.

4.4. **Налоги.** Отображаемые цены включают, где применимо, НДС или другие налоги на комиссию за соединение. Поставщики остаются ответственными за свои налоговые обязательства.

---

## 5. Бронирование, звонок и попытки связи

5.1. **Определение «соединения».** Соединение считается выполненным, когда: (a) переданы контактные данные Клиента и Поставщика, и/или (b) открыт канал звонка/сообщений/видео через Платформу, и/или (c) Поставщик принимает запрос Клиента.

5.2. **Попытки звонка.** В случае немедленного звонка Платформа выполняет до трёх (3) попыток в течение примерно 15 минут (если не указано иначе в приложении).

5.3. **Недоступность поставщика.** Если соединение не удалось после всех попыток, бронирование отменяется и Клиент получает полный возврат.

5.4. **Отсутствие ответа Клиента.** Если соединение выполнено (по 5.1), но обмен не состоялся (не отвечает, занят, отказ, преждевременное завершение), оплата подлежит сохранению и не возвращается.

5.5. **Качество связи.** Клиент должен находиться в зоне с достаточным покрытием и использовать совместимое оборудование. SOS не несёт ответственности за перебои или сети третьих сторон.

---

## 6. Право на отказ (потребители) и немедленное исполнение

6.1. **Информация.** Если Клиент является потребителем и местное законодательство предусматривает право на отказ, оно может быть реализовано в законные сроки, за исключением случаев запроса немедленного предоставления услуги.

6.2. **Отказ от права.** При бронировании немедленного или запланированного звонка до истечения срока право на отказ считается согласованным Клиентом и теряется после полного оказания услуги. При частичном исполнении услуги до отказа Клиент оплачивает оказанную часть и комиссию за соединение (невозвратная).

6.3. **Формальность.** Платформа фиксирует явное согласие Клиента при бронировании, если это необходимо.

---

## 7. Оплата, безопасность и возвраты

7.1. **Единый платёж и распределение.** Клиент осуществляет единый платёж через Платформу, покрывающий (i) долю Поставщика и (ii) комиссию за соединение. SOS (или платёжный провайдер) списывает платёж, удерживает комиссию и переводит остаток Поставщику.

7.2. **Безопасность.** Платежи проходят через внешние платёжные провайдеры. Могут применяться проверки KYC/AML.

7.3. **Споры по платежам.** В случае спора SOS может предоставить платёжному провайдеру только необходимые данные и приостановить связанные услуги/платежи.

7.4. **Компенсация.** При возврате суммы часть, относящаяся к Поставщику, вычитается; SOS может компенсировать будущие платежи.

---

## 8. Отмена и возврат средств

8.1. **Общее правило.** За исключением обязательных законодательных положений:

* Комиссия за соединение не возвращается после выполнения соединения (5.1).
* Доля Поставщика не возвращается после начала услуги, за исключением коммерческого жеста.

8.2. **Отмена Клиентом до соединения.** Полный возврат.

8.3. **Отмена Поставщиком.** Полный возврат. SOS может предложить альтернативного доступного поставщика.

8.4. **Технические проблемы по вине SOS.** Возврат или кредит по усмотрению SOS, в пределах закона.

---

## 9. Поведение, безопасность и контент

9.1. **Уважение.** Клиент обязуется вести себя уважительно, не записывать и не распространять обмен без законного согласия и не запрашивать незаконные действия.

9.2. **Предоставленный контент.** Информация должна быть правдивой, точной и законной. Клиент компенсирует SOS и Поставщика за любые претензии, связанные с незаконным контентом.

9.3. **Жалобы.** Любые злоупотребления могут быть сообщены через форму обратной связи.

---

## 10. Персональные данные

10.1. **Роли.** Для данных, необходимых для соединения, SOS и Поставщик выступают как независимые контролёры для своих целей.

10.2. **Основания и цели.** Исполнение договора (бронирование), законные интересы (безопасность, предотвращение мошенничества, улучшение), соблюдение норм (AML/санкции), согласие при необходимости.

10.3. **Международные передачи.** Возможны с адекватными гарантиями.

10.4. **Права и контакт.** Реализуются через форму обратной связи на Платформе.

10.5. **Безопасность.** Разумные технические и организационные меры; уведомление о нарушениях в соответствии с законом.

10.6. **Соответствие DSA.** Платформа действует как **посреднический сервис** в соответствии с **Регламентом (ЕС) 2022/2065 (Закон о цифровых услугах)**. SOS Expat внедряет механизмы для сообщения о незаконном контенте и сотрудничает с компетентными органами в соответствии с DSA.

---

## 11. Интеллектуальная собственность

Платформа, её бренды, логотипы, базы данных и контент защищены. Права Клиенту не передаются. Использование ограничено личным доступом согласно ОУ.

---

## 12. Ответственность

12.1. **Независимые поставщики.** Клиент признаёт, что Юристы и Помощники независимы. SOS не несёт ответственности за советы/услуги и их результаты.

12.2. **Ограничения.** В максимально допустимой законом степени ответственность SOS за прямой ущерб ограничивается общей суммой, уплаченной Клиентом за соответствующее бронирование. SOS не отвечает за косвенный/специальный/побочный ущерб (потеря возможностей, прибыли, имиджа и т.д.).

12.3. **Без гарантии.** SOS не гарантирует непрерывность Платформы и отсутствие ошибок.

---

## 13. Применимое право, разрешение споров и юрисдикция

13.1. **Материальное право.** Для каждой услуги, охватывающей страну, отношения SOS–Клиент регулируются законами страны предоставления без ограничения обязательных прав потребителя. Дополнительно применимо эстонское право для толкования и любых пробелов.

13.2. **Арбитраж ICC (опция для потребителя) / обязательный для B2B.**

* **Клиент не потребитель (B2B):** обязательный арбитраж ICC, место: Таллинн (Эстония), язык: французский, материальное право по 13.1, конфиденциальная процедура.
* **Потребитель:** выбор между арбитражем ICC (те же условия) или судами по законам обязательного применения.

13.3. **Эстонские суды (Таллинн).** Для споров, не подлежащих арбитражу, исполнения арбитражных решений или срочных мер — исключительная юрисдикция судов Эстонии (Таллинн), без ущерба обязательным правам потребителя.

13.4. **Отказ от коллективных исков.** Запрещены коллективные/групповые/представительные иски, если местное императивное право не устанавливает иное.

---

## 14. Прекращение/приостановка и прочее

14.1. **Приостановка.** SOS может приостановить/закрыть учётную запись в случае мошенничества, нарушения ОУ, злоупотребления или юридического риска.

14.2. **Целостность.** ОУ составляют полное соглашение между SOS и Клиентом по использованию Платформы.

14.3. **Языки.** Возможны переводы; для толкования преимущество имеет французский.

14.4. **Частичная недействительность.** Если положение недействительно, остальные остаются в силе; может быть заменено действительным положением эквивалентного эффекта.

14.5. **Отсутствие отказа.** Неприменение права не означает отказ.

---

## 15. Контакты

**Форма обратной связи (поддержка и юридические запросы):** **[https://sos-expat.com/contact](https://sos-expat.com/contact)**
`;

const defaultPt = `
# Condições Gerais – Clientes (Global)


**SOS Expat da WorldExpat OÜ** (a "Plataforma", "SOS", "nós")


**Versão 2.2 – Última atualização: 16 de junho de 2025**


---


## 1. Objeto e escopo


1.1. As presentes condições gerais ("CGV") regem o uso da Plataforma por qualquer pessoa física ou jurídica que crie uma conta de cliente e reserve um serviço através da Plataforma (o "Cliente").


1.2. **Papel da SOS Expat.** SOS Expat é uma plataforma de conexão: (i) com advogados independentes ("Advogados"), e/ou (ii) com expatriados assistentes independentes ("Assistentes"). SOS Expat não é um escritório de advocacia, não fornece nenhum conselho jurídico, médico, fiscal ou regulamentado, e não é parte do contrato de prestação celebrado entre o Cliente e o prestador (Advogado/Assistente).


1.3. **Aceitação eletrônica (click-wrap).** Ao marcar a caixa de aceitação e/ou usar a Plataforma, o Cliente aceita as presentes CGV (assinatura eletrônica). SOS pode reter evidências técnicas (timestamp, identificadores).


1.4. **Modificações.** Podemos atualizar as CGV e/ou as tarifas/taxas com efeito prospectivo por publicação na Plataforma. A continuação do uso constitui aceitação.


---


## 2. Contas, elegibilidade e uso


2.1. **Idade e capacidade.** O Cliente declara ter 18 anos completos e capacidade legal. Para pessoas jurídicas, o usuário declara estar autorizado a vincular a empresa.


2.2. **Exatidão das informações.** As informações fornecidas (identidade, meios de contato, país, objeto da solicitação) devem ser exatas e atualizadas.


2.3. **Uso conforme.** O Cliente se proíbe de qualquer uso ilícito ou abusivo (fraude, conteúdo ilegal, assédio, violação de direitos de terceiros, desvio de fluxos de pagamento, etc.). Nenhum uso para situações médicas ou vitais de emergência; SOS não é um serviço de emergência.


2.4. **Disponibilidade.** A Plataforma é fornecida "no estado em que se encontra": nenhuma disponibilidade ininterrupta é garantida (manutenção, incidentes, força maior).


---


## 3. Natureza dos serviços reserváveis


3.1. **Chamadas com Advogados.** Consultas breves de orientação (ex. 20 minutos). O Advogado permanece exclusivamente responsável por seus conselhos e conformidade com sua deontologia/leis locais.


3.2. **Chamadas com Assistentes.** Ajuda não regulamentada (orientação prática, tradução informal, contatos locais...). Nenhum conselho jurídico/médico/regulamentado sem licença local adequada.


3.3. **Sem garantias.** Não garantimos nem o resultado, nem a qualidade, nem a adequação a uma necessidade particular, nem a disponibilidade dos prestadores.


---


## 4. Preços, moedas e taxas de conexão


4.1. **Exibição de preços.** O preço total exibido no momento da reserva inclui: (i) a remuneração do prestador (Advogado/Assistente) definida de acordo com a oferta apresentada, e (ii) as taxas de conexão devidas à SOS (taxa fixa).


4.2. **Taxas de conexão (taxa fixa).** 19€ (EUR) ou 25$ (USD) por conexão (excluindo impostos), integradas no preço total. SOS pode modificar esta taxa e/ou publicar tabelas locais por país/moeda com efeito prospectivo.


4.3. **Moedas e conversão.** Os preços podem ser oferecidos em várias moedas. Taxas/taxas de câmbio do processador de pagamento podem se aplicar.


4.4. **Impostos.** Os preços exibidos incluem, quando aplicável, IVA ou impostos aplicáveis nas taxas de conexão. Os Prestadores permanecem responsáveis por suas próprias obrigações fiscais.


---


## 5. Reserva, chamada e tentativas de contato


5.1. **Definição de "conexão".** É considerada realizada: (a) a transmissão dos detalhes Cliente-Prestador, e/ou (b) a abertura pela Plataforma de um canal de chamada/mensagem/vídeo, e/ou (c) a aceitação pelo Prestador de uma solicitação do Cliente.


5.2. **Tentativas de chamada.** Em caso de chamada imediata: a Plataforma realiza até três (3) tentativas em uma janela de aproximadamente 15 minutos (exceto indicação diferente no app).


5.3. **Indisponibilidade do prestador.** Se nenhuma conexão pôde ser realizada após as tentativas, a reserva é cancelada e o Cliente é reembolsado integralmente do preço total pago.


5.4. **Não-resposta do Cliente.** Se a conexão ocorreu (conforme 5.1) mas o Cliente não conseguiu um intercâmbio efetivo (não-resposta, linha ocupada, recusa, parada prematura), o pagamento permanece devido e não reembolsável.


5.5. **Qualidade da comunicação.** O Cliente deve estar em uma zona de cobertura suficiente e usar equipamento compatível. SOS não é responsável por interrupções/redes de terceiros.


---


## 6. Direito de arrependimento (consumidores) & execução imediata


6.1. **Informação.** Se o Cliente é consumidor e a lei local imperativa prevê um direito de arrependimento, este pode ser exercido nos prazos legais, exceto se o Cliente solicitar a execução imediata do serviço.


6.2. **Renúncia.** Ao reservar uma chamada imediata ou programada antes da expiração do prazo legal, o Cliente solicita execução imediata e reconhece que, uma vez o serviço totalmente executado, ele perde seu direito de arrependimento. Em caso de execução parcial antes de arrependimento, o Cliente deve pagar a parte já fornecida e as taxas de conexão, não reembolsáveis.


6.3. **Formalismo.** A Plataforma coleta a aceitação explícita destes pontos durante a reserva, quando necessário.


---


## 7. Pagamento, segurança, contestações


7.1. **Pagamento único & divisão.** O Cliente efetua um pagamento único via Plataforma cobrindo (i) a parte do Prestador e (ii) as taxas de conexão. SOS (ou seu processador de pagamento) coleta, deduz suas taxas, depois remete o saldo ao Prestador.


7.2. **Segurança.** Os pagamentos transitam por processadores de pagamento de terceiros. Controles KYC/AML podem se aplicar.


7.3. **Contestações/disputa.** Em caso de disputa de pagamento, SOS pode transmitir ao processador de pagamento os dados estritamente necessários e suspender serviços/pagamentos relacionados.


7.4. **Compensação.** Se um reembolso for concedido ao Cliente, a parte correspondente é deduzida do prestador envolvido; SOS pode compensar sobre seus pagamentos futuros.


---


## 8. Cancelamentos e reembolsos


8.1. **Geral.** Exceto disposições legais imperativas:
- as taxas de conexão são não reembolsáveis uma vez realizada a conexão (5.1);
- a parte do Prestador é não reembolsável uma vez iniciada a prestação, exceto por gesto comercial do Prestador.


8.2. **Cancelamento pelo Cliente antes da conexão.** Reembolso integral.


8.3. **Cancelamento pelo Prestador.** Reembolso integral. SOS pode oferecer redirecionamento para outro prestador disponível.


8.4. **Casos técnicos imputáveis à SOS.** Reembolso ou recredenciamento a critério de SOS, na medida permitida por lei.


---


## 9. Comportamentos, segurança e conteúdos


9.1. **Respeito.** O Cliente se compromete a um comportamento respeitoso, não gravar nem difundir o intercâmbio sem consentimento legalmente exigido, e não solicitar atos ilegais.


9.2. **Conteúdos fornecidos.** As informações transmitidas devem ser leais, exatas e lícitas. O Cliente garante à SOS e ao Prestador contra qualquer reclamação relacionada a conteúdos ilegais que fornecesse.


9.3. **Denúncia.** Qualquer abuso pode ser denunciado via formulário de contato.


---


## 10. Dados pessoais


10.1. **Funções.** Para dados estritamente necessários para a conexão, SOS e o Prestador atuam cada um como responsável pelo tratamento para seus próprios fins.


10.2. **Bases & fins.** Execução do contrato (reserva), interesses legítimos (segurança, prevenção de fraude, melhoria), conformidade (AML/sanções) e consentimento se exigido.


10.3. **Transferências internacionais** possíveis com garantias apropriadas.


10.4. **Direitos & contato.** Exercício via formulário de contato da Plataforma.


10.5. **Segurança.** Medidas técnicas/organizacionais razoáveis; notificação de violações conforme exigido por lei.

10.6. **Conformidade DSA.** A Plataforma opera como um **serviço intermediário** no âmbito do **Regulamento (UE) 2022/2065 (Lei dos Serviços Digitais)**. SOS Expat implementa mecanismos para reportar conteúdo ilegal e coopera com as autoridades competentes de acordo com o DSA.


---


## 11. Propriedade intelectual


A Plataforma, suas marcas, logos, bases de dados e conteúdos são protegidos. Nenhum direito é cedido ao Cliente. O uso é estritamente limitado a um acesso pessoal conforme as CGV.


---


## 12. Responsabilidade


12.1. **Prestadores independentes.** O Cliente reconhece que Advogados e Assistentes são independentes. SOS não é responsável pelos conselhos/serviços fornecidos nem por seu resultado.


12.2. **Limitações.** Na medida permitida por lei, a responsabilidade de SOS por dano direto comprovado é limitada ao preço total pago pelo Cliente pela reserva em questão. SOS não é responsável por danos indiretos/especiais/consequentes (perda de oportunidade, lucros, reputação, etc.), na medida permitida.


12.3. **Sem garantias.** SOS não garante disponibilidade contínua da Plataforma nem ausência de erros.


---


## 13. Lei aplicável, resolução de litígios e tribunais competentes


13.1. **Lei material.** Para cada serviço abrangendo um país dado, a relação SOS-Cliente é regida pelas leis do país de intervenção sem privar o Cliente consumidor de seus direitos imperativos de residência. Subsidiariamente, a lei estoniana rege a interpretação/validade das CGV e qualquer questão não regida por esta lei local.


13.2. **Arbitragem ICC (opção consumidor) / obrigatória não-consumidor.**
- **Cliente não-consumidor (B2B)**: arbitragem ICC obrigatória, sede: Tallinn (Estônia), idioma: português, lei material conforme 13.1, procedimento confidencial.
- **Cliente consumidor**: opção de recorrer à arbitragem ICC (mesmas modalidades) ou aos tribunais competentes sob as leis imperativas aplicáveis.


13.3. **Competência dos tribunais estonios (Tallinn).** Para qualquer demanda não arbitrável, execução de sentenças ou medidas urgentes, competência exclusiva dos tribunais da Estônia (Tallinn), sem prejuízo dos direitos imperativos do consumidor.


13.4. **Renúncia a ações coletivas (na medida permitida).** Qualquer ação coletiva/de grupo/representativa é excluída, exceto se a lei imperativa do local de residência do consumidor dispuser de outra forma.


---


## 14. Rescisão/suspensão e diversos


14.1. **Suspensão.** SOS pode suspender/fechar a conta em caso de fraude, não-conformidade, abuso ou risco legal.


14.2. **Integralidade.** As CGV constituem o acordo completo entre SOS e o Cliente para o uso da Plataforma.


14.3. **Idiomas.** Traduções podem ser fornecidas; o português prevalece para interpretação.


14.4. **Nulidade parcial.** Se uma estipulação for nula/inaplicável, o restante permanece em vigor; pode ser substituída por uma cláusula válida de efeito equivalente.


14.5. **Não-renúncia.** O fato de não exercer um direito não implica renúncia.


---


## 15. Contato


**Formulário de contato (suporte & solicitações legais)**: [**https://sos-expat.com/contact**](https://sos-expat.com/contact)
`;
const defaultCh = `
# 一般条款 – 客户（全球）

**SOS Expat by WorldExpat OÜ**（以下简称“平台”、“SOS”、“我们”）

**版本 2.2 – 最后更新：2025年6月16日**

## 1. 目的与适用范围

1.1 本通用条款及条件（“GTC”）适用于任何创建客户账户并通过平台预订服务的个人或法人实体（“客户”）。

1.2 SOS Expat 的角色。SOS Expat 是一个连接以下双方的平台：(i) 独立律师（“律师”），和/或 (ii) 独立外籍护理人员（“护理人员”）。SOS Expat 并非律师事务所，不提供任何法律、医疗、税务或监管方面的建议，也并非客户与服务提供商（律师/护理人员）之间签订的服务协议的当事方。

1.3 电子接受（点击式）。客户勾选接受框和/或使用平台即表示接受本 GTC（电子签名）。SOS 可能会保留技术证据（时间戳、标识符）。

1.4 条款及条件的修改。我们可能会通过在平台上发布更新后的条款及条件和/或价格/费用，该更新将对未来生效。继续使用即表示接受。

---

## 2. 账户、资格与使用

2.1 年满18岁且具备法律行为能力。 企业用户保证其代表授权合法。

2.2 必须提供并保持准确、最新的信息。

2.3 禁止非法或滥用行为；平台并非紧急服务。

2.4 可用性按“现状”提供（“as is”）。

---

## 3. 可预订的服务

3.1 与律师通话。提供简短的初步咨询（例如 20 分钟）。律师对其提供的建议以及遵守职业道德和当地法律负全部责任。

3.2 与护理人员通话。提供非监管性协助（实用指导、非正式翻译、当地联系人等）。未持有相应的当地执照，我们不提供任何法律、医疗或监管方面的建议。

3.3 不作任何保证。我们不保证服务结果、质量、是否适合特定需求或服务提供商的可用性。

---

## 4. 价格、货币与连接费用

4.1 显示的总价包括：(i) 服务提供方的报酬；及 (ii) SOS 的固定连接费用。
4.2 连接费用： 每次连接 19欧元（EUR） 或 25美元（USD）（不含税），金额可能调整，或依据不同国家/货币制定本地费用表并前瞻性生效。
4.3 可能适用汇率及支付处理费用。在法律要求的情况下，连接费含税；服务提供方负责其自身税务义务。

---

## 5. 预订、通话与尝试

5.1 当客户与提供方交换联系方式和/或开启通话/消息/视频渠道及/或提供方接受请求时，即视为建立连接（Connection）。
5.2 即时通话可进行最多三（3）次尝试，约15分钟内完成。
5.3 如未能建立连接，则全额退款。
5.4 如已建立连接，但客户未参与（未接听、拒绝或提前终止），支付仍视为应付且不可退款。

---

## 6. 撤销权（消费者）与立即履行

6.1 若强制性当地法律赋予撤销权，则该权利可能适用，除非客户要求立即履行服务。
6.2 当客户预订立即或短期通话时，即表示其要求立即履行，并确认服务完全履行后撤销权即消失；若在撤销前部分履行，客户须支付已履行部分的费用及不可退款的连接费。
6.3 平台在需要时会收集明确同意。

---

## 7. 付款、安全与退款争议

7.1 单次付款与分配： 客户支付的总金额涵盖提供方份额及连接费用。SOS（或其支付处理方）收取款项，扣除连接费后将余额汇给提供方。
7.2 付款通过第三方处理；可能适用反洗钱（AML）/客户识别（KYC）要求。
7.3 如发生退款或争议（chargeback），SOS可与支付处理方共享必要数据，并可暂停相关服务或款项支付。
7.4 抵销： 若客户获得退款，将从提供方份额中承担；SOS可从未来应付款中抵销。

---  

## 8. 取消与退款

8.1 除强制性法律另有规定外：

一旦建立连接，连接费不可退款；

一旦服务开始履行，提供方份额不可退款，除非提供方基于善意自行处理；

8.2 连接前取消： 全额退款；

8.3 提供方取消： 全额退款；

8.4 因平台技术故障： SOS可在法律允许范围内酌情退款或发放信用额度。

---

## 9. 行为规范、安全与内容

9.1 尊重。客户参与时应尊重行为，不得在未取得法律同意的情况下进行变更注册，也不得要求采取非法行为。

9.2 Contenus fournis。信息以忠诚、严格和合法的方式传播。客户保证 SOS 和 Prestataire 不会完全收回其内容。

9.3 信号。请通过联系方式发送信号。

---

## 10. 数据保护

10.1 独立数据控制者： SOS 与服务提供方各自独立处理个人数据，用于各自目的（合同履行、安全与防欺诈、服务改进、反洗钱/制裁、及在适用时的同意）。
10.2 可能进行国际数据传输，并在需要时采取保障措施。
10.3 权利与联系： 可通过联系表单行使。
10.4 采用安全措施，并在发生泄露时依规通知。

10.5 **DSA合规。** 本平台作为**欧盟法规2022/2065（数字服务法）**定义的**中介服务**运营。SOS Expat实施非法内容举报机制，并根据DSA与主管当局合作。

---

## 11. 知识产权

平台的知识产权归 WorldExpat OÜ 所有；客户仅获得个人、有限的访问使用权。

---

## 12. 责任

12.1 服务提供方为独立主体；SOS 对其服务或结果不承担责任。
12.2 在法律允许的最大范围内，SOS 对客户的总责任限于因相关预订而支付的总价；在允许的范围内，不承担间接、特殊或后果性损害赔偿。

---

## 13. 适用法律、争议与法院管辖

13.1 实体法： 对每个提供服务的国家，适用该介入国家的法律，同时不影响客户在居住地享有的强制性消费者权利。
13.2 补充适用： 爱沙尼亚法律用于解释与效力，以及未被当地法律涵盖的事项。
 非消费者： 争议须提交国际商会（ICC）仲裁（仲裁地：爱沙尼亚塔林；语言：法语；保密）。
 消费者： 可选择参加ICC仲裁或依据强制性法律使用有管辖权的法院。
13.3 非仲裁事项、裁决执行及紧急措施由**爱沙尼亚法院（塔林）**专属管辖，但须遵守强制性消费者权利。
13.4 在法律允许范围内，放弃集体/联合诉讼权利。

---

## 14. 终止/暂停及其他条款

14.1 如存在欺诈、不合规、滥用或法律风险，我们可暂停或关闭账户。
14.2 法语版本优先用于解释。
14.3 适用可分割性及不放弃原则。
14.4 通知可通过平台发布、应用内提示或联系表单发送。

---

## 15. 联系方式

联系表单（支持与法律请求）： https://sos-expat.com/contact
`

  
  const defaultAr = `
# الشروط العامة – العملاء (عالمي)

**SOS Expat من WorldExpat OÜ** ("المنصة"، "SOS"، "نحن")

**الإصدار 2.2 – آخر تحديث: 16 يونيو 2025**

---

## 1. الموضوع والنطاق

1.1. تحكم الشروط العامة الحالية ("CGV") استخدام المنصة من قبل أي شخص طبيعي أو معنوي ينشئ حساب عميل ويحجز خدمة من خلال المنصة ("العميل").

1.2. **دور SOS Expat.** SOS Expat هي منصة ربط: (i) مع محامين مستقلين ("محامون")، و/أو (ii) مع مساعدين مغتربين مستقلين ("مساعدون"). SOS Expat ليست مكتب محاماة، لا تقدم أي استشارات قانونية أو طبية أو ضريبية أو منظمة، وليست طرفاً في عقد الخدمة المبرم بين العميل ومقدم الخدمة (محامي/مساعد).

1.3. **القبول الإلكتروني (النقر).** بتحديد خانة القبول و/أو استخدام المنصة، يقبل العميل هذه الشروط العامة (التوقيع الإلكتروني). يمكن لـ SOS الاحتفاظ بالأدلة التقنية (الطابع الزمني، المعرفات).

1.4. **التعديلات.** يجوز لنا تحديث الشروط العامة و/أو الأسعار/الرسوم بتأثير محتمل بالنشر على المنصة. استمرار الاستخدام يشكل قبولاً.

---

## 2. الحسابات والأهلية والاستخدام

2.1. **العمر والأهلية.** يعلن العميل أنه يبلغ 18 سنة على الأقل وله أهلية قانونية. بالنسبة للأشخاص المعنويين، يعلن المستخدم أنه مخول بربط الشركة.

2.2. **دقة المعلومات.** يجب أن تكون المعلومات المقدمة (الهوية، جهات الاتصال، البلد، موضوع الطلب) دقيقة ومحدثة.

2.3. **الاستخدام المتوافق.** يحظر العميل على نفسه أي استخدام غير قانوني أو تعسفي (احتيال، محتوى غير قانوني، مضايقة، انتهاك حقوق الغير، تحويل تدفقات الدفع، إلخ). لا استخدام للحالات الطبية أو الحالات الحيوية الطارئة؛ SOS ليست خدمة طوارئ.

2.4. **التوفر.** توفر المنصة "كما هي": لا يتم ضمان أي توفر متواصل (صيانة، حوادث، قوة قاهرة).

---

## 3. طبيعة الخدمات القابلة للحجز

3.1. **المكالمات مع المحامين.** استشارات توجيه قصيرة (مثل 20 دقيقة). يبقى المحامي مسؤولاً بشكل حصري عن نصيحته والامتثال لآدابه/القوانين المحلية.

3.2. **المكالمات مع المساعدين.** مساعدة غير منظمة (إرشادات عملية، ترجمة غير رسمية، جهات اتصال محلية...). لا استشارة قانونية/طبية/منظمة بدون ترخيص محلي مناسب.

3.3. **بدون ضمانات.** لا نضمن النتيجة أو الجودة أو الملاءمة لاحتياجات معينة أو توفر مقدمي الخدمات.

---

## 4. الأسعار والعملات ورسوم الربط

4.1. **عرض الأسعار.** السعر الإجمالي المعروض عند وقت الحجز يشمل: (i) تعويض مقدم الخدمة (محامي/مساعد) المحدد وفقاً للعرض المقدم، و(ii) رسوم الربط المستحقة لـ SOS (رسم ثابت).

4.2. **رسوم الربط (رسم ثابت).** 19 يورو (EUR) أو 25 دولار (USD) لكل ربط (بدون ضرائب)، متكاملة في السعر الإجمالي. يمكن لـ SOS تعديل هذه الرسوم و/أو نشر جداول محلية حسب الدولة/العملة بتأثير محتمل.

4.3. **العملات والتحويل.** يمكن عرض الأسعار بعملات متعددة. قد تنطبق رسوم/أسعار صرف معالج الدفع.

4.4. **الضرائب.** تشمل الأسعار المعروضة، عند الانطباق، ضريبة القيمة المضافة أو الضرائب المعمول بها على رسوم الربط. يبقى مقدمو الخدمات مسؤولين عن التزاماتهم الضريبية الخاصة.

---

## 5. الحجز والمكالمة ومحاولات الاتصال

5.1. **تعريف "الربط".** يعتبر محققاً عندما: (أ) نقل تفاصيل العميل-مقدم الخدمة، و/أو (ب) فتح المنصة قناة مكالمة/رسالة/فيديو، و/أو (ج) قبول مقدم الخدمة لطلب العميل.

5.2. **محاولات المكالمة.** في حالة المكالمة الفورية: تجري المنصة حتى ثلاث (3) محاولات في نافذة زمنية تقارب 15 دقيقة (إلا إذا كان هناك مؤشر مختلف في التطبيق).

5.3. **عدم توفر مقدم الخدمة.** إذا لم يتمكن من تحقيق أي ربط بعد المحاولات، يتم إلغاء الحجز ويتم استرجاع السعر الإجمالي المدفوع بالكامل للعميل.

5.4. **عدم رد العميل.** إذا تم تحقيق الربط (وفقاً 5.1) لكن العميل لم يحقق تبادلاً فعلياً (عدم رد، خط مشغول، رفض، توقف مبكر)، يبقى الدفع مستحقاً وغير قابل للاسترجاع.

5.5. **جودة الاتصال.** يجب أن يكون العميل في منطقة تغطية كافية واستخدام معدات متوافقة. SOS ليست مسؤولة عن انقطاعات/شبكات الأطراف الثالثة.

---

## 6. حق الندم (المستهلكون) والتنفيذ الفوري

6.1. **معلومات.** إذا كان العميل مستهلكاً والقانون المحلي الإلزامي ينص على حق ندم، يمكن ممارسته ضمن الآجال القانونية، إلا إذا طلب العميل التنفيذ الفوري للخدمة.

6.2. **التنازل.** بحجز مكالمة فورية أو مجدولة قبل انقضاء الأجل القانوني، يطلب العميل التنفيذ الفوري ويعترف بأنه، بمجرد تنفيذ الخدمة بالكامل، يفقد حق الندم. في حالة التنفيذ الجزئي قبل الندم، يجب على العميل دفع الجزء المنفذ بالفعل ورسوم الربط، غير قابلة للاسترجاع.

6.3. **الشكليات.** تجمع المنصة القبول الصريح لهذه النقاط أثناء الحجز، عند الضرورة.

---

## 7. الدفع والأمان والمنازعات

7.1. **دفع موحد وتقسيم.** يقوم العميل بدفع موحد عبر المنصة يغطي (i) حصة مقدم الخدمة و(ii) رسوم الربط. تجمع SOS (أو معالج الدفع الخاص بها)، تخصم رسومها، ثم تحول الرصيد إلى مقدم الخدمة.

7.2. **الأمان.** تمر المدفوعات عبر معالجات دفع من طرف ثالث. قد تنطبق عمليات التحقق من معرفة العميل (KYC)/مكافحة غسيل الأموال (AML).

7.3. **المنازعات/النزاع.** في حالة نزاع بشأن الدفع، يمكن لـ SOS نقل المعالج بيانات مقدم الخدمة الضرورية تماماً والنوايا المرتبطة بها/الدفعات.

7.4. **التعويض.** إذا تم منح استرجاع للعميل، يتم خصم الجزء المقابل من مقدم الخدمة المعني؛ يمكن لـ SOS التعويض على دفعاته المستقبلية.

---

## 8. الإلغاءات والاسترجاعات

8.1. **عام.** ما لم تكن هناك أحكام قانونية إلزامية:
- رسوم الربط غير قابلة للاسترجاع بمجرد تحقيق الربط (5.1)؛
- حصة مقدم الخدمة غير قابلة للاسترجاع بمجرد بدء الخدمة، إلا بإيماءة تجارية من مقدم الخدمة.

8.2. **إلغاء بواسطة العميل قبل الربط.** استرجاع كامل.

8.3. **إلغاء بواسطة مقدم الخدمة.** استرجاع كامل. يمكن لـ SOS عرض إعادة توجيه لمقدم خدمة آخر متاح.

8.4. **حالات تقنية قابلة للنسب إلى SOS.** استرجاع أو إعادة تجميد حسب تقدير SOS، بقدر ما يسمح به القانون.

---

## 9. السلوكيات والأمان والمحتويات

9.1. **الاحترام.** يلتزم العميل بسلوك محترم، وعدم تسجيل أو نشر التبادل بدون الموافقة المطلوبة قانوناً، وعدم طلب أعمال غير قانونية.

9.2. **المحتويات المقدمة.** يجب أن تكون المعلومات المنقولة نزيهة ودقيقة وقانونية. يضمن العميل SOS ومقدم الخدمة ضد أي مطالبة تتعلق بمحتويات غير قانونية قدمها.

9.3. **الإبلاغ.** يمكن الإبلاغ عن أي إساءة عبر نموذج الاتصال.

---

## 10. البيانات الشخصية

10.1. **الأدوار.** بالنسبة للبيانات الضرورية تماماً للربط، تعمل SOS ومقدم الخدمة كل منهما كمسؤول معالجة لأغراضهما الخاصة.

10.2. **الأسس والأغراض.** تنفيذ العقد (الحجز)، المصالح المشروعة (الأمان، منع الاحتيال، التحسين)، الامتثال (AML/العقوبات) والموافقة إذا لزم الأمر.

10.3. **التحويلات الدولية** ممكنة مع ضمانات مناسبة.

10.4. **الحقوق والاتصال.** الممارسة عبر نموذج الاتصال بالمنصة.

10.5. **الأمان.** تدابير تقنية/تنظيمية معقولة؛ إشعار الانتهاكات حسب المطلوب بموجب القانون.

10.6. **الامتثال لـ DSA.** تعمل المنصة كـ **خدمة وسيطة** وفقاً لـ **اللائحة (EU) 2022/2065 (قانون الخدمات الرقمية)**. تنفذ SOS Expat آليات للإبلاغ عن المحتوى غير القانوني وتتعاون مع السلطات المختصة وفقاً لـ DSA.

---

## 11. الملكية الفكرية

المنصة وعلاماتها التجارية وشعاراتها وقواعد بيانات المحتوى محمية. لا يتم نقل أي حقوق إلى العميل. الاستخدام مقتصر بشكل صارم على الوصول الشخصي وفقاً للشروط العامة.

---

## 12. المسؤولية

12.1. **مقدمو الخدمات المستقلون.** يعترف العميل بأن المحامين والمساعدين مستقلون. SOS ليست مسؤولة عن الاستشارات/الخدمات المقدمة أو نتائجها.

12.2. **القيود.** بقدر ما يسمح به القانون، تقتصر مسؤولية SOS عن الضرر المباشر المثبت على السعر الإجمالي المدفوع من قبل العميل للحجز المعني. SOS ليست مسؤولة عن الأضرار غير المباشرة/الخاصة/الناتجة (فقدان الفرصة، الأرباح، السمعة، إلخ)، بقدر ما يسمح به.

12.3. **بدون ضمانات.** SOS لا تضمن التوفر المستمر للمنصة أو غياب الأخطاء.

---

## 13. القانون المعمول به وحل النزاعات والمحاكم المختصة

13.1. **القانون الموضوعي.** لكل خدمة تغطي بلداً معيناً، تحكم علاقة SOS-العميل قوانين دولة التدخل دون حرمان العميل المستهلك من حقوقه الإلزامية بموطنه. بشكل استبدالي، يحكم القانون الإستوني تفسير/صحة الشروط العامة وأي مسألة لا يحكمها هذا القانون المحلي.

13.2. **التحكيم ICC (خيار المستهلك) / إلزامي غير المستهلك.**
- **العميل غير المستهلك (B2B)**: تحكيم ICC إلزامي، المقر: تالين (إستونيا)، اللغة: العربية، القانون الموضوعي وفقاً 13.1، الإجراء سري.
- **العميل المستهلك**: خيار اللجوء إلى تحكيم ICC (نفس الشروط) أو المحاكم المختصة بموجب القوانين الإلزامية المعمول بها.

13.3. **اختصاص المحاكم الإستونية (تالين).** لأي دعوى غير قابلة للتحكيم أو تنفيذ أحكام أو تدابير عاجلة، الاختصاص الحصري لمحاكم إستونيا (تالين)، دون الإخلال بحقوق المستهلك الإلزامية.

13.4. **التنازل عن الإجراءات الجماعية (بقدر ما يسمح به).** أي إجراء جماعي/جماعي/تمثيلي مستثنى، إلا إذا نص القانون الإلزامي لمحل إقامة المستهلك على غير ذلك.

---

## 14. الإنهاء/الإيقاف والمسائل المختلفة

14.1. **الإيقاف.** يمكن لـ SOS إيقاف/إغلاق الحساب في حالة احتيال أو عدم امتثال أو إساءة استخدام أو مخاطرة قانونية.

14.2. **الكمال.** تشكل الشروط العامة الاتفاق الكامل بين SOS والعميل لاستخدام المنصة.

14.3. **اللغات.** قد يتم توفير ترجمات؛ تغلب العربية على التفسير.

14.4. **العطل الجزئي.** إذا كانت ميزة ما باطلة/غير قابلة للتطبيق، يبقى الباقي ساري المفعول؛ قد يتم استبدالها بميزة صحيحة بتأثير معادل.

14.5. **عدم التنازل.** حقيقة عدم ممارسة حق لا تعني التنازل عنه.

---

## 15. اتصل

**نموذج الاتصال (الدعم والطلبات القانونية)**: [[**https://sos-expat.com/contact**](https://sos-expat.com/contact)](https://sos-expat.com/contact)
`;

  
  // const defaultContent = selectedLanguage === 'fr' ? defaultFr : defaultEn;
  // ✅ NEW (5 languages):
const defaultContent =
  selectedLanguage === "fr"
    ? defaultFr
    : selectedLanguage === "es"
    ? defaultEs
    : selectedLanguage === "de"
      ? defaultDe
      : selectedLanguage === "ru"
        ? defaultRu
        : selectedLanguage === "hi"
          ? defaultHi
          : selectedLanguage === "pt"
            ? defaultPt
            : selectedLanguage === "ch"
              ? defaultCh
            : selectedLanguage === "ar"
              ? defaultAr  // ADD THIS
              : defaultEn;

  // Sommaire (UI)
 

const anchorMap = useMemo(
  () => [
    {
      num: 1,
      label:
        selectedLanguage === "fr"
          ? "Objet et champ d'application"
          : selectedLanguage === "es"
            ? "Propósito y alcance"
            : selectedLanguage === "pt"
              ? "Objeto e escopo"
              : selectedLanguage === "de"
                ? "Zweck und Geltungsbereich"
                : selectedLanguage === "ru"
                  ? "Цель и область применения"
                  : selectedLanguage === "hi"
                    ? "उद्देश्य और दायरा"
                    : selectedLanguage === "ch"
                      ? "目的和范围"
                      : selectedLanguage === "ar"
                        ? "الموضوع والنطاق"
                        : "Purpose and Scope",
    },
    {
      num: 2,
      label:
        selectedLanguage === "fr"
          ? "Comptes & usage"
          : selectedLanguage === "es"
            ? "Cuentas y uso"
            : selectedLanguage === "pt"
              ? "Contas e uso"
              : selectedLanguage === "de"
                ? "Konten & Nutzung"
                : selectedLanguage === "ru"
                  ? "Аккаунты и использование"
                  : selectedLanguage === "hi"
                    ? "खाते और उपयोग"
                    : selectedLanguage === "ch"
                      ? "账户和使用"
                      : selectedLanguage === "ar"
                        ? "الحسابات والاستخدام"
                        : "Accounts & Use",
    },
    {
      num: 3,
      label:
        selectedLanguage === "fr"
          ? "Services réservables"
          : selectedLanguage === "es"
            ? "Servicios reservables"
            : selectedLanguage === "pt"
              ? "Serviços reserváveis"
              : selectedLanguage === "de"
                ? "Buchbare Dienste"
                : selectedLanguage === "ru"
                  ? "Бронируемые услуги"
                  : selectedLanguage === "hi"
                    ? "बुक करने योग्य सेवाएं"
                    : selectedLanguage === "ch"
                      ? "可预订服务"
                      : selectedLanguage === "ar"
                        ? "الخدمات القابلة للحجز"
                        : "Bookable Services",
    },
    {
      num: 4,
      label:
        selectedLanguage === "fr"
          ? "Prix & frais"
          : selectedLanguage === "es"
            ? "Precios y tarifas"
            : selectedLanguage === "pt"
              ? "Preços e taxas"
              : selectedLanguage === "de"
                ? "Preise & Gebühren"
                : selectedLanguage === "ru"
                  ? "Цены и сборы"
                  : selectedLanguage === "hi"
                    ? "मूल्य और शुल्क"
                    : selectedLanguage === "ch"
                      ? "价格和费用"
                      : selectedLanguage === "ar"
                        ? "الأسعار والرسوم"
                        : "Prices & Fees",
    },
    {
      num: 5,
      label:
        selectedLanguage === "fr"
          ? "Réservation & appels"
          : selectedLanguage === "es"
            ? "Reserva y llamadas"
            : selectedLanguage === "pt"
              ? "Reserva e chamadas"
              : selectedLanguage === "de"
                ? "Buchung & Anrufe"
                : selectedLanguage === "ru"
                  ? "Бронирование и звонки"
                  : selectedLanguage === "hi"
                    ? "बुकिंग और कॉल"
                    : selectedLanguage === "ch"
                      ? "预订和通话"
                      : selectedLanguage === "ar"
                        ? "الحجز والمكالمات"
                        : "Booking & Calls",
    },
    {
      num: 6,
      label:
        selectedLanguage === "fr"
          ? "Rétractation"
          : selectedLanguage === "es"
            ? "Derecho de desistimiento"
            : selectedLanguage === "pt"
              ? "Direito de arrependimento"
              : selectedLanguage === "de"
                ? "Widerrufsrecht"
                : selectedLanguage === "ru"
                  ? "Право на отказ"
                  : selectedLanguage === "hi"
                    ? "वापसी का अधिकार"
                    : selectedLanguage === "ch"
                      ? "撤销权"
                      : selectedLanguage === "ar"
                        ? "حق الندم"
                        : "Withdrawal Right",
    },
    {
      num: 7,
      label:
        selectedLanguage === "fr"
          ? "Paiement & sécurité"
          : selectedLanguage === "es"
            ? "Pago y seguridad"
            : selectedLanguage === "pt"
              ? "Pagamento e segurança"
              : selectedLanguage === "de"
                ? "Zahlung & Sicherheit"
                : selectedLanguage === "ru"
                  ? "Оплата и безопасность"
                  : selectedLanguage === "hi"
                    ? "भुगतान और सुरक्षा"
                    : selectedLanguage === "ch"
                      ? "支付和安全"
                      : selectedLanguage === "ar"
                        ? "الدفع والأمان"
                        : "Payment & Security",
    },
    {
      num: 8,
      label:
        selectedLanguage === "fr"
          ? "Annulations & remboursements"
          : selectedLanguage === "es"
            ? "Cancelaciones y reembolsos"
            : selectedLanguage === "pt"
              ? "Cancelamentos e reembolsos"
              : selectedLanguage === "de"
                ? "Stornierungen & Rückerstattungen"
                : selectedLanguage === "ru"
                  ? "Отмены и возвраты"
                  : selectedLanguage === "hi"
                    ? "रद्दीकरण और रिफंड"
                    : selectedLanguage === "ch"
                      ? "取消和退款"
                      : selectedLanguage === "ar"
                        ? "الإلغاءات والاسترجاعات"
                        : "Cancellations & Refunds",
    },
    {
      num: 9,
      label:
        selectedLanguage === "fr"
          ? "Comportements & contenus"
          : selectedLanguage === "es"
            ? "Conducta y contenido"
            : selectedLanguage === "pt"
              ? "Comportamentos e conteúdos"
              : selectedLanguage === "de"
                ? "Verhalten & Inhalte"
                : selectedLanguage === "ru"
                  ? "Поведение и контент"
                  : selectedLanguage === "hi"
                    ? "आचरण और सामग्री"
                    : selectedLanguage === "ch"
                      ? "行为和内容"
                      : selectedLanguage === "ar"
                        ? "السلوكيات والمحتويات"
                        : "Conduct & Content",
    },
    {
      num: 10,
      label:
        selectedLanguage === "fr"
          ? "Données personnelles"
          : selectedLanguage === "es"
            ? "Protección de datos"
            : selectedLanguage === "pt"
              ? "Dados pessoais"
              : selectedLanguage === "de"
                ? "Datenschutz"
                : selectedLanguage === "ru"
                  ? "Защита данных"
                  : selectedLanguage === "hi"
                    ? "डेटा सुरक्षा"
                    : selectedLanguage === "ch"
                      ? "数据保护"
                      : selectedLanguage === "ar"
                        ? "البيانات الشخصية"
                        : "Data Protection",
    },
    {
      num: 11,
      label:
        selectedLanguage === "fr"
          ? "Propriété intellectuelle"
          : selectedLanguage === "es"
            ? "Propiedad intelectual"
            : selectedLanguage === "pt"
              ? "Propriedade intelectual"
              : selectedLanguage === "de"
                ? "Geistiges Eigentum"
                : selectedLanguage === "ru"
                  ? "Интеллектуальная собственность"
                  : selectedLanguage === "hi"
                    ? "बौद्धिक संपदा"
                    : selectedLanguage === "ch"
                      ? "知识产权"
                      : selectedLanguage === "ar"
                        ? "الملكية الفكرية"
                        : "Intellectual Property",
    },
    {
      num: 12,
      label:
        selectedLanguage === "fr"
          ? "Responsabilité"
          : selectedLanguage === "es"
            ? "Responsabilidad"
            : selectedLanguage === "pt"
              ? "Responsabilidade"
              : selectedLanguage === "de"
                ? "Haftung"
                : selectedLanguage === "ru"
                  ? "Ответственность"
                  : selectedLanguage === "hi"
                    ? "जिम्मेदारी"
                    : selectedLanguage === "ch"
                      ? "责任"
                      : selectedLanguage === "ar"
                        ? "المسؤولية"
                        : "Liability",
    },
    {
      num: 13,
      label:
        selectedLanguage === "fr"
          ? "Droit applicable & litiges"
          : selectedLanguage === "es"
            ? "Ley aplicable y disputas"
            : selectedLanguage === "pt"
              ? "Lei aplicável e litígios"
              : selectedLanguage === "de"
                ? "Anwendbares Recht & Streitigkeiten"
                : selectedLanguage === "ru"
                  ? "Применимое право и споры"
                  : selectedLanguage === "hi"
                    ? "लागू कानून और विवाद"
                    : selectedLanguage === "ch"
                      ? "适用法律和争议"
                      : selectedLanguage === "ar"
                        ? "القانون المعمول به والنزاعات"
                        : "Governing Law & Disputes",
    },
    {
      num: 14,
      label:
        selectedLanguage === "fr"
          ? "Résiliation & divers"
          : selectedLanguage === "es"
            ? "Terminación y varios"
            : selectedLanguage === "pt"
              ? "Rescisão e diversos"
              : selectedLanguage === "de"
                ? "Kündigung & Sonstiges"
                : selectedLanguage === "ru"
                  ? "Прекращение и прочее"
                  : selectedLanguage === "hi"
                    ? "समाप्ति और अन्य"
                    : selectedLanguage === "ch"
                      ? "终止和其他"
                      : selectedLanguage === "ar"
                        ? "الإنهاء والمسائل المختلفة"
                        : "Termination & Misc.",
    },
    {
      num: 15,
      label:
        selectedLanguage === "fr"
          ? "Contact"
          : selectedLanguage === "es"
            ? "Contacto"
            : selectedLanguage === "pt"
              ? "Contato"
              : selectedLanguage === "de"
                ? "Kontakt"
                : selectedLanguage === "ru"
                  ? "Контакт"
                  : selectedLanguage === "hi"
                    ? "संपर्क"
                    : selectedLanguage === "ch"
                      ? "联系"
                      : selectedLanguage === "ar"
                        ? "اتصل"
                        : "Contact",
    },
  ],
  [selectedLanguage]
);



  const body = content || defaultContent;

  return (
    <Layout>
      <main className="min-h-screen bg-gray-950">
        {/* HERO */}
        <section className="relative pt-20 pb-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-transparent to-blue-500/10 pointer-events-none" />
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 max-w-6xl mx-auto px-6">
            {/* Badge + langues */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
              <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-full pl-5 pr-4 py-2.5 border border-white/20 text-white">
                <Sparkles className="w-4 h-4 text-yellow-300" />
                <span className="text-sm font-semibold">{t.heroBadge}</span>
                <span className="mx-1 text-white/40">•</span>
                <span className="text-sm text-white/90">{t.lastUpdated}</span>
              </div>

              {/* <div className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm p-1">
                <button
                  type="button"
                  onClick={() => handleLanguageChange('fr')}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    selectedLanguage === 'fr' ? 'bg-white text-gray-900' : 'text-white hover:bg-white/10'
                  }`}
                  aria-pressed={selectedLanguage === 'fr'}
                >
                  <Languages className="w-4 h-4" />
                  FR
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageChange('en')}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    selectedLanguage === 'en' ? 'bg-white text-gray-900' : 'text-white hover:bg-white/10'
                  }`}
                  aria-pressed={selectedLanguage === 'en'}
                >
                  <Languages className="w-4 h-4" />
                  EN
                </button>
              </div> */}
            </div>

            <header className="text-center">
              <div className="flex justify-center mb-6">
                <div className="flex items-center justify-center w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20">
                  <FileText className="w-12 h-12 text-white" />
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

              {/* Points clés */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-white/90">
                {[
                  {
                    icon: <CreditCard className="w-6 h-6" />,
                    text: t.features[0],
                    gradient: "from-green-500 to-emerald-500",
                  },
                  {
                    icon: <Shield className="w-6 h-6" />,
                    text: t.features[1],
                    gradient: "from-blue-500 to-indigo-500",
                  },
                  {
                    icon: <Phone className="w-6 h-6" />,
                    text: t.features[2],
                    gradient: "from-yellow-500 to-orange-500",
                  },
                  {
                    icon: <Users className="w-6 h-6" />,
                    text: t.features[3],
                    gradient: "from-red-500 to-orange-500",
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

              <div className="mt-8 flex items-center justify-center gap-4">
                <a
                  href="https://sos-expat.com/contact"
                  className="group inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white font-bold border-2 border-red-400/50 hover:scale-105 transition-all"
                >
                  <Globe className="w-5 h-5" />
                  <span>{t.contactUs}</span>
                </a>
                <Link
                  to="/"
                  className="group inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white border-2 border-white/30 hover:border-white/50 transition-all duration-300 backdrop-blur-sm font-semibold"
                >
                  <Shield className="w-5 h-5" />
                  <span>{t.seeHowItWorks}</span>
                </Link>
              </div>
            </header>
          </div>
        </section>

        {/* Sommaire */}
        <section className="py-8 bg-gradient-to-b from-white to-gray-50">
          <div className="max-w-6xl mx-auto px-6">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 text-white">
                  <FileText className="w-5 h-5" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900">
                  {t.anchorTitle}
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {anchorMap.map((s) => (
                  <a
                    key={s.num}
                    href={`#section-${s.num}`}
                    className="group flex items-center gap-3 px-4 py-3 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-gray-900 text-white text-xs font-bold">
                      {s.num}
                    </span>
                    <span className="text-gray-700 group-hover:text-gray-900">
                      {s.label}
                    </span>
                  </a>
                ))}
              </div>
              <p className="mt-4 text-sm text-gray-500 flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                {t.editHint}
              </p>
            </div>
          </div>
        </section>

        {/* Contenu principal */}
        <section className="py-10 sm:py-14 bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-5xl mx-auto px-6">
            {isLoading ? (
              <div className="space-y-4" aria-live="polite" aria-busy="true">
                <div className="h-8 w-2/3 bg-gray-200 rounded-xl animate-pulse" />
                <div className="h-6 w-1/2 bg-gray-200 rounded-xl animate-pulse" />
                <div className="h-5 w-full bg-gray-200 rounded-xl animate-pulse" />
                <div className="h-5 w-11/12 bg-gray-200 rounded-xl animate-pulse" />
                <div className="h-5 w-10/12 bg-gray-200 rounded-xl animate-pulse" />
                <div className="h-5 w-9/12 bg-gray-200 rounded-xl animate-pulse" />
              </div>
            ) : (
              <article className="prose max-w-none">
                <div className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-10 shadow-sm">
                  {parseMarkdownContent(body)}
                </div>
              </article>
            )}
          </div>
        </section>

        {/* Bandeau final */}
        <section className="py-20 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/20" />
          <div className="relative z-10 max-w-5xl mx-auto text-center px-6">
            <h2 className="text-3xl sm:text-5xl font-black text-white mb-4">
              {t.readyToUse}
            </h2>
            <p className="text-lg sm:text-2xl text-white/95 mb-10 leading-relaxed">
              {t.readySubtitle}
            </p>

            <div className="mb-8 flex flex-wrap items-center justify-center gap-3 text-white/90">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 border border-white/20 backdrop-blur-sm">
                <Clock className="w-4 h-4" />{" "}
                <span>
                  3 {selectedLanguage === "fr" ? "tentatives" : "attempts"}
                </span>
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 border border-white/20 backdrop-blur-sm">
                <DollarSign className="w-4 h-4" /> <span>EUR 19 / USD 25</span>
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 border border-white/20 backdrop-blur-sm">
                <Globe className="w-4 h-4" /> Global
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
              <a
                href="https://sos-expat.com/contact"
                className="group relative overflow-hidden border-2 border-white bg-transparent text-white px-10 py-5 rounded-3xl font-bold text-lg transition-all duration-300 hover:scale-105 hover:bg-white/10 flex items-center gap-3"
              >
                <Globe className="w-5 h-5" />
                <span>{t.contactUs}</span>
                <span className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-white/30" />
              </a>
              <Link
                to="/"
                className="group relative overflow-hidden bg-white text-red-600 hover:text-red-700 px-10 py-5 rounded-3xl font-black text-lg transition-all duration-300 hover:scale-110 hover:shadow-2xl flex items-center gap-3"
              >
                <Shield className="w-5 h-5" />
                <span>{t.seeHowItWorks}</span>
                {/* Pas de flèche ici */}
                <span className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-black/5" />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
};

export default TermsClients;
