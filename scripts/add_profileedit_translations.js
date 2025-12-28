const fs = require('fs');
const path = require('path');

const basePath = path.join(__dirname, '../sos/src/helper');

// Nouvelles traductions pour ProfileEdit
const newTranslations = {
  'profileEdit.title': {
    fr: 'Modifier mon profil',
    en: 'Edit my profile',
    de: 'Mein Profil bearbeiten',
    es: 'Editar mi perfil',
    pt: 'Editar meu perfil',
    ru: 'Редактировать профиль',
    hi: 'मेरी प्रोफ़ाइल संपादित करें',
    ar: 'تعديل ملفي الشخصي',
    ch: '编辑我的个人资料'
  },
  'profileEdit.photo.alt': {
    fr: 'Photo de profil',
    en: 'Profile photo',
    de: 'Profilbild',
    es: 'Foto de perfil',
    pt: 'Foto de perfil',
    ru: 'Фото профиля',
    hi: 'प्रोफ़ाइल फ़ोटो',
    ar: 'صورة الملف الشخصي',
    ch: '头像'
  },
  'profileEdit.photo.placeholder': {
    fr: 'Photo',
    en: 'Photo',
    de: 'Foto',
    es: 'Foto',
    pt: 'Foto',
    ru: 'Фото',
    hi: 'फ़ोटो',
    ar: 'صورة',
    ch: '照片'
  },
  'profileEdit.photo.label': {
    fr: 'Photo de profil',
    en: 'Profile photo',
    de: 'Profilbild',
    es: 'Foto de perfil',
    pt: 'Foto de perfil',
    ru: 'Фото профиля',
    hi: 'प्रोफ़ाइल फ़ोटो',
    ar: 'صورة الملف الشخصي',
    ch: '头像'
  },
  'profileEdit.photo.formats': {
    fr: 'Formats acceptés: JPEG, PNG, WebP (max 5MB)',
    en: 'Accepted formats: JPEG, PNG, WebP (max 5MB)',
    de: 'Akzeptierte Formate: JPEG, PNG, WebP (max 5MB)',
    es: 'Formatos aceptados: JPEG, PNG, WebP (máx 5MB)',
    pt: 'Formatos aceitos: JPEG, PNG, WebP (máx 5MB)',
    ru: 'Допустимые форматы: JPEG, PNG, WebP (макс 5МБ)',
    hi: 'स्वीकृत प्रारूप: JPEG, PNG, WebP (अधिकतम 5MB)',
    ar: 'الصيغ المقبولة: JPEG, PNG, WebP (الحد الأقصى 5 ميجابايت)',
    ch: '支持格式：JPEG、PNG、WebP（最大5MB）'
  },
  'profileEdit.personalInfo.title': {
    fr: 'Informations personnelles',
    en: 'Personal Information',
    de: 'Persönliche Informationen',
    es: 'Información personal',
    pt: 'Informações pessoais',
    ru: 'Личная информация',
    hi: 'व्यक्तिगत जानकारी',
    ar: 'المعلومات الشخصية',
    ch: '个人信息'
  },
  'profileEdit.personalInfo.firstName': {
    fr: 'Prénom',
    en: 'First name',
    de: 'Vorname',
    es: 'Nombre',
    pt: 'Nome',
    ru: 'Имя',
    hi: 'पहला नाम',
    ar: 'الاسم الأول',
    ch: '名字'
  },
  'profileEdit.personalInfo.lastName': {
    fr: 'Nom',
    en: 'Last name',
    de: 'Nachname',
    es: 'Apellido',
    pt: 'Sobrenome',
    ru: 'Фамилия',
    hi: 'उपनाम',
    ar: 'اسم العائلة',
    ch: '姓氏'
  },
  'profileEdit.personalInfo.email': {
    fr: 'Email',
    en: 'Email',
    de: 'E-Mail',
    es: 'Correo electrónico',
    pt: 'E-mail',
    ru: 'Email',
    hi: 'ईमेल',
    ar: 'البريد الإلكتروني',
    ch: '邮箱'
  },
  'profileEdit.security.title': {
    fr: 'Sécurité',
    en: 'Security',
    de: 'Sicherheit',
    es: 'Seguridad',
    pt: 'Segurança',
    ru: 'Безопасность',
    hi: 'सुरक्षा',
    ar: 'الأمان',
    ch: '安全'
  },
  'profileEdit.security.currentPassword': {
    fr: 'Mot de passe actuel (requis pour les modifications de sécurité)',
    en: 'Current password (required for security changes)',
    de: 'Aktuelles Passwort (erforderlich für Sicherheitsänderungen)',
    es: 'Contraseña actual (requerida para cambios de seguridad)',
    pt: 'Senha atual (necessária para alterações de segurança)',
    ru: 'Текущий пароль (требуется для изменений безопасности)',
    hi: 'वर्तमान पासवर्ड (सुरक्षा परिवर्तनों के लिए आवश्यक)',
    ar: 'كلمة المرور الحالية (مطلوبة لتغييرات الأمان)',
    ch: '当前密码（安全更改需要）'
  },
  'profileEdit.security.newPassword': {
    fr: 'Nouveau mot de passe (optionnel)',
    en: 'New password (optional)',
    de: 'Neues Passwort (optional)',
    es: 'Nueva contraseña (opcional)',
    pt: 'Nova senha (opcional)',
    ru: 'Новый пароль (необязательно)',
    hi: 'नया पासवर्ड (वैकल्पिक)',
    ar: 'كلمة مرور جديدة (اختياري)',
    ch: '新密码（可选）'
  },
  'profileEdit.security.confirmPassword': {
    fr: 'Confirmer le nouveau mot de passe',
    en: 'Confirm new password',
    de: 'Neues Passwort bestätigen',
    es: 'Confirmar nueva contraseña',
    pt: 'Confirmar nova senha',
    ru: 'Подтвердите новый пароль',
    hi: 'नए पासवर्ड की पुष्टि करें',
    ar: 'تأكيد كلمة المرور الجديدة',
    ch: '确认新密码'
  },
  'profileEdit.contact.title': {
    fr: 'Coordonnées',
    en: 'Contact Information',
    de: 'Kontaktinformationen',
    es: 'Información de contacto',
    pt: 'Informações de contato',
    ru: 'Контактная информация',
    hi: 'संपर्क जानकारी',
    ar: 'معلومات الاتصال',
    ch: '联系方式'
  },
  'profileEdit.contact.phoneCode': {
    fr: 'Indicatif (+33)',
    en: 'Country code (+33)',
    de: 'Ländervorwahl (+33)',
    es: 'Código de país (+33)',
    pt: 'Código do país (+33)',
    ru: 'Код страны (+33)',
    hi: 'देश कोड (+33)',
    ar: 'رمز الدولة (+33)',
    ch: '国家代码 (+33)'
  },
  'profileEdit.contact.phone': {
    fr: 'Numéro de téléphone',
    en: 'Phone number',
    de: 'Telefonnummer',
    es: 'Número de teléfono',
    pt: 'Número de telefone',
    ru: 'Номер телефона',
    hi: 'फ़ोन नंबर',
    ar: 'رقم الهاتف',
    ch: '电话号码'
  },
  'profileEdit.lawyer.title': {
    fr: 'Détails professionnels',
    en: 'Professional Details',
    de: 'Berufliche Details',
    es: 'Detalles profesionales',
    pt: 'Detalhes profissionais',
    ru: 'Профессиональные данные',
    hi: 'पेशेवर विवरण',
    ar: 'التفاصيل المهنية',
    ch: '专业详情'
  },
  'profileEdit.lawyer.country': {
    fr: 'Pays de résidence',
    en: 'Country of residence',
    de: 'Wohnsitzland',
    es: 'País de residencia',
    pt: 'País de residência',
    ru: 'Страна проживания',
    hi: 'निवास का देश',
    ar: 'بلد الإقامة',
    ch: '居住国'
  },
  'profileEdit.lawyer.currentCountry': {
    fr: 'Pays actuel',
    en: 'Current country',
    de: 'Aktuelles Land',
    es: 'País actual',
    pt: 'País atual',
    ru: 'Текущая страна',
    hi: 'वर्तमान देश',
    ar: 'البلد الحالي',
    ch: '当前国家'
  },
  'profileEdit.lawyer.barNumber': {
    fr: 'Numéro de barreau',
    en: 'Bar number',
    de: 'Anwaltszulassungsnummer',
    es: 'Número de colegiado',
    pt: 'Número da OAB',
    ru: 'Номер адвокатской лицензии',
    hi: 'बार नंबर',
    ar: 'رقم نقابة المحامين',
    ch: '律师执照号'
  },
  'profileEdit.lawyer.experienceYears': {
    fr: "Années d'expérience",
    en: 'Years of experience',
    de: 'Jahre Erfahrung',
    es: 'Años de experiencia',
    pt: 'Anos de experiência',
    ru: 'Лет опыта',
    hi: 'अनुभव के वर्ष',
    ar: 'سنوات الخبرة',
    ch: '从业年限'
  },
  'profileEdit.lawyer.diplomaYear': {
    fr: 'Année du diplôme',
    en: 'Diploma year',
    de: 'Diplomjahr',
    es: 'Año del diploma',
    pt: 'Ano do diploma',
    ru: 'Год получения диплома',
    hi: 'डिप्लोमा वर्ष',
    ar: 'سنة الشهادة',
    ch: '毕业年份'
  },
  'profileEdit.lawyer.description': {
    fr: 'Description professionnelle',
    en: 'Professional description',
    de: 'Berufsbeschreibung',
    es: 'Descripción profesional',
    pt: 'Descrição profissional',
    ru: 'Профессиональное описание',
    hi: 'पेशेवर विवरण',
    ar: 'الوصف المهني',
    ch: '专业介绍'
  },
  'profileEdit.lawyer.specialties': {
    fr: 'Spécialités (séparées par des virgules)',
    en: 'Specialties (comma separated)',
    de: 'Fachgebiete (kommagetrennt)',
    es: 'Especialidades (separadas por comas)',
    pt: 'Especialidades (separadas por vírgulas)',
    ru: 'Специализации (через запятую)',
    hi: 'विशेषज्ञताएं (अल्पविराम से अलग)',
    ar: 'التخصصات (مفصولة بفواصل)',
    ch: '专业领域（逗号分隔）'
  },
  'profileEdit.lawyer.interventionCountries': {
    fr: "Pays d'intervention",
    en: 'Countries of practice',
    de: 'Tätigkeitsländer',
    es: 'Países de intervención',
    pt: 'Países de atuação',
    ru: 'Страны практики',
    hi: 'कार्य देश',
    ar: 'بلدان التدخل',
    ch: '执业国家'
  },
  'profileEdit.lawyer.languages': {
    fr: 'Langues parlées (séparées par des virgules)',
    en: 'Languages spoken (comma separated)',
    de: 'Gesprochene Sprachen (kommagetrennt)',
    es: 'Idiomas hablados (separados por comas)',
    pt: 'Idiomas falados (separados por vírgulas)',
    ru: 'Языки (через запятую)',
    hi: 'बोली जाने वाली भाषाएं (अल्पविराम से अलग)',
    ar: 'اللغات المتحدثة (مفصولة بفواصل)',
    ch: '语言能力（逗号分隔）'
  },
  'profileEdit.lawyer.certifications': {
    fr: 'Certifications',
    en: 'Certifications',
    de: 'Zertifizierungen',
    es: 'Certificaciones',
    pt: 'Certificações',
    ru: 'Сертификаты',
    hi: 'प्रमाणपत्र',
    ar: 'الشهادات',
    ch: '资质证书'
  },
  'profileEdit.expat.title': {
    fr: 'Informations sur votre expatriation',
    en: 'Expatriation Information',
    de: 'Informationen zu Ihrem Auslandsaufenthalt',
    es: 'Información sobre su expatriación',
    pt: 'Informações sobre sua expatriação',
    ru: 'Информация об экспатриации',
    hi: 'प्रवासन जानकारी',
    ar: 'معلومات الاغتراب',
    ch: '外派信息'
  },
  'profileEdit.expat.expatYears': {
    fr: "Années d'expatriation",
    en: 'Years of expatriation',
    de: 'Jahre im Ausland',
    es: 'Años de expatriación',
    pt: 'Anos de expatriação',
    ru: 'Лет за границей',
    hi: 'विदेश में वर्ष',
    ar: 'سنوات الاغتراب',
    ch: '外派年限'
  },
  'profileEdit.expat.expDescription': {
    fr: "Votre expérience d'expatriation",
    en: 'Your expatriation experience',
    de: 'Ihre Auslandserfahrung',
    es: 'Su experiencia de expatriación',
    pt: 'Sua experiência de expatriação',
    ru: 'Ваш опыт за границей',
    hi: 'आपका प्रवासन अनुभव',
    ar: 'تجربتك في الاغتراب',
    ch: '您的外派经历'
  },
  'profileEdit.expat.whyHelp': {
    fr: "Pourquoi souhaitez-vous aider d'autres expatriés ?",
    en: 'Why do you want to help other expats?',
    de: 'Warum möchten Sie anderen Expats helfen?',
    es: '¿Por qué desea ayudar a otros expatriados?',
    pt: 'Por que você quer ajudar outros expatriados?',
    ru: 'Почему вы хотите помогать другим экспатам?',
    hi: 'आप अन्य प्रवासियों की मदद क्यों करना चाहते हैं?',
    ar: 'لماذا تريد مساعدة المغتربين الآخرين؟',
    ch: '您为什么想帮助其他外籍人士？'
  },
  'profileEdit.client.title': {
    fr: 'Informations complémentaires',
    en: 'Additional Information',
    de: 'Zusätzliche Informationen',
    es: 'Información adicional',
    pt: 'Informações adicionais',
    ru: 'Дополнительная информация',
    hi: 'अतिरिक्त जानकारी',
    ar: 'معلومات إضافية',
    ch: '附加信息'
  },
  'profileEdit.client.nationality': {
    fr: 'Nationalité',
    en: 'Nationality',
    de: 'Staatsangehörigkeit',
    es: 'Nacionalidad',
    pt: 'Nacionalidade',
    ru: 'Гражданство',
    hi: 'राष्ट्रीयता',
    ar: 'الجنسية',
    ch: '国籍'
  },
  'profileEdit.client.status': {
    fr: 'Statut',
    en: 'Status',
    de: 'Status',
    es: 'Estado',
    pt: 'Status',
    ru: 'Статус',
    hi: 'स्थिति',
    ar: 'الحالة',
    ch: '状态'
  },
  'profileEdit.client.language': {
    fr: 'Langue principale',
    en: 'Main language',
    de: 'Hauptsprache',
    es: 'Idioma principal',
    pt: 'Idioma principal',
    ru: 'Основной язык',
    hi: 'मुख्य भाषा',
    ar: 'اللغة الرئيسية',
    ch: '主要语言'
  },
  'profileEdit.feedback.error': {
    fr: 'Erreur',
    en: 'Error',
    de: 'Fehler',
    es: 'Error',
    pt: 'Erro',
    ru: 'Ошибка',
    hi: 'त्रुटि',
    ar: 'خطأ',
    ch: '错误'
  },
  'profileEdit.feedback.success': {
    fr: 'Succès',
    en: 'Success',
    de: 'Erfolg',
    es: 'Éxito',
    pt: 'Sucesso',
    ru: 'Успех',
    hi: 'सफलता',
    ar: 'نجاح',
    ch: '成功'
  },
  'profileEdit.actions.updating': {
    fr: 'Mise à jour en cours...',
    en: 'Updating...',
    de: 'Wird aktualisiert...',
    es: 'Actualizando...',
    pt: 'Atualizando...',
    ru: 'Обновление...',
    hi: 'अपडेट हो रहा है...',
    ar: 'جاري التحديث...',
    ch: '更新中...'
  },
  'profileEdit.actions.save': {
    fr: 'Enregistrer les modifications',
    en: 'Save changes',
    de: 'Änderungen speichern',
    es: 'Guardar cambios',
    pt: 'Salvar alterações',
    ru: 'Сохранить изменения',
    hi: 'परिवर्तन सहेजें',
    ar: 'حفظ التغييرات',
    ch: '保存更改'
  },
  'profileEdit.actions.cancel': {
    fr: 'Annuler',
    en: 'Cancel',
    de: 'Abbrechen',
    es: 'Cancelar',
    pt: 'Cancelar',
    ru: 'Отмена',
    hi: 'रद्द करें',
    ar: 'إلغاء',
    ch: '取消'
  }
};

// Charger les fichiers existants
const langs = ['fr', 'en', 'de', 'es', 'pt', 'ru', 'hi', 'ar', 'ch'];
const translations = {};

langs.forEach(lang => {
  translations[lang] = JSON.parse(fs.readFileSync(path.join(basePath, `${lang}.json`), 'utf-8'));
});

// Ajouter les nouvelles traductions
Object.entries(newTranslations).forEach(([key, values]) => {
  langs.forEach(lang => {
    if (values[lang] && !translations[lang][key]) {
      translations[lang][key] = values[lang];
    }
  });
});

// Sauvegarder les fichiers
langs.forEach(lang => {
  const sortedKeys = Object.keys(translations[lang]).sort();
  const sorted = {};
  sortedKeys.forEach(k => sorted[k] = translations[lang][k]);

  fs.writeFileSync(
    path.join(basePath, `${lang}.json`),
    JSON.stringify(sorted, null, 2),
    'utf-8'
  );
});

console.log('✅ Traductions ProfileEdit ajoutées avec succès!');
console.log(`${Object.keys(newTranslations).length} clés ajoutées dans ${langs.length} langues.`);
