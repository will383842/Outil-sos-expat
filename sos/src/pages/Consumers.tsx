import React, { useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import {
  ShoppingCart,
  Shield,
  AlertTriangle,
  Phone,
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

const Consumers: React.FC = () => {
  const { language } = useApp();

  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [selectedLanguage, setSelectedLanguage] = useState<
    "fr" | "en" | "es" | "de" | "ru" | "hi" | "pt" | "ch" | "ar"
  >((language as "fr" | "en" | "es" | "de" | "ru" | "hi" | "pt" | "ch" | "ar") || "fr");

  // Rester synchronisé avec la langue globale de l'app
  useEffect(() => {
    if (language)
      setSelectedLanguage(
        language as "fr" | "en" | "es" | "de" | "ru" | "hi" | "pt" | "ch" | "ar"
      );
  }, [language]);

  // Logique métier Firestore conservée (type: 'legal')
  useEffect(() => {
    const fetchConsumerInfo = async () => {
      try {
        setIsLoading(true);
        const q = query(
          collection(db, "legal_documents"),
          where("type", "==", "legal"),
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
        console.error("Error fetching consumer info:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConsumerInfo();
  }, [selectedLanguage]);

  const translations = {
    fr: {
      title: "Information Consommateurs",
      subtitle: "Vos droits et protections – Plateforme internationale",
      lastUpdated: "Version 2.2 – Dernière mise à jour : 16 juin 2025",
      loading: "Chargement...",
      features: [
        "Remboursement auto",
        "Prix EUR & USD",
        "Droits consommateurs",
        "Support 24/7",
      ],
      anchorTitle: "Sommaire",
      contactCta: "Nous contacter",
      editHint: "Document éditable depuis la console admin",
      sections: {
        rights: "Vos droits de consommateur",
        refunds: "Politique de remboursement",
        prices: "Transparence des prix (EUR / USD)",
        mediation: "Médiation et réclamations",
        support: "Service client",
        contact: "Contact",
      },
      lawyerCall: "Appel Avocat",
      expatHelperCall: "Appel Expatrié Aidant",
      forMinutes20: "pour 20 min",
      forMinutes30: "pour 30 min",
      eurDisplay:
        "Affichage et paiement possibles en EUR ou USD selon votre choix.",
      usdDisplay:
        "Montants affichés à titre indicatif ; le taux/frais de conversion du prestataire de paiement peuvent s'appliquer.",
      serviceHours:
        "Horaires : 24/7 • Temps de réponse : sous 24h. Pour toute demande, utilisez notre formulaire.",
      contactHeader: "Contact",
      contactFormLabel: "Formulaire de contact",
    },
    en: {
      title: "Consumer Information",
      subtitle: "Your rights and protections — International platform",
      lastUpdated: "Version 2.2 – Last updated: 16 June 2025",
      loading: "Loading...",
      features: [
        "Auto refund",
        "Prices in EUR & USD",
        "Consumer rights",
        "24/7 support",
      ],
      anchorTitle: "Overview",
      contactCta: "Contact us",
      editHint: "Document editable from the admin console",
      sections: {
        rights: "Your consumer rights",
        refunds: "Refund policy",
        prices: "Price transparency (EUR / USD)",
        mediation: "Mediation and complaints",
        support: "Customer service",
        contact: "Contact",
      },
      lawyerCall: "Lawyer Call",
      expatHelperCall: "Expat Helper Call",
      forMinutes20: "for 20 min",
      forMinutes30: "for 30 min",
      eurDisplay: "Display and payment available in EUR or USD at your choice.",
      usdDisplay:
        "Amounts are indicative; payment processor FX rates/fees may apply.",
      serviceHours:
        "Hours: 24/7 • Response time: within 24h. For any request, please use our contact form.",
      contactHeader: "Contact",
      contactFormLabel: "Contact form",
    },
    es: {
      title: "Información del Consumidor",
      subtitle: "Sus derechos y protecciones — Plataforma internacional",
      lastUpdated: "Versión 2.2 – Última actualización: 16 de junio de 2025",
      loading: "Cargando...",
      features: [
        "Reembolso automático",
        "Precios en EUR y USD",
        "Derechos del consumidor",
        "Soporte 24/7",
      ],
      anchorTitle: "Resumen",
      contactCta: "Contáctanos",
      editHint: "Documento editable desde la consola de administración",
      sections: {
        rights: "Sus derechos como consumidor",
        refunds: "Política de reembolso",
        prices: "Transparencia de precios (EUR / USD)",
        mediation: "Mediación y reclamaciones",
        support: "Servicio al cliente",
        contact: "Contacto",
      },
      lawyerCall: "Llamada con abogado",
      expatHelperCall: "Llamada con ayudante expatriado",
      forMinutes20: "por 20 min",
      forMinutes30: "por 30 min",
      eurDisplay:
        "Visualización y pago disponibles en EUR o USD según su elección.",
      usdDisplay:
        "Los montos son indicativos; pueden aplicarse tarifas/tasas de cambio del procesador de pagos.",
      serviceHours:
        "Horario: 24/7 • Tiempo de respuesta: dentro de 24 horas. Para cualquier solicitud, utilice nuestro formulario.",
      contactHeader: "Contacto",
      contactFormLabel: "Formulario de contacto",
    },
    de: {
      title: "Verbraucherinformationen",
      subtitle: "Ihre Rechte und Ihr Schutz — Internationale Plattform",
      lastUpdated: "Version 2.2 – Letzte Aktualisierung: 16. Juni 2025",
      loading: "Wird geladen...",
      features: [
        "Auto-Rückerstattung",
        "Preise in EUR & USD",
        "Verbraucherrechte",
        "24/7 Support",
      ],
      anchorTitle: "Übersicht",
      contactCta: "Kontaktieren Sie uns",
      editHint: "Dokument bearbeitbar über die Admin-Konsole",
      sections: {
        rights: "Ihre Verbraucherrechte",
        refunds: "Rückerstattungsrichtlinie",
        prices: "Preistransparenz (EUR / USD)",
        mediation: "Mediation und Beschwerden",
        support: "Kundendienst",
        contact: "Kontakt",
      },
      lawyerCall: "Anwaltsanruf",
      expatHelperCall: "Expat-Helfer-Anruf",
      forMinutes20: "für 20 Min",
      forMinutes30: "für 30 Min",
      eurDisplay: "Anzeige und Zahlung in EUR oder USD je nach Wahl verfügbar.",
      usdDisplay:
        "Beträge sind indikativ; Wechselkurse/Gebühren des Zahlungsabwicklers können anfallen.",
      serviceHours:
        "Öffnungszeiten: 24/7 • Antwortzeit: innerhalb von 24 Stunden. Für jede Anfrage nutzen Sie bitte unser Formular.",
      contactHeader: "Kontakt",
      contactFormLabel: "Kontaktformular",
    },
    ru: {
      title: "Информация для потребителей",
      subtitle: "Ваши права и защита — Международная платформа",
      lastUpdated: "Версия 2.2 – Последнее обновление: 16 июня 2025",
      loading: "Загрузка...",
      features: [
        "Авто возврат",
        "Цены в EUR и USD",
        "Права потребителей",
        "Поддержка 24/7",
      ],
      anchorTitle: "Обзор",
      contactCta: "Свяжитесь с нами",
      editHint: "Документ редактируется через консоль администратора",
      sections: {
        rights: "Ваши права потребителя",
        refunds: "Политика возврата",
        prices: "Прозрачность цен (EUR / USD)",
        mediation: "Медиация и жалобы",
        support: "Служба поддержки",
        contact: "Контакт",
      },
      lawyerCall: "Звонок юристу",
      expatHelperCall: "Звонок помощнику-экспату",
      forMinutes20: "на 20 мин",
      forMinutes30: "на 30 мин",
      eurDisplay:
        "Отображение и оплата доступны в EUR или USD по вашему выбору.",
      usdDisplay:
        "Суммы являются ориентировочными; могут применяться курсы/сборы платежного процессора.",
      serviceHours:
        "Часы работы: 24/7 • Время ответа: в течение 24 часов. По любым вопросам используйте нашу форму.",
      contactHeader: "Контакт",
      contactFormLabel: "Контактная форма",
    },
    hi: {
      title: "उपभोक्ता सूचना",
      subtitle: "आपके अधिकार और सुरक्षा – अंतर्राष्ट्रीय प्लेटफ़ॉर्म",
      lastUpdated: "संस्करण 2.2 – अंतिम अपडेट: 16 जून 2025",
      loading: "लोड हो रहा है...",
      features: [
        "स्वचालित रिफंड",
        "EUR और USD में कीमतें",
        "उपभोक्ता अधिकार",
        "24/7 सहायता",
      ],
      anchorTitle: "सारांश",
      contactCta: "हमसे संपर्क करें",
      editHint: "एडमिन कंसोल से संपादन योग्य दस्तावेज़",
      sections: {
        rights: "आपके उपभोक्ता अधिकार",
        refunds: "रिफंड नीति",
        prices: "मूल्य पारदर्शिता (EUR / USD)",
        mediation: "मध्यस्थता और शिकायतें",
        support: "ग्राहक सेवा",
        contact: "संपर्क",
      },
      lawyerCall: "वकील कॉल",
      expatHelperCall: "प्रवासी सहायक कॉल",
      forMinutes20: "20 मिनट के लिए",
      forMinutes30: "30 मिनट के लिए",
      eurDisplay:
        "आपकी पसंद के अनुसार EUR या USD में प्रदर्शन और भुगतान उपलब्ध है।",
      usdDisplay:
        "राशियां सांकेतिक हैं; भुगतान प्रोसेसर के विनिमय दर/शुल्क लागू हो सकते हैं।",
      serviceHours:
        "घंटे: 24/7 • प्रतिक्रिया समय: 24 घंटे के भीतर। किसी भी अनुरोध के लिए, कृपया हमारा फॉर्म उपयोग करें।",
      contactHeader: "संपर्क",
      contactFormLabel: "संपर्क फॉर्म",
    },
    pt: {
      title: "Informações do Consumidor",
      subtitle: "Seus direitos e proteções — Plataforma internacional",
      lastUpdated: "Versão 2.2 – Última atualização: 16 de junho de 2025",
      loading: "Carregando...",
      features: [
        "Reembolso automático",
        "Preços em EUR e USD",
        "Direitos do consumidor",
        "Suporte 24/7",
      ],
      anchorTitle: "Resumo",
      contactCta: "Entre em contato conosco",
      editHint: "Documento editável no console do administrador",
      sections: {
        rights: "Seus direitos como consumidor",
        refunds: "Política de reembolso",
        prices: "Transparência de preços (EUR / USD)",
        mediation: "Mediação e reclamações",
        support: "Atendimento ao cliente",
        contact: "Contato",
      },
      lawyerCall: "Chamada com advogado",
      expatHelperCall: "Chamada com assistente expatriado",
      forMinutes20: "por 20 min",
      forMinutes30: "por 30 min",
      eurDisplay:
        "Exibição e pagamento disponíveis em EUR ou USD conforme sua escolha.",
      usdDisplay:
        "Os valores são indicativos; as taxas de câmbio/taxas do processador de pagamento podem se aplicar.",
      serviceHours:
        "Horário: 24/7 • Tempo de resposta: dentro de 24 horas. Para qualquer solicitação, use nosso formulário de contato.",
      contactHeader: "Contato",
      contactFormLabel: "Formulário de contato",
    },
    ch:{
        title: "消费者信息",
        subtitle: "您的权利与保护 — 国际平台",
        lastUpdated: "版本 2.2 – 最后更新：2025年6月16日",
        loading: "加载中...",
        features: [
          "自动退款",
          "以欧元和美元定价",
          "消费者权利",
          "24/7 全天候支持",
        ],
        anchorTitle: "概览",
        contactCta: "联系我们",
        editHint: "此文档可在管理控制台中编辑",
        sections: {
          rights: "您的消费者权利",
          refunds: "退款政策",
          prices: "价格透明度（欧元 / 美元）",
          mediation: "调解与投诉",
          support: "客户服务",
          contact: "联系",
        },
        lawyerCall: "律师咨询",
        expatHelperCall: "外籍人士协助通话",
        forMinutes20: "20 分钟",
        forMinutes30: "30 分钟",
        eurDisplay: "可选择以欧元或美元显示和支付。",
        usdDisplay: "金额为参考值；可能适用支付处理方的汇率/手续费。",
        serviceHours:
          "服务时间：全天候（24/7）• 回复时间：24小时内。任何请求请使用我们的联系表单。",
        contactHeader: "联系",
        contactFormLabel: "联系表单",
    },
    ar: {
  title: "معلومات المستهلك",
  subtitle: "حقوقك وحمايتك — منصة دولية",
  lastUpdated: "الإصدار 2.2 – آخر تحديث: 16 يونيو 2025",
  loading: "جارٍ التحميل...",
  features: [
    "استرداد تلقائي",
    "الأسعار باليورو والدولار",
    "حقوق المستهلك",
    "دعم 24/7",
  ],
  anchorTitle: "نظرة عامة",
  contactCta: "اتصل بنا",
  editHint: "مستند قابل للتحرير من وحدة التحكم الإدارية",
  sections: {
    rights: "حقوقك كمستهلك",
    refunds: "سياسة الاسترداد",
    prices: "شفافية الأسعار (يورو / دولار)",
    mediation: "الوساطة والشكاوى",
    support: "خدمة العملاء",
    contact: "اتصل",
  },
  lawyerCall: "مكالمة محامي",
  expatHelperCall: "مكالمة مساعد مغترب",
  forMinutes20: "لمدة 20 دقيقة",
  forMinutes30: "لمدة 30 دقيقة",
  eurDisplay:
    "العرض والدفع متاحان باليورو أو الدولار حسب اختيارك.",
  usdDisplay:
    "المبالغ إرشادية؛ قد تطبق أسعار صرف/رسوم معالج الدفع.",
  serviceHours:
    "ساعات العمل: 24/7 • وقت الاستجابة: في غضون 24 ساعة. لأي طلب، يرجى استخدام نموذج الاتصال الخاص بنا.",
  contactHeader: "اتصل",
  contactFormLabel: "نموذج الاتصال",
}

  };

  const t = translations[selectedLanguage];

  const handleLanguageChange = (newLang: "fr" | "en") => {
    setSelectedLanguage(newLang);
  };

  // Parser Markdown (UI only, ne modifie pas le contenu)
  const parseMarkdownContent = (text: string) => {
    const lines = text.split("\n");
    const elements: JSX.Element[] = [];
    let currentIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.trim() === "") continue;

      if (line.trim() === "---") {
        elements.push(
          <hr
            key={currentIndex++}
            className="my-8 border-t-2 border-gray-200"
          />
        );
        continue;
      }

      if (line.startsWith("# ")) {
        const title = line.substring(2).replace(/\*\*/g, "");
        elements.push(
          <h1
            key={currentIndex++}
            className="text-3xl sm:text-4xl font-black text-gray-900 mb-6 mt-8 border-b-2 border-purple-500 pb-4"
          >
            {title}
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
              key={currentIndex++}
              className="scroll-mt-28 text-xl sm:text-2xl font-bold text-gray-900 mt-10 mb-6 flex items-center gap-3"
            >
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white text-sm font-bold shadow-lg">
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

      if (line.startsWith("### ")) {
        const subtitle = line.substring(4).replace(/\*\*/g, "");
        elements.push(
          <h3
            key={currentIndex++}
            className="text-lg font-bold text-gray-800 mt-6 mb-4 border-l-4 border-purple-500 pl-4"
          >
            {subtitle}
          </h3>
        );
        continue;
      }

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
            className="bg-gray-50 border-l-4 border-purple-500 rounded-r-xl p-5 my-4 hover:bg-gray-100 transition-colors duration-200"
          >
            <p className="text-gray-800 leading-relaxed">
              <span className="font-bold text-purple-600 mr-2">{number}</span>
              <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formatted) }} />
            </p>
          </div>
        );
        continue;
      }

      // Bloc contact spécial (détection d'URL)
      if (line.toLowerCase().includes("/contact")) {
        elements.push(
          <div
            key={currentIndex++}
            className="bg-gradient-to-r from-purple-50 to-fuchsia-50 border-2 border-purple-200 rounded-2xl p-8 my-8 shadow-lg"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-bold shadow-lg">
                !
              </span>
              {selectedLanguage === "fr" ? "Contact" : "Contact"}
            </h3>
            <p className="text-gray-800 leading-relaxed mb-6 text-lg">{line}</p>
            <a
              href="/contact"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              <Globe className="w-5 h-5" />
              {/* {selectedLanguage === "fr"
                ? "Formulaire de contact"
                : "Contact form"} */}
              {t.contactFormLabel}
            </a>
          </div>
        );
        continue;
      }

      if (line.startsWith("**") && line.endsWith("**")) {
        const boldText = line.slice(2, -2);
        elements.push(
          <div
            key={currentIndex++}
            className="bg-gradient-to-r from-fuchsia-50 to-purple-50 border border-purple-200 rounded-2xl p-6 my-6"
          >
            <p className="font-bold text-gray-900 text-lg">{boldText}</p>
          </div>
        );
        continue;
      }

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

    return elements;
  };

  // --------- Contenu par défaut (FR/EN) ----------
  const defaultFr = `
# Information Consommateurs (Global)

**Version 2.2 – Dernière mise à jour : 16 juin 2025**

---

## 1. Vos droits de consommateur

1.1. **Information claire** sur les services, tarifs et conditions.  
1.2. **Droit de rétractation** selon la loi impérative locale lorsque applicable (voir conditions de mise en œuvre auprès du prestataire et de la Plateforme).  
1.3. **Protection** contre les pratiques commerciales déloyales et trompeuses.  
1.4. **Accès** à un service client réactif via le **formulaire de contact**.

---

## 2. Politique de remboursement

2.1. **Remboursement automatique** : si votre expert ne répond pas après **3 tentatives** d’appel dans la fenêtre prévue, la réservation est **annulée** et vous êtes **remboursé intégralement**.  
2.2. **Autres cas** : contactez le support **dans les 24h** suivant l’appel via le **formulaire de contact** pour étude de votre demande.

---

## 3. Transparence des prix (EUR / USD)

3.1. **Appel Avocat** : **49 € (EUR)** / **$55 (USD)** pour **20 minutes** (prix TTC).  
3.2. **Appel Expatrié Aidant** : **19 € (EUR)** / **$25 (USD)** pour **30 minutes** (prix TTC).  
3.3. **Aucun frais caché** ; le prix affiché inclut, le cas échéant, les frais techniques de mise en relation.  
3.4. Les montants en **USD** peuvent être affichés et réglés **au choix du Client** ; des **frais/taux de conversion** du prestataire de paiement peuvent s’appliquer le cas échéant.

---

## 4. Médiation et réclamations

4.1. **Support via formulaire** : /contact  
4.2. **Médiation consommation** : vous pouvez saisir le médiateur compétent selon votre pays.  
4.3. **Plateforme européenne de RLL** : utilisation possible du règlement en ligne des litiges (ODR).

---

## 5. Service client (international)

5.1. **Horaires** : 24/7  
5.2. **Temps de réponse** : sous 24h  
5.3. **Contact** : utilisez le **formulaire** dédié : /contact

---

## 6. Contact

Formulaire (support & demandes légales) : /contact
`;
  

  const defaultAr = `
# معلومات المستهلك (عالمي)

**الإصدار 2.2 – آخر تحديث: 16 يونيو 2025**

---

## 1. حقوقك كمستهلك

1.1. **معلومات واضحة** عن الخدمات والأسعار والشروط.  
1.2. **حق الانسحاب** وفقاً للقانون الإلزامي المحلي عند الانطباق (انظر شروط التنفيذ لدى مقدم الخدمة والمنصة).  
1.3. **الحماية** من الممارسات التجارية غير العادلة والمضللة.  
1.4. **الوصول** إلى خدمة عملاء سريعة الاستجابة عبر **نموذج الاتصال**.

---

## 2. سياسة الاسترداد

2.1. **استرداد تلقائي**: إذا لم يرد متخصصك بعد **3 محاولات اتصال** ضمن النافذة المتوقعة، يتم **إلغاء** الحجز وتحصل على **استرداد كامل**.  
2.2. **حالات أخرى**: اتصل بالدعم **خلال 24 ساعة** بعد المكالمة عبر **نموذج الاتصال** لدراسة طلبك.

---

## 3. شفافية الأسعار (يورو / دولار)

3.1. **مكالمة محامي**: **49 يورو (EUR)** / **55 دولار (USD)** لمدة **20 دقيقة** (السعر شامل الضرائب).
3.2. **مكالمة مساعد مغترب**: **19 يورو (EUR)** / **25 دولار (USD)** لمدة **30 دقيقة** (السعر شامل الضرائب).  
3.3. **لا توجد رسوم مخفية**؛ السعر المعروض يشمل، عند الاقتضاء، الرسوم التقنية للاتصال.  
3.4. يمكن عرض المبالغ بالـ **دولار** والدفع بها **حسب اختيار المستخدم**؛ قد تطبق **أسعار صرف/رسوم** معالج الدفع عند الاقتضاء.

---

## 4. الوساطة والشكاوى

4.1. **الدعم عبر النموذج**: /contact  
4.2. **وساطة المستهلك**: يمكنك التواصل مع الوسيط المختص في بلدك.  
4.3. **منصة الاتحاد الأوروبي لحل النزاعات عبر الإنترنت**: يمكن استخدام آلية حل النزاعات على الإنترنت (ODR).

---

## 5. خدمة العملاء (دولية)

5.1. **ساعات العمل**: 24/7  
5.2. **وقت الاستجابة**: خلال 24 ساعة  
5.3. **اتصل**: استخدم **نموذج الاتصال** المخصص: /contact

---

## 6. اتصل

نموذج الاتصال (الدعم والطلبات القانونية): /contact
`;


  const defaultEn = `
# Consumer Information (Global)

**Version 2.2 – Last updated: 16 June 2025**

---

## 1. Your consumer rights

1.1. **Clear information** about services, prices and conditions.  
1.2. **Withdrawal right** where mandatory local law applies (see implementation conditions with the provider and the Platform).  
1.3. **Protection** against unfair or misleading commercial practices.  
1.4. **Access** to responsive customer service via the **contact form**.

---

## 2. Refund policy

2.1. **Automatic refund**: if your expert does not answer after **3 call attempts** within the expected window, the booking is **cancelled** and you receive a **full refund**.  
2.2. **Other situations**: contact support **within 24h** after the call via the **contact form** so we can review your request.

---

## 3. Price transparency (EUR / USD)

3.1. **Lawyer call**: **€49 (EUR)** / **$55 (USD)** for **20 minutes** (tax included).  
3.2. **Expat Helper call**: **€19 (EUR)** / **$25 (USD)** for **30 minutes** (tax included).  
3.3. **No hidden fees**; the displayed price includes, where applicable, the technical connection fee.  
3.4. **USD** amounts can be displayed and charged at **checkout**; **FX rates/fees** from the payment processor may apply.

---

## 4. Mediation and complaints

4.1. **Support via contact form**: /contact  
4.2. **Consumer mediation**: you may contact the competent mediator in your country.  
4.3. **EU ODR platform**: you may use the online dispute resolution mechanism.

---

## 5. Customer service (international)

5.1. **Hours**: 24/7  
5.2. **Response time**: within 24h  
5.3. **Contact**: please use the **contact form**: /contact

---

## 6. Contact

Contact form (support & legal requests): /contact
`;

  const defaultEs = `
# Información del Consumidor (Global)

**Versión 2.2 – Última actualización: 16 de junio de 2025**

---

## 1. Sus derechos como consumidor

1.1. **Información clara** sobre servicios, precios y condiciones.
1.2. **Derecho de desistimiento** según la ley local obligatoria cuando sea aplicable (ver condiciones de implementación con el proveedor y la Plataforma).
1.3. **Protección** contra prácticas comerciales desleales o engañosas.
1.4. **Acceso** a un servicio al cliente receptivo a través del **formulario de contacto**.

---

## 2. Política de reembolso

2.1. **Reembolso automático**: si su experto no responde después de **3 intentos de llamada** dentro de la ventana esperada, la reserva se **cancela** y recibe un **reembolso completo**.
2.2. **Otras situaciones**: contacte al soporte **dentro de las 24 horas** después de la llamada a través del **formulario de contacto** para que podamos revisar su solicitud.

---

## 3. Transparencia de precios (EUR / USD)

3.1. **Llamada con abogado**: **49€ (EUR)** / **$55 (USD)** por **20 minutos** (impuestos incluidos).
3.2. **Llamada con ayudante expatriado**: **19€ (EUR)** / **$25 (USD)** por **30 minutos** (impuestos incluidos).
3.3. **Sin tarifas ocultas**; el precio mostrado incluye, cuando corresponda, la tarifa técnica de conexión.
3.4. Los montos en **USD** pueden mostrarse y cobrarse en el **pago**; pueden aplicarse **tarifas/tasas de cambio** del procesador de pagos.

---

## 4. Mediación y reclamaciones

4.1. **Soporte a través del formulario de contacto**: /contact
4.2. **Mediación del consumidor**: puede contactar al mediador competente en su país.
4.3. **Plataforma ODR de la UE**: puede utilizar el mecanismo de resolución de disputas en línea.

---

## 5. Servicio al cliente (internacional)

5.1. **Horario**: 24/7
5.2. **Tiempo de respuesta**: dentro de 24 horas
5.3. **Contacto**: por favor use el **formulario de contacto**: /contact

---

## 6. Contacto

Formulario de contacto (soporte y solicitudes legales): /contact
`;

  const defaultDe = `
# Verbraucherinformationen (Global)

**Version 2.2 – Letzte Aktualisierung: 16. Juni 2025**

---

## 1. Ihre Verbraucherrechte

1.1. **Klare Informationen** über Dienstleistungen, Preise und Bedingungen.
1.2. **Widerrufsrecht**, wo zwingendes lokales Recht gilt (siehe Umsetzungsbedingungen beim Anbieter und der Plattform).
1.3. **Schutz** vor unlauteren oder irreführenden Geschäftspraktiken.
1.4. **Zugang** zu reaktionsfähigem Kundendienst über das **Kontaktformular**.

---

## 2. Rückerstattungsrichtlinie

2.1. **Automatische Rückerstattung**: Wenn Ihr Experte nach **3 Anrufversuchen** innerhalb des erwarteten Zeitfensters nicht antwortet, wird die Buchung **storniert** und Sie erhalten eine **vollständige Rückerstattung**.
2.2. **Andere Situationen**: Kontaktieren Sie den Support **innerhalb von 24 Stunden** nach dem Anruf über das **Kontaktformular**, damit wir Ihre Anfrage prüfen können.

---

## 3. Preistransparenz (EUR / USD)

3.1. **Anwaltsanruf**: **49€ (EUR)** / **$55 (USD)** für **20 Minuten** (inkl. Steuern).
3.2. **Expat-Helfer-Anruf**: **19€ (EUR)** / **$25 (USD)** für **30 Minuten** (inkl. Steuern).
3.3. **Keine versteckten Gebühren**; der angezeigte Preis umfasst gegebenenfalls die technische Verbindungsgebühr.
3.4. **USD**-Beträge können an der **Kasse** angezeigt und berechnet werden; **Wechselkurse/Gebühren** des Zahlungsabwicklers können anfallen.

---

## 4. Mediation und Beschwerden

4.1. **Support über Kontaktformular**: /contact
4.2. **Verbrauchermediation**: Sie können den zuständigen Mediator in Ihrem Land kontaktieren.
4.3. **EU-ODR-Plattform**: Sie können den Online-Streitbeilegungsmechanismus nutzen.

---

## 5. Kundendienst (international)

5.1. **Öffnungszeiten**: 24/7
5.2. **Antwortzeit**: innerhalb von 24 Stunden
5.3. **Kontakt**: Bitte verwenden Sie das **Kontaktformular**: /contact

---

## 6. Kontakt

Kontaktformular (Support und rechtliche Anfragen): /contact
`;

  const defaultRu = `
# Информация для потребителей (Глобальная)

**Версия 2.2 – Последнее обновление: 16 июня 2025**

---

## 1. Ваши права потребителя

1.1. **Четкая информация** об услугах, ценах и условиях.
1.2. **Право на отказ**, где применяется обязательное местное законодательство (см. условия реализации у поставщика и Платформы).
1.3. **Защита** от недобросовестных или вводящих в заблуждение коммерческих практик.
1.4. **Доступ** к отзывчивой службе поддержки через **контактную форму**.

---

## 2. Политика возврата

2.1. **Автоматический возврат**: если ваш эксперт не отвечает после **3 попыток звонка** в ожидаемом окне, бронирование **отменяется** и вы получаете **полный возврат средств**.
2.2. **Другие ситуации**: свяжитесь со службой поддержки **в течение 24 часов** после звонка через **контактную форму**, чтобы мы могли рассмотреть вашу просьбу.

---

## 3. Прозрачность цен (EUR / USD)

3.1. **Звонок юристу**: **49€ (EUR)** / **$55 (USD)** на **20 минут** (включая налоги).
3.2. **Звонок помощнику-экспату**: **19€ (EUR)** / **$25 (USD)** на **30 минут** (включая налоги).
3.3. **Без скрытых комиссий**; указанная цена включает, где применимо, техническую плату за соединение.
3.4. Суммы в **USD** могут отображаться и взиматься при **оплате**; могут применяться **курсы/сборы** платежного процессора.

---

## 4. Медиация и жалобы

4.1. **Поддержка через контактную форму**: /contact
4.2. **Медиация потребителей**: вы можете связаться с компетентным медиатором в вашей стране.
4.3. **Платформа ODR ЕС**: вы можете использовать механизм онлайн-разрешения споров.

---

## 5. Служба поддержки (международная)

5.1. **Часы работы**: 24/7
5.2. **Время ответа**: в течение 24 часов
5.3. **Контакт**: пожалуйста, используйте **контактную форму**: /contact

---

## 6. Контакт

Контактная форма (поддержка и юридические запросы): /contact
`;

  const defaultHi = `
# उपभोक्ता सूचना (वैश्विक)

**संस्करण 2.2 – अंतिम अपडेट: 16 जून 2025**

---

## 1. आपके उपभोक्ता अधिकार

1.1. सेवाओं, कीमतों और शर्तों के बारे में **स्पष्ट जानकारी**।
1.2. जहां अनिवार्य स्थानीय कानून लागू होता है, वहां **वापसी का अधिकार** (प्रदाता और प्लेटफ़ॉर्म के साथ कार्यान्वयन की शर्तें देखें)।
1.3. अनुचित या भ्रामक व्यावसायिक प्रथाओं के खिलाफ **सुरक्षा**।
1.4. **संपर्क फॉर्म** के माध्यम से उत्तरदायी ग्राहक सेवा तक **पहुंच**।

---

## 2. रिफंड नीति

2.1. **स्वचालित रिफंड**: यदि आपका विशेषज्ञ अपेक्षित समय सीमा में **3 कॉल प्रयासों** के बाद उत्तर नहीं देता है, तो बुकिंग **रद्द** कर दी जाती है और आपको **पूर्ण रिफंड** प्राप्त होता है।
2.2. **अन्य स्थितियां**: कॉल के बाद **24 घंटे के भीतर** **संपर्क फॉर्म** के माध्यम से सहायता से संपर्क करें ताकि हम आपके अनुरोध की समीक्षा कर सकें।

---

## 3. मूल्य पारदर्शिता (EUR / USD)

3.1. **वकील कॉल**: **49€ (EUR)** / **$55 (USD)** **20 मिनट** के लिए (कर सहित)।
3.2. **प्रवासी सहायक कॉल**: **19€ (EUR)** / **$25 (USD)** **30 मिनट** के लिए (कर सहित)।
3.3. **कोई छिपा हुआ शुल्क नहीं**; प्रदर्शित मूल्य में, जहां लागू हो, तकनीकी कनेक्शन शुल्क शामिल है।
3.4. **USD** राशि **चेकआउट** पर प्रदर्शित और चार्ज की जा सकती है; भुगतान प्रोसेसर से **विनिमय दरें/शुल्क** लागू हो सकते हैं।

---

## 4. मध्यस्थता और शिकायतें

4.1. **संपर्क फॉर्म के माध्यम से सहायता**: /contact
4.2. **उपभोक्ता मध्यस्थता**: आप अपने देश में सक्षम मध्यस्थ से संपर्क कर सकते हैं।
4.3. **EU ODR प्लेटफ़ॉर्म**: आप ऑनलाइन विवाद समाधान तंत्र का उपयोग कर सकते हैं।

---

## 5. ग्राहक सेवा (अंतर्राष्ट्रीय)

5.1. **घंटे**: 24/7
5.2. **प्रतिक्रिया समय**: 24 घंटे के भीतर
5.3. **संपर्क**: कृपया **संपर्क फॉर्म** का उपयोग करें: /contact

---

## 6. संपर्क

संपर्क फॉर्म (सहायता और कानूनी अनुरोध): /contact
`;

const defaultPt = `
# Informações do Consumidor (Global)


**Versão 2.2 – Última atualização: 16 de junho de 2025**


---


## 1. Seus direitos como consumidor


1.1. **Informação clara** sobre os serviços, preços e condições.
1.2. **Direito de retratação** quando a lei local obrigatória se aplica (consulte as condições de aplicação com o prestador e a plataforma).
1.3. **Proteção** contra práticas comerciais desleais ou enganosas.
1.4. **Acesso** a um atendimento ao cliente responsivo por meio do **formulário de contato**.


---


## 2. Política de reembolso


2.1. **Reembolso automático**: Se o seu especialista não responder após **3 tentativas de chamada** dentro do prazo esperado, a reserva é **cancelada** e você recebe um **reembolso total**.
2.2. **Outras situações**: Entre em contato com o suporte por meio do **formulário de contato** dentro de **24 horas** após a chamada para que possamos analisar sua solicitação.


---


## 3. Transparência de preços (EUR / USD)


3.1. **Chamada com advogado**: **49€ (EUR)** / **$55 (USD)** por **20 minutos** (incluindo impostos).
3.2. **Chamada com assistente expatriado**: **19€ (EUR)** / **$25 (USD)** por **30 minutos** (incluindo impostos).
3.3. **Sem taxas ocultas**; o preço exibido inclui a taxa de conexão técnica, quando aplicável.
3.4. Os valores em **USD** podem ser exibidos e cobrados no **checkout**; **taxas de câmbio/taxas** do processador de pagamento podem se aplicar.


---


## 4. Mediação e reclamações


4.1. **Suporte por formulário de contato**: /contact
4.2. **Mediação de consumo**: Você pode entrar em contato com o mediador competente em seu país.
4.3. **Plataforma ODR da UE**: Você pode usar o mecanismo de resolução de litígios online.


---


## 5. Atendimento ao cliente (internacional)


5.1. **Horário**: 24/7
5.2. **Tempo de resposta**: Dentro de 24 horas
5.3. **Contato**: Use o **formulário de contato**: /contact


---


## 6. Contato


Formulário de contato (suporte e solicitações legais): /contact
`;

const defaultCh = `
    消费者信息（全球）

    版本 2.2 – 最后更新：2025年6月16日

    1. 您的消费者权利

    1.1. 有关服务、价格和条件的清晰信息。
    1.2. 在适用的强制性当地法律规定下享有撤销权（请参阅与服务提供方及平台的实施条件）。
    1.3. 享有防止不公平或误导性商业行为的保护。
    1.4. 通过联系表单获得响应迅速的客户服务访问权。

    2. 退款政策

    2.1. 自动退款：如果您的专家在预期时间内 3 次通话尝试后仍未接听，预订将被取消，您将获得全额退款。
    2.2. 其他情况：请在通话后 24 小时内 通过联系表单联系支持团队，以便我们审核您的请求。

    3. 价格透明度（欧元 / 美元）

    3.1. 律师咨询电话：€49（欧元） / $55（美元），20 分钟（含税）。
    3.2. 外籍人士协助通话：€19（欧元） / $25（美元），30 分钟（含税）。
    3.3. 无隐藏费用；显示的价格在适用情况下包含技术连接费用。
    3.4. 可在结账时选择以 美元（USD） 显示和支付；支付处理方的汇率/手续费可能适用。

    4. 调解与投诉

    4.1. 通过联系表单获取支持：/contact

    4.2. 消费者调解：您可以联系所在国家的主管调解机构。
    4.3. 欧盟ODR平台：您可以使用在线争议解决机制。

    5. 客户服务（国际）

    5.1. 服务时间：全天候（24/7）
    5.2. 回复时间：24小时内
    5.3. 联系方式：请使用联系表单：/contact

    6. 联系方式

    联系表单（支持与法律请求）：/contact
`


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
            : selectedLanguage === "hi"
              ? defaultHi 
              : selectedLanguage === "pt"
                ? defaultPt 
                : selectedLanguage === "ch"
                ? defaultCh
                  : selectedLanguage === "ar"
                    ? defaultAr
              : defaultEn;

  // Sommaire
  const anchorMap = useMemo(
    () => [
      { num: 1, label: t.sections.rights },
      { num: 2, label: t.sections.refunds },
      { num: 3, label: t.sections.prices },
      { num: 4, label: t.sections.mediation },
      { num: 5, label: t.sections.support },
      { num: 6, label: t.sections.contact },
    ],
    [t.sections]
  );

  const body = content || defaultContent;

  return (
    <Layout>
      <main className="min-h-screen bg-gray-950">
        {/* HERO */}
        <section className="relative pt-20 pb-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-fuchsia-500/10 pointer-events-none" />
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-500/20 to-fuchsia-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-fuchsia-500/20 to-pink-500/20 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 max-w-6xl mx-auto px-6">
            {/* Badge + langues */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
              <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-full pl-5 pr-4 py-2.5 border border-white/20 text-white">
                <Clock className="w-4 h-4 text-fuchsia-300" />
                <span className="text-sm font-semibold">{t.lastUpdated}</span>
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
                  <ShoppingCart className="w-12 h-12 text-white" />
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
                    icon: <AlertTriangle className="w-6 h-6" />,
                    text: t.features[0],
                    gradient: "from-emerald-500 to-green-500",
                  },
                  {
                    icon: <Shield className="w-6 h-6" />,
                    text: t.features[1],
                    gradient: "from-blue-500 to-indigo-500",
                  },
                  {
                    icon: <Check className="w-6 h-6" />,
                    text: t.features[2],
                    gradient: "from-yellow-500 to-orange-500",
                  },
                  {
                    icon: <Phone className="w-6 h-6" />,
                    text: t.features[3],
                    gradient: "from-purple-500 to-fuchsia-500",
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
                  href="/contact"
                  className="group inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 text-white font-bold border-2 border-purple-400/50 hover:scale-105 transition-all"
                >
                  <Globe className="w-5 h-5" />
                  <span>{t.contactCta}</span>
                </a>
              </div>
            </header>
          </div>
        </section>

        {/* Sommaire */}
        <section className="py-8 bg-gradient-to-b from-white to-gray-50">
          <div className="max-w-6xl mx-auto px-6">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white">
                  <ShoppingCart className="w-5 h-5" />
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
                  {parseMarkdownContent(content || defaultContent)}
                </div>

                {/* Cartes prix (EUR / USD) visibles même si contenu provient d'admin, pour clarifier l'international */}
                {/* <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {selectedLanguage === "fr"
                        ? "Appel Avocat"
                        : "Lawyer Call"}
                    </h3>
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-extrabold text-gray-900">
                        49€
                      </span>
                      <span className="text-gray-500 font-medium">EUR</span>
                      <span className="text-gray-400">/</span>
                      <span className="text-3xl font-extrabold text-gray-900">
                        $55
                      </span>
                      <span className="text-gray-500 font-medium">USD</span>
                      <span className="ml-2 text-sm text-gray-500">
                        {selectedLanguage === "fr"
                          ? "pour 20 min"
                          : "for 20 min"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      {selectedLanguage === "fr"
                        ? "Affichage et paiement possibles en EUR ou USD selon votre choix."
                        : "Display and payment available in EUR or USD at your choice."}
                    </p>
                  </div>

                  <div className="p-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {selectedLanguage === "fr"
                        ? "Appel Expatrié Aidant"
                        : "Expat Helper Call"}
                    </h3>
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-extrabold text-gray-900">
                        19€
                      </span>
                      <span className="text-gray-500 font-medium">EUR</span>
                      <span className="text-gray-400">/</span>
                      <span className="text-3xl font-extrabold text-gray-900">
                        $25
                      </span>
                      <span className="text-gray-500 font-medium">USD</span>
                      <span className="ml-2 text-sm text-gray-500">
                        {selectedLanguage === "fr"
                          ? "pour 30 min"
                          : "for 30 min"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      {selectedLanguage === "fr"
                        ? "Montants affichés à titre indicatif ; le taux/frais de conversion du prestataire de paiement peuvent s’appliquer."
                        : "Amounts are indicative; payment processor FX rates/fees may apply."}
                    </p>
                  </div>
                </div> */}

                {/* Cartes prix (EUR / USD) visibles même si contenu provient d'admin, pour clarifier l'international */}
                <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {t.lawyerCall}
                    </h3>
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-extrabold text-gray-900">
                        49€
                      </span>
                      <span className="text-gray-500 font-medium">EUR</span>
                      <span className="text-gray-400">/</span>
                      <span className="text-3xl font-extrabold text-gray-900">
                        $55
                      </span>
                      <span className="text-gray-500 font-medium">USD</span>
                      <span className="ml-2 text-sm text-gray-500">
                        {t.forMinutes20}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{t.eurDisplay}</p>
                  </div>

                  <div className="p-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {t.expatHelperCall}
                    </h3>
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-extrabold text-gray-900">
                        19€
                      </span>
                      <span className="text-gray-500 font-medium">EUR</span>
                      <span className="text-gray-400">/</span>
                      <span className="text-3xl font-extrabold text-gray-900">
                        $25
                      </span>
                      <span className="text-gray-500 font-medium">USD</span>
                      <span className="ml-2 text-sm text-gray-500">
                        {t.forMinutes30}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{t.usdDisplay}</p>
                  </div>
                </div>

                {/* Bloc service client sans email, bouton vers contact */}
                {/* <div
                  id="section-5"
                  className="mt-12 rounded-3xl border border-gray-200 bg-white p-6 sm:p-10 shadow-sm"
                >
                  <h2 className="text-2xl font-black text-gray-900 mb-4">
                    {t.sections.support}
                  </h2>
                  <p className="text-gray-700">
                    {selectedLanguage === "fr"
                      ? "Horaires : 24/7 • Temps de réponse : sous 24h. Pour toute demande, utilisez notre formulaire."
                      : "Hours: 24/7 • Response time: within 24h. For any request, please use our contact form."}
                  </p>
                  <a
                    href="/contact"
                    className="mt-6 inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 text-white font-bold border-2 border-purple-400/50 hover:scale-105 transition-all"
                  >
                    <Globe className="w-5 h-5" />
                    {t.contactCta}
                  </a>
                </div> */}
                {/* Bloc service client sans email, bouton vers contact */}
                <div
                  id="section-5"
                  className="mt-12 rounded-3xl border border-gray-200 bg-white p-6 sm:p-10 shadow-sm"
                >
                  <h2 className="text-2xl font-black text-gray-900 mb-4">
                    {t.sections.support}
                  </h2>
                  <p className="text-gray-700">{t.serviceHours}</p>
                  <a
                    href="/contact"
                    className="mt-6 inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 text-white font-bold border-2 border-purple-400/50 hover:scale-105 transition-all"
                  >
                    <Globe className="w-5 h-5" />
                    {t.contactCta}
                  </a>
                </div>
              </article>
            )}
          </div>
        </section>
      </main>
    </Layout>
  );
};

export default Consumers;
