/**
 * MAPPING DES SPECIALITES VERS NOMS COURTS POUR LES SLUGS SEO
 * =============================================================
 *
 * Chaque specialite est mappee vers un nom court (max 15 caracteres)
 * traduit dans les 9 langues supportees.
 *
 * Format: code_specialite -> { fr: 'nom-court', en: 'short-name', ... }
 */

export interface SpecialtySlugMapping {
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

// ==========================================
// SPECIALITES AVOCATS - NOMS COURTS
// ==========================================

export const LAWYER_SPECIALTY_SLUGS: Record<string, SpecialtySlugMapping> = {
  // URGENCES
  'URG_ASSISTANCE_PENALE_INTERNATIONALE': {
    fr: 'penal', en: 'criminal', es: 'penal', de: 'strafrecht',
    pt: 'penal', ru: 'ugolovnoe', zh: 'xingshi', ar: 'jinai', hi: 'aparadh'
  },
  'URG_ACCIDENTS_RESPONSABILITE_CIVILE': {
    fr: 'accidents', en: 'accidents', es: 'accidentes', de: 'unfaelle',
    pt: 'acidentes', ru: 'dtp', zh: 'shigu', ar: 'hawadith', hi: 'durghatna'
  },
  'URG_RAPATRIEMENT_URGENCE': {
    fr: 'rapatriement', en: 'repatriation', es: 'repatriacion', de: 'rueckfuehrung',
    pt: 'repatriacao', ru: 'repatriatsiya', zh: 'qianfan', ar: 'iada', hi: 'pratyavartan'
  },

  // SERVICES COURANTS
  'CUR_TRADUCTIONS_LEGALISATIONS': {
    fr: 'traductions', en: 'translations', es: 'traducciones', de: 'uebersetzungen',
    pt: 'traducoes', ru: 'perevody', zh: 'fanyi', ar: 'tarjama', hi: 'anuvad'
  },
  'CUR_RECLAMATIONS_LITIGES_MINEURS': {
    fr: 'litiges', en: 'disputes', es: 'litigios', de: 'streitigkeiten',
    pt: 'litigios', ru: 'spory', zh: 'jiufen', ar: 'niza', hi: 'vivad'
  },
  'CUR_DEMARCHES_ADMINISTRATIVES': {
    fr: 'administratif', en: 'administrative', es: 'administrativo', de: 'verwaltung',
    pt: 'administrativo', ru: 'administrativnoe', zh: 'xingzheng', ar: 'idari', hi: 'prashasnik'
  },

  // IMMIGRATION ET TRAVAIL
  'IMMI_VISAS_PERMIS_SEJOUR': {
    fr: 'visa', en: 'visa', es: 'visa', de: 'visum',
    pt: 'visto', ru: 'viza', zh: 'qianzheng', ar: 'tashira', hi: 'visa'
  },
  'IMMI_CONTRATS_TRAVAIL_INTERNATIONAL': {
    fr: 'contrats-travail', en: 'work-contracts', es: 'contratos-trabajo', de: 'arbeitsvertraege',
    pt: 'contratos-trabalho', ru: 'trudovye-dogovory', zh: 'laodong-hetong', ar: 'uqud-amal', hi: 'kary-anubandh'
  },
  'IMMI_NATURALISATION': {
    fr: 'naturalisation', en: 'naturalization', es: 'naturalizacion', de: 'einbuergerung',
    pt: 'naturalizacao', ru: 'naturalizatsiya', zh: 'ruji', ar: 'tajnis', hi: 'nagrikta'
  },
  'IMMI_VISA_ETUDIANT': {
    fr: 'visa-etudiant', en: 'student-visa', es: 'visa-estudiante', de: 'studentenvisum',
    pt: 'visto-estudante', ru: 'studviza', zh: 'xuesheng-qianzheng', ar: 'tashira-talib', hi: 'chhatra-visa'
  },
  'IMMI_VISA_INVESTISSEUR': {
    fr: 'visa-investisseur', en: 'investor-visa', es: 'visa-inversor', de: 'investorenvisum',
    pt: 'visto-investidor', ru: 'investviza', zh: 'touzhe-qianzheng', ar: 'tashira-mustathmir', hi: 'niveshak-visa'
  },
  'IMMI_VISA_RETRAITE': {
    fr: 'visa-retraite', en: 'retirement-visa', es: 'visa-jubilado', de: 'rentnervisum',
    pt: 'visto-aposentado', ru: 'pensionnaya-viza', zh: 'tuixiu-qianzheng', ar: 'tashira-taqaud', hi: 'sevanivrutti-visa'
  },
  'IMMI_VISA_NOMADE_DIGITAL': {
    fr: 'nomade-digital', en: 'digital-nomad', es: 'nomada-digital', de: 'digitalnomade',
    pt: 'nomade-digital', ru: 'tsifrovoi-kochevnik', zh: 'shuzi-youmin', ar: 'rahhal-raqmi', hi: 'digital-nomad'
  },
  'IMMI_REGROUPEMENT_FAMILIAL': {
    fr: 'famille', en: 'family', es: 'familia', de: 'familie',
    pt: 'familia', ru: 'semya', zh: 'jiating', ar: 'aila', hi: 'parivar'
  },

  // DROIT DU TRAVAIL INTERNATIONAL
  'TRAV_DROITS_TRAVAILLEURS': {
    fr: 'droits-travail', en: 'labor-rights', es: 'derechos-laborales', de: 'arbeitsrechte',
    pt: 'direitos-trabalho', ru: 'trudovye-prava', zh: 'laodong-quanli', ar: 'huquq-amal', hi: 'shramik-adhikar'
  },
  'TRAV_LICENCIEMENT_INTERNATIONAL': {
    fr: 'licenciement', en: 'dismissal', es: 'despido', de: 'kuendigung',
    pt: 'despedimento', ru: 'uvolnenie', zh: 'jiegu', ar: 'fasl', hi: 'barkhaastagi'
  },
  'TRAV_SECURITE_SOCIALE_INTERNATIONALE': {
    fr: 'secu-sociale', en: 'social-security', es: 'seguridad-social', de: 'sozialversicherung',
    pt: 'seguranca-social', ru: 'sotsstrakh', zh: 'shebao', ar: 'tamin-ijtmai', hi: 'samajik-suraksha'
  },
  'TRAV_RETRAITE_INTERNATIONALE': {
    fr: 'retraite', en: 'pension', es: 'jubilacion', de: 'rente',
    pt: 'aposentadoria', ru: 'pensiya', zh: 'yanglao', ar: 'taqaud', hi: 'pension'
  },
  'TRAV_DETACHEMENT_EXPATRIATION': {
    fr: 'detachement', en: 'secondment', es: 'destacamento', de: 'entsendung',
    pt: 'destacamento', ru: 'komandirovka', zh: 'waipai', ar: 'intidab', hi: 'pratiniyukti'
  },
  'TRAV_DISCRIMINATION_TRAVAIL': {
    fr: 'discrimination', en: 'discrimination', es: 'discriminacion', de: 'diskriminierung',
    pt: 'discriminacao', ru: 'diskriminatsiya', zh: 'qishi', ar: 'tamyiz', hi: 'bhedbhav'
  },

  // IMMOBILIER
  'IMMO_ACHAT_VENTE': {
    fr: 'immobilier', en: 'real-estate', es: 'inmobiliario', de: 'immobilien',
    pt: 'imobiliario', ru: 'nedvizhimost', zh: 'fangdichan', ar: 'aqarat', hi: 'sampatti'
  },
  'IMMO_LOCATION_BAUX': {
    fr: 'location', en: 'rental', es: 'alquiler', de: 'miete',
    pt: 'arrendamento', ru: 'arenda', zh: 'zulin', ar: 'ijar', hi: 'kiraya'
  },
  'IMMO_LITIGES_IMMOBILIERS': {
    fr: 'litiges-immo', en: 'property-disputes', es: 'litigios-inmobiliarios', de: 'immobilienstreit',
    pt: 'litigios-imobiliarios', ru: 'spory-nedvizhimost', zh: 'fangchan-jiufen', ar: 'niza-aqari', hi: 'sampatti-vivad'
  },

  // FISCALITE
  'FISC_DECLARATIONS_INTERNATIONALES': {
    fr: 'fiscal', en: 'tax', es: 'fiscal', de: 'steuer',
    pt: 'fiscal', ru: 'nalog', zh: 'shuiwu', ar: 'dariba', hi: 'kar'
  },
  'FISC_DOUBLE_IMPOSITION': {
    fr: 'double-imposition', en: 'double-tax', es: 'doble-imposicion', de: 'doppelbesteuerung',
    pt: 'dupla-tributacao', ru: 'dvoinoe-nalog', zh: 'shuangchong-shuishou', ar: 'izdiwaj-daribi', hi: 'dahra-kar'
  },
  'FISC_OPTIMISATION_EXPATRIES': {
    fr: 'optimisation-fiscale', en: 'tax-optimization', es: 'optimizacion-fiscal', de: 'steueroptimierung',
    pt: 'otimizacao-fiscal', ru: 'nalogovaya-optimizatsiya', zh: 'shuiwu-youhua', ar: 'tahsin-daribi', hi: 'kar-anukul'
  },

  // FAMILLE
  'FAM_MARIAGE_DIVORCE': {
    fr: 'divorce', en: 'divorce', es: 'divorcio', de: 'scheidung',
    pt: 'divorcio', ru: 'razvod', zh: 'lihun', ar: 'talaq', hi: 'talak'
  },
  'FAM_GARDE_ENFANTS_TRANSFRONTALIERE': {
    fr: 'garde-enfants', en: 'child-custody', es: 'custodia-hijos', de: 'sorgerecht',
    pt: 'guarda-filhos', ru: 'opeka-detei', zh: 'zinv-jianguan', ar: 'hidana', hi: 'bal-hirasata'
  },
  'FAM_SCOLARITE_INTERNATIONALE': {
    fr: 'scolarite', en: 'schooling', es: 'escolaridad', de: 'schulbildung',
    pt: 'escolaridade', ru: 'obuchenie', zh: 'jiaoyu', ar: 'talim', hi: 'shiksha'
  },

  // PATRIMOINE
  'PATR_SUCCESSIONS_INTERNATIONALES': {
    fr: 'succession', en: 'inheritance', es: 'sucesion', de: 'erbschaft',
    pt: 'sucessao', ru: 'nasledstvo', zh: 'jicheng', ar: 'mirath', hi: 'uttaradhikar'
  },
  'PATR_GESTION_PATRIMOINE': {
    fr: 'patrimoine', en: 'wealth', es: 'patrimonio', de: 'vermoegen',
    pt: 'patrimonio', ru: 'aktivy', zh: 'caifu', ar: 'tharwa', hi: 'sampada'
  },
  'PATR_TESTAMENTS': {
    fr: 'testament', en: 'will', es: 'testamento', de: 'testament',
    pt: 'testamento', ru: 'zaveshchanie', zh: 'yizhu', ar: 'wasiya', hi: 'vasiyat'
  },

  // ENTREPRISE
  'ENTR_CREATION_ENTREPRISE_ETRANGER': {
    fr: 'creation-entreprise', en: 'business-creation', es: 'creacion-empresa', de: 'unternehmensgruendung',
    pt: 'criacao-empresa', ru: 'sozdanie-biznesa', zh: 'chuangye', ar: 'inshaa-sharika', hi: 'vyavasay-nirmaan'
  },
  'ENTR_INVESTISSEMENTS': {
    fr: 'investissement', en: 'investment', es: 'inversion', de: 'investition',
    pt: 'investimento', ru: 'investitsii', zh: 'touzi', ar: 'istithmar', hi: 'nivesh'
  },
  'ENTR_IMPORT_EXPORT': {
    fr: 'import-export', en: 'import-export', es: 'importacion-exportacion', de: 'import-export',
    pt: 'importacao-exportacao', ru: 'import-eksport', zh: 'jinchukou', ar: 'istrad-tasdir', hi: 'aayat-niryat'
  },

  // ASSURANCES ET PROTECTION
  'ASSU_ASSURANCES_INTERNATIONALES': {
    fr: 'assurance', en: 'insurance', es: 'seguro', de: 'versicherung',
    pt: 'seguro', ru: 'strakhovanie', zh: 'baoxian', ar: 'tamin', hi: 'bima'
  },
  'ASSU_PROTECTION_DONNEES': {
    fr: 'donnees', en: 'data', es: 'datos', de: 'datenschutz',
    pt: 'dados', ru: 'dannye', zh: 'shuju', ar: 'bayanat', hi: 'data'
  },
  'ASSU_CONTENTIEUX_ADMINISTRATIFS': {
    fr: 'contentieux', en: 'litigation', es: 'litigio', de: 'rechtsstreit',
    pt: 'contencioso', ru: 'tyazhba', zh: 'susong', ar: 'taqadi', hi: 'mukadama'
  },

  // CONSOMMATION ET SERVICES
  'CONS_ACHATS_DEFECTUEUX_ETRANGER': {
    fr: 'consommation', en: 'consumer', es: 'consumo', de: 'verbraucher',
    pt: 'consumo', ru: 'potrebitel', zh: 'xiaofei', ar: 'istihlak', hi: 'upbhokta'
  },
  'CONS_SERVICES_NON_CONFORMES': {
    fr: 'services', en: 'services', es: 'servicios', de: 'dienstleistungen',
    pt: 'servicos', ru: 'uslugi', zh: 'fuwu', ar: 'khadamat', hi: 'seva'
  },
  'CONS_ECOMMERCE_INTERNATIONAL': {
    fr: 'ecommerce', en: 'ecommerce', es: 'ecommerce', de: 'ecommerce',
    pt: 'ecommerce', ru: 'internet-torgovlya', zh: 'dianshang', ar: 'tijara-iliktruniya', hi: 'ecommerce'
  },

  // BANQUE ET FINANCE
  'BANK_PROBLEMES_COMPTES_BANCAIRES': {
    fr: 'banque', en: 'banking', es: 'banca', de: 'bankwesen',
    pt: 'banco', ru: 'bank', zh: 'yinhang', ar: 'masrifi', hi: 'banking'
  },
  'BANK_VIREMENTS_CREDITS': {
    fr: 'credits', en: 'credits', es: 'creditos', de: 'kredite',
    pt: 'creditos', ru: 'kredity', zh: 'xindai', ar: 'qurud', hi: 'rin'
  },
  'BANK_SERVICES_FINANCIERS': {
    fr: 'finance', en: 'finance', es: 'finanzas', de: 'finanzen',
    pt: 'financas', ru: 'finansy', zh: 'jinrong', ar: 'maliya', hi: 'vitta'
  },

  // PROBLEMES D'ARGENT
  'ARGT_RETARDS_SALAIRE_IMPAYES': {
    fr: 'impayes', en: 'unpaid', es: 'impagos', de: 'unbezahlt',
    pt: 'nao-pagos', ru: 'nevyplaty', zh: 'qianxin', ar: 'mutaakhira', hi: 'avaidhit'
  },
  'ARGT_ARNAQUES_ESCROQUERIES': {
    fr: 'arnaques', en: 'scams', es: 'estafas', de: 'betrug',
    pt: 'fraudes', ru: 'moshennichestvo', zh: 'zhapian', ar: 'ihtial', hi: 'dhokhadhari'
  },
  'ARGT_SURENDETTEMENT_PLANS': {
    fr: 'surendettement', en: 'debt', es: 'sobreendeudamiento', de: 'ueberschuldung',
    pt: 'superendividamento', ru: 'dolgi', zh: 'chaiqian', ar: 'duyun', hi: 'adhik-rin'
  },
  'ARGT_FRAIS_BANCAIRES_ABUSIFS': {
    fr: 'frais-bancaires', en: 'bank-fees', es: 'comisiones', de: 'bankgebuehren',
    pt: 'taxas-bancarias', ru: 'bankovskie-sbory', zh: 'yinhang-feiyong', ar: 'rusum-masrifiya', hi: 'bank-shulk'
  },
  'ARGT_LITIGES_ETABLISSEMENTS_CREDIT': {
    fr: 'credit', en: 'credit', es: 'credito', de: 'kredit',
    pt: 'credito', ru: 'kredit', zh: 'xinyong', ar: 'itman', hi: 'udhaar'
  },

  // PROBLEMES RELATIONNELS
  'RELA_CONFLITS_VOISINAGE': {
    fr: 'voisinage', en: 'neighborhood', es: 'vecindad', de: 'nachbarschaft',
    pt: 'vizinhanca', ru: 'sosedskie', zh: 'linli', ar: 'jiran', hi: 'padosi'
  },
  'RELA_CONFLITS_TRAVAIL': {
    fr: 'conflits-travail', en: 'work-conflicts', es: 'conflictos-laborales', de: 'arbeitskonflikte',
    pt: 'conflitos-trabalho', ru: 'trudovye-konflikty', zh: 'laozi-jiufen', ar: 'niza-amali', hi: 'kary-sangharsh'
  },
  'RELA_CONFLITS_FAMILIAUX': {
    fr: 'conflits-famille', en: 'family-conflicts', es: 'conflictos-familiares', de: 'familienkonflikte',
    pt: 'conflitos-familiares', ru: 'semeinye-konflikty', zh: 'jiating-jiufen', ar: 'niza-aili', hi: 'parivarik-sangharsh'
  },
  'RELA_MEDIATION_RESOLUTION_AMIABLE': {
    fr: 'mediation', en: 'mediation', es: 'mediacion', de: 'mediation',
    pt: 'mediacao', ru: 'mediatsiya', zh: 'tiaojie', ar: 'wasata', hi: 'madhyasthata'
  },
  'RELA_DIFFAMATION_REPUTATION': {
    fr: 'diffamation', en: 'defamation', es: 'difamacion', de: 'verleumdung',
    pt: 'difamacao', ru: 'kleveta', zh: 'feibang', ar: 'tashhir', hi: 'maanahani'
  },

  // TRANSPORT
  'TRAN_PROBLEMES_AERIENS': {
    fr: 'aerien', en: 'flight', es: 'aereo', de: 'flug',
    pt: 'aereo', ru: 'aviatsiya', zh: 'hangkong', ar: 'jawi', hi: 'udaan'
  },
  'TRAN_BAGAGES_PERDUS_ENDOMMAGES': {
    fr: 'bagages', en: 'luggage', es: 'equipaje', de: 'gepaeck',
    pt: 'bagagem', ru: 'bagazh', zh: 'xingli', ar: 'amtia', hi: 'samaan'
  },
  'TRAN_ACCIDENTS_TRANSPORT': {
    fr: 'transport', en: 'transport', es: 'transporte', de: 'transport',
    pt: 'transporte', ru: 'transport', zh: 'jiaotong', ar: 'naql', hi: 'parivahan'
  },

  // SANTE
  'SANT_ERREURS_MEDICALES': {
    fr: 'medical', en: 'medical', es: 'medico', de: 'medizin',
    pt: 'medico', ru: 'meditsinskoe', zh: 'yiliao', ar: 'tibbi', hi: 'chikitsa'
  },
  'SANT_REMBOURSEMENTS_SOINS': {
    fr: 'soins', en: 'healthcare', es: 'salud', de: 'gesundheit',
    pt: 'saude', ru: 'zdravookhranenie', zh: 'jiankang', ar: 'sihha', hi: 'swasthya'
  },
  'SANT_DROIT_MEDICAL': {
    fr: 'droit-medical', en: 'medical-law', es: 'derecho-medico', de: 'medizinrecht',
    pt: 'direito-medico', ru: 'meditsinskoe-pravo', zh: 'yiliao-fa', ar: 'qanun-tibbi', hi: 'chikitsa-kanoon'
  },

  // NUMERIQUE
  'NUM_CYBERCRIMINALITE': {
    fr: 'cyber', en: 'cyber', es: 'ciber', de: 'cyber',
    pt: 'ciber', ru: 'kiber', zh: 'wangluo', ar: 'saibari', hi: 'cyber'
  },
  'NUM_CONTRATS_EN_LIGNE': {
    fr: 'contrats-ligne', en: 'online-contracts', es: 'contratos-online', de: 'online-vertraege',
    pt: 'contratos-online', ru: 'onlain-kontrakty', zh: 'wangluo-hetong', ar: 'uqud-iliktruniya', hi: 'online-anubandh'
  },
  'NUM_PROTECTION_NUMERIQUE': {
    fr: 'numerique', en: 'digital', es: 'digital', de: 'digital',
    pt: 'digital', ru: 'tsifrovoi', zh: 'shuzi', ar: 'raqmi', hi: 'digital'
  },

  // VIOLENCES ET DISCRIMINATIONS
  'VIO_HARCELEMENT': {
    fr: 'harcelement', en: 'harassment', es: 'acoso', de: 'belaestigung',
    pt: 'assedio', ru: 'domogatelstvo', zh: 'saorao', ar: 'tahrrush', hi: 'utpidan'
  },
  'VIO_VIOLENCES_DOMESTIQUES': {
    fr: 'violences', en: 'violence', es: 'violencia', de: 'gewalt',
    pt: 'violencia', ru: 'nasilie', zh: 'baoli', ar: 'unf', hi: 'hinsa'
  },
  'VIO_DISCRIMINATIONS': {
    fr: 'discriminations', en: 'discrimination', es: 'discriminacion', de: 'diskriminierung',
    pt: 'discriminacao', ru: 'diskriminatsiya', zh: 'qishi', ar: 'tamyiz', hi: 'bhedbhav'
  },

  // PROPRIETE INTELLECTUELLE
  'IP_CONTREFACONS': {
    fr: 'contrefacon', en: 'counterfeiting', es: 'falsificacion', de: 'faelschung',
    pt: 'contrafacao', ru: 'kontrafakt', zh: 'jiamao', ar: 'tazwir', hi: 'nakli'
  },
  'IP_BREVETS_MARQUES': {
    fr: 'brevets', en: 'patents', es: 'patentes', de: 'patente',
    pt: 'patentes', ru: 'patenty', zh: 'zhuanli', ar: 'baraat', hi: 'patent'
  },
  'IP_DROITS_AUTEUR': {
    fr: 'droits-auteur', en: 'copyright', es: 'derechos-autor', de: 'urheberrecht',
    pt: 'direitos-autor', ru: 'avtorskie-prava', zh: 'banquan', ar: 'huquq-mulkiya', hi: 'copyright'
  },

  // ENVIRONNEMENT
  'ENV_NUISANCES': {
    fr: 'nuisances', en: 'nuisances', es: 'molestias', de: 'belaestigungen',
    pt: 'incomodos', ru: 'neudoobstva', zh: 'saorao', ar: 'mudayaqat', hi: 'upadrav'
  },
  'ENV_PERMIS_CONSTRUIRE': {
    fr: 'permis-construire', en: 'building-permit', es: 'licencia-obra', de: 'baugenehmigung',
    pt: 'licenca-construcao', ru: 'razreshenie-stroitelstvo', zh: 'jianzhu-xukezheng', ar: 'rukhsat-binaa', hi: 'nirman-anumati'
  },
  'ENV_DROIT_URBANISME': {
    fr: 'urbanisme', en: 'urban-planning', es: 'urbanismo', de: 'staedtebau',
    pt: 'urbanismo', ru: 'gradostroitelstvo', zh: 'chengshi-guihua', ar: 'takhtit-umrani', hi: 'nagari-niyojan'
  },

  // DROIT COMPARE INTERNATIONAL
  'COMP_DROIT_ISLAMIQUE': {
    fr: 'droit-islamique', en: 'islamic-law', es: 'derecho-islamico', de: 'islamisches-recht',
    pt: 'direito-islamico', ru: 'islamskoe-pravo', zh: 'yisilan-fa', ar: 'sharia', hi: 'islami-kanoon'
  },
  'COMP_COMMON_LAW': {
    fr: 'common-law', en: 'common-law', es: 'common-law', de: 'common-law',
    pt: 'common-law', ru: 'obshchee-pravo', zh: 'yingmei-fa', ar: 'qanun-anglosaksuni', hi: 'common-law'
  },
  'COMP_DROIT_ASIATIQUE': {
    fr: 'droit-asiatique', en: 'asian-law', es: 'derecho-asiatico', de: 'asiatisches-recht',
    pt: 'direito-asiatico', ru: 'aziatskoe-pravo', zh: 'yazhou-fa', ar: 'qanun-asyawi', hi: 'eshiyai-kanoon'
  },
  'COMP_DROIT_AFRICAIN': {
    fr: 'droit-africain', en: 'african-law', es: 'derecho-africano', de: 'afrikanisches-recht',
    pt: 'direito-africano', ru: 'afrikanskoe-pravo', zh: 'feizhou-fa', ar: 'qanun-ifriqi', hi: 'afriki-kanoon'
  },
  'COMP_DROIT_LATINO': {
    fr: 'droit-latino', en: 'latin-law', es: 'derecho-latino', de: 'lateinamerikanisches-recht',
    pt: 'direito-latino', ru: 'latinoamerikanskoe-pravo', zh: 'lamei-fa', ar: 'qanun-latini', hi: 'latin-kanoon'
  },
  'COMP_RECONNAISSANCE_JUGEMENTS': {
    fr: 'jugements', en: 'judgments', es: 'sentencias', de: 'urteile',
    pt: 'sentencas', ru: 'sudebnye-resheniya', zh: 'panjue', ar: 'ahkam', hi: 'nirnay'
  },

  // EDUCATION ET RECONNAISSANCE
  'EDUC_RECONNAISSANCE_DIPLOMES': {
    fr: 'diplomes', en: 'diplomas', es: 'diplomas', de: 'diplome',
    pt: 'diplomas', ru: 'diplomy', zh: 'wenping', ar: 'shahadat', hi: 'diploma'
  },
  'EDUC_EQUIVALENCES': {
    fr: 'equivalences', en: 'equivalences', es: 'equivalencias', de: 'gleichwertigkeit',
    pt: 'equivalencias', ru: 'ekvivalentnost', zh: 'xueli-rending', ar: 'muadala', hi: 'samanksha'
  },
  'EDUC_QUALIFICATIONS_PROFESSIONNELLES': {
    fr: 'qualifications', en: 'qualifications', es: 'cualificaciones', de: 'qualifikationen',
    pt: 'qualificacoes', ru: 'kvalifikatsii', zh: 'zige', ar: 'muahhilat', hi: 'yogyata'
  },

  // RETOUR AU PAYS D'ORIGINE
  'RET_RAPATRIEMENT_BIENS': {
    fr: 'rapatriement-biens', en: 'goods-repatriation', es: 'repatriacion-bienes', de: 'gueterrückfuehrung',
    pt: 'repatriacao-bens', ru: 'repatriatsiya-imushchestva', zh: 'caichan-qianfan', ar: 'iada-mumtalakat', hi: 'sampatti-pratyavartan'
  },
  'RET_REINTEGRATION_FISCALE_SOCIALE': {
    fr: 'reintegration', en: 'reintegration', es: 'reintegracion', de: 'wiedereingliederung',
    pt: 'reintegracao', ru: 'reintegratsiya', zh: 'chongxin-rongru', ar: 'idmaj', hi: 'punarsamavesh'
  },
  'RET_TRANSFERT_PATRIMOINE': {
    fr: 'transfert', en: 'transfer', es: 'transferencia', de: 'uebertragung',
    pt: 'transferencia', ru: 'peredacha', zh: 'zhuanyi', ar: 'naql', hi: 'hastantaran'
  },
  'RET_CLOTURE_COMPTES': {
    fr: 'cloture-comptes', en: 'account-closure', es: 'cierre-cuentas', de: 'kontoschliesssung',
    pt: 'encerramento-contas', ru: 'zakrytie-schetov', zh: 'zhanghu-guanbi', ar: 'ighlaq-hisabat', hi: 'khata-band'
  },

  // AUTRE
  'OTH_PRECISER_BESOIN': {
    fr: 'autre', en: 'other', es: 'otro', de: 'andere',
    pt: 'outro', ru: 'drugoe', zh: 'qita', ar: 'akhar', hi: 'anya'
  },
};

// ==========================================
// TYPES D'AIDE EXPATRIES - NOMS COURTS
// ==========================================

export const EXPAT_HELP_SLUGS: Record<string, SpecialtySlugMapping> = {
  'INSTALLATION': {
    fr: 'installation', en: 'settling', es: 'instalacion', de: 'einrichtung',
    pt: 'instalacao', ru: 'obustroistvo', zh: 'dingju', ar: 'istiqrar', hi: 'sthapna'
  },
  'DEMARCHES_ADMINISTRATIVES': {
    fr: 'administratif', en: 'administrative', es: 'administrativo', de: 'verwaltung',
    pt: 'administrativo', ru: 'administrativnoe', zh: 'xingzheng', ar: 'idari', hi: 'prashasnik'
  },
  'RECHERCHE_LOGEMENT': {
    fr: 'logement', en: 'housing', es: 'vivienda', de: 'wohnung',
    pt: 'habitacao', ru: 'zhilye', zh: 'zhufang', ar: 'sakan', hi: 'aawas'
  },
  'OUVERTURE_COMPTE_BANCAIRE': {
    fr: 'banque', en: 'bank', es: 'banco', de: 'bank',
    pt: 'banco', ru: 'bank', zh: 'yinhang', ar: 'masrif', hi: 'bank'
  },
  'SYSTEME_SANTE': {
    fr: 'sante', en: 'health', es: 'salud', de: 'gesundheit',
    pt: 'saude', ru: 'zdorovye', zh: 'yiliao', ar: 'sihha', hi: 'swasthya'
  },
  'EDUCATION_ECOLES': {
    fr: 'education', en: 'education', es: 'educacion', de: 'bildung',
    pt: 'educacao', ru: 'obrazovanie', zh: 'jiaoyu', ar: 'talim', hi: 'shiksha'
  },
  'TRANSPORT': {
    fr: 'transport', en: 'transport', es: 'transporte', de: 'transport',
    pt: 'transporte', ru: 'transport', zh: 'jiaotong', ar: 'naql', hi: 'parivahan'
  },
  'RECHERCHE_EMPLOI': {
    fr: 'emploi', en: 'job', es: 'empleo', de: 'job',
    pt: 'emprego', ru: 'rabota', zh: 'gongzuo', ar: 'amal', hi: 'naukri'
  },
  'CREATION_ENTREPRISE': {
    fr: 'entreprise', en: 'business', es: 'empresa', de: 'unternehmen',
    pt: 'empresa', ru: 'biznes', zh: 'chuangye', ar: 'sharika', hi: 'vyavasay'
  },
  'FISCALITE_LOCALE': {
    fr: 'fiscal', en: 'tax', es: 'fiscal', de: 'steuer',
    pt: 'fiscal', ru: 'nalog', zh: 'shuiwu', ar: 'dariba', hi: 'kar'
  },
  'CULTURE_INTEGRATION': {
    fr: 'culture', en: 'culture', es: 'cultura', de: 'kultur',
    pt: 'cultura', ru: 'kultura', zh: 'wenhua', ar: 'thaqafa', hi: 'sanskriti'
  },
  'VISA_IMMIGRATION': {
    fr: 'visa', en: 'visa', es: 'visa', de: 'visum',
    pt: 'visto', ru: 'viza', zh: 'qianzheng', ar: 'tashira', hi: 'visa'
  },
  'ASSURANCES': {
    fr: 'assurance', en: 'insurance', es: 'seguro', de: 'versicherung',
    pt: 'seguro', ru: 'strakhovanie', zh: 'baoxian', ar: 'tamin', hi: 'bima'
  },
  'TELEPHONE_INTERNET': {
    fr: 'telecom', en: 'telecom', es: 'telecom', de: 'telekom',
    pt: 'telecom', ru: 'telekom', zh: 'dianxin', ar: 'ittisal', hi: 'telecom'
  },
  'ALIMENTATION_COURSES': {
    fr: 'courses', en: 'shopping', es: 'compras', de: 'einkaufen',
    pt: 'compras', ru: 'pokupki', zh: 'gouwu', ar: 'tasawwuq', hi: 'kharidari'
  },
  'LOISIRS_SORTIES': {
    fr: 'loisirs', en: 'leisure', es: 'ocio', de: 'freizeit',
    pt: 'lazer', ru: 'dosug', zh: 'xiuxian', ar: 'tarfih', hi: 'manoranjan'
  },
  'SPORTS_ACTIVITES': {
    fr: 'sport', en: 'sports', es: 'deportes', de: 'sport',
    pt: 'desporto', ru: 'sport', zh: 'yundong', ar: 'riyada', hi: 'khel'
  },
  'SECURITE': {
    fr: 'securite', en: 'security', es: 'seguridad', de: 'sicherheit',
    pt: 'seguranca', ru: 'bezopasnost', zh: 'anquan', ar: 'amn', hi: 'suraksha'
  },
  'URGENCES': {
    fr: 'urgences', en: 'emergency', es: 'emergencia', de: 'notfall',
    pt: 'emergencia', ru: 'ekstrennoe', zh: 'jinji', ar: 'tawari', hi: 'aapatkaal'
  },
  'PROBLEMES_ARGENT': {
    fr: 'argent', en: 'money', es: 'dinero', de: 'geld',
    pt: 'dinheiro', ru: 'dengi', zh: 'qian', ar: 'mal', hi: 'dhan'
  },
  'PROBLEMES_RELATIONNELS': {
    fr: 'relations', en: 'relationships', es: 'relaciones', de: 'beziehungen',
    pt: 'relacoes', ru: 'otnosheniya', zh: 'guanxi', ar: 'alaqat', hi: 'sambandh'
  },
  'PROBLEMES_DIVERS': {
    fr: 'divers', en: 'various', es: 'varios', de: 'verschiedenes',
    pt: 'varios', ru: 'raznoe', zh: 'qita', ar: 'mutanawwia', hi: 'vibhinn'
  },
  'PARTIR_OU_RENTRER': {
    fr: 'retour', en: 'return', es: 'regreso', de: 'rueckkehr',
    pt: 'retorno', ru: 'vozvrashchenie', zh: 'huiguo', ar: 'awda', hi: 'vapasi'
  },
  'ARNAQUE_VOL': {
    fr: 'arnaque', en: 'scam', es: 'estafa', de: 'betrug',
    pt: 'fraude', ru: 'moshennichestvo', zh: 'zhapian', ar: 'ihtial', hi: 'dhokha'
  },
  'PERTE_DOCUMENTS': {
    fr: 'documents', en: 'documents', es: 'documentos', de: 'dokumente',
    pt: 'documentos', ru: 'dokumenty', zh: 'wenjian', ar: 'wathaeq', hi: 'dastavej'
  },
  'ASSISTANCE_CONSULAIRE': {
    fr: 'consulat', en: 'consulate', es: 'consulado', de: 'konsulat',
    pt: 'consulado', ru: 'konsulstvo', zh: 'lingshiguan', ar: 'qunsliya', hi: 'vaanijyadoot'
  },
  'HEBERGEMENT_URGENCE': {
    fr: 'hebergement', en: 'accommodation', es: 'alojamiento', de: 'unterkunft',
    pt: 'alojamento', ru: 'zhilye', zh: 'zhusu', ar: 'iwa', hi: 'aashray'
  },
  'TRADUCTION_INTERPRETATION': {
    fr: 'traduction', en: 'translation', es: 'traduccion', de: 'uebersetzung',
    pt: 'traducao', ru: 'perevod', zh: 'fanyi', ar: 'tarjama', hi: 'anuvad'
  },
  'PROBLEMES_VOYAGE': {
    fr: 'voyage', en: 'travel', es: 'viaje', de: 'reise',
    pt: 'viagem', ru: 'puteshestvie', zh: 'lvxing', ar: 'safar', hi: 'yatra'
  },
  'TRAVAIL_DISTANCE': {
    fr: 'remote', en: 'remote', es: 'remoto', de: 'fernarbeit',
    pt: 'remoto', ru: 'udalennaya', zh: 'yuancheng', ar: 'buid', hi: 'dursth'
  },
  'COWORKING_COLIVING': {
    fr: 'coworking', en: 'coworking', es: 'coworking', de: 'coworking',
    pt: 'coworking', ru: 'kovorking', zh: 'gongxiang', ar: 'coworking', hi: 'coworking'
  },
  'FISCALITE_NOMADE': {
    fr: 'fiscal-nomade', en: 'nomad-tax', es: 'fiscal-nomada', de: 'nomaden-steuer',
    pt: 'fiscal-nomade', ru: 'nalog-kochevnika', zh: 'youmin-shui', ar: 'dariba-rahhal', hi: 'nomad-kar'
  },
  'ETUDES_INTERNATIONALES': {
    fr: 'etudes', en: 'studies', es: 'estudios', de: 'studien',
    pt: 'estudos', ru: 'ucheba', zh: 'liuxue', ar: 'dirasa', hi: 'adhyayan'
  },
  'LOGEMENT_ETUDIANT': {
    fr: 'logement-etudiant', en: 'student-housing', es: 'alojamiento-estudiante', de: 'studentenwohnung',
    pt: 'alojamento-estudante', ru: 'studencheskoe-zhilye', zh: 'xuesheng-gongyu', ar: 'sakan-talabi', hi: 'chhatra-aawas'
  },
  'BOURSE_FINANCEMENT': {
    fr: 'bourse', en: 'scholarship', es: 'beca', de: 'stipendium',
    pt: 'bolsa', ru: 'stipendiya', zh: 'jiangxuejin', ar: 'minha', hi: 'chatravritti'
  },
  'STAGE_INTERNATIONAL': {
    fr: 'stage', en: 'internship', es: 'practicas', de: 'praktikum',
    pt: 'estagio', ru: 'stazhirovka', zh: 'shixi', ar: 'tadrib', hi: 'internship'
  },
  'RETRAITE_ETRANGER': {
    fr: 'retraite', en: 'retirement', es: 'jubilacion', de: 'ruhestand',
    pt: 'aposentadoria', ru: 'pensiya', zh: 'tuixiu', ar: 'taqaud', hi: 'sevanivrutti'
  },
  'SANTE_SENIORS': {
    fr: 'seniors', en: 'seniors', es: 'mayores', de: 'senioren',
    pt: 'idosos', ru: 'pozhilye', zh: 'laoren', ar: 'kibar', hi: 'vriddhajan'
  },
  'PENSION_INTERNATIONALE': {
    fr: 'pension', en: 'pension', es: 'pension', de: 'rente',
    pt: 'pensao', ru: 'pensiya', zh: 'yanglao', ar: 'maash', hi: 'pension'
  },
  'SCOLARITE_ENFANTS': {
    fr: 'scolarite', en: 'schooling', es: 'escolaridad', de: 'schulbildung',
    pt: 'escolaridade', ru: 'obuchenie', zh: 'jiaoyu', ar: 'talim', hi: 'shiksha'
  },
  'GARDE_ENFANTS': {
    fr: 'garde-enfants', en: 'childcare', es: 'cuidado-ninos', de: 'kinderbetreuung',
    pt: 'cuidado-criancas', ru: 'ukhod-deti', zh: 'tuoer', ar: 'riaya-atfal', hi: 'bal-dekhbhal'
  },
  'ACTIVITES_ENFANTS': {
    fr: 'activites-enfants', en: 'kids-activities', es: 'actividades-ninos', de: 'kinderaktivitaeten',
    pt: 'atividades-criancas', ru: 'detskie-zanyatiya', zh: 'ertong-huodong', ar: 'anshita-atfal', hi: 'bal-gatividhiyan'
  },
  'DEMENAGEMENT_INTERNATIONAL': {
    fr: 'demenagement', en: 'moving', es: 'mudanza', de: 'umzug',
    pt: 'mudanca', ru: 'pereezd', zh: 'banjia', ar: 'naql', hi: 'sthanantar'
  },
  'ANIMAUX_COMPAGNIE': {
    fr: 'animaux', en: 'pets', es: 'mascotas', de: 'haustiere',
    pt: 'animais', ru: 'zhivotnye', zh: 'chongwu', ar: 'hayawanat', hi: 'paaltu'
  },
  'PERMIS_CONDUIRE': {
    fr: 'permis', en: 'license', es: 'licencia', de: 'fuehrerschein',
    pt: 'carta', ru: 'prava', zh: 'jiashi', ar: 'rukhsa', hi: 'license'
  },
  'COMMUNAUTE_EXPATRIES': {
    fr: 'communaute', en: 'community', es: 'comunidad', de: 'gemeinschaft',
    pt: 'comunidade', ru: 'soobshchestvo', zh: 'shequ', ar: 'mujtamaa', hi: 'samuday'
  },
  'SOUTIEN_PSYCHOLOGIQUE': {
    fr: 'psycho', en: 'mental', es: 'psicologia', de: 'psycho',
    pt: 'psicologia', ru: 'psikhologiya', zh: 'xinli', ar: 'nafsi', hi: 'mansik'
  },
  'AUTRE_PRECISER': {
    fr: 'autre', en: 'other', es: 'otro', de: 'andere',
    pt: 'outro', ru: 'drugoe', zh: 'qita', ar: 'akhar', hi: 'anya'
  },
};

// ==========================================
// FONCTION UTILITAIRE
// ==========================================

/**
 * Recupere le slug court d'une specialite dans une langue donnee
 */
export function getSpecialtySlug(
  specialtyCode: string,
  lang: string,
  providerType: 'lawyer' | 'expat'
): string {
  const mappings = providerType === 'lawyer' ? LAWYER_SPECIALTY_SLUGS : EXPAT_HELP_SLUGS;
  const mapping = mappings[specialtyCode];

  if (!mapping) {
    // Fallback: slugifier le code
    return specialtyCode.toLowerCase().replace(/_/g, '-').substring(0, 15);
  }

  const langKey = lang as keyof SpecialtySlugMapping;
  return mapping[langKey] || mapping.fr || mapping.en;
}

/**
 * Recupere le premier slug de specialite disponible
 */
export function getFirstSpecialtySlug(
  specialties: string[],
  lang: string,
  providerType: 'lawyer' | 'expat'
): string | null {
  if (!specialties || specialties.length === 0) return null;
  return getSpecialtySlug(specialties[0], lang, providerType);
}
