/**
 * =============================================================================
 * SCRIPT NODE.JS: Génération d'Avocats Hommes couvrant TOUS LES 197 PAYS
 * =============================================================================
 *
 * Exécution: node scripts/generate-lawyers-all-countries.js
 * Prérequis: gcloud auth application-default login
 *
 * Contraintes respectées:
 * - Chaque avocat a entre 1 et 5 PAYS D'INTERVENTION
 * - Environ 40-50 avocats pour couvrir les 197 pays
 * - TOUS parlent FRANÇAIS uniquement
 * - Ethnicités variées (prénoms/noms selon le pays de résidence)
 * - Période d'inscription: 1er octobre - 30 décembre 2024
 * - Grande variété dans les profils (pas de copie-coller)
 * - Apparaissent dans AdminAaaProfiles (isTestProfile: true)
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize avec Service Account
const serviceAccount = require(path.join(__dirname, '..', 'serviceAccount.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'sos-urgently-ac307'
});

const db = admin.firestore();

// =============================================================================
// TOUS LES 197 PAYS
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
// NOMS PAR RÉGION/ETHNICITÉ - HOMMES UNIQUEMENT
// =============================================================================

const NAMES_FR = {
  male: ['Jean', 'Pierre', 'Michel', 'Philippe', 'Thomas', 'Nicolas', 'François', 'Laurent', 'Éric', 'David', 'Stéphane', 'Olivier', 'Christophe', 'Frédéric', 'Patrick', 'Antoine', 'Julien', 'Alexandre', 'Sébastien', 'Vincent', 'Pascal', 'Thierry', 'Bruno', 'Daniel', 'Alain', 'Bernard', 'Marc', 'Christian', 'Gérard', 'André', 'Henri', 'Jacques', 'Louis', 'Maxime', 'Lucas', 'Hugo', 'Paul', 'Arthur', 'Raphaël', 'Mathis'],
  lastNames: ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'Roux', 'Vincent', 'Fournier', 'Morel', 'Girard', 'André', 'Mercier', 'Dupont', 'Lambert', 'Bonnet']
};

const NAMES_DE = {
  male: ['Hans', 'Peter', 'Wolfgang', 'Klaus', 'Jürgen', 'Michael', 'Dieter', 'Horst', 'Werner', 'Karl', 'Helmut', 'Manfred', 'Thomas', 'Andreas', 'Stefan', 'Christian', 'Martin', 'Markus', 'Alexander', 'Sebastian', 'Tobias', 'Matthias', 'Florian', 'Daniel', 'Maximilian', 'Felix', 'Lukas', 'Paul', 'Leon', 'Jonas'],
  lastNames: ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann', 'Schäfer', 'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf', 'Schröder', 'Neumann', 'Schwarz', 'Zimmermann']
};

const NAMES_ES = {
  male: ['Antonio', 'José', 'Manuel', 'Francisco', 'Juan', 'David', 'Jesús', 'Javier', 'Carlos', 'Miguel', 'Pedro', 'Alejandro', 'Fernando', 'Pablo', 'Jorge', 'Luis', 'Sergio', 'Rafael', 'Ángel', 'Daniel', 'Andrés', 'Diego', 'Alberto', 'Raúl', 'Ramón', 'Adrián', 'Ignacio', 'Álvaro', 'Marcos', 'Óscar'],
  lastNames: ['García', 'Rodríguez', 'González', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Martín', 'Jiménez', 'Ruiz', 'Hernández', 'Díaz', 'Moreno', 'Muñoz', 'Álvarez', 'Romero', 'Alonso', 'Gutiérrez']
};

const NAMES_IT = {
  male: ['Marco', 'Luca', 'Giuseppe', 'Francesco', 'Antonio', 'Matteo', 'Alessandro', 'Andrea', 'Stefano', 'Paolo', 'Giovanni', 'Lorenzo', 'Davide', 'Simone', 'Federico', 'Riccardo', 'Gabriele', 'Alessio', 'Michele', 'Roberto', 'Nicola', 'Daniele', 'Filippo', 'Tommaso', 'Salvatore'],
  lastNames: ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti', 'De Luca', 'Costa', 'Giordano', 'Mancini', 'Rizzo', 'Lombardi', 'Moretti']
};

const NAMES_EN = {
  male: ['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Christopher', 'Charles', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald', 'Steven', 'Paul', 'Andrew', 'Joshua', 'Kenneth', 'Kevin', 'Brian', 'George', 'Edward', 'Ronald', 'Timothy', 'Jason', 'Jeffrey', 'Ryan'],
  lastNames: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White']
};

const NAMES_PT = {
  male: ['José', 'João', 'Antonio', 'Francisco', 'Carlos', 'Paulo', 'Pedro', 'Lucas', 'Luiz', 'Marcos', 'Gabriel', 'Rafael', 'Daniel', 'Marcelo', 'Bruno', 'Rodrigo', 'Felipe', 'Matheus', 'Gustavo', 'Leonardo', 'Fernando', 'André', 'Thiago', 'Ricardo', 'Eduardo'],
  lastNames: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Rocha', 'Almeida', 'Nascimento', 'Araújo', 'Fernandes', 'Sousa']
};

const NAMES_AFRICA_FR = {
  male: ['Moussa', 'Ibrahim', 'Abdoulaye', 'Ousmane', 'Cheikh', 'Mamadou', 'Amadou', 'Issa', 'Aliou', 'Souleymane', 'Ibrahima', 'Seydou', 'Modou', 'Lamine', 'Boubacar', 'Samba', 'Demba', 'Alioune', 'Babacar', 'Malick', 'Khadim', 'Moustapha', 'Omar', 'Youssouf', 'Adama'],
  lastNames: ['Diop', 'Ba', 'Ndiaye', 'Traoré', 'Diallo', 'Koné', 'Sy', 'Sarr', 'Cissé', 'Camara', 'Fall', 'Sow', 'Diouf', 'Gueye', 'Kane', 'Touré', 'Seck', 'Niang', 'Faye', 'Mbaye']
};

const NAMES_AFRICA_EN = {
  male: ['John', 'Michael', 'Samuel', 'David', 'Peter', 'Daniel', 'Joseph', 'Paul', 'Emmanuel', 'James', 'Isaac', 'Moses', 'Solomon', 'Joshua', 'Benjamin', 'Matthew', 'Stephen', 'Patrick', 'Thomas', 'Charles'],
  lastNames: ['Mensah', 'Okafor', 'Abebe', 'Kamau', 'Okoro', 'Mwangi', 'Ochieng', 'Mutua', 'Nkrumah', 'Adeyemi', 'Oluwaseun', 'Chukwu', 'Eze', 'Nwosu', 'Akinola', 'Adeleke', 'Taiwo', 'Babatunde', 'Chinedu', 'Emeka']
};

const NAMES_MA = {
  male: ['Mohamed', 'Ahmed', 'Ali', 'Hassan', 'Omar', 'Youssef', 'Khalid', 'Said', 'Rachid', 'Abdelaziz', 'Karim', 'Amine', 'Hamza', 'Mehdi', 'Nabil', 'Sofiane', 'Bilal', 'Tarek', 'Adel', 'Farid', 'Samir', 'Walid', 'Mourad', 'Hicham', 'Nasser'],
  lastNames: ['Alami', 'Benjelloun', 'El Amrani', 'Bennis', 'Cherkaoui', 'Idrissi', 'Tazi', 'Fassi', 'El Mansouri', 'Bennani', 'Alaoui', 'Berrada', 'Zahiri', 'Filali', 'Kettani', 'Chraibi', 'Hamdaoui', 'Naciri', 'Tahiri', 'Lamrani']
};

const NAMES_CN = {
  male: ['Wei', 'Ming', 'Jun', 'Feng', 'Lei', 'Bo', 'Jian', 'Peng', 'Yang', 'Hao', 'Tao', 'Gang', 'Qiang', 'Long', 'Bin', 'Chao', 'Hui', 'Dong', 'Cheng', 'Kai'],
  lastNames: ['Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Huang', 'Zhao', 'Wu', 'Zhou', 'Xu', 'Sun', 'Ma', 'Zhu', 'Hu', 'Guo', 'He', 'Gao', 'Lin', 'Luo']
};

const NAMES_JP = {
  male: ['Hiroshi', 'Takeshi', 'Kenji', 'Yuki', 'Taro', 'Koji', 'Masao', 'Akira', 'Satoshi', 'Kazuo', 'Makoto', 'Takashi', 'Yasushi', 'Daisuke', 'Yusuke', 'Masahiro', 'Takuya', 'Ryota', 'Shota', 'Daiki'],
  lastNames: ['Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Kato', 'Yoshida', 'Yamada', 'Sasaki', 'Yamaguchi', 'Saito', 'Matsumoto', 'Inoue', 'Kimura', 'Hayashi', 'Shimizu']
};

const NAMES_IN = {
  male: ['Raj', 'Amit', 'Rahul', 'Arun', 'Vijay', 'Suresh', 'Ravi', 'Sanjay', 'Anand', 'Ashok', 'Rajesh', 'Manoj', 'Santosh', 'Deepak', 'Ajay', 'Vishal', 'Nitin', 'Rakesh', 'Sachin', 'Prakash'],
  lastNames: ['Patel', 'Kumar', 'Singh', 'Sharma', 'Shah', 'Gupta', 'Reddy', 'Iyer', 'Nair', 'Rao', 'Verma', 'Joshi', 'Mehta', 'Desai', 'Kapoor', 'Malhotra', 'Agarwal', 'Banerjee', 'Chatterjee', 'Mishra']
};

const NAMES_SLAVIC = {
  male: ['Ivan', 'Oleg', 'Dmitri', 'Sergei', 'Alexei', 'Nikolai', 'Andrei', 'Vladimir', 'Yuri', 'Mikhail', 'Pavel', 'Boris', 'Viktor', 'Konstantin', 'Evgeny', 'Maxim', 'Roman', 'Artem', 'Kirill', 'Denis'],
  lastNames: ['Ivanov', 'Petrov', 'Sidorov', 'Smirnov', 'Kuznetsov', 'Popov', 'Sokolov', 'Orlov', 'Volkov', 'Fedorov', 'Lebedev', 'Kozlov', 'Novikov', 'Morozov', 'Vasiliev', 'Mikhailov', 'Pavlov', 'Alekseev', 'Yakovlev', 'Grigoriev']
};

const NAMES_TURKIC = {
  male: ['Mehmet', 'Ahmet', 'Mustafa', 'Ali', 'Murat', 'Okan', 'Hakan', 'Yusuf', 'Emre', 'Burak', 'Kemal', 'Cem', 'Can', 'Serkan', 'Tolga', 'Onur', 'Deniz', 'Kerem', 'Selim', 'Fatih'],
  lastNames: ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Yıldırım', 'Aydın', 'Öztürk', 'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Çetin', 'Kara', 'Koç', 'Kurt', 'Özdemir', 'Erdoğan', 'Polat']
};

const NAMES_SE_ASIA = {
  male: ['Somchai', 'Somsak', 'Sompong', 'Wichai', 'Niran', 'Kitti', 'Prasert', 'Surachai', 'Thana', 'Amnuay', 'Chaiwat', 'Suchart', 'Somboon', 'Pongpat', 'Anucha', 'Adisak', 'Boonmee', 'Chatchai', 'Decha', 'Manop'],
  lastNames: ['Saetang', 'Chokchai', 'Rattana', 'Siriwan', 'Prasert', 'Niran', 'Chaiyaporn', 'Somchai', 'Wichai', 'Thana', 'Boonmee', 'Changklang', 'Daengsawat', 'Kamolrat', 'Lertsuk']
};

const NAMES_KOREAN = {
  male: ['Min-jun', 'Seo-joon', 'Ji-hoon', 'Jae-won', 'Hyun-woo', 'Dong-hyun', 'Sung-min', 'Jong-ho', 'Young-soo', 'Tae-hyun', 'Jin-woo', 'Seung-ho', 'Sang-woo', 'Joon-ho', 'Min-ho'],
  lastNames: ['Kim', 'Lee', 'Park', 'Choi', 'Jung', 'Kang', 'Cho', 'Yoon', 'Jang', 'Lim', 'Han', 'Shin', 'Seo', 'Kwon', 'Hwang']
};

const NAMES_VIET = {
  male: ['Anh', 'Minh', 'Quang', 'Huy', 'Tuan', 'Duc', 'Nam', 'Phong', 'Khanh', 'Long', 'Hai', 'Hung', 'Dung', 'Cuong', 'Tan', 'Thang', 'Trung', 'Viet', 'Hoang', 'Son'],
  lastNames: ['Nguyen', 'Tran', 'Le', 'Pham', 'Hoang', 'Huynh', 'Vu', 'Vo', 'Dang', 'Bui', 'Do', 'Ho', 'Ngo', 'Duong', 'Ly']
};

const NAMES_INDONESIA = {
  male: ['Agus', 'Budi', 'Joko', 'Hendra', 'Rizky', 'Andi', 'Yudi', 'Fajar', 'Dedi', 'Imam', 'Wahyu', 'Dwi', 'Eko', 'Bambang', 'Ahmad', 'Doni', 'Rudi', 'Wawan', 'Teguh', 'Sutrisno'],
  lastNames: ['Pratama', 'Saputra', 'Santoso', 'Wijaya', 'Hidayat', 'Kurniawan', 'Setiawan', 'Nugroho', 'Siregar', 'Gunawan', 'Wibowo', 'Permana', 'Suryanto', 'Susanto', 'Utomo']
};

const NAMES_NORDIC = {
  male: ['Lars', 'Ola', 'Erik', 'Mikael', 'Jonas', 'Henrik', 'Anders', 'Nils', 'Per', 'Ole', 'Jan', 'Magnus', 'Tor', 'Gunnar', 'Rune', 'Arne', 'Petter', 'Kristian', 'Martin', 'Thomas'],
  lastNames: ['Johansson', 'Andersen', 'Hansen', 'Larsen', 'Nielsen', 'Berg', 'Lund', 'Haug', 'Olsen', 'Persson', 'Andersson', 'Karlsson', 'Nilsson', 'Eriksson', 'Jensen']
};

const NAMES_PERSIAN = {
  male: ['Ali', 'Hassan', 'Reza', 'Hossein', 'Mahmoud', 'Farid', 'Omid', 'Saeed', 'Amir', 'Javad', 'Mohammad', 'Ahmad', 'Mehdi', 'Abbas', 'Majid', 'Hamid', 'Masoud', 'Karim', 'Hadi', 'Mohsen'],
  lastNames: ['Hosseini', 'Rezai', 'Rahimi', 'Karimi', 'Ahmadi', 'Jafari', 'Moradi', 'Farhadi', 'Ebrahimi', 'Nasseri', 'Mohammadi', 'Mousavi', 'Jamshidi', 'Hashemi', 'Sadeghi']
};

const NAMES_HEBREW = {
  male: ['David', 'Yosef', 'Moshe', 'Avi', 'Yaakov', 'Yehuda', 'Noam', 'Alon', 'Eitan', 'Yair', 'Daniel', 'Uri', 'Ariel', 'Yuval', 'Omri', 'Ron', 'Guy', 'Shai', 'Tal', 'Amit'],
  lastNames: ['Cohen', 'Levi', 'Mizrahi', 'Biton', 'Goldstein', 'Katz', 'Azoulay', 'Ohayon', 'Peretz', 'Ben-David', 'Dahan', 'Malka', 'Avraham', 'Dayan', 'Friedman']
};

// Mapping pays -> noms par région
function getNamesByCountryCode(code) {
  const FR_COUNTRIES = ['FR', 'BE', 'LU', 'MC', 'HT', 'CH'];
  const DE_COUNTRIES = ['DE', 'AT', 'LI'];
  const ES_COUNTRIES = ['ES', 'AD', 'MX', 'GT', 'HN', 'SV', 'NI', 'CR', 'PA', 'CU', 'DO', 'CO', 'VE', 'EC', 'PE', 'BO', 'PY', 'CL', 'AR', 'UY'];
  const IT_COUNTRIES = ['IT', 'SM', 'VA', 'MT'];
  const PT_COUNTRIES = ['PT', 'BR', 'AO', 'MZ', 'CV', 'GW', 'ST', 'TL'];
  const EN_COUNTRIES = ['GB', 'IE', 'US', 'CA', 'AU', 'NZ', 'JM', 'TT', 'BB', 'BS', 'GY', 'BZ', 'AG', 'DM', 'GD', 'KN', 'LC', 'VC', 'CY'];
  const AFRICA_FR_COUNTRIES = ['SN', 'ML', 'CI', 'BF', 'NE', 'TG', 'BJ', 'GN', 'CM', 'CF', 'TD', 'CG', 'CD', 'GA', 'DJ', 'KM', 'MG', 'MR', 'RW', 'BI', 'GQ'];
  const AFRICA_EN_COUNTRIES = ['NG', 'GH', 'KE', 'TZ', 'UG', 'ZA', 'ZW', 'ZM', 'BW', 'NA', 'MW', 'LS', 'SZ', 'RW', 'ET', 'ER', 'SS', 'SD', 'SO', 'GM', 'SL', 'LR', 'SC', 'MU'];
  const MA_COUNTRIES = ['MA', 'DZ', 'TN', 'LY', 'EG', 'SA', 'AE', 'QA', 'KW', 'BH', 'OM', 'YE', 'JO', 'LB', 'SY', 'IQ', 'PS'];
  const CN_COUNTRIES = ['CN', 'TW', 'SG'];
  const JP_COUNTRIES = ['JP'];
  const IN_COUNTRIES = ['IN', 'BD', 'NP', 'LK', 'MV', 'PK', 'BT'];
  const SLAVIC_COUNTRIES = ['RU', 'UA', 'BY', 'PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'RS', 'HR', 'SI', 'BA', 'ME', 'MK', 'AL', 'XK', 'MD', 'EE', 'LV', 'LT', 'GE', 'AM', 'AZ'];
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

  // Fallback
  return NAMES_EN;
}

// =============================================================================
// SPÉCIALITÉS JURIDIQUES
// =============================================================================

// ✅ CORRIGÉ: Codes synchronisés avec lawyer-specialties.ts
const LAWYER_SPECIALTIES = [
  // URG - Urgences
  'URG_ASSISTANCE_PENALE_INTERNATIONALE', 'URG_ACCIDENTS_RESPONSABILITE_CIVILE', 'URG_RAPATRIEMENT_URGENCE',
  // CUR - Services courants
  'CUR_TRADUCTIONS_LEGALISATIONS', 'CUR_RECLAMATIONS_LITIGES_MINEURS', 'CUR_DEMARCHES_ADMINISTRATIVES',
  // IMMI - Immigration et travail
  'IMMI_VISAS_PERMIS_SEJOUR', 'IMMI_CONTRATS_TRAVAIL_INTERNATIONAL', 'IMMI_NATURALISATION',
  // IMMO - Immobilier
  'IMMO_ACHAT_VENTE', 'IMMO_LOCATION_BAUX', 'IMMO_LITIGES_IMMOBILIERS',
  // FISC - Fiscalité
  'FISC_DECLARATIONS_INTERNATIONALES', 'FISC_DOUBLE_IMPOSITION', 'FISC_OPTIMISATION_EXPATRIES',
  // FAM - Famille
  'FAM_MARIAGE_DIVORCE', 'FAM_GARDE_ENFANTS_TRANSFRONTALIERE', 'FAM_SCOLARITE_INTERNATIONALE',
  // PATR - Patrimoine
  'PATR_SUCCESSIONS_INTERNATIONALES', 'PATR_GESTION_PATRIMOINE', 'PATR_TESTAMENTS',
  // ENTR - Entreprise
  'ENTR_CREATION_ENTREPRISE_ETRANGER', 'ENTR_INVESTISSEMENTS', 'ENTR_IMPORT_EXPORT',
  // ASSU - Assurances
  'ASSU_ASSURANCES_INTERNATIONALES', 'ASSU_PROTECTION_DONNEES', 'ASSU_CONTENTIEUX_ADMINISTRATIFS',
  // BANK - Banque et finance
  'BANK_PROBLEMES_COMPTES_BANCAIRES', 'BANK_VIREMENTS_CREDITS', 'BANK_SERVICES_FINANCIERS',
  // ARGT - Problèmes d'argent
  'ARGT_RETARDS_SALAIRE_IMPAYES', 'ARGT_ARNAQUES_ESCROQUERIES', 'ARGT_SURENDETTEMENT_PLANS',
];

const CERTIFICATIONS = [
  'certified-bar', 'international-law', 'mediator', 'business-law', 'family-law',
  'tax-law', 'real-estate', 'notary', 'arbitrator', 'immigration', 'criminal-law',
];

// =============================================================================
// TEMPLATES DE BIOS VARIÉS
// =============================================================================

const BIO_TEMPLATES = [
  "Fort de {exp} années d'expérience en droit international, je conseille les expatriés francophones. Basé en {pays}, j'interviens également dans {autres_pays}. Spécialiste en {specialty}.",
  "Avocat inscrit au barreau depuis {exp} ans, je me consacre aux problématiques juridiques des Français à l'étranger. Depuis {pays}, j'accompagne mes clients dans {autres_pays}.",
  "Passionné par le droit international, j'exerce depuis {exp} ans. Installé en {pays}, j'interviens aussi dans {autres_pays}. Expert en {specialty}.",
  "Après {exp} ans de pratique juridique, j'ai développé une expertise pointue. Basé en {pays}, je couvre également {autres_pays}.",
  "Spécialiste du droit des expatriés depuis {exp} ans, j'offre mes services aux francophones. De {pays}, j'interviens dans {autres_pays}.",
  "Diplômé en droit international, j'offre un accompagnement juridique complet. Résidant en {pays}, je pratique aussi dans {autres_pays}.",
  "Avec {exp} années au service des expatriés, je suis votre interlocuteur privilégié. Basé en {pays}, j'interviens dans {autres_pays}.",
  "Mon cabinet, établi en {pays}, se dédie à l'accompagnement juridique des francophones dans {autres_pays}. Spécialité: {specialty}.",
  "Juriste chevronné avec {exp} ans de pratique, je guide les expatriés francophones. Depuis {pays}, j'interviens dans {autres_pays}.",
  "Expert juridique basé en {pays}, je cumule {exp} ans d'expérience. J'interviens également dans {autres_pays}. Compétences en {specialty}.",
  "Dédié à la défense des intérêts des expatriés depuis {exp} ans. Résidant en {pays}, je couvre aussi {autres_pays}.",
  "Avocat exerçant en {pays} depuis {exp} ans. J'interviens également dans {autres_pays}. Expert en {specialty}.",
];

// =============================================================================
// COMMENTAIRES D'AVIS (40 uniques)
// =============================================================================

const REVIEW_COMMENTS = [
  "Excellent avocat, très professionnel et à l'écoute de mes besoins spécifiques.",
  "Conseils juridiques de qualité exceptionnelle, je recommande vivement ses services.",
  "Très satisfait de ses services, réponse rapide et solution efficace à mon problème.",
  "Expertise remarquable en droit international, il a résolu mon dossier complexe.",
  "Un professionnel dévoué et compétent, toujours disponible et réactif.",
  "J'ai beaucoup apprécié son accompagnement dans mes démarches administratives.",
  "Service impeccable, communication claire et parfaitement transparente.",
  "Avocat très compétent qui a résolu mon dossier bien plus rapidement que prévu.",
  "Professionnalisme exemplaire, je n'hésiterai pas à refaire appel à ses services.",
  "Excellent suivi de dossier, toujours joignable et attentif à mes questions.",
  "Ses conseils m'ont été extrêmement précieux, un grand merci pour tout!",
  "Grande expertise juridique, il maîtrise parfaitement le droit international.",
  "Très bonne expérience globale, je recommande sans aucune hésitation.",
  "Avocat sérieux et rigoureux, résultats parfaitement conformés à mes attentes.",
  "Pédagogue et patient, il m'a expliqué en détail toutes les options possibles.",
  "Service client irréprochable, il répond toujours rapidement à mes demandes.",
  "A su gérer mon dossier avec brio malgré sa grande complexité.",
  "Je suis très reconnaissant pour son aide précieuse dans cette affaire délicate.",
  "Maîtrise parfaite du sujet, conseils toujours avisés et pertinents.",
  "Excellent rapport qualité-prix, un service vraiment haut de gamme.",
  "Très bon avocat francophone, ce qui est rare dans ce pays!",
  "Il parle parfaitement français, facilitant grandement tous nos échanges.",
  "Compétence et sérieux au rendez-vous, je suis pleinement satisfait du résultat.",
  "A pris le temps de bien comprendre ma situation avant de proposer des solutions.",
  "Tarifs tout à fait raisonnables pour un service de qualité supérieure.",
  "Son expérience avec les expatriés fait vraiment toute la différence.",
  "Je le recommande chaleureusement à tous les Français vivant à l'étranger.",
  "Un avocat de confiance, j'ai pu résoudre tous mes problèmes légaux grâce à lui.",
  "Efficacité et professionnalisme, exactement ce que je recherchais.",
  "Grâce à son expertise, j'ai obtenu mon visa sans aucune difficulté.",
  "Excellent accompagnement pour mon divorce international, merci infiniment.",
  "A su défendre mes intérêts avec brio face à une situation très complexe.",
  "Toujours disponible même le week-end quand j'avais des urgences.",
  "Documents rédigés avec soin et conseils extrêmement précis.",
  "Un vrai professionnel qui connaît son métier sur le bout des doigts.",
  "Réactivité vraiment impressionnante, réponse en moins de 24h systématiquement.",
  "Je suis très content d'avoir trouvé un avocat francophone aussi compétent.",
  "Son réseau local m'a permis de résoudre des problèmes administratifs complexes.",
  "Prend vraiment le temps d'expliquer les procédures légales en détail.",
  "Honoraires transparents dès le départ, aucune mauvaise surprise à la fin.",
];

// =============================================================================
// UNIVERSITÉS PAR RÉGION
// =============================================================================

const UNIVERSITIES = {
  europe: ['Université Paris 1 Panthéon-Sorbonne', 'Université Paris 2 Panthéon-Assas', 'London School of Economics', 'Universität Heidelberg', 'Università di Bologna', 'University of Amsterdam'],
  america: ['Harvard Law School', 'Yale Law School', 'Columbia Law School', 'McGill University', 'Université de Montréal', 'Universidad de Buenos Aires'],
  africa: ['Université Cheikh Anta Diop de Dakar', 'University of Cape Town', 'Cairo University', 'Université de Tunis', 'Université Mohammed V de Rabat'],
  asia: ['University of Tokyo', 'Peking University', 'National University of Singapore', 'American University of Beirut', 'Tel Aviv University'],
  oceania: ['University of Sydney', 'University of Melbourne', 'University of Auckland'],
  default: ['Université Internationale de Droit', 'École Supérieure de Droit International', 'Faculté de Droit Comparé'],
};

// =============================================================================
// FONCTIONS UTILITAIRES
// =============================================================================

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDateBetween(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomRating() {
  const r = Math.random();
  if (r < 0.6) return parseFloat((4.5 + Math.random() * 0.5).toFixed(2));
  if (r < 0.9) return parseFloat((4.0 + Math.random() * 0.5).toFixed(2));
  return parseFloat((3.7 + Math.random() * 0.3).toFixed(2));
}

function slugify(str) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

function getRegion(code) {
  const europe = ['FR', 'BE', 'NL', 'LU', 'DE', 'AT', 'CH', 'IT', 'ES', 'PT', 'GB', 'IE', 'PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'GR', 'HR', 'RS', 'SI', 'BA', 'ME', 'MK', 'AL', 'BY', 'UA', 'RU', 'EE', 'LV', 'LT', 'SE', 'NO', 'DK', 'FI', 'IS'];
  const america = ['US', 'CA', 'MX', 'BR', 'AR', 'CL', 'CO', 'PE', 'VE', 'EC', 'BO', 'PY', 'UY', 'PA', 'CR', 'GT', 'CU', 'DO', 'HT', 'JM'];
  const africa = ['DZ', 'MA', 'TN', 'EG', 'SN', 'CI', 'ML', 'BF', 'NE', 'NG', 'CM', 'GA', 'CG', 'CD', 'KE', 'TZ', 'UG', 'ZA', 'MG', 'MU'];
  const asia = ['JP', 'CN', 'KR', 'IN', 'TH', 'VN', 'ID', 'MY', 'SG', 'PH', 'AE', 'SA', 'IL', 'TR', 'IR', 'PK'];
  const oceania = ['AU', 'NZ', 'FJ', 'PG'];

  if (europe.includes(code)) return 'europe';
  if (america.includes(code)) return 'america';
  if (africa.includes(code)) return 'africa';
  if (asia.includes(code)) return 'asia';
  if (oceania.includes(code)) return 'oceania';
  return 'default';
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// =============================================================================
// FONCTION PRINCIPALE
// =============================================================================

async function generateLawyersAllCountries() {
  console.log('='.repeat(70));
  console.log(' GÉNÉRATION D\'AVOCATS COUVRANT TOUS LES 197 PAYS');
  console.log(' Chaque avocat: 1-5 pays d\'intervention | Langue: FRANÇAIS');
  console.log('='.repeat(70));

  const START_DATE = new Date('2024-10-01');
  const END_DATE = new Date('2024-12-30');
  const TODAY = new Date();

  // Mélanger les pays
  const shuffledCountries = shuffle(ALL_COUNTRIES);
  console.log(`\n🌍 ${shuffledCountries.length} pays à couvrir\n`);

  // Distribuer les pays entre les avocats (1-5 pays par avocat)
  const profiles = [];
  let countryIndex = 0;

  while (countryIndex < shuffledCountries.length) {
    const numCountries = randomInt(1, 5);
    const assignedCountries = shuffledCountries.slice(countryIndex, countryIndex + numCountries);
    countryIndex += numCountries;

    if (assignedCountries.length === 0) break;

    const mainCountry = assignedCountries[0];
    const otherCountries = assignedCountries.slice(1);

    profiles.push({ mainCountry, allCountries: assignedCountries, otherCountries });
  }

  console.log(`👤 ${profiles.length} avocats à générer\n`);

  let success = 0;
  let errors = 0;

  for (let i = 0; i < profiles.length; i++) {
    const profile = profiles[i];
    const mainCountry = profile.mainCountry;

    try {
      // Noms selon l'ethnicité
      const namesData = getNamesByCountryCode(mainCountry.code);
      const firstName = randomChoice(namesData.male);
      const lastName = randomChoice(namesData.lastNames);
      const fullName = `${firstName} ${lastName}`;
      const email = `${slugify(firstName)}.${slugify(lastName)}@example.com`;

      // UID unique
      const uid = `aaa_lawyer_${mainCountry.code.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

      // Date de création
      const createdAt = randomDateBetween(START_DATE, END_DATE);

      // Expérience (3-30 ans)
      const experience = randomInt(3, 30);
      const graduationYear = new Date().getFullYear() - experience - randomInt(0, 5);

      // Spécialités (2-5)
      const numSpec = randomInt(2, 5);
      const specialties = shuffle(LAWYER_SPECIALTIES).slice(0, numSpec);

      // Certifications (1-3)
      const numCert = randomInt(1, 3);
      const certifications = shuffle(CERTIFICATIONS).slice(0, numCert);

      // Statistiques basées sur la date d'inscription
      const daysSinceCreation = Math.max(1, Math.floor((TODAY.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)));
      const weeksSinceCreation = Math.max(1, Math.floor(daysSinceCreation / 7));

      // Maximum 1-2 avis par semaine depuis l'inscription
      const maxReviewsPerWeek = Math.random() > 0.5 ? 2 : 1;
      const reviewCount = Math.min(weeksSinceCreation * maxReviewsPerWeek, 40); // Cap à 40 avis max

      // Appels = environ 2-3x le nombre d'avis (tous les clients ne laissent pas d'avis)
      const totalCalls = Math.floor(reviewCount * (2 + Math.random()));
      const rating = randomRating();

      // Bio
      const bioTemplate = randomChoice(BIO_TEMPLATES);
      const otherCountriesText = profile.otherCountries.length > 0
        ? profile.otherCountries.map(c => c.name).join(', ')
        : 'plusieurs régions voisines';
      const bio = bioTemplate
        .replace(/{exp}/g, experience.toString())
        .replace(/{pays}/g, mainCountry.name)
        .replace(/{autres_pays}/g, otherCountriesText)
        .replace(/{specialty}/g, specialties[0].replace(/_/g, ' ').toLowerCase());

      // Université
      const region = getRegion(mainCountry.code);
      const lawSchool = randomChoice(UNIVERSITIES[region] || UNIVERSITIES.default);

      // Prix
      let price = randomInt(39, 89);
      if (['FR', 'US', 'GB', 'CH', 'DE'].includes(mainCountry.code)) price = randomInt(59, 99);
      if (['SN', 'ML', 'CI', 'CM'].includes(mainCountry.code)) price = randomInt(29, 49);

      // Durée et temps de réponse
      const duration = randomChoice([15, 20, 30, 45]);
      const responseTime = randomChoice(['< 5 minutes', '< 15 minutes', '< 30 minutes']);

      // Codes des pays d'intervention
      const practiceCountryCodes = profile.allCountries.map(c => c.code);

      // Profil complet
      const profileData = {
        uid, firstName, lastName, fullName, email,
        phone: '+33743331201', phoneCountryCode: '+33',
        country: mainCountry.code, currentCountry: mainCountry.code,
        preferredLanguage: 'fr',
        languages: ['fr'], // FRANÇAIS UNIQUEMENT
        languagesSpoken: ['Français'],
        profilePhoto: '', avatar: '',
        isTestProfile: true, isActive: true, isApproved: true, isVerified: true,
        approvalStatus: 'approved', verificationStatus: 'approved',
        isOnline: Math.random() > 0.7,
        isVisible: true, isVisibleOnMap: true, isCallable: true,
        createdAt: admin.firestore.Timestamp.fromDate(createdAt),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
        role: 'lawyer', type: 'lawyer', isSOS: true,
        points: randomInt(0, 500),
        affiliateCode: `LAW${mainCountry.code}${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
        bio: { fr: bio, en: bio.replace('Français', 'French') },
        responseTime, availability: 'available',
        totalCalls, totalEarnings: totalCalls * price * 0.7,
        averageRating: rating, rating, reviewCount,
        price, duration,
        specialties, practiceCountries: practiceCountryCodes,
        yearsOfExperience: experience,
        barNumber: `BAR-${mainCountry.code}-${randomInt(10000, 99999)}`,
        lawSchool, graduationYear, certifications,
        needsVerification: false,
      };

      // Sauvegarder dans Firestore
      await db.collection('users').doc(uid).set(profileData);
      await db.collection('sos_profiles').doc(uid).set({ ...profileData, createdByAdmin: true, profileCompleted: true });
      await db.collection('ui_profile_cards').doc(uid).set({
        id: uid, uid, title: fullName, subtitle: 'Avocat',
        country: mainCountry.name, photo: '', rating, reviewCount,
        languages: ['Français'], specialties,
        href: `/profile/${uid}`, createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Avis - répartis sur les semaines depuis l'inscription (1-2 par semaine max)
      const usedComments = new Set();
      const msPerDay = 24 * 60 * 60 * 1000;

      for (let j = 0; j < reviewCount; j++) {
        // Calculer la semaine de cet avis (répartition uniforme)
        const weekIndex = Math.floor(j / maxReviewsPerWeek);
        const dayInWeek = randomInt(0, 6); // Jour aléatoire dans la semaine

        // Date de l'avis = date inscription + (semaine * 7 jours) + jour aléatoire
        const reviewDate = new Date(createdAt.getTime() + (weekIndex * 7 + dayInWeek) * msPerDay);

        // S'assurer que la date ne dépasse pas aujourd'hui
        const finalReviewDate = reviewDate > TODAY ? TODAY : reviewDate;

        let comment = randomChoice(REVIEW_COMMENTS);
        let attempts = 0;
        while (usedComments.has(comment) && attempts < 50) {
          comment = randomChoice(REVIEW_COMMENTS);
          attempts++;
        }
        usedComments.add(comment);

        const clientCountry = randomChoice(ALL_COUNTRIES);
        const clientNames = getNamesByCountryCode(clientCountry.code);
        const clientName = randomChoice(clientNames.male);

        await db.collection('reviews').add({
          providerId: uid, clientId: `client_${Date.now()}_${j}`,
          clientName, clientCountry: clientCountry.name,
          rating: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
          comment, isPublic: true, status: 'published',
          serviceType: 'lawyer_call',
          createdAt: admin.firestore.Timestamp.fromDate(finalReviewDate),
          helpfulVotes: randomInt(0, 15),
        });
      }

      success++;
      const countriesStr = practiceCountryCodes.join(', ');
      console.log(`✓ [${i + 1}/${profiles.length}] ${fullName} | ${mainCountry.name} | Pays: ${countriesStr} | ${reviewCount} avis`);

      // Petite pause pour éviter les rate limits
      await new Promise(r => setTimeout(r, 50));

    } catch (err) {
      errors++;
      console.error(`✗ ERREUR ${mainCountry.name}:`, err.message);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(` TERMINÉ! ${success} avocats créés | ${errors} erreurs`);
  console.log(` Tous les ${shuffledCountries.length} pays sont couverts`);
  console.log('='.repeat(70));

  process.exit(0);
}

// Exécuter
generateLawyersAllCountries().catch(err => {
  console.error('Erreur fatale:', err);
  process.exit(1);
});
