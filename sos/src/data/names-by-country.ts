// src/data/names-by-country.ts

export interface NameData {
  male: string[];
  female: string[];
  lastNames: string[];
}

// ============================================================================
// PATTERN SETS (réutilisés par région)
// ============================================================================

const NAMES_DEFAULT: NameData = {
  male: ['Alex', 'David', 'Michael', 'John', 'James', 'Robert', 'William', 'Richard', 'Thomas', 'Daniel', 'Mark', 'Steven', 'Paul', 'Andrew', 'Joshua', 'Kevin', 'Brian', 'George', 'Edward', 'Ronald'],
  female: ['Maria', 'Anna', 'Emma', 'Sarah', 'Lisa', 'Laura', 'Jennifer', 'Michelle', 'Sophie', 'Julia', 'Rachel', 'Rebecca', 'Hannah', 'Amy', 'Nicole', 'Jessica', 'Melissa', 'Amanda', 'Stephanie', 'Katherine'],
  lastNames: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Martinez', 'Rodriguez', 'Wilson', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris', 'Clark'],
};

// France
const NAMES_FR: NameData = {
  male: [
    'Jean',
    'Pierre',
    'Michel',
    'Philippe',
    'Thomas',
    'Nicolas',
    'François',
    'Laurent',
    'Éric',
    'David',
    'Stéphane',
    'Olivier',
    'Christophe',
    'Frédéric',
    'Patrick',
    'Antoine',
    'Julien',
    'Alexandre',
    'Sébastien',
    'Vincent',
    'Pascal',
    'Thierry',
    'Bruno',
    'Daniel',
    'Alain',
    'Bernard',
    'Marc',
    'Christian',
    'Gérard',
    'André',
    'Henri',
    'Jacques',
    'Louis',
    'Maxime',
    'Lucas',
    'Hugo',
    'Paul',
    'Arthur',
    'Raphaël',
    'Mathis',
    'Nathan',
    'Romain',
    'Clément',
    'Quentin',
    'Florian',
    'Adrien',
    'Benjamin',
    'Guillaume',
    'Valentin',
    'Jérôme',
    'Matthieu',
    'Benoît',
    'Cédric',
    'Ludovic',
    'Damien',
    'Fabien',
    'Grégory',
    'Arnaud',
    'Yves',
  ],
  female: [
    'Marie',
    'Sophie',
    'Catherine',
    'Isabelle',
    'Anne',
    'Nathalie',
    'Sylvie',
    'Céline',
    'Julie',
    'Valérie',
    'Christine',
    'Sandrine',
    'Caroline',
    'Stéphanie',
    'Émilie',
    'Aurélie',
    'Camille',
    'Laure',
    'Virginie',
    'Delphine',
    'Martine',
    'Véronique',
    'Hélène',
    'Monique',
    'Françoise',
    'Agnès',
    'Brigitte',
    'Dominique',
    'Jacqueline',
    'Danielle',
    'Emma',
    'Léa',
    'Chloé',
    'Manon',
    'Sarah',
    'Clara',
    'Laura',
    'Anaïs',
    'Pauline',
    'Marine',
    'Charlotte',
    'Lucie',
    'Louise',
    'Alice',
    'Juliette',
    'Océane',
    'Margot',
    'Zoé',
    'Élise',
    'Marion',
    'Mathilde',
    'Alexandra',
    'Florence',
    'Nicole',
    'Patricia',
    'Élisabeth',
    'Laurence',
    'Corinne',
    'Karine',
    'Élodie',
  ],
  lastNames: [
    'Martin',
    'Bernard',
    'Dubois',
    'Thomas',
    'Robert',
    'Richard',
    'Petit',
    'Durand',
    'Leroy',
    'Moreau',
    'Simon',
    'Laurent',
    'Lefebvre',
    'Michel',
    'Garcia',
    'Roux',
    'Vincent',
    'Fournier',
    'Morel',
    'Girard',
    'André',
    'Lefevre',
    'Mercier',
    'Dupont',
    'Lambert',
    'Bonnet',
    'François',
    'Martinez',
    'Legrand',
    'Garnier',
  ],
};

// Germanic (Germany/Austria…)
const NAMES_DE: NameData = {
  male: ['Hans', 'Peter', 'Wolfgang', 'Klaus', 'Jürgen', 'Michael', 'Dieter', 'Horst', 'Werner', 'Karl', 'Helmut', 'Manfred', 'Heinz', 'Günter', 'Otto', 'Friedrich', 'Heinrich', 'Franz', 'Josef', 'Georg', 'Thomas', 'Andreas', 'Stefan', 'Christian', 'Martin', 'Markus', 'Alexander', 'Sebastian', 'Tobias', 'Matthias', 'Florian', 'Daniel', 'Maximilian', 'Felix', 'Lukas', 'Jan', 'Paul', 'Leon', 'Jonas', 'Moritz', 'David', 'Simon', 'Niklas', 'Tim', 'Philipp', 'Fabian', 'Benjamin', 'Erik', 'Marco', 'Sven', 'Oliver', 'Christoph', 'Robert', 'Ralf', 'Uwe', 'Bernd', 'Frank', 'Rainer', 'Joachim', 'Gerhard'],
  female: ['Anna', 'Emma', 'Sophia', 'Mia', 'Hannah', 'Lena', 'Lea', 'Marie', 'Sophie', 'Laura', 'Lisa', 'Julia', 'Katharina', 'Sarah', 'Melanie', 'Christina', 'Nicole', 'Stefanie', 'Andrea', 'Sandra', 'Petra', 'Sabine', 'Claudia', 'Martina', 'Birgit', 'Gabriele', 'Monika', 'Ursula', 'Helga', 'Ingrid', 'Johanna', 'Amelie', 'Charlotte', 'Emilia', 'Nele', 'Paula', 'Lina', 'Maja', 'Luisa', 'Elena', 'Clara', 'Greta', 'Frieda', 'Ida', 'Ella', 'Mila', 'Isabelle', 'Victoria', 'Alina', 'Nina', 'Vanessa', 'Michelle', 'Jennifer', 'Jessica', 'Jasmin', 'Anja', 'Nadine', 'Simone', 'Karin', 'Heike'],
  lastNames: ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann', 'Schäfer', 'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf', 'Schröder', 'Neumann', 'Schwarz', 'Zimmermann', 'Braun', 'Krüger', 'Hofmann', 'Hartmann', 'Lange', 'Schmitt', 'Werner', 'Schmitz', 'Krause', 'Meier'],
};

