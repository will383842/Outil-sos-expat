/**
 * SOS Expat - Cloudflare Worker for Bot Detection and SSR Redirect
 *
 * This worker intercepts requests and:
 * 1. Detects bot user-agents (search engines, social media crawlers, AI bots)
 * 2. For bots visiting provider profile URLs, redirects to Firebase Cloud Function for SSR
 * 3. For regular users, passes the request through to the origin (Digital Ocean)
 */

// =========================================================================
// COUNTRY SLUG TRANSLATIONS for lawyer/expat listing URL normalization
// Auto-generated from sos/src/data/country-slug-translations.ts (247 countries × 9 languages)
// Format: ISO → [fr, en, es, de, pt, ru, zh, ar, hi] (position = language index)
// =========================================================================
const _CS = {"AE":["emirats-arabes-unis","united-arab-emirates","emiratos-arabes","vae","emirados-arabes","oae","alianqiu","al-imarat","sanyukt-arab"],"AL":["albanie","albania","albania","albanien","albania","albaniya","aerbaniya","albania","albaniya"],"AO":["angola","angola","angola","angola","angola","angola","angola","angola","angola"],"AR":["argentine","argentina","argentina","argentinien","argentina","argentina","agenting","al-arjantin","arjantina"],"AU":["australie","australia","australia","australien","australia","avstraliya","aodaliya","ustralia","australia"],"BE":["belgique","belgium","belgica","belgien","belgica","belgiya","bilishi","beljika","beljiyam"],"BR":["bresil","brazil","brasil","brasilien","brasil","braziliya","baxi","al-brazil","brazil"],"CA":["canada","canada","canada","kanada","canada","kanada","jianada","kanada","kanada"],"CH":["suisse","switzerland","suiza","schweiz","suica","shveytsariya","ruishi","swisra","switzerland"],"CI":["cote-d-ivoire","ivory-coast","costa-de-marfil","elfenbeinkueste","costa-do-marfim","kot-divuar","ketediwa","kot-difuar","ivory-coast"],"CM":["cameroun","cameroon","camerun","kamerun","camaroes","kamerun","kamailong","al-kamirun","kamerun"],"CO":["colombie","colombia","colombia","kolumbien","colombia","kolumbiya","gelunbiya","kulumbiya","kolambiya"],"CZ":["tchequie","czech-republic","chequia","tschechien","tchequie","chekhiya","jieke","tshik","chek-ganatantra"],"DE":["allemagne","germany","alemania","deutschland","alemanha","germaniya","deguo","almanya","jarmani"],"DJ":["djibouti","djibouti","yibuti","dschibuti","djibuti","dzhibuti","jibuti","jibuti","jibuti"],"DO":["republique-dominicaine","dominican-republic","rep-dominicana","dominikanische-rep","rep-dominicana","dominikana","duominijia","al-dominikan","dominikan"],"DZ":["algerie","algeria","argelia","algerien","argelia","alzhir","aerjiliya","al-jazair","aljeriya"],"EE":["estonie","estonia","estonia","estland","estonia","estoniya","aishaniya","istunia","estoniya"],"EG":["egypte","egypt","egipto","aegypten","egito","yegipet","aiji","misr","misr"],"ES":["espagne","spain","espana","spanien","espanha","ispaniya","xibanya","isbanya","spain"],"ET":["ethiopie","ethiopia","etiopia","aethiopien","etiopia","efiopiya","aisaiobiya","ithyubya","ithiyopiya"],"FR":["france","france","francia","frankreich","franca","frantsiya","faguo","faransa","phrans"],"GA":["gabon","gabon","gabon","gabun","gabao","gabon","jiapeng","al-gabun","gabon"],"GB":["royaume-uni","united-kingdom","reino-unido","vereinigtes-koenigreich","reino-unido","velikobritaniya","yingguo","britaniya","britain"],"GF":["guyane-francaise","french-guiana","guayana-francesa","franz-guayana","guiana-francesa","fr-gviana","faguiana","ghiyana-fr","french-guiana"],"GH":["ghana","ghana","ghana","ghana","gana","gana","jiana","ghana","ghana"],"GP":["guadeloupe","guadeloupe","guadalupe","guadeloupe","guadalupe","gvadelupa","guadeluopu","ghuadalub","guadeloupe"],"HK":["hong-kong","hong-kong","hong-kong","hongkong","hong-kong","gonkong","xianggang","hung-kung","hong-kong"],"HR":["croatie","croatia","croacia","kroatien","croacia","khorvatiya","keluodiya","kurwatiya","kroeshiya"],"HT":["haiti","haiti","haiti","haiti","haiti","gaiti","haidi","hayti","haiti"],"IE":["irlande","ireland","irlanda","irland","irlanda","irlandiya","aierlan","irlanda","ayarland"],"IL":["israel","israel","israel","israel","israel","izrail","yiselie","israil","israel"],"IN":["inde","india","india","indien","india","indiya","yindu","al-hind","bharat"],"IT":["italie","italy","italia","italien","italia","italiya","yidali","italiya","italy"],"JP":["japon","japan","japon","japan","japao","yaponiya","riben","al-yaban","japan"],"KE":["kenya","kenya","kenia","kenia","quenia","keniya","kenniya","kinya","kenya"],"KH":["cambodge","cambodia","camboya","kambodscha","camboja","kambodzha","jianpuzhai","kambodya","kambodia"],"KR":["coree-du-sud","south-korea","corea-del-sur","suedkorea","coreia-do-sul","yuzh-koreya","hanguo","kurya-janub","dakshin-koriya"],"KW":["koweit","kuwait","kuwait","kuwait","kuwait","kuveyt","keweite","al-kuwayt","kuwait"],"KZ":["kazakhstan","kazakhstan","kazajistan","kasachstan","cazaquistao","kazakhstan","hasakesitan","kazakhistan","kazakhstan"],"LB":["liban","lebanon","libano","libanon","libano","livan","libanen","lubnan","lebanon"],"MA":["maroc","morocco","marruecos","marokko","marrocos","marokko","moluoge","al-maghrib","morocco"],"MD":["moldavie","moldova","moldavia","moldawien","moldavia","moldaviya","moerdowa","muldufa","moldova"],"MU":["maurice","mauritius","mauricio","mauritius","mauricio","mavrikiy","maoliqiusi","muritus","mauritius"],"MX":["mexique","mexico","mexico","mexiko","mexico","meksika","moxige","al-maksik","mexico"],"NI":["nicaragua","nicaragua","nicaragua","nicaragua","nicaragua","nikaragua","nilajia","nikaragwa","nicaragua"],"NL":["pays-bas","netherlands","paises-bajos","niederlande","paises-baixos","niderlandy","helan","hulanda","netherlands"],"PF":["polynesie-francaise","french-polynesia","polinesia-francesa","franz-polynesien","polinesia-francesa","fr-polineziya","fa-bolinixiya","bulinizya-fr","french-polynesia"],"PL":["pologne","poland","polonia","polen","polonia","polsha","bolan","bulanda","poland"],"PT":["portugal","portugal","portugal","portugal","portugal","portugaliya","putaoya","al-burtughal","portugal"],"RO":["roumanie","romania","rumania","rumaenien","romenia","ruminiya","luomaniya","rumaniya","romania"],"SA":["arabie-saoudite","saudi-arabia","arabia-saudita","saudi-arabien","arabia-saudita","saud-araviya","shate","as-saudiya","saudi-arab"],"SE":["suede","sweden","suecia","schweden","suecia","shvetsiya","ruidian","as-suwayd","sweden"],"SG":["singapour","singapore","singapur","singapur","singapura","singapur","xinjiapo","singhafura","singapore"],"SN":["senegal","senegal","senegal","senegal","senegal","senegal","saineijiaer","as-sinighal","senegal"],"TH":["thailande","thailand","tailandia","thailand","tailandia","tailand","taiguo","tailand","thailand"],"TN":["tunisie","tunisia","tunez","tunesien","tunisia","tunis","tunisi","tunis","tunisia"],"TR":["turquie","turkey","turquia","tuerkei","turquia","turtsiya","tuerqi","turkiya","turkey"],"TT":["trinite-et-tobago","trinidad-and-tobago","trinidad-y-tobago","trinidad-tobago","trinidad-e-tobago","trinidad-tobago","telinida","trinidad","trinidad-tobago"],"US":["etats-unis","united-states","estados-unidos","usa","estados-unidos","ssha","meiguo","amrika","america"],"ZA":["afrique-du-sud","south-africa","sudafrica","suedafrika","africa-do-sul","yuar","nanfei","janub-ifriqya","dakshin-africa"],"ZM":["zambie","zambia","zambia","sambia","zambia","zambiya","zanbiya","zambiya","zambia"],"AF":["afghanistan","afghanistan","afganistan","afghanistan","afeganistao","afganistan","afuhan","afghanistan","afghanistan"],"AT":["autriche","austria","austria","oesterreich","austria","avstriya","aodili","an-nimsa","austria"],"AZ":["azerbaidjan","azerbaijan","azerbaiyan","aserbaidschan","azerbaijao","azerbaydzhan","asetbaijiang","azerbayjan","azerbaijan"],"BD":["bangladesh","bangladesh","bangladesh","bangladesch","bangladesh","bangladesh","mengjiala","bangladesh","bangladesh"],"BF":["burkina-faso","burkina-faso","burkina-faso","burkina-faso","burkina-faso","burkina-faso","bujina","burkina-fasu","burkina-faso"],"BG":["bulgarie","bulgaria","bulgaria","bulgarien","bulgaria","bolgariya","baojialiya","bulgharia","bulgaria"],"BH":["bahrein","bahrain","barein","bahrain","bahrein","bakhreyn","balin","al-bahrayn","bahrain"],"BO":["bolivie","bolivia","bolivia","bolivien","bolivia","boliviya","boliweiya","bulifya","bolivia"],"BY":["bielorussie","belarus","bielorrusia","belarus","bielorrussia","belarus","baieluosi","bilarusia","belarus"],"CD":["rd-congo","dr-congo","rd-congo","dr-kongo","rd-congo","dr-kongo","gangguomin","al-kungu-dim","dr-congo"],"CG":["congo","congo","congo","kongo","congo","kongo","ganguo","al-kungu","congo"],"CL":["chili","chile","chile","chile","chile","chili","zhili","tshili","chile"],"CN":["chine","china","china","china","china","kitay","zhongguo","as-sin","chin"],"CR":["costa-rica","costa-rica","costa-rica","costa-rica","costa-rica","kosta-rika","gesidalijia","kusta-rika","costa-rica"],"CU":["cuba","cuba","cuba","kuba","cuba","kuba","guba","kuba","cuba"],"CY":["chypre","cyprus","chipre","zypern","chipre","kipr","saipulusi","qubrus","cyprus"],"DK":["danemark","denmark","dinamarca","daenemark","dinamarca","daniya","danmai","ad-danimark","denmark"],"EC":["equateur","ecuador","ecuador","ecuador","equador","ekvador","eguaduoer","ikwadur","ecuador"],"FI":["finlande","finland","finlandia","finnland","finlandia","finlyandiya","fenlan","finlanda","finland"],"GE":["georgie","georgia","georgia","georgien","georgia","gruziya","gelu-jiya","jurjiya","georgia"],"GN":["guinee","guinea","guinea","guinea","guine","gvineya","jineiya","ghiniya","guinea"],"GR":["grece","greece","grecia","griechenland","grecia","gretsiya","xila","al-yunan","greece"],"GT":["guatemala","guatemala","guatemala","guatemala","guatemala","gvatemala","guadimala","ghwatimala","guatemala"],"HN":["honduras","honduras","honduras","honduras","honduras","gonduras","hongdulasi","hunduras","honduras"],"HU":["hongrie","hungary","hungria","ungarn","hungria","vengriya","xiongyali","al-majar","hungary"],"ID":["indonesie","indonesia","indonesia","indonesien","indonesia","indoneziya","yindunixiya","indunisya","indonesia"],"IQ":["irak","iraq","irak","irak","iraque","irak","yilake","al-iraq","iraq"],"IR":["iran","iran","iran","iran","irao","iran","yilang","iran","iran"],"IS":["islande","iceland","islandia","island","islandia","islandiya","bingdao","ayslanda","iceland"],"JM":["jamaique","jamaica","jamaica","jamaika","jamaica","yamayka","yamaijia","jamayka","jamaica"],"JO":["jordanie","jordan","jordania","jordanien","jordania","iordaniya","yuedan","al-urdun","jordan"],"LK":["sri-lanka","sri-lanka","sri-lanka","sri-lanka","sri-lanka","shri-lanka","silanka","sri-lanka","shri-lanka"],"LT":["lituanie","lithuania","lituania","litauen","lituania","litva","litaowan","litwanya","lithuania"],"LU":["luxembourg","luxembourg","luxemburgo","luxemburg","luxemburgo","lyuksemburg","lusenbao","luksumburg","luxembourg"],"LV":["lettonie","latvia","letonia","lettland","letonia","latviya","latweiya","latfiya","latvia"],"LY":["libye","libya","libia","libyen","libia","liviya","libiya","libiya","libya"],"MG":["madagascar","madagascar","madagascar","madagaskar","madagascar","madagaskar","madajiasijia","madaghashqar","madagascar"],"ML":["mali","mali","mali","mali","mali","mali","mali","mali","mali"],"MM":["myanmar","myanmar","myanmar","myanmar","mianmar","myanma","miandian","myanmar","myanmar"],"MN":["mongolie","mongolia","mongolia","mongolei","mongolia","mongoliya","menggu","mughuliya","mongolia"],"MY":["malaisie","malaysia","malasia","malaysia","malasia","malayziya","malaixiya","malizya","malaysia"],"MZ":["mozambique","mozambique","mozambique","mosambik","mocambique","mozambik","mosangbike","muzambiq","mozambique"],"NE":["niger","niger","niger","niger","niger","niger","nirier","an-nijar","niger"],"NG":["nigeria","nigeria","nigeria","nigeria","nigeria","nigeriya","niriliya","nijirya","nigeria"],"NO":["norvege","norway","noruega","norwegen","noruega","norvegiya","nuowei","an-nurwij","norway"],"NP":["nepal","nepal","nepal","nepal","nepal","nepal","niboer","nibal","nepal"],"NZ":["nouvelle-zelande","new-zealand","nueva-zelanda","neuseeland","nova-zelandia","novaya-zelandiya","xinxilan","nyuzilenda","new-zealand"],"OM":["oman","oman","oman","oman","oma","oman","aman","uman","oman"],"PA":["panama","panama","panama","panama","panama","panama","banama","banama","panama"],"PE":["perou","peru","peru","peru","peru","peru","bilu","biru","peru"],"PH":["philippines","philippines","filipinas","philippinen","filipinas","filippiny","feilvbin","al-filibin","philippines"],"PK":["pakistan","pakistan","pakistan","pakistan","paquistao","pakistan","bajisitan","bakistan","pakistan"],"PY":["paraguay","paraguay","paraguay","paraguay","paraguai","paragvay","balaguai","barghway","paraguay"],"QA":["qatar","qatar","catar","katar","catar","katar","kataer","qatar","qatar"],"RS":["serbie","serbia","serbia","serbien","servia","serbiya","saierweiya","sirbya","serbia"],"RU":["russie","russia","rusia","russland","russia","rossiya","eluosi","rusya","russia"],"RW":["rwanda","rwanda","ruanda","ruanda","ruanda","ruanda","luwanda","ruwanda","rwanda"],"SD":["soudan","sudan","sudan","sudan","sudao","sudan","sudan","as-sudan","sudan"],"SI":["slovenie","slovenia","eslovenia","slowenien","eslovenia","sloveniya","siluowenniya","slufinia","slovenia"],"SK":["slovaquie","slovakia","eslovaquia","slowakei","eslovaquia","slovakiya","siluofake","slufakya","slovakia"],"SY":["syrie","syria","siria","syrien","siria","siriya","xuliya","suriya","syria"],"TD":["tchad","chad","chad","tschad","chade","chad","zhade","tshad","chad"],"TG":["togo","togo","togo","togo","togo","togo","duoge","tughu","togo"],"TW":["taiwan","taiwan","taiwan","taiwan","taiwan","tayvan","taiwan","taywan","taiwan"],"TZ":["tanzanie","tanzania","tanzania","tansania","tanzania","tanzaniya","tansaniya","tanzania","tanzania"],"UA":["ukraine","ukraine","ucrania","ukraine","ucrania","ukraina","wukelan","ukraniya","ukraine"],"UG":["ouganda","uganda","uganda","uganda","uganda","uganda","wuganda","ughanda","uganda"],"UY":["uruguay","uruguay","uruguay","uruguay","uruguai","urugvay","wulagui","urughway","uruguay"],"UZ":["ouzbekistan","uzbekistan","uzbekistan","usbekistan","uzbequistao","uzbekistan","wuzibieke","uzbakistan","uzbekistan"],"VE":["venezuela","venezuela","venezuela","venezuela","venezuela","venesuela","weineiruila","finzwila","venezuela"],"VN":["vietnam","vietnam","vietnam","vietnam","vietna","vyetnam","yuenan","fitnam","vietnam"],"ZW":["zimbabwe","zimbabwe","zimbabue","simbabwe","zimbabue","zimbabve","jinbabuwei","zimbabwi","zimbabwe"],"AD":["andorre","andorra","andorra","andorra","andorra","andorra","andaoer","andura","andorra"],"AG":["antigua-et-barbuda","antigua-and-barbuda","antigua-y-barbuda","antigua-barbuda","antigua-e-barbuda","antigua-barbuda","antigua","antigua","antigua-barbuda"],"AI":["anguilla","anguilla","anguila","anguilla","anguilla","angilya","anguila","anghila","anguilla"],"AM":["armenie","armenia","armenia","armenien","armenia","armeniya","yameinniya","arminiya","armenia"],"AQ":["antarctique","antarctica","antartida","antarktis","antartida","antarktida","nanji","antartika","antarctica"],"AS":["samoa-americaines","american-samoa","samoa-americana","amerik-samoa","samoa-americana","amer-samoa","mei-samoya","samwa-amrik","american-samoa"],"AW":["aruba","aruba","aruba","aruba","aruba","aruba","aluba","aruba","aruba"],"AX":["iles-aland","aland-islands","islas-aland","alandinseln","ilhas-aland","alandy","aolan","juzur-aland","aland"],"BB":["barbade","barbados","barbados","barbados","barbados","barbados","babaduosi","barbadus","barbados"],"BI":["burundi","burundi","burundi","burundi","burundi","burundi","bulongdi","burundi","burundi"],"BJ":["benin","benin","benin","benin","benim","benin","beining","binin","benin"],"BL":["saint-barthelemy","saint-barthelemy","san-bartolome","saint-barthelemy","sao-bartolomeu","sen-bartelemi","shengbatailemi","san-bartilimi","saint-barthelemy"],"BM":["bermudes","bermuda","bermudas","bermuda","bermudas","bermudskiye","baimuda","bermuda","bermuda"],"BN":["brunei","brunei","brunei","brunei","brunei","bruney","wenlai","brunay","brunei"],"BQ":["bonaire","bonaire","bonaire","bonaire","bonaire","boner","bonaire","bunir","bonaire"],"BS":["bahamas","bahamas","bahamas","bahamas","bahamas","bagamy","bahama","al-bahama","bahamas"],"BT":["bhoutan","bhutan","butan","bhutan","butao","butan","budan","bhutan","bhutan"],"BV":["ile-bouvet","bouvet-island","isla-bouvet","bouvetinsel","ilha-bouvet","ostrov-buve","buwei","jazirat-bufi","bouvet-island"],"BW":["botswana","botswana","botsuana","botswana","botsuana","botsvana","bociwana","butswana","botswana"],"BZ":["belize","belize","belice","belize","belize","beliz","bolizi","biliz","belize"],"CC":["iles-cocos","cocos-islands","islas-cocos","kokosinseln","ilhas-cocos","kokosovye","kekesi","juzur-kukus","cocos-islands"],"CF":["centrafrique","central-african-rep","rep-centroafricana","zentralafrika","rep-centro-africana","tsar","zhongfei","ifriqya-wusta","central-africa"],"CK":["iles-cook","cook-islands","islas-cook","cookinseln","ilhas-cook","ostr-kuka","kuke","juzur-kuk","cook-islands"],"CV":["cap-vert","cape-verde","cabo-verde","kap-verde","cabo-verde","kabo-verde","fode","al-ras-akhdar","cape-verde"],"CW":["curacao","curacao","curazao","curacao","curacao","kyurasao","kulasuo","kurasao","curacao"],"CX":["ile-christmas","christmas-island","isla-navidad","weihnachtsinsel","ilha-christmas","ostr-rozhdestva","shengdan","jazirat-krismus","christmas-island"],"DM":["dominique","dominica","dominica","dominica","dominica","dominika","duominike","duminika","dominica"],"ER":["erythree","eritrea","eritrea","eritrea","eritreia","eritreya","eliteliya","iritrya","eritrea"],"FJ":["fidji","fiji","fiyi","fidschi","fiji","fidzhi","feiji","fiji","fiji"],"FK":["iles-malouines","falkland-islands","islas-malvinas","falklandinseln","ilhas-malvinas","folklendskie","fukelan","juzur-fulkland","falkland-islands"],"FM":["micronesie","micronesia","micronesia","mikronesien","micronesia","mikroneziya","mikeluo","mikrunizya","micronesia"],"FO":["iles-feroe","faroe-islands","islas-feroe","faeroeer","ilhas-faroe","farery","faluo","juzur-faru","faroe-islands"],"GD":["grenade","grenada","granada","grenada","granada","grenada","gelinada","ghrinada","grenada"],"GG":["guernesey","guernsey","guernsey","guernsey","guernsey","gernsi","genxi","ghirnzi","guernsey"],"GI":["gibraltar","gibraltar","gibraltar","gibraltar","gibraltar","gibraltar","zhibuluotuo","jabal-tariq","gibraltar"],"GL":["groenland","greenland","groenlandia","groenland","groenlandia","grenlandiya","gelinlan","ghrinland","greenland"],"GM":["gambie","gambia","gambia","gambia","gambia","gambiya","gangbiya","ghambiya","gambia"],"GQ":["guinee-equatoriale","equatorial-guinea","guinea-ecuatorial","aequatorialguinea","guine-equatorial","ekv-gvineya","chidao-jineiya","ghiniya-ist","eq-guinea"],"GS":["georgie-du-sud","south-georgia","georgia-del-sur","suedgeorgien","georgia-do-sul","yuzh-georgiya","nan-qiaozhiya","jurjya-janub","south-georgia"],"GU":["guam","guam","guam","guam","guam","guam","guandao","ghwam","guam"],"GW":["guinee-bissau","guinea-bissau","guinea-bisau","guinea-bissau","guine-bissau","gvineya-bisau","jineiya-bisao","ghiniya-bisau","guinea-bissau"],"GY":["guyana","guyana","guyana","guyana","guiana","gayana","guiyana","ghayana","guyana"],"HM":["iles-heard","heard-island","isla-heard","heard-mcdonald","ilha-heard","ostr-kherd","hede","jazirat-hird","heard-island"],"IM":["ile-de-man","isle-of-man","isla-de-man","insel-man","ilha-de-man","ostr-men","mandao","jazirat-man","isle-of-man"],"IO":["terr-brit-ocean-ind","british-indian-ocean","terr-brit-oceano","brit-ind-ozean","terr-brit-oceano","brit-ind-okean","yindu-yang","muhit-hindi-brit","british-indian"],"JE":["jersey","jersey","jersey","jersey","jersey","dzhersi","zexi","jirzi","jersey"],"KG":["kirghizistan","kyrgyzstan","kirguistan","kirgisistan","quirguistao","kirgiziya","jierjisi","qirghizstan","kyrgyzstan"],"KI":["kiribati","kiribati","kiribati","kiribati","kiribati","kiribati","jilibasi","kiribati","kiribati"],"KM":["comores","comoros","comoras","komoren","comores","komory","kemoluo","juzur-qamar","comoros"],"KN":["saint-kitts","saint-kitts-nevis","san-cristobal","st-kitts-nevis","sao-cristovao","sent-kits","shengji","sant-kits","saint-kitts"],"KP":["coree-du-nord","north-korea","corea-del-norte","nordkorea","coreia-do-norte","sev-koreya","chaoxian","kurya-shamal","uttar-koriya"],"LA":["laos","laos","laos","laos","laos","laos","laowo","lawus","laos"],"LC":["sainte-lucie","saint-lucia","santa-lucia","st-lucia","santa-lucia","sent-lyusiya","shengluxiya","sant-lusiya","saint-lucia"],"LI":["liechtenstein","liechtenstein","liechtenstein","liechtenstein","liechtenstein","likhtenshtein","liezhidun","likhtnshtayn","liechtenstein"],"LR":["liberia","liberia","liberia","liberia","liberia","liberiya","libiliya","librya","liberia"],"LS":["lesotho","lesotho","lesoto","lesotho","lesoto","lesoto","laisotuo","lisuthu","lesotho"],"MC":["monaco","monaco","monaco","monaco","monaco","monako","monage","munaku","monaco"],"ME":["montenegro","montenegro","montenegro","montenegro","montenegro","chernogoriya","heishang","al-jabal-aswad","montenegro"],"MF":["saint-martin","saint-martin","san-martin","saint-martin","sao-martinho","sen-marten","shengmading","san-martin","saint-martin"],"MH":["iles-marshall","marshall-islands","islas-marshall","marshallinseln","ilhas-marshall","marshallovy","mashaoer","juzur-marshal","marshall-islands"],"MK":["macedoine-du-nord","north-macedonia","macedonia-norte","nordmazedonien","macedonia-norte","sev-makedoniya","bei-masidun","maqdunya-shamal","north-macedonia"],"MO":["macao","macao","macao","macau","macau","makao","aomen","makaw","macao"],"MP":["iles-mariannes","northern-mariana","islas-marianas","nordmariannen","ilhas-marianas","sev-mariany","bei-maliana","juzur-maryana","north-mariana"],"MQ":["martinique","martinique","martinica","martinique","martinica","martinika","matinike","martinik","martinique"],"MR":["mauritanie","mauritania","mauritania","mauretanien","mauritania","mavritaniya","maolitaniya","muritanya","mauritania"],"MS":["montserrat","montserrat","montserrat","montserrat","montserrat","montserrat","mengsailate","muntsarat","montserrat"],"MT":["malte","malta","malta","malta","malta","malta","maerta","malta","malta"],"MV":["maldives","maldives","maldivas","malediven","maldivas","maldivy","maerdaifu","al-maldif","maldives"],"MW":["malawi","malawi","malaui","malawi","malawi","malavi","malawei","malawi","malawi"],"NA":["namibie","namibia","namibia","namibia","namibia","namibiya","namibiya","namibya","namibia"],"NC":["nouvelle-caledonie","new-caledonia","nueva-caledonia","neukaledonien","nova-caledonia","novaya-kaledon","xin-kaleduo","kalidunya-jadid","new-caledonia"],"NF":["ile-norfolk","norfolk-island","isla-norfolk","norfolkinsel","ilha-norfolk","ostr-norfolk","nuofuke","jazirat-nurfulk","norfolk-island"],"NR":["nauru","nauru","nauru","nauru","nauru","nauru","naolu","nawru","nauru"],"NU":["niue","niue","niue","niue","niue","niue","niuai","niyu","niue"],"PG":["papouasie-nv-guinee","papua-new-guinea","papua-nueva-guinea","papua-neuguinea","papua-nova-guine","papua-n-gvineya","baxin-jineiya","babwa-ghiniya","papua-new-guinea"],"PM":["saint-pierre","saint-pierre","san-pedro","saint-pierre","sao-pedro","sen-pyer","shengpiyer","san-byir","saint-pierre"],"PN":["pitcairn","pitcairn","pitcairn","pitcairninseln","pitcairn","pitkern","pitkaien","bitkairn","pitcairn"],"PR":["porto-rico","puerto-rico","puerto-rico","puerto-rico","porto-rico","puerto-riko","boetolige","burtu-riku","puerto-rico"],"PS":["palestine","palestine","palestina","palaestina","palestina","palestina","balesitan","filastin","palestine"],"PW":["palaos","palau","palaos","palau","palau","palau","belao","balaw","palau"],"RE":["la-reunion","reunion","reunion","reunion","reuniao","reunion","liuliwang","riyunyun","reunion"],"SB":["iles-salomon","solomon-islands","islas-salomon","salomonen","ilhas-salomao","solomonovy","suoluomen","juzur-suliman","solomon-islands"],"SC":["seychelles","seychelles","seychelles","seychellen","seicheles","seyshely","saisheer","sayshil","seychelles"],"SH":["sainte-helene","saint-helena","santa-elena","st-helena","santa-helena","sv-yeleny","shenghelena","sant-hilina","saint-helena"],"SJ":["svalbard","svalbard","svalbard","svalbard","svalbard","shpitsbergen","siwaerbade","sfalbar","svalbard"],"SL":["sierra-leone","sierra-leone","sierra-leona","sierra-leone","serra-leoa","sierra-leone","sailaliang","sira-lyun","sierra-leone"],"SM":["saint-marin","san-marino","san-marino","san-marino","sao-marinho","san-marino","shengmalino","san-marinu","san-marino"],"SO":["somalie","somalia","somalia","somalia","somalia","somali","suomali","as-sumal","somalia"],"SR":["suriname","suriname","surinam","suriname","suriname","surinam","sulinan","surinam","suriname"],"SS":["soudan-du-sud","south-sudan","sudan-del-sur","suedsudan","sudao-do-sul","yuzh-sudan","nan-sudan","sudan-janub","south-sudan"],"ST":["sao-tome-et-principe","sao-tome-principe","santo-tome","sao-tome","sao-tome-principe","san-tome","shengtome","saw-tumi","sao-tome"],"SV":["el-salvador","el-salvador","el-salvador","el-salvador","el-salvador","salvador","saerwaduo","as-salfadur","el-salvador"],"SX":["sint-maarten","sint-maarten","sint-maarten","sint-maarten","sint-maarten","sint-marten","shengmading-nl","sint-martan","sint-maarten"],"SZ":["eswatini","eswatini","esuatini","eswatini","eswatini","esvantini","esiwadini","iswatini","eswatini"],"TC":["iles-turques","turks-and-caicos","islas-turcas","turks-caicos","ilhas-turcas","terks-kaykos","teke-kaike","turks-kaykus","turks-caicos"],"TF":["terres-australes-fr","french-southern","tierras-australes","franz-suedgebiete","terras-austr-fr","fr-yuzhn-terr","fa-nan-lingdi","aradi-janub-fr","french-southern"],"TJ":["tadjikistan","tajikistan","tayikistan","tadschikistan","tajiquistao","tadzhikistan","tajikesitan","tajikistan","tajikistan"],"TK":["tokelau","tokelau","tokelau","tokelau","tokelau","tokelau","tuokelao","tukilaw","tokelau"],"TL":["timor-oriental","timor-leste","timor-oriental","osttimor","timor-leste","vost-timor","dongdiwen","timur-sharq","timor-leste"],"TM":["turkmenistan","turkmenistan","turkmenistan","turkmenistan","turquemenistao","turkmenistan","tukumansitan","turkmanistan","turkmenistan"],"TO":["tonga","tonga","tonga","tonga","tonga","tonga","tangjia","tungha","tonga"],"TV":["tuvalu","tuvalu","tuvalu","tuvalu","tuvalu","tuvalu","tuwalu","tufalu","tuvalu"],"UM":["iles-mineures-us","us-minor-islands","islas-menores-us","us-kleinere-inseln","ilhas-menores-us","malye-ostr-us","mei-xiao-dao","juzur-amrik","us-minor-islands"],"VA":["vatican","vatican","vaticano","vatikanstadt","vaticano","vatikan","fandigang","al-fatikan","vatican"],"VC":["saint-vincent","saint-vincent","san-vicente","st-vincent","sao-vicente","sent-vinsent","shengwensente","sant-finsint","saint-vincent"],"VG":["iles-vierges-brit","british-virgin-isl","islas-virgenes-br","brit-jungfernins","ilhas-virgens-br","brit-virg-ostr","ying-weier","juzur-brit","brit-virgin-isl"],"VI":["iles-vierges-us","us-virgin-islands","islas-virgenes-us","us-jungferninseln","ilhas-virgens-us","amer-virg-ostr","mei-weier","juzur-amrik","us-virgin-isl"],"VU":["vanuatu","vanuatu","vanuatu","vanuatu","vanuatu","vanuatu","wanuatu","fanwatu","vanuatu"],"WF":["wallis-et-futuna","wallis-and-futuna","wallis-y-futuna","wallis-futuna","wallis-e-futuna","uollis-futuna","walisi","walis-futuna","wallis-futuna"],"WS":["samoa","samoa","samoa","samoa","samoa","samoa","samoya","samwa","samoa"],"XK":["kosovo","kosovo","kosovo","kosovo","kosovo","kosovo","kesuowo","kusufu","kosovo"],"YE":["yemen","yemen","yemen","jemen","iemen","yemen","yemen","al-yaman","yemen"],"YT":["mayotte","mayotte","mayotte","mayotte","maiote","mayotta","mayuete","mayut","mayotte"]};
const _CR = {}; // Reverse: slug → ISO
for (const [iso, slugs] of Object.entries(_CS)) { _CR[iso.toLowerCase()] = iso; for (const s of slugs) _CR[s] = iso; }
// Legacy/variant country slug aliases (not in canonical translations but found in GSC)
Object.assign(_CR, {
  'pays-bas-caribeens': 'BQ', 'caribbean-netherlands': 'BQ', 'karibische-niederlande': 'BQ',
  'antigua-und-barbuda': 'AG', 'saint-kitts-and-nevis': 'KN', 'st-kitts-und-nevis': 'KN',
  'britische-jungferninseln': 'VG', 'amerikanische-jungferninseln': 'VI',
  'emirados-arabes-unidos': 'AE', 'wallis-und-futuna': 'WF',
  'franzosisch-guayana': 'GF', 'bosnia-and-herzegovina': 'BA',
  'papa-neuguinea': 'PG',
});
// Countries missing from country-slug-translations.ts but found in GSC — add inline
_CS['BA'] = ['bosnie-herzegovine','bosnia-and-herzegovina','bosnia-y-herzegovina','bosnien-herzegowina','bosnia-herzegovina','bosniya','bosniya','al-busna','bosnia'];
for (const s of _CS['BA']) _CR[s] = 'BA'; _CR['ba'] = 'BA'; _CR['bosnia-and-herzegovina'] = 'BA';
const _LI = { fr:0, en:1, es:2, de:3, pt:4, ru:5, zh:6, ar:7, hi:8 };

