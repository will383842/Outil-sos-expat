/**
 * =============================================================================
 * SCRIPT: G\u00e9n\u00e9ration de 35 Avocats Hommes Francophones
 * =============================================================================
 *
 * Contraintes respect\u00e9es :
 * - 35 profils d'avocats HOMMES uniquement
 * - Langue parl\u00e9e : Fran\u00e7ais uniquement
 * - P\u00e9riode d'inscription : 1er octobre - 30 d\u00e9cembre 2024
 * - Chaque profil a un pays d'intervention UNIQUE
 * - Diverses ethnicit\u00e9s (pr\u00e9noms/noms selon le pays)
 * - Pays de r\u00e9sidence = Pays d'intervention principal
 * - Peuvent avoir plusieurs pays d'intervention secondaires
 * - Apparaissent dans AdminAaaProfiles (isTestProfile: true)
 *
 * Usage: Importer et appeler generate35FrancophoneLawyers() depuis la console admin
 * ou cr\u00e9er un bouton dans AdminAaaProfiles.tsx
 */

import {
  collection, addDoc, setDoc, doc, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

// =============================================================================
// CONFIGURATION DES 35 PAYS FRANCOPHONES
// =============================================================================

interface FrancophoneCountry {
  name: string;           // Nom du pays en fran\u00e7ais
  code: string;           // Code ISO
  maleNames: string[];    // Pr\u00e9noms masculins typiques
  lastNames: string[];    // Noms de famille typiques
  cities: { city: string; lat: number; lng: number }[];
}

const FRANCOPHONE_COUNTRIES: FrancophoneCountry[] = [
  // Europe francophone
  {
    name: 'France',
    code: 'FR',
    maleNames: ['Jean', 'Pierre', 'Michel', 'Philippe', 'Thomas', 'Nicolas', 'Fran\u00e7ois', 'Laurent', '\u00c9ric', 'David', 'St\u00e9phane', 'Olivier', 'Christophe', 'Fr\u00e9d\u00e9ric', 'Patrick', 'Antoine', 'Julien', 'Alexandre', 'S\u00e9bastien', 'Vincent'],
    lastNames: ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'Roux', 'Vincent', 'Fournier', 'Morel', 'Girard'],
    cities: [{ city: 'Paris', lat: 48.8566, lng: 2.3522 }, { city: 'Lyon', lat: 45.7640, lng: 4.8357 }, { city: 'Marseille', lat: 43.2965, lng: 5.3698 }]
  },
  {
    name: 'Belgique',
    code: 'BE',
    maleNames: ['Luc', 'Marc', 'Philippe', 'Jean-Pierre', 'Thierry', 'Didier', 'Patrick', 'Christophe', 'Vincent', 'Beno\u00eet', 'Olivier', 'St\u00e9phane', 'Fr\u00e9d\u00e9ric', 'Pascal', 'Alain', 'Bernard', 'Xavier', 'Yves', 'Fran\u00e7ois', 'Laurent'],
    lastNames: ['Peeters', 'Janssen', 'Maes', 'Jacobs', 'Willems', 'Claes', 'Goossens', 'Wouters', 'De Smedt', 'Dubois', 'Lambert', 'Dupont', 'Martin', 'Simon', 'Laurent', 'Leroy', 'Renard', 'Leclercq', 'Lemaire', 'Adam'],
    cities: [{ city: 'Bruxelles', lat: 50.8503, lng: 4.3517 }, { city: 'Li\u00e8ge', lat: 50.6292, lng: 5.5797 }]
  },
  {
    name: 'Suisse',
    code: 'CH',
    maleNames: ['Jean', 'Pierre', 'Marc', 'Michel', 'Alain', 'Philippe', 'Claude', 'Andr\u00e9', 'Daniel', 'Jacques', 'Olivier', 'Thierry', 'Nicolas', 'Fr\u00e9d\u00e9ric', 'Pascal', 'Patrick', 'St\u00e9phane', 'Laurent', 'Christophe', 'Vincent'],
    lastNames: ['M\u00fcller', 'Schmid', 'Keller', 'Weber', 'Schneider', 'Meyer', 'Steiner', 'Fischer', 'Gerber', 'Brunner', 'Favre', 'Rochat', 'Blanc', 'Martin', 'Bonvin', 'Moret', 'Rey', 'Jacquier', 'Duc', 'Morand'],
    cities: [{ city: 'Gen\u00e8ve', lat: 46.2044, lng: 6.1432 }, { city: 'Lausanne', lat: 46.5197, lng: 6.6323 }]
  },
  {
    name: 'Canada',
    code: 'CA',
    maleNames: ['Jean', 'Pierre', 'Michel', 'Marc', 'Andr\u00e9', 'Jacques', 'Yves', 'Ren\u00e9', 'Claude', 'Louis', 'Fran\u00e7ois', 'Mathieu', '\u00c9tienne', 'S\u00e9bastien', 'Alexandre', 'Maxime', 'Guillaume', 'Vincent', 'Nicolas', 'Gabriel'],
    lastNames: ['Tremblay', 'Gagnon', 'Roy', 'C\u00f4t\u00e9', 'Bouchard', 'Gauthier', 'Morin', 'Lavoie', 'Fortin', 'Gagn\u00e9', 'Ouellet', 'Pelletier', 'B\u00e9langer', 'L\u00e9vesque', 'Bergeron', 'Leblanc', 'Paquette', 'Girard', 'Simard', 'Boucher'],
    cities: [{ city: 'Montr\u00e9al', lat: 45.5017, lng: -73.5673 }, { city: 'Qu\u00e9bec', lat: 46.8139, lng: -71.2080 }]
  },
  {
    name: 'Luxembourg',
    code: 'LU',
    maleNames: ['Jean', 'Marc', 'Pierre', 'Michel', 'Paul', 'Fernand', 'Claude', 'Ren\u00e9', 'Georges', 'Raymond', 'Andr\u00e9', 'Jacques', 'Alain', 'Luc', 'Thierry', 'Patrick', 'Philippe', 'Nicolas', 'David', 'S\u00e9bastien'],
    lastNames: ['Schmit', 'Weber', 'Muller', 'Hoffmann', 'Wagner', 'Klein', 'Mayer', 'Krier', 'Becker', 'Frank', 'Reuter', 'Schroeder', 'Meyer', 'Braun', 'Hansen', 'Faber', 'Kremer', 'Reding', 'Steffen', 'Thill'],
    cities: [{ city: 'Luxembourg', lat: 49.6116, lng: 6.1319 }]
  },
  {
    name: 'Monaco',
    code: 'MC',
    maleNames: ['Louis', 'Albert', 'Pierre', 'Jean', 'Antoine', 'Marc', 'Philippe', 'Charles', 'Fr\u00e9d\u00e9ric', 'Nicolas', 'Alexandre', 'Olivier', 'St\u00e9phane', 'Laurent', 'Christophe', 'Vincent', 'Guillaume', 'Maxime', 'Julien', 'Thomas'],
    lastNames: ['Palmaro', 'Grimaldi', 'Gastaud', 'Pastor', 'Ferrando', 'Biancheri', 'Marquet', 'Boisson', 'Crovetto', 'Médecin', 'Suffren', 'Lanteri', 'Notari', 'Robino', 'Sosso', 'Ravera', 'Croesi', 'Imperiali', 'Lorenzi', 'Monetti'],
    cities: [{ city: 'Monaco', lat: 43.7384, lng: 7.4246 }]
  },

  // Afrique de l'Ouest francophone
  {
    name: 'S\u00e9n\u00e9gal',
    code: 'SN',
    maleNames: ['Moussa', 'Ibrahima', 'Abdoulaye', 'Ousmane', 'Cheikh', 'Mamadou', 'Amadou', 'Issa', 'Aliou', 'Souleymane', 'Seydou', 'Modou', 'Lamine', 'Boubacar', 'Samba', 'Demba', 'Alioune', 'Babacar', 'Malick', 'Pape'],
    lastNames: ['Diop', 'Ba', 'Ndiaye', 'Traor\u00e9', 'Diallo', 'Kon\u00e9', 'Sy', 'Sarr', 'Ciss\u00e9', 'Camara', 'Fall', 'Sow', 'Diouf', 'Gueye', 'Kane', 'Tour\u00e9', 'Seck', 'Niang', 'Faye', 'Mbaye'],
    cities: [{ city: 'Dakar', lat: 14.6928, lng: -17.4467 }]
  },
  {
    name: "C\u00f4te d'Ivoire",
    code: 'CI',
    maleNames: ['Kouadio', 'Koffi', 'Yao', 'Aya', 'Kouam\u00e9', 'Konan', 'Aka', 'N\'Guessan', 'Brou', 'Kra', 'Adama', 'Ouattara', 'Mamadou', 'Ibrahim', 'Seydou', 'Issa', 'Lacina', 'Bakary', 'Souleymane', 'Siaka'],
    lastNames: ['Kon\u00e9', 'Traor\u00e9', 'Coulibaly', 'Ouattara', 'Diallo', 'Diaby', 'Soro', 'Tour\u00e9', 'Yao', 'Bamba', 'Konan', 'Kouassi', 'Kouam\u00e9', 'Koffi', 'Aka', 'N\'Guessan', 'Assa', 'Diabat\u00e9', 'Sangar\u00e9', 'Dosso'],
    cities: [{ city: 'Abidjan', lat: 5.3600, lng: -4.0083 }]
  },
  {
    name: 'Mali',
    code: 'ML',
    maleNames: ['Moussa', 'Amadou', 'Ibrahim', 'Mamadou', 'Boubacar', 'Seydou', 'Modibo', 'Oumar', 'Bakary', 'Lassana', 'Adama', 'Cheick', 'Souleymane', 'Youssouf', 'Abdoulaye', 'Samba', 'Kalifa', 'Mahamadou', 'Ousmane', 'Sidiki'],
    lastNames: ['Traor\u00e9', 'Coulibaly', 'Kon\u00e9', 'Diarra', 'Sangar\u00e9', 'Diallo', 'Keita', 'Tour\u00e9', 'Sissoko', 'Kamara', 'Diabat\u00e9', 'Sidib\u00e9', 'Ba', 'Ciss\u00e9', 'Doucour\u00e9', 'Konat\u00e9', 'Demb\u00e9l\u00e9', 'Bagayoko', 'Sylla', 'Diakite'],
    cities: [{ city: 'Bamako', lat: 12.6392, lng: -8.0029 }]
  },
  {
    name: 'Burkina Faso',
    code: 'BF',
    maleNames: ['Moussa', 'Ibrahim', 'Abdoulaye', 'Ousmane', 'Yacouba', 'Seydou', 'Amadou', 'Lassane', 'Issouf', 'Boubacar', 'Adama', 'Hamidou', 'Karim', 'Souleymane', 'Mahamadi', 'Salifou', 'Harouna', 'Boureima', 'Inoussa', 'Daouda'],
    lastNames: ['Ou\u00e9draogo', 'Traor\u00e9', 'Kou\u00e9ta', 'Kabor\u00e9', 'Sanon', 'Kon\u00e9', 'Compaor\u00e9', 'Sangar\u00e9', 'Sanou', 'Zoungrana', 'Ki\u00e9ma', 'Tour\u00e9', 'Bamogo', 'Kafando', 'Zida', 'Tapsoba', 'Da', 'Sow\u00e9', 'Zongo', 'Sidib\u00e9'],
    cities: [{ city: 'Ouagadougou', lat: 12.3714, lng: -1.5197 }]
  },
  {
    name: 'Niger',
    code: 'NE',
    maleNames: ['Moussa', 'Ibrahim', 'Amadou', 'Abdou', 'Mahamadou', 'Issa', 'Oumarou', 'Hamidou', 'Saidou', 'Boubacar', 'Ali', 'Adamou', 'Souleymane', 'Abdourahamane', 'Yacouba', 'Maman', 'Issoufou', 'Mamoudou', 'Harouna', 'Saley'],
    lastNames: ['Maman\u00e9', 'Abdou', 'Mamane', 'Maiga', 'Issoufou', 'Adamou', 'Garba', 'Boubacar', 'Ibrahim', 'Halidou', 'Djibo', 'Abdoulaye', 'Sani', 'Oumarou', 'Moussa', 'Habou', 'Arzika', 'Bako', 'Hamadou', 'Tandja'],
    cities: [{ city: 'Niamey', lat: 13.5116, lng: 2.1254 }]
  },
  {
    name: 'Cameroun',
    code: 'CM',
    maleNames: ['Jean', 'Pierre', 'Paul', 'Samuel', 'Emmanuel', 'Joseph', 'Francis', 'Michel', 'Andr\u00e9', 'Christophe', 'Gaston', 'Albert', 'Roger', 'Martin', 'Jacques', 'Louis', 'Daniel', 'Christian', 'Serge', 'Alain'],
    lastNames: ['Kamdem', 'Fotso', 'Tagne', 'Ngoumou', 'Mbarga', 'Essomba', 'Onana', 'Nlend', 'Tsafack', 'Tchamba', 'Feutchou', 'Djomo', 'Ndjock', 'Mveng', 'Bella', 'Makam', 'Ndongo', 'Ekambi', 'Fouda', 'Atangana'],
    cities: [{ city: 'Yaound\u00e9', lat: 3.8480, lng: 11.5021 }, { city: 'Douala', lat: 4.0511, lng: 9.7679 }]
  },
  {
    name: 'Madagascar',
    code: 'MG',
    maleNames: ['Jean', 'Hery', 'Andry', 'Rivo', 'Njaka', 'Faneva', 'Thierry', 'Ny Aina', 'Rija', 'Haja', 'Mamy', 'Tojo', 'Feno', 'Toky', 'Rado', 'Lova', 'Miandry', 'Naina', 'Aro', 'Holy'],
    lastNames: ['Rakotondrabe', 'Randrianarisoa', 'Rakotomalala', 'Andrianaivo', 'Razafindrabe', 'Rasolofo', 'Ratsimba', 'Ramanantsoa', 'Raveloson', 'Andriamihaja', 'Razafimaharo', 'Rakotonirina', 'Rajaonah', 'Rajaonarivelo', 'Randrianasolo', 'Rabemanantsoa', 'Rabesahala', 'Rakoto', 'Randria', 'Rabe'],
    cities: [{ city: 'Antananarivo', lat: -18.8792, lng: 47.5079 }]
  },
  {
    name: 'Congo',
    code: 'CG',
    maleNames: ['Jean', 'Pierre', 'Paul', 'Joseph', 'Emmanuel', 'Serge', 'Alain', 'Michel', 'Christian', 'Bernard', 'Guy', 'Roger', 'Andr\u00e9', 'Denis', 'Cl\u00e9ment', 'Florent', 'Ghislain', 'Parfait', 'Pr\u00e9cieux', 'Landry'],
    lastNames: ['Moukoko', 'Ngoma', 'Mbemba', 'Nkoua', 'Malonga', 'Moussounda', 'Mabiala', 'Nzounza', 'Loufoua', 'Mpassi', 'Bouanga', 'Mboungou', 'Nzassi', 'Bakala', 'Ngouloubi', 'Mboukou', 'Okouo', 'Louaka', 'Madzou', 'Ngoubili'],
    cities: [{ city: 'Brazzaville', lat: -4.2634, lng: 15.2429 }]
  },
  {
    name: 'RD Congo',
    code: 'CD',
    maleNames: ['Jean', 'Pierre', 'Joseph', 'Paul', 'Emmanuel', 'Patrick', 'Olivier', 'Christian', 'F\u00e9lix', 'Augustin', 'Th\u00e9ophile', 'Dieudonn\u00e9', 'Fid\u00e8le', 'Gloire', 'Jonathan', 'Blaise', 'Fabrice', 'Serge', 'Crispin', 'Papy'],
    lastNames: ['Mukendi', 'Kabongo', 'Mbuyi', 'Kasongo', 'Ilunga', 'Kyungu', 'Mulamba', 'Tshisekedi', 'Ngandu', 'Kalala', 'Mwamba', 'Kabila', 'Lumumba', 'Katanga', 'Bemba', 'Nsimba', 'Mutombo', 'Kongolo', 'Nzuzi', 'Mbaya'],
    cities: [{ city: 'Kinshasa', lat: -4.4419, lng: 15.2663 }]
  },
  {
    name: 'B\u00e9nin',
    code: 'BJ',
    maleNames: ['Jean', 'Pierre', 'Paul', 'Joseph', 'Michel', 'Andr\u00e9', 'Christophe', 'Patrice', 'Nic\u00e9phore', 'Lionel', 'Mathieu', 'L\u00e9once', 'Th\u00e9ophile', 'Honorat', 'Ignace', 'Lucien', 'Augustin', 'Bruno', 'Maxime', 'Barnab\u00e9'],
    lastNames: ['Houngbo', 'Akplogan', 'Soglo', 'Quenum', 'Ahouan', 'Gbaguidi', 'Dossou', 'Adanl\u00e9', 'Hodonou', 'Ahissou', 'Adomou', 'Topanou', 'Azannaou', 'Biaou', 'Djossou', 'Fadiga', 'Gnonlonfoun', 'Hounkanrin', 'Kiki', 'Lawani'],
    cities: [{ city: 'Porto-Novo', lat: 6.4969, lng: 2.6283 }, { city: 'Cotonou', lat: 6.3703, lng: 2.3912 }]
  },
  {
    name: 'Togo',
    code: 'TG',
    maleNames: ['Kofi', 'Kossi', 'Kodjo', 'Yaovi', 'Mensah', 'Foli', 'Edem', 'Akouavi', 'Kokouvi', 'Bawou', 'Jean', 'Pierre', 'Emmanuel', 'Gilbert', 'Firmin', 'Cl\u00e9ment', 'Sylvain', 'Florent', 'Gaston', 'Ren\u00e9'],
    lastNames: ['Gn\u00e9djah', 'Agbodjan', 'Amevor', 'Akolly', 'Assigb\u00e9', 'Dossey', 'Eyadema', 'Gnassimb\u00e9', 'Kodjo', 'Lawson', 'Mensah', 'Olympio', 'Santos', 'Soglo', 'Tamaklo\u00e9', 'Tossou', 'Woamey', 'Zinsou', 'Ayih', 'Adzakey'],
    cities: [{ city: 'Lom\u00e9', lat: 6.1725, lng: 1.2314 }]
  },
  {
    name: 'Gabon',
    code: 'GA',
    maleNames: ['Jean', 'Pierre', 'Paul', 'Michel', 'Ali', 'Omar', 'Andr\u00e9', 'Guy', 'L\u00e9on', 'Fran\u00e7ois', 'Sylvain', 'Cr\u00e9pin', 'Nicaise', 'Landry', 'Blaise', 'Armel', 'Brice', 'Ulrich', 'Steeve', 'Ren\u00e9'],
    lastNames: ['Bongo', 'Ndong', 'Ngoubou', 'Moussavou', 'Obame', 'Ondo', 'Mba', 'Oye', 'Ntoutoume', 'Myboto', 'Mboumba', 'Nzoughe', 'Assoumou', 'Bivigou', 'Engonga', 'Kombila', 'Maganga', 'Nziengui', 'Oyono', 'Reteno'],
    cities: [{ city: 'Libreville', lat: 0.4162, lng: 9.4673 }]
  },
  {
    name: 'Guin\u00e9e',
    code: 'GN',
    maleNames: ['Alpha', 'Mamadou', 'Ibrahima', 'Ousmane', 'Sekou', 'Amadou', 'Lancine', 'Facinet', 'Aboubacar', 'Cellou', 'Boubacar', 'Alseny', 'Elhadj', 'Fod\u00e9', 'Kabinet', 'Lamine', 'Mory', 'Naby', 'S\u00e9kou', 'Thierno'],
    lastNames: ['Diallo', 'Barry', 'Bah', 'Sow', 'Camara', 'Traor\u00e9', 'Cond\u00e9', 'Keita', 'Sylla', 'Toure', 'Bangoura', 'Diakite', 'Kaba', 'Kourouma', 'Sangar\u00e9', 'Souare', 'Bald\u00e9', 'Soumah', 'Youla', 'Kouyat\u00e9'],
    cities: [{ city: 'Conakry', lat: 9.6412, lng: -13.5784 }]
  },
  {
    name: 'Tchad',
    code: 'TD',
    maleNames: ['Mahamat', 'Idriss', 'Abdoulaye', 'Moussa', 'Hassan', 'Ali', 'Oumar', 'Ibrahim', 'Abakar', 'Djibrine', 'Adam', 'Haroun', 'Youssouf', 'Saleh', 'Ahmat', 'Brahim', 'Daoud', 'Hissein', 'Nour', 'Tahir'],
    lastNames: ['D\u00e9by', 'Mahamat', 'Idriss', 'Oumar', 'Hassan', 'Ali', 'Abakar', 'Adam', 'Saleh', 'Ahmat', 'Brahim', 'Daoud', 'Djibrine', 'Haroun', 'Hissein', 'Moussa', 'Nour', 'Tahir', 'Youssouf', 'Abdoulaye'],
    cities: [{ city: 'N\'Djamena', lat: 12.1348, lng: 15.0557 }]
  },
  {
    name: 'Centrafrique',
    code: 'CF',
    maleNames: ['Jean', 'Pierre', 'Michel', 'Faustin', 'Andr\u00e9', 'Ange', 'Fid\u00e8le', 'Simplice', 'Sylvestre', 'Parfait', 'Honor\u00e9', 'Mathias', 'Firmin', 'Prosper', 'Emmanuel', 'Martin', 'C\u00e9lestin', 'Dieudonn\u00e9', 'Th\u00e9ophile', 'Christophe'],
    lastNames: ['Ngoupand\u00e9', 'Boziz\u00e9', 'Touad\u00e9ra', 'Patass\u00e9', 'Kolingba', 'Dacko', 'Goumba', 'Ziguele', 'Samba', 'Malonga', 'Yadjiwa', 'Zimou', 'Nakombo', 'Gallo', 'Feindiro', 'Ndoutingai', 'Birinda', 'Kogbema', 'Louinguya', 'Mayombo'],
    cities: [{ city: 'Bangui', lat: 4.3947, lng: 18.5582 }]
  },
  {
    name: 'Djibouti',
    code: 'DJ',
    maleNames: ['Ismail', 'Omar', 'Hassan', 'Ahmed', 'Ali', 'Mohamed', 'Moussa', 'Ibrahim', 'Abdoulkader', 'Guedi', 'Houssein', 'Aden', 'Barkat', 'Daoud', 'Farah', 'Gouled', 'Hamad', 'Idriss', 'Kamil', 'Loita'],
    lastNames: ['Guelleh', 'Gouled', 'Hassan', 'Omar', 'Ahmed', 'Ali', 'Ismail', 'Moussa', 'Ibrahim', 'Abdoulkader', 'Aden', 'Barkat', 'Daoud', 'Farah', 'Hamad', 'Houssein', 'Idriss', 'Kamil', 'Mohamed', 'Guedi'],
    cities: [{ city: 'Djibouti', lat: 11.5886, lng: 43.1456 }]
  },
  {
    name: 'Comores',
    code: 'KM',
    maleNames: ['Ahmed', 'Ali', 'Mohamed', 'Said', 'Abdallah', 'Ibrahim', 'Youssouf', 'Hamadi', 'Hassani', 'Soilihi', 'Ahamada', 'Azali', 'Fahmi', 'Houmadi', 'Mmadi', 'Moussa', 'Ousseni', 'Salim', 'Toihir', 'Youssef'],
    lastNames: ['Abdallah', 'Ahmed', 'Ali', 'Azali', 'Dhoinine', 'Hassani', 'Ibrahim', 'Mohamed', 'Moustoifa', 'Said', 'Sambi', 'Soilihi', 'Taki', 'Youssouf', 'Ben', 'Ahamada', 'Fahmi', 'Hamadi', 'Houmadi', 'Ousseni'],
    cities: [{ city: 'Moroni', lat: -11.7022, lng: 43.2551 }]
  },
  {
    name: 'Mauritanie',
    code: 'MR',
    maleNames: ['Mohamed', 'Ahmed', 'Moussa', 'Abdoulaye', 'Sidi', 'Ould', 'Cheikh', 'El Hadj', 'Moulaye', 'Dah', 'Louleid', 'Bamba', 'Hamadi', 'Isselmou', 'Jemal', 'Kane', 'Lemrabott', 'Maaouiya', 'Nema', 'Oumar'],
    lastNames: ['Ould Abdel Aziz', 'Ould Cheikh', 'Ould Daddah', 'Ould Mohamed', 'Ould Sidi', 'Ould Taya', 'Ba', 'Diallo', 'Kane', 'Ndiaye', 'Sow', 'Sy', 'Traor\u00e9', 'Fall', 'Gueye', 'Mbaye', 'Sarr', 'Thiam', 'Tour\u00e9', 'Wade'],
    cities: [{ city: 'Nouakchott', lat: 18.0735, lng: -15.9582 }]
  },
  {
    name: 'Rwanda',
    code: 'RW',
    maleNames: ['Jean', 'Pierre', 'Paul', 'Emmanuel', 'Th\u00e9og\u00e8ne', 'Faustin', 'Innocent', 'Boniface', 'C\u00e9lestin', 'Egide', 'F\u00e9licien', 'Gratien', 'Hyacinthe', 'Ignace', 'Jules', 'K\u00e9sitor', 'L\u00e9once', 'Modeste', 'Nestor', 'Obed'],
    lastNames: ['Kagame', 'Habyarimana', 'Kayibanda', 'Bizimungu', 'Twagiramungu', 'Kambanda', 'Museveni', 'Rusesabagina', 'Bagosora', 'Ndadaye', 'Ntaryamira', 'Sindikubwabo', 'Uwimana', 'Habimana', 'Mugabo', 'Nkurunziza', 'Nsengiyumva', 'Rutaganda', 'Twagira', 'Karenzi'],
    cities: [{ city: 'Kigali', lat: -1.9403, lng: 29.8739 }]
  },
  {
    name: 'Burundi',
    code: 'BI',
    maleNames: ['Jean', 'Pierre', 'Paul', 'Emmanuel', 'Sylvestre', 'Melchior', 'Cyprien', 'Andr\u00e9', 'Michel', 'Albin', 'Domitien', 'F\u00e9licien', 'Gervais', 'Hilaire', 'Isidore', 'J\u00e9r\u00e9mie', 'Kigeri', 'L\u00e9onard', 'Mathias', 'Nicolas'],
    lastNames: ['Ndayishimiye', 'Nkurunziza', 'Buyoya', 'Ntaryamira', 'Ndadaye', 'Bagaza', 'Micombero', 'Rwagasore', 'Ntibantunganya', 'Muyinga', 'Gitega', 'Ngozi', 'Makamba', 'Bururi', 'Ruyigi', 'Rutana', 'Cankuzo', 'Kirundo', 'Muramvya', 'Karuzi'],
    cities: [{ city: 'Bujumbura', lat: -3.3731, lng: 29.3644 }]
  },
  {
    name: 'Ha\u00efti',
    code: 'HT',
    maleNames: ['Jean', 'Pierre', 'Paul', 'Joseph', 'Michel', 'Jacques', 'Ren\u00e9', 'Andr\u00e9', 'Emmanuel', 'Frantz', 'Lesly', 'Wyclef', 'Stanley', 'Fritz', 'Edmond', 'Garry', 'Herm\u00e8s', 'Isnel', 'Jude', 'K\u00e9nel'],
    lastNames: ['Jean', 'Pierre', 'Joseph', 'Louis', 'Baptiste', 'Charles', 'Dor\u00e9', 'Etienne', 'Fran\u00e7ois', 'Guillaume', 'Henri', 'Innocent', 'Joachim', 'Laguerre', 'Manigat', 'Nicolas', 'Olivier', 'Paul', 'Romain', 'Simon'],
    cities: [{ city: 'Port-au-Prince', lat: 18.5944, lng: -72.3074 }]
  },

  // Afrique du Nord francophone
  {
    name: 'Maroc',
    code: 'MA',
    maleNames: ['Mohamed', 'Ahmed', 'Youssef', 'Hassan', 'Rachid', 'Karim', 'Omar', 'Mehdi', 'Said', 'Khalid', 'Abdel', 'Brahim', 'Driss', 'El Mehdi', 'Fouad', 'Hamid', 'Ismail', 'Jamal', 'Larbi', 'Mustapha'],
    lastNames: ['Alami', 'Benjelloun', 'El Amrani', 'Bennis', 'Cherkaoui', 'Idrissi', 'Tazi', 'Fassi', 'El Mansouri', 'Bennani', 'Alaoui', 'Berrada', 'El Fassi', 'Zahiri', 'Sefrioui', 'Filali', 'Zniber', 'Kettani', 'Lahlou', 'Chraibi'],
    cities: [{ city: 'Casablanca', lat: 33.5731, lng: -7.5898 }, { city: 'Rabat', lat: 34.0209, lng: -6.8416 }]
  },
  {
    name: 'Tunisie',
    code: 'TN',
    maleNames: ['Mohamed', 'Ahmed', 'Ali', 'Khaled', 'Hedi', 'Lotfi', 'Nabil', 'Raouf', 'Sami', 'Tarek', 'Walid', 'Yassine', 'Zied', 'Amine', 'Bilel', 'Chokri', 'Dali', 'Fares', 'Ghazi', 'Hatem'],
    lastNames: ['Ben Ali', 'Trabelsi', 'Jebali', 'Ghannouchi', 'Marzouki', 'Essebsi', 'Hamdi', 'Khiari', 'Lahmar', 'Maalej', 'Nasri', 'Ouni', 'Riahi', 'Sfar', 'Tlili', 'Zouari', 'Belhaj', 'Chebbi', 'Dridi', 'Ferchichi'],
    cities: [{ city: 'Tunis', lat: 36.8065, lng: 10.1815 }]
  },
  {
    name: 'Alg\u00e9rie',
    code: 'DZ',
    maleNames: ['Mohamed', 'Ahmed', 'Ali', 'Abdelaziz', 'Karim', 'Youcef', 'Rachid', 'Nadir', 'Sofiane', 'Amine', 'Bilal', 'Djamel', 'Farid', 'Hamid', 'Ismail', 'Khaled', 'Lakhdar', 'Mourad', 'Noureddine', 'Omar'],
    lastNames: ['Benali', 'Bouteflika', 'Cherif', 'Djamel', 'Hamadi', 'Kaddour', 'Larbi', 'Mansouri', 'Ouali', 'Rachedi', 'Salhi', 'Taleb', 'Yacine', 'Zeroual', 'Amrani', 'Belaidi', 'Charef', 'Djebbar', 'Ferhat', 'Guerfi'],
    cities: [{ city: 'Alger', lat: 36.7538, lng: 3.0588 }, { city: 'Oran', lat: 35.6969, lng: -0.6331 }]
  },

  // Autres pays francophones
  {
    name: 'Guin\u00e9e-Bissau',
    code: 'GW',
    maleNames: ['Domingos', 'Umaro', 'Carlos', 'Joao', 'Baciro', 'Iaia', 'Nino', 'Samba', 'Braima', 'Cadogo', 'Faustino', 'Henrique', 'Julio', 'Manuel', 'Octavio', 'Paulo', 'Rui', 'Silvestre', 'Victor', 'Zinha'],
    lastNames: ['Vaz', 'Vieira', 'Embalo', 'Sissoko', 'Sanha', 'Pereira', 'Yala', 'Gomes', 'Indjai', 'Djalo', 'Camara', 'Correia', 'Diallo', 'Fernandes', 'Mendes', 'Oliveira', 'Ribeiro', 'Tavares', 'Cabral', 'Mane'],
    cities: [{ city: 'Bissau', lat: 11.8636, lng: -15.5977 }]
  },
  {
    name: 'Guin\u00e9e \u00c9quatoriale',
    code: 'GQ',
    maleNames: ['Teodoro', 'Francisco', 'Ignacio', 'Severo', 'Constantino', 'Agustin', 'Armengol', 'Carmelo', 'Dalmacio', 'Elias', 'Fabian', 'Gabriel', 'Hilario', 'Jesus', 'Lucas', 'Marcelino', 'Pastor', 'Primitivo', 'Santiago', 'Wenceslao'],
    lastNames: ['Obiang', 'Nguema', 'Mbasogo', 'Mangue', 'Nze', 'Esono', 'Mba', 'Ondó', 'Akom', 'Bikoro', 'Ebang', 'Ekua', 'Elo', 'Evuna', 'Masie', 'Mikue', 'Modu', 'Mokuy', 'Ngua', 'Oyono'],
    cities: [{ city: 'Malabo', lat: 3.7504, lng: 8.7371 }]
  },
  {
    name: 'Seychelles',
    code: 'SC',
    maleNames: ['Jean', 'Pierre', 'Michel', 'Wavel', 'France', 'Flavien', 'Roddy', 'Alain', 'Danny', 'James', 'Bertie', 'Clifford', 'Denis', 'Elvis', 'Flavio', 'Glenny', 'Harmon', 'Ivan', 'Joel', 'Kevin'],
    lastNames: ['Michel', 'Faure', 'Rene', 'Jumeau', 'Adam', 'Albert', 'Andre', 'Barbier', 'Barra', 'Bonnelame', 'Bristol', 'Camille', 'Chang', 'Confait', 'Derjacques', 'Desnousse', 'Ernesta', 'Figaro', 'Fred', 'Gappy'],
    cities: [{ city: 'Victoria', lat: -4.6191, lng: 55.4513 }]
  },
  {
    name: 'Vanuatu',
    code: 'VU',
    maleNames: ['Jean', 'Pierre', 'Charlot', 'Kalkot', 'Sato', 'Baldwin', 'Edward', 'Maxime', 'Joe', 'Moana', 'Alick', 'Bob', 'Charles', 'Donald', 'Fred', 'George', 'Harry', 'Isaac', 'Jack', 'Kevin'],
    lastNames: ['Lini', 'Kalpokas', 'Natapei', 'Carcasses', 'Kilman', 'Salwai', 'Vohor', 'Molisa', 'Korman', 'Barak', 'Carlot', 'Hopa', 'Iolu', 'Kaltongga', 'Leona', 'Matas', 'Napat', 'Regenvanu', 'Sese', 'Willie'],
    cities: [{ city: 'Port-Vila', lat: -17.7333, lng: 168.3167 }]
  },
  {
    name: 'Liban',
    code: 'LB',
    maleNames: ['Georges', 'Michel', 'Pierre', 'Antoine', 'Joseph', 'Elias', 'Samir', 'Walid', 'Rafic', 'Najib', 'Gebran', 'Fadi', 'Marwan', 'Hassan', 'Hussein', 'Ali', 'Omar', 'Ahmad', 'Bassem', 'Karim'],
    lastNames: ['Hariri', 'Gemayel', 'Aoun', 'Geagea', 'Jumblatt', 'Berri', 'Mikati', 'Salam', 'Frangieh', 'Chamoun', 'Eddé', 'Frangié', 'Hoss', 'Karami', 'Lahoud', 'Mouawad', 'Nasrallah', 'Sfeir', 'Tueini', 'Yazbeck'],
    cities: [{ city: 'Beyrouth', lat: 33.8938, lng: 35.5018 }]
  },
];

