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
      lastUpdated: "Version 3.0 – Dernière mise à jour : 1er février 2026",
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
      lastUpdated: "Version 3.0 – Last updated: February 1, 2026",
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
      lastUpdated: "Versión 3.0 – Última actualización: 1 de febrero de 2026",
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
      lastUpdated: "Version 3.0 – Letzte Aktualisierung: 1. Februar 2026",
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
      lastUpdated: "Версия 3.0 – Последнее обновление: 1 февраля 2026",
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
      lastUpdated: "संस्करण 3.0 – अंतिम अपडेट: 1 फ़रवरी 2026",
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
      lastUpdated: "Versão 3.0 – Última atualização: 1 de fevereiro de 2026",
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
      lastUpdated: "الإصدار 3.0 – آخر تحديث: 1 فبراير 2026",
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
      lastUpdated: "版本 3.0 – 最后更新：2026年2月1日",
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
# सामान्य उपयोग की शर्तें – ग्राहक (वैश्विक)

**SOS Expat** एक सेवा है जो **WorldExpat OÜ** द्वारा संचालित है, जो एस्टोनियाई कानून के तहत एक कंपनी है (कंपनी रजिस्टर संख्या 16885621), जिसका पंजीकृत कार्यालय Harju maakond, Tallinn, Kesklinna linnaosa, Tornimäe tn 3/5/7, 10145, एस्टोनिया में स्थित है ("**प्लेटफ़ॉर्म**", "**SOS**", "**SOS Expat**", "**हम**")।

**संस्करण 3.0 – अंतिम अपडेट: 1 फरवरी 2026**

---

## 1. उद्देश्य और दायरा

1.1. ये सामान्य शर्तें ("CGU") प्लेटफ़ॉर्म के उपयोग को नियंत्रित करती हैं जो किसी भी व्यक्ति या कानूनी इकाई द्वारा की जाती है जो ग्राहक खाता बनाता है और प्लेटफ़ॉर्म के माध्यम से सेवा बुक करता है ("ग्राहक")।

1.2. **SOS Expat की भूमिका।** SOS Expat एक कनेक्शन प्लेटफ़ॉर्म है: (i) स्वतंत्र वकीलों ("वकील") के साथ, और/या (ii) स्वतंत्र प्रवासी सहायकों ("सहायक") के साथ। SOS Expat कोई कानूनी फर्म नहीं है, कोई कानूनी, चिकित्सा, कर या विनियमित सलाह प्रदान नहीं करता है, और ग्राहक और सेवा प्रदाता (वकील/सहायक) के बीच संपन्न सेवा अनुबंध का पक्ष नहीं है।

1.3. **इलेक्ट्रॉनिक स्वीकृति (क्लिक-रैप)।** स्वीकृति बॉक्स पर टिक करके और/या प्लेटफ़ॉर्म का उपयोग करके, ग्राहक इन CGU को स्वीकार करता है, जो **eIDAS (EU) विनियम संख्या 910/2014** और समकक्ष राष्ट्रीय कानूनों के अर्थ में एक वैध इलेक्ट्रॉनिक हस्ताक्षर का गठन करता है।

1.4. **स्वीकृति की ट्रेसबिलिटी।** SOS Expat एक टाइमस्टैम्प्ड (UTC) ऑडिट लॉग रखता है जिसमें शामिल है: IP पता, सत्र पहचानकर्ता, उपयोगकर्ता-एजेंट, CGU संस्करण, स्वीकृत दस्तावेज़ का डिजिटल फिंगरप्रिंट (हैश) और ग्राहक की अद्वितीय पहचान। यह डेटा स्वीकृति का **स्वीकार्य प्रमाण** है।

1.5. **प्रमाण का संरक्षण।** स्वीकृति लॉग ग्राहक की अंतिम गतिविधि या खाता बंद होने के बाद **दस (10) वर्षों** तक संरक्षित किए जाते हैं। अनुरोध पर स्वीकृति प्रमाणपत्र जारी किया जा सकता है।

1.6. **संशोधन।** हम प्लेटफ़ॉर्म पर प्रकाशन द्वारा भावी प्रभाव के साथ CGU और/या मूल्य/शुल्क अपडेट कर सकते हैं। ग्राहक के अधिकारों या दायित्वों को प्रभावित करने वाला कोई भी महत्वपूर्ण संशोधन अधिसूचित किया जाएगा और मौजूदा ग्राहकों के लिए **नई स्वीकृति** आवश्यक होगी।

1.7. **अवधि।** CGU अनिश्चित अवधि के लिए संपन्न हैं।

---

## 2. खाते, पात्रता और उपयोग

2.1. **आयु और क्षमता।** ग्राहक घोषणा करता है कि वह 18 वर्ष का है और कानूनी क्षमता रखता है। कानूनी संस्थाओं के लिए, उपयोगकर्ता घोषणा करता है कि वह कंपनी को बाध्य करने के लिए अधिकृत है।

2.2. **जानकारी की सटीकता।** प्रदान की गई जानकारी (पहचान, संपर्क साधन, देश, अनुरोध का उद्देश्य) सटीक और अद्यतन होनी चाहिए।

2.3. **ग्राहक की घोषणाएं और गारंटी।** खाता बनाकर और प्लेटफ़ॉर्म का उपयोग करके, ग्राहक स्पष्ट रूप से घोषणा करता है और गारंटी देता है कि:
- (a) वह अपने निवास देश के कानून के अनुसार **वयस्क** है (न्यूनतम 18 वर्ष);
- (b) उसके पास अनुबंध करने की **पूर्ण कानूनी क्षमता** है;
- (c) वह संरक्षकता या किसी समकक्ष सुरक्षा व्यवस्था के अधीन नहीं है;
- (d) वह **किसी भी अंतरराष्ट्रीय प्रतिबंध सूची** (OFAC/SDN, EU, UN, HMT) में सूचीबद्ध नहीं है;
- (e) पंजीकरण के समय प्रदान की गई सभी जानकारी **सटीक, पूर्ण और अद्यतन** है;
- (f) वह इन घोषणाओं को प्रभावित करने वाले किसी भी परिवर्तन के बारे में **तुरंत** SOS Expat को सूचित करेगा;
- (g) **कानूनी संस्थाओं** के लिए: प्रतिनिधि के पास कंपनी को बाध्य करने की शक्तियां हैं।
कोई भी झूठी घोषणा खाते के निलंबन का कारण बन सकती है।

2.4. **अनुरूप उपयोग।** ग्राहक किसी भी अवैध या अपमानजनक उपयोग (धोखाधड़ी, अवैध सामग्री, उत्पीड़न, पहचान चोरी, आदि) से बचेगा। **SOS Expat आपातकालीन सेवा नहीं है**।

2.5. **खाता सुरक्षा।** ग्राहक अपने लॉगिन क्रेडेंशियल्स की सुरक्षा करता है। उसके खाते के माध्यम से की गई कोई भी गतिविधि उसके द्वारा की गई मानी जाती है।

2.6. **उपलब्धता।** प्लेटफ़ॉर्म "जैसा है" आधार पर प्रदान किया गया है: कोई निर्बाध उपलब्धता की गारंटी नहीं है।

---

## 3. बुक करने योग्य सेवाओं की प्रकृति

3.1. **वकीलों के साथ कॉल।** संक्षिप्त मार्गदर्शन परामर्श (जैसे 20 मिनट)। वकील अपनी सलाह और अपने आचार संहिता/स्थानीय कानूनों के अनुपालन के लिए पूर्ण रूप से जिम्मेदार है।

3.2. **सहायकों के साथ कॉल।** अनियमित सहायता (व्यावहारिक मार्गदर्शन, अनौपचारिक अनुवाद, स्थानीय संपर्क...)। उपयुक्त स्थानीय लाइसेंस के बिना कोई कानूनी/चिकित्सा/विनियमित सलाह नहीं।

3.3. **कोई गारंटी नहीं।** हम परिणाम, गुणवत्ता, किसी विशेष आवश्यकता के लिए उपयुक्तता, या सेवा प्रदाताओं की उपलब्धता की गारंटी नहीं देते।

---

## 4. मूल्य, मुद्राएं और कनेक्शन शुल्क

4.1. **मूल्य प्रदर्शन।** बुकिंग के समय प्रदर्शित कुल मूल्य में शामिल है:
- (a) प्रस्तुत प्रस्ताव में परिभाषित **सेवा प्रदाता का पारिश्रमिक** (वकील/सहायक);
- (b) SOS Expat को देय **कनेक्शन शुल्क** (निश्चित शुल्क)।
ग्राहक अपनी बुकिंग की पुष्टि करने से पहले **कर सहित कुल मूल्य** देखता है।

4.2. **कनेक्शन शुल्क (सांकेतिक निश्चित दर)।** 19 € (EUR) या 25 $ (USD) प्रति मध्यस्थता (करों के बिना), कुल मूल्य में शामिल। SOS भविष्य में शुल्क बदल सकता है।

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

## 10. व्यक्तिगत डेटा (GDPR / डेटा संरक्षण)

10.1. **डेटा नियंत्रक।** कनेक्शन के लिए आवश्यक डेटा के लिए, **SOS Expat (WorldExpat OÜ)** और **सेवा प्रदाता** (वकील/सहायक) प्रत्येक अपने-अपने उद्देश्यों के लिए **स्वतंत्र डेटा नियंत्रक** के रूप में कार्य करते हैं, **विनियम (EU) 2016/679 (GDPR)** के अनुसार।

10.2. **एकत्रित डेटा।** SOS Expat निम्नलिखित डेटा एकत्र करता है: पहचान, संपर्क विवरण, निवास का देश, अनुरोध का उद्देश्य, भुगतान डेटा (तृतीय-पक्ष प्रदाताओं द्वारा संसाधित), कनेक्शन डेटा (IP, टाइमस्टैम्प, डिवाइस), बुकिंग इतिहास।

10.3. **कानूनी आधार और उद्देश्य।**
- **अनुबंध निष्पादन**: बुकिंग प्रसंस्करण, कनेक्शन, भुगतान;
- **वैध हित**: सुरक्षा, धोखाधड़ी रोकथाम, सेवा सुधार, अनाम सांख्यिकी;
- **कानूनी दायित्व**: AML/CFT अनुपालन, प्रतिबंध, कर दायित्व;
- **सहमति**: विपणन संचार (किसी भी समय वापस लिया जा सकता है)।

10.4. **प्रतिधारण अवधि।** डेटा संविदात्मक संबंध की अवधि के लिए रखा जाता है, फिर कानूनी सीमा अवधि (डेटा के आधार पर 5 से 10 वर्ष) के लिए संग्रहीत किया जाता है।

10.5. **अंतर्राष्ट्रीय स्थानांतरण।** डेटा **उचित सुरक्षा उपायों** (मानक संविदात्मक खंड, पर्याप्तता निर्णय, आदि) के साथ यूरोपीय आर्थिक क्षेत्र के बाहर स्थानांतरित किया जा सकता है।

10.6. **ग्राहक के अधिकार।** ग्राहक के निम्नलिखित अधिकार हैं: पहुंच, सुधार, मिटाना, प्रतिबंध, पोर्टेबिलिटी, आपत्ति। प्लेटफ़ॉर्म के **संपर्क फ़ॉर्म** या ईमेल के माध्यम से प्रयोग करें।

10.7. **सुरक्षा।** उचित तकनीकी और संगठनात्मक उपाय (एन्क्रिप्शन, एक्सेस नियंत्रण, ऑडिट)। GDPR के अनुसार **72 घंटों** के भीतर डेटा उल्लंघन अधिसूचना।

10.8. **DSA अनुपालन।** प्लेटफ़ॉर्म **विनियम (EU) 2022/2065 (डिजिटल सेवा अधिनियम)** के अर्थ में एक **मध्यस्थ सेवा** के रूप में संचालित होता है। SOS Expat अवैध सामग्री की रिपोर्टिंग के लिए तंत्र लागू करता है और सक्षम अधिकारियों के साथ सहयोग करता है।

---

## 11. बौद्धिक संपदा

प्लेटफ़ॉर्म, ट्रेडमार्क, लोगो, डेटाबेस और सामग्री सुरक्षित हैं। कोई अधिकार ग्राहक को नहीं दिए जाते।

---

## 12. उत्तरदायित्व और गारंटी

12.1. **केवल कनेक्शन भूमिका।** SOS Expat **विशेष रूप से** एक तकनीकी कनेक्शन प्लेटफ़ॉर्म है। SOS Expat:
- कानूनी फर्म, परामर्श फर्म, या कानूनी, चिकित्सा, कर या विनियमित सेवाओं का प्रदाता **नहीं है**;
- ग्राहक और सेवा प्रदाता (वकील/सहायक) के बीच अनुबंध का **पक्ष नहीं है**;
- सेवा प्रदाताओं द्वारा प्रदान की गई सलाह या सेवाओं की गुणवत्ता, सटीकता, वैधता या परिणाम की **गारंटी नहीं देता**;
- सेवा प्रदाताओं के शुल्क निर्धारण में **हस्तक्षेप नहीं करता** (कनेक्शन शुल्क को छोड़कर)।

12.2. **स्वतंत्र सेवा प्रदाता।** वकील और सहायक **स्वतंत्र पेशेवर** हैं, जो अपनी सलाह, सेवाओं और अपने कानूनी तथा नैतिक दायित्वों के अनुपालन के लिए पूर्ण रूप से जिम्मेदार हैं। SOS Expat किसी सेवा प्रदाता की सेवाओं के परिणामस्वरूप ग्राहक को हुई किसी भी क्षति के लिए **सभी उत्तरदायित्व से इनकार करता है**।

12.3. **उत्तरदायित्व की सीमा।** **लागू कानून द्वारा अनुमत अधिकतम सीमा तक** और **उपभोक्ताओं के अनिवार्य अधिकारों पर प्रतिकूल प्रभाव डाले बिना**:
- (a) ग्राहक के प्रति SOS Expat का कुल उत्तरदायित्व **सिद्ध प्रत्यक्ष क्षति** तक सीमित है और दावे को जन्म देने वाली बुकिंग के लिए ग्राहक द्वारा भुगतान की गई कुल कीमत से **अधिक नहीं हो सकता**;
- (b) SOS Expat अप्रत्यक्ष, विशेष, परिणामी, दंडात्मक या अनुकरणीय क्षति (अवसर की हानि, लाभ, अवसर, प्रतिष्ठा को नुकसान, नैतिक क्षति, आदि) के लिए **उत्तरदायी नहीं है**।

12.4. **कोई गारंटी नहीं।** प्लेटफ़ॉर्म "**जैसा है**" और "**उपलब्धता के अनुसार**" आधार पर प्रदान किया गया है। SOS Expat गारंटी नहीं देता:
- प्लेटफ़ॉर्म की निरंतर या अबाध उपलब्धता;
- त्रुटियों, बग या सुरक्षा कमजोरियों की अनुपस्थिति;
- किसी विशेष सेवा प्रदाता की उपलब्धता;
- ग्राहक की विशेष आवश्यकताओं के लिए सेवाओं की उपयुक्तता।

12.5. **अप्रत्याशित घटना।** SOS Expat **अप्रत्याशित घटनाओं** (प्राकृतिक आपदा, युद्ध, महामारी, साइबर हमला, बिजली या इंटरनेट आउटेज, सरकारी निर्णय, हड़ताल, आदि) के कारण होने वाली देरी या विफलताओं के लिए उत्तरदायी नहीं है।

12.6. **ग्राहक-सेवा प्रदाता विवाद।** ग्राहक और सेवा प्रदाता के बीच कोई भी विवाद **विशेष रूप से** उनके प्रत्यक्ष संबंध का मामला है। SOS Expat ऐसे विवादों में **हस्तक्षेप नहीं करता** और पक्ष, गारंटर या मध्यस्थ के रूप में **उत्तरदायी नहीं ठहराया जा सकता**।

---

## 13. लागू कानून, विवाद समाधान और सक्षम न्यायालय

13.1. **लागू कानून।**
- **गैर-उपभोक्ता ग्राहक (B2B)**: ये शर्तें **विशेष रूप से** **एस्टोनियाई कानून** द्वारा शासित हैं, इसके विधि-संघर्ष नियमों को छोड़कर।
- **उपभोक्ता ग्राहक (B2C)**: शर्तें एस्टोनियाई कानून द्वारा शासित हैं, **ग्राहक को** उसके निवास स्थान के उपभोक्ता संरक्षण के अनिवार्य प्रावधानों से **वंचित किए बिना**।

13.2. **ICC मध्यस्थता।**
- **गैर-उपभोक्ता ग्राहक (B2B)**: कोई भी विवाद **ICC (अंतर्राष्ट्रीय वाणिज्य मंडल)** के मध्यस्थता नियमों के तहत **अंतिम रूप से** निपटाया जाएगा। **स्थान: तेलिन (एस्टोनिया)**। **भाषा: अंग्रेजी**। एक (1) मध्यस्थ। **गोपनीय** कार्यवाही।
- **उपभोक्ता ग्राहक (B2C)**: ग्राहक के पास ICC मध्यस्थता (समान शर्तें) या अपने निवास स्थान के अनिवार्य कानूनों के तहत सक्षम न्यायालयों के बीच **चुनाव** है।

13.3. **सामूहिक कार्रवाइयों और जूरी से त्याग।** **लागू कानून द्वारा अनुमत अधिकतम सीमा तक** और **उपभोक्ताओं के अनिवार्य अधिकारों पर प्रतिकूल प्रभाव डाले बिना**:
- (a) कोई भी **सामूहिक, समूह, प्रतिनिधि या समेकित कार्रवाई** **बहिष्कृत** है; केवल **व्यक्तिगत** दावे स्वीकार्य हैं;
- (b) गैर-उपभोक्ता ग्राहक **जूरी परीक्षण के अधिकार से स्पष्ट रूप से त्याग करते हैं** (जूरी परीक्षण त्याग)।

13.4. **एस्टोनियाई न्यायालयों की क्षेत्राधिकार।** किसी भी **गैर-मध्यस्थता योग्य दावे**, **एक्जीक्वेटर** (मध्यस्थ पंचाटों का प्रवर्तन), या **अंतरिम/संरक्षात्मक उपायों** के लिए, **तेलिन** में एस्टोनियाई न्यायालयों की विशेष क्षेत्राधिकार है, उपभोक्ता ग्राहक के अपने निवास स्थान के न्यायालयों में कार्यवाही लाने के अधिकार **पर प्रतिकूल प्रभाव डाले बिना**।

13.5. **पूर्व मध्यस्थता।** कोई भी मध्यस्थता या न्यायालय कार्यवाही शुरू करने से पहले, पक्षों को विवाद की लिखित सूचना से **तीस (30) दिनों** की अवधि के लिए **सद्भावपूर्ण बातचीत** के माध्यम से विवाद को सौहार्दपूर्ण ढंग से हल करने का प्रयास करने के लिए प्रोत्साहित किया जाता है।

13.6. **सीमा अवधि।** गैर-उपभोक्ता ग्राहक द्वारा SOS Expat के खिलाफ कोई भी कार्रवाई या दावा कार्रवाई का कारण उत्पन्न होने की तारीख से **एक (1) वर्ष** के भीतर लाया जाना चाहिए। उपभोक्ताओं पर लागू सीमा अवधि उनके निवास स्थान के अनिवार्य कानून द्वारा प्रदान की गई है।

---

## 14. समाप्ति/निलंबन और विविध

