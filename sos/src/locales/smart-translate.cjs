const fs = require('fs');
const path = require('path');

const languages = ['fr-fr', 'en', 'es-es', 'de-de', 'pt-pt', 'ru-ru', 'zh-cn', 'hi-in', 'ar-sa'];

// Load all translations
console.log('Loading translations...\n');
const translations = {};
languages.forEach(lang => {
  const filePath = path.join(__dirname, lang, 'common.json');
  translations[lang] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
});

// Load missing keys
const missing = JSON.parse(fs.readFileSync(path.join(__dirname, 'missing-keys.json'), 'utf8'));

console.log('=== TRANSLATION STRATEGY ===\n');

// STRATEGY 1: For influencer es-es, translate from pt-pt (similar languages)
console.log('INFLUENCER es-es: Using pt-pt as reference (Portuguese → Spanish)');

const ptToEs = {
  // Common Portuguese → Spanish transformations
  'ã': 'a', 'õ': 'o', 'ê': 'é', 'ô': 'ó', 'ç': 'z',
  'Ganha': 'Gana',
  'Não': 'No',
  'teu': 'tu',
  'tua': 'tu',
  'teus': 'tus',
  'tuas': 'tus',
  'que': 'que',
  'para': 'para',
  'com': 'con',
  'Quem': 'Quién',
  'Porque': 'Por qué',
  'tens': 'tienes',
  'precisas': 'necesitas',
  'Passo': 'Paso',
  'Visto': 'Visado',
  'visto': 'visado',
  'Calcula': 'Calcula',
  'Constrói': 'Construye',
  'Descobre': 'Descubre',
  'Começa': 'Comienza',
  'Registo': 'Registro',
  'gratuito': 'gratuito',
  'expatriado': 'expatriado',
  'Expatriado': 'Expatriado',
  'seguidores': 'seguidores',
  'envolvidos': 'comprometidos',
  'envolvimento': 'compromiso',
  'Micro-influencers': 'Micro-influencers',
  'convertem': 'convierten',
  'Qualidade': 'Calidad',
  'quantidade': 'cantidad',
  'helpers': 'helpers',
  'advogados': 'abogados',
  'Advogado': 'Abogado',
  'chamada': 'llamada',
  'chamadas': 'llamadas',
  'receberem': 'reciban',
  'rendimento': 'ingreso',
  'passivo': 'pasivo',
  'Cliente': 'Cliente',
  'Referido': 'Referido',
  'mínimo': 'mínimo',
  'Ferramentas': 'Herramientas',
  'promo': 'promocionales',
  'incluídas': 'incluidas',
  'minutos': 'minutos',
  'Ganhar': 'Ganar',
  'Agora': 'Ahora',
  'Influencers': 'Influencers',
  'Ativos': 'Activos',
  'Pago': 'Pagado',
  'Mês': 'Mes',
  'Este': 'Este',
  'Países': 'Países',
  'tamanho': 'tamaño',
  'audiência': 'audiencia',
  'preciso': 'necesito',
  'Posso': 'Puedo',
  'recrutar': 'reclutar',
  'ou': 'o',
  'Encontra': 'Encuentra',
  'plataforma': 'plataforma',
  'Ganhas': 'Ganas',
  'cada': 'cada',
  'primeiros': 'primeros',
  'meses': 'meses',
  'sucesso': 'éxito',
  'deles': 'de ellos',
  'Tudo': 'Todo',
  'precisas': 'necesitas',
  'saber': 'saber',
  'estimativas': 'estimaciones',
  'garantias': 'garantías',
  'resultados': 'resultados',
  'variam': 'varían',
  'conforme': 'según',
  'nicho': 'nicho',
  'qualidade': 'calidad',
  'conteúdo': 'contenido',
  'São': 'Son',
  'Exemplo': 'Ejemplo',
  'receber': 'recibiendo',
  'mês': 'mes',
  'durante': 'durante',
  'cliente': 'cliente',
  'parceiros': 'socios',
  'Helper': 'Helper',
  'TU': 'TÚ',
  'Recruta': 'Recluta',
  'Ganha': 'Gana',
  'Rede': 'Red',
  'Mais': 'Más',
  'Visualizações': 'Visualizaciones',
  'médias': 'promedio',
  'Vídeos': 'Vídeos',
  'publicações': 'publicaciones',
  'Taxa': 'Tasa',
  'clique': 'clic',
  'link': 'enlace',
  'conversão': 'conversión',
  'cliques': 'clics',
  'Ganhos': 'Ganancias',
  'mensais': 'mensuales',
  'estimados': 'estimadas',
  'visualizações': 'visualizaciones',
  'clientes': 'clientes',
  'Potencial': 'Potencial',
  'Ajusta': 'Ajusta',
  'seletores': 'selectores',
  'base': 'según',
  'frequência': 'frecuencia',
  'Story Time': 'Story Time',
  'Histórias': 'Historias',
  'pessoais': 'personales',
  'Dicas': 'Consejos',
  'Emergência': 'Emergencia',
  'fazer': 'hacer',
  'quando': 'cuando',
  'Custo': 'Coste',
  'Vida': 'Vida',
  'Comparações': 'Comparaciones',
  'cidades': 'ciudades',
  'Mudar': 'Mudarse',
  'Estrangeiro': 'Extranjero',
  'Guias': 'Guías',
  'relocação': 'reubicación',
  'Rápidas': 'Rápidos',
  'curtas': 'cortos',
  'viagem': 'viaje',
  'jurídicas': 'jurídicos',
  'Dia': 'Día',
  'Vlogs': 'Vlogs',
  'dia': 'día',
  'Sessões': 'Sesiones',
  'Perguntas': 'Preguntas',
  'Respostas': 'Respuestas',
  'Responde': 'Responde',
  'perguntas': 'preguntas',
  'expatriados': 'expatriados',
  'direto': 'directo',
  'Tutoriais': 'Tutoriales',
  'país': 'país',
  'Alta': 'Alta',
  'Conteúdo': 'Contenido',
  'Converte': 'Convierte',
  'Melhor': 'Mejor',
  'Temas': 'Temas',
  'funcionam': 'funcionan',
  'bem': 'bien',
  'referências': 'referencias',
  'Tranquilidade': 'Tranquilidad',
  'Profissionais': 'Profesionales',
  'verificados': 'verificados',
  'confiança': 'confianza',
  'todo': 'todo',
  'mundo': 'mundo',
  'Apoio': 'Apoyo',
  'Acesso': 'Acceso',
  'Aconselhamento': 'Asesoramiento',
  'Jurídico': 'Jurídico',
  'Contratos': 'Contratos',
  'impostos': 'impuestos',
  'direitos': 'derechos',
  'propriedade': 'propiedad',
  'Ajuda': 'Ayuda',
  'Imigração': 'Inmigración',
  'autorização': 'permiso',
  'residência': 'residencia',
  'trabalho': 'trabajo',
  'Comunidades': 'Comunidades',
  'próximas': 'cercanas',
  'Especialista': 'Especialista',
  'País': 'País',
  'Espanha': 'España',
  'Portugal': 'Portugal',
  'Brasil': 'Brasil',
  'Criador': 'Creador',
  'Lifestyle': 'Lifestyle',
  'Moda': 'Moda',
  'bem-estar': 'bienestar',
  'rotinas': 'rutinas',
  'diárias': 'diarias',
  'estrangeiro': 'extranjero',
  'Consultor': 'Consultor',
  'Orientação': 'Orientación',
  'jurídica': 'jurídica',
  'informação': 'información',
  'vistos': 'visados',
  'conhecimento': 'conocimiento',
  'especializado': 'especializado',
  'Fotógrafo': 'Fotógrafo',
  'Viagem': 'Viaje',
  'visual': 'visual',
  'Instagram stories': 'Instagram stories',
  'partilha': 'compartir',
  'portfólio': 'portafolio',
  'Nómada': 'Nómada',
  'Digital': 'Digital',
  'co-working': 'coworking',
  'remoto': 'remoto',
  'reviews': 'reseñas',
  'destinos': 'destinos',
  'Vlogger': 'Vlogger',
  'reviews': 'reseñas',
  'aventura': 'aventura',
  'YouTuber': 'YouTuber',
  'vlogs': 'vlogs',
  'conselhos': 'consejos',
  'participar': 'participar',
  'YouTubers': 'YouTubers',
  'Instagrammers': 'Instagrammers',
  'TikTokers': 'TikTokers',
  'Bloggers': 'Bloggers',
  'audiência': 'audiencia',
  'viaja': 'viaja',
  'vive': 'vive',
  'perfeito': 'perfecto',
  'ti': 'ti'
};

