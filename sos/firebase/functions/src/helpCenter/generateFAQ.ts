// firebase/functions/src/helpCenter/generateFAQ.ts
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { db } from '../utils/firebase';

// Interface pour une FAQ
interface FAQItem {
  question: Record<string, string>;
  answer: Record<string, string>;
  order: number;
}

/**
 * Génère des FAQ à partir du contenu d'un article en utilisant des templates prédéfinis.
 * Ces templates sont basés sur les patterns SEO et les questions fréquentes des utilisateurs.
 */
function generateFAQFromContent(
  title: Record<string, string>,
  content: Record<string, string>,
  _excerpt: Record<string, string>
): FAQItem[] {
  const faqs: FAQItem[] = [];

  // Récupérer le contenu en français (langue principale) ou première langue disponible
  const mainLang = title.fr ? 'fr' : Object.keys(title)[0] || 'fr';
  const mainTitle = title[mainLang] || '';
  const mainContent = content[mainLang] || '';

  // Analyser le contenu pour identifier le type d'article
  void mainContent; // Reserved for future use
  const titleLower = mainTitle.toLowerCase();

  // FAQ Templates basés sur le type de contenu
  const faqTemplates: Array<{
    condition: () => boolean;
    questions: Array<{ question: Record<string, string>; answer: Record<string, string> }>;
  }> = [
    // Pour les articles sur le paiement
    {
      condition: () => titleLower.includes('paiement') || titleLower.includes('payment') || titleLower.includes('pay'),
      questions: [
        {
          question: {
            fr: 'Comment fonctionne le paiement sur SOS-Expat ?',
            en: 'How does payment work on SOS-Expat?',
            es: '¿Cómo funciona el pago en SOS-Expat?',
            de: 'Wie funktioniert die Zahlung bei SOS-Expat?',
            pt: 'Como funciona o pagamento no SOS-Expat?',
            ru: 'Как работает оплата на SOS-Expat?',
            hi: 'SOS-Expat पर भुगतान कैसे काम करता है?',
            ar: 'كيف يعمل الدفع على SOS-Expat؟',
            ch: 'SOS-Expat上的付款如何运作？'
          },
          answer: {
            fr: 'Le client paie directement le prestataire sur son compte bancaire dans un délai de 24 heures après la mise en relation. Des frais de mise en relation s\'appliquent pour l\'utilisation de la plateforme.',
            en: 'The client pays the provider directly to their bank account within 24 hours after the connection. Connection fees apply for using the platform.',
            es: 'El cliente paga directamente al proveedor en su cuenta bancaria dentro de las 24 horas posteriores a la conexión. Se aplican tarifas de conexión por el uso de la plataforma.',
            de: 'Der Kunde zahlt den Anbieter direkt auf dessen Bankkonto innerhalb von 24 Stunden nach der Verbindung. Vermittlungsgebühren fallen für die Nutzung der Plattform an.',
            pt: 'O cliente paga diretamente ao prestador na sua conta bancária dentro de 24 horas após a conexão. Aplicam-se taxas de conexão para utilizar a plataforma.',
            ru: 'Клиент платит поставщику напрямую на его банковский счёт в течение 24 часов после подключения. За использование платформы взимается плата за подключение.',
            hi: 'ग्राहक कनेक्शन के 24 घंटे के भीतर सीधे प्रदाता के बैंक खाते में भुगतान करता है। प्लेटफॉर्म का उपयोग करने के लिए कनेक्शन शुल्क लागू होते हैं।',
            ar: 'يدفع العميل للمزود مباشرة في حسابه البنكي خلال 24 ساعة بعد الاتصال. تُطبق رسوم الاتصال لاستخدام المنصة.',
            ch: '客户在连接后24小时内直接向服务提供商的银行账户付款。使用平台需支付连接费。'
          }
        },
        {
          question: {
            fr: 'Quels modes de paiement sont acceptés ?',
            en: 'What payment methods are accepted?',
            es: '¿Qué métodos de pago se aceptan?',
            de: 'Welche Zahlungsmethoden werden akzeptiert?',
            pt: 'Quais métodos de pagamento são aceitos?',
            ru: 'Какие способы оплаты принимаются?',
            hi: 'कौन से भुगतान के तरीके स्वीकार किए जाते हैं?',
            ar: 'ما هي طرق الدفع المقبولة؟',
            ch: '接受哪些付款方式？'
          },
          answer: {
            fr: 'SOS-Expat accepte les paiements par carte bancaire (Visa, Mastercard, American Express) via notre système de paiement sécurisé Stripe.',
            en: 'SOS-Expat accepts payments by bank card (Visa, Mastercard, American Express) via our secure Stripe payment system.',
            es: 'SOS-Expat acepta pagos con tarjeta bancaria (Visa, Mastercard, American Express) a través de nuestro sistema de pago seguro Stripe.',
            de: 'SOS-Expat akzeptiert Zahlungen per Bankkarte (Visa, Mastercard, American Express) über unser sicheres Stripe-Zahlungssystem.',
            pt: 'SOS-Expat aceita pagamentos por cartão bancário (Visa, Mastercard, American Express) através do nosso sistema de pagamento seguro Stripe.',
            ru: 'SOS-Expat принимает оплату банковской картой (Visa, Mastercard, American Express) через нашу безопасную платежную систему Stripe.',
            hi: 'SOS-Expat हमारे सुरक्षित Stripe भुगतान प्रणाली के माध्यम से बैंक कार्ड (Visa, Mastercard, American Express) द्वारा भुगतान स्वीकार करता है।',
            ar: 'تقبل SOS-Expat المدفوعات بالبطاقة المصرفية (Visa، Mastercard، American Express) عبر نظام الدفع الآمن Stripe.',
            ch: 'SOS-Expat通过我们安全的Stripe支付系统接受银行卡（Visa、Mastercard、American Express）付款。'
          }
        }
      ]
    },
    // Pour les articles sur l'inscription/prestataires
    {
      condition: () => titleLower.includes('inscription') || titleLower.includes('register') || titleLower.includes('prestataire') || titleLower.includes('provider'),
      questions: [
        {
          question: {
            fr: 'Comment devenir prestataire sur SOS-Expat ?',
            en: 'How to become a provider on SOS-Expat?',
            es: '¿Cómo convertirse en proveedor en SOS-Expat?',
            de: 'Wie wird man Anbieter bei SOS-Expat?',
            pt: 'Como se tornar um prestador no SOS-Expat?',
            ru: 'Как стать поставщиком услуг на SOS-Expat?',
            hi: 'SOS-Expat पर प्रदाता कैसे बनें?',
            ar: 'كيف تصبح مقدم خدمات على SOS-Expat؟',
            ch: '如何成为SOS-Expat的服务提供商？'
          },
          answer: {
            fr: 'L\'inscription est gratuite. Remplissez le formulaire avec vos informations professionnelles, téléchargez les documents requis, et notre équipe vérifiera votre profil. Une fois approuvé, vous pourrez recevoir des demandes de clients.',
            en: 'Registration is free. Fill out the form with your professional information, upload the required documents, and our team will verify your profile. Once approved, you can start receiving client requests.',
            es: 'La inscripción es gratuita. Complete el formulario con su información profesional, cargue los documentos requeridos y nuestro equipo verificará su perfil. Una vez aprobado, podrá recibir solicitudes de clientes.',
            de: 'Die Anmeldung ist kostenlos. Füllen Sie das Formular mit Ihren beruflichen Informationen aus, laden Sie die erforderlichen Dokumente hoch, und unser Team wird Ihr Profil überprüfen. Nach der Genehmigung können Sie Kundenanfragen erhalten.',
            pt: 'O cadastro é gratuito. Preencha o formulário com suas informações profissionais, carregue os documentos necessários e nossa equipe verificará seu perfil. Após aprovação, você poderá receber solicitações de clientes.',
            ru: 'Регистрация бесплатна. Заполните форму с вашей профессиональной информацией, загрузите необходимые документы, и наша команда проверит ваш профиль. После одобрения вы сможете получать запросы от клиентов.',
            hi: 'पंजीकरण मुफ्त है। अपनी पेशेवर जानकारी के साथ फॉर्म भरें, आवश्यक दस्तावेज अपलोड करें, और हमारी टीम आपकी प्रोफाइल सत्यापित करेगी। मंजूरी के बाद, आप ग्राहक अनुरोध प्राप्त कर सकते हैं।',
            ar: 'التسجيل مجاني. املأ النموذج بمعلوماتك المهنية، قم بتحميل المستندات المطلوبة، وسيقوم فريقنا بالتحقق من ملفك الشخصي. بمجرد الموافقة، يمكنك البدء في تلقي طلبات العملاء.',
            ch: '注册是免费的。填写表格并提供您的专业信息，上传所需文件，我们的团队将验证您的资料。获得批准后，您可以开始接收客户请求。'
          }
        },
        {
          question: {
            fr: 'Qu\'est-ce que les frais de mise en relation ?',
            en: 'What are connection fees?',
            es: '¿Qué son las tarifas de conexión?',
            de: 'Was sind Vermittlungsgebühren?',
            pt: 'O que são taxas de conexão?',
            ru: 'Что такое плата за подключение?',
            hi: 'कनेक्शन शुल्क क्या हैं?',
            ar: 'ما هي رسوم الاتصال؟',
            ch: '什么是连接费？'
          },
          answer: {
            fr: 'Les frais de mise en relation permettent de financer le fonctionnement de la plateforme et la vérification des prestataires. Ces frais sont communiqués de manière transparente lors de votre inscription et sont visibles dans votre espace personnel.',
            en: 'Connection fees fund the platform operations and provider verification. These fees are communicated transparently during your registration and are visible in your personal dashboard.',
            es: 'Las tarifas de conexión financian las operaciones de la plataforma y la verificación de proveedores. Estas tarifas se comunican de forma transparente durante su registro y son visibles en su panel personal.',
            de: 'Vermittlungsgebühren finanzieren den Betrieb der Plattform und die Überprüfung der Anbieter. Diese Gebühren werden bei der Registrierung transparent kommuniziert und sind in Ihrem persönlichen Dashboard sichtbar.',
            pt: 'As taxas de conexão financiam as operações da plataforma e a verificação dos prestadores. Essas taxas são comunicadas de forma transparente durante o seu cadastro e são visíveis no seu painel pessoal.',
            ru: 'Плата за подключение финансирует работу платформы и проверку поставщиков. Эти сборы прозрачно сообщаются при регистрации и видны в вашем личном кабинете.',
            hi: 'कनेक्शन शुल्क प्लेटफॉर्म संचालन और प्रदाता सत्यापन के लिए धन प्रदान करते हैं। ये शुल्क आपके पंजीकरण के दौरान पारदर्शी रूप से बताए जाते हैं और आपके व्यक्तिगत डैशबोर्ड में दिखाई देते हैं।',
            ar: 'تمول رسوم الاتصال عمليات المنصة والتحقق من مقدمي الخدمات. يتم الإبلاغ عن هذه الرسوم بشفافية أثناء التسجيل وتكون مرئية في لوحة التحكم الشخصية الخاصة بك.',
            ch: '连接费用于资助平台运营和服务提供商验证。这些费用在您注册时会透明地告知，并可在您的个人控制面板中查看。'
          }
        }
      ]
    },
    // Pour les articles sur l'urgence/SOS
    {
      condition: () => titleLower.includes('urgence') || titleLower.includes('urgent') || titleLower.includes('sos') || titleLower.includes('emergency'),
      questions: [
        {
          question: {
            fr: 'Quel est le délai de réponse pour une urgence ?',
            en: 'What is the response time for emergencies?',
            es: '¿Cuál es el tiempo de respuesta para emergencias?',
            de: 'Wie schnell ist die Reaktionszeit bei Notfällen?',
            pt: 'Qual é o tempo de resposta para emergências?',
            ru: 'Какое время отклика в экстренных ситуациях?',
            hi: 'आपातकालीन स्थितियों के लिए प्रतिक्रिया समय क्या है?',
            ar: 'ما هو وقت الاستجابة لحالات الطوارئ؟',
            ch: '紧急情况的响应时间是多少？'
          },
          answer: {
            fr: 'Notre service SOS fonctionne 24h/24 et 7j/7. Un expert ou avocat vous répond en moins de 5 minutes. Idéal pour les urgences administratives, juridiques ou personnelles lors de votre expatriation.',
            en: 'Our SOS service operates 24/7. An expert or lawyer responds in less than 5 minutes. Ideal for administrative, legal, or personal emergencies during your expatriation.',
            es: 'Nuestro servicio SOS funciona las 24 horas, los 7 días de la semana. Un experto o abogado responde en menos de 5 minutos. Ideal para emergencias administrativas, legales o personales durante su expatriación.',
            de: 'Unser SOS-Service ist rund um die Uhr verfügbar. Ein Experte oder Anwalt antwortet in weniger als 5 Minuten. Ideal für administrative, rechtliche oder persönliche Notfälle während Ihrer Expatriierung.',
            pt: 'Nosso serviço SOS funciona 24 horas por dia, 7 dias por semana. Um especialista ou advogado responde em menos de 5 minutos. Ideal para emergências administrativas, jurídicas ou pessoais durante sua expatriação.',
            ru: 'Наша служба SOS работает круглосуточно. Эксперт или адвокат отвечает менее чем за 5 минут. Идеально для административных, юридических или личных экстренных ситуаций во время вашей экспатриации.',
            hi: 'हमारी SOS सेवा 24/7 संचालित होती है। एक विशेषज्ञ या वकील 5 मिनट से कम समय में जवाब देता है। आपके प्रवासन के दौरान प्रशासनिक, कानूनी या व्यक्तिगत आपात स्थितियों के लिए आदर्श।',
            ar: 'تعمل خدمة SOS الخاصة بنا على مدار الساعة طوال أيام الأسبوع. يستجيب خبير أو محامٍ في أقل من 5 دقائق. مثالي للطوارئ الإدارية أو القانونية أو الشخصية أثناء الاغتراب.',
            ch: '我们的SOS服务全天候运营。专家或律师在5分钟内回复。非常适合您在海外期间的行政、法律或个人紧急情况。'
          }
        }
      ]
    },
    // FAQ générique pour tous les articles
    {
      condition: () => true,
      questions: [
        {
          question: {
            fr: 'Comment contacter le support SOS-Expat ?',
            en: 'How to contact SOS-Expat support?',
            es: '¿Cómo contactar el soporte de SOS-Expat?',
            de: 'Wie kontaktiere ich den SOS-Expat Support?',
            pt: 'Como contactar o suporte SOS-Expat?',
            ru: 'Как связаться со службой поддержки SOS-Expat?',
            hi: 'SOS-Expat सहायता से कैसे संपर्क करें?',
            ar: 'كيف تتواصل مع دعم SOS-Expat؟',
            ch: '如何联系SOS-Expat支持？'
          },
          answer: {
            fr: 'Vous pouvez nous contacter via le formulaire de contact sur notre site, par email à contact@sos-expat.com, ou directement via votre espace personnel. Notre équipe vous répond dans les plus brefs délais.',
            en: 'You can contact us via the contact form on our website, by email at contact@sos-expat.com, or directly through your personal dashboard. Our team will respond as soon as possible.',
            es: 'Puede contactarnos a través del formulario de contacto en nuestro sitio web, por correo electrónico a contact@sos-expat.com, o directamente a través de su panel personal. Nuestro equipo le responderá lo antes posible.',
            de: 'Sie können uns über das Kontaktformular auf unserer Website, per E-Mail an contact@sos-expat.com oder direkt über Ihr persönliches Dashboard kontaktieren. Unser Team wird so schnell wie möglich antworten.',
            pt: 'Pode contactar-nos através do formulário de contacto no nosso site, por email para contact@sos-expat.com, ou diretamente através do seu painel pessoal. A nossa equipa responderá o mais brevemente possível.',
            ru: 'Вы можете связаться с нами через контактную форму на нашем сайте, по электронной почте contact@sos-expat.com или напрямую через личный кабинет. Наша команда ответит как можно скорее.',
            hi: 'आप हमारी वेबसाइट पर संपर्क फॉर्म के माध्यम से, contact@sos-expat.com पर ईमेल द्वारा, या सीधे अपने व्यक्तिगत डैशबोर्ड के माध्यम से हमसे संपर्क कर सकते हैं। हमारी टीम जल्द से जल्द जवाब देगी।',
            ar: 'يمكنك الاتصال بنا عبر نموذج الاتصال على موقعنا، عبر البريد الإلكتروني على contact@sos-expat.com، أو مباشرة من خلال لوحة التحكم الشخصية. سيرد فريقنا في أقرب وقت ممكن.',
            ch: '您可以通过我们网站上的联系表格、发送电子邮件至contact@sos-expat.com或直接通过您的个人控制面板与我们联系。我们的团队将尽快回复。'
          }
        },
        {
          question: {
            fr: 'Dans combien de pays SOS-Expat est-il disponible ?',
            en: 'In how many countries is SOS-Expat available?',
            es: '¿En cuántos países está disponible SOS-Expat?',
            de: 'In wie vielen Ländern ist SOS-Expat verfügbar?',
            pt: 'Em quantos países o SOS-Expat está disponível?',
            ru: 'В скольких странах доступен SOS-Expat?',
            hi: 'SOS-Expat कितने देशों में उपलब्ध है?',
            ar: 'في كم دولة يتوفر SOS-Expat؟',
            ch: 'SOS-Expat在多少个国家可用？'
          },
          answer: {
            fr: 'SOS-Expat opère dans 197 pays à travers le monde. Notre réseau de prestataires vérifiés couvre tous les continents, avec un support disponible en 9 langues (français, anglais, espagnol, allemand, portugais, russe, chinois, arabe, hindi).',
            en: 'SOS-Expat operates in 197 countries worldwide. Our network of verified providers covers all continents, with support available in 9 languages (French, English, Spanish, German, Portuguese, Russian, Chinese, Arabic, Hindi).',
            es: 'SOS-Expat opera en 197 países en todo el mundo. Nuestra red de proveedores verificados cubre todos los continentes, con soporte disponible en 9 idiomas (francés, inglés, español, alemán, portugués, ruso, chino, árabe, hindi).',
            de: 'SOS-Expat ist in 197 Ländern weltweit tätig. Unser Netzwerk verifizierter Anbieter deckt alle Kontinente ab, mit Support in 9 Sprachen (Französisch, Englisch, Spanisch, Deutsch, Portugiesisch, Russisch, Chinesisch, Arabisch, Hindi).',
            pt: 'O SOS-Expat opera em 197 países em todo o mundo. Nossa rede de prestadores verificados cobre todos os continentes, com suporte disponível em 9 idiomas (francês, inglês, espanhol, alemão, português, russo, chinês, árabe, hindi).',
            ru: 'SOS-Expat работает в 197 странах мира. Наша сеть проверенных поставщиков охватывает все континенты, с поддержкой на 9 языках (французский, английский, испанский, немецкий, португальский, русский, китайский, арабский, хинди).',
            hi: 'SOS-Expat दुनिया भर के 197 देशों में संचालित होता है। हमारे सत्यापित प्रदाताओं का नेटवर्क सभी महाद्वीपों को कवर करता है, जिसमें 9 भाषाओं में सहायता उपलब्ध है (फ्रेंच, अंग्रेजी, स्पेनिश, जर्मन, पुर्तगाली, रूसी, चीनी, अरबी, हिंदी)।',
            ar: 'تعمل SOS-Expat في 197 دولة حول العالم. تغطي شبكتنا من مقدمي الخدمات المعتمدين جميع القارات، مع توفر الدعم بـ 9 لغات (الفرنسية، الإنجليزية، الإسبانية، الألمانية، البرتغالية، الروسية، الصينية، العربية، الهندية).',
            ch: 'SOS-Expat在全球197个国家运营。我们经过验证的服务提供商网络覆盖所有大陆，提供9种语言的支持（法语、英语、西班牙语、德语、葡萄牙语、俄语、中文、阿拉伯语、印地语）。'
          }
        }
      ]
    }
  ];

  // Générer les FAQ en fonction du contenu
  let faqOrder = 0;

  for (const template of faqTemplates) {
    if (template.condition()) {
      for (const q of template.questions) {
        // Éviter les doublons
        const alreadyExists = faqs.some(f => f.question.fr === q.question.fr);
        if (!alreadyExists) {
          faqs.push({
            question: q.question,
            answer: q.answer,
            order: faqOrder++
          });
        }
      }
    }

    // Limiter à 5 FAQ par article
    if (faqs.length >= 5) break;
  }

  // S'assurer d'avoir au moins 3 FAQ
  if (faqs.length < 3) {
    // Ajouter les FAQ génériques restantes
    const genericTemplate = faqTemplates[faqTemplates.length - 1];
    for (const q of genericTemplate.questions) {
      const alreadyExists = faqs.some(f => f.question.fr === q.question.fr);
      if (!alreadyExists && faqs.length < 3) {
        faqs.push({
          question: q.question,
          answer: q.answer,
          order: faqOrder++
        });
      }
    }
  }

  return faqs;
}