14.1. **निलंबन और बंद करना।** SOS Expat निम्नलिखित मामलों में तत्काल प्रभाव से ग्राहक के खाते को **अस्थायी रूप से निलंबित** या **स्थायी रूप से बंद** कर सकता है:
- (a) **धोखाधड़ी, पहचान चोरी या अवैध गतिविधि** का संदेह;
- (b) **शर्तों का उल्लंघन** या अपमानजनक व्यवहार;
- (c) **भुगतान न करना** या अपमानजनक भुगतान विवाद;
- (d) **अंतर्राष्ट्रीय प्रतिबंध सूची** में सूचीबद्ध होना;
- (e) **न्यायिक या प्रशासनिक प्राधिकरण** से अनुरोध;
- (f) कोई अन्य वैध सुरक्षा या अनुपालन कारण।
बंद होने की स्थिति में, लंबित बुकिंग रद्द और रिफंड की जा सकती हैं, ग्राहक की गलती के मामले को छोड़कर।

14.2. **ग्राहक द्वारा बंद करना।** ग्राहक किसी भी समय अपने व्यक्तिगत स्थान के माध्यम से या समर्थन से संपर्क करके अपना खाता बंद कर सकता है। बंद करने से पहले से उपभोग की गई सेवाओं के लिए कोई रिफंड नहीं मिलता।

14.3. **संपूर्णता।** ये शर्तें प्लेटफ़ॉर्म के उपयोग के लिए SOS Expat और ग्राहक के बीच पूर्ण समझौते का गठन करती हैं और किसी भी पूर्व समझौते को प्रतिस्थापित करती हैं।

14.4. **भाषाएं।** अनुवाद सूचनात्मक उद्देश्यों के लिए प्रदान किए जा सकते हैं; विसंगति की स्थिति में व्याख्या के लिए **अंग्रेजी प्रबल** होती है।

14.5. **आंशिक अमान्यता।** यदि कोई प्रावधान शून्य या अप्रवर्तनीय है, तो शेष प्रभावी रहता है; इसे समकक्ष प्रभाव के वैध खंड से प्रतिस्थापित किया जा सकता है।

14.6. **भौगोलिक विभाज्यता।** यदि इन शर्तों का कोई खंड किसी विशेष क्षेत्राधिकार में शून्य, अप्रवर्तनीय या अवैध घोषित किया जाता है, तो यह निर्णय **अन्य क्षेत्राधिकारों** में उसी खंड की **वैधता को प्रभावित नहीं करता** जहां यह वैध और प्रवर्तनीय रहता है।

14.7. **त्याग नहीं।** किसी अधिकार का प्रयोग न करना त्याग नहीं माना जाता।

14.8. **असाइनमेंट।** SOS Expat शर्तों को किसी समूह इकाई या उत्तराधिकारी को असाइन कर सकता है। ग्राहक SOS Expat की लिखित सहमति के बिना असाइन नहीं कर सकता।

14.9. **साक्ष्य।** SOS Expat और इसके प्रदाताओं की प्रणालियों में रखे गए कंप्यूटर रिकॉर्ड अन्यथा सिद्ध होने तक साक्ष्य के रूप में कार्य करते हैं।

14.5. **त्याग।** किसी अधिकार का उपयोग न करना त्याग नहीं है।

---

## 15. संपर्क

**संपर्क फ़ॉर्म (सहायता और कानूनी पूछताछ)**: **https://sos-expat.com/contact**
`;

  const defaultFr = `
# Conditions Générales d'Utilisation – Clients (Global)

**SOS Expat** est un service opéré par **WorldExpat OÜ**, société de droit estonien (registre des sociétés n° 16885621), dont le siège social est situé Harju maakond, Tallinn, Kesklinna linnaosa, Tornimäe tn 3/5/7, 10145, Estonie (la « **Plateforme** », « **SOS** », « **SOS Expat** », « **nous** »).

**Version 3.0 – Dernière mise à jour : 1er février 2026**

---

## 1. Objet et champ d’application

1.1. Les présentes conditions générales (« CGV ») régissent l’utilisation de la Plateforme par toute personne physique ou morale qui crée un compte client et réserve un service via la Plateforme (le « Client »).

1.2. **Rôle de SOS Expat.** SOS Expat est une plateforme de mise en relation : (i) avec des avocats indépendants (« Avocats »), et/ou (ii) avec des expatriés aidants indépendants (« Aidants »). SOS Expat n'est pas un cabinet d’avocats, ne fournit aucun conseil juridique, médical, fiscal ou réglementé, et n’est pas partie au contrat de prestation conclu entre le Client et le prestataire (Avocat/Aidant).

1.3. **Acceptation électronique (click-wrap).** En cochant la case d'acceptation et/ou en utilisant la Plateforme, le Client accepte les présentes CGU, ce qui constitue une signature électronique valide au sens du règlement **eIDAS (UE) n° 910/2014** et des législations nationales équivalentes.

1.4. **Traçabilité de l'acceptation.** SOS Expat conserve un journal d'audit horodaté (UTC) incluant : adresse IP, identifiant de session, agent utilisateur (user-agent), version des CGU, empreinte numérique (hash) du document accepté et identifiant unique du Client. Ces données constituent une **preuve recevable** de l'acceptation.

1.5. **Conservation des preuves.** Les journaux d'acceptation sont conservés pendant **dix (10) ans** après la dernière activité du Client ou la fermeture de son compte. Un certificat d'acceptation peut être délivré sur demande.

1.6. **Modifications.** Nous pouvons mettre à jour les CGU et/ou les tarifs/frais avec effet prospectif par publication sur la Plateforme. Toute modification substantielle affectant les droits ou obligations du Client sera notifiée et fera l'objet d'une **nouvelle acceptation** requise pour les Clients existants. La poursuite d'usage après notification vaut acceptation.

1.7. **Durée.** Les CGU sont conclues pour une durée indéterminée.

---

## 2. Comptes, éligibilité et usage

2.1. **Âge et capacité.** Le Client déclare avoir 18 ans révolus et la capacité juridique. Pour les personnes morales, l’utilisateur déclare être habilité à engager la société.

2.2. **Exactitude des informations.** Les informations fournies (identité, moyens de contact, pays, objet de la demande) doivent être exactes et à jour.

2.3. **Déclarations et garanties du Client.** En créant un compte et en utilisant la Plateforme, le Client déclare et garantit expressément que :
- (a) Il est **majeur** selon le droit de son pays de résidence (18 ans minimum ou âge de la majorité civile applicable) ;
- (b) Il dispose de la **pleine capacité juridique** pour contracter ;
- (c) Il n'est pas placé sous tutelle, curatelle, sauvegarde de justice ou tout régime équivalent de protection qui l'empêcherait de contracter ;
- (d) Il ne figure sur **aucune liste de sanctions internationales** (OFAC/SDN, UE, ONU, HMT, ou autre) ;
- (e) Toutes les informations fournies lors de l'inscription sont **exactes, complètes et à jour** ;
- (f) Il s'engage à **informer immédiatement** SOS Expat de tout changement affectant ces déclarations ;
- (g) Pour les **personnes morales** : le représentant dispose des pouvoirs nécessaires pour engager la société.
Toute fausse déclaration peut entraîner la suspension ou la fermeture du compte, sans préjudice de toute action en réparation.

2.4. **Usage conforme.** Le Client s'interdit toute utilisation illicite ou abusive (fraude, contenu illégal, harcèlement, atteinte aux droits de tiers, détournement des flux de paiement, usurpation d'identité, etc.). **SOS Expat n'est pas un service d'urgence** : aucun usage pour des situations médicales, vitales ou d'urgence immédiate.

2.5. **Sécurité du compte.** Le Client protège ses identifiants de connexion. Toute activité réalisée via son compte est réputée effectuée par lui. En cas de suspicion de compromission, le Client doit immédiatement modifier son mot de passe et en informer SOS Expat.

2.6. **Disponibilité.** La Plateforme est fournie « en l'état » : aucune disponibilité ininterrompue n'est garantie (maintenance, incidents, force majeure).

---

## 3. Nature des services réservables

3.1. **Appels avec Avocats.** Consultations courtes d’orientation (par ex. 20 minutes). L’Avocat demeure seul responsable de ses conseils et du respect de sa déontologie/lois locales.

3.2. **Appels avec Aidants.** Aide non réglementée (orientation pratique, traduction informelle, contacts locaux…). Aucun conseil juridique/médical/réglementé sans licence locale adéquate.

3.3. **Aucune garantie.** Nous ne garantissons ni l’issue, ni la qualité, ni l’adéquation à un besoin particulier, ni la disponibilité des prestataires.

---

## 4. Prix, devises et frais de mise en relation

4.1. **Affichage des prix.** Le prix total affiché au moment de la réservation comprend :
- (a) La **rémunération du Prestataire** (Avocat/Aidant) telle que définie dans l'offre présentée ;
- (b) Les **Frais de Mise en relation** dus à SOS Expat (forfait).
Le Client voit le **prix total TTC** avant de confirmer sa réservation.

4.2. **Frais de Mise en relation (forfait indicatif).** Les Frais de Mise en relation sont actuellement de **19 € (EUR)** ou **25 $ (USD)** par mise en relation. Ces montants sont **indicatifs** et peuvent être modifiés à tout moment par SOS Expat, avec effet prospectif. Des **barèmes locaux** par pays/devise peuvent être publiés. Le prix applicable est celui affiché au moment de la réservation.

4.3. **Devises & conversion.** Les prix peuvent être proposés en plusieurs devises. Des frais et taux de change du prestataire de paiement peuvent s'appliquer. Le Client est informé du montant exact dans sa devise avant confirmation.

4.4. **Taxes.** Les prix affichés incluent, le cas échéant, la TVA ou taxes applicables sur les Frais de Mise en relation. Les Prestataires demeurent responsables de leurs propres obligations fiscales.

4.5. **Transparence.** Aucun frais caché. Le prix affiché au moment de la réservation est le prix final, sauf frais de conversion de devise appliqués par le prestataire de paiement ou la banque du Client.

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

## 10. Données personnelles (GDPR / Protection des données)

10.1. **Responsable de traitement.** Pour les données strictement nécessaires à la mise en relation, **SOS Expat (WorldExpat OÜ)** et le **Prestataire** (Avocat/Aidant) agissent chacun en **responsable de traitement indépendant** pour leurs finalités respectives, conformément au **Règlement (UE) 2016/679 (GDPR)**.

10.2. **Données collectées.** SOS Expat collecte les données suivantes : identité, coordonnées, pays de résidence, objet de la demande, données de paiement (traitées par des prestataires tiers), données de connexion (IP, horodatage, appareil), historique des réservations.

10.3. **Bases légales & finalités.**
- **Exécution du contrat** : traitement de la réservation, mise en relation, paiement ;
- **Intérêts légitimes** : sécurité, prévention de la fraude, amélioration des services, statistiques anonymisées ;
- **Obligation légale** : conformité LCB-FT, sanctions, obligations fiscales ;
- **Consentement** : communications marketing (révocable à tout moment).

10.4. **Durée de conservation.** Les données sont conservées pendant la durée de la relation contractuelle, puis archivées pendant les durées légales de prescription (5 à 10 ans selon les données).

10.5. **Transferts internationaux.** Les données peuvent être transférées hors de l'Espace Économique Européen avec des **garanties appropriées** (clauses contractuelles types, décision d'adéquation, etc.).

10.6. **Droits du Client.** Le Client dispose des droits suivants : accès, rectification, effacement, limitation, portabilité, opposition. Exercice via le **formulaire de contact** de la Plateforme ou par email.

10.7. **Sécurité.** Mesures techniques et organisationnelles raisonnables (chiffrement, contrôle d'accès, audits). Notification des violations de données dans les **72 heures** conformément au GDPR.

10.8. **Conformité DSA.** La Plateforme opère en tant que **service intermédiaire** au sens du **Règlement (UE) 2022/2065 (Digital Services Act)**. SOS Expat met en œuvre des mécanismes de signalement des contenus illicites et coopère avec les autorités compétentes.

---

## 11. Propriété intellectuelle

La Plateforme, ses marques, logos, bases de données et contenus sont protégés. Aucun droit n’est cédé au Client. L’usage est strictement limité à un accès personnel conformément aux CGV.

---

## 12. Responsabilité et garanties

12.1. **Rôle exclusif de mise en relation.** SOS Expat est **exclusivement** une plateforme de mise en relation technique. SOS Expat :
- **N'est pas** un cabinet d'avocats, un cabinet de conseil, un prestataire de services juridiques, médicaux, fiscaux ou réglementés ;
- **N'est pas partie** au contrat entre le Client et le Prestataire (Avocat/Aidant) ;
- **Ne garantit pas** la qualité, l'exactitude, la légalité ou le résultat des conseils ou services fournis par les Prestataires ;
- **N'intervient pas** dans la fixation des honoraires des Prestataires (hors Frais de Mise en relation).

12.2. **Prestataires indépendants.** Les Avocats et Aidants sont des **professionnels indépendants**, seuls responsables de leurs conseils, services, et du respect de leurs obligations légales et déontologiques. SOS Expat **décline toute responsabilité** pour tout préjudice subi par le Client du fait des services d'un Prestataire.

12.3. **Limitation de responsabilité.** Dans la **mesure maximale permise par la loi applicable** et **sans préjudice des droits impératifs des consommateurs** :
- (a) La responsabilité totale de SOS Expat envers le Client est limitée aux **dommages directs** prouvés et **ne peut excéder** le prix total payé par le Client pour la réservation à l'origine de la réclamation ;
- (b) SOS Expat **n'est pas responsable** des dommages indirects, spéciaux, consécutifs, punitifs ou exemplaires (perte de chance, de profits, d'opportunités, atteinte à la réputation, préjudice moral, etc.).

12.4. **Aucune garantie.** La Plateforme est fournie « **en l'état** » et « **selon disponibilité** ». SOS Expat ne garantit pas :
- La disponibilité continue ou ininterrompue de la Plateforme ;
- L'absence d'erreurs, de bugs ou de failles de sécurité ;
- La disponibilité d'un Prestataire particulier ;
- L'adéquation des services à un besoin particulier du Client.

12.5. **Force majeure.** SOS Expat n'est pas responsable des retards ou défaillances causés par des événements de **force majeure** (catastrophe naturelle, guerre, pandémie, cyberattaque, panne électrique ou internet, décision gouvernementale, grève, etc.).

12.6. **Litiges Client-Prestataire.** Tout litige entre le Client et un Prestataire relève **exclusivement** de leur relation directe. SOS Expat **n'intervient pas** dans ces litiges et **ne peut être mis en cause** comme partie, garant ou médiateur.

---

## 13. Droit applicable, règlement des litiges et tribunaux compétents

13.1. **Droit applicable.**
- **Client non-consommateur (B2B)** : les présentes CGU sont régies **exclusivement** par le **droit estonien**, à l'exclusion de ses règles de conflit de lois.
- **Client consommateur (B2C)** : les CGU sont régies par le droit estonien, **sans priver le Client** des dispositions impératives de protection des consommateurs de son pays de résidence habituelle.

13.2. **Arbitrage CCI.**
- **Client non-consommateur (B2B)** : tout litige est tranché **définitivement** selon le Règlement d'Arbitrage de la **CCI (Chambre de Commerce Internationale)**. **Siège : Tallinn (Estonie)**. **Langue : ANGLAIS**. Un (1) arbitre. Procédure **confidentielle**.
- **Client consommateur (B2C)** : le Client a le **choix** entre l'arbitrage CCI (mêmes modalités) ou les juridictions compétentes en vertu des lois impératives de son lieu de résidence.

13.3. **Renonciation aux actions collectives et au jury.** Dans la **mesure maximale permise par la loi applicable** et **sans préjudice des droits impératifs des consommateurs** :
- (a) Toute action **collective, de groupe, représentative ou consolidée** est **exclue** ; seules les réclamations **individuelles** sont recevables ;
- (b) Le Client non-consommateur **renonce expressément au droit à un procès devant jury** (jury trial waiver).

13.4. **Compétence des tribunaux estoniens.** Pour toute demande **non arbitrable**, l'**exequatur** (exécution des sentences arbitrales) ou les **mesures provisoires/conservatoires**, les tribunaux estoniens sis à **Tallinn** ont compétence exclusive, **sans préjudice** du droit du Client consommateur de saisir les tribunaux de son lieu de résidence.

13.5. **Médiation préalable.** Avant toute saisine arbitrale ou judiciaire, les parties sont encouragées à tenter de résoudre le litige à l'amiable par **négociation de bonne foi** pendant un délai de **trente (30) jours** à compter de la notification écrite du différend.

13.6. **Prescription.** Toute action ou réclamation du Client non-consommateur contre SOS Expat doit être intentée dans un délai d'**un (1) an** à compter de la date à laquelle le fait générateur est survenu. Les délais de prescription applicables aux consommateurs sont ceux prévus par la loi impérative de leur lieu de résidence.

---

## 14. Résiliation/suspension et divers

14.1. **Suspension et fermeture.** SOS Expat peut **suspendre temporairement** ou **fermer définitivement** le compte du Client, avec effet immédiat, dans les cas suivants :
- (a) Soupçon de **fraude, usurpation d'identité ou activité illégale** ;
- (b) **Violation des CGU** ou comportement abusif ;
- (c) **Non-paiement** ou contestation de paiement abusive ;
- (d) Inscription sur une **liste de sanctions internationales** ;
- (e) Demande d'une **autorité judiciaire ou administrative** ;
- (f) Tout autre motif légitime de sécurité ou de conformité.
En cas de fermeture, les réservations en cours peuvent être annulées et remboursées, sauf faute du Client.

14.2. **Fermeture par le Client.** Le Client peut fermer son compte à tout moment via son espace personnel ou en contactant le support. La fermeture ne donne lieu à aucun remboursement des services déjà consommés.

14.3. **Intégralité.** Les CGU constituent l'accord complet entre SOS Expat et le Client pour l'usage de la Plateforme et remplacent tout accord antérieur.

14.4. **Langues.** Des traductions peuvent être fournies à titre informatif ; **l'anglais prévaut** pour l'interprétation en cas de divergence.

14.5. **Nullité partielle.** Si une stipulation est nulle ou inapplicable, le reste demeure en vigueur ; elle pourra être remplacée par une clause valide d'effet équivalent.

14.6. **Divisibilité géographique.** Si une clause des présentes CGU est déclarée nulle, inapplicable ou illégale dans une juridiction particulière, cette décision n'affecte **pas la validité** de cette même clause dans les **autres juridictions** où elle demeure licite et applicable.

14.7. **Non-renonciation.** Le fait de ne pas exercer un droit n'emporte pas renonciation.

14.8. **Cession.** SOS Expat peut céder les CGU à une entité de son groupe ou à un successeur. Le Client ne peut céder sans accord écrit de SOS Expat.

14.9. **Preuve.** Les registres informatiques conservés dans les systèmes de SOS Expat et de ses Prestataires font foi jusqu'à preuve contraire.

---

## 15. Contact

**Formulaire de contact (support & demandes légales)** : **https://sos-expat.com/contact**
`;

  const defaultEn = `
# Terms and Conditions – Clients (Global)

**SOS Expat** is a service operated by **WorldExpat OÜ**, a company incorporated under Estonian law (company registry no. 16885621), with its registered office at Harju maakond, Tallinn, Kesklinna linnaosa, Tornimäe tn 3/5/7, 10145, Estonia (the "**Platform**," "**SOS**," "**SOS Expat**," "**we**").

**Version 3.0 – Last updated: February 1, 2026**

---

## 1. Purpose and Scope

1.1. These general terms and conditions ("T&Cs") govern the use of the Platform by any individual or legal entity who creates a client account and books a service via the Platform (the "Client").

1.2. **Role of SOS Expat.** SOS Expat is a connection platform: (i) with independent lawyers ("Lawyers"), and/or (ii) with independent expat helpers ("Helpers"). SOS Expat is not a law firm, does not provide legal, medical, tax, or regulated advice, and is not a party to the service contract concluded between the Client and the provider (Lawyer/Helper).

1.3. **Electronic Acceptance (click-wrap).** By checking the acceptance box and/or using the Platform, the Client accepts these T&Cs, which constitutes a valid electronic signature within the meaning of **Regulation (EU) No 910/2014 (eIDAS)** and equivalent national legislation.