// Spanish-speaking
const NAMES_ES: NameData = {
  male: ['Antonio', 'José', 'Manuel', 'Francisco', 'Juan', 'David', 'José Antonio', 'José Luis', 'Jesús', 'Javier', 'Carlos', 'Miguel', 'Pedro', 'Alejandro', 'Fernando', 'Pablo', 'Jorge', 'Luis', 'Sergio', 'Rafael', 'Ángel', 'Daniel', 'Andrés', 'Enrique', 'Diego', 'Alberto', 'Raúl', 'Ramón', 'Vicente', 'Rubén', 'Adrián', 'Ignacio', 'Álvaro', 'Marcos', 'Óscar', 'Gonzalo', 'Mario', 'Hugo', 'Iván', 'Martín', 'Santiago', 'Rodrigo', 'Mateo', 'Nicolás', 'Sebastián', 'Lucas', 'Emilio', 'Joaquín', 'Gabriel', 'Jaime', 'Ricardo', 'Tomás', 'Felipe', 'Lorenzo', 'Cristian', 'Víctor', 'Julio', 'Agustín', 'Guillermo', 'Alfredo'],
  female: ['María', 'Carmen', 'Josefa', 'Isabel', 'Dolores', 'Pilar', 'Teresa', 'Ana', 'Francisca', 'Laura', 'Cristina', 'Marta', 'Rosa', 'Antonia', 'Lucía', 'Elena', 'Patricia', 'Sara', 'Paula', 'Raquel', 'Beatriz', 'Mercedes', 'Ángela', 'Silvia', 'Rocío', 'Inmaculada', 'Mónica', 'Susana', 'Encarnación', 'Concepción', 'Sofía', 'Andrea', 'Julia', 'Natalia', 'Alba', 'Irene', 'Marina', 'Claudia', 'Nuria', 'Alicia', 'Eva', 'Victoria', 'Blanca', 'Alejandra', 'Carolina', 'Daniela', 'Martina', 'Carla', 'Valentina', 'Emma', 'Nerea', 'Lorena', 'Esther', 'Yolanda', 'Amparo', 'Catalina', 'Margarita', 'Adriana', 'Manuela', 'Gloria'],
  lastNames: ['García', 'Rodríguez', 'González', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Martín', 'Jiménez', 'Ruiz', 'Hernández', 'Díaz', 'Moreno', 'Muñoz', 'Álvarez', 'Romero', 'Alonso', 'Gutiérrez', 'Navarro', 'Torres', 'Domínguez', 'Vázquez', 'Ramos', 'Gil', 'Ramírez', 'Serrano', 'Blanco', 'Molina'],
};

// South-East Asia (Thai-like)
const NAMES_SE_ASIA: NameData = {
  male: ['Somchai', 'Somsak', 'Sompong', 'Wichai', 'Niran', 'Kitti', 'Prasert', 'Surachai', 'Thana', 'Amnuay', 'Chaiwat', 'Suchart', 'Somboon', 'Viroj', 'Pongpat', 'Anucha', 'Adisak', 'Boonmee', 'Chatchai', 'Decha', 'Ekkachai', 'Manop', 'Narongsak', 'Paitoon', 'Prachuap', 'Sanit', 'Somkid', 'Suphot', 'Thawee', 'Thawin', 'Vichai', 'Wanchai', 'Yuttana', 'Sitthichai', 'Kamol', 'Kritsada', 'Narong', 'Phichai', 'Preecha', 'Sawat', 'Songkran', 'Suwat', 'Thawatchai', 'Weera', 'Yingyot', 'Anupong', 'Buncha', 'Chokchai', 'Damrong', 'Ekarat'],
  female: ['Siriwan', 'Somying', 'Malee', 'Nida', 'Pranee', 'Siriporn', 'Urai', 'Apinya', 'Wassana', 'Suda', 'Anchalee', 'Busaba', 'Chutima', 'Duangrat', 'Kanda', 'Kanokwan', 'Malai', 'Nittaya', 'Pattama', 'Porn', 'Preeyaporn', 'Ratana', 'Sangdao', 'Somjit', 'Sumalee', 'Supaporn', 'Thida', 'Wandee', 'Wilai', 'Yupa', 'Chanida', 'Orapin', 'Pimchanok', 'Pensri', 'Rungnapa', 'Saowalak', 'Suchada', 'Suwanna', 'Tippawan', 'Wipaporn', 'Yingluck', 'Areerat', 'Bussaya', 'Chalida', 'Dararat', 'Jintana', 'Kraisorn', 'Lalita', 'Manee', 'Narissara'],
  lastNames: ['Saetang', 'Chokchai', 'Rattana', 'Siriwan', 'Prasert', 'Niran', 'Chaiyaporn', 'Somchai', 'Wichai', 'Thana', 'Boonmee', 'Changklang', 'Daengsawat', 'Intharaprasert', 'Jitpakdee', 'Kamolrat', 'Lertsuk', 'Mongkolsawat', 'Nakpradid', 'Phongphan', 'Rattanasak', 'Sawatdee', 'Techamuanvivit', 'Usawang', 'Wongsawat', 'Yodprasert', 'Anurak', 'Boonsong', 'Chantawong'],
};

// China-like
const NAMES_CN: NameData = {
  male: ['Wei', 'Ming', 'Jun', 'Feng', 'Lei', 'Bo', 'Jian', 'Peng', 'Yang', 'Hao', 'Tao', 'Gang', 'Qiang', 'Long', 'Bin', 'Chao', 'Hui', 'Dong', 'Cheng', 'Kai', 'Yong', 'Xiang', 'Yu', 'Jie', 'Tian', 'Xin', 'Rui', 'Han', 'Wen', 'Lin', 'Kun', 'Yan', 'Xing', 'Sheng', 'Zhi', 'Yuan', 'Zhen', 'Zheng', 'Shuai', 'Chen', 'Jin', 'Jing', 'Liang', 'Yun', 'Ning', 'Quan', 'Sen', 'Hai', 'Song', 'Biao', 'Guang', 'Zhong', 'Hong', 'Jiang', 'Xiao', 'Guo', 'Zhe', 'Tong', 'Cong', 'Yue'],
  female: ['Li', 'Yan', 'Fang', 'Jing', 'Xiu', 'Hua', 'Mei', 'Na', 'Ying', 'Min', 'Xia', 'Qing', 'Yue', 'Ling', 'Xin', 'Jie', 'Ping', 'Hong', 'Yu', 'Qian', 'Lan', 'Rong', 'Juan', 'Lin', 'Hui', 'Wen', 'Yun', 'Xuan', 'Ning', 'Shu', 'Shan', 'Ya', 'Xiao', 'Chun', 'Qiu', 'Xiang', 'Jia', 'Zhen', 'Yao', 'Ru', 'Lu', 'Meng', 'Bei', 'Xi', 'Yi', 'Dan', 'Tong', 'Yin', 'Jie', 'Han', 'Xue', 'Jin', 'Cui', 'Zhu', 'Feng', 'Rou', 'Man', 'Wan', 'Qiong', 'Pei'],
  lastNames: ['Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Huang', 'Zhao', 'Wu', 'Zhou', 'Xu', 'Sun', 'Ma', 'Zhu', 'Hu', 'Guo', 'He', 'Gao', 'Lin', 'Luo', 'Zheng', 'Liang', 'Xie', 'Song', 'Tang', 'Xu', 'Han', 'Feng', 'Deng', 'Cao'],
};

// Japan
const NAMES_JP: NameData = {
  male: ['Hiroshi', 'Takeshi', 'Kenji', 'Yuki', 'Taro', 'Koji', 'Masao', 'Akira', 'Satoshi', 'Kazuo', 'Makoto', 'Takashi', 'Yasushi', 'Shigeru', 'Tetsuya', 'Minoru', 'Osamu', 'Katsuhiko', 'Yoshio', 'Kazuhiro', 'Daisuke', 'Yusuke', 'Masahiro', 'Takuya', 'Ryota', 'Shota', 'Daiki', 'Kenta', 'Yuta', 'Ryo', 'Naoki', 'Tomoya', 'Hayato', 'Haruto', 'Sota', 'Kaito', 'Yusei', 'Ren', 'Hinata', 'Riku', 'Sora', 'Haruki', 'Ryusei', 'Taiga', 'Yamato', 'Aoi', 'Riku', 'Haruma', 'Koichi', 'Shinji', 'Masaru', 'Isao', 'Tadashi', 'Noboru', 'Hideaki', 'Toshiyuki', 'Kazuki', 'Yoshihiro', 'Kenichi', 'Ryuichi'],
  female: ['Yuki', 'Haruka', 'Sakura', 'Aiko', 'Yui', 'Rei', 'Hana', 'Nanami', 'Mio', 'Riko', 'Keiko', 'Kumiko', 'Naomi', 'Yoshiko', 'Noriko', 'Junko', 'Sachiko', 'Yoko', 'Tomoko', 'Kyoko', 'Akiko', 'Emi', 'Megumi', 'Ayumi', 'Aya', 'Miho', 'Asuka', 'Nao', 'Mai', 'Kana', 'Shiori', 'Saki', 'Ai', 'Miki', 'Yuka', 'Rina', 'Sayaka', 'Miyu', 'Ayaka', 'Momoka', 'Honoka', 'Saya', 'Airi', 'Kaho', 'Misaki', 'Natsuki', 'Rena', 'Hinata', 'Sara', 'Yuna', 'Risa', 'Kaori', 'Mayumi', 'Rie', 'Chihiro', 'Hitomi', 'Mizuki', 'Wakana', 'Yuri', 'Haruna'],
  lastNames: ['Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Kato', 'Yoshida', 'Yamada', 'Sasaki', 'Yamaguchi', 'Saito', 'Matsumoto', 'Inoue', 'Kimura', 'Hayashi', 'Shimizu', 'Yamazaki', 'Mori', 'Abe', 'Ikeda', 'Hashimoto', 'Yamashita', 'Ishikawa', 'Nakajima', 'Maeda', 'Fujita'],
};

// India / South Asia (Hindi)
const NAMES_IN: NameData = {
  male: ['Raj', 'Amit', 'Rahul', 'Arun', 'Vijay', 'Suresh', 'Ravi', 'Sanjay', 'Anand', 'Ashok', 'Rajesh', 'Manoj', 'Santosh', 'Deepak', 'Ajay', 'Vishal', 'Nitin', 'Rakesh', 'Sachin', 'Prakash', 'Vinod', 'Mahesh', 'Ramesh', 'Anil', 'Mukesh', 'Sunil', 'Dinesh', 'Pankaj', 'Gaurav', 'Rohit', 'Vikas', 'Naveen', 'Kiran', 'Akhil', 'Arjun', 'Dev', 'Krishna', 'Yash', 'Rohan', 'Akash', 'Varun', 'Karan', 'Vivek', 'Manish', 'Yogesh', 'Prem', 'Amar', 'Harsh', 'Kunal', 'Sahil', 'Sumit', 'Ankit', 'Bharat', 'Mohan', 'Gopal', 'Shyam', 'Hari', 'Naresh', 'Ramesh', 'Lokesh'],
  female: ['Priya', 'Anjali', 'Pooja', 'Neha', 'Rani', 'Sunita', 'Kavita', 'Deepa', 'Rekha', 'Sita', 'Meera', 'Geeta', 'Rita', 'Anita', 'Nisha', 'Kiran', 'Lata', 'Madhuri', 'Savita', 'Shanti', 'Vidya', 'Sangita', 'Poonam', 'Ritu', 'Nitu', 'Seema', 'Sarita', 'Manju', 'Asha', 'Usha', 'Divya', 'Ruchi', 'Sonal', 'Preeti', 'Swati', 'Sapna', 'Nidhi', 'Jyoti', 'Rupa', 'Maya', 'Sushma', 'Shweta', 'Sneha', 'Anushka', 'Ishita', 'Simran', 'Tanya', 'Aishwarya', 'Shraddha', 'Pallavi', 'Rashmi', 'Vandana', 'Vaishali', 'Komal', 'Naina', 'Radhika', 'Bhavana', 'Lakshmi', 'Saraswati', 'Durga'],
  lastNames: ['Patel', 'Kumar', 'Singh', 'Sharma', 'Shah', 'Gupta', 'Reddy', 'Iyer', 'Nair', 'Rao', 'Verma', 'Joshi', 'Mehta', 'Desai', 'Kapoor', 'Malhotra', 'Agarwal', 'Banerjee', 'Chatterjee', 'Mishra', 'Pandey', 'Yadav', 'Sinha', 'Bose', 'Chopra', 'Das', 'Ghosh', 'Menon', 'Pillai', 'Bhatt'],
};

// Anglophone (US/UK/Canada…)
const NAMES_EN: NameData = {
  male: ['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Christopher', 'Charles', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald', 'Steven', 'Paul', 'Andrew', 'Joshua', 'Kenneth', 'Kevin', 'Brian', 'George', 'Edward', 'Ronald', 'Timothy', 'Jason', 'Jeffrey', 'Ryan', 'Jacob', 'Gary', 'Nicholas', 'Eric', 'Jonathan', 'Stephen', 'Larry', 'Justin', 'Scott', 'Brandon', 'Benjamin', 'Samuel', 'Raymond', 'Gregory', 'Alexander', 'Patrick', 'Frank', 'Dennis', 'Jerry', 'Tyler', 'Aaron', 'Jose', 'Adam', 'Henry', 'Nathan', 'Douglas', 'Zachary', 'Peter', 'Kyle', 'Walter'],
  female: ['Mary', 'Patricia', 'Jennifer', 'Linda', 'Barbara', 'Elizabeth', 'Susan', 'Jessica', 'Sarah', 'Karen', 'Nancy', 'Lisa', 'Margaret', 'Betty', 'Sandra', 'Ashley', 'Dorothy', 'Kimberly', 'Emily', 'Donna', 'Michelle', 'Carol', 'Amanda', 'Melissa', 'Deborah', 'Stephanie', 'Rebecca', 'Laura', 'Sharon', 'Cynthia', 'Kathleen', 'Amy', 'Shirley', 'Angela', 'Helen', 'Anna', 'Brenda', 'Pamela', 'Nicole', 'Emma', 'Samantha', 'Katherine', 'Christine', 'Debra', 'Rachel', 'Catherine', 'Carolyn', 'Janet', 'Ruth', 'Maria', 'Heather', 'Diane', 'Virginia', 'Julie', 'Joyce', 'Victoria', 'Olivia', 'Kelly', 'Christina', 'Lauren'],
  lastNames: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'],
};

// Portuguese-speaking
const NAMES_PT: NameData = {
  male: ['José', 'João', 'Antonio', 'Francisco', 'Carlos', 'Paulo', 'Pedro', 'Lucas', 'Luiz', 'Marcos', 'Luis', 'Gabriel', 'Rafael', 'Daniel', 'Marcelo', 'Bruno', 'Rodrigo', 'Felipe', 'Matheus', 'Gustavo', 'Diego', 'Leonardo', 'Fernando', 'Fábio', 'Ricardo', 'André', 'Thiago', 'Renato', 'Roberto', 'Alexandre', 'Vitor', 'Vinícius', 'Henrique', 'Guilherme', 'Leandro', 'Eduardo', 'Maurício', 'César', 'Sérgio', 'Júlio', 'Caio', 'Bernardo', 'Arthur', 'Miguel', 'Davi', 'Enzo', 'Lorenzo', 'Joaquim', 'Raul', 'Samuel', 'Manuel', 'Tiago', 'Rui', 'Vítor', 'Diogo', 'Hugo', 'Nuno', 'Gonçalo', 'Afonso', 'Martim'],
  female: ['Maria', 'Ana', 'Francisca', 'Antonia', 'Adriana', 'Juliana', 'Marcia', 'Fernanda', 'Patricia', 'Aline', 'Camila', 'Carla', 'Renata', 'Sandra', 'Beatriz', 'Amanda', 'Bruna', 'Natália', 'Larissa', 'Bianca', 'Letícia', 'Gabriela', 'Tatiana', 'Raquel', 'Vanessa', 'Luciana', 'Cristina', 'Daniela', 'Mônica', 'Simone', 'Priscila', 'Helena', 'Isabela', 'Mariana', 'Luiza', 'Sofia', 'Alice', 'Laura', 'Manuela', 'Lívia', 'Valentina', 'Giovanna', 'Carolina', 'Clara', 'Melissa', 'Débora', 'Jéssica', 'Catarina', 'Inês', 'Leonor', 'Matilde', 'Marta', 'Rita', 'Joana', 'Teresa', 'Sara', 'Lúcia', 'Cláudia', 'Paula', 'Isabel'],
  lastNames: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Rocha', 'Almeida', 'Nascimento', 'Araújo', 'Fernandes', 'Sousa', 'Barbosa', 'Monteiro', 'Mendes', 'Cardoso', 'Dias', 'Castro', 'Correia', 'Teixeira', 'Lopes', 'Marques'],
};

// Arab / Maghreb
const NAMES_MA: NameData = {
  male: ['Mohamed', 'Ahmed', 'Ali', 'Hassan', 'Omar', 'Youssef', 'Khalid', 'Said', 'Rachid', 'Abdelaziz', 'Karim', 'Amine', 'Hamza', 'Mehdi', 'Nabil', 'Sofiane', 'Bilal', 'Tarek', 'Adel', 'Farid', 'Samir', 'Walid', 'Mourad', 'Hicham', 'Nasser', 'Jamal', 'Mahmoud', 'Ibrahim', 'Mustafa', 'Abdullah', 'Anwar', 'Faisal', 'Tariq', 'Salim', 'Rami', 'Ziad', 'Basel', 'Marwan', 'Imad', 'Yassin', 'Reda', 'Anas', 'Oussama', 'Zakaria', 'Ismail', 'Ayoub', 'Abderrahim', 'Abdallah', 'Aziz', 'Hakim', 'Malik', 'Yassine', 'Fouad', 'Hadi', 'Sami', 'Amr', 'Rayan', 'Amir', 'Majid', 'Nizar'],
  female: ['Fatima', 'Aicha', 'Khadija', 'Malika', 'Samira', 'Hafsa', 'Zineb', 'Imane', 'Salma', 'Meryem', 'Nora', 'Amina', 'Yasmine', 'Laila', 'Houda', 'Siham', 'Soumaya', 'Latifa', 'Rajae', 'Nawal', 'Sara', 'Hanane', 'Karima', 'Loubna', 'Ghizlane', 'Wafa', 'Btissam', 'Rim', 'Hind', 'Lamia', 'Mona', 'Aya', 'Dina', 'Rania', 'Hana', 'Nada', 'Lina', 'Maya', 'Rana', 'Sana', 'Jana', 'Ines', 'Dalia', 'Nour', 'Hala', 'Farah', 'Lara', 'Leila', 'Zainab', 'Marwa', 'Noura', 'Asma', 'Souad', 'Nabila', 'Jamila', 'Basma', 'Dounia', 'Ibtissam', 'Widad', 'Zahra'],
  lastNames: ['Alami', 'Benjelloun', 'El Amrani', 'Bennis', 'Cherkaoui', 'Idrissi', 'Tazi', 'Fassi', 'El Mansouri', 'Bennani', 'Alaoui', 'Berrada', 'El Fassi', 'Zahiri', 'Sefrioui', 'Filali', 'Zniber', 'Kettani', 'Lahlou', 'Chraibi', 'El Ouafi', 'Hamdaoui', 'Boussaid', 'Naciri', 'Tahiri', 'Sbihi', 'Lamrani', 'Azizi', 'Benchekroun', 'Mountassir'],
};

// Italian / Mediterranean
const NAMES_IT: NameData = {
  male: ['Marco', 'Luca', 'Giuseppe', 'Francesco', 'Antonio', 'Matteo', 'Alessandro', 'Andrea', 'Stefano', 'Paolo', 'Giovanni', 'Lorenzo', 'Davide', 'Simone', 'Federico', 'Riccardo', 'Gabriele', 'Alessio', 'Michele', 'Roberto', 'Nicola', 'Daniele', 'Filippo', 'Tommaso', 'Salvatore', 'Vincenzo', 'Angelo', 'Pietro', 'Emanuele', 'Gianluca', 'Massimo', 'Fabio', 'Cristiano', 'Claudio', 'Sergio', 'Diego', 'Leonardo', 'Enrico', 'Giacomo', 'Manuel', 'Domenico', 'Pasquale', 'Gianni', 'Raffaele', 'Maurizio', 'Carlo', 'Alberto', 'Luigi', 'Aldo', 'Mauro', 'Giancarlo', 'Giorgio', 'Mario', 'Umberto', 'Edoardo', 'Ettore', 'Giulio', 'Mattia', 'Samuele', 'Valerio'],
  female: ['Maria', 'Giulia', 'Francesca', 'Chiara', 'Sara', 'Elena', 'Alessia', 'Martina', 'Valentina', 'Laura', 'Silvia', 'Elisa', 'Federica', 'Giorgia', 'Lucia', 'Anna', 'Roberta', 'Simona', 'Serena', 'Paola', 'Barbara', 'Claudia', 'Monica', 'Stefania', 'Emanuela', 'Cristina', 'Daniela', 'Giovanna', 'Antonella', 'Patrizia', 'Elisabetta', 'Ilaria', 'Veronica', 'Alessandra', 'Alice', 'Sofia', 'Beatrice', 'Aurora', 'Camilla', 'Arianna', 'Ginevra', 'Matilde', 'Emma', 'Greta', 'Cecilia', 'Chiara', 'Vittoria', 'Isabella', 'Ludovica', 'Viola', 'Carla', 'Gabriella', 'Rosa', 'Angela', 'Giuseppina', 'Caterina', 'Teresa', 'Nicoletta', 'Valeria', 'Marta'],
  lastNames: ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti', 'De Luca', 'Costa', 'Giordano', 'Mancini', 'Rizzo', 'Lombardi', 'Moretti', 'Barbieri', 'Fontana', 'Santoro', 'Mariani', 'Rinaldi', 'Caruso', 'Ferrara', 'Galli', 'Martini', 'Leone'],
};

// Nordic / Northern Europe
const NAMES_NORDIC: NameData = {
  male: ['Lars', 'Ola', 'Kjetil', 'Erik', 'Mikael', 'Jonas', 'Kasper', 'Henrik', 'Anders', 'Nils', 'Per', 'Ole', 'Jan', 'Bjørn', 'Svein', 'Magnus', 'Tor', 'Gunnar', 'Geir', 'Rune', 'Arne', 'Petter', 'Kristian', 'Martin', 'Thomas', 'Fredrik', 'Alexander', 'Emil', 'Oscar', 'William', 'Lucas', 'Oliver', 'Filip', 'Noah', 'Liam', 'Viktor', 'Elias', 'Sebastian', 'Axel', 'Gustav', 'Isak', 'Leo', 'Anton', 'Hugo', 'Theodor', 'Adam', 'Ludvig', 'Benjamin', 'Samuel', 'Alfred', 'Sven', 'Olof', 'Karl', 'Johan', 'Mats', 'Stefan', 'Peter', 'Niklas', 'Daniel', 'Patrik'],
  female: ['Anna', 'Sara', 'Ingrid', 'Helena', 'Kaja', 'Linnea', 'Maja', 'Sofia', 'Ida', 'Emilie', 'Emma', 'Julia', 'Maria', 'Elisabeth', 'Karin', 'Lena', 'Eva', 'Kristina', 'Malin', 'Hanna', 'Jenny', 'Linda', 'Johanna', 'Elin', 'Amanda', 'Camilla', 'Cecilia', 'Frida', 'Josefin', 'Matilda', 'Nora', 'Elin', 'Wilma', 'Alma', 'Ella', 'Alva', 'Alice', 'Elsa', 'Ebba', 'Olivia', 'Astrid', 'Saga', 'Freja', 'Agnes', 'Klara', 'Selma', 'Stella', 'Signe', 'Liv', 'Tuva', 'Thea', 'Hedda', 'Ingeborg', 'Solveig', 'Greta', 'Elise', 'Mia', 'Anja', 'Berit', 'Tone'],
  lastNames: ['Johansson', 'Andersen', 'Hansen', 'Larsen', 'Nielsen', 'Berg', 'Lund', 'Haug', 'Olsen', 'Persson', 'Andersson', 'Karlsson', 'Nilsson', 'Eriksson', 'Jensen', 'Pedersen', 'Christensen', 'Sørensen', 'Møller', 'Rasmussen', 'Johansen', 'Kristensen', 'Petersen', 'Madsen', 'Thomsen', 'Lindberg', 'Holm', 'Dahl', 'Berglund', 'Sundberg'],
};

// Eastern Slavic
const NAMES_SLAVIC_EAST: NameData = {
  male: ['Ivan', 'Oleg', 'Dmitri', 'Sergei', 'Alexei', 'Nikolai', 'Andrei', 'Vladimir', 'Yuri', 'Mikhail', 'Pavel', 'Boris', 'Viktor', 'Konstantin', 'Evgeny', 'Maxim', 'Roman', 'Artem', 'Kirill', 'Denis', 'Anton', 'Stanislav', 'Vadim', 'Anatoly', 'Grigory', 'Leonid', 'Valentin', 'Ruslan', 'Gleb', 'Timur', 'Ilya', 'Fyodor', 'Egor', 'Daniil', 'Matvey', 'Alexander', 'Petr', 'Yaroslav', 'Stepan', 'Vitaly', 'Vasily', 'Gennady', 'Semyon', 'Rostislav', 'Zakhar', 'Lev', 'Marat', 'Timofey', 'Georgiy', 'Arkady', 'Savva', 'Arseniy', 'Platon', 'Makar', 'Yegor', 'Bogdan', 'Svyatoslav', 'Miroslav', 'Vladislav', 'Yaromir'],
  female: ['Anna', 'Olga', 'Tatiana', 'Natalia', 'Irina', 'Svetlana', 'Elena', 'Maria', 'Galina', 'Yulia', 'Ekaterina', 'Anastasia', 'Daria', 'Viktoria', 'Valentina', 'Larisa', 'Ludmila', 'Vera', 'Nina', 'Oksana', 'Marina', 'Alina', 'Kristina', 'Polina', 'Arina', 'Sofya', 'Varvara', 'Alexandra', 'Kira', 'Diana', 'Milana', 'Vlada', 'Yelizaveta', 'Valeriya', 'Angelina', 'Margarita', 'Ulyana', 'Kseniya', 'Yekaterina', 'Nadezhda', 'Lyubov', 'Tamara', 'Raisa', 'Zoya', 'Alla', 'Inna', 'Lyudmila', 'Antonina', 'Zinaida', 'Klavdiya', 'Emiliya', 'Alyona', 'Alisa', 'Zlata', 'Eva', 'Maya', 'Veronika', 'Liliya', 'Yuliana', 'Evelina'],
  lastNames: ['Ivanov', 'Petrov', 'Sidorov', 'Smirnov', 'Kuznetsov', 'Popov', 'Sokolov', 'Orlov', 'Volkov', 'Fedorov', 'Lebedev', 'Kozlov', 'Novikov', 'Morozov', 'Vasiliev', 'Mikhailov', 'Pavlov', 'Alekseev', 'Yakovlev', 'Grigoriev', 'Romanov', 'Vorobiev', 'Sergeev', 'Egorov', 'Zakharov', 'Korolev', 'Belov', 'Medvedev', 'Andreev', 'Nikitin'],
};

// Southern Slavic / Balkans
const NAMES_SLAVIC_SOUTH: NameData = {
  male: ['Marko', 'Nikola', 'Milos', 'Stefan', 'Branislav', 'Dusan', 'Goran', 'Zoran', 'Jovan', 'Petar', 'Milan', 'Aleksandar', 'Dragan', 'Bojan', 'Vladimir', 'Igor', 'Nemanja', 'Filip', 'Luka', 'Matej', 'Dejan', 'Srdjan', 'Predrag', 'Nebojsa', 'Darko', 'Slavko', 'Bosko', 'Zdravko', 'Mirko', 'Rajko', 'Radovan', 'Slobodan', 'Tomislav', 'Srecko', 'Zlatko', 'Ognjen', 'Uros', 'Andrija', 'Vuk', 'Pavle', 'Miodrag', 'Vojislav', 'Radomir', 'Milenko', 'Stojan', 'Mihailo', 'Danilo', 'Novak', 'Bozidar', 'Radoslav', 'Stanko', 'Velimir', 'Zeljko', 'Branko', 'Mladen', 'Sasa', 'Sinisa', 'Rade', 'Ljubomir', 'Vlade'],
  female: ['Marija', 'Ana', 'Milica', 'Jelena', 'Katarina', 'Ivana', 'Dragana', 'Sanja', 'Natasa', 'Tamara', 'Jovana', 'Aleksandra', 'Snezana', 'Vesna', 'Jasmina', 'Svetlana', 'Gordana', 'Zorica', 'Biljana', 'Tatjana', 'Maja', 'Nina', 'Sara', 'Teodora', 'Anastasija', 'Sofija', 'Andjela', 'Lena', 'Marta', 'Petra', 'Kristina', 'Nikolina', 'Danijela', 'Slavica', 'Radmila', 'Milena', 'Ljiljana', 'Mirjana', 'Dusanka', 'Branka', 'Danica', 'Olivera', 'Nevena', 'Isidora', 'Dunja', 'Tanja', 'Dijana', 'Jovanka', 'Slavka', 'Vera', 'Zorka', 'Mira', 'Stana', 'Rada', 'Nada', 'Slobodanka', 'Vidosava', 'Kosara', 'Desa', 'Jela'],
  lastNames: ['Petrovic', 'Jovanovic', 'Markovic', 'Nikolic', 'Stojanovic', 'Ilic', 'Kovacevic', 'Tomic', 'Milosevic', 'Pavlovic', 'Djordjevic', 'Popovic', 'Stankovic', 'Zivkovic', 'Radovanovic', 'Savic', 'Kostic', 'Simic', 'Mitic', 'Lukic', 'Ristic', 'Lazic', 'Antic', 'Djukic', 'Vasic', 'Panic', 'Miletic', 'Stevanovic', 'Tasic', 'Novakovic'],
};

// Africa anglophone
const NAMES_AFRICA_EN: NameData = {
  male: ['John', 'Michael', 'Samuel', 'David', 'Peter', 'Daniel', 'Joseph', 'Paul', 'Emmanuel', 'James', 'Isaac', 'Moses', 'Solomon', 'Joshua', 'Benjamin', 'Matthew', 'Stephen', 'Patrick', 'Thomas', 'Charles', 'Francis', 'George', 'Anthony', 'Andrew', 'Philip', 'Simon', 'Christopher', 'Timothy', 'Mark', 'Luke', 'Abraham', 'Elijah', 'Nathaniel', 'Jacob', 'Jonathan', 'Aaron', 'Caleb', 'Noah', 'Adam', 'Robert', 'William', 'Richard', 'Edward', 'Henry', 'Albert', 'Felix', 'Victor', 'Vincent', 'Lawrence', 'Martin', 'Bernard', 'Augustine', 'Francis', 'Dennis', 'Kenneth', 'Gerald', 'Brian', 'Kevin', 'Eric', 'Steven'],
  female: ['Grace', 'Mary', 'Esther', 'Sarah', 'Ruth', 'Mercy', 'Joy', 'Elizabeth', 'Naomi', 'Deborah', 'Hannah', 'Rebecca', 'Rachel', 'Martha', 'Judith', 'Faith', 'Hope', 'Charity', 'Peace', 'Patience', 'Comfort', 'Blessing', 'Gift', 'Precious', 'Princess', 'Rose', 'Lillian', 'Lucy', 'Margaret', 'Catherine', 'Patricia', 'Jennifer', 'Janet', 'Agnes', 'Alice', 'Florence', 'Beatrice', 'Joyce', 'Dorothy', 'Eunice', 'Lydia', 'Miriam', 'Dorcas', 'Anna', 'Eva', 'Abigail', 'Victoria', 'Gloria', 'Josephine', 'Christine', 'Susan', 'Helen', 'Jane', 'Emily', 'Emma', 'Sophia', 'Olivia', 'Isabella', 'Amelia', 'Charlotte'],
  lastNames: ['Mensah', 'Okafor', 'Abebe', 'Kamau', 'Okoro', 'Diallo', 'Sissoko', 'Hassan', 'Aden', 'Ncube', 'Mwangi', 'Ochieng', 'Mutua', 'Wanjiru', 'Kipchoge', 'Nkrumah', 'Adeyemi', 'Oluwaseun', 'Chukwu', 'Eze', 'Nwosu', 'Onwuamaegbu', 'Akinola', 'Adeleke', 'Taiwo', 'Babatunde', 'Chinedu', 'Emeka', 'Chioma', 'Ngozi'],
};

// Africa francophone
const NAMES_AFRICA_FR: NameData = {
  male: ['Moussa', 'Ibrahim', 'Abdoulaye', 'Ousmane', 'Cheikh', 'Mamadou', 'Amadou', 'Issa', 'Aliou', 'Souleymane', 'Ibrahima', 'Seydou', 'Modou', 'Lamine', 'Boubacar', 'Samba', 'Demba', 'Mbacke', 'Alioune', 'Babacar', 'Malick', 'Khadim', 'Moustapha', 'Omar', 'Youssouf', 'Adama', 'Boubou', 'Bakary', 'Saliou', 'Pape', 'Mor', 'Fallou', 'Thierno', 'El Hadji', 'Serigne', 'Daouda', 'Yaya', 'Younous', 'Habib', 'Mansour', 'Khalifa', 'Assane', 'Sidy', 'Ndongo', 'Massamba', 'Pathé', 'Moctar', 'Tidiane', 'Aboubakr', 'Mouhamed', 'Idrissa', 'Lansana', 'Fodé', 'Sékou', 'Alpha', 'Ibou', 'Lassana', 'Sidiki', 'Bangaly', 'Drissa'],
  female: ['Awa', 'Fatou', 'Aminata', 'Mariama', 'Kadija', 'Sokhna', 'Khady', 'Fanta', 'Astou', 'Binta', 'Aissatou', 'Awa', 'Ndèye', 'Rokhaya', 'Coumba', 'Dieynaba', 'Maimouna', 'Ramata', 'Ramatoulaye', 'Seynabou', 'Aida', 'Adja', 'Kiné', 'Bineta', 'Marème', 'Mame', 'Yacine', 'Nogaye', 'Amy', 'Oumou', 'Aïcha', 'Fatoumata', 'Dienaba', 'Anta', 'Salimata', 'Marietou', 'Ndeye', 'Penda', 'Sira', 'Hawa', 'Safiatou', 'Daba', 'Nafi', 'Oulimata', 'Nene', 'Maty', 'Seynaba', 'Adama', 'Kumba', 'Mareme', 'Aby', 'Ami', 'Assata', 'Mairame', 'Nabou', 'Saly', 'Thiaba', 'Yaye', 'Dior', 'Mousso'],
  lastNames: ['Diop', 'Ba', 'Ndiaye', 'Traoré', 'Diallo', 'Koné', 'Sy', 'Sarr', 'Cissé', 'Camara', 'Fall', 'Sow', 'Diouf', 'Gueye', 'Kane', 'Touré', 'Seck', 'Niang', 'Faye', 'Mbaye', 'Wade', 'Sané', 'Thiam', 'Cisse', 'Keita', 'Dieng', 'Senghor', 'Lô', 'Dia', 'Ndoye'],
};

// Persian (Iran / Tajikistan)
const NAMES_PERSIAN: NameData = {
  male: ['Ali', 'Hassan', 'Reza', 'Hossein', 'Mahmoud', 'Farid', 'Omid', 'Saeed', 'Amir', 'Javad', 'Mohammad', 'Ahmad', 'Mehdi', 'Abbas', 'Majid', 'Hamid', 'Masoud', 'Karim', 'Hadi', 'Mohsen', 'Behnam', 'Arash', 'Babak', 'Siavash', 'Keyvan', 'Kourosh', 'Dariush', 'Farhad', 'Parviz', 'Nader', 'Behrouz', 'Manouchehr', 'Houshang', 'Jamshid', 'Rostam', 'Ardeshir', 'Bahram', 'Shahrokh', 'Esmail', 'Yousef', 'Ebrahim', 'Nima', 'Pouya', 'Sina', 'Erfan', 'Amin', 'Armin', 'Ehsan', 'Vahid', 'Milad', 'Soheil', 'Kaveh', 'Peyman', 'Shahab', 'Danial', 'Arman', 'Saman', 'Navid', 'Bijan', 'Farzad'],
  female: ['Fatemeh', 'Zahra', 'Maryam', 'Sara', 'Leila', 'Nasrin', 'Parisa', 'Neda', 'Azadeh', 'Shirin', 'Mina', 'Elham', 'Mahsa', 'Sepideh', 'Arezou', 'Samira', 'Elaheh', 'Mahnaz', 'Farideh', 'Soheila', 'Marjan', 'Niloufar', 'Zohreh', 'Nahid', 'Simin', 'Mitra', 'Mahshid', 'Farzaneh', 'Haleh', 'Pari', 'Tahereh', 'Maliheh', 'Kobra', 'Shohreh', 'Mansoureh', 'Pouran', 'Sorayya', 'Parvin', 'Fariba', 'Mehri', 'Parvane', 'Roya', 'Yalda', 'Tina', 'Negar', 'Saba', 'Dorsa', 'Diana', 'Ghazal', 'Bahar', 'Elnaz', 'Sahar', 'Golnaz', 'Parastoo', 'Pegah', 'Yasmin', 'Sima', 'Homa', 'Farah', 'Laleh'],
  lastNames: ['Hosseini', 'Rezai', 'Rahimi', 'Karimi', 'Ahmadi', 'Jafari', 'Moradi', 'Farhadi', 'Ebrahimi', 'Nasseri', 'Mohammadi', 'Mousavi', 'Jamshidi', 'Hashemi', 'Sadeghi', 'Rostami', 'Kazemi', 'Bahrami', 'Azizi', 'Rahmani', 'Khosravi', 'Sharifi', 'Rashidi', 'Ghanbari', 'Mirzaei', 'Asadi', 'Heidari', 'Taheri', 'Shafiei', 'Salehi'],
};

// Turkic world
const NAMES_TURKIC: NameData = {
  male: ['Mehmet', 'Ahmet', 'Mustafa', 'Ali', 'Murat', 'Okan', 'Hakan', 'Yusuf', 'Emre', 'Burak', 'Kemal', 'Cem', 'Can', 'Serkan', 'Tolga', 'Onur', 'Barış', 'Erkan', 'Özgür', 'Deniz', 'Kerem', 'Oğuz', 'Selim', 'Alper', 'Taner', 'Volkan', 'Umut', 'Yasin', 'İbrahim', 'Hasan', 'Süleyman', 'İsmail', 'Ömer', 'Abdullah', 'Recep', 'Ramazan', 'Fatih', 'Mert', 'Kaan', 'Efe', 'Eren', 'Emir', 'Berat', 'Yiğit', 'Arda', 'Öznur', 'Serhat', 'Erdem', 'Koray', 'Gökhan', 'Turgut', 'Halil', 'Hikmet', 'Orhan', 'Cengiz', 'Aydın', 'Nuri', 'Engin', 'Uğur', 'İlhan'],
  female: ['Ayşe', 'Fatma', 'Zeynep', 'Elif', 'Merve', 'Esra', 'Hatice', 'Selin', 'Gül', 'Yasemin', 'Emine', 'Şerife', 'Sultan', 'Hüseyin', 'Cemile', 'Şule', 'Hacer', 'Zeliha', 'Sibel', 'Sevgi', 'Deniz', 'Aylin', 'Burcu', 'Derya', 'Gizem', 'İpek', 'Melis', 'Naz', 'Özlem', 'Pelin', 'Seda', 'Tuğba', 'Yeşim', 'Cansu', 'Duygu', 'Ebru', 'Funda', 'Hande', 'İrem', 'Nur', 'Özge', 'Serap', 'Filiz', 'Gülay', 'Nilay', 'Nilüfer', 'Arzu', 'Aslı', 'Bahar', 'Berrin', 'Canan', 'Dilek', 'Emel', 'Gülşen', 'Havva', 'Meryem', 'Necla', 'Semra', 'Tülay', 'Ülkü'],
  lastNames: ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Yıldırım', 'Aydın', 'Öztürk', 'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Çetin', 'Kara', 'Koç', 'Kurt', 'Özdemir', 'Şimşek', 'Erdoğan', 'Acar', 'Aksoy', 'Polat', 'Güneş', 'Korkmaz', 'Çakır', 'Özer', 'Türk', 'Taş', 'Ateş'],
};

// Pakistan / Bangladesh style
const NAMES_PAK: NameData = {
  male: ['Muhammad', 'Ahmed', 'Ali', 'Hassan', 'Imran', 'Bilal', 'Usman', 'Zeeshan', 'Faisal', 'Kamran', 'Hamza', 'Asad', 'Arslan', 'Adnan', 'Shahid', 'Tariq', 'Salman', 'Saad', 'Junaid', 'Kashif', 'Shoaib', 'Rizwan', 'Fahad', 'Nadeem', 'Wasim', 'Amir', 'Aamir', 'Haider', 'Shahzad', 'Zubair', 'Zaheer', 'Iqbal', 'Nasir', 'Rashid', 'Naveed', 'Farhan', 'Waqar', 'Asif', 'Azhar', 'Babar', 'Danish', 'Ehsan', 'Fawad', 'Hameed', 'Idris', 'Jamil', 'Khalid', 'Majid', 'Naeem', 'Owais', 'Pervaiz', 'Qadir', 'Rauf', 'Sajid', 'Tahir', 'Uzair', 'Waheed', 'Yasir', 'Zakir', 'Abdullah'],
  female: ['Ayesha', 'Fatima', 'Zainab', 'Sania', 'Hina', 'Nadia', 'Sadia', 'Iqra', 'Rabia', 'Maria', 'Amina', 'Bushra', 'Farah', 'Saima', 'Sana', 'Uzma', 'Shaista', 'Rida', 'Madiha', 'Khadija', 'Aliya', 'Shazia', 'Rubina', 'Mehwish', 'Sobia', 'Sumera', 'Samina', 'Shama', 'Tabassum', 'Yasmeen', 'Asma', 'Beenish', 'Farida', 'Fozia', 'Habiba', 'Jamila', 'Komal', 'Laiba', 'Mahwish', 'Naila', 'Naseem', 'Parveen', 'Quratulain', 'Raheela', 'Sabeen', 'Salma', 'Saira', 'Sidra', 'Sughra', 'Tahira', 'Uzma', 'Wajiha', 'Zara', 'Zubaida', 'Fariha', 'Humaira', 'Lubna', 'Maryam', 'Nimra', 'Shehla'],
  lastNames: ['Khan', 'Malik', 'Sheikh', 'Chaudhry', 'Bhatti', 'Mirza', 'Raja', 'Butt', 'Qureshi', 'Syed', 'Ahmed', 'Ali', 'Hussain', 'Shah', 'Akhtar', 'Aziz', 'Baig', 'Dar', 'Hashmi', 'Iqbal', 'Javed', 'Kazmi', 'Mahmood', 'Rasheed', 'Rehman', 'Raza', 'Saleem', 'Tariq', 'Usman', 'Zaidi'],
};

// Korea
const NAMES_KOREAN: NameData = {
  male: ['Min-jun', 'Seo-joon', 'Ji-hoon', 'Jae-won', 'Hyun-woo', 'Dong-hyun', 'Sung-min', 'Jong-ho', 'Young-soo', 'Tae-hyun', 'Jin-woo', 'Seung-ho', 'Sang-woo', 'Joon-ho', 'Min-ho', 'Woo-jin', 'Jae-hyun', 'Kyung-soo', 'Han-sol', 'Jun-seo', 'Do-hyun', 'Tae-yang', 'Gi-beom', 'Chan-woo', 'Seok-jin', 'Hoon', 'Chang-min', 'Jae-beom', 'Seung-woo', 'In-ho', 'Kwang-soo', 'Myung-jun', 'Yong-ho', 'Sung-ho', 'Bong-jun', 'Chul-soo', 'Dae-jung', 'Byung-hun', 'Kyu-sung', 'Moon-sik', 'Nam-joon', 'Sang-hyun', 'Tae-min', 'Woo-sung', 'Yeon-seok', 'Jin-young', 'Hae-il', 'Joon-gi', 'Min-sik', 'Hyung-sik', 'Bo-gum', 'Soo-hyun', 'Jung-kook', 'Tae-hwan', 'Seung-gi', 'Dong-wook', 'Jun-ho', 'Jae-hwan', 'Ki-joon', 'Shi-woo'],
  female: ['Seo-yeon', 'Ji-woo', 'Ha-neul', 'Soo-jin', 'Ji-eun', 'Hye-jin', 'Min-seo', 'Yeon-woo', 'Bo-young', 'Eun-ji', 'Seo-hyun', 'Yoo-jung', 'Ji-won', 'Min-ah', 'Hye-ri', 'Na-yeon', 'Chae-won', 'Yoo-na', 'Da-hyun', 'Soo-young', 'Eun-bi', 'Soo-ah', 'Ji-soo', 'Ye-won', 'Sun-hee', 'Mi-young', 'Jung-eun', 'Hye-young', 'Eun-hee', 'Kyung-mi', 'Soo-kyung', 'Mi-sun', 'Hee-kyung', 'Soon-ja', 'Young-ae', 'Ok-ja', 'Jung-sook', 'Myung-ja', 'Bo-ra', 'Ga-eun', 'Ha-yoon', 'Seol-hyun', 'So-hee', 'Ye-ji', 'In-young', 'Ji-young', 'Na-ra', 'Yu-ri', 'Hyo-yeon', 'Sun-mi', 'Hyun-a', 'So-yeon', 'Mi-joo', 'Yoo-bin', 'Da-som', 'Chan-mi', 'Eun-woo', 'Ha-na', 'Ji-min', 'Seung-ah'],
  lastNames: ['Kim', 'Lee', 'Park', 'Choi', 'Jung', 'Kang', 'Cho', 'Yoon', 'Jang', 'Lim', 'Han', 'Shin', 'Seo', 'Kwon', 'Hwang', 'Ahn', 'Song', 'Hong', 'Jeon', 'Ko', 'Moon', 'Yang', 'Bae', 'Baek', 'Heo', 'Nam', 'Shim', 'Ha', 'Joo', 'Ryu'],
};

// Hebrew / Israel
const NAMES_HEBREW: NameData = {
  male: ['David', 'Yosef', 'Moshe', 'Avi', 'Yaakov', 'Yehuda', 'Noam', 'Alon', 'Eitan', 'Yair', 'Daniel', 'Uri', 'Ariel', 'Yuval', 'Omri', 'Ron', 'Guy', 'Shai', 'Tal', 'Amit', 'Rotem', 'Itai', 'Lior', 'Nadav', 'Oren', 'Doron', 'Gal', 'Ran', 'Shachar', 'Tomer', 'Idan', 'Yonatan', 'Elad', 'Asaf', 'Zohar', 'Ofir', 'Meir', 'Shimon', 'Reuven', 'Eliezer', 'Chaim', 'Shlomo', 'Aaron', 'Benjamin', 'Ephraim', 'Gershon', 'Hillel', 'Isaac', 'Joshua', 'Levi', 'Natan', 'Raphael', 'Samuel', 'Tzvi', 'Yitzhak', 'Zev', 'Aharon', 'Asher', 'Baruch', 'Eliahu'],
  female: ['Yael', 'Rachel', 'Leah', 'Miriam', 'Tamar', 'Noa', 'Sarah', 'Avital', 'Rivka', 'Michal', 'Maya', 'Shira', 'Chen', 'Tal', 'Noy', 'Roni', 'Shani', 'Lital', 'Moran', 'Amit', 'Adi', 'Gal', 'Noga', 'Lior', 'Rotem', 'Dana', 'Hadar', 'Keren', 'Merav', 'Orly', 'Sigal', 'Vered', 'Hila', 'Irit', 'Osnat', 'Einat', 'Sarit', 'Orit', 'Ester', 'Hannah', 'Deborah', 'Judith', 'Ruth', 'Naomi', 'Abigail', 'Dina', 'Chava', 'Batsheva', 'Tzipora', 'Shoshana', 'Malka', 'Bracha', 'Fruma', 'Tzila', 'Yehudit', 'Nechama', 'Shifra', 'Pnina', 'Chana', 'Elisheva'],
  lastNames: ['Cohen', 'Levi', 'Mizrahi', 'Biton', 'Goldstein', 'Katz', 'Azoulay', 'Ohayon', 'Peretz', 'Ben-David', 'Abutbul', 'Dahan', 'Ben-Shimon', 'Malka', 'Avraham', 'Dayan', 'Eliyahu', 'Aflalo', 'Gabay', 'Friedman', 'Levy', 'Yosef', 'Solomon', 'Ben-Haim', 'Edri', 'Benayoun', 'Vaknin', 'Shalom', 'Benaim', 'Attias'],
};

// Indonesia
const NAMES_INDONESIA: NameData = {
  male: ['Agus', 'Budi', 'Joko', 'Hendra', 'Rizky', 'Andi', 'Yudi', 'Fajar', 'Dedi', 'Imam', 'Wahyu', 'Dwi', 'Eko', 'Hendri', 'Bambang', 'Suharto', 'Ahmad', 'Doni', 'Rudi', 'Wawan', 'Asep', 'Deden', 'Dadang', 'Iwan', 'Teguh', 'Sutrisno', 'Basuki', 'Sugeng', 'Tri', 'Ari', 'Rendra', 'Dimas', 'Bayu', 'Fikri', 'Taufik', 'Ridwan', 'Arif', 'Irfan', 'Indra', 'Aditya', 'Firman', 'Roni', 'Bagus', 'Cahyo', 'Eko', 'Galih', 'Gilang', 'Hadi', 'Ilham', 'Jaya', 'Kurniawan', 'Lukman', 'Mas', 'Nanda', 'Okta', 'Putra', 'Reza', 'Satria', 'Vino', 'Wijaya'],
  female: ['Siti', 'Dewi', 'Rina', 'Wulan', 'Putri', 'Ayu', 'Fitri', 'Lestari', 'Maya', 'Intan', 'Sri', 'Nur', 'Ani', 'Lia', 'Ratna', 'Yanti', 'Sari', 'Wati', 'Indah', 'Diah', 'Endang', 'Yulia', 'Rini', 'Novita', 'Lina', 'Dwi', 'Tri', 'Eka', 'Ningsih', 'Suci', 'Anita', 'Dina', 'Evi', 'Farah', 'Gita', 'Hesti', 'Isna', 'Juwita', 'Kartika', 'Linda', 'Mira', 'Nita', 'Oktaviani', 'Puspita', 'Rahayu', 'Safitri', 'Tika', 'Umi', 'Vina', 'Wardah', 'Yeni', 'Zahra', 'Anggun', 'Bunga', 'Citra', 'Della', 'Erna', 'Fira', 'Galuh', 'Hanifa'],
  lastNames: ['Pratama', 'Saputra', 'Santoso', 'Wijaya', 'Hidayat', 'Kurniawan', 'Setiawan', 'Nugroho', 'Siregar', 'Gunawan', 'Wibowo', 'Permana', 'Suryanto', 'Susanto', 'Utomo', 'Prabowo', 'Ramadan', 'Mahendra', 'Atmadja', 'Halim', 'Haryanto', 'Junaidi', 'Kartika', 'Kusuma', 'Lesmana', 'Maulana', 'Natsir', 'Putra', 'Rahman', 'Suherman'],
};

// Malay world
const NAMES_MALAY: NameData = {
  male: ['Ahmad', 'Muhammad', 'Ismail', 'Rahman', 'Razak', 'Syafiq', 'Hakim', 'Firdaus', 'Azlan', 'Faiz', 'Hafiz', 'Izzat', 'Amir', 'Danial', 'Haziq', 'Irfan', 'Zulkifli', 'Haris', 'Imran', 'Nazri', 'Nabil', 'Faisal', 'Rizal', 'Zaki', 'Azmi', 'Amin', 'Afiq', 'Arif', 'Najib', 'Hakimi', 'Akmal', 'Shahrul', 'Aiman', 'Ashraf', 'Farhan', 'Kamarul', 'Luqman', 'Mustafa', 'Omar', 'Qayyum', 'Ridhwan', 'Saiful', 'Umar', 'Wafi', 'Yusof', 'Zaid', 'Adli', 'Fahmi', 'Hamzah', 'Jazlan', 'Khalil', 'Mahadi', 'Nasir', 'Rafiq', 'Shafiq', 'Taufik', 'Wan', 'Yahya', 'Zainal', 'Zulaikha'],
  female: ['Nur', 'Aisyah', 'Siti', 'Farah', 'Nadia', 'Liyana', 'Zainab', 'Hannah', 'Amira', 'Sabrina', 'Sofea', 'Adibah', 'Aishah', 'Alya', 'Azura', 'Farisha', 'Hanis', 'Iman', 'Irina', 'Jasmine', 'Laila', 'Mariam', 'Natasha', 'Qistina', 'Sofiya', 'Syahirah', 'Syaza', 'Wardah', 'Yasmin', 'Zahra', 'Adriana', 'Balqis', 'Dania', 'Elina', 'Faizah', 'Hafizah', 'Intan', 'Jannah', 'Khadijah', 'Maisarah', 'Nadhirah', 'Puteri', 'Qaisara', 'Rania', 'Safiyyah', 'Umairah', 'Warda', 'Amirah', 'Fatihah', 'Irdina', 'Maryam', 'Natasya', 'Qasrina', 'Soraya', 'Suhaila', 'Tasnim', 'Ummi', 'Wani', 'Yusra', 'Zurina'],
  lastNames: ['Abdullah', 'Rahman', 'Hashim', 'Hassan', 'Ahmad', 'Ismail', 'Salleh', 'Zainal', 'Aziz', 'Yusof', 'Ibrahim', 'Mahmood', 'Ali', 'Osman', 'Omar', 'Bakar', 'Hamid', 'Mansor', 'Taib', 'Daud', 'Husin', 'Razak', 'Kassim', 'Karim', 'Nasir', 'Saad', 'Sulaiman', 'Yaacob', 'Zainuddin', 'Arif'],
};

// Sri Lanka
const NAMES_SRI_LANKA: NameData = {
  male: ['Kumar', 'Pradeep', 'Sunil', 'Ruwan', 'Nimal', 'Chaminda', 'Sanjaya', 'Tharindu', 'Dilshan', 'Ramesh', 'Ajith', 'Ananda', 'Anil', 'Aruna', 'Asanka', 'Bandula', 'Chathura', 'Dammika', 'Dinesh', 'Gamini', 'Harsha', 'Indika', 'Janaka', 'Kamal', 'Kasun', 'Lakshan', 'Mahesh', 'Nalin', 'Nipuna', 'Nuwan', 'Piyal', 'Prasanna', 'Ranga', 'Roshan', 'Sampath', 'Sanath', 'Sisira', 'Sumith', 'Thilak', 'Upul', 'Viraj', 'Wijaya', 'Asela', 'Chanaka', 'Dimuthu', 'Gayashan', 'Hasitha', 'Jagath', 'Lahiru', 'Manjula', 'Nalaka', 'Prabath', 'Sachith', 'Thilan', 'Udara', 'Wasantha', 'Yasitha', 'Chinthaka', 'Dhanushka', 'Gihan'],
  female: ['Anoma', 'Nirosha', 'Nadeesha', 'Sanduni', 'Kumari', 'Ishara', 'Tharanga', 'Dinushi', 'Harshani', 'Madushani', 'Chamali', 'Dilani', 'Gayani', 'Hansika', 'Inoka', 'Jayani', 'Kalani', 'Lakshika', 'Malka', 'Nandani', 'Nilukshi', 'Piyumi', 'Ruwani', 'Sachini', 'Thilini', 'Uresha', 'Vindya', 'Wasana', 'Yashoda', 'Anusha', 'Chathurika', 'Dulani', 'Erandi', 'Fathima', 'Ganga', 'Hashini', 'Iresha', 'Janani', 'Kaushalya', 'Lalani', 'Menaka', 'Nadeera', 'Oshadi', 'Pavithra', 'Rangi', 'Shanika', 'Thanuja', 'Upeksha', 'Vidya', 'Waruni', 'Yashodara', 'Chandima', 'Damayanthi', 'Geethika', 'Hemali', 'Kaveesha', 'Manori', 'Nethmini', 'Prasadini', 'Samanthi'],
  lastNames: ['Perera', 'Fernando', 'Silva', 'Jayasinghe', 'Weerasinghe', 'Bandara', 'Gunawardena', 'Ratnayake', 'Senanayake', 'Karunaratne', 'De Silva', 'Amarasinghe', 'Dissanayake', 'Jayasuriya', 'Wijesinghe', 'Mendis', 'Wickramasinghe', 'Rajapakse', 'Gunasekera', 'Samaraweera', 'Kumara', 'Chandrasiri', 'Ekanayake', 'Hewage', 'Liyanage', 'Pathirana', 'Ranasinghe', 'Senarath', 'Vithanage', 'Zoysa'],
};

// Vietnam
const NAMES_VIET: NameData = {
  male: ['Anh', 'Minh', 'Quang', 'Huy', 'Tuan', 'Duc', 'Nam', 'Phong', 'Khanh', 'Long', 'Hai', 'Hung', 'Dung', 'Cuong', 'Tan', 'Thang', 'Trung', 'Viet', 'Hoang', 'Son', 'Thanh', 'Binh', 'Dat', 'Khoa', 'Loc', 'Nhat', 'Phuoc', 'Quy', 'Tai', 'Thinh', 'Tien', 'Trieu', 'Vu', 'Bao', 'Chinh', 'Duy', 'Hieu', 'Kiet', 'Lam', 'Man', 'Nghia', 'Quan', 'Sang', 'Thai', 'Tho', 'Tri', 'Vinh', 'Phuc', 'Truong', 'Hao', 'Tung', 'Khang', 'Tam', 'Tin', 'Dong', 'Ha', 'Huan', 'Kien', 'Lap', 'Manh'],
  female: ['Lan', 'Hoa', 'Trang', 'Linh', 'Thao', 'Huong', 'Mai', 'Ngoc', 'Anh', 'Dieu', 'Thuy', 'Hong', 'Ha', 'Phuong', 'Van', 'Yen', 'Hien', 'Chi', 'Hang', 'Nga', 'Thu', 'Nhung', 'Tuyet', 'Chau', 'Dung', 'Giang', 'Hanh', 'Kieu', 'Oanh', 'Quynh', 'Suong', 'Tran', 'Uyen', 'Xuan', 'Bich', 'Diep', 'Duyen', 'Hoai', 'Kim', 'Ly', 'My', 'Ngan', 'Phuong', 'Quyen', 'Tam', 'Thuy', 'Tien', 'Trinh', 'Tu', 'Vy', 'Yen', 'An', 'Cam', 'Dao', 'Huyen', 'Khanh', 'Linh', 'Minh', 'Nhi', 'Phan'],
  lastNames: ['Nguyen', 'Tran', 'Le', 'Pham', 'Hoang', 'Huynh', 'Vu', 'Vo', 'Dang', 'Bui', 'Do', 'Ho', 'Ngo', 'Duong', 'Ly', 'Dinh', 'Dao', 'Ta', 'Trinh', 'Truong', 'Phan', 'Lam', 'Thai', 'Luong', 'Mai', 'Cao', 'Kim', 'Nghiem', 'Quach', 'Bach'],
};

// Philippines
const NAMES_PH: NameData = {
  male: ['Jose', 'Juan', 'Mark', 'James', 'Carlos', 'Michael', 'Anthony', 'Ramon', 'Paolo', 'Luis', 'Pedro', 'Miguel', 'Gabriel', 'Rafael', 'Daniel', 'Joshua', 'Christian', 'Ryan', 'John', 'David', 'Emmanuel', 'Joseph', 'Benjamin', 'Angelo', 'Marco', 'Francis', 'Vincent', 'Martin', 'Rico', 'Manuel', 'Roberto', 'Salvador', 'Eduardo', 'Ricardo', 'Fernando', 'Antonio', 'Lorenzo', 'Diego', 'Dominic', 'Julius', 'Kevin', 'Kenneth', 'Brian', 'Jason', 'Patrick', 'Paul', 'Andrew', 'Samuel', 'Nathan', 'Justin', 'Steven', 'George', 'Mario', 'Romeo', 'Victor', 'Alberto', 'Rodrigo', 'Alfredo', 'Felipe', 'Ernesto'],
  female: ['Maria', 'Ana', 'Grace', 'Joy', 'Angel', 'Clarissa', 'Rose', 'Patricia', 'Cristina', 'Diana', 'Isabel', 'Teresa', 'Carmen', 'Lourdes', 'Sofia', 'Victoria', 'Carolina', 'Gabriela', 'Angelica', 'Michelle', 'Nicole', 'Stephanie', 'Christine', 'Catherine', 'Elizabeth', 'Margaret', 'Sarah', 'Jennifer', 'Jessica', 'Amanda', 'Melissa', 'Rebecca', 'Rachel', 'Emma', 'Sophia', 'Isabella', 'Olivia', 'Mia', 'Charlotte', 'Amelia', 'Mary', 'Rosario', 'Remedios', 'Josefa', 'Luz', 'Esperanza', 'Pilar', 'Concepcion', 'Felicidad', 'Gloria', 'Leticia', 'Milagros', 'Soledad', 'Trinidad', 'Dolores', 'Elena', 'Emilia', 'Leonora', 'Mercedes', 'Paz'],
  lastNames: ['Santos', 'Reyes', 'Cruz', 'Bautista', 'Garcia', 'Flores', 'Rivera', 'Gonzales', 'Ramos', 'Torres', 'Mendoza', 'Castillo', 'Hernandez', 'Lopez', 'Perez', 'Dela Cruz', 'Aquino', 'Villanueva', 'Santiago', 'Fernandez', 'Morales', 'Valdez', 'Pascual', 'Soriano', 'Sanchez', 'Navarro', 'Rodriguez', 'Mercado', 'Luna', 'Tolentino'],
};

// ============================================================================
// REGIONAL GROUPS -> 197 COUNTRIES
// ============================================================================

const REGIONAL_GROUPS: { data: NameData; countries: string[] }[] = [
  // Francophone Europe + Haiti
  {
    data: NAMES_FR,
    countries: ['France', 'Belgium', 'Luxembourg', 'Monaco', 'Haiti'],
  },

  // Germanic Europe
  {
    data: NAMES_DE,
    countries: ['Germany', 'Austria', 'Liechtenstein'],
  },

  // Italian / Mediterranean micro-states
  {
    data: NAMES_IT,
    countries: ['Italy', 'San Marino', 'Vatican City', 'Malta'],
  },

  // Spanish-speaking Europe & Americas
  {
    data:NAMES_ES,
    countries: [
      'Spain',
      'Andorra',
      'Mexico',
      'Guatemala',
      'Honduras',
      'El Salvador',
      'Nicaragua',
      'Costa Rica',
      'Panama',
      'Cuba',
      'Dominican Republic',
      'Colombia',
      'Venezuela',
      'Ecuador',
      'Peru',
      'Bolivia',
      'Paraguay',
      'Chile',
      'Argentina',
      'Uruguay',
    ],
  },

  // Portuguese-speaking
  {
    data: NAMES_PT,
    countries: ['Portugal', 'Timor-Leste', 'Brazil', 'Suriname'],
  },

  // Nordic + Netherlands
  {
    data: NAMES_NORDIC,
    countries: ['Iceland', 'Norway', 'Sweden', 'Finland', 'Denmark', 'Netherlands'],
  },

  // Eastern Slavic / Central-Eastern Europe
  {
    data: NAMES_SLAVIC_EAST,
    countries: [
      'Poland',
      'Czechia',
      'Slovakia',
      'Hungary',
      'Romania',
      'Bulgaria',
      'Belarus',
      'Ukraine',
      'Russia',
      'Moldova',
      'Estonia',
      'Latvia',
      'Lithuania',
    ],
  },

  // Balkans / Slavic South / Caucasus
  {
    data: NAMES_SLAVIC_SOUTH,
    countries: [
      'Slovenia',
      'Croatia',
      'Bosnia and Herzegovina',
      'Serbia',
      'Montenegro',
      'North Macedonia',
      'Albania',
      'Kosovo',
      'Greece',
      'Georgia',
      'Armenia',
    ],
  },

  // Anglophone Europe + main Anglophone world
  {
    data: NAMES_EN,
    countries: [
      'United Kingdom',
      'Ireland',
      'Switzerland',
      'Cyprus',
      'United States',
      'Canada',
      'Bahamas',
      'Barbados',
      'Belize',
      'Grenada',
      'Jamaica',
      'Trinidad and Tobago',
      'Antigua and Barbuda',
      'Saint Kitts and Nevis',
      'Saint Lucia',
      'Saint Vincent and the Grenadines',
      'Dominica',
      'Guyana',
      'Australia',
      'New Zealand',
    ],
  },

  // Africa francophone
  {
    data: NAMES_AFRICA_FR,
    countries: [
      'Benin',
      'Burkina Faso',
      'Burundi',
      'Cabo Verde',
      'Cameroon',
      'Central African Republic',
      'Chad',
      'Comoros',
      'Congo',
      'Democratic Republic of the Congo',
      "Côte d'Ivoire",
      'Djibouti',
      'Equatorial Guinea',
      'Gabon',
      'Guinea',
      'Guinea-Bissau',
      'Madagascar',
      'Mali',
      'Niger',
      'Rwanda',
      'Senegal',
      'Seychelles',
      'Togo',
    ],
  },

  // Africa anglophone / lusophone
  {
    data: NAMES_AFRICA_EN,
    countries: [
      'Angola',
      'Botswana',
      'Eritrea',
      'Ethiopia',
      'Gambia',
      'Ghana',
      'Kenya',
      'Lesotho',
      'Liberia',
      'Malawi',
      'Mauritius',
      'Mozambique',
      'Namibia',
      'Nigeria',
      'Sierra Leone',
      'Somalia',
      'South Africa',
      'South Sudan',
      'Eswatini',
      'Tanzania',
      'Uganda',
      'Zambia',
      'Zimbabwe',
      'Sao Tome and Principe',
    ],
  },

  // Arab world (Maghreb + Middle East)
  {
    data: NAMES_MA,
    countries: [
      'Algeria',
      'Morocco',
      'Tunisia',
      'Mauritania',
      'Egypt',
      'Libya',
      'Sudan',
      'Saudi Arabia',
      'Yemen',
      'Oman',
      'United Arab Emirates',
      'Qatar',
      'Bahrain',
      'Kuwait',
      'Iraq',
      'Jordan',
      'Syria',
      'Lebanon',
      'State of Palestine',
    ],
  },

  // India / South Asia
  {
    data: NAMES_IN,
    countries: ['India', 'Nepal', 'Bhutan', 'Bangladesh'],
  },

  // Sri Lanka / Maldives
  {
    data: NAMES_SRI_LANKA,
    countries: ['Sri Lanka', 'Maldives'],
  },

  // Pakistan / Afghanistan
  {
    data: NAMES_PAK,
    countries: ['Pakistan', 'Afghanistan'],
  },

  // Persian world
  {
    data: NAMES_PERSIAN,
    countries: ['Iran', 'Tajikistan'],
  },

  // Turkic world
  {
    data: NAMES_TURKIC,
    countries: ['Kazakhstan', 'Kyrgyzstan', 'Turkmenistan', 'Uzbekistan', 'Azerbaijan', 'Turkey'],
  },

  // China / Taiwan / Mongolia
  {
    data: NAMES_CN,
    countries: ['China', 'Taiwan', 'Mongolia'],
  },

  // Japan
  {
    data: NAMES_JP,
    countries: ['Japan'],
  },

  // Koreas
  {
    data: NAMES_KOREAN,
    countries: ['South Korea', 'North Korea'],
  },

  // Continental SE Asia
  {
    data: NAMES_SE_ASIA,
    countries: ['Myanmar', 'Thailand', 'Laos', 'Cambodia'],
  },

  // Vietnam
  {
    data: NAMES_VIET,
    countries: ['Vietnam'],
  },

  // Indonesia
  {
    data: NAMES_INDONESIA,
    countries: ['Indonesia'],
  },

  // Malay world
  {
    data: NAMES_MALAY,
    countries: ['Malaysia', 'Brunei', 'Singapore'],
  },

  // Philippines
  {
    data: NAMES_PH,
    countries: ['Philippines'],
  },

  // Israel (Hebrew)
  {
    data: NAMES_HEBREW,
    countries: ['Israel'],
  },

  // Pacific Islands (Anglophone style)
  {
    data: NAMES_EN,
    countries: [
      'Fiji',
      'Papua New Guinea',
      'Samoa',
      'Solomon Islands',
      'Vanuatu',
      'Kiribati',
      'Marshall Islands',
      'Micronesia',
      'Nauru',
      'Palau',
      'Tonga',
      'Tuvalu',
    ],
  },
];

// ============================================================================
// BUILD FINAL MAP + HELPER
// ============================================================================

export const NAMES_BY_COUNTRY: Record<string, NameData> = {};

for (const group of REGIONAL_GROUPS) {
  for (const country of group.countries) {
    NAMES_BY_COUNTRY[country] = group.data;
  }
}

// Fallback
NAMES_BY_COUNTRY['DEFAULT'] = NAMES_DEFAULT;

// Helper
export function getNamesByCountry(country: string): NameData {
  return NAMES_BY_COUNTRY[country] || NAMES_DEFAULT;
}
    