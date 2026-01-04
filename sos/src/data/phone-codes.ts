// ========================================
// src/data/phone-codes.ts — Country phone dial codes (197 countries)
// ========================================

export interface PhoneCodeEntry {
  code: string;
  phoneCode: string;
  disabled?: boolean;
  fr: string;
  en: string;
  es: string;
  de: string;
  pt: string;
  ru: string;
  zh: string;
  ar: string;
  hi: string;
}

export const phoneCodesData: PhoneCodeEntry[] = [
  // A
  { code: 'AF', phoneCode: '+93', fr: 'Afghanistan', en: 'Afghanistan', es: 'Afganistán', de: 'Afghanistan', pt: 'Afeganistão', ru: 'Афганистан', zh: '阿富汗', ar: 'أفغانستان', hi: 'अफ़ग़ानिस्तान' },
  { code: 'ZA', phoneCode: '+27', fr: 'Afrique du Sud', en: 'South Africa', es: 'Sudáfrica', de: 'Südafrika', pt: 'África do Sul', ru: 'Южная Африка', zh: '南非', ar: 'جنوب أفريقيا', hi: 'दक्षिण अफ्रीका' },
  { code: 'AL', phoneCode: '+355', fr: 'Albanie', en: 'Albania', es: 'Albania', de: 'Albanien', pt: 'Albânia', ru: 'Албания', zh: '阿尔巴尼亚', ar: 'ألبانيا', hi: 'अल्बानिया' },
  { code: 'DZ', phoneCode: '+213', fr: 'Algérie', en: 'Algeria', es: 'Argelia', de: 'Algerien', pt: 'Argélia', ru: 'Алжир', zh: '阿尔及利亚', ar: 'الجزائر', hi: 'अल्जीरिया' },
  { code: 'DE', phoneCode: '+49', fr: 'Allemagne', en: 'Germany', es: 'Alemania', de: 'Deutschland', pt: 'Alemanha', ru: 'Германия', zh: '德国', ar: 'ألمانيا', hi: 'जर्मनी' },
  { code: 'AD', phoneCode: '+376', fr: 'Andorre', en: 'Andorra', es: 'Andorra', de: 'Andorra', pt: 'Andorra', ru: 'Андорра', zh: '安道尔', ar: 'أندورا', hi: 'अंडोरा' },
  { code: 'AO', phoneCode: '+244', fr: 'Angola', en: 'Angola', es: 'Angola', de: 'Angola', pt: 'Angola', ru: 'Ангола', zh: '安哥拉', ar: 'أنغولا', hi: 'अंगोला' },
  { code: 'AG', phoneCode: '+1268', fr: 'Antigua-et-Barbuda', en: 'Antigua and Barbuda', es: 'Antigua y Barbuda', de: 'Antigua und Barbuda', pt: 'Antígua e Barbuda', ru: 'Антигуа и Барбуда', zh: '安提瓜和巴布达', ar: 'أنتيغوا وبربودا', hi: 'एंटीगुआ और बारबुडा' },
  { code: 'SA', phoneCode: '+966', fr: 'Arabie Saoudite', en: 'Saudi Arabia', es: 'Arabia Saudita', de: 'Saudi-Arabien', pt: 'Arábia Saudita', ru: 'Саудовская Аравия', zh: '沙特阿拉伯', ar: 'المملكة العربية السعودية', hi: 'सऊदी अरब' },
  { code: 'AR', phoneCode: '+54', fr: 'Argentine', en: 'Argentina', es: 'Argentina', de: 'Argentinien', pt: 'Argentina', ru: 'Аргентина', zh: '阿根廷', ar: 'الأرجنتين', hi: 'अर्जेंटीना' },
  { code: 'AM', phoneCode: '+374', fr: 'Arménie', en: 'Armenia', es: 'Armenia', de: 'Armenien', pt: 'Armênia', ru: 'Армения', zh: '亚美尼亚', ar: 'أرمينيا', hi: 'आर्मेनिया' },
  { code: 'AU', phoneCode: '+61', fr: 'Australie', en: 'Australia', es: 'Australia', de: 'Australien', pt: 'Austrália', ru: 'Австралия', zh: '澳大利亚', ar: 'أستراليا', hi: 'ऑस्ट्रेलिया' },
  { code: 'AT', phoneCode: '+43', fr: 'Autriche', en: 'Austria', es: 'Austria', de: 'Österreich', pt: 'Áustria', ru: 'Австрия', zh: '奥地利', ar: 'النمسا', hi: 'ऑस्ट्रिया' },
  { code: 'AZ', phoneCode: '+994', fr: 'Azerbaïdjan', en: 'Azerbaijan', es: 'Azerbaiyán', de: 'Aserbaidschan', pt: 'Azerbaijão', ru: 'Азербайджан', zh: '阿塞拜疆', ar: 'أذربيجان', hi: 'अज़रबैजान' },

  // B
  { code: 'BS', phoneCode: '+1242', fr: 'Bahamas', en: 'Bahamas', es: 'Bahamas', de: 'Bahamas', pt: 'Bahamas', ru: 'Багамы', zh: '巴哈马', ar: 'الباهاما', hi: 'बहामास' },
  { code: 'BH', phoneCode: '+973', fr: 'Bahreïn', en: 'Bahrain', es: 'Baréin', de: 'Bahrain', pt: 'Bahrein', ru: 'Бахрейн', zh: '巴林', ar: 'البحرين', hi: 'बहरीन' },
  { code: 'BD', phoneCode: '+880', fr: 'Bangladesh', en: 'Bangladesh', es: 'Bangladés', de: 'Bangladesch', pt: 'Bangladesh', ru: 'Бангладеш', zh: '孟加拉国', ar: 'بنغلاديش', hi: 'बांग्लादेश' },
  { code: 'BB', phoneCode: '+1246', fr: 'Barbade', en: 'Barbados', es: 'Barbados', de: 'Barbados', pt: 'Barbados', ru: 'Барбадос', zh: '巴巴多斯', ar: 'بربادوس', hi: 'बारबाडोस' },
  { code: 'BE', phoneCode: '+32', fr: 'Belgique', en: 'Belgium', es: 'Bélgica', de: 'Belgien', pt: 'Bélgica', ru: 'Бельгия', zh: '比利时', ar: 'بلجيكا', hi: 'बेल्जियम' },
  { code: 'BZ', phoneCode: '+501', fr: 'Belize', en: 'Belize', es: 'Belice', de: 'Belize', pt: 'Belize', ru: 'Белиз', zh: '伯利兹', ar: 'بليز', hi: 'बेलीज़' },
  { code: 'BJ', phoneCode: '+229', fr: 'Bénin', en: 'Benin', es: 'Benín', de: 'Benin', pt: 'Benin', ru: 'Бенин', zh: '贝宁', ar: 'بنين', hi: 'बेनिन' },
  { code: 'BT', phoneCode: '+975', fr: 'Bhoutan', en: 'Bhutan', es: 'Bután', de: 'Bhutan', pt: 'Butão', ru: 'Бутан', zh: '不丹', ar: 'بوتان', hi: 'भूटान' },
  { code: 'BY', phoneCode: '+375', fr: 'Biélorussie', en: 'Belarus', es: 'Bielorrusia', de: 'Belarus', pt: 'Bielorrússia', ru: 'Беларусь', zh: '白俄罗斯', ar: 'بيلاروسيا', hi: 'बेलारूस' },
  { code: 'BO', phoneCode: '+591', fr: 'Bolivie', en: 'Bolivia', es: 'Bolivia', de: 'Bolivien', pt: 'Bolívia', ru: 'Боливия', zh: '玻利维亚', ar: 'بوليفيا', hi: 'बोलीविया' },
  { code: 'BA', phoneCode: '+387', fr: 'Bosnie-Herzégovine', en: 'Bosnia and Herzegovina', es: 'Bosnia y Herzegovina', de: 'Bosnien und Herzegowina', pt: 'Bósnia e Herzegovina', ru: 'Босния и Герцеговина', zh: '波斯尼亚和黑塞哥维那', ar: 'البوسنة والهرسك', hi: 'बोस्निया और हर्जेगोविना' },
  { code: 'BW', phoneCode: '+267', fr: 'Botswana', en: 'Botswana', es: 'Botsuana', de: 'Botswana', pt: 'Botsuana', ru: 'Ботсвана', zh: '博茨瓦纳', ar: 'بوتسوانا', hi: 'बोत्सवाना' },
  { code: 'BR', phoneCode: '+55', fr: 'Brésil', en: 'Brazil', es: 'Brasil', de: 'Brasilien', pt: 'Brasil', ru: 'Бразилия', zh: '巴西', ar: 'البرازيل', hi: 'ब्राज़ील' },
  { code: 'BN', phoneCode: '+673', fr: 'Brunei', en: 'Brunei', es: 'Brunéi', de: 'Brunei', pt: 'Brunei', ru: 'Бруней', zh: '文莱', ar: 'بروناي', hi: 'ब्रुनेई' },
  { code: 'BG', phoneCode: '+359', fr: 'Bulgarie', en: 'Bulgaria', es: 'Bulgaria', de: 'Bulgarien', pt: 'Bulgária', ru: 'Болгария', zh: '保加利亚', ar: 'بلغاريا', hi: 'बुल्गारिया' },
  { code: 'BF', phoneCode: '+226', fr: 'Burkina Faso', en: 'Burkina Faso', es: 'Burkina Faso', de: 'Burkina Faso', pt: 'Burkina Faso', ru: 'Буркина-Фасо', zh: '布基纳法索', ar: 'بوركينا فاسو', hi: 'बुर्किना फासो' },
  { code: 'BI', phoneCode: '+257', fr: 'Burundi', en: 'Burundi', es: 'Burundi', de: 'Burundi', pt: 'Burundi', ru: 'Бурунди', zh: '布隆迪', ar: 'بوروندي', hi: 'बुरुंडी' },

  // C
  { code: 'KH', phoneCode: '+855', fr: 'Cambodge', en: 'Cambodia', es: 'Camboya', de: 'Kambodscha', pt: 'Camboja', ru: 'Камбоджа', zh: '柬埔寨', ar: 'كمبوديا', hi: 'कंबोडिया' },
  { code: 'CM', phoneCode: '+237', fr: 'Cameroun', en: 'Cameroon', es: 'Camerún', de: 'Kamerun', pt: 'Camarões', ru: 'Камерун', zh: '喀麦隆', ar: 'الكاميرون', hi: 'कैमरून' },
  { code: 'CA', phoneCode: '+1', fr: 'Canada', en: 'Canada', es: 'Canadá', de: 'Kanada', pt: 'Canadá', ru: 'Канада', zh: '加拿大', ar: 'كندا', hi: 'कनाडा' },
  { code: 'CV', phoneCode: '+238', fr: 'Cap-Vert', en: 'Cape Verde', es: 'Cabo Verde', de: 'Kap Verde', pt: 'Cabo Verde', ru: 'Кабо-Верде', zh: '佛得角', ar: 'الرأس الأخضر', hi: 'केप वर्डे' },
  { code: 'CF', phoneCode: '+236', fr: 'Centrafrique', en: 'Central African Republic', es: 'República Centroafricana', de: 'Zentralafrikanische Republik', pt: 'República Centro-Africana', ru: 'ЦАР', zh: '中非共和国', ar: 'جمهورية أفريقيا الوسطى', hi: 'मध्य अफ़्रीकी गणराज्य' },
  { code: 'CL', phoneCode: '+56', fr: 'Chili', en: 'Chile', es: 'Chile', de: 'Chile', pt: 'Chile', ru: 'Чили', zh: '智利', ar: 'تشيلي', hi: 'चिली' },
  { code: 'CN', phoneCode: '+86', fr: 'Chine', en: 'China', es: 'China', de: 'China', pt: 'China', ru: 'Китай', zh: '中国', ar: 'الصين', hi: 'चीन' },
  { code: 'CY', phoneCode: '+357', fr: 'Chypre', en: 'Cyprus', es: 'Chipre', de: 'Zypern', pt: 'Chipre', ru: 'Кипр', zh: '塞浦路斯', ar: 'قبرص', hi: 'साइप्रस' },
  { code: 'CO', phoneCode: '+57', fr: 'Colombie', en: 'Colombia', es: 'Colombia', de: 'Kolumbien', pt: 'Colômbia', ru: 'Колумбия', zh: '哥伦比亚', ar: 'كولومبيا', hi: 'कोलंबिया' },
  { code: 'KM', phoneCode: '+269', fr: 'Comores', en: 'Comoros', es: 'Comoras', de: 'Komoren', pt: 'Comores', ru: 'Коморы', zh: '科摩罗', ar: 'جزر القمر', hi: 'कोमोरोस' },
  { code: 'CG', phoneCode: '+242', fr: 'Congo', en: 'Congo', es: 'Congo', de: 'Kongo', pt: 'Congo', ru: 'Конго', zh: '刚果', ar: 'الكونغو', hi: 'कांगो' },
  { code: 'KP', phoneCode: '+850', fr: 'Corée du Nord', en: 'North Korea', es: 'Corea del Norte', de: 'Nordkorea', pt: 'Coreia do Norte', ru: 'Северная Корея', zh: '朝鲜', ar: 'كوريا الشمالية', hi: 'उत्तर कोरिया' },
  { code: 'KR', phoneCode: '+82', fr: 'Corée du Sud', en: 'South Korea', es: 'Corea del Sur', de: 'Südkorea', pt: 'Coreia do Sul', ru: 'Южная Корея', zh: '韩国', ar: 'كوريا الجنوبية', hi: 'दक्षिण कोरिया' },
  { code: 'CR', phoneCode: '+506', fr: 'Costa Rica', en: 'Costa Rica', es: 'Costa Rica', de: 'Costa Rica', pt: 'Costa Rica', ru: 'Коста-Рика', zh: '哥斯达黎加', ar: 'كوستاريكا', hi: 'कोस्टा रिका' },
  { code: 'CI', phoneCode: '+225', fr: "Côte d'Ivoire", en: 'Ivory Coast', es: 'Costa de Marfil', de: 'Elfenbeinküste', pt: 'Costa do Marfim', ru: 'Кот-д\'Ивуар', zh: '科特迪瓦', ar: 'ساحل العاج', hi: 'आइवरी कोस्ट' },
  { code: 'HR', phoneCode: '+385', fr: 'Croatie', en: 'Croatia', es: 'Croacia', de: 'Kroatien', pt: 'Croácia', ru: 'Хорватия', zh: '克罗地亚', ar: 'كرواتيا', hi: 'क्रोएशिया' },
  { code: 'CU', phoneCode: '+53', fr: 'Cuba', en: 'Cuba', es: 'Cuba', de: 'Kuba', pt: 'Cuba', ru: 'Куба', zh: '古巴', ar: 'كوبا', hi: 'क्यूबा' },

  // D
  { code: 'DK', phoneCode: '+45', fr: 'Danemark', en: 'Denmark', es: 'Dinamarca', de: 'Dänemark', pt: 'Dinamarca', ru: 'Дания', zh: '丹麦', ar: 'الدنمارك', hi: 'डेनमार्क' },
  { code: 'DJ', phoneCode: '+253', fr: 'Djibouti', en: 'Djibouti', es: 'Yibuti', de: 'Dschibuti', pt: 'Djibuti', ru: 'Джибути', zh: '吉布提', ar: 'جيبوتي', hi: 'जिबूती' },
  { code: 'DM', phoneCode: '+1767', fr: 'Dominique', en: 'Dominica', es: 'Dominica', de: 'Dominica', pt: 'Dominica', ru: 'Доминика', zh: '多米尼克', ar: 'دومينيكا', hi: 'डोमिनिका' },

  // E
  { code: 'EG', phoneCode: '+20', fr: 'Égypte', en: 'Egypt', es: 'Egipto', de: 'Ägypten', pt: 'Egito', ru: 'Египет', zh: '埃及', ar: 'مصر', hi: 'मिस्र' },
  { code: 'SV', phoneCode: '+503', fr: 'El Salvador', en: 'El Salvador', es: 'El Salvador', de: 'El Salvador', pt: 'El Salvador', ru: 'Сальвадор', zh: '萨尔瓦多', ar: 'السلفادور', hi: 'अल साल्वाडोर' },
  { code: 'AE', phoneCode: '+971', fr: 'Émirats Arabes Unis', en: 'United Arab Emirates', es: 'Emiratos Árabes Unidos', de: 'Vereinigte Arabische Emirate', pt: 'Emirados Árabes Unidos', ru: 'ОАЭ', zh: '阿联酋', ar: 'الإمارات العربية المتحدة', hi: 'संयुक्त अरब अमीरात' },
  { code: 'EC', phoneCode: '+593', fr: 'Équateur', en: 'Ecuador', es: 'Ecuador', de: 'Ecuador', pt: 'Equador', ru: 'Эквадор', zh: '厄瓜多尔', ar: 'الإكوادور', hi: 'इक्वाडोर' },
  { code: 'ER', phoneCode: '+291', fr: 'Érythrée', en: 'Eritrea', es: 'Eritrea', de: 'Eritrea', pt: 'Eritreia', ru: 'Эритрея', zh: '厄立特里亚', ar: 'إريتريا', hi: 'इरिट्रिया' },
  { code: 'ES', phoneCode: '+34', fr: 'Espagne', en: 'Spain', es: 'España', de: 'Spanien', pt: 'Espanha', ru: 'Испания', zh: '西班牙', ar: 'إسبانيا', hi: 'स्पेन' },
  { code: 'EE', phoneCode: '+372', fr: 'Estonie', en: 'Estonia', es: 'Estonia', de: 'Estland', pt: 'Estônia', ru: 'Эстония', zh: '爱沙尼亚', ar: 'إستونيا', hi: 'एस्टोनिया' },
  { code: 'US', phoneCode: '+1', fr: 'États-Unis', en: 'United States', es: 'Estados Unidos', de: 'Vereinigte Staaten', pt: 'Estados Unidos', ru: 'США', zh: '美国', ar: 'الولايات المتحدة', hi: 'संयुक्त राज्य अमेरिका' },
  { code: 'ET', phoneCode: '+251', fr: 'Éthiopie', en: 'Ethiopia', es: 'Etiopía', de: 'Äthiopien', pt: 'Etiópia', ru: 'Эфиопия', zh: '埃塞俄比亚', ar: 'إثيوبيا', hi: 'इथियोपिया' },
  { code: 'SZ', phoneCode: '+268', fr: 'Eswatini', en: 'Eswatini', es: 'Esuatini', de: 'Eswatini', pt: 'Essuatíni', ru: 'Эсватини', zh: '斯威士兰', ar: 'إسواتيني', hi: 'एस्वातिनी' },

  // F
  { code: 'FJ', phoneCode: '+679', fr: 'Fidji', en: 'Fiji', es: 'Fiyi', de: 'Fidschi', pt: 'Fiji', ru: 'Фиджи', zh: '斐济', ar: 'فيجي', hi: 'फ़िजी' },
  { code: 'FI', phoneCode: '+358', fr: 'Finlande', en: 'Finland', es: 'Finlandia', de: 'Finnland', pt: 'Finlândia', ru: 'Финляндия', zh: '芬兰', ar: 'فنلندا', hi: 'फ़िनलैंड' },
  { code: 'FR', phoneCode: '+33', fr: 'France', en: 'France', es: 'Francia', de: 'Frankreich', pt: 'França', ru: 'Франция', zh: '法国', ar: 'فرنسا', hi: 'फ्रांस' },

  // G
  { code: 'GA', phoneCode: '+241', fr: 'Gabon', en: 'Gabon', es: 'Gabón', de: 'Gabun', pt: 'Gabão', ru: 'Габон', zh: '加蓬', ar: 'الغابون', hi: 'गैबॉन' },
  { code: 'GM', phoneCode: '+220', fr: 'Gambie', en: 'Gambia', es: 'Gambia', de: 'Gambia', pt: 'Gâmbia', ru: 'Гамбия', zh: '冈比亚', ar: 'غامبيا', hi: 'गाम्बिया' },
  { code: 'GE', phoneCode: '+995', fr: 'Géorgie', en: 'Georgia', es: 'Georgia', de: 'Georgien', pt: 'Geórgia', ru: 'Грузия', zh: '格鲁吉亚', ar: 'جورجيا', hi: 'जॉर्जिया' },
  { code: 'GH', phoneCode: '+233', fr: 'Ghana', en: 'Ghana', es: 'Ghana', de: 'Ghana', pt: 'Gana', ru: 'Гана', zh: '加纳', ar: 'غانا', hi: 'घाना' },
  { code: 'GR', phoneCode: '+30', fr: 'Grèce', en: 'Greece', es: 'Grecia', de: 'Griechenland', pt: 'Grécia', ru: 'Греция', zh: '希腊', ar: 'اليونان', hi: 'ग्रीस' },
  { code: 'GD', phoneCode: '+1473', fr: 'Grenade', en: 'Grenada', es: 'Granada', de: 'Grenada', pt: 'Granada', ru: 'Гренада', zh: '格林纳达', ar: 'غرينادا', hi: 'ग्रेनेडा' },
  { code: 'GT', phoneCode: '+502', fr: 'Guatemala', en: 'Guatemala', es: 'Guatemala', de: 'Guatemala', pt: 'Guatemala', ru: 'Гватемала', zh: '危地马拉', ar: 'غواتيمالا', hi: 'ग्वाटेमाला' },
  { code: 'GN', phoneCode: '+224', fr: 'Guinée', en: 'Guinea', es: 'Guinea', de: 'Guinea', pt: 'Guiné', ru: 'Гвинея', zh: '几内亚', ar: 'غينيا', hi: 'गिनी' },
  { code: 'GW', phoneCode: '+245', fr: 'Guinée-Bissau', en: 'Guinea-Bissau', es: 'Guinea-Bisáu', de: 'Guinea-Bissau', pt: 'Guiné-Bissau', ru: 'Гвинея-Бисау', zh: '几内亚比绍', ar: 'غينيا بيساو', hi: 'गिनी-बिसाउ' },
  { code: 'GQ', phoneCode: '+240', fr: 'Guinée équatoriale', en: 'Equatorial Guinea', es: 'Guinea Ecuatorial', de: 'Äquatorialguinea', pt: 'Guiné Equatorial', ru: 'Экваториальная Гвинея', zh: '赤道几内亚', ar: 'غينيا الاستوائية', hi: 'इक्वेटोरियल गिनी' },
  { code: 'GY', phoneCode: '+592', fr: 'Guyana', en: 'Guyana', es: 'Guyana', de: 'Guyana', pt: 'Guiana', ru: 'Гайана', zh: '圭亚那', ar: 'غيانا', hi: 'गयाना' },

  // H
  { code: 'HT', phoneCode: '+509', fr: 'Haïti', en: 'Haiti', es: 'Haití', de: 'Haiti', pt: 'Haiti', ru: 'Гаити', zh: '海地', ar: 'هايتي', hi: 'हैती' },
  { code: 'HN', phoneCode: '+504', fr: 'Honduras', en: 'Honduras', es: 'Honduras', de: 'Honduras', pt: 'Honduras', ru: 'Гондурас', zh: '洪都拉斯', ar: 'هندوراس', hi: 'होंडुरास' },
  { code: 'HK', phoneCode: '+852', fr: 'Hong Kong', en: 'Hong Kong', es: 'Hong Kong', de: 'Hongkong', pt: 'Hong Kong', ru: 'Гонконг', zh: '香港', ar: 'هونغ كونغ', hi: 'हांगकांग' },
  { code: 'HU', phoneCode: '+36', fr: 'Hongrie', en: 'Hungary', es: 'Hungría', de: 'Ungarn', pt: 'Hungria', ru: 'Венгрия', zh: '匈牙利', ar: 'المجر', hi: 'हंगरी' },

  // I
  { code: 'IN', phoneCode: '+91', fr: 'Inde', en: 'India', es: 'India', de: 'Indien', pt: 'Índia', ru: 'Индия', zh: '印度', ar: 'الهند', hi: 'भारत' },
  { code: 'ID', phoneCode: '+62', fr: 'Indonésie', en: 'Indonesia', es: 'Indonesia', de: 'Indonesien', pt: 'Indonésia', ru: 'Индонезия', zh: '印度尼西亚', ar: 'إندونيسيا', hi: 'इंडोनेशिया' },
  { code: 'IQ', phoneCode: '+964', fr: 'Irak', en: 'Iraq', es: 'Irak', de: 'Irak', pt: 'Iraque', ru: 'Ирак', zh: '伊拉克', ar: 'العراق', hi: 'इराक' },
  { code: 'IR', phoneCode: '+98', fr: 'Iran', en: 'Iran', es: 'Irán', de: 'Iran', pt: 'Irã', ru: 'Иран', zh: '伊朗', ar: 'إيران', hi: 'ईरान' },
  { code: 'IE', phoneCode: '+353', fr: 'Irlande', en: 'Ireland', es: 'Irlanda', de: 'Irland', pt: 'Irlanda', ru: 'Ирландия', zh: '爱尔兰', ar: 'أيرلندا', hi: 'आयरलैंड' },
  { code: 'IS', phoneCode: '+354', fr: 'Islande', en: 'Iceland', es: 'Islandia', de: 'Island', pt: 'Islândia', ru: 'Исландия', zh: '冰岛', ar: 'آيسلندا', hi: 'आइसलैंड' },
  { code: 'IL', phoneCode: '+972', fr: 'Israël', en: 'Israel', es: 'Israel', de: 'Israel', pt: 'Israel', ru: 'Израиль', zh: '以色列', ar: 'إسرائيل', hi: 'इज़राइल' },
  { code: 'IT', phoneCode: '+39', fr: 'Italie', en: 'Italy', es: 'Italia', de: 'Italien', pt: 'Itália', ru: 'Италия', zh: '意大利', ar: 'إيطاليا', hi: 'इटली' },

  // J
  { code: 'JM', phoneCode: '+1876', fr: 'Jamaïque', en: 'Jamaica', es: 'Jamaica', de: 'Jamaika', pt: 'Jamaica', ru: 'Ямайка', zh: '牙买加', ar: 'جامايكا', hi: 'जमैका' },
  { code: 'JP', phoneCode: '+81', fr: 'Japon', en: 'Japan', es: 'Japón', de: 'Japan', pt: 'Japão', ru: 'Япония', zh: '日本', ar: 'اليابان', hi: 'जापान' },
  { code: 'JO', phoneCode: '+962', fr: 'Jordanie', en: 'Jordan', es: 'Jordania', de: 'Jordanien', pt: 'Jordânia', ru: 'Иордания', zh: '约旦', ar: 'الأردن', hi: 'जॉर्डन' },

  // K
  { code: 'KZ', phoneCode: '+7', fr: 'Kazakhstan', en: 'Kazakhstan', es: 'Kazajistán', de: 'Kasachstan', pt: 'Cazaquistão', ru: 'Казахстан', zh: '哈萨克斯坦', ar: 'كازاخستان', hi: 'कज़ाख़स्तान' },
  { code: 'KE', phoneCode: '+254', fr: 'Kenya', en: 'Kenya', es: 'Kenia', de: 'Kenia', pt: 'Quênia', ru: 'Кения', zh: '肯尼亚', ar: 'كينيا', hi: 'केन्या' },
  { code: 'KG', phoneCode: '+996', fr: 'Kirghizistan', en: 'Kyrgyzstan', es: 'Kirguistán', de: 'Kirgisistan', pt: 'Quirguistão', ru: 'Киргизия', zh: '吉尔吉斯斯坦', ar: 'قيرغيزستان', hi: 'किर्गिज़स्तान' },
  { code: 'KI', phoneCode: '+686', fr: 'Kiribati', en: 'Kiribati', es: 'Kiribati', de: 'Kiribati', pt: 'Kiribati', ru: 'Кирибати', zh: '基里巴斯', ar: 'كيريباتي', hi: 'किरिबाती' },
  { code: 'XK', phoneCode: '+383', fr: 'Kosovo', en: 'Kosovo', es: 'Kosovo', de: 'Kosovo', pt: 'Kosovo', ru: 'Косово', zh: '科索沃', ar: 'كوسوفو', hi: 'कोसोवो' },
  { code: 'KW', phoneCode: '+965', fr: 'Koweït', en: 'Kuwait', es: 'Kuwait', de: 'Kuwait', pt: 'Kuwait', ru: 'Кувейт', zh: '科威特', ar: 'الكويت', hi: 'कुवैत' },

  // L
  { code: 'LA', phoneCode: '+856', fr: 'Laos', en: 'Laos', es: 'Laos', de: 'Laos', pt: 'Laos', ru: 'Лаос', zh: '老挝', ar: 'لاوس', hi: 'लाओस' },
  { code: 'LS', phoneCode: '+266', fr: 'Lesotho', en: 'Lesotho', es: 'Lesoto', de: 'Lesotho', pt: 'Lesoto', ru: 'Лесото', zh: '莱索托', ar: 'ليسوتو', hi: 'लेसोथो' },
  { code: 'LV', phoneCode: '+371', fr: 'Lettonie', en: 'Latvia', es: 'Letonia', de: 'Lettland', pt: 'Letônia', ru: 'Латвия', zh: '拉脱维亚', ar: 'لاتفيا', hi: 'लातविया' },
  { code: 'LB', phoneCode: '+961', fr: 'Liban', en: 'Lebanon', es: 'Líbano', de: 'Libanon', pt: 'Líbano', ru: 'Ливан', zh: '黎巴嫩', ar: 'لبنان', hi: 'लेबनान' },
  { code: 'LR', phoneCode: '+231', fr: 'Liberia', en: 'Liberia', es: 'Liberia', de: 'Liberia', pt: 'Libéria', ru: 'Либерия', zh: '利比里亚', ar: 'ليبيريا', hi: 'लाइबेरिया' },
  { code: 'LY', phoneCode: '+218', fr: 'Libye', en: 'Libya', es: 'Libia', de: 'Libyen', pt: 'Líbia', ru: 'Ливия', zh: '利比亚', ar: 'ليبيا', hi: 'लीबिया' },
  { code: 'LI', phoneCode: '+423', fr: 'Liechtenstein', en: 'Liechtenstein', es: 'Liechtenstein', de: 'Liechtenstein', pt: 'Liechtenstein', ru: 'Лихтенштейн', zh: '列支敦士登', ar: 'ليختنشتاين', hi: 'लिकटेंस्टीन' },
  { code: 'LT', phoneCode: '+370', fr: 'Lituanie', en: 'Lithuania', es: 'Lituania', de: 'Litauen', pt: 'Lituânia', ru: 'Литва', zh: '立陶宛', ar: 'ليتوانيا', hi: 'लिथुआनिया' },
  { code: 'LU', phoneCode: '+352', fr: 'Luxembourg', en: 'Luxembourg', es: 'Luxemburgo', de: 'Luxemburg', pt: 'Luxemburgo', ru: 'Люксембург', zh: '卢森堡', ar: 'لوكسمبورغ', hi: 'लक्ज़मबर्ग' },

  // M
  { code: 'MO', phoneCode: '+853', fr: 'Macao', en: 'Macau', es: 'Macao', de: 'Macau', pt: 'Macau', ru: 'Макао', zh: '澳门', ar: 'ماكاو', hi: 'मकाउ' },
  { code: 'MK', phoneCode: '+389', fr: 'Macédoine du Nord', en: 'North Macedonia', es: 'Macedonia del Norte', de: 'Nordmazedonien', pt: 'Macedônia do Norte', ru: 'Северная Македония', zh: '北马其顿', ar: 'مقدونيا الشمالية', hi: 'उत्तर मैसेडोनिया' },
  { code: 'MG', phoneCode: '+261', fr: 'Madagascar', en: 'Madagascar', es: 'Madagascar', de: 'Madagaskar', pt: 'Madagascar', ru: 'Мадагаскар', zh: '马达加斯加', ar: 'مدغشقر', hi: 'मेडागास्कर' },
  { code: 'MY', phoneCode: '+60', fr: 'Malaisie', en: 'Malaysia', es: 'Malasia', de: 'Malaysia', pt: 'Malásia', ru: 'Малайзия', zh: '马来西亚', ar: 'ماليزيا', hi: 'मलेशिया' },
  { code: 'MW', phoneCode: '+265', fr: 'Malawi', en: 'Malawi', es: 'Malaui', de: 'Malawi', pt: 'Malawi', ru: 'Малави', zh: '马拉维', ar: 'مالاوي', hi: 'मलावी' },
  { code: 'MV', phoneCode: '+960', fr: 'Maldives', en: 'Maldives', es: 'Maldivas', de: 'Malediven', pt: 'Maldivas', ru: 'Мальдивы', zh: '马尔代夫', ar: 'المالديف', hi: 'मालदीव' },
  { code: 'ML', phoneCode: '+223', fr: 'Mali', en: 'Mali', es: 'Malí', de: 'Mali', pt: 'Mali', ru: 'Мали', zh: '马里', ar: 'مالي', hi: 'माली' },
  { code: 'MT', phoneCode: '+356', fr: 'Malte', en: 'Malta', es: 'Malta', de: 'Malta', pt: 'Malta', ru: 'Мальта', zh: '马耳他', ar: 'مالطا', hi: 'माल्टा' },
  { code: 'MA', phoneCode: '+212', fr: 'Maroc', en: 'Morocco', es: 'Marruecos', de: 'Marokko', pt: 'Marrocos', ru: 'Марокко', zh: '摩洛哥', ar: 'المغرب', hi: 'मोरक्को' },
  { code: 'MH', phoneCode: '+692', fr: 'Îles Marshall', en: 'Marshall Islands', es: 'Islas Marshall', de: 'Marshallinseln', pt: 'Ilhas Marshall', ru: 'Маршалловы Острова', zh: '马绍尔群岛', ar: 'جزر مارشال', hi: 'मार्शल द्वीपसमूह' },
  { code: 'MU', phoneCode: '+230', fr: 'Maurice', en: 'Mauritius', es: 'Mauricio', de: 'Mauritius', pt: 'Maurício', ru: 'Маврикий', zh: '毛里求斯', ar: 'موريشيوس', hi: 'मॉरीशस' },
  { code: 'MR', phoneCode: '+222', fr: 'Mauritanie', en: 'Mauritania', es: 'Mauritania', de: 'Mauretanien', pt: 'Mauritânia', ru: 'Мавритания', zh: '毛里塔尼亚', ar: 'موريتانيا', hi: 'मॉरिटानिया' },
  { code: 'MX', phoneCode: '+52', fr: 'Mexique', en: 'Mexico', es: 'México', de: 'Mexiko', pt: 'México', ru: 'Мексика', zh: '墨西哥', ar: 'المكسيك', hi: 'मैक्सिको' },
  { code: 'FM', phoneCode: '+691', fr: 'Micronésie', en: 'Micronesia', es: 'Micronesia', de: 'Mikronesien', pt: 'Micronésia', ru: 'Микронезия', zh: '密克罗尼西亚', ar: 'ميكرونيزيا', hi: 'माइक्रोनेशिया' },
  { code: 'MD', phoneCode: '+373', fr: 'Moldavie', en: 'Moldova', es: 'Moldavia', de: 'Moldau', pt: 'Moldávia', ru: 'Молдова', zh: '摩尔多瓦', ar: 'مولدوفا', hi: 'मोल्दोवा' },
  { code: 'MC', phoneCode: '+377', fr: 'Monaco', en: 'Monaco', es: 'Mónaco', de: 'Monaco', pt: 'Mônaco', ru: 'Монако', zh: '摩纳哥', ar: 'موناكو', hi: 'मोनाको' },
  { code: 'MN', phoneCode: '+976', fr: 'Mongolie', en: 'Mongolia', es: 'Mongolia', de: 'Mongolei', pt: 'Mongólia', ru: 'Монголия', zh: '蒙古', ar: 'منغوليا', hi: 'मंगोलिया' },
  { code: 'ME', phoneCode: '+382', fr: 'Monténégro', en: 'Montenegro', es: 'Montenegro', de: 'Montenegro', pt: 'Montenegro', ru: 'Черногория', zh: '黑山', ar: 'الجبل الأسود', hi: 'मोंटेनेग्रो' },
  { code: 'MZ', phoneCode: '+258', fr: 'Mozambique', en: 'Mozambique', es: 'Mozambique', de: 'Mosambik', pt: 'Moçambique', ru: 'Мозамбик', zh: '莫桑比克', ar: 'موزمبيق', hi: 'मोज़ाम्बिक' },
  { code: 'MM', phoneCode: '+95', fr: 'Myanmar', en: 'Myanmar', es: 'Myanmar', de: 'Myanmar', pt: 'Mianmar', ru: 'Мьянма', zh: '缅甸', ar: 'ميانمار', hi: 'म्यांमार' },

  // N
  { code: 'NA', phoneCode: '+264', fr: 'Namibie', en: 'Namibia', es: 'Namibia', de: 'Namibia', pt: 'Namíbia', ru: 'Намибия', zh: '纳米比亚', ar: 'ناميبيا', hi: 'नामीबिया' },
  { code: 'NR', phoneCode: '+674', fr: 'Nauru', en: 'Nauru', es: 'Nauru', de: 'Nauru', pt: 'Nauru', ru: 'Науру', zh: '瑙鲁', ar: 'ناورو', hi: 'नाउरू' },
  { code: 'NP', phoneCode: '+977', fr: 'Népal', en: 'Nepal', es: 'Nepal', de: 'Nepal', pt: 'Nepal', ru: 'Непал', zh: '尼泊尔', ar: 'نيبال', hi: 'नेपाल' },
  { code: 'NI', phoneCode: '+505', fr: 'Nicaragua', en: 'Nicaragua', es: 'Nicaragua', de: 'Nicaragua', pt: 'Nicarágua', ru: 'Никарагуа', zh: '尼加拉瓜', ar: 'نيكاراغوا', hi: 'निकारागुआ' },
  { code: 'NE', phoneCode: '+227', fr: 'Niger', en: 'Niger', es: 'Níger', de: 'Niger', pt: 'Níger', ru: 'Нигер', zh: '尼日尔', ar: 'النيجر', hi: 'नाइजर' },
  { code: 'NG', phoneCode: '+234', fr: 'Nigeria', en: 'Nigeria', es: 'Nigeria', de: 'Nigeria', pt: 'Nigéria', ru: 'Нигерия', zh: '尼日利亚', ar: 'نيجيريا', hi: 'नाइजीरिया' },
  { code: 'NO', phoneCode: '+47', fr: 'Norvège', en: 'Norway', es: 'Noruega', de: 'Norwegen', pt: 'Noruega', ru: 'Норвегия', zh: '挪威', ar: 'النرويج', hi: 'नॉर्वे' },
  { code: 'NZ', phoneCode: '+64', fr: 'Nouvelle-Zélande', en: 'New Zealand', es: 'Nueva Zelanda', de: 'Neuseeland', pt: 'Nova Zelândia', ru: 'Новая Зеландия', zh: '新西兰', ar: 'نيوزيلندا', hi: 'न्यूज़ीलैंड' },

  // O
  { code: 'OM', phoneCode: '+968', fr: 'Oman', en: 'Oman', es: 'Omán', de: 'Oman', pt: 'Omã', ru: 'Оман', zh: '阿曼', ar: 'عمان', hi: 'ओमान' },
  { code: 'UG', phoneCode: '+256', fr: 'Ouganda', en: 'Uganda', es: 'Uganda', de: 'Uganda', pt: 'Uganda', ru: 'Уганда', zh: '乌干达', ar: 'أوغندا', hi: 'युगांडा' },
  { code: 'UZ', phoneCode: '+998', fr: 'Ouzbékistan', en: 'Uzbekistan', es: 'Uzbekistán', de: 'Usbekistan', pt: 'Uzbequistão', ru: 'Узбекистан', zh: '乌兹别克斯坦', ar: 'أوزبكستان', hi: 'उज़्बेकिस्तान' },

  // P
  { code: 'PK', phoneCode: '+92', fr: 'Pakistan', en: 'Pakistan', es: 'Pakistán', de: 'Pakistan', pt: 'Paquistão', ru: 'Пакистан', zh: '巴基斯坦', ar: 'باكستان', hi: 'पाकिस्तान' },
  { code: 'PW', phoneCode: '+680', fr: 'Palaos', en: 'Palau', es: 'Palaos', de: 'Palau', pt: 'Palau', ru: 'Палау', zh: '帕劳', ar: 'بالاو', hi: 'पलाउ' },
  { code: 'PS', phoneCode: '+970', fr: 'Palestine', en: 'Palestine', es: 'Palestina', de: 'Palästina', pt: 'Palestina', ru: 'Палестина', zh: '巴勒斯坦', ar: 'فلسطين', hi: 'फ़िलिस्तीन' },
  { code: 'PA', phoneCode: '+507', fr: 'Panama', en: 'Panama', es: 'Panamá', de: 'Panama', pt: 'Panamá', ru: 'Панама', zh: '巴拿马', ar: 'بنما', hi: 'पनामा' },
  { code: 'PG', phoneCode: '+675', fr: 'Papouasie-Nouvelle-Guinée', en: 'Papua New Guinea', es: 'Papúa Nueva Guinea', de: 'Papua-Neuguinea', pt: 'Papua-Nova Guiné', ru: 'Папуа — Новая Гвинея', zh: '巴布亚新几内亚', ar: 'بابوا غينيا الجديدة', hi: 'पापुआ न्यू गिनी' },
  { code: 'PY', phoneCode: '+595', fr: 'Paraguay', en: 'Paraguay', es: 'Paraguay', de: 'Paraguay', pt: 'Paraguai', ru: 'Парагвай', zh: '巴拉圭', ar: 'باراغواي', hi: 'पैराग्वे' },
  { code: 'NL', phoneCode: '+31', fr: 'Pays-Bas', en: 'Netherlands', es: 'Países Bajos', de: 'Niederlande', pt: 'Países Baixos', ru: 'Нидерланды', zh: '荷兰', ar: 'هولندا', hi: 'नीदरलैंड' },
  { code: 'PE', phoneCode: '+51', fr: 'Pérou', en: 'Peru', es: 'Perú', de: 'Peru', pt: 'Peru', ru: 'Перу', zh: '秘鲁', ar: 'بيرو', hi: 'पेरू' },
  { code: 'PH', phoneCode: '+63', fr: 'Philippines', en: 'Philippines', es: 'Filipinas', de: 'Philippinen', pt: 'Filipinas', ru: 'Филиппины', zh: '菲律宾', ar: 'الفلبين', hi: 'फ़िलीपींस' },
  { code: 'PL', phoneCode: '+48', fr: 'Pologne', en: 'Poland', es: 'Polonia', de: 'Polen', pt: 'Polônia', ru: 'Польша', zh: '波兰', ar: 'بولندا', hi: 'पोलैंड' },
  { code: 'PT', phoneCode: '+351', fr: 'Portugal', en: 'Portugal', es: 'Portugal', de: 'Portugal', pt: 'Portugal', ru: 'Португалия', zh: '葡萄牙', ar: 'البرتغال', hi: 'पुर्तगाल' },

  // Q
  { code: 'QA', phoneCode: '+974', fr: 'Qatar', en: 'Qatar', es: 'Catar', de: 'Katar', pt: 'Catar', ru: 'Катар', zh: '卡塔尔', ar: 'قطر', hi: 'क़तर' },

  // R
  { code: 'CD', phoneCode: '+243', fr: 'RD Congo', en: 'DR Congo', es: 'RD del Congo', de: 'DR Kongo', pt: 'RD Congo', ru: 'ДР Конго', zh: '刚果民主共和国', ar: 'جمهورية الكونغو الديمقراطية', hi: 'कांगो लोकतांत्रिक गणराज्य' },
  { code: 'DO', phoneCode: '+1809', fr: 'République dominicaine', en: 'Dominican Republic', es: 'República Dominicana', de: 'Dominikanische Republik', pt: 'República Dominicana', ru: 'Доминиканская Республика', zh: '多米尼加共和国', ar: 'جمهورية الدومينيكان', hi: 'डोमिनिकन गणराज्य' },
  { code: 'CZ', phoneCode: '+420', fr: 'République Tchèque', en: 'Czech Republic', es: 'República Checa', de: 'Tschechien', pt: 'República Tcheca', ru: 'Чехия', zh: '捷克', ar: 'التشيك', hi: 'चेक गणराज्य' },
  { code: 'RO', phoneCode: '+40', fr: 'Roumanie', en: 'Romania', es: 'Rumania', de: 'Rumänien', pt: 'Romênia', ru: 'Румыния', zh: '罗马尼亚', ar: 'رومانيا', hi: 'रोमानिया' },
  { code: 'GB', phoneCode: '+44', fr: 'Royaume-Uni', en: 'United Kingdom', es: 'Reino Unido', de: 'Vereinigtes Königreich', pt: 'Reino Unido', ru: 'Великобритания', zh: '英国', ar: 'المملكة المتحدة', hi: 'यूनाइटेड किंगडम' },
  { code: 'RU', phoneCode: '+7', fr: 'Russie', en: 'Russia', es: 'Rusia', de: 'Russland', pt: 'Rússia', ru: 'Россия', zh: '俄罗斯', ar: 'روسيا', hi: 'रूस' },
  { code: 'RW', phoneCode: '+250', fr: 'Rwanda', en: 'Rwanda', es: 'Ruanda', de: 'Ruanda', pt: 'Ruanda', ru: 'Руанда', zh: '卢旺达', ar: 'رواندا', hi: 'रवांडा' },

  // S
  { code: 'KN', phoneCode: '+1869', fr: 'Saint-Kitts-et-Nevis', en: 'Saint Kitts and Nevis', es: 'San Cristóbal y Nieves', de: 'St. Kitts und Nevis', pt: 'São Cristóvão e Nevis', ru: 'Сент-Китс и Невис', zh: '圣基茨和尼维斯', ar: 'سانت كيتس ونيفيس', hi: 'सेंट किट्स और नेविस' },
  { code: 'LC', phoneCode: '+1758', fr: 'Sainte-Lucie', en: 'Saint Lucia', es: 'Santa Lucía', de: 'St. Lucia', pt: 'Santa Lúcia', ru: 'Сент-Люсия', zh: '圣卢西亚', ar: 'سانت لوسيا', hi: 'सेंट लूसिया' },
  { code: 'VC', phoneCode: '+1784', fr: 'Saint-Vincent-et-les-Grenadines', en: 'Saint Vincent and the Grenadines', es: 'San Vicente y las Granadinas', de: 'St. Vincent und die Grenadinen', pt: 'São Vicente e Granadinas', ru: 'Сент-Винсент и Гренадины', zh: '圣文森特和格林纳丁斯', ar: 'سانت فينسنت والغرينادين', hi: 'सेंट विंसेंट और ग्रेनेडाइंस' },
  { code: 'SB', phoneCode: '+677', fr: 'Îles Salomon', en: 'Solomon Islands', es: 'Islas Salomón', de: 'Salomonen', pt: 'Ilhas Salomão', ru: 'Соломоновы Острова', zh: '所罗门群岛', ar: 'جزر سليمان', hi: 'सोलोमन द्वीपसमूह' },
  { code: 'WS', phoneCode: '+685', fr: 'Samoa', en: 'Samoa', es: 'Samoa', de: 'Samoa', pt: 'Samoa', ru: 'Самоа', zh: '萨摩亚', ar: 'ساموا', hi: 'समोआ' },
  { code: 'SM', phoneCode: '+378', fr: 'Saint-Marin', en: 'San Marino', es: 'San Marino', de: 'San Marino', pt: 'San Marino', ru: 'Сан-Марино', zh: '圣马力诺', ar: 'سان مارينو', hi: 'सैन मैरिनो' },
  { code: 'ST', phoneCode: '+239', fr: 'São Tomé-et-Príncipe', en: 'São Tomé and Príncipe', es: 'Santo Tomé y Príncipe', de: 'São Tomé und Príncipe', pt: 'São Tomé e Príncipe', ru: 'Сан-Томе и Принсипи', zh: '圣多美和普林西比', ar: 'ساو تومي وبرينسيبي', hi: 'साओ टोमे और प्रिंसिपे' },
  { code: 'SN', phoneCode: '+221', fr: 'Sénégal', en: 'Senegal', es: 'Senegal', de: 'Senegal', pt: 'Senegal', ru: 'Сенегал', zh: '塞内加尔', ar: 'السنغال', hi: 'सेनेगल' },
  { code: 'RS', phoneCode: '+381', fr: 'Serbie', en: 'Serbia', es: 'Serbia', de: 'Serbien', pt: 'Sérvia', ru: 'Сербия', zh: '塞尔维亚', ar: 'صربيا', hi: 'सर्बिया' },
  { code: 'SC', phoneCode: '+248', fr: 'Seychelles', en: 'Seychelles', es: 'Seychelles', de: 'Seychellen', pt: 'Seicheles', ru: 'Сейшельские Острова', zh: '塞舌尔', ar: 'سيشل', hi: 'सेशेल्स' },
  { code: 'SL', phoneCode: '+232', fr: 'Sierra Leone', en: 'Sierra Leone', es: 'Sierra Leona', de: 'Sierra Leone', pt: 'Serra Leoa', ru: 'Сьерра-Леоне', zh: '塞拉利昂', ar: 'سيراليون', hi: 'सिएरा लियोन' },
  { code: 'SG', phoneCode: '+65', fr: 'Singapour', en: 'Singapore', es: 'Singapur', de: 'Singapur', pt: 'Singapura', ru: 'Сингапур', zh: '新加坡', ar: 'سنغافورة', hi: 'सिंगापुर' },
  { code: 'SK', phoneCode: '+421', fr: 'Slovaquie', en: 'Slovakia', es: 'Eslovaquia', de: 'Slowakei', pt: 'Eslováquia', ru: 'Словакия', zh: '斯洛伐克', ar: 'سلوفاكيا', hi: 'स्लोवाकिया' },
  { code: 'SI', phoneCode: '+386', fr: 'Slovénie', en: 'Slovenia', es: 'Eslovenia', de: 'Slowenien', pt: 'Eslovênia', ru: 'Словения', zh: '斯洛文尼亚', ar: 'سلوفينيا', hi: 'स्लोवेनिया' },
  { code: 'SO', phoneCode: '+252', fr: 'Somalie', en: 'Somalia', es: 'Somalia', de: 'Somalia', pt: 'Somália', ru: 'Сомали', zh: '索马里', ar: 'الصومال', hi: 'सोमालिया' },
  { code: 'SD', phoneCode: '+249', fr: 'Soudan', en: 'Sudan', es: 'Sudán', de: 'Sudan', pt: 'Sudão', ru: 'Судан', zh: '苏丹', ar: 'السودان', hi: 'सूडान' },
  { code: 'SS', phoneCode: '+211', fr: 'Soudan du Sud', en: 'South Sudan', es: 'Sudán del Sur', de: 'Südsudan', pt: 'Sudão do Sul', ru: 'Южный Судан', zh: '南苏丹', ar: 'جنوب السودان', hi: 'दक्षिण सूडान' },
  { code: 'LK', phoneCode: '+94', fr: 'Sri Lanka', en: 'Sri Lanka', es: 'Sri Lanka', de: 'Sri Lanka', pt: 'Sri Lanka', ru: 'Шри-Ланка', zh: '斯里兰卡', ar: 'سريلانكا', hi: 'श्रीलंका' },
  { code: 'SE', phoneCode: '+46', fr: 'Suède', en: 'Sweden', es: 'Suecia', de: 'Schweden', pt: 'Suécia', ru: 'Швеция', zh: '瑞典', ar: 'السويد', hi: 'स्वीडन' },
  { code: 'CH', phoneCode: '+41', fr: 'Suisse', en: 'Switzerland', es: 'Suiza', de: 'Schweiz', pt: 'Suíça', ru: 'Швейцария', zh: '瑞士', ar: 'سويسرا', hi: 'स्विट्ज़रलैंड' },
  { code: 'SR', phoneCode: '+597', fr: 'Suriname', en: 'Suriname', es: 'Surinam', de: 'Suriname', pt: 'Suriname', ru: 'Суринам', zh: '苏里南', ar: 'سورينام', hi: 'सूरीनाम' },
  { code: 'SY', phoneCode: '+963', fr: 'Syrie', en: 'Syria', es: 'Siria', de: 'Syrien', pt: 'Síria', ru: 'Сирия', zh: '叙利亚', ar: 'سوريا', hi: 'सीरिया' },

  // T
  { code: 'TJ', phoneCode: '+992', fr: 'Tadjikistan', en: 'Tajikistan', es: 'Tayikistán', de: 'Tadschikistan', pt: 'Tajiquistão', ru: 'Таджикистан', zh: '塔吉克斯坦', ar: 'طاجيكستان', hi: 'ताजिकिस्तान' },
  { code: 'TW', phoneCode: '+886', fr: 'Taïwan', en: 'Taiwan', es: 'Taiwán', de: 'Taiwan', pt: 'Taiwan', ru: 'Тайвань', zh: '台湾', ar: 'تايوان', hi: 'ताइवान' },
  { code: 'TZ', phoneCode: '+255', fr: 'Tanzanie', en: 'Tanzania', es: 'Tanzania', de: 'Tansania', pt: 'Tanzânia', ru: 'Танзания', zh: '坦桑尼亚', ar: 'تنزانيا', hi: 'तंज़ानिया' },
  { code: 'TD', phoneCode: '+235', fr: 'Tchad', en: 'Chad', es: 'Chad', de: 'Tschad', pt: 'Chade', ru: 'Чад', zh: '乍得', ar: 'تشاد', hi: 'चाड' },
  { code: 'TH', phoneCode: '+66', fr: 'Thaïlande', en: 'Thailand', es: 'Tailandia', de: 'Thailand', pt: 'Tailândia', ru: 'Таиланд', zh: '泰国', ar: 'تايلاند', hi: 'थाईलैंड' },
  { code: 'TL', phoneCode: '+670', fr: 'Timor oriental', en: 'Timor-Leste', es: 'Timor Oriental', de: 'Osttimor', pt: 'Timor-Leste', ru: 'Восточный Тимор', zh: '东帝汶', ar: 'تيمور الشرقية', hi: 'पूर्वी तिमोर' },
  { code: 'TG', phoneCode: '+228', fr: 'Togo', en: 'Togo', es: 'Togo', de: 'Togo', pt: 'Togo', ru: 'Того', zh: '多哥', ar: 'توغو', hi: 'टोगो' },
  { code: 'TO', phoneCode: '+676', fr: 'Tonga', en: 'Tonga', es: 'Tonga', de: 'Tonga', pt: 'Tonga', ru: 'Тонга', zh: '汤加', ar: 'تونغا', hi: 'टोंगा' },
  { code: 'TT', phoneCode: '+1868', fr: 'Trinité-et-Tobago', en: 'Trinidad and Tobago', es: 'Trinidad y Tobago', de: 'Trinidad und Tobago', pt: 'Trinidad e Tobago', ru: 'Тринидад и Тобаго', zh: '特立尼达和多巴哥', ar: 'ترينيداد وتوباغو', hi: 'त्रिनिदाद और टोबैगो' },
  { code: 'TN', phoneCode: '+216', fr: 'Tunisie', en: 'Tunisia', es: 'Túnez', de: 'Tunesien', pt: 'Tunísia', ru: 'Тунис', zh: '突尼斯', ar: 'تونس', hi: 'ट्यूनीशिया' },
  { code: 'TM', phoneCode: '+993', fr: 'Turkménistan', en: 'Turkmenistan', es: 'Turkmenistán', de: 'Turkmenistan', pt: 'Turquemenistão', ru: 'Туркменистан', zh: '土库曼斯坦', ar: 'تركمانستان', hi: 'तुर्कमेनिस्तान' },
  { code: 'TR', phoneCode: '+90', fr: 'Turquie', en: 'Turkey', es: 'Turquía', de: 'Türkei', pt: 'Turquia', ru: 'Турция', zh: '土耳其', ar: 'تركيا', hi: 'तुर्की' },
  { code: 'TV', phoneCode: '+688', fr: 'Tuvalu', en: 'Tuvalu', es: 'Tuvalu', de: 'Tuvalu', pt: 'Tuvalu', ru: 'Тувалу', zh: '图瓦卢', ar: 'توفالو', hi: 'टुवालु' },

  // U
  { code: 'UA', phoneCode: '+380', fr: 'Ukraine', en: 'Ukraine', es: 'Ucrania', de: 'Ukraine', pt: 'Ucrânia', ru: 'Украина', zh: '乌克兰', ar: 'أوكرانيا', hi: 'यूक्रेन' },
  { code: 'UY', phoneCode: '+598', fr: 'Uruguay', en: 'Uruguay', es: 'Uruguay', de: 'Uruguay', pt: 'Uruguai', ru: 'Уругвай', zh: '乌拉圭', ar: 'أوروغواي', hi: 'उरुग्वे' },

  // V
  { code: 'VU', phoneCode: '+678', fr: 'Vanuatu', en: 'Vanuatu', es: 'Vanuatu', de: 'Vanuatu', pt: 'Vanuatu', ru: 'Вануату', zh: '瓦努阿图', ar: 'فانواتو', hi: 'वानुअतु' },
  { code: 'VA', phoneCode: '+379', fr: 'Vatican', en: 'Vatican City', es: 'Ciudad del Vaticano', de: 'Vatikanstadt', pt: 'Vaticano', ru: 'Ватикан', zh: '梵蒂冈', ar: 'الفاتيكان', hi: 'वेटिकन' },
  { code: 'VE', phoneCode: '+58', fr: 'Venezuela', en: 'Venezuela', es: 'Venezuela', de: 'Venezuela', pt: 'Venezuela', ru: 'Венесуэла', zh: '委内瑞拉', ar: 'فنزويلا', hi: 'वेनेज़ुएला' },
  { code: 'VN', phoneCode: '+84', fr: 'Vietnam', en: 'Vietnam', es: 'Vietnam', de: 'Vietnam', pt: 'Vietnã', ru: 'Вьетнам', zh: '越南', ar: 'فيتنام', hi: 'वियतनाम' },

  // Y
  { code: 'YE', phoneCode: '+967', fr: 'Yémen', en: 'Yemen', es: 'Yemen', de: 'Jemen', pt: 'Iêmen', ru: 'Йемен', zh: '也门', ar: 'اليمن', hi: 'यमन' },

  // Z
  { code: 'ZM', phoneCode: '+260', fr: 'Zambie', en: 'Zambia', es: 'Zambia', de: 'Sambia', pt: 'Zâmbia', ru: 'Замбия', zh: '赞比亚', ar: 'زامبيا', hi: 'ज़ाम्बिया' },
  { code: 'ZW', phoneCode: '+263', fr: 'Zimbabwe', en: 'Zimbabwe', es: 'Zimbabue', de: 'Simbabwe', pt: 'Zimbábue', ru: 'Зимбабве', zh: '津巴布韦', ar: 'زيمبابوي', hi: 'ज़िम्बाब्वे' },
];

export default phoneCodesData;