1.4. **Acceptance Traceability.** SOS Expat maintains a timestamped audit log (UTC) including: IP address, session identifier, user agent, T&Cs version, digital fingerprint (hash) of the accepted document, and unique Client identifier. This data constitutes **admissible evidence** of acceptance.

1.5. **Retention of Evidence.** Acceptance logs are retained for **ten (10) years** after the Client's last activity or account closure. A certificate of acceptance may be issued upon request.

1.6. **Changes.** We may update the T&Cs and/or prices/fees with prospective effect by posting on the Platform. Any substantial change affecting the Client's rights or obligations will be notified and will require **renewed acceptance** for existing Clients. Continued use after notification constitutes acceptance.

1.7. **Duration.** These T&Cs are concluded for an indefinite period.

---

## 2. Accounts, Eligibility, and Use

2.1. **Age and Capacity.** The Client declares they are at least 18 years old and legally competent. For legal entities, the user declares they are authorized to bind the company.

2.2. **Accuracy of Information.** Information provided (identity, contact methods, country, purpose of request) must be accurate and up-to-date.

2.3. **Client Declarations and Warranties.** By creating an account and using the Platform, the Client expressly declares and warrants that:
- (a) They are of **legal age** under the laws of their country of residence (minimum 18 years or applicable age of majority);
- (b) They have **full legal capacity** to enter into contracts;
- (c) They are not under guardianship, curatorship, judicial protection, or any equivalent protective regime that would prevent them from contracting;
- (d) They do not appear on **any international sanctions list** (OFAC/SDN, EU, UN, HMT, or other);
- (e) All information provided during registration is **accurate, complete, and up-to-date**;
- (f) They undertake to **immediately inform** SOS Expat of any change affecting these declarations;
- (g) For **legal entities**: the representative has the necessary authority to bind the company.
Any false declaration may result in suspension or closure of the account, without prejudice to any claim for damages.

2.4. **Proper Use.** The Client shall not engage in any unlawful or abusive use (fraud, illegal content, harassment, infringement of third-party rights, payment diversion, identity theft, etc.). **SOS Expat is not an emergency service**: no use for medical, life-threatening, or immediate emergency situations.

2.5. **Account Security.** The Client protects their login credentials. Any activity carried out via their account is deemed to have been performed by them. In case of suspected compromise, the Client must immediately change their password and inform SOS Expat.

2.6. **Availability.** The Platform is provided "as-is": uninterrupted availability is not guaranteed (maintenance, incidents, force majeure).

---

## 3. Nature of Bookable Services

3.1. **Calls with Lawyers.** Short orientation consultations (e.g., 20 minutes). The Lawyer remains solely responsible for their advice and compliance with their professional ethics/local laws.

3.2. **Calls with Helpers.** Unregulated assistance (practical guidance, informal translation, local contacts...). No legal/medical/regulated advice without appropriate local license.

3.3. **No Guarantee.** We do not guarantee outcome, quality, suitability for specific needs, or provider availability.

---

## 4. Prices, Currencies, and Connection Fees

4.1. **Price Display.** The total price shown at booking includes:
- (a) The **Provider's fee** (Lawyer/Helper) as defined in the presented offer;
- (b) The **Connection Fees** due to SOS Expat (flat fee).
The Client sees the **total price including taxes** before confirming their booking.

4.2. **Connection Fee (indicative flat rate).** Connection Fees are currently **EUR 19** or **USD 25** per connection. These amounts are **indicative** and may be modified at any time by SOS Expat, with prospective effect. **Local rates** by country/currency may be published. The applicable price is the one displayed at the time of booking.

4.3. **Currencies & Conversion.** Prices may be offered in multiple currencies. Payment provider fees and exchange rates may apply. The Client is informed of the exact amount in their currency before confirmation.

4.4. **Taxes.** Displayed prices include, where applicable, VAT or applicable taxes on the Connection Fees. Providers remain responsible for their own tax obligations.

4.5. **Transparency.** No hidden fees. The price displayed at the time of booking is the final price, except for currency conversion fees applied by the payment provider or the Client's bank.

---

## 5. Booking, Call, and Contact Attempts

5.1. **Definition of "Connection."** Connection is deemed to have occurred when: (a) Client–Provider contact information is transmitted, and/or (b) a call/messaging/video channel is opened via the Platform, and/or (c) the Provider accepts a Client request.

5.2. **Call Attempts.** For immediate calls: the Platform makes up to three (3) attempts within approximately 15 minutes (unless stated otherwise in-app).

5.3. **Provider Unavailability.** If no connection could be established after the attempts, the booking is canceled and the Client is fully refunded the total price paid.

5.4. **Client Non-Response.** If connection has occurred (per 5.1) but the Client does not achieve an effective exchange (no answer, busy, refusal, premature termination), payment remains due and non-refundable.

5.5. **Communication Quality.** The Client must be in an area with sufficient coverage and use compatible equipment. SOS is not responsible for third-party network interruptions.

---

## 6. Right of Withdrawal (Consumers) & Immediate Execution

6.1. **Information.** If the Client is a consumer and local mandatory law provides a right of withdrawal, it may be exercised within legal deadlines unless the Client requests immediate execution of the service.

6.2. **Waiver.** By booking an immediate or scheduled call before the legal deadline expires, the Client requests immediate execution and acknowledges that, once the service is fully performed, they lose their right of withdrawal. In case of partial execution before withdrawal, the Client must pay for the portion already provided and the connection fee, which are non-refundable.

6.3. **Formality.** The Platform collects explicit acceptance of these points at booking, when required.

---

## 7. Payment, Security, Chargebacks

7.1. **Single Payment & Allocation.** The Client makes a single payment via the Platform covering (i) the Provider's share and (ii) the connection fee. SOS (or its payment provider) collects, deducts its fees, and transfers the balance to the Provider.

7.2. **Security.** Payments are processed by third-party payment providers. KYC/AML controls may apply.

7.3. **Chargebacks/Disputes.** In case of payment dispute, SOS may provide strictly necessary data to the payment provider and suspend related services/payments.

7.4. **Compensation.** If a refund is granted to the Client, the corresponding share is deducted from the relevant provider; SOS may offset against future payments.

---

## 8. Cancellations and Refunds

8.1. **General.** Except for mandatory legal provisions:
- connection fees are non-refundable once the connection occurs (5.1);
- provider fees are non-refundable once the service starts, unless waived by the Provider as a commercial gesture.

8.2. **Client Cancellation Before Connection.** Full refund.

8.3. **Provider Cancellation.** Full refund. SOS may offer rerouting to another available provider.

8.4. **Technical Issues Attributable to SOS.** Refund or re-credit at SOS discretion, to the extent permitted by law.

---

## 9. Behavior, Security, and Content

9.1. **Respect.** The Client agrees to behave respectfully, not record or share exchanges without legally required consent, and not solicit illegal acts.

9.2. **Provided Content.** Information provided must be honest, accurate, and lawful. The Client indemnifies SOS and the Provider against claims related to illegal content they provide.

9.3. **Reporting.** Any abuse can be reported via the contact form.

---

## 10. Personal Data (GDPR / Data Protection)

10.1. **Data Controller.** For data strictly necessary for connection, **SOS Expat (WorldExpat OÜ)** and the **Provider** (Lawyer/Helper) each act as **independent data controllers** for their respective purposes, in accordance with **Regulation (EU) 2016/679 (GDPR)**.

10.2. **Data Collected.** SOS Expat collects the following data: identity, contact details, country of residence, purpose of request, payment data (processed by third-party providers), connection data (IP, timestamp, device), booking history.

10.3. **Legal Bases & Purposes.**
- **Contract performance**: booking processing, connection, payment;
- **Legitimate interests**: security, fraud prevention, service improvement, anonymized statistics;
- **Legal obligation**: AML/CFT compliance, sanctions, tax obligations;
- **Consent**: marketing communications (revocable at any time).

10.4. **Retention Period.** Data is retained for the duration of the contractual relationship, then archived for legal limitation periods (5 to 10 years depending on the data).

10.5. **International Transfers.** Data may be transferred outside the European Economic Area with **appropriate safeguards** (standard contractual clauses, adequacy decision, etc.).

10.6. **Client Rights.** The Client has the following rights: access, rectification, erasure, restriction, portability, objection. Exercise via the Platform's **contact form** or by email.

10.7. **Security.** Reasonable technical and organizational measures (encryption, access control, audits). Data breach notification within **72 hours** in accordance with GDPR.

10.8. **DSA Compliance.** The Platform operates as an **intermediary service** within the meaning of **Regulation (EU) 2022/2065 (Digital Services Act)**. SOS Expat implements mechanisms for reporting illegal content and cooperates with competent authorities.

---

## 11. Intellectual Property

The Platform, its trademarks, logos, databases, and content are protected. No rights are transferred to the Client. Use is strictly limited to personal access in accordance with the T&Cs.

---

## 12. Liability and Warranties

12.1. **Connection Role Only.** SOS Expat is **exclusively** a technical connection platform. SOS Expat:
- **Is not** a law firm, consulting firm, or provider of legal, medical, tax, or regulated services;
- **Is not a party** to the contract between the Client and the Provider (Lawyer/Helper);
- **Does not guarantee** the quality, accuracy, legality, or outcome of advice or services provided by Providers;
- **Does not intervene** in setting Provider fees (other than Connection Fees).

12.2. **Independent Providers.** Lawyers and Helpers are **independent professionals**, solely responsible for their advice, services, and compliance with their legal and ethical obligations. SOS Expat **disclaims all liability** for any damage suffered by the Client as a result of a Provider's services.

12.3. **Limitation of Liability.** To the **maximum extent permitted by applicable law** and **without prejudice to mandatory consumer rights**:
- (a) SOS Expat's total liability to the Client is limited to **proven direct damages** and **shall not exceed** the total price paid by the Client for the booking giving rise to the claim;
- (b) SOS Expat **is not liable** for indirect, special, consequential, punitive, or exemplary damages (loss of chance, profits, opportunities, reputational harm, moral damages, etc.).

12.4. **No Warranty.** The Platform is provided "**as is**" and "**as available**." SOS Expat does not guarantee:
- Continuous or uninterrupted availability of the Platform;
- Absence of errors, bugs, or security vulnerabilities;
- Availability of any particular Provider;
- Suitability of services for the Client's particular needs.

12.5. **Force Majeure.** SOS Expat is not liable for delays or failures caused by **force majeure** events (natural disaster, war, pandemic, cyberattack, power or internet outage, government decision, strike, etc.).

12.6. **Client-Provider Disputes.** Any dispute between the Client and a Provider is **exclusively** a matter of their direct relationship. SOS Expat **does not intervene** in such disputes and **cannot be held liable** as a party, guarantor, or mediator.

---

## 13. Governing Law, Dispute Resolution, and Competent Courts

13.1. **Governing Law.**
- **Non-consumer Client (B2B)**: these T&Cs are governed **exclusively** by **Estonian law**, excluding its conflict of laws rules.
- **Consumer Client (B2C)**: the T&Cs are governed by Estonian law, **without depriving the Client** of the mandatory consumer protection provisions of their country of habitual residence.

13.2. **ICC Arbitration.**
- **Non-consumer Client (B2B)**: any dispute shall be **finally settled** under the Rules of Arbitration of the **ICC (International Chamber of Commerce)**. **Seat: Tallinn (Estonia)**. **Language: ENGLISH**. One (1) arbitrator. **Confidential** proceedings.
- **Consumer Client (B2C)**: the Client has the **choice** between ICC arbitration (same terms) or the competent courts under mandatory laws of their place of residence.

13.3. **Waiver of Class Actions and Jury Trial.** To the **maximum extent permitted by applicable law** and **without prejudice to mandatory consumer rights**:
- (a) Any **class, collective, representative, or consolidated action** is **excluded**; only **individual** claims are admissible;
- (b) Non-consumer Clients **expressly waive the right to a jury trial** (jury trial waiver).

13.4. **Estonian Courts Jurisdiction.** For any **non-arbitrable claim**, **exequatur** (enforcement of arbitral awards), or **interim/conservatory measures**, Estonian courts in **Tallinn** have exclusive jurisdiction, **without prejudice** to the consumer Client's right to bring proceedings before the courts of their place of residence.

13.5. **Prior Mediation.** Before initiating any arbitration or court proceedings, the parties are encouraged to attempt to resolve the dispute amicably through **good faith negotiation** for a period of **thirty (30) days** from written notice of the dispute.

13.6. **Limitation Period.** Any action or claim by a non-consumer Client against SOS Expat must be brought within **one (1) year** from the date the cause of action arose. Limitation periods applicable to consumers are those provided by the mandatory law of their place of residence.

---

## 14. Termination/Suspension and Miscellaneous

14.1. **Suspension and Closure.** SOS Expat may **temporarily suspend** or **permanently close** the Client's account, with immediate effect, in the following cases:
- (a) Suspicion of **fraud, identity theft, or illegal activity**;
- (b) **Violation of T&Cs** or abusive behavior;
- (c) **Non-payment** or abusive payment dispute;
- (d) Listing on an **international sanctions list**;
- (e) Request from a **judicial or administrative authority**;
- (f) Any other legitimate security or compliance reason.
In case of closure, pending bookings may be canceled and refunded, except in case of Client fault.

14.2. **Closure by Client.** The Client may close their account at any time via their personal space or by contacting support. Closure does not entitle the Client to any refund for services already consumed.

14.3. **Entire Agreement.** These T&Cs constitute the complete agreement between SOS Expat and the Client for use of the Platform and supersede any prior agreement.

14.4. **Languages.** Translations may be provided for information purposes; **English prevails** for interpretation in case of discrepancy.

14.5. **Partial Invalidity.** If a provision is void or unenforceable, the remainder remains in force; it may be replaced by a valid clause of equivalent effect.

14.6. **Geographic Severability.** If a clause of these T&Cs is declared void, unenforceable, or illegal in a particular jurisdiction, this decision **does not affect the validity** of that same clause in **other jurisdictions** where it remains lawful and enforceable.

14.7. **No Waiver.** Failure to exercise a right does not constitute waiver.

14.8. **Assignment.** SOS Expat may assign the T&Cs to a group entity or successor. The Client may not assign without SOS Expat's written consent.

14.9. **Evidence.** Computer records maintained in SOS Expat's and its Providers' systems constitute evidence until proven otherwise.

---

## 15. Contact

**Contact Form (Support & Legal Requests):** **https://sos-expat.com/contact**
`;

  const defaultEs = `
# Condiciones Generales de Uso – Clientes (Global)

**SOS Expat** es un servicio operado por **WorldExpat OÜ**, sociedad de derecho estonio (registro mercantil n.º 16885621), con domicilio social en Harju maakond, Tallinn, Kesklinna linnaosa, Tornimäe tn 3/5/7, 10145, Estonia (la "**Plataforma**", "**SOS**", "**SOS Expat**", "**nosotros**").

**Versión 3.0 – Última actualización: 1 de febrero de 2026**

---

## 1. Objeto y ámbito de aplicación

1.1. Estas condiciones generales ("CG") regulan el uso de la Plataforma por cualquier persona física o jurídica que cree una cuenta de cliente y reserve un servicio a través de la Plataforma (el "Cliente").

1.2. **Rol de SOS Expat.** SOS Expat es una plataforma de intermediación: (i) con abogados independientes ("Abogados"), y/o (ii) con ayudantes expatriados independientes ("Ayudantes"). SOS Expat no es un despacho de abogados, no proporciona asesoramiento jurídico, médico, fiscal o regulado, y no es parte del contrato de prestación celebrado entre el Cliente y el prestador (Abogado/Ayudante).

1.3. **Aceptación electrónica (click-wrap).** Al marcar la casilla de aceptación y/o utilizar la Plataforma, el Cliente acepta las presentes CG, lo que constituye una firma electrónica válida en el sentido del **Reglamento (UE) n.º 910/2014 (eIDAS)** y legislaciones nacionales equivalentes.

1.4. **Trazabilidad de la aceptación.** SOS Expat conserva un registro de auditoría con marca temporal (UTC) que incluye: dirección IP, identificador de sesión, agente de usuario (user-agent), versión de las CG, huella digital (hash) del documento aceptado e identificador único del Cliente. Estos datos constituyen **prueba admisible** de la aceptación.

1.5. **Conservación de pruebas.** Los registros de aceptación se conservan durante **diez (10) años** tras la última actividad del Cliente o el cierre de su cuenta. Se podrá expedir un certificado de aceptación a solicitud.

1.6. **Modificaciones.** Podemos actualizar las CG y/o los precios/tarifas con efecto prospectivo mediante publicación en la Plataforma. Cualquier modificación sustancial que afecte a los derechos u obligaciones del Cliente será notificada y requerirá **nueva aceptación** para los Clientes existentes. La continuación del uso tras la notificación implica aceptación.

1.7. **Duración.** Las CG se celebran por tiempo indefinido.

---

## 2. Cuentas, elegibilidad y uso

2.1. **Edad y capacidad.** El Cliente declara tener 18 años cumplidos y capacidad jurídica plena. Para personas jurídicas, el usuario declara estar autorizado para obligar a la empresa.

2.2. **Exactitud de la información.** La información proporcionada (identidad, medios de contacto, país, objeto de la solicitud) debe ser exacta y estar actualizada.

2.3. **Declaraciones y garantías del Cliente.** Al crear una cuenta y utilizar la Plataforma, el Cliente declara y garantiza expresamente que:
- (a) Es **mayor de edad** según la legislación de su país de residencia (mínimo 18 años o la mayoría de edad civil aplicable);
- (b) Posee **plena capacidad jurídica** para contratar;
- (c) No está sometido a tutela, curatela, salvaguardia judicial ni ningún régimen equivalente de protección que le impida contratar;
- (d) No figura en **ninguna lista de sanciones internacionales** (OFAC/SDN, UE, ONU, HMT u otras);
- (e) Toda la información facilitada durante el registro es **exacta, completa y actualizada**;
- (f) Se compromete a **informar inmediatamente** a SOS Expat de cualquier cambio que afecte a estas declaraciones;
- (g) Para **personas jurídicas**: el representante dispone de los poderes necesarios para obligar a la sociedad.
Cualquier declaración falsa puede dar lugar a la suspensión o cierre de la cuenta, sin perjuicio de cualquier acción de indemnización.

2.4. **Uso conforme.** El Cliente se abstendrá de cualquier uso ilícito o abusivo (fraude, contenido ilegal, acoso, vulneración de derechos de terceros, desvío de flujos de pago, suplantación de identidad, etc.). **SOS Expat no es un servicio de emergencias**: no se permite su uso para situaciones médicas, vitales o de emergencia inmediata.

2.5. **Seguridad de la cuenta.** El Cliente protege sus credenciales de acceso. Toda actividad realizada a través de su cuenta se considera efectuada por él. En caso de sospecha de compromiso, el Cliente debe cambiar inmediatamente su contraseña e informar a SOS Expat.

2.6. **Disponibilidad.** La Plataforma se proporciona "tal cual": no se garantiza disponibilidad ininterrumpida (mantenimiento, incidentes, fuerza mayor).

---

## 3. Naturaleza de los servicios reservables

3.1. **Llamadas con Abogados.** Consultas breves de orientación (p. ej., 20 minutos). El Abogado es el único responsable de sus consejos y del cumplimiento de su deontología y leyes locales.

3.2. **Llamadas con Ayudantes.** Asistencia no regulada (orientación práctica, traducción informal, contactos locales…). No se proporciona asesoramiento jurídico, médico o regulado sin la licencia local adecuada.

3.3. **Sin garantía.** No garantizamos el resultado, la calidad, la adecuación a una necesidad particular ni la disponibilidad de los prestadores.

---

## 4. Precios, divisas y tarifas de intermediación

