/**
 * Script to add missing FAQ translations for registration pages
 * Adds FAQ for registerClient, registerLawyer, and registerExpat
 */

const fs = require('fs');
const path = require('path');

const HELPER_DIR = path.join(__dirname, '../src/helper');

// FAQ translations for all 9 languages
const FAQ_TRANSLATIONS = {
  fr: {
    // Client FAQ
    'registerClient.faq.title': 'Questions Fréquentes',

    // Lawyer FAQ
    'registerLawyer.faq.title': 'Questions Fréquentes',
    'registerLawyer.faq.q1': "Comment devenir avocat partenaire sur SOS-Expat ?",
    'registerLawyer.faq.a1': "Remplissez le formulaire d'inscription avec vos informations professionnelles : email, mot de passe, nom complet, photo professionnelle, biographie (minimum 50 caractères), pays de résidence, langues parlées, spécialités juridiques, pays d'intervention et formations. Après validation de votre profil par notre équipe, vous pourrez commencer à recevoir des appels clients.",
    'registerLawyer.faq.q2': "Combien coûte l'inscription en tant qu'avocat ?",
    'registerLawyer.faq.a2': "L'inscription sur SOS-Expat est entièrement gratuite. Vous ne payez aucun frais d'inscription ni d'abonnement. Nous prélevons uniquement une commission sur les consultations réalisées via la plateforme. Vous gardez le contrôle total sur vos tarifs et votre disponibilité.",
    'registerLawyer.faq.q3': "Quelles sont les spécialités juridiques acceptées ?",
    'registerLawyer.faq.a3': "Nous acceptons toutes les spécialités juridiques pertinentes pour les expatriés : droit de l'immigration, droit du travail international, droit de la famille transfrontalier, droit des affaires internationales, droit fiscal international, droit immobilier à l'étranger, et bien plus. Vous pouvez sélectionner plusieurs spécialités lors de votre inscription.",
    'registerLawyer.faq.q4': "Dans combien de pays puis-je exercer sur la plateforme ?",
    'registerLawyer.faq.a4': "Vous pouvez indiquer tous les pays dans lesquels vous êtes autorisé à exercer le droit. Il n'y a aucune limitation géographique. Plus vous couvrez de pays, plus vous aurez d'opportunités de consultations avec des clients internationaux.",
    'registerLawyer.faq.q5': "Mes informations professionnelles sont-elles vérifiées ?",
    'registerLawyer.faq.a5': "Oui, absolument. Notre équipe vérifie l'authenticité de tous les profils d'avocats avant leur activation. Nous vérifions vos diplômes, votre inscription au barreau et votre expérience professionnelle. Cela garantit la qualité et la confiance sur notre plateforme.",
    'registerLawyer.faq.q6': "Puis-je modifier mon profil après l'inscription ?",
    'registerLawyer.faq.a6': "Oui, vous pouvez modifier toutes vos informations (photo, biographie, spécialités, pays d'intervention, langues, tarifs, disponibilité, etc.) depuis votre tableau de bord avocat à tout moment. Votre profil reste toujours à jour pour attirer les meilleurs clients.",
    'registerLawyer.faq.q7': "Combien de temps prend la validation de mon profil ?",
    'registerLawyer.faq.a7': "Une fois votre inscription complétée, notre équipe examine votre profil sous 24 à 48 heures ouvrables. Vous recevrez un email de confirmation dès que votre profil sera activé. En cas de documents manquants, nous vous contacterons rapidement.",
    'registerLawyer.faq.q8': "Comment recevoir mes premiers clients ?",
    'registerLawyer.faq.a8': "Dès que votre profil est validé, vous apparaissez automatiquement dans les résultats de recherche selon vos spécialités et pays d'intervention. Les clients peuvent vous appeler directement via la plateforme. Vous recevez les appels sur votre téléphone et gérez votre disponibilité en temps réel.",

    // Expat FAQ
    'registerExpat.faq.title': 'Questions Fréquentes',
    'registerExpat.faq.q1': "Comment devenir expat helper sur SOS-Expat ?",
    'registerExpat.faq.a1': "Remplissez le formulaire d'inscription avec vos informations : email, mot de passe, nom complet, photo professionnelle, biographie détaillée (minimum 50 caractères), pays de résidence, langues parlées, pays d'expertise et vos formations ou expériences. Notre équipe validera ensuite votre profil.",
    'registerExpat.faq.q2': "Quelle est la différence entre expat helper et avocat ?",
    'registerExpat.faq.a2': "Les expat helpers sont des expatriés expérimentés qui partagent leurs conseils pratiques et leur connaissance du terrain. Contrairement aux avocats, vous n'avez pas besoin de diplôme en droit. Vous aidez sur des questions concrètes : vie quotidienne, démarches administratives, logement, scolarité, adaptation culturelle, etc.",
    'registerExpat.faq.q3': "Est-ce que l'inscription en tant qu'expat helper est payante ?",
    'registerExpat.faq.a3': "Non, l'inscription est 100% gratuite. Il n'y a aucun frais d'inscription ni d'abonnement. Vous ne payez rien. Nous prélevons uniquement une petite commission sur les consultations que vous réalisez via la plateforme. Vous fixez librement vos tarifs.",
    'registerExpat.faq.q4': "Dois-je avoir un diplôme spécifique pour m'inscrire ?",
    'registerExpat.faq.a4': "Non, aucun diplôme spécifique n'est requis. Ce qui compte, c'est votre expérience d'expatriation et votre connaissance approfondie du pays où vous résidez. Cependant, mentionner vos formations pertinentes (langues, gestion, coaching, etc.) renforce votre crédibilité.",
    'registerExpat.faq.q5': "Dans combien de pays puis-je offrir mes services ?",
    'registerExpat.faq.a5': "Vous pouvez indiquer tous les pays dans lesquels vous avez vécu ou que vous connaissez très bien. Il n'y a aucune limite. Plus vous couvrez de pays, plus vous aurez d'opportunités d'aider des expatriés du monde entier.",
    'registerExpat.faq.q6': "Mon profil sera-t-il vérifié avant activation ?",
    'registerExpat.faq.a6': "Oui, notre équipe examine tous les profils d'expat helpers pour garantir la qualité de service sur la plateforme. Nous vérifions votre expérience d'expatriation, vos compétences et la complétude de votre profil. La validation prend généralement 24 à 48 heures.",
    'registerExpat.faq.q7': "Puis-je modifier mes informations après l'inscription ?",
    'registerExpat.faq.a7': "Absolument. Vous pouvez modifier toutes vos informations (photo, biographie, pays d'expertise, langues, tarifs, disponibilité, etc.) depuis votre tableau de bord à tout moment. Gardez votre profil à jour pour attirer plus de clients.",
    'registerExpat.faq.q8': "Comment vais-je recevoir des appels de clients ?",
    'registerExpat.faq.a8': "Une fois votre profil validé, vous apparaissez dans les résultats de recherche selon vos pays d'expertise et langues. Les clients vous appellent directement via la plateforme. Vous recevez les appels sur votre téléphone et gérez votre disponibilité en temps réel depuis votre tableau de bord.",
  },

  en: {
    // Client FAQ
    'registerClient.faq.title': 'Frequently Asked Questions',

    // Lawyer FAQ
    'registerLawyer.faq.title': 'Frequently Asked Questions',
    'registerLawyer.faq.q1': "How do I become a partner lawyer on SOS-Expat?",
    'registerLawyer.faq.a1': "Fill in the registration form with your professional information: email, password, full name, professional photo, biography (minimum 50 characters), country of residence, spoken languages, legal specialties, countries of practice, and education. After your profile is validated by our team, you can start receiving client calls.",
    'registerLawyer.faq.q2': "How much does it cost to register as a lawyer?",
    'registerLawyer.faq.a2': "Registration on SOS-Expat is completely free. You pay no registration or subscription fees. We only take a commission on consultations completed through the platform. You maintain full control over your rates and availability.",
    'registerLawyer.faq.q3': "What legal specialties are accepted?",
    'registerLawyer.faq.a3': "We accept all legal specialties relevant to expats: immigration law, international labor law, cross-border family law, international business law, international tax law, overseas real estate law, and much more. You can select multiple specialties during registration.",
    'registerLawyer.faq.q4': "In how many countries can I practice on the platform?",
    'registerLawyer.faq.a4': "You can indicate all countries where you are authorized to practice law. There are no geographic limitations. The more countries you cover, the more consultation opportunities you'll have with international clients.",
    'registerLawyer.faq.q5': "Is my professional information verified?",
    'registerLawyer.faq.a5': "Yes, absolutely. Our team verifies the authenticity of all lawyer profiles before activation. We verify your degrees, bar registration, and professional experience. This ensures quality and trust on our platform.",
    'registerLawyer.faq.q6': "Can I modify my profile after registration?",
    'registerLawyer.faq.a6': "Yes, you can modify all your information (photo, biography, specialties, countries of practice, languages, rates, availability, etc.) from your lawyer dashboard at any time. Your profile stays always up-to-date to attract the best clients.",
    'registerLawyer.faq.q7': "How long does profile validation take?",
    'registerLawyer.faq.a7': "Once your registration is complete, our team reviews your profile within 24 to 48 business hours. You'll receive a confirmation email as soon as your profile is activated. If documents are missing, we'll contact you quickly.",
    'registerLawyer.faq.q8': "How do I get my first clients?",
    'registerLawyer.faq.a8': "As soon as your profile is validated, you automatically appear in search results based on your specialties and countries of practice. Clients can call you directly through the platform. You receive calls on your phone and manage your availability in real-time.",

    // Expat FAQ
    'registerExpat.faq.title': 'Frequently Asked Questions',
    'registerExpat.faq.q1': "How do I become an expat helper on SOS-Expat?",
    'registerExpat.faq.a1': "Fill in the registration form with your information: email, password, full name, professional photo, detailed biography (minimum 50 characters), country of residence, spoken languages, countries of expertise, and your education or experience. Our team will then validate your profile.",
    'registerExpat.faq.q2': "What's the difference between expat helper and lawyer?",
    'registerExpat.faq.a2': "Expat helpers are experienced expats who share practical advice and on-the-ground knowledge. Unlike lawyers, you don't need a law degree. You help with concrete questions: daily life, administrative procedures, housing, schooling, cultural adaptation, etc.",
    'registerExpat.faq.q3': "Is registration as an expat helper paid?",
    'registerExpat.faq.a3': "No, registration is 100% free. There are no registration or subscription fees. You pay nothing. We only take a small commission on consultations you complete through the platform. You freely set your own rates.",
    'registerExpat.faq.q4': "Do I need a specific degree to register?",
    'registerExpat.faq.a4': "No, no specific degree is required. What matters is your expatriation experience and in-depth knowledge of the country where you reside. However, mentioning relevant training (languages, management, coaching, etc.) strengthens your credibility.",
    'registerExpat.faq.q5': "In how many countries can I offer my services?",
    'registerExpat.faq.a5': "You can indicate all countries where you have lived or know very well. There are no limits. The more countries you cover, the more opportunities you'll have to help expats worldwide.",
    'registerExpat.faq.q6': "Will my profile be verified before activation?",
    'registerExpat.faq.a6': "Yes, our team reviews all expat helper profiles to ensure service quality on the platform. We verify your expatriation experience, skills, and profile completeness. Validation usually takes 24 to 48 hours.",
    'registerExpat.faq.q7': "Can I modify my information after registration?",
    'registerExpat.faq.a7': "Absolutely. You can modify all your information (photo, biography, countries of expertise, languages, rates, availability, etc.) from your dashboard at any time. Keep your profile updated to attract more clients.",
    'registerExpat.faq.q8': "How will I receive client calls?",
    'registerExpat.faq.a8': "Once your profile is validated, you appear in search results based on your countries of expertise and languages. Clients call you directly through the platform. You receive calls on your phone and manage your availability in real-time from your dashboard.",
  },

  es: {
    // Client FAQ
    'registerClient.faq.title': 'Preguntas Frecuentes',

    // Lawyer FAQ
    'registerLawyer.faq.title': 'Preguntas Frecuentes',
    'registerLawyer.faq.q1': "¿Cómo convertirme en abogado asociado en SOS-Expat?",
    'registerLawyer.faq.a1': "Complete el formulario de registro con su información profesional: email, contraseña, nombre completo, foto profesional, biografía (mínimo 50 caracteres), país de residencia, idiomas hablados, especialidades jurídicas, países de ejercicio y formación. Después de la validación de su perfil por nuestro equipo, podrá comenzar a recibir llamadas de clientes.",
    'registerLawyer.faq.q2': "¿Cuánto cuesta registrarse como abogado?",
    'registerLawyer.faq.a2': "El registro en SOS-Expat es completamente gratuito. No paga tarifas de registro ni suscripción. Solo cobramos una comisión sobre las consultas realizadas a través de la plataforma. Usted mantiene el control total sobre sus tarifas y disponibilidad.",
    'registerLawyer.faq.q3': "¿Qué especialidades jurídicas se aceptan?",
    'registerLawyer.faq.a3': "Aceptamos todas las especialidades jurídicas relevantes para expatriados: derecho de inmigración, derecho laboral internacional, derecho de familia transfronterizo, derecho comercial internacional, derecho fiscal internacional, derecho inmobiliario en el extranjero y mucho más. Puede seleccionar varias especialidades durante el registro.",
    'registerLawyer.faq.q4': "¿En cuántos países puedo ejercer en la plataforma?",
    'registerLawyer.faq.a4': "Puede indicar todos los países donde está autorizado para ejercer el derecho. No hay limitaciones geográficas. Cuantos más países cubra, más oportunidades de consultas tendrá con clientes internacionales.",
    'registerLawyer.faq.q5': "¿Se verifica mi información profesional?",
    'registerLawyer.faq.a5': "Sí, absolutamente. Nuestro equipo verifica la autenticidad de todos los perfiles de abogados antes de su activación. Verificamos sus títulos, inscripción en el colegio de abogados y experiencia profesional. Esto garantiza la calidad y confianza en nuestra plataforma.",
    'registerLawyer.faq.q6': "¿Puedo modificar mi perfil después del registro?",
    'registerLawyer.faq.a6': "Sí, puede modificar toda su información (foto, biografía, especialidades, países de ejercicio, idiomas, tarifas, disponibilidad, etc.) desde su panel de abogado en cualquier momento. Su perfil se mantiene siempre actualizado para atraer a los mejores clientes.",
    'registerLawyer.faq.q7': "¿Cuánto tiempo tarda la validación de mi perfil?",
    'registerLawyer.faq.a7': "Una vez completado su registro, nuestro equipo revisa su perfil en 24 a 48 horas hábiles. Recibirá un correo de confirmación tan pronto como se active su perfil. Si faltan documentos, nos pondremos en contacto rápidamente.",
    'registerLawyer.faq.q8': "¿Cómo recibo mis primeros clientes?",
    'registerLawyer.faq.a8': "Tan pronto como se valide su perfil, aparece automáticamente en los resultados de búsqueda según sus especialidades y países de ejercicio. Los clientes pueden llamarlo directamente a través de la plataforma. Recibe llamadas en su teléfono y gestiona su disponibilidad en tiempo real.",

    // Expat FAQ
    'registerExpat.faq.title': 'Preguntas Frecuentes',
    'registerExpat.faq.q1': "¿Cómo convertirme en expat helper en SOS-Expat?",
    'registerExpat.faq.a1': "Complete el formulario de registro con su información: email, contraseña, nombre completo, foto profesional, biografía detallada (mínimo 50 caracteres), país de residencia, idiomas hablados, países de experiencia y su formación o experiencia. Nuestro equipo validará luego su perfil.",
    'registerExpat.faq.q2': "¿Cuál es la diferencia entre expat helper y abogado?",
    'registerExpat.faq.a2': "Los expat helpers son expatriados experimentados que comparten consejos prácticos y conocimiento sobre el terreno. A diferencia de los abogados, no necesita un título en derecho. Ayuda con preguntas concretas: vida diaria, trámites administrativos, vivienda, escolarización, adaptación cultural, etc.",
    'registerExpat.faq.q3': "¿El registro como expat helper es de pago?",
    'registerExpat.faq.a3': "No, el registro es 100% gratuito. No hay tarifas de registro ni suscripción. No paga nada. Solo cobramos una pequeña comisión sobre las consultas que realiza a través de la plataforma. Usted fija libremente sus tarifas.",
    'registerExpat.faq.q4': "¿Necesito un título específico para registrarme?",
    'registerExpat.faq.a4': "No, no se requiere ningún título específico. Lo que importa es su experiencia de expatriación y conocimiento profundo del país donde reside. Sin embargo, mencionar su formación relevante (idiomas, gestión, coaching, etc.) refuerza su credibilidad.",
    'registerExpat.faq.q5': "¿En cuántos países puedo ofrecer mis servicios?",
    'registerExpat.faq.a5': "Puede indicar todos los países donde ha vivido o conoce muy bien. No hay límites. Cuantos más países cubra, más oportunidades tendrá de ayudar a expatriados de todo el mundo.",
    'registerExpat.faq.q6': "¿Se verificará mi perfil antes de la activación?",
    'registerExpat.faq.a6': "Sí, nuestro equipo revisa todos los perfiles de expat helpers para garantizar la calidad del servicio en la plataforma. Verificamos su experiencia de expatriación, habilidades y la integridad de su perfil. La validación suele tardar de 24 a 48 horas.",
    'registerExpat.faq.q7': "¿Puedo modificar mi información después del registro?",
    'registerExpat.faq.a7': "Absolutamente. Puede modificar toda su información (foto, biografía, países de experiencia, idiomas, tarifas, disponibilidad, etc.) desde su panel en cualquier momento. Mantenga su perfil actualizado para atraer más clientes.",
    'registerExpat.faq.q8': "¿Cómo recibiré llamadas de clientes?",
    'registerExpat.faq.a8': "Una vez validado su perfil, aparece en los resultados de búsqueda según sus países de experiencia e idiomas. Los clientes lo llaman directamente a través de la plataforma. Recibe llamadas en su teléfono y gestiona su disponibilidad en tiempo real desde su panel.",
  },

  de: {
    // Client FAQ
    'registerClient.faq.title': 'Häufig Gestellte Fragen',

    // Lawyer FAQ
    'registerLawyer.faq.title': 'Häufig Gestellte Fragen',
    'registerLawyer.faq.q1': "Wie werde ich Partner-Anwalt bei SOS-Expat?",
    'registerLawyer.faq.a1': "Füllen Sie das Anmeldeformular mit Ihren beruflichen Informationen aus: E-Mail, Passwort, vollständiger Name, professionelles Foto, Biografie (mindestens 50 Zeichen), Wohnsitzland, gesprochene Sprachen, juristische Fachgebiete, Praxisländer und Ausbildung. Nach Validierung Ihres Profils durch unser Team können Sie Kundenanrufe empfangen.",
    'registerLawyer.faq.q2': "Wie viel kostet die Registrierung als Anwalt?",
    'registerLawyer.faq.a2': "Die Registrierung bei SOS-Expat ist völlig kostenlos. Sie zahlen keine Registrierungs- oder Abonnementgebühren. Wir erheben nur eine Provision auf über die Plattform durchgeführte Beratungen. Sie behalten die volle Kontrolle über Ihre Tarife und Verfügbarkeit.",
    'registerLawyer.faq.q3': "Welche juristischen Fachgebiete werden akzeptiert?",
    'registerLawyer.faq.a3': "Wir akzeptieren alle für Expatriates relevanten juristischen Fachgebiete: Einwanderungsrecht, internationales Arbeitsrecht, grenzüberschreitendes Familienrecht, internationales Wirtschaftsrecht, internationales Steuerrecht, Immobilienrecht im Ausland und vieles mehr. Sie können bei der Registrierung mehrere Fachgebiete auswählen.",
    'registerLawyer.faq.q4': "In wie vielen Ländern kann ich auf der Plattform praktizieren?",
    'registerLawyer.faq.a4': "Sie können alle Länder angeben, in denen Sie zur Rechtsausübung berechtigt sind. Es gibt keine geografischen Einschränkungen. Je mehr Länder Sie abdecken, desto mehr Beratungsmöglichkeiten haben Sie mit internationalen Kunden.",
    'registerLawyer.faq.q5': "Werden meine beruflichen Informationen überprüft?",
    'registerLawyer.faq.a5': "Ja, absolut. Unser Team überprüft die Authentizität aller Anwaltsprofile vor der Aktivierung. Wir überprüfen Ihre Abschlüsse, Ihre Anwaltskammerzulassung und Ihre Berufserfahrung. Dies gewährleistet Qualität und Vertrauen auf unserer Plattform.",
    'registerLawyer.faq.q6': "Kann ich mein Profil nach der Registrierung ändern?",
    'registerLawyer.faq.a6': "Ja, Sie können alle Ihre Informationen (Foto, Biografie, Fachgebiete, Praxisländer, Sprachen, Tarife, Verfügbarkeit usw.) jederzeit über Ihr Anwalts-Dashboard ändern. Ihr Profil bleibt immer aktuell, um die besten Kunden anzuziehen.",
    'registerLawyer.faq.q7': "Wie lange dauert die Profilvalidierung?",
    'registerLawyer.faq.a7': "Sobald Ihre Registrierung abgeschlossen ist, überprüft unser Team Ihr Profil innerhalb von 24 bis 48 Werktagen. Sie erhalten eine Bestätigungs-E-Mail, sobald Ihr Profil aktiviert ist. Falls Dokumente fehlen, werden wir Sie schnell kontaktieren.",
    'registerLawyer.faq.q8': "Wie erhalte ich meine ersten Kunden?",
    'registerLawyer.faq.a8': "Sobald Ihr Profil validiert ist, erscheinen Sie automatisch in den Suchergebnissen basierend auf Ihren Fachgebieten und Praxisländern. Kunden können Sie direkt über die Plattform anrufen. Sie erhalten Anrufe auf Ihrem Telefon und verwalten Ihre Verfügbarkeit in Echtzeit.",

    // Expat FAQ
    'registerExpat.faq.title': 'Häufig Gestellte Fragen',
    'registerExpat.faq.q1': "Wie werde ich expat helper bei SOS-Expat?",
    'registerExpat.faq.a1': "Füllen Sie das Anmeldeformular mit Ihren Informationen aus: E-Mail, Passwort, vollständiger Name, professionelles Foto, detaillierte Biografie (mindestens 50 Zeichen), Wohnsitzland, gesprochene Sprachen, Expertenländer und Ihre Ausbildung oder Erfahrung. Unser Team wird dann Ihr Profil validieren.",
    'registerExpat.faq.q2': "Was ist der Unterschied zwischen expat helper und Anwalt?",
    'registerExpat.faq.a2': "Expat helpers sind erfahrene Expatriates, die praktische Ratschläge und Vor-Ort-Kenntnisse teilen. Im Gegensatz zu Anwälten benötigen Sie keinen Jura-Abschluss. Sie helfen bei konkreten Fragen: Alltag, Verwaltungsverfahren, Wohnungssuche, Schulbildung, kulturelle Anpassung usw.",
    'registerExpat.faq.q3': "Ist die Registrierung als expat helper kostenpflichtig?",
    'registerExpat.faq.a3': "Nein, die Registrierung ist 100% kostenlos. Es gibt keine Registrierungs- oder Abonnementgebühren. Sie zahlen nichts. Wir erheben nur eine kleine Provision auf Beratungen, die Sie über die Plattform durchführen. Sie legen Ihre Tarife frei fest.",
    'registerExpat.faq.q4': "Benötige ich einen bestimmten Abschluss zur Registrierung?",
    'registerExpat.faq.a4': "Nein, es ist kein bestimmter Abschluss erforderlich. Was zählt, ist Ihre Expatriierungserfahrung und Ihr fundiertes Wissen über das Land, in dem Sie wohnen. Die Erwähnung relevanter Ausbildungen (Sprachen, Management, Coaching usw.) stärkt jedoch Ihre Glaubwürdigkeit.",
    'registerExpat.faq.q5': "In wie vielen Ländern kann ich meine Dienste anbieten?",
    'registerExpat.faq.a5': "Sie können alle Länder angeben, in denen Sie gelebt haben oder sehr gut kennen. Es gibt keine Grenzen. Je mehr Länder Sie abdecken, desto mehr Möglichkeiten haben Sie, Expatriates weltweit zu helfen.",
    'registerExpat.faq.q6': "Wird mein Profil vor der Aktivierung überprüft?",
    'registerExpat.faq.a6': "Ja, unser Team überprüft alle expat helper-Profile, um die Servicequalität auf der Plattform zu gewährleisten. Wir überprüfen Ihre Expatriierungserfahrung, Fähigkeiten und Profilvollständigkeit. Die Validierung dauert normalerweise 24 bis 48 Stunden.",
    'registerExpat.faq.q7': "Kann ich meine Informationen nach der Registrierung ändern?",
    'registerExpat.faq.a7': "Absolut. Sie können alle Ihre Informationen (Foto, Biografie, Expertenländer, Sprachen, Tarife, Verfügbarkeit usw.) jederzeit über Ihr Dashboard ändern. Halten Sie Ihr Profil aktuell, um mehr Kunden anzuziehen.",
    'registerExpat.faq.q8': "Wie erhalte ich Kundenanrufe?",
    'registerExpat.faq.a8': "Sobald Ihr Profil validiert ist, erscheinen Sie in den Suchergebnissen basierend auf Ihren Expertenländern und Sprachen. Kunden rufen Sie direkt über die Plattform an. Sie erhalten Anrufe auf Ihrem Telefon und verwalten Ihre Verfügbarkeit in Echtzeit über Ihr Dashboard.",
  },

  pt: {
    // Client FAQ
    'registerClient.faq.title': 'Perguntas Frequentes',

    // Lawyer FAQ
    'registerLawyer.faq.title': 'Perguntas Frequentes',
    'registerLawyer.faq.q1': "Como me tornar advogado parceiro no SOS-Expat?",
    'registerLawyer.faq.a1': "Preencha o formulário de registro com suas informações profissionais: email, senha, nome completo, foto profissional, biografia (mínimo 50 caracteres), país de residência, idiomas falados, especialidades jurídicas, países de atuação e formação. Após a validação do seu perfil pela nossa equipe, você poderá começar a receber chamadas de clientes.",
    'registerLawyer.faq.q2': "Quanto custa o registro como advogado?",
    'registerLawyer.faq.a2': "O registro no SOS-Expat é totalmente gratuito. Você não paga taxas de registro nem assinatura. Cobramos apenas uma comissão sobre as consultas realizadas através da plataforma. Você mantém controle total sobre suas tarifas e disponibilidade.",
    'registerLawyer.faq.q3': "Quais especialidades jurídicas são aceitas?",
    'registerLawyer.faq.a3': "Aceitamos todas as especialidades jurídicas relevantes para expatriados: direito de imigração, direito trabalhista internacional, direito de família transfronteiriço, direito comercial internacional, direito tributário internacional, direito imobiliário no exterior e muito mais. Você pode selecionar várias especialidades durante o registro.",
    'registerLawyer.faq.q4': "Em quantos países posso atuar na plataforma?",
    'registerLawyer.faq.a4': "Você pode indicar todos os países onde está autorizado a exercer o direito. Não há limitações geográficas. Quanto mais países você cobrir, mais oportunidades de consultas terá com clientes internacionais.",
    'registerLawyer.faq.q5': "Minhas informações profissionais são verificadas?",
    'registerLawyer.faq.a5': "Sim, absolutamente. Nossa equipe verifica a autenticidade de todos os perfis de advogados antes da ativação. Verificamos seus diplomas, registro na ordem dos advogados e experiência profissional. Isso garante qualidade e confiança em nossa plataforma.",
    'registerLawyer.faq.q6': "Posso modificar meu perfil após o registro?",
    'registerLawyer.faq.a6': "Sim, você pode modificar todas as suas informações (foto, biografia, especialidades, países de atuação, idiomas, tarifas, disponibilidade, etc.) do seu painel de advogado a qualquer momento. Seu perfil permanece sempre atualizado para atrair os melhores clientes.",
    'registerLawyer.faq.q7': "Quanto tempo leva a validação do meu perfil?",
    'registerLawyer.faq.a7': "Uma vez concluído o seu registro, nossa equipe analisa seu perfil em 24 a 48 horas úteis. Você receberá um email de confirmação assim que seu perfil for ativado. Caso faltem documentos, entraremos em contato rapidamente.",
    'registerLawyer.faq.q8': "Como recebo meus primeiros clientes?",
    'registerLawyer.faq.a8': "Assim que seu perfil for validado, você aparece automaticamente nos resultados de busca com base em suas especialidades e países de atuação. Os clientes podem ligar para você diretamente através da plataforma. Você recebe chamadas no seu telefone e gerencia sua disponibilidade em tempo real.",

    // Expat FAQ
    'registerExpat.faq.title': 'Perguntas Frequentes',
    'registerExpat.faq.q1': "Como me tornar expat helper no SOS-Expat?",
    'registerExpat.faq.a1': "Preencha o formulário de registro com suas informações: email, senha, nome completo, foto profissional, biografia detalhada (mínimo 50 caracteres), país de residência, idiomas falados, países de expertise e sua formação ou experiência. Nossa equipe validará então seu perfil.",
    'registerExpat.faq.q2': "Qual é a diferença entre expat helper e advogado?",
    'registerExpat.faq.a2': "Os expat helpers são expatriados experientes que compartilham conselhos práticos e conhecimento de campo. Ao contrário dos advogados, você não precisa de diploma em direito. Você ajuda com questões concretas: vida diária, procedimentos administrativos, moradia, escolaridade, adaptação cultural, etc.",
    'registerExpat.faq.q3': "O registro como expat helper é pago?",
    'registerExpat.faq.a3': "Não, o registro é 100% gratuito. Não há taxas de registro nem assinatura. Você não paga nada. Cobramos apenas uma pequena comissão sobre as consultas que você realiza através da plataforma. Você define livremente suas tarifas.",
    'registerExpat.faq.q4': "Preciso de um diploma específico para me registrar?",
    'registerExpat.faq.a4': "Não, nenhum diploma específico é necessário. O que importa é sua experiência de expatriação e conhecimento profundo do país onde reside. No entanto, mencionar sua formação relevante (idiomas, gestão, coaching, etc.) fortalece sua credibilidade.",
    'registerExpat.faq.q5': "Em quantos países posso oferecer meus serviços?",
    'registerExpat.faq.a5': "Você pode indicar todos os países onde viveu ou conhece muito bem. Não há limites. Quanto mais países você cobrir, mais oportunidades terá de ajudar expatriados ao redor do mundo.",
    'registerExpat.faq.q6': "Meu perfil será verificado antes da ativação?",
    'registerExpat.faq.a6': "Sim, nossa equipe analisa todos os perfis de expat helpers para garantir a qualidade do serviço na plataforma. Verificamos sua experiência de expatriação, habilidades e completude do perfil. A validação geralmente leva de 24 a 48 horas.",
    'registerExpat.faq.q7': "Posso modificar minhas informações após o registro?",
    'registerExpat.faq.a7': "Absolutamente. Você pode modificar todas as suas informações (foto, biografia, países de expertise, idiomas, tarifas, disponibilidade, etc.) do seu painel a qualquer momento. Mantenha seu perfil atualizado para atrair mais clientes.",
    'registerExpat.faq.q8': "Como vou receber chamadas de clientes?",
    'registerExpat.faq.a8': "Uma vez validado seu perfil, você aparece nos resultados de busca com base em seus países de expertise e idiomas. Os clientes ligam para você diretamente através da plataforma. Você recebe chamadas no seu telefone e gerencia sua disponibilidade em tempo real do seu painel.",
  },

  ru: {
    // Client FAQ
    'registerClient.faq.title': 'Часто Задаваемые Вопросы',

    // Lawyer FAQ
    'registerLawyer.faq.title': 'Часто Задаваемые Вопросы',
    'registerLawyer.faq.q1': "Как стать партнёром-юристом на SOS-Expat?",
    'registerLawyer.faq.a1': "Заполните регистрационную форму с вашей профессиональной информацией: email, пароль, полное имя, профессиональное фото, биография (минимум 50 символов), страна проживания, языки, юридические специализации, страны практики и образование. После проверки вашего профиля нашей командой вы сможете начать принимать звонки клиентов.",
    'registerLawyer.faq.q2': "Сколько стоит регистрация в качестве юриста?",
    'registerLawyer.faq.a2': "Регистрация на SOS-Expat полностью бесплатна. Вы не платите регистрационных или подписных сборов. Мы берём только комиссию с консультаций, проведённых через платформу. Вы сохраняете полный контроль над своими тарифами и доступностью.",
    'registerLawyer.faq.q3': "Какие юридические специализации принимаются?",
    'registerLawyer.faq.a3': "Мы принимаем все юридические специализации, актуальные для экспатов: иммиграционное право, международное трудовое право, трансграничное семейное право, международное коммерческое право, международное налоговое право, зарубежное недвижимое право и многое другое. Вы можете выбрать несколько специализаций при регистрации.",
    'registerLawyer.faq.q4': "В скольких странах я могу практиковать на платформе?",
    'registerLawyer.faq.a4': "Вы можете указать все страны, где вы имеете право заниматься юридической практикой. Нет географических ограничений. Чем больше стран вы охватываете, тем больше возможностей для консультаций с международными клиентами.",
    'registerLawyer.faq.q5': "Проверяется ли моя профессиональная информация?",
    'registerLawyer.faq.a5': "Да, абсолютно. Наша команда проверяет подлинность всех профилей юристов перед активацией. Мы проверяем ваши дипломы, регистрацию в коллегии адвокатов и профессиональный опыт. Это гарантирует качество и доверие на нашей платформе.",
    'registerLawyer.faq.q6': "Могу ли я изменить свой профиль после регистрации?",
    'registerLawyer.faq.a6': "Да, вы можете изменить всю свою информацию (фото, биография, специализации, страны практики, языки, тарифы, доступность и т.д.) из вашей панели юриста в любое время. Ваш профиль всегда остаётся актуальным, чтобы привлекать лучших клиентов.",
    'registerLawyer.faq.q7': "Сколько времени занимает проверка моего профиля?",
    'registerLawyer.faq.a7': "После завершения вашей регистрации наша команда проверяет ваш профиль в течение 24-48 рабочих часов. Вы получите подтверждающее письмо, как только ваш профиль будет активирован. Если не хватает документов, мы быстро свяжемся с вами.",
    'registerLawyer.faq.q8': "Как получить первых клиентов?",
    'registerLawyer.faq.a8': "Как только ваш профиль проверен, вы автоматически появляетесь в результатах поиска в соответствии с вашими специализациями и странами практики. Клиенты могут звонить вам напрямую через платформу. Вы получаете звонки на свой телефон и управляете своей доступностью в реальном времени.",

    // Expat FAQ
    'registerExpat.faq.title': 'Часто Задаваемые Вопросы',
    'registerExpat.faq.q1': "Как стать expat helper на SOS-Expat?",
    'registerExpat.faq.a1': "Заполните регистрационную форму с вашей информацией: email, пароль, полное имя, профессиональное фото, подробная биография (минимум 50 символов), страна проживания, языки, страны экспертизы и ваше образование или опыт. Затем наша команда проверит ваш профиль.",
    'registerExpat.faq.q2': "В чём разница между expat helper и юристом?",
    'registerExpat.faq.a2': "Expat helpers — это опытные экспаты, которые делятся практическими советами и знаниями на местах. В отличие от юристов, вам не нужна юридическая степень. Вы помогаете с конкретными вопросами: повседневная жизнь, административные процедуры, жильё, школа, культурная адаптация и т.д.",
    'registerExpat.faq.q3': "Регистрация в качестве expat helper платная?",
    'registerExpat.faq.a3': "Нет, регистрация 100% бесплатна. Нет регистрационных или подписных сборов. Вы ничего не платите. Мы берём только небольшую комиссию с консультаций, которые вы проводите через платформу. Вы свободно устанавливаете свои тарифы.",
    'registerExpat.faq.q4': "Нужна ли мне специальная степень для регистрации?",
    'registerExpat.faq.a4': "Нет, специальная степень не требуется. Важен ваш опыт экспатриации и глубокое знание страны, где вы проживаете. Однако упоминание соответствующего образования (языки, управление, коучинг и т.д.) укрепляет вашу репутацию.",
    'registerExpat.faq.q5': "В скольких странах я могу предлагать свои услуги?",
    'registerExpat.faq.a5': "Вы можете указать все страны, где вы жили или очень хорошо знаете. Нет ограничений. Чем больше стран вы охватываете, тем больше возможностей помочь экспатам по всему миру.",
    'registerExpat.faq.q6': "Будет ли мой профиль проверен перед активацией?",
    'registerExpat.faq.a6': "Да, наша команда проверяет все профили expat helpers, чтобы гарантировать качество обслуживания на платформе. Мы проверяем ваш опыт экспатриации, навыки и полноту профиля. Проверка обычно занимает 24-48 часов.",
    'registerExpat.faq.q7': "Могу ли я изменить свою информацию после регистрации?",
    'registerExpat.faq.a7': "Абсолютно. Вы можете изменить всю свою информацию (фото, биография, страны экспертизы, языки, тарифы, доступность и т.д.) из вашей панели в любое время. Держите свой профиль обновлённым, чтобы привлекать больше клиентов.",
    'registerExpat.faq.q8': "Как я буду получать звонки клиентов?",
    'registerExpat.faq.a8': "Как только ваш профиль проверен, вы появляетесь в результатах поиска в соответствии с вашими странами экспертизы и языками. Клиенты звонят вам напрямую через платформу. Вы получаете звонки на свой телефон и управляете своей доступностью в реальном времени из вашей панели.",
  },

  ar: {
    // Client FAQ
    'registerClient.faq.title': 'الأسئلة الشائعة',

    // Lawyer FAQ
    'registerLawyer.faq.title': 'الأسئلة الشائعة',
    'registerLawyer.faq.q1': "كيف أصبح محاميًا شريكًا في SOS-Expat؟",
    'registerLawyer.faq.a1': "املأ نموذج التسجيل بمعلوماتك المهنية: البريد الإلكتروني، كلمة المرور، الاسم الكامل، الصورة المهنية، السيرة الذاتية (50 حرفًا كحد أدنى)، بلد الإقامة، اللغات المنطوقة، التخصصات القانونية، بلدان الممارسة والتعليم. بعد التحقق من ملفك الشخصي من قبل فريقنا، يمكنك البدء في تلقي مكالمات العملاء.",
    'registerLawyer.faq.q2': "كم تكلف التسجيل كمحامي؟",
    'registerLawyer.faq.a2': "التسجيل في SOS-Expat مجاني تمامًا. أنت لا تدفع رسوم تسجيل أو اشتراك. نحن نأخذ فقط عمولة على الاستشارات المكتملة من خلال المنصة. أنت تحتفظ بالسيطرة الكاملة على أسعارك وتوافرك.",
    'registerLawyer.faq.q3': "ما التخصصات القانونية المقبولة؟",
    'registerLawyer.faq.a3': "نقبل جميع التخصصات القانونية ذات الصلة بالمغتربين: قانون الهجرة، قانون العمل الدولي، قانون الأسرة عبر الحدود، قانون الأعمال الدولي، القانون الضريبي الدولي، قانون العقارات في الخارج والمزيد. يمكنك اختيار تخصصات متعددة أثناء التسجيل.",
    'registerLawyer.faq.q4': "في كم دولة يمكنني الممارسة على المنصة؟",
    'registerLawyer.faq.a4': "يمكنك الإشارة إلى جميع البلدان التي يحق لك فيها ممارسة القانون. لا توجد قيود جغرافية. كلما غطيت المزيد من البلدان، كلما زادت فرص الاستشارات مع العملاء الدوليين.",
    'registerLawyer.faq.q5': "هل يتم التحقق من معلوماتي المهنية؟",
    'registerLawyer.faq.a5': "نعم، بالتأكيد. يتحقق فريقنا من صحة جميع ملفات المحامين قبل التفعيل. نحن نتحقق من شهاداتك وتسجيلك في نقابة المحامين وخبرتك المهنية. هذا يضمن الجودة والثقة على منصتنا.",
    'registerLawyer.faq.q6': "هل يمكنني تعديل ملفي الشخصي بعد التسجيل؟",
    'registerLawyer.faq.a6': "نعم، يمكنك تعديل جميع معلوماتك (الصورة، السيرة الذاتية، التخصصات، بلدان الممارسة، اللغات، الأسعار، التوافر، إلخ) من لوحة المحامي الخاصة بك في أي وقت. يبقى ملفك الشخصي دائمًا محدثًا لجذب أفضل العملاء.",
    'registerLawyer.faq.q7': "كم يستغرق التحقق من الملف الشخصي؟",
    'registerLawyer.faq.a7': "بمجرد اكتمال تسجيلك، يراجع فريقنا ملفك الشخصي خلال 24 إلى 48 ساعة عمل. ستتلقى رسالة تأكيد بالبريد الإلكتروني بمجرد تفعيل ملفك الشخصي. إذا كانت هناك مستندات ناقصة، سنتصل بك بسرعة.",
    'registerLawyer.faq.q8': "كيف أحصل على عملائي الأوائل؟",
    'registerLawyer.faq.a8': "بمجرد التحقق من ملفك الشخصي، تظهر تلقائيًا في نتائج البحث بناءً على تخصصاتك وبلدان الممارسة. يمكن للعملاء الاتصال بك مباشرة من خلال المنصة. تتلقى المكالمات على هاتفك وتدير توافرك في الوقت الفعلي.",

    // Expat FAQ
    'registerExpat.faq.title': 'الأسئلة الشائعة',
    'registerExpat.faq.q1': "كيف أصبح expat helper في SOS-Expat؟",
    'registerExpat.faq.a1': "املأ نموذج التسجيل بمعلوماتك: البريد الإلكتروني، كلمة المرور، الاسم الكامل، الصورة المهنية، السيرة الذاتية التفصيلية (50 حرفًا كحد أدنى)، بلد الإقامة، اللغات المنطوقة، بلدان الخبرة وتعليمك أو خبرتك. سيقوم فريقنا بعد ذلك بالتحقق من ملفك الشخصي.",
    'registerExpat.faq.q2': "ما الفرق بين expat helper والمحامي؟",
    'registerExpat.faq.a2': "expat helpers هم مغتربون ذوو خبرة يشاركون النصائح العملية والمعرفة الميدانية. على عكس المحامين، لا تحتاج إلى درجة في القانون. أنت تساعد في الأسئلة الملموسة: الحياة اليومية، الإجراءات الإدارية، السكن، التعليم، التكيف الثقافي، إلخ.",
    'registerExpat.faq.q3': "هل التسجيل كـ expat helper مدفوع؟",
    'registerExpat.faq.a3': "لا، التسجيل مجاني 100٪. لا توجد رسوم تسجيل أو اشتراك. أنت لا تدفع شيئًا. نحن نأخذ فقط عمولة صغيرة على الاستشارات التي تكملها من خلال المنصة. أنت تحدد أسعارك بحرية.",
    'registerExpat.faq.q4': "هل أحتاج إلى درجة محددة للتسجيل؟",
    'registerExpat.faq.a4': "لا، لا يلزم وجود درجة محددة. ما يهم هو خبرتك في الاغتراب ومعرفتك المتعمقة بالبلد الذي تقيم فيه. ومع ذلك، فإن ذكر التدريب ذي الصلة (اللغات، الإدارة، التدريب، إلخ) يعزز مصداقيتك.",
    'registerExpat.faq.q5': "في كم دولة يمكنني تقديم خدماتي؟",
    'registerExpat.faq.a5': "يمكنك الإشارة إلى جميع البلدان التي عشت فيها أو تعرفها جيدًا. لا توجد حدود. كلما غطيت المزيد من البلدان، كلما زادت فرصك لمساعدة المغتربين في جميع أنحاء العالم.",
    'registerExpat.faq.q6': "هل سيتم التحقق من ملفي الشخصي قبل التفعيل؟",
    'registerExpat.faq.a6': "نعم، يراجع فريقنا جميع ملفات expat helpers لضمان جودة الخدمة على المنصة. نحن نتحقق من خبرتك في الاغتراب ومهاراتك واكتمال ملفك الشخصي. عادة ما يستغرق التحقق من 24 إلى 48 ساعة.",
    'registerExpat.faq.q7': "هل يمكنني تعديل معلوماتي بعد التسجيل؟",
    'registerExpat.faq.a7': "بالتأكيد. يمكنك تعديل جميع معلوماتك (الصورة، السيرة الذاتية، بلدان الخبرة، اللغات، الأسعار، التوافر، إلخ) من لوحة التحكم الخاصة بك في أي وقت. حافظ على تحديث ملفك الشخصي لجذب المزيد من العملاء.",
    'registerExpat.faq.q8': "كيف سأتلقى مكالمات العملاء؟",
    'registerExpat.faq.a8': "بمجرد التحقق من ملفك الشخصي، تظهر في نتائج البحث بناءً على بلدان خبرتك واللغات. يتصل بك العملاء مباشرة من خلال المنصة. تتلقى المكالمات على هاتفك وتدير توافرك في الوقت الفعلي من لوحة التحكم الخاصة بك.",
  },

  hi: {
    // Client FAQ
    'registerClient.faq.title': 'अक्सर पूछे जाने वाले प्रश्न',

    // Lawyer FAQ
    'registerLawyer.faq.title': 'अक्सर पूछे जाने वाले प्रश्न',
    'registerLawyer.faq.q1': "मैं SOS-Expat पर साझेदार वकील कैसे बनूं?",
    'registerLawyer.faq.a1': "अपनी पेशेवर जानकारी के साथ पंजीकरण फॉर्म भरें: ईमेल, पासवर्ड, पूरा नाम, पेशेवर फोटो, जीवनी (न्यूनतम 50 वर्ण), निवास का देश, बोली जाने वाली भाषाएँ, कानूनी विशेषताएँ, अभ्यास के देश और शिक्षा। हमारी टीम द्वारा आपकी प्रोफ़ाइल सत्यापित होने के बाद, आप ग्राहक कॉल प्राप्त करना शुरू कर सकते हैं।",
    'registerLawyer.faq.q2': "वकील के रूप में पंजीकरण करने में कितना खर्च आता है?",
    'registerLawyer.faq.a2': "SOS-Expat पर पंजीकरण पूरी तरह से मुफ्त है। आप कोई पंजीकरण या सदस्यता शुल्क नहीं देते। हम केवल प्लेटफॉर्म के माध्यम से पूर्ण परामर्श पर कमीशन लेते हैं। आप अपनी दरों और उपलब्धता पर पूर्ण नियंत्रण बनाए रखते हैं।",
    'registerLawyer.faq.q3': "कौन सी कानूनी विशेषताएँ स्वीकार की जाती हैं?",
    'registerLawyer.faq.a3': "हम प्रवासियों के लिए प्रासंगिक सभी कानूनी विशेषताओं को स्वीकार करते हैं: आव्रजन कानून, अंतर्राष्ट्रीय श्रम कानून, सीमा पार पारिवारिक कानून, अंतर्राष्ट्रीय व्यापार कानून, अंतर्राष्ट्रीय कर कानून, विदेशी अचल संपत्ति कानून, और बहुत कुछ। आप पंजीकरण के दौरान कई विशेषताओं का चयन कर सकते हैं।",
    'registerLawyer.faq.q4': "मैं प्लेटफॉर्म पर कितने देशों में अभ्यास कर सकता हूँ?",
    'registerLawyer.faq.a4': "आप उन सभी देशों को इंगित कर सकते हैं जहाँ आपको कानून का अभ्यास करने के लिए अधिकृत किया गया है। कोई भौगोलिक सीमाएं नहीं हैं। जितने अधिक देशों को आप कवर करेंगे, अंतर्राष्ट्रीय ग्राहकों के साथ परामर्श के उतने ही अधिक अवसर होंगे।",
    'registerLawyer.faq.q5': "क्या मेरी पेशेवर जानकारी सत्यापित है?",
    'registerLawyer.faq.a5': "हाँ, बिल्कुल। हमारी टीम सक्रियण से पहले सभी वकील प्रोफाइल की प्रामाणिकता सत्यापित करती है। हम आपकी डिग्री, बार पंजीकरण और पेशेवर अनुभव सत्यापित करते हैं। यह हमारे प्लेटफॉर्म पर गुणवत्ता और विश्वास सुनिश्चित करता है।",
    'registerLawyer.faq.q6': "क्या मैं पंजीकरण के बाद अपनी प्रोफ़ाइल संशोधित कर सकता हूँ?",
    'registerLawyer.faq.a6': "हाँ, आप अपनी सभी जानकारी (फोटो, जीवनी, विशेषताएँ, अभ्यास के देश, भाषाएँ, दरें, उपलब्धता, आदि) को किसी भी समय अपने वकील डैशबोर्ड से संशोधित कर सकते हैं। सर्वोत्तम ग्राहकों को आकर्षित करने के लिए आपकी प्रोफ़ाइल हमेशा अप-टू-डेट रहती है।",
    'registerLawyer.faq.q7': "प्रोफ़ाइल सत्यापन में कितना समय लगता है?",
    'registerLawyer.faq.a7': "एक बार जब आपका पंजीकरण पूरा हो जाता है, तो हमारी टीम 24 से 48 व्यावसायिक घंटों के भीतर आपकी प्रोफ़ाइल की समीक्षा करती है। जैसे ही आपकी प्रोफ़ाइल सक्रिय होगी, आपको एक पुष्टिकरण ईमेल प्राप्त होगा। यदि दस्तावेज़ गायब हैं, तो हम जल्दी से संपर्क करेंगे।",
    'registerLawyer.faq.q8': "मुझे अपने पहले ग्राहक कैसे मिलेंगे?",
    'registerLawyer.faq.a8': "जैसे ही आपकी प्रोफ़ाइल सत्यापित होती है, आप अपनी विशेषताओं और अभ्यास के देशों के आधार पर खोज परिणामों में स्वचालित रूप से दिखाई देते हैं। ग्राहक प्लेटफॉर्म के माध्यम से सीधे आपको कॉल कर सकते हैं। आप अपने फोन पर कॉल प्राप्त करते हैं और वास्तविक समय में अपनी उपलब्धता प्रबंधित करते हैं।",

    // Expat FAQ
    'registerExpat.faq.title': 'अक्सर पूछे जाने वाले प्रश्न',
    'registerExpat.faq.q1': "मैं SOS-Expat पर expat helper कैसे बनूं?",
    'registerExpat.faq.a1': "अपनी जानकारी के साथ पंजीकरण फॉर्म भरें: ईमेल, पासवर्ड, पूरा नाम, पेशेवर फोटो, विस्तृत जीवनी (न्यूनतम 50 वर्ण), निवास का देश, बोली जाने वाली भाषाएँ, विशेषज्ञता के देश और आपकी शिक्षा या अनुभव। हमारी टीम फिर आपकी प्रोफ़ाइल सत्यापित करेगी।",
    'registerExpat.faq.q2': "expat helper और वकील में क्या अंतर है?",
    'registerExpat.faq.a2': "Expat helpers अनुभवी प्रवासी हैं जो व्यावहारिक सलाह और जमीनी ज्ञान साझा करते हैं। वकीलों के विपरीत, आपको कानून की डिग्री की आवश्यकता नहीं है। आप ठोस सवालों में मदद करते हैं: दैनिक जीवन, प्रशासनिक प्रक्रियाएं, आवास, स्कूली शिक्षा, सांस्कृतिक अनुकूलन, आदि।",
    'registerExpat.faq.q3': "क्या expat helper के रूप में पंजीकरण सशुल्क है?",
    'registerExpat.faq.a3': "नहीं, पंजीकरण 100% मुफ्त है। कोई पंजीकरण या सदस्यता शुल्क नहीं है। आप कुछ भी भुगतान नहीं करते। हम केवल प्लेटफॉर्म के माध्यम से आपके द्वारा पूर्ण परामर्श पर एक छोटा कमीशन लेते हैं। आप स्वतंत्र रूप से अपनी दरें निर्धारित करते हैं।",
    'registerExpat.faq.q4': "क्या मुझे पंजीकरण के लिए विशिष्ट डिग्री की आवश्यकता है?",
    'registerExpat.faq.a4': "नहीं, कोई विशिष्ट डिग्री की आवश्यकता नहीं है। जो मायने रखता है वह आपका प्रवास अनुभव और उस देश का गहन ज्ञान है जहाँ आप रहते हैं। हालांकि, प्रासंगिक प्रशिक्षण (भाषाएँ, प्रबंधन, कोचिंग, आदि) का उल्लेख आपकी विश्वसनीयता को मजबूत करता है।",
    'registerExpat.faq.q5': "मैं कितने देशों में अपनी सेवाएं प्रदान कर सकता हूँ?",
    'registerExpat.faq.a5': "आप उन सभी देशों को इंगित कर सकते हैं जहाँ आप रहे हैं या बहुत अच्छी तरह से जानते हैं। कोई सीमाएं नहीं हैं। जितने अधिक देशों को आप कवर करेंगे, दुनिया भर के प्रवासियों की मदद करने के उतने ही अधिक अवसर होंगे।",
    'registerExpat.faq.q6': "क्या सक्रियण से पहले मेरी प्रोफ़ाइल सत्यापित की जाएगी?",
    'registerExpat.faq.a6': "हाँ, प्लेटफॉर्म पर सेवा गुणवत्ता सुनिश्चित करने के लिए हमारी टीम सभी expat helper प्रोफाइल की समीक्षा करती है। हम आपके प्रवास अनुभव, कौशल और प्रोफ़ाइल पूर्णता सत्यापित करते हैं। सत्यापन में आमतौर पर 24 से 48 घंटे लगते हैं।",
    'registerExpat.faq.q7': "क्या मैं पंजीकरण के बाद अपनी जानकारी संशोधित कर सकता हूँ?",
    'registerExpat.faq.a7': "बिल्कुल। आप अपनी सभी जानकारी (फोटो, जीवनी, विशेषज्ञता के देश, भाषाएँ, दरें, उपलब्धता, आदि) को किसी भी समय अपने डैशबोर्ड से संशोधित कर सकते हैं। अधिक ग्राहकों को आकर्षित करने के लिए अपनी प्रोफ़ाइल को अद्यतित रखें।",
    'registerExpat.faq.q8': "मुझे ग्राहक कॉल कैसे प्राप्त होंगे?",
    'registerExpat.faq.a8': "एक बार जब आपकी प्रोफ़ाइल सत्यापित हो जाती है, तो आप अपनी विशेषज्ञता के देशों और भाषाओं के आधार पर खोज परिणामों में दिखाई देते हैं। ग्राहक प्लेटफॉर्म के माध्यम से सीधे आपको कॉल करते हैं। आप अपने फोन पर कॉल प्राप्त करते हैं और अपने डैशबोर्ड से वास्तविक समय में अपनी उपलब्धता प्रबंधित करते हैं।",
  },

  ch: {
    // Client FAQ
    'registerClient.faq.title': '常见问题',

    // Lawyer FAQ
    'registerLawyer.faq.title': '常见问题',
    'registerLawyer.faq.q1': "如何成为SOS-Expat的合作律师?",
    'registerLawyer.faq.a1': "填写注册表格，包含您的专业信息：电子邮件、密码、全名、专业照片、简历（至少50个字符）、居住国家、语言、法律专业、执业国家和教育背景。我们的团队验证您的个人资料后，您就可以开始接听客户电话。",
    'registerLawyer.faq.q2': "注册律师需要多少费用？",
    'registerLawyer.faq.a2': "SOS-Expat的注册完全免费。您无需支付注册费或订阅费。我们只对通过平台完成的咨询收取佣金。您完全控制自己的费率和可用性。",
    'registerLawyer.faq.q3': "接受哪些法律专业？",
    'registerLawyer.faq.a3': "我们接受与海外人士相关的所有法律专业：移民法、国际劳动法、跨境家庭法、国际商法、国际税法、海外房地产法等等。您可以在注册时选择多个专业。",
    'registerLawyer.faq.q4': "我可以在平台上执业多少个国家？",
    'registerLawyer.faq.a4': "您可以标明所有您被授权执业的国家。没有地理限制。您覆盖的国家越多，与国际客户的咨询机会就越多。",
    'registerLawyer.faq.q5': "我的专业信息会被验证吗？",
    'registerLawyer.faq.a5': "是的，绝对会。我们的团队在激活之前验证所有律师个人资料的真实性。我们验证您的学位、律师协会注册和专业经验。这确保了我们平台的质量和信任。",
    'registerLawyer.faq.q6': "注册后我可以修改个人资料吗？",
    'registerLawyer.faq.a6': "是的，您可以随时从律师仪表板修改所有信息（照片、简历、专业、执业国家、语言、费率、可用性等）。您的个人资料始终保持最新，以吸引最好的客户。",
    'registerLawyer.faq.q7': "个人资料验证需要多长时间？",
    'registerLawyer.faq.a7': "一旦您完成注册，我们的团队会在24至48个工作小时内审核您的个人资料。一旦您的个人资料被激活，您将收到确认电子邮件。如果缺少文件，我们会迅速联系您。",
    'registerLawyer.faq.q8': "我如何获得第一批客户？",
    'registerLawyer.faq.a8': "一旦您的个人资料被验证，您会根据您的专业和执业国家自动出现在搜索结果中。客户可以通过平台直接给您打电话。您在手机上接听电话并实时管理您的可用性。",

    // Expat FAQ
    'registerExpat.faq.title': '常见问题',
    'registerExpat.faq.q1': "如何成为SOS-Expat的expat helper？",
    'registerExpat.faq.a1': "填写注册表格，包含您的信息：电子邮件、密码、全名、专业照片、详细简历（至少50个字符）、居住国家、语言、专业国家和您的教育或经验。然后我们的团队会验证您的个人资料。",
    'registerExpat.faq.q2': "expat helper和律师有什么区别？",
    'registerExpat.faq.a2': "Expat helpers是有经验的海外人士，分享实用建议和实地知识。与律师不同，您不需要法律学位。您帮助解决具体问题：日常生活、行政程序、住房、学校教育、文化适应等。",
    'registerExpat.faq.q3': "注册expat helper是付费的吗？",
    'registerExpat.faq.a3': "不，注册100%免费。没有注册费或订阅费。您不支付任何费用。我们只对您通过平台完成的咨询收取小额佣金。您可以自由设定自己的费率。",
    'registerExpat.faq.q4': "我需要特定学位才能注册吗？",
    'registerExpat.faq.a4': "不，不需要特定学位。重要的是您的海外经历和对您居住国家的深入了解。但是，提及相关培训（语言、管理、辅导等）会增强您的可信度。",
    'registerExpat.faq.q5': "我可以在多少个国家提供服务？",
    'registerExpat.faq.a5': "您可以标明您居住过或非常了解的所有国家。没有限制。您覆盖的国家越多，帮助全球海外人士的机会就越多。",
    'registerExpat.faq.q6': "激活前会验证我的个人资料吗？",
    'registerExpat.faq.a6': "是的，我们的团队审核所有expat helper个人资料，以确保平台的服务质量。我们验证您的海外经历、技能和个人资料完整性。验证通常需要24至48小时。",
    'registerExpat.faq.q7': "注册后我可以修改信息吗？",
    'registerExpat.faq.a7': "当然可以。您可以随时从仪表板修改所有信息（照片、简历、专业国家、语言、费率、可用性等）。保持您的个人资料更新以吸引更多客户。",
    'registerExpat.faq.q8': "我将如何接听客户电话？",
    'registerExpat.faq.a8': "一旦您的个人资料被验证，您会根据您的专业国家和语言出现在搜索结果中。客户通过平台直接给您打电话。您在手机上接听电话并从仪表板实时管理您的可用性。",
  }
};