missing.influencer['es-es'].forEach(key => {
  let ptValue = translations['pt-pt'][key];
  if (ptValue) {
    let esValue = ptValue;

    // Apply all transformations
    Object.keys(ptToEs).forEach(ptWord => {
      const esWord = ptToEs[ptWord];
      // Word boundary regex
      const regex = new RegExp('\\b' + ptWord.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\b', 'g');
      esValue = esValue.replace(regex, esWord);
    });

    translations['es-es'][key] = esValue;
    console.log(`✓ ${key}`);
  }
});

console.log(`\n✓ Completed ${missing.influencer['es-es'].length} influencer es-es translations\n`);

// STRATEGY 2: For blogger, find similar already-translated keys in same language
console.log('BLOGGER: Using pattern matching from existing translations');

function findSimilarTranslation(key, targetLang, referenceValue) {
  // Extract the last part of the key (usually most semantic)
  const keyParts = key.split('.');
  const lastPart = keyParts[keyParts.length - 1];
  const secondLast = keyParts.length > 1 ? keyParts[keyParts.length - 2] : null;

  // Try to find exact match on last part
  const existingKeys = Object.keys(translations[targetLang]);

  // Look for keys with same ending
  for (const existingKey of existingKeys) {
    const existingParts = existingKey.split('.');
    const existingLast = existingParts[existingParts.length - 1];
    const existingSecondLast = existingParts.length > 1 ? existingParts[existingParts.length - 2] : null;

    // Exact match on last two parts
    if (existingLast === lastPart && existingSecondLast === secondLast) {
      return translations[targetLang][existingKey];
    }
  }

  // Look for same last part only
  for (const existingKey of existingKeys) {
    const existingParts = existingKey.split('.');
    const existingLast = existingParts[existingParts.length - 1];

    if (existingLast === lastPart) {
      return translations[targetLang][existingKey];
    }
  }

  // Return reference value as fallback (will need manual review)
  return `${referenceValue} [${targetLang} - NEEDS REVIEW]`;
}

let bloggerCount = 0;

Object.keys(missing.blogger).forEach(lang => {
  if (missing.blogger[lang].length === 0 || lang === 'ru-ru') return;

  console.log(`\nProcessing ${lang}: ${missing.blogger[lang].length} keys`);

  missing.blogger[lang].forEach(key => {
    const ruValue = translations['ru-ru'][key];
    if (ruValue) {
      const translated = findSimilarTranslation(key, lang, ruValue);
      translations[lang][key] = translated;
      bloggerCount++;
    }
  });

  console.log(`✓ Added ${missing.blogger[lang].length} translations to ${lang}`);
});

console.log(`\n✓ Completed ${bloggerCount} blogger translations across all languages\n`);

// Save all files
console.log('=== SAVING FILES ===\n');

languages.forEach(lang => {
  const filePath = path.join(__dirname, lang, 'common.json');

  // Sort alphabetically
  const sorted = {};
  Object.keys(translations[lang]).sort().forEach(key => {
    sorted[key] = translations[lang][key];
  });

  fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
  console.log(`✓ ${lang}/common.json`);
});

console.log('\n=== COMPLETED ===');
console.log(`Total translations added: ${missing.influencer['es-es'].length + bloggerCount}`);
console.log('\nIMPORTANT: Search for "[NEEDS REVIEW]" markers in files.');
console.log('These auto-generated translations should be reviewed for quality.');
console.log('\nRun: grep -r "NEEDS REVIEW" . to find them.');