4.1. **Visualización de precios.** El precio total mostrado en el momento de la reserva incluye:
- (a) La **remuneración del Prestador** (Abogado/Ayudante) según la oferta presentada;
- (b) Las **Tarifas de Intermediación** debidas a SOS Expat (forfait).
El Cliente ve el **precio total con impuestos incluidos** antes de confirmar su reserva.

4.2. **Tarifa de Intermediación (forfait indicativo).** Las Tarifas de Intermediación son actualmente de **19 EUR** o **25 USD** por intermediación. Estos importes son **indicativos** y pueden ser modificados en cualquier momento por SOS Expat, con efecto prospectivo. Podrán publicarse **tarifas locales** por país/divisa. El precio aplicable es el mostrado en el momento de la reserva.

4.3. **Divisas y conversión.** Los precios pueden ofrecerse en varias divisas. Pueden aplicarse comisiones y tipos de cambio del proveedor de pago. El Cliente es informado del importe exacto en su divisa antes de la confirmación.

4.4. **Impuestos.** Los precios mostrados incluyen, en su caso, el IVA u otros impuestos aplicables sobre las Tarifas de Intermediación. Los Prestadores siguen siendo responsables de sus propias obligaciones fiscales.

4.5. **Transparencia.** Sin cargos ocultos. El precio mostrado en el momento de la reserva es el precio final, salvo comisiones de conversión de divisa aplicadas por el proveedor de pago o el banco del Cliente.

---

## 5. Reserva, llamada e intentos de contacto

5.1. **Definición de "intermediación".** Se considera realizada: (a) la transmisión de los datos de contacto Cliente–Prestador, y/o (b) la apertura por la Plataforma de un canal de llamada/mensajería/vídeo, y/o (c) la aceptación por el Prestador de una solicitud del Cliente.

5.2. **Intentos de llamada.** En caso de llamada inmediata: la Plataforma realiza hasta tres (3) intentos en un período de aproximadamente 15 minutos (salvo indicación diferente en la app).

5.3. **Indisponibilidad del prestador.** Si no se ha podido realizar ninguna intermediación tras los intentos, la reserva se cancela y el Cliente recibe el reembolso íntegro del precio total pagado.

5.4. **No respuesta del Cliente.** Si la intermediación se ha producido (según 5.1) pero el Cliente no logra un intercambio efectivo (no contesta, ocupado, rechazo, interrupción prematura), el pago sigue siendo debido y no es reembolsable.

5.5. **Calidad de la comunicación.** El Cliente debe encontrarse en una zona con cobertura suficiente y utilizar un equipo compatible. SOS no es responsable de cortes o redes de terceros.

---

## 6. Derecho de desistimiento (consumidores) y ejecución inmediata

6.1. **Información.** Si el Cliente es consumidor y la ley imperativa local prevé un derecho de desistimiento, este podrá ejercerse dentro de los plazos legales, salvo que el Cliente solicite la ejecución inmediata del servicio.

6.2. **Renuncia.** Al reservar una llamada inmediata o programada antes de que expire el plazo legal, el Cliente solicita la ejecución inmediata y reconoce que, una vez prestado el servicio en su totalidad, pierde su derecho de desistimiento. En caso de ejecución parcial antes del desistimiento, el Cliente debe pagar la parte ya prestada y las tarifas de intermediación, no reembolsables.

6.3. **Formalidad.** La Plataforma recoge la aceptación explícita de estos puntos al realizar la reserva, cuando sea necesario.

---

## 7. Pago, seguridad y devoluciones de cargo

7.1. **Pago único y distribución.** El Cliente realiza un pago único a través de la Plataforma que cubre (i) la parte del Prestador y (ii) las tarifas de intermediación. SOS (o su proveedor de pago) cobra, deduce sus comisiones y transfiere el saldo al Prestador.

7.2. **Seguridad.** Los pagos se procesan a través de proveedores de pago externos. Pueden aplicarse controles KYC/PBC-FT.

7.3. **Devoluciones de cargo/disputas.** En caso de disputa de pago, SOS puede facilitar al proveedor de pago los datos estrictamente necesarios y suspender servicios/pagos relacionados.

7.4. **Compensación.** Si se concede un reembolso al Cliente, la parte correspondiente se deduce del prestador implicado; SOS puede compensar en sus pagos futuros.

---

## 8. Cancelaciones y reembolsos

8.1. **General.** Salvo disposiciones legales imperativas:
- las tarifas de intermediación no son reembolsables una vez realizada la intermediación (5.1);
- la parte del Prestador no es reembolsable una vez iniciada la prestación, salvo gesto comercial del Prestador.

8.2. **Cancelación por el Cliente antes de la intermediación.** Reembolso íntegro.

8.3. **Cancelación por el Prestador.** Reembolso íntegro. SOS puede ofrecer redirigir a otro prestador disponible.

8.4. **Problemas técnicos imputables a SOS.** Reembolso o recrédito a discreción de SOS, en la medida permitida por la ley.

---

## 9. Comportamiento, seguridad y contenidos

9.1. **Respeto.** El Cliente se compromete a comportarse respetuosamente, a no grabar ni difundir el intercambio sin el consentimiento legalmente requerido, y a no solicitar actos ilegales.

9.2. **Contenidos proporcionados.** La información transmitida debe ser leal, exacta y lícita. El Cliente garantiza a SOS y al Prestador frente a cualquier reclamación relacionada con contenidos ilegales que proporcione.

9.3. **Denuncia.** Cualquier abuso puede denunciarse a través del formulario de contacto.

---

## 10. Datos personales (RGPD / Protección de datos)

10.1. **Responsable del tratamiento.** Para los datos estrictamente necesarios para la intermediación, **SOS Expat (WorldExpat OÜ)** y el **Prestador** (Abogado/Ayudante) actúan cada uno como **responsable del tratamiento independiente** para sus respectivas finalidades, de conformidad con el **Reglamento (UE) 2016/679 (RGPD)**.

10.2. **Datos recogidos.** SOS Expat recoge los siguientes datos: identidad, datos de contacto, país de residencia, objeto de la solicitud, datos de pago (tratados por proveedores externos), datos de conexión (IP, marca temporal, dispositivo), historial de reservas.

10.3. **Bases jurídicas y finalidades.**
- **Ejecución del contrato**: tratamiento de la reserva, intermediación, pago;
- **Intereses legítimos**: seguridad, prevención del fraude, mejora de los servicios, estadísticas anonimizadas;
- **Obligación legal**: cumplimiento PBC-FT, sanciones, obligaciones fiscales;
- **Consentimiento**: comunicaciones comerciales (revocable en cualquier momento).

10.4. **Plazo de conservación.** Los datos se conservan durante la relación contractual y posteriormente se archivan durante los plazos legales de prescripción (de 5 a 10 años según los datos).

10.5. **Transferencias internacionales.** Los datos pueden transferirse fuera del Espacio Económico Europeo con **garantías adecuadas** (cláusulas contractuales tipo, decisión de adecuación, etc.).

10.6. **Derechos del Cliente.** El Cliente dispone de los siguientes derechos: acceso, rectificación, supresión, limitación, portabilidad, oposición. Ejercicio a través del **formulario de contacto** de la Plataforma o por correo electrónico.

10.7. **Seguridad.** Medidas técnicas y organizativas razonables (cifrado, control de acceso, auditorías). Notificación de violaciones de datos en las **72 horas** de conformidad con el RGPD.

10.8. **Conformidad DSA.** La Plataforma opera como **servicio intermediario** en el sentido del **Reglamento (UE) 2022/2065 (Ley de Servicios Digitales)**. SOS Expat implementa mecanismos de notificación de contenidos ilícitos y coopera con las autoridades competentes.

---

## 11. Propiedad intelectual

La Plataforma, sus marcas, logotipos, bases de datos y contenidos están protegidos. No se cede ningún derecho al Cliente. El uso se limita estrictamente a un acceso personal conforme a las CG.

---

## 12. Responsabilidad y garantías

12.1. **Rol exclusivo de intermediación.** SOS Expat es **exclusivamente** una plataforma de intermediación técnica. SOS Expat:
- **No es** un despacho de abogados, gabinete de consultoría, ni prestador de servicios jurídicos, médicos, fiscales o regulados;
- **No es parte** del contrato entre el Cliente y el Prestador (Abogado/Ayudante);
- **No garantiza** la calidad, exactitud, legalidad o resultado de los consejos o servicios prestados por los Prestadores;
- **No interviene** en la fijación de los honorarios de los Prestadores (salvo las Tarifas de Intermediación).

12.2. **Prestadores independientes.** Los Abogados y Ayudantes son **profesionales independientes**, únicos responsables de sus consejos, servicios y del cumplimiento de sus obligaciones legales y deontológicas. SOS Expat **declina toda responsabilidad** por cualquier perjuicio sufrido por el Cliente como consecuencia de los servicios de un Prestador.

12.3. **Limitación de responsabilidad.** En la **máxima medida permitida por la ley aplicable** y **sin perjuicio de los derechos imperativos de los consumidores**:
- (a) La responsabilidad total de SOS Expat frente al Cliente se limita a los **daños directos** probados y **no podrá exceder** el precio total pagado por el Cliente por la reserva origen de la reclamación;
- (b) SOS Expat **no es responsable** de daños indirectos, especiales, consecuentes, punitivos o ejemplares (pérdida de oportunidad, beneficios, oportunidades, daño reputacional, daño moral, etc.).

12.4. **Sin garantía.** La Plataforma se proporciona "**tal cual**" y "**según disponibilidad**". SOS Expat no garantiza:
- La disponibilidad continua o ininterrumpida de la Plataforma;
- La ausencia de errores, fallos o vulnerabilidades de seguridad;
- La disponibilidad de un Prestador en particular;
- La adecuación de los servicios a una necesidad particular del Cliente.

12.5. **Fuerza mayor.** SOS Expat no es responsable de retrasos o fallos causados por eventos de **fuerza mayor** (catástrofe natural, guerra, pandemia, ciberataque, corte eléctrico o de internet, decisión gubernamental, huelga, etc.).

12.6. **Litigios Cliente-Prestador.** Cualquier litigio entre el Cliente y un Prestador es **exclusivamente** asunto de su relación directa. SOS Expat **no interviene** en dichos litigios y **no puede ser demandado** como parte, garante o mediador.

---

## 13. Ley aplicable, resolución de litigios y tribunales competentes

13.1. **Ley aplicable.**
- **Cliente no consumidor (B2B)**: las presentes CG se rigen **exclusivamente** por el **derecho estonio**, con exclusión de sus normas de conflicto de leyes.
- **Cliente consumidor (B2C)**: las CG se rigen por el derecho estonio, **sin privar al Cliente** de las disposiciones imperativas de protección de los consumidores de su país de residencia habitual.

13.2. **Arbitraje CCI.**
- **Cliente no consumidor (B2B)**: todo litigio será resuelto **definitivamente** conforme al Reglamento de Arbitraje de la **CCI (Cámara de Comercio Internacional)**. **Sede: Tallinn (Estonia)**. **Idioma: INGLÉS**. Un (1) árbitro. Procedimiento **confidencial**.
- **Cliente consumidor (B2C)**: el Cliente tiene la **opción** de elegir entre el arbitraje CCI (mismas condiciones) o los tribunales competentes en virtud de las leyes imperativas de su lugar de residencia.

13.3. **Renuncia a acciones colectivas y al jurado.** En la **máxima medida permitida por la ley aplicable** y **sin perjuicio de los derechos imperativos de los consumidores**:
- (a) Queda **excluida** toda acción **colectiva, de grupo, representativa o consolidada**; solo son admisibles las reclamaciones **individuales**;
- (b) El Cliente no consumidor **renuncia expresamente al derecho a un juicio con jurado** (jury trial waiver).

13.4. **Competencia de los tribunales estonios.** Para cualquier demanda **no arbitrable**, el **exequátur** (ejecución de laudos arbitrales) o las **medidas provisionales/cautelares**, los tribunales estonios de **Tallinn** tienen competencia exclusiva, **sin perjuicio** del derecho del Cliente consumidor a acudir a los tribunales de su lugar de residencia.

13.5. **Mediación previa.** Antes de iniciar cualquier procedimiento arbitral o judicial, se anima a las partes a intentar resolver el litigio de forma amistosa mediante **negociación de buena fe** durante un plazo de **treinta (30) días** a partir de la notificación escrita del conflicto.

13.6. **Prescripción.** Toda acción o reclamación del Cliente no consumidor contra SOS Expat debe interponerse en un plazo de **un (1) año** a partir de la fecha en que se produjo el hecho generador. Los plazos de prescripción aplicables a los consumidores son los previstos por la ley imperativa de su lugar de residencia.

---

## 14. Resolución/suspensión y disposiciones diversas

14.1. **Suspensión y cierre.** SOS Expat puede **suspender temporalmente** o **cerrar definitivamente** la cuenta del Cliente, con efecto inmediato, en los siguientes casos:
- (a) Sospecha de **fraude, suplantación de identidad o actividad ilegal**;
- (b) **Incumplimiento de las CG** o comportamiento abusivo;
- (c) **Impago** o disputa de pago abusiva;
- (d) Inclusión en una **lista de sanciones internacionales**;
- (e) Solicitud de una **autoridad judicial o administrativa**;
- (f) Cualquier otro motivo legítimo de seguridad o cumplimiento normativo.
En caso de cierre, las reservas en curso podrán cancelarse y reembolsarse, salvo culpa del Cliente.

14.2. **Cierre por el Cliente.** El Cliente puede cerrar su cuenta en cualquier momento desde su espacio personal o contactando con el soporte. El cierre no da derecho a ningún reembolso de los servicios ya consumidos.

14.3. **Integridad.** Las CG constituyen el acuerdo completo entre SOS Expat y el Cliente para el uso de la Plataforma y sustituyen cualquier acuerdo anterior.

14.4. **Idiomas.** Pueden proporcionarse traducciones a título informativo; **el inglés prevalece** para la interpretación en caso de discrepancia.

14.5. **Nulidad parcial.** Si una estipulación es nula o inaplicable, el resto permanece en vigor; podrá ser sustituida por una cláusula válida de efecto equivalente.

14.6. **Divisibilidad geográfica.** Si una cláusula de las presentes CG es declarada nula, inaplicable o ilegal en una jurisdicción particular, dicha decisión **no afecta a la validez** de esa misma cláusula en las **demás jurisdicciones** donde siga siendo lícita y aplicable.

14.7. **No renuncia.** El hecho de no ejercer un derecho no implica renuncia.

14.8. **Cesión.** SOS Expat puede ceder las CG a una entidad de su grupo o a un sucesor. El Cliente no puede ceder sin el consentimiento escrito de SOS Expat.

14.9. **Prueba.** Los registros informáticos conservados en los sistemas de SOS Expat y de sus Prestadores hacen fe hasta prueba en contrario.

---

## 15. Contacto

**Formulario de contacto (soporte y solicitudes legales):** **https://sos-expat.com/contact**
`;

  const defaultDe = `
# Allgemeine Nutzungsbedingungen – Kunden (Global)

**SOS Expat** ist ein Dienst, der von **WorldExpat OÜ** betrieben wird, einer Gesellschaft estnischen Rechts (Handelsregister Nr. 16885621) mit Sitz in Harju maakond, Tallinn, Kesklinna linnaosa, Tornimäe tn 3/5/7, 10145, Estland (die "**Plattform**", "**SOS**", "**SOS Expat**", "**wir**").

**Version 3.0 – Letzte Aktualisierung: 1. Februar 2026**

---

## 1. Zweck und Anwendungsbereich

1.1. Diese Allgemeinen Geschäftsbedingungen („AGB") regeln die Nutzung der Plattform durch jede natürliche oder juristische Person, die ein Kundenkonto erstellt und über die Plattform eine Dienstleistung bucht (der „Kunde").

1.2. **Rolle von SOS Expat.** SOS Expat ist eine Vermittlungsplattform: (i) zu unabhängigen Anwälten („Anwälte") und/oder (ii) zu unabhängigen Expat-Helfern („Helfer"). SOS Expat ist keine Anwaltskanzlei, bietet keine rechtliche, medizinische, steuerliche oder regulierte Beratung an und ist nicht Vertragspartei des Dienstleistungsvertrags zwischen dem Kunden und dem Anbieter (Anwalt/Helfer).

1.3. **Elektronische Annahme (Click-wrap).** Durch Anklicken des Zustimmungsfelds und/oder Nutzung der Plattform akzeptiert der Kunde diese AGB, was eine gültige elektronische Signatur im Sinne der **Verordnung (EU) Nr. 910/2014 (eIDAS)** und gleichwertiger nationaler Rechtsvorschriften darstellt.

1.4. **Nachverfolgbarkeit der Annahme.** SOS Expat führt ein mit Zeitstempel (UTC) versehenes Prüfprotokoll, das Folgendes umfasst: IP-Adresse, Sitzungskennung, User-Agent, AGB-Version, digitaler Fingerabdruck (Hash) des akzeptierten Dokuments und eindeutige Kundenkennung. Diese Daten stellen einen **zulässigen Nachweis** der Annahme dar.

1.5. **Aufbewahrung von Nachweisen.** Die Annahmeprotokolle werden **zehn (10) Jahre** nach der letzten Aktivität des Kunden oder der Kontoschließung aufbewahrt. Auf Anfrage kann eine Annahmebestätigung ausgestellt werden.

1.6. **Änderungen.** Wir können die AGB und/oder Preise/Gebühren mit Wirkung für die Zukunft durch Veröffentlichung auf der Plattform aktualisieren. Jede wesentliche Änderung, die die Rechte oder Pflichten des Kunden betrifft, wird mitgeteilt und erfordert eine **erneute Zustimmung** bestehender Kunden. Die fortgesetzte Nutzung nach Benachrichtigung gilt als Zustimmung.

1.7. **Laufzeit.** Diese AGB werden auf unbestimmte Zeit geschlossen.

---

## 2. Konten, Berechtigung und Nutzung

2.1. **Alter und Geschäftsfähigkeit.** Der Kunde erklärt, dass er mindestens 18 Jahre alt und voll geschäftsfähig ist. Bei juristischen Personen erklärt der Nutzer, dass er befugt ist, das Unternehmen zu vertreten.

2.2. **Richtigkeit der Angaben.** Die bereitgestellten Informationen (Identität, Kontaktdaten, Land, Zweck der Anfrage) müssen korrekt und aktuell sein.

2.3. **Erklärungen und Garantien des Kunden.** Durch Erstellung eines Kontos und Nutzung der Plattform erklärt und garantiert der Kunde ausdrücklich, dass:
- (a) Er nach dem Recht seines Wohnsitzlandes **volljährig** ist (mindestens 18 Jahre oder das geltende Volljährigkeitsalter);
- (b) Er die **volle Geschäftsfähigkeit** zum Vertragsabschluss besitzt;
- (c) Er nicht unter Vormundschaft, Pflegschaft, gerichtlichem Schutz oder einem vergleichbaren Schutzregime steht, das ihn am Vertragsabschluss hindern würde;
- (d) Er auf **keiner internationalen Sanktionsliste** steht (OFAC/SDN, EU, UN, HMT oder andere);
- (e) Alle bei der Registrierung bereitgestellten Informationen **korrekt, vollständig und aktuell** sind;
- (f) Er sich verpflichtet, SOS Expat **unverzüglich** über jede Änderung zu informieren, die diese Erklärungen betrifft;
- (g) Bei **juristischen Personen**: der Vertreter über die erforderlichen Befugnisse verfügt, das Unternehmen zu binden.
Falsche Angaben können zur Aussetzung oder Schließung des Kontos führen, unbeschadet etwaiger Schadensersatzansprüche.

