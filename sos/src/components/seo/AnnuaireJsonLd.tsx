/**
 * AnnuaireJsonLd — Structured Data for the Expat Directory page
 * Emits: FAQPage + CollectionPage + Dataset (schema.org)
 * Supports 9 languages: fr, en, es, de, pt, ru, ch, hi, ar
 */

import React, { useMemo } from "react";

interface AnnuaireJsonLdProps {
  lang: string;
  canonicalUrl: string;
  pageTitle: string;
  pageDesc: string;
}

// ── FAQ content in 9 languages ──────────────────────────────────────────────

interface FaqItem {
  q: string;
  a: string;
}

const FAQ_CONTENT: Record<string, FaqItem[]> = {
  fr: [
    {
      q: "Qu'est-ce que l'Annuaire SOS-Expat ?",
      a: "L'Annuaire SOS-Expat est le seul annuaire mondial qui réunit toutes les coordonnées essentielles pour les expatriés, voyageurs et vacanciers dans 197+ pays : ambassades, services d'urgence, immigration, santé, logement, banques, emploi, éducation, transport, télécom, fiscalité, juridique et communauté. Disponible en 9 langues, il est entièrement gratuit et vérifié.",
    },
    {
      q: "Comment trouver mon ambassade à l'étranger ?",
      a: "Sélectionnez votre pays de destination dans l'annuaire, puis cliquez sur la catégorie « Ambassades ». Indiquez votre nationalité pour filtrer et afficher uniquement votre ambassade.",
    },
    {
      q: "Quels pays sont couverts par l'annuaire ?",
      a: "L'annuaire couvre 197+ pays répartis sur 7 continents : Europe, Afrique, Asie, Amériques (Nord et Sud), Moyen-Orient et Océanie.",
    },
    {
      q: "L'annuaire est-il gratuit ?",
      a: "Oui, l'annuaire SOS-Expat est entièrement gratuit, sans inscription requise. Toutes les ressources sont accessibles librement.",
    },
    {
      q: "En quelles langues l'annuaire est-il disponible ?",
      a: "L'annuaire est disponible en 9 langues : français, anglais, espagnol, allemand, portugais, russe, chinois, hindi et arabe.",
    },
    {
      q: "Comment ajouter un lien vers l'Annuaire SOS-Expat sur mon site ?",
      a: "Copiez simplement le lien https://sos-expat.com/fr-fr/annuaire et ajoutez-le sur votre site. Un code HTML prêt à l'emploi est disponible sur la page pour faciliter l'intégration.",
    },
    {
      q: "Quelles catégories de ressources sont disponibles ?",
      a: "13 catégories : Urgences, Ambassades, Immigration, Santé, Logement, Banque, Emploi, Éducation, Transport, Télécom, Fiscalité, Juridique, Communauté.",
    },
    {
      q: "Les informations sont-elles officielles et vérifiées ?",
      a: "Oui, chaque ressource est vérifiée. Les sources officielles sont identifiées par un badge « Officiel ». Les données sont mises à jour régulièrement.",
    },
  ],
  en: [
    {
      q: "What is the SOS-Expat Directory?",
      a: "The SOS-Expat Directory is the only worldwide directory that brings together all essential contacts for expats, travelers and vacationers in 197+ countries: embassies, emergency services, immigration, health, housing, banking, employment, education, transport, telecom, taxation, legal and community. Available in 9 languages, it is completely free and verified.",
    },
    {
      q: "How do I find my embassy abroad?",
      a: "Select your destination country in the directory, then click the 'Embassies' category. Enter your nationality to filter and display only your embassy.",
    },
    {
      q: "Which countries does the directory cover?",
      a: "The directory covers 197+ countries across 7 continents: Europe, Africa, Asia, Americas (North and South), Middle East and Oceania.",
    },
    {
      q: "Is the directory free?",
      a: "Yes, the SOS-Expat directory is completely free, with no registration required. All resources are freely accessible.",
    },
    {
      q: "In which languages is the directory available?",
      a: "The directory is available in 9 languages: French, English, Spanish, German, Portuguese, Russian, Chinese, Hindi and Arabic.",
    },
    {
      q: "How do I add a link to the SOS-Expat Directory on my website?",
      a: "Simply copy the link https://sos-expat.com/en-us/expat-directory and add it to your site. A ready-to-use HTML code is available on the page to facilitate integration.",
    },
    {
      q: "What resource categories are available?",
      a: "13 categories: Emergency, Embassies, Immigration, Health, Housing, Banking, Employment, Education, Transport, Telecom, Tax, Legal, Community.",
    },
    {
      q: "Are the resources official and verified?",
      a: "Yes, each resource is verified. Official sources are identified by an 'Official' badge. Data is updated regularly.",
    },
  ],
  es: [
    {
      q: "¿Qué es el Directorio SOS-Expat?",
      a: "El Directorio SOS-Expat es el único directorio mundial que reúne todos los contactos esenciales para expatriados, viajeros y turistas en 197+ países: embajadas, servicios de emergencia, inmigración, salud, vivienda, banca, empleo, educación, transporte, telecomunicaciones, fiscalidad, legal y comunidad. Disponible en 9 idiomas, es completamente gratuito y verificado.",
    },
    {
      q: "¿Cómo encontrar mi embajada en el extranjero?",
      a: "Selecciona tu país de destino en el directorio, luego haz clic en la categoría 'Embajadas'. Indica tu nacionalidad para filtrar y mostrar solo tu embajada.",
    },
    {
      q: "¿Qué países cubre el directorio?",
      a: "El directorio cubre 197+ países en 7 continentes: Europa, África, Asia, Américas (Norte y Sur), Oriente Medio y Oceanía.",
    },
    {
      q: "¿Es gratuito el directorio?",
      a: "Sí, el directorio SOS-Expat es completamente gratuito, sin necesidad de registro. Todos los recursos son de libre acceso.",
    },
    {
      q: "¿En qué idiomas está disponible el directorio?",
      a: "El directorio está disponible en 9 idiomas: francés, inglés, español, alemán, portugués, ruso, chino, hindi y árabe.",
    },
    {
      q: "¿Cómo añadir un enlace al Directorio SOS-Expat en mi sitio web?",
      a: "Simplemente copia el enlace https://sos-expat.com/es-es/directorio-expat y añádelo a tu sitio. Un código HTML listo para usar está disponible en la página para facilitar la integración.",
    },
    {
      q: "¿Qué categorías de recursos están disponibles?",
      a: "13 categorías: Emergencias, Embajadas, Inmigración, Salud, Vivienda, Banca, Empleo, Educación, Transporte, Telecom, Impuestos, Legal, Comunidad.",
    },
    {
      q: "¿Son las informaciones oficiales y verificadas?",
      a: "Sí, cada recurso está verificado. Las fuentes oficiales se identifican con una insignia 'Oficial'. Los datos se actualizan regularmente.",
    },
  ],
  de: [
    {
      q: "Was ist das SOS-Expat-Verzeichnis?",
      a: "Das SOS-Expat-Verzeichnis ist das einzige weltweite Verzeichnis, das alle wesentlichen Kontakte für Expats, Reisende und Urlauber in 197+ Ländern zusammenführt: Botschaften, Notfalldienste, Einwanderung, Gesundheit, Wohnen, Banken, Arbeit, Bildung, Transport, Telekommunikation, Steuern, Recht und Gemeinschaft. In 9 Sprachen verfügbar, vollständig kostenlos und verifiziert.",
    },
    {
      q: "Wie finde ich meine Botschaft im Ausland?",
      a: "Wählen Sie Ihr Zielland im Verzeichnis aus, dann klicken Sie auf die Kategorie 'Botschaften'. Geben Sie Ihre Nationalität ein, um nur Ihre Botschaft anzuzeigen.",
    },
    {
      q: "Welche Länder deckt das Verzeichnis ab?",
      a: "Das Verzeichnis umfasst 197+ Länder auf 7 Kontinenten: Europa, Afrika, Asien, Amerika (Nord und Süd), Naher Osten und Ozeanien.",
    },
    {
      q: "Ist das Verzeichnis kostenlos?",
      a: "Ja, das SOS-Expat-Verzeichnis ist vollständig kostenlos, ohne Registrierung erforderlich. Alle Ressourcen sind frei zugänglich.",
    },
    {
      q: "In welchen Sprachen ist das Verzeichnis verfügbar?",
      a: "Das Verzeichnis ist in 9 Sprachen verfügbar: Französisch, Englisch, Spanisch, Deutsch, Portugiesisch, Russisch, Chinesisch, Hindi und Arabisch.",
    },
    {
      q: "Wie füge ich einen Link zum SOS-Expat-Verzeichnis auf meiner Website hinzu?",
      a: "Kopieren Sie einfach den Link https://sos-expat.com/de-de/expat-verzeichnis und fügen Sie ihn auf Ihrer Website ein. Ein fertiger HTML-Code ist auf der Seite verfügbar, um die Integration zu erleichtern.",
    },
    {
      q: "Welche Ressourcenkategorien sind verfügbar?",
      a: "13 Kategorien: Notfall, Botschaften, Einwanderung, Gesundheit, Wohnen, Banken, Arbeit, Bildung, Transport, Telekommunikation, Steuern, Recht, Gemeinschaft.",
    },
    {
      q: "Sind die Informationen offiziell und verifiziert?",
      a: "Ja, jede Ressource ist verifiziert. Offizielle Quellen werden mit einem 'Offiziell'-Badge gekennzeichnet. Die Daten werden regelmäßig aktualisiert.",
    },
  ],
  pt: [
    {
      q: "O que é o Diretório SOS-Expat?",
      a: "O Diretório SOS-Expat é o único diretório mundial que reúne todos os contatos essenciais para expatriados, viajantes e turistas em 197+ países: embaixadas, serviços de emergência, imigração, saúde, habitação, bancos, emprego, educação, transporte, telecomunicações, fiscalidade, jurídico e comunidade. Disponível em 9 idiomas, é totalmente gratuito e verificado.",
    },
    {
      q: "Como encontrar a minha embaixada no estrangeiro?",
      a: "Selecione o seu país de destino no diretório, depois clique na categoria 'Embaixadas'. Indique a sua nacionalidade para filtrar e mostrar apenas a sua embaixada.",
    },
    {
      q: "Quais países o diretório cobre?",
      a: "O diretório cobre 197+ países em 7 continentes: Europa, África, Ásia, Américas (Norte e Sul), Médio Oriente e Oceania.",
    },
    {
      q: "O diretório é gratuito?",
      a: "Sim, o diretório SOS-Expat é completamente gratuito, sem necessidade de registo. Todos os recursos são livremente acessíveis.",
    },
    {
      q: "Em que idiomas está disponível o diretório?",
      a: "O diretório está disponível em 9 idiomas: francês, inglês, espanhol, alemão, português, russo, chinês, hindi e árabe.",
    },
    {
      q: "Como adicionar um link para o Diretório SOS-Expat no meu site?",
      a: "Copie simplesmente o link https://sos-expat.com/pt-pt/diretorio-expat e adicione-o ao seu site. Um código HTML pronto a usar está disponível na página para facilitar a integração.",
    },
    {
      q: "Que categorias de recursos estão disponíveis?",
      a: "13 categorias: Emergências, Embaixadas, Imigração, Saúde, Habitação, Bancos, Emprego, Educação, Transporte, Telecom, Impostos, Jurídico, Comunidade.",
    },
    {
      q: "As informações são oficiais e verificadas?",
      a: "Sim, cada recurso é verificado. As fontes oficiais são identificadas por um badge 'Oficial'. Os dados são atualizados regularmente.",
    },
  ],
  ru: [
    {
      q: "Что такое Справочник SOS-Expat?",
      a: "Справочник SOS-Expat — единственный всемирный справочник, объединяющий все основные контакты для экспатов, путешественников и туристов в 197+ странах: посольства, экстренные службы, иммиграция, здоровье, жильё, банки, работа, образование, транспорт, телеком, налоги, юридические вопросы и сообщество. Доступен на 9 языках, полностью бесплатен и верифицирован.",
    },
    {
      q: "Как найти своё посольство за рубежом?",
      a: "Выберите страну назначения в справочнике, затем нажмите категорию «Посольства». Укажите свою национальность для фильтрации и отображения только вашего посольства.",
    },
    {
      q: "Какие страны охватывает справочник?",
      a: "Справочник охватывает 197+ стран на 7 континентах: Европа, Африка, Азия, Америка (Северная и Южная), Ближний Восток и Океания.",
    },
    {
      q: "Справочник бесплатный?",
      a: "Да, справочник SOS-Expat полностью бесплатен, регистрация не требуется. Все ресурсы находятся в свободном доступе.",
    },
    {
      q: "На каких языках доступен справочник?",
      a: "Справочник доступен на 9 языках: французский, английский, испанский, немецкий, португальский, русский, китайский, хинди и арабский.",
    },
    {
      q: "Как добавить ссылку на Справочник SOS-Expat на свой сайт?",
      a: "Просто скопируйте ссылку https://sos-expat.com/ru-ru/spravochnik-expat и добавьте на свой сайт. Готовый HTML-код доступен на странице для упрощения интеграции.",
    },
    {
      q: "Какие категории ресурсов доступны?",
      a: "13 категорий: Экстренные службы, Посольства, Иммиграция, Здоровье, Жильё, Банки, Работа, Образование, Транспорт, Телеком, Налоги, Юридические вопросы, Сообщество.",
    },
    {
      q: "Являются ли данные официальными и проверенными?",
      a: "Да, каждый ресурс верифицирован. Официальные источники помечены значком «Офиц.». Данные регулярно обновляются.",
    },
  ],
  ch: [
    {
      q: "SOS-Expat指南是什么？",
      a: "SOS-Expat指南是唯一一个汇集了197+个国家海外人员、旅行者和度假者所有基本联系方式的全球指南：大使馆、紧急服务、移民、医疗、住房、银行、就业、教育、交通、电信、税务、法律和社区。提供9种语言，完全免费且经过验证。",
    },
    {
      q: "如何在海外找到我的大使馆？",
      a: "在指南中选择您的目的地国家，然后点击【大使馆】类别。输入您的国籍以筛选并仅显示您的大使馆。",
    },
    {
      q: "指南涵盖哪些国家？",
      a: "指南涵盖7大洲的197+个国家：欧洲、非洲、亚洲、美洲（南北美）、中东和大洋洲。",
    },
    {
      q: "指南是免费的吗？",
      a: "是的，SOS-Expat指南完全免费，无需注册。所有资源均可免费访问。",
    },
    {
      q: "指南提供哪些语言版本？",
      a: "指南提供9种语言：法语、英语、西班牙语、德语、葡萄牙语、俄语、中文、印地语和阿拉伯语。",
    },
    {
      q: "如何在我的网站上添加SOS-Expat指南的链接？",
      a: "只需复制链接 https://sos-expat.com/zh-cn/zhinan-expat 并添加到您的网站。页面上提供了即用型HTML代码，方便集成。",
    },
    {
      q: "有哪些资源类别？",
      a: "13个类别：紧急情况、大使馆、移民、医疗、住房、银行、就业、教育、交通、电信、税务、法律、社区。",
    },
    {
      q: "信息是官方且经过验证的吗？",
      a: "是的，每项资源都经过验证。官方来源标有【官方】徽章。数据定期更新。",
    },
  ],
  hi: [
    {
      q: "SOS-Expat निर्देशिका क्या है?",
      a: "SOS-Expat निर्देशिका एकमात्र विश्वव्यापी निर्देशिका है जो 197+ देशों में प्रवासियों, यात्रियों और पर्यटकों के लिए सभी आवश्यक संपर्क एकत्रित करती है: दूतावास, आपातकालीन सेवाएं, आव्रजन, स्वास्थ्य, आवास, बैंक, रोजगार, शिक्षा, परिवहन, दूरसंचार, कर, कानूनी और समुदाय। 9 भाषाओं में उपलब्ध, पूरी तरह से मुफ्त और सत्यापित।",
    },
    {
      q: "विदेश में अपना दूतावास कैसे खोजें?",
      a: "निर्देशिका में अपना गंतव्य देश चुनें, फिर 'दूतावास' श्रेणी पर क्लिक करें। केवल अपना दूतावास फ़िल्टर करने और दिखाने के लिए अपनी राष्ट्रीयता दर्ज करें।",
    },
    {
      q: "निर्देशिका में कौन से देश शामिल हैं?",
      a: "निर्देशिका 7 महाद्वीपों के 197+ देशों को कवर करती है: यूरोप, अफ्रीका, एशिया, अमेरिका (उत्तर और दक्षिण), मध्य पूर्व और ओशिनिया।",
    },
    {
      q: "क्या निर्देशिका मुफ्त है?",
      a: "हां, SOS-Expat निर्देशिका पूरी तरह से मुफ्त है, पंजीकरण की आवश्यकता नहीं। सभी संसाधन स्वतंत्र रूप से सुलभ हैं।",
    },
    {
      q: "निर्देशिका किन भाषाओं में उपलब्ध है?",
      a: "निर्देशिका 9 भाषाओं में उपलब्ध है: फ्रेंच, अंग्रेजी, स्पेनिश, जर्मन, पुर्तगाली, रूसी, चीनी, हिंदी और अरबी।",
    },
    {
      q: "अपनी वेबसाइट पर SOS-Expat निर्देशिका का लिंक कैसे जोड़ें?",
      a: "बस https://sos-expat.com/hi-in/nirdeshika-expat लिंक कॉपी करें और अपनी साइट पर जोड़ें। एकीकरण सुविधाजनक बनाने के लिए पेज पर तैयार HTML कोड उपलब्ध है।",
    },
    {
      q: "कौन सी संसाधन श्रेणियां उपलब्ध हैं?",
      a: "13 श्रेणियां: आपातकाल, दूतावास, आव्रजन, स्वास्थ्य, आवास, बैंक, रोजगार, शिक्षा, परिवहन, दूरसंचार, कर, कानूनी, समुदाय।",
    },
    {
      q: "क्या जानकारी आधिकारिक और सत्यापित है?",
      a: "हां, प्रत्येक संसाधन सत्यापित है। आधिकारिक स्रोतों को 'आधिकारिक' बैज से पहचाना जाता है। डेटा नियमित रूप से अपडेट किया जाता है।",
    },
  ],
  ar: [
    {
      q: "ما هو دليل SOS-Expat؟",
      a: "دليل SOS-Expat هو الدليل العالمي الوحيد الذي يجمع جميع جهات الاتصال الأساسية للمغتربين والمسافرين والسياح في 197+ دولة: السفارات، خدمات الطوارئ، الهجرة، الصحة، السكن، البنوك، التوظيف، التعليم، النقل، الاتصالات، الضرائب، القانوني والمجتمع. متاح بـ 9 لغات، مجاني تماماً وموثق.",
    },
    {
      q: "كيف أجد سفارتي في الخارج؟",
      a: "اختر بلد وجهتك في الدليل، ثم انقر على فئة 'السفارات'. أدخل جنسيتك لتصفية وعرض سفارتك فقط.",
    },
    {
      q: "ما الدول التي يغطيها الدليل؟",
      a: "يغطي الدليل 197+ دولة عبر 7 قارات: أوروبا، أفريقيا، آسيا، الأمريكتان (الشمالية والجنوبية)، الشرق الأوسط وأوقيانوسيا.",
    },
    {
      q: "هل الدليل مجاني؟",
      a: "نعم، دليل SOS-Expat مجاني تماماً، دون الحاجة إلى تسجيل. جميع الموارد متاحة بحرية.",
    },
    {
      q: "بأي لغات يتوفر الدليل؟",
      a: "الدليل متاح بـ 9 لغات: الفرنسية، الإنجليزية، الإسبانية، الألمانية، البرتغالية، الروسية، الصينية، الهندية والعربية.",
    },
    {
      q: "كيف أضيف رابطاً لدليل SOS-Expat على موقعي؟",
      a: "ما عليك سوى نسخ الرابط https://sos-expat.com/ar-sa/dalil-expat وإضافته إلى موقعك. يتوفر على الصفحة كود HTML جاهز للاستخدام لتسهيل التكامل.",
    },
    {
      q: "ما فئات الموارد المتاحة؟",
      a: "13 فئة: الطوارئ، السفارات، الهجرة، الصحة، السكن، البنوك، التوظيف، التعليم، النقل، الاتصالات، الضرائب، القانوني، المجتمع.",
    },
    {
      q: "هل المعلومات رسمية وموثقة؟",
      a: "نعم، كل مورد موثق. تُعرَّف المصادر الرسمية بشارة 'رسمي'. يتم تحديث البيانات بانتظام.",
    },
  ],
};

