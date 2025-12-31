/**
 * Script utilisant Firebase Web SDK (pas Admin SDK)
 * Fonctionne sans gcloud auth
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, addDoc, serverTimestamp, Timestamp } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

// Configuration Firebase (depuis votre .env)
const firebaseConfig = {
  apiKey: "AIzaSyCLp02v_ywBw67d4VD7rQ2tCQUdKp83CT8",
  authDomain: "sos-urgently-ac307.firebaseapp.com",
  projectId: "sos-urgently-ac307",
  storageBucket: "sos-urgently-ac307.appspot.com",
  messagingSenderId: "268195823113",
  appId: "1:268195823113:web:10bf2e5bacdc1816f182d8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// =============================================================================
// TOUS LES 196 PAYS
// =============================================================================

const ALL_COUNTRIES = [
  { code: 'GB', name: 'Royaume-Uni' }, { code: 'FR', name: 'France' }, { code: 'DE', name: 'Allemagne' },
  { code: 'ES', name: 'Espagne' }, { code: 'RU', name: 'Russie' }, { code: 'CN', name: 'Chine' },
  { code: 'AF', name: 'Afghanistan' }, { code: 'AL', name: 'Albanie' }, { code: 'DZ', name: 'Algérie' },
  { code: 'AD', name: 'Andorre' }, { code: 'AO', name: 'Angola' }, { code: 'AG', name: 'Antigua-et-Barbuda' },
  { code: 'AR', name: 'Argentine' }, { code: 'AM', name: 'Arménie' }, { code: 'AU', name: 'Australie' },
  { code: 'AT', name: 'Autriche' }, { code: 'AZ', name: 'Azerbaïdjan' }, { code: 'BS', name: 'Bahamas' },
  { code: 'BH', name: 'Bahreïn' }, { code: 'BD', name: 'Bangladesh' }, { code: 'BB', name: 'Barbade' },
  { code: 'BY', name: 'Biélorussie' }, { code: 'BE', name: 'Belgique' }, { code: 'BZ', name: 'Belize' },
  { code: 'BJ', name: 'Bénin' }, { code: 'BT', name: 'Bhoutan' }, { code: 'BO', name: 'Bolivie' },
  { code: 'BA', name: 'Bosnie-Herzégovine' }, { code: 'BW', name: 'Botswana' }, { code: 'BR', name: 'Brésil' },
  { code: 'BN', name: 'Brunéi' }, { code: 'BG', name: 'Bulgarie' }, { code: 'BF', name: 'Burkina Faso' },
  { code: 'BI', name: 'Burundi' }, { code: 'CV', name: 'Cap-Vert' }, { code: 'KH', name: 'Cambodge' },
  { code: 'CM', name: 'Cameroun' }, { code: 'CA', name: 'Canada' }, { code: 'CF', name: 'Centrafrique' },
  { code: 'TD', name: 'Tchad' }, { code: 'CL', name: 'Chili' }, { code: 'CO', name: 'Colombie' },
  { code: 'KM', name: 'Comores' }, { code: 'CG', name: 'Congo' }, { code: 'CD', name: 'RD Congo' },
  { code: 'CR', name: 'Costa Rica' }, { code: 'CI', name: "Côte d'Ivoire" }, { code: 'HR', name: 'Croatie' },
  { code: 'CU', name: 'Cuba' }, { code: 'CY', name: 'Chypre' }, { code: 'CZ', name: 'Tchéquie' },
  { code: 'DK', name: 'Danemark' }, { code: 'DJ', name: 'Djibouti' }, { code: 'DM', name: 'Dominique' },
  { code: 'DO', name: 'République dominicaine' }, { code: 'EC', name: 'Équateur' }, { code: 'EG', name: 'Égypte' },
  { code: 'SV', name: 'Salvador' }, { code: 'GQ', name: 'Guinée équatoriale' }, { code: 'ER', name: 'Érythrée' },
  { code: 'EE', name: 'Estonie' }, { code: 'SZ', name: 'Eswatini' }, { code: 'ET', name: 'Éthiopie' },
  { code: 'FJ', name: 'Fidji' }, { code: 'FI', name: 'Finlande' }, { code: 'GA', name: 'Gabon' },
  { code: 'GM', name: 'Gambie' }, { code: 'GE', name: 'Géorgie' }, { code: 'GH', name: 'Ghana' },
  { code: 'GR', name: 'Grèce' }, { code: 'GD', name: 'Grenade' }, { code: 'GT', name: 'Guatemala' },
  { code: 'GN', name: 'Guinée' }, { code: 'GW', name: 'Guinée-Bissau' }, { code: 'GY', name: 'Guyana' },
  { code: 'HT', name: 'Haïti' }, { code: 'HN', name: 'Honduras' }, { code: 'HU', name: 'Hongrie' },
  { code: 'IS', name: 'Islande' }, { code: 'IN', name: 'Inde' }, { code: 'ID', name: 'Indonésie' },
  { code: 'IR', name: 'Iran' }, { code: 'IQ', name: 'Irak' }, { code: 'IE', name: 'Irlande' },
  { code: 'IL', name: 'Israël' }, { code: 'IT', name: 'Italie' }, { code: 'JM', name: 'Jamaïque' },
  { code: 'JP', name: 'Japon' }, { code: 'JO', name: 'Jordanie' }, { code: 'KZ', name: 'Kazakhstan' },
  { code: 'KE', name: 'Kenya' }, { code: 'KI', name: 'Kiribati' }, { code: 'KP', name: 'Corée du Nord' },
  { code: 'KR', name: 'Corée du Sud' }, { code: 'KW', name: 'Koweït' }, { code: 'KG', name: 'Kirghizistan' },
  { code: 'LA', name: 'Laos' }, { code: 'LV', name: 'Lettonie' }, { code: 'LB', name: 'Liban' },
  { code: 'LS', name: 'Lesotho' }, { code: 'LR', name: 'Libéria' }, { code: 'LY', name: 'Libye' },
  { code: 'LI', name: 'Liechtenstein' }, { code: 'LT', name: 'Lituanie' }, { code: 'LU', name: 'Luxembourg' },
  { code: 'MG', name: 'Madagascar' }, { code: 'MW', name: 'Malawi' }, { code: 'MY', name: 'Malaisie' },
  { code: 'MV', name: 'Maldives' }, { code: 'ML', name: 'Mali' }, { code: 'MT', name: 'Malte' },
  { code: 'MH', name: 'Îles Marshall' }, { code: 'MR', name: 'Mauritanie' }, { code: 'MU', name: 'Maurice' },
  { code: 'MX', name: 'Mexique' }, { code: 'FM', name: 'Micronésie' }, { code: 'MD', name: 'Moldavie' },
  { code: 'MC', name: 'Monaco' }, { code: 'MN', name: 'Mongolie' }, { code: 'ME', name: 'Monténégro' },
  { code: 'MA', name: 'Maroc' }, { code: 'MZ', name: 'Mozambique' }, { code: 'MM', name: 'Myanmar' },
  { code: 'NA', name: 'Namibie' }, { code: 'NR', name: 'Nauru' }, { code: 'NP', name: 'Népal' },
  { code: 'NL', name: 'Pays-Bas' }, { code: 'NZ', name: 'Nouvelle-Zélande' }, { code: 'NI', name: 'Nicaragua' },
  { code: 'NE', name: 'Niger' }, { code: 'NG', name: 'Nigeria' }, { code: 'MK', name: 'Macédoine du Nord' },
  { code: 'NO', name: 'Norvège' }, { code: 'OM', name: 'Oman' }, { code: 'PK', name: 'Pakistan' },
  { code: 'PW', name: 'Palaos' }, { code: 'PS', name: 'Palestine' }, { code: 'PA', name: 'Panama' },
  { code: 'PG', name: 'Papouasie-Nouvelle-Guinée' }, { code: 'PY', name: 'Paraguay' }, { code: 'PE', name: 'Pérou' },
  { code: 'PH', name: 'Philippines' }, { code: 'PL', name: 'Pologne' }, { code: 'PT', name: 'Portugal' },
  { code: 'QA', name: 'Qatar' }, { code: 'RO', name: 'Roumanie' }, { code: 'RW', name: 'Rwanda' },
  { code: 'KN', name: 'Saint-Kitts-et-Nevis' }, { code: 'LC', name: 'Sainte-Lucie' }, { code: 'VC', name: 'Saint-Vincent' },
  { code: 'WS', name: 'Samoa' }, { code: 'SM', name: 'Saint-Marin' }, { code: 'ST', name: 'Sao Tomé-et-Príncipe' },
  { code: 'SA', name: 'Arabie saoudite' }, { code: 'SN', name: 'Sénégal' }, { code: 'RS', name: 'Serbie' },
  { code: 'SC', name: 'Seychelles' }, { code: 'SL', name: 'Sierra Leone' }, { code: 'SG', name: 'Singapour' },
  { code: 'SK', name: 'Slovaquie' }, { code: 'SI', name: 'Slovénie' }, { code: 'SB', name: 'Îles Salomon' },
  { code: 'SO', name: 'Somalie' }, { code: 'ZA', name: 'Afrique du Sud' }, { code: 'SS', name: 'Soudan du Sud' },
  { code: 'LK', name: 'Sri Lanka' }, { code: 'SD', name: 'Soudan' }, { code: 'SR', name: 'Suriname' },
  { code: 'SE', name: 'Suède' }, { code: 'CH', name: 'Suisse' }, { code: 'SY', name: 'Syrie' },
  { code: 'TW', name: 'Taïwan' }, { code: 'TJ', name: 'Tadjikistan' }, { code: 'TZ', name: 'Tanzanie' },
  { code: 'TH', name: 'Thaïlande' }, { code: 'TL', name: 'Timor oriental' }, { code: 'TG', name: 'Togo' },
  { code: 'TO', name: 'Tonga' }, { code: 'TT', name: 'Trinité-et-Tobago' }, { code: 'TN', name: 'Tunisie' },
  { code: 'TR', name: 'Turquie' }, { code: 'TM', name: 'Turkménistan' }, { code: 'TV', name: 'Tuvalu' },
  { code: 'UG', name: 'Ouganda' }, { code: 'UA', name: 'Ukraine' }, { code: 'AE', name: 'Émirats arabes unis' },
  { code: 'US', name: 'États-Unis' }, { code: 'UY', name: 'Uruguay' }, { code: 'UZ', name: 'Ouzbékistan' },
  { code: 'VU', name: 'Vanuatu' }, { code: 'VA', name: 'Vatican' }, { code: 'VE', name: 'Venezuela' },
  { code: 'VN', name: 'Vietnam' }, { code: 'YE', name: 'Yémen' }, { code: 'ZM', name: 'Zambie' },
  { code: 'ZW', name: 'Zimbabwe' }
];

// =============================================================================
// NOMS PAR RÉGION - HOMMES UNIQUEMENT
// =============================================================================

const NAMES_FR = { male: ['Jean', 'Pierre', 'Michel', 'Philippe', 'Thomas', 'Nicolas', 'François', 'Laurent', 'Éric', 'David', 'Stéphane', 'Olivier', 'Christophe', 'Frédéric', 'Patrick', 'Antoine', 'Julien', 'Alexandre', 'Sébastien', 'Vincent'], lastNames: ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia'] };
const NAMES_DE = { male: ['Hans', 'Peter', 'Wolfgang', 'Klaus', 'Michael', 'Thomas', 'Andreas', 'Stefan', 'Christian', 'Martin', 'Markus', 'Alexander', 'Sebastian', 'Tobias', 'Matthias'], lastNames: ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann'] };
const NAMES_ES = { male: ['Antonio', 'José', 'Manuel', 'Francisco', 'Juan', 'David', 'Carlos', 'Miguel', 'Pedro', 'Alejandro', 'Fernando', 'Pablo', 'Jorge', 'Luis', 'Sergio'], lastNames: ['García', 'Rodríguez', 'González', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Martín'] };
const NAMES_IT = { male: ['Marco', 'Luca', 'Giuseppe', 'Francesco', 'Antonio', 'Matteo', 'Alessandro', 'Andrea', 'Stefano', 'Paolo', 'Giovanni', 'Lorenzo', 'Davide', 'Simone', 'Federico'], lastNames: ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco'] };
const NAMES_EN = { male: ['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Christopher', 'Charles', 'Daniel', 'Matthew', 'Anthony', 'Mark'], lastNames: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'] };
const NAMES_PT = { male: ['José', 'João', 'Antonio', 'Francisco', 'Carlos', 'Paulo', 'Pedro', 'Lucas', 'Luiz', 'Marcos', 'Gabriel', 'Rafael', 'Daniel', 'Marcelo', 'Bruno'], lastNames: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes'] };
const NAMES_AFRICA_FR = { male: ['Moussa', 'Ibrahim', 'Abdoulaye', 'Ousmane', 'Cheikh', 'Mamadou', 'Amadou', 'Issa', 'Aliou', 'Souleymane', 'Ibrahima', 'Seydou', 'Modou', 'Lamine', 'Boubacar'], lastNames: ['Diop', 'Ba', 'Ndiaye', 'Traoré', 'Diallo', 'Koné', 'Sy', 'Sarr', 'Cissé', 'Camara'] };
const NAMES_AFRICA_EN = { male: ['John', 'Michael', 'Samuel', 'David', 'Peter', 'Daniel', 'Joseph', 'Paul', 'Emmanuel', 'James', 'Isaac', 'Moses', 'Solomon', 'Joshua', 'Benjamin'], lastNames: ['Mensah', 'Okafor', 'Abebe', 'Kamau', 'Okoro', 'Mwangi', 'Ochieng', 'Mutua', 'Nkrumah', 'Adeyemi'] };
const NAMES_MA = { male: ['Mohamed', 'Ahmed', 'Ali', 'Hassan', 'Omar', 'Youssef', 'Khalid', 'Said', 'Rachid', 'Abdelaziz', 'Karim', 'Amine', 'Hamza', 'Mehdi', 'Nabil'], lastNames: ['Alami', 'Benjelloun', 'El Amrani', 'Bennis', 'Cherkaoui', 'Idrissi', 'Tazi', 'Fassi', 'El Mansouri', 'Bennani'] };
const NAMES_CN = { male: ['Wei', 'Ming', 'Jun', 'Feng', 'Lei', 'Bo', 'Jian', 'Peng', 'Yang', 'Hao', 'Tao', 'Gang', 'Qiang', 'Long', 'Bin'], lastNames: ['Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Huang', 'Zhao', 'Wu', 'Zhou'] };
const NAMES_JP = { male: ['Hiroshi', 'Takeshi', 'Kenji', 'Yuki', 'Taro', 'Koji', 'Masao', 'Akira', 'Satoshi', 'Kazuo', 'Makoto', 'Takashi', 'Daisuke', 'Yusuke', 'Masahiro'], lastNames: ['Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Kato'] };
const NAMES_IN = { male: ['Raj', 'Amit', 'Rahul', 'Arun', 'Vijay', 'Suresh', 'Ravi', 'Sanjay', 'Anand', 'Ashok', 'Rajesh', 'Manoj', 'Santosh', 'Deepak', 'Ajay'], lastNames: ['Patel', 'Kumar', 'Singh', 'Sharma', 'Shah', 'Gupta', 'Reddy', 'Iyer', 'Nair', 'Rao'] };
const NAMES_SLAVIC = { male: ['Ivan', 'Oleg', 'Dmitri', 'Sergei', 'Alexei', 'Nikolai', 'Andrei', 'Vladimir', 'Yuri', 'Mikhail', 'Pavel', 'Boris', 'Viktor', 'Konstantin', 'Evgeny'], lastNames: ['Ivanov', 'Petrov', 'Sidorov', 'Smirnov', 'Kuznetsov', 'Popov', 'Sokolov', 'Orlov', 'Volkov', 'Fedorov'] };
const NAMES_TURKIC = { male: ['Mehmet', 'Ahmet', 'Mustafa', 'Ali', 'Murat', 'Okan', 'Hakan', 'Yusuf', 'Emre', 'Burak', 'Kemal', 'Cem', 'Can', 'Serkan', 'Fatih'], lastNames: ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Yıldırım', 'Aydın', 'Öztürk', 'Arslan'] };
const NAMES_SE_ASIA = { male: ['Somchai', 'Somsak', 'Sompong', 'Wichai', 'Niran', 'Kitti', 'Prasert', 'Surachai', 'Thana', 'Amnuay', 'Chaiwat', 'Suchart', 'Somboon', 'Pongpat', 'Anucha'], lastNames: ['Saetang', 'Chokchai', 'Rattana', 'Siriwan', 'Prasert', 'Niran', 'Chaiyaporn', 'Somchai', 'Wichai', 'Thana'] };
const NAMES_KOREAN = { male: ['Min-jun', 'Seo-joon', 'Ji-hoon', 'Jae-won', 'Hyun-woo', 'Dong-hyun', 'Sung-min', 'Jong-ho', 'Young-soo', 'Tae-hyun', 'Jin-woo', 'Seung-ho', 'Sang-woo', 'Joon-ho', 'Min-ho'], lastNames: ['Kim', 'Lee', 'Park', 'Choi', 'Jung', 'Kang', 'Cho', 'Yoon', 'Jang', 'Lim'] };
const NAMES_VIET = { male: ['Anh', 'Minh', 'Quang', 'Huy', 'Tuan', 'Duc', 'Nam', 'Phong', 'Khanh', 'Long', 'Hai', 'Hung', 'Dung', 'Cuong', 'Tan'], lastNames: ['Nguyen', 'Tran', 'Le', 'Pham', 'Hoang', 'Huynh', 'Vu', 'Vo', 'Dang', 'Bui'] };
const NAMES_INDONESIA = { male: ['Agus', 'Budi', 'Joko', 'Hendra', 'Rizky', 'Andi', 'Yudi', 'Fajar', 'Dedi', 'Imam', 'Wahyu', 'Dwi', 'Eko', 'Bambang', 'Ahmad'], lastNames: ['Pratama', 'Saputra', 'Santoso', 'Wijaya', 'Hidayat', 'Kurniawan', 'Setiawan', 'Nugroho', 'Siregar', 'Gunawan'] };
const NAMES_NORDIC = { male: ['Lars', 'Ola', 'Erik', 'Mikael', 'Jonas', 'Henrik', 'Anders', 'Nils', 'Per', 'Ole', 'Jan', 'Magnus', 'Tor', 'Gunnar', 'Rune'], lastNames: ['Johansson', 'Andersen', 'Hansen', 'Larsen', 'Nielsen', 'Berg', 'Lund', 'Haug', 'Olsen', 'Persson'] };
const NAMES_PERSIAN = { male: ['Ali', 'Hassan', 'Reza', 'Hossein', 'Mahmoud', 'Farid', 'Omid', 'Saeed', 'Amir', 'Javad', 'Mohammad', 'Ahmad', 'Mehdi', 'Abbas', 'Majid'], lastNames: ['Hosseini', 'Rezai', 'Rahimi', 'Karimi', 'Ahmadi', 'Jafari', 'Moradi', 'Farhadi', 'Ebrahimi', 'Nasseri'] };
const NAMES_HEBREW = { male: ['David', 'Yosef', 'Moshe', 'Avi', 'Yaakov', 'Yehuda', 'Noam', 'Alon', 'Eitan', 'Yair', 'Daniel', 'Uri', 'Ariel', 'Yuval', 'Omri'], lastNames: ['Cohen', 'Levi', 'Mizrahi', 'Biton', 'Goldstein', 'Katz', 'Azoulay', 'Ohayon', 'Peretz', 'Ben-David'] };

function getNamesByCountryCode(code) {
  const FR_COUNTRIES = ['FR', 'BE', 'LU', 'MC', 'HT', 'CH'];
  const DE_COUNTRIES = ['DE', 'AT', 'LI'];
  const ES_COUNTRIES = ['ES', 'AD', 'MX', 'GT', 'HN', 'SV', 'NI', 'CR', 'PA', 'CU', 'DO', 'CO', 'VE', 'EC', 'PE', 'BO', 'PY', 'CL', 'AR', 'UY'];
  const IT_COUNTRIES = ['IT', 'SM', 'VA', 'MT'];
  const PT_COUNTRIES = ['PT', 'BR', 'AO', 'MZ', 'CV', 'GW', 'ST', 'TL'];
  const EN_COUNTRIES = ['GB', 'IE', 'US', 'CA', 'AU', 'NZ', 'JM', 'TT', 'BB', 'BS', 'GY', 'BZ', 'AG', 'DM', 'GD', 'KN', 'LC', 'VC', 'CY'];
  const AFRICA_FR_COUNTRIES = ['SN', 'ML', 'CI', 'BF', 'NE', 'TG', 'BJ', 'GN', 'CM', 'CF', 'TD', 'CG', 'CD', 'GA', 'DJ', 'KM', 'MG', 'MR', 'RW', 'BI', 'GQ'];
  const AFRICA_EN_COUNTRIES = ['NG', 'GH', 'KE', 'TZ', 'UG', 'ZA', 'ZW', 'ZM', 'BW', 'NA', 'MW', 'LS', 'SZ', 'ET', 'ER', 'SS', 'SD', 'SO', 'GM', 'SL', 'LR', 'SC', 'MU'];
  const MA_COUNTRIES = ['MA', 'DZ', 'TN', 'LY', 'EG', 'SA', 'AE', 'QA', 'KW', 'BH', 'OM', 'YE', 'JO', 'LB', 'SY', 'IQ', 'PS'];
  const CN_COUNTRIES = ['CN', 'TW', 'SG'];
  const JP_COUNTRIES = ['JP'];
  const IN_COUNTRIES = ['IN', 'BD', 'NP', 'LK', 'MV', 'PK', 'BT'];
  const SLAVIC_COUNTRIES = ['RU', 'UA', 'BY', 'PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'RS', 'HR', 'SI', 'BA', 'ME', 'MK', 'AL', 'MD', 'EE', 'LV', 'LT', 'GE', 'AM', 'AZ'];
  const TURKIC_COUNTRIES = ['TR', 'KZ', 'UZ', 'TM', 'KG', 'TJ'];
  const SE_ASIA_COUNTRIES = ['TH', 'MM', 'LA', 'KH'];
  const KOREAN_COUNTRIES = ['KR', 'KP'];
  const VIET_COUNTRIES = ['VN'];
  const INDONESIA_COUNTRIES = ['ID', 'MY', 'BN', 'PH'];
  const NORDIC_COUNTRIES = ['NO', 'SE', 'DK', 'FI', 'IS', 'NL'];
  const PERSIAN_COUNTRIES = ['IR', 'AF'];
  const HEBREW_COUNTRIES = ['IL'];

  if (FR_COUNTRIES.includes(code)) return NAMES_FR;
  if (DE_COUNTRIES.includes(code)) return NAMES_DE;
  if (ES_COUNTRIES.includes(code)) return NAMES_ES;
  if (IT_COUNTRIES.includes(code)) return NAMES_IT;
  if (PT_COUNTRIES.includes(code)) return NAMES_PT;
  if (EN_COUNTRIES.includes(code)) return NAMES_EN;
  if (AFRICA_FR_COUNTRIES.includes(code)) return NAMES_AFRICA_FR;
  if (AFRICA_EN_COUNTRIES.includes(code)) return NAMES_AFRICA_EN;
  if (MA_COUNTRIES.includes(code)) return NAMES_MA;
  if (CN_COUNTRIES.includes(code)) return NAMES_CN;
  if (JP_COUNTRIES.includes(code)) return NAMES_JP;
  if (IN_COUNTRIES.includes(code)) return NAMES_IN;
  if (SLAVIC_COUNTRIES.includes(code)) return NAMES_SLAVIC;
  if (TURKIC_COUNTRIES.includes(code)) return NAMES_TURKIC;
  if (SE_ASIA_COUNTRIES.includes(code)) return NAMES_SE_ASIA;
  if (KOREAN_COUNTRIES.includes(code)) return NAMES_KOREAN;
  if (VIET_COUNTRIES.includes(code)) return NAMES_VIET;
  if (INDONESIA_COUNTRIES.includes(code)) return NAMES_INDONESIA;
  if (NORDIC_COUNTRIES.includes(code)) return NAMES_NORDIC;
  if (PERSIAN_COUNTRIES.includes(code)) return NAMES_PERSIAN;
  if (HEBREW_COUNTRIES.includes(code)) return NAMES_HEBREW;
  return NAMES_EN;
}

// =============================================================================
// DONNÉES
// =============================================================================

const LAWYER_SPECIALTIES = [
  'URG_ASSISTANCE_PENALE_INTERNATIONALE', 'URG_GARDE_A_VUE_ETRANGER', 'URG_EXPULSION_URGENTE',
  'VIS_VISA_TRAVAIL', 'VIS_VISA_ENTREPRENEUR', 'VIS_VISA_INVESTISSEUR', 'VIS_VISA_ETUDIANT',
  'VIS_REGROUPEMENT_FAMILIAL', 'VIS_NATURALISATION', 'VIS_CARTE_SEJOUR', 'VIS_ASILE_REFUGIES',
  'DRT_DROIT_TRAVAIL_INTERNATIONAL', 'DRT_CONTRATS_TRAVAIL_ETRANGERS', 'DRT_LICENCIEMENT_ETRANGER',
  'FAM_DIVORCE_INTERNATIONAL', 'FAM_GARDE_ENFANTS_INTERNATIONALE', 'FAM_PENSION_ALIMENTAIRE',
];

const CERTIFICATIONS = ['certified-bar', 'international-law', 'mediator', 'business-law', 'family-law', 'tax-law', 'immigration'];

const BIO_TEMPLATES = [
  "Fort de {exp} années d'expérience en droit international, je conseille les expatriés francophones. Basé en {pays}, j'interviens également dans {autres_pays}.",
  "Avocat inscrit au barreau depuis {exp} ans, je me consacre aux problématiques juridiques des Français à l'étranger. Depuis {pays}, j'accompagne mes clients dans {autres_pays}.",
  "Passionné par le droit international, j'exerce depuis {exp} ans. Installé en {pays}, j'interviens aussi dans {autres_pays}.",
  "Après {exp} ans de pratique juridique, j'ai développé une expertise pointue. Basé en {pays}, je couvre également {autres_pays}.",
  "Spécialiste du droit des expatriés depuis {exp} ans. De {pays}, j'interviens dans {autres_pays}.",
];

const REVIEW_COMMENTS = [
  "Excellent avocat, très professionnel.",
  "Conseils juridiques de qualité exceptionnelle.",
  "Très satisfait de ses services, réponse rapide.",
  "Expertise remarquable en droit international.",
  "Un professionnel dévoué et compétent.",
  "Service impeccable, communication claire.",
  "Avocat très compétent, je recommande.",
  "Professionnalisme exemplaire.",
  "Excellent suivi de dossier.",
  "Ses conseils m'ont été très précieux.",
  "Grande expertise juridique.",
  "Très bonne expérience, je recommande.",
  "Avocat sérieux et rigoureux.",
  "Pédagogue et patient.",
  "A su gérer mon dossier avec brio.",
];

// =============================================================================
// UTILITAIRES
// =============================================================================

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomDateBetween = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
const randomRating = () => parseFloat((4.0 + Math.random() * 1.0).toFixed(2));
const slugify = (str) => str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

// =============================================================================
// FONCTION PRINCIPALE
// =============================================================================

async function main() {
  console.log('='.repeat(70));
  console.log(' GÉNÉRATION D\'AVOCATS - 197 PAYS');
  console.log('='.repeat(70));

  // Récupérer email et mot de passe depuis les arguments
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.log('\nUsage: node generate-lawyers-firebase-sdk.js EMAIL PASSWORD');
    console.log('Exemple: node generate-lawyers-firebase-sdk.js williamsjullin@gmail.com MonMotDePasse');
    process.exit(1);
  }

  console.log(`\n🔐 Connexion avec ${email}...`);

  try {
    await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ Connecté avec succès!\n');
  } catch (err) {
    console.error('❌ Erreur de connexion:', err.message);
    process.exit(1);
  }

  const START_DATE = new Date('2024-10-01');
  const END_DATE = new Date('2024-12-30');
  const TODAY = new Date();

  const shuffledCountries = shuffle(ALL_COUNTRIES);
  console.log(`🌍 ${shuffledCountries.length} pays à couvrir\n`);

  // Distribuer les pays
  const profiles = [];
  let countryIndex = 0;
  while (countryIndex < shuffledCountries.length) {
    const numCountries = randomInt(1, 5);
    const assignedCountries = shuffledCountries.slice(countryIndex, countryIndex + numCountries);
    countryIndex += numCountries;
    if (assignedCountries.length === 0) break;
    profiles.push({ mainCountry: assignedCountries[0], allCountries: assignedCountries, otherCountries: assignedCountries.slice(1) });
  }

  console.log(`👤 ${profiles.length} avocats à générer\n`);

  let success = 0, errors = 0;

  for (let i = 0; i < profiles.length; i++) {
    const profile = profiles[i];
    const mainCountry = profile.mainCountry;

    try {
      const namesData = getNamesByCountryCode(mainCountry.code);
      const firstName = randomChoice(namesData.male);
      const lastName = randomChoice(namesData.lastNames);
      const fullName = `${firstName} ${lastName}`;
      const email = `${slugify(firstName)}.${slugify(lastName)}@example.com`;
      const uid = `aaa_lawyer_${mainCountry.code.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const createdAt = randomDateBetween(START_DATE, END_DATE);
      const experience = randomInt(3, 30);
      const specialties = shuffle(LAWYER_SPECIALTIES).slice(0, randomInt(2, 5));
      const certifications = shuffle(CERTIFICATIONS).slice(0, randomInt(1, 3));
      const daysSinceCreation = Math.max(1, Math.floor((TODAY - createdAt) / (1000 * 60 * 60 * 24)));
      const totalCalls = randomInt(0, daysSinceCreation / 7 * 3);
      const reviewCount = Math.floor(totalCalls * 0.4);
      const rating = randomRating();
      const practiceCountryCodes = profile.allCountries.map(c => c.code);

      const bioTemplate = randomChoice(BIO_TEMPLATES);
      const otherCountriesText = profile.otherCountries.length > 0 ? profile.otherCountries.map(c => c.name).join(', ') : 'plusieurs régions';
      const bio = bioTemplate.replace(/{exp}/g, experience).replace(/{pays}/g, mainCountry.name).replace(/{autres_pays}/g, otherCountriesText);

      let price = randomInt(39, 89);
      if (['FR', 'US', 'GB', 'CH', 'DE'].includes(mainCountry.code)) price = randomInt(59, 99);
      if (['SN', 'ML', 'CI', 'CM'].includes(mainCountry.code)) price = randomInt(29, 49);

      const profileData = {
        uid, firstName, lastName, fullName, email,
        phone: '+33600000000',
        country: mainCountry.code, currentCountry: mainCountry.code,
        preferredLanguage: 'fr',
        languages: ['fr'],
        languagesSpoken: ['Français'],
        profilePhoto: '', avatar: '',
        isTestProfile: true, isActive: true, isApproved: true, isVerified: true,
        approvalStatus: 'approved', verificationStatus: 'approved',
        isOnline: Math.random() > 0.7,
        isVisible: true, isVisibleOnMap: true, isCallable: true,
        createdAt: Timestamp.fromDate(createdAt),
        updatedAt: serverTimestamp(),
        role: 'lawyer', type: 'lawyer', isSOS: true,
        bio: { fr: bio, en: bio },
        responseTime: randomChoice(['< 5 minutes', '< 15 minutes', '< 30 minutes']),
        availability: 'available',
        totalCalls, rating, reviewCount,
        price, duration: randomChoice([15, 20, 30]),
        specialties, practiceCountries: practiceCountryCodes,
        yearsOfExperience: experience,
        barNumber: `BAR-${mainCountry.code}-${randomInt(10000, 99999)}`,
        certifications,
      };

      await setDoc(doc(db, 'users', uid), profileData);
      await setDoc(doc(db, 'sos_profiles', uid), { ...profileData, createdByAdmin: true, profileCompleted: true });
      await setDoc(doc(db, 'ui_profile_cards', uid), {
        id: uid, uid, title: fullName, subtitle: 'Avocat',
        country: mainCountry.name, photo: '', rating, reviewCount,
        languages: ['Français'], specialties,
        href: `/profile/${uid}`, createdAt: serverTimestamp(),
      });

      // Avis
      for (let j = 0; j < Math.min(reviewCount, 5); j++) {
        const reviewDate = new Date(createdAt.getTime() + (j / Math.max(1, reviewCount)) * daysSinceCreation * 24 * 60 * 60 * 1000);
        const clientCountry = randomChoice(ALL_COUNTRIES);
        const clientNames = getNamesByCountryCode(clientCountry.code);

        await addDoc(collection(db, 'reviews'), {
          providerId: uid,
          clientId: `client_${Date.now()}_${j}`,
          clientName: randomChoice(clientNames.male),
          clientCountry: clientCountry.name,
          rating: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
          comment: randomChoice(REVIEW_COMMENTS),
          isPublic: true, status: 'published',
          serviceType: 'lawyer_call',
          createdAt: Timestamp.fromDate(reviewDate),
        });
      }

      success++;
      console.log(`✓ [${i + 1}/${profiles.length}] ${fullName} | ${mainCountry.name} | ${practiceCountryCodes.join(', ')} | ${reviewCount} avis`);

      await new Promise(r => setTimeout(r, 100));
    } catch (err) {
      errors++;
      console.error(`✗ ERREUR ${mainCountry.name}:`, err.message);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(` TERMINÉ! ${success} avocats créés | ${errors} erreurs`);
  console.log('='.repeat(70));
  process.exit(0);
}

main();