2.4. **Ordnungsgemäße Nutzung.** Der Kunde unterlässt jede rechtswidrige oder missbräuchliche Nutzung (Betrug, illegale Inhalte, Belästigung, Verletzung von Rechten Dritter, Umleitung von Zahlungsströmen, Identitätsdiebstahl usw.). **SOS Expat ist kein Notdienst**: keine Nutzung für medizinische, lebensbedrohliche oder unmittelbare Notfallsituationen.

2.5. **Kontosicherheit.** Der Kunde schützt seine Zugangsdaten. Jede über sein Konto durchgeführte Aktivität gilt als von ihm ausgeführt. Bei Verdacht auf Kompromittierung muss der Kunde unverzüglich sein Passwort ändern und SOS Expat informieren.

2.6. **Verfügbarkeit.** Die Plattform wird „wie besehen" bereitgestellt: eine unterbrechungsfreie Verfügbarkeit wird nicht garantiert (Wartung, Störungen, höhere Gewalt).

---

## 3. Art der buchbaren Dienstleistungen

3.1. **Anwaltliche Beratung.** Kurze Beratungen (z. B. 20 Minuten). Der Anwalt ist allein verantwortlich für seine Ratschläge und die Einhaltung beruflicher und gesetzlicher Vorschriften.

3.2. **Helfer-Dienstleistungen.** Unqualifizierte Unterstützung (praktische Hilfe, informelle Übersetzungen, lokale Kontakte etc.). Rechts-, medizinische oder regulierte Beratung wird nur von lizenzierten Fachkräften bereitgestellt.

3.3. **Keine Garantie.** Wir übernehmen keine Garantie für Ergebnisse, Qualität, Eignung für bestimmte Bedürfnisse oder Verfügbarkeit der Dienstleister.

---

## 4. Preise, Währungen und Vermittlungsgebühr

4.1. **Preisangabe.** Der Gesamtpreis bei Buchung umfasst: (i) die Vergütung des Dienstleisters (Anwalt/Helfer) laut Angebot und (ii) die Vermittlungsgebühr von SOS (fest).

4.2. **Vermittlungsgebühr (fest).** 19 € (EUR) oder 25 $ (USD) pro Vermittlung (ohne Steuern), im Gesamtpreis enthalten. SOS kann diese Gebühr ändern und/oder lokale Tarife je nach Land/Währung veröffentlichen.

4.3. **Währungen und Umrechnung.** Preise können in unterschiedlichen Währungen angezeigt werden. Gebühren/Kurse des Zahlungsanbieters können anfallen.

4.4. **Steuern.** Angezeigte Preise enthalten, sofern zutreffend, Mehrwertsteuer oder andere Steuern auf die Vermittlungsgebühr. Dienstleister sind für ihre steuerlichen Pflichten selbst verantwortlich.

4.5. **Transparenz.** Keine versteckten Gebühren. Der zum Zeitpunkt der Buchung angezeigte Preis ist der Endpreis, ausgenommen Währungsumrechnungsgebühren des Zahlungsanbieters oder der Bank des Kunden.

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

## 10. Personenbezogene Daten (DSGVO / Datenschutz)

10.1. **Verantwortlicher.** Für die zur Vermittlung zwingend erforderlichen Daten handeln **SOS Expat (WorldExpat OÜ)** und der **Dienstleister** (Anwalt/Helfer) jeweils als **eigenständige Verantwortliche** für ihre jeweiligen Zwecke, gemäß der **Verordnung (EU) 2016/679 (DSGVO)**.

10.2. **Erhobene Daten.** SOS Expat erhebt folgende Daten: Identität, Kontaktdaten, Wohnsitzland, Zweck der Anfrage, Zahlungsdaten (werden von Drittanbietern verarbeitet), Verbindungsdaten (IP, Zeitstempel, Gerät), Buchungsverlauf.

10.3. **Rechtsgrundlagen und Zwecke.**
- **Vertragserfüllung**: Bearbeitung der Buchung, Vermittlung, Zahlung;
- **Berechtigte Interessen**: Sicherheit, Betrugsprävention, Verbesserung der Dienste, anonymisierte Statistiken;
- **Gesetzliche Verpflichtung**: Einhaltung von Geldwäscheprävention, Sanktionen, steuerliche Pflichten;
- **Einwilligung**: Marketingkommunikation (jederzeit widerrufbar).

10.4. **Speicherdauer.** Die Daten werden für die Dauer der Vertragsbeziehung gespeichert und anschließend für die gesetzlichen Verjährungsfristen archiviert (je nach Datenart 5 bis 10 Jahre).

10.5. **Internationale Übermittlungen.** Daten können mit **angemessenen Garantien** (Standardvertragsklauseln, Angemessenheitsbeschluss usw.) außerhalb des Europäischen Wirtschaftsraums übermittelt werden.

10.6. **Rechte des Kunden.** Der Kunde hat folgende Rechte: Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch. Ausübung über das **Kontaktformular** der Plattform oder per E-Mail.

10.7. **Sicherheit.** Angemessene technische und organisatorische Maßnahmen (Verschlüsselung, Zugriffskontrolle, Audits). Benachrichtigung bei Datenschutzverletzungen innerhalb von **72 Stunden** gemäß DSGVO.

10.8. **DSA-Konformität.** Die Plattform fungiert als **Vermittlungsdienst** im Sinne der **Verordnung (EU) 2022/2065 (Gesetz über digitale Dienste)**. SOS Expat setzt Mechanismen zur Meldung rechtswidriger Inhalte um und arbeitet mit den zuständigen Behörden zusammen.

---

## 11. Geistiges Eigentum

Die Plattform, Marken, Logos, Datenbanken und Inhalte sind geschützt. Keine Rechte werden auf den Kunden übertragen. Nutzung beschränkt auf persönlichen Zugang gemäß AGB.

---

## 12. Haftung und Gewährleistung

12.1. **Ausschließliche Vermittlerrolle.** SOS Expat ist **ausschließlich** eine technische Vermittlungsplattform. SOS Expat:
- **Ist keine** Anwaltskanzlei, Beratungsfirma oder Anbieter von rechtlichen, medizinischen, steuerlichen oder regulierten Dienstleistungen;
- **Ist nicht Vertragspartei** des Vertrags zwischen dem Kunden und dem Dienstleister (Anwalt/Helfer);
- **Garantiert nicht** die Qualität, Richtigkeit, Rechtmäßigkeit oder das Ergebnis der von Dienstleistern erbrachten Beratungen oder Leistungen;
- **Greift nicht** in die Festsetzung der Honorare der Dienstleister ein (außer der Vermittlungsgebühr).

12.2. **Unabhängige Dienstleister.** Anwälte und Helfer sind **unabhängige Fachleute**, die allein für ihre Beratung, Dienstleistungen und die Einhaltung ihrer rechtlichen und berufsständischen Pflichten verantwortlich sind. SOS Expat **lehnt jede Haftung** für Schäden ab, die dem Kunden durch die Leistungen eines Dienstleisters entstehen.

12.3. **Haftungsbeschränkung.** Im **maximal nach geltendem Recht zulässigen Umfang** und **unbeschadet zwingender Verbraucherrechte**:
- (a) Die Gesamthaftung von SOS Expat gegenüber dem Kunden ist auf **nachgewiesene direkte Schäden** beschränkt und **darf den Gesamtpreis nicht übersteigen**, den der Kunde für die den Anspruch begründende Buchung gezahlt hat;
- (b) SOS Expat **haftet nicht** für indirekte, spezielle, Folge-, Straf- oder exemplarische Schäden (entgangene Chancen, Gewinne, Geschäftsmöglichkeiten, Rufschädigung, immaterielle Schäden usw.).

12.4. **Keine Gewährleistung.** Die Plattform wird „**wie besehen**" und „**nach Verfügbarkeit**" bereitgestellt. SOS Expat gewährleistet nicht:
- Die kontinuierliche oder unterbrechungsfreie Verfügbarkeit der Plattform;
- Die Fehlerfreiheit, das Fehlen von Bugs oder Sicherheitslücken;
- Die Verfügbarkeit eines bestimmten Dienstleisters;
- Die Eignung der Dienste für einen bestimmten Bedarf des Kunden.

12.5. **Höhere Gewalt.** SOS Expat haftet nicht für Verzögerungen oder Ausfälle, die durch Ereignisse **höherer Gewalt** verursacht werden (Naturkatastrophen, Krieg, Pandemie, Cyberangriff, Strom- oder Internetausfall, behördliche Entscheidungen, Streik usw.).

12.6. **Streitigkeiten zwischen Kunde und Dienstleister.** Jede Streitigkeit zwischen dem Kunden und einem Dienstleister ist **ausschließlich** Angelegenheit ihrer direkten Beziehung. SOS Expat **greift nicht** in solche Streitigkeiten ein und **kann nicht** als Partei, Garant oder Vermittler in Anspruch genommen werden.

---

## 13. Anwendbares Recht, Streitbeilegung und Gerichtsbarkeit

13.1. **Anwendbares Recht.**
- **Nicht-Verbraucher-Kunde (B2B)**: Diese AGB unterliegen **ausschließlich** dem **estnischen Recht**, unter Ausschluss seiner Kollisionsnormen.
- **Verbraucher-Kunde (B2C)**: Die AGB unterliegen estnischem Recht, **ohne den Kunden** der zwingenden Verbraucherschutzbestimmungen seines gewöhnlichen Aufenthaltslandes zu berauben.

13.2. **ICC-Schiedsverfahren.**
- **Nicht-Verbraucher-Kunde (B2B)**: Jede Streitigkeit wird **endgültig entschieden** nach der Schiedsgerichtsordnung der **ICC (Internationale Handelskammer)**. **Sitz: Tallinn (Estland)**. **Sprache: ENGLISCH**. Ein (1) Schiedsrichter. **Vertrauliches** Verfahren.
- **Verbraucher-Kunde (B2C)**: Der Kunde hat die **Wahl** zwischen ICC-Schiedsverfahren (gleiche Bedingungen) oder den nach den zwingenden Gesetzen seines Wohnorts zuständigen Gerichten.

13.3. **Verzicht auf Sammelklagen und Geschworenengerichte.** Im **maximal nach geltendem Recht zulässigen Umfang** und **unbeschadet zwingender Verbraucherrechte**:
- (a) Jede **Sammel-, Gruppen-, Vertreter- oder konsolidierte Klage** ist **ausgeschlossen**; nur **individuelle** Ansprüche sind zulässig;
- (b) Nicht-Verbraucher-Kunden **verzichten ausdrücklich auf das Recht auf ein Geschworenengericht** (jury trial waiver).

13.4. **Zuständigkeit estnischer Gerichte.** Für **nicht schiedsfähige Ansprüche**, **Exequatur** (Vollstreckung von Schiedssprüchen) oder **einstweilige/sichernde Maßnahmen** sind estnische Gerichte in **Tallinn** ausschließlich zuständig, **unbeschadet** des Rechts des Verbraucher-Kunden, vor den Gerichten seines Wohnorts zu klagen.

13.5. **Vorherige Mediation.** Vor Einleitung eines Schieds- oder Gerichtsverfahrens werden die Parteien ermutigt, die Streitigkeit gütlich durch **Verhandlung in gutem Glauben** innerhalb von **dreißig (30) Tagen** ab schriftlicher Mitteilung der Streitigkeit beizulegen.

13.6. **Verjährung.** Jede Klage oder Forderung eines Nicht-Verbraucher-Kunden gegen SOS Expat muss innerhalb von **einem (1) Jahr** ab dem Zeitpunkt erhoben werden, zu dem der anspruchsbegründende Sachverhalt eingetreten ist. Die für Verbraucher geltenden Verjährungsfristen sind die des zwingenden Rechts ihres Wohnorts.

---

## 14. Kündigung/Aussetzung und Verschiedenes

14.1. **Aussetzung und Schließung.** SOS Expat kann das Konto des Kunden mit sofortiger Wirkung **vorübergehend aussetzen** oder **dauerhaft schließen** in folgenden Fällen:
- (a) Verdacht auf **Betrug, Identitätsdiebstahl oder illegale Aktivität**;
- (b) **Verstoß gegen die AGB** oder missbräuchliches Verhalten;
- (c) **Nichtzahlung** oder missbräuchliche Zahlungsstreitigkeit;
- (d) Aufnahme in eine **internationale Sanktionsliste**;
- (e) Ersuchen einer **Justiz- oder Verwaltungsbehörde**;
- (f) Jeder andere legitime Sicherheits- oder Compliance-Grund.
Bei Schließung können laufende Buchungen storniert und erstattet werden, außer bei Verschulden des Kunden.

14.2. **Schließung durch den Kunden.** Der Kunde kann sein Konto jederzeit über seinen persönlichen Bereich oder durch Kontaktaufnahme mit dem Support schließen. Die Schließung berechtigt nicht zur Erstattung bereits verbrauchter Dienstleistungen.

14.3. **Vollständigkeit.** Diese AGB stellen die vollständige Vereinbarung zwischen SOS Expat und dem Kunden für die Nutzung der Plattform dar und ersetzen jede frühere Vereinbarung.

14.4. **Sprachen.** Übersetzungen können zu Informationszwecken bereitgestellt werden; **Englisch ist maßgeblich** für die Auslegung bei Abweichungen.

14.5. **Teilnichtigkeit.** Ist eine Bestimmung nichtig oder undurchsetzbar, bleibt der Rest in Kraft; sie kann durch eine gültige Klausel mit gleichwertiger Wirkung ersetzt werden.

14.6. **Geografische Teilbarkeit.** Wird eine Klausel dieser AGB in einer bestimmten Rechtsordnung für nichtig, undurchsetzbar oder rechtswidrig erklärt, **berührt diese Entscheidung nicht die Gültigkeit** derselben Klausel in **anderen Rechtsordnungen**, in denen sie rechtmäßig und durchsetzbar bleibt.

14.7. **Kein Verzicht.** Das Nichtausüben eines Rechts stellt keinen Verzicht dar.

14.8. **Abtretung.** SOS Expat kann die AGB an ein Konzernunternehmen oder einen Rechtsnachfolger abtreten. Der Kunde darf ohne schriftliche Zustimmung von SOS Expat nicht abtreten.

14.9. **Beweis.** Die in den Systemen von SOS Expat und seinen Anbietern gespeicherten Computeraufzeichnungen dienen bis zum Beweis des Gegenteils als Nachweis.

---

## 15. Kontakt

**Kontaktformular (Support & rechtliche Anfragen):** **https://sos-expat.com/contact**
`;

  const defaultRu = `
# Общие условия использования – Клиенты (Глобальные)

**SOS Expat** — это сервис, управляемый компанией **WorldExpat OÜ**, зарегистрированной по эстонскому праву (регистрационный номер компании 16885621), с юридическим адресом: Harju maakond, Tallinn, Kesklinna linnaosa, Tornimäe tn 3/5/7, 10145, Эстония («**Платформа**», «**SOS**», «**SOS Expat**», «**мы**»)

**Версия 3.0 – Последнее обновление: 1 февраля 2026 г.**

---

## 1. Цель и область применения

1.1. Настоящие общие условия («ОУ») регулируют использование Платформы любым физическим или юридическим лицом, которое создаёт учётную запись клиента и бронирует услугу через Платформу (далее — «Клиент»).

1.2. **Роль SOS Expat.** SOS Expat является платформой для соединения: (i) с независимыми юристами («Юристы») и/или (ii) с независимыми помощниками для экспатов («Помощники»). SOS Expat не является юридической фирмой, не предоставляет юридические, медицинские, налоговые или регулируемые консультации и не является стороной договора между Клиентом и поставщиком (Юрист/Помощник).

1.3. **Электронное согласие (click-wrap).** Отмечая галочку согласия и/или используя Платформу, Клиент принимает настоящие ОУ, что является действительной электронной подписью в соответствии с **Регламентом eIDAS (ЕС) № 910/2014** и эквивалентным национальным законодательством.

1.4. **Отслеживание принятия.** SOS Expat ведёт журнал аудита с временными метками (UTC), включающий: IP-адрес, идентификатор сессии, user-agent, версию ОУ, цифровой отпечаток (хэш) принятого документа и уникальный идентификатор Клиента. Эти данные являются **допустимым доказательством** принятия.

1.5. **Хранение доказательств.** Журналы принятия хранятся в течение **десяти (10) лет** после последней активности Клиента или закрытия его учётной записи. По запросу может быть выдан сертификат принятия.

1.6. **Изменения.** Мы можем обновлять ОУ и/или тарифы/комиссии с перспективным действием через публикацию на Платформе. Любое существенное изменение, затрагивающее права или обязанности Клиента, будет уведомлено и потребует **нового согласия** для существующих Клиентов.

1.7. **Срок действия.** ОУ заключаются на неопределённый срок.

---

## 2. Учётные записи, соответствие требованиям и использование

2.1. **Возраст и дееспособность.** Клиент заявляет, что ему/ей не менее 18 лет и он/она обладает полной дееспособностью. Для юридических лиц пользователь подтверждает, что имеет полномочия связывать компанию.

2.2. **Точность информации.** Предоставленная информация (личность, контактные данные, страна, цель запроса) должна быть точной и актуальной.

2.3. **Заявления и гарантии Клиента.** Создавая учётную запись и используя Платформу, Клиент прямо заявляет и гарантирует, что:
- (a) Является **совершеннолетним** по законодательству страны проживания (минимум 18 лет);
- (b) Обладает **полной дееспособностью** для заключения договоров;
- (c) Не находится под опекой, попечительством или иной формой защиты;
- (d) Не включён в **какие-либо международные санкционные списки** (OFAC/SDN, ЕС, ООН, HMT или иные);
- (e) Вся информация, предоставленная при регистрации, является **точной, полной и актуальной**;
- (f) Обязуется **немедленно уведомить** SOS Expat о любых изменениях этих заявлений;
- (g) Для **юридических лиц**: представитель имеет необходимые полномочия.
Любое ложное заявление может повлечь приостановку или закрытие учётной записи.

2.4. **Надлежащее использование.** Клиент не должен использовать Платформу незаконно или злоумышленно (мошенничество, незаконный контент, домогательства, хищение личных данных и т.д.). **SOS Expat не является службой экстренной помощи**.

2.5. **Безопасность учётной записи.** Клиент защищает свои учётные данные. Любая активность через его учётную запись считается совершённой им.

2.6. **Доступность.** Платформа предоставляется «как есть»: непрерывная доступность не гарантируется.

---

## 3. Характер услуг, доступных для бронирования

3.1. **Консультации с юристами.** Краткие консультации (например, 20 минут). Юрист несёт полную ответственность за свои советы и соблюдение профессиональной этики и местного законодательства.

3.2. **Консультации с помощниками.** Неквалифицированная поддержка (практическая помощь, неформальный перевод, контакты на месте и др.). Юридические, медицинские или регулируемые консультации предоставляются только при наличии соответствующей лицензии.

3.3. **Без гарантии.** Мы не гарантируем результаты, качество, соответствие конкретным потребностям или доступность поставщиков услуг.

---

## 4. Цены, валюты и комиссия за соединение

4.1. **Отображение цен.** Общая цена, отображаемая при бронировании, включает:
- (a) **Вознаграждение Поставщика** (Юриста/Помощника), определённое в представленном предложении;
- (b) **Комиссию за соединение**, причитающуюся SOS Expat (фиксированная).
Клиент видит **общую цену с учётом налогов** до подтверждения бронирования.

4.2. **Комиссия за соединение (ориентировочная фиксированная ставка).** Комиссия за соединение в настоящее время составляет **19 € (EUR)** или **25 $ (USD)** за соединение. Эти суммы являются **ориентировочными** и могут быть изменены SOS Expat в любое время с перспективным действием. Могут публиковаться **местные тарифы** по странам/валютам. Применимая цена — та, что отображается на момент бронирования.

4.3. **Валюты и конвертация.** Цены могут предлагаться в нескольких валютах. Могут применяться комиссии и курсы обмена платёжного провайдера. Клиент информируется о точной сумме в своей валюте до подтверждения.