// ── Keywords per language ────────────────────────────────────────────────────

const KEYWORDS: Record<string, string[]> = {
  fr: ["annuaire expatriés", "ressources officielles expatriés", "ambassade à l'étranger", "numéro urgence international", "guide installation pays", "services consulaires", "visa immigration", "expatriation ressources", "annuaire mondial gratuit", "contacts officiels étranger"],
  en: ["expat directory", "official expat resources", "embassy abroad", "international emergency number", "country installation guide", "consular services", "visa immigration", "expatriation resources", "free world directory", "official contacts abroad"],
  es: ["directorio expatriados", "recursos oficiales expatriados", "embajada en el extranjero", "número emergencia internacional", "guía instalación país", "servicios consulares", "visa inmigración", "recursos expatriación", "directorio mundial gratuito", "contactos oficiales extranjero"],
  de: ["Expat-Verzeichnis", "offizielle Expat-Ressourcen", "Botschaft im Ausland", "internationale Notrufnummer", "Länder-Installationsführer", "konsularische Dienste", "Visum Einwanderung", "Expatriierungs-Ressourcen", "kostenloses Weltverzeichnis", "offizielle Kontakte im Ausland"],
  pt: ["diretório expatriados", "recursos oficiais expatriados", "embaixada no estrangeiro", "número emergência internacional", "guia instalação país", "serviços consulares", "visto imigração", "recursos expatriação", "diretório mundial gratuito", "contactos oficiais estrangeiro"],
  ru: ["справочник экспатов", "официальные ресурсы для экспатов", "посольство за рубежом", "международный номер экстренной помощи", "руководство по обустройству в стране", "консульские услуги", "виза иммиграция", "ресурсы для переезда", "бесплатный мировой справочник", "официальные контакты за рубежом"],
  ch: ["海外人员指南", "官方海外资源", "海外大使馆", "国际紧急电话", "国家安置指南", "领事服务", "签证移民", "海外资源", "免费全球指南", "海外官方联系方式"],
  hi: ["प्रवासी निर्देशिका", "आधिकारिक प्रवासी संसाधन", "विदेश में दूतावास", "अंतर्राष्ट्रीय आपातकालीन नंबर", "देश स्थापना गाइड", "वाणिज्य दूतावास सेवाएं", "वीजा आव्रजन", "प्रवासन संसाधन", "मुफ्त विश्व निर्देशिका", "विदेश में आधिकारिक संपर्क"],
  ar: ["دليل المغتربين", "موارد رسمية للمغتربين", "سفارة في الخارج", "رقم طوارئ دولي", "دليل الاستقرار في البلد", "الخدمات القنصلية", "تأشيرة الهجرة", "موارد الهجرة", "دليل عالمي مجاني", "جهات اتصال رسمية في الخارج"],
};