/**
 * Cloud Function triggered when a new help article is created
 * Generates FAQ automatically based on article content
 */
export const onHelpArticleCreated = onDocumentCreated(
  {
    document: 'help_articles/{articleId}',
    cpu: 0.083,
  },
  async (event) => {
    const articleId = event.params.articleId;
    const data = event.data?.data();

    if (!data) {
      console.log(`[generateFAQ] No data for article ${articleId}`);
      return;
    }

    // Ne pas régénérer si des FAQ existent déjà
    if (data.faqs && Array.isArray(data.faqs) && data.faqs.length > 0) {
      console.log(`[generateFAQ] Article ${articleId} already has FAQs, skipping`);
      return;
    }

    console.log(`[generateFAQ] Generating FAQ for new article: ${articleId}`);

    try {
      const title = data.title || {};
      const content = data.content || {};
      const excerpt = data.excerpt || {};

      // Générer les FAQ
      const faqs = generateFAQFromContent(title, content, excerpt);

      if (faqs.length > 0) {
        // Mettre à jour l'article avec les FAQ générées
        await db.collection('help_articles').doc(articleId).update({
          faqs,
          faqGeneratedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`[generateFAQ] Successfully generated ${faqs.length} FAQs for article ${articleId}`);
      }
    } catch (error) {
      console.error(`[generateFAQ] Error generating FAQ for article ${articleId}:`, error);
    }
  }
);

/**
 * Cloud Function triggered when a help article is updated
 * Only regenerates FAQ if content has changed and no FAQs exist
 */
export const onHelpArticleUpdated = onDocumentUpdated(
  {
    document: 'help_articles/{articleId}',
    cpu: 0.083,
  },
  async (event) => {
    const articleId = event.params.articleId;
    const beforeData = event.data?.before?.data();
    const afterData = event.data?.after?.data();

    if (!beforeData || !afterData) {
      return;
    }

    // Ne pas régénérer si des FAQ existent déjà
    if (afterData.faqs && Array.isArray(afterData.faqs) && afterData.faqs.length > 0) {
      return;
    }

    // Vérifier si le contenu a changé
    const contentChanged = JSON.stringify(beforeData.content) !== JSON.stringify(afterData.content) ||
                          JSON.stringify(beforeData.title) !== JSON.stringify(afterData.title);

    if (!contentChanged) {
      return;
    }

    console.log(`[generateFAQ] Content changed for article ${articleId}, generating FAQ`);

    try {
      const title = afterData.title || {};
      const content = afterData.content || {};
      const excerpt = afterData.excerpt || {};

      // Générer les FAQ
      const faqs = generateFAQFromContent(title, content, excerpt);

      if (faqs.length > 0) {
        await db.collection('help_articles').doc(articleId).update({
          faqs,
          faqGeneratedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`[generateFAQ] Successfully regenerated ${faqs.length} FAQs for article ${articleId}`);
      }
    } catch (error) {
      console.error(`[generateFAQ] Error regenerating FAQ for article ${articleId}:`, error);
    }
  }
);