4.4. **Налоги.** Отображаемые цены включают, где применимо, НДС или применимые налоги на комиссию за соединение. Поставщики остаются ответственными за свои собственные налоговые обязательства.

4.5. **Прозрачность.** Никаких скрытых сборов. Цена, отображаемая при бронировании, является окончательной ценой, за исключением комиссий за конвертацию валюты, применяемых платёжным провайдером или банком Клиента.

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

## 10. Персональные данные (GDPR / Защита данных)

10.1. **Контролёр данных.** Для данных, строго необходимых для соединения, **SOS Expat (WorldExpat OÜ)** и **Поставщик** (Юрист/Помощник) действуют как **независимые контролёры данных** для своих соответствующих целей, в соответствии с **Регламентом (ЕС) 2016/679 (GDPR)**.

10.2. **Собираемые данные.** SOS Expat собирает следующие данные: личность, контактные данные, страна проживания, цель запроса, платёжные данные (обрабатываются сторонними провайдерами), данные о подключении (IP, временная метка, устройство), история бронирований.

10.3. **Правовые основания и цели.**
- **Исполнение договора**: обработка бронирования, соединение, оплата;
- **Законные интересы**: безопасность, предотвращение мошенничества, улучшение сервиса, анонимизированная статистика;
- **Юридическое обязательство**: соблюдение AML/CFT, санкции, налоговые обязательства;
- **Согласие**: маркетинговые сообщения (отзываемые в любое время).

10.4. **Срок хранения.** Данные хранятся в течение срока договорных отношений, затем архивируются на период законных сроков давности (от 5 до 10 лет в зависимости от данных).

10.5. **Международные передачи.** Данные могут передаваться за пределы Европейской экономической зоны с **соответствующими гарантиями** (стандартные договорные положения, решение об адекватности и т.д.).

10.6. **Права Клиента.** Клиент имеет следующие права: доступ, исправление, удаление, ограничение, переносимость, возражение. Реализация через **форму обратной связи** на Платформе или по электронной почте.

10.7. **Безопасность.** Разумные технические и организационные меры (шифрование, контроль доступа, аудит). Уведомление о нарушении данных в течение **72 часов** в соответствии с GDPR.

10.8. **Соответствие DSA.** Платформа функционирует как **посреднический сервис** в смысле **Регламента (ЕС) 2022/2065 (Закон о цифровых услугах)**. SOS Expat внедряет механизмы для сообщения о незаконном контенте и сотрудничает с компетентными органами.

---

## 11. Интеллектуальная собственность

Платформа, её бренды, логотипы, базы данных и контент защищены. Права Клиенту не передаются. Использование ограничено личным доступом согласно ОУ.

---

## 12. Ответственность

12.1. **Исключительно роль соединения.** SOS Expat **исключительно** является технической платформой для соединения. SOS Expat:
- **Не является** юридической фирмой, консалтинговой компанией или поставщиком юридических, медицинских, налоговых или регулируемых услуг;
- **Не является стороной** договора между Клиентом и Поставщиком (Юристом/Помощником);
- **Не гарантирует** качество, точность, законность или результат консультаций или услуг, предоставляемых Поставщиками;
- **Не вмешивается** в установление гонораров Поставщиков (кроме Комиссии за соединение).

12.2. **Независимые поставщики.** Юристы и Помощники являются **независимыми профессионалами**, несущими полную ответственность за свои консультации, услуги и соблюдение своих юридических и этических обязательств. SOS Expat **отказывается от всякой ответственности** за любой ущерб, понесённый Клиентом в результате услуг Поставщика.

12.3. **Ограничение ответственности.** В **максимально допустимой применимым законом степени** и **без ущерба обязательным правам потребителей**:
- (a) Общая ответственность SOS Expat перед Клиентом ограничивается **доказанным прямым ущербом** и **не может превышать** общую цену, уплаченную Клиентом за бронирование, послужившее основанием для претензии;
- (b) SOS Expat **не несёт ответственности** за косвенный, специальный, последующий, штрафной или примерный ущерб (упущенные возможности, прибыль, репутационный ущерб, моральный вред и т.д.).

12.4. **Отсутствие гарантий.** Платформа предоставляется «**как есть**» и «**по мере доступности**». SOS Expat не гарантирует:
- Непрерывную или бесперебойную доступность Платформы;
- Отсутствие ошибок, багов или уязвимостей безопасности;
- Доступность какого-либо конкретного Поставщика;
- Пригодность услуг для конкретных потребностей Клиента.

12.5. **Форс-мажор.** SOS Expat не несёт ответственности за задержки или сбои, вызванные **форс-мажорными** обстоятельствами (стихийное бедствие, война, пандемия, кибератака, отключение электричества или интернета, правительственное решение, забастовка и т.д.).

12.6. **Споры Клиент-Поставщик.** Любой спор между Клиентом и Поставщиком является **исключительно** предметом их прямых отношений. SOS Expat **не вмешивается** в такие споры и **не может быть привлечён к ответственности** в качестве стороны, гаранта или посредника.

---

## 13. Применимое право, разрешение споров и компетентные суды

13.1. **Применимое право.**
- **Клиент не потребитель (B2B)**: настоящие ОУ регулируются **исключительно** **эстонским правом**, исключая его коллизионные нормы.
- **Клиент-потребитель (B2C)**: ОУ регулируются эстонским правом, **без лишения Клиента** обязательных положений о защите прав потребителей его страны обычного проживания.

13.2. **Арбитраж ICC.**
- **Клиент не потребитель (B2B)**: любой спор разрешается **окончательно** в соответствии с Регламентом арбитража **ICC (Международная торговая палата)**. **Место: Таллинн (Эстония)**. **Язык: АНГЛИЙСКИЙ**. Один (1) арбитр. **Конфиденциальное** разбирательство.
- **Клиент-потребитель (B2C)**: Клиент имеет **выбор** между арбитражем ICC (те же условия) или компетентными судами в соответствии с императивными законами его места проживания.

13.3. **Отказ от коллективных исков и суда присяжных.** В **максимально допустимой применимым законом степени** и **без ущерба обязательным правам потребителей**:
- (a) Любой **коллективный, групповой, представительский или объединённый иск** **исключается**; допускаются только **индивидуальные** претензии;
- (b) Клиенты не потребители **прямо отказываются от права на суд присяжных** (отказ от суда присяжных).

13.4. **Юрисдикция эстонских судов.** Для любых **неарбитрабельных требований**, **экзекватуры** (исполнения арбитражных решений) или **обеспечительных/предварительных мер** эстонские суды в **Таллинне** имеют исключительную юрисдикцию, **без ущерба** праву Клиента-потребителя обращаться в суды по месту его проживания.

13.5. **Предварительная медиация.** До начала арбитражного или судебного разбирательства стороны поощряются попытаться разрешить спор мирным путём посредством **добросовестных переговоров** в течение **тридцати (30) дней** с момента письменного уведомления о споре.

13.6. **Срок давности.** Любой иск или претензия Клиента не потребителя против SOS Expat должны быть предъявлены в течение **одного (1) года** с даты возникновения основания для иска. Сроки давности, применимые к потребителям, устанавливаются императивным законодательством их места проживания.

---

## 14. Прекращение/приостановка и прочее

14.1. **Приостановка и закрытие.** SOS Expat может **временно приостановить** или **окончательно закрыть** учётную запись Клиента с немедленным вступлением в силу в следующих случаях:
- (a) Подозрение в **мошенничестве, краже личных данных или незаконной деятельности**;
- (b) **Нарушение ОУ** или злоупотребительное поведение;
- (c) **Неоплата** или злоупотребительное оспаривание платежа;
- (d) Включение в **международный санкционный список**;
- (e) Запрос от **судебного или административного органа**;
- (f) Любая другая законная причина безопасности или соответствия.
В случае закрытия ожидающие бронирования могут быть отменены и возвращены, за исключением случаев вины Клиента.

14.2. **Закрытие Клиентом.** Клиент может закрыть свою учётную запись в любое время через личный кабинет или обратившись в службу поддержки. Закрытие не даёт права на возврат средств за уже потреблённые услуги.

14.3. **Полнота.** Настоящие ОУ составляют полное соглашение между SOS Expat и Клиентом об использовании Платформы и заменяют любое предшествующее соглашение.

14.4. **Языки.** Переводы могут предоставляться в информационных целях; **английский язык имеет приоритет** для толкования в случае расхождений.

14.5. **Частичная недействительность.** Если положение является недействительным или неисполнимым, остальная часть остаётся в силе; оно может быть заменено действительным положением эквивалентного эффекта.

14.6. **Географическая делимость.** Если положение настоящих ОУ признано недействительным, неисполнимым или незаконным в конкретной юрисдикции, это решение **не влияет на действительность** того же положения в **других юрисдикциях**, где оно остаётся законным и исполнимым.

14.7. **Отсутствие отказа.** Неиспользование права не означает отказ от него.

14.8. **Уступка.** SOS Expat может уступить ОУ аффилированной компании или правопреемнику. Клиент не может уступить без письменного согласия SOS Expat.

14.9. **Доказательства.** Компьютерные записи, хранящиеся в системах SOS Expat и его Поставщиков, служат доказательством до тех пор, пока не доказано обратное.

---

## 15. Контакты

**Форма обратной связи (поддержка и юридические запросы):** **https://sos-expat.com/contact**
`;

const defaultPt = `
# Condições Gerais de Utilização – Clientes (Global)

**SOS Expat** é um serviço operado pela **WorldExpat OÜ**, sociedade de direito estoniano (registro comercial n.º 16885621), com sede em Harju maakond, Tallinn, Kesklinna linnaosa, Tornimäe tn 3/5/7, 10145, Estônia (a "**Plataforma**", "**SOS**", "**SOS Expat**", "**nós**")


**Versão 3.0 – Última atualização: 1 de fevereiro de 2026**


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

4.1. **Exibição de preços.** O preço total exibido no momento da reserva inclui:
- (a) A **remuneração do Prestador** (Advogado/Assistente) conforme definida na oferta apresentada;
- (b) As **Taxas de Conexão** devidas à SOS Expat (taxa fixa).
O Cliente vê o **preço total com impostos** antes de confirmar sua reserva.

4.2. **Taxas de conexão (taxa fixa indicativa).** As Taxas de Conexão são atualmente de **19 € (EUR)** ou **25 $ (USD)** por conexão. Esses valores são **indicativos** e podem ser modificados a qualquer momento pela SOS Expat, com efeito prospectivo. **Tarifas locais** por país/moeda podem ser publicadas. O preço aplicável é o exibido no momento da reserva.

4.3. **Moedas e conversão.** Os preços podem ser oferecidos em várias moedas. Taxas e câmbio do processador de pagamento podem se aplicar. O Cliente é informado do valor exato em sua moeda antes da confirmação.

4.4. **Impostos.** Os preços exibidos incluem, quando aplicável, IVA ou impostos aplicáveis nas Taxas de Conexão. Os Prestadores permanecem responsáveis por suas próprias obrigações fiscais.

4.5. **Transparência.** Nenhuma taxa oculta. O preço exibido no momento da reserva é o preço final, exceto taxas de conversão de moeda aplicadas pelo processador de pagamento ou banco do Cliente.

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


## 10. Dados pessoais (GDPR / Proteção de dados)

10.1. **Responsável pelo tratamento.** Para dados estritamente necessários para a conexão, **SOS Expat (WorldExpat OÜ)** e o **Prestador** (Advogado/Assistente) atuam cada um como **responsável pelo tratamento independente** para seus respectivos fins, em conformidade com o **Regulamento (UE) 2016/679 (GDPR)**.

10.2. **Dados coletados.** SOS Expat coleta os seguintes dados: identidade, detalhes de contato, país de residência, finalidade da solicitação, dados de pagamento (processados por provedores terceiros), dados de conexão (IP, timestamp, dispositivo), histórico de reservas.

10.3. **Bases legais e finalidades.**
- **Execução do contrato**: processamento de reserva, conexão, pagamento;
- **Interesses legítimos**: segurança, prevenção de fraude, melhoria do serviço, estatísticas anonimizadas;
- **Obrigação legal**: conformidade AML/CFT, sanções, obrigações fiscais;
- **Consentimento**: comunicações de marketing (revogável a qualquer momento).

10.4. **Período de retenção.** Os dados são retidos durante a duração da relação contratual, depois arquivados durante os períodos de prescrição legais (5 a 10 anos dependendo dos dados).

10.5. **Transferências internacionais.** Os dados podem ser transferidos para fora do Espaço Econômico Europeu com **garantias apropriadas** (cláusulas contratuais padrão, decisão de adequação, etc.).

10.6. **Direitos do Cliente.** O Cliente tem os seguintes direitos: acesso, retificação, apagamento, restrição, portabilidade, oposição. Exercício via **formulário de contato** da Plataforma ou por e-mail.

10.7. **Segurança.** Medidas técnicas e organizacionais razoáveis (criptografia, controle de acesso, auditorias). Notificação de violação de dados em **72 horas** em conformidade com o GDPR.

10.8. **Conformidade DSA.** A Plataforma opera como um **serviço intermediário** no âmbito do **Regulamento (UE) 2022/2065 (Lei dos Serviços Digitais)**. SOS Expat implementa mecanismos para reportar conteúdo ilegal e coopera com as autoridades competentes.

---

## 11. Propriedade intelectual


A Plataforma, suas marcas, logos, bases de dados e conteúdos são protegidos. Nenhum direito é cedido ao Cliente. O uso é estritamente limitado a um acesso pessoal conforme as CGV.


---


## 12. Responsabilidade e garantias

12.1. **Função exclusiva de conexão.** SOS Expat é **exclusivamente** uma plataforma técnica de conexão. SOS Expat:
- **Não é** um escritório de advocacia, empresa de consultoria ou prestador de serviços jurídicos, médicos, fiscais ou regulamentados;
- **Não é parte** do contrato entre o Cliente e o Prestador (Advogado/Assistente);
- **Não garante** a qualidade, exatidão, legalidade ou resultado dos conselhos ou serviços prestados pelos Prestadores;
- **Não intervém** na fixação dos honorários dos Prestadores (além das Taxas de Conexão).

12.2. **Prestadores independentes.** Advogados e Assistentes são **profissionais independentes**, exclusivamente responsáveis por seus conselhos, serviços e conformidade com suas obrigações legais e éticas. SOS Expat **declina toda responsabilidade** por qualquer dano sofrido pelo Cliente em decorrência dos serviços de um Prestador.

12.3. **Limitação de responsabilidade.** Na **máxima extensão permitida pela lei aplicável** e **sem prejuízo dos direitos imperativos dos consumidores**:
- (a) A responsabilidade total de SOS Expat perante o Cliente é limitada a **danos diretos comprovados** e **não pode exceder** o preço total pago pelo Cliente pela reserva que originou a reclamação;
- (b) SOS Expat **não é responsável** por danos indiretos, especiais, consequentes, punitivos ou exemplares (perda de chance, lucros, oportunidades, danos à reputação, danos morais, etc.).

12.4. **Sem garantia.** A Plataforma é fornecida "**como está**" e "**conforme disponibilidade**". SOS Expat não garante:
- Disponibilidade contínua ou ininterrupta da Plataforma;
- Ausência de erros, bugs ou vulnerabilidades de segurança;
- Disponibilidade de qualquer Prestador específico;
- Adequação dos serviços às necessidades particulares do Cliente.

12.5. **Força maior.** SOS Expat não é responsável por atrasos ou falhas causados por eventos de **força maior** (desastre natural, guerra, pandemia, ciberataque, queda de energia ou internet, decisão governamental, greve, etc.).

12.6. **Litígios Cliente-Prestador.** Qualquer litígio entre o Cliente e um Prestador é **exclusivamente** um assunto de sua relação direta. SOS Expat **não intervém** em tais litígios e **não pode ser responsabilizado** como parte, garantidor ou mediador.

---

## 13. Lei aplicável, resolução de litígios e tribunais competentes

13.1. **Lei aplicável.**
- **Cliente não-consumidor (B2B)**: estas CGV são regidas **exclusivamente** pelo **direito estoniano**, excluindo suas regras de conflito de leis.
- **Cliente consumidor (B2C)**: as CGV são regidas pelo direito estoniano, **sem privar o Cliente** das disposições imperativas de proteção ao consumidor de seu país de residência habitual.

13.2. **Arbitragem ICC.**
- **Cliente não-consumidor (B2B)**: qualquer litígio será **definitivamente resolvido** segundo o Regulamento de Arbitragem da **ICC (Câmara de Comércio Internacional)**. **Sede: Tallinn (Estônia)**. **Idioma: INGLÊS**. Um (1) árbitro. Procedimento **confidencial**.
- **Cliente consumidor (B2C)**: o Cliente tem a **opção** entre arbitragem ICC (mesmas condições) ou os tribunais competentes sob as leis imperativas de seu local de residência.

13.3. **Renúncia a ações coletivas e júri.** Na **máxima extensão permitida pela lei aplicável** e **sem prejuízo dos direitos imperativos dos consumidores**:
- (a) Qualquer ação **coletiva, de grupo, representativa ou consolidada** é **excluída**; apenas reclamações **individuais** são admissíveis;
- (b) Clientes não-consumidores **renunciam expressamente ao direito a julgamento por júri** (renúncia ao júri).

13.4. **Competência dos tribunais estonianos.** Para qualquer demanda **não arbitrável**, **exequatur** (execução de sentenças arbitrais) ou **medidas provisórias/cautelares**, os tribunais estonianos em **Tallinn** têm competência exclusiva, **sem prejuízo** do direito do Cliente consumidor de recorrer aos tribunais de seu local de residência.

13.5. **Mediação prévia.** Antes de iniciar qualquer arbitragem ou procedimento judicial, as partes são encorajadas a tentar resolver o litígio amigavelmente por **negociação de boa-fé** durante um período de **trinta (30) dias** a partir da notificação escrita do litígio.

13.6. **Prescrição.** Qualquer ação ou reclamação de um Cliente não-consumidor contra SOS Expat deve ser apresentada dentro de **um (1) ano** a partir da data em que a causa de ação surgiu. Os prazos de prescrição aplicáveis aos consumidores são os previstos pela lei imperativa de seu local de residência.

---

## 14. Rescisão/suspensão e diversos

14.1. **Suspensão e encerramento.** SOS Expat pode **suspender temporariamente** ou **encerrar definitivamente** a conta do Cliente, com efeito imediato, nos seguintes casos:
- (a) Suspeita de **fraude, roubo de identidade ou atividade ilegal**;
- (b) **Violação das CGV** ou comportamento abusivo;
- (c) **Inadimplência** ou contestação abusiva de pagamento;
- (d) Inclusão em uma **lista de sanções internacionais**;
- (e) Solicitação de uma **autoridade judicial ou administrativa**;
- (f) Qualquer outro motivo legítimo de segurança ou conformidade.
Em caso de encerramento, reservas pendentes podem ser canceladas e reembolsadas, exceto em caso de culpa do Cliente.

14.2. **Encerramento pelo Cliente.** O Cliente pode encerrar sua conta a qualquer momento através de seu espaço pessoal ou contatando o suporte. O encerramento não dá direito a reembolso por serviços já consumidos.

14.3. **Integralidade.** Estas CGV constituem o acordo completo entre SOS Expat e o Cliente para uso da Plataforma e substituem qualquer acordo anterior.

14.4. **Idiomas.** Traduções podem ser fornecidas para fins informativos; **o inglês prevalece** para interpretação em caso de divergência.

14.5. **Nulidade parcial.** Se uma disposição for nula ou inexequível, o restante permanece em vigor; pode ser substituída por uma cláusula válida de efeito equivalente.

14.6. **Divisibilidade geográfica.** Se uma cláusula destas CGV for declarada nula, inexequível ou ilegal em uma jurisdição específica, esta decisão **não afeta a validade** da mesma cláusula em **outras jurisdições** onde permanece lícita e aplicável.