// =========================================================================
// ANTI-SCRAPING: Rate limiting in-memory par IP (edge-level)
// Map<ip, { count, resetAt }> — reset toutes les 60s, max 120 req/min
// Note: chaque instance Worker a son propre Map (pas partagé entre edges),
// mais c'est suffisant pour bloquer les scrapers agressifs mono-IP.
// =========================================================================
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 120;     // 120 req/min par IP (généreux pour les vrais users)
const ipRateMap = new Map();

let lastCleanup = 0;

/**
 * Vérifie le rate limit pour une IP. Retourne true si la requête est autorisée.
 */
function checkWorkerRateLimit(ip) {
  const now = Date.now();

  // Nettoyage des entrées expirées toutes les 60s (à chaque requête, pas setInterval)
  if (now - lastCleanup > 60000) {
    lastCleanup = now;
    for (const [key, entry] of ipRateMap) {
      if (now > entry.resetAt) ipRateMap.delete(key);
    }
  }

  const entry = ipRateMap.get(ip);

  if (!entry || now > entry.resetAt) {
    ipRateMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  return true;
}

// Scrapers agressifs connus (bloqués immédiatement)
const BLOCKED_SCRAPER_UAS = [
  'scrapy', 'python-requests', 'go-http-client', 'java/', 'httpclient',
  'wget/', 'libwww-perl', 'mechanize', 'phantom', 'headlesschrome',
  'httrack', 'harvest', 'extract', 'sucker',
  'nikto', 'sqlmap', 'nmap', 'masscan', 'zgrab', 'seekport',
  'megaindex', 'linkfluence', 'dotbot', 'blexbot', 'dataforseobot',
  'ahrefsbot', 'mj12bot', 'serpstatbot', 'bytespider', 'rogerbot', 'semanticbot',
];

/**
 * Vérifie si le user-agent est un scraper bloqué.
 */
function isBlockedScraper(ua) {
  if (!ua) return false;
  const lower = ua.toLowerCase();
  return BLOCKED_SCRAPER_UAS.some(blocked => lower.includes(blocked));
}

// Firebase Cloud Function URL for server-side rendering
const SSR_FUNCTION_URL = 'https://europe-west1-sos-urgently-ac307.cloudfunctions.net/renderForBotsV2';

// Lightweight affiliate OG renderer (no Puppeteer — fast HTML with OG tags)
const AFFILIATE_OG_FUNCTION_URL = 'https://europe-west1-sos-urgently-ac307.cloudfunctions.net/affiliateOgRender';

// Firebase Auth handler origin (used for /__/auth/* proxy)
// This allows using a custom authDomain (sos-expat.com) instead of firebaseapp.com,
// which fixes Google OAuth on iOS Safari where ITP blocks cross-site cookies/storage.
const FIREBASE_AUTH_ORIGIN = 'https://sos-urgently-ac307.firebaseapp.com';

// Cloudflare Pages origin URL (instead of DigitalOcean)
const PAGES_ORIGIN = 'https://sos-expat.pages.dev';

// Comprehensive list of bot user-agents to detect
const BOT_USER_AGENTS = [
  // Search Engine Crawlers
  'googlebot',
  'google-inspectiontool',
  'google-safety',
  'googleother',
  'google-extended',
  'bingbot',
  'bingpreview',
  'msnbot',
  'yandexbot',
  'yandex',
  'baiduspider',
  'duckduckbot',
  'slurp',           // Yahoo
  'sogou',
  'exabot',
  'ia_archiver',     // Alexa
  'archive.org_bot',
  'qwantify',
  'ecosia',
  'petalbot',        // Huawei/Aspiegel
  'seznam',
  'naver',
  'coccoc',
  'applebot',

  // Social Media Crawlers
  'facebookexternalhit',
  'facebookcatalog',
  'facebook',
  'twitterbot',
  'linkedinbot',
  'linkedin',
  'pinterest',
  'pinterestbot',
  'slackbot',
  'slack-imgproxy',
  'discordbot',
  'telegrambot',
  'whatsapp',
  'viber',
  'line-poker',
  'snapchat',
  'redditbot',
  'tumblr',
  'skypeuripreview',

  // AI/LLM Crawlers
  'gptbot',
  'chatgpt-user',
  'oai-searchbot',
  'claudebot',
  'claude-web',
  'anthropic-ai',
  'cohere-ai',
  'perplexitybot',
  'youbot',
  'gemini',
  'bard',
  'meta-externalagent',
  'meta-externalfetcher',
  'bytespider',      // TikTok/ByteDance
  'amazonbot',
  'ccbot',           // Common Crawl (used for AI training)
  'diffbot',
  'omgili',
  'omgilibot',

  // SEO/Analytics Tools
  'ahrefs',
  'ahrefsbot',
  'semrush',
  'semrushbot',
  'mj12bot',         // Majestic
  'dotbot',          // Moz
  'rogerbot',        // Moz
  'screaming frog',
  'seokicks',
  'sistrix',
  'blexbot',
  'megaindex',
  'serpstatbot',
  'dataforseo',
  'zoominfobot',

  // Preview/Rendering Bots
  'prerender',
  'headlesschrome',
  'chrome-lighthouse',
  'lighthouse',
  'pagespeed',
  'gtmetrix',
  'pingdom',
  'uptimerobot',
  'site24x7',

  // RSS/Feed Readers
  'feedfetcher',
  'feedly',
  'newsblur',
  'inoreader',

  // Other Bots
  'bot',
  'crawler',
  'spider',
  'scraper',
  'wget',
  'curl',
  'python-requests',
  'python-urllib',
  'go-http-client',
  'java/',
  'apache-httpclient',
  'libwww-perl',
  'php/',
  'ruby',
  'node-fetch',
  'axios',
];

// URL patterns that need SSR/Prerendering for bots
// Includes: provider profiles, blog/help articles, landing pages, key static pages

// ==========================================================================
// BLOG/HELP CENTER PATTERNS (all 9 languages + 197 countries)
// These patterns automatically catch ANY new article published
// Supports: FR, EN, ES, DE, RU, PT, ZH (Chinese), HI (Hindi), AR (Arabic)
// ==========================================================================
const BLOG_PATTERNS = [
  // Help Center articles - ALL 9 LANGUAGES with translated slugs
  /^\/[a-z]{2}(-[a-z]{2})?\/centre-aide\/[^\/]+$/i,           // French
  /^\/[a-z]{2}(-[a-z]{2})?\/help-center\/[^\/]+$/i,           // English
  /^\/[a-z]{2}(-[a-z]{2})?\/hilfezentrum\/[^\/]+$/i,          // German
  /^\/[a-z]{2}(-[a-z]{2})?\/centro-ayuda\/[^\/]+$/i,          // Spanish
  /^\/[a-z]{2}(-[a-z]{2})?\/centro-ajuda\/[^\/]+$/i,          // Portuguese
  /^\/[a-z]{2}(-[a-z]{2})?\/tsentr-pomoshchi\/[^\/]+$/i,      // Russian (transliterated)
  /^\/[a-z]{2}(-[a-z]{2})?\/centr-pomoshi\/[^\/]+$/i,         // Russian (alternate slug)
  /^\/[a-z]{2}(-[a-z]{2})?\/bangzhu-zhongxin\/[^\/]+$/i,      // Chinese (pinyin)
  /^\/[a-z]{2}(-[a-z]{2})?\/sahayata-kendra\/[^\/]+$/i,       // Hindi (romanized)
  /^\/[a-z]{2}(-[a-z]{2})?\/مركز-المساعدة\/[^\/]+$/i,         // Arabic (native)
  /^\/[a-z]{2}(-[a-z]{2})?\/markaz-almusaeada\/[^\/]+$/i,     // Arabic (romanized)

  // Blog articles - ALL LANGUAGES
  /^\/[a-z]{2}(-[a-z]{2})?\/blog\/[^\/]+$/i,                  // Generic /blog/
  /^\/[a-z]{2}(-[a-z]{2})?\/articles\/[^\/]+$/i,              // /articles/
  /^\/[a-z]{2}-[a-z]{2}\/actualites-expats(\/[^\/]+)?$/i,      // French news (listing + detail)
  /^\/[a-z]{2}-[a-z]{2}\/expat-news(\/[^\/]+)?$/i,            // English news
  /^\/[a-z]{2}-[a-z]{2}\/noticias-expatriados(\/[^\/]+)?$/i,  // Spanish/Portuguese news
  /^\/[a-z]{2}-[a-z]{2}\/expat-nachrichten(\/[^\/]+)?$/i,     // German news
  /^\/[a-z]{2}-[a-z]{2}\/novosti-expatov(\/[^\/]+)?$/i,       // Russian news
  /^\/[a-z]{2}-[a-z]{2}\/expat-xinwen(\/[^\/]+)?$/i,          // Chinese news
  /^\/[a-z]{2}-[a-z]{2}\/expat-samachar(\/[^\/]+)?$/i,        // Hindi news
  /^\/[a-z]{2}-[a-z]{2}\/akhbar-mughtaribeen(\/[^\/]+)?$/i,   // Arabic news

  // Guides and resources - ALL LANGUAGES
  /^\/[a-z]{2}(-[a-z]{2})?\/guides\/[^\/]+$/i,                // Guides
  /^\/[a-z]{2}(-[a-z]{2})?\/guide\/[^\/]+$/i,                 // Guide (singular)
  /^\/[a-z]{2}(-[a-z]{2})?\/ressources\/[^\/]+$/i,            // Resources FR
  /^\/[a-z]{2}(-[a-z]{2})?\/resources\/[^\/]+$/i,             // Resources EN
  /^\/[a-z]{2}(-[a-z]{2})?\/recursos\/[^\/]+$/i,              // Resources ES/PT
  /^\/[a-z]{2}(-[a-z]{2})?\/ressourcen\/[^\/]+$/i,            // Resources DE
  /^\/[a-z]{2}(-[a-z]{2})?\/resursy\/[^\/]+$/i,               // Resources RU

  // FAQ articles (deep links) — couverts par le catch-all ci-dessous
  // Routing réel géré dans isBlogPath() via FAQ_BLOG_SEGMENTS (avec/sans slug)

  // Nested blog categories (e.g., /blog/category/article)
  /^\/[a-z]{2}(-[a-z]{2})?\/blog\/[^\/]+\/[^\/]+$/i,
  /^\/[a-z]{2}(-[a-z]{2})?\/centre-aide\/[^\/]+\/[^\/]+$/i,
  /^\/[a-z]{2}(-[a-z]{2})?\/help-center\/[^\/]+\/[^\/]+$/i,
  /^\/[a-z]{2}(-[a-z]{2})?\/guides\/[^\/]+\/[^\/]+$/i,

  // Catch-all for any /locale/category/slug pattern (flexible for future content)
  // EXCLUDES: admin, api, dashboard, inscription, register, connexion, login, tableau-de-bord, panel, assets, static
  /^\/[a-z]{2}(-[a-z]{2})?\/(?!(admin|api|dashboard|inscription|register|connexion|login|tableau-de-bord|panel|panel-upravleniya|kongzhi-mianban|assets|static|_next|favicon))[a-z-]+\/[a-zA-Z0-9\u0600-\u06FF\u0900-\u097F-]+$/i,
];

// Landing pages and key static pages that need prerendering
// These patterns automatically catch ANY new landing page or static page
// ========================================================================
// COMPLETE COVERAGE FOR ALL 9 LANGUAGES:
// FR (French), EN (English), ES (Spanish), DE (German), RU (Russian),
// PT (Portuguese), ZH/CH (Chinese), HI (Hindi), AR (Arabic)
// ========================================================================
const LANDING_PAGE_PATTERNS = [
  /^\/?$/i,                                              // Root homepage (/)
  /^\/[a-z]{2}(-[a-z]{2})?\/?$/i,                        // Homepage per locale (/fr-fr/, /en-us/, /zh-cn/, etc.)

  // ========== PRICING - All 9 languages ==========
  /^\/[a-z]{2}(-[a-z]{2})?\/tarifs\/?$/i,                // FR: tarifs
  /^\/[a-z]{2}(-[a-z]{2})?\/pricing\/?$/i,               // EN: pricing
  /^\/[a-z]{2}(-[a-z]{2})?\/precios\/?$/i,               // ES: precios
  /^\/[a-z]{2}(-[a-z]{2})?\/preise\/?$/i,                // DE: preise
  /^\/[a-z]{2}(-[a-z]{2})?\/tseny\/?$/i,                 // RU: tseny (цены)
  /^\/[a-z]{2}(-[a-z]{2})?\/precos\/?$/i,                // PT: precos
  /^\/[a-z]{2}(-[a-z]{2})?\/jiage\/?$/i,                 // ZH: jiage (价格)
  /^\/[a-z]{2}(-[a-z]{2})?\/mulya\/?$/i,                 // HI: mulya (मूल्य)
  /^\/[a-z]{2}(-[a-z]{2})?\/الأسعار\/?$/i,               // AR: الأسعار (native)

  // ========== HOW IT WORKS - All 9 languages ==========
  /^\/[a-z]{2}(-[a-z]{2})?\/comment-ca-marche\/?$/i,     // FR
  /^\/[a-z]{2}(-[a-z]{2})?\/how-it-works\/?$/i,          // EN
  /^\/[a-z]{2}(-[a-z]{2})?\/como-funciona\/?$/i,         // ES/PT
  /^\/[a-z]{2}(-[a-z]{2})?\/wie-es-funktioniert\/?$/i,   // DE
  /^\/[a-z]{2}(-[a-z]{2})?\/kak-eto-rabotaet\/?$/i,      // RU
  /^\/[a-z]{2}(-[a-z]{2})?\/ruhe-yunzuo\/?$/i,           // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/kaise-kaam-karta-hai\/?$/i,  // HI
  /^\/[a-z]{2}(-[a-z]{2})?\/كيف-يعمل\/?$/i,              // AR (native)

  // ========== FAQ SOS Expat (SPA React / Firestore) - All 9 languages ==========
  /^\/[a-z]{2}(-[a-z]{2})?\/faq\/?$/i,                   // FR/EN/DE
  /^\/[a-z]{2}(-[a-z]{2})?\/preguntas-frecuentes\/?$/i,  // ES
  /^\/[a-z]{2}(-[a-z]{2})?\/perguntas-frequentes\/?$/i,  // PT
  /^\/[a-z]{2}(-[a-z]{2})?\/voprosy-otvety\/?$/i,        // RU
  /^\/[a-z]{2}(-[a-z]{2})?\/changjian-wenti\/?$/i,       // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/aksar-puche-jaane-wale-sawal\/?$/i, // HI
  /^\/[a-z]{2}(-[a-z]{2})?\/الأسئلة-الشائعة\/?$/i,       // AR (native)

  // ========== Vie à l'étranger (blog Laravel / PostgreSQL) - All 9 languages ==========
  /^\/[a-z]{2}(-[a-z]{2})?\/vie-a-letranger(\/.*)?$/i,          // FR
  /^\/[a-z]{2}(-[a-z]{2})?\/living-abroad(\/.*)?$/i,            // EN
  /^\/[a-z]{2}(-[a-z]{2})?\/vivir-en-el-extranjero(\/.*)?$/i,   // ES
  /^\/[a-z]{2}(-[a-z]{2})?\/leben-im-ausland(\/.*)?$/i,         // DE
  /^\/[a-z]{2}(-[a-z]{2})?\/viver-no-estrangeiro(\/.*)?$/i,     // PT
  /^\/[a-z]{2}(-[a-z]{2})?\/zhizn-za-rubezhom(\/.*)?$/i,        // RU
  /^\/[a-z]{2}(-[a-z]{2})?\/haiwai-shenghuo(\/.*)?$/i,          // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/videsh-mein-jeevan(\/.*)?$/i,       // HI
  /^\/[a-z]{2}(-[a-z]{2})?\/alhayat-fi-alkhaarij(\/.*)?$/i,     // AR

  // ========== TESTIMONIALS - All 9 languages ==========
  /^\/[a-z]{2}(-[a-z]{2})?\/temoignages\/?$/i,           // FR
  /^\/[a-z]{2}(-[a-z]{2})?\/testimonials\/?$/i,          // EN/DE
  /^\/[a-z]{2}(-[a-z]{2})?\/testimonios\/?$/i,           // ES
  /^\/[a-z]{2}(-[a-z]{2})?\/depoimentos\/?$/i,           // PT
  /^\/[a-z]{2}(-[a-z]{2})?\/otzyvy\/?$/i,                // RU
  /^\/[a-z]{2}(-[a-z]{2})?\/yonghu-pingjia\/?$/i,        // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/prashansapatra\/?$/i,        // HI
  /^\/[a-z]{2}(-[a-z]{2})?\/الشهادات\/?$/i,              // AR (native)

  // ========== CONTACT - All 9 languages ==========
  /^\/[a-z]{2}(-[a-z]{2})?\/contact\/?$/i,               // FR/EN
  /^\/[a-z]{2}(-[a-z]{2})?\/contacto\/?$/i,              // ES
  /^\/[a-z]{2}(-[a-z]{2})?\/kontakt\/?$/i,               // DE/RU
  /^\/[a-z]{2}(-[a-z]{2})?\/contato\/?$/i,               // PT
  /^\/[a-z]{2}(-[a-z]{2})?\/lianxi\/?$/i,                // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/sampark\/?$/i,               // HI
  /^\/[a-z]{2}(-[a-z]{2})?\/اتصل-بنا\/?$/i,              // AR (native)

  // ========== PROVIDERS LIST - All 9 languages ==========
  /^\/[a-z]{2}(-[a-z]{2})?\/prestataires\/?$/i,          // FR
  /^\/[a-z]{2}(-[a-z]{2})?\/providers\/?$/i,             // EN
  /^\/[a-z]{2}(-[a-z]{2})?\/proveedores\/?$/i,           // ES
  /^\/[a-z]{2}(-[a-z]{2})?\/anbieter\/?$/i,              // DE
  /^\/[a-z]{2}(-[a-z]{2})?\/postavshchiki\/?$/i,         // RU
  /^\/[a-z]{2}(-[a-z]{2})?\/prestadores\/?$/i,           // PT
  /^\/[a-z]{2}(-[a-z]{2})?\/fuwu-tigongzhe\/?$/i,        // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/seva-pradaata\/?$/i,         // HI
  /^\/[a-z]{2}(-[a-z]{2})?\/مقدمي-الخدمات\/?$/i,         // AR (native)

  // ========== SOS CALL / EMERGENCY - All 9 languages ==========
  /^\/[a-z]{2}(-[a-z]{2})?\/sos-appel\/?$/i,             // FR
  /^\/[a-z]{2}(-[a-z]{2})?\/emergency-call\/?$/i,        // EN
  /^\/[a-z]{2}(-[a-z]{2})?\/llamada-emergencia\/?$/i,    // ES
  /^\/[a-z]{2}(-[a-z]{2})?\/notruf\/?$/i,                // DE
  /^\/[a-z]{2}(-[a-z]{2})?\/ekstrenniy-zvonok\/?$/i,     // RU
  /^\/[a-z]{2}(-[a-z]{2})?\/chamada-emergencia\/?$/i,    // PT
  /^\/[a-z]{2}(-[a-z]{2})?\/jinji-dianhua\/?$/i,         // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/aapatkaalin-call\/?$/i,      // HI
  /^\/[a-z]{2}(-[a-z]{2})?\/مكالمة-طوارئ\/?$/i,          // AR (native)

  // ========== HELP CENTER - All 9 languages ==========
  /^\/[a-z]{2}(-[a-z]{2})?\/centre-aide\/?$/i,           // FR
  /^\/[a-z]{2}(-[a-z]{2})?\/help-center\/?$/i,           // EN
  /^\/[a-z]{2}(-[a-z]{2})?\/centro-ayuda\/?$/i,          // ES
  /^\/[a-z]{2}(-[a-z]{2})?\/hilfezentrum\/?$/i,          // DE
  /^\/[a-z]{2}(-[a-z]{2})?\/tsentr-pomoshchi\/?$/i,      // RU (transliterated)
  /^\/[a-z]{2}(-[a-z]{2})?\/centr-pomoshi\/?$/i,         // RU (alternate slug)
  /^\/[a-z]{2}(-[a-z]{2})?\/centro-ajuda\/?$/i,          // PT
  /^\/[a-z]{2}(-[a-z]{2})?\/bangzhu-zhongxin\/?$/i,      // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/sahayata-kendra\/?$/i,       // HI
  /^\/[a-z]{2}(-[a-z]{2})?\/مركز-المساعدة\/?$/i,         // AR (native)

  // ========== LEGAL PAGES - All 9 languages ==========
  // Terms clients
  /^\/[a-z]{2}(-[a-z]{2})?\/cgu-clients\/?$/i,           // FR
  /^\/[a-z]{2}(-[a-z]{2})?\/terms-clients\/?$/i,         // EN
  /^\/[a-z]{2}(-[a-z]{2})?\/terminos-clientes\/?$/i,     // ES
  /^\/[a-z]{2}(-[a-z]{2})?\/agb-kunden\/?$/i,            // DE
  /^\/[a-z]{2}(-[a-z]{2})?\/usloviya-klienty\/?$/i,      // RU
  /^\/[a-z]{2}(-[a-z]{2})?\/termos-clientes\/?$/i,       // PT
  /^\/[a-z]{2}(-[a-z]{2})?\/tiaokuan-kehu\/?$/i,         // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/shartein-grahak\/?$/i,       // HI
  /^\/[a-z]{2}(-[a-z]{2})?\/شروط-العملاء\/?$/i,          // AR (native)

  // Terms lawyers
  /^\/[a-z]{2}(-[a-z]{2})?\/cgu-avocats\/?$/i,           // FR
  /^\/[a-z]{2}(-[a-z]{2})?\/terms-lawyers\/?$/i,         // EN
  /^\/[a-z]{2}(-[a-z]{2})?\/terminos-abogados\/?$/i,     // ES
  /^\/[a-z]{2}(-[a-z]{2})?\/agb-anwaelte\/?$/i,          // DE
  /^\/[a-z]{2}(-[a-z]{2})?\/usloviya-advokaty\/?$/i,     // RU
  /^\/[a-z]{2}(-[a-z]{2})?\/termos-advogados\/?$/i,      // PT
  /^\/[a-z]{2}(-[a-z]{2})?\/tiaokuan-lushi\/?$/i,        // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/shartein-vakil\/?$/i,        // HI
  /^\/[a-z]{2}(-[a-z]{2})?\/شروط-المحامون\/?$/i,         // AR (native)

  // Terms expats
  /^\/[a-z]{2}(-[a-z]{2})?\/cgu-expatries\/?$/i,         // FR
  /^\/[a-z]{2}(-[a-z]{2})?\/terms-expats\/?$/i,          // EN
  /^\/[a-z]{2}(-[a-z]{2})?\/terminos-expatriados\/?$/i,  // ES
  /^\/[a-z]{2}(-[a-z]{2})?\/agb-expatriates\/?$/i,       // DE
  /^\/[a-z]{2}(-[a-z]{2})?\/usloviya-expatrianty\/?$/i,  // RU
  /^\/[a-z]{2}(-[a-z]{2})?\/termos-expatriados\/?$/i,    // PT
  /^\/[a-z]{2}(-[a-z]{2})?\/tiaokuan-waipai\/?$/i,       // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/shartein-pravasi\/?$/i,      // HI
  /^\/[a-z]{2}(-[a-z]{2})?\/شروط-المغتربين\/?$/i,        // AR (native)

  // Privacy policy
  /^\/[a-z]{2}(-[a-z]{2})?\/politique-confidentialite\/?$/i, // FR
  /^\/[a-z]{2}(-[a-z]{2})?\/privacy-policy\/?$/i,        // EN
  /^\/[a-z]{2}(-[a-z]{2})?\/politica-privacidad\/?$/i,   // ES
  /^\/[a-z]{2}(-[a-z]{2})?\/datenschutzrichtlinie\/?$/i, // DE
  /^\/[a-z]{2}(-[a-z]{2})?\/politika-konfidentsialnosti\/?$/i, // RU
  /^\/[a-z]{2}(-[a-z]{2})?\/politica-privacidade\/?$/i,  // PT
  /^\/[a-z]{2}(-[a-z]{2})?\/yinsi-zhengce\/?$/i,         // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/gopaniyata-niti\/?$/i,       // HI
  /^\/[a-z]{2}(-[a-z]{2})?\/سياسة-الخصوصية\/?$/i,        // AR (native)

  // Cookies
  /^\/[a-z]{2}(-[a-z]{2})?\/cookies\/?$/i,               // All latin langs
  /^\/[a-z]{2}(-[a-z]{2})?\/ملفات-التعريف\/?$/i,         // AR (native)

  // Consumers
  /^\/[a-z]{2}(-[a-z]{2})?\/consommateurs\/?$/i,         // FR
  /^\/[a-z]{2}(-[a-z]{2})?\/consumers\/?$/i,             // EN
  /^\/[a-z]{2}(-[a-z]{2})?\/consumidores\/?$/i,          // ES/PT
  /^\/[a-z]{2}(-[a-z]{2})?\/verbraucher\/?$/i,           // DE
  /^\/[a-z]{2}(-[a-z]{2})?\/potrebiteli\/?$/i,           // RU
  /^\/[a-z]{2}(-[a-z]{2})?\/xiaofeizhe\/?$/i,            // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/upbhokta\/?$/i,              // HI
  /^\/[a-z]{2}(-[a-z]{2})?\/المستهلكين\/?$/i,            // AR (native)

  // ========== TERMS CHATTERS - All 9 languages ==========
  /^\/[a-z]{2}(-[a-z]{2})?\/cgu-chatters\/?$/i,          // FR
  /^\/[a-z]{2}(-[a-z]{2})?\/terms-chatters\/?$/i,        // EN
  /^\/[a-z]{2}(-[a-z]{2})?\/terminos-chatters\/?$/i,     // ES
  /^\/[a-z]{2}(-[a-z]{2})?\/agb-chatters\/?$/i,          // DE
  /^\/[a-z]{2}(-[a-z]{2})?\/usloviya-chattery\/?$/i,     // RU
  /^\/[a-z]{2}(-[a-z]{2})?\/termos-chatters\/?$/i,       // PT
  /^\/[a-z]{2}(-[a-z]{2})?\/tiaokuan-chatters\/?$/i,     // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/shartein-chatters\/?$/i,     // HI
  /^\/[a-z]{2}(-[a-z]{2})?\/شروط-المروجين\/?$/i,         // AR (native)

  // ========== SERVICE STATUS - All 9 languages ==========
  /^\/[a-z]{2}(-[a-z]{2})?\/statut-service\/?$/i,        // FR
  /^\/[a-z]{2}(-[a-z]{2})?\/service-status\/?$/i,        // EN
  /^\/[a-z]{2}(-[a-z]{2})?\/estado-servicio\/?$/i,       // ES
  /^\/[a-z]{2}(-[a-z]{2})?\/dienststatus\/?$/i,          // DE
  /^\/[a-z]{2}(-[a-z]{2})?\/status-servisa\/?$/i,        // RU
  /^\/[a-z]{2}(-[a-z]{2})?\/status-servico\/?$/i,        // PT
  /^\/[a-z]{2}(-[a-z]{2})?\/fuwu-zhuangtai\/?$/i,        // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/seva-sthiti\/?$/i,           // HI
  /^\/[a-z]{2}(-[a-z]{2})?\/حالة-الخدمة\/?$/i,           // AR (native)

  // ========== SEO PAGE - All 9 languages ==========
  /^\/[a-z]{2}(-[a-z]{2})?\/referencement\/?$/i,         // FR
  /^\/[a-z]{2}(-[a-z]{2})?\/seo\/?$/i,                   // EN/ES/DE/PT/RU/ZH/HI
  /^\/[a-z]{2}(-[a-z]{2})?\/تحسين-محركات-البحث\/?$/i,    // AR (native)

  // ========== LOGIN - All 9 languages ==========
  /^\/[a-z]{2}(-[a-z]{2})?\/connexion\/?$/i,             // FR
  /^\/[a-z]{2}(-[a-z]{2})?\/login\/?$/i,                 // EN/HI
  /^\/[a-z]{2}(-[a-z]{2})?\/iniciar-sesion\/?$/i,        // ES
  /^\/[a-z]{2}(-[a-z]{2})?\/anmeldung\/?$/i,             // DE
  /^\/[a-z]{2}(-[a-z]{2})?\/vkhod\/?$/i,                 // RU
  /^\/[a-z]{2}(-[a-z]{2})?\/entrar\/?$/i,                // PT
  /^\/[a-z]{2}(-[a-z]{2})?\/denglu\/?$/i,                // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/تسجيل-الدخول\/?$/i,          // AR (native)

  // ========== REGISTER - All 9 languages ==========
  /^\/[a-z]{2}(-[a-z]{2})?\/inscription\/?$/i,           // FR
  /^\/[a-z]{2}(-[a-z]{2})?\/register\/?$/i,              // EN
  /^\/[a-z]{2}(-[a-z]{2})?\/registro\/?$/i,              // ES
  /^\/[a-z]{2}(-[a-z]{2})?\/registrierung\/?$/i,         // DE
  /^\/[a-z]{2}(-[a-z]{2})?\/registratsiya\/?$/i,         // RU
  /^\/[a-z]{2}(-[a-z]{2})?\/cadastro\/?$/i,              // PT
  /^\/[a-z]{2}(-[a-z]{2})?\/zhuce\/?$/i,                 // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/panjikaran\/?$/i,            // HI
  /^\/[a-z]{2}(-[a-z]{2})?\/التسجيل\/?$/i,               // AR (native)

  // ========== REGISTER CLIENT - All 9 languages ==========
  /^\/[a-z]{2}(-[a-z]{2})?\/inscription\/client\/?$/i,   // FR
  /^\/[a-z]{2}(-[a-z]{2})?\/register\/client\/?$/i,      // EN
  /^\/[a-z]{2}(-[a-z]{2})?\/registro\/cliente\/?$/i,     // ES
  /^\/[a-z]{2}(-[a-z]{2})?\/registrierung\/kunde\/?$/i,  // DE
  /^\/[a-z]{2}(-[a-z]{2})?\/registratsiya\/klient\/?$/i, // RU
  /^\/[a-z]{2}(-[a-z]{2})?\/registro\/cliente\/?$/i,     // PT (same as ES)
  /^\/[a-z]{2}(-[a-z]{2})?\/zhuce\/kehu\/?$/i,           // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/panjikaran\/grahak\/?$/i,    // HI
  /^\/[a-z]{2}(-[a-z]{2})?\/تسجيل\/عميل\/?$/i,           // AR (native)

  // ========== REGISTER LAWYER - All 9 languages ==========
  /^\/[a-z]{2}(-[a-z]{2})?\/inscription\/avocat\/?$/i,   // FR
  /^\/[a-z]{2}(-[a-z]{2})?\/register\/lawyer\/?$/i,      // EN
  /^\/[a-z]{2}(-[a-z]{2})?\/registro\/abogado\/?$/i,     // ES
  /^\/[a-z]{2}(-[a-z]{2})?\/registrierung\/anwalt\/?$/i, // DE
  /^\/[a-z]{2}(-[a-z]{2})?\/registratsiya\/advokat\/?$/i, // RU
  /^\/[a-z]{2}(-[a-z]{2})?\/registro\/advogado\/?$/i,    // PT
  /^\/[a-z]{2}(-[a-z]{2})?\/zhuce\/lushi\/?$/i,          // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/panjikaran\/vakil\/?$/i,     // HI
  /^\/[a-z]{2}(-[a-z]{2})?\/تسجيل\/محام\/?$/i,           // AR (native)

  // ========== REGISTER EXPAT - All 9 languages ==========
  /^\/[a-z]{2}(-[a-z]{2})?\/inscription\/expatrie\/?$/i, // FR
  /^\/[a-z]{2}(-[a-z]{2})?\/register\/expat\/?$/i,       // EN
  /^\/[a-z]{2}(-[a-z]{2})?\/registro\/expatriado\/?$/i,  // ES
  /^\/[a-z]{2}(-[a-z]{2})?\/registrierung\/expatriate\/?$/i, // DE
  /^\/[a-z]{2}(-[a-z]{2})?\/registratsiya\/expatriant\/?$/i, // RU
  /^\/[a-z]{2}(-[a-z]{2})?\/registro\/expatriado\/?$/i,  // PT (same as ES)
  /^\/[a-z]{2}(-[a-z]{2})?\/zhuce\/waipai\/?$/i,         // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/panjikaran\/pravasi\/?$/i,   // HI
  /^\/[a-z]{2}(-[a-z]{2})?\/تسجيل\/مغترب\/?$/i,          // AR (native)

  // ========== PASSWORD RESET - All 9 languages ==========
  /^\/[a-z]{2}(-[a-z]{2})?\/reinitialisation-mot-de-passe\/?$/i, // FR
  /^\/[a-z]{2}(-[a-z]{2})?\/password-reset\/?$/i,        // EN/HI
  /^\/[a-z]{2}(-[a-z]{2})?\/restablecer-contrasena\/?$/i, // ES
  /^\/[a-z]{2}(-[a-z]{2})?\/passwort-zurucksetzen\/?$/i, // DE
  /^\/[a-z]{2}(-[a-z]{2})?\/sbros-parolya\/?$/i,         // RU
  /^\/[a-z]{2}(-[a-z]{2})?\/redefinir-senha\/?$/i,       // PT
  /^\/[a-z]{2}(-[a-z]{2})?\/chongzhi-mima\/?$/i,         // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/إعادة-تعيين-كلمة-المرور\/?$/i, // AR (native)

  // ========== CHATTER LANDING - All 9 languages ==========
  /^\/[a-z]{2}(-[a-z]{2})?\/devenir-chatter\/?$/i,       // FR
  /^\/[a-z]{2}(-[a-z]{2})?\/become-chatter\/?$/i,        // EN
  /^\/[a-z]{2}(-[a-z]{2})?\/ser-chatter\/?$/i,           // ES
  /^\/[a-z]{2}(-[a-z]{2})?\/chatter-werden\/?$/i,        // DE
  /^\/[a-z]{2}(-[a-z]{2})?\/stat-chatterom\/?$/i,        // RU
  /^\/[a-z]{2}(-[a-z]{2})?\/tornar-se-chatter\/?$/i,     // PT
  /^\/[a-z]{2}(-[a-z]{2})?\/chengwei-chatter\/?$/i,      // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/chatter-bane\/?$/i,          // HI
  /^\/[a-z]{2}(-[a-z]{2})?\/كن-مسوقا\/?$/i,              // AR (native)

  // ========== CAPTAIN LANDING - All 9 languages ==========
  /^\/[a-z]{2}(-[a-z]{2})?\/devenir-capitaine\/?$/i,     // FR
  /^\/[a-z]{2}(-[a-z]{2})?\/become-captain\/?$/i,        // EN
  /^\/[a-z]{2}(-[a-z]{2})?\/ser-capitan\/?$/i,           // ES
  /^\/[a-z]{2}(-[a-z]{2})?\/kapitaen-werden\/?$/i,       // DE
  /^\/[a-z]{2}(-[a-z]{2})?\/stat-kapitanom\/?$/i,        // RU
  /^\/[a-z]{2}(-[a-z]{2})?\/tornar-se-capitao\/?$/i,     // PT
  /^\/[a-z]{2}(-[a-z]{2})?\/chengwei-duizhang\/?$/i,     // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/captain-bane\/?$/i,          // HI
  /^\/[a-z]{2}(-[a-z]{2})?\/كن-قائدا\/?$/i,              // AR (native)

  // ========== COUNTRY LISTING PAGES - Lawyers/Expats by country ==========
  // Format: /{locale}/{role}/{countrySlug}
  /^\/[a-z]{2}(-[a-z]{2})?\/avocats\/[a-z-]+\/?$/i,           // FR lawyers
  /^\/[a-z]{2}(-[a-z]{2})?\/lawyers\/[a-z-]+\/?$/i,           // EN lawyers
  /^\/[a-z]{2}(-[a-z]{2})?\/abogados\/[a-z-]+\/?$/i,          // ES lawyers
  /^\/[a-z]{2}(-[a-z]{2})?\/anwaelte\/[a-z-]+\/?$/i,          // DE lawyers
  /^\/[a-z]{2}(-[a-z]{2})?\/advogados\/[a-z-]+\/?$/i,         // PT lawyers
  /^\/[a-z]{2}(-[a-z]{2})?\/advokaty\/[a-z-]+\/?$/i,          // RU lawyers
  /^\/[a-z]{2}(-[a-z]{2})?\/lushi\/[a-z-]+\/?$/i,             // ZH lawyers
  /^\/[a-z]{2}(-[a-z]{2})?\/vakil\/[a-z-]+\/?$/i,             // HI lawyers
  /^\/[a-z]{2}(-[a-z]{2})?\/محامون\/[^\/]+\/?$/i,              // AR lawyers
  /^\/[a-z]{2}(-[a-z]{2})?\/expatries\/[a-z-]+\/?$/i,         // FR expats
  /^\/[a-z]{2}(-[a-z]{2})?\/expats\/[a-z-]+\/?$/i,            // EN/DE expats
  /^\/[a-z]{2}(-[a-z]{2})?\/expatriados\/[a-z-]+\/?$/i,       // ES/PT expats
  /^\/[a-z]{2}(-[a-z]{2})?\/expaty\/[a-z-]+\/?$/i,            // RU expats
  /^\/[a-z]{2}(-[a-z]{2})?\/haiwai\/[a-z-]+\/?$/i,            // ZH expats
  /^\/[a-z]{2}(-[a-z]{2})?\/videshi\/[a-z-]+\/?$/i,           // HI expats
  /^\/[a-z]{2}(-[a-z]{2})?\/مغتربون\/[^\/]+\/?$/i,             // AR expats

  // ========== CHATTER REGISTER - All 9 languages ==========
  /^\/[a-z]{2}(-[a-z]{2})?\/chatter\/inscription\/?$/i,  // FR
  /^\/[a-z]{2}(-[a-z]{2})?\/chatter\/register\/?$/i,     // EN
  /^\/[a-z]{2}(-[a-z]{2})?\/chatter\/registro\/?$/i,     // ES
  /^\/[a-z]{2}(-[a-z]{2})?\/chatter\/registrierung\/?$/i, // DE
  /^\/[a-z]{2}(-[a-z]{2})?\/chatter\/registratsiya\/?$/i, // RU
  /^\/[a-z]{2}(-[a-z]{2})?\/chatter\/cadastro\/?$/i,     // PT
  /^\/[a-z]{2}(-[a-z]{2})?\/chatter\/zhuce\/?$/i,        // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/chatter\/panjikaran\/?$/i,   // HI
  /^\/[a-z]{2}(-[a-z]{2})?\/مسوق\/تسجيل\/?$/i,           // AR (native)

  // ========== CHATTER PRESENTATION - All 9 languages ==========
  /^\/[a-z]{2}(-[a-z]{2})?\/chatter\/presentation\/?$/i, // FR/EN
  /^\/[a-z]{2}(-[a-z]{2})?\/chatter\/presentacion\/?$/i, // ES
  /^\/[a-z]{2}(-[a-z]{2})?\/chatter\/praesentation\/?$/i, // DE
  /^\/[a-z]{2}(-[a-z]{2})?\/chatter\/prezentatsiya\/?$/i, // RU
  /^\/[a-z]{2}(-[a-z]{2})?\/chatter\/apresentacao\/?$/i, // PT
  /^\/[a-z]{2}(-[a-z]{2})?\/chatter\/jieshao\/?$/i,      // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/chatter\/parichay\/?$/i,     // HI
  /^\/[a-z]{2}(-[a-z]{2})?\/مسوق\/عرض\/?$/i,             // AR (native)

  // ========== INFLUENCER LANDING - All 9 languages ==========
  /^\/[a-z]{2}(-[a-z]{2})?\/devenir-influenceur\/?$/i,   // FR
  /^\/[a-z]{2}(-[a-z]{2})?\/become-influencer\/?$/i,     // EN
  /^\/[a-z]{2}(-[a-z]{2})?\/ser-influencer\/?$/i,        // ES
  /^\/[a-z]{2}(-[a-z]{2})?\/influencer-werden\/?$/i,     // DE
  /^\/[a-z]{2}(-[a-z]{2})?\/stat-influentserom\/?$/i,    // RU
  /^\/[a-z]{2}(-[a-z]{2})?\/tornar-se-influenciador\/?$/i, // PT
  /^\/[a-z]{2}(-[a-z]{2})?\/chengwei-yingxiangli\/?$/i,  // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/influencer-bane\/?$/i,       // HI
  /^\/[a-z]{2}(-[a-z]{2})?\/كن-مؤثرا\/?$/i,              // AR (native)

  // ========== INFLUENCER REGISTER - All 9 languages ==========
  /^\/[a-z]{2}(-[a-z]{2})?\/influencer\/inscription\/?$/i, // FR
  /^\/[a-z]{2}(-[a-z]{2})?\/influencer\/register\/?$/i, // EN
  /^\/[a-z]{2}(-[a-z]{2})?\/influencer\/registro\/?$/i, // ES
  /^\/[a-z]{2}(-[a-z]{2})?\/influencer\/registrierung\/?$/i, // DE
  /^\/[a-z]{2}(-[a-z]{2})?\/influencer\/registratsiya\/?$/i, // RU
  /^\/[a-z]{2}(-[a-z]{2})?\/influencer\/cadastro\/?$/i, // PT
  /^\/[a-z]{2}(-[a-z]{2})?\/influencer\/zhuce\/?$/i,    // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/influencer\/panjikaran\/?$/i, // HI
  /^\/[a-z]{2}(-[a-z]{2})?\/مؤثر\/تسجيل\/?$/i,          // AR (native)

  // ========== BLOGGER LANDING - All 9 languages ==========
  /^\/[a-z]{2}(-[a-z]{2})?\/devenir-blogger\/?$/i,       // FR
  /^\/[a-z]{2}(-[a-z]{2})?\/become-blogger\/?$/i,        // EN
  /^\/[a-z]{2}(-[a-z]{2})?\/ser-blogger\/?$/i,           // ES
  /^\/[a-z]{2}(-[a-z]{2})?\/blogger-werden\/?$/i,        // DE
  /^\/[a-z]{2}(-[a-z]{2})?\/stat-bloggerom\/?$/i,        // RU
  /^\/[a-z]{2}(-[a-z]{2})?\/tornar-se-blogger\/?$/i,     // PT
  /^\/[a-z]{2}(-[a-z]{2})?\/chengwei-boke\/?$/i,         // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/blogger-banen\/?$/i,         // HI
  /^\/[a-z]{2}(-[a-z]{2})?\/كن-مدون\/?$/i,               // AR (native)

  // ========== BLOGGER REGISTER - All 9 languages ==========
  /^\/[a-z]{2}(-[a-z]{2})?\/blogger\/inscription\/?$/i,  // FR
  /^\/[a-z]{2}(-[a-z]{2})?\/blogger\/register\/?$/i,     // EN
  /^\/[a-z]{2}(-[a-z]{2})?\/blogger\/registro\/?$/i,     // ES
  /^\/[a-z]{2}(-[a-z]{2})?\/blogger\/registrieren\/?$/i, // DE
  /^\/[a-z]{2}(-[a-z]{2})?\/blogger\/registratsiya\/?$/i, // RU
  /^\/[a-z]{2}(-[a-z]{2})?\/blogger\/registro\/?$/i,     // PT (same as ES)
  /^\/[a-z]{2}(-[a-z]{2})?\/blogger\/zhuce\/?$/i,        // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/blogger\/panjikaran\/?$/i,   // HI
  /^\/[a-z]{2}(-[a-z]{2})?\/مدون\/تسجيل\/?$/i,           // AR (native)

  // ========== GROUPADMIN LANDING - All 9 languages ==========
  /^\/[a-z]{2}(-[a-z]{2})?\/devenir-admin-groupe\/?$/i,  // FR
  /^\/[a-z]{2}(-[a-z]{2})?\/become-group-admin\/?$/i,    // EN
  /^\/[a-z]{2}(-[a-z]{2})?\/convertirse-admin-grupo\/?$/i, // ES
  /^\/[a-z]{2}(-[a-z]{2})?\/gruppenadmin-werden\/?$/i,   // DE
  /^\/[a-z]{2}(-[a-z]{2})?\/stat-admin-gruppy\/?$/i,     // RU
  /^\/[a-z]{2}(-[a-z]{2})?\/tornar-se-admin-grupo\/?$/i, // PT
  /^\/[a-z]{2}(-[a-z]{2})?\/chengwei-qunzhu\/?$/i,       // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/group-admin-bane\/?$/i,      // HI
  /^\/[a-z]{2}(-[a-z]{2})?\/كن-مسؤول-مجموعة\/?$/i,       // AR (native)

  // ========== GROUPADMIN REGISTER - All 9 languages ==========
  /^\/[a-z]{2}(-[a-z]{2})?\/groupadmin\/inscription\/?$/i, // FR
  /^\/[a-z]{2}(-[a-z]{2})?\/groupadmin\/register\/?$/i, // EN
  /^\/[a-z]{2}(-[a-z]{2})?\/groupadmin\/registro\/?$/i, // ES
  /^\/[a-z]{2}(-[a-z]{2})?\/groupadmin\/registrieren\/?$/i, // DE
  /^\/[a-z]{2}(-[a-z]{2})?\/groupadmin\/registratsiya\/?$/i, // RU
  /^\/[a-z]{2}(-[a-z]{2})?\/groupadmin\/registro\/?$/i, // PT (same as ES)
  /^\/[a-z]{2}(-[a-z]{2})?\/groupadmin\/zhuce\/?$/i,    // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/groupadmin\/panjikaran\/?$/i, // HI
  /^\/[a-z]{2}(-[a-z]{2})?\/مسؤول-مجموعة\/التسجيل\/?$/i, // AR (native)

  // ========== PRESS PAGE - All 9 languages ==========
  /^\/[a-z]{2}(-[a-z]{2})?\/presse\/?$/i,               // FR/DE
  /^\/[a-z]{2}(-[a-z]{2})?\/press\/?$/i,                // EN/HI
  /^\/[a-z]{2}(-[a-z]{2})?\/prensa\/?$/i,               // ES
  /^\/[a-z]{2}(-[a-z]{2})?\/pressa\/?$/i,               // RU
  /^\/[a-z]{2}(-[a-z]{2})?\/imprensa\/?$/i,             // PT
  /^\/[a-z]{2}(-[a-z]{2})?\/xinwen\/?$/i,               // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/صحافة\/?$/i,                // AR (native)

  // ========== PIONEERS - All 9 languages ==========
  /^\/[a-z]{2}(-[a-z]{2})?\/pioneers\/?$/i,              // FR/EN
  /^\/[a-z]{2}(-[a-z]{2})?\/pioneros\/?$/i,              // ES
  /^\/[a-z]{2}(-[a-z]{2})?\/pioniere\/?$/i,              // DE
  /^\/[a-z]{2}(-[a-z]{2})?\/pionery\/?$/i,               // RU
  /^\/[a-z]{2}(-[a-z]{2})?\/pioneiros\/?$/i,             // PT
  /^\/[a-z]{2}(-[a-z]{2})?\/xianquzhe\/?$/i,             // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/agranee\/?$/i,               // HI
  /^\/[a-z]{2}(-[a-z]{2})?\/الرواد\/?$/i,                // AR (native)

  // ========== FIND LAWYER - All 9 languages ==========
  /^\/[a-z]{2}(-[a-z]{2})?\/trouver-avocat\/?$/i,        // FR
  /^\/[a-z]{2}(-[a-z]{2})?\/find-lawyer\/?$/i,           // EN
  /^\/[a-z]{2}(-[a-z]{2})?\/buscar-abogado\/?$/i,        // ES
  /^\/[a-z]{2}(-[a-z]{2})?\/anwalt-finden\/?$/i,         // DE
  /^\/[a-z]{2}(-[a-z]{2})?\/nayti-advokata\/?$/i,        // RU
  /^\/[a-z]{2}(-[a-z]{2})?\/encontrar-advogado\/?$/i,    // PT
  /^\/[a-z]{2}(-[a-z]{2})?\/zhaodao-lushi\/?$/i,         // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/vakil-khoje\/?$/i,           // HI
  /^\/[a-z]{2}(-[a-z]{2})?\/ابحث-عن-محامي\/?$/i,         // AR (native)

  // ========== FIND EXPAT - All 9 languages ==========
  /^\/[a-z]{2}(-[a-z]{2})?\/trouver-expatrie\/?$/i,      // FR
  /^\/[a-z]{2}(-[a-z]{2})?\/find-expat\/?$/i,            // EN
  /^\/[a-z]{2}(-[a-z]{2})?\/buscar-expatriado\/?$/i,     // ES
  /^\/[a-z]{2}(-[a-z]{2})?\/expatriate-finden\/?$/i,     // DE
  /^\/[a-z]{2}(-[a-z]{2})?\/nayti-expatrianta\/?$/i,     // RU
  /^\/[a-z]{2}(-[a-z]{2})?\/encontrar-expatriado\/?$/i,  // PT
  /^\/[a-z]{2}(-[a-z]{2})?\/zhaodao-waipai\/?$/i,        // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/pravasi-khoje\/?$/i,         // HI
  /^\/[a-z]{2}(-[a-z]{2})?\/ابحث-عن-مغترب\/?$/i,         // AR (native)

  // ========== TESTIMONIAL DETAIL (with dynamic segments) ==========
  /^\/[a-z]{2}(-[a-z]{2})?\/temoignages\/[^\/]+\/[^\/]+\/[^\/]+\/?$/i,     // FR
  /^\/[a-z]{2}(-[a-z]{2})?\/testimonials\/[^\/]+\/[^\/]+\/[^\/]+\/?$/i,    // EN
  /^\/[a-z]{2}(-[a-z]{2})?\/testimonios\/[^\/]+\/[^\/]+\/[^\/]+\/?$/i,     // ES
  /^\/[a-z]{2}(-[a-z]{2})?\/depoimentos\/[^\/]+\/[^\/]+\/[^\/]+\/?$/i,     // PT
  /^\/[a-z]{2}(-[a-z]{2})?\/otzyvy\/[^\/]+\/[^\/]+\/[^\/]+\/?$/i,          // RU

  // ==========================================================================
  // DYNAMIC PATTERNS FOR NEW PAGES (automatically prerendered)
  // Supports: Latin, Arabic (\u0600-\u06FF), Hindi/Devanagari (\u0900-\u097F),
  //           Chinese (via pinyin romanization)
  // ==========================================================================

  // New landing pages - any single-segment path under locale (LATIN ONLY)
  // Examples: /fr-fr/nouvelle-page, /en-us/new-campaign, /de-de/neue-seite
  // Note: Uses negative lookahead to exclude system paths
  /^\/[a-z]{2}(-[a-z]{2})?\/(?!(assets|api|admin|dashboard|inscription|register|connexion|login|tableau-de-bord|panel|panel-upravleniya|kongzhi-mianban|_next|static|favicon|profil|profile|perfil))[a-z][a-z0-9-]+\/?$/i,

  // New landing pages - ARABIC characters (native) - MUST start with Arabic char
  // Examples: /ar-sa/محامون, /ar-eg/الأسعار
  /^\/[a-z]{2}(-[a-z]{2})?\/[\u0600-\u06FF][\u0600-\u06FF\u0020-\u007F\-]+\/?$/i,

  // New landing pages - HINDI/DEVANAGARI characters (native) - MUST start with Devanagari char
  // Examples: /hi-in/वकील, /hi-in/मूल्य
  /^\/[a-z]{2}(-[a-z]{2})?\/[\u0900-\u097F][\u0900-\u097F\u0020-\u007F\-]+\/?$/i,

  // About/Company pages
  /^\/[a-z]{2}(-[a-z]{2})?\/a-propos\/?$/i,              // About FR
  /^\/[a-z]{2}(-[a-z]{2})?\/about\/?$/i,                 // About EN
  /^\/[a-z]{2}(-[a-z]{2})?\/uber-uns\/?$/i,              // About DE
  /^\/[a-z]{2}(-[a-z]{2})?\/sobre-nosotros\/?$/i,        // About ES
  /^\/[a-z]{2}(-[a-z]{2})?\/sobre-nos\/?$/i,             // About PT
  /^\/[a-z]{2}(-[a-z]{2})?\/equipe\/?$/i,                // Team FR
  /^\/[a-z]{2}(-[a-z]{2})?\/team\/?$/i,                  // Team EN
  /^\/[a-z]{2}(-[a-z]{2})?\/carrieres\/?$/i,             // Careers FR
  /^\/[a-z]{2}(-[a-z]{2})?\/careers\/?$/i,               // Careers EN
  /^\/[a-z]{2}(-[a-z]{2})?\/partenaires\/?$/i,           // Partners FR
  /^\/[a-z]{2}(-[a-z]{2})?\/partners\/?$/i,              // Partners EN

  // Marketing/Campaign landing pages
  /^\/[a-z]{2}(-[a-z]{2})?\/promo\/[^\/]+\/?$/i,         // Promo pages
  /^\/[a-z]{2}(-[a-z]{2})?\/campagne\/[^\/]+\/?$/i,      // Campaign FR
  /^\/[a-z]{2}(-[a-z]{2})?\/campaign\/[^\/]+\/?$/i,      // Campaign EN
  /^\/[a-z]{2}(-[a-z]{2})?\/offre\/[^\/]+\/?$/i,         // Offer FR
  /^\/[a-z]{2}(-[a-z]{2})?\/offer\/[^\/]+\/?$/i,         // Offer EN
  /^\/[a-z]{2}(-[a-z]{2})?\/lp\/[^\/]+\/?$/i,            // Landing page shortcut

  // Service-specific landing pages
  /^\/[a-z]{2}(-[a-z]{2})?\/services\/[^\/]+\/?$/i,      // Services
  /^\/[a-z]{2}(-[a-z]{2})?\/solutions\/[^\/]+\/?$/i,     // Solutions
  /^\/[a-z]{2}(-[a-z]{2})?\/specialites\/[^\/]+\/?$/i,   // Specialties FR
  /^\/[a-z]{2}(-[a-z]{2})?\/specialties\/[^\/]+\/?$/i,   // Specialties EN

  // Location-based landing pages
  /^\/[a-z]{2}(-[a-z]{2})?\/pays\/[^\/]+\/?$/i,          // Country pages FR
  /^\/[a-z]{2}(-[a-z]{2})?\/country\/[^\/]+\/?$/i,       // Country pages EN
  /^\/[a-z]{2}(-[a-z]{2})?\/ville\/[^\/]+\/?$/i,         // City pages FR
  /^\/[a-z]{2}(-[a-z]{2})?\/city\/[^\/]+\/?$/i,          // City pages EN
  /^\/[a-z]{2}(-[a-z]{2})?\/region\/[^\/]+\/?$/i,        // Region pages

  // Use-case landing pages
  /^\/[a-z]{2}(-[a-z]{2})?\/pour-les-expatries\/?$/i,    // For expats FR
  /^\/[a-z]{2}(-[a-z]{2})?\/for-expats\/?$/i,            // For expats EN
  /^\/[a-z]{2}(-[a-z]{2})?\/pour-les-entreprises\/?$/i,  // For businesses FR
  /^\/[a-z]{2}(-[a-z]{2})?\/for-businesses\/?$/i,        // For businesses EN
  /^\/[a-z]{2}(-[a-z]{2})?\/pour-les-avocats\/?$/i,      // For lawyers FR
  /^\/[a-z]{2}(-[a-z]{2})?\/for-lawyers\/?$/i,           // For lawyers EN
];

// URL patterns for provider profile pages
// Matches patterns like:
// - /fr-fr/avocat-thailande/julien-abc123
// - /en-us/lawyer-thailand/john-xyz789
// - /de-de/anwalt-frankreich/hans-def456
// Structure: /{locale}/{role}-{country}/{name-id}
const PROVIDER_PROFILE_PATTERNS = [
  // French patterns (supports: /fr-fr/avocat-thailande/nom-id)
  /^\/[a-z]{2}-[a-z]{2}\/avocat-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/notaire-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/expert-comptable-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/medecin-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/psychologue-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/conseiller-fiscal-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/agent-immobilier-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/traducteur-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/assureur-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/expatrie-[a-z]+\/[^\/]+$/i,

  // English patterns
  /^\/[a-z]{2}-[a-z]{2}\/lawyer-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/notary-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/accountant-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/doctor-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/psychologist-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/tax-advisor-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/real-estate-agent-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/translator-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/insurance-agent-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/expat-[a-z]+\/[^\/]+$/i,

  // Spanish patterns
  /^\/[a-z]{2}-[a-z]{2}\/abogado-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/contador-[a-z]+\/[^\/]+$/i,

  // German patterns
  /^\/[a-z]{2}-[a-z]{2}\/anwalt-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/rechtsanwalt-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/steuerberater-[a-z]+\/[^\/]+$/i,

  // Portuguese patterns
  /^\/[a-z]{2}-[a-z]{2}\/advogado-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/expatriado-[a-z]+\/[^\/]+$/i,

  // Russian patterns (romanized)
  /^\/[a-z]{2}-[a-z]{2}\/advokat-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/yurist-[a-z]+\/[^\/]+$/i,

  // Chinese patterns (romanized pinyin)
  /^\/[a-z]{2}-[a-z]{2}\/lushi-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/haiwai-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/kuaiji-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/yisheng-[a-z]+\/[^\/]+$/i,

  // Arabic patterns (romanized)
  /^\/[a-z]{2}-[a-z]{2}\/muhami-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/wafid-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/muhasib-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/tabib-[a-z]+\/[^\/]+$/i,

  // Hindi patterns (romanized)
  /^\/[a-z]{2}-[a-z]{2}\/vakil-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/videshi-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/lekhaakar-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/chikitsak-[a-z]+\/[^\/]+$/i,

  // ==========================================================================
  // NATIVE SCRIPT PATTERNS (Arabic, Hindi characters in URLs)
  // ==========================================================================

  // Arabic patterns (native script)
  // Examples: /ar-sa/محامي-السعودية/اسم-abc123
  /^\/[a-z]{2}-[a-z]{2}\/محامي-[\u0600-\u06FFa-z]+\/[^\/]+$/i,     // محامي (lawyer)
  /^\/[a-z]{2}-[a-z]{2}\/مغترب-[\u0600-\u06FFa-z]+\/[^\/]+$/i,     // مغترب (expat)
  /^\/[a-z]{2}-[a-z]{2}\/محاسب-[\u0600-\u06FFa-z]+\/[^\/]+$/i,     // محاسب (accountant)
  /^\/[a-z]{2}-[a-z]{2}\/طبيب-[\u0600-\u06FFa-z]+\/[^\/]+$/i,      // طبيب (doctor)

  // Hindi patterns (native Devanagari script)
  // Examples: /hi-in/वकील-भारत/नाम-abc123
  /^\/[a-z]{2}-[a-z]{2}\/वकील-[\u0900-\u097Fa-z]+\/[^\/]+$/i,      // वकील (lawyer)
  /^\/[a-z]{2}-[a-z]{2}\/प्रवासी-[\u0900-\u097Fa-z]+\/[^\/]+$/i,   // प्रवासी (expat)
  /^\/[a-z]{2}-[a-z]{2}\/लेखाकार-[\u0900-\u097Fa-z]+\/[^\/]+$/i,   // लेखाकार (accountant)
  /^\/[a-z]{2}-[a-z]{2}\/चिकित्सक-[\u0900-\u097Fa-z]+\/[^\/]+$/i,  // चिकित्सक (doctor)

  // ==========================================================================
  // GENERIC/FALLBACK PATTERNS
  // ==========================================================================

  // Generic pattern for provider profiles with ID
  /^\/[a-z]{2}-[a-z]{2}\/provider\/[a-zA-Z0-9_-]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/prestataire\/[a-zA-Z0-9_-]+$/i,

  // Legacy 4-5 segment patterns: /locale/role/country/[language/]name-slug
  // Examples: /fr-fr/avocat/au/francais/miguel-l-id, /en-us/lawyer/th/english/john-id
  /^\/[a-z]{2}-[a-z]{2}\/(?:avocat|lawyer|abogado|anwalt|advogado|advokat|lushi|muhami|vakil|expatrie|expat|expatriado|wafid|videshi|haiwai)\/[a-z]{2}\/[^\/]+\/?$/i,
  /^\/[a-z]{2}-[a-z]{2}\/(?:avocat|lawyer|abogado|anwalt|advogado|advokat|lushi|muhami|vakil|expatrie|expat|expatriado|wafid|videshi|haiwai)\/[a-z]{2}\/[a-z]+\/[^\/]+\/?$/i,

  // Fallback: catch any profile URL with 3-segment structure (locale/role-country/name)
  // Latin scripts — [a-z-]+ to support multi-word country slugs (new-zealand, etats-unis, etc.)
  /^\/[a-z]{2}-[a-z]{2}\/[a-z]+-[a-z][a-z-]*\/[^\/]+$/i,

  // Fallback: catch any profile URL with Unicode characters (Arabic, Hindi)
  // Examples: /ar-sa/محامي-السعودية/name, /hi-in/वकील-भारत/name
  /^\/[a-z]{2}-[a-z]{2}\/[\u0600-\u06FF]+-[\u0600-\u06FFa-z]+\/[^\/]+$/i,    // Arabic
  /^\/[a-z]{2}-[a-z]{2}\/[\u0900-\u097F]+-[\u0900-\u097Fa-z]+\/[^\/]+$/i,    // Hindi
];

/**
 * Check if the user-agent belongs to a bot
 * @param {string} userAgent - The User-Agent header value
 * @returns {boolean} - True if the request is from a bot
 */
function isBot(userAgent) {
  if (!userAgent) return false;

  const lowerUA = userAgent.toLowerCase();

  return BOT_USER_AGENTS.some(bot => lowerUA.includes(bot.toLowerCase()));
}

/**
 * Check if the URL path matches a provider profile pattern
 * @param {string} pathname - The URL pathname
 * @returns {boolean} - True if the path matches a provider profile pattern
 */
function isProviderProfilePath(pathname) {
  return PROVIDER_PROFILE_PATTERNS.some(pattern => pattern.test(pathname));
}

/**
 * Check if the URL path matches a blog/help article pattern
 * @param {string} pathname - The URL pathname
 * @returns {boolean} - True if the path matches a blog pattern
 */
function isBlogPath(pathname) {
  return BLOG_PATTERNS.some(pattern => pattern.test(pathname));
}

/**
 * Check if the URL path matches a landing page pattern
 * @param {string} pathname - The URL pathname
 * @returns {boolean} - True if the path matches a landing page pattern
 */
function isLandingPagePath(pathname) {
  return LANDING_PAGE_PATTERNS.some(pattern => pattern.test(pathname));
}

/**
 * Check if the URL path is an affiliate referral link
 * Matches: /ref/c/CODE, /rec/c/CODE, /prov/c/CODE (and locale variants)
 * Actor types: c (chatter), b (blogger), i (influencer), ga (group admin)
 * @param {string} pathname - The URL pathname
 * @returns {boolean}
 */
function isAffiliatePath(pathname) {
  return /^(\/[a-z]{2}(-[a-z]{2})?)?\/(ref|rec|prov)\/(c|b|i|ga)\/[A-Za-z0-9_-]+\/?$/i.test(pathname);
}

/**
 * Check if the URL path needs SSR/Prerendering
 * @param {string} pathname - The URL pathname
 * @returns {boolean} - True if the path needs prerendering for bots
 */
function needsPrerendering(pathname) {
  // Explicit matches (profiles, blog, landing pages)
  if (isProviderProfilePath(pathname) || isBlogPath(pathname) || isLandingPagePath(pathname)) {
    return true;
  }

  // For ALL other locale-prefixed public paths, route bots through SSR
  // so that Puppeteer can detect 404 pages (data-page-not-found) and return HTTP 404.
  // Without this, SPA fallback always returns 200 even for non-existent pages → soft 404 in GSC.
  // Exclude: assets, API, private routes, and non-locale paths
  const EXCLUDED_PATHS = /^\/(dashboard|admin|api|profile\/edit|call-checkout|booking-request|payment-success|inscription|register|connexion|login|tableau-de-bord|panel|chatter|influencer|blogger|group-admin|captain)/i;
  const isLocalePath = /^\/[a-z]{2}(-[a-z]{2})?\//i.test(pathname) || /^\/[a-z]{2}(-[a-z]{2})?\/?$/i.test(pathname);

  if (isLocalePath && !EXCLUDED_PATHS.test(pathname)) {
    return true;
  }

  return false;
}

/**
 * Extract bot name from user-agent for logging
 * @param {string} userAgent - The User-Agent header value
 * @returns {string} - The detected bot name or 'unknown'
 */
function getBotName(userAgent) {
  if (!userAgent) return 'unknown';

  const lowerUA = userAgent.toLowerCase();

  for (const bot of BOT_USER_AGENTS) {
    if (lowerUA.includes(bot.toLowerCase())) {
      return bot;
    }
  }

  return 'unknown';
}

/**
 * Check if path is the multi-dashboard (standalone app, needs SPA fallback)
 * @param {string} pathname - The URL pathname
 * @returns {boolean} - True if the path is multi-dashboard
 */
function isMultiDashboardPath(pathname) {
  return /^(\/[a-z]{2}-[a-z]{2})?\/multi-dashboard(\/|$)/i.test(pathname);
}

/**
 * Main request handler
 * @param {Request} request - The incoming request
 * @param {Object} env - Environment variables
 * @param {Object} ctx - Execution context
 * @returns {Promise<Response>} - The response
 */
async function handleRequest(request, env, ctx) {
  // Force log to confirm Worker is running
  console.log(`[WORKER ENTRY] Request received: ${request.url}`);

  const url = new URL(request.url);
  const userAgent = request.headers.get('User-Agent') || '';
  const pathname = url.pathname;

  console.log(`[WORKER DEBUG] UA: ${userAgent.substring(0, 50)}, Path: ${pathname}`);

  // =========================================================================
  // ANTI-SCRAPING CHECKS (early exit)
  // =========================================================================
  // 1. Bloquer les scrapers connus
  if (isBlockedScraper(userAgent)) {
    console.log(`[WORKER BLOCKED] Scraper UA: ${userAgent.substring(0, 80)}`);
    return new Response('Forbidden', { status: 403 });
  }

  // 2. Rate limiting par IP (skip les assets statiques)
  if (!pathname.match(/\.(js|css|png|jpg|jpeg|webp|svg|ico|woff|woff2|map|json)$/)) {
    const clientIp = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
    if (!checkWorkerRateLimit(clientIp)) {
      console.log(`[WORKER RATE-LIMITED] IP: ${clientIp}, Path: ${pathname}`);
      return new Response('Too Many Requests', {
        status: 429,
        headers: { 'Retry-After': '60', 'Content-Type': 'text/plain' },
      });
    }
  }

  // =========================================================================
  // Firebase Auth handler proxy (custom authDomain for iOS Safari ITP fix)
  // Proxies /__/auth/* requests to Firebase so OAuth stays on the same domain.
  // =========================================================================
  if (pathname.startsWith('/__/auth/')) {
    const firebaseAuthUrl = `${FIREBASE_AUTH_ORIGIN}${pathname}${url.search}`;
    console.log(`[WORKER] Firebase Auth proxy: ${pathname} -> ${firebaseAuthUrl}`);

    const authResponse = await fetch(firebaseAuthUrl, {
      method: request.method,
      headers: request.headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      redirect: 'manual', // Don't follow redirects - pass them through as-is
    });

    const proxyHeaders = new Headers(authResponse.headers);
    // IMPORTANT: Do NOT delete set-cookie — Firebase Auth needs cookies for
    // getRedirectResult to work on iOS Safari (ITP blocks third-party cookies,
    // but first-party cookies via this same-domain proxy are allowed)
    proxyHeaders.set('X-Worker-Active', 'true');
    proxyHeaders.set('X-Worker-Auth-Proxy', 'true');

    return new Response(authResponse.body, {
      status: authResponse.status,
      statusText: authResponse.statusText,
      headers: proxyHeaders,
    });
  }

  // =========================================================================
  // SOS HOLIDAYS DOMAIN HANDLING
  // sos-holidays.com serves ONLY the home page (vacationer landing page).
  // All other paths redirect to sos-expat.com. Bots get proper SEO content.
  // =========================================================================
  const isHolidaysDomain = url.hostname.includes('sos-holidays');

  if (isHolidaysDomain) {
    // Serve holidays-specific robots.txt
    if (pathname === '/robots.txt') {
      return new Response(
        [
          '# Robots.txt for SOS-Holidays.com',
          '# https://sos-holidays.com',
          '',
          'User-agent: *',
          'Allow: /',
          'Allow: /fr-fr',
          'Allow: /en-us',
          'Allow: /es-es',
          'Allow: /de-de',
          'Allow: /pt-pt',
          'Allow: /ru-ru',
          'Allow: /zh-cn',
          'Allow: /ar-sa',
          'Allow: /hi-in',
          'Disallow: /dashboard',
          'Disallow: /admin',
          'Disallow: /api/',
          'Disallow: /profile/edit',
          'Disallow: /call-checkout',
          '',
          'Sitemap: https://sos-holidays.com/sitemap.xml',
        ].join('\n'),
        {
          status: 200,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
            'X-Worker-Active': 'true',
          },
        }
      );
    }

    // Serve holidays-specific sitemap (home page in 9 locales only)
    if (pathname === '/sitemap.xml') {
      const locales = ['fr-fr', 'en-us', 'es-es', 'de-de', 'pt-pt', 'ru-ru', 'zh-cn', 'ar-sa', 'hi-in'];
      const today = new Date().toISOString().split('T')[0];
      const urls = locales.map(locale => {
        const hreflangs = locales.map(alt => {
          // Use language-only codes (fr, en, zh) — consistent with HreflangLinks.tsx
          // Google recommends language-only for language targeting (not country-specific content)
          const lang = alt.split('-')[0];
          const hreflangCode = lang === 'zh' ? 'zh-Hans' : lang;
          return `      <xhtml:link rel="alternate" hreflang="${hreflangCode}" href="https://sos-holidays.com/${alt}" />`;
        }).join('\n');
        return [
          '  <url>',
          `    <loc>https://sos-holidays.com/${locale}</loc>`,
          `    <lastmod>${today}</lastmod>`,
          '    <changefreq>weekly</changefreq>',
          '    <priority>1.0</priority>',
          hreflangs,
          `      <xhtml:link rel="alternate" hreflang="x-default" href="https://sos-holidays.com/fr-fr" />`,
          '  </url>',
        ].join('\n');
      }).join('\n');

      return new Response(
        [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
          urls,
          '</urlset>',
        ].join('\n'),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
            'X-Worker-Active': 'true',
          },
        }
      );
    }

    // Allow static assets to be served directly (OG images, favicons, logos, etc.)
    const isStaticAsset = /\.(png|jpg|jpeg|webp|svg|ico|gif|xml|json|txt|woff2?|ttf|css|js)$/i.test(pathname);

    // Only the home page lives on sos-holidays.com
    // All other paths → 301 redirect to sos-expat.com (prevents duplicate content)
    const isHomePage = /^(\/?|\/[a-z]{2}(-[a-z]{2})?\/?)?$/i.test(pathname);
    if (!isHomePage && !isStaticAsset) {
      const redirectUrl = `https://sos-expat.com${pathname}${url.search}`;
      console.log(`[WORKER] Holidays non-home redirect: ${pathname} -> ${redirectUrl}`);
      return new Response(null, {
        status: 301,
        headers: {
          'Location': redirectUrl,
          'X-Worker-Active': 'true',
          'X-Worker-Redirect': 'holidays-to-expat',
          'Cache-Control': 'public, max-age=31536000',
        },
      });
    }
  }

  // ==========================================================================
  // BLOG/TOOLS PROXY — Forward requests to the Blog Laravel SSR backend
  // The blog is a separate Laravel app (server-side rendered, NOT SPA)
  // running on the VPS behind nginx.
  //
  // Routes proxied:
  //   /blog/*                     -- legacy blog prefix (301 redirect to new URLs)
  //   /{locale}/articles/{slug}   -- blog article DETAIL pages (listing = SPA)
  //   /{locale}/galerie/{slug}    -- gallery DETAIL pages (listing = SPA)
  //   /{locale}/vie-a-letranger/* -- living abroad FAQ articles
  //   /{locale}/faq               -- FAQ (SPA React/Firestore, NOT blog)
  //   /{locale}/pays              -- country pages
  //   /{locale}/categories        -- categories
  //   /{locale}/tags              -- tags
  //   /sitemaps/*.xml             -- blog sitemaps
  //   /admin/*                    -- blog admin panel
  //   /api/v1/tool-*              -- tool APIs
  //   /api/v1/public/gallery      -- gallery API (used by SPA)
  // NOT proxied (SPA pages): /articles listing, /galerie listing
  // ==========================================================================
  const BLOG_ORIGIN = 'https://blog.life-expat.com';

  // All translated URL segments from the blog Laravel app (route-segments.php)
  // These are the ONLY segments that should be proxied — everything else stays on the SPA
  const BLOG_SEGMENTS = new Set([
    // articles listing = SPA React page -- detail pages (with slug) handled separately via ARTICLES_SEGMENTS
    // (articles segments moved to ARTICLES_SEGMENTS below)
    // faq SOS Expat — appartient à la SPA React (Firestore), PAS au blog
    // 'faq', 'preguntas-frecuentes', 'haeufige-fragen', 'perguntas-frequentes', 'voprosy', 'changjian-wenti', 'aksar-poochhe-jaane-wale-prashna', 'asilah-shaaiah',
    // vie-a-letranger — FAQ pratiques par pays (blog Laravel, URLs distinctes de /faq Firestore)
    'vie-a-letranger', 'living-abroad', 'vivir-en-el-extranjero', 'leben-im-ausland',
    'viver-no-estrangeiro', 'zhizn-za-rubezhom', 'haiwai-shenghuo', 'videsh-mein-jeevan', 'alhayat-fi-alkhaarij',
    // categories
    'categories', 'categorias', 'kategorien', 'kategorii', 'fenlei', 'varg', 'alfiat',
    // tags
    'tags', 'etiquetas', 'tegi', 'biaoqian', 'tag', 'alwusum',
    // countries
    'pays', 'countries', 'paises', 'laender', 'strany', 'guojia', 'desh', 'alduwl',
    // guides pratiques (all 9 languages) — Blog SSR
    'guides-pratiques', 'practical-guides', 'guias-practicas', 'praktische-ratgeber',
    'guias-praticos', 'prakticheskie-rukovodstva', 'shiyong-zhinan', 'vyavaharik-margadarshika', 'adillat-amaliyyat',
    // programme (partner/affiliate programs) — Blog SSR
    'programme', 'program', 'programa', 'programm', 'programma', 'jihua', 'karyakram', 'barnamaj',
    // search (all 9 languages)
    'recherche', 'search', 'buscar', 'suche', 'pesquisa', 'poisk', 'sousuo', 'khoj', 'bahth',
    // special
    'feed.xml',
  ]);

  // Article segments (all 9 languages) -- listing + detail → Blog SSR (redesign 2026-04)
  const ARTICLES_SEGMENTS = new Set([
    'articles', 'articulos', 'artikel', 'artigos', 'stati', 'wenzhang', 'lekh', 'maqalat',
  ]);

  // Tools (all 9 languages) -- listing + detail → Blog SSR (redesign 2026-04)
  const OUTILS_SEGMENTS = new Set([
    'outils', 'tools', 'herramientas', 'werkzeuge', 'ferramentas', 'instrumenty', 'gongju', 'upkaran', 'adawat',
  ]);

  // Gallery (all 9 languages) -- listing + detail → Blog SSR (redesign 2026-04)
  const GALERIE_SEGMENTS = new Set([
    'galerie', 'gallery', 'galeria', 'bildergalerie', 'galereya', 'tuku', 'chitralaya', 'chitravali', 'maarad',
  ]);

  // Sondages (all 9 languages) -- listing + detail → Blog SSR (redesign 2026-04)
  const SONDAGES_SEGMENTS = new Set([
    // Plain survey forms (generic listing + detail: /surveys/slug)
    'sondages', 'surveys', 'encuestas', 'umfragen', 'oprosy', 'pesquisas', 'diaocha', 'sarvekshan', 'istiftaat',
    // Compound survey forms (expat/vacationer/listing)
    'sondages-expatries', 'expat-surveys', 'encuestas-expatriados', 'expat-umfragen',
    'pesquisas-expatriados', 'oprosy-expatov', 'expat-diaocha', 'expat-sarvekshan', 'istiftaat-mughtaribeen',
    'sondages-vacanciers', 'vacationer-surveys', 'encuestas-vacacionistas', 'urlauber-umfragen',
    'pesquisas-turistas', 'oprosy-otdykhayushchikh', 'dujia-diaocha', 'chhutti-sarvekshan', 'istiftaat-saaihin',
    'nos-sondages', 'our-surveys', 'nuestras-encuestas', 'unsere-umfragen',
    'nossos-pesquisas', 'nashi-oprosy', 'women-diaocha', 'hamare-sarvekshan', 'istiftaatuna',
  ]);

  // Annuaire/Directory (all 9 languages) — Blog SSR (redirect removed from DirectoryController)
  const ANNUAIRE_SEGMENTS = new Set([
    'annuaire', 'expat-directory', 'directorio-expat', 'expat-verzeichnis',
    'diretorio-expat', 'spravochnik-expat', 'zhinan-expat', 'nirdeshika-expat', 'dalil-expat',
  ]);

  // Search (all 9 languages) → Blog SSR
  const SEARCH_SEGMENTS = new Set([
    'recherche', 'search', 'buscar', 'suche', 'pesquisa', 'poisk', 'sousuo', 'khoj', 'bahth',
  ]);

  // News segments (all 9 languages) -- listing + detail → Blog SSR
  // Source: Blog config/route-segments.php 'news'
  const NEWS_SEGMENTS = new Set([
    'actualites-expats',       // fr
    'expat-news',              // en
    'noticias-expatriados',    // es + pt
    'expat-nachrichten',       // de
    'novosti-expatov',         // ru
    'expat-xinwen',            // zh
    'expat-samachar',          // hi
    'akhbar-mughtaribeen',     // ar
  ]);

  // Check if the path should be proxied to the blog backend
  function isBlogPath(path) {
    // Legacy /blog/* prefix — proxy as-is (Laravel will handle)
    if (path === '/blog' || path.startsWith('/blog/')) return true;

    // SEO files — sitemap.xml, robots.txt, llms.txt, ai.txt served from BLOG LARAVEL
    // The blog generates a dynamic sitemap index that includes all content types
    // (articles, categories, countries, tools, sondages, AND image bank).
    // This is scalable: any new content added via admin auto-appears in sitemap.
    if (path === '/sitemap.xml') return true;
    if (path === '/sitemap-news.xml') return true;
    if (path === '/robots.txt') return true;
    if (path === '/llms.txt') return true;
    if (path === '/ai.txt') return true;
    if (path === '/.well-known/indexnow-key.txt') return true;
    // Blog sitemaps (exclude Firebase SPA sitemaps: profiles, help, faq, country-listings + per-language variants)
    const FIREBASE_SITEMAPS = ['/sitemaps/profiles.xml', '/sitemaps/help.xml', '/sitemaps/faq.xml', '/sitemaps/country-listings.xml'];
    // Per-language sitemaps: profiles-fr.xml, listings-en.xml, help-de.xml, etc.
    const isFirebaseLangSitemap = /^\/sitemaps\/(profiles|listings|help)-[a-z]{2}\.xml$/.test(path);
    // Dynamic sitemap index
    const isSitemapIndex = path === '/sitemap-index.xml';
    if (path.startsWith('/sitemaps/') && path.endsWith('.xml') && !FIREBASE_SITEMAPS.includes(path) && !isFirebaseLangSitemap && !isSitemapIndex) return true;

    // Image Bank storage files (served by VPS nginx, needed for Google Images)
    if (path.startsWith('/storage/image-bank/')) return true;

    // Blog static assets: flags, images used in article pages (countries, etc.)
    if (path.startsWith('/images/flags/')) return true;

    // Admin panel
    if (path.startsWith('/admin')) return true;

    // Tool API endpoints
    if (path.startsWith('/api/v1/tool-')) return true;

    // Gallery API (used by SPA React component)
    if (path.startsWith('/api/v1/public/gallery')) return true;

    // Search autocomplete API (blog Laravel)
    if (path.startsWith('/api/search/suggest')) return true;

    // Locale-prefixed paths: /{xx-yy}/{segment}[/{slug}[/{sub}]]
    const match = path.match(/^\/([a-z]{2}-[a-z]{2})(?:\/([^\/]+))?(?:\/([^\/]+))?(?:\/([^\/]+))?/);
    if (match) {
      const segment = match[2];
      const slug = match[3];
      const sub = match[4]; // 4th segment: expatriation, vacances, etc.
      // /{locale} alone = app homepage (not blog)
      if (!segment) return false;

      // Articles: listing + detail → Blog SSR (redesign 2026-04)
      if (ARTICLES_SEGMENTS.has(segment)) return true;

      // Sondages: listing + detail → Blog SSR
      if (SONDAGES_SEGMENTS.has(segment)) return true;

      // Tools: listing + detail → Blog SSR
      if (OUTILS_SEGMENTS.has(segment)) return true;

      // Gallery: listing + detail → Blog SSR
      if (GALERIE_SEGMENTS.has(segment)) return true;

      // Annuaire/Directory: listing + detail → Blog SSR
      if (ANNUAIRE_SEGMENTS.has(segment)) return true;

      // Search → Blog SSR
      if (SEARCH_SEGMENTS.has(segment)) return true;

      // News: listing + detail → Blog SSR
      if (NEWS_SEGMENTS.has(segment)) return true;

      // /{locale}/{translated-segment} = blog content (categories, tags, countries, vie-a-letranger)
      // This also handles 4-segment paths like /fr-fr/pays/thailande/expatriation
      // because segment='pays' is in BLOG_SEGMENTS and the full path is proxied
      if (BLOG_SEGMENTS.has(segment)) return true;

      // FAQ — toujours SPA React (Firestore, géré depuis la console admin SOS Expat)
      // Aucune route FAQ n'est proxiée vers le blog (routes supprimées du blog Laravel)
    }

    return false;
  }

  // ==========================================================================
  // CROSS-LOCALE BLOG SLUG REDIRECT (must run BEFORE blog proxy)
  // Detects when a blog content slug (gallery, tools, surveys, articles)
  // uses a translation from a different language than the URL locale.
  // e.g., /en-us/galereya/... (Russian gallery slug under English) → /en-us/gallery/...
  // Without this, the blog proxy would serve the page as-is, creating duplicates.
  // ==========================================================================
  const BLOG_CROSS_LOCALE_SLUGS = {
    'gallery':       { fr:'galerie', en:'gallery', es:'galeria', de:'bildergalerie', ru:'galereya', pt:'galeria', zh:'tuku', hi:'chitravali', ar:'maarad' },
    'tools':         { fr:'outils', en:'tools', es:'herramientas', de:'werkzeuge', ru:'instrumenty', pt:'ferramentas', zh:'gongju', hi:'upkaran', ar:'adawat' },
    'surveys':       { fr:'sondages', en:'surveys', es:'encuestas', de:'umfragen', ru:'oprosy', pt:'pesquisas', zh:'diaocha', hi:'sarvekshan', ar:'istiftaat' },
    'articles':      { fr:'articles', en:'articles', es:'articulos', de:'artikel', ru:'stati', pt:'artigos', zh:'wenzhang', hi:'lekh', ar:'maqalat' },
    'living-abroad': { fr:'vie-a-letranger', en:'living-abroad', es:'vivir-en-el-extranjero', de:'leben-im-ausland', ru:'zhizn-za-rubezhom', pt:'viver-no-estrangeiro', zh:'haiwai-shenghuo', hi:'videsh-mein-jeevan', ar:'alhayat-fi-alkhaarij' },
    'search':        { fr:'recherche', en:'search', es:'buscar', de:'suche', ru:'poisk', pt:'pesquisa', zh:'sousuo', hi:'khoj', ar:'bahth' },
    'news':          { fr:'actualites-expats', en:'expat-news', es:'noticias-expatriados', de:'expat-nachrichten', ru:'novosti-expatov', pt:'noticias-expatriados', zh:'expat-xinwen', hi:'expat-samachar', ar:'akhbar-mughtaribeen' },
    'countries':     { fr:'pays', en:'countries', es:'paises', de:'laender', ru:'strany', pt:'paises', zh:'guojia', hi:'desh', ar:'alduwl' },
    'categories':    { fr:'categories', en:'categories', es:'categorias', de:'kategorien', ru:'kategorii', pt:'categorias', zh:'fenlei', hi:'varg', ar:'alfiat' },
  };

  // Build reverse map: slug → { langs: [...], route, translations }
  const _blogSlugToRoute = {};
  for (const [route, translations] of Object.entries(BLOG_CROSS_LOCALE_SLUGS)) {
    for (const [lang, slug] of Object.entries(translations)) {
      if (!_blogSlugToRoute[slug]) {
        _blogSlugToRoute[slug] = { langs: [lang], route, translations };
      } else if (!_blogSlugToRoute[slug].langs.includes(lang)) {
        _blogSlugToRoute[slug].langs.push(lang);
      }
    }
  }

  const blogCrossLocaleMatch = pathname.match(/^\/([a-z]{2})-([a-z]{2})\/([^\/]+)(\/.*)?$/);
  if (blogCrossLocaleMatch) {
    const bclLang = blogCrossLocaleMatch[1].toLowerCase();
    const bclCountry = blogCrossLocaleMatch[2].toLowerCase();
    const bclSlug = blogCrossLocaleMatch[3];
    const bclRest = blogCrossLocaleMatch[4] || '';
    const effectiveBclLang = bclLang === 'zh' ? 'zh' : bclLang;

    const blogMatch = _blogSlugToRoute[bclSlug];
    if (blogMatch) {
      const correctSlug = blogMatch.translations[effectiveBclLang] || blogMatch.translations['en'];
      if (correctSlug && correctSlug !== bclSlug) {
        const redirectUrl = `${url.origin}/${bclLang}-${bclCountry}/${correctSlug}${bclRest}${url.search}`;
        console.log(`[WORKER] Blog cross-locale redirect: ${pathname} -> /${bclLang}-${bclCountry}/${correctSlug}${bclRest}`);
        return new Response(null, {
          status: 301,
          headers: { 'Location': redirectUrl, 'X-Worker-Active': 'true', 'Cache-Control': 'public, max-age=31536000' },
        });
      }
    }
  }

  // ==========================================================================
  // COUNTRY SLUG NORMALIZATION for lawyer/expat listing pages
  // Detects wrong-language country slugs or ISO codes and redirects to the
  // correctly translated country name for the URL's language.
  // e.g., /ar-sa/muhamun/bulgarien → /ar-sa/muhamun/bulgharia (DE→AR)
  //        /de-de/anwaelte/bq → /de-de/anwaelte/bonaire (ISO→DE)
  // ==========================================================================
  const LISTING_ROLE_SLUGS = new Set([
    // Singular lawyer forms
    'avocat','lawyer','abogado','anwalt','advokat','advogado','lushi','vakil','muhamun','muhamin',
    // Plural lawyer forms (React canonical)
    'avocats','lawyers','abogados','anwaelte','advokaty','advogados',
    // Expat forms
    'expatries','expats','expatriados','expaty','haiwai','videshi','mughtaribun',
    // Blog country page paths (/{locale}/pays/{country}, /{locale}/countries/{country}, etc.)
    'pays','countries','paises','laender','strany','guojia','desh','alduwl',
  ]);
  const countryNormMatch = pathname.match(/^\/([a-z]{2})-([a-z]{2})\/([^\/]+)\/([^\/]+)\/?$/);
  if (countryNormMatch) {
    const cnLang = countryNormMatch[1];
    const cnCountry = countryNormMatch[2];
    const cnRole = countryNormMatch[3];
    const cnSlug = countryNormMatch[4].toLowerCase();
    if (LISTING_ROLE_SLUGS.has(cnRole)) {
      const iso = _CR[cnSlug]; // Reverse lookup: slug → ISO code
      if (iso) {
        const effectiveLang = cnLang === 'zh' ? 'zh' : cnLang;
        const langIdx = _LI[effectiveLang];
        if (langIdx !== undefined) {
          const correctSlug = _CS[iso]?.[langIdx];
          if (correctSlug && correctSlug !== cnSlug) {
            const redirectUrl = `${url.origin}/${cnLang}-${cnCountry}/${cnRole}/${correctSlug}${url.search}`;
            console.log(`[WORKER] Country slug fix: ${pathname} -> /${cnLang}-${cnCountry}/${cnRole}/${correctSlug}`);
            return new Response(null, {
              status: 301,
              headers: { 'Location': redirectUrl, 'X-Worker-Active': 'true', 'Cache-Control': 'public, max-age=31536000' },
            });
          }
        }
      }
    }
  }

  // ==========================================================================
  // DEEP CROSS-LOCALE SUB-PATH NORMALIZATION (4-segment blog paths)
  // Handles: /{locale}/{section}/{wrong-lang-subsection}/{wrong-lang-country}
  // e.g., /fr-fr/vie-a-letranger/guojia/meiguo → /fr-fr/vie-a-letranger/pays/etats-unis
  // ==========================================================================
  const COUNTRY_SECTION_TRANSLATIONS = {
    fr:'pays', en:'countries', es:'paises', de:'laender', ru:'strany', pt:'paises', zh:'guojia', hi:'desh', ar:'alduwl',
  };
  const deepMatch = pathname.match(/^\/([a-z]{2})-([a-z]{2})\/([^\/]+)\/([^\/]+)\/([^\/]+)\/?$/);
  if (deepMatch) {
    const dmLang = deepMatch[1], dmCountry = deepMatch[2];
    const dmSec = deepMatch[3], dmSubSec = deepMatch[4], dmSlug = deepMatch[5].toLowerCase();
    const dmELang = dmLang === 'zh' ? 'zh' : dmLang;
    // Check if sub-section is a country section slug from another language
    const correctSubSec = COUNTRY_SECTION_TRANSLATIONS[dmELang];
    let subSecNeedsTranslation = false;
    if (correctSubSec && dmSubSec !== correctSubSec) {
      // Check if dmSubSec belongs to another language's country section
      for (const [, s] of Object.entries(COUNTRY_SECTION_TRANSLATIONS)) {
        if (s === dmSubSec) { subSecNeedsTranslation = true; break; }
      }
    }
    if (subSecNeedsTranslation) {
      // Also translate the country slug
      const iso = _CR[dmSlug];
      const correctCountry = iso ? (_CS[iso]?.[_LI[dmELang]] || dmSlug) : dmSlug;
      const redirectUrl = `${url.origin}/${dmLang}-${dmCountry}/${dmSec}/${correctSubSec}/${correctCountry}${url.search}`;
      console.log(`[WORKER] Deep sub-path fix: ${pathname} -> /${dmLang}-${dmCountry}/${dmSec}/${correctSubSec}/${correctCountry}`);
      return new Response(null, {
        status: 301,
        headers: { 'Location': redirectUrl, 'X-Worker-Active': 'true', 'Cache-Control': 'public, max-age=31536000' },
      });
    }
  }

  // ==========================================================================
  // SPA ALIAS REDIRECTS → Blog canonical paths (301)
  // /fr-fr/fiches-pays → /fr-fr/categories/fiches-pays
  // /fr-fr/nos-outils → /fr-fr/outils
  // /fr-fr/resultats-sondages → /fr-fr/sondages-expatries
  // ==========================================================================
  const aliasMatch = pathname.match(/^\/([a-z]{2}-[a-z]{2})\/([^\/]+)/);
  if (aliasMatch) {
    const aliasLocale = aliasMatch[1];
    const aliasSegment = aliasMatch[2];
    const FICHES_ALIASES = ['fiches-pays', 'fiches-thematiques', 'fiches-villes', 'fiches-pratiques'];
    if (FICHES_ALIASES.includes(aliasSegment)) {
      return Response.redirect(`https://sos-expat.com/${aliasLocale}/categories/${aliasSegment}`, 301);
    }
    // nos-outils → outils
    const outilsSegs = ['nos-outils', 'our-tools', 'nuestras-herramientas', 'unsere-werkzeuge'];
    if (outilsSegs.includes(aliasSegment)) {
      const outilsSlugs = { fr:'outils', en:'tools', es:'herramientas', de:'werkzeuge', pt:'ferramentas', ru:'instrumenty', zh:'gongju', hi:'upkaran', ar:'adawat' };
      const lang2 = aliasLocale.split('-')[0];
      return Response.redirect(`https://sos-expat.com/${aliasLocale}/${outilsSlugs[lang2] || 'outils'}`, 301);
    }
    // resultats-sondages → sondages-expatries
    if (aliasSegment === 'resultats-sondages' || aliasSegment === 'survey-results') {
      const sondageSlugs = { fr:'sondages-expatries', en:'expat-surveys', es:'encuestas-expatriados', de:'expat-umfragen', pt:'pesquisas-expatriados', ru:'oprosy-expatov', zh:'expat-diaocha', hi:'expat-sarvekshan', ar:'istiftaat-mughtaribeen' };
      const lang2 = aliasLocale.split('-')[0];
      return Response.redirect(`https://sos-expat.com/${aliasLocale}/${sondageSlugs[lang2] || 'sondages-expatries'}`, 301);
    }
    // nos-sondages → sondages-expatries
    if (aliasSegment === 'nos-sondages' || aliasSegment === 'our-surveys') {
      const sondageSlugs = { fr:'sondages-expatries', en:'expat-surveys', es:'encuestas-expatriados', de:'expat-umfragen', pt:'pesquisas-expatriados', ru:'oprosy-expatov', zh:'expat-diaocha', hi:'expat-sarvekshan', ar:'istiftaat-mughtaribeen' };
      const lang2 = aliasLocale.split('-')[0];
      return Response.redirect(`https://sos-expat.com/${aliasLocale}/${sondageSlugs[lang2] || 'sondages-expatries'}`, 301);
    }
  }

  if (isBlogPath(pathname)) {
    console.log(`[WORKER] Blog proxy: ${pathname}`);
    try {
      // Legacy /blog/* — redirect 301 to new URL without /blog prefix
      if (pathname.startsWith('/blog/')) {
        const newPath = pathname.replace(/^\/blog/, '');
        return new Response(null, {
          status: 301,
          headers: { 'Location': newPath + url.search },
        });
      }
      if (pathname === '/blog') {
        return new Response(null, {
          status: 301,
          headers: { 'Location': '/' },
        });
      }

      const blogUrl = new URL(pathname + url.search, BLOG_ORIGIN);
      const blogResponse = await fetch(blogUrl.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
        redirect: 'manual',
      });

      const blogHeaders = new Headers(blogResponse.headers);
      blogHeaders.set('X-Worker-Active', 'true');
      blogHeaders.set('X-Worker-Blog-Proxy', 'true');
      // Remove any location header pointing to internal origin
      const location = blogHeaders.get('Location');
      if (location && location.startsWith(BLOG_ORIGIN)) {
        blogHeaders.set('Location', location.replace(BLOG_ORIGIN, ''));
      }

      return new Response(blogResponse.body, {
        status: blogResponse.status,
        statusText: blogResponse.statusText,
        headers: blogHeaders,
      });
    } catch (error) {
      console.error(`[WORKER] Blog proxy error: ${error.message}`);
      return new Response('Blog temporarily unavailable', {
        status: 503,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  }

  // ==========================================================================
  // SITEMAP PROXY — Serve dynamic sitemaps from Firebase Cloud Functions
  // Cloudflare Pages _redirects can't proxy external URLs, so we do it here
  // ==========================================================================
  // Legacy sitemaps (unchanged, backward compatible)
  const SITEMAP_PROXY = {
    '/sitemaps/profiles.xml': 'https://europe-west1-sos-urgently-ac307.cloudfunctions.net/sitemapProfiles',
    '/sitemaps/help.xml': 'https://europe-west1-sos-urgently-ac307.cloudfunctions.net/sitemapHelp',
    '/sitemaps/faq.xml': 'https://europe-west1-sos-urgently-ac307.cloudfunctions.net/sitemapFaq',
    // landing.xml removed — landing_pages collection is empty, sitemap caused GSC errors
    '/sitemaps/country-listings.xml': 'https://europe-west1-sos-urgently-ac307.cloudfunctions.net/sitemapCountryListings',
  };

  // Per-language sitemaps: /sitemaps/profiles-fr.xml → sitemapProfiles?lang=fr
  const langSitemapMatch = pathname.match(/^\/sitemaps\/(profiles|listings|help)-([a-z]{2})\.xml$/);
  if (langSitemapMatch) {
    const typeMap = {
      'profiles': 'sitemapProfiles',
      'listings': 'sitemapCountryListings',
      'help': 'sitemapHelp',
    };
    const funcName = typeMap[langSitemapMatch[1]];
    const lang = langSitemapMatch[2];
    const targetUrl = `https://europe-west1-sos-urgently-ac307.cloudfunctions.net/${funcName}?lang=${lang}`;
    try {
      const sitemapResponse = await fetch(targetUrl, {
        headers: { 'Accept': 'application/xml' },
      });
      const newHeaders = new Headers(sitemapResponse.headers);
      newHeaders.set('Content-Type', 'application/xml; charset=utf-8');
      newHeaders.set('Cache-Control', 'public, max-age=3600');
      newHeaders.set('X-Worker-Sitemap-Proxy', 'lang');
      return new Response(sitemapResponse.body, {
        status: sitemapResponse.status,
        headers: newHeaders,
      });
    } catch (error) {
      console.error(`[WORKER] Lang sitemap proxy error for ${pathname}: ${error.message}`);
      return new Response('Sitemap temporarily unavailable', { status: 503 });
    }
  }

  // Dynamic sitemap index: /sitemap-index.xml → sitemapIndex Cloud Function
  if (pathname === '/sitemap-index.xml') {
    try {
      const sitemapResponse = await fetch('https://europe-west1-sos-urgently-ac307.cloudfunctions.net/sitemapIndex', {
        headers: { 'Accept': 'application/xml' },
      });
      const newHeaders = new Headers(sitemapResponse.headers);
      newHeaders.set('Content-Type', 'application/xml; charset=utf-8');
      newHeaders.set('Cache-Control', 'public, max-age=3600');
      newHeaders.set('X-Worker-Sitemap-Proxy', 'index');
      return new Response(sitemapResponse.body, {
        status: sitemapResponse.status,
        headers: newHeaders,
      });
    } catch (error) {
      console.error(`[WORKER] Sitemap index proxy error: ${error.message}`);
      return new Response('Sitemap index temporarily unavailable', { status: 503 });
    }
  }

  if (SITEMAP_PROXY[pathname]) {
    try {
      // Forward query params (e.g., ?page=1 for paginated sitemaps)
      const sitemapTarget = url.search ? `${SITEMAP_PROXY[pathname]}${url.search}` : SITEMAP_PROXY[pathname];
      const sitemapResponse = await fetch(sitemapTarget, {
        headers: { 'Accept': 'application/xml' },
      });
      const newHeaders = new Headers(sitemapResponse.headers);
      newHeaders.set('Content-Type', 'application/xml; charset=utf-8');
      newHeaders.set('Cache-Control', 'public, max-age=3600');
      newHeaders.set('X-Worker-Sitemap-Proxy', 'true');
      return new Response(sitemapResponse.body, {
        status: sitemapResponse.status,
        headers: newHeaders,
      });
    } catch (error) {
      console.error(`[WORKER] Sitemap proxy error for ${pathname}: ${error.message}`);
      return new Response('Sitemap temporarily unavailable', { status: 503 });
    }
  }

  // Handle multi-dashboard specially - fetch index.html without following redirects
  // This is needed because the origin server redirects /multi-dashboard to /
  // but we want the SPA to handle routing client-side
  if (isMultiDashboardPath(pathname)) {
    console.log(`[WORKER] Multi-dashboard path detected: ${pathname}`);

    try {
      // Fetch the root index.html from Cloudflare Pages (SPA entry point)
      const indexUrl = new URL('/', PAGES_ORIGIN);
      const indexResponse = await fetch(indexUrl.toString(), {
        method: 'GET',
        headers: request.headers,
        redirect: 'follow', // Follow redirects to get the actual HTML
      });

      // If we got HTML, return it with the original URL preserved
      if (indexResponse.ok) {
        const html = await indexResponse.text();
        const newHeaders = new Headers(indexResponse.headers);
        newHeaders.set('X-Worker-Active', 'true');
        newHeaders.set('X-Worker-Multi-Dashboard', 'true');
        newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
        newHeaders.set('Cross-Origin-Embedder-Policy', 'unsafe-none');
        // Don't cache to ensure fresh content
        newHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');

        return new Response(html, {
          status: 200,
          statusText: 'OK',
          headers: newHeaders,
        });
      }
    } catch (error) {
      console.error(`[WORKER] Multi-dashboard fetch error: ${error.message}`);
    }
    // Fall through to normal handling if fetch fails
  }

  // =========================================================================
  // LOCALE CANONICALIZATION (ALL VISITORS): Redirect non-canonical locales
  // Applies to ALL visitors (not just bots) to prevent Google from indexing
  // duplicate pages under non-canonical locales like /fr-us/, /de-br/, etc.
  // Google discovers these via internal links even if bots are redirected.
  // =========================================================================
  const localeMatch = pathname.match(/^\/([a-z]{2})-([a-z]{2})(\/.*)?$/i);
  if (localeMatch) {
    const urlLang = localeMatch[1].toLowerCase();
    const urlCountry = localeMatch[2].toLowerCase();
    const restPath = localeMatch[3] || '';

    // Map URL language to default country
    const LANG_TO_DEFAULT_COUNTRY = {
      fr: 'fr', en: 'us', es: 'es', de: 'de', ru: 'ru',
      pt: 'pt', zh: 'cn', ch: 'cn', hi: 'in', ar: 'sa',
    };
    // Valid languages (includes 'ch' which is internal code for Chinese, mapped to zh-cn)
    const VALID_LANGS = new Set(['fr', 'en', 'es', 'de', 'ru', 'pt', 'zh', 'ch', 'hi', 'ar']);
    // Valid locale combos (language-country pairs that make sense)
    const VALID_LOCALE_SET = new Set([
      'fr-fr', 'fr-ca', 'fr-be', 'fr-ch',
      'en-us', 'en-gb', 'en-ca', 'en-au',
      'es-es', 'es-mx', 'es-ar',
      'de-de', 'de-at', 'de-ch',
      'pt-pt', 'pt-br',
      'ru-ru',
      'zh-cn', 'zh-tw',
      'ar-sa',
      'hi-in',
    ]);

    const locale = `${urlLang}-${urlCountry}`;

    // Canonical locales — only these should be served directly (matches sitemap + hreflang)
    // Non-canonical variants (pt-br, en-gb, fr-ca, etc.) must redirect to canonical
    // to avoid Puppeteer redirect chains that cause SSR timeouts → 5xx
    const CANONICAL_LOCALES = new Set([
      'fr-fr', 'en-us', 'es-es', 'de-de', 'ru-ru',
      'pt-pt', 'zh-cn', 'ar-sa', 'hi-in',
    ]);

    if (VALID_LANGS.has(urlLang) && !CANONICAL_LOCALES.has(locale)) {
      // Non-canonical locale (pt-br, en-gb, fr-ca, etc.) or invalid combo -> redirect to canonical
      const canonicalLang = urlLang === 'ch' ? 'zh' : urlLang;
      const defaultCountry = LANG_TO_DEFAULT_COUNTRY[urlLang] || urlLang;
      const correctLocale = `${canonicalLang}-${defaultCountry}`;
      const redirectUrl = `${url.origin}/${correctLocale}${restPath}${url.search}`;
      console.log(`[WORKER] Locale canonicalization: ${pathname} -> /${correctLocale}${restPath}`);
      return new Response(null, {
        status: 301,
        headers: { 'Location': redirectUrl, 'X-Worker-Active': 'true', 'Cache-Control': 'public, max-age=31536000' },
      });
    }

    // Check if slug in URL matches a DIFFERENT language than the locale
    // e.g., /ar-sa/centr-pomoshi/... (Russian slug under Arabic locale)
    // Covers: help-center routes, FAQ routes (both romanized and Unicode)
    const SLUG_TO_LANG = {
      // Help Center slugs
      'centre-aide': 'fr', 'help-center': 'en', 'centro-ayuda': 'es',
      'hilfezentrum': 'de', 'hilfe-center': 'de', 'tsentr-pomoshchi': 'ru', 'centr-pomoshi': 'ru',
      'centro-ajuda': 'pt', 'bangzhu-zhongxin': 'zh', 'sahayata-kendra': 'hi',
      '\u0645\u0631\u0643\u0632-\u0627\u0644\u0645\u0633\u0627\u0639\u062F\u0629': 'ar', // مركز-المساعدة
      'markaz-almusaeada': 'ar', // romanized Arabic help center
      // FAQ slugs
      'faq': null, // multi-lang, skip
      'changjian-wenti': 'zh', 'preguntas-frecuentes': 'es',
      'perguntas-frequentes': 'pt', 'voprosy-otvety': 'ru',
      'aksar-puche-jaane-wale-sawal': 'hi',
      'al-asila-al-shaiya': 'ar', // Arabic FAQ (romanized)
      '\u0627\u0644\u0623\u0633\u0626\u0644\u0629-\u0627\u0644\u0634\u0627\u0626\u0639\u0629': 'ar', // الأسئلة-الشائعة (Arabic native)
    };

    // Provider role slug prefixes (e.g., "anwalt-ee" starts with "anwalt" → German)
    // Used to detect cross-locale profile URLs like /es-es/anwalt-ee/burak-xz4uk7
    const ROLE_PREFIX_TO_LANG = {
      // Lawyer role translations (9 supported languages)
      'avocat': 'fr', 'lawyer': 'en', 'abogado': 'es', 'anwalt': 'de',
      'advogado': 'pt', 'advokat': 'ru', 'lushi': 'zh', 'vakil': 'hi',
      // Arabic lawyer (محام) — handled via Unicode below
      '\u0645\u062D\u0627\u0645': 'ar',
      // Arabic romanized lawyer variants (for profile URLs like /muhami-gf/name)
      'muhami': 'ar',
      // Plural lawyer forms (for compound listing URLs like /advogados-romenia, /anwaelte-malta)
      'avocats': 'fr', 'lawyers': 'en', 'abogados': 'es', 'anwaelte': 'de',
      'advogados': 'pt', 'advokaty': 'ru',
      'muhamun': 'ar', // Arabic plural lawyers
      // Expat role translations (singular + plural)
      'expatrie': 'fr', 'expat': null, // 'expat' used by multiple langs, skip
      'expatriado': null, // used by both es and pt, skip
      'wafid': 'ar', // Arabic expat (وافد)
    };

    if (restPath) {
      let firstSlug;
      try {
        firstSlug = decodeURIComponent(restPath.split('/').filter(Boolean)[0] || '');
      } catch (_e) {
        firstSlug = restPath.split('/').filter(Boolean)[0];
      }

      // FAQ SPA (Firestore) et Q/R Blog (Laravel) sont deux systèmes distincts :
      // - /faq, /preguntas-frecuentes, etc. → SPA React (Firestore app_faq) — footer FAQ
      // - /vie-a-letranger, /living-abroad, etc. → Blog Laravel (PostgreSQL qa_entries) — contenu éditorial
      // Aucune redirection entre les deux.

      // 1. Exact match on route slugs (help center, FAQ)
      if (firstSlug && SLUG_TO_LANG[firstSlug] !== undefined) {
        const slugLang = SLUG_TO_LANG[firstSlug];
        if (slugLang && slugLang !== urlLang) {
          // Slug belongs to a different language -> redirect to correct locale
          const correctCountry = LANG_TO_DEFAULT_COUNTRY[slugLang] || slugLang;
          const redirectUrl = `${url.origin}/${slugLang}-${correctCountry}${restPath}${url.search}`;
          console.log(`[WORKER] Cross-lang slug redirect: ${pathname} -> /${slugLang}-${correctCountry}${restPath}`);
          return new Response(null, {
            status: 301,
            headers: { 'Location': redirectUrl, 'X-Worker-Active': 'true' },
          });
        }
      }

      // 2. Canonicalize help center alias slugs (same language, non-canonical slug)
      // e.g., /ru-ru/centr-pomoshi/... → /ru-ru/tsentr-pomoshchi/...
      // e.g., /ar-sa/markaz-almusaeada/... → /ar-sa/مركز-المساعدة/...
      const HELP_CENTER_ALIASES = {
        'centr-pomoshi': 'tsentr-pomoshchi',           // Russian alias → canonical
        'markaz-almusaeada': '\u0645\u0631\u0643\u0632-\u0627\u0644\u0645\u0633\u0627\u0639\u062F\u0629',  // Arabic romanized → native مركز-المساعدة
        'hilfe-center': 'hilfezentrum',                 // German alias → canonical (GSC had hilfe-center)
      };
      if (firstSlug && HELP_CENTER_ALIASES[firstSlug]) {
        const canonicalSlug = HELP_CENTER_ALIASES[firstSlug];
        const segments = restPath.split('/').filter(Boolean);
        segments[0] = canonicalSlug;
        const newRestPath = '/' + segments.join('/');
        const redirectUrl = `${url.origin}/${urlLang}-${urlCountry}${newRestPath}${url.search}`;
        console.log(`[WORKER] Help center alias redirect: ${pathname} -> ${urlLang}-${urlCountry}${newRestPath}`);
        return new Response(null, {
          status: 301,
          headers: { 'Location': redirectUrl, 'X-Worker-Active': 'true', 'Cache-Control': 'public, max-age=31536000' },
        });
      }

      // 2b. Legacy route slug aliases → canonical slugs
      // Old slugs that were renamed but Google still has indexed
      const LEGACY_SLUG_ALIASES = {
        'lvshi': 'lushi',                     // Old ZH lawyers listing → canonical
        'aapatkaleen-call': 'aapatkaalin-call', // Old HI emergency call → canonical
        'diretorio': 'diretorio-expat',       // Old PT annuaire (truncated) → canonical
        'dalil': 'dalil-expat',               // Old AR annuaire (truncated) → canonical
        'spravochnik': 'spravochnik-expat',   // Old RU annuaire (truncated) → canonical
        'nirdeshika': 'nirdeshika-expat',     // Old HI annuaire (truncated) → canonical
        'minglu': 'zhinan-expat',             // Old ZH annuaire (wrong slug) → canonical
        'directory': 'expat-directory',       // Old EN annuaire (truncated) → canonical
        'terms_affiliate': 'terms-affiliate', // Underscore → hyphen
        'terms_expats': 'terms-expats',       // Underscore → hyphen
        'terms_lawyers': 'terms-lawyers',     // Underscore → hyphen
        'haeufige-fragen': 'faq',             // Old DE FAQ slug → canonical
        'voprosy': 'voprosy-otvety',           // Old RU FAQ slug (truncated) → canonical
      };
      if (firstSlug && LEGACY_SLUG_ALIASES[firstSlug]) {
        const canonicalSlug = LEGACY_SLUG_ALIASES[firstSlug];
        const segments = restPath.split('/').filter(Boolean);
        segments[0] = canonicalSlug;
        const newRestPath = '/' + segments.join('/');
        const redirectUrl = `${url.origin}/${urlLang}-${urlCountry}${newRestPath}${url.search}`;
        console.log(`[WORKER] Legacy slug alias redirect: ${pathname} -> ${urlLang}-${urlCountry}${newRestPath}`);
        return new Response(null, {
          status: 301,
          headers: { 'Location': redirectUrl, 'X-Worker-Active': 'true', 'Cache-Control': 'public, max-age=31536000' },
        });
      }

      // 3. Detect article slugs with wrong language prefix
      // e.g., /fr-fr/faq/ch-what-is-sos-expat → Chinese article under French locale
      // e.g., /de-de/hilfezentrum/ch-how-sos-expat-works → Chinese article under German locale
      const pathSegments = restPath.split('/').filter(Boolean);
      if (pathSegments.length >= 2) {
        const articleSlug = pathSegments[1];
        // Detect language prefix pattern: 2-letter lang code followed by dash
        const articleLangMatch = articleSlug.match(/^(fr|en|es|de|ru|pt|ch|hi|ar)-(.+)/);
        if (articleLangMatch) {
          const articleLang = articleLangMatch[1];
          const canonicalArticleLang = articleLang === 'ch' ? 'zh' : articleLang;
          // Only redirect if article language doesn't match URL language
          // Also handle zh vs ch mismatch
          const effectiveUrlLang = urlLang === 'zh' ? 'zh' : urlLang;
          const effectiveArticleLang = articleLang === 'ch' ? 'zh' : articleLang;
          if (effectiveArticleLang !== effectiveUrlLang) {
            const correctCountry = LANG_TO_DEFAULT_COUNTRY[articleLang] || canonicalArticleLang;
            // Translate the help center slug to the article's language
            const HELP_CENTER_TRANSLATIONS = {
              fr: 'centre-aide', en: 'help-center', es: 'centro-ayuda',
              de: 'hilfezentrum', ru: 'tsentr-pomoshchi', pt: 'centro-ajuda',
              zh: 'bangzhu-zhongxin', ch: 'bangzhu-zhongxin', hi: 'sahayata-kendra',
              ar: '\u0645\u0631\u0643\u0632-\u0627\u0644\u0645\u0633\u0627\u0639\u062F\u0629',
            };
            const FAQ_TRANSLATIONS = {
              fr: 'faq', en: 'faq', es: 'preguntas-frecuentes',
              de: 'faq', ru: 'voprosy-otvety', pt: 'perguntas-frequentes',
              zh: 'changjian-wenti', ch: 'changjian-wenti', hi: 'aksar-puche-jaane-wale-sawal',
              ar: '\u0627\u0644\u0623\u0633\u0626\u0644\u0629-\u0627\u0644\u0634\u0627\u0626\u0639\u0629',
            };
            // Determine the correct section slug for the target language
            const isHelpCenter = SLUG_TO_LANG[firstSlug] !== undefined && firstSlug !== 'faq';
            const isFaq = firstSlug === 'faq' || firstSlug === 'al-asila-al-shaiya' || (SLUG_TO_LANG[firstSlug] === undefined && /faq|preguntas|perguntas|voprosy|changjian|aksar-puche/i.test(firstSlug));
            let correctSectionSlug = firstSlug;
            if (isHelpCenter) {
              correctSectionSlug = HELP_CENTER_TRANSLATIONS[articleLang] || firstSlug;
            } else if (isFaq) {
              correctSectionSlug = FAQ_TRANSLATIONS[articleLang] || firstSlug;
            }
            const redirectUrl = `${url.origin}/${canonicalArticleLang}-${correctCountry}/${correctSectionSlug}/${articleSlug}${url.search}`;
            console.log(`[WORKER] Cross-lang article redirect: ${pathname} -> /${canonicalArticleLang}-${correctCountry}/${correctSectionSlug}/${articleSlug}`);
            return new Response(null, {
              status: 301,
              headers: { 'Location': redirectUrl, 'X-Worker-Active': 'true', 'Cache-Control': 'public, max-age=31536000' },
            });
          }
        }
      }

      // 4. Prefix match on provider role slugs (e.g., "anwalt-ee" starts with "anwalt")
      // Profile URLs: /{locale}/{role-country}/{name-id} → first segment is role-country
      if (firstSlug) {
        for (const [prefix, prefixLang] of Object.entries(ROLE_PREFIX_TO_LANG)) {
          if (prefixLang && firstSlug.startsWith(prefix + '-') && prefixLang !== urlLang) {
            const correctCountry = LANG_TO_DEFAULT_COUNTRY[prefixLang] || prefixLang;
            const redirectUrl = `${url.origin}/${prefixLang}-${correctCountry}${restPath}${url.search}`;
            console.log(`[WORKER] Cross-lang role redirect: ${pathname} -> /${prefixLang}-${correctCountry}${restPath}`);
            return new Response(null, {
              status: 301,
              headers: { 'Location': redirectUrl, 'X-Worker-Active': 'true' },
            });
          }
        }

        // 5. Normalize accented characters in provider country slugs
        // e.g., /de-de/anwalt-thaïlande/... → /de-de/anwalt-thailande/...
        const normalizedSlug = firstSlug.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (normalizedSlug !== firstSlug) {
          const segments = restPath.split('/').filter(Boolean);
          segments[0] = normalizedSlug;
          const newRestPath = '/' + segments.join('/');
          const redirectUrl = `${url.origin}/${urlLang}-${urlCountry}${newRestPath}${url.search}`;
          console.log(`[WORKER] Accent normalization redirect: ${pathname} -> ${urlLang}-${urlCountry}${newRestPath}`);
          return new Response(null, {
            status: 301,
            headers: { 'Location': redirectUrl, 'X-Worker-Active': 'true', 'Cache-Control': 'public, max-age=31536000' },
          });
        }

        // 6. Legacy Arabic Unicode slugs → ASCII romanized equivalents
        // Old routes used Arabic script (محامون, مغتربون, etc.); now all slugs are ASCII.
        // Google still has these indexed — redirect to current ASCII versions.
        const ARABIC_UNICODE_TO_ASCII = {
          '\u0645\u062D\u0627\u0645\u0648\u0646': 'muhamun',                       // محامون → lawyers-country
          '\u0645\u063A\u062A\u0631\u0628\u0648\u0646': 'mughtaribun',              // مغتربون → expats-country
          '\u0645\u0642\u062F\u0645\u064A-\u0627\u0644\u062E\u062F\u0645\u0627\u062A': 'muqadimi-al-khidmat', // مقدمي-الخدمات → providers
          '\u0634\u0631\u0648\u0637-\u0627\u0644\u0645\u063A\u062A\u0631\u0628\u064A\u0646': 'shurut-al-mugtaribin', // شروط-المغتربين → terms-expats
          '\u0634\u0631\u0648\u0637-\u0627\u0644\u0639\u0645\u0644\u0627\u0621': 'shurut-al-umala',       // شروط-العملاء → terms-clients
          '\u0634\u0631\u0648\u0637-\u0627\u0644\u0645\u062D\u0627\u0645\u064A\u0646': 'shurut-al-muhamin', // شروط-المحامين → terms-lawyers
          '\u0627\u0644\u0623\u0633\u0639\u0627\u0631': 'al-asaar',                 // الأسعار → pricing
          '\u0643\u064A\u0641-\u064A\u0639\u0645\u0644': 'kayfa-yamal',             // كيف-يعمل → how-it-works
          '\u0627\u062A\u0635\u0644-\u0628\u0646\u0627': 'ittasil-bina',            // اتصل-بنا → contact
          '\u0627\u0644\u0634\u0647\u0627\u062F\u0627\u062A': 'al-shahdat',         // الشهادات → testimonials
          '\u0627\u0644\u062A\u0633\u062C\u064A\u0644': 'al-tasjil',               // التسجيل → register
          '\u0643\u0646-\u0642\u0627\u0626\u062F\u0627': 'kun-qaidan',               // كن-قائدا → become-captain
          '\u0645\u0643\u0627\u0644\u0645\u0629-\u0637\u0648\u0627\u0631\u0626': 'mukalama-tawariy', // مكالمة-طوارئ → emergency-call
          '\u0643\u0646-\u0645\u0633\u0624\u0648\u0644-\u0645\u062C\u0645\u0648\u0639\u0629': 'kun-masul-majmuaa', // كن-مسؤول-مجموعة → become-group-admin
          '\u0645\u062F\u0648\u0646\u0627\u062A\u0646\u0627': 'mudawwanatuna',           // مدوناتنا → our-bloggers
          '\u062A\u0633\u062C\u064A\u0644': 'al-tasjil',                                 // تسجيل (without ال) → register
          '\u0645\u063A\u062A\u0631\u0628': 'mugtarib',                                   // مغترب → expat (register sub-path)
          '\u0645\u0624\u062B\u0631\u0648\u0646\u0627': 'muathiruna',                    // مؤثرونا → our-influencers
          '\u0643\u0646-\u0645\u0624\u062B\u0631\u0627': 'kun-muathiran',                // كن-مؤثرا → become-influencer
          '\u0643\u0646-\u0645\u0633\u0648\u0642\u0627': 'kun-musawwiqan',               // كن-مسوقا → become-chatter
          '\u0633\u064A\u0627\u0633\u0629-\u0627\u0644\u062E\u0635\u0648\u0635\u064A\u0629': 'siyasat-al-khususiya', // سياسة-الخصوصية → privacy-policy
          '\u0627\u0644\u062F\u0646\u0645\u0627\u0631\u0643': 'ad-danimark',             // الدنمارك → Denmark (country)
          '\u0627\u0644\u0643\u0627\u0645\u064A\u0631\u0648\u0646': 'al-kamirun',        // الكاميرون → Cameroon (country)
        };
        const decodedFirstSlug = (() => { try { return decodeURIComponent(firstSlug); } catch (_e) { return firstSlug; } })();
        if (ARABIC_UNICODE_TO_ASCII[decodedFirstSlug]) {
          const asciiSlug = ARABIC_UNICODE_TO_ASCII[decodedFirstSlug];
          const segments = restPath.split('/').filter(Boolean);
          segments[0] = asciiSlug;
          const newRestPath = '/' + segments.join('/');
          const redirectUrl = `${url.origin}/${urlLang}-${urlCountry}${newRestPath}${url.search}`;
          console.log(`[WORKER] Arabic Unicode→ASCII redirect: ${pathname} -> ${urlLang}-${urlCountry}${newRestPath}`);
          return new Response(null, {
            status: 301,
            headers: { 'Location': redirectUrl, 'X-Worker-Active': 'true', 'Cache-Control': 'public, max-age=31536000' },
          });
        }
      }
    }

    // =========================================================================
    // 8. GENERIC CROSS-LANGUAGE SLUG REDIRECT
    // Detects when a public route slug belongs to a different language than the
    // URL locale and redirects to the correct translated slug.
    // e.g., /fr-fr/testimonials → /fr-fr/temoignages (EN slug under FR locale)
    //        /de-de/sos-appel → /de-de/notruf (FR slug under DE locale)
    // =========================================================================
    const ROUTE_LANG_SLUGS = {
      'sos-call':       { fr:'sos-appel', en:'emergency-call', es:'llamada-emergencia', de:'notruf', ru:'ekstrenniy-zvonok', pt:'chamada-emergencia', zh:'jinji-dianhua', hi:'aapatkaalin-call', ar:'mukalama-tawariy' },
      'expat-call':     { fr:'appel-expatrie', en:'expat-call', es:'llamada-expatriado', de:'expatriate-anruf', ru:'zvonok-expatriantu', pt:'chamada-expatriado', zh:'waipai-dianhua', hi:'pravasi-call', ar:'mukalama-al-mugtarib' },
      'pricing':        { fr:'tarifs', en:'pricing', es:'precios', de:'preise', ru:'tseny', pt:'precos', zh:'jiage', hi:'mulya', ar:'al-asaar' },
      'contact':        { fr:'contact', en:'contact', es:'contacto', de:'kontakt', ru:'kontakt', pt:'contato', zh:'lianxi', hi:'sampark', ar:'ittasil-bina' },
      'how-it-works':   { fr:'comment-ca-marche', en:'how-it-works', es:'como-funciona', de:'wie-es-funktioniert', ru:'kak-eto-rabotaet', pt:'como-funciona', zh:'ruhe-yunzuo', hi:'kaise-kaam-karta-hai', ar:'kayfa-yamal' },
      'testimonials':   { fr:'temoignages', en:'testimonials', es:'testimonios', de:'testimonials', ru:'otzyvy', pt:'depoimentos', zh:'yonghu-pingjia', hi:'prashansapatra', ar:'al-shahdat' },
      'login':          { fr:'connexion', en:'login', es:'iniciar-sesion', de:'anmeldung', ru:'vkhod', pt:'entrar', zh:'denglu', hi:'login', ar:'tasjil-al-dakhul' },
      'register':       { fr:'inscription', en:'register', es:'registro', de:'registrierung', ru:'registratsiya', pt:'cadastro', zh:'zhuce', hi:'panjikaran', ar:'al-tasjil' },
      'password-reset': { fr:'reinitialisation-mot-de-passe', en:'password-reset', es:'restablecer-contrasena', de:'passwort-zurucksetzen', ru:'sbros-parolya', pt:'redefinir-senha', zh:'chongzhi-mima', hi:'password-reset', ar:'iadat-tayin-kalimat-al-murur' },
      'privacy-policy': { fr:'politique-confidentialite', en:'privacy-policy', es:'politica-privacidad', de:'datenschutzrichtlinie', ru:'politika-konfidentsialnosti', pt:'politica-privacidade', zh:'yinsi-zhengce', hi:'gopaniyata-niti', ar:'siyasat-al-khususiya' },
      'providers':      { fr:'prestataires', en:'providers', es:'proveedores', de:'anbieter', ru:'postavshchiki', pt:'prestadores', zh:'fuwu-tigongzhe', hi:'seva-pradaata', ar:'muqadimi-al-khidmat' },
      'faq':            { fr:'faq', en:'faq', es:'preguntas-frecuentes', de:'faq', ru:'voprosy-otvety', pt:'perguntas-frequentes', zh:'changjian-wenti', hi:'aksar-puche-jaane-wale-sawal', ar:'al-asila-al-shaiya' },
      'help-center':    { fr:'centre-aide', en:'help-center', es:'centro-ayuda', de:'hilfezentrum', ru:'tsentr-pomoshchi', pt:'centro-ajuda', zh:'bangzhu-zhongxin', hi:'sahayata-kendra', ar:'markaz-almosaada' },
      'annuaire':       { fr:'annuaire', en:'expat-directory', es:'directorio-expat', de:'expat-verzeichnis', ru:'spravochnik-expat', pt:'diretorio-expat', zh:'zhinan-expat', hi:'nirdeshika-expat', ar:'dalil-expat' },
      'consumers':      { fr:'consommateurs', en:'consumers', es:'consumidores', de:'verbraucher', ru:'potrebiteli', pt:'consumidores', zh:'xiaofeizhe', hi:'upbhokta', ar:'al-mustahlikin' },
      'service-status': { fr:'statut-service', en:'service-status', es:'estado-servicio', de:'dienststatus', ru:'status-servisa', pt:'status-servico', zh:'fuwu-zhuangtai', hi:'seva-sthiti', ar:'halat-al-khidma' },
      'cookies':        { fr:'cookies', en:'cookies', es:'cookies', de:'cookies', ru:'cookies', pt:'cookies', zh:'cookies', hi:'cookies', ar:'milafat-al-tarif' },
      'seo':            { fr:'referencement', en:'seo', es:'seo', de:'seo', ru:'seo', pt:'seo', zh:'seo', hi:'seo', ar:'tahsin-muharrikat-al-bahth' },
      'terms-clients':  { fr:'cgu-clients', en:'terms-clients', es:'terminos-clientes', de:'agb-kunden', ru:'usloviya-klienty', pt:'termos-clientes', zh:'tiaokuan-kehu', hi:'shartein-grahak', ar:'shurut-al-umala' },
      'terms-lawyers':  { fr:'cgu-avocats', en:'terms-lawyers', es:'terminos-abogados', de:'agb-anwaelte', ru:'usloviya-advokaty', pt:'termos-advogados', zh:'tiaokuan-lushi', hi:'shartein-vakil', ar:'shurut-al-muhamin' },
      'terms-expats':   { fr:'cgu-expatries', en:'terms-expats', es:'terminos-expatriados', de:'agb-expatriates', ru:'usloviya-expatrianty', pt:'termos-expatriados', zh:'tiaokuan-waipai', hi:'shartein-pravasi', ar:'shurut-al-mugtaribin' },
      'terms-chatters': { fr:'cgu-chatters', en:'terms-chatters', es:'terminos-chatters', de:'agb-chatters', ru:'usloviya-chattery', pt:'termos-chatters', zh:'tiaokuan-chatters', hi:'shartein-chatters', ar:'shurut-al-murwajin' },
      'terms-affiliate':{ fr:'cgu-affiliation', en:'terms-affiliate', es:'terminos-afiliacion', de:'agb-partnerprogramm', ru:'usloviya-partnerstva', pt:'termos-afiliacao', zh:'tiaokuan-lianmeng', hi:'shartein-affiliate', ar:'shurut-al-shiraka' },
      'terms-influencers':  { fr:'cgu-influenceurs', en:'terms-influencers', es:'terminos-influencers', de:'agb-influencer', ru:'usloviya-influensery', pt:'termos-influenciadores', zh:'tiaokuan-wanghong', hi:'shartein-influencers', ar:'shurut-al-muathirin' },
      'terms-bloggers':     { fr:'cgu-bloggeurs', en:'terms-bloggers', es:'terminos-bloggers', de:'agb-blogger', ru:'usloviya-blogery', pt:'termos-bloggers', zh:'tiaokuan-boke', hi:'shartein-bloggers', ar:'shurut-al-mudawwinin' },
      'terms-group-admins': { fr:'cgu-admins-groupe', en:'terms-group-admins', es:'terminos-admins-grupo', de:'agb-gruppenadmins', ru:'usloviya-adminy-grupp', pt:'termos-admins-grupo', zh:'tiaokuan-qunguanli', hi:'shartein-group-admins', ar:'shurut-mushrifi-al-majmuaat' },
      'chatter-landing':    { fr:'devenir-chatter', en:'become-chatter', es:'ser-chatter', de:'chatter-werden', ru:'stat-chatterom', pt:'tornar-se-chatter', zh:'chengwei-chatter', hi:'chatter-bane', ar:'kun-musawwiqan' },
      'influencer-landing': { fr:'devenir-influenceur', en:'become-influencer', es:'convertirse-influencer', de:'influencer-werden', ru:'stat-influenserom', pt:'tornar-se-influencer', zh:'chengwei-wanghong', hi:'influencer-bane', ar:'kun-muathiran' },
      'blogger-landing':    { fr:'devenir-blogger', en:'become-blogger', es:'convertirse-blogger', de:'blogger-werden', ru:'stat-blogerom', pt:'tornar-se-blogger', zh:'chengwei-boke', hi:'blogger-bane', ar:'kun-mudawwinan' },
      'groupadmin-landing': { fr:'devenir-admin-groupe', en:'become-group-admin', es:'convertirse-admin-grupo', de:'gruppenadmin-werden', ru:'stat-admin-gruppy', pt:'tornar-se-admin-grupo', zh:'chengwei-qunzhu', hi:'group-admin-bane', ar:'kun-masul-majmuaa' },
      'captain-landing':    { fr:'devenir-capitaine', en:'become-captain', es:'convertirse-capitan', de:'kapitan-werden', ru:'stat-kapitanom', pt:'tornar-se-capitao', zh:'chengwei-duizhang', hi:'captain-bane', ar:'kun-qaidan' },
      'partner-landing':    { fr:'devenir-partenaire', en:'become-partner', es:'ser-socio', de:'partner-werden', ru:'stat-partnerom', pt:'tornar-se-parceiro', zh:'chengwei-hezuohuoban', hi:'partner-bane', ar:'ken-sharikan' },
      'partners-page':      { fr:'partenaires', en:'partners', es:'socios', de:'partner', ru:'partnery', pt:'parceiros', zh:'hezuohuoban', hi:'bhagidar', ar:'al-shuraka' },
      'group-community':    { fr:'groupes-communaute', en:'community-groups', es:'grupos-comunidad', de:'gemeinschaftsgruppen', ru:'soobshchestvo-gruppy', pt:'grupos-comunidade', zh:'shequ-qunzu', hi:'samudayik-samuh', ar:'majmuaat-al-mujtamaa' },
      'influencer-dir':     { fr:'nos-influenceurs', en:'our-influencers', es:'nuestros-influencers', de:'unsere-influencer', ru:'nashi-influensery', pt:'nossos-influencers', zh:'women-influencers', hi:'hamare-influencer', ar:'muathiruna' },
      'blogger-dir':        { fr:'nos-blogueurs', en:'our-bloggers', es:'nuestros-bloggers', de:'unsere-blogger', ru:'nashi-blogery', pt:'nossos-bloggers', zh:'women-de-boke', hi:'hamare-blogger', ar:'mudawwanatuna' },
      'chatter-dir':        { fr:'nos-chatters', en:'our-chatters', es:'nuestros-chatters', de:'unsere-chatters', ru:'nashi-chattery', pt:'nossos-chatters', zh:'women-de-chatters', hi:'hamare-chatters', ar:'muhadithuna' },
      'press':              { fr:'presse', en:'press', es:'prensa', de:'presse', ru:'pressa', pt:'imprensa', zh:'xinwen', hi:'press', ar:'sahafa' },
      // SEO FIX: Gallery, Tools, Surveys, Lawyer-listing translations (fixes cross-locale GSC duplicates)
      'gallery':            { fr:'galerie', en:'gallery', es:'galeria', de:'bildergalerie', ru:'galereya', pt:'galeria', zh:'tuku', hi:'chitravali', ar:'maarad' },
      'tools':              { fr:'outils', en:'tools', es:'herramientas', de:'werkzeuge', ru:'instrumenty', pt:'ferramentas', zh:'gongju', hi:'upkaran', ar:'adawat' },
      'surveys':            { fr:'sondages', en:'surveys', es:'encuestas', de:'umfragen', ru:'oprosy', pt:'pesquisas', zh:'diaocha', hi:'sarvekshan', ar:'istiftaat' },
      'lawyer-listing':     { fr:'avocat', en:'lawyer', es:'abogado', de:'anwalt', ru:'advokat', pt:'advogado', zh:'lushi', hi:'vakil', ar:'muhamun' },
      // Plural forms (React canonical: lawyers-country, expats-country routes)
      'lawyers-country':    { fr:'avocats', en:'lawyers', es:'abogados', de:'anwaelte', ru:'advokaty', pt:'advogados', zh:'lushi', hi:'vakil', ar:'muhamun' },
      'expats-country':     { fr:'expatries', en:'expats', es:'expatriados', de:'expats', ru:'expaty', pt:'expatriados', zh:'haiwai', hi:'videshi', ar:'mughtaribun' },
    };

    // Build reverse map: slug → { langs: [languages that use this slug], route }
    // A slug like "testimonials" is used by both en+de, "contact" by fr+en, etc.
    // We only redirect when the URL's language is NOT among the slug's valid languages.
    const _slugToRoute = {};
    for (const [route, langs] of Object.entries(ROUTE_LANG_SLUGS)) {
      for (const [lang, slug] of Object.entries(langs)) {
        const seg = slug.split('/')[0]; // first segment only
        if (!_slugToRoute[seg]) {
          _slugToRoute[seg] = { langs: [lang], route };
        } else if (!_slugToRoute[seg].langs.includes(lang)) {
          _slugToRoute[seg].langs.push(lang);
        }
      }
    }

    // Manual additions: truncated/legacy slugs that also appear cross-language in GSC
    // These are NOT in ROUTE_LANG_SLUGS but must be detectable for redirect
    if (!_slugToRoute['verzeichnis']) _slugToRoute['verzeichnis'] = { langs: ['de'], route: 'annuaire' };
    if (!_slugToRoute['directorio']) _slugToRoute['directorio'] = { langs: ['es'], route: 'annuaire' };
    if (!_slugToRoute['muhamin']) _slugToRoute['muhamin'] = { langs: ['ar'], route: 'lawyer-listing' }; // legacy variant → canonical muhamun

    if (restPath) {
      let csFirstSlug;
      try { csFirstSlug = decodeURIComponent(restPath.split('/').filter(Boolean)[0] || ''); }
      catch (_e) { csFirstSlug = restPath.split('/').filter(Boolean)[0]; }

      if (csFirstSlug) {
        const match = _slugToRoute[csFirstSlug];
        const effectiveUrlLang = urlLang === 'zh' ? 'zh' : urlLang;
        if (match) {
          const routeSlugs = ROUTE_LANG_SLUGS[match.route];
          const correctSlug = routeSlugs[effectiveUrlLang] || routeSlugs['en'];
          // Redirect if: (a) slug belongs to a different language, OR
          // (b) same language but slug is a legacy/truncated variant of the canonical slug
          if (correctSlug && correctSlug.split('/')[0] !== csFirstSlug) {
            const segments = restPath.split('/').filter(Boolean);
            segments[0] = correctSlug.split('/')[0];
            const newRestPath = '/' + segments.join('/');
            const redirectUrl = `${url.origin}/${urlLang}-${urlCountry}${newRestPath}${url.search}`;
            console.log(`[WORKER] Cross-lang slug fix: ${pathname} -> /${urlLang}-${urlCountry}${newRestPath}`);
            return new Response(null, {
              status: 301,
              headers: { 'Location': redirectUrl, 'X-Worker-Active': 'true', 'Cache-Control': 'public, max-age=31536000' },
            });
          }
        }
      }
    }
  }

  // ==========================================================================
  // MALFORMED URL FIXES: Normalize common broken URL patterns from external links
  // e.g., /register-lawyer → /register/lawyer, /es-FR/fr/... → /es-es/...
  // ==========================================================================
  // Fix hyphenated routes that should use slashes (e.g., /pt/register-lawyer → /pt/register/lawyer)
  const HYPHEN_TO_SLASH_ROUTES = {
    'register-client': 'register/client',
    'register-lawyer': 'register/lawyer',
    'register-expat': 'register/expat',
    'inscription-client': 'inscription/client',
    'inscription-avocat': 'inscription/avocat',
    'inscription-expatrie': 'inscription/expatrie',
    'registro-abogado': 'registro/abogado',
    'registro-cliente': 'registro/cliente',
    'registro-expatriado': 'registro/expatriado',
  };
  // Match: /{locale-or-lang}/broken-slug or just /broken-slug
  const pathParts = pathname.replace(/\/$/, '').split('/').filter(Boolean);
  const lastSlug = pathParts[pathParts.length - 1];
  if (lastSlug && HYPHEN_TO_SLASH_ROUTES[lastSlug]) {
    const fixedSlug = HYPHEN_TO_SLASH_ROUTES[lastSlug];
    const prefix = pathParts.slice(0, -1).join('/');
    const fixedPath = prefix ? `/${prefix}/${fixedSlug}` : `/${fixedSlug}`;
    const redirectUrl = `${url.origin}${fixedPath}${url.search}`;
    console.log(`[WORKER] Malformed route fix: ${pathname} -> ${fixedPath}`);
    return new Response(null, {
      status: 301,
      headers: { 'Location': redirectUrl, 'X-Worker-Active': 'true', 'Cache-Control': 'public, max-age=31536000' },
    });
  }

  // Fix uppercase locale country codes (e.g., /es-FR/... → /es-fr/...)
  // Then the locale canonicalization above will handle the rest
  const uppercaseLocaleMatch = pathname.match(/^\/([a-z]{2})-([A-Z]{2})(\/.*)?$/);
  if (uppercaseLocaleMatch) {
    const fixedPath = `/${uppercaseLocaleMatch[1]}-${uppercaseLocaleMatch[2].toLowerCase()}${uppercaseLocaleMatch[3] || ''}`;
    const redirectUrl = `${url.origin}${fixedPath}${url.search}`;
    console.log(`[WORKER] Uppercase locale fix: ${pathname} -> ${fixedPath}`);
    return new Response(null, {
      status: 301,
      headers: { 'Location': redirectUrl, 'X-Worker-Active': 'true', 'Cache-Control': 'public, max-age=31536000' },
    });
  }

  // Fix double-locale paths (e.g., /es-FR/fr/avocat-thailande/... → strip extra locale segment)
  const doubleLocaleMatch = pathname.match(/^\/[a-z]{2}-[a-z]{2}\/([a-z]{2})\/(.*)/i);
  if (doubleLocaleMatch) {
    const innerLang = doubleLocaleMatch[1].toLowerCase();
    const LANG_MAP = { fr: 'fr', en: 'us', es: 'es', de: 'de', ru: 'ru', pt: 'pt', zh: 'cn', ch: 'cn', hi: 'in', ar: 'sa' };
    if (LANG_MAP[innerLang]) {
      const innerLocale = `${innerLang === 'ch' ? 'zh' : innerLang}-${LANG_MAP[innerLang]}`;
      const fixedPath = `/${innerLocale}/${doubleLocaleMatch[2]}`;
      const redirectUrl = `${url.origin}${fixedPath}${url.search}`;
      console.log(`[WORKER] Double-locale fix: ${pathname} -> ${fixedPath}`);
      return new Response(null, {
        status: 301,
        headers: { 'Location': redirectUrl, 'X-Worker-Active': 'true', 'Cache-Control': 'public, max-age=31536000' },
      });
    }
  }

  // ==========================================================================
  // LEGACY SHORT LOCALE REDIRECT: /fr/* → /fr-fr/*, /en/* → /en-us/*, etc.
  // Must be BEFORE SSR routing so bots get proper 301 (not SSR-rendered 200)
  // Also applies to humans for consistent URLs
  // ==========================================================================
  const LEGACY_LOCALE_MAP = {
    'fr': 'fr-fr', 'en': 'en-us', 'es': 'es-es', 'de': 'de-de',
    'ru': 'ru-ru', 'pt': 'pt-pt', 'ch': 'zh-cn', 'zh': 'zh-cn',
    'hi': 'hi-in', 'ar': 'ar-sa',
  };
  const legacyLocaleMatch = pathname.match(/^\/([a-z]{2})(\/.*)?$/);
  if (legacyLocaleMatch) {
    const shortLang = legacyLocaleMatch[1];
    const newLocale = LEGACY_LOCALE_MAP[shortLang];
    if (newLocale) {
      const restPath = legacyLocaleMatch[2] || '';
      const redirectUrl = `${url.origin}/${newLocale}${restPath}${url.search}`;
      console.log(`[WORKER] Legacy locale 301: ${pathname} -> /${newLocale}${restPath}`);
      return new Response(null, {
        status: 301,
        headers: {
          'Location': redirectUrl,
          'X-Worker-Active': 'true',
          'X-Worker-Redirect': 'legacy-locale',
          'Cache-Control': 'public, max-age=31536000',
        },
      });
    }
  }

  // ==========================================================================
  // NO-LOCALE PATH REDIRECT: /login → /fr-fr/connexion, /register → /fr-fr/inscription
  // Catches URLs without any locale prefix that Google discovered via old links.
  // Redirects to French canonical version (default language).
  // ==========================================================================
  // Generic catch-all: any public path without locale prefix → redirect to /fr-fr/{path}
  // This covers ALL current and future routes without maintaining a manual list.
  // Excludes: static assets, API paths, locale-prefixed paths, and root path.
  const cleanPath = pathname.replace(/\/$/, '') || '/';
  const isStaticAssetPath = /\.(js|css|png|jpg|jpeg|webp|svg|ico|gif|woff2?|ttf|json|xml|txt|map|wasm)$/i.test(pathname);
  const isSystemPath = /^\/(assets|api|_next|__\/auth|favicon|manifest|robots|sitemap|sw\.js|firebase-messaging|sitemaps|ref\/|rec\/|prov\/|multi-dashboard)/i.test(pathname);
  const hasLocalePrefix = /^\/[a-z]{2}(-[a-z]{2})?(\/|$)/i.test(pathname);
  const isRootPath = cleanPath === '/';

  if (!isStaticAssetPath && !isSystemPath && !hasLocalePrefix && !isRootPath) {
    // This is a public route without locale prefix (e.g., /login, /tarifs, /cgu-clients)
    // Redirect to /fr-fr/ + path (French is the default language)
    const redirectUrl = `${url.origin}/fr-fr${pathname}${url.search}`;
    console.log(`[WORKER] No-locale redirect: ${pathname} -> /fr-fr${pathname}`);
    return new Response(null, {
      status: 301,
      headers: {
        'Location': redirectUrl,
        'X-Worker-Active': 'true',
        'X-Worker-Redirect': 'no-locale',
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  }

  // ==========================================================================
  // Affiliate link OG rendering (lightweight — no Puppeteer)
  // Routes /ref/, /rec/, /prov/ paths to affiliateOgRender for social bots
  // ==========================================================================
  const botDetected = isBot(userAgent);

  if (botDetected && isAffiliatePath(pathname)) {
    const botName = getBotName(userAgent);
    console.log(`[SOS Expat Affiliate OG] Bot: ${botName}, Path: ${pathname}`);

    try {
      const ogUrl = new URL(AFFILIATE_OG_FUNCTION_URL);
      ogUrl.searchParams.set('path', pathname);
      ogUrl.searchParams.set('url', request.url);

      const ogResponse = await fetch(ogUrl.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': userAgent,
          'X-Bot-Name': botName,
          'Accept': 'text/html',
        },
      });

      const ogHeaders = new Headers(ogResponse.headers);
      ogHeaders.set('X-Rendered-By', 'affiliate-og-render');
      ogHeaders.set('X-Bot-Detected', botName);

      return new Response(ogResponse.body, {
        status: ogResponse.status,
        headers: ogHeaders,
      });
    } catch (error) {
      console.error(`[SOS Expat Affiliate OG] Error: ${error.message}`);
      // Fall through to SPA on error
    }
  }

  // Check if this is a bot AND visiting a page that needs prerendering
  const needsSSR = needsPrerendering(pathname);

  if (botDetected && needsSSR) {
    const botName = getBotName(userAgent);

    console.log(`[SOS Expat Bot Detection] Bot: ${botName}, Path: ${pathname}`);

    try {
      // Build the SSR URL with the original path
      const ssrUrl = new URL(SSR_FUNCTION_URL);
      ssrUrl.searchParams.set('path', pathname);
      ssrUrl.searchParams.set('url', request.url);
      ssrUrl.searchParams.set('bot', botName);

      // Fetch from the Cloud Function — redirect: 'manual' prevents following
      // redirects that loop back to sos-expat.com (SSR error handler does res.redirect(302, fullUrl))
      const ssrResponse = await fetch(ssrUrl.toString(), {
        method: 'GET',
        redirect: 'manual',
        headers: {
          'User-Agent': userAgent,
          'X-Original-URL': request.url,
          'X-Bot-Name': botName,
          'X-Forwarded-For': request.headers.get('CF-Connecting-IP') || '',
          'X-Forwarded-Proto': url.protocol.replace(':', ''),
          'X-Forwarded-Host': url.host,
          'Accept': 'text/html',
          'Accept-Language': request.headers.get('Accept-Language') || 'en',
        },
      });

      // If SSR returns a redirect (302) or 5xx, fall back to SPA
      // This prevents: 1) redirect loops (SSR error → 302 to same domain → Worker → SSR → loop)
      //                2) 5xx errors propagated to Google
      if (ssrResponse.status >= 300) {
        console.warn(`[WORKER] SSR returned ${ssrResponse.status} for ${pathname}, falling back to SPA`);
        const fallbackUrl = new URL(pathname, PAGES_ORIGIN);
        fallbackUrl.search = url.search;
        const spaResponse = await fetch(fallbackUrl.toString(), {
          method: request.method,
          headers: request.headers,
        });
        const spaHeaders = new Headers(spaResponse.headers);
        spaHeaders.set('X-SSR-Fallback', 'true');
        spaHeaders.set('X-SSR-Original-Status', String(ssrResponse.status));
        // SEO: Set Content-Language on fallback too (consistent with main SSR path)
        const fallbackLocaleMatch = pathname.match(/^\/([a-z]{2})-[a-z]{2}(\/|$)/);
        if (fallbackLocaleMatch) {
          spaHeaders.set('Content-Language', fallbackLocaleMatch[1]);
        }
        // SEO FIX: Add canonical Link header (prevents GSC "duplicate without canonical" warnings)
        spaHeaders.set('Link', `<https://sos-expat.com${pathname}>; rel="canonical"`);
        return new Response(spaResponse.body, {
          status: spaResponse.ok || spaResponse.status === 404 ? 200 : spaResponse.status,
          statusText: 'OK',
          headers: spaHeaders,
        });
      }

      // Clone the response and add custom headers
      const newHeaders = new Headers(ssrResponse.headers);
      newHeaders.set('X-Rendered-By', 'sos-expat-ssr');
      newHeaders.set('X-Bot-Detected', botName);

      // SEO FIX: Set Content-Language header based on URL locale.
      // This gives Google an additional signal about the page language,
      // reinforcing the hreflang and html lang attribute.
      const ssrLocaleMatch = pathname.match(/^\/([a-z]{2})-[a-z]{2}(\/|$)/);
      if (ssrLocaleMatch) {
        newHeaders.set('Content-Language', ssrLocaleMatch[1]);
      }

      // SEO FIX: Add canonical Link header (prevents GSC "duplicate without canonical" warnings)
      newHeaders.set('Link', `<https://sos-expat.com${pathname}>; rel="canonical"`);

      // Ensure proper caching headers for bots
      if (!newHeaders.has('Cache-Control')) {
        newHeaders.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
      }

      return new Response(ssrResponse.body, {
        status: ssrResponse.status,
        statusText: ssrResponse.statusText,
        headers: newHeaders,
      });

    } catch (error) {
      console.error(`[SOS Expat Bot Detection] Error fetching SSR: ${error.message}`);

      // On error, fall back to Cloudflare Pages origin
      const fallbackUrl = new URL(pathname, PAGES_ORIGIN);
      fallbackUrl.search = url.search;
      return fetch(fallbackUrl.toString(), {
        method: request.method,
        headers: request.headers,
      });
    }
  }

  // For non-bots or non-SSR pages, fetch from Cloudflare Pages origin
  // For SPA routes (non-assets), fetch the root index.html and serve with 200
  const isAsset = /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot|webp|json|xml|txt|webmanifest)$/i.test(pathname);

  let pagesUrl;
  if (isAsset) {
    // Static assets: fetch the exact path
    pagesUrl = new URL(pathname, PAGES_ORIGIN);
  } else {
    // SPA routes: fetch the actual pathname from Pages origin.
    // Pages serves index.html (with 404 status) for unknown paths — this is expected SPA behavior.
    // We previously fetched '/' but _redirects has '/ /fr-fr 301' which causes a redirect chain
    // ending in 404, triggering our fallback loading page instead of serving the app.
    pagesUrl = new URL(pathname, PAGES_ORIGIN);
  }
  pagesUrl.search = url.search; // Preserve query parameters

  try {
    const originResponse = await fetch(pagesUrl.toString(), {
      method: request.method,
      headers: request.headers,
      redirect: 'manual', // Don't follow redirects — pass 301s to client/bot for proper SEO
    });

    // If Pages returned a redirect (301/302 from _redirects), pass it through
    // This ensures bots (Googlebot) see the proper 301 redirect and update their index
    if (originResponse.status >= 300 && originResponse.status < 400) {
      const location = originResponse.headers.get('Location');
      if (location) {
        // Convert relative Location to absolute URL
        const absoluteLocation = location.startsWith('/')
          ? `${url.origin}${location}`
          : location;
        console.log(`[WORKER] Passing through ${originResponse.status} redirect: ${pathname} -> ${absoluteLocation}`);
        return new Response(null, {
          status: originResponse.status,
          headers: {
            'Location': absoluteLocation,
            'X-Worker-Active': 'true',
            'X-Worker-Redirect': 'from-pages',
            'Cache-Control': 'public, max-age=86400',
          },
        });
      }
    }

    const newHeaders = new Headers(originResponse.headers);
    newHeaders.set('X-Worker-Active', 'true');
    newHeaders.set('X-Worker-Bot-Detected', botDetected ? 'true' : 'false');
    newHeaders.set('X-Worker-SSR-Match', needsSSR ? 'true' : 'false');
    newHeaders.set('X-Worker-Path', pathname);

    // Ajouter des headers de cache agressifs pour les assets statiques (icônes, fonts, images)
    const isStaticAsset = /\.(png|jpg|jpeg|webp|svg|ico|woff2?|ttf|eot|css|js)$/i.test(pathname);
    if (isStaticAsset && originResponse.status === 200) {
      newHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
    }

    // COOP headers required for Firebase Auth popup (Google login)
    // Without these, the popup cannot communicate with the parent window
    newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    newHeaders.set('Cross-Origin-Embedder-Policy', 'unsafe-none');

    // For SPA routes: Cloudflare Pages serves index.html for unknown paths (SPA behavior).
    // Pages returns 200 for exact matches, or 404 with index.html body for SPA routes.
    // Both are valid — React Router handles client-side routing.
    // Only genuine server errors (500, 503) should trigger the fallback.
    if (!isAsset) {
      if (originResponse.ok || originResponse.status === 404) {
        // 404 from Pages = SPA route (index.html served as body) — this is normal
        return new Response(originResponse.body, {
          status: 200,
          statusText: 'OK',
          headers: newHeaders,
        });
      }
      // Genuine server error (500, 503, etc.) — serve retry fallback
      console.error(`[WORKER] Pages returned ${originResponse.status} for SPA route ${pathname}`);
      return new Response(
        '<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="3"><title>Loading...</title></head><body><p>Loading...</p></body></html>',
        {
          status: 200,
          headers: {
            'Content-Type': 'text/html;charset=UTF-8',
            'Cache-Control': 'no-cache, no-store',
            'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
            'Cross-Origin-Embedder-Policy': 'unsafe-none',
          },
        }
      );
    }

    return new Response(originResponse.body, {
      status: originResponse.status,
      statusText: originResponse.statusText,
      headers: newHeaders,
    });
  } catch (error) {
    console.error(`[WORKER] Origin fetch error for ${pathname}: ${error.message}`);
    // Fallback: return a minimal HTML page that will retry loading
    if (!isAsset) {
      return new Response(
        '<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="3"></head><body><p>Loading...</p></body></html>',
        {
          status: 503,
          headers: {
            'Content-Type': 'text/html;charset=UTF-8',
            'Retry-After': '3',
            'Cache-Control': 'no-cache, no-store',
          },
        }
      );
    }
    return new Response('Service temporarily unavailable', { status: 503, headers: { 'Retry-After': '3' } });
  }
}

// Export for Cloudflare Workers
export default {
  fetch: handleRequest,
};

// Also export for module workers format
addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request, {}, {}));
});