// =============================================================================
// SP\u00c9CIALIT\u00c9S JURIDIQUES
// =============================================================================

// ✅ CORRIGÉ: Codes synchronisés avec lawyer-specialties.ts
const LAWYER_SPECIALTIES = [
  // URG - Urgences
  'URG_ASSISTANCE_PENALE_INTERNATIONALE',
  'URG_ACCIDENTS_RESPONSABILITE_CIVILE',
  'URG_RAPATRIEMENT_URGENCE',
  // CUR - Services courants
  'CUR_TRADUCTIONS_LEGALISATIONS',
  'CUR_RECLAMATIONS_LITIGES_MINEURS',
  'CUR_DEMARCHES_ADMINISTRATIVES',
  // IMMI - Immigration et travail
  'IMMI_VISAS_PERMIS_SEJOUR',
  'IMMI_CONTRATS_TRAVAIL_INTERNATIONAL',
  'IMMI_NATURALISATION',
  // IMMO - Immobilier
  'IMMO_ACHAT_VENTE',
  'IMMO_LOCATION_BAUX',
  'IMMO_LITIGES_IMMOBILIERS',
  // FISC - Fiscalité
  'FISC_DECLARATIONS_INTERNATIONALES',
  'FISC_DOUBLE_IMPOSITION',
  'FISC_OPTIMISATION_EXPATRIES',
  // FAM - Famille
  'FAM_MARIAGE_DIVORCE',
  'FAM_GARDE_ENFANTS_TRANSFRONTALIERE',
  'FAM_SCOLARITE_INTERNATIONALE',
  // PATR - Patrimoine
  'PATR_SUCCESSIONS_INTERNATIONALES',
  'PATR_GESTION_PATRIMOINE',
  'PATR_TESTAMENTS',
  // ENTR - Entreprise
  'ENTR_CREATION_ENTREPRISE_ETRANGER',
  'ENTR_INVESTISSEMENTS',
  'ENTR_IMPORT_EXPORT',
  // ASSU - Assurances
  'ASSU_ASSURANCES_INTERNATIONALES',
  'ASSU_PROTECTION_DONNEES',
  'ASSU_CONTENTIEUX_ADMINISTRATIFS',
];