14.7. **Não-renúncia.** O fato de não exercer um direito não constitui renúncia.

14.8. **Cessão.** SOS Expat pode ceder as CGV a uma entidade do grupo ou sucessor. O Cliente não pode ceder sem o consentimento escrito de SOS Expat.

14.9. **Prova.** Os registros informatizados mantidos nos sistemas de SOS Expat e de seus Prestadores constituem prova até prova em contrário.

---

## 15. Contato

**Formulário de contato (suporte e solicitações legais):** **https://sos-expat.com/contact**
`;
const defaultCh = `
# 通用条款 – 客户（全球）

**SOS Expat** 是由 **WorldExpat OÜ** 运营的服务，WorldExpat OÜ 是一家爱沙尼亚法律下的公司（商业登记号 16885621），注册地址位于 Harju maakond, Tallinn, Kesklinna linnaosa, Tornimäe tn 3/5/7, 10145, 爱沙尼亚（以下简称"**平台**"、"**SOS**"、"**SOS Expat**"、"**我们**"）。

**版本 3.0 – 最后更新：2026年2月1日**

---

## 1. 目的与适用范围

1.1. 本通用条款（"GTC"）规范任何通过平台创建客户账户并预订服务的自然人或法人实体（"客户"）对平台的使用。

1.2. **SOS Expat 的角色。** SOS Expat 是一个连接平台：(i) 连接独立律师（"律师"），和/或 (ii) 连接独立外籍援助人员（"援助人员"）。SOS Expat 不是律师事务所，不提供任何法律、医疗、税务或受监管的建议，也不是客户与服务提供商（律师/援助人员）之间签订的服务合同的当事方。

1.3. **电子接受（点击确认）。** 通过勾选接受框和/或使用平台，客户接受本 GTC，这构成根据 **eIDAS 法规 (EU) No 910/2014** 及同等国家立法有效的电子签名。

1.4. **接受可追溯性。** SOS Expat 保留带有 UTC 时间戳的审计日志，包括：IP 地址、会话标识符、用户代理、GTC 版本、所接受文件的数字指纹（哈希值）及客户唯一标识符。这些数据构成接受的**可采信证据**。

1.5. **证据保留。** 接受日志自客户最后一次活动或账户关闭后保留**十（10）年**。可应要求出具接受证明。

1.6. **修改。** 我们可能通过在平台上发布的方式，以前瞻性效力更新 GTC 和/或价格/费用。任何影响客户权利或义务的重大修改将被通知，并要求现有客户**重新接受**。通知后继续使用即视为接受。

1.7. **期限。** GTC 订立为无固定期限。

---

## 2. 账户、资格与使用

2.1. **年龄与行为能力。** 客户声明其年满 18 周岁且具有法律行为能力。对于法人实体，用户声明其有权代表公司行事。

2.2. **信息准确性。** 所提供的信息（身份、联系方式、国家、请求事项）必须准确且保持最新。

2.3. **客户的声明与保证。** 通过创建账户并使用平台，客户明确声明并保证：
- (a) 其根据其居住国法律已**成年**（至少 18 岁或适用的成年年龄）；
- (b) 其具有**完全的法律行为能力**签订合同；
- (c) 其未处于监护、托管、司法保护或任何妨碍其签订合同的同等保护制度下；
- (d) 其**未列入任何国际制裁名单**（OFAC/SDN、欧盟、联合国、HMT 或其他）；
- (e) 注册时提供的所有信息**准确、完整且为最新**；
- (f) 其承诺**立即通知** SOS Expat 任何影响这些声明的变更；
- (g) 对于**法人实体**：代表人拥有代表公司行事的必要授权。
任何虚假声明可能导致账户暂停或关闭，且不影响任何损害赔偿请求。

2.4. **合规使用。** 客户不得进行任何非法或滥用性使用（欺诈、非法内容、骚扰、侵犯第三方权利、转移支付流、身份盗用等）。**SOS Expat 不是紧急服务**：不得用于任何医疗、生命威胁或紧急情况。

2.5. **账户安全。** 客户保护其登录凭据。通过其账户进行的任何活动均视为由其本人进行。如怀疑账户被盗用，客户必须立即更改密码并通知 SOS Expat。

2.6. **可用性。** 平台以"现状"提供：不保证不间断可用（维护、事故、不可抗力）。

---

## 3. 可预订服务的性质

3.1. **与律师通话。** 简短的指导性咨询（例如 20 分钟）。律师对其建议及遵守其职业道德/当地法律负全部责任。

3.2. **与援助人员通话。** 非受监管的援助（实用指导、非正式翻译、当地联系人等）。未持有适当当地执照，不提供法律/医疗/受监管建议。

3.3. **不作保证。** 我们不保证结果、质量、是否适合特定需求或服务提供商的可用性。

---

## 4. 价格、货币与连接费用

4.1. **价格显示。** 预订时显示的总价包括：
- (a) **服务提供商的报酬**（律师/援助人员），如所呈现的报价所定义；
- (b) 应付给 SOS Expat 的**连接费用**（固定费用）。
客户在确认预订前看到**含税总价**。

4.2. **连接费用（指示性固定费用）。** 连接费用目前为每次连接 **19 欧元（EUR）** 或 **25 美元（USD）**。这些金额为**指示性**，SOS Expat 可随时修改，以前瞻性效力生效。可发布按国家/货币的**当地费率表**。适用价格为预订时显示的价格。

4.3. **货币与转换。** 价格可以多种货币提供。可能适用支付服务提供商的费用和汇率。客户在确认前被告知其货币的确切金额。

4.4. **税费。** 显示的价格包括（如适用）连接费用的增值税或适用税费。服务提供商对其自身税务义务负责。

4.5. **透明度。** 无隐藏费用。预订时显示的价格即为最终价格，除非支付服务提供商或客户银行收取货币转换费用。

---

## 5. 预订、通话与联系尝试

5.1. **"连接"的定义。** 以下情况视为连接已建立：(a) 客户-服务提供商联系信息已传输，和/或 (b) 平台已开启通话/消息/视频渠道，和/或 (c) 服务提供商已接受客户的请求。

5.2. **通话尝试。** 对于即时通话：平台在约 15 分钟的窗口内进行最多三（3）次尝试（除非应用内另有说明）。

5.3. **服务提供商不可用。** 如果在尝试后未能建立连接，预订将被取消，客户将获得所付总价的全额退款。

5.4. **客户未响应。** 如果连接已建立（按 5.1 的定义）但客户未能进行有效交流（未接听、占线、拒绝、提前终止），付款仍为应付且不可退款。

5.5. **通信质量。** 客户必须处于有足够覆盖的区域并使用兼容设备。SOS 不对第三方网络中断负责。

---

## 6. 撤销权（消费者）与立即履行

6.1. **信息。** 如果客户是消费者且当地强制性法律规定了撤销权，该权利可在法定期限内行使，除非客户请求立即履行服务。

6.2. **放弃。** 通过在法定期限届满前预订即时或预定通话，客户请求立即履行并确认，一旦服务完全履行，其撤销权即丧失。如在撤销前部分履行，客户必须支付已提供服务的部分及不可退款的连接费用。

6.3. **形式要求。** 平台在需要时于预订期间收集对这些要点的明确接受。

---

## 7. 付款、安全、退单

7.1. **单次付款与分配。** 客户通过平台进行单次付款，涵盖 (i) 服务提供商份额和 (ii) 连接费用。SOS（或其支付服务提供商）收款、扣除其费用，然后将余额转给服务提供商。

7.2. **安全。** 付款由第三方支付服务提供商处理。可能适用 KYC/反洗钱控制。

7.3. **退单/争议。** 如发生付款争议，SOS 可向支付服务提供商传输必要数据，并暂停相关服务/付款。

7.4. **抵销。** 如果向客户退款，相应份额将从相关服务提供商处扣除；SOS 可从其未来付款中抵销。

---

## 8. 取消与退款

8.1. **一般规定。** 除强制性法律规定外：
- 一旦连接建立（5.1），连接费用不可退款；
- 一旦服务开始，服务提供商份额不可退款，除非服务提供商善意处理。

8.2. **客户在连接前取消。** 全额退款。

8.3. **服务提供商取消。** 全额退款。SOS 可提供重新路由到其他可用服务提供商。

8.4. **可归因于 SOS 的技术情况。** 在法律允许的范围内，由 SOS 自行决定退款或重新入账。

---

## 9. 行为、安全与内容

9.1. **尊重。** 客户承诺行为尊重，未经法律要求的同意不得录制或传播交流内容，不得请求非法行为。

9.2. **提供的内容。** 传输的信息必须忠实、准确且合法。客户就其提供的任何非法内容向 SOS 和服务提供商提供担保，使其免受相关索赔。

9.3. **举报。** 任何滥用行为可通过联系表单举报。

---

## 10. 个人数据（GDPR / 数据保护）

10.1. **数据控制者。** 对于连接所必需的数据，**SOS Expat (WorldExpat OÜ)** 和**服务提供商**（律师/援助人员）各自作为**独立数据控制者**处理各自目的的数据，符合 **法规 (EU) 2016/679 (GDPR)**。

10.2. **收集的数据。** SOS Expat 收集以下数据：身份、联系信息、居住国、请求事项、付款数据（由第三方提供商处理）、连接数据（IP、时间戳、设备）、预订历史。

10.3. **法律依据与目的。**
- **合同履行**：预订处理、连接、付款；
- **合法利益**：安全、欺诈预防、服务改进、匿名统计；
- **法律义务**：反洗钱合规、制裁、税务义务；
- **同意**：营销通讯（可随时撤销）。

10.4. **保留期限。** 数据在合同关系期间保留，然后根据法定时效期限归档（根据数据类型为 5 至 10 年）。

10.5. **国际传输。** 数据可在采取**适当保障措施**（标准合同条款、充分性决定等）的情况下传输至欧洲经济区以外。

10.6. **客户权利。** 客户拥有以下权利：访问、更正、删除、限制、可携带性、反对。通过平台**联系表单**或电子邮件行使。

10.7. **安全。** 合理的技术和组织措施（加密、访问控制、审计）。根据 GDPR 在 **72 小时**内通知数据泄露。

10.8. **DSA 合规。** 平台作为 **法规 (EU) 2022/2065（数字服务法）** 意义上的**中介服务**运营。SOS Expat 实施非法内容举报机制，并与主管当局合作。

---

## 11. 知识产权

平台及其商标、标识、数据库和内容受保护。不向客户转让任何权利。使用严格限于根据 GTC 进行的个人访问。

---

## 12. 责任与保证

12.1. **连接的专属角色。** SOS Expat **专门**作为技术连接平台。SOS Expat：
- **不是**律师事务所、咨询公司、法律、医疗、税务或受监管服务提供商；
- **不是**客户与服务提供商（律师/援助人员）之间合同的当事方；
- **不保证**服务提供商提供的建议或服务的质量、准确性、合法性或结果；
- **不干预**服务提供商费用的设定（连接费用除外）。

12.2. **独立服务提供商。** 律师和援助人员是**独立专业人员**，对其建议、服务及遵守其法律和职业义务负全部责任。SOS Expat **不承担**客户因服务提供商服务所遭受的任何损害的责任。

12.3. **责任限制。** 在**适用法律允许的最大范围内**且**不影响消费者的强制性权利**：
- (a) SOS Expat 对客户的总责任限于已证明的**直接损害**，且**不得超过**客户为引起索赔的预订所支付的总价；
- (b) SOS Expat **不承担**间接、特殊、后果性、惩罚性或惩戒性损害赔偿责任（机会损失、利润损失、商机损失、声誉损害、精神损害等）。

12.4. **不作保证。** 平台以"**现状**"和"**视可用性**"提供。SOS Expat 不保证：
- 平台的持续或不间断可用性；
- 不存在错误、漏洞或安全缺陷；
- 特定服务提供商的可用性；
- 服务是否适合客户的特定需求。

12.5. **不可抗力。** SOS Expat 不对因**不可抗力**事件（自然灾害、战争、流行病、网络攻击、电力或互联网故障、政府决定、罢工等）造成的延误或故障负责。

12.6. **客户-服务提供商争议。** 客户与服务提供商之间的任何争议**专属于**其直接关系。SOS Expat **不介入**此类争议，且**不得被作为**当事方、担保人或调解人追究。

---

## 13. 适用法律、争议解决与管辖法院

13.1. **适用法律。**
- **非消费者客户（B2B）**：本 GTC **专门**受**爱沙尼亚法律**管辖，排除其法律冲突规则。
- **消费者客户（B2C）**：GTC 受爱沙尼亚法律管辖，**但不剥夺客户**其惯常居住地消费者保护的强制性规定。

13.2. **ICC 仲裁。**
- **非消费者客户（B2B）**：任何争议根据**ICC（国际商会）仲裁规则**作出**最终**裁决。**仲裁地：塔林（爱沙尼亚）**。**语言：英语**。一（1）名仲裁员。程序**保密**。
- **消费者客户（B2C）**：客户可**选择** ICC 仲裁（相同条件）或根据其居住地强制性法律有管辖权的法院。

13.3. **放弃集体诉讼和陪审团审判。** 在**适用法律允许的最大范围内**且**不影响消费者的强制性权利**：
- (a) 任何**集体、群体、代表或合并**诉讼均被**排除**；仅受理**个人**索赔；
- (b) 非消费者客户**明确放弃陪审团审判权**。

13.4. **爱沙尼亚法院管辖权。** 对于任何**不可仲裁的**请求、**承认与执行**（仲裁裁决的执行）或**临时/保全措施**，位于**塔林**的爱沙尼亚法院具有专属管辖权，**但不影响**消费者客户向其居住地法院起诉的权利。

13.5. **事先调解。** 在任何仲裁或司法程序之前，鼓励当事方在书面通知争议后**三十（30）天**内通过**善意协商**友好解决争议。

13.6. **时效。** 非消费者客户对 SOS Expat 的任何诉讼或索赔必须在引起诉讼的事实发生之日起**一（1）年**内提起。适用于消费者的时效期限为其居住地强制性法律规定的期限。

---

## 14. 终止/暂停及其他

14.1. **暂停与关闭。** SOS Expat 可在以下情况下**立即**生效地**临时暂停**或**永久关闭**客户账户：
- (a) 涉嫌**欺诈、身份盗用或非法活动**；
- (b) **违反 GTC** 或滥用行为；
- (c) **未付款**或滥用付款争议；
- (d) 被列入**国际制裁名单**；
- (e) **司法或行政机关**的要求；
- (f) 任何其他出于安全或合规的合法理由。
如账户关闭，进行中的预订可能被取消并退款，除非客户有过错。

14.2. **客户关闭账户。** 客户可随时通过其个人空间或联系支持关闭账户。关闭不会导致已消费服务的任何退款。

14.3. **完整性。** GTC 构成 SOS Expat 与客户之间关于平台使用的完整协议，取代任何先前协议。

14.4. **语言。** 可能提供翻译版本以供参考；如有歧义，**英语版本优先**用于解释。

14.5. **部分无效。** 如某条款无效或不可执行，其余条款仍然有效；该条款可由具有同等效力的有效条款替代。

14.6. **地理可分割性。** 如本 GTC 的某条款在特定司法管辖区被宣布无效、不可执行或非法，该决定**不影响**该同一条款在其仍然合法且可执行的**其他司法管辖区**的效力。

14.7. **不放弃。** 未行使权利不构成放弃。

14.8. **转让。** SOS Expat 可将 GTC 转让给其集团内实体或继承者。未经 SOS Expat 书面同意，客户不得转让。

14.9. **证据。** 保存在 SOS Expat 及其服务提供商系统中的计算机记录在无相反证据的情况下具有证明力。

---

## 15. 联系方式

**联系表单（支持与法律请求）**：**https://sos-expat.com/contact**
`

  
  const defaultAr = `
# الشروط والأحكام العامة – العملاء (عالمي)

**SOS Expat** هي خدمة تديرها **WorldExpat OÜ**، شركة إستونية (السجل التجاري رقم 16885621)، مقرها Harju maakond, Tallinn, Kesklinna linnaosa, Tornimäe tn 3/5/7, 10145، إستونيا ("**المنصة**"، "**SOS**"، "**SOS Expat**"، "**نحن**").

**الإصدار 3.0 – آخر تحديث: 1 فبراير 2026**

---

## 1. الموضوع ونطاق التطبيق

1.1. تحكم هذه الشروط والأحكام العامة ("الشروط") استخدام المنصة من قبل أي شخص طبيعي أو اعتباري ينشئ حساب عميل ويحجز خدمة عبر المنصة ("العميل").

1.2. **دور SOS Expat.** SOS Expat هي منصة ربط: (أ) مع محامين مستقلين ("المحامون")، و/أو (ب) مع مساعدين مغتربين مستقلين ("المساعدون"). SOS Expat ليست مكتب محاماة، ولا تقدم أي استشارات قانونية أو طبية أو ضريبية أو منظمة، وليست طرفاً في عقد الخدمة المبرم بين العميل ومقدم الخدمة (المحامي/المساعد).

1.3. **القبول الإلكتروني (click-wrap).** بتحديد خانة القبول و/أو استخدام المنصة، يقبل العميل هذه الشروط، مما يشكل توقيعاً إلكترونياً صالحاً بموجب **لائحة eIDAS (EU) رقم 910/2014** والتشريعات الوطنية المعادلة.

1.4. **تتبع القبول.** تحتفظ SOS Expat بسجل تدقيق مؤرخ (UTC) يتضمن: عنوان IP، معرف الجلسة، وكيل المستخدم، إصدار الشروط، البصمة الرقمية (hash) للوثيقة المقبولة، والمعرف الفريد للعميل. تشكل هذه البيانات **دليلاً مقبولاً** على القبول.

1.5. **حفظ الأدلة.** تُحفظ سجلات القبول لمدة **عشر (10) سنوات** بعد آخر نشاط للعميل أو إغلاق حسابه. يمكن إصدار شهادة قبول عند الطلب.

1.6. **التعديلات.** يجوز لنا تحديث الشروط و/أو الأسعار/الرسوم بأثر مستقبلي عبر النشر على المنصة. سيتم إخطار العميل بأي تعديل جوهري يؤثر على حقوقه أو التزاماته وسيتطلب **قبولاً جديداً** من العملاء الحاليين. يُعتبر الاستمرار في الاستخدام بعد الإخطار قبولاً.

1.7. **المدة.** تُبرم الشروط لمدة غير محددة.

---

## 2. الحسابات والأهلية والاستخدام

2.1. **العمر والأهلية.** يُقر العميل بأنه يبلغ 18 عاماً على الأقل وله أهلية قانونية. بالنسبة للأشخاص الاعتباريين، يُقر المستخدم بأنه مخول للتصرف نيابة عن الشركة.

2.2. **دقة المعلومات.** يجب أن تكون المعلومات المقدمة (الهوية، وسائل الاتصال، البلد، موضوع الطلب) دقيقة ومحدثة.

2.3. **إقرارات وضمانات العميل.** بإنشاء حساب واستخدام المنصة، يُقر العميل ويضمن صراحةً أنه:
- (أ) **بالغ** وفقاً لقانون بلد إقامته (18 عاماً على الأقل أو سن الرشد المعمول به)؛
- (ب) يتمتع بـ**الأهلية القانونية الكاملة** للتعاقد؛
- (ج) ليس تحت الوصاية أو القوامة أو الحماية القضائية أو أي نظام حماية معادل يمنعه من التعاقد؛
- (د) **غير مدرج في أي قائمة عقوبات دولية** (OFAC/SDN، الاتحاد الأوروبي، الأمم المتحدة، HMT، أو غيرها)؛
- (هـ) جميع المعلومات المقدمة عند التسجيل **دقيقة وكاملة ومحدثة**؛
- (و) يلتزم بـ**إخطار SOS Expat فوراً** بأي تغيير يؤثر على هذه الإقرارات؛
- (ز) بالنسبة لـ**الأشخاص الاعتباريين**: يملك الممثل الصلاحيات اللازمة للتصرف نيابة عن الشركة.
قد يؤدي أي إقرار كاذب إلى تعليق أو إغلاق الحساب، دون المساس بأي دعوى تعويض.