// ── ISO lang codes for schema.org inLanguage ────────────────────────────────

const IN_LANGUAGE: Record<string, string> = {
  fr: "fr", en: "en", es: "es", de: "de", pt: "pt",
  ru: "ru", ch: "zh", hi: "hi", ar: "ar",
};

// ── Component ────────────────────────────────────────────────────────────────

const AnnuaireJsonLd: React.FC<AnnuaireJsonLdProps> = ({
  lang,
  canonicalUrl,
  pageTitle,
  pageDesc,
}) => {
  const resolvedLang = FAQ_CONTENT[lang] ? lang : "fr";
  const faqItems = FAQ_CONTENT[resolvedLang];
  const keywords = KEYWORDS[resolvedLang] ?? KEYWORDS["fr"];
  const inLang = IN_LANGUAGE[resolvedLang] ?? "fr";

  const schemas = useMemo(() => {
    // FAQPage
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqItems.map((item) => ({
        "@type": "Question",
        "name": item.q,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": item.a,
        },
      })),
    };

    // CollectionPage
    const collectionSchema = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": pageTitle,
      "description": pageDesc,
      "url": canonicalUrl,
      "inLanguage": inLang,
      "isPartOf": {
        "@type": "WebSite",
        "url": "https://sos-expat.com",
        "name": "SOS-Expat",
      },
      "about": {
        "@type": "Thing",
        "name": "Expatriation",
      },
      "numberOfItems": 197,
      "keywords": keywords.join(", "),
    };

    // Dataset
    const datasetSchema = {
      "@context": "https://schema.org",
      "@type": "Dataset",
      "name": pageTitle,
      "description": pageDesc,
      "url": canonicalUrl,
      "creator": {
        "@type": "Organization",
        "name": "SOS-Expat",
        "url": "https://sos-expat.com",
      },
      "license": "https://creativecommons.org/licenses/by/4.0/",
      "spatialCoverage": "Worldwide",
      "temporalCoverage": "2024/..",
      "inLanguage": inLang,
      "numberOfItems": 197,
      "keywords": keywords.join(", "),
    };

    return [faqSchema, collectionSchema, datasetSchema];
  }, [faqItems, keywords, inLang, canonicalUrl, pageTitle, pageDesc]);

  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
};

export default AnnuaireJsonLd;
export { FAQ_CONTENT };
