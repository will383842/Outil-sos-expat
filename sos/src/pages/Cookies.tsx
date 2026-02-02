import React, { useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import {
  Cookie as CookieIcon,
  Settings,
  Eye,
  Shield,
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

const Cookies: React.FC = () => {
  const { language } = useApp();

  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  const [selectedLanguage, setSelectedLanguage] = useState<
    "fr" | "en" | "es" | "de" | "ru" | "hi" | "ch" | "pt" | "ar"
  >((language as "fr" | "en" | "es" | "de" | "ru" | "hi" | "ch" | "pt" | "ar") || "fr");

  // Rester aligné avec la langue globale si elle change
  useEffect(() => {
    if (language)
      setSelectedLanguage(language as "fr" | "en" | "es" | "de" | "ru" | "hi" | "ch" | "pt" | "ar");
  }, [language]);

  // Récupération Firestore (même logique métier)
  useEffect(() => {
    const fetchCookiesPolicy = async () => {
      try {
        setIsLoading(true);
        setHasError(false);
        const q = query(
          collection(db, "legal_documents"),
          where("type", "==", "cookies"),
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
        console.error("Error fetching cookies policy:", error);
        setHasError(true);
        setContent(""); // Fallback to default content
      } finally {
        setIsLoading(false);
      }
    };

    fetchCookiesPolicy();
  }, [selectedLanguage]);

  // Traductions d'UI
  const translations = {
    fr: {
      title: "Politique des Cookies",
      subtitle: "Comment nous utilisons les cookies sur notre site",
      lastUpdated: "Version 2.2 – Dernière mise à jour : 16 juin 2025",
      loading: "Chargement...",
      features: [
        "Bannière de consentement",
        "Contrôle granulaire",
        "Respect RGPD",
        "Transparence totale",
      ],
      anchorTitle: "Sommaire",
      contactCta: "Nous contacter",
      editHint: "Document éditable depuis la console admin",
    },
    en: {
      title: "Cookie Policy",
      subtitle: "How we use cookies on our site",
      lastUpdated: "Version 2.2 – Last updated: 16 June 2025",
      loading: "Loading...",
      features: [
        "Consent banner",
        "Granular control",
        "GDPR compliant",
        "Full transparency",
      ],
      anchorTitle: "Overview",
      contactCta: "Contact us",
      editHint: "Document editable from the admin console",
    },
    es: {
      title: "Política de Cookies",
      subtitle: "Cómo utilizamos las cookies en nuestro sitio",
      lastUpdated: "Versión 2.2 – Última actualización: 16 de junio de 2025",
      loading: "Cargando...",
      features: [
        "Banner de consentimiento",
        "Control granular",
        "Cumplimiento RGPD",
        "Transparencia total",
      ],
      anchorTitle: "Resumen",
      contactCta: "Contáctanos",
      editHint: "Documento editable desde la consola de administración",
    },
    de: {
      title: "Cookie-Richtlinie",
      subtitle: "Wie wir Cookies auf unserer Website verwenden",
      lastUpdated: "Version 2.2 – Letzte Aktualisierung: 16. Juni 2025",
      loading: "Wird geladen...",
      features: [
        "Einwilligungsbanner",
        "Granulare Kontrolle",
        "DSGVO-konform",
        "Volle Transparenz",
      ],
      anchorTitle: "Übersicht",
      contactCta: "Kontaktieren Sie uns",
      editHint: "Dokument bearbeitbar über die Admin-Konsole",
    },
    ru: {
      title: "Политика использования файлов cookie",
      subtitle: "Как мы используем файлы cookie на нашем сайте",
      lastUpdated: "Версия 2.2 – Последнее обновление: 16 июня 2025",
      loading: "Загрузка...",
      features: [
        "Баннер согласия",
        "Детальный контроль",
        "Соответствие GDPR",
        "Полная прозрачность",
      ],
      anchorTitle: "Обзор",
      contactCta: "Свяжитесь с нами",
      editHint: "Документ редактируется через консоль администратора",
    },
    hi: {
      title: "कुकीज़ नीति",
      subtitle: "हम अपनी साइट पर कुकीज़ का उपयोग कैसे करते हैं",
      lastUpdated: "संस्करण 2.2 – अंतिम अपडेट: 16 जून 2025",
      loading: "लोड हो रहा है...",
      features: [
        "सहमति बैनर",
        "विस्तृत नियंत्रण",
        "GDPR अनुपालन",
        "पूर्ण पारदर्शिता",
      ],
      anchorTitle: "सारांश",
      contactCta: "हमसे संपर्क करें",
      editHint: "एडमिन कंसोल से संपादन योग्य दस्तावेज़",
    },
    ch: {
      title: "Cookie 政策",
      subtitle: "我们在网站上如何使用 Cookie",
      lastUpdated: "版本 2.2 – 最后更新：2025年6月16日",
      loading: "加载中...",
      features: [
        "同意横幅",
        "细化控制",
        "符合 GDPR",
        "完全透明",
      ],
      anchorTitle: "概览",
      contactCta: "联系我们",
      editHint: "可从管理控制台编辑文档",
    },
      pt: {
  title: "Política de Cookies",
  subtitle: "Como usamos cookies em nosso site",
  lastUpdated: "Versão 2.2 – Última atualização: 16 de junho de 2025",
  loading: "Carregando...",
  features: [
    "Banner de consentimento",
    "Controle granular",
    "Conformidade com GDPR",
    "Transparência total",
  ],
  anchorTitle: "Resumo",
  contactCta: "Entre em contato conosco",
  editHint: "Documento editável no console do administrador",
    },
      ar: {
  title: "سياسة ملفات تعريف الارتباط",
  subtitle: "كيف نستخدم ملفات تعريف الارتباط على موقعنا",
  lastUpdated: "الإصدار 2.2 – آخر تحديث: 16 يونيو 2025",
  loading: "جارٍ التحميل...",
  features: [
    "لافتة الموافقة",
    "تحكم دقيق",
    "متوافق مع اللائحة العامة لحماية البيانات",
    "شفافية كاملة",
  ],
  anchorTitle: "نظرة عامة",
  contactCta: "اتصل بنا",
  editHint: "مستند قابل للتحرير من وحدة التحكم الإدارية",
}
  };

  const t = translations[selectedLanguage];

  const handleLanguageChange = (newLang: "fr" | "en") => {
    setSelectedLanguage(newLang);
  };

  // -------- Parser Markdown (même logique que les autres pages) --------
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
            className="text-3xl sm:text-4xl font-black text-gray-900 mb-6 mt-8 border-b-2 border-orange-500 pb-4"
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
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white text-sm font-bold shadow-lg">
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
            className="text-lg font-bold text-gray-800 mt-6 mb-4 border-l-4 border-orange-500 pl-4"
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
            className="bg-gray-50 border-l-4 border-orange-500 rounded-r-xl p-5 my-4 hover:bg-gray-100 transition-colors duration-200"
          >
            <p className="text-gray-800 leading-relaxed">
              <span className="font-bold text-orange-600 mr-2">{number}</span>
              <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formatted) }} />
            </p>
          </div>
        );
        continue;
      }

      // Bloc contact spécial (redirige vers /contact)
      if (
        line.toLowerCase().includes("contact") &&
        line.toLowerCase().includes("/contact")
      ) {
        elements.push(
          <div
            key={currentIndex++}
            className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-2xl p-8 my-8 shadow-lg"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold shadow-lg">
                !
              </span>
              {selectedLanguage === "fr" ? "Contact" : "Contact"}
            </h3>
            <p className="text-gray-800 leading-relaxed mb-6 text-lg">{line}</p>
            <a
              href="/contact"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              <Globe className="w-5 h-5" />
              {/* {selectedLanguage === "fr"
                ? "Formulaire de contact"
                : "Contact form"} */}

              {t.contactCta}
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
            className="bg-gradient-to-r from-amber-50 to-orange-50 border border-orange-200 rounded-2xl p-6 my-6"
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

  // ---------- Contenu par défaut (bilingue) ----------


  const defaultHi = `
# कुकीज़ नीति

**संस्करण 2.2 – अंतिम अपडेट: 16 जून 2025**

---

## 1. कुकी क्या है?

एक **कुकी** एक छोटी टेक्स्ट फ़ाइल है जो किसी वेबसाइट पर जाने पर आपके डिवाइस (कंप्यूटर, मोबाइल, टैबलेट) पर संग्रहीत की जाती है। यह साइट को **आपके डिवाइस को पहचानने**, आपकी प्राथमिकताओं को **याद रखने** और आपके अनुभव को **बेहतर बनाने** में मदद करती है।

---

## 2. हम कुकीज़ का उपयोग क्यों करते हैं?

2.1. **आवश्यक संचालन**: प्रमाणीकरण, सुरक्षा, भाषा चयन और आपके सत्र को बनाए रखना सुनिश्चित करना।
2.2. **ऑडियंस माप**: साइट के उपयोग को समझना ताकि इसे बेहतर बनाया जा सके (देखे गए पेज, बिताया गया समय, घटनाएं)।
2.3. **प्रदर्शन**: लोडिंग गति और स्थिरता को अनुकूलित करना।
2.4. **संचार**: टेलीफोनी/वीडियो और तकनीकी सूचनाओं को सक्षम करना।

---

## 3. कुकीज़ के प्रकार

3.1. **आवश्यक कुकीज़**: साइट के संचालन के लिए सख्ती से आवश्यक।
3.2. **विश्लेषणात्मक कुकीज़**: एकत्रित उपयोग के आंकड़े, जहां संभव हो गुमनाम किए गए।
3.3. **प्रदर्शन कुकीज़**: प्रदर्शन सुधार, कैश और सामग्री वितरण।

---

## 4. कानूनी आधार और अवधि

4.1. **आवश्यक**: वैध हित (अनुरोधित सेवा प्रदान करना)।
4.2. **विश्लेषणात्मक/प्रदर्शन**: बैनर के माध्यम से **आपकी सहमति**।
4.3. **अवधि**: सत्र (बंद करने पर हटा दिया गया) या स्थायी (उद्देश्य के आधार पर कुछ घंटों से अधिकतम 13 महीने तक)।

---

## 5. आपकी सहमति का प्रबंधन

5.1. आप हमारे **सहमति बैनर** के माध्यम से गैर-आवश्यक श्रेणियों को **स्वीकार/अस्वीकार** कर सकते हैं।
5.2. आप किसी भी समय पेज के निचले भाग में "कुकी प्राथमिकताएं" लिंक से **अपनी सहमति वापस ले सकते हैं**।
5.3. कुकीज़ को ब्लॉक/हटाने के लिए अपने **ब्राउज़र** को भी कॉन्फ़िगर करें।

---

## 6. तृतीय पक्षों द्वारा जारी कुकीज़

हम ऐसे प्रदाताओं का उपयोग कर सकते हैं जो अपनी स्वयं की कुकीज़ जमा कर सकते हैं: **Stripe** (भुगतान), **Twilio** (टेलीफोनी), **Firebase** (प्रमाणीकरण/डेटाबेस/होस्टिंग) और, सक्रियण के आधार पर, एक **ऑडियंस विश्लेषण** उपकरण। ये तृतीय पक्ष **EU के बाहर** काम कर सकते हैं; आवश्यकता पड़ने पर **उपयुक्त सुरक्षा उपाय** लागू किए जाते हैं।

---

## 7. अंतर्राष्ट्रीय स्थानांतरण

जब डेटा स्थानांतरण आपके देश के बाहर होता है, तो हम सुनिश्चित करते हैं कि वे मान्यता प्राप्त **सुरक्षा तंत्रों** (मानक संविदात्मक खंड, पर्याप्तता निर्णय, आदि) पर आधारित हों जब कानून की आवश्यकता हो।

---

## 8. आपके अधिकार

लागू कानून (जैसे GDPR) के अनुसार, आपके पास कानून द्वारा प्रदान की गई शर्तों के तहत **पहुंच**, **सुधार**, **मिटाने**, **आपत्ति**, **सीमा** और **पोर्टेबिलिटी** के अधिकार हैं। आप हमारे **संपर्क फॉर्म** के माध्यम से अपने अधिकारों का प्रयोग कर सकते हैं: /contact

---

## 9. इस नीति का अद्यतन

हम नियामक या तकनीकी विकास को प्रतिबिंबित करने के लिए इस नीति को संशोधित कर सकते हैं। अद्यतन संस्करण **अपडेट तारीख** के साथ इस पृष्ठ पर प्रकाशित किया गया है।

---

## 10. संपर्क

कुकीज़ या डेटा सुरक्षा से संबंधित किसी भी प्रश्न के लिए, हमसे संपर्क करें: [**/contact**](/contact)
`;

  
  const defaultFr = `
# Politique des Cookies

**Version 2.2 – Dernière mise à jour : 16 juin 2025**

---

## 1. Qu’est-ce qu’un cookie ?

Un **cookie** est un petit fichier texte déposé sur votre terminal (ordinateur, mobile, tablette) lorsque vous visitez un site. Il permet au site de **reconnaître votre appareil**, de **mémoriser** vos préférences et d’**améliorer** votre expérience.

---

## 2. Pourquoi utilisons-nous des cookies ?

2.1. **Fonctionnement essentiel** : assurer l’authentification, la sécurité, la sélection de la langue et le maintien de votre session.  
2.2. **Mesure d’audience** : comprendre l’usage du site pour l’améliorer (pages visitées, temps passé, événements).  
2.3. **Performance** : optimiser la vitesse de chargement et la stabilité.  
2.4. **Communication** : permettre la téléphonie/visio et les notifications techniques.

---

## 3. Types de cookies

3.1. **Cookies essentiels** : strictement nécessaires au fonctionnement du site.  
3.2. **Cookies analytiques** : statistiques d’usage agrégées et anonymisées lorsque possible.  
3.3. **Cookies de performance** : amélioration de l’affichage, cache et distribution de contenu.

---

## 4. Base légale et durée

4.1. **Essentiels** : intérêt légitime (fournir le service demandé).  
4.2. **Analytiques/Performance** : **votre consentement** via la bannière.  
4.3. **Durées** : session (effacés à la fermeture) ou persistants (quelques heures à 13 mois max selon la finalité).

---

## 5. Gestion de votre consentement

5.1. Vous pouvez **accepter/refuser** les catégories non essentielles via notre **bannière de consentement**.  
5.2. Vous pouvez à tout moment **retirer votre consentement** depuis le lien « Préférences cookies » en bas de page.  
5.3. Paramétrez également votre **navigateur** pour bloquer/supprimer les cookies.

---

## 6. Cookies émis par des tiers

Nous pouvons utiliser des prestataires susceptibles de déposer leurs propres cookies : **Stripe** (paiement), **Twilio** (téléphonie), **Firebase** (auth/BDD/hébergement) et, selon activation, un outil d’**analyse d’audience**. Ces tiers sont susceptibles d’opérer **hors UE** ; des **garanties appropriées** sont mises en place lorsque requis.

---

## 7. Transferts internationaux

Lorsque des transferts de données s’opèrent hors de votre pays, nous nous assurons qu’ils reposent sur des **mécanismes de protection** reconnus (clauses contractuelles types, décision d’adéquation, etc.) lorsque la loi l’exige.

---

## 8. Vos droits

Conformément au droit applicable (ex. RGPD), vous disposez de droits d’**accès**, **rectification**, **effacement**, **opposition**, **limitation** et **portabilité** dans les conditions prévues par la loi. Vous pouvez exercer vos droits via notre **formulaire de contact** : /contact

---

## 9. Mise à jour de cette politique

Nous pouvons modifier cette politique pour refléter les évolutions réglementaires ou techniques. La version à jour est publiée sur cette page avec la **date de mise à jour**.

---

## 10. Contact

Pour toute question relative aux cookies ou à la protection des données, contactez-nous : **/contact**
`;

  const defaultEn = `
# Cookie Policy

**Version 2.2 – Last updated: 16 June 2025**

---

## 1. What is a cookie?

A **cookie** is a small text file stored on your device when visiting a website. It helps the site **recognise your device**, **remember** your preferences and **improve** your experience.

---

## 2. Why do we use cookies?

2.1. **Essential operation**: authentication, security, language preference, session continuity.  
2.2. **Analytics**: understanding how the site is used to improve it.  
2.3. **Performance**: optimising speed and stability.  
2.4. **Communication**: enabling telephony/video and technical notifications.

---

## 3. Types of cookies

3.1. **Essential cookies**: strictly necessary for the service you request.  
3.2. **Analytics cookies**: aggregated statistics, anonymised where possible.  
3.3. **Performance cookies**: caching/CDN and rendering improvements.

---

## 4. Legal basis and duration

4.1. **Essential**: legitimate interests (to deliver the service).  
4.2. **Analytics/Performance**: **your consent** via the banner.  
4.3. **Durations**: session or persistent (from a few hours up to 13 months, depending on purpose).

---

## 5. Managing your consent

5.1. You can **accept/decline** non-essential categories via our **consent banner**.  
5.2. You can **withdraw consent** at any time from the **cookie preferences** link in the footer.  
5.3. You may also use your **browser settings** to block/delete cookies.

---

## 6. Third-party cookies

We may rely on providers that can set their own cookies: **Stripe** (payments), **Twilio** (telephony), **Firebase** (auth/DB/hosting) and, if enabled, an **analytics** tool. These providers may operate **outside your country**; **appropriate safeguards** are applied where required.

---

## 7. International transfers

Where data transfers occur outside your country, we rely on **recognised safeguards** (e.g. standard contractual clauses or adequacy decisions) when required by law.

---

## 8. Your rights

Depending on applicable law (e.g., GDPR), you may have rights to **access**, **rectify**, **erase**, **object**, **restrict** and **port** data. You can exercise these via our **contact form**: /contact

---

## 9. Updates to this policy

We may update this policy to reflect regulatory or technical changes. The updated version is published on this page with the **last updated** date.

---

## 10. Contact

For any questions regarding cookies or data protection, please contact us: **/contact**
`;

  const defaultEs = `
# Política de Cookies

**Versión 2.2 – Última actualización: 16 de junio de 2025**

---

## 1. ¿Qué es una cookie?

Una **cookie** es un pequeño archivo de texto almacenado en su dispositivo (ordenador, móvil, tableta) cuando visita un sitio. Permite al sitio **reconocer su dispositivo**, **recordar** sus preferencias y **mejorar** su experiencia.

---

## 2. ¿Por qué utilizamos cookies?

2.1. **Funcionamiento esencial**: garantizar la autenticación, la seguridad, la selección del idioma y el mantenimiento de su sesión.
2.2. **Medición de audiencia**: comprender el uso del sitio para mejorarlo (páginas visitadas, tiempo pasado, eventos).
2.3. **Rendimiento**: optimizar la velocidad de carga y la estabilidad.
2.4. **Comunicación**: permitir la telefonía/videollamada y las notificaciones técnicas.

---

## 3. Tipos de cookies

3.1. **Cookies esenciales**: estrictamente necesarias para el funcionamiento del sitio.
3.2. **Cookies analíticas**: estadísticas de uso agregadas y anonimizadas cuando sea posible.
3.3. **Cookies de rendimiento**: mejora de visualización, caché y distribución de contenido.

---

## 4. Base legal y duración

4.1. **Esenciales**: interés legítimo (proporcionar el servicio solicitado).
4.2. **Analíticas/Rendimiento**: **su consentimiento** a través del banner.
4.3. **Duraciones**: sesión (eliminadas al cerrar) o persistentes (unas pocas horas hasta 13 meses máximo según la finalidad).

---

## 5. Gestión de su consentimiento

5.1. Puede **aceptar/rechazar** las categorías no esenciales a través de nuestro **banner de consentimiento**.
5.2. Puede en cualquier momento **retirar su consentimiento** desde el enlace "Preferencias de cookies" en la parte inferior de la página.
5.3. Configure también su **navegador** para bloquear/eliminar cookies.

---

## 6. Cookies emitidas por terceros

Podemos utilizar proveedores que pueden depositar sus propias cookies: **Stripe** (pago), **Twilio** (telefonía), **Firebase** (autenticación/BD/alojamiento) y, según activación, una herramienta de **análisis de audiencia**. Estos terceros pueden operar **fuera de la UE**; se establecen **garantías apropiadas** cuando sea necesario.

---

## 7. Transferencias internacionales

Cuando se realizan transferencias de datos fuera de su país, nos aseguramos de que se basen en **mecanismos de protección** reconocidos (cláusulas contractuales tipo, decisión de adecuación, etc.) cuando la ley lo exige.

---

## 8. Sus derechos

De conformidad con el derecho aplicable (ej. RGPD), dispone de derechos de **acceso**, **rectificación**, **supresión**, **oposición**, **limitación** y **portabilidad** en las condiciones previstas por la ley. Puede ejercer sus derechos a través de nuestro **formulario de contacto**: /contact

---

## 9. Actualización de esta política

Podemos modificar esta política para reflejar evoluciones regulatorias o técnicas. La versión actualizada se publica en esta página con la **fecha de actualización**.

---

## 10. Contacto

Para cualquier pregunta relacionada con las cookies o la protección de datos, contáctenos: [**/contact**](/contact)
`;

  const defaultDe = `
# Cookie-Richtlinie

**Version 2.2 – Letzte Aktualisierung: 16. Juni 2025**

---

## 1. Was ist ein Cookie?

Ein **Cookie** ist eine kleine Textdatei, die auf Ihrem Gerät (Computer, Mobiltelefon, Tablet) gespeichert wird, wenn Sie eine Website besuchen. Es ermöglicht der Website, **Ihr Gerät zu erkennen**, Ihre Präferenzen zu **speichern** und Ihr Erlebnis zu **verbessern**.

---

## 2. Warum verwenden wir Cookies?

2.1. **Wesentliche Funktionen**: Authentifizierung, Sicherheit, Sprachauswahl und Aufrechterhaltung Ihrer Sitzung sicherstellen.
2.2. **Reichweitenmessung**: Nutzung der Website verstehen, um sie zu verbessern (besuchte Seiten, verbrachte Zeit, Ereignisse).
2.3. **Leistung**: Ladegeschwindigkeit und Stabilität optimieren.
2.4. **Kommunikation**: Telefonie/Video und technische Benachrichtigungen ermöglichen.

---

## 3. Cookie-Typen

3.1. **Notwendige Cookies**: Unbedingt erforderlich für den Betrieb der Website.
3.2. **Analytische Cookies**: Aggregierte und nach Möglichkeit anonymisierte Nutzungsstatistiken.
3.3. **Leistungs-Cookies**: Verbesserung der Anzeige, Cache und Inhaltsverteilung.

---

## 4. Rechtsgrundlage und Dauer

4.1. **Notwendig**: Berechtigtes Interesse (Bereitstellung des angeforderten Dienstes).
4.2. **Analytisch/Leistung**: **Ihre Zustimmung** über das Banner.
4.3. **Laufzeiten**: Sitzung (beim Schließen gelöscht) oder persistent (einige Stunden bis maximal 13 Monate je nach Zweck).

---

## 5. Verwaltung Ihrer Zustimmung

5.1. Sie können nicht wesentliche Kategorien über unser **Zustimmungsbanner** **akzeptieren/ablehnen**.
5.2. Sie können jederzeit **Ihre Zustimmung widerrufen** über den Link "Cookie-Einstellungen" am Seitenende.
5.3. Konfigurieren Sie auch Ihren **Browser**, um Cookies zu blockieren/löschen.

---

## 6. Von Dritten gesetzte Cookies

Wir können Dienstleister nutzen, die ihre eigenen Cookies setzen können: **Stripe** (Zahlung), **Twilio** (Telefonie), **Firebase** (Authentifizierung/Datenbank/Hosting) und, je nach Aktivierung, ein **Analyse-Tool**. Diese Dritten können **außerhalb der EU** tätig sein; **geeignete Garantien** werden bei Bedarf eingerichtet.

---

## 7. Internationale Übermittlungen

Wenn Datenübermittlungen außerhalb Ihres Landes erfolgen, stellen wir sicher, dass sie auf anerkannten **Schutzmechanismen** basieren (Standardvertragsklauseln, Angemessenheitsbeschluss usw.), wenn das Gesetz dies erfordert.

---

## 8. Ihre Rechte

Gemäß geltendem Recht (z.B. DSGVO) haben Sie Rechte auf **Zugang**, **Berichtigung**, **Löschung**, **Widerspruch**, **Einschränkung** und **Datenübertragbarkeit** unter den gesetzlich vorgesehenen Bedingungen. Sie können Ihre Rechte über unser **Kontaktformular** ausüben: /contact

---

## 9. Aktualisierung dieser Richtlinie

Wir können diese Richtlinie ändern, um regulatorische oder technische Entwicklungen widerzuspiegeln. Die aktualisierte Version wird auf dieser Seite mit dem **Aktualisierungsdatum** veröffentlicht.

---

## 10. Kontakt

Bei Fragen zu Cookies oder Datenschutz kontaktieren Sie uns bitte: [**/contact**](/contact)
`;

  const defaultRu = `
# Политика использования файлов cookie

**Версия 2.2 – Последнее обновление: 16 июня 2025**

---

## 1. Что такое файл cookie?

**Cookie** — это небольшой текстовый файл, сохраняемый на вашем устройстве (компьютере, мобильном телефоне, планшете) при посещении сайта. Он позволяет сайту **распознать ваше устройство**, **запомнить** ваши предпочтения и **улучшить** ваш опыт.

---

## 2. Почему мы используем файлы cookie?

2.1. **Основные функции**: обеспечение аутентификации, безопасности, выбора языка и поддержания вашей сессии.
2.2. **Измерение аудитории**: понимание использования сайта для его улучшения (посещенные страницы, проведенное время, события).
2.3. **Производительность**: оптимизация скорости загрузки и стабильности.
2.4. **Связь**: обеспечение телефонии/видео и технических уведомлений.

---

## 3. Типы файлов cookie

3.1. **Необходимые файлы cookie**: строго необходимы для работы сайта.
3.2. **Аналитические файлы cookie**: агрегированная статистика использования, по возможности анонимизированная.
3.3. **Файлы cookie производительности**: улучшение отображения, кэш и распространение контента.

---

## 4. Правовая основа и продолжительность

4.1. **Необходимые**: законный интерес (предоставление запрошенной услуги).
4.2. **Аналитические/Производительность**: **ваше согласие** через баннер.
4.3. **Сроки**: сеанс (удаляются при закрытии) или постоянные (от нескольких часов до максимум 13 месяцев в зависимости от цели).

---

## 5. Управление вашим согласием

5.1. Вы можете **принять/отклонить** необязательные категории через наш **баннер согласия**.
5.2. Вы можете в любой момент **отозвать свое согласие** по ссылке "Настройки файлов cookie" внизу страницы.
5.3. Также настройте свой **браузер** для блокировки/удаления файлов cookie.

---

## 6. Файлы cookie, устанавливаемые третьими лицами

Мы можем использовать поставщиков, которые могут устанавливать свои собственные файлы cookie: **Stripe** (платежи), **Twilio** (телефония), **Firebase** (аутентификация/БД/хостинг) и, при активации, инструмент **анализа аудитории**. Эти третьи стороны могут работать **за пределами ЕС**; при необходимости применяются **соответствующие гарантии**.

---

## 7. Международные передачи

Когда передача данных происходит за пределы вашей страны, мы обеспечиваем, чтобы они основывались на признанных **механизмах защиты** (стандартные договорные оговорки, решение об адекватности и т.д.), когда этого требует закон.

---

## 8. Ваши права

В соответствии с применимым законодательством (например, GDPR), вы имеете права на **доступ**, **исправление**, **удаление**, **возражение**, **ограничение** и **переносимость** на условиях, предусмотренных законом. Вы можете реализовать свои права через нашу **контактную форму**: /contact

---

## 9. Обновление этой политики

Мы можем изменять эту политику для отражения нормативных или технических изменений. Обновленная версия публикуется на этой странице с **датой обновления**.

---

## 10. Контакт

По любым вопросам, связанным с файлами cookie или защитой данных, свяжитесь с нами: [**/contact**](/contact)
`;
  

const defaultPt = `
# Política de Cookies

**Versão 2.2 – Última atualização: 16 de junho de 2025**

---

## 1. O que é um cookie?

Um **cookie** é um pequeno arquivo de texto armazenado no seu dispositivo (computador, celular, tablet) quando você visita um site. Ele permite que o site **reconheça seu dispositivo**, **lembre** suas preferências e **melhore** sua experiência.

---

## 2. Por que usamos cookies?

2.1. **Funcionamento essencial**: garantir autenticação, segurança, seleção de idioma e manutenção da sua sessão.
2.2. **Medição de audiência**: compreender o uso do site para melhorá-lo (páginas visitadas, tempo gasto, eventos).
2.3. **Desempenho**: otimizar a velocidade de carregamento e estabilidade.
2.4. **Comunicação**: permitir telefonia/vídeo e notificações técnicas.

---

## 3. Tipos de cookies

3.1. **Cookies essenciais**: estritamente necessários para o funcionamento do site.
3.2. **Cookies analíticos**: estatísticas de uso agregadas e anonimizadas quando possível.
3.3. **Cookies de desempenho**: melhoria de exibição, cache e distribuição de conteúdo.

---

## 4. Base legal e duração

4.1. **Essenciais**: interesse legítimo (fornecer o serviço solicitado).
4.2. **Analíticos/Desempenho**: **seu consentimento** através do banner.
4.3. **Durações**: sessão (apagados ao fechar) ou persistentes (algumas horas até 13 meses no máximo, dependendo da finalidade).

---

## 5. Gestão do seu consentimento

5.1. Você pode **aceitar/recusar** categorias não essenciais através do nosso **banner de consentimento**.
5.2. Você pode a qualquer momento **retirar seu consentimento** através do link "Preferências de cookies" no rodapé da página.
5.3. Configure também seu **navegador** para bloquear/excluir cookies.

---

## 6. Cookies emitidos por terceiros

Podemos usar provedores que podem depositar seus próprios cookies: **Stripe** (pagamento), **Twilio** (telefonia), **Firebase** (autenticação/BD/hospedagem) e, conforme ativação, uma ferramenta de **análise de audiência**. Esses terceiros podem operar **fora da UE**; **garantias apropriadas** são estabelecidas quando necessário.

---

## 7. Transferências internacionais

Quando ocorrem transferências de dados fora do seu país, garantimos que elas se baseiem em **mecanismos de proteção** reconhecidos (cláusulas contratuais padrão, decisão de adequação, etc.) quando a lei exige.

---

## 8. Seus direitos

De acordo com a lei aplicável (ex. GDPR), você tem direitos de **acesso**, **retificação**, **exclusão**, **oposição**, **limitação** e **portabilidade** nas condições previstas pela lei. Você pode exercer seus direitos através do nosso **formulário de contato**: /contact

---

## 9. Atualização desta política

Podemos modificar esta política para refletir evoluções regulatórias ou técnicas. A versão atualizada é publicada nesta página com a **data de atualização**.

---

## 10. Contato

Para qualquer pergunta relacionada a cookies ou proteção de dados, entre em contato conosco: [**/contact**](/contact)
`;


const defaultCh = `
    # Cookie 政策

    **版本 2.2 – 最后更新：2025年6月16日**

    ---

    ## 1. 什么是 Cookie？

    **Cookie** 是您访问网站时存储在设备上的小型文本文件。它帮助网站**识别您的设备**、**记住您的偏好设置**并**提升您的体验**。

    ---

    ## 2. 我们为什么使用 Cookie？

    2.1. **核心功能**：身份验证、安全、语言偏好、会话连续性。  
    2.2. **分析**：了解网站的使用情况以便改进。  
    2.3. **性能优化**：提高速度和稳定性。  
    2.4. **通信**：启用电话/视频功能及技术通知。

    ---

    ## 3. Cookie 类型

    3.1. **核心 Cookie**：严格必要，用于提供您请求的服务。  
    3.2. **分析 Cookie**：聚合统计数据，尽可能匿名处理。  
    3.3. **性能 Cookie**：缓存/CDN 和渲染优化。

    ---

    ## 4. 法律依据及存储时长

    4.1. **核心 Cookie**：合法利益（用于提供服务）。  
    4.2. **分析/性能 Cookie**：通过横幅获得**您的同意**。  
    4.3. **存储时长**：会话型或持久型（从几小时到 13 个月不等，取决于用途）。

    ---

    ## 5. 管理您的同意

    5.1. 您可以通过我们的**同意横幅**选择**接受/拒绝**非核心类别。  
    5.2. 您可以随时通过页脚的**Cookie 偏好设置**链接**撤回同意**。  
    5.3. 您也可以使用**浏览器设置**来阻止或删除 Cookie。

    ---

    ## 6. 第三方 Cookie

    我们可能依赖能够设置自身 Cookie 的供应商：**Stripe**（支付）、**Twilio**（电话）、**Firebase**（认证/数据库/托管）以及（如启用）**分析工具**。这些供应商可能在**您所在国家以外**运营；如法律要求，我们将采取**适当的保障措施**。

    ---

    ## 7. 国际传输

    当数据传输发生在您所在国家以外时，我们会依赖**公认的保障措施**（例如标准合同条款或适足性决定），以符合法律要求。

    ---

    ## 8. 您的权利

    根据适用法律（如 GDPR），您可能拥有**访问**、**更正**、**删除**、**反对**、**限制处理**和**数据可携带**的权利。您可以通过我们的**联系表单**行使这些权利：/contact

    ---

    ## 9. 政策更新

    我们可能会更新本政策以反映监管或技术变化。更新后的版本将发布在本页，并标明**最后更新**日期。

    ---

    ## 10. 联系方式

    如对 Cookie 或数据保护有任何疑问，请联系我们：**/contact**
`;

  


const defaultAr = `
# سياسة ملفات تعريف الارتباط

**الإصدار 2.2 – آخر تحديث: 16 يونيو 2025**

---

## 1. ما هو ملف تعريف الارتباط؟

**ملف تعريف الارتباط** هو ملف نصي صغير يتم تخزينه على جهازك (كمبيوتر، هاتف محمول، جهاز لوحي) عند زيارة موقع ويب. يساعد الموقع على **التعرف على جهازك**، **تذكر** تفضيلاتك و**تحسين** تجربتك.

---

## 2. لماذا نستخدم ملفات تعريف الارتباط؟

2.1. **التشغيل الأساسي**: ضمان المصادقة والأمان واختيار اللغة والحفاظ على جلستك.  
2.2. **قياس الجمهور**: فهم استخدام الموقع لتحسينه (الصفحات المعروضة، الوقت المستغرق، الأحداث).  
2.3. **الأداء**: تحسين سرعة التحميل والاستقرار.  
2.4. **الاتصال**: تمكين الهاتف/الفيديو والإشعارات التقنية.

---

## 3. أنواع ملفات تعريف الارتباط

3.1. **ملفات تعريف الارتباط الأساسية**: ضرورية بشكل صارم لعمل الموقع.  
3.2. **ملفات تعريف الارتباط التحليلية**: إحصائيات الاستخدام المجمعة والمجهولة المصدر عندما يكون ذلك ممكناً.  
3.3. **ملفات تعريف الارتباط للأداء**: تحسين العرض والتخزين المؤقت وتوزيع المحتوى.

---

## 4. الأساس القانوني والمدة

4.1. **الأساسية**: المصلحة المشروعة (تقديم الخدمة المطلوبة).  
4.2. **التحليلية/الأداء**: **موافقتك** عبر اللافتة.  
4.3. **المدد**: جلسة (تُحذف عند الإغلاق) أو دائمة (من بضع ساعات إلى 13 شهراً كحد أقصى حسب الغرض).

---

## 5. إدارة موافقتك

5.1. يمكنك **قبول/رفض** الفئات غير الأساسية عبر **لافتة الموافقة** الخاصة بنا.  
5.2. يمكنك في أي وقت **سحب موافقتك** من خلال رابط "تفضيلات ملفات تعريف الارتباط" في أسفل الصفحة.  
5.3. قم أيضاً بإعداد **متصفحك** لحظر/حذف ملفات تعريف الارتباط.

---

## 6. ملفات تعريف الارتباط الصادرة من أطراف ثالثة

قد نستخدم مزودي خدمات قد يقومون بوضع ملفات تعريف الارتباط الخاصة بهم: **Stripe** (الدفع)، **Twilio** (الهاتف)، **Firebase** (المصادقة/قاعدة البيانات/الاستضافة) وعند التفعيل، أداة **تحليل الجمهور**. قد يعمل هؤلاء الأطراف الثالثة **خارج الاتحاد الأوروبي**؛ يتم وضع **ضمانات مناسبة** عند الحاجة.

---

## 7. التحويلات الدولية

عندما تتم عمليات نقل البيانات خارج بلدك، نتأكد من أنها تستند إلى **آليات حماية** معترف بها (بنود تعاقدية نموذجية، قرار الكفاية، إلخ) عندما يتطلب القانون ذلك.

---

## 8. حقوقك

وفقاً للقانون المعمول به (مثل اللائحة العامة لحماية البيانات)، لديك حقوق **الوصول**، **التصحيح**، **المحو**، **الاعتراض**، **التقييد** و**النقل** في الشروط المنصوص عليها في القانون. يمكنك ممارسة حقوقك عبر **نموذج الاتصال** الخاص بنا: /contact

---

## 9. تحديث هذه السياسة

قد نقوم بتعديل هذه السياسة لتعكس التطورات التنظيمية أو التقنية. يتم نشر النسخة المحدثة على هذه الصفحة مع **تاريخ التحديث**.

---

## 10. اتصل

لأي سؤال يتعلق بملفات تعريف الارتباط أو حماية البيانات، اتصل بنا: [**/contact**](/contact)
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
            : selectedLanguage === "hi"
              ? defaultHi
              : selectedLanguage === "pt"
                ? defaultPt
              : selectedLanguage === "ch"
                  ? defaultCh
                  : selectedLanguage === "ar"
                    ? defaultAr
            : defaultEn;

  // Sommaire UI

const anchorMap = useMemo(
  () => [
    {
      num: 1,
      label:
        selectedLanguage === "fr"
          ? "Qu'est-ce qu'un cookie ?"
          : selectedLanguage === "es"
          ? "¿Qué es una cookie?"
          : selectedLanguage === "pt"
            ? "O que é um cookie?"
            : selectedLanguage === "de"
              ? "Was ist ein Cookie?"
              : selectedLanguage === "ru"
                ? "Что такое файл cookie?"
                : selectedLanguage === "hi"
                  ? "कुकी क्या है?"
                  : selectedLanguage === "ch"
                    ? "什么是cookie？"
                    : selectedLanguage === "ar"
                      ? "ما هو ملف تعريف الارتباط؟"
                      : "What is a cookie?",
    },
    {
      num: 2,
      label:
        selectedLanguage === "fr"
          ? "Pourquoi nous les utilisons"
          : selectedLanguage === "es"
          ? "Por qué los utilizamos"
          : selectedLanguage === "pt"
            ? "Por que os usamos"
            : selectedLanguage === "de"
              ? "Warum wir sie verwenden"
              : selectedLanguage === "ru"
                ? "Почему мы их используем"
                : selectedLanguage === "hi"
                  ? "हम इनका उपयोग क्यों करते हैं"
                  : selectedLanguage === "ch"
                    ? "我们为什么使用它们"
                    : selectedLanguage === "ar"
                      ? "لماذا نستخدمها"
                      : "Why we use them",
    },
    {
      num: 3,
      label:
        selectedLanguage === "fr"
          ? "Types de cookies"
          : selectedLanguage === "es"
          ? "Tipos de cookies"
          : selectedLanguage === "pt"
            ? "Tipos de cookies"
            : selectedLanguage === "de"
              ? "Cookie-Typen"
              : selectedLanguage === "ru"
                ? "Типы файлов cookie"
                : selectedLanguage === "hi"
                  ? "कुकीज़ के प्रकार"
                  : selectedLanguage === "ch"
                    ? "cookie 的类型"
                    : selectedLanguage === "ar"
                      ? "أنواع ملفات تعريف الارتباط"
                      : "Types of cookies",
    },
    {
      num: 4,
      label:
        selectedLanguage === "fr"
          ? "Base légale & durée"
          : selectedLanguage === "es"
          ? "Base legal y duración"
          : selectedLanguage === "pt"
            ? "Base legal e duração"
            : selectedLanguage === "de"
              ? "Rechtsgrundlage & Dauer"
              : selectedLanguage === "ru"
                ? "Правовая основа и продолжительность"
                : selectedLanguage === "hi"
                  ? "कानूनी आधार और अवधि"
                  : selectedLanguage === "ch"
                    ? "法律依据和期限"
                    : selectedLanguage === "ar"
                      ? "الأساس القانوني والمدة"
                      : "Legal basis & duration",
    },
    {
      num: 5,
      label:
        selectedLanguage === "fr"
          ? "Gestion du consentement"
          : selectedLanguage === "es"
          ? "Gestión del consentimiento"
          : selectedLanguage === "pt"
            ? "Gestão do consentimento"
            : selectedLanguage === "de"
              ? "Verwaltung der Zustimmung"
              : selectedLanguage === "ru"
                ? "Управление согласием"
                : selectedLanguage === "hi"
                  ? "सहमति प्रबंधन"
                  : selectedLanguage === "ch"
                    ? "管理同意"
                    : selectedLanguage === "ar"
                      ? "إدارة الموافقة"
                      : "Managing consent",
    },
    {
      num: 6,
      label:
        selectedLanguage === "fr"
          ? "Cookies tiers"
          : selectedLanguage === "es"
          ? "Cookies de terceros"
          : selectedLanguage === "pt"
            ? "Cookies de terceiros"
            : selectedLanguage === "de"
              ? "Drittanbieter-Cookies"
              : selectedLanguage === "ru"
                ? "Файлы cookie третьих лиц"
                : selectedLanguage === "hi"
                  ? "तृतीय पक्ष कुकीज़"
                  : selectedLanguage === "ch"
                    ? "第三方 cookie"
                    : selectedLanguage === "ar"
                      ? "ملفات تعريف الارتباط من طرف ثالث"
                      : "Third-party cookies",
    },
    {
      num: 7,
      label:
        selectedLanguage === "fr"
          ? "Transferts internationaux"
          : selectedLanguage === "es"
          ? "Transferencias internacionales"
          : selectedLanguage === "pt"
            ? "Transferências internacionais"
            : selectedLanguage === "de"
              ? "Internationale Übermittlungen"
              : selectedLanguage === "ru"
                ? "Международные передачи"
                : selectedLanguage === "hi"
                  ? "अंतर्राष्ट्रीय स्थानांतरण"
                  : selectedLanguage === "ch"
                    ? "国际转账"
                    : selectedLanguage === "ar"
                      ? "التحويلات الدولية"
                      : "International transfers",
    },
    {
      num: 8,
      label:
        selectedLanguage === "fr"
          ? "Vos droits"
          : selectedLanguage === "es"
          ? "Sus derechos"
          : selectedLanguage === "pt"
            ? "Seus direitos"
            : selectedLanguage === "de"
              ? "Ihre Rechte"
              : selectedLanguage === "ru"
                ? "Ваши права"
                : selectedLanguage === "hi"
                  ? "आपके अधिकार"
                  : selectedLanguage === "ch"
                    ? "您的权利"
                    : selectedLanguage === "ar"
                      ? "حقوقك"
                      : "Your rights",
    },
    {
      num: 9,
      label:
        selectedLanguage === "fr"
          ? "Mises à jour"
          : selectedLanguage === "es"
          ? "Actualizaciones"
          : selectedLanguage === "pt"
            ? "Atualizações"
            : selectedLanguage === "de"
              ? "Aktualisierungen"
              : selectedLanguage === "ru"
                ? "Обновления"
                : selectedLanguage === "hi"
                  ? "अपडेट"
                  : selectedLanguage === "ch"
                    ? "更新"
                    : selectedLanguage === "ar"
                      ? "التحديثات"
                      : "Updates",
    },
    {
      num: 10,
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
                    ? "接触"
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
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-transparent to-amber-500/10 pointer-events-none" />
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-orange-500/20 to-amber-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 max-w-6xl mx-auto px-6">
            {/* Badge + langues */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
              <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-full pl-5 pr-4 py-2.5 border border-white/20 text-white">
                <Clock className="w-4 h-4 text-yellow-300" />
                <span className="text-sm font-semibold">{t.lastUpdated}</span>
              </div>

            </div>

            <header className="text-center">
              <div className="flex justify-center mb-6">
                <div className="flex items-center justify-center w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20">
                  <CookieIcon className="w-12 h-12 text-white" />
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
                    icon: <Shield className="w-6 h-6" />,
                    text: t.features[0],
                    gradient: "from-green-500 to-emerald-500",
                  },
                  {
                    icon: <Settings className="w-6 h-6" />,
                    text: t.features[1],
                    gradient: "from-blue-500 to-indigo-500",
                  },
                  {
                    icon: <Eye className="w-6 h-6" />,
                    text: t.features[2],
                    gradient: "from-yellow-500 to-orange-500",
                  },
                  {
                    icon: <Globe className="w-6 h-6" />,
                    text: t.features[3],
                    gradient: "from-orange-500 to-red-500",
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
                  className="group inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 text-white font-bold border-2 border-orange-400/50 hover:scale-105 transition-all"
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
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white">
                  <CookieIcon className="w-5 h-5" />
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
              </article>
            )}
          </div>
        </section>
      </main>
    </Layout>
  );
};

export default Cookies;