// Function to add FAQ translations to a language file
function addFaqTranslations(langCode) {
  const filePath = path.join(HELPER_DIR, `${langCode}.json`);

  // Read existing translations
  const existingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // Get FAQ translations for this language
  const faqData = FAQ_TRANSLATIONS[langCode];

  // Merge with existing data
  const updatedData = { ...existingData, ...faqData };

  // Sort keys alphabetically
  const sortedData = Object.keys(updatedData)
    .sort()
    .reduce((acc, key) => {
      acc[key] = updatedData[key];
      return acc;
    }, {});

  // Write back to file
  fs.writeFileSync(filePath, JSON.stringify(sortedData, null, 2) + '\n', 'utf8');

  console.log(`✅ Added FAQ translations to ${langCode}.json`);
}

// Main execution
console.log('🚀 Adding FAQ translations for registration pages...\n');

const languages = ['fr', 'en', 'es', 'de', 'pt', 'ru', 'ar', 'hi', 'ch'];

languages.forEach(lang => {
  try {
    addFaqTranslations(lang);
  } catch (error) {
    console.error(`❌ Error processing ${lang}.json:`, error.message);
  }
});

console.log('\n✨ Done! All FAQ translations have been added.');
console.log('📊 Summary:');
console.log(`   - Languages processed: ${languages.length}`);
console.log(`   - Keys added per language: 35 (1 title + 17 lawyer + 17 expat)`);
console.log(`   - Total translations added: ${languages.length * 35} = ${languages.length * 35}`);