2.4. **الاستخدام المتوافق.** يُحظر على العميل أي استخدام غير قانوني أو تعسفي (احتيال، محتوى غير قانوني، مضايقة، انتهاك حقوق الغير، تحويل تدفقات الدفع، انتحال الهوية، إلخ). **SOS Expat ليست خدمة طوارئ**: لا يجوز استخدامها للحالات الطبية أو المهددة للحياة أو حالات الطوارئ الفورية.

2.5. **أمان الحساب.** يحمي العميل بيانات تسجيل الدخول الخاصة به. يُعتبر أي نشاط يتم عبر حسابه صادراً عنه. في حالة الاشتباه في اختراق الحساب، يجب على العميل تغيير كلمة المرور فوراً وإخطار SOS Expat.

2.6. **التوفر.** تُقدم المنصة "كما هي": لا يُضمن توفر متواصل (صيانة، حوادث، قوة قاهرة).

---

## 3. طبيعة الخدمات القابلة للحجز

3.1. **المكالمات مع المحامين.** استشارات توجيهية قصيرة (مثل 20 دقيقة). يظل المحامي مسؤولاً وحده عن نصائحه والامتثال لأخلاقياته المهنية/القوانين المحلية.

3.2. **المكالمات مع المساعدين.** مساعدة غير منظمة (إرشادات عملية، ترجمة غير رسمية، جهات اتصال محلية...). لا يُقدم أي استشارة قانونية/طبية/منظمة بدون ترخيص محلي مناسب.

3.3. **بدون ضمانات.** لا نضمن النتيجة أو الجودة أو الملاءمة لاحتياجات معينة أو توفر مقدمي الخدمات.

---

## 4. الأسعار والعملات ورسوم الربط

4.1. **عرض الأسعار.** يشمل السعر الإجمالي المعروض عند الحجز:
- (أ) **أتعاب مقدم الخدمة** (المحامي/المساعد) كما هو محدد في العرض المقدم؛
- (ب) **رسوم الربط** المستحقة لـ SOS Expat (رسم ثابت).
يرى العميل **السعر الإجمالي شاملاً الضريبة** قبل تأكيد حجزه.

4.2. **رسوم الربط (رسم ثابت إرشادي).** تبلغ رسوم الربط حالياً **19 يورو (EUR)** أو **25 دولار (USD)** لكل ربط. هذه المبالغ **إرشادية** ويمكن لـ SOS Expat تعديلها في أي وقت بأثر مستقبلي. يمكن نشر **جداول أسعار محلية** حسب الدولة/العملة. السعر المطبق هو السعر المعروض وقت الحجز.

4.3. **العملات والتحويل.** قد تُعرض الأسعار بعملات متعددة. قد تُطبق رسوم وأسعار صرف مزود الدفع. يُبلغ العميل بالمبلغ الدقيق بعملته قبل التأكيد.

4.4. **الضرائب.** تشمل الأسعار المعروضة، عند الاقتضاء، ضريبة القيمة المضافة أو الضرائب المطبقة على رسوم الربط. يظل مقدمو الخدمات مسؤولين عن التزاماتهم الضريبية الخاصة.

4.5. **الشفافية.** لا رسوم خفية. السعر المعروض وقت الحجز هو السعر النهائي، ما لم تُطبق رسوم تحويل العملة من قبل مزود الدفع أو بنك العميل.

---

## 5. الحجز والمكالمة ومحاولات الاتصال

5.1. **تعريف "الربط".** يُعتبر الربط قد تحقق عندما: (أ) نقل معلومات الاتصال بين العميل ومقدم الخدمة، و/أو (ب) فتح المنصة قناة مكالمة/رسالة/فيديو، و/أو (ج) قبول مقدم الخدمة لطلب العميل.

5.2. **محاولات المكالمة.** في حالة المكالمة الفورية: تُجري المنصة حتى ثلاث (3) محاولات في نافذة زمنية تقارب 15 دقيقة (ما لم يُذكر خلاف ذلك في التطبيق).

5.3. **عدم توفر مقدم الخدمة.** إذا لم يتحقق أي ربط بعد المحاولات، يُلغى الحجز ويُسترد للعميل كامل السعر المدفوع.

5.4. **عدم رد العميل.** إذا تحقق الربط (وفقاً لـ 5.1) لكن العميل لم يُجرِ تبادلاً فعلياً (عدم رد، خط مشغول، رفض، توقف مبكر)، يظل الدفع مستحقاً وغير قابل للاسترداد.

5.5. **جودة الاتصال.** يجب أن يكون العميل في منطقة تغطية كافية وأن يستخدم معدات متوافقة. SOS ليست مسؤولة عن انقطاعات/شبكات الأطراف الثالثة.

---

## 6. حق الانسحاب (المستهلكون) والتنفيذ الفوري

6.1. **معلومات.** إذا كان العميل مستهلكاً وينص القانون المحلي الإلزامي على حق انسحاب، يمكن ممارسته ضمن المهل القانونية، ما لم يطلب العميل التنفيذ الفوري للخدمة.

6.2. **التنازل.** بحجز مكالمة فورية أو مجدولة قبل انقضاء المهلة القانونية، يطلب العميل التنفيذ الفوري ويُقر بأنه بمجرد تنفيذ الخدمة بالكامل، يفقد حق الانسحاب. في حالة التنفيذ الجزئي قبل الانسحاب، يجب على العميل دفع الجزء المنفذ بالفعل ورسوم الربط غير القابلة للاسترداد.

6.3. **الشكليات.** تجمع المنصة القبول الصريح لهذه النقاط أثناء الحجز، عند الضرورة.

---

## 7. الدفع والأمان ورد المبالغ

7.1. **دفع موحد وتوزيع.** يقوم العميل بدفع واحد عبر المنصة يغطي (أ) حصة مقدم الخدمة و(ب) رسوم الربط. تجمع SOS (أو مزود الدفع الخاص بها)، تخصم رسومها، ثم تحول الرصيد إلى مقدم الخدمة.

7.2. **الأمان.** تتم معالجة المدفوعات عبر مزودي دفع من طرف ثالث. قد تُطبق عمليات التحقق من هوية العميل (KYC)/مكافحة غسيل الأموال (AML).

7.3. **رد المبالغ/النزاعات.** في حالة نزاع بشأن الدفع، يمكن لـ SOS نقل البيانات الضرورية إلى مزود الدفع وتعليق الخدمات/المدفوعات ذات الصلة.

7.4. **المقاصة.** إذا مُنح استرداد للعميل، يُخصم الجزء المقابل من مقدم الخدمة المعني؛ يمكن لـ SOS المقاصة من مدفوعاته المستقبلية.

---

## 8. الإلغاءات والاستردادات

8.1. **عام.** ما لم تنص أحكام قانونية إلزامية على خلاف ذلك:
- رسوم الربط غير قابلة للاسترداد بمجرد تحقيق الربط (5.1)؛
- حصة مقدم الخدمة غير قابلة للاسترداد بمجرد بدء الخدمة، إلا بلفتة حسن نية من مقدم الخدمة.

8.2. **إلغاء من العميل قبل الربط.** استرداد كامل.

8.3. **إلغاء من مقدم الخدمة.** استرداد كامل. يمكن لـ SOS عرض إعادة التوجيه إلى مقدم خدمة آخر متاح.

8.4. **حالات تقنية منسوبة لـ SOS.** استرداد أو إعادة رصيد حسب تقدير SOS، بالقدر الذي يسمح به القانون.

---

## 9. السلوك والأمان والمحتوى

9.1. **الاحترام.** يلتزم العميل بسلوك محترم، وعدم تسجيل أو نشر التبادل بدون الموافقة المطلوبة قانوناً، وعدم طلب أعمال غير قانونية.

9.2. **المحتوى المقدم.** يجب أن تكون المعلومات المنقولة نزيهة ودقيقة وقانونية. يضمن العميل SOS ومقدم الخدمة ضد أي مطالبة تتعلق بمحتويات غير قانونية قدمها.

9.3. **الإبلاغ.** يمكن الإبلاغ عن أي إساءة عبر نموذج الاتصال.

---

## 10. البيانات الشخصية (GDPR / حماية البيانات)

10.1. **مسؤول المعالجة.** بالنسبة للبيانات الضرورية للربط، تعمل **SOS Expat (WorldExpat OÜ)** و**مقدم الخدمة** (المحامي/المساعد) كـ**مسؤول معالجة مستقل** كل لأغراضه الخاصة، وفقاً لـ**اللائحة (EU) 2016/679 (GDPR)**.

10.2. **البيانات المجمعة.** تجمع SOS Expat البيانات التالية: الهوية، معلومات الاتصال، بلد الإقامة، موضوع الطلب، بيانات الدفع (تُعالج بواسطة مزودين خارجيين)، بيانات الاتصال (IP، الطابع الزمني، الجهاز)، سجل الحجوزات.

10.3. **الأسس القانونية والأغراض.**
- **تنفيذ العقد**: معالجة الحجز، الربط، الدفع؛
- **المصالح المشروعة**: الأمان، منع الاحتيال، تحسين الخدمات، الإحصاءات المجهولة؛
- **الالتزام القانوني**: الامتثال لمكافحة غسيل الأموال، العقوبات، الالتزامات الضريبية؛
- **الموافقة**: الاتصالات التسويقية (قابلة للإلغاء في أي وقت).

10.4. **مدة الاحتفاظ.** تُحفظ البيانات طوال فترة العلاقة التعاقدية، ثم تُؤرشف وفقاً لفترات التقادم القانونية (5 إلى 10 سنوات حسب نوع البيانات).

10.5. **التحويلات الدولية.** قد تُنقل البيانات خارج المنطقة الاقتصادية الأوروبية مع **ضمانات مناسبة** (البنود التعاقدية النموذجية، قرارات الملاءمة، إلخ).

10.6. **حقوق العميل.** يتمتع العميل بالحقوق التالية: الوصول، التصحيح، المحو، التقييد، قابلية النقل، الاعتراض. تُمارس عبر **نموذج الاتصال** بالمنصة أو البريد الإلكتروني.

10.7. **الأمان.** تدابير تقنية وتنظيمية معقولة (التشفير، التحكم في الوصول، التدقيق). إشعار بانتهاكات البيانات خلال **72 ساعة** وفقاً لـ GDPR.

10.8. **الامتثال لـ DSA.** تعمل المنصة كـ**خدمة وسيطة** وفقاً لـ**اللائحة (EU) 2022/2065 (قانون الخدمات الرقمية)**. تنفذ SOS Expat آليات للإبلاغ عن المحتوى غير القانوني وتتعاون مع السلطات المختصة.

---

## 11. الملكية الفكرية

المنصة وعلاماتها التجارية وشعاراتها وقواعد بياناتها ومحتوياتها محمية. لا تُنقل أي حقوق إلى العميل. الاستخدام مقتصر بشكل صارم على الوصول الشخصي وفقاً للشروط.

---

## 12. المسؤولية والضمانات

12.1. **الدور الحصري للربط.** SOS Expat هي **حصرياً** منصة ربط تقنية. SOS Expat:
- **ليست** مكتب محاماة أو شركة استشارات أو مقدم خدمات قانونية أو طبية أو ضريبية أو منظمة؛
- **ليست طرفاً** في العقد بين العميل ومقدم الخدمة (المحامي/المساعد)؛
- **لا تضمن** جودة أو دقة أو شرعية أو نتيجة النصائح أو الخدمات المقدمة من مقدمي الخدمات؛
- **لا تتدخل** في تحديد أتعاب مقدمي الخدمات (باستثناء رسوم الربط).

12.2. **مقدمو خدمات مستقلون.** المحامون والمساعدون **مهنيون مستقلون**، مسؤولون وحدهم عن نصائحهم وخدماتهم والامتثال لالتزاماتهم القانونية والمهنية. **تخلي SOS Expat مسؤوليتها** عن أي ضرر يلحق بالعميل نتيجة خدمات مقدم الخدمة.

12.3. **حد المسؤولية.** في **أقصى حد يسمح به القانون المعمول به** و**دون المساس بالحقوق الإلزامية للمستهلكين**:
- (أ) تقتصر المسؤولية الإجمالية لـ SOS Expat تجاه العميل على **الأضرار المباشرة** المثبتة و**لا يمكن أن تتجاوز** السعر الإجمالي المدفوع من العميل للحجز المسبب للمطالبة؛
- (ب) **لا تتحمل SOS Expat مسؤولية** الأضرار غير المباشرة أو الخاصة أو التبعية أو العقابية أو التأديبية (فقدان الفرصة، الأرباح، الفرص التجارية، السمعة، الأضرار المعنوية، إلخ).

12.4. **بدون ضمانات.** تُقدم المنصة "**كما هي**" و"**حسب التوفر**". لا تضمن SOS Expat:
- التوفر المستمر أو المتواصل للمنصة؛
- غياب الأخطاء أو الثغرات أو العيوب الأمنية؛
- توفر مقدم خدمة معين؛
- ملاءمة الخدمات لاحتياجات العميل الخاصة.

12.5. **القوة القاهرة.** لا تتحمل SOS Expat مسؤولية التأخيرات أو الإخفاقات الناجمة عن أحداث **القوة القاهرة** (كارثة طبيعية، حرب، جائحة، هجوم إلكتروني، انقطاع الكهرباء أو الإنترنت، قرار حكومي، إضراب، إلخ).

12.6. **نزاعات العميل-مقدم الخدمة.** أي نزاع بين العميل ومقدم الخدمة يخص **حصرياً** علاقتهما المباشرة. **لا تتدخل SOS Expat** في هذه النزاعات و**لا يمكن محاسبتها** كطرف أو ضامن أو وسيط.

---

## 13. القانون المعمول به وحل النزاعات والمحاكم المختصة

13.1. **القانون المعمول به.**
- **العميل غير المستهلك (B2B)**: تخضع هذه الشروط **حصرياً** لـ**القانون الإستوني**، باستثناء قواعد تنازع القوانين.
- **العميل المستهلك (B2C)**: تخضع الشروط للقانون الإستوني، **دون حرمان العميل** من الأحكام الإلزامية لحماية المستهلك في بلد إقامته المعتاد.

13.2. **تحكيم ICC.**
- **العميل غير المستهلك (B2B)**: يُفصل في أي نزاع **نهائياً** وفقاً لقواعد تحكيم **ICC (غرفة التجارة الدولية)**. **المقر: تالين (إستونيا)**. **اللغة: الإنجليزية**. محكم واحد (1). الإجراءات **سرية**.
- **العميل المستهلك (B2C)**: للعميل **خيار** تحكيم ICC (نفس الشروط) أو المحاكم المختصة بموجب القوانين الإلزامية لمحل إقامته.

13.3. **التنازل عن الدعاوى الجماعية والمحاكمة أمام هيئة محلفين.** في **أقصى حد يسمح به القانون المعمول به** و**دون المساس بالحقوق الإلزامية للمستهلكين**:
- (أ) **تُستثنى** أي دعوى **جماعية أو تمثيلية أو موحدة**؛ تُقبل فقط المطالبات **الفردية**؛
- (ب) **يتنازل العميل غير المستهلك صراحةً عن حقه في المحاكمة أمام هيئة محلفين**.

13.4. **اختصاص المحاكم الإستونية.** لأي طلب **غير قابل للتحكيم** أو **الاعتراف والتنفيذ** (تنفيذ أحكام التحكيم) أو **التدابير المؤقتة/التحفظية**، تختص محاكم إستونيا في **تالين** حصرياً، **دون المساس** بحق العميل المستهلك في اللجوء إلى محاكم محل إقامته.

13.5. **الوساطة المسبقة.** قبل أي إجراء تحكيمي أو قضائي، يُشجع الطرفان على محاولة حل النزاع ودياً عبر **التفاوض بحسن نية** خلال **ثلاثين (30) يوماً** من الإخطار الكتابي بالنزاع.

13.6. **التقادم.** يجب رفع أي دعوى أو مطالبة من العميل غير المستهلك ضد SOS Expat خلال **سنة واحدة (1)** من تاريخ وقوع الحدث المسبب. تُطبق فترات التقادم المعمول بها للمستهلكين وفقاً للقانون الإلزامي لمحل إقامتهم.

---

## 14. الإنهاء/التعليق والأحكام المتنوعة

14.1. **التعليق والإغلاق.** يحتفظ SOS Expat بالحق في تعليق أو تقييد أو إغلاق حساب العميل بشكل مؤقت أو دائم، فوراً ودون إشعار مسبق، في حالة:
- (أ) احتيال أو اشتباه في احتيال أو سرقة هوية؛
- (ب) انتهاك هذه الشروط العامة أو أي سياسة سارية؛
- (ج) سوء استخدام، تحرش، سلوك مسيء أو إساءة لفظية تجاه مزودي الخدمات أو فريق SOS؛
- (د) مخاطر قانونية أو تنظيمية أو سمعية على المنصة؛
- (هـ) طلب من سلطة مختصة؛
- (و) عدم دفع أو نزاع في الدفع غير مبرر. لا يُستحق أي تعويض في حالة الإغلاق لسبب.

14.2. **إغلاق حساب العميل.** يمكن للعميل إغلاق حسابه في أي وقت عبر إعداداته أو بالتواصل مع الدعم. يظل العميل مسؤولاً عن أي مدفوعات معلقة.

14.3. **الاكتمال.** تشكل هذه الشروط العامة، مع السياسات والوثائق المشار إليها، الاتفاقية الكاملة بين SOS Expat والعميل فيما يتعلق باستخدام المنصة، وتحل محل أي اتفاقيات أو اتصالات سابقة.

14.4. **اللغات.** تتوفر هذه الشروط العامة بعدة لغات لراحة المستخدم. **في حالة التعارض في التفسير، تسود النسخة الإنجليزية** على جميع الترجمات الأخرى.

14.5. **البطلان الجزئي.** إذا اعتُبر أي حكم باطلاً أو غير قابل للتطبيق أو غير ساري، يظل الباقي سارياً بكامل قوته. يُستبدل الحكم المعيب بحكم صحيح يحقق، قدر الإمكان، الهدف الاقتصادي للأطراف.

14.6. **قابلية التجزئة الجغرافية.** إذا كان حكم ما غير قابل للتطبيق في ولاية قضائية معينة، يظل سارياً في جميع الولايات القضائية الأخرى حيث يُسمح به.

14.7. **عدم التنازل.** عدم ممارسة أو تأخر ممارسة SOS Expat لأي حق لا يُشكل تنازلاً عنه. لا يكون أي تنازل سارياً إلا إذا كان كتابياً ولحالة محددة.

14.8. **التنازل عن الحقوق.** يجوز لـ SOS Expat التنازل عن هذه الشروط العامة أو نقلها إلى أي كيان تابع أو خلف، دون موافقة مسبقة من العميل. لا يجوز للعميل التنازل عن حقوقه دون موافقة كتابية مسبقة من SOS.

14.9. **الإثبات.** يوافق الأطراف على أن السجلات الإلكترونية (السجلات، البيانات الوصفية، الطوابع الزمنية) التي يحتفظ بها SOS Expat قابلة للقبول كدليل ولها نفس القيمة الإثباتية للوثائق الورقية الأصلية.

---

## 15. الاتصال

**نموذج الاتصال (الدعم والطلبات القانونية)**: [https://sos-expat.com/contact](https://sos-expat.com/contact)
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
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
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
          <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/20 pointer-events-none" />
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