// =============================================================================
// G\u00c9N\u00c9RATION DES PROFILS
// =============================================================================

interface GeneratedProfile {
  uid: string;
  firstName: string;
  lastName: string;
  fullName: string;
  country: string;
  countryCode: string;
  email: string;
  specialties: string[];
  createdAt: Date;
}

// Fonction utilitaire pour g\u00e9n\u00e9rer une date al\u00e9atoire
function randomDateBetween(start: Date, end: Date): Date {
  const startTime = start.getTime();
  const endTime = end.getTime();
  const randomTime = startTime + Math.random() * (endTime - startTime);
  return new Date(randomTime);
}

// Fonction utilitaire pour un entier al\u00e9atoire
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Fonction utilitaire pour choisir al\u00e9atoirement dans un tableau
function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// G\u00e9n\u00e9rer une note r\u00e9aliste (4.0 - 5.0)
function randomRating(): number {
  const r = Math.random();
  if (r < 0.95) return parseFloat((4 + Math.random()).toFixed(2));
  return parseFloat((3.5 + Math.random() * 0.5).toFixed(2));
}

// Slugify pour email
function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

// G\u00e9n\u00e9rer l'email
function genEmail(firstName: string, lastName: string): string {
  return `${slugify(firstName)}.${slugify(lastName)}@example.com`;
}

// =============================================================================
// FONCTION PRINCIPALE DE G\u00c9N\u00c9RATION
// =============================================================================

export async function generate35FrancophoneLawyers(): Promise<GeneratedProfile[]> {
  console.log('='.repeat(60));
  console.log(' G\u00c9N\u00c9RATION DE 35 AVOCATS HOMMES FRANCOPHONES');
  console.log('='.repeat(60));

  // Dates d'inscription : 1er octobre - 30 d\u00e9cembre 2024
  const START_DATE = new Date('2024-10-01');
  const END_DATE = new Date('2024-12-30');
  const TODAY = new Date();

  const generatedProfiles: GeneratedProfile[] = [];

  // V\u00e9rifier qu'on a assez de pays
  if (FRANCOPHONE_COUNTRIES.length < 35) {
    throw new Error(`Seulement ${FRANCOPHONE_COUNTRIES.length} pays francophones disponibles, 35 requis`);
  }

  // Prendre les 35 premiers pays (tous uniques)
  const selectedCountries = FRANCOPHONE_COUNTRIES.slice(0, 35);

  for (let i = 0; i < 35; i++) {
    const country = selectedCountries[i];

    // G\u00e9n\u00e9rer le nom masculin
    const firstName = randomChoice(country.maleNames);
    const lastName = randomChoice(country.lastNames);
    const fullName = `${firstName} ${lastName}`;
    const email = genEmail(firstName, lastName);

    // G\u00e9n\u00e9rer l'UID unique
    const uid = `aaa_lawyer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Date de cr\u00e9ation al\u00e9atoire entre 1er oct et 30 d\u00e9c
    const createdAt = randomDateBetween(START_DATE, END_DATE);

    // Exp\u00e9rience : 5-25 ans
    const experience = randomInt(5, 25);

    // Ann\u00e9e de dipl\u00f4me
    const currentYear = new Date().getFullYear();
    const graduationYear = currentYear - experience - randomInt(0, 3);

    // S\u00e9lectionner 2-4 sp\u00e9cialit\u00e9s al\u00e9atoires
    const numSpecialties = randomInt(2, 4);
    const specialties: string[] = [];
    const availableSpecialties = [...LAWYER_SPECIALTIES];
    for (let j = 0; j < numSpecialties; j++) {
      const idx = Math.floor(Math.random() * availableSpecialties.length);
      specialties.push(availableSpecialties.splice(idx, 1)[0]);
    }

    // Calculer les statistiques
    const daysSinceCreation = Math.floor((TODAY.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const weeks = Math.max(1, Math.floor(daysSinceCreation / 7));
    const totalCalls = Math.max(1, weeks * randomInt(1, 3));
    const reviewCount = Math.max(1, Math.min(totalCalls, weeks * randomInt(1, 2)));
    const rating = randomRating();

    // Coordonn\u00e9es GPS
    const cityData = randomChoice(country.cities);
    const mapLocation = {
      lat: cityData.lat + (Math.random() - 0.5) * 0.1,
      lng: cityData.lng + (Math.random() - 0.5) * 0.1
    };

    // Bio multilingue (simplifi\u00e9e)
    const bio = {
      fr: `Avocat sp\u00e9cialis\u00e9 en droit international avec ${experience} ans d'exp\u00e9rience. J'accompagne les expatri\u00e9s francophones dans leurs d\u00e9marches juridiques en ${country.name}.`,
      en: `Specialized lawyer in international law with ${experience} years of experience. I assist French-speaking expatriates with their legal matters in ${country.name}.`
    };

    // Construire le profil complet
    const profileData: any = {
      uid,
      firstName,
      lastName,
      fullName,
      email,
      phone: '+33743331201', // Num\u00e9ro de test
      phoneCountryCode: '+33',
      country: country.code,
      currentCountry: country.code,
      preferredLanguage: 'fr',
      languages: ['fr'], // Fran\u00e7ais UNIQUEMENT
      languagesSpoken: ['fr'], // Code ISO - doit être identique à languages
      profilePhoto: '',
      avatar: '',
      isTestProfile: true,
      isActive: true,
      isApproved: true,
      isVerified: true,
      approvalStatus: 'approved',
      verificationStatus: 'approved',
      isOnline: false,
      isVisible: true,
      isVisibleOnMap: true,
      isCallable: true,
      createdAt: Timestamp.fromDate(createdAt),
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      role: 'lawyer',
      type: 'lawyer',
      isSOS: true,
      points: 0,
      affiliateCode: `AAA${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      referralBy: null,
      bio,
      responseTime: '< 5 minutes',
      availability: 'available',
      totalCalls,
      totalEarnings: 0,
      averageRating: rating,
      rating,
      reviewCount,
      mapLocation,
      // Champs sp\u00e9cifiques avocat
      specialties,
      practiceCountries: [country.code], // Pays d'intervention = pays de r\u00e9sidence
      yearsOfExperience: experience,
      barNumber: `BAR${randomInt(10000, 99999)}`,
      lawSchool: `Universit\u00e9 de Droit - ${country.name}`,
      graduationYear,
      certifications: ['certified-bar', 'international-law'],
      needsVerification: false,
    };

    try {
      // 1. Sauvegarder dans 'users'
      await setDoc(doc(db, 'users', uid), profileData);

      // 2. Sauvegarder dans 'sos_profiles'
      await setDoc(doc(db, 'sos_profiles', uid), {
        ...profileData,
        createdByAdmin: true,
        profileCompleted: true,
      });

      // 3. Cr\u00e9er la carte de profil
      await setDoc(doc(db, 'ui_profile_cards', uid), {
        id: uid,
        uid,
        title: fullName,
        subtitle: 'Avocat',
        country: country.name,
        photo: '',
        rating,
        reviewCount,
        languages: ['fr'], // Code ISO
        specialties,
        href: `/profile/${uid}`,
        createdAt: serverTimestamp(),
      });

      // 4. G\u00e9n\u00e9rer les avis
      for (let j = 0; j < reviewCount; j++) {
        const reviewDaysAfterCreation = Math.floor((j / reviewCount) * daysSinceCreation);
        const reviewDate = new Date(createdAt.getTime() + reviewDaysAfterCreation * 24 * 60 * 60 * 1000);
        const reviewRating = parseFloat((4.0 + Math.random()).toFixed(1));

        // Pr\u00e9nom masculin francophone pour le client
        const clientCountry = randomChoice(selectedCountries);
        const clientFirstName = randomChoice(clientCountry.maleNames);

        const comments = [
          'Excellent avocat, tr\u00e8s professionnel et \u00e0 l\'\u00e9coute.',
          'Conseils juridiques de qualit\u00e9, je recommande vivement.',
          'Tr\u00e8s satisfait de ses services, r\u00e9ponse rapide et efficace.',
          'Expertise remarquable en droit international.',
          'Un professionnel d\u00e9vou\u00e9 et comp\u00e9tent.',
          'J\'ai beaucoup appr\u00e9ci\u00e9 son accompagnement dans mes d\u00e9marches.',
          'Service impeccable, tr\u00e8s bonne communication.',
          'Avocat tr\u00e8s comp\u00e9tent, a r\u00e9solu mon probl\u00e8me rapidement.',
        ];

        await addDoc(collection(db, 'reviews'), {
          providerId: uid,
          clientId: `aaa_client_${Date.now()}_${j}`,
          clientName: clientFirstName,
          clientCountry: clientCountry.name,
          rating: reviewRating,
          comment: randomChoice(comments),
          isPublic: true,
          status: 'published',
          serviceType: 'lawyer_call',
          createdAt: Timestamp.fromDate(reviewDate),
          helpfulVotes: randomInt(0, 10),
        });
      }

      console.log(`\u2713 [${i + 1}/35] ${fullName} - ${country.name} (${country.code})`);

      generatedProfiles.push({
        uid,
        firstName,
        lastName,
        fullName,
        country: country.name,
        countryCode: country.code,
        email,
        specialties,
        createdAt,
      });

      // Petite pause pour \u00e9viter de surcharger Firestore
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error(`\u2717 Erreur pour ${fullName}:`, error);
      throw error;
    }
  }

  console.log('='.repeat(60));
  console.log(` 35 PROFILS G\u00c9N\u00c9R\u00c9S AVEC SUCC\u00c8S!`);
  console.log('='.repeat(60));

  return generatedProfiles;
}

// Export pour utilisation dans la console du navigateur
if (typeof window !== 'undefined') {
  (window as any).generate35FrancophoneLawyers = generate35FrancophoneLawyers;
  console.log('\ud83d\udee0\ufe0f Fonction disponible: generate35FrancophoneLawyers()');
  console.log('   \u2192 G\u00e9n\u00e8re 35 avocats hommes francophones');
  console.log('   \u2192 Langue: Fran\u00e7ais uniquement');
  console.log('   \u2192 Dates: 1er octobre - 30 d\u00e9cembre 2024');
  console.log('   \u2192 Pays: 35 pays francophones uniques');
}

export default generate35FrancophoneLawyers;
